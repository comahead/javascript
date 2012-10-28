
/**
 * A base class for all menu items that require menu-related functionality such as click handling,
 * sub-menus, icons, etc.
 *
 *     @example
 *     Ext.create('Ext.menu.Menu', {
 *         width: 100,
 *         height: 100,
 *         floating: false,  // usually you want this set to True (default)
 *         renderTo: Ext.getBody(),  // usually rendered by it's containing component
 *         items: [{
 *             text: 'icon item',
 *             iconCls: 'add16'
 *         },{
 *             text: 'text item'
 *         },{
 *             text: 'plain item',
 *             plain: true
 *         }]
 *     });
 */
Ext.define('Ext.menu.Item', {
    extend: 'Ext.Component',
    alias: 'widget.menuitem',
    alternateClassName: 'Ext.menu.TextItem',

    /**
     * @property {Boolean} activated
     * Whether or not this item is currently activated
     */

    /**
     * @property {Ext.menu.Menu} parentMenu
     * The parent Menu of this item.
     */

    /**
     * @cfg {String} activeCls
     * The CSS class added to the menu item when the item is activated (focused/mouseover).
     */
    activeCls: Ext.baseCSSPrefix + 'menu-item-active',

    /**
     * @cfg {String} ariaRole
     * @private
     */
    ariaRole: 'menuitem',

    /**
     * @cfg {Boolean} canActivate
     * Whether or not this menu item can be activated when focused/mouseovered.
     */
    canActivate: true,

    /**
     * @cfg {Number} clickHideDelay
     * The delay in milliseconds to wait before hiding the menu after clicking the menu item.
     * This only has an effect when `hideOnClick: true`.
     */
    clickHideDelay: 1,

    /**
     * @cfg {Boolean} destroyMenu
     * Whether or not to destroy any associated sub-menu when this item is destroyed.
     */
    destroyMenu: true,

    /**
     * @cfg {String} disabledCls
     * The CSS class added to the menu item when the item is disabled.
     */
    disabledCls: Ext.baseCSSPrefix + 'menu-item-disabled',

    /**
     * @cfg {String} [href='#']
     * The href attribute to use for the underlying anchor link.
     */

    /**
     * @cfg {String} hrefTarget
     * The target attribute to use for the underlying anchor link.
     */

    /**
     * @cfg {Boolean} hideOnClick
     * Whether to not to hide the owning menu when this item is clicked.
     */
    hideOnClick: true,

    /**
     * @cfg {String} icon
     * The path to an icon to display in this item.
     *
     * Defaults to `Ext.BLANK_IMAGE_URL`.
     */

    /**
     * @cfg {String} iconCls
     * A CSS class that specifies a `background-image` to use as the icon for this item.
     */

    isMenuItem: true,

    /**
     * @cfg {Ext.menu.Menu/Object} menu
     * Either an instance of {@link Ext.menu.Menu} or a config object for an {@link Ext.menu.Menu}
     * which will act as a sub-menu to this item.
     */

    /**
     * @property {Ext.menu.Menu} menu The sub-menu associated with this item, if one was configured.
     */

    /**
     * @cfg {String} menuAlign
     * The default {@link Ext.Element#getAlignToXY Ext.Element.getAlignToXY} anchor position value for this
     * item's sub-menu relative to this item's position.
     */
    menuAlign: 'tl-tr?',

    /**
     * @cfg {Number} menuExpandDelay
     * The delay in milliseconds before this item's sub-menu expands after this item is moused over.
     */
    menuExpandDelay: 200,

    /**
     * @cfg {Number} menuHideDelay
     * The delay in milliseconds before this item's sub-menu hides after this item is moused out.
     */
    menuHideDelay: 200,

    /**
     * @cfg {Boolean} plain
     * Whether or not this item is plain text/html with no icon or visual activation.
     */

    /**
     * @cfg {String/Object} tooltip
     * The tooltip for the button - can be a string to be used as innerHTML (html tags are accepted) or
     * QuickTips config object.
     */

    /**
     * @cfg {String} tooltipType
     * The type of tooltip to use. Either 'qtip' for QuickTips or 'title' for title attribute.
     */
    tooltipType: 'qtip',

    arrowCls: Ext.baseCSSPrefix + 'menu-item-arrow',

    childEls: [
        'itemEl', 'iconEl', 'textEl', 'arrowEl'
    ],

    renderTpl: [
        '<tpl if="plain">',
            '{text}',
        '<tpl else>',
            '<a id="{id}-itemEl" class="' + Ext.baseCSSPrefix + 'menu-item-link" href="{href}" <tpl if="hrefTarget">target="{hrefTarget}"</tpl> hidefocus="true" unselectable="on">',
                '<img id="{id}-iconEl" src="{icon}" class="' + Ext.baseCSSPrefix + 'menu-item-icon {iconCls}" />',
                '<span id="{id}-textEl" class="' + Ext.baseCSSPrefix + 'menu-item-text" <tpl if="arrowCls">style="margin-right: 17px;"</tpl> >{text}</span>',
                '<img id="{id}-arrowEl" src="{blank}" class="{arrowCls}" />',
            '</a>',
        '</tpl>'
    ],

    maskOnDisable: false,

    /**
     * @cfg {String} text
     * The text/html to display in this item.
     */

    /**
     * @cfg {Function} handler
     * A function called when the menu item is clicked (can be used instead of {@link #click} event).
     * @cfg {Ext.menu.Item} handler.item The item that was clicked
     * @cfg {Ext.EventObject} handler.e The underyling {@link Ext.EventObject}.
     */

    activate: function() {
        var me = this;

        if (!me.activated && me.canActivate && me.rendered && !me.isDisabled() && me.isVisible()) {
            me.el.addCls(me.activeCls);
            me.focus();
            me.activated = true;
            me.fireEvent('activate', me);
        }
    },

    getFocusEl: function() {
        return this.itemEl;
    },

    deactivate: function() {
        var me = this;

        if (me.activated) {
            me.el.removeCls(me.activeCls);
            me.blur();
            me.hideMenu();
            me.activated = false;
            me.fireEvent('deactivate', me);
        }
    },

    deferExpandMenu: function() {
        var me = this;

        if (me.activated && (!me.menu.rendered || !me.menu.isVisible())) {
            me.parentMenu.activeChild = me.menu;
            me.menu.parentItem = me;
            me.menu.parentMenu = me.menu.ownerCt = me.parentMenu;
            me.menu.showBy(me, me.menuAlign);
        }
    },

    deferHideMenu: function() {
        if (this.menu.isVisible()) {
            this.menu.hide();
        }
    },
    
    cancelDeferHide: function(){
        clearTimeout(this.hideMenuTimer);
    },

    deferHideParentMenus: function() {
        var ancestor;
        Ext.menu.Manager.hideAll();

        if (!Ext.Element.getActiveElement()) {
            // If we have just hidden all Menus, and there is no currently focused element in the dom, transfer focus to the first visible ancestor if any.
            ancestor = this.up(':not([hidden])');
            if (ancestor) {
                ancestor.focus();
            }
        }
    },

    expandMenu: function(delay) {
        var me = this;

        if (me.menu) {
            me.cancelDeferHide();
            if (delay === 0) {
                me.deferExpandMenu();
            } else {
                me.expandMenuTimer = Ext.defer(me.deferExpandMenu, Ext.isNumber(delay) ? delay : me.menuExpandDelay, me);
            }
        }
    },

    getRefItems: function(deep){
        var menu = this.menu,
            items;

        if (menu) {
            items = menu.getRefItems(deep);
            items.unshift(menu);
        }
        return items || [];
    },

    hideMenu: function(delay) {
        var me = this;

        if (me.menu) {
            clearTimeout(me.expandMenuTimer);
            me.hideMenuTimer = Ext.defer(me.deferHideMenu, Ext.isNumber(delay) ? delay : me.menuHideDelay, me);
        }
    },

    initComponent: function() {
        var me = this,
            prefix = Ext.baseCSSPrefix,
            cls = [prefix + 'menu-item'],
            menu;

        me.addEvents(
            /**
             * @event activate
             * Fires when this item is activated
             * @param {Ext.menu.Item} item The activated item
             */
            'activate',

            /**
             * @event click
             * Fires when this item is clicked
             * @param {Ext.menu.Item} item The item that was clicked
             * @param {Ext.EventObject} e The underyling {@link Ext.EventObject}.
             */
            'click',

            /**
             * @event deactivate
             * Fires when this tiem is deactivated
             * @param {Ext.menu.Item} item The deactivated item
             */
            'deactivate'
        );

        if (me.plain) {
            cls.push(prefix + 'menu-item-plain');
        }

        if (me.cls) {
            cls.push(me.cls);
        }

        me.cls = cls.join(' ');

        if (me.menu) {
            menu = me.menu;
            delete me.menu;
            me.setMenu(menu);
        }

        me.callParent(arguments);
    },

    onClick: function(e) {
        var me = this;

        if (!me.href) {
            e.stopEvent();
        }

        if (me.disabled) {
            return;
        }

        if (me.hideOnClick) {
            me.deferHideParentMenusTimer = Ext.defer(me.deferHideParentMenus, me.clickHideDelay, me);
        }

        Ext.callback(me.handler, me.scope || me, [me, e]);
        me.fireEvent('click', me, e);

        if (!me.hideOnClick) {
            me.focus();
        }
    },

    onRemoved: function() {
        var me = this;

        // Removing the active item, must deactivate it.
        if (me.activated && me.parentMenu.activeItem === me) {
            me.parentMenu.deactivateActiveItem();
        }
        me.callParent(arguments);
        delete me.parentMenu;
        delete me.ownerButton;
    },

    // private
    beforeDestroy: function() {
        var me = this;
        if (me.rendered) {
            me.clearTip();
        }
        me.callParent();
    },

    onDestroy: function() {
        var me = this;

        clearTimeout(me.expandMenuTimer);
        me.cancelDeferHide();
        clearTimeout(me.deferHideParentMenusTimer);

        me.setMenu(null);
        me.callParent(arguments);
    },

    beforeRender: function() {
        var me = this,
            blank = Ext.BLANK_IMAGE_URL,
            iconCls,
            arrowCls;

        me.callParent();

        if (me.iconAlign === 'right') {
            iconCls = me.checkChangeDisabled ? me.disabledCls : '';
            arrowCls = Ext.baseCSSPrefix + 'menu-item-icon-right ' + me.iconCls;
        } else {
            iconCls = me.iconCls + (me.checkChangeDisabled ? ' ' + me.disabledCls : '');
            arrowCls = me.menu ? me.arrowCls : '';
        }
        Ext.applyIf(me.renderData, {
            href: me.href || '#',
            hrefTarget: me.hrefTarget,
            icon: me.icon || blank,
            iconCls: iconCls,
            plain: me.plain,
            text: me.text,
            arrowCls: arrowCls,
            blank: blank
        });
    },

    onRender: function() {
        var me = this;

        me.callParent(arguments);

        if (me.tooltip) {
            me.setTooltip(me.tooltip, true);
        }
    },
    
    /**
     * Set a child menu for this item. See the {@link #cfg-menu} configuration.
     * @param {Ext.menu.Menu/Object} menu A menu, or menu configuration. null may be
     * passed to remove the menu.
     * @param {Boolean} [destroyMenu] True to destroy any existing menu. False to
     * prevent destruction. If not specified, the {@link #destroyMenu} configuration
     * will be used.
     */
    setMenu: function(menu, destroyMenu) {
        var me = this,
            oldMenu = me.menu,
            arrowEl = me.arrowEl;
            
        if (oldMenu) {
            delete oldMenu.parentItem;
            delete oldMenu.parentMenu;
            delete oldMenu.ownerCt;
            delete oldMenu.ownerItem;
            
            if (destroyMenu === true || (destroyMenu !== false && me.destroyMenu)) {
                Ext.destroy(oldMenu);
            }
        }
        if (menu) {
            me.menu = Ext.menu.Manager.get(menu);
            me.menu.ownerItem = me;
        } else {
            me.menu = null;
        }
        
        if (me.rendered && !me.destroying && arrowEl) {
            arrowEl[me.menu ? 'addCls' : 'removeCls'](me.arrowCls);
        }
    },

    /**
     * Sets the {@link #click} handler of this item
     * @param {Function} fn The handler function
     * @param {Object} [scope] The scope of the handler function
     */
    setHandler: function(fn, scope) {
        this.handler = fn || null;
        this.scope = scope;
    },
    
    /**
     * Sets the {@link #icon} on this item.
     * @param {String} icon The new icon 
     */
    setIcon: function(icon){
        var iconEl = this.iconEl;
        if (iconEl) {
            iconEl.src = icon || Ext.BLANK_IMAGE_URL;
        }
        this.icon = icon;
    },

    /**
     * Sets the {@link #iconCls} of this item
     * @param {String} iconCls The CSS class to set to {@link #iconCls}
     */
    setIconCls: function(iconCls) {
        var me = this,
            iconEl = me.iconEl;

        if (iconEl) {
            if (me.iconCls) {
                iconEl.removeCls(me.iconCls);
            }

            if (iconCls) {
                iconEl.addCls(iconCls);
            }
        }

        me.iconCls = iconCls;
    },

    /**
     * Sets the {@link #text} of this item
     * @param {String} text The {@link #text}
     */
    setText: function(text) {
        var me = this,
            el = me.textEl || me.el;

        me.text = text;

        if (me.rendered) {
            el.update(text || '');
            // cannot just call layout on the component due to stretchmax
            me.ownerCt.updateLayout();
        }
    },

    getTipAttr: function(){
        return this.tooltipType == 'qtip' ? 'data-qtip' : 'title';
    },

    //private
    clearTip: function() {
        if (Ext.isObject(this.tooltip)) {
            Ext.tip.QuickTipManager.unregister(this.itemEl);
        }
    },

    /**
     * Sets the tooltip for this menu item.
     *
     * @param {String/Object} tooltip This may be:
     *
     *   - **String** : A string to be used as innerHTML (html tags are accepted) to show in a tooltip
     *   - **Object** : A configuration object for {@link Ext.tip.QuickTipManager#register}.
     *
     * @return {Ext.menu.Item} this
     */
    setTooltip: function(tooltip, initial) {
        var me = this;

        if (me.rendered) {
            if (!initial) {
                me.clearTip();
            }

            if (Ext.isObject(tooltip)) {
                Ext.tip.QuickTipManager.register(Ext.apply({
                    target: me.itemEl.id
                },
                tooltip));
                me.tooltip = tooltip;
            } else {
                me.itemEl.dom.setAttribute(me.getTipAttr(), tooltip);
            }
        } else {
            me.tooltip = tooltip;
        }

        return me;
    }
});

