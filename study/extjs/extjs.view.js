
/**
 * @class Ext.view.AbstractView
 * This is an abstract superclass and should not be used directly. Please see {@link Ext.view.View}.
 * @private
 */
Ext.define('Ext.view.AbstractView', {
    extend: 'Ext.Component',
    requires: [
        'Ext.LoadMask',
        'Ext.data.StoreManager',
        'Ext.CompositeElementLite',
        'Ext.DomQuery',
        'Ext.selection.DataViewModel'
    ],
    mixins: {
        bindable: 'Ext.util.Bindable'
    },

    inheritableStatics: {
        getRecord: function(node) {
            return this.getBoundView(node).getRecord(node);
        },

        getBoundView: function(node) {
            return Ext.getCmp(node.boundView);
        }
    },

    /**
     * @cfg {String/String[]/Ext.XTemplate} tpl (required)
     * The HTML fragment or an array of fragments that will make up the template used by this DataView.  This should
     * be specified in the same format expected by the constructor of {@link Ext.XTemplate}.
     */
    /**
     * @cfg {Ext.data.Store} store (required)
     * The {@link Ext.data.Store} to bind this DataView to.
     */

    /**
     * @cfg {Boolean} deferInitialRefresh
     * <p>Defaults to <code>true</code> to defer the initial refresh of the view.</p>
     * <p>This allows the View to execute its render and initial layout more quickly because the process will not be encumbered
     * by the expensive update of the view structure.</p>
     * <p><b>Important: </b>Be aware that this will mean that the View's item elements will not be available immediately upon render, so
     * <i>selection</i> may not take place at render time. To access a View's item elements as soon as possible, use the {@link #viewready} event.
     * Or set <code>deferInitialrefresh</code> to false, but this will be at the cost of slower rendering.</p>
     */
    deferInitialRefresh: true,

    /**
     * @cfg {String} itemSelector (required)
     * <b>This is a required setting</b>. A simple CSS selector (e.g. <tt>div.some-class</tt> or
     * <tt>span:first-child</tt>) that will be used to determine what nodes this DataView will be
     * working with. The itemSelector is used to map DOM nodes to records. As such, there should
     * only be one root level element that matches the selector for each record.
     */

    /**
     * @cfg {String} itemCls
     * Specifies the class to be assigned to each element in the view when used in conjunction with the
     * {@link #itemTpl} configuration.
     */
    itemCls: Ext.baseCSSPrefix + 'dataview-item',

    /**
     * @cfg {String/String[]/Ext.XTemplate} itemTpl
     * The inner portion of the item template to be rendered. Follows an XTemplate
     * structure and will be placed inside of a tpl.
     */

    /**
     * @cfg {String} overItemCls
     * A CSS class to apply to each item in the view on mouseover.
     * Setting this will automatically set {@link #trackOver} to `true`.
     */

    //<locale>
    /**
     * @cfg {String} loadingText
     * A string to display during data load operations.  If specified, this text will be
     * displayed in a loading div and the view's contents will be cleared while loading, otherwise the view's
     * contents will continue to display normally until the new data is loaded and the contents are replaced.
     */
    loadingText: 'Loading...',
    //</locale>

    /**
     * @cfg {Boolean/Object} loadMask
     * False to disable a load mask from displaying while the view is loading. This can also be a
     * {@link Ext.LoadMask} configuration object.
     */
    loadMask: true,

    /**
     * @cfg {String} loadingCls
     * The CSS class to apply to the loading message element. Defaults to Ext.LoadMask.prototype.msgCls "x-mask-loading".
     */

    /**
     * @cfg {Boolean} loadingUseMsg
     * Whether or not to use the loading message.
     * @private
     */
    loadingUseMsg: true,


    /**
     * @cfg {Number} loadingHeight
     * If specified, gives an explicit height for the data view when it is showing the {@link #loadingText},
     * if that is specified. This is useful to prevent the view's height from collapsing to zero when the
     * loading mask is applied and there are no other contents in the data view.
     */

    /**
     * @cfg {String} selectedItemCls
     * A CSS class to apply to each selected item in the view.
     */
    selectedItemCls: Ext.baseCSSPrefix + 'item-selected',

    //<locale>
    /**
     * @cfg {String} emptyText
     * The text to display in the view when there is no data to display.
     * Note that when using local data the emptyText will not be displayed unless you set
     * the {@link #deferEmptyText} option to false.
     */
    emptyText: "",
    //</locale>

    /**
     * @cfg {Boolean} deferEmptyText
     * True to defer emptyText being applied until the store's first load.
     */
    deferEmptyText: true,

    /**
     * @cfg {Boolean} trackOver
     * When `true` the {@link #overItemCls} will be applied to rows when hovered over.
     * This in return will also cause {@link Ext.view.View#highlightitem highlightitem} and
     * {@link Ext.view.View#unhighlightitem unhighlightitem} events to be fired.
     *
     * Enabled automatically when the {@link #overItemCls} config is set.
     */
    trackOver: false,

    /**
     * @cfg {Boolean} blockRefresh
     * Set this to true to ignore refresh events on the bound store. This is useful if
     * you wish to provide custom transition animations via a plugin
     */
    blockRefresh: false,

    /**
     * @cfg {Boolean} disableSelection
     * True to disable selection within the DataView. This configuration will lock the selection model
     * that the DataView uses.
     */

    /**
     * @cfg {Boolean} preserveScrollOnRefresh=false
     * True to preserve scroll position across refresh operations.
     */
    preserveScrollOnRefresh: false,

    //private
    last: false,

    triggerEvent: 'itemclick',
    triggerCtEvent: 'containerclick',

    addCmpEvents: function() {

    },

    // private
    initComponent : function(){
        var me = this,
            isDef = Ext.isDefined,
            itemTpl = me.itemTpl,
            memberFn = {};

        if (itemTpl) {
            if (Ext.isArray(itemTpl)) {
                // string array
                itemTpl = itemTpl.join('');
            } else if (Ext.isObject(itemTpl)) {
                // tpl instance
                memberFn = Ext.apply(memberFn, itemTpl.initialConfig);
                itemTpl = itemTpl.html;
            }

            if (!me.itemSelector) {
                me.itemSelector = '.' + me.itemCls;
            }

            itemTpl = Ext.String.format('<tpl for="."><div class="{0}">{1}</div></tpl>', me.itemCls, itemTpl);
            me.tpl = new Ext.XTemplate(itemTpl, memberFn);
        }

        if (!isDef(me.tpl) || !isDef(me.itemSelector)) {
            Ext.Error.raise({
                sourceClass: 'Ext.view.View',
                tpl: me.tpl,
                itemSelector: me.itemSelector,
                msg: "DataView requires both tpl and itemSelector configurations to be defined."
            });
        }

        me.callParent();
        if(Ext.isString(me.tpl) || Ext.isArray(me.tpl)){
            me.tpl = new Ext.XTemplate(me.tpl);
        }

        // backwards compat alias for overClass/selectedClass
        // TODO: Consider support for overCls generation Ext.Component config
        if (isDef(me.overCls) || isDef(me.overClass)) {
            if (Ext.isDefined(Ext.global.console)) {
                Ext.global.console.warn('Ext.view.View: Using the deprecated overCls or overClass configuration. Use overItemCls instead.');
            }
            me.overItemCls = me.overCls || me.overClass;
            delete me.overCls;
            delete me.overClass;
        }

        if (me.overItemCls) {
            me.trackOver = true;
        }

        if (isDef(me.selectedCls) || isDef(me.selectedClass)) {
            if (Ext.isDefined(Ext.global.console)) {
                Ext.global.console.warn('Ext.view.View: Using the deprecated selectedCls or selectedClass configuration. Use selectedItemCls instead.');
            }
            me.selectedItemCls = me.selectedCls || me.selectedClass;
            delete me.selectedCls;
            delete me.selectedClass;
        }

        me.addEvents(
            /**
             * @event beforerefresh
             * Fires before the view is refreshed
             * @param {Ext.view.View} this The DataView object
             */
            'beforerefresh',
            /**
             * @event refresh
             * Fires when the view is refreshed
             * @param {Ext.view.View} this The DataView object
             */
            'refresh',
            /**
             * @event viewready
             * Fires when the View's item elements representing Store items has been rendered. If the {@link #deferInitialRefresh} flag
             * was set (and it is <code>true</code> by default), this will be <b>after</b> initial render, and no items will be available
             * for selection until this event fires.
             * @param {Ext.view.View} this
             */
            'viewready',
            /**
             * @event itemupdate
             * Fires when the node associated with an individual record is updated
             * @param {Ext.data.Model} record The model instance
             * @param {Number} index The index of the record/node
             * @param {HTMLElement} node The node that has just been updated
             */
            'itemupdate',
            /**
             * @event itemadd
             * Fires when the nodes associated with an recordset have been added to the underlying store
             * @param {Ext.data.Model[]} records The model instance
             * @param {Number} index The index at which the set of record/nodes starts
             * @param {HTMLElement[]} node The node that has just been updated
             */
            'itemadd',
            /**
             * @event itemremove
             * Fires when the node associated with an individual record is removed
             * @param {Ext.data.Model} record The model instance
             * @param {Number} index The index of the record/node
             */
            'itemremove'
        );

        me.addCmpEvents();

        // Look up the configured Store. If none configured, use the fieldless, empty Store defined in Ext.data.Store.
        me.store = Ext.data.StoreManager.lookup(me.store || 'ext-empty-store');
        me.bindStore(me.store, true);
        me.all = new Ext.CompositeElementLite();

        // We track the scroll position
        me.scrollState = {
            top: 0,
            left: 0
        };
        me.on({
            scroll: me.onViewScroll,
            element: 'el',
            scope: me
        });
    },

    onRender: function() {
        var me = this,
            mask = me.loadMask,
            cfg = {
                msg: me.loadingText,
                msgCls: me.loadingCls,
                useMsg: me.loadingUseMsg,
                // The store gets bound in initComponent, so while
                // rendering let's push on the store
                store: me.getMaskStore()
            };

        me.callParent(arguments);

        if (mask) {
            // either a config object 
            if (Ext.isObject(mask)) {
                cfg = Ext.apply(cfg, mask);
            }
            // Attach the LoadMask to a *Component* so that it can be sensitive to resizing during long loads.
            // If this DataView is floating, then mask this DataView.
            // Otherwise, mask its owning Container (or this, if there *is* no owning Container).
            // LoadMask captures the element upon render.
            me.loadMask = new Ext.LoadMask(me, cfg);
            me.loadMask.on({
                scope: me,
                beforeshow: me.onMaskBeforeShow,
                hide: me.onMaskHide
            });
        }
    },
    
    finishRender: function(){
        var me = this;
        me.callParent(arguments);
        // Kick off the refresh before layouts are resumed after the render 
        // completes, but after afterrender is fired on the view
        if (!me.up('[collapsed],[hidden]')) {
            me.doFirstRefresh(me.store);
        }
    },

    onBoxReady: function() {
        var me = this;

        me.callParent(arguments);

        // If the refresh was not kicked off on render due to a collapsed or hidden ancestor,
        // kick it off as soon as we get layed out
        if (!me.firstRefreshDone) {
            me.doFirstRefresh(me.store);
        }
    },
    
    getMaskStore: function(){
        return this.store;    
    },
    
    onMaskBeforeShow: function(){
        var me = this,
            loadingHeight = me.loadingHeight;

        me.getSelectionModel().deselectAll();
        me.all.clear();
        if (loadingHeight && loadingHeight > me.getHeight()) {
            me.hasLoadingHeight = true;
            me.oldMinHeight = me.minHeight;
            me.minHeight = loadingHeight;
            me.updateLayout();
        }
    },

    onMaskHide: function(){
        var me = this;

        if (!me.destroying && me.hasLoadingHeight) {
            me.minHeight = me.oldMinHeight;
            me.updateLayout();
            delete me.hasLoadingHeight;
        }
    },

    beforeRender: function() {
        this.callParent(arguments);
        this.getSelectionModel().beforeViewRender(this);
    },

    afterRender: function() {
        this.callParent(arguments);

        // Init the SelectionModel after any on('render') listeners have been added.
        // Drag plugins create a DragDrop instance in a render listener, and that needs
        // to see an itemmousedown event first.
        this.getSelectionModel().bindComponent(this);
    },

    /**
     * Gets the selection model for this view.
     * @return {Ext.selection.Model} The selection model
     */
    getSelectionModel: function(){
        var me = this,
            mode = 'SINGLE';

        if (!me.selModel) {
            me.selModel = {};
        }

        if (me.simpleSelect) {
            mode = 'SIMPLE';
        } else if (me.multiSelect) {
            mode = 'MULTI';
        }

        Ext.applyIf(me.selModel, {
            allowDeselect: me.allowDeselect,
            mode: mode
        });

        if (!me.selModel.events) {
            me.selModel = new Ext.selection.DataViewModel(me.selModel);
        }

        if (!me.selModel.hasRelaySetup) {
            me.relayEvents(me.selModel, [
                'selectionchange', 'beforeselect', 'beforedeselect', 'select', 'deselect', 'focuschange'
            ]);
            me.selModel.hasRelaySetup = true;
        }

        // lock the selection model if user
        // has disabled selection
        if (me.disableSelection) {
            me.selModel.locked = true;
        }

        return me.selModel;
    },

    /**
     * Refreshes the view by reloading the data from the store and re-rendering the template.
     */
    refresh: function() {
        var me = this,
            targetEl,
            targetParent,
            oldDisplay,
            nextSibling,
            dom,
            records;

        if (!me.rendered || me.isDestroyed) {
            return;
        }

        if (!me.hasListeners.beforerefresh || me.fireEvent('beforerefresh', me) !== false) {
            targetEl = me.getTargetEl();
            records = me.store.getRange();
            dom = targetEl.dom;

            // Updating is much quicker if done when the targetEl is detached from the document, and not displayed.
            // But this resets the scroll position, so when preserving scroll position, this cannot be done.
            if (!me.preserveScrollOnRefresh) {
                targetParent = dom.parentNode;
                oldDisplay = dom.style.display;
                dom.style.display = 'none';
                nextSibling = dom.nextSibling;
                targetParent.removeChild(dom);
            }

            if (me.refreshCounter) {
                me.clearViewEl();
            } else {
                me.fixedNodes = targetEl.dom.childNodes.length;
                me.refreshCounter = 1;
            }

            // Always attempt to create the required markup after the fixedNodes.
            // Usually, for an empty record set, this would be blank, but when the Template
            // Creates markup outside of the record loop, this must still be honoured even if there are no
            // records.
            me.tpl.append(targetEl, me.collectData(records, 0));

            // The emptyText is now appended to the View's element
            // after any fixedNodes.
            if (records.length < 1) {
                if (!me.deferEmptyText || me.hasSkippedEmptyText) {
                    Ext.core.DomHelper.insertHtml('beforeEnd', targetEl.dom, me.emptyText);
                }
                me.all.clear();
            } else {
                me.all.fill(Ext.query(me.getItemSelector(), targetEl.dom));
                me.updateIndexes(0);
            }

            me.selModel.refresh();
            me.hasSkippedEmptyText = true;

            if (!me.preserveScrollOnRefresh) {
                targetParent.insertBefore(dom, nextSibling);
                dom.style.display = oldDisplay;
            }

            // Ensure layout system knows about new content size
            this.refreshSize();

            me.fireEvent('refresh', me);

            // Upon first refresh, fire the viewready event.
            // Reconfiguring the grid "renews" this event.
            if (!me.viewReady) {
                // Fire an event when deferred content becomes available.
                // This supports grid Panel's deferRowRender capability
                me.viewReady = true;
                me.fireEvent('viewready', me);
            }
        }
    },

    /**
     * @private
     * Called by the framework when the view is refreshed, or when rows are added or deleted.
     * 
     * These operations may cause the view's dimensions to change, and if the owning container
     * is shrinkwrapping this view, then the layout must be updated to accommodate these new dimensions.
     */
    refreshSize: function() {
        var sizeModel = this.getSizeModel();
        if (sizeModel.height.shrinkWrap || sizeModel.width.shrinkWrap) {
            this.updateLayout();
        }
    },

    clearViewEl: function(){
        // The purpose of this is to allow boilerplate HTML nodes to remain in place inside a View
        // while the transient, templated data can be discarded and recreated.
        // The first time through this code, we take a count of the number of existing child nodes.
        // Subsequent refreshes then do not clear the entire element, but remove all nodes
        // *after* the fixedNodes count.
        // In particular, this is used in infinite grid scrolling: A very tall "stretcher" element is
        // inserted into the View's element to create a scrollbar of the correct proportion.

        var me = this,
            el = me.getTargetEl();

        if (me.fixedNodes) {
            while (el.dom.childNodes[me.fixedNodes]) {
                el.dom.removeChild(el.dom.childNodes[me.fixedNodes]);
            }
        } else {
            el.update('');
        }
        me.refreshCounter++;
    },

    // Private template method to be overridden in subclasses.
    onViewScroll: Ext.emptyFn,

    /**
     * Saves the scrollState in a private variable. Must be used in conjunction with restoreScrollState.
     * @private
     */
    saveScrollState: function() {
        if (this.rendered) {
            var dom = this.el.dom,
                state = this.scrollState;

            state.left = dom.scrollLeft;
            state.top = dom.scrollTop;
        }
    },

    /**
     * Restores the scrollState.
     * Must be used in conjunction with saveScrollState
     * @private
     */
    restoreScrollState: function() {
        if (this.rendered) {
            var dom = this.el.dom, 
                state = this.scrollState;

            dom.scrollLeft = state.left;
            dom.scrollTop = state.top;
        }
    },

    /**
     * Function which can be overridden to provide custom formatting for each Record that is used by this
     * DataView's {@link #tpl template} to render each node.
     * @param {Object/Object[]} data The raw data object that was used to create the Record.
     * @param {Number} recordIndex the index number of the Record being prepared for rendering.
     * @param {Ext.data.Model} record The Record being prepared for rendering.
     * @return {Array/Object} The formatted data in a format expected by the internal {@link #tpl template}'s overwrite() method.
     * (either an array if your params are numeric (i.e. {0}) or an object (i.e. {foo: 'bar'}))
     */
    prepareData: function(data, index, record) {
        var associatedData, attr;
        if (record) {
            associatedData = record.getAssociatedData();
            for (attr in associatedData) {
                if (associatedData.hasOwnProperty(attr)) {
                    data[attr] = associatedData[attr];
                }
            }
        }
        return data;
    },

    /**
     * <p>Function which can be overridden which returns the data object passed to this
     * DataView's {@link #tpl template} to render the whole DataView.</p>
     * <p>This is usually an Array of data objects, each element of which is processed by an
     * {@link Ext.XTemplate XTemplate} which uses <tt>'&lt;tpl for="."&gt;'</tt> to iterate over its supplied
     * data object as an Array. However, <i>named</i> properties may be placed into the data object to
     * provide non-repeating data such as headings, totals etc.</p>
     * @param {Ext.data.Model[]} records An Array of {@link Ext.data.Model}s to be rendered into the DataView.
     * @param {Number} startIndex the index number of the Record being prepared for rendering.
     * @return {Object[]} An Array of data objects to be processed by a repeating XTemplate. May also
     * contain <i>named</i> properties.
     */
    collectData : function(records, startIndex){
        var data = [],
            i = 0,
            len = records.length,
            record;

        for (; i < len; i++) {
            record = records[i];
            data[i] = this.prepareData(record.data, startIndex + i, record);
        }
        return data;
    },

    // private
    bufferRender : function(records, index){
        var me = this,
            div = me.renderBuffer || (me.renderBuffer = document.createElement('div'));

        me.tpl.overwrite(div, me.collectData(records, index));
        return Ext.query(me.getItemSelector(), div);
    },

    // private
    onUpdate : function(ds, record){
        var me = this,
            index,
            node;

        if (me.viewReady) {
            index = me.store.indexOf(record);
            if (index > -1) {
                node = me.bufferRender([record], index)[0];
                // ensure the node actually exists in the DOM
                if (me.getNode(record)) {
                    me.all.replaceElement(index, node, true);
                    me.updateIndexes(index, index);
                    // Maintain selection after update
                    // TODO: Move to approriate event handler.
                    me.selModel.refresh();
                    if (me.hasListeners.itemupdate) {
                        me.fireEvent('itemupdate', record, index, node);
                    }
                    return node;
                }
            }
        }

    },

    // private
    onAdd : function(ds, records, index) {
        var me = this,
            nodes;

        if (me.rendered) {
            // If we are adding into an empty view, we must refresh in order that the *full tpl* is applied
            // which might create boilerplate content *around* the record nodes.
            if (me.all.getCount() === 0) {
                me.refresh();
                return;
            }

            nodes = me.bufferRender(records, index);
            me.doAdd(nodes, records, index);

            me.selModel.refresh();
            me.updateIndexes(index);

            // Ensure layout system knows about new content size
            me.refreshSize();

            if (me.hasListeners.itemadd) {
                me.fireEvent('itemadd', records, index, nodes);
            }
        }

    },

    doAdd: function(nodes, records, index) {
        var all = this.all,
            count = all.getCount();

        if (count === 0) {
            this.clearViewEl();
            this.getTargetEl().appendChild(nodes);
        } else if (index < count) {
            if (index === 0) {
                all.item(index).insertSibling(nodes, 'before', true);
            } else {
                all.item(index - 1).insertSibling(nodes, 'after', true);
            }
        } else {
            all.last().insertSibling(nodes, 'after', true);
        }

        Ext.Array.insert(all.elements, index, nodes);
    },

    // private
    onRemove : function(ds, record, index) {
        var me = this;

        if (me.all.getCount()) {
            if (me.store.getCount() === 0) {
                // Refresh so emptyText can be applied if necessary
                me.refresh();
            } else {
                // Just remove the element which corresponds to the removed record
                // The tpl's full HTML will still be in place.
                me.doRemove(record, index);
                if (me.selModel.refreshOnRemove) {
                    me.selModel.refresh();
                }
                me.updateIndexes(index);
            }

            // Ensure layout system knows about new content height
            this.refreshSize();

            if (me.hasListeners.itemremove) {
                me.fireEvent('itemremove', record, index);
            }
        }
    },

    doRemove: function(record, index) {
        this.all.removeElement(index, true);
    },

    /**
     * Refreshes an individual node's data from the store.
     * @param {Number} index The item's data index in the store
     */
    refreshNode : function(index){
        this.onUpdate(this.store, this.store.getAt(index));
    },

    // private
    updateIndexes : function(startIndex, endIndex) {
        var ns = this.all.elements,
            records = this.store.getRange(),
            i;

        startIndex = startIndex || 0;
        endIndex = endIndex || ((endIndex === 0) ? 0 : (ns.length - 1));
        for (i = startIndex; i <= endIndex; i++) {
            ns[i].viewIndex = i;
            ns[i].viewRecordId = records[i].internalId;
            if (!ns[i].boundView) {
                ns[i].boundView = this.id;
            }
        }
    },

    /**
     * Returns the store associated with this DataView.
     * @return {Ext.data.Store} The store
     */
    getStore : function() {
        return this.store;
    },

    /**
     * Changes the data store bound to this view and refreshes it.
     * @param {Ext.data.Store} store The store to bind to this view
     */
    bindStore : function(store, initial) {
        var me = this;
        me.mixins.bindable.bindStore.apply(me, arguments);

        // Bind the store to our selection model unless it's the initial bind.
        // Initial bind takes place afterRender
        if (!initial) {
            me.getSelectionModel().bindStore(me.store);
        }

        // If we have already achieved our first layout, refresh immediately.
        // If we have bound to the Store before the first layout, then onBoxReady will
        // call doFirstRefresh
        if (me.componentLayoutCounter) {
            me.doFirstRefresh(store);
        }
    },

    /**
     * @private
     * Perform the first refresh of the View from a newly bound store.
     * 
     * This is called when this View has been sized for the first time.
     */
    doFirstRefresh: function(store) {
        var me = this;

        // Flag to prevent a second "first" refresh from onBoxReady
        me.firstRefreshDone = true;

        // 4.1.0: If we have a store, and the Store is *NOT* already loading (a refresh is on the way), then
        // on first layout, refresh regardless of record count.
        // Template may contain boilerplate HTML outside of record iteration loop.
        // Also, emptyText is appended by the refresh method.
        // We call refresh on a defer if this is the initial call, and we are configured to defer the initial refresh.
        if (store && !store.loading) {
            if (me.deferInitialRefresh) {
                me.applyFirstRefresh();
            } else {
                me.refresh();
            }
        }
    },
    
    applyFirstRefresh: function(){
        var me = this;
        if (me.isDestroyed) {
            return;
        }
        
        // In the case of an animated collapse/expand, the layout will
        // be marked as though it's complete, yet the element itself may
        // still be animating, which means we could trigger a layout while
        // everything is not in the correct place. As such, wait until the
        // animation has finished before kicking off the refresh. The problem
        // occurs because both the refresh and the animation are running on
        // a timer which makes it impossible to control the order of when
        // the refresh is fired.
        if (me.up('[isCollapsingOrExpanding]')) {
            Ext.Function.defer(me.applyFirstRefresh, 100, me);
        } else {
            Ext.Function.defer(function () {
                if (!me.isDestroyed) {
                    me.refresh();
                }
            }, 1);
        }
    },

    onUnbindStore: function(store) {
        this.setMaskBind(null);
    },

    onBindStore: function(store) {
        this.setMaskBind(store);
    },

    setMaskBind: function(store) {
        var mask = this.loadMask;
        if (mask && mask.bindStore) {
            mask.bindStore(store);
        }
    },

    getStoreListeners: function() {
        var me = this;
        return {
            refresh: me.onDataRefresh,
            add: me.onAdd,
            remove: me.onRemove,
            update: me.onUpdate,
            clear: me.refresh
        };
    },

    /**
     * @private
     * Calls this.refresh if this.blockRefresh is not true
     */
    onDataRefresh: function() {
        var me = this,
            // If we have an ancestor in a non-boxready state (collapsed or in-transition, or hidden), and we are still waiting
            // for the first refresh, then block the refresh because that first visible, expanded layout will trigger the refresh
            blockedByAncestor = !me.firstRefreshDone && (!me.rendered || me.up('[collapsed],[isCollapsingOrExpanding],[hidden]'));

        // If are blocking *an initial refresh* because of an ancestor in a non-boxready state,
        // then cancel any defer on the initial refresh that is going to happen on boxReady - that will be a data-driven refresh, NOT
        // a render-time, delayable refresh. This is particularly important if the boxready occurs because of the "preflight" layout
        // of an animated expand. If refresh is delayed it occur during the expand animation and cause errors.
        if (blockedByAncestor) {
            me.deferInitialRefresh = false;
        } else if (me.blockRefresh !== true) {
            me.firstRefreshDone = true;
            me.refresh.apply(me, arguments);
        }

    },

    /**
     * Returns the template node the passed child belongs to, or null if it doesn't belong to one.
     * @param {HTMLElement} node
     * @return {HTMLElement} The template node
     */
    findItemByChild: function(node){
        return Ext.fly(node).findParent(this.getItemSelector(), this.getTargetEl());
    },

    /**
     * Returns the template node by the Ext.EventObject or null if it is not found.
     * @param {Ext.EventObject} e
     */
    findTargetByEvent: function(e) {
        return e.getTarget(this.getItemSelector(), this.getTargetEl());
    },


    /**
     * Gets the currently selected nodes.
     * @return {HTMLElement[]} An array of HTMLElements
     */
    getSelectedNodes: function(){
        var nodes   = [],
            records = this.selModel.getSelection(),
            ln = records.length,
            i  = 0;

        for (; i < ln; i++) {
            nodes.push(this.getNode(records[i]));
        }

        return nodes;
    },

    /**
     * Gets an array of the records from an array of nodes
     * @param {HTMLElement[]} nodes The nodes to evaluate
     * @return {Ext.data.Model[]} records The {@link Ext.data.Model} objects
     */
    getRecords: function(nodes) {
        var records = [],
            i = 0,
            len = nodes.length,
            data = this.store.data;

        for (; i < len; i++) {
            records[records.length] = data.getByKey(nodes[i].viewRecordId);
        }

        return records;
    },

    /**
     * Gets a record from a node
     * @param {Ext.Element/HTMLElement} node The node to evaluate
     *
     * @return {Ext.data.Model} record The {@link Ext.data.Model} object
     */
    getRecord: function(node){
        return this.store.data.getByKey(Ext.getDom(node).viewRecordId);
    },


    /**
     * Returns true if the passed node is selected, else false.
     * @param {HTMLElement/Number/Ext.data.Model} node The node, node index or record to check
     * @return {Boolean} True if selected, else false
     */
    isSelected : function(node) {
        // TODO: El/Idx/Record
        var r = this.getRecord(node);
        return this.selModel.isSelected(r);
    },

    /**
     * Selects a record instance by record instance or index.
     * @param {Ext.data.Model[]/Number} records An array of records or an index
     * @param {Boolean} keepExisting
     * @param {Boolean} suppressEvent Set to false to not fire a select event
     * @deprecated 4.0 Use {@link Ext.selection.Model#select} instead.
     */
    select: function(records, keepExisting, suppressEvent) {
        this.selModel.select(records, keepExisting, suppressEvent);
    },

    /**
     * Deselects a record instance by record instance or index.
     * @param {Ext.data.Model[]/Number} records An array of records or an index
     * @param {Boolean} suppressEvent Set to false to not fire a deselect event
     */
    deselect: function(records, suppressEvent) {
        this.selModel.deselect(records, suppressEvent);
    },

    /**
     * Gets a template node.
     * @param {HTMLElement/String/Number/Ext.data.Model} nodeInfo An HTMLElement template node, index of a template node,
     * the id of a template node or the record associated with the node.
     * @return {HTMLElement} The node or null if it wasn't found
     */
    getNode : function(nodeInfo) {
        if ((!nodeInfo && nodeInfo !== 0) || !this.rendered) {
            return null;
        }

        if (Ext.isString(nodeInfo)) {
            return document.getElementById(nodeInfo);
        }
        if (Ext.isNumber(nodeInfo)) {
            return this.all.elements[nodeInfo];
        }
        if (nodeInfo.isModel) {
            return this.getNodeByRecord(nodeInfo);
        }
        return nodeInfo; // already an HTMLElement
    },

    /**
     * @private
     */
    getNodeByRecord: function(record) {
        var ns = this.all.elements,
            ln = ns.length,
            i = 0;

        for (; i < ln; i++) {
            if (ns[i].viewRecordId === record.internalId) {
                return ns[i];
            }
        }

        return null;
    },

    /**
     * Gets a range nodes.
     * @param {Number} start (optional) The index of the first node in the range
     * @param {Number} end (optional) The index of the last node in the range
     * @return {HTMLElement[]} An array of nodes
     */
    getNodes: function(start, end) {
        var ns = this.all.elements;

        if (end === undefined) {
            end = ns.length;
        } else {
            end++;
        }
        return this.all.elements.slice(start||0, end);
    },

    /**
     * Finds the index of the passed node.
     * @param {HTMLElement/String/Number/Ext.data.Model} nodeInfo An HTMLElement template node, index of a template node, the id of a template node
     * or a record associated with a node.
     * @return {Number} The index of the node or -1
     */
    indexOf: function(node) {
        node = this.getNode(node);
        if (!node && node !== 0) {
            return -1;
        }
        if (Ext.isNumber(node.viewIndex)) {
            return node.viewIndex;
        }
        return this.all.indexOf(node);
    },

    onDestroy : function() {
        var me = this;

        me.all.clear();
        me.callParent();
        me.bindStore(null);
        me.selModel.destroy();
    },

    // invoked by the selection model to maintain visual UI cues
    onItemSelect: function(record) {
        var node = this.getNode(record);

        if (node) {
            Ext.fly(node).addCls(this.selectedItemCls);
        }
    },

    // invoked by the selection model to maintain visual UI cues
    onItemDeselect: function(record) {
        var node = this.getNode(record);

        if (node) {
            Ext.fly(node).removeCls(this.selectedItemCls);
        }
    },

    getItemSelector: function() {
        return this.itemSelector;
    }
}, function() {
    // all of this information is available directly
    // from the SelectionModel itself, the only added methods
    // to DataView regarding selection will perform some transformation/lookup
    // between HTMLElement/Nodes to records and vice versa.
    Ext.deprecate('extjs', '4.0', function() {
        Ext.view.AbstractView.override({
            /**
             * @cfg {Boolean} [multiSelect=false]
             * True to allow selection of more than one item at a time, false to allow selection of only a single item
             * at a time or no selection at all, depending on the value of {@link #singleSelect}.
             * @deprecated 4.1.1 Use {@link Ext.selection.Model#mode} 'MULTI' instead.
             */
            /**
             * @cfg {Boolean} [singleSelect]
             * Allows selection of exactly one item at a time. As this is the default selection mode anyway, this config
             * is completely ignored.
             * @removed 4.1.1 Use {@link Ext.selection.Model#mode} 'SINGLE' instead.
             */
            /**
             * @cfg {Boolean} [simpleSelect=false]
             * True to enable multiselection by clicking on multiple items without requiring the user to hold Shift or Ctrl,
             * false to force the user to hold Ctrl or Shift to select more than on item.
             * @deprecated 4.1.1 Use {@link Ext.selection.Model#mode} 'SIMPLE' instead.
             */

            /**
             * Gets the number of selected nodes.
             * @return {Number} The node count
             * @deprecated 4.0 Use {@link Ext.selection.Model#getCount} instead.
             */
            getSelectionCount : function(){
                if (Ext.global.console) {
                    Ext.global.console.warn("DataView: getSelectionCount will be removed, please interact with the Ext.selection.DataViewModel");
                }
                return this.selModel.getSelection().length;
            },

            /**
             * Gets an array of the selected records
             * @return {Ext.data.Model[]} An array of {@link Ext.data.Model} objects
             * @deprecated 4.0 Use {@link Ext.selection.Model#getSelection} instead.
             */
            getSelectedRecords : function(){
                if (Ext.global.console) {
                    Ext.global.console.warn("DataView: getSelectedRecords will be removed, please interact with the Ext.selection.DataViewModel");
                }
                return this.selModel.getSelection();
            },

            select: function(records, keepExisting, supressEvents) {
                if (Ext.global.console) {
                    Ext.global.console.warn("DataView: select will be removed, please access select through a DataView's SelectionModel, ie: view.getSelectionModel().select()");
                }
                var sm = this.getSelectionModel();
                return sm.select.apply(sm, arguments);
            },

            /**
             * Deselects all selected records.
             * @deprecated 4.0 Use {@link Ext.selection.Model#deselectAll} instead.
             */
            clearSelections: function() {
                if (Ext.global.console) {
                    Ext.global.console.warn("DataView: clearSelections will be removed, please access deselectAll through DataView's SelectionModel, ie: view.getSelectionModel().deselectAll()");
                }
                var sm = this.getSelectionModel();
                return sm.deselectAll();
            }
        });
    });
});



