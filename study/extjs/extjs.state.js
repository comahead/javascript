
/**
 * @class Ext.state.Provider
 * <p>Abstract base class for state provider implementations. The provider is responsible
 * for setting values  and extracting values to/from the underlying storage source. The 
 * storage source can vary and the details should be implemented in a subclass. For example
 * a provider could use a server side database or the browser localstorage where supported.</p>
 *
 * <p>This class provides methods for encoding and decoding <b>typed</b> variables including 
 * dates and defines the Provider interface. By default these methods put the value and the
 * type information into a delimited string that can be stored. These should be overridden in 
 * a subclass if you want to change the format of the encoded value and subsequent decoding.</p>
 */
Ext.define('Ext.state.Provider', {
    mixins: {
        observable: 'Ext.util.Observable'
    },
    
    /**
     * @cfg {String} prefix A string to prefix to items stored in the underlying state store. 
     * Defaults to <tt>'ext-'</tt>
     */
    prefix: 'ext-',
    
    constructor : function(config){
        config = config || {};
        var me = this;
        Ext.apply(me, config);
        /**
         * @event statechange
         * Fires when a state change occurs.
         * @param {Ext.state.Provider} this This state provider
         * @param {String} key The state key which was changed
         * @param {String} value The encoded value for the state
         */
        me.addEvents("statechange");
        me.state = {};
        me.mixins.observable.constructor.call(me);
    },
    
    /**
     * Returns the current value for a key
     * @param {String} name The key name
     * @param {Object} defaultValue A default value to return if the key's value is not found
     * @return {Object} The state data
     */
    get : function(name, defaultValue){
        return typeof this.state[name] == "undefined" ?
            defaultValue : this.state[name];
    },

    /**
     * Clears a value from the state
     * @param {String} name The key name
     */
    clear : function(name){
        var me = this;
        delete me.state[name];
        me.fireEvent("statechange", me, name, null);
    },

    /**
     * Sets the value for a key
     * @param {String} name The key name
     * @param {Object} value The value to set
     */
    set : function(name, value){
        var me = this;
        me.state[name] = value;
        me.fireEvent("statechange", me, name, value);
    },

    /**
     * Decodes a string previously encoded with {@link #encodeValue}.
     * @param {String} value The value to decode
     * @return {Object} The decoded value
     */
    decodeValue : function(value){

        // a -> Array
        // n -> Number
        // d -> Date
        // b -> Boolean
        // s -> String
        // o -> Object
        // -> Empty (null)

        var me = this,
            re = /^(a|n|d|b|s|o|e)\:(.*)$/,
            matches = re.exec(unescape(value)),
            all,
            type,
            keyValue,
            values,
            vLen,
            v;
            
        if(!matches || !matches[1]){
            return; // non state
        }
        
        type = matches[1];
        value = matches[2];
        switch (type) {
            case 'e':
                return null;
            case 'n':
                return parseFloat(value);
            case 'd':
                return new Date(Date.parse(value));
            case 'b':
                return (value == '1');
            case 'a':
                all = [];
                if(value != ''){
                    values = value.split('^');
                    vLen   = values.length;

                    for (v = 0; v < vLen; v++) {
                        value = values[v];
                        all.push(me.decodeValue(value));
                    }
                }
                return all;
           case 'o':
                all = {};
                if(value != ''){
                    values = value.split('^');
                    vLen   = values.length;

                    for (v = 0; v < vLen; v++) {
                        value = values[v];
                        keyValue         = value.split('=');
                        all[keyValue[0]] = me.decodeValue(keyValue[1]);
                    }
                }
                return all;
           default:
                return value;
        }
    },

    /**
     * Encodes a value including type information.  Decode with {@link #decodeValue}.
     * @param {Object} value The value to encode
     * @return {String} The encoded value
     */
    encodeValue : function(value){
        var flat = '',
            i = 0,
            enc,
            len,
            key;
            
        if (value == null) {
            return 'e:1';    
        } else if(typeof value == 'number') {
            enc = 'n:' + value;
        } else if(typeof value == 'boolean') {
            enc = 'b:' + (value ? '1' : '0');
        } else if(Ext.isDate(value)) {
            enc = 'd:' + value.toGMTString();
        } else if(Ext.isArray(value)) {
            for (len = value.length; i < len; i++) {
                flat += this.encodeValue(value[i]);
                if (i != len - 1) {
                    flat += '^';
                }
            }
            enc = 'a:' + flat;
        } else if (typeof value == 'object') {
            for (key in value) {
                if (typeof value[key] != 'function' && value[key] !== undefined) {
                    flat += key + '=' + this.encodeValue(value[key]) + '^';
                }
            }
            enc = 'o:' + flat.substring(0, flat.length-1);
        } else {
            enc = 's:' + value;
        }
        return escape(enc);
    }
});
/**
 * A Provider implementation which saves and retrieves state via cookies. The CookieProvider supports the usual cookie
 * options, such as:
 *
 * - {@link #path}
 * - {@link #expires}
 * - {@link #domain}
 * - {@link #secure}
 *
 * Example:
 *
 *     var cp = Ext.create('Ext.state.CookieProvider', {
 *         path: "/cgi-bin/",
 *         expires: new Date(new Date().getTime()+(1000*60*60*24*30)), //30 days
 *         domain: "sencha.com"
 *     });
 *
 *     Ext.state.Manager.setProvider(cp);
 *
 */
