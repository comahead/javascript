

/**
 * A specialized panel intended for use as an application window. Windows are floated, {@link #resizable}, and
 * {@link #cfg-draggable} by default. Windows can be {@link #maximizable maximized} to fill the viewport, restored to
 * their prior size, and can be {@link #method-minimize}d.
 *
 * Windows can also be linked to a {@link Ext.ZIndexManager} or managed by the {@link Ext.WindowManager} to provide
 * grouping, activation, to front, to back and other application-specific behavior.
 *
 * By default, Windows will be rendered to document.body. To {@link #constrain} a Window to another element specify
 * {@link Ext.Component#renderTo renderTo}.
 *
 * **As with all {@link Ext.container.Container Container}s, it is important to consider how you want the Window to size
 * and arrange any child Components. Choose an appropriate {@link #layout} configuration which lays out child Components
 * in the required manner.**
 *
 *     @example
 *     Ext.create('Ext.window.Window', {
 *         title: 'Hello',
 *         height: 200,
 *         width: 400,
 *         layout: 'fit',
 *         items: {  // Let's put an empty grid in just to illustrate fit layout
 *             xtype: 'grid',
 *             border: false,
 *             columns: [{header: 'World'}],                 // One header just for show. There's no data,
 *             store: Ext.create('Ext.data.ArrayStore', {}) // A dummy empty data store
 *         }
 *     }).show();
 */