/**
 * @private
 */
Ext.define('Ext.view.DragZone', {
    extend: 'Ext.dd.DragZone',
    containerScroll: false,

    constructor: function(config) {
        var me = this,
            view,
            ownerCt,
            el;

        Ext.apply(me, config);

        // Create a ddGroup unless one has been configured.
        // User configuration of ddGroups allows users to specify which
        // DD instances can interact with each other. Using one
        // based on the id of the View would isolate it and mean it can only
        // interact with a DropZone on the same View also using a generated ID.
        if (!me.ddGroup) {
            me.ddGroup = 'view-dd-zone-' + me.view.id;
        }

        // Ext.dd.DragDrop instances are keyed by the ID of their encapsulating element.
        // So a View's DragZone cannot use the View's main element because the DropZone must use that
        // because the DropZone may need to scroll on hover at a scrolling boundary, and it is the View's
        // main element which handles scrolling.
        // We use the View's parent element to drag from. Ideally, we would use the internal structure, but that
        // is transient; DataView's recreate the internal structure dynamically as data changes.
        // TODO: Ext 5.0 DragDrop must allow multiple DD objects to share the same element.
        view = me.view;
        ownerCt = view.ownerCt;
        // We don't just grab the parent el, since the parent el may be
        // some el injected by the layout
        if (ownerCt) {
            el = ownerCt.getTargetEl().dom;
        } else {
            el = view.el.dom.parentNode;
        }
        me.callParent([el]);

        me.ddel = Ext.get(document.createElement('div'));
        me.ddel.addCls(Ext.baseCSSPrefix + 'grid-dd-wrap');
    },

    init: function(id, sGroup, config) {
        this.initTarget(id, sGroup, config);
        this.view.mon(this.view, {
            itemmousedown: this.onItemMouseDown,
            scope: this
        });
    },

    onValidDrop: function(target, e, id) {
        this.callParent();
        // focus the view that the node was dropped onto so that keynav will be enabled.
        target.el.focus();
    },
    
    onItemMouseDown: function(view, record, item, index, e) {
        if (!this.isPreventDrag(e, record, item, index)) {
            // Since handleMouseDown prevents the default behavior of the event, which
            // is to focus the view, we focus the view now.  This ensures that the view
            // remains focused if the drag is cancelled, or if no drag occurs.
            this.view.focus();
            this.handleMouseDown(e);

            // If we want to allow dragging of multi-selections, then veto the following handlers (which, in the absence of ctrlKey, would deselect)
            // if the mousedowned record is selected
            if (view.getSelectionModel().selectionMode == 'MULTI' && !e.ctrlKey && view.getSelectionModel().isSelected(record)) {
                return false;
            }
        }
    },

    // private template method
    isPreventDrag: function(e) {
        return false;
    },

    getDragData: function(e) {
        var view = this.view,
            item = e.getTarget(view.getItemSelector());

        if (item) {
            return {
                copy: view.copy || (view.allowCopy && e.ctrlKey),
                event: new Ext.EventObjectImpl(e),
                view: view,
                ddel: this.ddel,
                item: item,
                records: view.getSelectionModel().getSelection(),
                fromPosition: Ext.fly(item).getXY()
            };
        }
    },

    onInitDrag: function(x, y) {
        var me = this,
            data = me.dragData,
            view = data.view,
            selectionModel = view.getSelectionModel(),
            record = view.getRecord(data.item),
            e = data.event;

        // Update the selection to match what would have been selected if the user had
        // done a full click on the target node rather than starting a drag from it
        if (!selectionModel.isSelected(record)) {
            selectionModel.select(record, true);
        }
        data.records = selectionModel.getSelection();

        me.ddel.update(me.getDragText());
        me.proxy.update(me.ddel.dom);
        me.onStartDrag(x, y);
        return true;
    },

    getDragText: function() {
        var count = this.dragData.records.length;
        return Ext.String.format(this.dragText, count, count == 1 ? '' : 's');
    },

    getRepairXY : function(e, data){
        return data ? data.fromPosition : false;
    }
});
/**
 * @private
 */
