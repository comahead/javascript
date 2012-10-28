
/**
 * A non-rendering placeholder item which instructs the Toolbar's Layout to begin using
 * the right-justified button container.
 *
 *     @example
 *     Ext.create('Ext.panel.Panel', {
 *          title: 'Toolbar Fill Example',
 *          width: 300,
 *          height: 200,
 *          tbar : [
 *              'Item 1',
 *              { xtype: 'tbfill' },
 *              'Item 2'
 *          ],
 *          renderTo: Ext.getBody()
 *      });
 */
Ext.define('Ext.toolbar.Fill', {
    extend: 'Ext.Component',
    alias: 'widget.tbfill',
    alternateClassName: 'Ext.Toolbar.Fill',
    /**
     * @property {Boolean} isFill
     * `true` in this class to identify an object as an instantiated Fill, or subclass thereof.
     */
    isFill : true,
    flex: 1
});
/**
 * The base class that other non-interacting Toolbar Item classes should extend in order to
 * get some basic common toolbar item functionality.
 */
Ext.define('Ext.toolbar.Item', {
    extend: 'Ext.Component',
    alias: 'widget.tbitem',
    alternateClassName: 'Ext.Toolbar.Item',
    enable:Ext.emptyFn,
    disable:Ext.emptyFn,
    focus:Ext.emptyFn
    /**
     * @cfg {String} overflowText
     * Text to be used for the menu if the item is overflowed.
     */
});
/**
 * A simple class that adds a vertical separator bar between toolbar items (css class: 'x-toolbar-separator').
 *
 *     @example
 *     Ext.create('Ext.panel.Panel', {
 *         title: 'Toolbar Separator Example',
 *         width: 300,
 *         height: 200,
 *         tbar : [
 *             'Item 1',
 *             { xtype: 'tbseparator' },
 *             'Item 2'
 *         ],
 *         renderTo: Ext.getBody()
 *     });
 */
Ext.define('Ext.toolbar.Separator', {
    extend: 'Ext.toolbar.Item',
    alias: 'widget.tbseparator',
    alternateClassName: 'Ext.Toolbar.Separator',
    baseCls: Ext.baseCSSPrefix + 'toolbar-separator',
    focusable: false,
    // Force border: true so container border is not set on this
    border: true
});




/**
 * A simple element that adds extra horizontal space between items in a toolbar.
 * By default a 2px wide space is added via CSS specification:
 *
 *     .x-toolbar .x-toolbar-spacer {
 *         width: 2px;
 *     }
 *
 * Example:
 *
 *     @example
 *     Ext.create('Ext.panel.Panel', {
 *         title: 'Toolbar Spacer Example',
 *         width: 300,
 *         height: 200,
 *         tbar : [
 *             'Item 1',
 *             { xtype: 'tbspacer' }, // or ' '
 *             'Item 2',
 *             // space width is also configurable via javascript
 *             { xtype: 'tbspacer', width: 50 }, // add a 50px space
 *             'Item 3'
 *         ],
 *         renderTo: Ext.getBody()
 *     });
 */
Ext.define('Ext.toolbar.Spacer', {
    extend: 'Ext.Component',
    alias: 'widget.tbspacer',
    alternateClassName: 'Ext.Toolbar.Spacer',
    baseCls: Ext.baseCSSPrefix + 'toolbar-spacer',
    focusable: false
});
/**
 * A simple class that renders text directly into a toolbar.
 *
 *     @example
 *     Ext.create('Ext.panel.Panel', {
 *         title: 'Panel with TextItem',
 *         width: 300,
 *         height: 200,
 *         tbar: [
 *             { xtype: 'tbtext', text: 'Sample Text Item' }
 *         ],
 *         renderTo: Ext.getBody()
 *     });
 *
 * @constructor
 * Creates a new TextItem
 * @param {Object} text A text string, or a config object containing a #text property
 */
