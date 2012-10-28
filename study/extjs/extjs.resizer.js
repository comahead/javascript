
/**
 * Applies drag handles to an element or component to make it resizable. The drag handles are inserted into the element
 * (or component's element) and positioned absolute.
 *
 * Textarea and img elements will be wrapped with an additional div because these elements do not support child nodes.
 * The original element can be accessed through the originalTarget property.
 *
 * Here is the list of valid resize handles:
 *
 *     Value   Description
 *     ------  -------------------
 *      'n'     north
 *      's'     south
 *      'e'     east
 *      'w'     west
 *      'nw'    northwest
 *      'sw'    southwest
 *      'se'    southeast
 *      'ne'    northeast
 *      'all'   all
 *
 * {@img Ext.resizer.Resizer/Ext.resizer.Resizer.png Ext.resizer.Resizer component}
 *
 * Here's an example showing the creation of a typical Resizer:
 *
 *     Ext.create('Ext.resizer.Resizer', {
 *         el: 'elToResize',
 *         handles: 'all',
 *         minWidth: 200,
 *         minHeight: 100,
 *         maxWidth: 500,
 *         maxHeight: 400,
 *         pinned: true
 *     });
 */
Ext.define('Ext.resizer.Resizer', {
    mixins: {
        observable: 'Ext.util.Observable'
    },
    uses: ['Ext.resizer.ResizeTracker', 'Ext.Component'],

    alternateClassName: 'Ext.Resizable',

    handleCls: Ext.baseCSSPrefix + 'resizable-handle',
    pinnedCls: Ext.baseCSSPrefix + 'resizable-pinned',
    overCls:   Ext.baseCSSPrefix + 'resizable-over',
    wrapCls:   Ext.baseCSSPrefix + 'resizable-wrap',

    /**
     * @cfg {Boolean} dynamic
     * Specify as true to update the {@link #target} (Element or {@link Ext.Component Component}) dynamically during
     * dragging. This is `true` by default, but the {@link Ext.Component Component} class passes `false` when it is
     * configured as {@link Ext.Component#resizable}.
     *
     * If specified as `false`, a proxy element is displayed during the resize operation, and the {@link #target} is
     * updated on mouseup.
     */
    dynamic: true,

    /**
     * @cfg {String} handles
     * String consisting of the resize handles to display. Defaults to 's e se' for Elements and fixed position
     * Components. Defaults to 8 point resizing for floating Components (such as Windows). Specify either `'all'` or any
     * of `'n s e w ne nw se sw'`.
     */
    handles: 's e se',

    /**
     * @cfg {Number} height
     * Optional. The height to set target to in pixels
     */
    height : null,

    /**
     * @cfg {Number} width
     * Optional. The width to set the target to in pixels
     */
    width : null,

    /**
     * @cfg {Number} heightIncrement
     * The increment to snap the height resize in pixels.
     */
    heightIncrement : 0,

    /**
     * @cfg {Number} widthIncrement
     * The increment to snap the width resize in pixels.
     */
    widthIncrement : 0,

    /**
     * @cfg {Number} minHeight
     * The minimum height for the element
     */
    minHeight : 20,

    /**
     * @cfg {Number} minWidth
     * The minimum width for the element
     */
    minWidth : 20,

    /**
     * @cfg {Number} maxHeight
     * The maximum height for the element
     */
    maxHeight : 10000,

    /**
     * @cfg {Number} maxWidth
     * The maximum width for the element
     */
    maxWidth : 10000,

    /**
     * @cfg {Boolean} pinned
     * True to ensure that the resize handles are always visible, false indicates resizing by cursor changes only
     */
    pinned: false,

    /**
     * @cfg {Boolean} preserveRatio
     * True to preserve the original ratio between height and width during resize
     */
    preserveRatio: false,

    /**
     * @cfg {Boolean} transparent
     * True for transparent handles. This is only applied at config time.
     */
    transparent: false,

    /**
     * @cfg {Ext.Element/Ext.util.Region} constrainTo
     * An element, or a {@link Ext.util.Region Region} into which the resize operation must be constrained.
     */

    possiblePositions: {
        n:  'north',
        s:  'south',
        e:  'east',
        w:  'west',
        se: 'southeast',
        sw: 'southwest',
        nw: 'northwest',
        ne: 'northeast'
    },

    /**
     * @cfg {Ext.Element/Ext.Component} target
     * The Element or Component to resize.
     */

    /**
     * @property {Ext.Element} el
     * Outer element for resizing behavior.
     */

    constructor: function(config) {
        var me = this,
            target,
            targetEl,
            tag,
            handles = me.handles,
            handleCls,
            possibles,
            len,
            i = 0,
            pos, 
            handleEls = [],
            eastWestStyle, style,
            box;

        me.addEvents(
            /**
             * @event beforeresize
             * Fired before resize is allowed. Return false to cancel resize.
             * @param {Ext.resizer.Resizer} this
             * @param {Number} width The start width
             * @param {Number} height The start height
             * @param {Ext.EventObject} e The mousedown event
             */
            'beforeresize',
            /**
             * @event resizedrag
             * Fires during resizing. Return false to cancel resize.
             * @param {Ext.resizer.Resizer} this
             * @param {Number} width The new width
             * @param {Number} height The new height
             * @param {Ext.EventObject} e The mousedown event
             */
            'resizedrag',
            /**
             * @event resize
             * Fired after a resize.
             * @param {Ext.resizer.Resizer} this
             * @param {Number} width The new width
             * @param {Number} height The new height
             * @param {Ext.EventObject} e The mouseup event
             */
            'resize'
        );

        if (Ext.isString(config) || Ext.isElement(config) || config.dom) {
            target = config;
            config = arguments[1] || {};
            config.target = target;
        }
        // will apply config to this
        me.mixins.observable.constructor.call(me, config);

        // If target is a Component, ensure that we pull the element out.
        // Resizer must examine the underlying Element.
        target = me.target;
        if (target) {
            if (target.isComponent) {
                me.el = target.getEl();
                if (target.minWidth) {
                    me.minWidth = target.minWidth;
                }
                if (target.minHeight) {
                    me.minHeight = target.minHeight;
                }
                if (target.maxWidth) {
                    me.maxWidth = target.maxWidth;
                }
                if (target.maxHeight) {
                    me.maxHeight = target.maxHeight;
                }
                if (target.floating) {
                    if (!me.hasOwnProperty('handles')) {
                        me.handles = 'n ne e se s sw w nw';
                    }
                }
            } else {
                me.el = me.target = Ext.get(target);
            }
        }
        // Backwards compatibility with Ext3.x's Resizable which used el as a config.
        else {
            me.target = me.el = Ext.get(me.el);
        }

        // Tags like textarea and img cannot
        // have children and therefore must
        // be wrapped
        tag = me.el.dom.tagName.toUpperCase();
        if (tag == 'TEXTAREA' || tag == 'IMG' || tag == 'TABLE') {
            /**
             * @property {Ext.Element/Ext.Component} originalTarget
             * Reference to the original resize target if the element of the original resize target was a
             * {@link Ext.form.field.Field Field}, or an IMG or a TEXTAREA which must be wrapped in a DIV.
             */
            me.originalTarget = me.target;
            targetEl = me.el;
            box = targetEl.getBox();
            me.target = me.el = me.el.wrap({
                cls: me.wrapCls,
                id: me.el.id + '-rzwrap',
                style: targetEl.getStyles('margin-top', 'margin-bottom')
            });

            // Transfer originalTarget's positioning+sizing+margins
            me.el.setPositioning(targetEl.getPositioning());
            targetEl.clearPositioning();
            me.el.setBox(box);

            // Position the wrapped element absolute so that it does not stretch the wrapper
            targetEl.setStyle('position', 'absolute');
        }

        // Position the element, this enables us to absolute position
        // the handles within this.el
        me.el.position();
        if (me.pinned) {
            me.el.addCls(me.pinnedCls);
        }

        /**
         * @property {Ext.resizer.ResizeTracker} resizeTracker
         */
        me.resizeTracker = new Ext.resizer.ResizeTracker({
            disabled: me.disabled,
            target: me.target,
            constrainTo: me.constrainTo,
            overCls: me.overCls,
            throttle: me.throttle,
            originalTarget: me.originalTarget,
            delegate: '.' + me.handleCls,
            dynamic: me.dynamic,
            preserveRatio: me.preserveRatio,
            heightIncrement: me.heightIncrement,
            widthIncrement: me.widthIncrement,
            minHeight: me.minHeight,
            maxHeight: me.maxHeight,
            minWidth: me.minWidth,
            maxWidth: me.maxWidth
        });

        // Relay the ResizeTracker's superclass events as our own resize events
        me.resizeTracker.on({
            mousedown: me.onBeforeResize,
            drag: me.onResize,
            dragend: me.onResizeEnd,
            scope: me
        });

        if (me.handles == 'all') {
            me.handles = 'n s e w ne nw se sw';
        }

        handles = me.handles = me.handles.split(/ |\s*?[,;]\s*?/);
        possibles = me.possiblePositions;
        len = handles.length;
        handleCls = me.handleCls + ' ' + (me.target.isComponent ? (me.target.baseCls + '-handle ') : '') + me.handleCls + '-';

        // Needs heighting on IE6!
        eastWestStyle = Ext.isIE6 ? ' style="height:' + me.el.getHeight() + 'px"' : '';

        for (; i < len; i++){
            // if specified and possible, create
            if (handles[i] && possibles[handles[i]]) {
                pos = possibles[handles[i]];
                if (pos === 'east' || pos === 'west') {
                    style = eastWestStyle;
                } else {
                    style = '';
                }
                handleEls.push('<div id="' + me.el.id + '-' + pos + '-handle" class="' + handleCls + pos + ' ' + Ext.baseCSSPrefix + 'unselectable"' + style + '></div>');
            }
        }
        Ext.DomHelper.append(me.el, handleEls.join(''));

        // store a reference to each handle elelemtn in this.east, this.west, etc
        for (i = 0; i < len; i++){
            // if specified and possible, create
            if (handles[i] && possibles[handles[i]]) {
                pos = possibles[handles[i]];
                me[pos] = me.el.getById(me.el.id + '-' + pos + '-handle');
                me[pos].region = pos;
                me[pos].unselectable();
                if (me.transparent) {
                    me[pos].setOpacity(0);
                }
            }
        }

        // Constrain within configured maxima
        if (Ext.isNumber(me.width)) {
            me.width = Ext.Number.constrain(me.width, me.minWidth, me.maxWidth);
        }
        if (Ext.isNumber(me.height)) {
            me.height = Ext.Number.constrain(me.height, me.minHeight, me.maxHeight);
        }

        // Size the target (and originalTarget)
        if (me.width !== null || me.height !== null) {
            if (me.originalTarget) {
                me.originalTarget.setWidth(me.width);
                me.originalTarget.setHeight(me.height);
            }
            me.resizeTo(me.width, me.height);
        }

        me.forceHandlesHeight();
    },

    disable: function() {
        this.resizeTracker.disable();
    },

    enable: function() {
        this.resizeTracker.enable();
    },

    /**
     * @private Relay the Tracker's mousedown event as beforeresize
     * @param tracker The Resizer
     * @param e The Event
     */
    onBeforeResize: function(tracker, e) {
        var box = this.el.getBox();
        return this.fireEvent('beforeresize', this, box.width, box.height, e);
    },

    /**
     * @private Relay the Tracker's drag event as resizedrag
     * @param tracker The Resizer
     * @param e The Event
     */
    onResize: function(tracker, e) {
        var me = this,
            box = me.el.getBox();
            
        me.forceHandlesHeight();
        return me.fireEvent('resizedrag', me, box.width, box.height, e);
    },

    /**
     * @private Relay the Tracker's dragend event as resize
     * @param tracker The Resizer
     * @param e The Event
     */
    onResizeEnd: function(tracker, e) {
        var me = this,
            box = me.el.getBox();
            
        me.forceHandlesHeight();
        return me.fireEvent('resize', me, box.width, box.height, e);
    },

    /**
     * Perform a manual resize and fires the 'resize' event.
     * @param {Number} width
     * @param {Number} height
     */
    resizeTo : function(width, height) {
        var me = this;
        me.target.setSize(width, height);
        me.fireEvent('resize', me, width, height, null);
    },

    /**
     * Returns the element that was configured with the el or target config property. If a component was configured with
     * the target property then this will return the element of this component.
     *
     * Textarea and img elements will be wrapped with an additional div because these elements do not support child
     * nodes. The original element can be accessed through the originalTarget property.
     * @return {Ext.Element} element
     */
    getEl : function() {
        return this.el;
    },

    /**
     * Returns the element or component that was configured with the target config property.
     *
     * Textarea and img elements will be wrapped with an additional div because these elements do not support child
     * nodes. The original element can be accessed through the originalTarget property.
     * @return {Ext.Element/Ext.Component}
     */
    getTarget: function() {
        return this.target;
    },

    destroy: function() {
        var i = 0,
            handles = this.handles,
            len = handles.length,
            positions = this.possiblePositions;

        for (; i < len; i++) {
            this[positions[handles[i]]].remove();
        }
    },

    /**
     * @private
     * Fix IE6 handle height issue.
     */
    forceHandlesHeight : function() {
        var me = this,
            handle;
        if (Ext.isIE6) {
            handle = me.east;
            if (handle) {
                handle.setHeight(me.el.getHeight());
            }
            handle = me.west;
            if (handle) {
                handle.setHeight(me.el.getHeight());
            }
            me.el.repaint();
        }
    }
});

