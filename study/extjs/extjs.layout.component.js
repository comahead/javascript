
/**
 * This class is intended to be extended or created via the {@link Ext.Component#componentLayout layout}
 * configuration property.  See {@link Ext.Component#componentLayout} for additional details.
 * @private
 */
Ext.define('Ext.layout.component.Component', {

    /* Begin Definitions */

    extend: 'Ext.layout.Layout',

    /* End Definitions */

    type: 'component',

    isComponentLayout: true,

    nullBox: {},

    usesContentHeight: true,
    usesContentWidth: true,
    usesHeight: true,
    usesWidth: true,

    beginLayoutCycle: function (ownerContext, firstCycle) {
        var me = this,
            owner = me.owner,
            ownerCtContext = ownerContext.ownerCtContext,
            heightModel = ownerContext.heightModel,
            widthModel = ownerContext.widthModel,
            body = owner.el.dom === document.body,
            lastBox = owner.lastBox || me.nullBox,
            lastSize = owner.el.lastBox || me.nullBox,
            dirty = !body,
            ownerLayout, v, widthName, heightName;

        me.callParent(arguments);

        if (firstCycle) {
            if (me.usesContentWidth) {
                ++ownerContext.consumersContentWidth;
            }
            if (me.usesContentHeight) {
                ++ownerContext.consumersContentHeight;
            }
            if (me.usesWidth) {
                ++ownerContext.consumersWidth;
            }
            if (me.usesHeight) {
                ++ownerContext.consumersHeight;
            }

            if (ownerCtContext && !ownerCtContext.hasRawContent) {
                ownerLayout = owner.ownerLayout;

                if (ownerLayout.usesWidth) {
                    ++ownerContext.consumersWidth;
                }
                if (ownerLayout.usesHeight) {
                    ++ownerContext.consumersHeight;
                }
            }
        }

        // we want to publish configured dimensions as early as possible and since this is
        // a write phase...

        if (widthModel.configured) {
            // If the owner.el is the body, owner.width is not dirty (we don't want to write
            // it to the body el). For other el's, the width may already be correct in the
            // DOM (e.g., it is rendered in the markup initially). If the width is not
            // correct in the DOM, this is only going to be the case on the first cycle.
            widthName = widthModel.names.width;

            if (!body) {
                dirty = firstCycle ? owner[widthName] !== lastSize.width
                                   : widthModel.constrained;
            }
            
            ownerContext.setWidth(owner[widthName], dirty);
        } else if (ownerContext.isTopLevel) {
            if (widthModel.calculated) {
                v = lastBox.width;
                ownerContext.setWidth(v, /*dirty=*/v != lastSize.width);
            }

            v = lastBox.x;
            ownerContext.setProp('x', v, /*dirty=*/v != lastSize.x);
        }

        if (heightModel.configured) {
            heightName = heightModel.names.height;

            if (!body) {
                dirty = firstCycle ? owner[heightName] !== lastSize.height
                                   : heightModel.constrained;
            }

            ownerContext.setHeight(owner[heightName], dirty);
        } else if (ownerContext.isTopLevel) {
            if (heightModel.calculated) {
                v = lastBox.height;
                ownerContext.setHeight(v, v != lastSize.height);
            }

            v = lastBox.y;
            ownerContext.setProp('y', v, /*dirty=*/v != lastSize.y);
        }
    },

    finishedLayout: function(ownerContext) {
        var me = this,
            elementChildren = ownerContext.children,
            owner = me.owner,
            len, i, elContext, lastBox, props, v;

        // NOTE: In the code below we cannot use getProp because that will generate a layout dependency

        // Set lastBox on managed child Elements.
        // So that ContextItem.constructor can snag the lastBox for use by its undo method.
        if (elementChildren) {
            len = elementChildren.length;
            for (i = 0; i < len; i++) {
                elContext = elementChildren[i];
                elContext.el.lastBox = elContext.props;
            }
        }

        // Cache the size from which we are changing so that notifyOwner can notify the owningComponent with all essential information
        ownerContext.previousSize = me.lastComponentSize;

        // Cache the currently layed out size
        me.lastComponentSize = owner.el.lastBox = props = ownerContext.props;

        // lastBox is a copy of the defined props to allow save/restore of these (panel
        // collapse needs this)
        owner.lastBox = lastBox = {};

        v = props.x;
        if (v !== undefined) {
            lastBox.x = v;
        }
        v = props.y;
        if (v !== undefined) {
            lastBox.y = v;
        }
        v = props.width;
        if (v !== undefined) {
            lastBox.width = v;
        }
        v = props.height;
        if (v !== undefined) {
            lastBox.height = v;
        }

        me.callParent(arguments);
    },
    
    notifyOwner: function(ownerContext) {
        var me = this,
            currentSize = me.lastComponentSize,
            prevSize = ownerContext.previousSize,
            args = [currentSize.width, currentSize.height];

        if (prevSize) {
            args.push(prevSize.width, prevSize.height);
        }

        // Call afterComponentLayout passing new size, and only passing old size if there *was* an old size.
        me.owner.afterComponentLayout.apply(me.owner, args);
    },

    /**
     * Returns the owner component's resize element.
     * @return {Ext.Element}
     */
    getTarget : function() {
        return this.owner.el;
    },

    /**
     * Returns the element into which rendering must take place. Defaults to the owner Component's encapsulating element.
     *
     * May be overridden in Component layout managers which implement an inner element.
     * @return {Ext.Element}
     */
    getRenderTarget : function() {
        return this.owner.el;
    },

    cacheTargetInfo: function(ownerContext) {
        var me = this,
            targetInfo = me.targetInfo,
            target;

        if (!targetInfo) {
            target = ownerContext.getEl('getTarget', me);

            me.targetInfo = targetInfo = {
                padding: target.getPaddingInfo(),
                border: target.getBorderInfo()
            };
        }

        return targetInfo;
    },

    measureAutoDimensions: function (ownerContext, dimensions) {
        // Subtle But Important:
        // 
        // We don't want to call getProp/hasProp et.al. unless we in fact need that value
        // for our results! If we call it and don't need it, the layout manager will think
        // we depend on it and will schedule us again should it change.

        var me = this,
            owner = me.owner,
            containerLayout = owner.layout,
            heightModel = ownerContext.heightModel,
            widthModel = ownerContext.widthModel,
            boxParent = ownerContext.boxParent,
            isBoxParent = ownerContext.isBoxParent,
            props = ownerContext.props,
            isContainer,
            ret = {
                gotWidth: false,
                gotHeight: false,
                isContainer: (isContainer = !ownerContext.hasRawContent)
            },
            hv = dimensions || 3,
            zeroWidth, zeroHeight,
            needed = 0,
            got = 0,
            ready, size, temp;

        // Note: this method is called *a lot*, so we have to be careful not to waste any
        // time or make useless calls or, especially, read the DOM when we can avoid it.

        //---------------------------------------------------------------------
        // Width

        if (widthModel.shrinkWrap && ownerContext.consumersContentWidth) {
            ++needed;
            zeroWidth = !(hv & 1);

            if (isContainer) {
                // as a componentLayout for a container, we rely on the container layout to
                // produce contentWidth...
                if (zeroWidth) {
                    ret.contentWidth = 0;
                    ret.gotWidth = true;
                    ++got;
                } else if ((ret.contentWidth = ownerContext.getProp('contentWidth')) !== undefined) {
                    ret.gotWidth = true;
                    ++got;
                }
            } else {
                size = props.contentWidth;

                if (typeof size == 'number') { // if (already determined)
                    ret.contentWidth = size;
                    ret.gotWidth = true;
                    ++got;
                } else {
                    if (zeroWidth) {
                        ready = true;
                    } else if (!ownerContext.hasDomProp('containerChildrenDone')) {
                        ready = false;
                    } else if (isBoxParent || !boxParent || boxParent.widthModel.shrinkWrap) {
                        // if we have no boxParent, we are ready, but a shrinkWrap boxParent
                        // artificially provides width early in the measurement process so
                        // we are ready to go in that case as well...
                        ready = true;
                    } else {
                        // lastly, we have a boxParent that will be given a width, so we
                        // can wait for that width to be set in order to properly measure
                        // whatever is inside...
                        ready = boxParent.hasDomProp('width');
                    }

                    if (ready) {
                        if (zeroWidth) {
                            temp = 0;
                        } else if (containerLayout && containerLayout.measureContentWidth) {
                            // Allow the container layout to do the measurement since it
                            // may have a better idea of how to do it even with no items:
                            temp = containerLayout.measureContentWidth(ownerContext);
                        } else {
                            temp = me.measureContentWidth(ownerContext);
                        }

                        if (!isNaN(ret.contentWidth = temp)) {
                            ownerContext.setContentWidth(temp, true);
                            ret.gotWidth = true;
                            ++got;
                        }
                    }
                }
            }
        } else if (widthModel.natural && ownerContext.consumersWidth) {
            ++needed;
            size = props.width;
            // zeroWidth does not apply

            if (typeof size == 'number') { // if (already determined)
                ret.width = size;
                ret.gotWidth = true;
                ++got;
            } else {
                if (isBoxParent || !boxParent) {
                    ready = true;
                } else {
                    // lastly, we have a boxParent that will be given a width, so we
                    // can wait for that width to be set in order to properly measure
                    // whatever is inside...
                    ready = boxParent.hasDomProp('width');
                }

                if (ready) {
                    if (!isNaN(ret.width = me.measureOwnerWidth(ownerContext))) {
                        ownerContext.setWidth(ret.width, false);
                        ret.gotWidth = true;
                        ++got;
                    }
                }
            }
        }

        //---------------------------------------------------------------------
        // Height

        if (heightModel.shrinkWrap && ownerContext.consumersContentHeight) {
            ++needed;
            zeroHeight = !(hv & 2);

            if (isContainer) {
                // don't ask unless we need to know...
                if (zeroHeight) {
                    ret.contentHeight = 0;
                    ret.gotHeight = true;
                    ++got;
                } else if ((ret.contentHeight = ownerContext.getProp('contentHeight')) !== undefined) {
                    ret.gotHeight = true;
                    ++got;
                }
            } else {
                size = props.contentHeight;

                if (typeof size == 'number') { // if (already determined)
                    ret.contentHeight = size;
                    ret.gotHeight = true;
                    ++got;
                } else {
                    if (zeroHeight) {
                        ready = true;
                    } else if (!ownerContext.hasDomProp('containerChildrenDone')) {
                        ready = false;
                    } else if (owner.noWrap) {
                        ready = true;
                    } else if (!widthModel.shrinkWrap) {
                        // fixed width, so we need the width to determine the height...
                        ready = (ownerContext.bodyContext || ownerContext).hasDomProp('width');// && (!ownerContext.bodyContext || ownerContext.bodyContext.hasDomProp('width'));
                    } else if (isBoxParent || !boxParent || boxParent.widthModel.shrinkWrap) {
                        // if we have no boxParent, we are ready, but an autoWidth boxParent
                        // artificially provides width early in the measurement process so
                        // we are ready to go in that case as well...
                        ready = true;
                    } else {
                        // lastly, we have a boxParent that will be given a width, so we
                        // can wait for that width to be set in order to properly measure
                        // whatever is inside...
                        ready = boxParent.hasDomProp('width');
                    }

                    if (ready) {
                        if (zeroHeight) {
                            temp = 0;
                        } else if (containerLayout && containerLayout.measureContentHeight) {
                            // Allow the container layout to do the measurement since it
                            // may have a better idea of how to do it even with no items:
                            temp = containerLayout.measureContentHeight(ownerContext);
                        } else {
                            temp = me.measureContentHeight(ownerContext);
                        }

                        if (!isNaN(ret.contentHeight = temp)) {
                            ownerContext.setContentHeight(temp, true);
                            ret.gotHeight = true;
                            ++got;
                        }
                    }
                }
            }
        } else if (heightModel.natural && ownerContext.consumersHeight) {
            ++needed;
            size = props.height;
            // zeroHeight does not apply

            if (typeof size == 'number') { // if (already determined)
                ret.height = size;
                ret.gotHeight = true;
                ++got;
            } else {
                if (isBoxParent || !boxParent) {
                    ready = true;
                } else {
                    // lastly, we have a boxParent that will be given a width, so we
                    // can wait for that width to be set in order to properly measure
                    // whatever is inside...
                    ready = boxParent.hasDomProp('width');
                }

                if (ready) {
                    if (!isNaN(ret.height = me.measureOwnerHeight(ownerContext))) {
                        ownerContext.setHeight(ret.height, false);
                        ret.gotHeight = true;
                        ++got;
                    }
                }
            }
        }

        if (boxParent) {
            ownerContext.onBoxMeasured();
        }

        ret.gotAll = got == needed;
        // see if we can avoid calling this method by storing something on ownerContext.
        return ret;
    },

    measureContentWidth: function (ownerContext) {
        // contentWidth includes padding, but not border, framing or margins
        return ownerContext.el.getWidth() - ownerContext.getFrameInfo().width;
    },

    measureContentHeight: function (ownerContext) {
        // contentHeight includes padding, but not border, framing or margins
        return ownerContext.el.getHeight() - ownerContext.getFrameInfo().height;
    },

    measureOwnerHeight: function (ownerContext) {
        return ownerContext.el.getHeight();
    },

    measureOwnerWidth: function (ownerContext) {
        return ownerContext.el.getWidth();
    }
});

