
/**
 * @class Ext.EventManager
 * Registers event handlers that want to receive a normalized EventObject instead of the standard browser event and provides
 * several useful events directly.
 * See {@link Ext.EventObject} for more details on normalized event objects.
 * @singleton
 */
Ext.EventManager = new function() {
    var EventManager = this,
        doc = document,
        win = window,
        initExtCss = function() {
            // find the body element
            var bd = doc.body || doc.getElementsByTagName('body')[0],
                baseCSSPrefix = Ext.baseCSSPrefix,
                cls = [baseCSSPrefix + 'body'],
                htmlCls = [],
                supportsLG = Ext.supports.CSS3LinearGradient,
                supportsBR = Ext.supports.CSS3BorderRadius,
                resetCls = [],
                html,
                resetElementSpec;

            if (!bd) {
                return false;
            }

            html = bd.parentNode;

            function add (c) {
                cls.push(baseCSSPrefix + c);
            }

            //Let's keep this human readable!
            if (Ext.isIE) {
                add('ie');

                // very often CSS needs to do checks like "IE7+" or "IE6 or 7". To help
                // reduce the clutter (since CSS/SCSS cannot do these tests), we add some
                // additional classes:
                //
                //      x-ie7p      : IE7+      :  7 <= ieVer
                //      x-ie7m      : IE7-      :  ieVer <= 7
                //      x-ie8p      : IE8+      :  8 <= ieVer
                //      x-ie8m      : IE8-      :  ieVer <= 8
                //      x-ie9p      : IE9+      :  9 <= ieVer
                //      x-ie78      : IE7 or 8  :  7 <= ieVer <= 8
                //
                if (Ext.isIE6) {
                    add('ie6');
                } else { // ignore pre-IE6 :)
                    add('ie7p');

                    if (Ext.isIE7) {
                        add('ie7');
                    } else {
                        add('ie8p');

                        if (Ext.isIE8) {
                            add('ie8');
                        } else {
                            add('ie9p');

                            if (Ext.isIE9) {
                                add('ie9');
                            }
                        }
                    }
                }

                if (Ext.isIE6 || Ext.isIE7) {
                    add('ie7m');
                }
                if (Ext.isIE6 || Ext.isIE7 || Ext.isIE8) {
                    add('ie8m');
                }
                if (Ext.isIE7 || Ext.isIE8) {
                    add('ie78');
                }
            }
            if (Ext.isGecko) {
                add('gecko');
                if (Ext.isGecko3) {
                    add('gecko3');
                }
                if (Ext.isGecko4) {
                    add('gecko4');
                }
                if (Ext.isGecko5) {
                    add('gecko5');
                }
            }
            if (Ext.isOpera) {
                add('opera');
            }
            if (Ext.isWebKit) {
                add('webkit');
            }
            if (Ext.isSafari) {
                add('safari');
                if (Ext.isSafari2) {
                    add('safari2');
                }
                if (Ext.isSafari3) {
                    add('safari3');
                }
                if (Ext.isSafari4) {
                    add('safari4');
                }
                if (Ext.isSafari5) {
                    add('safari5');
                }
                if (Ext.isSafari5_0) {
                    add('safari5_0')
                }
            }
            if (Ext.isChrome) {
                add('chrome');
            }
            if (Ext.isMac) {
                add('mac');
            }
            if (Ext.isLinux) {
                add('linux');
            }
            if (!supportsBR) {
                add('nbr');
            }
            if (!supportsLG) {
                add('nlg');
            }

            // If we are not globally resetting scope, but just resetting it in a wrapper around
            // serarately rendered widgets, then create a common reset element for use when creating
            // measurable elements. Using a common DomHelper spec.
            if (Ext.scopeResetCSS) {

                // Create Ext.resetElementSpec for use in Renderable when wrapping top level Components.
                resetElementSpec = Ext.resetElementSpec = {
                    cls: baseCSSPrefix + 'reset'
                };
                
                if (!supportsLG) {
                    resetCls.push(baseCSSPrefix + 'nlg');
                }
                
                if (!supportsBR) {
                    resetCls.push(baseCSSPrefix + 'nbr');
                }
                
                if (resetCls.length) {                    
                    resetElementSpec.cn = {
                        cls: resetCls.join(' ')
                    };
                }
                
                Ext.resetElement = Ext.getBody().createChild(resetElementSpec);
                if (resetCls.length) {
                    Ext.resetElement = Ext.get(Ext.resetElement.dom.firstChild);
                }
            }
            // Otherwise, the common reset element is the document body
            else {
                Ext.resetElement = Ext.getBody();
                add('reset');
            }

            // add to the parent to allow for selectors x-strict x-border-box, also set the isBorderBox property correctly
            if (html) {
                if (Ext.isStrict && (Ext.isIE6 || Ext.isIE7)) {
                    Ext.isBorderBox = false;
                }
                else {
                    Ext.isBorderBox = true;
                }

                if(Ext.isBorderBox) {
                    htmlCls.push(baseCSSPrefix + 'border-box');
                }
                if (Ext.isStrict) {
                    htmlCls.push(baseCSSPrefix + 'strict');
                } else {
                    htmlCls.push(baseCSSPrefix + 'quirks');
                }
                Ext.fly(html, '_internal').addCls(htmlCls);
            }

            Ext.fly(bd, '_internal').addCls(cls);
            return true;
        };

    Ext.apply(EventManager, {
        /**
         * Check if we have bound our global onReady listener
         * @private
         */
        hasBoundOnReady: false,

        /**
         * Check if fireDocReady has been called
         * @private
         */
        hasFiredReady: false,

        /**
         * Additionally, allow the 'DOM' listener thread to complete (usually desirable with mobWebkit, Gecko)
         * before firing the entire onReady chain (high stack load on Loader) by specifying a delay value
         * @default 1ms
         * @private
         */
        deferReadyEvent : 1,

        /*
         * diags: a list of event names passed to onReadyEvent (in chron order)
         * @private
         */
        onReadyChain : [],

        /**
         * Holds references to any onReady functions
         * @private
         */
        readyEvent:
            (function () {
                var event = new Ext.util.Event();
                event.fire = function () {
                    Ext._beforeReadyTime = Ext._beforeReadyTime || new Date().getTime();
                    event.self.prototype.fire.apply(event, arguments);
                    Ext._afterReadytime = new Date().getTime();
                };
                return event;
            }()),

        /**
         * Fires when a DOM event handler finishes its run, just before returning to browser control.
         * This can be useful for performing cleanup, or upfdate tasks which need to happen only
         * after all code in an event handler has been run, but which should not be executed in a timer
         * due to the intervening browser reflow/repaint which would take place.
         *
         */
        idleEvent: new Ext.util.Event(),

        /**
         * detects whether the EventManager has been placed in a paused state for synchronization
         * with external debugging / perf tools (PageAnalyzer)
         * @private
         */
        isReadyPaused: function(){
            return (/[?&]ext-pauseReadyFire\b/i.test(location.search) && !Ext._continueFireReady);
        },

        /**
         * Binds the appropriate browser event for checking if the DOM has loaded.
         * @private
         */
        bindReadyEvent: function() {
            if (EventManager.hasBoundOnReady) {
                return;
            }

            // Test scenario where Core is dynamically loaded AFTER window.load
            if ( doc.readyState == 'complete'  ) {  // Firefox4+ got support for this state, others already do.
                EventManager.onReadyEvent({
                    type: doc.readyState || 'body'
                });
            } else {
                document.addEventListener('DOMContentLoaded', EventManager.onReadyEvent, false);
                window.addEventListener('load', EventManager.onReadyEvent, false);
                EventManager.hasBoundOnReady = true;
            }
        },

        onReadyEvent : function(e) {
            if (e && e.type) {
                EventManager.onReadyChain.push(e.type);
            }

            if (EventManager.hasBoundOnReady) {
                document.removeEventListener('DOMContentLoaded', EventManager.onReadyEvent, false);
                window.removeEventListener('load', EventManager.onReadyEvent, false);
            }

            if (!Ext.isReady) {
                EventManager.fireDocReady();
            }
        },

        /**
         * We know the document is loaded, so trigger any onReady events.
         * @private
         */
        fireDocReady: function() {
            if (!Ext.isReady) {
                Ext._readyTime = new Date().getTime();
                Ext.isReady = true;

                Ext.supports.init();
                EventManager.onWindowUnload();
                EventManager.readyEvent.onReadyChain = EventManager.onReadyChain;    //diags report

                if (Ext.isNumber(EventManager.deferReadyEvent)) {
                    Ext.Function.defer(EventManager.fireReadyEvent, EventManager.deferReadyEvent);
                    EventManager.hasDocReadyTimer = true;
                } else {
                    EventManager.fireReadyEvent();
                }
            }
        },

        /**
         * Fires the ready event
         * @private
         */
        fireReadyEvent: function(){
            var readyEvent = EventManager.readyEvent;

            // Unset the timer flag here since other onReady events may be
            // added during the fire() call and we don't want to block them
            EventManager.hasDocReadyTimer = false;
            EventManager.isFiring = true;

            // Ready events are all single: true, if we get to the end
            // & there are more listeners, it means they were added
            // inside some other ready event
            while (readyEvent.listeners.length && !EventManager.isReadyPaused()) {
                readyEvent.fire();
            }
            EventManager.isFiring = false;
            EventManager.hasFiredReady = true;
        },

        /**
         * Adds a listener to be notified when the document is ready (before onload and before images are loaded).
         *
         * @param {Function} fn The method the event invokes.
         * @param {Object} [scope] The scope (`this` reference) in which the handler function executes.
         * Defaults to the browser window.
         * @param {Object} [options] Options object as passed to {@link Ext.Element#addListener}.
         */
        onDocumentReady: function(fn, scope, options) {
            options = options || {};
            // force single, only ever fire it once
            options.single = true;
            EventManager.readyEvent.addListener(fn, scope, options);

            // If we're in the middle of firing, or we have a deferred timer
            // pending, drop out since the event will be fired  later
            if (!(EventManager.isFiring || EventManager.hasDocReadyTimer)) {
                if (Ext.isReady) {
                    EventManager.fireReadyEvent();
                } else {
                    EventManager.bindReadyEvent();
                }
            }
        },

        // --------------------- event binding ---------------------

        /**
         * Contains a list of all document mouse downs, so we can ensure they fire even when stopEvent is called.
         * @private
         */
        stoppedMouseDownEvent: new Ext.util.Event(),

        /**
         * Options to parse for the 4th argument to addListener.
         * @private
         */
        propRe: /^(?:scope|delay|buffer|single|stopEvent|preventDefault|stopPropagation|normalized|args|delegate|freezeEvent)$/,

        /**
         * Get the id of the element. If one has not been assigned, automatically assign it.
         * @param {HTMLElement/Ext.Element} element The element to get the id for.
         * @return {String} id
         */
        getId : function(element) {
            var id;

            element = Ext.getDom(element);

            if (element === doc || element === win) {
                id = element === doc ? Ext.documentId : Ext.windowId;
            }
            else {
                id = Ext.id(element);
            }

            if (!Ext.cache[id]) {
                Ext.addCacheEntry(id, null, element);
            }

            return id;
        },

        /**
         * Convert a "config style" listener into a set of flat arguments so they can be passed to addListener
         * @private
         * @param {Object} element The element the event is for
         * @param {Object} event The event configuration
         * @param {Object} isRemove True if a removal should be performed, otherwise an add will be done.
         */
        prepareListenerConfig: function(element, config, isRemove) {
            var propRe = EventManager.propRe,
                key, value, args;

            // loop over all the keys in the object
            for (key in config) {
                if (config.hasOwnProperty(key)) {
                    // if the key is something else then an event option
                    if (!propRe.test(key)) {
                        value = config[key];
                        // if the value is a function it must be something like click: function() {}, scope: this
                        // which means that there might be multiple event listeners with shared options
                        if (typeof value == 'function') {
                            // shared options
                            args = [element, key, value, config.scope, config];
                        } else {
                            // if its not a function, it must be an object like click: {fn: function() {}, scope: this}
                            args = [element, key, value.fn, value.scope, value];
                        }

                        if (isRemove) {
                            EventManager.removeListener.apply(EventManager, args);
                        } else {
                            EventManager.addListener.apply(EventManager, args);
                        }
                    }
                }
            }
        },

        mouseEnterLeaveRe: /mouseenter|mouseleave/,

        /**
         * Normalize cross browser event differences
         * @private
         * @param {Object} eventName The event name
         * @param {Object} fn The function to execute
         * @return {Object} The new event name/function
         */
        normalizeEvent: function(eventName, fn) {
            if (EventManager.mouseEnterLeaveRe.test(eventName) && !Ext.supports.MouseEnterLeave) {
                if (fn) {
                    fn = Ext.Function.createInterceptor(fn, EventManager.contains);
                }
                eventName = eventName == 'mouseenter' ? 'mouseover' : 'mouseout';
            } else if (eventName == 'mousewheel' && !Ext.supports.MouseWheel && !Ext.isOpera) {
                eventName = 'DOMMouseScroll';
            }
            return {
                eventName: eventName,
                fn: fn
            };
        },

        /**
         * Checks whether the event's relatedTarget is contained inside (or <b>is</b>) the element.
         * @private
         * @param {Object} event
         */
        contains: function(event) {
            var parent = event.browserEvent.currentTarget,
                child = EventManager.getRelatedTarget(event);

            if (parent && parent.firstChild) {
                while (child) {
                    if (child === parent) {
                        return false;
                    }
                    child = child.parentNode;
                    if (child && (child.nodeType != 1)) {
                        child = null;
                    }
                }
            }
            return true;
        },

        /**
        * Appends an event handler to an element.  The shorthand version {@link #on} is equivalent.  Typically you will
        * use {@link Ext.Element#addListener} directly on an Element in favor of calling this version.
        * @param {String/HTMLElement} el The html element or id to assign the event handler to.
        * @param {String} eventName The name of the event to listen for.
        * @param {Function} handler The handler function the event invokes. This function is passed
        * the following parameters:<ul>
        * <li>evt : EventObject<div class="sub-desc">The {@link Ext.EventObject EventObject} describing the event.</div></li>
        * <li>t : Element<div class="sub-desc">The {@link Ext.Element Element} which was the target of the event.
        * Note that this may be filtered by using the <tt>delegate</tt> option.</div></li>
        * <li>o : Object<div class="sub-desc">The options object from the addListener call.</div></li>
        * </ul>
        * @param {Object} scope (optional) The scope (<b><code>this</code></b> reference) in which the handler function is executed. <b>Defaults to the Element</b>.
        * @param {Object} options (optional) An object containing handler configuration properties.
        * This may contain any of the following properties:<ul>
        * <li>scope : Object<div class="sub-desc">The scope (<b><code>this</code></b> reference) in which the handler function is executed. <b>Defaults to the Element</b>.</div></li>
        * <li>delegate : String<div class="sub-desc">A simple selector to filter the target or look for a descendant of the target</div></li>
        * <li>stopEvent : Boolean<div class="sub-desc">True to stop the event. That is stop propagation, and prevent the default action.</div></li>
        * <li>preventDefault : Boolean<div class="sub-desc">True to prevent the default action</div></li>
        * <li>stopPropagation : Boolean<div class="sub-desc">True to prevent event propagation</div></li>
        * <li>normalized : Boolean<div class="sub-desc">False to pass a browser event to the handler function instead of an Ext.EventObject</div></li>
        * <li>delay : Number<div class="sub-desc">The number of milliseconds to delay the invocation of the handler after te event fires.</div></li>
        * <li>single : Boolean<div class="sub-desc">True to add a handler to handle just the next firing of the event, and then remove itself.</div></li>
        * <li>buffer : Number<div class="sub-desc">Causes the handler to be scheduled to run in an {@link Ext.util.DelayedTask} delayed
        * by the specified number of milliseconds. If the event fires again within that time, the original
        * handler is <em>not</em> invoked, but the new handler is scheduled in its place.</div></li>
        * <li>target : Element<div class="sub-desc">Only call the handler if the event was fired on the target Element, <i>not</i> if the event was bubbled up from a child node.</div></li>
        * </ul><br>
        * <p>See {@link Ext.Element#addListener} for examples of how to use these options.</p>
        */
        addListener: function(element, eventName, fn, scope, options) {
            // Check if we've been passed a "config style" event.
            if (typeof eventName !== 'string') {
                EventManager.prepareListenerConfig(element, eventName);
                return;
            }

            var dom = element.dom || Ext.getDom(element),
                bind, wrap;

            if (!fn) {
                Ext.Error.raise({
                    sourceClass: 'Ext.EventManager',
                    sourceMethod: 'addListener',
                    targetElement: element,
                    eventName: eventName,
                    msg: 'Error adding "' + eventName + '\" listener. The handler function is undefined.'
                });
            }

            // create the wrapper function
            options = options || {};

            bind = EventManager.normalizeEvent(eventName, fn);
            wrap = EventManager.createListenerWrap(dom, eventName, bind.fn, scope, options);

            if (dom.attachEvent) {
                dom.attachEvent('on' + bind.eventName, wrap);
            } else {
                dom.addEventListener(bind.eventName, wrap, options.capture || false);
            }

            if (dom == doc && eventName == 'mousedown') {
                EventManager.stoppedMouseDownEvent.addListener(wrap);
            }

            // add all required data into the event cache
            EventManager.getEventListenerCache(element.dom ? element : dom, eventName).push({
                fn: fn,
                wrap: wrap,
                scope: scope
            });
        },

        /**
        * Removes an event handler from an element.  The shorthand version {@link #un} is equivalent.  Typically
        * you will use {@link Ext.Element#removeListener} directly on an Element in favor of calling this version.
        * @param {String/HTMLElement} el The id or html element from which to remove the listener.
        * @param {String} eventName The name of the event.
        * @param {Function} fn The handler function to remove. <b>This must be a reference to the function passed into the {@link #addListener} call.</b>
        * @param {Object} scope If a scope (<b><code>this</code></b> reference) was specified when the listener was added,
        * then this must refer to the same object.
        */
        removeListener : function(element, eventName, fn, scope) {
            // handle our listener config object syntax
            if (typeof eventName !== 'string') {
                EventManager.prepareListenerConfig(element, eventName, true);
                return;
            }

            var dom = Ext.getDom(element),
                el = element.dom ? element : Ext.get(dom),
                cache = EventManager.getEventListenerCache(el, eventName),
                bindName = EventManager.normalizeEvent(eventName).eventName,
                i = cache.length, j,
                listener, wrap, tasks;


            while (i--) {
                listener = cache[i];

                if (listener && (!fn || listener.fn == fn) && (!scope || listener.scope === scope)) {
                    wrap = listener.wrap;

                    // clear buffered calls
                    if (wrap.task) {
                        clearTimeout(wrap.task);
                        delete wrap.task;
                    }

                    // clear delayed calls
                    j = wrap.tasks && wrap.tasks.length;
                    if (j) {
                        while (j--) {
                            clearTimeout(wrap.tasks[j]);
                        }
                        delete wrap.tasks;
                    }

                    if (dom.detachEvent) {
                        dom.detachEvent('on' + bindName, wrap);
                    } else {
                        dom.removeEventListener(bindName, wrap, false);
                    }

                    if (wrap && dom == doc && eventName == 'mousedown') {
                        EventManager.stoppedMouseDownEvent.removeListener(wrap);
                    }

                    // remove listener from cache
                    Ext.Array.erase(cache, i, 1);
                }
            }
        },

        /**
        * Removes all event handers from an element.  Typically you will use {@link Ext.Element#removeAllListeners}
        * directly on an Element in favor of calling this version.
        * @param {String/HTMLElement} el The id or html element from which to remove all event handlers.
        */
        removeAll : function(element) {
            var el = element.dom ? element : Ext.get(element),
                cache, events, eventName;

            if (!el) {
                return;
            }
            cache = (el.$cache || el.getCache());
            events = cache.events;

            for (eventName in events) {
                if (events.hasOwnProperty(eventName)) {
                    EventManager.removeListener(el, eventName);
                }
            }
            cache.events = {};
        },

        /**
         * Recursively removes all previous added listeners from an element and its children. Typically you will use {@link Ext.Element#purgeAllListeners}
         * directly on an Element in favor of calling this version.
         * @param {String/HTMLElement} el The id or html element from which to remove all event handlers.
         * @param {String} eventName (optional) The name of the event.
         */
        purgeElement : function(element, eventName) {
            var dom = Ext.getDom(element),
                i = 0, len;

            if (eventName) {
                EventManager.removeListener(element, eventName);
            }
            else {
                EventManager.removeAll(element);
            }

            if (dom && dom.childNodes) {
                for (len = element.childNodes.length; i < len; i++) {
                    EventManager.purgeElement(element.childNodes[i], eventName);
                }
            }
        },

        /**
         * Create the wrapper function for the event
         * @private
         * @param {HTMLElement} dom The dom element
         * @param {String} ename The event name
         * @param {Function} fn The function to execute
         * @param {Object} scope The scope to execute callback in
         * @param {Object} options The options
         * @return {Function} the wrapper function
         */
        createListenerWrap : function(dom, ename, fn, scope, options) {
            options = options || {};

            var f, gen, escapeRx = /\\/g, wrap = function(e, args) {
                // Compile the implementation upon first firing
                if (!gen) {
                    f = ['if(!' + Ext.name + ') {return;}'];

                    if(options.buffer || options.delay || options.freezeEvent) {
                        f.push('e = new X.EventObjectImpl(e, ' + (options.freezeEvent ? 'true' : 'false' ) + ');');
                    } else {
                        f.push('e = X.EventObject.setEvent(e);');
                    }

                    if (options.delegate) {
                        // double up '\' characters so escape sequences survive the
                        // string-literal translation
                        f.push('var result, t = e.getTarget("' + (options.delegate + '').replace(escapeRx, '\\\\') + '", this);');
                        f.push('if(!t) {return;}');
                    } else {
                        f.push('var t = e.target, result;');
                    }

                    if (options.target) {
                        f.push('if(e.target !== options.target) {return;}');
                    }

                    if(options.stopEvent) {
                        f.push('e.stopEvent();');
                    } else {
                        if(options.preventDefault) {
                            f.push('e.preventDefault();');
                        }
                        if(options.stopPropagation) {
                            f.push('e.stopPropagation();');
                        }
                    }

                    if(options.normalized === false) {
                        f.push('e = e.browserEvent;');
                    }

                    if(options.buffer) {
                        f.push('(wrap.task && clearTimeout(wrap.task));');
                        f.push('wrap.task = setTimeout(function() {');
                    }

                    if(options.delay) {
                        f.push('wrap.tasks = wrap.tasks || [];');
                        f.push('wrap.tasks.push(setTimeout(function() {');
                    }

                    // finally call the actual handler fn
                    f.push('result = fn.call(scope || dom, e, t, options);');

                    if(options.single) {
                        f.push('evtMgr.removeListener(dom, ename, fn, scope);');
                    }

                    // Fire the global idle event for all events except mousemove which is too common, and
                    // fires too frequently and fast to be use in tiggering onIdle processing.
                    if (ename !== 'mousemove') {
                        f.push('if (evtMgr.idleEvent.listeners.length) {');
                        f.push('evtMgr.idleEvent.fire();');
                        f.push('}');
                    }

                    if(options.delay) {
                        f.push('}, ' + options.delay + '));');
                    }

                    if(options.buffer) {
                        f.push('}, ' + options.buffer + ');');
                    }
                    f.push('return result;')

                    gen = Ext.cacheableFunctionFactory('e', 'options', 'fn', 'scope', 'ename', 'dom', 'wrap', 'args', 'X', 'evtMgr', f.join('\n'));
                }

                return gen.call(dom, e, options, fn, scope, ename, dom, wrap, args, Ext, EventManager);
            };
            return wrap;
        },

        /**
         * Get the event cache for a particular element for a particular event
         * @private
         * @param {HTMLElement} element The element
         * @param {Object} eventName The event name
         * @return {Array} The events for the element
         */
        getEventListenerCache : function(element, eventName) {
            var elementCache, eventCache;
            if (!element) {
                return [];
            }

            if (element.$cache) {
                elementCache = element.$cache;
            } else {
                // getId will populate the cache for this element if it isn't already present
                elementCache = Ext.cache[EventManager.getId(element)];
            }
            eventCache = elementCache.events || (elementCache.events = {});

            return eventCache[eventName] || (eventCache[eventName] = []);
        },

        // --------------------- utility methods ---------------------
        mouseLeaveRe: /(mouseout|mouseleave)/,
        mouseEnterRe: /(mouseover|mouseenter)/,

        /**
         * Stop the event (preventDefault and stopPropagation)
         * @param {Event} The event to stop
         */
        stopEvent: function(event) {
            EventManager.stopPropagation(event);
            EventManager.preventDefault(event);
        },

        /**
         * Cancels bubbling of the event.
         * @param {Event} The event to stop bubbling.
         */
        stopPropagation: function(event) {
            event = event.browserEvent || event;
            if (event.stopPropagation) {
                event.stopPropagation();
            } else {
                event.cancelBubble = true;
            }
        },

        /**
         * Prevents the browsers default handling of the event.
         * @param {Event} The event to prevent the default
         */
        preventDefault: function(event) {
            event = event.browserEvent || event;
            if (event.preventDefault) {
                event.preventDefault();
            } else {
                event.returnValue = false;
                // Some keys events require setting the keyCode to -1 to be prevented
                try {
                  // all ctrl + X and F1 -> F12
                  if (event.ctrlKey || event.keyCode > 111 && event.keyCode < 124) {
                      event.keyCode = -1;
                  }
                } catch (e) {
                    // see this outdated document http://support.microsoft.com/kb/934364/en-us for more info
                }
            }
        },

        /**
         * Gets the related target from the event.
         * @param {Object} event The event
         * @return {HTMLElement} The related target.
         */
        getRelatedTarget: function(event) {
            event = event.browserEvent || event;
            var target = event.relatedTarget;
            if (!target) {
                if (EventManager.mouseLeaveRe.test(event.type)) {
                    target = event.toElement;
                } else if (EventManager.mouseEnterRe.test(event.type)) {
                    target = event.fromElement;
                }
            }
            return EventManager.resolveTextNode(target);
        },

        /**
         * Gets the x coordinate from the event
         * @param {Object} event The event
         * @return {Number} The x coordinate
         */
        getPageX: function(event) {
            return EventManager.getPageXY(event)[0];
        },

        /**
         * Gets the y coordinate from the event
         * @param {Object} event The event
         * @return {Number} The y coordinate
         */
        getPageY: function(event) {
            return EventManager.getPageXY(event)[1];
        },

        /**
         * Gets the x & y coordinate from the event
         * @param {Object} event The event
         * @return {Number[]} The x/y coordinate
         */
        getPageXY: function(event) {
            event = event.browserEvent || event;
            var x = event.pageX,
                y = event.pageY,
                docEl = doc.documentElement,
                body = doc.body;

            // pageX/pageY not available (undefined, not null), use clientX/clientY instead
            if (!x && x !== 0) {
                x = event.clientX + (docEl && docEl.scrollLeft || body && body.scrollLeft || 0) - (docEl && docEl.clientLeft || body && body.clientLeft || 0);
                y = event.clientY + (docEl && docEl.scrollTop  || body && body.scrollTop  || 0) - (docEl && docEl.clientTop  || body && body.clientTop  || 0);
            }
            return [x, y];
        },

        /**
         * Gets the target of the event.
         * @param {Object} event The event
         * @return {HTMLElement} target
         */
        getTarget: function(event) {
            event = event.browserEvent || event;
            return EventManager.resolveTextNode(event.target || event.srcElement);
        },

        // technically no need to browser sniff this, however it makes
        // no sense to check this every time, for every event, whether
        // the string is equal.
        /**
         * Resolve any text nodes accounting for browser differences.
         * @private
         * @param {HTMLElement} node The node
         * @return {HTMLElement} The resolved node
         */
        resolveTextNode: Ext.isGecko ?
            function(node) {
                if (!node) {
                    return;
                }
                // work around firefox bug, https://bugzilla.mozilla.org/show_bug.cgi?id=101197
                var s = HTMLElement.prototype.toString.call(node);
                if (s == '[xpconnect wrapped native prototype]' || s == '[object XULElement]') {
                    return;
                }
                    return node.nodeType == 3 ? node.parentNode: node;
                }: function(node) {
                    return node && node.nodeType == 3 ? node.parentNode: node;
                },

        // --------------------- custom event binding ---------------------

        // Keep track of the current width/height
        curWidth: 0,
        curHeight: 0,

        /**
         * Adds a listener to be notified when the browser window is resized and provides resize event buffering (100 milliseconds),
         * passes new viewport width and height to handlers.
         * @param {Function} fn      The handler function the window resize event invokes.
         * @param {Object}   scope   The scope (<code>this</code> reference) in which the handler function executes. Defaults to the browser window.
         * @param {Boolean}  options Options object as passed to {@link Ext.Element#addListener}
         */
        onWindowResize: function(fn, scope, options) {
            var resize = EventManager.resizeEvent;

            if (!resize) {
                EventManager.resizeEvent = resize = new Ext.util.Event();
                EventManager.on(win, 'resize', EventManager.fireResize, null, {buffer: 100});
            }
            resize.addListener(fn, scope, options);
        },

        /**
         * Fire the resize event.
         * @private
         */
        fireResize: function() {
            var w = Ext.Element.getViewWidth(),
                h = Ext.Element.getViewHeight();

             //whacky problem in IE where the resize event will sometimes fire even though the w/h are the same.
             if (EventManager.curHeight != h || EventManager.curWidth != w) {
                 EventManager.curHeight = h;
                 EventManager.curWidth = w;
                 EventManager.resizeEvent.fire(w, h);
             }
        },

        /**
         * Removes the passed window resize listener.
         * @param {Function} fn        The method the event invokes
         * @param {Object}   scope    The scope of handler
         */
        removeResizeListener: function(fn, scope) {
            var resize = EventManager.resizeEvent;
            if (resize) {
                resize.removeListener(fn, scope);
            }
        },

        /**
         * Adds a listener to be notified when the browser window is unloaded.
         * @param {Function} fn      The handler function the window unload event invokes.
         * @param {Object}   scope   The scope (<code>this</code> reference) in which the handler function executes. Defaults to the browser window.
         * @param {Boolean}  options Options object as passed to {@link Ext.Element#addListener}
         */
        onWindowUnload: function(fn, scope, options) {
            var unload = EventManager.unloadEvent;

            if (!unload) {
                EventManager.unloadEvent = unload = new Ext.util.Event();
                EventManager.addListener(win, 'unload', EventManager.fireUnload);
            }
            if (fn) {
                unload.addListener(fn, scope, options);
            }
        },

        /**
         * Fires the unload event for items bound with onWindowUnload
         * @private
         */
        fireUnload: function() {
            // wrap in a try catch, could have some problems during unload
            try {
                // relinquish references.
                doc = win = undefined;

                var gridviews, i, ln,
                    el, cache;

                EventManager.unloadEvent.fire();
                // Work around FF3 remembering the last scroll position when refreshing the grid and then losing grid view
                if (Ext.isGecko3) {
                    gridviews = Ext.ComponentQuery.query('gridview');
                    i = 0;
                    ln = gridviews.length;
                    for (; i < ln; i++) {
                        gridviews[i].scrollToTop();
                    }
                }
                // Purge all elements in the cache
                cache = Ext.cache;

                for (el in cache) {
                    if (cache.hasOwnProperty(el)) {
                        EventManager.removeAll(el);
                    }
                }
            } catch(e) {
            }
        },

        /**
         * Removes the passed window unload listener.
         * @param {Function} fn        The method the event invokes
         * @param {Object}   scope    The scope of handler
         */
        removeUnloadListener: function(fn, scope) {
            var unload = EventManager.unloadEvent;
            if (unload) {
                unload.removeListener(fn, scope);
            }
        },

        /**
         * note 1: IE fires ONLY the keydown event on specialkey autorepeat
         * note 2: Safari < 3.1, Gecko (Mac/Linux) & Opera fire only the keypress event on specialkey autorepeat
         * (research done by Jan Wolter at http://unixpapa.com/js/key.html)
         * @private
         */
        useKeyDown: Ext.isWebKit ?
                       parseInt(navigator.userAgent.match(/AppleWebKit\/(\d+)/)[1], 10) >= 525 :
                       !((Ext.isGecko && !Ext.isWindows) || Ext.isOpera),

        /**
         * Indicates which event to use for getting key presses.
         * @return {String} The appropriate event name.
         */
        getKeyEvent: function() {
            return EventManager.useKeyDown ? 'keydown' : 'keypress';
        }
    });

    // route "< ie9-Standards" to a legacy IE onReady implementation
    if(!('addEventListener' in document) && document.attachEvent) {
        Ext.apply( EventManager, {
            /* Customized implementation for Legacy IE.  The default implementation is configured for use
             *  with all other 'standards compliant' agents.
             *  References: http://javascript.nwbox.com/IEContentLoaded/
             *  licensed courtesy of http://developer.yahoo.com/yui/license.html
             */

            /**
             * This strategy has minimal benefits for Sencha solutions that build themselves (ie. minimal initial page markup).
             * However, progressively-enhanced pages (with image content and/or embedded frames) will benefit the most from it.
             * Browser timer resolution is too poor to ensure a doScroll check more than once on a page loaded with minimal
             * assets (the readystatechange event 'complete' usually beats the doScroll timer on a 'lightly-loaded' initial document).
             */
            pollScroll : function() {
                var scrollable = true;

                try {
                    document.documentElement.doScroll('left');
                } catch(e) {
                    scrollable = false;
                }

                // on IE8, when running within an iFrame, document.body is not immediately available
                if (scrollable && document.body) {
                    EventManager.onReadyEvent({
                        type:'doScroll'
                    });
                } else {
                    /*
                     * minimize thrashing --
                     * adjusted for setTimeout's close-to-minimums (not too low),
                     * as this method SHOULD always be called once initially
                     */
                    EventManager.scrollTimeout = setTimeout(EventManager.pollScroll, 20);
                }

                return scrollable;
            },

            /**
             * Timer for doScroll polling
             * @private
             */
            scrollTimeout: null,

            /* @private
             */
            readyStatesRe  : /complete/i,

            /* @private
             */
            checkReadyState: function() {
                var state = document.readyState;

                if (EventManager.readyStatesRe.test(state)) {
                    EventManager.onReadyEvent({
                        type: state
                    });
                }
            },

            bindReadyEvent: function() {
                var topContext = true;

                if (EventManager.hasBoundOnReady) {
                    return;
                }

                //are we in an IFRAME? (doScroll ineffective here)
                try {
                    topContext = window.frameElement === undefined;
                } catch(e) {
                    // If we throw an exception, it means we're probably getting access denied,
                    // which means we're in an iframe cross domain.
                    topContext = false;
                }

                if (!topContext || !doc.documentElement.doScroll) {
                    EventManager.pollScroll = Ext.emptyFn;   //then noop this test altogether
                }

                // starts doScroll polling if necessary
                if (EventManager.pollScroll() === true) {
                    return;
                }

                // Core is loaded AFTER initial document write/load ?
                if (doc.readyState == 'complete' )  {
                    EventManager.onReadyEvent({type: 'already ' + (doc.readyState || 'body') });
                } else {
                    doc.attachEvent('onreadystatechange', EventManager.checkReadyState);
                    window.attachEvent('onload', EventManager.onReadyEvent);
                    EventManager.hasBoundOnReady = true;
                }
            },

            onReadyEvent : function(e) {
                if (e && e.type) {
                    EventManager.onReadyChain.push(e.type);
                }

                if (EventManager.hasBoundOnReady) {
                    document.detachEvent('onreadystatechange', EventManager.checkReadyState);
                    window.detachEvent('onload', EventManager.onReadyEvent);
                }

                if (Ext.isNumber(EventManager.scrollTimeout)) {
                    clearTimeout(EventManager.scrollTimeout);
                    delete EventManager.scrollTimeout;
                }

                if (!Ext.isReady) {
                    EventManager.fireDocReady();
                }
            },

            //diags: a list of event types passed to onReadyEvent (in chron order)
            onReadyChain : []
        });
    }


    /**
     * Alias for {@link Ext.Loader#onReady Ext.Loader.onReady} with withDomReady set to true
     * @member Ext
     * @method onReady
     */
    Ext.onReady = function(fn, scope, options) {
        Ext.Loader.onReady(fn, scope, true, options);
    };

    /**
     * Alias for {@link Ext.EventManager#onDocumentReady Ext.EventManager.onDocumentReady}
     * @member Ext
     * @method onDocumentReady
     */
    Ext.onDocumentReady = EventManager.onDocumentReady;

    /**
     * Alias for {@link Ext.EventManager#addListener Ext.EventManager.addListener}
     * @member Ext.EventManager
     * @method on
     */
    EventManager.on = EventManager.addListener;

    /**
     * Alias for {@link Ext.EventManager#removeListener Ext.EventManager.removeListener}
     * @member Ext.EventManager
     * @method un
     */
    EventManager.un = EventManager.removeListener;

    Ext.onReady(initExtCss);
};

