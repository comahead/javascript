
/**
 * DD implementation for Panels.
 * @private
 */
Ext.define('Ext.panel.DD', {
    extend: 'Ext.dd.DragSource',
    requires: ['Ext.panel.Proxy'],

    constructor : function(panel, cfg){
        var me = this;
        
        me.panel = panel;
        me.dragData = {panel: panel};
        me.panelProxy = new Ext.panel.Proxy(panel, cfg);
        me.proxy = me.panelProxy.proxy;

        me.callParent([panel.el, cfg]);
        me.setupEl(panel);
    },
    
    setupEl: function(panel){
        var me = this,
            header = panel.header,
            el = panel.body;
            
        if (header) {
            me.setHandleElId(header.id);
            el = header.el;
        }
        if (el) {
            el.setStyle('cursor', 'move');
            me.scroll = false;
        } else {
            // boxready fires after first layout, so we'll definitely be rendered
            panel.on('boxready', me.setupEl, me, {single: true});
        }
    },

    showFrame: Ext.emptyFn,
    startDrag: Ext.emptyFn,
    
    b4StartDrag: function(x, y) {
        this.panelProxy.show();
    },
    
    b4MouseDown: function(e) {
        var x = e.getPageX(),
            y = e.getPageY();
            
        this.autoOffset(x, y);
    },
    
    onInitDrag : function(x, y){
        this.onStartDrag(x, y);
        return true;
    },
    
    createFrame : Ext.emptyFn,
    
    getDragEl : function(e){
        return this.panelProxy.ghost.el.dom;
    },
    
    endDrag : function(e){
        this.panelProxy.hide();
        this.panel.saveState();
    },

    autoOffset : function(x, y) {
        x -= this.startPageX;
        y -= this.startPageY;
        this.setDelta(x, y);
    },
    
    // Override this, we don't want to repair on an "invalid" drop, the panel
    // should main it's position
    onInvalidDrop: function(target, e, id) {
        var me = this;
        
        me.beforeInvalidDrop(target, e, id);
        if (me.cachedTarget) {
            if(me.cachedTarget.isNotifyTarget){
                me.cachedTarget.notifyOut(me, e, me.dragData);
            }
            me.cacheTarget = null;
        }

        if (me.afterInvalidDrop) {
            /**
             * An empty function by default, but provided so that you can perform a custom action
             * after an invalid drop has occurred by providing an implementation.
             * @param {Event} e The event object
             * @param {String} id The id of the dropped element
             * @method afterInvalidDrop
             */
            me.afterInvalidDrop(e, id);
        }
    }
});
/**
 * Simple header class which is used for on {@link Ext.panel.Panel} and {@link Ext.window.Window}.
 */
Ext.define('Ext.panel.Header', {
    extend: 'Ext.container.Container',
    uses: ['Ext.panel.Tool', 'Ext.draw.Component', 'Ext.util.CSS', 'Ext.layout.component.Body', 'Ext.Img'],
    alias: 'widget.header',

    /**
     * @property {Boolean} isHeader
     * `true` in this class to identify an objact as an instantiated Header, or subclass thereof.
     */
    isHeader       : true,
    defaultType    : 'tool',
    indicateDrag   : false,
    weight         : -1,
    componentLayout: 'body',

    /**
     * @cfg {String} [titleAlign='left']
     * May be `"left"`, `"right"` or `"center"`.
     *
     * The alignment of the title text within the available space between the icon and the tools.
     */
    titleAlign: 'left',

    childEls: [
        'body'
    ],

    renderTpl: [
        '<div id="{id}-body" class="{baseCls}-body {bodyCls}',
        '<tpl for="uiCls"> {parent.baseCls}-body-{parent.ui}-{.}</tpl>"',
        '<tpl if="bodyStyle"> style="{bodyStyle}"</tpl>>',
            '{%this.renderContainer(out,values)%}',
        '</div>'
    ],

    headingTpl: '<span id="{id}-textEl" class="{cls}-text {cls}-text-{ui}">{title}</span>',

    shrinkWrap: 3,

    /**
     * @cfg {String} title
     * The title text to display.
     */

    /**
     * @cfg {String} iconCls
     * CSS class for an icon in the header. Used for displaying an icon to the left of a title.
     */
    
    /**
     * @cfg {String} icon
     * Path to image for an icon in the header. Used for displaying an icon to the left of a title.
     */

    initComponent: function() {
        var me = this,
            ruleStyle,
            rule,
            style,
            ui,
            tempEl;
            
        me.addEvents(
            /**
             * @event click
             * Fires when the header is clicked. This event will not be fired 
             * if the click was on a {@link Ext.panel.Tool}
             * @param {Ext.panel.Header} this
             * @param {Ext.EventObject} e
             */
            'click',
            
            /**
             * @event dblclick
             * Fires when the header is double clicked. This event will not 
             * be fired if the click was on a {@link Ext.panel.Tool}
             * @param {Ext.panel.Header} this
             * @param {Ext.EventObject} e
             */
            'dblclick'
        );

        me.indicateDragCls = me.baseCls + '-draggable';
        me.title = me.title || '&#160;';
        me.tools = me.tools || [];
        me.items = me.items || [];
        me.orientation = me.orientation || 'horizontal';
        me.dock = (me.dock) ? me.dock : (me.orientation == 'horizontal') ? 'top' : 'left';

        //add the dock as a ui
        //this is so we support top/right/left/bottom headers
        me.addClsWithUI([me.orientation, me.dock]);

        if (me.indicateDrag) {
            me.addCls(me.indicateDragCls);
        }

        // Add Icon
        if (!Ext.isEmpty(me.iconCls) || !Ext.isEmpty(me.icon)) {
            me.initIconCmp();
            me.items.push(me.iconCmp);
        }

        // Add Title
        if (me.orientation == 'vertical') {
            me.layout = {
                type : 'vbox',
                align: 'center'
            };
            me.textConfig = {
                width: 16,
                cls: me.baseCls + '-text',
                type: 'text',
                text: me.title,
                rotate: {
                    degrees: 90
                }
            };
            ui = me.ui;
            if (Ext.isArray(ui)) {
                ui = ui[0];
            }
            ruleStyle = '.' + me.baseCls + '-text-' + ui;
            if (Ext.scopeResetCSS) {
                ruleStyle = '.' + Ext.baseCSSPrefix + 'reset ' + ruleStyle;
            }
            rule = Ext.util.CSS.getRule(ruleStyle);

            // We might have been disallowed access to the stylesheet: https://sencha.jira.com/browse/EXTJSIV-5084
            if (rule) {
                style = rule.style;
            } else {
                style = (tempEl = Ext.resetElement.createChild({style: 'position:absolute', cls: me.baseCls + '-text-' + ui})).getStyles('fontFamily', 'fontWeight', 'fontSize', 'color');
                tempEl.remove();
            }
            if (style) {
                Ext.apply(me.textConfig, {
                    'font-family': style.fontFamily,
                    'font-weight': style.fontWeight,
                    'font-size': style.fontSize,
                    fill: style.color
                });
            }
            me.titleCmp = new Ext.draw.Component({
                width     : 16,
                ariaRole  : 'heading',
                focusable : false,
                viewBox   : false,
                flex      : 1,
                id        : me.id + '_hd',
                autoSize  : true,
                items     : me.textConfig,
                xhooks: {
                    setSize: function (width) {
                        // don't pass 2nd arg (height) on to setSize or we break 'flex:1'
                        this.callParent([width]);
                    }
                },
                // this is a bit of a cheat: we are not selecting an element of titleCmp
                // but rather of titleCmp.items[0]
                childEls  : [
                    { name: 'textEl', select: '.' + me.baseCls + '-text' }
                ]
            });
        } else {
            me.layout = {
                type : 'hbox',
                align: 'middle'
            };
            me.titleCmp = new Ext.Component({
                ariaRole  : 'heading',
                focusable : false,
                noWrap    : true,
                flex      : 1,
                id        : me.id + '_hd',
                style     : 'text-align:' + me.titleAlign,
                cls       : me.baseCls + '-text-container',
                renderTpl : me.getTpl('headingTpl'),
                renderData: {
                    title: me.title,
                    cls  : me.baseCls,
                    ui   : me.ui
                },
                childEls  : ['textEl']
            });
        }
        me.items.push(me.titleCmp);

        // Add Tools
        me.items = me.items.concat(me.tools);
        me.callParent();
        
        me.on({
            dblclick: me.onDblClick,
            click: me.onClick,
            element: 'el',
            scope: me
        });
    },

    initIconCmp: function() {
        var me = this,
            cfg = {
                focusable: false,
                src: Ext.BLANK_IMAGE_URL,
                cls: [me.baseCls + '-icon', me.iconCls],
                id: me.id + '-iconEl',
                iconCls: me.iconCls
            };
            
        if (!Ext.isEmpty(me.icon)) {
            delete cfg.iconCls;
            cfg.src = me.icon;
        }
        
        me.iconCmp = new Ext.Img(cfg);
    },

    afterRender: function() {
        this.el.unselectable();
        this.callParent();
    },

    // inherit docs
    addUIClsToElement: function(cls) {
        var me = this,
            result = me.callParent(arguments),
            classes = [me.baseCls + '-body-' + cls, me.baseCls + '-body-' + me.ui + '-' + cls],
            array, i;

        if (me.bodyCls) {
            array = me.bodyCls.split(' ');

            for (i = 0; i < classes.length; i++) {
                if (!Ext.Array.contains(array, classes[i])) {
                    array.push(classes[i]);
                }
            }

            me.bodyCls = array.join(' ');
        } else {
            me.bodyCls = classes.join(' ');
        }

        return result;
    },

    // inherit docs
    removeUIClsFromElement: function(cls) {
        var me = this,
            result = me.callParent(arguments),
            classes = [me.baseCls + '-body-' + cls, me.baseCls + '-body-' + me.ui + '-' + cls],
            array, i;

        if (me.bodyCls) {
            array = me.bodyCls.split(' ');

            for (i = 0; i < classes.length; i++) {
                Ext.Array.remove(array, classes[i]);
            }

            me.bodyCls = array.join(' ');
        }

        return result;
    },

    // inherit docs
    addUIToElement: function() {
        var me = this,
            array, cls;

        me.callParent(arguments);

        cls = me.baseCls + '-body-' + me.ui;
        if (me.rendered) {
            if (me.bodyCls) {
                me.body.addCls(me.bodyCls);
            } else {
                me.body.addCls(cls);
            }
        } else {
            if (me.bodyCls) {
                array = me.bodyCls.split(' ');

                if (!Ext.Array.contains(array, cls)) {
                    array.push(cls);
                }

                me.bodyCls = array.join(' ');
            } else {
                me.bodyCls = cls;
            }
        }

        if (me.titleCmp && me.titleCmp.rendered && me.titleCmp.textEl) {
            me.titleCmp.textEl.addCls(me.baseCls + '-text-' + me.ui);
        }
    },

    // inherit docs
    removeUIFromElement: function() {
        var me = this,
            array, cls;

        me.callParent(arguments);

        cls = me.baseCls + '-body-' + me.ui;
        if (me.rendered) {
            if (me.bodyCls) {
                me.body.removeCls(me.bodyCls);
            } else {
                me.body.removeCls(cls);
            }
        } else {
            if (me.bodyCls) {
                array = me.bodyCls.split(' ');
                Ext.Array.remove(array, cls);
                me.bodyCls = array.join(' ');
            } else {
                me.bodyCls = cls;
            }
        }

        if (me.titleCmp && me.titleCmp.rendered && me.titleCmp.textEl) {
            me.titleCmp.textEl.removeCls(me.baseCls + '-text-' + me.ui);
        }
    },

    onClick: function(e) {
        this.fireClickEvent('click', e);
    },
    
    onDblClick: function(e){
        this.fireClickEvent('dblclick', e);
    },
    
    fireClickEvent: function(type, e){
        var toolCls = '.' + Ext.panel.Tool.prototype.baseCls;
        if (!e.getTarget(toolCls)) {
            this.fireEvent(type, this, e);
        }    
    },

    getFocusEl: function() {
        return this.el;
    },

    getTargetEl: function() {
        return this.body || this.frameBody || this.el;
    },

    /**
     * Sets the title of the header.
     * @param {String} title The title to be set
     */
    setTitle: function(title) {
        var me = this,
            sprite,
            surface;
        if (me.rendered) {
            if (me.titleCmp.rendered) {
                if (me.titleCmp.surface) {
                    me.title = title || '';
                    sprite = me.titleCmp.surface.items.items[0];
                    surface = me.titleCmp.surface;

                    surface.remove(sprite);
                    me.textConfig.type = 'text';
                    me.textConfig.text = title;
                    sprite = surface.add(me.textConfig);
                    sprite.setAttributes({
                        rotate: {
                            degrees: 90
                        }
                    }, true);
                    me.titleCmp.autoSizeSurface();
                } else {
                    me.title = title;
                    me.titleCmp.textEl.update(me.title || '&#160;');
                }
                me.titleCmp.updateLayout();
            } else {
                me.titleCmp.on({
                    render: function() {
                        me.setTitle(title);
                    },
                    single: true
                });
            }
        } else {
            me.title = title;
        }
    },

    /**
     * @private
     * Used when shrink wrapping a Panel to either content width or header width.
     * This returns the minimum width required to display the header, icon and tools.
     * **This is only intended for use with horizontal headers.**
     */
    getMinWidth: function() {
        var me = this,
            textEl = me.titleCmp.textEl.dom,
            result,
            tools = me.tools,
            l, i;

        // Measure text width as inline element so it doesn't stretch
        textEl.style.display = 'inline';
        result = textEl.offsetWidth;
        textEl.style.display = '';

        // Add tools width
        if (tools && (l = tools.length)) {
            for (i = 0; i < l; i++) {
                if (tools[i].el) {
                    result += tools[i].el.dom.offsetWidth;
                }
            }
        }

        // Add iconWidth
        if (me.iconCmp) {
            result += me.iconCmp.el.dom.offsetWidth;
        }

        // Return with some space between title and tools/end of header.
        return result + 10;
    },

    /**
     * Sets the CSS class that provides the icon image for this header.  This method will replace any existing
     * icon class if one has already been set.
     * @param {String} cls The new CSS class name
     */
    setIconCls: function(cls) {
        var me = this,
            isEmpty = !cls || !cls.length,
            iconCmp = me.iconCmp;
        
        me.iconCls = cls;
        if (!me.iconCmp && !isEmpty) {
            me.initIconCmp();
            me.insert(0, me.iconCmp);
        } else if (iconCmp) {
            if (isEmpty) {
                me.iconCmp.destroy();
                delete me.iconCmp;
            } else {
                iconCmp.removeCls(iconCmp.iconCls);
                iconCmp.addCls(cls);
                iconCmp.iconCls = cls;
            }
        }
    },
    
    /**
     * Sets the image path that provides the icon image for this header.  This method will replace any existing
     * icon if one has already been set.
     * @param {String} icon The new icon path
     */
    setIcon: function(icon) {
        var me = this,
            isEmpty = !icon || !icon.length,
            iconCmp = me.iconCmp;
        
        me.icon = icon;
        if (!me.iconCmp && !isEmpty) {
            me.initIconCmp();
            me.insert(0, me.iconCmp);
        } else if (iconCmp) {
            if (isEmpty) {
                me.iconCmp.destroy();
                delete me.iconCmp;
            } else {
                iconCmp.setSrc(me.icon);
            }
        }
    },

    /**
     * Add a tool to the header
     * @param {Object} tool
     */
    addTool: function(tool) {
        this.tools.push(this.add(tool));
    },

    /**
     * @protected
     * Set up the `tools.<tool type>` link in the owning Panel.
     * Bind the tool to its owning Panel.
     * @param component
     * @param index
     */
    onAdd: function(component, index) {
        this.callParent(arguments);
        if (component instanceof Ext.panel.Tool) {
            component.bindTo(this.ownerCt);
            this.tools[component.type] = component;
        }
    },

    /**
     * Add bodyCls to the renderData object
     * @return {Object} Object with keys and values that are going to be applied to the renderTpl
     * @private
     */
    initRenderData: function() {
        return Ext.applyIf(this.callParent(), {
            bodyCls: this.bodyCls
        });
    }
});





/**
 * @class Ext.panel.AbstractPanel
 * @private
 *
 * A base class which provides methods common to Panel classes across the Sencha product range.
 *
 * Please refer to sub class's documentation
 */