/**
 * The class is the default component layout for {@link Ext.Component} when no explicit
 * `{@link Ext.Component#componentLayout componentLayout}` is configured.
 *
 * This class uses template methods to perform the individual aspects of measurement,
 * calculation and publication of results. The methods called depend on the component's
 * {@link Ext.AbstractComponent#getSizeModel size model}.
 * 
 * ## configured / calculated
 *
 * In either of these size models, the dimension of the outer element is of a known size.
 * The size is found in the `ownerContext` (the {@link Ext.layout.ContextItem} for the owner
 * component) as either "width" or "height". This value, if available, is passed to the
 * `publishInnerWidth` or `publishInnerHeight` method, respectively.
 * 
 * ## shrinkWrap
 *
 * When a dimension uses the `shrinkWrap` size model, that means the content is measured,
 * then the outer (owner) size is calculated and published.
 * 
 * For example, for a shrinkWrap width, the following sequence of calls are made:
 * 
 * - `Ext.layout.component.Component#measureContentWidth`
 * - `publishOwnerWidth`
 *    - `calculateOwnerWidthFromContentWidth`
 *    - `publishInnerWidth` (in the event of hitting a min/maxWidth constraint)
 *
 * ## natural
 *
 * When a dimension uses the `natural` size model, the measurement is made on the outer
 * (owner) element. This size is then used to determine the content area in much the same
 * way as if the outer element had a `configured` or `calculated` size model.
 * 
 * - `Ext.layout.component.Component#measureOwnerWidth`
 * - `publishInnerWidth`
 *
 * @protected
 */
