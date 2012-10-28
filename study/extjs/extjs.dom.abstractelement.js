
/**
 * @class Ext.dom.AbstractElement
 * @extend Ext.Base
 * @private
 */
(function() {

var document = window.document,
    trimRe = /^\s+|\s+$/g,
    whitespaceRe = /\s/;

if (!Ext.cache){
    Ext.cache = {};
}

// comahead
Ext.define('Ext.dom.AbstractElement', {

    inheritableStatics: {

        /**
         * Retrieves Ext.dom.Element objects. {@link Ext#get} is alias for {@link Ext.dom.Element#get}.
         *
         * **This method does not retrieve {@link Ext.Component Component}s.** This method retrieves Ext.dom.Element
         * objects which encapsulate DOM elements. To retrieve a Component by its ID, use {@link Ext.ComponentManager#get}.
         *
         * Uses simple caching to consistently return the same object. Automatically fixes if an object was recreated with
         * the same id via AJAX or DOM.
         *
         * @param {String/HTMLElement/Ext.Element} el The id of the node, a DOM Node or an existing Element.
         * @return {Ext.dom.Element} The Element object (or null if no matching element was found)
         * @static
         * @inheritable
         */
        get: function(el) {
            var me = this,
                El = Ext.dom.Element,
                cacheItem,
                extEl,
                dom,
                id;

            if (!el) {
                return null;
            }

            if (typeof el == "string") { // element id
                if (el == Ext.windowId) {
                    return El.get(window);
                } else if (el == Ext.documentId) {
                    return El.get(document);
                }
                
                cacheItem = Ext.cache[el];
                // This code is here to catch the case where we've got a reference to a document of an iframe
                // It getElementById will fail because it's not part of the document, so if we're skipping
                // GC it means it's a window/document object that isn't the default window/document, which we have
                // already handled above
                if (cacheItem && cacheItem.skipGarbageCollection) {
                    extEl = cacheItem.el;
                    return extEl;
                }
                
                if (!(dom = document.getElementById(el))) {
                    return null;
                }

                if (cacheItem && cacheItem.el) {
                    extEl = Ext.updateCacheEntry(cacheItem, dom).el;
                } else {
                    // Force new element if there's a cache but no el attached
                    extEl = new El(dom, !!cacheItem);
                }
                return extEl;
            } else if (el.tagName) { // dom element
                if (!(id = el.id)) {
                    id = Ext.id(el);
                }
                cacheItem = Ext.cache[id];
                if (cacheItem && cacheItem.el) {
                    extEl = Ext.updateCacheEntry(cacheItem, el).el;
                } else {
                    // Force new element if there's a cache but no el attached
                    extEl = new El(el, !!cacheItem);
                }
                return extEl;
            } else if (el instanceof me) {
                if (el != me.docEl && el != me.winEl) {
                    id = el.id;
                    // refresh dom element in case no longer valid,
                    // catch case where it hasn't been appended
                    cacheItem = Ext.cache[id];
                    if (cacheItem) {
                        Ext.updateCacheEntry(cacheItem, document.getElementById(id) || el.dom);
                    }
                }
                return el;
            } else if (el.isComposite) {
                return el;
            } else if (Ext.isArray(el)) {
                return me.select(el);
            } else if (el === document) {
                // create a bogus element object representing the document object
                if (!me.docEl) {
                    me.docEl = Ext.Object.chain(El.prototype);
                    me.docEl.dom = document;
                    me.docEl.id = Ext.id(document);
                    me.addToCache(me.docEl);
                }
                return me.docEl;
            } else if (el === window) {
                if (!me.winEl) {
                    me.winEl = Ext.Object.chain(El.prototype);
                    me.winEl.dom = window;
                    me.winEl.id = Ext.id(window);
                    me.addToCache(me.winEl);
                }
                return me.winEl;
            }
            return null;
        },

        addToCache: function(el, id) {
            if (el) {
                Ext.addCacheEntry(id, el);
            }
            return el;
        },

        addMethods: function() {
            this.override.apply(this, arguments);
        },

        /**
         * <p>Returns an array of unique class names based upon the input strings, or string arrays.</p>
         * <p>The number of parameters is unlimited.</p>
         * <p>Example</p><code><pre>
// Add x-invalid and x-mandatory classes, do not duplicate
myElement.dom.className = Ext.core.Element.mergeClsList(this.initialClasses, 'x-invalid x-mandatory');
</pre></code>
         * @param {Mixed} clsList1 A string of class names, or an array of class names.
         * @param {Mixed} clsList2 A string of class names, or an array of class names.
         * @return {Array} An array of strings representing remaining unique, merged class names. If class names were added to the first list, the <code>changed</code> property will be <code>true</code>.
         * @static
         * @inheritable
         */
        mergeClsList: function() {
            var clsList, clsHash = {},
                i, length, j, listLength, clsName, result = [],
                changed = false;

            for (i = 0, length = arguments.length; i < length; i++) {
                clsList = arguments[i];
                if (Ext.isString(clsList)) {
                    clsList = clsList.replace(trimRe, '').split(whitespaceRe);
                }
                if (clsList) {
                    for (j = 0, listLength = clsList.length; j < listLength; j++) {
                        clsName = clsList[j];
                        if (!clsHash[clsName]) {
                            if (i) {
                                changed = true;
                            }
                            clsHash[clsName] = true;
                        }
                    }
                }
            }

            for (clsName in clsHash) {
                result.push(clsName);
            }
            result.changed = changed;
            return result;
        },

        /**
         * <p>Returns an array of unique class names deom the first parameter with all class names
         * from the second parameter removed.</p>
         * <p>Example</p><code><pre>
// Remove x-invalid and x-mandatory classes if present.
myElement.dom.className = Ext.core.Element.removeCls(this.initialClasses, 'x-invalid x-mandatory');
</pre></code>
         * @param {Mixed} existingClsList A string of class names, or an array of class names.
         * @param {Mixed} removeClsList A string of class names, or an array of class names to remove from <code>existingClsList</code>.
         * @return {Array} An array of strings representing remaining class names. If class names were removed, the <code>changed</code> property will be <code>true</code>.
         * @static
         * @inheritable
         */
        removeCls: function(existingClsList, removeClsList) {
            var clsHash = {},
                i, length, clsName, result = [],
                changed = false;

            if (existingClsList) {
                if (Ext.isString(existingClsList)) {
                    existingClsList = existingClsList.replace(trimRe, '').split(whitespaceRe);
                }
                for (i = 0, length = existingClsList.length; i < length; i++) {
                    clsHash[existingClsList[i]] = true;
                }
            }
            if (removeClsList) {
                if (Ext.isString(removeClsList)) {
                    removeClsList = removeClsList.split(whitespaceRe);
                }
                for (i = 0, length = removeClsList.length; i < length; i++) {
                    clsName = removeClsList[i];
                    if (clsHash[clsName]) {
                        changed = true;
                        delete clsHash[clsName];
                    }
                }
            }
            for (clsName in clsHash) {
                result.push(clsName);
            }
            result.changed = changed;
            return result;
        },

        /**
         * @property
         * Visibility mode constant for use with {@link Ext.dom.Element#setVisibilityMode}. 
         * Use the CSS 'visibility' property to hide the element.
         *
         * Note that in this mode, {@link Ext.dom.Element#isVisible isVisible} may return true
         * for an element even though it actually has a parent element that is hidden. For this
         * reason, and in most cases, using the {@link #OFFSETS} mode is a better choice.
         * @static
         * @inheritable
         */
        VISIBILITY: 1,

        /**
         * @property
         * Visibility mode constant for use with {@link Ext.dom.Element#setVisibilityMode}. 
         * Use the CSS 'display' property to hide the element.
         * @static
         * @inheritable
         */
        DISPLAY: 2,

        /**
         * @property
         * Visibility mode constant for use with {@link Ext.dom.Element#setVisibilityMode}. 
         * Use CSS absolute positioning and top/left offsets to hide the element.
         * @static
         * @inheritable
         */
        OFFSETS: 3,

        /**
         * @property
         * Visibility mode constant for use with {@link Ext.dom.Element#setVisibilityMode}. 
         * Add or remove the {@link Ext.Layer#visibilityCls} class to hide the element.
         * @static
         * @inheritable
         */
        ASCLASS: 4
    },

    constructor: function(element, forceNew) {
        var me = this,
            dom = typeof element == 'string'
                ? document.getElementById(element)
                : element,
            id;

        if (!dom) {
            return null;
        }

        id = dom.id;
        if (!forceNew && id && Ext.cache[id]) {
            // element object already exists
            return Ext.cache[id].el;
        }

        /**
         * @property {HTMLElement} dom
         * The DOM element
         */
        me.dom = dom;

        /**
         * @property {String} id
         * The DOM element ID
         */
        me.id = id || Ext.id(dom);

        me.self.addToCache(me);
    },

    /**
     * Sets the passed attributes as attributes of this element (a style attribute can be a string, object or function)
     * @param {Object} o The object with the attributes
     * @param {Boolean} [useSet=true] false to override the default setAttribute to use expandos.
     * @return {Ext.dom.Element} this
     */
    set: function(o, useSet) {
         var el = this.dom,
             attr,
             value;

         for (attr in o) {
             if (o.hasOwnProperty(attr)) {
                 value = o[attr];
                 if (attr == 'style') {
                     this.applyStyles(value);
                 }
                 else if (attr == 'cls') {
                     el.className = value;
                 }
                 else if (useSet !== false) {
                     if (value === undefined) {
                         el.removeAttribute(attr);
                     } else {
                        el.setAttribute(attr, value);
                     }
                 }
                 else {
                     el[attr] = value;
                 }
             }
         }
         return this;
     },

    /**
     * @property {String} defaultUnit
     * The default unit to append to CSS values where a unit isn't provided.
     */
    defaultUnit: "px",

    /**
     * Returns true if this element matches the passed simple selector (e.g. div.some-class or span:first-child)
     * @param {String} selector The simple selector to test
     * @return {Boolean} True if this element matches the selector, else false
     */
    is: function(simpleSelector) {
        return Ext.DomQuery.is(this.dom, simpleSelector);
    },

    /**
     * Returns the value of the "value" attribute
     * @param {Boolean} asNumber true to parse the value as a number
     * @return {String/Number}
     */
    getValue: function(asNumber) {
        var val = this.dom.value;
        return asNumber ? parseInt(val, 10) : val;
    },

    /**
     * Removes this element's dom reference. Note that event and cache removal is handled at {@link Ext#removeNode
     * Ext.removeNode}
     */
    remove: function() {
        var me = this,
        dom = me.dom;

        if (dom) {
            Ext.removeNode(dom);
            delete me.dom;
        }
    },

    /**
     * Returns true if this element is an ancestor of the passed element
     * @param {HTMLElement/String} el The element to check
     * @return {Boolean} True if this element is an ancestor of el, else false
     */
    contains: function(el) {
        if (!el) {
            return false;
        }

        var me = this,
            dom = el.dom || el;

        // we need el-contains-itself logic here because isAncestor does not do that:
        return (dom === me.dom) || Ext.dom.AbstractElement.isAncestor(me.dom, dom);
    },

    /**
     * Returns the value of an attribute from the element's underlying DOM node.
     * @param {String} name The attribute name
     * @param {String} [namespace] The namespace in which to look for the attribute
     * @return {String} The attribute value
     */
    getAttribute: function(name, ns) {
        var dom = this.dom;
        return dom.getAttributeNS(ns, name) || dom.getAttribute(ns + ":" + name) || dom.getAttribute(name) || dom[name];
    },

    /**
     * Update the innerHTML of this element
     * @param {String} html The new HTML
     * @return {Ext.dom.Element} this
     */
    update: function(html) {
        if (this.dom) {
            this.dom.innerHTML = html;
        }
        return this;
    },


    /**
    * Set the innerHTML of this element
    * @param {String} html The new HTML
    * @return {Ext.Element} this
     */
    setHTML: function(html) {
        if(this.dom) {
            this.dom.innerHTML = html;
        }
        return this;
    },

    /**
     * Returns the innerHTML of an Element or an empty string if the element's
     * dom no longer exists.
     */
    getHTML: function() {
        return this.dom ? this.dom.innerHTML : '';
    },

    /**
     * Hide this element - Uses display mode to determine whether to use "display" or "visibility". See {@link #setVisible}.
     * @param {Boolean/Object} animate (optional) true for the default animation or a standard Element animation config object
     * @return {Ext.Element} this
     */
    hide: function() {
        this.setVisible(false);
        return this;
    },

    /**
     * Show this element - Uses display mode to determine whether to use "display" or "visibility". See {@link #setVisible}.
     * @param {Boolean/Object} animate (optional) true for the default animation or a standard Element animation config object
     * @return {Ext.Element} this
     */
    show: function() {
        this.setVisible(true);
        return this;
    },

    /**
     * Sets the visibility of the element (see details). If the visibilityMode is set to Element.DISPLAY, it will use
     * the display property to hide the element, otherwise it uses visibility. The default is to hide and show using the visibility property.
     * @param {Boolean} visible Whether the element is visible
     * @param {Boolean/Object} animate (optional) True for the default animation, or a standard Element animation config object
     * @return {Ext.Element} this
     */
    setVisible: function(visible, animate) {
        var me = this,
            statics = me.self,
            mode = me.getVisibilityMode(),
            prefix = Ext.baseCSSPrefix;

        switch (mode) {
            case statics.VISIBILITY:
                me.removeCls([prefix + 'hidden-display', prefix + 'hidden-offsets']);
                me[visible ? 'removeCls' : 'addCls'](prefix + 'hidden-visibility');
            break;

            case statics.DISPLAY:
                me.removeCls([prefix + 'hidden-visibility', prefix + 'hidden-offsets']);
                me[visible ? 'removeCls' : 'addCls'](prefix + 'hidden-display');
            break;

            case statics.OFFSETS:
                me.removeCls([prefix + 'hidden-visibility', prefix + 'hidden-display']);
                me[visible ? 'removeCls' : 'addCls'](prefix + 'hidden-offsets');
            break;
        }

        return me;
    },

    getVisibilityMode: function() {
        // Only flyweights won't have a $cache object, by calling getCache the cache
        // will be created for future accesses. As such, we're eliminating the method
        // call since it's mostly redundant
        var data = (this.$cache || this.getCache()).data,
            visMode = data.visibilityMode;

        if (visMode === undefined) {
            data.visibilityMode = visMode = this.self.DISPLAY;
        }
        
        return visMode;
    },

    /**
     * Use this to change the visibility mode between {@link #VISIBILITY}, {@link #DISPLAY}, {@link #OFFSETS} or {@link #ASCLASS}.
     */
    setVisibilityMode: function(mode) {
        (this.$cache || this.getCache()).data.visibilityMode = mode;
        return this;
    },
    
    getCache: function() {
        var me = this,
            id = me.dom.id || Ext.id(me.dom);

        // Note that we do not assign an ID to the calling object here.
        // An Ext.dom.Element will have one assigned at construction, and an Ext.dom.AbstractElement.Fly must not have one.
        // We assign an ID to the DOM element if it does not have one.
        me.$cache = Ext.cache[id] || Ext.addCacheEntry(id, null, me.dom);
            
        return me.$cache;
    }
    
}, function() {
    var AbstractElement = this;

    /**
     * @private
     * @member Ext
     */
    Ext.getDetachedBody = function () {
        var detachedEl = AbstractElement.detachedBodyEl;

        if (!detachedEl) {
            detachedEl = document.createElement('div');
            AbstractElement.detachedBodyEl = detachedEl = new AbstractElement.Fly(detachedEl);
            detachedEl.isDetachedBody = true;
        }

        return detachedEl;
    };

    /**
     * @private
     * @member Ext
     */
    Ext.getElementById = function (id) {
        var el = document.getElementById(id),
            detachedBodyEl;

        if (!el && (detachedBodyEl = AbstractElement.detachedBodyEl)) {
            el = detachedBodyEl.dom.querySelector('#' + Ext.escapeId(id));
        }

        return el;
    };

    /**
     * @member Ext
     * @method get
     * @inheritdoc Ext.dom.Element#get
     */
    Ext.get = function(el) {
        return Ext.dom.Element.get(el);
    };

    this.addStatics({
        /**
         * @class Ext.dom.AbstractElement.Fly
         * @extends Ext.dom.AbstractElement
         *
         * A non-persistent wrapper for a DOM element which may be used to execute methods of {@link Ext.dom.Element}
         * upon a DOM element without creating an instance of {@link Ext.dom.Element}.
         *
         * A **singleton** instance of this class is returned when you use {@link Ext#fly}
         *
         * Because it is a singleton, this Flyweight does not have an ID, and must be used and discarded in a single line.
         * You should not keep and use the reference to this singleton over multiple lines because methods that you call
         * may themselves make use of {@link Ext#fly} and may change the DOM element to which the instance refers.
         */
        Fly: new Ext.Class({
            extend: AbstractElement,

            /**
             * @property {Boolean} isFly
             * This is `true` to identify Element flyweights
             */
            isFly: true,

            constructor: function(dom) {
                this.dom = dom;
            },

            /**
             * @private
             * Attach this fliyweight instance to the passed DOM element.
             *
             * Note that a flightweight does **not** have an ID, and does not acquire the ID of the DOM element.
             */
            attach: function (dom) {

                // Attach to the passed DOM element. The same code as in Ext.Fly
                this.dom = dom;
                // Use cached data if there is existing cached data for the referenced DOM element,
                // otherwise it will be created when needed by getCache.
                this.$cache = dom.id ? Ext.cache[dom.id] : null;
                return this;
            }
        }),

        _flyweights: {},

        /**
         * Gets the singleton {@link Ext.dom.AbstractElement.Fly flyweight} element, with the passed node as the active element.
         * 
         * Because it is a singleton, this Flyweight does not have an ID, and must be used and discarded in a single line.
         * You may not keep and use the reference to this singleton over multiple lines because methods that you call
         * may themselves make use of {@link Ext#fly} and may change the DOM element to which the instance refers.
         *  
         * {@link Ext#fly} is alias for {@link Ext.dom.AbstractElement#fly}.
         *
         * Use this to make one-time references to DOM elements which are not going to be accessed again either by
         * application code, or by Ext's classes. If accessing an element which will be processed regularly, then {@link
         * Ext#get Ext.get} will be more appropriate to take advantage of the caching provided by the Ext.dom.Element
         * class.
         *
         * @param {String/HTMLElement} dom The dom node or id
         * @param {String} [named] Allows for creation of named reusable flyweights to prevent conflicts (e.g.
         * internally Ext uses "_global")
         * @return {Ext.dom.AbstractElement.Fly} The singleton flyweight object (or null if no matching element was found)
         * @static
         * @member Ext.dom.AbstractElement
         */
        fly: function(dom, named) {
            var fly = null,
                _flyweights = AbstractElement._flyweights;

            named = named || '_global';

            dom = Ext.getDom(dom);

            if (dom) {
                fly = _flyweights[named] || (_flyweights[named] = new AbstractElement.Fly());

                // Attach to the passed DOM element.
                // This code performs the same function as Fly.attach, but inline it for efficiency
                fly.dom = dom;
                // Use cached data if there is existing cached data for the referenced DOM element,
                // otherwise it will be created when needed by getCache.
                fly.$cache = dom.id ? Ext.cache[dom.id] : null;
            }
            return fly;
        }
    });

    /**
     * @member Ext
     * @method fly
     * @inheritdoc Ext.dom.AbstractElement#fly
     */
    Ext.fly = function() {
        return AbstractElement.fly.apply(AbstractElement, arguments);
    };

    (function (proto) {
        /**
         * @method destroy
         * @member Ext.dom.AbstractElement
         * @inheritdoc Ext.dom.AbstractElement#remove
         * Alias to {@link #remove}.
         */
        proto.destroy = proto.remove;

        /**
         * Returns a child element of this element given its `id`.
         * @method getById
         * @member Ext.dom.AbstractElement
         * @param {String} id The id of the desired child element.
         * @param {Boolean} [asDom=false] True to return the DOM element, false to return a
         * wrapped Element object.
         */
        if (document.querySelector) {
            proto.getById = function (id, asDom) {
                // for normal elements getElementById is the best solution, but if the el is
                // not part of the document.body, we have to resort to querySelector
                var dom = document.getElementById(id) ||
                    this.dom.querySelector('#'+Ext.escapeId(id));
                return asDom ? dom : (dom ? Ext.get(dom) : null);
            };
        } else {
            proto.getById = function (id, asDom) {
                var dom = document.getElementById(id);
                return asDom ? dom : (dom ? Ext.get(dom) : null);
            };
        }
    }(this.prototype));
});

}());

