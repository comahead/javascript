
/**
 * A mixin for {@link Ext.container.Container} components that are likely to have form fields in their
 * items subtree. Adds the following capabilities:
 *
 * - Methods for handling the addition and removal of {@link Ext.form.Labelable} and {@link Ext.form.field.Field}
 *   instances at any depth within the container.
 * - Events ({@link #fieldvaliditychange} and {@link #fielderrorchange}) for handling changes to the state
 *   of individual fields at the container level.
 * - Automatic application of {@link #fieldDefaults} config properties to each field added within the
 *   container, to facilitate uniform configuration of all fields.
 *
 * This mixin is primarily for internal use by {@link Ext.form.Panel} and {@link Ext.form.FieldContainer},
 * and should not normally need to be used directly. @docauthor Jason Johnston <jason@sencha.com>
 */
Ext.define('Ext.form.FieldAncestor', {

    /**
     * @cfg {Object} fieldDefaults
     * If specified, the properties in this object are used as default config values for each {@link Ext.form.Labelable}
     * instance (e.g. {@link Ext.form.field.Base} or {@link Ext.form.FieldContainer}) that is added as a descendant of
     * this container. Corresponding values specified in an individual field's own configuration, or from the {@link
     * Ext.container.Container#defaults defaults config} of its parent container, will take precedence. See the
     * documentation for {@link Ext.form.Labelable} to see what config options may be specified in the fieldDefaults.
     *
     * Example:
     *
     *     new Ext.form.Panel({
     *         fieldDefaults: {
     *             labelAlign: 'left',
     *             labelWidth: 100
     *         },
     *         items: [{
     *             xtype: 'fieldset',
     *             defaults: {
     *                 labelAlign: 'top'
     *             },
     *             items: [{
     *                 name: 'field1'
     *             }, {
     *                 name: 'field2'
     *             }]
     *         }, {
     *             xtype: 'fieldset',
     *             items: [{
     *                 name: 'field3',
     *                 labelWidth: 150
     *             }, {
     *                 name: 'field4'
     *             }]
     *         }]
     *     });
     *
     * In this example, field1 and field2 will get labelAlign:'top' (from the fieldset's defaults) and labelWidth:100
     * (from fieldDefaults), field3 and field4 will both get labelAlign:'left' (from fieldDefaults and field3 will use
     * the labelWidth:150 from its own config.
     */


    /**
     * Initializes the FieldAncestor's state; this must be called from the initComponent method of any components
     * importing this mixin.
     * @protected
     */
    initFieldAncestor: function() {
        var me = this,
            onSubtreeChange = me.onFieldAncestorSubtreeChange;

        me.addEvents(
            /**
             * @event fieldvaliditychange
             * Fires when the validity state of any one of the {@link Ext.form.field.Field} instances within this
             * container changes.
             * @param {Ext.form.FieldAncestor} this
             * @param {Ext.form.Labelable} The Field instance whose validity changed
             * @param {String} isValid The field's new validity state
             */
            'fieldvaliditychange',

            /**
             * @event fielderrorchange
             * Fires when the active error message is changed for any one of the {@link Ext.form.Labelable} instances
             * within this container.
             * @param {Ext.form.FieldAncestor} this
             * @param {Ext.form.Labelable} The Labelable instance whose active error was changed
             * @param {String} error The active error message
             */
            'fielderrorchange'
        );

        // Catch addition and removal of descendant fields
        me.on('add', onSubtreeChange, me);
        me.on('remove', onSubtreeChange, me);

        me.initFieldDefaults();
    },

    /**
     * @private Initialize the {@link #fieldDefaults} object
     */
    initFieldDefaults: function() {
        if (!this.fieldDefaults) {
            this.fieldDefaults = {};
        }
    },

    /**
     * @private
     * Handle the addition and removal of components in the FieldAncestor component's child tree.
     */
    onFieldAncestorSubtreeChange: function(parent, child) {
        var me = this,
            isAdding = !!child.ownerCt;

        function handleCmp(cmp) {
            var isLabelable = cmp.isFieldLabelable,
                isField = cmp.isFormField;
            if (isLabelable || isField) {
                if (isLabelable) {
                    me['onLabelable' + (isAdding ? 'Added' : 'Removed')](cmp);
                }
                if (isField) {
                    me['onField' + (isAdding ? 'Added' : 'Removed')](cmp);
                }
            }
            else if (cmp.isContainer) {
                Ext.Array.forEach(cmp.getRefItems(), handleCmp);
            }
        }
        handleCmp(child);
    },

    /**
     * Called when a {@link Ext.form.Labelable} instance is added to the container's subtree.
     * @param {Ext.form.Labelable} labelable The instance that was added
     * @protected
     */
    onLabelableAdded: function(labelable) {
        var me = this;

        // buffer slightly to avoid excessive firing while sub-fields are changing en masse
        me.mon(labelable, 'errorchange', me.handleFieldErrorChange, me, {buffer: 10});

        labelable.setFieldDefaults(me.fieldDefaults);
    },

    /**
     * Called when a {@link Ext.form.field.Field} instance is added to the container's subtree.
     * @param {Ext.form.field.Field} field The field which was added
     * @protected
     */
    onFieldAdded: function(field) {
        var me = this;
        me.mon(field, 'validitychange', me.handleFieldValidityChange, me);
    },

    /**
     * Called when a {@link Ext.form.Labelable} instance is removed from the container's subtree.
     * @param {Ext.form.Labelable} labelable The instance that was removed
     * @protected
     */
    onLabelableRemoved: function(labelable) {
        var me = this;
        me.mun(labelable, 'errorchange', me.handleFieldErrorChange, me);
    },

    /**
     * Called when a {@link Ext.form.field.Field} instance is removed from the container's subtree.
     * @param {Ext.form.field.Field} field The field which was removed
     * @protected
     */
    onFieldRemoved: function(field) {
        var me = this;
        me.mun(field, 'validitychange', me.handleFieldValidityChange, me);
    },

    /**
     * @private Handle validitychange events on sub-fields; invoke the aggregated event and method
     */
    handleFieldValidityChange: function(field, isValid) {
        var me = this;
        me.fireEvent('fieldvaliditychange', me, field, isValid);
        me.onFieldValidityChange(field, isValid);
    },

    /**
     * @private Handle errorchange events on sub-fields; invoke the aggregated event and method
     */
    handleFieldErrorChange: function(labelable, activeError) {
        var me = this;
        me.fireEvent('fielderrorchange', me, labelable, activeError);
        me.onFieldErrorChange(labelable, activeError);
    },

    /**
     * Fired when the validity of any field within the container changes.
     * @param {Ext.form.field.Field} field The sub-field whose validity changed
     * @param {Boolean} valid The new validity state
     * @protected
     */
    onFieldValidityChange: Ext.emptyFn,

    /**
     * Fired when the error message of any field within the container changes.
     * @param {Ext.form.Labelable} field The sub-field whose active error changed
     * @param {String} error The new active error message
     * @protected
     */
    onFieldErrorChange: Ext.emptyFn

});
/**
 * The subclasses of this class provide actions to perform upon {@link Ext.form.Basic Form}s.
 *
 * Instances of this class are only created by a {@link Ext.form.Basic Form} when the Form needs to perform an action
 * such as submit or load. The Configuration options listed for this class are set through the Form's action methods:
 * {@link Ext.form.Basic#submit submit}, {@link Ext.form.Basic#load load} and {@link Ext.form.Basic#doAction doAction}
 *
 * The instance of Action which performed the action is passed to the success and failure callbacks of the Form's action
 * methods ({@link Ext.form.Basic#submit submit}, {@link Ext.form.Basic#load load} and
 * {@link Ext.form.Basic#doAction doAction}), and to the {@link Ext.form.Basic#actioncomplete actioncomplete} and
 * {@link Ext.form.Basic#actionfailed actionfailed} event handlers.
 */
Ext.define('Ext.form.action.Action', {
    alternateClassName: 'Ext.form.Action',

    /**
     * @cfg {Ext.form.Basic} form
     * The {@link Ext.form.Basic BasicForm} instance that is invoking this Action. Required.
     */

    /**
     * @cfg {String} url
     * The URL that the Action is to invoke. Will default to the {@link Ext.form.Basic#url url} configured on the
     * {@link #form}.
     */

    /**
     * @cfg {Boolean} reset
     * When set to **true**, causes the Form to be {@link Ext.form.Basic#reset reset} on Action success. If specified,
     * this happens before the {@link #success} callback is called and before the Form's
     * {@link Ext.form.Basic#actioncomplete actioncomplete} event fires.
     */

    /**
     * @cfg {String} method
     * The HTTP method to use to access the requested URL.
     * Defaults to the {@link Ext.form.Basic#method BasicForm's method}, or 'POST' if not specified.
     */

    /**
     * @cfg {Object/String} params
     * Extra parameter values to pass. These are added to the Form's {@link Ext.form.Basic#baseParams} and passed to the
     * specified URL along with the Form's input fields.
     *
     * Parameters are encoded as standard HTTP parameters using {@link Ext#urlEncode Ext.Object.toQueryString}.
     */

    /**
     * @cfg {Object} headers
     * Extra headers to be sent in the AJAX request for submit and load actions.
     * See {@link Ext.data.proxy.Ajax#headers}.
     */

    /**
     * @cfg {Number} timeout
     * The number of seconds to wait for a server response before failing with the {@link #failureType} as
     * {@link Ext.form.action.Action#CONNECT_FAILURE}. If not specified, defaults to the configured
     * {@link Ext.form.Basic#timeout timeout} of the {@link #form}.
     */

    /**
     * @cfg {Function} success
     * The function to call when a valid success return packet is received.
     * @cfg {Ext.form.Basic} success.form The form that requested the action
     * @cfg {Ext.form.action.Action} success.action The Action class. The {@link #result} property of this object may
     * be examined to perform custom postprocessing.
     */

    /**
     * @cfg {Function} failure
     * The function to call when a failure packet was received, or when an error ocurred in the Ajax communication.
     * @cfg {Ext.form.Basic} failure.form The form that requested the action
     * @cfg {Ext.form.action.Action} failure.action The Action class. If an Ajax error ocurred, the failure type will
     * be in {@link #failureType}. The {@link #result} property of this object may be examined to perform custom
     * postprocessing.
     */

    /**
     * @cfg {Object} scope
     * The scope in which to call the configured #success and #failure callback functions
     * (the `this` reference for the callback functions).
     */

    /**
     * @cfg {String} waitMsg
     * The message to be displayed by a call to {@link Ext.window.MessageBox#wait} during the time the action is being
     * processed.
     */

    /**
     * @cfg {String} waitTitle
     * The title to be displayed by a call to {@link Ext.window.MessageBox#wait} during the time the action is being
     * processed.
     */

    /**
     * @cfg {Boolean} submitEmptyText
     * If set to true, the emptyText value will be sent with the form when it is submitted.
     */
    submitEmptyText : true,

    /**
     * @property {String} type
     * The type of action this Action instance performs. Currently only "submit" and "load" are supported.
     */

    /**
     * @property {String} failureType
     * The type of failure detected will be one of these:
     * {@link #CLIENT_INVALID}, {@link #SERVER_INVALID}, {@link #CONNECT_FAILURE}, or {@link #LOAD_FAILURE}.
     *
     * Usage:
     *
     *     var fp = new Ext.form.Panel({
     *     ...
     *     buttons: [{
     *         text: 'Save',
     *         formBind: true,
     *         handler: function(){
     *             if(fp.getForm().isValid()){
     *                 fp.getForm().submit({
     *                     url: 'form-submit.php',
     *                     waitMsg: 'Submitting your data...',
     *                     success: function(form, action){
     *                         // server responded with success = true
     *                         var result = action.{@link #result};
     *                     },
     *                     failure: function(form, action){
     *                         if (action.{@link #failureType} === Ext.form.action.Action.CONNECT_FAILURE) {
     *                             Ext.Msg.alert('Error',
     *                                 'Status:'+action.{@link #response}.status+': '+
     *                                 action.{@link #response}.statusText);
     *                         }
     *                         if (action.failureType === Ext.form.action.Action.SERVER_INVALID){
     *                             // server responded with success = false
     *                             Ext.Msg.alert('Invalid', action.{@link #result}.errormsg);
     *                         }
     *                     }
     *                 });
     *             }
     *         }
     *     },{
     *         text: 'Reset',
     *         handler: function(){
     *             fp.getForm().reset();
     *         }
     *     }]
     */

    /**
     * @property {Object} response
     * The raw XMLHttpRequest object used to perform the action.
     */

    /**
     * @property {Object} result
     * The decoded response object containing a boolean `success` property and other, action-specific properties.
     */

    /**
     * Creates new Action.
     * @param {Object} [config] Config object.
     */
    constructor: function(config) {
        if (config) {
            Ext.apply(this, config);
        }

        // Normalize the params option to an Object
        var params = config.params;
        if (Ext.isString(params)) {
            this.params = Ext.Object.fromQueryString(params);
        }
    },

    /**
     * @method
     * Invokes this action using the current configuration.
     */
    run: Ext.emptyFn,

    /**
     * @private
     * @method onSuccess
     * Callback method that gets invoked when the action completes successfully. Must be implemented by subclasses.
     * @param {Object} response
     */

    /**
     * @private
     * @method handleResponse
     * Handles the raw response and builds a result object from it. Must be implemented by subclasses.
     * @param {Object} response
     */

    /**
     * @private
     * Handles a failure response.
     * @param {Object} response
     */
    onFailure : function(response){
        this.response = response;
        this.failureType = Ext.form.action.Action.CONNECT_FAILURE;
        this.form.afterAction(this, false);
    },

    /**
     * @private
     * Validates that a response contains either responseText or responseXML and invokes
     * {@link #handleResponse} to build the result object.
     * @param {Object} response The raw response object.
     * @return {Object/Boolean} The result object as built by handleResponse, or `true` if
     * the response had empty responseText and responseXML.
     */
    processResponse : function(response){
        this.response = response;
        if (!response.responseText && !response.responseXML) {
            return true;
        }
        return (this.result = this.handleResponse(response));
    },

    /**
     * @private
     * Build the URL for the AJAX request. Used by the standard AJAX submit and load actions.
     * @return {String} The URL.
     */
    getUrl: function() {
        return this.url || this.form.url;
    },

    /**
     * @private
     * Determine the HTTP method to be used for the request.
     * @return {String} The HTTP method
     */
    getMethod: function() {
        return (this.method || this.form.method || 'POST').toUpperCase();
    },

    /**
     * @private
     * Get the set of parameters specified in the BasicForm's baseParams and/or the params option.
     * Items in params override items of the same name in baseParams.
     * @return {Object} the full set of parameters
     */
    getParams: function() {
        return Ext.apply({}, this.params, this.form.baseParams);
    },

    /**
     * @private
     * Creates a callback object.
     */
    createCallback: function() {
        var me = this,
            undef,
            form = me.form;
        return {
            success: me.onSuccess,
            failure: me.onFailure,
            scope: me,
            timeout: (this.timeout * 1000) || (form.timeout * 1000),
            upload: form.fileUpload ? me.onSuccess : undef
        };
    },

    statics: {
        /**
         * @property
         * Failure type returned when client side validation of the Form fails thus aborting a submit action. Client
         * side validation is performed unless {@link Ext.form.action.Submit#clientValidation} is explicitly set to
         * false.
         * @static
         */
        CLIENT_INVALID: 'client',

        /**
         * @property
         * Failure type returned when server side processing fails and the {@link #result}'s `success` property is set to
         * false.
         *
         * In the case of a form submission, field-specific error messages may be returned in the {@link #result}'s
         * errors property.
         * @static
         */
        SERVER_INVALID: 'server',

        /**
         * @property
         * Failure type returned when a communication error happens when attempting to send a request to the remote
         * server. The {@link #response} may be examined to provide further information.
         * @static
         */
        CONNECT_FAILURE: 'connect',

        /**
         * @property
         * Failure type returned when the response's `success` property is set to false, or no field values are returned
         * in the response's data property.
         * @static
         */
        LOAD_FAILURE: 'load'


    }
});

/**
 * A class which handles submission of data from {@link Ext.form.Basic Form}s and processes the returned response.
 *
 * Instances of this class are only created by a {@link Ext.form.Basic Form} when
 * {@link Ext.form.Basic#submit submit}ting.
 *
 * # Response Packet Criteria
 *
 * A response packet may contain:
 *
 *   - **`success`** property : Boolean - required.
 *
 *   - **`errors`** property : Object - optional, contains error messages for invalid fields.
 *
 * # JSON Packets
 *
 * By default, response packets are assumed to be JSON, so a typical response packet may look like this:
 *
 *     {
 *         success: false,
 *         errors: {
 *             clientCode: "Client not found",
 *             portOfLoading: "This field must not be null"
 *         }
 *     }
 *
 * Other data may be placed into the response for processing by the {@link Ext.form.Basic}'s callback or event handler
 * methods. The object decoded from this JSON is available in the {@link Ext.form.action.Action#result result} property.
 *
 * Alternatively, if an {@link Ext.form.Basic#errorReader errorReader} is specified as an
 * {@link Ext.data.reader.Xml XmlReader}:
 *
 *     errorReader: new Ext.data.reader.Xml({
 *             record : 'field',
 *             success: '@success'
 *         }, [
 *             'id', 'msg'
 *         ]
 *     )
 *
 * then the results may be sent back in XML format:
 *
 *     <?xml version="1.0" encoding="UTF-8"?>
 *     <message success="false">
 *     <errors>
 *         <field>
 *             <id>clientCode</id>
 *             <msg><![CDATA[Code not found. <br /><i>This is a test validation message from the server </i>]]></msg>
 *         </field>
 *         <field>
 *             <id>portOfLoading</id>
 *             <msg><![CDATA[Port not found. <br /><i>This is a test validation message from the server </i>]]></msg>
 *         </field>
 *     </errors>
 *     </message>
 *
 * Other elements may be placed into the response XML for processing by the {@link Ext.form.Basic}'s callback or event
 * handler methods. The XML document is available in the {@link Ext.form.Basic#errorReader errorReader}'s
 * {@link Ext.data.reader.Xml#xmlData xmlData} property.
 */
Ext.define('Ext.form.action.Submit', {
    extend:'Ext.form.action.Action',
    alternateClassName: 'Ext.form.Action.Submit',
    alias: 'formaction.submit',

    type: 'submit',

    /**
     * @cfg {Boolean} [clientValidation=true]
     * Determines whether a Form's fields are validated in a final call to {@link Ext.form.Basic#isValid isValid} prior
     * to submission. Pass false in the Form's submit options to prevent this.
     */

    // inherit docs
    run : function(){
        var form = this.form;
        if (this.clientValidation === false || form.isValid()) {
            this.doSubmit();
        } else {
            // client validation failed
            this.failureType = Ext.form.action.Action.CLIENT_INVALID;
            form.afterAction(this, false);
        }
    },

    /**
     * @private
     * Performs the submit of the form data.
     */
    doSubmit: function() {
        var formEl,
            ajaxOptions = Ext.apply(this.createCallback(), {
                url: this.getUrl(),
                method: this.getMethod(),
                headers: this.headers
            });

        // For uploads we need to create an actual form that contains the file upload fields,
        // and pass that to the ajax call so it can do its iframe-based submit method.
        if (this.form.hasUpload()) {
            formEl = ajaxOptions.form = this.buildForm();
            ajaxOptions.isUpload = true;
        } else {
            ajaxOptions.params = this.getParams();
        }

        Ext.Ajax.request(ajaxOptions);

        if (formEl) {
            Ext.removeNode(formEl);
        }
    },

    /**
     * @private
     * Builds the full set of parameters from the field values plus any additional configured params.
     */
    getParams: function() {
        var nope = false,
            configParams = this.callParent(),
            fieldParams = this.form.getValues(nope, nope, this.submitEmptyText !== nope);
        return Ext.apply({}, fieldParams, configParams);
    },

    /**
     * @private
     * Builds a form element containing fields corresponding to all the parameters to be
     * submitted (everything returned by {@link #getParams}.
     *
     * NOTE: the form element is automatically added to the DOM, so any code that uses
     * it must remove it from the DOM after finishing with it.
     *
     * @return {HTMLElement}
     */
    buildForm: function() {
        var fieldsSpec = [],
            formSpec,
            formEl,
            basicForm = this.form,
            params = this.getParams(),
            uploadFields = [],
            fields = basicForm.getFields().items,
            f,
            fLen   = fields.length,
            field, key, value, v, vLen,
            u, uLen;

        for (f = 0; f < fLen; f++) {
            field = fields[f];

            if (field.isFileUpload()) {
                uploadFields.push(field);
            }
        }

        function addField(name, val) {
            fieldsSpec.push({
                tag: 'input',
                type: 'hidden',
                name: name,
                value: Ext.String.htmlEncode(val)
            });
        }

        for (key in params) {
            if (params.hasOwnProperty(key)) {
                value = params[key];

                if (Ext.isArray(value)) {
                    vLen = value.length;
                    for (v = 0; v < vLen; v++) {
                        addField(key, value[v]);
                    }
                } else {
                    addField(key, value);
                }
            }
        }

        formSpec = {
            tag: 'form',
            action: this.getUrl(),
            method: this.getMethod(),
            target: this.target || '_self',
            style: 'display:none',
            cn: fieldsSpec
        };

        // Set the proper encoding for file uploads
        if (uploadFields.length) {
            formSpec.encoding = formSpec.enctype = 'multipart/form-data';
        }

        // Create the form
        formEl = Ext.DomHelper.append(Ext.getBody(), formSpec);

        // Special handling for file upload fields: since browser security measures prevent setting
        // their values programatically, and prevent carrying their selected values over when cloning,
        // we have to move the actual field instances out of their components and into the form.
        uLen = uploadFields.length;

        for (u = 0; u < uLen; u++) {
            field = uploadFields[u];
            if (field.rendered) { // can only have a selected file value after being rendered
                formEl.appendChild(field.extractFileInput());
            }
        }

        return formEl;
    },



    /**
     * @private
     */
    onSuccess: function(response) {
        var form = this.form,
            success = true,
            result = this.processResponse(response);
        if (result !== true && !result.success) {
            if (result.errors) {
                form.markInvalid(result.errors);
            }
            this.failureType = Ext.form.action.Action.SERVER_INVALID;
            success = false;
        }
        form.afterAction(this, success);
    },

    /**
     * @private
     */
    handleResponse: function(response) {
        var form = this.form,
            errorReader = form.errorReader,
            rs, errors, i, len, records;
        if (errorReader) {
            rs = errorReader.read(response);
            records = rs.records;
            errors = [];
            if (records) {
                for(i = 0, len = records.length; i < len; i++) {
                    errors[i] = records[i].data;
                }
            }
            if (errors.length < 1) {
                errors = null;
            }
            return {
                success : rs.success,
                errors : errors
            };
        }
        return Ext.decode(response.responseText);
    }
});

/**
 * @docauthor Jason Johnston <jason@sencha.com>
 *
 * This mixin provides a common interface for the logical behavior and state of form fields, including:
 *
 * - Getter and setter methods for field values
 * - Events and methods for tracking value and validity changes
 * - Methods for triggering validation
 *
 * **NOTE**: When implementing custom fields, it is most likely that you will want to extend the {@link Ext.form.field.Base}
 * component class rather than using this mixin directly, as BaseField contains additional logic for generating an
 * actual DOM complete with {@link Ext.form.Labelable label and error message} display and a form input field,
 * plus methods that bind the Field value getters and setters to the input field's value.
 *
 * If you do want to implement this mixin directly and don't want to extend {@link Ext.form.field.Base}, then
 * you will most likely want to override the following methods with custom implementations: {@link #getValue},
 * {@link #setValue}, and {@link #getErrors}. Other methods may be overridden as needed but their base
 * implementations should be sufficient for common cases. You will also need to make sure that {@link #initField}
 * is called during the component's initialization.
 */
Ext.define('Ext.form.field.Field', {
    /**
     * @property {Boolean} isFormField
     * Flag denoting that this component is a Field. Always true.
     */
    isFormField : true,

    /**
     * @cfg {Object} value
     * A value to initialize this field with.
     */

    /**
     * @cfg {String} name
     * The name of the field. By default this is used as the parameter name when including the
     * {@link #getSubmitData field value} in a {@link Ext.form.Basic#submit form submit()}. To prevent the field from
     * being included in the form submit, set {@link #submitValue} to false.
     */

    /**
     * @cfg {Boolean} disabled
     * True to disable the field. Disabled Fields will not be {@link Ext.form.Basic#submit submitted}.
     */
    disabled : false,

    /**
     * @cfg {Boolean} submitValue
     * Setting this to false will prevent the field from being {@link Ext.form.Basic#submit submitted} even when it is
     * not disabled.
     */
    submitValue: true,

    /**
     * @cfg {Boolean} validateOnChange
     * Specifies whether this field should be validated immediately whenever a change in its value is detected.
     * If the validation results in a change in the field's validity, a {@link #validitychange} event will be
     * fired. This allows the field to show feedback about the validity of its contents immediately as the user is
     * typing.
     *
     * When set to false, feedback will not be immediate. However the form will still be validated before submitting if
     * the clientValidation option to {@link Ext.form.Basic#doAction} is enabled, or if the field or form are validated
     * manually.
     *
     * See also {@link Ext.form.field.Base#checkChangeEvents} for controlling how changes to the field's value are
     * detected.
     */
    validateOnChange: true,

    /**
     * @private
     */
    suspendCheckChange: 0,

    /**
     * Initializes this Field mixin on the current instance. Components using this mixin should call this method during
     * their own initialization process.
     */
    initField: function() {
        this.addEvents(
            /**
             * @event change
             * Fires when the value of a field is changed via the {@link #setValue} method.
             * @param {Ext.form.field.Field} this
             * @param {Object} newValue The new value
             * @param {Object} oldValue The original value
             */
            'change',
            /**
             * @event validitychange
             * Fires when a change in the field's validity is detected.
             * @param {Ext.form.field.Field} this
             * @param {Boolean} isValid Whether or not the field is now valid
             */
            'validitychange',
            /**
             * @event dirtychange
             * Fires when a change in the field's {@link #isDirty} state is detected.
             * @param {Ext.form.field.Field} this
             * @param {Boolean} isDirty Whether or not the field is now dirty
             */
            'dirtychange'
        );

        this.initValue();
    },

    /**
     * Initializes the field's value based on the initial config.
     */
    initValue: function() {
        var me = this;

        me.value = me.transformOriginalValue(me.value);
        /**
         * @property {Object} originalValue
         * The original value of the field as configured in the {@link #value} configuration, or as loaded by the last
         * form load operation if the form's {@link Ext.form.Basic#trackResetOnLoad trackResetOnLoad} setting is `true`.
         */
        me.originalValue = me.lastValue = me.value;

        // Set the initial value - prevent validation on initial set
        me.suspendCheckChange++;
        me.setValue(me.value);
        me.suspendCheckChange--;
    },
    
    /**
     * Allows for any necessary modifications before the original
     * value is set
     * @protected
     * @param {Object} value The initial value
     * @return {Object} The modified initial value
     */
    transformOriginalValue: function(value){
        return value;
    },

    /**
     * Returns the {@link Ext.form.field.Field#name name} attribute of the field. This is used as the parameter name
     * when including the field value in a {@link Ext.form.Basic#submit form submit()}.
     * @return {String} name The field {@link Ext.form.field.Field#name name}
     */
    getName: function() {
        return this.name;
    },

    /**
     * Returns the current data value of the field. The type of value returned is particular to the type of the
     * particular field (e.g. a Date object for {@link Ext.form.field.Date}).
     * @return {Object} value The field value
     */
    getValue: function() {
        return this.value;
    },

    /**
     * Sets a data value into the field and runs the change detection and validation.
     * @param {Object} value The value to set
     * @return {Ext.form.field.Field} this
     */
    setValue: function(value) {
        var me = this;
        me.value = value;
        me.checkChange();
        return me;
    },

    /**
     * Returns whether two field {@link #getValue values} are logically equal. Field implementations may override this
     * to provide custom comparison logic appropriate for the particular field's data type.
     * @param {Object} value1 The first value to compare
     * @param {Object} value2 The second value to compare
     * @return {Boolean} True if the values are equal, false if inequal.
     */
    isEqual: function(value1, value2) {
        return String(value1) === String(value2);
    },

    /**
     * Returns whether two values are logically equal.
     * Similar to {@link #isEqual}, however null or undefined values will be treated as empty strings.
     * @private
     * @param {Object} value1 The first value to compare
     * @param {Object} value2 The second value to compare
     * @return {Boolean} True if the values are equal, false if inequal.
     */
    isEqualAsString: function(value1, value2){
        return String(Ext.value(value1, '')) === String(Ext.value(value2, ''));
    },

    /**
     * Returns the parameter(s) that would be included in a standard form submit for this field. Typically this will be
     * an object with a single name-value pair, the name being this field's {@link #getName name} and the value being
     * its current stringified value. More advanced field implementations may return more than one name-value pair.
     *
     * Note that the values returned from this method are not guaranteed to have been successfully {@link #validate
     * validated}.
     *
     * @return {Object} A mapping of submit parameter names to values; each value should be a string, or an array of
     * strings if that particular name has multiple values. It can also return null if there are no parameters to be
     * submitted.
     */
    getSubmitData: function() {
        var me = this,
            data = null;
        if (!me.disabled && me.submitValue && !me.isFileUpload()) {
            data = {};
            data[me.getName()] = '' + me.getValue();
        }
        return data;
    },

    /**
     * Returns the value(s) that should be saved to the {@link Ext.data.Model} instance for this field, when {@link
     * Ext.form.Basic#updateRecord} is called. Typically this will be an object with a single name-value pair, the name
     * being this field's {@link #getName name} and the value being its current data value. More advanced field
     * implementations may return more than one name-value pair. The returned values will be saved to the corresponding
     * field names in the Model.
     *
     * Note that the values returned from this method are not guaranteed to have been successfully {@link #validate
     * validated}.
     *
     * @return {Object} A mapping of submit parameter names to values; each value should be a string, or an array of
     * strings if that particular name has multiple values. It can also return null if there are no parameters to be
     * submitted.
     */
    getModelData: function() {
        var me = this,
            data = null;
        if (!me.disabled && !me.isFileUpload()) {
            data = {};
            data[me.getName()] = me.getValue();
        }
        return data;
    },

    /**
     * Resets the current field value to the originally loaded value and clears any validation messages. See {@link
     * Ext.form.Basic}.{@link Ext.form.Basic#trackResetOnLoad trackResetOnLoad}
     */
    reset : function(){
        var me = this;

        me.beforeReset();
        me.setValue(me.originalValue);
        me.clearInvalid();
        // delete here so we reset back to the original state
        delete me.wasValid;
    },
    
    /**
     * Template method before a field is reset.
     * @protected
     */
    beforeReset: Ext.emptyFn,

    /**
     * Resets the field's {@link #originalValue} property so it matches the current {@link #getValue value}. This is
     * called by {@link Ext.form.Basic}.{@link Ext.form.Basic#setValues setValues} if the form's
     * {@link Ext.form.Basic#trackResetOnLoad trackResetOnLoad} property is set to true.
     */
    resetOriginalValue: function() {
        this.originalValue = this.getValue();
        this.checkDirty();
    },

    /**
     * Checks whether the value of the field has changed since the last time it was checked.
     * If the value has changed, it:
     *
     * 1. Fires the {@link #change change event},
     * 2. Performs validation if the {@link #validateOnChange} config is enabled, firing the
     *    {@link #validitychange validitychange event} if the validity has changed, and
     * 3. Checks the {@link #isDirty dirty state} of the field and fires the {@link #dirtychange dirtychange event}
     *    if it has changed.
     */
    checkChange: function() {
        if (!this.suspendCheckChange) {
            var me = this,
                newVal = me.getValue(),
                oldVal = me.lastValue;
            if (!me.isEqual(newVal, oldVal) && !me.isDestroyed) {
                me.lastValue = newVal;
                me.fireEvent('change', me, newVal, oldVal);
                me.onChange(newVal, oldVal);
            }
        }
    },

    /**
     * @private
     * Called when the field's value changes. Performs validation if the {@link #validateOnChange}
     * config is enabled, and invokes the dirty check.
     */
    onChange: function(newVal, oldVal) {
        if (this.validateOnChange) {
            this.validate();
        }
        this.checkDirty();
    },

    /**
     * Returns true if the value of this Field has been changed from its {@link #originalValue}.
     * Will always return false if the field is disabled.
     *
     * Note that if the owning {@link Ext.form.Basic form} was configured with
     * {@link Ext.form.Basic#trackResetOnLoad trackResetOnLoad} then the {@link #originalValue} is updated when
     * the values are loaded by {@link Ext.form.Basic}.{@link Ext.form.Basic#setValues setValues}.
     * @return {Boolean} True if this field has been changed from its original value (and is not disabled),
     * false otherwise.
     */
    isDirty : function() {
        var me = this;
        return !me.disabled && !me.isEqual(me.getValue(), me.originalValue);
    },

    /**
     * Checks the {@link #isDirty} state of the field and if it has changed since the last time it was checked,
     * fires the {@link #dirtychange} event.
     */
    checkDirty: function() {
        var me = this,
            isDirty = me.isDirty();
        if (isDirty !== me.wasDirty) {
            me.fireEvent('dirtychange', me, isDirty);
            me.onDirtyChange(isDirty);
            me.wasDirty = isDirty;
        }
    },

    /**
     * @private Called when the field's dirty state changes.
     * @param {Boolean} isDirty
     */
    onDirtyChange: Ext.emptyFn,

    /**
     * Runs this field's validators and returns an array of error messages for any validation failures. This is called
     * internally during validation and would not usually need to be used manually.
     *
     * Each subclass should override or augment the return value to provide their own errors.
     *
     * @param {Object} value The value to get errors for (defaults to the current field value)
     * @return {String[]} All error messages for this field; an empty Array if none.
     */
    getErrors: function(value) {
        return [];
    },

    /**
     * Returns whether or not the field value is currently valid by {@link #getErrors validating} the field's current
     * value. The {@link #validitychange} event will not be fired; use {@link #validate} instead if you want the event
     * to fire. **Note**: {@link #disabled} fields are always treated as valid.
     *
     * Implementations are encouraged to ensure that this method does not have side-effects such as triggering error
     * message display.
     *
     * @return {Boolean} True if the value is valid, else false
     */
    isValid : function() {
        var me = this;
        return me.disabled || Ext.isEmpty(me.getErrors());
    },

    /**
     * Returns whether or not the field value is currently valid by {@link #getErrors validating} the field's current
     * value, and fires the {@link #validitychange} event if the field's validity has changed since the last validation.
     * **Note**: {@link #disabled} fields are always treated as valid.
     *
     * Custom implementations of this method are allowed to have side-effects such as triggering error message display.
     * To validate without side-effects, use {@link #isValid}.
     *
     * @return {Boolean} True if the value is valid, else false
     */
    validate : function() {
        var me = this,
            isValid = me.isValid();
        if (isValid !== me.wasValid) {
            me.wasValid = isValid;
            me.fireEvent('validitychange', me, isValid);
        }
        return isValid;
    },

    /**
     * A utility for grouping a set of modifications which may trigger value changes into a single transaction, to
     * prevent excessive firing of {@link #change} events. This is useful for instance if the field has sub-fields which
     * are being updated as a group; you don't want the container field to check its own changed state for each subfield
     * change.
     * @param {Object} fn A function containing the transaction code
     */
    batchChanges: function(fn) {
        try {
            this.suspendCheckChange++;
            fn();
        } catch(e){
            throw e;
        } finally {
            this.suspendCheckChange--;
        }
        this.checkChange();
    },

    /**
     * Returns whether this Field is a file upload field; if it returns true, forms will use special techniques for
     * {@link Ext.form.Basic#submit submitting the form} via AJAX. See {@link Ext.form.Basic#hasUpload} for details. If
     * this returns true, the {@link #extractFileInput} method must also be implemented to return the corresponding file
     * input element.
     * @return {Boolean}
     */
    isFileUpload: function() {
        return false;
    },

    /**
     * Only relevant if the instance's {@link #isFileUpload} method returns true. Returns a reference to the file input
     * DOM element holding the user's selected file. The input will be appended into the submission form and will not be
     * returned, so this method should also create a replacement.
     * @return {HTMLElement}
     */
    extractFileInput: function() {
        return null;
    },

    /**
     * @method markInvalid
     * Associate one or more error messages with this field. Components using this mixin should implement this method to
     * update the component's rendering to display the messages.
     *
     * **Note**: this method does not cause the Field's {@link #validate} or {@link #isValid} methods to return `false`
     * if the value does _pass_ validation. So simply marking a Field as invalid will not prevent submission of forms
     * submitted with the {@link Ext.form.action.Submit#clientValidation} option set.
     *
     * @param {String/String[]} errors The error message(s) for the field.
     */
    markInvalid: Ext.emptyFn,

    /**
     * @method clearInvalid
     * Clear any invalid styles/messages for this field. Components using this mixin should implement this method to
     * update the components rendering to clear any existing messages.
     *
     * **Note**: this method does not cause the Field's {@link #validate} or {@link #isValid} methods to return `true`
     * if the value does not _pass_ validation. So simply clearing a field's errors will not necessarily allow
     * submission of forms submitted with the {@link Ext.form.action.Submit#clientValidation} option set.
     */
    clearInvalid: Ext.emptyFn

});

/**
 * @singleton
 * @alternateClassName Ext.form.VTypes
 *
 * This is a singleton object which contains a set of commonly used field validation functions
 * and provides a mechanism for creating reusable custom field validations.
 * The following field validation functions are provided out of the box:
 *
 * - {@link #alpha}
 * - {@link #alphanum}
 * - {@link #email}
 * - {@link #url}
 *
 * VTypes can be applied to a {@link Ext.form.field.Text Text Field} using the `{@link Ext.form.field.Text#vtype vtype}` configuration:
 *
 *     Ext.create('Ext.form.field.Text', {
 *         fieldLabel: 'Email Address',
 *         name: 'email',
 *         vtype: 'email' // applies email validation rules to this field
 *     });
 *
 * To create custom VTypes:
 *
 *     // custom Vtype for vtype:'time'
 *     var timeTest = /^([1-9]|1[0-9]):([0-5][0-9])(\s[a|p]m)$/i;
 *     Ext.apply(Ext.form.field.VTypes, {
 *         //  vtype validation function
 *         time: function(val, field) {
 *             return timeTest.test(val);
 *         },
 *         // vtype Text property: The error text to display when the validation function returns false
 *         timeText: 'Not a valid time.  Must be in the format "12:34 PM".',
 *         // vtype Mask property: The keystroke filter mask
 *         timeMask: /[\d\s:amp]/i
 *     });
 *
 * In the above example the `time` function is the validator that will run when field validation occurs,
 * `timeText` is the error message, and `timeMask` limits what characters can be typed into the field.
 * Note that the `Text` and `Mask` functions must begin with the same name as the validator function.
 *
 * Using a custom validator is the same as using one of the build-in validators - just use the name of the validator function
 * as the `{@link Ext.form.field.Text#vtype vtype}` configuration on a {@link Ext.form.field.Text Text Field}:
 *
 *     Ext.create('Ext.form.field.Text', {
 *         fieldLabel: 'Departure Time',
 *         name: 'departureTime',
 *         vtype: 'time' // applies custom time validation rules to this field
 *     });
 *
 * Another example of a custom validator:
 *
 *     // custom Vtype for vtype:'IPAddress'
 *     Ext.apply(Ext.form.field.VTypes, {
 *         IPAddress:  function(v) {
 *             return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(v);
 *         },
 *         IPAddressText: 'Must be a numeric IP address',
 *         IPAddressMask: /[\d\.]/i
 *     });
 *
 * It's important to note that using {@link Ext#apply Ext.apply()} means that the custom validator function
 * as well as `Text` and `Mask` fields are added as properties of the `Ext.form.field.VTypes` singleton.
 */
Ext.define('Ext.form.field.VTypes', (function(){
    // closure these in so they are only created once.
    var alpha = /^[a-zA-Z_]+$/,
        alphanum = /^[a-zA-Z0-9_]+$/,
        email = /^(\w+)([\-+.][\w]+)*@(\w[\-\w]*\.){1,5}([A-Za-z]){2,6}$/,
        url = /(((^https?)|(^ftp)):\/\/([\-\w]+\.)+\w{2,3}(\/[%\-\w]+(\.\w{2,})?)*(([\w\-\.\?\\\/+@&#;`~=%!]*)(\.\w{2,})?)*\/?)/i;

    // All these messages and functions are configurable
    return {
        singleton: true,
        alternateClassName: 'Ext.form.VTypes',

        /**
         * The function used to validate email addresses. Note that this is a very basic validation - complete
         * validation per the email RFC specifications is very complex and beyond the scope of this class, although this
         * function can be overridden if a more comprehensive validation scheme is desired. See the validation section
         * of the [Wikipedia article on email addresses][1] for additional information. This implementation is intended
         * to validate the following emails:
         *
         * - `barney@example.de`
         * - `barney.rubble@example.com`
         * - `barney-rubble@example.coop`
         * - `barney+rubble@example.com`
         *
         * [1]: http://en.wikipedia.org/wiki/E-mail_address
         *
         * @param {String} value The email address
         * @return {Boolean} true if the RegExp test passed, and false if not.
         */
        'email' : function(v){
            return email.test(v);
        },
        //<locale>
        /**
         * @property {String} emailText
         * The error text to display when the email validation function returns false.
         * Defaults to: 'This field should be an e-mail address in the format "user@example.com"'
         */
        'emailText' : 'This field should be an e-mail address in the format "user@example.com"',
        //</locale>
        /**
         * @property {RegExp} emailMask
         * The keystroke filter mask to be applied on email input. See the {@link #email} method for information about
         * more complex email validation. Defaults to: /[a-z0-9_\.\-@]/i
         */
        'emailMask' : /[a-z0-9_\.\-@\+]/i,

        /**
         * The function used to validate URLs
         * @param {String} value The URL
         * @return {Boolean} true if the RegExp test passed, and false if not.
         */
        'url' : function(v){
            return url.test(v);
        },
        //<locale>
        /**
         * @property {String} urlText
         * The error text to display when the url validation function returns false.
         * Defaults to: 'This field should be a URL in the format "http:/'+'/www.example.com"'
         */
        'urlText' : 'This field should be a URL in the format "http:/'+'/www.example.com"',
        //</locale>

        /**
         * The function used to validate alpha values
         * @param {String} value The value
         * @return {Boolean} true if the RegExp test passed, and false if not.
         */
        'alpha' : function(v){
            return alpha.test(v);
        },
        //<locale>
        /**
         * @property {String} alphaText
         * The error text to display when the alpha validation function returns false.
         * Defaults to: 'This field should only contain letters and _'
         */
        'alphaText' : 'This field should only contain letters and _',
        //</locale>
        /**
         * @property {RegExp} alphaMask
         * The keystroke filter mask to be applied on alpha input. Defaults to: /[a-z_]/i
         */
        'alphaMask' : /[a-z_]/i,

        /**
         * The function used to validate alphanumeric values
         * @param {String} value The value
         * @return {Boolean} true if the RegExp test passed, and false if not.
         */
        'alphanum' : function(v){
            return alphanum.test(v);
        },
        //<locale>
        /**
         * @property {String} alphanumText
         * The error text to display when the alphanumeric validation function returns false.
         * Defaults to: 'This field should only contain letters, numbers and _'
         */
        'alphanumText' : 'This field should only contain letters, numbers and _',
        //</locale>
        /**
         * @property {RegExp} alphanumMask
         * The keystroke filter mask to be applied on alphanumeric input. Defaults to: /[a-z0-9_]/i
         */
        'alphanumMask' : /[a-z0-9_]/i
    };
}()));





/**
 * @private
 * Private utility class for managing all {@link Ext.form.field.Checkbox} fields grouped by name.
 */
Ext.define('Ext.form.CheckboxManager', {
    extend: 'Ext.util.MixedCollection',
    singleton: true,

    getByName: function(name) {
        return this.filterBy(function(item) {
            return item.name == name;
        });
    },

    getWithValue: function(name, value) {
        return this.filterBy(function(item) {
            return item.name == name && item.inputValue == value;
        });
    },

    getChecked: function(name) {
        return this.filterBy(function(item) {
            return item.name == name && item.checked;
        });
    }
});

/**
 * @docauthor Jason Johnston <jason@sencha.com>
 *
 * Produces a standalone `<label />` element which can be inserted into a form and be associated with a field
 * in that form using the {@link #forId} property.
 * 
 * **NOTE:** in most cases it will be more appropriate to use the {@link Ext.form.Labelable#fieldLabel fieldLabel}
 * and associated config properties ({@link Ext.form.Labelable#labelAlign}, {@link Ext.form.Labelable#labelWidth},
 * etc.) in field components themselves, as that allows labels to be uniformly sized throughout the form.
 * Ext.form.Label should only be used when your layout can not be achieved with the standard
 * {@link Ext.form.Labelable field layout}.
 * 
 * You will likely be associating the label with a field component that extends {@link Ext.form.field.Base}, so
 * you should make sure the {@link #forId} is set to the same value as the {@link Ext.form.field.Base#inputId inputId}
 * of that field.
 * 
 * The label's text can be set using either the {@link #text} or {@link #html} configuration properties; the
 * difference between the two is that the former will automatically escape HTML characters when rendering, while
 * the latter will not.
 *
 * # Example
 * 
 * This example creates a Label after its associated Text field, an arrangement that cannot currently
 * be achieved using the standard Field layout's labelAlign.
 * 
 *     @example
 *     Ext.create('Ext.form.Panel', {
 *         title: 'Field with Label',
 *         width: 400,
 *         bodyPadding: 10,
 *         renderTo: Ext.getBody(),
 *         layout: {
 *             type: 'hbox',
 *             align: 'middle'
 *         },
 *         items: [{
 *             xtype: 'textfield',
 *             hideLabel: true,
 *             flex: 1
 *         }, {
 *             xtype: 'label',
 *             forId: 'myFieldId',
 *             text: 'My Awesome Field',
 *             margin: '0 0 0 10'
 *         }]
 *     });
 */
Ext.define('Ext.form.Label', {
    extend:'Ext.Component',
    alias: 'widget.label',
    requires: ['Ext.util.Format'],

    autoEl: 'label',

    /**
     * @cfg {String} [text='']
     * The plain text to display within the label. If you need to include HTML
     * tags within the label's innerHTML, use the {@link #html} config instead.
     */
    /**
     * @cfg {String} forId
     * The id of the input element to which this label will be bound via the standard HTML 'for'
     * attribute. If not specified, the attribute will not be added to the label. In most cases you will be
     * associating the label with a {@link Ext.form.field.Base} component, so you should make sure this matches
     * the {@link Ext.form.field.Base#inputId inputId} of that field.
     */
    /**
     * @cfg {String} [html='']
     * An HTML fragment that will be used as the label's innerHTML.
     * Note that if {@link #text} is specified it will take precedence and this value will be ignored.
     */
    
    maskOnDisable: false,

    getElConfig: function(){
        var me = this;

        me.html = me.text ? Ext.util.Format.htmlEncode(me.text) : (me.html || '');
        return Ext.apply(me.callParent(), {
            htmlFor: me.forId || ''
        });
    },

    /**
     * Updates the label's innerHTML with the specified string.
     * @param {String} text The new label text
     * @param {Boolean} [encode=true] False to skip HTML-encoding the text when rendering it
     * to the label. This might be useful if you want to include tags in the label's innerHTML rather
     * than rendering them as string literals per the default logic.
     * @return {Ext.form.Label} this
     */
    setText : function(text, encode){
        var me = this;
        
        encode = encode !== false;
        if(encode) {
            me.text = text;
            delete me.html;
        } else {
            me.html = text;
            delete me.text;
        }
        
        if(me.rendered){
            me.el.dom.innerHTML = encode !== false ? Ext.util.Format.htmlEncode(text) : text;
            me.updateLayout();
        }
        return me;
    }
});


/**
 * A mixin which allows a component to be configured and decorated with a label and/or error message as is
 * common for form fields. This is used by e.g. Ext.form.field.Base and Ext.form.FieldContainer
 * to let them be managed by the Field layout.
 *
 * NOTE: This mixin is mainly for internal library use and most users should not need to use it directly. It
 * is more likely you will want to use one of the component classes that import this mixin, such as
 * Ext.form.field.Base or Ext.form.FieldContainer.
 *
 * Use of this mixin does not make a component a field in the logical sense, meaning it does not provide any
 * logic or state related to values or validation; that is handled by the related Ext.form.field.Field
 * mixin. These two mixins may be used separately (for example Ext.form.FieldContainer is Labelable but not a
 * Field), or in combination (for example Ext.form.field.Base implements both and has logic for connecting the
 * two.)
 *
 * Component classes which use this mixin should use the Field layout
 * or a derivation thereof to properly size and position the label and message according to the component config.
 * They must also call the {@link #initLabelable} method during component initialization to ensure the mixin gets
 * set up correctly.
 *
 * @docauthor Jason Johnston <jason@sencha.com>
 */
Ext.define("Ext.form.Labelable", {
    requires: ['Ext.XTemplate'],

    autoEl: {
        tag: 'table',
        cellpadding: 0
    },

    childEls: [
        /**
         * @property {Ext.Element} labelCell
         * The `<TD>` Element which contains the label Element for this component. Only available after the component has been rendered.
         */
        'labelCell',

        /**
         * @property {Ext.Element} labelEl
         * The label Element for this component. Only available after the component has been rendered.
         */
        'labelEl',

        /**
         * @property {Ext.Element} bodyEl
         * The div Element wrapping the component's contents. Only available after the component has been rendered.
         */
        'bodyEl',

        // private - the TD which contains the msgTarget: 'side' error icon
        'sideErrorCell',

        /**
         * @property {Ext.Element} errorEl
         * The div Element that will contain the component's error message(s). Note that depending on the configured
         * {@link #msgTarget}, this element may be hidden in favor of some other form of presentation, but will always
         * be present in the DOM for use by assistive technologies.
         */
        'errorEl',

        'inputRow',

        'bottomPlaceHolder'
    ],

    /**
     * @cfg {String/String[]/Ext.XTemplate} labelableRenderTpl
     * The rendering template for the field decorations. Component classes using this mixin
     * should include logic to use this as their {@link Ext.AbstractComponent#renderTpl renderTpl},
     * and implement the {@link #getSubTplMarkup} method to generate the field body content.
     *
     * The structure of a field is a table as follows:
     * 
     * If `labelAlign: 'left', `msgTarget: 'side'`
     * 
     *      +----------------------+----------------------+-------------+
     *      | Label:               | InputField           | sideErrorEl |
     *      +----------------------+----------------------+-------------+
     *
     * If `labelAlign: 'left', `msgTarget: 'under'`
     * 
     *      +----------------------+------------------------------------+
     *      | Label:               | InputField      (colspan=2)        |
     *      |                      | underErrorEl                       |
     *      +----------------------+------------------------------------+
     *
     * If `labelAlign: 'top', `msgTarget: 'side'`
     *
     *      +---------------------------------------------+-------------+
     *      | label                                       |             |
     *      | InputField                                  | sideErrorEl |
     *      +---------------------------------------------+-------------+
     *
     * If `labelAlign: 'top', `msgTarget: 'under'`
     * 
     *      +-----------------------------------------------------------+
     *      | label                                                     |
     *      | InputField                      (colspan=2)               |
     *      | underErrorEl                                              |
     *      +-----------------------------------------------------------+
     *
     * The total columns always the same for fields with each setting of {@link #labelAlign} because when
     * rendered into a {@link Ext.layout.container.Form} layout, just the `TR` of the table
     * will be placed into the form's main `TABLE`, and the columns of all the siblings
     * must match so that they all line up. In a {@link Ext.layout.container.Form} layout, different
     * settings of {@link #labelAlign} are not supported because of the incompatible column structure.
     *
     * When the triggerCell or side error cell are hidden or shown, the input cell's colspan
     * is recalculated to maintain the correct 3 visible column count.
     * @private
     */
    labelableRenderTpl: [

        // body row. If a heighted Field (eg TextArea, HtmlEditor, this must greedily consume height.
        '<tr id="{id}-inputRow" <tpl if="inFormLayout">id="{id}"</tpl>>',

            // Label cell
            '<tpl if="labelOnLeft">',
                '<td id="{id}-labelCell" style="{labelCellStyle}" {labelCellAttrs}>',
                    '{beforeLabelTpl}',
                    '<label id="{id}-labelEl" {labelAttrTpl}<tpl if="inputId"> for="{inputId}"</tpl> class="{labelCls}"',
                        '<tpl if="labelStyle"> style="{labelStyle}"</tpl>>',
                        '{beforeLabelTextTpl}',
                        '<tpl if="fieldLabel">{fieldLabel}{labelSeparator}</tpl>',
                        '{afterLabelTextTpl}',
                    '</label>',
                    '{afterLabelTpl}',
                '</td>',
            '</tpl>',

            // Body of the input. That will be an input element, or, from a TriggerField, a table containing an input cell and trigger cell(s)
            '<td class="{baseBodyCls} {fieldBodyCls}" id="{id}-bodyEl" colspan="{bodyColspan}" role="presentation">',
                '{beforeBodyEl}',

                // Label just sits on top of the input field if labelAlign === 'top'
                '<tpl if="labelAlign==\'top\'">',
                    '{beforeLabelTpl}',
                    '<div id="{id}-labelCell" style="{labelCellStyle}">',
                        '<label id="{id}-labelEl" {labelAttrTpl}<tpl if="inputId"> for="{inputId}"</tpl> class="{labelCls}"',
                            '<tpl if="labelStyle"> style="{labelStyle}"</tpl>>',
                            '{beforeLabelTextTpl}',
                            '<tpl if="fieldLabel">{fieldLabel}{labelSeparator}</tpl>',
                            '{afterLabelTextTpl}',
                        '</label>',
                    '</div>',
                    '{afterLabelTpl}',
                '</tpl>',

                '{beforeSubTpl}',
                '{[values.$comp.getSubTplMarkup()]}',
                '{afterSubTpl}',

            // Final TD. It's a side error element unless there's a floating external one
            '<tpl if="msgTarget===\'side\'">',
                '{afterBodyEl}',
                '</td>',
                '<td id="{id}-sideErrorCell" vAlign="{[values.labelAlign===\'top\' && !values.hideLabel ? \'bottom\' : \'middle\']}" style="{[values.autoFitErrors ? \'display:none\' : \'\']}" width="{errorIconWidth}">',
                    '<div id="{id}-errorEl" class="{errorMsgCls}" style="display:none;width:{errorIconWidth}px"></div>',
                '</td>',
            '<tpl elseif="msgTarget==\'under\'">',
                '<div id="{id}-errorEl" class="{errorMsgClass}" colspan="2" style="display:none"></div>',
                '{afterBodyEl}',
                '</td>',
            '</tpl>',

        '</tr>',
        {
            disableFormats: true
        }
    ],

    /**
     * @cfg {String/String[]/Ext.XTemplate} activeErrorsTpl
     * The template used to format the Array of error messages passed to {@link #setActiveErrors} into a single HTML
     * string. By default this renders each message as an item in an unordered list.
     */
    activeErrorsTpl: [
        '<tpl if="errors && errors.length">',
            '<ul><tpl for="errors"><li>{.}</li></tpl></ul>',
        '</tpl>'
    ],

    /**
     * @property {Boolean} isFieldLabelable
     * Flag denoting that this object is labelable as a field. Always true.
     */
    isFieldLabelable: true,

    /**
     * @cfg {String} formItemCls
     * A CSS class to be applied to the outermost element to denote that it is participating in the form field layout.
     */
    formItemCls: Ext.baseCSSPrefix + 'form-item',

    /**
     * @cfg {String} labelCls
     * The CSS class to be applied to the label element. This (single) CSS class is used to formulate the renderSelector
     * and drives the field layout where it is concatenated with a hyphen ('-') and {@link #labelAlign}. To add
     * additional classes, use {@link #labelClsExtra}.
     */
    labelCls: Ext.baseCSSPrefix + 'form-item-label',

    /**
     * @cfg {String} labelClsExtra
     * An optional string of one or more additional CSS classes to add to the label element. Defaults to empty.
     */

    /**
     * @cfg {String} errorMsgCls
     * The CSS class to be applied to the error message element.
     */
    errorMsgCls: Ext.baseCSSPrefix + 'form-error-msg',

    /**
     * @cfg {String} baseBodyCls
     * The CSS class to be applied to the body content element.
     */
    baseBodyCls: Ext.baseCSSPrefix + 'form-item-body',

    /**
     * @cfg {String} fieldBodyCls
     * An extra CSS class to be applied to the body content element in addition to {@link #baseBodyCls}.
     */
    fieldBodyCls: '',

    /**
     * @cfg {String} clearCls
     * The CSS class to be applied to the special clearing div rendered directly after the field contents wrapper to
     * provide field clearing.
     */
    clearCls: Ext.baseCSSPrefix + 'clear',

    /**
     * @cfg {String} invalidCls
     * The CSS class to use when marking the component invalid.
     */
    invalidCls : Ext.baseCSSPrefix + 'form-invalid',

    /**
     * @cfg {String} fieldLabel
     * The label for the field. It gets appended with the {@link #labelSeparator}, and its position and sizing is
     * determined by the {@link #labelAlign}, {@link #labelWidth}, and {@link #labelPad} configs.
     */
    fieldLabel: undefined,

    /**
     * @cfg {String} labelAlign
     * Controls the position and alignment of the {@link #fieldLabel}. Valid values are:
     *
     *   - "left" (the default) - The label is positioned to the left of the field, with its text aligned to the left.
     *     Its width is determined by the {@link #labelWidth} config.
     *   - "top" - The label is positioned above the field.
     *   - "right" - The label is positioned to the left of the field, with its text aligned to the right.
     *     Its width is determined by the {@link #labelWidth} config.
     */
    labelAlign : 'left',

    /**
     * @cfg {Number} labelWidth
     * The width of the {@link #fieldLabel} in pixels. Only applicable if the {@link #labelAlign} is set to "left" or
     * "right".
     */
    labelWidth: 100,

    /**
     * @cfg {Number} labelPad
     * The amount of space in pixels between the {@link #fieldLabel} and the input field.
     */
    labelPad : 5,

    //<locale>
    /**
     * @cfg {String} labelSeparator
     * Character(s) to be inserted at the end of the {@link #fieldLabel label text}.
     *
     * Set to empty string to hide the separator completely.
     */
    labelSeparator : ':',
    //</locale>

    /**
     * @cfg {String} labelStyle
     * A CSS style specification string to apply directly to this field's label.
     */

    /**
     * @cfg {Boolean} hideLabel
     * Set to true to completely hide the label element ({@link #fieldLabel} and {@link #labelSeparator}). Also see
     * {@link #hideEmptyLabel}, which controls whether space will be reserved for an empty fieldLabel.
     */
    hideLabel: false,

    /**
     * @cfg {Boolean} hideEmptyLabel
     * When set to true, the label element ({@link #fieldLabel} and {@link #labelSeparator}) will be automatically
     * hidden if the {@link #fieldLabel} is empty. Setting this to false will cause the empty label element to be
     * rendered and space to be reserved for it; this is useful if you want a field without a label to line up with
     * other labeled fields in the same form.
     *
     * If you wish to unconditionall hide the label even if a non-empty fieldLabel is configured, then set the
     * {@link #hideLabel} config to true.
     */
    hideEmptyLabel: true,

    /**
     * @cfg {Boolean} preventMark
     * true to disable displaying any {@link #setActiveError error message} set on this object.
     */
    preventMark: false,

    /**
     * @cfg {Boolean} autoFitErrors
     * Whether to adjust the component's body area to make room for 'side' or 'under' {@link #msgTarget error messages}.
     */
    autoFitErrors: true,

    /**
     * @cfg {String} msgTarget
     * The location where the error message text should display. Must be one of the following values:
     *
     *   - `qtip` Display a quick tip containing the message when the user hovers over the field.
     *     This is the default.
     *
     *     **{@link Ext.tip.QuickTipManager#init} must have been called for this setting to work.**
     *
     *   - `title` Display the message in a default browser title attribute popup.
     *   - `under` Add a block div beneath the field containing the error message.
     *   - `side` Add an error icon to the right of the field, displaying the message in a popup on hover.
     *   - `none` Don't display any error message. This might be useful if you are implementing custom error display.
     *   - `[element id]` Add the error message directly to the innerHTML of the specified element.
     */
    msgTarget: 'qtip',

    /**
     * @cfg {String} activeError
     * If specified, then the component will be displayed with this value as its active error when first rendered. Use
     * {@link #setActiveError} or {@link #unsetActiveError} to change it after component creation.
     */

    /**
     * @private
     * Tells the layout system that the height can be measured immediately because the width does not need setting.
     */
    noWrap: true,

    labelableInsertions: [

        /**
         * @cfg {String/Array/Ext.XTemplate} beforeBodyEl
         * An optional string or `XTemplate` configuration to insert in the field markup
         * at the beginning of the input containing element. If an `XTemplate` is used, the component's {@link Ext.AbstractComponent#renderData render data}
         * serves as the context.
         */
        'beforeBodyEl',

        /**
         * @cfg {String/Array/Ext.XTemplate} afterBodyEl
         * An optional string or `XTemplate` configuration to insert in the field markup
         * at the end of the input containing element. If an `XTemplate` is used, the component's {@link Ext.AbstractComponent#renderData render data}
         * serves as the context.
         */
        'afterBodyEl',

        /**
         * @cfg {String/Array/Ext.XTemplate} beforeLabelTpl
         * An optional string or `XTemplate` configuration to insert in the field markup
         * before the label element. If an `XTemplate` is used, the component's {@link Ext.AbstractComponent#renderData render data}
         * serves as the context.
         */
        'beforeLabelTpl',

        /**
         * @cfg {String/Array/Ext.XTemplate} afterLabelTpl
         * An optional string or `XTemplate` configuration to insert in the field markup
         * after the label element. If an `XTemplate` is used, the component's {@link Ext.AbstractComponent#renderData render data}
         * serves as the context.
         */
        'afterLabelTpl',

        /**
         * @cfg {String/Array/Ext.XTemplate} beforeSubTpl
         * An optional string or `XTemplate` configuration to insert in the field markup
         * before the {@link #getSubTplMarkup subTpl markup}. If an `XTemplate` is used, the
         * component's {@link Ext.AbstractComponent#renderData render data} serves as the context.
         */
        'beforeSubTpl',

        /**
         * @cfg {String/Array/Ext.XTemplate} afterSubTpl
         * An optional string or `XTemplate` configuration to insert in the field markup
         * after the {@link #getSubTplMarkup subTpl markup}. If an `XTemplate` is used, the
         * component's {@link Ext.AbstractComponent#renderData render data} serves as the context.
         */
        'afterSubTpl',

        /**
         * @cfg {String/Array/Ext.XTemplate} beforeLabelTextTpl
         * An optional string or `XTemplate` configuration to insert in the field markup
         * before the label text. If an `XTemplate` is used, the component's {@link Ext.AbstractComponent#renderData render data}
         * serves as the context.
         */
        'beforeLabelTextTpl',

        /**
         * @cfg {String/Array/Ext.XTemplate} afterLabelTextTpl
         * An optional string or `XTemplate` configuration to insert in the field markup
         * after the label text. If an `XTemplate` is used, the component's {@link Ext.AbstractComponent#renderData render data}
         * serves as the context.
         */
        'afterLabelTextTpl',

        /**
         * @cfg {String/Array/Ext.XTemplate} labelAttrTpl
         * An optional string or `XTemplate` configuration to insert in the field markup
         * inside the label element (as attributes). If an `XTemplate` is used, the component's
         * {@link Ext.AbstractComponent#renderData render data} serves as the context.
         */
        'labelAttrTpl'
    ],

    // This is an array to avoid a split on every call to Ext.copyTo
    labelableRenderProps: [ 'allowBlank', 'id', 'labelAlign', 'fieldBodyCls', 'baseBodyCls',
                            'clearCls', 'labelSeparator', 'msgTarget' ],

    /**
     * Performs initialization of this mixin. Component classes using this mixin should call this method during their
     * own initialization.
     */
    initLabelable: function() {
        var me = this,
            padding = me.padding;

        // This Component is rendered as a table. Padding doesn't work on tables
        // Before padding can be applied to the encapsulating table element, copy the padding into
        // an extraMargins property which is to be added to all computed margins post render :(
        if (padding) {
            me.padding = undefined;
            me.extraMargins = Ext.Element.parseBox(padding);
        }

        me.addCls(me.formItemCls);
        
        // Prevent first render of active error, at Field render time from signalling a change from undefined to "
        me.lastActiveError = '';

        me.addEvents(
            /**
             * @event errorchange
             * Fires when the active error message is changed via {@link #setActiveError}.
             * @param {Ext.form.Labelable} this
             * @param {String} error The active error message
             */
            'errorchange'
        );
    },

    /**
     * Returns the trimmed label by slicing off the label separator character. Can be overridden.
     * @return {String} The trimmed field label, or empty string if not defined
     */
    trimLabelSeparator: function() {
        var me = this,
            separator = me.labelSeparator,
            label = me.fieldLabel || '',
            lastChar = label.substr(label.length - 1);

        // if the last char is the same as the label separator then slice it off otherwise just return label value
        return lastChar === separator ? label.slice(0, -1) : label;
    },

    /**
     * Returns the label for the field. Defaults to simply returning the {@link #fieldLabel} config. Can be overridden
     * to provide a custom generated label.
     * @template
     * @return {String} The configured field label, or empty string if not defined
     */
    getFieldLabel: function() {
        return this.trimLabelSeparator();
    },
    
    /**
     * Set the label of this field.
     * @param {String} label The new label. The {@link #labelSeparator} will be automatically appended to the label
     * string.
     */
    setFieldLabel: function(label){
        label = label || '';
        
        var me = this,
            separator = me.labelSeparator,
            labelEl = me.labelEl;
        
        me.fieldLabel = label;
        if (me.rendered) {
            if (Ext.isEmpty(label) && me.hideEmptyLabel) {
                labelEl.parent().setDisplayed('none');
            } else {
                if (separator) {
                    label = me.trimLabelSeparator() + separator;
                }
                labelEl.update(label);
                labelEl.parent().setDisplayed('');
            }
            me.updateLayout();
        }
    },

    getInsertionRenderData: function (data, names) {
        var i = names.length,
            name, value;

        while (i--) {
            name = names[i];
            value = this[name];

            if (value) {
                if (typeof value != 'string') {
                    if (!value.isTemplate) {
                        value = Ext.XTemplate.getTpl(this, name);
                    }
                    value = value.apply(data);
                }
            }

            data[name] = value || '';
        }

        return data;
    },

    /**
     * Generates the arguments for the field decorations {@link #labelableRenderTpl rendering template}.
     * @return {Object} The template arguments
     * @protected
     */
    getLabelableRenderData: function() {
        var me = this,
            data,
            tempEl,
            topLabel = me.labelAlign === 'top';

        if (!Ext.form.Labelable.errorIconWidth) {
            Ext.form.Labelable.errorIconWidth = (tempEl = Ext.resetElement.createChild({style: 'position:absolute', cls: Ext.baseCSSPrefix + 'form-invalid-icon'})).getWidth();
            tempEl.remove();
        }

        data = Ext.copyTo({
            inFormLayout   : me.ownerLayout && me.ownerLayout.type === 'form',
            inputId        : me.getInputId(),
            labelOnLeft    : !topLabel,
            hideLabel      : !me.hasVisibleLabel(),
            fieldLabel     : me.getFieldLabel(),
            labelCellStyle : me.getLabelCellStyle(),
            labelCellAttrs : me.getLabelCellAttrs(),
            labelCls       : me.getLabelCls(),
            labelStyle     : me.getLabelStyle(),
            bodyColspan    : me.getBodyColspan(),
            externalError  : !me.autoFitErrors,
            errorMsgCls    : me.getErrorMsgCls(),
            errorIconWidth : Ext.form.Labelable.errorIconWidth
        },
        me, me.labelableRenderProps, true);

        me.getInsertionRenderData(data, me.labelableInsertions);

        return data;
    },
    
    beforeLabelableRender: function() {
        var me = this;
        if (me.ownerLayout) {
            me.addCls(Ext.baseCSSPrefix + me.ownerLayout.type + '-form-item');
        }
    },

    onLabelableRender: function() {
        var me = this,
            margins,
            side,
            style = {};

        if (me.extraMargins) {
            margins = me.el.getMargin();
            for (side in margins) {
                if (margins.hasOwnProperty(side)) {
                    style['margin-' + side] = (margins[side] + me.extraMargins[side]) + 'px';
                }
            }
            me.el.setStyle(style);
        }
    },
    
    /**
     * Checks if the field has a visible label
     * @return {Boolean} True if the field has a visible label
     */
    hasVisibleLabel: function(){
        if (this.hideLabel) {
            return false;
        }
        return !(this.hideEmptyLabel && !this.getFieldLabel());
    },
    
    /**
     * @private
     * Calculates the colspan value for the body cell - the cell which contains the input field.
     *
     * The field table structure contains 4 columns:
     */
    getBodyColspan: function() {
        var me = this,
            result;

        if (me.msgTarget === 'side' && (!me.autoFitErrors || me.hasActiveError())) {
            result = 1;
        } else {
            result = 2;
        }
        if (me.labelAlign !== 'top' && !me.hasVisibleLabel()) {
            result++;
        }
        return result;
    },
    
    getLabelCls: function() {
        var labelCls = this.labelCls,
            labelClsExtra = this.labelClsExtra;

        if (this.labelAlign === 'top') {
            labelCls += '-top';
        }
        return labelClsExtra ? labelCls + ' ' + labelClsExtra : labelCls;
    },

    getLabelCellStyle: function() {
        var me = this,
            hideLabelCell = me.hideLabel || (!me.fieldLabel && me.hideEmptyLabel);

        return hideLabelCell ? 'display:none;' : '';
    },
    
    getErrorMsgCls: function() {
        var me = this,
            hideLabelCell = (me.hideLabel || (!me.fieldLabel && me.hideEmptyLabel));
        
        return me.errorMsgCls + (!hideLabelCell && me.labelAlign === 'top' ? ' ' + Ext.baseCSSPrefix + 'lbl-top-err-icon' : '');
    },

    getLabelCellAttrs: function() {
        var me = this,
            labelAlign = me.labelAlign,
            result = '';

        if (labelAlign !== 'top') {
            result = 'valign="top" halign="' + labelAlign + '" width="' + (me.labelWidth + me.labelPad) + '"';
        }
        return result + ' class="' + Ext.baseCSSPrefix + 'field-label-cell"';
    },
    
    /**
     * Gets any label styling for the labelEl
     * @private
     * @return {String} The label styling
     */
    getLabelStyle: function(){
        var me = this,
            labelPad = me.labelPad,
            labelStyle = '';

        // Calculate label styles up front rather than in the Field layout for speed; this
        // is safe because label alignment/width/pad are not expected to change.
        if (me.labelAlign !== 'top') {
            if (me.labelWidth) {
                labelStyle = 'width:' + me.labelWidth + 'px;';
            }
            labelStyle += 'margin-right:' + labelPad + 'px;';
        }
        
        return labelStyle + (me.labelStyle || '');
    },

    /**
     * Gets the markup to be inserted into the outer template's bodyEl. Defaults to empty string, should be implemented
     * by classes including this mixin as needed.
     * @return {String} The markup to be inserted
     * @protected
     */
    getSubTplMarkup: function() {
        return '';
    },

    /**
     * Get the input id, if any, for this component. This is used as the "for" attribute on the label element.
     * Implementing subclasses may also use this as e.g. the id for their own input element.
     * @return {String} The input id
     */
    getInputId: function() {
        return '';
    },

    /**
     * Gets the active error message for this component, if any. This does not trigger validation on its own, it merely
     * returns any message that the component may already hold.
     * @return {String} The active error message on the component; if there is no error, an empty string is returned.
     */
    getActiveError : function() {
        return this.activeError || '';
    },

    /**
     * Tells whether the field currently has an active error message. This does not trigger validation on its own, it
     * merely looks for any message that the component may already hold.
     * @return {Boolean}
     */
    hasActiveError: function() {
        return !!this.getActiveError();
    },

    /**
     * Sets the active error message to the given string. This replaces the entire error message contents with the given
     * string. Also see {@link #setActiveErrors} which accepts an Array of messages and formats them according to the
     * {@link #activeErrorsTpl}. Note that this only updates the error message element's text and attributes, you'll
     * have to call doComponentLayout to actually update the field's layout to match. If the field extends {@link
     * Ext.form.field.Base} you should call {@link Ext.form.field.Base#markInvalid markInvalid} instead.
     * @param {String} msg The error message
     */
    setActiveError: function(msg) {
        this.setActiveErrors(msg);
    },

    /**
     * Gets an Array of any active error messages currently applied to the field. This does not trigger validation on
     * its own, it merely returns any messages that the component may already hold.
     * @return {String[]} The active error messages on the component; if there are no errors, an empty Array is
     * returned.
     */
    getActiveErrors: function() {
        return this.activeErrors || [];
    },

    /**
     * Set the active error message to an Array of error messages. The messages are formatted into a single message
     * string using the {@link #activeErrorsTpl}. Also see {@link #setActiveError} which allows setting the entire error
     * contents with a single string. Note that this only updates the error message element's text and attributes,
     * you'll have to call doComponentLayout to actually update the field's layout to match. If the field extends
     * {@link Ext.form.field.Base} you should call {@link Ext.form.field.Base#markInvalid markInvalid} instead.
     * @param {String[]} errors The error messages
     */
    setActiveErrors: function(errors) {
        errors = Ext.Array.from(errors);
        this.activeError = errors[0];
        this.activeErrors = errors;
        this.activeError = this.getTpl('activeErrorsTpl').apply({errors: errors});
        this.renderActiveError();
    },

    /**
     * Clears the active error message(s). Note that this only clears the error message element's text and attributes,
     * you'll have to call doComponentLayout to actually update the field's layout to match. If the field extends {@link
     * Ext.form.field.Base} you should call {@link Ext.form.field.Base#clearInvalid clearInvalid} instead.
     */
    unsetActiveError: function() {
        delete this.activeError;
        delete this.activeErrors;
        this.renderActiveError();
    },

    /**
     * @private
     * Updates the rendered DOM to match the current activeError. This only updates the content and
     * attributes, you'll have to call doComponentLayout to actually update the display.
     */
    renderActiveError: function() {
        var me = this,
            activeError = me.getActiveError(),
            hasError = !!activeError;

        if (activeError !== me.lastActiveError) {
            me.fireEvent('errorchange', me, activeError);
            me.lastActiveError = activeError;
        }

        if (me.rendered && !me.isDestroyed && !me.preventMark) {
            // Add/remove invalid class
            me.el[hasError ? 'addCls' : 'removeCls'](me.invalidCls);

            // Update the aria-invalid attribute
            me.getActionEl().dom.setAttribute('aria-invalid', hasError);

            // Update the errorEl (There will only be one if msgTarget is 'side' or 'under') with the error message text
            if (me.errorEl) {
                me.errorEl.dom.innerHTML = activeError;
            }
        }
    },

    /**
     * Applies a set of default configuration values to this Labelable instance. For each of the properties in the given
     * object, check if this component hasOwnProperty that config; if not then it's inheriting a default value from its
     * prototype and we should apply the default value.
     * @param {Object} defaults The defaults to apply to the object.
     */
    setFieldDefaults: function(defaults) {
        var me = this,
            val, key;

        for (key in defaults) {
            if (defaults.hasOwnProperty(key)) {
                val = defaults[key];

                if (!me.hasOwnProperty(key)) {
                    me[key] = val;
                }
            }
        }
    }
});

/**
 * @private
 * Private utility class for managing all {@link Ext.form.field.Radio} fields grouped by name.
 */
Ext.define('Ext.form.RadioManager', {
    extend: 'Ext.util.MixedCollection',
    singleton: true,

    getByName: function(name, formId) {
        return this.filterBy(function(item) {
            return item.name == name && item.getFormId() == formId;
        });
    },

    getWithValue: function(name, value, formId) {
        return this.filterBy(function(item) {
            return item.name == name && item.inputValue == value && item.getFormId() == formId;
        });
    },

    getChecked: function(name, formId) {
        return this.findBy(function(item) {
            return item.name == name && item.checked && item.getFormId() == formId;
        });
    }
});

/**
 * Provides Ext.direct support for submitting form data.
 *
 * This example illustrates usage of Ext.direct.Direct to **submit** a form through Ext.Direct.
 *
 *     var myFormPanel = new Ext.form.Panel({
 *         // configs for FormPanel
 *         title: 'Basic Information',
 *         renderTo: document.body,
 *         width: 300, height: 160,
 *         padding: 10,
 *         buttons:[{
 *             text: 'Submit',
 *             handler: function(){
 *                 myFormPanel.getForm().submit({
 *                     params: {
 *                         foo: 'bar',
 *                         uid: 34
 *                     }
 *                 });
 *             }
 *         }],
 *
 *         // configs apply to child items
 *         defaults: {anchor: '100%'},
 *         defaultType: 'textfield',
 *         items: [{
 *             fieldLabel: 'Name',
 *             name: 'name'
 *         },{
 *             fieldLabel: 'Email',
 *             name: 'email'
 *         },{
 *             fieldLabel: 'Company',
 *             name: 'company'
 *         }],
 *
 *         // configs for BasicForm
 *         api: {
 *             // The server-side method to call for load() requests
 *             load: Profile.getBasicInfo,
 *             // The server-side must mark the submit handler as a 'formHandler'
 *             submit: Profile.updateBasicInfo
 *         },
 *         // specify the order for the passed params
 *         paramOrder: ['uid', 'foo']
 *     });
 *
 * The data packet sent to the server will resemble something like:
 *
 *     {
 *         "action":"Profile","method":"updateBasicInfo","type":"rpc","tid":"6",
 *         "result":{
 *             "success":true,
 *             "id":{
 *                 "extAction":"Profile","extMethod":"updateBasicInfo",
 *                 "extType":"rpc","extTID":"6","extUpload":"false",
 *                 "name":"Aaron Conran","email":"aaron@sencha.com","company":"Sencha Inc."
 *             }
 *         }
 *     }
 *
 * The form will process a data packet returned by the server that is similar to the following:
 *
 *     // sample success packet (batched requests)
 *     [
 *         {
 *             "action":"Profile","method":"updateBasicInfo","type":"rpc","tid":3,
 *             "result":{
 *                 "success":true
 *             }
 *         }
 *     ]
 *
 *     // sample failure packet (one request)
 *     {
 *             "action":"Profile","method":"updateBasicInfo","type":"rpc","tid":"6",
 *             "result":{
 *                 "errors":{
 *                     "email":"already taken"
 *                 },
 *                 "success":false,
 *                 "foo":"bar"
 *             }
 *     }
 *
 * Also see the discussion in {@link Ext.form.action.DirectLoad}.
 */
Ext.define('Ext.form.action.DirectSubmit', {
    extend:'Ext.form.action.Submit',
    requires: ['Ext.direct.Manager'],
    alternateClassName: 'Ext.form.Action.DirectSubmit',
    alias: 'formaction.directsubmit',

    type: 'directsubmit',

    doSubmit: function() {
        var me = this,
            callback = Ext.Function.bind(me.onComplete, me),
            formEl = me.buildForm();
        me.form.api.submit(formEl, callback, me);
        Ext.removeNode(formEl);
    },

    // Direct actions have already been processed and therefore
    // we can directly set the result; Direct Actions do not have
    // a this.response property.
    processResponse: function(result) {
        return (this.result = result);
    },
    
    onComplete: function(data, response){
        if (data) {
            this.onSuccess(data);
        } else {
            this.onFailure(null);
        }
    }
});

/**
 * A class which handles loading of data from a server into the Fields of an {@link Ext.form.Basic}.
 *
 * Instances of this class are only created by a {@link Ext.form.Basic Form} when {@link Ext.form.Basic#load load}ing.
 *
 * ## Response Packet Criteria
 *
 * A response packet **must** contain:
 *
 *   - **`success`** property : Boolean
 *   - **`data`** property : Object
 *
 * The `data` property contains the values of Fields to load. The individual value object for each Field is passed to
 * the Field's {@link Ext.form.field.Field#setValue setValue} method.
 *
 * ## JSON Packets
 *
 * By default, response packets are assumed to be JSON, so for the following form load call:
 *
 *     var myFormPanel = new Ext.form.Panel({
 *         title: 'Client and routing info',
 *         renderTo: Ext.getBody(),
 *         defaults: {
 *             xtype: 'textfield'
 *         },
 *         items: [{
 *             fieldLabel: 'Client',
 *             name: 'clientName'
 *         }, {
 *             fieldLabel: 'Port of loading',
 *             name: 'portOfLoading'
 *         }, {
 *             fieldLabel: 'Port of discharge',
 *             name: 'portOfDischarge'
 *         }]
 *     });
 *     myFormPanel.{@link Ext.form.Panel#getForm getForm}().{@link Ext.form.Basic#load load}({
 *         url: '/getRoutingInfo.php',
 *         params: {
 *             consignmentRef: myConsignmentRef
 *         },
 *         failure: function(form, action) {
 *             Ext.Msg.alert("Load failed", action.result.errorMessage);
 *         }
 *     });
 *
 * a **success response** packet may look like this:
 *
 *     {
 *         success: true,
 *         data: {
 *             clientName: "Fred. Olsen Lines",
 *             portOfLoading: "FXT",
 *             portOfDischarge: "OSL"
 *         }
 *     }
 *
 * while a **failure response** packet may look like this:
 *
 *     {
 *         success: false,
 *         errorMessage: "Consignment reference not found"
 *     }
 *
 * Other data may be placed into the response for processing the {@link Ext.form.Basic Form}'s callback or event handler
 * methods. The object decoded from this JSON is available in the {@link Ext.form.action.Action#result result} property.
 */
Ext.define('Ext.form.action.Load', {
    extend:'Ext.form.action.Action',
    requires: ['Ext.data.Connection'],
    alternateClassName: 'Ext.form.Action.Load',
    alias: 'formaction.load',

    type: 'load',

    /**
     * @private
     */
    run: function() {
        Ext.Ajax.request(Ext.apply(
            this.createCallback(),
            {
                method: this.getMethod(),
                url: this.getUrl(),
                headers: this.headers,
                params: this.getParams()
            }
        ));
    },

    /**
     * @private
     */
    onSuccess: function(response){
        var result = this.processResponse(response),
            form = this.form;
        if (result === true || !result.success || !result.data) {
            this.failureType = Ext.form.action.Action.LOAD_FAILURE;
            form.afterAction(this, false);
            return;
        }
        form.clearInvalid();
        form.setValues(result.data);
        form.afterAction(this, true);
    },

    /**
     * @private
     */
    handleResponse: function(response) {
        var reader = this.form.reader,
            rs, data;
        if (reader) {
            rs = reader.read(response);
            data = rs.records && rs.records[0] ? rs.records[0].data : null;
            return {
                success : rs.success,
                data : data
            };
        }
        return Ext.decode(response.responseText);
    }
});


/**
 * Provides {@link Ext.direct.Manager} support for loading form data.
 *
 * This example illustrates usage of Ext.direct.Direct to **load** a form through Ext.Direct.
 *
 *     var myFormPanel = new Ext.form.Panel({
 *         // configs for FormPanel
 *         title: 'Basic Information',
 *         renderTo: document.body,
 *         width: 300, height: 160,
 *         padding: 10,
 *
 *         // configs apply to child items
 *         defaults: {anchor: '100%'},
 *         defaultType: 'textfield',
 *         items: [{
 *             fieldLabel: 'Name',
 *             name: 'name'
 *         },{
 *             fieldLabel: 'Email',
 *             name: 'email'
 *         },{
 *             fieldLabel: 'Company',
 *             name: 'company'
 *         }],
 *
 *         // configs for BasicForm
 *         api: {
 *             // The server-side method to call for load() requests
 *             load: Profile.getBasicInfo,
 *             // The server-side must mark the submit handler as a 'formHandler'
 *             submit: Profile.updateBasicInfo
 *         },
 *         // specify the order for the passed params
 *         paramOrder: ['uid', 'foo']
 *     });
 *
 *     // load the form
 *     myFormPanel.getForm().load({
 *         // pass 2 arguments to server side getBasicInfo method (len=2)
 *         params: {
 *             foo: 'bar',
 *             uid: 34
 *         }
 *     });
 *
 * The data packet sent to the server will resemble something like:
 *
 *     [
 *         {
 *             "action":"Profile","method":"getBasicInfo","type":"rpc","tid":2,
 *             "data":[34,"bar"] // note the order of the params
 *         }
 *     ]
 *
 * The form will process a data packet returned by the server that is similar to the following format:
 *
 *     [
 *         {
 *             "action":"Profile","method":"getBasicInfo","type":"rpc","tid":2,
 *             "result":{
 *                 "success":true,
 *                 "data":{
 *                     "name":"Fred Flintstone",
 *                     "company":"Slate Rock and Gravel",
 *                     "email":"fred.flintstone@slaterg.com"
 *                 }
 *             }
 *         }
 *     ]
 */
Ext.define('Ext.form.action.DirectLoad', {
    extend:'Ext.form.action.Load',
    requires: ['Ext.direct.Manager'],
    alternateClassName: 'Ext.form.Action.DirectLoad',
    alias: 'formaction.directload',

    type: 'directload',

    run: function() {
        var me = this,
            form = me.form,
            fn = form.api.load,
            method = fn.directCfg.method,
            args = method.getArgs(me.getParams(), form.paramOrder, form.paramsAsHash);
            
        args.push(me.onComplete, me);
        fn.apply(window, args);
    },

    // Direct actions have already been processed and therefore
    // we can directly set the result; Direct Actions do not have
    // a this.response property.
    processResponse: function(result) {
        return (this.result = result);
    },

    onComplete: function(data, response) {
        if (data) {
            this.onSuccess(data);
        } else {
            this.onFailure(null);
        }
    }
});



/**
 * A class which handles submission of data from {@link Ext.form.Basic Form}s using a standard `<form>` element submit.
 * It does not handle the response from the submit.
 *
 * If validation of the form fields fails, the Form's afterAction method will be called. Otherwise, afterAction will not
 * be called.
 *
 * Instances of this class are only created by a {@link Ext.form.Basic Form} when
 * {@link Ext.form.Basic#submit submit}ting, when the form's {@link Ext.form.Basic#standardSubmit} config option is true.
 */
Ext.define('Ext.form.action.StandardSubmit', {
    extend:'Ext.form.action.Submit',
    alias: 'formaction.standardsubmit',

    /**
     * @cfg {String} target
     * Optional target attribute to be used for the form when submitting.
     * 
     * Defaults to the current window/frame.
     */

    /**
     * @private
     * Perform the form submit. Creates and submits a temporary form element containing an input element for each
     * field value returned by {@link Ext.form.Basic#getValues}, plus any configured {@link #params params} or
     * {@link Ext.form.Basic#baseParams baseParams}.
     */
    doSubmit: function() {
        var form = this.buildForm();
        form.submit();
        Ext.removeNode(form);
    }

});






/**
 * @docauthor Jason Johnston <jason@sencha.com>
 *
 * Base class for form fields that provides default event handling, rendering, and other common functionality
 * needed by all form field types. Utilizes the {@link Ext.form.field.Field} mixin for value handling and validation,
 * and the {@link Ext.form.Labelable} mixin to provide label and error message display.
 *
 * In most cases you will want to use a subclass, such as {@link Ext.form.field.Text} or {@link Ext.form.field.Checkbox},
 * rather than creating instances of this class directly. However if you are implementing a custom form field,
 * using this as the parent class is recommended.
 *
 * # Values and Conversions
 *
 * Because Base implements the Field mixin, it has a main value that can be initialized with the
 * {@link #value} config and manipulated via the {@link #getValue} and {@link #setValue} methods. This main
 * value can be one of many data types appropriate to the current field, for instance a {@link Ext.form.field.Date Date}
 * field would use a JavaScript Date object as its value type. However, because the field is rendered as a HTML
 * input, this value data type can not always be directly used in the rendered field.
 *
 * Therefore Base introduces the concept of a "raw value". This is the value of the rendered HTML input field,
 * and is normally a String. The {@link #getRawValue} and {@link #setRawValue} methods can be used to directly
 * work with the raw value, though it is recommended to use getValue and setValue in most cases.
 *
 * Conversion back and forth between the main value and the raw value is handled by the {@link #valueToRaw} and
 * {@link #rawToValue} methods. If you are implementing a subclass that uses a non-String value data type, you
 * should override these methods to handle the conversion.
 *
 * # Rendering
 *
 * The content of the field body is defined by the {@link #fieldSubTpl} XTemplate, with its argument data
 * created by the {@link #getSubTplData} method. Override this template and/or method to create custom
 * field renderings.
 *
 * # Example usage:
 *
 *     @example
 *     // A simple subclass of Base that creates a HTML5 search field. Redirects to the
 *     // searchUrl when the Enter key is pressed.222
 *     Ext.define('Ext.form.SearchField', {
 *         extend: 'Ext.form.field.Base',
 *         alias: 'widget.searchfield',
 *     
 *         inputType: 'search',
 *     
 *         // Config defining the search URL
 *         searchUrl: 'http://www.google.com/search?q={0}',
 *     
 *         // Add specialkey listener
 *         initComponent: function() {
 *             this.callParent();
 *             this.on('specialkey', this.checkEnterKey, this);
 *         },
 *     
 *         // Handle enter key presses, execute the search if the field has a value
 *         checkEnterKey: function(field, e) {
 *             var value = this.getValue();
 *             if (e.getKey() === e.ENTER && !Ext.isEmpty(value)) {
 *                 location.href = Ext.String.format(this.searchUrl, value);
 *             }
 *         }
 *     });
 *     
 *     Ext.create('Ext.form.Panel', {
 *         title: 'Base Example',
 *         bodyPadding: 5,
 *         width: 250,
 *     
 *         // Fields will be arranged vertically, stretched to full width
 *         layout: 'anchor',
 *         defaults: {
 *             anchor: '100%'
 *         },
 *         items: [{
 *             xtype: 'searchfield',
 *             fieldLabel: 'Search',
 *             name: 'query'
 *         }],
 *         renderTo: Ext.getBody()
 *     });
 */
Ext.define('Ext.form.field.Base', {
    extend: 'Ext.Component',
    mixins: {
        labelable: 'Ext.form.Labelable',
        field: 'Ext.form.field.Field'
    },
    alias: 'widget.field',
    alternateClassName: ['Ext.form.Field', 'Ext.form.BaseField'],
    requires: ['Ext.util.DelayedTask', 'Ext.XTemplate', 'Ext.layout.component.field.Field'],

    /**
     * @cfg {Ext.XTemplate} fieldSubTpl
     * The content of the field body is defined by this config option.
     * @private
     */
    fieldSubTpl: [ // note: {id} here is really {inputId}, but {cmpId} is available
        '<input id="{id}" type="{type}" {inputAttrTpl}',
            ' size="1"', // allows inputs to fully respect CSS widths across all browsers
            '<tpl if="name"> name="{name}"</tpl>',
            '<tpl if="value"> value="{[Ext.util.Format.htmlEncode(values.value)]}"</tpl>',
            '<tpl if="placeholder"> placeholder="{placeholder}"</tpl>',
            '{%if (values.maxLength !== undefined){%} maxlength="{maxLength}"{%}%}',
            '<tpl if="readOnly"> readonly="readonly"</tpl>',
            '<tpl if="disabled"> disabled="disabled"</tpl>',
            '<tpl if="tabIdx"> tabIndex="{tabIdx}"</tpl>',
            '<tpl if="fieldStyle"> style="{fieldStyle}"</tpl>',
        ' class="{fieldCls} {typeCls} {editableCls}" autocomplete="off"/>',
        {
            disableFormats: true
        }
    ],

    subTplInsertions: [
        /**
         * @cfg {String/Array/Ext.XTemplate} inputAttrTpl
         * An optional string or `XTemplate` configuration to insert in the field markup
         * inside the input element (as attributes). If an `XTemplate` is used, the component's
         * {@link #getSubTplData subTpl data} serves as the context.
         */
        'inputAttrTpl'
    ],

    /**
     * @cfg {String} name
     * The name of the field. This is used as the parameter name when including the field value
     * in a {@link Ext.form.Basic#submit form submit()}. If no name is configured, it falls back to the {@link #inputId}.
     * To prevent the field from being included in the form submit, set {@link #submitValue} to false.
     */

    /**
     * @cfg {String} inputType
     * The type attribute for input fields -- e.g. radio, text, password, file. The extended types
     * supported by HTML5 inputs (url, email, etc.) may also be used, though using them will cause older browsers to
     * fall back to 'text'.
     *
     * The type 'password' must be used to render that field type currently -- there is no separate Ext component for
     * that. You can use {@link Ext.form.field.File} which creates a custom-rendered file upload field, but if you want
     * a plain unstyled file input you can use a Base with inputType:'file'.
     */
    inputType: 'text',

    /**
     * @cfg {Number} tabIndex
     * The tabIndex for this field. Note this only applies to fields that are rendered, not those which are built via
     * applyTo
     */

    //<locale>
    /**
     * @cfg {String} invalidText
     * The error text to use when marking a field invalid and no message is provided
     */
    invalidText : 'The value in this field is invalid',
    //</locale>

    /**
     * @cfg {String} [fieldCls='x-form-field']
     * The default CSS class for the field input
     */
    fieldCls : Ext.baseCSSPrefix + 'form-field',

    /**
     * @cfg {String} fieldStyle
     * Optional CSS style(s) to be applied to the {@link #inputEl field input element}. Should be a valid argument to
     * {@link Ext.Element#applyStyles}. Defaults to undefined. See also the {@link #setFieldStyle} method for changing
     * the style after initialization.
     */

    /**
     * @cfg {String} [focusCls='x-form-focus']
     * The CSS class to use when the field receives focus
     */
    focusCls : 'form-focus',

    /**
     * @cfg {String} dirtyCls
     * The CSS class to use when the field value {@link #isDirty is dirty}.
     */
    dirtyCls : Ext.baseCSSPrefix + 'form-dirty',

    /**
     * @cfg {String[]} checkChangeEvents
     * A list of event names that will be listened for on the field's {@link #inputEl input element}, which will cause
     * the field's value to be checked for changes. If a change is detected, the {@link #change change event} will be
     * fired, followed by validation if the {@link #validateOnChange} option is enabled.
     *
     * Defaults to ['change', 'propertychange'] in Internet Explorer, and ['change', 'input', 'textInput', 'keyup',
     * 'dragdrop'] in other browsers. This catches all the ways that field values can be changed in most supported
     * browsers; the only known exceptions at the time of writing are:
     *
     *   - Safari 3.2 and older: cut/paste in textareas via the context menu, and dragging text into textareas
     *   - Opera 10 and 11: dragging text into text fields and textareas, and cut via the context menu in text fields
     *     and textareas
     *   - Opera 9: Same as Opera 10 and 11, plus paste from context menu in text fields and textareas
     *
     * If you need to guarantee on-the-fly change notifications including these edge cases, you can call the
     * {@link #checkChange} method on a repeating interval, e.g. using {@link Ext.TaskManager}, or if the field is within
     * a {@link Ext.form.Panel}, you can use the FormPanel's {@link Ext.form.Panel#pollForChanges} configuration to set up
     * such a task automatically.
     */
    checkChangeEvents: Ext.isIE && (!document.documentMode || document.documentMode < 9) ?
                        ['change', 'propertychange'] :
                        ['change', 'input', 'textInput', 'keyup', 'dragdrop'],

    /**
     * @cfg {Number} checkChangeBuffer
     * Defines a timeout in milliseconds for buffering {@link #checkChangeEvents} that fire in rapid succession.
     * Defaults to 50 milliseconds.
     */
    checkChangeBuffer: 50,

    componentLayout: 'field',

    /**
     * @cfg {Boolean} readOnly
     * true to mark the field as readOnly in HTML.
     *
     * **Note**: this only sets the element's readOnly DOM attribute. Setting `readOnly=true`, for example, will not
     * disable triggering a ComboBox or Date; it gives you the option of forcing the user to choose via the trigger
     * without typing in the text box. To hide the trigger use `{@link Ext.form.field.Trigger#hideTrigger hideTrigger}`.
     */
    readOnly : false,

    /**
     * @cfg {String} readOnlyCls
     * The CSS class applied to the component's main element when it is {@link #readOnly}.
     */
    readOnlyCls: Ext.baseCSSPrefix + 'form-readonly',

    /**
     * @cfg {String} inputId
     * The id that will be given to the generated input DOM element. Defaults to an automatically generated id. If you
     * configure this manually, you must make sure it is unique in the document.
     */

    /**
     * @cfg {Boolean} validateOnBlur
     * Whether the field should validate when it loses focus. This will cause fields to be validated
     * as the user steps through the fields in the form regardless of whether they are making changes to those fields
     * along the way. See also {@link #validateOnChange}.
     */
    validateOnBlur: true,

    // private
    hasFocus : false,

    baseCls: Ext.baseCSSPrefix + 'field',

    maskOnDisable: false,

    // private
    initComponent : function() {
        var me = this;

        me.callParent();

        me.subTplData = me.subTplData || {};

        me.addEvents(
            /**
             * @event specialkey
             * Fires when any key related to navigation (arrows, tab, enter, esc, etc.) is pressed. To handle other keys
             * see {@link Ext.util.KeyMap}. You can check {@link Ext.EventObject#getKey} to determine which key was
             * pressed. For example:
             *
             *     var form = new Ext.form.Panel({
             *         ...
             *         items: [{
             *                 fieldLabel: 'Field 1',
             *                 name: 'field1',
             *                 allowBlank: false
             *             },{
             *                 fieldLabel: 'Field 2',
             *                 name: 'field2',
             *                 listeners: {
             *                     specialkey: function(field, e){
             *                         // e.HOME, e.END, e.PAGE_UP, e.PAGE_DOWN,
             *                         // e.TAB, e.ESC, arrow keys: e.LEFT, e.RIGHT, e.UP, e.DOWN
             *                         if (e.{@link Ext.EventObject#getKey getKey()} == e.ENTER) {
             *                             var form = field.up('form').getForm();
             *                             form.submit();
             *                         }
             *                     }
             *                 }
             *             }
             *         ],
             *         ...
             *     });
             *
             * @param {Ext.form.field.Base} this
             * @param {Ext.EventObject} e The event object
             */
            'specialkey',

            /**
             * @event writeablechange
             * Fires when this field changes its read-only status.
             * @param {Ext.form.field.Base} this
             * @param {Boolean} Read only flag
             */
            'writeablechange'
        );

        // Init mixins
        me.initLabelable();
        me.initField();

        // Default name to inputId
        if (!me.name) {
            me.name = me.getInputId();
        }
    },
    
    beforeRender: function(){
        var me = this;
            
        me.callParent(arguments);
        me.beforeLabelableRender(arguments);
        if (me.readOnly) {
            me.addCls(me.readOnlyCls);
        }
    },

    /**
     * Returns the input id for this field. If none was specified via the {@link #inputId} config, then an id will be
     * automatically generated.
     */
    getInputId: function() {
        return this.inputId || (this.inputId = this.id + '-inputEl');
    },

    /**
     * Creates and returns the data object to be used when rendering the {@link #fieldSubTpl}.
     * @return {Object} The template data
     * @template
     */
    getSubTplData: function() {
        var me = this,
            type = me.inputType,
            inputId = me.getInputId(),
            data;
        
        data = Ext.apply({
            id         : inputId,
            cmpId      : me.id,
            name       : me.name || inputId,
            disabled   : me.disabled,
            readOnly   : me.readOnly,
            value      : me.getRawValue(),
            type       : type,
            fieldCls   : me.fieldCls,
            fieldStyle : me.getFieldStyle(),
            tabIdx     : me.tabIndex,
            typeCls    : Ext.baseCSSPrefix + 'form-' + (type === 'password' ? 'text' : type)
        }, me.subTplData);

        me.getInsertionRenderData(data, me.subTplInsertions);

        return data;
    },

    afterFirstLayout: function() {
        this.callParent();
        var el = this.inputEl;
        if (el) {
            el.selectable();
        }
    },

    applyRenderSelectors: function() {
        var me = this;

        me.callParent();

        /**
         * @property {Ext.Element} inputEl
         * The input Element for this Field. Only available after the field has been rendered.
         */
        me.inputEl = me.el.getById(me.getInputId());
    },

    /**
     * Gets the markup to be inserted into the outer template's bodyEl. For fields this is the actual input element.
     */
    getSubTplMarkup: function() {
        return this.getTpl('fieldSubTpl').apply(this.getSubTplData());
    },

    initRenderTpl: function() {
        var me = this;
        if (!me.hasOwnProperty('renderTpl')) {
            me.renderTpl = me.getTpl('labelableRenderTpl');
        }
        return me.callParent();
    },

    initRenderData: function() {
        return Ext.applyIf(this.callParent(), this.getLabelableRenderData());
    },

    /**
     * Set the {@link #fieldStyle CSS style} of the {@link #inputEl field input element}.
     * @param {String/Object/Function} style The style(s) to apply. Should be a valid argument to {@link
     * Ext.Element#applyStyles}.
     */
    setFieldStyle: function(style) {
        var me = this,
            inputEl = me.inputEl;
        if (inputEl) {
            inputEl.applyStyles(style);
        }
        me.fieldStyle = style;
    },

    getFieldStyle: function() {
        return 'width:100%;' + (Ext.isObject(this.fieldStyle) ? Ext.DomHelper.generateStyles(this.fieldStyle) : this.fieldStyle ||'');
    },

    // private
    onRender : function() {
        var me = this;
        me.callParent(arguments);
        me.onLabelableRender();
        me.renderActiveError();
    },

    getFocusEl: function() {
        return this.inputEl;
    },

    isFileUpload: function() {
        return this.inputType === 'file';
    },

    extractFileInput: function() {
        var me = this,
            fileInput = me.isFileUpload() ? me.inputEl.dom : null,
            clone;
        if (fileInput) {
            clone = fileInput.cloneNode(true);
            fileInput.parentNode.replaceChild(clone, fileInput);
            me.inputEl = Ext.get(clone);
        }
        return fileInput;
    },

    // private override to use getSubmitValue() as a convenience
    getSubmitData: function() {
        var me = this,
            data = null,
            val;
        if (!me.disabled && me.submitValue && !me.isFileUpload()) {
            val = me.getSubmitValue();
            if (val !== null) {
                data = {};
                data[me.getName()] = val;
            }
        }
        return data;
    },

    /**
     * Returns the value that would be included in a standard form submit for this field. This will be combined with the
     * field's name to form a name=value pair in the {@link #getSubmitData submitted parameters}. If an empty string is
     * returned then just the name= will be submitted; if null is returned then nothing will be submitted.
     *
     * Note that the value returned will have been {@link #processRawValue processed} but may or may not have been
     * successfully {@link #validate validated}.
     *
     * @return {String} The value to be submitted, or null.
     */
    getSubmitValue: function() {
        return this.processRawValue(this.getRawValue());
    },

    /**
     * Returns the raw value of the field, without performing any normalization, conversion, or validation. To get a
     * normalized and converted value see {@link #getValue}.
     * @return {String} value The raw String value of the field
     */
    getRawValue: function() {
        var me = this,
            v = (me.inputEl ? me.inputEl.getValue() : Ext.value(me.rawValue, ''));
        me.rawValue = v;
        return v;
    },

    /**
     * Sets the field's raw value directly, bypassing {@link #valueToRaw value conversion}, change detection, and
     * validation. To set the value with these additional inspections see {@link #setValue}.
     * @param {Object} value The value to set
     * @return {Object} value The field value that is set
     */
    setRawValue: function(value) {
        var me = this;
        value = Ext.value(me.transformRawValue(value), '');
        me.rawValue = value;

        // Some Field subclasses may not render an inputEl
        if (me.inputEl) {
            me.inputEl.dom.value = value;
        }
        return value;
    },
    
    /**
     * Transform the raw value before it is set
     * @protected
     * @param {Object} value The value
     * @return {Object} The value to set
     */
    transformRawValue: function(value) {
        return value;
    },

    /**
     * Converts a mixed-type value to a raw representation suitable for displaying in the field. This allows controlling
     * how value objects passed to {@link #setValue} are shown to the user, including localization. For instance, for a
     * {@link Ext.form.field.Date}, this would control how a Date object passed to {@link #setValue} would be converted
     * to a String for display in the field.
     *
     * See {@link #rawToValue} for the opposite conversion.
     *
     * The base implementation simply does a standard toString conversion, and converts {@link Ext#isEmpty empty values}
     * to an empty string.
     *
     * @param {Object} value The mixed-type value to convert to the raw representation.
     * @return {Object} The converted raw value.
     */
    valueToRaw: function(value) {
        return '' + Ext.value(value, '');
    },

    /**
     * Converts a raw input field value into a mixed-type value that is suitable for this particular field type. This
     * allows controlling the normalization and conversion of user-entered values into field-type-appropriate values,
     * e.g. a Date object for {@link Ext.form.field.Date}, and is invoked by {@link #getValue}.
     *
     * It is up to individual implementations to decide how to handle raw values that cannot be successfully converted
     * to the desired object type.
     *
     * See {@link #valueToRaw} for the opposite conversion.
     *
     * The base implementation does no conversion, returning the raw value untouched.
     *
     * @param {Object} rawValue
     * @return {Object} The converted value.
     */
    rawToValue: function(rawValue) {
        return rawValue;
    },

    /**
     * Performs any necessary manipulation of a raw field value to prepare it for {@link #rawToValue conversion} and/or
     * {@link #validate validation}, for instance stripping out ignored characters. In the base implementation it does
     * nothing; individual subclasses may override this as needed.
     *
     * @param {Object} value The unprocessed string value
     * @return {Object} The processed string value
     */
    processRawValue: function(value) {
        return value;
    },

    /**
     * Returns the current data value of the field. The type of value returned is particular to the type of the
     * particular field (e.g. a Date object for {@link Ext.form.field.Date}), as the result of calling {@link #rawToValue} on
     * the field's {@link #processRawValue processed} String value. To return the raw String value, see {@link #getRawValue}.
     * @return {Object} value The field value
     */
    getValue: function() {
        var me = this,
            val = me.rawToValue(me.processRawValue(me.getRawValue()));
        me.value = val;
        return val;
    },

    /**
     * Sets a data value into the field and runs the change detection and validation. To set the value directly
     * without these inspections see {@link #setRawValue}.
     * @param {Object} value The value to set
     * @return {Ext.form.field.Field} this
     */
    setValue: function(value) {
        var me = this;
        me.setRawValue(me.valueToRaw(value));
        return me.mixins.field.setValue.call(me, value);
    },

    onBoxReady: function() {
        var me = this;
        me.callParent();
        
        if (me.setReadOnlyOnBoxReady) {
            me.setReadOnly(me.readOnly);
        }
            
    },

    //private
    onDisable: function() {
        var me = this,
            inputEl = me.inputEl;
            
        me.callParent();
        if (inputEl) {
            inputEl.dom.disabled = true;
            if (me.hasActiveError()) {
                // clear invalid state since the field is now disabled
                me.clearInvalid();
                me.needsValidateOnEnable = true;
            }
        }
    },

    //private
    onEnable: function() {
        var me = this,
            inputEl = me.inputEl;
            
        me.callParent();
        if (inputEl) {
            inputEl.dom.disabled = false;
            if (me.needsValidateOnEnable) {
                delete me.needsValidateOnEnable;
                // will trigger errors to be shown
                me.forceValidation = true;
                me.isValid();
                delete me.forceValidation;
            }
        }
    },

    /**
     * Sets the read only state of this field.
     * @param {Boolean} readOnly Whether the field should be read only.
     */
    setReadOnly: function(readOnly) {
        var me = this,
            inputEl = me.inputEl;
        readOnly = !!readOnly;
        me[readOnly ? 'addCls' : 'removeCls'](me.readOnlyCls);
        me.readOnly = readOnly;
        if (inputEl) {
            inputEl.dom.readOnly = readOnly;
        } else if (me.rendering) {
            me.setReadOnlyOnBoxReady = true;
        }
        me.fireEvent('writeablechange', me, readOnly);
    },

    // private
    fireKey: function(e){
        if(e.isSpecialKey()){
            this.fireEvent('specialkey', this, new Ext.EventObjectImpl(e));
        }
    },

    // private
    initEvents : function(){
        var me = this,
            inputEl = me.inputEl,
            onChangeTask,
            onChangeEvent,
            events = me.checkChangeEvents,
            e,
            eLen   = events.length,
            event;

        // standardise buffer across all browsers + OS-es for consistent event order.
        // (the 10ms buffer for Editors fixes a weird FF/Win editor issue when changing OS window focus)
        if (me.inEditor) {
            me.onBlur = Ext.Function.createBuffered(me.onBlur, 10);
        }
        if (inputEl) {
            me.mon(inputEl, Ext.EventManager.getKeyEvent(), me.fireKey,  me);

            // listen for immediate value changes
            onChangeTask = new Ext.util.DelayedTask(me.checkChange, me);
            me.onChangeEvent = onChangeEvent = function() {
                onChangeTask.delay(me.checkChangeBuffer);
            };

            for (e = 0; e < eLen; e++) {
                event = events[e];

                if (event === 'propertychange') {
                    me.usesPropertychange = true;
                }

                me.mon(inputEl, event, onChangeEvent);
            }
        }
        me.callParent();
    },

    doComponentLayout: function() {
        var me = this,
            inputEl = me.inputEl,
            usesPropertychange = me.usesPropertychange,
            ename = 'propertychange',
            onChangeEvent = me.onChangeEvent;

        // In IE if propertychange is one of the checkChangeEvents, we need to remove
        // the listener prior to layout and re-add it after, to prevent it from firing
        // needlessly for attribute and style changes applied to the inputEl.
        if (usesPropertychange) {
            me.mun(inputEl, ename, onChangeEvent);
        }
        me.callParent(arguments);
        if (usesPropertychange) {
            me.mon(inputEl, ename, onChangeEvent);
        }
    },

    /**
     * @private Called when the field's dirty state changes. Adds/removes the {@link #dirtyCls} on the main element.
     * @param {Boolean} isDirty
     */
    onDirtyChange: function(isDirty) {
        this[isDirty ? 'addCls' : 'removeCls'](this.dirtyCls);
    },


    /**
     * Returns whether or not the field value is currently valid by {@link #getErrors validating} the
     * {@link #processRawValue processed raw value} of the field. **Note**: {@link #disabled} fields are
     * always treated as valid.
     *
     * @return {Boolean} True if the value is valid, else false
     */
    isValid : function() {
        var me = this,
            disabled = me.disabled,
            validate = me.forceValidation || !disabled;
            
        
        return validate ? me.validateValue(me.processRawValue(me.getRawValue())) : disabled;
    },


    /**
     * Uses {@link #getErrors} to build an array of validation errors. If any errors are found, they are passed to
     * {@link #markInvalid} and false is returned, otherwise true is returned.
     *
     * Previously, subclasses were invited to provide an implementation of this to process validations - from 3.2
     * onwards {@link #getErrors} should be overridden instead.
     *
     * @param {Object} value The value to validate
     * @return {Boolean} True if all validations passed, false if one or more failed
     */
    validateValue: function(value) {
        var me = this,
            errors = me.getErrors(value),
            isValid = Ext.isEmpty(errors);
        if (!me.preventMark) {
            if (isValid) {
                me.clearInvalid();
            } else {
                me.markInvalid(errors);
            }
        }

        return isValid;
    },

    /**
     * Display one or more error messages associated with this field, using {@link #msgTarget} to determine how to
     * display the messages and applying {@link #invalidCls} to the field's UI element.
     *
     * **Note**: this method does not cause the Field's {@link #validate} or {@link #isValid} methods to return `false`
     * if the value does _pass_ validation. So simply marking a Field as invalid will not prevent submission of forms
     * submitted with the {@link Ext.form.action.Submit#clientValidation} option set.
     *
     * @param {String/String[]} errors The validation message(s) to display.
     */
    markInvalid : function(errors) {
        // Save the message and fire the 'invalid' event
        var me = this,
            oldMsg = me.getActiveError();
        me.setActiveErrors(Ext.Array.from(errors));
        if (oldMsg !== me.getActiveError()) {
            me.updateLayout();
        }
    },

    /**
     * Clear any invalid styles/messages for this field.
     *
     * **Note**: this method does not cause the Field's {@link #validate} or {@link #isValid} methods to return `true`
     * if the value does not _pass_ validation. So simply clearing a field's errors will not necessarily allow
     * submission of forms submitted with the {@link Ext.form.action.Submit#clientValidation} option set.
     */
    clearInvalid : function() {
        // Clear the message and fire the 'valid' event
        var me = this,
            hadError = me.hasActiveError();
        me.unsetActiveError();
        if (hadError) {
            me.updateLayout();
        }
    },

    /**
     * @private Overrides the method from the Ext.form.Labelable mixin to also add the invalidCls to the inputEl,
     * as that is required for proper styling in IE with nested fields (due to lack of child selector)
     */
    renderActiveError: function() {
        var me = this,
            hasError = me.hasActiveError();
        if (me.inputEl) {
            // Add/remove invalid class
            me.inputEl[hasError ? 'addCls' : 'removeCls'](me.invalidCls + '-field');
        }
        me.mixins.labelable.renderActiveError.call(me);
    },


    getActionEl: function() {
        return this.inputEl || this.el;
    }

});

/**
 * @docauthor Robert Dougan <rob@sencha.com>
 *
 * Single checkbox field. Can be used as a direct replacement for traditional checkbox fields. Also serves as a
 * parent class for {@link Ext.form.field.Radio radio buttons}.
 *
 * # Labeling
 *
 * In addition to the {@link Ext.form.Labelable standard field labeling options}, checkboxes
 * may be given an optional {@link #boxLabel} which will be displayed immediately after checkbox. Also see
 * {@link Ext.form.CheckboxGroup} for a convenient method of grouping related checkboxes.
 *
 * # Values
 *
 * The main value of a checkbox is a boolean, indicating whether or not the checkbox is checked.
 * The following values will check the checkbox:
 *
 * - `true`
 * - `'true'`
 * - `'1'`
 * - `'on'`
 *
 * Any other value will uncheck the checkbox.
 *
 * In addition to the main boolean value, you may also specify a separate {@link #inputValue}. This will be
 * sent as the parameter value when the form is {@link Ext.form.Basic#submit submitted}. You will want to set
 * this value if you have multiple checkboxes with the same {@link #name}. If not specified, the value `on`
 * will be used.
 *
 * # Example usage
 *
 *     @example
 *     Ext.create('Ext.form.Panel', {
 *         bodyPadding: 10,
 *         width: 300,
 *         title: 'Pizza Order',
 *         items: [
 *             {
 *                 xtype: 'fieldcontainer',
 *                 fieldLabel: 'Toppings',
 *                 defaultType: 'checkboxfield',
 *                 items: [
 *                     {
 *                         boxLabel  : 'Anchovies',
 *                         name      : 'topping',
 *                         inputValue: '1',
 *                         id        : 'checkbox1'
 *                     }, {
 *                         boxLabel  : 'Artichoke Hearts',
 *                         name      : 'topping',
 *                         inputValue: '2',
 *                         checked   : true,
 *                         id        : 'checkbox2'
 *                     }, {
 *                         boxLabel  : 'Bacon',
 *                         name      : 'topping',
 *                         inputValue: '3',
 *                         id        : 'checkbox3'
 *                     }
 *                 ]
 *             }
 *         ],
 *         bbar: [
 *             {
 *                 text: 'Select Bacon',
 *                 handler: function() {
 *                     Ext.getCmp('checkbox3').setValue(true);
 *                 }
 *             },
 *             '-',
 *             {
 *                 text: 'Select All',
 *                 handler: function() {
 *                     Ext.getCmp('checkbox1').setValue(true);
 *                     Ext.getCmp('checkbox2').setValue(true);
 *                     Ext.getCmp('checkbox3').setValue(true);
 *                 }
 *             },
 *             {
 *                 text: 'Deselect All',
 *                 handler: function() {
 *                     Ext.getCmp('checkbox1').setValue(false);
 *                     Ext.getCmp('checkbox2').setValue(false);
 *                     Ext.getCmp('checkbox3').setValue(false);
 *                 }
 *             }
 *         ],
 *         renderTo: Ext.getBody()
 *     });
 */
Ext.define('Ext.form.field.Checkbox', {
    extend: 'Ext.form.field.Base',
    alias: ['widget.checkboxfield', 'widget.checkbox'],
    alternateClassName: 'Ext.form.Checkbox',
    requires: ['Ext.XTemplate', 'Ext.form.CheckboxManager' ],

    componentLayout: 'field',

    childEls: [
        /**
         * @property {Ext.Element} boxLabelEl
         * A reference to the label element created for the {@link #boxLabel}. Only present if the component has been
         * rendered and has a boxLabel configured.
         */
        'boxLabelEl'
    ],

    // note: {id} here is really {inputId}, but {cmpId} is available
    fieldSubTpl: [
        '<tpl if="boxLabel && boxLabelAlign == \'before\'">',
            '{beforeBoxLabelTpl}',
            '<label id="{cmpId}-boxLabelEl" {boxLabelAttrTpl} class="{boxLabelCls} {boxLabelCls}-{boxLabelAlign}" for="{id}">',
                '{beforeBoxLabelTextTpl}',
                '{boxLabel}',
                '{afterBoxLabelTextTpl}',
            '</label>',
            '{afterBoxLabelTpl}',
        '</tpl>',
        // Creates not an actual checkbox, but a button which is given aria role="checkbox" (If ARIA is required) and
        // styled with a custom checkbox image. This allows greater control and consistency in
        // styling, and using a button allows it to gain focus and handle keyboard nav properly.
        '<input type="button" id="{id}" {inputAttrTpl}',
            '<tpl if="tabIdx"> tabIndex="{tabIdx}"</tpl>',
            '<tpl if="disabled"> disabled="disabled"</tpl>',
            '<tpl if="fieldStyle"> style="{fieldStyle}"</tpl>',
            ' class="{fieldCls} {typeCls}" autocomplete="off" hidefocus="true" />',
        '<tpl if="boxLabel && boxLabelAlign == \'after\'">',
            '{beforeBoxLabelTpl}',
            '<label id="{cmpId}-boxLabelEl" {boxLabelAttrTpl} class="{boxLabelCls} {boxLabelCls}-{boxLabelAlign}" for="{id}">',
                '{beforeBoxLabelTextTpl}',
                '{boxLabel}',
                '{afterBoxLabelTextTpl}',
            '</label>',
            '{afterBoxLabelTpl}',
        '</tpl>',
        {
            disableFormats: true,
            compiled: true
        }
    ],

    subTplInsertions: [
        /**
         * @cfg {String/Array/Ext.XTemplate} beforeBoxLabelTpl
         * An optional string or `XTemplate` configuration to insert in the field markup
         * before the box label element. If an `XTemplate` is used, the component's
         * {@link Ext.form.field.Base#getSubTplData subTpl data} serves as the context.
         */
        'beforeBoxLabelTpl',

        /**
         * @cfg {String/Array/Ext.XTemplate} afterBoxLabelTpl
         * An optional string or `XTemplate` configuration to insert in the field markup
         * after the box label element. If an `XTemplate` is used, the component's
         * {@link Ext.form.field.Base#getSubTplData subTpl data} serves as the context.
         */
        'afterBoxLabelTpl',

        /**
         * @cfg {String/Array/Ext.XTemplate} beforeBoxLabelTextTpl
         * An optional string or `XTemplate` configuration to insert in the field markup
         * before the box label text. If an `XTemplate` is used, the component's
         * {@link Ext.form.field.Base#getSubTplData subTpl data} serves as the context.
         */
        'beforeBoxLabelTextTpl',

        /**
         * @cfg {String/Array/Ext.XTemplate} afterBoxLabelTextTpl
         * An optional string or `XTemplate` configuration to insert in the field markup
         * after the box label text. If an `XTemplate` is used, the component's
         * {@link Ext.form.field.Base#getSubTplData subTpl data} serves as the context.
         */
        'afterBoxLabelTextTpl',

        /**
         * @cfg {String/Array/Ext.XTemplate} boxLabelAttrTpl
         * An optional string or `XTemplate` configuration to insert in the field markup
         * inside the box label element (as attributes). If an `XTemplate` is used, the component's
         * {@link Ext.form.field.Base#getSubTplData subTpl data} serves as the context.
         */
        'boxLabelAttrTpl',

        // inherited
        'inputAttrTpl'
    ],

    /*
     * @property {Boolean} isCheckbox
     * `true` in this class to identify an object as an instantiated Checkbox, or subclass thereof.
     */
    isCheckbox: true,

    /**
     * @cfg {String} [focusCls='x-form-cb-focus']
     * The CSS class to use when the checkbox receives focus
     */
    focusCls: 'form-cb-focus',

    /**
     * @cfg {String} [fieldCls='x-form-field']
     * The default CSS class for the checkbox
     */

    /**
     * @cfg {String} [fieldBodyCls='x-form-cb-wrap']
     * An extra CSS class to be applied to the body content element in addition to {@link #fieldBodyCls}.
     * .
     */
    fieldBodyCls: Ext.baseCSSPrefix + 'form-cb-wrap',

    /**
     * @cfg {Boolean} checked
     * true if the checkbox should render initially checked
     */
    checked: false,

    /**
     * @cfg {String} [checkedCls='x-form-cb-checked']
     * The CSS class added to the component's main element when it is in the checked state.
     */
    checkedCls: Ext.baseCSSPrefix + 'form-cb-checked',

    /**
     * @cfg {String} boxLabel
     * An optional text label that will appear next to the checkbox. Whether it appears before or after the checkbox is
     * determined by the {@link #boxLabelAlign} config.
     */

    /**
     * @cfg {String} [boxLabelCls='x-form-cb-label']
     * The CSS class to be applied to the {@link #boxLabel} element
     */
    boxLabelCls: Ext.baseCSSPrefix + 'form-cb-label',

    /**
     * @cfg {String} boxLabelAlign
     * The position relative to the checkbox where the {@link #boxLabel} should appear. Recognized values are 'before'
     * and 'after'.
     */
    boxLabelAlign: 'after',

    /**
     * @cfg {String} inputValue
     * The value that should go into the generated input element's value attribute and should be used as the parameter
     * value when submitting as part of a form.
     */
    inputValue: 'on',

    /**
     * @cfg {String} uncheckedValue
     * If configured, this will be submitted as the checkbox's value during form submit if the checkbox is unchecked. By
     * default this is undefined, which results in nothing being submitted for the checkbox field when the form is
     * submitted (the default behavior of HTML checkboxes).
     */

    /**
     * @cfg {Function} handler
     * A function called when the {@link #checked} value changes (can be used instead of handling the {@link #change
     * change event}).
     * @cfg {Ext.form.field.Checkbox} handler.checkbox The Checkbox being toggled.
     * @cfg {Boolean} handler.checked The new checked state of the checkbox.
     */

    /**
     * @cfg {Object} scope
     * An object to use as the scope ('this' reference) of the {@link #handler} function.
     *
     * Defaults to this Checkbox.
     */

    // private overrides
    checkChangeEvents: [],
    inputType: 'checkbox',

    // private
    onRe: /^on$/i,

    initComponent: function() {
        this.callParent(arguments);
        this.getManager().add(this);
    },

    initValue: function() {
        var me = this,
            checked = !!me.checked;

        /**
         * @property {Object} originalValue
         * The original value of the field as configured in the {@link #checked} configuration, or as loaded by the last
         * form load operation if the form's {@link Ext.form.Basic#trackResetOnLoad trackResetOnLoad} setting is `true`.
         */
        me.originalValue = me.lastValue = checked;

        // Set the initial checked state
        me.setValue(checked);
    },

    getElConfig: function() {
        var me = this;

        // Add the checked class if this begins checked
        if (me.isChecked(me.rawValue, me.inputValue)) {
            me.addCls(me.checkedCls);
        }
        return me.callParent();
    },

    getFieldStyle: function() {
        return Ext.isObject(this.fieldStyle) ? Ext.DomHelper.generateStyles(this.fieldStyle) : this.fieldStyle ||'';
    },

    getSubTplData: function() {
        var me = this;
        return Ext.apply(me.callParent(), {
            disabled      : me.readOnly || me.disabled,
            boxLabel      : me.boxLabel,
            boxLabelCls   : me.boxLabelCls,
            boxLabelAlign : me.boxLabelAlign
        });
    },

    initEvents: function() {
        var me = this;
        me.callParent();
        me.mon(me.inputEl, 'click', me.onBoxClick, me);
    },

    /**
     * @private Handle click on the checkbox button
     */
    onBoxClick: function(e) {
        var me = this;
        if (!me.disabled && !me.readOnly) {
            this.setValue(!this.checked);
        }
    },

    /**
     * Returns the checked state of the checkbox.
     * @return {Boolean} True if checked, else false
     */
    getRawValue: function() {
        return this.checked;
    },

    /**
     * Returns the checked state of the checkbox.
     * @return {Boolean} True if checked, else false
     */
    getValue: function() {
        return this.checked;
    },

    /**
     * Returns the submit value for the checkbox which can be used when submitting forms.
     * @return {String} If checked the {@link #inputValue} is returned; otherwise the {@link #uncheckedValue}
     * (or null if the latter is not configured).
     */
    getSubmitValue: function() {
        var unchecked = this.uncheckedValue,
            uncheckedVal = Ext.isDefined(unchecked) ? unchecked : null;
        return this.checked ? this.inputValue : uncheckedVal;
    },

    isChecked: function(rawValue, inputValue) {
        return (rawValue === true || rawValue === 'true' || rawValue === '1' || rawValue === 1 ||
                      (((Ext.isString(rawValue) || Ext.isNumber(rawValue)) && inputValue) ? rawValue == inputValue : this.onRe.test(rawValue)));
    },

    /**
     * Sets the checked state of the checkbox.
     *
     * @param {Boolean/String/Number} value The following values will check the checkbox:
     * `true, 'true', '1', 1, or 'on'`, as well as a String that matches the {@link #inputValue}.
     * Any other value will uncheck the checkbox.
     * @return {Boolean} the new checked state of the checkbox
     */
    setRawValue: function(value) {
        var me = this,
            inputEl = me.inputEl,
            checked = me.isChecked(value, me.inputValue);

        if (inputEl) {
            me[checked ? 'addCls' : 'removeCls'](me.checkedCls);
        }

        me.checked = me.rawValue = checked;
        return checked;
    },

    /**
     * Sets the checked state of the checkbox, and invokes change detection.
     * @param {Boolean/String} checked The following values will check the checkbox: `true, 'true', '1', or 'on'`, as
     * well as a String that matches the {@link #inputValue}. Any other value will uncheck the checkbox.
     * @return {Ext.form.field.Checkbox} this
     */
    setValue: function(checked) {
        var me = this,
            boxes, i, len, box;

        // If an array of strings is passed, find all checkboxes in the group with the same name as this
        // one and check all those whose inputValue is in the array, unchecking all the others. This is to
        // facilitate setting values from Ext.form.Basic#setValues, but is not publicly documented as we
        // don't want users depending on this behavior.
        if (Ext.isArray(checked)) {
            boxes = me.getManager().getByName(me.name, me.getFormId()).items;
            len = boxes.length;

            for (i = 0; i < len; ++i) {
                box = boxes[i];
                box.setValue(Ext.Array.contains(checked, box.inputValue));
            }
        } else {
            me.callParent(arguments);
        }

        return me;
    },

    // private
    valueToRaw: function(value) {
        // No extra conversion for checkboxes
        return value;
    },

    /**
     * @private
     * Called when the checkbox's checked state changes. Invokes the {@link #handler} callback
     * function if specified.
     */
    onChange: function(newVal, oldVal) {
        var me = this,
            handler = me.handler;
        if (handler) {
            handler.call(me.scope || me, me, newVal);
        }
        me.callParent(arguments);
    },
    
    resetOriginalValue: function(/* private */ fromBoxInGroup){
        var me = this,
            boxes,
            box,
            len,
            i;
            
        // If we're resetting the value of a field in a group, also reset the others.
        if (!fromBoxInGroup) {
            boxes = me.getManager().getByName(me.name, me.getFormId()).items;
            len  = boxes.length;
            
            for (i = 0; i < len; ++i) {
                box = boxes[i];
                if (box !== me) {
                    boxes[i].resetOriginalValue(true);
                }
            }
        }
        me.callParent();
    },

    // inherit docs
    beforeDestroy: function(){
        this.callParent();
        this.getManager().removeAtKey(this.id);
    },

    // inherit docs
    getManager: function() {
        return Ext.form.CheckboxManager;
    },

    onEnable: function() {
        var me = this,
            inputEl = me.inputEl;
        me.callParent();
        if (inputEl) {
            // Can still be disabled if the field is readOnly
            inputEl.dom.disabled = me.readOnly;
        }
    },

    setReadOnly: function(readOnly) {
        var me = this,
            inputEl = me.inputEl;
        if (inputEl) {
            // Set the button to disabled when readonly
            inputEl.dom.disabled = !!readOnly || me.disabled;
        }
        me.callParent(arguments);
    },

    getFormId: function(){
        var me = this,
            form;

        if (!me.formId) {
            form = me.up('form');
            if (form) {
                me.formId = form.id;
            }
        }
        return me.formId;
    }
});

/**
 * A display-only text field which is not validated and not submitted. This is useful for when you want to display a
 * value from a form's {@link Ext.form.Basic#load loaded data} but do not want to allow the user to edit or submit that
 * value. The value can be optionally {@link #htmlEncode HTML encoded} if it contains HTML markup that you do not want
 * to be rendered.
 *
 * If you have more complex content, or need to include components within the displayed content, also consider using a
 * {@link Ext.form.FieldContainer} instead.
 *
 * Example:
 *
 *     @example
 *     Ext.create('Ext.form.Panel', {
 *         renderTo: Ext.getBody(),
 *         width: 175,
 *         height: 120,
 *         bodyPadding: 10,
 *         title: 'Final Score',
 *         items: [{
 *             xtype: 'displayfield',
 *             fieldLabel: 'Home',
 *             name: 'home_score',
 *             value: '10'
 *         }, {
 *             xtype: 'displayfield',
 *             fieldLabel: 'Visitor',
 *             name: 'visitor_score',
 *             value: '11'
 *         }],
 *         buttons: [{
 *             text: 'Update'
 *         }]
 *     });
 */
Ext.define('Ext.form.field.Display', {
    extend:'Ext.form.field.Base',
    alias: 'widget.displayfield',
    requires: ['Ext.util.Format', 'Ext.XTemplate'],
    alternateClassName: ['Ext.form.DisplayField', 'Ext.form.Display'],
    fieldSubTpl: [
        '<div id="{id}"',
        '<tpl if="fieldStyle"> style="{fieldStyle}"</tpl>', 
        ' class="{fieldCls}">{value}</div>',
        {
            compiled: true,
            disableFormats: true
        }
    ],

    /**
     * @cfg {String} [fieldCls="x-form-display-field"]
     * The default CSS class for the field.
     */
    fieldCls: Ext.baseCSSPrefix + 'form-display-field',

    /**
     * @cfg {Boolean} htmlEncode
     * True to escape HTML in text when rendering it.
     */
    htmlEncode: false,
    
    /**
     * @cfg {Function} renderer
     * A function to transform the raw value for display in the field. The function will receive 2 arguments, the raw value
     * and the {@link Ext.form.field.Display} object.
     */
    
    /**
     * @cfg {Object} scope
     * The scope to execute the {@link #renderer} function. Defaults to this.
     */

    validateOnChange: false,

    initEvents: Ext.emptyFn,

    submitValue: false,
    
    isDirty: function(){
        return false;
    },

    isValid: function() {
        return true;
    },

    validate: function() {
        return true;
    },

    getRawValue: function() {
        return this.rawValue;
    },

    setRawValue: function(value) {
        var me = this,
            display;
            
        value = Ext.value(value, '');
        me.rawValue = value;
        if (me.rendered) {
            me.inputEl.dom.innerHTML = me.getDisplayValue();
            me.updateLayout();
        }
        return value;
    },

    /**
     * @private
     * Format the value to display.
     */
    getDisplayValue: function() {
        var me = this,
            value = this.getRawValue(),
            display;
        if (me.renderer) {
             display = me.renderer.call(me.scope || me, value, me);
        } else {
             display = me.htmlEncode ? Ext.util.Format.htmlEncode(value) : value;
        }
        return display;
    },
        
    getSubTplData: function() {
        var ret = this.callParent(arguments);

        ret.value = this.getDisplayValue();

        return ret;
    }

    /**
     * @cfg {String} inputType
     * @private
     */
    /**
     * @cfg {Boolean} disabled
     * @private
     */
    /**
     * @cfg {Boolean} readOnly
     * @private
     */
    /**
     * @cfg {Boolean} validateOnChange
     * @private
     */
    /**
     * @cfg {Number} checkChangeEvents
     * @private
     */
    /**
     * @cfg {Number} checkChangeBuffer
     * @private
     */
});

/**
 * A basic hidden field for storing hidden values in forms that need to be passed in the form submit.
 *
 * This creates an actual input element with type="submit" in the DOM. While its label is
 * {@link #hideLabel not rendered} by default, it is still a real component and may be sized according
 * to its owner container's layout.
 *
 * Because of this, in most cases it is more convenient and less problematic to simply
 * {@link Ext.form.action.Action#params pass hidden parameters} directly when
 * {@link Ext.form.Basic#submit submitting the form}.
 *
 * Example:
 *
 *     new Ext.form.Panel({
 *         title: 'My Form',
 *         items: [{
 *             xtype: 'textfield',
 *             fieldLabel: 'Text Field',
 *             name: 'text_field',
 *             value: 'value from text field'
 *         }, {
 *             xtype: 'hiddenfield',
 *             name: 'hidden_field_1',
 *             value: 'value from hidden field'
 *         }],
 *
 *         buttons: [{
 *             text: 'Submit',
 *             handler: function() {
 *                 this.up('form').getForm().submit({
 *                     params: {
 *                         hidden_field_2: 'value from submit call'
 *                     }
 *                 });
 *             }
 *         }]
 *     });
 *
 * Submitting the above form will result in three values sent to the server:
 *
 *     text_field=value+from+text+field&hidden;_field_1=value+from+hidden+field&hidden_field_2=value+from+submit+call
 *
 */
Ext.define('Ext.form.field.Hidden', {
    extend:'Ext.form.field.Base',
    alias: ['widget.hiddenfield', 'widget.hidden'],
    alternateClassName: 'Ext.form.Hidden',

    // private
    inputType : 'hidden',
    hideLabel: true,
    
    initComponent: function(){
        this.formItemCls += '-hidden';
        this.callParent();    
    },
    
    /**
     * @private
     * Override. Treat undefined and null values as equal to an empty string value.
     */
    isEqual: function(value1, value2) {
        return this.isEqualAsString(value1, value2);
    },

    // These are all private overrides
    initEvents: Ext.emptyFn,
    setSize : Ext.emptyFn,
    setWidth : Ext.emptyFn,
    setHeight : Ext.emptyFn,
    setPosition : Ext.emptyFn,
    setPagePosition : Ext.emptyFn,
    markInvalid : Ext.emptyFn,
    clearInvalid : Ext.emptyFn
});

/**
 * @docauthor Robert Dougan <rob@sencha.com>
 *
 * Single radio field. Similar to checkbox, but automatically handles making sure only one radio is checked
 * at a time within a group of radios with the same name.
 *
 * # Labeling
 *
 * In addition to the {@link Ext.form.Labelable standard field labeling options}, radio buttons
 * may be given an optional {@link #boxLabel} which will be displayed immediately to the right of the input. Also
 * see {@link Ext.form.RadioGroup} for a convenient method of grouping related radio buttons.
 *
 * # Values
 *
 * The main value of a Radio field is a boolean, indicating whether or not the radio is checked.
 *
 * The following values will check the radio:
 *
 * - `true`
 * - `'true'`
 * - `'1'`
 * - `'on'`
 *
 * Any other value will uncheck it.
 *
 * In addition to the main boolean value, you may also specify a separate {@link #inputValue}. This will be sent
 * as the parameter value when the form is {@link Ext.form.Basic#submit submitted}. You will want to set this
 * value if you have multiple radio buttons with the same {@link #name}, as is almost always the case.
 *
 * # Example usage
 *
 *     @example
 *     Ext.create('Ext.form.Panel', {
 *         title      : 'Order Form',
 *         width      : 300,
 *         bodyPadding: 10,
 *         renderTo   : Ext.getBody(),
 *         items: [
 *             {
 *                 xtype      : 'fieldcontainer',
 *                 fieldLabel : 'Size',
 *                 defaultType: 'radiofield',
 *                 defaults: {
 *                     flex: 1
 *                 },
 *                 layout: 'hbox',
 *                 items: [
 *                     {
 *                         boxLabel  : 'M',
 *                         name      : 'size',
 *                         inputValue: 'm',
 *                         id        : 'radio1'
 *                     }, {
 *                         boxLabel  : 'L',
 *                         name      : 'size',
 *                         inputValue: 'l',
 *                         id        : 'radio2'
 *                     }, {
 *                         boxLabel  : 'XL',
 *                         name      : 'size',
 *                         inputValue: 'xl',
 *                         id        : 'radio3'
 *                     }
 *                 ]
 *             },
 *             {
 *                 xtype      : 'fieldcontainer',
 *                 fieldLabel : 'Color',
 *                 defaultType: 'radiofield',
 *                 defaults: {
 *                     flex: 1
 *                 },
 *                 layout: 'hbox',
 *                 items: [
 *                     {
 *                         boxLabel  : 'Blue',
 *                         name      : 'color',
 *                         inputValue: 'blue',
 *                         id        : 'radio4'
 *                     }, {
 *                         boxLabel  : 'Grey',
 *                         name      : 'color',
 *                         inputValue: 'grey',
 *                         id        : 'radio5'
 *                     }, {
 *                         boxLabel  : 'Black',
 *                         name      : 'color',
 *                         inputValue: 'black',
 *                         id        : 'radio6'
 *                     }
 *                 ]
 *             }
 *         ],
 *         bbar: [
 *             {
 *                 text: 'Smaller Size',
 *                 handler: function() {
 *                     var radio1 = Ext.getCmp('radio1'),
 *                         radio2 = Ext.getCmp('radio2'),
 *                         radio3 = Ext.getCmp('radio3');
 *
 *                     //if L is selected, change to M
 *                     if (radio2.getValue()) {
 *                         radio1.setValue(true);
 *                         return;
 *                     }
 *
 *                     //if XL is selected, change to L
 *                     if (radio3.getValue()) {
 *                         radio2.setValue(true);
 *                         return;
 *                     }
 *
 *                     //if nothing is set, set size to S
 *                     radio1.setValue(true);
 *                 }
 *             },
 *             {
 *                 text: 'Larger Size',
 *                 handler: function() {
 *                     var radio1 = Ext.getCmp('radio1'),
 *                         radio2 = Ext.getCmp('radio2'),
 *                         radio3 = Ext.getCmp('radio3');
 *
 *                     //if M is selected, change to L
 *                     if (radio1.getValue()) {
 *                         radio2.setValue(true);
 *                         return;
 *                     }
 *
 *                     //if L is selected, change to XL
 *                     if (radio2.getValue()) {
 *                         radio3.setValue(true);
 *                         return;
 *                     }
 *
 *                     //if nothing is set, set size to XL
 *                     radio3.setValue(true);
 *                 }
 *             },
 *             '-',
 *             {
 *                 text: 'Select color',
 *                 menu: {
 *                     indent: false,
 *                     items: [
 *                         {
 *                             text: 'Blue',
 *                             handler: function() {
 *                                 var radio = Ext.getCmp('radio4');
 *                                 radio.setValue(true);
 *                             }
 *                         },
 *                         {
 *                             text: 'Grey',
 *                             handler: function() {
 *                                 var radio = Ext.getCmp('radio5');
 *                                 radio.setValue(true);
 *                             }
 *                         },
 *                         {
 *                             text: 'Black',
 *                             handler: function() {
 *                                 var radio = Ext.getCmp('radio6');
 *                                 radio.setValue(true);
 *                             }
 *                         }
 *                     ]
 *                 }
 *             }
 *         ]
 *     });
 */
Ext.define('Ext.form.field.Radio', {
    extend:'Ext.form.field.Checkbox',
    alias: ['widget.radiofield', 'widget.radio'],
    alternateClassName: 'Ext.form.Radio',
    requires: ['Ext.form.RadioManager'],

    /**
     * @property {Boolean} isRadio
     * `true` in this class to identify an object as an instantiated Radio, or subclass thereof.
     */
    isRadio: true,

    /**
     * @cfg {String} uncheckedValue
     * @private
     */

    // private
    inputType: 'radio',
    ariaRole: 'radio',
    
    formId: null,

    /**
     * If this radio is part of a group, it will return the selected value
     * @return {String}
     */
    getGroupValue: function() {
        var selected = this.getManager().getChecked(this.name, this.getFormId());
        return selected ? selected.inputValue : null;
    },

    /**
     * @private Handle click on the radio button
     */
    onBoxClick: function(e) {
        var me = this;
        if (!me.disabled && !me.readOnly) {
            this.setValue(true);
        }
    },
    
    onRemoved: function(){
        this.callParent(arguments);
        this.formId = null;
    },

    /**
     * Sets either the checked/unchecked status of this Radio, or, if a string value is passed, checks a sibling Radio
     * of the same name whose value is the value specified.
     * @param {String/Boolean} value Checked value, or the value of the sibling radio button to check.
     * @return {Ext.form.field.Radio} this
     */
    setValue: function(v) {
        var me = this,
            active;

        if (Ext.isBoolean(v)) {
            me.callParent(arguments);
        } else {
            active = me.getManager().getWithValue(me.name, v, me.getFormId()).getAt(0);
            if (active) {
                active.setValue(true);
            }
        }
        return me;
    },

    /**
     * Returns the submit value for the checkbox which can be used when submitting forms.
     * @return {Boolean/Object} True if checked, null if not.
     */
    getSubmitValue: function() {
        return this.checked ? this.inputValue : null;
    },

    getModelData: function() {
        return this.getSubmitData();
    },

    // inherit docs
    onChange: function(newVal, oldVal) {
        var me = this,
            r, rLen, radio, radios;

        me.callParent(arguments);

        if (newVal) {
            radios = me.getManager().getByName(me.name, me.getFormId()).items;
            rLen   = radios.length;

            for (r = 0; r < rLen; r++) {
                radio = radios[r];

                if (radio !== me) {
                    radio.setValue(false);
                }
            }
        }
    },

    // inherit docs
    getManager: function() {
        return Ext.form.RadioManager;
    }
});





/**
 * @docauthor Jason Johnston <jason@sencha.com>
 *
 * A basic text field.  Can be used as a direct replacement for traditional text inputs,
 * or as the base class for more sophisticated input controls (like {@link Ext.form.field.TextArea}
 * and {@link Ext.form.field.ComboBox}). Has support for empty-field placeholder values (see {@link #emptyText}).
 *
 * # Validation
 *
 * The Text field has a useful set of validations built in:
 *
 * - {@link #allowBlank} for making the field required
 * - {@link #minLength} for requiring a minimum value length
 * - {@link #maxLength} for setting a maximum value length (with {@link #enforceMaxLength} to add it
 *   as the `maxlength` attribute on the input element)
 * - {@link #regex} to specify a custom regular expression for validation
 *
 * In addition, custom validations may be added:
 *
 * - {@link #vtype} specifies a virtual type implementation from {@link Ext.form.field.VTypes} which can contain
 *   custom validation logic
 * - {@link #validator} allows a custom arbitrary function to be called during validation
 *
 * The details around how and when each of these validation options get used are described in the
 * documentation for {@link #getErrors}.
 *
 * By default, the field value is checked for validity immediately while the user is typing in the
 * field. This can be controlled with the {@link #validateOnChange}, {@link #checkChangeEvents}, and
 * {@link #checkChangeBuffer} configurations. Also see the details on Form Validation in the
 * {@link Ext.form.Panel} class documentation.
 *
 * # Masking and Character Stripping
 *
 * Text fields can be configured with custom regular expressions to be applied to entered values before
 * validation: see {@link #maskRe} and {@link #stripCharsRe} for details.
 *
 * # Example usage
 *
 *     @example
 *     Ext.create('Ext.form.Panel', {
 *         title: 'Contact Info',
 *         width: 300,
 *         bodyPadding: 10,
 *         renderTo: Ext.getBody(),
 *         items: [{
 *             xtype: 'textfield',
 *             name: 'name',
 *             fieldLabel: 'Name',
 *             allowBlank: false  // requires a non-empty value
 *         }, {
 *             xtype: 'textfield',
 *             name: 'email',
 *             fieldLabel: 'Email Address',
 *             vtype: 'email'  // requires value to be a valid email address format
 *         }]
 *     });
 */
Ext.define('Ext.form.field.Text', {
    extend:'Ext.form.field.Base',
    alias: 'widget.textfield',
    requires: ['Ext.form.field.VTypes', 'Ext.layout.component.field.Text'],
    alternateClassName: ['Ext.form.TextField', 'Ext.form.Text'],

    /**
     * @cfg {String} vtypeText
     * A custom error message to display in place of the default message provided for the **`{@link #vtype}`** currently
     * set for this field. **Note**: only applies if **`{@link #vtype}`** is set, else ignored.
     */

    /**
     * @cfg {RegExp} stripCharsRe
     * A JavaScript RegExp object used to strip unwanted content from the value
     * during input. If `stripCharsRe` is specified,
     * every *character sequence* matching `stripCharsRe` will be removed.
     */

    /**
     * @cfg {Number} size
     * An initial value for the 'size' attribute on the text input element. This is only used if the field has no
     * configured {@link #width} and is not given a width by its container's layout. Defaults to 20.
     */
    size: 20,

    /**
     * @cfg {Boolean} [grow=false]
     * true if this field should automatically grow and shrink to its content
     */

    /**
     * @cfg {Number} growMin
     * The minimum width to allow when `{@link #grow} = true`
     */
    growMin : 30,

    /**
     * @cfg {Number} growMax
     * The maximum width to allow when `{@link #grow} = true`
     */
    growMax : 800,

    //<locale>
    /**
     * @cfg {String} growAppend
     * A string that will be appended to the field's current value for the purposes of calculating the target field
     * size. Only used when the {@link #grow} config is true. Defaults to a single capital "W" (the widest character in
     * common fonts) to leave enough space for the next typed character and avoid the field value shifting before the
     * width is adjusted.
     */
    growAppend: 'W',
    //</locale>

    /**
     * @cfg {String} vtype
     * A validation type name as defined in {@link Ext.form.field.VTypes}
     */

    /**
     * @cfg {RegExp} maskRe An input mask regular expression that will be used to filter keystrokes (character being
     * typed) that do not match.
     * Note: It does not filter characters already in the input.
     */

    /**
     * @cfg {Boolean} [disableKeyFilter=false]
     * Specify true to disable input keystroke filtering
     */

    /**
     * @cfg {Boolean} allowBlank
     * Specify false to validate that the value's length is > 0
     */
    allowBlank : true,

    /**
     * @cfg {Number} minLength
     * Minimum input field length required
     */
    minLength : 0,

    /**
     * @cfg {Number} maxLength
     * Maximum input field length allowed by validation. This behavior is intended to
     * provide instant feedback to the user by improving usability to allow pasting and editing or overtyping and back
     * tracking. To restrict the maximum number of characters that can be entered into the field use the
     * **{@link Ext.form.field.Text#enforceMaxLength enforceMaxLength}** option.
     *
     * Defaults to Number.MAX_VALUE.
     */
    maxLength : Number.MAX_VALUE,

    /**
     * @cfg {Boolean} enforceMaxLength
     * True to set the maxLength property on the underlying input field. Defaults to false
     */

    /**
     * @cfg {String} minLengthText
     * Error text to display if the **{@link #minLength minimum length}** validation fails.
     */
    //<locale>
    minLengthText : 'The minimum length for this field is {0}',
    //</locale>

    //<locale>
    /**
     * @cfg {String} maxLengthText
     * Error text to display if the **{@link #maxLength maximum length}** validation fails
     */
    maxLengthText : 'The maximum length for this field is {0}',
    //</locale>

    /**
     * @cfg {Boolean} [selectOnFocus=false]
     * true to automatically select any existing field text when the field receives input focus
     */

    //<locale>
    /**
     * @cfg {String} blankText
     * The error text to display if the **{@link #allowBlank}** validation fails
     */
    blankText : 'This field is required',
    //</locale>

    /**
     * @cfg {Function} validator
     * A custom validation function to be called during field validation ({@link #getErrors}).
     * If specified, this function will be called first, allowing the developer to override the default validation
     * process.
     *
     * This function will be passed the following parameters:
     *
     * @cfg {Object} validator.value The current field value
     * @cfg {Boolean/String} validator.return
     *
     * - True if the value is valid
     * - An error message if the value is invalid
     */

    /**
     * @cfg {RegExp} regex
     * A JavaScript RegExp object to be tested against the field value during validation.
     * If the test fails, the field will be marked invalid using
     * either **{@link #regexText}** or **{@link #invalidText}**.
     */

    /**
     * @cfg {String} regexText
     * The error text to display if **{@link #regex}** is used and the test fails during validation
     */
    regexText : '',

    /**
     * @cfg {String} emptyText
     * The default text to place into an empty field.
     *
     * Note that normally this value will be submitted to the server if this field is enabled; to prevent this you can
     * set the {@link Ext.form.action.Action#submitEmptyText submitEmptyText} option of {@link Ext.form.Basic#submit} to
     * false.
     *
     * Also note that if you use {@link #inputType inputType}:'file', {@link #emptyText} is not supported and should be
     * avoided.
     *
     * Note that for browsers that support it, setting this property will use the HTML 5 placeholder attribute, and for
     * older browsers that don't support the HTML 5 placeholder attribute the value will be placed directly into the input
     * element itself as the raw value. This means that older browsers will obfuscate the {@link #emptyText} value for
     * password input fields.
     */

    /**
     * @cfg {String} [emptyCls='x-form-empty-field']
     * The CSS class to apply to an empty field to style the **{@link #emptyText}**.
     * This class is automatically added and removed as needed depending on the current field value.
     */
    emptyCls : Ext.baseCSSPrefix + 'form-empty-field',

    /**
     * @cfg {String} [requiredCls='x-form-required-field']
     * The CSS class to apply to a required field, i.e. a field where **{@link #allowBlank}** is false.
     */
    requiredCls : Ext.baseCSSPrefix + 'form-required-field',

    /**
     * @cfg {Boolean} [enableKeyEvents=false]
     * true to enable the proxying of key events for the HTML input field
     */

    componentLayout: 'textfield',

    // private
    valueContainsPlaceholder : false,


    initComponent: function () {
        var me = this;

        me.callParent();

        me.addEvents(
            /**
             * @event autosize
             * Fires when the **{@link #autoSize}** function is triggered and the field is resized according to the
             * {@link #grow}/{@link #growMin}/{@link #growMax} configs as a result. This event provides a hook for the
             * developer to apply additional logic at runtime to resize the field if needed.
             * @param {Ext.form.field.Text} this This text field
             * @param {Number} width The new field width
             */
            'autosize',

            /**
             * @event keydown
             * Keydown input field event. This event only fires if **{@link #enableKeyEvents}** is set to true.
             * @param {Ext.form.field.Text} this This text field
             * @param {Ext.EventObject} e
             */
            'keydown',
            /**
             * @event keyup
             * Keyup input field event. This event only fires if **{@link #enableKeyEvents}** is set to true.
             * @param {Ext.form.field.Text} this This text field
             * @param {Ext.EventObject} e
             */
            'keyup',
            /**
             * @event keypress
             * Keypress input field event. This event only fires if **{@link #enableKeyEvents}** is set to true.
             * @param {Ext.form.field.Text} this This text field
             * @param {Ext.EventObject} e
             */
            'keypress'
        );
        me.addStateEvents('change');
        me.setGrowSizePolicy();
    },

    // private
    setGrowSizePolicy: function(){
        if (this.grow) {
            this.shrinkWrap |= 1; // width must shrinkWrap
        }    
    },

    // private
    initEvents : function(){
        var me = this,
            el = me.inputEl;

        me.callParent();
        if(me.selectOnFocus || me.emptyText){
            me.mon(el, 'mousedown', me.onMouseDown, me);
        }
        if(me.maskRe || (me.vtype && me.disableKeyFilter !== true && (me.maskRe = Ext.form.field.VTypes[me.vtype+'Mask']))){
            me.mon(el, 'keypress', me.filterKeys, me);
        }

        if (me.enableKeyEvents) {
            me.mon(el, {
                scope: me,
                keyup: me.onKeyUp,
                keydown: me.onKeyDown,
                keypress: me.onKeyPress
            });
        }
    },

    /**
     * @private
     * Override. Treat undefined and null values as equal to an empty string value.
     */
    isEqual: function(value1, value2) {
        return this.isEqualAsString(value1, value2);
    },

    /**
     * @private
     * If grow=true, invoke the autoSize method when the field's value is changed.
     */
    onChange: function() {
        this.callParent();
        this.autoSize();
    },

    getSubTplData: function() {
        var me = this,
            value = me.getRawValue(),
            isEmpty = me.emptyText && value.length < 1,
            maxLength = me.maxLength,
            placeholder;
            
        // We can't just dump the value here, since MAX_VALUE ends up
        // being something like 1.xxxxe+300, which gets interpreted as 1
        // in the markup
        if (me.enforceMaxLength) {
            if (maxLength === Number.MAX_VALUE) {
                maxLength = undefined;
            }
        } else {
            maxLength = undefined;
        }

        if (isEmpty) {
            if (Ext.supports.Placeholder) {
                placeholder = me.emptyText;
            } else {
                value = me.emptyText;
                me.valueContainsPlaceholder = true;
            }
        }

        return Ext.apply(me.callParent(), {
            maxLength   : maxLength,
            readOnly    : me.readOnly,
            placeholder : placeholder,
            value       : value,
            fieldCls    : me.fieldCls + ((isEmpty && (placeholder || value)) ? ' ' + me.emptyCls : '') + (me.allowBlank ? '' :  ' ' + me.requiredCls)
        });
    },

    afterRender: function(){
        this.autoSize();
        this.callParent();
    },

    onMouseDown: function(e){
        var me = this;
        if(!me.hasFocus){
            me.mon(me.inputEl, 'mouseup', Ext.emptyFn, me, { single: true, preventDefault: true });
        }
    },

    /**
     * Performs any necessary manipulation of a raw String value to prepare it for conversion and/or
     * {@link #validate validation}. For text fields this applies the configured {@link #stripCharsRe}
     * to the raw value.
     * @param {String} value The unprocessed string value
     * @return {String} The processed string value
     */
    processRawValue: function(value) {
        var me = this,
            stripRe = me.stripCharsRe,
            newValue;

        if (stripRe) {
            newValue = value.replace(stripRe, '');
            if (newValue !== value) {
                me.setRawValue(newValue);
                value = newValue;
            }
        }
        return value;
    },

    //private
    onDisable: function(){
        this.callParent();
        if (Ext.isIE) {
            this.inputEl.dom.unselectable = 'on';
        }
    },

    //private
    onEnable: function(){
        this.callParent();
        if (Ext.isIE) {
            this.inputEl.dom.unselectable = '';
        }
    },

    onKeyDown: function(e) {
        this.fireEvent('keydown', this, e);
    },

    onKeyUp: function(e) {
        this.fireEvent('keyup', this, e);
    },

    onKeyPress: function(e) {
        this.fireEvent('keypress', this, e);
    },

    /**
     * Resets the current field value to the originally-loaded value and clears any validation messages.
     * Also adds **{@link #emptyText}** and **{@link #emptyCls}** if the original value was blank.
     */
    reset : function(){
        this.callParent();
        this.applyEmptyText();
    },

    applyEmptyText : function(){
        var me = this,
            emptyText = me.emptyText,
            isEmpty;

        if (me.rendered && emptyText) {
            isEmpty = me.getRawValue().length < 1 && !me.hasFocus;

            if (Ext.supports.Placeholder) {
                me.inputEl.dom.placeholder = emptyText;
            } else if (isEmpty) {
                me.setRawValue(emptyText);
                me.valueContainsPlaceholder = true;
            }

            //all browsers need this because of a styling issue with chrome + placeholders.
            //the text isnt vertically aligned when empty (and using the placeholder)
            if (isEmpty) {
                me.inputEl.addCls(me.emptyCls);
            }

            me.autoSize();
        }
    },
    
    afterFirstLayout: function() {
        this.callParent();
        if (Ext.isIE && this.disabled) {
            var el = this.inputEl;
            if (el) {
                el.dom.unselectable = 'on';
            }
        }
    },
    
    // private
    preFocus : function(){
        var me = this,
            inputEl = me.inputEl,
            emptyText = me.emptyText,
            isEmpty;

        me.callParent(arguments);
        if ((emptyText && !Ext.supports.Placeholder) && (inputEl.dom.value === me.emptyText && me.valueContainsPlaceholder)) {
            me.setRawValue('');
            isEmpty = true;
            inputEl.removeCls(me.emptyCls);
            me.valueContainsPlaceholder = false;
        } else if (Ext.supports.Placeholder) {
            me.inputEl.removeCls(me.emptyCls);
        }
        if (me.selectOnFocus || isEmpty) {
            inputEl.dom.select();
        }
    },

    onFocus: function() {
        var me = this;
        me.callParent(arguments);
        if (me.emptyText) {
            me.autoSize();
        }
    },

    // private
    postBlur : function(){
        this.callParent(arguments);
        this.applyEmptyText();
    },

    // private
    filterKeys : function(e){
        /*
         * On European keyboards, the right alt key, Alt Gr, is used to type certain special characters.
         * JS detects a keypress of this as ctrlKey & altKey. As such, we check that alt isn't pressed
         * so we can still process these special characters.
         */
        if (e.ctrlKey && !e.altKey) {
            return;
        }
        var key = e.getKey(),
            charCode = String.fromCharCode(e.getCharCode());

        if((Ext.isGecko || Ext.isOpera) && (e.isNavKeyPress() || key === e.BACKSPACE || (key === e.DELETE && e.button === -1))){
            return;
        }

        if((!Ext.isGecko && !Ext.isOpera) && e.isSpecialKey() && !charCode){
            return;
        }
        if(!this.maskRe.test(charCode)){
            e.stopEvent();
        }
    },

    getState: function() {
        return this.addPropertyToState(this.callParent(), 'value');
    },

    applyState: function(state) {
        this.callParent(arguments);
        if(state.hasOwnProperty('value')) {
            this.setValue(state.value);
        }
    },

    /**
     * Returns the raw String value of the field, without performing any normalization, conversion, or validation. Gets
     * the current value of the input element if the field has been rendered, ignoring the value if it is the
     * {@link #emptyText}. To get a normalized and converted value see {@link #getValue}.
     * @return {String} The raw String value of the field
     */
    getRawValue: function() {
        var me = this,
            v = me.callParent();
        if (v === me.emptyText && me.valueContainsPlaceholder) {
            v = '';
        }
        return v;
    },

    /**
     * Sets a data value into the field and runs the change detection and validation. Also applies any configured
     * {@link #emptyText} for text fields. To set the value directly without these inspections see {@link #setRawValue}.
     * @param {Object} value The value to set
     * @return {Ext.form.field.Text} this
     */
    setValue: function(value) {
        var me = this,
            inputEl = me.inputEl;

        if (inputEl && me.emptyText && !Ext.isEmpty(value)) {
            inputEl.removeCls(me.emptyCls);
            me.valueContainsPlaceholder = false;
        }

        me.callParent(arguments);

        me.applyEmptyText();
        return me;
    },

    /**
     * Validates a value according to the field's validation rules and returns an array of errors
     * for any failing validations. Validation rules are processed in the following order:
     *
     * 1. **Field specific validator**
     *
     *     A validator offers a way to customize and reuse a validation specification.
     *     If a field is configured with a `{@link #validator}`
     *     function, it will be passed the current field value.  The `{@link #validator}`
     *     function is expected to return either:
     *
     *     - Boolean `true`  if the value is valid (validation continues).
     *     - a String to represent the invalid message if invalid (validation halts).
     *
     * 2. **Basic Validation**
     *
     *     If the `{@link #validator}` has not halted validation,
     *     basic validation proceeds as follows:
     *
     *     - `{@link #allowBlank}` : (Invalid message = `{@link #blankText}`)
     *
     *         Depending on the configuration of `{@link #allowBlank}`, a
     *         blank field will cause validation to halt at this step and return
     *         Boolean true or false accordingly.
     *
     *     - `{@link #minLength}` : (Invalid message = `{@link #minLengthText}`)
     *
     *         If the passed value does not satisfy the `{@link #minLength}`
     *         specified, validation halts.
     *
     *     -  `{@link #maxLength}` : (Invalid message = `{@link #maxLengthText}`)
     *
     *         If the passed value does not satisfy the `{@link #maxLength}`
     *         specified, validation halts.
     *
     * 3. **Preconfigured Validation Types (VTypes)**
     *
     *     If none of the prior validation steps halts validation, a field
     *     configured with a `{@link #vtype}` will utilize the
     *     corresponding {@link Ext.form.field.VTypes VTypes} validation function.
     *     If invalid, either the field's `{@link #vtypeText}` or
     *     the VTypes vtype Text property will be used for the invalid message.
     *     Keystrokes on the field will be filtered according to the VTypes
     *     vtype Mask property.
     *
     * 4. **Field specific regex test**
     *
     *     If none of the prior validation steps halts validation, a field's
     *     configured `{@link #regex}` test will be processed.
     *     The invalid message for this test is configured with `{@link #regexText}`
     *
     * @param {Object} value The value to validate. The processed raw value will be used if nothing is passed.
     * @return {String[]} Array of any validation errors
     */
    getErrors: function(value) {
        var me = this,
            errors = me.callParent(arguments),
            validator = me.validator,
            emptyText = me.emptyText,
            allowBlank = me.allowBlank,
            vtype = me.vtype,
            vtypes = Ext.form.field.VTypes,
            regex = me.regex,
            format = Ext.String.format,
            msg;

        value = value || me.processRawValue(me.getRawValue());

        if (Ext.isFunction(validator)) {
            msg = validator.call(me, value);
            if (msg !== true) {
                errors.push(msg);
            }
        }

        if (value.length < 1 || (value === me.emptyText && me.valueContainsPlaceholder)) {
            if (!allowBlank) {
                errors.push(me.blankText);
            }
            //if value is blank, there cannot be any additional errors
            return errors;
        }

        if (value.length < me.minLength) {
            errors.push(format(me.minLengthText, me.minLength));
        }

        if (value.length > me.maxLength) {
            errors.push(format(me.maxLengthText, me.maxLength));
        }

        if (vtype) {
            if(!vtypes[vtype](value, me)){
                errors.push(me.vtypeText || vtypes[vtype +'Text']);
            }
        }

        if (regex && !regex.test(value)) {
            errors.push(me.regexText || me.invalidText);
        }

        return errors;
    },

    /**
     * Selects text in this field
     * @param {Number} [start=0] The index where the selection should start
     * @param {Number} [end] The index where the selection should end (defaults to the text length)
     */
    selectText : function(start, end){
        var me = this,
            v = me.getRawValue(),
            doFocus = true,
            el = me.inputEl.dom,
            undef,
            range;

        if (v.length > 0) {
            start = start === undef ? 0 : start;
            end = end === undef ? v.length : end;
            if (el.setSelectionRange) {
                el.setSelectionRange(start, end);
            }
            else if(el.createTextRange) {
                range = el.createTextRange();
                range.moveStart('character', start);
                range.moveEnd('character', end - v.length);
                range.select();
            }
            doFocus = Ext.isGecko || Ext.isOpera;
        }
        if (doFocus) {
            me.focus();
        }
    },

    /**
     * Automatically grows the field to accomodate the width of the text up to the maximum field width allowed. This
     * only takes effect if {@link #grow} = true, and fires the {@link #autosize} event if the width changes.
     */
    autoSize: function() {
        var me = this;
        if (me.grow && me.rendered) {
            me.autoSizing = true;
            me.updateLayout();
        }
    },

    afterComponentLayout: function() {
        var me = this,
            width;

        me.callParent(arguments);
        if (me.autoSizing) {
            width = me.inputEl.getWidth();
            if (width !== me.lastInputWidth) {
                me.fireEvent('autosize', me, width);
                me.lastInputWidth = width;
                delete me.autoSizing;
            }
        }
    }
});




/**
 * @docauthor Robert Dougan <rob@sencha.com>
 *
 * This class creates a multiline text field, which can be used as a direct replacement for traditional
 * textarea fields. In addition, it supports automatically {@link #grow growing} the height of the textarea to
 * fit its content.
 *
 * All of the configuration options from {@link Ext.form.field.Text} can be used on TextArea.
 *
 * Example usage:
 *
 *     @example
 *     Ext.create('Ext.form.FormPanel', {
 *         title      : 'Sample TextArea',
 *         width      : 400,
 *         bodyPadding: 10,
 *         renderTo   : Ext.getBody(),
 *         items: [{
 *             xtype     : 'textareafield',
 *             grow      : true,
 *             name      : 'message',
 *             fieldLabel: 'Message',
 *             anchor    : '100%'
 *         }]
 *     });
 *
 * Some other useful configuration options when using {@link #grow} are {@link #growMin} and {@link #growMax}.
 * These allow you to set the minimum and maximum grow heights for the textarea.
 * 
 * **NOTE:** In some browsers, carriage returns ('\r', not to be confused with new lines)
 * will be automatically stripped out the value is set to the textarea. Since we cannot
 * use any reasonable method to attempt to re-insert these, they will automatically be
 * stripped out to ensure the behaviour is consistent across browser.
 */
Ext.define('Ext.form.field.TextArea', {
    extend:'Ext.form.field.Text',
    alias: ['widget.textareafield', 'widget.textarea'],
    alternateClassName: 'Ext.form.TextArea',
    requires: [
        'Ext.XTemplate', 
        'Ext.layout.component.field.TextArea',
        'Ext.util.DelayedTask'
    ],

    // This template includes a \n after <textarea> opening tag so that an initial value starting 
    // with \n does not lose its first character when the markup is parsed.
    // Both textareas below have the same value:
    // <textarea>initial value</textarea>
    // <textarea>
    // initial value
    // </textarea>
    fieldSubTpl: [
        '<textarea id="{id}" {inputAttrTpl}',
            '<tpl if="name"> name="{name}"</tpl>',
            '<tpl if="rows"> rows="{rows}" </tpl>',
            '<tpl if="cols"> cols="{cols}" </tpl>',
            '<tpl if="placeholder"> placeholder="{placeholder}"</tpl>',
            '<tpl if="size"> size="{size}"</tpl>',
            '<tpl if="maxLength !== undefined"> maxlength="{maxLength}"</tpl>',
            '<tpl if="readOnly"> readonly="readonly"</tpl>',
            '<tpl if="disabled"> disabled="disabled"</tpl>',
            '<tpl if="tabIdx"> tabIndex="{tabIdx}"</tpl>',
            ' class="{fieldCls} {typeCls}" ',
            '<tpl if="fieldStyle"> style="{fieldStyle}"</tpl>',
            ' autocomplete="off">\n',
            '<tpl if="value">{[Ext.util.Format.htmlEncode(values.value)]}</tpl>',
        '</textarea>',
        {
            disableFormats: true
        }
    ],

    /**
     * @cfg {Number} growMin
     * The minimum height to allow when {@link #grow}=true
     */
    growMin: 60,

    /**
     * @cfg {Number} growMax
     * The maximum height to allow when {@link #grow}=true
     */
    growMax: 1000,

    /**
     * @cfg {String} growAppend
     * A string that will be appended to the field's current value for the purposes of calculating the target field
     * size. Only used when the {@link #grow} config is true. Defaults to a newline for TextArea to ensure there is
     * always a space below the current line.
     */
    growAppend: '\n-',

    /**
     * @cfg {Number} cols
     * An initial value for the 'cols' attribute on the textarea element. This is only used if the component has no
     * configured {@link #width} and is not given a width by its container's layout.
     */
    cols: 20,

    /**
     * @cfg {Number} rows
     * An initial value for the 'rows' attribute on the textarea element. This is only used if the component has no
     * configured {@link #height} and is not given a height by its container's layout. Defaults to 4.
     */
    rows: 4,

    /**
     * @cfg {Boolean} enterIsSpecial
     * True if you want the ENTER key to be classed as a special key and the {@link #specialkey} event to be fired
     * when ENTER is pressed.
     */
    enterIsSpecial: false,

    /**
     * @cfg {Boolean} preventScrollbars
     * true to prevent scrollbars from appearing regardless of how much text is in the field. This option is only
     * relevant when {@link #grow} is true. Equivalent to setting overflow: hidden.
     */
    preventScrollbars: false,

    // private
    componentLayout: 'textareafield',
    
    setGrowSizePolicy: Ext.emptyFn,
    
    returnRe: /\r/g,

    // private
    getSubTplData: function() {
        var me = this,
            fieldStyle = me.getFieldStyle(),
            ret = me.callParent();

        if (me.grow) {
            if (me.preventScrollbars) {
                ret.fieldStyle = (fieldStyle||'') + ';overflow:hidden;height:' + me.growMin + 'px';
            }
        }

        Ext.applyIf(ret, {
            cols: me.cols,
            rows: me.rows
        });

        return ret;
    },

    afterRender: function () {
        var me = this;

        me.callParent(arguments);

        me.needsMaxCheck = me.enforceMaxLength && me.maxLength !== Number.MAX_VALUE && !Ext.supports.TextAreaMaxLength;
        if (me.needsMaxCheck) {
            me.inputEl.on('paste', me.onPaste, me);
        }
    },
    
    // The following overrides deal with an issue whereby some browsers
    // will strip carriage returns from the textarea input, while others
    // will not. Since there's no way to be sure where to insert returns,
    // the best solution is to strip them out in all cases to ensure that
    // the behaviour is consistent in a cross browser fashion. As such,
    // we override in all cases when setting the value to control this.
    transformRawValue: function(value){
        return this.stripReturns(value);
    },
    
    transformOriginalValue: function(value){
        return this.stripReturns(value); 
    },
    
    valueToRaw: function(value){
        value = this.stripReturns(value);
        return this.callParent([value]);
    },
    
    stripReturns: function(value){
        if (value) {
            value = value.replace(this.returnRe, '');
        }
        return value;
    },

    onPaste: function(e){
        var me = this;
        if (!me.pasteTask) {
            me.pasteTask = new Ext.util.DelayedTask(me.pasteCheck, me);
        }
        // since we can't get the paste data, we'll give the area a chance to populate
        me.pasteTask.delay(1);
    },
    
    pasteCheck: function(){
        var me = this,
            value = me.getValue(),
            max = me.maxLength;
            
        if (value.length > max) {
            value = value.substr(0, max);
            me.setValue(value);
        }
    },

    // private
    fireKey: function(e) {
        var me = this,
            key = e.getKey(),
            value;
            
        if (e.isSpecialKey() && (me.enterIsSpecial || (key !== e.ENTER || e.hasModifier()))) {
            me.fireEvent('specialkey', me, e);
        }
        
        if (me.needsMaxCheck && key !== e.BACKSPACE && key !== e.DELETE && !e.isNavKeyPress() && !me.isCutCopyPasteSelectAll(e, key)) {
            value = me.getValue();
            if (value.length >= me.maxLength) {
                e.stopEvent();
            }
        }
    },
    
    isCutCopyPasteSelectAll: function(e, key) {
        if (e.CTRL) {
            return key === e.A || key === e.C || key === e.V || key === e.X;
        }
        return false;
    },

    /**
     * Automatically grows the field to accomodate the height of the text up to the maximum field height allowed. This
     * only takes effect if {@link #grow} = true, and fires the {@link #autosize} event if the height changes.
     */
    autoSize: function() {
        var me = this,
            height;

        if (me.grow && me.rendered) {
            me.updateLayout();
            height = me.inputEl.getHeight();
            if (height !== me.lastInputHeight) {
                /**
                 * @event autosize
                 * Fires when the {@link #autoSize} function is triggered and the field is resized according to
                 * the grow/growMin/growMax configs as a result. This event provides a hook for the developer
                 * to apply additional logic at runtime to resize the field if needed.
                 * @param {Ext.form.field.Text} this
                 * @param {Number} height
                 */
                me.fireEvent('autosize', me, height);
                me.lastInputHeight = height;
            }
        }
    },

    // private
    initAria: function() {
        this.callParent(arguments);
        this.getActionEl().dom.setAttribute('aria-multiline', true);
    },
    
    beforeDestroy: function(){
        var task = this.pasteTask;
        if (task) {
            task.delay();
        }    
        this.callParent();
    }
});



/**
 * Provides a convenient wrapper for TextFields that adds a clickable trigger button (looks like a combobox by default).
 * The trigger has no default action, so you must assign a function to implement the trigger click handler by overriding
 * {@link #onTriggerClick}. You can create a Trigger field directly, as it renders exactly like a combobox for which you
 * can provide a custom implementation.
 *
 * For example:
 *
 *     @example
 *     Ext.define('Ext.ux.CustomTrigger', {
 *         extend: 'Ext.form.field.Trigger',
 *         alias: 'widget.customtrigger',
 *
 *         // override onTriggerClick
 *         onTriggerClick: function() {
 *             Ext.Msg.alert('Status', 'You clicked my trigger!');
 *         }
 *     });
 *
 *     Ext.create('Ext.form.FormPanel', {
 *         title: 'Form with TriggerField',
 *         bodyPadding: 5,
 *         width: 350,
 *         renderTo: Ext.getBody(),
 *         items:[{
 *             xtype: 'customtrigger',
 *             fieldLabel: 'Sample Trigger',
 *             emptyText: 'click the trigger'
 *         }]
 *     });
 *
 * However, in general you will most likely want to use Trigger as the base class for a reusable component.
 * {@link Ext.form.field.Date} and {@link Ext.form.field.ComboBox} are perfect examples of this.
 */
Ext.define('Ext.form.field.Trigger', {
    extend:'Ext.form.field.Text',
    alias: ['widget.triggerfield', 'widget.trigger'],
    requires: ['Ext.DomHelper', 'Ext.util.ClickRepeater', 'Ext.layout.component.field.Trigger'],
    alternateClassName: ['Ext.form.TriggerField', 'Ext.form.TwinTriggerField', 'Ext.form.Trigger'],

    childEls: [
        /**
         * @property {Ext.CompositeElement} triggerEl
         * A composite of all the trigger button elements. Only set after the field has been rendered.
         */
        { name: 'triggerCell', select: '.' + Ext.baseCSSPrefix + 'trigger-cell' },
        { name: 'triggerEl', select: '.' + Ext.baseCSSPrefix + 'form-trigger' },

        /**
         * @property {Ext.Element} triggerWrap
         * A reference to the `TABLE` element which encapsulates the input field and all trigger button(s). Only set after the field has been rendered.
         */
        'triggerWrap',

        /**
         * @property {Ext.Element} inputCell
         * A reference to the `TD` element wrapping the input element. Only set after the field has been rendered.
         */
        'inputCell'
    ],

    /**
     * @cfg {String} triggerCls
     * An additional CSS class used to style the trigger button. The trigger will always get the {@link #triggerBaseCls}
     * by default and triggerCls will be **appended** if specified.
     */

    /**
     * @cfg
     * The base CSS class that is always added to the trigger button. The {@link #triggerCls} will be appended in
     * addition to this class.
     */
    triggerBaseCls: Ext.baseCSSPrefix + 'form-trigger',

    /**
     * @cfg
     * The CSS class that is added to the div wrapping the trigger button(s).
     */
    triggerWrapCls: Ext.baseCSSPrefix + 'form-trigger-wrap',

    /**
     * @cfg
     * The CSS class that is added to the text field when component is read-only or not editable.
     */
    triggerNoEditCls: Ext.baseCSSPrefix + 'trigger-noedit',

    /**
     * @cfg {Boolean} hideTrigger
     * true to hide the trigger element and display only the base text field
     */
    hideTrigger: false,

    /**
     * @cfg {Boolean} editable
     * false to prevent the user from typing text directly into the field; the field can only have its value set via an
     * action invoked by the trigger.
     */
    editable: true,

    /**
     * @cfg {Boolean} readOnly
     * true to prevent the user from changing the field, and hides the trigger. Supercedes the editable and hideTrigger
     * options if the value is true.
     */
    readOnly: false,

    /**
     * @cfg {Boolean} [selectOnFocus=false]
     * true to select any existing text in the field immediately on focus. Only applies when
     * {@link #editable editable} = true
     */

    /**
     * @cfg {Boolean} repeatTriggerClick
     * true to attach a {@link Ext.util.ClickRepeater click repeater} to the trigger.
     */
    repeatTriggerClick: false,


    /**
     * @method autoSize
     * @private
     */
    autoSize: Ext.emptyFn,
    // private
    monitorTab: true,
    // private
    mimicing: false,
    // private
    triggerIndexRe: /trigger-index-(\d+)/,

    componentLayout: 'triggerfield',

    initComponent: function() {
        this.wrapFocusCls = this.triggerWrapCls + '-focus';
        this.callParent(arguments);
    },

    getSubTplMarkup: function() {
        var me = this,
            field = me.callParent(arguments);

        return '<table id="' + me.id + '-triggerWrap" class="' + Ext.baseCSSPrefix + 'form-trigger-wrap" cellpadding="0" cellspacing="0"><tbody><tr>' +
            '<td id="' + me.id + '-inputCell" class="' + Ext.baseCSSPrefix + 'form-trigger-input-cell">' + field + '</td>' +
            me.getTriggerMarkup() +
            '</tr></tbody></table>';
    },
    
    getSubTplData: function(){
        var me = this,
            data = me.callParent(),
            readOnly = me.readOnly === true,
            editable = me.editable !== false;
        
        return Ext.apply(data, {
            editableCls: (readOnly || !editable) ? ' ' + me.triggerNoEditCls : '',
            readOnly: !editable || readOnly
        });  
    },

    getLabelableRenderData: function() {
        var me = this,
            triggerWrapCls = me.triggerWrapCls,
            result = me.callParent(arguments);

        return Ext.applyIf(result, {
            triggerWrapCls: triggerWrapCls,
            triggerMarkup: me.getTriggerMarkup()
        });
    },

    getTriggerMarkup: function() {
        var me = this,
            i = 0,
            hideTrigger = (me.readOnly || me.hideTrigger),
            triggerCls,
            triggerBaseCls = me.triggerBaseCls,
            triggerConfigs = [];

        // TODO this trigger<n>Cls API design doesn't feel clean, especially where it butts up against the
        // single triggerCls config. Should rethink this, perhaps something more structured like a list of
        // trigger config objects that hold cls, handler, etc.
        // triggerCls is a synonym for trigger1Cls, so copy it.
        if (!me.trigger1Cls) {
            me.trigger1Cls = me.triggerCls;
        }

        // Create as many trigger elements as we have trigger<n>Cls configs, but always at least one
        for (i = 0; (triggerCls = me['trigger' + (i + 1) + 'Cls']) || i < 1; i++) {
            triggerConfigs.push({
                tag: 'td',
                valign: 'top',
                cls: Ext.baseCSSPrefix + 'trigger-cell',
                style: 'width:' + me.triggerWidth + (hideTrigger ? 'px;display:none' : 'px'),
                cn: {
                    cls: [Ext.baseCSSPrefix + 'trigger-index-' + i, triggerBaseCls, triggerCls].join(' '),
                    role: 'button'
                }
            });
        }
        triggerConfigs[i - 1].cn.cls += ' ' + triggerBaseCls + '-last';

        return Ext.DomHelper.markup(triggerConfigs);
    },
    
    disableCheck: function() {
        return !this.disabled;    
    },

    // private
    beforeRender: function() {
        var me = this,
            triggerBaseCls = me.triggerBaseCls,
            tempEl;
            
        /**
         * @property {Number} triggerWidth
         * Width of the trigger element. Unless set explicitly, it will be
         * automatically calculated through creating a temporary element
         * on page. (That will be done just once per app run.)
         * @private
         */
        if (!me.triggerWidth) {
            tempEl = Ext.resetElement.createChild({
                style: 'position: absolute;', 
                cls: Ext.baseCSSPrefix + 'form-trigger'
            });
            Ext.form.field.Trigger.prototype.triggerWidth = tempEl.getWidth();
            tempEl.remove();
        }

        me.callParent();

        if (triggerBaseCls != Ext.baseCSSPrefix + 'form-trigger') {
            // we may need to change the selectors by which we extract trigger elements if is triggerBaseCls isn't the value we
            // stuck in childEls
            me.addChildEls({ name: 'triggerEl', select: '.' + triggerBaseCls });
        }

        // these start correct in the fieldSubTpl:
        me.lastTriggerStateFlags = me.getTriggerStateFlags();
    },

    onRender: function() {
        var me = this;

        me.callParent(arguments);

        me.doc = Ext.getDoc();
        me.initTrigger();
        me.triggerEl.unselectable();
    },

    /**
     * Get the total width of the trigger button area.
     * @return {Number} The total trigger width
     */
    getTriggerWidth: function() {
        var me = this,
            totalTriggerWidth = 0;

        if (me.triggerWrap && !me.hideTrigger && !me.readOnly) {
            totalTriggerWidth = me.triggerEl.getCount() * me.triggerWidth;
        }
        return totalTriggerWidth;
    },

    setHideTrigger: function(hideTrigger) {
        if (hideTrigger != this.hideTrigger) {
            this.hideTrigger = hideTrigger;
            this.updateLayout();
        }
    },

    /**
     * Sets the editable state of this field. This method is the runtime equivalent of setting the 'editable' config
     * option at config time.
     * @param {Boolean} editable True to allow the user to directly edit the field text. If false is passed, the user
     * will only be able to modify the field using the trigger. Will also add a click event to the text field which
     * will call the trigger. 
     */
    setEditable: function(editable) {
        if (editable != this.editable) {
            this.editable = editable;
            this.updateLayout();
        }
    },

    /**
     * Sets the read-only state of this field. This method is the runtime equivalent of setting the 'readOnly' config
     * option at config time.
     * @param {Boolean} readOnly True to prevent the user changing the field and explicitly hide the trigger. Setting
     * this to true will supercede settings editable and hideTrigger. Setting this to false will defer back to editable
     * and hideTrigger.
     */
    setReadOnly: function(readOnly) {
        if (readOnly != this.readOnly) {
            this.readOnly = readOnly;
            this.updateLayout();
        }
    },

    // private
    initTrigger: function() {
        var me = this,
            triggerWrap = me.triggerWrap,
            triggerEl = me.triggerEl,
            disableCheck = me.disableCheck,
            els, eLen, el, e, idx;

        if (me.repeatTriggerClick) {
            me.triggerRepeater = new Ext.util.ClickRepeater(triggerWrap, {
                preventDefault: true,
                handler: me.onTriggerWrapClick,
                listeners: {
                    mouseup: me.onTriggerWrapMouseup,
                    scope: me
                },
                scope: me
            });
        } else {
            me.mon(triggerWrap, {
                click: me.onTriggerWrapClick,
                mouseup: me.onTriggerWrapMouseup,
                scope: me
            });
        }

        triggerEl.setVisibilityMode(Ext.Element.DISPLAY);
        triggerEl.addClsOnOver(me.triggerBaseCls + '-over', disableCheck, me);

        els  = triggerEl.elements;
        eLen = els.length;

        for (e = 0; e < eLen; e++) {
            el = els[e];
            idx = e+1;
            el.addClsOnOver(me['trigger' + (idx) + 'Cls'] + '-over', disableCheck, me);
            el.addClsOnClick(me['trigger' + (idx) + 'Cls'] + '-click', disableCheck, me);
        }

        triggerEl.addClsOnClick(me.triggerBaseCls + '-click', disableCheck, me);

    },

    // private
    onDestroy: function() {
        var me = this;
        Ext.destroyMembers(me, 'triggerRepeater', 'triggerWrap', 'triggerEl');
        delete me.doc;
        me.callParent();
    },

    // private
    onFocus: function() {
        var me = this;
        me.callParent(arguments);
        if (!me.mimicing) {
            me.bodyEl.addCls(me.wrapFocusCls);
            me.mimicing = true;
            me.mon(me.doc, 'mousedown', me.mimicBlur, me, {
                delay: 10
            });
            if (me.monitorTab) {
                me.on('specialkey', me.checkTab, me);
            }
        }
    },

    // private
    checkTab: function(me, e) {
        if (!this.ignoreMonitorTab && e.getKey() == e.TAB) {
            this.triggerBlur();
        }
    },

    /**
     * Returns a set of flags that describe the trigger state. These are just used to easily
     * determine if the DOM is out-of-sync with the component's properties.
     * @private
     */
    getTriggerStateFlags: function () {
        var me = this,
            state = 0;

        if (me.readOnly) {
            state += 1;
        }
        if (me.editable) {
            state += 2;
        }
        if (me.hideTrigger) {
            state += 4;
        }
        return state;
    },

    /**
     * @private
     * The default blur handling must not occur for a TriggerField, implementing this template method as emptyFn disables that.
     * Instead the tab key is monitored, and the superclass's onBlur is called when tab is detected
     */
    onBlur: Ext.emptyFn,

    // private
    mimicBlur: function(e) {
        if (!this.isDestroyed && !this.bodyEl.contains(e.target) && this.validateBlur(e)) {
            this.triggerBlur(e);
        }
    },

    // private
    triggerBlur: function(e) {
        var me = this;
        me.mimicing = false;
        me.mun(me.doc, 'mousedown', me.mimicBlur, me);
        if (me.monitorTab && me.inputEl) {
            me.un('specialkey', me.checkTab, me);
        }
        Ext.form.field.Trigger.superclass.onBlur.call(me, e);
        if (me.bodyEl) {
            me.bodyEl.removeCls(me.wrapFocusCls);
        }
    },

    // private
    // This should be overridden by any subclass that needs to check whether or not the field can be blurred.
    validateBlur: function(e) {
        return true;
    },

    // private
    // process clicks upon triggers.
    // determine which trigger index, and dispatch to the appropriate click handler
    onTriggerWrapClick: function() {
        var me = this,
            targetEl, match,
            triggerClickMethod,
            event;

        event = arguments[me.triggerRepeater ? 1 : 0];
        if (event && !me.readOnly && !me.disabled) {
                targetEl = event.getTarget('.' + me.triggerBaseCls, null);
                match = targetEl && targetEl.className.match(me.triggerIndexRe);

            if (match) {
                triggerClickMethod = me['onTrigger' + (parseInt(match[1], 10) + 1) + 'Click'] || me.onTriggerClick;
                if (triggerClickMethod) {
                    triggerClickMethod.call(me, event);
                }
            }
        }
    },

    // private
    // Handle trigger mouse up gesture. To be implemented in subclasses.
    // Currently the Spinner subclass refocuses the input element upon end of spin.
    onTriggerWrapMouseup: Ext.emptyFn,

    /**
     * @method onTriggerClick
     * @protected
     * The function that should handle the trigger's click event. This method does nothing by default until overridden
     * by an implementing function. See Ext.form.field.ComboBox and Ext.form.field.Date for sample implementations.
     * @param {Ext.EventObject} e
     */
    onTriggerClick: Ext.emptyFn

    /**
     * @cfg {Boolean} grow
     * @private
     */
    /**
     * @cfg {Number} growMin
     * @private
     */
    /**
     * @cfg {Number} growMax
     * @private
     */
});

/**
 * @docauthor Jason Johnston <jason@sencha.com>
 *
 * A file upload field which has custom styling and allows control over the button text and other
 * features of {@link Ext.form.field.Text text fields} like {@link Ext.form.field.Text#emptyText empty text}.
 * It uses a hidden file input element behind the scenes to allow user selection of a file and to
 * perform the actual upload during {@link Ext.form.Basic#submit form submit}.
 *
 * Because there is no secure cross-browser way to programmatically set the value of a file input,
 * the standard Field `setValue` method is not implemented. The `{@link #getValue}` method will return
 * a value that is browser-dependent; some have just the file name, some have a full path, some use
 * a fake path.
 *
 * **IMPORTANT:** File uploads are not performed using normal 'Ajax' techniques; see the description for
 * {@link Ext.form.Basic#hasUpload} for details.
 *
 * # Example Usage
 *
 *     @example
 *     Ext.create('Ext.form.Panel', {
 *         title: 'Upload a Photo',
 *         width: 400,
 *         bodyPadding: 10,
 *         frame: true,
 *         renderTo: Ext.getBody(),
 *         items: [{
 *             xtype: 'filefield',
 *             name: 'photo',
 *             fieldLabel: 'Photo',
 *             labelWidth: 50,
 *             msgTarget: 'side',
 *             allowBlank: false,
 *             anchor: '100%',
 *             buttonText: 'Select Photo...'
 *         }],
 *
 *         buttons: [{
 *             text: 'Upload',
 *             handler: function() {
 *                 var form = this.up('form').getForm();
 *                 if(form.isValid()){
 *                     form.submit({
 *                         url: 'photo-upload.php',
 *                         waitMsg: 'Uploading your photo...',
 *                         success: function(fp, o) {
 *                             Ext.Msg.alert('Success', 'Your photo "' + o.result.file + '" has been uploaded.');
 *                         }
 *                     });
 *                 }
 *             }
 *         }]
 *     });
 */
Ext.define("Ext.form.field.File", {
    extend: 'Ext.form.field.Trigger',
    alias: ['widget.filefield', 'widget.fileuploadfield'],
    alternateClassName: ['Ext.form.FileUploadField', 'Ext.ux.form.FileUploadField', 'Ext.form.File'],
    uses: ['Ext.button.Button', 'Ext.layout.component.field.Field'],

    //<locale>
    /**
     * @cfg {String} buttonText
     * The button text to display on the upload button. Note that if you supply a value for
     * {@link #buttonConfig}, the buttonConfig.text value will be used instead if available.
     */
    buttonText: 'Browse...',
    //</locale>

    /**
     * @cfg {Boolean} buttonOnly
     * True to display the file upload field as a button with no visible text field. If true, all
     * inherited Text members will still be available.
     */
    buttonOnly: false,

    /**
     * @cfg {Number} buttonMargin
     * The number of pixels of space reserved between the button and the text field. Note that this only
     * applies if {@link #buttonOnly} = false.
     */
    buttonMargin: 3,

    /**
     * @cfg {Object} buttonConfig
     * A standard {@link Ext.button.Button} config object.
     */

    /**
     * @event change
     * Fires when the underlying file input field's value has changed from the user selecting a new file from the system
     * file selection dialog.
     * @param {Ext.ux.form.FileUploadField} this
     * @param {String} value The file value returned by the underlying file input field
     */

    /**
     * @property {Ext.Element} fileInputEl
     * A reference to the invisible file input element created for this upload field. Only populated after this
     * component is rendered.
     */

    /**
     * @property {Ext.button.Button} button
     * A reference to the trigger Button component created for this upload field. Only populated after this component is
     * rendered.
     */

    /**
     * @cfg {String} [fieldBodyCls='x-form-file-wrap']
     * An extra CSS class to be applied to the body content element in addition to {@link #fieldBodyCls}.
     */
    fieldBodyCls: Ext.baseCSSPrefix + 'form-file-wrap',

    /**
     * @cfg {Boolean} readOnly
     * Unlike with other form fields, the readOnly config defaults to true in File field.
     */
    readOnly: true,

    /**
     * Do not show hand pointer over text field since file choose dialog is only shown when clicking in the button
     * @private
     */
    triggerNoEditCls: '',

    // private
    componentLayout: 'triggerfield',

    // private. Extract the file element, button outer element, and button active element.
    childEls: ['fileInputEl', 'buttonEl', 'buttonEl-btnEl', 'browseButtonWrap'],

    // private
    onRender: function() {
        var me = this,
            inputEl;

        me.callParent(arguments);

        inputEl = me.inputEl;
        inputEl.dom.name = ''; //name goes on the fileInput, not the text input

        me.fileInputEl.dom.name = me.getName();
        me.fileInputEl.on({
            scope: me,
            change: me.onFileChange
        });

        if (me.buttonOnly) {
            me.inputCell.setDisplayed(false);
        }

        // Ensure the trigger cell is sized correctly upon render
        me.browseButtonWrap.dom.style.width = (me.browseButtonWrap.dom.lastChild.offsetWidth + me.buttonEl.getMargin('lr')) + 'px';
        if (Ext.isIE) {
            me.buttonEl.repaint();
        }
    },

    /**
     * Gets the markup to be inserted into the subTplMarkup.
     */
    getTriggerMarkup: function() {
        var me = this,
            result,
            btn = Ext.widget('button', Ext.apply({
                id: me.id + '-buttonEl',
                ui: me.ui,
                disabled: me.disabled,
                text: me.buttonText,
                cls: Ext.baseCSSPrefix + 'form-file-btn',
                preventDefault: false,
                style: me.buttonOnly ? '' : 'margin-left:' + me.buttonMargin + 'px'
            }, me.buttonConfig)),
            btnCfg = btn.getRenderTree(),
            inputElCfg = {
                id: me.id + '-fileInputEl',
                cls: Ext.baseCSSPrefix + 'form-file-input',
                tag: 'input',
                type: 'file',
                size: 1
            };
        if (me.disabled) {
            inputElCfg.disabled = true;
        }
        btnCfg.cn = inputElCfg;
        result = '<td id="' + me.id + '-browseButtonWrap">' + Ext.DomHelper.markup(btnCfg) + '</td>';
        btn.destroy();
        return result;
    },

    /**
     * @private
     * Creates the file input element. It is inserted into the trigger button component, made
     * invisible, and floated on top of the button's other content so that it will receive the
     * button's clicks.
     */
    createFileInput : function() {
        var me = this;
        me.fileInputEl = me.buttonEl.createChild({
            name: me.getName(),
            id: me.id + '-fileInputEl',
            cls: Ext.baseCSSPrefix + 'form-file-input',
            tag: 'input',
            type: 'file',
            size: 1
        });
        me.fileInputEl.on({
            scope: me,
            change: me.onFileChange
        });
    },

    /**
     * @private Event handler fired when the user selects a file.
     */
    onFileChange: function() {
        this.lastValue = null; // force change event to get fired even if the user selects a file with the same name
        Ext.form.field.File.superclass.setValue.call(this, this.fileInputEl.dom.value);
    },

    /**
     * Overridden to do nothing
     * @method
     */
    setValue: Ext.emptyFn,

    reset : function(){
        var me = this;
        if (me.rendered) {
            me.fileInputEl.remove();
            me.createFileInput();
            me.inputEl.dom.value = '';
        }
        me.callParent();
    },

    onDisable: function(){
        this.callParent();
        this.disableItems();
    },
    
    disableItems: function(){
        var file = this.fileInputEl;
        if (file) {
            file.dom.disabled = true;
        }
        this['buttonEl-btnEl'].dom.disabled = true;
    },

    onEnable: function(){
        var me = this;
        me.callParent();
        me.fileInputEl.dom.disabled = false;
        this['buttonEl-btnEl'].dom.disabled = false;
    },

    isFileUpload: function() {
        return true;
    },

    extractFileInput: function() {
        var fileInput = this.fileInputEl.dom;
        this.reset();
        return fileInput;
    },

    onDestroy: function(){
        Ext.destroyMembers(this, 'fileInputEl', 'buttonEl');
        this.callParent();
    }
});
/**
 * An abstract class for fields that have a single trigger which opens a "picker" popup below the field, e.g. a combobox
 * menu list or a date picker. It provides a base implementation for toggling the picker's visibility when the trigger
 * is clicked, as well as keyboard navigation and some basic events. Sizing and alignment of the picker can be
 * controlled via the {@link #matchFieldWidth} and {@link #pickerAlign}/{@link #pickerOffset} config properties
 * respectively.
 *
 * You would not normally use this class directly, but instead use it as the parent class for a specific picker field
 * implementation. Subclasses must implement the {@link #createPicker} method to create a picker component appropriate
 * for the field.
 */
Ext.define('Ext.form.field.Picker', {
    extend: 'Ext.form.field.Trigger',
    alias: 'widget.pickerfield',
    alternateClassName: 'Ext.form.Picker',
    requires: ['Ext.util.KeyNav'],

    /**
     * @cfg {Boolean} matchFieldWidth
     * Whether the picker dropdown's width should be explicitly set to match the width of the field. Defaults to true.
     */
    matchFieldWidth: true,

    /**
     * @cfg {String} pickerAlign
     * The {@link Ext.Element#alignTo alignment position} with which to align the picker. Defaults to "tl-bl?"
     */
    pickerAlign: 'tl-bl?',

    /**
     * @cfg {Number[]} pickerOffset
     * An offset [x,y] to use in addition to the {@link #pickerAlign} when positioning the picker.
     * Defaults to undefined.
     */

    /**
     * @cfg {String} [openCls='x-pickerfield-open']
     * A class to be added to the field's {@link #bodyEl} element when the picker is opened.
     */
    openCls: Ext.baseCSSPrefix + 'pickerfield-open',

    /**
     * @property {Boolean} isExpanded
     * True if the picker is currently expanded, false if not.
     */

    /**
     * @cfg {Boolean} editable
     * False to prevent the user from typing text directly into the field; the field can only have its value set via
     * selecting a value from the picker. In this state, the picker can also be opened by clicking directly on the input
     * field itself.
     */
    editable: true,


    initComponent: function() {
        this.callParent();

        // Custom events
        this.addEvents(
            /**
             * @event expand
             * Fires when the field's picker is expanded.
             * @param {Ext.form.field.Picker} field This field instance
             */
            'expand',
            /**
             * @event collapse
             * Fires when the field's picker is collapsed.
             * @param {Ext.form.field.Picker} field This field instance
             */
            'collapse',
            /**
             * @event select
             * Fires when a value is selected via the picker.
             * @param {Ext.form.field.Picker} field This field instance
             * @param {Object} value The value that was selected. The exact type of this value is dependent on
             * the individual field and picker implementations.
             */
            'select'
        );
    },


    initEvents: function() {
        var me = this;
        me.callParent();

        // Add handlers for keys to expand/collapse the picker
        me.keyNav = new Ext.util.KeyNav(me.inputEl, {
            down: me.onDownArrow,
            esc: {
                handler: me.onEsc,
                scope: me,
                defaultEventAction: false
            },
            scope: me,
            forceKeyDown: true
        });

        // Non-editable allows opening the picker by clicking the field
        if (!me.editable) {
            me.mon(me.inputEl, 'click', me.onTriggerClick, me);
        }

        // Disable native browser autocomplete
        if (Ext.isGecko) {
            me.inputEl.dom.setAttribute('autocomplete', 'off');
        }
    },

    // private
    onEsc: function(e) {
        var me = this;
        if (me.isExpanded) {
            me.collapse();
            e.stopEvent();
        } else {
            // If there's an ancestor Window which will see the ESC event and hide, ensure this Field blurs
            // so that a down arrow will not pop up a disembodied dropdown list.
            if (me.up('window')) {
                me.blur();
            }
            // Otherwise, only stop the ESC key event if it's not going to bubble up to the FocusManager
            else if ((!Ext.FocusManager || !Ext.FocusManager.enabled)) {
                e.stopEvent();
            }
        }
    },

    onDownArrow: function(e) {
        if (!this.isExpanded) {
            // Don't call expand() directly as there may be additional processing involved before
            // expanding, e.g. in the case of a ComboBox query.
            this.onTriggerClick();
        }
    },

    /**
     * Expands this field's picker dropdown.
     */
    expand: function() {
        var me = this,
            bodyEl, picker, collapseIf;

        if (me.rendered && !me.isExpanded && !me.isDestroyed) {
            bodyEl = me.bodyEl;
            picker = me.getPicker();
            collapseIf = me.collapseIf;

            // show the picker and set isExpanded flag
            picker.show();
            me.isExpanded = true;
            me.alignPicker();
            bodyEl.addCls(me.openCls);

            // monitor clicking and mousewheel
            me.mon(Ext.getDoc(), {
                mousewheel: collapseIf,
                mousedown: collapseIf,
                scope: me
            });
            Ext.EventManager.onWindowResize(me.alignPicker, me);
            me.fireEvent('expand', me);
            me.onExpand();
        }
    },

    onExpand: Ext.emptyFn,

    /**
     * Aligns the picker to the input element
     * @protected
     */
    alignPicker: function() {
        var me = this,
            picker = me.getPicker();

        if (me.isExpanded) {
            if (me.matchFieldWidth) {
                // Auto the height (it will be constrained by min and max width) unless there are no records to display.
                picker.setWidth(me.bodyEl.getWidth());
            }
            if (picker.isFloating()) {
                me.doAlign();
            }
        }
    },

    /**
     * Performs the alignment on the picker using the class defaults
     * @private
     */
    doAlign: function(){
        var me = this,
            picker = me.picker,
            aboveSfx = '-above',
            isAbove;

        me.picker.alignTo(me.inputEl, me.pickerAlign, me.pickerOffset);
        // add the {openCls}-above class if the picker was aligned above
        // the field due to hitting the bottom of the viewport
        isAbove = picker.el.getY() < me.inputEl.getY();
        me.bodyEl[isAbove ? 'addCls' : 'removeCls'](me.openCls + aboveSfx);
        picker[isAbove ? 'addCls' : 'removeCls'](picker.baseCls + aboveSfx);
    },

    /**
     * Collapses this field's picker dropdown.
     */
    collapse: function() {
        if (this.isExpanded && !this.isDestroyed) {
            var me = this,
                openCls = me.openCls,
                picker = me.picker,
                doc = Ext.getDoc(),
                collapseIf = me.collapseIf,
                aboveSfx = '-above';

            // hide the picker and set isExpanded flag
            picker.hide();
            me.isExpanded = false;

            // remove the openCls
            me.bodyEl.removeCls([openCls, openCls + aboveSfx]);
            picker.el.removeCls(picker.baseCls + aboveSfx);

            // remove event listeners
            doc.un('mousewheel', collapseIf, me);
            doc.un('mousedown', collapseIf, me);
            Ext.EventManager.removeResizeListener(me.alignPicker, me);
            me.fireEvent('collapse', me);
            me.onCollapse();
        }
    },

    onCollapse: Ext.emptyFn,


    /**
     * @private
     * Runs on mousewheel and mousedown of doc to check to see if we should collapse the picker
     */
    collapseIf: function(e) {
        var me = this;

        if (!me.isDestroyed && !e.within(me.bodyEl, false, true) && !e.within(me.picker.el, false, true) && !me.isEventWithinPickerLoadMask(e)) {
            me.collapse();
        }
    },

    /**
     * Returns a reference to the picker component for this field, creating it if necessary by
     * calling {@link #createPicker}.
     * @return {Ext.Component} The picker component
     */
    getPicker: function() {
        var me = this;
        return me.picker || (me.picker = me.createPicker());
    },

    /**
     * @method
     * Creates and returns the component to be used as this field's picker. Must be implemented by subclasses of Picker.
     * The current field should also be passed as a configuration option to the picker component as the pickerField
     * property.
     */
    createPicker: Ext.emptyFn,

    /**
     * Handles the trigger click; by default toggles between expanding and collapsing the picker component.
     * @protected
     */
    onTriggerClick: function() {
        var me = this;
        if (!me.readOnly && !me.disabled) {
            if (me.isExpanded) {
                me.collapse();
            } else {
                me.expand();
            }
            me.inputEl.focus();
        }
    },

    mimicBlur: function(e) {
        var me = this,
            picker = me.picker;
        // ignore mousedown events within the picker element
        if (!picker || !e.within(picker.el, false, true) && !me.isEventWithinPickerLoadMask(e)) {
            me.callParent(arguments);
        }
    },

    onDestroy : function(){
        var me = this,
            picker = me.picker;

        Ext.EventManager.removeResizeListener(me.alignPicker, me);
        Ext.destroy(me.keyNav);
        if (picker) {
            delete picker.pickerField;
            picker.destroy();
        }
        me.callParent();
    },

    /**
     * returns true if the picker has a load mask and the passed event is within the load mask
     * @private
     * @param {Ext.EventObject} e
     * @return {Boolean}
     */
    isEventWithinPickerLoadMask: function(e) {
        var loadMask = this.picker.loadMask;

        return loadMask ? e.within(loadMask.maskEl, false, true) || e.within(loadMask.el, false, true) : false;
    }

});


/**
 * A field with a pair of up/down spinner buttons. This class is not normally instantiated directly,
 * instead it is subclassed and the {@link #onSpinUp} and {@link #onSpinDown} methods are implemented
 * to handle when the buttons are clicked. A good example of this is the {@link Ext.form.field.Number}
 * field which uses the spinner to increment and decrement the field's value by its
 * {@link Ext.form.field.Number#step step} config value.
 *
 * For example:
 *
 *     @example
 *     Ext.define('Ext.ux.CustomSpinner', {
 *         extend: 'Ext.form.field.Spinner',
 *         alias: 'widget.customspinner',
 *
 *         // override onSpinUp (using step isn't neccessary)
 *         onSpinUp: function() {
 *             var me = this;
 *             if (!me.readOnly) {
 *                 var val = parseInt(me.getValue().split(' '), 10)||0; // gets rid of " Pack", defaults to zero on parse failure
 *                 me.setValue((val + me.step) + ' Pack');
 *             }
 *         },
 *
 *         // override onSpinDown
 *         onSpinDown: function() {
 *             var val, me = this;
 *             if (!me.readOnly) {
 *                var val = parseInt(me.getValue().split(' '), 10)||0; // gets rid of " Pack", defaults to zero on parse failure
 *                if (val <= me.step) {
 *                    me.setValue('Dry!');
 *                } else {
 *                    me.setValue((val - me.step) + ' Pack');
 *                }
 *             }
 *         }
 *     });
 *
 *     Ext.create('Ext.form.FormPanel', {
 *         title: 'Form with SpinnerField',
 *         bodyPadding: 5,
 *         width: 350,
 *         renderTo: Ext.getBody(),
 *         items:[{
 *             xtype: 'customspinner',
 *             fieldLabel: 'How Much Beer?',
 *             step: 6
 *         }]
 *     });
 *
 * By default, pressing the up and down arrow keys will also trigger the onSpinUp and onSpinDown methods;
 * to prevent this, set `{@link #keyNavEnabled} = false`.
 */
Ext.define('Ext.form.field.Spinner', {
    extend: 'Ext.form.field.Trigger',
    alias: 'widget.spinnerfield',
    alternateClassName: 'Ext.form.Spinner',
    requires: ['Ext.util.KeyNav'],

    trigger1Cls: Ext.baseCSSPrefix + 'form-spinner-up',
    trigger2Cls: Ext.baseCSSPrefix + 'form-spinner-down',

    /**
     * @cfg {Boolean} spinUpEnabled
     * Specifies whether the up spinner button is enabled. Defaults to true. To change this after the component is
     * created, use the {@link #setSpinUpEnabled} method.
     */
    spinUpEnabled: true,

    /**
     * @cfg {Boolean} spinDownEnabled
     * Specifies whether the down spinner button is enabled. Defaults to true. To change this after the component is
     * created, use the {@link #setSpinDownEnabled} method.
     */
    spinDownEnabled: true,

    /**
     * @cfg {Boolean} keyNavEnabled
     * Specifies whether the up and down arrow keys should trigger spinning up and down. Defaults to true.
     */
    keyNavEnabled: true,

    /**
     * @cfg {Boolean} mouseWheelEnabled
     * Specifies whether the mouse wheel should trigger spinning up and down while the field has focus.
     * Defaults to true.
     */
    mouseWheelEnabled: true,

    /**
     * @cfg {Boolean} repeatTriggerClick
     * Whether a {@link Ext.util.ClickRepeater click repeater} should be attached to the spinner buttons.
     * Defaults to true.
     */
    repeatTriggerClick: true,

    /**
     * @method
     * @protected
     * This method is called when the spinner up button is clicked, or when the up arrow key is pressed if
     * {@link #keyNavEnabled} is true. Must be implemented by subclasses.
     */
    onSpinUp: Ext.emptyFn,

    /**
     * @method
     * @protected
     * This method is called when the spinner down button is clicked, or when the down arrow key is pressed if
     * {@link #keyNavEnabled} is true. Must be implemented by subclasses.
     */
    onSpinDown: Ext.emptyFn,

    triggerTpl: '<td style="{triggerStyle}">' +
                    '<div class="' + Ext.baseCSSPrefix + 'trigger-index-0 ' + Ext.baseCSSPrefix + 'form-trigger ' + Ext.baseCSSPrefix + 'form-spinner-up" role="button"></div>' +
                    '<div class="' + Ext.baseCSSPrefix + 'trigger-index-1 ' + Ext.baseCSSPrefix + 'form-trigger ' + Ext.baseCSSPrefix + 'form-spinner-down" role="button"></div>' +
                '</td>' +
            '</tr>',

    initComponent: function() {
        this.callParent();

        this.addEvents(
            /**
             * @event spin
             * Fires when the spinner is made to spin up or down.
             * @param {Ext.form.field.Spinner} this
             * @param {String} direction Either 'up' if spinning up, or 'down' if spinning down.
             */
            'spin',

            /**
             * @event spinup
             * Fires when the spinner is made to spin up.
             * @param {Ext.form.field.Spinner} this
             */
            'spinup',

            /**
             * @event spindown
             * Fires when the spinner is made to spin down.
             * @param {Ext.form.field.Spinner} this
             */
            'spindown'
        );
    },

    /**
     * @private
     * Override.
     */
    onRender: function() {
        var me = this,
            triggers;

        me.callParent(arguments);
        triggers = me.triggerEl;
        
        /**
         * @property {Ext.Element} spinUpEl
         * The spinner up button element
         */
        me.spinUpEl = triggers.item(0);
        /**
         * @property {Ext.Element} spinDownEl
         * The spinner down button element
         */
        me.spinDownEl = triggers.item(1);
        
        me.triggerCell = me.spinUpEl.parent(); 

        // Set initial enabled/disabled states
        me.setSpinUpEnabled(me.spinUpEnabled);
        me.setSpinDownEnabled(me.spinDownEnabled);

        // Init up/down arrow keys
        if (me.keyNavEnabled) {
            me.spinnerKeyNav = new Ext.util.KeyNav(me.inputEl, {
                scope: me,
                up: me.spinUp,
                down: me.spinDown
            });
        }

        // Init mouse wheel
        if (me.mouseWheelEnabled) {
            me.mon(me.bodyEl, 'mousewheel', me.onMouseWheel, me);
        }
    },

    getSubTplMarkup: function() {
        var me = this,
            field = Ext.form.field.Base.prototype.getSubTplMarkup.apply(me, arguments);

        return '<table id="' + me.id + '-triggerWrap" class="' + Ext.baseCSSPrefix + 'form-trigger-wrap" cellpadding="0" cellspacing="0">' +
            '<tbody>' +
                '<tr><td id="' + me.id + '-inputCell" class="' + Ext.baseCSSPrefix + 'form-trigger-input-cell">' + field + '</td>' +
                me.getTriggerMarkup() +
            '</tbody></table>';
    },

    getTriggerMarkup: function() {
        var me = this,
            hideTrigger = (me.readOnly || me.hideTrigger);

        return me.getTpl('triggerTpl').apply({
            triggerStyle: 'width:' + me.triggerWidth + (hideTrigger ? 'px;display:none' : 'px')
        });
    },

    /**
     * Get the total width of the spinner button area.
     * @return {Number} The total spinner button width
     */
    getTriggerWidth: function() {
        var me = this,
            totalTriggerWidth = 0;

        if (me.triggerWrap && !me.hideTrigger && !me.readOnly) {
            totalTriggerWidth = me.triggerWidth;
        }
        return totalTriggerWidth;
    },

    /**
     * @private
     * Handles the spinner up button clicks.
     */
    onTrigger1Click: function() {
        this.spinUp();
    },

    /**
     * @private
     * Handles the spinner down button clicks.
     */
    onTrigger2Click: function() {
        this.spinDown();
    },

    // private
    // Handle trigger mouse up gesture; refocuses the input element upon end of spin.
    onTriggerWrapMouseup: function() {
        this.inputEl.focus();
    },

    /**
     * Triggers the spinner to step up; fires the {@link #spin} and {@link #spinup} events and calls the
     * {@link #onSpinUp} method. Does nothing if the field is {@link #disabled} or if {@link #spinUpEnabled}
     * is false.
     */
    spinUp: function() {
        var me = this;
        if (me.spinUpEnabled && !me.disabled) {
            me.fireEvent('spin', me, 'up');
            me.fireEvent('spinup', me);
            me.onSpinUp();
        }
    },

    /**
     * Triggers the spinner to step down; fires the {@link #spin} and {@link #spindown} events and calls the
     * {@link #onSpinDown} method. Does nothing if the field is {@link #disabled} or if {@link #spinDownEnabled}
     * is false.
     */
    spinDown: function() {
        var me = this;
        if (me.spinDownEnabled && !me.disabled) {
            me.fireEvent('spin', me, 'down');
            me.fireEvent('spindown', me);
            me.onSpinDown();
        }
    },

    /**
     * Sets whether the spinner up button is enabled.
     * @param {Boolean} enabled true to enable the button, false to disable it.
     */
    setSpinUpEnabled: function(enabled) {
        var me = this,
            wasEnabled = me.spinUpEnabled;
        me.spinUpEnabled = enabled;
        if (wasEnabled !== enabled && me.rendered) {
            me.spinUpEl[enabled ? 'removeCls' : 'addCls'](me.trigger1Cls + '-disabled');
        }
    },

    /**
     * Sets whether the spinner down button is enabled.
     * @param {Boolean} enabled true to enable the button, false to disable it.
     */
    setSpinDownEnabled: function(enabled) {
        var me = this,
            wasEnabled = me.spinDownEnabled;
        me.spinDownEnabled = enabled;
        if (wasEnabled !== enabled && me.rendered) {
            me.spinDownEl[enabled ? 'removeCls' : 'addCls'](me.trigger2Cls + '-disabled');
        }
    },

    /**
     * @private
     * Handles mousewheel events on the field
     */
    onMouseWheel: function(e) {
        var me = this,
            delta;
        if (me.hasFocus) {
            delta = e.getWheelDelta();
            if (delta > 0) {
                me.spinUp();
            }
            else if (delta < 0) {
                me.spinDown();
            }
            e.stopEvent();
        }
    },

    onDestroy: function() {
        Ext.destroyMembers(this, 'spinnerKeyNav', 'spinUpEl', 'spinDownEl');
        this.callParent();
    }

});
/**
 * @docauthor Jason Johnston <jason@sencha.com>
 *
 * A numeric text field that provides automatic keystroke filtering to disallow non-numeric characters,
 * and numeric validation to limit the value to a range of valid numbers. The range of acceptable number
 * values can be controlled by setting the {@link #minValue} and {@link #maxValue} configs, and fractional
 * decimals can be disallowed by setting {@link #allowDecimals} to `false`.
 *
 * By default, the number field is also rendered with a set of up/down spinner buttons and has
 * up/down arrow key and mouse wheel event listeners attached for incrementing/decrementing the value by the
 * {@link #step} value. To hide the spinner buttons set `{@link #hideTrigger hideTrigger}:true`; to disable
 * the arrow key and mouse wheel handlers set `{@link #keyNavEnabled keyNavEnabled}:false` and
 * `{@link #mouseWheelEnabled mouseWheelEnabled}:false`. See the example below.
 *
 * # Example usage
 *
 *     @example
 *     Ext.create('Ext.form.Panel', {
 *         title: 'On The Wall',
 *         width: 300,
 *         bodyPadding: 10,
 *         renderTo: Ext.getBody(),
 *         items: [{
 *             xtype: 'numberfield',
 *             anchor: '100%',
 *             name: 'bottles',
 *             fieldLabel: 'Bottles of Beer',
 *             value: 99,
 *             maxValue: 99,
 *             minValue: 0
 *         }],
 *         buttons: [{
 *             text: 'Take one down, pass it around',
 *             handler: function() {
 *                 this.up('form').down('[name=bottles]').spinDown();
 *             }
 *         }]
 *     });
 *
 * # Removing UI Enhancements
 *
 *     @example
 *     Ext.create('Ext.form.Panel', {
 *         title: 'Personal Info',
 *         width: 300,
 *         bodyPadding: 10,
 *         renderTo: Ext.getBody(),
 *         items: [{
 *             xtype: 'numberfield',
 *             anchor: '100%',
 *             name: 'age',
 *             fieldLabel: 'Age',
 *             minValue: 0, //prevents negative numbers
 *
 *             // Remove spinner buttons, and arrow key and mouse wheel listeners
 *             hideTrigger: true,
 *             keyNavEnabled: false,
 *             mouseWheelEnabled: false
 *         }]
 *     });
 *
 * # Using Step
 *
 *     @example
 *     Ext.create('Ext.form.Panel', {
 *         renderTo: Ext.getBody(),
 *         title: 'Step',
 *         width: 300,
 *         bodyPadding: 10,
 *         items: [{
 *             xtype: 'numberfield',
 *             anchor: '100%',
 *             name: 'evens',
 *             fieldLabel: 'Even Numbers',
 *
 *             // Set step so it skips every other number
 *             step: 2,
 *             value: 0,
 *
 *             // Add change handler to force user-entered numbers to evens
 *             listeners: {
 *                 change: function(field, value) {
 *                     value = parseInt(value, 10);
 *                     field.setValue(value + value % 2);
 *                 }
 *             }
 *         }]
 *     });
 */
Ext.define('Ext.form.field.Number', {
    extend:'Ext.form.field.Spinner',
    alias: 'widget.numberfield',
    alternateClassName: ['Ext.form.NumberField', 'Ext.form.Number'],

    /**
     * @cfg {RegExp} stripCharsRe
     * @private
     */
    /**
     * @cfg {RegExp} maskRe
     * @private
     */

    /**
     * @cfg {Boolean} allowDecimals
     * False to disallow decimal values
     */
    allowDecimals : true,

    //<locale>
    /**
     * @cfg {String} decimalSeparator
     * Character(s) to allow as the decimal separator
     */
    decimalSeparator : '.',
    //</locale>
    
    //<locale>
    /**
     * @cfg {Boolean} [submitLocaleSeparator=true]
     * False to ensure that the {@link #getSubmitValue} method strips
     * always uses `.` as the separator, regardless of the {@link #decimalSeparator}
     * configuration.
     */
    submitLocaleSeparator: true,
    //</locale>

    //<locale>
    /**
     * @cfg {Number} decimalPrecision
     * The maximum precision to display after the decimal separator
     */
    decimalPrecision : 2,
    //</locale>

    /**
     * @cfg {Number} minValue
     * The minimum allowed value. Will be used by the field's validation logic,
     * and for {@link Ext.form.field.Spinner#setSpinUpEnabled enabling/disabling the down spinner button}.
     *
     * Defaults to Number.NEGATIVE_INFINITY.
     */
    minValue: Number.NEGATIVE_INFINITY,

    /**
     * @cfg {Number} maxValue
     * The maximum allowed value. Will be used by the field's validation logic, and for
     * {@link Ext.form.field.Spinner#setSpinUpEnabled enabling/disabling the up spinner button}.
     *
     * Defaults to Number.MAX_VALUE.
     */
    maxValue: Number.MAX_VALUE,

    /**
     * @cfg {Number} step
     * Specifies a numeric interval by which the field's value will be incremented or decremented when the user invokes
     * the spinner.
     */
    step: 1,

    //<locale>
    /**
     * @cfg {String} minText
     * Error text to display if the minimum value validation fails.
     */
    minText : 'The minimum value for this field is {0}',
    //</locale>

    //<locale>
    /**
     * @cfg {String} maxText
     * Error text to display if the maximum value validation fails.
     */
    maxText : 'The maximum value for this field is {0}',
    //</locale>

    //<locale>
    /**
     * @cfg {String} nanText
     * Error text to display if the value is not a valid number. For example, this can happen if a valid character like
     * '.' or '-' is left in the field with no number.
     */
    nanText : '{0} is not a valid number',
    //</locale>

    //<locale>
    /**
     * @cfg {String} negativeText
     * Error text to display if the value is negative and {@link #minValue} is set to 0. This is used instead of the
     * {@link #minText} in that circumstance only.
     */
    negativeText : 'The value cannot be negative',
    //</locale>

    /**
     * @cfg {String} baseChars
     * The base set of characters to evaluate as valid numbers.
     */
    baseChars : '0123456789',

    /**
     * @cfg {Boolean} autoStripChars
     * True to automatically strip not allowed characters from the field.
     */
    autoStripChars: false,

    initComponent: function() {
        var me = this,
            allowed;

        me.callParent();

        me.setMinValue(me.minValue);
        me.setMaxValue(me.maxValue);

        // Build regexes for masking and stripping based on the configured options
        if (me.disableKeyFilter !== true) {
            allowed = me.baseChars + '';
            if (me.allowDecimals) {
                allowed += me.decimalSeparator;
            }
            if (me.minValue < 0) {
                allowed += '-';
            }
            allowed = Ext.String.escapeRegex(allowed);
            me.maskRe = new RegExp('[' + allowed + ']');
            if (me.autoStripChars) {
                me.stripCharsRe = new RegExp('[^' + allowed + ']', 'gi');
            }
        }
    },

    /**
     * Runs all of Number's validations and returns an array of any errors. Note that this first runs Text's
     * validations, so the returned array is an amalgamation of all field errors. The additional validations run test
     * that the value is a number, and that it is within the configured min and max values.
     * @param {Object} [value] The value to get errors for (defaults to the current field value)
     * @return {String[]} All validation errors for this field
     */
    getErrors: function(value) {
        var me = this,
            errors = me.callParent(arguments),
            format = Ext.String.format,
            num;

        value = Ext.isDefined(value) ? value : this.processRawValue(this.getRawValue());

        if (value.length < 1) { // if it's blank and textfield didn't flag it then it's valid
             return errors;
        }

        value = String(value).replace(me.decimalSeparator, '.');

        if(isNaN(value)){
            errors.push(format(me.nanText, value));
        }

        num = me.parseValue(value);

        if (me.minValue === 0 && num < 0) {
            errors.push(this.negativeText);
        }
        else if (num < me.minValue) {
            errors.push(format(me.minText, me.minValue));
        }

        if (num > me.maxValue) {
            errors.push(format(me.maxText, me.maxValue));
        }


        return errors;
    },

    rawToValue: function(rawValue) {
        var value = this.fixPrecision(this.parseValue(rawValue));
        if (value === null) {
            value = rawValue || null;
        }
        return  value;
    },

    valueToRaw: function(value) {
        var me = this,
            decimalSeparator = me.decimalSeparator;
        value = me.parseValue(value);
        value = me.fixPrecision(value);
        value = Ext.isNumber(value) ? value : parseFloat(String(value).replace(decimalSeparator, '.'));
        value = isNaN(value) ? '' : String(value).replace('.', decimalSeparator);
        return value;
    },
    
    getSubmitValue: function() {
        var me = this,
            value = me.callParent();
            
        if (!me.submitLocaleSeparator) {
            value = value.replace(me.decimalSeparator, '.');
        }  
        return value;
    },

    onChange: function() {
        this.toggleSpinners();
        this.callParent(arguments);
    },
    
    toggleSpinners: function(){
        var me = this,
            value = me.getValue(),
            valueIsNull = value === null;
            
        me.setSpinUpEnabled(valueIsNull || value < me.maxValue);
        me.setSpinDownEnabled(valueIsNull || value > me.minValue);
    },

    /**
     * Replaces any existing {@link #minValue} with the new value.
     * @param {Number} value The minimum value
     */
    setMinValue : function(value) {
        this.minValue = Ext.Number.from(value, Number.NEGATIVE_INFINITY);
        this.toggleSpinners();
    },

    /**
     * Replaces any existing {@link #maxValue} with the new value.
     * @param {Number} value The maximum value
     */
    setMaxValue: function(value) {
        this.maxValue = Ext.Number.from(value, Number.MAX_VALUE);
        this.toggleSpinners();
    },

    // private
    parseValue : function(value) {
        value = parseFloat(String(value).replace(this.decimalSeparator, '.'));
        return isNaN(value) ? null : value;
    },

    /**
     * @private
     */
    fixPrecision : function(value) {
        var me = this,
            nan = isNaN(value),
            precision = me.decimalPrecision;

        if (nan || !value) {
            return nan ? '' : value;
        } else if (!me.allowDecimals || precision <= 0) {
            precision = 0;
        }

        return parseFloat(Ext.Number.toFixed(parseFloat(value), precision));
    },

    beforeBlur : function() {
        var me = this,
            v = me.parseValue(me.getRawValue());

        if (!Ext.isEmpty(v)) {
            me.setValue(v);
        }
    },

    onSpinUp: function() {
        var me = this;
        if (!me.readOnly) {
            me.setValue(Ext.Number.constrain(me.getValue() + me.step, me.minValue, me.maxValue));
        }
    },

    onSpinDown: function() {
        var me = this;
        if (!me.readOnly) {
            me.setValue(Ext.Number.constrain(me.getValue() - me.step, me.minValue, me.maxValue));
        }
    }
});



/**
 * FieldContainer is a derivation of {@link Ext.container.Container Container} that implements the
 * {@link Ext.form.Labelable Labelable} mixin. This allows it to be configured so that it is rendered with
 * a {@link #fieldLabel field label} and optional {@link #msgTarget error message} around its sub-items.
 * This is useful for arranging a group of fields or other components within a single item in a form, so
 * that it lines up nicely with other fields. A common use is for grouping a set of related fields under
 * a single label in a form.
 * 
 * The container's configured {@link #cfg-items} will be layed out within the field body area according to the
 * configured {@link #layout} type. The default layout is `'autocontainer'`.
 * 
 * Like regular fields, FieldContainer can inherit its decoration configuration from the
 * {@link Ext.form.Panel#fieldDefaults fieldDefaults} of an enclosing FormPanel. In addition,
 * FieldContainer itself can pass {@link #fieldDefaults} to any {@link Ext.form.Labelable fields}
 * it may itself contain.
 * 
 * If you are grouping a set of {@link Ext.form.field.Checkbox Checkbox} or {@link Ext.form.field.Radio Radio}
 * fields in a single labeled container, consider using a {@link Ext.form.CheckboxGroup}
 * or {@link Ext.form.RadioGroup} instead as they are specialized for handling those types.
 *
 * # Example
 * 
 *     @example
 *     Ext.create('Ext.form.Panel', {
 *         title: 'FieldContainer Example',
 *         width: 550,
 *         bodyPadding: 10,
 * 
 *         items: [{
 *             xtype: 'fieldcontainer',
 *             fieldLabel: 'Last Three Jobs',
 *             labelWidth: 100,
 * 
 *             // The body area will contain three text fields, arranged
 *             // horizontally, separated by draggable splitters.
 *             layout: 'hbox',
 *             items: [{
 *                 xtype: 'textfield',
 *                 flex: 1
 *             }, {
 *                 xtype: 'splitter'
 *             }, {
 *                 xtype: 'textfield',
 *                 flex: 1
 *             }, {
 *                 xtype: 'splitter'
 *             }, {
 *                 xtype: 'textfield',
 *                 flex: 1
 *             }]
 *         }],
 *         renderTo: Ext.getBody()
 *     });
 * 
 * # Usage of fieldDefaults
 *
 *     @example
 *     Ext.create('Ext.form.Panel', {
 *         title: 'FieldContainer Example',
 *         width: 350,
 *         bodyPadding: 10,
 * 
 *         items: [{
 *             xtype: 'fieldcontainer',
 *             fieldLabel: 'Your Name',
 *             labelWidth: 75,
 *             defaultType: 'textfield',
 * 
 *             // Arrange fields vertically, stretched to full width
 *             layout: 'anchor',
 *             defaults: {
 *                 layout: '100%'
 *             },
 * 
 *             // These config values will be applied to both sub-fields, except
 *             // for Last Name which will use its own msgTarget.
 *             fieldDefaults: {
 *                 msgTarget: 'under',
 *                 labelAlign: 'top'
 *             },
 * 
 *             items: [{
 *                 fieldLabel: 'First Name',
 *                 name: 'firstName'
 *             }, {
 *                 fieldLabel: 'Last Name',
 *                 name: 'lastName',
 *                 msgTarget: 'under'
 *             }]
 *         }],
 *         renderTo: Ext.getBody()
 *     });
 * 
 * @docauthor Jason Johnston <jason@sencha.com>
 */
Ext.define('Ext.form.FieldContainer', {
    extend: 'Ext.container.Container',
    mixins: {
        labelable: 'Ext.form.Labelable',
        fieldAncestor: 'Ext.form.FieldAncestor'
    },
    requires: 'Ext.layout.component.field.FieldContainer',

    alias: 'widget.fieldcontainer',

    componentLayout: 'fieldcontainer',
    
    componentCls: Ext.baseCSSPrefix + 'form-fieldcontainer',

    /**
     * @cfg {Boolean} combineLabels
     * If set to true, and there is no defined {@link #fieldLabel}, the field container will automatically
     * generate its label by combining the labels of all the fields it contains. Defaults to false.
     */
    combineLabels: false,

    //<locale>
    /**
     * @cfg {String} labelConnector
     * The string to use when joining the labels of individual sub-fields, when {@link #combineLabels} is
     * set to true. Defaults to ', '.
     */
    labelConnector: ', ',
    //</locale>

    /**
     * @cfg {Boolean} combineErrors
     * If set to true, the field container will automatically combine and display the validation errors from
     * all the fields it contains as a single error on the container, according to the configured
     * {@link #msgTarget}. Defaults to false.
     */
    combineErrors: false,

    maskOnDisable: false,

    fieldSubTpl: '{%this.renderContainer(out,values)%}',

    initComponent: function() {
        var me = this;

        // Init mixins
        me.initLabelable();
        me.initFieldAncestor();

        me.callParent();
    },

    beforeRender: function(){
        this.callParent(arguments);
        this.beforeLabelableRender(arguments);
    },

    /**
     * @protected Called when a {@link Ext.form.Labelable} instance is added to the container's subtree.
     * @param {Ext.form.Labelable} labelable The instance that was added
     */
    onLabelableAdded: function(labelable) {
        var me = this;
        me.mixins.fieldAncestor.onLabelableAdded.call(this, labelable);
        me.updateLabel();
    },

    /**
     * @protected Called when a {@link Ext.form.Labelable} instance is removed from the container's subtree.
     * @param {Ext.form.Labelable} labelable The instance that was removed
     */
    onLabelableRemoved: function(labelable) {
        var me = this;
        me.mixins.fieldAncestor.onLabelableRemoved.call(this, labelable);
        me.updateLabel();
    },

    initRenderTpl: function() {
        var me = this;
        if (!me.hasOwnProperty('renderTpl')) {
            me.renderTpl = me.getTpl('labelableRenderTpl');
        }
        return me.callParent();
    },

    initRenderData: function() {
        return Ext.applyIf(this.callParent(), this.getLabelableRenderData());
    },

    /**
     * Returns the combined field label if {@link #combineLabels} is set to true and if there is no
     * set {@link #fieldLabel}. Otherwise returns the fieldLabel like normal. You can also override
     * this method to provide a custom generated label.
     * @template
     * @return {String} The label, or empty string if none.
     */
    getFieldLabel: function() {
        var label = this.fieldLabel || '';
        if (!label && this.combineLabels) {
            label = Ext.Array.map(this.query('[isFieldLabelable]'), function(field) {
                return field.getFieldLabel();
            }).join(this.labelConnector);
        }
        return label;
    },

    getSubTplData: function() {
        var ret = this.initRenderData();

        Ext.apply(ret, this.subTplData);
        return ret;
    },

    getSubTplMarkup: function() {
        var me = this,
            tpl = me.getTpl('fieldSubTpl'),
            html;

        if (!tpl.renderContent) {
            me.setupRenderTpl(tpl);
        }

        html = tpl.apply(me.getSubTplData());
        return html;
    },

    /**
     * @private Updates the content of the labelEl if it is rendered
     */
    updateLabel: function() {
        var me = this,
            label = me.labelEl;
        if (label) {
            me.setFieldLabel(me.getFieldLabel());
        }
    },


    /**
     * @private Fired when the error message of any field within the container changes, and updates the
     * combined error message to match.
     */
    onFieldErrorChange: function(field, activeError) {
        if (this.combineErrors) {
            var me = this,
                oldError = me.getActiveError(),
                invalidFields = Ext.Array.filter(me.query('[isFormField]'), function(field) {
                    return field.hasActiveError();
                }),
                newErrors = me.getCombinedErrors(invalidFields);

            if (newErrors) {
                me.setActiveErrors(newErrors);
            } else {
                me.unsetActiveError();
            }

            if (oldError !== me.getActiveError()) {
                me.doComponentLayout();
            }
        }
    },

    /**
     * Takes an Array of invalid {@link Ext.form.field.Field} objects and builds a combined list of error
     * messages from them. Defaults to prepending each message by the field name and a colon. This
     * can be overridden to provide custom combined error message handling, for instance changing
     * the format of each message or sorting the array (it is sorted in order of appearance by default).
     * @param {Ext.form.field.Field[]} invalidFields An Array of the sub-fields which are currently invalid.
     * @return {String[]} The combined list of error messages
     */
    getCombinedErrors: function(invalidFields) {
        var errors = [],
            f,
            fLen   = invalidFields.length,
            field,
            activeErrors, a, aLen,
            error, label;

        for (f = 0; f < fLen; f++) {
            field = invalidFields[f];
            activeErrors = field.getActiveErrors();
            aLen         = activeErrors.length;

            for (a = 0; a < aLen; a++) {
                error = activeErrors[a];
                label = field.getFieldLabel();

                errors.push((label ? label + ': ' : '') + error);
            }
        }

        return errors;
    },

    getTargetEl: function() {
        return this.bodyEl || this.callParent();
    }
});

/**
 * @docauthor Jason Johnston <jason@sencha.com>
 *
 * A container for grouping sets of fields, rendered as a HTML `fieldset` element. The {@link #title}
 * config will be rendered as the fieldset's `legend`.
 *
 * While FieldSets commonly contain simple groups of fields, they are general {@link Ext.container.Container Containers}
 * and may therefore contain any type of components in their {@link #cfg-items}, including other nested containers.
 * The default {@link #layout} for the FieldSet's items is `'anchor'`, but it can be configured to use any other
 * layout type.
 *
 * FieldSets may also be collapsed if configured to do so; this can be done in two ways:
 *
 * 1. Set the {@link #collapsible} config to true; this will result in a collapse button being rendered next to
 *    the {@link #title legend title}, or:
 * 2. Set the {@link #checkboxToggle} config to true; this is similar to using {@link #collapsible} but renders
 *    a {@link Ext.form.field.Checkbox checkbox} in place of the toggle button. The fieldset will be expanded when the
 *    checkbox is checked and collapsed when it is unchecked. The checkbox will also be included in the
 *    {@link Ext.form.Basic#submit form submit parameters} using the {@link #checkboxName} as its parameter name.
 *
 * # Example usage
 *
 *     @example
 *     Ext.create('Ext.form.Panel', {
 *         title: 'Simple Form with FieldSets',
 *         labelWidth: 75, // label settings here cascade unless overridden
 *         url: 'save-form.php',
 *         frame: true,
 *         bodyStyle: 'padding:5px 5px 0',
 *         width: 550,
 *         renderTo: Ext.getBody(),
 *         layout: 'column', // arrange fieldsets side by side
 *         defaults: {
 *             bodyPadding: 4
 *         },
 *         items: [{
 *             // Fieldset in Column 1 - collapsible via toggle button
 *             xtype:'fieldset',
 *             columnWidth: 0.5,
 *             title: 'Fieldset 1',
 *             collapsible: true,
 *             defaultType: 'textfield',
 *             defaults: {anchor: '100%'},
 *             layout: 'anchor',
 *             items :[{
 *                 fieldLabel: 'Field 1',
 *                 name: 'field1'
 *             }, {
 *                 fieldLabel: 'Field 2',
 *                 name: 'field2'
 *             }]
 *         }, {
 *             // Fieldset in Column 2 - collapsible via checkbox, collapsed by default, contains a panel
 *             xtype:'fieldset',
 *             title: 'Show Panel', // title or checkboxToggle creates fieldset header
 *             columnWidth: 0.5,
 *             checkboxToggle: true,
 *             collapsed: true, // fieldset initially collapsed
 *             layout:'anchor',
 *             items :[{
 *                 xtype: 'panel',
 *                 anchor: '100%',
 *                 title: 'Panel inside a fieldset',
 *                 frame: true,
 *                 height: 52
 *             }]
 *         }]
 *     });
 */
Ext.define('Ext.form.FieldSet', {
    extend: 'Ext.container.Container',
    alias: 'widget.fieldset',
    uses: ['Ext.form.field.Checkbox', 'Ext.panel.Tool', 'Ext.layout.container.Anchor', 'Ext.layout.component.FieldSet'],

    /**
     * @cfg {String} title
     * A title to be displayed in the fieldset's legend. May contain HTML markup.
     */

    /**
     * @cfg {Boolean} [checkboxToggle=false]
     * Set to true to render a checkbox into the fieldset frame just in front of the legend to expand/collapse the
     * fieldset when the checkbox is toggled.. This checkbox will be included in form submits using
     * the {@link #checkboxName}.
     */

    /**
     * @cfg {String} checkboxName
     * The name to assign to the fieldset's checkbox if {@link #checkboxToggle} = true
     * (defaults to '[fieldset id]-checkbox').
     */

    /**
     * @cfg {Boolean} [collapsible=false]
     * Set to true to make the fieldset collapsible and have the expand/collapse toggle button automatically rendered
     * into the legend element, false to keep the fieldset statically sized with no collapse button.
     * Another option is to configure {@link #checkboxToggle}. Use the {@link #collapsed} config to collapse the
     * fieldset by default.
     */

    /**
     * @cfg {Boolean} collapsed
     * Set to true to render the fieldset as collapsed by default. If {@link #checkboxToggle} is specified, the checkbox
     * will also be unchecked by default.
     */
    collapsed: false,

    /**
     * @cfg {Boolean} [toggleOnTitleClick=true]
     * Set to true will add a listener to the titleCmp property for the click event which will execute the
     * {@link #toggle} method. This option is only used when the {@link #collapsible} property is set to true.
     */
    toggleOnTitleClick : true,

    /**
     * @property {Ext.Component} legend
     * The component for the fieldset's legend. Will only be defined if the configuration requires a legend to be
     * created, by setting the {@link #title} or {@link #checkboxToggle} options.
     */

    /**
     * @cfg {String} [baseCls='x-fieldset']
     * The base CSS class applied to the fieldset.
     */
    baseCls: Ext.baseCSSPrefix + 'fieldset',

    /**
     * @cfg {String} layout
     * The {@link Ext.container.Container#layout} for the fieldset's immediate child items.
     */
    layout: 'anchor',

    border: 1,

    componentLayout: 'fieldset',

    autoEl: 'fieldset',

    childEls: [
        'body'
    ],

    renderTpl: [
        '{%this.renderLegend(out,values);%}',
        '<div id="{id}-body" class="{baseCls}-body">',
            '{%this.renderContainer(out,values);%}',
        '</div>'
    ],

    stateEvents : [ 'collapse', 'expand' ],

    maskOnDisable: false,

    beforeDestroy: function(){
        var me = this,
            legend = me.legend;

        if (legend) {
            // get rid of the ownerCt since it's not a proper item
            delete legend.ownerCt;
            legend.destroy();
            me.legend = null;
        }
        me.callParent();
    },

    initComponent: function() {
        var me = this,
            baseCls = me.baseCls;

        me.callParent();

        me.addEvents(

            /**
             * @event beforeexpand
             * Fires before this FieldSet is expanded. Return false to prevent the expand.
             * @param {Ext.form.FieldSet} f The FieldSet being expanded.
             */
            "beforeexpand",

            /**
             * @event beforecollapse
             * Fires before this FieldSet is collapsed. Return false to prevent the collapse.
             * @param {Ext.form.FieldSet} f The FieldSet being collapsed.
             */
            "beforecollapse",

            /**
             * @event expand
             * Fires after this FieldSet has expanded.
             * @param {Ext.form.FieldSet} f The FieldSet that has been expanded.
             */
            "expand",

            /**
             * @event collapse
             * Fires after this FieldSet has collapsed.
             * @param {Ext.form.FieldSet} f The FieldSet that has been collapsed.
             */
            "collapse"
        );

        if (me.collapsed) {
            me.addCls(baseCls + '-collapsed');
            me.collapse();
        }
        if (me.title) {
            me.addCls(baseCls + '-with-title');
        }
        if (me.title || me.checkboxToggle || me.collapsible) {
            me.addCls(baseCls + '-with-legend');
            me.legend = Ext.widget(me.createLegendCt());
        }
    },

    /**
     * Initialized the renderData to be used when rendering the renderTpl.
     * @return {Object} Object with keys and values that are going to be applied to the renderTpl
     * @private
     */
    initRenderData: function() {
        var data = this.callParent();

        data.baseCls = this.baseCls;

        return data;
    },

    getState: function () {
        var state = this.callParent();

        state = this.addPropertyToState(state, 'collapsed');

        return state;
    },

    afterCollapse: Ext.emptyFn,
    afterExpand: Ext.emptyFn,

    collapsedHorizontal: function () {
        return true;
    },

    collapsedVertical: function () {
        return true;
    },

    createLegendCt: function () {
        var me = this,
            items = [],
            legend = {
                xtype: 'container',
                baseCls: me.baseCls + '-header',
                id: me.id + '-legend',
                autoEl: 'legend',
                items: items,
                ownerCt: me,
                ownerLayout: me.componentLayout
            };

        // Checkbox
        if (me.checkboxToggle) {
            items.push(me.createCheckboxCmp());
        } else if (me.collapsible) {
            // Toggle button
            items.push(me.createToggleCmp());
        }

        // Title
        items.push(me.createTitleCmp());

        return legend;
    },

    /**
     * Creates the legend title component. This is only called internally, but could be overridden in subclasses to
     * customize the title component. If {@link #toggleOnTitleClick} is set to true, a listener for the click event
     * will toggle the collapsed state of the FieldSet.
     * @return Ext.Component
     * @protected
     */
    createTitleCmp: function() {
        var me  = this,
            cfg = {
                xtype : 'component',
                html  : me.title,
                cls   : me.baseCls + '-header-text',
                id    : me.id + '-legendTitle'
            };

        if (me.collapsible && me.toggleOnTitleClick) {
            cfg.listeners = {
                el : {
                    scope : me,
                    click : me.toggle
                }
            };
            cfg.cls += ' ' + me.baseCls + '-header-text-collapsible';
        }

        return (me.titleCmp = Ext.widget(cfg));
    },

    /**
     * @property {Ext.form.field.Checkbox} checkboxCmp
     * Refers to the {@link Ext.form.field.Checkbox} component that is added next to the title in the legend. Only
     * populated if the fieldset is configured with {@link #checkboxToggle}:true.
     */

    /**
     * Creates the checkbox component. This is only called internally, but could be overridden in subclasses to
     * customize the checkbox's configuration or even return an entirely different component type.
     * @return Ext.Component
     * @protected
     */
    createCheckboxCmp: function() {
        var me = this,
            suffix = '-checkbox';

        me.checkboxCmp = Ext.widget({
            xtype: 'checkbox',
            hideEmptyLabel: true,
            name: me.checkboxName || me.id + suffix,
            cls: me.baseCls + '-header' + suffix,
            id: me.id + '-legendChk',
            checked: !me.collapsed,
            listeners: {
                change: me.onCheckChange,
                scope: me
            }
        });
        return me.checkboxCmp;
    },

    /**
     * @property {Ext.panel.Tool} toggleCmp
     * Refers to the {@link Ext.panel.Tool} component that is added as the collapse/expand button next to the title in
     * the legend. Only populated if the fieldset is configured with {@link #collapsible}:true.
     */

    /**
     * Creates the toggle button component. This is only called internally, but could be overridden in subclasses to
     * customize the toggle component.
     * @return Ext.Component
     * @protected
     */
    createToggleCmp: function() {
        var me = this;
        me.toggleCmp = Ext.widget({
            xtype: 'tool',
            type: 'toggle',
            handler: me.toggle,
            id: me.id + '-legendToggle',
            scope: me
        });
        return me.toggleCmp;
    },

    doRenderLegend: function (out, renderData) {
        // Careful! This method is bolted on to the renderTpl so all we get for context is
        // the renderData! The "this" pointer is the renderTpl instance!

        var me = renderData.$comp,
            legend = me.legend,
            tree;
            
        // Create the Legend component if needed
        if (legend) {
            legend.ownerLayout.configureItem(legend);
            tree = legend.getRenderTree();
            Ext.DomHelper.generateMarkup(tree, out);
        }
    },

    finishRender: function () {
        var legend = this.legend;

        this.callParent();

        if (legend) {
            legend.finishRender();
        }
    },

    getCollapsed: function () {
        return this.collapsed ? 'top' : false;
    },

    getCollapsedDockedItems: function () {
        var legend = this.legend;

        return legend ? [ legend ] : [];
    },

    /**
     * Sets the title of this fieldset
     * @param {String} title The new title
     * @return {Ext.form.FieldSet} this
     */
    setTitle: function(title) {
        var me = this,
            legend = me.legend;
            
        me.title = title;
        if (me.rendered) {
            if (!me.legend) {
                me.legend = legend = Ext.widget(me.createLegendCt());
                legend.ownerLayout.configureItem(legend);
                legend.render(me.el, 0);
            }
            me.titleCmp.update(title);
        }
        return me;
    },

    getTargetEl : function() {
        return this.body || this.frameBody || this.el;
    },

    getContentTarget: function() {
        return this.body;
    },

    /**
     * Expands the fieldset.
     * @return {Ext.form.FieldSet} this
     */
    expand : function(){
        return this.setExpanded(true);
    },

    /**
     * Collapses the fieldset.
     * @return {Ext.form.FieldSet} this
     */
    collapse : function() {
        return this.setExpanded(false);
    },

    /**
     * @private Collapse or expand the fieldset
     */
    setExpanded: function(expanded) {
        var me = this,
            checkboxCmp = me.checkboxCmp,
            operation = expanded ? 'expand' : 'collapse';

        if (!me.rendered || me.fireEvent('before' + operation, me) !== false) {
            expanded = !!expanded;

            if (checkboxCmp) {
                checkboxCmp.setValue(expanded);
            }

            if (expanded) {
                me.removeCls(me.baseCls + '-collapsed');
            } else {
                me.addCls(me.baseCls + '-collapsed');
            }
            me.collapsed = !expanded;
            if (me.rendered) {
                // say explicitly we are not root because when we have a fixed/configured height
                // our ownerLayout would say we are root and so would not have it's height
                // updated since it's not included in the layout cycle
                me.updateLayout({ isRoot: false });
                me.fireEvent(operation, me);
            }
        }
        return me;
    },
    
    getRefItems: function(deep) {
        var refItems = this.callParent(arguments),
            legend = this.legend;

        // Prepend legend items to ensure correct order
        if (legend) {
            refItems.unshift(legend);
            if (deep) {
                refItems.unshift.apply(refItems, legend.getRefItems(true));
            }
        }
        return refItems;
    },

    /**
     * Toggle the fieldset's collapsed state to the opposite of what it is currently
     */
    toggle: function() {
        this.setExpanded(!!this.collapsed);
    },

    /**
     * @private
     * Handle changes in the checkbox checked state
     */
    onCheckChange: function(cmp, checked) {
        this.setExpanded(checked);
    },

    setupRenderTpl: function (renderTpl) {
        this.callParent(arguments);

        renderTpl.renderLegend = this.doRenderLegend;
    }
});




/**
 * A {@link Ext.form.FieldContainer field container} which has a specialized layout for arranging
 * {@link Ext.form.field.Checkbox} controls into columns, and provides convenience
 * {@link Ext.form.field.Field} methods for {@link #getValue getting}, {@link #setValue setting},
 * and {@link #validate validating} the group of checkboxes as a whole.
 *
 * # Validation
 *
 * Individual checkbox fields themselves have no default validation behavior, but
 * sometimes you want to require a user to select at least one of a group of checkboxes. CheckboxGroup
 * allows this by setting the config `{@link #allowBlank}:false`; when the user does not check at
 * least one of the checkboxes, the entire group will be highlighted as invalid and the
 * {@link #blankText error message} will be displayed according to the {@link #msgTarget} config.
 *
 * # Layout
 *
 * The default layout for CheckboxGroup makes it easy to arrange the checkboxes into
 * columns; see the {@link #columns} and {@link #vertical} config documentation for details. You may also
 * use a completely different layout by setting the {@link #layout} to one of the other supported layout
 * types; for instance you may wish to use a custom arrangement of hbox and vbox containers. In that case
 * the checkbox components at any depth will still be managed by the CheckboxGroup's validation.
 *
 *     @example
 *     Ext.create('Ext.form.Panel', {
 *         title: 'Checkbox Group',
 *         width: 300,
 *         height: 125,
 *         bodyPadding: 10,
 *         renderTo: Ext.getBody(),
 *         items:[{
 *             xtype: 'checkboxgroup',
 *             fieldLabel: 'Two Columns',
 *             // Arrange checkboxes into two columns, distributed vertically
 *             columns: 2,
 *             vertical: true,
 *             items: [
 *                 { boxLabel: 'Item 1', name: 'rb', inputValue: '1' },
 *                 { boxLabel: 'Item 2', name: 'rb', inputValue: '2', checked: true },
 *                 { boxLabel: 'Item 3', name: 'rb', inputValue: '3' },
 *                 { boxLabel: 'Item 4', name: 'rb', inputValue: '4' },
 *                 { boxLabel: 'Item 5', name: 'rb', inputValue: '5' },
 *                 { boxLabel: 'Item 6', name: 'rb', inputValue: '6' }
 *             ]
 *         }]
 *     });
 */
Ext.define('Ext.form.CheckboxGroup', {
    extend:'Ext.form.FieldContainer',
    mixins: {
        field: 'Ext.form.field.Field'
    },
    alias: 'widget.checkboxgroup',
    requires: ['Ext.layout.container.CheckboxGroup', 'Ext.form.field.Base'],

    /**
     * @cfg {String} name
     * @private
     */

    /**
     * @cfg {Ext.form.field.Checkbox[]/Object[]} items
     * An Array of {@link Ext.form.field.Checkbox Checkbox}es or Checkbox config objects to arrange in the group.
     */

    /**
     * @cfg {String/Number/Number[]} columns
     * Specifies the number of columns to use when displaying grouped checkbox/radio controls using automatic layout.
     * This config can take several types of values:
     *
     * - 'auto' - The controls will be rendered one per column on one row and the width of each column will be evenly
     *   distributed based on the width of the overall field container. This is the default.
     * - Number - If you specific a number (e.g., 3) that number of columns will be created and the contained controls
     *   will be automatically distributed based on the value of {@link #vertical}.
     * - Array - You can also specify an array of column widths, mixing integer (fixed width) and float (percentage
     *   width) values as needed (e.g., [100, .25, .75]). Any integer values will be rendered first, then any float
     *   values will be calculated as a percentage of the remaining space. Float values do not have to add up to 1
     *   (100%) although if you want the controls to take up the entire field container you should do so.
     */
    columns : 'auto',

    /**
     * @cfg {Boolean} vertical
     * True to distribute contained controls across columns, completely filling each column top to bottom before
     * starting on the next column. The number of controls in each column will be automatically calculated to keep
     * columns as even as possible. The default value is false, so that controls will be added to columns one at a time,
     * completely filling each row left to right before starting on the next row.
     */
    vertical : false,

    /**
     * @cfg {Boolean} allowBlank
     * False to validate that at least one item in the group is checked. If no items are selected at
     * validation time, {@link #blankText} will be used as the error text.
     */
    allowBlank : true,

    //<locale>
    /**
     * @cfg {String} blankText
     * Error text to display if the {@link #allowBlank} validation fails
     */
    blankText : "You must select at least one item in this group",
    //</locale>

    // private
    defaultType : 'checkboxfield',

    // private
    groupCls : Ext.baseCSSPrefix + 'form-check-group',

    /**
     * @cfg {String} [fieldBodyCls='x-form-checkboxgroup-body']
     * An extra CSS class to be applied to the body content element in addition to {@link #baseBodyCls}.
     */
    fieldBodyCls: Ext.baseCSSPrefix + 'form-checkboxgroup-body',

    // private
    layout: 'checkboxgroup',

    initComponent: function() {
        var me = this;
        me.callParent();
        me.initField();
    },

    /**
     * Initializes the field's value based on the initial config. If the {@link #value} config is specified then we use
     * that to set the value; otherwise we initialize the originalValue by querying the values of all sub-checkboxes
     * after they have been initialized.
     * @protected
     */
    initValue: function() {
        var me = this,
            valueCfg = me.value;
        me.originalValue = me.lastValue = valueCfg || me.getValue();
        if (valueCfg) {
            me.setValue(valueCfg);
        }
    },

    /**
     * When a checkbox is added to the group, monitor it for changes
     * @param {Object} field
     * @protected
     */
    onFieldAdded: function(field) {
        var me = this;
        if (field.isCheckbox) {
            me.mon(field, 'change', me.checkChange, me);
        }
        me.callParent(arguments);
    },

    onFieldRemoved: function(field) {
        var me = this;
        if (field.isCheckbox) {
            me.mun(field, 'change', me.checkChange, me);
        }
        me.callParent(arguments);
    },

    // private override - the group value is a complex object, compare using object serialization
    isEqual: function(value1, value2) {
        var toQueryString = Ext.Object.toQueryString;
        return toQueryString(value1) === toQueryString(value2);
    },

    /**
     * Runs CheckboxGroup's validations and returns an array of any errors. The only error by default is if allowBlank
     * is set to true and no items are checked.
     * @return {String[]} Array of all validation errors
     */
    getErrors: function() {
        var errors = [];
        if (!this.allowBlank && Ext.isEmpty(this.getChecked())) {
            errors.push(this.blankText);
        }
        return errors;
    },

    /**
     * @private Returns all checkbox components within the container
     * @param {String} [query] An additional query to add to the selector.
     */
    getBoxes: function(query) {
        return this.query('[isCheckbox]' + (query||''));
    },

    /**
     * @private Convenience function which calls the given function for every checkbox in the group
     * @param {Function} fn The function to call
     * @param {Object} [scope] scope object
     */
    eachBox: function(fn, scope) {
        Ext.Array.forEach(this.getBoxes(), fn, scope || this);
    },

    /**
     * Returns an Array of all checkboxes in the container which are currently checked
     * @return {Ext.form.field.Checkbox[]} Array of Ext.form.field.Checkbox components
     */
    getChecked: function() {
        return this.getBoxes('[checked]');
    },

    // private override
    isDirty: function(){
        var boxes = this.getBoxes(),
            b ,
            bLen  = boxes.length;

        for (b = 0; b < bLen; b++) {
            if (boxes[b].isDirty()) {
                return true;
            }
        }
    },

    // private override
    setReadOnly: function(readOnly) {
        var boxes = this.getBoxes(),
            b,
            bLen  = boxes.length;

        for (b = 0; b < bLen; b++) {
            boxes[b].setReadOnly(readOnly);
        }

        this.readOnly = readOnly;
    },

    /**
     * Resets the checked state of all {@link Ext.form.field.Checkbox checkboxes} in the group to their originally
     * loaded values and clears any validation messages.
     * See {@link Ext.form.Basic}.{@link Ext.form.Basic#trackResetOnLoad trackResetOnLoad}
     */
    reset: function() {
        var me = this,
            hadError = me.hasActiveError(),
            preventMark = me.preventMark;
        me.preventMark = true;
        me.batchChanges(function() {
            var boxes = me.getBoxes(),
                b,
                bLen  = boxes.length;

            for (b = 0; b < bLen; b++) {
                boxes[b].reset();
            }
        });
        me.preventMark = preventMark;
        me.unsetActiveError();
        if (hadError) {
            me.updateLayout();
        }
    },

    resetOriginalValue: function(){
        var me    = this,
            boxes = me.getBoxes(),
            b,
            bLen  = boxes.length;

        for (b = 0; b < bLen; b++) {
            boxes[b].resetOriginalValue();
        }

        me.originalValue = me.getValue();
        me.checkDirty();
    },


    /**
     * Sets the value(s) of all checkboxes in the group. The expected format is an Object of name-value pairs
     * corresponding to the names of the checkboxes in the group. Each pair can have either a single or multiple values:
     *
     *   - A single Boolean or String value will be passed to the `setValue` method of the checkbox with that name.
     *     See the rules in {@link Ext.form.field.Checkbox#setValue} for accepted values.
     *   - An Array of String values will be matched against the {@link Ext.form.field.Checkbox#inputValue inputValue}
     *     of checkboxes in the group with that name; those checkboxes whose inputValue exists in the array will be
     *     checked and others will be unchecked.
     *
     * If a checkbox's name is not in the mapping at all, it will be unchecked.
     *
     * An example:
     *
     *     var myCheckboxGroup = new Ext.form.CheckboxGroup({
     *         columns: 3,
     *         items: [{
     *             name: 'cb1',
     *             boxLabel: 'Single 1'
     *         }, {
     *             name: 'cb2',
     *             boxLabel: 'Single 2'
     *         }, {
     *             name: 'cb3',
     *             boxLabel: 'Single 3'
     *         }, {
     *             name: 'cbGroup',
     *             boxLabel: 'Grouped 1'
     *             inputValue: 'value1'
     *         }, {
     *             name: 'cbGroup',
     *             boxLabel: 'Grouped 2'
     *             inputValue: 'value2'
     *         }, {
     *             name: 'cbGroup',
     *             boxLabel: 'Grouped 3'
     *             inputValue: 'value3'
     *         }]
     *     });
     *
     *     myCheckboxGroup.setValue({
     *         cb1: true,
     *         cb3: false,
     *         cbGroup: ['value1', 'value3']
     *     });
     *
     * The above code will cause the checkbox named 'cb1' to be checked, as well as the first and third checkboxes named
     * 'cbGroup'. The other three checkboxes will be unchecked.
     *
     * @param {Object} value The mapping of checkbox names to values.
     * @return {Ext.form.CheckboxGroup} this
     */
    setValue: function(value) {
        var me    = this,
            boxes = me.getBoxes(),
            b,
            bLen  = boxes.length,
            box, name,
            cbValue;

        me.batchChanges(function() {
            for (b = 0; b < bLen; b++) {
                box = boxes[b];
                name = box.getName();
                cbValue = false;

                if (value && value.hasOwnProperty(name)) {
                    if (Ext.isArray(value[name])) {
                        cbValue = Ext.Array.contains(value[name], box.inputValue);
                    } else {
                        // single value, let the checkbox's own setValue handle conversion
                        cbValue = value[name];
                    }
                }

                box.setValue(cbValue);
            }
        });
        return me;
    },


    /**
     * Returns an object containing the values of all checked checkboxes within the group. Each key-value pair in the
     * object corresponds to a checkbox {@link Ext.form.field.Checkbox#name name}. If there is only one checked checkbox
     * with a particular name, the value of that pair will be the String {@link Ext.form.field.Checkbox#inputValue
     * inputValue} of that checkbox. If there are multiple checked checkboxes with that name, the value of that pair
     * will be an Array of the selected inputValues.
     *
     * The object format returned from this method can also be passed directly to the {@link #setValue} method.
     *
     * NOTE: In Ext 3, this method returned an array of Checkbox components; this was changed to make it more consistent
     * with other field components and with the {@link #setValue} argument signature. If you need the old behavior in
     * Ext 4+, use the {@link #getChecked} method instead.
     */
    getValue: function() {
        var values = {},
            boxes  = this.getBoxes(),
            b,
            bLen   = boxes.length,
            box, name, inputValue, bucket;

        for (b = 0; b < bLen; b++) {
            box        = boxes[b];
            name       = box.getName();
            inputValue = box.inputValue;

            if (box.getValue()) {
                if (values.hasOwnProperty(name)) {
                    bucket = values[name];
                    if (!Ext.isArray(bucket)) {
                        bucket = values[name] = [bucket];
                    }
                    bucket.push(inputValue);
                } else {
                    values[name] = inputValue;
                }
            }
        }

        return values;
    },

    /*
     * Don't return any data for submit; the form will get the info from the individual checkboxes themselves.
     */
    getSubmitData: function() {
        return null;
    },

    /*
     * Don't return any data for the model; the form will get the info from the individual checkboxes themselves.
     */
    getModelData: function() {
        return null;
    },

    validate: function() {
        var me = this,
            errors,
            isValid,
            wasValid;

        if (me.disabled) {
            isValid = true;
        } else {
            errors = me.getErrors();
            isValid = Ext.isEmpty(errors);
            wasValid = !me.hasActiveError();
            if (isValid) {
                me.unsetActiveError();
            } else {
                me.setActiveError(errors);
            }
        }
        if (isValid !== wasValid) {
            me.fireEvent('validitychange', me, isValid);
            me.updateLayout();
        }

        return isValid;
    }

}, function() {

    this.borrow(Ext.form.field.Base, ['markInvalid', 'clearInvalid']);

});


/**
 * A {@link Ext.form.FieldContainer field container} which has a specialized layout for arranging
 * {@link Ext.form.field.Radio} controls into columns, and provides convenience {@link Ext.form.field.Field}
 * methods for {@link #getValue getting}, {@link #setValue setting}, and {@link #validate validating} the
 * group of radio buttons as a whole.
 *
 * # Validation
 *
 * Individual radio buttons themselves have no default validation behavior, but
 * sometimes you want to require a user to select one of a group of radios. RadioGroup
 * allows this by setting the config `{@link #allowBlank}:false`; when the user does not check at
 * one of the radio buttons, the entire group will be highlighted as invalid and the
 * {@link #blankText error message} will be displayed according to the {@link #msgTarget} config.
 *
 * # Layout
 *
 * The default layout for RadioGroup makes it easy to arrange the radio buttons into
 * columns; see the {@link #columns} and {@link #vertical} config documentation for details. You may also
 * use a completely different layout by setting the {@link #layout} to one of the other supported layout
 * types; for instance you may wish to use a custom arrangement of hbox and vbox containers. In that case
 * the Radio components at any depth will still be managed by the RadioGroup's validation.
 *
 * # Example usage
 *
 *     @example
 *     Ext.create('Ext.form.Panel', {
 *         title: 'RadioGroup Example',
 *         width: 300,
 *         height: 125,
 *         bodyPadding: 10,
 *         renderTo: Ext.getBody(),
 *         items:[{
 *             xtype: 'radiogroup',
 *             fieldLabel: 'Two Columns',
 *             // Arrange radio buttons into two columns, distributed vertically
 *             columns: 2,
 *             vertical: true,
 *             items: [
 *                 { boxLabel: 'Item 1', name: 'rb', inputValue: '1' },
 *                 { boxLabel: 'Item 2', name: 'rb', inputValue: '2', checked: true},
 *                 { boxLabel: 'Item 3', name: 'rb', inputValue: '3' },
 *                 { boxLabel: 'Item 4', name: 'rb', inputValue: '4' },
 *                 { boxLabel: 'Item 5', name: 'rb', inputValue: '5' },
 *                 { boxLabel: 'Item 6', name: 'rb', inputValue: '6' }
 *             ]
 *         }]
 *     });
 *
 */
Ext.define('Ext.form.RadioGroup', {
    extend: 'Ext.form.CheckboxGroup',
    alias: 'widget.radiogroup',

    /**
     * @cfg {Ext.form.field.Radio[]/Object[]} items
     * An Array of {@link Ext.form.field.Radio Radio}s or Radio config objects to arrange in the group.
     */
    /**
     * @cfg {Boolean} allowBlank
     * True to allow every item in the group to be blank.
     * If allowBlank = false and no items are selected at validation time, {@link #blankText} will
     * be used as the error text.
     */
    allowBlank : true,
    //<locale>
    /**
     * @cfg {String} blankText
     * Error text to display if the {@link #allowBlank} validation fails
     */
    blankText : 'You must select one item in this group',
    //</locale>

    // private
    defaultType : 'radiofield',

    // private
    groupCls : Ext.baseCSSPrefix + 'form-radio-group',

    getBoxes: function(query) {
        return this.query('[isRadio]' + (query||''));
    },
    
    checkChange: function() {
        var value = this.getValue(),
            key = Ext.Object.getKeys(value)[0];
            
        // If the value is an array we skip out here because it's during a change
        // between multiple items, so we never want to fire a change
        if (Ext.isArray(value[key])) {
            return;
        }
        this.callParent(arguments);    
    },

    /**
     * Sets the value of the radio group. The radio with corresponding name and value will be set.
     * This method is simpler than {@link Ext.form.CheckboxGroup#setValue} because only 1 value is allowed
     * for each name.
     * 
     * @param {Object} value The map from names to values to be set.
     * @return {Ext.form.CheckboxGroup} this
     */
    setValue: function(value) {
        var cbValue, first, formId, radios,
            i, len, name;

        if (Ext.isObject(value)) {
            for (name in value) {
                if (value.hasOwnProperty(name)) {
                    cbValue = value[name];
                    first = this.items.first();
                    formId = first ? first.getFormId() : null;
                    radios = Ext.form.RadioManager.getWithValue(name, cbValue, formId).items;
                    len = radios.length;

                    for (i = 0; i < len; ++i) {
                        radios[i].setValue(true);
                    }
                }
            }
        }
        return this;
    }
});



/**
 * @docauthor Jason Johnston <jason@sencha.com>
 *
 * Provides a date input field with a {@link Ext.picker.Date date picker} dropdown and automatic date
 * validation.
 *
 * This field recognizes and uses the JavaScript Date object as its main {@link #value} type. In addition,
 * it recognizes string values which are parsed according to the {@link #format} and/or {@link #altFormats}
 * configs. These may be reconfigured to use date formats appropriate for the user's locale.
 *
 * The field may be limited to a certain range of dates by using the {@link #minValue}, {@link #maxValue},
 * {@link #disabledDays}, and {@link #disabledDates} config parameters. These configurations will be used both
 * in the field's validation, and in the date picker dropdown by preventing invalid dates from being selected.
 *
 * # Example usage
 *
 *     @example
 *     Ext.create('Ext.form.Panel', {
 *         renderTo: Ext.getBody(),
 *         width: 300,
 *         bodyPadding: 10,
 *         title: 'Dates',
 *         items: [{
 *             xtype: 'datefield',
 *             anchor: '100%',
 *             fieldLabel: 'From',
 *             name: 'from_date',
 *             maxValue: new Date()  // limited to the current date or prior
 *         }, {
 *             xtype: 'datefield',
 *             anchor: '100%',
 *             fieldLabel: 'To',
 *             name: 'to_date',
 *             value: new Date()  // defaults to today
 *         }]
 *     });
 *
 * # Date Formats Examples
 *
 * This example shows a couple of different date format parsing scenarios. Both use custom date format
 * configurations; the first one matches the configured `format` while the second matches the `altFormats`.
 *
 *     @example
 *     Ext.create('Ext.form.Panel', {
 *         renderTo: Ext.getBody(),
 *         width: 300,
 *         bodyPadding: 10,
 *         title: 'Dates',
 *         items: [{
 *             xtype: 'datefield',
 *             anchor: '100%',
 *             fieldLabel: 'Date',
 *             name: 'date',
 *             // The value matches the format; will be parsed and displayed using that format.
 *             format: 'm d Y',
 *             value: '2 4 1978'
 *         }, {
 *             xtype: 'datefield',
 *             anchor: '100%',
 *             fieldLabel: 'Date',
 *             name: 'date',
 *             // The value does not match the format, but does match an altFormat; will be parsed
 *             // using the altFormat and displayed using the format.
 *             format: 'm d Y',
 *             altFormats: 'm,d,Y|m.d.Y',
 *             value: '2.4.1978'
 *         }]
 *     });
 */
Ext.define('Ext.form.field.Date', {
    extend:'Ext.form.field.Picker',
    alias: 'widget.datefield',
    requires: ['Ext.picker.Date'],
    alternateClassName: ['Ext.form.DateField', 'Ext.form.Date'],

    //<locale>
    /**
     * @cfg {String} format
     * The default date format string which can be overriden for localization support. The format must be valid
     * according to {@link Ext.Date#parse}.
     */
    format : "m/d/Y",
    //</locale>
    //<locale>
    /**
     * @cfg {String} altFormats
     * Multiple date formats separated by "|" to try when parsing a user input value and it does not match the defined
     * format.
     */
    altFormats : "m/d/Y|n/j/Y|n/j/y|m/j/y|n/d/y|m/j/Y|n/d/Y|m-d-y|m-d-Y|m/d|m-d|md|mdy|mdY|d|Y-m-d|n-j|n/j",
    //</locale>
    //<locale>
    /**
     * @cfg {String} disabledDaysText
     * The tooltip to display when the date falls on a disabled day.
     */
    disabledDaysText : "Disabled",
    //</locale>
    //<locale>
    /**
     * @cfg {String} disabledDatesText
     * The tooltip text to display when the date falls on a disabled date.
     */
    disabledDatesText : "Disabled",
    //</locale>
    //<locale>
    /**
     * @cfg {String} minText
     * The error text to display when the date in the cell is before {@link #minValue}.
     */
    minText : "The date in this field must be equal to or after {0}",
    //</locale>
    //<locale>
    /**
     * @cfg {String} maxText
     * The error text to display when the date in the cell is after {@link #maxValue}.
     */
    maxText : "The date in this field must be equal to or before {0}",
    //</locale>
    //<locale>
    /**
     * @cfg {String} invalidText
     * The error text to display when the date in the field is invalid.
     */
    invalidText : "{0} is not a valid date - it must be in the format {1}",
    //</locale>
    /**
     * @cfg {String} [triggerCls='x-form-date-trigger']
     * An additional CSS class used to style the trigger button. The trigger will always get the class 'x-form-trigger'
     * and triggerCls will be **appended** if specified (default class displays a calendar icon).
     */
    triggerCls : Ext.baseCSSPrefix + 'form-date-trigger',
    /**
     * @cfg {Boolean} showToday
     * false to hide the footer area of the Date picker containing the Today button and disable the keyboard handler for
     * spacebar that selects the current date.
     */
    showToday : true,
    /**
     * @cfg {Date/String} minValue
     * The minimum allowed date. Can be either a Javascript date object or a string date in a valid format.
     */
    /**
     * @cfg {Date/String} maxValue
     * The maximum allowed date. Can be either a Javascript date object or a string date in a valid format.
     */
    /**
     * @cfg {Number[]} disabledDays
     * An array of days to disable, 0 based. Some examples:
     *
     *     // disable Sunday and Saturday:
     *     disabledDays:  [0, 6]
     *     // disable weekdays:
     *     disabledDays: [1,2,3,4,5]
     */
    /**
     * @cfg {String[]} disabledDates
     * An array of "dates" to disable, as strings. These strings will be used to build a dynamic regular expression so
     * they are very powerful. Some examples:
     *
     *     // disable these exact dates:
     *     disabledDates: ["03/08/2003", "09/16/2003"]
     *     // disable these days for every year:
     *     disabledDates: ["03/08", "09/16"]
     *     // only match the beginning (useful if you are using short years):
     *     disabledDates: ["^03/08"]
     *     // disable every day in March 2006:
     *     disabledDates: ["03/../2006"]
     *     // disable every day in every March:
     *     disabledDates: ["^03"]
     *
     * Note that the format of the dates included in the array should exactly match the {@link #format} config. In order
     * to support regular expressions, if you are using a {@link #format date format} that has "." in it, you will have
     * to escape the dot when restricting dates. For example: `["03\\.08\\.03"]`.
     */

    /**
     * @cfg {String} submitFormat
     * The date format string which will be submitted to the server. The format must be valid according to
     * {@link Ext.Date#parse}.
     *
     * Defaults to {@link #format}.
     */
    
    /**
     * @cfg {Boolean} useStrict
     * True to enforce strict date parsing to prevent the default Javascript "date rollover".
     * Defaults to the useStrict parameter set on Ext.Date
     * See {@link Ext.Date#parse}.
     */
    useStrict: undefined,

    // in the absence of a time value, a default value of 12 noon will be used
    // (note: 12 noon was chosen because it steers well clear of all DST timezone changes)
    initTime: '12', // 24 hour format

    initTimeFormat: 'H',

    matchFieldWidth: false,
    //<locale>
    /**
     * @cfg {Number} [startDay=undefined]
     * Day index at which the week should begin, 0-based.
     *
     * Defaults to `0` (Sunday).
     */
    startDay: 0,
    //</locale>

    initComponent : function(){
        var me = this,
            isString = Ext.isString,
            min, max;

        min = me.minValue;
        max = me.maxValue;
        if(isString(min)){
            me.minValue = me.parseDate(min);
        }
        if(isString(max)){
            me.maxValue = me.parseDate(max);
        }
        me.disabledDatesRE = null;
        me.initDisabledDays();

        me.callParent();
    },

    initValue: function() {
        var me = this,
            value = me.value;

        // If a String value was supplied, try to convert it to a proper Date
        if (Ext.isString(value)) {
            me.value = me.rawToValue(value);
        }

        me.callParent();
    },

    // private
    initDisabledDays : function(){
        if(this.disabledDates){
            var dd   = this.disabledDates,
                len  = dd.length - 1,
                re   = "(?:",
                d,
                dLen = dd.length,
                date;

            for (d = 0; d < dLen; d++) {
                date = dd[d];

                re += Ext.isDate(date) ? '^' + Ext.String.escapeRegex(date.dateFormat(this.format)) + '$' : date;
                if (d !== len) {
                    re += '|';
                }
            }

            this.disabledDatesRE = new RegExp(re + ')');
        }
    },

    /**
     * Replaces any existing disabled dates with new values and refreshes the Date picker.
     * @param {String[]} disabledDates An array of date strings (see the {@link #disabledDates} config for details on
     * supported values) used to disable a pattern of dates.
     */
    setDisabledDates : function(dd){
        var me = this,
            picker = me.picker;

        me.disabledDates = dd;
        me.initDisabledDays();
        if (picker) {
            picker.setDisabledDates(me.disabledDatesRE);
        }
    },

    /**
     * Replaces any existing disabled days (by index, 0-6) with new values and refreshes the Date picker.
     * @param {Number[]} disabledDays An array of disabled day indexes. See the {@link #disabledDays} config for details on
     * supported values.
     */
    setDisabledDays : function(dd){
        var picker = this.picker;

        this.disabledDays = dd;
        if (picker) {
            picker.setDisabledDays(dd);
        }
    },

    /**
     * Replaces any existing {@link #minValue} with the new value and refreshes the Date picker.
     * @param {Date} value The minimum date that can be selected
     */
    setMinValue : function(dt){
        var me = this,
            picker = me.picker,
            minValue = (Ext.isString(dt) ? me.parseDate(dt) : dt);

        me.minValue = minValue;
        if (picker) {
            picker.minText = Ext.String.format(me.minText, me.formatDate(me.minValue));
            picker.setMinDate(minValue);
        }
    },

    /**
     * Replaces any existing {@link #maxValue} with the new value and refreshes the Date picker.
     * @param {Date} value The maximum date that can be selected
     */
    setMaxValue : function(dt){
        var me = this,
            picker = me.picker,
            maxValue = (Ext.isString(dt) ? me.parseDate(dt) : dt);

        me.maxValue = maxValue;
        if (picker) {
            picker.maxText = Ext.String.format(me.maxText, me.formatDate(me.maxValue));
            picker.setMaxDate(maxValue);
        }
    },

    /**
     * Runs all of Date's validations and returns an array of any errors. Note that this first runs Text's validations,
     * so the returned array is an amalgamation of all field errors. The additional validation checks are testing that
     * the date format is valid, that the chosen date is within the min and max date constraints set, that the date
     * chosen is not in the disabledDates regex and that the day chosed is not one of the disabledDays.
     * @param {Object} [value] The value to get errors for (defaults to the current field value)
     * @return {String[]} All validation errors for this field
     */
    getErrors: function(value) {
        var me = this,
            format = Ext.String.format,
            clearTime = Ext.Date.clearTime,
            errors = me.callParent(arguments),
            disabledDays = me.disabledDays,
            disabledDatesRE = me.disabledDatesRE,
            minValue = me.minValue,
            maxValue = me.maxValue,
            len = disabledDays ? disabledDays.length : 0,
            i = 0,
            svalue,
            fvalue,
            day,
            time;

        value = me.formatDate(value || me.processRawValue(me.getRawValue()));

        if (value === null || value.length < 1) { // if it's blank and textfield didn't flag it then it's valid
             return errors;
        }

        svalue = value;
        value = me.parseDate(value);
        if (!value) {
            errors.push(format(me.invalidText, svalue, Ext.Date.unescapeFormat(me.format)));
            return errors;
        }

        time = value.getTime();
        if (minValue && time < clearTime(minValue).getTime()) {
            errors.push(format(me.minText, me.formatDate(minValue)));
        }

        if (maxValue && time > clearTime(maxValue).getTime()) {
            errors.push(format(me.maxText, me.formatDate(maxValue)));
        }

        if (disabledDays) {
            day = value.getDay();

            for(; i < len; i++) {
                if (day === disabledDays[i]) {
                    errors.push(me.disabledDaysText);
                    break;
                }
            }
        }

        fvalue = me.formatDate(value);
        if (disabledDatesRE && disabledDatesRE.test(fvalue)) {
            errors.push(format(me.disabledDatesText, fvalue));
        }

        return errors;
    },

    rawToValue: function(rawValue) {
        return this.parseDate(rawValue) || rawValue || null;
    },

    valueToRaw: function(value) {
        return this.formatDate(this.parseDate(value));
    },

    /**
     * @method setValue
     * Sets the value of the date field. You can pass a date object or any string that can be parsed into a valid date,
     * using {@link #format} as the date format, according to the same rules as {@link Ext.Date#parse} (the default
     * format used is "m/d/Y").
     *
     * Usage:
     *
     *     //All of these calls set the same date value (May 4, 2006)
     *
     *     //Pass a date object:
     *     var dt = new Date('5/4/2006');
     *     dateField.setValue(dt);
     *
     *     //Pass a date string (default format):
     *     dateField.setValue('05/04/2006');
     *
     *     //Pass a date string (custom format):
     *     dateField.format = 'Y-m-d';
     *     dateField.setValue('2006-05-04');
     *
     * @param {String/Date} date The date or valid date string
     * @return {Ext.form.field.Date} this
     */

    /**
     * Attempts to parse a given string value using a given {@link Ext.Date#parse date format}.
     * @param {String} value The value to attempt to parse
     * @param {String} format A valid date format (see {@link Ext.Date#parse})
     * @return {Date} The parsed Date object, or null if the value could not be successfully parsed.
     */
    safeParse : function(value, format) {
        var me = this,
            utilDate = Ext.Date,
            result = null,
            strict = me.useStrict,
            parsedDate;

        if (utilDate.formatContainsHourInfo(format)) {
            // if parse format contains hour information, no DST adjustment is necessary
            result = utilDate.parse(value, format, strict);
        } else {
            // set time to 12 noon, then clear the time
            parsedDate = utilDate.parse(value + ' ' + me.initTime, format + ' ' + me.initTimeFormat, strict);
            if (parsedDate) {
                result = utilDate.clearTime(parsedDate);
            }
        }
        return result;
    },

    // @private
    getSubmitValue: function() {
        var format = this.submitFormat || this.format,
            value = this.getValue();

        return value ? Ext.Date.format(value, format) : '';
    },

    /**
     * @private
     */
    parseDate : function(value) {
        if(!value || Ext.isDate(value)){
            return value;
        }

        var me = this,
            val = me.safeParse(value, me.format),
            altFormats = me.altFormats,
            altFormatsArray = me.altFormatsArray,
            i = 0,
            len;

        if (!val && altFormats) {
            altFormatsArray = altFormatsArray || altFormats.split('|');
            len = altFormatsArray.length;
            for (; i < len && !val; ++i) {
                val = me.safeParse(value, altFormatsArray[i]);
            }
        }
        return val;
    },

    // private
    formatDate : function(date){
        return Ext.isDate(date) ? Ext.Date.dateFormat(date, this.format) : date;
    },

    createPicker: function() {
        var me = this,
            format = Ext.String.format;

        return new Ext.picker.Date({
            pickerField: me,
            ownerCt: me.ownerCt,
            renderTo: document.body,
            floating: true,
            hidden: true,
            focusOnShow: true,
            minDate: me.minValue,
            maxDate: me.maxValue,
            disabledDatesRE: me.disabledDatesRE,
            disabledDatesText: me.disabledDatesText,
            disabledDays: me.disabledDays,
            disabledDaysText: me.disabledDaysText,
            format: me.format,
            showToday: me.showToday,
            startDay: me.startDay,
            minText: format(me.minText, me.formatDate(me.minValue)),
            maxText: format(me.maxText, me.formatDate(me.maxValue)),
            listeners: {
                scope: me,
                select: me.onSelect
            },
            keyNavConfig: {
                esc: function() {
                    me.collapse();
                }
            }
        });
    },

    onSelect: function(m, d) {
        var me = this;

        me.setValue(d);
        me.fireEvent('select', me, d);
        me.collapse();
    },

    /**
     * @private
     * Sets the Date picker's value to match the current field value when expanding.
     */
    onExpand: function() {
        var value = this.getValue();
        this.picker.setValue(Ext.isDate(value) ? value : new Date());
    },

    /**
     * @private
     * Focuses the field when collapsing the Date picker.
     */
    onCollapse: function() {
        this.focus(false, 60);
    },

    // private
    beforeBlur : function(){
        var me = this,
            v = me.parseDate(me.getRawValue()),
            focusTask = me.focusTask;

        if (focusTask) {
            focusTask.cancel();
        }

        if (v) {
            me.setValue(v);
        }
    }

    /**
     * @cfg {Boolean} grow
     * @private
     */
    /**
     * @cfg {Number} growMin
     * @private
     */
    /**
     * @cfg {Number} growMax
     * @private
     */
    /**
     * @method autoSize
     * @private
     */
});



/**
 * Provides a lightweight HTML Editor component. Some toolbar features are not supported by Safari and will be
 * automatically hidden when needed. These are noted in the config options where appropriate.
 *
 * The editor's toolbar buttons have tooltips defined in the {@link #buttonTips} property, but they are not
 * enabled by default unless the global {@link Ext.tip.QuickTipManager} singleton is
 * {@link Ext.tip.QuickTipManager#init initialized}.
 *
 * An Editor is a sensitive component that can't be used in all spots standard fields can be used. Putting an
 * Editor within any element that has display set to 'none' can cause problems in Safari and Firefox due to their
 * default iframe reloading bugs.
 *
 * # Example usage
 *
 * Simple example rendered with default options:
 *
 *     @example
 *     Ext.tip.QuickTipManager.init();  // enable tooltips
 *     Ext.create('Ext.form.HtmlEditor', {
 *         width: 580,
 *         height: 250,
 *         renderTo: Ext.getBody()
 *     });
 *
 * Passed via xtype into a container and with custom options:
 *
 *     @example
 *     Ext.tip.QuickTipManager.init();  // enable tooltips
 *     new Ext.panel.Panel({
 *         title: 'HTML Editor',
 *         renderTo: Ext.getBody(),
 *         width: 550,
 *         height: 250,
 *         frame: true,
 *         layout: 'fit',
 *         items: {
 *             xtype: 'htmleditor',
 *             enableColors: false,
 *             enableAlignments: false
 *         }
 *     });
 *     
 * # Reflow issues
 * 
 * In some browsers, a layout reflow will cause the underlying editor iframe to be reset. This
 * is most commonly seen when using the editor in collapsed panels with animation. In these cases
 * it is best to avoid animation. More information can be found here: https://bugzilla.mozilla.org/show_bug.cgi?id=90268 
 */
Ext.define('Ext.form.field.HtmlEditor', {
    extend:'Ext.Component',
    mixins: {
        labelable: 'Ext.form.Labelable',
        field: 'Ext.form.field.Field'
    },
    alias: 'widget.htmleditor',
    alternateClassName: 'Ext.form.HtmlEditor',
    requires: [
        'Ext.tip.QuickTipManager',
        'Ext.picker.Color',
        'Ext.toolbar.Item',
        'Ext.toolbar.Toolbar',
        'Ext.util.Format',
        'Ext.layout.component.field.HtmlEditor'
    ],

    childEls: [
        'iframeEl', 'textareaEl'
    ],

    fieldSubTpl: [
        '{beforeTextAreaTpl}',
        '<textarea id="{cmpId}-textareaEl" name="{name}" tabIndex="-1" {inputAttrTpl}',
                 ' class="{textareaCls}" style="{size}" autocomplete="off">',
            '{[Ext.util.Format.htmlEncode(values.value)]}',
        '</textarea>',
        '{afterTextAreaTpl}',
        '{beforeIFrameTpl}',
        '<iframe id="{cmpId}-iframeEl" name="{iframeName}" frameBorder="0" {iframeAttrTpl}',
               ' style="overflow:auto;{size}" src="{iframeSrc}"></iframe>',
        '{afterIFrameTpl}',
        {
            disableFormats: true
        }
    ],

    subTplInsertions: [
        /**
         * @cfg {String/Array/Ext.XTemplate} beforeTextAreaTpl
         * An optional string or `XTemplate` configuration to insert in the field markup
         * before the textarea element. If an `XTemplate` is used, the component's
         * {@link Ext.form.field.Base#getSubTplData subTpl data} serves as the context.
         */
        'beforeTextAreaTpl',

        /**
         * @cfg {String/Array/Ext.XTemplate} afterTextAreaTpl
         * An optional string or `XTemplate` configuration to insert in the field markup
         * after the textarea element. If an `XTemplate` is used, the component's
         * {@link Ext.form.field.Base#getSubTplData subTpl data} serves as the context.
         */
        'afterTextAreaTpl',

        /**
         * @cfg {String/Array/Ext.XTemplate} beforeIFrameTpl
         * An optional string or `XTemplate` configuration to insert in the field markup
         * before the iframe element. If an `XTemplate` is used, the component's
         * {@link Ext.form.field.Base#getSubTplData subTpl data} serves as the context.
         */
        'beforeIFrameTpl',

        /**
         * @cfg {String/Array/Ext.XTemplate} afterIFrameTpl
         * An optional string or `XTemplate` configuration to insert in the field markup
         * after the iframe element. If an `XTemplate` is used, the component's
         * {@link Ext.form.field.Base#getSubTplData subTpl data} serves as the context.
         */
        'afterIFrameTpl',

        /**
         * @cfg {String/Array/Ext.XTemplate} iframeAttrTpl
         * An optional string or `XTemplate` configuration to insert in the field markup
         * inside the iframe element (as attributes). If an `XTemplate` is used, the component's
         * {@link Ext.form.field.Base#getSubTplData subTpl data} serves as the context.
         */
        'iframeAttrTpl',

        // inherited
        'inputAttrTpl'
    ],

    /**
     * @cfg {Boolean} enableFormat
     * Enable the bold, italic and underline buttons
     */
    enableFormat : true,
    /**
     * @cfg {Boolean} enableFontSize
     * Enable the increase/decrease font size buttons
     */
    enableFontSize : true,
    /**
     * @cfg {Boolean} enableColors
     * Enable the fore/highlight color buttons
     */
    enableColors : true,
    /**
     * @cfg {Boolean} enableAlignments
     * Enable the left, center, right alignment buttons
     */
    enableAlignments : true,
    /**
     * @cfg {Boolean} enableLists
     * Enable the bullet and numbered list buttons. Not available in Safari.
     */
    enableLists : true,
    /**
     * @cfg {Boolean} enableSourceEdit
     * Enable the switch to source edit button. Not available in Safari.
     */
    enableSourceEdit : true,
    /**
     * @cfg {Boolean} enableLinks
     * Enable the create link button. Not available in Safari.
     */
    enableLinks : true,
    /**
     * @cfg {Boolean} enableFont
     * Enable font selection. Not available in Safari.
     */
    enableFont : true,
    //<locale>
    /**
     * @cfg {String} createLinkText
     * The default text for the create link prompt
     */
    createLinkText : 'Please enter the URL for the link:',
    //</locale>
    /**
     * @cfg {String} [defaultLinkValue='http://']
     * The default value for the create link prompt
     */
    defaultLinkValue : 'http:/'+'/',
    /**
     * @cfg {String[]} fontFamilies
     * An array of available font families
     */
    fontFamilies : [
        'Arial',
        'Courier New',
        'Tahoma',
        'Times New Roman',
        'Verdana'
    ],
    defaultFont: 'tahoma',
    /**
     * @cfg {String} defaultValue
     * A default value to be put into the editor to resolve focus issues.
     *
     * Defaults to (Non-breaking space) in Opera and IE6,
     * (Zero-width space) in all other browsers.
     */
    defaultValue: (Ext.isOpera || Ext.isIE6) ? '&#160;' : '&#8203;',

    editorWrapCls: Ext.baseCSSPrefix + 'html-editor-wrap',

    componentLayout: 'htmleditor',

    // private properties
    initialized : false,
    activated : false,
    sourceEditMode : false,
    iframePad:3,
    hideMode:'offsets',

    afterBodyEl: '</div>',

    maskOnDisable: true,

    // private
    initComponent : function(){
        var me = this;

        me.addEvents(
            /**
             * @event initialize
             * Fires when the editor is fully initialized (including the iframe)
             * @param {Ext.form.field.HtmlEditor} this
             */
            'initialize',
            /**
             * @event activate
             * Fires when the editor is first receives the focus. Any insertion must wait until after this event.
             * @param {Ext.form.field.HtmlEditor} this
             */
            'activate',
             /**
             * @event beforesync
             * Fires before the textarea is updated with content from the editor iframe. Return false to cancel the
             * sync.
             * @param {Ext.form.field.HtmlEditor} this
             * @param {String} html
             */
            'beforesync',
             /**
             * @event beforepush
             * Fires before the iframe editor is updated with content from the textarea. Return false to cancel the
             * push.
             * @param {Ext.form.field.HtmlEditor} this
             * @param {String} html
             */
            'beforepush',
             /**
             * @event sync
             * Fires when the textarea is updated with content from the editor iframe.
             * @param {Ext.form.field.HtmlEditor} this
             * @param {String} html
             */
            'sync',
             /**
             * @event push
             * Fires when the iframe editor is updated with content from the textarea.
             * @param {Ext.form.field.HtmlEditor} this
             * @param {String} html
             */
            'push',
             /**
             * @event editmodechange
             * Fires when the editor switches edit modes
             * @param {Ext.form.field.HtmlEditor} this
             * @param {Boolean} sourceEdit True if source edit, false if standard editing.
             */
            'editmodechange'
        );

        me.callParent(arguments);
        me.createToolbar(me);

        // Init mixins
        me.initLabelable();
        me.initField();
    },

    /**
     * @private
     * Must define this function to allow the Layout base class to collect all descendant layouts to be run.
     */
    getRefItems: function() {
        return [ this.toolbar ];
    },

    /*
     * Called when the editor creates its toolbar. Override this method if you need to
     * add custom toolbar buttons.
     * @param {Ext.form.field.HtmlEditor} editor
     * @protected
     */
    createToolbar : function(editor){
        var me = this,
            items = [], i,
            tipsEnabled = Ext.tip.QuickTipManager && Ext.tip.QuickTipManager.isEnabled(),
            baseCSSPrefix = Ext.baseCSSPrefix,
            fontSelectItem, toolbar, undef;

        function btn(id, toggle, handler){
            return {
                itemId : id,
                cls : baseCSSPrefix + 'btn-icon',
                iconCls: baseCSSPrefix + 'edit-'+id,
                enableToggle:toggle !== false,
                scope: editor,
                handler:handler||editor.relayBtnCmd,
                clickEvent: 'mousedown',
                tooltip: tipsEnabled ? editor.buttonTips[id] || undef : undef,
                overflowText: editor.buttonTips[id].title || undef,
                tabIndex: -1
            };
        }


        if (me.enableFont && !Ext.isSafari2) {
            fontSelectItem = Ext.widget('component', {
                renderTpl: [
                    '<select id="{id}-selectEl" class="{cls}">',
                        '<tpl for="fonts">',
                            '<option value="{[values.toLowerCase()]}" style="font-family:{.}"<tpl if="values.toLowerCase()==parent.defaultFont"> selected</tpl>>{.}</option>',
                        '</tpl>',
                    '</select>'
                ],
                renderData: {
                    cls: baseCSSPrefix + 'font-select',
                    fonts: me.fontFamilies,
                    defaultFont: me.defaultFont
                },
                childEls: ['selectEl'],
                afterRender: function() {
                    me.fontSelect = this.selectEl;
                    Ext.Component.prototype.afterRender.apply(this, arguments);
                },
                onDisable: function() {
                    var selectEl = this.selectEl;
                    if (selectEl) {
                        selectEl.dom.disabled = true;
                    }
                    Ext.Component.prototype.onDisable.apply(this, arguments);
                },
                onEnable: function() {
                    var selectEl = this.selectEl;
                    if (selectEl) {
                        selectEl.dom.disabled = false;
                    }
                    Ext.Component.prototype.onEnable.apply(this, arguments);
                },
                listeners: {
                    change: function() {
                        me.relayCmd('fontname', me.fontSelect.dom.value);
                        me.deferFocus();
                    },
                    element: 'selectEl'
                }
            });

            items.push(
                fontSelectItem,
                '-'
            );
        }

        if (me.enableFormat) {
            items.push(
                btn('bold'),
                btn('italic'),
                btn('underline')
            );
        }

        if (me.enableFontSize) {
            items.push(
                '-',
                btn('increasefontsize', false, me.adjustFont),
                btn('decreasefontsize', false, me.adjustFont)
            );
        }

        if (me.enableColors) {
            items.push(
                '-', {
                    itemId: 'forecolor',
                    cls: baseCSSPrefix + 'btn-icon',
                    iconCls: baseCSSPrefix + 'edit-forecolor',
                    overflowText: editor.buttonTips.forecolor.title,
                    tooltip: tipsEnabled ? editor.buttonTips.forecolor || undef : undef,
                    tabIndex:-1,
                    menu : Ext.widget('menu', {
                        plain: true,
                        items: [{
                            xtype: 'colorpicker',
                            allowReselect: true,
                            focus: Ext.emptyFn,
                            value: '000000',
                            plain: true,
                            clickEvent: 'mousedown',
                            handler: function(cp, color) {
                                me.execCmd('forecolor', Ext.isWebKit || Ext.isIE ? '#'+color : color);
                                me.deferFocus();
                                this.up('menu').hide();
                            }
                        }]
                    })
                }, {
                    itemId: 'backcolor',
                    cls: baseCSSPrefix + 'btn-icon',
                    iconCls: baseCSSPrefix + 'edit-backcolor',
                    overflowText: editor.buttonTips.backcolor.title,
                    tooltip: tipsEnabled ? editor.buttonTips.backcolor || undef : undef,
                    tabIndex:-1,
                    menu : Ext.widget('menu', {
                        plain: true,
                        items: [{
                            xtype: 'colorpicker',
                            focus: Ext.emptyFn,
                            value: 'FFFFFF',
                            plain: true,
                            allowReselect: true,
                            clickEvent: 'mousedown',
                            handler: function(cp, color) {
                                if (Ext.isGecko) {
                                    me.execCmd('useCSS', false);
                                    me.execCmd('hilitecolor', color);
                                    me.execCmd('useCSS', true);
                                    me.deferFocus();
                                } else {
                                    me.execCmd(Ext.isOpera ? 'hilitecolor' : 'backcolor', Ext.isWebKit || Ext.isIE ? '#'+color : color);
                                    me.deferFocus();
                                }
                                this.up('menu').hide();
                            }
                        }]
                    })
                }
            );
        }

        if (me.enableAlignments) {
            items.push(
                '-',
                btn('justifyleft'),
                btn('justifycenter'),
                btn('justifyright')
            );
        }

        if (!Ext.isSafari2) {
            if (me.enableLinks) {
                items.push(
                    '-',
                    btn('createlink', false, me.createLink)
                );
            }

            if (me.enableLists) {
                items.push(
                    '-',
                    btn('insertorderedlist'),
                    btn('insertunorderedlist')
                );
            }
            if (me.enableSourceEdit) {
                items.push(
                    '-',
                    btn('sourceedit', true, function(btn){
                        me.toggleSourceEdit(!me.sourceEditMode);
                    })
                );
            }
        }
        
        // Everything starts disabled.
        for (i = 0; i < items.length; i++) {
            if (items[i].itemId !== 'sourceedit') {
                items[i].disabled = true;
            }
        }

        // build the toolbar
        // Automatically rendered in AbstractComponent.afterRender's renderChildren call
        toolbar = Ext.widget('toolbar', {
            id: me.id + '-toolbar',
            ownerCt: me,
            cls: Ext.baseCSSPrefix + 'html-editor-tb',
            enableOverflow: true,
            items: items,
            ownerLayout: me.getComponentLayout(),

            // stop form submits
            listeners: {
                click: function(e){
                    e.preventDefault();
                },
                element: 'el'
            }
        });

        me.toolbar = toolbar;
    },
    
    getMaskTarget: function(){
        return this.bodyEl;    
    },

    /**
     * Sets the read only state of this field.
     * @param {Boolean} readOnly Whether the field should be read only.
     */
    setReadOnly: function(readOnly) {
        var me = this,
            textareaEl = me.textareaEl,
            iframeEl = me.iframeEl,
            body;

        me.readOnly = readOnly;

        if (textareaEl) {
            textareaEl.dom.readOnly = readOnly;
        }

        if (me.initialized) {
            body = me.getEditorBody();
            if (Ext.isIE) {
                // Hide the iframe while setting contentEditable so it doesn't grab focus
                iframeEl.setDisplayed(false);
                body.contentEditable = !readOnly;
                iframeEl.setDisplayed(true);
            } else {
                me.setDesignMode(!readOnly);
            }
            if (body) {
                body.style.cursor = readOnly ? 'default' : 'text';
            }
            me.disableItems(readOnly);
        }
    },

    /**
     * Called when the editor initializes the iframe with HTML contents. Override this method if you
     * want to change the initialization markup of the iframe (e.g. to add stylesheets).
     *
     * **Note:** IE8-Standards has unwanted scroller behavior, so the default meta tag forces IE7 compatibility.
     * Also note that forcing IE7 mode works when the page is loaded normally, but if you are using IE's Web
     * Developer Tools to manually set the document mode, that will take precedence and override what this
     * code sets by default. This can be confusing when developing, but is not a user-facing issue.
     * @protected
     */
    getDocMarkup: function() {
        var me = this,
            h = me.iframeEl.getHeight() - me.iframePad * 2;
        return Ext.String.format('<html><head><style type="text/css">body{border:0;margin:0;padding:{0}px;height:{1}px;box-sizing: border-box; -moz-box-sizing: border-box; -webkit-box-sizing: border-box;cursor:text}</style></head><body></body></html>', me.iframePad, h);
    },

    // private
    getEditorBody: function() {
        var doc = this.getDoc();
        return doc.body || doc.documentElement;
    },

    // private
    getDoc: function() {
        return (!Ext.isIE && this.iframeEl.dom.contentDocument) || this.getWin().document;
    },

    // private
    getWin: function() {
        return Ext.isIE ? this.iframeEl.dom.contentWindow : window.frames[this.iframeEl.dom.name];
    },

    // Do the job of a container layout at this point even though we are not a Container.
    // TODO: Refactor as a Container.
    finishRenderChildren: function () {
        this.callParent();
        this.toolbar.finishRender();
    },

    // private
    onRender: function() {
        var me = this;

        me.callParent(arguments);

        // The input element is interrogated by the layout to extract height when labelAlign is 'top'
        // It must be set, and then switched between the iframe and the textarea
        me.inputEl = me.iframeEl;

        // Start polling for when the iframe document is ready to be manipulated
        me.monitorTask = Ext.TaskManager.start({
            run: me.checkDesignMode,
            scope: me,
            interval: 100
        });
    },

    initRenderTpl: function() {
        var me = this;
        if (!me.hasOwnProperty('renderTpl')) {
            me.renderTpl = me.getTpl('labelableRenderTpl');
        }
        return me.callParent();
    },

    initRenderData: function() {
        this.beforeSubTpl = '<div class="' + this.editorWrapCls + '">' + Ext.DomHelper.markup(this.toolbar.getRenderTree());
        return Ext.applyIf(this.callParent(), this.getLabelableRenderData());
    },

    getSubTplData: function() {
        return {
            $comp       : this,
            cmpId       : this.id,
            id          : this.getInputId(),
            textareaCls : Ext.baseCSSPrefix + 'hidden',
            value       : this.value,
            iframeName  : Ext.id(),
            iframeSrc   : Ext.SSL_SECURE_URL,
            size        : 'height:100px;width:100%'
        };
    },

    getSubTplMarkup: function() {
        return this.getTpl('fieldSubTpl').apply(this.getSubTplData());
    },

    initFrameDoc: function() {
        var me = this,
            doc, task;

        Ext.TaskManager.stop(me.monitorTask);

        doc = me.getDoc();
        me.win = me.getWin();

        doc.open();
        doc.write(me.getDocMarkup());
        doc.close();

        task = { // must defer to wait for browser to be ready
            run: function() {
                var doc = me.getDoc();
                if (doc.body || doc.readyState === 'complete') {
                    Ext.TaskManager.stop(task);
                    me.setDesignMode(true);
                    Ext.defer(me.initEditor, 10, me);
                }
            },
            interval : 10,
            duration:10000,
            scope: me
        };
        Ext.TaskManager.start(task);
    },

    checkDesignMode: function() {
        var me = this,
            doc = me.getDoc();
        if (doc && (!doc.editorInitialized || me.getDesignMode() !== 'on')) {
            me.initFrameDoc();
        }
    },

    /**
     * @private
     * Sets current design mode. To enable, mode can be true or 'on', off otherwise
     */
    setDesignMode: function(mode) {
        var me = this,
            doc = me.getDoc();
        if (doc) {
            if (me.readOnly) {
                mode = false;
            }
            doc.designMode = (/on|true/i).test(String(mode).toLowerCase()) ?'on':'off';
        }
    },

    // private
    getDesignMode: function() {
        var doc = this.getDoc();
        return !doc ? '' : String(doc.designMode).toLowerCase();
    },

    disableItems: function(disabled) {
        var items = this.getToolbar().items.items,
            i,
            iLen  = items.length,
            item;

        for (i = 0; i < iLen; i++) {
            item = items[i];

            if (item.getItemId() !== 'sourceedit') {
                item.setDisabled(disabled);
            }
        }
    },

    /**
     * Toggles the editor between standard and source edit mode.
     * @param {Boolean} [sourceEditMode] True for source edit, false for standard
     */
    toggleSourceEdit: function(sourceEditMode) {
        var me = this,
            iframe = me.iframeEl,
            textarea = me.textareaEl,
            hiddenCls = Ext.baseCSSPrefix + 'hidden',
            btn = me.getToolbar().getComponent('sourceedit');

        if (!Ext.isBoolean(sourceEditMode)) {
            sourceEditMode = !me.sourceEditMode;
        }
        me.sourceEditMode = sourceEditMode;

        if (btn.pressed !== sourceEditMode) {
            btn.toggle(sourceEditMode);
        }
        if (sourceEditMode) {
            me.disableItems(true);
            me.syncValue();
            iframe.addCls(hiddenCls);
            textarea.removeCls(hiddenCls);
            textarea.dom.removeAttribute('tabIndex');
            textarea.focus();
            me.inputEl = textarea;
        }
        else {
            if (me.initialized) {
                me.disableItems(me.readOnly);
            }
            me.pushValue();
            iframe.removeCls(hiddenCls);
            textarea.addCls(hiddenCls);
            textarea.dom.setAttribute('tabIndex', -1);
            me.deferFocus();
            me.inputEl = iframe;
        }
        me.fireEvent('editmodechange', me, sourceEditMode);
        me.updateLayout();
    },

    // private used internally
    createLink : function() {
        var url = prompt(this.createLinkText, this.defaultLinkValue);
        if (url && url !== 'http:/'+'/') {
            this.relayCmd('createlink', url);
        }
    },

    clearInvalid: Ext.emptyFn,

    // docs inherit from Field
    setValue: function(value) {
        var me = this,
            textarea = me.textareaEl;
        me.mixins.field.setValue.call(me, value);
        if (value === null || value === undefined) {
            value = '';
        }
        if (textarea) {
            textarea.dom.value = value;
        }
        me.pushValue();
        return this;
    },

    /**
     * If you need/want custom HTML cleanup, this is the method you should override.
     * @param {String} html The HTML to be cleaned
     * @return {String} The cleaned HTML
     * @protected
     */
    cleanHtml: function(html) {
        html = String(html);
        if (Ext.isWebKit) { // strip safari nonsense
            html = html.replace(/\sclass="(?:Apple-style-span|khtml-block-placeholder)"/gi, '');
        }

        /*
         * Neat little hack. Strips out all the non-digit characters from the default
         * value and compares it to the character code of the first character in the string
         * because it can cause encoding issues when posted to the server. We need the
         * parseInt here because charCodeAt will return a number.
         */
        if (html.charCodeAt(0) === parseInt(this.defaultValue.replace(/\D/g, ''), 10)) {
            html = html.substring(1);
        }
        return html;
    },

    /**
     * Syncs the contents of the editor iframe with the textarea.
     * @protected
     */
    syncValue : function(){
        var me = this,
            body, changed, html, bodyStyle, match;

        if (me.initialized) {
            body = me.getEditorBody();
            html = body.innerHTML;
            if (Ext.isWebKit) {
                bodyStyle = body.getAttribute('style'); // Safari puts text-align styles on the body element!
                match = bodyStyle.match(/text-align:(.*?);/i);
                if (match && match[1]) {
                    html = '<div style="' + match[0] + '">' + html + '</div>';
                }
            }
            html = me.cleanHtml(html);
            if (me.fireEvent('beforesync', me, html) !== false) {
                if (me.textareaEl.dom.value != html) {
                    me.textareaEl.dom.value = html;
                    changed = true;
                }

                me.fireEvent('sync', me, html);

                if (changed) {
                    // we have to guard this to avoid infinite recursion because getValue
                    // calls this method...
                    me.checkChange();
                }
            }
        }
    },

    //docs inherit from Field
    getValue : function() {
        var me = this,
            value;
        if (!me.sourceEditMode) {
            me.syncValue();
        }
        value = me.rendered ? me.textareaEl.dom.value : me.value;
        me.value = value;
        return value;
    },

    /**
     * Pushes the value of the textarea into the iframe editor.
     * @protected
     */
    pushValue: function() {
        var me = this,
            v;
        if(me.initialized){
            v = me.textareaEl.dom.value || '';
            if (!me.activated && v.length < 1) {
                v = me.defaultValue;
            }
            if (me.fireEvent('beforepush', me, v) !== false) {
                me.getEditorBody().innerHTML = v;
                if (Ext.isGecko) {
                    // Gecko hack, see: https://bugzilla.mozilla.org/show_bug.cgi?id=232791#c8
                    me.setDesignMode(false);  //toggle off first
                    me.setDesignMode(true);
                }
                me.fireEvent('push', me, v);
            }
        }
    },

    // private
    deferFocus : function(){
         this.focus(false, true);
    },

    getFocusEl: function() {
        var me = this,
            win = me.win;
        return win && !me.sourceEditMode ? win : me.textareaEl;
    },

    // private
    initEditor : function(){
        //Destroying the component during/before initEditor can cause issues.
        try {
            var me = this,
                dbody = me.getEditorBody(),
                ss = me.textareaEl.getStyles('font-size', 'font-family', 'background-image', 'background-repeat', 'background-color', 'color'),
                doc,
                fn;

            ss['background-attachment'] = 'fixed'; // w3c
            dbody.bgProperties = 'fixed'; // ie

            Ext.DomHelper.applyStyles(dbody, ss);

            doc = me.getDoc();

            if (doc) {
                try {
                    Ext.EventManager.removeAll(doc);
                } catch(e) {}
            }

            /*
             * We need to use createDelegate here, because when using buffer, the delayed task is added
             * as a property to the function. When the listener is removed, the task is deleted from the function.
             * Since onEditorEvent is shared on the prototype, if we have multiple html editors, the first time one of the editors
             * is destroyed, it causes the fn to be deleted from the prototype, which causes errors. Essentially, we're just anonymizing the function.
             */
            fn = Ext.Function.bind(me.onEditorEvent, me);
            Ext.EventManager.on(doc, {
                mousedown: fn,
                dblclick: fn,
                click: fn,
                keyup: fn,
                buffer:100
            });

            // These events need to be relayed from the inner document (where they stop
            // bubbling) up to the outer document. This has to be done at the DOM level so
            // the event reaches listeners on elements like the document body. The effected
            // mechanisms that depend on this bubbling behavior are listed to the right
            // of the event.
            fn = me.onRelayedEvent;
            Ext.EventManager.on(doc, {
                mousedown: fn, // menu dismisal (MenuManager) and Window onMouseDown (toFront)
                mousemove: fn, // window resize drag detection
                mouseup: fn,   // window resize termination
                click: fn,     // not sure, but just to be safe
                dblclick: fn,  // not sure again
                scope: me
            });

            if (Ext.isGecko) {
                Ext.EventManager.on(doc, 'keypress', me.applyCommand, me);
            }
            if (me.fixKeys) {
                Ext.EventManager.on(doc, 'keydown', me.fixKeys, me);
            }

            // We need to be sure we remove all our events from the iframe on unload or we're going to LEAK!
            Ext.EventManager.on(window, 'unload', me.beforeDestroy, me);
            doc.editorInitialized = true;

            me.initialized = true;
            me.pushValue();
            me.setReadOnly(me.readOnly);
            me.fireEvent('initialize', me);
        } catch(ex) {
            // ignore (why?)
        }
    },

    // private
    beforeDestroy : function(){
        var me = this,
            monitorTask = me.monitorTask,
            doc, prop;

        if (monitorTask) {
            Ext.TaskManager.stop(monitorTask);
        }
        if (me.rendered) {
            try {
                doc = me.getDoc();
                if (doc) {
                    // removeAll() doesn't currently know how to handle iframe document,
                    // so for now we have to wrap it in an Ext.Element using Ext.fly,
                    // or else IE6/7 will leak big time when the page is refreshed.
                    // TODO: this may not be needed once we find a more permanent fix.
                    // see EXTJSIV-5891.
                    Ext.EventManager.removeAll(Ext.fly(doc));
                    for (prop in doc) {
                        if (doc.hasOwnProperty && doc.hasOwnProperty(prop)) {
                            delete doc[prop];
                        }
                    }
                }
            } catch(e) {
                // ignore (why?)
            }
            Ext.destroyMembers(me, 'toolbar', 'iframeEl', 'textareaEl');
        }
        me.callParent();
    },

    // private
    onRelayedEvent: function (event) {
        // relay event from the iframe's document to the document that owns the iframe...

        var iframeEl = this.iframeEl,
            iframeXY = iframeEl.getXY(),
            eventXY = event.getXY();

        // the event from the inner document has XY relative to that document's origin,
        // so adjust it to use the origin of the iframe in the outer document:
        event.xy = [iframeXY[0] + eventXY[0], iframeXY[1] + eventXY[1]];

        event.injectEvent(iframeEl); // blame the iframe for the event...

        event.xy = eventXY; // restore the original XY (just for safety)
    },

    // private
    onFirstFocus : function(){
        var me = this,
            selection, range;
        me.activated = true;
        me.disableItems(me.readOnly);
        if (Ext.isGecko) { // prevent silly gecko errors
            me.win.focus();
            selection = me.win.getSelection();
            if (!selection.focusNode || selection.focusNode.nodeType !== 3) {
                range = selection.getRangeAt(0);
                range.selectNodeContents(me.getEditorBody());
                range.collapse(true);
                me.deferFocus();
            }
            try {
                me.execCmd('useCSS', true);
                me.execCmd('styleWithCSS', false);
            } catch(e) {
                // ignore (why?)
            }
        }
        me.fireEvent('activate', me);
    },

    // private
    adjustFont: function(btn) {
        var adjust = btn.getItemId() === 'increasefontsize' ? 1 : -1,
            size = this.getDoc().queryCommandValue('FontSize') || '2',
            isPxSize = Ext.isString(size) && size.indexOf('px') !== -1,
            isSafari;
        size = parseInt(size, 10);
        if (isPxSize) {
            // Safari 3 values
            // 1 = 10px, 2 = 13px, 3 = 16px, 4 = 18px, 5 = 24px, 6 = 32px
            if (size <= 10) {
                size = 1 + adjust;
            }
            else if (size <= 13) {
                size = 2 + adjust;
            }
            else if (size <= 16) {
                size = 3 + adjust;
            }
            else if (size <= 18) {
                size = 4 + adjust;
            }
            else if (size <= 24) {
                size = 5 + adjust;
            }
            else {
                size = 6 + adjust;
            }
            size = Ext.Number.constrain(size, 1, 6);
        } else {
            isSafari = Ext.isSafari;
            if (isSafari) { // safari
                adjust *= 2;
            }
            size = Math.max(1, size + adjust) + (isSafari ? 'px' : 0);
        }
        this.execCmd('FontSize', size);
    },

    // private
    onEditorEvent: function(e) {
        this.updateToolbar();
    },

    /**
     * Triggers a toolbar update by reading the markup state of the current selection in the editor.
     * @protected
     */
    updateToolbar: function() {
        var me = this,
            btns, doc, name, fontSelect;

        if (me.readOnly) {
            return;
        }

        if (!me.activated) {
            me.onFirstFocus();
            return;
        }

        btns = me.getToolbar().items.map;
        doc = me.getDoc();

        if (me.enableFont && !Ext.isSafari2) {
            name = (doc.queryCommandValue('FontName') || me.defaultFont).toLowerCase();
            fontSelect = me.fontSelect.dom;
            if (name !== fontSelect.value) {
                fontSelect.value = name;
            }
        }

        function updateButtons() {
            for (var i = 0, l = arguments.length, name; i < l; i++) {
                name = arguments[i];
                btns[name].toggle(doc.queryCommandState(name));
            }
        }
        if(me.enableFormat){
            updateButtons('bold', 'italic', 'underline');
        }
        if(me.enableAlignments){
            updateButtons('justifyleft', 'justifycenter', 'justifyright');
        }
        if(!Ext.isSafari2 && me.enableLists){
            updateButtons('insertorderedlist', 'insertunorderedlist');
        }

        Ext.menu.Manager.hideAll();

        me.syncValue();
    },

    // private
    relayBtnCmd: function(btn) {
        this.relayCmd(btn.getItemId());
    },

    /**
     * Executes a Midas editor command on the editor document and performs necessary focus and toolbar updates.
     * **This should only be called after the editor is initialized.**
     * @param {String} cmd The Midas command
     * @param {String/Boolean} [value=null] The value to pass to the command
     */
    relayCmd: function(cmd, value) {
        Ext.defer(function() {
            var me = this;
            me.focus();
            me.execCmd(cmd, value);
            me.updateToolbar();
        }, 10, this);
    },

    /**
     * Executes a Midas editor command directly on the editor document. For visual commands, you should use
     * {@link #relayCmd} instead. **This should only be called after the editor is initialized.**
     * @param {String} cmd The Midas command
     * @param {String/Boolean} [value=null] The value to pass to the command
     */
    execCmd : function(cmd, value){
        var me = this,
            doc = me.getDoc(),
            undef;
        doc.execCommand(cmd, false, value === undef ? null : value);
        me.syncValue();
    },

    // private
    applyCommand : function(e){
        if (e.ctrlKey) {
            var me = this,
                c = e.getCharCode(), cmd;
            if (c > 0) {
                c = String.fromCharCode(c);
                switch (c) {
                    case 'b':
                        cmd = 'bold';
                    break;
                    case 'i':
                        cmd = 'italic';
                    break;
                    case 'u':
                        cmd = 'underline';
                    break;
                }
                if (cmd) {
                    me.win.focus();
                    me.execCmd(cmd);
                    me.deferFocus();
                    e.preventDefault();
                }
            }
        }
    },

    /**
     * Inserts the passed text at the current cursor position.
     * Note: the editor must be initialized and activated to insert text.
     * @param {String} text
     */
    insertAtCursor : function(text){
        var me = this,
            range;

        if (me.activated) {
            me.win.focus();
            if (Ext.isIE) {
                range = me.getDoc().selection.createRange();
                if (range) {
                    range.pasteHTML(text);
                    me.syncValue();
                    me.deferFocus();
                }
            }else{
                me.execCmd('InsertHTML', text);
                me.deferFocus();
            }
        }
    },

    // private
    fixKeys: (function() { // load time branching for fastest keydown performance
        if (Ext.isIE) {
            return function(e){
                var me = this,
                    k = e.getKey(),
                    doc = me.getDoc(),
                    readOnly = me.readOnly,
                    range, target;

                if (k === e.TAB) {
                    e.stopEvent();
                    if (!readOnly) {
                        range = doc.selection.createRange();
                        if(range){
                            range.collapse(true);
                            range.pasteHTML('&#160;&#160;&#160;&#160;');
                            me.deferFocus();
                        }
                    }
                }
                else if (k === e.ENTER) {
                    if (!readOnly) {
                        range = doc.selection.createRange();
                        if (range) {
                            target = range.parentElement();
                            if(!target || target.tagName.toLowerCase() !== 'li'){
                                e.stopEvent();
                                range.pasteHTML('<br />');
                                range.collapse(false);
                                range.select();
                            }
                        }
                    }
                }
            };
        }

        if (Ext.isOpera) {
            return function(e){
                var me = this;
                if (e.getKey() === e.TAB) {
                    e.stopEvent();
                    if (!me.readOnly) {
                        me.win.focus();
                        me.execCmd('InsertHTML','&#160;&#160;&#160;&#160;');
                        me.deferFocus();
                    }
                }
            };
        }

        if (Ext.isWebKit) {
            return function(e){
                var me = this,
                    k = e.getKey(),
                    readOnly = me.readOnly;

                if (k === e.TAB) {
                    e.stopEvent();
                    if (!readOnly) {
                        me.execCmd('InsertText','\t');
                        me.deferFocus();
                    }
                }
                else if (k === e.ENTER) {
                    e.stopEvent();
                    if (!readOnly) {
                        me.execCmd('InsertHtml','<br /><br />');
                        me.deferFocus();
                    }
                }
            };
        }

        return null; // not needed, so null
    }()),

    /**
     * Returns the editor's toolbar. **This is only available after the editor has been rendered.**
     * @return {Ext.toolbar.Toolbar}
     */
    getToolbar : function(){
        return this.toolbar;
    },

    //<locale>
    /**
     * @property {Object} buttonTips
     * Object collection of toolbar tooltips for the buttons in the editor. The key is the command id associated with
     * that button and the value is a valid QuickTips object. For example:
     *
     *     {
     *         bold : {
     *             title: 'Bold (Ctrl+B)',
     *             text: 'Make the selected text bold.',
     *             cls: 'x-html-editor-tip'
     *         },
     *         italic : {
     *             title: 'Italic (Ctrl+I)',
     *             text: 'Make the selected text italic.',
     *             cls: 'x-html-editor-tip'
     *         },
     *         ...
     */
    buttonTips : {
        bold : {
            title: 'Bold (Ctrl+B)',
            text: 'Make the selected text bold.',
            cls: Ext.baseCSSPrefix + 'html-editor-tip'
        },
        italic : {
            title: 'Italic (Ctrl+I)',
            text: 'Make the selected text italic.',
            cls: Ext.baseCSSPrefix + 'html-editor-tip'
        },
        underline : {
            title: 'Underline (Ctrl+U)',
            text: 'Underline the selected text.',
            cls: Ext.baseCSSPrefix + 'html-editor-tip'
        },
        increasefontsize : {
            title: 'Grow Text',
            text: 'Increase the font size.',
            cls: Ext.baseCSSPrefix + 'html-editor-tip'
        },
        decreasefontsize : {
            title: 'Shrink Text',
            text: 'Decrease the font size.',
            cls: Ext.baseCSSPrefix + 'html-editor-tip'
        },
        backcolor : {
            title: 'Text Highlight Color',
            text: 'Change the background color of the selected text.',
            cls: Ext.baseCSSPrefix + 'html-editor-tip'
        },
        forecolor : {
            title: 'Font Color',
            text: 'Change the color of the selected text.',
            cls: Ext.baseCSSPrefix + 'html-editor-tip'
        },
        justifyleft : {
            title: 'Align Text Left',
            text: 'Align text to the left.',
            cls: Ext.baseCSSPrefix + 'html-editor-tip'
        },
        justifycenter : {
            title: 'Center Text',
            text: 'Center text in the editor.',
            cls: Ext.baseCSSPrefix + 'html-editor-tip'
        },
        justifyright : {
            title: 'Align Text Right',
            text: 'Align text to the right.',
            cls: Ext.baseCSSPrefix + 'html-editor-tip'
        },
        insertunorderedlist : {
            title: 'Bullet List',
            text: 'Start a bulleted list.',
            cls: Ext.baseCSSPrefix + 'html-editor-tip'
        },
        insertorderedlist : {
            title: 'Numbered List',
            text: 'Start a numbered list.',
            cls: Ext.baseCSSPrefix + 'html-editor-tip'
        },
        createlink : {
            title: 'Hyperlink',
            text: 'Make the selected text a hyperlink.',
            cls: Ext.baseCSSPrefix + 'html-editor-tip'
        },
        sourceedit : {
            title: 'Source Edit',
            text: 'Switch to source editing mode.',
            cls: Ext.baseCSSPrefix + 'html-editor-tip'
        }
    }
    //</locale>

    // hide stuff that is not compatible
    /**
     * @event blur
     * @private
     */
    /**
     * @event focus
     * @private
     */
    /**
     * @event specialkey
     * @private
     */
    /**
     * @cfg {String} fieldCls
     * @private
     */
    /**
     * @cfg {String} focusCls
     * @private
     */
    /**
     * @cfg {String} autoCreate
     * @private
     */
    /**
     * @cfg {String} inputType
     * @private
     */
    /**
     * @cfg {String} invalidCls
     * @private
     */
    /**
     * @cfg {String} invalidText
     * @private
     */
    /**
     * @cfg {String} msgFx
     * @private
     */
    /**
     * @cfg {Boolean} allowDomMove
     * @private
     */
    /**
     * @cfg {String} applyTo
     * @private
     */
    /**
     * @cfg {String} readOnly
     * @private
     */
    /**
     * @cfg {String} tabIndex
     * @private
     */
    /**
     * @method validate
     * @private
     */
});



/**
 * @docauthor Jason Johnston <jason@sencha.com>
 *
 * A combobox control with support for autocomplete, remote loading, and many other features.
 *
 * A ComboBox is like a combination of a traditional HTML text `<input>` field and a `<select>`
 * field; the user is able to type freely into the field, and/or pick values from a dropdown selection
 * list. The user can input any value by default, even if it does not appear in the selection list;
 * to prevent free-form values and restrict them to items in the list, set {@link #forceSelection} to `true`.
 *
 * The selection list's options are populated from any {@link Ext.data.Store}, including remote
 * stores. The data items in the store are mapped to each option's displayed text and backing value via
 * the {@link #valueField} and {@link #displayField} configurations, respectively.
 *
 * If your store is not remote, i.e. it depends only on local data and is loaded up front, you should be
 * sure to set the {@link #queryMode} to `'local'`, as this will improve responsiveness for the user.
 *
 * # Example usage:
 *
 *     @example
 *     // The data store containing the list of states
 *     var states = Ext.create('Ext.data.Store', {
 *         fields: ['abbr', 'name'],
 *         data : [
 *             {"abbr":"AL", "name":"Alabama"},
 *             {"abbr":"AK", "name":"Alaska"},
 *             {"abbr":"AZ", "name":"Arizona"}
 *             //...
 *         ]
 *     });
 *
 *     // Create the combo box, attached to the states data store
 *     Ext.create('Ext.form.ComboBox', {
 *         fieldLabel: 'Choose State',
 *         store: states,
 *         queryMode: 'local',
 *         displayField: 'name',
 *         valueField: 'abbr',
 *         renderTo: Ext.getBody()
 *     });
 *
 * # Events
 *
 * To do something when something in ComboBox is selected, configure the select event:
 *
 *     var cb = Ext.create('Ext.form.ComboBox', {
 *         // all of your config options
 *         listeners:{
 *              scope: yourScope,
 *              'select': yourFunction
 *         }
 *     });
 *
 *     // Alternatively, you can assign events after the object is created:
 *     var cb = new Ext.form.field.ComboBox(yourOptions);
 *     cb.on('select', yourFunction, yourScope);
 *
 * # Multiple Selection
 *
 * ComboBox also allows selection of multiple items from the list; to enable multi-selection set the
 * {@link #multiSelect} config to `true`.
 * 
 * # Filtered Stores
 * 
 * If you have a local store that is already filtered, you can use the {@link #lastQuery} config option
 * to prevent the store from having the filter being cleared on first expand.
 *
 * ## Customized combobox
 *
 * Both the text shown in dropdown menu and text field can be easily customized:
 *
 *     @example
 *     var states = Ext.create('Ext.data.Store', {
 *         fields: ['abbr', 'name'],
 *         data : [
 *             {"abbr":"AL", "name":"Alabama"},
 *             {"abbr":"AK", "name":"Alaska"},
 *             {"abbr":"AZ", "name":"Arizona"}
 *         ]
 *     });
 *
 *     Ext.create('Ext.form.ComboBox', {
 *         fieldLabel: 'Choose State',
 *         store: states,
 *         queryMode: 'local',
 *         valueField: 'abbr',
 *         renderTo: Ext.getBody(),
 *         // Template for the dropdown menu.
 *         // Note the use of "x-boundlist-item" class,
 *         // this is required to make the items selectable.
 *         tpl: Ext.create('Ext.XTemplate',
 *             '<tpl for=".">',
 *                 '<div class="x-boundlist-item">{abbr} - {name}</div>',
 *             '</tpl>'
 *         ),
 *         // template for the content inside text field
 *         displayTpl: Ext.create('Ext.XTemplate',
 *             '<tpl for=".">',
 *                 '{abbr} - {name}',
 *             '</tpl>'
 *         )
 *     });
 *
 * See also the {@link #listConfig} option for additional configuration of the dropdown.
 *
 */
Ext.define('Ext.form.field.ComboBox', {
    extend:'Ext.form.field.Picker',
    requires: ['Ext.util.DelayedTask', 'Ext.EventObject', 'Ext.view.BoundList', 'Ext.view.BoundListKeyNav', 'Ext.data.StoreManager', 'Ext.layout.component.field.ComboBox'],
    alternateClassName: 'Ext.form.ComboBox',
    alias: ['widget.combobox', 'widget.combo'],
    mixins: {
        bindable: 'Ext.util.Bindable'    
    },

    componentLayout: 'combobox',

    /**
     * @cfg {String} [triggerCls='x-form-arrow-trigger']
     * An additional CSS class used to style the trigger button. The trigger will always get the {@link #triggerBaseCls}
     * by default and `triggerCls` will be **appended** if specified.
     */
    triggerCls: Ext.baseCSSPrefix + 'form-arrow-trigger',
    
    /**
     * @cfg {String} [hiddenName=""]
     * The name of an underlying hidden field which will be synchronized with the underlying value of the combo.
     * This option is useful if the combo is part of a form element doing a regular form post. The hidden field
     * will not be created unless a hiddenName is specified.
     */
    hiddenName: '',
    
    /**
     * @property {Ext.Element} hiddenDataEl
     * @private
     */

    /**
     * @private
     * @cfg {String}
     * CSS class used to find the {@link #hiddenDataEl}
     */
    hiddenDataCls: Ext.baseCSSPrefix + 'hide-display ' + Ext.baseCSSPrefix + 'form-data-hidden',

    /**
     * @cfg
     * @inheritdoc
     */
    fieldSubTpl: [
        '<div class="{hiddenDataCls}" role="presentation"></div>',
        '<input id="{id}" type="{type}" {inputAttrTpl} class="{fieldCls} {typeCls}" autocomplete="off"',
            '<tpl if="value"> value="{[Ext.util.Format.htmlEncode(values.value)]}"</tpl>',
            '<tpl if="name"> name="{name}"</tpl>',
            '<tpl if="placeholder"> placeholder="{placeholder}"</tpl>',
            '<tpl if="size"> size="{size}"</tpl>',
            '<tpl if="maxLength !== undefined"> maxlength="{maxLength}"</tpl>',
            '<tpl if="readOnly"> readonly="readonly"</tpl>',
            '<tpl if="disabled"> disabled="disabled"</tpl>',
            '<tpl if="tabIdx"> tabIndex="{tabIdx}"</tpl>',
            '<tpl if="fieldStyle"> style="{fieldStyle}"</tpl>',
            '/>',
        {
            compiled: true,
            disableFormats: true
        }
    ],

    getSubTplData: function(){
        var me = this;
        Ext.applyIf(me.subTplData, {
            hiddenDataCls: me.hiddenDataCls
        });
        return me.callParent(arguments);
    },

    afterRender: function(){
        var me = this;
        me.callParent(arguments);
        me.setHiddenValue(me.value);
    },

    /**
     * @cfg {Ext.data.Store/Array} store
     * The data source to which this combo is bound. Acceptable values for this property are:
     *
     *   - **any {@link Ext.data.Store Store} subclass**
     *   - **an Array** : Arrays will be converted to a {@link Ext.data.Store} internally, automatically generating
     *     {@link Ext.data.Field#name field names} to work with all data components.
     *
     *     - **1-dimensional array** : (e.g., `['Foo','Bar']`)
     *
     *       A 1-dimensional array will automatically be expanded (each array item will be used for both the combo
     *       {@link #valueField} and {@link #displayField})
     *
     *     - **2-dimensional array** : (e.g., `[['f','Foo'],['b','Bar']]`)
     *
     *       For a multi-dimensional array, the value in index 0 of each item will be assumed to be the combo
     *       {@link #valueField}, while the value at index 1 is assumed to be the combo {@link #displayField}.
     *
     * See also {@link #queryMode}.
     */

    /**
     * @cfg {Boolean} multiSelect
     * If set to `true`, allows the combo field to hold more than one value at a time, and allows selecting multiple
     * items from the dropdown list. The combo's text field will show all selected values separated by the
     * {@link #delimiter}.
     */
    multiSelect: false,

    //<locale>
    /**
     * @cfg {String} delimiter
     * The character(s) used to separate the {@link #displayField display values} of multiple selected items when
     * `{@link #multiSelect} = true`.
     */
    delimiter: ', ',
    //</locale>

    /**
     * @cfg {String} displayField
     * The underlying {@link Ext.data.Field#name data field name} to bind to this ComboBox.
     *
     * See also `{@link #valueField}`.
     */
    displayField: 'text',

    /**
     * @cfg {String} valueField (required)
     * The underlying {@link Ext.data.Field#name data value name} to bind to this ComboBox.
     *
     * **Note**: use of a `valueField` requires the user to make a selection in order for a value to be mapped. See also
     * `{@link #displayField}`.
     *
     * Defaults to match the value of the {@link #displayField} config.
     */

    /**
     * @cfg {String} triggerAction
     * The action to execute when the trigger is clicked.
     *
     *   - **`'all'`** :
     *
     *     {@link #doQuery run the query} specified by the `{@link #allQuery}` config option
     *
     *   - **`'query'`** :
     *
     *     {@link #doQuery run the query} using the {@link Ext.form.field.Base#getRawValue raw value}.
     *
     * See also `{@link #queryParam}`.
     */
    triggerAction: 'all',

    /**
     * @cfg {String} allQuery
     * The text query to send to the server to return all records for the list with no filtering
     */
    allQuery: '',

    /**
     * @cfg {String} queryParam
     * Name of the parameter used by the Store to pass the typed string when the ComboBox is configured with
     * `{@link #queryMode}: 'remote'`. If explicitly set to a falsy value it will not be sent.
     */
    queryParam: 'query',

    /**
     * @cfg {String} queryMode
     * The mode in which the ComboBox uses the configured Store. Acceptable values are:
     *
     *   - **`'remote'`** :
     *
     *     In `queryMode: 'remote'`, the ComboBox loads its Store dynamically based upon user interaction.
     *
     *     This is typically used for "autocomplete" type inputs, and after the user finishes typing, the Store is {@link
     *     Ext.data.Store#method-load load}ed.
     *
     *     A parameter containing the typed string is sent in the load request. The default parameter name for the input
     *     string is `query`, but this can be configured using the {@link #queryParam} config.
     *
     *     In `queryMode: 'remote'`, the Store may be configured with `{@link Ext.data.Store#remoteFilter remoteFilter}:
     *     true`, and further filters may be _programatically_ added to the Store which are then passed with every load
     *     request which allows the server to further refine the returned dataset.
     *
     *     Typically, in an autocomplete situation, {@link #hideTrigger} is configured `true` because it has no meaning for
     *     autocomplete.
     *
     *   - **`'local'`** :
     *
     *     ComboBox loads local data
     *
     *         var combo = new Ext.form.field.ComboBox({
     *             renderTo: document.body,
     *             queryMode: 'local',
     *             store: new Ext.data.ArrayStore({
     *                 id: 0,
     *                 fields: [
     *                     'myId',  // numeric value is the key
     *                     'displayText'
     *                 ],
     *                 data: [[1, 'item1'], [2, 'item2']]  // data is local
     *             }),
     *             valueField: 'myId',
     *             displayField: 'displayText',
     *             triggerAction: 'all'
     *         });
     */
    queryMode: 'remote',

    /**
     * @cfg {Boolean} [queryCaching=true]
     * When true, this prevents the combo from re-querying (either locally or remotely) when the current query
     * is the same as the previous query.
     */
    queryCaching: true,

    /**
     * @cfg {Number} pageSize
     * If greater than `0`, a {@link Ext.toolbar.Paging} is displayed in the footer of the dropdown list and the
     * {@link #doQuery filter queries} will execute with page start and {@link Ext.view.BoundList#pageSize limit}
     * parameters. Only applies when `{@link #queryMode} = 'remote'`.
     */
    pageSize: 0,

    /**
     * @cfg {Number} queryDelay
     * The length of time in milliseconds to delay between the start of typing and sending the query to filter the
     * dropdown list.
     *
     * Defaults to `500` if `{@link #queryMode} = 'remote'` or `10` if `{@link #queryMode} = 'local'`
     */

    /**
     * @cfg {Number} minChars
     * The minimum number of characters the user must type before autocomplete and {@link #typeAhead} activate.
     *
     * Defaults to `4` if `{@link #queryMode} = 'remote'` or `0` if `{@link #queryMode} = 'local'`,
     * does not apply if `{@link Ext.form.field.Trigger#editable editable} = false`.
     */

    /**
     * @cfg {Boolean} autoSelect
     * `true` to automatically highlight the first result gathered by the data store in the dropdown list when it is
     * opened. A false value would cause nothing in the list to be highlighted automatically, so
     * the user would have to manually highlight an item before pressing the enter or {@link #selectOnTab tab} key to
     * select it (unless the value of ({@link #typeAhead}) were true), or use the mouse to select a value.
     */
    autoSelect: true,

    /**
     * @cfg {Boolean} typeAhead
     * `true` to populate and autoselect the remainder of the text being typed after a configurable delay
     * ({@link #typeAheadDelay}) if it matches a known value.
     */
    typeAhead: false,

    /**
     * @cfg {Number} typeAheadDelay
     * The length of time in milliseconds to wait until the typeahead text is displayed if `{@link #typeAhead} = true`
     */
    typeAheadDelay: 250,

    /**
     * @cfg {Boolean} selectOnTab
     * Whether the Tab key should select the currently highlighted item.
     */
    selectOnTab: true,

    /**
     * @cfg {Boolean} forceSelection
     * `true` to restrict the selected value to one of the values in the list, `false` to allow the user to set
     * arbitrary text into the field.
     */
    forceSelection: false,

    /**
     * @cfg {Boolean} growToLongestValue
     * `false` to not allow the component to resize itself when its data changes
     * (and its {@link #grow} property is `true`)
     */
    growToLongestValue: true,

    /**
     * @cfg {String} valueNotFoundText
     * When using a name/value combo, if the value passed to setValue is not found in the store, valueNotFoundText will
     * be displayed as the field text if defined. If this default text is used, it means there
     * is no value set and no validation will occur on this field.
     */

    /**
     * @property {String} lastQuery
     * The value of the match string used to filter the store. Delete this property to force a requery. Example use:
     *
     *     var combo = new Ext.form.field.ComboBox({
     *         ...
     *         queryMode: 'remote',
     *         listeners: {
     *             // delete the previous query in the beforequery event or set
     *             // combo.lastQuery = null (this will reload the store the next time it expands)
     *             beforequery: function(qe){
     *                 delete qe.combo.lastQuery;
     *             }
     *         }
     *     });
     *
     * To make sure the filter in the store is not cleared the first time the ComboBox trigger is used configure the
     * combo with `lastQuery=''`. Example use:
     *
     *     var combo = new Ext.form.field.ComboBox({
     *         ...
     *         queryMode: 'local',
     *         triggerAction: 'all',
     *         lastQuery: ''
     *     });
     */

    /**
     * @cfg {Object} defaultListConfig
     * Set of options that will be used as defaults for the user-configured {@link #listConfig} object.
     */
    defaultListConfig: {
        loadingHeight: 70,
        minWidth: 70,
        maxHeight: 300,
        shadow: 'sides'
    },

    /**
     * @cfg {String/HTMLElement/Ext.Element} transform
     * The id, DOM node or {@link Ext.Element} of an existing HTML `<select>` element to convert into a ComboBox. The
     * target select's options will be used to build the options in the ComboBox dropdown; a configured {@link #store}
     * will take precedence over this.
     */

    /**
     * @cfg {Object} listConfig
     * An optional set of configuration properties that will be passed to the {@link Ext.view.BoundList}'s constructor.
     * Any configuration that is valid for BoundList can be included. Some of the more useful ones are:
     *
     *   - {@link Ext.view.BoundList#cls cls} - defaults to empty
     *   - {@link Ext.view.BoundList#emptyText emptyText} - defaults to empty string
     *   - {@link Ext.view.BoundList#itemSelector itemSelector} - defaults to the value defined in BoundList
     *   - {@link Ext.view.BoundList#loadingText loadingText} - defaults to `'Loading...'`
     *   - {@link Ext.view.BoundList#minWidth minWidth} - defaults to `70`
     *   - {@link Ext.view.BoundList#maxWidth maxWidth} - defaults to `undefined`
     *   - {@link Ext.view.BoundList#maxHeight maxHeight} - defaults to `300`
     *   - {@link Ext.view.BoundList#resizable resizable} - defaults to `false`
     *   - {@link Ext.view.BoundList#shadow shadow} - defaults to `'sides'`
     *   - {@link Ext.view.BoundList#width width} - defaults to `undefined` (automatically set to the width of the ComboBox
     *     field if {@link #matchFieldWidth} is true)
     */

    //private
    ignoreSelection: 0,

    //private, tells the layout to recalculate its startingWidth when a record is removed from its bound store
    removingRecords: null,

    //private helper
    resizeComboToGrow: function () {
        var me = this;
        return me.grow && me.growToLongestValue;
    },

    initComponent: function() {
        var me = this,
            isDefined = Ext.isDefined,
            store = me.store,
            transform = me.transform,
            transformSelect, isLocalMode;

        Ext.applyIf(me.renderSelectors, {
            hiddenDataEl: '.' + me.hiddenDataCls.split(' ').join('.')
        });
        
        if (me.typeAhead && me.multiSelect) {
            Ext.Error.raise('typeAhead and multiSelect are mutually exclusive options -- please remove one of them.');
        }
        if (me.typeAhead && !me.editable) {
            Ext.Error.raise('If typeAhead is enabled the combo must be editable: true -- please change one of those settings.');
        }
        if (me.selectOnFocus && !me.editable) {
            Ext.Error.raise('If selectOnFocus is enabled the combo must be editable: true -- please change one of those settings.');
        }

        this.addEvents(
            /**
             * @event beforequery
             * Fires before all queries are processed. Return false to cancel the query or set the queryEvent's cancel
             * property to true.
             *
             * @param {Object} queryEvent An object that has these properties:
             *
             *   - `combo` : Ext.form.field.ComboBox
             *
             *     This combo box
             *
             *   - `query` : String
             *
             *     The query string
             *
             *   - `forceAll` : Boolean
             *
             *     True to force "all" query
             *
             *   - `cancel` : Boolean
             *
             *     Set to true to cancel the query
             */
            'beforequery',

            /**
             * @event select
             * Fires when at least one list item is selected.
             * @param {Ext.form.field.ComboBox} combo This combo box
             * @param {Array} records The selected records
             */
            'select',

            /**
             * @event beforeselect
             * Fires before the selected item is added to the collection
             * @param {Ext.form.field.ComboBox} combo This combo box
             * @param {Ext.data.Record} record The selected record
             * @param {Number} index The index of the selected record
             */
            'beforeselect',

            /**
             * @event beforedeselect
             * Fires before the deselected item is removed from the collection
             * @param {Ext.form.field.ComboBox} combo This combo box
             * @param {Ext.data.Record} record The deselected record
             * @param {Number} index The index of the deselected record
             */
            'beforedeselect'
        );

        // Build store from 'transform' HTML select element's options
        if (transform) {
            transformSelect = Ext.getDom(transform);
            if (transformSelect) {
                if (!me.store) {
                    store = Ext.Array.map(Ext.Array.from(transformSelect.options), function(option){
                        return [option.value, option.text];
                    });
                }
                if (!me.name) {
                    me.name = transformSelect.name;
                }
                if (!('value' in me)) {
                    me.value = transformSelect.value;
                }
            }
        }

        me.bindStore(store || 'ext-empty-store', true);
        store = me.store;
        if (store.autoCreated) {
            me.queryMode = 'local';
            me.valueField = me.displayField = 'field1';
            if (!store.expanded) {
                me.displayField = 'field2';
            }
        }


        if (!isDefined(me.valueField)) {
            me.valueField = me.displayField;
        }

        isLocalMode = me.queryMode === 'local';
        if (!isDefined(me.queryDelay)) {
            me.queryDelay = isLocalMode ? 10 : 500;
        }
        if (!isDefined(me.minChars)) {
            me.minChars = isLocalMode ? 0 : 4;
        }

        if (!me.displayTpl) {
            me.displayTpl = new Ext.XTemplate(
                '<tpl for=".">' +
                    '{[typeof values === "string" ? values : values["' + me.displayField + '"]]}' +
                    '<tpl if="xindex < xcount">' + me.delimiter + '</tpl>' +
                '</tpl>'
            );
        } else if (Ext.isString(me.displayTpl)) {
            me.displayTpl = new Ext.XTemplate(me.displayTpl);
        }

        me.callParent();

        me.doQueryTask = new Ext.util.DelayedTask(me.doRawQuery, me);

        // store has already been loaded, setValue
        if (me.store.getCount() > 0) {
            me.setValue(me.value);
        }

        // render in place of 'transform' select
        if (transformSelect) {
            me.render(transformSelect.parentNode, transformSelect);
            Ext.removeNode(transformSelect);
            delete me.renderTo;
        }
    },

    /**
     * Returns the store associated with this ComboBox.
     * @return {Ext.data.Store} The store
     */
    getStore : function(){
        return this.store;
    },

    beforeBlur: function() {
        this.doQueryTask.cancel();
        this.assertValue();
    },

    // private
    assertValue: function() {
        var me = this,
            value = me.getRawValue(),
            rec;

        if (me.forceSelection) {
            if (me.multiSelect) {
                // For multiselect, check that the current displayed value matches the current
                // selection, if it does not then revert to the most recent selection.
                if (value !== me.getDisplayValue()) {
                    me.setValue(me.lastSelection);
                }
            } else {
                // For single-select, match the displayed value to a record and select it,
                // if it does not match a record then revert to the most recent selection.
                rec = me.findRecordByDisplay(value);
                if (rec) {
                    me.select(rec);
                } else {
                    me.setValue(me.lastSelection);
                }
            }
        }
        me.collapse();
    },

    onTypeAhead: function() {
        var me = this,
            displayField = me.displayField,
            record = me.store.findRecord(displayField, me.getRawValue()),
            boundList = me.getPicker(),
            newValue, len, selStart;

        if (record) {
            newValue = record.get(displayField);
            len = newValue.length;
            selStart = me.getRawValue().length;

            boundList.highlightItem(boundList.getNode(record));

            if (selStart !== 0 && selStart !== len) {
                me.setRawValue(newValue);
                me.selectText(selStart, newValue.length);
            }
        }
    },

    // invoked when a different store is bound to this combo
    // than the original
    resetToDefault: Ext.emptyFn,
    
    beforeReset: function() {
        this.callParent();
        this.clearFilter();    
    },
    
    onUnbindStore: function(store) {
        var picker = this.picker;
        if (!store && picker) {
            picker.bindStore(null);
        }
        this.clearFilter();
    },
    
    onBindStore: function(store, initial) {
        var picker = this.picker;
        if (!initial) {
            this.resetToDefault();
        }
        if (picker) {
            picker.bindStore(store);
        }
    },
    
    getStoreListeners: function() {
        var me = this;
        
        return {
            beforeload: me.onBeforeLoad,
            clear: me.onClear,
            datachanged: me.onDataChanged,
            load: me.onLoad,
            exception: me.onException,
            remove: me.onRemove
        }; 
    },
    
    onBeforeLoad: function(){
        // If we're remote loading, the load mask will show which will trigger a deslectAll.
        // This selection change will trigger the collapse in onListSelectionChange. As such
        // we'll veto it for now and restore selection listeners when we've loaded.
        ++this.ignoreSelection;    
    },
    
    onDataChanged: function() {
        var me = this;

        if (me.resizeComboToGrow()) {
            me.updateLayout();
        }
    },

    onClear: function() {
        var me = this;

        if (me.resizeComboToGrow()) {
            me.removingRecords = true;
            me.onDataChanged();
        }
    },

    onRemove: function() {
        var me = this;

        if (me.resizeComboToGrow()) {
            me.removingRecords = true;
        }
    },

    onException: function(){
        if (this.ignoreSelection > 0) {
            --this.ignoreSelection;
        }
        this.collapse();    
    },

    onLoad: function() {
        var me = this,
            value = me.value;

        if (me.ignoreSelection > 0) {
            --me.ignoreSelection;
        }
        // If performing a remote query upon the raw value...
        if (me.rawQuery) {
            me.rawQuery = false;
            me.syncSelection();
            if (me.picker && !me.picker.getSelectionModel().hasSelection()) {
                me.doAutoSelect();
            }
        }
        // If store initial load or triggerAction: 'all' trigger click.
        else {
            // Set the value on load
            if (me.value || me.value === 0) {
                me.setValue(me.value);
            } else {
                // There's no value.
                // Highlight the first item in the list if autoSelect: true
                if (me.store.getCount()) {
                    me.doAutoSelect();
                } else {
                    // assign whatever empty value we have to prevent change from firing
                    me.setValue(me.value);
                }
            }
        }
    },

    /**
     * @private
     * Execute the query with the raw contents within the textfield.
     */
    doRawQuery: function() {
        this.doQuery(this.getRawValue(), false, true);
    },

    /**
     * Executes a query to filter the dropdown list. Fires the {@link #beforequery} event prior to performing the query
     * allowing the query action to be canceled if needed.
     *
     * @param {String} queryString The SQL query to execute
     * @param {Boolean} [forceAll=false] `true` to force the query to execute even if there are currently fewer characters in
     * the field than the minimum specified by the `{@link #minChars}` config option. It also clears any filter
     * previously saved in the current store.
     * @param {Boolean} [rawQuery=false] Pass as true if the raw typed value is being used as the query string. This causes the
     * resulting store load to leave the raw value undisturbed.
     * @return {Boolean} true if the query was permitted to run, false if it was cancelled by a {@link #beforequery}
     * handler.
     */
    doQuery: function(queryString, forceAll, rawQuery) {
        queryString = queryString || '';

        // store in object and pass by reference in 'beforequery'
        // so that client code can modify values.
        var me = this,
            qe = {
                query: queryString,
                forceAll: forceAll,
                combo: me,
                cancel: false
            },
            store = me.store,
            isLocalMode = me.queryMode === 'local',
            needsRefresh;

        if (me.fireEvent('beforequery', qe) === false || qe.cancel) {
            return false;
        }

        // get back out possibly modified values
        queryString = qe.query;
        forceAll = qe.forceAll;

        // query permitted to run
        if (forceAll || (queryString.length >= me.minChars)) {
            // expand before starting query so LoadMask can position itself correctly
            me.expand();

            // make sure they aren't querying the same thing
            if (!me.queryCaching || me.lastQuery !== queryString) {
                me.lastQuery = queryString;

                if (isLocalMode) {
                    // forceAll means no filtering - show whole dataset.
                    store.suspendEvents();
                    needsRefresh = me.clearFilter();
                    if (queryString || !forceAll) {
                        me.activeFilter = new Ext.util.Filter({
                            root: 'data',
                            property: me.displayField,
                            value: queryString
                        });
                        store.filter(me.activeFilter);
                        needsRefresh = true;
                    } else {
                        delete me.activeFilter;
                    }
                    store.resumeEvents();
                    if (me.rendered && needsRefresh) {
                        me.getPicker().refresh();
                    }
                } else {
                    // Set flag for onLoad handling to know how the Store was loaded
                    me.rawQuery = rawQuery;

                    // In queryMode: 'remote', we assume Store filters are added by the developer as remote filters,
                    // and these are automatically passed as params with every load call, so we do *not* call clearFilter.
                    if (me.pageSize) {
                        // if we're paging, we've changed the query so start at page 1.
                        me.loadPage(1);
                    } else {
                        store.load({
                            params: me.getParams(queryString)
                        });
                    }
                }
            }

            // Clear current selection if it does not match the current value in the field
            if (me.getRawValue() !== me.getDisplayValue()) {
                me.ignoreSelection++;
                me.picker.getSelectionModel().deselectAll();
                me.ignoreSelection--;
            }

            if (isLocalMode) {
                me.doAutoSelect();
            }
            if (me.typeAhead) {
                me.doTypeAhead();
            }
        }
        return true;
    },
    
    /**
     * Clears any previous filters applied by the combo to the store
     * @private
     * @return {Boolean} True if a filter was removed
     */
    clearFilter: function() {
        var store = this.store,
            filter = this.activeFilter,
            filters = store.filters,
            remaining;
            
        if (filter) {
            if (filters.getCount() > 1) {
                // More than 1 existing filter
                filters.remove(filter);
                remaining = filters.getRange();
            }
            store.clearFilter(true);
            if (remaining) {
                store.filter(remaining);
            }
        }
        return !!filter;
    },

    loadPage: function(pageNum){
        this.store.loadPage(pageNum, {
            params: this.getParams(this.lastQuery)
        });
    },

    onPageChange: function(toolbar, newPage){
        /*
         * Return false here so we can call load ourselves and inject the query param.
         * We don't want to do this for every store load since the developer may load
         * the store through some other means so we won't add the query param.
         */
        this.loadPage(newPage);
        return false;
    },

    // private
    getParams: function(queryString) {
        var params = {},
            param = this.queryParam;

        if (param) {
            params[param] = queryString;
        }
        return params;
    },

    /**
     * @private
     * If the autoSelect config is true, and the picker is open, highlights the first item.
     */
    doAutoSelect: function() {
        var me = this,
            picker = me.picker,
            lastSelected, itemNode;
        if (picker && me.autoSelect && me.store.getCount() > 0) {
            // Highlight the last selected item and scroll it into view
            lastSelected = picker.getSelectionModel().lastSelected;
            itemNode = picker.getNode(lastSelected || 0);
            if (itemNode) {
                picker.highlightItem(itemNode);
                picker.listEl.scrollChildIntoView(itemNode, false);
            }
        }
    },

    doTypeAhead: function() {
        if (!this.typeAheadTask) {
            this.typeAheadTask = new Ext.util.DelayedTask(this.onTypeAhead, this);
        }
        if (this.lastKey != Ext.EventObject.BACKSPACE && this.lastKey != Ext.EventObject.DELETE) {
            this.typeAheadTask.delay(this.typeAheadDelay);
        }
    },

    onTriggerClick: function() {
        var me = this;
        if (!me.readOnly && !me.disabled) {
            if (me.isExpanded) {
                me.collapse();
            } else {
                me.onFocus({});
                if (me.triggerAction === 'all') {
                    me.doQuery(me.allQuery, true);
                } else {
                    me.doQuery(me.getRawValue(), false, true);
                }
            }
            me.inputEl.focus();
        }
    },


    // store the last key and doQuery if relevant
    onKeyUp: function(e, t) {
        var me = this,
            key = e.getKey();

        if (!me.readOnly && !me.disabled && me.editable) {
            me.lastKey = key;
            // we put this in a task so that we can cancel it if a user is
            // in and out before the queryDelay elapses

            // perform query w/ any normal key or backspace or delete
            if (!e.isSpecialKey() || key == e.BACKSPACE || key == e.DELETE) {
                me.doQueryTask.delay(me.queryDelay);
            }
        }

        if (me.enableKeyEvents) {
            me.callParent(arguments);
        }
    },

    initEvents: function() {
        var me = this;
        me.callParent();

        /*
         * Setup keyboard handling. If enableKeyEvents is true, we already have
         * a listener on the inputEl for keyup, so don't create a second.
         */
        if (!me.enableKeyEvents) {
            me.mon(me.inputEl, 'keyup', me.onKeyUp, me);
        }
    },

    onDestroy: function() {
        this.bindStore(null);
        this.callParent();
    },

    // The picker (the dropdown) must have its zIndex managed by the same ZIndexManager which is
    // providing the zIndex of our Container.
    onAdded: function() {
        var me = this;
        me.callParent(arguments);
        if (me.picker) {
            me.picker.ownerCt = me.up('[floating]');
            me.picker.registerWithOwnerCt();
        }
    },

    createPicker: function() {
        var me = this,
            picker,
            pickerCfg = Ext.apply({
                xtype: 'boundlist',
                pickerField: me,
                selModel: {
                    mode: me.multiSelect ? 'SIMPLE' : 'SINGLE'
                },
                floating: true,
                hidden: true,
                store: me.store,
                displayField: me.displayField,
                focusOnToFront: false,
                pageSize: me.pageSize,
                tpl: me.tpl
            }, me.listConfig, me.defaultListConfig);

        picker = me.picker = Ext.widget(pickerCfg);
        if (me.pageSize) {
            picker.pagingToolbar.on('beforechange', me.onPageChange, me);
        }

        me.mon(picker, {
            itemclick: me.onItemClick,
            refresh: me.onListRefresh,
            scope: me
        });

        me.mon(picker.getSelectionModel(), {
            beforeselect: me.onBeforeSelect,
            beforedeselect: me.onBeforeDeselect,
            selectionchange: me.onListSelectionChange,
            scope: me
        });

        return picker;
    },

    alignPicker: function(){
        var me = this,
            picker = me.getPicker(),
            heightAbove = me.getPosition()[1] - Ext.getBody().getScroll().top,
            heightBelow = Ext.Element.getViewHeight() - heightAbove - me.getHeight(),
            space = Math.max(heightAbove, heightBelow);

        // Allow the picker to height itself naturally.
        if (picker.height) {
            delete picker.height;
            picker.updateLayout();
        }
        // Then ensure that vertically, the dropdown will fit into the space either above or below the inputEl.
        if (picker.getHeight() > space - 5) {
            picker.setHeight(space - 5); // have some leeway so we aren't flush against
        }
        me.callParent();
    },

    onListRefresh: function() {
        this.alignPicker();
        this.syncSelection();
    },

    onItemClick: function(picker, record){
        /*
         * If we're doing single selection, the selection change events won't fire when
         * clicking on the selected element. Detect it here.
         */
        var me = this,
            selection = me.picker.getSelectionModel().getSelection(),
            valueField = me.valueField;

        if (!me.multiSelect && selection.length) {
            if (record.get(valueField) === selection[0].get(valueField)) {
                // Make sure we also update the display value if it's only partial
                me.displayTplData = [record.data];
                me.setRawValue(me.getDisplayValue());
                me.collapse();
            }
        }
    },

    onBeforeSelect: function(list, record) {
        return this.fireEvent('beforeselect', this, record, record.index);
    },

    onBeforeDeselect: function(list, record) {
        return this.fireEvent('beforedeselect', this, record, record.index);
    },

    onListSelectionChange: function(list, selectedRecords) {
        var me = this,
            isMulti = me.multiSelect,
            hasRecords = selectedRecords.length > 0;
        // Only react to selection if it is not called from setValue, and if our list is
        // expanded (ignores changes to the selection model triggered elsewhere)
        if (!me.ignoreSelection && me.isExpanded) {
            if (!isMulti) {
                Ext.defer(me.collapse, 1, me);
            }
            /*
             * Only set the value here if we're in multi selection mode or we have
             * a selection. Otherwise setValue will be called with an empty value
             * which will cause the change event to fire twice.
             */
            if (isMulti || hasRecords) {
                me.setValue(selectedRecords, false);
            }
            if (hasRecords) {
                me.fireEvent('select', me, selectedRecords);
            }
            me.inputEl.focus();
        }
    },

    /**
     * @private
     * Enables the key nav for the BoundList when it is expanded.
     */
    onExpand: function() {
        var me = this,
            keyNav = me.listKeyNav,
            selectOnTab = me.selectOnTab,
            picker = me.getPicker();

        // Handle BoundList navigation from the input field. Insert a tab listener specially to enable selectOnTab.
        if (keyNav) {
            keyNav.enable();
        } else {
            keyNav = me.listKeyNav = new Ext.view.BoundListKeyNav(this.inputEl, {
                boundList: picker,
                forceKeyDown: true,
                tab: function(e) {
                    if (selectOnTab) {
                        this.selectHighlighted(e);
                        me.triggerBlur();
                    }
                    // Tab key event is allowed to propagate to field
                    return true;
                }
            });
        }

        // While list is expanded, stop tab monitoring from Ext.form.field.Trigger so it doesn't short-circuit selectOnTab
        if (selectOnTab) {
            me.ignoreMonitorTab = true;
        }

        Ext.defer(keyNav.enable, 1, keyNav); //wait a bit so it doesn't react to the down arrow opening the picker
        me.inputEl.focus();
    },

    /**
     * @private
     * Disables the key nav for the BoundList when it is collapsed.
     */
    onCollapse: function() {
        var me = this,
            keyNav = me.listKeyNav;
        if (keyNav) {
            keyNav.disable();
            me.ignoreMonitorTab = false;
        }
    },

    /**
     * Selects an item by a {@link Ext.data.Model Model}, or by a key value.
     * @param {Object} r
     */
    select: function(r) {
        this.setValue(r, true);
    },

    /**
     * Finds the record by searching for a specific field/value combination.
     * @param {String} field The name of the field to test.
     * @param {Object} value The value to match the field against.
     * @return {Ext.data.Model} The matched record or false.
     */
    findRecord: function(field, value) {
        var ds = this.store,
            idx = ds.findExact(field, value);
        return idx !== -1 ? ds.getAt(idx) : false;
    },

    /**
     * Finds the record by searching values in the {@link #valueField}.
     * @param {Object} value The value to match the field against.
     * @return {Ext.data.Model} The matched record or false.
     */
    findRecordByValue: function(value) {
        return this.findRecord(this.valueField, value);
    },

    /**
     * Finds the record by searching values in the {@link #displayField}.
     * @param {Object} value The value to match the field against.
     * @return {Ext.data.Model} The matched record or false.
     */
    findRecordByDisplay: function(value) {
        return this.findRecord(this.displayField, value);
    },

    /**
     * Sets the specified value(s) into the field. For each value, if a record is found in the {@link #store} that
     * matches based on the {@link #valueField}, then that record's {@link #displayField} will be displayed in the
     * field. If no match is found, and the {@link #valueNotFoundText} config option is defined, then that will be
     * displayed as the default field text. Otherwise a blank value will be shown, although the value will still be set.
     * @param {String/String[]} value The value(s) to be set. Can be either a single String or {@link Ext.data.Model},
     * or an Array of Strings or Models.
     * @return {Ext.form.field.Field} this
     */
    setValue: function(value, doSelect) {
        var me = this,
            valueNotFoundText = me.valueNotFoundText,
            inputEl = me.inputEl,
            i, len, record,
            dataObj,
            matchedRecords = [],
            displayTplData = [],
            processedValue = [];

        if (me.store.loading) {
            // Called while the Store is loading. Ensure it is processed by the onLoad method.
            me.value = value;
            me.setHiddenValue(me.value);
            return me;
        }

        // This method processes multi-values, so ensure value is an array.
        value = Ext.Array.from(value);

        // Loop through values, matching each from the Store, and collecting matched records
        for (i = 0, len = value.length; i < len; i++) {
            record = value[i];
            if (!record || !record.isModel) {
                record = me.findRecordByValue(record);
            }
            // record found, select it.
            if (record) {
                matchedRecords.push(record);
                displayTplData.push(record.data);
                processedValue.push(record.get(me.valueField));
            }
            // record was not found, this could happen because
            // store is not loaded or they set a value not in the store
            else {
                // If we are allowing insertion of values not represented in the Store, then push the value and
                // create a fake record data object to push as a display value for use by the displayTpl
                if (!me.forceSelection) {
                    processedValue.push(value[i]);
                    dataObj = {};
                    dataObj[me.displayField] = value[i];
                    displayTplData.push(dataObj);
                    // TODO: Add config to create new records on selection of a value that has no match in the Store
                }
                // Else, if valueNotFoundText is defined, display it, otherwise display nothing for this value
                else if (Ext.isDefined(valueNotFoundText)) {
                    displayTplData.push(valueNotFoundText);
                }
            }
        }

        // Set the value of this field. If we are multiselecting, then that is an array.
        me.setHiddenValue(processedValue);
        me.value = me.multiSelect ? processedValue : processedValue[0];
        if (!Ext.isDefined(me.value)) {
            me.value = null;
        }
        me.displayTplData = displayTplData; //store for getDisplayValue method
        me.lastSelection = me.valueModels = matchedRecords;

        if (inputEl && me.emptyText && !Ext.isEmpty(value)) {
            inputEl.removeCls(me.emptyCls);
        }

        // Calculate raw value from the collection of Model data
        me.setRawValue(me.getDisplayValue());
        me.checkChange();

        if (doSelect !== false) {
            me.syncSelection();
        }
        me.applyEmptyText();

        return me;
    },

    /**
     * @private
     * Set the value of {@link #hiddenDataEl}
     * Dynamically adds and removes input[type=hidden] elements
     */
    setHiddenValue: function(values){
        var me = this,
            name = me.hiddenName, 
            i,
            dom, childNodes, input, valueCount, childrenCount;
            
        if (!me.hiddenDataEl || !name) {
            return;
        }
        values = Ext.Array.from(values);
        dom = me.hiddenDataEl.dom;
        childNodes = dom.childNodes;
        input = childNodes[0];
        valueCount = values.length;
        childrenCount = childNodes.length;
        
        if (!input && valueCount > 0) {
            me.hiddenDataEl.update(Ext.DomHelper.markup({
                tag: 'input', 
                type: 'hidden', 
                name: name
            }));
            childrenCount = 1;
            input = dom.firstChild;
        }
        while (childrenCount > valueCount) {
            dom.removeChild(childNodes[0]);
            -- childrenCount;
        }
        while (childrenCount < valueCount) {
            dom.appendChild(input.cloneNode(true));
            ++ childrenCount;
        }
        for (i = 0; i < valueCount; i++) {
            childNodes[i].value = values[i];
        }
    },

    /**
     * @private Generates the string value to be displayed in the text field for the currently stored value
     */
    getDisplayValue: function() {
        return this.displayTpl.apply(this.displayTplData);
    },

    getValue: function() {
        // If the user has not changed the raw field value since a value was selected from the list,
        // then return the structured value from the selection. If the raw field value is different
        // than what would be displayed due to selection, return that raw value.
        var me = this,
            picker = me.picker,
            rawValue = me.getRawValue(), //current value of text field
            value = me.value; //stored value from last selection or setValue() call

        if (me.getDisplayValue() !== rawValue) {
            value = rawValue;
            me.value = me.displayTplData = me.valueModels = null;
            if (picker) {
                me.ignoreSelection++;
                picker.getSelectionModel().deselectAll();
                me.ignoreSelection--;
            }
        }

        return value;
    },

    getSubmitValue: function() {
        return this.getValue();
    },

    isEqual: function(v1, v2) {
        var fromArray = Ext.Array.from,
            i, len;

        v1 = fromArray(v1);
        v2 = fromArray(v2);
        len = v1.length;

        if (len !== v2.length) {
            return false;
        }

        for(i = 0; i < len; i++) {
            if (v2[i] !== v1[i]) {
                return false;
            }
        }

        return true;
    },

    /**
     * Clears any value currently set in the ComboBox.
     */
    clearValue: function() {
        this.setValue([]);
    },

    /**
     * @private Synchronizes the selection in the picker to match the current value of the combobox.
     */
    syncSelection: function() {
        var me = this,
            picker = me.picker,
            selection, selModel,
            values = me.valueModels || [],
            vLen  = values.length, v, value;

        if (picker) {
            // From the value, find the Models that are in the store's current data
            selection = [];
            for (v = 0; v < vLen; v++) {
                value = values[v];

                if (value && value.isModel && me.store.indexOf(value) >= 0) {
                    selection.push(value);
                }
            }

            // Update the selection to match
            me.ignoreSelection++;
            selModel = picker.getSelectionModel();
            selModel.deselectAll();
            if (selection.length) {
                selModel.select(selection);
            }
            me.ignoreSelection--;
        }
    },
    
    onEditorTab: function(e){
        var keyNav = this.listKeyNav;
        
        if (this.selectOnTab && keyNav) {
            keyNav.selectHighlighted(e);
        }
    }
});

/**
 * Provides a time input field with a time dropdown and automatic time validation.
 *
 * This field recognizes and uses JavaScript Date objects as its main {@link #value} type (only the time portion of the
 * date is used; the month/day/year are ignored). In addition, it recognizes string values which are parsed according to
 * the {@link #format} and/or {@link #altFormats} configs. These may be reconfigured to use time formats appropriate for
 * the user's locale.
 *
 * The field may be limited to a certain range of times by using the {@link #minValue} and {@link #maxValue} configs,
 * and the interval between time options in the dropdown can be changed with the {@link #increment} config.
 *
 * Example usage:
 *
 *     @example
 *     Ext.create('Ext.form.Panel', {
 *         title: 'Time Card',
 *         width: 300,
 *         bodyPadding: 10,
 *         renderTo: Ext.getBody(),
 *         items: [{
 *             xtype: 'timefield',
 *             name: 'in',
 *             fieldLabel: 'Time In',
 *             minValue: '6:00 AM',
 *             maxValue: '8:00 PM',
 *             increment: 30,
 *             anchor: '100%'
 *         }, {
 *             xtype: 'timefield',
 *             name: 'out',
 *             fieldLabel: 'Time Out',
 *             minValue: '6:00 AM',
 *             maxValue: '8:00 PM',
 *             increment: 30,
 *             anchor: '100%'
 *        }]
 *     });
 */
Ext.define('Ext.form.field.Time', {
    extend:'Ext.form.field.ComboBox',
    alias: 'widget.timefield',
    requires: ['Ext.form.field.Date', 'Ext.picker.Time', 'Ext.view.BoundListKeyNav', 'Ext.Date'],
    alternateClassName: ['Ext.form.TimeField', 'Ext.form.Time'],

    /**
     * @cfg {String} [triggerCls='x-form-time-trigger']
     * An additional CSS class used to style the trigger button. The trigger will always get the {@link #triggerBaseCls}
     * by default and triggerCls will be **appended** if specified.
     */
    triggerCls: Ext.baseCSSPrefix + 'form-time-trigger',

    /**
     * @cfg {Date/String} minValue
     * The minimum allowed time. Can be either a Javascript date object with a valid time value or a string time in a
     * valid format -- see {@link #format} and {@link #altFormats}.
     */

    /**
     * @cfg {Date/String} maxValue
     * The maximum allowed time. Can be either a Javascript date object with a valid time value or a string time in a
     * valid format -- see {@link #format} and {@link #altFormats}.
     */

    //<locale>
    /**
     * @cfg {String} minText
     * The error text to display when the entered time is before {@link #minValue}.
     */
    minText : "The time in this field must be equal to or after {0}",
    //</locale>

    //<locale>
    /**
     * @cfg {String} maxText
     * The error text to display when the entered time is after {@link #maxValue}.
     */
    maxText : "The time in this field must be equal to or before {0}",
    //</locale>

    //<locale>
    /**
     * @cfg {String} invalidText
     * The error text to display when the time in the field is invalid.
     */
    invalidText : "{0} is not a valid time",
    //</locale>

    //<locale>
    /**
     * @cfg {String} [format=undefined]
     * The default time format string which can be overriden for localization support. The format must be valid
     * according to {@link Ext.Date#parse}.
     *
     * Defaults to `'g:i A'`, e.g., `'3:15 PM'`. For 24-hour time format try `'H:i'` instead.
     */
    format : "g:i A",
    //</locale>

    //<locale>
    /**
     * @cfg {String} [submitFormat=undefined]
     * The date format string which will be submitted to the server. The format must be valid according to
     * {@link Ext.Date#parse}.
     *
     * Defaults to {@link #format}.
     */
    //</locale>

    //<locale>
    /**
     * @cfg {String} altFormats
     * Multiple date formats separated by "|" to try when parsing a user input value and it doesn't match the defined
     * format.
     */
    altFormats : "g:ia|g:iA|g:i a|g:i A|h:i|g:i|H:i|ga|ha|gA|h a|g a|g A|gi|hi|gia|hia|g|H|gi a|hi a|giA|hiA|gi A|hi A",
    //</locale>

    /**
     * @cfg {Number} increment
     * The number of minutes between each time value in the list.
     */
    increment: 15,

    /**
     * @cfg {Number} pickerMaxHeight
     * The maximum height of the {@link Ext.picker.Time} dropdown.
     */
    pickerMaxHeight: 300,

    /**
     * @cfg {Boolean} selectOnTab
     * Whether the Tab key should select the currently highlighted item.
     */
    selectOnTab: true,
    
    /**
     * @cfg {Boolean} [snapToIncrement=false]
     * Specify as `true` to enforce that only values on the {@link #increment} boundary are accepted.
     */
    snapToIncrement: false,

    /**
     * @private
     * This is the date to use when generating time values in the absence of either minValue
     * or maxValue.  Using the current date causes DST issues on DST boundary dates, so this is an
     * arbitrary "safe" date that can be any date aside from DST boundary dates.
     */
    initDate: '1/1/2008',
    initDateFormat: 'j/n/Y',
    
    ignoreSelection: 0,

    queryMode: 'local',

    displayField: 'disp',

    valueField: 'date',

    initComponent: function() {
        var me = this,
            min = me.minValue,
            max = me.maxValue;
        if (min) {
            me.setMinValue(min);
        }
        if (max) {
            me.setMaxValue(max);
        }
        me.displayTpl = new Ext.XTemplate(
            '<tpl for=".">' +
                '{[typeof values === "string" ? values : this.formatDate(values["' + me.displayField + '"])]}' +
                '<tpl if="xindex < xcount">' + me.delimiter + '</tpl>' +
            '</tpl>', {
            formatDate: Ext.Function.bind(me.formatDate, me)
        });
        this.callParent();
    },

    /**
     * @private
     */
    transformOriginalValue: function(value) {
        if (Ext.isString(value)) {
            return this.rawToValue(value);
        }
        return value;
    },

    /**
     * @private
     */
    isEqual: function(v1, v2) {
        return Ext.Date.isEqual(v1, v2);
    },

    /**
     * Replaces any existing {@link #minValue} with the new time and refreshes the picker's range.
     * @param {Date/String} value The minimum time that can be selected
     */
    setMinValue: function(value) {
        var me = this,
            picker = me.picker;
        me.setLimit(value, true);
        if (picker) {
            picker.setMinValue(me.minValue);
        }
    },

    /**
     * Replaces any existing {@link #maxValue} with the new time and refreshes the picker's range.
     * @param {Date/String} value The maximum time that can be selected
     */
    setMaxValue: function(value) {
        var me = this,
            picker = me.picker;
        me.setLimit(value, false);
        if (picker) {
            picker.setMaxValue(me.maxValue);
        }
    },

    /**
     * @private
     * Updates either the min or max value. Converts the user's value into a Date object whose
     * year/month/day is set to the {@link #initDate} so that only the time fields are significant.
     */
    setLimit: function(value, isMin) {
        var me = this,
            d, val;
        if (Ext.isString(value)) {
            d = me.parseDate(value);
        }
        else if (Ext.isDate(value)) {
            d = value;
        }
        if (d) {
            val = Ext.Date.clearTime(new Date(me.initDate));
            val.setHours(d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
        }
        // Invalid min/maxValue config should result in a null so that defaulting takes over
        else {
            val = null;
        }
        me[isMin ? 'minValue' : 'maxValue'] = val;
    },

    rawToValue: function(rawValue) {
        return this.parseDate(rawValue) || rawValue || null;
    },

    valueToRaw: function(value) {
        return this.formatDate(this.parseDate(value));
    },

    /**
     * Runs all of Time's validations and returns an array of any errors. Note that this first runs Text's validations,
     * so the returned array is an amalgamation of all field errors. The additional validation checks are testing that
     * the time format is valid, that the chosen time is within the {@link #minValue} and {@link #maxValue} constraints
     * set.
     * @param {Object} [value] The value to get errors for (defaults to the current field value)
     * @return {String[]} All validation errors for this field
     */
    getErrors: function(value) {
        var me = this,
            format = Ext.String.format,
            errors = me.callParent(arguments),
            minValue = me.minValue,
            maxValue = me.maxValue,
            date;

        value = me.formatDate(value || me.processRawValue(me.getRawValue()));

        if (value === null || value.length < 1) { // if it's blank and textfield didn't flag it then it's valid
             return errors;
        }

        date = me.parseDate(value);
        if (!date) {
            errors.push(format(me.invalidText, value, Ext.Date.unescapeFormat(me.format)));
            return errors;
        }

        if (minValue && date < minValue) {
            errors.push(format(me.minText, me.formatDate(minValue)));
        }

        if (maxValue && date > maxValue) {
            errors.push(format(me.maxText, me.formatDate(maxValue)));
        }

        return errors;
    },

    formatDate: function() {
        return Ext.form.field.Date.prototype.formatDate.apply(this, arguments);
    },

    /**
     * @private
     * Parses an input value into a valid Date object.
     * @param {String/Date} value
     */
    parseDate: function(value) {
        var me = this,
            val = value,
            altFormats = me.altFormats,
            altFormatsArray = me.altFormatsArray,
            i = 0,
            len;

        if (value && !Ext.isDate(value)) {
            val = me.safeParse(value, me.format);

            if (!val && altFormats) {
                altFormatsArray = altFormatsArray || altFormats.split('|');
                len = altFormatsArray.length;
                for (; i < len && !val; ++i) {
                    val = me.safeParse(value, altFormatsArray[i]);
                }
            }
        }

        // If configured to snap, snap resulting parsed Date to the closest increment.
        if (val && me.snapToIncrement) {
            val = new Date(Ext.Number.snap(val.getTime(), me.increment * 60 * 1000));
        }
        return val;
    },

    safeParse: function(value, format){
        var me = this,
            utilDate = Ext.Date,
            parsedDate,
            result = null;

        if (utilDate.formatContainsDateInfo(format)) {
            // assume we've been given a full date
            result = utilDate.parse(value, format);
        } else {
            // Use our initial safe date
            parsedDate = utilDate.parse(me.initDate + ' ' + value, me.initDateFormat + ' ' + format);
            if (parsedDate) {
                result = parsedDate;
            }
        }
        return result;
    },

    // @private
    getSubmitValue: function() {
        var me = this,
            format = me.submitFormat || me.format,
            value = me.getValue();

        return value ? Ext.Date.format(value, format) : null;
    },

    /**
     * @private
     * Creates the {@link Ext.picker.Time}
     */
    createPicker: function() {
        var me = this,
            picker;

        me.listConfig = Ext.apply({
            xtype: 'timepicker',
            selModel: {
                mode: 'SINGLE'
            },
            cls: undefined,
            minValue: me.minValue,
            maxValue: me.maxValue,
            increment: me.increment,
            format: me.format,
            maxHeight: me.pickerMaxHeight
        }, me.listConfig);
        picker = me.callParent();
        me.store = picker.store;
        return picker;
    },
    
    onItemClick: function(picker, record){
        // The selection change events won't fire when clicking on the selected element. Detect it here.
        var me = this,
            selected = picker.getSelectionModel().getSelection();

        if (selected.length > 0) {
            selected = selected[0];
            if (selected && Ext.Date.isEqual(record.get('date'), selected.get('date'))) {
                me.collapse();
            }
        }
    },

    /**
     * @private
     * Handles a time being selected from the Time picker.
     */
    onListSelectionChange: function(list, recordArray) {
        var me = this,
            record = recordArray[0],
            val = record ? record.get('date') : null;
            
        if (!me.ignoreSelection) {
            me.skipSync = true;
            me.setValue(val);
            me.skipSync = false;
            me.fireEvent('select', me, val);
            me.picker.clearHighlight();
            me.collapse();
            me.inputEl.focus();
        }
    },
    
    /**
     * @private 
     * Synchronizes the selection in the picker to match the current value
     */
    syncSelection: function() {
        var me = this,
            picker = me.picker,
            toSelect,
            selModel,
            value,
            data, d, dLen, rec;
            
        if (picker && !me.skipSync) {
            picker.clearHighlight();
            value = me.getValue();
            selModel = picker.getSelectionModel();
            // Update the selection to match
            me.ignoreSelection++;
            if (value === null) {
                selModel.deselectAll();
            } else if(Ext.isDate(value)) {
                // find value, select it
                data = picker.store.data.items;
                dLen = data.length;

                for (d = 0; d < dLen; d++) {
                    rec = data[d];

                    if (Ext.Date.isEqual(rec.get('date'), value)) {
                       toSelect = rec;
                       break;
                   }
                }

                selModel.select(toSelect);
            }
            me.ignoreSelection--;
        }
    },

    postBlur: function() {
        var me = this;

        me.callParent(arguments);
        me.setRawValue(me.formatDate(me.getValue()));
    },

    setValue: function() {

        // Store MUST be created for parent setValue to function
        this.getPicker();

        this.callParent(arguments);
    },

    getValue: function() {
        return this.parseDate(this.callParent(arguments));
    }
});



/**
 * Provides input field management, validation, submission, and form loading services for the collection
 * of {@link Ext.form.field.Field Field} instances within a {@link Ext.container.Container}. It is recommended
 * that you use a {@link Ext.form.Panel} as the form container, as that has logic to automatically
 * hook up an instance of {@link Ext.form.Basic} (plus other conveniences related to field configuration.)
 *
 * ## Form Actions
 *
 * The Basic class delegates the handling of form loads and submits to instances of {@link Ext.form.action.Action}.
 * See the various Action implementations for specific details of each one's functionality, as well as the
 * documentation for {@link #doAction} which details the configuration options that can be specified in
 * each action call.
 *
 * The default submit Action is {@link Ext.form.action.Submit}, which uses an Ajax request to submit the
 * form's values to a configured URL. To enable normal browser submission of an Ext form, use the
 * {@link #standardSubmit} config option.
 *
 * ## File uploads
 *
 * File uploads are not performed using normal 'Ajax' techniques; see the description for
 * {@link #hasUpload} for details. If you're using file uploads you should read the method description.
 *
 * ## Example usage:
 *
 *     @example
 *     Ext.create('Ext.form.Panel', {
 *         title: 'Basic Form',
 *         renderTo: Ext.getBody(),
 *         bodyPadding: 5,
 *         width: 350,
 *
 *         // Any configuration items here will be automatically passed along to
 *         // the Ext.form.Basic instance when it gets created.
 *
 *         // The form will submit an AJAX request to this URL when submitted
 *         url: 'save-form.php',
 *
 *         items: [{
 *             xtype: 'textfield',
 *             fieldLabel: 'Field',
 *             name: 'theField'
 *         }],
 *
 *         buttons: [{
 *             text: 'Submit',
 *             handler: function() {
 *                 // The getForm() method returns the Ext.form.Basic instance:
 *                 var form = this.up('form').getForm();
 *                 if (form.isValid()) {
 *                     // Submit the Ajax request and handle the response
 *                     form.submit({
 *                         success: function(form, action) {
 *                            Ext.Msg.alert('Success', action.result.message);
 *                         },
 *                         failure: function(form, action) {
 *                             Ext.Msg.alert('Failed', action.result ? action.result.message : 'No response');
 *                         }
 *                     });
 *                 }
 *             }
 *         }]
 *     });
 *
 * @docauthor Jason Johnston <jason@sencha.com>
 */
Ext.define('Ext.form.Basic', {
    extend: 'Ext.util.Observable',
    alternateClassName: 'Ext.form.BasicForm',
    requires: ['Ext.util.MixedCollection', 'Ext.form.action.Load', 'Ext.form.action.Submit',
               'Ext.window.MessageBox', 'Ext.data.Errors', 'Ext.util.DelayedTask'],

    /**
     * Creates new form.
     * @param {Ext.container.Container} owner The component that is the container for the form, usually a {@link Ext.form.Panel}
     * @param {Object} config Configuration options. These are normally specified in the config to the
     * {@link Ext.form.Panel} constructor, which passes them along to the BasicForm automatically.
     */
    constructor: function(owner, config) {
        var me = this,
            onItemAddOrRemove = me.onItemAddOrRemove,
            api,
            fn;

        /**
         * @property {Ext.container.Container} owner
         * The container component to which this BasicForm is attached.
         */
        me.owner = owner;

        // Listen for addition/removal of fields in the owner container
        me.mon(owner, {
            add: onItemAddOrRemove,
            remove: onItemAddOrRemove,
            scope: me
        });

        Ext.apply(me, config);

        // Normalize the paramOrder to an Array
        if (Ext.isString(me.paramOrder)) {
            me.paramOrder = me.paramOrder.split(/[\s,|]/);
        }
        
        if (me.api) {
            api = me.api = Ext.apply({}, me.api);
            for (fn in api) {
                if (api.hasOwnProperty(fn)) {
                    api[fn] = Ext.direct.Manager.parseMethod(api[fn]);
                }
            }
        }

        me.checkValidityTask = new Ext.util.DelayedTask(me.checkValidity, me);

        me.addEvents(
            /**
             * @event beforeaction
             * Fires before any action is performed. Return false to cancel the action.
             * @param {Ext.form.Basic} this
             * @param {Ext.form.action.Action} action The {@link Ext.form.action.Action} to be performed
             */
            'beforeaction',
            /**
             * @event actionfailed
             * Fires when an action fails.
             * @param {Ext.form.Basic} this
             * @param {Ext.form.action.Action} action The {@link Ext.form.action.Action} that failed
             */
            'actionfailed',
            /**
             * @event actioncomplete
             * Fires when an action is completed.
             * @param {Ext.form.Basic} this
             * @param {Ext.form.action.Action} action The {@link Ext.form.action.Action} that completed
             */
            'actioncomplete',
            /**
             * @event validitychange
             * Fires when the validity of the entire form changes.
             * @param {Ext.form.Basic} this
             * @param {Boolean} valid `true` if the form is now valid, `false` if it is now invalid.
             */
            'validitychange',
            /**
             * @event dirtychange
             * Fires when the dirty state of the entire form changes.
             * @param {Ext.form.Basic} this
             * @param {Boolean} dirty `true` if the form is now dirty, `false` if it is no longer dirty.
             */
            'dirtychange'
        );
        me.callParent();
    },

    /**
     * Do any post layout initialization
     * @private
     */
    initialize : function() {
        var me = this;
        me.initialized = true;
        me.onValidityChange(!me.hasInvalidField());
    },


    /**
     * @cfg {String} method
     * The request method to use (GET or POST) for form actions if one isn't supplied in the action options.
     */

    /**
     * @cfg {Ext.data.reader.Reader} reader
     * An Ext.data.DataReader (e.g. {@link Ext.data.reader.Xml}) to be used to read
     * data when executing 'load' actions. This is optional as there is built-in
     * support for processing JSON responses.
     */

    /**
     * @cfg {Ext.data.reader.Reader} errorReader
     * An Ext.data.DataReader (e.g. {@link Ext.data.reader.Xml}) to be used to
     * read field error messages returned from 'submit' actions. This is optional
     * as there is built-in support for processing JSON responses.
     *
     * The Records which provide messages for the invalid Fields must use the
     * Field name (or id) as the Record ID, and must contain a field called 'msg'
     * which contains the error message.
     *
     * The errorReader does not have to be a full-blown implementation of a
     * Reader. It simply needs to implement a `read(xhr)` function
     * which returns an Array of Records in an object with the following
     * structure:
     *
     *     {
     *         records: recordArray
     *     }
     */

    /**
     * @cfg {String} url
     * The URL to use for form actions if one isn't supplied in the
     * {@link #doAction doAction} options.
     */

    /**
     * @cfg {Object} baseParams
     * Parameters to pass with all requests. e.g. baseParams: `{id: '123', foo: 'bar'}`.
     *
     * Parameters are encoded as standard HTTP parameters using {@link Ext.Object#toQueryString}.
     */

    /**
     * @cfg {Number} timeout
     * Timeout for form actions in seconds.
     */
    timeout: 30,

    /**
     * @cfg {Object} api
     * If specified, load and submit actions will be handled with {@link Ext.form.action.DirectLoad DirectLoad}
     * and {@link Ext.form.action.DirectSubmit DirectSubmit}.  Methods which have been imported by
     * {@link Ext.direct.Manager} can be specified here to load and submit forms. API methods may also be
     * specified as strings. See {@link Ext.data.proxy.Direct#directFn}.  Such as the following:
     *
     *     api: {
     *         load: App.ss.MyProfile.load,
     *         submit: App.ss.MyProfile.submit
     *     }
     *
     * Load actions can use {@link #paramOrder} or {@link #paramsAsHash} to customize how the load method
     * is invoked.  Submit actions will always use a standard form submit. The `formHandler` configuration
     * (see Ext.direct.RemotingProvider#action) must be set on the associated server-side method which has
     * been imported by {@link Ext.direct.Manager}.
     */

    /**
     * @cfg {String/String[]} paramOrder
     * A list of params to be executed server side. Only used for the {@link #api} `load`
     * configuration.
     *
     * Specify the params in the order in which they must be executed on the
     * server-side as either (1) an Array of String values, or (2) a String of params
     * delimited by either whitespace, comma, or pipe. For example,
     * any of the following would be acceptable:
     *
     *     paramOrder: ['param1','param2','param3']
     *     paramOrder: 'param1 param2 param3'
     *     paramOrder: 'param1,param2,param3'
     *     paramOrder: 'param1|param2|param'
     */

    /**
     * @cfg {Boolean} paramsAsHash
     * Only used for the {@link #api} `load` configuration. If true, parameters will be sent as a
     * single hash collection of named arguments. Providing a {@link #paramOrder} nullifies this
     * configuration.
     */
    paramsAsHash: false,

    //<locale>
    /**
     * @cfg {String} waitTitle
     * The default title to show for the waiting message box
     */
    waitTitle: 'Please Wait...',
    //</locale>

    /**
     * @cfg {Boolean} trackResetOnLoad
     * If set to true, {@link #reset}() resets to the last loaded or {@link #setValues}() data instead of
     * when the form was first created.
     */
    trackResetOnLoad: false,

    /**
     * @cfg {Boolean} standardSubmit
     * If set to true, a standard HTML form submit is used instead of a XHR (Ajax) style form submission.
     * All of the field values, plus any additional params configured via {@link #baseParams}
     * and/or the `options` to {@link #submit}, will be included in the values submitted in the form.
     */

    /**
     * @cfg {String/HTMLElement/Ext.Element} waitMsgTarget
     * By default wait messages are displayed with Ext.MessageBox.wait. You can target a specific
     * element by passing it or its id or mask the form itself by passing in true.
     */


    // Private
    wasDirty: false,


    /**
     * Destroys this object.
     */
    destroy: function() {
        this.clearListeners();
        this.checkValidityTask.cancel();
    },

    /**
     * @private
     * Handle addition or removal of descendant items. Invalidates the cached list of fields
     * so that {@link #getFields} will do a fresh query next time it is called. Also adds listeners
     * for state change events on added fields, and tracks components with formBind=true.
     */
    onItemAddOrRemove: function(parent, child) {
        var me = this,
            isAdding = !!child.ownerCt,
            isContainer = child.isContainer;

        function handleField(field) {
            // Listen for state change events on fields
            me[isAdding ? 'mon' : 'mun'](field, {
                validitychange: me.checkValidity,
                dirtychange: me.checkDirty,
                scope: me,
                buffer: 100 //batch up sequential calls to avoid excessive full-form validation
            });
            // Flush the cached list of fields
            delete me._fields;
        }

        if (child.isFormField) {
            handleField(child);
        } else if (isContainer) {
            // Walk down
            if (child.isDestroyed || child.destroying) {
                // the container is destroyed, this means we may have child fields, so here
                // we just invalidate all the fields to be sure.
                delete me._fields;
            } else {
                Ext.Array.forEach(child.query('[isFormField]'), handleField);
            }
        }

        // Flush the cached list of formBind components
        delete this._boundItems;

        // Check form bind, but only after initial add. Batch it to prevent excessive validation
        // calls when many fields are being added at once.
        if (me.initialized) {
            me.checkValidityTask.delay(10);
        }
    },

    /**
     * Return all the {@link Ext.form.field.Field} components in the owner container.
     * @return {Ext.util.MixedCollection} Collection of the Field objects
     */
    getFields: function() {
        var fields = this._fields;
        if (!fields) {
            fields = this._fields = new Ext.util.MixedCollection();
            fields.addAll(this.owner.query('[isFormField]'));
        }
        return fields;
    },

    /**
     * @private
     * Finds and returns the set of all items bound to fields inside this form
     * @return {Ext.util.MixedCollection} The set of all bound form field items
     */
    getBoundItems: function() {
        var boundItems = this._boundItems;
        
        if (!boundItems || boundItems.getCount() === 0) {
            boundItems = this._boundItems = new Ext.util.MixedCollection();
            boundItems.addAll(this.owner.query('[formBind]'));
        }
        
        return boundItems;
    },

    /**
     * Returns true if the form contains any invalid fields. No fields will be marked as invalid
     * as a result of calling this; to trigger marking of fields use {@link #isValid} instead.
     */
    hasInvalidField: function() {
        return !!this.getFields().findBy(function(field) {
            var preventMark = field.preventMark,
                isValid;
            field.preventMark = true;
            isValid = field.isValid();
            field.preventMark = preventMark;
            return !isValid;
        });
    },

    /**
     * Returns true if client-side validation on the form is successful. Any invalid fields will be
     * marked as invalid. If you only want to determine overall form validity without marking anything,
     * use {@link #hasInvalidField} instead.
     * @return Boolean
     */
    isValid: function() {
        var me = this,
            invalid;
        Ext.suspendLayouts();
        invalid = me.getFields().filterBy(function(field) {
            return !field.validate();
        });
        Ext.resumeLayouts(true);
        return invalid.length < 1;
    },

    /**
     * Check whether the validity of the entire form has changed since it was last checked, and
     * if so fire the {@link #validitychange validitychange} event. This is automatically invoked
     * when an individual field's validity changes.
     */
    checkValidity: function() {
        var me = this,
            valid = !me.hasInvalidField();
        if (valid !== me.wasValid) {
            me.onValidityChange(valid);
            me.fireEvent('validitychange', me, valid);
            me.wasValid = valid;
        }
    },

    /**
     * @private
     * Handle changes in the form's validity. If there are any sub components with
     * formBind=true then they are enabled/disabled based on the new validity.
     * @param {Boolean} valid
     */
    onValidityChange: function(valid) {
        var boundItems = this.getBoundItems(),
            items, i, iLen, cmp;

        if (boundItems) {
            items = boundItems.items;
            iLen  = items.length;

            for (i = 0; i < iLen; i++) {
                cmp = items[i];

                if (cmp.disabled === valid) {
                    cmp.setDisabled(!valid);
                }
            }
        }
    },

    /**
     * Returns true if any fields in this form have changed from their original values.
     *
     * Note that if this BasicForm was configured with {@link #trackResetOnLoad} then the
     * Fields' *original values* are updated when the values are loaded by {@link #setValues}
     * or {@link #loadRecord}.
     *
     * @return Boolean
     */
    isDirty: function() {
        return !!this.getFields().findBy(function(f) {
            return f.isDirty();
        });
    },

    /**
     * Check whether the dirty state of the entire form has changed since it was last checked, and
     * if so fire the {@link #dirtychange dirtychange} event. This is automatically invoked
     * when an individual field's dirty state changes.
     */
    checkDirty: function() {
        var dirty = this.isDirty();
        if (dirty !== this.wasDirty) {
            this.fireEvent('dirtychange', this, dirty);
            this.wasDirty = dirty;
        }
    },

    /**
     * Returns true if the form contains a file upload field. This is used to determine the method for submitting the
     * form: File uploads are not performed using normal 'Ajax' techniques, that is they are **not** performed using
     * XMLHttpRequests. Instead a hidden `<form>` element containing all the fields is created temporarily and submitted
     * with its [target][1] set to refer to a dynamically generated, hidden `<iframe>` which is inserted into the document
     * but removed after the return data has been gathered.
     *
     * The server response is parsed by the browser to create the document for the IFRAME. If the server is using JSON
     * to send the return object, then the [Content-Type][2] header must be set to "text/html" in order to tell the
     * browser to insert the text unchanged into the document body.
     *
     * Characters which are significant to an HTML parser must be sent as HTML entities, so encode `"<"` as `"&lt;"`,
     * `"&"` as `"&amp;"` etc.
     *
     * The response text is retrieved from the document, and a fake XMLHttpRequest object is created containing a
     * responseText property in order to conform to the requirements of event handlers and callbacks.
     *
     * Be aware that file upload packets are sent with the content type [multipart/form][3] and some server technologies
     * (notably JEE) may require some custom processing in order to retrieve parameter names and parameter values from
     * the packet content.
     *
     * [1]: http://www.w3.org/TR/REC-html40/present/frames.html#adef-target
     * [2]: http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.17
     * [3]: http://www.faqs.org/rfcs/rfc2388.html
     *
     * @return Boolean
     */
    hasUpload: function() {
        return !!this.getFields().findBy(function(f) {
            return f.isFileUpload();
        });
    },

    /**
     * Performs a predefined action (an implementation of {@link Ext.form.action.Action}) to perform application-
     * specific processing.
     *
     * @param {String/Ext.form.action.Action} action The name of the predefined action type, or instance of {@link
     * Ext.form.action.Action} to perform.
     *
     * @param {Object} [options] The options to pass to the {@link Ext.form.action.Action} that will get created,
     * if the action argument is a String.
     *
     * All of the config options listed below are supported by both the {@link Ext.form.action.Submit submit} and
     * {@link Ext.form.action.Load load} actions unless otherwise noted (custom actions could also accept other
     * config options):
     *
     * @param {String} options.url
     * The url for the action (defaults to the form's {@link #url}.)
     *
     * @param {String} options.method
     * The form method to use (defaults to the form's method, or POST if not defined)
     *
     * @param {String/Object} options.params
     * The params to pass (defaults to the form's baseParams, or none if not defined)
     *
     * Parameters are encoded as standard HTTP parameters using {@link Ext#urlEncode Ext.Object.toQueryString}.
     *
     * @param {Object} options.headers
     * Request headers to set for the action.
     *
     * @param {Function} options.success
     * The callback that will be invoked after a successful response (see top of {@link Ext.form.action.Submit submit}
     * and {@link Ext.form.action.Load load} for a description of what constitutes a successful response).
     * @param {Ext.form.Basic} options.success.form The form that requested the action.
     * @param {Ext.form.action.Action} options.success.action The Action object which performed the operation.
     * The action object contains these properties of interest:
     *
     *  - {@link Ext.form.action.Action#response response}
     *  - {@link Ext.form.action.Action#result result} - interrogate for custom postprocessing
     *  - {@link Ext.form.action.Action#type type}
     *
     * @param {Function} options.failure
     * The callback that will be invoked after a failed transaction attempt.
     * @param {Ext.form.Basic} options.failure.form The form that requested the action.
     * @param {Ext.form.action.Action} options.failure.action The Action object which performed the operation.
     * The action object contains these properties of interest:
     *
     * - {@link Ext.form.action.Action#failureType failureType}
     * - {@link Ext.form.action.Action#response response}
     * - {@link Ext.form.action.Action#result result} - interrogate for custom postprocessing
     * - {@link Ext.form.action.Action#type type}
     *
     * @param {Object} options.scope
     * The scope in which to call the callback functions (The this reference for the callback functions).
     *
     * @param {Boolean} options.clientValidation
     * Submit Action only. Determines whether a Form's fields are validated in a final call to {@link
     * Ext.form.Basic#isValid isValid} prior to submission. Set to false to prevent this. If undefined, pre-submission
     * field validation is performed.
     *
     * @return {Ext.form.Basic} this
     */
    doAction: function(action, options) {
        if (Ext.isString(action)) {
            action = Ext.ClassManager.instantiateByAlias('formaction.' + action, Ext.apply({}, options, {form: this}));
        }
        if (this.fireEvent('beforeaction', this, action) !== false) {
            this.beforeAction(action);
            Ext.defer(action.run, 100, action);
        }
        return this;
    },

    /**
     * Shortcut to {@link #doAction do} a {@link Ext.form.action.Submit submit action}. This will use the
     * {@link Ext.form.action.Submit AJAX submit action} by default. If the {@link #standardSubmit} config
     * is enabled it will use a standard form element to submit, or if the {@link #api} config is present
     * it will use the {@link Ext.form.action.DirectLoad Ext.direct.Direct submit action}.
     *
     * The following code:
     *
     *     myFormPanel.getForm().submit({
     *         clientValidation: true,
     *         url: 'updateConsignment.php',
     *         params: {
     *             newStatus: 'delivered'
     *         },
     *         success: function(form, action) {
     *            Ext.Msg.alert('Success', action.result.msg);
     *         },
     *         failure: function(form, action) {
     *             switch (action.failureType) {
     *                 case Ext.form.action.Action.CLIENT_INVALID:
     *                     Ext.Msg.alert('Failure', 'Form fields may not be submitted with invalid values');
     *                     break;
     *                 case Ext.form.action.Action.CONNECT_FAILURE:
     *                     Ext.Msg.alert('Failure', 'Ajax communication failed');
     *                     break;
     *                 case Ext.form.action.Action.SERVER_INVALID:
     *                    Ext.Msg.alert('Failure', action.result.msg);
     *            }
     *         }
     *     });
     *
     * would process the following server response for a successful submission:
     *
     *     {
     *         "success":true, // note this is Boolean, not string
     *         "msg":"Consignment updated"
     *     }
     *
     * and the following server response for a failed submission:
     *
     *     {
     *         "success":false, // note this is Boolean, not string
     *         "msg":"You do not have permission to perform this operation"
     *     }
     *
     * @param {Object} options The options to pass to the action (see {@link #doAction} for details).
     * @return {Ext.form.Basic} this
     */
    submit: function(options) {
        options = options || {};
        var me = this,
            action;
            
        if (options.standardSubmit || me.standardSubmit) {
            action = 'standardsubmit';
        } else {
            action = me.api ? 'directsubmit' : 'submit';
        }
            
        return me.doAction(action, options);
    },

    /**
     * Shortcut to {@link #doAction do} a {@link Ext.form.action.Load load action}.
     * @param {Object} options The options to pass to the action (see {@link #doAction} for details)
     * @return {Ext.form.Basic} this
     */
    load: function(options) {
        return this.doAction(this.api ? 'directload' : 'load', options);
    },

    /**
     * Persists the values in this form into the passed {@link Ext.data.Model} object in a beginEdit/endEdit block.
     * If the record is not specified, it will attempt to update (if it exists) the record provided to loadRecord.
     * @param {Ext.data.Model} [record] The record to edit
     * @return {Ext.form.Basic} this
     */
    updateRecord: function(record) {
        record = record || this._record;
        if (!record) {
            Ext.Error.raise("A record is required.");
        }
        var fields = record.fields.items,
            values = this.getFieldValues(),
            obj = {},
            i = 0,
            len = fields.length,
            name;

        for (; i < len; ++i) {
            name  = fields[i].name;

            if (values.hasOwnProperty(name)) {
                obj[name] = values[name];
            }
        }

        record.beginEdit();
        record.set(obj);
        record.endEdit();

        return this;
    },

    /**
     * Loads an {@link Ext.data.Model} into this form by calling {@link #setValues} with the
     * {@link Ext.data.Model#raw record data}.
     * See also {@link #trackResetOnLoad}.
     * @param {Ext.data.Model} record The record to load
     * @return {Ext.form.Basic} this
     */
    loadRecord: function(record) {
        this._record = record;
        return this.setValues(record.data);
    },

    /**
     * Returns the last Ext.data.Model instance that was loaded via {@link #loadRecord}
     * @return {Ext.data.Model} The record
     */
    getRecord: function() {
        return this._record;
    },

    /**
     * @private
     * Called before an action is performed via {@link #doAction}.
     * @param {Ext.form.action.Action} action The Action instance that was invoked
     */
    beforeAction: function(action) {
        var waitMsg = action.waitMsg,
            maskCls = Ext.baseCSSPrefix + 'mask-loading',
            fields  = this.getFields().items,
            f,
            fLen    = fields.length,
            field, waitMsgTarget;

        // Call HtmlEditor's syncValue before actions
        for (f = 0; f < fLen; f++) {
            field = fields[f];

            if (field.isFormField && field.syncValue) {
                field.syncValue();
            }
        }

        if (waitMsg) {
            waitMsgTarget = this.waitMsgTarget;
            if (waitMsgTarget === true) {
                this.owner.el.mask(waitMsg, maskCls);
            } else if (waitMsgTarget) {
                waitMsgTarget = this.waitMsgTarget = Ext.get(waitMsgTarget);
                waitMsgTarget.mask(waitMsg, maskCls);
            } else {
                Ext.MessageBox.wait(waitMsg, action.waitTitle || this.waitTitle);
            }
        }
    },

    /**
     * @private
     * Called after an action is performed via {@link #doAction}.
     * @param {Ext.form.action.Action} action The Action instance that was invoked
     * @param {Boolean} success True if the action completed successfully, false, otherwise.
     */
    afterAction: function(action, success) {
        if (action.waitMsg) {
            var messageBox = Ext.MessageBox,
                waitMsgTarget = this.waitMsgTarget;
            if (waitMsgTarget === true) {
                this.owner.el.unmask();
            } else if (waitMsgTarget) {
                waitMsgTarget.unmask();
            } else {
                // Do not fire the hide event because that triggers complex processing
                // which is not necessary just for the wait window, and which may interfere with the app.
                messageBox.suspendEvents();
                messageBox.hide();
                messageBox.resumeEvents();
            }
        }
        if (success) {
            if (action.reset) {
                this.reset();
            }
            Ext.callback(action.success, action.scope || action, [this, action]);
            this.fireEvent('actioncomplete', this, action);
        } else {
            Ext.callback(action.failure, action.scope || action, [this, action]);
            this.fireEvent('actionfailed', this, action);
        }
    },


    /**
     * Find a specific {@link Ext.form.field.Field} in this form by id or name.
     * @param {String} id The value to search for (specify either a {@link Ext.Component#id id} or
     * {@link Ext.form.field.Field#getName name or hiddenName}).
     * @return {Ext.form.field.Field} The first matching field, or `null` if none was found.
     */
    findField: function(id) {
        return this.getFields().findBy(function(f) {
            return f.id === id || f.getName() === id;
        });
    },


    /**
     * Mark fields in this form invalid in bulk.
     * @param {Object/Object[]/Ext.data.Errors} errors
     * Either an array in the form `[{id:'fieldId', msg:'The message'}, ...]`,
     * an object hash of `{id: msg, id2: msg2}`, or a {@link Ext.data.Errors} object.
     * @return {Ext.form.Basic} this
     */
    markInvalid: function(errors) {
        var me = this,
            e, eLen, error, value,
            key;

        function mark(fieldId, msg) {
            var field = me.findField(fieldId);
            if (field) {
                field.markInvalid(msg);
            }
        }

        if (Ext.isArray(errors)) {
            eLen = errors.length;

            for (e = 0; e < eLen; e++) {
                error = errors[e];
                mark(error.id, error.msg);
            }
        } else if (errors instanceof Ext.data.Errors) {
            eLen  = errors.items.length;
            for (e = 0; e < eLen; e++) {
                error = errors.items[e];

                mark(error.field, error.message);
            }
        } else {
            for (key in errors) {
                if (errors.hasOwnProperty(key)) {
                    value = errors[key];
                    mark(key, value, errors);
                }
            }
        }
        return this;
    },

    /**
     * Set values for fields in this form in bulk.
     *
     * @param {Object/Object[]} values Either an array in the form:
     *
     *     [{id:'clientName', value:'Fred. Olsen Lines'},
     *      {id:'portOfLoading', value:'FXT'},
     *      {id:'portOfDischarge', value:'OSL'} ]
     *
     * or an object hash of the form:
     *
     *     {
     *         clientName: 'Fred. Olsen Lines',
     *         portOfLoading: 'FXT',
     *         portOfDischarge: 'OSL'
     *     }
     *
     * @return {Ext.form.Basic} this
     */
    setValues: function(values) {
        var me = this,
            v, vLen, val, field;

        function setVal(fieldId, val) {
            var field = me.findField(fieldId);
            if (field) {
                field.setValue(val);
                if (me.trackResetOnLoad) {
                    field.resetOriginalValue();
                }
            }
        }

        if (Ext.isArray(values)) {
            // array of objects
            vLen = values.length;

            for (v = 0; v < vLen; v++) {
                val = values[v];

                setVal(val.id, val.value);
            }
        } else {
            // object hash
            Ext.iterate(values, setVal);
        }
        return this;
    },

    /**
     * Retrieves the fields in the form as a set of key/value pairs, using their
     * {@link Ext.form.field.Field#getSubmitData getSubmitData()} method to collect the values.
     * If multiple fields return values under the same name those values will be combined into an Array.
     * This is similar to {@link Ext.form.Basic#getFieldValues getFieldValues} except that this method
     * collects only String values for submission, while getFieldValues collects type-specific data
     * values (e.g. Date objects for date fields.)
     *
     * @param {Boolean} [asString=false] If true, will return the key/value collection as a single
     * URL-encoded param string.
     * @param {Boolean} [dirtyOnly=false] If true, only fields that are dirty will be included in the result.
     * @param {Boolean} [includeEmptyText=false] If true, the configured emptyText of empty fields will be used.
     * @param {Boolean} [useDataValues=false] If true, the {@link Ext.form.field.Field#getModelData getModelData}
     * method is used to retrieve values from fields, otherwise the {@link Ext.form.field.Field#getSubmitData getSubmitData}
     * method is used.
     * @return {String/Object}
     */
    getValues: function(asString, dirtyOnly, includeEmptyText, useDataValues) {
        var values  = {},
            fields  = this.getFields().items,
            f,
            fLen    = fields.length,
            isArray = Ext.isArray,
            field, data, val, bucket, name;

        for (f = 0; f < fLen; f++) {
            field = fields[f];

            if (!dirtyOnly || field.isDirty()) {
                data = field[useDataValues ? 'getModelData' : 'getSubmitData'](includeEmptyText);

                if (Ext.isObject(data)) {
                    for (name in data) {
                        if (data.hasOwnProperty(name)) {
                            val = data[name];

                            if (includeEmptyText && val === '') {
                                val = field.emptyText || '';
                            }

                            if (values.hasOwnProperty(name)) {
                                bucket = values[name];

                                if (!isArray(bucket)) {
                                    bucket = values[name] = [bucket];
                                }

                                if (isArray(val)) {
                                    values[name] = values[name] = bucket.concat(val);
                                } else {
                                    bucket.push(val);
                                }
                            } else {
                                values[name] = val;
                            }
                        }
                    }
                }
            }
        }

        if (asString) {
            values = Ext.Object.toQueryString(values);
        }
        return values;
    },

    /**
     * Retrieves the fields in the form as a set of key/value pairs, using their
     * {@link Ext.form.field.Field#getModelData getModelData()} method to collect the values.
     * If multiple fields return values under the same name those values will be combined into an Array.
     * This is similar to {@link #getValues} except that this method collects type-specific data values
     * (e.g. Date objects for date fields) while getValues returns only String values for submission.
     *
     * @param {Boolean} [dirtyOnly=false] If true, only fields that are dirty will be included in the result.
     * @return {Object}
     */
    getFieldValues: function(dirtyOnly) {
        return this.getValues(false, dirtyOnly, false, true);
    },

    /**
     * Clears all invalid field messages in this form.
     * @return {Ext.form.Basic} this
     */
    clearInvalid: function() {
        Ext.suspendLayouts();

        var me     = this,
            fields = me.getFields().items,
            f,
            fLen   = fields.length;

        for (f = 0; f < fLen; f++) {
            fields[f].clearInvalid();
        }

        Ext.resumeLayouts(true);
        return me;
    },

    /**
     * Resets all fields in this form.
     * @return {Ext.form.Basic} this
     */
    reset: function() {
        Ext.suspendLayouts();

        var me     = this,
            fields = me.getFields().items,
            f,
            fLen   = fields.length;

        for (f = 0; f < fLen; f++) {
            fields[f].reset();
        }

        Ext.resumeLayouts(true);
        return me;
    },

    /**
     * Calls {@link Ext#apply Ext.apply} for all fields in this form with the passed object.
     * @param {Object} obj The object to be applied
     * @return {Ext.form.Basic} this
     */
    applyToFields: function(obj) {
        var fields = this.getFields().items,
            f,
            fLen   = fields.length;

        for (f = 0; f < fLen; f++) {
            Ext.apply(fields[f], obj);
        }

        return this;
    },

    /**
     * Calls {@link Ext#applyIf Ext.applyIf} for all field in this form with the passed object.
     * @param {Object} obj The object to be applied
     * @return {Ext.form.Basic} this
     */
    applyIfToFields: function(obj) {
        var fields = this.getFields().items,
            f,
            fLen   = fields.length;

        for (f = 0; f < fLen; f++) {
            Ext.applyIf(fields[f], obj);
        }

        return this;
    }
});

/**
 * @docauthor Jason Johnston <jason@sencha.com>
 * 
 * FormPanel provides a standard container for forms. It is essentially a standard {@link Ext.panel.Panel} which
 * automatically creates a {@link Ext.form.Basic BasicForm} for managing any {@link Ext.form.field.Field}
 * objects that are added as descendants of the panel. It also includes conveniences for configuring and
 * working with the BasicForm and the collection of Fields.
 * 
 * # Layout
 * 
 * By default, FormPanel is configured with `{@link Ext.layout.container.Anchor layout:'anchor'}` for
 * the layout of its immediate child items. This can be changed to any of the supported container layouts.
 * The layout of sub-containers is configured in {@link Ext.container.Container#layout the standard way}.
 * 
 * # BasicForm
 * 
 * Although **not listed** as configuration options of FormPanel, the FormPanel class accepts all
 * of the config options supported by the {@link Ext.form.Basic} class, and will pass them along to
 * the internal BasicForm when it is created.
 * 
 * The following events fired by the BasicForm will be re-fired by the FormPanel and can therefore be
 * listened for on the FormPanel itself:
 * 
 * - {@link Ext.form.Basic#beforeaction beforeaction}
 * - {@link Ext.form.Basic#actionfailed actionfailed}
 * - {@link Ext.form.Basic#actioncomplete actioncomplete}
 * - {@link Ext.form.Basic#validitychange validitychange}
 * - {@link Ext.form.Basic#dirtychange dirtychange}
 * 
 * # Field Defaults
 * 
 * The {@link #fieldDefaults} config option conveniently allows centralized configuration of default values
 * for all fields added as descendants of the FormPanel. Any config option recognized by implementations
 * of {@link Ext.form.Labelable} may be included in this object. See the {@link #fieldDefaults} documentation
 * for details of how the defaults are applied.
 * 
 * # Form Validation
 * 
 * With the default configuration, form fields are validated on-the-fly while the user edits their values.
 * This can be controlled on a per-field basis (or via the {@link #fieldDefaults} config) with the field
 * config properties {@link Ext.form.field.Field#validateOnChange} and {@link Ext.form.field.Base#checkChangeEvents},
 * and the FormPanel's config properties {@link #pollForChanges} and {@link #pollInterval}.
 * 
 * Any component within the FormPanel can be configured with `formBind: true`. This will cause that
 * component to be automatically disabled when the form is invalid, and enabled when it is valid. This is most
 * commonly used for Button components to prevent submitting the form in an invalid state, but can be used on
 * any component type.
 * 
 * For more information on form validation see the following:
 * 
 * - {@link Ext.form.field.Field#validateOnChange}
 * - {@link #pollForChanges} and {@link #pollInterval}
 * - {@link Ext.form.field.VTypes}
 * - {@link Ext.form.Basic#doAction BasicForm.doAction clientValidation notes}
 * 
 * # Form Submission
 * 
 * By default, Ext Forms are submitted through Ajax, using {@link Ext.form.action.Action}. See the documentation for
 * {@link Ext.form.Basic} for details.
 *
 * # Example usage
 * 
 *     @example
 *     Ext.create('Ext.form.Panel', {
 *         title: 'Simple Form',
 *         bodyPadding: 5,
 *         width: 350,
 * 
 *         // The form will submit an AJAX request to this URL when submitted
 *         url: 'save-form.php',
 * 
 *         // Fields will be arranged vertically, stretched to full width
 *         layout: 'anchor',
 *         defaults: {
 *             anchor: '100%'
 *         },
 * 
 *         // The fields
 *         defaultType: 'textfield',
 *         items: [{
 *             fieldLabel: 'First Name',
 *             name: 'first',
 *             allowBlank: false
 *         },{
 *             fieldLabel: 'Last Name',
 *             name: 'last',
 *             allowBlank: false
 *         }],
 * 
 *         // Reset and Submit buttons
 *         buttons: [{
 *             text: 'Reset',
 *             handler: function() {
 *                 this.up('form').getForm().reset();
 *             }
 *         }, {
 *             text: 'Submit',
 *             formBind: true, //only enabled once the form is valid
 *             disabled: true,
 *             handler: function() {
 *                 var form = this.up('form').getForm();
 *                 if (form.isValid()) {
 *                     form.submit({
 *                         success: function(form, action) {
 *                            Ext.Msg.alert('Success', action.result.msg);
 *                         },
 *                         failure: function(form, action) {
 *                             Ext.Msg.alert('Failed', action.result.msg);
 *                         }
 *                     });
 *                 }
 *             }
 *         }],
 *         renderTo: Ext.getBody()
 *     });
 *
 */
Ext.define('Ext.form.Panel', {
    extend:'Ext.panel.Panel',
    mixins: {
        fieldAncestor: 'Ext.form.FieldAncestor'
    },
    alias: 'widget.form',
    alternateClassName: ['Ext.FormPanel', 'Ext.form.FormPanel'],
    requires: ['Ext.form.Basic', 'Ext.util.TaskRunner'],

    /**
     * @cfg {Boolean} pollForChanges
     * If set to `true`, sets up an interval task (using the {@link #pollInterval}) in which the
     * panel's fields are repeatedly checked for changes in their values. This is in addition to the normal detection
     * each field does on its own input element, and is not needed in most cases. It does, however, provide a
     * means to absolutely guarantee detection of all changes including some edge cases in some browsers which
     * do not fire native events. Defaults to `false`.
     */

    /**
     * @cfg {Number} pollInterval
     * Interval in milliseconds at which the form's fields are checked for value changes. Only used if
     * the {@link #pollForChanges} option is set to `true`. Defaults to 500 milliseconds.
     */

    /**
     * @cfg {String} layout
     * The {@link Ext.container.Container#layout} for the form panel's immediate child items.
     * Defaults to `'anchor'`.
     */
    layout: 'anchor',

    ariaRole: 'form',
    
    basicFormConfigs: [
        'api', 
        'baseParams', 
        'errorReader', 
        'method', 
        'paramOrder',
        'paramsAsHash',
        'reader',
        'standardSubmit',
        'timeout',
        'trackResetOnLoad',
        'url',
        'waitMsgTarget',
        'waitTitle'
    ],

    initComponent: function() {
        var me = this;

        if (me.frame) {
            me.border = false;
        }

        me.initFieldAncestor();
        me.callParent();

        me.relayEvents(me.form, [
            /**
             * @event beforeaction
             * @inheritdoc Ext.form.Basic#beforeaction
             */
            'beforeaction',
            /**
             * @event actionfailed
             * @inheritdoc Ext.form.Basic#actionfailed
             */
            'actionfailed',
            /**
             * @event actioncomplete
             * @inheritdoc Ext.form.Basic#actioncomplete
             */
            'actioncomplete',
            /**
             * @event validitychange
             * @inheritdoc Ext.form.Basic#validitychange
             */
            'validitychange',
            /**
             * @event dirtychange
             * @inheritdoc Ext.form.Basic#dirtychange
             */
            'dirtychange'
        ]);

        // Start polling if configured
        if (me.pollForChanges) {
            me.startPolling(me.pollInterval || 500);
        }
    },

    initItems: function() {
        // Create the BasicForm
        var me = this;

        me.form = me.createForm();
        me.callParent();
    },

    // Initialize the BasicForm after all layouts have been completed.
    afterFirstLayout: function() {
        this.callParent();
        this.form.initialize();
    },

    /**
     * @private
     */
    createForm: function() {
        var cfg = {},
            props = this.basicFormConfigs,
            len = props.length,
            i = 0,
            prop;
            
        for (; i < len; ++i) {
            prop = props[i];
            cfg[prop] = this[prop];
        }
        return new Ext.form.Basic(this, cfg);
    },

    /**
     * Provides access to the {@link Ext.form.Basic Form} which this Panel contains.
     * @return {Ext.form.Basic} The {@link Ext.form.Basic Form} which this Panel contains.
     */
    getForm: function() {
        return this.form;
    },

    /**
     * Loads an {@link Ext.data.Model} into this form (internally just calls {@link Ext.form.Basic#loadRecord})
     * See also {@link Ext.form.Basic#trackResetOnLoad trackResetOnLoad}.
     * @param {Ext.data.Model} record The record to load
     * @return {Ext.form.Basic} The Ext.form.Basic attached to this FormPanel
     */
    loadRecord: function(record) {
        return this.getForm().loadRecord(record);
    },

    /**
     * Returns the currently loaded Ext.data.Model instance if one was loaded via {@link #loadRecord}.
     * @return {Ext.data.Model} The loaded instance
     */
    getRecord: function() {
        return this.getForm().getRecord();
    },

    /**
     * Convenience function for fetching the current value of each field in the form. This is the same as calling
     * {@link Ext.form.Basic#getValues this.getForm().getValues()}.
     *
     * @inheritdoc Ext.form.Basic#getValues
     */
    getValues: function(asString, dirtyOnly, includeEmptyText, useDataValues) {
        return this.getForm().getValues(asString, dirtyOnly, includeEmptyText, useDataValues);
    },

    beforeDestroy: function() {
        this.stopPolling();
        this.form.destroy();
        this.callParent();
    },

    /**
     * This is a proxy for the underlying BasicForm's {@link Ext.form.Basic#load} call.
     * @param {Object} options The options to pass to the action (see {@link Ext.form.Basic#load} and
     * {@link Ext.form.Basic#doAction} for details)
     */
    load: function(options) {
        this.form.load(options);
    },

    /**
     * This is a proxy for the underlying BasicForm's {@link Ext.form.Basic#submit} call.
     * @param {Object} options The options to pass to the action (see {@link Ext.form.Basic#submit} and
     * {@link Ext.form.Basic#doAction} for details)
     */
    submit: function(options) {
        this.form.submit(options);
    },

    /**
     * Start an interval task to continuously poll all the fields in the form for changes in their
     * values. This is normally started automatically by setting the {@link #pollForChanges} config.
     * @param {Number} interval The interval in milliseconds at which the check should run.
     */
    startPolling: function(interval) {
        this.stopPolling();
        var task = new Ext.util.TaskRunner(interval);
        task.start({
            interval: 0,
            run: this.checkChange,
            scope: this
        });
        this.pollTask = task;
    },

    /**
     * Stop a running interval task that was started by {@link #startPolling}.
     */
    stopPolling: function() {
        var task = this.pollTask;
        if (task) {
            task.stopAll();
            delete this.pollTask;
        }
    },

    /**
     * Forces each field within the form panel to
     * {@link Ext.form.field.Field#checkChange check if its value has changed}.
     */
    checkChange: function() {
        var fields = this.form.getFields().items,
            f,
            fLen   = fields.length,
            field;

        for (f = 0; f < fLen; f++) {
            fields[f].checkChange();
        }
    }
});
