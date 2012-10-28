
/**
 * @author Ed Spencer
 * 
 * Represents a single Tab in a {@link Ext.tab.Panel TabPanel}. A Tab is simply a slightly customized {@link Ext.button.Button Button}, 
 * styled to look like a tab. Tabs are optionally closable, and can also be disabled. 99% of the time you will not
 * need to create Tabs manually as the framework does so automatically when you use a {@link Ext.tab.Panel TabPanel}
 */
Ext.define('Ext.tab.Tab', {
    extend: 'Ext.button.Button',
    alias: 'widget.tab',

    requires: [
        'Ext.layout.component.Tab',
        'Ext.util.KeyNav'
    ],

    componentLayout: 'tab',

    /**
     * @property {Boolean} isTab
     * `true` in this class to identify an object as an instantiated Tab, or subclass thereof.
     */
    isTab: true,

    baseCls: Ext.baseCSSPrefix + 'tab',

    /**
     * @cfg {String} activeCls
     * The CSS class to be applied to a Tab when it is active.
     * Providing your own CSS for this class enables you to customize the active state.
     */
    activeCls: 'active',

    /**
     * @cfg {String} [disabledCls='x-tab-disabled']
     * The CSS class to be applied to a Tab when it is disabled.
     */

    /**
     * @cfg {String} closableCls
     * The CSS class which is added to the tab when it is closable
     */
    closableCls: 'closable',

    /**
     * @cfg {Boolean} closable
     * True to make the Tab start closable (the close icon will be visible).
     */
    closable: true,

    //<locale>
    /**
     * @cfg {String} closeText
     * The accessible text label for the close button link; only used when {@link #cfg-closable} = true.
     */
    closeText: 'Close Tab',
    //</locale>

    /**
     * @property {Boolean} active
     * Indicates that this tab is currently active. This is NOT a public configuration.
     * @readonly
     */
    active: false,

    /**
     * @property {Boolean} closable
     * True if the tab is currently closable
     */

    childEls: [
        'closeEl'
    ],

    scale: false,

    position: 'top',

    initComponent: function() {
        var me = this;

        me.addEvents(
            /**
             * @event activate
             * Fired when the tab is activated.
             * @param {Ext.tab.Tab} this
             */
            'activate',

            /**
             * @event deactivate
             * Fired when the tab is deactivated.
             * @param {Ext.tab.Tab} this
             */
            'deactivate',

            /**
             * @event beforeclose
             * Fires if the user clicks on the Tab's close button, but before the {@link #close} event is fired. Return
             * false from any listener to stop the close event being fired
             * @param {Ext.tab.Tab} tab The Tab object
             */
            'beforeclose',

            /**
             * @event close
             * Fires to indicate that the tab is to be closed, usually because the user has clicked the close button.
             * @param {Ext.tab.Tab} tab The Tab object
             */
            'close'
        );

        me.callParent(arguments);

        if (me.card) {
            me.setCard(me.card);
        }
    },

    getTemplateArgs: function() {
        var me = this,
            result = me.callParent();

        result.closable = me.closable;
        result.closeText = me.closeText;

        return result;
    },

    beforeRender: function() {
        var me = this,
            tabBar = me.up('tabbar'),
            tabPanel = me.up('tabpanel');
        
        me.callParent();
        
        me.addClsWithUI(me.position);

        // Set all the state classNames, as they need to include the UI
        // me.disabledCls = me.getClsWithUIs('disabled');

        me.syncClosableUI();

        // Propagate minTabWidth and maxTabWidth settings from the owning TabBar then TabPanel
        if (!me.minWidth) {
            me.minWidth = (tabBar) ? tabBar.minTabWidth : me.minWidth;
            if (!me.minWidth && tabPanel) {
                me.minWidth = tabPanel.minTabWidth;
            }
            if (me.minWidth && me.iconCls) {
                me.minWidth += 25;
            }
        }
        if (!me.maxWidth) {
            me.maxWidth = (tabBar) ? tabBar.maxTabWidth : me.maxWidth;
            if (!me.maxWidth && tabPanel) {
                me.maxWidth = tabPanel.maxTabWidth;
            }
        }
    },

    onRender: function() {
        var me = this;

        me.callParent(arguments);

        me.keyNav = new Ext.util.KeyNav(me.el, {
            enter: me.onEnterKey,
            del: me.onDeleteKey,
            scope: me
        });
    },

    // inherit docs
    enable : function(silent) {
        var me = this;

        me.callParent(arguments);

        me.removeClsWithUI(me.position + '-disabled');

        return me;
    },

    // inherit docs
    disable : function(silent) {
        var me = this;

        me.callParent(arguments);

        me.addClsWithUI(me.position + '-disabled');

        return me;
    },

    onDestroy: function() {
        var me = this;

        Ext.destroy(me.keyNav);
        delete me.keyNav;

        me.callParent(arguments);
    },

    /**
     * Sets the tab as either closable or not.
     * @param {Boolean} closable Pass false to make the tab not closable. Otherwise the tab will be made closable (eg a
     * close button will appear on the tab)
     */
    setClosable: function(closable) {
        var me = this;

        // Closable must be true if no args
        closable = (!arguments.length || !!closable);

        if (me.closable != closable) {
            me.closable = closable;

            // set property on the user-facing item ('card'):
            if (me.card) {
                me.card.closable = closable;
            }

            me.syncClosableUI();

            if (me.rendered) {
                me.syncClosableElements();

                // Tab will change width to accommodate close icon
                me.updateLayout();
            }
        }
    },

    /**
     * This method ensures that the closeBtn element exists or not based on 'closable'.
     * @private
     */
    syncClosableElements: function () {
        var me = this,
            closeEl = me.closeEl;

        if (me.closable) {
            if (!closeEl) {
                me.closeEl = me.btnWrap.insertSibling({
                    tag: 'a',
                    cls: me.baseCls + '-close-btn',
                    href: '#',
                    title: me.closeText
                }, 'after');
            }
        } else if (closeEl) {
            closeEl.remove();
            delete me.closeEl;
        }
    },

    /**
     * This method ensures that the UI classes are added or removed based on 'closable'.
     * @private
     */
    syncClosableUI: function () {
        var me = this,
            classes = [me.closableCls, me.closableCls + '-' + me.position];

        if (me.closable) {
            me.addClsWithUI(classes);
        } else {
            me.removeClsWithUI(classes);
        }
    },

    /**
     * Sets this tab's attached card. Usually this is handled automatically by the {@link Ext.tab.Panel} that this Tab
     * belongs to and would not need to be done by the developer
     * @param {Ext.Component} card The card to set
     */
    setCard: function(card) {
        var me = this;

        me.card = card;
        me.setText(me.title || card.title);
        me.setIconCls(me.iconCls || card.iconCls);
        me.setIcon(me.icon || card.icon);
    },

    /**
     * @private
     * Listener attached to click events on the Tab's close button
     */
    onCloseClick: function() {
        var me = this;

        if (me.fireEvent('beforeclose', me) !== false) {
            if (me.tabBar) {
                if (me.tabBar.closeTab(me) === false) {
                    // beforeclose on the panel vetoed the event, stop here
                    return;
                }
            } else {
                // if there's no tabbar, fire the close event
                me.fireClose();
            }
        }
    },

    /**
     * Fires the close event on the tab.
     * @private
     */
    fireClose: function(){
        this.fireEvent('close', this);
    },

    /**
     * @private
     */
    onEnterKey: function(e) {
        var me = this;

        if (me.tabBar) {
            me.tabBar.onClick(e, me.el);
        }
    },

   /**
     * @private
     */
    onDeleteKey: function(e) {
        if (this.closable) {
            this.onCloseClick();
        }
    },

    // @private
    activate : function(supressEvent) {
        var me = this;

        me.active = true;
        me.addClsWithUI([me.activeCls, me.position + '-' + me.activeCls]);

        if (supressEvent !== true) {
            me.fireEvent('activate', me);
        }
    },

    // @private
    deactivate : function(supressEvent) {
        var me = this;

        me.active = false;
        me.removeClsWithUI([me.activeCls, me.position + '-' + me.activeCls]);

        if (supressEvent !== true) {
            me.fireEvent('deactivate', me);
        }
    }
});