Ext.define('Ext.view.DropZone', {
    extend: 'Ext.dd.DropZone',

    indicatorHtml: '<div class="' + Ext.baseCSSPrefix + 'grid-drop-indicator-left"></div><div class="' + Ext.baseCSSPrefix + 'grid-drop-indicator-right"></div>',
    indicatorCls: Ext.baseCSSPrefix + 'grid-drop-indicator',

    constructor: function(config) {
        var me = this;
        Ext.apply(me, config);

        // Create a ddGroup unless one has been configured.
        // User configuration of ddGroups allows users to specify which
        // DD instances can interact with each other. Using one
        // based on the id of the View would isolate it and mean it can only
        // interact with a DragZone on the same View also using a generated ID.
        if (!me.ddGroup) {
            me.ddGroup = 'view-dd-zone-' + me.view.id;
        }

        // The DropZone's encapsulating element is the View's main element. It must be this because drop gestures
        // may require scrolling on hover near a scrolling boundary. In Ext 4.x two DD instances may not use the
        // same element, so a DragZone on this same View must use the View's parent element as its element.
        me.callParent([me.view.el]);
    },

//  Fire an event through the client DataView. Lock this DropZone during the event processing so that
//  its data does not become corrupted by processing mouse events.
    fireViewEvent: function() {
        var me = this,
            result;

        me.lock();
        result = me.view.fireEvent.apply(me.view, arguments);
        me.unlock();
        return result;
    },

    getTargetFromEvent : function(e) {
        var node = e.getTarget(this.view.getItemSelector()),
            mouseY, nodeList, testNode, i, len, box;

//      Not over a row node: The content may be narrower than the View's encapsulating element, so return the closest.
//      If we fall through because the mouse is below the nodes (or there are no nodes), we'll get an onContainerOver call.
        if (!node) {
            mouseY = e.getPageY();
            for (i = 0, nodeList = this.view.getNodes(), len = nodeList.length; i < len; i++) {
                testNode = nodeList[i];
                box = Ext.fly(testNode).getBox();
                if (mouseY <= box.bottom) {
                    return testNode;
                }
            }
        }
        return node;
    },

    getIndicator: function() {
        var me = this;

        if (!me.indicator) {
            me.indicator = new Ext.Component({
                html: me.indicatorHtml,
                cls: me.indicatorCls,
                ownerCt: me.view,
                floating: true,
                shadow: false
            });
        }
        return me.indicator;
    },

    getPosition: function(e, node) {
        var y      = e.getXY()[1],
            region = Ext.fly(node).getRegion(),
            pos;

        if ((region.bottom - y) >= (region.bottom - region.top) / 2) {
            pos = "before";
        } else {
            pos = "after";
        }
        return pos;
    },

    /**
     * @private Determines whether the record at the specified offset from the passed record
     * is in the drag payload.
     * @param records
     * @param record
     * @param offset
     * @returns {Boolean} True if the targeted record is in the drag payload
     */
    containsRecordAtOffset: function(records, record, offset) {
        if (!record) {
            return false;
        }
        var view = this.view,
            recordIndex = view.indexOf(record),
            nodeBefore = view.getNode(recordIndex + offset),
            recordBefore = nodeBefore ? view.getRecord(nodeBefore) : null;

        return recordBefore && Ext.Array.contains(records, recordBefore);
    },

    positionIndicator: function(node, data, e) {
        var me = this,
            view = me.view,
            pos = me.getPosition(e, node),
            overRecord = view.getRecord(node),
            draggingRecords = data.records,
            indicatorY;

        if (!Ext.Array.contains(draggingRecords, overRecord) && (
            pos == 'before' && !me.containsRecordAtOffset(draggingRecords, overRecord, -1) ||
            pos == 'after' && !me.containsRecordAtOffset(draggingRecords, overRecord, 1)
        )) {
            me.valid = true;

            if (me.overRecord != overRecord || me.currentPosition != pos) {

                indicatorY = Ext.fly(node).getY() - view.el.getY() - 1;
                if (pos == 'after') {
                    indicatorY += Ext.fly(node).getHeight();
                }
                me.getIndicator().setWidth(Ext.fly(view.el).getWidth()).showAt(0, indicatorY);

                // Cache the overRecord and the 'before' or 'after' indicator.
                me.overRecord = overRecord;
                me.currentPosition = pos;
            }
        } else {
            me.invalidateDrop();
        }
    },

    invalidateDrop: function() {
        if (this.valid) {
            this.valid = false;
            this.getIndicator().hide();
        }
    },

    // The mouse is over a View node
    onNodeOver: function(node, dragZone, e, data) {
        var me = this;

        if (!Ext.Array.contains(data.records, me.view.getRecord(node))) {
            me.positionIndicator(node, data, e);
        }
        return me.valid ? me.dropAllowed : me.dropNotAllowed;
    },

    // Moved out of the DropZone without dropping.
    // Remove drop position indicator
    notifyOut: function(node, dragZone, e, data) {
        var me = this;

        me.callParent(arguments);
        delete me.overRecord;
        delete me.currentPosition;
        if (me.indicator) {
            me.indicator.hide();
        }
    },

    // The mouse is past the end of all nodes (or there are no nodes)
    onContainerOver : function(dd, e, data) {
        var me = this,
            view = me.view,
            count = view.store.getCount();

        // There are records, so position after the last one
        if (count) {
            me.positionIndicator(view.getNode(count - 1), data, e);
        }

        // No records, position the indicator at the top
        else {
            delete me.overRecord;
            delete me.currentPosition;
            me.getIndicator().setWidth(Ext.fly(view.el).getWidth()).showAt(0, 0);
            me.valid = true;
        }
        return me.dropAllowed;
    },

    onContainerDrop : function(dd, e, data) {
        return this.onNodeDrop(dd, null, e, data);
    },

    onNodeDrop: function(node, dragZone, e, data) {
        var me = this,
            dropHandled = false,
 
            // Create a closure to perform the operation which the event handler may use.
            // Users may now set the wait parameter in the beforedrop handler, and perform any kind
            // of asynchronous processing such as an Ext.Msg.confirm, or an Ajax request,
            // and complete the drop gesture at some point in the future by calling either the
            // processDrop or cancelDrop methods.
            dropHandlers = {
                wait: false,
                processDrop: function () {
                    me.invalidateDrop();
                    me.handleNodeDrop(data, me.overRecord, me.currentPosition);
                    dropHandled = true;
                    me.fireViewEvent('drop', node, data, me.overRecord, me.currentPosition);
                },
 
                cancelDrop: function() {
                    me.invalidateDrop();
                    dropHandled = true;
                }
            },
            performOperation = false;
 
        if (me.valid) {
            performOperation = me.fireViewEvent('beforedrop', node, data, me.overRecord, me.currentPosition, dropHandlers);
            if (dropHandlers.wait) {
                return;
            }
 
            if (performOperation !== false) {
                // If either of the drop handlers were called in the event handler, do not do it again.
                if (!dropHandled) {
                    dropHandlers.processDrop();
                }
            }
        }
        return performOperation;
    },
    
    destroy: function(){
        Ext.destroy(this.indicator);
        delete this.indicator;
        this.callParent();
    }
});



/**
 * Represents an Ext JS 4 application, which is typically a single page app using a {@link Ext.container.Viewport Viewport}.
 * A typical Ext.app.Application might look like this:
 *
 *     Ext.application({
 *         name: 'MyApp',
 *         launch: function() {
 *             Ext.create('Ext.container.Viewport', {
 *                 items: {
 *                     html: 'My App'
 *                 }
 *             });
 *         }
 *     });
 *
 * This does several things. First it creates a global variable called 'MyApp' - all of your Application's classes (such
 * as its Models, Views and Controllers) will reside under this single namespace, which drastically lowers the chances
 * of colliding global variables.
 *
 * When the page is ready and all of your JavaScript has loaded, your Application's {@link #launch} function is called,
 * at which time you can run the code that starts your app. Usually this consists of creating a Viewport, as we do in
 * the example above.
 *
 * # Telling Application about the rest of the app
 *
 * Because an Ext.app.Application represents an entire app, we should tell it about the other parts of the app - namely
 * the Models, Views and Controllers that are bundled with the application. Let's say we have a blog management app; we
 * might have Models and Controllers for Posts and Comments, and Views for listing, adding and editing Posts and Comments.
 * Here's how we'd tell our Application about all these things:
 *
 *     Ext.application({
 *         name: 'Blog',
 *         models: ['Post', 'Comment'],
 *         controllers: ['Posts', 'Comments'],
 *
 *         launch: function() {
 *             ...
 *         }
 *     });
 *
 * Note that we didn't actually list the Views directly in the Application itself. This is because Views are managed by
 * Controllers, so it makes sense to keep those dependencies there. The Application will load each of the specified
 * Controllers using the pathing conventions laid out in the [application architecture guide][mvc] - in this case
 * expecting the controllers to reside in app/controller/Posts.js and app/controller/Comments.js. In turn, each
 * Controller simply needs to list the Views it uses and they will be automatically loaded. Here's how our Posts
 * controller like be defined:
 *
 *     Ext.define('MyApp.controller.Posts', {
 *         extend: 'Ext.app.Controller',
 *         views: ['posts.List', 'posts.Edit'],
 *
 *         //the rest of the Controller here
 *     });
 *
 * Because we told our Application about our Models and Controllers, and our Controllers about their Views, Ext JS will
 * automatically load all of our app files for us. This means we don't have to manually add script tags into our html
 * files whenever we add a new class, but more importantly it enables us to create a minimized build of our entire
 * application using the Ext JS 4 SDK Tools.
 *
 * For more information about writing Ext JS 4 applications, please see the [application architecture guide][mvc].
 *
 * [mvc]: #/guide/application_architecture
 *
 * @docauthor Ed Spencer
 */