/**
 * @class Ext.dom.AbstractElement
 */
Ext.dom.AbstractElement.addInheritableStatics({
    unitRe: /\d+(px|em|%|en|ex|pt|in|cm|mm|pc)$/i,
    camelRe: /(-[a-z])/gi,
    cssRe: /([a-z0-9\-]+)\s*:\s*([^;\s]+(?:\s*[^;\s]+)*);?/gi,
    opacityRe: /alpha\(opacity=(.*)\)/i,
    propertyCache: {},
    defaultUnit : "px",
    borders: {l: 'border-left-width', r: 'border-right-width', t: 'border-top-width', b: 'border-bottom-width'},
    paddings: {l: 'padding-left', r: 'padding-right', t: 'padding-top', b: 'padding-bottom'},
    margins: {l: 'margin-left', r: 'margin-right', t: 'margin-top', b: 'margin-bottom'},
    /**
     * Test if size has a unit, otherwise appends the passed unit string, or the default for this Element.
     * @param size {Object} The size to set
     * @param units {String} The units to append to a numeric size value
     * @private
     * @static
     */
    addUnits: function(size, units) {
        // Most common case first: Size is set to a number
        if (typeof size == 'number') {
            return size + (units || this.defaultUnit || 'px');
        }

        // Size set to a value which means "auto"
        if (size === "" || size == "auto" || size === undefined || size === null) {
            return size || '';
        }

        // Otherwise, warn if it's not a valid CSS measurement
        if (!this.unitRe.test(size)) {
            if (Ext.isDefined(Ext.global.console)) {
                Ext.global.console.warn("Warning, size detected as NaN on Element.addUnits.");
            }
            return size || '';
        }

        return size;
    },

    /**
     * @static
     * @private
     */
    isAncestor: function(p, c) {
        var ret = false;

        p = Ext.getDom(p);
        c = Ext.getDom(c);
        if (p && c) {
            if (p.contains) {
                return p.contains(c);
            } else if (p.compareDocumentPosition) {
                return !!(p.compareDocumentPosition(c) & 16);
            } else {
                while ((c = c.parentNode)) {
                    ret = c == p || ret;
                }
            }
        }
        return ret;
    },

    /**
     * Parses a number or string representing margin sizes into an object. Supports CSS-style margin declarations
     * (e.g. 10, "10", "10 10", "10 10 10" and "10 10 10 10" are all valid options and would return the same result)
     * @static
     * @param {Number/String} box The encoded margins
     * @return {Object} An object with margin sizes for top, right, bottom and left
     */
    parseBox: function(box) {
        if (typeof box != 'string') {
            box = box.toString();
        }
        var parts  = box.split(' '),
            ln = parts.length;

        if (ln == 1) {
            parts[1] = parts[2] = parts[3] = parts[0];
        }
        else if (ln == 2) {
            parts[2] = parts[0];
            parts[3] = parts[1];
        }
        else if (ln == 3) {
            parts[3] = parts[1];
        }

        return {
            top   :parseFloat(parts[0]) || 0,
            right :parseFloat(parts[1]) || 0,
            bottom:parseFloat(parts[2]) || 0,
            left  :parseFloat(parts[3]) || 0
        };
    },

    /**
     * Parses a number or string representing margin sizes into an object. Supports CSS-style margin declarations
     * (e.g. 10, "10", "10 10", "10 10 10" and "10 10 10 10" are all valid options and would return the same result)
     * @static
     * @param {Number/String} box The encoded margins
     * @param {String} units The type of units to add
     * @return {String} An string with unitized (px if units is not specified) metrics for top, right, bottom and left
     */
    unitizeBox: function(box, units) {
        var a = this.addUnits,
            b = this.parseBox(box);

        return a(b.top, units) + ' ' +
               a(b.right, units) + ' ' +
               a(b.bottom, units) + ' ' +
               a(b.left, units);

    },

    // private
    camelReplaceFn: function(m, a) {
        return a.charAt(1).toUpperCase();
    },

    /**
     * Normalizes CSS property keys from dash delimited to camel case JavaScript Syntax.
     * For example:
     *
     * - border-width -> borderWidth
     * - padding-top -> paddingTop
     *
     * @static
     * @param {String} prop The property to normalize
     * @return {String} The normalized string
     */
    normalize: function(prop) {
        // TODO: Mobile optimization?
        if (prop == 'float') {
            prop = Ext.supports.Float ? 'cssFloat' : 'styleFloat';
        }
        return this.propertyCache[prop] || (this.propertyCache[prop] = prop.replace(this.camelRe, this.camelReplaceFn));
    },

    /**
     * Retrieves the document height
     * @static
     * @return {Number} documentHeight
     */
    getDocumentHeight: function() {
        return Math.max(!Ext.isStrict ? document.body.scrollHeight : document.documentElement.scrollHeight, this.getViewportHeight());
    },

    /**
     * Retrieves the document width
     * @static
     * @return {Number} documentWidth
     */
    getDocumentWidth: function() {
        return Math.max(!Ext.isStrict ? document.body.scrollWidth : document.documentElement.scrollWidth, this.getViewportWidth());
    },

    /**
     * Retrieves the viewport height of the window.
     * @static
     * @return {Number} viewportHeight
     */
    getViewportHeight: function(){
        return window.innerHeight;
    },

    /**
     * Retrieves the viewport width of the window.
     * @static
     * @return {Number} viewportWidth
     */
    getViewportWidth: function() {
        return window.innerWidth;
    },

    /**
     * Retrieves the viewport size of the window.
     * @static
     * @return {Object} object containing width and height properties
     */
    getViewSize: function() {
        return {
            width: window.innerWidth,
            height: window.innerHeight
        };
    },

    /**
     * Retrieves the current orientation of the window. This is calculated by
     * determing if the height is greater than the width.
     * @static
     * @return {String} Orientation of window: 'portrait' or 'landscape'
     */
    getOrientation: function() {
        if (Ext.supports.OrientationChange) {
            return (window.orientation == 0) ? 'portrait' : 'landscape';
        }

        return (window.innerHeight > window.innerWidth) ? 'portrait' : 'landscape';
    },

    /**
     * Returns the top Element that is located at the passed coordinates
     * @static
     * @param {Number} x The x coordinate
     * @param {Number} y The y coordinate
     * @return {String} The found Element
     */
    fromPoint: function(x, y) {
        return Ext.get(document.elementFromPoint(x, y));
    },

    /**
     * Converts a CSS string into an object with a property for each style.
     *
     * The sample code below would return an object with 2 properties, one
     * for background-color and one for color.
     *
     *     var css = 'background-color: red;color: blue; ';
     *     console.log(Ext.dom.Element.parseStyles(css));
     *
     * @static
     * @param {String} styles A CSS string
     * @return {Object} styles
     */
    parseStyles: function(styles){
        var out = {},
            cssRe = this.cssRe,
            matches;

        if (styles) {
            // Since we're using the g flag on the regex, we need to set the lastIndex.
            // This automatically happens on some implementations, but not others, see:
            // http://stackoverflow.com/questions/2645273/javascript-regular-expression-literal-persists-between-function-calls
            // http://blog.stevenlevithan.com/archives/fixing-javascript-regexp
            cssRe.lastIndex = 0;
            while ((matches = cssRe.exec(styles))) {
                out[matches[1]] = matches[2];
            }
        }
        return out;
    }
});