Ext.define('Ext.window.Window', {
    extend: 'Ext.panel.Panel',

    alternateClassName: 'Ext.Window',

    requires: ['Ext.util.ComponentDragger', 'Ext.util.Region', 'Ext.EventManager'],

    alias: 'widget.window',

    /**
     * @cfg {Number} x
     * The X position of the left edge of the window on initial showing. Defaults to centering the Window within the
     * width of the Window's container {@link Ext.Element Element} (The Element that the Window is rendered to).
     */

    /**
     * @cfg {Number} y
     * The Y position of the top edge of the window on initial showing. Defaults to centering the Window within the
     * height of the Window's container {@link Ext.Element Element} (The Element that the Window is rendered to).
     */

    /**
     * @cfg {Boolean} [modal=false]
     * True to make the window modal and mask everything behind it when displayed, false to display it without
     * restricting access to other UI elements.
     */

    /**
     * @cfg {String/Ext.Element} [animateTarget=null]
     * Id or element from which the window should animate while opening.
     */

    /**
     * @cfg {String/Number/Ext.Component} defaultFocus
     * Specifies a Component to receive focus when this Window is focused.
     *
     * This may be one of:
     *
     *   - The index of a footer Button.
     *   - The id or {@link Ext.AbstractComponent#itemId} of a descendant Component.
     *   - A Component.
     */

    /**
     * @cfg {Function} onEsc
     * Allows override of the built-in processing for the escape key. Default action is to close the Window (performing
     * whatever action is specified in {@link #closeAction}. To prevent the Window closing when the escape key is
     * pressed, specify this as {@link Ext#emptyFn Ext.emptyFn}.
     */

    /**
     * @cfg {Boolean} [collapsed=false]
     * True to render the window collapsed, false to render it expanded. Note that if {@link #expandOnShow}
     * is true (the default) it will override the `collapsed` config and the window will always be
     * expanded when shown.
     */

    /**
     * @cfg {Boolean} [maximized=false]
     * True to initially display the window in a maximized state.
     */

    /**
    * @cfg {String} [baseCls='x-window']
    * The base CSS class to apply to this panel's element.
    */
    baseCls: Ext.baseCSSPrefix + 'window',

    /**
     * @cfg {Boolean/Object} resizable
     * Specify as `true` to allow user resizing at each edge and corner of the window, false to disable resizing.
     *
     * This may also be specified as a config object to Ext.resizer.Resizer
     */
    resizable: true,

    /**
     * @cfg {Boolean} draggable
     * True to allow the window to be dragged by the header bar, false to disable dragging. Note that
     * by default the window will be centered in the viewport, so if dragging is disabled the window may need to be
     * positioned programmatically after render (e.g., myWindow.setPosition(100, 100);).
     */
    draggable: true,

    /**
     * @cfg {Boolean} constrain
     * True to constrain the window within its containing element, false to allow it to fall outside of its containing
     * element. By default the window will be rendered to document.body. To render and constrain the window within
     * another element specify {@link #renderTo}. Optionally the header only can be constrained
     * using {@link #constrainHeader}.
     */
    constrain: false,

    /**
     * @cfg {Boolean} constrainHeader
     * True to constrain the window header within its containing element (allowing the window body to fall outside of
     * its containing element) or false to allow the header to fall outside its containing element.
     * Optionally the entire window can be constrained using {@link #constrain}.
     */
    constrainHeader: false,

    /**
     * @cfg {Ext.util.Region/Ext.Element} constrainTo
     * A {@link Ext.util.Region Region} (or an element from which a Region measurement will be read) which is used
     * to constrain the window.
     */

    /**
     * @cfg {Boolean} plain
     * True to render the window body with a transparent background so that it will blend into the framing elements,
     * false to add a lighter background color to visually highlight the body element and separate it more distinctly
     * from the surrounding frame.
     */
    plain: false,

    /**
     * @cfg {Boolean} minimizable
     * True to display the 'minimize' tool button and allow the user to minimize the window, false to hide the button
     * and disallow minimizing the window. Note that this button provides no implementation -- the
     * behavior of minimizing a window is implementation-specific, so the minimize event must be handled and a custom
     * minimize behavior implemented for this option to be useful.
     */
    minimizable: false,

    /**
     * @cfg {Boolean} maximizable
     * True to display the 'maximize' tool button and allow the user to maximize the window, false to hide the button
     * and disallow maximizing the window. Note that when a window is maximized, the tool button
     * will automatically change to a 'restore' button with the appropriate behavior already built-in that will restore
     * the window to its previous size.
     */
    maximizable: false,

    // inherit docs
    minHeight: 50,

    // inherit docs
    minWidth: 50,

    /**
     * @cfg {Boolean} expandOnShow
     * True to always expand the window when it is displayed, false to keep it in its current state (which may be
     * {@link #collapsed}) when displayed.
     */
    expandOnShow: true,

    // inherited docs, same default
    collapsible: false,

    /**
     * @cfg {Boolean} closable
     * True to display the 'close' tool button and allow the user to close the window, false to hide the button and
     * disallow closing the window.
     *
     * By default, when close is requested by either clicking the close button in the header or pressing ESC when the
     * Window has focus, the {@link #method-close} method will be called. This will _{@link Ext.Component#method-destroy destroy}_ the
     * Window and its content meaning that it may not be reused.
     *
     * To make closing a Window _hide_ the Window so that it may be reused, set {@link #closeAction} to 'hide'.
     */
    closable: true,

    /**
     * @cfg {Boolean} hidden
     * Render this Window hidden. If `true`, the {@link #method-hide} method will be called internally.
     */
    hidden: true,

    /**
     * @cfg
     * @inheritdoc
     * Windows render to the body on first show.
     */
    autoRender: true,

    /**
     * @cfg
     * @inheritdoc
     * Windows hide using offsets in order to preserve the scroll positions of their descendants.
     */
    hideMode: 'offsets',

    /**
     * @cfg
     * @private
     */
    floating: true,

    ariaRole: 'alertdialog',

    itemCls: Ext.baseCSSPrefix + 'window-item',
    
    initialAlphaNum: /^[a-z0-9]/,

    overlapHeader: true,

    ignoreHeaderBorderManagement: true,

    // Flag to Renderable to always look up the framing styles for this Component
    alwaysFramed: true,

    /**
     * @property {Boolean} isWindow
     * `true` in this class to identify an object as an instantiated Window, or subclass thereof.
     */
    isWindow: true,

    // private
    initComponent: function() {
        var me = this;
        // Explicitly set frame to false, since alwaysFramed is
        // true, we only want to lookup framing in a specific instance
        me.frame = false;
        me.callParent();
        me.addEvents(
            /**
             * @event activate
             * Fires after the window has been visually activated via {@link #setActive}.
             * @param {Ext.window.Window} this
             */

            /**
             * @event deactivate
             * Fires after the window has been visually deactivated via {@link #setActive}.
             * @param {Ext.window.Window} this
             */

            /**
             * @event resize
             * Fires after the window has been resized.
             * @param {Ext.window.Window} this
             * @param {Number} width The window's new width
             * @param {Number} height The window's new height
             */
            'resize',

            /**
             * @event maximize
             * Fires after the window has been maximized.
             * @param {Ext.window.Window} this
             */
            'maximize',

            /**
             * @event minimize
             * Fires after the window has been minimized.
             * @param {Ext.window.Window} this
             */
            'minimize',

            /**
             * @event restore
             * Fires after the window has been restored to its original size after being maximized.
             * @param {Ext.window.Window} this
             */
            'restore'
        );

        if (me.plain) {
            me.addClsWithUI('plain');
        }

        if (me.modal) {
            me.ariaRole = 'dialog';
        }

        // clickToRaise
        if (me.floating) {
            me.on({
                element: 'el',
                mousedown: me.onMouseDown,
                scope: me
            });
        }

        me.addStateEvents(['maximize', 'restore', 'resize', 'dragend']);
    },

    getElConfig: function () {
        var me = this,
            elConfig;

        elConfig = me.callParent();
        elConfig.tabIndex = -1;
        return elConfig;
    },

    // State Management
    // private

    getState: function() {
        var me = this,
            state = me.callParent() || {},
            maximized = !!me.maximized;

        state.maximized = maximized;
        Ext.apply(state, {
            size: maximized ? me.restoreSize : me.getSize(),
            pos: maximized ? me.restorePos : me.getPosition()
        });
        return state;
    },

    applyState: function(state){
        var me = this;

        if (state) {
            me.maximized = state.maximized;
            if (me.maximized) {
                me.hasSavedRestore = true;
                me.restoreSize = state.size;
                me.restorePos = state.pos;
            } else {
                Ext.apply(me, {
                    width: state.size.width,
                    height: state.size.height,
                    x: state.pos[0],
                    y: state.pos[1]
                });
            }
        }
    },

    // private
    onMouseDown: function (e) {
        var preventFocus;
            
        if (this.floating) {
            if (Ext.fly(e.getTarget()).focusable()) {
                preventFocus = true;
            }
            this.toFront(preventFocus);
        }
    },

    // private
    onRender: function(ct, position) {
        var me = this;
        me.callParent(arguments);
        me.focusEl = me.el;

        // Double clicking a header will toggleMaximize
        if (me.maximizable) {
            me.header.on({
                scope: me,
                dblclick: me.toggleMaximize
            });
        }
    },

    // private
    afterRender: function() {
        var me = this,
            keyMap;

        me.callParent();

        // Initialize
        if (me.maximized) {
            me.maximized = false;
            me.maximize();
        }

        if (me.closable) {
            keyMap = me.getKeyMap();
            keyMap.on(27, me.onEsc, me);
        } else {
            keyMap = me.keyMap;
        }
        if (keyMap && me.hidden) {
            keyMap.disable();
        }
    },

    /**
     * @private
     * Override Component.initDraggable.
     * Window uses the header element as the delegate.
     */
    initDraggable: function() {
        var me = this,
            ddConfig;

        if (!me.header) {
            me.updateHeader(true);
        }

        /*
         * Check the header here again. If for whatever reason it wasn't created in
         * updateHeader (we were configured with header: false) then we'll just ignore the rest since the
         * header acts as the drag handle.
         */
        if (me.header) {
            ddConfig = Ext.applyIf({
                el: me.el,
                delegate: '#' + Ext.escapeId(me.header.id)
            }, me.draggable);

            // Add extra configs if Window is specified to be constrained
            if (me.constrain || me.constrainHeader) {
                ddConfig.constrain = me.constrain;
                ddConfig.constrainDelegate = me.constrainHeader;
                ddConfig.constrainTo = me.constrainTo || me.container;
            }

            /**
             * @property {Ext.util.ComponentDragger} dd
             * If this Window is configured {@link #cfg-draggable}, this property will contain an instance of
             * {@link Ext.util.ComponentDragger} (A subclass of {@link Ext.dd.DragTracker DragTracker}) which handles dragging
             * the Window's DOM Element, and constraining according to the {@link #constrain} and {@link #constrainHeader} .
             *
             * This has implementations of `onBeforeStart`, `onDrag` and `onEnd` which perform the dragging action. If
             * extra logic is needed at these points, use {@link Ext.Function#createInterceptor createInterceptor} or
             * {@link Ext.Function#createSequence createSequence} to augment the existing implementations.
             */
            me.dd = new Ext.util.ComponentDragger(this, ddConfig);
            me.relayEvents(me.dd, ['dragstart', 'drag', 'dragend']);
        }
    },

    // private
    onEsc: function(k, e) {
        // Only process ESC if the FocusManager is not doing it
        if (!Ext.FocusManager || !Ext.FocusManager.enabled || Ext.FocusManager.focusedCmp === this) {
            e.stopEvent();
            this.close();
        }
    },

    // private
    beforeDestroy: function() {
        var me = this;
        if (me.rendered) {
            delete this.animateTarget;
            me.hide();
            Ext.destroy(
                me.keyMap
            );
        }
        me.callParent();
    },

    /**
     * @private
     * Contribute class-specific tools to the header.
     * Called by Panel's initTools.
     */
    addTools: function() {
        var me = this;

        // Call Panel's initTools
        me.callParent();

        if (me.minimizable) {
            me.addTool({
                type: 'minimize',
                handler: Ext.Function.bind(me.minimize, me, [])
            });
        }
        if (me.maximizable) {
            me.addTool({
                type: 'maximize',
                handler: Ext.Function.bind(me.maximize, me, [])
            });
            me.addTool({
                type: 'restore',
                handler: Ext.Function.bind(me.restore, me, []),
                hidden: true
            });
        }
    },

    /**
     * @private
     * Returns the focus holder element associated with this Window. By default, this is the Window's element.
     * @returns {Ext.Element/Ext.Component} the focus holding element or Component.
     */
    getFocusEl: function() {
        return this.getDefaultFocus();
    },

    /**
     * Gets the configured default focus item.  If a {@link #defaultFocus} is set, it will
     * receive focus when the Window's <code>focus</code> method is called, otherwise the
     * Window itself will receive focus.
     */
    getDefaultFocus: function() {
        var me = this,
            result,
            defaultComp = me.defaultButton || me.defaultFocus,
            selector;

        if (defaultComp !== undefined) {
            // Number is index of Button
            if (Ext.isNumber(defaultComp)) {
                result = me.query('button')[defaultComp];
            }
            // String is ID or CQ selector
            else if (Ext.isString(defaultComp)) {
                selector = defaultComp;
                
                // Try id/itemId match if selector begins with alphanumeric
                if (selector.match(me.initialAlphaNum)) {
                    result = me.down('#' + selector);
                }
                // If not found, use as selector
                if (!result) {
                    result = me.down(selector);
                }
            }
            // Otherwise, if it's got a focus method, use it
            else if (defaultComp.focus) {
                result = defaultComp;
            }
        }
        return result || me.el;
    },

    /**
     * @private
     * Called when a Component's focusEl receives focus.
     * If there is a valid default focus Component to jump to, focus that,
     * otherwise continue as usual, focus this Component.
     */
    onFocus: function() {
        var me = this,
            focusDescendant;

        // If the FocusManager is enabled, then we must noy jumpt to focus the default focus. We must focus the Window
        if ((Ext.FocusManager && Ext.FocusManager.enabled) || ((focusDescendant = me.getDefaultFocus()) === me)) {
            me.callParent(arguments);
        } else {
            focusDescendant.focus();
        }
    },

    beforeLayout: function () {
        var shadow = this.el.shadow;

        this.callParent();
        if (shadow) {
            shadow.hide();
        }
    },

    onShow: function() {
        var me = this;

        me.callParent(arguments);
        if (me.expandOnShow) {
            me.expand(false);
        }
        me.syncMonitorWindowResize();

        if (me.keyMap) {
            me.keyMap.enable();
        }
   },

    // private
    doClose: function() {
        var me = this;

        // Being called as callback after going through the hide call below
        if (me.hidden) {
            me.fireEvent('close', me);
            if (me.closeAction == 'destroy') {
                this.destroy();
            }
        } else {
            // close after hiding
            me.hide(me.animateTarget, me.doClose, me);
        }
    },

    // private
    afterHide: function() {
        var me = this;

        // No longer subscribe to resizing now that we're hidden
        me.syncMonitorWindowResize();

        // Turn off keyboard handling once window is hidden
        if (me.keyMap) {
            me.keyMap.disable();
        }

        // Perform superclass's afterHide tasks.
        me.callParent(arguments);
    },

    // private
    onWindowResize: function() {
        var me = this,
            sizeModel;

        if (me.maximized) {
            me.fitContainer();
        } else {
            sizeModel = me.getSizeModel();
            if (sizeModel.width.natural || sizeModel.height.natural) {
                me.updateLayout();
            }
        }

        me.doConstrain();
    },

    /**
     * Placeholder method for minimizing the window. By default, this method simply fires the {@link #event-minimize} event
     * since the behavior of minimizing a window is application-specific. To implement custom minimize behavior, either
     * the minimize event can be handled or this method can be overridden.
     * @return {Ext.window.Window} this
     */
    minimize: function() {
        this.fireEvent('minimize', this);
        return this;
    },

    afterCollapse: function() {
        var me = this;

        if (me.maximizable) {
            me.tools.maximize.hide();
            me.tools.restore.hide();
        }
        if (me.resizer) {
            me.resizer.disable();
        }
        me.callParent(arguments);
    },

    afterExpand: function() {
        var me = this;

        if (me.maximized) {
            me.tools.restore.show();
        } else if (me.maximizable) {
            me.tools.maximize.show();
        }
        if (me.resizer) {
            me.resizer.enable();
        }
        me.callParent(arguments);
    },

    /**
     * Fits the window within its current container and automatically replaces the {@link #maximizable 'maximize' tool
     * button} with the 'restore' tool button. Also see {@link #toggleMaximize}.
     * @return {Ext.window.Window} this
     */
    maximize: function() {
        var me = this;

        if (!me.maximized) {
            me.expand(false);
            if (!me.hasSavedRestore) {
                me.restoreSize = me.getSize();
                me.restorePos = me.getPosition(true);
            }
            if (me.maximizable) {
                me.tools.maximize.hide();
                me.tools.restore.show();
            }
            me.maximized = true;
            me.el.disableShadow();

            if (me.dd) {
                me.dd.disable();
            }
            if (me.resizer) {
                me.resizer.disable();
            }
            if (me.collapseTool) {
                me.collapseTool.hide();
            }
            me.el.addCls(Ext.baseCSSPrefix + 'window-maximized');
            me.container.addCls(Ext.baseCSSPrefix + 'window-maximized-ct');

            me.syncMonitorWindowResize();
            me.fitContainer();
            me.fireEvent('maximize', me);
        }
        return me;
    },

    /**
     * Restores a {@link #maximizable maximized} window back to its original size and position prior to being maximized
     * and also replaces the 'restore' tool button with the 'maximize' tool button. Also see {@link #toggleMaximize}.
     * @return {Ext.window.Window} this
     */
    restore: function() {
        var me = this,
            tools = me.tools;

        if (me.maximized) {
            delete me.hasSavedRestore;
            me.removeCls(Ext.baseCSSPrefix + 'window-maximized');

            // Toggle tool visibility
            if (tools.restore) {
                tools.restore.hide();
            }
            if (tools.maximize) {
                tools.maximize.show();
            }
            if (me.collapseTool) {
                me.collapseTool.show();
            }

            me.maximized = false;

            // Restore the position/sizing
            me.setPosition(me.restorePos);
            me.setSize(me.restoreSize);

            // Unset old position/sizing
            delete me.restorePos;
            delete me.restoreSize;

            me.el.enableShadow(true);

            // Allow users to drag and drop again
            if (me.dd) {
                me.dd.enable();
            }
            
            if (me.resizer) {
                me.resizer.enable();
            }

            me.container.removeCls(Ext.baseCSSPrefix + 'window-maximized-ct');

            me.syncMonitorWindowResize();
            me.doConstrain();
            me.fireEvent('restore', me);
        }
        return me;
    },

    /**
     * Synchronizes the presence of our listener for window resize events. This method
     * should be called whenever this status might change.
     * @private
     */
    syncMonitorWindowResize: function () {
        var me = this,
            currentlyMonitoring = me._monitoringResize,
            // all the states where we should be listening to window resize:
            yes = me.monitorResize || me.constrain || me.constrainHeader || me.maximized,
            // all the states where we veto this:
            veto = me.hidden || me.destroying || me.isDestroyed;

        if (yes && !veto) {
            // we should be listening...
            if (!currentlyMonitoring) {
                // but we aren't, so set it up
                Ext.EventManager.onWindowResize(me.onWindowResize, me);
                me._monitoringResize = true;
            }
        } else if (currentlyMonitoring) {
            // we should not be listening, but we are, so tear it down
            Ext.EventManager.removeResizeListener(me.onWindowResize, me);
            me._monitoringResize = false;
        }
    },

    /**
     * A shortcut method for toggling between {@link #method-maximize} and {@link #method-restore} based on the current maximized
     * state of the window.
     * @return {Ext.window.Window} this
     */
    toggleMaximize: function() {
        return this[this.maximized ? 'restore': 'maximize']();
    }

});

