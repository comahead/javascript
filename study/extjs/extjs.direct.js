
/**
 * Ext.direct.Provider is an abstract class meant to be extended.
 *
 * For example Ext JS implements the following subclasses:
 *
 *     Provider
 *     |
 *     +---{@link Ext.direct.JsonProvider JsonProvider}
 *         |
 *         +---{@link Ext.direct.PollingProvider PollingProvider}
 *         |
 *         +---{@link Ext.direct.RemotingProvider RemotingProvider}
 *
 * @abstract
 */
Ext.define('Ext.direct.Provider', {

    /* Begin Definitions */

   alias: 'direct.provider',

    mixins: {
        observable: 'Ext.util.Observable'
    },

    /* End Definitions */

   /**
     * @cfg {String} id
     * The unique id of the provider (defaults to an {@link Ext#id auto-assigned id}).
     * You should assign an id if you need to be able to access the provider later and you do
     * not have an object reference available, for example:
     *
     *     Ext.direct.Manager.addProvider({
     *         type: 'polling',
     *         url:  'php/poll.php',
     *         id:   'poll-provider'
     *     });
     *     var p = {@link Ext.direct.Manager}.{@link Ext.direct.Manager#getProvider getProvider}('poll-provider');
     *     p.disconnect();
     *
     */

    constructor : function(config){
        var me = this;

        Ext.apply(me, config);
        me.addEvents(
            /**
             * @event connect
             * Fires when the Provider connects to the server-side
             * @param {Ext.direct.Provider} provider The {@link Ext.direct.Provider Provider}.
             */
            'connect',
            /**
             * @event disconnect
             * Fires when the Provider disconnects from the server-side
             * @param {Ext.direct.Provider} provider The {@link Ext.direct.Provider Provider}.
             */
            'disconnect',
            /**
             * @event data
             * Fires when the Provider receives data from the server-side
             * @param {Ext.direct.Provider} provider The {@link Ext.direct.Provider Provider}.
             * @param {Ext.direct.Event} e The Ext.direct.Event type that occurred.
             */
            'data',
            /**
             * @event exception
             * Fires when the Provider receives an exception from the server-side
             */
            'exception'
        );
        me.mixins.observable.constructor.call(me, config);
    },

    /**
     * Returns whether or not the server-side is currently connected.
     * Abstract method for subclasses to implement.
     */
    isConnected: function(){
        return false;
    },

    /**
     * Abstract methods for subclasses to implement.
     * @method
     */
    connect: Ext.emptyFn,

    /**
     * Abstract methods for subclasses to implement.
     * @method
     */
    disconnect: Ext.emptyFn
});

/**
 * @class Ext.direct.JsonProvider

A base provider for communicating using JSON. This is an abstract class
and should not be instanced directly.

 * @markdown
 * @abstract
 */