/**
 * A menu item that contains a togglable checkbox by default, but that can also be a part of a radio group.
 *
 *     @example
 *     Ext.create('Ext.menu.Menu', {
 *         width: 100,
 *         height: 110,
 *         floating: false,  // usually you want this set to True (default)
 *         renderTo: Ext.getBody(),  // usually rendered by it's containing component
 *         items: [{
 *             xtype: 'menucheckitem',
 *             text: 'select all'
 *         },{
 *             xtype: 'menucheckitem',
 *             text: 'select specific'
 *         },{
 *             iconCls: 'add16',
 *             text: 'icon item'
 *         },{
 *             text: 'regular item'
 *         }]
 *     });
 */
Ext.define('Ext.menu.CheckItem', {
    extend: 'Ext.menu.Item',
    alias: 'widget.menucheckitem',
    
    /**
     * @cfg {Boolean} [checked=false]
     * True to render the menuitem initially checked.
     */
    
    /**
     * @cfg {Function} checkHandler
     * Alternative for the {@link #checkchange} event.  Gets called with the same parameters.
     */

    /**
     * @cfg {Object} scope
     * Scope for the {@link #checkHandler} callback.
     */
    
    /**
     * @cfg {String} group
     * Name of a radio group that the item belongs.
     *
     * Specifying this option will turn check item into a radio item.
     *
     * Note that the group name must be globally unique.
     */

    /**
     * @cfg {String} checkedCls
     * The CSS class used by {@link #cls} to show the checked state.
     * Defaults to `Ext.baseCSSPrefix + 'menu-item-checked'`.
     */
    checkedCls: Ext.baseCSSPrefix + 'menu-item-checked',
    /**
     * @cfg {String} uncheckedCls
     * The CSS class used by {@link #cls} to show the unchecked state.
     * Defaults to `Ext.baseCSSPrefix + 'menu-item-unchecked'`.
     */
    uncheckedCls: Ext.baseCSSPrefix + 'menu-item-unchecked',
    /**
     * @cfg {String} groupCls
     * The CSS class applied to this item's icon image to denote being a part of a radio group.
     * Defaults to `Ext.baseCSSClass + 'menu-group-icon'`.
     * Any specified {@link #iconCls} overrides this.
     */
    groupCls: Ext.baseCSSPrefix + 'menu-group-icon',

    /**
     * @cfg {Boolean} [hideOnClick=false]
     * Whether to not to hide the owning menu when this item is clicked.
     * Defaults to `false` for checkbox items, and to `true` for radio group items.
     */
    hideOnClick: false,
    
    /**
     * @cfg {Boolean} [checkChangeDisabled=false]
     * True to prevent the checked item from being toggled. Any submenu will still be accessible.
     */
    checkChangeDisabled: false,

    afterRender: function() {
        var me = this;
        me.callParent();
        me.checked = !me.checked;
        me.setChecked(!me.checked, true);
        if (me.checkChangeDisabled) {
            me.disableCheckChange();
        }
    },

    initComponent: function() {
        var me = this;
        me.addEvents(
            /**
             * @event beforecheckchange
             * Fires before a change event. Return false to cancel.
             * @param {Ext.menu.CheckItem} this
             * @param {Boolean} checked
             */
            'beforecheckchange',

            /**
             * @event checkchange
             * Fires after a change event.
             * @param {Ext.menu.CheckItem} this
             * @param {Boolean} checked
             */
            'checkchange'
        );

        me.callParent(arguments);

        Ext.menu.Manager.registerCheckable(me);

        if (me.group) {
            if (!me.iconCls) {
                me.iconCls = me.groupCls;
            }
            if (me.initialConfig.hideOnClick !== false) {
                me.hideOnClick = true;
            }
        }
    },

    /**
     * Disables just the checkbox functionality of this menu Item. If this menu item has a submenu, that submenu
     * will still be accessible
     */
    disableCheckChange: function() {
        var me = this,
            iconEl = me.iconEl;

        if (iconEl) {
            iconEl.addCls(me.disabledCls);
        }
        // In some cases the checkbox will disappear until repainted
        // Happens in everything except IE9 strict, see: EXTJSIV-6412
        if (!(Ext.isIE9 && Ext.isStrict) && me.rendered) {
            me.el.repaint();
        }
        me.checkChangeDisabled = true;
    },

    /**
     * Reenables the checkbox functionality of this menu item after having been disabled by {@link #disableCheckChange}
     */
    enableCheckChange: function() {
        var me = this,
            iconEl = me.iconEl;
            
        if (iconEl) {
            iconEl.removeCls(me.disabledCls);
        }
        me.checkChangeDisabled = false;
    },

    onClick: function(e) {
        var me = this;
        if(!me.disabled && !me.checkChangeDisabled && !(me.checked && me.group)) {
            me.setChecked(!me.checked);
        }
        this.callParent([e]);
    },

    onDestroy: function() {
        Ext.menu.Manager.unregisterCheckable(this);
        this.callParent(arguments);
    },

    /**
     * Sets the checked state of the item
     * @param {Boolean} checked True to check, false to uncheck
     * @param {Boolean} [suppressEvents=false] True to prevent firing the checkchange events.
     */
    setChecked: function(checked, suppressEvents) {
        var me = this;
        if (me.checked !== checked && (suppressEvents || me.fireEvent('beforecheckchange', me, checked) !== false)) {
            if (me.el) {
                me.el[checked  ? 'addCls' : 'removeCls'](me.checkedCls)[!checked ? 'addCls' : 'removeCls'](me.uncheckedCls);
            }
            me.checked = checked;
            Ext.menu.Manager.onCheckChange(me, checked);
            if (!suppressEvents) {
                Ext.callback(me.checkHandler, me.scope, [me, checked]);
                me.fireEvent('checkchange', me, checked);
            }
        }
    }
});