/**
 * Private utility class for Ext.resizer.Resizer.
 * @private
 */
Ext.define('Ext.resizer.ResizeTracker', {
    extend: 'Ext.dd.DragTracker',
    dynamic: true,
    preserveRatio: false,

    // Default to no constraint
    constrainTo: null,
    
    proxyCls:  Ext.baseCSSPrefix + 'resizable-proxy',

    constructor: function(config) {
        var me = this,
            widthRatio, heightRatio,
            throttledResizeFn;

        if (!config.el) {
            if (config.target.isComponent) {
                me.el = config.target.getEl();
            } else {
                me.el = config.target;
            }
        }
        this.callParent(arguments);

        // Ensure that if we are preserving aspect ratio, the largest minimum is honoured
        if (me.preserveRatio && me.minWidth && me.minHeight) {
            widthRatio = me.minWidth / me.el.getWidth();
            heightRatio = me.minHeight / me.el.getHeight();

            // largest ratio of minimum:size must be preserved.
            // So if a 400x200 pixel image has
            // minWidth: 50, maxWidth: 50, the maxWidth will be 400 * (50/200)... that is 100
            if (heightRatio > widthRatio) {
                me.minWidth = me.el.getWidth() * heightRatio;
            } else {
                me.minHeight = me.el.getHeight() * widthRatio;
            }
        }

        // If configured as throttled, create an instance version of resize which calls
        // a throttled function to perform the resize operation.
        if (me.throttle) {
            throttledResizeFn = Ext.Function.createThrottled(function() {
                    Ext.resizer.ResizeTracker.prototype.resize.apply(me, arguments);
                }, me.throttle);

            me.resize = function(box, direction, atEnd) {
                if (atEnd) {
                    Ext.resizer.ResizeTracker.prototype.resize.apply(me, arguments);
                } else {
                    throttledResizeFn.apply(null, arguments);
                }
            };
        }
    },

    onBeforeStart: function(e) {
        // record the startBox
        this.startBox = this.el.getBox();
    },

    /**
     * @private
     * Returns the object that will be resized on every mousemove event.
     * If dynamic is false, this will be a proxy, otherwise it will be our actual target.
     */
    getDynamicTarget: function() {
        var me = this,
            target = me.target;
            
        if (me.dynamic) {
            return target;
        } else if (!me.proxy) {
            me.proxy = me.createProxy(target);
        }
        me.proxy.show();
        return me.proxy;
    },
    
    /**
     * Create a proxy for this resizer
     * @param {Ext.Component/Ext.Element} target The target
     * @return {Ext.Element} A proxy element
     */
    createProxy: function(target){
        var proxy,
            cls = this.proxyCls,
            renderTo;
            
        if (target.isComponent) {
            proxy = target.getProxy().addCls(cls);
        } else {
            renderTo = Ext.getBody();
            if (Ext.scopeResetCSS) {
                renderTo = Ext.getBody().createChild({
                    cls: Ext.resetCls
                });
            }
            proxy = target.createProxy({
                tag: 'div',
                cls: cls,
                id: target.id + '-rzproxy'
            }, renderTo);
        }
        proxy.removeCls(Ext.baseCSSPrefix + 'proxy-el');
        return proxy;
    },

    onStart: function(e) {
        // returns the Ext.ResizeHandle that the user started dragging
        this.activeResizeHandle = Ext.get(this.getDragTarget().id);

        // If we are using a proxy, ensure it is sized.
        if (!this.dynamic) {
            this.resize(this.startBox, {
                horizontal: 'none',
                vertical: 'none'
            });
        }
    },

    onDrag: function(e) {
        // dynamic resizing, update dimensions during resize
        if (this.dynamic || this.proxy) {
            this.updateDimensions(e);
        }
    },

    updateDimensions: function(e, atEnd) {
        var me = this,
            region = me.activeResizeHandle.region,
            offset = me.getOffset(me.constrainTo ? 'dragTarget' : null),
            box = me.startBox,
            ratio,
            widthAdjust = 0,
            heightAdjust = 0,
            snappedWidth,
            snappedHeight,
            adjustX = 0,
            adjustY = 0,
            dragRatio,
            horizDir = offset[0] < 0 ? 'right' : 'left',
            vertDir = offset[1] < 0 ? 'down' : 'up',
            oppositeCorner,
            axis, // 1 = x, 2 = y, 3 = x and y.
            newBox,
            newHeight, newWidth;

        switch (region) {
            case 'south':
                heightAdjust = offset[1];
                axis = 2;
                break;
            case 'north':
                heightAdjust = -offset[1];
                adjustY = -heightAdjust;
                axis = 2;
                break;
            case 'east':
                widthAdjust = offset[0];
                axis = 1;
                break;
            case 'west':
                widthAdjust = -offset[0];
                adjustX = -widthAdjust;
                axis = 1;
                break;
            case 'northeast':
                heightAdjust = -offset[1];
                adjustY = -heightAdjust;
                widthAdjust = offset[0];
                oppositeCorner = [box.x, box.y + box.height];
                axis = 3;
                break;
            case 'southeast':
                heightAdjust = offset[1];
                widthAdjust = offset[0];
                oppositeCorner = [box.x, box.y];
                axis = 3;
                break;
            case 'southwest':
                widthAdjust = -offset[0];
                adjustX = -widthAdjust;
                heightAdjust = offset[1];
                oppositeCorner = [box.x + box.width, box.y];
                axis = 3;
                break;
            case 'northwest':
                heightAdjust = -offset[1];
                adjustY = -heightAdjust;
                widthAdjust = -offset[0];
                adjustX = -widthAdjust;
                oppositeCorner = [box.x + box.width, box.y + box.height];
                axis = 3;
                break;
        }

        newBox = {
            width: box.width + widthAdjust,
            height: box.height + heightAdjust,
            x: box.x + adjustX,
            y: box.y + adjustY
        };

        // Snap value between stops according to configured increments
        snappedWidth = Ext.Number.snap(newBox.width, me.widthIncrement);
        snappedHeight = Ext.Number.snap(newBox.height, me.heightIncrement);
        if (snappedWidth != newBox.width || snappedHeight != newBox.height){
            switch (region) {
                case 'northeast':
                    newBox.y -= snappedHeight - newBox.height;
                    break;
                case 'north':
                    newBox.y -= snappedHeight - newBox.height;
                    break;
                case 'southwest':
                    newBox.x -= snappedWidth - newBox.width;
                    break;
                case 'west':
                    newBox.x -= snappedWidth - newBox.width;
                    break;
                case 'northwest':
                    newBox.x -= snappedWidth - newBox.width;
                    newBox.y -= snappedHeight - newBox.height;
            }
            newBox.width = snappedWidth;
            newBox.height = snappedHeight;
        }

        // out of bounds
        if (newBox.width < me.minWidth || newBox.width > me.maxWidth) {
            newBox.width = Ext.Number.constrain(newBox.width, me.minWidth, me.maxWidth);

            // Re-adjust the X position if we were dragging the west side
            if (adjustX) {
                newBox.x = box.x + (box.width - newBox.width);
            }
        } else {
            me.lastX = newBox.x;
        }
        if (newBox.height < me.minHeight || newBox.height > me.maxHeight) {
            newBox.height = Ext.Number.constrain(newBox.height, me.minHeight, me.maxHeight);

            // Re-adjust the Y position if we were dragging the north side
            if (adjustY) {
                newBox.y = box.y + (box.height - newBox.height);
            }
        } else {
            me.lastY = newBox.y;
        }

        // If this is configured to preserve the aspect ratio, or they are dragging using the shift key
        if (me.preserveRatio || e.shiftKey) {
            ratio = me.startBox.width / me.startBox.height;

            // Calculate aspect ratio constrained values.
            newHeight = Math.min(Math.max(me.minHeight, newBox.width / ratio), me.maxHeight);
            newWidth = Math.min(Math.max(me.minWidth, newBox.height * ratio), me.maxWidth);

            // X axis: width-only change, height must obey
            if (axis == 1) {
                newBox.height = newHeight;
            }

            // Y axis: height-only change, width must obey
            else if (axis == 2) {
                newBox.width = newWidth;
            }

            // Corner drag.
            else {
                // Drag ratio is the ratio of the mouse point from the opposite corner.
                // Basically what edge we are dragging, a horizontal edge or a vertical edge.
                dragRatio = Math.abs(oppositeCorner[0] - this.lastXY[0]) / Math.abs(oppositeCorner[1] - this.lastXY[1]);

                // If drag ratio > aspect ratio then width is dominant and height must obey
                if (dragRatio > ratio) {
                    newBox.height = newHeight;
                } else {
                    newBox.width = newWidth;
                }

                // Handle dragging start coordinates
                if (region == 'northeast') {
                    newBox.y = box.y - (newBox.height - box.height);
                } else if (region == 'northwest') {
                    newBox.y = box.y - (newBox.height - box.height);
                    newBox.x = box.x - (newBox.width - box.width);
                } else if (region == 'southwest') {
                    newBox.x = box.x - (newBox.width - box.width);
                }
            }
        }

        if (heightAdjust === 0) {
            vertDir = 'none';
        }
        if (widthAdjust === 0) {
            horizDir = 'none';
        }
        me.resize(newBox, {
            horizontal: horizDir,
            vertical: vertDir
        }, atEnd);
    },

    getResizeTarget: function(atEnd) {
        return atEnd ? this.target : this.getDynamicTarget();
    },

    resize: function(box, direction, atEnd) {
        var target = this.getResizeTarget(atEnd);
        if (target.isComponent) {
            target.setSize(box.width, box.height);
            if (target.floating) {
                target.setPagePosition(box.x, box.y);
            }
        } else {
            target.setBox(box);
        }

        // update the originalTarget if it was wrapped, and the target passed in was the wrap el.
        target = this.originalTarget;
        if (target && (this.dynamic || atEnd)) {
            if (target.isComponent) {
                target.setSize(box.width, box.height);
                if (target.floating) {
                    target.setPagePosition(box.x, box.y);
                }
            } else {
                target.setBox(box);
            }
        }
    },

    onEnd: function(e) {
        this.updateDimensions(e, true);
        if (this.proxy) {
            this.proxy.hide();
        }
    }
});

