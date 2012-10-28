
/**
 * This is the base class for {@link Ext.tip.QuickTip} and {@link Ext.tip.ToolTip} that provides the basic layout and
 * positioning that all tip-based classes require. This class can be used directly for simple, statically-positioned
 * tips that are displayed programmatically, or it can be extended to provide custom tip implementations.
 * @xtype tip
 */
Ext.define('Ext.tip.Tip', {
    extend: 'Ext.panel.Panel',

    alternateClassName: 'Ext.Tip',

    /**
     * @cfg {Boolean} [closable=false]
     * True to render a close tool button into the tooltip header.
     */
    /**
     * @cfg {Number} width
     * Width in pixels of the tip.  Width will be ignored if it
     * exceeds the bounds of {@link #minWidth} or {@link #maxWidth}.  The maximum
     * supported value is 500.
     * 
     * Defaults to auto.
     */
    /**
     * @cfg {Number} minWidth
     * The minimum width of the tip in pixels.
     */
    minWidth : 40,
    /**
     * @cfg {Number} maxWidth
     * The maximum width of the tip in pixels.  The maximum supported value is 500.
     */
    maxWidth : 300,
    /**
     * @cfg {Boolean/String} shadow
     * True or "sides" for the default effect, "frame" for 4-way shadow, and "drop"
     * for bottom-right shadow.
     */
    shadow : "sides",

    /**
     * @cfg {String} defaultAlign
     * **Experimental**. The default {@link Ext.Element#alignTo} anchor position value
     * for this tip relative to its element of origin.
     */
    defaultAlign : "tl-bl?",
    /**
     * @cfg {Boolean} constrainPosition
     * If true, then the tooltip will be automatically constrained to stay within
     * the browser viewport.
     */
    constrainPosition : true,

    // private panel overrides
    autoRender: true,
    hidden: true,
    baseCls: Ext.baseCSSPrefix + 'tip',
    floating: {
        shadow: true,
        shim: true,
        constrain: true
    },
    focusOnToFront: false,

    /**
     * @cfg {String} closeAction
     * The action to take when the close header tool is clicked:
     *
     * - **{@link #method-destroy}** : {@link #method-remove remove} the window from the DOM and
     *   {@link Ext.Component#method-destroy destroy} it and all descendant Components. The
     *   window will **not** be available to be redisplayed via the {@link #method-show} method.
     *
     * - **{@link #method-hide}** : **Default.** {@link #method-hide} the window by setting visibility
     *   to hidden and applying negative offsets. The window will be available to be
     *   redisplayed via the {@link #method-show} method.
     *
     * **Note:** This behavior has changed! setting *does* affect the {@link #method-close} method
     * which will invoke the approriate closeAction.
     */
    closeAction: 'hide',

    ariaRole: 'tooltip',

    // Flag to Renderable to always look up the framing styles for this Component
    alwaysFramed: true,

    frameHeader: false,

    initComponent: function() {
        var me = this;

        me.floating = Ext.apply({}, {shadow: me.shadow}, me.self.prototype.floating);
        me.callParent(arguments);

        // Or in the deprecated config. Floating.doConstrain only constrains if the constrain property is truthy.
        me.constrain = me.constrain || me.constrainPosition;
    },

    /**
     * Shows this tip at the specified XY position.  Example usage:
     *
     *     // Show the tip at x:50 and y:100
     *     tip.showAt([50,100]);
     *
     * @param {Number[]} xy An array containing the x and y coordinates
     */
    showAt : function(xy){
        var me = this;
        this.callParent(arguments);
        // Show may have been vetoed.
        if (me.isVisible()) {
            me.setPagePosition(xy[0], xy[1]);
            if (me.constrainPosition || me.constrain) {
                me.doConstrain();
            }
            me.toFront(true);
        }
    },

    /**
     * **Experimental**. Shows this tip at a position relative to another element using
     * a standard {@link Ext.Element#alignTo} anchor position value.  Example usage:
     *
     *    // Show the tip at the default position ('tl-br?')
     *    tip.showBy('my-el');
     *
     *    // Show the tip's top-left corner anchored to the element's top-right corner
     *    tip.showBy('my-el', 'tl-tr');
     *
     * @param {String/HTMLElement/Ext.Element} el An HTMLElement, Ext.Element or string
     * id of the target element to align to.
     *
     * @param {String} [position] A valid {@link Ext.Element#alignTo} anchor position.
     * 
     * Defaults to 'tl-br?' or {@link #defaultAlign} if specified.
     */
    showBy : function(el, pos) {
        this.showAt(this.el.getAlignToXY(el, pos || this.defaultAlign));
    },

    /**
     * @private
     * Set Tip draggable using base Component's draggability
     */
    initDraggable : function(){
        var me = this;
        me.draggable = {
            el: me.getDragEl(),
            delegate: me.header.el,
            constrain: me,
            constrainTo: me.el.getScopeParent()
        };
        // Important: Bypass Panel's initDraggable. Call direct to Component's implementation.
        Ext.Component.prototype.initDraggable.call(me);
    },

    // Tip does not ghost. Drag is "live"
    ghost: undefined,
    unghost: undefined
});


	
/**
 * ToolTip is a {@link Ext.tip.Tip} implementation that handles the common case of displaying a
 * tooltip when hovering over a certain element or elements on the page. It allows fine-grained
 * control over the tooltip's alignment relative to the target element or mouse, and the timing
 * of when it is automatically shown and hidden.
 *
 * This implementation does **not** have a built-in method of automatically populating the tooltip's
 * text based on the target element; you must either configure a fixed {@link #html} value for each
 * ToolTip instance, or implement custom logic (e.g. in a {@link #beforeshow} event listener) to
 * generate the appropriate tooltip content on the fly. See {@link Ext.tip.QuickTip} for a more
 * convenient way of automatically populating and configuring a tooltip based on specific DOM
 * attributes of each target element.
 *
 * # Basic Example
 *
 *     var tip = Ext.create('Ext.tip.ToolTip', {
 *         target: 'clearButton',
 *         html: 'Press this button to clear the form'
 *     });
 *
 * {@img Ext.tip.ToolTip/Ext.tip.ToolTip1.png Basic Ext.tip.ToolTip}
 *
 * # Delegation
 *
 * In addition to attaching a ToolTip to a single element, you can also use delegation to attach
 * one ToolTip to many elements under a common parent. This is more efficient than creating many
 * ToolTip instances. To do this, point the {@link #target} config to a common ancestor of all the
 * elements, and then set the {@link #delegate} config to a CSS selector that will select all the
 * appropriate sub-elements.
 *
 * When using delegation, it is likely that you will want to programmatically change the content
 * of the ToolTip based on each delegate element; you can do this by implementing a custom
 * listener for the {@link #beforeshow} event. Example:
 *
 *     var store = Ext.create('Ext.data.ArrayStore', {
 *         fields: ['company', 'price', 'change'],
 *         data: [
 *             ['3m Co',                               71.72, 0.02],
 *             ['Alcoa Inc',                           29.01, 0.42],
 *             ['Altria Group Inc',                    83.81, 0.28],
 *             ['American Express Company',            52.55, 0.01],
 *             ['American International Group, Inc.',  64.13, 0.31],
 *             ['AT&T Inc.',                           31.61, -0.48]
 *         ]
 *     });
 *
 *     var grid = Ext.create('Ext.grid.Panel', {
 *         title: 'Array Grid',
 *         store: store,
 *         columns: [
 *             {text: 'Company', flex: 1, dataIndex: 'company'},
 *             {text: 'Price', width: 75, dataIndex: 'price'},
 *             {text: 'Change', width: 75, dataIndex: 'change'}
 *         ],
 *         height: 200,
 *         width: 400,
 *         renderTo: Ext.getBody()
 *     });
 *
 *     grid.getView().on('render', function(view) {
 *         view.tip = Ext.create('Ext.tip.ToolTip', {
 *             // The overall target element.
 *             target: view.el,
 *             // Each grid row causes its own separate show and hide.
 *             delegate: view.itemSelector,
 *             // Moving within the row should not hide the tip.
 *             trackMouse: true,
 *             // Render immediately so that tip.body can be referenced prior to the first show.
 *             renderTo: Ext.getBody(),
 *             listeners: {
 *                 // Change content dynamically depending on which element triggered the show.
 *                 beforeshow: function updateTipBody(tip) {
 *                     tip.update('Over company "' + view.getRecord(tip.triggerElement).get('company') + '"');
 *                 }
 *             }
 *         });
 *     });
 *
 * {@img Ext.tip.ToolTip/Ext.tip.ToolTip2.png Ext.tip.ToolTip with delegation}
 *
 * # Alignment
 *
 * The following configuration properties allow control over how the ToolTip is aligned relative to
 * the target element and/or mouse pointer:
 *
 * - {@link #anchor}
 * - {@link #anchorToTarget}
 * - {@link #anchorOffset}
 * - {@link #trackMouse}
 * - {@link #mouseOffset}
 *
 * # Showing/Hiding
 *
 * The following configuration properties allow control over how and when the ToolTip is automatically
 * shown and hidden:
 *
 * - {@link #autoHide}
 * - {@link #showDelay}
 * - {@link #hideDelay}
 * - {@link #dismissDelay}
 *
 * @docauthor Jason Johnston <jason@sencha.com>
 */
