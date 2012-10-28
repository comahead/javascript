
/**
 * This class provides a DOM ClassList API to buffer access to an element's class.
 * Instances of this class are created by {@link Ext.layout.ContextItem#getClassList}.
 */
Ext.define('Ext.layout.ClassList', (function () {

    var splitWords = Ext.String.splitWords,
        toMap = Ext.Array.toMap;

    return {
        dirty: false,

        constructor: function (owner) {
            this.owner = owner;
            this.map = toMap(this.classes = splitWords(owner.el.className));
        },

        /**
         * Adds a single class to the class list.
         */
        add: function (cls) {
            var me = this;

            if (!me.map[cls]) {
                me.map[cls] = true;
                me.classes.push(cls);
                if (!me.dirty) {
                    me.dirty = true;
                    me.owner.markDirty();
                }
            }
        },

        /**
         * Adds one or more classes in an array or space-delimited string to the class list.
         */
        addMany: function (classes) {
            Ext.each(splitWords(classes), this.add, this);
        },

        contains: function (cls) {
            return this.map[cls];
        },

        flush: function () {
            this.owner.el.className = this.classes.join(' ');
            this.dirty = false;
        },

        /**
         * Removes a single class from the class list.
         */
        remove: function (cls) {
            var me = this;

            if (me.map[cls]) {
                delete me.map[cls];
                me.classes = Ext.Array.filter(me.classes, function (c) {
                    return c != cls;
                });
                if (!me.dirty) {
                    me.dirty = true;
                    me.owner.markDirty();
                }
            }
        },

        /**
         * Removes one or more classes in an array or space-delimited string from the class
         * list.
         */
        removeMany: function (classes) {
            var me = this,
                remove = toMap(splitWords(classes));

            me.classes = Ext.Array.filter(me.classes, function (c) {
                if (!remove[c]) {
                    return true;
                }

                delete me.map[c];
                if (!me.dirty) {
                    me.dirty = true;
                    me.owner.markDirty();
                }
                return false;
            });
        }
    };
}()));

/**
 * This class manages state information for a component or element during a layout.
 * 
 * # Blocks
 *
 * A "block" is a required value that is preventing further calculation. When a layout has
 * encountered a situation where it cannot possibly calculate results, it can associate
 * itself with the context item and missing property so that it will not be rescheduled
 * until that property is set.
 * 
 * Blocks are a one-shot registration. Once the property changes, the block is removed.
 * 
 * Be careful with blocks. If *any* further calculations can be made, a block is not the
 * right choice.
 * 
 * # Triggers
 *
 * Whenever any call to {@link #getProp}, {@link #getDomProp}, {@link #hasProp} or
 * {@link #hasDomProp} is made, the current layout is automatically registered as being
 * dependent on that property in the appropriate state. Any changes to the property will
 * trigger the layout and it will be queued in the {@link Ext.layout.Context}.
 *
 * Triggers, once added, remain for the entire layout. Any changes to the property will
 * reschedule all unfinished layouts in their trigger set.
 *
 * @private
 */
Ext.define('Ext.layout.ContextItem', {
    
    requires: ['Ext.layout.ClassList'],

    heightModel: null,
    widthModel: null,
    sizeModel: null,

    boxChildren: null,

    boxParent: null,

    children: [],

    dirty: null,

    // The number of dirty properties
    dirtyCount: 0,

    hasRawContent: true,

    isContextItem: true,

    isTopLevel: false,

    consumersContentHeight: 0,
    consumersContentWidth: 0,
    consumersContainerHeight: 0,
    consumersContainerWidth: 0,
    consumersHeight: 0,
    consumersWidth: 0,

    ownerCtContext: null,

    remainingChildLayouts: 0,
    remainingComponentChildLayouts: 0,
    remainingContainerChildLayouts: 0,

    // the current set of property values:
    props: null,

    /**
     * @property {Object} state
     * State variables that are cleared when invalidated. Only applies to component items.
     */
    state: null,

    /**
     * @property {Boolean} wrapsComponent
     * True if this item wraps a Component (rather than an Element).
     * @readonly
     */
    wrapsComponent: false,

    constructor: function (config) {
        var me = this,
            el, ownerCt, ownerCtContext, sizeModel, target;

        Ext.apply(me, config);

        el = me.el;
        me.id = el.id;
        me.lastBox = el.lastBox;

        // These hold collections of layouts that are either blocked or triggered by sets
        // to our properties (either ASAP or after flushing to the DOM). All of them have
        // the same structure:
        //
        //      me.blocks = {
        //          width: {
        //              'layout-1001': layout1001
        //          }
        //      }
        //
        // The property name is the primary key which yields an object keyed by layout id
        // with the layout instance as the value. This prevents duplicate entries for one
        // layout and gives O(1) access to the layout instance when we need to iterate and
        // process them.
        // 
        // me.blocks = {};
        // me.domBlocks = {};
        // me.domTriggers = {};
        // me.triggers = {};

        me.flushedProps = {};
        me.props = {};

        // the set of cached styles for the element:
        me.styles = {};

        target = me.target;
        if (target.isComponent) {
            me.wrapsComponent = true;

            // These items are created top-down, so the ContextItem of our ownerCt should
            // be available (if it is part of this layout run).
            ownerCt = target.ownerCt;
            if (ownerCt && (ownerCtContext = me.context.items[ownerCt.el.id])) {
                me.ownerCtContext = ownerCtContext;
            }

            // If our ownerCtContext is in the run, it will have a SizeModel that we use to
            // optimize the determination of our sizeModel.
            me.sizeModel = sizeModel = target.getSizeModel(ownerCtContext &&
                ownerCtContext.widthModel.pairsByHeightOrdinal[ownerCtContext.heightModel.ordinal]);

            me.widthModel = sizeModel.width;
            me.heightModel = sizeModel.height;

            // NOTE: The initial determination of sizeModel is valid (thankfully) and is
            // needed to cope with adding components to a layout run on-the-fly (e.g., in
            // the menu overflow handler of a box layout). Since this is the case, we do
            // not need to recompute the sizeModel in init unless it is a "full" init (as
            // our ownerCt's sizeModel could have changed in that case).
        }
    },

    /**
     * Clears all properties on this object except (perhaps) those not calculated by this
     * component. This is more complex than it would seem because a layout can decide to
     * invalidate its results and run the component's layouts again, but since some of the
     * values may be calculated by the container, care must be taken to preserve those
     * values.
     *
     * @param {Boolean} full True if all properties are to be invalidated, false to keep
     * those calculated by the ownerCt.
     * @return {Mixed} A value to pass as the first argument to {@link #initContinue}.
     * @private
     */
    init: function (full, options) {
        var me = this,
            oldProps = me.props,
            oldDirty = me.dirty,
            ownerCtContext = me.ownerCtContext,
            ownerLayout = me.target.ownerLayout,
            firstTime = !me.state,
            ret = full || firstTime,
            children, i, n, ownerCt, sizeModel, target,
            oldHeightModel = me.heightModel,
            oldWidthModel = me.widthModel,
            newHeightModel, newWidthModel;

        me.dirty = me.invalid = false;
        me.props = {};

        if (me.boxChildren) {
            me.boxChildren.length = 0; // keep array (more GC friendly)
        }

        if (!firstTime) {
            me.clearAllBlocks('blocks');
            me.clearAllBlocks('domBlocks');
        }

        // For Element wrappers, we are done...
        if (!me.wrapsComponent) {
            return ret;
        }

        // From here on, we are only concerned with Component wrappers...
        target = me.target;
        me.state = {}; // only Component wrappers need a "state"

        if (firstTime) {
            // This must occur before we proceed since it can do many things (like add
            // child items perhaps):
            if (target.beforeLayout) {
                target.beforeLayout();
            }

            // Determine the ownerCtContext if we aren't given one. Normally the firstTime
            // we meet a component is before the context is run, but it is possible for
            // components to be added to a run that is already in progress. If so, we have
            // to lookup the ownerCtContext since the odds are very high that the new
            // component is a child of something already in the run. It is currently
            // unsupported to drag in the owner of a running component (needs testing).
            if (!ownerCtContext && (ownerCt = target.ownerCt)) {
                ownerCtContext = me.context.items[ownerCt.el.id];
            }

            if (ownerCtContext) {
                me.ownerCtContext = ownerCtContext;
                me.isBoxParent = target.ownerLayout.isItemBoxParent(me);
            } else {
                me.isTopLevel = true; // this is used by initAnimation...
            }

            me.frameBodyContext = me.getEl('frameBody');
        } else {
            ownerCtContext = me.ownerCtContext;

            // In theory (though untested), this flag can change on-the-fly...
            me.isTopLevel = !ownerCtContext;

            // Init the children element items since they may have dirty state (no need to
            // do this the firstTime).
            children = me.children;
            for (i = 0, n = children.length; i < n; ++i) {
                children[i].init(true);
            }
        }

        // We need to know how we will determine content size: containers can look at the
        // results of their items but non-containers or item-less containers with just raw
        // markup need to be measured in the DOM:
        me.hasRawContent = !(target.isContainer && target.items.items.length > 0);

        if (full) {
            // We must null these out or getSizeModel will assume they are the correct,
            // dynamic size model and return them (the previous dynamic sizeModel).
            me.widthModel = me.heightModel = null;
            sizeModel = target.getSizeModel(ownerCtContext && 
                ownerCtContext.widthModel.pairsByHeightOrdinal[ownerCtContext.heightModel.ordinal]);

            if (firstTime) {
                me.sizeModel = sizeModel;
            }

            me.widthModel = sizeModel.width;
            me.heightModel = sizeModel.height;
        } else if (oldProps) {
            // these are almost always calculated by the ownerCt (we might need to track
            // this at some point more carefully):
            me.recoverProp('x', oldProps, oldDirty);
            me.recoverProp('y', oldProps, oldDirty);

            // if these are calculated by the ownerCt, don't trash them:
            if (me.widthModel.calculated) {
                me.recoverProp('width', oldProps, oldDirty);
            }
            if (me.heightModel.calculated) {
                me.recoverProp('height', oldProps, oldDirty);
            }
        }

        if (oldProps && ownerLayout && ownerLayout.manageMargins) {
            me.recoverProp('margin-top', oldProps, oldDirty);
            me.recoverProp('margin-right', oldProps, oldDirty);
            me.recoverProp('margin-bottom', oldProps, oldDirty);
            me.recoverProp('margin-left', oldProps, oldDirty);
        }

        // Process any invalidate options present. These can only come from explicit calls
        // to the invalidate() method.
        if (options) {
            // Consider a container box with wrapping text. If the box is made wider, the
            // text will take up less height (until there is no more wrapping). Conversely,
            // if the box is made narrower, the height starts to increase due to wrapping.
            //
            // Imposing a minWidth constraint would increase the width. This may decrease
            // the height. If the box is shrinkWrap, however, the width will already be
            // such that there is no wrapping, so the height will not further decrease.
            // Since the height will also not increase if we widen the box, there is no
            // problem simultaneously imposing a minHeight or maxHeight constraint.
            //
            // When we impose as maxWidth constraint, however, we are shrinking the box
            // which may increase the height. If we are imposing a maxHeight constraint,
            // that is fine because a further increased height will still need to be
            // constrained. But if we are imposing a minHeight constraint, we cannot know
            // whether the increase in height due to wrapping will be greater than the
            // minHeight. If we impose a minHeight constraint at the same time, then, we
            // could easily be locking in the wrong height.
            //
            // It is important to note that this logic applies to simultaneously *adding*
            // both a maxWidth and a minHeight constraint. It is perfectly fine to have
            // a state with both constraints, but we cannot add them both at once.
            newHeightModel = options.heightModel;
            newWidthModel = options.widthModel;
            if (newWidthModel && newHeightModel && oldWidthModel && oldHeightModel) {
                if (oldWidthModel.shrinkWrap && oldHeightModel.shrinkWrap) {
                    if (newWidthModel.constrainedMax && newHeightModel.constrainedMin) {
                        newHeightModel = null;
                    }
                }
            }

            // Apply size model updates (if any) and state updates (if any).
            if (newWidthModel) {
                me.widthModel = newWidthModel;
            }
            if (newHeightModel) {
                me.heightModel = newHeightModel;
            }

            if (options.state) {
                Ext.apply(me.state, options.state);
            }
        }

        return ret;
    },

    /**
     * @private
     */
    initContinue: function (full) {
        var me = this,
            ownerCtContext = me.ownerCtContext,
            widthModel = me.widthModel,
            boxParent;

        if (full) {
            if (ownerCtContext && widthModel.shrinkWrap) {
                boxParent = ownerCtContext.isBoxParent ? ownerCtContext : ownerCtContext.boxParent;
                if (boxParent) {
                    boxParent.addBoxChild(me);
                }
            } else if (widthModel.natural) {
                me.boxParent = ownerCtContext;
            }
        }

        return full;
    },

    /**
     * @private
     */
    initDone: function (full, componentChildrenDone, containerChildrenDone, containerLayoutDone) {
        var me = this,
            props = me.props,
            state = me.state;

        // These properties are only set when they are true:
        if (componentChildrenDone) {
            props.componentChildrenDone = true;
        }
        if (containerChildrenDone) {
            props.containerChildrenDone = true;
        }
        if (containerLayoutDone) {
            props.containerLayoutDone = true;
        }

        if (me.boxChildren && me.boxChildren.length && me.widthModel.shrinkWrap) {
            // set a very large width to allow the children to measure their natural
            // widths (this is cleared once all children have been measured):
            me.el.setWidth(10000);

            // don't run layouts for this component until we clear this width...
            state.blocks = (state.blocks || 0) + 1;
        }
    },

    /**
     * @private
     */
    initAnimation: function() {
        var me = this,
            target = me.target,
            ownerCtContext = me.ownerCtContext;

        if (ownerCtContext && ownerCtContext.isTopLevel) {
            // See which properties we are supposed to animate to their new state.
            // If there are any, queue ourself to be animated by the owning Context
            me.animatePolicy = target.ownerLayout.getAnimatePolicy(me);
        } else if (!ownerCtContext && target.isCollapsingOrExpanding && target.animCollapse) {
            // Collapsing/expnding a top level Panel with animation. We need to fabricate
            // an animatePolicy depending on which dimension the collapse is using,
            // isCollapsingOrExpanding is set during the collapse/expand process.
            me.animatePolicy = target.componentLayout.getAnimatePolicy(me);
        }

        if (me.animatePolicy) {
            me.context.queueAnimation(me);
        }
    },

    noFraming: { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 },

    /**
     * Queue the addition of a class name (or array of class names) to this ContextItem's target when next flushed.
     */
    addCls: function(newCls) {
        this.getClassList().addMany(newCls);
    },

    /**
     * Queue the removal of a class name (or array of class names) from this ContextItem's target when next flushed.
     */
    removeCls: function(removeCls) {
        this.getClassList().removeMany(removeCls);
    },

    /**
     * Adds a block.
     * 
     * @param {String} name The name of the block list ('blocks' or 'domBlocks').
     * @param {Ext.layout.Layout} layout The layout that is blocked.
     * @param {String} propName The property name that blocked the layout (e.g., 'width').
     * @private
     */
    addBlock: function (name, layout, propName) {
        var me = this,
            collection = me[name] || (me[name] = {}),
            blockedLayouts = collection[propName] || (collection[propName] = {});

        if (!blockedLayouts[layout.id]) {
            blockedLayouts[layout.id] = layout;
            ++layout.blockCount;
            ++me.context.blockCount;
        }
    },

    addBoxChild: function (boxChildItem) {
        var me = this,
            children,
            widthModel = boxChildItem.widthModel;

        boxChildItem.boxParent = this;

        // Children that are widthModel.auto (regardless of heightModel) that measure the
        // DOM (by virtue of hasRawContent), need to wait for their "box parent" to be sized.
        // If they measure too early, they will be wrong results. In the widthModel.shrinkWrap
        // case, the boxParent "crushes" the child. In the case of widthModel.natural, the
        // boxParent's width is likely a key part of the child's width (e.g., "50%" or just
        // normal block-level behavior of 100% width)
        boxChildItem.measuresBox = widthModel.shrinkWrap ? boxChildItem.hasRawContent : widthModel.natural;

        if (boxChildItem.measuresBox) {
            children = me.boxChildren;

            if (children) {
                children.push(boxChildItem);
            } else {
                me.boxChildren = [ boxChildItem ];
            }
        }
    },

    /**
     * Adds a trigger.
     * 
     * @param {String} propName The property name that triggers the layout (e.g., 'width').
     * @param {Boolean} inDom True if the trigger list is `domTriggers`, false if `triggers`.
     * @private
     */
    addTrigger: function (propName, inDom) {
        var me = this,
            name = inDom ? 'domTriggers' : 'triggers',
            collection = me[name] || (me[name] = {}),
            context = me.context,
            layout = context.currentLayout,
            triggers = collection[propName] || (collection[propName] = {});

        if (!triggers[layout.id]) {
            triggers[layout.id] = layout;
            ++layout.triggerCount;

            triggers = context.triggers[inDom ? 'dom' : 'data'];
            (triggers[layout.id] || (triggers[layout.id] = [])).push({
                item: this,
                prop: propName
            });

            if (me.props[propName] !== undefined) {
                if (!inDom || !(me.dirty && (propName in me.dirty))) {
                    ++layout.firedTriggers;
                }
            }
        }
    },

    boxChildMeasured: function () {
        var me = this,
            state = me.state,
            count = (state.boxesMeasured = (state.boxesMeasured || 0) + 1);

        if (count == me.boxChildren.length) {
            // all of our children have measured themselves, so we can clear the width
            // and resume layouts for this component...
            state.clearBoxWidth = 1;
            ++me.context.progressCount;
            me.markDirty();
        }
    },

    borderNames: [ 'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width'],
    marginNames: [ 'margin-top', 'margin-right', 'margin-bottom', 'margin-left' ],
    paddingNames: [ 'padding-top', 'padding-right', 'padding-bottom', 'padding-left' ],
    trblNames: [ 'top', 'right', 'bottom', 'left' ],

    cacheMissHandlers: {
        borderInfo: function (me) {
            var info = me.getStyles(me.borderNames, me.trblNames);

            info.width = info.left + info.right;
            info.height = info.top + info.bottom;

            return info;
        },

        marginInfo: function (me) {
            var info = me.getStyles(me.marginNames, me.trblNames);

            info.width = info.left + info.right;
            info.height = info.top + info.bottom;

            return info;
        },

        paddingInfo: function (me) {
            // if this context item's target is a framed component the padding is on the frameBody, not on the main el
            var item = me.frameBodyContext || me,
                info = item.getStyles(me.paddingNames, me.trblNames);

            info.width = info.left + info.right;
            info.height = info.top + info.bottom;

            return info;
        }
    },

    checkCache: function (entry) {
        return this.cacheMissHandlers[entry](this);
    },

    clearAllBlocks: function (name) {
        var collection = this[name],
            propName;

        if (collection) {
            for (propName in collection) {
                this.clearBlocks(name, propName);
            }
        }
    },

    /**
     * Removes any blocks on a property in the specified set. Any layouts that were blocked
     * by this property and are not still blocked (by other properties) will be rescheduled.
     * 
     * @param {String} name The name of the block list ('blocks' or 'domBlocks').
     * @param {String} propName The property name that blocked the layout (e.g., 'width').
     * @private
     */
    clearBlocks: function (name, propName) {
        var collection = this[name],
            blockedLayouts = collection && collection[propName],
            context, layout, layoutId;

        if (blockedLayouts) {
            delete collection[propName];

            context = this.context;

            for (layoutId in blockedLayouts) {
                layout = blockedLayouts[layoutId];

                --context.blockCount;
                if (! --layout.blockCount && !layout.pending && !layout.done) {
                    context.queueLayout(layout);
                }
            }
        }
    },

    /**
     * Registers a layout in the block list for the given property. Once the property is
     * set in the {@link Ext.layout.Context}, the layout is unblocked.
     * 
     * @param {Ext.layout.Layout} layout
     * @param {String} propName The property name that blocked the layout (e.g., 'width').
     */
    block: function (layout, propName) {
        this.addBlock('blocks', layout, propName);
    },

    /**
     * Registers a layout in the DOM block list for the given property. Once the property
     * flushed to the DOM by the {@link Ext.layout.Context}, the layout is unblocked.
     * 
     * @param {Ext.layout.Layout} layout
     * @param {String} propName The property name that blocked the layout (e.g., 'width').
     */
    domBlock: function (layout, propName) {
        this.addBlock('domBlocks', layout, propName);
    },

    /**
     * Reschedules any layouts associated with a given trigger.
     * 
     * @param {String} name The name of the trigger list ('triggers' or 'domTriggers').
     * @param {String} propName The property name that triggers the layout (e.g., 'width').
     * @private
     */
    fireTriggers: function (name, propName) {
        var collection = this[name],
            triggers = collection && collection[propName],
            context = this.context,
            layout, layoutId;

        if (triggers) {
            for (layoutId in triggers) {
                layout = triggers[layoutId];
                ++layout.firedTriggers;
                if (!layout.done && !layout.blockCount && !layout.pending) {
                    context.queueLayout(layout);
                }
            }
        }
    },

    /**
     * Flushes any updates in the dirty collection to the DOM. This is only called if there
     * are dirty entries because this object is only added to the flushQueue of the
     * {@link Ext.layout.Context} when entries become dirty.
     */
    flush: function () {
        var me = this,
            dirty = me.dirty,
            state = me.state,
            targetEl = me.el;

        me.dirtyCount = 0;

        // Flush added/removed classes
        if (me.classList && me.classList.dirty) {
            me.classList.flush();
        }

        // Set any queued DOM attributes
        if ('attributes' in me) {
            targetEl.set(me.attributes);
            delete me.attributes;
        }

        // Set any queued DOM HTML content
        if ('innerHTML' in me) {
            targetEl.innerHTML = me.innerHTML;
            delete me.innerHTML;
        }

        if (state && state.clearBoxWidth) {
            state.clearBoxWidth = 0;
            me.el.setStyle('width', null);

            if (! --state.blocks) {
                me.context.queueItemLayouts(me);
            }
        }

        if (dirty) {
            delete me.dirty;
            me.writeProps(dirty, true);
        }
    },

    /**
     * @private
     */
    flushAnimations: function() {
        var me = this,
            animateFrom = me.lastBox,
            target, targetAnim, duration, animateProps, anim,
            changeCount, j, propsLen, propName, oldValue, newValue;

        // Only animate if the Component has been previously layed out: first layout should not animate
        if (animateFrom) {
            target = me.target;
            targetAnim = target.layout && target.layout.animate;
            if (targetAnim) {
                duration = Ext.isNumber(targetAnim) ? targetAnim : targetAnim.duration;
            }
            animateProps = Ext.Object.getKeys(me.animatePolicy);

            // Create an animation block using the targetAnim configuration to provide defaults.
            // They may want custom duration, or easing, or listeners.
            anim = Ext.apply({}, {
                from: {},
                to: {},
                duration: duration || Ext.fx.Anim.prototype.duration
            }, targetAnim);

            for (changeCount = 0, j = 0, propsLen = animateProps.length; j < propsLen; j++) {
                propName = animateProps[j];
                oldValue = animateFrom[propName];
                newValue = me.peek(propName);
                if (oldValue != newValue) {
                    propName = me.translateProps[propName]||propName;
                    anim.from[propName] = oldValue;
                    anim.to[propName] = newValue;
                    ++changeCount;
                }
            }

            // If any values have changed, kick off animation from the cached old values to the new values
            if (changeCount) {
                // It'a Panel being collapsed. rollback, and then fix the class name string
                if (me.isCollapsingOrExpanding === 1) {
                    target.componentLayout.undoLayout(me);
                }

                // Otherwise, undo just the animated properties so the animation can proceed from the old layout.
                else {
                    me.writeProps(anim.from);
                }
                me.el.animate(anim);
                
                Ext.fx.Manager.getFxQueue(me.el.id)[0].on({
                    afteranimate: function() {
                        if (me.isCollapsingOrExpanding === 1) {
                            target.componentLayout.redoLayout(me);
                            target.afterCollapse(true);
                        } else if (me.isCollapsingOrExpanding === 2) {
                            target.afterExpand(true);
                        }
                    }
                });
            }
        }
    },

    /**
     * Gets the border information for the element as an object with left, top, right and
     * bottom properties holding border size in pixels. This object is only read from the
     * DOM on first request and is cached.
     * @return {Object}
     */
    getBorderInfo: function () {
        var me = this,
            info = me.borderInfo;

        if (!info) {
            me.borderInfo = info = me.checkCache('borderInfo');
        }

        return info;
    },

    /**
     * Returns a ClassList-like object to buffer access to this item's element's classes.
     */
    getClassList: function () {
        return this.classList || (this.classList = new Ext.layout.ClassList(this));
    },

    /**
     * Returns the context item for an owned element. This should only be called on a
     * component's item. The list of child items is used to manage invalidating calculated
     * results.
     */
    getEl: function (nameOrEl, owner) {
        var me = this,
            src, el, elContext;

        if (nameOrEl) {
            if (nameOrEl.dom) {
                el = nameOrEl;
            } else {
                src = me.target;
                if (owner) {
                    src = owner;
                }

                el = src[nameOrEl];
                if (typeof el == 'function') { // ex 'getTarget'
                    el = el.call(src);
                    if (el === me.el) {
                        return this; // comp.getTarget() often returns comp.el
                    }
                }
            }

            if (el) {
                elContext = me.context.getEl(me, el);
            }
        }

        return elContext || null;
    },

    getFraming: function () {
        var me = this;
        if (!me.framingInfo) {
            me.framingInfo = me.target.frameSize || me.noFraming;
        }
        return me.framingInfo;
    },

    /**
     * Gets the "frame" information for the element as an object with left, top, right and
     * bottom properties holding border+framing size in pixels. This object is calculated
     * on first request and is cached.
     * @return {Object}
     */
    getFrameInfo: function () {
        var me = this,
            info = me.frameInfo,
            frame, border;

        if (!info) {
            frame = me.getFraming();
            border = me.getBorderInfo();
            
            me.frameInfo = info = {
                top   : frame.top    + border.top,
                right : frame.right  + border.right,
                bottom: frame.bottom + border.bottom,
                left  : frame.left   + border.left,
                width : frame.width  + border.width,
                height: frame.height + border.height
            };
        }

        return info;
    },

    /**
     * Gets the margin information for the element as an object with left, top, right and
     * bottom properties holding margin size in pixels. This object is only read from the
     * DOM on first request and is cached.
     * @return {Object}
     */
    getMarginInfo: function () {
        var me = this,
            info = me.marginInfo,
            comp, manageMargins, margins, ownerLayout, ownerLayoutId;

        if (!info) {
            if (!me.wrapsComponent) {
                info = me.checkCache('marginInfo');
            } else {
                comp = me.target;
                ownerLayout = comp.ownerLayout;
                ownerLayoutId = ownerLayout ? ownerLayout.id : null;
                manageMargins = ownerLayout && ownerLayout.manageMargins;

                // Option #1 for configuring margins on components is the "margin" config
                // property. When supplied, this config is written to the DOM during the
                // render process (see AbstractComponent#initStyles).
                //
                // Option #2 is available to some layouts (e.g., Box, Border, Fit) that
                // handle margin calculations themselves. These layouts support a "margins"
                // config property on their items and they have a "defaultMargins" config
                // property. These margin values are added to the "natural" margins read
                // from the DOM and 0's are written to the DOM after they are added.

                // To avoid having to do all this on every layout, we cache the results on
                // the component in the (private) "margin$" property. We identify the cache
                // results as belonging to the appropriate ownerLayout in case items are
                // moved around.

                info = comp.margin$;
                if (info && info.ownerId !== ownerLayoutId) {
                    // got one but from the wrong owner
                    info = null;

                    //  if (manageMargins) {
                    //      TODO: clear inline margins (the 0's we wrote last time)???
                    //  }
                }

                if (!info) { // if (no cache)
                    // CSS margins are only checked if there isn't a margin property on the component
                    info = me.parseMargins(comp.margin) || me.checkCache('marginInfo');

                    // Some layouts also support margins and defaultMargins, e.g. Fit, Border, Box
                    if (manageMargins) {
                        margins = me.parseMargins(comp.margins, ownerLayout.defaultMargins);

                        if (margins) { // if (using 'margins' and/or 'defaultMargins')
                            // margin and margins can both be present at the same time and must be combined
                            info = {
                                top:    info.top    + margins.top,
                                right:  info.right  + margins.right,
                                bottom: info.bottom + margins.bottom,
                                left:   info.left   + margins.left
                            };
                        }

                        me.setProp('margin-top', 0);
                        me.setProp('margin-right', 0);
                        me.setProp('margin-bottom', 0);
                        me.setProp('margin-left', 0);
                    }

                    // cache the layout margins and tag them with the layout id:
                    info.ownerId = ownerLayoutId;
                    comp.margin$ = info;
                }

                info.width  = info.left + info.right;
                info.height = info.top  + info.bottom;
            }

            me.marginInfo = info;
        }

        return info;
    },

    /**
     * clears the margin cache so that marginInfo get re-read from the dom on the next call to getMarginInfo()
     * This is needed in some special cases where the margins have changed since the last layout, making the cached
     * values invalid.  For example collapsed window headers have different margin than expanded ones.
     */
    clearMarginCache: function() {
        delete this.marginInfo;
        delete this.target.margin$;
    },

    /**
     * Gets the padding information for the element as an object with left, top, right and
     * bottom properties holding padding size in pixels. This object is only read from the
     * DOM on first request and is cached.
     * @return {Object}
     */
    getPaddingInfo: function () {
        var me = this,
            info = me.paddingInfo;

        if (!info) {
            me.paddingInfo = info = me.checkCache('paddingInfo');
        }

        return info;
    },

    /**
     * Gets a property of this object. Also tracks the current layout as dependent on this
     * property so that changes to it will trigger the layout to be recalculated.
     * @param {String} propName The property name that blocked the layout (e.g., 'width').
     * @return {Object} The property value or undefined if not yet set.
     */
    getProp: function (propName) {
        var me = this,
            result = me.props[propName];

        me.addTrigger(propName);
        return result;
    },

    /**
     * Gets a property of this object if it is correct in the DOM. Also tracks the current
     * layout as dependent on this property so that DOM writes of it will trigger the
     * layout to be recalculated.
     * @param {String} propName The property name (e.g., 'width').
     * @return {Object} The property value or undefined if not yet set or is dirty.
     */
    getDomProp: function (propName) {
        var me = this,
            result = (me.dirty && (propName in me.dirty)) ? undefined : me.props[propName];

        me.addTrigger(propName, true);
        return result;
    },

    /**
     * Returns a style for this item. Each style is read from the DOM only once on first
     * request and is then cached. If the value is an integer, it is parsed automatically
     * (so '5px' is not returned, but rather 5).
     *
     * @param {String} styleName The CSS style name.
     * @return {Object} The value of the DOM style (parsed as necessary).
     */
    getStyle: function (styleName) {
        var me = this,
            styles = me.styles,
            info, value;

        if (styleName in styles) {
            value = styles[styleName];
        } else {
            info = me.styleInfo[styleName];
            value = me.el.getStyle(styleName);

            if (info && info.parseInt) {
                value = parseInt(value, 10) || 0;
            }

            styles[styleName] = value;
        }

        return value;
    },

    /**
     * Returns styles for this item. Each style is read from the DOM only once on first
     * request and is then cached. If the value is an integer, it is parsed automatically
     * (so '5px' is not returned, but rather 5).
     *
     * @param {String[]} styleNames The CSS style names.
     * @param {String[]} [altNames] The alternate names for the returned styles. If given,
     * these names must correspond one-for-one to the `styleNames`.
     * @return {Object} The values of the DOM styles (parsed as necessary).
     */
    getStyles: function (styleNames, altNames) {
        var me = this,
            styleCache = me.styles,
            values = {},
            hits = 0,
            n = styleNames.length,
            i, missing, missingAltNames, name, info, styleInfo, styles, value;

        altNames = altNames || styleNames;

        // We are optimizing this for all hits or all misses. If we hit on all styles, we
        // don't create a missing[]. If we miss on all styles, we also don't create one.
        for (i = 0; i < n; ++i) {
            name = styleNames[i];

            if (name in styleCache) {
                values[altNames[i]] = styleCache[name];
                ++hits;

                if (i && hits==1) { // if (first hit was after some misses)
                    missing = styleNames.slice(0, i);
                    missingAltNames = altNames.slice(0, i);
                }
            } else if (hits) {
                (missing || (missing = [])).push(name);
                (missingAltNames || (missingAltNames = [])).push(altNames[i]);
            }
        }

        if (hits < n) {
            missing = missing || styleNames;
            missingAltNames = missingAltNames || altNames;
            styleInfo = me.styleInfo;

            styles = me.el.getStyle(missing);

            for (i = missing.length; i--; ) {
                name = missing[i];
                info = styleInfo[name];
                value = styles[name];

                if (info && info.parseInt) {
                    value = parseInt(value, 10) || 0;
                }

                values[missingAltNames[i]] = value;
                styleCache[name] = value;
            }
        }

        return values;
    },

    /**
     * Returns true if the given property has been set. This is equivalent to calling
     * {@link #getProp} and not getting an undefined result. In particular, this call
     * registers the current layout to be triggered by changes to this property.
     * 
     * @param {String} propName The property name (e.g., 'width').
     * @return {Boolean}
     */
    hasProp: function (propName) {
        var value = this.getProp(propName);
        return typeof value != 'undefined';
    },

    /**
     * Returns true if the given property is correct in the DOM. This is equivalent to
     * calling {@link #getDomProp} and not getting an undefined result. In particular,
     * this call registers the current layout to be triggered by flushes of this property.
     * 
     * @param {String} propName The property name (e.g., 'width').
     * @return {Boolean}
     */
    hasDomProp: function (propName) {
        var value = this.getDomProp(propName);
        return typeof value != 'undefined';
    },

    /**
     * Invalidates the component associated with this item. The layouts for this component
     * and all of its contained items will be re-run after first clearing any computed
     * values.
     * 
     * If state needs to be carried forward beyond the invalidation, the `options` parameter
     * can be used.
     *
     * @param {Object} options An object describing how to handle the invalidation.
     * @param {Object} options.state An object to {@link Ext#apply} to the {@link #state}
     *  of this item after invalidation clears all other properties.
     * @param {Function} options.before A function to call after the context data is cleared
     * and before the {@link Ext.layout.Layout#beginLayoutCycle} methods are called.
     * @param {Ext.layout.ContextItem} options.before.item This ContextItem.
     * @param {Object} options.before.options The options object passed to {@link #invalidate}.
     * @param {Function} options.after A function to call after the context data is cleared
     * and after the {@link Ext.layout.Layout#beginLayoutCycle} methods are called.
     * @param {Ext.layout.ContextItem} options.after.item This ContextItem.
     * @param {Object} options.after.options The options object passed to {@link #invalidate}.
     * @param {Object} options.scope The scope to use when calling the callback functions.
     */
    invalidate: function (options) {
        this.context.queueInvalidate(this, options);
    },

    markDirty: function () {
        if (++this.dirtyCount == 1) {
            // our first dirty property... queue us for flush
            this.context.queueFlush(this);
        }
    },

    onBoxMeasured: function () {
        var boxParent = this.boxParent,
            state = this.state;

        if (boxParent && boxParent.widthModel.shrinkWrap && !state.boxMeasured && this.measuresBox) {
            // since an autoWidth boxParent is holding a width on itself to allow each
            // child to measure
            state.boxMeasured = 1; // best to only call once per child
            boxParent.boxChildMeasured();
        }
    },

    parseMargins: function (margins, defaultMargins) {
        if (margins === true) {
            margins = 5;
        }

        var type = typeof margins,
            ret;

        if (type == 'string' || type == 'number') {
            ret = Ext.util.Format.parseBox(margins);
        } else if (margins || defaultMargins) {
            ret = { top: 0, right: 0, bottom: 0, left: 0 }; // base defaults

            if (defaultMargins) {
                Ext.apply(ret, this.parseMargins(defaultMargins)); // + layout defaults
            }

            Ext.apply(ret, margins); // + config
        }

        return ret;
    },

    peek: function (propName) {
        return this.props[propName];
    },

    /**
     * Recovers a property value from the last computation and restores its value and
     * dirty state.
     * 
     * @param {String} propName The name of the property to recover.
     * @param {Object} oldProps The old "props" object from which to recover values.
     * @param {Object} oldDirty The old "dirty" object from which to recover state.
     */
    recoverProp: function (propName, oldProps, oldDirty) {
        var me = this,
            props = me.props,
            dirty;

        if (propName in oldProps) {
            props[propName] = oldProps[propName];

            if (oldDirty && propName in oldDirty) {
                dirty = me.dirty || (me.dirty = {});
                dirty[propName] = oldDirty[propName];
            }
        }
    },

    redo: function(deep) {
        var me = this,
            items, len, i;

        me.revertProps(me.props);

        if (deep && me.wrapsComponent) {
            // Rollback the state of child Components
            if (me.childItems) {
                for (i = 0, items = me.childItems, len = items.length; i < len; i++) {
                    items[i].redo(deep);
                }
            }

            // Rollback the state of child Elements
            for (i = 0, items = me.children, len = items.length; i < len; i++) {
                items[i].redo();
            }
        }
    },

    revertProps: function (props) {
        var name,
            flushed = this.flushedProps,
            reverted = {};

        for (name in props) {
            if (flushed.hasOwnProperty(name)) {
                reverted[name] = props[name];
            }
        }

        this.writeProps(reverted);
    },

    /**
     * Queue the setting of a DOM attribute on this ContextItem's target when next flushed.
     */
    setAttribute: function(name, value) {
        var me = this;
        if (!me.attributes) {
            me.attributes = {};
        }
        me.attributes[name] = value;
        me.markDirty();
    },

    setBox: function (box) {
        var me = this;

        if ('left' in box) {
            me.setProp('x', box.left);
        }
        if ('top' in box) {
            me.setProp('y', box.top);
        }

        // if sizeModel says we should not be setting these, the appropriate calls will be
        // null operations... otherwise, we must set these values, so what we have in box
        // is what we go with (undefined, NaN and no change are handled at a lower level):
        me.setSize(box.width, box.height);
    },

    /**
     * Sets the contentHeight property. If the component uses raw content, then only the
     * measured height is acceptable.
     *
     * Calculated values can sometimes be NaN or undefined, which generally mean the
     * calculation is not done. To indicate that such as value was passed, 0 is returned.
     * Otherwise, 1 is returned.
     *
     * If the caller is not measuring (i.e., they are calculating) and the component has raw
     * content, 1 is returned indicating that the caller is done.
     */
    setContentHeight: function (height, measured) {
        if (!measured && this.hasRawContent) {
            return 1;
        }

        return this.setProp('contentHeight', height);
    },

    /**
     * Sets the contentWidth property. If the component uses raw content, then only the
     * measured width is acceptable.
     * 
     * Calculated values can sometimes be NaN or undefined, which generally means that the
     * calculation is not done. To indicate that such as value was passed, 0 is returned.
     * Otherwise, 1 is returned.
     *
     * If the caller is not measuring (i.e., they are calculating) and the component has raw
     * content, 1 is returned indicating that the caller is done.
     */
    setContentWidth: function (width, measured) {
        if (!measured && this.hasRawContent) {
            return 1;
        }

        return this.setProp('contentWidth', width);
    },

    /**
     * Sets the contentWidth and contentHeight properties. If the component uses raw content,
     * then only the measured values are acceptable.
     * 
     * Calculated values can sometimes be NaN or undefined, which generally means that the
     * calculation is not done. To indicate that either passed value was such a value, false
     * returned. Otherwise, true is returned.
     *
     * If the caller is not measuring (i.e., they are calculating) and the component has raw
     * content, true is returned indicating that the caller is done.
     */
    setContentSize: function (width, height, measured) {
        return this.setContentWidth(width, measured) +
               this.setContentHeight(height, measured) == 2;
    },

    /**
     * Sets a property value. This will unblock and/or trigger dependent layouts if the
     * property value is being changed. Values of NaN and undefined are not accepted by
     * this method.
     * 
     * @param {String} propName The property name (e.g., 'width').
     * @param {Object} value The new value of the property.
     * @param {Boolean} dirty Optionally specifies if the value is currently in the DOM
     *  (default is `true` which indicates the value is not in the DOM and must be flushed
     *  at some point).
     * @return {Number} 1 if this call specified the property value, 0 if not.
     */
    setProp: function (propName, value, dirty) {
        var me = this,
            valueType = typeof value,
            borderBox, info;

        if (valueType == 'undefined' || (valueType === 'number' && isNaN(value))) {
            return 0;
        }
        if (me.props[propName] === value) {
            return 1;
        }

        me.props[propName] = value;
        ++me.context.progressCount;

        if (dirty === false) {
            // if the prop is equivalent to what is in the DOM (we won't be writing it),
            // we need to clear hard blocks (domBlocks) on that property.
            me.fireTriggers('domTriggers', propName);
            me.clearBlocks('domBlocks', propName);
        } else {
            info = me.styleInfo[propName];
            if (info) {
                if (!me.dirty) {
                    me.dirty = {};
                }

                if (propName == 'width' || propName == 'height') {
                    borderBox = me.isBorderBoxValue;
                    if (borderBox == null) {
                        me.isBorderBoxValue = borderBox = !!me.el.isBorderBox();
                    }

                    if (!borderBox) {
                        me.borderInfo || me.getBorderInfo();
                        me.paddingInfo || me.getPaddingInfo();
                    }
                }
                me.dirty[propName] = value;
                me.markDirty();
            }
        }

        // we always clear soft blocks on set
        me.fireTriggers('triggers', propName);
        me.clearBlocks('blocks', propName);
        return 1;
    },

    /**
     * Sets the height and constrains the height to min/maxHeight range.
     * 
     * @param {Number} height The height.
     * @param {Boolean} [dirty=true] Specifies if the value is currently in the DOM. A
     * value of `false` indicates that the value is already in the DOM.
     * @return {Number} The actual height after constraining.
     */
    setHeight: function (height, dirty /*, private {Boolean} force */) {
        var me = this,
            comp = me.target,
            frameBody, frameInfo, padding;

        if (height < 0) {
            height = 0;
        }
        if (!me.wrapsComponent) {
            if (!me.setProp('height', height, dirty)) {
                return NaN;
            }
        } else {
            height = Ext.Number.constrain(height, comp.minHeight || 0, comp.maxHeight);
            if (!me.setProp('height', height, dirty)) {
                return NaN;
            }

            frameBody = me.frameBodyContext;
            if (frameBody){
                frameInfo = me.getFrameInfo();
                frameBody.setHeight(height - frameInfo.height, dirty);
            }
        }

        return height;
    },

    /**
     * Sets the height and constrains the width to min/maxWidth range.
     * 
     * @param {Number} width The width.
     * @param {Boolean} [dirty=true] Specifies if the value is currently in the DOM. A
     * value of `false` indicates that the value is already in the DOM.
     * @return {Number} The actual width after constraining.
     */
    setWidth: function (width, dirty /*, private {Boolean} force */) {
        var me = this,
            comp = me.target,
            frameBody, frameInfo, padding;

        if (width < 0) {
            width = 0;
        }
        if (!me.wrapsComponent) {
            if (!me.setProp('width', width, dirty)) {
                return NaN;
            }
        } else {
            width = Ext.Number.constrain(width, comp.minWidth || 0, comp.maxWidth);
            if (!me.setProp('width', width, dirty)) {
                return NaN;
            }

            //if ((frameBody = me.target.frameBody) && (frameBody = me.getEl(frameBody))){
            frameBody = me.frameBodyContext;
            if (frameBody) {
                frameInfo = me.getFrameInfo();
                frameBody.setWidth(width - frameInfo.width, dirty);
            }

            /*if (owner.frameMC) {
                frameContext = ownerContext.frameContext ||
                        (ownerContext.frameContext = ownerContext.getEl('frameMC'));
                width += (frameContext.paddingInfo || frameContext.getPaddingInfo()).width;
            }*/
        }

        return width;
    },

    setSize: function (width, height, dirty) {
        this.setWidth(width, dirty);
        this.setHeight(height, dirty);
    },

    translateProps: {
        x: 'left',
        y: 'top'
    },

    undo: function(deep) {
        var me = this,
            items, len, i;

        me.revertProps(me.lastBox);

        if (deep && me.wrapsComponent) {
            // Rollback the state of child Components
            if (me.childItems) {
                for (i = 0, items = me.childItems, len = items.length; i < len; i++) {
                    items[i].undo(deep);
                }
            }

            // Rollback the state of child Elements
            for (i = 0, items = me.children, len = items.length; i < len; i++) {
                items[i].undo();
            }
        }
    },

    unsetProp: function (propName) {
        var dirty = this.dirty;

        delete this.props[propName];
        if (dirty) {
            delete dirty[propName];
        }
    },

    writeProps: function(dirtyProps, flushing) {
        if (!(dirtyProps && typeof dirtyProps == 'object')) {
            Ext.Logger.warn('writeProps expected dirtyProps to be an object');
            return;
        }

        var me = this,
            el = me.el,
            styles = {},
            styleCount = 0, // used as a boolean, the exact count doesn't matter
            styleInfo = me.styleInfo,
            
            info,
            propName,
            numericValue,
            
            dirtyX = 'x' in dirtyProps,
            dirtyY = 'y' in dirtyProps,
            x = dirtyProps.x,
            y = dirtyProps.y,
            
            width = dirtyProps.width,
            height = dirtyProps.height,
            isBorderBox = me.isBorderBoxValue,
            target = me.target,
            max = Math.max,
            paddingWidth = 0,
            paddingHeight = 0,
            hasWidth, hasHeight, isAbsolute, scrollbarSize, style, targetEl;

        // Process non-style properties:
        if ('displayed' in dirtyProps) {
            el.setDisplayed(dirtyProps.displayed);
        }

        // Unblock any hard blocks (domBlocks) and copy dom styles into 'styles'
        for (propName in dirtyProps) {
            if (flushing) {
                me.fireTriggers('domTriggers', propName);
                me.clearBlocks('domBlocks', propName);
                me.flushedProps[propName] = 1;
            }

            info = styleInfo[propName];
            if (info && info.dom) {
                // Numeric dirty values should have their associated suffix added
                if (info.suffix && (numericValue = parseInt(dirtyProps[propName], 10))) {
                    styles[propName] = numericValue + info.suffix;
                }
                // Non-numeric (eg "auto") go in unchanged.
                else {
                    styles[propName] = dirtyProps[propName];
                }
                ++styleCount;
            }
        }

        // convert x/y into setPosition (for a component) or left/top styles (for an el)
        if (dirtyX || dirtyY) {
            if (target.isComponent) {
                // Ensure we always pass the current coordinate in if one coordinate has not been dirtied by a calculation cycle.
                target.setPosition(x||me.props.x, y||me.props.y);
            } else {
                // we wrap an element, so convert x/y to styles:
                if (dirtyX) {
                    styles.left = x + 'px';
                    ++styleCount;
                }
                if (dirtyY) {
                    styles.top = y + 'px';
                    ++styleCount;
                }
            }
        }

        // Support for the content-box box model...
        if (!isBorderBox && (width > 0 || height > 0)) { // no need to subtract from 0
            // The width and height values assume the border-box box model,
            // so we must remove the padding & border to calculate the content-box.
            if (!(me.borderInfo && me.paddingInfo)) {
                throw Error("Needed to have gotten the borderInfo and paddingInfo when the width or height was setProp'd");
            }
            if(!me.frameBodyContext) {
                // Padding needs to be removed only if the element is not framed.
                paddingWidth = me.paddingInfo.width;
                paddingHeight = me.paddingInfo.height;
            }
            if (width) {
                width = max(parseInt(width, 10) - (me.borderInfo.width + paddingWidth), 0);
                styles.width = width + 'px';
                ++styleCount;
            }
            if (height) {
                height = max(parseInt(height, 10) - (me.borderInfo.height + paddingHeight), 0);
                styles.height = height + 'px';
                ++styleCount;
            }
        }

        // IE9 strict subtracts the scrollbar size from the element size when the element
        // is absolutely positioned and uses box-sizing: border-box. To workaround this
        // issue we have to add the the scrollbar size.
        // 
        // See http://social.msdn.microsoft.com/Forums/da-DK/iewebdevelopment/thread/47c5148f-a142-4a99-9542-5f230c78cb3b
        //
        if (me.wrapsComponent && Ext.isIE9 && Ext.isStrict) {
            // when we set a width and we have a vertical scrollbar (overflowY), we need
            // to add the scrollbar width... conversely for the height and overflowX
            if ((hasWidth = width !== undefined && me.hasOverflowY) ||
                (hasHeight = height !== undefined && me.hasOverflowX)) {
                // check that the component is absolute positioned and border-box:
                isAbsolute = me.isAbsolute;
                if (isAbsolute === undefined) {
                    isAbsolute = false;
                    targetEl = me.target.getTargetEl();
                    style = targetEl.getStyle('position');

                    if (style == 'absolute') {
                        style = targetEl.getStyle('box-sizing');
                        isAbsolute = (style == 'border-box');
                    }

                    me.isAbsolute = isAbsolute; // cache it
                }

                if (isAbsolute) {
                    scrollbarSize = Ext.getScrollbarSize();

                    if (hasWidth) {
                        width = parseInt(width, 10) + scrollbarSize.width;
                        styles.width = width + 'px';
                        ++styleCount;
                    }
                    if (hasHeight) {
                        height = parseInt(height, 10) + scrollbarSize.height;
                        styles.height = height + 'px';
                        ++styleCount;
                    }
                }
            }
        }

        // we make only one call to setStyle to allow it to optimize itself:
        if (styleCount) {
            el.setStyle(styles);
        }
    }
}, function () {
    
    var px =    { dom: true, parseInt: true, suffix: 'px' },
        isDom = { dom: true },
        faux =  { dom: false };

    // If a property exists in styleInfo, it participates in some way with the DOM. It may
    // be virtualized (like 'x' and y') and be indirect, but still requires a flush cycle
    // to reach the DOM. Properties (like 'contentWidth' and 'contentHeight') have no real
    // presence in the DOM and hence have no flush intanglements.
    // 
    // For simple styles, the object value on the right contains properties that help in
    // decoding values read by getStyle and preparing values to pass to setStyle.
    //
    this.prototype.styleInfo = {
        childrenDone:           faux,
        componentChildrenDone:  faux,
        containerChildrenDone:  faux,
        containerLayoutDone:    faux,
        displayed:              faux,
        done:                   faux,
        x:                      faux,
        y:                      faux,

        // For Ext.grid.ColumnLayout
        columnWidthsDone:       faux,

        left:                   px,
        top:                    px,
        right:                  px,
        bottom:                 px,
        width:                  px,
        height:                 px,

        'border-top-width':     px,
        'border-right-width':   px,
        'border-bottom-width':  px,
        'border-left-width':    px,

        'margin-top':           px,
        'margin-right':         px,
        'margin-bottom':        px,
        'margin-left':          px,

        'padding-top':          px,
        'padding-right':        px,
        'padding-bottom':       px,
        'padding-left':         px,

        'line-height':          isDom,
        display:                isDom
    };
});




/**
 * Manages context information during a layout.
 *
 * # Algorithm
 *
 * This class performs the following jobs:
 *
 *  - Cache DOM reads to avoid reading the same values repeatedly.
 *  - Buffer DOM writes and flush them as a block to avoid read/write interleaving.
 *  - Track layout dependencies so each layout does not have to figure out the source of
 *    its dependent values.
 *  - Intelligently run layouts when the values on which they depend change (a trigger).
 *  - Allow layouts to avoid processing when required values are unavailable (a block).
 *
 * Work done during layout falls into either a "read phase" or a "write phase" and it is
 * essential to always be aware of the current phase. Most methods in
 * {@link Ext.layout.Layout Layout} are called during a read phase:
 * {@link Ext.layout.Layout#calculate calculate},
 * {@link Ext.layout.Layout#completeLayout completeLayout} and
 * {@link Ext.layout.Layout#finalizeLayout finalizeLayout}. The exceptions to this are
 * {@link Ext.layout.Layout#beginLayout beginLayout},
 * {@link Ext.layout.Layout#beginLayoutCycle beginLayoutCycle} and
 * {@link Ext.layout.Layout#finishedLayout finishedLayout} which are called during
 * a write phase. While {@link Ext.layout.Layout#finishedLayout finishedLayout} is called
 * a write phase, it is really intended to be a catch-all for post-processing after a
 * layout run.
 * 
 * In a read phase, it is OK to read the DOM but this should be done using the appropriate
 * {@link Ext.layout.ContextItem ContextItem} where possible since that provides a cache
 * to avoid redundant reads. No writes should be made to the DOM in a read phase! Instead,
 * the values should be written to the proper ContextItem for later write-back.
 * 
 * The rules flip-flop in a write phase. The only difference is that ContextItem methods
 * like {@link Ext.layout.ContextItem#getStyle getStyle} will still read the DOM unless the
 * value was previously read. This detail is unknowable from the outside of ContextItem, so
 * read calls to ContextItem should also be avoided in a write phase.
 *
 * Calculating interdependent layouts requires a certain amount of iteration. In a given
 * cycle, some layouts will contribute results that allow other layouts to proceed. The
 * general flow then is to gather all of the layouts (both component and container) in a
 * component tree and queue them all for processing. The initial queue order is bottom-up
 * and component layout first, then container layout (if applicable) for each component.
 *
 * This initial step also calls the beginLayout method on all layouts to clear any values
 * from the DOM that might interfere with calculations and measurements. In other words,
 * this is a "write phase" and reads from the DOM should be strictly avoided.
 * 
 * Next the layout enters into its iterations or "cycles". Each cycle consists of calling
 * the {@link Ext.layout.Layout#calculate calculate} method on all layouts in the
 * {@link #layoutQueue}. These calls are part of a "read phase" and writes to the DOM should
 * be strictly avoided.
 *
 * # Considerations
 *
 * **RULE 1**: Respect the read/write cycles. Always use the {@link Ext.layout.ContextItem#getProp getProp}
 * or {@link Ext.layout.ContextItem#getDomProp getDomProp} methods to get calculated values;
 * only use the {@link Ext.layout.ContextItem#getStyle getStyle} method to read styles; use
 * {@link Ext.layout.ContextItem#setProp setProp} to set DOM values. Some reads will, of
 * course, still go directly to the DOM, but if there is a method in
 * {@link Ext.layout.ContextItem ContextItem} to do a certain job, it should be used instead
 * of a lower-level equivalent.
 *
 * The basic logic flow in {@link Ext.layout.Layout#calculate calculate} consists of gathering
 * values by calling {@link Ext.layout.ContextItem#getProp getProp} or
 * {@link Ext.layout.ContextItem#getDomProp getDomProp}, calculating results and publishing
 * them by calling {@link Ext.layout.ContextItem#setProp setProp}. It is important to realize
 * that {@link Ext.layout.ContextItem#getProp getProp} will return `undefined` if the value
 * is not yet known. But the act of calling the method is enough to track the fact that the
 * calling layout depends (in some way) on this value. In other words, the calling layout is
 * "triggered" by the properties it requests.
 *
 * **RULE 2**: Avoid calling {@link Ext.layout.ContextItem#getProp getProp} unless the value
 * is needed. Gratuitous calls cause inefficiency because the layout will appear to depend on
 * values that it never actually uses. This applies equally to
 * {@link Ext.layout.ContextItem#getDomProp getDomProp} and the test-only methods
 * {@link Ext.layout.ContextItem#hasProp hasProp} and {@link Ext.layout.ContextItem#hasDomProp hasDomProp}.
 *
 * Because {@link Ext.layout.ContextItem#getProp getProp} can return `undefined`, it is often
 * the case that subsequent math will produce NaN's. This is usually not a problem as the
 * NaN's simply propagate along and result in final results that are NaN. Both `undefined`
 * and NaN are ignored by {@link Ext.layout.ContextItem#setProp}, so it is often not necessary
 * to even know that this is happening. It does become important for determining if a layout
 * is not done or if it might lead to publishing an incorrect (but not NaN or `undefined`)
 * value.
 * 
 * **RULE 3**: If a layout has not calculated all the values it is required to calculate, it
 * must set {@link Ext.layout.Layout#done done} to `false` before returning from
 * {@link Ext.layout.Layout#calculate calculate}. This value is always `true` on entry because
 * it is simpler to detect the incomplete state rather than the complete state (especially up
 * and down a class hierarchy).
 * 
 * **RULE 4**: A layout must never publish an incomplete (wrong) result. Doing so would cause
 * dependent layouts to run their calculations on those wrong values, producing more wrong
 * values and some layouts may even incorrectly flag themselves as {@link Ext.layout.Layout#done done}
 * before the correct values are determined and republished. Doing this will poison the
 * calculations.
 *
 * **RULE 5**: Each value should only be published by one layout. If multiple layouts attempt
 * to publish the same values, it would be nearly impossible to avoid breaking **RULE 4**. To
 * help detect this problem, the layout diagnostics will trap on an attempt to set a value
 * from different layouts.
 *
 * Complex layouts can produce many results as part of their calculations. These values are
 * important for other layouts to proceed and need to be published by the earliest possible
 * call to {@link Ext.layout.Layout#calculate} to avoid unnecessary cycles and poor performance. It is
 * also possible, however, for some results to be related in a way such that publishing them
 * may be an all-or-none proposition (typically to avoid breaking *RULE 4*).
 * 
 * **RULE 6**: Publish results as soon as they are known to be correct rather than wait for
 * all values to be calculated. Waiting for everything to be complete can lead to deadlock.
 * The key here is not to forget **RULE 4** in the process.
 *
 * Some layouts depend on certain critical values as part of their calculations. For example,
 * HBox depends on width and cannot do anything until the width is known. In these cases, it
 * is best to use {@link Ext.layout.ContextItem#block block} or
 * {@link Ext.layout.ContextItem#domBlock domBlock} and thereby avoid processing the layout
 * until the needed value is available.
 *
 * **RULE 7**: Use {@link Ext.layout.ContextItem#block block} or
 * {@link Ext.layout.ContextItem#domBlock domBlock} when values are required to make progress.
 * This will mimize wasted recalculations.
 *
 * **RULE 8**: Blocks should only be used when no forward progress can be made. If even one
 * value could still be calculated, a block could result in a deadlock.
 *
 * Historically, layouts have been invoked directly by component code, sometimes in places
 * like an `afterLayout` method for a child component. With the flexibility now available
 * to solve complex, iterative issues, such things should be done in a responsible layout
 * (be it component or container).
 *
 * **RULE 9**: Use layouts to solve layout issues and don't wait for the layout to finish to
 * perform further layouts. This is especially important now that layouts process entire
 * component trees and not each layout in isolation.
 *
 * # Sequence Diagram
 *
 * The simplest sequence diagram for a layout run looks roughly like this:
 *
 *       Context         Layout 1     Item 1     Layout 2     Item 2
 *          |               |           |           |           |
 *     ---->X-------------->X           |           |           |
 *     run  X---------------|-----------|---------->X           |
 *          X beginLayout   |           |           |           |
 *          X               |           |           |           |
 *        A X-------------->X           |           |           |
 *          X  calculate    X---------->X           |           |
 *          X             C X  getProp  |           |           |
 *        B X               X---------->X           |           |
 *          X               |  setProp  |           |           |
 *          X               |           |           |           |
 *        D X---------------|-----------|---------->X           |
 *          X  calculate    |           |           X---------->X
 *          X               |           |           |  setProp  |
 *        E X               |           |           |           |
 *          X---------------|-----------|---------->X           |
 *          X completeLayout|           |         F |           |
 *          X               |           |           |           |
 *        G X               |           |           |           |
 *        H X-------------->X           |           |           |
 *          X  calculate    X---------->X           |           |
 *          X             I X  getProp  |           |           |
 *          X               X---------->X           |           |
 *          X               |  setProp  |           |           |
 *        J X-------------->X           |           |           |
 *          X completeLayout|           |           |           |
 *          X               |           |           |           |
 *        K X-------------->X           |           |           |
 *          X---------------|-----------|---------->X           |
 *          X finalizeLayout|           |           |           |
 *          X               |           |           |           |
 *        L X-------------->X           |           |           |
 *          X---------------|-----------|---------->X           |
 *          X finishedLayout|           |           |           |
 *          X               |           |           |           |
 *        M X-------------->X           |           |           |
 *          X---------------|-----------|---------->X           |
 *          X notifyOwner   |           |           |           |
 *        N |               |           |           |           |
 *          -               -           -           -           -
 *
 *
 * Notes:
 *
 * **A.** This is a call from the {@link #run} method to the {@link #runCycle} method.
 * Each layout in the queue will have its {@link Ext.layout.Layout#calculate calculate}
 * method called.
 *
 * **B.** After each {@link Ext.layout.Layout#calculate calculate} method is called the
 * {@link Ext.layout.Layout#done done} flag is checked to see if the Layout has completed.
 * If it has completed and that layout object implements a
 * {@link Ext.layout.Layout#completeLayout completeLayout} method, this layout is queued to
 * receive its call. Otherwise, the layout will be queued again unless there are blocks or
 * triggers that govern its requeueing.
 * 
 * **C.** The call to {@link Ext.layout.ContextItem#getProp getProp} is made to the Item
 * and that will be tracked as a trigger (keyed by the name of the property being requested).
 * Changes to this property will cause this layout to be requeued. The call to
 * {@link Ext.layout.ContextItem#setProp setProp} will place a value in the item and not
 * directly into the DOM.
 * 
 * **D.** Call the other layouts now in the first cycle (repeat **B** and **C** for each
 * layout).
 * 
 * **E.** After completing a cycle, if progress was made (new properties were written to
 * the context) and if the {@link #layoutQueue} is not empty, the next cycle is run. If no
 * progress was made or no layouts are ready to run, all buffered values are written to
 * the DOM (a flush).
 *
 * **F.** After flushing, any layouts that were marked as {@link Ext.layout.Layout#done done}
 * that also have a {@link Ext.layout.Layout#completeLayout completeLayout} method are called.
 * This can cause them to become no longer done (see {@link #invalidate}). As with
 * {@link Ext.layout.Layout#calculate calculate}, this is considered a "read phase" and
 * direct DOM writes should be avoided.
 * 
 * **G.** Flushing and calling any pending {@link Ext.layout.Layout#completeLayout completeLayout}
 * methods will likely trigger layouts that called {@link Ext.layout.ContextItem#getDomProp getDomProp}
 * and unblock layouts that have called {@link Ext.layout.ContextItem#domBlock domBlock}.
 * These variants are used when a layout needs the value to be correct in the DOM and not
 * simply known. If this does not cause at least one layout to enter the queue, we have a
 * layout FAILURE. Otherwise, we continue with the next cycle.
 * 
 * **H.** Call {@link Ext.layout.Layout#calculate calculate} on any layouts in the queue
 * at the start of this cycle. Just a repeat of **B** through **G**.
 * 
 * **I.** Once the layout has calculated all that it is resposible for, it can leave itself
 * in the {@link Ext.layout.Layout#done done} state. This is the value on entry to
 * {@link Ext.layout.Layout#calculate calculate} and must be cleared in that call if the
 * layout has more work to do.
 * 
 * **J.** Now that all layouts are done, flush any DOM values and
 * {@link Ext.layout.Layout#completeLayout completeLayout} calls. This can again cause
 * layouts to become not done, and so we will be back on another cycle if that happens.
 * 
 * **K.** After all layouts are done, call the {@link Ext.layout.Layout#finalizeLayout finalizeLayout}
 * method on any layouts that have one. As with {@link Ext.layout.Layout#completeLayout completeLayout},
 * this can cause layouts to become no longer done. This is less desirable than using
 * {@link Ext.layout.Layout#completeLayout completeLayout} because it will cause all
 * {@link Ext.layout.Layout#finalizeLayout finalizeLayout} methods to be called again
 * when we think things are all wrapped up.
 *
 * **L.** After finishing the last iteration, layouts that have a
 * {@link Ext.layout.Layout#finishedLayout finishedLayout} method will be called. This
 * call will only happen once per run and cannot cause layouts to be run further.
 *
 * **M.** After calling finahedLayout, layouts that have a
 * {@link Ext.layout.Layout#notifyOwner notifyOwner} method will be called. This
 * call will only happen once per run and cannot cause layouts to be run further.
 *
 * **N.** One last flush to make sure everything has been written to the DOM.
 *
 * # Inter-Layout Collaboration
 * 
 * Many layout problems require collaboration between multiple layouts. In some cases, this
 * is as simple as a component's container layout providing results used by its component
 * layout or vise-versa. A slightly more distant collaboration occurs in a box layout when
 * stretchmax is used: the child item's component layout provides results that are consumed
 * by the ownerCt's box layout to determine the size of the children.
 *
 * The various forms of interdependence between a container and its children are described by
 * each components' {@link Ext.AbstractComponent#getSizeModel size model}.
 *
 * To facilitate this collaboration, the following pairs of properties are published to the
 * component's {@link Ext.layout.ContextItem ContextItem}:
 *
 *  - width/height: These hold the final size of the component. The layout indicated by the
 *    {@link Ext.AbstractComponent#getSizeModel size model} is responsible for setting these.
 *  - contentWidth/contentHeight: These hold size information published by the container
 *    layout or from DOM measurement. These describe the content only. These values are
 *    used by the component layout to determine the outer width/height when that component
 *    is {@link Ext.AbstractComponent#shrinkWrap shrink-wrapped}. They are also used to
 *    determine overflow. All container layouts must publish these values for dimensions
 *    that are shrink-wrapped. If a component has raw content (not container items), the
 *    componentLayout must publish these values instead.
 * 
 * @protected
 */
Ext.define('Ext.layout.Context', {
    requires: [
        'Ext.util.Queue',
        'Ext.layout.ContextItem',
        'Ext.layout.Layout',
        'Ext.fx.Anim',
        'Ext.fx.Manager'
    ],

    remainingLayouts: 0,

    /**
     * @property {Number} state One of these values:
     *
     *  - 0 - Before run
     *  - 1 - Running
     *  - 2 - Run complete
     */
    state: 0,

    constructor: function (config) {
        var me = this;

        Ext.apply(me, config);

        // holds the ContextItem collection, keyed by element id
        me.items = {};

        // a collection of layouts keyed by layout id
        me.layouts = {};

        // the number of blocks of any kind:
        me.blockCount = 0;
        // the number of cycles that have been run:
        me.cycleCount = 0;
        // the number of flushes to the DOM:
        me.flushCount = 0;
        // the number of layout calculate calls:
        me.calcCount = 0;

        me.animateQueue = me.newQueue();
        me.completionQueue = me.newQueue();
        me.finalizeQueue = me.newQueue();
        me.finishQueue = me.newQueue();
        me.flushQueue = me.newQueue();

        me.invalidateData = {};

        /**
         * @property {Ext.util.Queue} layoutQueue
         * List of layouts to perform.
         */
        me.layoutQueue = me.newQueue();

        // this collection is special because we ensure that there are no parent/child pairs
        // present, only distinct top-level components
        me.invalidQueue = [];

        me.triggers = {
            data: {
                /*
                layoutId: [
                    { item: contextItem, prop: propertyName }
                ]
                */
            },
            dom: {}
        };
    },

    callLayout: function (layout, methodName) {
        this.currentLayout = layout;
        layout[methodName](this.getCmp(layout.owner));
    },

    cancelComponent: function (comp, isChild, isDestroying) {
        var me = this,
            components = comp,
            isArray = !comp.isComponent,
            length = isArray ? components.length : 1,
            i, k, klen, items, layout, newQueue, oldQueue, entry, temp,
            ownerCtContext;

        for (i = 0; i < length; ++i) {
            if (isArray) {
                comp = components[i];
            }

            // If the component is being destroyed, remove the component's ContextItem from its parent's contextItem.childItems array
            if (isDestroying && comp.ownerCt) {
                ownerCtContext = this.items[comp.ownerCt.el.id];
                if (ownerCtContext) {
                    Ext.Array.remove(ownerCtContext.childItems, me.getCmp(comp));
                }
            }

            if (!isChild) {
                oldQueue = me.invalidQueue;
                klen = oldQueue.length;

                if (klen) {
                    me.invalidQueue = newQueue = [];
                    for (k = 0; k < klen; ++k) {
                        entry = oldQueue[k];
                        temp = entry.item.target;
                        if (temp != comp && !temp.isDescendant(comp)) {
                            newQueue.push(entry);
                        }
                    }
                }
            }

            layout = comp.componentLayout;
            me.cancelLayout(layout);

            if (layout.getLayoutItems) {
                items = layout.getLayoutItems();
                if (items.length) {
                    me.cancelComponent(items, true);
                }
            }

            if (comp.isContainer && !comp.collapsed) {
                layout = comp.layout;
                me.cancelLayout(layout);

                items = layout.getVisibleItems();
                if (items.length) {
                    me.cancelComponent(items, true);
                }
            }
        }
    },

    cancelLayout: function (layout) {
        var me = this;

        me.completionQueue.remove(layout);
        me.finalizeQueue.remove(layout);
        me.finishQueue.remove(layout);
        me.layoutQueue.remove(layout);

        if (layout.running) {
            me.layoutDone(layout);
        }

        layout.ownerContext = null;
    },

    clearTriggers: function (layout, inDom) {
        var id = layout.id,
            collection = this.triggers[inDom ? 'dom' : 'data'],
            triggers = collection && collection[id],
            length = (triggers && triggers.length) || 0,
            collection, i, item, trigger;

        for (i = 0; i < length; ++i) {
            trigger = triggers[i];
            item = trigger.item;

            collection = inDom ? item.domTriggers : item.triggers;
            delete collection[trigger.prop][id];
        }
    },

    /**
     * Flushes any pending writes to the DOM by calling each ContextItem in the flushQueue.
     */
    flush: function () {
        var me = this,
            items = me.flushQueue.clear(),
            length = items.length, i;

        if (length) {
            ++me.flushCount;

            for (i = 0; i < length; ++i) {
                items[i].flush();
            }
        }
    },

    flushAnimations: function() {
        var me = this,
            items = me.animateQueue.clear(),
            len = items.length,
            i;

        if (len) {
            for (i = 0; i < len; i++) {
                // Each Component may refuse to participate in animations.
                // This is used by the BoxReorder plugin which drags a Component,
                // during which that Component must be exempted from layout positioning.
                if (items[i].target.animate !== false) {
                    items[i].flushAnimations();
                }
            }

            // Ensure the first frame fires now to avoid a browser repaint with the elements in the "to" state
            // before they are returned to their "from" state by the animation.
            Ext.fx.Manager.runner();
        }
    },

    flushInvalidates: function () {
        var me = this,
            queue = me.invalidQueue,
            length = queue && queue.length,
            comp, components, entry, i;

        me.invalidQueue = [];

        if (length) {
            components = [];
            for (i = 0; i < length; ++i) {
                comp = (entry = queue[i]).item.target;
                // we filter out-of-body components here but allow them into the queue to
                // ensure that their child components are coalesced out (w/no additional
                // cost beyond our normal effort to avoid parent/child components in the
                // queue)
                if (!comp.container.isDetachedBody) {
                    components.push(comp);

                    if (entry.options) {
                        me.invalidateData[comp.id] = entry.options;
                    }
                }
            }

            me.invalidate(components, null);
        }
    },

    flushLayouts: function (queueName, methodName, dontClear) {
        var me = this,
            layouts = dontClear ? me[queueName].items : me[queueName].clear(),
            length = layouts.length,
            i, layout;

        if (length) {
            for (i = 0; i < length; ++i) {
                layout = layouts[i];
                if (!layout.running) {
                    me.callLayout(layout, methodName);
                }
            }
            me.currentLayout = null;
        }
    },

    /**
     * Returns the ContextItem for a component.
     * @param {Ext.Component} cmp
     */
    getCmp: function (cmp) {
        return this.getItem(cmp, cmp.el);
    },

    /**
     * Returns the ContextItem for an element.
     * @param {Ext.layout.ContextItem} parent
     * @param {Ext.dom.Element} el
     */
    getEl: function (parent, el) {
        var item = this.getItem(el, el);

        if (!item.parent) {
            item.parent = parent;

            // all items share an empty children array (to avoid null checks), so we can
            // only push on to the children array if there is already something there (we
            // copy-on-write):
            if (parent.children.length) {
                parent.children.push(item);
            } else {
                parent.children = [ item ]; // now parent has its own children[] (length=1)
            }
        }

        return item;
    },

    getItem: function (target, el) {
        var id = el.id,
            items = this.items,
            item = items[id] ||
                  (items[id] = new Ext.layout.ContextItem({
                                    context: this,
                                    target: target,
                                    el: el
                                }));

        return item;
    },

    handleFailure: function () {
        // This method should never be called, but is need when layouts fail (hence the
        // "should never"). We just disconnect any of the layouts from the run and return
        // them to the state they would be in had the layout completed properly.
        var layouts = this.layouts,
            layout, key;

        Ext.failedLayouts = (Ext.failedLayouts || 0) + 1;
        Ext.log('Layout run failed');

        for (key in layouts) {
            layout = layouts[key];

            if (layouts.hasOwnProperty(key)) {
                layout.running      = false;
                layout.ownerContext = null;
            }
        }
    },

    /**
     * Invalidates one or more components' layouts (component and container). This can be
     * called before run to identify the components that need layout or during the run to
     * restart the layout of a component. This is called internally to flush any queued
     * invalidations at the start of a cycle. If called during a run, it is not expected
     * that new components will be introduced to the layout.
     * 
     * @param {Ext.Component/Array} components An array of Components or a single Component.
     * @param {Ext.layout.ContextItem} ownerCtContext The ownerCt's ContextItem.
     * @param {Boolean} full True if all properties should be invalidated, otherwise only
     *  those calculated by the component should be invalidated.
     */
    invalidate: function (components, full) {
        var me = this,
            isArray = !components.isComponent,
            componentChildrenDone, containerChildrenDone, containerLayoutDone,
            firstTime, i, comp, item, items, length, componentLayout, layout,
            invalidateOptions, token;

        for (i = 0, length = isArray ? components.length : 1; i < length; ++i) {
            comp = isArray ? components[i] : components;

            if (comp.rendered && !comp.hidden) {
                item = me.getCmp(comp);
                componentLayout = comp.componentLayout;
                firstTime = !componentLayout.ownerContext;
                layout = (comp.isContainer && !comp.collapsed) ? comp.layout : null;

                // Extract any invalidate() options for this item.
                invalidateOptions = me.invalidateData[item.id];
                delete me.invalidateData[item.id];

                // We invalidate the contextItem's in a top-down manner so that SizeModel
                // info for containers is available to their children. This is a critical
                // optimization since sizeModel determination often requires knowing the
                // sizeModel of the ownerCt. If this weren't cached as we descend, this
                // would be an O(N^2) operation! (where N=number of components, or 300+/-
                // in Themes)
                token = item.init(full, invalidateOptions);

                if (invalidateOptions) {
                    me.processInvalidate(invalidateOptions, item, 'before');
                }

                // Allow the component layout a chance to effect its size model before we
                // recurse down the component hierarchy (since children need to know the
                // size model of their ownerCt).
                if (componentLayout.beforeLayoutCycle) {
                    componentLayout.beforeLayoutCycle(item);
                }

                // Finish up the item-level processing that is based on the size model of
                // the component.
                token = item.initContinue(token);

                // Start these state variables at true, since that is the value we want if
                // they do not apply (i.e., no work of this kind on which to wait).
                componentChildrenDone = containerChildrenDone = containerLayoutDone = true;

                // A ComponentLayout MUST implement getLayoutItems to allow its children
                // to be collected. Ext.container.Container does this, but non-Container
                // Components which manage Components as part of their structure (e.g.,
                // HtmlEditor) must still return child Components via getLayoutItems.
                if (componentLayout.getLayoutItems) {
                    componentLayout.renderChildren();

                    items = componentLayout.getLayoutItems();
                    if (items.length) {
                        me.invalidate(items, true);
                        componentChildrenDone = false;
                    }
                }

                if (layout) {
                    containerLayoutDone = false;
                    layout.renderChildren();

                    items = layout.getVisibleItems();
                    if (items.length) {
                        me.invalidate(items, true);
                        containerChildrenDone = false;
                    }
                }

                // Finish the processing that requires the size models of child items to
                // be determined (and some misc other stuff).
                item.initDone(token, componentChildrenDone, containerChildrenDone,
                              containerLayoutDone);

                // Inform the layouts that we are about to begin (or begin again) now that
                // the size models of the component and its children are setup.
                me.resetLayout(componentLayout, item, firstTime);
                if (layout) {
                    me.resetLayout(layout, item, firstTime);
                }

                // This has to occur after the component layout has had a chance to begin
                // so that we can determine what kind of animation might be needed. TODO-
                // move this determination into the layout itself.
                item.initAnimation();

                if (invalidateOptions) {
                    me.processInvalidate(invalidateOptions, item, 'after');
                }
            }
        }

        me.currentLayout = null;
    },

    layoutDone: function (layout) {
        var ownerContext = layout.ownerContext,
            ownerCtContext;

        layout.running = false;

        // Once a component layout completes, we can mark it as "done" but we can also
        // decrement the remainingChildLayouts property on the ownerCtContext. When that
        // goes to 0, we can mark the ownerCtContext as "childrenDone".
        if (layout.isComponentLayout) {
            if (ownerContext.measuresBox) {
                ownerContext.onBoxMeasured(); // be sure to release our boxParent
            }

            ownerContext.setProp('done', true);

            ownerCtContext = ownerContext.ownerCtContext;
            if (ownerCtContext) {
                if (ownerContext.target.ownerLayout.isComponentLayout) {
                    if (! --ownerCtContext.remainingComponentChildLayouts) {
                        ownerCtContext.setProp('componentChildrenDone', true);
                    }
                } else {
                    if (! --ownerCtContext.remainingContainerChildLayouts) {
                        ownerCtContext.setProp('containerChildrenDone', true);
                    }
                }
                if (! --ownerCtContext.remainingChildLayouts) {
                    ownerCtContext.setProp('childrenDone', true);
                }
            }
        } else {
            ownerContext.setProp('containerLayoutDone', true);
        }

        --this.remainingLayouts;
        ++this.progressCount; // a layout completion is progress
    },

    newQueue: function () {
        return new Ext.util.Queue();
    },

    processInvalidate: function (options, item, name) {
        // When calling a callback, the currentLayout needs to be adjusted so
        // that whichever layout caused the invalidate is the currentLayout...
        if (options[name]) {
            var me = this,
                currentLayout = me.currentLayout;

            me.currentLayout = options.layout || null;

            options[name](item, options);

            me.currentLayout = currentLayout;
        }
    },

    /**
     * Queues a ContextItem to have its {@link Ext.layout.ContextItem#flushAnimations} method called.
     *
     * @param {Ext.layout.ContextItem} item
     * @private
     */
    queueAnimation: function (item) {
        this.animateQueue.add(item);
    },

    /**
     * Queues a layout to have its {@link Ext.layout.Layout#completeLayout} method called.
     *
     * @param {Ext.layout.Layout} layout
     * @private
     */
    queueCompletion: function (layout) {
        this.completionQueue.add(layout);
    },

    /**
     * Queues a layout to have its {@link Ext.layout.Layout#finalizeLayout} method called.
     *
     * @param {Ext.layout.Layout} layout
     * @private
     */
    queueFinalize: function (layout) {
        this.finalizeQueue.add(layout);
    },

    /**
     * Queues a ContextItem for the next flush to the DOM. This should only be called by
     * the {@link Ext.layout.ContextItem} class.
     *
     * @param {Ext.layout.ContextItem} item
     * @private
     */
    queueFlush: function (item) {
        this.flushQueue.add(item);
    },

    chainFns: function (oldOptions, newOptions, funcName) {
        var me = this,
            oldLayout = oldOptions.layout,
            newLayout = newOptions.layout,
            oldFn = oldOptions[funcName],
            newFn = newOptions[funcName];

        // Call newFn last so it can get the final word on things... also, the "this"
        // pointer will be passed correctly by createSequence with oldFn first.
        return function (contextItem) {
            var prev = me.currentLayout;
            if (oldFn) {
                me.currentLayout = oldLayout;
                oldFn.call(oldOptions.scope || oldOptions, contextItem, oldOptions);
            }
            me.currentLayout = newLayout;
            newFn.call(newOptions.scope || newOptions, contextItem, newOptions);
            me.currentLayout = prev;
        };
    },

    /**
     * Queue a component (and its tree) to be invalidated on the next cycle.
     *
     * @param {Ext.Component/Ext.layout.ContextItem} item The component or ContextItem to invalidate.
     * @param {Object} options An object describing how to handle the invalidation (see
     *  {@link Ext.layout.ContextItem#invalidate} for details).
     * @private
     */
    queueInvalidate: function (item, options) {
        var me = this,
            newQueue = [],
            oldQueue = me.invalidQueue,
            index = oldQueue.length,
            comp, old, oldComp, oldOptions, oldState;

        if (item.isComponent) {
            item = me.getCmp(comp = item);
        } else {
            comp = item.target;
        }

        item.invalid = true;

        // See if comp is contained by any component already in the queue (ignore comp if
        // that is the case). Eliminate any components in the queue that are contained by
        // comp (by not adding them to newQueue).
        while (index--) {
            old = oldQueue[index];
            oldComp = old.item.target;

            if (comp.isDescendant(oldComp)) {
                return; // oldComp contains comp, so this invalidate is redundant
            }

            if (oldComp == comp) {
                // if already in the queue, update the options...
                if (!(oldOptions = old.options)) {
                    old.options = options;
                } else if (options) {
                    if (options.widthModel) {
                        oldOptions.widthModel = options.widthModel;
                    }
                    if (options.heightModel) {
                        oldOptions.heightModel = options.heightModel;
                    }
                    if (!(oldState = oldOptions.state)) {
                        oldOptions.state = options.state;
                    } else if (options.state) {
                        Ext.apply(oldState, options.state);
                    }

                    if (options.before) {
                        oldOptions.before = me.chainFns(oldOptions, options, 'before');
                    }
                    if (options.after) {
                        oldOptions.after = me.chainFns(oldOptions, options, 'after');
                    }
                }

                // leave the old queue alone now that we've update this comp's entry...
                return;
            }

            if (!oldComp.isDescendant(comp)) {
                newQueue.push(old); // comp does not contain oldComp
            }
            // else if (oldComp isDescendant of comp) skip
        }
        // newQueue contains only those components not a descendant of comp

        // to get here, comp must not be a child of anything already in the queue, so it
        // needs to be added along with its "options":
        newQueue.push({ item: item, options: options });

        me.invalidQueue = newQueue;
    },

    queueItemLayouts: function (item) {
        var comp = item.isComponent ? item : item.target,
            layout = comp.componentLayout;

        if (!layout.pending && !layout.invalid && !layout.done) {
            this.queueLayout(layout);
        }

        layout = comp.layout;
        if (layout && !layout.pending && !layout.invalid && !layout.done) {
            this.queueLayout(layout);
        }
    },

    /**
     * Queues a layout for the next calculation cycle. This should not be called if the
     * layout is done, blocked or already in the queue. The only classes that should call
     * this method are this class and {@link Ext.layout.ContextItem}.
     *
     * @param {Ext.layout.Layout} layout The layout to add to the queue.
     * @private
     */
    queueLayout: function (layout) {
        this.layoutQueue.add(layout);
        layout.pending = true;
    },

    /**
     * Resets the given layout object. This is called at the start of the run and can also
     * be called during the run by calling {@link #invalidate}.
     */
    resetLayout: function (layout, ownerContext, firstTime) {
        var me = this,
            ownerCtContext;

        me.currentLayout = layout;

        layout.done = false;
        layout.pending = true;
        layout.firedTriggers = 0;

        me.layoutQueue.add(layout);

        if (firstTime) {
            me.layouts[layout.id] = layout; // track the layout for this run by its id
            layout.running = true;

            if (layout.finishedLayout) {
                me.finishQueue.add(layout);
            }

            // reset or update per-run counters:

            ++me.remainingLayouts;
            ++layout.layoutCount; // the number of whole layouts run for the layout

            layout.ownerContext = ownerContext;
            layout.beginCount = 0; // the number of beginLayout calls
            layout.blockCount = 0; // the number of blocks set for the layout
            layout.calcCount = 0; // the number of times calculate is called
            layout.triggerCount = 0; // the number of triggers set for the layout

            // Count the children of each ownerCt so we can tell when they are all done:
            if (layout.isComponentLayout && (ownerCtContext = ownerContext.ownerCtContext)) {
                // This layout's ownerCt is in this run... The component associated with
                // this layout (the "target") could be owned by the ownerCt's container
                // layout or component layout (e.g. docked items)! To manage this, we keep
                // two counters for these and one for the combined total:
                if (ownerContext.target.ownerLayout.isComponentLayout) {
                    ++ownerCtContext.remainingComponentChildLayouts;
                } else {
                    ++ownerCtContext.remainingContainerChildLayouts;
                }
                ++ownerCtContext.remainingChildLayouts;
            }

            if (!layout.initialized) {
                layout.initLayout();
            }

            layout.beginLayout(ownerContext);
        } else {
            ++layout.beginCount;

            if (!layout.running) {
                // back into the mahem with this one:
                ++me.remainingLayouts;
                layout.running = true;

                if (layout.isComponentLayout) {
                    // this one is fun... if we call setProp('done', false) that would still
                    // trigger/unblock layouts, but what layouts are really looking for with
                    // this property is for it to go to true, not just be set to a value...
                    ownerContext.unsetProp('done');

                    // On subsequent resets we increment the child layout count properties
                    // on ownerCtContext and clear 'childrenDone' and the appropriate other
                    // indicator as we transition to 1:
                    ownerCtContext = ownerContext.ownerCtContext;
                    if (ownerCtContext) {
                        if (ownerContext.target.ownerLayout.isComponentLayout) {
                            if (++ownerCtContext.remainingComponentChildLayouts == 1) {
                                ownerCtContext.unsetProp('componentChildrenDone');
                            }
                        } else {
                            if (++ownerCtContext.remainingContainerChildLayouts == 1) {
                                ownerCtContext.unsetProp('containerChildrenDone');
                            }
                        }
                        if (++ownerCtContext.remainingChildLayouts == 1) {
                            ownerCtContext.unsetProp('childrenDone');
                        }
                    }
                }

                // and it needs to be removed from the completion and/or finalize queues...
                me.completionQueue.remove(layout);
                me.finalizeQueue.remove(layout);
            }
        }

        layout.beginLayoutCycle(ownerContext, firstTime);
    },

    /**
     * Runs the layout calculations. This can be called only once on this object.
     * @return {Boolean} True if all layouts were completed, false if not.
     */
    run: function () {
        var me = this,
            flushed = false,
            watchDog = 100;

        me.flushInvalidates();

        me.state = 1;
        me.totalCount = me.layoutQueue.getCount();

        // We may start with unflushed data placed by beginLayout calls. Since layouts may
        // use setProp as a convenience, even in a write phase, we don't want to transition
        // to a read phase with unflushed data since we can write it now "cheaply". Also,
        // these value could easily be needed in the DOM in order to really get going with
        // the calculations. In particular, fixed (configured) dimensions fall into this
        // category.
        me.flush();

        // While we have layouts that have not completed...
        while ((me.remainingLayouts || me.invalidQueue.length) && watchDog--) {
            if (me.invalidQueue.length) {
                me.flushInvalidates();
            }

            // if any of them can run right now, run them
            if (me.runCycle()) {
                flushed = false; // progress means we probably need to flush something
                // but not all progress appears in the flushQueue (e.g. 'contentHeight')
            } else if (!flushed) {
                // as long as we are making progress, flush updates to the DOM and see if
                // that triggers or unblocks any layouts...
                me.flush();
                flushed = true; // all flushed now, so more progress is required

                me.flushLayouts('completionQueue', 'completeLayout');
            } else {
                // after a flush, we must make progress or something is WRONG
                me.state = 2;
                break;
            }

            if (!(me.remainingLayouts || me.invalidQueue.length)) {
                me.flush();
                me.flushLayouts('completionQueue', 'completeLayout');
                me.flushLayouts('finalizeQueue', 'finalizeLayout');
            }
        }

        return me.runComplete();
    },

    runComplete: function () {
        var me = this;

        me.state = 2;

        if (me.remainingLayouts) {
            me.handleFailure();
            return false;
        }

        me.flush();

        // Call finishedLayout on all layouts, but do not clear the queue.
        me.flushLayouts('finishQueue', 'finishedLayout', true);

        // Call notifyOwner on all layouts and then clear the queue.
        me.flushLayouts('finishQueue', 'notifyOwner');

        me.flush(); // in case any setProp calls were made

        me.flushAnimations();

        return true;
    },

    /**
     * Performs one layout cycle by calling each layout in the layout queue.
     * @return {Boolean} True if some progress was made, false if not.
     * @protected
     */
    runCycle: function () {
        var me = this,
            layouts = me.layoutQueue.clear(),
            length = layouts.length,
            i;

        ++me.cycleCount;

        // This value is incremented by ContextItem#setProp whenever new values are set
        // (thereby detecting forward progress):
        me.progressCount = 0;

        for (i = 0; i < length; ++i) {
            me.runLayout(me.currentLayout = layouts[i]);
        }

        me.currentLayout = null;

        return me.progressCount > 0;
    },

    /**
     * Runs one layout as part of a cycle.
     * @private
     */
    runLayout: function (layout) {
        var me = this,
            ownerContext = me.getCmp(layout.owner);

        layout.pending = false;

        if (ownerContext.state.blocks) {
            return;
        }

        // We start with the assumption that the layout will finish and if it does not, it
        // must clear this flag. It turns out this is much simpler than knowing when a layout
        // is done (100% correctly) when base classes and derived classes are collaborating.
        // Knowing that some part of the layout is not done is much more obvious.
        layout.done = true;

        ++layout.calcCount;
        ++me.calcCount;

        layout.calculate(ownerContext);

        if (layout.done) {
            me.layoutDone(layout);

            if (layout.completeLayout) {
                me.queueCompletion(layout);
            }
            if (layout.finalizeLayout) {
                me.queueFinalize(layout);
            }
        } else if (!layout.pending && !layout.invalid && !(layout.blockCount + layout.triggerCount - layout.firedTriggers)) {
            // A layout that is not done and has no blocks or triggers that will queue it
            // automatically, must be queued now:
            me.queueLayout(layout);
        }
    },

    /**
     * Set the size of a component, element or composite or an array of components or elements.
     * @param {Ext.Component/Ext.Component[]/Ext.dom.Element/Ext.dom.Element[]/Ext.dom.CompositeElement}
     * The item(s) to size.
     * @param {Number} width The new width to set (ignored if undefined or NaN).
     * @param {Number} height The new height to set (ignored if undefined or NaN).
     */
    setItemSize: function(item, width, height) {
        var items = item,
            len = 1,
            contextItem, i;

        // NOTE: we don't pre-check for validity because:
        //  - maybe only one dimension is valid
        //  - the diagnostics layer will track the setProp call to help find who is trying
        //      (but failing) to set a property
        //  - setProp already checks this anyway

        if (item.isComposite) {
            items = item.elements;
            len = items.length;
            item = items[0];
        } else if (!item.dom && !item.el) { // array by process of elimination
            len = items.length;
            item = items[0];
        }
        // else len = 1 and items = item (to avoid error on "items[++i]")

        for (i = 0; i < len; ) {
            contextItem = this.get(item);
            contextItem.setSize(width, height);

            item = items[++i]; // this accomodation avoids making an array of 1
        }
    }
});




/**
 * Component layout for components which maintain an inner body element which must be resized to synchronize with the
 * Component size.
 * @private
 */
Ext.define('Ext.layout.component.Body', {

    /* Begin Definitions */

    alias: ['layout.body'],

    extend: 'Ext.layout.component.Auto',

    /* End Definitions */

    type: 'body',

    beginLayout: function (ownerContext) {
        this.callParent(arguments);

        ownerContext.bodyContext = ownerContext.getEl('body');
    },

    // Padding is exciting here because we have 2 el's: owner.el and owner.body. Content
    // size always includes the padding of the targetEl, which should be owner.body. But
    // it is common to have padding on owner.el also (such as a panel header), so we need
    // to do some more padding work if targetContext is not owner.el. The base class has
    // already handled the ownerContext's frameInfo (border+framing) so all that is left
    // is padding.

    calculateOwnerHeightFromContentHeight: function (ownerContext, contentHeight) {
        var height = this.callParent(arguments);

        if (ownerContext.targetContext != ownerContext) {
            height += ownerContext.getPaddingInfo().height;
        }

        return height;
    },

    calculateOwnerWidthFromContentWidth: function (ownerContext, contentWidth) {
        var width = this.callParent(arguments);

        if (ownerContext.targetContext != ownerContext) {
            width += ownerContext.getPaddingInfo().width;
        }

        return width;
    },

    measureContentWidth: function (ownerContext) {
        return ownerContext.bodyContext.setWidth(ownerContext.bodyContext.el.dom.offsetWidth, false);
    },

    measureContentHeight: function (ownerContext) {
        return ownerContext.bodyContext.setHeight(ownerContext.bodyContext.el.dom.offsetHeight, false);
    },

    publishInnerHeight: function (ownerContext, height) {
        var innerHeight = height - ownerContext.getFrameInfo().height,
            targetContext = ownerContext.targetContext;

        if (targetContext != ownerContext) {
            innerHeight -= ownerContext.getPaddingInfo().height;
        }

        // return the value here, it may get used in a subclass
        return ownerContext.bodyContext.setHeight(innerHeight, !ownerContext.heightModel.natural);
    },

    publishInnerWidth: function (ownerContext, width) {
        var innerWidth = width - ownerContext.getFrameInfo().width,
            targetContext = ownerContext.targetContext;

        if (targetContext != ownerContext) {
            innerWidth -= ownerContext.getPaddingInfo().width;
        }

        ownerContext.bodyContext.setWidth(innerWidth, !ownerContext.widthModel.natural);
    }
});

/**
 * Component layout for {@link Ext.view.BoundList}.
 * @private
 */
Ext.define('Ext.layout.component.BoundList', {
    extend: 'Ext.layout.component.Auto',
    alias: 'layout.boundlist',

    type: 'component',
    
    beginLayout: function(ownerContext) {
        var me = this,
            owner = me.owner,
            toolbar = owner.pagingToolbar;

        me.callParent(arguments);
        
        if (owner.floating) {
            ownerContext.savedXY = owner.el.getXY();
            // move way offscreen to prevent any constraining
            owner.el.setXY([-9999, -9999]);
        }
        
        if (toolbar) {
            ownerContext.toolbarContext = ownerContext.context.getCmp(toolbar);
        }
        ownerContext.listContext = ownerContext.getEl('listEl');
    },
    
    beginLayoutCycle: function(ownerContext){
        var owner = this.owner;
        
        this.callParent(arguments);
        if (ownerContext.heightModel.auto) {
            // Set the el/listEl to be autoHeight since they may have been previously sized
            // by another layout process. If the el was at maxHeight first, the listEl will
            // always size to the maxHeight regardless of the content.
            owner.el.setHeight('auto');
            owner.listEl.setHeight('auto');
        }
    },

    getLayoutItems: function() {
        var toolbar = this.owner.pagingToolbar;
        return toolbar ? [toolbar] : [];
    },
    
    isValidParent: function() {
        // this only ever gets called with the toolbar, since it's rendered inside we
        // know the parent is always valid
        return true;
    },

    finishedLayout: function(ownerContext) {
        var xy = ownerContext.savedXY;
        
        this.callParent(arguments);
        if (xy) {
            this.owner.el.setXY(xy);
        }
    },
    
    measureContentWidth: function(ownerContext) {
        return this.owner.listEl.getWidth();
    },
    
    measureContentHeight: function(ownerContext) {
        return this.owner.listEl.getHeight();
    },
    
    publishInnerHeight: function(ownerContext, height) {
        var toolbar = ownerContext.toolbarContext,
            toolbarHeight = 0;
            
        if (toolbar) {
            toolbarHeight = toolbar.getProp('height');
        }
        
        if (toolbarHeight === undefined) {
            this.done = false;
        } else {
            ownerContext.listContext.setHeight(height - ownerContext.getFrameInfo().height - toolbarHeight);
        }
    },
    
    calculateOwnerHeightFromContentHeight: function(ownerContext){
        var height = this.callParent(arguments),
            toolbar = ownerContext.toolbarContext;
            
        if (toolbar) {
            height += toolbar.getProp('height');
        }
        return height;
    }
});
/**
 * Component layout for buttons
 * @private
 */
Ext.define('Ext.layout.component.Button', {

    /* Begin Definitions */

    alias: ['layout.button'],

    extend: 'Ext.layout.component.Auto',

    /* End Definitions */

    type: 'button',

    cellClsRE: /-btn-(tl|br)\b/,
    htmlRE: /<.*>/,

    constructor: function () {
        this.callParent(arguments);

        this.hackWidth = Ext.isIE && (!Ext.isStrict || Ext.isIE6 || Ext.isIE7 || Ext.isIE8);
        this.heightIncludesPadding = Ext.isIE6 && Ext.isStrict;
    },

    // TODO - use last run results if text has not changed?

    beginLayout: function (ownerContext) {
        this.callParent(arguments);

        this.cacheTargetInfo(ownerContext);
    },

    beginLayoutCycle: function(ownerContext) {
        var me = this,
            empty = '',
            owner = me.owner,
            btnEl = owner.btnEl,
            btnInnerEl = owner.btnInnerEl,
            text = owner.text,
            htmlAutoHeight;

        me.callParent(arguments);

        btnInnerEl.setStyle('overflow', empty);

        // Clear all element widths
        if (!ownerContext.widthModel.natural) {
            owner.el.setStyle('width', empty);
        }

        // If the text is HTML we need to let the browser automatically size things to cope with the case where the text
        // is multi-line. This incurs a cost as we then have to measure those elements to derive other sizes
        htmlAutoHeight = ownerContext.heightModel.shrinkWrap && text && me.htmlRE.test(text);

        btnEl.setStyle('width', empty);
        btnEl.setStyle('height', htmlAutoHeight ? 'auto' : empty);
        btnInnerEl.setStyle('width', empty);
        btnInnerEl.setStyle('height', htmlAutoHeight ? 'auto' : empty);
        btnInnerEl.setStyle('line-height', htmlAutoHeight ? 'normal' : empty);
        btnInnerEl.setStyle('padding-top', empty);
        owner.btnIconEl.setStyle('width', empty);
    },

    calculateOwnerHeightFromContentHeight: function (ownerContext, contentHeight) {
        return contentHeight;
    },

    calculateOwnerWidthFromContentWidth: function (ownerContext, contentWidth) {
        return contentWidth;
    },

    measureContentWidth: function (ownerContext) {
        var me = this,
            owner = me.owner,
            btnEl = owner.btnEl,
            btnInnerEl = owner.btnInnerEl,
            text = owner.text,
            btnFrameWidth, metrics, sizeIconEl, width, btnElContext, btnInnerElContext;

        // IE suffers from various sizing problems, usually caused by relying on it to size elements automatically. Even
        // if an element is sized correctly it can prove necessary to set that size explicitly on the element to get it
        // to size and position its children correctly. While the exact nature of the problems varies depending on the
        // browser version, doctype and button configuration there is a common solution: set the sizes manually.
        if (owner.text && me.hackWidth && btnEl) {
            btnFrameWidth = me.btnFrameWidth;

            // If the button text is something like '<' or '<<' then we need to escape it or it won't be measured
            // correctly. The button text is supposed to be HTML and strictly speaking '<' and '<<' aren't valid HTML.
            // However in practice they are commonly used and have worked 'correctly' in previous versions.
            if (text.indexOf('>') === -1) {
                text = text.replace(/</g, '&lt;');
            }

            metrics = Ext.util.TextMetrics.measure(btnInnerEl, text);

            width = metrics.width + btnFrameWidth + me.adjWidth;

            btnElContext = ownerContext.getEl('btnEl');
            btnInnerElContext = ownerContext.getEl('btnInnerEl');
            sizeIconEl = (owner.icon || owner.iconCls) && 
                    (owner.iconAlign == "top" || owner.iconAlign == "bottom");

            // This cheat works (barely) with publishOwnerWidth which calls setProp also
            // to publish the width. Since it is the same value we set here, the dirty bit
            // we set true will not be cleared by publishOwnerWidth.
            ownerContext.setWidth(width); // not setWidth (no framing)

            btnElContext.setWidth(metrics.width + btnFrameWidth);
            btnInnerElContext.setWidth(metrics.width + btnFrameWidth);

            if (sizeIconEl) {
                owner.btnIconEl.setWidth(metrics.width + btnFrameWidth);
            }
        } else {
            width = ownerContext.el.getWidth();
        }

        return width;
    },

    measureContentHeight: function (ownerContext) {
        var me = this,
            owner = me.owner,
            btnInnerEl = owner.btnInnerEl,
            btnItem = ownerContext.getEl('btnEl'),
            btnInnerItem = ownerContext.getEl('btnInnerEl'),
            minTextHeight = me.minTextHeight,
            adjHeight = me.adjHeight,
            text = owner.getText(),
            height,
            textHeight,
            topPadding;

        if (owner.vertical) {
            height = Ext.util.TextMetrics.measure(btnInnerEl, owner.text).width;
            height += me.btnFrameHeight + adjHeight;

            // Vertical buttons need height explicitly set
            ownerContext.setHeight(height, /*dirty=*/true, /*force=*/true);
        }
        else {
            // If the button text is HTML we have to handle it specially as it could contain multiple lines
            if (text && me.htmlRE.test(text)) {
                textHeight = btnInnerEl.getHeight();

                // HTML content doesn't guarantee multiple lines: in the single line case it could now be too short for the icon
                if (textHeight < minTextHeight) {
                    topPadding = Math.floor((minTextHeight - textHeight) / 2);

                    // Resize the span and use padding to center the text vertically. The hack to remove the padding
                    // from the height on IE6 is especially needed for link buttons
                    btnInnerItem.setHeight(minTextHeight - (me.heightIncludesPadding ? topPadding : 0));
                    btnInnerItem.setProp('padding-top', topPadding);

                    textHeight = minTextHeight;
                }

                // Calculate the height relative to the text span, auto can't be trusted in IE quirks
                height = textHeight + adjHeight;
            }
            else {
                height = ownerContext.el.getHeight();
            }
        }

        // IE quirks needs the button height setting using style or it won't position the icon correctly (even if the height was already correct)
        btnItem.setHeight(height - adjHeight);

        return height;
    },

    publishInnerHeight: function(ownerContext, height) {
        var me = this,
            owner = me.owner,
            isNum = Ext.isNumber,
            btnItem = ownerContext.getEl('btnEl'),
            btnInnerEl = owner.btnInnerEl,
            btnInnerItem = ownerContext.getEl('btnInnerEl'),
            btnHeight = isNum(height) ? height - me.adjHeight : height,
            btnFrameHeight = me.btnFrameHeight,
            text = owner.getText(),
            textHeight,
            paddingTop;

        btnItem.setHeight(btnHeight);
        btnInnerItem.setHeight(btnHeight);

        // Only need the line-height setting for regular, horizontal Buttons
        if (!owner.vertical && btnHeight >= 0) {
            btnInnerItem.setProp('line-height', btnHeight - btnFrameHeight + 'px');
        }

        // Button text may contain markup that would force it to wrap to more than one line (e.g. 'Button<br>Label').
        // When this happens, we cannot use the line-height set above for vertical centering; we instead reset the
        // line-height to normal, measure the rendered text height, and add padding-top to center the text block
        // vertically within the button's height. This is more expensive than the basic line-height approach so
        // we only do it if the text contains markup.
        if (text && me.htmlRE.test(text)) {
            btnInnerItem.setProp('line-height', 'normal');
            btnInnerEl.setStyle('line-height', 'normal');
            textHeight = Ext.util.TextMetrics.measure(btnInnerEl, text).height;
            paddingTop = Math.floor(Math.max(btnHeight - btnFrameHeight - textHeight, 0) / 2);
            btnInnerItem.setProp('padding-top', me.btnFrameTop + paddingTop);
            btnInnerItem.setHeight(btnHeight - (me.heightIncludesPadding ? paddingTop : 0));
        }
    },

    publishInnerWidth: function(ownerContext, width) {
        var me = this,
            isNum = Ext.isNumber,
            btnItem = ownerContext.getEl('btnEl'),
            btnInnerItem = ownerContext.getEl('btnInnerEl'),
            btnWidth = isNum(width) ? width - me.adjWidth : width;

        btnItem.setWidth(btnWidth);
        btnInnerItem.setWidth(btnWidth);
    },
    
    clearTargetCache: function(){
        delete this.adjWidth;    
    },

    cacheTargetInfo: function(ownerContext) {
        var me = this,
            owner = me.owner,
            scale = owner.scale,
            padding, frameSize, btnWrapPadding, btnInnerEl, innerFrameSize;

        // The cache is only valid for a particular scale
        if (!('adjWidth' in me) || me.lastScale !== scale) {
            // If there has been a previous layout run it could have sullied the line-height
            if (me.lastScale) {
                owner.btnInnerEl.setStyle('line-height', '');
            }

            me.lastScale = scale;

            padding = ownerContext.getPaddingInfo();
            frameSize = ownerContext.getFrameInfo();
            btnWrapPadding = ownerContext.getEl('btnWrap').getPaddingInfo();
            btnInnerEl = ownerContext.getEl('btnInnerEl');
            innerFrameSize = btnInnerEl.getPaddingInfo();

            Ext.apply(me, {
                // Width adjustment must take into account the arrow area. The btnWrap is the <em> which has padding to accommodate the arrow.
                adjWidth       : btnWrapPadding.width + frameSize.width + padding.width,
                adjHeight      : btnWrapPadding.height + frameSize.height + padding.height,
                btnFrameWidth  : innerFrameSize.width,
                btnFrameHeight : innerFrameSize.height,
                btnFrameTop    : innerFrameSize.top,

                // Use the line-height rather than height because if the text is multi-line then the height will be 'wrong'
                minTextHeight  : parseInt(btnInnerEl.getStyle('line-height'), 10)
            });
        }

        me.callParent(arguments);
    },
    
    finishedLayout: function(){
        var owner = this.owner;
        this.callParent(arguments);
        // Fixes issue EXTJSIV-5989. Looks like a browser repaint bug
        // This hack can be removed once it is resolved.
        if (Ext.isWebKit) {
            owner.el.dom.offsetWidth;
        }
    }
});

/**
 * This ComponentLayout handles docking for Panels. It takes care of panels that are
 * part of a ContainerLayout that sets this Panel's size and Panels that are part of
 * an AutoContainerLayout in which this panel get his height based of the CSS or
 * or its content.
 * @private
 */
Ext.define('Ext.layout.component.Dock', {

    /* Begin Definitions */

    extend: 'Ext.layout.component.Component',

    alias: 'layout.dock',

    alternateClassName: 'Ext.layout.component.AbstractDock',

    /* End Definitions */

    type: 'dock',

    initializedBorders: -1,

    horizontalCollapsePolicy: { width: true, x: true },

    verticalCollapsePolicy: { height: true, y: true },

    finishRender: function () {
        var me = this,
            target, items;

        me.callParent();

        target = me.getRenderTarget();
        items = me.getDockedItems();

        me.finishRenderItems(target, items);
    },

    isItemBoxParent: function (itemContext) {
        return true;
    },

    isItemShrinkWrap: function (item) {
        return true;
    },

    dockOpposites: {
        top: 'bottom',
        right: 'left',
        bottom: 'top',
        left: 'right'
    },

    handleItemBorders: function() {
        var me = this,
            owner = me.owner,
            borders, docked,
            oldBorders = me.borders,
            opposites = me.dockOpposites,
            currentGeneration = owner.dockedItems.generation,
            i, ln, item, dock, side, borderItem,
            collapsed = me.collapsed;

        if (me.initializedBorders == currentGeneration || (owner.border && !owner.manageBodyBorders)) {
            return;
        }

        me.initializedBorders = currentGeneration;

        // Borders have to be calculated using expanded docked item collection.
        me.collapsed = false;
        docked = me.getLayoutItems();
        me.collapsed = collapsed;

        borders = { top: [], right: [], bottom: [], left: [] };

        for (i = 0, ln = docked.length; i < ln; i++) {
            item = docked[i];
            dock = item.dock;

            if (item.ignoreBorderManagement) {
                continue;
            }

            if (!borders[dock].satisfied) {
                borders[dock].push(item);
                borders[dock].satisfied = true;
            }

            if (!borders.top.satisfied && opposites[dock] !== 'top') {
                borders.top.push(item);
            }
            if (!borders.right.satisfied && opposites[dock] !== 'right') {
                borders.right.push(item);
            }
            if (!borders.bottom.satisfied && opposites[dock] !== 'bottom') {
                borders.bottom.push(item);
            }
            if (!borders.left.satisfied && opposites[dock] !== 'left') {
                borders.left.push(item);
            }
        }

        if (oldBorders) {
            for (side in oldBorders) {
                if (oldBorders.hasOwnProperty(side)) {
                    ln = oldBorders[side].length;
                    if (!owner.manageBodyBorders) {
                        for (i = 0; i < ln; i++) {
                            borderItem = oldBorders[side][i];
                            if (!borderItem.isDestroyed) {
                                borderItem.removeCls(Ext.baseCSSPrefix + 'docked-noborder-' + side);
                            }
                        }
                        if (!oldBorders[side].satisfied && !owner.bodyBorder) {
                            owner.removeBodyCls(Ext.baseCSSPrefix + 'docked-noborder-' + side);
                        }
                    }
                    else if (oldBorders[side].satisfied) {
                        owner.setBodyStyle('border-' + side + '-width', '');
                    }
                }
            }
        }

        for (side in borders) {
            if (borders.hasOwnProperty(side)) {
                ln = borders[side].length;
                if (!owner.manageBodyBorders) {
                    for (i = 0; i < ln; i++) {
                        borders[side][i].addCls(Ext.baseCSSPrefix + 'docked-noborder-' + side);
                    }
                    if ((!borders[side].satisfied && !owner.bodyBorder) || owner.bodyBorder === false) {
                        owner.addBodyCls(Ext.baseCSSPrefix + 'docked-noborder-' + side);
                    }
                }
                else if (borders[side].satisfied) {
                    owner.setBodyStyle('border-' + side + '-width', '1px');
                }
            }
        }

        me.borders = borders;
    },

    beforeLayoutCycle: function (ownerContext) {
        var me = this,
            owner = me.owner,
            shrinkWrap = me.sizeModels.shrinkWrap,
            collapsedHorz, collapsedVert;

        if (owner.collapsed) {
            if (owner.collapsedVertical()) {
                collapsedVert = true;
                ownerContext.measureDimensions = 1;
            } else {
                collapsedHorz = true;
                ownerContext.measureDimensions = 2;
            }
        }

        ownerContext.collapsedVert = collapsedVert;
        ownerContext.collapsedHorz = collapsedHorz;

        // If we are collapsed, we want to auto-layout using the placeholder/expander
        // instead of the normal items/dockedItems. This must be done here since we could
        // be in a box layout w/stretchmax which sets the width/heightModel to allow it to
        // control the size.
        if (collapsedVert) {
            ownerContext.heightModel = shrinkWrap;
        } else if (collapsedHorz) {
            ownerContext.widthModel = shrinkWrap;
        }
    },

    beginLayout: function(ownerContext) {
        var me = this,
            owner = me.owner,
            docked = me.getLayoutItems(),
            layoutContext = ownerContext.context,
            dockedItemCount = docked.length,
            dockedItems, i, item, itemContext, offsets,
            collapsed;

        me.callParent(arguments);

        me.handleItemBorders();

        // Cache the children as ContextItems (like a Container). Also setup to handle
        // collapsed state:
        collapsed = owner.getCollapsed();
        if (collapsed !== me.lastCollapsedState && Ext.isDefined(me.lastCollapsedState)) {
            // If we are collapsing...
            if (me.owner.collapsed) {
                ownerContext.isCollapsingOrExpanding = 1;
                // Add the collapsed class now, so that collapsed CSS rules are applied before measurements are taken by the layout.
                owner.addClsWithUI(owner.collapsedCls);
            } else {
                ownerContext.isCollapsingOrExpanding = 2;
                // Remove the collapsed class now, before layout calculations are done.
                owner.removeClsWithUI(owner.collapsedCls);
                ownerContext.lastCollapsedState = me.lastCollapsedState;
            }
        }
        me.lastCollapsedState = collapsed;

        ownerContext.dockedItems = dockedItems = [];

        for (i = 0; i < dockedItemCount; i++) {
            item = docked[i];
            if (item.rendered) {
                itemContext = layoutContext.getCmp(item);
                itemContext.dockedAt = { x: 0, y: 0 };
                itemContext.offsets = offsets = Ext.Element.parseBox(item.offsets || {});
                offsets.width = offsets.left + offsets.right;
                offsets.height = offsets.top + offsets.bottom;
                dockedItems.push(itemContext);
            }
        }

        ownerContext.bodyContext = ownerContext.getEl('body');
    },

    beginLayoutCycle: function(ownerContext) {
        var me = this,
            docked = ownerContext.dockedItems,
            len = docked.length,
            owner = me.owner,
            frameBody = owner.frameBody,
            lastHeightModel = me.lastHeightModel,
            i, item, dock;

        me.callParent(arguments);

        if (lastHeightModel && lastHeightModel.shrinkWrap &&
                    !ownerContext.heightModel.shrinkWrap && !me.owner.manageHeight) {
            owner.body.dom.style.marginBottom = '';
        }

        if (ownerContext.widthModel.auto) {
            if (ownerContext.widthModel.shrinkWrap) {
                owner.el.setWidth(null);
            }
            owner.body.setWidth(null);
            if (frameBody) {
                frameBody.setWidth(null);
            }
        }
        if (ownerContext.heightModel.auto) {
            owner.body.setHeight(null);
            //owner.el.setHeight(null); Disable this for now
            if (frameBody) {
                frameBody.setHeight(null);
            }
        }

        // Each time we begin (2nd+ would be due to invalidate) we need to publish the
        // known contentWidth/Height if we are collapsed:
        if (ownerContext.collapsedVert) {
            ownerContext.setContentHeight(0);
        } else if (ownerContext.collapsedHorz) {
            ownerContext.setContentWidth(0);
        }

        // dock: 'right' items, when a panel gets narrower get "squished". Moving them to
        // left:0px avoids this!
        for (i = 0; i < len; i++) {
            item = docked[i].target;
            dock = item.dock;

            if (dock == 'right') {
                item.el.setLeft(0);
            } else if (dock != 'left') {
                continue;
            }

            // TODO - clear width/height?
        }
    },

    calculate: function (ownerContext) {
        var me = this,
            measure = me.measureAutoDimensions(ownerContext, ownerContext.measureDimensions),
            state = ownerContext.state,
            horzDone = state.horzDone,
            vertDone = state.vertDone,
            bodyContext = ownerContext.bodyContext,
            horz, vert, forward, backward;

        // make sure we can use these value w/o calling methods to get them
        ownerContext.borderInfo  || ownerContext.getBorderInfo();
        ownerContext.paddingInfo || ownerContext.getPaddingInfo();
        ownerContext.framingInfo || ownerContext.getFraming();
        bodyContext.borderInfo   || bodyContext.getBorderInfo();
        bodyContext.paddingInfo  || bodyContext.getPaddingInfo();

        // Start the axes so they are ready to proceed inwards (fixed-size) or outwards
        // (shrinkWrap) and stash key property names as well:
        horz = !horzDone &&
               me.createAxis(ownerContext, measure.contentWidth, ownerContext.widthModel,
                             'left', 'right', 'x', 'width', 'Width', ownerContext.collapsedHorz);
        vert = !vertDone &&
               me.createAxis(ownerContext, measure.contentHeight, ownerContext.heightModel,
                             'top', 'bottom', 'y', 'height', 'Height', ownerContext.collapsedVert);

        // We iterate forward and backward over the dockedItems at the same time based on
        // whether an axis is shrinkWrap or fixed-size. For a fixed-size axis, the outer box
        // axis is allocated to docked items in forward order and is reduced accordingly.
        // To handle a shrinkWrap axis, the box starts at the inner (body) size and is used to
        // size docked items in backwards order. This is because the last docked item shares
        // an edge with the body. The item size is used to adjust the shrinkWrap axis outwards
        // until the first docked item (at the outermost edge) is processed. This backwards
        // order ensures that docked items never get an incorrect size for any dimension.
        for (forward = 0, backward = ownerContext.dockedItems.length; backward--; ++forward) {
            if (horz) {
                me.dockChild(ownerContext, horz, backward, forward);
            }
            if (vert) {
                me.dockChild(ownerContext, vert, backward, forward);
            }
        }

        if (horz && me.finishAxis(ownerContext, horz)) {
            state.horzDone = horzDone = horz;
        }

        if (vert && me.finishAxis(ownerContext, vert)) {
            state.vertDone = vertDone = vert;
        }

        // Once all items are docked, the final size of the outer panel or inner body can
        // be determined. If we can determine both width and height, we are done.
        if (horzDone && vertDone && me.finishConstraints(ownerContext, horzDone, vertDone)) {
            // Size information is published as we dock items but position is hard to do
            // that way (while avoiding published multiple times) so we publish all the
            // positions at the end.
            me.finishPositions(ownerContext, horzDone, vertDone);
        } else {
            me.done = false;
        }
    },

    /**
     * Creates an axis object given the particulars.
     * @private
     */
    createAxis: function (ownerContext, contentSize, sizeModel, dockBegin, dockEnd, posProp,
                          sizeProp, sizePropCap, collapsedAxis) {
        var begin = 0,
            owner = this.owner,
            maxSize = owner['max' + sizePropCap],
            minSize = owner['min' + sizePropCap] || 0,
            hasMaxSize = maxSize != null, // exactly the same as "maxSize !== null && maxSize !== undefined"
            setSize = 'set' + sizePropCap,
            border, bodyContext, frameSize, padding, end;

        if (sizeModel.shrinkWrap) {
            // End position before adding docks around the content is content size plus the body borders in this axis.
            // If collapsed in this axis, the body borders will not be shown.
            if (collapsedAxis) {
                end = 0;
            } else {
                bodyContext = ownerContext.bodyContext;
                end = contentSize + bodyContext.borderInfo[sizeProp];
            }
        } else {
            border    = ownerContext.borderInfo;
            frameSize = ownerContext.framingInfo;
            padding   = ownerContext.paddingInfo;

            end = ownerContext.getProp(sizeProp);
            end -= border[dockEnd] + padding[dockEnd] + frameSize[dockEnd];

            begin = border[dockBegin] + padding[dockBegin] + frameSize[dockBegin];
        }

        return {
            shrinkWrap: sizeModel.shrinkWrap,
            sizeModel: sizeModel,
            // An axis tracks start and end+1 px positions. eg 0 to 10 for 10px high
            begin: begin,
            end: end,
            collapsed: collapsedAxis,
            horizontal: posProp == 'x',
            ignoreFrameBegin: false,
            ignoreFrameEnd: false,
            initialSize: end - begin,
            hasMinMaxConstraints: (minSize || hasMaxSize) && sizeModel.shrinkWrap,
            minSize: minSize,
            maxSize: hasMaxSize ? maxSize : 1e9,
            bodyPosProp: this.owner.manageHeight ? posProp : ('margin-' + dockBegin), // 'margin-left' or 'margin-top'
            dockBegin: dockBegin,    // 'left' or 'top'
            dockEnd: dockEnd,        // 'right' or 'end'
            posProp: posProp,        // 'x' or 'y'
            sizeProp: sizeProp,      // 'width' or 'height'
            sizePropCap: sizePropCap, // 'Width' or 'Height'
            setSize: setSize,
            dockedPixelsEnd: 0
        };
    },

    /**
     * Docks a child item on the specified axis. This boils down to determining if the item
     * is docked at the "beginning" of the axis ("left" if horizontal, "top" if vertical),
     * the "end" of the axis ("right" if horizontal, "bottom" if vertical) or stretches
     * along the axis ("top" or "bottom" if horizontal, "left" or "right" if vertical). It
     * also has to differentiate between fixed and shrinkWrap sized dimensions.
     * @private
     */
    dockChild: function (ownerContext, axis, backward, forward) {
        var me = this,
            itemContext = ownerContext.dockedItems[axis.shrinkWrap ? backward : forward],
            item = itemContext.target,
            dock = item.dock, // left/top/right/bottom
            pos;

        if(item.ignoreParentFrame && ownerContext.isCollapsingOrExpanding) {
            // collapsed window header margins may differ from expanded window header margins
            // so we need to make sure the old cached values are not used in axis calculations
            itemContext.clearMarginCache();
        }

        if (dock == axis.dockBegin) {
            if (axis.shrinkWrap) {
                pos = me.dockOutwardBegin(ownerContext, itemContext, item, axis);
            } else {
                pos = me.dockInwardBegin(ownerContext, itemContext, item, axis);
            }
        } else if (dock == axis.dockEnd) {
            if (axis.shrinkWrap) {
                pos = me.dockOutwardEnd(ownerContext, itemContext, item, axis);
            } else {
                pos = me.dockInwardEnd(ownerContext, itemContext, item, axis);
            }
        } else {
            pos = me.dockStretch(ownerContext, itemContext, item, axis);
        }

        itemContext.dockedAt[axis.posProp] = pos;
    },

    /**
     * Docks an item on a fixed-size axis at the "beginning". The "beginning" of the horizontal
     * axis is "left" and the vertical is "top". For a fixed-size axis, the size works from
     * the outer element (the panel) towards the body.
     * @private
     */
    dockInwardBegin: function (ownerContext, itemContext, item, axis) {
        var pos = axis.begin,
            sizeProp = axis.sizeProp,
            size, 
            dock;

        if (item.ignoreParentFrame) {
            dock = item.dock;
            pos -= ownerContext.borderInfo[dock] + ownerContext.paddingInfo[dock] +
                   ownerContext.framingInfo[dock];
        }

        if (!item.overlay) {
            size = itemContext.getProp(sizeProp) + itemContext.getMarginInfo()[sizeProp];
            axis.begin += size;
        }

        return pos;
    },

    /**
     * Docks an item on a fixed-size axis at the "end". The "end" of the horizontal axis is
     * "right" and the vertical is "bottom".
     * @private
     */
    dockInwardEnd: function (ownerContext, itemContext, item, axis) {
        var sizeProp = axis.sizeProp,
            size = itemContext.getProp(sizeProp) + itemContext.getMarginInfo()[sizeProp],
            pos = axis.end - size;

        if (!item.overlay) {
            axis.end = pos;
        }

        if (item.ignoreParentFrame) {
            pos += ownerContext.borderInfo[item.dock] + ownerContext.paddingInfo[item.dock] +
                   ownerContext.framingInfo[item.dock];
        }

        return pos;
    },

    /**
     * Docks an item on a shrinkWrap axis at the "beginning". The "beginning" of the horizontal
     * axis is "left" and the vertical is "top". For a shrinkWrap axis, the size works from
     * the body outward to the outermost element (the panel).
     * 
     * During the docking process, coordinates are allowed to be negative. We start with the
     * body at (0,0) so items docked "top" or "left" will simply be assigned negative x/y. In
     * the {@link #finishPositions} method these are corrected and framing is added. This way
     * the correction is applied as a simple translation of delta x/y on all coordinates to
     * bring the origin back to (0,0).
     * @private
     */
    dockOutwardBegin: function (ownerContext, itemContext, item, axis) {
        var pos = axis.begin,
            sizeProp = axis.sizeProp,
            dock, size;

        if (axis.collapsed) {
            axis.ignoreFrameBegin = axis.ignoreFrameEnd = true;
        } else if (item.ignoreParentFrame) {
            dock = item.dock;
            pos -= ownerContext.borderInfo[dock] + ownerContext.paddingInfo[dock] +
                   ownerContext.framingInfo[dock];

            axis.ignoreFrameBegin = true;
        }

        if (!item.overlay) {
            size = itemContext.getProp(sizeProp) + itemContext.getMarginInfo()[sizeProp];
            pos -= size;
            axis.begin = pos;
        }

        return pos;
    },

    /**
     * Docks an item on a shrinkWrap axis at the "end". The "end" of the horizontal axis is
     * "right" and the vertical is "bottom".
     * @private
     */
    dockOutwardEnd: function (ownerContext, itemContext, item, axis) {
        var pos = axis.end,
            sizeProp = axis.sizeProp,
            dock, size;

        size = itemContext.getProp(sizeProp) + itemContext.getMarginInfo()[sizeProp];

        if (axis.collapsed) {
            axis.ignoreFrameBegin = axis.ignoreFrameEnd = true;
        } else if (item.ignoreParentFrame) {
            dock = item.dock;
            pos += ownerContext.borderInfo[dock] + ownerContext.paddingInfo[dock] +
                   ownerContext.framingInfo[dock];

            axis.ignoreFrameEnd = true;
        }

        if (!item.overlay) {
            axis.end = pos + size;
            axis.dockedPixelsEnd += size;
        }

        return pos;
    },

    /**
     * Docks an item that might stretch across an axis. This is done for dock "top" and
     * "bottom" items on the horizontal axis and dock "left" and "right" on the vertical.
     * @private
     */
    dockStretch: function (ownerContext, itemContext, item, axis) {
        var dock = item.dock, // left/top/right/bottom (also used to index padding/border)
            sizeProp = axis.sizeProp, // 'width' or 'height'
            horizontal = dock == 'top' || dock == 'bottom',
            offsets = itemContext.offsets,
            border = ownerContext.borderInfo,
            padding = ownerContext.paddingInfo,
            endProp = horizontal ? 'right' : 'bottom',
            startProp = horizontal ? 'left' : 'top',
            pos = axis.begin + offsets[startProp],
            margin, size, framing;

        if (item.stretch !== false) {
            size = axis.end - pos - offsets[endProp];

            if (item.ignoreParentFrame) {
                framing = ownerContext.framingInfo;
                pos -= border[startProp] + padding[startProp] + framing[startProp];
                size += border[sizeProp] + padding[sizeProp] + framing[sizeProp];
            }

            margin = itemContext.getMarginInfo();
            size -= margin[sizeProp];

            itemContext[axis.setSize](size);
        }

        return pos;
    },

    /**
     * Finishes the calculation of an axis by determining its size. In non-shrink-wrap
     * cases, this is also where we set the body size.
     * @private
     */
    finishAxis: function (ownerContext, axis) {
        var size = axis.end - axis.begin,
            setSizeMethod = axis.setSize,
            beginName = axis.dockBegin, // left or top
            endName = axis.dockEnd, // right or bottom
            border = ownerContext.borderInfo,
            padding = ownerContext.paddingInfo,
            framing = ownerContext.framingInfo,
            frameSize = padding[beginName] + border[beginName] + framing[beginName],
            bodyContext = ownerContext.bodyContext,
            bodyPos, bodySize, dirty;

        if (axis.shrinkWrap) {
            // Since items docked left/top on a shrinkWrap axis go into negative coordinates,
            // we apply a delta to all coordinates to adjust their relative origin back to
            // (0,0).
            axis.delta = -axis.begin;  // either 0 or a positive number

            bodySize = axis.initialSize;

            if (axis.ignoreFrameBegin) {
                axis.delta -= border[beginName];
                bodyPos = -axis.begin - frameSize;
            } else {
                size += frameSize;
                axis.delta += padding[beginName] + framing[beginName];
                bodyPos = -axis.begin;
            }

            if (!axis.ignoreFrameEnd) {
                size += padding[endName] + border[endName] + framing[endName];
            }

            axis.size = size; // we have to wait for min/maxWidth/Height processing

            if (!axis.horizontal && !this.owner.manageHeight) {
                // the height of the bodyEl will give the proper height to the outerEl so
                // we don't need to set heights in the DOM
                dirty = false;
            }
        } else {
            // For a fixed-size axis, we started at the outer box and already have the
            // proper origin... almost... except for the owner's border.
            axis.delta = -border[axis.dockBegin]; // 'left' or 'top'

            // Body size is remaining space between ends of Axis.
            bodySize = size;
            bodyPos = axis.begin - frameSize;
        }

        bodyContext[setSizeMethod](bodySize, dirty);
        bodyContext.setProp(axis.bodyPosProp, bodyPos);

        return !isNaN(size);
    },

    /**
     * Finishes processing of each axis by applying the min/max size constraints.
     * @private
     */
    finishConstraints: function (ownerContext, horz, vert) {
        var sizeModels = this.sizeModels,
            publishWidth = horz.shrinkWrap,
            publishHeight = vert.shrinkWrap,
            dirty, height, width, heightModel, widthModel, size;

        if (publishWidth) {
            size = horz.size;

            if (size < horz.minSize) {
                widthModel = sizeModels.constrainedMin;
                width = horz.minSize;
            } else if (size > horz.maxSize) {
                widthModel = sizeModels.constrainedMax;
                width = horz.maxSize;
            } else {
                width = size;
            }
        }

        if (publishHeight) {
            size = vert.size;

            if (size < vert.minSize) {
                heightModel = sizeModels.constrainedMin;
                height = vert.minSize;
            } else if (size > vert.maxSize) {
                heightModel = sizeModels.constrainedMax;
                height = vert.maxSize;
            } else {
                if (!ownerContext.collapsedVert && !this.owner.manageHeight) {
                    // height of the outerEl is provided by the height (including margins)
                    // of the bodyEl, so this value does not need to be written to the DOM
                    dirty = false;

                    // so long as we set top and bottom margins on the bodyEl!
                    ownerContext.bodyContext.setProp('margin-bottom', vert.dockedPixelsEnd);
                }

                height = size;
            }
        }

        // Handle the constraints...

        if (widthModel || heightModel) {
            // See ContextItem#init for an analysis of why this case is special. Basically,
            // in this case, we only know the width and the height could be anything.
            if (widthModel && heightModel &&
                        widthModel.constrainedMax &&  heightModel.constrainedMin) {
                ownerContext.invalidate({ widthModel: widthModel });
                return false;
            }

            // To process a width or height other than that to which we have shrinkWrapped,
            // we need to invalidate our component and carry forward w/these constrains...
            // unless the ownerLayout wants these results and will invalidate us anyway.
            if (!ownerContext.widthModel.calculatedFromShrinkWrap &&
                        !ownerContext.heightModel.calculatedFromShrinkWrap) {
                // nope, just us to handle the constraint...
                ownerContext.invalidate({ widthModel: widthModel, heightModel: heightModel });
                return false;
            }

            // We have a constraint to deal with, so we just adjust the size models and
            // allow the ownerLayout to invalidate us with its contribution to our final
            // size...
        }

        // we only publish the sizes if we are not invalidating the result...

        if (publishWidth) {
            ownerContext.setWidth(width);
            if (widthModel) {
                ownerContext.widthModel = widthModel; // important to the ownerLayout
            }
        }
        if (publishHeight) {
            ownerContext.setHeight(height, dirty);
            if (heightModel) {
                ownerContext.heightModel = heightModel; // important to the ownerLayout
            }
        }

        return true;
    },

    /**
     * Finishes the calculation by setting positions on the body and all of the items.
     * @private
     */
    finishPositions: function (ownerContext, horz, vert) {
        var dockedItems = ownerContext.dockedItems,
            length = dockedItems.length,
            deltaX = horz.delta,
            deltaY = vert.delta,
            index, itemContext;

        for (index = 0; index < length; ++index) {
            itemContext = dockedItems[index];

            itemContext.setProp('x', deltaX + itemContext.dockedAt.x);
            itemContext.setProp('y', deltaY + itemContext.dockedAt.y);
        }
    },

    finishedLayout: function(ownerContext) {
        var me = this,
            target = ownerContext.target;

        me.callParent(arguments);

        if (!ownerContext.animatePolicy) {
            if (ownerContext.isCollapsingOrExpanding === 1) {
                target.afterCollapse(false);
            } else if (ownerContext.isCollapsingOrExpanding === 2) {
                target.afterExpand(false);
            }
        }
    },

    getAnimatePolicy: function(ownerContext) {
        var me = this,
            lastCollapsedState, policy;

        if (ownerContext.isCollapsingOrExpanding == 1) {
            lastCollapsedState = me.lastCollapsedState;
        } else if (ownerContext.isCollapsingOrExpanding == 2) {
            lastCollapsedState = ownerContext.lastCollapsedState;
        }

        if (lastCollapsedState == 'left' || lastCollapsedState == 'right') {
            policy = me.horizontalCollapsePolicy;
        } else if (lastCollapsedState == 'top' || lastCollapsedState == 'bottom') {
            policy = me.verticalCollapsePolicy;
        }

        return policy;
    },

    /**
     * Retrieve an ordered and/or filtered array of all docked Components.
     * @param {String} [order='render'] The desired ordering of the items ('render' or 'visual').
     * @param {Boolean} [beforeBody] An optional flag to limit the set of items to only those
     *  before the body (true) or after the body (false). All components are returned by
     *  default.
     * @return {Ext.Component[]} An array of components.
     * @protected
     */
    getDockedItems: function(order, beforeBody) {
        var me = this,
            renderedOnly = (order === 'visual'),
            all = renderedOnly ? Ext.ComponentQuery.query('[rendered]', me.owner.dockedItems.items) : me.owner.dockedItems.items,
            sort = all && all.length && order !== false,
            renderOrder,
            dock, dockedItems, i, isBefore, length;

        if (beforeBody == null) {
            dockedItems = sort && !renderedOnly ? all.slice() : all;
        } else {
            dockedItems = [];

            for (i = 0, length = all.length; i < length; ++i) {
                dock = all[i].dock;
                isBefore = (dock == 'top' || dock == 'left');
                if (beforeBody ? isBefore : !isBefore) {
                    dockedItems.push(all[i]);
                }
            }

            sort = sort && dockedItems.length;
        }

        if (sort) {
            renderOrder = (order = order || 'render') == 'render';
            Ext.Array.sort(dockedItems, function(a, b) {
                var aw,
                    bw;

                // If the two items are on opposite sides of the body, they must not be sorted by any weight value:
                // For rendering purposes, left/top *always* sorts before right/bottom
                if (renderOrder && ((aw = me.owner.dockOrder[a.dock]) !== (bw = me.owner.dockOrder[b.dock]))) {

                    // The two dockOrder values cancel out when two items are on opposite sides.
                    if (!(aw + bw)) {
                        return aw - bw;
                    }
                }

                aw = me.getItemWeight(a, order);
                bw = me.getItemWeight(b, order);
                if ((aw !== undefined) && (bw !== undefined)) {
                    return aw - bw;
                }
                return 0;
            });
        }

        return dockedItems || [];
    },

    getItemWeight: function (item, order) {
        var weight = item.weight || this.owner.defaultDockWeights[item.dock];
        return weight[order] || weight;
    },

    /**
     * @protected
     * Returns an array containing all the **visible** docked items inside this layout's owner Panel
     * @return {Array} An array containing all the **visible** docked items of the Panel
     */
    getLayoutItems : function() {
        var me = this,
            items,
            itemCount,
            item,
            i,
            result;

        if (me.owner.collapsed) {
            result = me.owner.getCollapsedDockedItems();
        } else {
            items = me.getDockedItems('visual');
            itemCount = items.length;
            result = [];
            for (i = 0; i < itemCount; i++) {
                item = items[i];
                if (!item.hidden) {
                    result.push(item);
                }
            }
        }
        return result;
    },

    // Content size includes padding but not borders, so subtract them off
    measureContentWidth: function (ownerContext) {
        var bodyContext = ownerContext.bodyContext;
        return bodyContext.el.getWidth() - bodyContext.getBorderInfo().width;
    },

    measureContentHeight: function (ownerContext) {
        var bodyContext = ownerContext.bodyContext;
        return bodyContext.el.getHeight() - bodyContext.getBorderInfo().height;
    },
    
    redoLayout: function(ownerContext) {
        var me = this,
            owner = me.owner;
        
        // If we are collapsing...
        if (ownerContext.isCollapsingOrExpanding == 1) {
            if (owner.reExpander) {
                owner.reExpander.el.show();
            }
            // Add the collapsed class now, so that collapsed CSS rules are applied before measurements are taken by the layout.
            owner.addClsWithUI(owner.collapsedCls);
            ownerContext.redo(true);
        } else if (ownerContext.isCollapsingOrExpanding == 2) {
            // Remove the collapsed class now, before layout calculations are done.
            owner.removeClsWithUI(owner.collapsedCls);
            ownerContext.bodyContext.redo();
        } 
    },

    // @private override inherited.
    // We need to render in the correct order, top/left before bottom/right
    renderChildren: function() {
        var me = this,
            items = me.getDockedItems(),
            target = me.getRenderTarget();

        me.renderItems(items, target);
    },

    /**
     * @protected
     * Render the top and left docked items before any existing DOM nodes in our render target,
     * and then render the right and bottom docked items after. This is important, for such things
     * as tab stops and ARIA readers, that the DOM nodes are in a meaningful order.
     * Our collection of docked items will already be ordered via Panel.getDockedItems().
     */
    renderItems: function(items, target) {
        var me = this,
            dockedItemCount = items.length,
            itemIndex = 0,
            correctPosition = 0,
            staticNodeCount = 0,
            targetNodes = me.getRenderTarget().dom.childNodes,
            targetChildCount = targetNodes.length,
            i, j, targetChildNode, item;

        // Calculate the number of DOM nodes in our target that are not our docked items
        for (i = 0, j = 0; i < targetChildCount; i++) {
            targetChildNode = targetNodes[i];
            if (Ext.fly(targetChildNode).hasCls('x-resizable-handle')) {
                break;
            }
            for (j = 0; j < dockedItemCount; j++) {
                item = items[j];
                if (item.rendered && item.el.dom === targetChildNode) {
                    break;
                }
            }
            // Walked off the end of the docked items without matching the found child node;
            // Then it's a static node.
            if (j === dockedItemCount) {
                staticNodeCount++;
            }
        }

        // Now we go through our docked items and render/move them
        for (; itemIndex < dockedItemCount; itemIndex++, correctPosition++) {
            item = items[itemIndex];

            // If we're now at the first right/bottom docked item, we jump over the body element.
            //
            // TODO: This is affected if users provide custom weight values to their
            // docked items, which puts it out of (t,l,r,b) order. Avoiding a second
            // sort operation here, for now, in the name of performance. getDockedItems()
            // needs the sort operation not just for this layout-time rendering, but
            // also for getRefItems() to return a logical ordering (FocusManager, CQ, et al).
            if (itemIndex === correctPosition && (item.dock === 'right' || item.dock === 'bottom')) {
                correctPosition += staticNodeCount;
            }

            // Same logic as Layout.renderItems()
            if (item && !item.rendered) {
                me.renderItem(item, target, correctPosition);
            }
            else if (!me.isValidParent(item, target, correctPosition)) {
                me.moveItem(item, target, correctPosition);
            }
        }
    },

    undoLayout: function(ownerContext) {
        var me = this,
            owner = me.owner;
        
        // If we are collapsing...
        if (ownerContext.isCollapsingOrExpanding == 1) {

            // We do not want to see the re-expander header until the final collapse is complete
            if (owner.reExpander) {
                owner.reExpander.el.hide();
            }
            // Add the collapsed class now, so that collapsed CSS rules are applied before measurements are taken by the layout.
            owner.removeClsWithUI(owner.collapsedCls);
            ownerContext.undo(true);
        } else if (ownerContext.isCollapsingOrExpanding == 2) {
            // Remove the collapsed class now, before layout calculations are done.
            owner.addClsWithUI(owner.collapsedCls);
            ownerContext.bodyContext.undo();
        } 
    },

    sizePolicy: {
        nostretch: {
            setsWidth: 0,
            setsHeight: 0
        },
        stretchH: {
            setsWidth: 1,
            setsHeight: 0
        },
        stretchV: {
            setsWidth: 0,
            setsHeight: 1
        },

        // Circular dependency with partial auto-sized panels:
        //
        // If we have an autoHeight docked item being stretched horizontally (top/bottom),
        // that stretching will determine its width and its width must be set before its
        // autoHeight can be determined. If that item is docked in an autoWidth panel, the
        // body will need its height set before it can determine its width, but the height
        // of the docked item is needed to subtract from the panel height in order to set
        // the body height.
        //
        // This same pattern occurs with autoHeight panels with autoWidth docked items on
        // left or right. If the panel is fully auto or fully fixed, these problems don't
        // come up because there is no dependency between the dimensions.
        //
        // Cutting the Gordian Knot: In these cases, we have to allow something to measure
        // itself without full context. This is OK as long as the managed dimension doesn't
        // effect the auto-dimension, which is often the case for things like toolbars. The
        // managed dimension only effects overflow handlers and such and does not change the
        // auto-dimension. To encourage the item to measure itself without waiting for the
        // managed dimension, we have to tell it that the layout will also be reading that
        // dimension. This is similar to how stretchmax works.

        autoStretchH: {
            readsWidth: 1,
            setsWidth: 1,
            setsHeight: 0
        },
        autoStretchV: {
            readsHeight: 1,
            setsWidth: 0,
            setsHeight: 1
        }
    },

    getItemSizePolicy: function (item) {
        var policy = this.sizePolicy,
            dock, vertical;

        if (item.stretch === false) {
            return policy.nostretch;
        }

        dock = item.dock;
        vertical = (dock == 'left' || dock == 'right');

        /*
        owner = this.owner;
        autoWidth = !owner.isFixedWidth();
        autoHeight = !owner.isFixedHeight();
        if (autoWidth !== autoHeight) { // if (partial auto)
            // see above...
            if (vertical) {
                if (autoHeight) {
                    return policy.autoStretchV;
                }
            } else if (autoWidth) {
                return policy.autoStretchH;
            }
        }*/

        if (vertical) {
            return policy.stretchV;
        }

        return policy.stretchH;
    },

    /**
     * @protected
     * We are overriding the Ext.layout.Layout configureItem method to also add a class that
     * indicates the position of the docked item. We use the itemCls (x-docked) as a prefix.
     * An example of a class added to a dock: right item is x-docked-right
     * @param {Ext.Component} item The item we are configuring
     */
    configureItem : function(item, pos) {
        this.callParent(arguments);

        item.addCls(Ext.baseCSSPrefix + 'docked');
        item.addClsWithUI('docked-' + item.dock);
    },

    afterRemove : function(item) {
        this.callParent(arguments);
        if (this.itemCls) {
            item.el.removeCls(this.itemCls + '-' + item.dock);
        }
        var dom = item.el.dom;

        if (!item.destroying && dom) {
            dom.parentNode.removeChild(dom);
        }
        this.childrenChanged = true;
    }
});

/**
 * Component layout for Ext.form.FieldSet components
 * @private
 */
Ext.define('Ext.layout.component.FieldSet', {
    extend: 'Ext.layout.component.Body',
    alias: ['layout.fieldset'],

    type: 'fieldset',

    beforeLayoutCycle: function (ownerContext) {
        if (ownerContext.target.collapsed) {
            ownerContext.heightModel = this.sizeModels.shrinkWrap;
        }
    },

    beginLayoutCycle: function (ownerContext) {
        var target = ownerContext.target,
            lastSize;

        this.callParent(arguments);

        // Each time we begin (2nd+ would be due to invalidate) we need to publish the
        // known contentHeight if we are collapsed:
        //
        if (target.collapsed) {
            ownerContext.setContentHeight(0);

            // If we are also shrinkWrap width, we must provide a contentWidth (since the
            // container layout is not going to run).
            //
            if (ownerContext.widthModel.shrinkWrap) {
                lastSize = target.lastComponentSize;
                ownerContext.setContentWidth((lastSize && lastSize.contentWidth) || 100);
            }
        }
    },

    calculateOwnerHeightFromContentHeight: function (ownerContext, contentHeight) {
        var border = ownerContext.getBorderInfo(),
            legend = ownerContext.target.legend;
            
        // Height of fieldset is content height plus top border width (which is either the legend height or top border width) plus bottom border width
        return ownerContext.getProp('contentHeight') + ownerContext.getPaddingInfo().height + (legend ? legend.getHeight() : border.top) + border.bottom;
    },

    publishInnerHeight: function (ownerContext, height) {
        // Subtract the legend off here and pass it up to the body
        // We do this because we don't want to set an incorrect body height
        // and then setting it again with the correct value
        var legend = ownerContext.target.legend;
        if (legend) {
            height -= legend.getHeight();
        }
        this.callParent([ownerContext, height]);
    },

    getLayoutItems : function() {
        var legend = this.owner.legend;
        if (legend) {
            return [legend];
        }
        return [];
    }
});
/**
 * @private
 */
Ext.define('Ext.layout.component.ProgressBar', {

    /* Begin Definitions */

    alias: ['layout.progressbar'],

    extend: 'Ext.layout.component.Auto',

    /* End Definitions */

    type: 'progressbar',

    beginLayout: function (ownerContext) {
        var me = this,
            i, textEls;

        me.callParent(arguments);

        if (!ownerContext.textEls) {
            textEls = me.owner.textEl; // an Ext.Element or CompositeList (raw DOM el's)

            if (textEls.isComposite) {
                ownerContext.textEls = [];
                textEls = textEls.elements;
                for (i = textEls.length; i--; ) {
                    ownerContext.textEls[i] = ownerContext.getEl(Ext.get(textEls[i]));
                }
            } else {
                ownerContext.textEls = [ ownerContext.getEl('textEl') ];
            }
        }
    },

    calculate: function(ownerContext) {
        var me = this,
            i, textEls, width;

        me.callParent(arguments);

        if (Ext.isNumber(width = ownerContext.getProp('width'))) {
            width -= ownerContext.getBorderInfo().width;
            textEls = ownerContext.textEls;

            for (i = textEls.length; i--; ) {
                textEls[i].setWidth(width);
            }
        } else {
            me.done = false;
        }
    }
});

/**
 * An updateable progress bar component. The progress bar supports two different modes: manual and automatic.
 *
 * In manual mode, you are responsible for showing, updating (via {@link #updateProgress}) and clearing the progress bar
 * as needed from your own code. This method is most appropriate when you want to show progress throughout an operation
 * that has predictable points of interest at which you can update the control.
 *
 * In automatic mode, you simply call {@link #wait} and let the progress bar run indefinitely, only clearing it once the
 * operation is complete. You can optionally have the progress bar wait for a specific amount of time and then clear
 * itself. Automatic mode is most appropriate for timed operations or asynchronous operations in which you have no need
 * for indicating intermediate progress.
 *
 *     @example
 *     var p = Ext.create('Ext.ProgressBar', {
 *        renderTo: Ext.getBody(),
 *        width: 300
 *     });
 *
 *     // Wait for 5 seconds, then update the status el (progress bar will auto-reset)
 *     p.wait({
 *         interval: 500, //bar will move fast!
 *         duration: 50000,
 *         increment: 15,
 *         text: 'Updating...',
 *         scope: this,
 *         fn: function(){
 *             p.updateText('Done!');
 *         }
 *     });
 */
Ext.define('Ext.ProgressBar', {
    extend: 'Ext.Component',
    alias: 'widget.progressbar',

    requires: [
        'Ext.Template',
        'Ext.CompositeElement',
        'Ext.TaskManager',
        'Ext.layout.component.ProgressBar'
    ],

    uses: ['Ext.fx.Anim'],

   /**
    * @cfg {Number} [value=0]
    * A floating point value between 0 and 1 (e.g., .5)
    */

   /**
    * @cfg {String/HTMLElement/Ext.Element} textEl
    * The element to render the progress text to (defaults to the progress bar's internal text element)
    */

   /**
    * @cfg {String} id
    * The progress bar element's id (defaults to an auto-generated id)
    */

   /**
    * @cfg {String} [baseCls='x-progress']
    * The base CSS class to apply to the progress bar's wrapper element.
    */
    baseCls: Ext.baseCSSPrefix + 'progress',

    /**
     * @cfg {Boolean} animate
     * True to animate the progress bar during transitions.
     */
    animate: false,

    /**
     * @cfg {String} text
     * The text shown in the progress bar.
     */
    text: '',

    // private
    waitTimer: null,

    childEls: [
        'bar'
    ],

    renderTpl: [
        '<tpl if="internalText">',
            '<div class="{baseCls}-text {baseCls}-text-back">{text}</div>',
        '</tpl>',
        '<div id="{id}-bar" class="{baseCls}-bar" style="width:{percentage}%">',
            '<tpl if="internalText">',
                '<div class="{baseCls}-text">',
                    '<div>{text}</div>',
                '</div>',
            '</tpl>',
        '</div>'
    ],

    componentLayout: 'progressbar',

    // private
    initComponent: function() {
        this.callParent();

        this.addEvents(
            /**
             * @event update
             * Fires after each update interval
             * @param {Ext.ProgressBar} this
             * @param {Number} value The current progress value
             * @param {String} text The current progress text
             */
            "update"
        );
    },

    initRenderData: function() {
        var me = this;
        return Ext.apply(me.callParent(), {
            internalText : !me.hasOwnProperty('textEl'),
            text         : me.text || '&#160;',
            percentage   : me.value ? me.value * 100 : 0
        });
    },

    onRender : function() {
        var me = this;

        me.callParent(arguments);

        // External text display
        if (me.textEl) {
            me.textEl = Ext.get(me.textEl);
            me.updateText(me.text);
        }
        // Inline text display
        else {
            // This produces a composite w/2 el's (which is why we cannot use childEls or
            // renderSelectors):
            me.textEl = me.el.select('.' + me.baseCls + '-text');
        }
    },

    /**
     * Updates the progress bar value, and optionally its text. If the text argument is not specified, any existing text
     * value will be unchanged. To blank out existing text, pass ''. Note that even if the progress bar value exceeds 1,
     * it will never automatically reset -- you are responsible for determining when the progress is complete and
     * calling {@link #reset} to clear and/or hide the control.
     * @param {Number} [value=0] A floating point value between 0 and 1 (e.g., .5)
     * @param {String} [text=''] The string to display in the progress text element
     * @param {Boolean} [animate=false] Whether to animate the transition of the progress bar. If this value is not
     * specified, the default for the class is used
     * @return {Ext.ProgressBar} this
     */
    updateProgress: function(value, text, animate) {
        var me = this,
            oldValue = me.value;

        me.value = value || 0;
        if (text) {
            me.updateText(text);
        }
        if (me.rendered && !me.isDestroyed) {
            if (animate === true || (animate !== false && me.animate)) {
                me.bar.stopAnimation();
                me.bar.animate(Ext.apply({
                    from: {
                        width: (oldValue * 100) + '%'
                    },
                    to: {
                        width: (me.value * 100) + '%'
                    }
                }, me.animate));
            } else {
                me.bar.setStyle('width', (me.value * 100) + '%');
            }
        }
        me.fireEvent('update', me, me.value, text);
        return me;
    },

    /**
     * Updates the progress bar text. If specified, textEl will be updated, otherwise the progress bar itself will
     * display the updated text.
     * @param {String} [text=''] The string to display in the progress text element
     * @return {Ext.ProgressBar} this
     */
    updateText: function(text) {
        var me = this;
        
        me.text = text;
        if (me.rendered) {
            me.textEl.update(me.text);
        }
        return me;
    },

    applyText : function(text) {
        this.updateText(text);
    },
    
    getText: function(){
        return this.text;    
    },

    /**
     * Initiates an auto-updating progress bar. A duration can be specified, in which case the progress bar will
     * automatically reset after a fixed amount of time and optionally call a callback function if specified. If no
     * duration is passed in, then the progress bar will run indefinitely and must be manually cleared by calling
     * {@link #reset}.
     *
     * Example usage:
     *
     *     var p = new Ext.ProgressBar({
     *        renderTo: 'my-el'
     *     });
     *
     *     //Wait for 5 seconds, then update the status el (progress bar will auto-reset)
     *     var p = Ext.create('Ext.ProgressBar', {
     *        renderTo: Ext.getBody(),
     *        width: 300
     *     });
     *
     *     //Wait for 5 seconds, then update the status el (progress bar will auto-reset)
     *     p.wait({
     *        interval: 500, //bar will move fast!
     *        duration: 50000,
     *        increment: 15,
     *        text: 'Updating...',
     *        scope: this,
     *        fn: function(){
     *           p.updateText('Done!');
     *        }
     *     });
     *
     *     //Or update indefinitely until some async action completes, then reset manually
     *     p.wait();
     *     myAction.on('complete', function(){
     *         p.reset();
     *         p.updateText('Done!');
     *     });
     *
     * @param {Object} config (optional) Configuration options
     * @param {Number} config.duration The length of time in milliseconds that the progress bar should
     * run before resetting itself (defaults to undefined, in which case it will run indefinitely
     * until reset is called)
     * @param {Number} config.interval The length of time in milliseconds between each progress update
     * (defaults to 1000 ms)
     * @param {Boolean} config.animate Whether to animate the transition of the progress bar. If this
     * value is not specified, the default for the class is used.
     * @param {Number} config.increment The number of progress update segments to display within the
     * progress bar (defaults to 10).  If the bar reaches the end and is still updating, it will
     * automatically wrap back to the beginning.
     * @param {String} config.text Optional text to display in the progress bar element (defaults to '').
     * @param {Function} config.fn A callback function to execute after the progress bar finishes auto-
     * updating.  The function will be called with no arguments.  This function will be ignored if
     * duration is not specified since in that case the progress bar can only be stopped programmatically,
     * so any required function should be called by the same code after it resets the progress bar.
     * @param {Object} config.scope The scope that is passed to the callback function (only applies when
     * duration and fn are both passed).
     * @return {Ext.ProgressBar} this
     */
    wait: function(o) {
        var me = this, scope;
            
        if (!me.waitTimer) {
            scope = me;
            o = o || {};
            me.updateText(o.text);
            me.waitTimer = Ext.TaskManager.start({
                run: function(i){
                    var inc = o.increment || 10;
                    i -= 1;
                    me.updateProgress(((((i+inc)%inc)+1)*(100/inc))*0.01, null, o.animate);
                },
                interval: o.interval || 1000,
                duration: o.duration,
                onStop: function(){
                    if (o.fn) {
                        o.fn.apply(o.scope || me);
                    }
                    me.reset();
                },
                scope: scope
            });
        }
        return me;
    },

    /**
     * Returns true if the progress bar is currently in a {@link #wait} operation
     * @return {Boolean} True if waiting, else false
     */
    isWaiting: function(){
        return this.waitTimer !== null;
    },

    /**
     * Resets the progress bar value to 0 and text to empty string. If hide = true, the progress bar will also be hidden
     * (using the {@link #hideMode} property internally).
     * @param {Boolean} [hide=false] True to hide the progress bar.
     * @return {Ext.ProgressBar} this
     */
    reset: function(hide){
        var me = this;
        
        me.updateProgress(0);
        me.clearTimer();
        if (hide === true) {
            me.hide();
        }
        return me;
    },

    // private
    clearTimer: function(){
        var me = this;
        
        if (me.waitTimer) {
            me.waitTimer.onStop = null; //prevent recursion
            Ext.TaskManager.stop(me.waitTimer);
            me.waitTimer = null;
        }
    },

    onDestroy: function(){
        var me = this;
        
        me.clearTimer();
        if (me.rendered) {
            if (me.textEl.isComposite) {
                me.textEl.clear();
            }
            Ext.destroyMembers(me, 'textEl', 'progressBar');
        }
        me.callParent();
    }
});

/**
 * Component layout for tabs
 * @private
 */
Ext.define('Ext.layout.component.Tab', {

    extend: 'Ext.layout.component.Button',
    alias: 'layout.tab',

    beginLayout: function(ownerContext) {
        var me = this,
            closable = me.owner.closable;

        // Changing the close button visibility causes our cached measurements to be wrong,
        // so we must convince our base class to re-cache those adjustments...
        if (me.lastClosable !== closable) {
            me.lastClosable = closable;
            me.clearTargetCache();
        }

        me.callParent(arguments);
    }
});

/**
 * Layout class for components with {@link Ext.form.Labelable field labeling}, handling the sizing and alignment of
 * the form control, label, and error message treatment.
 * @private
 */
Ext.define('Ext.layout.component.field.Field', {

    /* Begin Definitions */

    extend: 'Ext.layout.component.Auto',

    alias: 'layout.field',

    uses: ['Ext.tip.QuickTip', 'Ext.util.TextMetrics', 'Ext.util.CSS'],

    /* End Definitions */

    type: 'field',
    
    naturalSizingProp: 'size',

    beginLayout: function(ownerContext) {
        var me = this,
            owner = me.owner,
            widthModel = ownerContext.widthModel,
            ownerNaturalSize = owner[me.naturalSizingProp],
            width;

        me.callParent(arguments);

        ownerContext.labelStrategy = me.getLabelStrategy();
        ownerContext.errorStrategy = me.getErrorStrategy();

        ownerContext.labelContext = ownerContext.getEl('labelEl');
        ownerContext.bodyCellContext = ownerContext.getEl('bodyEl');
        ownerContext.inputContext = ownerContext.getEl('inputEl');
        ownerContext.errorContext = ownerContext.getEl('errorEl');

        // width:100% on an element inside a table in IE6/7 "strict" sizes the content box.
        // store the input element's border and padding info so that subclasses can take it into consideration if needed
        if ((Ext.isIE6 || Ext.isIE7) && Ext.isStrict && ownerContext.inputContext) {
            me.ieInputWidthAdjustment = ownerContext.inputContext.getPaddingInfo().width + ownerContext.inputContext.getBorderInfo().width;
        }

        // perform preparation on the label and error (setting css classes, qtips, etc.)
        ownerContext.labelStrategy.prepare(ownerContext, owner);
        ownerContext.errorStrategy.prepare(ownerContext, owner);

        // Body cell must stretch to use up available width unless the field is auto width
        if (widthModel.shrinkWrap) {
            // When the width needs to be auto, table-layout cannot be fixed
            me.beginLayoutShrinkWrap(ownerContext);
        } else if (widthModel.natural) {

            // When a size specified, natural becomes fixed width unless the inpiutWidth is specified - we shrinkwrap that
            if (typeof ownerNaturalSize == 'number' && !owner.inputWidth) {
                me.beginLayoutFixed(ownerContext, (width = ownerNaturalSize * 6.5 + 20), 'px');
            }

            // Otherwise it is the same as shrinkWrap
            else {
                me.beginLayoutShrinkWrap(ownerContext);
            }
            ownerContext.setWidth(width, false);
        } else {
            me.beginLayoutFixed(ownerContext, '100', '%');
        }
    },

    beginLayoutFixed: function (ownerContext, width, suffix) {
        var owner = ownerContext.target,
            inputEl = owner.inputEl,
            inputWidth = owner.inputWidth;

        owner.el.setStyle('table-layout', 'fixed');
        owner.bodyEl.setStyle('width', width + suffix);
        if (inputEl && inputWidth) {
            inputEl.setStyle('width', inputWidth + 'px');
        }
        ownerContext.isFixed = true;
    },

    beginLayoutShrinkWrap: function (ownerContext) {
        var owner = ownerContext.target,
            inputEl = owner.inputEl,
            inputWidth = owner.inputWidth;

        if (inputEl && inputEl.dom) {
            inputEl.dom.removeAttribute('size');
            if (inputWidth) {
                inputEl.setStyle('width', inputWidth + 'px');
            }
        }
        owner.el.setStyle('table-layout', 'auto');
        owner.bodyEl.setStyle('width', '');
    },

    finishedLayout: function(ownerContext){
        var owner = this.owner;

        this.callParent(arguments);        
        ownerContext.labelStrategy.finishedLayout(ownerContext, owner);
        ownerContext.errorStrategy.finishedLayout(ownerContext, owner);
    },

    calculateOwnerHeightFromContentHeight: function(ownerContext, contentHeight) {
        return contentHeight;
    },

    measureContentHeight: function (ownerContext) {
        return ownerContext.el.getHeight();
    },
    
    measureContentWidth: function (ownerContext) {
        return ownerContext.el.getWidth();
    },

    measureLabelErrorHeight: function (ownerContext) {
        return ownerContext.labelStrategy.getHeight(ownerContext) +
               ownerContext.errorStrategy.getHeight(ownerContext);
    },

    onFocus: function() {
        this.getErrorStrategy().onFocus(this.owner);    
    },

    /**
     * Return the set of strategy functions from the {@link #labelStrategies labelStrategies collection}
     * that is appropriate for the field's {@link Ext.form.Labelable#labelAlign labelAlign} config.
     */
    getLabelStrategy: function() {
        var me = this,
            strategies = me.labelStrategies,
            labelAlign = me.owner.labelAlign;
        return strategies[labelAlign] || strategies.base;
    },

    /**
     * Return the set of strategy functions from the {@link #errorStrategies errorStrategies collection}
     * that is appropriate for the field's {@link Ext.form.Labelable#msgTarget msgTarget} config.
     */
    getErrorStrategy: function() {
        var me = this,
            owner = me.owner,
            strategies = me.errorStrategies,
            msgTarget = owner.msgTarget;
        return !owner.preventMark && Ext.isString(msgTarget) ?
                (strategies[msgTarget] || strategies.elementId) :
                strategies.none;
    },

    /**
     * Collection of named strategies for laying out and adjusting labels to accommodate error messages.
     * An appropriate one will be chosen based on the owner field's {@link Ext.form.Labelable#labelAlign} config.
     */
    labelStrategies: (function() {
        var base = {
                prepare: function(ownerContext, owner) {
                    var cls = owner.labelCls + '-' + owner.labelAlign,
                        labelEl = owner.labelEl;

                    if (labelEl) {
                        labelEl.addCls(cls);
                    }
                },

                getHeight: function () {
                    return 0;
                },
                
                finishedLayout: Ext.emptyFn
            };

        return {
            base: base,

            /**
             * Label displayed above the bodyEl
             */
            top: Ext.applyIf({        
                        
                getHeight: function (ownerContext) {
                    var labelContext = ownerContext.labelContext,
                        props = labelContext.props,
                        height = props.height;
                        
                    if (height === undefined) {
                        props.height = height = labelContext.el.getHeight();
                    }

                    return height;
                }
            }, base),

            /**
             * Label displayed to the left of the bodyEl
             */
            left: base,

            /**
             * Same as left, only difference is text-align in CSS
             */
            right: base
        };
    }()),

    /**
     * Collection of named strategies for laying out and adjusting insets to accommodate error messages.
     * An appropriate one will be chosen based on the owner field's {@link Ext.form.Labelable#msgTarget} config.
     */
    errorStrategies: (function() {
        function showTip(owner) {
            var tip = Ext.layout.component.field.Field.tip,
                target;
                
            if (tip && tip.isVisible()) {
                target = tip.activeTarget;
                if (target && target.el === owner.getActionEl().dom) {
                    tip.toFront(true);
                }
            }
        }

        var applyIf = Ext.applyIf,
            emptyFn = Ext.emptyFn,
            iconCls = Ext.baseCSSPrefix + 'form-invalid-icon',
            iconWidth,
            base = {
                prepare: function(ownerContext, owner) {
                    var el = owner.errorEl;
                    if (el) {
                        el.setDisplayed(false);
                    }
                },
                getHeight: function () {
                    return 0;
                },
                onFocus: emptyFn,
                finishedLayout: emptyFn
            };

        return {
            none: base,

            /**
             * Error displayed as icon (with QuickTip on hover) to right of the bodyEl
             */
            side: applyIf({
                prepare: function(ownerContext, owner) {
                    var errorEl = owner.errorEl,
                        sideErrorCell = owner.sideErrorCell,
                        displayError = owner.hasActiveError(),
                        tempEl;

                    // Capture error icon width once
                    if (!iconWidth) {
                        iconWidth = (tempEl = Ext.getBody().createChild({style: 'position:absolute', cls: iconCls})).getWidth();
                        tempEl.remove();
                    }

                    errorEl.addCls(iconCls);
                    errorEl.set({'data-errorqtip': owner.getActiveError() || ''});
                    if (owner.autoFitErrors) {
                        errorEl.setDisplayed(displayError);
                    }
                    // Not autofitting, the space must still be allocated.
                    else {
                        errorEl.setVisible(displayError);
                    }

                    // If we are auto fitting, then hide and show the entire cell
                    if (sideErrorCell && owner.autoFitErrors) {
                        sideErrorCell.setDisplayed(displayError);
                    }
                    owner.bodyEl.dom.colSpan = owner.getBodyColspan();

                    // TODO: defer the tip call until after the layout to avoid immediate DOM reads now
                    Ext.layout.component.field.Field.initTip();
                },
                onFocus: showTip
            }, base),

            /**
             * Error message displayed underneath the bodyEl
             */
            under: applyIf({
                prepare: function(ownerContext, owner) {
                    var errorEl = owner.errorEl,
                        cls = Ext.baseCSSPrefix + 'form-invalid-under';

                    errorEl.addCls(cls);
                    errorEl.setDisplayed(owner.hasActiveError());
                },
                getHeight: function (ownerContext) {
                    var height = 0,
                        errorContext, props;

                    if (ownerContext.target.hasActiveError()) {
                        errorContext = ownerContext.errorContext;
                        props = errorContext.props;
                        height = props.height;

                        if (height === undefined) {
                            props.height = height = errorContext.el.getHeight();
                        }
                    }

                    return height;
                }
            }, base),

            /**
             * Error displayed as QuickTip on hover of the field container
             */
            qtip: applyIf({
                prepare: function(ownerContext, owner) {
                    Ext.layout.component.field.Field.initTip();
                    owner.getActionEl().set({'data-errorqtip': owner.getActiveError() || ''});
                },
                onFocus: showTip
            }, base),

            /**
             * Error displayed as title tip on hover of the field container
             */
            title: applyIf({
                prepare: function(ownerContext, owner) {
                    owner.el.set({'title': owner.getActiveError() || ''});
                }
            }, base),

            /**
             * Error message displayed as content of an element with a given id elsewhere in the app
             */
            elementId: applyIf({
                prepare: function(ownerContext, owner) {
                    var targetEl = Ext.fly(owner.msgTarget);
                    if (targetEl) {
                        targetEl.dom.innerHTML = owner.getActiveError() || '';
                        targetEl.setDisplayed(owner.hasActiveError());
                    }
                }
            }, base)
        };
    }()),

    statics: {
        /**
         * Use a custom QuickTip instance separate from the main QuickTips singleton, so that we
         * can give it a custom frame style. Responds to errorqtip rather than the qtip property.
         * @static
         */
        initTip: function() {
            var tip = this.tip;
            if (!tip) {
                tip = this.tip = Ext.create('Ext.tip.QuickTip', {
                    baseCls: Ext.baseCSSPrefix + 'form-invalid-tip'
                });
                tip.tagConfig = Ext.apply({}, {attribute: 'errorqtip'}, tip.tagConfig);
            }
        },

        /**
         * Destroy the error tip instance.
         * @static
         */
        destroyTip: function() {
            var tip = this.tip;
            if (tip) {
                tip.destroy();
                delete this.tip;
            }
        }
    }
});



/**
 * @private
 */
Ext.define('Ext.layout.component.field.FieldContainer', {

    /* Begin Definitions */

    extend: 'Ext.layout.component.field.Field',

    alias: 'layout.fieldcontainer',

    /* End Definitions */

    type: 'fieldcontainer',

    waitForOuterHeightInDom: true,
    waitForOuterWidthInDom: true,

    beginLayout: function(ownerContext) {
        this.callParent(arguments);

        // Tell Component.measureAutoDimensions to measure the DOM when containerChildrenDone is true
        ownerContext.hasRawContent = true;
        ownerContext.target.bodyEl.setStyle('height', '');
    },

    measureContentHeight: function (ownerContext) {
        // since we are measuring the outer el, we have to wait for whatever is in our
        // container to be flushed to the DOM... especially for things like box layouts
        // that size the innerCt since that is all that will contribute to our size!
        return ownerContext.hasDomProp('containerLayoutDone') ? this.callParent(arguments) : NaN;
    },

    measureContentWidth: function (ownerContext) {
        // see measureContentHeight
        return ownerContext.hasDomProp('containerLayoutDone') ? this.callParent(arguments) : NaN;
    },

    publishInnerWidth: function (ownerContext, width) {
        var bodyContext = ownerContext.bodyCellContext;
        bodyContext.setWidth(bodyContext.el.getWidth(), false);
    },
    
    publishInnerHeight: function (ownerContext, height) {
        var bodyContext = ownerContext.bodyCellContext;
        bodyContext.setHeight(height - this.measureLabelErrorHeight(ownerContext));
    }
});

/**
 * Layout class for {@link Ext.form.field.HtmlEditor} fields. Sizes the toolbar, textarea, and iframe elements.
 * @private
 */
Ext.define('Ext.layout.component.field.HtmlEditor', {
    extend: 'Ext.layout.component.field.Field',
    alias: ['layout.htmleditor'],

    type: 'htmleditor',

    // Flags to say that the item is autosizing itself.
    toolbarSizePolicy: {
        setsWidth: 0,
        setsHeight: 0
    },

    beginLayout: function(ownerContext) {
        this.callParent(arguments);

        ownerContext.textAreaContext = ownerContext.getEl('textareaEl');
        ownerContext.iframeContext   = ownerContext.getEl('iframeEl');
        ownerContext.toolbarContext  = ownerContext.context.getCmp(this.owner.getToolbar());
    },
    
    // It's not a container, can never add/remove dynamically
    renderItems: Ext.emptyFn,

    getItemSizePolicy: function (item) {
        // we are only ever called by the toolbar
        return this.toolbarSizePolicy;
    },

    getLayoutItems: function () {
        var toolbar = this.owner.getToolbar();
        // The toolbar may not exist if we're destroying
        return toolbar ? [toolbar] : [];
    },

    getRenderTarget: function() {
        return this.owner.bodyEl;
    },

    publishInnerHeight: function (ownerContext, height) {
        var me = this,
            innerHeight = height - me.measureLabelErrorHeight(ownerContext) -
                          ownerContext.toolbarContext.getProp('height') -
                          ownerContext.bodyCellContext.getPaddingInfo().height;

        // If the Toolbar has not acheieved a height yet, we are not done laying out.
        if (Ext.isNumber(innerHeight)) {
            ownerContext.textAreaContext.setHeight(innerHeight);
            ownerContext.iframeContext.setHeight(innerHeight);
        } else {
            me.done = false;
        }
    }
});
/**
 * @private
 */
Ext.define('Ext.layout.component.field.Slider', {

    /* Begin Definitions */

    alias: ['layout.sliderfield'],

    extend: 'Ext.layout.component.field.Field',

    /* End Definitions */

    type: 'sliderfield',

    beginLayout: function(ownerContext) {
        this.callParent(arguments);

        ownerContext.endElContext   = ownerContext.getEl('endEl');
        ownerContext.innerElContext = ownerContext.getEl('innerEl');
        ownerContext.bodyElContext  = ownerContext.getEl('bodyEl');
    },

    publishInnerHeight: function (ownerContext, height) {
        var innerHeight = height - this.measureLabelErrorHeight(ownerContext),
            endElPad,
            inputPad;
        if (this.owner.vertical) {
            endElPad = ownerContext.endElContext.getPaddingInfo();
            inputPad = ownerContext.inputContext.getPaddingInfo();
            ownerContext.innerElContext.setHeight(innerHeight - inputPad.height - endElPad.height);
        } else {
            ownerContext.bodyElContext.setHeight(innerHeight);
        }
    },

    publishInnerWidth: function (ownerContext, width) {
        if (!this.owner.vertical) {
            var endElPad = ownerContext.endElContext.getPaddingInfo(),
                inputPad = ownerContext.inputContext.getPaddingInfo();

            ownerContext.innerElContext.setWidth(width - inputPad.left - endElPad.right - ownerContext.labelContext.getProp('width'));
        }
    },

    beginLayoutFixed: function(ownerContext, width, suffix) {
        var me = this,
            ieInputWidthAdjustment = me.ieInputWidthAdjustment;

        if (ieInputWidthAdjustment) {
            // adjust for IE 6/7 strict content-box model
            // RTL: This might have to be padding-left unless the senses of the padding styles switch when in RTL mode.
            me.owner.bodyEl.setStyle('padding-right', ieInputWidthAdjustment + 'px');
        }

        me.callParent(arguments);
    }
});

/**
 * Layout class for {@link Ext.form.field.Text} fields. Handles sizing the input field.
 * @private
 */
Ext.define('Ext.layout.component.field.Text', {
    extend: 'Ext.layout.component.field.Field',
    alias: 'layout.textfield',
    requires: ['Ext.util.TextMetrics'],

    type: 'textfield',
    
    canGrowWidth: true,

    beginLayoutCycle: function(ownerContext) {
        var me = this;
        
        me.callParent(arguments);
        
        // Clear height, in case a previous layout cycle stretched it.
        if (ownerContext.shrinkWrap) {
            ownerContext.inputContext.el.setStyle('height', '');
        }
    },

    measureContentWidth: function (ownerContext) {
        var me = this,
            owner = me.owner,
            width = me.callParent(arguments),
            inputContext = ownerContext.inputContext,
            inputEl, value, calcWidth, max, min;

        if (owner.grow && me.canGrowWidth && !ownerContext.state.growHandled) {
            inputEl = owner.inputEl;

            // Find the width that contains the whole text value
            value = Ext.util.Format.htmlEncode(inputEl.dom.value || (owner.hasFocus ? '' : owner.emptyText) || '');
            value += owner.growAppend;
            calcWidth = inputEl.getTextWidth(value) + inputContext.getFrameInfo().width;

            max = owner.growMax;
            min = Math.min(max, width);
            max = Math.max(owner.growMin, max, min);

            // Constrain
            calcWidth = Ext.Number.constrain(calcWidth, owner.growMin, max);
            inputContext.setWidth(calcWidth);
            ownerContext.state.growHandled = true;
            
            // Now that we've set the inputContext, we need to recalculate the width
            inputContext.domBlock(me, 'width');
            width = NaN;
        }
        return width;
    },
    
    publishInnerHeight: function(ownerContext, height) {
        ownerContext.inputContext.setHeight(height - this.measureLabelErrorHeight(ownerContext));
    },

    beginLayoutFixed: function(ownerContext, width, suffix) {
        var me = this,
            ieInputWidthAdjustment = me.ieInputWidthAdjustment;

        if (ieInputWidthAdjustment) {
            // adjust for IE 6/7 strict content-box model
            // RTL: This might have to be padding-left unless the senses of the padding styles switch when in RTL mode.
            me.owner.bodyEl.setStyle('padding-right', ieInputWidthAdjustment + 'px');
            if(suffix === 'px') {
                width -= ieInputWidthAdjustment;
            }
        }

        me.callParent(arguments);
    }
});



/**
 * Layout class for {@link Ext.form.field.TextArea} fields. Handles sizing the textarea field.
 * @private
 */
Ext.define('Ext.layout.component.field.TextArea', {
    extend: 'Ext.layout.component.field.Text',
    alias: 'layout.textareafield',

    type: 'textareafield',
    
    canGrowWidth: false,
    
    naturalSizingProp: 'cols',
    
    beginLayout: function(ownerContext){
        this.callParent(arguments);
        ownerContext.target.inputEl.setStyle('height', '');
    },

    measureContentHeight: function (ownerContext) {
        var me = this,
            owner = me.owner,
            height = me.callParent(arguments),
            inputContext, inputEl, value, max, curWidth, calcHeight;

        if (owner.grow && !ownerContext.state.growHandled) {
            inputContext = ownerContext.inputContext;
            inputEl = owner.inputEl;
            curWidth = inputEl.getWidth(true); //subtract border/padding to get the available width for the text

            // Get and normalize the field value for measurement
            value = Ext.util.Format.htmlEncode(inputEl.dom.value) || '&#160;';
            value += owner.growAppend;
            
            // Translate newlines to <br> tags
            value = value.replace(/\n/g, '<br/>');

            // Find the height that contains the whole text value
            calcHeight = Ext.util.TextMetrics.measure(inputEl, value, curWidth).height +
                         inputContext.getBorderInfo().height + inputContext.getPaddingInfo().height;

            // Constrain
            calcHeight = Ext.Number.constrain(calcHeight, owner.growMin, owner.growMax);
            inputContext.setHeight(calcHeight);
            ownerContext.state.growHandled = true;
            
            // Now that we've set the inputContext, we need to recalculate the width
            inputContext.domBlock(me, 'height');
            height = NaN;
        }
        return height;
    }
});




/**
 * Layout class for {@link Ext.form.field.Trigger} fields. Adjusts the input field size to accommodate
 * the trigger button(s).
 * @private
 */
Ext.define('Ext.layout.component.field.Trigger', {

    /* Begin Definitions */

    alias: 'layout.triggerfield',

    extend: 'Ext.layout.component.field.Field',

    /* End Definitions */

    type: 'triggerfield',

    beginLayout: function(ownerContext) {
        var me = this,
            owner = me.owner,
            flags;

        ownerContext.triggerWrap = ownerContext.getEl('triggerWrap');

        me.callParent(arguments);

        // if any of these important states have changed, sync them now:
        flags = owner.getTriggerStateFlags();
        if (flags != owner.lastTriggerStateFlags) {
            owner.lastTriggerStateFlags = flags;
            me.updateEditState();
        }
    },

    beginLayoutFixed: function (ownerContext, width, suffix) {
        var me = this,
            owner = ownerContext.target,
            ieInputWidthAdjustment = me.ieInputWidthAdjustment || 0,
            inputWidth = '100%',
            triggerWrap = owner.triggerWrap;

        me.callParent(arguments);

        owner.inputCell.setStyle('width', '100%');
        if(ieInputWidthAdjustment) {
            // adjust for IE 6/7 strict content-box model
            // RTL: This might have to be padding-left unless the senses of the padding styles switch when in RTL mode.
            owner.inputCell.setStyle('padding-right', ieInputWidthAdjustment + 'px');
            if(suffix === 'px') {
                if (owner.inputWidth) {
                    inputWidth = owner.inputWidth - owner.getTriggerWidth();
                } else {
                    inputWidth = width - ieInputWidthAdjustment - owner.getTriggerWidth();
                }
                inputWidth += 'px';
            }
        }
        owner.inputEl.setStyle('width', inputWidth);
        inputWidth = owner.inputWidth;
        if (inputWidth) {
            triggerWrap.setStyle('width', inputWidth + (ieInputWidthAdjustment) + 'px');
        } else {
            triggerWrap.setStyle('width', width + suffix);
        }
        triggerWrap.setStyle('table-layout', 'fixed');
    },

    beginLayoutShrinkWrap: function (ownerContext) {
        var owner = ownerContext.target,
            emptyString = '',
            inputWidth = owner.inputWidth,
            triggerWrap = owner.triggerWrap,
            ieInputWidthAdjustment = this.ieInputWidthAdjustment || 0;

        this.callParent(arguments);

        if (inputWidth) {
            triggerWrap.setStyle('width', inputWidth + 'px');
            inputWidth = (inputWidth - owner.getTriggerWidth()) + 'px';
            owner.inputEl.setStyle('width', inputWidth);
            owner.inputCell.setStyle('width', inputWidth);
        } else {
            owner.inputCell.setStyle('width', emptyString);
            owner.inputEl.setStyle('width', emptyString);
            triggerWrap.setStyle('width', emptyString);
            triggerWrap.setStyle('table-layout', 'auto');
        }
    },

    getTextWidth: function () {
        var me = this,
            owner = me.owner,
            inputEl = owner.inputEl,
            value;

        // Find the width that contains the whole text value
        value = (inputEl.dom.value || (owner.hasFocus ? '' : owner.emptyText) || '') + owner.growAppend;
        return inputEl.getTextWidth(value);
    },

    measureContentWidth: function (ownerContext) {
        var me = this,
            owner = me.owner,
            width = me.callParent(arguments),
            inputContext = ownerContext.inputContext,
            calcWidth, max, min;

        if (owner.grow && !ownerContext.state.growHandled) {
            calcWidth = me.getTextWidth() + ownerContext.inputContext.getFrameInfo().width;

            max = owner.growMax;
            min = Math.min(max, width);
            max = Math.max(owner.growMin, max, min);

            // Constrain
            calcWidth = Ext.Number.constrain(calcWidth, owner.growMin, max);
            inputContext.setWidth(calcWidth);
            ownerContext.state.growHandled = true;
            
            // Now that we've set the inputContext, we need to recalculate the width
            inputContext.domBlock(me, 'width');
            width = NaN;
        }
        return width;
    },

    updateEditState: function() {
        var me = this,
            owner = me.owner,
            inputEl = owner.inputEl,
            noeditCls = Ext.baseCSSPrefix + 'trigger-noedit',
            displayed,
            readOnly;

        if (me.owner.readOnly) {
            inputEl.addCls(noeditCls);
            readOnly = true;
            displayed = false;
        } else {
            if (me.owner.editable) {
                inputEl.removeCls(noeditCls);
                readOnly = false;
            } else {
                inputEl.addCls(noeditCls);
                readOnly = true;
            }
            displayed = !me.owner.hideTrigger;
        }

        owner.triggerCell.setDisplayed(displayed);
        inputEl.dom.readOnly = readOnly;
    }
});





/**
 * Layout class for {@link Ext.form.field.ComboBox} fields. Handles sizing the input field.
 * @private
 */
Ext.define('Ext.layout.component.field.ComboBox', {
    extend: 'Ext.layout.component.field.Trigger',
    alias: 'layout.combobox',
    requires: ['Ext.util.TextMetrics'],

    type: 'combobox',

    startingWidth: null,

    getTextWidth: function () {
        var me = this,
            owner = me.owner,
            store = owner.store,
            field = owner.displayField,
            storeLn = store.data.length,
            value = '',
            i = 0, n = 0, ln, item, width;

        for (; i < storeLn; i++) {
            item = store.getAt(i).data[field];
            ln = item.length;
            // compare the current item's length with the current longest length and store the value
            if (ln > n) {
                n = ln;
                value = item;
            }
        }

        width = Math.max(me.callParent(arguments), owner.inputEl.getTextWidth(value + owner.growAppend));

        // it's important to know the starting width else the inputEl could be resized smaller than the boundlist
        // NOTE that when removing items from the store that the startingWidth needs to be recalculated
        if (!me.startingWidth || owner.removingRecords) {
            me.startingWidth = width;

            // also, if the width is less than growMin reset the default boundlist width
            // or it will appear wider than the component if the trigger is clicked
            if (width < owner.growMin) {
                owner.defaultListConfig.minWidth = owner.growMin;
            }

            owner.removingRecords = false;
        }
 
        // only resize if the new width is greater than the starting width
        return (width < me.startingWidth) ? me.startingWidth : width;
    }
});

/**
 * This class is intended to be extended or created via the {@link Ext.container.Container#layout layout}
 * configuration property.  See {@link Ext.container.Container#layout} for additional details.
 */
Ext.define('Ext.layout.container.Container', {

    /* Begin Definitions */

    extend: 'Ext.layout.Layout',

    alternateClassName: 'Ext.layout.ContainerLayout',

    mixins: {
        elementCt: 'Ext.util.ElementContainer'
    },

    requires: [
        'Ext.XTemplate'
    ],

    type: 'container',

    /* End Definitions */

    /**
     * @cfg {String} itemCls
     * An optional extra CSS class that will be added to the container. This can be useful for
     * adding customized styles to the container or any of its children using standard CSS
     * rules. See {@link Ext.Component}.{@link Ext.Component#componentCls componentCls} also.
     */

    /**
     * @cfg {Number} [manageOverflow=0]
     * One of the following values:
     *
     *  - 0 if the layout should ignore overflow.
     *  - 1 if the layout should be rerun if scrollbars are needed.
     *  - 2 if the layout should also correct padding when overflowed.
     */
    manageOverflow: 0,

    /**
     * @private
     * Called by an owning Panel before the Panel begins its collapse process.
     * Most layouts will not need to override the default Ext.emptyFn implementation.
     */
    beginCollapse: Ext.emptyFn,

    /**
     * @private
     * Called by an owning Panel before the Panel begins its expand process.
     * Most layouts will not need to override the default Ext.emptyFn implementation.
     */
    beginExpand: Ext.emptyFn,

    /**
     * An object which contains boolean properties specifying which properties are to be 
     * animated upon flush of child Component ContextItems. For example, Accordion would
     * have:
     *
     *      {
     *          y: true,
     *          height: true
     *      }
     *
     * @private
     */
    animatePolicy: null,

    childEls: [
        /**
         * @property {Ext.Element} overflowPadderEl
         * The element used to correct body padding during overflow.
         */
        'overflowPadderEl'
    ],

    renderTpl: [
        '{%this.renderBody(out,values)%}'
    ],

    usesContainerHeight: true,
    usesContainerWidth: true,
    usesHeight: true,
    usesWidth: true,


    /**
     * @cfg {Boolean} [reserveScrollbar=false]
     * Set to `true` to leave space for a vertical scrollbar (if the OS shows space-consuming scrollbars) regardless
     * of whether a scrollbar is needed.
     *
     * This is useful if content height changes during application usage, but you do not want the calculated width
     * of child items to change when a scrollbar appears or disappears. The scrollbar will appear in the reserved space,
     * and the calculated width of child Components will not change.
     *
     *     @example
     *     Ext.define('Employee', {
     *         extend: 'Ext.data.Model',
     *         fields: [
     *            {name: 'rating', type: 'int'},
     *            {name: 'salary', type: 'float'},
     *            {name: 'name'}
     *         ]
     *     });
     *
     *     function createFakeData(count) {
     *         var firstNames   = ['Ed', 'Tommy', 'Aaron', 'Abe', 'Jamie', 'Adam', 'Dave', 'David', 'Jay', 'Nicolas', 'Nige'],
     *             lastNames    = ['Spencer', 'Maintz', 'Conran', 'Elias', 'Avins', 'Mishcon', 'Kaneda', 'Davis', 'Robinson', 'Ferrero', 'White'],
     *             ratings      = [1, 2, 3, 4, 5],
     *             salaries     = [100, 400, 900, 1500, 1000000];
     *
     *         var data = [];
     *         for (var i = 0; i < (count || 25); i++) {
     *             var ratingId    = Math.floor(Math.random() * ratings.length),
     *                 salaryId    = Math.floor(Math.random() * salaries.length),
     *                 firstNameId = Math.floor(Math.random() * firstNames.length),
     *                 lastNameId  = Math.floor(Math.random() * lastNames.length),
     *
     *                 rating      = ratings[ratingId],
     *                 salary      = salaries[salaryId],
     *                 name        = Ext.String.format("{0} {1}", firstNames[firstNameId], lastNames[lastNameId]);
     *
     *             data.push({
     *                 rating: rating,
     *                 salary: salary,
     *                 name: name
     *             });
     *         }
     *         store.loadData(data);
     *     }
     *
     *     // create the Data Store
     *     var store = Ext.create('Ext.data.Store', {
     *         id: 'store',
     *         model: 'Employee',
     *         proxy: {
     *             type: 'memory'
     *         }
     *     });
     *     createFakeData(10);
     *
     *     var grid = Ext.create('Ext.grid.Panel', {
     *         title: 'Grid loaded with varying number of records',
     *         anchor: '100%',
     *         store: store,
     *         columns: [{
     *             xtype: 'rownumberer',
     *             width: 40,
     *             sortable: false
     *         },{
     *             text: 'Name',
     *             flex: 1,
     *             sortable: true,
     *             dataIndex: 'name'
     *         },{
     *             text: 'Rating',
     *             width: 125,
     *             sortable: true,
     *             dataIndex: 'rating'
     *         },{
     *             text: 'Salary',
     *             width: 125,
     *             sortable: true,
     *             dataIndex: 'salary',
     *             align: 'right',
     *             renderer: Ext.util.Format.usMoney
     *         }]
     *     });
     *
     *     Ext.create('Ext.panel.Panel', {
     *         renderTo: document.body,
     *         width: 800,
     *         height: 600,
     *         layout: {
     *             type: 'anchor',
     *             reserveScrollbar: true // There will be a gap even when there's no scrollbar
     *         },
     *         autoScroll: true,
     *         items: grid,
     *         tbar: {
     *             defaults: {
     *                 handler: function(b) {
     *                     createFakeData(b.count);
     *                 }
     *             },
     *             items: [{
     *                  text: '10 Items',
     *                  count: 10
     *             },{
     *                  text: '100 Items',
     *                  count: 100
     *             },{
     *                  text: '300 Items',
     *                  count: 300
     *             },{
     *                  text: '1000 Items',
     *                  count: 1000
     *             },{
     *                  text: '5000 Items',
     *                  count: 5000
     *             }]
     *         }
     *     });
     *
     */
    reserveScrollbar: false,

    // Begin with no previous adjustments
    lastOverflowAdjust: {
        width: 0,
        height: 0
    },

    constructor: function () {
        this.callParent(arguments);
        this.mixins.elementCt.constructor.call(this);
    },

    destroy : function() {
        this.callParent();
        this.mixins.elementCt.destroy.call(this);
    },

    initLayout: function() {
        var me = this,
            scrollbarWidth = Ext.getScrollbarSize().width;

        me.callParent();

        // Create a default lastOverflowAdjust based upon scrolling configuration.
        // If the Container is to overflow, or we *always* reserve space for a scrollbar
        // then reserve space for a vertical scrollbar
        if (scrollbarWidth && me.manageOverflow && !me.hasOwnProperty('lastOverflowAdjust')) {
            if (me.owner.autoScroll || me.reserveScrollbar) {
                me.lastOverflowAdjust = {
                    width: scrollbarWidth,
                    height: 0
                };
            }
        }
    },

    /**
     * In addition to work done by our base classes, containers benefit from some extra
     * cached data. The following properties are added to the ownerContext:
     * 
     *  - visibleItems: the result of {@link #getVisibleItems}
     *  - childItems: the ContextItem[] for each visible item
     *  - targetContext: the ContextItem for the {@link #getTarget} element
     */
    beginLayout: function (ownerContext) {
        this.callParent(arguments);

        ownerContext.targetContext = ownerContext.getEl('getTarget', this);

        this.cacheChildItems(ownerContext);
    },

    beginLayoutCycle: function (ownerContext, firstCycle) {
        var me = this,
            padEl = me.overflowPadderEl;

        me.callParent(arguments);

        // Begin with the scrollbar adjustment that we used last time - this is more likely to be correct
        // than beginning with no adjustment at all
        if (!ownerContext.state.overflowAdjust) {
            ownerContext.state.overflowAdjust = me.lastOverflowAdjust;
        }

        if (firstCycle) {
            if (me.usesContainerHeight) {
                ++ownerContext.consumersContainerHeight;
            }
            if (me.usesContainerWidth) {
                ++ownerContext.consumersContainerWidth;
            }
        }

        if (padEl) {
            padEl.setStyle('display', 'none');
        }
    },

    completeLayout: function (ownerContext) {
        // Cache the scrollbar adjustment
        this.lastOverflowAdjust = ownerContext.state.overflowAdjust;
    },

    cacheChildItems: function (ownerContext) {
        var context = ownerContext.context,
            childItems = [],
            items = this.getVisibleItems(),
            length = items.length,
            i;

        ownerContext.childItems = childItems;
        ownerContext.visibleItems = items;

        for (i = 0; i < length; ++i) {
            childItems.push(context.getCmp(items[i]));
        }
    },

    cacheElements: function () {
        var owner = this.owner;

        this.applyChildEls(owner.el, owner.id); // from ElementContainer mixin
    },

    calculateContentSize: function (ownerContext, dimensions) {
        var me = this,
            containerDimensions = (dimensions || 0) | me.manageOverflow |
                   ((ownerContext.widthModel.shrinkWrap ? 1 : 0) |
                    (ownerContext.heightModel.shrinkWrap ? 2 : 0)),
            calcWidth = (containerDimensions & 1) || undefined,
            calcHeight = (containerDimensions & 2) || undefined,
            childItems = ownerContext.childItems,
            length = childItems.length,
            contentHeight = 0,
            contentWidth = 0,
            needed = 0,
            props = ownerContext.props,
            targetXY, targetX, targetY, targetPadding,
            borders, child, childContext, childX, childY, height, i, margins, width, xy;

        if (calcWidth) {
            if (isNaN(props.contentWidth)) {
                ++needed;
            } else {
                calcWidth = undefined;
            }
        }
        if (calcHeight) {
            if (isNaN(props.contentHeight)) {
                ++needed;
            } else {
                calcHeight = undefined;
            }
        }

        if (needed) {
            // TODO - this is rather brute force... maybe a wrapping el or clientHeight/Width
            // trick might help. Whatever we do, it must either work for Absolute layout or
            // at least be correctable by an overridden method in that derived class.
            for (i = 0; i < length; ++i) {
                childContext = childItems[i];
                child = childContext.target;
                height = calcHeight && childContext.getProp('height');
                width = calcWidth && childContext.getProp('width');
                margins = childContext.getMarginInfo();

                // getXY is the root method here (meaning that we cannot avoid getting both
                // even if we need only one), so dip into the DOM if something is needed
                if ((calcWidth && isNaN(child.x)) || (calcHeight && isNaN(child.y))) {
                    xy = child.el.getXY();
                    if (!targetXY) {
                        targetXY = ownerContext.targetContext.el.getXY();
                        borders = ownerContext.targetContext.getBorderInfo();
                        targetX = targetXY[0] + borders.left;
                        targetY = targetXY[1] + borders.top;
                    }
                    // not worth avoiding the possibly useless calculation here:
                    childX = xy[0] - targetX;
                    childY = xy[1] - targetY;
                } else {
                    // not worth avoiding these either:
                    childX = child.x;
                    childY = child.y;
                }
                // XY includes the top/left margin

                height += margins.bottom;
                width  += margins.right;

                contentHeight = Math.max(contentHeight, childY + height);
                contentWidth = Math.max(contentWidth, childX + width);

                if (isNaN(contentHeight) && isNaN(contentWidth)) {
                    me.done = false;
                    return;
                }
            }

            if (calcWidth || calcHeight) {
                targetPadding = ownerContext.targetContext.getPaddingInfo();
            }
            if (calcWidth && !ownerContext.setContentWidth(contentWidth + targetPadding.right)) {
                me.done = false;
            }
            if (calcHeight && !ownerContext.setContentHeight(contentHeight + targetPadding.bottom)) {
                me.done = false;
            }

            /* add a '/' to turn on this log ('//* enables, '/*' disables)
            if (me.done) {
                var el = ownerContext.targetContext.el.dom;
                Ext.log(this.owner.id, '.contentSize: ', contentWidth, 'x', contentHeight,
                    ' => scrollSize: ', el.scrollWidth, 'x', el.scrollHeight);
            }/**/
        }
    },

    /**
     * Handles overflow processing for a container. This should be called once the layout
     * has determined contentWidth/Height. In addition to the ownerContext passed to the
     * {@link #calculate} method, this method also needs the containerSize (the object
     * returned by {@link #getContainerSize}).
     * 
     * @param {Ext.layout.ContextItem} ownerContext
     * @param {Object} containerSize
     * @param {Number} dimensions A bit mask for the overflow managed dimensions. The 0-bit
     * is for `width` and the 1-bit is for `height`. In other words, a value of 1 would be
     * only `width`, 2 would be only `height` and 3 would be both.
     */
    calculateOverflow: function (ownerContext, containerSize, dimensions) {
        var me = this,
            owner = me.owner,
            manageOverflow = me.manageOverflow,
            state = ownerContext.state,
            overflowAdjust = state.overflowAdjust,
            padWidth, padHeight, padElContext, padding, scrollRangeFlags,
            overflow, scrollbarSize, contentW, contentH, ownerW, ownerH, scrollbars,
            xauto, yauto;

        if (manageOverflow && !state.secondPass && !me.reserveScrollbar) {
            // Determine the dimensions that have overflow:auto applied. If these come by
            // way of component config, this does not require a DOM read:
            if (owner.autoScroll) {
                xauto = yauto = true;
            } else {
                if (owner.overflowX) {
                    xauto = owner.overflowX == 'auto';
                } else {
                    overflow = ownerContext.targetContext.getStyle('overflow-x');
                    xauto = overflow && overflow != 'hidden' && overflow != 'scroll';
                }

                if (owner.overflowY) {
                    yauto = owner.overflowY == 'auto';
                } else {
                    overflow = ownerContext.targetContext.getStyle('overflow-y');
                    yauto = overflow && overflow != 'hidden' && overflow != 'scroll';
                }
            }

            // If the container layout is not using width, we don't need to adjust for the
            // vscroll (likewise for height). Perhaps we don't even need to run the layout
            // again if the adjustments won't have any effect on the result!
            if (!containerSize.gotWidth) {
                xauto = false;
            }
            if (!containerSize.gotHeight) {
                yauto = false;
            }

            if (xauto || yauto) {
                scrollbarSize = Ext.getScrollbarSize();

                // as a container we calculate contentWidth/Height, so we don't want
                // to use getProp and make it look like we are triggered by them...
                contentW = ownerContext.peek('contentWidth');
                contentH = ownerContext.peek('contentHeight');
                ownerW = containerSize.width;
                ownerH = containerSize.height;

                scrollbars = me.getScrollbarsNeeded(ownerW, ownerH, contentW, contentH);
                state.overflowState = scrollbars;

                if (typeof dimensions == 'number') {
                    scrollbars &= ~dimensions; // ignore dimensions that have no effect
                }

                overflowAdjust = {
                    width:  (xauto && (scrollbars & 2)) ? scrollbarSize.width : 0,
                    height: (yauto && (scrollbars & 1)) ? scrollbarSize.height : 0
                };

                // We can have 0-sized scrollbars (new Mac OS) and so don't invalidate
                // the layout unless this will change something...
                if (overflowAdjust.width !== me.lastOverflowAdjust.width || overflowAdjust.height !== me.lastOverflowAdjust.height) {
                    me.done = false;

                    // we pass overflowAdjust and overflowState in as state for the next
                    // cycle (these are discarded if one of our ownerCt's invalidates):
                    ownerContext.invalidate({
                        state: {
                            overflowAdjust: overflowAdjust,
                            overflowState: state.overflowState,
                            secondPass: true
                        }
                    });
                }
            }
        }

        if (!me.done) {
            return;
        }

        padElContext = ownerContext.padElContext ||
                      (ownerContext.padElContext = ownerContext.getEl('overflowPadderEl', me));

        // Even if overflow does not effect the layout, we still do need the padEl to be
        // sized or hidden appropriately...
        if (padElContext) {
            scrollbars = state.overflowState; // the true overflow state
            padWidth = containerSize.width;
            padHeight = 0;//  TODO me.padHeightAdj; // 0 or 1

            if (scrollbars) {
                padding = ownerContext.targetContext.getPaddingInfo();
                scrollRangeFlags = me.scrollRangeFlags;

                if ((scrollbars & 2) && (scrollRangeFlags & 1)) { // if (vscroll and loses bottom)
                    padHeight += padding.bottom;
                }

                if ((scrollbars & 1) && (scrollRangeFlags & 4)) { // if (hscroll and loses right)
                    padWidth += padding.right;
                }
                padElContext.setProp('display', '');
                padElContext.setSize(padWidth, padHeight);
            } else {
                padElContext.setProp('display', 'none');
            }
        }
    },

    /**
     * Adds layout's itemCls and owning Container's itemCls
     * @protected
     */
    configureItem: function(item) {
        var me = this,
            ownerItemCls = me.owner.itemCls,
            addClasses = [].concat(me.itemCls || []);

        me.callParent(arguments);

        if (ownerItemCls) {
            addClasses = Ext.Array.push(addClasses, ownerItemCls);
        }
        item.addCls(addClasses);
    },

    doRenderBody: function (out, renderData) {
        // Careful! This method is bolted on to the renderTpl so all we get for context is
        // the renderData! The "this" pointer is the renderTpl instance!

        this.renderItems(out, renderData);
        this.renderContent(out, renderData);
    },

    doRenderContainer: function (out, renderData) {
        // Careful! This method is bolted on to the renderTpl so all we get for context is
        // the renderData! The "this" pointer is the renderTpl instance!

        var me = renderData.$comp.layout,
            tpl = me.getRenderTpl(),
            data = me.getRenderData();

        tpl.applyOut(data, out);
    },

    doRenderItems: function (out, renderData) {
        // Careful! This method is bolted on to the renderTpl so all we get for context is
        // the renderData! The "this" pointer is the renderTpl instance!

        var me = renderData.$layout,
            tree = me.getRenderTree();

        if (tree) {
            Ext.DomHelper.generateMarkup(tree, out);
        }
    },

    /**
     * Creates an element that makes bottom/right body padding consistent across browsers.
     * This element is sized based on the need for scrollbars in {@link #calculateOverflow}.
     * If the {@link #manageOverflow} option is false, this element is not created.
     *
     * See {@link #getScrollRangeFlags} for more details.
     */
    doRenderPadder: function (out, renderData) {
        // Careful! This method is bolted on to the renderTpl so all we get for context is
        // the renderData! The "this" pointer is the renderTpl instance!

        var me = renderData.$layout,
            owner = me.owner,
            scrollRangeFlags = me.getScrollRangeFlags();

        if (me.manageOverflow == 2) {
            if (scrollRangeFlags & 5) { // if (loses parent bottom and/or right padding)
                out.push('<div id="',owner.id,'-overflowPadderEl" ',
                    'style="font-size: 1px; width:1px; height: 1px;');

                // We won't want the height of the padder to cause problems when we only
                // want to adjust for right padding, so we relatively position it up 1px so
                // its height of 1px will have no vertical effect. This trick does not work
                // on IE due to bugs (the effects are worse than the off-by-1px in scroll
                // height).
                //
                /* turns out this does not work on FF (5) either... TODO
                if (Ext.isIE || Ext.isGecko) {
                    me.padHeightAdj = 0;
                } else {
                    me.padHeightAdj = 1;
                    out.push('position: relative; top: -1px;');
                }/**/

                out.push('"></div>');

                me.scrollRangeFlags = scrollRangeFlags; // remember for calculateOverflow
            }
        }
    }, 

    finishRender: function () {
        var me = this,
            target, items;

        me.callParent();

        me.cacheElements();

        target = me.getRenderTarget();
        items = me.getLayoutItems();

        if (me.targetCls) {
            me.getTarget().addCls(me.targetCls);
        }

        me.finishRenderItems(target, items);
    },

    /**
     * @private
     * Called for every layout in the layout context after all the layouts have been finally flushed
     */
    notifyOwner: function() {
        this.owner.afterLayout(this);
    },

    /**
     * Returns the container size (that of the target). Only the fixed-sized dimensions can
     * be returned because the shrinkWrap dimensions are based on the contentWidth/Height
     * as determined by the container layout.
     *
     * If the {@link #calculateOverflow} method is used and if {@link #manageOverflow} is
     * true, this may adjust the width/height by the size of scrollbars.
     * 
     * @param {Ext.layout.ContextItem} ownerContext The owner's context item.
     * @param {Boolean} [inDom=false] True if the container size must be in the DOM.
     * @return {Object} The size
     * @return {Number} return.width The width
     * @return {Number} return.height The height
     * @protected
     */
    getContainerSize : function(ownerContext, inDom) {
        // Subtle But Important:
        // 
        // We don't want to call getProp/hasProp et.al. unless we in fact need that value
        // for our results! If we call it and don't need it, the layout manager will think
        // we depend on it and will schedule us again should it change.

        var targetContext = ownerContext.targetContext,
            frameInfo = targetContext.getFrameInfo(),
            padding = targetContext.getPaddingInfo(),
            got = 0,
            needed = 0,
            overflowAdjust = ownerContext.state.overflowAdjust,
            gotWidth, gotHeight, width, height;

        // In an shrinkWrap width/height case, we must not ask for any of these dimensions
        // because they will be determined by contentWidth/Height which is calculated by
        // this layout...

        // Fit/Card layouts are able to set just the width of children, allowing child's
        // resulting height to autosize the Container.
        // See examples/tabs/tabs.html for an example of this.

        if (!ownerContext.widthModel.shrinkWrap) {
            ++needed;
            width = inDom ? targetContext.getDomProp('width') : targetContext.getProp('width');
            gotWidth = (typeof width == 'number');
            if (gotWidth) {
                ++got;
                width -= frameInfo.width + padding.width;
                if (overflowAdjust) {
                    width -= overflowAdjust.width;
                }
            }
        }

        if (!ownerContext.heightModel.shrinkWrap) {
            ++needed;
            height = inDom ? targetContext.getDomProp('height') : targetContext.getProp('height');
            gotHeight = (typeof height == 'number');
            if (gotHeight) {
                ++got;
                height -= frameInfo.height + padding.height;
                if (overflowAdjust) {
                    height -= overflowAdjust.height;
                }
            }
        }

        return {
            width: width,
            height: height,
            needed: needed,
            got: got,
            gotAll: got == needed,
            gotWidth: gotWidth,
            gotHeight: gotHeight
        };
    },

    /**
     * Returns an array of child components either for a render phase (Performed in the beforeLayout
     * method of the layout's base class), or the layout phase (onLayout).
     * @return {Ext.Component[]} of child components
     */
    getLayoutItems: function() {
        var owner = this.owner,
            items = owner && owner.items;

        return (items && items.items) || [];
    },

    getRenderData: function () {
        var comp = this.owner;

        return {
            $comp: comp,
            $layout: this,
            ownerId: comp.id
        };
    },

    /**
     * @protected
     * Returns all items that are rendered
     * @return {Array} All matching items
     */
    getRenderedItems: function() {
        var me = this,
            target = me.getRenderTarget(),
            items = me.getLayoutItems(),
            ln = items.length,
            renderedItems = [],
            i, item;

        for (i = 0; i < ln; i++) {
            item = items[i];
            if (item.rendered && me.isValidParent(item, target, i)) {
                renderedItems.push(item);
            }
        }

        return renderedItems;
    },

    /**
     * Returns the element into which rendering must take place. Defaults to the owner Container's
     * target element.
     *
     * May be overridden in layout managers which implement an inner element.
     *
     * @return {Ext.Element}
     */
    getRenderTarget: function() {
        return this.owner.getTargetEl();
    },

    /**
     * Returns the element into which extra functional DOM elements can be inserted. Defaults to the owner Component's encapsulating element.
     *
     * May be overridden in Component layout managers which implement a {@link #getRenderTarget component render target} which must only
     * contain child components.
     * @return {Ext.Element}
     */
    getElementTarget: function() {
        return this.getRenderTarget();
    },

    getRenderTpl: function () {
        var me = this,
            renderTpl = Ext.XTemplate.getTpl(this, 'renderTpl');

        // Make sure all standard callout methods for the owner component are placed on the
        // XTemplate instance (but only once please):
        if (!renderTpl.renderContent) {
            me.owner.setupRenderTpl(renderTpl);
        }

        return renderTpl;
    },

    getRenderTree: function () {
        var result,
            items = this.owner.items,
            itemsGen,
            renderCfgs = {};
        
        do {
            itemsGen = items.generation;
            result = this.getItemsRenderTree(this.getLayoutItems(), renderCfgs);
        } while (items.generation !== itemsGen);
        return result;
    },

    getScrollbarsNeeded: function (width, height, contentWidth, contentHeight) {
        var scrollbarSize = Ext.getScrollbarSize(),
            hasWidth = typeof width == 'number',
            hasHeight = typeof height == 'number',
            needHorz = 0,
            needVert = 0;

        // No space-consuming scrollbars.
        if (!scrollbarSize.width) {
            return 0;
        }
        if (hasHeight && height < contentHeight) {
            needVert = 2;
            width -= scrollbarSize.width;
        }

        if (hasWidth && width < contentWidth) {
            needHorz = 1;
            if (!needVert && hasHeight) {
                height -= scrollbarSize.height;
                if (height < contentHeight) {
                    needVert = 2;
                }
            }
        }

        return needVert + needHorz;
    },

    /**
     * Returns flags indicating cross-browser handling of scrollHeight/Width. In particular,
     * IE has issues with padding-bottom in a scrolling element (it does not include that
     * padding in the scrollHeight). Also, margin-bottom on a child in a scrolling element
     * can be lost.
     * 
     * All browsers seem to ignore margin-right on children and padding-right on the parent
     * element (the one with the overflow)
     * 
     * This method returns a number with the follow bit positions set based on things not
     * accounted for in scrollHeight and scrollWidth:
     *
     *  - 1: Scrolling element's padding-bottom is not included in scrollHeight.
     *  - 2: Last child's margin-bottom is not included in scrollHeight.
     *  - 4: Scrolling element's padding-right is not included in scrollWidth.
     *  - 8: Child's margin-right is not included in scrollWidth.
     *
     * To work around the margin-bottom issue, it is sufficient to create a 0px tall last
     * child that will "hide" the margin. This can also be handled by wrapping the children
     * in an element, again "hiding" the margin. Wrapping the elements is about the only
     * way to preserve their right margins. This is the strategy used by Column layout.
     *
     * To work around the padding-bottom problem, since it is comes from a style on the
     * parent element, about the only simple fix is to create a last child with height
     * equal to padding-bottom. To preserve the right padding, the sizing element needs to
     * have a width that includes the right padding.
     */
    getScrollRangeFlags: (function () {
        var flags = -1;

        return function () {
            if (flags < 0) {
                var div = Ext.getBody().createChild({
                        //cls: 'x-border-box x-hide-offsets',
                        cls: Ext.baseCSSPrefix + 'border-box',
                        style: {
                            width: '100px', height: '100px', padding: '10px',
                            overflow: 'auto'
                        },
                        children: [{
                            style: {
                                border: '1px solid red',
                                width: '150px', height: '150px',
                                margin: '0 5px 5px 0' // TRBL
                            }
                        }]
                    }),
                    scrollHeight = div.dom.scrollHeight,
                    scrollWidth = div.dom.scrollWidth,
                    heightFlags = {
                        // right answer, nothing missing:
                        175: 0,
                        // missing parent padding-bottom:
                        165: 1,
                        // missing child margin-bottom:
                        170: 2,
                        // missing both
                        160: 3
                    },
                    widthFlags = {
                        // right answer, nothing missing:
                        175: 0,
                        // missing parent padding-right:
                        165: 4,
                        // missing child margin-right:
                        170: 8,
                        // missing both
                        160: 12
                    };

                flags = (heightFlags[scrollHeight] || 0) | (widthFlags[scrollWidth] || 0);
                //Ext.log('flags=',flags.toString(2));
                div.remove();
            }

            return flags;
        };
    }()),

    /**
     * Returns the owner component's resize element.
     * @return {Ext.Element}
     */
    getTarget: function() {
        return this.owner.getTargetEl();
    },

    /**
     * @protected
     * Returns all items that are both rendered and visible
     * @return {Array} All matching items
     */
    getVisibleItems: function() {
        var target   = this.getRenderTarget(),
            items = this.getLayoutItems(),
            ln = items.length,
            visibleItems = [],
            i, item;

        for (i = 0; i < ln; i++) {
            item = items[i];
            if (item.rendered && this.isValidParent(item, target, i) && item.hidden !== true) {
                visibleItems.push(item);
            }
        }

        return visibleItems;
    },

    setupRenderTpl: function (renderTpl) {
        var me = this;

        renderTpl.renderBody = me.doRenderBody;
        renderTpl.renderContainer = me.doRenderContainer;
        renderTpl.renderItems = me.doRenderItems;
        renderTpl.renderPadder = me.doRenderPadder;
    }
});

/**
 * @class Ext.layout.container.Auto
 *
 * The AutoLayout is the default layout manager delegated by {@link Ext.container.Container} to
 * render any child Components when no `{@link Ext.container.Container#layout layout}` is configured into
 * a `{@link Ext.container.Container Container}.` AutoLayout provides only a passthrough of any layout calls
 * to any child containers.
 *
 *     @example
 *     Ext.create('Ext.Panel', {
 *         width: 500,
 *         height: 280,
 *         title: "AutoLayout Panel",
 *         layout: 'auto',
 *         renderTo: document.body,
 *         items: [{
 *             xtype: 'panel',
 *             title: 'Top Inner Panel',
 *             width: '75%',
 *             height: 90
 *         },
 *         {
 *             xtype: 'panel',
 *             title: 'Bottom Inner Panel',
 *             width: '75%',
 *             height: 90
 *         }]
 *     });
 */
Ext.define('Ext.layout.container.Auto', {

    /* Begin Definitions */

    alias: ['layout.auto', 'layout.autocontainer'],

    extend: 'Ext.layout.container.Container',

    /* End Definitions */

    type: 'autocontainer',

    childEls: [
        'clearEl'
    ],

    renderTpl: [
        '{%this.renderBody(out,values)%}',
        // clear element is needed to prevent the bottom margins of the last child element from collapsing
        '<div id="{ownerId}-clearEl" class="', Ext.baseCSSPrefix, 'clear" role="presentation"></div>'
    ],

    // TODO - do we need to clear sizes in beginLayout?

    calculate: function(ownerContext) {
        var me = this,
            containerSize;

        if (!ownerContext.hasDomProp('containerChildrenDone')) {
            me.done = false;
        } else {
            // Once the child layouts are done we can determine the content sizes...
            containerSize = me.getContainerSize(ownerContext);
            if (!containerSize.gotAll) {
                me.done = false;
            }

            me.calculateContentSize(ownerContext);
        }
    }
});





/**
 * This is a layout that enables anchoring of contained elements relative to the container's dimensions.
 * If the container is resized, all anchored items are automatically rerendered according to their
 * `{@link #anchor}` rules.
 *
 * This class is intended to be extended or created via the {@link Ext.container.AbstractContainer#layout layout}: 'anchor' 
 * config, and should generally not need to be created directly via the new keyword.
 * 
 * AnchorLayout does not have any direct config options (other than inherited ones). By default,
 * AnchorLayout will calculate anchor measurements based on the size of the container itself. However, the
 * container using the AnchorLayout can supply an anchoring-specific config property of `anchorSize`.
 *
 * If anchorSize is specifed, the layout will use it as a virtual container for the purposes of calculating
 * anchor measurements based on it instead, allowing the container to be sized independently of the anchoring
 * logic if necessary.
 *
 *     @example
 *     Ext.create('Ext.Panel', {
 *         width: 500,
 *         height: 400,
 *         title: "AnchorLayout Panel",
 *         layout: 'anchor',
 *         renderTo: Ext.getBody(),
 *         items: [
 *             {
 *                 xtype: 'panel',
 *                 title: '75% Width and 20% Height',
 *                 anchor: '75% 20%'
 *             },
 *             {
 *                 xtype: 'panel',
 *                 title: 'Offset -300 Width & -200 Height',
 *                 anchor: '-300 -200'		
 *             },
 *             {
 *                 xtype: 'panel',
 *                 title: 'Mixed Offset and Percent',
 *                 anchor: '-250 20%'
 *             }
 *         ]
 *     });
 */
Ext.define('Ext.layout.container.Anchor', {

    /* Begin Definitions */

    alias: 'layout.anchor',
    extend: 'Ext.layout.container.Container',
    alternateClassName: 'Ext.layout.AnchorLayout',

    /* End Definitions */

    type: 'anchor',

    manageOverflow: 2,

    renderTpl: [
        '{%this.renderBody(out,values);this.renderPadder(out,values)%}'
    ],

    /**
     * @cfg {String} anchor
     *
     * This configuation option is to be applied to **child `items`** of a container managed by
     * this layout (ie. configured with `layout:'anchor'`).
     *
     * This value is what tells the layout how an item should be anchored to the container. `items`
     * added to an AnchorLayout accept an anchoring-specific config property of **anchor** which is a string
     * containing two values: the horizontal anchor value and the vertical anchor value (for example, '100% 50%').
     * The following types of anchor values are supported:
     *
     * - **Percentage** : Any value between 1 and 100, expressed as a percentage.
     *
     *   The first anchor is the percentage width that the item should take up within the container, and the
     *   second is the percentage height.  For example:
     *
     *       // two values specified
     *       anchor: '100% 50%' // render item complete width of the container and
     *                          // 1/2 height of the container
     *       // one value specified
     *       anchor: '100%'     // the width value; the height will default to auto
     *
     * - **Offsets** : Any positive or negative integer value.
     *
     *   This is a raw adjustment where the first anchor is the offset from the right edge of the container,
     *   and the second is the offset from the bottom edge. For example:
     *
     *       // two values specified
     *       anchor: '-50 -100' // render item the complete width of the container
     *                          // minus 50 pixels and
     *                          // the complete height minus 100 pixels.
     *       // one value specified
     *       anchor: '-50'      // anchor value is assumed to be the right offset value
     *                          // bottom offset will default to 0
     *
     * - **Sides** : Valid values are `right` (or `r`) and `bottom` (or `b`).
     *
     *   Either the container must have a fixed size or an anchorSize config value defined at render time in
     *   order for these to have any effect.
     *   
     * - **Mixed** :
     *
     *   Anchor values can also be mixed as needed.  For example, to render the width offset from the container
     *   right edge by 50 pixels and 75% of the container's height use:
     *   
     *       anchor:   '-50 75%'
     */

    /**
     * @cfg {String} defaultAnchor
     * Default anchor for all child **container** items applied if no anchor or specific width is set on the child item.
     */
    defaultAnchor: '100%',

    parseAnchorRE: /^(r|right|b|bottom)$/i,

    beginLayout: function (ownerContext) {
        var me = this,
            dimensions = 0,
            anchorSpec, childContext, childItems, i, length, target;

        me.callParent(arguments);

        childItems = ownerContext.childItems; // populated by callParent
        length = childItems.length;

        for (i = 0; i < length; ++i) {
            childContext = childItems[i];
            anchorSpec = childContext.target.anchorSpec;

            if (anchorSpec) {
                if (childContext.widthModel.calculated && anchorSpec.right) {
                    dimensions |= 1;
                }
                if (childContext.heightModel.calculated && anchorSpec.bottom) {
                    dimensions |= 2;
                }

                if (dimensions == 3) { // if (both dimensions in play)
                    break;
                }
            }
        }

        ownerContext.anchorDimensions = dimensions;

        // Work around WebKit RightMargin bug. We're going to inline-block all the children
        // only ONCE and remove it when we're done
        if (!Ext.supports.RightMargin && !me.rightMarginCleanerFn) {
            target = ownerContext.targetContext.el; // targetContext is added by superclass

            me.rightMarginCleanerFn = Ext.Element.getRightMarginFixCleaner(target);
            target.addCls(Ext.baseCSSPrefix + 'inline-children');
        }

        me.sanityCheck(ownerContext);
    },

    calculate: function (ownerContext) {
        var me = this,
            containerSize = me.getContainerSize(ownerContext);

        if (ownerContext.anchorDimensions !== ownerContext.state.calculatedAnchors) {
            me.calculateAnchors(ownerContext, containerSize);
        }

        if (ownerContext.hasDomProp('containerChildrenDone')) {
            // Once the child layouts are done we can determine the content sizes...

            if (!containerSize.gotAll) {
                me.done = false;
            }

            me.calculateContentSize(ownerContext, ownerContext.anchorDimensions);

            if (me.done) {
                me.calculateOverflow(ownerContext, containerSize, ownerContext.anchorDimensions);
                return;
            }
        }

        me.done = false;
    },

    calculateAnchors: function (ownerContext, containerSize) {
        var me = this,
            childItems = ownerContext.childItems,
            length = childItems.length,
            gotHeight = containerSize.gotHeight,
            gotWidth = containerSize.gotWidth,
            ownerHeight = containerSize.height,
            ownerWidth = containerSize.width,
            state = ownerContext.state,
            calculatedAnchors = (gotWidth ? 1 : 0) | (gotHeight ? 2 : 0),
            anchorSpec, childContext, childMargins, height, i, width;

        state.calculatedAnchors = (state.calculatedAnchors || 0) | calculatedAnchors;

        for (i = 0; i < length; i++) {
            childContext = childItems[i];
            childMargins = childContext.getMarginInfo();
            anchorSpec = childContext.target.anchorSpec;

            // Check widthModel in case "defaults" has applied an anchor to a component
            // that also has width (which must win). If we did not make this check in this
            // way, we would attempt to calculate a width where it had been configured.
            //
            if (gotWidth && childContext.widthModel.calculated) {
                width = anchorSpec.right(ownerWidth) - childMargins.width;
                width = me.adjustWidthAnchor(width, childContext);

                childContext.setWidth(width);
            }

            // Repeat for height
            if (gotHeight && childContext.heightModel.calculated) {
                height = anchorSpec.bottom(ownerHeight) - childMargins.height;
                height = me.adjustHeightAnchor(height, childContext);

                childContext.setHeight(height);
            }
        }
    },

    finishedLayout: function (ownerContext) {
        var cleanerFn = this.rightMarginCleanerFn;

        if (cleanerFn) {
            delete this.rightMarginCleanerFn;
            ownerContext.targetContext.el.removeCls(Ext.baseCSSPrefix + 'inline-children');
            cleanerFn();
        }
    },

    sanityCheck: function (ownerContext) {
        var shrinkWrapWidth = ownerContext.widthModel.shrinkWrap,
            shrinkWrapHeight = ownerContext.heightModel.shrinkWrap,
            children = ownerContext.childItems,
            anchorSpec, comp, childContext,
            i, length;

        for (i = 0, length = children.length; i < length; ++i) {
            childContext = children[i];
            comp = childContext.target;
            anchorSpec = comp.anchorSpec;

            if (anchorSpec) {
                if (childContext.widthModel.calculated && anchorSpec.right) {
                    if (shrinkWrapWidth) {
                        Ext.log({
                            level: 'warn',
                            msg: 'Right anchor on '+comp.id+' in shrinkWrap width container'
                        });
                    }
                }

                if (childContext.heightModel.calculated && anchorSpec.bottom) {
                    if (shrinkWrapHeight) {
                        Ext.log({
                            level: 'warn',
                            msg: 'Bottom anchor on '+comp.id+' in shrinkWrap height container'
                        });
                    }
                }
            }
        }
    },

    // private
    anchorFactory: {
        offset: function (delta) {
            return function(v) {
                return v + delta;
            };
        },
        ratio: function (ratio) {
            return function(v) {
                return Math.floor(v * ratio);
            };
        },
        standard: function (diff) {
            return function(v) {
                return v - diff;
            };
        }
    },

    parseAnchor: function(a, start, cstart) {
        if (a && a != 'none') {
            var factory = this.anchorFactory,
                delta;

            if (this.parseAnchorRE.test(a)) {
                return factory.standard(cstart - start);
            }    
            if (a.indexOf('%') != -1) {
                return factory.ratio(parseFloat(a.replace('%', '')) * 0.01);
            }    
            delta = parseInt(a, 10);
            if (!isNaN(delta)) {
                return factory.offset(delta);
            }
        }
        return null;
    },

    // private
    adjustWidthAnchor: function(value, childContext) {
        return value;
    },

    // private
    adjustHeightAnchor: function(value, childContext) {
        return value;
    },

    configureItem: function(item) {
        var me = this,
            owner = me.owner,
            anchor= item.anchor,
            anchorsArray,
            anchorWidth,
            anchorHeight;

        me.callParent(arguments);

        if (!item.anchor && item.items && !Ext.isNumber(item.width) && !(Ext.isIE6 && Ext.isStrict)) {
            item.anchor = anchor = me.defaultAnchor;
        }

        /**
         * @cfg {Number/Object} anchorSize
         * Defines the anchoring size of container.
         * Either a number to define the width of the container or an object with `width` and `height` fields.
         * @member Ext.container.Container
         */ 
        if (owner.anchorSize) {
            if (typeof owner.anchorSize == 'number') {
                anchorWidth = owner.anchorSize;
            } else {
                anchorWidth = owner.anchorSize.width;
                anchorHeight = owner.anchorSize.height;
            }
        } else {
            anchorWidth = owner.initialConfig.width;
            anchorHeight = owner.initialConfig.height;
        }

        if (anchor) {
            // cache all anchor values
            anchorsArray = anchor.split(' ');
            item.anchorSpec = {
                right: me.parseAnchor(anchorsArray[0], item.initialConfig.width, anchorWidth),
                bottom: me.parseAnchor(anchorsArray[1], item.initialConfig.height, anchorHeight)
            };
        }
    },

    sizePolicy: {
        '': {
            setsWidth: 0,
            setsHeight: 0
        },
        b: {
            setsWidth: 0,
            setsHeight: 1
        },
        r: {
            '': {
                setsWidth: 1,
                setsHeight: 0
            },
            b: {
                setsWidth: 1,
                setsHeight: 1

            }
        }
    },

    getItemSizePolicy: function (item) {
        var anchorSpec = item.anchorSpec,
            key = '',
            policy = this.sizePolicy,
            sizeModel;

        if (anchorSpec) {
            sizeModel = this.owner.getSizeModel();
            if (anchorSpec.right && !sizeModel.width.shrinkWrap) {
                policy = policy.r;
            }
            if (anchorSpec.bottom && !sizeModel.height.shrinkWrap) {
                key = 'b';
            }
        }

        return policy[key];
    }
});



/**
 * This is a layout that inherits the anchoring of {@link Ext.layout.container.Anchor} and adds the
 * ability for x/y positioning using the standard x and y component config options.
 *
 * This class is intended to be extended or created via the {@link Ext.container.Container#layout layout}
 * configuration property.  See {@link Ext.container.Container#layout} for additional details.
 *
 *     @example
 *     Ext.create('Ext.form.Panel', {
 *         title: 'Absolute Layout',
 *         width: 300,
 *         height: 275,
 *         layout: {
 *             type: 'absolute'
 *             // layout-specific configs go here
 *             //itemCls: 'x-abs-layout-item',
 *         },
 *         url:'save-form.php',
 *         defaultType: 'textfield',
 *         items: [{
 *             x: 10,
 *             y: 10,
 *             xtype:'label',
 *             text: 'Send To:'
 *         },{
 *             x: 80,
 *             y: 10,
 *             name: 'to',
 *             anchor:'90%'  // anchor width by percentage
 *         },{
 *             x: 10,
 *             y: 40,
 *             xtype:'label',
 *             text: 'Subject:'
 *         },{
 *             x: 80,
 *             y: 40,
 *             name: 'subject',
 *             anchor: '90%'  // anchor width by percentage
 *         },{
 *             x:0,
 *             y: 80,
 *             xtype: 'textareafield',
 *             name: 'msg',
 *             anchor: '100% 100%'  // anchor width and height
 *         }],
 *         renderTo: Ext.getBody()
 *     });
 */
Ext.define('Ext.layout.container.Absolute', {

    /* Begin Definitions */

    alias: 'layout.absolute',
    extend: 'Ext.layout.container.Anchor',
    alternateClassName: 'Ext.layout.AbsoluteLayout',

    /* End Definitions */

    targetCls: Ext.baseCSSPrefix + 'abs-layout-ct',
    itemCls: Ext.baseCSSPrefix + 'abs-layout-item',

    /**
     * @cfg {Boolean} ignoreOnContentChange
     * True indicates that changes to one item in this layout do not effect the layout in
     * general. This may need to be set to false if {@link Ext.Component#autoScroll}
     * is enabled for the container.
     */
    ignoreOnContentChange: true,

    type: 'absolute',

    // private
    adjustWidthAnchor: function(value, childContext) {
        var padding = this.targetPadding,
            x = childContext.getStyle('left');

        return value - x + padding.left;
    },

    // private
    adjustHeightAnchor: function(value, childContext) {
        var padding = this.targetPadding,
            y = childContext.getStyle('top');

        return value - y + padding.top;
    },

    isItemLayoutRoot: function (item) {
        return this.ignoreOnContentChange || this.callParent(arguments);
    },

    isItemShrinkWrap: function (item) {
        return true;
    },

    beginLayout: function (ownerContext) {
        var me = this,
            target = me.getTarget();

        me.callParent(arguments);

        // Do not set position: relative; when the absolute layout target is the body
        if (target.dom !== document.body) {
            target.position();
        }

        me.targetPadding = ownerContext.targetContext.getPaddingInfo();
    },

    isItemBoxParent: function (itemContext) {
        return true;
    },

    onContentChange: function () {
        if (this.ignoreOnContentChange) {
            return false;
        }
        return this.callParent(arguments);
    }
});

/**
 * This layout implements the column arrangement for {@link Ext.form.CheckboxGroup} and {@link Ext.form.RadioGroup}.
 * It groups the component's sub-items into columns based on the component's
 * {@link Ext.form.CheckboxGroup#columns columns} and {@link Ext.form.CheckboxGroup#vertical} config properties.
 */
Ext.define('Ext.layout.container.CheckboxGroup', {
    extend: 'Ext.layout.container.Container',
    alias: ['layout.checkboxgroup'],

    /**
     * @cfg {Boolean} [autoFlex=true]
     * By default,  CheckboxGroup allocates all available space to the configured columns meaning that
     * column are evenly spaced across the container.
     *
     * To have each column only be wide enough to fit the container Checkboxes (or Radios), set `autoFlex` to `false`
     */
    autoFlex: true,

    type: 'checkboxgroup',

    childEls: [
        'innerCt'
    ],

    renderTpl: [
        '<table id="{ownerId}-innerCt" role="presentation" style="{tableStyle}"><tbody><tr>',
            '<tpl for="columns">',
                '<td class="{parent.colCls}" valign="top" style="{style}">',
                    '{% this.renderColumn(out,parent,xindex-1) %}',
                '</td>',
            '</tpl>',
        '</tr></tbody></table>'
    ],

    lastOwnerItemsGeneration : null,

    beginLayout: function(ownerContext) {
        var me = this,
            columns,
            numCols,
            i, width, cwidth,
            totalFlex = 0, flexedCols = 0,
            autoFlex = me.autoFlex,
            innerCtStyle = me.innerCt.dom.style;

        me.callParent(arguments);

        columns = me.columnNodes;
        ownerContext.innerCtContext = ownerContext.getEl('innerCt', me);

        // The columns config may be an array of widths. Any value < 1 is taken to be a fraction:
        if (!ownerContext.widthModel.shrinkWrap) {
            numCols = columns.length;

            // If columns is an array of numeric widths
            if (me.columnsArray) {

                // first calculate total flex
                for (i = 0; i < numCols; i++) {
                    width = me.owner.columns[i];
                    if (width < 1) {
                        totalFlex += width;
                        flexedCols++;
                    }
                }

                // now apply widths
                for (i = 0; i < numCols; i++) {
                    width = me.owner.columns[i];
                    if (width < 1) {
                        cwidth = ((width / totalFlex) * 100) + '%';
                    } else {
                        cwidth = width + 'px';
                    }
                    columns[i].style.width = cwidth;
                }
            }

            // Otherwise it's the *number* of columns, so distributed the widths evenly
            else {
                for (i = 0; i < numCols; i++) {
                    // autoFlex: true will automatically calculate % widths
                    // autoFlex: false allows the table to decide (shrinkWrap, in effect)
                    // on a per-column basis
                    cwidth = autoFlex
                        ? (1 / numCols * 100) + '%'
                        : '';
                    columns[i].style.width = cwidth;
                    flexedCols++;
                }
            }

            // no flexed cols -- all widths are fixed
            if (!flexedCols) {
                innerCtStyle.tableLayout = 'fixed';
                innerCtStyle.width = '';
            // some flexed cols -- need to fix some
            } else if (flexedCols < numCols) {
                innerCtStyle.tableLayout = 'fixed';
                innerCtStyle.width = '100%';
            // let the table decide
            } else {
                innerCtStyle.tableLayout = 'auto';
                // if autoFlex, fill available space, else compact down
                if (autoFlex) {
                    innerCtStyle.width = '100%';
                } else {
                    innerCtStyle.width = '';
                }
            }

        } else {
            innerCtStyle.tableLayout = 'auto';
            innerCtStyle.width = '';
        }
    },

    cacheElements: function () {
        var me = this;

        // Grab defined childEls
        me.callParent();

        me.rowEl = me.innerCt.down('tr');

        // Grab columns TDs
        me.columnNodes = me.rowEl.dom.childNodes;
    },

    /*
     * Just wait for the child items to all lay themselves out in the width we are configured
     * to make available to them. Then we can measure our height.
     */
    calculate: function(ownerContext) {
        var me = this,
            targetContext, widthShrinkWrap, heightShrinkWrap, shrinkWrap, table, targetPadding;

        // The columnNodes are widthed using their own width attributes, we just need to wait
        // for all children to have arranged themselves in that width, and then collect our height.
        if (!ownerContext.getDomProp('containerChildrenDone')) {
            me.done = false;
        } else {
            targetContext = ownerContext.innerCtContext;
            widthShrinkWrap = ownerContext.widthModel.shrinkWrap;
            heightShrinkWrap = ownerContext.heightModel.shrinkWrap;
            shrinkWrap = heightShrinkWrap || widthShrinkWrap;
            table = targetContext.el.dom;
            targetPadding = shrinkWrap && targetContext.getPaddingInfo();

            if (widthShrinkWrap) {
                ownerContext.setContentWidth(table.offsetWidth + targetPadding.width, true);
            }

            if (heightShrinkWrap) {
                ownerContext.setContentHeight(table.offsetHeight + targetPadding.height, true);
            }
        }
    },

    doRenderColumn: function (out, renderData, columnIndex) {
        // Careful! This method is bolted on to the renderTpl so all we get for context is
        // the renderData! The "this" pointer is the renderTpl instance!

        var me = renderData.$layout,
            owner = me.owner,
            columnCount = renderData.columnCount,
            items = owner.items.items,
            itemCount = items.length,
            item, itemIndex, rowCount, increment, tree;

        // Example:
        //      columnCount = 3
        //      items.length = 10

        if (owner.vertical) {
            //        0   1   2
            //      +---+---+---+
            //    0 | 0 | 4 | 8 |
            //      +---+---+---+
            //    1 | 1 | 5 | 9 |
            //      +---+---+---+
            //    2 | 2 | 6 |   |
            //      +---+---+---+
            //    3 | 3 | 7 |   |
            //      +---+---+---+

            rowCount = Math.ceil(itemCount / columnCount); // = 4
            itemIndex = columnIndex * rowCount;
            itemCount = Math.min(itemCount, itemIndex + rowCount);
            increment = 1;
        } else {
            //        0   1   2
            //      +---+---+---+
            //    0 | 0 | 1 | 2 |
            //      +---+---+---+
            //    1 | 3 | 4 | 5 |
            //      +---+---+---+
            //    2 | 6 | 7 | 8 |
            //      +---+---+---+
            //    3 | 9 |   |   |
            //      +---+---+---+

            itemIndex = columnIndex;
            increment = columnCount;
        }

        for ( ; itemIndex < itemCount; itemIndex += increment) {
            item = items[itemIndex];
            me.configureItem(item);
            tree = item.getRenderTree();
            Ext.DomHelper.generateMarkup(tree, out);
        }
    },

    /**
     * Returns the number of columns in the checkbox group.
     * @private
     */
    getColumnCount: function() {
        var me = this,
            owner = me.owner,
            ownerColumns = owner.columns;

        // Our columns config is an array of numeric widths.
        // Calculate our total width
        if (me.columnsArray) {
            return ownerColumns.length;
        }

        if (Ext.isNumber(ownerColumns)) {
            return ownerColumns;
        }
        return owner.items.length;
    },

    getItemSizePolicy: function (item) {
        return this.autoSizePolicy;
    },

    getRenderData: function () {
        var me = this,
            data = me.callParent(),
            owner = me.owner,
            i, columns = me.getColumnCount(),
            width, column, cwidth,
            autoFlex = me.autoFlex,
            totalFlex = 0, flexedCols = 0;

        // calculate total flex
        if (me.columnsArray) {
            for (i=0; i < columns; i++) {
                width = me.owner.columns[i];
                if (width < 1) {
                    totalFlex += width;
                    flexedCols++;
                }
            }
        }

        data.colCls = owner.groupCls;
        data.columnCount = columns;

        data.columns = [];
        for (i = 0; i < columns; i++) {
            column = (data.columns[i] = {});

            if (me.columnsArray) {
                width = me.owner.columns[i];
                if (width < 1) {
                    cwidth = ((width / totalFlex) * 100) + '%';
                } else {
                    cwidth = width + 'px';
                }
                column.style = 'width:' + cwidth;
            } else {
                column.style = 'width:' + (1 / columns * 100) + '%';
                flexedCols++;
            }
        }

        // If the columns config was an array of column widths, allow table to auto width
        data.tableStyle =
            !flexedCols ? 'table-layout:fixed;' :
            (flexedCols < columns) ? 'table-layout:fixed;width:100%' :
            (autoFlex) ? 'table-layout:auto;width:100%' : 'table-layout:auto;';

        return data;
    },

    initLayout: function () {
        var me = this,
            owner = me.owner;

        me.columnsArray = Ext.isArray(owner.columns);
        me.autoColumns = !owner.columns || owner.columns === 'auto';
        me.vertical = owner.vertical;

        me.callParent();
    },

    // Always valid. beginLayout ensures the encapsulating elements of all children are in the correct place
    isValidParent: function() {
        return true;
    },

    setupRenderTpl: function (renderTpl) {
        this.callParent(arguments);

        renderTpl.renderColumn = this.doRenderColumn;
    },

    renderChildren: function () {
        var me = this,
            generation = me.owner.items.generation;

        if (me.lastOwnerItemsGeneration !== generation) {
            me.lastOwnerItemsGeneration = generation;
            me.renderItems(me.getLayoutItems());
        }
    },

    /**
     * Iterates over all passed items, ensuring they are rendered.  If the items are already rendered,
     * also determines if the items are in the proper place in the dom.
     * @protected
     */
    renderItems : function(items) {
        var me = this,
            itemCount = items.length,
            i,
            item,
            rowCount,
            columnCount,
            rowIndex,
            columnIndex;

        if (itemCount) {
            Ext.suspendLayouts();

            if (me.autoColumns) {
                me.addMissingColumns(itemCount);
            }

            columnCount = me.columnNodes.length;
            rowCount = Math.ceil(itemCount / columnCount);

            for (i = 0; i < itemCount; i++) {
                item = items[i];
                rowIndex = me.getRenderRowIndex(i, rowCount, columnCount);
                columnIndex = me.getRenderColumnIndex(i, rowCount, columnCount);

                if (!item.rendered) {
                    me.renderItem(item, rowIndex, columnIndex);
                } else if (!me.isItemAtPosition(item, rowIndex, columnIndex)) {
                    me.moveItem(item, rowIndex, columnIndex);
                }
            }

            if (me.autoColumns) {
                me.removeExceedingColumns(itemCount);
            }

            Ext.resumeLayouts(true);
        }
    },

    isItemAtPosition : function(item, rowIndex, columnIndex) {
        return item.el.dom === this.getNodeAt(rowIndex, columnIndex);
    },

    getRenderColumnIndex : function(itemIndex, rowCount, columnCount) {
        if (this.vertical) {
            return Math.floor(itemIndex / rowCount);
        } else {
            return itemIndex % columnCount;
        }
    },

    getRenderRowIndex : function(itemIndex, rowCount, columnCount) {
        var me = this;
        if (me.vertical) {
            return itemIndex % rowCount;
        } else {
            return Math.floor(itemIndex / columnCount);
        }
    },

    getNodeAt : function(rowIndex, columnIndex) {
        return this.columnNodes[columnIndex].childNodes[rowIndex];
    },

    addMissingColumns : function(itemsCount) {
        var me = this,
            existingColumnsCount = me.columnNodes.length,
            missingColumnsCount,
            row,
            cls,
            i;
        if (existingColumnsCount < itemsCount) {
            missingColumnsCount = itemsCount - existingColumnsCount;
            row = me.rowEl;
            cls = me.owner.groupCls;
            for (i = 0; i < missingColumnsCount; i++) {
                row.createChild({
                    cls: cls,
                    tag: 'td',
                    vAlign: 'top'
                });
            }
        }
    },

    removeExceedingColumns : function(itemsCount) {
        var me = this,
            existingColumnsCount = me.columnNodes.length,
            exceedingColumnsCount,
            row,
            i;
        if (existingColumnsCount > itemsCount) {
            exceedingColumnsCount = existingColumnsCount - itemsCount;
            row = me.rowEl;
            for (i = 0; i < exceedingColumnsCount; i++) {
                row.last().remove();
            }
        }
    },

    /**
     * Renders the given Component into the specified row and column
     * @param {Ext.Component} item The Component to render
     * @param {number} rowIndex row index
     * @param {number} columnIndex column index
     * @private
     */
    renderItem : function(item, rowIndex, columnIndex) {
        var me = this;

        me.configureItem(item);
        item.render(Ext.get(me.columnNodes[columnIndex]), rowIndex);
        me.afterRenderItem(item);
    },

    /**
     * Moves the given already rendered Component to the specified row and column
     * @param {Ext.Component} item The Component to move
     * @param {number} rowIndex row index
     * @param {number} columnIndex column index
     * @private
     */
    moveItem : function(item, rowIndex, columnIndex) {
        var me = this,
            column = me.columnNodes[columnIndex],
            targetNode = column.childNodes[rowIndex];
        column.insertBefore(item.el.dom, targetNode || null);
    }

});



/**
 * This is the layout style of choice for creating structural layouts in a multi-column format where the width of each
 * column can be specified as a percentage or fixed width, but the height is allowed to vary based on the content. This
 * class is intended to be extended or created via the layout:'column' {@link Ext.container.Container#layout} config,
 * and should generally not need to be created directly via the new keyword.
 *
 * ColumnLayout does not have any direct config options (other than inherited ones), but it does support a specific
 * config property of `columnWidth` that can be included in the config of any panel added to it. The layout will use
 * the columnWidth (if present) or width of each panel during layout to determine how to size each panel. If width or
 * columnWidth is not specified for a given panel, its width will default to the panel's width (or auto).
 *
 * The width property is always evaluated as pixels, and must be a number greater than or equal to 1. The columnWidth
 * property is always evaluated as a percentage, and must be a decimal value greater than 0 and less than 1 (e.g., .25).
 *
 * The basic rules for specifying column widths are pretty simple. The logic makes two passes through the set of
 * contained panels. During the first layout pass, all panels that either have a fixed width or none specified (auto)
 * are skipped, but their widths are subtracted from the overall container width.
 *
 * During the second pass, all panels with columnWidths are assigned pixel widths in proportion to their percentages
 * based on the total **remaining** container width. In other words, percentage width panels are designed to fill
 * the space left over by all the fixed-width and/or auto-width panels. Because of this, while you can specify any
 * number of columns with different percentages, the columnWidths must always add up to 1 (or 100%) when added
 * together, otherwise your layout may not render as expected.
 *
 *     @example
 *     // All columns are percentages -- they must add up to 1
 *     Ext.create('Ext.panel.Panel', {
 *         title: 'Column Layout - Percentage Only',
 *         width: 350,
 *         height: 250,
 *         layout:'column',
 *         items: [{
 *             title: 'Column 1',
 *             columnWidth: 0.25
 *         },{
 *             title: 'Column 2',
 *             columnWidth: 0.55
 *         },{
 *             title: 'Column 3',
 *             columnWidth: 0.20
 *         }],
 *         renderTo: Ext.getBody()
 *     });
 *
 *     // Mix of width and columnWidth -- all columnWidth values must add up
 *     // to 1. The first column will take up exactly 120px, and the last two
 *     // columns will fill the remaining container width.
 *
 *     Ext.create('Ext.Panel', {
 *         title: 'Column Layout - Mixed',
 *         width: 350,
 *         height: 250,
 *         layout:'column',
 *         items: [{
 *             title: 'Column 1',
 *             width: 120
 *         },{
 *             title: 'Column 2',
 *             columnWidth: 0.7
 *         },{
 *             title: 'Column 3',
 *             columnWidth: 0.3
 *         }],
 *         renderTo: Ext.getBody()
 *     });
 */
Ext.define('Ext.layout.container.Column', {

    extend: 'Ext.layout.container.Container',
    alias: ['layout.column'],
    alternateClassName: 'Ext.layout.ColumnLayout',

    type: 'column',

    itemCls: Ext.baseCSSPrefix + 'column',

    targetCls: Ext.baseCSSPrefix + 'column-layout-ct',

    // Columns with a columnWidth have their width managed.
    columnWidthSizePolicy: {
        setsWidth: 1,
        setsHeight: 0
    },

    childEls: [
        'innerCt'
    ],

    manageOverflow: 2,

    renderTpl: [
        '<div id="{ownerId}-innerCt" class="',Ext.baseCSSPrefix,'column-inner">',
            '{%this.renderBody(out,values)%}',
            '<div class="',Ext.baseCSSPrefix,'clear"></div>',
        '</div>',
        '{%this.renderPadder(out,values)%}'
    ],

    getItemSizePolicy: function (item) {
        if (item.columnWidth) {
            return this.columnWidthSizePolicy;
        }
        return this.autoSizePolicy;
    },

    beginLayout: function() {
        this.callParent(arguments);
        this.innerCt.dom.style.width = '';
    },

    calculate: function (ownerContext) {
        var me = this,
            containerSize = me.getContainerSize(ownerContext),
            state = ownerContext.state;

        if (state.calculatedColumns || (state.calculatedColumns = me.calculateColumns(ownerContext))) {
            if (me.calculateHeights(ownerContext)) {
                me.calculateOverflow(ownerContext, containerSize);
                return;
            }
        }

        me.done = false;
    },

    calculateColumns: function (ownerContext) {
        var me = this,
            containerSize = me.getContainerSize(ownerContext),
            innerCtContext = ownerContext.getEl('innerCt', me),
            items = ownerContext.childItems,
            len = items.length,
            contentWidth = 0,
            blocked, availableWidth, i, itemContext, itemMarginWidth, itemWidth;

        // Can never decide upon necessity of vertical scrollbar (and therefore, narrower
        // content width) until the component layout has published a height for the target
        // element.
        if (!ownerContext.heightModel.shrinkWrap && !ownerContext.targetContext.hasProp('height')) {
            return false;
        }

        // No parallel measurement, cannot lay out boxes.
        if (!containerSize.gotWidth) { //\\ TODO: Deal with target padding width
            ownerContext.targetContext.block(me, 'width');
            blocked = true;
        } else {
            availableWidth = containerSize.width;

            innerCtContext.setWidth(availableWidth);
        }

        // we need the widths of the columns we don't manage to proceed so we block on them
        // if they are not ready...
        for (i = 0; i < len; ++i) {
            itemContext = items[i];

            // this is needed below for non-calculated columns, but is also needed in the
            // next loop for calculated columns... this way we only call getMarginInfo in
            // this loop and use the marginInfo property in the next...
            itemMarginWidth = itemContext.getMarginInfo().width;

            if (!itemContext.widthModel.calculated) {
                itemWidth = itemContext.getProp('width');
                if (typeof itemWidth != 'number') {
                    itemContext.block(me, 'width');
                    blocked = true;
                }

                contentWidth += itemWidth + itemMarginWidth;
            }
        }

        if (!blocked) {
            availableWidth = (availableWidth < contentWidth) ? 0 : availableWidth - contentWidth;

            for (i = 0; i < len; ++i) {
                itemContext = items[i];
                if (itemContext.widthModel.calculated) {
                    itemMarginWidth = itemContext.marginInfo.width; // always set by above loop
                    itemWidth = itemContext.target.columnWidth;
                    itemWidth = Math.floor(itemWidth * availableWidth) - itemMarginWidth;
                    itemWidth = itemContext.setWidth(itemWidth); // constrains to min/maxWidth
                    contentWidth += itemWidth + itemMarginWidth;
                }
            }

            ownerContext.setContentWidth(contentWidth);
        }

        // we registered all the values that block this calculation, so abort now if blocked...
        return !blocked;
    },

    calculateHeights: function (ownerContext) {
        var me = this,
            items = ownerContext.childItems,
            len = items.length,
            blocked, i, itemContext;

        // in order for innerCt to have the proper height, all the items must have height
        // correct in the DOM...
        blocked = false;
        for (i = 0; i < len; ++i) {
            itemContext = items[i];

            if (!itemContext.hasDomProp('height')) {
                itemContext.domBlock(me, 'height');
                blocked = true;
            }
        }

        if (!blocked) {
            ownerContext.setContentHeight(me.innerCt.getHeight() + ownerContext.targetContext.getPaddingInfo().height);
        }

        return !blocked;
    },

    finishedLayout: function (ownerContext) {
        var bc = ownerContext.bodyContext;

        // Owner may not have a body - this seems to only be needed for Panels.
        if (bc && (Ext.isIE6 || Ext.isIE7 || Ext.isIEQuirks)) {
            // Fix for https://sencha.jira.com/browse/EXTJSIV-4979
            bc.el.repaint();
        }

        this.callParent(arguments);
    },

    getRenderTarget : function() {
        return this.innerCt;
    }
});

/**
 * Component layout for editors
 * @private
 */
Ext.define('Ext.layout.container.Editor', {

    /* Begin Definitions */

    alias: 'layout.editor',

    extend: 'Ext.layout.container.Container',

    /* End Definitions */

    autoSizeDefault: {
        width: 'field',
        height: 'field'    
    },

    getItemSizePolicy: function (item) {
        var me = this,
            autoSize = me.owner.autoSize;

        return me.sizePolicy || (me.sizePolicy = {
            setsWidth:  autoSize && autoSize.width  === 'boundEl' ? 1 : 0,
            setsHeight: autoSize && autoSize.height === 'boundEl' ? 1 : 0
        });
    },

    calculate: function(ownerContext) {
        var me = this,
            owner = me.owner,
            autoSize = owner.autoSize,
            fieldWidth,
            fieldHeight;
            
        if (autoSize === true) {
            autoSize = me.autoSizeDefault;
        }

        // Calculate size of both Editor, and its owned Field
        if (autoSize) {
            fieldWidth  = me.getDimension(owner, autoSize.width,  'getWidth',  owner.width);
            fieldHeight = me.getDimension(owner, autoSize.height, 'getHeight', owner.height);
        }

        // Set Field size
        ownerContext.childItems[0].setSize(fieldWidth, fieldHeight);

        // Bypass validity checking. Container layouts should not usually set their owner's size.
        ownerContext.setWidth(fieldWidth);
        ownerContext.setHeight(fieldHeight);

        // This is a Container layout, so publish content size
        ownerContext.setContentSize(fieldWidth || owner.field.getWidth(),
                                    fieldHeight || owner.field.getHeight());
    },

    getDimension: function(owner, type, getMethod, ownerSize){
        switch (type) {
            // Size to boundEl's dimension
            case 'boundEl':
                return owner.boundEl[getMethod]();

            // Auto size (shrink wrap the Field's size
            case 'field':
                return undefined;

            // Size to the Editor's configured size
            default:
                return ownerSize;
        }
    }
});




/**
 * This is a base class for layouts that contain a single item that automatically expands to fill the layout's
 * container. This class is intended to be extended or created via the layout:'fit'
 * {@link Ext.container.Container#layout} config, and should generally not need to be created directly via the new keyword.
 *
 * Fit layout does not have any direct config options (other than inherited ones). To fit a panel to a container using
 * Fit layout, simply set `layout: 'fit'` on the container and add a single panel to it.
 *
 *     @example
 *     Ext.create('Ext.panel.Panel', {
 *         title: 'Fit Layout',
 *         width: 300,
 *         height: 150,
 *         layout:'fit',
 *         items: {
 *             title: 'Inner Panel',
 *             html: 'This is the inner panel content',
 *             bodyPadding: 20,
 *             border: false
 *         },
 *         renderTo: Ext.getBody()
 *     });
 *
 * If the container has multiple items, all of the items will all be equally sized. This is usually not
 * desired, so to avoid this, place only a **single** item in the container. This sizing of all items
 * can be used to provide a background {@link Ext.Img image} that is "behind" another item
 * such as a {@link Ext.view.View dataview} if you also absolutely position the items.
 */
Ext.define('Ext.layout.container.Fit', {

    /* Begin Definitions */
    extend: 'Ext.layout.container.Container',
    alternateClassName: 'Ext.layout.FitLayout',

    alias: 'layout.fit',

    /* End Definitions */

    itemCls: Ext.baseCSSPrefix + 'fit-item',
    targetCls: Ext.baseCSSPrefix + 'layout-fit',
    type: 'fit',
   
    /**
     * @cfg {Object} defaultMargins
     * If the individual contained items do not have a margins property specified or margin specified via CSS, the
     * default margins from this property will be applied to each item.
     *
     * This property may be specified as an object containing margins to apply in the format:
     *
     *     {
     *         top: (top margin),
     *         right: (right margin),
     *         bottom: (bottom margin),
     *         left: (left margin)
     *     }
     *
     * This property may also be specified as a string containing space-separated, numeric margin values. The order of
     * the sides associated with each value matches the way CSS processes margin values:
     *
     *   - If there is only one value, it applies to all sides.
     *   - If there are two values, the top and bottom borders are set to the first value and the right and left are
     *     set to the second.
     *   - If there are three values, the top is set to the first value, the left and right are set to the second,
     *     and the bottom is set to the third.
     *   - If there are four values, they apply to the top, right, bottom, and left, respectively.
     *
     */
    defaultMargins: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
    },

    manageMargins: true,

    sizePolicies: {
        0: { setsWidth: 0, setsHeight: 0 },
        1: { setsWidth: 1, setsHeight: 0 },
        2: { setsWidth: 0, setsHeight: 1 },
        3: { setsWidth: 1, setsHeight: 1 }
    },

    getItemSizePolicy: function (item, ownerSizeModel) {
        // this layout's sizePolicy is derived from its owner's sizeModel:
        var sizeModel = ownerSizeModel || this.owner.getSizeModel(),
            mode = (sizeModel.width.shrinkWrap ? 0 : 1) |
                   (sizeModel.height.shrinkWrap ? 0 : 2);

       return this.sizePolicies[mode];
    },

    beginLayoutCycle: function (ownerContext, firstCycle) {
        var me = this,
            // determine these before the lastSizeModels get updated:
            resetHeight = me.lastHeightModel && me.lastHeightModel.calculated,
            resetWidth = me.lastWidthModel && me.lastWidthModel.calculated,
            resetSizes = resetWidth || resetHeight,
            maxChildMinHeight = 0, maxChildMinWidth = 0,
            c, childItems, i, item, length, margins, minHeight, minWidth, style, undef;

        me.callParent(arguments);

        // Clear any dimensions which we set before calculation, in case the current
        // settings affect the available size. This particularly effects self-sizing
        // containers such as fields, in which the target element is naturally sized,
        // and should not be stretched by a sized child item.
        if (resetSizes && ownerContext.targetContext.el.dom.tagName.toUpperCase() != 'TD') {
            resetSizes = resetWidth = resetHeight = false;
        }

        childItems = ownerContext.childItems;
        length = childItems.length;

        for (i = 0; i < length; ++i) {
            item = childItems[i];

            // On the firstCycle, we determine the max of the minWidth/Height of the items
            // since these can cause the container to grow scrollbars despite our attempts
            // to fit the child to the container.
            if (firstCycle) {
                c = item.target;
                minHeight = c.minHeight;
                minWidth = c.minWidth;

                if (minWidth || minHeight) {
                    margins = item.marginInfo || item.getMarginInfo();
                    // if the child item has undefined minWidth/Height, these will become
                    // NaN by adding the margins...
                    minHeight += margins.height;
                    minWidth += margins.height;

                    // if the child item has undefined minWidth/Height, these comparisons
                    // will evaluate to false... that is, "0 < NaN" == false...
                    if (maxChildMinHeight < minHeight) {
                        maxChildMinHeight = minHeight;
                    }
                    if (maxChildMinWidth < minWidth) {
                        maxChildMinWidth = minWidth;
                    }
                }
            }

            if (resetSizes) {
                style = item.el.dom.style;

                if (resetHeight) {
                    style.height = '';
                }
                if (resetWidth) {
                    style.width = '';
                }
            }
        }

        if (firstCycle) {
            ownerContext.maxChildMinHeight = maxChildMinHeight;
            ownerContext.maxChildMinWidth = maxChildMinWidth;
        }

        // Cache the overflowX/Y flags, but make them false in shrinkWrap mode (since we
        // won't be triggering overflow in that case) and false if we have no minSize (so
        // no child to trigger an overflow).
        c = ownerContext.target;
        ownerContext.overflowX = (!ownerContext.widthModel.shrinkWrap && 
                                   ownerContext.maxChildMinWidth &&
                                   (c.autoScroll || c.overflowX)) || undef;

        ownerContext.overflowY = (!ownerContext.heightModel.shrinkWrap &&
                                   ownerContext.maxChildMinHeight &&
                                   (c.autoScroll || c.overflowY)) || undef;
    },

    calculate : function (ownerContext) {
        var me = this,
            childItems = ownerContext.childItems,
            length = childItems.length,
            containerSize = me.getContainerSize(ownerContext),
            info = {
                length: length,
                ownerContext: ownerContext,
                targetSize: containerSize
            },
            shrinkWrapWidth = ownerContext.widthModel.shrinkWrap,
            shrinkWrapHeight = ownerContext.heightModel.shrinkWrap,
            overflowX = ownerContext.overflowX,
            overflowY = ownerContext.overflowY,
            scrollbars, scrollbarSize, padding, i, contentWidth, contentHeight;

        if (overflowX || overflowY) {
            // If we have children that have minHeight/Width, we may be forced to overflow
            // and gain scrollbars. If so, we want to remove their space from the other
            // axis so that we fit things inside the scrollbars rather than under them.
            scrollbars = me.getScrollbarsNeeded(
                    overflowX && containerSize.width, overflowY && containerSize.height,
                    ownerContext.maxChildMinWidth, ownerContext.maxChildMinHeight);

            if (scrollbars) {
                scrollbarSize = Ext.getScrollbarSize();
                if (scrollbars & 1) { // if we need the hscrollbar, remove its height
                    containerSize.height -= scrollbarSize.height;
                }
                if (scrollbars & 2) { // if we need the vscrollbar, remove its width
                    containerSize.width -= scrollbarSize.width;
                }
            }
        }

        // Size the child items to the container (if non-shrinkWrap):
        for (i = 0; i < length; ++i) {
            info.index = i;
            me.fitItem(childItems[i], info);
        }
        
        if (shrinkWrapHeight || shrinkWrapWidth) {
            padding = ownerContext.targetContext.getPaddingInfo();
            
            if (shrinkWrapWidth) {
                if (overflowY && !containerSize.gotHeight) {
                    // if we might overflow vertically and don't have the container height,
                    // we don't know if we will need a vscrollbar or not, so we must wait
                    // for that height so that we can determine the contentWidth...
                    me.done = false;
                } else {
                    contentWidth = info.contentWidth + padding.width;
                    // the scrollbar flag (if set) will indicate that an overflow exists on
                    // the horz(1) or vert(2) axis... if not set, then there could never be
                    // an overflow...
                    if (scrollbars & 2) { // if we need the vscrollbar, add its width
                        contentWidth += scrollbarSize.width;
                    }
                    if (!ownerContext.setContentWidth(contentWidth)) {
                        me.done = false;
                    }
                }
            }

            if (shrinkWrapHeight) {
                if (overflowX && !containerSize.gotWidth) {
                    // if we might overflow horizontally and don't have the container width,
                    // we don't know if we will need a hscrollbar or not, so we must wait
                    // for that width so that we can determine the contentHeight...
                    me.done = false;
                } else {
                    contentHeight = info.contentHeight + padding.height;
                    // the scrollbar flag (if set) will indicate that an overflow exists on
                    // the horz(1) or vert(2) axis... if not set, then there could never be
                    // an overflow...
                    if (scrollbars & 1) { // if we need the hscrollbar, add its height
                        contentHeight += scrollbarSize.height;
                    }
                    if (!ownerContext.setContentHeight(contentHeight)) {
                        me.done = false;
                    }
                }
            }
        }
    },

    fitItem: function (itemContext, info) {
        var me = this;

        if (itemContext.invalid) {
            me.done = false;
            return;
        }

        info.margins = itemContext.getMarginInfo();
        info.needed = info.got = 0;

        me.fitItemWidth(itemContext, info);
        me.fitItemHeight(itemContext, info);

        // If not all required dimensions have been satisfied, we're not done.
        if (info.got != info.needed) {
            me.done = false;
        }
    },

    fitItemWidth: function (itemContext, info) {
        var contentWidth, width;
        // Attempt to set only dimensions that are being controlled, not shrinkWrap dimensions
        if (info.ownerContext.widthModel.shrinkWrap) {
            // contentWidth must include the margins to be consistent with setItemWidth
            width = itemContext.getProp('width') + info.margins.width;
            // because we add margins, width will be NaN or a number (not undefined)

            contentWidth = info.contentWidth;
            if (contentWidth === undefined) {
                info.contentWidth = width;
            } else {
                info.contentWidth = Math.max(contentWidth, width);
            }
        } else if (itemContext.widthModel.calculated) {
            ++info.needed;
            if (info.targetSize.gotWidth) {
                ++info.got;
                this.setItemWidth(itemContext, info);
            }
        }

        this.positionItemX(itemContext, info);
    },

    fitItemHeight: function (itemContext, info) {
        var contentHeight, height;
        if (info.ownerContext.heightModel.shrinkWrap) {
            // contentHeight must include the margins to be consistent with setItemHeight
            height = itemContext.getProp('height') + info.margins.height;
            // because we add margins, height will be NaN or a number (not undefined)

            contentHeight = info.contentHeight;
            if (contentHeight === undefined) {
                info.contentHeight = height;
            } else {
                info.contentHeight = Math.max(contentHeight, height);
            }
        } else if (itemContext.heightModel.calculated) {
            ++info.needed;
            if (info.targetSize.gotHeight) {
                ++info.got;
                this.setItemHeight(itemContext, info);
            }
        }

        this.positionItemY(itemContext, info);
    },

    positionItemX: function (itemContext, info) {
        var margins = info.margins;

        // Adjust position to account for configured margins or if we have multiple items
        // (all items should overlap):
        if (info.index || margins.left) {
            itemContext.setProp('x', margins.left);
        }

        if (margins.width) {
            // Need the margins for shrink-wrapping but old IE sometimes collapses the left margin into the padding
            itemContext.setProp('margin-right', margins.width);
        }
    },

    positionItemY: function (itemContext, info) {
        var margins = info.margins;

        if (info.index || margins.top) {
            itemContext.setProp('y', margins.top);
        }

        if (margins.height) {
            // Need the margins for shrink-wrapping but old IE sometimes collapses the top margin into the padding
            itemContext.setProp('margin-bottom', margins.height);
        }
    },

    setItemHeight: function (itemContext, info) {
        itemContext.setHeight(info.targetSize.height - info.margins.height);
    },

    setItemWidth: function (itemContext, info) {
        itemContext.setWidth(info.targetSize.width - info.margins.width);
    }
});

/**
 * This layout manages multiple child Components, each fitted to the Container, where only a single child Component can be
 * visible at any given time.  This layout style is most commonly used for wizards, tab implementations, etc.
 * This class is intended to be extended or created via the layout:'card' {@link Ext.container.Container#layout} config,
 * and should generally not need to be created directly via the new keyword.
 *
 * The CardLayout's focal method is {@link #setActiveItem}.  Since only one panel is displayed at a time,
 * the only way to move from one Component to the next is by calling setActiveItem, passing the next panel to display
 * (or its id or index).  The layout itself does not provide a user interface for handling this navigation,
 * so that functionality must be provided by the developer.
 *
 * To change the active card of a container, call the setActiveItem method of its layout:
 *
 *     @example
 *     var p = Ext.create('Ext.panel.Panel', {
 *         layout: 'card',
 *         items: [
 *             { html: 'Card 1' },
 *             { html: 'Card 2' }
 *         ],
 *         renderTo: Ext.getBody()
 *     });
 *
 *     p.getLayout().setActiveItem(1);
 *
 * In the following example, a simplistic wizard setup is demonstrated.  A button bar is added
 * to the footer of the containing panel to provide navigation buttons.  The buttons will be handled by a
 * common navigation routine.  Note that other uses of a CardLayout (like a tab control) would require a
 * completely different implementation.  For serious implementations, a better approach would be to extend
 * CardLayout to provide the custom functionality needed.
 *
 *     @example
 *     var navigate = function(panel, direction){
 *         // This routine could contain business logic required to manage the navigation steps.
 *         // It would call setActiveItem as needed, manage navigation button state, handle any
 *         // branching logic that might be required, handle alternate actions like cancellation
 *         // or finalization, etc.  A complete wizard implementation could get pretty
 *         // sophisticated depending on the complexity required, and should probably be
 *         // done as a subclass of CardLayout in a real-world implementation.
 *         var layout = panel.getLayout();
 *         layout[direction]();
 *         Ext.getCmp('move-prev').setDisabled(!layout.getPrev());
 *         Ext.getCmp('move-next').setDisabled(!layout.getNext());
 *     };
 *
 *     Ext.create('Ext.panel.Panel', {
 *         title: 'Example Wizard',
 *         width: 300,
 *         height: 200,
 *         layout: 'card',
 *         bodyStyle: 'padding:15px',
 *         defaults: {
 *             // applied to each contained panel
 *             border: false
 *         },
 *         // just an example of one possible navigation scheme, using buttons
 *         bbar: [
 *             {
 *                 id: 'move-prev',
 *                 text: 'Back',
 *                 handler: function(btn) {
 *                     navigate(btn.up("panel"), "prev");
 *                 },
 *                 disabled: true
 *             },
 *             '->', // greedy spacer so that the buttons are aligned to each side
 *             {
 *                 id: 'move-next',
 *                 text: 'Next',
 *                 handler: function(btn) {
 *                     navigate(btn.up("panel"), "next");
 *                 }
 *             }
 *         ],
 *         // the panels (or "cards") within the layout
 *         items: [{
 *             id: 'card-0',
 *             html: '<h1>Welcome to the Wizard!</h1><p>Step 1 of 3</p>'
 *         },{
 *             id: 'card-1',
 *             html: '<p>Step 2 of 3</p>'
 *         },{
 *             id: 'card-2',
 *             html: '<h1>Congratulations!</h1><p>Step 3 of 3 - Complete</p>'
 *         }],
 *         renderTo: Ext.getBody()
 *     });
 */
Ext.define('Ext.layout.container.Card', {

    /* Begin Definitions */

    extend: 'Ext.layout.container.Fit',

    alternateClassName: 'Ext.layout.CardLayout',

    alias: 'layout.card',

    /* End Definitions */

    type: 'card',

    hideInactive: true,

    /**
     * @cfg {Boolean} deferredRender
     * True to render each contained item at the time it becomes active, false to render all contained items
     * as soon as the layout is rendered (defaults to false).  If there is a significant amount of content or
     * a lot of heavy controls being rendered into panels that are not displayed by default, setting this to
     * true might improve performance.
     */
    deferredRender : false,
    
    getRenderTree: function () {
        var me = this,
            activeItem = me.getActiveItem();

        if (activeItem) {

            // If they veto the activate, we have no active item
            if (activeItem.hasListeners.beforeactivate && activeItem.fireEvent('beforeactivate', activeItem) === false) {
 
                // We must null our activeItem reference, AND the one in our owning Container.
                // Because upon layout invalidation, renderChildren will use this.getActiveItem which
                // uses this.activeItem || this.owner.activeItem
                activeItem = me.activeItem = me.owner.activeItem = null;
            }
            
            // Item is to be the active one. Fire event after it is first layed out
            else if (activeItem.hasListeners.activate) {
                activeItem.on({
                    boxready: function() {
                        activeItem.fireEvent('activate', activeItem);
                    },
                    single: true
                });
            }

            if (me.deferredRender) {
                if (activeItem) {
                    return me.getItemsRenderTree([activeItem]);
                }
            } else {
                return me.callParent(arguments);
            }
        }
    },

    renderChildren: function () {
        var me = this,
            active = me.getActiveItem();
            
        if (!me.deferredRender) {
            me.callParent();
        } else if (active) {
            // ensure the active item is configured for the layout
            me.renderItems([active], me.getRenderTarget());
        }
    },

    isValidParent : function(item, target, position) {
        // Note: Card layout does not care about order within the target because only one is ever visible.
        // We only care whether the item is a direct child of the target.
        var itemEl = item.el ? item.el.dom : Ext.getDom(item);
        return (itemEl && itemEl.parentNode === (target.dom || target)) || false;
    },

    /**
     * Return the active (visible) component in the layout.
     * @returns {Ext.Component}
     */
    getActiveItem: function() {
        var me = this,
            // Ensure the calculated result references a Component
            result = me.parseActiveItem(me.activeItem || (me.owner && me.owner.activeItem));

        // Sanitize the result in case the active item is no longer there.
        if (result && me.owner.items.indexOf(result) != -1) {
            me.activeItem = result;
        } else {
            me.activeItem = null;
        }

        return me.activeItem;
    },

    // @private
    parseActiveItem: function(item) {
        if (item && item.isComponent) {
            return item;
        } else if (typeof item == 'number' || item === undefined) {
            return this.getLayoutItems()[item || 0];
        } else {
            return this.owner.getComponent(item);
        }
    },

    // @private. Called before both dynamic render, and bulk render.
    // Ensure that the active item starts visible, and inactive ones start invisible
    configureItem: function(item) {
        if (item === this.getActiveItem()) {
            item.hidden = false;
        } else {
            item.hidden = true;
        }
        this.callParent(arguments);
    },

    onRemove: function(component) {
        var me = this;
        
        if (component === me.activeItem) {
            me.activeItem = null;
        }
    },

    // @private
    getAnimation: function(newCard, owner) {
        var newAnim = (newCard || {}).cardSwitchAnimation;
        if (newAnim === false) {
            return false;
        }
        return newAnim || owner.cardSwitchAnimation;
    },

    /**
     * Return the active (visible) component in the layout to the next card
     * @returns {Ext.Component} The next component or false.
     */
    getNext: function() {
        //NOTE: Removed the JSDoc for this function's arguments because it is not actually supported in 4.0. This 
        //should come back in 4.1
        var wrap = arguments[0],
            items = this.getLayoutItems(),
            index = Ext.Array.indexOf(items, this.activeItem);
            
        return items[index + 1] || (wrap ? items[0] : false);
    },

    /**
     * Sets the active (visible) component in the layout to the next card
     * @return {Ext.Component} the activated component or false when nothing activated.
     */
    next: function() {
        //NOTE: Removed the JSDoc for this function's arguments because it is not actually supported in 4.0. This 
        //should come back in 4.1
        var anim = arguments[0], 
            wrap = arguments[1];
        return this.setActiveItem(this.getNext(wrap), anim);
    },

    /**
     * Return the active (visible) component in the layout to the previous card
     * @returns {Ext.Component} The previous component or false.
     */
    getPrev: function() {
        //NOTE: Removed the JSDoc for this function's arguments because it is not actually supported in 4.0. This 
        //should come back in 4.1
        var wrap = arguments[0],
            items = this.getLayoutItems(),
            index = Ext.Array.indexOf(items, this.activeItem);
            
        return items[index - 1] || (wrap ? items[items.length - 1] : false);
    },

    /**
     * Sets the active (visible) component in the layout to the previous card
     * @return {Ext.Component} the activated component or false when nothing activated.
     */
    prev: function() {
        //NOTE: Removed the JSDoc for this function's arguments because it is not actually supported in 4.0. This 
        //should come back in 4.1
        var anim = arguments[0], 
            wrap = arguments[1];
        return this.setActiveItem(this.getPrev(wrap), anim);
    },

    /**
     * Makes the given card active.
     *
     *     var card1 = Ext.create('Ext.panel.Panel', {itemId: 'card-1'});
     *     var card2 = Ext.create('Ext.panel.Panel', {itemId: 'card-2'});
     *     var panel = Ext.create('Ext.panel.Panel', {
     *         layout: 'card',
     *         activeItem: 0,
     *         items: [card1, card2]
     *     });
     *     // These are all equivalent
     *     panel.getLayout().setActiveItem(card2);
     *     panel.getLayout().setActiveItem('card-2');
     *     panel.getLayout().setActiveItem(1);
     *
     * @param {Ext.Component/Number/String} newCard  The component, component {@link Ext.Component#id id},
     * {@link Ext.Component#itemId itemId}, or index of component.
     * @return {Ext.Component} the activated component or false when nothing activated.
     * False is returned also when trying to activate an already active card.
     */
    setActiveItem: function(newCard) {
        var me = this,
            owner = me.owner,
            oldCard = me.activeItem,
            rendered = owner.rendered,
            newIndex;

        newCard = me.parseActiveItem(newCard);
        newIndex = owner.items.indexOf(newCard);

        // If the card is not a child of the owner, then add it.
        // Without doing a layout!
        if (newIndex == -1) {
            newIndex = owner.items.items.length;
            Ext.suspendLayouts();
            newCard = owner.add(newCard);
            Ext.resumeLayouts();
        }

        // Is this a valid, different card?
        if (newCard && oldCard != newCard) {
            // Fire the beforeactivate and beforedeactivate events on the cards
            if (newCard.fireEvent('beforeactivate', newCard, oldCard) === false) {
                return false;
            }
            if (oldCard && oldCard.fireEvent('beforedeactivate', oldCard, newCard) === false) {
                return false;
            }

            if (rendered) {
                Ext.suspendLayouts();

                // If the card has not been rendered yet, now is the time to do so.
                if (!newCard.rendered) {
                    me.renderItem(newCard, me.getRenderTarget(), owner.items.length);
                }

                if (oldCard) {
                    if (me.hideInactive) {
                        oldCard.hide();
                        oldCard.hiddenByLayout = true;
                    }
                    oldCard.fireEvent('deactivate', oldCard, newCard);
                }
                // Make sure the new card is shown
                if (newCard.hidden) {
                    newCard.show();
                }

                // Layout needs activeItem to be correct, so set it if the show has not been vetoed
                if (!newCard.hidden) {
                    me.activeItem = newCard;
                }
                Ext.resumeLayouts(true);
            } else {
                me.activeItem = newCard;
            }

            newCard.fireEvent('activate', newCard, oldCard);

            return me.activeItem;
        }
        return false;
    }
});

/**
 * This is a layout that will render form Fields, one under the other all stretched to the Container width.
 *
 *     @example
 *     Ext.create('Ext.Panel', {
 *         width: 500,
 *         height: 300,
 *         title: "FormLayout Panel",
 *         layout: 'form',
 *         renderTo: Ext.getBody(),
 *         bodyPadding: 5,
 *         defaultType: 'textfield',
 *         items: [{
 *            fieldLabel: 'First Name',
 *             name: 'first',
 *             allowBlank:false
 *         },{
 *             fieldLabel: 'Last Name',
 *             name: 'last'
 *         },{
 *             fieldLabel: 'Company',
 *             name: 'company'
 *         }, {
 *             fieldLabel: 'Email',
 *             name: 'email',
 *             vtype:'email'
 *         }, {
 *             fieldLabel: 'DOB',
 *             name: 'dob',
 *             xtype: 'datefield'
 *         }, {
 *             fieldLabel: 'Age',
 *             name: 'age',
 *             xtype: 'numberfield',
 *             minValue: 0,
 *             maxValue: 100
 *         }, {
 *             xtype: 'timefield',
 *             fieldLabel: 'Time',
 *             name: 'time',
 *             minValue: '8:00am',
 *             maxValue: '6:00pm'
 *         }]
 *     });
 *
 * Note that any configured {@link Ext.Component#padding padding} will be ignored on items within a Form layout.
 */
Ext.define('Ext.layout.container.Form', {

    /* Begin Definitions */

    alias: 'layout.form',
    extend: 'Ext.layout.container.Auto',
    alternateClassName: 'Ext.layout.FormLayout',

    /* End Definitions */
   
    tableCls: Ext.baseCSSPrefix + 'form-layout-table',

    type: 'form',

    manageOverflow: 2,

    childEls: ['formTable'],
    
    padRow: '<tr><td class="' + Ext.baseCSSPrefix + 'form-item-pad" colspan="3"></td></tr>',

    renderTpl: [
        '<table id="{ownerId}-formTable" class="{tableCls}" style="width:100%" cellpadding="0">',
            '{%this.renderBody(out,values)%}',
        '</table>',
        '{%this.renderPadder(out,values)%}'
    ],
    
    getRenderData: function(){
        var data = this.callParent();
        data.tableCls = this.tableCls;
        return data;    
    },

    calculate : function (ownerContext) {
        var me = this,
            containerSize = me.getContainerSize(ownerContext, true),
            tableWidth,
            childItems,
            i = 0, length;

        // Once we have been widthed, we can impose that width (in a non-dirty setting) upon all children at once
        if (containerSize.gotWidth) {
            this.callParent(arguments);
            tableWidth = me.formTable.dom.offsetWidth;
            childItems = ownerContext.childItems;

            for (length = childItems.length; i < length; ++i) {
                childItems[i].setWidth(tableWidth, false);
            }
        } else {
            me.done = false;
        }
    },

    getRenderTarget: function() {
        return this.formTable;
    },

    getRenderTree: function() {
        var me = this,
            result = me.callParent(arguments),
            i, len;

        for (i = 0, len = result.length; i < len; i++) {
            result[i] = me.transformItemRenderTree(result[i]);
        }
        return result;
    },

    transformItemRenderTree: function(item) {

        if (item.tag && item.tag == 'table') {
            item.tag = 'tbody';
            delete item.cellspacing;
            delete item.cellpadding;

            // IE6 doesn't separate cells nicely to provide input field
            // vertical separation. It also does not support transparent borders
            // which is how the extra 1px is added to the 2px each side cell spacing.
            // So it needs a 5px high pad row.
            if (Ext.isIE6) {
                item.cn = this.padRow;
            }

            return item;
        }

        return {
            tag: 'tbody',
            cn: {
                tag: 'tr',
                cn: {
                    tag: 'td',
                    colspan: 3,
                    style: 'width:100%',
                    cn: item
                }
            }
        };

    },

    isValidParent: function(item, target, position) {
        return true;
    },

    isItemShrinkWrap: function(item) {
        return ((item.shrinkWrap === true) ? 3 : item.shrinkWrap||0) & 2;
    },

    getItemSizePolicy: function(item) {
        return {
            setsWidth: 1,
            setsHeight: 0
        };
    }
});

/**
 * This layout allows you to easily render content into an HTML table. The total number of columns can be specified, and
 * rowspan and colspan can be used to create complex layouts within the table. This class is intended to be extended or
 * created via the `layout: {type: 'table'}` {@link Ext.container.Container#layout} config, and should generally not
 * need to be created directly via the new keyword.
 *
 * Note that when creating a layout via config, the layout-specific config properties must be passed in via the {@link
 * Ext.container.Container#layout} object which will then be applied internally to the layout. In the case of
 * TableLayout, the only valid layout config properties are {@link #columns} and {@link #tableAttrs}. However, the items
 * added to a TableLayout can supply the following table-specific config properties:
 *
 *   - **rowspan** Applied to the table cell containing the item.
 *   - **colspan** Applied to the table cell containing the item.
 *   - **cellId** An id applied to the table cell containing the item.
 *   - **cellCls** A CSS class name added to the table cell containing the item.
 *
 * The basic concept of building up a TableLayout is conceptually very similar to building up a standard HTML table. You
 * simply add each panel (or "cell") that you want to include along with any span attributes specified as the special
 * config properties of rowspan and colspan which work exactly like their HTML counterparts. Rather than explicitly
 * creating and nesting rows and columns as you would in HTML, you simply specify the total column count in the
 * layout config and start adding panels in their natural order from left to right, top to bottom. The layout will
 * automatically figure out, based on the column count, rowspans and colspans, how to position each panel within the
 * table. Just like with HTML tables, your rowspans and colspans must add up correctly in your overall layout or you'll
 * end up with missing and/or extra cells! Example usage:
 *
 *     @example
 *     Ext.create('Ext.panel.Panel', {
 *         title: 'Table Layout',
 *         width: 300,
 *         height: 150,
 *         layout: {
 *             type: 'table',
 *             // The total column count must be specified here
 *             columns: 3
 *         },
 *         defaults: {
 *             // applied to each contained panel
 *             bodyStyle: 'padding:20px'
 *         },
 *         items: [{
 *             html: 'Cell A content',
 *             rowspan: 2
 *         },{
 *             html: 'Cell B content',
 *             colspan: 2
 *         },{
 *             html: 'Cell C content',
 *             cellCls: 'highlight'
 *         },{
 *             html: 'Cell D content'
 *         }],
 *         renderTo: Ext.getBody()
 *     });
 */
Ext.define('Ext.layout.container.Table', {

    /* Begin Definitions */

    alias: ['layout.table'],
    extend: 'Ext.layout.container.Container',
    alternateClassName: 'Ext.layout.TableLayout',

    /* End Definitions */

    /**
     * @cfg {Number} columns
     * The total number of columns to create in the table for this layout. If not specified, all Components added to
     * this layout will be rendered into a single row using one column per Component.
     */

    // private
    monitorResize:false,

    type: 'table',

    clearEl: true, // Base class will not create it if already truthy. Not needed in tables.

    targetCls: Ext.baseCSSPrefix + 'table-layout-ct',
    tableCls: Ext.baseCSSPrefix + 'table-layout',
    cellCls: Ext.baseCSSPrefix + 'table-layout-cell',

    /**
     * @cfg {Object} tableAttrs
     * An object containing properties which are added to the {@link Ext.DomHelper DomHelper} specification used to
     * create the layout's `<table>` element. Example:
     *
     *     {
     *         xtype: 'panel',
     *         layout: {
     *             type: 'table',
     *             columns: 3,
     *             tableAttrs: {
     *                 style: {
     *                     width: '100%'
     *                 }
     *             }
     *         }
     *     }
     */
    tableAttrs: null,

    /**
     * @cfg {Object} trAttrs
     * An object containing properties which are added to the {@link Ext.DomHelper DomHelper} specification used to
     * create the layout's `<tr>` elements.
     */

    /**
     * @cfg {Object} tdAttrs
     * An object containing properties which are added to the {@link Ext.DomHelper DomHelper} specification used to
     * create the layout's `<td>` elements.
     */

    itemSizePolicy: {
        setsWidth: 0,
        setsHeight: 0
    },

    getItemSizePolicy: function (item) {
        return this.itemSizePolicy;
    },

    getLayoutItems: function() {
        var me = this,
            result = [],
            items = me.callParent(),
            item,
            len = items.length, i;

        for (i = 0; i < len; i++) {
            item = items[i];
            if (!item.hidden) {
                result.push(item);
            }
        }
        return result;
    },

    /**
     * @private
     * Iterates over all passed items, ensuring they are rendered in a cell in the proper
     * location in the table structure.
     */
    renderChildren: function() {
        var me = this,
            items = me.getLayoutItems(),
            tbody = me.owner.getTargetEl().child('table', true).tBodies[0],
            rows = tbody.rows,
            i = 0,
            len = items.length,
            cells, curCell, rowIdx, cellIdx, item, trEl, tdEl, itemCt;

        // Calculate the correct cell structure for the current items
        cells = me.calculateCells(items);

        // Loop over each cell and compare to the current cells in the table, inserting/
        // removing/moving cells as needed, and making sure each item is rendered into
        // the correct cell.
        for (; i < len; i++) {
            curCell = cells[i];
            rowIdx = curCell.rowIdx;
            cellIdx = curCell.cellIdx;
            item = items[i];

            // If no row present, create and insert one
            trEl = rows[rowIdx];
            if (!trEl) {
                trEl = tbody.insertRow(rowIdx);
                if (me.trAttrs) {
                    trEl.set(me.trAttrs);
                }
            }

            // If no cell present, create and insert one
            itemCt = tdEl = Ext.get(trEl.cells[cellIdx] || trEl.insertCell(cellIdx));
            if (me.needsDivWrap()) { //create wrapper div if needed - see docs below
                itemCt = tdEl.first() || tdEl.createChild({tag: 'div'});
                itemCt.setWidth(null);
            }

            // Render or move the component into the cell
            if (!item.rendered) {
                me.renderItem(item, itemCt, 0);
            }
            else if (!me.isValidParent(item, itemCt, rowIdx, cellIdx, tbody)) {
                me.moveItem(item, itemCt, 0);
            }

            // Set the cell properties
            if (me.tdAttrs) {
                tdEl.set(me.tdAttrs);
            }
            if (item.tdAttrs) {
                tdEl.set(item.tdAttrs);
            }
            tdEl.set({
                colSpan: item.colspan || 1,
                rowSpan: item.rowspan || 1,
                id: item.cellId || '',
                cls: me.cellCls + ' ' + (item.cellCls || '')
            });

            // If at the end of a row, remove any extra cells
            if (!cells[i + 1] || cells[i + 1].rowIdx !== rowIdx) {
                cellIdx++;
                while (trEl.cells[cellIdx]) {
                    trEl.deleteCell(cellIdx);
                }
            }
        }

        // Delete any extra rows
        rowIdx++;
        while (tbody.rows[rowIdx]) {
            tbody.deleteRow(rowIdx);
        }
    },

    calculate: function (ownerContext) {
        if (!ownerContext.hasDomProp('containerChildrenDone')) {
            this.done = false;
        } else {
            var targetContext = ownerContext.targetContext,
                widthShrinkWrap = ownerContext.widthModel.shrinkWrap,
                heightShrinkWrap = ownerContext.heightModel.shrinkWrap,
                shrinkWrap = heightShrinkWrap || widthShrinkWrap,
                table = shrinkWrap && targetContext.el.child('table', true),
                targetPadding = shrinkWrap && targetContext.getPaddingInfo();

            if (widthShrinkWrap) {
                ownerContext.setContentWidth(table.offsetWidth + targetPadding.width, true);
            }

            if (heightShrinkWrap) {
                ownerContext.setContentHeight(table.offsetHeight + targetPadding.height, true);
            }
        }
    },

    finalizeLayout: function() {
        if (this.needsDivWrap()) {
            // set wrapper div width to match layed out item - see docs below
            var items = this.getLayoutItems(),
                i,
                iLen  = items.length,
                item;

            for (i = 0; i < iLen; i++) {
                item = items[i];

                Ext.fly(item.el.dom.parentNode).setWidth(item.getWidth());
            }
        }
        if (Ext.isIE6 || (Ext.isIEQuirks)) {
            // Fixes an issue where the table won't paint
            this.owner.getTargetEl().child('table').repaint();
        }
    },

    /**
     * @private
     * Determine the row and cell indexes for each component, taking into consideration
     * the number of columns and each item's configured colspan/rowspan values.
     * @param {Array} items The layout components
     * @return {Object[]} List of row and cell indexes for each of the components
     */
    calculateCells: function(items) {
        var cells = [],
            rowIdx = 0,
            colIdx = 0,
            cellIdx = 0,
            totalCols = this.columns || Infinity,
            rowspans = [], //rolling list of active rowspans for each column
            i = 0, j,
            len = items.length,
            item;

        for (; i < len; i++) {
            item = items[i];

            // Find the first available row/col slot not taken up by a spanning cell
            while (colIdx >= totalCols || rowspans[colIdx] > 0) {
                if (colIdx >= totalCols) {
                    // move down to next row
                    colIdx = 0;
                    cellIdx = 0;
                    rowIdx++;

                    // decrement all rowspans
                    for (j = 0; j < totalCols; j++) {
                        if (rowspans[j] > 0) {
                            rowspans[j]--;
                        }
                    }
                } else {
                    colIdx++;
                }
            }

            // Add the cell info to the list
            cells.push({
                rowIdx: rowIdx,
                cellIdx: cellIdx
            });

            // Increment
            for (j = item.colspan || 1; j; --j) {
                rowspans[colIdx] = item.rowspan || 1;
                ++colIdx;
            }
            ++cellIdx;
        }

        return cells;
    },

    getRenderTree: function() {
        var me = this,
            items = me.getLayoutItems(),
            cells,
            rows = [],
            result = Ext.apply({
                tag: 'table',
                role: 'presentation',
                cls: me.tableCls,
                cellspacing: 0,
                cn: {
                    tag: 'tbody',
                    cn: rows
                }
            }, me.tableAttrs),
            tdAttrs = me.tdAttrs,
            needsDivWrap = me.needsDivWrap(),
            i, len = items.length, item, curCell, tr, rowIdx, cellIdx, cell;

        // Calculate the correct cell structure for the current items
        cells = me.calculateCells(items);

        for (i = 0; i < len; i++) {
            item = items[i];
            
            curCell = cells[i];
            rowIdx = curCell.rowIdx;
            cellIdx = curCell.cellIdx;

            // If no row present, create and insert one
            tr = rows[rowIdx];
            if (!tr) {
                tr = rows[rowIdx] = {
                    tag: 'tr',
                    cn: []
                };
                if (me.trAttrs) {
                    Ext.apply(tr, me.trAttrs);
                }
            }

            // If no cell present, create and insert one
            cell = tr.cn[cellIdx] = {
                tag: 'td'
            };
            if (tdAttrs) {
                Ext.apply(cell, tdAttrs);
            }
            Ext.apply(cell, {
                colSpan: item.colspan || 1,
                rowSpan: item.rowspan || 1,
                id: item.cellId || '',
                cls: me.cellCls + ' ' + (item.cellCls || '')
            });

            if (needsDivWrap) { //create wrapper div if needed - see docs below
                cell = cell.cn = {
                    tag: 'div'
                };
            }

            me.configureItem(item);
            // The DomHelper config of the item is the cell's sole child
            cell.cn = item.getRenderTree();
        }
        return result;
    },

    isValidParent: function(item, target, rowIdx, cellIdx) {
        var tbody,
            correctCell,
            table;

        // If we were called with the 3 arg signature just check that the parent table of the item is within the render target
        if (arguments.length === 3) {
            table = item.el.up('table');
            return table && table.dom.parentNode === target.dom;
        }
        tbody = this.owner.getTargetEl().child('table', true).tBodies[0];
        correctCell = tbody.rows[rowIdx].cells[cellIdx];
        return item.el.dom.parentNode === correctCell;
    },

    /**
     * @private
     * Opera 10.5 has a bug where if a table cell's child has box-sizing:border-box and padding, it
     * will include that padding in the size of the cell, making it always larger than the
     * shrink-wrapped size of its contents. To get around this we have to wrap the contents in a div
     * and then set that div's width to match the item rendered within it afterLayout. This method
     * determines whether we need the wrapper div; it currently does a straight UA sniff as this bug
     * seems isolated to just Opera 10.5, but feature detection could be added here if needed.
     */
    needsDivWrap: function() {
        return Ext.isOpera10_5;
    }
});

/**
 * @private
 */
Ext.define('Ext.layout.container.boxOverflow.Scroller', {

    /* Begin Definitions */

    extend: 'Ext.layout.container.boxOverflow.None',
    requires: ['Ext.util.ClickRepeater', 'Ext.Element'],
    alternateClassName: 'Ext.layout.boxOverflow.Scroller',
    mixins: {
        observable: 'Ext.util.Observable'
    },
    
    /* End Definitions */

    /**
     * @cfg {Boolean} animateScroll
     * True to animate the scrolling of items within the layout (ignored if enableScroll is false)
     */
    animateScroll: false,

    /**
     * @cfg {Number} scrollIncrement
     * The number of pixels to scroll by on scroller click
     */
    scrollIncrement: 20,

    /**
     * @cfg {Number} wheelIncrement
     * The number of pixels to increment on mouse wheel scrolling.
     */
    wheelIncrement: 10,

    /**
     * @cfg {Number} scrollRepeatInterval
     * Number of milliseconds between each scroll while a scroller button is held down
     */
    scrollRepeatInterval: 60,

    /**
     * @cfg {Number} scrollDuration
     * Number of milliseconds that each scroll animation lasts
     */
    scrollDuration: 400,

    /**
     * @cfg {String} beforeCtCls
     * CSS class added to the beforeCt element. This is the element that holds any special items such as scrollers,
     * which must always be present at the leftmost edge of the Container
     */

    /**
     * @cfg {String} afterCtCls
     * CSS class added to the afterCt element. This is the element that holds any special items such as scrollers,
     * which must always be present at the rightmost edge of the Container
     */

    /**
     * @cfg {String} [scrollerCls='x-box-scroller']
     * CSS class added to both scroller elements if enableScroll is used
     */
    scrollerCls: Ext.baseCSSPrefix + 'box-scroller',

    /**
     * @cfg {String} beforeScrollerCls
     * CSS class added to the left scroller element if enableScroll is used
     */

    /**
     * @cfg {String} afterScrollerCls
     * CSS class added to the right scroller element if enableScroll is used
     */

    constructor: function(layout, config) {
        var me = this;

        me.layout = layout;
        Ext.apply(me, config || {});

        // Dont pass the config so that it is not applied to 'this' again
        me.mixins.observable.constructor.call(me);

        me.addEvents(
            /**
             * @event scroll
             * @param {Ext.layout.container.boxOverflow.Scroller} scroller The layout scroller
             * @param {Number} newPosition The new position of the scroller
             * @param {Boolean/Object} animate If animating or not. If true, it will be a animation configuration, else it will be false
             */
            'scroll'
        );
        me.scrollPosition = 0;
        me.scrollSize = 0;
    },

    getPrefixConfig: function() {
        var me = this;
        me.initCSSClasses();
        return {
            cls: Ext.layout.container.Box.prototype.innerCls + ' ' + me.beforeCtCls,
            cn : {
                id : me.layout.owner.id + '-before-scroller',
                cls: me.scrollerCls + ' ' + me.beforeScrollerCls,
                style: 'display:none'
            }
        };
    },

    getSuffixConfig: function() {
        var me = this;
        return {
            cls: Ext.layout.container.Box.prototype.innerCls + ' ' + me.afterCtCls,
            cn : {
                id : me.layout.owner.id + '-after-scroller',
                cls: me.scrollerCls + ' ' + me.afterScrollerCls,
                style: 'display:none'
            }
        };
    },

    getOverflowCls: function() {
        return Ext.baseCSSPrefix + this.layout.direction + '-box-overflow-body';
    },

    initCSSClasses: function() {
        var me = this,
            prefix = Ext.baseCSSPrefix,
            layout = me.layout,
            names = layout.getNames(),
            leftName = names.left,
            rightName = names.right,
            type = me.getOwnerType(layout.owner);

        me.beforeCtCls = me.beforeCtCls || prefix + 'box-scroller-' + leftName;
        me.afterCtCls  = me.afterCtCls  || prefix + 'box-scroller-' + rightName;
        
        me.beforeScrollerCls = me.beforeScrollerCls || prefix + type + '-scroll-' + leftName;
        me.afterScrollerCls  = me.afterScrollerCls  || prefix + type + '-scroll-' + rightName;
    },

    beginLayout: function (ownerContext) {
        var layout = this.layout,
            names = layout.getNames();

        ownerContext.innerCtScrollPos = layout.innerCt.dom['scroll' + names.leftCap];

        this.callParent(arguments);
    },

    completeLayout: function (ownerContext) {
        // capture this before callParent since it calls handle/clearOverflow:
        this.scrollSize = ownerContext.props['content'+this.layout.getNames().widthCap];

        this.callParent(arguments);
    },
    
    finishedLayout: function(ownerContext) {
        var me = this,
            layout = me.layout,
            names = layout.getNames(),
            scrollPos = Math.min(me.getMaxScrollPosition(), ownerContext.innerCtScrollPos);

        layout.innerCt.dom['scroll' + names.leftCap] = scrollPos;
    },

    handleOverflow: function(ownerContext) {
        var me = this,
            layout = me.layout,
            names = layout.getNames(),
            methodName = 'get' + names.widthCap;

        me.captureChildElements();
        me.showScrollers();

        return {
            reservedSpace: me.beforeCt[methodName]() + me.afterCt[methodName]()
        };
    },

    /**
     * @private
     * Gets references to the beforeCt and afterCt elements if they have not already been captured
     * and creates click handlers for them.
     */
    captureChildElements: function() {
        var me = this,
            el = me.layout.owner.el,
            before,
            after;

        // Grab the scroll click receiving elements
        if (!me.beforeCt) {
            before = me.beforeScroller = el.getById(me.layout.owner.id + '-before-scroller');
            after = me.afterScroller = el.getById(me.layout.owner.id + '-after-scroller');
            me.beforeCt = before.up('');
            me.afterCt = after.up('');
            me.createWheelListener();

            before.addClsOnOver(me.beforeScrollerCls + '-hover');
            after.addClsOnOver(me.afterScrollerCls + '-hover');

            before.setVisibilityMode(Ext.Element.DISPLAY);
            after.setVisibilityMode(Ext.Element.DISPLAY);

            me.beforeRepeater = new Ext.util.ClickRepeater(before, {
                interval: me.scrollRepeatInterval,
                handler : me.scrollLeft,
                scope   : me
            });

            me.afterRepeater = new Ext.util.ClickRepeater(after, {
                interval: me.scrollRepeatInterval,
                handler : me.scrollRight,
                scope   : me
            });
        }
    },

    /**
     * @private
     * Sets up an listener to scroll on the layout's innerCt mousewheel event
     */
    createWheelListener: function() {
        this.layout.innerCt.on({
            mousewheel: function(e) {
                this.scrollBy(e.getWheelDelta() * this.wheelIncrement * -1, false);
            },
            stopEvent: true,
            scope: this
        });
    },

    /**
     * @private
     */
    clearOverflow: function () {
        var layout = this.layout;

        this.hideScrollers();
    },

    /**
     * @private
     * Shows the scroller elements in the beforeCt and afterCt. Creates the scrollers first if they are not already
     * present. 
     */
    showScrollers: function() {
        var me = this;

        me.captureChildElements();
        me.beforeScroller.show();
        me.afterScroller.show();
        me.updateScrollButtons();
        me.layout.owner.addClsWithUI('scroller');
        // TODO - this may invalidates data in the ContextItem's styleCache
    },

    /**
     * @private
     * Hides the scroller elements in the beforeCt and afterCt
     */
    hideScrollers: function() {
        var me = this;

        if (me.beforeScroller !== undefined) {
            me.beforeScroller.hide();
            me.afterScroller.hide();
            me.layout.owner.removeClsWithUI('scroller');
            // TODO - this may invalidates data in the ContextItem's styleCache
        }
    },

    /**
     * @private
     */
    destroy: function() {
        var me = this;

        Ext.destroy(me.beforeRepeater, me.afterRepeater, me.beforeScroller, me.afterScroller, me.beforeCt, me.afterCt);
    },

    /**
     * @private
     * Scrolls left or right by the number of pixels specified
     * @param {Number} delta Number of pixels to scroll to the right by. Use a negative number to scroll left
     */
    scrollBy: function(delta, animate) {
        this.scrollTo(this.getScrollPosition() + delta, animate);
    },

    /**
     * @private
     * @return {Object} Object passed to scrollTo when scrolling
     */
    getScrollAnim: function() {
        return {
            duration: this.scrollDuration, 
            callback: this.updateScrollButtons, 
            scope   : this
        };
    },

    /**
     * @private
     * Enables or disables each scroller button based on the current scroll position
     */
    updateScrollButtons: function() {
        var me = this,
            beforeMeth,
            afterMeth,
            beforeCls,
            afterCls;
            
        if (me.beforeScroller === undefined || me.afterScroller === undefined) {
            return;
        }

        beforeMeth = me.atExtremeBefore()  ? 'addCls' : 'removeCls';
        afterMeth  = me.atExtremeAfter() ? 'addCls' : 'removeCls';
        beforeCls  = me.beforeScrollerCls + '-disabled';
        afterCls   = me.afterScrollerCls  + '-disabled';

        me.beforeScroller[beforeMeth](beforeCls);
        me.afterScroller[afterMeth](afterCls);
        me.scrolling = false;
    },

    /**
     * @private
     * Returns true if the innerCt scroll is already at its left-most point
     * @return {Boolean} True if already at furthest left point
     */
    atExtremeBefore: function() {
        return !this.getScrollPosition();
    },

    /**
     * @private
     * Scrolls to the left by the configured amount
     */
    scrollLeft: function() {
        this.scrollBy(-this.scrollIncrement, false);
    },

    /**
     * @private
     * Scrolls to the right by the configured amount
     */
    scrollRight: function() {
        this.scrollBy(this.scrollIncrement, false);
    },

    /**
     * Returns the current scroll position of the innerCt element
     * @return {Number} The current scroll position
     */
    getScrollPosition: function(){
        var me = this,
            layout = me.layout,
            result;

        // Until we actually scroll, the scroll[Top|Left] is stored as zero to avoid DOM hits.
        if (me.hasOwnProperty('scrollPosition')) {
            result = me.scrollPosition;
        } else {
            result = parseInt(layout.innerCt.dom['scroll' + layout.getNames().leftCap], 10) || 0;
        }
        return result;
    },

    /**
     * @private
     * Returns the maximum value we can scrollTo
     * @return {Number} The max scroll value
     */
    getMaxScrollPosition: function() {
        var me = this,
            layout = me.layout,
            names = layout.getNames(),
            maxScrollPos = me.scrollSize - layout.innerCt['get'+names.widthCap]();

        return (maxScrollPos < 0) ? 0 : maxScrollPos;
    },

    /**
     * @private
     * Returns true if the innerCt scroll is already at its right-most point
     * @return {Boolean} True if already at furthest right point
     */
    atExtremeAfter: function() {
        return this.getScrollPosition() >= this.getMaxScrollPosition();
    },

    /**
     * @private
     * Scrolls to the given position. Performs bounds checking.
     * @param {Number} position The position to scroll to. This is constrained.
     * @param {Boolean} animate True to animate. If undefined, falls back to value of this.animateScroll
     */
    scrollTo: function(position, animate) {
        var me = this,
            layout = me.layout,
            names = layout.getNames(),
            oldPosition = me.getScrollPosition(),
            newPosition = Ext.Number.constrain(position, 0, me.getMaxScrollPosition());

        if (newPosition != oldPosition && !me.scrolling) {
            delete me.scrollPosition;
            if (animate === undefined) {
                animate = me.animateScroll;
            }

            layout.innerCt.scrollTo(names.left, newPosition, animate ? me.getScrollAnim() : false);
            if (animate) {
                me.scrolling = true;
            } else {
                me.updateScrollButtons();
            }
            me.fireEvent('scroll', me, newPosition, animate ? me.getScrollAnim() : false);
        }
    },

    /**
     * Scrolls to the given component.
     * @param {String/Number/Ext.Component} item The item to scroll to. Can be a numerical index, component id 
     * or a reference to the component itself.
     * @param {Boolean} animate True to animate the scrolling
     */
    scrollToItem: function(item, animate) {
        var me = this,
            layout = me.layout,
            names = layout.getNames(),
            visibility,
            box,
            newPos;

        item = me.getItem(item);
        if (item !== undefined) {
            visibility = me.getItemVisibility(item);
            if (!visibility.fullyVisible) {
                box  = item.getBox(true, true);
                newPos = box[names.x];
                if (visibility.hiddenEnd) {
                    newPos -= (me.layout.innerCt['get' + names.widthCap]() - box[names.width]);
                }
                me.scrollTo(newPos, animate);
            }
        }
    },

    /**
     * @private
     * For a given item in the container, return an object with information on whether the item is visible
     * with the current innerCt scroll value.
     * @param {Ext.Component} item The item
     * @return {Object} Values for fullyVisible, hiddenStart and hiddenEnd
     */
    getItemVisibility: function(item) {
        var me          = this,
            box         = me.getItem(item).getBox(true, true),
            layout      = me.layout,
            names       = layout.getNames(),
            itemStart   = box[names.x],
            itemEnd     = itemStart + box[names.width],
            scrollStart = me.getScrollPosition(),
            scrollEnd   = scrollStart + layout.innerCt['get' + names.widthCap]();

        return {
            hiddenStart : itemStart < scrollStart,
            hiddenEnd   : itemEnd > scrollEnd,
            fullyVisible: itemStart > scrollStart && itemEnd < scrollEnd
        };
    }
});




/**
 * This is a multi-pane, application-oriented UI layout style that supports multiple nested panels, automatic bars
 * between regions and built-in {@link Ext.panel.Panel#collapsible expanding and collapsing} of regions.
 *
 * This class is intended to be extended or created via the `layout:'border'` {@link Ext.container.Container#layout}
 * config, and should generally not need to be created directly via the new keyword.
 *
 *     @example
 *     Ext.create('Ext.panel.Panel', {
 *         width: 500,
 *         height: 300,
 *         title: 'Border Layout',
 *         layout: 'border',
 *         items: [{
 *             title: 'South Region is resizable',
 *             region: 'south',     // position for region
 *             xtype: 'panel',
 *             height: 100,
 *             split: true,         // enable resizing
 *             margins: '0 5 5 5'
 *         },{
 *             // xtype: 'panel' implied by default
 *             title: 'West Region is collapsible',
 *             region:'west',
 *             xtype: 'panel',
 *             margins: '5 0 0 5',
 *             width: 200,
 *             collapsible: true,   // make collapsible
 *             id: 'west-region-container',
 *             layout: 'fit'
 *         },{
 *             title: 'Center Region',
 *             region: 'center',     // center region is required, no width/height specified
 *             xtype: 'panel',
 *             layout: 'fit',
 *             margins: '5 5 0 0'
 *         }],
 *         renderTo: Ext.getBody()
 *     });
 *
 * # Notes
 * 
 *   - When using the split option, the layout will automatically insert a {@link Ext.resizer.Splitter}
 *     into the appropriate place. This will modify the underlying
 *     {@link Ext.container.Container#property-items items} collection in the container.
 *
 *   - Any Container using the Border layout **must** have a child item with `region:'center'`.
 *     The child item in the center region will always be resized to fill the remaining space
 *     not used by the other regions in the layout.
 *
 *   - Any child items with a region of `west` or `east` may be configured with either an initial
 *     `width`, or a {@link Ext.layout.container.Box#flex} value, or an initial percentage width
 *     **string** (Which is simply divided by 100 and used as a flex value).
 *     The 'center' region has a flex value of `1`.
 *
 *   - Any child items with a region of `north` or `south` may be configured with either an initial
 *     `height`, or a {@link Ext.layout.container.Box#flex} value, or an initial percentage height
 *     **string** (Which is simply divided by 100 and used as a flex value).
 *     The 'center' region has a flex value of `1`.
 *
 *   - **There is no BorderLayout.Region class in ExtJS 4.0+**
 */
Ext.define('Ext.layout.container.Border', {

    alias: 'layout.border',

    extend: 'Ext.layout.container.Container',

    requires: ['Ext.resizer.BorderSplitter', 'Ext.Component', 'Ext.fx.Anim'],

    alternateClassName: 'Ext.layout.BorderLayout',


    targetCls: Ext.baseCSSPrefix + 'border-layout-ct',

    itemCls: [Ext.baseCSSPrefix + 'border-item', Ext.baseCSSPrefix + 'box-item'],

    type: 'border',

    /**
     * @cfg {Boolean} split
     * This configuration option is to be applied to the **child `items`** managed by this layout.
     * Each region with `split:true` will get a {@link Ext.resizer.BorderSplitter Splitter} that
     * allows for manual resizing of the container. Except for the `center` region.
     */
    
    /**
     * @cfg {Boolean} [splitterResize=true]
     * This configuration option is to be applied to the **child `items`** managed by this layout and
     * is used in conjunction with {@link #split}. By default, when specifying {@link #split}, the region
     * can be dragged to be resized. Set this option to false to show the split bar but prevent resizing.
     */

    /**
     * @cfg {Number/String/Object} padding
     * Sets the padding to be applied to all child items managed by this layout.
     * 
     * This property can be specified as a string containing space-separated, numeric
     * padding values. The order of the sides associated with each value matches the way
     * CSS processes padding values:
     *
     *  - If there is only one value, it applies to all sides.
     *  - If there are two values, the top and bottom borders are set to the first value
     *    and the right and left are set to the second.
     *  - If there are three values, the top is set to the first value, the left and right
     *    are set to the second, and the bottom is set to the third.
     *  - If there are four values, they apply to the top, right, bottom, and left,
     *    respectively.
     *
     */
    padding: undefined,

    percentageRe: /(\d+)%/,

    /**
     * Reused meta-data objects that describe axis properties.
     * @private
     */
    axisProps: {
        horz: {
            borderBegin: 'west',
            borderEnd: 'east',
            horizontal: true,
            posProp: 'x',
            sizeProp: 'width',
            sizePropCap: 'Width'
        },
        vert: {
            borderBegin: 'north',
            borderEnd: 'south',
            horizontal: false,
            posProp: 'y',
            sizeProp: 'height',
            sizePropCap: 'Height'
        }
    },

    // @private
    centerRegion: null,

    /**
     * Maps from region name to collapseDirection for panel.
     * @private
     */
    collapseDirections: {
        north: 'top',
        south: 'bottom',
        east: 'right',
        west: 'left'
    },

    manageMargins: true,

    panelCollapseAnimate: true,

    panelCollapseMode: 'placeholder',

    /**
     * @cfg {Object} regionWeights
     * The default weights to assign to regions in the border layout. These values are
     * used when a region does not contain a `weight` property. This object must have
     * properties for all regions ("north", "south", "east" and "west").
     * 
     * **IMPORTANT:** Since this is an object, changing its properties will impact ALL
     * instances of Border layout. If this is not desired, provide a replacement object as
     * a config option instead:
     * 
     *      layout: {
     *          type: 'border',
     *          regionWeights: {
     *              west: 20,
     *              north: 10,
     *              south: -10,
     *              east: -20
     *          }
     *      }
     *
     * The region with the highest weight is assigned space from the border before other
     * regions. Regions of equal weight are assigned space based on their position in the
     * owner's items list (first come, first served).
     */
    regionWeights: {
        north: 20,
        south: 10,
        center: 0,
        west: -10,
        east: -20
    },

    //----------------------------------
    // Layout processing

    /**
     * Creates the axis objects for the layout. These are only missing size information
     * which is added during {@link #calculate}.
     * @private
     */
    beginAxis: function (ownerContext, regions, name) {
        var me = this,
            props = me.axisProps[name],
            isVert = !props.horizontal,
            sizeProp = props.sizeProp,
            totalFlex = 0,
            childItems = ownerContext.childItems,
            length = childItems.length,
            center, i, childContext, centerFlex, comp, region, match, size, type, target, placeholder;

        for (i = 0; i < length; ++i) {
            childContext = childItems[i];
            comp = childContext.target;

            childContext.layoutPos = {};

            if (comp.region) {
                childContext.region = region = comp.region;

                childContext.isCenter = comp.isCenter;
                childContext.isHorz = comp.isHorz;
                childContext.isVert = comp.isVert;

                childContext.weight = comp.weight || me.regionWeights[region] || 0;
                regions[comp.id] = childContext;

                if (comp.isCenter) {
                    center = childContext;
                    centerFlex = comp.flex;
                    ownerContext.centerRegion = center;

                    continue;
                }

                if (isVert !== childContext.isVert) {
                    continue;
                }

                // process regions "isVert ? north||south : east||center||west"

                childContext.reverseWeighting = (region == props.borderEnd);

                size = comp[sizeProp];
                type = typeof size;

                if (!comp.collapsed) {
                    if (type == 'string' && (match = me.percentageRe.exec(size))) {
                        childContext.percentage = parseInt(match[1], 10);
                    } else if (comp.flex) {
                        totalFlex += childContext.flex = comp.flex;
                    }
                }
            }
        }

        // Special cases for a collapsed center region
        if (center) {
            target = center.target;

            if (placeholder = target.placeholderFor) {
                if (!centerFlex && isVert === placeholder.collapsedVertical()) {
                    // The center region is a placeholder, collapsed in this axis
                    centerFlex = 0;
                    center.collapseAxis = name;
                }
            } else if (target.collapsed && (isVert === target.collapsedVertical())) {
                // The center region is a collapsed header, collapsed in this axis
                centerFlex = 0;
                center.collapseAxis = name;
            }
        }

        if (centerFlex == null) {
            // If we still don't have a center flex, default to 1
            centerFlex = 1;
        }

        totalFlex += centerFlex;

        return Ext.apply({
            before         : isVert ? 'top' : 'left',
            totalFlex      : totalFlex
        }, props);
    },

    beginLayout: function (ownerContext) {
        var me = this,
            items = me.getLayoutItems(),
            pad = me.padding,
            type = typeof pad,
            padOnContainer = false,
            childContext, item, length, i, regions, collapseTarget,
            doShow, hidden, region;

        // We sync the visibility state of splitters with their region:
        if (pad) {
            if (type == 'string' || type == 'number') {
                pad = Ext.util.Format.parseBox(pad);
            }
        } else {
            pad = ownerContext.getEl('getTargetEl').getPaddingInfo();
            padOnContainer = true;
        }
        ownerContext.outerPad = pad;
        ownerContext.padOnContainer = padOnContainer;

        for (i = 0, length = items.length; i < length; ++i) {
            item = items[i];
            collapseTarget = me.getSplitterTarget(item);
            if (collapseTarget) {
                hidden = !!item.hidden;
                if (!collapseTarget.split) {
                    if (collapseTarget.isCollapsingOrExpanding) {
                        doShow = !!collapseTarget.collapsed;
                    }
                } else if (hidden !== collapseTarget.hidden) {
                    doShow = !collapseTarget.hidden;
                }
                
                if (doShow === true) {
                    item.show();
                } else if (doShow === false) {
                    item.hide();
                }
            }
        }

        // The above synchronized visibility of splitters with their regions, so we need
        // to make this call after that so that childItems and visibleItems are correct:
        //
        me.callParent(arguments);

        items = ownerContext.childItems;
        length = items.length;
        regions = {};

        ownerContext.borderAxisHorz = me.beginAxis(ownerContext, regions, 'horz');
        ownerContext.borderAxisVert = me.beginAxis(ownerContext, regions, 'vert');

        // Now that weights are assigned to the region's contextItems, we assign those
        // same weights to the contextItem for the splitters. We also cross link the
        // contextItems for the collapseTarget and its splitter.
        for (i = 0; i < length; ++i) {
            childContext = items[i];
            collapseTarget = me.getSplitterTarget(childContext.target);

            if (collapseTarget) { // if (splitter)
                region = regions[collapseTarget.id]
                if (!region) {
                        // if the region was hidden it will not be part of childItems, and
                        // so beginAxis() won't add it to the regions object, so we have
                        // to create the context item here.
                        region = ownerContext.getEl(collapseTarget.el, me);
                        region.region = collapseTarget.region;
                }
                childContext.collapseTarget = collapseTarget = region;
                childContext.weight = collapseTarget.weight;
                childContext.reverseWeighting = collapseTarget.reverseWeighting;
                collapseTarget.splitter = childContext;
                childContext.isHorz = collapseTarget.isHorz;
                childContext.isVert = collapseTarget.isVert;
            }
        }

        // Now we want to sort the childItems by their weight.
        me.sortWeightedItems(items, 'reverseWeighting');
        me.setupSplitterNeighbors(items);
    },

    calculate: function (ownerContext) {
        var me = this,
            containerSize = me.getContainerSize(ownerContext),
            childItems = ownerContext.childItems,
            length = childItems.length,
            horz = ownerContext.borderAxisHorz,
            vert = ownerContext.borderAxisVert,
            pad = ownerContext.outerPad,
            padOnContainer = ownerContext.padOnContainer,
            i, childContext, childMargins, size, horzPercentTotal, vertPercentTotal;

        horz.begin = pad.left;
        vert.begin = pad.top;
        // If the padding is already on the container we need to add it to the space
        // If not on the container, it's "virtual" padding.
        horzPercentTotal = horz.end = horz.flexSpace = containerSize.width + (padOnContainer ? pad.left : -pad.right);
        vertPercentTotal = vert.end = vert.flexSpace = containerSize.height + (padOnContainer ? pad.top : -pad.bottom);

        // Reduce flexSpace on each axis by the fixed/auto sized dimensions of items that
        // aren't flexed along that axis.
        for (i = 0; i < length; ++i) {
            childContext = childItems[i];
            childMargins = childContext.getMarginInfo();

            // Margins are always fixed size and must be removed from the space used for percentages and flexes
            if (childContext.isHorz || childContext.isCenter) {
                horz.addUnflexed(childMargins.width);
                horzPercentTotal -= childMargins.width;
            }

            if (childContext.isVert || childContext.isCenter) {
                vert.addUnflexed(childMargins.height);
                vertPercentTotal -= childMargins.height;
            }

            // Fixed size components must have their sizes removed from the space used for flex
            if (!childContext.flex && !childContext.percentage) {
                if (childContext.isHorz || (childContext.isCenter && childContext.collapseAxis === 'horz')) {
                    size = childContext.getProp('width');

                    horz.addUnflexed(size);

                    // splitters should not count towards percentages
                    if (childContext.collapseTarget) {
                        horzPercentTotal -= size;
                    }
                } else if (childContext.isVert || (childContext.isCenter && childContext.collapseAxis === 'vert')) {
                    size = childContext.getProp('height');

                    vert.addUnflexed(size);

                    // splitters should not count towards percentages
                    if (childContext.collapseTarget) {
                        vertPercentTotal -= size;
                    }
                }
                // else ignore center since it is fully flexed
            }
        }

        for (i = 0; i < length; ++i) {
            childContext = childItems[i];
            childMargins = childContext.getMarginInfo();

            // Calculate the percentage sizes. After this calculation percentages are very similar to fixed sizes
            if (childContext.percentage) {
                if (childContext.isHorz) {
                    size = Math.ceil(horzPercentTotal * childContext.percentage / 100);
                    size = childContext.setWidth(size);
                    horz.addUnflexed(size);
                } else if (childContext.isVert) {
                    size = Math.ceil(vertPercentTotal * childContext.percentage / 100);
                    size = childContext.setHeight(size);
                    vert.addUnflexed(size);
                }
                // center shouldn't have a percentage but if it does it should be ignored
            }
        }


        // If we haven't gotten sizes for all unflexed dimensions on an axis, the flexSpace
        // will be NaN so we won't be calculating flexed dimensions until that is resolved.

        for (i = 0; i < length; ++i) {
            childContext = childItems[i];

            if (!childContext.isCenter) {
                me.calculateChildAxis(childContext, horz);
                me.calculateChildAxis(childContext, vert);
            }
        }

        // Once all items are placed, the final size of the center can be determined. If we
        // can determine both width and height, we are done. We use '+' instead of '&&' to
        // avoid short-circuiting (we want to call both):
        if (me.finishAxis(ownerContext, vert) + me.finishAxis(ownerContext, horz) < 2) {
            me.done = false;
        } else {
            // Size information is published as we place regions but position is hard to do
            // that way (while avoiding published multiple times) so we publish all the
            // positions at the end.
            me.finishPositions(childItems);
        }
    },

    /**
     * Performs the calculations for a region on a specified axis.
     * @private
     */
    calculateChildAxis: function (childContext, axis) {
        var collapseTarget = childContext.collapseTarget,
            setSizeMethod = 'set' + axis.sizePropCap,
            sizeProp = axis.sizeProp,
            childMarginSize = childContext.getMarginInfo()[sizeProp],
            region, isBegin, flex, pos, size;

        if (collapseTarget) { // if (splitter)
            region = collapseTarget.region;
        } else {
            region = childContext.region;
            flex = childContext.flex;
        }

        isBegin = region == axis.borderBegin;

        if (!isBegin && region != axis.borderEnd) {
            // a north/south region on the horizontal axis or an east/west region on the
            // vertical axis: stretch to fill remaining space:
            childContext[setSizeMethod](axis.end - axis.begin - childMarginSize);
            pos = axis.begin;
        } else {
            if (flex) {
                size = Math.ceil(axis.flexSpace * (flex / axis.totalFlex));
                size = childContext[setSizeMethod](size);
            } else if (childContext.percentage) {
                // Like getProp but without registering a dependency - we calculated the size, we don't depend on it
                size = childContext.peek(sizeProp);
            } else {
                size = childContext.getProp(sizeProp);
            }

            size += childMarginSize;

            if (isBegin) {
                pos = axis.begin;
                axis.begin += size;
            } else {
                axis.end = pos = axis.end - size;
            }
        }

        childContext.layoutPos[axis.posProp] = pos;
    },

    /**
     * Finishes the calculations on an axis. This basically just assigns the remaining
     * space to the center region.
     * @private
     */
    finishAxis: function (ownerContext, axis) {
        var size = axis.end - axis.begin,
            center = ownerContext.centerRegion;

        if (center) {
            center['set' + axis.sizePropCap](size - center.getMarginInfo()[axis.sizeProp]);
            center.layoutPos[axis.posProp] = axis.begin;
        }

        return Ext.isNumber(size) ? 1 : 0;
    },

    /**
     * Finishes by setting the positions on the child items.
     * @private
     */
    finishPositions: function (childItems) {
        var length = childItems.length,
            index, childContext;

        for (index = 0; index < length; ++index) {
            childContext = childItems[index];

            childContext.setProp('x', childContext.layoutPos.x + childContext.marginInfo.left);
            childContext.setProp('y', childContext.layoutPos.y + childContext.marginInfo.top);
        }
    },

    getPlaceholder: function (comp) {
        return comp.getPlaceholder && comp.getPlaceholder();
    },

    getSplitterTarget: function (splitter) {
        var collapseTarget = splitter.collapseTarget;

        if (collapseTarget && collapseTarget.collapsed) {
            return collapseTarget.placeholder || collapseTarget;
        }

        return collapseTarget;
    },

    isItemBoxParent: function (itemContext) {
        return true;
    },

    isItemShrinkWrap: function (item) {
        return true;
    },

    //----------------------------------
    // Event handlers

    /**
     * Inserts the splitter for a given region. A reference to the splitter is also stored
     * on the component as "splitter".
     * @private
     */
    insertSplitter: function (item, index, hidden) {
        var region = item.region,
            splitter = {
                xtype: 'bordersplitter',
                collapseTarget: item,
                id: item.id + '-splitter',
                hidden: hidden,
                canResize: item.splitterResize !== false
            },
            at = index + ((region == 'south' || region == 'east') ? 0 : 1);

        // remove the default fixed width or height depending on orientation:
        if (item.isHorz) {
            splitter.height = null;
        } else {
            splitter.width = null;
        }

        if (item.collapseMode == 'mini') {
            splitter.collapsedCls = item.collapsedCls;
        }

        item.splitter = this.owner.add(at, splitter);
    },

    /**
     * Called when a region (actually when any component) is added to the container. The
     * region is decorated with some helpful properties (isCenter, isHorz, isVert) and its
     * splitter is added if its "split" property is true.
     * @private
     */
    onAdd: function (item, index) {
        var me = this,
            placeholderFor = item.placeholderFor,
            region = item.region,
            split,
            hidden;

        me.callParent(arguments);

        if (region) {
            Ext.apply(item, me.regionFlags[region]);

            if (region == 'center') {
                if (me.centerRegion) {
                    Ext.Error.raise("Cannot have multiple center regions in a BorderLayout.");
                }
                me.centerRegion = item;
            } else {
                item.collapseDirection = this.collapseDirections[region];
                split = item.split;
                hidden = !!item.hidden;
                if ((item.isHorz || item.isVert) && (split || item.collapseMode == 'mini')) {
                    me.insertSplitter(item, index, hidden || !split);
                }
            }

            if (!item.hasOwnProperty('collapseMode')) {
                item.collapseMode = me.panelCollapseMode;
            }

            if (!item.hasOwnProperty('animCollapse')) {
                if (item.collapseMode != 'placeholder') {
                    // other collapse modes do not animate nicely in a border layout, so
                    // default them to off:
                    item.animCollapse = false;
                } else {
                    item.animCollapse = me.panelCollapseAnimate;
                }
            }
        } else if (placeholderFor) {
            Ext.apply(item, me.regionFlags[placeholderFor.region]);
            item.region = placeholderFor.region;
            item.weight = placeholderFor.weight;
        }
    },

    onDestroy: function() {
        this.centerRegion = null;
        this.callParent();
    },

    onRemove: function (item) {
        var me = this,
            region = item.region,
            splitter = item.splitter;

        if (region) {
            if (item.isCenter) {
                me.centerRegion = null;
            }

            delete item.isCenter;
            delete item.isHorz;
            delete item.isVert;

            if (splitter) {
                me.owner.doRemove(splitter, true); // avoid another layout
                delete item.splitter;
            }
        }

        me.callParent(arguments);
    },

    //----------------------------------
    // Misc

    regionFlags: {
        center: { isCenter: true, isHorz: false, isVert: false },

        north: { isCenter: false, isHorz: false, isVert: true },
        south: { isCenter: false, isHorz: false, isVert: true },

        west: { isCenter: false, isHorz: true, isVert: false },
        east: { isCenter: false, isHorz: true, isVert: false }
    },

    setupSplitterNeighbors: function (items) {
        var edgeRegions = {
                //north: null,
                //south: null,
                //east: null,
                //west: null
            },
            length = items.length,
            touchedRegions = this.touchedRegions,
            i, j, center, count, edge, comp, region, splitter, touched;

        for (i = 0; i < length; ++i) {
            comp = items[i].target;
            region = comp.region;

            if (comp.isCenter) {
                center = comp;
            } else if (region) {
                touched = touchedRegions[region];

                for (j = 0, count = touched.length; j < count; ++j) {
                    edge = edgeRegions[touched[j]];
                    if (edge) {
                        edge.neighbors.push(comp);
                    }
                }
                
                if (comp.placeholderFor) {
                    // placeholder, so grab the splitter for the actual panel
                    splitter = comp.placeholderFor.splitter;
                } else {
                    splitter = comp.splitter;
                }
                if (splitter) {
                    splitter.neighbors = [];
                }

                edgeRegions[region] = splitter;
            }
        }

        if (center) {
            touched = touchedRegions.center;

            for (j = 0, count = touched.length; j < count; ++j) {
                edge = edgeRegions[touched[j]];
                if (edge) {
                    edge.neighbors.push(center);
                }
            }
        }
    },

    /**
     * Lists the regions that would consider an interior region a neighbor. For example,
     * a north region would consider an east or west region its neighbords (as well as
     * an inner north region).
     * @private
     */
    touchedRegions: {
        center: [ 'north', 'south', 'east',  'west' ],

        north:  [ 'north', 'east',  'west'  ],
        south:  [ 'south', 'east',  'west'  ],
        east:   [ 'east',  'north', 'south' ],
        west:   [ 'west',  'north', 'south' ]
    },

    sizePolicies: {
        vert: {
            setsWidth: 1,
            setsHeight: 0
        },
        horz: {
            setsWidth: 0,
            setsHeight: 1
        },
        flexAll: {
            setsWidth: 1,
            setsHeight: 1
        }
    },

    getItemSizePolicy: function (item) {
        var me = this,
            policies = this.sizePolicies,
            collapseTarget, size, policy, placeholderFor;

        if (item.isCenter) {
            placeholderFor = item.placeholderFor;

            if (placeholderFor) {
                if (placeholderFor.collapsedVertical()) {
                    return policies.vert;
                }
                return policies.horz;
            }
            if (item.collapsed) {
                if (item.collapsedVertical()) {
                    return policies.vert;
                }
                return policies.horz;
            }
            return policies.flexAll;
        }

        collapseTarget = item.collapseTarget;

        if (collapseTarget) {
            return collapseTarget.isVert ? policies.vert : policies.horz;
        }

        if (item.region) {
            if (item.isVert) {
                size = item.height;
                policy = policies.vert;
            } else {
                size = item.width;
                policy = policies.horz;
            }

            if (item.flex || (typeof size == 'string' && me.percentageRe.test(size))) {
                return policies.flexAll;
            }

            return policy;
        }

        return me.autoSizePolicy;
    }
}, function () {
    var methods = {
        addUnflexed: function (px) {
            this.flexSpace = Math.max(this.flexSpace - px, 0);
        }
    },
    props = this.prototype.axisProps;

    Ext.apply(props.horz, methods);
    Ext.apply(props.vert, methods);
});



/**
 * @private
 */
Ext.define('Ext.layout.container.boxOverflow.Menu', {

    /* Begin Definitions */

    extend: 'Ext.layout.container.boxOverflow.None',
    requires: ['Ext.toolbar.Separator', 'Ext.button.Button'],
    alternateClassName: 'Ext.layout.boxOverflow.Menu',
    
    /* End Definitions */

    /**
     * @cfg {String} triggerButtonCls
     * CSS class added to the Button which shows the overflow menu.
     */

    /**
     * @property {String} noItemsMenuText
     * HTML fragment to render into the toolbar overflow menu if there are no items to display
     */
    noItemsMenuText : '<div class="' + Ext.baseCSSPrefix + 'toolbar-no-items">(None)</div>',

    constructor: function(layout) {
        var me = this;

        me.callParent(arguments);

        me.triggerButtonCls = me.triggerButtonCls || Ext.baseCSSPrefix + 'box-menu-' + layout.getNames().right;
        /**
         * @property {Array} menuItems
         * Array of all items that are currently hidden and should go into the dropdown menu
         */
        me.menuItems = [];
    },

    beginLayout: function (ownerContext) {
        this.callParent(arguments);

        // Before layout, we need to re-show all items which we may have hidden due to a
        // previous overflow...
        this.clearOverflow(ownerContext);
    },

    beginLayoutCycle: function (ownerContext, firstCycle) {
        this.callParent(arguments);

        if (!firstCycle) {
            // if we are being re-run, we need to clear any overflow from the last run and
            // recache the childItems collection
            this.clearOverflow(ownerContext);

            this.layout.cacheChildItems(ownerContext);
        }
    },

    onRemove: function(comp){
        Ext.Array.remove(this.menuItems, comp);
    },

    // We don't define a prefix in menu overflow.
    getSuffixConfig: function() {
        var me = this,
            layout = me.layout,
            oid = layout.owner.id;

        /**
         * @private
         * @property {Ext.menu.Menu} menu
         * The expand menu - holds items for every item that cannot be shown
         * because the container is currently not large enough.
         */
        me.menu = new Ext.menu.Menu({
            listeners: {
                scope: me,
                beforeshow: me.beforeMenuShow
            }
        });

        /**
         * @private
         * @property {Ext.button.Button} menuTrigger
         * The expand button which triggers the overflow menu to be shown
         */
        me.menuTrigger = new Ext.button.Button({
            id      : oid + '-menu-trigger',
            cls     : Ext.layout.container.Box.prototype.innerCls + ' ' + me.triggerButtonCls,
            hidden  : true,
            ownerCt : layout.owner, // To enable the Menu to ascertain a valid zIndexManager owner in the same tree
            ownerLayout: layout,
            iconCls : Ext.baseCSSPrefix + me.getOwnerType(layout.owner) + '-more-icon',
            ui      : layout.owner instanceof Ext.toolbar.Toolbar ? 'default-toolbar' : 'default',
            menu    : me.menu,
            getSplitCls: function() { return '';}
        });

        return me.menuTrigger.getRenderTree();
    },
    
    getOverflowCls: function() {
        return Ext.baseCSSPrefix + this.layout.direction + '-box-overflow-body';
    },

    handleOverflow: function(ownerContext) {
        var me = this,
            layout = me.layout,
            names = layout.getNames(),
            plan = ownerContext.state.boxPlan,
            posArgs = [null, null];

        me.showTrigger(ownerContext);

        // Center the menuTrigger button.
        // TODO: Should we emulate align: 'middle' like this, or should we 'stretchmax' the menuTrigger?
        posArgs[names.heightIndex] = (plan.maxSize - me.menuTrigger[names.getHeight]()) / 2;
        me.menuTrigger.setPosition.apply(me.menuTrigger, posArgs);

        return {
            reservedSpace: me.menuTrigger[names.getWidth]()
        };
    },

    /**
     * Finishes the render operation of the trigger Button.
     * @private
     */
    captureChildElements: function() {
        var menuTrigger = this.menuTrigger;
        if (menuTrigger.rendering) {
            menuTrigger.finishRender();
        }
    },

    _asLayoutRoot: { isRoot: true },

    /**
     * @private
     * Called by the layout, when it determines that there is no overflow.
     * Also called as an interceptor to the layout's onLayout method to reshow
     * previously hidden overflowing items.
     */
    clearOverflow: function(ownerContext) {
        var me = this,
            items = me.menuItems,
            item,
            i = 0,
            length = items.length,
            owner = me.layout.owner,
            asLayoutRoot = me._asLayoutRoot;

        owner.suspendLayouts();
        me.captureChildElements();
        me.hideTrigger();
        owner.resumeLayouts();

        for (; i < length; i++) {
            item = items[i];

            // What we are doing here is preventing the layout bubble from invalidating our
            // owner component. We need just the button to be added to the layout run.
            item.suspendLayouts();
            item.show();
            item.resumeLayouts(asLayoutRoot);
        }

        items.length = 0;
    },

    /**
     * @private
     * Shows the overflow trigger when enableOverflow is set to true and the items
     * in the layout are too wide to fit in the space available
     */
    showTrigger: function(ownerContext) {
        var me = this,
            layout = me.layout,
            owner = layout.owner,
            names = layout.getNames(),
            startProp = names.x,
            sizeProp = names.width,
            plan = ownerContext.state.boxPlan,
            available = plan.targetSize[sizeProp],
            childItems = ownerContext.childItems,
            len = childItems.length,
            menuTrigger = me.menuTrigger,
            childContext,
            comp, i, props;

        // We don't want the menuTrigger.show to cause owner's layout to be invalidated, so
        // we force just the button to be invalidated and added to the current run.
        menuTrigger.suspendLayouts();
        menuTrigger.show();
        menuTrigger.resumeLayouts(me._asLayoutRoot);

        available -= me.menuTrigger.getWidth();

        owner.suspendLayouts();

        // Hide all items which are off the end, and store them to allow them to be restored
        // before each layout operation.
        me.menuItems.length = 0;
        for (i = 0; i < len; i++) {
            childContext = childItems[i];
            props = childContext.props;
            if (props[startProp] + props[sizeProp] > available) {
                comp = childContext.target;
                me.menuItems.push(comp);
                comp.hide();
            }
        }

        owner.resumeLayouts();
    },

    /**
     * @private
     */
    hideTrigger: function() {
        var menuTrigger = this.menuTrigger;
        if (menuTrigger) {
            menuTrigger.hide();
        }
    },

    /**
     * @private
     * Called before the overflow menu is shown. This constructs the menu's items, caching them for as long as it can.
     */
    beforeMenuShow: function(menu) {
        var me = this,
            items = me.menuItems,
            i = 0,
            len   = items.length,
            item,
            prev,
            needsSep = function(group, prev){
                return group.isXType('buttongroup') && !(prev instanceof Ext.toolbar.Separator);
            };

        menu.suspendLayouts();
        me.clearMenu();
        menu.removeAll();

        for (; i < len; i++) {
            item = items[i];

            // Do not show a separator as a first item
            if (!i && (item instanceof Ext.toolbar.Separator)) {
                continue;
            }
            if (prev && (needsSep(item, prev) || needsSep(prev, item))) {
                menu.add('-');
            }

            me.addComponentToMenu(menu, item);
            prev = item;
        }

        // put something so the menu isn't empty if no compatible items found
        if (menu.items.length < 1) {
            menu.add(me.noItemsMenuText);
        }
        menu.resumeLayouts();
    },
    
    /**
     * @private
     * Returns a menu config for a given component. This config is used to create a menu item
     * to be added to the expander menu
     * @param {Ext.Component} component The component to create the config for
     * @param {Boolean} hideOnClick Passed through to the menu item
     */
    createMenuConfig : function(component, hideOnClick) {
        var config = Ext.apply({}, component.initialConfig),
            group  = component.toggleGroup;

        Ext.copyTo(config, component, [
            'iconCls', 'icon', 'itemId', 'disabled', 'handler', 'scope', 'menu'
        ]);

        Ext.apply(config, {
            text       : component.overflowText || component.text,
            hideOnClick: hideOnClick,
            destroyMenu: false
        });

        // Clone must have same value, and must sync original's value on change
        if (component.isFormField) {
            config.value = component.getValue();

            // We're going to add a listener
            if (!config.listeners) {
                config.listeners = {};
            }

            // Sync the original component's value when the clone changes value.
            // This intentionally overwrites any developer-configured change listener on the clone.
            // That's because we monitor the clone's change event, and sync the
            // original field by calling setValue, so the original field's change
            // event will still fire.
            config.listeners.change = function(c, newVal, oldVal) {                            
                component.setValue(newVal);
            }
        }

        // ToggleButtons become CheckItems
        else if (group || component.enableToggle) {
            Ext.apply(config, {
                iconAlign: 'right',
                hideOnClick: false,
                group  : group,
                checked: component.pressed,
                listeners: {
                    checkchange: function(item, checked) {
                        component.toggle(checked);
                    }
                }
            });
        }

        delete config.ownerCt;
        delete config.xtype;
        delete config.id;
        return config;
    },

    /**
     * @private
     * Adds the given Toolbar item to the given menu. Buttons inside a buttongroup are added individually.
     * @param {Ext.menu.Menu} menu The menu to add to
     * @param {Ext.Component} component The component to add
     * TODO: Implement overrides in Ext.layout.container.boxOverflow which create overrides
     * for SplitButton, Button, ButtonGroup, and TextField. And a generic one for Component
     * which create clones suitable for use in an overflow menu.
     */
    addComponentToMenu : function(menu, component) {
        var me = this,
        i, items, iLen;

        if (component instanceof Ext.toolbar.Separator) {
            menu.add('-');
        } else if (component.isComponent) {
            if (component.isXType('splitbutton')) {
                menu.add(me.createMenuConfig(component, true));

            } else if (component.isXType('button')) {
                menu.add(me.createMenuConfig(component, !component.menu));

            } else if (component.isXType('buttongroup')) {
                items = component.items.items;
                iLen  = items.length;

                for (i = 0; i < iLen; i++) {
                    me.addComponentToMenu(menu, items[i]);
                }
            } else {
                menu.add(Ext.create(Ext.getClassName(component), me.createMenuConfig(component)));
            }
        }
    },

    /**
     * @private
     * Deletes the sub-menu of each item in the expander menu. Submenus are created for items such as
     * splitbuttons and buttongroups, where the Toolbar item cannot be represented by a single menu item
     */
    clearMenu : function() {
        var menu = this.menu,
            items, i, iLen, item;
        
        if (menu && menu.items) {
            items = menu.items.items;
            iLen  = items.length;
            
            for (i = 0; i < iLen; i++) {
                item = items[i];
                if (item.setMenu) {
                    item.setMenu(null);
                }
            }
        }
    },

    /**
     * @private
     */
    destroy: function() {
        var trigger = this.menuTrigger;
            
        if (trigger && !this.layout.owner.items.contains(trigger)) {
            // Ensure we delete the ownerCt if it's not in the items
            // so we don't get spurious container remove warnings.
            delete trigger.ownerCt;
        }
        Ext.destroy(this.menu, trigger);
    }
});

/**
 * Base Class for HBoxLayout and VBoxLayout Classes. Generally it should not need to be used directly.
 */
Ext.define('Ext.layout.container.Box', {

    /* Begin Definitions */

    alias: ['layout.box'],
    extend: 'Ext.layout.container.Container',
    alternateClassName: 'Ext.layout.BoxLayout',

    requires: [
        'Ext.layout.container.boxOverflow.None',
        'Ext.layout.container.boxOverflow.Menu',
        'Ext.layout.container.boxOverflow.Scroller',
        'Ext.util.Format',
        'Ext.dd.DragDropManager'
    ],

    /* End Definitions */

    /**
     * @cfg {Object} defaultMargins
     * If the individual contained items do not have a margins property specified or margin specified via CSS, the
     * default margins from this property will be applied to each item.
     *
     * This property may be specified as an object containing margins to apply in the format:
     *
     *     {
     *         top: (top margin),
     *         right: (right margin),
     *         bottom: (bottom margin),
     *         left: (left margin)
     *     }
     *
     * This property may also be specified as a string containing space-separated, numeric margin values. The order of
     * the sides associated with each value matches the way CSS processes margin values:
     *
     *   - If there is only one value, it applies to all sides.
     *   - If there are two values, the top and bottom borders are set to the first value and the right and left are
     *     set to the second.
     *   - If there are three values, the top is set to the first value, the left and right are set to the second,
     *     and the bottom is set to the third.
     *   - If there are four values, they apply to the top, right, bottom, and left, respectively.
     */
    defaultMargins: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
    },

    /**
     * @cfg {String} padding
     * Sets the padding to be applied to all child items managed by this layout.
     *
     * This property must be specified as a string containing space-separated, numeric padding values. The order of the
     * sides associated with each value matches the way CSS processes padding values:
     *
     *   - If there is only one value, it applies to all sides.
     *   - If there are two values, the top and bottom borders are set to the first value and the right and left are
     *     set to the second.
     *   - If there are three values, the top is set to the first value, the left and right are set to the second,
     *     and the bottom is set to the third.
     *   - If there are four values, they apply to the top, right, bottom, and left, respectively.
     */
    padding: 0,

    /**
     * @cfg {String} pack
     * Controls how the child items of the container are packed together. Acceptable configuration values for this
     * property are:
     *
     *   - **start** - child items are packed together at **left** (HBox) or **top** (VBox) side of container (*default**)
     *   - **center** - child items are packed together at **mid-width** (HBox) or **mid-height** (VBox) of container
     *   - **end** - child items are packed together at **right** (HBox) or **bottom** (VBox) side of container
     */
    pack: 'start',

    /**
     * @cfg {Number} flex
     * This configuration option is to be applied to **child items** of the container managed by this layout. Each child
     * item with a flex property will be flexed (horizontally in `hbox`, vertically in `vbox`) according to each item's
     * **relative** flex value compared to the sum of all items with a flex value specified. Any child items that have
     * either a `flex = 0` or `flex = undefined` will not be 'flexed' (the initial size will not be changed).
     */
    flex: undefined,

    /**
     * @cfg {String/Ext.Component} stretchMaxPartner
     * Allows stretchMax calculation to take into account the max perpendicular size (height for HBox layout and width
     * for VBox layout) of another Box layout when calculating its maximum perpendicular child size.
     *
     * If specified as a string, this may be either a known Container ID, or a ComponentQuery selector which is rooted
     * at this layout's Container (ie, to find a sibling, use `"^>#siblingItemId`).
     */
    stretchMaxPartner: undefined,

    type: 'box',
    scrollOffset: 0,
    itemCls: Ext.baseCSSPrefix + 'box-item',
    targetCls: Ext.baseCSSPrefix + 'box-layout-ct',
    innerCls: Ext.baseCSSPrefix + 'box-inner',

    // availableSpaceOffset is used to adjust the availableWidth, typically used
    // to reserve space for a scrollbar
    availableSpaceOffset: 0,

    // whether or not to reserve the availableSpaceOffset in layout calculations
    reserveOffset: true,

    manageMargins: true,

    childEls: [
        'innerCt',
        'targetEl'
    ],

    renderTpl: [
        '{%var oc,l=values.$comp.layout,oh=l.overflowHandler;',
        'if (oh.getPrefixConfig!==Ext.emptyFn) {',
            'if(oc=oh.getPrefixConfig())dh.generateMarkup(oc, out)',
        '}%}',
        '<div id="{ownerId}-innerCt" class="{[l.innerCls]} {[oh.getOverflowCls()]}" role="presentation">',
            '<div id="{ownerId}-targetEl" style="position:absolute;',
                    // This width for the "CSS container box" of the box child items gives
                    // them the room they need to avoid being "crushed" (aka, "wrapped").
                    // On Opera, elements cannot be wider than 32767px or else they break
                    // the scrollWidth (it becomes == offsetWidth) and you cannot scroll
                    // the content.
                    'width:20000px;',
                    // On IE quirks and IE6/7 strict, a text-align:center style trickles
                    // down to this el at times and will cause it to move off the left edge.
                    // The easy fix is to just always set left:0px here. The top:0px part
                    // is just being paranoid. The requirement for targetEl is that its
                    // origin align with innerCt... this ensures that it does!
                    'left:0px;top:0px;',
                    // If we don't give the element a height, it does not always participate
                    // in the scrollWidth.
                    'height:1px">',
                '{%this.renderBody(out, values)%}',
            '</div>',
        '</div>',
        '{%if (oh.getSuffixConfig!==Ext.emptyFn) {',
            'if(oc=oh.getSuffixConfig())dh.generateMarkup(oc, out)',
        '}%}',
        {
            disableFormats: true,
            definitions: 'var dh=Ext.DomHelper;'
        }
    ],

    constructor: function(config) {
        var me = this,
            type;

        me.callParent(arguments);

        // The sort function needs access to properties in this, so must be bound.
        me.flexSortFn = Ext.Function.bind(me.flexSort, me);

        me.initOverflowHandler();

        type = typeof me.padding;
        if (type == 'string' || type == 'number') {
            me.padding = Ext.util.Format.parseBox(me.padding);
            me.padding.height = me.padding.top  + me.padding.bottom;
            me.padding.width  = me.padding.left + me.padding.right;
        }
    },

    getNames: function () {
        return this.names;
    },

    // Matches: <spaces>digits[.digits]<spaces>%<spaces>
    // Captures: digits[.digits]
    _percentageRe: /^\s*(\d+(?:\.\d*)?)\s*[%]\s*$/,

    getItemSizePolicy: function (item, ownerSizeModel) {
        var me = this,
            policy = me.sizePolicy,
            align = me.align,
            flex = item.flex,
            key = align,
            names = me.names,
            width = item[names.width],
            height = item[names.height],
            percentageRe = me._percentageRe,
            percentageWidth = percentageRe.test(width),
            isStretch = (align == 'stretch');
            
        if ((isStretch || flex || percentageWidth) && !ownerSizeModel) {
            ownerSizeModel = me.owner.getSizeModel();
        }

        if (isStretch) {
            // If we are height.shrinkWrap, we behave as if we were stretchmax (for more
            // details, see beginLayoutCycle)...
            if (!percentageRe.test(height) && ownerSizeModel[names.height].shrinkWrap) {
                key = 'stretchmax';
                // We leave %age height as stretch since it will not participate in the
                // stretchmax size calculation. This avoid running such a child in its
                // shrinkWrap mode prior to supplying the calculated size.
            }
        } else if (align != 'stretchmax') {
            if (percentageRe.test(height)) {
                // Height %ages are calculated based on container size, so they are the
                // same as align=stretch for this purpose...
                key = 'stretch';
            } else {
                key = '';
            }
        }

        if (flex || percentageWidth) {
            // If we are width.shrinkWrap, we won't be flexing since that requires a
            // container width...
            if (!ownerSizeModel[names.width].shrinkWrap) {
                policy = policy.flex; // both flex and %age width are calculated
            }
        }

        return policy[key];
    },

    flexSort: function (a, b) {
        var maxWidthName = this.getNames().maxWidth,
            infiniteValue = Infinity;

        a = a.target[maxWidthName] || infiniteValue;
        b = b.target[maxWidthName] || infiniteValue;

        // IE 6/7 Don't like Infinity - Infinity...
        if (!isFinite(a) && !isFinite(b)) {
            return 0;
        }

        return a - b;
    },

    isItemBoxParent: function (itemContext) {
        return true;
    },

    isItemShrinkWrap: function (item) {
        return true;
    },

    // Sort into *descending* order.
    minSizeSortFn: function(a, b) {
        return b.available - a.available;
    },

    roundFlex: function(width) {
        return Math.ceil(width);
    },

    /**
     * @private
     * Called by an owning Panel before the Panel begins its collapse process.
     * Most layouts will not need to override the default Ext.emptyFn implementation.
     */
    beginCollapse: function(child) {
        var me = this;

        if (me.direction === 'vertical' && child.collapsedVertical()) {
            child.collapseMemento.capture(['flex']);
            delete child.flex;
        } else if (me.direction === 'horizontal' && child.collapsedHorizontal()) {
            child.collapseMemento.capture(['flex']);
            delete child.flex;
        }
    },

    /**
     * @private
     * Called by an owning Panel before the Panel begins its expand process.
     * Most layouts will not need to override the default Ext.emptyFn implementation.
     */
    beginExpand: function(child) {

        // Restores the flex if we used to be flexed before
        child.collapseMemento.restore(['flex']);
    },

    beginLayout: function (ownerContext) {
        var me = this,
            smp = me.owner.stretchMaxPartner,
            style = me.innerCt.dom.style,
            names = me.getNames();

        ownerContext.boxNames = names;

        // this must happen before callParent to allow the overflow handler to do its work
        // that can effect the childItems collection...
        me.overflowHandler.beginLayout(ownerContext);

        // get the contextItem for our stretchMax buddy:
        if (typeof smp === 'string') {
            smp = Ext.getCmp(smp) || me.owner.query(smp)[0];
        }

        ownerContext.stretchMaxPartner = smp && ownerContext.context.getCmp(smp);

        me.callParent(arguments);

        ownerContext.innerCtContext = ownerContext.getEl('innerCt', me);

        // Capture whether the owning Container is scrolling in the parallel direction
        me.scrollParallel = !!(me.owner.autoScroll || me.owner[names.overflowX]);

        // Capture whether the owning Container is scrolling in the perpendicular direction
        me.scrollPerpendicular = !!(me.owner.autoScroll || me.owner[names.overflowY]);

        // If we *are* scrolling parallel, capture the scroll position of the encapsulating element
        if (me.scrollParallel) {
            me.scrollPos = me.owner.getTargetEl().dom[names.scrollLeft];
        }

        // Don't allow sizes burned on to the innerCt to influence measurements.
        style.width = '';
        style.height = '';
    },

    beginLayoutCycle: function (ownerContext, firstCycle) {
        var me = this,
            align = me.align,
            names = ownerContext.boxNames,
            pack = me.pack,
            heightModelName = names.heightModel;

        // this must happen before callParent to allow the overflow handler to do its work
        // that can effect the childItems collection...
        me.overflowHandler.beginLayoutCycle(ownerContext, firstCycle);

        me.callParent(arguments);

        // Cache several of our string concat/compare results (since width/heightModel can
        // change if we are invalidated, we cannot do this in beginLayout)

        ownerContext.parallelSizeModel      = ownerContext[names.widthModel];
        ownerContext.perpendicularSizeModel = ownerContext[heightModelName];

        ownerContext.boxOptions = {
            align: align = {
                stretch:    align == 'stretch',
                stretchmax: align == 'stretchmax',
                center:     align == names.center
            },
            pack: pack = {
                center: pack == 'center',
                end:    pack == 'end'
            }
        };

        // Consider an hbox w/stretch which means "assign all items the container's height".
        // The spirit of this request is make all items the same height, but when shrinkWrap
        // height is also requested, the height of the tallest item determines the height.
        // This is exactly what the stretchmax option does, so we jiggle the flags here to
        // act as if stretchmax were requested.

        if (align.stretch && ownerContext.perpendicularSizeModel.shrinkWrap) {
            align.stretchmax = true;
            align.stretch = false;
        }

        // This is handy for knowing that we might need to apply height %ages
        align.nostretch = !(align.stretch || align.stretchmax);

        // In our example hbox, packing items to the right (end) or center can only work if
        // there is a container width. So, if we are shrinkWrap, we just turn off the pack
        // options for the run.

        if (ownerContext.parallelSizeModel.shrinkWrap) {
            pack.center = pack.end = false;
        }

        me.cacheFlexes(ownerContext);

        // In webkit we set the width of the target el equal to the width of the innerCt
        // when the layout cycle is finished, so we need to set it back to 20000px here
        // to prevent the children from being crushed. 
        if (Ext.isWebKit) {
            me.targetEl.setWidth(20000);
        }
    },

    /**
     * This method is called to (re)cache our understanding of flexes. This happens during beginLayout and may need to
     * be called again if the flexes are changed during the layout (e.g., like ColumnLayout).
     * @param {Object} ownerContext
     * @protected
     */
    cacheFlexes: function (ownerContext) {
        var me = this,
            names = ownerContext.boxNames,
            widthModelName = names.widthModel,
            heightModelName = names.heightModel,
            nostretch = ownerContext.boxOptions.align.nostretch,
            totalFlex = 0,
            childItems = ownerContext.childItems,
            i = childItems.length,
            flexedItems = [],
            minWidth = 0,
            minWidthName = names.minWidth,
            percentageRe = me._percentageRe,
            percentageWidths = 0,
            percentageHeights = 0,
            child, childContext, flex, match;

        while (i--) {
            childContext = childItems[i];
            child = childContext.target;

            // check widthModel to see if we are the sizing layout. If so, copy the flex
            // from the item to the contextItem and add it to totalFlex
            //
            if (childContext[widthModelName].calculated) {
                childContext.flex = flex = child.flex;
                if (flex) {
                    totalFlex += flex;
                    flexedItems.push(childContext);
                    minWidth += child[minWidthName] || 0;
                } else { // a %age width...
                    match = percentageRe.exec(child[names.width]);
                    childContext.percentageParallel = parseFloat(match[1]) / 100;
                    ++percentageWidths;
                }
            }
            // the above means that "childContext.flex" is properly truthy/falsy, which is
            // often times quite convenient...

            if (nostretch && childContext[heightModelName].calculated) {
                // the only reason we would be calculated height in this case is due to a
                // height %age...
                match = percentageRe.exec(child[names.height]);
                childContext.percentagePerpendicular = parseFloat(match[1]) / 100;
                ++percentageHeights;
            }
        }

        ownerContext.flexedItems = flexedItems;
        ownerContext.flexedMinSize = minWidth;
        ownerContext.totalFlex = totalFlex;
        ownerContext.percentageWidths = percentageWidths;
        ownerContext.percentageHeights = percentageHeights;

        // The flexed boxes need to be sorted in ascending order of maxSize to work properly
        // so that unallocated space caused by maxWidth being less than flexed width can be
        // reallocated to subsequent flexed boxes.
        Ext.Array.sort(flexedItems, me.flexSortFn);
    },

    calculate: function(ownerContext) {
        var me = this,
            targetSize = me.getContainerSize(ownerContext),
            names = ownerContext.boxNames,
            state = ownerContext.state,
            plan = state.boxPlan || (state.boxPlan = {});

        plan.targetSize = targetSize;

        // If we are not widthModel.shrinkWrap, we need the width before we can lay out boxes:
        if (!ownerContext.parallelSizeModel.shrinkWrap && !targetSize[names.gotWidth]) {
            me.done = false;
            return;
        }

        if (!state.parallelDone) {
            state.parallelDone = me.calculateParallel(ownerContext, names, plan);
        }

        if (!state.perpendicularDone) {
            state.perpendicularDone = me.calculatePerpendicular(ownerContext, names, plan);
        }

        if (state.parallelDone && state.perpendicularDone) {
            // Fix for left and right docked Components in a dock component layout. This is for docked Headers and docked Toolbars.
            // Older Microsoft browsers do not size a position:absolute element's width to match its content.
            // So in this case, in the publishInnerCtSize method we may need to adjust the size of the owning Container's element explicitly based upon
            // the discovered max width. So here we put a calculatedWidth property in the metadata to facilitate this.
            if (me.owner.dock && (Ext.isIE6 || Ext.isIE7 || Ext.isIEQuirks) && !me.owner.width && !me.horizontal) {
                plan.isIEVerticalDock = true;
                plan.calculatedWidth = plan.maxSize + ownerContext.getPaddingInfo().width + ownerContext.getFrameInfo().width;
            }

            me.publishInnerCtSize(ownerContext, me.reserveOffset ? me.availableSpaceOffset : 0);

            // Calculate stretchmax only if there is >1 child item
            if (me.done && ownerContext.childItems.length > 1 && ownerContext.boxOptions.align.stretchmax && !state.stretchMaxDone) {
                me.calculateStretchMax(ownerContext, names, plan);
                state.stretchMaxDone = true;
            }
        } else {
            me.done = false;
        }
    },

    calculateParallel: function(ownerContext, names, plan) {
        var me = this,
            widthName = names.width,
            childItems = ownerContext.childItems,
            leftName = names.left,
            rightName = names.right,
            setWidthName = names.setWidth,
            childItemsLength = childItems.length,
            flexedItems = ownerContext.flexedItems,
            flexedItemsLength = flexedItems.length,
            pack = ownerContext.boxOptions.pack,
            padding = me.padding,
            containerWidth = plan.targetSize[widthName],
            totalMargin = 0,
            left = padding[leftName],
            nonFlexWidth = left + padding[rightName] + me.scrollOffset +
                                    (me.reserveOffset ? me.availableSpaceOffset : 0),
            scrollbarWidth = Ext.getScrollbarSize()[names.width],
            i, childMargins, remainingWidth, remainingFlex, childContext, flex, flexedWidth,
            contentWidth, mayNeedScrollbarAdjust, childWidth, percentageSpace;

        // We may need to add scrollbar size to parallel size if
        //     Scrollbars take up space
        //     and we are scrolling in the perpendicular direction
        //     and shrinkWrapping in the parallel direction,
        //     and NOT stretching perpendicular dimensions to fit
        //     and NOT shrinkWrapping in the perpendicular direction
        if (scrollbarWidth &&
            me.scrollPerpendicular &&
            ownerContext.parallelSizeModel.shrinkWrap &&
            !ownerContext.boxOptions.align.stretch &&
            !ownerContext.perpendicularSizeModel.shrinkWrap) {

            // If its possible that we may need to add scrollbar size to the parallel size
            // then we need to wait until the perpendicular size has been determined,
            // so that we know if there is a scrollbar.
            if (!ownerContext.state.perpendicularDone) {
                return false;
            }
            mayNeedScrollbarAdjust = true;
        }

        // Gather the total size taken up by non-flexed items:
        for (i = 0; i < childItemsLength; ++i) {
            childContext = childItems[i];
            childMargins = childContext.marginInfo || childContext.getMarginInfo();

            totalMargin += childMargins[widthName];

            if (!childContext[names.widthModel].calculated) {
                childWidth = childContext.getProp(widthName);
                nonFlexWidth += childWidth; // min/maxWidth safe
                if (isNaN(nonFlexWidth)) {
                    return false;
                }
            }
        }

        nonFlexWidth += totalMargin;
        if (ownerContext.percentageWidths) {
            percentageSpace = containerWidth - totalMargin;
            if (isNaN(percentageSpace)) {
                return false;
            }

            for (i = 0; i < childItemsLength; ++i) {
                childContext = childItems[i];
                if (childContext.percentageParallel) {
                    childWidth = Math.ceil(percentageSpace * childContext.percentageParallel);
                    childWidth = childContext.setWidth(childWidth);
                    nonFlexWidth += childWidth;
                }
            }
        }

        // if we get here, we have all the childWidths for non-flexed items...

        if (ownerContext.parallelSizeModel.shrinkWrap) {
            plan.availableSpace = 0;
            plan.tooNarrow = false;
        } else {
            plan.availableSpace = containerWidth - nonFlexWidth;

            // If we're going to need space for a parallel scrollbar, then we need to redo the perpendicular measurements
            plan.tooNarrow = plan.availableSpace < ownerContext.flexedMinSize;
            if (plan.tooNarrow && Ext.getScrollbarSize()[names.height] && me.scrollParallel && ownerContext.state.perpendicularDone) {
                ownerContext.state.perpendicularDone = false;
                for (i = 0; i < childItemsLength; ++i) {
                    childItems[i].invalidate();
                }
            }
        }

        contentWidth = nonFlexWidth;
        remainingWidth = plan.availableSpace;
        remainingFlex = ownerContext.totalFlex;

        // Calculate flexed item sizes:
        for (i = 0; i < flexedItemsLength; i++) {
            childContext = flexedItems[i];
            flex         = childContext.flex;
            flexedWidth  = me.roundFlex((flex / remainingFlex) * remainingWidth);
            flexedWidth  = childContext[setWidthName](flexedWidth); // constrained

            // due to minWidth constraints, it may be that flexedWidth > remainingWidth

            contentWidth   += flexedWidth;
            // Remaining space has already had margins subtracted, so just subtract size
            remainingWidth  = Math.max(0, remainingWidth - flexedWidth); // no negatives!
            remainingFlex  -= flex;
        }

        if (pack.center) {
            left += remainingWidth / 2;

            // If content is too wide to pack to center, do not allow the centering calculation to place it off the left edge.
            if (left < 0) {
                left = 0;
            }
        } else if (pack.end) {
            left += remainingWidth;
        }

        // Assign parallel position for the boxes:
        for (i = 0; i < childItemsLength; ++i) {
            childContext = childItems[i];
            childMargins = childContext.marginInfo; // already cached by first loop

            left += childMargins[leftName];

            childContext.setProp(names.x, left);

            // We can read directly from "props.width" because we have already properly
            // requested it in the calculation of nonFlexedWidths or we calculated it.
            // We cannot call getProp because that would be inappropriate for flexed items
            // and we don't need any extra function call overhead:
            left += childMargins[rightName] + childContext.props[widthName];
        }

        contentWidth += ownerContext.targetContext.getPaddingInfo()[widthName];

        // Stash the contentWidth on the state so that it can always be accessed later in the calculation
        ownerContext.state.contentWidth = contentWidth; 

        // if there is perpendicular overflow, the published parallel content size includes
        // the size of the perpendicular scrollbar.
        if (mayNeedScrollbarAdjust &&
            (ownerContext.peek(names.contentHeight) > plan.targetSize[names.height])) {
            contentWidth += scrollbarWidth;
            ownerContext[names.hasOverflowY] = true;

            // tell the component layout to set the parallel size in the dom
            ownerContext.target.componentLayout[names.setWidthInDom] = true;

            // IE8 in what passes for "strict" mode will not create a scrollbar if 
            // there is just the *exactly correct* spare space created for it. We
            // have to force that to happen once all the styles have been flushed
            // to the DOM (see completeLayout):
            ownerContext[names.invalidateScrollY] = (Ext.isStrict && Ext.isIE8);
        }
        ownerContext[names.setContentWidth](contentWidth);

        return true;
    },

    calculatePerpendicular: function(ownerContext, names, plan) {
        var me = this,
            heightShrinkWrap = ownerContext.perpendicularSizeModel.shrinkWrap,
            targetSize = plan.targetSize,
            childItems = ownerContext.childItems,
            childItemsLength = childItems.length,
            mmax = Math.max,
            heightName = names.height,
            setHeightName = names.setHeight,
            topName = names.top,
            topPositionName = names.y,
            padding = me.padding,
            top = padding[topName],
            availHeight = targetSize[heightName] - top - padding[names.bottom],
            align = ownerContext.boxOptions.align,
            isStretch    = align.stretch, // never true if heightShrinkWrap (see beginLayoutCycle)
            isStretchMax = align.stretchmax,
            isCenter     = align.center,
            maxHeight = 0,
            hasPercentageSizes = 0,
            scrollbarHeight = Ext.getScrollbarSize().height,
            childTop, i, childHeight, childMargins, diff, height, childContext,
            stretchMaxPartner, stretchMaxChildren, shrinkWrapParallelOverflow, 
            percentagePerpendicular;

        if (isStretch || (isCenter && !heightShrinkWrap)) {
            if (isNaN(availHeight)) {
                return false;
            }
        }

        // If the intention is to horizontally scroll child components, but the container is too narrow,
        // then:
        //     if we are shrinkwrapping height:
        //         Set a flag because we are going to expand the height taken by the perpendicular dimension to accommodate the scrollbar
        //     else
        //         We must allow for the parallel scrollbar to intrude into the height
        if (me.scrollParallel && plan.tooNarrow) {
            if (heightShrinkWrap) {
                shrinkWrapParallelOverflow = true;
            } else {
                availHeight -= scrollbarHeight;
                plan.targetSize[heightName] -= scrollbarHeight;
            }
        }

        if (isStretch) {
            height = availHeight; // never heightShrinkWrap...
        } else {
            for (i = 0; i < childItemsLength; i++) {
                childContext = childItems[i];
                childMargins = (childContext.marginInfo || childContext.getMarginInfo())[heightName];

                if (!(percentagePerpendicular = childContext.percentagePerpendicular)) {
                    childHeight = childContext.getProp(heightName);
                } else {
                    ++hasPercentageSizes;
                    if (heightShrinkWrap) {
                        // height %age items cannot contribute to maxHeight... they are going
                        // to be a %age of that maxHeight!
                        continue;
                    } else {
                        childHeight = percentagePerpendicular * availHeight - childMargins;
                        childHeight = childContext[names.setHeight](childHeight);
                    }
                }

                // Max perpendicular measurement (used for stretchmax) must take the min perpendicular size of each child into account in case any fall short.
                if (isNaN(maxHeight = mmax(maxHeight, childHeight + childMargins,
                                           childContext.target[names.minHeight] || 0))) {
                    return false; // heightShrinkWrap || isCenter || isStretchMax ??
                }
            }

            // If there is going to be a parallel scrollbar maxHeight must include it to the outside world.
            // ie: a stretchmaxPartner, and the setContentHeight
            if (shrinkWrapParallelOverflow) {
                maxHeight += scrollbarHeight;
                ownerContext[names.hasOverflowX] = true;

                // tell the component layout to set the perpendicular size in the dom
                ownerContext.target.componentLayout[names.setHeightInDom] = true;

                // IE8 in what passes for "strict" mode will not create a scrollbar if 
                // there is just the *exactly correct* spare space created for it. We
                // have to force that to happen once all the styles have been flushed
                // to the DOM (see completeLayout):
                ownerContext[names.invalidateScrollX] = (Ext.isStrict && Ext.isIE8);
            }

            // If we are associated with another box layout, grab its maxChildHeight
            // This must happen before we calculate and publish our contentHeight
            stretchMaxPartner = ownerContext.stretchMaxPartner;
            if (stretchMaxPartner) {
                // Publish maxChildHeight as soon as it has been calculated for our partner:
                ownerContext.setProp('maxChildHeight', maxHeight);
                stretchMaxChildren = stretchMaxPartner.childItems;
                // Only wait for maxChildHeight if our partner has visible items:
                if (stretchMaxChildren && stretchMaxChildren.length) {
                    maxHeight = mmax(maxHeight, stretchMaxPartner.getProp('maxChildHeight'));
                    if (isNaN(maxHeight)) {
                        return false;
                    }
                }
            }

            ownerContext[names.setContentHeight](maxHeight + me.padding[heightName] +
                    ownerContext.targetContext.getPaddingInfo()[heightName]);

            // We have to publish the contentHeight with the additional scrollbarHeight
            // to encourage our container to accomodate it, but we must remove the height
            // of the scrollbar as we go to sizing or centering the children.
            if (shrinkWrapParallelOverflow) {
                maxHeight -= scrollbarHeight;
            }
            plan.maxSize = maxHeight;

            if (isStretchMax) {
                height = maxHeight;
            } else if (isCenter || hasPercentageSizes) {
                height = heightShrinkWrap ? maxHeight : mmax(availHeight, maxHeight);

                // When calculating a centered position within the content box of the innerCt,
                // the width of the borders must be subtracted from the size to yield the
                // space available to center within. The publishInnerCtSize method explicitly
                // adds the border widths to the set size of the innerCt.
                height -= ownerContext.innerCtContext.getBorderInfo()[heightName];
            }
        }

        for (i = 0; i < childItemsLength; i++) {
            childContext = childItems[i];
            childMargins = childContext.marginInfo || childContext.getMarginInfo();

            childTop = top + childMargins[topName];

            if (isStretch) {
                childContext[setHeightName](height - childMargins[heightName]);
            } else {
                percentagePerpendicular = childContext.percentagePerpendicular;
                if (heightShrinkWrap && percentagePerpendicular) {
                    childMargins = childContext.marginInfo || childContext.getMarginInfo();
                    childHeight = percentagePerpendicular * height - childMargins[heightName];
                    childHeight = childContext.setHeight(childHeight);
                }

                if (isCenter) {
                    diff = height - childContext.props[heightName];
                    if (diff > 0) {
                        childTop = top + Math.round(diff / 2);
                    }
                }
            }

            childContext.setProp(topPositionName, childTop);
        }

        return true;
    },

    calculateStretchMax: function (ownerContext, names, plan) {
        var me = this,
            heightName = names.height,
            widthName = names.width,
            childItems = ownerContext.childItems,
            length = childItems.length,
            height = plan.maxSize,
            onBeforeInvalidateChild = me.onBeforeInvalidateChild,
            onAfterInvalidateChild = me.onAfterInvalidateChild,
            childContext, props, i, childHeight;

        for (i = 0; i < length; ++i) {
            childContext = childItems[i];

            props = childContext.props;
            childHeight = height - childContext.getMarginInfo()[heightName];

            if (childHeight != props[heightName] ||   // if (wrong height ...
                childContext[names.heightModel].constrained) { // ...or needs invalidation)
                // When we invalidate a child, since we won't be around to size or position
                // it, we include an after callback that will be run after the invalidate
                // that will (re)do that work. The good news here is that we can read the
                // results of all that from the childContext props.
                //
                // We also include a before callback to change the sizeModel to calculated
                // prior to the layout being invoked.
                childContext.invalidate({
                    before: onBeforeInvalidateChild,
                    after: onAfterInvalidateChild,
                    layout: me,
                    // passing this data avoids a 'scope' and its Function.bind
                    childWidth: props[widthName],
                    // subtract margins from the maximum value
                    childHeight: childHeight,
                    childX: props.x,
                    childY: props.y,
                    names: names
                });
            }
        }
    },

    completeLayout: function(ownerContext) {
        var me = this,
            names = ownerContext.boxNames,
            invalidateScrollX = ownerContext.invalidateScrollX,
            invalidateScrollY = ownerContext.invalidateScrollY,
            dom, el, overflowX, overflowY, styles;

        me.overflowHandler.completeLayout(ownerContext);

        if (invalidateScrollX || invalidateScrollY) {
            el = me.getTarget();
            dom = el.dom;
            styles = dom.style;

            if (invalidateScrollX) {
                // get computed style to see if we are 'auto'
                overflowX = el.getStyle('overflowX');
                if (overflowX == 'auto') {
                    // capture the inline style (if any) so we can restore it later:
                    overflowX = styles.overflowX;
                    styles.overflowX = 'scroll'; // force the scrollbar to appear
                } else {
                    invalidateScrollX = false; // no work really since not 'auto'
                }
            }

            if (invalidateScrollY) {
                // get computed style to see if we are 'auto'
                overflowY = el.getStyle('overflowY');
                if (overflowY == 'auto') {
                    // capture the inline style (if any) so we can restore it later:
                    overflowY = styles.overflowY;
                    styles.overflowY = 'scroll'; // force the scrollbar to appear
                } else {
                    invalidateScrollY = false; // no work really since not 'auto'
                }
            }

            if (invalidateScrollX || invalidateScrollY) { // if (some form of 'auto' in play)
                // force a reflow...
                dom.scrollWidth;

                if (invalidateScrollX) {
                    styles.overflowX = overflowX; // restore inline style
                }
                if (invalidateScrollY) {
                    styles.overflowY = overflowY; // restore inline style
                }
            }
        }

        // If we are scrolling parallel, restore the saved scroll position
        if (me.scrollParallel) {
            me.owner.getTargetEl().dom[names.scrollLeft] = me.scrollPos;
        }
    },

    finishedLayout: function(ownerContext) {
        this.overflowHandler.finishedLayout(ownerContext);
        this.callParent(arguments);

        // Fix for an obscure webkit bug (EXTJSIV-5962) caused by the targetEl's 20000px
        // width.  We set a very large width on the targetEl at the beginning of the 
        // layout cycle to prevent any "crushing" effect on the child items, however
        // in some cases the very large width makes it possible to scroll the innerCt
        // by dragging on certain child elements. To prevent this from happening we ensure
        // that the targetEl's width is the same as the innerCt.
        if (Ext.isWebKit) {
            this.targetEl.setWidth(ownerContext.innerCtContext.props.width);
        }
    },

    onBeforeInvalidateChild: function (childContext, options) {
        // NOTE: No "this" pointer in here...
        var heightModelName = options.names.heightModel;

        // Change the childItem to calculated (i.e., "set by ownerCt"). The component layout
        // of the child can course-correct (like dock layout does for a collapsed panel),
        // so we must make these changes here before that layout's beginLayoutCycle is
        // called.
        if (!childContext[heightModelName].constrainedMax) {
            // if the child hit a max constraint, it needs to be at its configured size, so
            // we leave the sizeModel alone...
            childContext[heightModelName] = Ext.layout.SizeModel.calculated;
        }
    },

    onAfterInvalidateChild: function (childContext, options) {
        // NOTE: No "this" pointer in here...
        var names = options.names,
            scrollbarSize = Ext.getScrollbarSize(),
            childHeight = options.childHeight,
            childWidth = options.childWidth;

        childContext.setProp('x', options.childX);
        childContext.setProp('y', options.childY);

        if (childContext[names.heightModel].calculated) {
            // We need to respect a child that is still not calculated (such as a collapsed
            // panel)...
            childContext[names.setHeight](childHeight);
        }

        if (childContext[names.widthModel].calculated) {
            childContext[names.setWidth](childWidth);
        }
    },

    publishInnerCtSize: function(ownerContext, reservedSpace) {
        var me = this,
            names = ownerContext.boxNames,
            heightName = names.height,
            widthName = names.width,
            align = ownerContext.boxOptions.align,
            dock = me.owner.dock,
            padding = me.padding,
            plan = ownerContext.state.boxPlan,
            targetSize = plan.targetSize,
            height = targetSize[heightName],
            innerCtContext = ownerContext.innerCtContext,
            innerCtWidth = (ownerContext.parallelSizeModel.shrinkWrap || (plan.tooNarrow && me.scrollParallel)
                    ? ownerContext.state.contentWidth
                    : targetSize[widthName]) - (reservedSpace || 0),
            innerCtHeight;

        if (align.stretch) {
            innerCtHeight = height;
        } else {
            innerCtHeight = plan.maxSize + padding[names.top] + padding[names.bottom] + innerCtContext.getBorderInfo()[heightName];

            if (!ownerContext.perpendicularSizeModel.shrinkWrap && align.center) {
                innerCtHeight = Math.max(height, innerCtHeight);
            }
        }

        innerCtContext[names.setWidth](innerCtWidth);
        innerCtContext[names.setHeight](innerCtHeight);

        // If unable to publish both dimensions, this layout needs to run again
        if (isNaN(innerCtWidth + innerCtHeight)) {
            me.done = false;
        }

        // If a calculated width has been found (this only happens for widthModel.shrinkWrap
        // vertical docked Components in old Microsoft browsers) then, if the Component has
        // not assumed the size of its content, set it to do so.
        //
        // We MUST pass the dirty flag to get that into the DOM, and because we are a Container
        // layout, and not really supposed to perform sizing, we must also use the force flag.
        if (plan.calculatedWidth && (dock == 'left' || dock == 'right')) {
            // TODO: setting the owner size should be the job of the component layout.
            ownerContext.setWidth(plan.calculatedWidth, true, true);
        }
    },

    onRemove: function(comp){
        var me = this;
        me.callParent(arguments);
        if (me.overflowHandler) {
            me.overflowHandler.onRemove(comp);
        }
        if (comp.layoutMarginCap == me.id) {
            delete comp.layoutMarginCap;
        }
    },

    /**
     * @private
     */
    initOverflowHandler: function() {
        var me = this,
            handler = me.overflowHandler,
            handlerType,
            constructor;

        if (typeof handler == 'string') {
            handler = {
                type: handler
            };
        }

        handlerType = 'None';
        if (handler && handler.type !== undefined) {
            handlerType = handler.type;
        }

        constructor = Ext.layout.container.boxOverflow[handlerType];
        if (constructor[me.type]) {
            constructor = constructor[me.type];
        }

        me.overflowHandler = Ext.create('Ext.layout.container.boxOverflow.' + handlerType, me, handler);
    },

    // Overridden method from Ext.layout.container.Container.
    // Used in the beforeLayout method to render all items into.
    getRenderTarget: function() {
        return this.targetEl;
    },

    // Overridden method from Ext.layout.container.Container.
    // Used by Container classes to insert special DOM elements which must exist in addition to the child components
    getElementTarget: function() {
        return this.innerCt;
    },

    calculateChildBox: Ext.deprecated(),
    calculateChildBoxes: Ext.deprecated(),
    updateChildBoxes: Ext.deprecated(),

    /**
     * @private
     */
    destroy: function() {
        Ext.destroy(this.innerCt, this.overflowHandler);
        this.callParent(arguments);
    }
});

/**
 * A layout that arranges items horizontally across a Container. This layout optionally divides available horizontal
 * space between child items containing a numeric `flex` configuration.
 *
 * This layout may also be used to set the heights of child items by configuring it with the {@link #align} option.
 *
 *     @example
 *     Ext.create('Ext.Panel', {
 *         width: 500,
 *         height: 300,
 *         title: "HBoxLayout Panel",
 *         layout: {
 *             type: 'hbox',
 *             align: 'stretch'
 *         },
 *         renderTo: document.body,
 *         items: [{
 *             xtype: 'panel',
 *             title: 'Inner Panel One',
 *             flex: 2
 *         },{
 *             xtype: 'panel',
 *             title: 'Inner Panel Two',
 *             flex: 1
 *         },{
 *             xtype: 'panel',
 *             title: 'Inner Panel Three',
 *             flex: 1
 *         }]
 *     });
 */
Ext.define('Ext.layout.container.HBox', {

    /* Begin Definitions */

    alias: ['layout.hbox'],
    extend: 'Ext.layout.container.Box',
    alternateClassName: 'Ext.layout.HBoxLayout',

    /* End Definitions */

    /**
     * @cfg {String} align
     * Controls how the child items of the container are aligned. Acceptable configuration values for this property are:
     *
     * - **top** : **Default** child items are aligned vertically at the **top** of the container
     * - **middle** : child items are aligned vertically in the **middle** of the container
     * - **stretch** : child items are stretched vertically to fill the height of the container
     * - **stretchmax** : child items are stretched vertically to the height of the largest item.
     */
    align: 'top', // top, middle, stretch, strechmax

    type : 'hbox',

    direction: 'horizontal',

    horizontal: true,

    names: {
        // parallel
        lr: 'lr',
        left: 'left',// 'before',
        leftCap: 'Left',
        right: 'right',// 'after',
        position: 'left',
        width: 'width',
        contentWidth: 'contentWidth',
        minWidth: 'minWidth',
        maxWidth: 'maxWidth',
        widthCap: 'Width',
        widthModel: 'widthModel',
        widthIndex: 0,
        x: 'x',
        scrollLeft: 'scrollLeft',
        overflowX: 'overflowX',
        hasOverflowX: 'hasOverflowX',
        invalidateScrollX: 'invalidateScrollX',

        // perpendicular
        center: 'middle',
        top: 'top',
        topPosition: 'top',
        bottom: 'bottom',
        height: 'height',
        contentHeight: 'contentHeight',
        minHeight: 'minHeight',
        maxHeight: 'maxHeight',
        heightCap: 'Height',
        heightModel: 'heightModel',
        heightIndex: 1,
        y: 'y',
        scrollTop: 'scrollTop',
        overflowY: 'overflowY',
        hasOverflowY: 'hasOverflowY',
        invalidateScrollY: 'invalidateScrollY',

        // Methods
        getWidth: 'getWidth',
        getHeight: 'getHeight',
        setWidth: 'setWidth',
        setHeight: 'setHeight',
        gotWidth: 'gotWidth',
        gotHeight: 'gotHeight',
        setContentWidth: 'setContentWidth',
        setContentHeight: 'setContentHeight',
        setWidthInDom: 'setWidthInDom',
        setHeightInDom: 'setHeightInDom'
    },

    sizePolicy: {
        flex: {
            '': {
                setsWidth: 1,
                setsHeight: 0
            },
            stretch: {
                setsWidth: 1,
                setsHeight: 1
            },
            stretchmax: {
                readsHeight: 1,
                setsWidth: 1,
                setsHeight: 1
            }
        },
        '': {
            setsWidth: 0,
            setsHeight: 0
        },
        stretch: {
            setsWidth: 0,
            setsHeight: 1
        },
        stretchmax: {
            readsHeight: 1,
            setsWidth: 0,
            setsHeight: 1
        }
    }            
});



/**
 * A layout that arranges items vertically down a Container. This layout optionally divides available vertical space
 * between child items containing a numeric `flex` configuration.
 *
 * This layout may also be used to set the widths of child items by configuring it with the {@link #align} option.
 *
 *     @example
 *     Ext.create('Ext.Panel', {
 *         width: 500,
 *         height: 400,
 *         title: "VBoxLayout Panel",
 *         layout: {
 *             type: 'vbox',
 *             align: 'center'
 *         },
 *         renderTo: document.body,
 *         items: [{
 *             xtype: 'panel',
 *             title: 'Inner Panel One',
 *             width: 250,
 *             flex: 2
 *         },
 *         {
 *             xtype: 'panel',
 *             title: 'Inner Panel Two',
 *             width: 250,
 *             flex: 4
 *         },
 *         {
 *             xtype: 'panel',
 *             title: 'Inner Panel Three',
 *             width: '50%',
 *             flex: 4
 *         }]
 *     });
 */
Ext.define('Ext.layout.container.VBox', {

    /* Begin Definitions */

    alias: ['layout.vbox'],
    extend: 'Ext.layout.container.Box',
    alternateClassName: 'Ext.layout.VBoxLayout',

    /* End Definitions */

    /**
     * @cfg {String} align
     * Controls how the child items of the container are aligned. Acceptable configuration values for this property are:
     *
     * - **left** : **Default** child items are aligned horizontally at the **left** side of the container
     * - **center** : child items are aligned horizontally at the **mid-width** of the container
     * - **stretch** : child items are stretched horizontally to fill the width of the container
     * - **stretchmax** : child items are stretched horizontally to the size of the largest item.
     */
    align : 'left', // left, center, stretch, strechmax

    type: 'vbox',

    direction: 'vertical',

    horizontal: false,

    names: {
        // parallel
        lr: 'tb',
        left: 'top',
        leftCap: 'Top',
        right: 'bottom',
        position: 'top',
        width: 'height',
        contentWidth: 'contentHeight',
        minWidth: 'minHeight',
        maxWidth: 'maxHeight',
        widthCap: 'Height',
        widthModel: 'heightModel',
        widthIndex: 1,
        x: 'y',
        scrollLeft: 'scrollTop',
        overflowX: 'overflowY',
        hasOverflowX: 'hasOverflowY',
        invalidateScrollX: 'invalidateScrollY',

        // perpendicular
        center: 'center',
        top: 'left',// 'before',
        topPosition: 'left',
        bottom: 'right',// 'after',
        height: 'width',
        contentHeight: 'contentWidth',
        minHeight: 'minWidth',
        maxHeight: 'maxWidth',
        heightCap: 'Width',
        heightModel: 'widthModel',
        heightIndex: 0,
        y: 'x',
        scrollTop: 'scrollLeft',
        overflowY: 'overflowX',
        hasOverflowY: 'hasOverflowX',
        invalidateScrollY: 'invalidateScrollX',

        // Methods
        getWidth: 'getHeight',
        getHeight: 'getWidth',
        setWidth: 'setHeight',
        setHeight: 'setWidth',
        gotWidth: 'gotHeight',
        gotHeight: 'gotWidth',
        setContentWidth: 'setContentHeight',
        setContentHeight: 'setContentWidth',
        setWidthInDom: 'setHeightInDom',
        setHeightInDom: 'setWidthInDom'
    },

    sizePolicy: {
        flex: {
            '': {
                setsWidth: 0,
                setsHeight: 1
            },
            stretch: {
                setsWidth: 1,
                setsHeight: 1
            },
            stretchmax: {
                readsWidth: 1,
                setsWidth: 1,
                setsHeight: 1
            }
        },
        '': {
            setsWidth: 0,
            setsHeight: 0
        },
        stretch: {
            setsWidth: 1,
            setsHeight: 0
        },
        stretchmax: {
            readsWidth: 1,
            setsWidth: 1,
            setsHeight: 0
        }
    }
});

/**
 * This is a layout that manages multiple Panels in an expandable accordion style such that by default only
 * one Panel can be expanded at any given time (set {@link #multi} config to have more open). Each Panel has
 * built-in support for expanding and collapsing.
 *
 * Note: Only Ext Panels and all subclasses of Ext.panel.Panel may be used in an accordion layout Container.
 *
 *     @example
 *     Ext.create('Ext.panel.Panel', {
 *         title: 'Accordion Layout',
 *         width: 300,
 *         height: 300,
 *         defaults: {
 *             // applied to each contained panel
 *             bodyStyle: 'padding:15px'
 *         },
 *         layout: {
 *             // layout-specific configs go here
 *             type: 'accordion',
 *             titleCollapse: false,
 *             animate: true,
 *             activeOnTop: true
 *         },
 *         items: [{
 *             title: 'Panel 1',
 *             html: 'Panel content!'
 *         },{
 *             title: 'Panel 2',
 *             html: 'Panel content!'
 *         },{
 *             title: 'Panel 3',
 *             html: 'Panel content!'
 *         }],
 *         renderTo: Ext.getBody()
 *     });
 */
Ext.define('Ext.layout.container.Accordion', {
    extend: 'Ext.layout.container.VBox',
    alias: ['layout.accordion'],
    alternateClassName: 'Ext.layout.AccordionLayout',

    itemCls: [Ext.baseCSSPrefix + 'box-item', Ext.baseCSSPrefix + 'accordion-item'],

    align: 'stretch',

    /**
     * @cfg {Boolean} fill
     * True to adjust the active item's height to fill the available space in the container, false to use the
     * item's current height, or auto height if not explicitly set.
     */
    fill : true,

    /**
     * @cfg {Boolean} autoWidth
     * Child Panels have their width actively managed to fit within the accordion's width.
     * @removed This config is ignored in ExtJS 4
     */

    /**
     * @cfg {Boolean} titleCollapse
     * True to allow expand/collapse of each contained panel by clicking anywhere on the title bar, false to allow
     * expand/collapse only when the toggle tool button is clicked.  When set to false,
     * {@link #hideCollapseTool} should be false also.
     */
    titleCollapse : true,

    /**
     * @cfg {Boolean} hideCollapseTool
     * True to hide the contained Panels' collapse/expand toggle buttons, false to display them.
     * When set to true, {@link #titleCollapse} is automatically set to true.
     */
    hideCollapseTool : false,

    /**
     * @cfg {Boolean} collapseFirst
     * True to make sure the collapse/expand toggle button always renders first (to the left of) any other tools
     * in the contained Panels' title bars, false to render it last.
     */
    collapseFirst : false,

    /**
     * @cfg {Boolean} animate
     * True to slide the contained panels open and closed during expand/collapse using animation, false to open and
     * close directly with no animation. Note: The layout performs animated collapsing
     * and expanding, *not* the child Panels.
     */
    animate : true,
    /**
     * @cfg {Boolean} activeOnTop
     * Only valid when {@link #multi} is `false` and {@link #animate} is `false`.
     *
     * True to swap the position of each panel as it is expanded so that it becomes the first item in the container,
     * false to keep the panels in the rendered order.
     */
    activeOnTop : false,
    /**
     * @cfg {Boolean} multi
     * Set to true to enable multiple accordion items to be open at once.
     */
    multi: false,
    
    defaultAnimatePolicy: {
        y: true,
        height: true
    },

    constructor: function() {
        var me = this;

        me.callParent(arguments);

        if (me.animate) {
            me.animatePolicy = Ext.apply({}, me.defaultAnimatePolicy);
        } else {
            me.animatePolicy = null;
        }
    },

    beforeRenderItems: function (items) {
        var me = this,
            ln = items.length,
            i = 0,
            comp;

        for (; i < ln; i++) {
            comp = items[i];
            if (!comp.rendered) {
                // Set up initial properties for Panels in an accordion.
                if (me.collapseFirst) {
                    comp.collapseFirst = me.collapseFirst;
                }
                if (me.hideCollapseTool) {
                    comp.hideCollapseTool = me.hideCollapseTool;
                    comp.titleCollapse = true;
                }
                else if (me.titleCollapse) {
                    comp.titleCollapse = me.titleCollapse;
                }

                delete comp.hideHeader;
                delete comp.width;
                comp.collapsible = true;
                comp.title = comp.title || '&#160;';
                comp.addBodyCls(Ext.baseCSSPrefix + 'accordion-body');

                // If only one child Panel is allowed to be expanded
                // then collapse all except the first one found with collapsed:false
                if (!me.multi) {
                    // If there is an expanded item, all others must be rendered collapsed.
                    if (me.expandedItem !== undefined) {
                        comp.collapsed = true;
                    }
                    // Otherwise expand the first item with collapsed explicitly configured as false
                    else if (comp.hasOwnProperty('collapsed') && comp.collapsed === false) {
                        me.expandedItem = i;
                    } else {
                        comp.collapsed = true;
                    }

                    // If only one child Panel may be expanded, then intercept expand/show requests.
                    me.owner.mon(comp, {
                        show: me.onComponentShow,
                        beforeexpand: me.onComponentExpand,
                        scope: me
                    });
                }

                // If we must fill available space, a collapse must be listened for and a sibling must
                // be expanded.
                if (me.fill) {
                    me.owner.mon(comp, {
                        beforecollapse: me.onComponentCollapse,
                        scope: me
                    });
                }
            }
        }

        // If no collapsed:false Panels found, make the first one expanded.
        if (ln && me.expandedItem === undefined) {
            me.expandedItem = 0;
            items[0].collapsed = false;
        }
    },

    getItemsRenderTree: function(items) {
        this.beforeRenderItems(items);

        return this.callParent(arguments);
    },

    renderItems : function(items, target) {
        this.beforeRenderItems(items);

        this.callParent(arguments);
    },

    configureItem: function(item) {
        this.callParent(arguments);

        // We handle animations for the expand/collapse of items.
        // Items do not have individual borders
        item.animCollapse = item.border = false;

        // If filling available space, all Panels flex.
        if (this.fill) {
            item.flex = 1;
        }
    },

    onChildPanelRender: function(panel) {
        panel.header.addCls(Ext.baseCSSPrefix + 'accordion-hd');
    },

    beginLayout: function (ownerContext) {
        this.callParent(arguments);
        this.updatePanelClasses(ownerContext);
    },

    updatePanelClasses: function(ownerContext) {
        var children = ownerContext.visibleItems,
            ln = children.length,
            siblingCollapsed = true,
            i, child, header;

        for (i = 0; i < ln; i++) {
            child = children[i];
            header = child.header;
            header.addCls(Ext.baseCSSPrefix + 'accordion-hd');

            if (siblingCollapsed) {
                header.removeCls(Ext.baseCSSPrefix + 'accordion-hd-sibling-expanded');
            } else {
                header.addCls(Ext.baseCSSPrefix + 'accordion-hd-sibling-expanded');
            }

            if (i + 1 == ln && child.collapsed) {
                header.addCls(Ext.baseCSSPrefix + 'accordion-hd-last-collapsed');
            } else {
                header.removeCls(Ext.baseCSSPrefix + 'accordion-hd-last-collapsed');
            }

            siblingCollapsed = child.collapsed;
        }
    },

    // When a Component expands, adjust the heights of the other Components to be just enough to accommodate
    // their headers.
    // The expanded Component receives the only flex value, and so gets all remaining space.
    onComponentExpand: function(toExpand) {
        var me = this,
            owner = me.owner,
            expanded,
            expandedCount, i,
            previousValue;

        if (!me.processing) {
            me.processing = true;
            previousValue = owner.deferLayouts;
            owner.deferLayouts = true;
            expanded = me.multi ? [] : owner.query('>panel:not([collapsed])');
            expandedCount = expanded.length;
            
            // Collapse all other expanded child items (Won't loop if multi is true)
            for (i = 0; i < expandedCount; i++) {
                expanded[i].collapse();
            }
            owner.deferLayouts = previousValue;
            me.processing = false;
        }
    },

    onComponentCollapse: function(comp) {
        var me = this,
            owner = me.owner,
            toExpand,
            expanded,
            previousValue;

        if (me.owner.items.getCount() === 1) {
            // do not allow collapse if there is only one item
            return false;
        }

        if (!me.processing) {
            me.processing = true;
            previousValue = owner.deferLayouts;
            owner.deferLayouts = true;
            toExpand = comp.next() || comp.prev();

            // If we are allowing multi, and the "toCollapse" component is NOT the only expanded Component,
            // then ask the box layout to collapse it to its header.
            if (me.multi) {
                expanded = me.owner.query('>panel:not([collapsed])');

                // If the collapsing Panel is the only expanded one, expand the following Component.
                // All this is handling fill: true, so there must be at least one expanded,
                if (expanded.length === 1) {
                    toExpand.expand();
                }

            } else if (toExpand) {
                toExpand.expand();
            }
            owner.deferLayouts = previousValue;
            me.processing = false;
        }
    },

    onComponentShow: function(comp) {
        // Showing a Component means that you want to see it, so expand it.
        this.onComponentExpand(comp);
    }
});