/**
 * Private utility class for Ext.Splitter.
 * @private
 */
Ext.define('Ext.resizer.SplitterTracker', {
    extend: 'Ext.dd.DragTracker',
    requires: ['Ext.util.Region'],
    enabled: true,
    
    overlayCls: Ext.baseCSSPrefix + 'resizable-overlay',

    createDragOverlay: function () {
        var overlay;

        overlay = this.overlay =  Ext.getBody().createChild({
            cls: this.overlayCls, 
            html: '&#160;'
        });

        overlay.unselectable();
        overlay.setSize(Ext.Element.getViewWidth(true), Ext.Element.getViewHeight(true));
        overlay.show();
    },

    getPrevCmp: function() {
        var splitter = this.getSplitter();
        return splitter.previousSibling();
    },

    getNextCmp: function() {
        var splitter = this.getSplitter();
        return splitter.nextSibling();
    },

    // ensure the tracker is enabled, store boxes of previous and next
    // components and calculate the constrain region
    onBeforeStart: function(e) {
        var me = this,
            prevCmp = me.getPrevCmp(),
            nextCmp = me.getNextCmp(),
            collapseEl = me.getSplitter().collapseEl,
            target = e.getTarget(),
            box;

        if (collapseEl && target === me.getSplitter().collapseEl.dom) {
            return false;
        }

        // SplitterTracker is disabled if any of its adjacents are collapsed.
        if (nextCmp.collapsed || prevCmp.collapsed) {
            return false;
        }

        // store boxes of previous and next
        me.prevBox  = prevCmp.getEl().getBox();
        me.nextBox  = nextCmp.getEl().getBox();
        me.constrainTo = box = me.calculateConstrainRegion();

        if (!box) {
            return false;
        }

        me.createDragOverlay();

        return box;
    },

    // We move the splitter el. Add the proxy class.
    onStart: function(e) {
        var splitter = this.getSplitter();
        splitter.addCls(splitter.baseCls + '-active');
    },

    // calculate the constrain Region in which the splitter el may be moved.
    calculateConstrainRegion: function() {
        var me         = this,
            splitter   = me.getSplitter(),
            splitWidth = splitter.getWidth(),
            defaultMin = splitter.defaultSplitMin,
            orient     = splitter.orientation,
            prevBox    = me.prevBox,
            prevCmp    = me.getPrevCmp(),
            nextBox    = me.nextBox,
            nextCmp    = me.getNextCmp(),
            // prev and nextConstrainRegions are the maximumBoxes minus the
            // minimumBoxes. The result is always the intersection
            // of these two boxes.
            prevConstrainRegion, nextConstrainRegion;

        // vertical splitters, so resizing left to right
        if (orient === 'vertical') {

            // Region constructor accepts (top, right, bottom, left)
            // anchored/calculated from the left
            prevConstrainRegion = new Ext.util.Region(
                prevBox.y,
                // Right boundary is x + maxWidth if there IS a maxWidth.
                // Otherwise it is calculated based upon the minWidth of the next Component
                (prevCmp.maxWidth ? prevBox.x + prevCmp.maxWidth : nextBox.right - (nextCmp.minWidth || defaultMin)) + splitWidth,
                prevBox.bottom,
                prevBox.x + (prevCmp.minWidth || defaultMin)
            );
            // anchored/calculated from the right
            nextConstrainRegion = new Ext.util.Region(
                nextBox.y,
                nextBox.right - (nextCmp.minWidth || defaultMin),
                nextBox.bottom,
                // Left boundary is right - maxWidth if there IS a maxWidth.
                // Otherwise it is calculated based upon the minWidth of the previous Component
                (nextCmp.maxWidth ? nextBox.right - nextCmp.maxWidth : prevBox.x + (prevBox.minWidth || defaultMin)) - splitWidth
            );
        } else {
            // anchored/calculated from the top
            prevConstrainRegion = new Ext.util.Region(
                prevBox.y + (prevCmp.minHeight || defaultMin),
                prevBox.right,
                // Bottom boundary is y + maxHeight if there IS a maxHeight.
                // Otherwise it is calculated based upon the minWidth of the next Component
                (prevCmp.maxHeight ? prevBox.y + prevCmp.maxHeight : nextBox.bottom - (nextCmp.minHeight || defaultMin)) + splitWidth,
                prevBox.x
            );
            // anchored/calculated from the bottom
            nextConstrainRegion = new Ext.util.Region(
                // Top boundary is bottom - maxHeight if there IS a maxHeight.
                // Otherwise it is calculated based upon the minHeight of the previous Component
                (nextCmp.maxHeight ? nextBox.bottom - nextCmp.maxHeight : prevBox.y + (prevCmp.minHeight || defaultMin)) - splitWidth,
                nextBox.right,
                nextBox.bottom - (nextCmp.minHeight || defaultMin),
                nextBox.x
            );
        }

        // intersection of the two regions to provide region draggable
        return prevConstrainRegion.intersect(nextConstrainRegion);
    },

    // Performs the actual resizing of the previous and next components
    performResize: function(e, offset) {
        var me        = this,
            splitter  = me.getSplitter(),
            orient    = splitter.orientation,
            prevCmp   = me.getPrevCmp(),
            nextCmp   = me.getNextCmp(),
            owner     = splitter.ownerCt,
            flexedSiblings = owner.query('>[flex]'),
            len       = flexedSiblings.length,
            i         = 0,
            dimension,
            size,
            totalFlex = 0;

        // Convert flexes to pixel values proportional to the total pixel width of all flexes.
        for (; i < len; i++) {
            size = flexedSiblings[i].getWidth();
            totalFlex += size;
            flexedSiblings[i].flex = size;
        }

        offset = offset || me.getOffset('dragTarget');

        if (orient === 'vertical') {
            offset = offset[0];
            dimension = 'width';
        } else {
            dimension = 'height';
            offset = offset[1];
        }
        if (prevCmp) {
            size = me.prevBox[dimension] + offset;
            if (prevCmp.flex) {
                prevCmp.flex = size;
            } else {
                prevCmp[dimension] = size;
            }
        }
        if (nextCmp) {
            size = me.nextBox[dimension] - offset;
            if (nextCmp.flex) {
                nextCmp.flex = size;
            } else {
                nextCmp[dimension] = size;
            }
        }

        owner.updateLayout();
    },

    // Cleans up the overlay (if we have one) and calls the base. This cannot be done in
    // onEnd, because onEnd is only called if a drag is detected but the overlay is created
    // regardless (by onBeforeStart).
    endDrag: function () {
        var me = this;

        if (me.overlay) {
             me.overlay.remove();
             delete me.overlay;
        }

        me.callParent(arguments); // this calls onEnd
    },

    // perform the resize and remove the proxy class from the splitter el
    onEnd: function(e) {
        var me = this,
            splitter = me.getSplitter();
            
        splitter.removeCls(splitter.baseCls + '-active');
        me.performResize(e, me.getOffset('dragTarget'));
    },

    // Track the proxy and set the proper XY coordinates
    // while constraining the drag
    onDrag: function(e) {
        var me        = this,
            offset    = me.getOffset('dragTarget'),
            splitter  = me.getSplitter(),
            splitEl   = splitter.getEl(),
            orient    = splitter.orientation;

        if (orient === "vertical") {
            splitEl.setX(me.startRegion.left + offset[0]);
        } else {
            splitEl.setY(me.startRegion.top + offset[1]);
        }
    },

    getSplitter: function() {
        return this.splitter;
    }
});