Ext.define('Ext.state.CookieProvider', {
    extend: 'Ext.state.Provider',

    /**
     * @cfg {String} path
     * The path for which the cookie is active. Defaults to root '/' which makes it active for all pages in the site.
     */

    /**
     * @cfg {Date} expires
     * The cookie expiration date. Defaults to 7 days from now.
     */

    /**
     * @cfg {String} domain
     * The domain to save the cookie for. Note that you cannot specify a different domain than your page is on, but you can
     * specify a sub-domain, or simply the domain itself like 'sencha.com' to include all sub-domains if you need to access
     * cookies across different sub-domains. Defaults to null which uses the same domain the page is running on including
     * the 'www' like 'www.sencha.com'.
     */

    /**
     * @cfg {Boolean} [secure=false]
     * True if the site is using SSL
     */

    /**
     * Creates a new CookieProvider.
     * @param {Object} [config] Config object.
     */
    constructor : function(config){
        var me = this;
        me.path = "/";
        me.expires = new Date(new Date().getTime()+(1000*60*60*24*7)); //7 days
        me.domain = null;
        me.secure = false;
        me.callParent(arguments);
        me.state = me.readCookies();
    },

    // private
    set : function(name, value){
        var me = this;

        if(typeof value == "undefined" || value === null){
            me.clear(name);
            return;
        }
        me.setCookie(name, value);
        me.callParent(arguments);
    },

    // private
    clear : function(name){
        this.clearCookie(name);
        this.callParent(arguments);
    },

    // private
    readCookies : function(){
        var cookies = {},
            c = document.cookie + ";",
            re = /\s?(.*?)=(.*?);/g,
            prefix = this.prefix,
            len = prefix.length,
            matches,
            name,
            value;

        while((matches = re.exec(c)) != null){
            name = matches[1];
            value = matches[2];
            if (name && name.substring(0, len) == prefix){
                cookies[name.substr(len)] = this.decodeValue(value);
            }
        }
        return cookies;
    },

    // private
    setCookie : function(name, value){
        var me = this;

        document.cookie = me.prefix + name + "=" + me.encodeValue(value) +
           ((me.expires == null) ? "" : ("; expires=" + me.expires.toGMTString())) +
           ((me.path == null) ? "" : ("; path=" + me.path)) +
           ((me.domain == null) ? "" : ("; domain=" + me.domain)) +
           ((me.secure == true) ? "; secure" : "");
    },

    // private
    clearCookie : function(name){
        var me = this;

        document.cookie = me.prefix + name + "=null; expires=Thu, 01-Jan-70 00:00:01 GMT" +
           ((me.path == null) ? "" : ("; path=" + me.path)) +
           ((me.domain == null) ? "" : ("; domain=" + me.domain)) +
           ((me.secure == true) ? "; secure" : "");
    }
});

/**
 * @class Ext.state.LocalStorageProvider
 * A Provider implementation which saves and retrieves state via the HTML5 localStorage object.
 * If the browser does not support local storage, an exception will be thrown upon instantiating
 * this class.
 */