Ext.define('Ext.toolbar.TextItem', {
    extend: 'Ext.toolbar.Item',
    requires: ['Ext.XTemplate'],
    alias: 'widget.tbtext',
    alternateClassName: 'Ext.Toolbar.TextItem',

    /**
     * @cfg {String} text
     * The text to be used as innerHTML (html tags are accepted).
     */
    text: '',

    renderTpl: '{text}',
    //
    baseCls: Ext.baseCSSPrefix + 'toolbar-text',

    beforeRender : function() {
        var me = this;

        me.callParent();

        Ext.apply(me.renderData, {
            text: me.text
        });
    },

    /**
     * Updates this item's text, setting the text to be used as innerHTML.
     * @param {String} text The text to display (html accepted).
     */
    setText : function(text) {
        var me = this;
        if (me.rendered) {
            me.el.update(text);
            me.updateLayout();
        } else {
            this.text = text;
        }
    }
});
/**
 * Basic Toolbar class. Although the {@link Ext.container.Container#defaultType defaultType} for
 * Toolbar is {@link Ext.button.Button button}, Toolbar elements (child items for the Toolbar container)
 * may be virtually any type of Component. Toolbar elements can be created explicitly via their
 * constructors, or implicitly via their xtypes, and can be {@link #method-add}ed dynamically.
 *
 * ## Some items have shortcut strings for creation:
 *
 * | Shortcut | xtype         | Class                         | Description
 * |:---------|:--------------|:------------------------------|:---------------------------------------------------
 * | `->`     | `tbfill`      | {@link Ext.toolbar.Fill}      | begin using the right-justified button container
 * | `-`      | `tbseparator` | {@link Ext.toolbar.Separator} | add a vertical separator bar between toolbar items
 * | ` `      | `tbspacer`    | {@link Ext.toolbar.Spacer}    | add horiztonal space between elements
 *
 *     @example
 *     Ext.create('Ext.toolbar.Toolbar', {
 *         renderTo: document.body,
 *         width   : 500,
 *         items: [
 *             {
 *                 // xtype: 'button', // default for Toolbars
 *                 text: 'Button'
 *             },
 *             {
 *                 xtype: 'splitbutton',
 *                 text : 'Split Button'
 *             },
 *             // begin using the right-justified button container
 *             '->', // same as { xtype: 'tbfill' }
 *             {
 *                 xtype    : 'textfield',
 *                 name     : 'field1',
 *                 emptyText: 'enter search term'
 *             },
 *             // add a vertical separator bar between toolbar items
 *             '-', // same as {xtype: 'tbseparator'} to create Ext.toolbar.Separator
 *             'text 1', // same as {xtype: 'tbtext', text: 'text1'} to create Ext.toolbar.TextItem
 *             { xtype: 'tbspacer' },// same as ' ' to create Ext.toolbar.Spacer
 *             'text 2',
 *             { xtype: 'tbspacer', width: 50 }, // add a 50px space
 *             'text 3'
 *         ]
 *     });
 *
 * Toolbars have {@link #method-enable} and {@link #method-disable} methods which when called, will
 * enable/disable all items within your toolbar.
 *
 *     @example
 *     Ext.create('Ext.toolbar.Toolbar', {
 *         renderTo: document.body,
 *         width   : 400,
 *         items: [
 *             {
 *                 text: 'Button'
 *             },
 *             {
 *                 xtype: 'splitbutton',
 *                 text : 'Split Button'
 *             },
 *             '->',
 *             {
 *                 xtype    : 'textfield',
 *                 name     : 'field1',
 *                 emptyText: 'enter search term'
 *             }
 *         ]
 *     });
 *
 * Example
 *
 *     @example
 *     var enableBtn = Ext.create('Ext.button.Button', {
 *         text    : 'Enable All Items',
 *         disabled: true,
 *         scope   : this,
 *         handler : function() {
 *             //disable the enable button and enable the disable button
 *             enableBtn.disable();
 *             disableBtn.enable();
 *
 *             //enable the toolbar
 *             toolbar.enable();
 *         }
 *     });
 *
 *     var disableBtn = Ext.create('Ext.button.Button', {
 *         text    : 'Disable All Items',
 *         scope   : this,
 *         handler : function() {
 *             //enable the enable button and disable button
 *             disableBtn.disable();
 *             enableBtn.enable();
 *
 *             //disable the toolbar
 *             toolbar.disable();
 *         }
 *     });
 *
 *     var toolbar = Ext.create('Ext.toolbar.Toolbar', {
 *         renderTo: document.body,
 *         width   : 400,
 *         margin  : '5 0 0 0',
 *         items   : [enableBtn, disableBtn]
 *     });
 *
 * Adding items to and removing items from a toolbar is as simple as calling the {@link #method-add}
 * and {@link #method-remove} methods. There is also a {@link #removeAll} method
 * which remove all items within the toolbar.
 *
 *     @example
 *     var toolbar = Ext.create('Ext.toolbar.Toolbar', {
 *         renderTo: document.body,
 *         width   : 700,
 *         items: [
 *             {
 *                 text: 'Example Button'
 *             }
 *         ]
 *     });
 *
 *     var addedItems = [];
 *
 *     Ext.create('Ext.toolbar.Toolbar', {
 *         renderTo: document.body,
 *         width   : 700,
 *         margin  : '5 0 0 0',
 *         items   : [
 *             {
 *                 text   : 'Add a button',
 *                 scope  : this,
 *                 handler: function() {
 *                     var text = prompt('Please enter the text for your button:');
 *                     addedItems.push(toolbar.add({
 *                         text: text
 *                     }));
 *                 }
 *             },
 *             {
 *                 text   : 'Add a text item',
 *                 scope  : this,
 *                 handler: function() {
 *                     var text = prompt('Please enter the text for your item:');
 *                     addedItems.push(toolbar.add(text));
 *                 }
 *             },
 *             {
 *                 text   : 'Add a toolbar separator',
 *                 scope  : this,
 *                 handler: function() {
 *                     addedItems.push(toolbar.add('-'));
 *                 }
 *             },
 *             {
 *                 text   : 'Add a toolbar spacer',
 *                 scope  : this,
 *                 handler: function() {
 *                     addedItems.push(toolbar.add('->'));
 *                 }
 *             },
 *             '->',
 *             {
 *                 text   : 'Remove last inserted item',
 *                 scope  : this,
 *                 handler: function() {
 *                     if (addedItems.length) {
 *                         toolbar.remove(addedItems.pop());
 *                     } else if (toolbar.items.length) {
 *                         toolbar.remove(toolbar.items.last());
 *                     } else {
 *                         alert('No items in the toolbar');
 *                     }
 *                 }
 *             },
 *             {
 *                 text   : 'Remove all items',
 *                 scope  : this,
 *                 handler: function() {
 *                     toolbar.removeAll();
 *                 }
 *             }
 *         ]
 *     });
 *
 * @constructor
 * Creates a new Toolbar
 * @param {Object/Object[]} config A config object or an array of buttons to {@link #method-add}
 * @docauthor Robert Dougan <rob@sencha.com>
 */