//TODO Need serious cleanups
(function(){
    var doc = document,
        AbstractElement = Ext.dom.AbstractElement,
        activeElement = null,
        isCSS1 = doc.compatMode == "CSS1Compat",
        flyInstance,
        fly = function (el) {
            if (!flyInstance) {
                flyInstance = new AbstractElement.Fly();
            }
            flyInstance.attach(el);
            return flyInstance;
        };

    // If the browser does not support document.activeElement we need some assistance.
    // This covers old Safari 3.2 (4.0 added activeElement along with just about all
    // other browsers). We need this support to handle issues with old Safari.
    if (!('activeElement' in doc) && doc.addEventListener) {
        doc.addEventListener('focus',
            function (ev) {
                if (ev && ev.target) {
                    activeElement = (ev.target == doc) ? null : ev.target;
                }
            }, true);
    }

    /*
     * Helper function to create the function that will restore the selection.
     */
    function makeSelectionRestoreFn (activeEl, start, end) {
        return function () {
            activeEl.selectionStart = start;
            activeEl.selectionEnd = end;
        };
    }

    AbstractElement.addInheritableStatics({
        /**
         * Returns the active element in the DOM. If the browser supports activeElement
         * on the document, this is returned. If not, the focus is tracked and the active
         * element is maintained internally.
         * @return {HTMLElement} The active (focused) element in the document.
         */
        getActiveElement: function () {
            return doc.activeElement || activeElement;
        },

        /**
         * Creates a function to call to clean up problems with the work-around for the
         * WebKit RightMargin bug. The work-around is to add "display: 'inline-block'" to
         * the element before calling getComputedStyle and then to restore its original
         * display value. The problem with this is that it corrupts the selection of an
         * INPUT or TEXTAREA element (as in the "I-beam" goes away but ths focus remains).
         * To cleanup after this, we need to capture the selection of any such element and
         * then restore it after we have restored the display style.
         *
         * @param {Ext.dom.Element} target The top-most element being adjusted.
         * @private
         */
        getRightMarginFixCleaner: function (target) {
            var supports = Ext.supports,
                hasInputBug = supports.DisplayChangeInputSelectionBug,
                hasTextAreaBug = supports.DisplayChangeTextAreaSelectionBug,
                activeEl,
                tag,
                start,
                end;

            if (hasInputBug || hasTextAreaBug) {
                activeEl = doc.activeElement || activeElement; // save a call
                tag = activeEl && activeEl.tagName;

                if ((hasTextAreaBug && tag == 'TEXTAREA') ||
                    (hasInputBug && tag == 'INPUT' && activeEl.type == 'text')) {
                    if (Ext.dom.Element.isAncestor(target, activeEl)) {
                        start = activeEl.selectionStart;
                        end = activeEl.selectionEnd;

                        if (Ext.isNumber(start) && Ext.isNumber(end)) { // to be safe...
                            // We don't create the raw closure here inline because that
                            // will be costly even if we don't want to return it (nested
                            // function decls and exprs are often instantiated on entry
                            // regardless of whether execution ever reaches them):
                            return makeSelectionRestoreFn(activeEl, start, end);
                        }
                    }
                }
            }

            return Ext.emptyFn; // avoid special cases, just return a nop
        },

        getViewWidth: function(full) {
            return full ? Ext.dom.Element.getDocumentWidth() : Ext.dom.Element.getViewportWidth();
        },

        getViewHeight: function(full) {
            return full ? Ext.dom.Element.getDocumentHeight() : Ext.dom.Element.getViewportHeight();
        },

        getDocumentHeight: function() {
            return Math.max(!isCSS1 ? doc.body.scrollHeight : doc.documentElement.scrollHeight, Ext.dom.Element.getViewportHeight());
        },

        getDocumentWidth: function() {
            return Math.max(!isCSS1 ? doc.body.scrollWidth : doc.documentElement.scrollWidth, Ext.dom.Element.getViewportWidth());
        },

        getViewportHeight: function(){
            return Ext.isIE ?
                   (Ext.isStrict ? doc.documentElement.clientHeight : doc.body.clientHeight) :
                   self.innerHeight;
        },

        getViewportWidth: function() {
            return (!Ext.isStrict && !Ext.isOpera) ? doc.body.clientWidth :
                   Ext.isIE ? doc.documentElement.clientWidth : self.innerWidth;
        },

        getY: function(el) {
            return Ext.dom.Element.getXY(el)[1];
        },

        getX: function(el) {
            return Ext.dom.Element.getXY(el)[0];
        },

        getXY: function(el) {
            var bd = doc.body,
                docEl = doc.documentElement,
                leftBorder = 0,
                topBorder = 0,
                ret = [0,0],
                round = Math.round,
                box,
                scroll;

            el = Ext.getDom(el);

            if(el != doc && el != bd){
                // IE has the potential to throw when getBoundingClientRect called
                // on element not attached to dom
                if (Ext.isIE) {
                    try {
                        box = el.getBoundingClientRect();
                        // In some versions of IE, the documentElement (HTML element) will have a 2px border that gets included, so subtract it off
                        topBorder = docEl.clientTop || bd.clientTop;
                        leftBorder = docEl.clientLeft || bd.clientLeft;
                    } catch (ex) {
                        box = { left: 0, top: 0 };
                    }
                } else {
                    box = el.getBoundingClientRect();
                }

                scroll = fly(document).getScroll();
                ret = [round(box.left + scroll.left - leftBorder), round(box.top + scroll.top - topBorder)];
            }
            return ret;
        },

        setXY: function(el, xy) {
            (el = Ext.fly(el, '_setXY')).position();

            var pts = el.translatePoints(xy),
                style = el.dom.style,
                pos;

            for (pos in pts) {
                if (!isNaN(pts[pos])) {
                    style[pos] = pts[pos] + "px";
                }
            }
        },

        setX: function(el, x) {
            Ext.dom.Element.setXY(el, [x, false]);
        },

        setY: function(el, y) {
            Ext.dom.Element.setXY(el, [false, y]);
        },

        /**
         * Serializes a DOM form into a url encoded string
         * @param {Object} form The form
         * @return {String} The url encoded form
         */
        serializeForm: function(form) {
            var fElements = form.elements || (document.forms[form] || Ext.getDom(form)).elements,
                hasSubmit = false,
                encoder   = encodeURIComponent,
                data      = '',
                eLen      = fElements.length,
                element, name, type, options, hasValue, e,
                o, oLen, opt;

            for (e = 0; e < eLen; e++) {
                element = fElements[e];
                name    = element.name;
                type    = element.type;
                options = element.options;

                if (!element.disabled && name) {
                    if (/select-(one|multiple)/i.test(type)) {
                        oLen = options.length;
                        for (o = 0; o < oLen; o++) {
                            opt = options[o];
                            if (opt.selected) {
                                hasValue = opt.hasAttribute ? opt.hasAttribute('value') : opt.getAttributeNode('value').specified;
                                data += Ext.String.format("{0}={1}&", encoder(name), encoder(hasValue ? opt.value : opt.text));
                            }
                        }
                    } else if (!(/file|undefined|reset|button/i.test(type))) {
                        if (!(/radio|checkbox/i.test(type) && !element.checked) && !(type == 'submit' && hasSubmit)) {
                            data += encoder(name) + '=' + encoder(element.value) + '&';
                            hasSubmit = /submit/i.test(type);
                        }
                    }
                }
            }
            return data.substr(0, data.length - 1);
        }
    });
}());