/**
 * @author Ed Spencer
 * TabBar is used internally by a {@link Ext.tab.Panel TabPanel} and typically should not need to be created manually.
 * The tab bar automatically removes the default title provided by {@link Ext.panel.Header}
 */
Ext.define('Ext.tab.Bar', {
    extend: 'Ext.panel.Header',
    alias: 'widget.tabbar',
    baseCls: Ext.baseCSSPrefix + 'tab-bar',

    requires: ['Ext.tab.Tab'],

    /**
     * @property {Boolean} isTabBar
     * `true` in this class to identify an objact as an instantiated Tab Bar, or subclass thereof.
     */
    isTabBar: true,
    
    /**
     * @cfg {String} title @hide
     */
    
    /**
     * @cfg {String} iconCls @hide
     */

    // @private
    defaultType: 'tab',

    /**
     * @cfg {Boolean} plain
     * True to not show the full background on the tabbar
     */
    plain: false,

    childEls: [
        'body', 'strip'
    ],

    // @private
    renderTpl: [
        '<div id="{id}-body" class="{baseCls}-body {bodyCls}<tpl if="ui"> {baseCls}-body-{ui}<tpl for="uiCls"> {parent.baseCls}-body-{parent.ui}-{.}</tpl></tpl>"<tpl if="bodyStyle"> style="{bodyStyle}"</tpl>>',
            '{%this.renderContainer(out,values)%}',
        '</div>',
        '<div id="{id}-strip" class="{baseCls}-strip<tpl if="ui"> {baseCls}-strip-{ui}<tpl for="uiCls"> {parent.baseCls}-strip-{parent.ui}-{.}</tpl></tpl>"></div>'
    ],

    /**
     * @cfg {Number} minTabWidth
     * The minimum width for a tab in this tab Bar. Defaults to the tab Panel's {@link Ext.tab.Panel#minTabWidth minTabWidth} value.
     * @deprecated This config is deprecated. It is much easier to use the {@link Ext.tab.Panel#minTabWidth minTabWidth} config on the TabPanel.
     */

    /**
     * @cfg {Number} maxTabWidth
     * The maximum width for a tab in this tab Bar. Defaults to the tab Panel's {@link Ext.tab.Panel#maxTabWidth maxTabWidth} value.
     * @deprecated This config is deprecated. It is much easier to use the {@link Ext.tab.Panel#maxTabWidth maxTabWidth} config on the TabPanel.
     */

    // @private
    initComponent: function() {
        var me = this;

        if (me.plain) {
            me.setUI(me.ui + '-plain');
        }

        me.addClsWithUI(me.dock);

        me.addEvents(
            /**
             * @event change
             * Fired when the currently-active tab has changed
             * @param {Ext.tab.Bar} tabBar The TabBar
             * @param {Ext.tab.Tab} tab The new Tab
             * @param {Ext.Component} card The card that was just shown in the TabPanel
             */
            'change'
        );

        // Element onClick listener added by Header base class
        me.callParent(arguments);

        // TabBar must override the Header's align setting.
        me.layout.align = (me.orientation == 'vertical') ? 'left' : 'top';
        me.layout.overflowHandler = new Ext.layout.container.boxOverflow.Scroller(me.layout);

        me.remove(me.titleCmp);
        delete me.titleCmp;

        Ext.apply(me.renderData, {
            bodyCls: me.bodyCls
        });
    },

    getLayout: function() {
        var me = this;
        me.layout.type = (me.dock === 'top' || me.dock === 'bottom') ? 'hbox' : 'vbox';
        return me.callParent(arguments);
    },

    // @private
    onAdd: function(tab) {
        tab.position = this.dock;
        this.callParent(arguments);
    },
    
    onRemove: function(tab) {
        var me = this;
        
        if (tab === me.previousTab) {
            me.previousTab = null;
        }
        me.callParent(arguments);    
    },

    afterComponentLayout : function(width) {
        this.callParent(arguments);
        this.strip.setWidth(width);
    },

    // @private
    onClick: function(e, target) {
        // The target might not be a valid tab el.
        var me = this,
            tabEl = e.getTarget('.' + Ext.tab.Tab.prototype.baseCls),
            tab = tabEl && Ext.getCmp(tabEl.id),
            tabPanel = me.tabPanel,
            isCloseClick = tab && tab.closeEl && (target === tab.closeEl.dom);

        if (isCloseClick) {
            e.preventDefault();
        }
        if (tab && tab.isDisabled && !tab.isDisabled()) {
            if (tab.closable && isCloseClick) {
                tab.onCloseClick();
            } else {
                if (tabPanel) {
                    // TabPanel will card setActiveTab of the TabBar
                    tabPanel.setActiveTab(tab.card);
                } else {
                    me.setActiveTab(tab);
                }
                tab.focus();
            }
        }
    },

    /**
     * @private
     * Closes the given tab by removing it from the TabBar and removing the corresponding card from the TabPanel
     * @param {Ext.tab.Tab} toClose The tab to close
     */
    closeTab: function(toClose) {
        var me = this,
            card = toClose.card,
            tabPanel = me.tabPanel,
            toActivate;

        if (card && card.fireEvent('beforeclose', card) === false) {
            return false;
        }
        
        // If we are closing the active tab, revert to the previously active tab (or the previous or next enabled sibling if
        // there *is* no previously active tab, or the previously active tab is the one that's being closed or the previously
        // active tab has since been disabled)
        toActivate = me.findNextActivatable(toClose);

        // We are going to remove the associated card, and then, if that was sucessful, remove the Tab,
        // And then potentially activate another Tab. We should not layout for each of these operations.
        Ext.suspendLayouts();

        if (tabPanel && card) {
            // Remove the ownerCt so the tab doesn't get destroyed if the remove is successful
            // We need this so we can have the tab fire it's own close event.
            delete toClose.ownerCt;
            
            // we must fire 'close' before removing the card from panel, otherwise
            // the event will no loger have any listener
            card.fireEvent('close', card);
            tabPanel.remove(card);
            
            // Remove succeeded
            if (!tabPanel.getComponent(card)) {
                /*
                 * Force the close event to fire. By the time this function returns,
                 * the tab is already destroyed and all listeners have been purged
                 * so the tab can't fire itself.
                 */
                toClose.fireClose();
                me.remove(toClose);
            } else {
                // Restore the ownerCt from above
                toClose.ownerCt = me;
                Ext.resumeLayouts(true);
                return false;
            }
        }

        // If we are closing the active tab, revert to the previously active tab (or the previous sibling or the nnext sibling)
        if (toActivate) {
            // Our owning TabPanel calls our setActiveTab method, so only call that if this Bar is being used
            // in some other context (unlikely)
            if (tabPanel) {
                tabPanel.setActiveTab(toActivate.card);
            } else {
                me.setActiveTab(toActivate);
            }
            toActivate.focus();
        }
        Ext.resumeLayouts(true);
    },

    // private - used by TabPanel too.
    // Works out the next tab to activate when one tab is closed.
    findNextActivatable: function(toClose) {
        var me = this;
        if (toClose.active && me.items.getCount() > 1) {
            return (me.previousTab && me.previousTab !== toClose && !me.previousTab.disabled) ? me.previousTab : (toClose.next('tab[disabled=false]') || toClose.prev('tab[disabled=false]'));
        }
    },

    /**
     * @private
     * Marks the given tab as active
     * @param {Ext.tab.Tab} tab The tab to mark active
     */
    setActiveTab: function(tab) {
        var me = this;

        if (!tab.disabled && tab !== me.activeTab) {
            if (me.activeTab) {
                if (me.activeTab.isDestroyed) {
                    me.previousTab = null;
                } else {
                    me.previousTab = me.activeTab;
                    me.activeTab.deactivate();
                }
            }
            tab.activate();

            me.activeTab = tab;
            me.fireEvent('change', me, tab, tab.card);

            // Ensure that after the currently in progress layout, the active tab is scrolled into view
            me.on({
                afterlayout: me.afterTabActivate,
                scope: me,
                single: true
            });
            me.updateLayout();
        }
    },

    afterTabActivate: function() {
        this.layout.overflowHandler.scrollToItem(this.activeTab);
    }
});