/**
 * @private
 */
Ext.define('Ext.menu.KeyNav', {
    extend: 'Ext.util.KeyNav',

    requires: ['Ext.FocusManager'],
    
    constructor: function(menu) {
        var me = this;

        me.menu = menu;
        me.callParent([menu.el, {
            down: me.down,
            enter: me.enter,
            esc: me.escape,
            left: me.left,
            right: me.right,
            space: me.enter,
            tab: me.tab,
            up: me.up
        }]);
    },

    down: function(e) {
        var me = this,
            fi = me.menu.focusedItem;

        if (fi && e.getKey() == Ext.EventObject.DOWN && me.isWhitelisted(fi)) {
            return true;
        }
        me.focusNextItem(1);
    },

    enter: function(e) {
        var menu = this.menu,
            focused = menu.focusedItem;
 
        if (menu.activeItem) {
            menu.onClick(e);
        } else if (focused && focused.isFormField) {
            // prevent stopEvent being called
            return true;
        }
    },

    escape: function(e) {
        Ext.menu.Manager.hideAll();
    },

    focusNextItem: function(step) {
        var menu = this.menu,
            items = menu.items,
            focusedItem = menu.focusedItem,
            startIdx = focusedItem ? items.indexOf(focusedItem) : -1,
            idx = startIdx + step,
            item;

        while (idx != startIdx) {
            if (idx < 0) {
                idx = items.length - 1;
            } else if (idx >= items.length) {
                idx = 0;
            }

            item = items.getAt(idx);
            if (menu.canActivateItem(item)) {
                menu.setActiveItem(item);
                break;
            }
            idx += step;
        }
    },

    isWhitelisted: function(item) {
        return Ext.FocusManager.isWhitelisted(item);
    },

    left: function(e) {
        var menu = this.menu,
            fi = menu.focusedItem,
            ai = menu.activeItem;

        if (fi && this.isWhitelisted(fi)) {
            return true;
        }

        menu.hide();
        if (menu.parentMenu) {
            menu.parentMenu.focus();
        }
    },

    right: function(e) {
        var menu = this.menu,
            fi = menu.focusedItem,
            ai = menu.activeItem,
            am;

        if (fi && this.isWhitelisted(fi)) {
            return true;
        }

        if (ai) {
            am = menu.activeItem.menu;
            if (am) {
                ai.expandMenu(0);
                Ext.defer(function() {
                    am.setActiveItem(am.items.getAt(0));
                }, 25);
            }
        }
    },

    tab: function(e) {
        var me = this;

        if (e.shiftKey) {
            me.up(e);
        } else {
            me.down(e);
        }
    },

    up: function(e) {
        var me = this,
            fi = me.menu.focusedItem;

        if (fi && e.getKey() == Ext.EventObject.UP && me.isWhitelisted(fi)) {
            return true;
        }
        me.focusNextItem(-1);
    }
});
/**
 * Provides a common registry of all menus on a page.
 * @singleton
 */