Ext.define('Ext.panel.AbstractPanel', {

    /* Begin Definitions */

    extend: 'Ext.container.Container',

    mixins: {
        docking: 'Ext.container.DockingContainer'
    },

    requires: ['Ext.util.MixedCollection', 'Ext.Element', 'Ext.toolbar.Toolbar'],

    /* End Definitions */

    /**
     * @cfg {String} [baseCls=x-panel]
     * The base CSS class to apply to this panel's element.
     */
    baseCls : Ext.baseCSSPrefix + 'panel',

    /**
     * @cfg {Number/String} bodyPadding
     * A shortcut for setting a padding style on the body element. The value can either be
     * a number to be applied to all sides, or a normal css string describing padding.
     * Defaults to <code>undefined</code>.
     */

    /**
     * @cfg {Boolean} bodyBorder
     * A shortcut to add or remove the border on the body of a panel. This only applies to a panel which has the {@link #frame} configuration set to `true`.
     * Defaults to <code>undefined</code>.
     */

    /**
     * @cfg {String/Object/Function} bodyStyle
     * Custom CSS styles to be applied to the panel's body element, which can be supplied as a valid CSS style string,
     * an object containing style property name/value pairs or a function that returns such a string or object.
     * For example, these two formats are interpreted to be equivalent:<pre><code>
bodyStyle: 'background:#ffc; padding:10px;'

bodyStyle: {
    background: '#ffc',
    padding: '10px'
}
     * </code></pre>
     */

    /**
     * @cfg {String/String[]} bodyCls
     * A CSS class, space-delimited string of classes, or array of classes to be applied to the panel's body element.
     * The following examples are all valid:<pre><code>
bodyCls: 'foo'
bodyCls: 'foo bar'
bodyCls: ['foo', 'bar']
     * </code></pre>
     */

    /**
     * @property {Boolean} isPanel
     * `true` in this class to identify an object as an instantiated Panel, or subclass thereof.
     */
    isPanel: true,

    componentLayout: 'dock',

    childEls: [
        'body'
    ],

    renderTpl: [
        // If this Panel is framed, the framing template renders the docked items round the frame
        '{% this.renderDockedItems(out,values,0); %}',
        // This empty div solves an IE6/7/Quirks problem where the margin-top on the bodyEl
        // is ignored. Best we can figure, this is triggered by the previousSibling being
        // position absolute (a docked item). The goal is to use margins to position the
        // bodyEl rather than left/top since that allows us to avoid writing a height on the
        // panel and the body. This in turn allows CSS height to expand or contract the
        // panel during things like portlet dragging where we want to avoid running a ton
        // of layouts during the drag operation.
        (Ext.isIE6 || Ext.isIE7 || Ext.isIEQuirks) ? '<div></div>' : '',
        '<div id="{id}-body" class="{baseCls}-body<tpl if="bodyCls"> {bodyCls}</tpl>',
            ' {baseCls}-body-{ui}<tpl if="uiCls">',
                '<tpl for="uiCls"> {parent.baseCls}-body-{parent.ui}-{.}</tpl>',
            '</tpl>"<tpl if="bodyStyle"> style="{bodyStyle}"</tpl>>',
            '{%this.renderContainer(out,values);%}',
        '</div>',
        '{% this.renderDockedItems(out,values,1); %}'
    ],

    bodyPosProps: {
        x: 'x',
        y: 'y'
    },

    // TODO: Move code examples into product-specific files. The code snippet below is Touch only.
    /**
     * @cfg {Object/Object[]} dockedItems
     * A component or series of components to be added as docked items to this panel.
     * The docked items can be docked to either the top, right, left or bottom of a panel.
     * This is typically used for things like toolbars or tab bars:
     * <pre><code>
var panel = new Ext.panel.Panel({
    fullscreen: true,
    dockedItems: [{
        xtype: 'toolbar',
        dock: 'top',
        items: [{
            text: 'Docked to the top'
        }]
    }]
});</code></pre>
     */

    border: true,

    /**
     * @private
     */
    emptyArray: [],

    initComponent : function() {
        var me = this;

        //!frame
        //!border

        if (me.frame && me.border && me.bodyBorder === undefined) {
            me.bodyBorder = false;
        }
        if (me.frame && me.border && (me.bodyBorder === false || me.bodyBorder === 0)) {
            me.manageBodyBorders = true;
        }

        me.callParent();
    },

    beforeDestroy: function(){
        this.destroyDockedItems();
        this.callParent();
    },

    // @private
    initItems : function() {
        this.callParent();
        this.initDockingItems();
    },

    /**
     * Initialized the renderData to be used when rendering the renderTpl.
     * @return {Object} Object with keys and values that are going to be applied to the renderTpl
     * @private
     */
    initRenderData: function() {
        var me = this,
            data = me.callParent();

        me.initBodyStyles();
        me.protoBody.writeTo(data);
        delete me.protoBody;

        return data;
    },

    /**
     * Attempts a default component lookup (see {@link Ext.container.Container#getComponent}). If the component is not found in the normal
     * items, the dockedItems are searched and the matched component (if any) returned (see {@link #getDockedComponent}). Note that docked
     * items will only be matched by component id or itemId -- if you pass a numeric index only non-docked child components will be searched.
     * @param {String/Number} comp The component id, itemId or position to find
     * @return {Ext.Component} The component (if found)
     */
    getComponent: function(comp) {
        var component = this.callParent(arguments);
        if (component === undefined && !Ext.isNumber(comp)) {
            // If the arg is a numeric index skip docked items
            component = this.getDockedComponent(comp);
        }
        return component;
    },

    getProtoBody: function () {
        var me = this,
            body = me.protoBody;

        if (!body) {
            me.protoBody = body = new Ext.util.ProtoElement({
                cls: me.bodyCls,
                style: me.bodyStyle,
                clsProp: 'bodyCls',
                styleProp: 'bodyStyle',
                styleIsText: true
            });
        }

        return body;
    },

    /**
     * Parses the {@link #bodyStyle} config if available to create a style string that will be applied to the body element.
     * This also includes {@link #bodyPadding} and {@link #bodyBorder} if available.
     * @return {String} A CSS style string with body styles, padding and border.
     * @private
     */
    initBodyStyles: function() {
        var me = this,
            body = me.getProtoBody(),
            Element = Ext.Element;

        if (me.bodyPadding !== undefined) {
            body.setStyle('padding', Element.unitizeBox((me.bodyPadding === true) ? 5 : me.bodyPadding));
        }
        if (me.frame && me.bodyBorder) {
            if (!Ext.isNumber(me.bodyBorder)) {
                me.bodyBorder = 1;
            }
            body.setStyle('border-width', Element.unitizeBox(me.bodyBorder));
        }
    },

    getCollapsedDockedItems: function () {
        var me = this;
        return me.collapseMode == 'placeholder' ? me.emptyArray : [ me.getReExpander() ];
    },

    /**
     * Sets the body style according to the passed parameters.
     * @param {Mixed} style A full style specification string, or object, or the name of a style property to set.
     * @param {String} value If the first param was a style property name, the style property value.
     * @return {Ext.panel.Panel} this
     */
    setBodyStyle: function(style, value) {
        var me = this,
            body = me.rendered ? me.body : me.getProtoBody();

        if (Ext.isFunction(style)) {
            style = style();
        }
        if (arguments.length == 1) {
            if (Ext.isString(style)) {
                style = Ext.Element.parseStyles(style);     
            }
            body.setStyle(style);
        } else {
            body.setStyle(style, value);
        }
        return me;
    },

    /**
     * Adds a CSS class to the body element. If not rendered, the class will
     * be added when the panel is rendered. 
     * @param {String} cls The class to add
     * @return {Ext.panel.Panel} this
     */
    addBodyCls: function(cls) {
        var me = this,
            body = me.rendered ? me.body : me.getProtoBody();

        body.addCls(cls);
        return me;
    },

    /**
     * Removes a CSS class from the body element.
     * @param {String} cls The class to remove
     * @return {Ext.panel.Panel} this
     */
    removeBodyCls: function(cls) {
        var me = this,
            body = me.rendered ? me.body : me.getProtoBody();

        body.removeCls(cls);
        return me;
    },

    // inherit docs
    addUIClsToElement: function(cls) {
        var me = this,
            result = me.callParent(arguments);

        me.addBodyCls([Ext.baseCSSPrefix + cls, me.baseCls + '-body-' + cls, me.baseCls + '-body-' + me.ui + '-' + cls]);
        return result;
    },

    // inherit docs
    removeUIClsFromElement: function(cls) {
        var me = this,
            result = me.callParent(arguments);

        me.removeBodyCls([Ext.baseCSSPrefix + cls, me.baseCls + '-body-' + cls, me.baseCls + '-body-' + me.ui + '-' + cls]);
        return result;
    },

    // inherit docs
    addUIToElement: function() {
        var me = this;

        me.callParent(arguments);
        me.addBodyCls(me.baseCls + '-body-' + me.ui);
    },

    // inherit docs
    removeUIFromElement: function() {
        var me = this;

        me.callParent(arguments);
        me.removeBodyCls(me.baseCls + '-body-' + me.ui);
    },

    // @private
    getTargetEl : function() {
        return this.body;
    },

    getRefItems: function(deep) {
        var items = this.callParent(arguments);

        return this.getDockingRefItems(deep, items);
    },

    setupRenderTpl: function (renderTpl) {
        this.callParent(arguments);
        this.setupDockingRenderTpl(renderTpl);
    }
});




/**
 * Panel is a container that has specific functionality and structural components that make it the perfect building
 * block for application-oriented user interfaces.
 *
 * Panels are, by virtue of their inheritance from {@link Ext.container.Container}, capable of being configured with a
 * {@link Ext.container.Container#layout layout}, and containing child Components.
 *
 * When either specifying child {@link #cfg-items} of a Panel, or dynamically {@link Ext.container.Container#method-add adding}
 * Components to a Panel, remember to consider how you wish the Panel to arrange those child elements, and whether those
 * child elements need to be sized using one of Ext's built-in `{@link Ext.container.Container#layout layout}`
 * schemes. By default, Panels use the {@link Ext.layout.container.Auto Auto} scheme. This simply renders child
 * components, appending them one after the other inside the Container, and **does not apply any sizing** at all.
 *
 * {@img Ext.panel.Panel/panel.png Panel components}
 *
 * A Panel may also contain {@link #bbar bottom} and {@link #tbar top} toolbars, along with separate {@link
 * Ext.panel.Header header}, {@link #fbar footer} and body sections.
 *
 * Panel also provides built-in {@link #collapsible collapsible, expandable} and {@link #closable} behavior. Panels can
 * be easily dropped into any {@link Ext.container.Container Container} or layout, and the layout and rendering pipeline
 * is {@link Ext.container.Container#method-add completely managed by the framework}.
 *
 * **Note:** By default, the `{@link #closable close}` header tool _destroys_ the Panel resulting in removal of the
 * Panel and the destruction of any descendant Components. This makes the Panel object, and all its descendants
 * **unusable**. To enable the close tool to simply _hide_ a Panel for later re-use, configure the Panel with
 * `{@link #closeAction closeAction}: 'hide'`.
 *
 * Usually, Panels are used as constituents within an application, in which case, they would be used as child items of
 * Containers, and would themselves use Ext.Components as child {@link #cfg-items}. However to illustrate simply rendering a
 * Panel into the document, here's how to do it:
 *
 *     @example
 *     Ext.create('Ext.panel.Panel', {
 *         title: 'Hello',
 *         width: 200,
 *         html: '<p>World!</p>',
 *         renderTo: Ext.getBody()
 *     });
 *
 * A more realistic scenario is a Panel created to house input fields which will not be rendered, but used as a
 * constituent part of a Container:
 *
 *     @example
 *     var filterPanel = Ext.create('Ext.panel.Panel', {
 *         bodyPadding: 5,  // Don't want content to crunch against the borders
 *         width: 300,
 *         title: 'Filters',
 *         items: [{
 *             xtype: 'datefield',
 *             fieldLabel: 'Start date'
 *         }, {
 *             xtype: 'datefield',
 *             fieldLabel: 'End date'
 *         }],
 *         renderTo: Ext.getBody()
 *     });
 *
 * Note that the Panel above is configured to render into the document and assigned a size. In a real world scenario,
 * the Panel will often be added inside a Container which will use a {@link #layout} to render, size and position its
 * child Components.
 *
 * Panels will often use specific {@link #layout}s to provide an application with shape and structure by containing and
 * arranging child Components:
 *
 *     @example
 *     var resultsPanel = Ext.create('Ext.panel.Panel', {
 *         title: 'Results',
 *         width: 600,
 *         height: 400,
 *         renderTo: Ext.getBody(),
 *         layout: {
 *             type: 'vbox',       // Arrange child items vertically
 *             align: 'stretch',    // Each takes up full width
 *             padding: 5
 *         },
 *         items: [{               // Results grid specified as a config object with an xtype of 'grid'
 *             xtype: 'grid',
 *             columns: [{header: 'Column One'}],            // One header just for show. There's no data,
 *             store: Ext.create('Ext.data.ArrayStore', {}), // A dummy empty data store
 *             flex: 1                                       // Use 1/3 of Container's height (hint to Box layout)
 *         }, {
 *             xtype: 'splitter'   // A splitter between the two child items
 *         }, {                    // Details Panel specified as a config object (no xtype defaults to 'panel').
 *             title: 'Details',
 *             bodyPadding: 5,
 *             items: [{
 *                 fieldLabel: 'Data item',
 *                 xtype: 'textfield'
 *             }], // An array of form fields
 *             flex: 2             // Use 2/3 of Container's height (hint to Box layout)
 *         }]
 *     });
 *
 * The example illustrates one possible method of displaying search results. The Panel contains a grid with the
 * resulting data arranged in rows. Each selected row may be displayed in detail in the Panel below. The {@link
 * Ext.layout.container.VBox vbox} layout is used to arrange the two vertically. It is configured to stretch child items
 * horizontally to full width. Child items may either be configured with a numeric height, or with a `flex` value to
 * distribute available space proportionately.
 *
 * This Panel itself may be a child item of, for exaple, a {@link Ext.tab.Panel} which will size its child items to fit
 * within its content area.
 *
 * Using these techniques, as long as the **layout** is chosen and configured correctly, an application may have any
 * level of nested containment, all dynamically sized according to configuration, the user's preference and available
 * browser size.
 */