Ext.define('Ext.tip.ToolTip', {
    extend: 'Ext.tip.Tip',
    alias: 'widget.tooltip',
    alternateClassName: 'Ext.ToolTip',
    /**
     * @property {HTMLElement} triggerElement
     * When a ToolTip is configured with the `{@link #delegate}`
     * option to cause selected child elements of the `{@link #target}`
     * Element to each trigger a separate show event, this property is set to
     * the DOM element which triggered the show.
     */
    /**
     * @cfg {HTMLElement/Ext.Element/String} target
     * The target element or string id to monitor for mouseover events to trigger
     * showing this ToolTip.
     */
    /**
     * @cfg {Boolean} [autoHide=true]
     * True to automatically hide the tooltip after the
     * mouse exits the target element or after the `{@link #dismissDelay}`
     * has expired if set.  If `{@link #closable} = true`
     * a close tool button will be rendered into the tooltip header.
     */
    autoHide: true,
    
    /**
     * @cfg {Number} showDelay
     * Delay in milliseconds before the tooltip displays after the mouse enters the target element.
     */
    showDelay: 500,
    /**
     * @cfg {Number} hideDelay
     * Delay in milliseconds after the mouse exits the target element but before the tooltip actually hides.
     * Set to 0 for the tooltip to hide immediately.
     */
    hideDelay: 200,
    /**
     * @cfg {Number} dismissDelay
     * Delay in milliseconds before the tooltip automatically hides. To disable automatic hiding, set
     * dismissDelay = 0.
     */
    dismissDelay: 5000,
    /**
     * @cfg {Number[]} [mouseOffset=[15,18]]
     * An XY offset from the mouse position where the tooltip should be shown.
     */
    /**
     * @cfg {Boolean} trackMouse
     * True to have the tooltip follow the mouse as it moves over the target element.
     */
    trackMouse: false,
    /**
     * @cfg {String} anchor
     * If specified, indicates that the tip should be anchored to a
     * particular side of the target element or mouse pointer ("top", "right", "bottom",
     * or "left"), with an arrow pointing back at the target or mouse pointer. If
     * {@link #constrainPosition} is enabled, this will be used as a preferred value
     * only and may be flipped as needed.
     */
    /**
     * @cfg {Boolean} anchorToTarget
     * True to anchor the tooltip to the target element, false to anchor it relative to the mouse coordinates.
     * When `anchorToTarget` is true, use `{@link #defaultAlign}` to control tooltip alignment to the
     * target element.  When `anchorToTarget` is false, use `{@link #anchor}` instead to control alignment.
     */
    anchorToTarget: true,
    /**
     * @cfg {Number} anchorOffset
     * A numeric pixel value used to offset the default position of the anchor arrow.  When the anchor
     * position is on the top or bottom of the tooltip, `anchorOffset` will be used as a horizontal offset.
     * Likewise, when the anchor position is on the left or right side, `anchorOffset` will be used as
     * a vertical offset.
     */
    anchorOffset: 0,
    /**
     * @cfg {String} delegate
     *
     * A {@link Ext.DomQuery DomQuery} selector which allows selection of individual elements within the
     * `{@link #target}` element to trigger showing and hiding the ToolTip as the mouse moves within the
     * target.
     *
     * When specified, the child element of the target which caused a show event is placed into the
     * `{@link #triggerElement}` property before the ToolTip is shown.
     *
     * This may be useful when a Component has regular, repeating elements in it, each of which need a
     * ToolTip which contains information specific to that element.
     *
     * See the delegate example in class documentation of {@link Ext.tip.ToolTip}.
     */

    // private
    targetCounter: 0,
    quickShowInterval: 250,

    // private
    initComponent: function() {
        var me = this;
        me.callParent(arguments);
        me.lastActive = new Date();
        me.setTarget(me.target);
        me.origAnchor = me.anchor;
    },

    // private
    onRender: function(ct, position) {
        var me = this;
        me.callParent(arguments);
        me.anchorCls = Ext.baseCSSPrefix + 'tip-anchor-' + me.getAnchorPosition();
        me.anchorEl = me.el.createChild({
            cls: Ext.baseCSSPrefix + 'tip-anchor ' + me.anchorCls
        });
    },

    /**
     * Binds this ToolTip to the specified element. The tooltip will be displayed when the mouse moves over the element.
     * @param {String/HTMLElement/Ext.Element} t The Element, HtmlElement, or ID of an element to bind to
     */
    setTarget: function(target) {
        var me = this,
            t = Ext.get(target),
            tg;

        if (me.target) {
            tg = Ext.get(me.target);
            me.mun(tg, 'mouseover', me.onTargetOver, me);
            me.mun(tg, 'mouseout', me.onTargetOut, me);
            me.mun(tg, 'mousemove', me.onMouseMove, me);
        }

        me.target = t;
        if (t) {

            me.mon(t, {
                // TODO - investigate why IE6/7 seem to fire recursive resize in e.getXY
                // breaking QuickTip#onTargetOver (EXTJSIV-1608)
                freezeEvent: true,

                mouseover: me.onTargetOver,
                mouseout: me.onTargetOut,
                mousemove: me.onMouseMove,
                scope: me
            });
        }
        if (me.anchor) {
            me.anchorTarget = me.target;
        }
    },

    // private
    onMouseMove: function(e) {
        var me = this,
            t = me.delegate ? e.getTarget(me.delegate) : me.triggerElement = true,
            xy;
        if (t) {
            me.targetXY = e.getXY();
            if (t === me.triggerElement) {
                if (!me.hidden && me.trackMouse) {
                    xy = me.getTargetXY();
                    if (me.constrainPosition) {
                        xy = me.el.adjustForConstraints(xy, me.el.getScopeParent());
                    }
                    me.setPagePosition(xy);
                }
            } else {
                me.hide();
                me.lastActive = new Date(0);
                me.onTargetOver(e);
            }
        } else if ((!me.closable && me.isVisible()) && me.autoHide !== false) {
            me.hide();
        }
    },

    // private
    getTargetXY: function() {
        var me = this,
            mouseOffset,
            offsets, xy, dw, dh, de, bd, scrollX, scrollY, axy, sz, constrainPosition;
        if (me.delegate) {
            me.anchorTarget = me.triggerElement;
        }
        if (me.anchor) {
            me.targetCounter++;
            offsets = me.getOffsets();
            xy = (me.anchorToTarget && !me.trackMouse) ? me.el.getAlignToXY(me.anchorTarget, me.getAnchorAlign()) : me.targetXY;
            dw = Ext.Element.getViewWidth() - 5;
            dh = Ext.Element.getViewHeight() - 5;
            de = document.documentElement;
            bd = document.body;
            scrollX = (de.scrollLeft || bd.scrollLeft || 0) + 5;
            scrollY = (de.scrollTop || bd.scrollTop || 0) + 5;
            axy = [xy[0] + offsets[0], xy[1] + offsets[1]];
            sz = me.getSize();
            constrainPosition = me.constrainPosition;

            me.anchorEl.removeCls(me.anchorCls);

            if (me.targetCounter < 2 && constrainPosition) {
                if (axy[0] < scrollX) {
                    if (me.anchorToTarget) {
                        me.defaultAlign = 'l-r';
                        if (me.mouseOffset) {
                            me.mouseOffset[0] *= -1;
                        }
                    }
                    me.anchor = 'left';
                    return me.getTargetXY();
                }
                if (axy[0] + sz.width > dw) {
                    if (me.anchorToTarget) {
                        me.defaultAlign = 'r-l';
                        if (me.mouseOffset) {
                            me.mouseOffset[0] *= -1;
                        }
                    }
                    me.anchor = 'right';
                    return me.getTargetXY();
                }
                if (axy[1] < scrollY) {
                    if (me.anchorToTarget) {
                        me.defaultAlign = 't-b';
                        if (me.mouseOffset) {
                            me.mouseOffset[1] *= -1;
                        }
                    }
                    me.anchor = 'top';
                    return me.getTargetXY();
                }
                if (axy[1] + sz.height > dh) {
                    if (me.anchorToTarget) {
                        me.defaultAlign = 'b-t';
                        if (me.mouseOffset) {
                            me.mouseOffset[1] *= -1;
                        }
                    }
                    me.anchor = 'bottom';
                    return me.getTargetXY();
                }
            }

            me.anchorCls = Ext.baseCSSPrefix + 'tip-anchor-' + me.getAnchorPosition();
            me.anchorEl.addCls(me.anchorCls);
            me.targetCounter = 0;
            return axy;
        } else {
            mouseOffset = me.getMouseOffset();
            return (me.targetXY) ? [me.targetXY[0] + mouseOffset[0], me.targetXY[1] + mouseOffset[1]] : mouseOffset;
        }
    },

    getMouseOffset: function() {
        var me = this,
        offset = me.anchor ? [0, 0] : [15, 18];
        if (me.mouseOffset) {
            offset[0] += me.mouseOffset[0];
            offset[1] += me.mouseOffset[1];
        }
        return offset;
    },

    // private
    getAnchorPosition: function() {
        var me = this,
            m;
        if (me.anchor) {
            me.tipAnchor = me.anchor.charAt(0);
        } else {
            m = me.defaultAlign.match(/^([a-z]+)-([a-z]+)(\?)?$/);
            if (!m) {
                Ext.Error.raise('The AnchorTip.defaultAlign value "' + me.defaultAlign + '" is invalid.');
            }
            me.tipAnchor = m[1].charAt(0);
        }

        switch (me.tipAnchor) {
        case 't':
            return 'top';
        case 'b':
            return 'bottom';
        case 'r':
            return 'right';
        }
        return 'left';
    },

    // private
    getAnchorAlign: function() {
        switch (this.anchor) {
        case 'top':
            return 'tl-bl';
        case 'left':
            return 'tl-tr';
        case 'right':
            return 'tr-tl';
        default:
            return 'bl-tl';
        }
    },

    // private
    getOffsets: function() {
        var me = this,
            mouseOffset,
            offsets,
            ap = me.getAnchorPosition().charAt(0);
        if (me.anchorToTarget && !me.trackMouse) {
            switch (ap) {
            case 't':
                offsets = [0, 9];
                break;
            case 'b':
                offsets = [0, -13];
                break;
            case 'r':
                offsets = [ - 13, 0];
                break;
            default:
                offsets = [9, 0];
                break;
            }
        } else {
            switch (ap) {
            case 't':
                offsets = [ - 15 - me.anchorOffset, 30];
                break;
            case 'b':
                offsets = [ - 19 - me.anchorOffset, -13 - me.el.dom.offsetHeight];
                break;
            case 'r':
                offsets = [ - 15 - me.el.dom.offsetWidth, -13 - me.anchorOffset];
                break;
            default:
                offsets = [25, -13 - me.anchorOffset];
                break;
            }
        }
        mouseOffset = me.getMouseOffset();
        offsets[0] += mouseOffset[0];
        offsets[1] += mouseOffset[1];

        return offsets;
    },

    // private
    onTargetOver: function(e) {
        var me = this,
            t;

        if (me.disabled || e.within(me.target.dom, true)) {
            return;
        }
        t = e.getTarget(me.delegate);
        if (t) {
            me.triggerElement = t;
            me.clearTimer('hide');
            me.targetXY = e.getXY();
            me.delayShow();
        }
    },

    // private
    delayShow: function() {
        var me = this;
        if (me.hidden && !me.showTimer) {
            if (Ext.Date.getElapsed(me.lastActive) < me.quickShowInterval) {
                me.show();
            } else {
                me.showTimer = Ext.defer(me.show, me.showDelay, me);
            }
        }
        else if (!me.hidden && me.autoHide !== false) {
            me.show();
        }
    },
    
    onShowVeto: function(){
        this.callParent();
        this.clearTimer('show');
    },

    // private
    onTargetOut: function(e) {
        var me = this;

        // If disabled, moving within the current target, ignore the mouseout
        // EventObject.within is the only correct way to determine this.
        if (me.disabled || e.within(me.target.dom, true)) {
            return;
        }
        me.clearTimer('show');
        if (me.autoHide !== false) {
            me.delayHide();
        }
    },

    // private
    delayHide: function() {
        var me = this;
        if (!me.hidden && !me.hideTimer) {
            me.hideTimer = Ext.defer(me.hide, me.hideDelay, me);
        }
    },

    /**
     * Hides this tooltip if visible.
     */
    hide: function() {
        var me = this;
        me.clearTimer('dismiss');
        me.lastActive = new Date();
        if (me.anchorEl) {
            me.anchorEl.hide();
        }
        me.callParent(arguments);
        delete me.triggerElement;
    },

    /**
     * Shows this tooltip at the current event target XY position.
     */
    show: function() {
        var me = this;

        // Show this Component first, so that sizing can be calculated
        // pre-show it off screen so that the el will have dimensions
        this.callParent();
        if (this.hidden === false) {
            me.setPagePosition(-10000, -10000);

            if (me.anchor) {
                me.anchor = me.origAnchor;
            }
            
            if (!me.calledFromShowAt) {
                me.showAt(me.getTargetXY());
            }

            if (me.anchor) {
                me.syncAnchor();
                me.anchorEl.show();
            } else {
                me.anchorEl.hide();
            }
        }
    },

    // inherit docs
    showAt: function(xy) {
        var me = this;
        me.lastActive = new Date();
        me.clearTimers();
        me.calledFromShowAt = true;

        // Only call if this is hidden. May have been called from show above.
        if (!me.isVisible()) {
            this.callParent(arguments);
        }

        // Show may have been vetoed.
        if (me.isVisible()) {
            me.setPagePosition(xy[0], xy[1]);
            if (me.constrainPosition || me.constrain) {
                me.doConstrain();
            }
            me.toFront(true);
            me.el.sync(true);
            if (me.dismissDelay && me.autoHide !== false) {
                me.dismissTimer = Ext.defer(me.hide, me.dismissDelay, me);
            }
            if (me.anchor) {
                me.syncAnchor();
                if (!me.anchorEl.isVisible()) {
                    me.anchorEl.show();
                }
            } else {
                me.anchorEl.hide();
            }
        }
        delete me.calledFromShowAt;
    },

    // private
    syncAnchor: function() {
        var me = this,
            anchorPos,
            targetPos,
            offset;
        switch (me.tipAnchor.charAt(0)) {
        case 't':
            anchorPos = 'b';
            targetPos = 'tl';
            offset = [20 + me.anchorOffset, 1];
            break;
        case 'r':
            anchorPos = 'l';
            targetPos = 'tr';
            offset = [ - 1, 12 + me.anchorOffset];
            break;
        case 'b':
            anchorPos = 't';
            targetPos = 'bl';
            offset = [20 + me.anchorOffset, -1];
            break;
        default:
            anchorPos = 'r';
            targetPos = 'tl';
            offset = [1, 12 + me.anchorOffset];
            break;
        }
        me.anchorEl.alignTo(me.el, anchorPos + '-' + targetPos, offset);
        me.anchorEl.setStyle('z-index', parseInt(me.el.getZIndex(), 10) || 0 + 1).setVisibilityMode(Ext.Element.DISPLAY);
    },

    // private
    setPagePosition: function(x, y) {
        var me = this;
        me.callParent(arguments);
        if (me.anchor) {
            me.syncAnchor();
        }
    },

    // private
    clearTimer: function(name) {
        name = name + 'Timer';
        clearTimeout(this[name]);
        delete this[name];
    },

    // private
    clearTimers: function() {
        var me = this;
        me.clearTimer('show');
        me.clearTimer('dismiss');
        me.clearTimer('hide');
    },

    // private
    onShow: function() {
        var me = this;
        me.callParent();
        me.mon(Ext.getDoc(), 'mousedown', me.onDocMouseDown, me);
    },

    // private
    onHide: function() {
        var me = this;
        me.callParent();
        me.mun(Ext.getDoc(), 'mousedown', me.onDocMouseDown, me);
    },

    // private
    onDocMouseDown: function(e) {
        var me = this;
        if (!me.closable && !e.within(me.el.dom)) {
            me.disable();
            Ext.defer(me.doEnable, 100, me);
        }
    },

    // private
    doEnable: function() {
        if (!this.isDestroyed) {
            this.enable();
        }
    },

    // private
    onDisable: function() {
        this.callParent();
        this.clearTimers();
        this.hide();
    },

    beforeDestroy: function() {
        var me = this;
        me.clearTimers();
        Ext.destroy(me.anchorEl);
        delete me.anchorEl;
        delete me.target;
        delete me.anchorTarget;
        delete me.triggerElement;
        me.callParent();
    },

    // private
    onDestroy: function() {
        Ext.getDoc().un('mousedown', this.onDocMouseDown, this);
        this.callParent();
    }
});