Ext.define('Ext.menu.Manager', {
    singleton: true,
    requires: [
        'Ext.util.MixedCollection',
        'Ext.util.KeyMap'
    ],
    alternateClassName: 'Ext.menu.MenuMgr',

    uses: ['Ext.menu.Menu'],

    menus: {},
    groups: {},
    attached: false,
    lastShow: new Date(),

    init: function() {
        var me = this;
        
        me.active = new Ext.util.MixedCollection();
        Ext.getDoc().addKeyListener(27, function() {
            if (me.active.length > 0) {
                me.hideAll();
            }
        }, me);
    },

    /**
     * Hides all menus that are currently visible
     * @return {Boolean} success True if any active menus were hidden.
     */
    hideAll: function() {
        var active = this.active,
        clone, menus, m, mLen;

        if (active && active.length > 0) {
            clone = active.clone();
            menus = clone.items;
            mLen  = menus.length;

            for (m = 0; m < mLen; m++) {
                menus[m].hide();
            }

            return true;
        }
        return false;
    },

    onHide: function(m) {
        var me = this,
            active = me.active;
        active.remove(m);
        if (active.length < 1) {
            Ext.getDoc().un('mousedown', me.onMouseDown, me);
            me.attached = false;
        }
    },

    onShow: function(m) {
        var me = this,
            active   = me.active,
            last     = active.last(),
            attached = me.attached,
            menuEl   = m.getEl(),
            zIndex;

        me.lastShow = new Date();
        active.add(m);
        if (!attached) {
            Ext.getDoc().on('mousedown', me.onMouseDown, me, {
                // On IE we have issues with the menu stealing focus at certain points
                // during the head, so give it a short buffer
                buffer: Ext.isIE ? 10 : undefined
            });
            me.attached = true;
        }
        m.toFront();
    },

    onBeforeHide: function(m) {
        if (m.activeChild) {
            m.activeChild.hide();
        }
        if (m.autoHideTimer) {
            clearTimeout(m.autoHideTimer);
            delete m.autoHideTimer;
        }
    },

    onBeforeShow: function(m) {
        var active = this.active,
            parentMenu = m.parentMenu;
            
        active.remove(m);
        if (!parentMenu && !m.allowOtherMenus) {
            this.hideAll();
        }
        else if (parentMenu && parentMenu.activeChild && m != parentMenu.activeChild) {
            parentMenu.activeChild.hide();
        }
    },

    // private
    onMouseDown: function(e) {
        var me = this,
            active = me.active,
            lastShow = me.lastShow;

        if (Ext.Date.getElapsed(lastShow) > 50 && active.length > 0 && !e.getTarget('.' + Ext.baseCSSPrefix + 'menu')) {
            me.hideAll();
        }
    },

    // private
    register: function(menu) {
        var me = this;

        if (!me.active) {
            me.init();
        }

        if (menu.floating) {
            me.menus[menu.id] = menu;
            menu.on({
                beforehide: me.onBeforeHide,
                hide: me.onHide,
                beforeshow: me.onBeforeShow,
                show: me.onShow,
                scope: me
            });
        }
    },

    /**
     * Returns a {@link Ext.menu.Menu} object
     * @param {String/Object} menu The string menu id, an existing menu object reference, or a Menu config that will
     * be used to generate and return a new Menu this.
     * @return {Ext.menu.Menu} The specified menu, or null if none are found
     */
    get: function(menu) {
        var menus = this.menus;
        
        if (typeof menu == 'string') { // menu id
            if (!menus) {  // not initialized, no menus to return
                return null;
            }
            return menus[menu];
        } else if (menu.isMenu) {  // menu instance
            return menu;
        } else if (Ext.isArray(menu)) { // array of menu items
            return new Ext.menu.Menu({items:menu});
        } else { // otherwise, must be a config
            return Ext.ComponentManager.create(menu, 'menu');
        }
    },

    // private
    unregister: function(menu) {
        var me = this,
            menus = me.menus,
            active = me.active;

        delete menus[menu.id];
        active.remove(menu);
        menu.un({
            beforehide: me.onBeforeHide,
            hide: me.onHide,
            beforeshow: me.onBeforeShow,
            show: me.onShow,
            scope: me
        });
    },

    // private
    registerCheckable: function(menuItem) {
        var groups  = this.groups,
            groupId = menuItem.group;

        if (groupId) {
            if (!groups[groupId]) {
                groups[groupId] = [];
            }

            groups[groupId].push(menuItem);
        }
    },

    // private
    unregisterCheckable: function(menuItem) {
        var groups  = this.groups,
            groupId = menuItem.group;

        if (groupId) {
            Ext.Array.remove(groups[groupId], menuItem);
        }
    },

    onCheckChange: function(menuItem, state) {
        var groups  = this.groups,
            groupId = menuItem.group,
            i       = 0,
            group, ln, curr;

        if (groupId && state) {
            group = groups[groupId];
            ln = group.length;
            for (; i < ln; i++) {
                curr = group[i];
                if (curr != menuItem) {
                    curr.setChecked(false);
                }
            }
        }
    }
});
/**
 * Adds a separator bar to a menu, used to divide logical groups of menu items. Generally you will
 * add one of these by using "-" in your call to add() or in your items config rather than creating one directly.
 *
 *     @example
 *     Ext.create('Ext.menu.Menu', {
 *         width: 100,
 *         height: 100,
 *         floating: false,  // usually you want this set to True (default)
 *         renderTo: Ext.getBody(),  // usually rendered by it's containing component
 *         items: [{
 *             text: 'icon item',
 *             iconCls: 'add16'
 *         },{
 *             xtype: 'menuseparator'
 *         },{
 *            text: 'separator above'
 *         },{
 *            text: 'regular item'
 *         }]
 *     });
 */