Ext.define('Ext.panel.Panel', {
    extend: 'Ext.panel.AbstractPanel',
    requires: [
        'Ext.panel.Header',
        'Ext.fx.Anim',
        'Ext.util.KeyMap',
        'Ext.panel.DD',
        'Ext.XTemplate',
        'Ext.layout.component.Dock',
        'Ext.util.Memento'
    ],
    alias: 'widget.panel',
    alternateClassName: 'Ext.Panel',

    /**
     * @cfg {String} collapsedCls
     * A CSS class to add to the panel's element after it has been collapsed.
     */
    collapsedCls: 'collapsed',

    /**
     * @cfg {Boolean} animCollapse
     * `true` to animate the transition when the panel is collapsed, `false` to skip the animation (defaults to `true`
     * if the {@link Ext.fx.Anim} class is available, otherwise `false`). May also be specified as the animation
     * duration in milliseconds.
     */
    animCollapse: Ext.enableFx,

    /**
     * @cfg {Number} minButtonWidth
     * Minimum width of all footer toolbar buttons in pixels. If set, this will be used as the default
     * value for the {@link Ext.button.Button#minWidth} config of each Button added to the **footer toolbar** via the
     * {@link #fbar} or {@link #buttons} configurations. It will be ignored for buttons that have a minWidth configured
     * some other way, e.g. in their own config object or via the {@link Ext.container.Container#defaults defaults} of
     * their parent container.
     */
    minButtonWidth: 75,

    /**
     * @cfg {Boolean} collapsed
     * `true` to render the panel collapsed, `false` to render it expanded.
     */
    collapsed: false,

    /**
     * @cfg {Boolean} collapseFirst
     * `true` to make sure the collapse/expand toggle button always renders first (to the left of) any other tools in
     * the panel's title bar, `false` to render it last.
     */
    collapseFirst: true,

    /**
     * @cfg {Boolean} hideCollapseTool
     * `true` to hide the expand/collapse toggle button when `{@link #collapsible} == true`, `false` to display it.
     */
    hideCollapseTool: false,

    /**
     * @cfg {Boolean} titleCollapse
     * `true` to allow expanding and collapsing the panel (when `{@link #collapsible} = true`) by clicking anywhere in
     * the header bar, `false`) to allow it only by clicking to tool button).
     */
    titleCollapse: false,

    /**
     * @cfg {String} collapseMode
     * **Important: this config is only effective for {@link #collapsible} Panels which are direct child items of a
     * {@link Ext.layout.container.Border border layout}.**
     *
     * When _not_ a direct child item of a {@link Ext.layout.container.Border border layout}, then the Panel's header
     * remains visible, and the body is collapsed to zero dimensions. If the Panel has no header, then a new header
     * (orientated correctly depending on the {@link #collapseDirection}) will be inserted to show a the title and a re-
     * expand tool.
     *
     * When a child item of a {@link Ext.layout.container.Border border layout}, this config has three possible values:
     *
     * - `undefined` - When collapsed, a placeholder {@link Ext.panel.Header Header} is injected into the layout to
     *   represent the Panel and to provide a UI with a Tool to allow the user to re-expand the Panel.
     *
     * - `"header"` - The Panel collapses to leave its header visible as when not inside a
     *   {@link Ext.layout.container.Border border layout}.
     *
     * - `"mini"` - The Panel collapses without a visible header.
     */

    /**
     * @cfg {Ext.Component/Object} placeholder
     * **Important: This config is only effective for {@link #collapsible} Panels which are direct child items of a
     * {@link Ext.layout.container.Border border layout} when not using the `'header'` {@link #collapseMode}.**
     *
     * **Optional.** A Component (or config object for a Component) to show in place of this Panel when this Panel is
     * collapsed by a {@link Ext.layout.container.Border border layout}. Defaults to a generated {@link Ext.panel.Header
     * Header} containing a {@link Ext.panel.Tool Tool} to re-expand the Panel.
     */

    /**
     * @cfg {Boolean} floatable
     * **Important: This config is only effective for {@link #collapsible} Panels which are direct child items of a
     * {@link Ext.layout.container.Border border layout}.**
     *
     * true to allow clicking a collapsed Panel's {@link #placeholder} to display the Panel floated above the layout,
     * false to force the user to fully expand a collapsed region by clicking the expand button to see it again.
     */
    floatable: true,

    /**
     * @cfg {Boolean} overlapHeader
     * True to overlap the header in a panel over the framing of the panel itself. This is needed when frame:true (and
     * is done automatically for you). Otherwise it is undefined. If you manually add rounded corners to a panel header
     * which does not have frame:true, this will need to be set to true.
     */

    /**
     * @cfg {Boolean} collapsible
     * True to make the panel collapsible and have an expand/collapse toggle Tool added into the header tool button
     * area. False to keep the panel sized either statically, or by an owning layout manager, with no toggle Tool.
     *
     * See {@link #collapseMode} and {@link #collapseDirection}
     */
    collapsible: false,

    /**
     * @cfg {String} collapseDirection
     * The direction to collapse the Panel when the toggle button is clicked.
     *
     * Defaults to the {@link #headerPosition}
     *
     * **Important: This config is _ignored_ for {@link #collapsible} Panels which are direct child items of a {@link
     * Ext.layout.container.Border border layout}.**
     *
     * Specify as `'top'`, `'bottom'`, `'left'` or `'right'`.
     */

    /**
     * @cfg {Boolean} closable
     * True to display the 'close' tool button and allow the user to close the window, false to hide the button and
     * disallow closing the window.
     *
     * By default, when close is requested by clicking the close button in the header, the {@link #method-close} method will be
     * called. This will _{@link Ext.Component#method-destroy destroy}_ the Panel and its content meaning that it may not be
     * reused.
     *
     * To make closing a Panel _hide_ the Panel so that it may be reused, set {@link #closeAction} to 'hide'.
     */
    closable: false,

    /**
     * @cfg {String} closeAction
     * The action to take when the close header tool is clicked:
     *
     * - **`'{@link #method-destroy}'`** :
     *
     *   {@link #method-remove remove} the window from the DOM and {@link Ext.Component#method-destroy destroy} it and all descendant
     *   Components. The window will **not** be available to be redisplayed via the {@link #method-show} method.
     *
     * - **`'{@link #method-hide}'`** :
     *
     *   {@link #method-hide} the window by setting visibility to hidden and applying negative offsets. The window will be
     *   available to be redisplayed via the {@link #method-show} method.
     *
     * **Note:** This behavior has changed! setting *does* affect the {@link #method-close} method which will invoke the
     * approriate closeAction.
     */
    closeAction: 'destroy',

    /**
     * @cfg {Object/Object[]} dockedItems
     * A component or series of components to be added as docked items to this panel. The docked items can be docked to
     * either the top, right, left or bottom of a panel. This is typically used for things like toolbars or tab bars:
     *
     *     var panel = new Ext.panel.Panel({
     *         dockedItems: [{
     *             xtype: 'toolbar',
     *             dock: 'top',
     *             items: [{
     *                 text: 'Docked to the top'
     *             }]
     *         }]
     *     });
     */

    /**
     * @cfg {Number} placeholderCollapseHideMode
     * The {@link Ext.dom.Element#setVisibilityMode mode} for hiding collapsed panels when
     * using {@link #collapseMode} "placeholder".
     */
    placeholderCollapseHideMode: Ext.Element.VISIBILITY,

    /**
     * @cfg {Boolean} preventHeader
     * @deprecated 4.1.0 Use {@link #header} instead.
     * Prevent a Header from being created and shown.
     */
     preventHeader: false,

    /**
     * @cfg {Boolean/Object} header
     * Pass as `false` to prevent a Header from being created and shown.
     *
     * Pass as a config object (optionally containing an `xtype`) to custom-configure this Panel's header.
     *
     */
    header: undefined,

    /**
     * @cfg {String} headerPosition
     * Specify as `'top'`, `'bottom'`, `'left'` or `'right'`.
     */
    headerPosition: 'top',

    /**
     * @cfg {Boolean} frame
     * True to apply a frame to the panel.
     */
    frame: false,

    /**
     * @cfg {Boolean} frameHeader
     * True to apply a frame to the panel panels header (if 'frame' is true).
     */
    frameHeader: true,

    /**
     * @cfg {Object[]/Ext.panel.Tool[]} tools
     * An array of {@link Ext.panel.Tool} configs/instances to be added to the header tool area. The tools are stored as
     * child components of the header container. They can be accessed using {@link #down} and {#query}, as well as the
     * other component methods. The toggle tool is automatically created if {@link #collapsible} is set to true.
     *
     * Note that, apart from the toggle tool which is provided when a panel is collapsible, these tools only provide the
     * visual button. Any required functionality must be provided by adding handlers that implement the necessary
     * behavior.
     *
     * Example usage:
     *
     *     tools:[{
     *         type:'refresh',
     *         tooltip: 'Refresh form Data',
     *         // hidden:true,
     *         handler: function(event, toolEl, panel){
     *             // refresh logic
     *         }
     *     },
     *     {
     *         type:'help',
     *         tooltip: 'Get Help',
     *         handler: function(event, toolEl, panel){
     *             // show help here
     *         }
     *     }]
     */

    /**
     * @cfg {String} [title='']
     * The title text to be used to display in the {@link Ext.panel.Header panel header}. When a
     * `title` is specified the {@link Ext.panel.Header} will automatically be created and displayed unless
     * {@link #header} is set to `false`.
     */

    /**
     * @cfg {String} [titleAlign='left']
     * May be `"left"`, `"right"` or `"center"`.
     *
     * The alignment of the title text within the available space between the icon and the tools.
     */
    titleAlign: 'left',

    /**
     * @cfg {Boolean} [manageHeight=true]: When true, the dock component layout writes
     * height information to the panel's DOM elements based on its shrink wrap height
     * calculation. This ensures that the browser respects the calculated height.
     * When false, the dock component layout will not write heights on the panel or its
     * body element. In some simple layout cases, not writing the heights to the DOM may
     * be desired because this allows the browser to respond to direct DOM manipulations
     * (like animations).
     */
    manageHeight: true,

    /**
     * @cfg {String} iconCls
     * CSS class for an icon in the header. Used for displaying an icon to the left of a title.
     */
    
    /**
     * @cfg {String} icon
     * Path to image for an icon in the header. Used for displaying an icon to the left of a title.
     */

    initComponent: function() {
        var me = this;

        me.addEvents(

            /**
             * @event beforeclose
             * Fires before the user closes the panel. Return false from any listener to stop the close event being
             * fired
             * @param {Ext.panel.Panel} panel The Panel object
             */
            'beforeclose',
            
            /**
             * @event close
             * Fires when the user closes the panel.
             * @param {Ext.panel.Panel} panel The Panel object
             */
            'close',

            /**
             * @event beforeexpand
             * Fires before this panel is expanded. Return false to prevent the expand.
             * @param {Ext.panel.Panel} p The Panel being expanded.
             * @param {Boolean} animate True if the expand is animated, else false.
             */
            "beforeexpand",

            /**
             * @event beforecollapse
             * Fires before this panel is collapsed. Return false to prevent the collapse.
             * @param {Ext.panel.Panel} p The Panel being collapsed.
             * @param {String} direction . The direction of the collapse. One of
             *
             *   - Ext.Component.DIRECTION_TOP
             *   - Ext.Component.DIRECTION_RIGHT
             *   - Ext.Component.DIRECTION_BOTTOM
             *   - Ext.Component.DIRECTION_LEFT
             *
             * @param {Boolean} animate True if the collapse is animated, else false.
             */
            "beforecollapse",

            /**
             * @event expand
             * Fires after this Panel has expanded.
             * @param {Ext.panel.Panel} p The Panel that has been expanded.
             */
            "expand",

            /**
             * @event collapse
             * Fires after this Panel hass collapsed.
             * @param {Ext.panel.Panel} p The Panel that has been collapsed.
             */
            "collapse",

            /**
             * @event titlechange
             * Fires after the Panel title has been set or changed.
             * @param {Ext.panel.Panel} p the Panel which has been resized.
             * @param {String} newTitle The new title.
             * @param {String} oldTitle The previous panel title.
             */
            'titlechange',

            /**
             * @event iconchange
             * Fires after the Panel icon has been set or changed.
             * @param {Ext.panel.Panel} p The Panel which has the icon changed.
             * @param {String} newIcon The path to the new icon image.
             * @param {String} oldIcon The path to the previous panel icon image.
             */
            'iconchange',
            
            /**
             * @event iconclschange
             * Fires after the Panel iconCls has been set or changed.
             * @param {Ext.panel.Panel} p The Panel which has the iconCls changed.
             * @param {String} newIconCls The new iconCls.
             * @param {String} oldIconCls The previous panel iconCls.
             */
            'iconclschange'
        );

        if (me.collapsible) {
        // Save state on these two events.
            this.addStateEvents(['expand', 'collapse']);
        }
        if (me.unstyled) {
            me.setUI('plain');
        }

        if (me.frame) {
            me.setUI(me.ui + '-framed');
        }

        // Backwards compatibility
        me.bridgeToolbars();

        me.callParent();
        me.collapseDirection = me.collapseDirection || me.headerPosition || Ext.Component.DIRECTION_TOP;

        // Used to track hidden content elements during collapsed state
        me.hiddenOnCollapse = new Ext.dom.CompositeElement();

    },

    beforeDestroy: function() {
        var me = this;
        Ext.destroy(
            me.placeholder,
            me.ghostPanel,
            me.dd
        );
        me.callParent();
    },

    initAria: function() {
        this.callParent();
        this.initHeaderAria();
    },

    getFocusEl: function() {
        return  this.el;
    },

    initHeaderAria: function() {
        var me = this,
            el = me.el,
            header = me.header;
        if (el && header) {
            el.dom.setAttribute('aria-labelledby', header.titleCmp.id);
        }
    },

    /**
     * Gets the {@link Ext.panel.Header Header} for this panel.
     */
    getHeader: function() {
        return this.header;
    },

    /**
     * Set a title for the panel's header. See {@link Ext.panel.Header#title}.
     * @param {String} newTitle
     */
    setTitle: function(newTitle) {
        var me = this,
            oldTitle = me.title,
            header = me.header,
            reExpander = me.reExpander,
            placeholder = me.placeholder;

        me.title = newTitle;

        if (header) {
            if (header.isHeader) {
                header.setTitle(newTitle);
            } else {
                header.title = newTitle;
            }
        } else {
            me.updateHeader();
        }

        if (reExpander) {
            reExpander.setTitle(newTitle);
        }

        if (placeholder && placeholder.setTitle) {
            placeholder.setTitle(newTitle);
        }

        me.fireEvent('titlechange', me, newTitle, oldTitle);
    },

    /**
     * Set the iconCls for the panel's header. See {@link Ext.panel.Header#iconCls}. It will fire the
     * {@link #iconclschange} event after completion.
     * @param {String} newIconCls The new CSS class name
     */
    setIconCls: function(newIconCls) {
        var me = this,
            oldIconCls = me.iconCls,
            header = me.header,
            placeholder = me.placeholder;

        me.iconCls = newIconCls;

        if (header) {
            if (header.isHeader) {
                header.setIconCls(newIconCls);
            } else {
                header.iconCls = newIconCls;
            }
        } else {
            me.updateHeader();
        }

        if (placeholder && placeholder.setIconCls) {
            placeholder.setIconCls(newIconCls);
        }

        me.fireEvent('iconclschange', me, newIconCls, oldIconCls);
    },
    
    /**
     * Set the icon for the panel's header. See {@link Ext.panel.Header#icon}. It will fire the
     * {@link #iconchange} event after completion.
     * @param {String} newIcon The new icon path
     */
    setIcon: function(newIcon) {
        var me = this,
            oldIcon = me.icon,
            header = me.header,
            placeholder = me.placeholder;

        me.icon = newIcon;

        if (header) {
            if (header.isHeader) {
                header.setIcon(newIcon);
            } else {
                header.icon = newIcon;
            }
        } else {
            me.updateHeader();
        }

        if (placeholder && placeholder.setIcon) {
            placeholder.setIcon(newIcon);
        }

        me.fireEvent('iconchange', me, newIcon, oldIcon);
    },

    bridgeToolbars: function() {
        var me = this,
            docked = [],
            fbar,
            fbarDefaults,
            minButtonWidth = me.minButtonWidth;

        function initToolbar (toolbar, pos, useButtonAlign) {
            if (Ext.isArray(toolbar)) {
                toolbar = {
                    xtype: 'toolbar',
                    items: toolbar
                };
            }
            else if (!toolbar.xtype) {
                toolbar.xtype = 'toolbar';
            }
            toolbar.dock = pos;
            if (pos == 'left' || pos == 'right') {
                toolbar.vertical = true;
            }

            // Legacy support for buttonAlign (only used by buttons/fbar)
            if (useButtonAlign) {
                toolbar.layout = Ext.applyIf(toolbar.layout || {}, {
                    // default to 'end' (right-aligned) if me.buttonAlign is undefined or invalid
                    pack: { left:'start', center:'center' }[me.buttonAlign] || 'end'
                });
            }
            return toolbar;
        }

        // Short-hand toolbars (tbar, bbar and fbar plus new lbar and rbar):

        /**
         * @cfg {String} buttonAlign
         * The alignment of any buttons added to this panel. Valid values are 'right', 'left' and 'center' (defaults to
         * 'right' for buttons/fbar, 'left' for other toolbar types).
         *
         * **NOTE:** The prefered way to specify toolbars is to use the dockedItems config. Instead of buttonAlign you
         * would add the layout: { pack: 'start' | 'center' | 'end' } option to the dockedItem config.
         */

        /**
         * @cfg {Object/Object[]} tbar
         * Convenience config. Short for 'Top Bar'.
         *
         *     tbar: [
         *       { xtype: 'button', text: 'Button 1' }
         *     ]
         *
         * is equivalent to
         *
         *     dockedItems: [{
         *         xtype: 'toolbar',
         *         dock: 'top',
         *         items: [
         *             { xtype: 'button', text: 'Button 1' }
         *         ]
         *     }]
         */
        if (me.tbar) {
            docked.push(initToolbar(me.tbar, 'top'));
            me.tbar = null;
        }

        /**
         * @cfg {Object/Object[]} bbar
         * Convenience config. Short for 'Bottom Bar'.
         *
         *     bbar: [
         *       { xtype: 'button', text: 'Button 1' }
         *     ]
         *
         * is equivalent to
         *
         *     dockedItems: [{
         *         xtype: 'toolbar',
         *         dock: 'bottom',
         *         items: [
         *             { xtype: 'button', text: 'Button 1' }
         *         ]
         *     }]
         */
        if (me.bbar) {
            docked.push(initToolbar(me.bbar, 'bottom'));
            me.bbar = null;
        }

        /**
         * @cfg {Object/Object[]} buttons
         * Convenience config used for adding buttons docked to the bottom of the panel. This is a
         * synonym for the {@link #fbar} config.
         *
         *     buttons: [
         *       { text: 'Button 1' }
         *     ]
         *
         * is equivalent to
         *
         *     dockedItems: [{
         *         xtype: 'toolbar',
         *         dock: 'bottom',
         *         ui: 'footer',
         *         defaults: {minWidth: {@link #minButtonWidth}},
         *         items: [
         *             { xtype: 'component', flex: 1 },
         *             { xtype: 'button', text: 'Button 1' }
         *         ]
         *     }]
         *
         * The {@link #minButtonWidth} is used as the default {@link Ext.button.Button#minWidth minWidth} for
         * each of the buttons in the buttons toolbar.
         */
        if (me.buttons) {
            me.fbar = me.buttons;
            me.buttons = null;
        }

        /**
         * @cfg {Object/Object[]} fbar
         * Convenience config used for adding items to the bottom of the panel. Short for Footer Bar.
         *
         *     fbar: [
         *       { type: 'button', text: 'Button 1' }
         *     ]
         *
         * is equivalent to
         *
         *     dockedItems: [{
         *         xtype: 'toolbar',
         *         dock: 'bottom',
         *         ui: 'footer',
         *         defaults: {minWidth: {@link #minButtonWidth}},
         *         items: [
         *             { xtype: 'component', flex: 1 },
         *             { xtype: 'button', text: 'Button 1' }
         *         ]
         *     }]
         *
         * The {@link #minButtonWidth} is used as the default {@link Ext.button.Button#minWidth minWidth} for
         * each of the buttons in the fbar.
         */
        if (me.fbar) {
            fbar = initToolbar(me.fbar, 'bottom', true); // only we useButtonAlign
            fbar.ui = 'footer';

            // Apply the minButtonWidth config to buttons in the toolbar
            if (minButtonWidth) {
                fbarDefaults = fbar.defaults;
                fbar.defaults = function(config) {
                    var defaults = fbarDefaults || {};
                    if ((!config.xtype || config.xtype === 'button' || (config.isComponent && config.isXType('button'))) &&
                            !('minWidth' in defaults)) {
                        defaults = Ext.apply({minWidth: minButtonWidth}, defaults);
                    }
                    return defaults;
                };
            }

            docked.push(fbar);
            me.fbar = null;
        }

        /**
         * @cfg {Object/Object[]} lbar
         * Convenience config. Short for 'Left Bar' (left-docked, vertical toolbar).
         *
         *     lbar: [
         *       { xtype: 'button', text: 'Button 1' }
         *     ]
         *
         * is equivalent to
         *
         *     dockedItems: [{
         *         xtype: 'toolbar',
         *         dock: 'left',
         *         items: [
         *             { xtype: 'button', text: 'Button 1' }
         *         ]
         *     }]
         */
        if (me.lbar) {
            docked.push(initToolbar(me.lbar, 'left'));
            me.lbar = null;
        }

        /**
         * @cfg {Object/Object[]} rbar
         * Convenience config. Short for 'Right Bar' (right-docked, vertical toolbar).
         *
         *     rbar: [
         *       { xtype: 'button', text: 'Button 1' }
         *     ]
         *
         * is equivalent to
         *
         *     dockedItems: [{
         *         xtype: 'toolbar',
         *         dock: 'right',
         *         items: [
         *             { xtype: 'button', text: 'Button 1' }
         *         ]
         *     }]
         */
        if (me.rbar) {
            docked.push(initToolbar(me.rbar, 'right'));
            me.rbar = null;
        }

        if (me.dockedItems) {
            if (!Ext.isArray(me.dockedItems)) {
                me.dockedItems = [me.dockedItems];
            }
            me.dockedItems = me.dockedItems.concat(docked);
        } else {
            me.dockedItems = docked;
        }
    },

    isPlaceHolderCollapse: function(){
        return this.collapseMode == 'placeholder';
    },

    onBoxReady: function(){
        this.callParent();
        if (this.collapsed) {
            this.setHiddenDocked();
        }    
    },

    beforeRender: function() {
        var me = this,
            wasCollapsed;

        me.callParent();

        // Add class-specific header tools.
        // Panel adds collapsible and closable.
        me.initTools();

        // Dock the header/title unless we are configured specifically not to create a header
        if (!(me.preventHeader || (me.header === false))) {
            me.updateHeader();
        }

        // If we are rendering collapsed, we still need to save and modify various configs
        if (me.collapsed) {
            if (me.isPlaceHolderCollapse()) {
                me.hidden = true;

                // This will insert the placeholder Component into the ownerCt's child collection
                // Its getRenderTree call which is calling this will then iterate again and
                // recreate the child items array to include the new Component.
                me.placeholderCollapse();
                wasCollapsed = me.collapsed;

                // Temporarily clear the flag so that the header is rendered with a collapse tool in it.
                // Placeholder collapse panels never really collapse, they just hide. The tool is always
                // a collapse tool.
                me.collapsed = false;
            } else {
                me.beginCollapse();
                me.addClsWithUI(me.collapsedCls);
            }
        }

        // Restore the flag if we are being rendered initially placeholder collapsed.
        if (wasCollapsed) {
            me.collapsed = wasCollapsed;
        }
    },

    /**
     * @private
     * Tools are a Panel-specific capabilty.
     * Panel uses initTools. Subclasses may contribute tools by implementing addTools.
     */
    initTools: function() {
        var me = this;

        me.tools = me.tools ? Ext.Array.clone(me.tools) : [];

        // Add a collapse tool unless configured to not show a collapse tool
        // or to not even show a header.
        if (me.collapsible && !(me.hideCollapseTool || me.header === false || me.preventHeader)) {
            me.collapseDirection = me.collapseDirection || me.headerPosition || 'top';
            me.collapseTool = me.expandTool = Ext.widget({
                xtype: 'tool',
                type: (me.collapsed && !me.isPlaceHolderCollapse()) ? ('expand-' + me.getOppositeDirection(me.collapseDirection)) : ('collapse-' + me.collapseDirection),
                handler: me.toggleCollapse,
                scope: me
            });

            // Prepend collapse tool is configured to do so.
            if (me.collapseFirst) {
                me.tools.unshift(me.collapseTool);
            }
        }

        // Add subclass-specific tools.
        me.addTools();

        // Make Panel closable.
        if (me.closable) {
            me.addClsWithUI('closable');
            me.addTool({
                type: 'close',
                handler: Ext.Function.bind(me.close, me, [])
            });
        }

        // Append collapse tool if needed.
        if (me.collapseTool && !me.collapseFirst) {
            me.addTool(me.collapseTool);
        }
    },

    /**
     * @private
     * @template
     * Template method to be implemented in subclasses to add their tools after the collapsible tool.
     */
    addTools: Ext.emptyFn,

    /**
     * Closes the Panel. By default, this method, removes it from the DOM, {@link Ext.Component#method-destroy destroy}s the
     * Panel object and all its descendant Components. The {@link #beforeclose beforeclose} event is fired before the
     * close happens and will cancel the close action if it returns false.
     *
     * **Note:** This method is also affected by the {@link #closeAction} setting. For more explicit control use
     * {@link #method-destroy} and {@link #method-hide} methods.
     */
    close: function() {
        if (this.fireEvent('beforeclose', this) !== false) {
            this.doClose();
        }
    },

    // private
    doClose: function() {
        this.fireEvent('close', this);
        this[this.closeAction]();
    },

    /**
     * Create, hide, or show the header component as appropriate based on the current config.
     * @private
     * @param {Boolean} force True to force the header to be created
     */
    updateHeader: function(force) {
        var me = this,
            header = me.header,
            title = me.title,
            tools = me.tools,
            icon = me.icon || me.iconCls,
            vertical = me.headerPosition == 'left' || me.headerPosition == 'right';

        if ((header !== false) && (force || (title || icon) || (tools && tools.length) || (me.collapsible && !me.titleCollapse))) {
            if (header && header.isHeader) {
                header.show();
            } else {
                // Apply the header property to the header config
                header = me.header = Ext.widget(Ext.apply({
                    xtype       : 'header',
                    title       : title,
                    titleAlign  : me.titleAlign,
                    orientation : vertical ? 'vertical' : 'horizontal',
                    dock        : me.headerPosition || 'top',
                    textCls     : me.headerTextCls,
                    iconCls     : me.iconCls,
                    icon        : me.icon,
                    baseCls     : me.baseCls + '-header',
                    tools       : tools,
                    ui          : me.ui,
                    id          : me.id + '_header',
                    indicateDrag: me.draggable,
                    frame       : (me.frame || me.alwaysFramed) && me.frameHeader,
                    ignoreParentFrame : me.frame || me.overlapHeader,
                    ignoreBorderManagement: me.frame || me.ignoreHeaderBorderManagement,
                    listeners   : me.collapsible && me.titleCollapse ? {
                        click: me.toggleCollapse,
                        scope: me
                    } : null
                }, me.header));
                me.addDocked(header, 0);

                // Reference the Header's tool array.
                // Header injects named references.
                me.tools = header.tools;
            }
            me.initHeaderAria();
        } else if (header) {
            header.hide();
        }
    },

    // inherit docs
    setUI: function(ui) {
        var me = this;

        me.callParent(arguments);

        if (me.header && me.header.rendered) {
            me.header.setUI(ui);
        }
    },

    // private
    getContentTarget: function() {
        return this.body;
    },

    getTargetEl: function() {
        var me = this;
        return me.body || me.protoBody || me.frameBody || me.el;
    },

    // the overrides below allow for collapsed regions inside the border layout to be hidden

    // inherit docs
    isVisible: function(deep){
        var me = this;
        if (me.collapsed && me.placeholder) {
            return me.placeholder.isVisible(deep);
        }
        return me.callParent(arguments);
    },

    // inherit docs
    onHide: function(){
        var me = this;
        if (me.collapsed && me.placeholder) {
            me.placeholder.hide();
        } else {
            me.callParent(arguments);
        }
    },

    // inherit docs
    onShow: function(){
        var me = this;
        if (me.collapsed && me.placeholder) {
            // force hidden back to true, since this gets set by the layout
            me.hidden = true;
            me.placeholder.show();
        } else {
            me.callParent(arguments);
        }
    },

    onRemoved: function(destroying) {
        var me = this;

        me.callParent(arguments);

        // If we are removed but not being destroyed, ensure our placeholder is also removed but not destroyed
        // If we are being destroyed, our destroy processing will destroy the placeholder.
        if (me.placeholder && !destroying) {
            me.ownerCt.remove(me.placeholder, false);
        }
    },

    addTool: function(tools) {
        tools = [].concat(tools);

        var me     = this,
            header = me.header,
            t,
            tLen   = tools.length,
            tool;

        for (t = 0; t < tLen; t++) {
            tool = tools[t];

            me.tools.push(tool);

            if (header && header.isHeader) {
                header.addTool(tool);
            }
        }

        me.updateHeader();
    },

    getOppositeDirection: function(d) {
        var c = Ext.Component;
        switch (d) {
            case c.DIRECTION_TOP:
                return c.DIRECTION_BOTTOM;
            case c.DIRECTION_RIGHT:
                return c.DIRECTION_LEFT;
            case c.DIRECTION_BOTTOM:
                return c.DIRECTION_TOP;
            case c.DIRECTION_LEFT:
                return c.DIRECTION_RIGHT;
        }
    },

    getWidthAuthority: function() {
        if (this.collapsed && this.collapsedHorizontal()) {
            return 1; // the panel determine's its own width
        }

        return this.callParent();
    },

    getHeightAuthority: function() {
        if (this.collapsed && this.collapsedVertical()) {
            return 1; // the panel determine's its own height
        }

        return this.callParent();
    },

    collapsedHorizontal: function () {
        var dir = this.getCollapsed();
        return dir == 'left' || dir == 'right';
    },

    collapsedVertical: function () {
        var dir = this.getCollapsed();
        return dir == 'top' || dir == 'bottom';
    },
    
    restoreDimension: function(){
        var dir = this.collapseDirection;
        // If we're collapsing top/bottom, we want to restore the height
        // If we're collapsing left/right, we want to restore the width
        return (dir === 'top' || dir === 'bottom') ? 'height' : 'width';    
    },

    /**
     * Returns the current collapsed state of the panel.
     * @return {Boolean/String} False when not collapsed, otherwise the value of {@link #collapseDirection}.
     */
    getCollapsed: function() {
        var me = this;
        // The collapsed flag, when the Panel is collapsed acts as the direction in which the collapse took
        // place. It can still be tested as truthy/falsy if only a truth value is required.
        if (me.collapsed === true) {
            return me.collapseDirection;
        }
        return me.collapsed;
    },

    getState: function() {
        var me = this,
            state = me.callParent(),
            memento;

        state = me.addPropertyToState(state, 'collapsed');

        // If a collapse has taken place, use remembered values as the dimensions.
        if (me.collapsed) {
            memento = me.collapseMemento;
            memento = memento && memento.data;

            if (me.collapsedVertical()) {
                if (state) {
                    delete state.height;
                }
                if (memento) {
                    state = me.addPropertyToState(state, 'height', memento.height);
                }
            } else {
                if (state) {
                    delete state.width;
                }
                if (memento) {
                    state = me.addPropertyToState(state, 'width', memento.width);
                }
            }
        }

        return state;
    },

    findReExpander: function (direction) {
        var me = this,
            c = Ext.Component,
            dockedItems = me.dockedItems.items,
            dockedItemCount = dockedItems.length,
            comp, i;
            
        // never use the header if we're in collapseMode mini
        if (me.collapseMode == 'mini') {
            return;
        }

        switch (direction) {
            case c.DIRECTION_TOP:
            case c.DIRECTION_BOTTOM:

                // Attempt to find a reExpander Component (docked in a horizontal orientation)
                // Also, collect all other docked items which we must hide after collapse. 
                for (i = 0; i < dockedItemCount; i++) {
                    comp = dockedItems[i];
                    if (!comp.hidden) {
                        if (comp.isHeader && (!comp.dock || comp.dock == 'top' || comp.dock == 'bottom')) {
                            return comp;
                        }
                    }
                }
                break;

            case c.DIRECTION_LEFT:
            case c.DIRECTION_RIGHT:

                // Attempt to find a reExpander Component (docked in a vecrtical orientation)
                // Also, collect all other docked items which we must hide after collapse. 
                for (i = 0; i < dockedItemCount; i++) {
                    comp = dockedItems[i];
                    if (!comp.hidden) {
                        if (comp.isHeader && (comp.dock == 'left' || comp.dock == 'right')) {
                            return comp;
                        }
                    }
                }
                break;

            default:
                throw('Panel#findReExpander must be passed a valid collapseDirection');
        }
    },

    getReExpander: function (direction) {
        var me = this,
            collapseDir = direction || me.collapseDirection,
            reExpander = me.reExpander || me.findReExpander(collapseDir);

        me.expandDirection = me.getOppositeDirection(collapseDir);

        if (!reExpander) {
        // We did not find a Header of the required orientation: create one.
            me.reExpander = reExpander = me.createReExpander(collapseDir, {
                dock: collapseDir,
                cls: Ext.baseCSSPrefix + 'docked ' + me.baseCls + '-' + me.ui + '-collapsed',
                ownerCt: me,
                ownerLayout: me.componentLayout
            });

            me.dockedItems.insert(0, reExpander);
        }
        return reExpander;
    },

    createReExpander: function(direction, defaults) {
        var me = this,
            isLeft = direction == 'left',
            isRight = direction == 'right',
            isVertical = isLeft || isRight,
            toolAtTop,
            result = Ext.apply({
                hideMode: 'offsets',
                title: me.title,
                orientation: isVertical ? 'vertical' : 'horizontal',
                textCls: me.headerTextCls,
                icon: me.icon,
                iconCls: me.iconCls,
                baseCls: me.baseCls + '-header',
                ui: me.ui,
                frame: me.frame && me.frameHeader,
                ignoreParentFrame: me.frame || me.overlapHeader,
                indicateDrag: me.draggable
            }, defaults);
            
            // If we're in mini mode, set the placeholder size to only 1px since
            // we don't need it to show up.
            if (me.collapseMode == 'mini') {
                if (isVertical) {
                    result.width = 1;
                } else {
                    result.height = 1;
                }
            }

        // Create the re expand tool
        // For UI consistency reasons, collapse:left reExpanders, and region: 'west' placeHolders
        // have the re expand tool at the *top* with a bit of space.
        if (!me.hideCollapseTool) {
            toolAtTop = isLeft || (isRight && me.isPlaceHolderCollapse());
            result[toolAtTop ? 'items' : 'tools'] = [{
                xtype: 'tool',
                type: 'expand-' + me.getOppositeDirection(direction),
                uiCls: ['top'],
                handler: me.toggleCollapse,
                scope: me
            }];
        }
        result = new Ext.panel.Header(result);
        result.addClsWithUI(me.getHeaderCollapsedClasses(result));
        return result;
    },

    // private
    // Create the class array to add to the Header when collpsed.
    getHeaderCollapsedClasses: function(header) {
        var me = this,
            collapsedCls = me.collapsedCls,
            collapsedClasses;

        collapsedClasses = [ collapsedCls, collapsedCls + '-' + header.dock];
        if (me.border && (!me.frame || (me.frame && Ext.supports.CSS3BorderRadius))) {
            collapsedClasses.push(collapsedCls + '-border-' + header.dock);
        }
        return collapsedClasses;
    },

    /**
     * @private
     * Called before the change from default, configured state into the collapsed state.
     * This method may be called at render time to enable rendering in an initially collapsed state,
     * or at runtime when an existing, fully layed out Panel may be collapsed.
     * It basically saves configs which need to be clobbered for the duration of the collapsed state.
     */
    beginCollapse: function() {
        var me = this,
            lastBox = me.lastBox,
            rendered = me.rendered,
            collapseMemento = me.collapseMemento || (me.collapseMemento = new Ext.util.Memento(me)),
            sizeModel = me.getSizeModel(),
            reExpander;

        // When we collapse a panel, the panel is in control of one dimension (depending on
        // collapse direction) and sets that on the component. We must restore the user's
        // original value (including non-existance) when we expand. Using this technique, we
        // mimic setCalculatedSize for the dimension we do not control and setSize for the
        // one we do (only while collapsed).
        // Additionally, the panel may have a shrink wrapped width and/or height. For shrinkWrapped
        // panels this can be problematic, since a collapsed, shrink-wrapped panel has no way 
        // of determining its width (or height if the collapse direction is horizontal). It is
        // therefore necessary to capture both the width and height regardless of collapse direction.
        // This allows us to set a configured width or height on the panel when it is collapsed,
        // and it will be restored to an unconfigured-width shrinkWrapped state on expand.
        collapseMemento.capture(['height', 'minHeight', 'width', 'minWidth']);
        if (lastBox) {
            collapseMemento.capture(me.restoreDimension(), lastBox, 'last.');
        }
        // If the panel has a shrinkWrapped height/width and is already rendered, configure its width/height as its calculated width/height,
        // so that the collapsed header will have the same width or height as the panel did before it was collapsed.
        // If the shrinkWrapped panel has not yet been rendered, as will be the case when a panel is initially configured with
        // collapsed:true, we attempt to use the configured width/height, and fall back to minWidth or minHeight if
        // width/height has not been configured, and fall back to a value of 100 if a minWidth/minHeight has not been configured.
        if (me.collapsedVertical()) {
            if (sizeModel.width.shrinkWrap) {
                me.width = rendered ? me.getWidth() : me.width || me.minWidth || 100;
            }
            delete me.height;
            me.minHeight = 0;
        } else if (me.collapsedHorizontal()) {
            if (sizeModel.height.shrinkWrap) {
                me.height = rendered ? me.getHeight() : me.height || me.minHeight || 100;
            }
            delete me.width;
            me.minWidth = 0;
        }

        if (me.ownerCt) {
            me.ownerCt.getLayout().beginCollapse(me);
        }

        // Get a reExpander header. This will return the Panel Header if the Header is in the correct orientation
        // If we are using the Header as the reExpander, change its UI to collapsed state
        if (!me.isPlaceHolderCollapse()) {
            if (me.header === (reExpander = me.getReExpander())) {
                me.header.addClsWithUI(me.getHeaderCollapsedClasses(me.header));

                // Ensure that the reExpander has the correct framing applied.
                if (me.header.rendered) {
                    me.header.updateFrame();
                }
            }
            // We're going to use a temporary reExpander: show it.
            else {
                if (reExpander.el) {
                    reExpander.el.show();
                    reExpander.hidden = false;
                }
            }
        }
        if (me.resizer) {
            me.resizer.disable();
        }
    },

    beginExpand: function() {
        var me = this,
            lastBox = me.lastBox,
            collapseMemento = me.collapseMemento,
            restoreDimension = this.restoreDimension(),
            reExpander;

        collapseMemento.restore(['minHeight', 'minWidth', restoreDimension]);
        if (lastBox) {
            collapseMemento.restore(restoreDimension, true, lastBox, 'last.');
        }

        if (me.ownerCt) {
            me.ownerCt.getLayout().beginExpand(me);
        }

        if (!me.isPlaceHolderCollapse()) {
            // If we have been using our Header as the reExpander then restore the Header to expanded UI
            if (me.header === (reExpander = me.getReExpander())) {
                me.header.removeClsWithUI(me.getHeaderCollapsedClasses(me.header));

                // Ensure that the reExpander has the correct framing applied.
                if (me.header.rendered) {
                    me.header.updateFrame();
                }
            }
            // We've been using a temporary reExpander: hide it.
            else {
                reExpander.hidden = true;
                reExpander.el.hide();
            }
        }
        if (me.resizer) {
            me.resizer.enable();
        }
    },

    /**
     * Collapses the panel body so that the body becomes hidden. Docked Components parallel to the border towards which
     * the collapse takes place will remain visible. Fires the {@link #beforecollapse} event which will cancel the
     * collapse action if it returns false.
     *
     * @param {String} [direction] The direction to collapse towards. Must be one of
     *
     *   - Ext.Component.DIRECTION_TOP
     *   - Ext.Component.DIRECTION_RIGHT
     *   - Ext.Component.DIRECTION_BOTTOM
     *   - Ext.Component.DIRECTION_LEFT
     *
     * Defaults to {@link #collapseDirection}.
     *
     * @param {Boolean} [animate] True to animate the transition, else false (defaults to the value of the
     * {@link #animCollapse} panel config)
     * @return {Ext.panel.Panel} this
     */
    collapse: function(direction, animate) {
        var me = this,
            collapseDir = direction || me.collapseDirection,
            ownerCt = me.ownerCt;

        if (me.isCollapsingOrExpanding) {
            return me;
        }

        if (arguments.length < 2) {
            animate = me.animCollapse;
        }

        if (me.collapsed || me.fireEvent('beforecollapse', me, direction, animate) === false) {
            return me;
        }

        if (ownerCt && me.isPlaceHolderCollapse()) {
            return me.placeholderCollapse(direction, animate);
        }

        me.collapsed = collapseDir;
        me.beginCollapse();

        me.fireHierarchyEvent('collapse');

        return me.doCollapseExpand(1, animate);
    },

    doCollapseExpand: function (flags, animate) {
        var me = this,
            originalAnimCollapse = me.animCollapse,
            ownerLayout = me.ownerLayout;

        // we need to temporarily set animCollapse to the animate value here because ContextItem
        // uses the animCollapse property to determine if the collapse/expand should be animated
        me.animCollapse = animate;

        // Flag used by the layouy ContextItem to impose an animation policy based upon the
        // collapse direction and the animCollapse setting.
        me.isCollapsingOrExpanding = flags;

        if (ownerLayout && !animate) {
            ownerLayout.onContentChange(me);
        } else {
            me.updateLayout({ isRoot: true });
        }

        // set animCollapse back to its original value
        me.animCollapse = originalAnimCollapse;

        return me;
    },

    /**
     * Invoked after the Panel is Collapsed.
     *
     * @param {Boolean} animated
     *
     * @template
     * @protected
     */
    afterCollapse: function(animated) {
        var me = this,
            ownerLayout = me.ownerLayout;

        me.isCollapsingOrExpanding = 0;
        if (me.collapseTool) {
            me.collapseTool.setType('expand-' + me.getOppositeDirection(me.collapseDirection));
        }

        if (ownerLayout && animated) {
            ownerLayout.onContentChange(me);
        }

        me.setHiddenDocked();
        me.fireEvent('collapse', me);
    },
    
    setHiddenDocked: function(){
        // Hide Panel content except reExpander using visibility to prevent focusing of contained elements.
        // Track what we hide to re-show on expand
        var me = this,
            toHide = me.hiddenOnCollapse,
            reExpander = me.getReExpander(),
            items = me.getDockedItems(),
            len = items.length,
            i = 0,
            item;
            
        toHide.add(me.body);
        for (; i < len; i++) {
            item = items[i];
            if (item && item !== reExpander && item.el) {
                toHide.add(item.el);
            }
        }
        toHide.setStyle('visibility', 'hidden');
    },
    
    restoreHiddenDocked: function(){
        var toShow = this.hiddenOnCollapse;
        // Re-show Panel content which was hidden after collapse.
        toShow.setStyle('visibility', '');
        toShow.clear();
    },

    getPlaceholder: function(direction) {
        var me = this,
            collapseDir = direction || me.collapseDirection,
            listeners = null,
            placeholder = me.placeholder;

        if (!placeholder) {
            if (me.floatable || (me.collapsible && me.titleCollapse)) {
                listeners = {
                    click: {
                        fn: me.floatable ? me.floatCollapsedPanel : me.toggleCollapse,
                        element: 'el',
                        scope: me
                    }
                };
            }

            me.placeholder = placeholder = Ext.widget(me.createReExpander(collapseDir, {
                id: me.id + '-placeholder',
                listeners: listeners
            }));
        }

        // User created placeholder was passed in
        if (!placeholder.placeholderFor) {
            // Handle the case of a placeholder config
            if (!placeholder.isComponent) {
                me.placeholder = placeholder = me.lookupComponent(placeholder);
            }
            Ext.applyIf(placeholder, {
                margins: me.margins,
                placeholderFor: me
            });

            placeholder.addCls([Ext.baseCSSPrefix + 'region-collapsed-placeholder', Ext.baseCSSPrefix + 'region-collapsed-' + collapseDir + '-placeholder', me.collapsedCls]);
        }

        return placeholder;
    },

    placeholderCollapse: function(direction, animate) {
        var me = this,
            ownerCt = me.ownerCt,
            collapseDir = direction || me.collapseDirection,
            floatCls = Ext.baseCSSPrefix + 'border-region-slide-in',
            placeholder = me.getPlaceholder(direction);

        me.isCollapsingOrExpanding = 1;

        // Upcoming layout run will ignore this Component
        me.hidden = true;
        me.collapsed = collapseDir;

        if (placeholder.rendered) {
            // We may have been added to another Container from that in which we rendered the placeholder
            if (placeholder.el.dom.parentNode !== me.el.dom.parentNode) {
                me.el.dom.parentNode.insertBefore(placeholder.el.dom, me.el.dom);
            }

            placeholder.hidden = false;
            placeholder.el.show();
            ownerCt.updateLayout();
        } else {
            ownerCt.insert(ownerCt.items.indexOf(me), placeholder);
        }

        if (me.rendered) {
            // We MUST NOT hide using display because that resets all scroll information.
            me.el.setVisibilityMode(me.placeholderCollapseHideMode);
            if (animate) {
                me.el.addCls(floatCls);
                placeholder.el.hide();

                me.el.slideOut(collapseDir.substr(0, 1), {
                    preserveScroll: true,
                    duration: Ext.Number.from(animate, Ext.fx.Anim.prototype.duration),
                    listeners: {
                        afteranimate: function() {
                            me.el.removeCls(floatCls);
                            /* We need to show the element so that slideIn will work correctly. However, if we leave it
                               visible then it can be seen before the animation starts, causing a flicker. The solution,
                               borrowed from date picker, is to hide it using display none. The slideIn effect includes
                               a call to fixDisplay() that will undo the display none at the appropriate time.
                             */
                            placeholder.el.show().setStyle('display', 'none').slideIn(collapseDir.substr(0, 1), {
                                easing: 'linear',
                                duration: 100,
                                listeners: {
                                    afteranimate: function() {
                                        placeholder.focus();
                                        me.isCollapsingOrExpanding = 0;
                                        me.fireEvent('collapse', me);
                                    }
                                }
                            });
                        }
                    }
                });
            } else {
                me.el.hide();
                me.isCollapsingOrExpanding = 0;
                me.fireEvent('collapse', me);
            }
        } else {
            me.isCollapsingOrExpanding = 0;
            me.fireEvent('collapse', me);
        }

        return me;
    },

    floatCollapsedPanel: function() {
        var me = this,
            placeholder = me.placeholder,
            pb = placeholder.getBox(true),
            myBox,
            floatCls = Ext.baseCSSPrefix + 'border-region-slide-in',
            collapsed = me.collapsed,
            layoutOwner = me.ownerCt || me,
            slideDirection;

        // Already floated
        if (me.el.hasCls(floatCls)) {
            me.slideOutFloatedPanel();
            return;
        }

        if (me.isSliding) {
            return;
        }
        me.isSliding = true;

        // Function to be called when the mouse leaves the floated Panel
        // Slide out when the mouse leaves the region bounded by the slid Component and its placeholder.
        function onMouseLeaveFloated(e) {
            if (!me.isDestroyed) {
                var slideRegion = me.el.getRegion().union(placeholder.el.getRegion()).adjust(1, -1, -1, 1);

                // If mouse is not within slide Region, slide it out
                if (!slideRegion.contains(e.getPoint())) {
                    me.slideOutFloatedPanel();
                }
            }
        }

        // Lay out in fully expanded mode to ensure we are at the correct size, and collect our expanded box
        me.placeholder.el.hide();
        me.placeholder.hidden = true;
        me.el.show();
        me.hidden = false;
        me.collapsed = false;
        layoutOwner.updateLayout();
        myBox = me.getBox(true);

        // Then go back immediately to collapsed state from which to initiate the float into view.
        me.placeholder.el.show();
        me.placeholder.hidden = false;
        me.el.hide();
        me.hidden = true;
        me.collapsed = collapsed;
        layoutOwner.updateLayout();

        // Monitor for mouseouting of the placeholder. Hide it if they exit for half a second or more
        me.placeholderMouseMon = placeholder.el.monitorMouseLeave(500, onMouseLeaveFloated);
        me.panelMouseMon       = me.el.monitorMouseLeave(500, onMouseLeaveFloated);
        me.el.addCls(floatCls);

        // Hide collapse tool in header if there is one (we might be headerless)
        if (me.collapseTool) {
            me.collapseTool.el.hide();
        }

        switch (me.collapsed) {
            case 'top':
                me.el.setLeftTop(pb.x, pb.y + pb.height - 1);
                slideDirection = 't';
                break;
            case 'right':
                me.el.setLeftTop(pb.x - myBox.width + 1, pb.y);
                slideDirection = 'r';
                break;
            case 'bottom':
                me.el.setLeftTop(pb.x, pb.y - myBox.height + 1);
                slideDirection = 'b';
                break;
            case 'left':
                me.el.setLeftTop(pb.x + pb.width - 1, pb.y);
                slideDirection = 'l';
                break;
        }

        // Remember how we are really collapsed so we can restore it, but also so we can
        // become a layoutRoot while we are floated:
        me.floatedFromCollapse = me.collapsed;
        me.collapsed = me.hidden = false;

        me.el.slideIn(slideDirection, {
            preserveScroll: true,
            listeners: {
                afteranimate: function() {
                    me.isSliding = false;
                }
            }
        });
    },

    isLayoutRoot: function() {
        if (this.floatedFromCollapse) {
            return true;
        }
        return this.callParent();
    },

    slideOutFloatedPanel: function() {
        var me = this,
            compEl = this.el,
            collapseDirection;

        if (me.isSliding) {
            return;
        }

        me.isSliding = true;

        me.slideOutFloatedPanelBegin();

        if (typeof me.collapsed == 'string') {
            collapseDirection = me.collapsed.charAt(0);
        }

        compEl.slideOut(collapseDirection, {
            preserveScroll: true,
            listeners: {
                afteranimate: function() {
                    me.slideOutFloatedPanelEnd();
                    // this would be in slideOutFloatedPanelEnd except that the only other
                    // caller removes this cls later
                    me.el.removeCls(Ext.baseCSSPrefix + 'border-region-slide-in');
                    me.isSliding = false;
                }
            }
        });
    },

    /**
     * This method begins the slide out of the floated panel.
     * @private
     */
    slideOutFloatedPanelBegin: function() {
        var me = this,
            compEl = this.el;

        me.collapsed = me.floatedFromCollapse;
        me.hidden = true;
        me.floatedFromCollapse = null;

        // Remove mouse leave monitors
        compEl.un(me.panelMouseMon);
        me.placeholder.el.un(me.placeholderMouseMon);
    },

    /**
     * This method cleans up after the slide out of the floated panel.
     * @private
     */
    slideOutFloatedPanelEnd: function() {
        if (this.collapseTool) {
            this.collapseTool.el.show();
        }
    },

    /**
     * Expands the panel body so that it becomes visible.  Fires the {@link #beforeexpand} event which will
     * cancel the expand action if it returns false.
     * @param {Boolean} [animate] True to animate the transition, else false (defaults to the value of the
     * {@link #animCollapse} panel config)
     * @return {Ext.panel.Panel} this
     */
    expand: function(animate) {
        var me = this;

        if (me.isCollapsingOrExpanding) {
            return me;
        }

        if (!arguments.length) {
            animate = me.animCollapse;
        }

        if (!me.collapsed && !me.floatedFromCollapse) {
            return me;
        }

        if (me.fireEvent('beforeexpand', me, animate) === false) {
            return me;
        }

        if (me.isPlaceHolderCollapse()) {
            return me.placeholderExpand(animate);
        }

        me.restoreHiddenDocked();
        me.beginExpand();
        me.collapsed = false;

        me.fireHierarchyEvent('expand');

        return me.doCollapseExpand(2, animate);
    },

    placeholderExpand: function(animate) {
        var me = this,
            collapseDir = me.collapsed,
            floatCls = Ext.baseCSSPrefix + 'border-region-slide-in',
            finalPos,
            floatedPos,
            slideInDirection;

        if (me.floatedFromCollapse) {
            floatedPos = me.getPosition(true);
            // these are the same cleanups performed by the normal slideOut mechanism:
            me.slideOutFloatedPanelBegin();
            me.slideOutFloatedPanelEnd();
        }

        me.isCollapsingOrExpanding = 2;

        // Expand me and hide the placeholder
        me.placeholder.hidden = true;
        me.placeholder.el.hide();
        me.collapsed = false;
        me.show();

        if (animate) {
            // Floated, move it back to the floated pos, and thence into the correct place
            if (floatedPos) {
                finalPos = me.el.getXY();
                me.el.setLeftTop(floatedPos[0], floatedPos[1]);
                me.el.moveTo(finalPos[0], finalPos[1], {
                    duration: Ext.Number.from(animate, Ext.fx.Anim.prototype.duration),
                    listeners: {
                        afteranimate: function() {
                            me.el.removeCls(floatCls);
                            me.isCollapsingOrExpanding = 0;
                            me.fireEvent('expand', me);
                        }
                    }
                });
            }
            // Not floated, slide it in to the correct place
            else {
                me.hidden = true;
                me.el.addCls(floatCls);
                me.el.hide();
                me.collapsed = collapseDir;
                me.placeholder.show();
                slideInDirection = collapseDir.substr(0, 1);

                // Slide this Component's el back into place, after which we lay out AGAIN
                me.hidden = false;
                me.el.slideIn(slideInDirection, {
                    preserveScroll: true,
                    duration: Ext.Number.from(animate, Ext.fx.Anim.prototype.duration),
                    listeners: {
                        afteranimate: function() {
                            me.collapsed = false;

                            // the ordering of these two lines appears to be important in
                            // IE9.  There is an odd expand issue in IE 9 in the border layout
                            // example that causes the index1 child of the south dock region
                            // to get 'hidden' after a collapse / expand cycle.  See
                            // EXTJSIV-5318 for details
                            me.el.removeCls(floatCls);
                            me.placeholder.hide();

                            me.isCollapsingOrExpanding = 0;
                            me.fireEvent('expand', me);
                        }
                    }
                });
            }

        } else {
            me.isCollapsingOrExpanding = 0;
            me.fireEvent('expand', me);
        }

        return me;
    },

    /**
     * Invoked after the Panel is Expanded.
     *
     * @param {Boolean} animated
     *
     * @template
     * @protected
     */
    afterExpand: function(animated) {
        var me = this,
            ownerLayout = me.ownerLayout;

        me.isCollapsingOrExpanding = 0;
        if (me.collapseTool) {
            me.collapseTool.setType('collapse-' + me.collapseDirection);
        }

        if (ownerLayout && animated) {
            ownerLayout.onContentChange(me);
        }

        me.fireEvent('expand', me);
    },
    
    // inherit docs
    setBorder: function(border, targetEl) {
        if (targetEl) {
            // skip out here, the panel will set the border on the body/header during rendering
            return;
        }
        
        var me = this,
            header = me.header;
            
        if (!border) {
            border = 0;
        } else {
            border = Ext.Element.unitizeBox((border === true) ? 1 : border);
        }
        
        if (header) {
            if (header.isHeader) {
                header.setBorder(border);
            } else {
                header.border = border;
            }
        }
        
        if (me.rendered && me.bodyBorder !== false) {
            me.body.setStyle('border-width', border);
        }
        me.updateLayout();
        
        me.border = border;
    },

    /**
     * Shortcut for performing an {@link #method-expand} or {@link #method-collapse} based on the current state of the panel.
     * @return {Ext.panel.Panel} this
     */
    toggleCollapse: function() {
        return (this.collapsed || this.floatedFromCollapse) ? this.expand() : this.collapse();
    },

    // private
    getKeyMap : function() {
        return this.keyMap || (this.keyMap = new Ext.util.KeyMap(Ext.apply({
            target: this.el
        }, this.keys)));
    },

    // private
    initDraggable : function(){
        /**
         * @property {Ext.dd.DragSource} dd
         * If this Panel is configured {@link #cfg-draggable}, this property will contain an instance of {@link
         * Ext.dd.DragSource} which handles dragging the Panel.
         *
         * The developer must provide implementations of the abstract methods of {@link Ext.dd.DragSource} in order to
         * supply behaviour for each stage of the drag/drop process. See {@link #cfg-draggable}.
         */
        this.dd = new Ext.panel.DD(this, Ext.isBoolean(this.draggable) ? null : this.draggable);
    },

    // private - helper function for ghost
    ghostTools : function() {
        var tools = [],
            header = this.header,
            headerTools = header ? header.query('tool[hidden=false]') : [],
            t, tLen, tool;

        if (headerTools.length) {
            t = 0;
            tLen = headerTools.length;

            for (; t < tLen; t++) {
                tool = headerTools[t];

                // Some tools can be full components, and copying them into the ghost
                // actually removes them from the owning panel. You could also potentially
                // end up with duplicate DOM ids as well. To avoid any issues we just make
                // a simple bare-minimum clone of each tool for ghosting purposes.
                tools.push({
                    type: tool.type
                });
            }
        } else {
            tools = [{
                type: 'placeholder'
            }];
        }
        return tools;
    },

    // private - used for dragging
    ghost: function(cls) {
        var me = this,
            ghostPanel = me.ghostPanel,
            box = me.getBox(),
            header;

        if (!ghostPanel) {
            ghostPanel = new Ext.panel.Panel({
                renderTo: document.body,
                floating: {
                    shadow: false
                },
                frame: me.frame && !me.alwaysFramed,
                alwaysFramed: me.alwaysFramed,
                overlapHeader: me.overlapHeader,
                headerPosition: me.headerPosition,
                baseCls: me.baseCls,
                cls: me.baseCls + '-ghost ' + (cls ||'')
            });
            me.ghostPanel = ghostPanel;
        } else {
            ghostPanel.el.show();
        }
        ghostPanel.floatParent = me.floatParent;
        if (me.floating) {
            ghostPanel.setZIndex(Ext.Number.from(me.el.getStyle('zIndex'), 0));
        } else {
            ghostPanel.toFront();
        }
        if (!(me.preventHeader || (me.header === false))) {
            header = ghostPanel.header;
            // restore options
            if (header) {
                header.suspendLayouts();
                Ext.Array.forEach(header.query('tool'), header.remove, header);
                header.resumeLayouts();
            }
            ghostPanel.addTool(me.ghostTools());
            ghostPanel.setTitle(me.title);
            ghostPanel.setIconCls(me.iconCls);
        }

        ghostPanel.setPagePosition(box.x, box.y);
        ghostPanel.setSize(box.width, box.height);
        me.el.hide();
        return ghostPanel;
    },

    // private
    unghost: function(show, matchPosition) {
        var me = this;
        if (!me.ghostPanel) {
            return;
        }
        if (show !== false) {
            // Show el first, so that position adjustment in setPagePosition
            // will work when relative positioned elements have their XY read.
            me.el.show();
            if (matchPosition !== false) {
                me.setPagePosition(me.ghostPanel.el.getXY());
                if (me.hideMode == 'offsets') {
                    // clear the hidden style because we just repositioned
                    delete me.el.hideModeStyles;
                }
            }
            Ext.defer(me.focus, 10, me);
        }
        me.ghostPanel.el.hide();
    },

    beginDrag: function() {
        if (this.floatingDescendants) {
            this.floatingDescendants.hide();
        }
    },

    endDrag: function() {
        if (this.floatingDescendants) {
            this.floatingDescendants.show();
        }
    },

    initResizable: function(resizable) {
        if (this.collapsed) {
            resizable.disabled = true;
        }
        this.callParent([resizable]);
    }
}, function() {
    this.prototype.animCollapse = Ext.enableFx;
});