Ext.define('Ext.direct.JsonProvider', {

    /* Begin Definitions */

    extend: 'Ext.direct.Provider',

    alias: 'direct.jsonprovider',

    uses: ['Ext.direct.ExceptionEvent'],

    /* End Definitions */

   /**
    * Parse the JSON response
    * @private
    * @param {Object} response The XHR response object
    * @return {Object} The data in the response.
    */
   parseResponse: function(response){
        if (!Ext.isEmpty(response.responseText)) {
            if (Ext.isObject(response.responseText)) {
                return response.responseText;
            }
            return Ext.decode(response.responseText);
        }
        return null;
    },

    /**
     * Creates a set of events based on the XHR response
     * @private
     * @param {Object} response The XHR response
     * @return {Ext.direct.Event[]} An array of Ext.direct.Event
     */
    createEvents: function(response){
        var data = null,
            events = [],
            event,
            i = 0,
            len;

        try{
            data = this.parseResponse(response);
        } catch(e) {
            event = new Ext.direct.ExceptionEvent({
                data: e,
                xhr: response,
                code: Ext.direct.Manager.exceptions.PARSE,
                message: 'Error parsing json response: \n\n ' + data
            });
            return [event];
        }

        if (Ext.isArray(data)) {
            for (len = data.length; i < len; ++i) {
                events.push(this.createEvent(data[i]));
            }
        } else {
            events.push(this.createEvent(data));
        }
        return events;
    },

    /**
     * Create an event from a response object
     * @param {Object} response The XHR response object
     * @return {Ext.direct.Event} The event
     */
    createEvent: function(response){
        return Ext.create('direct.' + response.type, response);
    }
});
/**
 * @class Ext.direct.PollingProvider
 *
 * <p>Provides for repetitive polling of the server at distinct {@link #interval intervals}.
 * The initial request for data originates from the client, and then is responded to by the
 * server.</p>
 * 
 * <p>All configurations for the PollingProvider should be generated by the server-side
 * API portion of the Ext.Direct stack.</p>
 *
 * <p>An instance of PollingProvider may be created directly via the new keyword or by simply
 * specifying <tt>type = 'polling'</tt>.  For example:</p>
 * <pre><code>
var pollA = new Ext.direct.PollingProvider({
    type:'polling',
    url: 'php/pollA.php',
});
Ext.direct.Manager.addProvider(pollA);
pollA.disconnect();

Ext.direct.Manager.addProvider(
    {
        type:'polling',
        url: 'php/pollB.php',
        id: 'pollB-provider'
    }
);
var pollB = Ext.direct.Manager.getProvider('pollB-provider');
 * </code></pre>
 */
Ext.define('Ext.direct.PollingProvider', {
    
    /* Begin Definitions */
    
    extend: 'Ext.direct.JsonProvider',
    
    alias: 'direct.pollingprovider',
    
    uses: ['Ext.direct.ExceptionEvent'],
    
    requires: ['Ext.Ajax', 'Ext.util.DelayedTask'],
    
    /* End Definitions */
    
    /**
     * @cfg {Number} interval
     * How often to poll the server-side in milliseconds. Defaults to every 3 seconds.
     */
    interval: 3000,

    /**
     * @cfg {Object} baseParams
     * An object containing properties which are to be sent as parameters on every polling request
     */
    
    /**
     * @cfg {String/Function} url
     * The url which the PollingProvider should contact with each request. This can also be
     * an imported Ext.Direct method which will accept the baseParams as its only argument.
     */

    // private
    constructor : function(config){
        this.callParent(arguments);
        this.addEvents(
            /**
             * @event beforepoll
             * Fired immediately before a poll takes place, an event handler can return false
             * in order to cancel the poll.
             * @param {Ext.direct.PollingProvider} this
             */
            'beforepoll',            
            /**
             * @event poll
             * This event has not yet been implemented.
             * @param {Ext.direct.PollingProvider} this
             */
            'poll'
        );
    },

    // inherited
    isConnected: function(){
        return !!this.pollTask;
    },

    /**
     * Connect to the server-side and begin the polling process. To handle each
     * response subscribe to the data event.
     */
    connect: function(){
        var me = this, url = me.url;
        
        if (url && !me.pollTask) {
            me.pollTask = Ext.TaskManager.start({
                run: function(){
                    if (me.fireEvent('beforepoll', me) !== false) {
                        if (Ext.isFunction(url)) {
                            url(me.baseParams);
                        } else {
                            Ext.Ajax.request({
                                url: url,
                                callback: me.onData,
                                scope: me,
                                params: me.baseParams
                            });
                        }
                    }
                },
                interval: me.interval,
                scope: me
            });
            me.fireEvent('connect', me);
        } else if (!url) {
            Ext.Error.raise('Error initializing PollingProvider, no url configured.');
        }
    },

    /**
     * Disconnect from the server-side and stop the polling process. The disconnect
     * event will be fired on a successful disconnect.
     */
    disconnect: function(){
        var me = this;
        
        if (me.pollTask) {
            Ext.TaskManager.stop(me.pollTask);
            delete me.pollTask;
            me.fireEvent('disconnect', me);
        }
    },

    // private
    onData: function(opt, success, response){
        var me = this, 
            i = 0, 
            len,
            events;
        
        if (success) {
            events = me.createEvents(response);
            for (len = events.length; i < len; ++i) {
                me.fireEvent('data', me, events[i]);
            }
        } else {
            me.fireEvent('data', me, new Ext.direct.ExceptionEvent({
                data: null,
                code: Ext.direct.Manager.exceptions.TRANSPORT,
                message: 'Unable to connect to the server.',
                xhr: response
            }));
        }
    }
});