Ext.define('Ext.menu.Separator', {
    extend: 'Ext.menu.Item',
    alias: 'widget.menuseparator',

    /**
     * @cfg {String} activeCls
     * @private
     */

    /**
     * @cfg {Boolean} canActivate
     * @private
     */
    canActivate: false,

    /**
     * @cfg {Boolean} clickHideDelay
     * @private
     */

    /**
     * @cfg {Boolean} destroyMenu
     * @private
     */

    /**
     * @cfg {Boolean} disabledCls
     * @private
     */

    focusable: false,

    /**
     * @cfg {String} href
     * @private
     */

    /**
     * @cfg {String} hrefTarget
     * @private
     */

    /**
     * @cfg {Boolean} hideOnClick
     * @private
     */
    hideOnClick: false,

    /**
     * @cfg {String} icon
     * @private
     */

    /**
     * @cfg {String} iconCls
     * @private
     */

    /**
     * @cfg {Object} menu
     * @private
     */

    /**
     * @cfg {String} menuAlign
     * @private
     */

    /**
     * @cfg {Number} menuExpandDelay
     * @private
     */

    /**
     * @cfg {Number} menuHideDelay
     * @private
     */

    /**
     * @cfg {Boolean} plain
     * @private
     */
    plain: true,

    /**
     * @cfg {String} separatorCls
     * The CSS class used by the separator item to show the incised line.
     */
    separatorCls: Ext.baseCSSPrefix + 'menu-item-separator',

    /**
     * @cfg {String} text
     * @private
     */
    text: '&#160;',

    beforeRender: function(ct, pos) {
        var me = this;

        me.callParent();

        me.addCls(me.separatorCls);
    }
});