/**
 * A menu containing a Ext.picker.Color Component.
 *
 * Notes:
 *
 *   - Although not listed here, the **constructor** for this class accepts all of the
 *     configuration options of {@link Ext.picker.Color}.
 *   - If subclassing ColorMenu, any configuration options for the ColorPicker must be
 *     applied to the **initialConfig** property of the ColorMenu. Applying
 *     {@link Ext.picker.Color ColorPicker} configuration settings to `this` will **not**
 *     affect the ColorPicker's configuration.
 *
 * Example:
 *
 *     @example
 *     var colorPicker = Ext.create('Ext.menu.ColorPicker', {
 *         value: '000000'
 *     });
 *
 *     Ext.create('Ext.menu.Menu', {
 *         width: 100,
 *         height: 90,
 *         floating: false,  // usually you want this set to True (default)
 *         renderTo: Ext.getBody(),  // usually rendered by it's containing component
 *         items: [{
 *             text: 'choose a color',
 *             menu: colorPicker
 *         },{
 *             iconCls: 'add16',
 *             text: 'icon item'
 *         },{
 *             text: 'regular item'
 *         }]
 *     });
 */
 Ext.define('Ext.menu.ColorPicker', {
     extend: 'Ext.menu.Menu',

     alias: 'widget.colormenu',

     requires: [
        'Ext.picker.Color'
     ],

    /**
     * @cfg {Boolean} hideOnClick
     * False to continue showing the menu after a date is selected.
     */
    hideOnClick : true,

    /**
     * @cfg {String} pickerId
     * An id to assign to the underlying color picker.
     */
    pickerId : null,

    /**
     * @cfg {Number} maxHeight
     * @private
     */

    /**
     * @property {Ext.picker.Color} picker
     * The {@link Ext.picker.Color} instance for this ColorMenu
     */

    /**
     * @event click
     * @private
     */

    initComponent : function(){
        var me = this,
            cfg = Ext.apply({}, me.initialConfig);

        // Ensure we don't get duplicate listeners
        delete cfg.listeners;
        Ext.apply(me, {
            plain: true,
            showSeparator: false,
            items: Ext.applyIf({
                cls: Ext.baseCSSPrefix + 'menu-color-item',
                id: me.pickerId,
                xtype: 'colorpicker'
            }, cfg)
        });

        me.callParent(arguments);

        me.picker = me.down('colorpicker');

        /**
         * @event select
         * @inheritdoc Ext.picker.Color#select
         */
        me.relayEvents(me.picker, ['select']);

        if (me.hideOnClick) {
            me.on('select', me.hidePickerOnSelect, me);
        }
    },

    /**
     * Hides picker on select if hideOnClick is true
     * @private
     */
    hidePickerOnSelect: function() {
        Ext.menu.Manager.hideAll();
    }
 });