/**
 * Private utility class for Ext.BorderSplitter.
 * @private
 */
Ext.define('Ext.resizer.BorderSplitterTracker', {
    extend: 'Ext.resizer.SplitterTracker',
    requires: ['Ext.util.Region'],

    getPrevCmp: null,
    getNextCmp: null,

    // calculate the constrain Region in which the splitter el may be moved.
    calculateConstrainRegion: function() {
        var me = this,
            splitter = me.splitter,
            collapseTarget = splitter.collapseTarget,
            defaultSplitMin = splitter.defaultSplitMin,
            sizePropCap = splitter.vertical ? 'Width' : 'Height',
            minSizeProp = 'min' + sizePropCap,
            maxSizeProp = 'max' + sizePropCap,
            getSizeMethod = 'get' + sizePropCap,
            neighbors = splitter.neighbors,
            length = neighbors.length,
            box = collapseTarget.el.getBox(),
            left = box.x,
            top = box.y,
            right = box.right,
            bottom = box.bottom,
            size = splitter.vertical ? (right - left) : (bottom - top),
            //neighborSizes = [],
            i, neighbor, minRange, maxRange, maxGrowth, maxShrink, targetSize;

        // if size=100 and minSize=80, we can reduce by 20 so minRange = minSize-size = -20
        minRange = (collapseTarget[minSizeProp] || Math.min(size,defaultSplitMin)) - size;

        // if maxSize=150, maxRange = maxSize - size = 50
        maxRange = collapseTarget[maxSizeProp];
        if (!maxRange) {
            maxRange = 1e9;
        } else {
            maxRange -= size;
        }
        targetSize = size;

        for (i = 0; i < length; ++i) {
            neighbor = neighbors[i];
            size = neighbor[getSizeMethod]();
            //neighborSizes.push(size);

            maxGrowth = size - neighbor[maxSizeProp]; // NaN if no maxSize or negative
            maxShrink = size - (neighbor[minSizeProp] || Math.min(size,defaultSplitMin));

            if (!isNaN(maxGrowth)) {
                // if neighbor can only grow by 10 (maxGrowth = -10), minRange cannot be
                // -20 anymore, but now only -10:
                if (minRange < maxGrowth) {
                    minRange = maxGrowth;
                }
            }

            // if neighbor can shrink by 20 (maxShrink=20), maxRange cannot be 50 anymore,
            // but now only 20:
            if (maxRange > maxShrink) {
                maxRange = maxShrink;
            }
        }

        if (maxRange - minRange < 2) {
            return null;
        }

        box = new Ext.util.Region(top, right, bottom, left);

        me.constraintAdjusters[splitter.collapseDirection](box, minRange, maxRange, splitter);

        me.dragInfo = {
            minRange: minRange,
            maxRange: maxRange,
            //neighborSizes: neighborSizes,
            targetSize: targetSize
        };

        return box;
    },

    constraintAdjusters: {
        // splitter is to the right of the box
        left: function (box, minRange, maxRange, splitter) {
            box[0] = box.x = box.left = box.right + minRange;
            box.right += maxRange + splitter.getWidth();
        },

        // splitter is below the box
        top: function (box, minRange, maxRange, splitter) {
            box[1] = box.y = box.top = box.bottom + minRange;
            box.bottom += maxRange + splitter.getHeight();
        },

        // splitter is above the box
        bottom: function (box, minRange, maxRange, splitter) {
            box.bottom = box.top - minRange;
            box.top -= maxRange + splitter.getHeight();
        },

        // splitter is to the left of the box
        right: function (box, minRange, maxRange, splitter) {
            box.right = box.left - minRange;
            box.left -= maxRange + splitter.getWidth();
        }
    },

    onBeforeStart: function(e) {
        var me = this,
            splitter = me.splitter,
            collapseTarget = splitter.collapseTarget,
            neighbors = splitter.neighbors,
            collapseEl = me.getSplitter().collapseEl,
            target = e.getTarget(),
            length = neighbors.length,
            i, neighbor;
            
        if (collapseEl && target === splitter.collapseEl.dom) {
            return false;
        }

        if (collapseTarget.collapsed) {
            return false;
        }

        // disabled if any neighbors are collapsed in parallel direction.
        for (i = 0; i < length; ++i) {
            neighbor = neighbors[i];

            if (neighbor.collapsed && neighbor.isHorz === collapseTarget.isHorz) {
                return false;
            }
        }

        if (!(me.constrainTo = me.calculateConstrainRegion())) {
            return false;
        }

        me.createDragOverlay();
        return true;
    },

    performResize: function(e, offset) {
        var me = this,
            splitter = me.splitter,
            collapseDirection = splitter.collapseDirection,
            collapseTarget = splitter.collapseTarget,
            // a vertical splitter adjusts horizontal dimensions
            adjusters = me.splitAdjusters[splitter.vertical ? 'horz' : 'vert'],
            delta = offset[adjusters.index],
            dragInfo = me.dragInfo,
            //neighbors = splitter.neighbors,
            //length = neighbors.length,
            //neighborSizes = dragInfo.neighborSizes,
            //isVert = collapseTarget.isVert,
            //i, neighbor,
            owner;

        if (collapseDirection == 'right' || collapseDirection == 'bottom') {
            // these splitters grow by moving left/up, so flip the sign of delta...
            delta = -delta;
        }

        // now constrain delta to our computed range:
        delta = Math.min(Math.max(dragInfo.minRange, delta), dragInfo.maxRange);

        if (delta) {
            (owner = splitter.ownerCt).suspendLayouts();

            adjusters.adjustTarget(collapseTarget, dragInfo.targetSize, delta);

            //for (i = 0; i < length; ++i) {
            //    neighbor = neighbors[i];
            //    if (!neighbor.isCenter && !neighbor.maintainFlex && neighbor.isVert == isVert) {
            //        delete neighbor.flex;
            //        adjusters.adjustNeighbor(neighbor, neighborSizes[i], delta);
            //    }
            //}

            owner.resumeLayouts(true);
        }
    },

    splitAdjusters: {
        horz: {
            index: 0,
            //adjustNeighbor: function (neighbor, size, delta) {
            //    neighbor.setSize(size - delta);
            //},
            adjustTarget: function (target, size, delta) {
                target.flex = null;
                target.setSize(size + delta);
            }
        },
        vert: {
            index: 1,
            //adjustNeighbor: function (neighbor, size, delta) {
            //    neighbor.setSize(undefined, size - delta);
            //},
            adjustTarget: function (target, targetSize, delta) {
                target.flex = null;
                target.setSize(undefined, targetSize + delta);
            }
        }
    }
});