Ext.define('Ext.toolbar.Toolbar', {
    extend: 'Ext.container.Container',
    requires: [
        'Ext.toolbar.Fill',
        'Ext.layout.container.HBox',
        'Ext.layout.container.VBox'
    ],
    uses: [
        'Ext.toolbar.Separator'
    ],
    alias: 'widget.toolbar',
    alternateClassName: 'Ext.Toolbar',

    /**
     * @property {Boolean} isToolbar
     * `true` in this class to identify an object as an instantiated Toolbar, or subclass thereof.
     */
    isToolbar: true,
    baseCls  : Ext.baseCSSPrefix + 'toolbar',
    ariaRole : 'toolbar',

    defaultType: 'button',

    /**
     * @cfg {Boolean} vertical
     * Set to `true` to make the toolbar vertical. The layout will become a `vbox`.
     */
    vertical: false,

    /**
     * @cfg {String/Object} layout
     * This class assigns a default layout (`layout: 'hbox'`).
     * Developers _may_ override this configuration option if another layout
     * is required (the constructor must be passed a configuration object in this
     * case instead of an array).
     * See {@link Ext.container.Container#layout} for additional information.
     */

    /**
     * @cfg {Boolean} enableOverflow
     * Configure true to make the toolbar provide a button which activates a dropdown Menu to show
     * items which overflow the Toolbar's width.
     */
    enableOverflow: false,

    /**
     * @cfg {String} menuTriggerCls
     * Configure the icon class of the overflow button.
     */
    menuTriggerCls: Ext.baseCSSPrefix + 'toolbar-more-icon',
    
    // private
    trackMenus: true,

    itemCls: Ext.baseCSSPrefix + 'toolbar-item',

    statics: {
        shortcuts: {
            '-' : 'tbseparator',
            ' ' : 'tbspacer'
        },

        shortcutsHV: {
            // horizontal
            0: {
                '->': { xtype: 'tbfill', height: 0 }
            },
            // vertical
            1: {
                '->': { xtype: 'tbfill', width: 0 }
            }
        }
    },

    initComponent: function() {
        var me = this,
            keys;

        // check for simplified (old-style) overflow config:
        if (!me.layout && me.enableOverflow) {
            me.layout = { overflowHandler: 'Menu' };
        }

        if (me.dock === 'right' || me.dock === 'left') {
            me.vertical = true;
        }

        me.layout = Ext.applyIf(Ext.isString(me.layout) ? {
            type: me.layout
        } : me.layout || {}, {
            type: me.vertical ? 'vbox' : 'hbox',
            align: me.vertical ? 'stretchmax' : 'middle'
        });

        if (me.vertical) {
            me.addClsWithUI('vertical');
        }

        // @TODO: remove this hack and implement a more general solution
        if (me.ui === 'footer') {
            me.ignoreBorderManagement = true;
        }

        me.callParent();

        /**
         * @event overflowchange
         * Fires after the overflow state has changed.
         * @param {Object} c The Container
         * @param {Boolean} lastOverflow overflow state
         */
        me.addEvents('overflowchange');
    },

    getRefItems: function(deep) {
        var me = this,
            items = me.callParent(arguments),
            layout = me.layout,
            handler;

        if (deep && me.enableOverflow) {
            handler = layout.overflowHandler;
            if (handler && handler.menu) {
                items = items.concat(handler.menu.getRefItems(deep));
            }
        }
        return items;
    },

    /**
     * Adds element(s) to the toolbar -- this function takes a variable number of
     * arguments of mixed type and adds them to the toolbar.
     *
     * **Note**: See the notes within {@link Ext.container.Container#method-add}.
     *
     * @param {Object...} args The following types of arguments are all valid:
     *
     *  - `{@link Ext.button.Button config}`: A valid button config object
     *  - `HtmlElement`: Any standard HTML element
     *  - `Field`: Any form field
     *  - `Item`: Any subclass of {@link Ext.toolbar.Item}
     *  - `String`: Any generic string (gets wrapped in a {@link Ext.toolbar.TextItem}).
     *
     *    Note that there are a few special strings that are treated differently as explained next:
     *
     *      - `'-'`: Creates a separator element
     *      - `' '`: Creates a spacer element
     *      - `'->'`: Creates a fill element
     *
     * @method add
     */

    // private
    lookupComponent: function(c) {
        if (typeof c == 'string') {
            var T = Ext.toolbar.Toolbar,
                shortcut = T.shortcutsHV[this.vertical ? 1 : 0][c] || T.shortcuts[c];

            if (typeof shortcut == 'string') {
                c = {
                    xtype: shortcut
                };
            } else if (shortcut) {
                c = Ext.apply({}, shortcut);
            } else {
                c = {
                    xtype: 'tbtext',
                    text: c
                };
            }

            this.applyDefaults(c);
        }

        return this.callParent(arguments);
    },

    // private
    applyDefaults: function(c) {
        if (!Ext.isString(c)) {
            c = this.callParent(arguments);
        }
        return c;
    },

    // private
    trackMenu: function(item, remove) {
        if (this.trackMenus && item.menu) {
            var method = remove ? 'mun' : 'mon',
                me = this;

            me[method](item, 'mouseover', me.onButtonOver, me);
            me[method](item, 'menushow', me.onButtonMenuShow, me);
            me[method](item, 'menuhide', me.onButtonMenuHide, me);
        }
    },

    // private
    constructButton: function(item) {
        return item.events ? item
                : Ext.widget(item.split ? 'splitbutton' : this.defaultType, item);
    },

    // private
    onBeforeAdd: function(component) {
        if (component.is('field') || (component.is('button') && this.ui != 'footer')) {
            component.ui = component.ui + '-toolbar';
        }

        // Any separators needs to know if is vertical or not
        if (component instanceof Ext.toolbar.Separator) {
            component.setUI((this.vertical) ? 'vertical' : 'horizontal');
        }

        this.callParent(arguments);
    },

    // private
    onAdd: function(component) {
        this.callParent(arguments);
        this.trackMenu(component);
    },
    
    // private
    onRemove: function(c) {
        this.callParent(arguments);
        this.trackMenu(c, true);
    },
    
    getChildItemsToDisable: function() {
        return this.items.getRange();   
    },

    // private
    onButtonOver: function(btn){
        if (this.activeMenuBtn && this.activeMenuBtn != btn) {
            this.activeMenuBtn.hideMenu();
            btn.showMenu();
            this.activeMenuBtn = btn;
        }
    },

    // private
    onButtonMenuShow: function(btn) {
        this.activeMenuBtn = btn;
    },

    // private
    onButtonMenuHide: function(btn) {
        delete this.activeMenuBtn;
    }
});


