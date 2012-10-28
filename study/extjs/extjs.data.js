
/**
 * @author Ed Spencer
 * @class Ext.data.Batch
 *
 * <p>Provides a mechanism to run one or more {@link Ext.data.Operation operations} in a given order. Fires the 'operationcomplete' event
 * after the completion of each Operation, and the 'complete' event when all Operations have been successfully executed. Fires an 'exception'
 * event if any of the Operations encounter an exception.</p>
 *
 * <p>Usually these are only used internally by {@link Ext.data.proxy.Proxy} classes</p>
 *
 */
Ext.define('Ext.data.Batch', {
    mixins: {
        observable: 'Ext.util.Observable'
    },

    /**
     * @cfg {Boolean} autoStart
     * True to immediately start processing the batch as soon as it is constructed (defaults to false)
     */
    autoStart: false,
    
    /**
     * @cfg {Boolean} pauseOnException
     * True to pause the execution of the batch if any operation encounters an exception
     * (defaults to false). If you set this to true you are responsible for implementing the appropriate
     * handling logic and restarting or discarding the batch as needed. There are different ways you could 
     * do this, e.g. by handling the batch's {@link #exception} event directly, or perhaps by overriding
     * {@link Ext.data.AbstractStore#onBatchException onBatchException} at the store level. If you do pause
     * and attempt to handle the exception you can call {@link #retry} to process the same operation again. 
     * 
     * Note that {@link Ext.data.Operation operations} are atomic, so any operations that may have succeeded
     * prior to an exception (and up until pausing the batch) will be finalized at the server level and will
     * not be automatically reversible. Any transactional / rollback behavior that might be desired would have
     * to be implemented at the application level. Pausing on exception will likely be most beneficial when
     * used in coordination with such a scheme, where an exception might actually affect subsequent operations
     * in the same batch and so should be handled before continuing with the next operation.
     * 
     * If you have not implemented transactional operation handling then this option should typically be left 
     * to the default of false (e.g. process as many operations as possible, and handle any exceptions 
     * asynchronously without holding up the rest of the batch).
     */
    pauseOnException: false,

    /**
     * @property {Number} current
     * The index of the current operation being executed. Read only
     */
    current: -1,

    /**
     * @property {Number} total
     * The total number of operations in this batch. Read only
     */
    total: 0,

    /**
     * @property {Boolean} isRunning
     * True if the batch is currently running. Read only
     */
    isRunning: false,

    /**
     * @property {Boolean} isComplete
     * True if this batch has been executed completely. Read only
     */
    isComplete: false,

    /**
     * @property {Boolean} hasException
     * True if this batch has encountered an exception. This is cleared at the start of each operation. Read only
     */
    hasException: false,

    /**
     * Creates new Batch object.
     * @param {Object} [config] Config object
     */
    constructor: function(config) {
        var me = this;

        /**
         * @event complete
         * Fired when all operations of this batch have been completed
         * @param {Ext.data.Batch} batch The batch object
         * @param {Object} operation The last operation that was executed
         */

        /**
         * @event exception
         * Fired when a operation encountered an exception
         * @param {Ext.data.Batch} batch The batch object
         * @param {Object} operation The operation that encountered the exception
         */

        /**
         * @event operationcomplete
         * Fired when each operation of the batch completes
         * @param {Ext.data.Batch} batch The batch object
         * @param {Object} operation The operation that just completed
         */

        me.mixins.observable.constructor.call(me, config);

        /**
         * Ordered array of operations that will be executed by this batch
         * @property {Ext.data.Operation[]} operations
         */
        me.operations = [];
        
        /**
         * Ordered array of operations that raised an exception during the most recent
         * batch execution and did not successfully complete
         * @property {Ext.data.Operation[]} exceptions
         */
        me.exceptions = [];
    },

    /**
     * Adds a new operation to this batch at the end of the {@link #operations} array
     * @param {Object} operation The {@link Ext.data.Operation Operation} object
     * @return {Ext.data.Batch} this
     */
    add: function(operation) {
        this.total++;

        operation.setBatch(this);

        this.operations.push(operation);
        
        return this;
    },

    /**
     * Kicks off execution of the batch, continuing from the next operation if the previous
     * operation encountered an exception, or if execution was paused. Use this method to start
     * the batch for the first time or to restart a paused batch by skipping the current
     * unsuccessful operation.
     * 
     * To retry processing the current operation before continuing to the rest of the batch (e.g.
     * because you explicitly handled the operation's exception), call {@link #retry} instead.
     * 
     * Note that if the batch is already running any call to start will be ignored.
     * 
     * @return {Ext.data.Batch} this
     */
    start: function(/* private */ index) {
        var me = this;
        
        if (me.isRunning) {
            return me;
        }
        
        me.exceptions.length = 0;
        me.hasException = false;
        me.isRunning = true;

        return me.runOperation(Ext.isDefined(index) ? index : me.current + 1);
    },
    
    /**
     * Kicks off execution of the batch, continuing from the current operation. This is intended
     * for restarting a {@link #pause paused} batch after an exception, and the operation that raised
     * the exception will now be retried. The batch will then continue with its normal processing until
     * all operations are complete or another exception is encountered.
     * 
     * Note that if the batch is already running any call to retry will be ignored.
     * 
     * @return {Ext.data.Batch} this
     */
    retry: function() {
        return this.start(this.current);
    },

    /**
     * @private
     * Runs the next operation, relative to this.current.
     * @return {Ext.data.Batch} this
     */
    runNextOperation: function() {
        return this.runOperation(this.current + 1);
    },

    /**
     * Pauses execution of the batch, but does not cancel the current operation
     * @return {Ext.data.Batch} this
     */
    pause: function() {
        this.isRunning = false;
        return this;
    },

    /**
     * Executes an operation by its numeric index in the {@link #operations} array
     * @param {Number} index The operation index to run
     * @return {Ext.data.Batch} this
     */
    runOperation: function(index) {
        var me = this,
            operations = me.operations,
            operation = operations[index],
            onProxyReturn;

        if (operation === undefined) {
            me.isRunning = false;
            me.isComplete = true;
            me.fireEvent('complete', me, operations[operations.length - 1]);
        } else {
            me.current = index;

            onProxyReturn = function(operation) {
                var hasException = operation.hasException();

                if (hasException) {
                    me.hasException = true;
                    me.exceptions.push(operation);
                    me.fireEvent('exception', me, operation);
                }

                if (hasException && me.pauseOnException) {
                    me.pause();
                } else {
                    operation.setCompleted();
                    me.fireEvent('operationcomplete', me, operation);
                    me.runNextOperation();
                }
            };

            operation.setStarted();

            me.proxy[operation.action](operation, onProxyReturn, me);
        }
        
        return me;
    }
});

/**
 * The Connection class encapsulates a connection to the page's originating domain, allowing requests to be made either
 * to a configured URL, or to a URL specified at request time.
 *
 * Requests made by this class are asynchronous, and will return immediately. No data from the server will be available
 * to the statement immediately following the {@link #request} call. To process returned data, use a success callback
 * in the request options object, or an {@link #requestcomplete event listener}.
 *
 * # File Uploads
 *
 * File uploads are not performed using normal "Ajax" techniques, that is they are not performed using XMLHttpRequests.
 * Instead the form is submitted in the standard manner with the DOM &lt;form&gt; element temporarily modified to have its
 * target set to refer to a dynamically generated, hidden &lt;iframe&gt; which is inserted into the document but removed
 * after the return data has been gathered.
 *
 * The server response is parsed by the browser to create the document for the IFRAME. If the server is using JSON to
 * send the return object, then the Content-Type header must be set to "text/html" in order to tell the browser to
 * insert the text unchanged into the document body.
 *
 * Characters which are significant to an HTML parser must be sent as HTML entities, so encode `<` as `&lt;`, `&` as
 * `&amp;` etc.
 *
 * The response text is retrieved from the document, and a fake XMLHttpRequest object is created containing a
 * responseText property in order to conform to the requirements of event handlers and callbacks.
 *
 * Be aware that file upload packets are sent with the content type multipart/form and some server technologies
 * (notably JEE) may require some custom processing in order to retrieve parameter names and parameter values from the
 * packet content.
 *
 * Also note that it's not possible to check the response code of the hidden iframe, so the success handler will ALWAYS fire.
 */
Ext.define('Ext.data.Connection', {
    mixins: {
        observable: 'Ext.util.Observable'
    },

    statics: {
        requestId: 0
    },

    url: null,
    async: true,
    method: null,
    username: '',
    password: '',

    /**
     * @cfg {Boolean} disableCaching
     * True to add a unique cache-buster param to GET requests.
     */
    disableCaching: true,

    /**
     * @cfg {Boolean} withCredentials
     * True to set `withCredentials = true` on the XHR object
     */
    withCredentials: false,

    /**
     * @cfg {Boolean} cors
     * True to enable CORS support on the XHR object. Currently the only effect of this option
     * is to use the XDomainRequest object instead of XMLHttpRequest if the browser is IE8 or above.
     */
    cors: false,

    /**
     * @cfg {String} disableCachingParam
     * Change the parameter which is sent went disabling caching through a cache buster.
     */
    disableCachingParam: '_dc',

    /**
     * @cfg {Number} timeout
     * The timeout in milliseconds to be used for requests.
     */
    timeout : 30000,

    /**
     * @cfg {Object} extraParams
     * Any parameters to be appended to the request.
     */

    /**
     * @cfg {Boolean} [autoAbort=false]
     * Whether this request should abort any pending requests.
     */

    /**
     * @cfg {String} method
     * The default HTTP method to be used for requests.
     *
     * If not set, but {@link #request} params are present, POST will be used;
     * otherwise, GET will be used.
     */

    /**
     * @cfg {Object} defaultHeaders
     * An object containing request headers which are added to each request made by this object.
     */

    useDefaultHeader : true,
    defaultPostHeader : 'application/x-www-form-urlencoded; charset=UTF-8',
    useDefaultXhrHeader : true,
    defaultXhrHeader : 'XMLHttpRequest',

    constructor : function(config) {
        config = config || {};
        Ext.apply(this, config);

        /**
         * @event beforerequest
         * Fires before a network request is made to retrieve a data object.
         * @param {Ext.data.Connection} conn This Connection object.
         * @param {Object} options The options config object passed to the {@link #request} method.
         */
        /**
         * @event requestcomplete
         * Fires if the request was successfully completed.
         * @param {Ext.data.Connection} conn This Connection object.
         * @param {Object} response The XHR object containing the response data.
         * See [The XMLHttpRequest Object](http://www.w3.org/TR/XMLHttpRequest/) for details.
         * @param {Object} options The options config object passed to the {@link #request} method.
         */
        /**
         * @event requestexception
         * Fires if an error HTTP status was returned from the server.
         * See [HTTP Status Code Definitions](http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html)
         * for details of HTTP status codes.
         * @param {Ext.data.Connection} conn This Connection object.
         * @param {Object} response The XHR object containing the response data.
         * See [The XMLHttpRequest Object](http://www.w3.org/TR/XMLHttpRequest/) for details.
         * @param {Object} options The options config object passed to the {@link #request} method.
         */
        this.requests = {};
        this.mixins.observable.constructor.call(this);
    },

    /**
     * Sends an HTTP request to a remote server.
     *
     * **Important:** Ajax server requests are asynchronous, and this call will
     * return before the response has been received. Process any returned data
     * in a callback function.
     *
     *     Ext.Ajax.request({
     *         url: 'ajax_demo/sample.json',
     *         success: function(response, opts) {
     *             var obj = Ext.decode(response.responseText);
     *             console.dir(obj);
     *         },
     *         failure: function(response, opts) {
     *             console.log('server-side failure with status code ' + response.status);
     *         }
     *     });
     *
     * To execute a callback function in the correct scope, use the `scope` option.
     *
     * @param {Object} options An object which may contain the following properties:
     *
     * (The options object may also contain any other property which might be needed to perform
     * postprocessing in a callback because it is passed to callback functions.)
     *
     * @param {String/Function} options.url The URL to which to send the request, or a function
     * to call which returns a URL string. The scope of the function is specified by the `scope` option.
     * Defaults to the configured `url`.
     *
     * @param {Object/String/Function} options.params An object containing properties which are
     * used as parameters to the request, a url encoded string or a function to call to get either. The scope
     * of the function is specified by the `scope` option.
     *
     * @param {String} options.method The HTTP method to use
     * for the request. Defaults to the configured method, or if no method was configured,
     * "GET" if no parameters are being sent, and "POST" if parameters are being sent.  Note that
     * the method name is case-sensitive and should be all caps.
     *
     * @param {Function} options.callback The function to be called upon receipt of the HTTP response.
     * The callback is called regardless of success or failure and is passed the following parameters:
     * @param {Object} options.callback.options The parameter to the request call.
     * @param {Boolean} options.callback.success True if the request succeeded.
     * @param {Object} options.callback.response The XMLHttpRequest object containing the response data.
     * See [www.w3.org/TR/XMLHttpRequest/](http://www.w3.org/TR/XMLHttpRequest/) for details about
     * accessing elements of the response.
     *
     * @param {Function} options.success The function to be called upon success of the request.
     * The callback is passed the following parameters:
     * @param {Object} options.success.response The XMLHttpRequest object containing the response data.
     * @param {Object} options.success.options The parameter to the request call.
     *
     * @param {Function} options.failure The function to be called upon failure of the request.
     * The callback is passed the following parameters:
     * @param {Object} options.failure.response The XMLHttpRequest object containing the response data.
     * @param {Object} options.failure.options The parameter to the request call.
     *
     * @param {Object} options.scope The scope in which to execute the callbacks: The "this" object for
     * the callback function. If the `url`, or `params` options were specified as functions from which to
     * draw values, then this also serves as the scope for those function calls. Defaults to the browser
     * window.
     *
     * @param {Number} options.timeout The timeout in milliseconds to be used for this request.
     * Defaults to 30 seconds.
     *
     * @param {Ext.Element/HTMLElement/String} options.form The `<form>` Element or the id of the `<form>`
     * to pull parameters from.
     *
     * @param {Boolean} options.isUpload **Only meaningful when used with the `form` option.**
     *
     * True if the form object is a file upload (will be set automatically if the form was configured
     * with **`enctype`** `"multipart/form-data"`).
     *
     * File uploads are not performed using normal "Ajax" techniques, that is they are **not**
     * performed using XMLHttpRequests. Instead the form is submitted in the standard manner with the
     * DOM `<form>` element temporarily modified to have its [target][] set to refer to a dynamically
     * generated, hidden `<iframe>` which is inserted into the document but removed after the return data
     * has been gathered.
     *
     * The server response is parsed by the browser to create the document for the IFRAME. If the
     * server is using JSON to send the return object, then the [Content-Type][] header must be set to
     * "text/html" in order to tell the browser to insert the text unchanged into the document body.
     *
     * The response text is retrieved from the document, and a fake XMLHttpRequest object is created
     * containing a `responseText` property in order to conform to the requirements of event handlers
     * and callbacks.
     *
     * Be aware that file upload packets are sent with the content type [multipart/form][] and some server
     * technologies (notably JEE) may require some custom processing in order to retrieve parameter names
     * and parameter values from the packet content.
     *
     * [target]: http://www.w3.org/TR/REC-html40/present/frames.html#adef-target
     * [Content-Type]: http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.17
     * [multipart/form]: http://www.faqs.org/rfcs/rfc2388.html
     *
     * @param {Object} options.headers Request headers to set for the request.
     *
     * @param {Object} options.xmlData XML document to use for the post. Note: This will be used instead
     * of params for the post data. Any params will be appended to the URL.
     *
     * @param {Object/String} options.jsonData JSON data to use as the post. Note: This will be used
     * instead of params for the post data. Any params will be appended to the URL.
     *
     * @param {Boolean} options.disableCaching True to add a unique cache-buster param to GET requests.
     *
     * @param {Boolean} options.withCredentials True to add the withCredentials property to the XHR object
     *
     * @return {Object} The request object. This may be used to cancel the request.
     */
    request : function(options) {
        options = options || {};
        var me = this,
            scope = options.scope || window,
            username = options.username || me.username,
            password = options.password || me.password || '',
            async,
            requestOptions,
            request,
            headers,
            xhr;

        if (me.fireEvent('beforerequest', me, options) !== false) {

            requestOptions = me.setOptions(options, scope);

            if (me.isFormUpload(options)) {
                me.upload(options.form, requestOptions.url, requestOptions.data, options);
                return null;
            }

            // if autoabort is set, cancel the current transactions
            if (options.autoAbort || me.autoAbort) {
                me.abort();
            }

            // create a connection object
            async = options.async !== false ? (options.async || me.async) : false;
            xhr = me.openRequest(options, requestOptions, async, username, password);

            headers = me.setupHeaders(xhr, options, requestOptions.data, requestOptions.params);

            // create the transaction object
            request = {
                id: ++Ext.data.Connection.requestId,
                xhr: xhr,
                headers: headers,
                options: options,
                async: async,
                timeout: setTimeout(function() {
                    request.timedout = true;
                    me.abort(request);
                }, options.timeout || me.timeout)
            };
            me.requests[request.id] = request;
            me.latestId = request.id;
            // bind our statechange listener
            if (async) {
                xhr.onreadystatechange = Ext.Function.bind(me.onStateChange, me, [request]);
            }

            // start the request!
            xhr.send(requestOptions.data);
            if (!async) {
                return me.onComplete(request);
            }
            return request;
        } else {
            Ext.callback(options.callback, options.scope, [options, undefined, undefined]);
            return null;
        }
    },

    /**
     * Uploads a form using a hidden iframe.
     * @param {String/HTMLElement/Ext.Element} form The form to upload
     * @param {String} url The url to post to
     * @param {String} params Any extra parameters to pass
     * @param {Object} options The initial options
     */
    upload: function(form, url, params, options) {
        form = Ext.getDom(form);
        options = options || {};

        var id = Ext.id(),
            frame = document.createElement('iframe'),
            hiddens = [],
            encoding = 'multipart/form-data',
            buf = {
                target: form.target,
                method: form.method,
                encoding: form.encoding,
                enctype: form.enctype,
                action: form.action
            },
            addField = function(name, value) {
                hiddenItem = document.createElement('input');
                Ext.fly(hiddenItem).set({
                    type: 'hidden',
                    value: value,
                    name: name
                });
                form.appendChild(hiddenItem);
                hiddens.push(hiddenItem);
            },
            hiddenItem, obj, value, name, vLen, v, hLen, h;

        /*
         * Originally this behaviour was modified for Opera 10 to apply the secure URL after
         * the frame had been added to the document. It seems this has since been corrected in
         * Opera so the behaviour has been reverted, the URL will be set before being added.
         */
        Ext.fly(frame).set({
            id: id,
            name: id,
            cls: Ext.baseCSSPrefix + 'hide-display',
            src: Ext.SSL_SECURE_URL
        });

        document.body.appendChild(frame);

        // This is required so that IE doesn't pop the response up in a new window.
        if (document.frames) {
            document.frames[id].name = id;
        }

        Ext.fly(form).set({
            target: id,
            method: 'POST',
            enctype: encoding,
            encoding: encoding,
            action: url || buf.action
        });

        // add dynamic params
        if (params) {
            obj = Ext.Object.fromQueryString(params) || {};

            for (name in obj) {
                if (obj.hasOwnProperty(name)) {
                    value = obj[name];  
                    if (Ext.isArray(value)) {
                        vLen = value.length;
                        for (v = 0; v < vLen; v++) {
                            addField(name, value[v]);
                        }
                    } else {
                        addField(name, value);
                    }
                }
            }
        }

        Ext.fly(frame).on('load', Ext.Function.bind(this.onUploadComplete, this, [frame, options]), null, {single: true});
        form.submit();

        Ext.fly(form).set(buf);

        hLen = hiddens.length;

        for (h = 0; h < hLen; h++) {
            Ext.removeNode(hiddens[h]);
        }
    },

    /**
     * @private
     * Callback handler for the upload function. After we've submitted the form via the iframe this creates a bogus
     * response object to simulate an XHR and populates its responseText from the now-loaded iframe's document body
     * (or a textarea inside the body). We then clean up by removing the iframe
     */
    onUploadComplete: function(frame, options) {
        var me = this,
            // bogus response object
            response = {
                responseText: '',
                responseXML: null
            }, doc, contentNode;

        try {
            doc = frame.contentWindow.document || frame.contentDocument || window.frames[frame.id].document;
            if (doc) {
                if (doc.body) {

                    // Response sent as Content-Type: text/json or text/plain. Browser will embed in a <pre> element
                    // Note: The statement below tests the result of an assignment.
                    if ((contentNode = doc.body.firstChild) && /pre/i.test(contentNode.tagName)) {
                        response.responseText = contentNode.innerText;
                    }

                    // Response sent as Content-Type: text/html. We must still support JSON response wrapped in textarea.
                    // Note: The statement below tests the result of an assignment.
                    else if (contentNode = doc.getElementsByTagName('textarea')[0]) {
                        response.responseText = contentNode.value;
                    }
                    // Response sent as Content-Type: text/html with no wrapping. Scrape JSON response out of text
                    else {
                        response.responseText = doc.body.textContent || doc.body.innerText;
                    }
                }
                //in IE the document may still have a body even if returns XML.
                response.responseXML = doc.XMLDocument || doc;
            }
        } catch (e) {
        }

        me.fireEvent('requestcomplete', me, response, options);

        Ext.callback(options.success, options.scope, [response, options]);
        Ext.callback(options.callback, options.scope, [options, true, response]);

        setTimeout(function() {
            Ext.removeNode(frame);
        }, 100);
    },

    /**
     * Detects whether the form is intended to be used for an upload.
     * @private
     */
    isFormUpload: function(options) {
        var form = this.getForm(options);
        if (form) {
            return (options.isUpload || (/multipart\/form-data/i).test(form.getAttribute('enctype')));
        }
        return false;
    },

    /**
     * Gets the form object from options.
     * @private
     * @param {Object} options The request options
     * @return {HTMLElement} The form, null if not passed
     */
    getForm: function(options) {
        return Ext.getDom(options.form) || null;
    },

    /**
     * Sets various options such as the url, params for the request
     * @param {Object} options The initial options
     * @param {Object} scope The scope to execute in
     * @return {Object} The params for the request
     */
    setOptions: function(options, scope) {
        var me = this,
            params = options.params || {},
            extraParams = me.extraParams,
            urlParams = options.urlParams,
            url = options.url || me.url,
            jsonData = options.jsonData,
            method,
            disableCache,
            data;


        // allow params to be a method that returns the params object
        if (Ext.isFunction(params)) {
            params = params.call(scope, options);
        }

        // allow url to be a method that returns the actual url
        if (Ext.isFunction(url)) {
            url = url.call(scope, options);
        }

        url = this.setupUrl(options, url);

        if (!url) {
            Ext.Error.raise({
                options: options,
                msg: 'No URL specified'
            });
        }

        // check for xml or json data, and make sure json data is encoded
        data = options.rawData || options.xmlData || jsonData || null;
        if (jsonData && !Ext.isPrimitive(jsonData)) {
            data = Ext.encode(data);
        }

        // make sure params are a url encoded string and include any extraParams if specified
        if (Ext.isObject(params)) {
            params = Ext.Object.toQueryString(params);
        }

        if (Ext.isObject(extraParams)) {
            extraParams = Ext.Object.toQueryString(extraParams);
        }

        params = params + ((extraParams) ? ((params) ? '&' : '') + extraParams : '');

        urlParams = Ext.isObject(urlParams) ? Ext.Object.toQueryString(urlParams) : urlParams;

        params = this.setupParams(options, params);

        // decide the proper method for this request
        method = (options.method || me.method || ((params || data) ? 'POST' : 'GET')).toUpperCase();
        this.setupMethod(options, method);


        disableCache = options.disableCaching !== false ? (options.disableCaching || me.disableCaching) : false;
        // if the method is get append date to prevent caching
        if (method === 'GET' && disableCache) {
            url = Ext.urlAppend(url, (options.disableCachingParam || me.disableCachingParam) + '=' + (new Date().getTime()));
        }

        // if the method is get or there is json/xml data append the params to the url
        if ((method == 'GET' || data) && params) {
            url = Ext.urlAppend(url, params);
            params = null;
        }

        // allow params to be forced into the url
        if (urlParams) {
            url = Ext.urlAppend(url, urlParams);
        }

        return {
            url: url,
            method: method,
            data: data || params || null
        };
    },

    /**
     * Template method for overriding url
     * @template
     * @private
     * @param {Object} options
     * @param {String} url
     * @return {String} The modified url
     */
    setupUrl: function(options, url) {
        var form = this.getForm(options);
        if (form) {
            url = url || form.action;
        }
        return url;
    },


    /**
     * Template method for overriding params
     * @template
     * @private
     * @param {Object} options
     * @param {String} params
     * @return {String} The modified params
     */
    setupParams: function(options, params) {
        var form = this.getForm(options),
            serializedForm;
        if (form && !this.isFormUpload(options)) {
            serializedForm = Ext.Element.serializeForm(form);
            params = params ? (params + '&' + serializedForm) : serializedForm;
        }
        return params;
    },

    /**
     * Template method for overriding method
     * @template
     * @private
     * @param {Object} options
     * @param {String} method
     * @return {String} The modified method
     */
    setupMethod: function(options, method) {
        if (this.isFormUpload(options)) {
            return 'POST';
        }
        return method;
    },

    /**
     * Setup all the headers for the request
     * @private
     * @param {Object} xhr The xhr object
     * @param {Object} options The options for the request
     * @param {Object} data The data for the request
     * @param {Object} params The params for the request
     */
    setupHeaders: function(xhr, options, data, params) {
        var me = this,
            headers = Ext.apply({}, options.headers || {}, me.defaultHeaders || {}),
            contentType = me.defaultPostHeader,
            jsonData = options.jsonData,
            xmlData = options.xmlData,
            key,
            header;

        if (!headers['Content-Type'] && (data || params)) {
            if (data) {
                if (options.rawData) {
                    contentType = 'text/plain';
                } else {
                    if (xmlData && Ext.isDefined(xmlData)) {
                        contentType = 'text/xml';
                    } else if (jsonData && Ext.isDefined(jsonData)) {
                        contentType = 'application/json';
                    }
                }
            }
            headers['Content-Type'] = contentType;
        }

        if (me.useDefaultXhrHeader && !headers['X-Requested-With']) {
            headers['X-Requested-With'] = me.defaultXhrHeader;
        }
        // set up all the request headers on the xhr object
        try {
            for (key in headers) {
                if (headers.hasOwnProperty(key)) {
                    header = headers[key];
                    xhr.setRequestHeader(key, header);
                }

            }
        } catch(e) {
            me.fireEvent('exception', key, header);
        }
        return headers;
    },

    /**
     * Creates the appropriate XHR transport for a given request on this browser. On IE
     * this may be an `XDomainRequest` rather than an `XMLHttpRequest`.
     * @private
     */
    newRequest: function (options) {
        var xhr;

        if ((options.cors || this.cors) && Ext.isIE && Ext.ieVersion >= 8) {
            xhr = new XDomainRequest();
        } else {
            xhr = this.getXhrInstance();
        }

        return xhr;
    },

    /**
     * Creates and opens an appropriate XHR transport for a given request on this browser.
     * This logic is contained in an individual method to allow for overrides to process all
     * of the parameters and options and return a suitable, open connection.
     * @private
     */
    openRequest: function (options, requestOptions, async, username, password) {
        var xhr = this.newRequest(options);

        if (username) {
            xhr.open(requestOptions.method, requestOptions.url, async, username, password);
        } else {
            xhr.open(requestOptions.method, requestOptions.url, async);
        }

        if (options.withCredentials || this.withCredentials) {
            xhr.withCredentials = true;
        }

        return xhr;
    },

    /**
     * Creates the appropriate XHR transport for this browser.
     * @private
     */
    getXhrInstance: (function() {
        var options = [function() {
            return new XMLHttpRequest();
        }, function() {
            return new ActiveXObject('MSXML2.XMLHTTP.3.0');
        }, function() {
            return new ActiveXObject('MSXML2.XMLHTTP');
        }, function() {
            return new ActiveXObject('Microsoft.XMLHTTP');
        }], i = 0,
            len = options.length,
            xhr;

        for (; i < len; ++i) {
            try {
                xhr = options[i];
                xhr();
                break;
            } catch(e) {
            }
        }
        return xhr;
    }()),

    /**
     * Determines whether this object has a request outstanding.
     * @param {Object} [request] Defaults to the last transaction
     * @return {Boolean} True if there is an outstanding request.
     */
    isLoading : function(request) {
        if (!request) {
            request = this.getLatest();
        }
        if (!(request && request.xhr)) {
            return false;
        }
        // if there is a connection and readyState is not 0 or 4
        var state = request.xhr.readyState;
        return !(state === 0 || state == 4);
    },

    /**
     * Aborts an active request.
     * @param {Object} [request] Defaults to the last request
     */
    abort : function(request) {
        var me = this,
            xhr;
        
        if (!request) {
            request = me.getLatest();
        }

        if (request && me.isLoading(request)) {
            /*
             * Clear out the onreadystatechange here, this allows us
             * greater control, the browser may/may not fire the function
             * depending on a series of conditions.
             */
            xhr = request.xhr;
            try {
                xhr.onreadystatechange = null;
            } catch (e) {
                // Setting onreadystatechange to null can cause problems in IE, see
                // http://www.quirksmode.org/blog/archives/2005/09/xmlhttp_notes_a_1.html
                xhr = Ext.emptyFn;
            }
            xhr.abort();
            me.clearTimeout(request);
            if (!request.timedout) {
                request.aborted = true;
            }
            me.onComplete(request);
            me.cleanup(request);
        }
    },
    
    /**
     * Aborts all active requests
     */
    abortAll: function(){
        var requests = this.requests,
            id;
        
        for (id in requests) {
            if (requests.hasOwnProperty(id)) {
                this.abort(requests[id]);
            }
        }
    },
    
    /**
     * Gets the most recent request
     * @private
     * @return {Object} The request. Null if there is no recent request
     */
    getLatest: function(){
        var id = this.latestId,
            request;
            
        if (id) {
            request = this.requests[id];
        }
        return request || null;
    },

    /**
     * Fires when the state of the xhr changes
     * @private
     * @param {Object} request The request
     */
    onStateChange : function(request) {
        if (request.xhr.readyState == 4) {
            this.clearTimeout(request);
            this.onComplete(request);
            this.cleanup(request);
        }
    },

    /**
     * Clears the timeout on the request
     * @private
     * @param {Object} The request
     */
    clearTimeout: function(request) {
        clearTimeout(request.timeout);
        delete request.timeout;
    },

    /**
     * Cleans up any left over information from the request
     * @private
     * @param {Object} The request
     */
    cleanup: function(request) {
        request.xhr = null;
        delete request.xhr;
    },

    /**
     * To be called when the request has come back from the server
     * @private
     * @param {Object} request
     * @return {Object} The response
     */
    onComplete : function(request) {
        var me = this,
            options = request.options,
            result,
            success,
            response;

        try {
            result = me.parseStatus(request.xhr.status);
        } catch (e) {
            // in some browsers we can't access the status if the readyState is not 4, so the request has failed
            result = {
                success : false,
                isException : false
            };
        }
        success = result.success;

        if (success) {
            response = me.createResponse(request);
            me.fireEvent('requestcomplete', me, response, options);
            Ext.callback(options.success, options.scope, [response, options]);
        } else {
            if (result.isException || request.aborted || request.timedout) {
                response = me.createException(request);
            } else {
                response = me.createResponse(request);
            }
            me.fireEvent('requestexception', me, response, options);
            Ext.callback(options.failure, options.scope, [response, options]);
        }
        Ext.callback(options.callback, options.scope, [options, success, response]);
        delete me.requests[request.id];
        return response;
    },

    /**
     * Checks if the response status was successful
     * @param {Number} status The status code
     * @return {Object} An object containing success/status state
     */
    parseStatus: function(status) {
        // see: https://prototype.lighthouseapp.com/projects/8886/tickets/129-ie-mangles-http-response-status-code-204-to-1223
        status = status == 1223 ? 204 : status;

        var success = (status >= 200 && status < 300) || status == 304,
            isException = false;

        if (!success) {
            switch (status) {
                case 12002:
                case 12029:
                case 12030:
                case 12031:
                case 12152:
                case 13030:
                    isException = true;
                    break;
            }
        }
        return {
            success: success,
            isException: isException
        };
    },

    /**
     * Creates the response object
     * @private
     * @param {Object} request
     */
    createResponse : function(request) {
        var xhr = request.xhr,
            headers = {},
            lines = xhr.getAllResponseHeaders().replace(/\r\n/g, '\n').split('\n'),
            count = lines.length,
            line, index, key, value, response;

        while (count--) {
            line = lines[count];
            index = line.indexOf(':');
            if (index >= 0) {
                key = line.substr(0, index).toLowerCase();
                if (line.charAt(index + 1) == ' ') {
                    ++index;
                }
                headers[key] = line.substr(index + 1);
            }
        }

        request.xhr = null;
        delete request.xhr;

        response = {
            request: request,
            requestId : request.id,
            status : xhr.status,
            statusText : xhr.statusText,
            getResponseHeader : function(header) {
                return headers[header.toLowerCase()];
            },
            getAllResponseHeaders : function() {
                return headers;
            },
            responseText : xhr.responseText,
            responseXML : xhr.responseXML
        };

        // If we don't explicitly tear down the xhr reference, IE6/IE7 will hold this in the closure of the
        // functions created with getResponseHeader/getAllResponseHeaders
        xhr = null;
        return response;
    },

    /**
     * Creates the exception object
     * @private
     * @param {Object} request
     */
    createException : function(request) {
        return {
            request : request,
            requestId : request.id,
            status : request.aborted ? -1 : 0,
            statusText : request.aborted ? 'transaction aborted' : 'communication failure',
            aborted: request.aborted,
            timedout: request.timedout
        };
    }
});






/**
 * @author Ed Spencer
 *
 * Fields are used to define what a Model is. They aren't instantiated directly - instead, when we create a class that
 * extends {@link Ext.data.Model}, it will automatically create a Field instance for each field configured in a {@link
 * Ext.data.Model Model}. For example, we might set up a model like this:
 *
 *     Ext.define('User', {
 *         extend: 'Ext.data.Model',
 *         fields: [
 *             'name', 'email',
 *             {name: 'age', type: 'int'},
 *             {name: 'gender', type: 'string', defaultValue: 'Unknown'}
 *         ]
 *     });
 *
 * Four fields will have been created for the User Model - name, email, age and gender. Note that we specified a couple
 * of different formats here; if we only pass in the string name of the field (as with name and email), the field is set
 * up with the 'auto' type. It's as if we'd done this instead:
 *
 *     Ext.define('User', {
 *         extend: 'Ext.data.Model',
 *         fields: [
 *             {name: 'name', type: 'auto'},
 *             {name: 'email', type: 'auto'},
 *             {name: 'age', type: 'int'},
 *             {name: 'gender', type: 'string', defaultValue: 'Unknown'}
 *         ]
 *     });
 *
 * # Types and conversion
 *
 * The {@link #type} is important - it's used to automatically convert data passed to the field into the correct format.
 * In our example above, the name and email fields used the 'auto' type and will just accept anything that is passed
 * into them. The 'age' field had an 'int' type however, so if we passed 25.4 this would be rounded to 25.
 *
 * Sometimes a simple type isn't enough, or we want to perform some processing when we load a Field's data. We can do
 * this using a {@link #convert} function. Here, we're going to create a new field based on another:
 *
 *     Ext.define('User', {
 *         extend: 'Ext.data.Model',
 *         fields: [
 *             {
 *                 name: 'firstName',
 *                 convert: function(value, record) {
 *                     var fullName  = record.get('name'),
 *                         splits    = fullName.split(" "),
 *                         firstName = splits[0];
 *
 *                     return firstName;
 *                 }
 *             },
 *             'name', 'email',
 *             {name: 'age', type: 'int'},
 *             {name: 'gender', type: 'string', defaultValue: 'Unknown'}
 *         ]
 *     });
 *
 * Now when we create a new User, the firstName is populated automatically based on the name:
 *
 *     var ed = Ext.create('User', {name: 'Ed Spencer'});
 *
 *     console.log(ed.get('firstName')); //logs 'Ed', based on our convert function
 *     
 * Fields which are configured with a custom ```convert``` function are read *after* all other fields
 * when constructing and reading records, so that if convert functions rely on other, non-converted fields
 * (as in this example), they can be sure of those fields being present.
 *
 * In fact, if we log out all of the data inside ed, we'll see this:
 *
 *     console.log(ed.data);
 *
 *     //outputs this:
 *     {
 *         age: 0,
 *         email: "",
 *         firstName: "Ed",
 *         gender: "Unknown",
 *         name: "Ed Spencer"
 *     }
 *
 * The age field has been given a default of zero because we made it an int type. As an auto field, email has defaulted
 * to an empty string. When we registered the User model we set gender's {@link #defaultValue} to 'Unknown' so we see
 * that now. Let's correct that and satisfy ourselves that the types work as we expect:
 *
 *     ed.set('gender', 'Male');
 *     ed.get('gender'); //returns 'Male'
 *
 *     ed.set('age', 25.4);
 *     ed.get('age'); //returns 25 - we wanted an int, not a float, so no decimal places allowed
 */
Ext.define('Ext.data.Field', {
    requires: ['Ext.data.Types', 'Ext.data.SortTypes'],
    alias: 'data.field',

    isField: true,
    
    constructor : function(config) {
        var me = this,
            types = Ext.data.Types,
            st;
        
        if (Ext.isString(config)) {
            config = {name: config};
        }
        Ext.apply(me, config);

        st = me.sortType;

        if (me.type) {
            if (Ext.isString(me.type)) {
                me.type = types[me.type.toUpperCase()] || types.AUTO;
            }
        } else {
            me.type = types.AUTO;
        }

        // named sortTypes are supported, here we look them up
        if (Ext.isString(st)) {
            me.sortType = Ext.data.SortTypes[st];
        } else if(Ext.isEmpty(st)) {
            me.sortType = me.type.sortType;
        }

        // Reference this type's default converter if we did not recieve one in configuration.
        if (!config.hasOwnProperty('convert')) {
            me.convert = me.type.convert; // this may be undefined (e.g., AUTO)
        } else if (!me.convert && me.type.convert && !config.hasOwnProperty('defaultValue')) {
            // If the converter has been nulled out, and we have not been configured
            // with a field-specific defaultValue, then coerce the inherited defaultValue into our data type.
            me.defaultValue = me.type.convert(me.defaultValue);
        }

        if (config.convert) {
            me.hasCustomConvert = true;
        }
    },
    
    /**
     * @cfg {String} name
     *
     * The name by which the field is referenced within the Model. This is referenced by, for example, the `dataIndex`
     * property in column definition objects passed to {@link Ext.grid.property.HeaderContainer}.
     *
     * Note: In the simplest case, if no properties other than `name` are required, a field definition may consist of
     * just a String for the field name.
     */
    
    /**
     * @cfg {String/Object} type
     *
     * The data type for automatic conversion from received data to the *stored* value if
     * `{@link Ext.data.Field#convert convert}` has not been specified. This may be specified as a string value.
     * Possible values are
     *
     * - auto (Default, implies no conversion)
     * - string
     * - int
     * - float
     * - boolean
     * - date
     *
     * This may also be specified by referencing a member of the {@link Ext.data.Types} class.
     *
     * Developers may create their own application-specific data types by defining new members of the {@link
     * Ext.data.Types} class.
     */

    /**
     * @cfg {Function} [convert]
     *
     * A function which converts the value provided by the Reader into an object that will be stored in the Model.
     * 
     * If configured as `null`, then no conversion will be applied to the raw data property when this Field
     * is read. This will increase performance. but you must ensure that the data is of the correct type and does
     * not *need* converting.
     * 
     * It is passed the following parameters:
     *
     * - **v** : Mixed
     *
     *   The data value as read by the Reader, if undefined will use the configured `{@link Ext.data.Field#defaultValue
     *   defaultValue}`.
     *
     * - **rec** : Ext.data.Model
     *
     *   The data object containing the Model as read so far by the Reader. Note that the Model may not be fully populated
     *   at this point as the fields are read in the order that they are defined in your
     *   {@link Ext.data.Model#cfg-fields fields} array.
     *
     * Example of convert functions:
     *
     *     function fullName(v, record){
     *         return record.data.last + ', ' + record.data.first;
     *     }
     *
     *     function location(v, record){
     *         return !record.data.city ? '' : (record.data.city + ', ' + record.data.state);
     *     }
     *
     *     Ext.define('Dude', {
     *         extend: 'Ext.data.Model',
     *         fields: [
     *             {name: 'fullname',  convert: fullName},
     *             {name: 'firstname', mapping: 'name.first'},
     *             {name: 'lastname',  mapping: 'name.last'},
     *             {name: 'city', defaultValue: 'homeless'},
     *             'state',
     *             {name: 'location',  convert: location}
     *         ]
     *     });
     *
     *     // create the data store
     *     var store = Ext.create('Ext.data.Store', {
     *         reader: {
     *             type: 'json',
     *             model: 'Dude',
     *             idProperty: 'key',
     *             root: 'daRoot',
     *             totalProperty: 'total'
     *         }
     *     });
     *
     *     var myData = [
     *         { key: 1,
     *           name: { first: 'Fat',    last:  'Albert' }
     *           // notice no city, state provided in data object
     *         },
     *         { key: 2,
     *           name: { first: 'Barney', last:  'Rubble' },
     *           city: 'Bedrock', state: 'Stoneridge'
     *         },
     *         { key: 3,
     *           name: { first: 'Cliff',  last:  'Claven' },
     *           city: 'Boston',  state: 'MA'
     *         }
     *     ];
     */

    /**
     * @cfg {Function} [serialize]
     * A function which converts the Model's value for this Field into a form which can be used by whatever {@link Ext.data.writer.Writer Writer}
     * is being used to sync data with the server.
     * 
     * The function should return a string which represents the Field's value.
     *
     * It is passed the following parameters:
     *
     * - **v** : Mixed
     *
     *   The Field's value - the value to be serialized.
     *
     * - **rec** : Ext.data.Model
     *
     *   The record being serialized.
     *
     */

    /**
     * @cfg {String} dateFormat
     *
     * Used when converting received data into a Date when the {@link #type} is specified as `"date"`.
     * 
     * The format dtring is also used when serializing Date fields for use by {@link Ext.data.writer.Writer Writers}.
     *
     * A format string for the {@link Ext.Date#parse Ext.Date.parse} function, or "timestamp" if the value provided by
     * the Reader is a UNIX timestamp, or "time" if the value provided by the Reader is a javascript millisecond
     * timestamp. See {@link Ext.Date}.
     */
    dateFormat: null,
    
    /**
     * @cfg {Boolean} useNull
     *
     * Use when converting received data into a INT, FLOAT, BOOL or STRING type. If the value cannot be
     * parsed, `null` will be used if useNull is true, otherwise a default value for that type will be used:
     *
     * - for INT and FLOAT - `0`.
     * - for STRING - `""`.
     * - for BOOL - `false`.
     *
     * Note that when parsing of DATE type fails, the value will be `null` regardless of this setting.
     */
    useNull: false,
    
    /**
     * @cfg {Object} [defaultValue=""]
     *
     * The default value used when the creating an instance from a raw data object, and the property referenced by the
     * `{@link Ext.data.Field#mapping mapping}` does not exist in that data object.
     * 
     * May be specified as `undefined` to prevent defaulting in a value.
     */
    defaultValue: "",

    /**
     * @cfg {String/Number} mapping
     *
     * (Optional) A path expression for use by the {@link Ext.data.reader.Reader} implementation that is creating the
     * {@link Ext.data.Model Model} to extract the Field value from the data object. If the path expression is the same
     * as the field name, the mapping may be omitted.
     *
     * The form of the mapping expression depends on the Reader being used.
     *
     * - {@link Ext.data.reader.Json}
     *
     *   The mapping is a string containing the javascript expression to reference the data from an element of the data
     *   item's {@link Ext.data.reader.Json#cfg-root root} Array. Defaults to the field name.
     *
     * - {@link Ext.data.reader.Xml}
     *
     *   The mapping is an {@link Ext.DomQuery} path to the data item relative to the DOM element that represents the
     *   {@link Ext.data.reader.Xml#record record}. Defaults to the field name.
     *
     * - {@link Ext.data.reader.Array}
     *
     *   The mapping is a number indicating the Array index of the field's value. Defaults to the field specification's
     *   Array position.
     *
     * If a more complex value extraction strategy is required, then configure the Field with a {@link #convert}
     * function. This is passed the whole row object, and may interrogate it in whatever way is necessary in order to
     * return the desired data.
     */
    mapping: null,

    /**
     * @cfg {Function} sortType
     *
     * A function which converts a Field's value to a comparable value in order to ensure correct sort ordering.
     * Predefined functions are provided in {@link Ext.data.SortTypes}. A custom sort example:
     *
     *     // current sort     after sort we want
     *     // +-+------+          +-+------+
     *     // |1|First |          |1|First |
     *     // |2|Last  |          |3|Second|
     *     // |3|Second|          |2|Last  |
     *     // +-+------+          +-+------+
     *
     *     sortType: function(value) {
     *        switch (value.toLowerCase()) // native toLowerCase():
     *        {
     *           case 'first': return 1;
     *           case 'second': return 2;
     *           default: return 3;
     *        }
     *     }
     */
    sortType : null,

    /**
     * @cfg {String} sortDir
     *
     * Initial direction to sort (`"ASC"` or `"DESC"`). Defaults to `"ASC"`.
     */
    sortDir : "ASC",

    /**
     * @cfg {Boolean} allowBlank
     * @private
     *
     * Used for validating a {@link Ext.data.Model model}. Defaults to true. An empty value here will cause
     * {@link Ext.data.Model}.{@link Ext.data.Model#isValid isValid} to evaluate to false.
     */
    allowBlank : true,

    /**
     * @cfg {Boolean} persist
     *
     * False to exclude this field from the {@link Ext.data.Model#modified} fields in a model. This will also exclude
     * the field from being written using a {@link Ext.data.writer.Writer}. This option is useful when model fields are
     * used to keep state on the client but do not need to be persisted to the server. Defaults to true.
     */
    persist: true
});

/**
 * This class is used as a set of methods that are applied to the prototype of a
 * Model to decorate it with a Node API. This means that models used in conjunction with a tree
 * will have all of the tree related methods available on the model. In general this class will
 * not be used directly by the developer. This class also creates extra fields on the model if
 * they do not exist, to help maintain the tree state and UI. These fields are documented as
 * config options.
 */
Ext.define('Ext.data.NodeInterface', {
    requires: ['Ext.data.Field'],

    /**
     * @cfg {String} parentId
     * ID of parent node.
     */

    /**
     * @cfg {Number} index
     * The position of the node inside its parent. When parent has 4 children and the node is third amongst them,
     * index will be 2.
     */

    /**
     * @cfg {Number} depth
     * The number of parents this node has. A root node has depth 0, a child of it depth 1, and so on...
     */

    /**
     * @cfg {Boolean} [expanded=false]
     * True if the node is expanded.
     */

    /**
     * @cfg {Boolean} [expandable=false]
     * Set to true to allow for expanding/collapsing of this node.
     */

    /**
     * @cfg {Boolean} [checked=null]
     * Set to true or false to show a checkbox alongside this node.
     */

    /**
     * @cfg {Boolean} [leaf=false]
     * Set to true to indicate that this child can have no children. The expand icon/arrow will then not be
     * rendered for this node.
     */

    /**
     * @cfg {String} cls
     * CSS class to apply for this node.
     */

    /**
     * @cfg {String} iconCls
     * CSS class to apply for this node's icon.
     */

    /**
     * @cfg {String} icon
     * URL for this node's icon.
     */

    /**
     * @cfg {Boolean} root
     * True if this is the root node.
     */

    /**
     * @cfg {Boolean} isLast
     * True if this is the last node.
     */

    /**
     * @cfg {Boolean} isFirst
     * True if this is the first node.
     */

    /**
     * @cfg {Boolean} [allowDrop=true]
     * Set to false to deny dropping on this node.
     */

    /**
     * @cfg {Boolean} [allowDrag=true]
     * Set to false to deny dragging of this node.
     */

    /**
     * @cfg {Boolean} [loaded=false]
     * True if the node has finished loading.
     */

    /**
     * @cfg {Boolean} [loading=false]
     * True if the node is currently loading.
     */

    /**
     * @cfg {String} href
     * An URL for a link that's created when this config is specified.
     */

    /**
     * @cfg {String} hrefTarget
     * Target for link. Only applicable when {@link #href} also specified.
     */

    /**
     * @cfg {String} qtip
     * Tooltip text to show on this node.
     */

    /**
     * @cfg {String} qtitle
     * Tooltip title.
     */

    /**
     * @cfg {String} text
     * The text for to show on node label.
     */

    /**
     * @cfg {Ext.data.NodeInterface[]} children
     * Array of child nodes.
     */


    /**
     * @property nextSibling
     * A reference to this node's next sibling node. `null` if this node does not have a next sibling.
     */

    /**
     * @property previousSibling
     * A reference to this node's previous sibling node. `null` if this node does not have a previous sibling.
     */

    /**
     * @property parentNode
     * A reference to this node's parent node. `null` if this node is the root node.
     */

    /**
     * @property lastChild
     * A reference to this node's last child node. `null` if this node has no children.
     */

    /**
     * @property firstChild
     * A reference to this node's first child node. `null` if this node has no children.
     */

    /**
     * @property childNodes
     * An array of this nodes children.  Array will be empty if this node has no chidren.
     */

    statics: {
        /**
         * This method allows you to decorate a Model's class to implement the NodeInterface.
         * This adds a set of methods, new events, new properties and new fields on every Record.
         * @param {Ext.Class/Ext.data.Model} modelClass The Model class or an instance of the Model class you want to
         * decorate the prototype of.
         * @static
         */
        decorate: function(modelClass) {
            var idName, idType;
            
            // get the reference to the model class, in case the argument was a string or a record
            if (typeof modelClass == 'string') {
                modelClass = Ext.ModelManager.getModel(modelClass);
            } else if (modelClass.isModel) {
                modelClass = Ext.ModelManager.getModel(modelClass.modelName);
            }
            
            // avoid unnecessary work in case the model was already decorated
            if (modelClass.prototype.isNode) {
                return;
            }

            idName = modelClass.prototype.idProperty;
            idField = modelClass.prototype.fields.get(idName);
            idType = modelClass.prototype.fields.get(idName).type.type;
            modelClass.override(this.getPrototypeBody());
            this.applyFields(modelClass, [
                {name: 'parentId',   type: idType,    defaultValue: null, useNull: idField.useNull},
                {name: 'index',      type: 'int',     defaultValue: null, persist: false},
                {name: 'depth',      type: 'int',     defaultValue: 0, persist: false},
                {name: 'expanded',   type: 'bool',    defaultValue: false, persist: false},
                {name: 'expandable', type: 'bool',    defaultValue: true, persist: false},
                {name: 'checked',    type: 'auto',    defaultValue: null, persist: false},
                {name: 'leaf',       type: 'bool',    defaultValue: false},
                {name: 'cls',        type: 'string',  defaultValue: null, persist: false},
                {name: 'iconCls',    type: 'string',  defaultValue: null, persist: false},
                {name: 'icon',       type: 'string',  defaultValue: null, persist: false},
                {name: 'root',       type: 'boolean', defaultValue: false, persist: false},
                {name: 'isLast',     type: 'boolean', defaultValue: false, persist: false},
                {name: 'isFirst',    type: 'boolean', defaultValue: false, persist: false},
                {name: 'allowDrop',  type: 'boolean', defaultValue: true, persist: false},
                {name: 'allowDrag',  type: 'boolean', defaultValue: true, persist: false},
                {name: 'loaded',     type: 'boolean', defaultValue: false, persist: false},
                {name: 'loading',    type: 'boolean', defaultValue: false, persist: false},
                {name: 'href',       type: 'string',  defaultValue: null, persist: false},
                {name: 'hrefTarget', type: 'string',  defaultValue: null, persist: false},
                {name: 'qtip',       type: 'string',  defaultValue: null, persist: false},
                {name: 'qtitle',     type: 'string',  defaultValue: null, persist: false},
                {name: 'children',   type: 'auto',   defaultValue: null, persist: false}
            ]);
        },
        
        applyFields: function(modelClass, addFields) {
            var modelPrototype = modelClass.prototype,
                fields = modelPrototype.fields,
                keys = fields.keys,
                ln = addFields.length,
                addField, i;

            for (i = 0; i < ln; i++) {
                addField = addFields[i];
                if (!Ext.Array.contains(keys, addField.name)) {
                    fields.add(new Ext.data.Field(addField));
                }
            }

        },

        getPrototypeBody: function() {
            return {
                /**
                 * @property {Boolean} isNode
                 * `true` in this class to identify an object as an instantiated Node, or subclass thereof.
                 */
                isNode: true,
                
                constructor: function() {
                    var me = this;
                    this.callParent(arguments);
                    Ext.applyIf(me, {
                        firstChild: null,
                        lastChild: null,
                        parentNode: null,
                        previousSibling: null,
                        nextSibling: null,
                        childNodes: []
                    });
                    me.enableBubble([
                        /**
                         * @event append
                         * Fires when a new child node is appended
                         * @param {Ext.data.NodeInterface} this This node
                         * @param {Ext.data.NodeInterface} node The newly appended node
                         * @param {Number} index The index of the newly appended node
                         */
                        "append",

                        /**
                         * @event remove
                         * Fires when a child node is removed
                         * @param {Ext.data.NodeInterface} this This node
                         * @param {Ext.data.NodeInterface} node The removed node
                         * @param {Boolean} isMove `true` if the child node is being removed so it can be moved to another position in the tree.
                         * (a side effect of calling {@link Ext.data.NodeInterface#appendChild appendChild} or
                         * {@link Ext.data.NodeInterface#insertBefore insertBefore} with a node that already has a parentNode)
                         */
                        "remove",

                        /**
                         * @event move
                         * Fires when this node is moved to a new location in the tree
                         * @param {Ext.data.NodeInterface} this This node
                         * @param {Ext.data.NodeInterface} oldParent The old parent of this node
                         * @param {Ext.data.NodeInterface} newParent The new parent of this node
                         * @param {Number} index The index it was moved to
                         */
                        "move",

                        /**
                         * @event insert
                         * Fires when a new child node is inserted.
                         * @param {Ext.data.NodeInterface} this This node
                         * @param {Ext.data.NodeInterface} node The child node inserted
                         * @param {Ext.data.NodeInterface} refNode The child node the node was inserted before
                         */
                        "insert",

                        /**
                         * @event beforeappend
                         * Fires before a new child is appended, return false to cancel the append.
                         * @param {Ext.data.NodeInterface} this This node
                         * @param {Ext.data.NodeInterface} node The child node to be appended
                         */
                        "beforeappend",

                        /**
                         * @event beforeremove
                         * Fires before a child is removed, return false to cancel the remove.
                         * @param {Ext.data.NodeInterface} this This node
                         * @param {Ext.data.NodeInterface} node The child node to be removed
                         * @param {Boolean} isMove `true` if the child node is being removed so it can be moved to another position in the tree.
                         * (a side effect of calling {@link Ext.data.NodeInterface#appendChild appendChild} or
                         * {@link Ext.data.NodeInterface#insertBefore insertBefore} with a node that already has a parentNode)
                         */
                        "beforeremove",

                        /**
                         * @event beforemove
                         * Fires before this node is moved to a new location in the tree. Return false to cancel the move.
                         * @param {Ext.data.NodeInterface} this This node
                         * @param {Ext.data.NodeInterface} oldParent The parent of this node
                         * @param {Ext.data.NodeInterface} newParent The new parent this node is moving to
                         * @param {Number} index The index it is being moved to
                         */
                        "beforemove",

                         /**
                          * @event beforeinsert
                          * Fires before a new child is inserted, return false to cancel the insert.
                          * @param {Ext.data.NodeInterface} this This node
                          * @param {Ext.data.NodeInterface} node The child node to be inserted
                          * @param {Ext.data.NodeInterface} refNode The child node the node is being inserted before
                          */
                        "beforeinsert",

                        /**
                         * @event expand
                         * Fires when this node is expanded.
                         * @param {Ext.data.NodeInterface} this The expanding node
                         */
                        "expand",

                        /**
                         * @event collapse
                         * Fires when this node is collapsed.
                         * @param {Ext.data.NodeInterface} this The collapsing node
                         */
                        "collapse",

                        /**
                         * @event beforeexpand
                         * Fires before this node is expanded.
                         * @param {Ext.data.NodeInterface} this The expanding node
                         */
                        "beforeexpand",

                        /**
                         * @event beforecollapse
                         * Fires before this node is collapsed.
                         * @param {Ext.data.NodeInterface} this The collapsing node
                         */
                        "beforecollapse",

                        /**
                         * @event sort
                         * Fires when this node's childNodes are sorted.
                         * @param {Ext.data.NodeInterface} this This node.
                         * @param {Ext.data.NodeInterface[]} childNodes The childNodes of this node.
                         */
                        "sort"
                    ]);
                    return me;
                },
                /**
                 * Ensures that the passed object is an instance of a Record with the NodeInterface applied
                 * @return {Ext.data.NodeInterface}
                 */
                createNode: function(node) {
                    if (Ext.isObject(node) && !node.isModel) {
                        node = Ext.ModelManager.create(node, this.modelName);
                    }
                    // The node may already decorated, but may not have been
                    // so when the model constructor was called. If not,
                    // setup defaults here
                    if (!node.childNodes) {
                        Ext.applyIf(node, {
                            firstChild: null,
                            lastChild: null,
                            parentNode: null,
                            previousSibling: null,
                            nextSibling: null,
                            childNodes: []
                        });
                    }
                    return node;
                },

                /**
                 * Returns true if this node is a leaf
                 * @return {Boolean}
                 */
                isLeaf : function() {
                    return this.get('leaf') === true;
                },

                /**
                 * Sets the first child of this node
                 * @private
                 * @param {Ext.data.NodeInterface} node
                 */
                setFirstChild : function(node) {
                    this.firstChild = node;
                },

                /**
                 * Sets the last child of this node
                 * @private
                 * @param {Ext.data.NodeInterface} node
                 */
                setLastChild : function(node) {
                    this.lastChild = node;
                },

                /**
                 * Updates general data of this node like isFirst, isLast, depth. This
                 * method is internally called after a node is moved. This shouldn't
                 * have to be called by the developer unless they are creating custom
                 * Tree plugins.
                 * @return {Boolean}
                 */
                updateInfo: function(commit) {
                    var me = this,
                        isRoot = me.isRoot(),
                        parentNode = me.parentNode,
                        isFirst = (!parentNode || isRoot ? true : parentNode.firstChild === me),
                        isLast = (!parentNode || isRoot ? true : parentNode.lastChild === me),
                        depth = 0,
                        parent = me,
                        children = me.childNodes,
                        len = children.length,
                        i = 0,
                        phantom = me.phantom;

                    while (parent.parentNode) {
                        ++depth;
                        parent = parent.parentNode;
                    }

                    me.beginEdit();
                    me.set({
                        isFirst: isFirst,
                        isLast: isLast,
                        depth: depth,
                        index: parentNode ? parentNode.indexOf(me) : 0,
                        parentId: parentNode ? parentNode.getId() : null
                    });
                    me.endEdit(true);
                    if (commit) {
                        me.commit();
                        me.phantom = phantom;
                    }

                    for (i = 0; i < len; i++) {
                        children[i].updateInfo(commit);
                    }
                },

                /**
                 * Returns true if this node is the last child of its parent
                 * @return {Boolean}
                 */
                isLast : function() {
                   return this.get('isLast');
                },

                /**
                 * Returns true if this node is the first child of its parent
                 * @return {Boolean}
                 */
                isFirst : function() {
                   return this.get('isFirst');
                },

                /**
                 * Returns true if this node has one or more child nodes, else false.
                 * @return {Boolean}
                 */
                hasChildNodes : function() {
                    return !this.isLeaf() && this.childNodes.length > 0;
                },

                /**
                 * Returns true if this node has one or more child nodes, or if the <tt>expandable</tt>
                 * node attribute is explicitly specified as true, otherwise returns false.
                 * @return {Boolean}
                 */
                isExpandable : function() {
                    var me = this;

                    if (me.get('expandable')) {
                        return !(me.isLeaf() || (me.isLoaded() && !me.hasChildNodes()));
                    }
                    return false;
                },
                
                triggerUIUpdate: function(){
                    // This isn't ideal, however none of the underlying fields have changed
                    // but we still need to update the UI
                    this.afterEdit([]);    
                },

                /**
                 * Inserts node(s) as the last child node of this node.
                 *
                 * If the node was previously a child node of another parent node, it will be removed from that node first.
                 *
                 * @param {Ext.data.NodeInterface/Ext.data.NodeInterface[]} node The node or Array of nodes to append
                 * @return {Ext.data.NodeInterface} The appended node if single append, or null if an array was passed
                 */
                appendChild : function(node, suppressEvents, commit) {
                    var me = this,
                        i, ln,
                        index,
                        oldParent,
                        ps;

                    // if passed an array do them one by one
                    if (Ext.isArray(node)) {
                        // suspend auto syncing while we append all the nodes
                        me.callStore('suspendAutoSync');
                        for (i = 0, ln = node.length - 1; i < ln; i++) {
                            me.appendChild(node[i]);
                        }
                        // resume auto syncing before we append the last node
                        me.callStore('resumeAutoSync');
                        me.appendChild(node[ln]);
                    } else {
                        // Make sure it is a record
                        node = me.createNode(node);

                        if (suppressEvents !== true && (!me.hasListeners.beforeappend || me.fireEvent("beforeappend", me, node) === false)) {
                            return false;
                        }

                        index = me.childNodes.length;
                        oldParent = node.parentNode;

                        // it's a move, make sure we move it cleanly
                        if (oldParent) {
                            if (suppressEvents !== true && (!me.hasListeners.beforeremove || node.fireEvent("beforemove", node, oldParent, me, index) === false)) {
                                return false;
                            }
                            oldParent.removeChild(node, false, false, true);
                        }

                        index = me.childNodes.length;
                        if (index === 0) {
                            me.setFirstChild(node);
                        }

                        me.childNodes.push(node);
                        node.parentNode = me;
                        node.nextSibling = null;

                        me.setLastChild(node);

                        ps = me.childNodes[index - 1];
                        if (ps) {
                            node.previousSibling = ps;
                            ps.nextSibling = node;
                            ps.updateInfo(commit);
                        } else {
                            node.previousSibling = null;
                        }

                        node.updateInfo(commit);

                        // As soon as we append a child to this node, we are loaded
                        if (!me.isLoaded()) {
                            me.set('loaded', true);
                        } else if (me.childNodes.length === 1) {
                            me.triggerUIUpdate();
                        }

                        if(!node.isLeaf() && node.phantom) {
                            node.set('loaded', true);
                        }

                        if (suppressEvents !== true) {
                            me.fireEvent("append", me, node, index);

                            if (oldParent) {
                                node.fireEvent("move", node, oldParent, me, index);
                            }
                        }

                        return node;
                    }
                },

                /**
                 * Returns the bubble target for this node
                 * @private
                 * @return {Object} The bubble target
                 */
                getBubbleTarget: function() {
                    return this.parentNode;
                },

                /**
                 * Removes a child node from this node.
                 * @param {Ext.data.NodeInterface} node The node to remove
                 * @param {Boolean} [destroy=false] True to destroy the node upon removal.
                 * @return {Ext.data.NodeInterface} The removed node
                 */
                removeChild : function(node, destroy, suppressEvents, isMove) {
                    var me = this,
                        index = me.indexOf(node),
                        i, childCount;

                    if (index == -1 || (suppressEvents !== true && (!me.hasListeners.beforeremove || me.fireEvent("beforeremove", me, node, !!isMove) === false))) {
                        return false;
                    }

                    // remove it from childNodes collection
                    Ext.Array.erase(me.childNodes, index, 1);

                    // update child refs
                    if (me.firstChild == node) {
                        me.setFirstChild(node.nextSibling);
                    }
                    if (me.lastChild == node) {
                        me.setLastChild(node.previousSibling);
                    }

                    // update siblings
                    if (node.previousSibling) {
                        node.previousSibling.nextSibling = node.nextSibling;
                    }
                    if (node.nextSibling) {
                        node.nextSibling.previousSibling = node.previousSibling;
                    }

                    // update the info for all siblings starting at the index before the node's old index (or 0 if the removed node was the firstChild)
                    for(i = index > 0 ? index - 1 : 0, childCount = me.childNodes.length; i < childCount; i++) {
                        me.childNodes[i].updateInfo();
                    }

                    // If this node suddenly doesnt have childnodes anymore, update myself
                    if (!me.childNodes.length) {
                        me.triggerUIUpdate();
                    }

                    if (suppressEvents !== true) {
                        if (me.hasListeners.remove) {
                            me.fireEvent("remove", me, node, !!isMove);
                        }
                    }

                    if (destroy) {
                        node.destroy(true);
                    } else {
                        node.clear();
                    }

                    return node;
                },

                /**
                 * Creates a copy (clone) of this Node.
                 * @param {String} [id] A new id, defaults to this Node's id.
                 * @param {Boolean} [deep=false] True to recursively copy all child Nodes into the new Node.
                 * False to copy without child Nodes.
                 * @return {Ext.data.NodeInterface} A copy of this Node.
                 */
                copy: function(newId, deep) {
                    var me = this,
                        result = me.callOverridden(arguments),
                        len = me.childNodes ? me.childNodes.length : 0,
                        i;

                    // Move child nodes across to the copy if required
                    if (deep) {
                        for (i = 0; i < len; i++) {
                            result.appendChild(me.childNodes[i].copy(true));
                        }
                    }
                    return result;
                },

                /**
                 * Clears the node.
                 * @private
                 * @param {Boolean} [destroy=false] True to destroy the node.
                 */
                clear : function(destroy) {
                    var me = this;

                    // clear any references from the node
                    me.parentNode = me.previousSibling = me.nextSibling = null;
                    if (destroy) {
                        me.firstChild = me.lastChild = null;
                    }
                },

                /**
                 * Destroys the node.
                 */
                destroy : function(silent) {
                    /*
                     * Silent is to be used in a number of cases
                     * 1) When setRoot is called.
                     * 2) When destroy on the tree is called
                     * 3) For destroying child nodes on a node
                     */
                    var me      = this,
                        options = me.destroyOptions,
                        nodes   = me.childNodes,
                        nLen    = nodes.length,
                        n;

                    if (silent === true) {
                        me.clear(true);

                        for (n = 0; n < nLen; n++) {
                            nodes[n].destroy(true);
                        }

                        me.childNodes = null;
                        delete me.destroyOptions;
                        me.callOverridden([options]);
                    } else {
                        me.destroyOptions = silent;
                        // overridden method will be called, since remove will end up calling destroy(true);
                        me.remove(true);
                    }
                },

                /**
                 * Inserts the first node before the second node in this nodes childNodes collection.
                 * @param {Ext.data.NodeInterface} node The node to insert
                 * @param {Ext.data.NodeInterface} refNode The node to insert before (if null the node is appended)
                 * @return {Ext.data.NodeInterface} The inserted node
                 */
                insertBefore : function(node, refNode, suppressEvents) {
                    var me = this,
                        index     = me.indexOf(refNode),
                        oldParent = node.parentNode,
                        refIndex  = index,
                        childCount, ps, i;

                    if (!refNode) { // like standard Dom, refNode can be null for append
                        return me.appendChild(node);
                    }

                    // nothing to do
                    if (node == refNode) {
                        return false;
                    }

                    // Make sure it is a record with the NodeInterface
                    node = me.createNode(node);

                    if (suppressEvents !== true && (!me.hasListeners.beforeinsert || me.fireEvent("beforeinsert", me, node, refNode) === false)) {
                        return false;
                    }

                    // when moving internally, indexes will change after remove
                    if (oldParent == me && me.indexOf(node) < index) {
                        refIndex--;
                    }

                    // it's a move, make sure we move it cleanly
                    if (oldParent) {
                        if (suppressEvents !== true && (!me.hasListeners.beforeremove || node.fireEvent("beforemove", node, oldParent, me, index, refNode) === false)) {
                            return false;
                        }
                        oldParent.removeChild(node, false, false, true);
                    }

                    if (refIndex === 0) {
                        me.setFirstChild(node);
                    }

                    Ext.Array.splice(me.childNodes, refIndex, 0, node);
                    node.parentNode = me;

                    node.nextSibling = refNode;
                    refNode.previousSibling = node;

                    ps = me.childNodes[refIndex - 1];
                    if (ps) {
                        node.previousSibling = ps;
                        ps.nextSibling = node;
                    } else {
                        node.previousSibling = null;
                    }

                    // update the info for all siblings starting at the index before the node's insertion point (or 0 if the inserted node is the firstChild)
                    for(i = refIndex > 0 ? refIndex - 1 : 0, childCount = me.childNodes.length; i < childCount; i++) {
                        me.childNodes[i].updateInfo();
                    }

                    if (!me.isLoaded()) {
                        me.set('loaded', true);
                    }
                    // If this node didnt have any childnodes before, update myself
                    else if (me.childNodes.length === 1) {
                        me.triggerUIUpdate();
                    }

                    if(!node.isLeaf() && node.phantom) {
                        node.set('loaded', true);
                    }

                    if (suppressEvents !== true) {
                        if (me.hasListeners.insert) {
                            me.fireEvent("insert", me, node, refNode);
                        }

                        if (oldParent && me.hasListeners.move) {
                            node.fireEvent("move", node, oldParent, me, refIndex, refNode);
                        }
                    }

                    return node;
                },

                /**
                 * Inserts a node into this node.
                 * @param {Number} index The zero-based index to insert the node at
                 * @param {Ext.data.NodeInterface} node The node to insert
                 * @return {Ext.data.NodeInterface} The node you just inserted
                 */
                insertChild: function(index, node) {
                    var sibling = this.childNodes[index];
                    if (sibling) {
                        return this.insertBefore(node, sibling);
                    }
                    else {
                        return this.appendChild(node);
                    }
                },

                /**
                 * Removes this node from its parent
                 * @param {Boolean} [destroy=false] True to destroy the node upon removal.
                 * @return {Ext.data.NodeInterface} this
                 */
                remove : function(destroy, suppressEvents) {
                    var parentNode = this.parentNode;

                    if (parentNode) {
                        parentNode.removeChild(this, destroy, suppressEvents);
                    }
                    return this;
                },

                /**
                 * Removes all child nodes from this node.
                 * @param {Boolean} [destroy=false] <True to destroy the node upon removal.
                 * @return {Ext.data.NodeInterface} this
                 */
                removeAll : function(destroy, suppressEvents) {
                    var cn = this.childNodes,
                        n;

                    while ((n = cn[0])) {
                        this.removeChild(n, destroy, suppressEvents);
                    }
                    return this;
                },

                /**
                 * Returns the child node at the specified index.
                 * @param {Number} index
                 * @return {Ext.data.NodeInterface}
                 */
                getChildAt : function(index) {
                    return this.childNodes[index];
                },

                /**
                 * Replaces one child node in this node with another.
                 * @param {Ext.data.NodeInterface} newChild The replacement node
                 * @param {Ext.data.NodeInterface} oldChild The node to replace
                 * @return {Ext.data.NodeInterface} The replaced node
                 */
                replaceChild : function(newChild, oldChild, suppressEvents) {
                    var s = oldChild ? oldChild.nextSibling : null;

                    this.removeChild(oldChild, false, suppressEvents);
                    this.insertBefore(newChild, s, suppressEvents);
                    return oldChild;
                },

                /**
                 * Returns the index of a child node
                 * @param {Ext.data.NodeInterface} node
                 * @return {Number} The index of the node or -1 if it was not found
                 */
                indexOf : function(child) {
                    return Ext.Array.indexOf(this.childNodes, child);
                },
                
                /**
                 * Returns the index of a child node that matches the id
                 * @param {String} id The id of the node to find
                 * @return {Number} The index of the node or -1 if it was not found
                 */
                indexOfId: function(id) {
                    var childNodes = this.childNodes,
                        len = childNodes.length,
                        i = 0;
                        
                    for (; i < len; ++i) {
                        if (childNodes[i].getId() === id) {
                            return i;
                        }    
                    }
                    return -1;
                },

                /**
                 * Gets the hierarchical path from the root of the current node.
                 * @param {String} [field] The field to construct the path from. Defaults to the model idProperty.
                 * @param {String} [separator="/"] A separator to use.
                 * @return {String} The node path
                 */
                getPath: function(field, separator) {
                    field = field || this.idProperty;
                    separator = separator || '/';

                    var path = [this.get(field)],
                        parent = this.parentNode;

                    while (parent) {
                        path.unshift(parent.get(field));
                        parent = parent.parentNode;
                    }
                    return separator + path.join(separator);
                },

                /**
                 * Returns depth of this node (the root node has a depth of 0)
                 * @return {Number}
                 */
                getDepth : function() {
                    return this.get('depth');
                },

                /**
                 * Bubbles up the tree from this node, calling the specified function with each node. The arguments to the function
                 * will be the args provided or the current node. If the function returns false at any point,
                 * the bubble is stopped.
                 * @param {Function} fn The function to call
                 * @param {Object} [scope] The scope (this reference) in which the function is executed. Defaults to the current Node.
                 * @param {Array} [args] The args to call the function with. Defaults to passing the current Node.
                 */
                bubble : function(fn, scope, args) {
                    var p = this;
                    while (p) {
                        if (fn.apply(scope || p, args || [p]) === false) {
                            break;
                        }
                        p = p.parentNode;
                    }
                },

                cascade: function() {
                    if (Ext.isDefined(Ext.global.console)) {
                        Ext.global.console.warn('Ext.data.Node: cascade has been deprecated. Please use cascadeBy instead.');
                    }
                    return this.cascadeBy.apply(this, arguments);
                },

                /**
                 * Cascades down the tree from this node, calling the specified function with each node. The arguments to the function
                 * will be the args provided or the current node. If the function returns false at any point,
                 * the cascade is stopped on that branch.
                 * @param {Function} fn The function to call
                 * @param {Object} [scope] The scope (this reference) in which the function is executed. Defaults to the current Node.
                 * @param {Array} [args] The args to call the function with. Defaults to passing the current Node.
                 */
                cascadeBy : function(fn, scope, args) {
                    if (fn.apply(scope || this, args || [this]) !== false) {
                        var childNodes = this.childNodes,
                            length     = childNodes.length,
                            i;

                        for (i = 0; i < length; i++) {
                            childNodes[i].cascadeBy(fn, scope, args);
                        }
                    }
                },

                /**
                 * Interates the child nodes of this node, calling the specified function with each node. The arguments to the function
                 * will be the args provided or the current node. If the function returns false at any point,
                 * the iteration stops.
                 * @param {Function} fn The function to call
                 * @param {Object} [scope] The scope (this reference) in which the function is executed. Defaults to the current Node in iteration.
                 * @param {Array} [args] The args to call the function with. Defaults to passing the current Node.
                 */
                eachChild : function(fn, scope, args) {
                    var childNodes = this.childNodes,
                        length     = childNodes.length,
                        i;

                    for (i = 0; i < length; i++) {
                        if (fn.apply(scope || this, args || [childNodes[i]]) === false) {
                            break;
                        }
                    }
                },

                /**
                 * Finds the first child that has the attribute with the specified value.
                 * @param {String} attribute The attribute name
                 * @param {Object} value The value to search for
                 * @param {Boolean} [deep=false] True to search through nodes deeper than the immediate children
                 * @return {Ext.data.NodeInterface} The found child or null if none was found
                 */
                findChild : function(attribute, value, deep) {
                    return this.findChildBy(function() {
                        return this.get(attribute) == value;
                    }, null, deep);
                },

                /**
                 * Finds the first child by a custom function. The child matches if the function passed returns true.
                 * @param {Function} fn A function which must return true if the passed Node is the required Node.
                 * @param {Object} [scope] The scope (this reference) in which the function is executed. Defaults to the Node being tested.
                 * @param {Boolean} [deep=false] True to search through nodes deeper than the immediate children
                 * @return {Ext.data.NodeInterface} The found child or null if none was found
                 */
                findChildBy : function(fn, scope, deep) {
                    var cs = this.childNodes,
                        len = cs.length,
                        i = 0, n, res;

                    for (; i < len; i++) {
                        n = cs[i];
                        if (fn.call(scope || n, n) === true) {
                            return n;
                        }
                        else if (deep) {
                            res = n.findChildBy(fn, scope, deep);
                            if (res !== null) {
                                return res;
                            }
                        }
                    }

                    return null;
                },

                /**
                 * Returns true if this node is an ancestor (at any point) of the passed node.
                 * @param {Ext.data.NodeInterface} node
                 * @return {Boolean}
                 */
                contains : function(node) {
                    return node.isAncestor(this);
                },

                /**
                 * Returns true if the passed node is an ancestor (at any point) of this node.
                 * @param {Ext.data.NodeInterface} node
                 * @return {Boolean}
                 */
                isAncestor : function(node) {
                    var p = this.parentNode;
                    while (p) {
                        if (p == node) {
                            return true;
                        }
                        p = p.parentNode;
                    }
                    return false;
                },

                /**
                 * Sorts this nodes children using the supplied sort function.
                 * @param {Function} fn A function which, when passed two Nodes, returns -1, 0 or 1 depending upon required sort order.
                 * @param {Boolean} [recursive=false] True to apply this sort recursively
                 * @param {Boolean} [suppressEvent=false] True to not fire a sort event.
                 */
                sort : function(sortFn, recursive, suppressEvent) {
                    var cs  = this.childNodes,
                        ln = cs.length,
                        i, n;

                    if (ln > 0) {
                        Ext.Array.sort(cs, sortFn);
                        for (i = 0; i < ln; i++) {
                            n = cs[i];
                            n.previousSibling = cs[i-1];
                            n.nextSibling = cs[i+1];

                            if (i === 0) {
                                this.setFirstChild(n);
                            }
                            if (i == ln - 1) {
                                this.setLastChild(n);
                            }
                            n.updateInfo();
                            if (recursive && !n.isLeaf()) {
                                n.sort(sortFn, true, true);
                            }
                        }

                        if (suppressEvent !== true) {
                            this.fireEvent('sort', this, cs);
                        }
                    }
                },

                /**
                 * Returns true if this node is expaned
                 * @return {Boolean}
                 */
                isExpanded: function() {
                    return this.get('expanded');
                },

                /**
                 * Returns true if this node is loaded
                 * @return {Boolean}
                 */
                isLoaded: function() {
                    return this.get('loaded');
                },

                /**
                 * Returns true if this node is loading
                 * @return {Boolean}
                 */
                isLoading: function() {
                    return this.get('loading');
                },

                /**
                 * Returns true if this node is the root node
                 * @return {Boolean}
                 */
                isRoot: function() {
                    return !this.parentNode;
                },

                /**
                 * Returns true if this node is visible
                 * @return {Boolean}
                 */
                isVisible: function() {
                    var parent = this.parentNode;
                    while (parent) {
                        if (!parent.isExpanded()) {
                            return false;
                        }
                        parent = parent.parentNode;
                    }
                    return true;
                },

                /**
                 * Expand this node.
                 * @param {Boolean} [recursive=false] True to recursively expand all the children
                 * @param {Function} [callback] The function to execute once the expand completes
                 * @param {Object} [scope] The scope to run the callback in
                 */
                expand: function(recursive, callback, scope) {
                    var me = this;

                    // all paths must call the callback (eventually) or things like
                    // selectPath fail

                    // First we start by checking if this node is a parent
                    if (!me.isLeaf()) {
                        // If it's loaded, wait until it loads before proceeding
                        if (me.isLoading()) {
                            me.on('expand', function(){
                                me.expand(recursive, callback, scope);
                            }, me, {single: true});
                        } else {
                            // Now we check if this record is already expanding or expanded
                            if (!me.isExpanded()) {
                                // The TreeStore actually listens for the beforeexpand method and checks
                                // whether we have to asynchronously load the children from the server
                                // first. Thats why we pass a callback function to the event that the
                                // store can call once it has loaded and parsed all the children.
                                me.fireEvent('beforeexpand', me, function() {
                                    me.set('expanded', true);
                                    if (me.hasListeners.expand) {
                                        me.fireEvent('expand', me, me.childNodes, false);
                                    }

                                    // Call the expandChildren method if recursive was set to true
                                    if (recursive) {
                                        me.expandChildren(true, callback, scope);
                                    } else {
                                        Ext.callback(callback, scope || me, [me.childNodes]);
                                    }
                                }, me);
                            } else if (recursive) {
                                // If it is is already expanded but we want to recursively expand then call expandChildren
                                me.expandChildren(true, callback, scope);
                            } else {
                                Ext.callback(callback, scope || me, [me.childNodes]);
                            }
                        }
                    } else {
                        // If it's not then we fire the callback right away
                        Ext.callback(callback, scope || me); // leaf = no childNodes
                    }
                },

                /**
                 * Expand all the children of this node.
                 * @param {Boolean} [recursive=false] True to recursively expand all the children
                 * @param {Function} [callback] The function to execute once all the children are expanded
                 * @param {Object} [scope] The scope to run the callback in
                 */
                expandChildren: function(recursive, callback, scope) {
                    var me = this,
                        i = 0,
                        nodes = me.childNodes,
                        ln = nodes.length,
                        node,
                        expanding = 0;

                    for (; i < ln; ++i) {
                        node = nodes[i];
                        if (!node.isLeaf()) {
                            expanding++;
                            nodes[i].expand(recursive, function () {
                                expanding--;
                                if (callback && !expanding) {
                                    Ext.callback(callback, scope || me, [me.childNodes]);
                                }
                            });
                        }
                    }

                    if (!expanding && callback) {
                        Ext.callback(callback, scope || me, [me.childNodes]);                    }
                },

                /**
                 * Collapse this node.
                 * @param {Boolean} [recursive=false] True to recursively collapse all the children
                 * @param {Function} [callback] The function to execute once the collapse completes
                 * @param {Object} [scope] The scope to run the callback in
                 */
                collapse: function(recursive, callback, scope) {
                    var me = this;

                    // First we start by checking if this node is a parent
                    if (!me.isLeaf()) {
                        // Now we check if this record is already collapsing or collapsed
                        if (!me.collapsing && me.isExpanded()) {
                            me.fireEvent('beforecollapse', me, function() {
                                me.set('expanded', false);
                                if (me.hasListeners.collapse) {
                                    me.fireEvent('collapse', me, me.childNodes, false);
                                }

                                // Call the collapseChildren method if recursive was set to true
                                if (recursive) {
                                    me.collapseChildren(true, callback, scope);
                                }
                                else {
                                    Ext.callback(callback, scope || me, [me.childNodes]);
                                }
                            }, me);
                        }
                        // If it is is already collapsed but we want to recursively collapse then call collapseChildren
                        else if (recursive) {
                            me.collapseChildren(true, callback, scope);
                        } else {
                            Ext.callback(callback, scope || me, [me.childNodes]);
                        }
                    }
                    // If it's not then we fire the callback right away
                    else {
                        Ext.callback(callback, scope || me, [me.childNodes]);
                    }
                },

                /**
                 * Collapse all the children of this node.
                 * @param {Function} [recursive=false] True to recursively collapse all the children
                 * @param {Function} [callback] The function to execute once all the children are collapsed
                 * @param {Object} [scope] The scope to run the callback in
                 */
                collapseChildren: function(recursive, callback, scope) {
                    var me = this,
                        i = 0,
                        nodes = me.childNodes,
                        ln = nodes.length,
                        node,
                        collapsing = 0;

                    for (; i < ln; ++i) {
                        node = nodes[i];
                        if (!node.isLeaf()) {
                            collapsing++;
                            nodes[i].collapse(recursive, function () {
                                collapsing--;
                                if (callback && !collapsing) {
                                    Ext.callback(callback, scope || me, [me.childNodes]);
                                }
                            });
                        }
                    }

                    if (!collapsing && callback) {
                        Ext.callback(callback, scope || me, [me.childNodes]);
                    }
                }
            };
        }
    }
});

/**
 * @class Ext.data.Tree
 *
 * This class is used as a container for a series of nodes. The nodes themselves maintain
 * the relationship between parent/child. The tree itself acts as a manager. It gives functionality
 * to retrieve a node by its identifier: {@link #getNodeById}.
 *
 * The tree also relays events from any of it's child nodes, allowing them to be handled in a
 * centralized fashion. In general this class is not used directly, rather used internally
 * by other parts of the framework.
 *
 */
Ext.define('Ext.data.Tree', {
    alias: 'data.tree',

    mixins: {
        observable: "Ext.util.Observable"
    },

    /**
     * @property {Ext.data.NodeInterface}
     * The root node for this tree
     */
    root: null,

    /**
     * Creates new Tree object.
     * @param {Ext.data.NodeInterface} root (optional) The root node
     */
    constructor: function(root) {
        var me = this;

        me.mixins.observable.constructor.call(me);

        if (root) {
            me.setRootNode(root);
        }
    },

    /**
     * Returns the root node for this tree.
     * @return {Ext.data.NodeInterface}
     */
    getRootNode : function() {
        return this.root;
    },

    /**
     * Sets the root node for this tree.
     * @param {Ext.data.NodeInterface} node
     * @return {Ext.data.NodeInterface} The root node
     */
    setRootNode : function(node) {
        var me = this;

        me.root = node;

        if (me.fireEvent('beforeappend', null, node) !== false) {
            node.set('root', true);
            node.updateInfo();
            // root node should never be phantom or dirty, so commit it
            node.commit();

            node.on({
                scope: me,
                insert: me.onNodeInsert,
                append: me.onNodeAppend,
                remove: me.onNodeRemove
            });

            me.relayEvents(node, [
                /**
                 * @event append
                 * @inheritdoc Ext.data.NodeInterface#append
                 */
                "append",

                /**
                 * @event remove
                 * @inheritdoc Ext.data.NodeInterface#remove
                 */
                "remove",

                /**
                 * @event move
                 * @inheritdoc Ext.data.NodeInterface#move
                 */
                "move",

                /**
                 * @event insert
                 * @inheritdoc Ext.data.NodeInterface#insert
                 */
                "insert",

                /**
                 * @event beforeappend
                 * @inheritdoc Ext.data.NodeInterface#beforeappend
                 */
                "beforeappend",

                /**
                 * @event beforeremove
                 * @inheritdoc Ext.data.NodeInterface#beforeremove
                 */
                "beforeremove",

                /**
                 * @event beforemove
                 * @inheritdoc Ext.data.NodeInterface#beforemove
                 */
                "beforemove",

                /**
                 * @event beforeinsert
                 * @inheritdoc Ext.data.NodeInterface#beforeinsert
                 */
                "beforeinsert",

                /**
                 * @event expand
                 * @inheritdoc Ext.data.NodeInterface#expand
                 */
                "expand",

                /**
                 * @event collapse
                 * @inheritdoc Ext.data.NodeInterface#collapse
                 */
                "collapse",

                /**
                 * @event beforeexpand
                 * @inheritdoc Ext.data.NodeInterface#beforeexpand
                 */
                "beforeexpand",

                /**
                 * @event beforecollapse
                 * @inheritdoc Ext.data.NodeInterface#beforecollapse
                 */
                "beforecollapse" ,

                /**
                 * @event sort
                 * @inheritdoc Ext.data.NodeInterface#event-sort
                 */
                "sort",

                /**
                 * @event rootchange
                 * Fires whenever the root node is changed in the tree.
                 * @param {Ext.data.Model} root The new root
                 */
                "rootchange"
            ]);

            me.nodeHash = {};
            me.registerNode(node);
            me.fireEvent('append', null, node);
            me.fireEvent('rootchange', node);
        }

        return node;
    },

    /**
     * Flattens all the nodes in the tree into an array.
     * @private
     * @return {Ext.data.NodeInterface[]} The flattened nodes.
     */
    flatten: function(){
        return Ext.Object.getValues(this.nodeHash);
    },

    /**
     * Fired when a node is inserted into the root or one of it's children
     * @private
     * @param {Ext.data.NodeInterface} parent The parent node
     * @param {Ext.data.NodeInterface} node The inserted node
     */
    onNodeInsert: function(parent, node) {
        this.registerNode(node, true);
    },

    /**
     * Fired when a node is appended into the root or one of it's children
     * @private
     * @param {Ext.data.NodeInterface} parent The parent node
     * @param {Ext.data.NodeInterface} node The appended node
     */
    onNodeAppend: function(parent, node) {
        this.registerNode(node, true);
    },

    /**
     * Fired when a node is removed from the root or one of it's children
     * @private
     * @param {Ext.data.NodeInterface} parent The parent node
     * @param {Ext.data.NodeInterface} node The removed node
     */
    onNodeRemove: function(parent, node) {
        this.unregisterNode(node, true);
    },

    /**
     * Fired when a node's id changes.  Updates the node's id in the node hash.
     * @private
     * @param {Ext.data.NodeInterface} node 
     * @param {Number} oldId The old id
     * @param {Number} newId The new id
     */
    onNodeIdChanged: function(node, oldId, newId) {
        var nodeHash = this.nodeHash;
    
        nodeHash[newId] = node;
        delete nodeHash[oldId || node.internalId];
    },

    /**
     * Gets a node in this tree by its id.
     * @param {String} id
     * @return {Ext.data.NodeInterface} The match node.
     */
    getNodeById : function(id) {
        return this.nodeHash[id];
    },

    /**
     * Registers a node with the tree
     * @private
     * @param {Ext.data.NodeInterface} The node to register
     * @param {Boolean} [includeChildren] True to unregister any child nodes
     */
    registerNode : function(node, includeChildren) {
        var me = this;

        me.nodeHash[node.getId() || node.internalId] = node;
        node.on('idchanged', me.onNodeIdChanged, me);
        if (includeChildren === true) {
            node.eachChild(function(child){
                me.registerNode(child, true);
            });
        }
    },

    /**
     * Unregisters a node with the tree
     * @private
     * @param {Ext.data.NodeInterface} The node to unregister
     * @param {Boolean} [includeChildren] True to unregister any child nodes
     */
    unregisterNode : function(node, includeChildren) {
        delete this.nodeHash[node.getId() || node.internalId];
        if (includeChildren === true) {
            node.eachChild(function(child){
                this.unregisterNode(child, true);
            }, this);
        }
    },

    /**
     * Sorts this tree
     * @private
     * @param {Function} sorterFn The function to use for sorting
     * @param {Boolean} recursive True to perform recursive sorting
     */
    sort: function(sorterFn, recursive) {
        this.getRootNode().sort(sorterFn, recursive);
    },

     /**
     * Filters this tree
     * @private
     * @param {Function} sorterFn The function to use for filtering
     * @param {Boolean} recursive True to perform recursive filtering
     */
    filter: function(filters, recursive) {
        this.getRootNode().filter(filters, recursive);
    }
});
/**
 * @author Ed Spencer
 * @class Ext.data.association.HasMany
 * 
 * <p>Represents a one-to-many relationship between two models. Usually created indirectly via a model definition:</p>
 * 
<pre><code>
Ext.define('Product', {
    extend: 'Ext.data.Model',
    fields: [
        {name: 'id',      type: 'int'},
        {name: 'user_id', type: 'int'},
        {name: 'name',    type: 'string'}
    ]
});

Ext.define('User', {
    extend: 'Ext.data.Model',
    fields: [
        {name: 'id',   type: 'int'},
        {name: 'name', type: 'string'}
    ],
    // we can use the hasMany shortcut on the model to create a hasMany association
    hasMany: {model: 'Product', name: 'products'}
});
</pre></code>
* 
 * <p>Above we created Product and User models, and linked them by saying that a User hasMany Products. This gives
 * us a new function on every User instance, in this case the function is called 'products' because that is the name
 * we specified in the association configuration above.</p>
 * 
 * <p>This new function returns a specialized {@link Ext.data.Store Store} which is automatically filtered to load
 * only Products for the given model instance:</p>
 * 
<pre><code>
//first, we load up a User with id of 1
var user = Ext.create('User', {id: 1, name: 'Ed'});

//the user.products function was created automatically by the association and returns a {@link Ext.data.Store Store}
//the created store is automatically scoped to the set of Products for the User with id of 1
var products = user.products();

//we still have all of the usual Store functions, for example it's easy to add a Product for this User
products.add({
    name: 'Another Product'
});

//saves the changes to the store - this automatically sets the new Product's user_id to 1 before saving
products.sync();
</code></pre>
 * 
 * <p>The new Store is only instantiated the first time you call products() to conserve memory and processing time,
 * though calling products() a second time returns the same store instance.</p>
 * 
 * <p><u>Custom filtering</u></p>
 * 
 * <p>The Store is automatically furnished with a filter - by default this filter tells the store to only return
 * records where the associated model's foreign key matches the owner model's primary key. For example, if a User
 * with ID = 100 hasMany Products, the filter loads only Products with user_id == 100.</p>
 * 
 * <p>Sometimes we want to filter by another field - for example in the case of a Twitter search application we may
 * have models for Search and Tweet:</p>
 * 
<pre><code>
Ext.define('Search', {
    extend: 'Ext.data.Model',
    fields: [
        'id', 'query'
    ],

    hasMany: {
        model: 'Tweet',
        name : 'tweets',
        filterProperty: 'query'
    }
});

Ext.define('Tweet', {
    extend: 'Ext.data.Model',
    fields: [
        'id', 'text', 'from_user'
    ]
});

//returns a Store filtered by the filterProperty
var store = new Search({query: 'Sencha Touch'}).tweets();
</code></pre>
 * 
 * <p>The tweets association above is filtered by the query property by setting the {@link #filterProperty}, and is
 * equivalent to this:</p>
 * 
<pre><code>
var store = Ext.create('Ext.data.Store', {
    model: 'Tweet',
    filters: [
        {
            property: 'query',
            value   : 'Sencha Touch'
        }
    ]
});
</code></pre>
 */
Ext.define('Ext.data.association.HasMany', {
    extend: 'Ext.data.association.Association',
    alternateClassName: 'Ext.data.HasManyAssociation',
    requires: ['Ext.util.Inflector'],

    alias: 'association.hasmany',

    /**
     * @cfg {String} foreignKey The name of the foreign key on the associated model that links it to the owner
     * model. Defaults to the lowercased name of the owner model plus "_id", e.g. an association with a where a
     * model called Group hasMany Users would create 'group_id' as the foreign key. When the remote store is loaded,
     * the store is automatically filtered so that only records with a matching foreign key are included in the 
     * resulting child store. This can be overridden by specifying the {@link #filterProperty}.
     * <pre><code>
Ext.define('Group', {
    extend: 'Ext.data.Model',
    fields: ['id', 'name'],
    hasMany: 'User'
});

Ext.define('User', {
    extend: 'Ext.data.Model',
    fields: ['id', 'name', 'group_id'], // refers to the id of the group that this user belongs to
    belongsTo: 'Group'
});
     * </code></pre>
     */
    
    /**
     * @cfg {String} name The name of the function to create on the owner model to retrieve the child store.
     * If not specified, the pluralized name of the child model is used.
     * <pre><code>
// This will create a users() method on any Group model instance
Ext.define('Group', {
    extend: 'Ext.data.Model',
    fields: ['id', 'name'],
    hasMany: 'User'
});
var group = new Group();
console.log(group.users());

// The method to retrieve the users will now be getUserList
Ext.define('Group', {
    extend: 'Ext.data.Model',
    fields: ['id', 'name'],
    hasMany: {model: 'User', name: 'getUserList'}
});
var group = new Group();
console.log(group.getUserList());
     * </code></pre>
     */
    
    /**
     * @cfg {Object} storeConfig Optional configuration object that will be passed to the generated Store. Defaults to 
     * undefined.
     */
    
    /**
     * @cfg {String} filterProperty Optionally overrides the default filter that is set up on the associated Store. If
     * this is not set, a filter is automatically created which filters the association based on the configured 
     * {@link #foreignKey}. See intro docs for more details. Defaults to undefined
     */
    
    /**
     * @cfg {Boolean} autoLoad True to automatically load the related store from a remote source when instantiated.
     * Defaults to <tt>false</tt>.
     */
    
    /**
     * @cfg {String} type The type configuration can be used when creating associations using a configuration object.
     * Use 'hasMany' to create a HasMany association
     * <pre><code>
associations: [{
    type: 'hasMany',
    model: 'User'
}]
     * </code></pre>
     */
    
    constructor: function(config) {
        var me = this,
            ownerProto,
            name;
            
        me.callParent(arguments);
        
        me.name = me.name || Ext.util.Inflector.pluralize(me.associatedName.toLowerCase());
        
        ownerProto = me.ownerModel.prototype;
        name = me.name;
        
        Ext.applyIf(me, {
            storeName : name + "Store",
            foreignKey: me.ownerName.toLowerCase() + "_id"
        });
        
        ownerProto[name] = me.createStore();
    },
    
    /**
     * @private
     * Creates a function that returns an Ext.data.Store which is configured to load a set of data filtered
     * by the owner model's primary key - e.g. in a hasMany association where Group hasMany Users, this function
     * returns a Store configured to return the filtered set of a single Group's Users.
     * @return {Function} The store-generating function
     */
    createStore: function() {
        var that            = this,
            associatedModel = that.associatedModel,
            storeName       = that.storeName,
            foreignKey      = that.foreignKey,
            primaryKey      = that.primaryKey,
            filterProperty  = that.filterProperty,
            autoLoad        = that.autoLoad,
            storeConfig     = that.storeConfig || {};
        
        return function() {
            var me = this,
                config, filter,
                modelDefaults = {};
                
            if (me[storeName] === undefined) {
                if (filterProperty) {
                    filter = {
                        property  : filterProperty,
                        value     : me.get(filterProperty),
                        exactMatch: true
                    };
                } else {
                    filter = {
                        property  : foreignKey,
                        value     : me.get(primaryKey),
                        exactMatch: true
                    };
                }
                
                modelDefaults[foreignKey] = me.get(primaryKey);
                
                config = Ext.apply({}, storeConfig, {
                    model        : associatedModel,
                    filters      : [filter],
                    remoteFilter : false,
                    modelDefaults: modelDefaults
                });
                
                me[storeName] = Ext.data.AbstractStore.create(config);
                if (autoLoad) {
                    me[storeName].load();
                }
            }
            
            return me[storeName];
        };
    },
    
    /**
     * Read associated data
     * @private
     * @param {Ext.data.Model} record The record we're writing to
     * @param {Ext.data.reader.Reader} reader The reader for the associated model
     * @param {Object} associationData The raw associated data
     */
    read: function(record, reader, associationData){
        var store = record[this.name](),
            inverse,
            items, iLen, i;
    
        store.add(reader.read(associationData).records);
    
        //now that we've added the related records to the hasMany association, set the inverse belongsTo
        //association on each of them if it exists
        inverse = this.associatedModel.prototype.associations.findBy(function(assoc){
            return assoc.type === 'belongsTo' && assoc.associatedName === record.$className;
        });
    
        //if the inverse association was found, set it now on each record we've just created
        if (inverse) {
            items = store.data.items;
            iLen  = items.length;

            for (i = 0; i < iLen; i++) {
                items[i][inverse.instanceName] = record;
            }
        }
    }
});
/**
 * @author Ed Spencer
 *
 * Proxies are used by {@link Ext.data.Store Stores} to handle the loading and saving of {@link Ext.data.Model Model}
 * data. Usually developers will not need to create or interact with proxies directly.
 *
 * # Types of Proxy
 *
 * There are two main types of Proxy - {@link Ext.data.proxy.Client Client} and {@link Ext.data.proxy.Server Server}.
 * The Client proxies save their data locally and include the following subclasses:
 *
 * - {@link Ext.data.proxy.LocalStorage LocalStorageProxy} - saves its data to localStorage if the browser supports it
 * - {@link Ext.data.proxy.SessionStorage SessionStorageProxy} - saves its data to sessionStorage if the browsers supports it
 * - {@link Ext.data.proxy.Memory MemoryProxy} - holds data in memory only, any data is lost when the page is refreshed
 *
 * The Server proxies save their data by sending requests to some remote server. These proxies include:
 *
 * - {@link Ext.data.proxy.Ajax Ajax} - sends requests to a server on the same domain
 * - {@link Ext.data.proxy.JsonP JsonP} - uses JSON-P to send requests to a server on a different domain
 * - {@link Ext.data.proxy.Rest Rest} - uses RESTful HTTP methods (GET/PUT/POST/DELETE) to communicate with server
 * - {@link Ext.data.proxy.Direct Direct} - uses {@link Ext.direct.Manager} to send requests
 *
 * Proxies operate on the principle that all operations performed are either Create, Read, Update or Delete. These four
 * operations are mapped to the methods {@link #create}, {@link #read}, {@link #update} and {@link #destroy}
 * respectively. Each Proxy subclass implements these functions.
 *
 * The CRUD methods each expect an {@link Ext.data.Operation Operation} object as the sole argument. The Operation
 * encapsulates information about the action the Store wishes to perform, the {@link Ext.data.Model model} instances
 * that are to be modified, etc. See the {@link Ext.data.Operation Operation} documentation for more details. Each CRUD
 * method also accepts a callback function to be called asynchronously on completion.
 *
 * Proxies also support batching of Operations via a {@link Ext.data.Batch batch} object, invoked by the {@link #batch}
 * method.
 */
Ext.define('Ext.data.proxy.Proxy', {
    alias: 'proxy.proxy',
    alternateClassName: ['Ext.data.DataProxy', 'Ext.data.Proxy'],

    uses: [
        'Ext.data.Batch',
        'Ext.data.Operation',
        'Ext.data.Model'
    ],

    mixins: {
        observable: 'Ext.util.Observable'
    },

    /**
     * @cfg {String} batchOrder
     * Comma-separated ordering 'create', 'update' and 'destroy' actions when batching. Override this to set a different
     * order for the batched CRUD actions to be executed in. Defaults to 'create,update,destroy'.
     */
    batchOrder: 'create,update,destroy',

    /**
     * @cfg {Boolean} batchActions
     * True to batch actions of a particular type when synchronizing the store. Defaults to true.
     */
    batchActions: true,

    /**
     * @cfg {String} defaultReaderType
     * The default registered reader type. Defaults to 'json'.
     * @private
     */
    defaultReaderType: 'json',

    /**
     * @cfg {String} defaultWriterType
     * The default registered writer type. Defaults to 'json'.
     * @private
     */
    defaultWriterType: 'json',

    /**
     * @cfg {String/Ext.data.Model} model
     * The name of the Model to tie to this Proxy. Can be either the string name of the Model, or a reference to the
     * Model constructor. Required.
     */

    /**
     * @cfg {Object/String/Ext.data.reader.Reader} reader
     * The Ext.data.reader.Reader to use to decode the server's response or data read from client. This can either be a
     * Reader instance, a config object or just a valid Reader type name (e.g. 'json', 'xml').
     */

    /**
     * @cfg {Object/String/Ext.data.writer.Writer} writer
     * The Ext.data.writer.Writer to use to encode any request sent to the server or saved to client. This can either be
     * a Writer instance, a config object or just a valid Writer type name (e.g. 'json', 'xml').
     */

    /**
     * @property {Boolean} isProxy
     * `true` in this class to identify an object as an instantiated Proxy, or subclass thereof.
     */
    isProxy: true,

    /**
     * Creates the Proxy
     * @param {Object} config (optional) Config object.
     */
    constructor: function(config) {
        config = config || {};

        if (config.model === undefined) {
            delete config.model;
        }

        this.mixins.observable.constructor.call(this, config);

        if (this.model !== undefined && !(this.model instanceof Ext.data.Model)) {
            this.setModel(this.model);
        }

        /**
         * @event metachange
         * Fires when this proxy's reader provides new metadata. Metadata usually consists
         * of new field definitions, but can include any configuration data required by an
         * application, and can be processed as needed in the event handler.
         * This event is currently only fired for JsonReaders. Note that this event is also
         * propagated by {@link Ext.data.Store}, which is typically where it would be handled.
         * @param {Ext.data.proxy.Proxy} this
         * @param {Object} meta The JSON metadata
         */
    },

    /**
     * Sets the model associated with this proxy. This will only usually be called by a Store
     *
     * @param {String/Ext.data.Model} model The new model. Can be either the model name string,
     * or a reference to the model's constructor
     * @param {Boolean} setOnStore Sets the new model on the associated Store, if one is present
     */
    setModel: function(model, setOnStore) {
        this.model = Ext.ModelManager.getModel(model);

        var reader = this.reader,
            writer = this.writer;

        this.setReader(reader);
        this.setWriter(writer);

        if (setOnStore && this.store) {
            this.store.setModel(this.model);
        }
    },

    /**
     * Returns the model attached to this Proxy
     * @return {Ext.data.Model} The model
     */
    getModel: function() {
        return this.model;
    },

    /**
     * Sets the Proxy's Reader by string, config object or Reader instance
     *
     * @param {String/Object/Ext.data.reader.Reader} reader The new Reader, which can be either a type string,
     * a configuration object or an Ext.data.reader.Reader instance
     * @return {Ext.data.reader.Reader} The attached Reader object
     */
    setReader: function(reader) {
        var me = this,
            needsCopy = true;

        if (reader === undefined || typeof reader == 'string') {
            reader = {
                type: reader
            };
            needsCopy = false;
        }

        if (reader.isReader) {
            reader.setModel(me.model);
        } else {
            if (needsCopy) {
                reader = Ext.apply({}, reader);
            }
            Ext.applyIf(reader, {
                proxy: me,
                model: me.model,
                type : me.defaultReaderType
            });

            reader = Ext.createByAlias('reader.' + reader.type, reader);
        }

        if (reader.onMetaChange) {
            reader.onMetaChange = Ext.Function.createSequence(reader.onMetaChange, this.onMetaChange, this);
        }

        me.reader = reader;
        return me.reader;
    },

    /**
     * Returns the reader currently attached to this proxy instance
     * @return {Ext.data.reader.Reader} The Reader instance
     */
    getReader: function() {
        return this.reader;
    },

    /**
     * @private
     * Called each time the reader's onMetaChange is called so that the proxy can fire the metachange event
     */
    onMetaChange: function(meta) {
        this.fireEvent('metachange', this, meta);
    },

    /**
     * Sets the Proxy's Writer by string, config object or Writer instance
     *
     * @param {String/Object/Ext.data.writer.Writer} writer The new Writer, which can be either a type string,
     * a configuration object or an Ext.data.writer.Writer instance
     * @return {Ext.data.writer.Writer} The attached Writer object
     */
    setWriter: function(writer) {
        var me = this,
            needsCopy = true;
            
        if (writer === undefined || typeof writer == 'string') {
            writer = {
                type: writer
            };
            needsCopy = false;
        }

        if (!writer.isWriter) {
            if (needsCopy) {
                writer = Ext.apply({}, writer);
            }
            Ext.applyIf(writer, {
                model: me.model,
                type : me.defaultWriterType
            });

            writer = Ext.createByAlias('writer.' + writer.type, writer);
        }

        me.writer = writer;

        return me.writer;
    },

    /**
     * Returns the writer currently attached to this proxy instance
     * @return {Ext.data.writer.Writer} The Writer instance
     */
    getWriter: function() {
        return this.writer;
    },

    /**
     * Performs the given create operation.
     * @param {Ext.data.Operation} operation The Operation to perform
     * @param {Function} callback Callback function to be called when the Operation has completed (whether
     * successful or not)
     * @param {Object} scope Scope to execute the callback function in
     * @method
     */
    create: Ext.emptyFn,

    /**
     * Performs the given read operation.
     * @param {Ext.data.Operation} operation The Operation to perform
     * @param {Function} callback Callback function to be called when the Operation has completed (whether
     * successful or not)
     * @param {Object} scope Scope to execute the callback function in
     * @method
     */
    read: Ext.emptyFn,

    /**
     * Performs the given update operation.
     * @param {Ext.data.Operation} operation The Operation to perform
     * @param {Function} callback Callback function to be called when the Operation has completed (whether
     * successful or not)
     * @param {Object} scope Scope to execute the callback function in
     * @method
     */
    update: Ext.emptyFn,

    /**
     * Performs the given destroy operation.
     * @param {Ext.data.Operation} operation The Operation to perform
     * @param {Function} callback Callback function to be called when the Operation has completed (whether
     * successful or not)
     * @param {Object} scope Scope to execute the callback function in
     * @method
     */
    destroy: Ext.emptyFn,

    /**
     * Performs a batch of {@link Ext.data.Operation Operations}, in the order specified by {@link #batchOrder}. Used
     * internally by {@link Ext.data.Store}'s {@link Ext.data.Store#sync sync} method. Example usage:
     *
     *     myProxy.batch({
     *         create : [myModel1, myModel2],
     *         update : [myModel3],
     *         destroy: [myModel4, myModel5]
     *     });
     *
     * Where the myModel* above are {@link Ext.data.Model Model} instances - in this case 1 and 2 are new instances and
     * have not been saved before, 3 has been saved previously but needs to be updated, and 4 and 5 have already been
     * saved but should now be destroyed.
     * 
     * Note that the previous version of this method took 2 arguments (operations and listeners). While this is still
     * supported for now, the current signature is now a single `options` argument that can contain both operations and
     * listeners, in addition to other options. The multi-argument signature will likely be deprecated in a future release.
     *
     * @param {Object} options Object containing one or more properties supported by the batch method:
     * 
     * @param {Object} options.operations Object containing the Model instances to act upon, keyed by action name
     * 
     * @param {Object} [options.listeners] Event listeners object passed straight through to the Batch -
     * see {@link Ext.data.Batch} for details
     * 
     * @param {Ext.data.Batch/Object} [options.batch] A {@link Ext.data.Batch} object (or batch config to apply 
     * to the created batch). If unspecified a default batch will be auto-created.
     * 
     * @param {Function} [options.callback] The function to be called upon completion of processing the batch.
     * The callback is called regardless of success or failure and is passed the following parameters:
     * @param {Ext.data.Batch} options.callback.batch The {@link Ext.data.Batch batch} that was processed,
     * containing all operations in their current state after processing
     * @param {Object} options.callback.options The options argument that was originally passed into batch
     * 
     * @param {Function} [options.success] The function to be called upon successful completion of the batch. The 
     * success function is called only if no exceptions were reported in any operations. If one or more exceptions
     * occurred then the `failure` function will be called instead. The success function is called 
     * with the following parameters:
     * @param {Ext.data.Batch} options.success.batch The {@link Ext.data.Batch batch} that was processed,
     * containing all operations in their current state after processing
     * @param {Object} options.success.options The options argument that was originally passed into batch
     * 
     * @param {Function} [options.failure] The function to be called upon unsuccessful completion of the batch. The 
     * failure function is called when one or more operations returns an exception during processing (even if some
     * operations were also successful). In this case you can check the batch's {@link Ext.data.Batch#exceptions
     * exceptions} array to see exactly which operations had exceptions. The failure function is called with the 
     * following parameters:
     * @param {Ext.data.Batch} options.failure.batch The {@link Ext.data.Batch batch} that was processed,
     * containing all operations in their current state after processing
     * @param {Object} options.failure.options The options argument that was originally passed into batch
     * 
     * @param {Object} [options.scope] The scope in which to execute any callbacks (i.e. the `this` object inside
     * the callback, success and/or failure functions). Defaults to the proxy.
     *
     * @return {Ext.data.Batch} The newly created Batch
     */
    batch: function(options, /* deprecated */listeners) {
        var me = this,
            useBatch = me.batchActions,
            batch,
            records,
            actions, aLen, action, a, r, rLen, record;

        if (options.operations === undefined) {
            // the old-style (operations, listeners) signature was called
            // so convert to the single options argument syntax
            options = {
                operations: options,
                listeners: listeners
            };
        }

        if (options.batch) {
            if (Ext.isDefined(options.batch.runOperation)) {
                batch = Ext.applyIf(options.batch, {
                    proxy: me,
                    listeners: {}
                });
            }
        } else {
            options.batch = {
                proxy: me,
                listeners: options.listeners || {}
            };
        }

        if (!batch) {
            batch = new Ext.data.Batch(options.batch);
        }

        batch.on('complete', Ext.bind(me.onBatchComplete, me, [options], 0));

        actions = me.batchOrder.split(',');
        aLen    = actions.length;

        for (a = 0; a < aLen; a++) {
            action  = actions[a];
            records = options.operations[action];

            if (records) {
                if (useBatch) {
                    batch.add(new Ext.data.Operation({
                        action  : action,
                        records : records
                    }));
                } else {
                    rLen = records.length;

                    for (r = 0; r < rLen; r++) {
                        record = records[r];

                        batch.add(new Ext.data.Operation({
                            action  : action,
                            records : [record]
                        }));
                    }
                }
            }
        }

        batch.start();
        return batch;
    },

    /**
     * @private
     * The internal callback that the proxy uses to call any specified user callbacks after completion of a batch
     */
    onBatchComplete: function(batchOptions, batch) {
        var scope = batchOptions.scope || this;

        if (batch.hasException) {
            if (Ext.isFunction(batchOptions.failure)) {
                Ext.callback(batchOptions.failure, scope, [batch, batchOptions]);
            }
        } else if (Ext.isFunction(batchOptions.success)) {
            Ext.callback(batchOptions.success, scope, [batch, batchOptions]);
        }

        if (Ext.isFunction(batchOptions.callback)) {
            Ext.callback(batchOptions.callback, scope, [batch, batchOptions]);
        }
    }
}, function() {
    //backwards compatibility
    Ext.data.DataProxy = this;
});

/**
 * @author Ed Spencer
 *
 * Base class for any client-side storage. Used as a superclass for {@link Ext.data.proxy.Memory Memory} and
 * {@link Ext.data.proxy.WebStorage Web Storage} proxies. Do not use directly, use one of the subclasses instead.
 * @private
 */
Ext.define('Ext.data.proxy.Client', {
    extend: 'Ext.data.proxy.Proxy',
    alternateClassName: 'Ext.data.ClientProxy',
    
    /**
     * @property {Boolean} isSynchronous
     * `true` in this class to identify that requests made on this proxy are
     * performed synchronously
     */
    isSynchronous: true,

    /**
     * Abstract function that must be implemented by each ClientProxy subclass. This should purge all record data
     * from the client side storage, as well as removing any supporting data (such as lists of record IDs)
     */
    clear: function() {
        Ext.Error.raise("The Ext.data.proxy.Client subclass that you are using has not defined a 'clear' function. See src/data/ClientProxy.js for details.");
    }
});
/**
 * @author Ed Spencer
 *
 * In-memory proxy. This proxy simply uses a local variable for data storage/retrieval, so its contents are lost on
 * every page refresh.
 *
 * Usually this Proxy isn't used directly, serving instead as a helper to a {@link Ext.data.Store Store} where a reader
 * is required to load data. For example, say we have a Store for a User model and have some inline data we want to
 * load, but this data isn't in quite the right format: we can use a MemoryProxy with a JsonReader to read it into our
 * Store:
 *
 *     //this is the model we will be using in the store
 *     Ext.define('User', {
 *         extend: 'Ext.data.Model',
 *         fields: [
 *             {name: 'id',    type: 'int'},
 *             {name: 'name',  type: 'string'},
 *             {name: 'phone', type: 'string', mapping: 'phoneNumber'}
 *         ]
 *     });
 *
 *     //this data does not line up to our model fields - the phone field is called phoneNumber
 *     var data = {
 *         users: [
 *             {
 *                 id: 1,
 *                 name: 'Ed Spencer',
 *                 phoneNumber: '555 1234'
 *             },
 *             {
 *                 id: 2,
 *                 name: 'Abe Elias',
 *                 phoneNumber: '666 1234'
 *             }
 *         ]
 *     };
 *
 *     //note how we set the 'root' in the reader to match the data structure above
 *     var store = Ext.create('Ext.data.Store', {
 *         autoLoad: true,
 *         model: 'User',
 *         data : data,
 *         proxy: {
 *             type: 'memory',
 *             reader: {
 *                 type: 'json',
 *                 root: 'users'
 *             }
 *         }
 *     });
 */
Ext.define('Ext.data.proxy.Memory', {
    extend: 'Ext.data.proxy.Client',
    alias: 'proxy.memory',
    alternateClassName: 'Ext.data.MemoryProxy',

    /**
     * @cfg {Object} data
     * Optional data to pass to configured Reader.
     */

    constructor: function(config) {
        this.callParent([config]);

        //ensures that the reader has been instantiated properly
        this.setReader(this.reader);
    },
    
    /**
     * @private
     * Fake processing function to commit the records, set the current operation
     * to successful and call the callback if provided. This function is shared
     * by the create, update and destroy methods to perform the bare minimum
     * processing required for the proxy to register a result from the action.
     */
    updateOperation: function(operation, callback, scope) {
        var i = 0,
            recs = operation.getRecords(),
            len = recs.length;
            
        for (i; i < len; i++) {
            recs[i].commit();
        }
        operation.setCompleted();
        operation.setSuccessful();
        
        Ext.callback(callback, scope || this, [operation]);
    },
    
    /**
     * Currently this is a hard-coded method that simply commits any records and sets the operation to successful,
     * then calls the callback function, if provided. It is essentially mocking a server call in memory, but since
     * there is no real back end in this case there's not much else to do. This method can be easily overridden to 
     * implement more complex logic if needed.
     * @param {Ext.data.Operation} operation The Operation to perform
     * @param {Function} callback Callback function to be called when the Operation has completed (whether
     * successful or not)
     * @param {Object} scope Scope to execute the callback function in
     * @method
     */
    create: function() {
        this.updateOperation.apply(this, arguments);
    },
    
    /**
     * Currently this is a hard-coded method that simply commits any records and sets the operation to successful,
     * then calls the callback function, if provided. It is essentially mocking a server call in memory, but since
     * there is no real back end in this case there's not much else to do. This method can be easily overridden to 
     * implement more complex logic if needed.
     * @param {Ext.data.Operation} operation The Operation to perform
     * @param {Function} callback Callback function to be called when the Operation has completed (whether
     * successful or not)
     * @param {Object} scope Scope to execute the callback function in
     * @method
     */
    update: function() {
        this.updateOperation.apply(this, arguments);
    },
    
    /**
     * Currently this is a hard-coded method that simply commits any records and sets the operation to successful,
     * then calls the callback function, if provided. It is essentially mocking a server call in memory, but since
     * there is no real back end in this case there's not much else to do. This method can be easily overridden to 
     * implement more complex logic if needed.
     * @param {Ext.data.Operation} operation The Operation to perform
     * @param {Function} callback Callback function to be called when the Operation has completed (whether
     * successful or not)
     * @param {Object} scope Scope to execute the callback function in
     * @method
     */
    destroy: function() {
        this.updateOperation.apply(this, arguments);
    },

    /**
     * Reads data from the configured {@link #data} object. Uses the Proxy's {@link #reader}, if present.
     * @param {Ext.data.Operation} operation The read Operation
     * @param {Function} callback The callback to call when reading has completed
     * @param {Object} scope The scope to call the callback function in
     */
    read: function(operation, callback, scope) {
        var me = this;

        operation.resultSet = me.getReader().read(me.data);

        operation.setCompleted();
        operation.setSuccessful();
        Ext.callback(callback, scope || me, [operation]);
    },

    clear: Ext.emptyFn
});

/**
 * @author Ed Spencer
 *
 * ServerProxy is a superclass of {@link Ext.data.proxy.JsonP JsonPProxy} and {@link Ext.data.proxy.Ajax AjaxProxy}, and
 * would not usually be used directly.
 *
 * ServerProxy should ideally be named HttpProxy as it is a superclass for all HTTP proxies - for Ext JS 4.x it has been
 * called ServerProxy to enable any 3.x applications that reference the HttpProxy to continue to work (HttpProxy is now
 * an alias of AjaxProxy).
 * @private
 */
Ext.define('Ext.data.proxy.Server', {
    extend: 'Ext.data.proxy.Proxy',
    alias : 'proxy.server',
    alternateClassName: 'Ext.data.ServerProxy',
    uses  : ['Ext.data.Request'],

    /**
     * @cfg {String} url
     * The URL from which to request the data object.
     */

    /**
     * @cfg {String} pageParam
     * The name of the 'page' parameter to send in a request. Defaults to 'page'. Set this to undefined if you don't
     * want to send a page parameter.
     */
    pageParam: 'page',

    /**
     * @cfg {String} startParam
     * The name of the 'start' parameter to send in a request. Defaults to 'start'. Set this to undefined if you don't
     * want to send a start parameter.
     */
    startParam: 'start',

    /**
     * @cfg {String} limitParam
     * The name of the 'limit' parameter to send in a request. Defaults to 'limit'. Set this to undefined if you don't
     * want to send a limit parameter.
     */
    limitParam: 'limit',

    /**
     * @cfg {String} groupParam
     * The name of the 'group' parameter to send in a request. Defaults to 'group'. Set this to undefined if you don't
     * want to send a group parameter.
     */
    groupParam: 'group',

    /**
     * @cfg {String} groupDirectionParam
     * The name of the direction parameter to send in a request. **This is only used when simpleGroupMode is set to
     * true.** Defaults to 'groupDir'.
     */
    groupDirectionParam: 'groupDir',

    /**
     * @cfg {String} sortParam
     * The name of the 'sort' parameter to send in a request. Defaults to 'sort'. Set this to undefined if you don't
     * want to send a sort parameter.
     */
    sortParam: 'sort',

    /**
     * @cfg {String} filterParam
     * The name of the 'filter' parameter to send in a request. Defaults to 'filter'. Set this to undefined if you don't
     * want to send a filter parameter.
     */
    filterParam: 'filter',

    /**
     * @cfg {String} directionParam
     * The name of the direction parameter to send in a request. **This is only used when simpleSortMode is set to
     * true.** Defaults to 'dir'.
     */
    directionParam: 'dir',

    /**
     * @cfg {Boolean} simpleSortMode
     * Enabling simpleSortMode in conjunction with remoteSort will only send one sort property and a direction when a
     * remote sort is requested. The {@link #directionParam} and {@link #sortParam} will be sent with the property name
     * and either 'ASC' or 'DESC'.
     */
    simpleSortMode: false,

    /**
     * @cfg {Boolean} simpleGroupMode
     * Enabling simpleGroupMode in conjunction with remoteGroup will only send one group property and a direction when a
     * remote group is requested. The {@link #groupDirectionParam} and {@link #groupParam} will be sent with the property name and either 'ASC'
     * or 'DESC'.
     */
    simpleGroupMode: false,

    /**
     * @cfg {Boolean} noCache
     * Disable caching by adding a unique parameter name to the request. Set to false to allow caching. Defaults to true.
     */
    noCache : true,

    /**
     * @cfg {String} cacheString
     * The name of the cache param added to the url when using noCache. Defaults to "_dc".
     */
    cacheString: "_dc",

    /**
     * @cfg {Number} timeout
     * The number of milliseconds to wait for a response. Defaults to 30000 milliseconds (30 seconds).
     */
    timeout : 30000,

    /**
     * @cfg {Object} api
     * Specific urls to call on CRUD action methods "create", "read", "update" and "destroy". Defaults to:
     *
     *     api: {
     *         create  : undefined,
     *         read    : undefined,
     *         update  : undefined,
     *         destroy : undefined
     *     }
     *
     * The url is built based upon the action being executed [create|read|update|destroy] using the commensurate
     * {@link #api} property, or if undefined default to the configured
     * {@link Ext.data.Store}.{@link Ext.data.proxy.Server#url url}.
     *
     * For example:
     *
     *     api: {
     *         create  : '/controller/new',
     *         read    : '/controller/load',
     *         update  : '/controller/update',
     *         destroy : '/controller/destroy_action'
     *     }
     *
     * If the specific URL for a given CRUD action is undefined, the CRUD action request will be directed to the
     * configured {@link Ext.data.proxy.Server#url url}.
     */

    constructor: function(config) {
        var me = this;

        config = config || {};
        /**
         * @event exception
         * Fires when the server returns an exception
         * @param {Ext.data.proxy.Proxy} this
         * @param {Object} response The response from the AJAX request
         * @param {Ext.data.Operation} operation The operation that triggered request
         */
        me.callParent([config]);

        /**
         * @cfg {Object} extraParams
         * Extra parameters that will be included on every request. Individual requests with params of the same name
         * will override these params when they are in conflict.
         */
        me.extraParams = config.extraParams || {};

        me.api = Ext.apply({}, config.api || me.api);
        

        //backwards compatibility, will be deprecated in 5.0
        me.nocache = me.noCache;
    },

    //in a ServerProxy all four CRUD operations are executed in the same manner, so we delegate to doRequest in each case
    create: function() {
        return this.doRequest.apply(this, arguments);
    },

    read: function() {
        return this.doRequest.apply(this, arguments);
    },

    update: function() {
        return this.doRequest.apply(this, arguments);
    },

    destroy: function() {
        return this.doRequest.apply(this, arguments);
    },

    /**
     * Sets a value in the underlying {@link #extraParams}.
     * @param {String} name The key for the new value
     * @param {Object} value The value
     */
    setExtraParam: function(name, value) {
        this.extraParams[name] = value;
    },

    /**
     * Creates an {@link Ext.data.Request Request} object from {@link Ext.data.Operation Operation}.
     *
     * This gets called from doRequest methods in subclasses of Server proxy.
     * 
     * @param {Ext.data.Operation} operation The operation to execute
     * @return {Ext.data.Request} The request object
     */
    buildRequest: function(operation) {
        var me = this,
            params = Ext.applyIf(operation.params || {}, me.extraParams || {}),
            request;

        //copy any sorters, filters etc into the params so they can be sent over the wire
        params = Ext.applyIf(params, me.getParams(operation));

        if (operation.id !== undefined && params.id === undefined) {
            params.id = operation.id;
        }

        request = new Ext.data.Request({
            params   : params,
            action   : operation.action,
            records  : operation.records,
            operation: operation,
            url      : operation.url,

            // this is needed by JsonSimlet in order to properly construct responses for
            // requests from this proxy
            proxy: me
        });

        request.url = me.buildUrl(request);

        /*
         * Save the request on the Operation. Operations don't usually care about Request and Response data, but in the
         * ServerProxy and any of its subclasses we add both request and response as they may be useful for further processing
         */
        operation.request = request;

        return request;
    },

    // Should this be documented as protected method?
    processResponse: function(success, operation, request, response, callback, scope) {
        var me = this,
            reader,
            result;

        if (success === true) {
            reader = me.getReader();

            // Apply defaults to incoming data only for read operations.
            // For create and update, there will already be a client-side record
            // to match with which will contain any defaulted in values.
            reader.applyDefaults = operation.action === 'read';

            result = reader.read(me.extractResponseData(response));

            if (result.success !== false) {
                //see comment in buildRequest for why we include the response object here
                Ext.apply(operation, {
                    response: response,
                    resultSet: result
                });

                operation.commitRecords(result.records);
                operation.setCompleted();
                operation.setSuccessful();
            } else {
                operation.setException(result.message);
                me.fireEvent('exception', this, response, operation);
            }
        } else {
            me.setException(operation, response);
            me.fireEvent('exception', this, response, operation);
        }

        //this callback is the one that was passed to the 'read' or 'write' function above
        if (typeof callback == 'function') {
            callback.call(scope || me, operation);
        }

        me.afterRequest(request, success);
    },

    /**
     * Sets up an exception on the operation
     * @private
     * @param {Ext.data.Operation} operation The operation
     * @param {Object} response The response
     */
    setException: function(operation, response) {
        operation.setException({
            status: response.status,
            statusText: response.statusText
        });
    },

    /**
     * Template method to allow subclasses to specify how to get the response for the reader.
     * @template
     * @private
     * @param {Object} response The server response
     * @return {Object} The response data to be used by the reader
     */
    extractResponseData: function(response) {
        return response;
    },

    /**
     * Encode any values being sent to the server. Can be overridden in subclasses.
     * @private
     * @param {Array} An array of sorters/filters.
     * @return {Object} The encoded value
     */
    applyEncoding: function(value) {
        return Ext.encode(value);
    },

    /**
     * Encodes the array of {@link Ext.util.Sorter} objects into a string to be sent in the request url. By default,
     * this simply JSON-encodes the sorter data
     * @param {Ext.util.Sorter[]} sorters The array of {@link Ext.util.Sorter Sorter} objects
     * @return {String} The encoded sorters
     */
    encodeSorters: function(sorters) {
        var min = [],
            length = sorters.length,
            i = 0;

        for (; i < length; i++) {
            min[i] = {
                property : sorters[i].property,
                direction: sorters[i].direction
            };
        }
        return this.applyEncoding(min);

    },

    /**
     * Encodes the array of {@link Ext.util.Filter} objects into a string to be sent in the request url. By default,
     * this simply JSON-encodes the filter data
     * @param {Ext.util.Filter[]} filters The array of {@link Ext.util.Filter Filter} objects
     * @return {String} The encoded filters
     */
    encodeFilters: function(filters) {
        var min = [],
            length = filters.length,
            i = 0;

        for (; i < length; i++) {
            min[i] = {
                property: filters[i].property,
                value   : filters[i].value
            };
        }
        return this.applyEncoding(min);
    },

    /**
     * @private
     * Copy any sorters, filters etc into the params so they can be sent over the wire
     */
    getParams: function(operation) {
        var me = this,
            params = {},
            isDef = Ext.isDefined,
            groupers = operation.groupers,
            sorters = operation.sorters,
            filters = operation.filters,
            page = operation.page,
            start = operation.start,
            limit = operation.limit,
            simpleSortMode = me.simpleSortMode,
            simpleGroupMode = me.simpleGroupMode,
            pageParam = me.pageParam,
            startParam = me.startParam,
            limitParam = me.limitParam,
            groupParam = me.groupParam,
            groupDirectionParam = me.groupDirectionParam,
            sortParam = me.sortParam,
            filterParam = me.filterParam,
            directionParam = me.directionParam;

        if (pageParam && isDef(page)) {
            params[pageParam] = page;
        }

        if (startParam && isDef(start)) {
            params[startParam] = start;
        }

        if (limitParam && isDef(limit)) {
            params[limitParam] = limit;
        }

        if (groupParam && groupers && groupers.length > 0) {
            // Grouper is a subclass of sorter, so we can just use the sorter method
            if (simpleGroupMode) {
                params[groupParam] = groupers[0].property;
                params[groupDirectionParam] = groupers[0].direction || 'ASC';
            } else {
                params[groupParam] = me.encodeSorters(groupers);
            }
        }

        if (sortParam && sorters && sorters.length > 0) {
            if (simpleSortMode) {
                params[sortParam] = sorters[0].property;
                params[directionParam] = sorters[0].direction;
            } else {
                params[sortParam] = me.encodeSorters(sorters);
            }

        }

        if (filterParam && filters && filters.length > 0) {
            params[filterParam] = me.encodeFilters(filters);
        }

        return params;
    },

    /**
     * Generates a url based on a given Ext.data.Request object. By default, ServerProxy's buildUrl will add the
     * cache-buster param to the end of the url. Subclasses may need to perform additional modifications to the url.
     * @param {Ext.data.Request} request The request object
     * @return {String} The url
     */
    buildUrl: function(request) {
        var me = this,
            url = me.getUrl(request);

        if (!url) {
            Ext.Error.raise("You are using a ServerProxy but have not supplied it with a url.");
        }

        if (me.noCache) {
            url = Ext.urlAppend(url, Ext.String.format("{0}={1}", me.cacheString, Ext.Date.now()));
        }

        return url;
    },

    /**
     * Get the url for the request taking into account the order of priority,
     * - The request
     * - The api
     * - The url
     * @private
     * @param {Ext.data.Request} request The request
     * @return {String} The url
     */
    getUrl: function(request) {
        return request.url || this.api[request.action] || this.url;
    },

    /**
     * In ServerProxy subclasses, the {@link #create}, {@link #read}, {@link #update} and {@link #destroy} methods all
     * pass through to doRequest. Each ServerProxy subclass must implement the doRequest method - see {@link
     * Ext.data.proxy.JsonP} and {@link Ext.data.proxy.Ajax} for examples. This method carries the same signature as
     * each of the methods that delegate to it.
     *
     * @param {Ext.data.Operation} operation The Ext.data.Operation object
     * @param {Function} callback The callback function to call when the Operation has completed
     * @param {Object} scope The scope in which to execute the callback
     */
    doRequest: function(operation, callback, scope) {
        Ext.Error.raise("The doRequest function has not been implemented on your Ext.data.proxy.Server subclass. See src/data/ServerProxy.js for details");
    },

    /**
     * Optional callback function which can be used to clean up after a request has been completed.
     * @param {Ext.data.Request} request The Request object
     * @param {Boolean} success True if the request was successful
     * @protected
     * @template
     * @method
     */
    afterRequest: Ext.emptyFn,

    onDestroy: function() {
        Ext.destroy(this.reader, this.writer);
    }
});

/**
 * @author Ed Spencer
 *
 * The JsonP proxy is useful when you need to load data from a domain other than the one your application is running on. If
 * your application is running on http://domainA.com it cannot use {@link Ext.data.proxy.Ajax Ajax} to load its data
 * from http://domainB.com because cross-domain ajax requests are prohibited by the browser.
 *
 * We can get around this using a JsonP proxy. JsonP proxy injects a `<script>` tag into the DOM whenever an AJAX request
 * would usually be made. Let's say we want to load data from http://domainB.com/users - the script tag that would be
 * injected might look like this:
 *
 *     <script src="http://domainB.com/users?callback=someCallback"></script>
 *
 * When we inject the tag above, the browser makes a request to that url and includes the response as if it was any
 * other type of JavaScript include. By passing a callback in the url above, we're telling domainB's server that we want
 * to be notified when the result comes in and that it should call our callback function with the data it sends back. So
 * long as the server formats the response to look like this, everything will work:
 *
 *     someCallback({
 *         users: [
 *             {
 *                 id: 1,
 *                 name: "Ed Spencer",
 *                 email: "ed@sencha.com"
 *             }
 *         ]
 *     });
 *
 * As soon as the script finishes loading, the 'someCallback' function that we passed in the url is called with the JSON
 * object that the server returned.
 *
 * JsonP proxy takes care of all of this automatically. It formats the url you pass, adding the callback parameter
 * automatically. It even creates a temporary callback function, waits for it to be called and then puts the data into
 * the Proxy making it look just like you loaded it through a normal {@link Ext.data.proxy.Ajax AjaxProxy}. Here's how
 * we might set that up:
 *
 *     Ext.define('User', {
 *         extend: 'Ext.data.Model',
 *         fields: ['id', 'name', 'email']
 *     });
 *
 *     var store = Ext.create('Ext.data.Store', {
 *         model: 'User',
 *         proxy: {
 *             type: 'jsonp',
 *             url : 'http://domainB.com/users'
 *         }
 *     });
 *
 *     store.load();
 *
 * That's all we need to do - JsonP proxy takes care of the rest. In this case the Proxy will have injected a script tag
 * like this:
 *
 *     <script src="http://domainB.com/users?callback=callback1"></script>
 *
 * # Customization
 *
 * This script tag can be customized using the {@link #callbackKey} configuration. For example:
 *
 *     var store = Ext.create('Ext.data.Store', {
 *         model: 'User',
 *         proxy: {
 *             type: 'jsonp',
 *             url : 'http://domainB.com/users',
 *             callbackKey: 'theCallbackFunction'
 *         }
 *     });
 *
 *     store.load();
 *
 * Would inject a script tag like this:
 *
 *     <script src="http://domainB.com/users?theCallbackFunction=callback1"></script>
 *
 * # Implementing on the server side
 *
 * The remote server side needs to be configured to return data in this format. Here are suggestions for how you might
 * achieve this using Java, PHP and ASP.net:
 *
 * Java:
 *
 *     boolean jsonP = false;
 *     String cb = request.getParameter("callback");
 *     if (cb != null) {
 *         jsonP = true;
 *         response.setContentType("text/javascript");
 *     } else {
 *         response.setContentType("application/x-json");
 *     }
 *     Writer out = response.getWriter();
 *     if (jsonP) {
 *         out.write(cb + "(");
 *     }
 *     out.print(dataBlock.toJsonString());
 *     if (jsonP) {
 *         out.write(");");
 *     }
 *
 * PHP:
 *
 *     $callback = $_REQUEST['callback'];
 *
 *     // Create the output object.
 *     $output = array('a' => 'Apple', 'b' => 'Banana');
 *
 *     //start output
 *     if ($callback) {
 *         header('Content-Type: text/javascript');
 *         echo $callback . '(' . json_encode($output) . ');';
 *     } else {
 *         header('Content-Type: application/x-json');
 *         echo json_encode($output);
 *     }
 *
 * ASP.net:
 *
 *     String jsonString = "{success: true}";
 *     String cb = Request.Params.Get("callback");
 *     String responseString = "";
 *     if (!String.IsNullOrEmpty(cb)) {
 *         responseString = cb + "(" + jsonString + ")";
 *     } else {
 *         responseString = jsonString;
 *     }
 *     Response.Write(responseString);
 */
Ext.define('Ext.data.proxy.JsonP', {
    extend: 'Ext.data.proxy.Server',
    alternateClassName: 'Ext.data.ScriptTagProxy',
    alias: ['proxy.jsonp', 'proxy.scripttag'],
    requires: ['Ext.data.JsonP'],

    defaultWriterType: 'base',

    /**
     * @cfg {String} callbackKey
     * See {@link Ext.data.JsonP#callbackKey}.
     */
    callbackKey : 'callback',

    /**
     * @cfg {String} recordParam
     * The param name to use when passing records to the server (e.g. 'records=someEncodedRecordString'). Defaults to
     * 'records'
     */
    recordParam: 'records',

    /**
     * @cfg {Boolean} autoAppendParams
     * True to automatically append the request's params to the generated url. Defaults to true
     */
    autoAppendParams: true,

    constructor: function(){
        this.addEvents(
            /**
             * @event
             * Fires when the server returns an exception
             * @param {Ext.data.proxy.Proxy} this
             * @param {Ext.data.Request} request The request that was sent
             * @param {Ext.data.Operation} operation The operation that triggered the request
             */
            'exception'
        );
        this.callParent(arguments);
    },

    /**
     * @private
     * Performs the read request to the remote domain. JsonP proxy does not actually create an Ajax request,
     * instead we write out a `<script>` tag based on the configuration of the internal Ext.data.Request object
     * @param {Ext.data.Operation} operation The {@link Ext.data.Operation Operation} object to execute
     * @param {Function} callback A callback function to execute when the Operation has been completed
     * @param {Object} scope The scope to execute the callback in
     */
    doRequest: function(operation, callback, scope) {
        //generate the unique IDs for this request
        var me      = this,
            writer  = me.getWriter(),
            request = me.buildRequest(operation),
            params = request.params;

        if (operation.allowWrite()) {
            request = writer.write(request);
        }

        // apply JsonP proxy-specific attributes to the Request
        Ext.apply(request, {
            callbackKey: me.callbackKey,
            timeout: me.timeout,
            scope: me,
            disableCaching: false, // handled by the proxy
            callback: me.createRequestCallback(request, operation, callback, scope)
        });

        // prevent doubling up
        if (me.autoAppendParams) {
            request.params = {};
        }

        request.jsonp = Ext.data.JsonP.request(request);
        // restore on the request
        request.params = params;
        operation.setStarted();
        me.lastRequest = request;

        return request;
    },

    /**
     * @private
     * Creates and returns the function that is called when the request has completed. The returned function
     * should accept a Response object, which contains the response to be read by the configured Reader.
     * The third argument is the callback that should be called after the request has been completed and the Reader has decoded
     * the response. This callback will typically be the callback passed by a store, e.g. in proxy.read(operation, theCallback, scope)
     * theCallback refers to the callback argument received by this function.
     * See {@link #doRequest} for details.
     * @param {Ext.data.Request} request The Request object
     * @param {Ext.data.Operation} operation The Operation being executed
     * @param {Function} callback The callback function to be called when the request completes. This is usually the callback
     * passed to doRequest
     * @param {Object} scope The scope in which to execute the callback function
     * @return {Function} The callback function
     */
    createRequestCallback: function(request, operation, callback, scope) {
        var me = this;

        return function(success, response, errorType) {
            delete me.lastRequest;
            me.processResponse(success, operation, request, response, callback, scope);
        };
    },

    // inherit docs
    setException: function(operation, response) {
        operation.setException(operation.request.jsonp.errorType);
    },


    /**
     * Generates a url based on a given Ext.data.Request object. Adds the params and callback function name to the url
     * @param {Ext.data.Request} request The request object
     * @return {String} The url
     */
    buildUrl: function(request) {
        var me      = this,
            url     = me.callParent(arguments),
            params  = Ext.apply({}, request.params),
            filters = params.filters,
            records,
            filter, i;

        delete params.filters;

        if (me.autoAppendParams) {
            url = Ext.urlAppend(url, Ext.Object.toQueryString(params));
        }

        if (filters && filters.length) {
            for (i = 0; i < filters.length; i++) {
                filter = filters[i];

                if (filter.value) {
                    url = Ext.urlAppend(url, filter.property + "=" + filter.value);
                }
            }
        }

        //if there are any records present, append them to the url also
        records = request.records;

        if (Ext.isArray(records) && records.length > 0) {
            url = Ext.urlAppend(url, Ext.String.format("{0}={1}", me.recordParam, me.encodeRecords(records)));
        }

        return url;
    },

    //inherit docs
    destroy: function() {
        this.abort();
        this.callParent(arguments);
    },

    /**
     * Aborts the current server request if one is currently running
     */
    abort: function() {
        var lastRequest = this.lastRequest;
        if (lastRequest) {
            Ext.data.JsonP.abort(lastRequest.jsonp);
        }
    },

    /**
     * Encodes an array of records into a string suitable to be appended to the script src url. This is broken out into
     * its own function so that it can be easily overridden.
     * @param {Ext.data.Model[]} records The records array
     * @return {String} The encoded records string
     */
    encodeRecords: function(records) {
        var encoded = "",
            i = 0,
            len = records.length;

        for (; i < len; i++) {
            encoded += Ext.Object.toQueryString(records[i].getData());
        }

        return encoded;
    }
});

/**
 * @author Ed Spencer
 *
 * WebStorageProxy is simply a superclass for the {@link Ext.data.proxy.LocalStorage LocalStorage} and {@link
 * Ext.data.proxy.SessionStorage SessionStorage} proxies. It uses the new HTML5 key/value client-side storage objects to
 * save {@link Ext.data.Model model instances} for offline use.
 * @private
 */
Ext.define('Ext.data.proxy.WebStorage', {
    extend: 'Ext.data.proxy.Client',
    alternateClassName: 'Ext.data.WebStorageProxy',
    requires: [
        'Ext.data.SequentialIdGenerator'
    ],

    /**
     * @cfg {String} id
     * The unique ID used as the key in which all record data are stored in the local storage object.
     */
    id: undefined,

    /**
     * Creates the proxy, throws an error if local storage is not supported in the current browser.
     * @param {Object} config (optional) Config object.
     */
    constructor: function(config) {
        this.callParent(arguments);

        /**
         * @property {Object} cache
         * Cached map of records already retrieved by this Proxy. Ensures that the same instance is always retrieved.
         */
        this.cache = {};

        if (this.getStorageObject() === undefined) {
            Ext.Error.raise("Local Storage is not supported in this browser, please use another type of data proxy");
        }

        //if an id is not given, try to use the store's id instead
        this.id = this.id || (this.store ? this.store.storeId : undefined);

        if (this.id === undefined) {
            Ext.Error.raise("No unique id was provided to the local storage proxy. See Ext.data.proxy.LocalStorage documentation for details");
        }

        this.initialize();
    },

    //inherit docs
    create: function(operation, callback, scope) {
        var me = this,
            records = operation.records,
            length = records.length,
            ids = me.getIds(),
            id, record, i;

        operation.setStarted();

        if(me.isHierarchical === undefined) {
            // if the storage object does not yet contain any data, this is the first point at which we can determine whether or not this proxy deals with hierarchical data.
            // it cannot be determined during initialization because the Model is not decorated with NodeInterface until it is used in a TreeStore
            me.isHierarchical = !!records[0].isNode;
            if(me.isHierarchical) {
                me.getStorageObject().setItem(me.getTreeKey(), true);
            }
        }

        for (i = 0; i < length; i++) {
            record = records[i];

            if (record.phantom) {
                record.phantom = false;
                id = me.getNextId();
            } else {
                id = record.getId();
            }

            me.setRecord(record, id);
            record.commit();
            ids.push(id);
        }

        me.setIds(ids);

        operation.setCompleted();
        operation.setSuccessful();

        if (typeof callback == 'function') {
            callback.call(scope || me, operation);
        }
    },

    //inherit docs
    read: function(operation, callback, scope) {
        //TODO: respect sorters, filters, start and limit options on the Operation

        var me = this,
            records = [],
            i = 0,
            success = true,
            Model = me.model,
            ids, length, record, data, id;

        operation.setStarted();

        if(me.isHierarchical) {
            records = me.getTreeData();
        } else {
            ids = me.getIds();
            length = ids.length;
            id = operation.id;
            //read a single record
            if (id) {
                data = me.getRecord(id);
                if (data !== null) {
                    record = new Model(data, id, data);
                }

                if (record) {
                    records.push(record);
                } else {
                    success = false;
                }
            } else {
                for (; i < length; i++) {
                    id = ids[i];
                    data = me.getRecord(id);
                    records.push(new Model(data, id, data));
                }
            }

        }

        if(success) {
            operation.setSuccessful();
        }
        operation.setCompleted();

        operation.resultSet = Ext.create('Ext.data.ResultSet', {
            records: records,
            total  : records.length,
            loaded : true
        });

        if (typeof callback == 'function') {
            callback.call(scope || me, operation);
        }
    },

    //inherit docs
    update: function(operation, callback, scope) {
        var records = operation.records,
            length  = records.length,
            ids     = this.getIds(),
            record, id, i;

        operation.setStarted();

        for (i = 0; i < length; i++) {
            record = records[i];
            this.setRecord(record);
            record.commit();

            //we need to update the set of ids here because it's possible that a non-phantom record was added
            //to this proxy - in which case the record's id would never have been added via the normal 'create' call
            id = record.getId();
            if (id !== undefined && Ext.Array.indexOf(ids, id) == -1) {
                ids.push(id);
            }
        }
        this.setIds(ids);

        operation.setCompleted();
        operation.setSuccessful();

        if (typeof callback == 'function') {
            callback.call(scope || this, operation);
        }
    },

    //inherit
    destroy: function(operation, callback, scope) {
        var me = this,
            records = operation.records,
            ids = me.getIds(),
            idLength = ids.length,
            newIds = [],
            removedHash = {},
            i = records.length,
            id;

        operation.setStarted();

        for (; i--;) {
            Ext.apply(removedHash, me.removeRecord(records[i]));
        }

        for(i = 0; i < idLength; i++) {
            id = ids[i];
            if(!removedHash[id]) {
                newIds.push(id);
            }
        }

        me.setIds(newIds);

        operation.setCompleted();
        operation.setSuccessful();

        if (typeof callback == 'function') {
            callback.call(scope || me, operation);
        }
    },

    /**
     * @private
     * Fetches record data from the Proxy by ID.
     * @param {String} id The record's unique ID
     * @return {Object} The record data
     */
    getRecord: function(id) {
        var me = this,
            cache = me.cache,
            data = !cache[id] ? Ext.decode(me.getStorageObject().getItem(me.getRecordKey(id))) : cache[id];

        if(!data) {
            return null;
        }

        cache[id] = data;
        data[me.model.prototype.idProperty] = id;

        return data;
    },

    /**
     * Saves the given record in the Proxy.
     * @param {Ext.data.Model} record The model instance
     * @param {String} [id] The id to save the record under (defaults to the value of the record's getId() function)
     */
    setRecord: function(record, id) {
        if (id) {
            record.setId(id);
        } else {
            id = record.getId();
        }

        var me = this,
            rawData = record.data,
            data    = {},
            model   = me.model,
            fields  = model.prototype.fields.items,
            length  = fields.length,
            i = 0,
            field, name, obj, key;

        for (; i < length; i++) {
            field = fields[i];
            name  = field.name;

            if(field.persist) {
                data[name] = rawData[name];
            }
        }

        // no need to store the id in the data, since it is already stored in the record key
        delete data[me.model.prototype.idProperty];

        // if the record is a tree node and it's a direct child of the root node, do not store the parentId
        if(record.isNode && record.get('depth') === 1) {
            delete data.parentId;
        }

        obj = me.getStorageObject();
        key = me.getRecordKey(id);

        //keep the cache up to date
        me.cache[id] = data;

        //iPad bug requires that we remove the item before setting it
        obj.removeItem(key);
        obj.setItem(key, Ext.encode(data));
    },

    /**
     * @private
     * Physically removes a given record from the local storage and recursively removes children if the record is a tree node. Used internally by {@link #destroy}.
     * @param {Ext.data.Model} record The record to remove
     * @return {Object} a hash with the ids of the records that were removed as keys and the records that were removed as values
     */
    removeRecord: function(record) {
        var me = this,
            id = record.getId(),
            records = {},
            i, childNodes;

        records[id] = record;
        me.getStorageObject().removeItem(me.getRecordKey(id));
        delete me.cache[id];

        if(record.childNodes) {
            childNodes = record.childNodes;
            for(i = childNodes.length; i--;) {
                Ext.apply(records, me.removeRecord(childNodes[i]));
            }
        }

        return records;
    },

    /**
     * @private
     * Given the id of a record, returns a unique string based on that id and the id of this proxy. This is used when
     * storing data in the local storage object and should prevent naming collisions.
     * @param {String/Number/Ext.data.Model} id The record id, or a Model instance
     * @return {String} The unique key for this record
     */
    getRecordKey: function(id) {
        if (id.isModel) {
            id = id.getId();
        }

        return Ext.String.format("{0}-{1}", this.id, id);
    },

    /**
     * @private
     * Returns the unique key used to store the current record counter for this proxy. This is used internally when
     * realizing models (creating them when they used to be phantoms), in order to give each model instance a unique id.
     * @return {String} The counter key
     */
    getRecordCounterKey: function() {
        return Ext.String.format("{0}-counter", this.id);
    },

    /**
     * @private
     * Returns the unique key used to store the tree indicator. This is used internally to determine if the stored data is hierarchical
     * @return {String} The counter key
     */
    getTreeKey: function() {
        return Ext.String.format("{0}-tree", this.id);
    },

    /**
     * @private
     * Returns the array of record IDs stored in this Proxy
     * @return {Number[]} The record IDs. Each is cast as a Number
     */
    getIds: function() {
        var me = this,
            ids = (me.getStorageObject().getItem(me.id) || "").split(","),
            model = me.model,
            length = ids.length,
            isString = model.prototype.fields.get(model.prototype.idProperty).type.type === 'string',
            i;

        if (length == 1 && ids[0] === "") {
            ids = [];
        } else {
            for (i = 0; i < length; i++) {
                ids[i] = isString ? ids[i] : +ids[i];
            }
        }

        return ids;
    },

    /**
     * @private
     * Saves the array of ids representing the set of all records in the Proxy
     * @param {Number[]} ids The ids to set
     */
    setIds: function(ids) {
        var obj = this.getStorageObject(),
            str = ids.join(",");

        obj.removeItem(this.id);

        if (!Ext.isEmpty(str)) {
            obj.setItem(this.id, str);
        }
    },

    /**
     * @private
     * Returns the next numerical ID that can be used when realizing a model instance (see getRecordCounterKey).
     * Increments the counter.
     * @return {Number} The id
     */
    getNextId: function() {
        var me = this,
            obj = me.getStorageObject(),
            key = me.getRecordCounterKey(),
            model = me.model,
            isString = model.prototype.fields.get(model.prototype.idProperty).type.type === 'string',
            id;

        id = me.idGenerator.generate();

        obj.setItem(key, id);

        if(!isString) {
            id = +id;
        }

        return id;
    },

    /**
     * Gets tree data and transforms it from key value pairs into a hierarchical structure.
     * @private
     * @return {Ext.data.NodeInterface[]}
     */
    getTreeData: function() {
        var me = this,
            ids = me.getIds(),
            length = ids.length,
            records = [],
            recordHash = {},
            root = [],
            i = 0,
            Model = me.model,
            idProperty = Model.prototype.idProperty,
            rootLength, record, parent, parentId, children, id;

        for(; i < length; i++) {
            id = ids[i];
            // get the record for each id
            record = me.getRecord(id);
            // push the record into the records array
            records.push(record);
            // add the record to the record hash so it can be easily retrieved by id later
            recordHash[id] = record;
            if(!record.parentId) {
                // push records that are at the root level (those with no parent id) into the "root" array
                root.push(record);
            }
        }

        rootLength = root.length;

        // sort the records by parent id for greater efficiency, so that each parent record only has to be found once for all of its children
        Ext.Array.sort(records, me.sortByParentId);

        // append each record to its parent, starting after the root node(s), since root nodes do not need to be attached to a parent
        for(i = rootLength; i < length; i++) {
            record = records[i];
            parentId = record.parentId;
            if(!parent || parent[idProperty] !== parentId) {
                // if this record has a different parent id from the previous record, we need to look up the parent by id.
                parent = recordHash[parentId];
                parent.children = children = [];
            }

            // push the record onto its parent's children array
            children.push(record);
        }

        for(i = length; i--;) {
            record = records[i];
            if(!record.children && !record.leaf) {
                // set non-leaf nodes with no children to loaded so the proxy won't try to dynamically load their contents when they are expanded
                record.loaded = true;
            }
        }

        // Create model instances out of all the "root-level" nodes.
        for(i = rootLength; i--;) {
            record = root[i];
            root[i] = new Model(record, record[idProperty], record);
        }

        return root;
    },

    /**
     * Sorter function for sorting records by parentId
     * @private
     * @param {Object} node1
     * @param {Object} node2
     * @return {Number}
     */
    sortByParentId: function(node1, node2) {
        return (node1.parentId || 0) - (node2.parentId || 0);
    },

    /**
     * @private
     * Sets up the Proxy by claiming the key in the storage object that corresponds to the unique id of this Proxy. Called
     * automatically by the constructor, this should not need to be called again unless {@link #clear} has been called.
     */
    initialize: function() {
        var me = this,
            storageObject = me.getStorageObject(),
            lastId = +storageObject.getItem(me.getRecordCounterKey());

        storageObject.setItem(me.id, storageObject.getItem(me.id) || "");
        if(storageObject.getItem(me.getTreeKey())) {
            me.isHierarchical = true;
        }

        me.idGenerator = new Ext.data.SequentialIdGenerator({
            seed: lastId ? lastId + 1 : 1
        });
    },

    /**
     * Destroys all records stored in the proxy and removes all keys and values used to support the proxy from the
     * storage object.
     */
    clear: function() {
        var me = this,
            obj = me.getStorageObject(),
            ids = me.getIds(),
            len = ids.length,
            i;

        //remove all the records
        for (i = 0; i < len; i++) {
            obj.removeItem(me.getRecordKey(ids[i]));
        }

        //remove the supporting objects
        obj.removeItem(me.getRecordCounterKey());
        obj.removeItem(me.getTreeKey());
        obj.removeItem(me.id);

        // clear the cache
        me.cache = {};
    },

    /**
     * @private
     * Abstract function which should return the storage object that data will be saved to. This must be implemented
     * in each subclass.
     * @return {Object} The storage object
     */
    getStorageObject: function() {
        Ext.Error.raise("The getStorageObject function has not been defined in your Ext.data.proxy.WebStorage subclass");
    }
});
/**
 * @author Ed Spencer
 *
 * The LocalStorageProxy uses the new HTML5 localStorage API to save {@link Ext.data.Model Model} data locally on the
 * client browser. HTML5 localStorage is a key-value store (e.g. cannot save complex objects like JSON), so
 * LocalStorageProxy automatically serializes and deserializes data when saving and retrieving it.
 *
 * localStorage is extremely useful for saving user-specific information without needing to build server-side
 * infrastructure to support it. Let's imagine we're writing a Twitter search application and want to save the user's
 * searches locally so they can easily perform a saved search again later. We'd start by creating a Search model:
 *
 *     Ext.define('Search', {
 *         fields: ['id', 'query'],
 *         extend: 'Ext.data.Model',
 *         proxy: {
 *             type: 'localstorage',
 *             id  : 'twitter-Searches'
 *         }
 *     });
 *
 * Our Search model contains just two fields - id and query - plus a Proxy definition. The only configuration we need to
 * pass to the LocalStorage proxy is an {@link #id}. This is important as it separates the Model data in this Proxy from
 * all others. The localStorage API puts all data into a single shared namespace, so by setting an id we enable
 * LocalStorageProxy to manage the saved Search data.
 *
 * Saving our data into localStorage is easy and would usually be done with a {@link Ext.data.Store Store}:
 *
 *     //our Store automatically picks up the LocalStorageProxy defined on the Search model
 *     var store = Ext.create('Ext.data.Store', {
 *         model: "Search"
 *     });
 *
 *     //loads any existing Search data from localStorage
 *     store.load();
 *
 *     //now add some Searches
 *     store.add({query: 'Sencha Touch'});
 *     store.add({query: 'Ext JS'});
 *
 *     //finally, save our Search data to localStorage
 *     store.sync();
 *
 * The LocalStorageProxy automatically gives our new Searches an id when we call store.sync(). It encodes the Model data
 * and places it into localStorage. We can also save directly to localStorage, bypassing the Store altogether:
 *
 *     var search = Ext.create('Search', {query: 'Sencha Animator'});
 *
 *     //uses the configured LocalStorageProxy to save the new Search to localStorage
 *     search.save();
 *
 * # Limitations
 *
 * If this proxy is used in a browser where local storage is not supported, the constructor will throw an error. A local
 * storage proxy requires a unique ID which is used as a key in which all record data are stored in the local storage
 * object.
 *
 * It's important to supply this unique ID as it cannot be reliably determined otherwise. If no id is provided but the
 * attached store has a storeId, the storeId will be used. If neither option is presented the proxy will throw an error.
 */
Ext.define('Ext.data.proxy.LocalStorage', {
    extend: 'Ext.data.proxy.WebStorage',
    alias: 'proxy.localstorage',
    alternateClassName: 'Ext.data.LocalStorageProxy',
    
    //inherit docs
    getStorageObject: function() {
        return window.localStorage;
    }
});
/**
 * @author Ed Spencer
 *
 * Proxy which uses HTML5 session storage as its data storage/retrieval mechanism. If this proxy is used in a browser
 * where session storage is not supported, the constructor will throw an error. A session storage proxy requires a
 * unique ID which is used as a key in which all record data are stored in the session storage object.
 *
 * It's important to supply this unique ID as it cannot be reliably determined otherwise. If no id is provided but the
 * attached store has a storeId, the storeId will be used. If neither option is presented the proxy will throw an error.
 *
 * Proxies are almost always used with a {@link Ext.data.Store store}:
 *
 *     new Ext.data.Store({
 *         proxy: {
 *             type: 'sessionstorage',
 *             id  : 'myProxyKey'
 *         }
 *     });
 *
 * Alternatively you can instantiate the Proxy directly:
 *
 *     new Ext.data.proxy.SessionStorage({
 *         id  : 'myOtherProxyKey'
 *     });
 *
 * Note that session storage is different to local storage (see {@link Ext.data.proxy.LocalStorage}) - if a browser
 * session is ended (e.g. by closing the browser) then all data in a SessionStorageProxy are lost. Browser restarts
 * don't affect the {@link Ext.data.proxy.LocalStorage} - the data are preserved.
 */
Ext.define('Ext.data.proxy.SessionStorage', {
    extend: 'Ext.data.proxy.WebStorage',
    alias: 'proxy.sessionstorage',
    alternateClassName: 'Ext.data.SessionStorageProxy',
    
    //inherit docs
    getStorageObject: function() {
        return window.sessionStorage;
    }
});

/**
 * @author Ed Spencer
 *
 * Readers are used to interpret data to be loaded into a {@link Ext.data.Model Model} instance or a {@link
 * Ext.data.Store Store} - often in response to an AJAX request. In general there is usually no need to create
 * a Reader instance directly, since a Reader is almost always used together with a {@link Ext.data.proxy.Proxy Proxy},
 * and is configured using the Proxy's {@link Ext.data.proxy.Proxy#cfg-reader reader} configuration property:
 * 
 *     Ext.create('Ext.data.Store', {
 *         model: 'User',
 *         proxy: {
 *             type: 'ajax',
 *             url : 'users.json',
 *             reader: {
 *                 type: 'json',
 *                 root: 'users'
 *             }
 *         },
 *     });
 *     
 * The above reader is configured to consume a JSON string that looks something like this:
 *  
 *     {
 *         "success": true,
 *         "users": [
 *             { "name": "User 1" },
 *             { "name": "User 2" }
 *         ]
 *     }
 * 
 *
 * # Loading Nested Data
 *
 * Readers have the ability to automatically load deeply-nested data objects based on the {@link Ext.data.association.Association
 * associations} configured on each Model. Below is an example demonstrating the flexibility of these associations in a
 * fictional CRM system which manages a User, their Orders, OrderItems and Products. First we'll define the models:
 *
 *     Ext.define("User", {
 *         extend: 'Ext.data.Model',
 *         fields: [
 *             'id', 'name'
 *         ],
 *
 *         hasMany: {model: 'Order', name: 'orders'},
 *
 *         proxy: {
 *             type: 'rest',
 *             url : 'users.json',
 *             reader: {
 *                 type: 'json',
 *                 root: 'users'
 *             }
 *         }
 *     });
 *
 *     Ext.define("Order", {
 *         extend: 'Ext.data.Model',
 *         fields: [
 *             'id', 'total'
 *         ],
 *
 *         hasMany  : {model: 'OrderItem', name: 'orderItems', associationKey: 'order_items'},
 *         belongsTo: 'User'
 *     });
 *
 *     Ext.define("OrderItem", {
 *         extend: 'Ext.data.Model',
 *         fields: [
 *             'id', 'price', 'quantity', 'order_id', 'product_id'
 *         ],
 *
 *         belongsTo: ['Order', {model: 'Product', associationKey: 'product'}]
 *     });
 *
 *     Ext.define("Product", {
 *         extend: 'Ext.data.Model',
 *         fields: [
 *             'id', 'name'
 *         ],
 *
 *         hasMany: 'OrderItem'
 *     });
 *
 * This may be a lot to take in - basically a User has many Orders, each of which is composed of several OrderItems.
 * Finally, each OrderItem has a single Product. This allows us to consume data like this:
 *
 *     {
 *         "users": [
 *             {
 *                 "id": 123,
 *                 "name": "Ed",
 *                 "orders": [
 *                     {
 *                         "id": 50,
 *                         "total": 100,
 *                         "order_items": [
 *                             {
 *                                 "id"      : 20,
 *                                 "price"   : 40,
 *                                 "quantity": 2,
 *                                 "product" : {
 *                                     "id": 1000,
 *                                     "name": "MacBook Pro"
 *                                 }
 *                             },
 *                             {
 *                                 "id"      : 21,
 *                                 "price"   : 20,
 *                                 "quantity": 3,
 *                                 "product" : {
 *                                     "id": 1001,
 *                                     "name": "iPhone"
 *                                 }
 *                             }
 *                         ]
 *                     }
 *                 ]
 *             }
 *         ]
 *     }
 *
 * The JSON response is deeply nested - it returns all Users (in this case just 1 for simplicity's sake), all of the
 * Orders for each User (again just 1 in this case), all of the OrderItems for each Order (2 order items in this case),
 * and finally the Product associated with each OrderItem. Now we can read the data and use it as follows:
 *
 *     var store = Ext.create('Ext.data.Store', {
 *         model: "User"
 *     });
 *
 *     store.load({
 *         callback: function() {
 *             //the user that was loaded
 *             var user = store.first();
 *
 *             console.log("Orders for " + user.get('name') + ":")
 *
 *             //iterate over the Orders for each User
 *             user.orders().each(function(order) {
 *                 console.log("Order ID: " + order.getId() + ", which contains items:");
 *
 *                 //iterate over the OrderItems for each Order
 *                 order.orderItems().each(function(orderItem) {
 *                     //we know that the Product data is already loaded, so we can use the synchronous getProduct
 *                     //usually, we would use the asynchronous version (see {@link Ext.data.association.BelongsTo})
 *                     var product = orderItem.getProduct();
 *
 *                     console.log(orderItem.get('quantity') + ' orders of ' + product.get('name'));
 *                 });
 *             });
 *         }
 *     });
 *
 * Running the code above results in the following:
 *
 *     Orders for Ed:
 *     Order ID: 50, which contains items:
 *     2 orders of MacBook Pro
 *     3 orders of iPhone
 */
Ext.define('Ext.data.reader.Reader', {
    requires: ['Ext.data.ResultSet', 'Ext.XTemplate'],
    alternateClassName: ['Ext.data.Reader', 'Ext.data.DataReader'],

    mixins: {
        observable: 'Ext.util.Observable'
    },

    /**
     * @cfg {String} idProperty
     * Name of the property within a row object that contains a record identifier value. Defaults to the id of the
     * model. If an idProperty is explicitly specified it will override the idProperty defined on the model.
     */

    /**
     * @cfg {String} [totalProperty="total"]
     * Name of the property from which to retrieve the total number of records in the dataset. This is only needed if
     * the whole dataset is not passed in one go, but is being paged from the remote server.
     */
    totalProperty: 'total',

    /**
     * @cfg {String} [successProperty="success"]
     * Name of the property from which to retrieve the `success` attribute, the value of which indicates
     * whether a given request succeeded or failed (typically a boolean or 'true'|'false'). See
     * {@link Ext.data.proxy.Server}.{@link Ext.data.proxy.Server#exception exception} for additional information.
     */
    successProperty: 'success',

    /**
     * @cfg {String} root
     * The name of the property which contains the data items corresponding to the Model(s) for which this
     * Reader is configured.  For JSON reader it's a property name (or a dot-separated list of property names
     * if the root is nested).  For XML reader it's a CSS selector.  For Array reader the root is not applicable
     * since the data is assumed to be a single-level array of arrays.
     * 
     * By default the natural root of the data will be used: the root JSON array, the root XML element, or the array.
     *
     * The data packet value for this property should be an empty array to clear the data or show no data.
     */
    root: '',
    
    /**
     * @cfg {String} messageProperty
     * The name of the property which contains a response message. This property is optional.
     */
    
    /**
     * @cfg {Boolean} [implicitIncludes=true]
     * True to automatically parse models nested within other models in a response object. See the
     * Ext.data.reader.Reader intro docs for full explanation.
     */
    implicitIncludes: true,
    
    /**
     * @cfg {Boolean} [readRecordsOnFailure=true]
     * True to extract the records from a data packet even if the {@link #successProperty} returns false.
     */
    readRecordsOnFailure: true,
    
    /**
     * @property {Object} metaData
     * The raw meta data that was most recently read, if any. Meta data can include existing
     * Reader config options like {@link #idProperty}, {@link #totalProperty}, etc. that get
     * automatically applied to the Reader, and those can still be accessed directly from the Reader
     * if needed. However, meta data is also often used to pass other custom data to be processed
     * by application code. For example, it is common when reconfiguring the data model of a grid to
     * also pass a corresponding column model config to be applied to the grid. Any such data will
     * not get applied to the Reader directly (it just gets passed through and is ignored by Ext).
     * This metaData property gives you access to all meta data that was passed, including any such
     * custom data ignored by the reader.
     * 
     * This is a read-only property, and it will get replaced each time a new meta data object is
     * passed to the reader. Note that typically you would handle proxy's
     * {@link Ext.data.proxy.Proxy#metachange metachange} event which passes this exact same meta
     * object to listeners. However this property is available if it's more convenient to access it
     * via the reader directly in certain cases.
     * @readonly
     */
    
    /*
     * @property {Boolean} isReader
     * `true` in this class to identify an object as an instantiated Reader, or subclass thereof.
     */
    isReader: true,

    // Private flag to the generated convertRecordData function to indicate whether to apply Field default
    // values to fields for which no value is present in the raw data.
    // This is set to false by a Server Proxy which is reading the response from a "create" or "update" operation.
    applyDefaults: true,

    lastFieldGeneration: null,
    
    /**
     * Creates new Reader.
     * @param {Object} config (optional) Config object.
     */
    constructor: function(config) {
        var me = this;
        
        me.mixins.observable.constructor.call(me, config);
        me.fieldCount = 0;
        me.model = Ext.ModelManager.getModel(me.model);
        me.accessExpressionFn = Ext.Function.bind(me.createFieldAccessExpression, me);

        // Extractors can only be calculated if the fields MixedCollection has been set.
        // A Model may only complete its setup (set the prototype properties) after asynchronous loading
        // which would mean that there may be no "fields"
        // If this happens, the load callback will call proxy.setModel which calls reader.setModel which
        // triggers buildExtractors.
        if (me.model && me.model.prototype.fields) {
            me.buildExtractors();
        }

        this.addEvents(
            /**
             * @event
             * Fires when the reader receives improperly encoded data from the server
             * @param {Ext.data.reader.Reader} reader A reference to this reader
             * @param {XMLHttpRequest} response The XMLHttpRequest response object
             * @param {Ext.data.ResultSet} error The error object
             */
            'exception'
        );
    },

    /**
     * Sets a new model for the reader.
     * @private
     * @param {Object} model The model to set.
     * @param {Boolean} setOnProxy True to also set on the Proxy, if one is configured
     */
    setModel: function(model, setOnProxy) {
        var me = this;
        
        me.model = Ext.ModelManager.getModel(model);
        me.buildExtractors(true);
        
        if (setOnProxy && me.proxy) {
            me.proxy.setModel(me.model, true);
        }
    },

    /**
     * Reads the given response object. This method normalizes the different types of response object that may be passed to it.
     * If it's an XMLHttpRequest object, hand off to the subclass' {@link #getResponseData} method.
     * Else, hand off the reading of records to the {@link #readRecords} method.
     * @param {Object} response The response object. This may be either an XMLHttpRequest object or a plain JS object
     * @return {Ext.data.ResultSet} The parsed or default ResultSet object
     */
    read: function(response) {
        var data;

        if (response) {
            data = response.responseText ? this.getResponseData(response) : this.readRecords(response);
        }

        return data || this.nullResultSet;
    },

    /**
     * Abstracts common functionality used by all Reader subclasses. Each subclass is expected to call this function
     * before running its own logic and returning the Ext.data.ResultSet instance. For most Readers additional
     * processing should not be needed.
     * @param {Object} data The raw data object
     * @return {Ext.data.ResultSet} A ResultSet object
     */
    readRecords: function(data) {
        var me = this,
            success,
            recordCount,
            records,
            root,
            total,
            value,
            message;
        
        /*
         * We check here whether fields collection has changed since the last read.
         * This works around an issue when a Model is used for both a Tree and another
         * source, because the tree decorates the model with extra fields and it causes
         * issues because the readers aren't notified.
         */
        if (me.lastFieldGeneration !== me.model.prototype.fields.generation) {
            me.buildExtractors(true);
        }
        
        /**
         * @property {Object} rawData
         * The raw data object that was last passed to {@link #readRecords}. Stored for further processing if needed.
         */
        me.rawData = data;

        data = me.getData(data);
        
        success = true;
        recordCount = 0;
        records = [];
            
        if (me.successProperty) {
            value = me.getSuccess(data);
            if (value === false || value === 'false') {
                success = false;
            }
        }
        
        if (me.messageProperty) {
            message = me.getMessage(data);
        }

        
        // Only try and extract other data if call was successful
        if (me.readRecordsOnFailure || success) {
            // If we pass an array as the data, we dont use getRoot on the data.
            // Instead the root equals to the data.
            root = Ext.isArray(data) ? data : me.getRoot(data);
            
            if (root) {
                total = root.length;
            }

          if (me.totalProperty) {
                value = parseInt(me.getTotal(data), 10);
                if (!isNaN(value)) {
                    total = value;
                }
            }

           if (root) {
                records = me.extractData(root);
                recordCount = records.length;
            }
        }

        return new Ext.data.ResultSet({
            total  : total || recordCount,
            count  : recordCount,
            records: records,
            success: success,
            message: message
        });
    },

    /**
     * Returns extracted, type-cast rows of data.
     * @param {Object[]/Object} root from server response
     * @return {Array} An array of records containing the extracted data
     * @private
     */
    extractData : function(root) {
        var me = this,
            records = [],
            Model   = me.model,
            length  = root.length,
            convertedValues, node, record, i;
            
        if (!root.length && Ext.isObject(root)) {
            root = [root];
            length = 1;
        }

        for (i = 0; i < length; i++) {
            node = root[i];
            if (!node.isModel) { 
                // Create a record with an empty data object.
                // Populate that data object by extracting and converting field values from raw data
                record = new Model(undefined, me.getId(node), node, convertedValues = {});

                // If the server did not include an id in the response data, the Model constructor will mark the record as phantom.
                // We  need to set phantom to false here because records created from a server response using a reader by definition are not phantom records.
                record.phantom = false;

                // Use generated function to extract all fields at once
                me.convertRecordData(convertedValues, node, record);

                records.push(record);
                
                if (me.implicitIncludes) {
                    me.readAssociated(record, node);
                }
            } else {
                // If we're given a model instance in the data, just push it on
                // without doing any conversion
                records.push(node);
            }
        }

        return records;
    },
    
    /**
     * @private
     * Loads a record's associations from the data object. This prepopulates hasMany and belongsTo associations
     * on the record provided.
     * @param {Ext.data.Model} record The record to load associations for
     * @param {Object} data The data object
     * @return {String} Return value description
     */
    readAssociated: function(record, data) {
        var associations = record.associations.items,
            i            = 0,
            length       = associations.length,
            association, associationData, proxy, reader;
        
        for (; i < length; i++) {
            association     = associations[i];
            associationData = this.getAssociatedDataRoot(data, association.associationKey || association.name);
            
            if (associationData) {
                reader = association.getReader();
                if (!reader) {
                    proxy = association.associatedModel.proxy;
                    // if the associated model has a Reader already, use that, otherwise attempt to create a sensible one
                    if (proxy) {
                        reader = proxy.getReader();
                    } else {
                        reader = new this.constructor({
                            model: association.associatedName
                        });
                    }
                }
                association.read(record, reader, associationData);
            }  
        }
    },
    
    /**
     * @private
     * Used internally by {@link #readAssociated}. Given a data object (which could be json, xml etc) for a specific
     * record, this should return the relevant part of that data for the given association name. This is only really
     * needed to support the XML Reader, which has to do a query to get the associated data object
     * @param {Object} data The raw data object
     * @param {String} associationName The name of the association to get data for (uses associationKey if present)
     * @return {Object} The root
     */
    getAssociatedDataRoot: function(data, associationName) {
        return data[associationName];
    },
    
    getFields: function() {
        return this.model.prototype.fields.items;
    },

    /**
     * @private
     * By default this function just returns what is passed to it. It can be overridden in a subclass
     * to return something else. See XmlReader for an example.
     * @param {Object} data The data object
     * @return {Object} The normalized data object
     */
    getData: function(data) {
        return data;
    },

    /**
     * @private
     * This will usually need to be implemented in a subclass. Given a generic data object (the type depends on the type
     * of data we are reading), this function should return the object as configured by the Reader's 'root' meta data config.
     * See XmlReader's getRoot implementation for an example. By default the same data object will simply be returned.
     * @param {Object} data The data object
     * @return {Object} The same data object
     */
    getRoot: function(data) {
        return data;
    },

    /**
     * Takes a raw response object (as passed to the {@link #read} method) and returns the useful data
     * segment from it. This must be implemented by each subclass.
     * @param {Object} response The response object
     * @return {Ext.data.ResultSet} A ResultSet object
     */
    getResponseData: function(response) {
        Ext.Error.raise("getResponseData must be implemented in the Ext.data.reader.Reader subclass");
    },

    /**
     * @private
     * Reconfigures the meta data tied to this Reader
     */
    onMetaChange : function(meta) {
        var me = this,
            fields = meta.fields || me.getFields(),
            newModel,
            clientIdProperty;
        
        // save off the raw meta data
        me.metaData = meta;
        
        // set any reader-specific configs from meta if available
        me.root = meta.root || me.root;
        me.idProperty = meta.idProperty || me.idProperty;
        me.totalProperty = meta.totalProperty || me.totalProperty;
        me.successProperty = meta.successProperty || me.successProperty;
        me.messageProperty = meta.messageProperty || me.messageProperty;
        clientIdProperty = meta.clientIdProperty;

        if (me.model) {
            me.model.setFields(fields, me.idProperty, clientIdProperty);
            me.setModel(me.model, true);
        }
        else {
            newModel = Ext.define("Ext.data.reader.Json-Model" + Ext.id(), {
                extend: 'Ext.data.Model',
                fields: fields,
                clientIdProperty: clientIdProperty
            });
            if (me.idProperty) {
                // We only do this if the reader actually has a custom idProperty set,
                // otherwise let the model use its own default value. It is valid for
                // the reader idProperty to be undefined, in which case it will use the
                // model's idProperty (in getIdProperty()).
                newModel.idProperty = me.idProperty;
            }
            me.setModel(newModel, true);
        }
    },
    
    /**
     * Get the idProperty to use for extracting data
     * @private
     * @return {String} The id property
     */
    getIdProperty: function(){
        return this.idProperty || this.model.prototype.idProperty;
    },

    /**
     * @private
     * This builds optimized functions for retrieving record data and meta data from an object.
     * Subclasses may need to implement their own getRoot function.
     * @param {Boolean} [force=false] True to automatically remove existing extractor functions first
     */
    buildExtractors: function(force) {
        var me          = this,
            idProp      = me.getIdProperty(),
            totalProp   = me.totalProperty,
            successProp = me.successProperty,
            messageProp = me.messageProperty,
            accessor,
            idField,
            map;
            
        if (force === true) {
            delete me.convertRecordData;
        }
        
        if (me.convertRecordData) {
            return;
        }   

        //build the extractors for all the meta data
        if (totalProp) {
            me.getTotal = me.createAccessor(totalProp);
        }

        if (successProp) {
            me.getSuccess = me.createAccessor(successProp);
        }

        if (messageProp) {
            me.getMessage = me.createAccessor(messageProp);
        }

        if (idProp) {
            idField = me.model.prototype.fields.get(idProp);
            if (idField) {
                map = idField.mapping;
                idProp = (map !== undefined && map !== null) ? map : idProp;
            }
            accessor = me.createAccessor(idProp);

            me.getId = function(record) {
                var id = accessor.call(me, record);
                return (id === undefined || id === '') ? null : id;
            };
        } else {
            me.getId = function() {
                return null;
            };
        }
        me.convertRecordData = me.buildRecordDataExtractor();
        me.lastFieldGeneration = me.model.prototype.fields.generation;
    },

    recordDataExtractorTemplate : [
        'var me = this\n',
        '    ,fields = me.model.prototype.fields\n',
        '    ,value\n',
        '    ,internalId\n',
        '<tpl for="fields">',
        '    ,__field{#} = fields.get("{name}")\n',
        '</tpl>', ';\n',

        'return function(dest, source, record) {\n',
        '<tpl for="fields">',
        // createFieldAccessExpression must be implemented in subclasses to extract data from the source object in the correct way
        '    value = {[ this.createFieldAccessExpression(values, "__field" + xindex, "source") ]};\n',

        // Code for processing a source property when a custom convert is defined
            '<tpl if="hasCustomConvert">',
        '    dest["{name}"] = value === undefined ? __field{#}.convert(__field{#}.defaultValue, record) : __field{#}.convert(value, record);\n',

        // Code for processing a source property when there is a default value
            '<tpl elseif="defaultValue !== undefined">',
        '    if (value === undefined) {\n',
        '        if (me.applyDefaults) {\n',
                '<tpl if="convert">',
        '            dest["{name}"] = __field{#}.convert(__field{#}.defaultValue, record);\n',
                '<tpl else>',
        '            dest["{name}"] = __field{#}.defaultValue\n',
                '</tpl>',
        '        };\n',
        '    } else {\n',
                '<tpl if="convert">',
        '        dest["{name}"] = __field{#}.convert(value, record);\n',
                '<tpl else>',
        '        dest["{name}"] = value;\n',
                '</tpl>',
        '    };',

        // Code for processing a source property value when there is no default value
            '<tpl else>',
        '    if (value !== undefined) {\n',
                '<tpl if="convert">',
        '        dest["{name}"] = __field{#}.convert(value, record);\n',
                '<tpl else>',
        '        dest["{name}"] = value;\n',
                '</tpl>',
        '    }\n',
            '</tpl>',

        '</tpl>',

        // set the client id as the internalId of the record.
        // clientId handles the case where a client side record did not previously exist on the server,
        // so the server is passing back a client id that can be used to pair the server side record up with the client record
        '<tpl if="clientIdProp">',
        '    if (record && (internalId = {[ this.createFieldAccessExpression(\{mapping: values.clientIdProp\}, null, "source") ]})) {\n',
        '        record.{["internalId"]} = internalId;\n',
        '    }\n',
        '</tpl>',

        '};'
    ],

    /**
     * @private
     * Return a function which will read a raw row object in the format this Reader accepts, and populates
     * a record's data object with converted data values.
     *
     * The returned function must be passed the following parameters:
     *
     * - dest A record's empty data object into which the new field value properties are injected.
     * - source A raw row data object of whatever type this Reader consumes
     * - record The record which is being populated.
     *
     */
    buildRecordDataExtractor: function() {
        var me = this,
            modelProto = me.model.prototype,
            templateData = {
                clientIdProp: modelProto.clientIdProperty,
                fields: modelProto.fields.items
            };

        me.recordDataExtractorTemplate.createFieldAccessExpression = me.accessExpressionFn;
        // Here we are creating a new Function and invoking it immediately in the scope of this Reader
        // It declares several vars capturing the configured context of this Reader, and returns a function
        // which, when passed a record data object, a raw data row in the format this Reader is configured to read,
        // and the record which is being created, will populate the record's data object from the raw row data.
        return Ext.functionFactory(me.recordDataExtractorTemplate.apply(templateData)).call(me);
    },

    destroyReader: function() {
        var me = this;
        delete me.proxy;
        delete me.model;
        delete me.convertRecordData;
        delete me.getId;
        delete me.getTotal;
        delete me.getSuccess;
        delete me.getMessage;
    }
}, function() {
    var proto = this.prototype;
    Ext.apply(proto, {
        // Private. Empty ResultSet to return when response is falsy (null|undefined|empty string)
        nullResultSet: new Ext.data.ResultSet({
            total  : 0,
            count  : 0,
            records: [],
            success: true
        }),
        recordDataExtractorTemplate: new Ext.XTemplate(proto.recordDataExtractorTemplate)
    });
});

/**
 * @author Ed Spencer
 *
 * The JSON Reader is used by a Proxy to read a server response that is sent back in JSON format. This usually
 * happens as a result of loading a Store - for example we might create something like this:
 *
 *     Ext.define('User', {
 *         extend: 'Ext.data.Model',
 *         fields: ['id', 'name', 'email']
 *     });
 *
 *     var store = Ext.create('Ext.data.Store', {
 *         model: 'User',
 *         proxy: {
 *             type: 'ajax',
 *             url : 'users.json',
 *             reader: {
 *                 type: 'json'
 *             }
 *         }
 *     });
 *
 * The example above creates a 'User' model. Models are explained in the {@link Ext.data.Model Model} docs if you're
 * not already familiar with them.
 *
 * We created the simplest type of JSON Reader possible by simply telling our {@link Ext.data.Store Store}'s
 * {@link Ext.data.proxy.Proxy Proxy} that we want a JSON Reader. The Store automatically passes the configured model to the
 * Store, so it is as if we passed this instead:
 *
 *     reader: {
 *         type : 'json',
 *         model: 'User'
 *     }
 *
 * The reader we set up is ready to read data from our server - at the moment it will accept a response like this:
 *
 *     [
 *         {
 *             "id": 1,
 *             "name": "Ed Spencer",
 *             "email": "ed@sencha.com"
 *         },
 *         {
 *             "id": 2,
 *             "name": "Abe Elias",
 *             "email": "abe@sencha.com"
 *         }
 *     ]
 *
 * ## Reading other JSON formats
 *
 * If you already have your JSON format defined and it doesn't look quite like what we have above, you can usually
 * pass JsonReader a couple of configuration options to make it parse your format. For example, we can use the
 * {@link #cfg-root} configuration to parse data that comes back like this:
 *
 *     {
 *         "users": [
 *            {
 *                "id": 1,
 *                "name": "Ed Spencer",
 *                "email": "ed@sencha.com"
 *            },
 *            {
 *                "id": 2,
 *                "name": "Abe Elias",
 *                "email": "abe@sencha.com"
 *            }
 *         ]
 *     }
 *
 * To parse this we just pass in a {@link #root} configuration that matches the 'users' above:
 *
 *     reader: {
 *         type: 'json',
 *         root: 'users'
 *     }
 *
 * Sometimes the JSON structure is even more complicated. Document databases like CouchDB often provide metadata
 * around each record inside a nested structure like this:
 *
 *     {
 *         "total": 122,
 *         "offset": 0,
 *         "users": [
 *             {
 *                 "id": "ed-spencer-1",
 *                 "value": 1,
 *                 "user": {
 *                     "id": 1,
 *                     "name": "Ed Spencer",
 *                     "email": "ed@sencha.com"
 *                 }
 *             }
 *         ]
 *     }
 *
 * In the case above the record data is nested an additional level inside the "users" array as each "user" item has
 * additional metadata surrounding it ('id' and 'value' in this case). To parse data out of each "user" item in the
 * JSON above we need to specify the {@link #record} configuration like this:
 *
 *     reader: {
 *         type  : 'json',
 *         root  : 'users',
 *         record: 'user'
 *     }
 *
 * ## Response MetaData
 *
 * The server can return metadata in its response, in addition to the record data, that describe attributes
 * of the data set itself or are used to reconfigure the Reader. To pass metadata in the response you simply
 * add a `metaData` attribute to the root of the response data. The metaData attribute can contain anything,
 * but supports a specific set of properties that are handled by the Reader if they are present:
 * 
 * - {@link #root}: the property name of the root response node containing the record data
 * - {@link #idProperty}: property name for the primary key field of the data
 * - {@link #totalProperty}: property name for the total number of records in the data
 * - {@link #successProperty}: property name for the success status of the response
 * - {@link #messageProperty}: property name for an optional response message
 * - {@link Ext.data.Model#cfg-fields fields}: Config used to reconfigure the Model's fields before converting the
 * response data into records
 * 
 * An initial Reader configuration containing all of these properties might look like this ("fields" would be
 * included in the Model definition, not shown):
 *
 *     reader: {
 *         type : 'json',
 *         root : 'root',
 *         idProperty     : 'id',
 *         totalProperty  : 'total',
 *         successProperty: 'success',
 *         messageProperty: 'message'
 *     }
 *
 * If you were to pass a response object containing attributes different from those initially defined above, you could
 * use the `metaData` attribute to reconifgure the Reader on the fly. For example:
 *
 *     {
 *         "count": 1,
 *         "ok": true,
 *         "msg": "Users found",
 *         "users": [{
 *             "userId": 123,
 *             "name": "Ed Spencer",
 *             "email": "ed@sencha.com"
 *         }],
 *         "metaData": {
 *             "root": "users",
 *             "idProperty": 'userId',
 *             "totalProperty": 'count',
 *             "successProperty": 'ok',
 *             "messageProperty": 'msg'
 *         }
 *     }
 *
 * You can also place any other arbitrary data you need into the `metaData` attribute which will be ignored by the Reader,
 * but will be accessible via the Reader's {@link #metaData} property (which is also passed to listeners via the Proxy's
 * {@link Ext.data.proxy.Proxy#metachange metachange} event (also relayed by the {@link Ext.data.AbstractStore#metachange
 * store}). Application code can then process the passed metadata in any way it chooses.
 * 
 * A simple example for how this can be used would be customizing the fields for a Model that is bound to a grid. By passing
 * the `fields` property the Model will be automatically updated by the Reader internally, but that change will not be
 * reflected automatically in the grid unless you also update the column configuration. You could do this manually, or you
 * could simply pass a standard grid {@link Ext.panel.Table#columns column} config object as part of the `metaData` attribute
 * and then pass that along to the grid. Here's a very simple example for how that could be accomplished:
 *
 *     // response format:
 *     {
 *         ...
 *         "metaData": {
 *             "fields": [
 *                 { "name": "userId", "type": "int" },
 *                 { "name": "name", "type": "string" },
 *                 { "name": "birthday", "type": "date", "dateFormat": "Y-j-m" },
 *             ],
 *             "columns": [
 *                 { "text": "User ID", "dataIndex": "userId", "width": 40 },
 *                 { "text": "User Name", "dataIndex": "name", "flex": 1 },
 *                 { "text": "Birthday", "dataIndex": "birthday", "flex": 1, "format": 'Y-j-m', "xtype": "datecolumn" }
 *             ]
 *         }
 *     }
 *
 * The Reader will automatically read the meta fields config and rebuild the Model based on the new fields, but to handle
 * the new column configuration you would need to handle the metadata within the application code. This is done simply enough
 * by handling the metachange event on either the store or the proxy, e.g.:
 *
 *     var store = Ext.create('Ext.data.Store', {
 *         ...
 *         listeners: {
 *             'metachange': function(store, meta) {
 *                 myGrid.reconfigure(store, meta.columns);
 *             }
 *         }
 *     });
 *
 */
Ext.define('Ext.data.reader.Json', {
    extend: 'Ext.data.reader.Reader',
    alternateClassName: 'Ext.data.JsonReader',
    alias : 'reader.json',

    root: '',

    /**
     * @cfg {String} record The optional location within the JSON response that the record data itself can be found at.
     * See the JsonReader intro docs for more details. This is not often needed.
     */

    /**
     * @cfg {Boolean} useSimpleAccessors True to ensure that field names/mappings are treated as literals when
     * reading values.
     *
     * For example, by default, using the mapping "foo.bar.baz" will try and read a property foo from the root, then a property bar
     * from foo, then a property baz from bar. Setting the simple accessors to true will read the property with the name
     * "foo.bar.baz" direct from the root object.
     */
    useSimpleAccessors: false,

    /**
     * Reads a JSON object and returns a ResultSet. Uses the internal getTotal and getSuccess extractors to
     * retrieve meta data from the response, and extractData to turn the JSON data into model instances.
     * @param {Object} data The raw JSON data
     * @return {Ext.data.ResultSet} A ResultSet containing model instances and meta data about the results
     */
    readRecords: function(data) {
        //this has to be before the call to super because we use the meta data in the superclass readRecords
        if (data.metaData) {
            this.onMetaChange(data.metaData);
        }

        /**
         * @property {Object} jsonData
         * A copy of this.rawData.
         * @deprecated Will be removed in Ext JS 5.0. This is just a copy of this.rawData - use that instead.
         */
        this.jsonData = data;
        return this.callParent([data]);
    },

    //inherit docs
    getResponseData: function(response) {
        var data, error;
 
        try {
            data = Ext.decode(response.responseText);
            return this.readRecords(data);
        } catch (ex) {
            error = new Ext.data.ResultSet({
                total  : 0,
                count  : 0,
                records: [],
                success: false,
                message: ex.message
            });

            this.fireEvent('exception', this, response, error);

            Ext.Logger.warn('Unable to parse the JSON returned by the server');

            return error;
        }
    },

    //inherit docs
    buildExtractors : function() {
        var me = this;

        me.callParent(arguments);

        if (me.root) {
            me.getRoot = me.createAccessor(me.root);
        } else {
            me.getRoot = function(root) {
                return root;
            };
        }
    },

    /**
     * @private
     * We're just preparing the data for the superclass by pulling out the record objects we want. If a {@link #record}
     * was specified we have to pull those out of the larger JSON object, which is most of what this function is doing
     * @param {Object} root The JSON root node
     * @return {Ext.data.Model[]} The records
     */
    extractData: function(root) {
        var recordName = this.record,
            data = [],
            length, i;

        if (recordName) {
            length = root.length;
            
            if (!length && Ext.isObject(root)) {
                length = 1;
                root = [root];
            }

            for (i = 0; i < length; i++) {
                data[i] = root[i][recordName];
            }
        } else {
            data = root;
        }
        return this.callParent([data]);
    },

    /**
     * @private
     * @method
     * Returns an accessor function for the given property string. Gives support for properties such as the following:
     *
     * - 'someProperty'
     * - 'some.property'
     * - 'some["property"]'
     * 
     * This is used by buildExtractors to create optimized extractor functions when casting raw data into model instances.
     */
    createAccessor: (function() {
        var re = /[\[\.]/;

        return function(expr) {
            if (Ext.isEmpty(expr)) {
                return Ext.emptyFn;
            }
            if (Ext.isFunction(expr)) {
                return expr;
            }
            if (this.useSimpleAccessors !== true) {
                var i = String(expr).search(re);
                if (i >= 0) {
                    return Ext.functionFactory('obj', 'return obj' + (i > 0 ? '.' : '') + expr);
                }
            }
            return function(obj) {
                return obj[expr];
            };
        };
    }()),

    /**
     * @private
     * @method
     * Returns an accessor expression for the passed Field. Gives support for properties such as the following:
     * 
     * - 'someProperty'
     * - 'some.property'
     * - 'some["property"]'
     * 
     * This is used by buildExtractors to create optimized on extractor function which converts raw data into model instances.
     */
    createFieldAccessExpression: (function() {
        var re = /[\[\.]/;

        return function(field, fieldVarName, dataName) {
            var me     = this,
                hasMap = (field.mapping !== null),
                map    = hasMap ? field.mapping : field.name,
                result,
                operatorSearch;

            if (typeof map === 'function') {
                result = fieldVarName + '.mapping(' + dataName + ', this)';
            } else if (this.useSimpleAccessors === true || ((operatorSearch = String(map).search(re)) < 0)) {
                if (!hasMap || isNaN(map)) {
                    // If we don't provide a mapping, we may have a field name that is numeric
                    map = '"' + map + '"';
                }
                result = dataName + "[" + map + "]";
            } else {
                result = dataName + (operatorSearch > 0 ? '.' : '') + map;
            }
            return result;
        };
    }())
});

/**
 * @author Ed Spencer
 * @class Ext.data.reader.Array
 * 
 * <p>Data reader class to create an Array of {@link Ext.data.Model} objects from an Array.
 * Each element of that Array represents a row of data fields. The
 * fields are pulled into a Record object using as a subscript, the <code>mapping</code> property
 * of the field definition if it exists, or the field's ordinal position in the definition.</p>
 * 
 * <p><u>Example code:</u></p>
 * 
<pre><code>
Employee = Ext.define('Employee', {
    extend: 'Ext.data.Model',
    fields: [
        'id',
        {name: 'name', mapping: 1},         // "mapping" only needed if an "id" field is present which
        {name: 'occupation', mapping: 2}    // precludes using the ordinal position as the index.        
    ]
});

var myReader = new Ext.data.reader.Array({
    model: 'Employee'
}, Employee);
</code></pre>
 * 
 * <p>This would consume an Array like this:</p>
 * 
<pre><code>
[ [1, 'Bill', 'Gardener'], [2, 'Ben', 'Horticulturalist'] ]
</code></pre>
 * 
 * @constructor
 * Create a new ArrayReader
 * @param {Object} meta Metadata configuration options.
 */
Ext.define('Ext.data.reader.Array', {
    extend: 'Ext.data.reader.Json',
    alternateClassName: 'Ext.data.ArrayReader',
    alias : 'reader.array',

    // For Array Reader, methods in the base which use these properties must not see the defaults
    totalProperty: undefined,
    successProperty: undefined,

    /**
     * @private
     * Returns an accessor expression for the passed Field from an Array using either the Field's mapping, or
     * its ordinal position in the fields collsction as the index.
     * This is used by buildExtractors to create optimized on extractor function which converts raw data into model instances.
     */
    createFieldAccessExpression: function(field, fieldVarName, dataName) {
            // In the absence of a mapping property, use the original ordinal position
            // at which the Model inserted the field into its collection.
        var index  = (field.mapping == null) ? field.originalIndex : field.mapping,
            result;

        if (typeof index === 'function') {
            result = fieldVarName + '.mapping(' + dataName + ', this)';
        } else {
            if (isNaN(index)) {
                index = '"' + index + '"';
            }
            result = dataName + "[" + index + "]";
        }
        return result;
    }
});

/**
 * @author Ed Spencer
 *
 * The XML Reader is used by a Proxy to read a server response that is sent back in XML format. This usually happens as
 * a result of loading a Store - for example we might create something like this:
 *
 *     Ext.define('User', {
 *         extend: 'Ext.data.Model',
 *         fields: ['id', 'name', 'email']
 *     });
 *
 *     var store = Ext.create('Ext.data.Store', {
 *         model: 'User',
 *         proxy: {
 *             type: 'ajax',
 *             url : 'users.xml',
 *             reader: {
 *                 type: 'xml',
 *                 record: 'user',
 *                 root: 'users'
 *             }
 *         }
 *     });
 *
 * The example above creates a 'User' model. Models are explained in the {@link Ext.data.Model Model} docs if you're not
 * already familiar with them.
 *
 * We created the simplest type of XML Reader possible by simply telling our {@link Ext.data.Store Store}'s {@link
 * Ext.data.proxy.Proxy Proxy} that we want a XML Reader. The Store automatically passes the configured model to the
 * Store, so it is as if we passed this instead:
 *
 *     reader: {
 *         type : 'xml',
 *         model: 'User',
 *         record: 'user',
 *         root: 'users'
 *     }
 *
 * The reader we set up is ready to read data from our server - at the moment it will accept a response like this:
 *
 *     <?xml version="1.0" encoding="UTF-8"?>
 *     <users>
 *         <user>
 *             <id>1</id>
 *             <name>Ed Spencer</name>
 *             <email>ed@sencha.com</email>
 *         </user>
 *         <user>
 *             <id>2</id>
 *             <name>Abe Elias</name>
 *             <email>abe@sencha.com</email>
 *         </user>
 *     </users>
 *
 * First off there's {@link #root} option to define the root node `<users>` (there should be only one in a well-formed
 * XML document). Then the XML Reader uses the configured {@link #record} option to pull out the data for each record -
 * in this case we set record to 'user', so each `<user>` above will be converted into a User model.
 *
 * Note that XmlReader doesn't care whether your {@link #root} and {@link #record} elements are nested deep inside a
 * larger structure, so a response like this will still work:
 *
 *     <?xml version="1.0" encoding="UTF-8"?>
 *     <deeply>
 *         <nested>
 *             <xml>
 *                 <users>
 *                     <user>
 *                         <id>1</id>
 *                         <name>Ed Spencer</name>
 *                         <email>ed@sencha.com</email>
 *                     </user>
 *                     <user>
 *                         <id>2</id>
 *                         <name>Abe Elias</name>
 *                         <email>abe@sencha.com</email>
 *                     </user>
 *                 </users>
 *             </xml>
 *         </nested>
 *     </deeply>
 *
 * # Response metadata
 *
 * The server can return additional data in its response, such as the {@link #totalProperty total number of records} and
 * the {@link #successProperty success status of the response}. These are typically included in the XML response like
 * this:
 *
 *     <?xml version="1.0" encoding="UTF-8"?>
 *     <users>
 *         <total>100</total>
 *         <success>true</success>
 *         <user>
 *             <id>1</id>
 *             <name>Ed Spencer</name>
 *             <email>ed@sencha.com</email>
 *         </user>
 *         <user>
 *             <id>2</id>
 *             <name>Abe Elias</name>
 *             <email>abe@sencha.com</email>
 *         </user>
 *     </users>
 *
 * If these properties are present in the XML response they can be parsed out by the XmlReader and used by the Store
 * that loaded it. We can set up the names of these properties by specifying a final pair of configuration options:
 *
 *     reader: {
 *         type: 'xml',
 *         root: 'users',
 *         totalProperty  : 'total',
 *         successProperty: 'success'
 *     }
 *
 * These final options are not necessary to make the Reader work, but can be useful when the server needs to report an
 * error or if it needs to indicate that there is a lot of data available of which only a subset is currently being
 * returned.
 *
 * # Response format
 *
 * **Note:** in order for the browser to parse a returned XML document, the Content-Type header in the HTTP response
 * must be set to "text/xml" or "application/xml". This is very important - the XmlReader will not work correctly
 * otherwise.
 */
Ext.define('Ext.data.reader.Xml', {
    extend: 'Ext.data.reader.Reader',
    alternateClassName: 'Ext.data.XmlReader',
    alias : 'reader.xml',

    /**
     * @cfg {String} record (required)
     * The DomQuery path to the repeated element which contains record information.
     */

    /**
     * @private
     * Creates a function to return some particular key of data from a response. The totalProperty and
     * successProperty are treated as special cases for type casting, everything else is just a simple selector.
     * @param {String} key
     * @return {Function}
     */
    createAccessor: function(expr) {
        var me = this;

        if (Ext.isEmpty(expr)) {
            return Ext.emptyFn;
        }

        if (Ext.isFunction(expr)) {
            return expr;
        }

        return function(root) {
            return me.getNodeValue(Ext.DomQuery.selectNode(expr, root));
        };
    },

    getNodeValue: function(node) {
        if (node && node.firstChild) {
            return node.firstChild.nodeValue;
        }
        return undefined;
    },

    //inherit docs
    getResponseData: function(response) {
        var xml = response.responseXML,
            error,
            msg;

        if (!xml) {
            msg = 'XML data not found in the response';               

            error = new Ext.data.ResultSet({
                total  : 0,
                count  : 0,
                records: [],
                success: false,
                message: msg
            });

            this.fireEvent('exception', this, response, error);

            Ext.Logger.warn(msg);

            return error;
        }

        return this.readRecords(xml);
    },

    /**
     * Normalizes the data object.
     * @param {Object} data The raw data object
     * @return {Object} The documentElement property of the data object if present, or the same object if not.
     */
    getData: function(data) {
        return data.documentElement || data;
    },

    /**
     * @private
     * Given an XML object, returns the Element that represents the root as configured by the Reader's meta data.
     * @param {Object} data The XML data object
     * @return {XMLElement} The root node element
     */
    getRoot: function(data) {
        var nodeName = data.nodeName,
            root     = this.root;

        if (!root || (nodeName && nodeName == root)) {
            return data;
        } else if (Ext.DomQuery.isXml(data)) {
            // This fix ensures we have XML data
            // Related to TreeStore calling getRoot with the root node, which isn't XML
            // Probably should be resolved in TreeStore at some point
            return Ext.DomQuery.selectNode(root, data);
        }
    },

    /**
     * @private
     * We're just preparing the data for the superclass by pulling out the record nodes we want.
     * @param {XMLElement} root The XML root node
     * @return {Ext.data.Model[]} The records
     */
    extractData: function(root) {
        var recordName = this.record;

        if (!recordName) {
            Ext.Error.raise('Record is a required parameter');
        }

        if (recordName != root.nodeName) {
            root = Ext.DomQuery.select(recordName, root);
        } else {
            root = [root];
        }
        return this.callParent([root]);
    },

    /**
     * @private
     * See Ext.data.reader.Reader's getAssociatedDataRoot docs.
     * @param {Object} data The raw data object
     * @param {String} associationName The name of the association to get data for (uses associationKey if present)
     * @return {XMLElement} The root
     */
    getAssociatedDataRoot: function(data, associationName) {
        return Ext.DomQuery.select(associationName, data)[0];
    },

    /**
     * Parses an XML document and returns a ResultSet containing the model instances.
     * @param {Object} doc Parsed XML document
     * @return {Ext.data.ResultSet} The parsed result set
     */
    readRecords: function(doc) {
        // it's possible that we get passed an array here by associations.
        // Make sure we strip that out (see Ext.data.reader.Reader#readAssociated)
        if (Ext.isArray(doc)) {
            doc = doc[0];
        }

        /**
         * @property {Object} xmlData
         * Copy of {@link #rawData}.
         * @deprecated Will be removed in Ext JS 5.0. Use {@link #rawData} instead.
         */
        this.xmlData = doc;
        return this.callParent([doc]);
    },

    /**
     * @private
     * Returns an accessor expression for the passed Field from an XML element using either the Field's mapping, or
     * its ordinal position in the fields collsction as the index.
     * This is used by buildExtractors to create optimized on extractor function which converts raw data into model instances.
     */
    createFieldAccessExpression: function(field, fieldVarName, dataName) {
        var selector = field.mapping || field.name,
            result;

        if (typeof selector === 'function') {
            result = fieldVarName + '.mapping(' + dataName + ', this)';
        } else {
            result = 'me.getNodeValue(Ext.DomQuery.selectNode("' + selector + '", ' + dataName + '))';
        }
        return result;
    }
});

/**
 * @class Ext.data.writer.Json

This class is used to write {@link Ext.data.Model} data to the server in a JSON format.
The {@link #allowSingle} configuration can be set to false to force the records to always be
encoded in an array, even if there is only a single record being sent.

 * @markdown
 */
Ext.define('Ext.data.writer.Json', {
    extend: 'Ext.data.writer.Writer',
    alternateClassName: 'Ext.data.JsonWriter',
    alias: 'writer.json',
    
    /**
     * @cfg {String} root The key under which the records in this Writer will be placed. Defaults to <tt>undefined</tt>.
     * Example generated request, using root: 'records':
<pre><code>
{'records': [{name: 'my record'}, {name: 'another record'}]}
</code></pre>
     */
    root: undefined,
    
    /**
     * @cfg {Boolean} encode True to use Ext.encode() on the data before sending. Defaults to <tt>false</tt>.
     * The encode option should only be set to true when a {@link #root} is defined, because the values will be
     * sent as part of the request parameters as opposed to a raw post. The root will be the name of the parameter
     * sent to the server.
     */
    encode: false,
    
    /**
     * @cfg {Boolean} allowSingle False to ensure that records are always wrapped in an array, even if there is only
     * one record being sent. When there is more than one record, they will always be encoded into an array.
     * Defaults to <tt>true</tt>. Example:
     * <pre><code>
// with allowSingle: true
"root": {
    "first": "Mark",
    "last": "Corrigan"
}

// with allowSingle: false
"root": [{
    "first": "Mark",
    "last": "Corrigan"
}]
     * </code></pre>
     */
    allowSingle: true,
    
    //inherit docs
    writeRecords: function(request, data) {
        var root = this.root;
        
        if (this.allowSingle && data.length == 1) {
            // convert to single object format
            data = data[0];
        }
        
        if (this.encode) {
            if (root) {
                // sending as a param, need to encode
                request.params[root] = Ext.encode(data);
            } else {
                Ext.Error.raise('Must specify a root when using encode');
            }
        } else {
            // send as jsonData
            request.jsonData = request.jsonData || {};
            if (root) {
                request.jsonData[root] = data;
            } else {
                request.jsonData = data;
            }
        }
        return request;
    }
});




/**
 * @author Ed Spencer
 *
 * AbstractStore is a superclass of {@link Ext.data.Store} and {@link Ext.data.TreeStore}. It's never used directly,
 * but offers a set of methods used by both of those subclasses.
 *
 * We've left it here in the docs for reference purposes, but unless you need to make a whole new type of Store, what
 * you're probably looking for is {@link Ext.data.Store}. If you're still interested, here's a brief description of what
 * AbstractStore is and is not.
 *
 * AbstractStore provides the basic configuration for anything that can be considered a Store. It expects to be
 * given a {@link Ext.data.Model Model} that represents the type of data in the Store. It also expects to be given a
 * {@link Ext.data.proxy.Proxy Proxy} that handles the loading of data into the Store.
 *
 * AbstractStore provides a few helpful methods such as {@link #method-load} and {@link #sync}, which load and save data
 * respectively, passing the requests through the configured {@link #proxy}. Both built-in Store subclasses add extra
 * behavior to each of these functions. Note also that each AbstractStore subclass has its own way of storing data -
 * in {@link Ext.data.Store} the data is saved as a flat {@link Ext.util.MixedCollection MixedCollection}, whereas in
 * {@link Ext.data.TreeStore TreeStore} we use a {@link Ext.data.Tree} to maintain the data's hierarchy.
 *
 * The store provides filtering and sorting support. This sorting/filtering can happen on the client side
 * or can be completed on the server. This is controlled by the {@link Ext.data.Store#remoteSort remoteSort} and
 * {@link Ext.data.Store#remoteFilter remoteFilter} config options. For more information see the {@link #sort} and
 * {@link Ext.data.Store#filter filter} methods.
 */
Ext.define('Ext.data.AbstractStore', {
	requires: [
        'Ext.util.MixedCollection',
        'Ext.data.proxy.Proxy',
        'Ext.data.Operation',
        'Ext.util.Filter'
    ],

    mixins: {
        observable: 'Ext.util.Observable',
        sortable: 'Ext.util.Sortable'
    },

    statics: {
        /**
         * Creates a store from config object.
         * 
         * @param {Object/Ext.data.AbstractStore} store A config for
         * the store to be created.  It may contain a `type` field
         * which defines the particular type of store to create.
         * 
         * Alteratively passing an actual store to this method will
         * just return it, no changes made.
         * 
         * @return {Ext.data.AbstractStore} The created store.
         * @static
         */
        create: function(store) {
            if (!store.isStore) {
                if (!store.type) {
                    store.type = 'store';
                }
                store = Ext.createByAlias('store.' + store.type, store);
            }
            return store;
        }
    },

    /**
     * @cfg {Boolean} remoteSort
     * True to defer any sorting operation to the server. If false, sorting is done locally on the client.
     */
    remoteSort  : false,

    /**
     * @cfg {Boolean} remoteFilter
     * True to defer any filtering operation to the server. If false, filtering is done locally on the client.
     */
    remoteFilter: false,

    /**
     * @cfg {String/Ext.data.proxy.Proxy/Object} proxy
     * The Proxy to use for this Store. This can be either a string, a config object or a Proxy instance -
     * see {@link #setProxy} for details.
     */

    /**
     * @cfg {Boolean/Object} autoLoad
     * If data is not specified, and if autoLoad is true or an Object, this store's load method is automatically called
     * after creation. If the value of autoLoad is an Object, this Object will be passed to the store's load method.
     * Defaults to false.
     */
    autoLoad: undefined,

    /**
     * @cfg {Boolean} autoSync
     * True to automatically sync the Store with its Proxy after every edit to one of its Records. Defaults to false.
     */
    autoSync: false,

    /**
     * @cfg {String} batchUpdateMode
     * Sets the updating behavior based on batch synchronization. 'operation' (the default) will update the Store's
     * internal representation of the data after each operation of the batch has completed, 'complete' will wait until
     * the entire batch has been completed before updating the Store's data. 'complete' is a good choice for local
     * storage proxies, 'operation' is better for remote proxies, where there is a comparatively high latency.
     */
    batchUpdateMode: 'operation',

    /**
     * @cfg {Boolean} filterOnLoad
     * If true, any filters attached to this Store will be run after loading data, before the datachanged event is fired.
     * Defaults to true, ignored if {@link Ext.data.Store#remoteFilter remoteFilter} is true
     */
    filterOnLoad: true,

    /**
     * @cfg {Boolean} sortOnLoad
     * If true, any sorters attached to this Store will be run after loading data, before the datachanged event is fired.
     * Defaults to true, igored if {@link Ext.data.Store#remoteSort remoteSort} is true
     */
    sortOnLoad: true,

    /**
     * @property {Boolean} implicitModel
     * True if a model was created implicitly for this Store. This happens if a fields array is passed to the Store's
     * constructor instead of a model constructor or name.
     * @private
     */
    implicitModel: false,

    /**
     * @property {String} defaultProxyType
     * The string type of the Proxy to create if none is specified. This defaults to creating a
     * {@link Ext.data.proxy.Memory memory proxy}.
     */
    defaultProxyType: 'memory',

    /**
     * @property {Boolean} isDestroyed
     * True if the Store has already been destroyed. If this is true, the reference to Store should be deleted
     * as it will not function correctly any more.
     */
    isDestroyed: false,

    /**
     * @property {Boolean} isStore
     * `true` in this class to identify an object as an instantiated Store, or subclass thereof.
     */
    isStore: true,

    /**
     * @cfg {String} storeId
     * Unique identifier for this store. If present, this Store will be registered with the {@link Ext.data.StoreManager},
     * making it easy to reuse elsewhere.
     *
     * Note that when store is instatiated by Controller, the storeId will be overridden by the name of the store.
     */

    /**
     * @cfg {Object[]} fields
     * This may be used in place of specifying a {@link #model} configuration. The fields should be a
     * set of {@link Ext.data.Field} configuration objects. The store will automatically create a {@link Ext.data.Model}
     * with these fields. In general this configuration option should only be used for simple stores like
     * a two-field store of ComboBox. For anything more complicated, such as specifying a particular id property or
     * associations, a {@link Ext.data.Model} should be defined and specified for the {@link #model}
     * config.
     */

    /**
     * @cfg {String} model
     * Name of the {@link Ext.data.Model Model} associated with this store.
     * The string is used as an argument for {@link Ext.ModelManager#getModel}.
     */

    /**
     * @cfg {Object[]/Function[]} filters
     * Array of {@link Ext.util.Filter Filters} for this store. Can also be passed array of
     * functions which will be used as the {@link Ext.util.Filter#filterFn filterFn} config
     * for filters:
     * 
     *     filters: [
     *         function(item) {
     *             return item.internalId > 0;
     *         }
     *     ]
     *
     * To filter after the grid is loaded use the {@link Ext.data.Store#filterBy filterBy} function.
     */

    sortRoot: 'data',

    //documented above
    constructor: function(config) {
        var me = this,
            filters;

        /**
         * @event add
         * Fired when a Model instance has been added to this Store
         * @param {Ext.data.Store} store The store
         * @param {Ext.data.Model[]} records The Model instances that were added
         * @param {Number} index The index at which the instances were inserted
         */

        /**
         * @event remove
         * Fired when a Model instance has been removed from this Store
         * @param {Ext.data.Store} store The Store object
         * @param {Ext.data.Model} record The record that was removed
         * @param {Number} index The index of the record that was removed
         */

        /**
         * @event update
         * Fires when a Model instance has been updated
         * @param {Ext.data.Store} this
         * @param {Ext.data.Model} record The Model instance that was updated
         * @param {String} operation The update operation being performed. Value may be one of:
         *
         *     Ext.data.Model.EDIT
         *     Ext.data.Model.REJECT
         *     Ext.data.Model.COMMIT
         * @param {String[]} modifiedFieldNames Array of field names changed during edit.
         */

        /**
         * @event datachanged
         * Fires whenever the records in the Store have changed in some way - this could include adding or removing
         * records, or updating the data in existing records
         * @param {Ext.data.Store} this The data store
         */
        
        /**
         * @event refresh
         * Fires when the data cache has changed in a bulk manner (e.g., it has been sorted, filtered, etc.) and a
         * widget that is using this Store as a Record cache should refresh its view.
         * @param {Ext.data.Store} this The data store
         */

        /**
         * @event beforeload
         * Fires before a request is made for a new data object. If the beforeload handler returns false the load
         * action will be canceled.
         * @param {Ext.data.Store} store This Store
         * @param {Ext.data.Operation} operation The Ext.data.Operation object that will be passed to the Proxy to
         * load the Store
         */

        /**
         * @event load
         * Fires whenever the store reads data from a remote data source.
         * @param {Ext.data.Store} this
         * @param {Ext.data.Model[]} records An array of records
         * @param {Boolean} successful True if the operation was successful.
         */

        /**
         * @event write
         * Fires whenever a successful write has been made via the configured {@link #proxy Proxy}
         * @param {Ext.data.Store} store This Store
         * @param {Ext.data.Operation} operation The {@link Ext.data.Operation Operation} object that was used in
         * the write
         */

        /**
         * @event beforesync
         * Fired before a call to {@link #sync} is executed. Return false from any listener to cancel the sync
         * @param {Object} options Hash of all records to be synchronized, broken down into create, update and destroy
         */
        /**
         * @event clear
         * Fired after the {@link #removeAll} method is called.
         * @param {Ext.data.Store} this
         */
        /**
         * @event metachange
         * Fires when this store's underlying reader (available via the proxy) provides new metadata.
         * Metadata usually consists of new field definitions, but can include any configuration data
         * required by an application, and can be processed as needed in the event handler.
         * This event is currently only fired for JsonReaders.
         * @param {Ext.data.Store} this
         * @param {Object} meta The JSON metadata
         */

        Ext.apply(me, config);
        // don't use *config* anymore from here on... use *me* instead...

        /**
         * Temporary cache in which removed model instances are kept until successfully synchronised with a Proxy,
         * at which point this is cleared.
         * @protected
         * @property {Ext.data.Model[]} removed
         */
        me.removed = [];

        me.mixins.observable.constructor.apply(me, arguments);

        var configModel = me.model;

        me.model = Ext.ModelManager.getModel(me.model);

        /**
         * @property {Object} modelDefaults
         * @private
         * A set of default values to be applied to every model instance added via {@link Ext.data.Store#insert insert} or created
         * via {@link Ext.data.Store#createModel createModel}. This is used internally by associations to set foreign keys and
         * other fields. See the Association classes source code for examples. This should not need to be used by application developers.
         */
        Ext.applyIf(me, {
            modelDefaults: {}
        });

        //Supports the 3.x style of simply passing an array of fields to the store, implicitly creating a model
        if (!me.model && me.fields) {
            me.model = Ext.define('Ext.data.Store.ImplicitModel-' + (me.storeId || Ext.id()), {
                extend: 'Ext.data.Model',
                fields: me.fields,
                proxy: me.proxy || me.defaultProxyType
            });

            delete me.fields;

            me.implicitModel = true;
        }

        if (!me.model && me.useModelWarning !== false) {
            // There are a number of ways things could have gone wrong, try to give as much information as possible
            var logMsg = [
                Ext.getClassName(me) || 'Store',
                ' created with no model.'
            ];

            if (typeof configModel === 'string') {
                logMsg.push(" The name '", configModel, "'", ' does not correspond to a valid model.');
            }

            Ext.log.warn(logMsg.join(''));
        }

        //ensures that the Proxy is instantiated correctly
        me.setProxy(me.proxy || me.model.getProxy());

        me.proxy.on('metachange', me.onMetaChange, me);

        if (me.id && !me.storeId) {
            me.storeId = me.id;
            delete me.id;
        }

        if (me.storeId) {
            Ext.data.StoreManager.register(me);
        }

        me.mixins.sortable.initSortable.call(me);

        /**
         * @property {Ext.util.MixedCollection} filters
         * The collection of {@link Ext.util.Filter Filters} currently applied to this Store
         */
        filters = me.decodeFilters(me.filters);
        me.filters = new Ext.util.MixedCollection();
        me.filters.addAll(filters);
    },

    /**
     * Sets the Store's Proxy by string, config object or Proxy instance
     * @param {String/Object/Ext.data.proxy.Proxy} proxy The new Proxy, which can be either a type string, a configuration object
     * or an Ext.data.proxy.Proxy instance
     * @return {Ext.data.proxy.Proxy} The attached Proxy object
     */
    setProxy: function(proxy) {
        var me = this;

        if (proxy instanceof Ext.data.proxy.Proxy) {
            proxy.setModel(me.model);
        } else {
            if (Ext.isString(proxy)) {
                proxy = {
                    type: proxy
                };
            }
            Ext.applyIf(proxy, {
                model: me.model
            });

            proxy = Ext.createByAlias('proxy.' + proxy.type, proxy);
        }

        me.proxy = proxy;

        return me.proxy;
    },

    /**
     * Returns the proxy currently attached to this proxy instance
     * @return {Ext.data.proxy.Proxy} The Proxy instance
     */
    getProxy: function() {
        return this.proxy;
    },

    // private
    onMetaChange: function(proxy, meta) {
        this.fireEvent('metachange', this, meta);
    },

    //saves any phantom records
    create: function(data, options) {
        var me = this,
            instance = Ext.ModelManager.create(Ext.applyIf(data, me.modelDefaults), me.model.modelName),
            operation;

        options = options || {};

        Ext.applyIf(options, {
            action : 'create',
            records: [instance]
        });

        operation = new Ext.data.Operation(options);

        me.proxy.create(operation, me.onProxyWrite, me);

        return instance;
    },

    read: function() {
        return this.load.apply(this, arguments);
    },

    update: function(options) {
        var me = this,
            operation;
        options = options || {};

        Ext.applyIf(options, {
            action : 'update',
            records: me.getUpdatedRecords()
        });

        operation = new Ext.data.Operation(options);

        return me.proxy.update(operation, me.onProxyWrite, me);
    },

    /**
     * @private
     * Callback for any write Operation over the Proxy. Updates the Store's MixedCollection to reflect
     * the updates provided by the Proxy
     */
    onProxyWrite: function(operation) {
        var me = this,
            success = operation.wasSuccessful(),
            records = operation.getRecords();

        switch (operation.action) {
            case 'create':
                me.onCreateRecords(records, operation, success);
                break;
            case 'update':
                me.onUpdateRecords(records, operation, success);
                break;
            case 'destroy':
                me.onDestroyRecords(records, operation, success);
                break;
        }

        if (success) {
            me.fireEvent('write', me, operation);
            me.fireEvent('datachanged', me);
            me.fireEvent('refresh', me);
        }
        //this is a callback that would have been passed to the 'create', 'update' or 'destroy' function and is optional
        Ext.callback(operation.callback, operation.scope || me, [records, operation, success]);
    },
    
    // may be implemented by store subclasses
    onCreateRecords: Ext.emptyFn,
    
    // may be implemented by store subclasses
    onUpdateRecords: Ext.emptyFn,
    
    /**
     * Removes any records when a write is returned from the server.
     * @private
     * @param {Ext.data.Model[]} records The array of removed records
     * @param {Ext.data.Operation} operation The operation that just completed
     * @param {Boolean} success True if the operation was successful
     */
    onDestroyRecords: function(records, operation, success) {
        if (success) {
            this.removed = [];
        }
    },

    //tells the attached proxy to destroy the given records
    destroy: function(options) {
        var me = this,
            operation;

        options = options || {};

        Ext.applyIf(options, {
            action : 'destroy',
            records: me.getRemovedRecords()
        });

        operation = new Ext.data.Operation(options);

        return me.proxy.destroy(operation, me.onProxyWrite, me);
    },

    /**
     * @private
     * Attached as the 'operationcomplete' event listener to a proxy's Batch object. By default just calls through
     * to onProxyWrite.
     */
    onBatchOperationComplete: function(batch, operation) {
        return this.onProxyWrite(operation);
    },

    /**
     * @private
     * Attached as the 'complete' event listener to a proxy's Batch object. Iterates over the batch operations
     * and updates the Store's internal data MixedCollection.
     */
    onBatchComplete: function(batch, operation) {
        var me = this,
            operations = batch.operations,
            length = operations.length,
            i;

        me.suspendEvents();

        for (i = 0; i < length; i++) {
            me.onProxyWrite(operations[i]);
        }

        me.resumeEvents();

        me.fireEvent('datachanged', me);
        me.fireEvent('refresh', me);
    },

    /**
     * @private
     */
    onBatchException: function(batch, operation) {
        // //decide what to do... could continue with the next operation
        // batch.start();
        //
        // //or retry the last operation
        // batch.retry();
    },

    /**
     * @private
     * Filter function for new records.
     */
    filterNew: function(item) {
        // only want phantom records that are valid
        return item.phantom === true && item.isValid();
    },

    /**
     * Returns all Model instances that are either currently a phantom (e.g. have no id), or have an ID but have not
     * yet been saved on this Store (this happens when adding a non-phantom record from another Store into this one)
     * @return {Ext.data.Model[]} The Model instances
     */
    getNewRecords: function() {
        return [];
    },

    /**
     * Returns all Model instances that have been updated in the Store but not yet synchronized with the Proxy
     * @return {Ext.data.Model[]} The updated Model instances
     */
    getUpdatedRecords: function() {
        return [];
    },

    /**
     * Gets all {@link Ext.data.Model records} added or updated since the last commit. Note that the order of records
     * returned is not deterministic and does not indicate the order in which records were modified. Note also that
     * removed records are not included (use {@link #getRemovedRecords} for that).
     * @return {Ext.data.Model[]} The added and updated Model instances
     */
    getModifiedRecords : function(){
        return [].concat(this.getNewRecords(), this.getUpdatedRecords());
    },
    
    /**
     * @private
     * Filter function for updated records.
     */
    filterUpdated: function(item) {
        // only want dirty records, not phantoms that are valid
        return item.dirty === true && item.phantom !== true && item.isValid();
    },

    /**
     * Returns any records that have been removed from the store but not yet destroyed on the proxy.
     * @return {Ext.data.Model[]} The removed Model instances
     */
    getRemovedRecords: function() {
        return this.removed;
    },

    filter: function(filters, value) {

    },

    /**
     * @private
     * Normalizes an array of filter objects, ensuring that they are all Ext.util.Filter instances
     * @param {Object[]} filters The filters array
     * @return {Ext.util.Filter[]} Array of Ext.util.Filter objects
     */
    decodeFilters: function(filters) {
        if (!Ext.isArray(filters)) {
            if (filters === undefined) {
                filters = [];
            } else {
                filters = [filters];
            }
        }

        var length = filters.length,
            Filter = Ext.util.Filter,
            config, i;

        for (i = 0; i < length; i++) {
            config = filters[i];

            if (!(config instanceof Filter)) {
                Ext.apply(config, {
                    root: 'data'
                });

                //support for 3.x style filters where a function can be defined as 'fn'
                if (config.fn) {
                    config.filterFn = config.fn;
                }

                //support a function to be passed as a filter definition
                if (typeof config == 'function') {
                    config = {
                        filterFn: config
                    };
                }

                filters[i] = new Filter(config);
            }
        }

        return filters;
    },

    clearFilter: function(supressEvent) {

    },

    isFiltered: function() {

    },

    filterBy: function(fn, scope) {

    },

    /**
     * Synchronizes the store with its {@link #proxy}. This asks the proxy to batch together any new, updated
     * and deleted records in the store, updating the store's internal representation of the records
     * as each operation completes.
     * 
     * @param {Object} [options] Object containing one or more properties supported by the sync method (these get 
     * passed along to the underlying proxy's {@link Ext.data.Proxy#batch batch} method):
     * 
     * @param {Ext.data.Batch/Object} [options.batch] A {@link Ext.data.Batch} object (or batch config to apply 
     * to the created batch). If unspecified a default batch will be auto-created as needed.
     * 
     * @param {Function} [options.callback] The function to be called upon completion of the sync.
     * The callback is called regardless of success or failure and is passed the following parameters:
     * @param {Ext.data.Batch} options.callback.batch The {@link Ext.data.Batch batch} that was processed,
     * containing all operations in their current state after processing
     * @param {Object} options.callback.options The options argument that was originally passed into sync
     * 
     * @param {Function} [options.success] The function to be called upon successful completion of the sync. The 
     * success function is called only if no exceptions were reported in any operations. If one or more exceptions
     * occurred then the failure function will be called instead. The success function is called 
     * with the following parameters:
     * @param {Ext.data.Batch} options.success.batch The {@link Ext.data.Batch batch} that was processed,
     * containing all operations in their current state after processing
     * @param {Object} options.success.options The options argument that was originally passed into sync
     * 
     * @param {Function} [options.failure] The function to be called upon unsuccessful completion of the sync. The 
     * failure function is called when one or more operations returns an exception during processing (even if some
     * operations were also successful). In this case you can check the batch's {@link Ext.data.Batch#exceptions 
     * exceptions} array to see exactly which operations had exceptions. The failure function is called with the 
     * following parameters:
     * @param {Ext.data.Batch} options.failure.batch The {@link Ext.data.Batch} that was processed, containing all
     * operations in their current state after processing
     * @param {Object} options.failure.options The options argument that was originally passed into sync
     * 
     * @param {Object} [options.scope] The scope in which to execute any callbacks (i.e. the `this` object inside
     * the callback, success and/or failure functions). Defaults to the store's proxy.
     * 
     * @return {Ext.data.Store} this
     */
    sync: function(options) {
        var me = this,
            operations = {},
            toCreate = me.getNewRecords(),
            toUpdate = me.getUpdatedRecords(),
            toDestroy = me.getRemovedRecords(),
            needsSync = false;

        if (toCreate.length > 0) {
            operations.create = toCreate;
            needsSync = true;
        }

        if (toUpdate.length > 0) {
            operations.update = toUpdate;
            needsSync = true;
        }

        if (toDestroy.length > 0) {
            operations.destroy = toDestroy;
            needsSync = true;
        }

        if (needsSync && me.fireEvent('beforesync', operations) !== false) {
            options = options || {};

            me.proxy.batch(Ext.apply(options, {
                operations: operations,
                listeners: me.getBatchListeners()
            }));
        }
        
        return me;
    },
    
    /**
     * @private
     * Returns an object which is passed in as the listeners argument to proxy.batch inside this.sync.
     * This is broken out into a separate function to allow for customisation of the listeners
     * @return {Object} The listeners object
     */
    getBatchListeners: function() {
        var me = this,
            listeners = {
                scope: me,
                exception: me.onBatchException
            };

        if (me.batchUpdateMode == 'operation') {
            listeners.operationcomplete = me.onBatchOperationComplete;
        } else {
            listeners.complete = me.onBatchComplete;
        }

        return listeners;
    },

    /**
     * Saves all pending changes via the configured {@link #proxy}. Use {@link #sync} instead.
     * @deprecated 4.0.0 Will be removed in the next major version
     */
    save: function() {
        return this.sync.apply(this, arguments);
    },

    /**
     * Loads the Store using its configured {@link #proxy}.
     * @param {Object} options (optional) config object. This is passed into the {@link Ext.data.Operation Operation}
     * object that is created and then sent to the proxy's {@link Ext.data.proxy.Proxy#read} function
     * 
     * @return {Ext.data.Store} this
     */
    load: function(options) {
        var me = this,
            operation;

        options = Ext.apply({
            action: 'read',
            filters: me.filters.items,
            sorters: me.getSorters()
        }, options);
        me.lastOptions = options;

        operation = new Ext.data.Operation(options);

        if (me.fireEvent('beforeload', me, operation) !== false) {
            me.loading = true;
            me.proxy.read(operation, me.onProxyLoad, me);
        }

        return me;
    },

    /**
     * Reloads the store using the last options passed to the {@link #method-load} method.
     * @param {Object} options A config object which contains options which may override the options passed to the previous load call.
     */
    reload: function(options) {
        return this.load(Ext.apply(this.lastOptions, options));
    },

    /**
     * @private
     * A model instance should call this method on the Store it has been {@link Ext.data.Model#join joined} to.
     * @param {Ext.data.Model} record The model instance that was edited
     * @param {String[]} modifiedFieldNames Array of field names changed during edit.
     */
    afterEdit : function(record, modifiedFieldNames) {
        var me = this,
            i, shouldSync;

        if (me.autoSync && !me.autoSyncSuspended) {
            for (i = modifiedFieldNames.length; i--;) {
                // only sync if persistent fields were modified
                if (record.fields.get(modifiedFieldNames[i]).persist) {
                    shouldSync = true;
                    break;
                }
            }
            if (shouldSync) {
                me.sync();
            }
        }

        me.fireEvent('update', me, record, Ext.data.Model.EDIT, modifiedFieldNames);
    },

    /**
     * @private
     * A model instance should call this method on the Store it has been {@link Ext.data.Model#join joined} to..
     * @param {Ext.data.Model} record The model instance that was edited
     */
    afterReject : function(record) {
        // Must pass the 5th param (modifiedFieldNames) as null, otherwise the
        // event firing machinery appends the listeners "options" object to the arg list
        // which may get used as the modified fields array by a handler.
        // This array is used for selective grid cell updating by Grid View.
        // Null will be treated as though all cells need updating.
        this.fireEvent('update', this, record, Ext.data.Model.REJECT, null);
    },

    /**
     * @private
     * A model instance should call this method on the Store it has been {@link Ext.data.Model#join joined} to.
     * @param {Ext.data.Model} record The model instance that was edited
     */
    afterCommit : function(record) {
        // Must pass the 5th param (modifiedFieldNames) as null, otherwise the
        // event firing machinery appends the listeners "options" object to the arg list
        // which may get used as the modified fields array by a handler.
        // This array is used for selective grid cell updating by Grid View.
        // Null will be treated as though all cells need updating.
        this.fireEvent('update', this, record, Ext.data.Model.COMMIT, null);
    },

    // private
    destroyStore: function() {
        var me = this;

        if (!me.isDestroyed) {
            if (me.storeId) {
                Ext.data.StoreManager.unregister(me);
            }
            me.clearData();
            me.data = me.tree = me.sorters = me.filters = me.groupers = null;
            if (me.reader) {
                me.reader.destroyReader();
            }
            me.proxy = me.reader = me.writer = null;
            me.clearListeners();
            me.isDestroyed = true;

            if (me.implicitModel) {
                Ext.destroy(me.model);
            } else {
                me.model = null;
            }
        }
    },

    // private
    doSort: function(sorterFn) {
        var me = this;
        if (me.remoteSort) {
            //the load function will pick up the new sorters and request the sorted data from the proxy
            me.load();
        } else {
            me.data.sortBy(sorterFn);
            me.fireEvent('datachanged', me);
            me.fireEvent('refresh', me);
        }
    },

    // to be implemented by subclasses
    clearData: Ext.emptyFn,
    
    // to be implemented by subclasses
    getCount: Ext.emptyFn,

    // to be implemented by subclasses
    getById: Ext.emptyFn,

    /**
     * Removes all records from the store. This method does a "fast remove",
     * individual remove events are not called. The {@link #clear} event is
     * fired upon completion.
     * @method
     */
    removeAll: Ext.emptyFn,
    // individual store subclasses should implement a "fast" remove
    // and fire a clear event afterwards

    /**
     * Returns true if the Store is currently performing a load operation
     * @return {Boolean} True if the Store is currently loading
     */
    isLoading: function() {
        return !!this.loading;
    },

    /**
     * Suspends automatically syncing the Store with its Proxy.  Only applicable if {@link #autoSync} is `true`
     */
    suspendAutoSync: function() {
        this.autoSyncSuspended = true;
    },

    /**
     * Resumes automatically syncing the Store with its Proxy.  Only applicable if {@link #autoSync} is `true`
     */
    resumeAutoSync: function() {
        this.autoSyncSuspended = false;
    }

});

/**
 * @author Ed Spencer
 * @class Ext.data.Errors
 *
 * <p>Wraps a collection of validation error responses and provides convenient functions for
 * accessing and errors for specific fields.</p>
 *
 * <p>Usually this class does not need to be instantiated directly - instances are instead created
 * automatically when {@link Ext.data.Model#validate validate} on a model instance:</p>
 *
<pre><code>
//validate some existing model instance - in this case it returned 2 failures messages
var errors = myModel.validate();

errors.isValid(); //false

errors.length; //2
errors.getByField('name');  // [{field: 'name',  message: 'must be present'}]
errors.getByField('title'); // [{field: 'title', message: 'is too short'}]
</code></pre>
 */
Ext.define('Ext.data.Errors', {
    extend: 'Ext.util.MixedCollection',

    /**
     * Returns true if there are no errors in the collection
     * @return {Boolean}
     */
    isValid: function() {
        return this.length === 0;
    },

    /**
     * Returns all of the errors for the given field
     * @param {String} fieldName The field to get errors for
     * @return {Object[]} All errors for the given field
     */
    getByField: function(fieldName) {
        var errors = [],
            error, field, i;

        for (i = 0; i < this.length; i++) {
            error = this.items[i];

            if (error.field == fieldName) {
                errors.push(error);
            }
        }

        return errors;
    }
});

/**
 * @author Ed Spencer
 *
 * A Model represents some object that your application manages. For example, one might define a Model for Users,
 * Products, Cars, or any other real-world object that we want to model in the system. Models are registered via the
 * {@link Ext.ModelManager model manager}, and are used by {@link Ext.data.Store stores}, which are in turn used by many
 * of the data-bound components in Ext.
 *
 * Models are defined as a set of fields and any arbitrary methods and properties relevant to the model. For example:
 *
 *     Ext.define('User', {
 *         extend: 'Ext.data.Model',
 *         fields: [
 *             {name: 'name',  type: 'string'},
 *             {name: 'age',   type: 'int', convert: null},
 *             {name: 'phone', type: 'string'},
 *             {name: 'alive', type: 'boolean', defaultValue: true, convert: null}
 *         ],
 *
 *         changeName: function() {
 *             var oldName = this.get('name'),
 *                 newName = oldName + " The Barbarian";
 *
 *             this.set('name', newName);
 *         }
 *     });
 *
 * The fields array is turned into a {@link Ext.util.MixedCollection MixedCollection} automatically by the {@link
 * Ext.ModelManager ModelManager}, and all other functions and properties are copied to the new Model's prototype.
 * 
 * By default, the built in numeric and boolean field types have a (@link Ext.data.Field#convert} function which coerces string
 * values in raw data into the field's type. For better performance with {@link Ext.data.reader.Json Json} or {@link Ext.data.reader.Array Array}
 * readers *if you are in control of the data fed into this Model*, you can null out the default convert function which will cause
 * the raw property to be copied directly into the Field's value.
 *
 * Now we can create instances of our User model and call any model logic we defined:
 *
 *     var user = Ext.create('User', {
 *         name : 'Conan',
 *         age  : 24,
 *         phone: '555-555-5555'
 *     });
 *
 *     user.changeName();
 *     user.get('name'); //returns "Conan The Barbarian"
 *
 * # Validations
 *
 * Models have built-in support for validations, which are executed against the validator functions in {@link
 * Ext.data.validations} ({@link Ext.data.validations see all validation functions}). Validations are easy to add to
 * models:
 *
 *     Ext.define('User', {
 *         extend: 'Ext.data.Model',
 *         fields: [
 *             {name: 'name',     type: 'string'},
 *             {name: 'age',      type: 'int'},
 *             {name: 'phone',    type: 'string'},
 *             {name: 'gender',   type: 'string'},
 *             {name: 'username', type: 'string'},
 *             {name: 'alive',    type: 'boolean', defaultValue: true}
 *         ],
 *
 *         validations: [
 *             {type: 'presence',  field: 'age'},
 *             {type: 'length',    field: 'name',     min: 2},
 *             {type: 'inclusion', field: 'gender',   list: ['Male', 'Female']},
 *             {type: 'exclusion', field: 'username', list: ['Admin', 'Operator']},
 *             {type: 'format',    field: 'username', matcher: /([a-z]+)[0-9]{2,3}/}
 *         ]
 *     });
 *
 * The validations can be run by simply calling the {@link #validate} function, which returns a {@link Ext.data.Errors}
 * object:
 *
 *     var instance = Ext.create('User', {
 *         name: 'Ed',
 *         gender: 'Male',
 *         username: 'edspencer'
 *     });
 *
 *     var errors = instance.validate();
 *
 * # Associations
 *
 * Models can have associations with other Models via {@link Ext.data.association.HasOne},
 * {@link Ext.data.association.BelongsTo belongsTo} and {@link Ext.data.association.HasMany hasMany} associations.
 * For example, let's say we're writing a blog administration application which deals with Users, Posts and Comments.
 * We can express the relationships between these models like this:
 *
 *     Ext.define('Post', {
 *         extend: 'Ext.data.Model',
 *         fields: ['id', 'user_id'],
 *
 *         belongsTo: 'User',
 *         hasMany  : {model: 'Comment', name: 'comments'}
 *     });
 *
 *     Ext.define('Comment', {
 *         extend: 'Ext.data.Model',
 *         fields: ['id', 'user_id', 'post_id'],
 *
 *         belongsTo: 'Post'
 *     });
 *
 *     Ext.define('User', {
 *         extend: 'Ext.data.Model',
 *         fields: ['id'],
 *
 *         hasMany: [
 *             'Post',
 *             {model: 'Comment', name: 'comments'}
 *         ]
 *     });
 *
 * See the docs for {@link Ext.data.association.HasOne}, {@link Ext.data.association.BelongsTo} and
 * {@link Ext.data.association.HasMany} for details on the usage and configuration of associations.
 * Note that associations can also be specified like this:
 *
 *     Ext.define('User', {
 *         extend: 'Ext.data.Model',
 *         fields: ['id'],
 *
 *         associations: [
 *             {type: 'hasMany', model: 'Post',    name: 'posts'},
 *             {type: 'hasMany', model: 'Comment', name: 'comments'}
 *         ]
 *     });
 *
 * # Using a Proxy
 *
 * Models are great for representing types of data and relationships, but sooner or later we're going to want to load or
 * save that data somewhere. All loading and saving of data is handled via a {@link Ext.data.proxy.Proxy Proxy}, which
 * can be set directly on the Model:
 *
 *     Ext.define('User', {
 *         extend: 'Ext.data.Model',
 *         fields: ['id', 'name', 'email'],
 *
 *         proxy: {
 *             type: 'rest',
 *             url : '/users'
 *         }
 *     });
 *
 * Here we've set up a {@link Ext.data.proxy.Rest Rest Proxy}, which knows how to load and save data to and from a
 * RESTful backend. Let's see how this works:
 *
 *     var user = Ext.create('User', {name: 'Ed Spencer', email: 'ed@sencha.com'});
 *
 *     user.save(); //POST /users
 *
 * Calling {@link #save} on the new Model instance tells the configured RestProxy that we wish to persist this Model's
 * data onto our server. RestProxy figures out that this Model hasn't been saved before because it doesn't have an id,
 * and performs the appropriate action - in this case issuing a POST request to the url we configured (/users). We
 * configure any Proxy on any Model and always follow this API - see {@link Ext.data.proxy.Proxy} for a full list.
 *
 * Loading data via the Proxy is equally easy:
 *
 *     //get a reference to the User model class
 *     var User = Ext.ModelManager.getModel('User');
 *
 *     //Uses the configured RestProxy to make a GET request to /users/123
 *     User.load(123, {
 *         success: function(user) {
 *             console.log(user.getId()); //logs 123
 *         }
 *     });
 *
 * Models can also be updated and destroyed easily:
 *
 *     //the user Model we loaded in the last snippet:
 *     user.set('name', 'Edward Spencer');
 *
 *     //tells the Proxy to save the Model. In this case it will perform a PUT request to /users/123 as this Model already has an id
 *     user.save({
 *         success: function() {
 *             console.log('The User was updated');
 *         }
 *     });
 *
 *     //tells the Proxy to destroy the Model. Performs a DELETE request to /users/123
 *     user.destroy({
 *         success: function() {
 *             console.log('The User was destroyed!');
 *         }
 *     });
 *
 * # Usage in Stores
 *
 * It is very common to want to load a set of Model instances to be displayed and manipulated in the UI. We do this by
 * creating a {@link Ext.data.Store Store}:
 *
 *     var store = Ext.create('Ext.data.Store', {
 *         model: 'User'
 *     });
 *
 *     //uses the Proxy we set up on Model to load the Store data
 *     store.load();
 *
 * A Store is just a collection of Model instances - usually loaded from a server somewhere. Store can also maintain a
 * set of added, updated and removed Model instances to be synchronized with the server via the Proxy. See the {@link
 * Ext.data.Store Store docs} for more information on Stores.
 */
Ext.define('Ext.data.Model', {
    alternateClassName: 'Ext.data.Record',

    mixins: {
        observable: 'Ext.util.Observable'
    },
    
    requires: [
        'Ext.ModelManager',
        'Ext.data.IdGenerator',
        'Ext.data.Field',
        'Ext.data.Errors',
        'Ext.data.Operation',
        'Ext.data.validations',
        'Ext.util.MixedCollection'
    ],

    compareConvertFields: function(f1, f2) {
        var f1SpecialConvert = f1.convert && f1.type && f1.convert !== f1.type.convert,
            f2SpecialConvert = f2.convert && f2.type && f2.convert !== f2.type.convert;

        if (f1SpecialConvert && !f2SpecialConvert) {
            return 1;
        }

        if (!f1SpecialConvert && f2SpecialConvert) {
            return -1;
        }
        return 0;
    },

    itemNameFn: function(item) {
        return item.name;
    },

    onClassExtended: function(cls, data, hooks) {
        var onBeforeClassCreated = hooks.onBeforeCreated;

        hooks.onBeforeCreated = function(cls, data) {
            var me = this,
                name = Ext.getClassName(cls),
                prototype = cls.prototype,
                superCls = cls.prototype.superclass,

                validations = data.validations || [],
                fields = data.fields || [],
                field,
                associationsConfigs = data.associations || [],
                addAssociations = function(items, type) {
                    var i = 0,
                        len,
                        item;

                    if (items) {
                        items = Ext.Array.from(items);

                        for (len = items.length; i < len; ++i) {
                            item = items[i];

                            if (!Ext.isObject(item)) {
                                item = {model: item};
                            }

                            item.type = type;
                            associationsConfigs.push(item);
                        }
                    }
                },
                idgen = data.idgen,

                fieldsMixedCollection = new Ext.util.MixedCollection(false, prototype.itemNameFn),

                associationsMixedCollection = new Ext.util.MixedCollection(false, prototype.itemNameFn),

                superValidations = superCls.validations,
                superFields = superCls.fields,
                superAssociations = superCls.associations,

                associationConfig, i, ln,
                dependencies = [],
                idProperty = data.idProperty || cls.prototype.idProperty,

                // Process each Field upon add into the collection
                onFieldAddReplace = function(arg0, arg1, arg2) {
                    var newField,
                        pos;

                    if (fieldsMixedCollection.events.add.firing) {
                        // Add event signature is (position, value, key);
                        pos = arg0;
                        newField  = arg1;
                    } else {
                        // Replace event signature is (key, oldValue, newValue);
                        newField = arg2;
                        pos = arg1.originalIndex;
                    }

                    // Set the originalIndex for ArrayReader to get the default mapping from in case
                    // compareConvertFields changes the order due to some fields having custom convert functions.
                    newField.originalIndex = pos;

                    // The field(s) which encapsulates the idProperty must never have a default value set
                    // if no value arrives from the server side. So override any possible prototype-provided
                    // defaultValue with undefined which will inhibit generation of defaulting code in Reader.buildRecordDataExtractor
                    if (newField.mapping === idProperty || (newField.mapping == null && newField.name === idProperty)) {
                        newField.defaultValue = undefined;
                    }
                },

                // Use the proxy from the class definition object if present, otherwise fall back to the inherited one, or the default    
                clsProxy = data.proxy || cls.prototype.proxy || cls.prototype.defaultProxyType,

                // Sort upon add function to be used in case of dynamically added Fields
                fieldConvertSortFn = function() {
                    fieldsMixedCollection.sortBy(prototype.compareConvertFields);
                };

            // Save modelName on class and its prototype
            cls.modelName = name;
            prototype.modelName = name;

            // Merge the validations of the superclass and the new subclass
            if (superValidations) {
                validations = superValidations.concat(validations);
            }

            data.validations = validations;

            // Merge the fields of the superclass and the new subclass
            if (superFields) {
                fields = superFields.items.concat(fields);
            }

            fieldsMixedCollection.on({
                add:     onFieldAddReplace,
                replace: onFieldAddReplace
            });  

            for (i = 0, ln = fields.length; i < ln; ++i) {
                field = fields[i];
                fieldsMixedCollection.add(field.isField ? field : new Ext.data.Field(field));
            }
            if (!fieldsMixedCollection.get(idProperty)) {
                fieldsMixedCollection.add(new Ext.data.Field(idProperty));
            }

            // Ensure the Fields are on correct order: Fields with custom convert function last
            fieldConvertSortFn();
            fieldsMixedCollection.on({
                add:     fieldConvertSortFn,
                replace: fieldConvertSortFn
            });

            data.fields = fieldsMixedCollection;

            if (idgen) {
                data.idgen = Ext.data.IdGenerator.get(idgen);
            }

            //associations can be specified in the more convenient format (e.g. not inside an 'associations' array).
            //we support that here
            addAssociations(data.belongsTo, 'belongsTo');
            delete data.belongsTo;
            addAssociations(data.hasMany, 'hasMany');
            delete data.hasMany;
            addAssociations(data.hasOne, 'hasOne');
            delete data.hasOne;

            if (superAssociations) {
                associationsConfigs = superAssociations.items.concat(associationsConfigs);
            }

            for (i = 0, ln = associationsConfigs.length; i < ln; ++i) {
                dependencies.push('association.' + associationsConfigs[i].type.toLowerCase());
            }

            // If we have not been supplied with a Proxy *instance*, then add the proxy type to our dependency list
            if (clsProxy && !clsProxy.isProxy) {
                if (typeof clsProxy !== 'string' && !clsProxy.type) {
                    Ext.log.warn(name + ': proxy type is ' + clsProxy.type);
                }

                dependencies.push('proxy.' + (typeof clsProxy === 'string' ? clsProxy : clsProxy.type));
            }

            Ext.require(dependencies, function() {
                Ext.ModelManager.registerType(name, cls);

                for (i = 0, ln = associationsConfigs.length; i < ln; ++i) {
                    associationConfig = associationsConfigs[i];
                    if (associationConfig.isAssociation) {
                        associationConfig = Ext.applyIf({
                            ownerModel: name,
                            associatedModel: associationConfig.model
                        }, associationConfig.initialConfig);
                    } else {
                        Ext.apply(associationConfig, {
                            ownerModel: name,
                            associatedModel: associationConfig.model
                        });
                    }

                    if (Ext.ModelManager.getModel(associationConfig.model) === undefined) {
                        Ext.ModelManager.registerDeferredAssociation(associationConfig);
                    } else {
                        associationsMixedCollection.add(Ext.data.association.Association.create(associationConfig));
                    }
                }

                data.associations = associationsMixedCollection;

                // onBeforeCreated may get called *asynchronously* if any of those required classes caused
                // an asynchronous script load. This would mean that the class definition object
                // has not been applied to the prototype when the Model definition has returned.
                // The Reader constructor does not attempt to buildExtractors if the fields MixedCollection
                // has not yet been set. The cls.setProxy call triggers a build of extractor methods.
                onBeforeClassCreated.call(me, cls, data, hooks);

                cls.setProxy(clsProxy);

                // Fire the onModelDefined template method on ModelManager
                Ext.ModelManager.onModelDefined(cls);
            });
        };
    },

    inheritableStatics: {
        /**
         * Sets the Proxy to use for this model. Accepts any options that can be accepted by
         * {@link Ext#createByAlias Ext.createByAlias}.
         * @param {String/Object/Ext.data.proxy.Proxy} proxy The proxy
         * @return {Ext.data.proxy.Proxy}
         * @static
         * @inheritable
         */
        setProxy: function(proxy) {
            //make sure we have an Ext.data.proxy.Proxy object
            if (!proxy.isProxy) {
                if (typeof proxy == "string") {
                    proxy = {
                        type: proxy
                    };
                }
                proxy = Ext.createByAlias("proxy." + proxy.type, proxy);
            }
            proxy.setModel(this);
            this.proxy = this.prototype.proxy = proxy;

            return proxy;
        },

        /**
         * Returns the configured Proxy for this Model
         * @return {Ext.data.proxy.Proxy} The proxy
         * @static
         * @inheritable
         */
        getProxy: function() {
            return this.proxy;
        },

        /**
         * Apply a new set of field and/or property definitions to the existing model. This will replace any existing
         * fields, including fields inherited from superclasses. Mainly for reconfiguring the
         * model based on changes in meta data (called from Reader's onMetaChange method).
         * @static
         * @inheritable
         */
        setFields: function(fields, idProperty, clientIdProperty) {
            var me = this,
                proto = me.prototype,
                prototypeFields = proto.fields,
                len = fields ? fields.length : 0,
                i = 0;


            if (idProperty) {
                proto.idProperty = idProperty;
            }
            if (clientIdProperty) {
                proto.clientIdProperty = clientIdProperty;
            }

            if (prototypeFields) {
                prototypeFields.clear();
            }
            else {
                prototypeFields = me.prototype.fields = new Ext.util.MixedCollection(false, function(field) {
                    return field.name;
                });
            }

            for (; i < len; i++) {
                prototypeFields.add(new Ext.data.Field(fields[i]));
            }
            if (!prototypeFields.get(proto.idProperty)) {
                prototypeFields.add(new Ext.data.Field(proto.idProperty));
            }

            me.fields = prototypeFields;

            return prototypeFields;
        },

        /**
         * Returns an Array of {@link Ext.data.Field Field} definitions which define this Model's structure
         *
         * Fields are sorted upon Model class definition. Fields with custom {@link Ext.data.Field#convert convert} functions
         * are moved to *after* fields with no convert functions. This is so that convert functions which rely on existing
         * field values will be able to read those field values.
         *
         * @return {Ext.data.Field[]} The defined Fields for this Model.
         *
         */
        getFields: function() {
            return this.prototype.fields.items;
        },

        /**
         * Asynchronously loads a model instance by id. Sample usage:
         *
         *     Ext.define('MyApp.User', {
         *         extend: 'Ext.data.Model',
         *         fields: [
         *             {name: 'id', type: 'int'},
         *             {name: 'name', type: 'string'}
         *         ]
         *     });
         *
         *     MyApp.User.load(10, {
         *         scope: this,
         *         failure: function(record, operation) {
         *             //do something if the load failed
         *         },
         *         success: function(record, operation) {
         *             //do something if the load succeeded
         *         },
         *         callback: function(record, operation) {
         *             //do something whether the load succeeded or failed
         *         }
         *     });
         *
         * @param {Number/String} id The id of the model to load
         * @param {Object} config (optional) config object containing success, failure and callback functions, plus
         * optional scope
         * @static
         * @inheritable
         */
        load: function(id, config) {
            config = Ext.apply({}, config);
            config = Ext.applyIf(config, {
                action: 'read',
                id    : id
            });

            var operation  = new Ext.data.Operation(config),
                scope      = config.scope || this,
                record     = null,
                callback;

            callback = function(operation) {
                if (operation.wasSuccessful()) {
                    record = operation.getRecords()[0];
                    Ext.callback(config.success, scope, [record, operation]);
                } else {
                    Ext.callback(config.failure, scope, [record, operation]);
                }
                Ext.callback(config.callback, scope, [record, operation]);
            };

            this.proxy.read(operation, callback, this);
        }
    },

    statics: {
        /**
         * @property
         * @static
         * @private
         */
        PREFIX : 'ext-record',
        /**
         * @property
         * @static
         * @private
         */
        AUTO_ID: 1,
        /**
         * @property
         * @static
         * The update operation of type 'edit'. Used by {@link Ext.data.Store#update Store.update} event.
         */
        EDIT   : 'edit',
        /**
         * @property
         * @static
         * The update operation of type 'reject'. Used by {@link Ext.data.Store#update Store.update} event.
         */
        REJECT : 'reject',
        /**
         * @property
         * @static
         * The update operation of type 'commit'. Used by {@link Ext.data.Store#update Store.update} event.
         */
        COMMIT : 'commit',

        /**
         * Generates a sequential id. This method is typically called when a record is {@link Ext#create
         * create}d and {@link #constructor no id has been specified}. The id will automatically be assigned to the
         * record. The returned id takes the form: {PREFIX}-{AUTO_ID}.
         *
         * - **PREFIX** : String - Ext.data.Model.PREFIX (defaults to 'ext-record')
         * - **AUTO_ID** : String - Ext.data.Model.AUTO_ID (defaults to 1 initially)
         *
         * @param {Ext.data.Model} rec The record being created. The record does not exist, it's a {@link #phantom}.
         * @return {String} auto-generated string id, `"ext-record-i++"`;
         * @static
         */
        id: function(rec) {
            var id = [this.PREFIX, '-', this.AUTO_ID++].join('');
            rec.phantom = true;
            rec.internalId = id;
            return id;
        }
    },

    /**
     * @cfg {String/Object} idgen
     * The id generator to use for this model. The default id generator does not generate
     * values for the {@link #idProperty}.
     *
     * This can be overridden at the model level to provide a custom generator for a model.
     * The simplest form of this would be:
     *
     *      Ext.define('MyApp.data.MyModel', {
     *          extend: 'Ext.data.Model',
     *          requires: ['Ext.data.SequentialIdGenerator'],
     *          idgen: 'sequential',
     *          ...
     *      });
     *
     * The above would generate {@link Ext.data.SequentialIdGenerator sequential} id's such
     * as 1, 2, 3 etc..
     *
     * Another useful id generator is {@link Ext.data.UuidGenerator}:
     *
     *      Ext.define('MyApp.data.MyModel', {
     *          extend: 'Ext.data.Model',
     *          requires: ['Ext.data.UuidGenerator'],
     *          idgen: 'uuid',
     *          ...
     *      });
     *
     * An id generation can also be further configured:
     *
     *      Ext.define('MyApp.data.MyModel', {
     *          extend: 'Ext.data.Model',
     *          idgen: {
     *              type: 'sequential',
     *              seed: 1000,
     *              prefix: 'ID_'
     *          }
     *      });
     *
     * The above would generate id's such as ID_1000, ID_1001, ID_1002 etc..
     *
     * If multiple models share an id space, a single generator can be shared:
     *
     *      Ext.define('MyApp.data.MyModelX', {
     *          extend: 'Ext.data.Model',
     *          idgen: {
     *              type: 'sequential',
     *              id: 'xy'
     *          }
     *      });
     *
     *      Ext.define('MyApp.data.MyModelY', {
     *          extend: 'Ext.data.Model',
     *          idgen: {
     *              type: 'sequential',
     *              id: 'xy'
     *          }
     *      });
     *
     * For more complex, shared id generators, a custom generator is the best approach.
     * See {@link Ext.data.IdGenerator} for details on creating custom id generators.
     *
     * @markdown
     */
    idgen: {
        isGenerator: true,
        type: 'default',

        generate: function () {
            return null;
        },
        getRecId: function (rec) {
            return rec.modelName + '-' + rec.internalId;
        }
    },

    /**
     * @property {Boolean} editing
     * Internal flag used to track whether or not the model instance is currently being edited.
     * @readonly
     */
    editing : false,

    /**
     * @property {Boolean} dirty
     * True if this Record has been modified.
     * @readonly
     */
    dirty : false,

    /**
     * @cfg {String} persistenceProperty
     * The name of the property on this Persistable object that its data is saved to. Defaults to 'data'
     * (i.e: all persistable data resides in `this.data`.)
     */
    persistenceProperty: 'data',

    evented: false,

    /**
     * @property {Boolean} isModel
     * `true` in this class to identify an object as an instantiated Model, or subclass thereof.
     */
    isModel: true,

    /**
     * @property {Boolean} phantom
     * True when the record does not yet exist in a server-side database (see {@link #setDirty}).
     * Any record which has a real database pk set as its id property is NOT a phantom -- it's real.
     */
    phantom : false,

    /**
     * @cfg {String} idProperty
     * The name of the field treated as this Model's unique id. Defaults to 'id'.
     */
    idProperty: 'id',

    /**
     * @cfg {String} [clientIdProperty]
     * The name of a property that is used for submitting this Model's unique client-side identifier
     * to the server when multiple phantom records are saved as part of the same {@link Ext.data.Operation Operation}.
     * In such a case, the server response should include the client id for each record
     * so that the server response data can be used to update the client-side records if necessary.
     * This property cannot have the same name as any of this Model's fields.
     */
    clientIdProperty: null,

    /**
     * @cfg {String} defaultProxyType
     * The string type of the default Model Proxy. Defaults to 'ajax'.
     */
    defaultProxyType: 'ajax',

    // Fields config and property
    /**
     * @cfg {Object[]/String[]} fields
     * The fields for this model. This is an Array of **{@link Ext.data.Field Field}** definition objects. A Field
     * definition may simply be the *name* of the Field, but a Field encapsulates {@link Ext.data.Field#type data type},
     * {@link Ext.data.Field#convert custom conversion} of raw data, and a {@link Ext.data.Field#mapping mapping}
     * property to specify by name of index, how to extract a field's value from a raw data object, so it is best practice
     * to specify a full set of {@link Ext.data.Field Field} config objects.
     */
    /**
     * @property {Ext.util.MixedCollection} fields
     * A {@link Ext.util.MixedCollection Collection} of the fields defined for this Model (including fields defined in superclasses)
     *
     * This is a collection of {@link Ext.data.Field} instances, each of which encapsulates information that the field was configured with.
     * By default, you can specify a field as simply a String, representing the *name* of the field, but a Field encapsulates
     * {@link Ext.data.Field#type data type}, {@link Ext.data.Field#convert custom conversion} of raw data, and a {@link Ext.data.Field#mapping mapping}
     * property to specify by name of index, how to extract a field's value from a raw data object.
     */

    /**
     * @cfg {Object[]} validations
     * An array of {@link Ext.data.validations validations} for this model.
     */

    // Associations configs and properties
    /**
     * @cfg {Object[]} associations
     * An array of {@link Ext.data.Association associations} for this model.
     */
    /**
     * @cfg {String/Object/String[]/Object[]} hasMany
     * One or more {@link Ext.data.HasManyAssociation HasMany associations} for this model.
     */
    /**
     * @cfg {String/Object/String[]/Object[]} belongsTo
     * One or more {@link Ext.data.BelongsToAssociation BelongsTo associations} for this model.
     */
    /**
     * @cfg {String/Object/Ext.data.proxy.Proxy} proxy
     * The {@link Ext.data.proxy.Proxy proxy} to use for this model.
     */

    /**
     * @event idchanged
     * Fired when this model's id changes
     * @param {Ext.data.Model} this
     * @param {Number/String} oldId The old id
     * @param {Number/String} newId The new id
     */

    /**
     * Creates new Model instance.
     * @param {Object} data An object containing keys corresponding to this model's fields, and their associated values
     */
    constructor: function(data, id, raw, convertedData) {
        // id, raw and convertedData not documented intentionally, meant to be used internally.
        // TODO: find where "raw" is used and remove it. The first parameter, "data" is raw, unconverted data. "raw" is redundant.
        // The "convertedData" parameter is a converted object hash with all properties corresponding to defined Fields
        // and all values of the defined type. It is used directly as this record's data property.
        data = data || {};

        var me = this,
            fields,
            length,
            field,
            name,
            value,
            newId,
            persistenceProperty,
            i;


        /**
         * @property {Number/String} internalId
         * An internal unique ID for each Model instance, used to identify Models that don't have an ID yet
         * @private
         */
        me.internalId = (id || id === 0) ? id : Ext.data.Model.id(me);

        /**
         * @property {Object} raw The raw data used to create this model if created via a reader.
         */
        me.raw = raw || data; // If created using data in constructor, use data

        if (!me.data) {
            me.data = {};
        }

        /**
         * @property {Object} modified Key: value pairs of all fields whose values have changed
         */
        me.modified = {};

        // Deal with spelling error in previous releases
        if (me.persistanceProperty) {
            Ext.log.warn('Ext.data.Model: persistanceProperty has been deprecated. Use persistenceProperty instead.');
            me.persistenceProperty = me.persistanceProperty;
        }

        me[me.persistenceProperty] = convertedData || {};

        me.mixins.observable.constructor.call(me);

        if (!convertedData) {
            //add default field values if present
            fields = me.fields.items;
            length = fields.length;
            i = 0;
            persistenceProperty = me[me.persistenceProperty];

            if (Ext.isArray(data)) {
                for (; i < length; i++) {
                    field = fields[i];
                    name  = field.name;

                    // Use the original ordinal position at which the Model inserted the field into its collection.
                    // Fields are sorted to place fields with a *convert* function last.
                    value = data[field.originalIndex];

                    if (value === undefined) {
                        value = field.defaultValue;
                    }
                    // Have to map array data so the values get assigned to the named fields
                    // rather than getting set as the field names with undefined values.
                    if (field.convert) {
                        value = field.convert(value, me);
                    }
                    // On instance construction, do not create data properties based on undefined input properties
                    if (value !== undefined) {
                        persistenceProperty[name] = value;
                    }
                }

            } else {
               for (; i < length; i++) {
                    field = fields[i];
                    name  = field.name;
                    value = data[name];
                    if (value === undefined) {
                        value = field.defaultValue;
                    }
                    if (field.convert) {
                        value = field.convert(value, me);
                    }
                    // On instance construction, do not create data properties based on undefined input properties
                    if (value !== undefined) {
                        persistenceProperty[name] = value;
                    }
               }
            }
        }

        /**
         * @property {Ext.data.Store[]} stores
         * The {@link Ext.data.Store Stores} to which this instance is bound.
         */
        me.stores = [];

        if (me.getId()) {
            me.phantom = false;
        } else if (me.phantom) {
            newId = me.idgen.generate();
            if (newId !== null) {
                me.setId(newId);
            }
        }

        // clear any dirty/modified since we're initializing
        me.dirty = false;
        me.modified = {};

        if (typeof me.init == 'function') {
            me.init();
        }

        me.id = me.idgen.getRecId(me);
    },

    /**
     * Returns the value of the given field
     * @param {String} fieldName The field to fetch the value for
     * @return {Object} The value
     */
    get: function(field) {
        return this[this.persistenceProperty][field];
    },

    // This object is used whenever the set() method is called and given a string as the
    // first argument. This approach saves memory (and GC costs) since we could be called
    // a lot.
    _singleProp: {},

    /**
     * Sets the given field to the given value, marks the instance as dirty
     * @param {String/Object} fieldName The field to set, or an object containing key/value pairs
     * @param {Object} newValue The value to set
     * @return {String[]} The array of modified field names or null if nothing was modified.
     */
    set: function (fieldName, newValue) {
        var me = this,
            data = me[me.persistenceProperty],
            fields = me.fields,
            modified = me.modified,
            single = (typeof fieldName == 'string'),
            currentValue, field, idChanged, key, modifiedFieldNames, name, oldId,
            newId, value, values;

        if (single) {
            values = me._singleProp;
            values[fieldName] = newValue;
        } else {
            values = fieldName;
        }

        for (name in values) {
            if (values.hasOwnProperty(name)) {
                value = values[name];

                if (fields && (field = fields.get(name)) && field.convert) {
                    value = field.convert(value, me);
                }

                currentValue = data[name];
                if (me.isEqual(currentValue, value)) {
                    continue; // new value is the same, so no change...
                }

                data[name] = value;
                (modifiedFieldNames || (modifiedFieldNames = [])).push(name);

                if (field && field.persist) {
                    if (modified.hasOwnProperty(name)) {
                        if (me.isEqual(modified[name], value)) {
                            // The original value in me.modified equals the new value, so
                            // the field is no longer modified:
                            delete modified[name];

                            // We might have removed the last modified field, so check to
                            // see if there are any modified fields remaining and correct
                            // me.dirty:
                            me.dirty = false;
                            for (key in modified) {
                                if (modified.hasOwnProperty(key)){
                                    me.dirty = true;
                                    break;
                                }
                            }
                        }
                    } else {
                        me.dirty = true;
                        modified[name] = currentValue;
                    }
                }

                if (name == me.idProperty) {
                    idChanged = true;
                    oldId = currentValue;
                    newId = value;
                }
            }
        }

        if (single) {
            // cleanup our reused object for next time... important to do this before
            // we fire any events or call anyone else (like afterEdit)!
            delete values[fieldName];
        }

        if (idChanged) {
            me.fireEvent('idchanged', me, oldId, newId);
        }

        if (!me.editing && modifiedFieldNames) {
            me.afterEdit(modifiedFieldNames);
        }

        return modifiedFieldNames || null;
    },

    /**
     * @private
     * Copies data from the passed record into this record. If the passed record is undefined, does nothing.
     *
     * If this is a phantom record (represented only in the client, with no corresponding database entry), and
     * the source record is not a phantom, then this record acquires the id of the source record.
     *
     * @param {Ext.data.Model} sourceRecord The record to copy data from.
     */
    copyFrom: function(sourceRecord) {
        if (sourceRecord) {

            var me = this,
                fields = me.fields.items,
                fieldCount = fields.length,
                field, i = 0,
                myData = me[me.persistenceProperty],
                sourceData = sourceRecord[sourceRecord.persistenceProperty],
                value;

            for (; i < fieldCount; i++) {
                field = fields[i];

                // Do not use setters.
                // Copy returned values in directly from the data object.
                // Converters have already been called because new Records
                // have been created to copy from.
                // This is a direct record-to-record value copy operation.
                value = sourceData[field.name];
                if (value !== undefined) {
                    myData[field.name] = value;
                }
            }

            // If this is a phantom record being updated from a concrete record, copy the ID in.
            if (me.phantom && !sourceRecord.phantom) {
                me.setId(sourceRecord.getId());
            }
        }
    },

    /**
     * Checks if two values are equal, taking into account certain
     * special factors, for example dates.
     * @private
     * @param {Object} a The first value
     * @param {Object} b The second value
     * @return {Boolean} True if the values are equal
     */
    isEqual: function(a, b){
        if (Ext.isDate(a) && Ext.isDate(b)) {
            return Ext.Date.isEqual(a, b);
        }
        return a === b;
    },

    /**
     * Begins an edit. While in edit mode, no events (e.g.. the `update` event) are relayed to the containing store.
     * When an edit has begun, it must be followed by either {@link #endEdit} or {@link #cancelEdit}.
     */
    beginEdit : function(){
        var me = this;
        if (!me.editing) {
            me.editing = true;
            me.dirtySave = me.dirty;
            me.dataSave = Ext.apply({}, me[me.persistenceProperty]);
            me.modifiedSave = Ext.apply({}, me.modified);
        }
    },

    /**
     * Cancels all changes made in the current edit operation.
     */
    cancelEdit : function(){
        var me = this;
        if (me.editing) {
            me.editing = false;
            // reset the modified state, nothing changed since the edit began
            me.modified = me.modifiedSave;
            me[me.persistenceProperty] = me.dataSave;
            me.dirty = me.dirtySave;
            delete me.modifiedSave;
            delete me.dataSave;
            delete me.dirtySave;
        }
    },

    /**
     * Ends an edit. If any data was modified, the containing store is notified (ie, the store's `update` event will
     * fire).
     * @param {Boolean} silent True to not notify the store of the change
     * @param {String[]} modifiedFieldNames Array of field names changed during edit.
     */
    endEdit : function(silent, modifiedFieldNames){
        var me = this,
            changed;
        if (me.editing) {
            me.editing = false;
            if(!modifiedFieldNames) {
                modifiedFieldNames = me.getModifiedFieldNames();
            }
            changed = me.dirty || modifiedFieldNames.length > 0;
            delete me.modifiedSave;
            delete me.dataSave;
            delete me.dirtySave;
            if (changed && silent !== true) {
                me.afterEdit(modifiedFieldNames);
            }
        }
    },

    /**
     * Gets the names of all the fields that were modified during an edit
     * @private
     * @return {String[]} An array of modified field names
     */
    getModifiedFieldNames: function(){
        var me = this,
            saved = me.dataSave,
            data = me[me.persistenceProperty],
            modified = [],
            key;

        for (key in data) {
            if (data.hasOwnProperty(key)) {
                if (!me.isEqual(data[key], saved[key])) {
                    modified.push(key);
                }
            }
        }
        return modified; 
    },

    /**
     * Gets a hash of only the fields that have been modified since this Model was created or commited.
     * @return {Object}
     */
    getChanges : function(){
        var modified = this.modified,
            changes  = {},
            field;

        for (field in modified) {
            if (modified.hasOwnProperty(field)){
                changes[field] = this.get(field);
            }
        }

        return changes;
    },

    /**
     * Returns true if the passed field name has been `{@link #modified}` since the load or last commit.
     * @param {String} fieldName {@link Ext.data.Field#name}
     * @return {Boolean}
     */
    isModified : function(fieldName) {
        return this.modified.hasOwnProperty(fieldName);
    },

    /**
     * Marks this **Record** as `{@link #dirty}`. This method is used interally when adding `{@link #phantom}` records
     * to a {@link Ext.data.proxy.Server#writer writer enabled store}.
     *
     * Marking a record `{@link #dirty}` causes the phantom to be returned by {@link Ext.data.Store#getUpdatedRecords}
     * where it will have a create action composed for it during {@link Ext.data.Model#save model save} operations.
     */
    setDirty : function() {
        var me     = this,
            fields = me.fields.items,
            fLen   = fields.length,
            field, name, f;

        me.dirty = true;

        for (f = 0; f < fLen; f++) {
            field = fields[f];

            if (field.persist) {
                name  = field.name;
                me.modified[name] = me.get(name);
            }
        }
    },

    markDirty : function() {
        Ext.log.warn('Ext.data.Model: markDirty has been deprecated. Use setDirty instead.');

        return this.setDirty.apply(this, arguments);
    },

    /**
     * Usually called by the {@link Ext.data.Store} to which this model instance has been {@link #join joined}. Rejects
     * all changes made to the model instance since either creation, or the last commit operation. Modified fields are
     * reverted to their original values.
     *
     * Developers should subscribe to the {@link Ext.data.Store#event-update} event to have their code notified of reject
     * operations.
     *
     * @param {Boolean} silent (optional) True to skip notification of the owning store of the change.
     * Defaults to false.
     */
    reject : function(silent) {
        var me = this,
            modified = me.modified,
            field;

        for (field in modified) {
            if (modified.hasOwnProperty(field)) {
                if (typeof modified[field] != "function") {
                    me[me.persistenceProperty][field] = modified[field];
                }
            }
        }

        me.dirty = false;
        me.editing = false;
        me.modified = {};

        if (silent !== true) {
            me.afterReject();
        }
    },

    /**
     * Usually called by the {@link Ext.data.Store} which owns the model instance. Commits all changes made to the
     * instance since either creation or the last commit operation.
     *
     * Developers should subscribe to the {@link Ext.data.Store#event-update} event to have their code notified of commit
     * operations.
     *
     * @param {Boolean} silent (optional) True to skip notification of the owning store of the change.
     * Defaults to false.
     */
    commit : function(silent) {
        var me = this;

        me.phantom = me.dirty = me.editing = false;
        me.modified = {};

        if (silent !== true) {
            me.afterCommit();
        }
    },

    /**
     * Creates a copy (clone) of this Model instance.
     *
     * @param {String} [id] A new id, defaults to the id of the instance being copied.
     * See `{@link Ext.data.Model#id id}`. To generate a phantom instance with a new id use:
     *
     *     var rec = record.copy(); // clone the record
     *     Ext.data.Model.id(rec); // automatically generate a unique sequential id
     *
     * @return {Ext.data.Model}
     */
    copy : function(newId) {
        var me = this;

        // Use raw data as the data param.
        // Pass a copy iof our converted data in to be used as the new record's convertedData
        return new me.self(me.raw, newId, null, Ext.apply({}, me[me.persistenceProperty]));
    },

    /**
     * Sets the Proxy to use for this model. Accepts any options that can be accepted by
     * {@link Ext#createByAlias Ext.createByAlias}.
     *
     * @param {String/Object/Ext.data.proxy.Proxy} proxy The proxy
     * @return {Ext.data.proxy.Proxy}
     */
    setProxy: function(proxy) {
        //make sure we have an Ext.data.proxy.Proxy object
        if (!proxy.isProxy) {
            if (typeof proxy === "string") {
                proxy = {
                    type: proxy
                };
            }
            proxy = Ext.createByAlias("proxy." + proxy.type, proxy);
        }
        proxy.setModel(this.self);
        this.proxy = proxy;

        return proxy;
    },

    /**
     * Returns the configured Proxy for this Model.
     * @return {Ext.data.proxy.Proxy} The proxy
     */
    getProxy: function() {
        return this.proxy;
    },

    /**
     * Validates the current data against all of its configured {@link #validations}.
     * @return {Ext.data.Errors} The errors object
     */
    validate: function() {
        var errors      = new Ext.data.Errors(),
            validations = this.validations,
            validators  = Ext.data.validations,
            length, validation, field, valid, type, i;

        if (validations) {
            length = validations.length;

            for (i = 0; i < length; i++) {
                validation = validations[i];
                field = validation.field || validation.name;
                type  = validation.type;
                valid = validators[type](validation, this.get(field));

                if (!valid) {
                    errors.add({
                        field  : field,
                        message: validation.message || validators[type + 'Message']
                    });
                }
            }
        }

        return errors;
    },

    /**
     * Checks if the model is valid. See {@link #validate}.
     * @return {Boolean} True if the model is valid.
     */
    isValid: function(){
        return this.validate().isValid();
    },

    /**
     * Saves the model instance using the configured proxy.
     * @param {Object} options Options to pass to the proxy. Config object for {@link Ext.data.Operation}.
     * @return {Ext.data.Model} The Model instance
     */
    save: function(options) {
        options = Ext.apply({}, options);

        var me     = this,
            action = me.phantom ? 'create' : 'update',
            scope  = options.scope || me,
            stores = me.stores,
            i = 0,
            storeCount,
            store,
            args,
            operation,
            callback;

        Ext.apply(options, {
            records: [me],
            action : action
        });

        operation = new Ext.data.Operation(options);

        callback = function(operation) {
            args = [me, operation];
            if (operation.wasSuccessful()) {
                for(storeCount = stores.length; i < storeCount; i++) {
                    store = stores[i];
                    store.fireEvent('write', store, operation);
                    store.fireEvent('datachanged', store);
                    // Not firing refresh here, since it's a single record
                }
                Ext.callback(options.success, scope, args);
            } else {
                Ext.callback(options.failure, scope, args);
            }

            Ext.callback(options.callback, scope, args);
        };

        me.getProxy()[action](operation, callback, me);

        return me;
    },

    /**
     * Destroys the model using the configured proxy.
     * @param {Object} options Options to pass to the proxy. Config object for {@link Ext.data.Operation}.
     * @return {Ext.data.Model} The Model instance
     */
    destroy: function(options){
        options = Ext.apply({}, options);

        var me     = this,
            scope  = options.scope || me,
            stores = me.stores,
            i = 0,
            storeCount,
            store,
            args,
            operation,
            callback;

        Ext.apply(options, {
            records: [me],
            action : 'destroy'
        });

        operation = new Ext.data.Operation(options);
        callback = function(operation) {
            args = [me, operation];
            if (operation.wasSuccessful()) {
                for(storeCount = stores.length; i < storeCount; i++) {
                    store = stores[i];
                    store.fireEvent('write', store, operation);
                    store.fireEvent('datachanged', store);
                    // Not firing refresh here, since it's a single record
                }
                me.clearListeners();
                Ext.callback(options.success, scope, args);
            } else {
                Ext.callback(options.failure, scope, args);
            }
            Ext.callback(options.callback, scope, args);
        };

        me.getProxy().destroy(operation, callback, me);
        return me;
    },

    /**
     * Returns the unique ID allocated to this model instance as defined by {@link #idProperty}.
     * @return {Number/String} The id
     */
    getId: function() {
        return this.get(this.idProperty);
    },

    /**
     * @private
     */
    getObservableId: function() {
        return this.id;
    },

    /**
     * Sets the model instance's id field to the given id.
     * @param {Number/String} id The new id
     */
    setId: function(id) {
        this.set(this.idProperty, id);
        this.phantom  = !(id || id === 0);
    },

    /**
     * Tells this model instance that it has been added to a store.
     * @param {Ext.data.Store} store The store to which this model has been added.
     */
    join : function(store) {
        Ext.Array.include(this.stores, store);

        /**
         * @property {Ext.data.Store} store
         * The {@link Ext.data.Store Store} to which this instance belongs. NOTE: If this
         * instance is bound to multiple stores, this property will reference only the
         * first. To examine all the stores, use the {@link #stores} property instead.
         */
        this.store = this.stores[0]; // compat w/all releases ever
    },

    /**
     * Tells this model instance that it has been removed from the store.
     * @param {Ext.data.Store} store The store from which this model has been removed.
     */
    unjoin: function(store) {
        Ext.Array.remove(this.stores, store);
        this.store = this.stores[0] || null; // compat w/all releases ever
    },

    /**
     * @private
     * If this Model instance has been {@link #join joined} to a {@link Ext.data.Store store}, the store's
     * afterEdit method is called
     * @param {String[]} modifiedFieldNames Array of field names changed during edit.
     */
    afterEdit : function(modifiedFieldNames) {
        this.callStore('afterEdit', modifiedFieldNames);
    },

    /**
     * @private
     * If this Model instance has been {@link #join joined} to a {@link Ext.data.Store store}, the store's
     * afterReject method is called
     */
    afterReject : function() {
        this.callStore("afterReject");
    },

    /**
     * @private
     * If this Model instance has been {@link #join joined} to a {@link Ext.data.Store store}, the store's
     * afterCommit method is called
     */
    afterCommit: function() {
        this.callStore('afterCommit');
    },

    /**
     * @private
     * Helper function used by afterEdit, afterReject and afterCommit. Calls the given method on the
     * {@link Ext.data.Store store} that this instance has {@link #join joined}, if any. The store function
     * will always be called with the model instance as its single argument. If this model is joined to 
     * a Ext.data.NodeStore, then this method calls the given method on the NodeStore and the associated Ext.data.TreeStore
     * @param {String} fn The function to call on the store
     */
    callStore: function(fn) {
        var args = Ext.Array.clone(arguments),
            stores = this.stores,
            i = 0,
            len = stores.length,
            store, treeStore;

        args[0] = this;
        for (; i < len; ++i) {
            store = stores[i];
            if (store && typeof store[fn] == "function") {
                store[fn].apply(store, args);
            }
            // if the record is bound to a NodeStore call the TreeStore's method as well
            treeStore = store.treeStore;
            if (treeStore && typeof treeStore[fn] == "function") {
                treeStore[fn].apply(treeStore, args);
            }
        }
    },

    /**
     * Gets all values for each field in this model and returns an object
     * containing the current data.
     * @param {Boolean} includeAssociated True to also include associated data. Defaults to false.
     * @return {Object} An object hash containing all the values in this model
     */
    getData: function(includeAssociated){
        var me     = this,
            fields = me.fields.items,
            fLen   = fields.length,
            data   = {},
            name, f;

        for (f = 0; f < fLen; f++) {
            name = fields[f].name;
            data[name] = me.get(name);
        }

        if (includeAssociated === true) {
            Ext.apply(data, me.getAssociatedData());
        }
        return data;
    },

    /**
     * Gets all of the data from this Models *loaded* associations. It does this recursively - for example if we have a
     * User which hasMany Orders, and each Order hasMany OrderItems, it will return an object like this:
     *
     *     {
     *         orders: [
     *             {
     *                 id: 123,
     *                 status: 'shipped',
     *                 orderItems: [
     *                     ...
     *                 ]
     *             }
     *         ]
     *     }
     *
     * @return {Object} The nested data set for the Model's loaded associations
     */
    getAssociatedData: function(){
        return this.prepareAssociatedData({}, 1);
    },

    /**
     * @private
     * This complex-looking method takes a given Model instance and returns an object containing all data from
     * all of that Model's *loaded* associations. See {@link #getAssociatedData}
     * @param {Object} seenKeys A hash of all the associations we've already seen
     * @param {Number} depth The current depth
     * @return {Object} The nested data set for the Model's loaded associations
     */
    prepareAssociatedData: function(seenKeys, depth) {
        /*
         * In this method we use a breadth first strategy instead of depth
         * first. The reason for doing so is that it prevents messy & difficult
         * issues when figuring out which associations we've already processed
         * & at what depths.
         */
        var me               = this,
            associations     = me.associations.items,
            associationCount = associations.length,
            associationData  = {},
            // We keep 3 lists at the same index instead of using an array of objects.
            // The reasoning behind this is that this method gets called a lot
            // So we want to minimize the amount of objects we create for GC.
            toRead           = [],
            toReadKey        = [],
            toReadIndex      = [],
            associatedStore, associatedRecords, associatedRecord, o, index, result, seenDepth,
            associationId, associatedRecordCount, association, i, j, type, name;

        for (i = 0; i < associationCount; i++) {
            association = associations[i];
            associationId = association.associationId;
            
            seenDepth = seenKeys[associationId];
            if (seenDepth && seenDepth !== depth) {
                continue;
            }
            seenKeys[associationId] = depth;

            type = association.type;
            name = association.name;
            if (type == 'hasMany') {
                //this is the hasMany store filled with the associated data
                associatedStore = me[association.storeName];

                //we will use this to contain each associated record's data
                associationData[name] = [];

                //if it's loaded, put it into the association data
                if (associatedStore && associatedStore.getCount() > 0) {
                    associatedRecords = associatedStore.data.items;
                    associatedRecordCount = associatedRecords.length;

                    //now we're finally iterating over the records in the association. Get
                    // all the records so we can process them
                    for (j = 0; j < associatedRecordCount; j++) {
                        associatedRecord = associatedRecords[j];
                        associationData[name][j] = associatedRecord.getData();
                        toRead.push(associatedRecord);
                        toReadKey.push(name);
                        toReadIndex.push(j);
                    }
                }
            } else if (type == 'belongsTo' || type == 'hasOne') {
                associatedRecord = me[association.instanceName];
                // If we have a record, put it onto our list
                if (associatedRecord !== undefined) {
                    associationData[name] = associatedRecord.getData();
                    toRead.push(associatedRecord);
                    toReadKey.push(name);
                    toReadIndex.push(-1);
                }
            }
        }
        
        for (i = 0, associatedRecordCount = toRead.length; i < associatedRecordCount; ++i) {
            associatedRecord = toRead[i];
            o = associationData[toReadKey[i]];
            index = toReadIndex[i];
            result = associatedRecord.prepareAssociatedData(seenKeys, depth + 1);
            if (index === -1) {
                Ext.apply(o, result);
            } else {
                Ext.apply(o[index], result);
            }
        }

        return associationData;
    }
});
/**
 * @docauthor Evan Trimboli <evan@sencha.com>
 *
 * Contains a collection of all stores that are created that have an identifier. An identifier can be assigned by
 * setting the {@link Ext.data.AbstractStore#storeId storeId} property. When a store is in the StoreManager, it can be
 * referred to via it's identifier:
 *
 *     Ext.create('Ext.data.Store', {
 *         model: 'SomeModel',
 *         storeId: 'myStore'
 *     });
 *
 *     var store = Ext.data.StoreManager.lookup('myStore');
 *
 * Also note that the {@link #lookup} method is aliased to {@link Ext#getStore} for convenience.
 *
 * If a store is registered with the StoreManager, you can also refer to the store by it's identifier when registering
 * it with any Component that consumes data from a store:
 *
 *     Ext.create('Ext.data.Store', {
 *         model: 'SomeModel',
 *         storeId: 'myStore'
 *     });
 *
 *     Ext.create('Ext.view.View', {
 *         store: 'myStore',
 *         // other configuration here
 *     });
 *
 */
Ext.define('Ext.data.StoreManager', {
    extend: 'Ext.util.MixedCollection',
    alternateClassName: ['Ext.StoreMgr', 'Ext.data.StoreMgr', 'Ext.StoreManager'],
    singleton: true,
    uses: ['Ext.data.ArrayStore'],
    
    /**
     * @cfg {Object} listeners
     * @private
     */

    /**
     * Registers one or more Stores with the StoreManager. You do not normally need to register stores manually. Any
     * store initialized with a {@link Ext.data.Store#storeId} will be auto-registered.
     * @param {Ext.data.Store...} stores Any number of Store instances
     */
    register : function() {
        for (var i = 0, s; (s = arguments[i]); i++) {
            this.add(s);
        }
    },

    /**
     * Unregisters one or more Stores with the StoreManager
     * @param {String/Object...} stores Any number of Store instances or ID-s
     */
    unregister : function() {
        for (var i = 0, s; (s = arguments[i]); i++) {
            this.remove(this.lookup(s));
        }
    },

    /**
     * Gets a registered Store by id
     * @param {String/Object} store The id of the Store, or a Store instance, or a store configuration
     * @return {Ext.data.Store}
     */
    lookup : function(store) {
        // handle the case when we are given an array or an array of arrays.
        if (Ext.isArray(store)) {
            var fields = ['field1'], 
                expand = !Ext.isArray(store[0]),
                data = store,
                i,
                len;
                
            if(expand){
                data = [];
                for (i = 0, len = store.length; i < len; ++i) {
                    data.push([store[i]]);
                }
            } else {
                for(i = 2, len = store[0].length; i <= len; ++i){
                    fields.push('field' + i);
                }
            }
            return new Ext.data.ArrayStore({
                data  : data,
                fields: fields,
                autoDestroy: true,
                autoCreated: true,
                expanded: expand
            });
        }
        
        if (Ext.isString(store)) {
            // store id
            return this.get(store);
        } else {
            // store instance or store config
            return Ext.data.AbstractStore.create(store);
        }
    },

    // getKey implementation for MixedCollection
    getKey : function(o) {
         return o.storeId;
    }
}, function() {    
    /**
     * Creates a new store for the given id and config, then registers it with the {@link Ext.data.StoreManager Store Manager}. 
     * Sample usage:
     *
     *     Ext.regStore('AllUsers', {
     *         model: 'User'
     *     });
     *
     *     // the store can now easily be used throughout the application
     *     new Ext.List({
     *         store: 'AllUsers',
     *         ... other config
     *     });
     *
     * @param {String} id The id to set on the new store
     * @param {Object} config The store config
     * @member Ext
     * @method regStore
     */
    Ext.regStore = function(name, config) {
        var store;

        if (Ext.isObject(name)) {
            config = name;
        } else {
            config.storeId = name;
        }

        if (config instanceof Ext.data.Store) {
            store = config;
        } else {
            store = new Ext.data.Store(config);
        }

        return Ext.data.StoreManager.register(store);
    };

    /**
     * Shortcut to {@link Ext.data.StoreManager#lookup}.
     * @member Ext
     * @method getStore
     * @inheritdoc Ext.data.StoreManager#lookup
     */
    Ext.getStore = function(name) {
        return Ext.data.StoreManager.lookup(name);
    };
});

/**
 * The TreeStore is a store implementation that is backed by by an {@link Ext.data.Tree}.
 * It provides convenience methods for loading nodes, as well as the ability to use
 * the hierarchical tree structure combined with a store. This class is generally used
 * in conjunction with {@link Ext.tree.Panel}. This class also relays many events from
 * the Tree for convenience.
 *
 * # Using Models
 *
 * If no Model is specified, an implicit model will be created that implements {@link Ext.data.NodeInterface}.
 * The standard Tree fields will also be copied onto the Model for maintaining their state. These fields are listed
 * in the {@link Ext.data.NodeInterface} documentation.
 *
 * # Reading Nested Data
 *
 * For the tree to read nested data, the {@link Ext.data.reader.Reader} must be configured with a root property,
 * so the reader can find nested data for each node (if a root is not specified, it will default to
 * 'children'). This will tell the tree to look for any nested tree nodes by the same keyword, i.e., 'children'.
 * If a root is specified in the config make sure that any nested nodes with children have the same name.
 * Note that setting {@link #defaultRootProperty} accomplishes the same thing.
 */
Ext.define('Ext.data.TreeStore', {
    extend: 'Ext.data.AbstractStore',
    alias: 'store.tree',
    requires: [
        'Ext.util.Sorter',
        'Ext.data.Tree',
        'Ext.data.NodeInterface'
    ],

    /**
     * @cfg {Ext.data.Model/Ext.data.NodeInterface/Object} root
     * The root node for this store. For example:
     *
     *     root: {
     *         expanded: true,
     *         text: "My Root",
     *         children: [
     *             { text: "Child 1", leaf: true },
     *             { text: "Child 2", expanded: true, children: [
     *                 { text: "GrandChild", leaf: true }
     *             ] }
     *         ]
     *     }
     *
     * Setting the `root` config option is the same as calling {@link #setRootNode}.
     */

    /**
     * @cfg {Boolean} [clearOnLoad=true]
     * Remove previously existing child nodes before loading. 
     */
    clearOnLoad : true,

    /**
     * @cfg {Boolean} [clearRemovedOnLoad=true]
     * If `true`, when a node is reloaded, any records in the {@link #removed} record collection that were previously descendants of the node being reloaded will be cleared from the {@link #removed} collection.
     * Only applicable if {@link #clearOnLoad} is `true`.
     */
    clearRemovedOnLoad: true,

    /**
     * @cfg {String} [nodeParam="node"]
     * The name of the parameter sent to the server which contains the identifier of the node.
     */
    nodeParam: 'node',

    /**
     * @cfg {String} [defaultRootId="root"]
     * The default root id.
     */
    defaultRootId: 'root',

    /**
     * @cfg {String} [defaultRootProperty="children"]
     * The root property to specify on the reader if one is not explicitly defined.
     */
    defaultRootProperty: 'children',
    
    // Keep a copy of the default so we know if it's been changed in a subclass/config
    rootProperty: 'children',

    /**
     * @cfg {Boolean} [folderSort=false]
     * Set to true to automatically prepend a leaf sorter.
     */
    folderSort: false,

    constructor: function(config) {
        var me = this,
            root,
            fields,
            defaultRoot;

        config = Ext.apply({}, config);

        /**
         * If we have no fields declare for the store, add some defaults.
         * These will be ignored if a model is explicitly specified.
         */
        fields = config.fields || me.fields;
        if (!fields) {
            config.fields = [
                {name: 'text', type: 'string'}
            ];
            defaultRoot = config.defaultRootProperty || me.defaultRootProperty;
            if (defaultRoot !== me.defaultRootProperty) {
                config.fields.push({
                    name: defaultRoot,   
                    type: 'auto',   
                    defaultValue: null, 
                    persist: false
                });
            }
        }

        me.callParent([config]);

        // We create our data tree.
        me.tree = new Ext.data.Tree();

        me.relayEvents(me.tree, [
            /**
             * @event append
             * @inheritdoc Ext.data.Tree#append
             */
            "append",

            /**
             * @event remove
             * @inheritdoc Ext.data.Tree#remove
             */
            "remove",

            /**
             * @event move
             * @inheritdoc Ext.data.Tree#move
             */
            "move",

            /**
             * @event insert
             * @inheritdoc Ext.data.Tree#insert
             */
            "insert",

            /**
             * @event beforeappend
             * @inheritdoc Ext.data.Tree#beforeappend
             */
            "beforeappend",

            /**
             * @event beforeremove
             * @inheritdoc Ext.data.Tree#beforeremove
             */
            "beforeremove",

            /**
             * @event beforemove
             * @inheritdoc Ext.data.Tree#beforemove
             */
            "beforemove",

            /**
             * @event beforeinsert
             * @inheritdoc Ext.data.Tree#beforeinsert
             */
            "beforeinsert",

            /**
             * @event expand
             * @inheritdoc Ext.data.Tree#expand
             */
            "expand",

            /**
             * @event collapse
             * @inheritdoc Ext.data.Tree#collapse
             */
            "collapse",

            /**
             * @event beforeexpand
             * @inheritdoc Ext.data.Tree#beforeexpand
             */
            "beforeexpand",

            /**
             * @event beforecollapse
             * @inheritdoc Ext.data.Tree#beforecollapse
             */
            "beforecollapse",

            /**
             * @event sort
             * @inheritdoc Ext.data.Tree#sort
             */
            "sort",

            /**
             * @event rootchange
             * @inheritdoc Ext.data.Tree#rootchange
             */
            "rootchange"
        ]);

        me.tree.on({
            scope: me,
            remove: me.onNodeRemove,
            // this event must follow the relay to beforeitemexpand to allow users to
            // cancel the expand:
            beforeexpand: me.onBeforeNodeExpand,
            beforecollapse: me.onBeforeNodeCollapse,
            append: me.onNodeAdded,
            insert: me.onNodeAdded,
            sort: me.onNodeSort
        });

        me.onBeforeSort();

        root = me.root;
        if (root) {
            delete me.root;
            me.setRootNode(root);
        }

        if (Ext.isDefined(me.nodeParameter)) {
            if (Ext.isDefined(Ext.global.console)) {
                Ext.global.console.warn('Ext.data.TreeStore: nodeParameter has been deprecated. Please use nodeParam instead.');
            }
            me.nodeParam = me.nodeParameter;
            delete me.nodeParameter;
        }
    },

    // inherit docs
    setProxy: function(proxy) {
        var reader,
            needsRoot;

        if (proxy instanceof Ext.data.proxy.Proxy) {
            // proxy instance, check if a root was set
            needsRoot = Ext.isEmpty(proxy.getReader().root);
        } else if (Ext.isString(proxy)) {
            // string type, means a reader can't be set
            needsRoot = true;
        } else {
            // object, check if a reader and a root were specified.
            reader = proxy.reader;
            needsRoot = !(reader && !Ext.isEmpty(reader.root));
        }
        proxy = this.callParent(arguments);
        if (needsRoot) {
            reader = proxy.getReader();
            reader.root = this.defaultRootProperty;
            // force rebuild
            reader.buildExtractors(true);
        }
    },

    // inherit docs
    onBeforeSort: function() {
        if (this.folderSort) {
            this.sort({
                property: 'leaf',
                direction: 'ASC'
            }, 'prepend', false);
        }
    },

    /**
     * Called before a node is expanded.
     * @private
     * @param {Ext.data.NodeInterface} node The node being expanded.
     * @param {Function} callback The function to run after the expand finishes
     * @param {Object} scope The scope in which to run the callback function
     */
    onBeforeNodeExpand: function(node, callback, scope) {
        if (node.isLoaded()) {
            Ext.callback(callback, scope || node, [node.childNodes]);
        }
        else if (node.isLoading()) {
            this.on('load', function() {
                Ext.callback(callback, scope || node, [node.childNodes]);
            }, this, {single: true});
        }
        else {
            this.read({
                node: node,
                callback: function() {
                    Ext.callback(callback, scope || node, [node.childNodes]);
                }
            });
        }
    },

    //inherit docs
    getNewRecords: function() {
        return Ext.Array.filter(this.tree.flatten(), this.filterNew);
    },

    //inherit docs
    getUpdatedRecords: function() {
        return Ext.Array.filter(this.tree.flatten(), this.filterUpdated);
    },

    /**
     * Called before a node is collapsed.
     * @private
     * @param {Ext.data.NodeInterface} node The node being collapsed.
     * @param {Function} callback The function to run after the collapse finishes
     * @param {Object} scope The scope in which to run the callback function
     */
    onBeforeNodeCollapse: function(node, callback, scope) {
        callback.call(scope || node, node.childNodes);
    },

    onNodeRemove: function(parent, node, isMove) {
        var me = this,
            removed = me.removed;

        if (!node.isReplace && Ext.Array.indexOf(removed, node) == -1) {
            removed.push(node);
        }

        if (me.autoSync && !me.autoSyncSuspended && !isMove) {
            me.sync();
        }
    },

    onNodeAdded: function(parent, node) {
        var me = this,
            proxy = me.getProxy(),
            reader = proxy.getReader(),
            data = node.raw || node[node.persistenceProperty],
            dataRoot;

        Ext.Array.remove(me.removed, node);

        if (!node.isLeaf()) {
            dataRoot = reader.getRoot(data);
            if (dataRoot) {
                me.fillNode(node, reader.extractData(dataRoot));
                delete data[reader.root];
            }
        }

        if (me.autoSync && !me.autoSyncSuspended && (node.phantom || node.dirty)) {
            me.sync();
        }
    },

    onNodeSort: function() {
        if(this.autoSync && !this.autoSyncSuspended) {
            this.sync();
        }
    },

    /**
     * Sets the root node for this store.  See also the {@link #root} config option.
     * @param {Ext.data.Model/Ext.data.NodeInterface/Object} root
     * @return {Ext.data.NodeInterface} The new root
     */
    setRootNode: function(root, /* private */ preventLoad) {
        var me = this,
            model = me.model,
            idProperty = model.prototype.idProperty

        root = root || {};
        if (!root.isModel) {
            // create a default rootNode and create internal data struct.
            Ext.applyIf(root, {
                id: me.defaultRootId,
                text: 'Root',
                allowDrag: false
            });
            if (root[idProperty] === undefined) {
                root[idProperty] = me.defaultRootId;
            }
            Ext.data.NodeInterface.decorate(model);
            root = Ext.ModelManager.create(root, model);
        } else if (root.isModel && !root.isNode) {
            Ext.data.NodeInterface.decorate(model);
        }


        // Because we have decorated the model with new fields,
        // we need to build new extactor functions on the reader.
        me.getProxy().getReader().buildExtractors(true);

        // When we add the root to the tree, it will automaticaly get the NodeInterface
        me.tree.setRootNode(root);

        // If the user has set expanded: true on the root, we want to call the expand function
        if (preventLoad !== true && !root.isLoaded() && (me.autoLoad === true || root.isExpanded())) {
            me.load({
                node: root
            });
        }

        return root;
    },

    /**
     * Returns the root node for this tree.
     * @return {Ext.data.NodeInterface}
     */
    getRootNode: function() {
        return this.tree.getRootNode();
    },

    /**
     * Returns the record node by id
     * @return {Ext.data.NodeInterface}
     */
    getNodeById: function(id) {
        return this.tree.getNodeById(id);
    },
    
    // inherit docs
    getById: function(id) {
        return this.getNodeById(id);    
    },

    /**
     * Loads the Store using its configured {@link #proxy}.
     * @param {Object} options (Optional) config object. This is passed into the {@link Ext.data.Operation Operation}
     * object that is created and then sent to the proxy's {@link Ext.data.proxy.Proxy#read} function.
     * The options can also contain a node, which indicates which node is to be loaded. If not specified, it will
     * default to the root node.
     */
    load: function(options) {
        options = options || {};
        options.params = options.params || {};

        var me = this,
            node = options.node || me.tree.getRootNode();

        // If there is not a node it means the user hasnt defined a rootnode yet. In this case lets just
        // create one for them.
        if (!node) {
            node = me.setRootNode({
                expanded: true
            }, true);
        }

        // Assign the ID of the Operation so that a REST proxy can create the correct URL
        options.id = node.getId();

        if (me.clearOnLoad) {
            if(me.clearRemovedOnLoad) {
                // clear from the removed array any nodes that were descendants of the node being reloaded so that they do not get saved on next sync.
                me.clearRemoved(node);
            }
            // temporarily remove the onNodeRemove event listener so that when removeAll is called, the removed nodes do not get added to the removed array
            me.tree.un('remove', me.onNodeRemove, me);
            // remove all the nodes
            node.removeAll(false);
            // reattach the onNodeRemove listener
            me.tree.on('remove', me.onNodeRemove, me);
        }

        Ext.applyIf(options, {
            node: node
        });
        options.params[me.nodeParam] = node ? node.getId() : 'root';

        if (node) {
            node.set('loading', true);
        }

        return me.callParent([options]);
    },

    /**
     * Removes all records that used to be descendants of the passed node from the removed array
     * @private
     * @param {Ext.data.NodeInterface} node
     */
    clearRemoved: function(node) {
        var me = this,
            removed = me.removed,
            id = node.getId(),
            removedLength = removed.length,
            i = removedLength,
            recordsToClear = {},
            newRemoved = [],
            removedHash = {},
            removedNode,
            targetNode,
            targetId;

        if(node === me.getRootNode()) {
            // if the passed node is the root node, just reset the removed array
            me.removed = [];
            return;
        }

        // add removed records to a hash so they can be easily retrieved by id later
        for(; i--;) {
            removedNode = removed[i];
            removedHash[removedNode.getId()] = removedNode;
        }

        for(i = removedLength; i--;) {
            removedNode = removed[i];
            targetNode = removedNode;
            while(targetNode && targetNode.getId() !== id) {
                // walk up the parent hierarchy until we find the passed node or until we get to the root node
                targetId = targetNode.get('parentId');
                targetNode = targetNode.parentNode || me.getNodeById(targetId) || removedHash[targetId];
            }
            if(targetNode) {
                // removed node was previously a descendant of the passed node - add it to the records to clear from "removed" later
                recordsToClear[removedNode.getId()] = removedNode;
            }
        }

        // create a new removed array containing only the records that are not in recordsToClear
        for(i = 0; i < removedLength; i++) {
            removedNode = removed[i];
            if(!recordsToClear[removedNode.getId()]) {
                newRemoved.push(removedNode);
            }
        }

        me.removed = newRemoved;
    },

    /**
     * Fills a node with a series of child records.
     * @private
     * @param {Ext.data.NodeInterface} node The node to fill
     * @param {Ext.data.Model[]} newNodes The records to add
     */
    fillNode: function(node, newNodes) {
        var me = this,
            ln = newNodes ? newNodes.length : 0,
            sorters = me.sorters,
            i, sortCollection,
            needsIndexSort = false,
            performLocalSort = ln && me.sortOnLoad && !me.remoteSort && sorters && sorters.items && sorters.items.length,
            node1, node2;

        // See if there are any differing index values in the new nodes. If not, then we do not have to sortByIndex
        for (i = 1; i < ln; i++) {
            node1 = newNodes[i];
            node2 = newNodes[i - 1];
            needsIndexSort = node1[node1.persistenceProperty].index != node2[node2.persistenceProperty].index;
            if (needsIndexSort) {
                break;
            }
        }

        // If there is a set of local sorters defined.
        if (performLocalSort) {
            // If sorting by index is needed, sort by index first
            if (needsIndexSort) {
                me.sorters.insert(0, me.indexSorter);
            }
            sortCollection = new Ext.util.MixedCollection();
            sortCollection.addAll(newNodes);
            sortCollection.sort(me.sorters.items);
            newNodes = sortCollection.items;

            // Remove the index sorter
            me.sorters.remove(me.indexSorter);
        } else if (needsIndexSort) {
            Ext.Array.sort(newNodes, me.sortByIndex);
        }

        node.set('loaded', true);
        for (i = 0; i < ln; i++) {
            node.appendChild(newNodes[i], undefined, true);
        }

        return newNodes;
    },

    /**
     * Sorter function for sorting records in index order
     * @private
     * @param {Ext.data.NodeInterface} node1
     * @param {Ext.data.NodeInterface} node2
     * @return {Number}
     */
    sortByIndex: function(node1, node2) {
        return node1[node1.persistenceProperty].index - node2[node2.persistenceProperty].index;
    },

    // inherit docs
    onProxyLoad: function(operation) {
        var me = this,
            successful = operation.wasSuccessful(),
            records = operation.getRecords(),
            node = operation.node;

        me.loading = false;
        node.set('loading', false);
        if (successful) {
            if (!me.clearOnLoad) {
                records = me.cleanRecords(node, records);
            }
            records = me.fillNode(node, records);
        }
        // The load event has an extra node parameter
        // (differing from the load event described in AbstractStore)
        /**
         * @event load
         * Fires whenever the store reads data from a remote data source.
         * @param {Ext.data.TreeStore} this
         * @param {Ext.data.NodeInterface} node The node that was loaded.
         * @param {Ext.data.Model[]} records An array of records.
         * @param {Boolean} successful True if the operation was successful.
         */
        // deprecate read?
        me.fireEvent('read', me, operation.node, records, successful);
        me.fireEvent('load', me, operation.node, records, successful);
        //this is a callback that would have been passed to the 'read' function and is optional
        Ext.callback(operation.callback, operation.scope || me, [records, operation, successful]);
    },
    
    onCreateRecords: function(records) {
        this.callParent(arguments);
        
        var i = 0,
            len = records.length,
            tree = this.tree,
            node;

        for (; i < len; ++i) {
            node = records[i];
            tree.onNodeIdChanged(node, null, node.getId());
        }
        
    },
    
    cleanRecords: function(node, records){
        var nodeHash = {},
            childNodes = node.childNodes,
            i = 0,
            len  = childNodes.length,
            out = [],
            rec;
            
        // build a hash of all the childNodes under the current node for performance
        for (; i < len; ++i) {
            nodeHash[childNodes[i].getId()] = true;
        }
        
        for (i = 0, len = records.length; i < len; ++i) {
            rec = records[i];
            if (!nodeHash[rec.getId()]) {
                out.push(rec);    
            }
        }
        
        return out;
    },

    // inherit docs
    removeAll: function() {
        var root = this.getRootNode();
        if (root) {
            root.destroy(true);
        }
        this.fireEvent('clear', this);
    },

    // inherit docs
    doSort: function(sorterFn) {
        var me = this;
        if (me.remoteSort) {
            //the load function will pick up the new sorters and request the sorted data from the proxy
            me.load();
        } else {
            me.tree.sort(sorterFn, true);
            me.fireEvent('datachanged', me);
            me.fireEvent('refresh', me);
        }
        me.fireEvent('sort', me);
    }
}, function() {
    var proto = this.prototype;
    proto.indexSorter = new Ext.util.Sorter({
        sorterFn: proto.sortByIndex
    });
});

/**
 * @author Ed Spencer
 *
 * AjaxProxy is one of the most widely-used ways of getting data into your application. It uses AJAX requests to load
 * data from the server, usually to be placed into a {@link Ext.data.Store Store}. Let's take a look at a typical setup.
 * Here we're going to set up a Store that has an AjaxProxy. To prepare, we'll also set up a {@link Ext.data.Model
 * Model}:
 *
 *     Ext.define('User', {
 *         extend: 'Ext.data.Model',
 *         fields: ['id', 'name', 'email']
 *     });
 *
 *     //The Store contains the AjaxProxy as an inline configuration
 *     var store = Ext.create('Ext.data.Store', {
 *         model: 'User',
 *         proxy: {
 *             type: 'ajax',
 *             url : 'users.json'
 *         }
 *     });
 *
 *     store.load();
 *
 * Our example is going to load user data into a Store, so we start off by defining a {@link Ext.data.Model Model} with
 * the fields that we expect the server to return. Next we set up the Store itself, along with a
 * {@link Ext.data.Store#proxy proxy} configuration. This configuration was automatically turned into an
 * Ext.data.proxy.Ajax instance, with the url we specified being passed into AjaxProxy's constructor.
 * It's as if we'd done this:
 *
 *     new Ext.data.proxy.Ajax({
 *         url: 'users.json',
 *         model: 'User',
 *         reader: 'json'
 *     });
 *
 * A couple of extra configurations appeared here - {@link #model} and {@link #reader}. These are set by default when we
 * create the proxy via the Store - the Store already knows about the Model, and Proxy's default {@link
 * Ext.data.reader.Reader Reader} is {@link Ext.data.reader.Json JsonReader}.
 *
 * Now when we call store.load(), the AjaxProxy springs into action, making a request to the url we configured
 * ('users.json' in this case). As we're performing a read, it sends a GET request to that url (see
 * {@link #actionMethods} to customize this - by default any kind of read will be sent as a GET request and any kind of write
 * will be sent as a POST request).
 *
 * # Limitations
 *
 * AjaxProxy cannot be used to retrieve data from other domains. If your application is running on http://domainA.com it
 * cannot load data from http://domainB.com because browsers have a built-in security policy that prohibits domains
 * talking to each other via AJAX.
 *
 * If you need to read data from another domain and can't set up a proxy server (some software that runs on your own
 * domain's web server and transparently forwards requests to http://domainB.com, making it look like they actually came
 * from http://domainA.com), you can use {@link Ext.data.proxy.JsonP} and a technique known as JSON-P (JSON with
 * Padding), which can help you get around the problem so long as the server on http://domainB.com is set up to support
 * JSON-P responses. See {@link Ext.data.proxy.JsonP JsonPProxy}'s introduction docs for more details.
 *
 * # Readers and Writers
 *
 * AjaxProxy can be configured to use any type of {@link Ext.data.reader.Reader Reader} to decode the server's response.
 * If no Reader is supplied, AjaxProxy will default to using a {@link Ext.data.reader.Json JsonReader}. Reader
 * configuration can be passed in as a simple object, which the Proxy automatically turns into a {@link
 * Ext.data.reader.Reader Reader} instance:
 *
 *     var proxy = new Ext.data.proxy.Ajax({
 *         model: 'User',
 *         reader: {
 *             type: 'xml',
 *             root: 'users'
 *         }
 *     });
 *
 *     proxy.getReader(); //returns an {@link Ext.data.reader.Xml XmlReader} instance based on the config we supplied
 *
 * # Url generation
 *
 * AjaxProxy automatically inserts any sorting, filtering, paging and grouping options into the url it generates for
 * each request. These are controlled with the following configuration options:
 *
 * - {@link #pageParam} - controls how the page number is sent to the server (see also {@link #startParam} and {@link #limitParam})
 * - {@link #sortParam} - controls how sort information is sent to the server
 * - {@link #groupParam} - controls how grouping information is sent to the server
 * - {@link #filterParam} - controls how filter information is sent to the server
 *
 * Each request sent by AjaxProxy is described by an {@link Ext.data.Operation Operation}. To see how we can customize
 * the generated urls, let's say we're loading the Proxy with the following Operation:
 *
 *     var operation = new Ext.data.Operation({
 *         action: 'read',
 *         page  : 2
 *     });
 *
 * Now we'll issue the request for this Operation by calling {@link #read}:
 *
 *     var proxy = new Ext.data.proxy.Ajax({
 *         url: '/users'
 *     });
 *
 *     proxy.read(operation); //GET /users?page=2
 *
 * Easy enough - the Proxy just copied the page property from the Operation. We can customize how this page data is sent
 * to the server:
 *
 *     var proxy = new Ext.data.proxy.Ajax({
 *         url: '/users',
 *         pageParam: 'pageNumber'
 *     });
 *
 *     proxy.read(operation); //GET /users?pageNumber=2
 *
 * Alternatively, our Operation could have been configured to send start and limit parameters instead of page:
 *
 *     var operation = new Ext.data.Operation({
 *         action: 'read',
 *         start : 50,
 *         limit : 25
 *     });
 *
 *     var proxy = new Ext.data.proxy.Ajax({
 *         url: '/users'
 *     });
 *
 *     proxy.read(operation); //GET /users?start=50&limit;=25
 *
 * Again we can customize this url:
 *
 *     var proxy = new Ext.data.proxy.Ajax({
 *         url: '/users',
 *         startParam: 'startIndex',
 *         limitParam: 'limitIndex'
 *     });
 *
 *     proxy.read(operation); //GET /users?startIndex=50&limitIndex;=25
 *
 * AjaxProxy will also send sort and filter information to the server. Let's take a look at how this looks with a more
 * expressive Operation object:
 *
 *     var operation = new Ext.data.Operation({
 *         action: 'read',
 *         sorters: [
 *             new Ext.util.Sorter({
 *                 property : 'name',
 *                 direction: 'ASC'
 *             }),
 *             new Ext.util.Sorter({
 *                 property : 'age',
 *                 direction: 'DESC'
 *             })
 *         ],
 *         filters: [
 *             new Ext.util.Filter({
 *                 property: 'eyeColor',
 *                 value   : 'brown'
 *             })
 *         ]
 *     });
 *
 * This is the type of object that is generated internally when loading a {@link Ext.data.Store Store} with sorters and
 * filters defined. By default the AjaxProxy will JSON encode the sorters and filters, resulting in something like this
 * (note that the url is escaped before sending the request, but is left unescaped here for clarity):
 *
 *     var proxy = new Ext.data.proxy.Ajax({
 *         url: '/users'
 *     });
 *
 *     proxy.read(operation); //GET /users?sort=[{"property":"name","direction":"ASC"},{"property":"age","direction":"DESC"}]&filter;=[{"property":"eyeColor","value":"brown"}]
 *
 * We can again customize how this is created by supplying a few configuration options. Let's say our server is set up
 * to receive sorting information is a format like "sortBy=name#ASC,age#DESC". We can configure AjaxProxy to provide
 * that format like this:
 *
 *      var proxy = new Ext.data.proxy.Ajax({
 *          url: '/users',
 *          sortParam: 'sortBy',
 *          filterParam: 'filterBy',
 *
 *          //our custom implementation of sorter encoding - turns our sorters into "name#ASC,age#DESC"
 *          encodeSorters: function(sorters) {
 *              var length   = sorters.length,
 *                  sortStrs = [],
 *                  sorter, i;
 *
 *              for (i = 0; i < length; i++) {
 *                  sorter = sorters[i];
 *
 *                  sortStrs[i] = sorter.property + '#' + sorter.direction
 *              }
 *
 *              return sortStrs.join(",");
 *          }
 *      });
 *
 *      proxy.read(operation); //GET /users?sortBy=name#ASC,age#DESC&filterBy;=[{"property":"eyeColor","value":"brown"}]
 *
 * We can also provide a custom {@link #encodeFilters} function to encode our filters.
 *
 * @constructor
 * Note that if this HttpProxy is being used by a {@link Ext.data.Store Store}, then the Store's call to
 * {@link Ext.data.Store#method-load load} will override any specified callback and params options. In this case, use the
 * {@link Ext.data.Store Store}'s events to modify parameters, or react to loading events.
 *
 * @param {Object} config (optional) Config object.
 * If an options parameter is passed, the singleton {@link Ext.Ajax} object will be used to make the request.
 */
Ext.define('Ext.data.proxy.Ajax', {
    requires: ['Ext.util.MixedCollection', 'Ext.Ajax'],
    extend: 'Ext.data.proxy.Server',
    alias: 'proxy.ajax',
    alternateClassName: ['Ext.data.HttpProxy', 'Ext.data.AjaxProxy'],
    
    /**
     * @property {Object} actionMethods
     * Mapping of action name to HTTP request method. In the basic AjaxProxy these are set to 'GET' for 'read' actions
     * and 'POST' for 'create', 'update' and 'destroy' actions. The {@link Ext.data.proxy.Rest} maps these to the
     * correct RESTful methods.
     */
    actionMethods: {
        create : 'POST',
        read   : 'GET',
        update : 'POST',
        destroy: 'POST'
    },
    
    /**
     * @cfg {Object} headers
     * Any headers to add to the Ajax request. Defaults to undefined.
     */
    
    doRequest: function(operation, callback, scope) {
        var writer  = this.getWriter(),
            request = this.buildRequest(operation, callback, scope);
            
        if (operation.allowWrite()) {
            request = writer.write(request);
        }
        
        Ext.apply(request, {
            headers       : this.headers,
            timeout       : this.timeout,
            scope         : this,
            callback      : this.createRequestCallback(request, operation, callback, scope),
            method        : this.getMethod(request),
            disableCaching: false // explicitly set it to false, ServerProxy handles caching
        });
        
        Ext.Ajax.request(request);
        
        return request;
    },
    
    /**
     * Returns the HTTP method name for a given request. By default this returns based on a lookup on
     * {@link #actionMethods}.
     * @param {Ext.data.Request} request The request object
     * @return {String} The HTTP method to use (should be one of 'GET', 'POST', 'PUT' or 'DELETE')
     */
    getMethod: function(request) {
        return this.actionMethods[request.action];
    },
    
    /**
     * @private
     * TODO: This is currently identical to the JsonPProxy version except for the return function's signature. There is a lot
     * of code duplication inside the returned function so we need to find a way to DRY this up.
     * @param {Ext.data.Request} request The Request object
     * @param {Ext.data.Operation} operation The Operation being executed
     * @param {Function} callback The callback function to be called when the request completes. This is usually the callback
     * passed to doRequest
     * @param {Object} scope The scope in which to execute the callback function
     * @return {Function} The callback function
     */
    createRequestCallback: function(request, operation, callback, scope) {
        var me = this;
        
        return function(options, success, response) {
            me.processResponse(success, operation, request, response, callback, scope);
        };
    }
}, function() {
    //backwards compatibility, remove in Ext JS 5.0
    Ext.data.HttpProxy = this;
});

/**
 * The Store class encapsulates a client side cache of {@link Ext.data.Model Model} objects. Stores load data via a
 * {@link Ext.data.proxy.Proxy Proxy}, and also provide functions for {@link #sort sorting}, {@link #filter filtering}
 * and querying the {@link Ext.data.Model model} instances contained within it.
 *
 * Creating a Store is easy - we just tell it the Model and the Proxy to use to load and save its data:
 *
 *      // Set up a {@link Ext.data.Model model} to use in our Store
 *      Ext.define('User', {
 *          extend: 'Ext.data.Model',
 *          fields: [
 *              {name: 'firstName', type: 'string'},
 *              {name: 'lastName',  type: 'string'},
 *              {name: 'age',       type: 'int'},
 *              {name: 'eyeColor',  type: 'string'}
 *          ]
 *      });
 *
 *      var myStore = Ext.create('Ext.data.Store', {
 *          model: 'User',
 *          proxy: {
 *              type: 'ajax',
 *              url: '/users.json',
 *              reader: {
 *                  type: 'json',
 *                  root: 'users'
 *              }
 *          },
 *          autoLoad: true
 *      });
 *
 * In the example above we configured an AJAX proxy to load data from the url '/users.json'. We told our Proxy to use a
 * {@link Ext.data.reader.Json JsonReader} to parse the response from the server into Model object - {@link
 * Ext.data.reader.Json see the docs on JsonReader} for details.
 *
 * ## Inline data
 *
 * Stores can also load data inline. Internally, Store converts each of the objects we pass in as {@link #cfg-data} into
 * Model instances:
 *
 *      Ext.create('Ext.data.Store', {
 *          model: 'User',
 *          data : [
 *              {firstName: 'Ed',    lastName: 'Spencer'},
 *              {firstName: 'Tommy', lastName: 'Maintz'},
 *              {firstName: 'Aaron', lastName: 'Conran'},
 *              {firstName: 'Jamie', lastName: 'Avins'}
 *          ]
 *      });
 *
 * Loading inline data using the method above is great if the data is in the correct format already (e.g. it doesn't
 * need to be processed by a {@link Ext.data.reader.Reader reader}). If your inline data requires processing to decode
 * the data structure, use a {@link Ext.data.proxy.Memory MemoryProxy} instead (see the {@link Ext.data.proxy.Memory
 * MemoryProxy} docs for an example).
 *
 * Additional data can also be loaded locally using {@link #method-add}.
 * 
 * ## Dynamic Loading
 *
 * Stores can be dynamically updated by calling the {@link #method-load} method:
 *
 *     store.load({
 *         params: {
 *             group: 3,
 *             type: 'user'
 *         },
 *         callback: function(records, operation, success) {
 *             // do something after the load finishes
 *         },
 *         scope: this
 *     });
 *
 * Here a bunch of arbitrary parameters is passed along with the load request and a callback function is set
 * up to do something after the loading is over.
 *
 * ## Loading Nested Data
 *
 * Applications often need to load sets of associated data - for example a CRM system might load a User and her Orders.
 * Instead of issuing an AJAX request for the User and a series of additional AJAX requests for each Order, we can load
 * a nested dataset and allow the Reader to automatically populate the associated models. Below is a brief example, see
 * the {@link Ext.data.reader.Reader} intro docs for a full explanation:
 *
 *      var store = Ext.create('Ext.data.Store', {
 *          autoLoad: true,
 *          model: "User",
 *          proxy: {
 *              type: 'ajax',
 *              url: 'users.json',
 *              reader: {
 *                  type: 'json',
 *                  root: 'users'
 *              }
 *          }
 *      });
 *
 * Which would consume a response like this:
 *
 *      {
 *          "users": [{
 *              "id": 1,
 *              "name": "Ed",
 *              "orders": [{
 *                  "id": 10,
 *                  "total": 10.76,
 *                  "status": "invoiced"
 *             },{
 *                  "id": 11,
 *                  "total": 13.45,
 *                  "status": "shipped"
 *             }]
 *          }]
 *      }
 *
 * See the {@link Ext.data.reader.Reader} intro docs for a full explanation.
 *
 * ## Filtering and Sorting
 *
 * Stores can be sorted and filtered - in both cases either remotely or locally. The {@link #sorters} and
 * {@link #cfg-filters} are held inside {@link Ext.util.MixedCollection MixedCollection} instances to make them easy to manage.
 * Usually it is sufficient to either just specify sorters and filters in the Store configuration or call {@link #sort}
 * or {@link #filter}:
 *
 *      var store = Ext.create('Ext.data.Store', {
 *          model: 'User',
 *          sorters: [{
 *              property: 'age',
 *              direction: 'DESC'
 *          }, {
 *              property: 'firstName',
 *              direction: 'ASC'
 *          }],
 *
 *          filters: [{
 *              property: 'firstName',
 *              value: /Ed/
 *          }]
 *      });
 *
 * The new Store will keep the configured sorters and filters in the MixedCollection instances mentioned above. By
 * default, sorting and filtering are both performed locally by the Store - see {@link #remoteSort} and
 * {@link #remoteFilter} to allow the server to perform these operations instead.
 *
 * Filtering and sorting after the Store has been instantiated is also easy. Calling {@link #filter} adds another filter
 * to the Store and automatically filters the dataset (calling {@link #filter} with no arguments simply re-applies all
 * existing filters). Note that by default {@link #sortOnFilter} is set to true, which means that your sorters are
 * automatically reapplied if using local sorting.
 *
 *      store.filter('eyeColor', 'Brown');
 *
 * Change the sorting at any time by calling {@link #sort}:
 *
 *      store.sort('height', 'ASC');
 *
 * Note that all existing sorters will be removed in favor of the new sorter data (if {@link #sort} is called with no
 * arguments, the existing sorters are just reapplied instead of being removed). To keep existing sorters and add new
 * ones, just add them to the MixedCollection:
 *
 *      store.sorters.add(new Ext.util.Sorter({
 *          property : 'shoeSize',
 *          direction: 'ASC'
 *      }));
 *
 *      store.sort();
 *
 * ## Registering with StoreManager
 *
 * Any Store that is instantiated with a {@link #storeId} will automatically be registed with the {@link
 * Ext.data.StoreManager StoreManager}. This makes it easy to reuse the same store in multiple views:
 *
 *      //this store can be used several times
 *      Ext.create('Ext.data.Store', {
 *          model: 'User',
 *          storeId: 'usersStore'
 *      });
 *
 *      new Ext.List({
 *          store: 'usersStore',
 *          //other config goes here
 *      });
 *
 *      new Ext.view.View({
 *          store: 'usersStore',
 *          //other config goes here
 *      });
 *
 * ## Further Reading
 *
 * Stores are backed up by an ecosystem of classes that enables their operation. To gain a full understanding of these
 * pieces and how they fit together, see:
 *
 *   - {@link Ext.data.proxy.Proxy Proxy} - overview of what Proxies are and how they are used
 *   - {@link Ext.data.Model Model} - the core class in the data package
 *   - {@link Ext.data.reader.Reader Reader} - used by any subclass of {@link Ext.data.proxy.Server ServerProxy} to read a response
 *
 * @author Ed Spencer
 */
Ext.define('Ext.data.Store', {
    extend: 'Ext.data.AbstractStore',

    alias: 'store.store',

    // Required classes must be loaded before the definition callback runs
    // The class definition callback creates a dummy Store which requires that
    // all the classes below have been loaded.
    requires: [
        'Ext.data.StoreManager',
        'Ext.data.Model',
        'Ext.data.proxy.Ajax',
        'Ext.data.proxy.Memory',
        'Ext.data.reader.Json',
        'Ext.data.writer.Json',
        'Ext.util.LruCache'
    ],

    uses: [
        'Ext.ModelManager',
        'Ext.util.Grouper'
    ],

    remoteSort: false,
    remoteFilter: false,

    /**
     * @cfg {Boolean} remoteGroup
     * True if the grouping should apply on the server side, false if it is local only.  If the
     * grouping is local, it can be applied immediately to the data.  If it is remote, then it will simply act as a
     * helper, automatically sending the grouping information to the server.
     */
    remoteGroup : false,

    /**
     * @cfg {String/Ext.data.proxy.Proxy/Object} proxy
     * The Proxy to use for this Store. This can be either a string, a config object or a Proxy instance -
     * see {@link #setProxy} for details.
     */

    /**
     * @cfg {Object[]/Ext.data.Model[]} data
     * Array of Model instances or data objects to load locally. See "Inline data" above for details.
     */

    /**
     * @cfg {String} groupField
     * The field by which to group data in the store. Internally, grouping is very similar to sorting - the
     * groupField and {@link #groupDir} are injected as the first sorter (see {@link #sort}). Stores support a single
     * level of grouping, and groups can be fetched via the {@link #getGroups} method.
     */
    groupField: undefined,

    /**
     * @cfg {String} groupDir
     * The direction in which sorting should be applied when grouping. Supported values are "ASC" and "DESC".
     */
    groupDir: "ASC",

    /**
     * @cfg {Number} trailingBufferZone
     * When {@link #buffered}, the number of extra records to keep cached on the trailing side of scrolling buffer
     * as scrolling proceeds. A larger number means fewer replenishments from the server.
     */
    trailingBufferZone: 25,

    /**
     * @cfg {Number} leadingBufferZone
     * When {@link #buffered}, the number of extra rows to keep cached on the leading side of scrolling buffer
     * as scrolling proceeds. A larger number means fewer replenishments from the server.
     */
    leadingBufferZone: 200,

    /**
     * @cfg {Number} pageSize
     * The number of records considered to form a 'page'. This is used to power the built-in
     * paging using the nextPage and previousPage functions when the grid is paged using a
     * {@link Ext.toolbar.Paging PagingScroller} Defaults to 25.
     *
     * If this Store is {@link #buffered}, pages are loaded into a page cache before the Store's
     * data is updated from the cache. The pageSize is the number of rows loaded into the cache in one request.
     * This will not affect the rendering of a buffered grid, but a larger page size will mean fewer loads.
     *
     * In a buffered grid, scrolling is monitored, and the page cache is kept primed with data ahead of the
     * direction of scroll to provide rapid access to data when scrolling causes it to be required. Several pages
     * in advance may be requested depending on various parameters.
     *
     * It is recommended to tune the {@link #pageSize}, {@link #trailingBufferZone} and
     * {@link #leadingBufferZone} configurations based upon the conditions pertaining in your deployed application.
     *
     * The provided SDK example `examples/grid/infinite-scroll-grid-tuner.html` can be used to experiment with
     * different settings including simulating Ajax latency.
     */
    pageSize: undefined,

    /**
     * @property {Number} currentPage
     * The page that the Store has most recently loaded (see {@link #loadPage})
     */
    currentPage: 1,

    /**
     * @cfg {Boolean} clearOnPageLoad
     * True to empty the store when loading another page via {@link #loadPage},
     * {@link #nextPage} or {@link #previousPage}. Setting to false keeps existing records, allowing
     * large data sets to be loaded one page at a time but rendered all together.
     */
    clearOnPageLoad: true,

    /**
     * @property {Boolean} loading
     * True if the Store is currently loading via its Proxy
     * @private
     */
    loading: false,

    /**
     * @cfg {Boolean} sortOnFilter
     * For local filtering only, causes {@link #sort} to be called whenever {@link #filter} is called,
     * causing the sorters to be reapplied after filtering. Defaults to true
     */
    sortOnFilter: true,

    /**
     * @cfg {Boolean} buffered
     * Allows the Store to prefetch and cache in a **page cache**, pages of Records, and to then satisfy
     * loading requirements from this page cache.
     *
     * To use buffered Stores, initiate the process by loading the first page. The number of rows rendered are
     * determined automatically, and the range of pages needed to keep the cache primed for scrolling is
     * requested and cached.
     * Example:
     *
     *    // Load page 1
     *    myStore.loadPage(1);
     *
     * A {@link Ext.grid.PagingScroller PagingScroller} is instantiated which will monitor the scrolling in the grid, and
     * refresh the view's rows from the page cache as needed. It will also pull new data into the page
     * cache when scrolling of the view draws upon data near either end of the prefetched data.
     *
     * The margins which trigger view refreshing from the prefetched data are {@link Ext.grid.PagingScroller#numFromEdge},
     * {@link Ext.grid.PagingScroller#leadingBufferZone} and {@link Ext.grid.PagingScroller#trailingBufferZone}.
     *
     * The margins which trigger loading more data into the page cache are, {@link #leadingBufferZone} and
     * {@link #trailingBufferZone}.
     *
     * By defult, only 5 pages of data are cached in the page cache, with pages "scrolling" out of the buffer
     * as the view moves down through the dataset.
     * Setting this value to zero means that no pages are *ever* scrolled out of the page cache, and
     * that eventually the whole dataset may become present in the page cache. This is sometimes desirable
     * as long as datasets do not reach astronomical proportions.
     *
     * Selection state may be maintained across page boundaries by configuring the SelectionModel not to discard
     * records from its collection when those Records cycle out of the Store's primary collection. This is done
     * by configuring the SelectionModel like this:
     *
     *    selModel: {
     *        pruneRemoved: false
     *    }
     *
     */
    buffered: false,

    /**
     * @cfg {Number} purgePageCount
     * *Valid only when used with a {@link Ext.data.Store#buffered buffered} Store.*
     *
     * The number of pages *additional to the required buffered range* to keep in the prefetch cache before purging least recently used records.
     *
     * For example, if the height of the view area and the configured {@link #trailingBufferZone} and {@link #leadingBufferZone} require that there
     * are three pages in the cache, then a `purgePageCount` of 5 ensures that up to 8 pages can be in the page cache any any one time.
     *
     * A value of 0 indicates to never purge the prefetched data.
     */
    purgePageCount: 5,

    /**
     * @cfg {Boolean} [clearRemovedOnLoad=true]
     * True to clear anything in the {@link #removed} record collection when the store loads.
     */
    clearRemovedOnLoad: true,

    defaultPageSize: 25,

    // Private. Used as parameter to loadRecords
    addRecordsOptions: {
        addRecords: true
    },

    statics: {
        recordIdFn: function(record) {
            return record.internalId;
        },
        recordIndexFn: function(record) {
            return record.index;
        }
    },

    onClassExtended: function(cls, data, hooks) {
        var model = data.model,
            onBeforeClassCreated;

        if (typeof model == 'string') {
            onBeforeClassCreated = hooks.onBeforeCreated;

            hooks.onBeforeCreated = function() {
                var me = this,
                    args = arguments;

                Ext.require(model, function() {
                    onBeforeClassCreated.apply(me, args);
                });
            };
        }
    },

    /**
     * Creates the store.
     * @param {Object} [config] Config object
     */
    constructor: function(config) {
        // Clone the config so we don't modify the original config object
        config = Ext.Object.merge({}, config);

        var me = this,
            groupers = config.groupers || me.groupers,
            groupField = config.groupField || me.groupField,
            proxy,
            data;

        /**
         * @event beforeprefetch
         * Fires before a prefetch occurs. Return false to cancel.
         * @param {Ext.data.Store} this
         * @param {Ext.data.Operation} operation The associated operation
         */
        /**
         * @event groupchange
         * Fired whenever the grouping in the grid changes
         * @param {Ext.data.Store} store The store
         * @param {Ext.util.Grouper[]} groupers The array of grouper objects
         */
        /**
         * @event prefetch
         * Fires whenever records have been prefetched
         * @param {Ext.data.Store} this
         * @param {Ext.data.Model[]} records An array of records.
         * @param {Boolean} successful True if the operation was successful.
         * @param {Ext.data.Operation} operation The associated operation
         */
        data = config.data || me.data;

        /**
         * @property {Ext.util.MixedCollection} data
         * The MixedCollection that holds this store's local cache of records.
         */
        me.data = new Ext.util.MixedCollection(false, Ext.data.Store.recordIdFn);

        if (data) {
            me.inlineData = data;
            delete config.data;
        }

        if (!groupers && groupField) {
            groupers = [{
                property : groupField,
                direction: config.groupDir || me.groupDir
            }];
        }
        delete config.groupers;

        /**
         * @property {Ext.util.MixedCollection} groupers
         * The collection of {@link Ext.util.Grouper Groupers} currently applied to this Store.
         */
        me.groupers = new Ext.util.MixedCollection();
        me.groupers.addAll(me.decodeGroupers(groupers));

        this.callParent([config]);
        // don't use *config* anymore from here on... use *me* instead...

        if (me.buffered) {

            /**
             * @property {Ext.data.Store.PageMap} pageMap
             * Internal PageMap instance.
             * @private
             */
            me.pageMap = new me.PageMap({
                pageSize: me.pageSize,
                maxSize: me.purgePageCount,
                listeners: {
                    // Whenever PageMap gets cleared, it means we re no longer interested in 
                    // any outstanding page prefetches, so cancel tham all
                    clear: me.cancelAllPrefetches,
                    scope: me
                }
            });
            me.pageRequests = {};

            me.sortOnLoad = false;
            me.filterOnLoad = false;
        }

        // Only sort by group fields if we are doing local grouping
        if (me.remoteGroup) {
            me.remoteSort = true;
        }
        if (me.groupers.items.length && !me.remoteGroup) {
            me.sort(me.groupers.items, 'prepend', false);
        }

        proxy = me.proxy;
        data = me.inlineData;

        // Page size for non-buffered Store defaults to 25
        // For a buffered Store, the default page size is taken from the initial call to prefetch.
        if (!me.buffered && !me.pageSize) {
            me.pageSize = me.defaultPageSize;
        }

        if (data) {
            if (proxy instanceof Ext.data.proxy.Memory) {
                proxy.data = data;
                me.read();
            } else {
                me.add.apply(me, [data]);
            }

            me.sort();
            delete me.inlineData;
        } else if (me.autoLoad) {
            Ext.defer(me.load, 10, me, [ typeof me.autoLoad === 'object' ? me.autoLoad : undefined ]);
            // Remove the defer call, we may need reinstate this at some point, but currently it's not obvious why it's here.
            // this.load(typeof this.autoLoad == 'object' ? this.autoLoad : undefined);
        }
    },

     // private override
     // After destroying the Store, clear the page prefetch cache
    destroyStore: function() {
        this.callParent(arguments);

        // Release cached pages.
        // Will also cancel outstanding prefetch requests, and cause a generation change
        // so that incoming prefetch data will be ignored.
        if (this.pageMap) {
            this.pageMap.clear();
        }
    },

    onBeforeSort: function() {
        var groupers = this.groupers;
        if (groupers.getCount() > 0) {
            this.sort(groupers.items, 'prepend', false);
        }
    },

    /**
     * @private
     * Normalizes an array of grouper objects, ensuring that they are all Ext.util.Grouper instances
     * @param {Object[]} groupers The groupers array
     * @return {Ext.util.Grouper[]} Array of Ext.util.Grouper objects
     */
    decodeGroupers: function(groupers) {
        if (!Ext.isArray(groupers)) {
            if (groupers === undefined) {
                groupers = [];
            } else {
                groupers = [groupers];
            }
        }

        var length = groupers.length,
            Grouper = Ext.util.Grouper,
            config, i, result = [];

        for (i = 0; i < length; i++) {
            config = groupers[i];

            if (!(config instanceof Grouper)) {
                if (Ext.isString(config)) {
                    config = {
                        property: config
                    };
                }

                config = Ext.apply({
                    root     : 'data',
                    direction: "ASC"
                }, config);

                //support for 3.x style sorters where a function can be defined as 'fn'
                if (config.fn) {
                    config.sorterFn = config.fn;
                }

                //support a function to be passed as a sorter definition
                if (typeof config == 'function') {
                    config = {
                        sorterFn: config
                    };
                }

                // return resulting Groupers in a separate array so as not to mutate passed in data objects.
                result.push(new Grouper(config));
            } else {
                result.push(config);
            }
        }
        return result;
    },

    /**
     * Groups data inside the store.
     * @param {String/Object[]} groupers Either a string name of one of the fields in this Store's
     * configured {@link Ext.data.Model Model}, or an Array of grouper configurations.
     * @param {String} [direction="ASC"] The overall direction to group the data by.
     */
    group: function(groupers, direction) {
        var me = this,
            hasNew = false,
            grouper,
            newGroupers;

        if (Ext.isArray(groupers)) {
            newGroupers = groupers;
        } else if (Ext.isObject(groupers)) {
            newGroupers = [groupers];
        } else if (Ext.isString(groupers)) {
            grouper = me.groupers.get(groupers);

            if (!grouper) {
                grouper = {
                    property : groupers,
                    direction: direction
                };
                newGroupers = [grouper];
            } else if (direction === undefined) {
                grouper.toggle();
            } else {
                grouper.setDirection(direction);
            }
        }

        if (newGroupers && newGroupers.length) {
            hasNew = true;
            newGroupers = me.decodeGroupers(newGroupers);
            me.groupers.clear();
            me.groupers.addAll(newGroupers);
        }

        if (me.remoteGroup) {
            if (me.buffered) {
                me.pageMap.clear();
                me.loadPage(1, { groupChange: true });
            } else {
                me.load({
                    scope: me,
                    callback: me.fireGroupChange
                });
            }
        } else {
            // need to explicitly force a sort if we have groupers
            me.sort(null, null, null, hasNew);
            me.fireGroupChange();
        }
    },

    /**
     * Clear any groupers in the store
     */
    clearGrouping: function() {
        var me       = this,
            groupers = me.groupers.items,
            gLen     = groupers.length,
            grouper, g;

        for (g = 0; g < gLen; g++) {
            grouper = groupers[g];

            me.sorters.remove(grouper);
        }
        me.groupers.clear();
        if (me.remoteGroup) {
            if (me.buffered) {
                me.pageMap.clear();
                me.loadPage(1, { groupChange: true });
            } else {
                me.load({
                    scope: me,
                    callback: me.fireGroupChange
                });
            }
        } else {
            me.sort();
            me.fireGroupChange();
        }
    },

    /**
     * Checks if the store is currently grouped
     * @return {Boolean} True if the store is grouped.
     */
    isGrouped: function() {
        return this.groupers.getCount() > 0;
    },

    /**
     * Fires the groupchange event. Abstracted out so we can use it
     * as a callback
     * @private
     */
    fireGroupChange: function() {
        this.fireEvent('groupchange', this, this.groupers);
    },

    /**
     * Returns an array containing the result of applying grouping to the records in this store.
     * See {@link #groupField}, {@link #groupDir} and {@link #getGroupString}. Example for a store
     * containing records with a color field:
     *
     *     var myStore = Ext.create('Ext.data.Store', {
     *         groupField: 'color',
     *         groupDir  : 'DESC'
     *     });
     *
     *     myStore.getGroups(); // returns:
     *     [
     *         {
     *             name: 'yellow',
     *             children: [
     *                 // all records where the color field is 'yellow'
     *             ]
     *         },
     *         {
     *             name: 'red',
     *             children: [
     *                 // all records where the color field is 'red'
     *             ]
     *         }
     *     ]
     *
     * Group contents are effected by filtering.
     *
     * @param {String} [groupName] Pass in an optional groupName argument to access a specific
     * group as defined by {@link #getGroupString}.
     * @return {Object/Object[]} The grouped data
     */
    getGroups: function(requestGroupString) {
        var records = this.data.items,
            length = records.length,
            groups = [],
            pointers = {},
            record,
            groupStr,
            group,
            i;

        for (i = 0; i < length; i++) {
            record = records[i];
            groupStr = this.getGroupString(record);
            group = pointers[groupStr];

            if (group === undefined) {
                group = {
                    name: groupStr,
                    children: []
                };

                groups.push(group);
                pointers[groupStr] = group;
            }

            group.children.push(record);
        }

        return requestGroupString ? pointers[requestGroupString] : groups;
    },

    /**
     * @private
     * For a given set of records and a Grouper, returns an array of arrays - each of which is the set of records
     * matching a certain group.
     */
    getGroupsForGrouper: function(records, grouper) {
        var length = records.length,
            groups = [],
            oldValue,
            newValue,
            record,
            group,
            i;

        for (i = 0; i < length; i++) {
            record = records[i];
            newValue = grouper.getGroupString(record);

            if (newValue !== oldValue) {
                group = {
                    name: newValue,
                    grouper: grouper,
                    records: []
                };
                groups.push(group);
            }

            group.records.push(record);

            oldValue = newValue;
        }

        return groups;
    },

    /**
     * @private
     * This is used recursively to gather the records into the configured Groupers. The data MUST have been sorted for
     * this to work properly (see {@link #getGroupData} and {@link #getGroupsForGrouper}) Most of the work is done by
     * {@link #getGroupsForGrouper} - this function largely just handles the recursion.
     *
     * @param {Ext.data.Model[]} records The set or subset of records to group
     * @param {Number} grouperIndex The grouper index to retrieve
     * @return {Object[]} The grouped records
     */
    getGroupsForGrouperIndex: function(records, grouperIndex) {
        var me = this,
            groupers = me.groupers,
            grouper = groupers.getAt(grouperIndex),
            groups = me.getGroupsForGrouper(records, grouper),
            length = groups.length,
            i;

        if (grouperIndex + 1 < groupers.length) {
            for (i = 0; i < length; i++) {
                groups[i].children = me.getGroupsForGrouperIndex(groups[i].records, grouperIndex + 1);
            }
        }

        for (i = 0; i < length; i++) {
            groups[i].depth = grouperIndex;
        }

        return groups;
    },

    /**
     * @private
     * Returns records grouped by the configured {@link #groupers grouper} configuration. Sample return value (in
     * this case grouping by genre and then author in a fictional books dataset):
     *
     *     [
     *         {
     *             name: 'Fantasy',
     *             depth: 0,
     *             records: [
     *                 //book1, book2, book3, book4
     *             ],
     *             children: [
     *                 {
     *                     name: 'Rowling',
     *                     depth: 1,
     *                     records: [
     *                         //book1, book2
     *                     ]
     *                 },
     *                 {
     *                     name: 'Tolkein',
     *                     depth: 1,
     *                     records: [
     *                         //book3, book4
     *                     ]
     *                 }
     *             ]
     *         }
     *     ]
     *
     * @param {Boolean} [sort=true] True to call {@link #sort} before finding groups. Sorting is required to make grouping
     * function correctly so this should only be set to false if the Store is known to already be sorted correctly.
     * @return {Object[]} The group data
     */
    getGroupData: function(sort) {
        var me = this;
        if (sort !== false) {
            me.sort();
        }

        return me.getGroupsForGrouperIndex(me.data.items, 0);
    },

    /**
     * Returns the string to group on for a given model instance. The default implementation of this method returns
     * the model's {@link #groupField}, but this can be overridden to group by an arbitrary string. For example, to
     * group by the first letter of a model's 'name' field, use the following code:
     *
     *     Ext.create('Ext.data.Store', {
     *         groupDir: 'ASC',
     *         getGroupString: function(instance) {
     *             return instance.get('name')[0];
     *         }
     *     });
     *
     * @param {Ext.data.Model} instance The model instance
     * @return {String} The string to compare when forming groups
     */
    getGroupString: function(instance) {
        var group = this.groupers.first();
        if (group) {
            return instance.get(group.property);
        }
        return '';
    },

    /**
     * Inserts Model instances into the Store at the given index and fires the {@link #event-add} event.
     * See also {@link #method-add}.
     *
     * @param {Number} index The start index at which to insert the passed Records.
     * @param {Ext.data.Model[]} records An Array of Ext.data.Model objects to add to the store.
     */
    insert: function(index, records) {
        var me = this,
            sync = false,
            i,
            record,
            len;

        records = [].concat(records);
        for (i = 0,len = records.length; i < len; i++) {
            record = me.createModel(records[i]);
            record.set(me.modelDefaults);
            // reassign the model in the array in case it wasn't created yet
            records[i] = record;

            me.data.insert(index + i, record);
            record.join(me);

            sync = sync || record.phantom === true;
        }

        if (me.snapshot) {
            me.snapshot.addAll(records);
        }

        if (me.requireSort) {
            // suspend events so the usual data changed events don't get fired.
            me.suspendEvents();
            me.sort();
            me.resumeEvents();
        }

        me.fireEvent('add', me, records, index);
        me.fireEvent('datachanged', me);
        if (me.autoSync && sync && !me.autoSyncSuspended) {
            me.sync();
        }
    },

    /**
     * Adds Model instance to the Store. This method accepts either:
     *
     * - An array of Model instances or Model configuration objects.
     * - Any number of Model instance or Model configuration object arguments.
     *
     * The new Model instances will be added at the end of the existing collection.
     *
     * Sample usage:
     *
     *     myStore.add({some: 'data'}, {some: 'other data'});
     *
     * Note that if this Store is sorted, the new Model instances will be inserted
     * at the correct point in the Store to maintain the sort order.
     *
     * @param {Ext.data.Model[]/Ext.data.Model...} model An array of Model instances
     * or Model configuration objects, or variable number of Model instance or config arguments.
     * @return {Ext.data.Model[]} The model instances that were added
     */
    add: function(records) {
        //accept both a single-argument array of records, or any number of record arguments
        if (!Ext.isArray(records)) {
            records = Array.prototype.slice.apply(arguments);
        } else {
            // Create an array copy
            records = records.slice(0);
        }

        var me = this,
            i = 0,
            length = records.length,
            record,
            isSorted = !me.remoteSort && me.sorters && me.sorters.items.length;

        // If this Store is sorted, and they only passed one Record (99% or use cases)
        // then it's much more efficient to add it sorted than to append and then sort.
        if (isSorted && length === 1) {
            return [ me.addSorted(me.createModel(records[0])) ];
        }

        for (; i < length; i++) {
            record = me.createModel(records[i]);
            // reassign the model in the array in case it wasn't created yet
            records[i] = record;
        }

        // If this sort is sorted, set the flag used by the insert method to sort
        // before firing events.
        if (isSorted) {
            me.requireSort = true;
        }

        me.insert(me.data.length, records);
        delete me.requireSort;

        return records;
    },

    /**
     * (Local sort only) Inserts the passed Record into the Store at the index where it
     * should go based on the current sort information.
     *
     * @param {Ext.data.Record} record
     */
    addSorted: function(record) {
        var me = this,
            index = me.data.findInsertionIndex(record, me.generateComparator());

        me.insert(index, record);
        return record;
    },

    /**
     * Converts a literal to a model, if it's not a model already
     * @private
     * @param {Ext.data.Model/Object} record The record to create
     * @return {Ext.data.Model}
     */
    createModel: function(record) {
        if (!record.isModel) {
            record = Ext.ModelManager.create(record, this.model);
        }

        return record;
    },

    /**
     * Calls the specified function for each {@link Ext.data.Model record} in the store.
     *
     * When store is filtered, only loops over the filtered records.
     *
     * @param {Function} fn The function to call. The {@link Ext.data.Model Record} is passed as the first parameter.
     * Returning `false` aborts and exits the iteration.
     * @param {Object} [scope] The scope (this reference) in which the function is executed.
     * Defaults to the current {@link Ext.data.Model record} in the iteration.
     */
    each: function(fn, scope) {
        var data = this.data.items,
            dLen = data.length,
            record, d;

        for (d = 0; d < dLen; d++) {
            record = data[d];
            if (fn.call(scope || record, record, d, dLen) === false) {
                break;
            }
        }
    },

    /**
     * Removes the given record from the Store, firing the 'remove' event for each instance that is removed,
     * plus a single 'datachanged' event after removal.
     *
     * @param {Ext.data.Model/Ext.data.Model[]} records Model instance or array of instances to remove.
     */
    remove: function(records, /* private */ isMove) {
        if (!Ext.isArray(records)) {
            records = [records];
        }

        /*
         * Pass the isMove parameter if we know we're going to be re-inserting this record
         */
        isMove = isMove === true;
        var me = this,
            sync = false,
            i = 0,
            length = records.length,
            isNotPhantom,
            index,
            record;

        for (; i < length; i++) {
            record = records[i];
            index = me.data.indexOf(record);

            if (me.snapshot) {
                me.snapshot.remove(record);
            }

            if (index > -1) {
                isNotPhantom = record.phantom !== true;

                // don't push phantom records onto removed
                if (!isMove && isNotPhantom) {

                    // Store the index the record was removed from so that rejectChanges can re-insert at the correct place.
                    // The record's index property won't do, as that is the index in the overall dataset when Store is buffered.
                    record.removedFrom = index;
                    me.removed.push(record);
                }

                record.unjoin(me);
                me.data.remove(record);
                sync = sync || isNotPhantom;

                me.fireEvent('remove', me, record, index);
            }
        }

        me.fireEvent('datachanged', me);
        if (!isMove && me.autoSync && sync && !me.autoSyncSuspended) {
            me.sync();
        }
    },

    /**
     * Removes the model instance at the given index
     * @param {Number} index The record index
     */
    removeAt: function(index) {
        var record = this.getAt(index);

        if (record) {
            this.remove(record);
        }
    },

    /**
     * Loads data into the Store via the configured {@link #proxy}. This uses the Proxy to make an
     * asynchronous call to whatever storage backend the Proxy uses, automatically adding the retrieved
     * instances into the Store and calling an optional callback if required. Example usage:
     *
     *     store.load({
     *         scope: this,
     *         callback: function(records, operation, success) {
     *             // the {@link Ext.data.Operation operation} object
     *             // contains all of the details of the load operation
     *             console.log(records);
     *         }
     *     });
     *
     * If the callback scope does not need to be set, a function can simply be passed:
     *
     *     store.load(function(records, operation, success) {
     *         console.log('loaded records');
     *     });
     *
     * @param {Object/Function} [options] config object, passed into the Ext.data.Operation object before loading.
     * Additionally `addRecords: true` can be specified to add these records to the existing records, default is
     * to remove the Store's existing records first.
     */
    load: function(options) {
        var me = this;

        options = options || {};

        if (typeof options == 'function') {
            options = {
                callback: options
            };
        }

        options.groupers = options.groupers ||  me.groupers.items;
        options.page = options.page || me.currentPage;
        options.start = (options.start !== undefined) ? options.start : (options.page - 1) * me.pageSize;
        options.limit = options.limit || me.pageSize;
        options.addRecords = options.addRecords || false;

        if (me.buffered) {
            return me.loadToPrefetch(options);
        }
        return me.callParent([options]);
    },

    reload: function(options) {
        var me = this,
            startIdx,
            endIdx,
            startPage,
            endPage,
            i,
            waitForReload,
            bufferZone,
            records;

        if (!options) {
            options = {};
        }

        // If buffered, we have to clear the page cache and then
        // cache the page range surrounding store's loaded range.
        if (me.buffered) {

            // So that prefetchPage does not consider the store to be fully loaded if the local count is equal to the total count
            delete me.totalCount;

            waitForReload = function() {
                if (me.rangeCached(startIdx, endIdx)) {
                    me.loading = false;
                    me.pageMap.un('pageAdded', waitForReload);
                    records = me.pageMap.getRange(startIdx, endIdx);
                    me.loadRecords(records, {
                        start: startIdx
                    });
                    me.fireEvent('load', me, records, true);
                }
            };
            bufferZone = Math.ceil((me.leadingBufferZone + me.trailingBufferZone) / 2);

            // Get our record index range in the dataset
            startIdx = options.start || me.getAt(0).index;
            endIdx = startIdx + (options.count || me.getCount()) - 1;

            // Calculate a page range which encompasses the Store's loaded range plus both buffer zones
            startPage = me.getPageFromRecordIndex(Math.max(startIdx - bufferZone, 0));
            endPage = me.getPageFromRecordIndex(endIdx + bufferZone);

            // Clear cache (with initial flag so that any listening PagingScroller does not reset to page 1).
            me.pageMap.clear(true);

            if (me.fireEvent('beforeload', me, options) !== false) {
                me.loading = true;

                // Recache the page range which encapsulates our visible records
                for (i = startPage; i <= endPage; i++) {
                    me.prefetchPage(i, options);
                }

                // Wait for the requested range to become available in the page map
                // Load the range as soon as the whole range is available
                me.pageMap.on('pageAdded', waitForReload);
            }
        } else {
            return me.callParent(arguments);
        }
    },

    /**
     * @private
     * Called internally when a Proxy has completed a load request
     */
    onProxyLoad: function(operation) {
        var me = this,
            resultSet = operation.getResultSet(),
            records = operation.getRecords(),
            successful = operation.wasSuccessful();

        if (resultSet) {
            me.totalCount = resultSet.total;
        }

        if (successful) {
            me.loadRecords(records, operation);
        }

        me.loading = false;
        if (me.hasListeners.load) {
            me.fireEvent('load', me, records, successful);
        }

        //TODO: deprecate this event, it should always have been 'load' instead. 'load' is now documented, 'read' is not.
        //People are definitely using this so can't deprecate safely until 2.x
        if (me.hasListeners.read) {
            me.fireEvent('read', me, records, successful);
        }

        //this is a callback that would have been passed to the 'read' function and is optional
        Ext.callback(operation.callback, operation.scope || me, [records, operation, successful]);
    },

    //inherit docs
    getNewRecords: function() {
        return this.data.filterBy(this.filterNew).items;
    },

    //inherit docs
    getUpdatedRecords: function() {
        return this.data.filterBy(this.filterUpdated).items;
    },

    /**
     * Filters the loaded set of records by a given set of filters.
     *
     * By default, the passed filter(s) are *added* to the collection of filters being used to filter this Store.
     *
     * To remove existing filters before applying a new set of filters use
     *
     *     // Clear the filter collection without updating the UI
     *     store.clearFilter(true);
     *
     * see {@link #clearFilter}.
     *
     * Alternatively, if filters are configured with an `id`, then existing filters store may be *replaced* by new
     * filters having the same `id`.
     *
     * Filtering by single field:
     *
     *     store.filter("email", /\.com$/);
     *
     * Using multiple filters:
     *
     *     store.filter([
     *         {property: "email", value: /\.com$/},
     *         {filterFn: function(item) { return item.get("age") > 10; }}
     *     ]);
     *
     * Using Ext.util.Filter instances instead of config objects
     * (note that we need to specify the {@link Ext.util.Filter#root root} config option in this case):
     *
     *     store.filter([
     *         Ext.create('Ext.util.Filter', {property: "email", value: /\.com$/, root: 'data'}),
     *         Ext.create('Ext.util.Filter', {filterFn: function(item) { return item.get("age") > 10; }, root: 'data'})
     *     ]);
     *
     * When store is filtered, most of the methods for accessing store data will be working only
     * within the set of filtered records. Two notable exceptions are {@link #queryBy} and
     * {@link #getById}.
     *
     * @param {Object[]/Ext.util.Filter[]/String} filters The set of filters to apply to the data.
     * These are stored internally on the store, but the filtering itself is done on the Store's
     * {@link Ext.util.MixedCollection MixedCollection}. See MixedCollection's
     * {@link Ext.util.MixedCollection#filter filter} method for filter syntax.
     * Alternatively, pass in a property string
     * @param {String} [value] value to filter by (only if using a property string as the first argument)
     */
    filter: function(filters, value) {
        if (Ext.isString(filters)) {
            filters = {
                property: filters,
                value: value
            };
        }

        var me = this,
            decoded = me.decodeFilters(filters),
            i = 0,
            doLocalSort = me.sorters.length && me.sortOnFilter && !me.remoteSort,
            length = decoded.length;

        for (; i < length; i++) {
            me.filters.replace(decoded[i]);
        }

        if (me.remoteFilter) {
            // So that prefetchPage does not consider the store to be fully loaded if the local count is equal to the total count
            delete me.totalCount;
            
            // For a buffered Store, we have to clear the prefetch cache because the dataset will change upon filtering.
            // Then we must prefetch the new page 1, and when that arrives, reload the visible part of the Store
            // via the guaranteedrange event
            if (me.buffered) {
                me.pageMap.clear();
                me.loadPage(1);
            } else {
                // Reset to the first page, the filter is likely to produce a smaller data set
                me.currentPage = 1;
                //the load function will pick up the new filters and request the filtered data from the proxy
                me.load();
            }
        } else {
            /**
             * @property {Ext.util.MixedCollection} snapshot
             * A pristine (unfiltered) collection of the records in this store. This is used to reinstate
             * records when a filter is removed or changed
             */
            if (me.filters.getCount()) {
                me.snapshot = me.snapshot || me.data.clone();
                me.data = me.data.filter(me.filters.items);

                if (doLocalSort) {
                    me.sort();
                } else {
                    // fire datachanged event if it hasn't already been fired by doSort
                    me.fireEvent('datachanged', me);
                    me.fireEvent('refresh', me);
                }
            }
        }
    },

    /**
     * Reverts to a view of the Record cache with no filtering applied.
     * @param {Boolean} suppressEvent If `true` the filter is cleared silently.
     *
     * For a locally filtered Store, this means that the filter collection is cleared without firing the
     * {@link #datachanged} event.
     *
     * For a remotely filtered Store, this means that the filter collection is cleared, but the store
     * is not reloaded from the server.
     */
    clearFilter: function(suppressEvent) {
        var me = this;

        me.filters.clear();

        if (me.remoteFilter) {

            // In a buffered Store, the meaing of suppressEvent is to simply clear the filters collection
            if (suppressEvent) {
                return;
            }

            // So that prefetchPage does not consider the store to be fully loaded if the local count is equal to the total count
            delete me.totalCount;

            // For a buffered Store, we have to clear the prefetch cache because the dataset will change upon filtering.
            // Then we must prefetch the new page 1, and when that arrives, reload the visible part of the Store
            // via the guaranteedrange event
            if (me.buffered) {
                me.pageMap.clear();
                me.loadPage(1);
            } else {
                // Reset to the first page, clearing a filter will destroy the context of the current dataset
                me.currentPage = 1;
                me.load();
            }
        } else if (me.isFiltered()) {
            me.data = me.snapshot.clone();
            delete me.snapshot;

            if (suppressEvent !== true) {
                me.fireEvent('datachanged', me);
                me.fireEvent('refresh', me);
            }
        }
    },

    /**
     * Returns true if this store is currently filtered
     * @return {Boolean}
     */
    isFiltered: function() {
        var snapshot = this.snapshot;
        return !! snapshot && snapshot !== this.data;
    },

    /**
     * Filters by a function. The specified function will be called for each
     * Record in this Store. If the function returns `true` the Record is included,
     * otherwise it is filtered out.
     *
     * When store is filtered, most of the methods for accessing store data will be working only
     * within the set of filtered records. Two notable exceptions are {@link #queryBy} and
     * {@link #getById}.
     *
     * @param {Function} fn The function to be called. It will be passed the following parameters:
     *  @param {Ext.data.Model} fn.record The record to test for filtering. Access field values
     *  using {@link Ext.data.Model#get}.
     *  @param {Object} fn.id The ID of the Record passed.
     * @param {Object} [scope] The scope (this reference) in which the function is executed.
     * Defaults to this Store.
     */
    filterBy: function(fn, scope) {
        var me = this;

        me.snapshot = me.snapshot || me.data.clone();
        me.data = me.queryBy(fn, scope || me);
        me.fireEvent('datachanged', me);
        me.fireEvent('refresh', me);
    },

    /**
     * Query all the cached records in this Store using a filtering function. The specified function
     * will be called with each record in this Store. If the function returns `true` the record is
     * included in the results.
     *
     * This method is not effected by filtering, it will always look from all records inside the store
     * no matter if filter is applied or not.
     *
     * @param {Function} fn The function to be called. It will be passed the following parameters:
     *  @param {Ext.data.Model} fn.record The record to test for filtering. Access field values
     *  using {@link Ext.data.Model#get}.
     *  @param {Object} fn.id The ID of the Record passed.
     * @param {Object} [scope] The scope (this reference) in which the function is executed
     * Defaults to this Store.
     * @return {Ext.util.MixedCollection} Returns an Ext.util.MixedCollection of the matched records
     */
    queryBy: function(fn, scope) {
        var me = this,
            data = me.snapshot || me.data;
        return data.filterBy(fn, scope || me);
    },

    /**
     * Query all the cached records in this Store by name/value pair.
     * The parameters will be used to generated a filter function that is given
     * to the queryBy method.
     *
     * This method compliments queryBy by generating the query function automatically.
     *
     * @param {String} property The property to create the filter function for
     * @param {String/RegExp} value The string/regex to compare the property value to
     * @param {Boolean} [anyMatch=false] True if we don't care if the filter value is not the full value.
     * @param {Boolean} [caseSensitive=false] True to create a case-sensitive regex.
     * @param {Boolean} [exactMatch=false] True to force exact match (^ and $ characters added to the regex).
     * Ignored if anyMatch is true.
     * @return {Ext.util.MixedCollection} Returns an Ext.util.MixedCollection of the matched records
     */
    query: function(property, value, anyMatch, caseSensitive, exactMatch) {
        var me = this,
            queryFn = me.createFilterFn(property, value, anyMatch, caseSensitive, exactMatch),
            results = me.queryBy(queryFn);

        //create an empty mixed collection for use if queryBy returns null
        if(!results) {
            results = new Ext.util.MixedCollection();
        }

        return results;
    },

    /**
     * Loads an array of data straight into the Store.
     *
     * Using this method is great if the data is in the correct format already (e.g. it doesn't need to be
     * processed by a reader). If your data requires processing to decode the data structure, use a
     * {@link Ext.data.proxy.Memory MemoryProxy} instead.
     *
     * @param {Ext.data.Model[]/Object[]} data Array of data to load. Any non-model instances will be cast
     * into model instances first.
     * @param {Boolean} [append=false] True to add the records to the existing records in the store, false
     * to remove the old ones first.
     */
    loadData: function(data, append) {
        var me = this,
            model = me.model,
            length = data.length,
            newData = [],
            i,
            record;

        //make sure each data element is an Ext.data.Model instance
        for (i = 0; i < length; i++) {
            record = data[i];

            if (!(record.isModel)) {
                record = Ext.ModelManager.create(record, model);
            }
            newData.push(record);
        }

        me.loadRecords(newData, append ? me.addRecordsOptions : undefined);
    },

    /**
     * Loads data via the bound Proxy's reader
     *
     * Use this method if you are attempting to load data and want to utilize the configured data reader.
     *
     * @param {Object[]} data The full JSON object you'd like to load into the Data store.
     * @param {Boolean} [append=false] True to add the records to the existing records in the store, false
     * to remove the old ones first.
     */
    loadRawData : function(data, append) {
         var me      = this,
             result  = me.proxy.reader.read(data),
             records = result.records;

         if (result.success) {
             me.totalCount = result.total;
             me.loadRecords(records, append ? me.addRecordsOptions : undefined);
             me.fireEvent('load', me, records, true);
         }
     },

    /**
     * Loads an array of {@link Ext.data.Model model} instances into the store, fires the datachanged event. This should only usually
     * be called internally when loading from the {@link Ext.data.proxy.Proxy Proxy}, when adding records manually use {@link #method-add} instead
     * @param {Ext.data.Model[]} records The array of records to load
     * @param {Object} options
     * @param {Boolean} [options.addRecords=false] Pass `true` to add these records to the existing records, `false` to remove the Store's existing records first.
     * @param {Number}  [options.start] Only used by buffered Stores. The index *within the overall dataset* of the first record in the array.
     */
    loadRecords: function(records, options) {
        var me     = this,
            i      = 0,
            length = records.length,
            start,
            addRecords,
            snapshot = me.snapshot;

        if (options) {
            start = options.start;
            addRecords = options.addRecords;
        }

        if (!addRecords) {
            delete me.snapshot;
            me.clearData(true);
        } else if (snapshot) {
            snapshot.addAll(records);
        }

        me.data.addAll(records);

        if (start !== undefined) {
            for (; i < length; i++) {
                records[i].index = start + i;
                records[i].join(me);
            }
        } else {
            for (; i < length; i++) {
                records[i].join(me);
            }
        }

        /*
         * this rather inelegant suspension and resumption of events is required because both the filter and sort functions
         * fire an additional datachanged event, which is not wanted. Ideally we would do this a different way. The first
         * datachanged event is fired by the call to this.add, above.
         */
        me.suspendEvents();

        if (me.filterOnLoad && !me.remoteFilter) {
            me.filter();
        }

        if (me.sortOnLoad && !me.remoteSort) {
            me.sort(undefined, undefined, undefined, true);
        }

        me.resumeEvents();
        me.fireEvent('datachanged', me);
        me.fireEvent('refresh', me);
    },

    // PAGING METHODS
    /**
     * Loads a given 'page' of data by setting the start and limit values appropriately. Internally this just causes a normal
     * load operation, passing in calculated 'start' and 'limit' params
     * @param {Number} page The number of the page to load
     * @param {Object} options See options for {@link #method-load}
     */
    loadPage: function(page, options) {
        var me = this;

        me.currentPage = page;

        // Copy options into a new object so as not to mutate passed in objects
        options = Ext.apply({
            page: page,
            start: (page - 1) * me.pageSize,
            limit: me.pageSize,
            addRecords: !me.clearOnPageLoad
        }, options);

        if (me.buffered) {
            return me.loadToPrefetch(options);
        }
        me.read(options);
    },

    /**
     * Loads the next 'page' in the current data set
     * @param {Object} options See options for {@link #method-load}
     */
    nextPage: function(options) {
        this.loadPage(this.currentPage + 1, options);
    },

    /**
     * Loads the previous 'page' in the current data set
     * @param {Object} options See options for {@link #method-load}
     */
    previousPage: function(options) {
        this.loadPage(this.currentPage - 1, options);
    },

    // private
    clearData: function(isLoad) {
        var me = this,
            records = me.data.items,
            i = records.length;

        while (i--) {
            records[i].unjoin(me);
        }
        me.data.clear();
        if (isLoad !== true || me.clearRemovedOnLoad) {
            me.removed.length = 0;
        }
    },

    loadToPrefetch: function(options) {
        var me = this,
            i,
            records,

            // Get the requested record index range in the dataset
            startIdx = options.start,
            endIdx = options.start + options.limit - 1,

            // The end index to load into the store's live record collection
            loadEndIdx = options.start + (me.viewSize || options.limit) - 1,

            // Calculate a page range which encompasses the requested range plus both buffer zones
            startPage = me.getPageFromRecordIndex(Math.max(startIdx - me.trailingBufferZone, 0)),
            endPage = me.getPageFromRecordIndex(endIdx + me.leadingBufferZone),

            // Wait for the viewable range to be available
            waitForRequestedRange = function() {
                if (me.rangeCached(startIdx, loadEndIdx)) {
                    me.loading = false;
                    records = me.pageMap.getRange(startIdx, loadEndIdx);
                    me.pageMap.un('pageAdded', waitForRequestedRange);

                    // If there is a listener for guranteedrange (PagingScroller uses this), then go through that event
                    if (me.hasListeners.guaranteedrange) {
                        me.guaranteeRange(startIdx, loadEndIdx, options.callback, options.scope);
                    }
                    // Otherwise load the records directly
                    else {
                        me.loadRecords(records, {
                            start: startIdx
                        });
                    }
                    me.fireEvent('load', me, records, true);
                    if (options.groupChange) {
                        me.fireGroupChange();
                    }
                }
            };

        if (me.fireEvent('beforeload', me, options) !== false) {

            // So that prefetchPage does not consider the store to be fully loaded if the local count is equal to the total count
            delete me.totalCount;

            me.loading = true;

            // Wait for the requested range to become available in the page map
            me.pageMap.on('pageAdded', waitForRequestedRange);
            
            // Load the first page in the range, which will give us the initial total count.
            // Once it is loaded, go ahead and prefetch any subsequent pages, if necessary.
            // The prefetchPage has a check to prevent us loading more than the totalCount,
            // so we don't want to blindly load up <n> pages where it isn't required. 
            me.on('prefetch', function(){
                for (i = startPage + 1; i <= endPage; ++i) {
                    me.prefetchPage(i, options);
                }
            }, null, {single: true});
            
            me.prefetchPage(startPage, options);
        }
    },

    // Buffering
    /**
     * Prefetches data into the store using its configured {@link #proxy}.
     * @param {Object} options (Optional) config object, passed into the Ext.data.Operation object before loading.
     * See {@link #method-load}
     */
    prefetch: function(options) {
        var me = this,
            pageSize = me.pageSize,
            proxy,
            operation;

        // Check pageSize has not been tampered with. That would break page caching
        if (pageSize) {
            if (me.lastPageSize && pageSize != me.lastPageSize) {
                Ext.error.raise("pageSize cannot be dynamically altered");
            }
            if (!me.pageMap.pageSize) {
                me.pageMap.pageSize = pageSize;
            }
        }

        // Allow first prefetch call to imply the required page size.
        else {
            me.pageSize = me.pageMap.pageSize = pageSize = options.limit;
        }

        // So that we can check for tampering next time through
        me.lastPageSize = pageSize;

        // Always get whole pages.
        if (!options.page) {
            options.page = me.getPageFromRecordIndex(options.start);
            options.start = (options.page - 1) * pageSize;
            options.limit = Math.ceil(options.limit / pageSize) * pageSize;
        }

        // Currently not requesting this page, then request it...
        if (!me.pageRequests[options.page]) {

            // Copy options into a new object so as not to mutate passed in objects
            options = Ext.apply({
                action : 'read',
                filters: me.filters.items,
                sorters: me.sorters.items,
                groupers: me.groupers.items,

                // Generation # of the page map to which the requested records belong.
                // If page map is cleared while this request is in flight, the generation will increment and the payload will be rejected
                generation: me.pageMap.generation
            }, options);

            operation = new Ext.data.Operation(options);

            if (me.fireEvent('beforeprefetch', me, operation) !== false) {
                me.loading = true;
                proxy = me.proxy;
                me.pageRequests[options.page] = proxy.read(operation, me.onProxyPrefetch, me);
                if (proxy.isSynchronous) {
                    delete me.pageRequests[options.page];
                }
            }
        }

        return me;
    },

    /**
     * @private
     * Cancels all pending prefetch requests.
     *
     * This is called when the page map is cleared.
     *
     * Any requests which still make it through will be for the previous page map generation
     * (generation is incremented upon clear), and so will be rejected upon arrival.
     */
    cancelAllPrefetches: function() {
        var me = this,
            reqs = me.pageRequests,
            req,
            page;

        // If any requests return, we no longer respond to them.
        if (me.pageMap.events.pageadded) {
            me.pageMap.events.pageadded.clearListeners();
        }

        // Cancel all outstanding requests
        for (page in reqs) {
            if (reqs.hasOwnProperty(page)) {
                req = reqs[page];
                delete reqs[page];
                delete req.callback;
            }
        }
    },

    /**
     * Prefetches a page of data.
     * @param {Number} page The page to prefetch
     * @param {Object} options (Optional) config object, passed into the Ext.data.Operation object before loading.
     * See {@link #method-load}
     */
    prefetchPage: function(page, options) {
        var me = this,
            pageSize = me.pageSize || me.defaultPageSize,
            start = (page - 1) * me.pageSize,
            total = me.totalCount;

        // No more data to prefetch.
        if (total !== undefined && me.getCount() === total) {
            return;
        }

        // Copy options into a new object so as not to mutate passed in objects
        me.prefetch(Ext.applyIf({
            page     : page,
            start    : start,
            limit    : pageSize
        }, options));
    },

    /**
     * Called after the configured proxy completes a prefetch operation.
     * @private
     * @param {Ext.data.Operation} operation The operation that completed
     */
    onProxyPrefetch: function(operation) {
        var me = this,
            resultSet = operation.getResultSet(),
            records = operation.getRecords(),
            successful = operation.wasSuccessful(),
            page = operation.page;

        // Only cache the data if the operation was invoked for the current generation of the page map.
        // If the generation has changed since the request was fired off, it will have been cancelled.
        if (operation.generation === me.pageMap.generation) {

            if (resultSet) {
                me.totalCount = resultSet.total;
                me.fireEvent('totalcountchange', me.totalCount);
            }

            // Remove the loaded page from the outstanding pages hash
            if (page !== undefined) {
                delete me.pageRequests[page];
            }

            // Add the page into the page map.
            // pageAdded event may trigger the onGuaranteedRange
            if (successful) {
                me.cachePage(records, operation.page);
            }

            me.loading = false;
            me.fireEvent('prefetch', me, records, successful, operation);

            //this is a callback that would have been passed to the 'read' function and is optional
            Ext.callback(operation.callback, operation.scope || me, [records, operation, successful]);
        }
    },

    /**
     * Caches the records in the prefetch and stripes them with their server-side
     * index.
     * @private
     * @param {Ext.data.Model[]} records The records to cache
     * @param {Ext.data.Operation} The associated operation
     */
    cachePage: function(records, page) {
        var me = this;

        if (!Ext.isDefined(me.totalCount)) {
            me.totalCount = records.length;
            me.fireEvent('totalcountchange', me.totalCount);
        }

        // Add the fetched page into the pageCache
        me.pageMap.addPage(page, records);
    },

    /**
     * Determines if the passed range is available in the page cache.
     * @private
     * @param {Number} start The start index
     * @param {Number} end The end index in the range
     */
    rangeCached: function(start, end) {
        return this.pageMap && this.pageMap.hasRange(start, end);
    },

    /**
     * Determines if the passed page is available in the page cache.
     * @private
     * @param {Number} page The page to find in the page cache.
     */
    pageCached: function(page) {
        return this.pageMap && this.pageMap.hasPage(page);
    },

    /**
     * Determines if the passed range is available in the page cache.
     * @private
     * @deprecated 4.1.0 use {@link #rangeCached} instead
     * @param {Number} start The start index
     * @param {Number} end The end index in the range
     */
    rangeSatisfied: function(start, end) {
        return this.rangeCached(start, end);
    },

    /**
     * Determines the page from a record index
     * @param {Number} index The record index
     * @return {Number} The page the record belongs to
     */
    getPageFromRecordIndex: function(index) {
        return Math.floor(index / this.pageSize) + 1;
    },

    /**
     * Handles a guaranteed range being loaded
     * @private
     */
    onGuaranteedRange: function(options) {
        var me = this,
            totalCount = me.getTotalCount(),
            start = options.prefetchStart,
            end = ((totalCount - 1) < options.prefetchEnd) ? totalCount - 1 : options.prefetchEnd,
            range;

        end = Math.max(0, end);

        if (start > end) {
            Ext.log({
                level: 'warn',
                msg: 'Start (' + start + ') was greater than end (' + end +
                    ') for the range of records requested (' + start + '-' +
                    options.prefetchEnd + ')' + (this.storeId ? ' from store "' + this.storeId + '"' : '')
            });
        }

        range = me.pageMap.getRange(start, end);
        me.fireEvent('guaranteedrange', range, start, end);
        if (options.cb) {
            options.cb.call(options.scope || me, range, start, end);
        }
    },

    /**
     * Ensures that the specified range of rows is present in the cache.
     *
     * Converts the row range to a page range and then only load pages which are not already
     * present in the page cache.
     */
    prefetchRange: function(start, end) {
        var me = this,
            startPage, endPage, page;
        if (!me.rangeCached(start, end)) {
            startPage = me.getPageFromRecordIndex(start);
            endPage = me.getPageFromRecordIndex(end);

            // Ensure that the page cache's max size is correct.
            // Our purgePageCount is the number of additional pages *outside of the required range* which
            // may be kept in the cache. A purgePageCount of zero means unlimited.
            me.pageMap.maxSize = me.purgePageCount ? (endPage - startPage + 1) + me.purgePageCount : 0;

            // We have the range, but ensure that we have a "buffer" of pages around it.
            for (page = startPage; page <= endPage; page++) {
                if (!me.pageCached(page)) {
                    me.prefetchPage(page);
                }
            }
        }
    },

    /**
     * Guarantee a specific range, this will load the store with a range (that
     * must be the pageSize or smaller) and take care of any loading that may
     * be necessary.
     */
    guaranteeRange: function(start, end, cb, scope) {
        // Sanity check end point to be within dataset range
        end = (end > this.totalCount) ? this.totalCount - 1 : end;

        var me = this,
            lastRequestStart = me.lastRequestStart,
            options = {
                prefetchStart: start,
                prefetchEnd: end,
                cb: cb,
                scope: scope
            },
            pageAddHandler;

        me.lastRequestStart = start;

        // If data request can be satisfied from the page cache
        if (me.rangeCached(start, end)) {

            // Attempt to keep the page cache primed with pages which encompass the live data range
            if (start < lastRequestStart) {
                start = Math.max(start - me.leadingBufferZone, 0);
                end   = Math.min(end   + me.trailingBufferZone, me.totalCount - 1);
            } else {
                start = Math.max(Math.min(start - me.trailingBufferZone, me.totalCount - me.pageSize), 0);
                end   = Math.min(end + me.leadingBufferZone, me.totalCount - 1);
            }

            // If the prefetch window calculated round the requested range is not already satisfied in the page cache,
            // then arrange to prefetch it.
            if (!me.rangeCached(start, end)) {
                // We have the range, but ensure that we have a "buffer" of pages around it.
                me.prefetchRange(start, end);
            }
            me.onGuaranteedRange(options);
        }
        // At least some of the requested range needs loading from server
        else {
            // Private event used by the LoadMask class to perform masking when the range required for rendering is not found in the cache
            me.fireEvent('cachemiss', me, start, end);

            // Calculate a prefetch range which is centered on the requested data
            start = Math.min(Math.max(Math.floor(start - ((me.leadingBufferZone + me.trailingBufferZone) / 2)), 0), me.totalCount - me.pageSize);
            end =   Math.min(Math.max(Math.ceil (end   + ((me.leadingBufferZone + me.trailingBufferZone) / 2)), 0), me.totalCount - 1);

            // Add a pageAdded listener, and as soon as the requested range is loaded, fire the guaranteedrange event
            pageAddHandler = function(page, records) {
                if (me.rangeCached(options.prefetchStart, options.prefetchEnd)) {
                    // Private event used by the LoadMask class to unmask when the range required for rendering has been loaded into the cache
                    me.fireEvent('cachefilled', me, start, end);
                    me.pageMap.un('pageAdded', pageAddHandler);
                    me.onGuaranteedRange(options);
                }
            };
            me.pageMap.on('pageAdded', pageAddHandler);

            // Prioritize the request for the *exact range that the UI is asking for*.
            // When a page request is in flight, it will not be requested again by checking the me.pageRequests hash,
            // so the request after this will only request the *remaining* unrequested pages .
            me.prefetchRange(options.prefetchStart, options.prefetchEnd);

            // Load the pages that need loading.
            me.prefetchRange(start, end);
        }
    },

    // because prefetchData is stored by index
    // this invalidates all of the prefetchedData
    sort: function() {
        var me = this,
            prefetchData = me.pageMap;

        if (me.buffered) {
            if (me.remoteSort) {
                prefetchData.clear();
                me.callParent(arguments);
            } else {
                me.callParent(arguments);
            }
        } else {
            me.callParent(arguments);
        }
    },

    // overriden to provide striping of the indexes as sorting occurs.
    // this cannot be done inside of sort because datachanged has already
    // fired and will trigger a repaint of the bound view.
    doSort: function(sorterFn) {
        var me = this,
            range,
            ln,
            i;
        if (me.remoteSort) {

            // For a buffered Store, we have to clear the prefetch cache since it is keyed by the index within the dataset.
            // Then we must prefetch the new page 1, and when that arrives, reload the visible part of the Store
            // via the guaranteedrange event
            if (me.buffered) {
                me.pageMap.clear();
                me.loadPage(1);
            } else {
                //the load function will pick up the new sorters and request the sorted data from the proxy
                me.load();
            }
        } else {
            me.data.sortBy(sorterFn);
            if (!me.buffered) {
                range = me.getRange();
                ln = range.length;
                for (i = 0; i < ln; i++) {
                    range[i].index = i;
                }
            }
            me.fireEvent('datachanged', me);
            me.fireEvent('refresh', me);
        }
    },

    /**
     * Finds the index of the first matching Record in this store by a specific field value.
     *
     * When store is filtered, finds records only within filter.
     *
     * @param {String} fieldName The name of the Record field to test.
     * @param {String/RegExp} value Either a string that the field value
     * should begin with, or a RegExp to test against the field.
     * @param {Number} [startIndex=0] The index to start searching at
     * @param {Boolean} [anyMatch=false] True to match any part of the string, not just the beginning
     * @param {Boolean} [caseSensitive=false] True for case sensitive comparison
     * @param {Boolean} [exactMatch=false] True to force exact match (^ and $ characters added to the regex).
     * @return {Number} The matched index or -1
     */
    find: function(property, value, start, anyMatch, caseSensitive, exactMatch) {
        var fn = this.createFilterFn(property, value, anyMatch, caseSensitive, exactMatch);
        return fn ? this.data.findIndexBy(fn, null, start) : -1;
    },

    /**
     * Finds the first matching Record in this store by a specific field value.
     *
     * When store is filtered, finds records only within filter.
     *
     * @param {String} fieldName The name of the Record field to test.
     * @param {String/RegExp} value Either a string that the field value
     * should begin with, or a RegExp to test against the field.
     * @param {Number} [startIndex=0] The index to start searching at
     * @param {Boolean} [anyMatch=false] True to match any part of the string, not just the beginning
     * @param {Boolean} [caseSensitive=false] True for case sensitive comparison
     * @param {Boolean} [exactMatch=false] True to force exact match (^ and $ characters added to the regex).
     * @return {Ext.data.Model} The matched record or null
     */
    findRecord: function() {
        var me = this,
            index = me.find.apply(me, arguments);
        return index !== -1 ? me.getAt(index) : null;
    },

    /**
     * @private
     * Returns a filter function used to test a the given property's value. Defers most of the work to
     * Ext.util.MixedCollection's createValueMatcher function.
     *
     * @param {String} property The property to create the filter function for
     * @param {String/RegExp} value The string/regex to compare the property value to
     * @param {Boolean} [anyMatch=false] True if we don't care if the filter value is not the full value.
     * @param {Boolean} [caseSensitive=false] True to create a case-sensitive regex.
     * @param {Boolean} [exactMatch=false] True to force exact match (^ and $ characters added to the regex).
     * Ignored if anyMatch is true.
     */
    createFilterFn: function(property, value, anyMatch, caseSensitive, exactMatch) {
        if (Ext.isEmpty(value)) {
            return false;
        }
        value = this.data.createValueMatcher(value, anyMatch, caseSensitive, exactMatch);
        return function(r) {
            return value.test(r.data[property]);
        };
    },

    /**
     * Finds the index of the first matching Record in this store by a specific field value.
     *
     * When store is filtered, finds records only within filter.
     *
     * @param {String} fieldName The name of the Record field to test.
     * @param {Object} value The value to match the field against.
     * @param {Number} [startIndex=0] The index to start searching at
     * @return {Number} The matched index or -1
     */
    findExact: function(property, value, start) {
        return this.data.findIndexBy(function(rec) {
            return rec.isEqual(rec.get(property), value);
        },
        this, start);
    },

    /**
     * Find the index of the first matching Record in this Store by a function.
     * If the function returns `true` it is considered a match.
     *
     * When store is filtered, finds records only within filter.
     *
     * @param {Function} fn The function to be called. It will be passed the following parameters:
     *  @param {Ext.data.Model} fn.record The record to test for filtering. Access field values
     *  using {@link Ext.data.Model#get}.
     *  @param {Object} fn.id The ID of the Record passed.
     * @param {Object} [scope] The scope (this reference) in which the function is executed.
     * Defaults to this Store.
     * @param {Number} [startIndex=0] The index to start searching at
     * @return {Number} The matched index or -1
     */
    findBy: function(fn, scope, start) {
        return this.data.findIndexBy(fn, scope, start);
    },

    /**
     * Collects unique values for a particular dataIndex from this store.
     *
     * @param {String} dataIndex The property to collect
     * @param {Boolean} [allowNull] Pass true to allow null, undefined or empty string values
     * @param {Boolean} [bypassFilter] Pass true to collect from all records, even ones which are filtered.
     * @return {Object[]} An array of the unique values
     */
    collect: function(dataIndex, allowNull, bypassFilter) {
        var me = this,
            data = (bypassFilter === true && me.snapshot) ? me.snapshot : me.data;

        return data.collect(dataIndex, 'data', allowNull);
    },

    /**
     * Gets the number of records in store.
     *
     * If using paging, this may not be the total size of the dataset. If the data object
     * used by the Reader contains the dataset size, then the {@link #getTotalCount} function returns
     * the dataset size.  **Note**: see the Important note in {@link #method-load}.
     *
     * When store is filtered, it's the number of records matching the filter.
     *
     * @return {Number} The number of Records in the Store.
     */
    getCount: function() {
        return this.data.length || 0;
    },

    /**
     * Returns the total number of {@link Ext.data.Model Model} instances that the {@link Ext.data.proxy.Proxy Proxy}
     * indicates exist. This will usually differ from {@link #getCount} when using paging - getCount returns the
     * number of records loaded into the Store at the moment, getTotalCount returns the number of records that
     * could be loaded into the Store if the Store contained all data
     * @return {Number} The total number of Model instances available via the Proxy. 0 returned if
     * no value has been set via the reader.
     */
    getTotalCount: function() {
        return this.totalCount || 0;
    },

    /**
     * Get the Record at the specified index.
     *
     * The index is effected by filtering.
     *
     * @param {Number} index The index of the Record to find.
     * @return {Ext.data.Model} The Record at the passed index. Returns undefined if not found.
     */
    getAt: function(index) {
        return this.data.getAt(index);
    },

    /**
     * Returns a range of Records between specified indices.
     *
     * This method is effected by filtering.
     *
     * @param {Number} [startIndex=0] The starting index
     * @param {Number} [endIndex] The ending index. Defaults to the last Record in the Store.
     * @return {Ext.data.Model[]} An array of Records
     */
    getRange: function(start, end) {
        return this.data.getRange(start, end);
    },

    /**
     * Get the Record with the specified id.
     *
     * This method is not effected by filtering, lookup will be performed from all records
     * inside the store, filtered or not.
     *
     * @param {Mixed} id The id of the Record to find.
     * @return {Ext.data.Model} The Record with the passed id. Returns null if not found.
     */
    getById: function(id) {
        return (this.snapshot || this.data).findBy(function(record) {
            return record.getId() === id;
        });
    },

    /**
     * Get the index of the record within the store.
     *
     * When store is filtered, records outside of filter will not be found.
     *
     * @param {Ext.data.Model} record The Ext.data.Model object to find.
     * @return {Number} The index of the passed Record. Returns -1 if not found.
     */
    indexOf: function(record) {
        return this.data.indexOf(record);
    },


    /**
     * Get the index within the entire dataset. From 0 to the totalCount.
     *
     * Like #indexOf, this method is effected by filtering.
     *
     * @param {Ext.data.Model} record The Ext.data.Model object to find.
     * @return {Number} The index of the passed Record. Returns -1 if not found.
     */
    indexOfTotal: function(record) {
        var index = record.index;
        if (index || index === 0) {
            return index;
        }
        return this.indexOf(record);
    },

    /**
     * Get the index within the store of the Record with the passed id.
     *
     * Like #indexOf, this method is effected by filtering.
     *
     * @param {String} id The id of the Record to find.
     * @return {Number} The index of the Record. Returns -1 if not found.
     */
    indexOfId: function(id) {
        return this.indexOf(this.getById(id));
    },

    /**
     * Removes all items from the store.
     * @param {Boolean} silent Prevent the `clear` event from being fired.
     */
    removeAll: function(silent) {
        var me = this;

        me.clearData();
        if (me.snapshot) {
            me.snapshot.clear();
        }

        // Special handling to synch the PageMap only for removeAll
        // TODO: handle other store/data modifications WRT buffered Stores.
        if (me.pageMap) {
            me.pageMap.clear();
        }
        if (silent !== true) {
            me.fireEvent('clear', me);
        }
    },

    /*
     * Aggregation methods
     */

    /**
     * Convenience function for getting the first model instance in the store.
     *
     * When store is filtered, will return first item within the filter.
     *
     * @param {Boolean} [grouped] True to perform the operation for each group
     * in the store. The value returned will be an object literal with the key being the group
     * name and the first record being the value. The grouped parameter is only honored if
     * the store has a groupField.
     * @return {Ext.data.Model/undefined} The first model instance in the store, or undefined
     */
    first: function(grouped) {
        var me = this;

        if (grouped && me.isGrouped()) {
            return me.aggregate(function(records) {
                return records.length ? records[0] : undefined;
            }, me, true);
        } else {
            return me.data.first();
        }
    },

    /**
     * Convenience function for getting the last model instance in the store.
     *
     * When store is filtered, will return last item within the filter.
     *
     * @param {Boolean} [grouped] True to perform the operation for each group
     * in the store. The value returned will be an object literal with the key being the group
     * name and the last record being the value. The grouped parameter is only honored if
     * the store has a groupField.
     * @return {Ext.data.Model/undefined} The last model instance in the store, or undefined
     */
    last: function(grouped) {
        var me = this;

        if (grouped && me.isGrouped()) {
            return me.aggregate(function(records) {
                var len = records.length;
                return len ? records[len - 1] : undefined;
            }, me, true);
        } else {
            return me.data.last();
        }
    },

    /**
     * Sums the value of `property` for each {@link Ext.data.Model record} between `start`
     * and `end` and returns the result.
     *
     * When store is filtered, only sums items within the filter.
     *
     * @param {String} field A field in each record
     * @param {Boolean} [grouped] True to perform the operation for each group
     * in the store. The value returned will be an object literal with the key being the group
     * name and the sum for that group being the value. The grouped parameter is only honored if
     * the store has a groupField.
     * @return {Number} The sum
     */
    sum: function(field, grouped) {
        var me = this;

        if (grouped && me.isGrouped()) {
            return me.aggregate(me.getSum, me, true, [field]);
        } else {
            return me.getSum(me.data.items, field);
        }
    },

    // @private, see sum
    getSum: function(records, field) {
        var total = 0,
            i = 0,
            len = records.length;

        for (; i < len; ++i) {
            total += records[i].get(field);
        }

        return total;
    },

    /**
     * Gets the count of items in the store.
     *
     * When store is filtered, only items within the filter are counted.
     *
     * @param {Boolean} [grouped] True to perform the operation for each group
     * in the store. The value returned will be an object literal with the key being the group
     * name and the count for each group being the value. The grouped parameter is only honored if
     * the store has a groupField.
     * @return {Number} the count
     */
    count: function(grouped) {
        var me = this;

        if (grouped && me.isGrouped()) {
            return me.aggregate(function(records) {
                return records.length;
            }, me, true);
        } else {
            return me.getCount();
        }
    },

    /**
     * Gets the minimum value in the store.
     *
     * When store is filtered, only items within the filter are aggregated.
     *
     * @param {String} field The field in each record
     * @param {Boolean} [grouped] True to perform the operation for each group
     * in the store. The value returned will be an object literal with the key being the group
     * name and the minimum in the group being the value. The grouped parameter is only honored if
     * the store has a groupField.
     * @return {Object} The minimum value, if no items exist, undefined.
     */
    min: function(field, grouped) {
        var me = this;

        if (grouped && me.isGrouped()) {
            return me.aggregate(me.getMin, me, true, [field]);
        } else {
            return me.getMin(me.data.items, field);
        }
    },

    // @private, see min
    getMin: function(records, field) {
        var i = 1,
            len = records.length,
            value, min;

        if (len > 0) {
            min = records[0].get(field);
        }

        for (; i < len; ++i) {
            value = records[i].get(field);
            if (value < min) {
                min = value;
            }
        }
        return min;
    },

    /**
     * Gets the maximum value in the store.
     *
     * When store is filtered, only items within the filter are aggregated.
     *
     * @param {String} field The field in each record
     * @param {Boolean} [grouped] True to perform the operation for each group
     * in the store. The value returned will be an object literal with the key being the group
     * name and the maximum in the group being the value. The grouped parameter is only honored if
     * the store has a groupField.
     * @return {Object} The maximum value, if no items exist, undefined.
     */
    max: function(field, grouped) {
        var me = this;

        if (grouped && me.isGrouped()) {
            return me.aggregate(me.getMax, me, true, [field]);
        } else {
            return me.getMax(me.data.items, field);
        }
    },

    // @private, see max
    getMax: function(records, field) {
        var i = 1,
            len = records.length,
            value,
            max;

        if (len > 0) {
            max = records[0].get(field);
        }

        for (; i < len; ++i) {
            value = records[i].get(field);
            if (value > max) {
                max = value;
            }
        }
        return max;
    },

    /**
     * Gets the average value in the store.
     *
     * When store is filtered, only items within the filter are aggregated.
     *
     * @param {String} field The field in each record
     * @param {Boolean} [grouped] True to perform the operation for each group
     * in the store. The value returned will be an object literal with the key being the group
     * name and the group average being the value. The grouped parameter is only honored if
     * the store has a groupField.
     * @return {Object} The average value, if no items exist, 0.
     */
    average: function(field, grouped) {
        var me = this;
        if (grouped && me.isGrouped()) {
            return me.aggregate(me.getAverage, me, true, [field]);
        } else {
            return me.getAverage(me.data.items, field);
        }
    },

    // @private, see average
    getAverage: function(records, field) {
        var i = 0,
            len = records.length,
            sum = 0;

        if (records.length > 0) {
            for (; i < len; ++i) {
                sum += records[i].get(field);
            }
            return sum / len;
        }
        return 0;
    },

    /**
     * Runs the aggregate function for all the records in the store.
     *
     * When store is filtered, only items within the filter are aggregated.
     *
     * @param {Function} fn The function to execute. The function is called with a single parameter,
     * an array of records for that group.
     * @param {Object} [scope] The scope to execute the function in. Defaults to the store.
     * @param {Boolean} [grouped] True to perform the operation for each group
     * in the store. The value returned will be an object literal with the key being the group
     * name and the group average being the value. The grouped parameter is only honored if
     * the store has a groupField.
     * @param {Array} [args] Any arguments to append to the function call
     * @return {Object} An object literal with the group names and their appropriate values.
     */
    aggregate: function(fn, scope, grouped, args) {
        args = args || [];
        if (grouped && this.isGrouped()) {
            var groups = this.getGroups(),
                i = 0,
                len = groups.length,
                out = {},
                group;

            for (; i < len; ++i) {
                group = groups[i];
                out[group.name] = fn.apply(scope || this, [group.children].concat(args));
            }
            return out;
        } else {
            return fn.apply(scope || this, [this.data.items].concat(args));
        }
    },

    /**
     * Commits all Records with {@link #getModifiedRecords outstanding changes}. To handle updates for changes,
     * subscribe to the Store's {@link #event-update update event}, and perform updating when the third parameter is
     * Ext.data.Record.COMMIT.
     */
    commitChanges : function(){
        var me = this,
            recs = me.getModifiedRecords(),
            len = recs.length,
            i = 0;

        for (; i < len; i++){
            recs[i].commit();
        }

        // Since removals are cached in a simple array we can simply reset it here.
        // Adds and updates are managed in the data MixedCollection and should already be current.
        me.removed.length = 0;
    },

    filterNewOnly: function(item){
        return item.phantom === true;
    },

    // Ideally in the future this will use getModifiedRecords, where there will be a param
    // to getNewRecords & getUpdatedRecords to indicate whether to get only the valid
    // records or grab all of them
    getRejectRecords: function() {
        // Return phantom records + updated records
        return Ext.Array.push(this.data.filterBy(this.filterNewOnly).items, this.getUpdatedRecords());
    },

    /**
     * {@link Ext.data.Model#reject Rejects} outstanding changes on all {@link #getModifiedRecords modified records}
     * and re-insert any records that were removed locally. Any phantom records will be removed.
     */
    rejectChanges : function() {
        var me = this,
            recs = me.getRejectRecords(),
            len = recs.length,
            i = 0,
            rec;

        for (; i < len; i++) {
            rec = recs[i];
            rec.reject();
            if (rec.phantom) {
                me.remove(rec);
            }
        }

        // Restore removed records back to their original positions
        recs = me.removed;
        len = recs.length;
        for (i = 0; i < len; i++) {
            rec = recs[i];
            me.insert(rec.removedFrom || 0, rec);
            rec.reject();
        }

        // Since removals are cached in a simple array we can simply reset it here.
        // Adds and updates are managed in the data MixedCollection and should already be current.
        me.removed.length = 0;
    }
}, function() {
    // A dummy empty store with a fieldless Model defined in it.
    // Just for binding to Views which are instantiated with no Store defined.
    // They will be able to run and render fine, and be bound to a generated Store later.
    Ext.regStore('ext-empty-store', {fields: [], proxy: 'memory'});

    /**
     * @class Ext.data.Store.PageMap
     * @extends Ext.util.LruCache
     * Private class for use by only Store when configured `buffered: true`.
     * @private
     */
    this.prototype.PageMap = new Ext.Class({
        extend: 'Ext.util.LruCache',

        // Maintain a generation counter, so that the Store can reject incoming pages destined for the previous generation
        clear: function(initial) {
            this.generation = (this.generation ||0) + 1;
            this.callParent(arguments);
        },

        getPageFromRecordIndex: this.prototype.getPageFromRecordIndex,

        addPage: function(page, records) {
            this.add(page, records);
            this.fireEvent('pageAdded', page, records);
        },

        getPage: function(page) {
            return this.get(page);
        },

        hasRange: function(start, end) {
            var page = this.getPageFromRecordIndex(start),
                endPage = this.getPageFromRecordIndex(end);

            for (; page <= endPage; page++) {
                if (!this.hasPage(page)) {
                    return false;
                }
            }
            return true;
        },

        hasPage: function(page) {
            // We must use this.get to trigger an access so that the page which is checked for presence is not eligible for pruning
            return !!this.get(page);
        },

        getRange: function(start, end) {
            if (!this.hasRange(start, end)) {
                Ext.Error.raise('PageMap asked for range which it does not have');
            }
            var me = this,
                startPage = me.getPageFromRecordIndex(start),
                endPage = me.getPageFromRecordIndex(end),
                dataStart = (startPage - 1) * me.pageSize,
                dataEnd = (endPage * me.pageSize) - 1,
                page = startPage,
                result = [],
                sliceBegin, sliceEnd, doSlice,
                i = 0, len;

            for (; page <= endPage; page++) {

                // First and last pages will need slicing to cut into the actual wanted records
                if (page == startPage) {
                    sliceBegin = start - dataStart;
                    doSlice = true;
                } else {
                    sliceBegin = 0;
                    doSlice = false;
                }
                if (page == endPage) {
                    sliceEnd = me.pageSize - (dataEnd - end);
                    doSlice = true;
                }

                // First and last pages will need slicing
                if (doSlice) {
                    Ext.Array.push(result, Ext.Array.slice(me.getPage(page), sliceBegin, sliceEnd));
                } else {
                    Ext.Array.push(result, me.getPage(page));
                }
            }

            // Inject the dataset ordinal position into the record as the index
            for (len = result.length; i < len; i++) {
                result[i].index = start++;
            }
            return result;
        }
    });
});

/**
 * @author Ed Spencer
 *
 * Small helper class to make creating {@link Ext.data.Store}s from Array data easier. An ArrayStore will be
 * automatically configured with a {@link Ext.data.reader.Array}.
 *
 * A store configuration would be something like:
 *
 *     var store = Ext.create('Ext.data.ArrayStore', {
 *         // store configs
 *         storeId: 'myStore',
 *         // reader configs
 *         fields: [
 *            'company',
 *            {name: 'price', type: 'float'},
 *            {name: 'change', type: 'float'},
 *            {name: 'pctChange', type: 'float'},
 *            {name: 'lastChange', type: 'date', dateFormat: 'n/j h:ia'}
 *         ]
 *     });
 *
 * This store is configured to consume a returned object of the form:
 *
 *     var myData = [
 *         ['3m Co',71.72,0.02,0.03,'9/1 12:00am'],
 *         ['Alcoa Inc',29.01,0.42,1.47,'9/1 12:00am'],
 *         ['Boeing Co.',75.43,0.53,0.71,'9/1 12:00am'],
 *         ['Hewlett-Packard Co.',36.53,-0.03,-0.08,'9/1 12:00am'],
 *         ['Wal-Mart Stores, Inc.',45.45,0.73,1.63,'9/1 12:00am']
 *     ];
 *
 * An object literal of this form could also be used as the {@link #cfg-data} config option.
 *
 */
Ext.define('Ext.data.ArrayStore', {
    extend: 'Ext.data.Store',
    alias: 'store.array',
    requires: [
        'Ext.data.proxy.Memory',
        'Ext.data.reader.Array'
    ],

    constructor: function(config) {
        config = Ext.apply({
            proxy: {
                type: 'memory',
                reader: 'array'
            }
        }, config);
        this.callParent([config]);
    },

    loadData: function(data, append) {
        if (this.expandData === true) {
            var r = [],
                i = 0,
                ln = data.length;

            for (; i < ln; i++) {
                r[r.length] = [data[i]];
            }

            data = r;
        }

        this.callParent([data, append]);
    }
}, function() {
    // backwards compat
    Ext.data.SimpleStore = Ext.data.ArrayStore;
    // Ext.reg('simplestore', Ext.data.SimpleStore);
});
/**
 * @private
 */
Ext.define('Ext.data.BufferStore', {
    extend: 'Ext.data.Store',
    alias: 'store.buffer',
    sortOnLoad: false,
    filterOnLoad: false,
    
    constructor: function() {
        Ext.Error.raise('The BufferStore class has been deprecated. Instead, specify the buffered config option on Ext.data.Store');
    }
});
/**
 * @class Ext.data.JsonPStore
 * @extends Ext.data.Store
 * <p>Small helper class to make creating {@link Ext.data.Store}s from different domain JSON data easier.
 * A JsonPStore will be automatically configured with a {@link Ext.data.reader.Json} and a {@link Ext.data.proxy.JsonP JsonPProxy}.</p>
 * <p>A store configuration would be something like:<pre><code>
var store = new Ext.data.JsonPStore({
    // store configs
    storeId: 'myStore',

    // proxy configs
    url: 'get-images.php',

    // reader configs
    root: 'images',
    idProperty: 'name',
    fields: ['name', 'url', {name:'size', type: 'float'}, {name:'lastmod', type:'date'}]
});
 * </code></pre></p>
 * <p>This store is configured to consume a returned object of the form:<pre><code>
stcCallback({
    images: [
        {name: 'Image one', url:'/GetImage.php?id=1', size:46.5, lastmod: new Date(2007, 10, 29)},
        {name: 'Image Two', url:'/GetImage.php?id=2', size:43.2, lastmod: new Date(2007, 10, 30)}
    ]
})
 * </code></pre>
 * <p>Where stcCallback is the callback name passed in the request to the remote domain. See {@link Ext.data.proxy.JsonP JsonPProxy}
 * for details of how this works.</p>
 * An object literal of this form could also be used as the {@link #cfg-data} config option.</p>
 * @xtype jsonpstore
 */
Ext.define('Ext.data.JsonPStore', {
    extend: 'Ext.data.Store',
    alias : 'store.jsonp',
    requires: [
        'Ext.data.proxy.JsonP',
        'Ext.data.reader.Json'
    ],

    constructor: function(config) {
        config = Ext.apply({
            proxy: {
                type: 'jsonp',
                reader: 'json'
            }
        }, config);
        this.callParent([config]);
    }
});
/**
 * @author Ed Spencer
 *
 * <p>Small helper class to make creating {@link Ext.data.Store}s from JSON data easier.
 * A JsonStore will be automatically configured with a {@link Ext.data.reader.Json}.</p>
 *
 * <p>A store configuration would be something like:</p>
 *
<pre><code>
var store = new Ext.data.JsonStore({
    // store configs
    storeId: 'myStore',

    proxy: {
        type: 'ajax',
        url: 'get-images.php',
        reader: {
            type: 'json',
            root: 'images',
            idProperty: 'name'
        }
    },

    //alternatively, a {@link Ext.data.Model} name can be given (see {@link Ext.data.Store} for an example)
    fields: ['name', 'url', {name:'size', type: 'float'}, {name:'lastmod', type:'date'}]
});
</code></pre>
 *
 * <p>This store is configured to consume a returned object of the form:<pre><code>
{
    images: [
        {name: 'Image one', url:'/GetImage.php?id=1', size:46.5, lastmod: new Date(2007, 10, 29)},
        {name: 'Image Two', url:'/GetImage.php?id=2', size:43.2, lastmod: new Date(2007, 10, 30)}
    ]
}
</code></pre>
 *
 * <p>An object literal of this form could also be used as the {@link #cfg-data} config option.</p>
 */
Ext.define('Ext.data.JsonStore',  {
    extend: 'Ext.data.Store',
    alias: 'store.json',
    requires: [
        'Ext.data.proxy.Ajax',
        'Ext.data.reader.Json',
        'Ext.data.writer.Json'
    ],

    constructor: function(config) {
        config = Ext.apply({
            proxy: {
                type  : 'ajax',
                reader: 'json',
                writer: 'json'
            }
        }, config);
        this.callParent([config]);
    }
});
/**
 * Node Store
 * @private
 */
Ext.define('Ext.data.NodeStore', {
    extend: 'Ext.data.Store',
    alias: 'store.node',
    requires: ['Ext.data.NodeInterface'],

    /**
     * @cfg {Ext.data.Model} node
     * The Record you want to bind this Store to. Note that
     * this record will be decorated with the Ext.data.NodeInterface if this is not the
     * case yet.
     */
    node: null,

    /**
     * @cfg {Boolean} recursive
     * Set this to true if you want this NodeStore to represent
     * all the descendents of the node in its flat data collection. This is useful for
     * rendering a tree structure to a DataView and is being used internally by
     * the TreeView. Any records that are moved, removed, inserted or appended to the
     * node at any depth below the node this store is bound to will be automatically
     * updated in this Store's internal flat data structure.
     */
    recursive: false,
    
    /** 
     * @cfg {Boolean} rootVisible
     * False to not include the root node in this Stores collection.
     */    
    rootVisible: false,

    /**
     * @cfg {Ext.data.TreeStore} treeStore
     * The TreeStore that is used by this NodeStore's Ext.tree.View.
     */

    constructor: function(config) {
        var me = this,
            node;

        config = config || {};
        Ext.apply(me, config);

        if (Ext.isDefined(me.proxy)) {
            Ext.Error.raise("A NodeStore cannot be bound to a proxy. Instead bind it to a record " +
                            "decorated with the NodeInterface by setting the node config.");
        }
        me.useModelWarning = false;

        config.proxy = {type: 'proxy'};
        me.callParent([config]);

        node = me.node;
        if (node) {
            me.node = null;
            me.setNode(node);
        }
    },

    setNode: function(node) {
        var me = this;
        if (me.node && me.node != node) {
            // We want to unbind our listeners on the old node
            me.mun(me.node, {
                expand: me.onNodeExpand,
                collapse: me.onNodeCollapse,
                append: me.onNodeAppend,
                insert: me.onNodeInsert,
                remove: me.onNodeRemove,
                sort: me.onNodeSort,
                scope: me
            });
            me.node = null;
        }

        if (node) {
            Ext.data.NodeInterface.decorate(node.self);
            me.removeAll();
            if (me.rootVisible) {
                me.add(node);
            } else if (!node.isExpanded() && me.treeStore.autoLoad !== false) {
                node.expand();
            }

            me.mon(node, {
                expand: me.onNodeExpand,
                collapse: me.onNodeCollapse,
                append: me.onNodeAppend,
                insert: me.onNodeInsert,
                remove: me.onNodeRemove,
                sort: me.onNodeSort,
                scope: me
            });
            me.node = node;
            if (node.isExpanded() && node.isLoaded()) {
                me.onNodeExpand(node, node.childNodes, true);
            }
        }
    },

    onNodeSort: function(node, childNodes) {
        var me = this;

        if ((me.indexOf(node) !== -1 || (node === me.node && !me.rootVisible) && node.isExpanded())) {
            me.onNodeCollapse(node, childNodes, true);
            me.onNodeExpand(node, childNodes, true);
        }
    },

    onNodeExpand: function(parent, records, suppressEvent) {
        var me = this,
            insertIndex = me.indexOf(parent) + 1,
            ln = records ? records.length : 0,
            i, record;

        if (!me.recursive && parent !== me.node) {
            return;
        }

        if (parent !== this.node && !me.isVisible(parent)) {
            return;
        }

        if (!suppressEvent && me.fireEvent('beforeexpand', parent, records, insertIndex) === false) {
            return;
        }

        if (ln) {
            me.insert(insertIndex, records);
            for (i = 0; i < ln; i++) {
                record = records[i];
                if (record.isExpanded()) {
                    if (record.isLoaded()) {
                        // Take a shortcut
                        me.onNodeExpand(record, record.childNodes, true);
                    }
                    else {
                        record.set('expanded', false);
                        record.expand();
                    }
                }
            }
        }

        if (!suppressEvent) {
            me.fireEvent('expand', parent, records);
        }
    },

    onNodeCollapse: function(parent, records, suppressEvent) {
        var me = this,
            ln = records.length,
            collapseIndex = me.indexOf(parent) + 1,
            i, record;

        if (!me.recursive && parent !== me.node) {
            return;
        }

        if (!suppressEvent && me.fireEvent('beforecollapse', parent, records, collapseIndex) === false) {
            return;
        }

        for (i = 0; i < ln; i++) {
            record = records[i];
            me.remove(record);
            if (record.isExpanded()) {
                me.onNodeCollapse(record, record.childNodes, true);
            }
        }

        if (!suppressEvent) {
            me.fireEvent('collapse', parent, records, collapseIndex);
        }
    },

    onNodeAppend: function(parent, node, index) {
        var me = this,
            refNode, sibling;

        if (me.isVisible(node)) {
            if (index === 0) {
                refNode = parent;
            } else {
                sibling = node.previousSibling;
                while (sibling.isExpanded() && sibling.lastChild) {
                    sibling = sibling.lastChild;
                }
                refNode = sibling;
            }
            me.insert(me.indexOf(refNode) + 1, node);
            if (!node.isLeaf() && node.isExpanded()) {
                if (node.isLoaded()) {
                    // Take a shortcut
                    me.onNodeExpand(node, node.childNodes, true);
                }
                else {
                    node.set('expanded', false);
                    node.expand();
                }
            }
        }
    },

    onNodeInsert: function(parent, node, refNode) {
        var me = this,
            index = this.indexOf(refNode);

        if (index != -1 && me.isVisible(node)) {
            me.insert(index, node);
            if (!node.isLeaf() && node.isExpanded()) {
                if (node.isLoaded()) {
                    // Take a shortcut
                    me.onNodeExpand(node, node.childNodes, true);
                }
                else {
                    node.set('expanded', false);
                    node.expand();
                }
            }
        }
    },

    onNodeRemove: function(parent, node, index) {
        var me = this;
        if (me.indexOf(node) != -1) {
            if (!node.isLeaf() && node.isExpanded()) {
                me.onNodeCollapse(node, node.childNodes, true);
            }
            me.remove(node);
        }
    },

    isVisible: function(node) {
        var parent = node.parentNode;
        while (parent) {
            if (parent === this.node && !this.rootVisible && parent.isExpanded()) {
                return true;
            }

            if (this.indexOf(parent) === -1 || !parent.isExpanded()) {
                return false;
            }

            parent = parent.parentNode;
        }
        return true;
    }
});
/**
 * @author Ed Spencer
 * <p>Small helper class to make creating {@link Ext.data.Store}s from XML data easier.
 * A XmlStore will be automatically configured with a {@link Ext.data.reader.Xml}.</p>
 * <p>A store configuration would be something like:<pre><code>
var store = new Ext.data.XmlStore({
    // store configs
    storeId: 'myStore',
    url: 'sheldon.xml', // automatically configures a HttpProxy
    // reader configs
    record: 'Item', // records will have an "Item" tag
    idPath: 'ASIN',
    totalRecords: '@TotalResults'
    fields: [
        // set up the fields mapping into the xml doc
        // The first needs mapping, the others are very basic
        {name: 'Author', mapping: 'ItemAttributes > Author'},
        'Title', 'Manufacturer', 'ProductGroup'
    ]
});
 * </code></pre></p>
 * <p>This store is configured to consume a returned object of the form:<pre><code>
&#60?xml version="1.0" encoding="UTF-8"?>
&#60ItemSearchResponse xmlns="http://webservices.amazon.com/AWSECommerceService/2009-05-15">
    &#60Items>
        &#60Request>
            &#60IsValid>True&#60/IsValid>
            &#60ItemSearchRequest>
                &#60Author>Sidney Sheldon&#60/Author>
                &#60SearchIndex>Books&#60/SearchIndex>
            &#60/ItemSearchRequest>
        &#60/Request>
        &#60TotalResults>203&#60/TotalResults>
        &#60TotalPages>21&#60/TotalPages>
        &#60Item>
            &#60ASIN>0446355453&#60/ASIN>
            &#60DetailPageURL>
                http://www.amazon.com/
            &#60/DetailPageURL>
            &#60ItemAttributes>
                &#60Author>Sidney Sheldon&#60/Author>
                &#60Manufacturer>Warner Books&#60/Manufacturer>
                &#60ProductGroup>Book&#60/ProductGroup>
                &#60Title>Master of the Game&#60/Title>
            &#60/ItemAttributes>
        &#60/Item>
    &#60/Items>
&#60/ItemSearchResponse>
 * </code></pre>
 * An object literal of this form could also be used as the {@link #cfg-data} config option.</p>
 * <p><b>Note:</b> This class accepts all of the configuration options of
 * <b>{@link Ext.data.reader.Xml XmlReader}</b>.</p>
 */
Ext.define('Ext.data.XmlStore', {
    extend: 'Ext.data.Store',
    alias: 'store.xml',

    requires: [
        'Ext.data.proxy.Ajax',
        'Ext.data.reader.Xml',
        'Ext.data.writer.Xml'
    ],
    
    constructor: function(config){
        config = Ext.apply({
            proxy: {
                type: 'ajax',
                reader: 'xml',
                writer: 'xml'
            }
        }, config);

        this.callParent([config]);
    }
});
/**
 * @author Ed Spencer
 *
 * The Rest proxy is a specialization of the {@link Ext.data.proxy.Ajax AjaxProxy} which simply maps the four actions
 * (create, read, update and destroy) to RESTful HTTP verbs. For example, let's set up a {@link Ext.data.Model Model}
 * with an inline Rest proxy
 *
 *     Ext.define('User', {
 *         extend: 'Ext.data.Model',
 *         fields: ['id', 'name', 'email'],
 *
 *         proxy: {
 *             type: 'rest',
 *             url : '/users'
 *         }
 *     });
 *
 * Now we can create a new User instance and save it via the Rest proxy. Doing this will cause the Proxy to send a POST
 * request to '/users':
 *
 *     var user = Ext.create('User', {name: 'Ed Spencer', email: 'ed@sencha.com'});
 *
 *     user.save(); //POST /users
 *
 * Let's expand this a little and provide a callback for the {@link Ext.data.Model#save} call to update the Model once
 * it has been created. We'll assume the creation went successfully and that the server gave this user an ID of 123:
 *
 *     user.save({
 *         success: function(user) {
 *             user.set('name', 'Khan Noonien Singh');
 *
 *             user.save(); //PUT /users/123
 *         }
 *     });
 *
 * Now that we're no longer creating a new Model instance, the request method is changed to an HTTP PUT, targeting the
 * relevant url for that user. Now let's delete this user, which will use the DELETE method:
 *
 *         user.destroy(); //DELETE /users/123
 *
 * Finally, when we perform a load of a Model or Store, Rest proxy will use the GET method:
 *
 *     //1. Load via Store
 *
 *     //the Store automatically picks up the Proxy from the User model
 *     var store = Ext.create('Ext.data.Store', {
 *         model: 'User'
 *     });
 *
 *     store.load(); //GET /users
 *
 *     //2. Load directly from the Model
 *
 *     //GET /users/123
 *     Ext.ModelManager.getModel('User').load(123, {
 *         success: function(user) {
 *             console.log(user.getId()); //outputs 123
 *         }
 *     });
 *
 * # Url generation
 *
 * The Rest proxy is able to automatically generate the urls above based on two configuration options - {@link #appendId} and
 * {@link #format}. If appendId is true (it is by default) then Rest proxy will automatically append the ID of the Model
 * instance in question to the configured url, resulting in the '/users/123' that we saw above.
 *
 * If the request is not for a specific Model instance (e.g. loading a Store), the url is not appended with an id.
 * The Rest proxy will automatically insert a '/' before the ID if one is not already present.
 *
 *     new Ext.data.proxy.Rest({
 *         url: '/users',
 *         appendId: true //default
 *     });
 *
 *     // Collection url: /users
 *     // Instance url  : /users/123
 *
 * The Rest proxy can also optionally append a format string to the end of any generated url:
 *
 *     new Ext.data.proxy.Rest({
 *         url: '/users',
 *         format: 'json'
 *     });
 *
 *     // Collection url: /users.json
 *     // Instance url  : /users/123.json
 *
 * If further customization is needed, simply implement the {@link #buildUrl} method and add your custom generated url
 * onto the {@link Ext.data.Request Request} object that is passed to buildUrl. See [Rest proxy's implementation][1] for
 * an example of how to achieve this.
 *
 * Note that Rest proxy inherits from {@link Ext.data.proxy.Ajax AjaxProxy}, which already injects all of the sorter,
 * filter, group and paging options into the generated url. See the {@link Ext.data.proxy.Ajax AjaxProxy docs} for more
 * details.
 *
 * [1]: source/Rest.html#Ext-data-proxy-Rest-method-buildUrl
 */
Ext.define('Ext.data.proxy.Rest', {
    extend: 'Ext.data.proxy.Ajax',
    alternateClassName: 'Ext.data.RestProxy',
    alias : 'proxy.rest',
    
    /**
     * @cfg {Boolean} appendId
     * True to automatically append the ID of a Model instance when performing a request based on that single instance.
     * See Rest proxy intro docs for more details. Defaults to true.
     */
    appendId: true,
    
    /**
     * @cfg {String} format
     * Optional data format to send to the server when making any request (e.g. 'json'). See the Rest proxy intro docs
     * for full details. Defaults to undefined.
     */
    
    /**
     * @cfg {Boolean} batchActions
     * True to batch actions of a particular type when synchronizing the store. Defaults to false.
     */
    batchActions: false,
    
    /**
     * Specialized version of buildUrl that incorporates the {@link #appendId} and {@link #format} options into the
     * generated url. Override this to provide further customizations, but remember to call the superclass buildUrl so
     * that additional parameters like the cache buster string are appended.
     * @param {Object} request
     */
    buildUrl: function(request) {
        var me        = this,
            operation = request.operation,
            records   = operation.records || [],
            record    = records[0],
            format    = me.format,
            url       = me.getUrl(request),
            id        = record ? record.getId() : operation.id;
        
        if (me.appendId && id) {
            if (!url.match(/\/$/)) {
                url += '/';
            }
            
            url += id;
        }
        
        if (format) {
            if (!url.match(/\.$/)) {
                url += '.';
            }
            
            url += format;
        }
        
        request.url = url;
        
        return me.callParent(arguments);
    }
}, function() {
    Ext.apply(this.prototype, {
        /**
         * @property {Object} actionMethods
         * Mapping of action name to HTTP request method. These default to RESTful conventions for the 'create', 'read',
         * 'update' and 'destroy' actions (which map to 'POST', 'GET', 'PUT' and 'DELETE' respectively). This object
         * should not be changed except globally via {@link Ext#override Ext.override} - the {@link #getMethod} function
         * can be overridden instead.
         */
        actionMethods: {
            create : 'POST',
            read   : 'GET',
            update : 'PUT',
            destroy: 'DELETE'
        }
    });
});



/**
 * This class is used to send requests to the server using {@link Ext.direct.Manager Ext.Direct}. When a
 * request is made, the transport mechanism is handed off to the appropriate
 * {@link Ext.direct.RemotingProvider Provider} to complete the call.
 *
 * # Specifying the function
 *
 * This proxy expects a Direct remoting method to be passed in order to be able to complete requests.
 * This can be done by specifying the {@link #directFn} configuration. This will use the same direct
 * method for all requests. Alternatively, you can provide an {@link #api} configuration. This
 * allows you to specify a different remoting method for each CRUD action.
 *
 * # Parameters
 *
 * This proxy provides options to help configure which parameters will be sent to the server.
 * By specifying the {@link #paramsAsHash} option, it will send an object literal containing each
 * of the passed parameters. The {@link #paramOrder} option can be used to specify the order in which
 * the remoting method parameters are passed.
 *
 * # Example Usage
 *
 *     Ext.define('User', {
 *         extend: 'Ext.data.Model',
 *         fields: ['firstName', 'lastName'],
 *         proxy: {
 *             type: 'direct',
 *             directFn: MyApp.getUsers,
 *             paramOrder: 'id' // Tells the proxy to pass the id as the first parameter to the remoting method.
 *         }
 *     });
 *     User.load(1);
 */
Ext.define('Ext.data.proxy.Direct', {
    /* Begin Definitions */

    extend: 'Ext.data.proxy.Server',
    alternateClassName: 'Ext.data.DirectProxy',

    alias: 'proxy.direct',

    requires: ['Ext.direct.Manager'],

    /* End Definitions */

    /**
     * @cfg {String/String[]} paramOrder
     * Defaults to undefined. A list of params to be executed server side.  Specify the params in the order in
     * which they must be executed on the server-side as either (1) an Array of String values, or (2) a String
     * of params delimited by either whitespace, comma, or pipe. For example, any of the following would be
     * acceptable:
     *
     *     paramOrder: ['param1','param2','param3']
     *     paramOrder: 'param1 param2 param3'
     *     paramOrder: 'param1,param2,param3'
     *     paramOrder: 'param1|param2|param'
     */
    paramOrder: undefined,

    /**
     * @cfg {Boolean} paramsAsHash
     * Send parameters as a collection of named arguments.
     * Providing a {@link #paramOrder} nullifies this configuration.
     */
    paramsAsHash: true,

    /**
     * @cfg {Function/String} directFn
     * Function to call when executing a request. directFn is a simple alternative to defining the api configuration-parameter
     * for Store's which will not implement a full CRUD api. The directFn may also be a string reference to the fully qualified
     * name of the function, for example: 'MyApp.company.GetProfile'. This can be useful when using dynamic loading. The string 
     * will be looked up when the proxy is created.
     */
    directFn : undefined,

    /**
     * @cfg {Object} api
     * The same as {@link Ext.data.proxy.Server#api}, however instead of providing urls, you should provide a direct
     * function call. See {@link #directFn}.
     */

    /**
     * @cfg {Object} extraParams
     * Extra parameters that will be included on every read request. Individual requests with params
     * of the same name will override these params when they are in conflict.
     */

    // private
    paramOrderRe: /[\s,|]/,

    constructor: function(config){
        var me = this,
            paramOrder,
            fn,
            api;
            
        me.callParent(arguments);
        
        paramOrder = me.paramOrder;
        if (Ext.isString(paramOrder)) {
            me.paramOrder = paramOrder.split(me.paramOrderRe);
        }
        
        fn = me.directFn;
        if (fn) {
            me.directFn = Ext.direct.Manager.parseMethod(fn);
        }
        
        api = me.api;
        for (fn in api) {
            if (api.hasOwnProperty(fn)) {
                api[fn] = Ext.direct.Manager.parseMethod(api[fn]);
            }
        }
    },

    doRequest: function(operation, callback, scope) {
        var me = this,
            writer = me.getWriter(),
            request = me.buildRequest(operation, callback, scope),
            fn = me.api[request.action]  || me.directFn,
            params = request.params,
            args = [],
            method;

        if (!fn) {
            Ext.Error.raise('No direct function specified for this proxy');
        }

        if (operation.allowWrite()) {
            request = writer.write(request);
        }

        if (operation.action == 'read') {
            // We need to pass params
            method = fn.directCfg.method;
            args = method.getArgs(params, me.paramOrder, me.paramsAsHash);
        } else {
            args.push(request.jsonData);
        }

        Ext.apply(request, {
            args: args,
            directFn: fn
        });
        args.push(me.createRequestCallback(request, operation, callback, scope), me);
        fn.apply(window, args);
    },

    /*
     * Inherit docs. We don't apply any encoding here because
     * all of the direct requests go out as jsonData
     */
    applyEncoding: function(value){
        return value;
    },

    createRequestCallback: function(request, operation, callback, scope){
        var me = this;

        return function(data, event){
            me.processResponse(event.status, operation, request, event, callback, scope);
        };
    },

    // inherit docs
    extractResponseData: function(response){
        return Ext.isDefined(response.result) ? response.result : response.data;
    },

    // inherit docs
    setException: function(operation, response) {
        operation.setException(response.message);
    },

    // inherit docs
    buildUrl: function(){
        return '';
    }
});

/**
 * Small helper class to create an {@link Ext.data.Store} configured with an {@link Ext.data.proxy.Direct}
 * and {@link Ext.data.reader.Json} to make interacting with an {@link Ext.direct.Manager} server-side
 * {@link Ext.direct.Provider Provider} easier. To create a different proxy/reader combination create a basic
 * {@link Ext.data.Store} configured as needed.
 *
 * **Note:** Although they are not listed, this class inherits all of the config options of:
 *
 * - **{@link Ext.data.Store Store}**
 *
 * - **{@link Ext.data.reader.Json JsonReader}**
 *
 *   - **{@link Ext.data.reader.Json#cfg-root root}**
 *   - **{@link Ext.data.reader.Json#idProperty idProperty}**
 *   - **{@link Ext.data.reader.Json#totalProperty totalProperty}**
 *
 * - **{@link Ext.data.proxy.Direct DirectProxy}**
 *
 *   - **{@link Ext.data.proxy.Direct#directFn directFn}**
 *   - **{@link Ext.data.proxy.Direct#paramOrder paramOrder}**
 *   - **{@link Ext.data.proxy.Direct#paramsAsHash paramsAsHash}**
 *
 */
Ext.define('Ext.data.DirectStore', {
    /* Begin Definitions */
    
    extend: 'Ext.data.Store',
    
    alias: 'store.direct',
    
    requires: ['Ext.data.proxy.Direct'],
   
    /* End Definitions */

    constructor : function(config){
        config = Ext.apply({}, config);
        if (!config.proxy) {
            var proxy = {
                type: 'direct',
                reader: {
                    type: 'json'
                }
            };
            Ext.copyTo(proxy, config, 'paramOrder,paramsAsHash,directFn,api,simpleSortMode');
            Ext.copyTo(proxy.reader, config, 'totalProperty,root,idProperty');
            config.proxy = proxy;
        }
        this.callParent([config]);
    }    
});