/**
 * A menu object. This is the container to which you may add {@link Ext.menu.Item menu items}.
 *
 * Menus may contain either {@link Ext.menu.Item menu items}, or general {@link Ext.Component Components}.
 * Menus may also contain {@link Ext.panel.AbstractPanel#dockedItems docked items} because it extends {@link Ext.panel.Panel}.
 *
 * To make a contained general {@link Ext.Component Component} line up with other {@link Ext.menu.Item menu items},
 * specify `{@link Ext.menu.Item#plain plain}: true`. This reserves a space for an icon, and indents the Component
 * in line with the other menu items.
 *
 * By default, Menus are absolutely positioned, floating Components. By configuring a Menu with `{@link #floating}: false`,
 * a Menu may be used as a child of a {@link Ext.container.Container Container}.
 *
 *     @example
 *     Ext.create('Ext.menu.Menu', {
 *         width: 100,
 *         margin: '0 0 10 0',
 *         floating: false,  // usually you want this set to True (default)
 *         renderTo: Ext.getBody(),  // usually rendered by it's containing component
 *         items: [{
 *             text: 'regular item 1'
 *         },{
 *             text: 'regular item 2'
 *         },{
 *             text: 'regular item 3'
 *         }]
 *     });
 *
 *     Ext.create('Ext.menu.Menu', {
 *         width: 100,
 *         plain: true,
 *         floating: false,  // usually you want this set to True (default)
 *         renderTo: Ext.getBody(),  // usually rendered by it's containing component
 *         items: [{
 *             text: 'plain item 1'
 *         },{
 *             text: 'plain item 2'
 *         },{
 *             text: 'plain item 3'
 *         }]
 *     });
 */