/**
 * A menu containing an Ext.picker.Date Component.
 *
 * Notes:
 *
 * - Although not listed here, the **constructor** for this class accepts all of the
 *   configuration options of **{@link Ext.picker.Date}**.
 * - If subclassing DateMenu, any configuration options for the DatePicker must be applied
 *   to the **initialConfig** property of the DateMenu. Applying {@link Ext.picker.Date Date Picker}
 *   configuration settings to **this** will **not** affect the Date Picker's configuration.
 *
 * Example:
 *
 *     @example
 *     var dateMenu = Ext.create('Ext.menu.DatePicker', {
 *         handler: function(dp, date){
 *             Ext.Msg.alert('Date Selected', 'You selected ' + Ext.Date.format(date, 'M j, Y'));
 *         }
 *     });
 *
 *     Ext.create('Ext.menu.Menu', {
 *         width: 100,
 *         height: 90,
 *         floating: false,  // usually you want this set to True (default)
 *         renderTo: Ext.getBody(),  // usually rendered by it's containing component
 *         items: [{
 *             text: 'choose a date',
 *             menu: dateMenu
 *         },{
 *             iconCls: 'add16',
 *             text: 'icon item'
 *         },{
 *             text: 'regular item'
 *         }]
 *     });
 */
 Ext.define('Ext.menu.DatePicker', {
     extend: 'Ext.menu.Menu',

     alias: 'widget.datemenu',

     requires: [
        'Ext.picker.Date'
     ],

    /**
     * @cfg {Boolean} hideOnClick
     * False to continue showing the menu after a date is selected.
     */
    hideOnClick : true,

    /**
     * @cfg {String} pickerId
     * An id to assign to the underlying date picker.
     */
    pickerId : null,

    /**
     * @cfg {Number} maxHeight
     * @private
     */

    /**
     * @property {Ext.picker.Date} picker
     * The {@link Ext.picker.Date} instance for this DateMenu
     */

    initComponent : function(){
        var me = this,
            cfg = Ext.apply({}, me.initialConfig);
            
        // Ensure we clear any listeners so they aren't duplicated
        delete cfg.listeners;
            
        Ext.apply(me, {
            showSeparator: false,
            plain: true,
            border: false,
            bodyPadding: 0, // remove the body padding from the datepicker menu item so it looks like 3.3
            items: Ext.applyIf({
                cls: Ext.baseCSSPrefix + 'menu-date-item',
                id: me.pickerId,
                xtype: 'datepicker'
            }, cfg)
        });

        me.callParent(arguments);

        me.picker = me.down('datepicker');
        /**
         * @event select
         * @inheritdoc Ext.picker.Date#select
         */
        me.relayEvents(me.picker, ['select']);

        if (me.hideOnClick) {
            me.on('select', me.hidePickerOnSelect, me);
        }
    },

    hidePickerOnSelect: function() {
        Ext.menu.Manager.hideAll();
    }
 });