/**
 * Provides a handle for 9-point resizing of Elements or Components.
 */
Ext.define('Ext.resizer.Handle', {
    extend: 'Ext.Component',
    handleCls: '',
    baseHandleCls: Ext.baseCSSPrefix + 'resizable-handle',
    // Ext.resizer.Resizer.prototype.possiblePositions define the regions
    // which will be passed in as a region configuration.
    region: '',

    beforeRender: function() {
        var me = this;

        me.callParent();

        me.addCls(
            me.baseHandleCls,
            me.baseHandleCls + '-' + me.region,
            me.handleCls
        );
    },

    onRender: function() {
        this.callParent(arguments);

        this.el.unselectable();
    }
});

/**
 * This class functions **between siblings of a {@link Ext.layout.container.VBox VBox} or {@link Ext.layout.container.HBox HBox}
 * layout** to resize both immediate siblings.
 *
 * A Splitter will preserve the flex ratio of any flexed siblings it is required to resize. It does this by setting the `flex` property of *all* flexed siblings
 * to equal their pixel size. The actual numerical `flex` property in the Components will change, but the **ratio** to the total flex value will be preserved.
 *
 * A Splitter may be configured to show a centered mini-collapse tool orientated to collapse the {@link #collapseTarget}.
 * The Splitter will then call that sibling Panel's {@link Ext.panel.Panel#method-collapse collapse} or {@link Ext.panel.Panel#method-expand expand} method
 * to perform the appropriate operation (depending on the sibling collapse state). To create the mini-collapse tool but take care
 * of collapsing yourself, configure the splitter with `{@link #performCollapse}: false`.
 */