/**
 * Utility class for generating different styles of message boxes.  The singleton instance, Ext.MessageBox
 * alias `Ext.Msg` can also be used.
 *
 * Note that a MessageBox is asynchronous.  Unlike a regular JavaScript `alert` (which will halt
 * browser execution), showing a MessageBox will not cause the code to stop.  For this reason, if you have code
 * that should only run *after* some user feedback from the MessageBox, you must use a callback function
 * (see the `function` parameter for {@link #method-show} for more details).
 *
 * Basic alert
 *
 *     @example
 *     Ext.Msg.alert('Status', 'Changes saved successfully.');
 *
 * Prompt for user data and process the result using a callback
 *
 *     @example
 *     Ext.Msg.prompt('Name', 'Please enter your name:', function(btn, text){
 *         if (btn == 'ok'){
 *             // process text value and close...
 *         }
 *     });
 *
 * Show a dialog using config options
 *
 *     @example
 *     Ext.Msg.show({
 *          title:'Save Changes?',
 *          msg: 'You are closing a tab that has unsaved changes. Would you like to save your changes?',
 *          buttons: Ext.Msg.YESNOCANCEL,
 *          icon: Ext.Msg.QUESTION
 *     });
 */
Ext.define('Ext.window.MessageBox', {
    extend: 'Ext.window.Window',

    requires: [
        'Ext.toolbar.Toolbar',
        'Ext.form.field.Text',
        'Ext.form.field.TextArea',
        'Ext.form.field.Display',
        'Ext.button.Button',
        'Ext.layout.container.Anchor',
        'Ext.layout.container.HBox',
        'Ext.ProgressBar'
    ],

    alias: 'widget.messagebox',

    /**
     * @property
     * Button config that displays a single OK button
     */
    OK : 1,
    /**
     * @property
     * Button config that displays a single Yes button
     */
    YES : 2,
    /**
     * @property
     * Button config that displays a single No button
     */
    NO : 4,
    /**
     * @property
     * Button config that displays a single Cancel button
     */
    CANCEL : 8,
    /**
     * @property
     * Button config that displays OK and Cancel buttons
     */
    OKCANCEL : 9,
    /**
     * @property
     * Button config that displays Yes and No buttons
     */
    YESNO : 6,
    /**
     * @property
     * Button config that displays Yes, No and Cancel buttons
     */
    YESNOCANCEL : 14,
    /**
     * @property
     * The CSS class that provides the INFO icon image
     */
    INFO : Ext.baseCSSPrefix + 'message-box-info',
    /**
     * @property
     * The CSS class that provides the WARNING icon image
     */
    WARNING : Ext.baseCSSPrefix + 'message-box-warning',
    /**
     * @property
     * The CSS class that provides the QUESTION icon image
     */
    QUESTION : Ext.baseCSSPrefix + 'message-box-question',
    /**
     * @property
     * The CSS class that provides the ERROR icon image
     */
    ERROR : Ext.baseCSSPrefix + 'message-box-error',

    // hide it by offsets. Windows are hidden on render by default.
    hideMode: 'offsets',
    closeAction: 'hide',
    resizable: false,
    title: '&#160;',

    width: 600,
    height: 500,
    minWidth: 250,
    maxWidth: 600,
    minHeight: 110,
    maxHeight: 500,
    constrain: true,

    cls: Ext.baseCSSPrefix + 'message-box',

    layout: {
        type: 'vbox',
        align: 'stretch'
    },

    /**
     * @property
     * The default height in pixels of the message box's multiline textarea if displayed.
     */
    defaultTextHeight : 75,
    /**
     * @property
     * The minimum width in pixels of the message box if it is a progress-style dialog.  This is useful
     * for setting a different minimum width than text-only dialogs may need.
     */
    minProgressWidth : 250,
    /**
     * @property
     * The minimum width in pixels of the message box if it is a prompt dialog.  This is useful
     * for setting a different minimum width than text-only dialogs may need.
     */
    minPromptWidth: 250,
    //<locale type="object">
    /**
     * @property
     * An object containing the default button text strings that can be overriden for localized language support.
     * Supported properties are: ok, cancel, yes and no.  Generally you should include a locale-specific
     * resource file for handling language support across the framework.
     * Customize the default text like so:
     *
     *     Ext.window.MessageBox.buttonText.yes = "oui"; //french
     */
    buttonText: {
        ok: 'OK',
        yes: 'Yes',
        no: 'No',
        cancel: 'Cancel'
    },
    //</locale>

    buttonIds: [
        'ok', 'yes', 'no', 'cancel'
    ],

    //<locale type="object">
    titleText: {
        confirm: 'Confirm',
        prompt: 'Prompt',
        wait: 'Loading...',
        alert: 'Attention'
    },
    //</locale>

    iconHeight: 35,

    makeButton: function(btnIdx) {
        var btnId = this.buttonIds[btnIdx];
        return new Ext.button.Button({
            handler: this.btnCallback,
            itemId: btnId,
            scope: this,
            text: this.buttonText[btnId],
            minWidth: 75
        });
    },

    btnCallback: function(btn) {
        var me = this,
            value,
            field;

        if (me.cfg.prompt || me.cfg.multiline) {
            if (me.cfg.multiline) {
                field = me.textArea;
            } else {
                field = me.textField;
            }
            value = field.getValue();
            field.reset();
        }

        // Important not to have focus remain in the hidden Window; Interferes with DnD.
        btn.blur();
        me.hide();
        me.userCallback(btn.itemId, value, me.cfg);
    },

    hide: function() {
        var me = this;
        me.dd.endDrag();
        me.progressBar.reset();
        me.removeCls(me.cfg.cls);
        me.callParent(arguments);
    },

    initComponent: function() {
        var me = this,
            baseId = me.id,
            i, button,
            tbLayout;

        me.title = '&#160;';

        me.topContainer = new Ext.container.Container({
            layout: 'hbox',
            style: {
                padding: '10px',
                overflow: 'hidden'
            },
            items: [
                me.iconComponent = new Ext.Component({
                    cls: me.baseCls + '-icon',
                    width: 50,
                    height: me.iconHeight
                }),
                me.promptContainer = new Ext.container.Container({
                    flex: 1,
                    layout: {
                        type: 'anchor'
                    },
                    items: [
                        me.msg = new Ext.form.field.Display({
                            id: baseId + '-displayfield',
                            cls: me.baseCls + '-text'
                        }),
                        me.textField = new Ext.form.field.Text({
                            id: baseId + '-testfield',
                            anchor: '100%',
                            enableKeyEvents: true,
                            listeners: {
                                keydown: me.onPromptKey,
                                scope: me
                            }
                        }),
                        me.textArea = new Ext.form.field.TextArea({
                            id: baseId + '-textarea',
                            anchor: '100%',
                            height: 75
                        })
                    ]
                })
            ]
        });
        me.progressBar = new Ext.ProgressBar({
            id: baseId + '-progressbar',
            margins: '0 10 0 10'
        });

        me.items = [me.topContainer, me.progressBar];

        // Create the buttons based upon passed bitwise config
        me.msgButtons = [];
        for (i = 0; i < 4; i++) {
            button = me.makeButton(i);
            me.msgButtons[button.itemId] = button;
            me.msgButtons.push(button);
        }
        me.bottomTb = new Ext.toolbar.Toolbar({
            id: baseId + '-toolbar',
            ui: 'footer',
            dock: 'bottom',
            layout: {
                pack: 'center'
            },
            items: [
                me.msgButtons[0],
                me.msgButtons[1],
                me.msgButtons[2],
                me.msgButtons[3]
            ]
        });
        me.dockedItems = [me.bottomTb];

        // Get control at Toolbar's finishedLayout call and snag the contentWidth to contribute to our auto width calculation
        tbLayout = me.bottomTb.getLayout();
        tbLayout.finishedLayout = Ext.Function.createInterceptor(tbLayout.finishedLayout, function(ownerContext) {
            me.tbWidth = ownerContext.getProp('contentWidth');
        });
        me.on('close', me.onClose, me);

        me.callParent();
    },
    
    onClose: function(){
        var btn = this.header.child('[type=close]');
        // Give a temporary itemId so it can act like the cancel button
        btn.itemId = 'cancel';
        this.btnCallback(btn);
        delete btn.itemId;
    },

    onPromptKey: function(textField, e) {
        var me = this,
            blur;

        if (e.keyCode === Ext.EventObject.RETURN || e.keyCode === 10) {
            if (me.msgButtons.ok.isVisible()) {
                blur = true;
                me.msgButtons.ok.handler.call(me, me.msgButtons.ok);
            } else if (me.msgButtons.yes.isVisible()) {
                me.msgButtons.yes.handler.call(me, me.msgButtons.yes);
                blur = true;
            }

            if (blur) {
                me.textField.blur();
            }
        }
    },

    reconfigure: function(cfg) {
        var me = this,
            buttons = 0,
            hideToolbar = true,
            initialWidth = me.maxWidth,
            oldButtonText = me.buttonText,
            i;

        // Restore default buttonText before reconfiguring.
        me.updateButtonText();

        cfg = cfg || {};
        me.cfg = cfg;
        if (cfg.width) {
            initialWidth = cfg.width;
        }

        // Default to allowing the Window to take focus.
        delete me.defaultFocus;

        // clear any old animateTarget
        me.animateTarget = cfg.animateTarget || undefined;

        // Defaults to modal
        me.modal = cfg.modal !== false;

        // Show the title
        if (cfg.title) {
            me.setTitle(cfg.title||'&#160;');
        }

        // Extract button configs
        if (Ext.isObject(cfg.buttons)) {
            me.buttonText = cfg.buttons;
            buttons = 0;
        } else {
            me.buttonText = cfg.buttonText || me.buttonText;
            buttons = Ext.isNumber(cfg.buttons) ? cfg.buttons : 0;
        }

        // Apply custom-configured buttonText
        // Infer additional buttons from the specified property names in the buttonText object
        buttons = buttons | me.updateButtonText();

        // Restore buttonText. Next run of reconfigure will restore to prototype's buttonText
        me.buttonText = oldButtonText;

        // During the on render, or size resetting layouts, and in subsequent hiding and showing, we need to
        // suspend layouts, and flush at the end when the Window's children are at their final visibility.
        Ext.suspendLayouts();
        me.hidden = false;
        if (!me.rendered) {
            me.width = initialWidth;
            me.render(Ext.getBody());
        } else {
            me.setSize(initialWidth, me.maxHeight);
        }

        // Hide or show the close tool
        me.closable = cfg.closable && !cfg.wait;
        me.header.child('[type=close]').setVisible(cfg.closable !== false);

        // Hide or show the header
        if (!cfg.title && !me.closable) {
            me.header.hide();
        } else {
            me.header.show();
        }

        // Default to dynamic drag: drag the window, not a ghost
        me.liveDrag = !cfg.proxyDrag;

        // wrap the user callback
        me.userCallback = Ext.Function.bind(cfg.callback ||cfg.fn || Ext.emptyFn, cfg.scope || Ext.global);

        // Hide or show the icon Component
        me.setIcon(cfg.icon);

        // Hide or show the message area
        if (cfg.msg) {
            me.msg.setValue(cfg.msg);
            me.msg.show();
        } else {
            me.msg.hide();
        }

        // flush the layout here to pick up
        // height adjustments on the msg field
        Ext.resumeLayouts(true);
        Ext.suspendLayouts();

        // Hide or show the input field
        if (cfg.prompt || cfg.multiline) {
            me.multiline = cfg.multiline;
            if (cfg.multiline) {
                me.textArea.setValue(cfg.value);
                me.textArea.setHeight(cfg.defaultTextHeight || me.defaultTextHeight);
                me.textArea.show();
                me.textField.hide();
                me.defaultFocus = me.textArea;
            } else {
                me.textField.setValue(cfg.value);
                me.textArea.hide();
                me.textField.show();
                me.defaultFocus = me.textField;
            }
        } else {
            me.textArea.hide();
            me.textField.hide();
        }

        // Hide or show the progress bar
        if (cfg.progress || cfg.wait) {
            me.progressBar.show();
            me.updateProgress(0, cfg.progressText);
            if(cfg.wait === true){
                me.progressBar.wait(cfg.waitConfig);
            }
        } else {
            me.progressBar.hide();
        }

        // Hide or show buttons depending on flag value sent.
        for (i = 0; i < 4; i++) {
            if (buttons & Math.pow(2, i)) {

                // Default to focus on the first visible button if focus not already set
                if (!me.defaultFocus) {
                    me.defaultFocus = me.msgButtons[i];
                }
                me.msgButtons[i].show();
                hideToolbar = false;
            } else {
                me.msgButtons[i].hide();
            }
        }

        // Hide toolbar if no buttons to show
        if (hideToolbar) {
            me.bottomTb.hide();
        } else {
            me.bottomTb.show();
        }
        Ext.resumeLayouts(true);
    },

    /**
     * @private
     * Set button text according to current buttonText property object
     * @return {Number} The buttons bitwise flag based upon the button IDs specified in the buttonText property.
     */
    updateButtonText: function() {
        var me = this,
            buttonText = me.buttonText,
            buttons = 0,
            btnId,
            btn;

        for (btnId in buttonText) {
            if (buttonText.hasOwnProperty(btnId)) {
                btn = me.msgButtons[btnId];
                if (btn) {
                    if (me.cfg && me.cfg.buttonText) {
                        buttons = buttons | Math.pow(2, Ext.Array.indexOf(me.buttonIds, btnId));
                    }
                    if (btn.text != buttonText[btnId]) {
                        btn.setText(buttonText[btnId]);
                    }
                }
            }
        }
        return buttons;
    },

    /**
     * Displays a new message box, or reinitializes an existing message box, based on the config options passed in. All
     * display functions (e.g. prompt, alert, etc.) on MessageBox call this function internally, although those calls
     * are basic shortcuts and do not support all of the config options allowed here.
     *
     * Example usage:
     *
     *     Ext.Msg.show({
     *         title: 'Address',
     *         msg: 'Please enter your address:',
     *         width: 300,
     *         buttons: Ext.Msg.OKCANCEL,
     *         multiline: true,
     *         fn: saveAddress,
     *         animateTarget: 'addAddressBtn',
     *         icon: Ext.window.MessageBox.INFO
     *     });
     *
     * @param {Object} config The following config options are supported:
     *
     * @param {String/Ext.dom.Element} config.animateTarget
     * An id or Element from which the message box should animate as it opens and closes.
     *
     * @param {Number} [config.buttons=false]
     * A bitwise button specifier consisting of the sum of any of the following constants:
     *
     *  - Ext.MessageBox.OK
     *  - Ext.MessageBox.YES
     *  - Ext.MessageBox.NO
     *  - Ext.MessageBox.CANCEL
     *
     * Some common combinations have already been predefined:
     *
     *  - Ext.MessageBox.OKCANCEL
     *  - Ext.MessageBox.YESNO
     *  - Ext.MessageBox.YESNOCANCEL
     *
     * Or false to not show any buttons.
     *
     * This may also be specified as an object hash containing custom button text in the same format as the
     * {@link #buttonText} config. Button IDs present as property names will be made visible.
     *
     * @param {Boolean} config.closable
     * False to hide the top-right close button (defaults to true). Note that progress and wait dialogs will ignore this
     * property and always hide the close button as they can only be closed programmatically.
     *
     * @param {String} config.cls
     * A custom CSS class to apply to the message box's container element
     *
     * @param {Number} [config.defaultTextHeight=75]
     * The default height in pixels of the message box's multiline textarea if displayed.
     *
     * @param {Function} config.fn
     * A callback function which is called when the dialog is dismissed either by clicking on the configured buttons, or
     * on the dialog close button, or by pressing the return button to enter input.
     *
     * Progress and wait dialogs will ignore this option since they do not respond to user actions and can only be
     * closed programmatically, so any required function should be called by the same code after it closes the dialog.
     * Parameters passed:
     *
     *  @param {String} config.fn.buttonId The ID of the button pressed, one of:
     *
     * - ok
     * - yes
     * - no
     * - cancel
     *
     *  @param {String} config.fn.text Value of the input field if either `prompt` or `multiline` is true
     *  @param {Object} config.fn.opt The config object passed to show.
     *
     * @param {Object} config.buttonText
     * An object containing string properties which override the system-supplied button text values just for this
     * invocation. The property names are:
     *
     * - ok
     * - yes
     * - no
     * - cancel
     *
     * @param {Object} config.scope
     * The scope (`this` reference) in which the function will be executed.
     *
     * @param {String} config.icon
     * A CSS class that provides a background image to be used as the body icon for the dialog.
     * One can use a predefined icon class:
     *
     *  - Ext.MessageBox.INFO
     *  - Ext.MessageBox.WARNING
     *  - Ext.MessageBox.QUESTION
     *  - Ext.MessageBox.ERROR
     *
     * or use just any `'custom-class'`. Defaults to empty string.
     *
     * @param {String} config.iconCls
     * The standard {@link Ext.window.Window#iconCls} to add an optional header icon (defaults to '')
     *
     * @param {Number} config.maxWidth
     * The maximum width in pixels of the message box (defaults to 600)
     *
     * @param {Number} config.minWidth
     * The minimum width in pixels of the message box (defaults to 100)
     *
     * @param {Boolean} config.modal
     * False to allow user interaction with the page while the message box is displayed (defaults to true)
     *
     * @param {String} config.msg
     * A string that will replace the existing message box body text (defaults to the XHTML-compliant non-breaking space
     * character '&#160;')
     *
     * @param {Boolean} config.multiline
     * True to prompt the user to enter multi-line text (defaults to false)
     *
     * @param {Boolean} config.progress
     * True to display a progress bar (defaults to false)
     *
     * @param {String} config.progressText
     * The text to display inside the progress bar if progress = true (defaults to '')
     *
     * @param {Boolean} config.prompt
     * True to prompt the user to enter single-line text (defaults to false)
     *
     * @param {Boolean} config.proxyDrag
     * True to display a lightweight proxy while dragging (defaults to false)
     *
     * @param {String} config.title
     * The title text
     *
     * @param {String} config.value
     * The string value to set into the active textbox element if displayed
     *
     * @param {Boolean} config.wait
     * True to display a progress bar (defaults to false)
     *
     * @param {Object} config.waitConfig
     * A {@link Ext.ProgressBar#wait} config object (applies only if wait = true)
     *
     * @param {Number} config.width
     * The width of the dialog in pixels
     *
     * @return {Ext.window.MessageBox} this
     */
    show: function(cfg) {
        var me = this;

        me.reconfigure(cfg);
        me.addCls(cfg.cls);
        me.doAutoSize();

        // Set the flag, so that the parent show method performs the show procedure that we need.
        // ie: animation from animTarget, onShow processing and focusing.
        me.hidden = true;
        me.callParent();
        return me;
    },

    onShow: function() {
        this.callParent(arguments);
        this.center();
    },

    doAutoSize: function() {
        var me = this,
            headerVisible = me.header.rendered && me.header.isVisible(),
            footerVisible = me.bottomTb.rendered && me.bottomTb.isVisible(),
            width,
            height;

        if (!Ext.isDefined(me.frameWidth)) {
            me.frameWidth = me.el.getWidth() - me.body.getWidth();
        }

        // Allow per-invocation override of minWidth
        me.minWidth = me.cfg.minWidth || Ext.getClass(this).prototype.minWidth;

        // Width must be max of titleWidth, message+icon width, and total button width
        width = Math.max(
            headerVisible ? me.header.getMinWidth() : 0,                            // title width
            me.cfg.width || me.msg.getWidth() + me.iconComponent.getWidth() + 25,   // msg + icon width + topContainer's layout padding */
            (footerVisible ? me.tbWidth : 0)// total button width
        );

        height = (headerVisible ? me.header.getHeight() : 0) +
            me.topContainer.getHeight() +
            me.progressBar.getHeight() +
            (footerVisible ? me.bottomTb.getHeight() + me.bottomTb.el.getMargin('tb') : 0);

        me.setSize(width + me.frameWidth, height + me.frameWidth);
        return me;
    },

    updateText: function(text) {
        this.msg.setValue(text);
        return this.doAutoSize(true);
    },

    /**
     * Adds the specified icon to the dialog.  By default, the class 'x-messagebox-icon' is applied for default
     * styling, and the class passed in is expected to supply the background image url. Pass in empty string ('')
     * to clear any existing icon. This method must be called before the MessageBox is shown.
     * The following built-in icon classes are supported, but you can also pass in a custom class name:
     *
     *     Ext.window.MessageBox.INFO
     *     Ext.window.MessageBox.WARNING
     *     Ext.window.MessageBox.QUESTION
     *     Ext.window.MessageBox.ERROR
     *
     * @param {String} icon A CSS classname specifying the icon's background image url, or empty string to clear the icon
     * @return {Ext.window.MessageBox} this
     */
    setIcon : function(icon) {
        var me = this;
        me.iconComponent.removeCls(me.messageIconCls);
        if (icon) {
            me.iconComponent.show();
            me.iconComponent.addCls(Ext.baseCSSPrefix + 'dlg-icon');
            me.iconComponent.addCls(me.messageIconCls = icon);
        } else {
            me.iconComponent.removeCls(Ext.baseCSSPrefix + 'dlg-icon');
            me.iconComponent.hide();
        }
        return me;
    },

    /**
     * Updates a progress-style message box's text and progress bar. Only relevant on message boxes
     * initiated via {@link Ext.window.MessageBox#progress} or {@link Ext.window.MessageBox#wait},
     * or by calling {@link Ext.window.MessageBox#method-show} with progress: true.
     *
     * @param {Number} [value=0] Any number between 0 and 1 (e.g., .5)
     * @param {String} [progressText=''] The progress text to display inside the progress bar.
     * @param {String} [msg] The message box's body text is replaced with the specified string (defaults to undefined
     * so that any existing body text will not get overwritten by default unless a new value is passed in)
     * @return {Ext.window.MessageBox} this
     */
    updateProgress : function(value, progressText, msg){
        this.progressBar.updateProgress(value, progressText);
        if (msg){
            this.updateText(msg);
        }
        return this;
    },

    onEsc: function() {
        if (this.closable !== false) {
            this.callParent(arguments);
        }
    },

    /**
     * Displays a confirmation message box with Yes and No buttons (comparable to JavaScript's confirm).
     * If a callback function is passed it will be called after the user clicks either button,
     * and the id of the button that was clicked will be passed as the only parameter to the callback
     * (could also be the top-right close button, which will always report as "cancel").
     *
     * @param {String} title The title bar text
     * @param {String} msg The message box body text
     * @param {Function} [fn] The callback function invoked after the message box is closed.
     * See {@link #method-show} method for details.
     * @param {Object} [scope=window] The scope (`this` reference) in which the callback is executed.
     * @return {Ext.window.MessageBox} this
     */
    confirm: function(cfg, msg, fn, scope) {
        if (Ext.isString(cfg)) {
            cfg = {
                title: cfg,
                icon: this.QUESTION,
                msg: msg,
                buttons: this.YESNO,
                callback: fn,
                scope: scope
            };
        }
        return this.show(cfg);
    },

    /**
     * Displays a message box with OK and Cancel buttons prompting the user to enter some text (comparable to JavaScript's prompt).
     * The prompt can be a single-line or multi-line textbox.  If a callback function is passed it will be called after the user
     * clicks either button, and the id of the button that was clicked (could also be the top-right
     * close button, which will always report as "cancel") and the text that was entered will be passed as the two parameters to the callback.
     *
     * @param {String} title The title bar text
     * @param {String} msg The message box body text
     * @param {Function} [fn] The callback function invoked after the message box is closed.
     * See {@link #method-show} method for details.
     * @param {Object} [scope=window] The scope (`this` reference) in which the callback is executed.
     * @param {Boolean/Number} [multiline=false] True to create a multiline textbox using the defaultTextHeight
     * property, or the height in pixels to create the textbox/
     * @param {String} [value=''] Default value of the text input element
     * @return {Ext.window.MessageBox} this
     */
    prompt : function(cfg, msg, fn, scope, multiline, value){
        if (Ext.isString(cfg)) {
            cfg = {
                prompt: true,
                title: cfg,
                minWidth: this.minPromptWidth,
                msg: msg,
                buttons: this.OKCANCEL,
                callback: fn,
                scope: scope,
                multiline: multiline,
                value: value
            };
        }
        return this.show(cfg);
    },

    /**
     * Displays a message box with an infinitely auto-updating progress bar.  This can be used to block user
     * interaction while waiting for a long-running process to complete that does not have defined intervals.
     * You are responsible for closing the message box when the process is complete.
     *
     * @param {String} msg The message box body text
     * @param {String} [title] The title bar text
     * @param {Object} [config] A {@link Ext.ProgressBar#wait} config object
     * @return {Ext.window.MessageBox} this
     */
    wait : function(cfg, title, config){
        if (Ext.isString(cfg)) {
            cfg = {
                title : title,
                msg : cfg,
                closable: false,
                wait: true,
                modal: true,
                minWidth: this.minProgressWidth,
                waitConfig: config
            };
        }
        return this.show(cfg);
    },

    /**
     * Displays a standard read-only message box with an OK button (comparable to the basic JavaScript alert prompt).
     * If a callback function is passed it will be called after the user clicks the button, and the
     * id of the button that was clicked will be passed as the only parameter to the callback
     * (could also be the top-right close button, which will always report as "cancel").
     *
     * @param {String} title The title bar text
     * @param {String} msg The message box body text
     * @param {Function} [fn] The callback function invoked after the message box is closed.
     * See {@link #method-show} method for details.
     * @param {Object} [scope=window] The scope (<code>this</code> reference) in which the callback is executed.
     * @return {Ext.window.MessageBox} this
     */
    alert: function(cfg, msg, fn, scope) {
        if (Ext.isString(cfg)) {
            cfg = {
                title : cfg,
                msg : msg,
                buttons: this.OK,
                fn: fn,
                scope : scope,
                minWidth: this.minWidth
            };
        }
        return this.show(cfg);
    },

    /**
     * Displays a message box with a progress bar.
     *
     * You are responsible for updating the progress bar as needed via {@link Ext.window.MessageBox#updateProgress}
     * and closing the message box when the process is complete.
     *
     * @param {String} title The title bar text
     * @param {String} msg The message box body text
     * @param {String} [progressText=''] The text to display inside the progress bar
     * @return {Ext.window.MessageBox} this
     */
    progress : function(cfg, msg, progressText){
        if (Ext.isString(cfg)) {
            cfg = {
                title: cfg,
                msg: msg,
                progress: true,
                progressText: progressText
            };
        }
        return this.show(cfg);
    }
}, function() {
    /**
     * @class Ext.MessageBox
     * @alternateClassName Ext.Msg
     * @extends Ext.window.MessageBox
     * @singleton
     * Singleton instance of {@link Ext.window.MessageBox}.
     */
    Ext.MessageBox = Ext.Msg = new this();
});