/**
 * @class Ext.dom.AbstractElement
 */
Ext.dom.AbstractElement.override({

    /**
     * Gets the x,y coordinates specified by the anchor position on the element.
     * @param {String} [anchor] The specified anchor position (defaults to "c").  See {@link Ext.dom.Element#alignTo}
     * for details on supported anchor positions.
     * @param {Boolean} [local] True to get the local (element top/left-relative) anchor position instead
     * of page coordinates
     * @param {Object} [size] An object containing the size to use for calculating anchor position
     * {width: (target width), height: (target height)} (defaults to the element's current size)
     * @return {Array} [x, y] An array containing the element's x and y coordinates
     */
    getAnchorXY: function(anchor, local, size) {
        //Passing a different size is useful for pre-calculating anchors,
        //especially for anchored animations that change the el size.
        anchor = (anchor || "tl").toLowerCase();
        size = size || {};

        var me = this,
            vp = me.dom == document.body || me.dom == document,
            width = size.width || vp ? window.innerWidth: me.getWidth(),
            height = size.height || vp ? window.innerHeight: me.getHeight(),
            xy,
            rnd = Math.round,
            myXY = me.getXY(),
            extraX = vp ? 0: !local ? myXY[0] : 0,
            extraY = vp ? 0: !local ? myXY[1] : 0,
            hash = {
                c: [rnd(width * 0.5), rnd(height * 0.5)],
                t: [rnd(width * 0.5), 0],
                l: [0, rnd(height * 0.5)],
                r: [width, rnd(height * 0.5)],
                b: [rnd(width * 0.5), height],
                tl: [0, 0],
                bl: [0, height],
                br: [width, height],
                tr: [width, 0]
            };

        xy = hash[anchor];
        return [xy[0] + extraX, xy[1] + extraY];
    },

    alignToRe: /^([a-z]+)-([a-z]+)(\?)?$/,

    /**
     * Gets the x,y coordinates to align this element with another element. See {@link Ext.dom.Element#alignTo} for more info on the
     * supported position values.
     * @param {Ext.Element/HTMLElement/String} element The element to align to.
     * @param {String} [position="tl-bl?"] The position to align to.
     * @param {Array} [offsets=[0,0]] Offset the positioning by [x, y]
     * @return {Array} [x, y]
     */
    getAlignToXY: function(el, position, offsets, local) {
        local = !!local;
        el = Ext.get(el);

        if (!el || !el.dom) {
            throw new Error("Element.alignToXY with an element that doesn't exist");
        }
        offsets = offsets || [0, 0];

        if (!position || position == '?') {
            position = 'tl-bl?';
        }
        else if (! (/-/).test(position) && position !== "") {
            position = 'tl-' + position;
        }
        position = position.toLowerCase();

        var me = this,
            matches = position.match(this.alignToRe),
            dw = window.innerWidth,
            dh = window.innerHeight,
            p1 = "",
            p2 = "",
            a1,
            a2,
            x,
            y,
            swapX,
            swapY,
            p1x,
            p1y,
            p2x,
            p2y,
            width,
            height,
            region,
            constrain;

        if (!matches) {
            throw "Element.alignTo with an invalid alignment " + position;
        }

        p1 = matches[1];
        p2 = matches[2];
        constrain = !!matches[3];

        //Subtract the aligned el's internal xy from the target's offset xy
        //plus custom offset to get the aligned el's new offset xy
        a1 = me.getAnchorXY(p1, true);
        a2 = el.getAnchorXY(p2, local);

        x = a2[0] - a1[0] + offsets[0];
        y = a2[1] - a1[1] + offsets[1];

        if (constrain) {
            width = me.getWidth();
            height = me.getHeight();

            region = el.getPageBox();

            //If we are at a viewport boundary and the aligned el is anchored on a target border that is
            //perpendicular to the vp border, allow the aligned el to slide on that border,
            //otherwise swap the aligned el to the opposite border of the target.
            p1y = p1.charAt(0);
            p1x = p1.charAt(p1.length - 1);
            p2y = p2.charAt(0);
            p2x = p2.charAt(p2.length - 1);

            swapY = ((p1y == "t" && p2y == "b") || (p1y == "b" && p2y == "t"));
            swapX = ((p1x == "r" && p2x == "l") || (p1x == "l" && p2x == "r"));

            if (x + width > dw) {
                x = swapX ? region.left - width: dw - width;
            }
            if (x < 0) {
                x = swapX ? region.right: 0;
            }
            if (y + height > dh) {
                y = swapY ? region.top - height: dh - height;
            }
            if (y < 0) {
                y = swapY ? region.bottom: 0;
            }
        }

        return [x, y];
    },

    // private
    getAnchor: function(){
        var data = (this.$cache || this.getCache()).data,
            anchor;
            
        if (!this.dom) {
            return;
        }
        anchor = data._anchor;

        if(!anchor){
            anchor = data._anchor = {};
        }
        return anchor;
    },

    // private ==>  used outside of core
    adjustForConstraints: function(xy, parent) {
        var vector = this.getConstrainVector(parent, xy);
        if (vector) {
            xy[0] += vector[0];
            xy[1] += vector[1];
        }
        return xy;
    }

});

/**
 * @class Ext.dom.AbstractElement
 */
Ext.dom.AbstractElement.addMethods({
    /**
     * Appends the passed element(s) to this element
     * @param {String/HTMLElement/Ext.dom.AbstractElement} el
     * The id of the node, a DOM Node or an existing Element.
     * @return {Ext.dom.AbstractElement} This element
     */
    appendChild: function(el) {
        return Ext.get(el).appendTo(this);
    },

    /**
     * Appends this element to the passed element
     * @param {String/HTMLElement/Ext.dom.AbstractElement} el The new parent element.
     * The id of the node, a DOM Node or an existing Element.
     * @return {Ext.dom.AbstractElement} This element
     */
    appendTo: function(el) {
        Ext.getDom(el).appendChild(this.dom);
        return this;
    },

    /**
     * Inserts this element before the passed element in the DOM
     * @param {String/HTMLElement/Ext.dom.AbstractElement} el The element before which this element will be inserted.
     * The id of the node, a DOM Node or an existing Element.
     * @return {Ext.dom.AbstractElement} This element
     */
    insertBefore: function(el) {
        el = Ext.getDom(el);
        el.parentNode.insertBefore(this.dom, el);
        return this;
    },

    /**
     * Inserts this element after the passed element in the DOM
     * @param {String/HTMLElement/Ext.dom.AbstractElement} el The element to insert after.
     * The id of the node, a DOM Node or an existing Element.
     * @return {Ext.dom.AbstractElement} This element
     */
    insertAfter: function(el) {
        el = Ext.getDom(el);
        el.parentNode.insertBefore(this.dom, el.nextSibling);
        return this;
    },

    /**
     * Inserts (or creates) an element (or DomHelper config) as the first child of this element
     * @param {String/HTMLElement/Ext.dom.AbstractElement/Object} el The id or element to insert or a DomHelper config
     * to create and insert
     * @return {Ext.dom.AbstractElement} The new child
     */
    insertFirst: function(el, returnDom) {
        el = el || {};
        if (el.nodeType || el.dom || typeof el == 'string') { // element
            el = Ext.getDom(el);
            this.dom.insertBefore(el, this.dom.firstChild);
            return !returnDom ? Ext.get(el) : el;
        }
        else { // dh config
            return this.createChild(el, this.dom.firstChild, returnDom);
        }
    },

    /**
     * Inserts (or creates) the passed element (or DomHelper config) as a sibling of this element
     * @param {String/HTMLElement/Ext.dom.AbstractElement/Object/Array} el The id, element to insert or a DomHelper config
     * to create and insert *or* an array of any of those.
     * @param {String} [where='before'] 'before' or 'after'
     * @param {Boolean} [returnDom=false] True to return the .;ll;l,raw DOM element instead of Ext.dom.AbstractElement
     * @return {Ext.dom.AbstractElement} The inserted Element. If an array is passed, the last inserted element is returned.
     */
    insertSibling: function(el, where, returnDom){
        var me      = this,
            isAfter = (where || 'before').toLowerCase() == 'after',
            rt, insertEl, eLen, e;

        if (Ext.isArray(el)) {
            insertEl = me;
            eLen = el.length;
            
            for (e = 0; e < eLen; e++) {
                rt = Ext.fly(insertEl, '_internal').insertSibling(el[e], where, returnDom);

                if (isAfter) {
                    insertEl = rt;
                }
            }

            return rt;
        }

        el = el || {};

        if(el.nodeType || el.dom){
            rt = me.dom.parentNode.insertBefore(Ext.getDom(el), isAfter ? me.dom.nextSibling : me.dom);
            if (!returnDom) {
                rt = Ext.get(rt);
            }
        }else{
            if (isAfter && !me.dom.nextSibling) {
                rt = Ext.core.DomHelper.append(me.dom.parentNode, el, !returnDom);
            } else {
                rt = Ext.core.DomHelper[isAfter ? 'insertAfter' : 'insertBefore'](me.dom, el, !returnDom);
            }
        }
        return rt;
    },

    /**
     * Replaces the passed element with this element
     * @param {String/HTMLElement/Ext.dom.AbstractElement} el The element to replace.
     * The id of the node, a DOM Node or an existing Element.
     * @return {Ext.dom.AbstractElement} This element
     */
    replace: function(el) {
        el = Ext.get(el);
        this.insertBefore(el);
        el.remove();
        return this;
    },

    /**
     * Replaces this element with the passed element
     * @param {String/HTMLElement/Ext.dom.AbstractElement/Object} el The new element (id of the node, a DOM Node
     * or an existing Element) or a DomHelper config of an element to create
     * @return {Ext.dom.AbstractElement} This element
     */
    replaceWith: function(el){
        var me = this;

        if(el.nodeType || el.dom || typeof el == 'string'){
            el = Ext.get(el);
            me.dom.parentNode.insertBefore(el, me.dom);
        }else{
            el = Ext.core.DomHelper.insertBefore(me.dom, el);
        }

        delete Ext.cache[me.id];
        Ext.removeNode(me.dom);
        me.id = Ext.id(me.dom = el);
        Ext.dom.AbstractElement.addToCache(me.isFlyweight ? new Ext.dom.AbstractElement(me.dom) : me);
        return me;
    },

    /**
     * Creates the passed DomHelper config and appends it to this element or optionally inserts it before the passed child element.
     * @param {Object} config DomHelper element config object.  If no tag is specified (e.g., {tag:'input'}) then a div will be
     * automatically generated with the specified attributes.
     * @param {HTMLElement} [insertBefore] a child element of this element
     * @param {Boolean} [returnDom=false] true to return the dom node instead of creating an Element
     * @return {Ext.dom.AbstractElement} The new child element
     */
    createChild: function(config, insertBefore, returnDom) {
        config = config || {tag:'div'};
        if (insertBefore) {
            return Ext.core.DomHelper.insertBefore(insertBefore, config, returnDom !== true);
        }
        else {
            return Ext.core.DomHelper[!this.dom.firstChild ? 'insertFirst' : 'append'](this.dom, config,  returnDom !== true);
        }
    },

    /**
     * Creates and wraps this element with another element
     * @param {Object} [config] DomHelper element config object for the wrapper element or null for an empty div
     * @param {Boolean} [returnDom=false] True to return the raw DOM element instead of Ext.dom.AbstractElement
     * @param {String} [selector] A {@link Ext.dom.Query DomQuery} selector to select a descendant node within the created element to use as the wrapping element.
     * @return {HTMLElement/Ext.dom.AbstractElement} The newly created wrapper element
     */
    wrap: function(config, returnDom, selector) {
        var newEl = Ext.core.DomHelper.insertBefore(this.dom, config || {tag: "div"}, true),
            target = newEl;
        
        if (selector) {
            target = Ext.DomQuery.selectNode(selector, newEl.dom);
        }

        target.appendChild(this.dom);
        return returnDom ? newEl.dom : newEl;
    },

    /**
     * Inserts an html fragment into this element
     * @param {String} where Where to insert the html in relation to this element - beforeBegin, afterBegin, beforeEnd, afterEnd.
     * See {@link Ext.dom.Helper#insertHtml} for details.
     * @param {String} html The HTML fragment
     * @param {Boolean} [returnEl=false] True to return an Ext.dom.AbstractElement
     * @return {HTMLElement/Ext.dom.AbstractElement} The inserted node (or nearest related if more than 1 inserted)
     */
    insertHtml: function(where, html, returnEl) {
        var el = Ext.core.DomHelper.insertHtml(where, this.dom, html);
        return returnEl ? Ext.get(el) : el;
    }
});