Ext.define('Ext.layout.component.Auto', {

    /* Begin Definitions */

    alias: 'layout.autocomponent',

    extend: 'Ext.layout.component.Component',

    /* End Definitions */

    type: 'autocomponent',

    /**
     * @cfg {Boolean} [setHeightInDom=false]
     * @protected
     * When publishing height of an auto Component, it is usually not written to the DOM.
     * Setting this to `true` overrides this behaviour.
     */
    setHeightInDom: false,

    /**
     * @cfg {Boolean} [setWidthInDom=false]
     * @protected
     * When publishing width of an auto Component, it is usually not written to the DOM.
     * Setting this to `true` overrides this behaviour.
     */
    setWidthInDom: false,

    waitForOuterHeightInDom: false,
    waitForOuterWidthInDom: false,
    
    beginLayoutCycle: function(ownerContext, firstCycle){
        var me = this,
            lastWidthModel = me.lastWidthModel,
            lastHeightModel = me.lastHeightModel,
            owner = me.owner;
            
        me.callParent(arguments);
            
        if (lastWidthModel && lastWidthModel.fixed && ownerContext.widthModel.shrinkWrap) {
            owner.el.setWidth(null);
        }
            
        if (lastHeightModel && lastHeightModel.fixed && ownerContext.heightModel.shrinkWrap) {
            owner.el.setHeight(null);
        }    
    },

    calculate: function(ownerContext) {
        var me = this,
            measurement = me.measureAutoDimensions(ownerContext),
            heightModel = ownerContext.heightModel,
            widthModel = ownerContext.widthModel,
            width, height;

        // It is generally important to process widths before heights, since widths can
        // often effect heights...
        if (measurement.gotWidth) {
            if (widthModel.shrinkWrap) {
                me.publishOwnerWidth(ownerContext, measurement.contentWidth);
            } else if (me.publishInnerWidth) {
                me.publishInnerWidth(ownerContext, measurement.width);
            }
        } else if (!widthModel.auto && me.publishInnerWidth) {
            width = me.waitForOuterWidthInDom ? ownerContext.getDomProp('width')
                        : ownerContext.getProp('width');
            if (width === undefined) {
                me.done = false;
            } else {
                me.publishInnerWidth(ownerContext, width);
            }
        }

        if (measurement.gotHeight) {
            if (heightModel.shrinkWrap) {
                me.publishOwnerHeight(ownerContext, measurement.contentHeight);
            } else if (me.publishInnerHeight) {
                me.publishInnerHeight(ownerContext, measurement.height);
            }
        } else if (!heightModel.auto && me.publishInnerHeight) {
            height = me.waitForOuterHeightInDom ? ownerContext.getDomProp('height')
                        : ownerContext.getProp('height');
            if (height === undefined) {
                me.done = false;
            } else {
               me.publishInnerHeight(ownerContext, height);
            }
        }

        if (!measurement.gotAll) {
            me.done = false;
        }
    },

    calculateOwnerHeightFromContentHeight: function (ownerContext, contentHeight) {
        return contentHeight + ownerContext.getFrameInfo().height;
    },

    calculateOwnerWidthFromContentWidth: function (ownerContext, contentWidth) {
        return contentWidth + ownerContext.getFrameInfo().width;
    },

    publishOwnerHeight: function (ownerContext, contentHeight) {
        var me = this,
            owner = me.owner,
            height = me.calculateOwnerHeightFromContentHeight(ownerContext, contentHeight),
            constrainedHeight, dirty, heightModel;

        if (isNaN(height)) {
            me.done = false;
        } else {
            constrainedHeight = Ext.Number.constrain(height, owner.minHeight, owner.maxHeight);

            if (constrainedHeight == height) {
                dirty = me.setHeightInDom;
            } else {
                heightModel = me.sizeModels[
                    (constrainedHeight < height) ? 'constrainedMax' : 'constrainedMin'];
                height = constrainedHeight;

                if (ownerContext.heightModel.calculatedFromShrinkWrap) {
                    // Don't bother to invalidate since that will come soon... but we need
                    // to signal our ownerLayout that we need an invalidate to actually
                    // make good on the determined (constrained) size!
                    ownerContext.heightModel = heightModel;
                } else {
                    ownerContext.invalidate({ heightModel: heightModel });
                }
            }
            
            ownerContext.setHeight(height, dirty);
        }
    },

    publishOwnerWidth: function (ownerContext, contentWidth) {
        var me = this,
            owner = me.owner,
            width = me.calculateOwnerWidthFromContentWidth(ownerContext, contentWidth),
            constrainedWidth, dirty, widthModel;

        if (isNaN(width)) {
            me.done = false;
        } else {
            constrainedWidth = Ext.Number.constrain(width, owner.minWidth, owner.maxWidth);

            if (constrainedWidth == width) {
                dirty = me.setWidthInDom;
            } else {
                widthModel = me.sizeModels[
                    (constrainedWidth < width) ? 'constrainedMax' : 'constrainedMin'];
                width = constrainedWidth;

                if (ownerContext.widthModel.calculatedFromShrinkWrap) {
                    // Don't bother to invalidate since that will come soon... but we need
                    // to signal our ownerLayout that we need an invalidate to actually
                    // make good on the determined (constrained) size!
                    ownerContext.widthModel = widthModel;
                } else {
                    ownerContext.invalidate({ widthModel: widthModel });
                }
            }

            ownerContext.setWidth(width, dirty);
        }
    }
});