Ext.define('Ext.resizer.Splitter', {
    extend: 'Ext.Component',
    requires: ['Ext.XTemplate'],
    uses: ['Ext.resizer.SplitterTracker'],
    alias: 'widget.splitter',

    childEls: [
        'collapseEl'
    ],

    renderTpl: [
        '<tpl if="collapsible===true">',
            '<div id="{id}-collapseEl" class="', Ext.baseCSSPrefix, 'collapse-el ',
                Ext.baseCSSPrefix, 'layout-split-{collapseDir}">&#160;</div>',
        '</tpl>'
    ],

    baseCls: Ext.baseCSSPrefix + 'splitter',
    collapsedClsInternal: Ext.baseCSSPrefix + 'splitter-collapsed',
    
    // Default to tree, allow internal classes to disable resizing
    canResize: true,

    /**
     * @cfg {Boolean} collapsible
     * True to show a mini-collapse tool in the Splitter to toggle expand and collapse on the {@link #collapseTarget} Panel.
     * Defaults to the {@link Ext.panel.Panel#collapsible collapsible} setting of the Panel.
     */
    collapsible: false,

    /**
     * @cfg {Boolean} performCollapse
     * Set to false to prevent this Splitter's mini-collapse tool from managing the collapse
     * state of the {@link #collapseTarget}.
     */

    /**
     * @cfg {Boolean} collapseOnDblClick
     * True to enable dblclick to toggle expand and collapse on the {@link #collapseTarget} Panel.
     */
    collapseOnDblClick: true,

    /**
     * @cfg {Number} defaultSplitMin
     * Provides a default minimum width or height for the two components
     * that the splitter is between.
     */
    defaultSplitMin: 40,

    /**
     * @cfg {Number} defaultSplitMax
     * Provides a default maximum width or height for the two components
     * that the splitter is between.
     */
    defaultSplitMax: 1000,

    /**
     * @cfg {String} collapsedCls
     * A class to add to the splitter when it is collapsed. See {@link #collapsible}.
     */

    /**
     * @cfg {String/Ext.panel.Panel} collapseTarget
     * A string describing the relative position of the immediate sibling Panel to collapse. May be 'prev' or 'next'.
     *
     * Or the immediate sibling Panel to collapse.
     *
     * The orientation of the mini-collapse tool will be inferred from this setting.
     *
     * **Note that only Panels may be collapsed.**
     */
    collapseTarget: 'next',

    /**
     * @property {String} orientation
     * Orientation of this Splitter. `'vertical'` when used in an hbox layout, `'horizontal'`
     * when used in a vbox layout.
     */

    horizontal: false,
    vertical: false,

    /**
     * Returns the config object (with an `xclass` property) for the splitter tracker. This
     * is overridden by {@link Ext.resizer.BorderSplitter BorderSplitter} to create a
     * {@link Ext.resizer.BorderSplitterTracker BorderSplitterTracker}.
     * @protected
     */
    getTrackerConfig: function () {
        return {
            xclass: 'Ext.resizer.SplitterTracker',
            el: this.el,
            splitter: this
        };
    },

    beforeRender: function() {
        var me = this,
            target = me.getCollapseTarget(),
            collapseDir = me.getCollapseDirection(),
            vertical = me.vertical,
            fixedSizeProp = vertical ? 'width' : 'height',
            stretchSizeProp = vertical ? 'height' : 'width',
            cls;

        me.callParent();

        if (!me.hasOwnProperty(stretchSizeProp)) {
            me[stretchSizeProp] = '100%';
        }
        if (!me.hasOwnProperty(fixedSizeProp)) {
            me[fixedSizeProp] = 5;
        }

        if (target.collapsed) {
            me.addCls(me.collapsedClsInternal);
        }
        
        cls = me.baseCls + '-' + me.orientation;
        me.addCls(cls);
        if (!me.canResize) {
            me.addCls(cls + '-noresize');
        }
        
        Ext.applyIf(me.renderData, {
            collapseDir: collapseDir,
            collapsible: me.collapsible || target.collapsible
        });
    },

    onRender: function() {
        var me = this;

        me.callParent(arguments);

        // Add listeners on the mini-collapse tool unless performCollapse is set to false
        if (me.performCollapse !== false) {
            if (me.renderData.collapsible) {
                me.mon(me.collapseEl, 'click', me.toggleTargetCmp, me);
            }
            if (me.collapseOnDblClick) {
                me.mon(me.el, 'dblclick', me.toggleTargetCmp, me);
            }
        }

        // Ensure the mini collapse icon is set to the correct direction when the target is collapsed/expanded by any means
        me.mon(me.getCollapseTarget(), {
            collapse: me.onTargetCollapse,
            expand: me.onTargetExpand,
            scope: me
        });

        me.el.unselectable();
        if (me.canResize) {
            me.tracker = Ext.create(me.getTrackerConfig());
            // Relay the most important events to our owner (could open wider later):
            me.relayEvents(me.tracker, [ 'beforedragstart', 'dragstart', 'dragend' ]);
        }
    },

    getCollapseDirection: function() {
        var me = this,
            dir = me.collapseDirection,
            collapseTarget, idx, items, type;

        if (!dir) {
            collapseTarget = me.collapseTarget;
            if (collapseTarget.isComponent) {
                dir = collapseTarget.collapseDirection;
            }

            if (!dir) {
                // Avoid duplication of string tests.
                // Create a two bit truth table of the configuration of the Splitter:
                // Collapse Target | orientation
                //        0              0             = next, horizontal
                //        0              1             = next, vertical
                //        1              0             = prev, horizontal
                //        1              1             = prev, vertical
                type = me.ownerCt.layout.type;
                if (collapseTarget.isComponent) {
                    items = me.ownerCt.items;
                    idx = Number(items.indexOf(collapseTarget) == items.indexOf(me) - 1) << 1 | Number(type == 'hbox');
                } else {
                    idx = Number(me.collapseTarget == 'prev') << 1 | Number(type == 'hbox');
                }

                // Read the data out the truth table
                dir = ['bottom', 'right', 'top', 'left'][idx];
            }

            me.collapseDirection = dir;
        }

        me.orientation = (dir == 'top' || dir == 'bottom') ? 'horizontal' : 'vertical';
        me[me.orientation] = true;

        return dir;
    },

    getCollapseTarget: function() {
        var me = this;

        return me.collapseTarget.isComponent ? me.collapseTarget : me.collapseTarget == 'prev' ? me.previousSibling() : me.nextSibling();
    },

    onTargetCollapse: function(target) {
        this.el.addCls([this.collapsedClsInternal, this.collapsedCls]);
    },

    onTargetExpand: function(target) {
        this.el.removeCls([this.collapsedClsInternal, this.collapsedCls]);
    },

    toggleTargetCmp: function(e, t) {
        var cmp = this.getCollapseTarget(),
            placeholder = cmp.placeholder,
            toggle;

        if (placeholder && !placeholder.hidden) {
            toggle = true;
        } else {
            toggle = !cmp.hidden;
        }

        if (toggle) {
            if (cmp.collapsed) {
                cmp.expand();
            } else if (cmp.collapseDirection) {
                cmp.collapse();
            } else {
                cmp.collapse(this.renderData.collapseDir);
            }
        }
    },

    /*
     * Work around IE bug. %age margins do not get recalculated on element resize unless repaint called.
     */
    setSize: function() {
        var me = this;
        me.callParent(arguments);
        if (Ext.isIE && me.el) {
            me.el.repaint();
        }
    },
    
    beforeDestroy: function(){
        Ext.destroy(this.tracker);
        this.callParent();
    }
});

/**
 * Private utility class for Ext.layout.container.Border.
 * @private
 */
Ext.define('Ext.resizer.BorderSplitter', {
    extend: 'Ext.resizer.Splitter',

    uses: ['Ext.resizer.BorderSplitterTracker'],

    alias: 'widget.bordersplitter',

    // must be configured in by the border layout:
    collapseTarget: null,

    getTrackerConfig: function () {
        var trackerConfig = this.callParent();

        trackerConfig.xclass = 'Ext.resizer.BorderSplitterTracker';

        return trackerConfig;
    }
});