/**
 * @class Ext.dom.AbstractElement
 */
(function(){

var Element = Ext.dom.AbstractElement;

Element.override({

    /**
     * Gets the current X position of the element based on page coordinates.  Element must be part of the DOM
     * tree to have page coordinates (display:none or elements not appended return false).
     * @return {Number} The X position of the element
     */
    getX: function(el) {
        return this.getXY(el)[0];
    },

    /**
     * Gets the current Y position of the element based on page coordinates.  Element must be part of the DOM
     * tree to have page coordinates (display:none or elements not appended return false).
     * @return {Number} The Y position of the element
     */
    getY: function(el) {
        return this.getXY(el)[1];
    },

    /**
     * Gets the current position of the element based on page coordinates.  Element must be part of the DOM
     * tree to have page coordinates (display:none or elements not appended return false).
     * @return {Array} The XY position of the element
     */
    getXY: function() {
        // @FEATUREDETECT
        var point = window.webkitConvertPointFromNodeToPage(this.dom, new WebKitPoint(0, 0));
        return [point.x, point.y];
    },

    /**
     * Returns the offsets of this element from the passed element. Both element must be part of the DOM
     * tree and not have display:none to have page coordinates.
     * @param {Ext.Element/HTMLElement/String} element The element to get the offsets from.
     * @return {Array} The XY page offsets (e.g. [100, -200])
     */
    getOffsetsTo: function(el){
        var o = this.getXY(),
            e = Ext.fly(el, '_internal').getXY();
        return [o[0]-e[0],o[1]-e[1]];
    },

    /**
     * Sets the X position of the element based on page coordinates.  Element must be part of the DOM tree
     * to have page coordinates (display:none or elements not appended return false).
     * @param {Number} The X position of the element
     * @param {Boolean/Object} [animate] True for the default animation, or a standard Element
     * animation config object
     * @return {Ext.dom.AbstractElement} this
     */
    setX: function(x){
        return this.setXY([x, this.getY()]);
    },

    /**
     * Sets the Y position of the element based on page coordinates.  Element must be part of the DOM tree
     * to have page coordinates (display:none or elements not appended return false).
     * @param {Number} The Y position of the element
     * @param {Boolean/Object} [animate] True for the default animation, or a standard Element
     * animation config object
     * @return {Ext.dom.AbstractElement} this
     */
    setY: function(y) {
        return this.setXY([this.getX(), y]);
    },

    /**
     * Sets the element's left position directly using CSS style (instead of {@link #setX}).
     * @param {String} left The left CSS property value
     * @return {Ext.dom.AbstractElement} this
     */
    setLeft: function(left) {
        this.setStyle('left', Element.addUnits(left));
        return this;
    },

    /**
     * Sets the element's top position directly using CSS style (instead of {@link #setY}).
     * @param {String} top The top CSS property value
     * @return {Ext.dom.AbstractElement} this
     */
    setTop: function(top) {
        this.setStyle('top', Element.addUnits(top));
        return this;
    },

    /**
     * Sets the element's CSS right style.
     * @param {String} right The right CSS property value
     * @return {Ext.dom.AbstractElement} this
     */
    setRight: function(right) {
        this.setStyle('right', Element.addUnits(right));
        return this;
    },

    /**
     * Sets the element's CSS bottom style.
     * @param {String} bottom The bottom CSS property value
     * @return {Ext.dom.AbstractElement} this
     */
    setBottom: function(bottom) {
        this.setStyle('bottom', Element.addUnits(bottom));
        return this;
    },

    /**
     * Sets the position of the element in page coordinates, regardless of how the element is positioned.
     * The element must be part of the DOM tree to have page coordinates (display:none or elements not appended return false).
     * @param {Array} pos Contains X & Y [x, y] values for new position (coordinates are page-based)
     * @param {Boolean/Object} [animate] True for the default animation, or a standard Element animation config object
     * @return {Ext.dom.AbstractElement} this
     */
    setXY: function(pos) {
        var me = this,
            pts,
            style,
            pt;

        if (arguments.length > 1) {
            pos = [pos, arguments[1]];
        }

        // me.position();
        pts = me.translatePoints(pos);
        style = me.dom.style;

        for (pt in pts) {
            if (!pts.hasOwnProperty(pt)) {
                continue;
            }
            if (!isNaN(pts[pt])) {
                style[pt] = pts[pt] + "px";
            }
        }
        return me;
    },

    /**
     * Gets the left X coordinate
     * @param {Boolean} local True to get the local css position instead of page coordinate
     * @return {Number}
     */
    getLeft: function(local) {
        return parseInt(this.getStyle('left'), 10) || 0;
    },

    /**
     * Gets the right X coordinate of the element (element X position + element width)
     * @param {Boolean} local True to get the local css position instead of page coordinate
     * @return {Number}
     */
    getRight: function(local) {
        return parseInt(this.getStyle('right'), 10) || 0;
    },

    /**
     * Gets the top Y coordinate
     * @param {Boolean} local True to get the local css position instead of page coordinate
     * @return {Number}
     */
    getTop: function(local) {
        return parseInt(this.getStyle('top'), 10) || 0;
    },

    /**
     * Gets the bottom Y coordinate of the element (element Y position + element height)
     * @param {Boolean} local True to get the local css position instead of page coordinate
     * @return {Number}
     */
    getBottom: function(local) {
        return parseInt(this.getStyle('bottom'), 10) || 0;
    },

    /**
     * Translates the passed page coordinates into left/top css values for this element
     * @param {Number/Array} x The page x or an array containing [x, y]
     * @param {Number} [y] The page y, required if x is not an array
     * @return {Object} An object with left and top properties. e.g. {left: (value), top: (value)}
     */
    translatePoints: function(x, y) {
        y = isNaN(x[1]) ? y : x[1];
        x = isNaN(x[0]) ? x : x[0];
        var me = this,
            relative = me.isStyle('position', 'relative'),
            o = me.getXY(),
            l = parseInt(me.getStyle('left'), 10),
            t = parseInt(me.getStyle('top'), 10);

        l = !isNaN(l) ? l : (relative ? 0 : me.dom.offsetLeft);
        t = !isNaN(t) ? t : (relative ? 0 : me.dom.offsetTop);

        return {left: (x - o[0] + l), top: (y - o[1] + t)};
    },

    /**
     * Sets the element's box. Use getBox() on another element to get a box obj.
     * If animate is true then width, height, x and y will be animated concurrently.
     * @param {Object} box The box to fill {x, y, width, height}
     * @param {Boolean} [adjust] Whether to adjust for box-model issues automatically
     * @param {Boolean/Object} [animate] true for the default animation or a standard
     * Element animation config object
     * @return {Ext.dom.AbstractElement} this
     */
    setBox: function(box) {
        var me = this,
            width = box.width,
            height = box.height,
            top = box.top,
            left = box.left;

        if (left !== undefined) {
            me.setLeft(left);
        }
        if (top !== undefined) {
            me.setTop(top);
        }
        if (width !== undefined) {
            me.setWidth(width);
        }
        if (height !== undefined) {
            me.setHeight(height);
        }

        return this;
    },

    /**
     * Return an object defining the area of this Element which can be passed to {@link #setBox} to
     * set another Element's size/location to match this element.
     *
     * @param {Boolean} [contentBox] If true a box for the content of the element is returned.
     * @param {Boolean} [local] If true the element's left and top are returned instead of page x/y.
     * @return {Object} box An object in the format:
     *
     *     {
     *         x: <Element's X position>,
     *         y: <Element's Y position>,
     *         width: <Element's width>,
     *         height: <Element's height>,
     *         bottom: <Element's lower bound>,
     *         right: <Element's rightmost bound>
     *     }
     *
     * The returned object may also be addressed as an Array where index 0 contains the X position
     * and index 1 contains the Y position. So the result may also be used for {@link #setXY}
     */
    getBox: function(contentBox, local) {
        var me = this,
            dom = me.dom,
            width = dom.offsetWidth,
            height = dom.offsetHeight,
            xy, box, l, r, t, b;

        if (!local) {
            xy = me.getXY();
        }
        else if (contentBox) {
            xy = [0,0];
        }
        else {
            xy = [parseInt(me.getStyle("left"), 10) || 0, parseInt(me.getStyle("top"), 10) || 0];
        }

        if (!contentBox) {
            box = {
                x: xy[0],
                y: xy[1],
                0: xy[0],
                1: xy[1],
                width: width,
                height: height
            };
        }
        else {
            l = me.getBorderWidth.call(me, "l") + me.getPadding.call(me, "l");
            r = me.getBorderWidth.call(me, "r") + me.getPadding.call(me, "r");
            t = me.getBorderWidth.call(me, "t") + me.getPadding.call(me, "t");
            b = me.getBorderWidth.call(me, "b") + me.getPadding.call(me, "b");
            box = {
                x: xy[0] + l,
                y: xy[1] + t,
                0: xy[0] + l,
                1: xy[1] + t,
                width: width - (l + r),
                height: height - (t + b)
            };
        }

        box.left = box.x;
        box.top = box.y;
        box.right = box.x + box.width;
        box.bottom = box.y + box.height;

        return box;
    },

    /**
     * Return an object defining the area of this Element which can be passed to {@link #setBox} to
     * set another Element's size/location to match this element.
     *
     * @param {Boolean} [asRegion] If true an Ext.util.Region will be returned
     * @return {Object} box An object in the format
     *
     *     {
     *         left: <Element's X position>,
     *         top: <Element's Y position>,
     *         width: <Element's width>,
     *         height: <Element's height>,
     *         bottom: <Element's lower bound>,
     *         right: <Element's rightmost bound>
     *     }
     *
     * The returned object may also be addressed as an Array where index 0 contains the X position
     * and index 1 contains the Y position. So the result may also be used for {@link #setXY}
     */
    getPageBox: function(getRegion) {
        var me = this,
            el = me.dom,
            w = el.offsetWidth,
            h = el.offsetHeight,
            xy = me.getXY(),
            t = xy[1],
            r = xy[0] + w,
            b = xy[1] + h,
            l = xy[0];

        if (!el) {
            return new Ext.util.Region();
        }

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
    }
});

}());