/**
 * @class Ext.layout.component.Draw
 * @private
 *
 */

Ext.define('Ext.layout.component.Draw', {

    /* Begin Definitions */

    alias: 'layout.draw',

    extend: 'Ext.layout.component.Auto',

    /* End Definitions */

    type: 'draw',
    
    measureContentWidth : function (ownerContext) {
        var target = ownerContext.target,
            paddingInfo = ownerContext.getPaddingInfo(),
            bbox = this.getBBox(ownerContext);
            
        if (!target.viewBox) {
            if (target.autoSize) {
                return bbox.width + paddingInfo.width;
            } else {
                return bbox.x + bbox.width + paddingInfo.width;
            }
        } else {
            if (ownerContext.heightModel.shrinkWrap) {
                return paddingInfo.width;
            } else {
                return bbox.width / bbox.height * (ownerContext.getProp('contentHeight') - paddingInfo.height) + paddingInfo.width;
            }
        }
    },
    
    measureContentHeight : function (ownerContext) {
        var target = ownerContext.target,
            paddingInfo = ownerContext.getPaddingInfo(),
            bbox = this.getBBox(ownerContext);
            
        if (!ownerContext.target.viewBox) {
            if (target.autoSize) {
                return bbox.height + paddingInfo.height;
            } else {
                return bbox.y + bbox.height + paddingInfo.height;
            }
        } else {
            if (ownerContext.widthModel.shrinkWrap) {
                return paddingInfo.height;
            } else {
                return bbox.height / bbox.width * (ownerContext.getProp('contentWidth') - paddingInfo.width) + paddingInfo.height;
            }
        }
    },
    
    getBBox: function(ownerContext) {
        var bbox = ownerContext.surfaceBBox;
        if (!bbox) {
            bbox = ownerContext.target.surface.items.getBBox();
            // If the surface is empty, we'll get these values, normalize them
            if (bbox.width === -Infinity && bbox.height === -Infinity) {
                bbox.width = bbox.height = bbox.x = bbox.y = 0;
            }
            ownerContext.surfaceBBox = bbox;
        }
        return bbox;
    },

    publishInnerWidth: function (ownerContext, width) {
        ownerContext.setContentWidth(width - ownerContext.getFrameInfo().width, true);
    },
    
    publishInnerHeight: function (ownerContext, height) {
        ownerContext.setContentHeight(height - ownerContext.getFrameInfo().height, true);
    },
    
    finishedLayout: function (ownerContext) {
        // TODO: Is there a better way doing this?
        var props = ownerContext.props,
            paddingInfo = ownerContext.getPaddingInfo();

        // We don't want the cost of getProps, so we just use the props data... this is ok
        // because all the props have been calculated by this time
        this.owner.setSurfaceSize(props.contentWidth - paddingInfo.width, props.contentHeight - paddingInfo.height);
        
        // calls afterComponentLayout, so we want the surface to be sized before that:
        this.callParent(arguments);
    }
});