Ext.define('Ext.app.Application', {
    extend: 'Ext.app.Controller',

    requires: [
        'Ext.ModelManager',
        'Ext.data.Model',
        'Ext.data.StoreManager',
        'Ext.tip.QuickTipManager',
        'Ext.ComponentManager',
        'Ext.app.EventBus'
    ],

    /**
     * @cfg {String} name
     * The name of your application. This will also be the namespace for your views, controllers
     * models and stores. Don't use spaces or special characters in the name.
     */

    /**
     * @cfg {String[]} controllers
     * Names of controllers that the app uses.
     */

    /**
     * @cfg {Object} scope
     * The scope to execute the {@link #launch} function in. Defaults to the Application instance.
     */
    scope: undefined,

    /**
     * @cfg {Boolean} enableQuickTips
     * True to automatically set up Ext.tip.QuickTip support.
     */
    enableQuickTips: true,

    /**
     * @cfg {String} appFolder
     * The path to the directory which contains all application's classes.
     * This path will be registered via {@link Ext.Loader#setPath} for the namespace specified
     * in the {@link #name name} config.
     */
    appFolder: 'app',

    /**
     * @cfg {Boolean} autoCreateViewport
     * True to automatically load and instantiate AppName.view.Viewport before firing the launch function.
     */
    autoCreateViewport: false,
    
    /**
     * @cfg {Object} paths
     * Additional load paths to add to Ext.Loader.
     * See {@link Ext.Loader#paths} config for more details.
     */
    
    /**
     * Creates new Application.
     * @param {Object} [config] Config object.
     */
    constructor: function(config) {
        config = config || {};
        Ext.apply(this, config);

        var me = this,
            requires = config.requires || [],
            controllers, ln, i, controller,
            paths, path, ns;

        Ext.Loader.setPath(me.name, me.appFolder);

        if (me.paths) {
            paths = me.paths;

            for (ns in paths) {
                if (paths.hasOwnProperty(ns)) {
                    path = paths[ns];

                    Ext.Loader.setPath(ns, path);
                }
            }
        }

        me.callParent(arguments);

        me.eventbus = new Ext.app.EventBus;

        controllers = Ext.Array.from(me.controllers);
        ln = controllers && controllers.length;

        me.controllers = new Ext.util.MixedCollection();

        if (me.autoCreateViewport) {
            requires.push(me.getModuleClassName('Viewport', 'view'));
        }

        for (i = 0; i < ln; i++) {
            requires.push(me.getModuleClassName(controllers[i], 'controller'));
        }

        Ext.require(requires);

        Ext.onReady(function() {
            me.init(me);
            for (i = 0; i < ln; i++) {
                controller = me.getController(controllers[i]);
                controller.init(me);
            }

            me.onBeforeLaunch.call(me);
        }, me);
    },

    control: function(selectors, listeners, controller) {
        this.eventbus.control(selectors, listeners, controller);
    },

    /**
     * @method
     * @template
     * Called automatically when the page has completely loaded. This is an empty function that should be
     * overridden by each application that needs to take action on page load.
     * @param {String} profile The detected application profile
     * @return {Boolean} By default, the Application will dispatch to the configured startup controller and
     * action immediately after running the launch function. Return false to prevent this behavior.
     */
    launch: Ext.emptyFn,

    /**
     * @private
     */
    onBeforeLaunch: function() {
        var me = this,
            controllers, c, cLen, controller;

        if (me.enableQuickTips) {
            Ext.tip.QuickTipManager.init();
        }

        if (me.autoCreateViewport) {
            me.getView('Viewport').create();
        }

        me.launch.call(this.scope || this);
        me.launched = true;
        me.fireEvent('launch', this);

        controllers = me.controllers.items;
        cLen        = controllers.length;

        for (c = 0; c < cLen; c++) {
            controller = controllers[c];
            controller.onLaunch(this);
        }
    },

    getModuleClassName: function(name, module) {
        // Deciding if a class name must be qualified:
        // 1 - if the name doesn't contains at least one dot, we must definitely qualify it
        // 2 - the name may be a qualified name of a known class, but:
        // 2.1 - in runtime, the loader may not know the class - specially in production - so we must check the class manager
        // 2.2 - in build time, the class manager may not know the class, but the loader does, so we check the second one
        //       (the loader check assures it's really a class, and not a namespace, so we can have 'Books.controller.Books',
        //       and request for a controller called Books will not be underqualified)
        if (name.indexOf('.') !== -1 && (Ext.ClassManager.isCreated(name) || Ext.Loader.isAClassNameWithAKnownPrefix(name))) {
            return name;
        } else {
            return this.name + '.' + module + '.' + name;
        }
    },

    getController: function(name) {
        var controller = this.controllers.get(name);

        if (!controller) {
            controller = Ext.create(this.getModuleClassName(name, 'controller'), {
                application: this,
                id: name
            });

            this.controllers.add(controller);
        }

        return controller;
    },

    getStore: function(name) {
        var store = Ext.StoreManager.get(name);

        if (!store) {
            store = Ext.create(this.getModuleClassName(name, 'store'), {
                storeId: name
            });
        }

        return store;
    },

    getModel: function(model) {
        model = this.getModuleClassName(model, 'model');

        return Ext.ModelManager.getModel(model);
    },

    getView: function(view) {
        view = this.getModuleClassName(view, 'view');

        return Ext.ClassManager.get(view);
    }
});

/**
 * Produces optimized XTemplates for chunks of tables to be
 * used in grids, trees and other table based widgets.
 */
Ext.define('Ext.view.TableChunker', {
    singleton: true,
    requires: ['Ext.XTemplate'],
    metaTableTpl: [
        '{%if (this.openTableWrap)out.push(this.openTableWrap())%}',
        '<table class="' + Ext.baseCSSPrefix + 'grid-table ' + Ext.baseCSSPrefix + 'grid-table-resizer" border="0" cellspacing="0" cellpadding="0" {[this.embedFullWidth(values)]}>',
            '<tbody>',
            '<tr class="' + Ext.baseCSSPrefix + 'grid-header-row">',
            '<tpl for="columns">',
                '<th class="' + Ext.baseCSSPrefix + 'grid-col-resizer-{id}" style="width: {width}px; height: 0px;"></th>',
            '</tpl>',
            '</tr>',
            '{[this.openRows()]}',
                '{row}',
                '<tpl for="features">',
                    '{[this.embedFeature(values, parent, xindex, xcount)]}',
                '</tpl>',
            '{[this.closeRows()]}',
            '</tbody>',
        '</table>',
        '{%if (this.closeTableWrap)out.push(this.closeTableWrap())%}'
    ],

    constructor: function() {
        Ext.XTemplate.prototype.recurse = function(values, reference) {
            return this.apply(reference ? values[reference] : values);
        };
    },

    embedFeature: function(values, parent, x, xcount) {
        var tpl = '';
        if (!values.disabled) {
            tpl = values.getFeatureTpl(values, parent, x, xcount);
        }
        return tpl;
    },

    embedFullWidth: function(values) {
        var result = 'style="width:{fullWidth}px;';

        // If there are no records, we need to give the table a height so that it
        // is displayed and causes q scrollbar if the width exceeds the View's width.
        if (!values.rowCount) {
            result += 'height:1px;';
        }
        return result + '"';
    },

    openRows: function() {
        return '<tpl for="rows">';
    },

    closeRows: function() {
        return '</tpl>';
    },

    metaRowTpl: [
        '<tr class="' + Ext.baseCSSPrefix + 'grid-row {[this.embedRowCls()]}" {[this.embedRowAttr()]}>',
            '<tpl for="columns">',
                '<td class="{cls} ' + Ext.baseCSSPrefix + 'grid-cell ' + Ext.baseCSSPrefix + 'grid-cell-{columnId} {{id}-modified} {{id}-tdCls} {[this.firstOrLastCls(xindex, xcount)]}" {{id}-tdAttr}>',
                    '<div {unselectableAttr} class="' + Ext.baseCSSPrefix + 'grid-cell-inner {unselectableCls}" style="text-align: {align}; {{id}-style};">{{id}}</div>',
                '</td>',
            '</tpl>',
        '</tr>'
    ],

    firstOrLastCls: function(xindex, xcount) {
        if (xindex === 1) {
            return Ext.view.Table.prototype.firstCls;
        } else if (xindex === xcount) {
            return Ext.view.Table.prototype.lastCls;
        }
    },
    
    embedRowCls: function() {
        return '{rowCls}';
    },
    
    embedRowAttr: function() {
        return '{rowAttr}';
    },
    
    openTableWrap: undefined,
    
    closeTableWrap: undefined,

    getTableTpl: function(cfg, textOnly) {
        var tpl,
            tableTplMemberFns = {
                openRows: this.openRows,
                closeRows: this.closeRows,
                embedFeature: this.embedFeature,
                embedFullWidth: this.embedFullWidth,
                openTableWrap: this.openTableWrap,
                closeTableWrap: this.closeTableWrap
            },
            tplMemberFns = {},
            features = cfg.features || [],
            ln = features.length,
            i  = 0,
            memberFns = {
                embedRowCls: this.embedRowCls,
                embedRowAttr: this.embedRowAttr,
                firstOrLastCls: this.firstOrLastCls,
                unselectableAttr: cfg.enableTextSelection ? '' : 'unselectable="on"',
                unselectableCls: cfg.enableTextSelection ? '' : Ext.baseCSSPrefix + 'unselectable'
            },
            // copy the default
            metaRowTpl = Array.prototype.slice.call(this.metaRowTpl, 0),
            metaTableTpl;
            
        for (; i < ln; i++) {
            if (!features[i].disabled) {
                features[i].mutateMetaRowTpl(metaRowTpl);
                Ext.apply(memberFns, features[i].getMetaRowTplFragments());
                Ext.apply(tplMemberFns, features[i].getFragmentTpl());
                Ext.apply(tableTplMemberFns, features[i].getTableFragments());
            }
        }
        
        metaRowTpl = new Ext.XTemplate(metaRowTpl.join(''), memberFns);
        cfg.row = metaRowTpl.applyTemplate(cfg);
        
        metaTableTpl = new Ext.XTemplate(this.metaTableTpl.join(''), tableTplMemberFns);
        
        tpl = metaTableTpl.applyTemplate(cfg);
        
        // TODO: Investigate eliminating.
        if (!textOnly) {
            tpl = new Ext.XTemplate(tpl, tplMemberFns);
        }
        return tpl;
        
    }
});

/**
 * A mechanism for displaying data using custom layout templates and formatting.
 *
 * The View uses an {@link Ext.XTemplate} as its internal templating mechanism, and is bound to an
 * {@link Ext.data.Store} so that as the data in the store changes the view is automatically updated
 * to reflect the changes. The view also provides built-in behavior for many common events that can
 * occur for its contained items including click, doubleclick, mouseover, mouseout, etc. as well as a
 * built-in selection model. **In order to use these features, an {@link #itemSelector} config must
 * be provided for the View to determine what nodes it will be working with.**
 *
 * The example below binds a View to a {@link Ext.data.Store} and renders it into an {@link Ext.panel.Panel}.
 *
 *     @example
 *     Ext.define('Image', {
 *         extend: 'Ext.data.Model',
 *         fields: [
 *             { name:'src', type:'string' },
 *             { name:'caption', type:'string' }
 *         ]
 *     });
 *
 *     Ext.create('Ext.data.Store', {
 *         id:'imagesStore',
 *         model: 'Image',
 *         data: [
 *             { src:'http://www.sencha.com/img/20110215-feat-drawing.png', caption:'Drawing & Charts' },
 *             { src:'http://www.sencha.com/img/20110215-feat-data.png', caption:'Advanced Data' },
 *             { src:'http://www.sencha.com/img/20110215-feat-html5.png', caption:'Overhauled Theme' },
 *             { src:'http://www.sencha.com/img/20110215-feat-perf.png', caption:'Performance Tuned' }
 *         ]
 *     });
 *
 *     var imageTpl = new Ext.XTemplate(
 *         '<tpl for=".">',
 *             '<div style="margin-bottom: 10px;" class="thumb-wrap">',
 *               '<img src="{src}" />',
 *               '<br/><span>{caption}</span>',
 *             '</div>',
 *         '</tpl>'
 *     );
 *
 *     Ext.create('Ext.view.View', {
 *         store: Ext.data.StoreManager.lookup('imagesStore'),
 *         tpl: imageTpl,
 *         itemSelector: 'div.thumb-wrap',
 *         emptyText: 'No images available',
 *         renderTo: Ext.getBody()
 *     });
 */