/**
 * @author Ed Spencer, Tommy Maintz, Brian Moeskau
 *
 * A basic tab container. TabPanels can be used exactly like a standard {@link Ext.panel.Panel} for
 * layout purposes, but also have special support for containing child Components
 * (`{@link Ext.container.Container#cfg-items items}`) that are managed using a
 * {@link Ext.layout.container.Card CardLayout layout manager}, and displayed as separate tabs.
 *
 * **Note:** By default, a tab's close tool _destroys_ the child tab Component and all its descendants.
 * This makes the child tab Component, and all its descendants **unusable**.  To enable re-use of a tab,
 * configure the TabPanel with `{@link #autoDestroy autoDestroy: false}`.
 *
 * ## TabPanel's layout
 *
 * TabPanels use a Dock layout to position the {@link Ext.tab.Bar TabBar} at the top of the widget.
 * Panels added to the TabPanel will have their header hidden by default because the Tab will
 * automatically take the Panel's configured title and icon.
 *
 * TabPanels use their {@link Ext.panel.Header header} or {@link Ext.panel.Panel#fbar footer}
 * element (depending on the {@link #tabPosition} configuration) to accommodate the tab selector buttons.
 * This means that a TabPanel will not display any configured title, and will not display any configured
 * header {@link Ext.panel.Panel#tools tools}.
 *
 * To display a header, embed the TabPanel in a {@link Ext.panel.Panel Panel} which uses
 * `{@link Ext.container.Container#layout layout: 'fit'}`.
 *
 * ## Controlling tabs
 *
 * Configuration options for the {@link Ext.tab.Tab} that represents the component can be passed in
 * by specifying the tabConfig option:
 *
 *     @example
 *     Ext.create('Ext.tab.Panel', {
 *         width: 400,
 *         height: 400,
 *         renderTo: document.body,
 *         items: [{
 *             title: 'Foo'
 *         }, {
 *             title: 'Bar',
 *             tabConfig: {
 *                 title: 'Custom Title',
 *                 tooltip: 'A button tooltip'
 *             }
 *         }]
 *     });
 *
 * # Examples
 *
 * Here is a basic TabPanel rendered to the body. This also shows the useful configuration {@link #activeTab},
 * which allows you to set the active tab on render. If you do not set an {@link #activeTab}, no tabs will be
 * active by default.
 *
 *     @example
 *     Ext.create('Ext.tab.Panel', {
 *         width: 300,
 *         height: 200,
 *         activeTab: 0,
 *         items: [
 *             {
 *                 title: 'Tab 1',
 *                 bodyPadding: 10,
 *                 html : 'A simple tab'
 *             },
 *             {
 *                 title: 'Tab 2',
 *                 html : 'Another one'
 *             }
 *         ],
 *         renderTo : Ext.getBody()
 *     });
 *
 * It is easy to control the visibility of items in the tab bar. Specify hidden: true to have the
 * tab button hidden initially. Items can be subsequently hidden and show by accessing the
 * tab property on the child item.
 *
 *     @example
 *     var tabs = Ext.create('Ext.tab.Panel', {
 *         width: 400,
 *         height: 400,
 *         renderTo: document.body,
 *         items: [{
 *             title: 'Home',
 *             html: 'Home',
 *             itemId: 'home'
 *         }, {
 *             title: 'Users',
 *             html: 'Users',
 *             itemId: 'users',
 *             hidden: true
 *         }, {
 *             title: 'Tickets',
 *             html: 'Tickets',
 *             itemId: 'tickets'
 *         }]
 *     });
 *
 *     setTimeout(function(){
 *         tabs.child('#home').tab.hide();
 *         var users = tabs.child('#users');
 *         users.tab.show();
 *         tabs.setActiveTab(users);
 *     }, 1000);
 *
 * You can remove the background of the TabBar by setting the {@link #plain} property to `true`.
 *
 *     @example
 *     Ext.create('Ext.tab.Panel', {
 *         width: 300,
 *         height: 200,
 *         activeTab: 0,
 *         plain: true,
 *         items: [
 *             {
 *                 title: 'Tab 1',
 *                 bodyPadding: 10,
 *                 html : 'A simple tab'
 *             },
 *             {
 *                 title: 'Tab 2',
 *                 html : 'Another one'
 *             }
 *         ],
 *         renderTo : Ext.getBody()
 *     });
 *
 * Another useful configuration of TabPanel is {@link #tabPosition}. This allows you to change the
 * position where the tabs are displayed. The available options for this are `'top'` (default) and
 * `'bottom'`.
 *
 *     @example
 *     Ext.create('Ext.tab.Panel', {
 *         width: 300,
 *         height: 200,
 *         activeTab: 0,
 *         bodyPadding: 10,
 *         tabPosition: 'bottom',
 *         items: [
 *             {
 *                 title: 'Tab 1',
 *                 html : 'A simple tab'
 *             },
 *             {
 *                 title: 'Tab 2',
 *                 html : 'Another one'
 *             }
 *         ],
 *         renderTo : Ext.getBody()
 *     });
 *
 * The {@link #setActiveTab} is a very useful method in TabPanel which will allow you to change the
 * current active tab. You can either give it an index or an instance of a tab. For example:
 *
 *     @example
 *     var tabs = Ext.create('Ext.tab.Panel', {
 *         items: [
 *             {
 *                 id   : 'my-tab',
 *                 title: 'Tab 1',
 *                 html : 'A simple tab'
 *             },
 *             {
 *                 title: 'Tab 2',
 *                 html : 'Another one'
 *             }
 *         ],
 *         renderTo : Ext.getBody()
 *     });
 *
 *     var tab = Ext.getCmp('my-tab');
 *
 *     Ext.create('Ext.button.Button', {
 *         renderTo: Ext.getBody(),
 *         text    : 'Select the first tab',
 *         scope   : this,
 *         handler : function() {
 *             tabs.setActiveTab(tab);
 *         }
 *     });
 *
 *     Ext.create('Ext.button.Button', {
 *         text    : 'Select the second tab',
 *         scope   : this,
 *         handler : function() {
 *             tabs.setActiveTab(1);
 *         },
 *         renderTo : Ext.getBody()
 *     });
 *
 * The {@link #getActiveTab} is a another useful method in TabPanel which will return the current active tab.
 *
 *     @example
 *     var tabs = Ext.create('Ext.tab.Panel', {
 *         items: [
 *             {
 *                 title: 'Tab 1',
 *                 html : 'A simple tab'
 *             },
 *             {
 *                 title: 'Tab 2',
 *                 html : 'Another one'
 *             }
 *         ],
 *         renderTo : Ext.getBody()
 *     });
 *
 *     Ext.create('Ext.button.Button', {
 *         text    : 'Get active tab',
 *         scope   : this,
 *         handler : function() {
 *             var tab = tabs.getActiveTab();
 *             alert('Current tab: ' + tab.title);
 *         },
 *         renderTo : Ext.getBody()
 *     });
 *
 * Adding a new tab is very simple with a TabPanel. You simple call the {@link #method-add} method with an config
 * object for a panel.
 *
 *     @example
 *     var tabs = Ext.create('Ext.tab.Panel', {
 *         items: [
 *             {
 *                 title: 'Tab 1',
 *                 html : 'A simple tab'
 *             },
 *             {
 *                 title: 'Tab 2',
 *                 html : 'Another one'
 *             }
 *         ],
 *         renderTo : Ext.getBody()
 *     });
 *
 *     Ext.create('Ext.button.Button', {
 *         text    : 'New tab',
 *         scope   : this,
 *         handler : function() {
 *             var tab = tabs.add({
 *                 // we use the tabs.items property to get the length of current items/tabs
 *                 title: 'Tab ' + (tabs.items.length + 1),
 *                 html : 'Another one'
 *             });
 *
 *             tabs.setActiveTab(tab);
 *         },
 *         renderTo : Ext.getBody()
 *     });
 *
 * Additionally, removing a tab is very also simple with a TabPanel. You simple call the {@link #method-remove} method
 * with an config object for a panel.
 *
 *     @example
 *     var tabs = Ext.create('Ext.tab.Panel', {
 *         items: [
 *             {
 *                 title: 'Tab 1',
 *                 html : 'A simple tab'
 *             },
 *             {
 *                 id   : 'remove-this-tab',
 *                 title: 'Tab 2',
 *                 html : 'Another one'
 *             }
 *         ],
 *         renderTo : Ext.getBody()
 *     });
 *
 *     Ext.create('Ext.button.Button', {
 *         text    : 'Remove tab',
 *         scope   : this,
 *         handler : function() {
 *             var tab = Ext.getCmp('remove-this-tab');
 *             tabs.remove(tab);
 *         },
 *         renderTo : Ext.getBody()
 *     });
 */