Ext.define('Ext.menu.Menu', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.menu',
    requires: [
        'Ext.layout.container.Fit',
        'Ext.layout.container.VBox',
        'Ext.menu.CheckItem',
        'Ext.menu.Item',
        'Ext.menu.KeyNav',
        'Ext.menu.Manager',
        'Ext.menu.Separator'
    ],

    /**
     * @property {Ext.menu.Menu} parentMenu
     * The parent Menu of this Menu.
     */
    
    /**
     * @cfg {Boolean} [enableKeyNav=true]
     * True to enable keyboard navigation for controlling the menu.
     * This option should generally be disabled when form fields are
     * being used inside the menu.
     */
    enableKeyNav: true,

    /**
     * @cfg {Boolean} [allowOtherMenus=false]
     * True to allow multiple menus to be displayed at the same time.
     */
    allowOtherMenus: false,

    /**
     * @cfg {String} ariaRole
     * @private
     */
    ariaRole: 'menu',

    /**
     * @cfg {Boolean} autoRender
     * Floating is true, so autoRender always happens.
     * @private
     */

    /**
     * @cfg {String} [defaultAlign="tl-bl?"]
     * The default {@link Ext.Element#getAlignToXY Ext.Element#getAlignToXY} anchor position value for this menu
     * relative to its element of origin.
     */
    defaultAlign: 'tl-bl?',

    /**
     * @cfg {Boolean} [floating=true]
     * A Menu configured as `floating: true` (the default) will be rendered as an absolutely positioned,
     * {@link Ext.Component#floating floating} {@link Ext.Component Component}. If configured as `floating: false`, the Menu may be
     * used as a child item of another {@link Ext.container.Container Container}.
     */
    floating: true,

    /**
     * @cfg {Boolean} constrain
     * Menus are constrained to the document body by default.
     * @private
     */
    constrain: true,

    /**
     * @cfg {Boolean} [hidden=undefined]
     * True to initially render the Menu as hidden, requiring to be shown manually.
     *
     * Defaults to `true` when `floating: true`, and defaults to `false` when `floating: false`.
     */
    hidden: true,

    hideMode: 'visibility',

    /**
     * @cfg {Boolean} [ignoreParentClicks=false]
     * True to ignore clicks on any item in this menu that is a parent item (displays a submenu)
     * so that the submenu is not dismissed when clicking the parent item.
     */
    ignoreParentClicks: false,

    /**
     * @property {Boolean} isMenu
     * `true` in this class to identify an object as an instantiated Menu, or subclass thereof.
     */
    isMenu: true,

    /**
     * @cfg {String/Object} layout
     * @private
     */

    /**
     * @cfg {Boolean} [showSeparator=true]
     * True to show the icon separator.
     */
    showSeparator : true,

    /**
     * @cfg {Number} [minWidth=120]
     * The minimum width of the Menu. The default minWidth only applies when the {@link #floating} config is true.
     */
    minWidth: undefined,
    
    defaultMinWidth: 120,

    /**
     * @cfg {Boolean} [plain=false]
     * True to remove the incised line down the left side of the menu and to not indent general Component items.
     */

    initComponent: function() {
        var me = this,
            prefix = Ext.baseCSSPrefix,
            cls = [prefix + 'menu'],
            bodyCls = me.bodyCls ? [me.bodyCls] : [],
            isFloating = me.floating !== false;

        me.addEvents(
            /**
             * @event click
             * Fires when this menu is clicked
             * @param {Ext.menu.Menu} menu The menu which has been clicked
             * @param {Ext.Component} item The menu item that was clicked. `undefined` if not applicable.
             * @param {Ext.EventObject} e The underlying {@link Ext.EventObject}.
             */
            'click',

            /**
             * @event mouseenter
             * Fires when the mouse enters this menu
             * @param {Ext.menu.Menu} menu The menu
             * @param {Ext.EventObject} e The underlying {@link Ext.EventObject}
             */
            'mouseenter',

            /**
             * @event mouseleave
             * Fires when the mouse leaves this menu
             * @param {Ext.menu.Menu} menu The menu
             * @param {Ext.EventObject} e The underlying {@link Ext.EventObject}
             */
            'mouseleave',

            /**
             * @event mouseover
             * Fires when the mouse is hovering over this menu
             * @param {Ext.menu.Menu} menu The menu
             * @param {Ext.Component} item The menu item that the mouse is over. `undefined` if not applicable.
             * @param {Ext.EventObject} e The underlying {@link Ext.EventObject}
             */
            'mouseover'
        );

        Ext.menu.Manager.register(me);

        // Menu classes
        if (me.plain) {
            cls.push(prefix + 'menu-plain');
        }
        me.cls = cls.join(' ');

        // Menu body classes
        bodyCls.unshift(prefix + 'menu-body');
        me.bodyCls = bodyCls.join(' ');

        // Internal vbox layout, with scrolling overflow
        // Placed in initComponent (rather than prototype) in order to support dynamic layout/scroller
        // options if we wish to allow for such configurations on the Menu.
        // e.g., scrolling speed, vbox align stretch, etc.
        if (!me.layout) {
            me.layout = {
                type: 'vbox',
                align: 'stretchmax',
                overflowHandler: 'Scroller'
            };
        }
        
        // only apply the minWidth when we're floating & one hasn't already been set
        if (isFloating && me.minWidth === undefined) {
            me.minWidth = me.defaultMinWidth;
        }

        // hidden defaults to false if floating is configured as false
        if (!isFloating && me.initialConfig.hidden !== true) {
            me.hidden = false;
        }

        me.callParent(arguments);

        me.on('beforeshow', function() {
            var hasItems = !!me.items.length;
            // FIXME: When a menu has its show cancelled because of no items, it
            // gets a visibility: hidden applied to it (instead of the default display: none)
            // Not sure why, but we remove this style when we want to show again.
            if (hasItems && me.rendered) {
                me.el.setStyle('visibility', null);
            }
            return hasItems;
        });
    },

    beforeRender: function() {
        this.callParent(arguments);

        // Menus are usually floating: true, which means they shrink wrap their items.
        // However, when they are contained, and not auto sized, we must stretch the items.
        if (!this.getSizeModel().width.shrinkWrap) {
            this.layout.align = 'stretch';
        }
    },

    onBoxReady: function() {
        var me = this,
            separatorSpec;

        me.callParent(arguments);

        // TODO: Move this to a subTemplate When we support them in the future
        if (me.showSeparator) {
            separatorSpec = {
                cls: Ext.baseCSSPrefix + 'menu-icon-separator',
                html: '&#160;'
            };
            if ((!Ext.isStrict && Ext.isIE) || Ext.isIE6) {
                separatorSpec.style = 'height:' + me.el.getHeight() + 'px';
            }
            me.iconSepEl = me.layout.getElementTarget().insertFirst(separatorSpec);
        }

        me.mon(me.el, {
            click: me.onClick,
            mouseover: me.onMouseOver,
            scope: me
        });
        me.mouseMonitor = me.el.monitorMouseLeave(100, me.onMouseLeave, me);

        if (me.enableKeyNav) {
            me.keyNav = new Ext.menu.KeyNav(me);
        }
    },

    getBubbleTarget: function() {
        // If a submenu, this will have a parentMenu property
        // If a menu of a Button, it will have an ownerButton property
        // Else use the default method.
        return this.parentMenu || this.ownerButton || this.callParent(arguments);
    },

    /**
     * Returns whether a menu item can be activated or not.
     * @return {Boolean}
     */
    canActivateItem: function(item) {
        return item && !item.isDisabled() && item.isVisible() && (item.canActivate || item.getXTypes().indexOf('menuitem') < 0);
    },

    /**
     * Deactivates the current active item on the menu, if one exists.
     */
    deactivateActiveItem: function(andBlurFocusedItem) {
        var me = this,
            activeItem = me.activeItem,
            focusedItem = me.focusedItem;

        if (activeItem) {
            activeItem.deactivate();
            if (!activeItem.activated) {
                delete me.activeItem;
            }
        }

        // Blur the focused item if we are being asked to do that too
        // Only needed if we are being hidden - mouseout does not blur.
        if (focusedItem && andBlurFocusedItem) {
            focusedItem.blur();
            delete me.focusedItem;
        }
    },

    // inherit docs
    getFocusEl: function() {
        return this.focusedItem || this.el;
    },

    // inherit docs
    hide: function() {
        this.deactivateActiveItem(true);
        this.callParent(arguments);
    },

    // private
    getItemFromEvent: function(e) {
        return this.getChildByElement(e.getTarget());
    },

    lookupComponent: function(cmp) {
        var me = this;

        if (typeof cmp == 'string') {
            cmp = me.lookupItemFromString(cmp);
        } else if (Ext.isObject(cmp)) {
            cmp = me.lookupItemFromObject(cmp);
        }

        // Apply our minWidth to all of our child components so it's accounted
        // for in our VBox layout
        cmp.minWidth = cmp.minWidth || me.minWidth;

        return cmp;
    },

    // private
    lookupItemFromObject: function(cmp) {
        var me = this,
            prefix = Ext.baseCSSPrefix,
            cls;

        if (!cmp.isComponent) {
            if (!cmp.xtype) {
                cmp = Ext.create('Ext.menu.' + (Ext.isBoolean(cmp.checked) ? 'Check': '') + 'Item', cmp);
            } else {
                cmp = Ext.ComponentManager.create(cmp, cmp.xtype);
            }
        }

        if (cmp.isMenuItem) {
            cmp.parentMenu = me;
        }

        if (!cmp.isMenuItem && !cmp.dock) {
            cls = [prefix + 'menu-item', prefix + 'menu-item-cmp'];

            if (!me.plain && (cmp.indent === true || cmp.iconCls === 'no-icon')) {
                cls.push(prefix + 'menu-item-indent');
            }

            if (cmp.rendered) {
                cmp.el.addCls(cls);
            } else {
                cmp.cls = (cmp.cls ? cmp.cls : '') + ' ' + cls.join(' ');
            }
        }
        return cmp;
    },

    // private
    lookupItemFromString: function(cmp) {
        return (cmp == 'separator' || cmp == '-') ?
            new Ext.menu.Separator()
            : new Ext.menu.Item({
                canActivate: false,
                hideOnClick: false,
                plain: true,
                text: cmp
            });
    },

    onClick: function(e) {
        var me = this,
            item;

        if (me.disabled) {
            e.stopEvent();
            return;
        }

        item = (e.type === 'click') ? me.getItemFromEvent(e) : me.activeItem;
        if (item && item.isMenuItem) {
            if (!item.menu || !me.ignoreParentClicks) {
                item.onClick(e);
            } else {
                e.stopEvent();
            }
        }
        // Click event may be fired without an item, so we need a second check
        if (!item || item.disabled) {
            item = undefined;
        }
        me.fireEvent('click', me, item, e);
    },

    onDestroy: function() {
        var me = this;

        Ext.menu.Manager.unregister(me);
        delete me.parentMenu;
        delete me.ownerButton;
        if (me.rendered) {
            me.el.un(me.mouseMonitor);
            Ext.destroy(me.keyNav);
            delete me.keyNav;
        }
        me.callParent(arguments);
    },

    onMouseLeave: function(e) {
        var me = this;

        me.deactivateActiveItem();

        if (me.disabled) {
            return;
        }

        me.fireEvent('mouseleave', me, e);
    },

    onMouseOver: function(e) {
        var me = this,
            fromEl = e.getRelatedTarget(),
            mouseEnter = !me.el.contains(fromEl),
            item = me.getItemFromEvent(e),
            parentMenu = me.parentMenu,
            parentItem = me.parentItem;

        if (mouseEnter && parentMenu) {
            parentMenu.setActiveItem(parentItem);
            parentItem.cancelDeferHide();
            parentMenu.mouseMonitor.mouseenter();
        }

        if (me.disabled) {
            return;
        }

        // Do not activate the item if the mouseover was within the item, and it's already active
        if (item && !item.activated) {
            me.setActiveItem(item);
            if (item.activated && item.expandMenu) {
                item.expandMenu();
            }
        }
        if (mouseEnter) {
            me.fireEvent('mouseenter', me, e);
        }
        me.fireEvent('mouseover', me, item, e);
    },

    setActiveItem: function(item) {
        var me = this;

        if (item && (item != me.activeItem)) {
            me.deactivateActiveItem();
            if (me.canActivateItem(item)) {
                if (item.activate) {
                    item.activate();
                    if (item.activated) {
                        me.activeItem = item;
                        me.focusedItem = item;
                        me.focus();
                    }
                } else {
                    item.focus();
                    me.focusedItem = item;
                }
            }
            item.el.scrollIntoView(me.layout.getRenderTarget());
        }
    },

    /**
     * Shows the floating menu by the specified {@link Ext.Component Component} or {@link Ext.Element Element}.
     * @param {Ext.Component/Ext.Element} component The {@link Ext.Component} or {@link Ext.Element} to show the menu by.
     * @param {String} [position] Alignment position as used by {@link Ext.Element#getAlignToXY}.
     * Defaults to `{@link #defaultAlign}`.
     * @param {Number[]} [offsets] Alignment offsets as used by {@link Ext.Element#getAlignToXY}.
     * @return {Ext.menu.Menu} This Menu.
     */
    showBy: function(cmp, pos, off) {
        var me = this;

        if (me.floating && cmp) {
            me.show();

            // Align to Component or Element using setPagePosition because normal show
            // methods are container-relative, and we must align to the requested element
            // or Component:
            me.setPagePosition(me.el.getAlignToXY(cmp.el || cmp, pos || me.defaultAlign, off));
            me.setVerticalPosition();
        }
        return me;
    },

    show: function() {
        var me = this,
            parentEl, viewHeight, result,
            maxWas = me.maxHeight;

        // we need to get scope parent for height constraint
        if (!me.rendered){
            me.doAutoRender();
        }

        // constrain the height to the curren viewable area
        if (me.floating) {
            //if our reset css is scoped, there will be a x-reset wrapper on this menu which we need to skip
            parentEl = Ext.fly(me.el.getScopeParent());
            viewHeight = parentEl.getViewSize().height;
            me.maxHeight  =  Math.min(maxWas || viewHeight, viewHeight);
        }

        result = me.callParent(arguments);
        me.maxHeight = maxWas;
        return result;
    },

    afterComponentLayout: function(width, height, oldWidth, oldHeight){
        var me = this;
        me.callParent(arguments);
        // fixup the separator
        if (me.showSeparator){
            me.iconSepEl.setHeight(me.componentLayout.lastComponentSize.contentHeight);
        }
    },

    // private
    // adjust the vertical position of the menu if the height of the
    // menu is equal (or greater than) the viewport size
    setVerticalPosition: function(){
        var me = this,
            max,
            y = me.el.getY(),
            returnY = y,
            height = me.getHeight(),
            viewportHeight = Ext.Element.getViewportHeight().height,
            parentEl = Ext.fly(me.el.getScopeParent()),
            viewHeight = parentEl.getViewSize().height,
            normalY = y - parentEl.getScroll().top; // factor in scrollTop of parent

        parentEl = null;

        if (me.floating) {
            max = me.maxHeight ? me.maxHeight : viewHeight - normalY;
            if (height > viewHeight) {
                returnY = y - normalY;
            } else if (max < height) {
                returnY = y - (height - max);
            } else if((y + height) > viewportHeight){ // keep the document from scrolling
                returnY = viewportHeight - height;
            }
        }
        me.el.setY(returnY);
    }
});