/**
 * @author Nicolas Ferrero
 *
 * TablePanel is the basis of both {@link Ext.tree.Panel TreePanel} and {@link Ext.grid.Panel GridPanel}.
 *
 * TablePanel aggregates:
 *
 *  - a Selection Model
 *  - a View
 *  - a Store
 *  - Scrollers
 *  - Ext.grid.header.Container
 */
Ext.define('Ext.panel.Table', {
    extend: 'Ext.panel.Panel',

    alias: 'widget.tablepanel',

    uses: [
        'Ext.selection.RowModel',
        'Ext.selection.CellModel',
        'Ext.selection.CheckboxModel',
        'Ext.grid.PagingScroller',
        'Ext.grid.header.Container',
        'Ext.grid.Lockable'
    ],

    extraBaseCls: Ext.baseCSSPrefix + 'grid',
    extraBodyCls: Ext.baseCSSPrefix + 'grid-body',

    layout: 'fit',
    /**
     * @property {Boolean} hasView
     * True to indicate that a view has been injected into the panel.
     */
    hasView: false,

    // each panel should dictate what viewType and selType to use
    /**
     * @cfg {String} viewType
     * An xtype of view to use. This is automatically set to 'gridview' by {@link Ext.grid.Panel Grid}
     * and to 'treeview' by {@link Ext.tree.Panel Tree}.
     * @protected
     */
    viewType: null,

    /**
     * @cfg {Object} viewConfig
     * A config object that will be applied to the grid's UI view. Any of the config options available for
     * {@link Ext.view.Table} can be specified here. This option is ignored if {@link #view} is specified.
     */

    /**
     * @cfg {Ext.view.Table} view
     * The {@link Ext.view.Table} used by the grid. Use {@link #viewConfig} to just supply some config options to
     * view (instead of creating an entire View instance).
     */

    /**
     * @cfg {String} selType
     * An xtype of selection model to use. Defaults to 'rowmodel'. This is used to create selection model if just
     * a config object or nothing at all given in {@link #selModel} config.
     */
    selType: 'rowmodel',

    /**
     * @cfg {Ext.selection.Model/Object} selModel
     * A {@link Ext.selection.Model selection model} instance or config object.  In latter case the {@link #selType}
     * config option determines to which type of selection model this config is applied.
     */

    /**
     * @cfg {Boolean} [multiSelect=false]
     * True to enable 'MULTI' selection mode on selection model.
     * @deprecated 4.1.1 Use {@link Ext.selection.Model#mode} 'MULTI' instead.
     */

    /**
     * @cfg {Boolean} [simpleSelect=false]
     * True to enable 'SIMPLE' selection mode on selection model.
     * @deprecated 4.1.1 Use {@link Ext.selection.Model#mode} 'SIMPLE' instead.
     */

    /**
     * @cfg {Ext.data.Store} store (required)
     * The {@link Ext.data.Store Store} the grid should use as its data source.
     */

    /**
     * @cfg {String/Boolean} scroll
     * Scrollers configuration. Valid values are 'both', 'horizontal' or 'vertical'.
     * True implies 'both'. False implies 'none'.
     */
    scroll: true,

    /**
     * @cfg {Ext.grid.column.Column[]/Object} columns
     * An array of {@link Ext.grid.column.Column column} definition objects which define all columns that appear in this
     * grid. Each column definition provides the header text for the column, and a definition of where the data for that
     * column comes from.
     *
     * This can also be a configuration object for a {Ext.grid.header.Container HeaderContainer} which may override
     * certain default configurations if necessary. For example, the special layout may be overridden to use a simpler
     * layout, or one can set default values shared by all columns:
     * 
     *     columns: {
     *         items: [
     *             {
     *                 text: "Column A"
     *                 dataIndex: "field_A"
     *             },{
     *                 text: "Column B",
     *                 dataIndex: "field_B"
     *             }, 
     *             ...
     *         ],
     *         defaults: {
     *             flex: 1
     *         }
     *     }
     */

    /**
     * @cfg {Boolean} forceFit
     * Ttrue to force the columns to fit into the available width. Headers are first sized according to configuration,
     * whether that be a specific width, or flex. Then they are all proportionally changed in width so that the entire
     * content width is used. For more accurate control, it is more optimal to specify a flex setting on the columns
     * that are to be stretched & explicit widths on columns that are not.
     */

    /**
     * @cfg {Ext.grid.feature.Feature[]} features
     * An array of grid Features to be added to this grid. See {@link Ext.grid.feature.Feature} for usage.
     */

    /**
     * @cfg {Boolean} [hideHeaders=false]
     * True to hide column headers.
     */

    /**
     * @cfg {Boolean} deferRowRender
     * Defaults to true to enable deferred row rendering.
     *
     * This allows the View to execute a refresh quickly, with the expensive update of the row structure deferred so
     * that layouts with GridPanels appear, and lay out more quickly.
     */

    /**
     * @cfg {Object} verticalScroller
     * A config object to be used when configuring the {@link Ext.grid.PagingScroller scroll monitor} to control
     * refreshing of data in an "infinite grid".
     * 
     * Configurations of this object allow fine tuning of data caching which can improve performance and usability
     * of the infinite grid.
     */

    deferRowRender: true,
     
    /**
     * @cfg {Boolean} sortableColumns
     * False to disable column sorting via clicking the header and via the Sorting menu items.
     */
    sortableColumns: true,

    /**
     * @cfg {Boolean} [enableLocking=false]
     * True to enable locking support for this grid. Alternatively, locking will also be automatically
     * enabled if any of the columns in the column configuration contain the locked config option.
     */
    enableLocking: false,

    // private property used to determine where to go down to find views
    // this is here to support locking.
    scrollerOwner: true,

    /**
     * @cfg {Boolean} [enableColumnMove=true]
     * False to disable column dragging within this grid.
     */
    enableColumnMove: true,
    
    /**
     * @cfg {Boolean} [sealedColumns=false]
     * True to constrain column dragging so that a column cannot be dragged in or out of it's
     * current group. Only relevant while {@link #enableColumnMove} is enabled.
     */
    sealedColumns: false,

    /**
     * @cfg {Boolean} [enableColumnResize=true]
     * False to disable column resizing within this grid.
     */
    enableColumnResize: true,

    /**
     * @cfg {Boolean} [enableColumnHide=true]
     * False to disable column hiding within this grid.
     */
    enableColumnHide: true,

    /**
     * @cfg {Boolean} columnLines Adds column line styling
     */

    /**
     * @cfg {Boolean} [rowLines=true] Adds row line styling
     */
    rowLines: true,

    /**
     * @cfg {Boolean} [disableSelection=false]
     * True to disable selection model.
     */

    /**
     * @cfg {String} emptyText Default text (html tags are accepted) to display in the Panel body when the Store
     * is empty. When specified, and the Store is empty, the text will be rendered inside a DIV with the CSS class "x-grid-empty".
     */
    
    /**
     * @cfg {Boolean} [allowDeselect=false]
     * True to allow deselecting a record. This config is forwarded to {@link Ext.selection.Model#allowDeselect}.
     */

    /**
     * @property {Boolean} optimizedColumnMove
     * If you are writing a grid plugin or a {Ext.grid.feature.Feature Feature} which creates a column-based structure which
     * needs a view refresh when columns are moved, then set this property in the grid.
     *
     * An example is the built in {@link Ext.grid.feature.AbstractSummary Summary} Feature. This creates summary rows, and the
     * summary columns must be in the same order as the data columns. This plugin sets the `optimizedColumnMove` to `false.
     */

    initComponent: function() {
        if (!this.viewType) {
            Ext.Error.raise("You must specify a viewType config.");
        }
        if (this.headers) {
            Ext.Error.raise("The headers config is not supported. Please specify columns instead.");
        }

        var me          = this,
            scroll      = me.scroll,
            vertical    = false,
            horizontal  = false,
            headerCtCfg = me.columns || me.colModel,
            view,
            border = me.border,
            i, len;

        if (me.columnLines) {
            me.addCls(Ext.baseCSSPrefix + 'grid-with-col-lines');
        }

        if (me.rowLines) {
            me.addCls(Ext.baseCSSPrefix + 'grid-with-row-lines');
        }

        // Look up the configured Store. If none configured, use the fieldless, empty Store defined in Ext.data.Store.
        me.store = Ext.data.StoreManager.lookup(me.store || 'ext-empty-store');

        if (!headerCtCfg) {
            Ext.Error.raise("A column configuration must be specified");
        }

        // The columns/colModel config may be either a fully instantiated HeaderContainer, or an array of Column definitions, or a config object of a HeaderContainer
        // Either way, we extract a columns property referencing an array of Column definitions.
        if (headerCtCfg instanceof Ext.grid.header.Container) {
            me.headerCt = headerCtCfg;
            me.headerCt.border = border;
            me.columns = me.headerCt.items.items;
        } else {
            if (Ext.isArray(headerCtCfg)) {
                headerCtCfg = {
                    items: headerCtCfg,
                    border: border
                };
            }
            Ext.apply(headerCtCfg, {
                forceFit: me.forceFit,
                sortable: me.sortableColumns,
                enableColumnMove: me.enableColumnMove,
                enableColumnResize: me.enableColumnResize,
                enableColumnHide: me.enableColumnHide,
                border:  border,
                sealed: me.sealedColumns
            });
            me.columns = headerCtCfg.items;

             // If any of the Column objects contain a locked property, and are not processed, this is a lockable TablePanel, a
             // special view will be injected by the Ext.grid.Lockable mixin, so no processing of .
             if (me.enableLocking || Ext.ComponentQuery.query('{locked !== undefined}{processed != true}', me.columns).length) {
                 me.self.mixin('lockable', Ext.grid.Lockable);
                 me.injectLockable();
             }
        }

        me.scrollTask = new Ext.util.DelayedTask(me.syncHorizontalScroll, me);

        me.addEvents(
            // documented on GridPanel
            'reconfigure',
            /**
             * @event viewready
             * Fires when the grid view is available (use this for selecting a default row).
             * @param {Ext.panel.Table} this
             */
            'viewready'
        );

        me.bodyCls = me.bodyCls || '';
        me.bodyCls += (' ' + me.extraBodyCls);
        
        me.cls = me.cls || '';
        me.cls += (' ' + me.extraBaseCls);

        // autoScroll is not a valid configuration
        delete me.autoScroll;

        // If this TablePanel is lockable (Either configured lockable, or any of the defined columns has a 'locked' property)
        // than a special lockable view containing 2 side-by-side grids will have been injected so we do not need to set up any UI.
        if (!me.hasView) {

            // If we were not configured with a ready-made headerCt (either by direct config with a headerCt property, or by passing
            // a HeaderContainer instance as the 'columns' property, then go ahead and create one from the config object created above.
            if (!me.headerCt) {
                me.headerCt = new Ext.grid.header.Container(headerCtCfg);
            }

            // Extract the array of Column objects
            me.columns = me.headerCt.items.items;

            // If the Store is paging blocks of the dataset in, then it can only be sorted remotely.
            if (me.store.buffered && !me.store.remoteSort) {
                for (i = 0, len = me.columns.length; i < len; i++) {
                    me.columns[i].sortable = false;
                }
            }

            if (me.hideHeaders) {
                me.headerCt.height = 0;
                me.headerCt.addCls(Ext.baseCSSPrefix + 'grid-header-ct-hidden');
                me.addCls(Ext.baseCSSPrefix + 'grid-header-hidden');
                // IE Quirks Mode fix
                // If hidden configuration option was used, several layout calculations will be bypassed.
                if (Ext.isIEQuirks) {
                    me.headerCt.style = {
                        display: 'none'
                    };
                }
            }

            // turn both on.
            if (scroll === true || scroll === 'both') {
                vertical = horizontal = true;
            } else if (scroll === 'horizontal') {
                horizontal = true;
            } else if (scroll === 'vertical') {
                vertical = true;
            }

            me.relayHeaderCtEvents(me.headerCt);
            me.features = me.features || [];
            if (!Ext.isArray(me.features)) {
                me.features = [me.features];
            }
            me.dockedItems = [].concat(me.dockedItems || []);
            me.dockedItems.unshift(me.headerCt);
            me.viewConfig = me.viewConfig || {};

            // Buffered scrolling must preserve scroll on refresh
            if (me.store && me.store.buffered) {
                me.viewConfig.preserveScrollOnRefresh = true;
            } else if (me.invalidateScrollerOnRefresh !== undefined) {
                me.viewConfig.preserveScrollOnRefresh = !me.invalidateScrollerOnRefresh;
            }

            // AbstractDataView will look up a Store configured as an object
            // getView converts viewConfig into a View instance
            view = me.getView();

            me.items = [view];
            me.hasView = true;

            if (vertical) {
                // If the Store is buffered, create a PagingScroller to monitor the View's scroll progress,
                // load the Store's prefetch buffer when it detects we are nearing an edge.
                if (me.store.buffered) {
                    me.verticalScroller = new Ext.grid.PagingScroller(Ext.apply({
                        panel: me,
                        store: me.store,
                        view: me.view
                    }, me.verticalScroller));
                }
            }

            if (horizontal) {
                // Add a listener to synchronize the horizontal scroll position of the headers
                // with the table view's element... Unless we are not showing headers!
                if (!me.hideHeaders) {
                    view.on({
                        scroll: {
                            fn: me.onHorizontalScroll,
                            element: 'el',
                            scope: me
                        }
                    });
                }
            }

            me.mon(view.store, {
                load: me.onStoreLoad,
                scope: me
            });
            me.mon(view, {
                viewready: me.onViewReady,
                refresh: me.onRestoreHorzScroll,
                scope: me
            });
        }

        // Relay events from the View whether it be a LockingView, or a regular GridView
        this.relayEvents(me.view, [
            /**
             * @event beforeitemmousedown
             * @inheritdoc Ext.view.View#beforeitemmousedown
             */
            'beforeitemmousedown',
            /**
             * @event beforeitemmouseup
             * @inheritdoc Ext.view.View#beforeitemmouseup
             */
            'beforeitemmouseup',
            /**
             * @event beforeitemmouseenter
             * @inheritdoc Ext.view.View#beforeitemmouseenter
             */
            'beforeitemmouseenter',
            /**
             * @event beforeitemmouseleave
             * @inheritdoc Ext.view.View#beforeitemmouseleave
             */
            'beforeitemmouseleave',
            /**
             * @event beforeitemclick
             * @inheritdoc Ext.view.View#beforeitemclick
             */
            'beforeitemclick',
            /**
             * @event beforeitemdblclick
             * @inheritdoc Ext.view.View#beforeitemdblclick
             */
            'beforeitemdblclick',
            /**
             * @event beforeitemcontextmenu
             * @inheritdoc Ext.view.View#beforeitemcontextmenu
             */
            'beforeitemcontextmenu',
            /**
             * @event itemmousedown
             * @inheritdoc Ext.view.View#itemmousedown
             */
            'itemmousedown',
            /**
             * @event itemmouseup
             * @inheritdoc Ext.view.View#itemmouseup
             */
            'itemmouseup',
            /**
             * @event itemmouseenter
             * @inheritdoc Ext.view.View#itemmouseenter
             */
            'itemmouseenter',
            /**
             * @event itemmouseleave
             * @inheritdoc Ext.view.View#itemmouseleave
             */
            'itemmouseleave',
            /**
             * @event itemclick
             * @inheritdoc Ext.view.View#itemclick
             */
            'itemclick',
            /**
             * @event itemdblclick
             * @inheritdoc Ext.view.View#itemdblclick
             */
            'itemdblclick',
            /**
             * @event itemcontextmenu
             * @inheritdoc Ext.view.View#itemcontextmenu
             */
            'itemcontextmenu',
            /**
             * @event beforecontainermousedown
             * @inheritdoc Ext.view.View#beforecontainermousedown
             */
            'beforecontainermousedown',
            /**
             * @event beforecontainermouseup
             * @inheritdoc Ext.view.View#beforecontainermouseup
             */
            'beforecontainermouseup',
            /**
             * @event beforecontainermouseover
             * @inheritdoc Ext.view.View#beforecontainermouseover
             */
            'beforecontainermouseover',
            /**
             * @event beforecontainermouseout
             * @inheritdoc Ext.view.View#beforecontainermouseout
             */
            'beforecontainermouseout',
            /**
             * @event beforecontainerclick
             * @inheritdoc Ext.view.View#beforecontainerclick
             */
            'beforecontainerclick',
            /**
             * @event beforecontainerdblclick
             * @inheritdoc Ext.view.View#beforecontainerdblclick
             */
            'beforecontainerdblclick',
            /**
             * @event beforecontainercontextmenu
             * @inheritdoc Ext.view.View#beforecontainercontextmenu
             */
            'beforecontainercontextmenu',
            /**
             * @event containermouseup
             * @inheritdoc Ext.view.View#containermouseup
             */
            'containermouseup',
            /**
             * @event containermouseover
             * @inheritdoc Ext.view.View#containermouseover
             */
            'containermouseover',
            /**
             * @event containermouseout
             * @inheritdoc Ext.view.View#containermouseout
             */
            'containermouseout',
            /**
             * @event containerclick
             * @inheritdoc Ext.view.View#containerclick
             */
            'containerclick',
            /**
             * @event containerdblclick
             * @inheritdoc Ext.view.View#containerdblclick
             */
            'containerdblclick',
            /**
             * @event containercontextmenu
             * @inheritdoc Ext.view.View#containercontextmenu
             */
            'containercontextmenu',
            /**
             * @event selectionchange
             * @inheritdoc Ext.selection.Model#selectionchange
             */
            'selectionchange',
            /**
             * @event beforeselect
             * @inheritdoc Ext.selection.RowModel#beforeselect
             */
            'beforeselect',
            /**
             * @event select
             * @inheritdoc Ext.selection.RowModel#select
             */
            'select',
            /**
             * @event beforedeselect
             * @inheritdoc Ext.selection.RowModel#beforedeselect
             */
            'beforedeselect',
            /**
             * @event deselect
             * @inheritdoc Ext.selection.RowModel#deselect
             */
            'deselect'
        ]);

        me.callParent(arguments);
        me.addStateEvents(['columnresize', 'columnmove', 'columnhide', 'columnshow', 'sortchange']);

        if (me.headerCt) {
            me.headerCt.on('afterlayout', me.onRestoreHorzScroll, me);
        }
    },

    relayHeaderCtEvents: function (headerCt) {
        this.relayEvents(headerCt, [
            /**
             * @event columnresize
             * @inheritdoc Ext.grid.header.Container#columnresize
             */
            'columnresize',
            /**
             * @event columnmove
             * @inheritdoc Ext.grid.header.Container#columnmove
             */
            'columnmove',
            /**
             * @event columnhide
             * @inheritdoc Ext.grid.header.Container#columnhide
             */
            'columnhide',
            /**
             * @event columnshow
             * @inheritdoc Ext.grid.header.Container#columnshow
             */
            'columnshow',
            /**
             * @event sortchange
             * @inheritdoc Ext.grid.header.Container#sortchange
             */
            'sortchange'
        ]);
    },

    getState: function(){
        var me = this,
            state = me.callParent(),
            sorter = me.store.sorters.first();

        state = me.addPropertyToState(state, 'columns', (me.headerCt || me).getColumnsState());

        if (sorter) {
            state = me.addPropertyToState(state, 'sort', {
                property: sorter.property,
                direction: sorter.direction,
                root: sorter.root
            });
        }
        return state;
    },

    applyState: function(state) {
        var me = this,
            sorter = state.sort,
            store = me.store,
            columns = state.columns;

        delete state.columns;

        // Ensure superclass has applied *its* state.
        // AbstractComponent saves dimensions (and anchor/flex) plus collapsed state.
        me.callParent(arguments);

        if (columns) {
            (me.headerCt || me).applyColumnsState(columns);
        }

        if (sorter) {
            if (store.remoteSort) {
                // Pass false to prevent a sort from occurring
                store.sort({
                    property: sorter.property,
                    direction: sorter.direction,
                    root: sorter.root
                }, null, false);
            } else {
                store.sort(sorter.property, sorter.direction);
            }
        }
    },

    /**
     * Returns the store associated with this Panel.
     * @return {Ext.data.Store} The store
     */
    getStore: function(){
        return this.store;
    },

    /**
     * Gets the view for this panel.
     * @return {Ext.view.Table}
     */
    getView: function() {
        var me = this,
            sm;

        if (!me.view) {
            sm = me.getSelectionModel();
            me.view = Ext.widget(Ext.apply({}, me.viewConfig, {

                // Features need a reference to the grid, so configure a reference into the View
                grid: me,
                deferInitialRefresh: me.deferRowRender !== false,
                scroll: me.scroll,
                xtype: me.viewType,
                store: me.store,
                headerCt: me.headerCt,
                selModel: sm,
                features: me.features,
                panel: me,
                emptyText : me.emptyText ? '<div class="' + Ext.baseCSSPrefix + 'grid-empty">' + me.emptyText + '</div>' : ''
            }));

            // TableView's custom component layout, Ext.view.TableLayout requires a reference to the headerCt because it depends on the headerCt doing its work.
            me.view.getComponentLayout().headerCt = me.headerCt;

            me.mon(me.view, {
                uievent: me.processEvent,
                scope: me
            });
            sm.view = me.view;
            me.headerCt.view = me.view;
            me.relayEvents(me.view, [
                /**
                 * @event cellclick
                 * Fired when table cell is clicked.
                 * @param {Ext.view.Table} this
                 * @param {HTMLElement} td The TD element that was clicked.
                 * @param {Number} cellIndex
                 * @param {Ext.data.Model} record
                 * @param {HTMLElement} tr The TR element that was clicked.
                 * @param {Number} rowIndex
                 * @param {Ext.EventObject} e
                 */
                'cellclick',
                /**
                 * @event celldblclick
                 * Fired when table cell is double clicked.
                 * @param {Ext.view.Table} this
                 * @param {HTMLElement} td The TD element that was clicked.
                 * @param {Number} cellIndex
                 * @param {Ext.data.Model} record
                 * @param {HTMLElement} tr The TR element that was clicked.
                 * @param {Number} rowIndex
                 * @param {Ext.EventObject} e
                 */
                'celldblclick'
            ]);
        }
        return me.view;
    },

    /**
     * @private
     * autoScroll is never valid for all classes which extend TablePanel.
     */
    setAutoScroll: Ext.emptyFn,

    /**
     * @private
     * Processes UI events from the view. Propagates them to whatever internal Components need to process them.
     * @param {String} type Event type, eg 'click'
     * @param {Ext.view.Table} view TableView Component
     * @param {HTMLElement} cell Cell HtmlElement the event took place within
     * @param {Number} recordIndex Index of the associated Store Model (-1 if none)
     * @param {Number} cellIndex Cell index within the row
     * @param {Ext.EventObject} e Original event
     */
    processEvent: function(type, view, cell, recordIndex, cellIndex, e) {
        var me = this,
            header;

        if (cellIndex !== -1) {
            header = me.headerCt.getGridColumns()[cellIndex];
            return header.processEvent.apply(header, arguments);
        }
    },

    /**
     * This method is obsolete in 4.1. The closest equivalent in
     * 4.1 is {@link #doLayout}, but it is also possible that no
     * layout is needed.
     * @deprecated 4.1
     */
    determineScrollbars: function () {
        Ext.log.warn('Obsolete');
    },

    /**
     * This method is obsolete in 4.1. The closest equivalent in 4.1 is
     * {@link Ext.AbstractComponent#updateLayout}, but it is also possible that no layout
     * is needed.
     * @deprecated 4.1
     */
    invalidateScroller: function () {
        Ext.log.warn('Obsolete');
    },

    scrollByDeltaY: function(yDelta, animate) {
        this.getView().scrollBy(0, yDelta, animate);
    },

    scrollByDeltaX: function(xDelta, animate) {
        this.getView().scrollBy(xDelta, 0, animate);
    },

    afterCollapse: function() {
        var me = this;
        me.saveScrollPos();
        me.saveScrollPos();
        me.callParent(arguments);
    },

    afterExpand: function() {
        var me = this;
        me.callParent(arguments);
        me.restoreScrollPos();
        me.restoreScrollPos();
    },

    saveScrollPos: Ext.emptyFn,

    restoreScrollPos: Ext.emptyFn,
    
    onHeaderResize: function(){
        this.delayScroll();
    },

    // Update the view when a header moves
    onHeaderMove: function(headerCt, header, colsToMove, fromIdx, toIdx) {
        var me = this;

        // If there are Features or Plugins which create DOM which must match column order, they set the optimizedColumnMove flag to false.
        // In this case we must refresh the view on column move.
        if (me.optimizedColumnMove === false) {
            me.view.refresh();
        }

        // Simplest case for default DOM structure is just to swap the columns round in the view.
        else {
            me.view.moveColumn(fromIdx, toIdx, colsToMove);
        }
        me.delayScroll();
    },

    // Section onHeaderHide is invoked after view.
    onHeaderHide: function(headerCt, header) {
        this.delayScroll();
    },

    onHeaderShow: function(headerCt, header) {
        this.delayScroll();
    },
    
    delayScroll: function(){
        var target = this.getScrollTarget().el;
        if (target) {
            this.scrollTask.delay(10, null, null, [target.dom.scrollLeft]);
        }
    },

    /**
     * @private
     * Fires the TablePanel's viewready event when the view declares that its internal DOM is ready
     */
    onViewReady: function() {
         this.fireEvent('viewready', this);   
    },

    /**
     * @private
     * Tracks when things happen to the view and preserves the horizontal scroll position.
     */
    onRestoreHorzScroll: function() {
        var left = this.scrollLeftPos;
        if (left) {
            // We need to restore the body scroll position here
            this.syncHorizontalScroll(left, true);
        }
    },

    getScrollerOwner: function() {
        var rootCmp = this;
        if (!this.scrollerOwner) {
            rootCmp = this.up('[scrollerOwner]');
        }
        return rootCmp;
    },

    /**
     * Gets left hand side marker for header resizing.
     * @private
     */
    getLhsMarker: function() {
        var me = this;
        return me.lhsMarker || (me.lhsMarker = Ext.DomHelper.append(me.el, {
            cls: Ext.baseCSSPrefix + 'grid-resize-marker'
        }, true));
    },

    /**
     * Gets right hand side marker for header resizing.
     * @private
     */
    getRhsMarker: function() {
        var me = this;

        return me.rhsMarker || (me.rhsMarker = Ext.DomHelper.append(me.el, {
            cls: Ext.baseCSSPrefix + 'grid-resize-marker'
        }, true));
    },

    /**
     * Returns the selection model being used and creates it via the configuration if it has not been created already.
     * @return {Ext.selection.Model} selModel
     */
    getSelectionModel: function(){
        if (!this.selModel) {
            this.selModel = {};
        }

        var mode = 'SINGLE',
            type;
        if (this.simpleSelect) {
            mode = 'SIMPLE';
        } else if (this.multiSelect) {
            mode = 'MULTI';
        }

        Ext.applyIf(this.selModel, {
            allowDeselect: this.allowDeselect,
            mode: mode
        });

        if (!this.selModel.events) {
            type = this.selModel.selType || this.selType;
            this.selModel = Ext.create('selection.' + type, this.selModel);
        }

        if (!this.selModel.hasRelaySetup) {
            this.relayEvents(this.selModel, [
                'selectionchange', 'beforeselect', 'beforedeselect', 'select', 'deselect'
            ]);
            this.selModel.hasRelaySetup = true;
        }

        // lock the selection model if user
        // has disabled selection
        if (this.disableSelection) {
            this.selModel.locked = true;
        }
        return this.selModel;
    },
    
    getScrollTarget: function(){
        var owner = this.getScrollerOwner(),
            items = owner.query('tableview');
            
        return items[1] || items[0];
    },

    onHorizontalScroll: function(event, target) {
        this.syncHorizontalScroll(target.scrollLeft);
    },
    
    syncHorizontalScroll: function(left, setBody) {
        var me = this,
            scrollTarget;
            
        setBody = setBody === true;
        // Only set the horizontal scroll if we've changed position,
        // so that we don't set this on vertical scrolls
        if (me.rendered && (setBody || left !== me.scrollLeftPos)) {
            // Only set the body position if we're reacting to a refresh, otherwise
            // we just need to set the header.
            if (setBody) {   
                scrollTarget = me.getScrollTarget();
                scrollTarget.el.dom.scrollLeft = left;
            }
            me.headerCt.el.dom.scrollLeft = left;
            me.scrollLeftPos = left;
        }
    },

    // template method meant to be overriden
    onStoreLoad: Ext.emptyFn,

    getEditorParent: function() {
        return this.body;
    },

    bindStore: function(store) {
        var me = this;
        me.store = store;
        me.getView().bindStore(store);
    },
    
    beforeDestroy: function(){
        Ext.destroy(this.verticalScroller);
        this.callParent();    
    },

    // documented on GridPanel
    reconfigure: function(store, columns) {
        var me = this,
            headerCt = me.headerCt;

        if (me.lockable) {
            me.reconfigureLockable(store, columns);
        } else {
            Ext.suspendLayouts();
            if (columns) {
                // new columns, delete scroll pos
                delete me.scrollLeftPos;
                headerCt.removeAll();
                headerCt.add(columns);
            }
            if (store) {
                store = Ext.StoreManager.lookup(store);
                me.bindStore(store);
            } else {
                me.getView().refresh();
            }
            headerCt.setSortState();
            Ext.resumeLayouts(true);
        }
        me.fireEvent('reconfigure', me, store, columns);
    }
});