/**
 * Ext.Direct aims to streamline communication between the client and server by providing a single interface that
 * reduces the amount of common code typically required to validate data and handle returned data packets (reading data,
 * error conditions, etc).
 *
 * The Ext.direct namespace includes several classes for a closer integration with the server-side. The Ext.data
 * namespace also includes classes for working with Ext.data.Stores which are backed by data from an Ext.Direct method.
 *
 * # Specification
 *
 * For additional information consult the [Ext.Direct Specification][1].
 *
 * # Providers
 *
 * Ext.Direct uses a provider architecture, where one or more providers are used to transport data to and from the
 * server. There are several providers that exist in the core at the moment:
 *
 * - {@link Ext.direct.JsonProvider JsonProvider} for simple JSON operations
 * - {@link Ext.direct.PollingProvider PollingProvider} for repeated requests
 * - {@link Ext.direct.RemotingProvider RemotingProvider} exposes server side on the client.
 *
 * A provider does not need to be invoked directly, providers are added via {@link Ext.direct.Manager}.{@link #addProvider}.
 *
 * # Router
 *
 * Ext.Direct utilizes a "router" on the server to direct requests from the client to the appropriate server-side
 * method. Because the Ext.Direct API is completely platform-agnostic, you could completely swap out a Java based server
 * solution and replace it with one that uses C# without changing the client side JavaScript at all.
 *
 * # Server side events
 *
 * Custom events from the server may be handled by the client by adding listeners, for example:
 *
 *     {"type":"event","name":"message","data":"Successfully polled at: 11:19:30 am"}
 *
 *     // add a handler for a 'message' event sent by the server
 *     Ext.direct.Manager.on('message', function(e){
 *         out.append(String.format('<p><i>{0}</i></p>', e.data));
 *         out.el.scrollTo('t', 100000, true);
 *     });
 *
 *    [1]: http://sencha.com/products/extjs/extdirect
 *
 * @singleton
 * @alternateClassName Ext.Direct
 */