Ext.define('Ext.view.View', {
    extend: 'Ext.view.AbstractView',
    alternateClassName: 'Ext.DataView',
    alias: 'widget.dataview',

    deferHighlight: (Ext.isIE6 || Ext.isIE7) ? 100 : 0,

    inputTagRe: /^textarea$|^input$/i,

    inheritableStatics: {
        EventMap: {
            mousedown: 'MouseDown',
            mouseup: 'MouseUp',
            click: 'Click',
            dblclick: 'DblClick',
            contextmenu: 'ContextMenu',
            mouseover: 'MouseOver',
            mouseout: 'MouseOut',
            mouseenter: 'MouseEnter',
            mouseleave: 'MouseLeave',
            keydown: 'KeyDown',
            focus: 'Focus'
        }
    },

    initComponent: function() {
        var me = this;
        me.callParent();
        if (me.deferHighlight){
            me.setHighlightedItem =
                Ext.Function.createBuffered(me.setHighlightedItem, me.deferHighlight, me);
        }
    },

    addCmpEvents: function() {
        this.addEvents(
            /**
             * @event beforeitemmousedown
             * Fires before the mousedown event on an item is processed. Returns false to cancel the default action.
             * @param {Ext.view.View} this
             * @param {Ext.data.Model} record The record that belongs to the item
             * @param {HTMLElement} item The item's element
             * @param {Number} index The item's index
             * @param {Ext.EventObject} e The raw event object
             */
            'beforeitemmousedown',
            /**
             * @event beforeitemmouseup
             * Fires before the mouseup event on an item is processed. Returns false to cancel the default action.
             * @param {Ext.view.View} this
             * @param {Ext.data.Model} record The record that belongs to the item
             * @param {HTMLElement} item The item's element
             * @param {Number} index The item's index
             * @param {Ext.EventObject} e The raw event object
             */
            'beforeitemmouseup',
            /**
             * @event beforeitemmouseenter
             * Fires before the mouseenter event on an item is processed. Returns false to cancel the default action.
             * @param {Ext.view.View} this
             * @param {Ext.data.Model} record The record that belongs to the item
             * @param {HTMLElement} item The item's element
             * @param {Number} index The item's index
             * @param {Ext.EventObject} e The raw event object
             */
            'beforeitemmouseenter',
            /**
             * @event beforeitemmouseleave
             * Fires before the mouseleave event on an item is processed. Returns false to cancel the default action.
             * @param {Ext.view.View} this
             * @param {Ext.data.Model} record The record that belongs to the item
             * @param {HTMLElement} item The item's element
             * @param {Number} index The item's index
             * @param {Ext.EventObject} e The raw event object
             */
            'beforeitemmouseleave',
            /**
             * @event beforeitemclick
             * Fires before the click event on an item is processed. Returns false to cancel the default action.
             * @param {Ext.view.View} this
             * @param {Ext.data.Model} record The record that belongs to the item
             * @param {HTMLElement} item The item's element
             * @param {Number} index The item's index
             * @param {Ext.EventObject} e The raw event object
             */
            'beforeitemclick',
            /**
             * @event beforeitemdblclick
             * Fires before the dblclick event on an item is processed. Returns false to cancel the default action.
             * @param {Ext.view.View} this
             * @param {Ext.data.Model} record The record that belongs to the item
             * @param {HTMLElement} item The item's element
             * @param {Number} index The item's index
             * @param {Ext.EventObject} e The raw event object
             */
            'beforeitemdblclick',
            /**
             * @event beforeitemcontextmenu
             * Fires before the contextmenu event on an item is processed. Returns false to cancel the default action.
             * @param {Ext.view.View} this
             * @param {Ext.data.Model} record The record that belongs to the item
             * @param {HTMLElement} item The item's element
             * @param {Number} index The item's index
             * @param {Ext.EventObject} e The raw event object
             */
            'beforeitemcontextmenu',
            /**
             * @event beforeitemkeydown
             * Fires before the keydown event on an item is processed. Returns false to cancel the default action.
             * @param {Ext.view.View} this
             * @param {Ext.data.Model} record The record that belongs to the item
             * @param {HTMLElement} item The item's element
             * @param {Number} index The item's index
             * @param {Ext.EventObject} e The raw event object. Use {@link Ext.EventObject#getKey getKey()} to retrieve the key that was pressed.
             */
            'beforeitemkeydown',
            /**
             * @event itemmousedown
             * Fires when there is a mouse down on an item
             * @param {Ext.view.View} this
             * @param {Ext.data.Model} record The record that belongs to the item
             * @param {HTMLElement} item The item's element
             * @param {Number} index The item's index
             * @param {Ext.EventObject} e The raw event object
             */
            'itemmousedown',
            /**
             * @event itemmouseup
             * Fires when there is a mouse up on an item
             * @param {Ext.view.View} this
             * @param {Ext.data.Model} record The record that belongs to the item
             * @param {HTMLElement} item The item's element
             * @param {Number} index The item's index
             * @param {Ext.EventObject} e The raw event object
             */
            'itemmouseup',
            /**
             * @event itemmouseenter
             * Fires when the mouse enters an item.
             * @param {Ext.view.View} this
             * @param {Ext.data.Model} record The record that belongs to the item
             * @param {HTMLElement} item The item's element
             * @param {Number} index The item's index
             * @param {Ext.EventObject} e The raw event object
             */
            'itemmouseenter',
            /**
             * @event itemmouseleave
             * Fires when the mouse leaves an item.
             * @param {Ext.view.View} this
             * @param {Ext.data.Model} record The record that belongs to the item
             * @param {HTMLElement} item The item's element
             * @param {Number} index The item's index
             * @param {Ext.EventObject} e The raw event object
             */
            'itemmouseleave',
            /**
             * @event itemclick
             * Fires when an item is clicked.
             * @param {Ext.view.View} this
             * @param {Ext.data.Model} record The record that belongs to the item
             * @param {HTMLElement} item The item's element
             * @param {Number} index The item's index
             * @param {Ext.EventObject} e The raw event object
             */
            'itemclick',
            /**
             * @event itemdblclick
             * Fires when an item is double clicked.
             * @param {Ext.view.View} this
             * @param {Ext.data.Model} record The record that belongs to the item
             * @param {HTMLElement} item The item's element
             * @param {Number} index The item's index
             * @param {Ext.EventObject} e The raw event object
             */
            'itemdblclick',
            /**
             * @event itemcontextmenu
             * Fires when an item is right clicked.
             * @param {Ext.view.View} this
             * @param {Ext.data.Model} record The record that belongs to the item
             * @param {HTMLElement} item The item's element
             * @param {Number} index The item's index
             * @param {Ext.EventObject} e The raw event object
             */
            'itemcontextmenu',
            /**
             * @event itemkeydown
             * Fires when a key is pressed while an item is currently selected.
             * @param {Ext.view.View} this
             * @param {Ext.data.Model} record The record that belongs to the item
             * @param {HTMLElement} item The item's element
             * @param {Number} index The item's index
             * @param {Ext.EventObject} e The raw event object. Use {@link Ext.EventObject#getKey getKey()} to retrieve the key that was pressed.
             */
            'itemkeydown',
            /**
             * @event beforecontainermousedown
             * Fires before the mousedown event on the container is processed. Returns false to cancel the default action.
             * @param {Ext.view.View} this
             * @param {Ext.EventObject} e The raw event object
             */
            'beforecontainermousedown',
            /**
             * @event beforecontainermouseup
             * Fires before the mouseup event on the container is processed. Returns false to cancel the default action.
             * @param {Ext.view.View} this
             * @param {Ext.EventObject} e The raw event object
             */
            'beforecontainermouseup',
            /**
             * @event beforecontainermouseover
             * Fires before the mouseover event on the container is processed. Returns false to cancel the default action.
             * @param {Ext.view.View} this
             * @param {Ext.EventObject} e The raw event object
             */
            'beforecontainermouseover',
            /**
             * @event beforecontainermouseout
             * Fires before the mouseout event on the container is processed. Returns false to cancel the default action.
             * @param {Ext.view.View} this
             * @param {Ext.EventObject} e The raw event object
             */
            'beforecontainermouseout',
            /**
             * @event beforecontainerclick
             * Fires before the click event on the container is processed. Returns false to cancel the default action.
             * @param {Ext.view.View} this
             * @param {Ext.EventObject} e The raw event object
             */
            'beforecontainerclick',
            /**
             * @event beforecontainerdblclick
             * Fires before the dblclick event on the container is processed. Returns false to cancel the default action.
             * @param {Ext.view.View} this
             * @param {Ext.EventObject} e The raw event object
             */
            'beforecontainerdblclick',
            /**
             * @event beforecontainercontextmenu
             * Fires before the contextmenu event on the container is processed. Returns false to cancel the default action.
             * @param {Ext.view.View} this
             * @param {Ext.EventObject} e The raw event object
             */
            'beforecontainercontextmenu',
            /**
             * @event beforecontainerkeydown
             * Fires before the keydown event on the container is processed. Returns false to cancel the default action.
             * @param {Ext.view.View} this
             * @param {Ext.EventObject} e The raw event object. Use {@link Ext.EventObject#getKey getKey()} to retrieve the key that was pressed.
             */
            'beforecontainerkeydown',
            /**
             * @event containermouseup
             * Fires when there is a mouse up on the container
             * @param {Ext.view.View} this
             * @param {Ext.EventObject} e The raw event object
             */
            'containermouseup',
            /**
             * @event containermouseover
             * Fires when you move the mouse over the container.
             * @param {Ext.view.View} this
             * @param {Ext.EventObject} e The raw event object
             */
            'containermouseover',
            /**
             * @event containermouseout
             * Fires when you move the mouse out of the container.
             * @param {Ext.view.View} this
             * @param {Ext.EventObject} e The raw event object
             */
            'containermouseout',
            /**
             * @event containerclick
             * Fires when the container is clicked.
             * @param {Ext.view.View} this
             * @param {Ext.EventObject} e The raw event object
             */
            'containerclick',
            /**
             * @event containerdblclick
             * Fires when the container is double clicked.
             * @param {Ext.view.View} this
             * @param {Ext.EventObject} e The raw event object
             */
            'containerdblclick',
            /**
             * @event containercontextmenu
             * Fires when the container is right clicked.
             * @param {Ext.view.View} this
             * @param {Ext.EventObject} e The raw event object
             */
            'containercontextmenu',
            /**
             * @event containerkeydown
             * Fires when a key is pressed while the container is focused, and no item is currently selected.
             * @param {Ext.view.View} this
             * @param {Ext.EventObject} e The raw event object. Use {@link Ext.EventObject#getKey getKey()} to retrieve the key that was pressed.
             */
            'containerkeydown',

            /**
             * @event
             * @inheritdoc Ext.selection.DataViewModel#selectionchange
             */
            'selectionchange',
            /**
             * @event
             * @inheritdoc Ext.selection.DataViewModel#beforeselect
             */
            'beforeselect',
            /**
             * @event
             * @inheritdoc Ext.selection.DataViewModel#beforedeselect
             */
            'beforedeselect',
            /**
             * @event
             * @inheritdoc Ext.selection.DataViewModel#select
             */
            'select',
            /**
             * @event
             * @inheritdoc Ext.selection.DataViewModel#deselect
             */
            'deselect',
            /**
             * @event
             * @inheritdoc Ext.selection.DataViewModel#focuschange
             */
            'focuschange',
            
            /**
             * @event highlightitem
             * Fires when a node is highlighted using keyboard navigation, or mouseover.
             * @param {Ext.view.View} view This View Component.
             * @param {Ext.Element} node The highlighted node.
             */
            'highlightitem',
            
            /**
             * @event unhighlightitem
             * Fires when a node is unhighlighted using keyboard navigation, or mouseout.
             * @param {Ext.view.View} view This View Component.
             * @param {Ext.Element} node The previously highlighted node.
             */
            'unhighlightitem'
        );
    },

    getFocusEl: function() {
        return this.getTargetEl();
    },

    // private
    afterRender: function(){
        var me = this;
        me.callParent();
        me.mon(me.getTargetEl(), {
            scope: me,
            /*
             * We need to make copies of this since some of the events fired here will end up triggering
             * a new event to be called and the shared event object will be mutated. In future we should
             * investigate if there are any issues with creating a new event object for each event that
             * is fired.
             */
            freezeEvent: true,
            click: me.handleEvent,
            mousedown: me.handleEvent,
            mouseup: me.handleEvent,
            dblclick: me.handleEvent,
            contextmenu: me.handleEvent,
            mouseover: me.handleEvent,
            mouseout: me.handleEvent,
            keydown: me.handleEvent
        });
    },

    handleEvent: function(e) {
        var me = this,
            key = e.type == 'keydown' && e.getKey();

        if (me.processUIEvent(e) !== false) {
            me.processSpecialEvent(e);
        }

        // After all listeners have processed the event, then unless the user is typing into an input field,
        // prevent browser's default action on SPACE which is to focus the event's target element.
        // Focusing causes the browser to attempt to scroll the element into view.
        if (key === e.SPACE) {
            if (!me.inputTagRe.test(e.getTarget().tagName)) {
                e.stopEvent();
            }
        }
    },

    // Private template method
    processItemEvent: Ext.emptyFn,
    processContainerEvent: Ext.emptyFn,
    processSpecialEvent: Ext.emptyFn,

    /*
     * Returns true if this mouseover/out event is still over the overItem.
     */
    stillOverItem: function (event, overItem) {
        var nowOver;

        // There is this weird bug when you hover over the border of a cell it is saying
        // the target is the table.
        // BrowserBug: IE6 & 7. If me.mouseOverItem has been removed and is no longer
        // in the DOM then accessing .offsetParent will throw an "Unspecified error." exception.
        // typeof'ng and checking to make sure the offsetParent is an object will NOT throw
        // this hard exception.
        if (overItem && typeof(overItem.offsetParent) === "object") {
            // mouseout : relatedTarget == nowOver, target == wasOver
            // mouseover: relatedTarget == wasOver, target == nowOver
            nowOver = (event.type == 'mouseout') ? event.getRelatedTarget() : event.getTarget();
            return Ext.fly(overItem).contains(nowOver);
        }

        return false;
    },

    processUIEvent: function(e) {
        var me = this,
            item = e.getTarget(me.getItemSelector(), me.getTargetEl()),
            map = this.statics().EventMap,
            index, record,
            type = e.type,
            overItem = me.mouseOverItem,
            newType;

        if (!item) {
            if (type == 'mouseover' && me.stillOverItem(e, overItem)) {
                item = overItem;
            }

            // Try to get the selected item to handle the keydown event, otherwise we'll just fire a container keydown event
            if (type == 'keydown') {
                record = me.getSelectionModel().getLastSelected();
                if (record) {
                    item = me.getNode(record);
                }
            }
        }

        if (item) {
            index = me.indexOf(item);
            if (!record) {
                record = me.getRecord(item);
            }

            // It is possible for an event to arrive for which there is no record... this
            // can happen with dblclick where the clicks are on removal actions (think a
            // grid w/"delete row" action column)
            if (!record || me.processItemEvent(record, item, index, e) === false) {
                return false;
            }

            newType = me.isNewItemEvent(item, e);
            if (newType === false) {
                return false;
            }

            if (
                (me['onBeforeItem' + map[newType]](record, item, index, e) === false) ||
                (me.fireEvent('beforeitem' + newType, me, record, item, index, e) === false) ||
                (me['onItem' + map[newType]](record, item, index, e) === false)
            ) {
                return false;
            }

            me.fireEvent('item' + newType, me, record, item, index, e);
        }
        else {
            if (
                (me.processContainerEvent(e) === false) ||
                (me['onBeforeContainer' + map[type]](e) === false) ||
                (me.fireEvent('beforecontainer' + type, me, e) === false) ||
                (me['onContainer' + map[type]](e) === false)
            ) {
                return false;
            }

            me.fireEvent('container' + type, me, e);
        }

        return true;
    },

    isNewItemEvent: function (item, e) {
        var me = this,
            overItem = me.mouseOverItem,
            type = e.type;

        switch (type) {
            case 'mouseover':
                if (item === overItem) {
                    return false;
                }
                me.mouseOverItem = item;
                return 'mouseenter';

            case 'mouseout':
                // If the currently mouseovered item contains the mouseover target, it's *NOT* a mouseleave
                if (me.stillOverItem(e, overItem)) {
                    return false;
                }
                me.mouseOverItem = null;
                return 'mouseleave';
        }
        return type;
    },

    // private
    onItemMouseEnter: function(record, item, index, e) {
        if (this.trackOver) {
            this.highlightItem(item);
        }
    },

    // private
    onItemMouseLeave : function(record, item, index, e) {
        if (this.trackOver) {
            this.clearHighlight();
        }
    },

    // @private, template methods
    onItemMouseDown: Ext.emptyFn,
    onItemMouseUp: Ext.emptyFn,
    onItemFocus: Ext.emptyFn,
    onItemClick: Ext.emptyFn,
    onItemDblClick: Ext.emptyFn,
    onItemContextMenu: Ext.emptyFn,
    onItemKeyDown: Ext.emptyFn,
    onBeforeItemMouseDown: Ext.emptyFn,
    onBeforeItemMouseUp: Ext.emptyFn,
    onBeforeItemFocus: Ext.emptyFn,
    onBeforeItemMouseEnter: Ext.emptyFn,
    onBeforeItemMouseLeave: Ext.emptyFn,
    onBeforeItemClick: Ext.emptyFn,
    onBeforeItemDblClick: Ext.emptyFn,
    onBeforeItemContextMenu: Ext.emptyFn,
    onBeforeItemKeyDown: Ext.emptyFn,

    // @private, template methods
    onContainerMouseDown: Ext.emptyFn,
    onContainerMouseUp: Ext.emptyFn,
    onContainerMouseOver: Ext.emptyFn,
    onContainerMouseOut: Ext.emptyFn,
    onContainerClick: Ext.emptyFn,
    onContainerDblClick: Ext.emptyFn,
    onContainerContextMenu: Ext.emptyFn,
    onContainerKeyDown: Ext.emptyFn,
    onBeforeContainerMouseDown: Ext.emptyFn,
    onBeforeContainerMouseUp: Ext.emptyFn,
    onBeforeContainerMouseOver: Ext.emptyFn,
    onBeforeContainerMouseOut: Ext.emptyFn,
    onBeforeContainerClick: Ext.emptyFn,
    onBeforeContainerDblClick: Ext.emptyFn,
    onBeforeContainerContextMenu: Ext.emptyFn,
    onBeforeContainerKeyDown: Ext.emptyFn,

    //private
    setHighlightedItem: function(item){
        var me = this,
            highlighted = me.highlightedItem;

        if (highlighted != item){
            if (highlighted) {
                Ext.fly(highlighted).removeCls(me.overItemCls);
                me.fireEvent('unhighlightitem', me, highlighted);
            }

            me.highlightedItem = item;

            if (item) {
                //console.log(item.viewIndex);
                Ext.fly(item).addCls(me.overItemCls);
                me.fireEvent('highlightitem', me, item);
            }
        }
    },

    /**
     * Highlights a given item in the View. This is called by the mouseover handler if {@link #overItemCls}
     * and {@link #trackOver} are configured, but can also be called manually by other code, for instance to
     * handle stepping through the list via keyboard navigation.
     * @param {HTMLElement} item The item to highlight
     */
    highlightItem: function(item) {
        this.setHighlightedItem(item);
    },

    /**
     * Un-highlights the currently highlighted item, if any.
     */
    clearHighlight: function() {
        this.setHighlightedItem(undefined);
    },
    
    onUpdate: function(store, record){
        var me = this,
            node,
            newNode,
            highlighted;
        
        if (me.viewReady) {
            node = me.getNode(record);
            newNode = me.callParent(arguments);
            highlighted = me.highlightedItem;
            
            if (highlighted && highlighted === node) {
                delete me.highlightedItem;
                if (newNode) {
                    me.highlightItem(newNode);
                }
            }
        }
    },

    refresh: function() {
        this.clearHighlight();
        this.callParent(arguments);
    }
});
/**
 * An internally used DataView for {@link Ext.form.field.ComboBox ComboBox}.
 */