Ext.define('Ext.state.LocalStorageProvider', {
    /* Begin Definitions */
    
    extend: 'Ext.state.Provider',
    
    alias: 'state.localstorage',
    
    /* End Definitions */
   
    constructor: function(){
        var me = this;
        me.callParent(arguments);
        me.store = me.getStorageObject();
        me.state = me.readLocalStorage();
    },
    
    readLocalStorage: function(){
        var store = this.store,
            i = 0,
            len = store.length,
            prefix = this.prefix,
            prefixLen = prefix.length,
            data = {},
            key;
            
        for (; i < len; ++i) {
            key = store.key(i);
            if (key.substring(0, prefixLen) == prefix) {
                data[key.substr(prefixLen)] = this.decodeValue(store.getItem(key));
            }            
        }
        return data;
    },
    
    set : function(name, value){
        var me = this;
        
        me.clear(name);
        if (typeof value == "undefined" || value === null) {
            return;
        }
        me.store.setItem(me.prefix + name, me.encodeValue(value));
        me.callParent(arguments);
    },

    // private
    clear : function(name){
        this.store.removeItem(this.prefix + name);
        this.callParent(arguments);
    },
    
    getStorageObject: function(){
        try {
            var supports = 'localStorage' in window && window['localStorage'] !== null;
            if (supports) {
                return window.localStorage;
            }
        } catch (e) {
            return false;
        }
        Ext.Error.raise('LocalStorage is not supported by the current browser');
    }    
});

/**
 * @class Ext.state.Manager
 * This is the global state manager. By default all components that are "state aware" check this class
 * for state information if you don't pass them a custom state provider. In order for this class
 * to be useful, it must be initialized with a provider when your application initializes. Example usage:
 <pre><code>
// in your initialization function
init : function(){
   Ext.state.Manager.setProvider(new Ext.state.CookieProvider());
}
 </code></pre>
 * This class passes on calls from components to the underlying {@link Ext.state.Provider} so that
 * there is a common interface that can be used without needing to refer to a specific provider instance
 * in every component.
 * @singleton
 * @docauthor Evan Trimboli <evan@sencha.com>
 */
Ext.define('Ext.state.Manager', {
    singleton: true,
    requires: ['Ext.state.Provider'],
    constructor: function() {
        this.provider = new Ext.state.Provider();
    },
    
    
    /**
     * Configures the default state provider for your application
     * @param {Ext.state.Provider} stateProvider The state provider to set
     */
    setProvider : function(stateProvider){
        this.provider = stateProvider;
    },

    /**
     * Returns the current value for a key
     * @param {String} name The key name
     * @param {Object} defaultValue The default value to return if the key lookup does not match
     * @return {Object} The state data
     */
    get : function(key, defaultValue){
        return this.provider.get(key, defaultValue);
    },

    /**
     * Sets the value for a key
     * @param {String} name The key name
     * @param {Object} value The state data
     */
     set : function(key, value){
        this.provider.set(key, value);
    },

    /**
     * Clears a value from the state
     * @param {String} name The key name
     */
    clear : function(key){
        this.provider.clear(key);
    },

    /**
     * Gets the currently configured state provider
     * @return {Ext.state.Provider} The state provider
     */
    getProvider : function(){
        return this.provider;
    }
});
/**
 * @class Ext.state.Stateful
 * A mixin for being able to save the state of an object to an underlying
 * {@link Ext.state.Provider}.
 */