/**
 * A specialized tooltip class for tooltips that can be specified in markup and automatically managed
 * by the global {@link Ext.tip.QuickTipManager} instance.  See the QuickTipManager documentation for
 * additional usage details and examples.
 */
Ext.define('Ext.tip.QuickTip', {
    extend: 'Ext.tip.ToolTip',
    alias: 'widget.quicktip',
    alternateClassName: 'Ext.QuickTip',

    /**
     * @cfg {String/HTMLElement/Ext.Element} target
     * The target HTMLElement, Ext.Element or id to associate with this Quicktip.
     * 
     * Defaults to the document.
     */

    /**
     * @cfg {Boolean} interceptTitles
     * True to automatically use the element's DOM title value if available.
     */
    interceptTitles : false,

    // Force creation of header Component
    title: '&#160;',

    // private
    tagConfig : {
        namespace : "data-",
        attribute : "qtip",
        width : "qwidth",
        target : "target",
        title : "qtitle",
        hide : "hide",
        cls : "qclass",
        align : "qalign",
        anchor : "anchor"
    },

    // private
    initComponent : function(){
        var me = this;

        me.target = me.target || Ext.getDoc();
        me.targets = me.targets || {};
        me.callParent();
    },

    /**
     * Configures a new quick tip instance and assigns it to a target element.
     *
     * For example usage, see the {@link Ext.tip.QuickTipManager} class header.
     *
     * @param {Object} config The config object with the following properties:
     * @param config.autoHide
     * @param config.cls
     * @param config.dismissDelay overrides the singleton value
     * @param config.target required
     * @param config.text required
     * @param config.title
     * @param config.width
     */
    register : function(config){
        var configs = Ext.isArray(config) ? config : arguments,
            i = 0,
            len = configs.length,
            target, j, targetLen;

        for (; i < len; i++) {
            config = configs[i];
            target = config.target;
            if (target) {
                if (Ext.isArray(target)) {
                    for (j = 0, targetLen = target.length; j < targetLen; j++) {
                        this.targets[Ext.id(target[j])] = config;
                    }
                } else{
                    this.targets[Ext.id(target)] = config;
                }
            }
        }
    },

    /**
     * Removes this quick tip from its element and destroys it.
     * @param {String/HTMLElement/Ext.Element} el The element from which the quick tip
     * is to be removed or ID of the element.
     */
    unregister : function(el){
        delete this.targets[Ext.id(el)];
    },

    /**
     * Hides a visible tip or cancels an impending show for a particular element.
     * @param {String/HTMLElement/Ext.Element} el The element that is the target of
     * the tip or ID of the element.
     */
    cancelShow: function(el){
        var me = this,
            activeTarget = me.activeTarget;

        el = Ext.get(el).dom;
        if (me.isVisible()) {
            if (activeTarget && activeTarget.el == el) {
                me.hide();
            }
        } else if (activeTarget && activeTarget.el == el) {
            me.clearTimer('show');
        }
    },

    /**
     * @private
     * Reads the tip text from the closest node to the event target which contains the
     * attribute we are configured to look for. Returns an object containing the text
     * from the attribute, and the target element from which the text was read.
     */
    getTipCfg: function(e) {
        var t = e.getTarget(),
            titleText = t.title,
            cfg;

        if (this.interceptTitles && titleText && Ext.isString(titleText)) {
            t.qtip = titleText;
            t.removeAttribute("title");
            e.preventDefault();
            return {
                text: titleText
            };
        }
        else {
            cfg = this.tagConfig;
            t = e.getTarget('[' + cfg.namespace + cfg.attribute + ']');
            if (t) {
                return {
                    target: t,
                    text: t.getAttribute(cfg.namespace + cfg.attribute)
                };
            }
        }
    },

    // private
    onTargetOver : function(e){
        var me = this,
            target = e.getTarget(me.delegate),
            hasShowDelay,
            delay,
            elTarget,
            cfg,
            ns,
            tipConfig,
            autoHide,
            targets, targetEl, value, key;

        if (me.disabled) {
            return;
        }

        // TODO - this causes "e" to be recycled in IE6/7 (EXTJSIV-1608) so ToolTip#setTarget
        // was changed to include freezeEvent. The issue seems to be a nested 'resize' event
        // that smashed Ext.EventObject.
        me.targetXY = e.getXY();

        // If the over target was filtered out by the delegate selector, or is not an HTMLElement, or is the <html> or the <body>, then return
        if(!target || target.nodeType !== 1 || target == document.documentElement || target == document.body){
            return;
        }

        if (me.activeTarget && ((target == me.activeTarget.el) || Ext.fly(me.activeTarget.el).contains(target))) {
            me.clearTimer('hide');
            me.show();
            return;
        }

        if (target) {
            targets = me.targets;

            for (key in targets) {
                if (targets.hasOwnProperty(key)) {
                    value = targets[key];

                    targetEl = Ext.fly(value.target);
                    if (targetEl && (targetEl.dom === target || targetEl.contains(target))) {
                        elTarget = targetEl.dom;
                        break;
                    }
                }
            }

            if (elTarget) {
                me.activeTarget = me.targets[elTarget.id];
                me.activeTarget.el = target;
                me.anchor = me.activeTarget.anchor;
                if (me.anchor) {
                    me.anchorTarget = target;
                }
                hasShowDelay = Ext.isDefined(me.activeTarget.showDelay);
                if (hasShowDelay) {
                    delay = me.showDelay;
                    me.showDelay = me.activeTarget.showDelay;
                }
                me.delayShow();
                if (hasShowDelay) {
                    me.showDelay = delay;
                }
                return;
            }
        }

        // Should be a fly.
        elTarget = Ext.fly(target, '_quicktip-target');
        cfg = me.tagConfig;
        ns = cfg.namespace;
        tipConfig = me.getTipCfg(e);

        if (tipConfig) {

            // getTipCfg may look up the parentNode axis for a tip text attribute and will return the new target node.
            // Change our target element to match that from which the tip text attribute was read.
            if (tipConfig.target) {
                target = tipConfig.target;
                elTarget = Ext.fly(target, '_quicktip-target');
            }
            autoHide = elTarget.getAttribute(ns + cfg.hide);

            me.activeTarget = {
                el: target,
                text: tipConfig.text,
                width: +elTarget.getAttribute(ns + cfg.width) || null,
                autoHide: autoHide != "user" && autoHide !== 'false',
                title: elTarget.getAttribute(ns + cfg.title),
                cls: elTarget.getAttribute(ns + cfg.cls),
                align: elTarget.getAttribute(ns + cfg.align)

            };
            me.anchor = elTarget.getAttribute(ns + cfg.anchor);
            if (me.anchor) {
                me.anchorTarget = target;
            }
            hasShowDelay = Ext.isDefined(me.activeTarget.showDelay);
            if (hasShowDelay) {
                delay = me.showDelay;
                me.showDelay = me.activeTarget.showDelay;
            }
            me.delayShow();
            if (hasShowDelay) {
                me.showDelay = delay;
            }
        }
    },

    // private
    onTargetOut : function(e){
        var me = this,
            active = me.activeTarget,
            hasHideDelay,
            delay;

        // If moving within the current target, and it does not have a new tip, ignore the mouseout
        // EventObject.within is the only correct way to determine this.
        if (active && e.within(me.activeTarget.el) && !me.getTipCfg(e)) {
            return;
        }

        me.clearTimer('show');
        delete me.activeTarget;
        if (me.autoHide !== false) {
            hasHideDelay = active && Ext.isDefined(active.hideDelay);
            if (hasHideDelay) {
                delay = me.hideDelay;
                me.hideDelay = active.hideDelay;
            }
            me.delayHide();
            if (hasHideDelay) {
                me.hideDelay = delay;
            }
        }
    },

    // inherit docs
    showAt : function(xy){
        var me = this,
            target = me.activeTarget,
            cls;

        if (target) {
            if (!me.rendered) {
                me.render(Ext.getBody());
                me.activeTarget = target;
            }
            me.suspendLayouts();
            if (target.title) {
                me.setTitle(target.title);
                me.header.show();
            } else {
                me.header.hide();
            }
            me.update(target.text);
            me.autoHide = target.autoHide;
            me.dismissDelay = target.dismissDelay || me.dismissDelay;
            if (target.mouseOffset) {
                xy[0] += target.mouseOffset[0];
                xy[1] += target.mouseOffset[1];
            }

            cls = me.lastCls;
            if (cls) {
                me.removeCls(cls);
                delete me.lastCls;
            }

            cls = target.cls;
            if (cls) {
                me.addCls(cls);
                me.lastCls = cls;
            }

            me.setWidth(target.width);

            if (me.anchor) {
                me.constrainPosition = false;
            } else if (target.align) { // TODO: this doesn't seem to work consistently
                xy = me.el.getAlignToXY(target.el, target.align);
                me.constrainPosition = false;
            }else{
                me.constrainPosition = true;
            }
            me.resumeLayouts(true);
        }
        me.callParent([xy]);
    },

    // inherit docs
    hide: function(){
        delete this.activeTarget;
        this.callParent();
    }
});
/**
 * Provides attractive and customizable tooltips for any element. The QuickTips
 * singleton is used to configure and manage tooltips globally for multiple elements
 * in a generic manner.  To create individual tooltips with maximum customizability,
 * you should consider either {@link Ext.tip.Tip} or {@link Ext.tip.ToolTip}.
 *
 * Quicktips can be configured via tag attributes directly in markup, or by
 * registering quick tips programmatically via the {@link #register} method.
 *
 * The singleton's instance of {@link Ext.tip.QuickTip} is available via
 * {@link #getQuickTip}, and supports all the methods, and all the all the
 * configuration properties of Ext.tip.QuickTip. These settings will apply to all
 * tooltips shown by the singleton.
 *
 * Below is the summary of the configuration properties which can be used.
 * For detailed descriptions see the config options for the
 * {@link Ext.tip.QuickTip QuickTip} class
 *
 * ## QuickTips singleton configs (all are optional)
 *
 *  - `dismissDelay`
 *  - `hideDelay`
 *  - `maxWidth`
 *  - `minWidth`
 *  - `showDelay`
 *  - `trackMouse`
 *
 * ## Target element configs (optional unless otherwise noted)
 *
 *  - `autoHide`
 *  - `cls`
 *  - `dismissDelay` (overrides singleton value)
 *  - `target` (required)
 *  - `text` (required)
 *  - `title`
 *  - `width`
 *
 * Here is an example showing how some of these config options could be used:
 *
 *     @example
 *     // Init the singleton.  Any tag-based quick tips will start working.
 *     Ext.tip.QuickTipManager.init();
 *
 *     // Apply a set of config properties to the singleton
 *     Ext.apply(Ext.tip.QuickTipManager.getQuickTip(), {
 *         maxWidth: 200,
 *         minWidth: 100,
 *         showDelay: 50      // Show 50ms after entering target
 *     });
 *
 *     // Create a small panel to add a quick tip to
 *     Ext.create('Ext.container.Container', {
 *         id: 'quickTipContainer',
 *         width: 200,
 *         height: 150,
 *         style: {
 *             backgroundColor:'#000000'
 *         },
 *         renderTo: Ext.getBody()
 *     });
 *
 *
 *     // Manually register a quick tip for a specific element
 *     Ext.tip.QuickTipManager.register({
 *         target: 'quickTipContainer',
 *         title: 'My Tooltip',
 *         text: 'This tooltip was added in code',
 *         width: 100,
 *         dismissDelay: 10000 // Hide after 10 seconds hover
 *     });
 *
 * To register a quick tip in markup, you simply add one or more of the valid QuickTip
 * attributes prefixed with the **data-** namespace.  The HTML element itself is
 * automatically set as the quick tip target. Here is the summary of supported attributes
 * (optional unless otherwise noted):
 *
 *  - `hide`: Specifying "user" is equivalent to setting autoHide = false.
 *     Any other value will be the same as autoHide = true.
 *  - `qclass`: A CSS class to be applied to the quick tip
 *     (equivalent to the 'cls' target element config).
 *  - `qtip (required)`: The quick tip text (equivalent to the 'text' target element config).
 *  - `qtitle`: The quick tip title (equivalent to the 'title' target element config).
 *  - `qwidth`: The quick tip width (equivalent to the 'width' target element config).
 *
 * Here is an example of configuring an HTML element to display a tooltip from markup:
 *
 *     // Add a quick tip to an HTML button
 *     <input type="button" value="OK" data-qtitle="OK Button" data-qwidth="100"
 *          data-qtip="This is a quick tip from markup!"></input>
 *
 * @singleton
 */
