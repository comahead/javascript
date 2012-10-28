
/**
 * @class Ext.dom.Element
 * @alternateClassName Ext.Element
 * @alternateClassName Ext.core.Element
 * @extend Ext.dom.AbstractElement
 *
 * Encapsulates a DOM element, adding simple DOM manipulation facilities, normalizing for browser differences.
 *
 * All instances of this class inherit the methods of {@link Ext.fx.Anim} making visual effects easily available to all
 * DOM elements.
 *
 * Note that the events documented in this class are not Ext events, they encapsulate browser events. Some older browsers
 * may not support the full range of events. Which events are supported is beyond the control of Ext JS.
 *
 * Usage:
 *
 *     // by id
 *     var el = Ext.get("my-div");
 *
 *     // by DOM element reference
 *     var el = Ext.get(myDivElement);
 *
 * # Animations
 *
 * When an element is manipulated, by default there is no animation.
 *
 *     var el = Ext.get("my-div");
 *
 *     // no animation
 *     el.setWidth(100);
 *
 * Many of the functions for manipulating an element have an optional "animate" parameter. This parameter can be
 * specified as boolean (true) for default animation effects.
 *
 *     // default animation
 *     el.setWidth(100, true);
 *
 * To configure the effects, an object literal with animation options to use as the Element animation configuration
 * object can also be specified. Note that the supported Element animation configuration options are a subset of the
 * {@link Ext.fx.Anim} animation options specific to Fx effects. The supported Element animation configuration options
 * are:
 *
 *     Option    Default   Description
 *     --------- --------  ---------------------------------------------
 *     {@link Ext.fx.Anim#duration duration}  350       The duration of the animation in milliseconds
 *     {@link Ext.fx.Anim#easing easing}    easeOut   The easing method
 *     {@link Ext.fx.Anim#callback callback}  none      A function to execute when the anim completes
 *     {@link Ext.fx.Anim#scope scope}     this      The scope (this) of the callback function
 *
 * Usage:
 *
 *     // Element animation options object
 *     var opt = {
 *         {@link Ext.fx.Anim#duration duration}: 1000,
 *         {@link Ext.fx.Anim#easing easing}: 'elasticIn',
 *         {@link Ext.fx.Anim#callback callback}: this.foo,
 *         {@link Ext.fx.Anim#scope scope}: this
 *     };
 *     // animation with some options set
 *     el.setWidth(100, opt);
 *
 * The Element animation object being used for the animation will be set on the options object as "anim", which allows
 * you to stop or manipulate the animation. Here is an example:
 *
 *     // using the "anim" property to get the Anim object
 *     if(opt.anim.isAnimated()){
 *         opt.anim.stop();
 *     }
 *
 * # Composite (Collections of) Elements
 *
 * For working with collections of Elements, see {@link Ext.CompositeElement}
 *
 * @constructor
 * Creates new Element directly.
 * @param {String/HTMLElement} element
 * @param {Boolean} [forceNew] By default the constructor checks to see if there is already an instance of this
 * element in the cache and if there is it returns the same instance. This will skip that check (useful for extending
 * this class).
 * @return {Object}
 */