Ext.define('Ext.state.Stateful', {

    /* Begin Definitions */

    mixins: {
        observable: 'Ext.util.Observable'
    },

    requires: ['Ext.state.Manager'],

    /* End Definitions */

    /**
     * @cfg {Boolean} stateful
     * A flag which causes the object to attempt to restore the state of
     * internal properties from a saved state on startup. The object must have
     * a {@link #stateId} for state to be managed.
     * 
     * Auto-generated ids are not guaranteed to be stable across page loads and
     * cannot be relied upon to save and restore the same state for a object.<p>
     *
     * For state saving to work, the state manager's provider must have been
     * set to an implementation of {@link Ext.state.Provider} which overrides the
     * {@link Ext.state.Provider#set set} and {@link Ext.state.Provider#get get}
     * methods to save and recall name/value pairs. A built-in implementation,
     * {@link Ext.state.CookieProvider} is available.
     * 
     * To set the state provider for the current page:
     * 
     *    Ext.state.Manager.setProvider(new Ext.state.CookieProvider({
     *        expires: new Date(new Date().getTime()+(1000*60*60*24*7)), //7 days from now
     *    }));
     *
     * A stateful object attempts to save state when one of the events
     * listed in the {@link #stateEvents} configuration fires.
     * 
     * To save state, a stateful object first serializes its state by
     * calling *{@link #getState}*.
     * 
     * The Component base class implements {@link #getState} to save its width and height within the state
     * only if they were initially configured, and have changed from the configured value.
     * 
     * The Panel class saves its collapsed state in addition to that.
     * 
     * The Grid class saves its column state in addition to its superclass state.
     * 
     * If there is more application state to be save, the developer must provide an implementation which
     * first calls the superclass method to inherit the above behaviour, and then injects new properties
     * into the returned object.
     * 
     * The value yielded by getState is passed to {@link Ext.state.Manager#set}
     * which uses the configured {@link Ext.state.Provider} to save the object
     * keyed by the {@link #stateId}.
     * 
     * During construction, a stateful object attempts to *restore* its state by calling
     * {@link Ext.state.Manager#get} passing the {@link #stateId}
     * 
     * The resulting object is passed to {@link #applyState}*. The default implementation of
     * {@link #applyState} simply copies properties into the object, but a developer may
     * override this to support restoration of more complex application state.
     * 
     * You can perform extra processing on state save and restore by attaching
     * handlers to the {@link #beforestaterestore}, {@link #staterestore},
     * {@link #beforestatesave} and {@link #statesave} events.
     */
    stateful: false,

    /**
     * @cfg {String} stateId
     * The unique id for this object to use for state management purposes.
     * <p>See {@link #stateful} for an explanation of saving and restoring state.</p>
     */

    /**
     * @cfg {String[]} stateEvents
     * <p>An array of events that, when fired, should trigger this object to
     * save its state. Defaults to none. <code>stateEvents</code> may be any type
     * of event supported by this object, including browser or custom events
     * (e.g., <tt>['click', 'customerchange']</tt>).</p>
     * <p>See <code>{@link #stateful}</code> for an explanation of saving and
     * restoring object state.</p>
     */

    /**
     * @cfg {Number} saveDelay
     * A buffer to be applied if many state events are fired within a short period.
     */
    saveDelay: 100,

    constructor: function(config) {
        var me = this;

        config = config || {};
        if (config.stateful !== undefined) {
            me.stateful = config.stateful;
        }
        if (config.saveDelay !== undefined) {
            me.saveDelay = config.saveDelay;
        }
        me.stateId = me.stateId || config.stateId;

        if (!me.stateEvents) {
            me.stateEvents = [];
        }
        if (config.stateEvents) {
            me.stateEvents.concat(config.stateEvents);
        }
        this.addEvents(
            /**
             * @event beforestaterestore
             * Fires before the state of the object is restored. Return false from an event handler to stop the restore.
             * @param {Ext.state.Stateful} this
             * @param {Object} state The hash of state values returned from the StateProvider. If this
             * event is not vetoed, then the state object is passed to <b><tt>applyState</tt></b>. By default,
             * that simply copies property values into this object. The method maybe overriden to
             * provide custom state restoration.
             */
            'beforestaterestore',

            /**
             * @event staterestore
             * Fires after the state of the object is restored.
             * @param {Ext.state.Stateful} this
             * @param {Object} state The hash of state values returned from the StateProvider. This is passed
             * to <b><tt>applyState</tt></b>. By default, that simply copies property values into this
             * object. The method maybe overriden to provide custom state restoration.
             */
            'staterestore',

            /**
             * @event beforestatesave
             * Fires before the state of the object is saved to the configured state provider. Return false to stop the save.
             * @param {Ext.state.Stateful} this
             * @param {Object} state The hash of state values. This is determined by calling
             * <b><tt>getState()</tt></b> on the object. This method must be provided by the
             * developer to return whetever representation of state is required, by default, Ext.state.Stateful
             * has a null implementation.
             */
            'beforestatesave',

            /**
             * @event statesave
             * Fires after the state of the object is saved to the configured state provider.
             * @param {Ext.state.Stateful} this
             * @param {Object} state The hash of state values. This is determined by calling
             * <b><tt>getState()</tt></b> on the object. This method must be provided by the
             * developer to return whetever representation of state is required, by default, Ext.state.Stateful
             * has a null implementation.
             */
            'statesave'
        );
        me.mixins.observable.constructor.call(me);

        if (me.stateful !== false) {
            me.addStateEvents(me.stateEvents);
            me.initState();
        }
    },

    /**
     * Add events that will trigger the state to be saved. If the first argument is an
     * array, each element of that array is the name of a state event. Otherwise, each
     * argument passed to this method is the name of a state event.
     *
     * @param {String/String[]} events The event name or an array of event names.
     */
    addStateEvents: function (events) {
        var me = this,
            i, event, stateEventsByName;

        if (me.stateful && me.getStateId()) {
            if (typeof events == 'string') {
                events = Array.prototype.slice.call(arguments, 0);
            }

            stateEventsByName = me.stateEventsByName || (me.stateEventsByName = {});

            for (i = events.length; i--; ) {
                event = events[i];

                if (!stateEventsByName[event]) {
                    stateEventsByName[event] = 1;
                    me.on(event, me.onStateChange, me);
                }
            }
        }
    },

    /**
     * This method is called when any of the {@link #stateEvents} are fired.
     * @private
     */
    onStateChange: function(){
        var me = this,
            delay = me.saveDelay,
            statics, runner;

        if (!me.stateful) {
            return;
        }

        if (delay) {
            if (!me.stateTask) {
                statics = Ext.state.Stateful;
                runner = statics.runner || (statics.runner = new Ext.util.TaskRunner());

                me.stateTask = runner.newTask({
                    run: me.saveState,
                    scope: me,
                    interval: delay,
                    repeat: 1
                });
            }

            me.stateTask.start();
        } else {
            me.saveState();
        }
    },

    /**
     * Saves the state of the object to the persistence store.
     */
    saveState: function() {
        var me = this,
            id = me.stateful && me.getStateId(),
            hasListeners = me.hasListeners,
            state;

        if (id) {
            state = me.getState() || {};    //pass along for custom interactions
            if (!hasListeners.beforestatesave || me.fireEvent('beforestatesave', me, state) !== false) {
                Ext.state.Manager.set(id, state);
                if (hasListeners.statesave) {
                    me.fireEvent('statesave', me, state);
                }
            }
        }
    },

    /**
     * Gets the current state of the object. By default this function returns null,
     * it should be overridden in subclasses to implement methods for getting the state.
     * @return {Object} The current state
     */
    getState: function(){
        return null;
    },

    /**
     * Applies the state to the object. This should be overridden in subclasses to do
     * more complex state operations. By default it applies the state properties onto
     * the current object.
     * @param {Object} state The state
     */
    applyState: function(state) {
        if (state) {
            Ext.apply(this, state);
        }
    },

    /**
     * Gets the state id for this object.
     * @return {String} The 'stateId' or the implicit 'id' specified by component configuration.
     * @private
     */
    getStateId: function() {
        var me = this;
        return me.stateId || (me.autoGenId ? null : me.id);
    },

    /**
     * Initializes the state of the object upon construction.
     * @private
     */
    initState: function(){
        var me = this,
            id = me.stateful && me.getStateId(),
            hasListeners = me.hasListeners,
            state;

        if (id) {
            state = Ext.state.Manager.get(id);
            if (state) {
                state = Ext.apply({}, state);
                if (!hasListeners.beforestaterestore || me.fireEvent('beforestaterestore', me, state) !== false) {
                    me.applyState(state);
                    if (hasListeners.staterestore) {
                        me.fireEvent('staterestore', me, state);
                    }
                }
            }
        }
    },

    /**
     * Conditionally saves a single property from this object to the given state object.
     * The idea is to only save state which has changed from the initial state so that
     * current software settings do not override future software settings. Only those
     * values that are user-changed state should be saved.
     *
     * @param {String} propName The name of the property to save.
     * @param {Object} state The state object in to which to save the property.
     * @param {String} stateName (optional) The name to use for the property in state.
     * @return {Boolean} True if the property was saved, false if not.
     */
    savePropToState: function (propName, state, stateName) {
        var me = this,
            value = me[propName],
            config = me.initialConfig;

        if (me.hasOwnProperty(propName)) {
            if (!config || config[propName] !== value) {
                if (state) {
                    state[stateName || propName] = value;
                }
                return true;
            }
        }
        return false;
    },

    /**
     * Gathers additional named properties of the instance and adds their current values
     * to the passed state object.
     * @param {String/String[]} propNames The name (or array of names) of the property to save.
     * @param {Object} state The state object in to which to save the property values.
     * @return {Object} state
     */
    savePropsToState: function (propNames, state) {
        var me = this,
            i, n;

        if (typeof propNames == 'string') {
            me.savePropToState(propNames, state);
        } else {
            for (i = 0, n = propNames.length; i < n; ++i) {
                me.savePropToState(propNames[i], state);
            }
        }

        return state;
    },

    /**
     * Destroys this stateful object.
     */
    destroy: function(){
        var me = this,
            task = me.stateTask;

        if (task) {
            task.destroy();
            me.stateTask = null;
        }

        me.clearListeners();
    }
});