Ext.define('Ext.direct.Manager', {

    /* Begin Definitions */
    singleton: true,

    mixins: {
        observable: 'Ext.util.Observable'
    },

    requires: ['Ext.util.MixedCollection'],

    /**
     * Exception types.
     */
    exceptions: {
        TRANSPORT: 'xhr',
        PARSE: 'parse',
        LOGIN: 'login',
        SERVER: 'exception'
    },

    /* End Definitions */

    constructor: function(){
        var me = this;

        me.addEvents(
            /**
             * @event event
             * Fires after an event.
             * @param {Ext.direct.Event} e The Ext.direct.Event type that occurred.
             * @param {Ext.direct.Provider} provider The {@link Ext.direct.Provider Provider}.
             */
            'event',
            /**
             * @event exception
             * Fires after an event exception.
             * @param {Ext.direct.Event} e The event type that occurred.
             */
            'exception'
        );
        me.transactions = new Ext.util.MixedCollection();
        me.providers = new Ext.util.MixedCollection();

        me.mixins.observable.constructor.call(me);
    },

    /**
     * Adds an Ext.Direct Provider and creates the proxy or stub methods to execute server-side methods. If the provider
     * is not already connected, it will auto-connect.
     *
     *     var pollProv = new Ext.direct.PollingProvider({
     *         url: 'php/poll2.php'
     *     });
     *
     *     Ext.direct.Manager.addProvider({
     *         "type":"remoting",       // create a {@link Ext.direct.RemotingProvider}
     *         "url":"php\/router.php", // url to connect to the Ext.Direct server-side router.
     *         "actions":{              // each property within the actions object represents a Class
     *             "TestAction":[       // array of methods within each server side Class
     *             {
     *                 "name":"doEcho", // name of method
     *                 "len":1
     *             },{
     *                 "name":"multiply",
     *                 "len":1
     *             },{
     *                 "name":"doForm",
     *                 "formHandler":true, // handle form on server with Ext.Direct.Transaction
     *                 "len":1
     *             }]
     *         },
     *         "namespace":"myApplication",// namespace to create the Remoting Provider in
     *     },{
     *         type: 'polling', // create a {@link Ext.direct.PollingProvider}
     *         url:  'php/poll.php'
     *     }, pollProv); // reference to previously created instance
     *
     * @param {Ext.direct.Provider/Object...} provider
     * Accepts any number of Provider descriptions (an instance or config object for
     * a Provider). Each Provider description instructs Ext.Directhow to create
     * client-side stub methods.
     */
    addProvider : function(provider){
        var me = this,
            args = arguments,
            i = 0,
            len;

        if (args.length > 1) {
            for (len = args.length; i < len; ++i) {
                me.addProvider(args[i]);
            }
            return;
        }

        // if provider has not already been instantiated
        if (!provider.isProvider) {
            provider = Ext.create('direct.' + provider.type + 'provider', provider);
        }
        me.providers.add(provider);
        provider.on('data', me.onProviderData, me);


        if (!provider.isConnected()) {
            provider.connect();
        }

        return provider;
    },

    /**
     * Retrieves a {@link Ext.direct.Provider provider} by the **{@link Ext.direct.Provider#id id}** specified when the
     * provider is {@link #addProvider added}.
     * @param {String/Ext.direct.Provider} id The id of the provider, or the provider instance.
     */
    getProvider : function(id){
        return id.isProvider ? id : this.providers.get(id);
    },

    /**
     * Removes the provider.
     * @param {String/Ext.direct.Provider} provider The provider instance or the id of the provider.
     * @return {Ext.direct.Provider} The provider, null if not found.
     */
    removeProvider : function(provider){
        var me = this,
            providers = me.providers;

        provider = provider.isProvider ? provider : providers.get(provider);

        if (provider) {
            provider.un('data', me.onProviderData, me);
            providers.remove(provider);
            return provider;
        }
        return null;
    },

    /**
     * Adds a transaction to the manager.
     * @private
     * @param {Ext.direct.Transaction} transaction The transaction to add
     * @return {Ext.direct.Transaction} transaction
     */
    addTransaction: function(transaction){
        this.transactions.add(transaction);
        return transaction;
    },

    /**
     * Removes a transaction from the manager.
     * @private
     * @param {String/Ext.direct.Transaction} transaction The transaction/id of transaction to remove
     * @return {Ext.direct.Transaction} transaction
     */
    removeTransaction: function(transaction){
        transaction = this.getTransaction(transaction);
        this.transactions.remove(transaction);
        return transaction;
    },

    /**
     * Gets a transaction
     * @private
     * @param {String/Ext.direct.Transaction} transaction The transaction/id of transaction to get
     * @return {Ext.direct.Transaction}
     */
    getTransaction: function(transaction){
        return Ext.isObject(transaction) ? transaction : this.transactions.get(transaction);
    },

    onProviderData : function(provider, event){
        var me = this,
            i = 0,
            len;

        if (Ext.isArray(event)) {
            for (len = event.length; i < len; ++i) {
                me.onProviderData(provider, event[i]);
            }
            return;
        }
        if (event.name && event.name != 'event' && event.name != 'exception') {
            me.fireEvent(event.name, event);
        } else if (event.status === false) {
            me.fireEvent('exception', event);
        }
        me.fireEvent('event', event, provider);
    },
    
    /**
     * Parses a direct function. It may be passed in a string format, for example:
     * "MyApp.Person.read".
     * @protected
     * @param {String/Function} fn The direct function
     * @return {Function} The function to use in the direct call. Null if not found
     */
    parseMethod: function(fn){
        if (Ext.isString(fn)) {
            var parts = fn.split('.'),
                i = 0,
                len = parts.length,
                current = window;
                
            while (current && i < len) {
                current = current[parts[i]];
                ++i;
            }
            fn = Ext.isFunction(current) ? current : null;
        }
        return fn || null;
    }
    
}, function(){
    // Backwards compatibility
    Ext.Direct = Ext.direct.Manager;
});