/**
 * This class is used to display small visual icons in the header of a panel. There are a set of
 * 25 icons that can be specified by using the {@link #type} config. The {@link #handler} config
 * can be used to provide a function that will respond to any click events. In general, this class
 * will not be instantiated directly, rather it will be created by specifying the {@link Ext.panel.Panel#tools}
 * configuration on the Panel itself.
 *
 *     @example
 *     Ext.create('Ext.panel.Panel', {
 *         width: 200,
 *         height: 200,
 *         renderTo: document.body,
 *         title: 'A Panel',
 *         tools: [{
 *             type: 'help',
 *             handler: function(){
 *                 // show help here
 *             }
 *         }, {
 *             itemId: 'refresh',
 *             type: 'refresh',
 *             hidden: true,
 *             handler: function(){
 *                 // do refresh
 *             }
 *         }, {
 *             type: 'search',
 *             handler: function(event, target, owner, tool){
 *                 // do search
 *                 owner.child('#refresh').show();
 *             }
 *         }]
 *     });
 */
Ext.define('Ext.panel.Tool', {
    extend: 'Ext.Component',
    requires: ['Ext.tip.QuickTipManager'],
    alias: 'widget.tool',

    baseCls: Ext.baseCSSPrefix + 'tool',
    disabledCls: Ext.baseCSSPrefix + 'tool-disabled',
    
    /**
     * @cfg
     * @private
     */
    toolPressedCls: Ext.baseCSSPrefix + 'tool-pressed',
    /**
     * @cfg
     * @private
     */
    toolOverCls: Ext.baseCSSPrefix + 'tool-over',

    ariaRole: 'button',

    childEls: [
        'toolEl'
    ],

    renderTpl: [
        '<img id="{id}-toolEl" src="{blank}" class="{baseCls}-{type}" role="presentation"/>'
    ],

    /**
     * @cfg {Function} handler
     * A function to execute when the tool is clicked. Arguments passed are:
     *
     * - **event** : Ext.EventObject - The click event.
     * - **toolEl** : Ext.Element - The tool Element.
     * - **owner** : Ext.panel.Header - The host panel header.
     * - **tool** : Ext.panel.Tool - The tool object
     */

    /**
     * @cfg {Object} scope
     * The scope to execute the {@link #handler} function. Defaults to the tool.
     */

    /**
     * @cfg {String} type
     * The type of tool to render. The following types are available:
     *
     * - <span class="x-tool"><img src="data:image/gif;base64,R0lGODlhAQABAID/AMDAwAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" class="x-tool-close"></span> close
     * - <span class="x-tool"><img src="data:image/gif;base64,R0lGODlhAQABAID/AMDAwAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" class="x-tool-minimize"></span> minimize
     * - <span class="x-tool"><img src="data:image/gif;base64,R0lGODlhAQABAID/AMDAwAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" class="x-tool-maximize"></span> maximize
     * - <span class="x-tool"><img src="data:image/gif;base64,R0lGODlhAQABAID/AMDAwAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" class="x-tool-restore"></span> restore
     * - <span class="x-tool"><img src="data:image/gif;base64,R0lGODlhAQABAID/AMDAwAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" class="x-tool-toggle"></span> toggle
     * - <span class="x-tool"><img src="data:image/gif;base64,R0lGODlhAQABAID/AMDAwAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" class="x-tool-gear"></span> gear
     * - <span class="x-tool"><img src="data:image/gif;base64,R0lGODlhAQABAID/AMDAwAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" class="x-tool-prev"></span> prev
     * - <span class="x-tool"><img src="data:image/gif;base64,R0lGODlhAQABAID/AMDAwAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" class="x-tool-next"></span> next
     * - <span class="x-tool"><img src="data:image/gif;base64,R0lGODlhAQABAID/AMDAwAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" class="x-tool-pin"></span> pin
     * - <span class="x-tool"><img src="data:image/gif;base64,R0lGODlhAQABAID/AMDAwAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" class="x-tool-unpin"></span> unpin
     * - <span class="x-tool"><img src="data:image/gif;base64,R0lGODlhAQABAID/AMDAwAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" class="x-tool-right"></span> right
     * - <span class="x-tool"><img src="data:image/gif;base64,R0lGODlhAQABAID/AMDAwAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" class="x-tool-left"></span> left
     * - <span class="x-tool"><img src="data:image/gif;base64,R0lGODlhAQABAID/AMDAwAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" class="x-tool-down"></span> down
     * - <span class="x-tool"><img src="data:image/gif;base64,R0lGODlhAQABAID/AMDAwAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" class="x-tool-up"></span> up
     * - <span class="x-tool"><img src="data:image/gif;base64,R0lGODlhAQABAID/AMDAwAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" class="x-tool-refresh"></span> refresh
     * - <span class="x-tool"><img src="data:image/gif;base64,R0lGODlhAQABAID/AMDAwAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" class="x-tool-plus"></span> plus
     * - <span class="x-tool"><img src="data:image/gif;base64,R0lGODlhAQABAID/AMDAwAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" class="x-tool-minus"></span> minus
     * - <span class="x-tool"><img src="data:image/gif;base64,R0lGODlhAQABAID/AMDAwAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" class="x-tool-search"></span> search
     * - <span class="x-tool"><img src="data:image/gif;base64,R0lGODlhAQABAID/AMDAwAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" class="x-tool-save"></span> save
     * - <span class="x-tool"><img src="data:image/gif;base64,R0lGODlhAQABAID/AMDAwAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" class="x-tool-help"></span> help
     * - <span class="x-tool"><img src="data:image/gif;base64,R0lGODlhAQABAID/AMDAwAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" class="x-tool-print"></span> print
     * - <span class="x-tool"><img src="data:image/gif;base64,R0lGODlhAQABAID/AMDAwAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" class="x-tool-expand"></span> expand
     * - <span class="x-tool"><img src="data:image/gif;base64,R0lGODlhAQABAID/AMDAwAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" class="x-tool-collapse"></span> collapse
     */

    /**
     * @cfg {String/Object} tooltip
     * The tooltip for the tool - can be a string to be used as innerHTML (html tags are accepted) or QuickTips config
     * object
     */

     /**
     * @cfg {String} tooltipType
     * The type of tooltip to use. Either 'qtip' (default) for QuickTips or 'title' for title attribute.
     */
    tooltipType: 'qtip',

    /**
     * @cfg {Boolean} stopEvent
     * Specify as false to allow click event to propagate.
     */
    stopEvent: true,
    
    height: 15,
    width: 15,

    _toolTypes: {
        close:1,
        collapse:1,
        down:1,
        expand:1,
        gear:1,
        help:1,
        left:1,
        maximize:1,
        minimize:1,
        minus:1,
        //move:1,
        next:1,
        pin:1,
        plus:1,
        prev:1,
        print:1,
        refresh:1,
        //resize:1,
        restore:1,
        right:1,
        save:1,
        search:1,
        toggle:1,
        unpin:1,
        up:1
    },

    initComponent: function() {
        var me = this;
        me.addEvents(
            /**
             * @event click
             * Fires when the tool is clicked
             * @param {Ext.panel.Tool} this
             * @param {Ext.EventObject} e The event object
             */
            'click'
        );

        if (me.id && me._toolTypes[me.id] && Ext.global.console) {
            Ext.global.console.warn('When specifying a tool you should use the type option, the id can conflict now that tool is a Component');
        }

        me.type = me.type || me.id;

        Ext.applyIf(me.renderData, {
            baseCls: me.baseCls,
            blank: Ext.BLANK_IMAGE_URL,
            type: me.type
        });

        // alias qtip, should use tooltip since it's what we have in the docs
        me.tooltip = me.tooltip || me.qtip;
        me.callParent();
        me.on({
            element: 'toolEl',
            click: me.onClick,
            mousedown: me.onMouseDown,
            mouseover: me.onMouseOver,
            mouseout: me.onMouseOut,
            scope: me
        });
    },

    // inherit docs
    afterRender: function() {
        var me = this,
            attr;

        me.callParent(arguments);
        if (me.tooltip) {
            if (Ext.isObject(me.tooltip)) {
                Ext.tip.QuickTipManager.register(Ext.apply({
                    target: me.id
                }, me.tooltip));
            }
            else {
                attr = me.tooltipType == 'qtip' ? 'data-qtip' : 'title';
                me.toolEl.dom.setAttribute(attr, me.tooltip);
            }
        }
    },

    getFocusEl: function() {
        return this.el;
    },

    /**
     * Sets the type of the tool. Allows the icon to be changed.
     * @param {String} type The new type. See the {@link #type} config.
     * @return {Ext.panel.Tool} this
     */
    setType: function(type) {
        var me = this;

        me.type = type;
        if (me.rendered) {
            me.toolEl.dom.className = me.baseCls + '-' + type;
        }
        return me;
    },

    /**
     * Binds this tool to a component.
     * @private
     * @param {Ext.Component} component The component
     */
    bindTo: function(component) {
        this.owner = component;
    },

    /**
     * Called when the tool element is clicked
     * @private
     * @param {Ext.EventObject} e
     * @param {HTMLElement} target The target element
     */
    onClick: function(e, target) {
        var me = this,
            owner;

        if (me.disabled) {
            return false;
        }
        owner = me.owner || me.ownerCt;

        //remove the pressed + over class
        me.el.removeCls(me.toolPressedCls);
        me.el.removeCls(me.toolOverCls);

        if (me.stopEvent !== false) {
            e.stopEvent();
        }

        Ext.callback(me.handler, me.scope || me, [e, target, owner, me]);
        me.fireEvent('click', me, e);
        return true;
    },

    // inherit docs
    onDestroy: function(){
        if (Ext.isObject(this.tooltip)) {
            Ext.tip.QuickTipManager.unregister(this.id);
        }
        this.callParent();
    },

    /**
     * Called when the user presses their mouse button down on a tool
     * Adds the press class ({@link #toolPressedCls})
     * @private
     */
    onMouseDown: function() {
        if (this.disabled) {
            return false;
        }

        this.el.addCls(this.toolPressedCls);
    },

    /**
     * Called when the user rolls over a tool
     * Adds the over class ({@link #toolOverCls})
     * @private
     */
    onMouseOver: function() {
        if (this.disabled) {
            return false;
        }
        this.el.addCls(this.toolOverCls);
    },

    /**
     * Called when the user rolls out from a tool.
     * Removes the over class ({@link #toolOverCls})
     * @private
     */
    onMouseOut: function() {
        this.el.removeCls(this.toolOverCls);
    }
});