Ext.define('Ext.view.BoundList', {
    extend: 'Ext.view.View',
    alias: 'widget.boundlist',
    alternateClassName: 'Ext.BoundList',
    requires: ['Ext.layout.component.BoundList', 'Ext.toolbar.Paging'],

    /**
     * @cfg {Number} [pageSize=0]
     * If greater than `0`, a {@link Ext.toolbar.Paging} is displayed at the bottom of the list and store
     * queries will execute with page {@link Ext.data.Operation#start start} and
     * {@link Ext.data.Operation#limit limit} parameters.
     */
    pageSize: 0,
    
    /**
     * @cfg {String} [displayField=""]
     * The field from the store to show in the view.
     */

    /**
     * @property {Ext.toolbar.Paging} pagingToolbar
     * A reference to the PagingToolbar instance in this view. Only populated if {@link #pageSize} is greater
     * than zero and the BoundList has been rendered.
     */

    // private overrides
    baseCls: Ext.baseCSSPrefix + 'boundlist',
    itemCls: Ext.baseCSSPrefix + 'boundlist-item',
    listItemCls: '',
    shadow: false,
    trackOver: true,
    refreshed: 0,
    
    // This Component is used as a popup, not part of a complex layout. Display data immediately.
    deferInitialRefresh: false,

    componentLayout: 'boundlist',

    childEls: [
        'listEl'
    ],

    renderTpl: [
        '<div id="{id}-listEl" class="{baseCls}-list-ct" style="overflow:auto"></div>',
        '{%',
            'var me=values.$comp, pagingToolbar=me.pagingToolbar;',
            'if (pagingToolbar) {',
                'pagingToolbar.ownerLayout = me.componentLayout;',
                'Ext.DomHelper.generateMarkup(pagingToolbar.getRenderTree(), out);',
            '}',
        '%}',
        {
            disableFormats: true
        }
    ],

    /**
     * @cfg {String/Ext.XTemplate} tpl
     * A String or Ext.XTemplate instance to apply to inner template.
     *
     * {@link Ext.view.BoundList} is used for the dropdown list of {@link Ext.form.field.ComboBox}.
     * To customize the template you can do this:
     *
     *     Ext.create('Ext.form.field.ComboBox', {
     *         fieldLabel   : 'State',
     *         queryMode    : 'local',
     *         displayField : 'text',
     *         valueField   : 'abbr',
     *         store        : Ext.create('StateStore', {
     *             fields : ['abbr', 'text'],
     *             data   : [
     *                 {"abbr":"AL", "name":"Alabama"},
     *                 {"abbr":"AK", "name":"Alaska"},
     *                 {"abbr":"AZ", "name":"Arizona"}
     *                 //...
     *             ]
     *         }),
     *         listConfig : {
     *             tpl : '<tpl for="."><div class="x-boundlist-item">{abbr}</div></tpl>'
     *         }
     *     });
     *
     * Defaults to:
     *
     *     Ext.create('Ext.XTemplate',
     *         '<ul><tpl for=".">',
     *             '<li role="option" class="' + itemCls + '">' + me.getInnerTpl(me.displayField) + '</li>',
     *         '</tpl></ul>'
     *     );
     *
     */

    initComponent: function() {
        var me = this,
            baseCls = me.baseCls,
            itemCls = me.itemCls;
            
        me.selectedItemCls = baseCls + '-selected';
        me.overItemCls = baseCls + '-item-over';
        me.itemSelector = "." + itemCls;

        if (me.floating) {
            me.addCls(baseCls + '-floating');
        }

        if (!me.tpl) {
            // should be setting aria-posinset based on entire set of data
            // not filtered set
            me.tpl = new Ext.XTemplate(
                '<ul><tpl for=".">',
                    '<li role="option" class="' + itemCls + '">' + me.getInnerTpl(me.displayField) + '</li>',
                '</tpl></ul>'
            );
        } else if (Ext.isString(me.tpl)) {
            me.tpl = new Ext.XTemplate(me.tpl);
        }

        if (me.pageSize) {
            me.pagingToolbar = me.createPagingToolbar();
        }

        me.callParent();
    },

    beforeRender: function() {
        var me = this;

        me.callParent(arguments);

        // If there's a Menu among our ancestors, then add the menu class.
        // This is so that the MenuManager does not see a mousedown in this Component as a document mousedown, outside the Menu
        if (me.up('menu')) {
            me.addCls(Ext.baseCSSPrefix + 'menu');
        }
    },

    /**
     * @private
     * Boundlist-specific implementation of the getBubbleTarget used by {@link Ext.AbstractComponent#up} method.
     * This links to the owning input field so that the FocusManager, when receiving notification of a hide event,
     * can find a focusable parent.
     */
    getBubbleTarget: function() {
        return this.pickerField;
    },

    getRefItems: function() {
        return this.pagingToolbar ? [ this.pagingToolbar ] : [];
    },

    createPagingToolbar: function() {
        return Ext.widget('pagingtoolbar', {
            id: this.id + '-paging-toolbar',
            pageSize: this.pageSize,
            store: this.store,
            border: false,
            ownerCt: this,
            ownerLayout: this.getComponentLayout()
        });
    },

    // Do the job of a container layout at this point even though we are not a Container.
    // TODO: Refactor as a Container.
    finishRenderChildren: function () {
        var toolbar = this.pagingToolbar;

        this.callParent(arguments);

        if (toolbar) {
            toolbar.finishRender();
        }
    },
    
    refresh: function(){
        var me = this,
            toolbar = me.pagingToolbar;
        
        me.callParent();
        // The view removes the targetEl from the DOM before updating the template
        // Ensure the toolbar goes to the end
        if (me.rendered && toolbar && toolbar.rendered && !me.preserveScrollOnRefresh) {
            me.el.appendChild(toolbar.el);
        }  
    },

    bindStore : function(store, initial) {
        var toolbar = this.pagingToolbar;
            
        this.callParent(arguments);
        if (toolbar) {
            toolbar.bindStore(this.store, initial);
        }
    },

    getTargetEl: function() {
        return this.listEl || this.el;
    },

    /**
     * A method that returns the inner template for displaying items in the list.
     * This method is useful to override when using a more complex display value, for example
     * inserting an icon along with the text.
     * @param {String} displayField The {@link #displayField} for the BoundList.
     * @return {String} The inner template
     */
    getInnerTpl: function(displayField) {
        return '{' + displayField + '}';
    },

    onDestroy: function() {
        Ext.destroyMembers(this, 'pagingToolbar', 'listEl');
        this.callParent();
    }
});

/**
 * A specialized {@link Ext.util.KeyNav} implementation for navigating a {@link Ext.view.BoundList} using
 * the keyboard. The up, down, pageup, pagedown, home, and end keys move the active highlight
 * through the list. The enter key invokes the selection model's select action using the highlighted item.
 */
Ext.define('Ext.view.BoundListKeyNav', {
    extend: 'Ext.util.KeyNav',
    requires: 'Ext.view.BoundList',

    /**
     * @cfg {Ext.view.BoundList} boundList (required)
     * The {@link Ext.view.BoundList} instance for which key navigation will be managed.
     */

    constructor: function(el, config) {
        var me = this;
        me.boundList = config.boundList;
        me.callParent([el, Ext.apply({}, config, me.defaultHandlers)]);
    },

    defaultHandlers: {
        up: function() {
            var me = this,
                boundList = me.boundList,
                allItems = boundList.all,
                oldItem = boundList.highlightedItem,
                oldItemIdx = oldItem ? boundList.indexOf(oldItem) : -1,
                newItemIdx = oldItemIdx > 0 ? oldItemIdx - 1 : allItems.getCount() - 1; //wraps around
            me.highlightAt(newItemIdx);
        },

        down: function() {
            var me = this,
                boundList = me.boundList,
                allItems = boundList.all,
                oldItem = boundList.highlightedItem,
                oldItemIdx = oldItem ? boundList.indexOf(oldItem) : -1,
                newItemIdx = oldItemIdx < allItems.getCount() - 1 ? oldItemIdx + 1 : 0; //wraps around
            me.highlightAt(newItemIdx);
        },

        pageup: function() {
            //TODO
        },

        pagedown: function() {
            //TODO
        },

        home: function() {
            this.highlightAt(0);
        },

        end: function() {
            var me = this;
            me.highlightAt(me.boundList.all.getCount() - 1);
        },

        enter: function(e) {
            this.selectHighlighted(e);
        }
    },

    /**
     * Highlights the item at the given index.
     * @param {Number} index
     */
    highlightAt: function(index) {
        var boundList = this.boundList,
            item = boundList.all.item(index);
        if (item) {
            item = item.dom;
            boundList.highlightItem(item);
            boundList.getTargetEl().scrollChildIntoView(item, false);
        }
    },

    /**
     * Triggers selection of the currently highlighted item according to the behavior of
     * the configured SelectionModel.
     */
    selectHighlighted: function(e) {
        var me = this,
            boundList = me.boundList,
            highlighted = boundList.highlightedItem,
            selModel = boundList.getSelectionModel();
        if (highlighted) {
            selModel.selectWithEvent(boundList.getRecord(highlighted), e);
        }
    }

});

/**
 * This class encapsulates the user interface for a tabular data set.
 * It acts as a centralized manager for controlling the various interface
 * elements of the view. This includes handling events, such as row and cell
 * level based DOM events. It also reacts to events from the underlying {@link Ext.selection.Model}
 * to provide visual feedback to the user.
 *
 * This class does not provide ways to manipulate the underlying data of the configured
 * {@link Ext.data.Store}.
 *
 * This is the base class for both {@link Ext.grid.View} and {@link Ext.tree.View} and is not
 * to be used directly.
 */