/**
 * @class Ext.EventObject

Just as {@link Ext.Element} wraps around a native DOM node, Ext.EventObject
wraps the browser's native event-object normalizing cross-browser differences,
such as which mouse button is clicked, keys pressed, mechanisms to stop
event-propagation along with a method to prevent default actions from taking place.

For example:

    function handleClick(e, t){ // e is not a standard event object, it is a Ext.EventObject
        e.preventDefault();
        var target = e.getTarget(); // same as t (the target HTMLElement)
        ...
    }

    var myDiv = {@link Ext#get Ext.get}("myDiv");  // get reference to an {@link Ext.Element}
    myDiv.on(         // 'on' is shorthand for addListener
        "click",      // perform an action on click of myDiv
        handleClick   // reference to the action handler
    );

    // other methods to do the same:
    Ext.EventManager.on("myDiv", 'click', handleClick);
    Ext.EventManager.addListener("myDiv", 'click', handleClick);

 * @singleton
 * @markdown
 */
Ext.define('Ext.EventObjectImpl', {
    uses: ['Ext.util.Point'],

    /** Key constant @type Number */
    BACKSPACE: 8,
    /** Key constant @type Number */
    TAB: 9,
    /** Key constant @type Number */
    NUM_CENTER: 12,
    /** Key constant @type Number */
    ENTER: 13,
    /** Key constant @type Number */
    RETURN: 13,
    /** Key constant @type Number */
    SHIFT: 16,
    /** Key constant @type Number */
    CTRL: 17,
    /** Key constant @type Number */
    ALT: 18,
    /** Key constant @type Number */
    PAUSE: 19,
    /** Key constant @type Number */
    CAPS_LOCK: 20,
    /** Key constant @type Number */
    ESC: 27,
    /** Key constant @type Number */
    SPACE: 32,
    /** Key constant @type Number */
    PAGE_UP: 33,
    /** Key constant @type Number */
    PAGE_DOWN: 34,
    /** Key constant @type Number */
    END: 35,
    /** Key constant @type Number */
    HOME: 36,
    /** Key constant @type Number */
    LEFT: 37,
    /** Key constant @type Number */
    UP: 38,
    /** Key constant @type Number */
    RIGHT: 39,
    /** Key constant @type Number */
    DOWN: 40,
    /** Key constant @type Number */
    PRINT_SCREEN: 44,
    /** Key constant @type Number */
    INSERT: 45,
    /** Key constant @type Number */
    DELETE: 46,
    /** Key constant @type Number */
    ZERO: 48,
    /** Key constant @type Number */
    ONE: 49,
    /** Key constant @type Number */
    TWO: 50,
    /** Key constant @type Number */
    THREE: 51,
    /** Key constant @type Number */
    FOUR: 52,
    /** Key constant @type Number */
    FIVE: 53,
    /** Key constant @type Number */
    SIX: 54,
    /** Key constant @type Number */
    SEVEN: 55,
    /** Key constant @type Number */
    EIGHT: 56,
    /** Key constant @type Number */
    NINE: 57,
    /** Key constant @type Number */
    A: 65,
    /** Key constant @type Number */
    B: 66,
    /** Key constant @type Number */
    C: 67,
    /** Key constant @type Number */
    D: 68,
    /** Key constant @type Number */
    E: 69,
    /** Key constant @type Number */
    F: 70,
    /** Key constant @type Number */
    G: 71,
    /** Key constant @type Number */
    H: 72,
    /** Key constant @type Number */
    I: 73,
    /** Key constant @type Number */
    J: 74,
    /** Key constant @type Number */
    K: 75,
    /** Key constant @type Number */
    L: 76,
    /** Key constant @type Number */
    M: 77,
    /** Key constant @type Number */
    N: 78,
    /** Key constant @type Number */
    O: 79,
    /** Key constant @type Number */
    P: 80,
    /** Key constant @type Number */
    Q: 81,
    /** Key constant @type Number */
    R: 82,
    /** Key constant @type Number */
    S: 83,
    /** Key constant @type Number */
    T: 84,
    /** Key constant @type Number */
    U: 85,
    /** Key constant @type Number */
    V: 86,
    /** Key constant @type Number */
    W: 87,
    /** Key constant @type Number */
    X: 88,
    /** Key constant @type Number */
    Y: 89,
    /** Key constant @type Number */
    Z: 90,
    /** Key constant @type Number */
    CONTEXT_MENU: 93,
    /** Key constant @type Number */
    NUM_ZERO: 96,
    /** Key constant @type Number */
    NUM_ONE: 97,
    /** Key constant @type Number */
    NUM_TWO: 98,
    /** Key constant @type Number */
    NUM_THREE: 99,
    /** Key constant @type Number */
    NUM_FOUR: 100,
    /** Key constant @type Number */
    NUM_FIVE: 101,
    /** Key constant @type Number */
    NUM_SIX: 102,
    /** Key constant @type Number */
    NUM_SEVEN: 103,
    /** Key constant @type Number */
    NUM_EIGHT: 104,
    /** Key constant @type Number */
    NUM_NINE: 105,
    /** Key constant @type Number */
    NUM_MULTIPLY: 106,
    /** Key constant @type Number */
    NUM_PLUS: 107,
    /** Key constant @type Number */
    NUM_MINUS: 109,
    /** Key constant @type Number */
    NUM_PERIOD: 110,
    /** Key constant @type Number */
    NUM_DIVISION: 111,
    /** Key constant @type Number */
    F1: 112,
    /** Key constant @type Number */
    F2: 113,
    /** Key constant @type Number */
    F3: 114,
    /** Key constant @type Number */
    F4: 115,
    /** Key constant @type Number */
    F5: 116,
    /** Key constant @type Number */
    F6: 117,
    /** Key constant @type Number */
    F7: 118,
    /** Key constant @type Number */
    F8: 119,
    /** Key constant @type Number */
    F9: 120,
    /** Key constant @type Number */
    F10: 121,
    /** Key constant @type Number */
    F11: 122,
    /** Key constant @type Number */
    F12: 123,
    /**
     * The mouse wheel delta scaling factor. This value depends on browser version and OS and
     * attempts to produce a similar scrolling experience across all platforms and browsers.
     *
     * To change this value:
     *
     *      Ext.EventObjectImpl.prototype.WHEEL_SCALE = 72;
     *
     * @type Number
     * @markdown
     */
    WHEEL_SCALE: (function () {
        var scale;

        if (Ext.isGecko) {
            // Firefox uses 3 on all platforms
            scale = 3;
        } else if (Ext.isMac) {
            // Continuous scrolling devices have momentum and produce much more scroll than
            // discrete devices on the same OS and browser. To make things exciting, Safari
            // (and not Chrome) changed from small values to 120 (like IE).

            if (Ext.isSafari && Ext.webKitVersion >= 532.0) {
                // Safari changed the scrolling factor to match IE (for details see
                // https://bugs.webkit.org/show_bug.cgi?id=24368). The WebKit version where this
                // change was introduced was 532.0
                //      Detailed discussion:
                //      https://bugs.webkit.org/show_bug.cgi?id=29601
                //      http://trac.webkit.org/browser/trunk/WebKit/chromium/src/mac/WebInputEventFactory.mm#L1063
                scale = 120;
            } else {
                // MS optical wheel mouse produces multiples of 12 which is close enough
                // to help tame the speed of the continuous mice...
                scale = 12;
            }

            // Momentum scrolling produces very fast scrolling, so increase the scale factor
            // to help produce similar results cross platform. This could be even larger and
            // it would help those mice, but other mice would become almost unusable as a
            // result (since we cannot tell which device type is in use).
            scale *= 3;
        } else {
            // IE, Opera and other Windows browsers use 120.
            scale = 120;
        }

        return scale;
    }()),

    /**
     * Simple click regex
     * @private
     */
    clickRe: /(dbl)?click/,
    // safari keypress events for special keys return bad keycodes
    safariKeys: {
        3: 13, // enter
        63234: 37, // left
        63235: 39, // right
        63232: 38, // up
        63233: 40, // down
        63276: 33, // page up
        63277: 34, // page down
        63272: 46, // delete
        63273: 36, // home
        63275: 35 // end
    },
    // normalize button clicks, don't see any way to feature detect this.
    btnMap: Ext.isIE ? {
        1: 0,
        4: 1,
        2: 2
    } : {
        0: 0,
        1: 1,
        2: 2
    },
    
    /**
     * @property {Boolean} ctrlKey
     * True if the control key was down during the event.
     * In Mac this will also be true when meta key was down.
     */
    /**
     * @property {Boolean} altKey
     * True if the alt key was down during the event.
     */
    /**
     * @property {Boolean} shiftKey
     * True if the shift key was down during the event.
     */

    constructor: function(event, freezeEvent){
        if (event) {
            this.setEvent(event.browserEvent || event, freezeEvent);
        }
    },

    setEvent: function(event, freezeEvent){
        var me = this, button, options;

        if (event == me || (event && event.browserEvent)) { // already wrapped
            return event;
        }
        me.browserEvent = event;
        if (event) {
            // normalize buttons
            button = event.button ? me.btnMap[event.button] : (event.which ? event.which - 1 : -1);
            if (me.clickRe.test(event.type) && button == -1) {
                button = 0;
            }
            options = {
                type: event.type,
                button: button,
                shiftKey: event.shiftKey,
                // mac metaKey behaves like ctrlKey
                ctrlKey: event.ctrlKey || event.metaKey || false,
                altKey: event.altKey,
                // in getKey these will be normalized for the mac
                keyCode: event.keyCode,
                charCode: event.charCode,
                // cache the targets for the delayed and or buffered events
                target: Ext.EventManager.getTarget(event),
                relatedTarget: Ext.EventManager.getRelatedTarget(event),
                currentTarget: event.currentTarget,
                xy: (freezeEvent ? me.getXY() : null)
            };
        } else {
            options = {
                button: -1,
                shiftKey: false,
                ctrlKey: false,
                altKey: false,
                keyCode: 0,
                charCode: 0,
                target: null,
                xy: [0, 0]
            };
        }
        Ext.apply(me, options);
        return me;
    },

    /**
     * Stop the event (preventDefault and stopPropagation)
     */
    stopEvent: function(){
        this.stopPropagation();
        this.preventDefault();
    },

    /**
     * Prevents the browsers default handling of the event.
     */
    preventDefault: function(){
        if (this.browserEvent) {
            Ext.EventManager.preventDefault(this.browserEvent);
        }
    },

    /**
     * Cancels bubbling of the event.
     */
    stopPropagation: function(){
        var browserEvent = this.browserEvent;

        if (browserEvent) {
            if (browserEvent.type == 'mousedown') {
                Ext.EventManager.stoppedMouseDownEvent.fire(this);
            }
            Ext.EventManager.stopPropagation(browserEvent);
        }
    },

    /**
     * Gets the character code for the event.
     * @return {Number}
     */
    getCharCode: function(){
        return this.charCode || this.keyCode;
    },

    /**
     * Returns a normalized keyCode for the event.
     * @return {Number} The key code
     */
    getKey: function(){
        return this.normalizeKey(this.keyCode || this.charCode);
    },

    /**
     * Normalize key codes across browsers
     * @private
     * @param {Number} key The key code
     * @return {Number} The normalized code
     */
    normalizeKey: function(key){
        // can't feature detect this
        return Ext.isWebKit ? (this.safariKeys[key] || key) : key;
    },

    /**
     * Gets the x coordinate of the event.
     * @return {Number}
     * @deprecated 4.0 Replaced by {@link #getX}
     */
    getPageX: function(){
        return this.getX();
    },

    /**
     * Gets the y coordinate of the event.
     * @return {Number}
     * @deprecated 4.0 Replaced by {@link #getY}
     */
    getPageY: function(){
        return this.getY();
    },

    /**
     * Gets the x coordinate of the event.
     * @return {Number}
     */
    getX: function() {
        return this.getXY()[0];
    },

    /**
     * Gets the y coordinate of the event.
     * @return {Number}
     */
    getY: function() {
        return this.getXY()[1];
    },

    /**
     * Gets the page coordinates of the event.
     * @return {Number[]} The xy values like [x, y]
     */
    getXY: function() {
        if (!this.xy) {
            // same for XY
            this.xy = Ext.EventManager.getPageXY(this.browserEvent);
        }
        return this.xy;
    },

    /**
     * Gets the target for the event.
     * @param {String} selector (optional) A simple selector to filter the target or look for an ancestor of the target
     * @param {Number/HTMLElement} maxDepth (optional) The max depth to search as a number or element (defaults to 10 || document.body)
     * @param {Boolean} returnEl (optional) True to return a Ext.Element object instead of DOM node
     * @return {HTMLElement}
     */
    getTarget : function(selector, maxDepth, returnEl){
        if (selector) {
            return Ext.fly(this.target).findParent(selector, maxDepth, returnEl);
        }
        return returnEl ? Ext.get(this.target) : this.target;
    },

    /**
     * Gets the related target.
     * @param {String} selector (optional) A simple selector to filter the target or look for an ancestor of the target
     * @param {Number/HTMLElement} maxDepth (optional) The max depth to search as a number or element (defaults to 10 || document.body)
     * @param {Boolean} returnEl (optional) True to return a Ext.Element object instead of DOM node
     * @return {HTMLElement}
     */
    getRelatedTarget : function(selector, maxDepth, returnEl){
        if (selector) {
            return Ext.fly(this.relatedTarget).findParent(selector, maxDepth, returnEl);
        }
        return returnEl ? Ext.get(this.relatedTarget) : this.relatedTarget;
    },

    /**
     * Correctly scales a given wheel delta.
     * @param {Number} delta The delta value.
     */
    correctWheelDelta : function (delta) {
        var scale = this.WHEEL_SCALE,
            ret = Math.round(delta / scale);

        if (!ret && delta) {
            ret = (delta < 0) ? -1 : 1; // don't allow non-zero deltas to go to zero!
        }

        return ret;
    },

    /**
     * Returns the mouse wheel deltas for this event.
     * @return {Object} An object with "x" and "y" properties holding the mouse wheel deltas.
     */
    getWheelDeltas : function () {
        var me = this,
            event = me.browserEvent,
            dx = 0, dy = 0; // the deltas

        if (Ext.isDefined(event.wheelDeltaX)) { // WebKit has both dimensions
            dx = event.wheelDeltaX;
            dy = event.wheelDeltaY;
        } else if (event.wheelDelta) { // old WebKit and IE
            dy = event.wheelDelta;
        } else if (event.detail) { // Gecko
            dy = -event.detail; // gecko is backwards

            // Gecko sometimes returns really big values if the user changes settings to
            // scroll a whole page per scroll
            if (dy > 100) {
                dy = 3;
            } else if (dy < -100) {
                dy = -3;
            }

            // Firefox 3.1 adds an axis field to the event to indicate direction of
            // scroll.  See https://developer.mozilla.org/en/Gecko-Specific_DOM_Events
            if (Ext.isDefined(event.axis) && event.axis === event.HORIZONTAL_AXIS) {
                dx = dy;
                dy = 0;
            }
        }

        return {
            x: me.correctWheelDelta(dx),
            y: me.correctWheelDelta(dy)
        };
    },

    /**
     * Normalizes mouse wheel y-delta across browsers. To get x-delta information, use
     * {@link #getWheelDeltas} instead.
     * @return {Number} The mouse wheel y-delta
     */
    getWheelDelta : function(){
        var deltas = this.getWheelDeltas();

        return deltas.y;
    },

    /**
     * Returns true if the target of this event is a child of el.  Unless the allowEl parameter is set, it will return false if if the target is el.
     * Example usage:<pre><code>
// Handle click on any child of an element
Ext.getBody().on('click', function(e){
    if(e.within('some-el')){
        alert('Clicked on a child of some-el!');
    }
});

// Handle click directly on an element, ignoring clicks on child nodes
Ext.getBody().on('click', function(e,t){
    if((t.id == 'some-el') && !e.within(t, true)){
        alert('Clicked directly on some-el!');
    }
});
</code></pre>
     * @param {String/HTMLElement/Ext.Element} el The id, DOM element or Ext.Element to check
     * @param {Boolean} related (optional) true to test if the related target is within el instead of the target
     * @param {Boolean} allowEl (optional) true to also check if the passed element is the target or related target
     * @return {Boolean}
     */
    within : function(el, related, allowEl){
        if(el){
            var t = related ? this.getRelatedTarget() : this.getTarget(),
                result;

            if (t) {
                result = Ext.fly(el).contains(t);
                if (!result && allowEl) {
                    result = t == Ext.getDom(el);
                }
                return result;
            }
        }
        return false;
    },

    /**
     * Checks if the key pressed was a "navigation" key
     * @return {Boolean} True if the press is a navigation keypress
     */
    isNavKeyPress : function(){
        var me = this,
            k = this.normalizeKey(me.keyCode);

       return (k >= 33 && k <= 40) ||  // Page Up/Down, End, Home, Left, Up, Right, Down
       k == me.RETURN ||
       k == me.TAB ||
       k == me.ESC;
    },

    /**
     * Checks if the key pressed was a "special" key
     * @return {Boolean} True if the press is a special keypress
     */
    isSpecialKey : function(){
        var k = this.normalizeKey(this.keyCode);
        return (this.type == 'keypress' && this.ctrlKey) ||
        this.isNavKeyPress() ||
        (k == this.BACKSPACE) || // Backspace
        (k >= 16 && k <= 20) || // Shift, Ctrl, Alt, Pause, Caps Lock
        (k >= 44 && k <= 46);   // Print Screen, Insert, Delete
    },

    /**
     * Returns a point object that consists of the object coordinates.
     * @return {Ext.util.Point} point
     */
    getPoint : function(){
        var xy = this.getXY();
        return new Ext.util.Point(xy[0], xy[1]);
    },

   /**
    * Returns true if the control, meta, shift or alt key was pressed during this event.
    * @return {Boolean}
    */
    hasModifier : function(){
        return this.ctrlKey || this.altKey || this.shiftKey || this.metaKey;
    },

    /**
     * Injects a DOM event using the data in this object and (optionally) a new target.
     * This is a low-level technique and not likely to be used by application code. The
     * currently supported event types are:
     * <p><b>HTMLEvents</b></p>
     * <ul>
     * <li>load</li>
     * <li>unload</li>
     * <li>select</li>
     * <li>change</li>
     * <li>submit</li>
     * <li>reset</li>
     * <li>resize</li>
     * <li>scroll</li>
     * </ul>
     * <p><b>MouseEvents</b></p>
     * <ul>
     * <li>click</li>
     * <li>dblclick</li>
     * <li>mousedown</li>
     * <li>mouseup</li>
     * <li>mouseover</li>
     * <li>mousemove</li>
     * <li>mouseout</li>
     * </ul>
     * <p><b>UIEvents</b></p>
     * <ul>
     * <li>focusin</li>
     * <li>focusout</li>
     * <li>activate</li>
     * <li>focus</li>
     * <li>blur</li>
     * </ul>
     * @param {Ext.Element/HTMLElement} target (optional) If specified, the target for the event. This
     * is likely to be used when relaying a DOM event. If not specified, {@link #getTarget}
     * is used to determine the target.
     */
    injectEvent: (function () {
        var API,
            dispatchers = {}, // keyed by event type (e.g., 'mousedown')
            crazyIEButtons;

        // Good reference: http://developer.yahoo.com/yui/docs/UserAction.js.html

        // IE9 has createEvent, but this code causes major problems with htmleditor (it
        // blocks all mouse events and maybe more). TODO

        if (!Ext.isIE && document.createEvent) { // if (DOM compliant)
            API = {
                createHtmlEvent: function (doc, type, bubbles, cancelable) {
                    var event = doc.createEvent('HTMLEvents');

                    event.initEvent(type, bubbles, cancelable);
                    return event;
                },

                createMouseEvent: function (doc, type, bubbles, cancelable, detail,
                                            clientX, clientY, ctrlKey, altKey, shiftKey, metaKey,
                                            button, relatedTarget) {
                    var event = doc.createEvent('MouseEvents'),
                        view = doc.defaultView || window;

                    if (event.initMouseEvent) {
                        event.initMouseEvent(type, bubbles, cancelable, view, detail,
                                    clientX, clientY, clientX, clientY, ctrlKey, altKey,
                                    shiftKey, metaKey, button, relatedTarget);
                    } else { // old Safari
                        event = doc.createEvent('UIEvents');
                        event.initEvent(type, bubbles, cancelable);
                        event.view = view;
                        event.detail = detail;
                        event.screenX = clientX;
                        event.screenY = clientY;
                        event.clientX = clientX;
                        event.clientY = clientY;
                        event.ctrlKey = ctrlKey;
                        event.altKey = altKey;
                        event.metaKey = metaKey;
                        event.shiftKey = shiftKey;
                        event.button = button;
                        event.relatedTarget = relatedTarget;
                    }

                    return event;
                },

                createUIEvent: function (doc, type, bubbles, cancelable, detail) {
                    var event = doc.createEvent('UIEvents'),
                        view = doc.defaultView || window;

                    event.initUIEvent(type, bubbles, cancelable, view, detail);
                    return event;
                },

                fireEvent: function (target, type, event) {
                    target.dispatchEvent(event);
                },

                fixTarget: function (target) {
                    // Safari3 doesn't have window.dispatchEvent()
                    if (target == window && !target.dispatchEvent) {
                        return document;
                    }

                    return target;
                }
            };
        } else if (document.createEventObject) { // else if (IE)
            crazyIEButtons = { 0: 1, 1: 4, 2: 2 };

            API = {
                createHtmlEvent: function (doc, type, bubbles, cancelable) {
                    var event = doc.createEventObject();
                    event.bubbles = bubbles;
                    event.cancelable = cancelable;
                    return event;
                },

                createMouseEvent: function (doc, type, bubbles, cancelable, detail,
                                            clientX, clientY, ctrlKey, altKey, shiftKey, metaKey,
                                            button, relatedTarget) {
                    var event = doc.createEventObject();
                    event.bubbles = bubbles;
                    event.cancelable = cancelable;
                    event.detail = detail;
                    event.screenX = clientX;
                    event.screenY = clientY;
                    event.clientX = clientX;
                    event.clientY = clientY;
                    event.ctrlKey = ctrlKey;
                    event.altKey = altKey;
                    event.shiftKey = shiftKey;
                    event.metaKey = metaKey;
                    event.button = crazyIEButtons[button] || button;
                    event.relatedTarget = relatedTarget; // cannot assign to/fromElement
                    return event;
                },

                createUIEvent: function (doc, type, bubbles, cancelable, detail) {
                    var event = doc.createEventObject();
                    event.bubbles = bubbles;
                    event.cancelable = cancelable;
                    return event;
                },

                fireEvent: function (target, type, event) {
                    target.fireEvent('on' + type, event);
                },

                fixTarget: function (target) {
                    if (target == document) {
                        // IE6,IE7 thinks window==document and doesn't have window.fireEvent()
                        // IE6,IE7 cannot properly call document.fireEvent()
                        return document.documentElement;
                    }

                    return target;
                }
            };
        }

        //----------------
        // HTMLEvents

        Ext.Object.each({
                load:   [false, false],
                unload: [false, false],
                select: [true, false],
                change: [true, false],
                submit: [true, true],
                reset:  [true, false],
                resize: [true, false],
                scroll: [true, false]
            },
            function (name, value) {
                var bubbles = value[0], cancelable = value[1];
                dispatchers[name] = function (targetEl, srcEvent) {
                    var e = API.createHtmlEvent(name, bubbles, cancelable);
                    API.fireEvent(targetEl, name, e);
                };
            });

        //----------------
        // MouseEvents

        function createMouseEventDispatcher (type, detail) {
            var cancelable = (type != 'mousemove');
            return function (targetEl, srcEvent) {
                var xy = srcEvent.getXY(),
                    e = API.createMouseEvent(targetEl.ownerDocument, type, true, cancelable,
                                detail, xy[0], xy[1], srcEvent.ctrlKey, srcEvent.altKey,
                                srcEvent.shiftKey, srcEvent.metaKey, srcEvent.button,
                                srcEvent.relatedTarget);
                API.fireEvent(targetEl, type, e);
            };
        }

        Ext.each(['click', 'dblclick', 'mousedown', 'mouseup', 'mouseover', 'mousemove', 'mouseout'],
            function (eventName) {
                dispatchers[eventName] = createMouseEventDispatcher(eventName, 1);
            });

        //----------------
        // UIEvents

        Ext.Object.each({
                focusin:  [true, false],
                focusout: [true, false],
                activate: [true, true],
                focus:    [false, false],
                blur:     [false, false]
            },
            function (name, value) {
                var bubbles = value[0], cancelable = value[1];
                dispatchers[name] = function (targetEl, srcEvent) {
                    var e = API.createUIEvent(targetEl.ownerDocument, name, bubbles, cancelable, 1);
                    API.fireEvent(targetEl, name, e);
                };
            });

        //---------
        if (!API) {
            // not even sure what ancient browsers fall into this category...

            dispatchers = {}; // never mind all those we just built :P

            API = {
                fixTarget: function (t) {
                    return t;
                }
            };
        }

        function cannotInject (target, srcEvent) {
            // TODO log something
        }

        return function (target) {
            var me = this,
                dispatcher = dispatchers[me.type] || cannotInject,
                t = target ? (target.dom || target) : me.getTarget();

            t = API.fixTarget(t);
            dispatcher(t, me);
        };
    }()) // call to produce method

}, function() {

Ext.EventObject = new Ext.EventObjectImpl();

});