(function() {

var HIDDEN = 'hidden',
    DOC             = document,
    VISIBILITY      = "visibility",
    DISPLAY         = "display",
    NONE            = "none",
    XMASKED         = Ext.baseCSSPrefix + "masked",
    XMASKEDRELATIVE = Ext.baseCSSPrefix + "masked-relative",
    EXTELMASKMSG    = Ext.baseCSSPrefix + "mask-msg",
    bodyRe          = /^body/i,
    visFly,

    // speedy lookup for elements never to box adjust
    noBoxAdjust = Ext.isStrict ? {
        select: 1
    }: {
        input: 1,
        select: 1,
        textarea: 1
    },

    // Pseudo for use by cacheScrollValues
    isScrolled = function(c) {
        var r = [], ri = -1,
            i, ci;
        for (i = 0; ci = c[i]; i++) {
            if (ci.scrollTop > 0 || ci.scrollLeft > 0) {
                r[++ri] = ci;
            }
        }
        return r;
    },

    Element = Ext.define('Ext.dom.Element', {

    extend: 'Ext.dom.AbstractElement',

    alternateClassName: ['Ext.Element', 'Ext.core.Element'],

    addUnits: function() {
        return this.self.addUnits.apply(this.self, arguments);
    },

    /**
     * Tries to focus the element. Any exceptions are caught and ignored.
     * @param {Number} [defer] Milliseconds to defer the focus
     * @return {Ext.dom.Element} this
     */
    focus: function(defer, /* private */ dom) {
        var me = this,
            scrollTop,
            body;

        dom = dom || me.dom;
        body = (dom.ownerDocument || DOC).body || DOC.body;
        try {
            if (Number(defer)) {
                Ext.defer(me.focus, defer, me, [null, dom]);
            } else {
                // Focusing a large element, the browser attempts to scroll as much of it into view
                // as possible. We need to override this behaviour.
                if (dom.offsetHeight > Element.getViewHeight()) {
                    scrollTop = body.scrollTop;
                }
                dom.focus();
                if (scrollTop !== undefined) {
                    body.scrollTop = scrollTop;
                }
            }
        } catch(e) {
        }
        return me;
    },

    /**
     * Tries to blur the element. Any exceptions are caught and ignored.
     * @return {Ext.dom.Element} this
     */
    blur: function() {
        try {
            this.dom.blur();
        } catch(e) {
        }
        return this;
    },

    /**
     * Tests various css rules/browsers to determine if this element uses a border box
     * @return {Boolean}
     */
    isBorderBox: function() {
        var box = Ext.isBorderBox;
        if (box) {
            box = !((this.dom.tagName || "").toLowerCase() in noBoxAdjust);
        }
        return box;
    },

    /**
     * Sets up event handlers to call the passed functions when the mouse is moved into and out of the Element.
     * @param {Function} overFn The function to call when the mouse enters the Element.
     * @param {Function} outFn The function to call when the mouse leaves the Element.
     * @param {Object} [scope] The scope (`this` reference) in which the functions are executed. Defaults
     * to the Element's DOM element.
     * @param {Object} [options] Options for the listener. See {@link Ext.util.Observable#addListener the
     * options parameter}.
     * @return {Ext.dom.Element} this
     */
    hover: function(overFn, outFn, scope, options) {
        var me = this;
        me.on('mouseenter', overFn, scope || me.dom, options);
        me.on('mouseleave', outFn, scope || me.dom, options);
        return me;
    },

    /**
     * Returns the value of a namespaced attribute from the element's underlying DOM node.
     * @param {String} namespace The namespace in which to look for the attribute
     * @param {String} name The attribute name
     * @return {String} The attribute value
     */
    getAttributeNS: function(ns, name) {
        return this.getAttribute(name, ns);
    },

    getAttribute: (Ext.isIE && !(Ext.isIE9 && DOC.documentMode === 9)) ?
        function(name, ns) {
            var d = this.dom,
                    type;
            if (ns) {
                type = typeof d[ns + ":" + name];
                if (type != 'undefined' && type != 'unknown') {
                    return d[ns + ":" + name] || null;
                }
                return null;
            }
            if (name === "for") {
                name = "htmlFor";
            }
            return d[name] || null;
        } : function(name, ns) {
            var d = this.dom;
            if (ns) {
                return d.getAttributeNS(ns, name) || d.getAttribute(ns + ":" + name);
            }
            return  d.getAttribute(name) || d[name] || null;
        },

    /**
     * When an element is moved around in the DOM, or is hidden using `display:none`, it loses layout, and therefore
     * all scroll positions of all descendant elements are lost.
     * 
     * This function caches them, and returns a function, which when run will restore the cached positions.
     * In the following example, the Panel is moved from one Container to another which will cause it to lose all scroll positions:
     * 
     *     var restoreScroll = myPanel.el.cacheScrollValues();
     *     myOtherContainer.add(myPanel);
     *     restoreScroll();
     * 
     * @return {Function} A function which will restore all descentant elements of this Element to their scroll
     * positions recorded when this function was executed. Be aware that the returned function is a closure which has
     * captured the scope of `cacheScrollValues`, so take care to derefence it as soon as not needed - if is it is a `var`
     * it will drop out of scope, and the reference will be freed.
     */
    cacheScrollValues: function() {
        var me = this,
            scrolledDescendants,
            el, i,
            scrollValues = [],
            result = function() {
                for (i = 0; i < scrolledDescendants.length; i++) {
                    el = scrolledDescendants[i];
                    el.scrollLeft = scrollValues[i][0];
                    el.scrollTop  = scrollValues[i][1];
                }
            };

        if (!Ext.DomQuery.pseudos.isScrolled) {
            Ext.DomQuery.pseudos.isScrolled = isScrolled;
        }
        scrolledDescendants = me.query(':isScrolled');
        for (i = 0; i < scrolledDescendants.length; i++) {
            el = scrolledDescendants[i];
            scrollValues[i] = [el.scrollLeft, el.scrollTop];
        }
        return result;
    },

    /**
     * @property {Boolean} autoBoxAdjust
     * True to automatically adjust width and height settings for box-model issues.
     */
    autoBoxAdjust: true,

    /**
     * Checks whether the element is currently visible using both visibility and display properties.
     * @param {Boolean} [deep=false] True to walk the dom and see if parent elements are hidden.
     * If false, the function only checks the visibility of the element itself and it may return
     * `true` even though a parent is not visible.
     * @return {Boolean} `true` if the element is currently visible, else `false`
     */
    isVisible : function(deep) {
        var me = this,
            dom = me.dom,
            stopNode = dom.ownerDocument.documentElement;

        if (!visFly) {
            visFly = new Element.Fly();
        }

        while (dom !== stopNode) {
            // We're invisible if we hit a nonexistent parentNode or a document
            // fragment or computed style visibility:hidden or display:none
            if (!dom || dom.nodeType === 11 || (visFly.attach(dom)).isStyle(VISIBILITY, HIDDEN) || visFly.isStyle(DISPLAY, NONE)) {
                return false;
            }
            // Quit now unless we are being asked to check parent nodes.
            if (!deep) {
                break;
            }
            dom = dom.parentNode;
        }
        return true;
    },

    /**
     * Returns true if display is not "none"
     * @return {Boolean}
     */
    isDisplayed : function() {
        return !this.isStyle(DISPLAY, NONE);
    },

    /**
     * Convenience method for setVisibilityMode(Element.DISPLAY)
     * @param {String} [display] What to set display to when visible
     * @return {Ext.dom.Element} this
     */
    enableDisplayMode : function(display) {
        var me = this;
        
        me.setVisibilityMode(Element.DISPLAY);

        if (!Ext.isEmpty(display)) {
            (me.$cache || me.getCache()).data.originalDisplay = display;
        }

        return me;
    },

    /**
     * Puts a mask over this element to disable user interaction. Requires core.css.
     * This method can only be applied to elements which accept child nodes.
     * @param {String} [msg] A message to display in the mask
     * @param {String} [msgCls] A css class to apply to the msg element
     * @return {Ext.dom.Element} The mask element
     */
    mask : function(msg, msgCls /* private - passed by AbstractComponent.mask to avoid the need to interrogate the DOM to get the height*/, elHeight) {
        var me            = this,
            dom           = me.dom,
            // In some cases, setExpression will exist but not be of a function type,
            // so we check it explicitly here to stop IE throwing errors
            setExpression = dom.style.setExpression,
            data          = (me.$cache || me.getCache()).data,
            maskEl        = data.maskEl,
            maskMsg       = data.maskMsg;

        if (!(bodyRe.test(dom.tagName) && me.getStyle('position') == 'static')) {
            me.addCls(XMASKEDRELATIVE);
        }
        
        // We always needs to recreate the mask since the DOM element may have been re-created
        if (maskEl) {
            maskEl.remove();
        }
        
        if (maskMsg) {
            maskMsg.remove();
        }

        Ext.DomHelper.append(dom, [{
            cls : Ext.baseCSSPrefix + "mask"
        }, {
            cls : msgCls ? EXTELMASKMSG + " " + msgCls : EXTELMASKMSG,
            cn  : {
                tag: 'div',
                html: msg || ''
            }
        }]);
            
        maskMsg = Ext.get(dom.lastChild);
        maskEl = Ext.get(maskMsg.dom.previousSibling);
        data.maskMsg = maskMsg;
        data.maskEl = maskEl;

        me.addCls(XMASKED);
        maskEl.setDisplayed(true);

        if (typeof msg == 'string') {
            maskMsg.setDisplayed(true);
            maskMsg.center(me);
        } else {
            maskMsg.setDisplayed(false);
        }
        // NOTE: CSS expressions are resource intensive and to be used only as a last resort
        // These expressions are removed as soon as they are no longer necessary - in the unmask method.
        // In normal use cases an element will be masked for a limited period of time.
        // Fix for https://sencha.jira.com/browse/EXTJSIV-19.
        // IE6 strict mode and IE6-9 quirks mode takes off left+right padding when calculating width!
        if (!Ext.supports.IncludePaddingInWidthCalculation && setExpression) {
            // In an occasional case setExpression will throw an exception
            try {
                maskEl.dom.style.setExpression('width', 'this.parentNode.clientWidth + "px"');
            } catch (e) {}
        }

        // Some versions and modes of IE subtract top+bottom padding when calculating height.
        // Different versions from those which make the same error for width!
        if (!Ext.supports.IncludePaddingInHeightCalculation && setExpression) {
            // In an occasional case setExpression will throw an exception
            try {
                maskEl.dom.style.setExpression('height', 'this.parentNode.' + (dom == DOC.body ? 'scrollHeight' : 'offsetHeight') + ' + "px"');
            } catch (e) {}
        }
        // ie will not expand full height automatically
        else if (Ext.isIE && !(Ext.isIE7 && Ext.isStrict) && me.getStyle('height') == 'auto') {
            maskEl.setSize(undefined, elHeight || me.getHeight());
        }
        return maskEl;
    },

    /**
     * Hides a previously applied mask.
     */
    unmask : function() {
        var me      = this,
            data    = (me.$cache || me.getCache()).data,
            maskEl  = data.maskEl,
            maskMsg = data.maskMsg,
            style;

        if (maskEl) {
            style = maskEl.dom.style;
            // Remove resource-intensive CSS expressions as soon as they are not required.
            if (style.clearExpression) {
                style.clearExpression('width');
                style.clearExpression('height');
            }
            
            if (maskEl) {
                maskEl.remove();
                delete data.maskEl;
            }
            
            if (maskMsg) {
                maskMsg.remove();
                delete data.maskMsg;
            }
            
            me.removeCls([XMASKED, XMASKEDRELATIVE]);
        }
    },

    /**
     * Returns true if this element is masked. Also re-centers any displayed message within the mask.
     * @return {Boolean}
     */
    isMasked : function() {
        var me      = this,
            data    = (me.$cache || me.getCache()).data,
            maskEl  = data.maskEl,
            maskMsg = data.maskMsg,
            hasMask = false; 

        if (maskEl && maskEl.isVisible()) {
            if (maskMsg) {
                maskMsg.center(me);
            }
            hasMask = true;
        }
        return hasMask;
    },

    /**
     * Creates an iframe shim for this element to keep selects and other windowed objects from
     * showing through.
     * @return {Ext.dom.Element} The new shim element
     */
    createShim : function() {
        var el = DOC.createElement('iframe'),
            shim;

        el.frameBorder = '0';
        el.className = Ext.baseCSSPrefix + 'shim';
        el.src = Ext.SSL_SECURE_URL;
        shim = Ext.get(this.dom.parentNode.insertBefore(el, this.dom));
        shim.autoBoxAdjust = false;
        return shim;
    },

    /**
     * Convenience method for constructing a KeyMap
     * @param {String/Number/Number[]/Object} key Either a string with the keys to listen for, the numeric key code,
     * array of key codes or an object with the following options:
     * @param {Number/Array} key.key
     * @param {Boolean} key.shift
     * @param {Boolean} key.ctrl
     * @param {Boolean} key.alt
     * @param {Function} fn The function to call
     * @param {Object} [scope] The scope (`this` reference) in which the specified function is executed. Defaults to this Element.
     * @return {Ext.util.KeyMap} The KeyMap created
     */
    addKeyListener : function(key, fn, scope){
        var config;
        if(typeof key != 'object' || Ext.isArray(key)){
            config = {
                target: this,
                key: key,
                fn: fn,
                scope: scope
            };
        }else{
            config = {
                target: this,
                key : key.key,
                shift : key.shift,
                ctrl : key.ctrl,
                alt : key.alt,
                fn: fn,
                scope: scope
            };
        }
        return new Ext.util.KeyMap(config);
    },

    /**
     * Creates a KeyMap for this element
     * @param {Object} config The KeyMap config. See {@link Ext.util.KeyMap} for more details
     * @return {Ext.util.KeyMap} The KeyMap created
     */
    addKeyMap : function(config) {
        return new Ext.util.KeyMap(Ext.apply({
            target: this
        }, config));
    },

    //  Mouse events
    /**
     * @event click
     * Fires when a mouse click is detected within the element.
     * @param {Ext.EventObject} e The {@link Ext.EventObject} encapsulating the DOM event.
     * @param {HTMLElement} t The target of the event.
     */
    /**
     * @event contextmenu
     * Fires when a right click is detected within the element.
     * @param {Ext.EventObject} e The {@link Ext.EventObject} encapsulating the DOM event.
     * @param {HTMLElement} t The target of the event.
     */
    /**
     * @event dblclick
     * Fires when a mouse double click is detected within the element.
     * @param {Ext.EventObject} e The {@link Ext.EventObject} encapsulating the DOM event.
     * @param {HTMLElement} t The target of the event.
     */
    /**
     * @event mousedown
     * Fires when a mousedown is detected within the element.
     * @param {Ext.EventObject} e The {@link Ext.EventObject} encapsulating the DOM event.
     * @param {HTMLElement} t The target of the event.
     */
    /**
     * @event mouseup
     * Fires when a mouseup is detected within the element.
     * @param {Ext.EventObject} e The {@link Ext.EventObject} encapsulating the DOM event.
     * @param {HTMLElement} t The target of the event.
     */
    /**
     * @event mouseover
     * Fires when a mouseover is detected within the element.
     * @param {Ext.EventObject} e The {@link Ext.EventObject} encapsulating the DOM event.
     * @param {HTMLElement} t The target of the event.
     */
    /**
     * @event mousemove
     * Fires when a mousemove is detected with the element.
     * @param {Ext.EventObject} e The {@link Ext.EventObject} encapsulating the DOM event.
     * @param {HTMLElement} t The target of the event.
     */
    /**
     * @event mouseout
     * Fires when a mouseout is detected with the element.
     * @param {Ext.EventObject} e The {@link Ext.EventObject} encapsulating the DOM event.
     * @param {HTMLElement} t The target of the event.
     */
    /**
     * @event mouseenter
     * Fires when the mouse enters the element.
     * @param {Ext.EventObject} e The {@link Ext.EventObject} encapsulating the DOM event.
     * @param {HTMLElement} t The target of the event.
     */
    /**
     * @event mouseleave
     * Fires when the mouse leaves the element.
     * @param {Ext.EventObject} e The {@link Ext.EventObject} encapsulating the DOM event.
     * @param {HTMLElement} t The target of the event.
     */

    //  Keyboard events
    /**
     * @event keypress
     * Fires when a keypress is detected within the element.
     * @param {Ext.EventObject} e The {@link Ext.EventObject} encapsulating the DOM event.
     * @param {HTMLElement} t The target of the event.
     */
    /**
     * @event keydown
     * Fires when a keydown is detected within the element.
     * @param {Ext.EventObject} e The {@link Ext.EventObject} encapsulating the DOM event.
     * @param {HTMLElement} t The target of the event.
     */
    /**
     * @event keyup
     * Fires when a keyup is detected within the element.
     * @param {Ext.EventObject} e The {@link Ext.EventObject} encapsulating the DOM event.
     * @param {HTMLElement} t The target of the event.
     */

    //  HTML frame/object events
    /**
     * @event load
     * Fires when the user agent finishes loading all content within the element. Only supported by window, frames,
     * objects and images.
     * @param {Ext.EventObject} e The {@link Ext.EventObject} encapsulating the DOM event.
     * @param {HTMLElement} t The target of the event.
     */
    /**
     * @event unload
     * Fires when the user agent removes all content from a window or frame. For elements, it fires when the target
     * element or any of its content has been removed.
     * @param {Ext.EventObject} e The {@link Ext.EventObject} encapsulating the DOM event.
     * @param {HTMLElement} t The target of the event.
     */
    /**
     * @event abort
     * Fires when an object/image is stopped from loading before completely loaded.
     * @param {Ext.EventObject} e The {@link Ext.EventObject} encapsulating the DOM event.
     * @param {HTMLElement} t The target of the event.
     */
    /**
     * @event error
     * Fires when an object/image/frame cannot be loaded properly.
     * @param {Ext.EventObject} e The {@link Ext.EventObject} encapsulating the DOM event.
     * @param {HTMLElement} t The target of the event.
     */
    /**
     * @event resize
     * Fires when a document view is resized.
     * @param {Ext.EventObject} e The {@link Ext.EventObject} encapsulating the DOM event.
     * @param {HTMLElement} t The target of the event.
     */
    /**
     * @event scroll
     * Fires when a document view is scrolled.
     * @param {Ext.EventObject} e The {@link Ext.EventObject} encapsulating the DOM event.
     * @param {HTMLElement} t The target of the event.
     */

    //  Form events
    /**
     * @event select
     * Fires when a user selects some text in a text field, including input and textarea.
     * @param {Ext.EventObject} e The {@link Ext.EventObject} encapsulating the DOM event.
     * @param {HTMLElement} t The target of the event.
     */
    /**
     * @event change
     * Fires when a control loses the input focus and its value has been modified since gaining focus.
     * @param {Ext.EventObject} e The {@link Ext.EventObject} encapsulating the DOM event.
     * @param {HTMLElement} t The target of the event.
     */
    /**
     * @event submit
     * Fires when a form is submitted.
     * @param {Ext.EventObject} e The {@link Ext.EventObject} encapsulating the DOM event.
     * @param {HTMLElement} t The target of the event.
     */
    /**
     * @event reset
     * Fires when a form is reset.
     * @param {Ext.EventObject} e The {@link Ext.EventObject} encapsulating the DOM event.
     * @param {HTMLElement} t The target of the event.
     */
    /**
     * @event focus
     * Fires when an element receives focus either via the pointing device or by tab navigation.
     * @param {Ext.EventObject} e The {@link Ext.EventObject} encapsulating the DOM event.
     * @param {HTMLElement} t The target of the event.
     */
    /**
     * @event blur
     * Fires when an element loses focus either via the pointing device or by tabbing navigation.
     * @param {Ext.EventObject} e The {@link Ext.EventObject} encapsulating the DOM event.
     * @param {HTMLElement} t The target of the event.
     */

    //  User Interface events
    /**
     * @event DOMFocusIn
     * Where supported. Similar to HTML focus event, but can be applied to any focusable element.
     * @param {Ext.EventObject} e The {@link Ext.EventObject} encapsulating the DOM event.
     * @param {HTMLElement} t The target of the event.
     */
    /**
     * @event DOMFocusOut
     * Where supported. Similar to HTML blur event, but can be applied to any focusable element.
     * @param {Ext.EventObject} e The {@link Ext.EventObject} encapsulating the DOM event.
     * @param {HTMLElement} t The target of the event.
     */
    /**
     * @event DOMActivate
     * Where supported. Fires when an element is activated, for instance, through a mouse click or a keypress.
     * @param {Ext.EventObject} e The {@link Ext.EventObject} encapsulating the DOM event.
     * @param {HTMLElement} t The target of the event.
     */

    //  DOM Mutation events
    /**
     * @event DOMSubtreeModified
     * Where supported. Fires when the subtree is modified.
     * @param {Ext.EventObject} e The {@link Ext.EventObject} encapsulating the DOM event.
     * @param {HTMLElement} t The target of the event.
     */
    /**
     * @event DOMNodeInserted
     * Where supported. Fires when a node has been added as a child of another node.
     * @param {Ext.EventObject} e The {@link Ext.EventObject} encapsulating the DOM event.
     * @param {HTMLElement} t The target of the event.
     */
    /**
     * @event DOMNodeRemoved
     * Where supported. Fires when a descendant node of the element is removed.
     * @param {Ext.EventObject} e The {@link Ext.EventObject} encapsulating the DOM event.
     * @param {HTMLElement} t The target of the event.
     */
    /**
     * @event DOMNodeRemovedFromDocument
     * Where supported. Fires when a node is being removed from a document.
     * @param {Ext.EventObject} e The {@link Ext.EventObject} encapsulating the DOM event.
     * @param {HTMLElement} t The target of the event.
     */
    /**
     * @event DOMNodeInsertedIntoDocument
     * Where supported. Fires when a node is being inserted into a document.
     * @param {Ext.EventObject} e The {@link Ext.EventObject} encapsulating the DOM event.
     * @param {HTMLElement} t The target of the event.
     */
    /**
     * @event DOMAttrModified
     * Where supported. Fires when an attribute has been modified.
     * @param {Ext.EventObject} e The {@link Ext.EventObject} encapsulating the DOM event.
     * @param {HTMLElement} t The target of the event.
     */
    /**
     * @event DOMCharacterDataModified
     * Where supported. Fires when the character data has been modified.
     * @param {Ext.EventObject} e The {@link Ext.EventObject} encapsulating the DOM event.
     * @param {HTMLElement} t The target of the event.
     */

    /**
     * Appends an event handler to this element.
     *
     * @param {String} eventName The name of event to handle.
     *
     * @param {Function} fn The handler function the event invokes. This function is passed the following parameters:
     *
     * - **evt** : EventObject
     *
     *   The {@link Ext.EventObject EventObject} describing the event.
     *
     * - **el** : HtmlElement
     *
     *   The DOM element which was the target of the event. Note that this may be filtered by using the delegate option.
     *
     * - **o** : Object
     *
     *   The options object from the call that setup the listener.
     *
     * @param {Object} scope (optional) The scope (**this** reference) in which the handler function is executed. **If
     * omitted, defaults to this Element.**
     *
     * @param {Object} options (optional) An object containing handler configuration properties. This may contain any of
     * the following properties:
     *
     * - **scope** Object :
     *
     *   The scope (**this** reference) in which the handler function is executed. **If omitted, defaults to this
     *   Element.**
     *
     * - **delegate** String:
     *
     *   A simple selector to filter the target or look for a descendant of the target. See below for additional details.
     *
     * - **stopEvent** Boolean:
     *
     *   True to stop the event. That is stop propagation, and prevent the default action.
     *
     * - **preventDefault** Boolean:
     *
     *   True to prevent the default action
     *
     * - **stopPropagation** Boolean:
     *
     *   True to prevent event propagation
     *
     * - **normalized** Boolean:
     *
     *   False to pass a browser event to the handler function instead of an Ext.EventObject
     *
     * - **target** Ext.dom.Element:
     *
     *   Only call the handler if the event was fired on the target Element, _not_ if the event was bubbled up from a
     *   child node.
     *
     * - **delay** Number:
     *
     *   The number of milliseconds to delay the invocation of the handler after the event fires.
     *
     * - **single** Boolean:
     *
     *   True to add a handler to handle just the next firing of the event, and then remove itself.
     *
     * - **buffer** Number:
     *
     *   Causes the handler to be scheduled to run in an {@link Ext.util.DelayedTask} delayed by the specified number of
     *   milliseconds. If the event fires again within that time, the original handler is _not_ invoked, but the new
     *   handler is scheduled in its place.
     *
     * **Combining Options**
     *
     * Using the options argument, it is possible to combine different types of listeners:
     *
     * A delayed, one-time listener that auto stops the event and adds a custom argument (forumId) to the options
     * object. The options object is available as the third parameter in the handler function.
     *
     * Code:
     *
     *     el.on('click', this.onClick, this, {
     *         single: true,
     *         delay: 100,
     *         stopEvent : true,
     *         forumId: 4
     *     });
     *
     * **Attaching multiple handlers in 1 call**
     *
     * The method also allows for a single argument to be passed which is a config object containing properties which
     * specify multiple handlers.
     *
     * Code:
     *
     *     el.on({
     *         'click' : {
     *             fn: this.onClick,
     *             scope: this,
     *             delay: 100
     *         },
     *         'mouseover' : {
     *             fn: this.onMouseOver,
     *             scope: this
     *         },
     *         'mouseout' : {
     *             fn: this.onMouseOut,
     *             scope: this
     *         }
     *     });
     *
     * Or a shorthand syntax:
     *
     * Code:
     *
     *     el.on({
     *         'click' : this.onClick,
     *         'mouseover' : this.onMouseOver,
     *         'mouseout' : this.onMouseOut,
     *         scope: this
     *     });
     *
     * **delegate**
     *
     * This is a configuration option that you can pass along when registering a handler for an event to assist with
     * event delegation. Event delegation is a technique that is used to reduce memory consumption and prevent exposure
     * to memory-leaks. By registering an event for a container element as opposed to each element within a container.
     * By setting this configuration option to a simple selector, the target element will be filtered to look for a
     * descendant of the target. For example:
     *
     *     // using this markup:
     *     <div id='elId'>
     *         <p id='p1'>paragraph one</p>
     *         <p id='p2' class='clickable'>paragraph two</p>
     *         <p id='p3'>paragraph three</p>
     *     </div>
     *
     *     // utilize event delegation to registering just one handler on the container element:
     *     el = Ext.get('elId');
     *     el.on(
     *         'click',
     *         function(e,t) {
     *             // handle click
     *             console.info(t.id); // 'p2'
     *         },
     *         this,
     *         {
     *             // filter the target element to be a descendant with the class 'clickable'
     *             delegate: '.clickable'
     *         }
     *     );
     *
     * @return {Ext.dom.Element} this
     */
    on: function(eventName, fn, scope, options) {
        Ext.EventManager.on(this, eventName, fn, scope || this, options);
        return this;
    },

    /**
     * Removes an event handler from this element.
     *
     * **Note**: if a *scope* was explicitly specified when {@link #on adding} the listener,
     * the same scope must be specified here.
     *
     * Example:
     *
     *     el.un('click', this.handlerFn);
     *     // or
     *     el.removeListener('click', this.handlerFn);
     *
     * @param {String} eventName The name of the event from which to remove the handler.
     * @param {Function} fn The handler function to remove. **This must be a reference to the function passed into the
     * {@link #on} call.**
     * @param {Object} scope If a scope (**this** reference) was specified when the listener was added, then this must
     * refer to the same object.
     * @return {Ext.dom.Element} this
     */
    un: function(eventName, fn, scope) {
        Ext.EventManager.un(this, eventName, fn, scope || this);
        return this;
    },

    /**
     * Removes all previous added listeners from this element
     * @return {Ext.dom.Element} this
     */
    removeAllListeners: function() {
        Ext.EventManager.removeAll(this);
        return this;
    },

    /**
     * Recursively removes all previous added listeners from this element and its children
     * @return {Ext.dom.Element} this
     */
    purgeAllListeners: function() {
        Ext.EventManager.purgeElement(this);
        return this;
    }

}, function() {

    var EC              = Ext.cache,
        El              = this,
        AbstractElement = Ext.dom.AbstractElement,
        focusRe         = /a|button|embed|iframe|img|input|object|select|textarea/i,
        nonSpaceRe      = /\S/,
        scriptTagRe     = /(?:<script([^>]*)?>)((\n|\r|.)*?)(?:<\/script>)/ig,
        replaceScriptTagRe = /(?:<script.*?>)((\n|\r|.)*?)(?:<\/script>)/ig,
        srcRe           = /\ssrc=([\'\"])(.*?)\1/i,
        typeRe          = /\stype=([\'\"])(.*?)\1/i,
        useDocForId = !(Ext.isIE6 || Ext.isIE7 || Ext.isIE8);

    El.boxMarkup = '<div class="{0}-tl"><div class="{0}-tr"><div class="{0}-tc"></div></div></div><div class="{0}-ml"><div class="{0}-mr"><div class="{0}-mc"></div></div></div><div class="{0}-bl"><div class="{0}-br"><div class="{0}-bc"></div></div></div>';
    //</!if>

    // private
    // Garbage collection - uncache elements/purge listeners on orphaned elements
    // so we don't hold a reference and cause the browser to retain them
    function garbageCollect() {
        if (!Ext.enableGarbageCollector) {
            clearInterval(El.collectorThreadId);
        } else {
            var eid,
                d,
                o,
                t;

            for (eid in EC) {
                if (!EC.hasOwnProperty(eid)) {
                    continue;
                }

                o = EC[eid];

                // Skip document and window elements
                if (o.skipGarbageCollection) {
                    continue;
                }

                d = o.dom;

                // Should always have a DOM node
                if (!d) {
                    Ext.Error.raise('Missing DOM node in element garbage collection: ' + eid);
                }

                // Check that document and window elements haven't got through
                if (d && (d.getElementById || d.navigator)) {
                    Ext.Error.raise('Unexpected document or window element in element garbage collection');
                }

                // -------------------------------------------------------
                // Determining what is garbage:
                // -------------------------------------------------------
                // !d.parentNode
                // no parentNode == direct orphan, definitely garbage
                // -------------------------------------------------------
                // !d.offsetParent && !document.getElementById(eid)
                // display none elements have no offsetParent so we will
                // also try to look it up by it's id. However, check
                // offsetParent first so we don't do unneeded lookups.
                // This enables collection of elements that are not orphans
                // directly, but somewhere up the line they have an orphan
                // parent.
                // -------------------------------------------------------
                if (!d.parentNode || (!d.offsetParent && !Ext.getElementById(eid))) {
                    if (d && Ext.enableListenerCollection) {
                        Ext.EventManager.removeAll(d);
                    }
                    delete EC[eid];
                }
            }
            // Cleanup IE Object leaks
            if (Ext.isIE) {
                t = {};
                for (eid in EC) {
                    if (!EC.hasOwnProperty(eid)) {
                        continue;
                    }
                    t[eid] = EC[eid];
                }
                EC = Ext.cache = t;
            }
        }
    }

    El.collectorThreadId = setInterval(garbageCollect, 30000);

    //Stuff from Element-more.js
    El.addMethods({

        /**
         * Monitors this Element for the mouse leaving. Calls the function after the specified delay only if
         * the mouse was not moved back into the Element within the delay. If the mouse *was* moved
         * back in, the function is not called.
         * @param {Number} delay The delay **in milliseconds** to wait for possible mouse re-entry before calling the handler function.
         * @param {Function} handler The function to call if the mouse remains outside of this Element for the specified time.
         * @param {Object} [scope] The scope (`this` reference) in which the handler function executes. Defaults to this Element.
         * @return {Object} The listeners object which was added to this element so that monitoring can be stopped. Example usage:
         *
         *     // Hide the menu if the mouse moves out for 250ms or more
         *     this.mouseLeaveMonitor = this.menuEl.monitorMouseLeave(250, this.hideMenu, this);
         *
         *     ...
         *     // Remove mouseleave monitor on menu destroy
         *     this.menuEl.un(this.mouseLeaveMonitor);
         *
         */
        monitorMouseLeave: function(delay, handler, scope) {
            var me = this,
                timer,
                listeners = {
                    mouseleave: function(e) {
                        timer = setTimeout(Ext.Function.bind(handler, scope||me, [e]), delay);
                    },
                    mouseenter: function() {
                        clearTimeout(timer);
                    },
                    freezeEvent: true
                };

            me.on(listeners);
            return listeners;
        },

        /**
         * Stops the specified event(s) from bubbling and optionally prevents the default action
         * @param {String/String[]} eventName an event / array of events to stop from bubbling
         * @param {Boolean} [preventDefault] true to prevent the default action too
         * @return {Ext.dom.Element} this
         */
        swallowEvent : function(eventName, preventDefault) {
            var me = this,
                e, eLen;
            function fn(e) {
                e.stopPropagation();
                if (preventDefault) {
                    e.preventDefault();
                }
            }

            if (Ext.isArray(eventName)) {
                eLen = eventName.length;

                for (e = 0; e < eLen; e++) {
                    me.on(eventName[e], fn);
                }

                return me;
            }
            me.on(eventName, fn);
            return me;
        },

        /**
         * Create an event handler on this element such that when the event fires and is handled by this element,
         * it will be relayed to another object (i.e., fired again as if it originated from that object instead).
         * @param {String} eventName The type of event to relay
         * @param {Object} observable Any object that extends {@link Ext.util.Observable} that will provide the context
         * for firing the relayed event
         */
        relayEvent : function(eventName, observable) {
            this.on(eventName, function(e) {
                observable.fireEvent(eventName, e);
            });
        },

        /**
         * Removes Empty, or whitespace filled text nodes. Combines adjacent text nodes.
         * @param {Boolean} [forceReclean=false] By default the element keeps track if it has been cleaned already
         * so you can call this over and over. However, if you update the element and need to force a reclean, you
         * can pass true.
         */
        clean : function(forceReclean) {
            var me   = this,
                dom  = me.dom,
                data = (me.$cache || me.getCache()).data,
                n    = dom.firstChild,
                ni   = -1,
                nx;

            if (data.isCleaned && forceReclean !== true) {
                return me;
            }

            while (n) {
                nx = n.nextSibling;
                if (n.nodeType == 3) {
                    // Remove empty/whitespace text nodes
                    if (!(nonSpaceRe.test(n.nodeValue))) {
                        dom.removeChild(n);
                    // Combine adjacent text nodes
                    } else if (nx && nx.nodeType == 3) {
                        n.appendData(Ext.String.trim(nx.data));
                        dom.removeChild(nx);
                        nx = n.nextSibling;
                        n.nodeIndex = ++ni;
                    }
                } else {
                    // Recursively clean
                    Ext.fly(n).clean();
                    n.nodeIndex = ++ni;
                }
                n = nx;
            }

            data.isCleaned = true;
            return me;
        },

        /**
         * Direct access to the Ext.ElementLoader {@link Ext.ElementLoader#method-load} method. The method takes the same object
         * parameter as {@link Ext.ElementLoader#method-load}
         * @return {Ext.dom.Element} this
         */
        load : function(options) {
            this.getLoader().load(options);
            return this;
        },

        /**
         * Gets this element's {@link Ext.ElementLoader ElementLoader}
         * @return {Ext.ElementLoader} The loader
         */
        getLoader : function() {
            var me = this,
                data = (me.$cache || me.getCache()).data,
                loader = data.loader;

            if (!loader) {
                data.loader = loader = new Ext.ElementLoader({
                    target: me
                });
            }
            return loader;
        },

        /**
         * @private.
         * Currently used for updating grid cells without modifying DOM structure
         *
         * Synchronizes content of this Element with the content of the passed element.
         * 
         * Style and CSS class are copied from source into this Element, and contents are synched
         * recursively. If a child node is a text node, the textual data is copied.
         */
        syncContent: function(source) {
            source = Ext.getDom(source);
            var me = this,
                sourceNodes = source.childNodes,
                sourceLen = sourceNodes.length,
                dest = me.dom,
                destNodes = dest.childNodes,
                destLen = destNodes.length,
                i,  destNode, sourceNode,
                nodeType;

            // Copy top node's style and CSS class
            dest.style.cssText = source.style.cssText;
            dest.className = source.className;

            // If the number of child nodes does not match, fall back to replacing innerHTML
            if (sourceLen !== destLen) {
                source.innerHTML = dest.innerHTML;
                return;
            }

            // Loop through source nodes.
            // If there are fewer, we must remove excess
            for (i = 0; i < sourceLen; i++) {
                sourceNode = sourceNodes[i];
                destNode = destNodes[i];
                nodeType = sourceNode.nodeType;

                // If node structure is out of sync, just drop innerHTML in and return
                if (nodeType !== destNode.nodeType || (nodeType === 1 && sourceNode.tagName !== destNode.tagName)) {
                    dest.innerHTML = source.innerHTML;
                    return;
                }

                // Update text node
                if (nodeType === 3) {
                    destNode.data = sourceNode.data;
                }
                // Sync element content
                else {
                    if (sourceNode.id && destNode.id !== sourceNode.id) {
                        destNode.id = sourceNode.id;
                    }
                    destNode.style.cssText = sourceNode.style.cssText;
                    destNode.className = sourceNode.className;
                    Ext.fly(destNode).syncContent(sourceNode);
                }
            }
        },

        /**
         * Updates the innerHTML of this element, optionally searching for and processing scripts.
         * @param {String} html The new HTML
         * @param {Boolean} [loadScripts] True to look for and process scripts (defaults to false)
         * @param {Function} [callback] For async script loading you can be notified when the update completes
         * @return {Ext.dom.Element} this
         */
        update : function(html, loadScripts, callback) {
            var me = this,
                id,
                dom,
                interval;

            if (!me.dom) {
                return me;
            }
            html = html || '';
            dom = me.dom;

            if (loadScripts !== true) {
                dom.innerHTML = html;
                Ext.callback(callback, me);
                return me;
            }

            id  = Ext.id();
            html += '<span id="' + id + '"></span>';

            interval = setInterval(function() {
                var hd,
                    match,
                    attrs,
                    srcMatch,
                    typeMatch,
                    el,
                    s;
                if (!(el = DOC.getElementById(id))) {
                    return false;
                }
                clearInterval(interval);
                Ext.removeNode(el);
                hd = Ext.getHead().dom;

                while ((match = scriptTagRe.exec(html))) {
                    attrs = match[1];
                    srcMatch = attrs ? attrs.match(srcRe) : false;
                    if (srcMatch && srcMatch[2]) {
                       s = DOC.createElement("script");
                       s.src = srcMatch[2];
                       typeMatch = attrs.match(typeRe);
                       if (typeMatch && typeMatch[2]) {
                           s.type = typeMatch[2];
                       }
                       hd.appendChild(s);
                    } else if (match[2] && match[2].length > 0) {
                        if (window.execScript) {
                           window.execScript(match[2]);
                        } else {
                           window.eval(match[2]);
                        }
                    }
                }
                Ext.callback(callback, me);
            }, 20);
            dom.innerHTML = html.replace(replaceScriptTagRe, '');
            return me;
        },

        // inherit docs, overridden so we can add removeAnchor
        removeAllListeners : function() {
            this.removeAnchor();
            Ext.EventManager.removeAll(this.dom);
            return this;
        },

        /**
         * Creates a proxy element of this element
         * @param {String/Object} config The class name of the proxy element or a DomHelper config object
         * @param {String/HTMLElement} [renderTo] The element or element id to render the proxy to. Defaults to: document.body.
         * @param {Boolean} [matchBox=false] True to align and size the proxy to this element now.
         * @return {Ext.dom.Element} The new proxy element
         */
        createProxy : function(config, renderTo, matchBox) {
            config = (typeof config == 'object') ? config : {tag : "div", cls: config};

            var me = this,
                proxy = renderTo ? Ext.DomHelper.append(renderTo, config, true) :
                                   Ext.DomHelper.insertBefore(me.dom, config, true);

            proxy.setVisibilityMode(Element.DISPLAY);
            proxy.hide();
            if (matchBox && me.setBox && me.getBox) { // check to make sure Element.position.js is loaded
               proxy.setBox(me.getBox());
            }
            return proxy;
        },
        
        /**
         * Gets the parent node of the current element taking into account Ext.scopeResetCSS
         * @protected
         * @return {HTMLElement} The parent element
         */
        getScopeParent: function() {
            var parent = this.dom.parentNode;
            if (Ext.scopeResetCSS) {
                // If it's a normal reset, we will be wrapped in a single x-reset element, so grab the parent
                parent = parent.parentNode;
                if (!Ext.supports.CSS3LinearGradient || !Ext.supports.CSS3BorderRadius) {
                    // In the cases where we have nbr or nlg, it will be wrapped in a second element,
                    // so we need to go and get the parent again.
                    parent = parent.parentNode;
                }
            }
            return parent;
        },

        /**
         * Returns true if this element needs an explicit tabIndex to make it focusable. Input fields, text areas, buttons
         * anchors elements **with an href** etc do not need a tabIndex, but structural elements do.
         */
        needsTabIndex: function() {
            if (this.dom) {
                if ((this.dom.nodeName === 'a') && (!this.dom.href)) {
                    return true;
                }
                return !focusRe.test(this.dom.nodeName);
            }
        },

        /**
         * Checks whether this element can be focused.
         * @return {Boolean} True if the element is focusable
         */
        focusable: function () {
            var dom = this.dom,
                nodeName = dom.nodeName,
                canFocus = false;

            if (!dom.disabled) {
                if (focusRe.test(nodeName)) {
                    if ((nodeName !== 'a') || dom.href) {
                        canFocus = true;
                    }
                } else {
                    canFocus = !isNaN(dom.tabIndex);
                }
            }
            return canFocus && this.isVisible(true);
        }
    });

    if (Ext.isIE) {
        El.prototype.getById = function (id, asDom) {
            var dom = this.dom,
                cacheItem, el, ret;

            if (dom) {
                // for normal elements getElementById is the best solution, but if the el is
                // not part of the document.body, we need to use all[]
                el = (useDocForId && DOC.getElementById(id)) || dom.all[id];
                if (el) {
                    if (asDom) {
                        ret = el;
                    } else {
                        // calling El.get here is a real hit (2x slower) because it has to
                        // redetermine that we are giving it a dom el.
                        cacheItem = EC[id];
                        if (cacheItem && cacheItem.el) {
                            ret = Ext.updateCacheEntry(cacheItem, el).el;
                        } else {
                            ret = new Element(el);
                        }
                    }
                    return ret;
                }
            }

            return asDom ? Ext.getDom(id) : El.get(id);
        };
    }

    El.createAlias({
        /**
         * @method
         * @inheritdoc Ext.dom.Element#on
         * Shorthand for {@link #on}.
         */
        addListener: 'on',
        /**
         * @method
         * @inheritdoc Ext.dom.Element#un
         * Shorthand for {@link #un}.
         */
        removeListener: 'un',
        /**
         * @method
         * @inheritdoc Ext.dom.Element#removeAllListeners
         * Alias for {@link #removeAllListeners}.
         */
        clearListeners: 'removeAllListeners'
    });

    El.Fly = AbstractElement.Fly = new Ext.Class({
        extend: El,

        constructor: function(dom) {
            this.dom = dom;
        },
        
        attach: AbstractElement.Fly.prototype.attach
    });

    if (Ext.isIE) {
        Ext.getElementById = function (id) {
            var el = DOC.getElementById(id),
                detachedBodyEl;

            if (!el && (detachedBodyEl = AbstractElement.detachedBodyEl)) {
                el = detachedBodyEl.dom.all[id];
            }

            return el;
        };
    } else if (!DOC.querySelector) {
        Ext.getDetachedBody = Ext.getBody;

        Ext.getElementById = function (id) {
            return DOC.getElementById(id);
        };
    }
});

}());

/**
 * @class Ext.dom.Element
 */
Ext.dom.Element.override((function() {

    var doc = document,
        win = window,
        alignRe = /^([a-z]+)-([a-z]+)(\?)?$/,
        round = Math.round;

    return {

        /**
         * Gets the x,y coordinates specified by the anchor position on the element.
         * @param {String} [anchor='c'] The specified anchor position.  See {@link #alignTo}
         * for details on supported anchor positions.
         * @param {Boolean} [local] True to get the local (element top/left-relative) anchor position instead
         * of page coordinates
         * @param {Object} [size] An object containing the size to use for calculating anchor position
         * {width: (target width), height: (target height)} (defaults to the element's current size)
         * @return {Number[]} [x, y] An array containing the element's x and y coordinates
         */
        getAnchorXY: function(anchor, local, mySize) {
            //Passing a different size is useful for pre-calculating anchors,
            //especially for anchored animations that change the el size.
            anchor = (anchor || "tl").toLowerCase();
            mySize = mySize || {};

            var me = this,
                isViewport = me.dom == doc.body || me.dom == doc,
                myWidth = mySize.width || isViewport ? Ext.dom.Element.getViewWidth() : me.getWidth(),
                myHeight = mySize.height || isViewport ? Ext.dom.Element.getViewHeight() : me.getHeight(),
                xy,
                myPos = me.getXY(),
                scroll = me.getScroll(),
                extraX = isViewport ? scroll.left : !local ? myPos[0] : 0,
                extraY = isViewport ? scroll.top : !local ? myPos[1] : 0;

            // Calculate anchor position.
            // Test most common cases for picker alignment first.
            switch (anchor) {
                case 'tl' : xy = [ 0,                    0];
                            break;
                case 'bl' : xy = [ 0,                    myHeight];
                            break;
                case 'tr' : xy = [ myWidth,              0];
                            break;
                case 'c'  : xy = [ round(myWidth * 0.5), round(myHeight * 0.5)];
                            break;
                case 't'  : xy = [ round(myWidth * 0.5), 0];
                            break;
                case 'l'  : xy = [ 0,                    round(myHeight * 0.5)];
                            break;
                case 'r'  : xy = [ myWidth,              round(myHeight * 0.5)];
                            break;
                case 'b'  : xy = [ round(myWidth * 0.5), myHeight];
                            break;
                case 'br' : xy = [ myWidth,              myHeight];
            }
            return [xy[0] + extraX, xy[1] + extraY];
        },

        /**
         * Gets the x,y coordinates to align this element with another element. See {@link #alignTo} for more info on the
         * supported position values.
         * @param {String/HTMLElement/Ext.Element} element The element to align to.
         * @param {String} [position="tl-bl?"] The position to align to (defaults to )
         * @param {Number[]} [offsets] Offset the positioning by [x, y]
         * @return {Number[]} [x, y]
         */
        getAlignToXY : function(alignToEl, posSpec, offset) {
            alignToEl = Ext.get(alignToEl);

            if (!alignToEl || !alignToEl.dom) {
                Ext.Error.raise({
                    sourceClass: 'Ext.dom.Element',
                    sourceMethod: 'getAlignToXY',
                    msg: 'Attempted to align an element that doesn\'t exist'
                });
            }

            offset = offset || [0,0];
            posSpec = (!posSpec || posSpec == "?" ? "tl-bl?" : (!(/-/).test(posSpec) && posSpec !== "" ? "tl-" + posSpec : posSpec || "tl-bl")).toLowerCase();

            var me = this,
                    myPosition,
                    alignToElPosition,
                    x,
                    y,
                    myWidth,
                    myHeight,
                    alignToElRegion,
                    viewportWidth = Ext.dom.Element.getViewWidth() - 10, // 10px of margin for ie
                    viewportHeight = Ext.dom.Element.getViewHeight() - 10, // 10px of margin for ie
                    p1y,
                    p1x,
                    p2y,
                    p2x,
                    swapY,
                    swapX,
                    docElement = doc.documentElement,
                    docBody = doc.body,
                    scrollX = (docElement.scrollLeft || docBody.scrollLeft || 0),// + 5, WHY was 5 ever added?
                    scrollY = (docElement.scrollTop  || docBody.scrollTop  || 0),// + 5, It means align will fail if the alignTo el was at less than 5,5
                    constrain, //constrain to viewport
                    align1,
                    align2,
                    alignMatch = posSpec.match(alignRe);

            if (!alignMatch) {
                Ext.Error.raise({
                    sourceClass: 'Ext.dom.Element',
                    sourceMethod: 'getAlignToXY',
                    el: alignToEl,
                    position: posSpec,
                    offset: offset,
                    msg: 'Attemmpted to align an element with an invalid position: "' + posSpec + '"'
                });
            }

            align1 = alignMatch[1];
            align2 = alignMatch[2];
            constrain = !!alignMatch[3];

            //Subtract the aligned el's internal xy from the target's offset xy
            //plus custom offset to get this Element's new offset xy
            myPosition = me.getAnchorXY(align1, true);
            alignToElPosition = alignToEl.getAnchorXY(align2, false);

            x = alignToElPosition[0] - myPosition[0] + offset[0];
            y = alignToElPosition[1] - myPosition[1] + offset[1];

            // If position spec ended with a "?", then constrain to viewport is necessary
            if (constrain) {
                myWidth = me.getWidth();
                myHeight = me.getHeight();
                alignToElRegion = alignToEl.getRegion();
                //If we are at a viewport boundary and the aligned el is anchored on a target border that is
                //perpendicular to the vp border, allow the aligned el to slide on that border,
                //otherwise swap the aligned el to the opposite border of the target.
                p1y = align1.charAt(0);
                p1x = align1.charAt(align1.length - 1);
                p2y = align2.charAt(0);
                p2x = align2.charAt(align2.length - 1);
                swapY = ((p1y == "t" && p2y == "b") || (p1y == "b" && p2y == "t"));
                swapX = ((p1x == "r" && p2x == "l") || (p1x == "l" && p2x == "r"));

                if (x + myWidth > viewportWidth + scrollX) {
                    x = swapX ? alignToElRegion.left - myWidth : viewportWidth + scrollX - myWidth;
                }
                if (x < scrollX) {
                    x = swapX ? alignToElRegion.right : scrollX;
                }
                if (y + myHeight > viewportHeight + scrollY) {
                    y = swapY ? alignToElRegion.top - myHeight : viewportHeight + scrollY - myHeight;
                }
                if (y < scrollY) {
                    y = swapY ? alignToElRegion.bottom : scrollY;
                }
            }
            return [x,y];
        },


        /**
         * Anchors an element to another element and realigns it when the window is resized.
         * @param {String/HTMLElement/Ext.Element} element The element to align to.
         * @param {String} position The position to align to.
         * @param {Number[]} [offsets] Offset the positioning by [x, y]
         * @param {Boolean/Object} [animate] True for the default animation or a standard Element animation config object
         * @param {Boolean/Number} [monitorScroll] True to monitor body scroll and reposition. If this parameter
         * is a number, it is used as the buffer delay (defaults to 50ms).
         * @param {Function} [callback] The function to call after the animation finishes
         * @return {Ext.Element} this
         */
        anchorTo : function(el, alignment, offsets, animate, monitorScroll, callback) {
            var me = this,
                dom = me.dom,
                scroll = !Ext.isEmpty(monitorScroll),
                action = function() {
                    Ext.fly(dom).alignTo(el, alignment, offsets, animate);
                    Ext.callback(callback, Ext.fly(dom));
                },
                anchor = this.getAnchor();

            // previous listener anchor, remove it
            this.removeAnchor();
            Ext.apply(anchor, {
                fn: action,
                scroll: scroll
            });

            Ext.EventManager.onWindowResize(action, null);

            if (scroll) {
                Ext.EventManager.on(win, 'scroll', action, null,
                        {buffer: !isNaN(monitorScroll) ? monitorScroll : 50});
            }
            action.call(me); // align immediately
            return me;
        },

        /**
         * Remove any anchor to this element. See {@link #anchorTo}.
         * @return {Ext.dom.Element} this
         */
        removeAnchor : function() {
            var me = this,
                anchor = this.getAnchor();

            if (anchor && anchor.fn) {
                Ext.EventManager.removeResizeListener(anchor.fn);
                if (anchor.scroll) {
                    Ext.EventManager.un(win, 'scroll', anchor.fn);
                }
                delete anchor.fn;
            }
            return me;
        },

        getAlignVector: function(el, spec, offset) {
            var me = this,
                myPos = me.getXY(),
                alignedPos = me.getAlignToXY(el, spec, offset);

            el = Ext.get(el);
            if (!el || !el.dom) {
                Ext.Error.raise({
                    sourceClass: 'Ext.dom.Element',
                    sourceMethod: 'getAlignVector',
                    msg: 'Attempted to align an element that doesn\'t exist'
                });
            }

            alignedPos[0] -= myPos[0];
            alignedPos[1] -= myPos[1];
            return alignedPos;
        },

        /**
         * Aligns this element with another element relative to the specified anchor points. If the other element is the
         * document it aligns it to the viewport. The position parameter is optional, and can be specified in any one of
         * the following formats:
         *
         * - **Blank**: Defaults to aligning the element's top-left corner to the target's bottom-left corner ("tl-bl").
         * - **One anchor (deprecated)**: The passed anchor position is used as the target element's anchor point.
         *   The element being aligned will position its top-left corner (tl) to that point. *This method has been
         *   deprecated in favor of the newer two anchor syntax below*.
         * - **Two anchors**: If two values from the table below are passed separated by a dash, the first value is used as the
         *   element's anchor point, and the second value is used as the target's anchor point.
         *
         * In addition to the anchor points, the position parameter also supports the "?" character.  If "?" is passed at the end of
         * the position string, the element will attempt to align as specified, but the position will be adjusted to constrain to
         * the viewport if necessary.  Note that the element being aligned might be swapped to align to a different position than
         * that specified in order to enforce the viewport constraints.
         * Following are all of the supported anchor positions:
         *
         * <pre>
         * Value  Description
         * -----  -----------------------------
         * tl     The top left corner (default)
         * t      The center of the top edge
         * tr     The top right corner
         * l      The center of the left edge
         * c      In the center of the element
         * r      The center of the right edge
         * bl     The bottom left corner
         * b      The center of the bottom edge
         * br     The bottom right corner
         * </pre>
         *
         * Example Usage:
         *
         *     // align el to other-el using the default positioning ("tl-bl", non-constrained)
         *     el.alignTo("other-el");
         *
         *     // align the top left corner of el with the top right corner of other-el (constrained to viewport)
         *     el.alignTo("other-el", "tr?");
         *
         *     // align the bottom right corner of el with the center left edge of other-el
         *     el.alignTo("other-el", "br-l?");
         *
         *     // align the center of el with the bottom left corner of other-el and
         *     // adjust the x position by -6 pixels (and the y position by 0)
         *     el.alignTo("other-el", "c-bl", [-6, 0]);
         *
         * @param {String/HTMLElement/Ext.Element} element The element to align to.
         * @param {String} [position="tl-bl?"] The position to align to
         * @param {Number[]} [offsets] Offset the positioning by [x, y]
         * @param {Boolean/Object} [animate] true for the default animation or a standard Element animation config object
         * @return {Ext.Element} this
         */
        alignTo: function(element, position, offsets, animate) {
            var me = this;
            return me.setXY(me.getAlignToXY(element, position, offsets),
                    me.anim && !!animate ? me.anim(animate) : false);
        },

        /**
         * Returns the `[X, Y]` vector by which this element must be translated to make a best attempt
         * to constrain within the passed constraint. Returns `false` is this element does not need to be moved.
         *
         * Priority is given to constraining the top and left within the constraint.
         *
         * The constraint may either be an existing element into which this element is to be constrained, or
         * an {@link Ext.util.Region Region} into which this element is to be constrained.
         *
         * @param {Ext.Element/Ext.util.Region} constrainTo The Element or Region into which this element is to be constrained.
         * @param {Number[]} proposedPosition A proposed `[X, Y]` position to test for validity and to produce a vector for instead
         * of using this Element's current position;
         * @returns {Number[]/Boolean} **If** this element *needs* to be translated, an `[X, Y]`
         * vector by which this element must be translated. Otherwise, `false`.
         */
        getConstrainVector: function(constrainTo, proposedPosition) {
            if (!(constrainTo instanceof Ext.util.Region)) {
                constrainTo = Ext.get(constrainTo).getViewRegion();
            }
            var thisRegion = this.getRegion(),
                    vector = [0, 0],
                    shadowSize = (this.shadow && !this.shadowDisabled) ? this.shadow.getShadowSize() : undefined,
                    overflowed = false;

            // Shift this region to occupy the proposed position
            if (proposedPosition) {
                thisRegion.translateBy(proposedPosition[0] - thisRegion.x, proposedPosition[1] - thisRegion.y);
            }

            // Reduce the constrain region to allow for shadow
            if (shadowSize) {
                constrainTo.adjust(shadowSize[0], -shadowSize[1], -shadowSize[2], shadowSize[3]);
            }

            // Constrain the X coordinate by however much this Element overflows
            if (thisRegion.right > constrainTo.right) {
                overflowed = true;
                vector[0] = (constrainTo.right - thisRegion.right);    // overflowed the right
            }
            if (thisRegion.left + vector[0] < constrainTo.left) {
                overflowed = true;
                vector[0] = (constrainTo.left - thisRegion.left);      // overflowed the left
            }

            // Constrain the Y coordinate by however much this Element overflows
            if (thisRegion.bottom > constrainTo.bottom) {
                overflowed = true;
                vector[1] = (constrainTo.bottom - thisRegion.bottom);  // overflowed the bottom
            }
            if (thisRegion.top + vector[1] < constrainTo.top) {
                overflowed = true;
                vector[1] = (constrainTo.top - thisRegion.top);        // overflowed the top
            }
            return overflowed ? vector : false;
        },

        /**
        * Calculates the x, y to center this element on the screen
        * @return {Number[]} The x, y values [x, y]
        */
        getCenterXY : function(){
            return this.getAlignToXY(doc, 'c-c');
        },

        /**
        * Centers the Element in either the viewport, or another Element.
        * @param {String/HTMLElement/Ext.Element} [centerIn] The element in which to center the element.
        */
        center : function(centerIn){
            return this.alignTo(centerIn || doc, 'c-c');
        }
    };
}()));
/**
 * @class Ext.dom.Element
 */
/* ================================
 * A Note About Wrapped Animations
 * ================================
 * A few of the effects below implement two different animations per effect, one wrapping
 * animation that performs the visual effect and a "no-op" animation on this Element where
 * no attributes of the element itself actually change. The purpose for this is that the
 * wrapper is required for the effect to work and so it does the actual animation work, but
 * we always animate `this` so that the element's events and callbacks work as expected to
 * the callers of this API.
 * 
 * Because of this, we always want each wrap animation to complete first (we don't want to
 * cut off the visual effect early). To ensure that, we arbitrarily increase the duration of
 * the element's no-op animation, also ensuring that it has a decent minimum value -- on slow
 * systems, too-low durations can cause race conditions between the wrap animation and the
 * element animation being removed out of order. Note that in each wrap's `afteranimate`
 * callback it will explicitly terminate the element animation as soon as the wrap is complete,
 * so there's no real danger in making the duration too long.
 * 
 * This applies to all effects that get wrapped, including slideIn, slideOut, switchOff and frame.
 */

Ext.dom.Element.override({
    /**
     * Performs custom animation on this Element.
     *
     * The following properties may be specified in `from`, `to`, and `keyframe` objects:
     *
     *   - `x` - The page X position in pixels.
     *
     *   - `y` - The page Y position in pixels
     *
     *   - `left` - The element's CSS `left` value. Units must be supplied.
     *
     *   - `top` - The element's CSS `top` value. Units must be supplied.
     *
     *   - `width` - The element's CSS `width` value. Units must be supplied.
     *
     *   - `height` - The element's CSS `height` value. Units must be supplied.
     *
     *   - `scrollLeft` - The element's `scrollLeft` value.
     *
     *   - `scrollTop` - The element's `scrollTop` value.
     *
     *   - `opacity` - The element's `opacity` value. This must be a value between `0` and `1`.
     *
     * **Be aware** that animating an Element which is being used by an Ext Component without in some way informing the
     * Component about the changed element state will result in incorrect Component behaviour. This is because the
     * Component will be using the old state of the element. To avoid this problem, it is now possible to directly
     * animate certain properties of Components.
     *
     * @param {Object} config  Configuration for {@link Ext.fx.Anim}.
     * Note that the {@link Ext.fx.Anim#to to} config is required.
     * @return {Ext.dom.Element} this
     */
    animate: function(config) {
        var me = this,
            listeners,
            anim,
            animId = me.dom.id || Ext.id(me.dom);

        if (!Ext.fx.Manager.hasFxBlock(animId)) {
            // Bit of gymnastics here to ensure our internal listeners get bound first
            if (config.listeners) {
                listeners = config.listeners;
                delete config.listeners;
            }
            if (config.internalListeners) {
                config.listeners = config.internalListeners;
                delete config.internalListeners;
            }
            anim = new Ext.fx.Anim(me.anim(config));
            if (listeners) {
                anim.on(listeners);
            }
            Ext.fx.Manager.queueFx(anim);
        }
        return me;
    },

    // @private - process the passed fx configuration.
    anim: function(config) {
        if (!Ext.isObject(config)) {
            return (config) ? {} : false;
        }

        var me = this,
            duration = config.duration || Ext.fx.Anim.prototype.duration,
            easing = config.easing || 'ease',
            animConfig;

        if (config.stopAnimation) {
            me.stopAnimation();
        }

        Ext.applyIf(config, Ext.fx.Manager.getFxDefaults(me.id));

        // Clear any 'paused' defaults.
        Ext.fx.Manager.setFxDefaults(me.id, {
            delay: 0
        });

        animConfig = {
            // Pass the DOM reference. That's tested first so will be converted to an Ext.fx.Target fastest.
            target: me.dom,
            remove: config.remove,
            alternate: config.alternate || false,
            duration: duration,
            easing: easing,
            callback: config.callback,
            listeners: config.listeners,
            iterations: config.iterations || 1,
            scope: config.scope,
            block: config.block,
            concurrent: config.concurrent,
            delay: config.delay || 0,
            paused: true,
            keyframes: config.keyframes,
            from: config.from || {},
            to: Ext.apply({}, config)
        };
        Ext.apply(animConfig.to, config.to);

        // Anim API properties - backward compat
        delete animConfig.to.to;
        delete animConfig.to.from;
        delete animConfig.to.remove;
        delete animConfig.to.alternate;
        delete animConfig.to.keyframes;
        delete animConfig.to.iterations;
        delete animConfig.to.listeners;
        delete animConfig.to.target;
        delete animConfig.to.paused;
        delete animConfig.to.callback;
        delete animConfig.to.scope;
        delete animConfig.to.duration;
        delete animConfig.to.easing;
        delete animConfig.to.concurrent;
        delete animConfig.to.block;
        delete animConfig.to.stopAnimation;
        delete animConfig.to.delay;
        return animConfig;
    },

    /**
     * Slides the element into view. An anchor point can be optionally passed to set the point of origin for the slide
     * effect. This function automatically handles wrapping the element with a fixed-size container if needed. See the
     * Fx class overview for valid anchor point options. Usage:
     *
     *     // default: slide the element in from the top
     *     el.slideIn();
     *
     *     // custom: slide the element in from the right with a 2-second duration
     *     el.slideIn('r', { duration: 2000 });
     *
     *     // common config options shown with default values
     *     el.slideIn('t', {
     *         easing: 'easeOut',
     *         duration: 500
     *     });
     *
     * @param {String} anchor (optional) One of the valid Fx anchor positions (defaults to top: 't')
     * @param {Object} options (optional) Object literal with any of the Fx config options
     * @param {Boolean} options.preserveScroll Set to true if preservation of any descendant elements'
     * `scrollTop` values is required. By default the DOM wrapping operation performed by `slideIn` and
     * `slideOut` causes the browser to lose all scroll positions.
     * @return {Ext.dom.Element} The Element
     */
    slideIn: function(anchor, obj, slideOut) {
        var me = this,
            elStyle = me.dom.style,
            beforeAnim,
            wrapAnim,
            restoreScroll,
            wrapDomParentNode;

        anchor = anchor || "t";
        obj = obj || {};

        beforeAnim = function() {
            var animScope = this,
                listeners = obj.listeners,
                box, originalStyles, anim, wrap;

            if (!slideOut) {
                me.fixDisplay();
            }

            box = me.getBox();
            if ((anchor == 't' || anchor == 'b') && box.height === 0) {
                box.height = me.dom.scrollHeight;
            }
            else if ((anchor == 'l' || anchor == 'r') && box.width === 0) {
                box.width = me.dom.scrollWidth;
            }

            originalStyles = me.getStyles('width', 'height', 'left', 'right', 'top', 'bottom', 'position', 'z-index', true);
            me.setSize(box.width, box.height);

            // Cache all descendants' scrollTop & scrollLeft values if configured to preserve scroll.
            if (obj.preserveScroll) {
                restoreScroll = me.cacheScrollValues();
            }

            wrap = me.wrap({
                id: Ext.id() + '-anim-wrap-for-' + me.id,
                style: {
                    visibility: slideOut ? 'visible' : 'hidden'
                }
            });
            wrapDomParentNode = wrap.dom.parentNode;
            wrap.setPositioning(me.getPositioning());
            if (wrap.isStyle('position', 'static')) {
                wrap.position('relative');
            }
            me.clearPositioning('auto');
            wrap.clip();

            // The wrap will have reset all descendant scrollTops. Restore them if we cached them.
            if (restoreScroll) {
                restoreScroll();
            }

            // This element is temporarily positioned absolute within its wrapper.
            // Restore to its default, CSS-inherited visibility setting.
            // We cannot explicitly poke visibility:visible into its style because that overrides the visibility of the wrap.
            me.setStyle({
                visibility: '',
                position: 'absolute'
            });
            if (slideOut) {
                wrap.setSize(box.width, box.height);
            }

            switch (anchor) {
                case 't':
                    anim = {
                        from: {
                            width: box.width + 'px',
                            height: '0px'
                        },
                        to: {
                            width: box.width + 'px',
                            height: box.height + 'px'
                        }
                    };
                    elStyle.bottom = '0px';
                    break;
                case 'l':
                    anim = {
                        from: {
                            width: '0px',
                            height: box.height + 'px'
                        },
                        to: {
                            width: box.width + 'px',
                            height: box.height + 'px'
                        }
                    };
                    elStyle.right = '0px';
                    break;
                case 'r':
                    anim = {
                        from: {
                            x: box.x + box.width,
                            width: '0px',
                            height: box.height + 'px'
                        },
                        to: {
                            x: box.x,
                            width: box.width + 'px',
                            height: box.height + 'px'
                        }
                    };
                    break;
                case 'b':
                    anim = {
                        from: {
                            y: box.y + box.height,
                            width: box.width + 'px',
                            height: '0px'
                        },
                        to: {
                            y: box.y,
                            width: box.width + 'px',
                            height: box.height + 'px'
                        }
                    };
                    break;
                case 'tl':
                    anim = {
                        from: {
                            x: box.x,
                            y: box.y,
                            width: '0px',
                            height: '0px'
                        },
                        to: {
                            width: box.width + 'px',
                            height: box.height + 'px'
                        }
                    };
                    elStyle.bottom = '0px';
                    elStyle.right = '0px';
                    break;
                case 'bl':
                    anim = {
                        from: {
                            y: box.y + box.height,
                            width: '0px',
                            height: '0px'
                        },
                        to: {
                            y: box.y,
                            width: box.width + 'px',
                            height: box.height + 'px'
                        }
                    };
                    elStyle.bottom = '0px';
                    break;
                case 'br':
                    anim = {
                        from: {
                            x: box.x + box.width,
                            y: box.y + box.height,
                            width: '0px',
                            height: '0px'
                        },
                        to: {
                            x: box.x,
                            y: box.y,
                            width: box.width + 'px',
                            height: box.height + 'px'
                        }
                    };
                    break;
                case 'tr':
                    anim = {
                        from: {
                            x: box.x + box.width,
                            width: '0px',
                            height: '0px'
                        },
                        to: {
                            x: box.x,
                            width: box.width + 'px',
                            height: box.height + 'px'
                        }
                    };
                    elStyle.right = '0px';
                    break;
            }

            wrap.show();
            wrapAnim = Ext.apply({}, obj);
            delete wrapAnim.listeners;
            wrapAnim = new Ext.fx.Anim(Ext.applyIf(wrapAnim, {
                target: wrap,
                duration: 500,
                easing: 'ease-out',
                from: slideOut ? anim.to : anim.from,
                to: slideOut ? anim.from : anim.to
            }));

            // In the absence of a callback, this listener MUST be added first
            wrapAnim.on('afteranimate', function() {
                me.setStyle(originalStyles);
                if (slideOut) {
                    if (obj.useDisplay) {
                        me.setDisplayed(false);
                    } else {
                        me.hide();
                    }
                }
                if (wrap.dom) {
                    if (wrap.dom.parentNode) {
                        wrap.dom.parentNode.insertBefore(me.dom, wrap.dom);
                    } else {
                        wrapDomParentNode.appendChild(me.dom);
                    }
                    wrap.remove();
                }
                // The unwrap will have reset all descendant scrollTops. Restore them if we cached them.
                if (restoreScroll) {
                    restoreScroll();
                }
                // kill the no-op element animation created below
                animScope.end();
            });
            // Add configured listeners after
            if (listeners) {
                wrapAnim.on(listeners);
            }
        };

        me.animate({
            // See "A Note About Wrapped Animations" at the top of this class:
            duration: obj.duration ? Math.max(obj.duration, 500) * 2 : 1000,
            listeners: {
                beforeanimate: beforeAnim // kick off the wrap animation
            }
        });
        return me;
    },


    /**
     * Slides the element out of view. An anchor point can be optionally passed to set the end point for the slide
     * effect. When the effect is completed, the element will be hidden (visibility = 'hidden') but block elements will
     * still take up space in the document. The element must be removed from the DOM using the 'remove' config option if
     * desired. This function automatically handles wrapping the element with a fixed-size container if needed. See the
     * Fx class overview for valid anchor point options. Usage:
     *
     *     // default: slide the element out to the top
     *     el.slideOut();
     *
     *     // custom: slide the element out to the right with a 2-second duration
     *     el.slideOut('r', { duration: 2000 });
     *
     *     // common config options shown with default values
     *     el.slideOut('t', {
     *         easing: 'easeOut',
     *         duration: 500,
     *         remove: false,
     *         useDisplay: false
     *     });
     *
     * @param {String} anchor (optional) One of the valid Fx anchor positions (defaults to top: 't')
     * @param {Object} options (optional) Object literal with any of the Fx config options
     * @return {Ext.dom.Element} The Element
     */
    slideOut: function(anchor, o) {
        return this.slideIn(anchor, o, true);
    },

    /**
     * Fades the element out while slowly expanding it in all directions. When the effect is completed, the element will
     * be hidden (visibility = 'hidden') but block elements will still take up space in the document. Usage:
     *
     *     // default
     *     el.puff();
     *
     *     // common config options shown with default values
     *     el.puff({
     *         easing: 'easeOut',
     *         duration: 500,
     *         useDisplay: false
     *     });
     *
     * @param {Object} options (optional) Object literal with any of the Fx config options
     * @return {Ext.dom.Element} The Element
     */
    puff: function(obj) {
        var me = this,
            beforeAnim,
            box = me.getBox(),
            originalStyles = me.getStyles('width', 'height', 'left', 'right', 'top', 'bottom', 'position', 'z-index', 'font-size', 'opacity', true);

       obj = Ext.applyIf(obj || {}, {
            easing: 'ease-out',
            duration: 500,
            useDisplay: false
        });

        beforeAnim = function() {
            me.clearOpacity();
            me.show();
            this.to = {
                width: box.width * 2,
                height: box.height * 2,
                x: box.x - (box.width / 2),
                y: box.y - (box.height /2),
                opacity: 0,
                fontSize: '200%'
            };
            this.on('afteranimate',function() {
                if (me.dom) {
                    if (obj.useDisplay) {
                        me.setDisplayed(false);
                    } else {
                        me.hide();
                    }
                    me.setStyle(originalStyles);
                    obj.callback.call(obj.scope);
                }
            });
        };

        me.animate({
            duration: obj.duration,
            easing: obj.easing,
            listeners: {
                beforeanimate: {
                    fn: beforeAnim
                }
            }
        });
        return me;
    },

    /**
     * Blinks the element as if it was clicked and then collapses on its center (similar to switching off a television).
     * When the effect is completed, the element will be hidden (visibility = 'hidden') but block elements will still
     * take up space in the document. The element must be removed from the DOM using the 'remove' config option if
     * desired. Usage:
     *
     *     // default
     *     el.switchOff();
     *
     *     // all config options shown with default values
     *     el.switchOff({
     *         easing: 'easeIn',
     *         duration: .3,
     *         remove: false,
     *         useDisplay: false
     *     });
     *
     * @param {Object} options (optional) Object literal with any of the Fx config options
     * @return {Ext.dom.Element} The Element
     */
    switchOff: function(obj) {
        var me = this,
            beforeAnim;

        obj = Ext.applyIf(obj || {}, {
            easing: 'ease-in',
            duration: 500,
            remove: false,
            useDisplay: false
        });

        beforeAnim = function() {
            var animScope = this,
                size = me.getSize(),
                xy = me.getXY(),
                keyframe, position;
            me.clearOpacity();
            me.clip();
            position = me.getPositioning();

            keyframe = new Ext.fx.Animator({
                target: me,
                duration: obj.duration,
                easing: obj.easing,
                keyframes: {
                    33: {
                        opacity: 0.3
                    },
                    66: {
                        height: 1,
                        y: xy[1] + size.height / 2
                    },
                    100: {
                        width: 1,
                        x: xy[0] + size.width / 2
                    }
                }
            });
            keyframe.on('afteranimate', function() {
                if (obj.useDisplay) {
                    me.setDisplayed(false);
                } else {
                    me.hide();
                }
                me.clearOpacity();
                me.setPositioning(position);
                me.setSize(size);
                // kill the no-op element animation created below
                animScope.end();
            });
        };
        
        me.animate({
            // See "A Note About Wrapped Animations" at the top of this class:
            duration: (Math.max(obj.duration, 500) * 2),
            listeners: {
                beforeanimate: {
                    fn: beforeAnim
                }
            }
        });
        return me;
    },

    /**
     * Shows a ripple of exploding, attenuating borders to draw attention to an Element. Usage:
     *
     *     // default: a single light blue ripple
     *     el.frame();
     *
     *     // custom: 3 red ripples lasting 3 seconds total
     *     el.frame("#ff0000", 3, { duration: 3000 });
     *
     *     // common config options shown with default values
     *     el.frame("#C3DAF9", 1, {
     *         duration: 1000 // duration of each individual ripple.
     *         // Note: Easing is not configurable and will be ignored if included
     *     });
     *
     * @param {String} [color='#C3DAF9'] The hex color value for the border.
     * @param {Number} [count=1] The number of ripples to display.
     * @param {Object} [options] Object literal with any of the Fx config options
     * @return {Ext.dom.Element} The Element
     */
    frame : function(color, count, obj){
        var me = this,
            beforeAnim;

        color = color || '#C3DAF9';
        count = count || 1;
        obj = obj || {};

        beforeAnim = function() {
            me.show();
            var animScope = this,
                box = me.getBox(),
                proxy = Ext.getBody().createChild({
                    id: me.id + '-anim-proxy',
                    style: {
                        position : 'absolute',
                        'pointer-events': 'none',
                        'z-index': 35000,
                        border : '0px solid ' + color
                    }
                }),
                proxyAnim;
            proxyAnim = new Ext.fx.Anim({
                target: proxy,
                duration: obj.duration || 1000,
                iterations: count,
                from: {
                    top: box.y,
                    left: box.x,
                    borderWidth: 0,
                    opacity: 1,
                    height: box.height,
                    width: box.width
                },
                to: {
                    top: box.y - 20,
                    left: box.x - 20,
                    borderWidth: 10,
                    opacity: 0,
                    height: box.height + 40,
                    width: box.width + 40
                }
            });
            proxyAnim.on('afteranimate', function() {
                proxy.remove();
                // kill the no-op element animation created below
                animScope.end();
            });
        };

        me.animate({
            // See "A Note About Wrapped Animations" at the top of this class:
            duration: (Math.max(obj.duration, 500) * 2) || 2000,
            listeners: {
                beforeanimate: {
                    fn: beforeAnim
                }
            }
        });
        return me;
    },

    /**
     * Slides the element while fading it out of view. An anchor point can be optionally passed to set the ending point
     * of the effect. Usage:
     *
     *     // default: slide the element downward while fading out
     *     el.ghost();
     *
     *     // custom: slide the element out to the right with a 2-second duration
     *     el.ghost('r', { duration: 2000 });
     *
     *     // common config options shown with default values
     *     el.ghost('b', {
     *         easing: 'easeOut',
     *         duration: 500
     *     });
     *
     * @param {String} anchor (optional) One of the valid Fx anchor positions (defaults to bottom: 'b')
     * @param {Object} options (optional) Object literal with any of the Fx config options
     * @return {Ext.dom.Element} The Element
     */
    ghost: function(anchor, obj) {
        var me = this,
            beforeAnim;

        anchor = anchor || "b";
        beforeAnim = function() {
            var width = me.getWidth(),
                height = me.getHeight(),
                xy = me.getXY(),
                position = me.getPositioning(),
                to = {
                    opacity: 0
                };
            switch (anchor) {
                case 't':
                    to.y = xy[1] - height;
                    break;
                case 'l':
                    to.x = xy[0] - width;
                    break;
                case 'r':
                    to.x = xy[0] + width;
                    break;
                case 'b':
                    to.y = xy[1] + height;
                    break;
                case 'tl':
                    to.x = xy[0] - width;
                    to.y = xy[1] - height;
                    break;
                case 'bl':
                    to.x = xy[0] - width;
                    to.y = xy[1] + height;
                    break;
                case 'br':
                    to.x = xy[0] + width;
                    to.y = xy[1] + height;
                    break;
                case 'tr':
                    to.x = xy[0] + width;
                    to.y = xy[1] - height;
                    break;
            }
            this.to = to;
            this.on('afteranimate', function () {
                if (me.dom) {
                    me.hide();
                    me.clearOpacity();
                    me.setPositioning(position);
                }
            });
        };

        me.animate(Ext.applyIf(obj || {}, {
            duration: 500,
            easing: 'ease-out',
            listeners: {
                beforeanimate: {
                    fn: beforeAnim
                }
            }
        }));
        return me;
    },

    /**
     * Highlights the Element by setting a color (applies to the background-color by default, but can be changed using
     * the "attr" config option) and then fading back to the original color. If no original color is available, you
     * should provide the "endColor" config option which will be cleared after the animation. Usage:
     *
     *     // default: highlight background to yellow
     *     el.highlight();
     *
     *     // custom: highlight foreground text to blue for 2 seconds
     *     el.highlight("0000ff", { attr: 'color', duration: 2000 });
     *
     *     // common config options shown with default values
     *     el.highlight("ffff9c", {
     *         attr: "backgroundColor", //can be any valid CSS property (attribute) that supports a color value
     *         endColor: (current color) or "ffffff",
     *         easing: 'easeIn',
     *         duration: 1000
     *     });
     *
     * @param {String} color (optional) The highlight color. Should be a 6 char hex color without the leading #
     * (defaults to yellow: 'ffff9c')
     * @param {Object} options (optional) Object literal with any of the Fx config options
     * @return {Ext.dom.Element} The Element
     */
    highlight: function(color, o) {
        var me = this,
            dom = me.dom,
            from = {},
            restore, to, attr, lns, event, fn;

        o = o || {};
        lns = o.listeners || {};
        attr = o.attr || 'backgroundColor';
        from[attr] = color || 'ffff9c';

        if (!o.to) {
            to = {};
            to[attr] = o.endColor || me.getColor(attr, 'ffffff', '');
        }
        else {
            to = o.to;
        }

        // Don't apply directly on lns, since we reference it in our own callbacks below
        o.listeners = Ext.apply(Ext.apply({}, lns), {
            beforeanimate: function() {
                restore = dom.style[attr];
                me.clearOpacity();
                me.show();

                event = lns.beforeanimate;
                if (event) {
                    fn = event.fn || event;
                    return fn.apply(event.scope || lns.scope || window, arguments);
                }
            },
            afteranimate: function() {
                if (dom) {
                    dom.style[attr] = restore;
                }

                event = lns.afteranimate;
                if (event) {
                    fn = event.fn || event;
                    fn.apply(event.scope || lns.scope || window, arguments);
                }
            }
        });

        me.animate(Ext.apply({}, o, {
            duration: 1000,
            easing: 'ease-in',
            from: from,
            to: to
        }));
        return me;
    },

   /**
    * Creates a pause before any subsequent queued effects begin. If there are no effects queued after the pause it will
    * have no effect. Usage:
    *
    *     el.pause(1);
    *
    * @deprecated 4.0 Use the `delay` config to {@link #animate} instead.
    * @param {Number} seconds The length of time to pause (in seconds)
    * @return {Ext.Element} The Element
    */
    pause: function(ms) {
        var me = this;
        Ext.fx.Manager.setFxDefaults(me.id, {
            delay: ms
        });
        return me;
    },

    /**
     * Fade an element in (from transparent to opaque). The ending opacity can be specified using the `opacity`
     * config option. Usage:
     *
     *     // default: fade in from opacity 0 to 100%
     *     el.fadeIn();
     *
     *     // custom: fade in from opacity 0 to 75% over 2 seconds
     *     el.fadeIn({ opacity: .75, duration: 2000});
     *
     *     // common config options shown with default values
     *     el.fadeIn({
     *         opacity: 1, //can be any value between 0 and 1 (e.g. .5)
     *         easing: 'easeOut',
     *         duration: 500
     *     });
     *
     * @param {Object} options (optional) Object literal with any of the Fx config options
     * @return {Ext.Element} The Element
     */
    fadeIn: function(o) {
        var me = this;
        me.animate(Ext.apply({}, o, {
            opacity: 1,
            internalListeners: {
                beforeanimate: function(anim){
                    // restore any visibility/display that may have 
                    // been applied by a fadeout animation
                    if (me.isStyle('display', 'none')) {
                        me.setDisplayed('');
                    } else {
                        me.show();
                    } 
                }
            }
        }));
        return this;
    },

    /**
     * Fade an element out (from opaque to transparent). The ending opacity can be specified using the `opacity`
     * config option. Note that IE may require `useDisplay:true` in order to redisplay correctly.
     * Usage:
     *
     *     // default: fade out from the element's current opacity to 0
     *     el.fadeOut();
     *
     *     // custom: fade out from the element's current opacity to 25% over 2 seconds
     *     el.fadeOut({ opacity: .25, duration: 2000});
     *
     *     // common config options shown with default values
     *     el.fadeOut({
     *         opacity: 0, //can be any value between 0 and 1 (e.g. .5)
     *         easing: 'easeOut',
     *         duration: 500,
     *         remove: false,
     *         useDisplay: false
     *     });
     *
     * @param {Object} options (optional) Object literal with any of the Fx config options
     * @return {Ext.Element} The Element
     */
    fadeOut: function(o) {
        var me = this;
        o = Ext.apply({
            opacity: 0,
            internalListeners: {
                afteranimate: function(anim){
                    var dom = me.dom;
                    if (dom && anim.to.opacity === 0) {
                        if (o.useDisplay) {
                            me.setDisplayed(false);
                        } else {
                            me.hide();
                        }
                    }         
                }
            }
        }, o);
        me.animate(o);
        return me;
    },

    /**
     * Animates the transition of an element's dimensions from a starting height/width to an ending height/width. This
     * method is a convenience implementation of {@link #shift}. Usage:
     *
     *     // change height and width to 100x100 pixels
     *     el.scale(100, 100);
     *
     *     // common config options shown with default values.  The height and width will default to
     *     // the element's existing values if passed as null.
     *     el.scale(
     *         [element's width],
     *         [element's height], {
     *             easing: 'easeOut',
     *             duration: 350
     *         }
     *     );
     *
     * @deprecated 4.0 Just use {@link #animate} instead.
     * @param {Number} width The new width (pass undefined to keep the original width)
     * @param {Number} height The new height (pass undefined to keep the original height)
     * @param {Object} options (optional) Object literal with any of the Fx config options
     * @return {Ext.Element} The Element
     */
    scale: function(w, h, o) {
        this.animate(Ext.apply({}, o, {
            width: w,
            height: h
        }));
        return this;
    },

    /**
     * Animates the transition of any combination of an element's dimensions, xy position and/or opacity. Any of these
     * properties not specified in the config object will not be changed. This effect requires that at least one new
     * dimension, position or opacity setting must be passed in on the config object in order for the function to have
     * any effect. Usage:
     *
     *     // slide the element horizontally to x position 200 while changing the height and opacity
     *     el.shift({ x: 200, height: 50, opacity: .8 });
     *
     *     // common config options shown with default values.
     *     el.shift({
     *         width: [element's width],
     *         height: [element's height],
     *         x: [element's x position],
     *         y: [element's y position],
     *         opacity: [element's opacity],
     *         easing: 'easeOut',
     *         duration: 350
     *     });
     *
     * @deprecated 4.0 Just use {@link #animate} instead.
     * @param {Object} options Object literal with any of the Fx config options
     * @return {Ext.Element} The Element
     */
    shift: function(config) {
        this.animate(config);
        return this;
    }
});

/**
 * @class Ext.dom.Element
 */
Ext.dom.Element.override({
    /**
     * Initializes a {@link Ext.dd.DD} drag drop object for this element.
     * @param {String} group The group the DD object is member of
     * @param {Object} config The DD config object
     * @param {Object} overrides An object containing methods to override/implement on the DD object
     * @return {Ext.dd.DD} The DD object
     */
    initDD : function(group, config, overrides){
        var dd = new Ext.dd.DD(Ext.id(this.dom), group, config);
        return Ext.apply(dd, overrides);
    },

    /**
     * Initializes a {@link Ext.dd.DDProxy} object for this element.
     * @param {String} group The group the DDProxy object is member of
     * @param {Object} config The DDProxy config object
     * @param {Object} overrides An object containing methods to override/implement on the DDProxy object
     * @return {Ext.dd.DDProxy} The DDProxy object
     */
    initDDProxy : function(group, config, overrides){
        var dd = new Ext.dd.DDProxy(Ext.id(this.dom), group, config);
        return Ext.apply(dd, overrides);
    },

    /**
     * Initializes a {@link Ext.dd.DDTarget} object for this element.
     * @param {String} group The group the DDTarget object is member of
     * @param {Object} config The DDTarget config object
     * @param {Object} overrides An object containing methods to override/implement on the DDTarget object
     * @return {Ext.dd.DDTarget} The DDTarget object
     */
    initDDTarget : function(group, config, overrides){
        var dd = new Ext.dd.DDTarget(Ext.id(this.dom), group, config);
        return Ext.apply(dd, overrides);
    }
});

/**
 * @class Ext.dom.Element
 */
(function() {

var Element         = Ext.dom.Element,
    VISIBILITY      = "visibility",
    DISPLAY         = "display",
    NONE            = "none",
    HIDDEN          = 'hidden',
    VISIBLE         = 'visible',
    OFFSETS         = "offsets",
    ASCLASS         = "asclass",
    NOSIZE          = 'nosize',
    ORIGINALDISPLAY = 'originalDisplay',
    VISMODE         = 'visibilityMode',
    ISVISIBLE       = 'isVisible',
    OFFSETCLASS     = Ext.baseCSSPrefix + 'hide-offsets',
    getDisplay = function(el) {
        var data = (el.$cache || el.getCache()).data,
            display = data[ORIGINALDISPLAY];
            
        if (display === undefined) {
            data[ORIGINALDISPLAY] = display = '';
        }
        return display;
    },
    getVisMode = function(el){
        var data = (el.$cache || el.getCache()).data,
            visMode = data[VISMODE];
            
        if (visMode === undefined) {
            data[VISMODE] = visMode = Element.VISIBILITY;
        }
        return visMode;
    };

Element.override({
    /**
     * The element's default display mode.
     */
    originalDisplay : "",
    visibilityMode : 1,

    /**
     * Sets the visibility of the element (see details). If the visibilityMode is set to Element.DISPLAY, it will use
     * the display property to hide the element, otherwise it uses visibility. The default is to hide and show using the visibility property.
     * @param {Boolean} visible Whether the element is visible
     * @param {Boolean/Object} [animate] True for the default animation, or a standard Element animation config object
     * @return {Ext.dom.Element} this
     */
    setVisible : function(visible, animate) {
        var me = this,
            dom = me.dom,
            visMode = getVisMode(me);

        // hideMode string override
        if (typeof animate == 'string') {
            switch (animate) {
                case DISPLAY:
                    visMode = Element.DISPLAY;
                    break;
                case VISIBILITY:
                    visMode = Element.VISIBILITY;
                    break;
                case OFFSETS:
                    visMode = Element.OFFSETS;
                    break;
                case NOSIZE:
                case ASCLASS:
                    visMode = Element.ASCLASS;
                    break;
            }
            me.setVisibilityMode(visMode);
            animate = false;
        }

        if (!animate || !me.anim) {
            if (visMode == Element.DISPLAY) {
                return me.setDisplayed(visible);
            } else if (visMode == Element.OFFSETS) {
                me[visible?'removeCls':'addCls'](OFFSETCLASS);
            } else if (visMode == Element.VISIBILITY) {
                me.fixDisplay();
                // Show by clearing visibility style. Explicitly setting to "visible" overrides parent visibility setting
                dom.style.visibility = visible ? '' : HIDDEN;
            } else if (visMode == Element.ASCLASS) {
                me[visible?'removeCls':'addCls'](me.visibilityCls || Element.visibilityCls);
            }
        } else {
            // closure for composites
            if (visible) {
                me.setOpacity(0.01);
                me.setVisible(true);
            }
            if (!Ext.isObject(animate)) {
                animate = {
                    duration: 350,
                    easing: 'ease-in'
                };
            }
            me.animate(Ext.applyIf({
                callback: function() {
                    if (!visible) {
                        me.setVisible(false).setOpacity(1);
                    }
                },
                to: {
                    opacity: (visible) ? 1 : 0
                }
            }, animate));
        }
        (me.$cache || me.getCache()).data[ISVISIBLE] = visible;
        return me;
    },

    /**
     * @private
     * Determine if the Element has a relevant height and width available based
     * upon current logical visibility state
     */
    hasMetrics  : function(){
        var visMode = getVisMode(this);
        return this.isVisible() || (visMode == Element.OFFSETS) || (visMode == Element.VISIBILITY);
    },

    /**
     * Toggles the element's visibility or display, depending on visibility mode.
     * @param {Boolean/Object} [animate] True for the default animation, or a standard Element animation config object
     * @return {Ext.dom.Element} this
     */
    toggle : function(animate){
        var me = this;
        me.setVisible(!me.isVisible(), me.anim(animate));
        return me;
    },

    /**
     * Sets the CSS display property. Uses originalDisplay if the specified value is a boolean true.
     * @param {Boolean/String} value Boolean value to display the element using its default display, or a string to set the display directly.
     * @return {Ext.dom.Element} this
     */
    setDisplayed : function(value) {
        if(typeof value == "boolean"){
           value = value ? getDisplay(this) : NONE;
        }
        this.setStyle(DISPLAY, value);
        return this;
    },

    // private
    fixDisplay : function(){
        var me = this;
        if (me.isStyle(DISPLAY, NONE)) {
            me.setStyle(VISIBILITY, HIDDEN);
            me.setStyle(DISPLAY, getDisplay(me)); // first try reverting to default
            if (me.isStyle(DISPLAY, NONE)) { // if that fails, default to block
                me.setStyle(DISPLAY, "block");
            }
        }
    },

    /**
     * Hide this element - Uses display mode to determine whether to use "display" or "visibility". See {@link #setVisible}.
     * @param {Boolean/Object} [animate] true for the default animation or a standard Element animation config object
     * @return {Ext.dom.Element} this
     */
    hide : function(animate){
        // hideMode override
        if (typeof animate == 'string'){
            this.setVisible(false, animate);
            return this;
        }
        this.setVisible(false, this.anim(animate));
        return this;
    },

    /**
     * Show this element - Uses display mode to determine whether to use "display" or "visibility". See {@link #setVisible}.
     * @param {Boolean/Object} [animate] true for the default animation or a standard Element animation config object
     * @return {Ext.dom.Element} this
     */
    show : function(animate){
        // hideMode override
        if (typeof animate == 'string'){
            this.setVisible(true, animate);
            return this;
        }
        this.setVisible(true, this.anim(animate));
        return this;
    }
});

}());

/**
 * @class Ext.dom.Element
 */
(function() {

var Element = Ext.dom.Element,
    LEFT = "left",
    RIGHT = "right",
    TOP = "top",
    BOTTOM = "bottom",
    POSITION = "position",
    STATIC = "static",
    RELATIVE = "relative",
    AUTO = "auto",
    ZINDEX = "z-index",
    BODY = 'BODY',

    PADDING = 'padding',
    BORDER = 'border',
    SLEFT = '-left',
    SRIGHT = '-right',
    STOP = '-top',
    SBOTTOM = '-bottom',
    SWIDTH = '-width',
    // special markup used throughout Ext when box wrapping elements
    borders = {l: BORDER + SLEFT + SWIDTH, r: BORDER + SRIGHT + SWIDTH, t: BORDER + STOP + SWIDTH, b: BORDER + SBOTTOM + SWIDTH},
    paddings = {l: PADDING + SLEFT, r: PADDING + SRIGHT, t: PADDING + STOP, b: PADDING + SBOTTOM},
    paddingsTLRB = [paddings.l, paddings.r, paddings.t, paddings.b],
    bordersTLRB = [borders.l,  borders.r,  borders.t,  borders.b],
    positionTopLeft = ['position', 'top', 'left'];

Element.override({

    getX: function() {
        return Element.getX(this.dom);
    },

    getY: function() {
        return Element.getY(this.dom);
    },

    /**
      * Gets the current position of the element based on page coordinates.
      * Element must be part of the DOM tree to have page coordinates
      * (display:none or elements not appended return false).
      * @return {Number[]} The XY position of the element
      */
    getXY: function() {
        return Element.getXY(this.dom);
    },

    /**
      * Returns the offsets of this element from the passed element. Both element must be part
      * of the DOM tree and not have display:none to have page coordinates.
      * @param {String/HTMLElement/Ext.Element} element The element to get the offsets from.
      * @return {Number[]} The XY page offsets (e.g. `[100, -200]`)
      */
    getOffsetsTo : function(el){
        var o = this.getXY(),
                e = Ext.fly(el, '_internal').getXY();
        return [o[0] - e[0],o[1] - e[1]];
    },

    setX: function(x, animate) {
        return this.setXY([x, this.getY()], animate);
    },

    setY: function(y, animate) {
        return this.setXY([this.getX(), y], animate);
    },

    setLeft: function(left) {
        this.setStyle(LEFT, this.addUnits(left));
        return this;
    },

    setTop: function(top) {
        this.setStyle(TOP, this.addUnits(top));
        return this;
    },

    setRight: function(right) {
        this.setStyle(RIGHT, this.addUnits(right));
        return this;
    },

    setBottom: function(bottom) {
        this.setStyle(BOTTOM, this.addUnits(bottom));
        return this;
    },

    /**
     * Sets the position of the element in page coordinates, regardless of how the element
     * is positioned. The element must be part of the DOM tree to have page coordinates
     * (`display:none` or elements not appended return false).
     * @param {Number[]} pos Contains X & Y [x, y] values for new position (coordinates are page-based)
     * @param {Boolean/Object} [animate] True for the default animation, or a standard Element
     * animation config object
     * @return {Ext.Element} this
     */
    setXY: function(pos, animate) {
        var me = this;
        if (!animate || !me.anim) {
            Element.setXY(me.dom, pos);
        }
        else {
            if (!Ext.isObject(animate)) {
                animate = {};
            }
            me.animate(Ext.applyIf({ to: { x: pos[0], y: pos[1] } }, animate));
        }
        return me;
    },

    pxRe: /^\d+(?:\.\d*)?px$/i,

    /**
     * Returns the x-coordinate of this element reletive to its `offsetParent`.
     * @return {Number} The local x-coordinate (relative to the `offsetParent`).
     */
    getLocalX: function() {
        var me = this,
            offsetParent,
            x = me.getStyle(LEFT);

        if (!x || x === AUTO) {
            return 0;
        }
        if (x && me.pxRe.test(x)) {
            return parseFloat(x);
        }

        x = me.getX();

        offsetParent = me.dom.offsetParent;
        if (offsetParent) {
            x -= Ext.fly(offsetParent).getX();
        }

        return x;
    },

    /**
     * Returns the y-coordinate of this element reletive to its `offsetParent`.
     * @return {Number} The local y-coordinate (relative to the `offsetParent`).
     */
    getLocalY: function() {
        var me = this,
            offsetParent,
            y = me.getStyle(TOP);

        if (!y || y === AUTO) {
            return 0;
        }
        if (y && me.pxRe.test(y)) {
            return parseFloat(y);
        }

        y = me.getY();

        offsetParent = me.dom.offsetParent;
        if (offsetParent) {
            y -= Ext.fly(offsetParent).getY();
        }

        return y;
    },

    getLeft: function(local) {
        return local ? this.getLocalX() : this.getX();
    },

    getRight: function(local) {
        return (local ? this.getLocalX() : this.getX()) + this.getWidth();
    },

    getTop: function(local) {
        return local ? this.getLocalY() : this.getY();
    },

    getBottom: function(local) {
        return (local ? this.getLocalY() : this.getY()) + this.getHeight();
    },

    translatePoints: function(x, y) {
        var me = this,
            styles = me.getStyle(positionTopLeft),
            relative = styles.position == 'relative',
            left = parseFloat(styles.left),
            top = parseFloat(styles.top),
            xy = me.getXY();

        if (Ext.isArray(x)) {
             y = x[1];
             x = x[0];
        }
        if (isNaN(left)) {
            left = relative ? 0 : me.dom.offsetLeft;
        }
        if (isNaN(top)) {
            top = relative ? 0 : me.dom.offsetTop;
        }
        left = (typeof x == 'number') ? x - xy[0] + left : undefined;
        top = (typeof y == 'number') ? y - xy[1] + top : undefined;
        return {
            left: left,
            top: top
        };

    },

    setBox: function(box, adjust, animate) {
        var me = this,
                w = box.width,
                h = box.height;
        if ((adjust && !me.autoBoxAdjust) && !me.isBorderBox()) {
            w -= (me.getBorderWidth("lr") + me.getPadding("lr"));
            h -= (me.getBorderWidth("tb") + me.getPadding("tb"));
        }
        me.setBounds(box.x, box.y, w, h, animate);
        return me;
    },

    getBox: function(contentBox, local) {
        var me = this,
            xy,
            left,
            top,
            paddingWidth,
            bordersWidth,
            l, r, t, b, w, h, bx;

        if (!local) {
            xy = me.getXY();
        } else {
            xy = me.getStyle([LEFT, TOP]);
            xy = [ parseFloat(xy.left) || 0, parseFloat(xy.top) || 0];
        }
        w = me.getWidth();
        h = me.getHeight();
        if (!contentBox) {
            bx = {
                x: xy[0],
                y: xy[1],
                0: xy[0],
                1: xy[1],
                width: w,
                height: h
            };
        } else {
            paddingWidth = me.getStyle(paddingsTLRB);
            bordersWidth = me.getStyle(bordersTLRB);

            l = (parseFloat(bordersWidth[borders.l]) || 0) + (parseFloat(paddingWidth[paddings.l]) || 0);
            r = (parseFloat(bordersWidth[borders.r]) || 0) + (parseFloat(paddingWidth[paddings.r]) || 0);
            t = (parseFloat(bordersWidth[borders.t]) || 0) + (parseFloat(paddingWidth[paddings.t]) || 0);
            b = (parseFloat(bordersWidth[borders.b]) || 0) + (parseFloat(paddingWidth[paddings.b]) || 0);

            bx = {
                x: xy[0] + l,
                y: xy[1] + t,
                0: xy[0] + l,
                1: xy[1] + t,
                width: w - (l + r),
                height: h - (t + b)
            };
        }
        bx.right = bx.x + bx.width;
        bx.bottom = bx.y + bx.height;

        return bx;
    },

    getPageBox: function(getRegion) {
        var me = this,
            el = me.dom,
            isDoc = el.nodeName == BODY,
            w = isDoc ? Ext.dom.AbstractElement.getViewWidth() : el.offsetWidth,
            h = isDoc ? Ext.dom.AbstractElement.getViewHeight() : el.offsetHeight,
            xy = me.getXY(),
            t = xy[1],
            r = xy[0] + w,
            b = xy[1] + h,
            l = xy[0];

        if (getRegion) {
            return new Ext.util.Region(t, r, b, l);
        }
        else {
            return {
                left: l,
                top: t,
                width: w,
                height: h,
                right: r,
                bottom: b
            };
        }
    },

    /**
     * Sets the position of the element in page coordinates, regardless of how the element
     * is positioned. The element must be part of the DOM tree to have page coordinates
     * (`display:none` or elements not appended return false).
     * @param {Number} x X value for new position (coordinates are page-based)
     * @param {Number} y Y value for new position (coordinates are page-based)
     * @param {Boolean/Object} [animate] True for the default animation, or a standard Element
     * animation config object
     * @return {Ext.dom.AbstractElement} this
     */
    setLocation : function(x, y, animate) {
        return this.setXY([x, y], animate);
    },

    /**
     * Sets the position of the element in page coordinates, regardless of how the element
     * is positioned. The element must be part of the DOM tree to have page coordinates
     * (`display:none` or elements not appended return false).
     * @param {Number} x X value for new position (coordinates are page-based)
     * @param {Number} y Y value for new position (coordinates are page-based)
     * @param {Boolean/Object} [animate] True for the default animation, or a standard Element
     * animation config object
     * @return {Ext.dom.AbstractElement} this
     */
    moveTo : function(x, y, animate) {
        return this.setXY([x, y], animate);
    },

    /**
     * Initializes positioning on this element. If a desired position is not passed, it will make the
     * the element positioned relative IF it is not already positioned.
     * @param {String} [pos] Positioning to use "relative", "absolute" or "fixed"
     * @param {Number} [zIndex] The zIndex to apply
     * @param {Number} [x] Set the page X position
     * @param {Number} [y] Set the page Y position
     */
    position : function(pos, zIndex, x, y) {
        var me = this;

        if (!pos && me.isStyle(POSITION, STATIC)) {
            me.setStyle(POSITION, RELATIVE);
        } else if (pos) {
            me.setStyle(POSITION, pos);
        }
        if (zIndex) {
            me.setStyle(ZINDEX, zIndex);
        }
        if (x || y) {
            me.setXY([x || false, y || false]);
        }
    },

    /**
     * Clears positioning back to the default when the document was loaded.
     * @param {String} [value=''] The value to use for the left, right, top, bottom. You could use 'auto'.
     * @return {Ext.dom.AbstractElement} this
     */
    clearPositioning : function(value) {
        value = value || '';
        this.setStyle({
            left : value,
            right : value,
            top : value,
            bottom : value,
            "z-index" : "",
            position : STATIC
        });
        return this;
    },

    /**
     * Gets an object with all CSS positioning properties. Useful along with #setPostioning to get
     * snapshot before performing an update and then restoring the element.
     * @return {Object}
     */
    getPositioning : function(){
        var styles = this.getStyle([LEFT, TOP, POSITION, RIGHT, BOTTOM, ZINDEX]);
        styles[RIGHT] =  styles[LEFT] ? '' : styles[RIGHT];
        styles[BOTTOM] = styles[TOP] ? '' : styles[BOTTOM];
        return styles;
    },

    /**
     * Set positioning with an object returned by #getPositioning.
     * @param {Object} posCfg
     * @return {Ext.dom.AbstractElement} this
     */
    setPositioning : function(pc) {
        var me = this,
            style = me.dom.style;

        me.setStyle(pc);

        if (pc.right == AUTO) {
            style.right = "";
        }
        if (pc.bottom == AUTO) {
            style.bottom = "";
        }

        return me;
    },

    /**
     * Move this element relative to its current position.
     * @param {String} direction Possible values are:
     *
     * - `"l"` (or `"left"`)
     * - `"r"` (or `"right"`)
     * - `"t"` (or `"top"`, or `"up"`)
     * - `"b"` (or `"bottom"`, or `"down"`)
     *
     * @param {Number} distance How far to move the element in pixels
     * @param {Boolean/Object} [animate] true for the default animation or a standard Element
     * animation config object
     */
    move: function(direction, distance, animate) {
        var me = this,
            xy = me.getXY(),
            x = xy[0],
            y = xy[1],
            left = [x - distance, y],
            right = [x + distance, y],
            top = [x, y - distance],
            bottom = [x, y + distance],
            hash = {
                l: left,
                left: left,
                r: right,
                right: right,
                t: top,
                top: top,
                up: top,
                b: bottom,
                bottom: bottom,
                down: bottom
            };

        direction = direction.toLowerCase();
        me.moveTo(hash[direction][0], hash[direction][1], animate);
    },

    /**
     * Conveniently sets left and top adding default units.
     * @param {String} left The left CSS property value
     * @param {String} top The top CSS property value
     * @return {Ext.dom.Element} this
     */
    setLeftTop: function(left, top) {
        var style = this.dom.style;

        style.left = Element.addUnits(left);
        style.top = Element.addUnits(top);

        return this;
    },

    /**
     * Returns the region of this element.
     * The element must be part of the DOM tree to have a region
     * (display:none or elements not appended return false).
     * @return {Ext.util.Region} A Region containing "top, left, bottom, right" member data.
     */
    getRegion: function() {
        return this.getPageBox(true);
    },

    /**
     * Returns the **content** region of this element. That is the region within the borders and padding.
     * @return {Ext.util.Region} A Region containing "top, left, bottom, right" member data.
     */
    getViewRegion: function() {
        var me = this,
            isBody = me.dom.nodeName == BODY,
            scroll, pos, top, left, width, height;

        // For the body we want to do some special logic
        if (isBody) {
            scroll = me.getScroll();
            left = scroll.left;
            top = scroll.top;
            width = Ext.dom.AbstractElement.getViewportWidth();
            height = Ext.dom.AbstractElement.getViewportHeight();
        }
        else {
            pos = me.getXY();
            left = pos[0] + me.getBorderWidth('l') + me.getPadding('l');
            top = pos[1] + me.getBorderWidth('t') + me.getPadding('t');
            width = me.getWidth(true);
            height = me.getHeight(true);
        }

        return new Ext.util.Region(top, left + width - 1, top + height - 1, left);
    },

    /**
     * Sets the element's position and size in one shot. If animation is true then width, height,
     * x and y will be animated concurrently.
     *
     * @param {Number} x X value for new position (coordinates are page-based)
     * @param {Number} y Y value for new position (coordinates are page-based)
     * @param {Number/String} width The new width. This may be one of:
     *
     * - A Number specifying the new width in this Element's {@link #defaultUnit}s (by default, pixels)
     * - A String used to set the CSS width style. Animation may **not** be used.
     *
     * @param {Number/String} height The new height. This may be one of:
     *
     * - A Number specifying the new height in this Element's {@link #defaultUnit}s (by default, pixels)
     * - A String used to set the CSS height style. Animation may **not** be used.
     *
     * @param {Boolean/Object} [animate] true for the default animation or a standard Element
     * animation config object
     *
     * @return {Ext.dom.AbstractElement} this
     */
    setBounds: function(x, y, width, height, animate) {
        var me = this;
        if (!animate || !me.anim) {
            me.setSize(width, height);
            me.setLocation(x, y);
        } else {
            if (!Ext.isObject(animate)) {
                animate = {};
            }
            me.animate(Ext.applyIf({
                to: {
                    x: x,
                    y: y,
                    width: me.adjustWidth(width),
                    height: me.adjustHeight(height)
                }
            }, animate));
        }
        return me;
    },

    /**
     * Sets the element's position and size the specified region. If animation is true then width, height,
     * x and y will be animated concurrently.
     *
     * @param {Ext.util.Region} region The region to fill
     * @param {Boolean/Object} [animate] true for the default animation or a standard Element
     * animation config object
     * @return {Ext.dom.AbstractElement} this
     */
    setRegion: function(region, animate) {
        return this.setBounds(region.left, region.top, region.right - region.left, region.bottom - region.top, animate);
    }
});

}());


/**
 * @class Ext.dom.Element
 */
Ext.dom.Element.override({
    /**
     * Returns true if this element is scrollable.
     * @return {Boolean}
     */
    isScrollable: function() {
        var dom = this.dom;
        return dom.scrollHeight > dom.clientHeight || dom.scrollWidth > dom.clientWidth;
    },

    /**
     * Returns the current scroll position of the element.
     * @return {Object} An object containing the scroll position in the format
     * `{left: (scrollLeft), top: (scrollTop)}`
     */
    getScroll: function() {
        var d = this.dom,
            doc = document,
            body = doc.body,
            docElement = doc.documentElement,
            l,
            t,
            ret;

        if (d == doc || d == body) {
            if (Ext.isIE && Ext.isStrict) {
                l = docElement.scrollLeft;
                t = docElement.scrollTop;
            } else {
                l = window.pageXOffset;
                t = window.pageYOffset;
            }
            ret = {
                left: l || (body ? body.scrollLeft : 0),
                top : t || (body ? body.scrollTop : 0)
            };
        } else {
            ret = {
                left: d.scrollLeft,
                top : d.scrollTop
            };
        }

        return ret;
    },

    /**
     * Scrolls this element by the passed delta values, optionally animating.
     * 
     * All of the following are equivalent:
     *
     *      el.scrollBy(10, 10, true);
     *      el.scrollBy([10, 10], true);
     *      el.scrollBy({ x: 10, y: 10 }, true);
     * 
     * @param {Number/Number[]/Object} deltaX Either the x delta, an Array specifying x and y deltas or
     * an object with "x" and "y" properties.
     * @param {Number/Boolean/Object} deltaY Either the y delta, or an animate flag or config object.
     * @param {Boolean/Object} animate Animate flag/config object if the delta values were passed separately.
     * @return {Ext.Element} this
     */
    scrollBy: function(deltaX, deltaY, animate) {
        var me = this,
            dom = me.dom;

        // Extract args if deltas were passed as an Array.
        if (deltaX.length) {
            animate = deltaY;
            deltaY = deltaX[1];
            deltaX = deltaX[0];
        } else if (typeof deltaX != 'number') { // or an object
            animate = deltaY;
            deltaY = deltaX.y;
            deltaX = deltaX.x;
        }

        if (deltaX) {
            me.scrollTo('left', Math.max(Math.min(dom.scrollLeft + deltaX, dom.scrollWidth - dom.clientWidth), 0), animate);
        }
        if (deltaY) {
            me.scrollTo('top', Math.max(Math.min(dom.scrollTop + deltaY, dom.scrollHeight - dom.clientHeight), 0), animate);
        }

        return me;
    },

    /**
     * Scrolls this element the specified scroll point. It does NOT do bounds checking so
     * if you scroll to a weird value it will try to do it. For auto bounds checking, use #scroll.
     * @param {String} side Either "left" for scrollLeft values or "top" for scrollTop values.
     * @param {Number} value The new scroll value
     * @param {Boolean/Object} [animate] true for the default animation or a standard Element
     * animation config object
     * @return {Ext.Element} this
     */
    scrollTo: function(side, value, animate) {
        //check if we're scrolling top or left
        var top = /top/i.test(side),
            me = this,
            dom = me.dom,
            animCfg,
            prop;

        if (!animate || !me.anim) {
            // just setting the value, so grab the direction
            prop = 'scroll' + (top ? 'Top' : 'Left');
            dom[prop] = value;
            // corrects IE, other browsers will ignore
            dom[prop] = value;
        }
        else {
            animCfg = {
                to: {}
            };
            animCfg.to['scroll' + (top ? 'Top' : 'Left')] = value;
            if (Ext.isObject(animate)) {
                Ext.applyIf(animCfg, animate);
            }
            me.animate(animCfg);
        }
        return me;
    },

    /**
     * Scrolls this element into view within the passed container.
     * @param {String/HTMLElement/Ext.Element} [container=document.body] The container element
     * to scroll.  Should be a string (id), dom node, or Ext.Element.
     * @param {Boolean} [hscroll=true] False to disable horizontal scroll.
     * @param {Boolean/Object} [animate] true for the default animation or a standard Element
     * animation config object
     * @return {Ext.dom.Element} this
     */
    scrollIntoView: function(container, hscroll, animate) {
        container = Ext.getDom(container) || Ext.getBody().dom;
        var el = this.dom,
            offsets = this.getOffsetsTo(container),
        // el's box
            left = offsets[0] + container.scrollLeft,
            top = offsets[1] + container.scrollTop,
            bottom = top + el.offsetHeight,
            right = left + el.offsetWidth,
        // ct's box
            ctClientHeight = container.clientHeight,
            ctScrollTop = parseInt(container.scrollTop, 10),
            ctScrollLeft = parseInt(container.scrollLeft, 10),
            ctBottom = ctScrollTop + ctClientHeight,
            ctRight = ctScrollLeft + container.clientWidth,
            newPos;

        if (el.offsetHeight > ctClientHeight || top < ctScrollTop) {
            newPos = top;
        } else if (bottom > ctBottom) {
            newPos = bottom - ctClientHeight;
        }
        if (newPos != null) {
            Ext.get(container).scrollTo('top', newPos, animate);
        }

        if (hscroll !== false) {
            newPos = null;
            if (el.offsetWidth > container.clientWidth || left < ctScrollLeft) {
                newPos = left;
            } else if (right > ctRight) {
                newPos = right - container.clientWidth;
            }
            if (newPos != null) {
                Ext.get(container).scrollTo('left', newPos, animate);
            }
        }
        return this;
    },

    // @private
    scrollChildIntoView: function(child, hscroll) {
        Ext.fly(child, '_scrollChildIntoView').scrollIntoView(this, hscroll);
    },

    /**
     * Scrolls this element the specified direction. Does bounds checking to make sure the scroll is
     * within this element's scrollable range.
     * @param {String} direction Possible values are:
     *
     * - `"l"` (or `"left"`)
     * - `"r"` (or `"right"`)
     * - `"t"` (or `"top"`, or `"up"`)
     * - `"b"` (or `"bottom"`, or `"down"`)
     *
     * @param {Number} distance How far to scroll the element in pixels
     * @param {Boolean/Object} [animate] true for the default animation or a standard Element
     * animation config object
     * @return {Boolean} Returns true if a scroll was triggered or false if the element
     * was scrolled as far as it could go.
     */
    scroll: function(direction, distance, animate) {
        if (!this.isScrollable()) {
            return false;
        }
        var el = this.dom,
            l = el.scrollLeft, t = el.scrollTop,
            w = el.scrollWidth, h = el.scrollHeight,
            cw = el.clientWidth, ch = el.clientHeight,
            scrolled = false, v,
            hash = {
                l: Math.min(l + distance, w - cw),
                r: v = Math.max(l - distance, 0),
                t: Math.max(t - distance, 0),
                b: Math.min(t + distance, h - ch)
            };

        hash.d = hash.b;
        hash.u = hash.t;

        direction = direction.substr(0, 1);
        if ((v = hash[direction]) > -1) {
            scrolled = true;
            this.scrollTo(direction == 'l' || direction == 'r' ? 'left' : 'top', v, this.anim(animate));
        }
        return scrolled;
    }
});

/**
 * @class Ext.dom.Element
 */
(function() {

var Element = Ext.dom.Element,
    view = document.defaultView,
    adjustDirect2DTableRe = /table-row|table-.*-group/,
    INTERNAL = '_internal',
    HIDDEN = 'hidden',
    HEIGHT = 'height',
    WIDTH = 'width',
    ISCLIPPED = 'isClipped',
    OVERFLOW = 'overflow',
    OVERFLOWX = 'overflow-x',
    OVERFLOWY = 'overflow-y',
    ORIGINALCLIP = 'originalClip',
    DOCORBODYRE = /#document|body/i,
    // This reduces the lookup of 'me.styleHooks' by one hop in the prototype chain. It is
    // the same object.
    styleHooks,
    edges, k, edge, borderWidth;

if (!view || !view.getComputedStyle) {
    Element.prototype.getStyle = function (property, inline) {
        var me = this,
            dom = me.dom,
            multiple = typeof property != 'string',
            hooks = me.styleHooks,
            prop = property,
            props = prop,
            len = 1,
            isInline = inline,
            camel, domStyle, values, hook, out, style, i;

        if (multiple) {
            values = {};
            prop = props[0];
            i = 0;
            if (!(len = props.length)) {
                return values;
            }
        }

        if (!dom || dom.documentElement) {
            return values || '';
        }

        domStyle = dom.style;

        if (inline) {
            style = domStyle;
        } else {
            style = dom.currentStyle;

            // fallback to inline style if rendering context not available
            if (!style) {
                isInline = true;
                style = domStyle;
            }
        }

        do {
            hook = hooks[prop];

            if (!hook) {
                hooks[prop] = hook = { name: Element.normalize(prop) };
            }

            if (hook.get) {
                out = hook.get(dom, me, isInline, style);
            } else {
                camel = hook.name;

                // In some cases, IE6 will throw Invalid Argument exceptions for properties
                // like fontSize (/examples/tabs/tabs.html in 4.0 used to exhibit this but
                // no longer does due to font style changes). There is a real cost to a try
                // block, so we avoid it where possible...
                if (hook.canThrow) {
                    try {
                        out = style[camel];
                    } catch (e) {
                        out = '';
                    }
                } else {
                    // EXTJSIV-5657 - In IE9 quirks mode there is a chance that VML root element 
                    // has neither `currentStyle` nor `style`. Return '' this case.
                    out = style ? style[camel] : '';
                }
            }

            if (!multiple) {
                return out;
            }

            values[prop] = out;
            prop = props[++i];
        } while (i < len);

        return values;
    };
}

Element.override({
    getHeight: function(contentHeight, preciseHeight) {
        var me = this,
            dom = me.dom,
            hidden = me.isStyle('display', 'none'),
            height,
            floating;

        if (hidden) {
            return 0;
        }

        height = Math.max(dom.offsetHeight, dom.clientHeight) || 0;

        // IE9 Direct2D dimension rounding bug
        if (Ext.supports.Direct2DBug) {
            floating = me.adjustDirect2DDimension(HEIGHT);
            if (preciseHeight) {
                height += floating;
            }
            else if (floating > 0 && floating < 0.5) {
                height++;
            }
        }

        if (contentHeight) {
            height -= me.getBorderWidth("tb") + me.getPadding("tb");
        }

        return (height < 0) ? 0 : height;
    },

    getWidth: function(contentWidth, preciseWidth) {
        var me = this,
            dom = me.dom,
            hidden = me.isStyle('display', 'none'),
            rect, width, floating;

        if (hidden) {
            return 0;
        }

        // Gecko will in some cases report an offsetWidth that is actually less than the width of the
        // text contents, because it measures fonts with sub-pixel precision but rounds the calculated
        // value down. Using getBoundingClientRect instead of offsetWidth allows us to get the precise
        // subpixel measurements so we can force them to always be rounded up. See
        // https://bugzilla.mozilla.org/show_bug.cgi?id=458617
        // Rounding up ensures that the width includes the full width of the text contents.
        if (Ext.supports.BoundingClientRect) {
            rect = dom.getBoundingClientRect();
            width = rect.right - rect.left;
            width = preciseWidth ? width : Math.ceil(width);
        } else {
            width = dom.offsetWidth;
        }

        width = Math.max(width, dom.clientWidth) || 0;

        // IE9 Direct2D dimension rounding bug
        if (Ext.supports.Direct2DBug) {
            // get the fractional portion of the sub-pixel precision width of the element's text contents
            floating = me.adjustDirect2DDimension(WIDTH);
            if (preciseWidth) {
                width += floating;
            }
            // IE9 also measures fonts with sub-pixel precision, but unlike Gecko, instead of rounding the offsetWidth down,
            // it rounds to the nearest integer. This means that in order to ensure that the width includes the full
            // width of the text contents we need to increment the width by 1 only if the fractional portion is less than 0.5
            else if (floating > 0 && floating < 0.5) {
                width++;
            }
        }

        if (contentWidth) {
            width -= me.getBorderWidth("lr") + me.getPadding("lr");
        }

        return (width < 0) ? 0 : width;
    },

    setWidth: function(width, animate) {
        var me = this;
        width = me.adjustWidth(width);
        if (!animate || !me.anim) {
            me.dom.style.width = me.addUnits(width);
        }
        else {
            if (!Ext.isObject(animate)) {
                animate = {};
            }
            me.animate(Ext.applyIf({
                to: {
                    width: width
                }
            }, animate));
        }
        return me;
    },

    setHeight : function(height, animate) {
        var me = this;

        height = me.adjustHeight(height);
        if (!animate || !me.anim) {
            me.dom.style.height = me.addUnits(height);
        }
        else {
            if (!Ext.isObject(animate)) {
                animate = {};
            }
            me.animate(Ext.applyIf({
                to: {
                    height: height
                }
            }, animate));
        }

        return me;
    },

    applyStyles: function(style) {
        Ext.DomHelper.applyStyles(this.dom, style);
        return this;
    },

    setSize: function(width, height, animate) {
        var me = this;

        if (Ext.isObject(width)) { // in case of object from getSize()
            animate = height;
            height = width.height;
            width = width.width;
        }

        width = me.adjustWidth(width);
        height = me.adjustHeight(height);

        if (!animate || !me.anim) {
            me.dom.style.width = me.addUnits(width);
            me.dom.style.height = me.addUnits(height);
        }
        else {
            if (animate === true) {
                animate = {};
            }
            me.animate(Ext.applyIf({
                to: {
                    width: width,
                    height: height
                }
            }, animate));
        }

        return me;
    },

    getViewSize : function() {
        var me = this,
            dom = me.dom,
            isDoc = DOCORBODYRE.test(dom.nodeName),
            ret;

        // If the body, use static methods
        if (isDoc) {
            ret = {
                width : Element.getViewWidth(),
                height : Element.getViewHeight()
            };
        } else {
            ret = {
                width : dom.clientWidth,
                height : dom.clientHeight
            };
        }

        return ret;
    },

    getSize: function(contentSize) {
        return {width: this.getWidth(contentSize), height: this.getHeight(contentSize)};
    },

    // TODO: Look at this

    // private  ==> used by Fx
    adjustWidth : function(width) {
        var me = this,
            isNum = (typeof width == 'number');

        if (isNum && me.autoBoxAdjust && !me.isBorderBox()) {
            width -= (me.getBorderWidth("lr") + me.getPadding("lr"));
        }
        return (isNum && width < 0) ? 0 : width;
    },

    // private   ==> used by Fx
    adjustHeight : function(height) {
        var me = this,
            isNum = (typeof height == "number");

        if (isNum && me.autoBoxAdjust && !me.isBorderBox()) {
            height -= (me.getBorderWidth("tb") + me.getPadding("tb"));
        }
        return (isNum && height < 0) ? 0 : height;
    },

    /**
     * Return the CSS color for the specified CSS attribute. rgb, 3 digit (like `#fff`) and valid values
     * are convert to standard 6 digit hex color.
     * @param {String} attr The css attribute
     * @param {String} defaultValue The default value to use when a valid color isn't found
     * @param {String} [prefix] defaults to #. Use an empty string when working with
     * color anims.
     */
    getColor : function(attr, defaultValue, prefix) {
        var v = this.getStyle(attr),
            color = prefix || prefix === '' ? prefix : '#',
            h, len, i=0;

        if (!v || (/transparent|inherit/.test(v))) {
            return defaultValue;
        }
        if (/^r/.test(v)) {
             v = v.slice(4, v.length - 1).split(',');
             len = v.length;
             for (; i<len; i++) {
                h = parseInt(v[i], 10);
                color += (h < 16 ? '0' : '') + h.toString(16);
            }
        } else {
            v = v.replace('#', '');
            color += v.length == 3 ? v.replace(/^(\w)(\w)(\w)$/, '$1$1$2$2$3$3') : v;
        }
        return(color.length > 5 ? color.toLowerCase() : defaultValue);
    },

    /**
     * Set the opacity of the element
     * @param {Number} opacity The new opacity. 0 = transparent, .5 = 50% visibile, 1 = fully visible, etc
     * @param {Boolean/Object} [animate] a standard Element animation config object or `true` for
     * the default animation (`{duration: 350, easing: 'easeIn'}`)
     * @return {Ext.dom.Element} this
     */
    setOpacity: function(opacity, animate) {
        var me = this;

        if (!me.dom) {
            return me;
        }

        if (!animate || !me.anim) {
            me.setStyle('opacity', opacity);
        }
        else {
            if (typeof animate != 'object') {
                animate = {
                    duration: 350,
                    easing: 'ease-in'
                };
            }

            me.animate(Ext.applyIf({
                to: {
                    opacity: opacity
                }
            }, animate));
        }
        return me;
    },

    /**
     * Clears any opacity settings from this element. Required in some cases for IE.
     * @return {Ext.dom.Element} this
     */
    clearOpacity : function() {
        return this.setOpacity('');
    },

    /**
     * @private
     * Returns 1 if the browser returns the subpixel dimension rounded to the lowest pixel.
     * @return {Number} 0 or 1
     */
    adjustDirect2DDimension: function(dimension) {
        var me = this,
            dom = me.dom,
            display = me.getStyle('display'),
            inlineDisplay = dom.style.display,
            inlinePosition = dom.style.position,
            originIndex = dimension === WIDTH ? 0 : 1,
            currentStyle = dom.currentStyle,
            floating;

        if (display === 'inline') {
            dom.style.display = 'inline-block';
        }

        dom.style.position = display.match(adjustDirect2DTableRe) ? 'absolute' : 'static';

        // floating will contain digits that appears after the decimal point
        // if height or width are set to auto we fallback to msTransformOrigin calculation
        
        // Use currentStyle here instead of getStyle. In some difficult to reproduce 
        // instances it resets the scrollWidth of the element
        floating = (parseFloat(currentStyle[dimension]) || parseFloat(currentStyle.msTransformOrigin.split(' ')[originIndex]) * 2) % 1;

        dom.style.position = inlinePosition;

        if (display === 'inline') {
            dom.style.display = inlineDisplay;
        }

        return floating;
    },

    /**
     * Store the current overflow setting and clip overflow on the element - use {@link #unclip} to remove
     * @return {Ext.dom.Element} this
     */
    clip : function() {
        var me = this,
            data = (me.$cache || me.getCache()).data,
            style;

        if (!data[ISCLIPPED]) {
            data[ISCLIPPED] = true;
            style = me.getStyle([OVERFLOW, OVERFLOWX, OVERFLOWY]);
            data[ORIGINALCLIP] = {
                o: style[OVERFLOW],
                x: style[OVERFLOWX],
                y: style[OVERFLOWY]
            };
            me.setStyle(OVERFLOW, HIDDEN);
            me.setStyle(OVERFLOWX, HIDDEN);
            me.setStyle(OVERFLOWY, HIDDEN);
        }
        return me;
    },

    /**
     * Return clipping (overflow) to original clipping before {@link #clip} was called
     * @return {Ext.dom.Element} this
     */
    unclip : function() {
        var me = this,
            data = (me.$cache || me.getCache()).data,
            clip;

        if (data[ISCLIPPED]) {
            data[ISCLIPPED] = false;
            clip = data[ORIGINALCLIP];
            if (clip.o) {
                me.setStyle(OVERFLOW, clip.o);
            }
            if (clip.x) {
                me.setStyle(OVERFLOWX, clip.x);
            }
            if (clip.y) {
                me.setStyle(OVERFLOWY, clip.y);
            }
        }
        return me;
    },

    /**
     * Wraps the specified element with a special 9 element markup/CSS block that renders by default as
     * a gray container with a gradient background, rounded corners and a 4-way shadow.
     *
     * This special markup is used throughout Ext when box wrapping elements ({@link Ext.button.Button},
     * {@link Ext.panel.Panel} when {@link Ext.panel.Panel#frame frame=true}, {@link Ext.window.Window}).
     * The markup is of this form:
     *
     *     Ext.dom.Element.boxMarkup =
     *     '<div class="{0}-tl"><div class="{0}-tr"><div class="{0}-tc"></div></div></div>
     *     <div class="{0}-ml"><div class="{0}-mr"><div class="{0}-mc"></div></div></div>
     *     <div class="{0}-bl"><div class="{0}-br"><div class="{0}-bc"></div></div></div>';
     *
     * Example usage:
     *
     *     // Basic box wrap
     *     Ext.get("foo").boxWrap();
     *
     *     // You can also add a custom class and use CSS inheritance rules to customize the box look.
     *     // 'x-box-blue' is a built-in alternative -- look at the related CSS definitions as an example
     *     // for how to create a custom box wrap style.
     *     Ext.get("foo").boxWrap().addCls("x-box-blue");
     *
     * @param {String} [class='x-box'] A base CSS class to apply to the containing wrapper element.
     * Note that there are a number of CSS rules that are dependent on this name to make the overall effect work,
     * so if you supply an alternate base class, make sure you also supply all of the necessary rules.
     * @return {Ext.dom.Element} The outermost wrapping element of the created box structure.
     */
    boxWrap : function(cls) {
        cls = cls || Ext.baseCSSPrefix + 'box';
        var el = Ext.get(this.insertHtml("beforeBegin", "<div class='" + cls + "'>" + Ext.String.format(Element.boxMarkup, cls) + "</div>"));
        Ext.DomQuery.selectNode('.' + cls + '-mc', el.dom).appendChild(this.dom);
        return el;
    },

    /**
     * Returns either the offsetHeight or the height of this element based on CSS height adjusted by padding or borders
     * when needed to simulate offsetHeight when offsets aren't available. This may not work on display:none elements
     * if a height has not been set using CSS.
     * @return {Number}
     */
    getComputedHeight : function() {
        var me = this,
            h = Math.max(me.dom.offsetHeight, me.dom.clientHeight);
        if (!h) {
            h = parseFloat(me.getStyle(HEIGHT)) || 0;
            if (!me.isBorderBox()) {
                h += me.getFrameWidth('tb');
            }
        }
        return h;
    },

    /**
     * Returns either the offsetWidth or the width of this element based on CSS width adjusted by padding or borders
     * when needed to simulate offsetWidth when offsets aren't available. This may not work on display:none elements
     * if a width has not been set using CSS.
     * @return {Number}
     */
    getComputedWidth : function() {
        var me = this,
            w = Math.max(me.dom.offsetWidth, me.dom.clientWidth);

        if (!w) {
            w = parseFloat(me.getStyle(WIDTH)) || 0;
            if (!me.isBorderBox()) {
                w += me.getFrameWidth('lr');
            }
        }
        return w;
    },

    /**
     * Returns the sum width of the padding and borders for the passed "sides". See getBorderWidth()
     * for more information about the sides.
     * @param {String} sides
     * @return {Number}
     */
    getFrameWidth : function(sides, onlyContentBox) {
        return (onlyContentBox && this.isBorderBox()) ? 0 : (this.getPadding(sides) + this.getBorderWidth(sides));
    },

    /**
     * Sets up event handlers to add and remove a css class when the mouse is over this element
     * @param {String} className The class to add
     * @param {Function} [testFn] A test function to execute before adding the class. The passed parameter
     * will be the Element instance. If this functions returns false, the class will not be added.
     * @param {Object} [scope] The scope to execute the testFn in.
     * @return {Ext.dom.Element} this
     */
    addClsOnOver : function(className, testFn, scope) {
        var me = this,
            dom = me.dom,
            hasTest = Ext.isFunction(testFn);
            
        me.hover(
            function() {
                if (hasTest && testFn.call(scope || me, me) === false) {
                    return;
                }
                Ext.fly(dom, INTERNAL).addCls(className);
            },
            function() {
                Ext.fly(dom, INTERNAL).removeCls(className);
            }
        );
        return me;
    },

    /**
     * Sets up event handlers to add and remove a css class when this element has the focus
     * @param {String} className The class to add
     * @param {Function} [testFn] A test function to execute before adding the class. The passed parameter
     * will be the Element instance. If this functions returns false, the class will not be added.
     * @param {Object} [scope] The scope to execute the testFn in.
     * @return {Ext.dom.Element} this
     */
    addClsOnFocus : function(className, testFn, scope) {
        var me = this,
            dom = me.dom,
            hasTest = Ext.isFunction(testFn);
            
        me.on("focus", function() {
            if (hasTest && testFn.call(scope || me, me) === false) {
                return false;
            }
            Ext.fly(dom, INTERNAL).addCls(className);
        });
        me.on("blur", function() {
            Ext.fly(dom, INTERNAL).removeCls(className);
        });
        return me;
    },

    /**
     * Sets up event handlers to add and remove a css class when the mouse is down and then up on this element (a click effect)
     * @param {String} className The class to add
     * @param {Function} [testFn] A test function to execute before adding the class. The passed parameter
     * will be the Element instance. If this functions returns false, the class will not be added.
     * @param {Object} [scope] The scope to execute the testFn in.
     * @return {Ext.dom.Element} this
     */
    addClsOnClick : function(className, testFn, scope) {
        var me = this,
            dom = me.dom,
            hasTest = Ext.isFunction(testFn);
            
        me.on("mousedown", function() {
            if (hasTest && testFn.call(scope || me, me) === false) {
                return false;
            }
            Ext.fly(dom, INTERNAL).addCls(className);
            var d = Ext.getDoc(),
                fn = function() {
                    Ext.fly(dom, INTERNAL).removeCls(className);
                    d.removeListener("mouseup", fn);
                };
            d.on("mouseup", fn);
        });
        return me;
    },

    /**
     * Returns the dimensions of the element available to lay content out in.
     *
     * getStyleSize utilizes prefers style sizing if present, otherwise it chooses the larger of offsetHeight/clientHeight and
     * offsetWidth/clientWidth. To obtain the size excluding scrollbars, use getViewSize.
     *
     * Sizing of the document body is handled at the adapter level which handles special cases for IE and strict modes, etc.
     *
     * @return {Object} Object describing width and height.
     * @return {Number} return.width
     * @return {Number} return.height
     */
    getStyleSize : function() {
        var me = this,
            d = this.dom,
            isDoc = DOCORBODYRE.test(d.nodeName),
            s ,
            w, h;

        // If the body, use static methods
        if (isDoc) {
            return {
                width : Element.getViewWidth(),
                height : Element.getViewHeight()
            };
        }

        s = me.getStyle([HEIGHT, WIDTH], true);  //seek inline
        // Use Styles if they are set
        if (s.width && s.width != 'auto') {
            w = parseFloat(s.width);
            if (me.isBorderBox()) {
                w -= me.getFrameWidth('lr');
            }
        }
        // Use Styles if they are set
        if (s.height && s.height != 'auto') {
            h = parseFloat(s.height);
            if (me.isBorderBox()) {
                h -= me.getFrameWidth('tb');
            }
        }
        // Use getWidth/getHeight if style not set.
        return {width: w || me.getWidth(true), height: h || me.getHeight(true)};
    },

    /**
     * Enable text selection for this element (normalized across browsers)
     * @return {Ext.Element} this
     */
    selectable : function() {
        var me = this;
        me.dom.unselectable = "off";
        // Prevent it from bubles up and enables it to be selectable
        me.on('selectstart', function (e) {
            e.stopPropagation();
            return true;
        });
        me.applyStyles("-moz-user-select: text; -khtml-user-select: text;");
        me.removeCls(Ext.baseCSSPrefix + 'unselectable');
        return me;
    },

    /**
     * Disables text selection for this element (normalized across browsers)
     * @return {Ext.dom.Element} this
     */
    unselectable : function() {
        var me = this;
        me.dom.unselectable = "on";

        me.swallowEvent("selectstart", true);
        me.applyStyles("-moz-user-select:-moz-none;-khtml-user-select:none;");
        me.addCls(Ext.baseCSSPrefix + 'unselectable');

        return me;
    }
});

Element.prototype.styleHooks = styleHooks = Ext.dom.AbstractElement.prototype.styleHooks;

if (Ext.isIE6 || Ext.isIE7) {
    styleHooks.fontSize = styleHooks['font-size'] = {
        name: 'fontSize',
        canThrow: true
    };
    
    styleHooks.fontStyle = styleHooks['font-style'] = {
        name: 'fontStyle',
        canThrow: true
    };
    
    styleHooks.fontFamily = styleHooks['font-family'] = {
        name: 'fontFamily',
        canThrow: true
    };
}

// override getStyle for border-*-width
if (Ext.isIEQuirks || Ext.isIE && Ext.ieVersion <= 8) {
    function getBorderWidth (dom, el, inline, style) {
        if (style[this.styleName] == 'none') {
            return '0px';
        }
        return style[this.name];
    }

    edges = ['Top','Right','Bottom','Left'];
    k = edges.length;

    while (k--) {
        edge = edges[k];
        borderWidth = 'border' + edge + 'Width';

        styleHooks['border-'+edge.toLowerCase()+'-width'] = styleHooks[borderWidth] = {
            name: borderWidth,
            styleName: 'border' + edge + 'Style',
            get: getBorderWidth
        };
    }
}

}());

Ext.onReady(function () {
    var opacityRe = /alpha\(opacity=(.*)\)/i,
        trimRe = /^\s+|\s+$/g,
        hooks = Ext.dom.Element.prototype.styleHooks;

    // Ext.supports flags are not populated until onReady...
    hooks.opacity = {
        name: 'opacity',
        afterSet: function(dom, value, el) {
            if (el.isLayer) {
                el.onOpacitySet(value);
            }
        }
    };
    if (!Ext.supports.Opacity && Ext.isIE) {
        Ext.apply(hooks.opacity, {
            get: function (dom) {
                var filter = dom.style.filter,
                    match, opacity;
                if (filter.match) {
                    match = filter.match(opacityRe);
                    if (match) {
                        opacity = parseFloat(match[1]);
                        if (!isNaN(opacity)) {
                            return opacity ? opacity / 100 : 0;
                        }
                    }
                }
                return 1;
            },
            set: function (dom, value) {
                var style = dom.style,
                    val = style.filter.replace(opacityRe, '').replace(trimRe, '');

                style.zoom = 1; // ensure dom.hasLayout

                // value can be a number or '' or null... so treat falsey as no opacity
                if (typeof(value) == 'number' && value >= 0 && value < 1) {
                    value *= 100;
                    style.filter = val + (val.length ? ' ' : '') + 'alpha(opacity='+value+')';
                } else {
                    style.filter = val;
                }
            }  
        });
    }
    // else there is no work around for the lack of opacity support. Should not be a
    // problem given that this has been supported for a long time now...
});

/**
 * @class Ext.dom.Element
 */
Ext.dom.Element.override({
    select: function(selector) {
        return Ext.dom.Element.select(selector, false,  this.dom);
    }
});