/**
 * @class Ext.direct.Event
 * A base class for all Ext.direct events. An event is
 * created after some kind of interaction with the server.
 * The event class is essentially just a data structure
 * to hold a Direct response.
 */
Ext.define('Ext.direct.Event', {

    /* Begin Definitions */

    alias: 'direct.event',

    requires: ['Ext.direct.Manager'],

    /* End Definitions */

    status: true,

    /**
     * Creates new Event.
     * @param {Object} config (optional) Config object.
     */
    constructor: function(config) {
        Ext.apply(this, config);
    },

    /**
     * Return the raw data for this event.
     * @return {Object} The data from the event
     */
    getData: function(){
        return this.data;
    }
});

/**
 * @class Ext.direct.RemotingEvent
 * An event that is fired when data is received from a 
 * {@link Ext.direct.RemotingProvider}. Contains a method to the
 * related transaction for the direct request, see {@link #getTransaction}
 */
Ext.define('Ext.direct.RemotingEvent', {
    
    /* Begin Definitions */
   
    extend: 'Ext.direct.Event',
    
    alias: 'direct.rpc',
    
    /* End Definitions */
    
    /**
     * Get the transaction associated with this event.
     * @return {Ext.direct.Transaction} The transaction
     */
    getTransaction: function(){
        return this.transaction || Ext.direct.Manager.getTransaction(this.tid);
    }
});

/**
 * @class Ext.direct.ExceptionEvent
 * An event that is fired when an exception is received from a {@link Ext.direct.RemotingProvider}
 */
Ext.define('Ext.direct.ExceptionEvent', {
    
    /* Begin Definitions */
   
    extend: 'Ext.direct.RemotingEvent',
    
    alias: 'direct.exception',
    
    /* End Definitions */
   
   status: false
});

/**
 * @class Ext.direct.RemotingProvider
 * 
 * <p>The {@link Ext.direct.RemotingProvider RemotingProvider} exposes access to
 * server side methods on the client (a remote procedure call (RPC) type of
 * connection where the client can initiate a procedure on the server).</p>
 * 
 * <p>This allows for code to be organized in a fashion that is maintainable,
 * while providing a clear path between client and server, something that is
 * not always apparent when using URLs.</p>
 * 
 * <p>To accomplish this the server-side needs to describe what classes and methods
 * are available on the client-side. This configuration will typically be
 * outputted by the server-side Ext.Direct stack when the API description is built.</p>
 */