/**
 * As the number of records increases, the time required for the browser to render them increases. Paging is used to
 * reduce the amount of data exchanged with the client. Note: if there are more records/rows than can be viewed in the
 * available screen area, vertical scrollbars will be added.
 *
 * Paging is typically handled on the server side (see exception below). The client sends parameters to the server side,
 * which the server needs to interpret and then respond with the appropriate data.
 *
 * Ext.toolbar.Paging is a specialized toolbar that is bound to a {@link Ext.data.Store} and provides automatic
 * paging control. This Component {@link Ext.data.Store#method-load load}s blocks of data into the {@link #store} by passing
 * parameters used for paging criteria.
 *
 * {@img Ext.toolbar.Paging/Ext.toolbar.Paging.png Ext.toolbar.Paging component}
 *
 * Paging Toolbar is typically used as one of the Grid's toolbars:
 *
 *     @example
 *     var itemsPerPage = 2;   // set the number of items you want per page
 *
 *     var store = Ext.create('Ext.data.Store', {
 *         id:'simpsonsStore',
 *         autoLoad: false,
 *         fields:['name', 'email', 'phone'],
 *         pageSize: itemsPerPage, // items per page
 *         proxy: {
 *             type: 'ajax',
 *             url: 'pagingstore.js',  // url that will load data with respect to start and limit params
 *             reader: {
 *                 type: 'json',
 *                 root: 'items',
 *                 totalProperty: 'total'
 *             }
 *         }
 *     });
 *
 *     // specify segment of data you want to load using params
 *     store.load({
 *         params:{
 *             start:0,
 *             limit: itemsPerPage
 *         }
 *     });
 *
 *     Ext.create('Ext.grid.Panel', {
 *         title: 'Simpsons',
 *         store: store,
 *         columns: [
 *             { header: 'Name',  dataIndex: 'name' },
 *             { header: 'Email', dataIndex: 'email', flex: 1 },
 *             { header: 'Phone', dataIndex: 'phone' }
 *         ],
 *         width: 400,
 *         height: 125,
 *         dockedItems: [{
 *             xtype: 'pagingtoolbar',
 *             store: store,   // same store GridPanel is using
 *             dock: 'bottom',
 *             displayInfo: true
 *         }],
 *         renderTo: Ext.getBody()
 *     });
 *
 * To use paging, you need to set a pageSize configuration on the Store, and pass the paging requirements to
 * the server when the store is first loaded.
 *
 *     store.load({
 *         params: {
 *             // specify params for the first page load if using paging
 *             start: 0,
 *             limit: myPageSize,
 *             // other params
 *             foo:   'bar'
 *         }
 *     });
 *
 * If using {@link Ext.data.Store#autoLoad store's autoLoad} configuration:
 *
 *     var myStore = Ext.create('Ext.data.Store', {
 *         {@link Ext.data.Store#autoLoad autoLoad}: {start: 0, limit: 25},
 *         ...
 *     });
 *
 * The packet sent back from the server would have this form:
 *
 *     {
 *         "success": true,
 *         "results": 2000,
 *         "rows": [ // ***Note:** this must be an Array
 *             { "id":  1, "name": "Bill", "occupation": "Gardener" },
 *             { "id":  2, "name":  "Ben", "occupation": "Horticulturalist" },
 *             ...
 *             { "id": 25, "name":  "Sue", "occupation": "Botanist" }
 *         ]
 *     }
 *
 * ## Paging with Local Data
 *
 * Paging can also be accomplished with local data using extensions:
 *
 *   - [Ext.ux.data.PagingStore][1]
 *   - Paging Memory Proxy (examples/ux/PagingMemoryProxy.js)
 *
 *    [1]: http://sencha.com/forum/showthread.php?t=71532
 */