Ext.define('Ext.tab.Panel', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.tabpanel',
    alternateClassName: ['Ext.TabPanel'],

    requires: ['Ext.layout.container.Card', 'Ext.tab.Bar'],

    /**
     * @cfg {String} tabPosition
     * The position where the tab strip should be rendered. Can be `top` or `bottom`.
     */
    tabPosition : 'top',

    /**
     * @cfg {String/Number} activeItem
     * Doesn't apply for {@link Ext.tab.Panel TabPanel}, use {@link #activeTab} instead.
     */

    /**
     * @cfg {String/Number/Ext.Component} activeTab
     * The tab to activate initially. Either an ID, index or the tab component itself.
     */

    /**
     * @cfg {Object} tabBar
     * Optional configuration object for the internal {@link Ext.tab.Bar}.
     * If present, this is passed straight through to the TabBar's constructor
     */

    /**
     * @cfg {Object} layout
     * Optional configuration object for the internal {@link Ext.layout.container.Card card layout}.
     * If present, this is passed straight through to the layout's constructor
     */

    /**
     * @cfg {Boolean} removePanelHeader
     * True to instruct each Panel added to the TabContainer to not render its header element.
     * This is to ensure that the title of the panel does not appear twice.
     */
    removePanelHeader: true,

    /**
     * @cfg {Boolean} plain
     * True to not show the full background on the TabBar.
     */
    plain: false,

    /**
     * @cfg {String} [itemCls='x-tabpanel-child']
     * The class added to each child item of this TabPanel.
     */
    itemCls: Ext.baseCSSPrefix + 'tabpanel-child',

    /**
     * @cfg {Number} minTabWidth
     * The minimum width for a tab in the {@link #cfg-tabBar}.
     */
    minTabWidth: undefined,

    /**
     * @cfg {Number} maxTabWidth The maximum width for each tab.
     */
    maxTabWidth: undefined,

    /**
     * @cfg {Boolean} deferredRender
     *
     * True by default to defer the rendering of child {@link Ext.container.Container#cfg-items items} to the browsers DOM
     * until a tab is activated. False will render all contained {@link Ext.container.Container#cfg-items items} as soon as
     * the {@link Ext.layout.container.Card layout} is rendered. If there is a significant amount of content or a lot of
     * heavy controls being rendered into panels that are not displayed by default, setting this to true might improve
     * performance.
     *
     * The deferredRender property is internally passed to the layout manager for TabPanels ({@link
     * Ext.layout.container.Card}) as its {@link Ext.layout.container.Card#deferredRender} configuration value.
     *
     * **Note**: leaving deferredRender as true means that the content within an unactivated tab will not be available
     */
    deferredRender : true,

    //inherit docs
    initComponent: function() {
        var me = this,
            dockedItems = [].concat(me.dockedItems || []),
            activeTab = me.activeTab || (me.activeTab = 0);

        // Configure the layout with our deferredRender, and with our activeTeb
        me.layout = new Ext.layout.container.Card(Ext.apply({
            owner: me,
            deferredRender: me.deferredRender,
            itemCls: me.itemCls,
            activeItem: me.activeTab
        }, me.layout));

        /**
         * @property {Ext.tab.Bar} tabBar Internal reference to the docked TabBar
         */
        me.tabBar = new Ext.tab.Bar(Ext.apply({
            dock: me.tabPosition,
            plain: me.plain,
            border: me.border,
            cardLayout: me.layout,
            tabPanel: me
        }, me.tabBar));

        dockedItems.push(me.tabBar);
        me.dockedItems = dockedItems;

        me.addEvents(
            /**
             * @event
             * Fires before a tab change (activated by {@link #setActiveTab}). Return false in any listener to cancel
             * the tabchange
             * @param {Ext.tab.Panel} tabPanel The TabPanel
             * @param {Ext.Component} newCard The card that is about to be activated
             * @param {Ext.Component} oldCard The card that is currently active
             */
            'beforetabchange',

            /**
             * @event
             * Fires when a new tab has been activated (activated by {@link #setActiveTab}).
             * @param {Ext.tab.Panel} tabPanel The TabPanel
             * @param {Ext.Component} newCard The newly activated item
             * @param {Ext.Component} oldCard The previously active item
             */
            'tabchange'
        );

        me.callParent(arguments);

        // We have to convert the numeric index/string ID config into its component reference
        me.activeTab = me.getComponent(activeTab);

        // Ensure that the active child's tab is rendered in the active UI state
        if (me.activeTab) {
            me.activeTab.tab.activate(true);

            // So that it knows what to deactivate in subsequent tab changes 
            me.tabBar.activeTab = me.activeTab.tab;
        }
    },

    /**
     * Makes the given card active. Makes it the visible card in the TabPanel's CardLayout and highlights the Tab.
     * @param {String/Number/Ext.Component} card The card to make active. Either an ID, index or the component itself.
     * @return {Ext.Component} The resulting active child Component. The call may have been vetoed, or otherwise
     * modified by an event listener.
     */
    setActiveTab: function(card) {
        var me = this,
            previous;

        card = me.getComponent(card);
        if (card) {
            previous = me.getActiveTab();

            if (previous !== card && me.fireEvent('beforetabchange', me, card, previous) === false) {
                return false;
            }

            // We may be passed a config object, so add it.
            // Without doing a layout!
            if (!card.isComponent) {
                Ext.suspendLayouts();
                card = me.add(card);
                Ext.resumeLayouts();
            }

            // MUST set the activeTab first so that the machinery which listens for show doesn't
            // think that the show is "driving" the activation and attempt to recurse into here.
            me.activeTab = card;

            // Attempt to switch to the requested card. Suspend layouts because if that was successful
            // we have to also update the active tab in the tab bar which is another layout operation
            // and we must coalesce them.
            Ext.suspendLayouts();
            me.layout.setActiveItem(card);

            // Read the result of the card layout. Events dear boy, events!
            card = me.activeTab = me.layout.getActiveItem();

            // Card switch was not vetoed by an event listener
            if (card && card !== previous) {

                // Update the active tab in the tab bar and resume layouts.
                me.tabBar.setActiveTab(card.tab);
                Ext.resumeLayouts(true);

                // previous will be undefined or this.activeTab at instantiation
                if (previous !== card) {
                    me.fireEvent('tabchange', me, card, previous);
                }
            }
            // Card switch was vetoed by an event listener. Resume layouts (Nothing should have changed on a veto).
            else {
                Ext.resumeLayouts(true);
            }
            return card;
        }
    },

    /**
     * Returns the item that is currently active inside this TabPanel.
     * @return {Ext.Component} The currently active item.
     */
    getActiveTab: function() {
        var me = this,
            // Ensure the calculated result references a Component
            result = me.getComponent(me.activeTab);

        // Sanitize the result in case the active tab is no longer there.
        if (result && me.items.indexOf(result) != -1) {
            me.activeTab = result;
        } else {
            me.activeTab = null;
        }

        return me.activeTab;
    },

    /**
     * Returns the {@link Ext.tab.Bar} currently used in this TabPanel
     * @return {Ext.tab.Bar} The TabBar
     */
    getTabBar: function() {
        return this.tabBar;
    },

    /**
     * @protected
     * Makes sure we have a Tab for each item added to the TabPanel
     */
    onAdd: function(item, index) {
        var me = this,
            cfg = item.tabConfig || {},
            defaultConfig = {
                xtype: 'tab',
                card: item,
                disabled: item.disabled,
                closable: item.closable,
                hidden: item.hidden && !item.hiddenByLayout, // only hide if it wasn't hidden by the layout itself
                tooltip: item.tooltip,
                tabBar: me.tabBar,
                closeText: item.closeText
            };

        cfg = Ext.applyIf(cfg, defaultConfig);

        // Create the correspondiong tab in the tab bar
        item.tab = me.tabBar.insert(index, cfg);

        item.on({
            scope : me,
            enable: me.onItemEnable,
            disable: me.onItemDisable,
            beforeshow: me.onItemBeforeShow,
            iconchange: me.onItemIconChange,
            iconclschange: me.onItemIconClsChange,
            titlechange: me.onItemTitleChange
        });

        if (item.isPanel) {
            if (me.removePanelHeader) {
                if (item.rendered) {
                    if (item.header) {
                        item.header.hide();
                    }
                } else {
                    item.header = false;
                }
            }
            if (item.isPanel && me.border) {
                item.setBorder(false);
            }
        }
    },

    /**
     * @private
     * Enable corresponding tab when item is enabled.
     */
    onItemEnable: function(item){
        item.tab.enable();
    },

    /**
     * @private
     * Disable corresponding tab when item is enabled.
     */
    onItemDisable: function(item){
        item.tab.disable();
    },

    /**
     * @private
     * Sets activeTab before item is shown.
     */
    onItemBeforeShow: function(item) {
        if (item !== this.activeTab) {
            this.setActiveTab(item);
            return false;
        }
    },

    /**
     * @private
     * Update the tab icon when panel icon has been set or changed.
     */
    onItemIconChange: function(item, newIcon) {
        item.tab.setIcon(newIcon);
    },
    
    /**
     * @private
     * Update the tab iconCls when panel iconCls has been set or changed.
     */
    onItemIconClsChange: function(item, newIconCls) {
        item.tab.setIconCls(newIconCls);
    },

    /**
     * @private
     * Update the tab title when panel title has been set or changed.
     */
    onItemTitleChange: function(item, newTitle) {
        item.tab.setText(newTitle);
    },

    /**
     * @private
     * Unlink the removed child item from its (@link Ext.tab.Tab Tab}.
     * 
     * If we're removing the currently active tab, activate the nearest one. The item is removed when we call super,
     * so we can do preprocessing before then to find the card's index
     */
    doRemove: function(item, autoDestroy) {
        var me = this,
            toActivate;

        // Destroying, or removing the last item, nothing to activate
        if (me.destroying || me.items.getCount() == 1) {
            me.activeTab = null;
        }

        // Ask the TabBar which tab to activate next.
        // Set the active child panel using the index of that tab
        else if ((toActivate = me.tabBar.items.indexOf(me.tabBar.findNextActivatable(item.tab))) !== -1) {
             me.setActiveTab(toActivate);
        }
        this.callParent(arguments);

        // Remove the two references
        delete item.tab.card;
        delete item.tab;
    },

    /**
     * @private
     * Makes sure we remove the corresponding Tab when an item is removed
     */
    onRemove: function(item, destroying) {
        var me = this;

        item.un({
            scope : me,
            enable: me.onItemEnable,
            disable: me.onItemDisable,
            beforeshow: me.onItemBeforeShow
        });
        if (!me.destroying && item.tab.ownerCt === me.tabBar) {
            me.tabBar.remove(item.tab);
        }
    }
});