Ext.define('Ext.direct.RemotingProvider', {
    
    /* Begin Definitions */
   
    alias: 'direct.remotingprovider',
    
    extend: 'Ext.direct.JsonProvider', 
    
    requires: [
        'Ext.util.MixedCollection', 
        'Ext.util.DelayedTask', 
        'Ext.direct.Transaction',
        'Ext.direct.RemotingMethod'
    ],
   
    /* End Definitions */
   
   /**
     * @cfg {Object} actions
     * Object literal defining the server side actions and methods. For example, if
     * the Provider is configured with:
     * <pre><code>
"actions":{ // each property within the 'actions' object represents a server side Class 
    "TestAction":[ // array of methods within each server side Class to be   
    {              // stubbed out on client
        "name":"doEcho", 
        "len":1            
    },{
        "name":"multiply",// name of method
        "len":2           // The number of parameters that will be used to create an
                          // array of data to send to the server side function.
                          // Ensure the server sends back a Number, not a String. 
    },{
        "name":"doForm",
        "formHandler":true, // direct the client to use specialized form handling method 
        "len":1
    }]
}
     * </code></pre>
     * <p>Note that a Store is not required, a server method can be called at any time.
     * In the following example a <b>client side</b> handler is used to call the
     * server side method "multiply" in the server-side "TestAction" Class:</p>
     * <pre><code>
TestAction.multiply(
    2, 4, // pass two arguments to server, so specify len=2
    // callback function after the server is called
    // result: the result returned by the server
    //      e: Ext.direct.RemotingEvent object
    function(result, e){
        var t = e.getTransaction();
        var action = t.action; // server side Class called
        var method = t.method; // server side method called
        if(e.status){
            var answer = Ext.encode(result); // 8
    
        }else{
            var msg = e.message; // failure message
        }
    }
);
     * </code></pre>
     * In the example above, the server side "multiply" function will be passed two
     * arguments (2 and 4).  The "multiply" method should return the value 8 which will be
     * available as the <tt>result</tt> in the example above. 
     */
    
    /**
     * @cfg {String/Object} namespace
     * Namespace for the Remoting Provider (defaults to the browser global scope of <i>window</i>).
     * Explicitly specify the namespace Object, or specify a String to have a
     * {@link Ext#namespace namespace created} implicitly.
     */
    
    /**
     * @cfg {String} url
     * <b>Required</b>. The url to connect to the {@link Ext.direct.Manager} server-side router. 
     */
    
    /**
     * @cfg {String} enableUrlEncode
     * Specify which param will hold the arguments for the method.
     * Defaults to <tt>'data'</tt>.
     */
    
    /**
     * @cfg {Number/Boolean} enableBuffer
     * <p><tt>true</tt> or <tt>false</tt> to enable or disable combining of method
     * calls. If a number is specified this is the amount of time in milliseconds
     * to wait before sending a batched request.</p>
     * <br><p>Calls which are received within the specified timeframe will be
     * concatenated together and sent in a single request, optimizing the
     * application by reducing the amount of round trips that have to be made
     * to the server.</p>
     */
    enableBuffer: 10,
    
    /**
     * @cfg {Number} maxRetries
     * Number of times to re-attempt delivery on failure of a call.
     */
    maxRetries: 1,
    
    /**
     * @cfg {Number} timeout
     * The timeout to use for each request.
     */
    timeout: undefined,
    
    constructor : function(config){
        var me = this;
        me.callParent(arguments);
        me.addEvents(
            /**
             * @event beforecall
             * Fires immediately before the client-side sends off the RPC call.
             * By returning false from an event handler you can prevent the call from
             * executing.
             * @param {Ext.direct.RemotingProvider} provider
             * @param {Ext.direct.Transaction} transaction
             * @param {Object} meta The meta data
             */            
            'beforecall',            
            /**
             * @event call
             * Fires immediately after the request to the server-side is sent. This does
             * NOT fire after the response has come back from the call.
             * @param {Ext.direct.RemotingProvider} provider
             * @param {Ext.direct.Transaction} transaction
             * @param {Object} meta The meta data
             */            
            'call'
        );
        me.namespace = (Ext.isString(me.namespace)) ? Ext.ns(me.namespace) : me.namespace || window;
        me.transactions = new Ext.util.MixedCollection();
        me.callBuffer = [];
    },
    
    /**
     * Initialize the API
     * @private
     */
    initAPI : function(){
        var actions = this.actions,
            namespace = this.namespace,
            action,
            cls,
            methods,
            i,
            len,
            method;
            
        for (action in actions) {
            if (actions.hasOwnProperty(action)) {
                cls = namespace[action];
                if (!cls) {
                    cls = namespace[action] = {};
                }
                methods = actions[action];
                
                for (i = 0, len = methods.length; i < len; ++i) {
                    method = new Ext.direct.RemotingMethod(methods[i]);
                    cls[method.name] = this.createHandler(action, method);
                }
            }
        }
    },
    
    /**
     * Create a handler function for a direct call.
     * @private
     * @param {String} action The action the call is for
     * @param {Object} method The details of the method
     * @return {Function} A JS function that will kick off the call
     */
    createHandler : function(action, method){
        var me = this,
            handler;
        
        if (!method.formHandler) {
            handler = function(){
                me.configureRequest(action, method, Array.prototype.slice.call(arguments, 0));
            };
        } else {
            handler = function(form, callback, scope){
                me.configureFormRequest(action, method, form, callback, scope);
            };
        }
        handler.directCfg = {
            action: action,
            method: method
        };
        return handler;
    },
    
    // inherit docs
    isConnected: function(){
        return !!this.connected;
    },

    // inherit docs
    connect: function(){
        var me = this;
        
        if (me.url) {
            me.initAPI();
            me.connected = true;
            me.fireEvent('connect', me);
        } else if(!me.url) {
            Ext.Error.raise('Error initializing RemotingProvider, no url configured.');
        }
    },

    // inherit docs
    disconnect: function(){
        var me = this;
        
        if (me.connected) {
            me.connected = false;
            me.fireEvent('disconnect', me);
        }
    },
    
    /**
     * Run any callbacks related to the transaction.
     * @private
     * @param {Ext.direct.Transaction} transaction The transaction
     * @param {Ext.direct.Event} event The event
     */
    runCallback: function(transaction, event){
        var success = !!event.status,
            funcName = success ? 'success' : 'failure',
            callback,
            result;
        
        if (transaction && transaction.callback) {
            callback = transaction.callback;
            result = Ext.isDefined(event.result) ? event.result : event.data;
        
            if (Ext.isFunction(callback)) {
                callback(result, event, success);
            } else {
                Ext.callback(callback[funcName], callback.scope, [result, event, success]);
                Ext.callback(callback.callback, callback.scope, [result, event, success]);
            }
        }
    },
    
    /**
     * React to the ajax request being completed
     * @private
     */
    onData: function(options, success, response){
        var me = this,
            i = 0,
            len,
            events,
            event,
            transaction,
            transactions;
            
        if (success) {
            events = me.createEvents(response);
            for (len = events.length; i < len; ++i) {
                event = events[i];
                transaction = me.getTransaction(event);
                me.fireEvent('data', me, event);
                if (transaction) {
                    me.runCallback(transaction, event, true);
                    Ext.direct.Manager.removeTransaction(transaction);
                }
            }
        } else {
            transactions = [].concat(options.transaction);
            for (len = transactions.length; i < len; ++i) {
                transaction = me.getTransaction(transactions[i]);
                if (transaction && transaction.retryCount < me.maxRetries) {
                    transaction.retry();
                } else {
                    event = new Ext.direct.ExceptionEvent({
                        data: null,
                        transaction: transaction,
                        code: Ext.direct.Manager.exceptions.TRANSPORT,
                        message: 'Unable to connect to the server.',
                        xhr: response
                    });
                    me.fireEvent('data', me, event);
                    if (transaction) {
                        me.runCallback(transaction, event, false);
                        Ext.direct.Manager.removeTransaction(transaction);
                    }
                }
            }
        }
    },
    
    /**
     * Get transaction from XHR options
     * @private
     * @param {Object} options The options sent to the Ajax request
     * @return {Ext.direct.Transaction} The transaction, null if not found
     */
    getTransaction: function(options){
        return options && options.tid ? Ext.direct.Manager.getTransaction(options.tid) : null;
    },
    
    /**
     * Configure a direct request
     * @private
     * @param {String} action The action being executed
     * @param {Object} method The being executed
     */
    configureRequest: function(action, method, args){
        var me = this,
            callData = method.getCallData(args),
            data = callData.data, 
            callback = callData.callback, 
            scope = callData.scope,
            transaction;

        transaction = new Ext.direct.Transaction({
            provider: me,
            args: args,
            action: action,
            method: method.name,
            data: data,
            callback: scope && Ext.isFunction(callback) ? Ext.Function.bind(callback, scope) : callback
        });

        if (me.fireEvent('beforecall', me, transaction, method) !== false) {
            Ext.direct.Manager.addTransaction(transaction);
            me.queueTransaction(transaction);
            me.fireEvent('call', me, transaction, method);
        }
    },
    
    /**
     * Gets the Ajax call info for a transaction
     * @private
     * @param {Ext.direct.Transaction} transaction The transaction
     * @return {Object} The call params
     */
    getCallData: function(transaction){
        return {
            action: transaction.action,
            method: transaction.method,
            data: transaction.data,
            type: 'rpc',
            tid: transaction.id
        };
    },
    
    /**
     * Sends a request to the server
     * @private
     * @param {Object/Array} data The data to send
     */
    sendRequest : function(data){
        var me = this,
            request = {
                url: me.url,
                callback: me.onData,
                scope: me,
                transaction: data,
                timeout: me.timeout
            }, callData,
            enableUrlEncode = me.enableUrlEncode,
            i = 0,
            len,
            params;
            

        if (Ext.isArray(data)) {
            callData = [];
            for (len = data.length; i < len; ++i) {
                callData.push(me.getCallData(data[i]));
            }
        } else {
            callData = me.getCallData(data);
        }

        if (enableUrlEncode) {
            params = {};
            params[Ext.isString(enableUrlEncode) ? enableUrlEncode : 'data'] = Ext.encode(callData);
            request.params = params;
        } else {
            request.jsonData = callData;
        }
        Ext.Ajax.request(request);
    },
    
    /**
     * Add a new transaction to the queue
     * @private
     * @param {Ext.direct.Transaction} transaction The transaction
     */
    queueTransaction: function(transaction){
        var me = this,
            enableBuffer = me.enableBuffer;
        
        if (transaction.form) {
            me.sendFormRequest(transaction);
            return;
        }
        
        me.callBuffer.push(transaction);
        if (enableBuffer) {
            if (!me.callTask) {
                me.callTask = new Ext.util.DelayedTask(me.combineAndSend, me);
            }
            me.callTask.delay(Ext.isNumber(enableBuffer) ? enableBuffer : 10);
        } else {
            me.combineAndSend();
        }
    },
    
    /**
     * Combine any buffered requests and send them off
     * @private
     */
    combineAndSend : function(){
        var buffer = this.callBuffer,
            len = buffer.length;
            
        if (len > 0) {
            this.sendRequest(len == 1 ? buffer[0] : buffer);
            this.callBuffer = [];
        }
    },
    
    /**
     * Configure a form submission request
     * @private
     * @param {String} action The action being executed
     * @param {Object} method The method being executed
     * @param {HTMLElement} form The form being submitted
     * @param {Function} callback (optional) A callback to run after the form submits
     * @param {Object} scope (optional) A scope to execute the callback in
     */
    configureFormRequest : function(action, method, form, callback, scope){
        var me = this,
            transaction = new Ext.direct.Transaction({
                provider: me,
                action: action,
                method: method.name,
                args: [form, callback, scope],
                callback: scope && Ext.isFunction(callback) ? Ext.Function.bind(callback, scope) : callback,
                isForm: true
            }),
            isUpload,
            params;

        if (me.fireEvent('beforecall', me, transaction, method) !== false) {
            Ext.direct.Manager.addTransaction(transaction);
            isUpload = String(form.getAttribute("enctype")).toLowerCase() == 'multipart/form-data';
            
            params = {
                extTID: transaction.id,
                extAction: action,
                extMethod: method.name,
                extType: 'rpc',
                extUpload: String(isUpload)
            };
            
            // change made from typeof callback check to callback.params
            // to support addl param passing in DirectSubmit EAC 6/2
            Ext.apply(transaction, {
                form: Ext.getDom(form),
                isUpload: isUpload,
                params: callback && Ext.isObject(callback.params) ? Ext.apply(params, callback.params) : params
            });
            me.fireEvent('call', me, transaction, method);
            me.sendFormRequest(transaction);
        }
    },
    
    /**
     * Sends a form request
     * @private
     * @param {Ext.direct.Transaction} transaction The transaction to send
     */
    sendFormRequest: function(transaction){
        Ext.Ajax.request({
            url: this.url,
            params: transaction.params,
            callback: this.onData,
            scope: this,
            form: transaction.form,
            isUpload: transaction.isUpload,
            transaction: transaction
        });
    }
    
});