/**
 * @class Ext.dom.AbstractElement
 */
(function(){
    // local style camelizing for speed
    var Element = Ext.dom.AbstractElement,
        view = document.defaultView,
        array = Ext.Array,
        trimRe = /^\s+|\s+$/g,
        wordsRe = /\w/g,
        spacesRe = /\s+/,
        transparentRe = /^(?:transparent|(?:rgba[(](?:\s*\d+\s*[,]){3}\s*0\s*[)]))$/i,
        hasClassList = Ext.supports.ClassList,
        PADDING = 'padding',
        MARGIN = 'margin',
        BORDER = 'border',
        LEFT_SUFFIX = '-left',
        RIGHT_SUFFIX = '-right',
        TOP_SUFFIX = '-top',
        BOTTOM_SUFFIX = '-bottom',
        WIDTH = '-width',
        // special markup used throughout Ext when box wrapping elements
        borders = {l: BORDER + LEFT_SUFFIX + WIDTH, r: BORDER + RIGHT_SUFFIX + WIDTH, t: BORDER + TOP_SUFFIX + WIDTH, b: BORDER + BOTTOM_SUFFIX + WIDTH},
        paddings = {l: PADDING + LEFT_SUFFIX, r: PADDING + RIGHT_SUFFIX, t: PADDING + TOP_SUFFIX, b: PADDING + BOTTOM_SUFFIX},
        margins = {l: MARGIN + LEFT_SUFFIX, r: MARGIN + RIGHT_SUFFIX, t: MARGIN + TOP_SUFFIX, b: MARGIN + BOTTOM_SUFFIX};


    Element.override({

        /**
         * This shared object is keyed by style name (e.g., 'margin-left' or 'marginLeft'). The
         * values are objects with the following properties:
         *
         *  * `name` (String) : The actual name to be presented to the DOM. This is typically the value
         *      returned by {@link #normalize}.
         *  * `get` (Function) : A hook function that will perform the get on this style. These
         *      functions receive "(dom, el)" arguments. The `dom` parameter is the DOM Element
         *      from which to get ths tyle. The `el` argument (may be null) is the Ext.Element.
         *  * `set` (Function) : A hook function that will perform the set on this style. These
         *      functions receive "(dom, value, el)" arguments. The `dom` parameter is the DOM Element
         *      from which to get ths tyle. The `value` parameter is the new value for the style. The
         *      `el` argument (may be null) is the Ext.Element.
         *
         * The `this` pointer is the object that contains `get` or `set`, which means that
         * `this.name` can be accessed if needed. The hook functions are both optional.
         * @private
         */
        styleHooks: {},

        // private
        addStyles : function(sides, styles){
            var totalSize = 0,
                sidesArr = (sides || '').match(wordsRe),
                i,
                len = sidesArr.length,
                side,
                styleSides = [];

            if (len == 1) {
                totalSize = Math.abs(parseFloat(this.getStyle(styles[sidesArr[0]])) || 0);
            } else if (len) {
                for (i = 0; i < len; i++) {
                    side = sidesArr[i];
                    styleSides.push(styles[side]);
                }
                //Gather all at once, returning a hash
                styleSides = this.getStyle(styleSides);

                for (i=0; i < len; i++) {
                    side = sidesArr[i];
                    totalSize += Math.abs(parseFloat(styleSides[styles[side]]) || 0);
                }
            }

            return totalSize;
        },

        /**
         * Adds one or more CSS classes to the element. Duplicate classes are automatically filtered out.
         * @param {String/String[]} className The CSS classes to add separated by space, or an array of classes
         * @return {Ext.dom.Element} this
         * @method
         */
        addCls: hasClassList ?
            function (className) {
                if (String(className).indexOf('undefined') > -1) {
                    Ext.Logger.warn("called with an undefined className: " + className);
                }
                var me = this,
                    dom = me.dom,
                    classList,
                    newCls,
                    i,
                    len,
                    cls;

                if (typeof(className) == 'string') {
                    // split string on spaces to make an array of className
                    className = className.replace(trimRe, '').split(spacesRe);
                }

                // the gain we have here is that we can skip parsing className and use the
                // classList.contains method, so now O(M) not O(M+N)
                if (dom && className && !!(len = className.length)) {
                    if (!dom.className) {
                        dom.className = className.join(' ');
                    } else {
                        classList = dom.classList;
                        for (i = 0; i < len; ++i) {
                            cls = className[i];
                            if (cls) {
                                if (!classList.contains(cls)) {
                                    if (newCls) {
                                        newCls.push(cls);
                                    } else {
                                        newCls = dom.className.replace(trimRe, '');
                                        newCls = newCls ? [newCls, cls] : [cls];
                                    }
                                }
                            }
                        }

                        if (newCls) {
                            dom.className = newCls.join(' '); // write to DOM once
                        }
                    }
                }
                return me;
            } :
            function(className) {
                if (String(className).indexOf('undefined') > -1) {
                    Ext.Logger.warn("called with an undefined className: '" + className + "'");
                }
                var me = this,
                    dom = me.dom,
                    changed,
                    elClasses;

                if (dom && className && className.length) {
                    elClasses = Ext.Element.mergeClsList(dom.className, className);
                    if (elClasses.changed) {
                        dom.className = elClasses.join(' '); // write to DOM once
                    }
                }
                return me;
            },


        /**
         * Removes one or more CSS classes from the element.
         * @param {String/String[]} className The CSS classes to remove separated by space, or an array of classes
         * @return {Ext.dom.Element} this
         */
        removeCls: function(className) {
            var me = this,
                dom = me.dom,
                len,
                elClasses;

            if (typeof(className) == 'string') {
                // split string on spaces to make an array of className
                className = className.replace(trimRe, '').split(spacesRe);
            }

            if (dom && dom.className && className && !!(len = className.length)) {
                if (len == 1 && hasClassList) {
                    if (className[0]) {
                        dom.classList.remove(className[0]); // one DOM write
                    }
                } else {
                    elClasses = Ext.Element.removeCls(dom.className, className);
                    if (elClasses.changed) {
                        dom.className = elClasses.join(' ');
                    }
                }
            }
            return me;
        },

        /**
         * Adds one or more CSS classes to this element and removes the same class(es) from all siblings.
         * @param {String/String[]} className The CSS class to add, or an array of classes
         * @return {Ext.dom.Element} this
         */
        radioCls: function(className) {
            var cn = this.dom.parentNode.childNodes,
                v,
                i, len;
            className = Ext.isArray(className) ? className: [className];
            for (i = 0, len = cn.length; i < len; i++) {
                v = cn[i];
                if (v && v.nodeType == 1) {
                    Ext.fly(v, '_internal').removeCls(className);
                }
            }
            return this.addCls(className);
        },

        /**
         * Toggles the specified CSS class on this element (removes it if it already exists, otherwise adds it).
         * @param {String} className The CSS class to toggle
         * @return {Ext.dom.Element} this
         * @method
         */
        toggleCls: hasClassList ?
            function (className) {
                var me = this,
                    dom = me.dom;

                if (dom) {
                    className = className.replace(trimRe, '');
                    if (className) {
                        dom.classList.toggle(className);
                    }
                }

                return me;
            } :
            function(className) {
                var me = this;
                return me.hasCls(className) ? me.removeCls(className) : me.addCls(className);
            },

        /**
         * Checks if the specified CSS class exists on this element's DOM node.
         * @param {String} className The CSS class to check for
         * @return {Boolean} True if the class exists, else false
         * @method
         */
        hasCls: hasClassList ?
            function (className) {
                var dom = this.dom;
                return (dom && className) ? dom.classList.contains(className) : false;
            } :
            function(className) {
                var dom = this.dom;
                return dom ? className && (' '+dom.className+' ').indexOf(' '+className+' ') != -1 : false;
            },

        /**
         * Replaces a CSS class on the element with another.  If the old name does not exist, the new name will simply be added.
         * @param {String} oldClassName The CSS class to replace
         * @param {String} newClassName The replacement CSS class
         * @return {Ext.dom.Element} this
         */
        replaceCls: function(oldClassName, newClassName){
            return this.removeCls(oldClassName).addCls(newClassName);
        },

        /**
         * Checks if the current value of a style is equal to a given value.
         * @param {String} style property whose value is returned.
         * @param {String} value to check against.
         * @return {Boolean} true for when the current value equals the given value.
         */
        isStyle: function(style, val) {
            return this.getStyle(style) == val;
        },

        /**
         * Returns a named style property based on computed/currentStyle (primary) and
         * inline-style if primary is not available.
         *
         * @param {String/String[]} property The style property (or multiple property names
         * in an array) whose value is returned.
         * @param {Boolean} [inline=false] if `true` only inline styles will be returned.
         * @return {String/Object} The current value of the style property for this element
         * (or a hash of named style values if multiple property arguments are requested).
         * @method
         */
        getStyle: function (property, inline) {
            var me = this,
                dom = me.dom,
                multiple = typeof property != 'string',
                hooks = me.styleHooks,
                prop = property,
                props = prop,
                len = 1,
                domStyle, camel, values, hook, out, style, i;

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
                // Caution: Firefox will not render "presentation" (ie. computed styles) in
                // iframes that are display:none or those inheriting display:none. Similar
                // issues with legacy Safari.
                //
                style = dom.ownerDocument.defaultView.getComputedStyle(dom, null);

                // fallback to inline style if rendering context not available
                if (!style) {
                    inline = true;
                    style = domStyle;
                }
            }

            do {
                hook = hooks[prop];

                if (!hook) {
                    hooks[prop] = hook = { name: Element.normalize(prop) };
                }

                if (hook.get) {
                    out = hook.get(dom, me, inline, style);
                } else {
                    camel = hook.name;
                    out = style[camel];
                }

                if (!multiple) {
                   return out;
                }

                values[prop] = out;
                prop = props[++i];
            } while (i < len);

            return values;
        },

        getStyles: function () {
            var props = Ext.Array.slice(arguments),
                len = props.length,
                inline;

            if (len && typeof props[len-1] == 'boolean') {
                inline = props.pop();
            }

            return this.getStyle(props, inline);
        },

        /**
         * Returns true if the value of the given property is visually transparent. This
         * may be due to a 'transparent' style value or an rgba value with 0 in the alpha
         * component.
         * @param {String} prop The style property whose value is to be tested.
         * @return {Boolean} True if the style property is visually transparent.
         */
        isTransparent: function (prop) {
            var value = this.getStyle(prop);
            return value ? transparentRe.test(value) : false;
        },

        /**
         * Wrapper for setting style properties, also takes single object parameter of multiple styles.
         * @param {String/Object} property The style property to be set, or an object of multiple styles.
         * @param {String} [value] The value to apply to the given property, or null if an object was passed.
         * @return {Ext.dom.Element} this
         */
        setStyle: function(prop, value) {
            var me = this,
                dom = me.dom,
                hooks = me.styleHooks,
                style = dom.style,
                name = prop,
                hook;

            // we don't promote the 2-arg form to object-form to avoid the overhead...
            if (typeof name == 'string') {
                hook = hooks[name];
                if (!hook) {
                    hooks[name] = hook = { name: Element.normalize(name) };
                }
                value = (value == null) ? '' : value;
                if (hook.set) {
                    hook.set(dom, value, me);
                } else {
                    style[hook.name] = value;
                }
                if (hook.afterSet) {
                    hook.afterSet(dom, value, me);
                }
            } else {
                for (name in prop) {
                    if (prop.hasOwnProperty(name)) {
                        hook = hooks[name];
                        if (!hook) {
                            hooks[name] = hook = { name: Element.normalize(name) };
                        }
                        value = prop[name];
                        value = (value == null) ? '' : value;
                        if (hook.set) {
                            hook.set(dom, value, me);
                        } else {
                            style[hook.name] = value;
                        }
                        if (hook.afterSet) {
                            hook.afterSet(dom, value, me);
                        }
                    }
                }
            }

            return me;
        },

        /**
         * Returns the offset height of the element
         * @param {Boolean} [contentHeight] true to get the height minus borders and padding
         * @return {Number} The element's height
         */
        getHeight: function(contentHeight) {
            var dom = this.dom,
                height = contentHeight ? (dom.clientHeight - this.getPadding("tb")) : dom.offsetHeight;
            return height > 0 ? height: 0;
        },

        /**
         * Returns the offset width of the element
         * @param {Boolean} [contentWidth] true to get the width minus borders and padding
         * @return {Number} The element's width
         */
        getWidth: function(contentWidth) {
            var dom = this.dom,
                width = contentWidth ? (dom.clientWidth - this.getPadding("lr")) : dom.offsetWidth;
            return width > 0 ? width: 0;
        },

        /**
         * Set the width of this Element.
         * @param {Number/String} width The new width. This may be one of:
         *
         * - A Number specifying the new width in this Element's {@link #defaultUnit}s (by default, pixels).
         * - A String used to set the CSS width style. Animation may **not** be used.
         *
         * @param {Boolean/Object} [animate] true for the default animation or a standard Element animation config object
         * @return {Ext.dom.Element} this
         */
        setWidth: function(width) {
            var me = this;
                me.dom.style.width = Element.addUnits(width);
            return me;
        },

        /**
         * Set the height of this Element.
         *
         *     // change the height to 200px and animate with default configuration
         *     Ext.fly('elementId').setHeight(200, true);
         *
         *     // change the height to 150px and animate with a custom configuration
         *     Ext.fly('elId').setHeight(150, {
         *         duration : 500, // animation will have a duration of .5 seconds
         *         // will change the content to "finished"
         *         callback: function(){ this.{@link #update}("finished"); }
         *     });
         *
         * @param {Number/String} height The new height. This may be one of:
         *
         * - A Number specifying the new height in this Element's {@link #defaultUnit}s (by default, pixels.)
         * - A String used to set the CSS height style. Animation may **not** be used.
         *
         * @param {Boolean/Object} [animate] true for the default animation or a standard Element animation config object
         * @return {Ext.dom.Element} this
         */
        setHeight: function(height) {
            var me = this;
                me.dom.style.height = Element.addUnits(height);
            return me;
        },

        /**
         * Gets the width of the border(s) for the specified side(s)
         * @param {String} side Can be t, l, r, b or any combination of those to add multiple values. For example,
         * passing `'lr'` would get the border **l**eft width + the border **r**ight width.
         * @return {Number} The width of the sides passed added together
         */
        getBorderWidth: function(side){
            return this.addStyles(side, borders);
        },

        /**
         * Gets the width of the padding(s) for the specified side(s)
         * @param {String} side Can be t, l, r, b or any combination of those to add multiple values. For example,
         * passing `'lr'` would get the padding **l**eft + the padding **r**ight.
         * @return {Number} The padding of the sides passed added together
         */
        getPadding: function(side){
            return this.addStyles(side, paddings);
        },

        margins : margins,

        /**
         * More flexible version of {@link #setStyle} for setting style properties.
         * @param {String/Object/Function} styles A style specification string, e.g. "width:100px", or object in the form {width:"100px"}, or
         * a function which returns such a specification.
         * @return {Ext.dom.Element} this
         */
        applyStyles: function(styles) {
            if (styles) {
                var i,
                    len,
                    dom = this.dom;

                if (typeof styles == 'function') {
                    styles = styles.call();
                }
                if (typeof styles == 'string') {
                    styles = Ext.util.Format.trim(styles).split(/\s*(?::|;)\s*/);
                    for (i = 0, len = styles.length; i < len;) {
                        dom.style[Element.normalize(styles[i++])] = styles[i++];
                    }
                }
                else if (typeof styles == 'object') {
                    this.setStyle(styles);
                }
            }
        },

        /**
         * Set the size of this Element. If animation is true, both width and height will be animated concurrently.
         * @param {Number/String} width The new width. This may be one of:
         *
         * - A Number specifying the new width in this Element's {@link #defaultUnit}s (by default, pixels).
         * - A String used to set the CSS width style. Animation may **not** be used.
         * - A size object in the format `{width: widthValue, height: heightValue}`.
         *
         * @param {Number/String} height The new height. This may be one of:
         *
         * - A Number specifying the new height in this Element's {@link #defaultUnit}s (by default, pixels).
         * - A String used to set the CSS height style. Animation may **not** be used.
         *
         * @param {Boolean/Object} [animate] true for the default animation or a standard Element animation config object
         * @return {Ext.dom.Element} this
         */
        setSize: function(width, height) {
            var me = this,
                style = me.dom.style;

            if (Ext.isObject(width)) {
                // in case of object from getSize()
                height = width.height;
                width = width.width;
            }

            style.width = Element.addUnits(width);
            style.height = Element.addUnits(height);
            return me;
        },

        /**
         * Returns the dimensions of the element available to lay content out in.
         *
         * If the element (or any ancestor element) has CSS style `display: none`, the dimensions will be zero.
         *
         * Example:
         *
         *     var vpSize = Ext.getBody().getViewSize();
         *
         *     // all Windows created afterwards will have a default value of 90% height and 95% width
         *     Ext.Window.override({
         *         width: vpSize.width * 0.9,
         *         height: vpSize.height * 0.95
         *     });
         *     // To handle window resizing you would have to hook onto onWindowResize.
         *
         * getViewSize utilizes clientHeight/clientWidth which excludes sizing of scrollbars.
         * To obtain the size including scrollbars, use getStyleSize
         *
         * Sizing of the document body is handled at the adapter level which handles special cases for IE and strict modes, etc.
         *
         * @return {Object} Object describing width and height.
         * @return {Number} return.width
         * @return {Number} return.height
         */
        getViewSize: function() {
            var doc = document,
                dom = this.dom;

            if (dom == doc || dom == doc.body) {
                return {
                    width: Element.getViewportWidth(),
                    height: Element.getViewportHeight()
                };
            }
            else {
                return {
                    width: dom.clientWidth,
                    height: dom.clientHeight
                };
            }
        },

        /**
         * Returns the size of the element.
         * @param {Boolean} [contentSize] true to get the width/size minus borders and padding
         * @return {Object} An object containing the element's size:
         * @return {Number} return.width
         * @return {Number} return.height
         */
        getSize: function(contentSize) {
            var dom = this.dom;
            return {
                width: Math.max(0, contentSize ? (dom.clientWidth - this.getPadding("lr")) : dom.offsetWidth),
                height: Math.max(0, contentSize ? (dom.clientHeight - this.getPadding("tb")) : dom.offsetHeight)
            };
        },

        /**
         * Forces the browser to repaint this element
         * @return {Ext.dom.Element} this
         */
        repaint: function(){
            var dom = this.dom;
            this.addCls(Ext.baseCSSPrefix + 'repaint');
            setTimeout(function(){
                Ext.fly(dom).removeCls(Ext.baseCSSPrefix + 'repaint');
            }, 1);
            return this;
        },

        /**
         * Returns an object with properties top, left, right and bottom representing the margins of this element unless sides is passed,
         * then it returns the calculated width of the sides (see getPadding)
         * @param {String} [sides] Any combination of l, r, t, b to get the sum of those sides
         * @return {Object/Number}
         */
        getMargin: function(side){
            var me = this,
                hash = {t:"top", l:"left", r:"right", b: "bottom"},
                key,
                o,
                margins;

            if (!side) {
                margins = [];
                for (key in me.margins) {
                    if(me.margins.hasOwnProperty(key)) {
                        margins.push(me.margins[key]);
                    }
                }
                o = me.getStyle(margins);
                if(o && typeof o == 'object') {
                    //now mixin nomalized values (from hash table)
                    for (key in me.margins) {
                        if(me.margins.hasOwnProperty(key)) {
                            o[hash[key]] = parseFloat(o[me.margins[key]]) || 0;
                        }
                    }
                }

                return o;
            } else {
                return me.addStyles.call(me, side, me.margins);
            }
        },

        /**
         * Puts a mask over this element to disable user interaction. Requires core.css.
         * This method can only be applied to elements which accept child nodes.
         * @param {String} [msg] A message to display in the mask
         * @param {String} [msgCls] A css class to apply to the msg element
         */
        mask: function(msg, msgCls, transparent) {
            var me = this,
                dom = me.dom,
                data = (me.$cache || me.getCache()).data,
                el = data.mask,
                mask,
                size,
                cls = '',
                prefix = Ext.baseCSSPrefix;

            me.addCls(prefix + 'masked');
            if (me.getStyle("position") == "static") {
                me.addCls(prefix + 'masked-relative');
            }
            if (el) {
                el.remove();
            }
            if (msgCls && typeof msgCls == 'string' ) {
                cls = ' ' + msgCls;
            }
            else {
                cls = ' ' + prefix + 'mask-gray';
            }

            mask = me.createChild({
                cls: prefix + 'mask' + ((transparent !== false) ? '' : (' ' + prefix + 'mask-gray')),
                html: msg ? ('<div class="' + (msgCls || (prefix + 'mask-message')) + '">' + msg + '</div>') : ''
            });

            size = me.getSize();

            data.mask = mask;

            if (dom === document.body) {
                size.height = window.innerHeight;
                if (me.orientationHandler) {
                    Ext.EventManager.unOrientationChange(me.orientationHandler, me);
                }

                me.orientationHandler = function() {
                    size = me.getSize();
                    size.height = window.innerHeight;
                    mask.setSize(size);
                };

                Ext.EventManager.onOrientationChange(me.orientationHandler, me);
            }
            mask.setSize(size);
            if (Ext.is.iPad) {
                Ext.repaint();
            }
        },

        /**
         * Removes a previously applied mask.
         */
        unmask: function() {
            var me = this,
                data = (me.$cache || me.getCache()).data,
                mask = data.mask,
                prefix = Ext.baseCSSPrefix;

            if (mask) {
                mask.remove();
                delete data.mask;
            }
            me.removeCls([prefix + 'masked', prefix + 'masked-relative']);

            if (me.dom === document.body) {
                Ext.EventManager.unOrientationChange(me.orientationHandler, me);
                delete me.orientationHandler;
            }
        }
    });

    /**
     * Creates mappings for 'margin-before' to 'marginLeft' (etc.) given the output
     * map and an ordering pair (e.g., ['left', 'right']). The ordering pair is in
     * before/after order.
     */
    Element.populateStyleMap = function (map, order) {
        var baseStyles = ['margin-', 'padding-', 'border-width-'],
            beforeAfter = ['before', 'after'],
            index, style, name, i;

        for (index = baseStyles.length; index--; ) {
            for (i = 2; i--; ) {
                style = baseStyles[index] + beforeAfter[i]; // margin-before
                // ex: maps margin-before and marginBefore to marginLeft
                map[Element.normalize(style)] = map[style] = {
                    name: Element.normalize(baseStyles[index] + order[i])
                };
            }
        }
    };

    Ext.onReady(function () {
        var supports = Ext.supports,
            styleHooks,
            colorStyles, i, name, camel;

        function fixTransparent (dom, el, inline, style) {
            var value = style[this.name] || '';
            return transparentRe.test(value) ? 'transparent' : value;
        }

        function fixRightMargin (dom, el, inline, style) {
            var result = style.marginRight,
                domStyle, display;

            // Ignore cases when the margin is correctly reported as 0, the bug only shows
            // numbers larger.
            if (result != '0px') {
                domStyle = dom.style;
                display = domStyle.display;
                domStyle.display = 'inline-block';
                result = (inline ? style : dom.ownerDocument.defaultView.getComputedStyle(dom, null)).marginRight;
                domStyle.display = display;
            }

            return result;
        }

        function fixRightMarginAndInputFocus (dom, el, inline, style) {
            var result = style.marginRight,
                domStyle, cleaner, display;

            if (result != '0px') {
                domStyle = dom.style;
                cleaner = Element.getRightMarginFixCleaner(dom);
                display = domStyle.display;
                domStyle.display = 'inline-block';
                result = (inline ? style : dom.ownerDocument.defaultView.getComputedStyle(dom, '')).marginRight;
                domStyle.display = display;
                cleaner();
            }

            return result;
        }

        styleHooks = Element.prototype.styleHooks;

        // Populate the LTR flavors of margin-before et.al. (see Ext.rtl.AbstractElement):
        Element.populateStyleMap(styleHooks, ['left', 'right']);

        // Ext.supports needs to be initialized (we run very early in the onready sequence),
        // but it is OK to call Ext.supports.init() more times than necessary...
        if (supports.init) {
            supports.init();
        }

        // Fix bug caused by this: https://bugs.webkit.org/show_bug.cgi?id=13343
        if (!supports.RightMargin) {
            styleHooks.marginRight = styleHooks['margin-right'] = {
                name: 'marginRight',
                // TODO - Touch should use conditional compilation here or ensure that the
                //      underlying Ext.supports flags are set correctly...
                get: (supports.DisplayChangeInputSelectionBug || supports.DisplayChangeTextAreaSelectionBug) ?
                        fixRightMarginAndInputFocus : fixRightMargin
            };
        }

        if (!supports.TransparentColor) {
            colorStyles = ['background-color', 'border-color', 'color', 'outline-color'];
            for (i = colorStyles.length; i--; ) {
                name = colorStyles[i];
                camel = Element.normalize(name);

                styleHooks[name] = styleHooks[camel] = {
                    name: camel,
                    get: fixTransparent
                };
            }
        }
    });
}());