Ext.define('Ext.view.Table', {
    extend: 'Ext.view.View',
    alias: 'widget.tableview',
    uses: [
        'Ext.view.TableLayout',
        'Ext.view.TableChunker',
        'Ext.util.DelayedTask',
        'Ext.util.MixedCollection'
    ],

    componentLayout: 'tableview',

    baseCls: Ext.baseCSSPrefix + 'grid-view',

    // row
    itemSelector: 'tr.' + Ext.baseCSSPrefix + 'grid-row',
    // cell
    cellSelector: 'td.' + Ext.baseCSSPrefix + 'grid-cell',

    // keep a separate rowSelector, since we may need to select the actual row elements
    rowSelector: 'tr.' + Ext.baseCSSPrefix + 'grid-row',

    /**
     * @cfg {String} [firstCls='x-grid-cell-first']
     * A CSS class to add to the *first* cell in every row to enable special styling for the first column.
     * If no styling is needed on the first column, this may be configured as `null`.
     */
    firstCls: Ext.baseCSSPrefix + 'grid-cell-first',

    /**
     * @cfg {String} [lastCls='x-grid-cell-last']
     * A CSS class to add to the *last* cell in every row to enable special styling for the last column.
     * If no styling is needed on the last column, this may be configured as `null`.
     */
    lastCls: Ext.baseCSSPrefix + 'grid-cell-last',

    headerRowSelector: 'tr.' + Ext.baseCSSPrefix + 'grid-header-row',

    selectedItemCls: Ext.baseCSSPrefix + 'grid-row-selected',
    selectedCellCls: Ext.baseCSSPrefix + 'grid-cell-selected',
    focusedItemCls: Ext.baseCSSPrefix + 'grid-row-focused',
    overItemCls: Ext.baseCSSPrefix + 'grid-row-over',
    altRowCls:   Ext.baseCSSPrefix + 'grid-row-alt',
    rowClsRe: new RegExp('(?:^|\\s*)' + Ext.baseCSSPrefix + 'grid-row-(first|last|alt)(?:\\s+|$)', 'g'),
    cellRe: new RegExp(Ext.baseCSSPrefix + 'grid-cell-([^\\s]+) ', ''),

    // cfg docs inherited
    trackOver: true,

    /**
     * Override this function to apply custom CSS classes to rows during rendering. This function should return the
     * CSS class name (or empty string '' for none) that will be added to the row's wrapping div. To apply multiple
     * class names, simply return them space-delimited within the string (e.g. 'my-class another-class').
     * Example usage:
     *
     *     viewConfig: {
     *         getRowClass: function(record, rowIndex, rowParams, store){
     *             return record.get("valid") ? "row-valid" : "row-error";
     *         }
     *     }
     *
     * @param {Ext.data.Model} record The record corresponding to the current row.
     * @param {Number} index The row index.
     * @param {Object} rowParams **DEPRECATED.** For row body use the
     * {@link Ext.grid.feature.RowBody#getAdditionalData getAdditionalData} method of the rowbody feature.
     * @param {Ext.data.Store} store The store this grid is bound to
     * @return {String} a CSS class name to add to the row.
     * @method
     */
    getRowClass: null,

    /**
     * @cfg {Boolean} stripeRows
     * True to stripe the rows.
     *
     * This causes the CSS class **`x-grid-row-alt`** to be added to alternate rows of
     * the grid. A default CSS rule is provided which sets a background color, but you can override this
     * with a rule which either overrides the **background-color** style using the `!important`
     * modifier, or which uses a CSS selector of higher specificity.
     */
    stripeRows: true,
    
    /**
     * @cfg {Boolean} markDirty
     * True to show the dirty cell indicator when a cell has been modified.
     */
    markDirty : true,

    /**
     * @cfg {Boolean} enableTextSelection
     * True to enable text selections.
     */

    /**
     * @private
     * Simple initial tpl for TableView just to satisfy the validation within AbstractView.initComponent.
     */
    initialTpl: '<div></div>',

    initComponent: function() {
        var me = this,
            scroll = me.scroll;

        /**
         * @private
         * @property {Ext.dom.AbstractElement.Fly} table
         * A flyweight Ext.Element which encapsulates a reference to the transient `<table>` element within this View.
         * *Note that the `dom` reference will not be present until the first data refresh*
         */
        me.table = new Ext.dom.Element.Fly();
        me.table.id = me.id + 'gridTable';

        // Scrolling within a TableView is controlled by the scroll config of its owning GridPanel
        // It must see undefined in this property in order to leave the scroll styles alone at afterRender time
        me.autoScroll = undefined;

        // Convert grid scroll config to standard Component scrolling configurations.
        if (scroll === true || scroll === 'both') {
            me.autoScroll = true;
        } else if (scroll === 'horizontal') {
            me.overflowX = 'auto';
        } else if (scroll === 'vertical') {
            me.overflowY = 'auto';
        }
        me.selModel.view = me;
        me.headerCt.view = me;
        me.headerCt.markDirty = me.markDirty;

        // Features need a reference to the grid.
        me.initFeatures(me.grid);
        delete me.grid;

        // The real tpl is generated, but AbstractView.initComponent insists upon the presence of a fully instantiated XTemplate at construction time.
        me.tpl = me.getTpl('initialTpl');
        me.callParent();
    },
    
    /**
     * @private
     * Move a grid column from one position to another
     * @param {Number} fromIdx The index from which to move columns
     * @param {Number} toIdx The index at which to insert columns.
     * @param {Number} [colsToMove=1] The number of columns to move beginning at the `fromIdx`
     */
    moveColumn: function(fromIdx, toIdx, colsToMove) {
        var me = this,
            fragment = (colsToMove > 1) ? document.createDocumentFragment() : undefined,
            destinationCellIdx = toIdx,
            colCount = me.getGridColumns().length,
            lastIdx = colCount - 1,
            doFirstLastClasses = (me.firstCls || me.lastCls) && (toIdx === 0 || toIdx == colCount || fromIdx === 0 || fromIdx == lastIdx),
            i,
            j,
            rows, len, tr, headerRows;

        if (me.rendered) {
            // Use select here. In most cases there will only be one row. In
            // the case of a grouping grid, each group also has a header.
            headerRows = me.el.query(me.headerRowSelector);
            rows = me.el.query(me.rowSelector);

            if (toIdx > fromIdx && fragment) {
                destinationCellIdx -= colsToMove;
            }

            // Move the column sizing header to match
            for (i = 0, len = headerRows.length; i < len; ++i) {
                tr = headerRows[i];
                if (fragment) {
                    for (j = 0; j < colsToMove; j++) {
                        fragment.appendChild(tr.cells[fromIdx]);
                    }
                    tr.insertBefore(fragment, tr.cells[destinationCellIdx] || null);
                } else {
                    tr.insertBefore(tr.cells[fromIdx], tr.cells[destinationCellIdx] || null);
                }
            }

            for (i = 0, len = rows.length; i < len; i++) {
                tr = rows[i];

                // Keep first cell class and last cell class correct *only if needed*
                if (doFirstLastClasses) {

                    if (fromIdx === 0) {
                        Ext.fly(tr.cells[0]).removeCls(me.firstCls);
                        Ext.fly(tr.cells[1]).addCls(me.firstCls);
                    } else if (fromIdx === lastIdx) {
                        Ext.fly(tr.cells[lastIdx]).removeCls(me.lastCls);
                        Ext.fly(tr.cells[lastIdx - 1]).addCls(me.lastCls);
                    }
                    if (toIdx === 0) {
                        Ext.fly(tr.cells[0]).removeCls(me.firstCls);
                        Ext.fly(tr.cells[fromIdx]).addCls(me.firstCls);
                    } else if (toIdx === colCount) {
                        Ext.fly(tr.cells[lastIdx]).removeCls(me.lastCls);
                        Ext.fly(tr.cells[fromIdx]).addCls(me.lastCls);
                    }
                }

                if (fragment) {
                    for (j = 0; j < colsToMove; j++) {
                        fragment.appendChild(tr.cells[fromIdx]);
                    }
                    tr.insertBefore(fragment, tr.cells[destinationCellIdx] || null);
                } else {
                    tr.insertBefore(tr.cells[fromIdx], tr.cells[destinationCellIdx] || null);
                }
            }
            me.setNewTemplate();
        }
    },

    // scroll the view to the top
    scrollToTop: Ext.emptyFn,

    /**
     * Add a listener to the main view element. It will be destroyed with the view.
     * @private
     */
    addElListener: function(eventName, fn, scope){
        this.mon(this, eventName, fn, scope, {
            element: 'el'
        });
    },

    /**
     * Get the columns used for generating a template via TableChunker.
     * See {@link Ext.grid.header.Container#getGridColumns}.
     * @private
     */
    getGridColumns: function() {
        return this.headerCt.getGridColumns();
    },

    /**
     * Get a leaf level header by index regardless of what the nesting
     * structure is.
     * @private
     * @param {Number} index The index
     */
    getHeaderAtIndex: function(index) {
        return this.headerCt.getHeaderAtIndex(index);
    },

    /**
     * Get the cell (td) for a particular record and column.
     * @param {Ext.data.Model} record
     * @param {Ext.grid.column.Column} column
     * @private
     */
    getCell: function(record, column) {
        var row = this.getNode(record);
        return Ext.fly(row).down(column.getCellSelector());
    },

    /**
     * Get a reference to a feature
     * @param {String} id The id of the feature
     * @return {Ext.grid.feature.Feature} The feature. Undefined if not found
     */
    getFeature: function(id) {
        var features = this.featuresMC;
        if (features) {
            return features.get(id);
        }
    },

    /**
     * Initializes each feature and bind it to this view.
     * @private
     */
    initFeatures: function(grid) {
        var me = this,
            i,
            features,
            feature,
            len;

        me.featuresMC = new Ext.util.MixedCollection();
        features = me.features = me.constructFeatures();
        len = features ? features.length : 0;
        for (i = 0; i < len; i++) {
            feature = features[i];

            // inject a reference to view and grid - Features need both
            feature.view = me;
            feature.grid = grid;
            me.featuresMC.add(feature);
            feature.init();
        }
    },

    /**
     * @private
     * Converts the features array as configured, into an array of instantiated Feature objects.
     * 
     * This is borrowed by Lockable which clones and distributes Features to both child grids of a locking grid.
     * 
     * Must have no side effects other than Feature instantiation.
     * 
     * MUST NOT update the this.features property, and MUST NOT update the instantiated Features.
     */
    constructFeatures: function() {
        var me = this,
            features = me.features,
            feature,
            result,
            i = 0, len;
        
        if (features) {
            result = [];
            len = features.length;
            for (; i < len; i++) {
                feature = features[i];
                if (!feature.isFeature) {
                    feature = Ext.create('feature.' + feature.ftype, feature);
                }
                result[i] = feature;
            }
        }
        return result;
    },

    /**
     * Gives features an injection point to attach events to the markup that
     * has been created for this view.
     * @private
     */
    attachEventsForFeatures: function() {
        var features = this.features,
            ln       = features.length,
            i        = 0;

        for (; i < ln; i++) {
            if (features[i].isFeature) {
                features[i].attachEvents();
            }
        }
    },

    afterRender: function() {
        var me = this;
        me.callParent();

        if (!me.enableTextSelection) {
            me.el.unselectable();
        }
        me.attachEventsForFeatures();
    },

    // Private template method implemented starting at the AbstractView class.
    onViewScroll: function(e, t) {
        this.callParent(arguments);
        this.fireEvent('bodyscroll', e, t);
    },

    /**
     * Uses the headerCt (Which is the repository of all information relating to Column definitions)
     * to transform data from dataIndex keys in a record to headerId keys in each header and then run
     * them through each feature to get additional data for variables they have injected into the view template.
     * @private
     */
    prepareData: function(data, idx, record) {
        var me       = this,
            result   = me.headerCt.prepareData(data, idx, record, me, me.ownerCt),
            features = me.features,
            ln       = features.length,
            i        = 0,
            feature;

        for (; i < ln; i++) {
            feature = features[i];
            if (feature.isFeature) {
                Ext.apply(result, feature.getAdditionalData(data, idx, record, result, me));
            }
        }

        return result;
    },

    // TODO: Refactor headerCt dependency here to colModel
    collectData: function(records, startIndex) {
        var me = this,
            preppedRecords = me.callParent(arguments),
            headerCt  = me.headerCt,
            fullWidth = headerCt.getFullWidth(),
            features  = me.features,
            ln = features.length,
            o = {
                rows: preppedRecords,
                fullWidth: fullWidth
            },
            i  = 0,
            feature,
            j = 0,
            jln,
            rowParams,
            rec,
            cls;

        jln = preppedRecords.length;
        // process row classes, rowParams has been deprecated and has been moved
        // to the individual features that implement the behavior.
        if (me.getRowClass) {
            for (; j < jln; j++) {
                rowParams = {};
                rec = preppedRecords[j];
                cls = rec.rowCls || '';
                rec.rowCls = this.getRowClass(records[j], j, rowParams, me.store) + ' ' + cls;
                if (rowParams.alt) {
                    Ext.Error.raise("The getRowClass alt property is no longer supported.");
                }
                if (rowParams.tstyle) {
                    Ext.Error.raise("The getRowClass tstyle property is no longer supported.");
                }
                if (rowParams.cells) {
                    Ext.Error.raise("The getRowClass cells property is no longer supported.");
                }
                if (rowParams.body) {
                    Ext.Error.raise("The getRowClass body property is no longer supported. Use the getAdditionalData method of the rowbody feature.");
                }
                if (rowParams.bodyStyle) {
                    Ext.Error.raise("The getRowClass bodyStyle property is no longer supported.");
                }
                if (rowParams.cols) {
                    Ext.Error.raise("The getRowClass cols property is no longer supported.");
                }
            }
        }
        // currently only one feature may implement collectData. This is to modify
        // what's returned to the view before its rendered
        for (; i < ln; i++) {
            feature = features[i];
            if (feature.isFeature && feature.collectData && !feature.disabled) {
                o = feature.collectData(records, preppedRecords, startIndex, fullWidth, o);
                break;
            }
        }
        return o;
    },

    // Private. Called when the table changes height.
    // For example, see examples/grid/group-summary-grid.html
    // If we have flexed column headers, we need to update the header layout
    // because it may have to accommodate (or cease to accommodate) a vertical scrollbar.
    // Only do this on platforms which have a space-consuming scrollbar.
    // Only do it when vertical scrolling is enabled.
    refreshSize: function() {
        var me = this,
            cmp;

        // On every update of the layout system due to data update, capture the table's DOM in our private flyweight
        me.table.attach(me.el.child('table', true));

        if (!me.hasLoadingHeight) {
            cmp = me.up('tablepanel');

            // Suspend layouts in case the superclass requests a layout. We might too, so they
            // must be coalescsed.
            Ext.suspendLayouts();

            me.callParent();

            // If the OS displays scrollbars, and we are overflowing vertically, ensure the
            // HeaderContainer accounts for the scrollbar.
            if (cmp && Ext.getScrollbarSize().width && (me.autoScroll || me.overflowY)) {
                cmp.updateLayout();
            }

            Ext.resumeLayouts(true);
        }
    },

    /**
     * Set a new template based on the current columns displayed in the grid.
     * @private
     */
    setNewTemplate: function() {
        var me = this,
            columns = me.headerCt.getColumnsForTpl(true);

        // Template generation requires the rowCount as well as the column definitions and features.
        me.tpl = me.getTableChunker().getTableTpl({
            rowCount: me.store.getCount(),
            columns: columns,
            features: me.features,
            enableTextSelection: me.enableTextSelection
        });
    },

    /**
     * Returns the configured chunker or default of Ext.view.TableChunker
     */
    getTableChunker: function() {
        return this.chunker || Ext.view.TableChunker;
    },

    /**
     * Adds a CSS Class to a specific row.
     * @param {HTMLElement/String/Number/Ext.data.Model} rowInfo An HTMLElement, index or instance of a model
     * representing this row
     * @param {String} cls
     */
    addRowCls: function(rowInfo, cls) {
        var row = this.getNode(rowInfo);
        if (row) {
            Ext.fly(row).addCls(cls);
        }
    },

    /**
     * Removes a CSS Class from a specific row.
     * @param {HTMLElement/String/Number/Ext.data.Model} rowInfo An HTMLElement, index or instance of a model
     * representing this row
     * @param {String} cls
     */
    removeRowCls: function(rowInfo, cls) {
        var row = this.getNode(rowInfo);
        if (row) {
            Ext.fly(row).removeCls(cls);
        }
    },

    // GridSelectionModel invokes onRowSelect as selection changes
    onRowSelect : function(rowIdx) {
        this.addRowCls(rowIdx, this.selectedItemCls);
    },

    // GridSelectionModel invokes onRowDeselect as selection changes
    onRowDeselect : function(rowIdx) {
        var me = this;

        me.removeRowCls(rowIdx, me.selectedItemCls);
        me.removeRowCls(rowIdx, me.focusedItemCls);
    },

    onCellSelect: function(position) {
        var cell = this.getCellByPosition(position, true);
        if (cell) {
            Ext.fly(cell).addCls(this.selectedCellCls);
        }
    },

    onCellDeselect: function(position) {
        var cell = this.getCellByPosition(position, true);
        if (cell) {
            Ext.fly(cell).removeCls(this.selectedCellCls);
        }

    },

    onCellFocus: function(position) {
        this.focusCell(position);
    },

    getCellByPosition: function(position, returnDom) {
        if (position) {
            var node   = this.getNode(position.row),
                header = this.headerCt.getHeaderAtIndex(position.column);

            if (header && node) {
                return Ext.fly(node).down(header.getCellSelector(), returnDom);
            }
        }
        return false;
    },

    // GridSelectionModel invokes onRowFocus to 'highlight'
    // the last row focused
    onRowFocus: function(rowIdx, highlight, supressFocus) {
        var me = this;

        if (highlight) {
            me.addRowCls(rowIdx, me.focusedItemCls);
            if (!supressFocus) {
                me.focusRow(rowIdx);
            }
            //this.el.dom.setAttribute('aria-activedescendant', row.id);
        } else {
            me.removeRowCls(rowIdx, me.focusedItemCls);
        }
    },

    /**
     * Focuses a particular row and brings it into view. Will fire the rowfocus event.
     * @param {HTMLElement/String/Number/Ext.data.Model} rowIdx
     * An HTMLElement template node, index of a template node, the id of a template node or the
     * record associated with the node.
     */
    focusRow: function(rowIdx) {
        var me         = this,
            row        = me.getNode(rowIdx),
            el         = me.el,
            adjustment = 0,
            panel      = me.ownerCt,
            rowRegion,
            elTop,
            elBottom,
            record;

        if (row && el) {
            // Viewable region must not include scrollbars, so use
            // DOM clientHeight to determine height
            elTop = el.getY();
            elBottom = elTop + el.dom.clientHeight;
            rowRegion = Ext.fly(row).getRegion();
            // row is above
            if (rowRegion.top < elTop) {
                adjustment = rowRegion.top - elTop;
            // row is below
            } else if (rowRegion.bottom > elBottom) {
                adjustment = rowRegion.bottom - elBottom;
            }
            record = me.getRecord(row);
            rowIdx = me.store.indexOf(record);

            if (adjustment) {
                panel.scrollByDeltaY(adjustment);
            }
            me.fireEvent('rowfocus', record, row, rowIdx);
        }
    },

    focusCell: function(position) {
        var me          = this,
            cell        = me.getCellByPosition(position),
            el          = me.el,
            adjustmentY = 0,
            adjustmentX = 0,
            elRegion    = el.getRegion(),
            panel       = me.ownerCt,
            cellRegion,
            record;

        // Viewable region must not include scrollbars, so use
        // DOM client dimensions
        elRegion.bottom = elRegion.top + el.dom.clientHeight;
        elRegion.right = elRegion.left + el.dom.clientWidth;
        if (cell) {
            cellRegion = cell.getRegion();
            // cell is above
            if (cellRegion.top < elRegion.top) {
                adjustmentY = cellRegion.top - elRegion.top;
            // cell is below
            } else if (cellRegion.bottom > elRegion.bottom) {
                adjustmentY = cellRegion.bottom - elRegion.bottom;
            }

            // cell is left
            if (cellRegion.left < elRegion.left) {
                adjustmentX = cellRegion.left - elRegion.left;
            // cell is right
            } else if (cellRegion.right > elRegion.right) {
                adjustmentX = cellRegion.right - elRegion.right;
            }

            if (adjustmentY) {
                panel.scrollByDeltaY(adjustmentY);
            }
            if (adjustmentX) {
                panel.scrollByDeltaX(adjustmentX);
            }
            el.focus();
            me.fireEvent('cellfocus', record, cell, position);
        }
    },

    /**
     * Scrolls by delta. This affects this individual view ONLY and does not
     * synchronize across views or scrollers.
     * @param {Number} delta
     * @param {String} [dir] Valid values are scrollTop and scrollLeft. Defaults to scrollTop.
     * @private
     */
    scrollByDelta: function(delta, dir) {
        dir = dir || 'scrollTop';
        var elDom = this.el.dom;
        elDom[dir] = (elDom[dir] += delta);
    },

    // private
    onUpdate : function(store, record, operation, changedFieldNames) {
        var me = this,
            index,
            newRow, newAttrs, attLen, i, attName, oldRow, oldRowDom,
            oldCells, newCells, len, i,
            columns, overItemCls,
            isHovered, row,
            // See if an editing plugin is active.
            isEditing = me.editingPlugin && me.editingPlugin.editing;

        if (me.viewReady) {

            index = me.store.indexOf(record);
            columns = me.headerCt.getGridColumns();
            overItemCls = me.overItemCls;

            // If we have columns which may *need* updating (think lockable grid child with all columns either locked or unlocked)
            // and the changed record is within our view, then update the view
            if (columns.length && index > -1) {
                newRow = me.bufferRender([record], index)[0];
                oldRow = me.all.item(index);
                if (oldRow) {
                    oldRowDom = oldRow.dom;
                    isHovered = oldRow.hasCls(overItemCls);

                    // Copy new row attributes across. Use IE-specific method if possible.
                    if (oldRowDom.mergeAttributes) {
                        oldRowDom.mergeAttributes(newRow, true);
                    } else {
                        newAttrs = newRow.attributes;
                        attLen = newAttrs.length;
                        for (i = 0; i < attLen; i++) {
                            attName = newAttrs[i].name;
                            if (attName !== 'id') {
                                oldRowDom.setAttribute(attName, newAttrs[i].value);
                            }
                        }
                    }

                    if (isHovered) {
                        oldRow.addCls(overItemCls);
                    }

                    // Replace changed cells in the existing row structure with the new version from the rendered row.
                    oldCells = oldRow.query(me.cellSelector);
                    newCells = Ext.fly(newRow).query(me.cellSelector);
                    len = newCells.length;
                    // row is the element that contains the cells.  This will be a different element from oldRow when using a rowwrap feature     
                    row = oldCells[0].parentNode;
                    for (i = 0; i < len; i++) {
                        // If the field at this column index was changed, or column has a custom renderer
                        // (which means value could rely on any other changed field) the update the cell's content.
                        if (me.shouldUpdateCell(columns[i], changedFieldNames)) {
                            // If an editor plugin is active, we carefully replace just the *contents* of the cell.
                            if (isEditing) {
                                Ext.fly(oldCells[i]).syncContent(newCells[i]);
                            }
                            // Otherwise, we simply replace whole TDs with a new version
                            else {
                                row.insertBefore(newCells[i], oldCells[i]);
                                row.removeChild(oldCells[i]);
                            }
                        }
                    }
                }
                me.fireEvent('itemupdate', record, index, newRow);
            }
        }
    },
    
    shouldUpdateCell: function(column, changedFieldNames){
        // Though this may not be the most efficient, a renderer could be dependent on any field in the
        // store, so we must always update the cell
        if (column.hasCustomRenderer) {
            return true;
        }
        return !changedFieldNames || Ext.Array.contains(changedFieldNames, column.dataIndex);
    },

    /**
     * Refreshes the grid view. Saves and restores the scroll state, generates a new template, stripes rows and
     * invalidates the scrollers.
     */
    refresh: function() {
        var me = this;
        me.setNewTemplate();
        me.callParent(arguments);
        me.doStripeRows(0);
        me.headerCt.setSortState();
    },

    clearViewEl: function() {
        this.callParent();
        delete this.table.dom;
    },

    processItemEvent: function(record, row, rowIndex, e) {
        var me = this,
            cell = e.getTarget(me.cellSelector, row),
            cellIndex = cell ? cell.cellIndex : -1,
            map = me.statics().EventMap,
            selModel = me.getSelectionModel(),
            type = e.type,
            result;

        if (type == 'keydown' && !cell && selModel.getCurrentPosition) {
            // CellModel, otherwise we can't tell which cell to invoke
            cell = me.getCellByPosition(selModel.getCurrentPosition());
            if (cell) {
                cell = cell.dom;
                cellIndex = cell.cellIndex;
            }
        }

        result = me.fireEvent('uievent', type, me, cell, rowIndex, cellIndex, e, record, row);

        if (result === false || me.callParent(arguments) === false) {
            return false;
        }

        // Don't handle cellmouseenter and cellmouseleave events for now
        if (type == 'mouseover' || type == 'mouseout') {
            return true;
        }

        if(!cell) {
            // if the element whose event is being processed is not an actual cell (for example if using a rowbody
            // feature and the rowbody element's event is being processed) then do not fire any "cell" events
            return true;
        }

        return !(
            // We are adding cell and feature events
            (me['onBeforeCell' + map[type]](cell, cellIndex, record, row, rowIndex, e) === false) ||
            (me.fireEvent('beforecell' + type, me, cell, cellIndex, record, row, rowIndex, e) === false) ||
            (me['onCell' + map[type]](cell, cellIndex, record, row, rowIndex, e) === false) ||
            (me.fireEvent('cell' + type, me, cell, cellIndex, record, row, rowIndex, e) === false)
        );
    },

    processSpecialEvent: function(e) {
        var me = this,
            map = me.statics().EventMap,
            features = me.features,
            ln = features.length,
            type = e.type,
            i, feature, prefix, featureTarget,
            beforeArgs, args,
            panel = me.ownerCt;

        me.callParent(arguments);

        if (type == 'mouseover' || type == 'mouseout') {
            return;
        }

        for (i = 0; i < ln; i++) {
            feature = features[i];
            if (feature.hasFeatureEvent) {
                featureTarget = e.getTarget(feature.eventSelector, me.getTargetEl());
                if (featureTarget) {
                    prefix = feature.eventPrefix;
                    // allows features to implement getFireEventArgs to change the
                    // fireEvent signature
                    beforeArgs = feature.getFireEventArgs('before' + prefix + type, me, featureTarget, e);
                    args = feature.getFireEventArgs(prefix + type, me, featureTarget, e);

                    if (
                        // before view event
                        (me.fireEvent.apply(me, beforeArgs) === false) ||
                        // panel grid event
                        (panel.fireEvent.apply(panel, beforeArgs) === false) ||
                        // view event
                        (me.fireEvent.apply(me, args) === false) ||
                        // panel event
                        (panel.fireEvent.apply(panel, args) === false)
                    ) {
                        return false;
                    }
                }
            }
        }
        return true;
    },

    onCellMouseDown: Ext.emptyFn,
    onCellMouseUp: Ext.emptyFn,
    onCellClick: Ext.emptyFn,
    onCellDblClick: Ext.emptyFn,
    onCellContextMenu: Ext.emptyFn,
    onCellKeyDown: Ext.emptyFn,
    onBeforeCellMouseDown: Ext.emptyFn,
    onBeforeCellMouseUp: Ext.emptyFn,
    onBeforeCellClick: Ext.emptyFn,
    onBeforeCellDblClick: Ext.emptyFn,
    onBeforeCellContextMenu: Ext.emptyFn,
    onBeforeCellKeyDown: Ext.emptyFn,

    /**
     * Expands a particular header to fit the max content width.
     * This will ONLY expand, not contract.
     * @private
     */
    expandToFit: function(header) {
        if (header) {
            var maxWidth = this.getMaxContentWidth(header);
            delete header.flex;
            header.setWidth(maxWidth);
        }
    },

    /**
     * Returns the max contentWidth of the header's text and all cells
     * in the grid under this header.
     * @private
     */
    getMaxContentWidth: function(header) {
        var cellSelector = header.getCellInnerSelector(),
            cells        = this.el.query(cellSelector),
            i = 0,
            ln = cells.length,
            maxWidth = header.el.dom.scrollWidth,
            scrollWidth;

        for (; i < ln; i++) {
            scrollWidth = cells[i].scrollWidth;
            if (scrollWidth > maxWidth) {
                maxWidth = scrollWidth;
            }
        }
        return maxWidth;
    },

    getPositionByEvent: function(e) {
        var me       = this,
            cellNode = e.getTarget(me.cellSelector),
            rowNode  = e.getTarget(me.itemSelector),
            record   = me.getRecord(rowNode),
            header   = me.getHeaderByCell(cellNode);

        return me.getPosition(record, header);
    },

    getHeaderByCell: function(cell) {
        if (cell) {
            var m = cell.className.match(this.cellRe);
            if (m && m[1]) {
                return Ext.getCmp(m[1]);
            }
        }
        return false;
    },

    /**
     * @param {Object} position The current row and column: an object containing the following properties:
     *
     * - row - The row index
     * - column - The column index
     *
     * @param {String} direction 'up', 'down', 'right' and 'left'
     * @param {Ext.EventObject} e event
     * @param {Boolean} preventWrap Set to true to prevent wrap around to the next or previous row.
     * @param {Function} verifierFn A function to verify the validity of the calculated position.
     * When using this function, you must return true to allow the newPosition to be returned.
     * @param {Object} scope Scope to run the verifierFn in
     * @returns {Object} newPosition An object containing the following properties:
     *
     * - row - The row index
     * - column - The column index
     *
     * @private
     */
    walkCells: function(pos, direction, e, preventWrap, verifierFn, scope) {

        // Caller (probably CellModel) had no current position. This can happen
        // if the main el is focused and any navigation key is presssed.
        if (!pos) {
            return;
        }

        var me       = this,
            row      = pos.row,
            column   = pos.column,
            rowCount = me.store.getCount(),
            firstCol = me.getFirstVisibleColumnIndex(),
            lastCol  = me.getLastVisibleColumnIndex(),
            newPos   = {row: row, column: column},
            activeHeader = me.headerCt.getHeaderAtIndex(column);

        // no active header or its currently hidden
        if (!activeHeader || activeHeader.hidden) {
            return false;
        }

        e = e || {};
        direction = direction.toLowerCase();
        switch (direction) {
            case 'right':
                // has the potential to wrap if its last
                if (column === lastCol) {
                    // if bottom row and last column, deny right
                    if (preventWrap || row === rowCount - 1) {
                        return false;
                    }
                    if (!e.ctrlKey) {
                        // otherwise wrap to nextRow and firstCol
                        newPos.row = row + 1;
                        newPos.column = firstCol;
                    }
                // go right
                } else {
                    if (!e.ctrlKey) {
                        newPos.column = column + me.getRightGap(activeHeader);
                    } else {
                        newPos.column = lastCol;
                    }
                }
                break;

            case 'left':
                // has the potential to wrap
                if (column === firstCol) {
                    // if top row and first column, deny left
                    if (preventWrap || row === 0) {
                        return false;
                    }
                    if (!e.ctrlKey) {
                        // otherwise wrap to prevRow and lastCol
                        newPos.row = row - 1;
                        newPos.column = lastCol;
                    }
                // go left
                } else {
                    if (!e.ctrlKey) {
                        newPos.column = column + me.getLeftGap(activeHeader);
                    } else {
                        newPos.column = firstCol;
                    }
                }
                break;

            case 'up':
                // if top row, deny up
                if (row === 0) {
                    return false;
                // go up
                } else {
                    if (!e.ctrlKey) {
                        newPos.row = row - 1;
                    } else {
                        newPos.row = 0;
                    }
                }
                break;

            case 'down':
                // if bottom row, deny down
                if (row === rowCount - 1) {
                    return false;
                // go down
                } else {
                    if (!e.ctrlKey) {
                        newPos.row = row + 1;
                    } else {
                        newPos.row = rowCount - 1;
                    }
                }
                break;
        }

        if (verifierFn && verifierFn.call(scope || window, newPos) !== true) {
            return false;
        } else {
            return newPos;
        }
    },
    getFirstVisibleColumnIndex: function() {
        var firstVisibleHeader = this.getHeaderCt().getVisibleGridColumns()[0];

        return firstVisibleHeader ? firstVisibleHeader.getIndex() : -1;
    },

    getLastVisibleColumnIndex: function() {
        var visHeaders = this.getHeaderCt().getVisibleGridColumns(),
            lastHeader = visHeaders[visHeaders.length - 1];

        return lastHeader.getIndex();
    },

    getHeaderCt: function() {
        return this.headerCt;
    },

    // TODO: have this use the new Ext.grid.CellContext class
    getPosition: function(record, header) {
        var me = this,
            store = me.store,
            gridCols = me.headerCt.getGridColumns();

        return {
            row: store.indexOf(record),
            column: Ext.Array.indexOf(gridCols, header)
        };
    },

    /**
     * Determines the 'gap' between the closest adjacent header to the right
     * that is not hidden.
     * @private
     */
    getRightGap: function(activeHeader) {
        var headerCt        = this.getHeaderCt(),
            headers         = headerCt.getGridColumns(),
            activeHeaderIdx = Ext.Array.indexOf(headers, activeHeader),
            i               = activeHeaderIdx + 1,
            nextIdx;

        for (; i <= headers.length; i++) {
            if (!headers[i].hidden) {
                nextIdx = i;
                break;
            }
        }

        return nextIdx - activeHeaderIdx;
    },

    beforeDestroy: function() {
        if (this.rendered) {
            this.el.removeAllListeners();
        }
        this.callParent(arguments);
    },

    /**
     * Determines the 'gap' between the closest adjacent header to the left
     * that is not hidden.
     * @private
     */
    getLeftGap: function(activeHeader) {
        var headerCt        = this.getHeaderCt(),
            headers         = headerCt.getGridColumns(),
            activeHeaderIdx = Ext.Array.indexOf(headers, activeHeader),
            i               = activeHeaderIdx - 1,
            prevIdx;

        for (; i >= 0; i--) {
            if (!headers[i].hidden) {
                prevIdx = i;
                break;
            }
        }

        return prevIdx - activeHeaderIdx;
    },

    // after adding a row stripe rows from then on
    onAdd: function(ds, records, index) {
        this.callParent(arguments);
        this.doStripeRows(index);
    },
    
    // after removing a row stripe rows from then on
    onRemove: function(ds, records, index) {
        this.callParent(arguments);
        this.doStripeRows(index);
    },
    
    /**
     * Stripes rows from a particular row index.
     * @param {Number} startRow
     * @param {Number} [endRow] argument specifying the last row to process.
     * By default process up to the last row.
     * @private
     */
    doStripeRows: function(startRow, endRow) {
        var me = this,
            rows,
            rowsLn,
            i,
            row;
            
        // ensure stripeRows configuration is turned on
        if (me.rendered && me.stripeRows) {
            rows = me.getNodes(startRow, endRow);
                
            for (i = 0, rowsLn = rows.length; i < rowsLn; i++) {
                row = rows[i];
                // Remove prior applied row classes.
                row.className = row.className.replace(me.rowClsRe, ' ');
                startRow++;
                // Every odd row will get an additional cls
                if (startRow % 2 === 0) {
                    row.className += (' ' + me.altRowCls);
                }
            }
        }
    }
 
});