Ext.define('Ext.toolbar.Paging', {
    extend: 'Ext.toolbar.Toolbar',
    alias: 'widget.pagingtoolbar',
    alternateClassName: 'Ext.PagingToolbar',
    requires: ['Ext.toolbar.TextItem', 'Ext.form.field.Number'],
    mixins: {
        bindable: 'Ext.util.Bindable'    
    },
    /**
     * @cfg {Ext.data.Store} store (required)
     * The {@link Ext.data.Store} the paging toolbar should use as its data source.
     */

    /**
     * @cfg {Boolean} displayInfo
     * true to display the displayMsg
     */
    displayInfo: false,

    /**
     * @cfg {Boolean} prependButtons
     * true to insert any configured items _before_ the paging buttons.
     */
    prependButtons: false,

    //<locale>
    /**
     * @cfg {String} displayMsg
     * The paging status message to display. Note that this string is
     * formatted using the braced numbers {0}-{2} as tokens that are replaced by the values for start, end and total
     * respectively. These tokens should be preserved when overriding this string if showing those values is desired.
     */
    displayMsg : 'Displaying {0} - {1} of {2}',
    //</locale>

    //<locale>
    /**
     * @cfg {String} emptyMsg
     * The message to display when no records are found.
     */
    emptyMsg : 'No data to display',
    //</locale>

    //<locale>
    /**
     * @cfg {String} beforePageText
     * The text displayed before the input item.
     */
    beforePageText : 'Page',
    //</locale>

    //<locale>
    /**
     * @cfg {String} afterPageText
     * Customizable piece of the default paging text. Note that this string is formatted using
     * {0} as a token that is replaced by the number of total pages. This token should be preserved when overriding this
     * string if showing the total page count is desired.
     */
    afterPageText : 'of {0}',
    //</locale>

    //<locale>
    /**
     * @cfg {String} firstText
     * The quicktip text displayed for the first page button.
     * **Note**: quick tips must be initialized for the quicktip to show.
     */
    firstText : 'First Page',
    //</locale>

    //<locale>
    /**
     * @cfg {String} prevText
     * The quicktip text displayed for the previous page button.
     * **Note**: quick tips must be initialized for the quicktip to show.
     */
    prevText : 'Previous Page',
    //</locale>

    //<locale>
    /**
     * @cfg {String} nextText
     * The quicktip text displayed for the next page button.
     * **Note**: quick tips must be initialized for the quicktip to show.
     */
    nextText : 'Next Page',
    //</locale>

    //<locale>
    /**
     * @cfg {String} lastText
     * The quicktip text displayed for the last page button.
     * **Note**: quick tips must be initialized for the quicktip to show.
     */
    lastText : 'Last Page',
    //</locale>

    //<locale>
    /**
     * @cfg {String} refreshText
     * The quicktip text displayed for the Refresh button.
     * **Note**: quick tips must be initialized for the quicktip to show.
     */
    refreshText : 'Refresh',
    //</locale>

    /**
     * @cfg {Number} inputItemWidth
     * The width in pixels of the input field used to display and change the current page number.
     */
    inputItemWidth : 30,

    /**
     * Gets the standard paging items in the toolbar
     * @private
     */
    getPagingItems: function() {
        var me = this;

        return [{
            itemId: 'first',
            tooltip: me.firstText,
            overflowText: me.firstText,
            iconCls: Ext.baseCSSPrefix + 'tbar-page-first',
            disabled: true,
            handler: me.moveFirst,
            scope: me
        },{
            itemId: 'prev',
            tooltip: me.prevText,
            overflowText: me.prevText,
            iconCls: Ext.baseCSSPrefix + 'tbar-page-prev',
            disabled: true,
            handler: me.movePrevious,
            scope: me
        },
        '-',
        me.beforePageText,
        {
            xtype: 'numberfield',
            itemId: 'inputItem',
            name: 'inputItem',
            cls: Ext.baseCSSPrefix + 'tbar-page-number',
            allowDecimals: false,
            minValue: 1,
            hideTrigger: true,
            enableKeyEvents: true,
            keyNavEnabled: false,
            selectOnFocus: true,
            submitValue: false,
            // mark it as not a field so the form will not catch it when getting fields
            isFormField: false,
            width: me.inputItemWidth,
            margins: '-1 2 3 2',
            listeners: {
                scope: me,
                keydown: me.onPagingKeyDown,
                blur: me.onPagingBlur
            }
        },{
            xtype: 'tbtext',
            itemId: 'afterTextItem',
            text: Ext.String.format(me.afterPageText, 1)
        },
        '-',
        {
            itemId: 'next',
            tooltip: me.nextText,
            overflowText: me.nextText,
            iconCls: Ext.baseCSSPrefix + 'tbar-page-next',
            disabled: true,
            handler: me.moveNext,
            scope: me
        },{
            itemId: 'last',
            tooltip: me.lastText,
            overflowText: me.lastText,
            iconCls: Ext.baseCSSPrefix + 'tbar-page-last',
            disabled: true,
            handler: me.moveLast,
            scope: me
        },
        '-',
        {
            itemId: 'refresh',
            tooltip: me.refreshText,
            overflowText: me.refreshText,
            iconCls: Ext.baseCSSPrefix + 'tbar-loading',
            handler: me.doRefresh,
            scope: me
        }];
    },

    initComponent : function(){
        var me = this,
            pagingItems = me.getPagingItems(),
            userItems   = me.items || me.buttons || [];

        if (me.prependButtons) {
            me.items = userItems.concat(pagingItems);
        } else {
            me.items = pagingItems.concat(userItems);
        }
        delete me.buttons;

        if (me.displayInfo) {
            me.items.push('->');
            me.items.push({xtype: 'tbtext', itemId: 'displayItem'});
        }

        me.callParent();

        me.addEvents(
            /**
             * @event change
             * Fires after the active page has been changed.
             * @param {Ext.toolbar.Paging} this
             * @param {Object} pageData An object that has these properties:
             *
             * - `total` : Number
             *
             *   The total number of records in the dataset as returned by the server
             *
             * - `currentPage` : Number
             *
             *   The current page number
             *
             * - `pageCount` : Number
             *
             *   The total number of pages (calculated from the total number of records in the dataset as returned by the
             *   server and the current {@link Ext.data.Store#pageSize pageSize})
             *
             * - `toRecord` : Number
             *
             *   The starting record index for the current page
             *
             * - `fromRecord` : Number
             *
             *   The ending record index for the current page
             */
            'change',

            /**
             * @event beforechange
             * Fires just before the active page is changed. Return false to prevent the active page from being changed.
             * @param {Ext.toolbar.Paging} this
             * @param {Number} page The page number that will be loaded on change
             */
            'beforechange'
        );
        me.on('beforerender', me.onLoad, me, {single: true});

        me.bindStore(me.store || 'ext-empty-store', true);
    },
    // private
    updateInfo : function(){
        var me = this,
            displayItem = me.child('#displayItem'),
            store = me.store,
            pageData = me.getPageData(),
            count, msg;

        if (displayItem) {
            count = store.getCount();
            if (count === 0) {
                msg = me.emptyMsg;
            } else {
                msg = Ext.String.format(
                    me.displayMsg,
                    pageData.fromRecord,
                    pageData.toRecord,
                    pageData.total
                );
            }
            displayItem.setText(msg);
        }
    },

    // private
    onLoad : function(){
        var me = this,
            pageData,
            currPage,
            pageCount,
            afterText,
            count,
            isEmpty;

        count = me.store.getCount();
        isEmpty = count === 0;
        if (!isEmpty) {
            pageData = me.getPageData();
            currPage = pageData.currentPage;
            pageCount = pageData.pageCount;
            afterText = Ext.String.format(me.afterPageText, isNaN(pageCount) ? 1 : pageCount);
        } else {
            currPage = 0;
            pageCount = 0;
            afterText = Ext.String.format(me.afterPageText, 0);
        }

        Ext.suspendLayouts();
        me.child('#afterTextItem').setText(afterText);
        me.child('#inputItem').setDisabled(isEmpty).setValue(currPage);
        me.child('#first').setDisabled(currPage === 1 || isEmpty);
        me.child('#prev').setDisabled(currPage === 1  || isEmpty);
        me.child('#next').setDisabled(currPage === pageCount  || isEmpty);
        me.child('#last').setDisabled(currPage === pageCount  || isEmpty);
        me.child('#refresh').enable();
        me.updateInfo();
        Ext.resumeLayouts(true);

        if (me.rendered) {
            me.fireEvent('change', me, pageData);
        }
    },

    // private
    getPageData : function(){
        var store = this.store,
            totalCount = store.getTotalCount();

        return {
            total : totalCount,
            currentPage : store.currentPage,
            pageCount: Math.ceil(totalCount / store.pageSize),
            fromRecord: ((store.currentPage - 1) * store.pageSize) + 1,
            toRecord: Math.min(store.currentPage * store.pageSize, totalCount)

        };
    },

    // private
    onLoadError : function(){
        if (!this.rendered) {
            return;
        }
        this.child('#refresh').enable();
    },

    // private
    readPageFromInput : function(pageData){
        var v = this.child('#inputItem').getValue(),
            pageNum = parseInt(v, 10);

        if (!v || isNaN(pageNum)) {
            this.child('#inputItem').setValue(pageData.currentPage);
            return false;
        }
        return pageNum;
    },

    onPagingFocus : function(){
        this.child('#inputItem').select();
    },

    //private
    onPagingBlur : function(e){
        var curPage = this.getPageData().currentPage;
        this.child('#inputItem').setValue(curPage);
    },

    // private
    onPagingKeyDown : function(field, e){
        var me = this,
            k = e.getKey(),
            pageData = me.getPageData(),
            increment = e.shiftKey ? 10 : 1,
            pageNum;

        if (k == e.RETURN) {
            e.stopEvent();
            pageNum = me.readPageFromInput(pageData);
            if (pageNum !== false) {
                pageNum = Math.min(Math.max(1, pageNum), pageData.pageCount);
                if(me.fireEvent('beforechange', me, pageNum) !== false){
                    me.store.loadPage(pageNum);
                }
            }
        } else if (k == e.HOME || k == e.END) {
            e.stopEvent();
            pageNum = k == e.HOME ? 1 : pageData.pageCount;
            field.setValue(pageNum);
        } else if (k == e.UP || k == e.PAGE_UP || k == e.DOWN || k == e.PAGE_DOWN) {
            e.stopEvent();
            pageNum = me.readPageFromInput(pageData);
            if (pageNum) {
                if (k == e.DOWN || k == e.PAGE_DOWN) {
                    increment *= -1;
                }
                pageNum += increment;
                if (pageNum >= 1 && pageNum <= pageData.pageCount) {
                    field.setValue(pageNum);
                }
            }
        }
    },

    // private
    beforeLoad : function(){
        if(this.rendered && this.refresh){
            this.refresh.disable();
        }
    },

    /**
     * Move to the first page, has the same effect as clicking the 'first' button.
     */
    moveFirst : function(){
        if (this.fireEvent('beforechange', this, 1) !== false){
            this.store.loadPage(1);
        }
    },

    /**
     * Move to the previous page, has the same effect as clicking the 'previous' button.
     */
    movePrevious : function(){
        var me = this,
            prev = me.store.currentPage - 1;

        if (prev > 0) {
            if (me.fireEvent('beforechange', me, prev) !== false) {
                me.store.previousPage();
            }
        }
    },

    /**
     * Move to the next page, has the same effect as clicking the 'next' button.
     */
    moveNext : function(){
        var me = this,
            total = me.getPageData().pageCount,
            next = me.store.currentPage + 1;

        if (next <= total) {
            if (me.fireEvent('beforechange', me, next) !== false) {
                me.store.nextPage();
            }
        }
    },

    /**
     * Move to the last page, has the same effect as clicking the 'last' button.
     */
    moveLast : function(){
        var me = this,
            last = me.getPageData().pageCount;

        if (me.fireEvent('beforechange', me, last) !== false) {
            me.store.loadPage(last);
        }
    },

    /**
     * Refresh the current page, has the same effect as clicking the 'refresh' button.
     */
    doRefresh : function(){
        var me = this,
            current = me.store.currentPage;

        if (me.fireEvent('beforechange', me, current) !== false) {
            me.store.loadPage(current);
        }
    },
    
    getStoreListeners: function() {
        return {
            beforeload: this.beforeLoad,
            load: this.onLoad,
            exception: this.onLoadError
        };
    },

    /**
     * Unbinds the paging toolbar from the specified {@link Ext.data.Store} **(deprecated)**
     * @param {Ext.data.Store} store The data store to unbind
     */
    unbind : function(store){
        this.bindStore(null);
    },

    /**
     * Binds the paging toolbar to the specified {@link Ext.data.Store} **(deprecated)**
     * @param {Ext.data.Store} store The data store to bind
     */
    bind : function(store){
        this.bindStore(store);
    },

    // private
    onDestroy : function(){
        this.unbind();
        this.callParent();
    }
});