/**
 * @class Ext.dom.AbstractElement
 */
Ext.dom.AbstractElement.override({
    /**
     * Looks at this node and then at parent nodes for a match of the passed simple selector (e.g. div.some-class or span:first-child)
     * @param {String} selector The simple selector to test
     * @param {Number/String/HTMLElement/Ext.Element} [limit]
     * The max depth to search as a number or an element which causes the upward traversal to stop
     * and is <b>not</b> considered for inclusion as the result. (defaults to 50 || document.documentElement)
     * @param {Boolean} [returnEl=false] True to return a Ext.Element object instead of DOM node
     * @return {HTMLElement} The matching DOM node (or null if no match was found)
     */
    findParent: function(simpleSelector, limit, returnEl) {
        var target = this.dom,
            topmost = document.documentElement,
            depth = 0,
            stopEl;

        limit = limit || 50;
        if (isNaN(limit)) {
            stopEl = Ext.getDom(limit);
            limit = Number.MAX_VALUE;
        }
        while (target && target.nodeType == 1 && depth < limit && target != topmost && target != stopEl) {
            if (Ext.DomQuery.is(target, simpleSelector)) {
                return returnEl ? Ext.get(target) : target;
            }
            depth++;
            target = target.parentNode;
        }
        return null;
    },

    /**
     * Looks at parent nodes for a match of the passed simple selector (e.g. div.some-class or span:first-child)
     * @param {String} selector The simple selector to test
     * @param {Number/String/HTMLElement/Ext.Element} [limit]
     * The max depth to search as a number or an element which causes the upward traversal to stop
     * and is <b>not</b> considered for inclusion as the result. (defaults to 50 || document.documentElement)
     * @param {Boolean} [returnEl=false] True to return a Ext.Element object instead of DOM node
     * @return {HTMLElement} The matching DOM node (or null if no match was found)
     */
    findParentNode: function(simpleSelector, limit, returnEl) {
        var p = Ext.fly(this.dom.parentNode, '_internal');
        return p ? p.findParent(simpleSelector, limit, returnEl) : null;
    },

    /**
     * Walks up the dom looking for a parent node that matches the passed simple selector (e.g. div.some-class or span:first-child).
     * This is a shortcut for findParentNode() that always returns an Ext.dom.Element.
     * @param {String} selector The simple selector to test
     * @param {Number/String/HTMLElement/Ext.Element} [limit]
     * The max depth to search as a number or an element which causes the upward traversal to stop
     * and is <b>not</b> considered for inclusion as the result. (defaults to 50 || document.documentElement)
     * @return {Ext.Element} The matching DOM node (or null if no match was found)
     */
    up: function(simpleSelector, limit) {
        return this.findParentNode(simpleSelector, limit, true);
    },

    /**
     * Creates a {@link Ext.CompositeElement} for child nodes based on the passed CSS selector (the selector should not contain an id).
     * @param {String} selector The CSS selector
     * @param {Boolean} [unique] True to create a unique Ext.Element for each element. Defaults to a shared flyweight object.
     * @return {Ext.CompositeElement} The composite element
     */
    select: function(selector, composite) {
        return Ext.dom.Element.select(selector, this.dom, composite);
    },

    /**
     * Selects child nodes based on the passed CSS selector (the selector should not contain an id).
     * @param {String} selector The CSS selector
     * @return {HTMLElement[]} An array of the matched nodes
     */
    query: function(selector) {
        return Ext.DomQuery.select(selector, this.dom);
    },

    /**
     * Selects a single child at any depth below this element based on the passed CSS selector (the selector should not contain an id).
     * @param {String} selector The CSS selector
     * @param {Boolean} [returnDom=false] True to return the DOM node instead of Ext.dom.Element
     * @return {HTMLElement/Ext.dom.Element} The child Ext.dom.Element (or DOM node if returnDom = true)
     */
    down: function(selector, returnDom) {
        var n = Ext.DomQuery.selectNode(selector, this.dom);
        return returnDom ? n : Ext.get(n);
    },

    /**
     * Selects a single *direct* child based on the passed CSS selector (the selector should not contain an id).
     * @param {String} selector The CSS selector
     * @param {Boolean} [returnDom=false] True to return the DOM node instead of Ext.dom.Element.
     * @return {HTMLElement/Ext.dom.Element} The child Ext.dom.Element (or DOM node if returnDom = true)
     */
    child: function(selector, returnDom) {
        var node,
            me = this,
            id;

        // Pull the ID from the DOM (Ext.id also ensures that there *is* an ID).
        // If this object is a Flyweight, it will not have an ID
        id = Ext.id(me.dom);
        // Escape "invalid" chars
        id = Ext.escapeId(id);
        node = Ext.DomQuery.selectNode('#' + id + " > " + selector, me.dom);
        return returnDom ? node : Ext.get(node);
    },

     /**
     * Gets the parent node for this element, optionally chaining up trying to match a selector
     * @param {String} [selector] Find a parent node that matches the passed simple selector
     * @param {Boolean} [returnDom=false] True to return a raw dom node instead of an Ext.dom.Element
     * @return {Ext.dom.Element/HTMLElement} The parent node or null
     */
    parent: function(selector, returnDom) {
        return this.matchNode('parentNode', 'parentNode', selector, returnDom);
    },

     /**
     * Gets the next sibling, skipping text nodes
     * @param {String} [selector] Find the next sibling that matches the passed simple selector
     * @param {Boolean} [returnDom=false] True to return a raw dom node instead of an Ext.dom.Element
     * @return {Ext.dom.Element/HTMLElement} The next sibling or null
     */
    next: function(selector, returnDom) {
        return this.matchNode('nextSibling', 'nextSibling', selector, returnDom);
    },

    /**
     * Gets the previous sibling, skipping text nodes
     * @param {String} [selector] Find the previous sibling that matches the passed simple selector
     * @param {Boolean} [returnDom=false] True to return a raw dom node instead of an Ext.dom.Element
     * @return {Ext.dom.Element/HTMLElement} The previous sibling or null
     */
    prev: function(selector, returnDom) {
        return this.matchNode('previousSibling', 'previousSibling', selector, returnDom);
    },


    /**
     * Gets the first child, skipping text nodes
     * @param {String} [selector] Find the next sibling that matches the passed simple selector
     * @param {Boolean} [returnDom=false] True to return a raw dom node instead of an Ext.dom.Element
     * @return {Ext.dom.Element/HTMLElement} The first child or null
     */
    first: function(selector, returnDom) {
        return this.matchNode('nextSibling', 'firstChild', selector, returnDom);
    },

    /**
     * Gets the last child, skipping text nodes
     * @param {String} [selector] Find the previous sibling that matches the passed simple selector
     * @param {Boolean} [returnDom=false] True to return a raw dom node instead of an Ext.dom.Element
     * @return {Ext.dom.Element/HTMLElement} The last child or null
     */
    last: function(selector, returnDom) {
        return this.matchNode('previousSibling', 'lastChild', selector, returnDom);
    },

    matchNode: function(dir, start, selector, returnDom) {
        if (!this.dom) {
            return null;
        }

        var n = this.dom[start];
        while (n) {
            if (n.nodeType == 1 && (!selector || Ext.DomQuery.is(n, selector))) {
                return !returnDom ? Ext.get(n) : n;
            }
            n = n[dir];
        }
        return null;
    },

    isAncestor: function(element) {
        return this.self.isAncestor.call(this.self, this.dom, element);
    }
});