/**
 *  Component layout for {@link Ext.view.Table}
 *  @private
 * 
 */
Ext.define('Ext.view.TableLayout', {
    extend: 'Ext.layout.component.Auto',

    alias: ['layout.tableview'],
    type: 'tableview',

    beginLayout: function(ownerContext) {
        var me = this;

        me.callParent(arguments);

        // Grab ContextItem for the driving HeaderContainer and the table only if their is a table to size
        if (me.owner.table.dom) {
            ownerContext.tableContext = ownerContext.getEl(me.owner.table);

            // Grab a ContextItem for the header container
            ownerContext.headerContext = ownerContext.context.getCmp(me.headerCt);
        }
    },

    calculate: function(ownerContext) {
        var me = this;

        me.callParent(arguments);

        if (ownerContext.tableContext) {
            if (ownerContext.state.columnWidthsSynced) {
                if (ownerContext.hasProp('columnWidthsFlushed')) {
                    ownerContext.tableContext.setHeight(ownerContext.tableContext.el.dom.offsetHeight, false);
                } else {
                    me.done = false;
                }
            } else {
                if (ownerContext.headerContext.hasProp('columnWidthsDone')) {
                    ownerContext.context.queueFlush(me);
                    ownerContext.state.columnWidthsSynced = true;
                }

                // Either our base class (Auto) needs to measureContentHeight
                // if we are shrinkWrapHeight OR we need to measure the table
                // element height if we are not shrinkWrapHeight
                me.done = false;
            }
        }
    },

    measureContentHeight: function(ownerContext) {
        // Only able to produce a valid contentHeight if we have flushed all column widths to the table (or there's no table at all).
        if (!ownerContext.headerContext || ownerContext.hasProp('columnWidthsFlushed')) {
            return this.callParent(arguments);
        }
    },

    flush: function() {
        var me = this,
            context = me.ownerContext.context,
            columns = me.headerCt.getGridColumns(),
            i = 0, len = columns.length,
            el = me.owner.el,
            tableWidth = 0,
            colWidth;

        // So that the setProp can trigger this layout.
        context.currentLayout = me;

        // Set column width corresponding to each header
        for (i = 0; i < len; i++) {
            colWidth = columns[i].hidden ? 0 : context.getCmp(columns[i]).props.width;
            tableWidth += colWidth;

            // Grab the col and set the width.
            // CSS class is generated in TableChunker.
            // Select composites because there may be several chunks.
            el.select(me.getColumnSelector(columns[i])).setWidth(colWidth);
        }
        el.select('table.' + Ext.baseCSSPrefix + 'grid-table-resizer').setWidth(tableWidth);

        // Now we can measure contentHeight if necessary (if we are height shrinkwrapped)
        me.ownerContext.setProp('columnWidthsFlushed', true);
    },
    
    finishedLayout: function(){
        var me = this,
            first;
            
        me.callParent(arguments);   
        // In FF, in some cases during a resize or column hide/show, the <td> cells in
        // the grid won't respond to the new width set in the <th> at the top. So we
        // force a reflow of the table which seems to correct it. Related to EXTJSIV-6410
        if (Ext.isGecko) {
            first = me.headerCt.getGridColumns()[0];
            if (first) {
                first = me.owner.el.down(me.getColumnSelector(first));
                if (first) {
                    first.setStyle('display', 'none');
                    first.dom.scrollWidth;
                    first.setStyle('display', '');
                }
            }
        } 
    },

    getColumnSelector: function(column) {
        return 'th.' + Ext.baseCSSPrefix + 'grid-col-resizer-' + column.id;
    }
});