Ext.define('Ext.tip.QuickTipManager', (function() {
    var tip,
        disabled = false;

    return {
        requires: ['Ext.tip.QuickTip'],
        singleton: true,
        alternateClassName: 'Ext.QuickTips',

        /**
         * Initializes the global QuickTips instance and prepare any quick tips.
         * @param {Boolean} [autoRender=true] True to render the QuickTips container
         * immediately to preload images.
         * @param {Object} [config] config object for the created QuickTip. By
         * default, the {@link Ext.tip.QuickTip QuickTip} class is instantiated, but this can
         * be changed by supplying an xtype property or a className property in this object.
         * All other properties on this object are configuration for the created component.
         */
        init : function (autoRender, config) {
            if (!tip) {
                if (!Ext.isReady) {
                    Ext.onReady(function(){
                        Ext.tip.QuickTipManager.init(autoRender, config);
                    });
                    return;
                }

                var tipConfig = Ext.apply({ disabled: disabled, id: 'ext-quicktips-tip' }, config),
                    className = tipConfig.className,
                    xtype = tipConfig.xtype;

                if (className) {
                    delete tipConfig.className;
                } else if (xtype) {
                    className = 'widget.' + xtype;
                    delete tipConfig.xtype;
                }

                if (autoRender !== false) {
                    tipConfig.renderTo = document.body;

                    if (tipConfig.renderTo.tagName.toUpperCase() != 'BODY') { // e.g., == 'FRAMESET'
                        Ext.Error.raise({
                            sourceClass: 'Ext.tip.QuickTipManager',
                            sourceMethod: 'init',
                            msg: 'Cannot init QuickTipManager: no document body'
                        });
                    }
                }

                tip = Ext.create(className || 'Ext.tip.QuickTip', tipConfig);
            }
        },

        /**
         * Destroys the QuickTips instance.
         */
        destroy: function() {
            if (tip) {
                var undef;
                tip.destroy();
                tip = undef;
            }
        },

        // Protected method called by the dd classes
        ddDisable : function(){
            // don't disable it if we don't need to
            if(tip && !disabled){
                tip.disable();
            }
        },

        // Protected method called by the dd classes
        ddEnable : function(){
            // only enable it if it hasn't been disabled
            if(tip && !disabled){
                tip.enable();
            }
        },

        /**
         * Enables quick tips globally.
         */
        enable : function(){
            if(tip){
                tip.enable();
            }
            disabled = false;
        },

        /**
         * Disables quick tips globally.
         */
        disable : function(){
            if(tip){
                tip.disable();
            }
            disabled = true;
        },

        /**
         * Returns true if quick tips are enabled, else false.
         * @return {Boolean}
         */
        isEnabled : function(){
            return tip !== undefined && !tip.disabled;
        },

        /**
         * Gets the single {@link Ext.tip.QuickTip QuickTip} instance used to show tips
         * from all registered elements.
         * @return {Ext.tip.QuickTip}
         */
        getQuickTip : function(){
            return tip;
        },

        /**
         * Configures a new quick tip instance and assigns it to a target element.  See
         * {@link Ext.tip.QuickTip#register} for details.
         * @param {Object} config The config object
         */
        register : function(){
            tip.register.apply(tip, arguments);
        },

        /**
         * Removes any registered quick tip from the target element and destroys it.
         * @param {String/HTMLElement/Ext.Element} el The element from which the quick tip
         * is to be removed or ID of the element.
         */
        unregister : function(){
            tip.unregister.apply(tip, arguments);
        },

        /**
         * Alias of {@link #register}.
         * @inheritdoc Ext.tip.QuickTipManager#register
         */
        tips : function(){
            tip.register.apply(tip, arguments);
        }
    };
}()));