
/**
 * This class is used internally to provide a single interface when using
 * a locking grid. Internally, the locking grid creates two separate grids,
 * so this class is used to map calls appropriately.
 * @private
 */
Ext.define('Ext.grid.LockingView', {

    mixins: {
        observable: 'Ext.util.Observable'
    },

    eventRelayRe: /^(beforeitem|beforecontainer|item|container|cell)/,

    constructor: function(config){
        var me = this,
            eventNames = [],
            eventRe = me.eventRelayRe,
            locked = config.locked.getView(),
            normal = config.normal.getView(),
            events,
            event;

        Ext.apply(me, {
            lockedView: locked,
            normalView: normal,
            lockedGrid: config.locked,
            normalGrid: config.normal,
            panel: config.panel
        });
        me.mixins.observable.constructor.call(me, config);

        // relay events
        events = locked.events;
        for (event in events) {
            if (events.hasOwnProperty(event) && eventRe.test(event)) {
                eventNames.push(event);
            }
        }
        me.relayEvents(locked, eventNames);
        me.relayEvents(normal, eventNames);

        normal.on({
            scope: me,
            itemmouseleave: me.onItemMouseLeave,
            itemmouseenter: me.onItemMouseEnter
        });

        locked.on({
            scope: me,
            itemmouseleave: me.onItemMouseLeave,
            itemmouseenter: me.onItemMouseEnter
        });
    },

    getGridColumns: function() {
        var cols = this.lockedGrid.headerCt.getGridColumns();
        return cols.concat(this.normalGrid.headerCt.getGridColumns());
    },

    getEl: function(column){
        return this.getViewForColumn(column).getEl();
    },

    getViewForColumn: function(column) {
        var view = this.lockedView,
            inLocked;

        view.headerCt.cascade(function(col){
            if (col === column) {
                inLocked = true;
                return false;
            }
        });

        return inLocked ? view : this.normalView;
    },

    onItemMouseEnter: function(view, record){
        var me = this,
            locked = me.lockedView,
            other = me.normalView,
            item;

        if (view.trackOver) {
            if (view !== locked) {
                other = locked;
            }
            item = other.getNode(record);
            other.highlightItem(item);
        }
    },

    onItemMouseLeave: function(view, record){
        var me = this,
            locked = me.lockedView,
            other = me.normalView;

        if (view.trackOver) {
            if (view !== locked) {
                other = locked;
            }
            other.clearHighlight();
        }
    },

    relayFn: function(name, args){
        args = args || [];

        var view = this.lockedView;
        view[name].apply(view, args || []);
        view = this.normalView;
        view[name].apply(view, args || []);
    },

    getSelectionModel: function(){
        return this.panel.getSelectionModel();
    },

    getStore: function(){
        return this.panel.store;
    },

    getNode: function(nodeInfo){
        // default to the normal view
        return this.normalView.getNode(nodeInfo);
    },

    getCell: function(record, column){
        var view = this.getViewForColumn(column),
            row;

        row = view.getNode(record);
        return Ext.fly(row).down(column.getCellSelector());
    },

    getRecord: function(node){
        var result = this.lockedView.getRecord(node);
        if (!node) {
            result = this.normalView.getRecord(node);
        }
        return result;
    },

    addElListener: function(eventName, fn, scope){
        this.relayFn('addElListener', arguments);
    },

    refreshNode: function(){
        this.relayFn('refreshNode', arguments);
    },

    refresh: function(){
        this.relayFn('refresh', arguments);
    },

    bindStore: function(){
        this.relayFn('bindStore', arguments);
    },

    addRowCls: function(){
        this.relayFn('addRowCls', arguments);
    },

    removeRowCls: function(){
        this.relayFn('removeRowCls', arguments);
    }

});
/**
 * Implements infinite scrolling of a grid, allowing users can scroll
 * through thousands of records without the performance penalties of
 * renderering all the records on screen at once. The grid should be
 * bound to a *buffered* store with a pageSize specified.
 *
 * The number of rows rendered outside the visible area, and the
 * buffering of pages of data from the remote server for immediate
 * rendering upon scroll can be controlled by configuring the
 * {@link Ext.grid.PagingScroller #verticalScroller}.
 *
 * You can tell it to create a larger table to provide more scrolling
 * before a refresh is needed, and also to keep more pages of records
 * in memory for faster refreshing when scrolling.
 *
 *     var myStore = Ext.create('Ext.data.Store', {
 *         // ...
 *         buffered: true,
 *         pageSize: 100,
 *         // ...
 *     });
 *
 *     var grid = Ext.create('Ext.grid.Panel', {
 *         // ...
 *         autoLoad: true,
 *         verticalScroller: {
 *             trailingBufferZone: 200,  // Keep 200 records buffered in memory behind scroll
 *             leadingBufferZone: 5000   // Keep 5000 records buffered in memory ahead of scroll
 *         },
 *         // ...
 *     });
 *
 * ## Implementation notes
 *
 * This class monitors scrolling of the {@link Ext.view.Table
 * TableView} within a {@link Ext.grid.Panel GridPanel} which is using
 * a buffered store to only cache and render a small section of a very
 * large dataset.
 *
 * **NB!** The GridPanel will instantiate this to perform monitoring,
 * this class should never be instantiated by user code.  Always use the
 * {@link Ext.panel.Table#verticalScroller verticalScroller} config.
 *
 */
Ext.define('Ext.grid.PagingScroller', {

    /**
     * @cfg
     * @deprecated This config is now ignored.
     */
    percentageFromEdge: 0.35,

    /**
     * @cfg
     * The zone which causes a refresh of the rendered viewport. As soon as the edge
     * of the rendered grid is this number of rows from the edge of the viewport, the view is moved.
     */
    numFromEdge: 2,

    /**
     * @cfg
     * The number of extra rows to render on the trailing side of scrolling
     * **outside the {@link #numFromEdge}** buffer as scrolling proceeds.
     */
    trailingBufferZone: 5,

    /**
     * @cfg
     * The number of extra rows to render on the leading side of scrolling
     * **outside the {@link #numFromEdge}** buffer as scrolling proceeds.
     */
    leadingBufferZone: 15,

    /**
     * @cfg
     * This is the time in milliseconds to buffer load requests when scrolling the PagingScrollbar.
     */
    scrollToLoadBuffer: 200,

    // private. Initial value of zero.
    viewSize: 0,
    // private. Start at default value
    rowHeight: 21,
    // private. Table extent at startup time
    tableStart: 0,
    tableEnd: 0,

    constructor: function(config) {
        var me = this;
        me.variableRowHeight = config.variableRowHeight;
        me.bindView(config.view);
        Ext.apply(me, config);
        me.callParent(arguments);
    },

    bindView: function(view) {
        var me = this,
            viewListeners = {
                scroll: {
                    fn: me.onViewScroll,
                    element: 'el',
                    scope: me
                },
                render: me.onViewRender,
                resize: me.onViewResize,
                boxready: {
                    fn: me.onViewResize,
                    scope: me,
                    single: true
                },

                // If there are variable row heights, then in beforeRefresh, we have to find a common
                // row so that we can synchronize the table's top position after the refresh.
                // Also flag whether the grid view has focus so that it can be refocused after refresh.
                beforerefresh: me.beforeViewRefresh,

                refresh: me.onViewRefresh,
                scope: me
            },
            storeListeners = {
                guaranteedrange: me.onGuaranteedRange,
                scope: me
            },
            gridListeners = {
                reconfigure: me.onGridReconfigure,
                scope: me
            }, partner;

        // If we need unbinding...
        if (me.view) {
            if (me.view.el) {
                me.view.el.un('scroll', me.onViewScroll, me); // un does not understand the element options
            }
            
            partner = view.lockingPartner;
            if (partner) {
                partner.un('refresh', me.onLockRefresh, me);
            }
            
            me.view.un(viewListeners);
            me.store.un(storeListeners);
            if (me.grid) {
                me.grid.un(gridListeners);
            }
            delete me.view.refreshSize; // Remove the injected refreshSize implementation
        }

        me.view = view;
        me.grid = me.view.up('tablepanel');
        me.store = view.store;
        if (view.rendered) {
            me.viewSize = me.store.viewSize = Math.ceil(view.getHeight() / me.rowHeight) + me.trailingBufferZone + (me.numFromEdge * 2) + me.leadingBufferZone;
        }
        
        partner = view.lockingPartner;
        if (partner) {
            partner.on('refresh', me.onLockRefresh, me);
        }

        me.view.mon(me.store.pageMap, {
            scope: me,
            clear: me.onCacheClear
        });

        // During scrolling we do not need to refresh the height - the Grid height must be set by config or layout in order to create a scrollable
        // table just larger than that, so removing the layout call improves efficiency and removes the flicker when the
        // HeaderContainer is reset to scrollLeft:0, and then resynced on the very next "scroll" event.
        me.view.refreshSize = Ext.Function.createInterceptor(me.view.refreshSize, me.beforeViewrefreshSize, me);

        /**
         * @property {Number} position
         * Current pixel scroll position of the associated {@link Ext.view.Table View}.
         */
        me.position = 0;

        // We are created in View constructor. There won't be an ownerCt at this time.
        if (me.grid) {
            me.grid.on(gridListeners);
        } else {
            me.view.on({
                added: function() {
                    me.grid = me.view.up('tablepanel');
                    me.grid.on(gridListeners);
                },
                single: true
            });
        }

        me.view.on(me.viewListeners = viewListeners);
        me.store.on(storeListeners);
    },

    onCacheClear: function() {
        var me = this;

        // Do not do anything if view is not rendered, or if the reason for cache clearing is store destruction
        if (me.view.rendered && !me.store.isDestroyed) {
            // Temporarily disable scroll monitoring until the scroll event caused by any following *change* of scrollTop has fired.
            // Otherwise it will attempt to process a scroll on a stale view
            me.ignoreNextScrollEvent = me.view.el.dom.scrollTop !== 0;

            me.view.el.dom.scrollTop = 0;
            delete me.lastScrollDirection;
            delete me.scrollOffset;
            delete me.scrollProportion;
        }
    },

    onGridReconfigure: function (grid) {
        this.bindView(grid.view);
    },

    // Ensure that the stretcher element is inserted into the View as the first element.
    onViewRender: function() {
        var me = this,
            view = me.view,
            el = me.view.el,
            stretcher;

        me.stretcher = me.createStretcher(view);
        
        view = view.lockingPartner;
        if (view) {
            stretcher = me.stretcher;
            me.stretcher = new Ext.CompositeElement(stretcher);
            me.stretcher.add(me.createStretcher(view));
        }
    },
    
    createStretcher: function(view) {
        var el = view.el;
        el.setStyle('position', 'relative');
        
        return el.createChild({
            style:{
                position: 'absolute',
                width: '1px',
                height: 0,
                top: 0,
                left: 0
            }
        }, el.dom.firstChild);
    },
    
    onViewResize: function(view, width, height) {
        var me = this,
            newViewSize;

        newViewSize = Math.ceil(height / me.rowHeight) + me.trailingBufferZone + (me.numFromEdge * 2) + me.leadingBufferZone;
        if (newViewSize > me.viewSize) {
            me.viewSize = me.store.viewSize = newViewSize;
            me.handleViewScroll(me.lastScrollDirection || 1);
        }
    },

    // Used for variable row heights. Try to find the offset from scrollTop of a common row
    beforeViewRefresh: function() {
        var me = this,
            view = me.view,
            rows,
            direction;

        // Refreshing can cause loss of focus.
        me.focusOnRefresh = Ext.Element.getActiveElement === view.el.dom;

        // Only need all this is variableRowHeight
        if (me.variableRowHeight) {
            direction = me.lastScrollDirection;
            me.commonRecordIndex = undefined;
            // If we are refreshing in response to a scroll,
            // And we know where the previous start was,
            // and we're not teleporting out of visible range
            // and the view is not empty
            if (direction && (me.previousStart !== undefined) && (me.scrollProportion === undefined) && (rows = view.getNodes()).length) {

                // We have scrolled downwards
                if (direction === 1) {

                    // If the ranges overlap, we are going to be able to position the table exactly
                    if (me.tableStart <= me.previousEnd) {
                        me.commonRecordIndex = rows.length - 1;

                    }
                }
                // We have scrolled upwards
                else if (direction === -1) {

                    // If the ranges overlap, we are going to be able to position the table exactly
                    if (me.tableEnd >= me.previousStart) {
                        me.commonRecordIndex = 0;
                    }
                }
                // Cache the old offset of the common row from the scrollTop
                me.scrollOffset = -view.el.getOffsetsTo(rows[me.commonRecordIndex])[1];

                // In the new table the common row is at a different index
                me.commonRecordIndex -= (me.tableStart - me.previousStart);
            } else {
                me.scrollOffset = undefined;
            }
        }
    },

    onLockRefresh: function(view) {
        view.table.dom.style.position = 'absolute';
    },

    // Used for variable row heights. Try to find the offset from scrollTop of a common row
    // Ensure, upon each refresh, that the stretcher element is the correct height
    onViewRefresh: function() {
        var me = this,
            store = me.store,
            newScrollHeight,
            view = me.view,
            viewEl = view.el,
            viewDom = viewEl.dom,
            rows,
            newScrollOffset,
            scrollDelta,
            table = view.table.dom,
            tableTop,
            scrollTop;

        // Refresh causes loss of focus
        if (me.focusOnRefresh) {
            viewEl.focus();
            me.focusOnRefresh = false;
        }

        // Scroll events caused by processing in here must be ignored, so disable for the duration
        me.disabled = true;

        // No scroll monitoring is needed if
        //    All data is in view OR
        //  Store is filtered locally.
        //    - scrolling a locally filtered page is obv a local operation within the context of a huge set of pages 
        //      so local scrolling is appropriate.
        if (store.getCount() === store.getTotalCount() || (store.isFiltered() && !store.remoteFilter)) {
            me.stretcher.setHeight(0);
            me.position = viewDom.scrollTop = 0;

            // Chrome's scrolling went crazy upon zeroing of the stretcher, and left the view's scrollTop stuck at -15
            // This is the only thing that fixes that
            me.setTablePosition('absolute');

            // We remain disabled now because no scrolling is needed - we have the full dataset in the Store
            return;
        }

        me.stretcher.setHeight(newScrollHeight = me.getScrollHeight());

        scrollTop = viewDom.scrollTop;

        // Flag to the refreshSize interceptor that regular refreshSize postprocessing should be vetoed.
        me.isScrollRefresh = (scrollTop > 0);

        // If we have had to calculate the store position from the pure scroll bar position,
        // then we must calculate the table's vertical position from the scrollProportion
        if (me.scrollProportion !== undefined) {
            me.setTablePosition('absolute');
            me.setTableTop((me.scrollProportion ? (newScrollHeight * me.scrollProportion) - (table.offsetHeight * me.scrollProportion) : 0) + 'px');
        } else {
            me.setTablePosition('absolute');
            me.setTableTop((tableTop = (me.tableStart||0) * me.rowHeight) + 'px');

            // ScrollOffset to a common row was calculated in beforeViewRefresh, so we can synch table position with how it was before
            if (me.scrollOffset) {
                rows = view.getNodes();
                newScrollOffset = -viewEl.getOffsetsTo(rows[me.commonRecordIndex])[1];
                scrollDelta = newScrollOffset - me.scrollOffset;
                me.position = (viewDom.scrollTop += scrollDelta);
            }

            // If the table is not fully in view view, scroll to where it is in view.
            // This will happen when the page goes out of view unexpectedly, outside the
            // control of the PagingScroller. For example, a refresh caused by a remote sort or filter reverting
            // back to page 1.
            // Note that with buffered Stores, only remote sorting is allowed, otherwise the locally
            // sorted page will be out of order with the whole dataset.
            else if ((tableTop > scrollTop) || ((tableTop + table.offsetHeight) < scrollTop + viewDom.clientHeight)) {
                me.lastScrollDirection = -1;
                me.position = viewDom.scrollTop = tableTop;
            }
        }

        // Re-enable upon function exit
        me.disabled = false;
    },
    
    setTablePosition: function(position) {
        this.setViewTableStyle(this.view, 'position', position);
    },
    
    setTableTop: function(top){
        this.setViewTableStyle(this.view, 'top', top);
    },
    
    setViewTableStyle: function(view, prop, value) {
        view.el.child('table', true).style[prop] = value;
        view = view.lockingPartner;
        
        if (view) {
            view.el.child('table', true).style[prop] = value;
        }
    },

    beforeViewrefreshSize: function() {
        // Veto the refreshSize if the refresh is due to a scroll.
        if (this.isScrollRefresh) {
            // If we're vetoing refreshSize, attach the table DOM to the View's Flyweight.
            this.view.table.attach(this.view.el.child('table', true));
            return (this.isScrollRefresh = false);
        }
    },

    onGuaranteedRange: function(range, start, end) {
        var me = this,
            ds = me.store;

        // this should never happen
        if (range.length && me.visibleStart < range[0].index) {
            return;
        }

        // Cache last table position in dataset so that if we are using variableRowHeight,
        // we can attempt to locate a common row to align the table on.
        me.previousStart = me.tableStart;
        me.previousEnd = me.tableEnd;

        me.tableStart = start;
        me.tableEnd = end;
        ds.loadRecords(range, {
            start: start
        });
    },

    onViewScroll: function(e, t) {
        var me = this,
            view = me.view,
            lastPosition = me.position;

        me.position = view.el.dom.scrollTop;

        // Flag set when the scrollTop is programatically set to zero upon cache clear.
        // We must not attempt to process that as a scroll event.
        if (me.ignoreNextScrollEvent) {
            me.ignoreNextScrollEvent = false;
            return;
        }

        // Only check for nearing the edge if we are enabled.
        // If there is no paging to be done (Store's dataset is all in memory) we will be disabled.
        if (!me.disabled) {
            me.lastScrollDirection = me.position > lastPosition ? 1 : -1;
            // Check the position so we ignore horizontal scrolling
            if (lastPosition !== me.position) {
                me.handleViewScroll(me.lastScrollDirection);
            }
        }
    },

    handleViewScroll: function(direction) {
        var me                = this,
            store             = me.store,
            view              = me.view,
            viewSize          = me.viewSize,
            totalCount        = store.getTotalCount(),
            highestStartPoint = totalCount - viewSize,
            visibleStart      = me.getFirstVisibleRowIndex(),
            visibleEnd        = me.getLastVisibleRowIndex(),
            el                = view.el.dom,
            requestStart,
            requestEnd;

        // Only process if the total rows is larger than the visible page size
        if (totalCount >= viewSize) {

            // This is only set if we are using variable row height, and the thumb is dragged so that
            // There are no remaining visible rows to vertically anchor the new table to.
            // In this case we use the scrollProprtion to anchor the table to the correct relative
            // position on the vertical axis.
            me.scrollProportion = undefined;

            // We're scrolling up
            if (direction == -1) {

                // If table starts at record zero, we have nothing to do
                if (me.tableStart) {
                    if (visibleStart !== undefined) {
                        if (visibleStart < (me.tableStart + me.numFromEdge)) {
                            requestStart = Math.max(0, visibleEnd + me.trailingBufferZone - viewSize);
                        }
                    }

                    // The only way we can end up without a visible start is if, in variableRowHeight mode, the user drags
                    // the thumb up out of the visible range. In this case, we have to estimate the start row index
                    else {
                        // If we have no visible rows to orientate with, then use the scroll proportion
                        me.scrollProportion = el.scrollTop / (el.scrollHeight - el.clientHeight);
                        requestStart = Math.max(0, totalCount * me.scrollProportion - (viewSize / 2) - me.numFromEdge - ((me.leadingBufferZone + me.trailingBufferZone) / 2));
                    }
                }
            }
            // We're scrolling down
            else {
                if (visibleStart !== undefined) {
                    if (visibleEnd > (me.tableEnd - me.numFromEdge)) {
                        requestStart = Math.max(0, visibleStart - me.trailingBufferZone);
                    }
                }

                // The only way we can end up without a visible end is if, in variableRowHeight mode, the user drags
                // the thumb down out of the visible range. In this case, we have to estimate the start row index
                else {
                    // If we have no visible rows to orientate with, then use the scroll proportion
                    me.scrollProportion = el.scrollTop / (el.scrollHeight - el.clientHeight);
                    requestStart = totalCount * me.scrollProportion - (viewSize / 2) - me.numFromEdge - ((me.leadingBufferZone + me.trailingBufferZone) / 2);
                }
            }

            // We scrolled close to the edge and the Store needs reloading
            if (requestStart !== undefined) {
                // The calculation walked off the end; Request the highest possible chunk which starts on an even row count (Because of row striping)
                if (requestStart > highestStartPoint) {
                    requestStart = highestStartPoint & ~1;
                    requestEnd = totalCount - 1;
                }
                // Make sure first row is even to ensure correct even/odd row striping
                else {
                    requestStart = requestStart & ~1;
                    requestEnd = requestStart + viewSize - 1;
                }

                // If range is satsfied within the prefetch buffer, then just draw it from the prefetch buffer
                if (store.rangeCached(requestStart, requestEnd)) {
                    me.cancelLoad();
                    store.guaranteeRange(requestStart, requestEnd);
                }

                // Required range is not in the prefetch buffer. Ask the store to prefetch it.
                // We will recieve a guaranteedrange event when that is done.
                else {
                    me.attemptLoad(requestStart, requestEnd);
                }
            }
        }
    },

    getFirstVisibleRowIndex: function() {
        var me = this,
            view = me.view,
            scrollTop = view.el.dom.scrollTop,
            rows,
            count,
            i,
            rowBottom;

        if (me.variableRowHeight) {
            rows = view.getNodes();
            count = rows.length;
            if (!count) {
                return;
            }
            rowBottom = Ext.fly(rows[0]).getOffsetsTo(view.el)[1];
            for (i = 0; i < count; i++) {
                rowBottom += rows[i].offsetHeight;

                // Searching for the first visible row, and off the bottom of the clientArea, then there's no visible first row!
                if (rowBottom > view.el.dom.clientHeight) {
                    return;
                }

                // Return the index *within the total dataset* of the first visible row
                // We cannot use the loop index to offset from the table's start index because of possible intervening group headers.
                if (rowBottom > 0) {
                    return view.getRecord(rows[i]).index;
                }
            }
        } else {
            return Math.floor(scrollTop / me.rowHeight);
        }
    },

    getLastVisibleRowIndex: function() {
        var me = this,
            store = me.store,
            view = me.view,
            clientHeight = view.el.dom.clientHeight,
            rows,
            count,
            i,
            rowTop;

        if (me.variableRowHeight) {
            rows = view.getNodes();
            if (!rows.length) {
                return;
            }
            count = store.getCount() - 1;
            rowTop = Ext.fly(rows[count]).getOffsetsTo(view.el)[1] + rows[count].offsetHeight;
            for (i = count; i >= 0; i--) {
                rowTop -= rows[i].offsetHeight;

                // Searching for the last visible row, and off the top of the clientArea, then there's no visible last row!
                if (rowTop < 0) {
                    return;
                }

                // Return the index *within the total dataset* of the last visible row.
                // We cannot use the loop index to offset from the table's start index because of possible intervening group headers.
                if (rowTop < clientHeight) {
                    return view.getRecord(rows[i]).index;
                }
            }
        } else {
            return me.getFirstVisibleRowIndex() + Math.ceil(clientHeight / me.rowHeight) + 1;
        }
    },

    getScrollHeight: function() {
        var me = this,
            view   = me.view,
            table,
            firstRow,
            store  = me.store,
            deltaHeight = 0,
            doCalcHeight = !me.hasOwnProperty('rowHeight');

        if (me.variableRowHeight) {
            table = me.view.table.dom;
            if (doCalcHeight) {
                me.initialTableHeight = table.offsetHeight;
                me.rowHeight = me.initialTableHeight / me.store.getCount();
            } else {
                deltaHeight = table.offsetHeight - me.initialTableHeight;

                // Store size has been bumped because of odd end row.
                if (store.getCount() > me.viewSize) {
                    deltaHeight -= me.rowHeight;
                }
            }
        } else if (doCalcHeight) {
            firstRow = view.el.down(view.getItemSelector());
            if (firstRow) {
                me.rowHeight = firstRow.getHeight(false, true);
            }
        }

        return Math.floor(store.getTotalCount() * me.rowHeight) + deltaHeight;
    },

    attemptLoad: function(start, end) {
        var me = this;
        if (me.scrollToLoadBuffer) {
            if (!me.loadTask) {
                me.loadTask = new Ext.util.DelayedTask(me.doAttemptLoad, me, []);
            }
            me.loadTask.delay(me.scrollToLoadBuffer, me.doAttemptLoad, me, [start, end]);
        } else {
            me.store.guaranteeRange(start, end);
        }
    },

    cancelLoad: function() {
        if (this.loadTask) {
            this.loadTask.cancel();
        }
    },

    doAttemptLoad:  function(start, end) {
        this.store.guaranteeRange(start, end);
    },

    destroy: function() {
        var me = this,
            scrollListener = me.viewListeners.scroll;

        me.store.un({
            guaranteedrange: me.onGuaranteedRange,
            scope: me
        });
        me.view.un(me.viewListeners);
        if (me.view.rendered) {
            me.stretcher.remove();
            me.view.el.un('scroll', scrollListener.fn, scrollListener.scope);
        }
    }
});

Ext.define('Ext.grid.Scroller', {
    constructor: Ext.deprecated()
});

/**
 * A feature is a type of plugin that is specific to the {@link Ext.grid.Panel}. It provides several
 * hooks that allows the developer to inject additional functionality at certain points throughout the 
 * grid creation cycle. This class provides the base template methods that are available to the developer,
 * it should be extended.
 * 
 * There are several built in features that extend this class, for example:
 *
 *  - {@link Ext.grid.feature.Grouping} - Shows grid rows in groups as specified by the {@link Ext.data.Store}
 *  - {@link Ext.grid.feature.RowBody} - Adds a body section for each grid row that can contain markup.
 *  - {@link Ext.grid.feature.Summary} - Adds a summary row at the bottom of the grid with aggregate totals for a column.
 * 
 * ## Using Features
 * A feature is added to the grid by specifying it an array of features in the configuration:
 * 
 *     var groupingFeature = Ext.create('Ext.grid.feature.Grouping');
 *     Ext.create('Ext.grid.Panel', {
 *         // other options
 *         features: [groupingFeature]
 *     });
 * 
 * @abstract
 */
Ext.define('Ext.grid.feature.Feature', {
    extend: 'Ext.util.Observable',
    alias: 'feature.feature',

    /*
     * @property {Boolean} isFeature
     * `true` in this class to identify an object as an instantiated Feature, or subclass thereof.
     */
    isFeature: true,

    /**
     * True when feature is disabled.
     */
    disabled: false,

    /**
     * @property {Boolean}
     * Most features will expose additional events, some may not and will
     * need to change this to false.
     */
    hasFeatureEvent: true,

    /**
     * @property {String}
     * Prefix to use when firing events on the view.
     * For example a prefix of group would expose "groupclick", "groupcontextmenu", "groupdblclick".
     */
    eventPrefix: null,

    /**
     * @property {String}
     * Selector used to determine when to fire the event with the eventPrefix.
     */
    eventSelector: null,

    /**
     * @property {Ext.view.Table}
     * Reference to the TableView.
     */
    view: null,

    /**
     * @property {Ext.grid.Panel}
     * Reference to the grid panel
     */
    grid: null,

    /**
     * Most features will not modify the data returned to the view.
     * This is limited to one feature that manipulates the data per grid view.
     */
    collectData: false,
    
    constructor: function(config) {
        this.initialConfig = config;
        this.callParent(arguments);
    },

    clone: function() {
        return new this.self(this.initialConfig);
    },

    init: Ext.emptyFn,

    getFeatureTpl: function() {
        return '';
    },

    /**
     * Abstract method to be overriden when a feature should add additional
     * arguments to its event signature. By default the event will fire:
     *
     * - view - The underlying Ext.view.Table
     * - featureTarget - The matched element by the defined {@link #eventSelector}
     *
     * The method must also return the eventName as the first index of the array
     * to be passed to fireEvent.
     * @template
     */
    getFireEventArgs: function(eventName, view, featureTarget, e) {
        return [eventName, view, featureTarget, e];
    },

    /**
     * Approriate place to attach events to the view, selectionmodel, headerCt, etc
     * @template
     */
    attachEvents: function() {

    },

    getFragmentTpl: Ext.emptyFn,

    /**
     * Allows a feature to mutate the metaRowTpl.
     * The array received as a single argument can be manipulated to add things
     * on the end/begining of a particular row.
     * @param {Array} metaRowTplArray A String array to be used constructing an {@link Ext.XTemplate XTemplate}
     * to render the rows. This Array may be changed to provide extra DOM structure.
     * @template
     */
    mutateMetaRowTpl: Ext.emptyFn,

    /**
     * Allows a feature to inject member methods into the metaRowTpl. This is
     * important for embedding functionality which will become part of the proper
     * row tpl.
     * @template
     */
    getMetaRowTplFragments: function() {
        return {};
    },

    getTableFragments: function() {
        return {};
    },

    /**
     * Provide additional data to the prepareData call within the grid view.
     * @param {Object} data The data for this particular record.
     * @param {Number} idx The row index for this record.
     * @param {Ext.data.Model} record The record instance
     * @param {Object} orig The original result from the prepareData call to massage.
     * @template
     */
    getAdditionalData: function(data, idx, record, orig) {
        return {};
    },

    /**
     * Enables the feature.
     */
    enable: function() {
        this.disabled = false;
    },

    /**
     * Disables the feature.
     */
    disable: function() {
        this.disabled = true;
    }

});
/**
 * This feature allows to display the grid rows aggregated into groups as specified by the {@link Ext.data.Store#groupers}
 * specified on the Store. The group will show the title for the group name and then the appropriate records for the group
 * underneath. The groups can also be expanded and collapsed.
 * 
 * ## Extra Events
 *
 * This feature adds several extra events that will be fired on the grid to interact with the groups:
 *
 *  - {@link #groupclick}
 *  - {@link #groupdblclick}
 *  - {@link #groupcontextmenu}
 *  - {@link #groupexpand}
 *  - {@link #groupcollapse}
 * 
 * ## Menu Augmentation
 *
 * This feature adds extra options to the grid column menu to provide the user with functionality to modify the grouping.
 * This can be disabled by setting the {@link #enableGroupingMenu} option. The option to disallow grouping from being turned off
 * by the user is {@link #enableNoGroups}.
 * 
 * ## Controlling Group Text
 *
 * The {@link #groupHeaderTpl} is used to control the rendered title for each group. It can modified to customized
 * the default display.
 * 
 * ## Example Usage
 * 
 *     @example
 *     var store = Ext.create('Ext.data.Store', {
 *         storeId:'employeeStore',
 *         fields:['name', 'seniority', 'department'],
 *         groupField: 'department',
 *         data: {'employees':[
 *             { "name": "Michael Scott",  "seniority": 7, "department": "Management" },
 *             { "name": "Dwight Schrute", "seniority": 2, "department": "Sales" },
 *             { "name": "Jim Halpert",    "seniority": 3, "department": "Sales" },
 *             { "name": "Kevin Malone",   "seniority": 4, "department": "Accounting" },
 *             { "name": "Angela Martin",  "seniority": 5, "department": "Accounting" }
 *         ]},
 *         proxy: {
 *             type: 'memory',
 *             reader: {
 *                 type: 'json',
 *                 root: 'employees'
 *             }
 *         }
 *     });
 *
 *     Ext.create('Ext.grid.Panel', {
 *         title: 'Employees',
 *         store: Ext.data.StoreManager.lookup('employeeStore'),
 *         columns: [
 *             { text: 'Name',     dataIndex: 'name' },
 *             { text: 'Seniority', dataIndex: 'seniority' }
 *         ],
 *         features: [{ftype:'grouping'}],
 *         width: 200,
 *         height: 275,
 *         renderTo: Ext.getBody()
 *     });
 *
 * **Note:** To use grouping with a grid that has {@link Ext.grid.column.Column#locked locked columns}, you need to supply
 * the grouping feature as a config object - so the grid can create two instances of the grouping feature.
 *
 * @author Nicolas Ferrero
 */
Ext.define('Ext.grid.feature.Grouping', {
    extend: 'Ext.grid.feature.Feature',
    alias: 'feature.grouping',

    eventPrefix: 'group',
    eventSelector: '.' + Ext.baseCSSPrefix + 'grid-group-hd',
    bodySelector: '.' + Ext.baseCSSPrefix + 'grid-group-body',

    constructor: function() {
        var me = this;

        me.collapsedState = {};
        me.callParent(arguments);
    },
    
    /**
     * @event groupclick
     * @param {Ext.view.Table} view
     * @param {HTMLElement} node
     * @param {String} group The name of the group
     * @param {Ext.EventObject} e
     */

    /**
     * @event groupdblclick
     * @param {Ext.view.Table} view
     * @param {HTMLElement} node
     * @param {String} group The name of the group
     * @param {Ext.EventObject} e
     */

    /**
     * @event groupcontextmenu
     * @param {Ext.view.Table} view
     * @param {HTMLElement} node
     * @param {String} group The name of the group
     * @param {Ext.EventObject} e
     */

    /**
     * @event groupcollapse
     * @param {Ext.view.Table} view
     * @param {HTMLElement} node
     * @param {String} group The name of the group
     */

    /**
     * @event groupexpand
     * @param {Ext.view.Table} view
     * @param {HTMLElement} node
     * @param {String} group The name of the group
     */

    /**
     * @cfg {String/Array/Ext.Template} groupHeaderTpl
     * A string Template snippet, an array of strings (optionally followed by an object containing Template methods) to be used to construct a Template, or a Template instance.
     * 
     * - Example 1 (Template snippet):
     * 
     *       groupHeaderTpl: 'Group: {name}'
     *     
     * - Example 2 (Array):
     * 
     *       groupHeaderTpl: [
     *           'Group: ',
     *           '<div>{name:this.formatName}</div>',
     *           {
     *               formatName: function(name) {
     *                   return Ext.String.trim(name);
     *               }
     *           }
     *       ]
     *     
     * - Example 3 (Template Instance):
     * 
     *       groupHeaderTpl: Ext.create('Ext.XTemplate',
     *           'Group: ',
     *           '<div>{name:this.formatName}</div>',
     *           {
     *               formatName: function(name) {
     *                   return Ext.String.trim(name);
     *               }
     *           }
     *       )
     *
     * @cfg {String}           groupHeaderTpl.groupField         The field name being grouped by.
     * @cfg {String}           groupHeaderTpl.columnName         The column header associated with the field being grouped by *if there is a column for the field*, falls back to the groupField name.
     * @cfg {Mixed}            groupHeaderTpl.groupValue         The value of the {@link Ext.data.Store#groupField groupField} for the group header being rendered.
     * @cfg {String}           groupHeaderTpl.renderedGroupValue The rendered value of the {@link Ext.data.Store#groupField groupField} for the group header being rendered, as produced by the column renderer.
     * @cfg {String}           groupHeaderTpl.name               An alias for renderedGroupValue
     * @cfg {Object[]}         groupHeaderTpl.rows               An array of child row data objects as returned by the View's {@link Ext.view.AbstractView#prepareData prepareData} method.
     * @cfg {Ext.data.Model[]} groupHeaderTpl.children           An array containing the child records for the group being rendered.
     */
    groupHeaderTpl: '{columnName}: {name}',
    
    /**
     * @cfg {Number} [depthToIndent=17]
     * Number of pixels to indent per grouping level
     */
    depthToIndent: 17,

    collapsedCls: Ext.baseCSSPrefix + 'grid-group-collapsed',
    hdCollapsedCls: Ext.baseCSSPrefix + 'grid-group-hd-collapsed',
    hdCollapsibleCls: Ext.baseCSSPrefix + 'grid-group-hd-collapsible',

    //<locale>
    /**
     * @cfg {String} [groupByText="Group by this field"]
     * Text displayed in the grid header menu for grouping by header.
     */
    groupByText : 'Group by this field',
    //</locale>
    //<locale>
    /**
     * @cfg {String} [showGroupsText="Show in groups"]
     * Text displayed in the grid header for enabling/disabling grouping.
     */
    showGroupsText : 'Show in groups',
    //</locale>

    /**
     * @cfg {Boolean} [hideGroupedHeader=false]
     * True to hide the header that is currently grouped.
     */
    hideGroupedHeader : false,

    /**
     * @cfg {Boolean} [startCollapsed=false]
     * True to start all groups collapsed.
     */
    startCollapsed : false,

    /**
     * @cfg {Boolean} [enableGroupingMenu=true]
     * True to enable the grouping control in the header menu.
     */
    enableGroupingMenu : true,

    /**
     * @cfg {Boolean} [enableNoGroups=true]
     * True to allow the user to turn off grouping.
     */
    enableNoGroups : true,

    /**
     * @cfg {Boolean} [collapsible=true]
     * Set to `falsee` to disable collapsing groups from the UI.
     * 
     * This is set to `false` when the associated {@link Ext.data.Store store} is 
     * {@link Ext.data.Store#buffered buffered}.
     */
    collapsible: true,

    enable: function() {
        var me    = this,
            view  = me.view,
            store = view.store,
            groupToggleMenuItem;

        me.lastGroupField = me.getGroupField();

        if (me.lastGroupIndex) {
            me.block();
            store.group(me.lastGroupIndex);
            me.unblock();
        }
        me.callParent();
        groupToggleMenuItem = me.view.headerCt.getMenu().down('#groupToggleMenuItem');
        groupToggleMenuItem.setChecked(true, true);
        me.refreshIf();
    },

    disable: function() {
        var me    = this,
            view  = me.view,
            store = view.store,
            remote = store.remoteGroup,
            groupToggleMenuItem,
            lastGroup;

        lastGroup = store.groupers.first();
        if (lastGroup) {
            me.lastGroupIndex = lastGroup.property;
            me.block();
            store.clearGrouping();
            me.unblock();
        }

        me.callParent();
        groupToggleMenuItem = me.view.headerCt.getMenu().down('#groupToggleMenuItem');
        groupToggleMenuItem.setChecked(true, true);
        groupToggleMenuItem.setChecked(false, true);
        me.refreshIf();
    },

    refreshIf: function() {
        var ownerCt = this.grid.ownerCt,
            view = this.view;
            
        if (!view.store.remoteGroup && !this.blockRefresh) {

            // We are one side of a lockable grid, so refresh the locking view
            if (ownerCt && ownerCt.lockable) {
                ownerCt.view.refresh();
            } else {
                view.refresh();
            }
        }
    },

    getFeatureTpl: function(values, parent, x, xcount) {
        return [
            '<tpl if="typeof rows !== \'undefined\'">',
                // group row tpl
                '<tr id="{groupHeaderId}" class="' + Ext.baseCSSPrefix + 'grid-group-hd {hdCollapsedCls} {collapsibleClass}"><td class="' + Ext.baseCSSPrefix + 'grid-cell" colspan="' + parent.columns.length + '" {[this.indentByDepth(values)]}><div class="' + Ext.baseCSSPrefix + 'grid-cell-inner"><div class="' + Ext.baseCSSPrefix + 'grid-group-title">{collapsed}{[this.renderGroupHeaderTpl(values, parent)]}</div></div></td></tr>',
                // this is the rowbody
                '<tr id="{groupBodyId}" class="' + Ext.baseCSSPrefix + 'grid-group-body {collapsedCls}"><td colspan="' + parent.columns.length + '">{[this.recurse(values)]}</td></tr>',
            '</tpl>'
        ].join('');
    },

    getFragmentTpl: function() {
        var me = this;
        return {
            indentByDepth: me.indentByDepth,
            depthToIndent: me.depthToIndent,
            renderGroupHeaderTpl: function(values, parent) {
                return Ext.XTemplate.getTpl(me, 'groupHeaderTpl').apply(values, parent);
            }
        };
    },

    indentByDepth: function(values) {
        return 'style="padding-left:'+ ((values.depth || 0) * this.depthToIndent) + 'px;"';
    },

    // Containers holding these components are responsible for
    // destroying them, we are just deleting references.
    destroy: function() {
        delete this.view;
        delete this.prunedHeader;
    },

    // perhaps rename to afterViewRender
    attachEvents: function() {
        var me = this,
            view = me.view;

        view.on({
            scope: me,
            groupclick: me.onGroupClick,
            rowfocus: me.onRowFocus
        });

        view.mon(view.store, {
            scope: me,
            groupchange: me.onGroupChange,
            remove: me.onRemove,
            add: me.onAdd,
            update: me.onUpdate
        });

        if (me.enableGroupingMenu) {
            me.injectGroupingMenu();
        }

        me.pruneGroupedHeader();

        me.lastGroupField = me.getGroupField();
        me.block();
        me.onGroupChange();
        me.unblock();
    },

    // If we add a new item that doesn't belong to a rendered group, refresh the view
    onAdd: function(store, records){
        var me = this,
            view = me.view,
            groupField = me.getGroupField(),
            i = 0,
            len = records.length,
            activeGroups,
            addedGroups,
            groups,
            needsRefresh,
            group;

        if (view.rendered) {
            addedGroups = {};
            activeGroups = {};

            for (; i < len; ++i) {
                group = records[i].get(groupField);
                if (addedGroups[group] === undefined) {
                    addedGroups[group] = 0;
                }
                addedGroups[group] += 1;
            }
            groups = store.getGroups();
            for (i = 0, len = groups.length; i < len; ++i) {
                group = groups[i];
                activeGroups[group.name] = group.children.length;
            }

            for (group in addedGroups) {
                if (addedGroups[group] === activeGroups[group]) {
                    needsRefresh = true;
                    break;
                }
            }
            
            if (needsRefresh) {
                view.refresh();
            }
        }
    },

    onUpdate: function(store, record, type, changedFields){
        var view = this.view;
        if (view.rendered && !changedFields || Ext.Array.contains(changedFields, this.getGroupField())) {
            view.refresh();
        }
    },

    onRemove: function(store, record) {
        var me = this,
            groupField = me.getGroupField(),
            removedGroup = record.get(groupField),
            view = me.view;

        if (view.rendered) {
            // If that was the last one in the group, force a refresh
            if (store.findExact(groupField, removedGroup) === -1) {
                me.view.refresh(); 
            }
        }
    },

    injectGroupingMenu: function() {
        var me       = this,
            headerCt = me.view.headerCt;

        headerCt.showMenuBy = me.showMenuBy;
        headerCt.getMenuItems = me.getMenuItems();
    },

    showMenuBy: function(t, header) {
        var menu = this.getMenu(),
            groupMenuItem  = menu.down('#groupMenuItem'),
            groupableMth = header.groupable === false ?  'disable' : 'enable';
            
        groupMenuItem[groupableMth]();
        Ext.grid.header.Container.prototype.showMenuBy.apply(this, arguments);
    },

    getMenuItems: function() {
        var me                 = this,
            groupByText        = me.groupByText,
            disabled           = me.disabled || !me.getGroupField(),
            showGroupsText     = me.showGroupsText,
            enableNoGroups     = me.enableNoGroups,
            getMenuItems       = me.view.headerCt.getMenuItems;

        // runs in the scope of headerCt
        return function() {

            // We cannot use the method from HeaderContainer's prototype here
            // because other plugins or features may already have injected an implementation
            var o = getMenuItems.call(this);
            o.push('-', {
                iconCls: Ext.baseCSSPrefix + 'group-by-icon',
                itemId: 'groupMenuItem',
                text: groupByText,
                handler: me.onGroupMenuItemClick,
                scope: me
            });
            if (enableNoGroups) {
                o.push({
                    itemId: 'groupToggleMenuItem',
                    text: showGroupsText,
                    checked: !disabled,
                    checkHandler: me.onGroupToggleMenuItemClick,
                    scope: me
                });
            }
            return o;
        };
    },

    /**
     * Group by the header the user has clicked on.
     * @private
     */
    onGroupMenuItemClick: function(menuItem, e) {
        var me = this,
            menu = menuItem.parentMenu,
            hdr  = menu.activeHeader,
            view = me.view,
            store = view.store;

        delete me.lastGroupIndex;
        me.block();
        me.enable();
        store.group(hdr.dataIndex);
        me.pruneGroupedHeader();
        me.unblock();
        me.refreshIf();
    },

    block: function(){
        this.blockRefresh = this.view.blockRefresh = true;
    },

    unblock: function(){
        this.blockRefresh = this.view.blockRefresh = false;
    },

    /**
     * Turn on and off grouping via the menu
     * @private
     */
    onGroupToggleMenuItemClick: function(menuItem, checked) {
        this[checked ? 'enable' : 'disable']();
    },

    /**
     * Prunes the grouped header from the header container
     * @private
     */
    pruneGroupedHeader: function() {
        var me = this,
            header = me.getGroupedHeader();

        if (me.hideGroupedHeader && header) {
            if (me.prunedHeader) {
                me.prunedHeader.show();
            }
            me.prunedHeader = header;
            header.hide();
        }
    },

    getGroupedHeader: function(){
        var groupField = this.getGroupField(),
            headerCt = this.view.headerCt;

        return groupField ? headerCt.down('[dataIndex=' + groupField + ']') : null;
    },

    getGroupField: function(){
        var group = this.view.store.groupers.first();
        if (group) {
            return group.property;
        }
        return ''; 
    },

    /**
     * When a row gains focus, expand the groups above it
     * @private
     */
    onRowFocus: function(rowIdx) {
        var node    = this.view.getNode(rowIdx),
            groupBd = Ext.fly(node).up('.' + this.collapsedCls);

        if (groupBd) {
            // for multiple level groups, should expand every groupBd
            // above
            this.expand(groupBd);
        }
    },

    /**
     * Returns `true` if the named group is expanded.
     * @param {String} groupName The group name as returned from {@link Ext.data.Store#getGroupString getGroupString}. This is usually the value of
     * the {@link Ext.data.Store#groupField groupField}.
     * @return {Boolean} `true` if the group defined by that value is expanded.
     */
    isExpanded: function(groupName) {
        return (this.collapsedState[groupName] === false);
    },

    /**
     * Expand a group
     * @param {String/Ext.Element} groupName The group name, or the element that contains the group body
     * @param {Boolean} focus Pass `true` to focus the group after expand.
     */
    expand: function(groupName, focus, /*private*/ preventSizeCalculation) {
        var me = this,
            view = me.view,
            groupHeader,
            groupBody,
            lockingPartner = me.lockingPartner;

        // We've been passed the group name
        if (Ext.isString(groupName)) {
            groupBody = Ext.fly(me.getGroupBodyId(groupName), '_grouping');
        }
        // We've been passed an element
        else {
            groupBody = Ext.fly(groupName, '_grouping')
            groupName = me.getGroupName(groupBody);
        }
        groupHeader = Ext.get(me.getGroupHeaderId(groupName));

        // If we are collapsed...
        if (me.collapsedState[groupName]) {
            groupBody.removeCls(me.collapsedCls);
            groupBody.prev().removeCls(me.hdCollapsedCls);

            if (preventSizeCalculation !== true) {
                view.refreshSize();
            }
            view.fireEvent('groupexpand', view, groupHeader, groupName);
            me.collapsedState[groupName] = false;

            // If we are one side of a locking view, the other side has to stay in sync
            if (lockingPartner) {
                lockingPartner.expand(groupName, focus, preventSizeCalculation);
            }
            if (focus) {
                groupBody.scrollIntoView(view.el, null, true);
            }
        }
    },

    /**
     * Expand all groups
     */
    expandAll: function(){
        var me   = this,
            view = me.view,
            els  = view.el.select(me.eventSelector).elements,
            e,
            eLen = els.length;

        for (e = 0; e < eLen; e++) {
            me.expand(Ext.fly(els[e]).next(), false, true);
        }

        view.refreshSize();
    },

    /**
     * Collapse a group
     * @param {String/Ext.Element} groupName The group name, or the element that contains group body
     * @param {Boolean} focus Pass `true` to focus the group after expand.
     */
    collapse: function(groupName, focus, /*private*/ preventSizeCalculation) {
        var me = this,
            view = me.view,
            groupHeader,
            groupBody,
            lockingPartner = me.lockingPartner;

        // We've been passed the group name
        if (Ext.isString(groupName)) {
            groupBody = Ext.fly(me.getGroupBodyId(groupName), '_grouping');
        }
        // We've been passed an element
        else {
            groupBody = Ext.fly(groupName, '_grouping')
            groupName = me.getGroupName(groupBody);
        }
        groupHeader = Ext.get(me.getGroupHeaderId(groupName));
 
        // If we are not collapsed...
        if (!me.collapsedState[groupName]) {
            groupBody.addCls(me.collapsedCls);
            groupBody.prev().addCls(me.hdCollapsedCls);

            if (preventSizeCalculation !== true) {
                view.refreshSize();
            }
            view.fireEvent('groupcollapse', view, groupHeader, groupName);
            me.collapsedState[groupName] = true;

            // If we are one side of a locking view, the other side has to stay in sync
            if (lockingPartner) {
                lockingPartner.collapse(groupName, focus, preventSizeCalculation);
            }
            if (focus) {
                groupHeader.scrollIntoView(view.el, null, true);
            }
        }
    },

    /**
     * Collapse all groups
     */
    collapseAll: function() {
        var me     = this,
            view   = me.view,
            els    = view.el.select(me.eventSelector).elements,
            e,
            eLen   = els.length;

        for (e = 0; e < eLen; e++) {
            me.collapse(Ext.fly(els[e]).next(), false, true);
        }

        view.refreshSize();
    },

    onGroupChange: function(){
        var me = this,
            field = me.getGroupField(),
            menuItem,
            visibleGridColumns,
            groupingByLastVisibleColumn;

        if (me.hideGroupedHeader) {
            if (me.lastGroupField) {
                menuItem = me.getMenuItem(me.lastGroupField);
                if (menuItem) {
                    menuItem.setChecked(true);
                }
            }
            if (field) {
                visibleGridColumns = me.view.headerCt.getVisibleGridColumns();

                // See if we are being asked to group by the sole remaining visible column.
                // If so, then do not hide that column.
                groupingByLastVisibleColumn = ((visibleGridColumns.length === 1) && (visibleGridColumns[0].dataIndex == field));
                menuItem = me.getMenuItem(field);
                if (menuItem && !groupingByLastVisibleColumn) {
                    menuItem.setChecked(false);
                }
            }
        }
        me.refreshIf();
        me.lastGroupField = field;
    },

    /**
     * Gets the related menu item for a dataIndex
     * @private
     * @return {Ext.grid.header.Container} The header
     */
    getMenuItem: function(dataIndex){
        var view = this.view,
            header = view.headerCt.down('gridcolumn[dataIndex=' + dataIndex + ']'),
            menu = view.headerCt.getMenu();

        return header ? menu.down('menuitem[headerId='+ header.id +']') : null;
    },

    /**
     * Toggle between expanded/collapsed state when clicking on
     * the group.
     * @private
     */
    onGroupClick: function(view, rowElement, groupName, e) {
        var me = this;

        if (me.collapsible) {
            if (me.collapsedState[groupName]) {
                me.expand(groupName);
            } else {
                me.collapse(groupName);
            }
        }
    },

    // Injects isRow and closeRow into the metaRowTpl.
    getMetaRowTplFragments: function() {
        return {
            isRow: this.isRow,
            closeRow: this.closeRow
        };
    },

    // injected into rowtpl and wrapped around metaRowTpl
    // becomes part of the standard tpl
    isRow: function() {
        return '<tpl if="typeof rows === \'undefined\'">';
    },

    // injected into rowtpl and wrapped around metaRowTpl
    // becomes part of the standard tpl
    closeRow: function() {
        return '</tpl>';
    },

    // isRow and closeRow are injected via getMetaRowTplFragments
    mutateMetaRowTpl: function(metaRowTpl) {
        metaRowTpl.unshift('{[this.isRow()]}');
        metaRowTpl.push('{[this.closeRow()]}');
    },

    // injects an additional style attribute via tdAttrKey with the proper
    // amount of padding
    getAdditionalData: function(data, idx, record, orig) {
        var view = this.view,
            hCt  = view.headerCt,
            col  = hCt.items.getAt(0),
            o = {},
            tdAttrKey;

        // If there *are* any columne in this grid (possible empty side of a locking grid)...
        // Add the padding-left style to indent the row according to grouping depth.
        // Preserve any current tdAttr that a user may have set.
        if (col) {
            tdAttrKey = col.id + '-tdAttr';
            o[tdAttrKey] = this.indentByDepth(data) + " " + (orig[tdAttrKey] ? orig[tdAttrKey] : '');
            o.collapsed = 'true';
            o.data = record.getData();
        }
        return o;
    },

    // return matching preppedRecords
    getGroupRows: function(group, records, preppedRecords, fullWidth) {
        var me = this,
            children = group.children,
            rows = group.rows = [],
            view = me.view,
            header = me.getGroupedHeader(),
            groupField = me.getGroupField(),
            index = -1,
            r,
            rLen = records.length,
            record;
            
        // Buffered rendering implies that user collapsing is disabled.
        if (view.store.buffered) {
            me.collapsible = false;
        }
            
        group.viewId = view.id;

        for (r = 0; r < rLen; r++) {
            record = records[r];

            if (record.get(groupField) == group.name) {
                index = r;
            }
            if (Ext.Array.indexOf(children, record) != -1) {
                rows.push(Ext.apply(preppedRecords[r], {
                    depth : 1
                }));
            }
        }

        group.groupField = groupField,
        group.groupHeaderId = me.getGroupHeaderId(group.name);
        group.groupBodyId = me.getGroupBodyId(group.name);
        group.fullWidth = fullWidth;
        group.columnName = header ? header.text : groupField;
        group.groupValue = group.name;

        // Here we attempt to overwrite the group name value from the Store with
        // the get the rendered value of the column from the *prepped* record
        if (header && index > -1) {
            group.name = group.renderedValue = preppedRecords[index][header.id];
        }
        if (me.collapsedState[group.name]) {
            group.collapsedCls = me.collapsedCls;
            group.hdCollapsedCls = me.hdCollapsedCls;
        } else {
            group.collapsedCls = group.hdCollapsedCls = '';
        }

        // Collapsibility of groups may be disabled.
        if (me.collapsible) {
            group.collapsibleClass = me.hdCollapsibleCls;
        } else {
            group.collapsibleClass = '';
        }

        return group;
    },

    // Create an associated DOM id for the group's header element given the group name
    getGroupHeaderId: function(groupName) {
        return this.view.id + '-hd-' + groupName;
    },

    // Create an associated DOM id for the group's body element given the group name
    getGroupBodyId: function(groupName) {
        return this.view.id + '-bd-' + groupName;
    },

    // Get the group name from an associated element whether it's within a header or a body
    getGroupName: function(element) {
        var me = this,
            targetEl;
                
        // See if element is, or is within a group header. If so, we can extract its name
        targetEl = Ext.fly(element).findParent(me.eventSelector);
        if (targetEl) {
            return targetEl.id.split(this.view.id + '-hd-')[1];
        }

        // See if element is, or is within a group body. If so, we can extract its name
        targetEl = Ext.fly(element).findParent(me.bodySelector);
        if (targetEl) {
            return targetEl.id.split(this.view.id + '-bd-')[1];
        }
    },

    // return the data in a grouped format.
    collectData: function(records, preppedRecords, startIndex, fullWidth, o) {
        var me    = this,
            store = me.view.store,
            collapsedState = me.collapsedState,
            collapseGroups,
            g,
            groups, gLen, group;

        if (me.startCollapsed) {
            // If we start collapse, we'll set the state of the groups here
            // and unset the flag so any subsequent expand/collapse is
            // managed by the feature
            me.startCollapsed = false;
            collapseGroups = true;
        }

        if (!me.disabled && store.isGrouped()) {
            o.rows = groups = store.getGroups();
            gLen   = groups.length;

            for (g = 0; g < gLen; g++) {
                group = groups[g];
                
                if (collapseGroups) {
                    collapsedState[group.name] = true;
                }

                me.getGroupRows(group, records, preppedRecords, fullWidth);
            }
        }
        return o;
    },

    // adds the groupName to the groupclick, groupdblclick, groupcontextmenu
    // events that are fired on the view. Chose not to return the actual
    // group itself because of its expense and because developers can simply
    // grab the group via store.getGroups(groupName)
    getFireEventArgs: function(type, view, targetEl, e) {
        return [type, view, targetEl, this.getGroupName(targetEl), e];
    }
});

/**
 * The rowbody feature enhances the grid's markup to have an additional
 * tr -> td -> div which spans the entire width of the original row.
 *
 * This is useful to to associate additional information with a particular
 * record in a grid.
 *
 * Rowbodies are initially hidden unless you override getAdditionalData.
 *
 * Will expose additional events on the gridview with the prefix of 'rowbody'.
 * For example: 'rowbodyclick', 'rowbodydblclick', 'rowbodycontextmenu'.
 *
 * # Example
 *
 *     @example
 *     Ext.define('Animal', {
 *         extend: 'Ext.data.Model',
 *         fields: ['name', 'latin', 'desc']
 *     });
 * 
 *     Ext.create('Ext.grid.Panel', {
 *         width: 400,
 *         height: 300,
 *         renderTo: Ext.getBody(),
 *         store: {
 *             model: 'Animal',
 *             data: [
 *                 {name: 'Tiger', latin: 'Panthera tigris',
 *                  desc: 'The largest cat species, weighing up to 306 kg (670 lb).'},
 *                 {name: 'Roman snail', latin: 'Helix pomatia',
 *                  desc: 'A species of large, edible, air-breathing land snail.'},
 *                 {name: 'Yellow-winged darter', latin: 'Sympetrum flaveolum',
 *                  desc: 'A dragonfly found in Europe and mid and Northern China.'},
 *                 {name: 'Superb Fairy-wren', latin: 'Malurus cyaneus',
 *                  desc: 'Common and familiar across south-eastern Australia.'}
 *             ]
 *         },
 *         columns: [{
 *             dataIndex: 'name',
 *             text: 'Common name',
 *             width: 125
 *         }, {
 *             dataIndex: 'latin',
 *             text: 'Scientific name',
 *             flex: 1
 *         }],
 *         features: [{
 *             ftype: 'rowbody',
 *             getAdditionalData: function(data, rowIndex, record, orig) {
 *                 var headerCt = this.view.headerCt,
 *                     colspan = headerCt.getColumnCount();
 *                 // Usually you would style the my-body-class in CSS file
 *                 return {
 *                     rowBody: '<div style="padding: 1em">'+record.get("desc")+'</div>',
 *                     rowBodyCls: "my-body-class",
 *                     rowBodyColspan: colspan
 *                 };
 *             }
 *         }]
 *     });
 */
Ext.define('Ext.grid.feature.RowBody', {
    extend: 'Ext.grid.feature.Feature',
    alias: 'feature.rowbody',
    rowBodyHiddenCls: Ext.baseCSSPrefix + 'grid-row-body-hidden',
    rowBodyTrCls: Ext.baseCSSPrefix + 'grid-rowbody-tr',
    rowBodyTdCls: Ext.baseCSSPrefix + 'grid-cell-rowbody',
    rowBodyDivCls: Ext.baseCSSPrefix + 'grid-rowbody',

    eventPrefix: 'rowbody',
    eventSelector: '.' + Ext.baseCSSPrefix + 'grid-rowbody-tr',
    
    getRowBody: function(values) {
        return [
            '<tr class="' + this.rowBodyTrCls + ' {rowBodyCls}">',
                '<td class="' + this.rowBodyTdCls + '" colspan="{rowBodyColspan}">',
                    '<div class="' + this.rowBodyDivCls + '">{rowBody}</div>',
                '</td>',
            '</tr>'
        ].join('');
    },
    
    // injects getRowBody into the metaRowTpl.
    getMetaRowTplFragments: function() {
        return {
            getRowBody: this.getRowBody,
            rowBodyTrCls: this.rowBodyTrCls,
            rowBodyTdCls: this.rowBodyTdCls,
            rowBodyDivCls: this.rowBodyDivCls
        };
    },

    mutateMetaRowTpl: function(metaRowTpl) {
        metaRowTpl.push('{[this.getRowBody(values)]}');
    },

    /**
     * Provides additional data to the prepareData call within the grid view.
     * The rowbody feature adds 3 additional variables into the grid view's template.
     * These are rowBodyCls, rowBodyColspan, and rowBody.
     * @param {Object} data The data for this particular record.
     * @param {Number} idx The row index for this record.
     * @param {Ext.data.Model} record The record instance
     * @param {Object} orig The original result from the prepareData call to massage.
     */
    getAdditionalData: function(data, idx, record, orig) {
        var headerCt = this.view.headerCt,
            colspan  = headerCt.getColumnCount();

        return {
            rowBody: "",
            rowBodyCls: this.rowBodyCls,
            rowBodyColspan: colspan
        };
    }
});
/**
 * @private
 */
Ext.define('Ext.grid.feature.RowWrap', {
    extend: 'Ext.grid.feature.Feature',
    alias: 'feature.rowwrap',

    // turn off feature events.
    hasFeatureEvent: false,

    init: function() {
        if (!this.disabled) {
            this.enable();
        }
    },

    getRowSelector: function(){
        return 'tr:has(> ' + this.view.cellSelector + ')';
    },

    enable: function(){
        var me = this,
            view = me.view;

        me.callParent();
        // we need to mutate the rowSelector since the template changes the ordering
        me.savedRowSelector = view.rowSelector;
        view.rowSelector = me.getRowSelector();

        // Extra functionality needed on header resize when row is wrapped:
        // Every individual cell in a column needs its width syncing.
        // So we produce a different column selector which includes al TDs in a column
        view.getComponentLayout().getColumnSelector = me.getColumnSelector;
    },

    disable: function(){
        var me = this,
            view = me.view,
            saved = me.savedRowSelector;

        me.callParent();
        if (saved) {
            view.rowSelector = saved;
        }
        delete me.savedRowSelector;
    },

    mutateMetaRowTpl: function(metaRowTpl) {  
        var prefix = Ext.baseCSSPrefix;      
        // Remove "x-grid-row" from the first row, note this could be wrong
        // if some other feature unshifted things in front.
        metaRowTpl[0] = metaRowTpl[0].replace(prefix + 'grid-row', '');
        metaRowTpl[0] = metaRowTpl[0].replace("{[this.embedRowCls()]}", "");
        // 2
        metaRowTpl.unshift('<table class="' + prefix + 'grid-table ' + prefix + 'grid-table-resizer" style="width: {[this.embedFullWidth()]}px;">');
        // 1
        metaRowTpl.unshift('<tr class="' + prefix + 'grid-row {[this.embedRowCls()]}"><td colspan="{[this.embedColSpan()]}"><div class="' + prefix + 'grid-rowwrap-div">');

        // 3
        metaRowTpl.push('</table>');
        // 4
        metaRowTpl.push('</div></td></tr>');
    },

    embedColSpan: function() {
        return '{colspan}';
    },

    embedFullWidth: function() {
        return '{fullWidth}';
    },

    getAdditionalData: function(data, idx, record, orig) {
        var headerCt = this.view.headerCt,
            colspan  = headerCt.getColumnCount(),
            fullWidth = headerCt.getFullWidth(),
            items    = headerCt.query('gridcolumn'),
            itemsLn  = items.length,
            i = 0,
            o = {
                colspan: colspan,
                fullWidth: fullWidth
            },
            id,
            tdClsKey,
            colResizerCls;

        for (; i < itemsLn; i++) {
            id = items[i].id;
            tdClsKey = id + '-tdCls';
            colResizerCls = Ext.baseCSSPrefix + 'grid-col-resizer-'+id;
            // give the inner td's the resizer class
            // while maintaining anything a user may have injected via a custom
            // renderer
            o[tdClsKey] = colResizerCls + " " + (orig[tdClsKey] ? orig[tdClsKey] : '');
            // TODO: Unhackify the initial rendering width's
            o[id+'-tdAttr'] = " style=\"width: " + (items[i].hidden ? 0 : items[i].getDesiredWidth()) + "px;\" "/* + (i === 0 ? " rowspan=\"2\"" : "")*/;
            if (orig[id+'-tdAttr']) {
                o[id+'-tdAttr'] += orig[id+'-tdAttr'];
            }
        }

        return o;
    },

    getMetaRowTplFragments: function() {
        return {
            embedFullWidth: this.embedFullWidth,
            embedColSpan: this.embedColSpan
        };
    },

    getColumnSelector: function(header) {
        var s = Ext.baseCSSPrefix + 'grid-col-resizer-' + header.id;
        return 'th.' + s + ',td.' + s;
    }
});
/**
 * This plugin provides drag and/or drop functionality for a GridView.
 *
 * It creates a specialized instance of {@link Ext.dd.DragZone DragZone} which knows how to drag out of a {@link
 * Ext.grid.View GridView} and loads the data object which is passed to a cooperating {@link Ext.dd.DragZone DragZone}'s
 * methods with the following properties:
 *
 * - `copy` : Boolean
 *
 *   The value of the GridView's `copy` property, or `true` if the GridView was configured with `allowCopy: true` _and_
 *   the control key was pressed when the drag operation was begun.
 *
 * - `view` : GridView
 *
 *   The source GridView from which the drag originated.
 *
 * - `ddel` : HtmlElement
 *
 *   The drag proxy element which moves with the mouse
 *
 * - `item` : HtmlElement
 *
 *   The GridView node upon which the mousedown event was registered.
 *
 * - `records` : Array
 *
 *   An Array of {@link Ext.data.Model Model}s representing the selected data being dragged from the source GridView.
 *
 * It also creates a specialized instance of {@link Ext.dd.DropZone} which cooperates with other DropZones which are
 * members of the same ddGroup which processes such data objects.
 *
 * Adding this plugin to a view means that two new events may be fired from the client GridView, `{@link #beforedrop
 * beforedrop}` and `{@link #drop drop}`
 *
 *     @example
 *     Ext.create('Ext.data.Store', {
 *         storeId:'simpsonsStore',
 *         fields:['name'],
 *         data: [["Lisa"], ["Bart"], ["Homer"], ["Marge"]],
 *         proxy: {
 *             type: 'memory',
 *             reader: 'array'
 *         }
 *     });
 *
 *     Ext.create('Ext.grid.Panel', {
 *         store: 'simpsonsStore',
 *         columns: [
 *             {header: 'Name',  dataIndex: 'name', flex: true}
 *         ],
 *         viewConfig: {
 *             plugins: {
 *                 ptype: 'gridviewdragdrop',
 *                 dragText: 'Drag and drop to reorganize'
 *             }
 *         },
 *         height: 200,
 *         width: 400,
 *         renderTo: Ext.getBody()
 *     });
 */
Ext.define('Ext.grid.plugin.DragDrop', {
    extend: 'Ext.AbstractPlugin',
    alias: 'plugin.gridviewdragdrop',

    uses: [
        'Ext.view.DragZone',
        'Ext.grid.ViewDropZone'
    ],

    /**
     * @event beforedrop
     * **This event is fired through the GridView. Add listeners to the GridView object**
     *
     * Fired when a drop gesture has been triggered by a mouseup event in a valid drop position in the GridView.
     *
     * @param {HTMLElement} node The GridView node **if any** over which the mouse was positioned.
     *
     * Returning `false` to this event signals that the drop gesture was invalid, and if the drag proxy will animate
     * back to the point from which the drag began.
     *
     * Returning `0` To this event signals that the data transfer operation should not take place, but that the gesture
     * was valid, and that the repair operation should not take place.
     *
     * Any other return value continues with the data transfer operation.
     *
     * @param {Object} data The data object gathered at mousedown time by the cooperating {@link Ext.dd.DragZone
     * DragZone}'s {@link Ext.dd.DragZone#getDragData getDragData} method it contains the following properties:
     *
     * - copy : Boolean
     *
     *   The value of the GridView's `copy` property, or `true` if the GridView was configured with `allowCopy: true` and
     *   the control key was pressed when the drag operation was begun
     *
     * - view : GridView
     *
     *   The source GridView from which the drag originated.
     *
     * - ddel : HtmlElement
     *
     *   The drag proxy element which moves with the mouse
     *
     * - item : HtmlElement
     *
     *   The GridView node upon which the mousedown event was registered.
     *
     * - records : Array
     *
     *   An Array of {@link Ext.data.Model Model}s representing the selected data being dragged from the source GridView.
     *
     * @param {Ext.data.Model} overModel The Model over which the drop gesture took place.
     *
     * @param {String} dropPosition `"before"` or `"after"` depending on whether the mouse is above or below the midline
     * of the node.
     *
     * @param {Function} dropFunction
     *
     * A function to call to complete the data transfer operation and either move or copy Model instances from the
     * source View's Store to the destination View's Store.
     *
     * This is useful when you want to perform some kind of asynchronous processing before confirming the drop, such as
     * an {@link Ext.window.MessageBox#confirm confirm} call, or an Ajax request.
     *
     * Return `0` from this event handler, and call the `dropFunction` at any time to perform the data transfer.
     */

    /**
     * @event drop
     * **This event is fired through the GridView. Add listeners to the GridView object** Fired when a drop operation
     * has been completed and the data has been moved or copied.
     *
     * @param {HTMLElement} node The GridView node **if any** over which the mouse was positioned.
     *
     * @param {Object} data The data object gathered at mousedown time by the cooperating {@link Ext.dd.DragZone
     * DragZone}'s {@link Ext.dd.DragZone#getDragData getDragData} method it contains the following properties:
     *
     * - copy : Boolean
     *
     *   The value of the GridView's `copy` property, or `true` if the GridView was configured with `allowCopy: true` and
     *   the control key was pressed when the drag operation was begun
     *
     * - view : GridView
     *
     *   The source GridView from which the drag originated.
     *
     * - ddel : HtmlElement
     *
     *   The drag proxy element which moves with the mouse
     *
     * - item : HtmlElement
     *
     *   The GridView node upon which the mousedown event was registered.
     *
     * - records : Array
     *
     *   An Array of {@link Ext.data.Model Model}s representing the selected data being dragged from the source GridView.
     *
     * @param {Ext.data.Model} overModel The Model over which the drop gesture took place.
     *
     * @param {String} dropPosition `"before"` or `"after"` depending on whether the mouse is above or below the midline
     * of the node.
     */
    //<locale>
    /**
     * @cfg
     * The text to show while dragging.
     *
     * Two placeholders can be used in the text:
     *
     * - `{0}` The number of selected items.
     * - `{1}` 's' when more than 1 items (only useful for English).
     */
    dragText : '{0} selected row{1}',
    //</locale>

    /**
     * @cfg {String} ddGroup
     * A named drag drop group to which this object belongs. If a group is specified, then both the DragZones and
     * DropZone used by this plugin will only interact with other drag drop objects in the same group.
     */
    ddGroup : "GridDD",

    /**
     * @cfg {String} dragGroup
     * The ddGroup to which the DragZone will belong.
     *
     * This defines which other DropZones the DragZone will interact with. Drag/DropZones only interact with other
     * Drag/DropZones which are members of the same ddGroup.
     */

    /**
     * @cfg {String} dropGroup
     * The ddGroup to which the DropZone will belong.
     *
     * This defines which other DragZones the DropZone will interact with. Drag/DropZones only interact with other
     * Drag/DropZones which are members of the same ddGroup.
     */

    /**
     * @cfg {Boolean} enableDrop
     * False to disallow the View from accepting drop gestures.
     */
    enableDrop: true,

    /**
     * @cfg {Boolean} enableDrag
     * False to disallow dragging items from the View.
     */
    enableDrag: true,

    init : function(view) {
        view.on('render', this.onViewRender, this, {single: true});
    },

    /**
     * @private
     * AbstractComponent calls destroy on all its plugins at destroy time.
     */
    destroy: function() {
        Ext.destroy(this.dragZone, this.dropZone);
    },

    enable: function() {
        var me = this;
        if (me.dragZone) {
            me.dragZone.unlock();
        }
        if (me.dropZone) {
            me.dropZone.unlock();
        }
        me.callParent();
    },

    disable: function() {
        var me = this;
        if (me.dragZone) {
            me.dragZone.lock();
        }
        if (me.dropZone) {
            me.dropZone.lock();
        }
        me.callParent();
    },

    onViewRender : function(view) {
        var me = this;

        if (me.enableDrag) {
            me.dragZone = new Ext.view.DragZone({
                view: view,
                ddGroup: me.dragGroup || me.ddGroup,
                dragText: me.dragText
            });
        }

        if (me.enableDrop) {
            me.dropZone = new Ext.grid.ViewDropZone({
                view: view,
                ddGroup: me.dropGroup || me.ddGroup
            });
        }
    }
});
/**
 * Plugin to add header resizing functionality to a HeaderContainer.
 * Always resizing header to the left of the splitter you are resizing.
 */
Ext.define('Ext.grid.plugin.HeaderResizer', {
    extend: 'Ext.AbstractPlugin',
    requires: ['Ext.dd.DragTracker', 'Ext.util.Region'],
    alias: 'plugin.gridheaderresizer',

    disabled: false,

    config: {
        /**
         * @cfg {Boolean} dynamic
         * True to resize on the fly rather than using a proxy marker.
         * @accessor
         */
        dynamic: false
    },

    colHeaderCls: Ext.baseCSSPrefix + 'column-header',

    minColWidth: 40,
    maxColWidth: 1000,
    wResizeCursor: 'col-resize',
    eResizeCursor: 'col-resize',
    // not using w and e resize bc we are only ever resizing one
    // column
    //wResizeCursor: Ext.isWebKit ? 'w-resize' : 'col-resize',
    //eResizeCursor: Ext.isWebKit ? 'e-resize' : 'col-resize',

    init: function(headerCt) {
        this.headerCt = headerCt;
        headerCt.on('render', this.afterHeaderRender, this, {single: true});
    },

    /**
     * @private
     * AbstractComponent calls destroy on all its plugins at destroy time.
     */
    destroy: function() {
        if (this.tracker) {
            this.tracker.destroy();
        }
    },

    afterHeaderRender: function() {
        var headerCt = this.headerCt,
            el = headerCt.el;

        headerCt.mon(el, 'mousemove', this.onHeaderCtMouseMove, this);

        this.tracker = new Ext.dd.DragTracker({
            disabled: this.disabled,
            onBeforeStart: Ext.Function.bind(this.onBeforeStart, this),
            onStart: Ext.Function.bind(this.onStart, this),
            onDrag: Ext.Function.bind(this.onDrag, this),
            onEnd: Ext.Function.bind(this.onEnd, this),
            tolerance: 3,
            autoStart: 300,
            el: el
        });
    },

    // As we mouse over individual headers, change the cursor to indicate
    // that resizing is available, and cache the resize target header for use
    // if/when they mousedown.
    onHeaderCtMouseMove: function(e, t) {
        var me = this,
            prevSiblings,
            headerEl, overHeader, resizeHeader, resizeHeaderOwnerGrid, ownerGrid;

        if (me.headerCt.dragging) {
            if (me.activeHd) {
                me.activeHd.el.dom.style.cursor = '';
                delete me.activeHd;
            }
        } else {
            headerEl = e.getTarget('.' + me.colHeaderCls, 3, true);

            if (headerEl){
                overHeader = Ext.getCmp(headerEl.id);

                // On left edge, go back to the previous non-hidden header.
                if (overHeader.isOnLeftEdge(e)) {
                    resizeHeader = overHeader.previousNode('gridcolumn:not([hidden]):not([isGroupHeader])')
                    // There may not *be* a previous non-hidden header.
                    if (resizeHeader) {

                        ownerGrid = me.headerCt.up('tablepanel');
                        resizeHeaderOwnerGrid = resizeHeader.up('tablepanel');

                        // Need to check that previousNode didn't go outside the current grid/tree
                        // But in the case of a Grid which contains a locked and normal grid, allow previousNode to jump
                        // from the first column of the normalGrid to the last column of the lockedGrid
                        if (!((resizeHeaderOwnerGrid === ownerGrid) || ((ownerGrid.ownerCt.isXType('tablepanel')) && ownerGrid.ownerCt.view.lockedGrid === resizeHeaderOwnerGrid))) {
                            resizeHeader = null;
                        }
                    }
                }
                // Else, if on the right edge, we're resizing the column we are over
                else if (overHeader.isOnRightEdge(e)) {
                    resizeHeader = overHeader;
                }
                // Between the edges: we are not resizing
                else {
                    resizeHeader = null;
                }

                // We *are* resizing
                if (resizeHeader) {
                    // If we're attempting to resize a group header, that cannot be resized,
                    // so find its last visible leaf header; Group headers are sized
                    // by the size of their child headers.
                    if (resizeHeader.isGroupHeader) {
                        prevSiblings = resizeHeader.getGridColumns();
                        resizeHeader = prevSiblings[prevSiblings.length - 1];
                    }

                    // Check if the header is resizable. Continue checking the old "fixed" property, bug also
                    // check whether the resizablwe property is set to false.
                    if (resizeHeader && !(resizeHeader.fixed || (resizeHeader.resizable === false) || me.disabled)) {
                        me.activeHd = resizeHeader;
                        overHeader.el.dom.style.cursor = me.eResizeCursor;
                    }
                // reset
                } else {
                    overHeader.el.dom.style.cursor = '';
                    delete me.activeHd;
                }
            }
        }
    },

    // only start when there is an activeHd
    onBeforeStart : function(e){
        var t = e.getTarget();
        // cache the activeHd because it will be cleared.
        this.dragHd = this.activeHd;

        if (!!this.dragHd && !Ext.fly(t).hasCls(Ext.baseCSSPrefix + 'column-header-trigger') && !this.headerCt.dragging) {
            //this.headerCt.dragging = true;
            this.tracker.constrainTo = this.getConstrainRegion();
            return true;
        } else {
            this.headerCt.dragging = false;
            return false;
        }
    },

    // get the region to constrain to, takes into account max and min col widths
    getConstrainRegion: function() {
        var me       = this,
            dragHdEl = me.dragHd.el,
            region   = Ext.util.Region.getRegion(dragHdEl),
            nextHd;

        // If forceFit, then right constraint is based upon not being able to force the next header
        // beyond the minColWidth. If there is no next header, then the header may not be expanded.
        if (me.headerCt.forceFit) {
            nextHd = me.dragHd.nextNode('gridcolumn:not([hidden]):not([isGroupHeader])');
        }

         return region.adjust(
            0,
            me.headerCt.forceFit ? (nextHd ? nextHd.getWidth() - me.minColWidth : 0) : me.maxColWidth - dragHdEl.getWidth(),
            0,
            me.minColWidth
        );
    },

    // initialize the left and right hand side markers around
    // the header that we are resizing
    onStart: function(e){
        var me       = this,
            dragHd   = me.dragHd,
            dragHdEl = dragHd.el,
            width    = dragHdEl.getWidth(),
            headerCt = me.headerCt,
            t        = e.getTarget(),
            xy, gridSection, dragHct, firstSection, lhsMarker, rhsMarker, el, offsetLeft, offsetTop, topLeft, markerHeight, top;

        if (me.dragHd && !Ext.fly(t).hasCls(Ext.baseCSSPrefix + 'column-header-trigger')) {
            headerCt.dragging = true;
        }

        me.origWidth = width;

        // setup marker proxies
        if (!me.dynamic) {
            xy           = dragHdEl.getXY();
            gridSection  = headerCt.up('[scrollerOwner]');
            dragHct      = me.dragHd.up(':not([isGroupHeader])');
            firstSection = dragHct.up();
            lhsMarker    = gridSection.getLhsMarker();
            rhsMarker    = gridSection.getRhsMarker();
            el           = rhsMarker.parent();
            offsetLeft   = el.getLocalX();
            offsetTop    = el.getLocalY();
            topLeft      = el.translatePoints(xy);
            markerHeight = firstSection.body.getHeight() + headerCt.getHeight();
            top = topLeft.top - offsetTop;

            lhsMarker.setTop(top);
            rhsMarker.setTop(top);
            lhsMarker.setHeight(markerHeight);
            rhsMarker.setHeight(markerHeight);
            lhsMarker.setLeft(topLeft.left - offsetLeft);
            rhsMarker.setLeft(topLeft.left + width - offsetLeft);
        }
    },

    // synchronize the rhsMarker with the mouse movement
    onDrag: function(e){
        if (!this.dynamic) {
            var xy          = this.tracker.getXY('point'),
                gridSection = this.headerCt.up('[scrollerOwner]'),
                rhsMarker   = gridSection.getRhsMarker(),
                el          = rhsMarker.parent(),
                topLeft     = el.translatePoints(xy),
                offsetLeft  = el.getLocalX();

            rhsMarker.setLeft(topLeft.left - offsetLeft);
        // Resize as user interacts
        } else {
            this.doResize();
        }
    },

    onEnd: function(e){
        this.headerCt.dragging = false;
        if (this.dragHd) {
            if (!this.dynamic) {
                var dragHd      = this.dragHd,
                    gridSection = this.headerCt.up('[scrollerOwner]'),
                    lhsMarker   = gridSection.getLhsMarker(),
                    rhsMarker   = gridSection.getRhsMarker(),
                    offscreen   = -9999;

                // hide markers
                lhsMarker.setLeft(offscreen);
                rhsMarker.setLeft(offscreen);
            }
            this.doResize();
        }
    },

    doResize: function() {
        if (this.dragHd) {
            var dragHd = this.dragHd,
                nextHd,
                offset = this.tracker.getOffset('point');

            // resize the dragHd
            if (dragHd.flex) {
                delete dragHd.flex;
            }

            Ext.suspendLayouts();

            // Set the new column width.
            dragHd.setWidth(this.origWidth + offset[0]);
 
            // In the case of forceFit, change the following Header width.
            // Constraining so that neither neighbour can be sized to below minWidth is handled in getConstrainRegion
            if (this.headerCt.forceFit) {
                nextHd = dragHd.nextNode('gridcolumn:not([hidden]):not([isGroupHeader])');
                if (nextHd) {
                    delete nextHd.flex;
                    nextHd.setWidth(nextHd.getWidth() - offset[0]);
                }
            }

            // Apply the two width changes by laying out the owning HeaderContainer
            Ext.resumeLayouts(true);
        }
    },

    disable: function() {
        this.disabled = true;
        if (this.tracker) {
            this.tracker.disable();
        }
    },

    enable: function() {
        this.disabled = false;
        if (this.tracker) {
            this.tracker.enable();
        }
    }
});




/**
 * Component layout for grid column headers which have a title element at the top followed by content.
 * @private
 */
Ext.define('Ext.grid.ColumnComponentLayout', {
    extend: 'Ext.layout.component.Auto',
    alias: 'layout.columncomponent',

    type: 'columncomponent',

    setWidthInDom: true,

    getContentHeight : function(ownerContext) {
        // If we are a group header return container layout's contentHeight, else default to AutoComponent's answer
        return this.owner.isGroupHeader ? ownerContext.getProp('contentHeight') : this.callParent(arguments);
    },

    calculateOwnerHeightFromContentHeight: function (ownerContext, contentHeight) {
        var result = this.callParent(arguments);
        if (this.owner.isGroupHeader) {
            result += this.owner.titleEl.dom.offsetHeight;
        }
        return result;
    },
    
    getContentWidth : function(ownerContext) {
        // If we are a group header return container layout's contentHeight, else default to AutoComponent's answer
        return this.owner.isGroupHeader ? ownerContext.getProp('contentWidth') : this.callParent(arguments);
    },

    calculateOwnerWidthFromContentWidth: function (ownerContext, contentWidth) {
        return contentWidth + ownerContext.getPaddingInfo().width;
    }
});
/**
 * A small abstract class that contains the shared behaviour for any summary
 * calculations to be used in the grid.
 */
Ext.define('Ext.grid.feature.AbstractSummary', {
    
    /* Begin Definitions */

    extend: 'Ext.grid.feature.Feature',
    
    alias: 'feature.abstractsummary',

    /* End Definitions */

   /**
    * @cfg
    * True to show the summary row.
    */
    showSummaryRow: true,

    // @private
    nestedIdRe: /\{\{id\}([\w\-]*)\}/g,

    // Listen for store updates. Eg, from an Editor.
    init: function() {
        var me = this;

        // Summary rows must be kept in column order, so view must be refreshed on column move
        me.grid.optimizedColumnMove = false;

        me.view.mon(me.view.store, {
            update: me.onStoreUpdate,
            scope: me
        });
    },

    // Refresh the whole view on edit so that the Summary gets updated
    onStoreUpdate: function() {
        var v = this.view;
        if (this.showSummaryRow) {
            v.saveScrollState();
            v.refresh();
            v.restoreScrollState();
        }
    },

    /**
     * Toggle whether or not to show the summary row.
     * @param {Boolean} visible True to show the summary row
     */
    toggleSummaryRow: function(visible){
        this.showSummaryRow = !!visible;
    },

    /**
     * Gets any fragments to be used in the tpl
     * @private
     * @return {Object} The fragments
     */
    getSummaryFragments: function(){
        var fragments = {};
        if (this.showSummaryRow) {
            Ext.apply(fragments, {
                printSummaryRow: Ext.bind(this.printSummaryRow, this)
            });
        }
        return fragments;
    },

    /**
     * Prints a summary row
     * @private
     * @param {Object} index The index in the template
     * @return {String} The value of the summary row
     */
    printSummaryRow: function(index){
        var inner = this.view.getTableChunker().metaRowTpl.join(''),
            prefix = Ext.baseCSSPrefix;

        inner = inner.replace(prefix + 'grid-row', prefix + 'grid-row-summary');
        inner = inner.replace('{{id}}', '{gridSummaryValue}');
        inner = inner.replace(this.nestedIdRe, '{id$1}');  
        inner = inner.replace('{[this.embedRowCls()]}', '{rowCls}');
        inner = inner.replace('{[this.embedRowAttr()]}', '{rowAttr}');
        inner = new Ext.XTemplate(inner, {
            firstOrLastCls: Ext.view.TableChunker.firstOrLastCls
        });

        return inner.applyTemplate({
            columns: this.getPrintData(index)
        });
    },

    /**
     * Gets the value for the column from the attached data.
     * @param {Ext.grid.column.Column} column The header
     * @param {Object} data The current data
     * @return {String} The value to be rendered
     */
    getColumnValue: function(column, summaryData){
        var comp     = Ext.getCmp(column.id),
            value    = summaryData[column.id],
            renderer = comp.summaryRenderer;
            
        if (!value && value !== 0) {
            value = '\u00a0';
        }

        if (renderer) {
            value = renderer.call(
                comp.scope || this,
                value,
                summaryData,
                column.dataIndex
            );
        }
        return value;
    },

    /**
     * Get the summary data for a field.
     * @private
     * @param {Ext.data.Store} store The store to get the data from
     * @param {String/Function} type The type of aggregation. If a function is specified it will
     * be passed to the stores aggregate function.
     * @param {String} field The field to aggregate on
     * @param {Boolean} group True to aggregate in grouped mode 
     * @return {Number/String/Object} See the return type for the store functions.
     */
    getSummary: function(store, type, field, group){
        if (type) {
            if (Ext.isFunction(type)) {
                return store.aggregate(type, null, group);
            }

            switch (type) {
                case 'count':
                    return store.count(group);
                case 'min':
                    return store.min(field, group);
                case 'max':
                    return store.max(field, group);
                case 'sum':
                    return store.sum(field, group);
                case 'average':
                    return store.average(field, group);
                default:
                    return group ? {} : '';
                    
            }
        }
    }

});

/**
 *
 */
Ext.define('Ext.grid.feature.Chunking', {
    extend: 'Ext.grid.feature.Feature',
    alias: 'feature.chunking',

    chunkSize: 20,
    rowHeight: Ext.isIE ? 27 : 26,
    visibleChunk: 0,
    hasFeatureEvent: false,
    attachEvents: function() {
        this.view.el.on('scroll', this.onBodyScroll, this, {buffer: 300});
    },

    onBodyScroll: function(e, t) {
        var view = this.view,
            top  = t.scrollTop,
            nextChunk = Math.floor(top / this.rowHeight / this.chunkSize);
        if (nextChunk !== this.visibleChunk) {

            this.visibleChunk = nextChunk;
            view.refresh();
            view.el.dom.scrollTop = top;
            //BrowserBug: IE6,7,8 quirks mode takes setting scrollTop 2x.
            view.el.dom.scrollTop = top;
        }
    },

    collectData: function(records, preppedRecords, startIndex, fullWidth, o) {
        //headerCt = this.view.headerCt,
        //colums = headerCt.getColumnsForTpl(),
        var me = this,
            recordCount = o.rows.length,
            start = 0,
            i = 0,
            visibleChunk = me.visibleChunk,
            rows,
            chunkLength,
            origRows = o.rows;

        delete o.rows;
        o.chunks = [];
        for (; start < recordCount; start += me.chunkSize, i++) {
            if (start + me.chunkSize > recordCount) {
                chunkLength = recordCount - start;
            } else {
                chunkLength = me.chunkSize;
            }
            
            if (i >= visibleChunk - 1 && i <= visibleChunk + 1) {
                rows = origRows.slice(start, start + me.chunkSize);
            } else {
                rows = [];
            }
            o.chunks.push({
                rows: rows,
                fullWidth: fullWidth,
                chunkHeight: chunkLength * me.rowHeight
            });
        }

        return o;
    },

    getTableFragments: function() {
        return {
            openTableWrap: function() {
                return '<tpl for="chunks"><div class="' + Ext.baseCSSPrefix + 'grid-chunk" style="height: {chunkHeight}px;">';
            },
            closeTableWrap: function() {
                return '</div></tpl>';
            }
        };
    }
});

/**
 * This feature adds an aggregate summary row at the bottom of each group that is provided
 * by the {@link Ext.grid.feature.Grouping} feature. There are two aspects to the summary:
 *
 * ## Calculation
 *
 * The summary value needs to be calculated for each column in the grid. This is controlled
 * by the summaryType option specified on the column. There are several built in summary types,
 * which can be specified as a string on the column configuration. These call underlying methods
 * on the store:
 *
 *  - {@link Ext.data.Store#count count}
 *  - {@link Ext.data.Store#sum sum}
 *  - {@link Ext.data.Store#min min}
 *  - {@link Ext.data.Store#max max}
 *  - {@link Ext.data.Store#average average}
 *
 * Alternatively, the summaryType can be a function definition. If this is the case,
 * the function is called with an array of records to calculate the summary value.
 *
 * ## Rendering
 *
 * Similar to a column, the summary also supports a summaryRenderer function. This
 * summaryRenderer is called before displaying a value. The function is optional, if
 * not specified the default calculated value is shown. The summaryRenderer is called with:
 *
 *  - value {Object} - The calculated value.
 *  - summaryData {Object} - Contains all raw summary values for the row.
 *  - field {String} - The name of the field we are calculating
 *
 * ## Example Usage
 *
 *     @example
 *     Ext.define('TestResult', {
 *         extend: 'Ext.data.Model',
 *         fields: ['student', 'subject', {
 *             name: 'mark',
 *             type: 'int'
 *         }]
 *     });
 *
 *     Ext.create('Ext.grid.Panel', {
 *         width: 200,
 *         height: 240,
 *         renderTo: document.body,
 *         features: [{
 *             groupHeaderTpl: 'Subject: {name}',
 *             ftype: 'groupingsummary'
 *         }],
 *         store: {
 *             model: 'TestResult',
 *             groupField: 'subject',
 *             data: [{
 *                 student: 'Student 1',
 *                 subject: 'Math',
 *                 mark: 84
 *             },{
 *                 student: 'Student 1',
 *                 subject: 'Science',
 *                 mark: 72
 *             },{
 *                 student: 'Student 2',
 *                 subject: 'Math',
 *                 mark: 96
 *             },{
 *                 student: 'Student 2',
 *                 subject: 'Science',
 *                 mark: 68
 *             }]
 *         },
 *         columns: [{
 *             dataIndex: 'student',
 *             text: 'Name',
 *             summaryType: 'count',
 *             summaryRenderer: function(value){
 *                 return Ext.String.format('{0} student{1}', value, value !== 1 ? 's' : '');
 *             }
 *         }, {
 *             dataIndex: 'mark',
 *             text: 'Mark',
 *             summaryType: 'average'
 *         }]
 *     });
 */
Ext.define('Ext.grid.feature.GroupingSummary', {

    /* Begin Definitions */

    extend: 'Ext.grid.feature.Grouping',

    alias: 'feature.groupingsummary',

    mixins: {
        summary: 'Ext.grid.feature.AbstractSummary'
    },

    /* End Definitions */

    init: function() {
        this.mixins.summary.init.call(this);
    },

   /**
    * Modifies the row template to include the summary row.
    * @private
    * @return {String} The modified template
    */
   getFeatureTpl: function() {
        var tpl = this.callParent(arguments);

        if (this.showSummaryRow) {
            // lop off the end </tpl> so we can attach it
            tpl = tpl.replace('</tpl>', '');
            tpl += '{[this.printSummaryRow(xindex)]}</tpl>';
        }
        return tpl;
    },

    /**
     * Gets any fragments needed for the template.
     * @private
     * @return {Object} The fragments
     */
    getFragmentTpl: function() {
        var me = this,
            fragments = me.callParent();

        Ext.apply(fragments, me.getSummaryFragments());
        if (me.showSummaryRow) {
            // this gets called before render, so we'll setup the data here.
            me.summaryGroups = me.view.store.getGroups();
            me.summaryData = me.generateSummaryData();
        }
        return fragments;
    },

    /**
     * Gets the data for printing a template row
     * @private
     * @param {Number} index The index in the template
     * @return {Array} The template values
     */
    getPrintData: function(index){
        var me = this,
            columns = me.view.headerCt.getColumnsForTpl(),
            i = 0,
            length = columns.length,
            data = [],
            name = me.summaryGroups[index - 1].name,
            active = me.summaryData[name],
            column;

        for (; i < length; ++i) {
            column = columns[i];
            column.gridSummaryValue = this.getColumnValue(column, active);
            data.push(column);
        }
        return data;
    },

    /**
     * Generates all of the summary data to be used when processing the template
     * @private
     * @return {Object} The summary data
     */
    generateSummaryData: function(){
        var me = this,
            data = {},
            remoteData = {},
            store = me.view.store,
            groupField = this.getGroupField(),
            reader = store.proxy.reader,
            groups = me.summaryGroups,
            columns = me.view.headerCt.getColumnsForTpl(),
            remote,
            i,
            length,
            fieldData,
            root,
            key,
            comp,
            summaryRows,
            s,
            sLen,
            convertedSummaryRow;

        for (i = 0, length = groups.length; i < length; ++i) {
            data[groups[i].name] = {};
        }

        /**
         * @cfg {String} [remoteRoot=undefined]
         * The name of the property which contains the Array of summary objects.
         * It allows to use server-side calculated summaries.
         */
        if (me.remoteRoot && reader.rawData) {
            // reset reader root and rebuild extractors to extract summaries data
            root = reader.root;
            reader.root = me.remoteRoot;
            reader.buildExtractors(true);
            summaryRows = reader.getRoot(reader.rawData);
            sLen      = summaryRows.length;

            // Ensure the Reader has a data conversion function to convert a raw data row into a Record data hash
            if (!reader.convertRecordData) {
                reader.buildExtractors();
            }

            for (s = 0; s < sLen; s++) {
                convertedSummaryRow = {};

                // Convert a raw data row into a Record's hash object using the Reader
                reader.convertRecordData(convertedSummaryRow, summaryRows[s]);
                remoteData[convertedSummaryRow[groupField]] = convertedSummaryRow;
            }

            // restore initial reader configuration
            reader.root = root;
            reader.buildExtractors(true);
        }

        for (i = 0, length = columns.length; i < length; ++i) {
            comp = Ext.getCmp(columns[i].id);
            fieldData = me.getSummary(store, comp.summaryType, comp.dataIndex, true);

            for (key in fieldData) {
                if (fieldData.hasOwnProperty(key)) {
                    data[key][comp.id] = fieldData[key];
                }
            }

            for (key in remoteData) {
                if (remoteData.hasOwnProperty(key)) {
                    remote = remoteData[key][comp.dataIndex];
                    if (remote !== undefined && data[key] !== undefined) {
                        data[key][comp.id] = remote;
                    }
                }
            }
        }
        return data;
    }
});

/**
 * This feature is used to place a summary row at the bottom of the grid. If using a grouping, 
 * see {@link Ext.grid.feature.GroupingSummary}. There are 2 aspects to calculating the summaries, 
 * calculation and rendering.
 * 
 * ## Calculation
 * The summary value needs to be calculated for each column in the grid. This is controlled
 * by the summaryType option specified on the column. There are several built in summary types,
 * which can be specified as a string on the column configuration. These call underlying methods
 * on the store:
 *
 *  - {@link Ext.data.Store#count count}
 *  - {@link Ext.data.Store#sum sum}
 *  - {@link Ext.data.Store#min min}
 *  - {@link Ext.data.Store#max max}
 *  - {@link Ext.data.Store#average average}
 *
 * Alternatively, the summaryType can be a function definition. If this is the case,
 * the function is called with an array of records to calculate the summary value.
 * 
 * ## Rendering
 * Similar to a column, the summary also supports a summaryRenderer function. This
 * summaryRenderer is called before displaying a value. The function is optional, if
 * not specified the default calculated value is shown. The summaryRenderer is called with:
 *
 *  - value {Object} - The calculated value.
 *  - summaryData {Object} - Contains all raw summary values for the row.
 *  - field {String} - The name of the field we are calculating
 * 
 * ## Example Usage
 *
 *     @example
 *     Ext.define('TestResult', {
 *         extend: 'Ext.data.Model',
 *         fields: ['student', {
 *             name: 'mark',
 *             type: 'int'
 *         }]
 *     });
 *     
 *     Ext.create('Ext.grid.Panel', {
 *         width: 200,
 *         height: 140,
 *         renderTo: document.body,
 *         features: [{
 *             ftype: 'summary'
 *         }],
 *         store: {
 *             model: 'TestResult',
 *             data: [{
 *                 student: 'Student 1',
 *                 mark: 84
 *             },{
 *                 student: 'Student 2',
 *                 mark: 72
 *             },{
 *                 student: 'Student 3',
 *                 mark: 96
 *             },{
 *                 student: 'Student 4',
 *                 mark: 68
 *             }]
 *         },
 *         columns: [{
 *             dataIndex: 'student',
 *             text: 'Name',
 *             summaryType: 'count',
 *             summaryRenderer: function(value, summaryData, dataIndex) {
 *                 return Ext.String.format('{0} student{1}', value, value !== 1 ? 's' : ''); 
 *             }
 *         }, {
 *             dataIndex: 'mark',
 *             text: 'Mark',
 *             summaryType: 'average'
 *         }]
 *     });
 */
Ext.define('Ext.grid.feature.Summary', {
    
    /* Begin Definitions */
    
    extend: 'Ext.grid.feature.AbstractSummary',
    
    alias: 'feature.summary',
    
    /* End Definitions */
    
    /**
     * Gets any fragments needed for the template.
     * @private
     * @return {Object} The fragments
     */
    getFragmentTpl: function() {
        // this gets called before render, so we'll setup the data here.
        this.summaryData = this.generateSummaryData(); 
        return this.getSummaryFragments();
    },
    
    /**
     * Overrides the closeRows method on the template so we can include our own custom
     * footer.
     * @private
     * @return {Object} The custom fragments
     */
    getTableFragments: function(){
        if (this.showSummaryRow) {
            return {
                closeRows: this.closeRows
            };
        }
    },
    
    /**
     * Provide our own custom footer for the grid.
     * @private
     * @return {String} The custom footer
     */
    closeRows: function() {
        return '</tpl>{[this.printSummaryRow()]}';
    },
    
    /**
     * Gets the data for printing a template row
     * @private
     * @param {Number} index The index in the template
     * @return {Array} The template values
     */
    getPrintData: function(index){
        var me = this,
            columns = me.view.headerCt.getColumnsForTpl(),
            i = 0,
            length = columns.length,
            data = [],
            active = me.summaryData,
            column;
            
        for (; i < length; ++i) {
            column = columns[i];
            column.gridSummaryValue = this.getColumnValue(column, active);
            data.push(column);
        }
        return data;
    },
    
    /**
     * Generates all of the summary data to be used when processing the template
     * @private
     * @return {Object} The summary data
     */
    generateSummaryData: function(){
        var me = this,
            data = {},
            store = me.view.store,
            columns = me.view.headerCt.getColumnsForTpl(),
            i = 0,
            length = columns.length,
            fieldData,
            key,
            comp;
            
        for (i = 0, length = columns.length; i < length; ++i) {
            comp = Ext.getCmp(columns[i].id);
            data[comp.id] = me.getSummary(store, comp.summaryType, comp.dataIndex, false);
        }
        return data;
    }
});
/**
 * @private
 */
Ext.define('Ext.grid.header.DragZone', {
    extend: 'Ext.dd.DragZone',
    colHeaderCls: Ext.baseCSSPrefix + 'column-header',
    maxProxyWidth: 120,

    constructor: function(headerCt) {
        this.headerCt = headerCt;
        this.ddGroup =  this.getDDGroup();
        this.callParent([headerCt.el]);
        this.proxy.el.addCls(Ext.baseCSSPrefix + 'grid-col-dd');
    },

    getDDGroup: function() {
        return 'header-dd-zone-' + this.headerCt.up('[scrollerOwner]').id;
    },

    getDragData: function(e) {
        var header = e.getTarget('.'+this.colHeaderCls),
            headerCmp,
            ddel;

        if (header) {
            headerCmp = Ext.getCmp(header.id);
            if (!this.headerCt.dragging && headerCmp.draggable && !(headerCmp.isOnLeftEdge(e) || headerCmp.isOnRightEdge(e))) {
                ddel = document.createElement('div');
                ddel.innerHTML = Ext.getCmp(header.id).text;
                return {
                    ddel: ddel,
                    header: headerCmp
                };
            }
        }
        return false;
    },

    onBeforeDrag: function() {
        return !(this.headerCt.dragging || this.disabled);
    },

    onInitDrag: function() {
        this.headerCt.dragging = true;
        this.callParent(arguments);
    },

    onDragDrop: function() {
        this.headerCt.dragging = false;
        this.callParent(arguments);
    },

    afterRepair: function() {
        this.callParent();
        this.headerCt.dragging = false;
    },

    getRepairXY: function() {
        return this.dragData.header.el.getXY();
    },
    
    disable: function() {
        this.disabled = true;
    },
    
    enable: function() {
        this.disabled = false;
    }
});

/**
 * @private
 */
Ext.define('Ext.grid.header.DropZone', {
    extend: 'Ext.dd.DropZone',
    colHeaderCls: Ext.baseCSSPrefix + 'column-header',
    proxyOffsets: [-4, -9],

    constructor: function(headerCt){
        this.headerCt = headerCt;
        this.ddGroup = this.getDDGroup();
        this.callParent([headerCt.el]);
    },

    getDDGroup: function() {
        return 'header-dd-zone-' + this.headerCt.up('[scrollerOwner]').id;
    },

    getTargetFromEvent : function(e){
        return e.getTarget('.' + this.colHeaderCls);
    },

    getTopIndicator: function() {
        if (!this.topIndicator) {
            this.topIndicator = Ext.DomHelper.append(Ext.getBody(), {
                cls: "col-move-top",
                html: "&#160;"
            }, true);
        }
        return this.topIndicator;
    },

    getBottomIndicator: function() {
        if (!this.bottomIndicator) {
            this.bottomIndicator = Ext.DomHelper.append(Ext.getBody(), {
                cls: "col-move-bottom",
                html: "&#160;"
            }, true);
        }
        return this.bottomIndicator;
    },

    getLocation: function(e, t) {
        var x      = e.getXY()[0],
            region = Ext.fly(t).getRegion(),
            pos, header;

        if ((region.right - x) <= (region.right - region.left) / 2) {
            pos = "after";
        } else {
            pos = "before";
        }
        return {
            pos: pos,
            header: Ext.getCmp(t.id),
            node: t
        };
    },

    positionIndicator: function(draggedHeader, node, e){
        var location = this.getLocation(e, node),
            header = location.header,
            pos    = location.pos,
            nextHd = draggedHeader.nextSibling('gridcolumn:not([hidden])'),
            prevHd = draggedHeader.previousSibling('gridcolumn:not([hidden])'),
            topIndicator, bottomIndicator, topAnchor, bottomAnchor,
            topXY, bottomXY, headerCtEl, minX, maxX,
            allDropZones, ln, i, dropZone;

        // Cannot drag beyond non-draggable start column
        if (!header.draggable && header.getIndex() === 0) {
            return false;
        }

        this.lastLocation = location;

        if ((draggedHeader !== header) &&
            ((pos === "before" && nextHd !== header) ||
            (pos === "after" && prevHd !== header)) &&
            !header.isDescendantOf(draggedHeader)) {

            // As we move in between different DropZones that are in the same
            // group (such as the case when in a locked grid), invalidateDrop
            // on the other dropZones.
            allDropZones = Ext.dd.DragDropManager.getRelated(this);
            ln = allDropZones.length;
            i  = 0;

            for (; i < ln; i++) {
                dropZone = allDropZones[i];
                if (dropZone !== this && dropZone.invalidateDrop) {
                    dropZone.invalidateDrop();
                }
            }


            this.valid = true;
            topIndicator = this.getTopIndicator();
            bottomIndicator = this.getBottomIndicator();
            if (pos === 'before') {
                topAnchor = 'tl';
                bottomAnchor = 'bl';
            } else {
                topAnchor = 'tr';
                bottomAnchor = 'br';
            }
            topXY = header.el.getAnchorXY(topAnchor);
            bottomXY = header.el.getAnchorXY(bottomAnchor);

            // constrain the indicators to the viewable section
            headerCtEl = this.headerCt.el;
            minX = headerCtEl.getLeft();
            maxX = headerCtEl.getRight();

            topXY[0] = Ext.Number.constrain(topXY[0], minX, maxX);
            bottomXY[0] = Ext.Number.constrain(bottomXY[0], minX, maxX);

            // adjust by offsets, this is to center the arrows so that they point
            // at the split point
            topXY[0] -= 4;
            topXY[1] -= 9;
            bottomXY[0] -= 4;

            // position and show indicators
            topIndicator.setXY(topXY);
            bottomIndicator.setXY(bottomXY);
            topIndicator.show();
            bottomIndicator.show();
        // invalidate drop operation and hide indicators
        } else {
            this.invalidateDrop();
        }
    },

    invalidateDrop: function() {
        this.valid = false;
        this.hideIndicators();
    },

    onNodeOver: function(node, dragZone, e, data) {
        var me = this,
            header = me.headerCt,
            doPosition = true,
            from = data.header,
            to;
            
        if (data.header.el.dom === node) {
            doPosition = false;
        } else {
            to = me.getLocation(e, node).header;
            doPosition = (from.ownerCt === to.ownerCt) || (!from.ownerCt.sealed && !to.ownerCt.sealed);
        }
        
        if (doPosition) {
            me.positionIndicator(data.header, node, e);
        } else {
            me.valid = false;
        }
        return me.valid ? me.dropAllowed : me.dropNotAllowed;
    },

    hideIndicators: function() {
        this.getTopIndicator().hide();
        this.getBottomIndicator().hide();
    },

    onNodeOut: function() {
        this.hideIndicators();
    },

    onNodeDrop: function(node, dragZone, e, data) {
        if (this.valid) {
            var dragHeader   = data.header,
                lastLocation = this.lastLocation,
                targetHeader = lastLocation.header,
                fromCt       = dragHeader.ownerCt,
                fromHeader   = dragHeader.up('headercontainer:not(gridcolumn)'),
                localFromIdx = fromCt.items.indexOf(dragHeader), // Container.items is a MixedCollection
                toCt         = targetHeader.ownerCt,
                toHeader     = targetHeader.up('headercontainer:not(gridcolumn)'),
                localToIdx   = toCt.items.indexOf(targetHeader),
                headerCt     = this.headerCt,
                fromIdx      = headerCt.getHeaderIndex(dragHeader),
                colsToMove   = dragHeader.isGroupHeader ? dragHeader.query(':not([isGroupHeader])').length : 1,
                toIdx        = headerCt.getHeaderIndex(targetHeader),
                groupCt,
                scrollerOwner;

            // Drop position is to the right of the targetHeader, increment the toIdx correctly
            if (lastLocation.pos === 'after') {
                localToIdx++;
                toIdx += targetHeader.isGroupHeader ? targetHeader.query(':not([isGroupHeader])').length : 1;
            }

            // If we are dragging in between two HeaderContainers that have had the lockable
            // mixin injected we will lock/unlock headers in between sections, and then continue
            // with another execution of onNodeDrop to ensure the header is dropped into the correct group
            if (fromHeader !== toHeader && fromHeader.lockableInjected && toHeader.lockableInjected && toHeader.lockedCt) {
                scrollerOwner = fromCt.up('[scrollerOwner]');
                scrollerOwner.lock(dragHeader, localToIdx);

                // Now that the header has been transferred into the correct HeaderContainer, recurse, and continue the drop operation with the same dragData
                this.onNodeDrop(node, dragZone, e, data);
            } else if (fromHeader !== toHeader && fromHeader.lockableInjected && toHeader.lockableInjected && fromHeader.lockedCt) {
                scrollerOwner = fromCt.up('[scrollerOwner]');
                scrollerOwner.unlock(dragHeader, localToIdx);

                // Now that the header has been transferred into the correct HeaderContainer, recurse, and continue the drop operation with the same dragData
                this.onNodeDrop(node, dragZone, e, data);
            }
            
            // This is a drop within the same HeaderContainer.
            else {
                this.invalidateDrop();

                // If dragging rightwards, then after removal, the insertion index will be less when moving
                // within the same container.
                if ((fromCt === toCt) && (localToIdx > localFromIdx)) {

                    // Wer're dragging whole headers, so locally, the adjustment is only one
                    localToIdx -= 1;
                }

                // Suspend layouts while we sort all this out.
                Ext.suspendLayouts();

                // Remove dragged header from where it was.
                if (fromCt !== toCt) {
                    fromCt.remove(dragHeader, false);

                    // Dragged the last header out of the fromCt group... The fromCt group must die
                    if (fromCt.isGroupHeader) {
                        if (!fromCt.items.getCount()) {
                            groupCt = fromCt.ownerCt;
                            groupCt.remove(fromCt, false);
                            fromCt.el.dom.parentNode.removeChild(fromCt.el.dom);
                        }
                    }
                }

                // Move dragged header into its drop position
                if (fromCt === toCt) {
                    toCt.move(localFromIdx, localToIdx);
                } else {
                    toCt.insert(localToIdx, dragHeader);
                }

                // Group headers acquire the aggregate width of their child headers
                // Therefore a child header may not flex; it must contribute a fixed width.
                // But we restore the flex value when moving back into the main header container
                if (toCt.isGroupHeader) {
                    // Adjust the width of the "to" group header only if we dragged in from somewhere else.
                    if (toCt !== fromCt) {
                        dragHeader.savedFlex = dragHeader.flex;
                        delete dragHeader.flex;
                        dragHeader.width = dragHeader.getWidth();
                    }
                } else {
                    if (dragHeader.savedFlex) {
                        dragHeader.flex = dragHeader.savedFlex;
                        delete dragHeader.width;
                    }
                }

                // Refresh columns cache in case we remove an emptied group column
                headerCt.purgeCache();
                Ext.resumeLayouts(true);
                headerCt.onHeaderMoved(dragHeader, colsToMove, fromIdx, toIdx);

                // Emptied group header can only be destroyed after the header and grid have been refreshed
                if (!fromCt.items.getCount()) {
                    fromCt.destroy();
                }
            }
        }
    }
});

/**
 * @private
 */
Ext.define('Ext.grid.plugin.HeaderReorderer', {
    extend: 'Ext.AbstractPlugin',
    requires: ['Ext.grid.header.DragZone', 'Ext.grid.header.DropZone'],
    alias: 'plugin.gridheaderreorderer',

    init: function(headerCt) {
        this.headerCt = headerCt;
        headerCt.on({
            render: this.onHeaderCtRender,
            single: true,
            scope: this
        });
    },

    /**
     * @private
     * AbstractComponent calls destroy on all its plugins at destroy time.
     */
    destroy: function() {
        Ext.destroy(this.dragZone, this.dropZone);
    },

    onHeaderCtRender: function() {
        var me = this;
        
        me.dragZone = new Ext.grid.header.DragZone(me.headerCt);
        me.dropZone = new Ext.grid.header.DropZone(me.headerCt);
        if (me.disabled) {
            me.dragZone.disable();
        }
    },
    
    enable: function() {
        this.disabled = false;
        if (this.dragZone) {
            this.dragZone.enable();
        }
    },
    
    disable: function() {
        this.disabled = true;
        if (this.dragZone) {
            this.dragZone.disable();
        }
    }
});

/**
 * A specific {@link Ext.data.Model} type that represents a name/value pair and is made to work with the
 * {@link Ext.grid.property.Grid}. Typically, Properties do not need to be created directly as they can be
 * created implicitly by simply using the appropriate data configs either via the
 * {@link Ext.grid.property.Grid#source} config property or by calling {@link Ext.grid.property.Grid#setSource}.
 * However, if the need arises, these records can also be created explicitly as shown below. Example usage:
 *
 *     var rec = new Ext.grid.property.Property({
 *         name: 'birthday',
 *         value: Ext.Date.parse('17/06/1962', 'd/m/Y')
 *     });
 *     // Add record to an already populated grid
 *     grid.store.addSorted(rec);
 *
 * @constructor
 * Creates new property.
 * @param {Object} config A data object in the format:
 * @param {String/String[]} config.name A name or names for the property.
 * @param {Mixed/Mixed[]} config.value A value or values for the property.
 * The specified value's type will be read automatically by the grid to determine the type of editor to use when
 * displaying it.
 * @return {Object}
 */
Ext.define('Ext.grid.property.Property', {
    extend: 'Ext.data.Model',

    alternateClassName: 'Ext.PropGridProperty',

    fields: [{
        name: 'name',
        type: 'string'
    }, {
        name: 'value'
    }],
    idProperty: 'name'
});
/**
 * A custom {@link Ext.data.Store} for the {@link Ext.grid.property.Grid}. This class handles the mapping
 * between the custom data source objects supported by the grid and the {@link Ext.grid.property.Property} format
 * used by the {@link Ext.data.Store} base class.
 */
Ext.define('Ext.grid.property.Store', {

    extend: 'Ext.data.Store',

    alternateClassName: 'Ext.grid.PropertyStore',

    sortOnLoad: false,

    uses: ['Ext.data.reader.Reader', 'Ext.data.proxy.Proxy', 'Ext.data.ResultSet', 'Ext.grid.property.Property'],

    /**
     * Creates new property store.
     * @param {Ext.grid.Panel} grid The grid this store will be bound to
     * @param {Object} source The source data config object
     */
    constructor : function(grid, source){
        var me = this;
        
        me.grid = grid;
        me.source = source;
        me.callParent([{
            data: source,
            model: Ext.grid.property.Property,
            proxy: me.getProxy()
        }]);
    },

    // Return a singleton, customized Proxy object which configures itself with a custom Reader
    getProxy: function() {
        if (!this.proxy) {
            Ext.grid.property.Store.prototype.proxy = new Ext.data.proxy.Memory({
                model: Ext.grid.property.Property,
                reader: this.getReader()
            });
        }
        return this.proxy;
    },

    // Return a singleton, customized Reader object which reads Ext.grid.property.Property records from an object.
    getReader: function() {
        if (!this.reader) {
            Ext.grid.property.Store.prototype.reader = new Ext.data.reader.Reader({
                model: Ext.grid.property.Property,

                buildExtractors: Ext.emptyFn,

                read: function(dataObject) {
                    return this.readRecords(dataObject);
                },

                readRecords: function(dataObject) {
                    var val,
                        propName,
                        result = {
                            records: [],
                            success: true
                        };

                    for (propName in dataObject) {
                        if (dataObject.hasOwnProperty(propName)) {
                            val = dataObject[propName];
                            if (this.isEditableValue(val)) {
                                result.records.push(new Ext.grid.property.Property({
                                    name: propName,
                                    value: val
                                }, propName));
                            }
                        }
                    }
                    result.total = result.count = result.records.length;
                    return new Ext.data.ResultSet(result);
                },

                // private
                isEditableValue: function(val){
                    return Ext.isPrimitive(val) || Ext.isDate(val);
                }
            });
        }
        return this.reader;
    },

    // protected - should only be called by the grid.  Use grid.setSource instead.
    setSource : function(dataObject) {
        var me = this;

        me.source = dataObject;
        me.suspendEvents();
        me.removeAll();
        me.proxy.data = dataObject;
        me.load();
        me.resumeEvents();
        me.fireEvent('datachanged', me);
        me.fireEvent('refresh', me);
    },

    // private
    getProperty : function(row) {
       return Ext.isNumber(row) ? this.getAt(row) : this.getById(row);
    },

    // private
    setValue : function(prop, value, create){
        var me = this,
            rec = me.getRec(prop);
            
        if (rec) {
            rec.set('value', value);
            me.source[prop] = value;
        } else if (create) {
            // only create if specified.
            me.source[prop] = value;
            rec = new Ext.grid.property.Property({name: prop, value: value}, prop);
            me.add(rec);
        }
    },

    // private
    remove : function(prop) {
        var rec = this.getRec(prop);
        if (rec) {
            this.callParent([rec]);
            delete this.source[prop];
        }
    },

    // private
    getRec : function(prop) {
        return this.getById(prop);
    },

    // protected - should only be called by the grid.  Use grid.getSource instead.
    getSource : function() {
        return this.source;
    }
});



/**
 * Internal utility class that provides default configuration for cell editing.
 * @private
 */
Ext.define('Ext.grid.CellEditor', {
    extend: 'Ext.Editor',
    constructor: function(config) {
        config = Ext.apply({}, config);
        
        if (config.field) {
            config.field.monitorTab = false;
        }
        this.callParent([config]);
    },
    
    /**
     * @private
     * Hide the grid cell text when editor is shown.
     *
     * There are 2 reasons this needs to happen:
     *
     * 1. checkbox editor does not take up enough space to hide the underlying text.
     *
     * 2. When columnLines are turned off in browsers that don't support text-overflow:
     *    ellipsis (firefox 6 and below and IE quirks), the text extends to the last pixel
     *    in the cell, however the right border of the cell editor is always positioned 1px
     *    offset from the edge of the cell (to give it the appearance of being "inside" the
     *    cell.  This results in 1px of the underlying cell text being visible to the right
     *    of the cell editor if the text is not hidden.
     * 
     * We can't just hide the entire cell, because then treecolumn's icons would be hidden
     * as well.  We also can't just set "color: transparent" to hide the text because it is
     * not supported by IE8 and below.  The only remaining solution is to remove the text
     * from the text node and then add it back when the editor is hidden.
     */
    onShow: function() {
        var me = this,
            innerCell = me.boundEl.first(),
            lastChild,
            textNode;

        if (innerCell) {
            lastChild = innerCell.dom.lastChild;
            if(lastChild && lastChild.nodeType === 3) {
                // if the cell has a text node, save a reference to it
                textNode = me.cellTextNode = innerCell.dom.lastChild;
                // save the cell text so we can add it back when we're done editing
                me.cellTextValue = textNode.nodeValue;
                // The text node has to have at least one character in it, or the cell borders
                // in IE quirks mode will not show correctly, so let's use a non-breaking space.
                textNode.nodeValue = '\u00a0';
            }
        }
        me.callParent(arguments);
    },

    /**
     * @private
     * Show the grid cell text when the editor is hidden by adding the text back to the text node
     */
    onHide: function() {
        var me = this,
            innerCell = me.boundEl.first();

        if (innerCell && me.cellTextNode) {
            me.cellTextNode.nodeValue = me.cellTextValue;
            delete me.cellTextNode;
            delete me.cellTextValue;
        }
        me.callParent(arguments);
    },

    /**
     * @private
     * Fix checkbox blur when it is clicked.
     */
    afterRender: function() {
        var me = this,
            field = me.field;

        me.callParent(arguments);
        if (field.isXType('checkboxfield')) {
            field.mon(field.inputEl, {
                mousedown: me.onCheckBoxMouseDown,
                click: me.onCheckBoxClick,
                scope: me
            });
        }
    },
    
    /**
     * @private
     * Because when checkbox is clicked it loses focus  completeEdit is bypassed.
     */
    onCheckBoxMouseDown: function() {
        this.completeEdit = Ext.emptyFn;
    },
    
    /**
     * @private
     * Restore checkbox focus and completeEdit method.
     */
    onCheckBoxClick: function() {
        delete this.completeEdit;
        this.field.focus(false, 10);
    },
    
    /**
     * @private
     * Realigns the Editor to the grid cell, or to the text node in the grid inner cell
     * if the inner cell contains multiple child nodes.
     */
    realign: function(autoSize) {
        var me = this,
            boundEl = me.boundEl,
            innerCell = boundEl.first(),
            children = innerCell.dom.childNodes,
            childCount = children.length,
            offsets = Ext.Array.clone(me.offsets),
            inputEl = me.field.inputEl,
            lastChild, leftBound, rightBound, width;

        // If the inner cell has more than one child, or the first child node is not a text node,
        // let's assume this cell contains additional elements before the text node.
        // This is the case for tree cells, but could also be used to accomodate grid cells that
        // have a custom renderer that render, say, an icon followed by some text for example
        // For now however, this support will only be used for trees.
        if(me.isForTree && (childCount > 1 || (childCount === 1 && children[0].nodeType !== 3))) {
            // get the inner cell's last child
            lastChild = innerCell.last();
            // calculate the left bound of the text node
            leftBound = lastChild.getOffsetsTo(innerCell)[0] + lastChild.getWidth();
            // calculate the right bound of the text node (this is assumed to be the right edge of
            // the inner cell, since we are assuming the text node is always the last node in the
            // inner cell)
            rightBound = innerCell.getWidth();
            // difference between right and left bound is the text node's allowed "width",
            // this will be used as the width for the editor.
            width = rightBound - leftBound;
            // adjust width for column lines - this ensures the editor will be the same width
            // regardless of columLines config
            if(!me.editingPlugin.grid.columnLines) {
                width --;
            }
            // set the editor's x offset to the left bound position
            offsets[0] += leftBound;

            me.addCls(Ext.baseCSSPrefix + 'grid-editor-on-text-node');
        } else {
            width = boundEl.getWidth() - 1;
        }

        if (autoSize === true) {
            me.field.setWidth(width);
        }

        me.alignTo(boundEl, me.alignment, offsets);
    },
    
    onEditorTab: function(e){
        var field = this.field;
        if (field.onEditorTab) {
            field.onEditorTab(e);
        }
    },

    alignment: "tl-tl",
    hideEl : false,
    cls: Ext.baseCSSPrefix + "small-editor " + Ext.baseCSSPrefix + "grid-editor",
    shim: false,
    shadow: false
});




/**
 * @private
 *
 * This class is used only by the grid's HeaderContainer docked child.
 *
 * It adds the ability to shrink the vertical size of the inner container element back if a grouped
 * column header has all its child columns dragged out, and the whole HeaderContainer needs to shrink back down.
 *
 * Also, after every layout, after all headers have attained their 'stretchmax' height, it goes through and calls
 * `setPadding` on the columns so that they lay out correctly.
 */
Ext.define('Ext.grid.ColumnLayout', {
    extend: 'Ext.layout.container.HBox',
    alias: 'layout.gridcolumn',
    type : 'gridcolumn',

    reserveOffset: false,

    firstHeaderCls: Ext.baseCSSPrefix + 'column-header-first',
    lastHeaderCls: Ext.baseCSSPrefix + 'column-header-last',

    initLayout: function() {
        this.grid = this.owner.up('[scrollerOwner]');
        this.callParent();
    },

    // Collect the height of the table of data upon layout begin
    beginLayout: function (ownerContext) {
        var me = this,
            grid = me.grid,
            view = grid.view,
            i = 0,
            items = me.getVisibleItems(),
            len = items.length,
            item;

        ownerContext.gridContext = ownerContext.context.getCmp(me.grid);

        // If we are one side of a locking grid, then if we are on the "normal" side, we have to grab the normal view
        // for use in determining whether to subtract scrollbar width from available width.
        // The locked side does not have scrollbars, so it should not look at the view.
        if (grid.lockable) {
            if (me.owner.up('tablepanel') === view.normalGrid) {
                view = view.normalGrid.getView();
            } else {
                view = null;
            }
        }

        me.callParent(arguments);

        // Unstretch child items before the layout which stretches them.
        for (; i < len; i++) {
            item = items[i];
            item.removeCls([me.firstHeaderCls, me.lastHeaderCls]);
            item.el.setStyle({
                height: 'auto'
            });
            item.titleEl.setStyle({
                height: 'auto',
                paddingTop: ''  // reset back to default padding of the style
            });
        }

        // Add special first/last classes
        if (len > 0) {
            items[0].addCls(me.firstHeaderCls);
            items[len - 1].addCls(me.lastHeaderCls);
        }

        // If the owner is the grid's HeaderContainer, and the UI displays old fashioned scrollbars and there is a rendered View with data in it,
        // AND we are scrolling vertically:
        // collect the View context to interrogate it for overflow, and possibly invalidate it if there is overflow
        if (!me.owner.isHeader && Ext.getScrollbarSize().width && !grid.collapsed && view &&
                view.table.dom && (view.autoScroll || view.overflowY)) {
            ownerContext.viewContext = ownerContext.context.getCmp(view);
        }
    },

    roundFlex: function(width) {
        return Math.floor(width);
    },

    calculate: function(ownerContext) {
        var me = this,
            viewContext = ownerContext.viewContext,
            tableHeight,
            viewHeight;

        me.callParent(arguments);

        if (ownerContext.state.parallelDone) {
            ownerContext.setProp('columnWidthsDone', true);
        }

        // If we have a viewContext (Only created if there is an existing <table> within the view, AND we are scolling vertically AND scrollbars take up space)
        //     we are not already in the second pass, and we are not shrinkWrapping...
        //     Then we have to see if we know enough to determine whether there is vertical opverflow so that we can
        //     invalidate and loop back for the second pass with a narrower target width.
        if (viewContext && !ownerContext.state.overflowAdjust.width && !ownerContext.gridContext.heightModel.shrinkWrap) {
            tableHeight = viewContext.tableContext.getProp('height');
            viewHeight = viewContext.getProp('height');

            // Heights of both view and its table content have not both been published; we cannot complete
            if (isNaN(tableHeight + viewHeight)) {
                me.done = false;
            }

            // Heights have been published, and there is vertical overflow; invalidate with a width adjustment to allow for the scrollbar
            else if (tableHeight >= viewHeight) {
                ownerContext.gridContext.invalidate({
                    after: function() {
                        ownerContext.state.overflowAdjust = {
                            width: Ext.getScrollbarSize().width,
                            height: 0
                        };
                    }
                });
            }
        }
    },
 
    completeLayout: function(ownerContext) {
        var me = this,
            owner = me.owner,
            state = ownerContext.state,
            needsInvalidate = false,
            calculated = me.sizeModels.calculated,
            childItems, len, i, childContext, item;

        me.callParent(arguments);

        // If we have not been through this already, and the owning Container is configured
        // forceFit, is not a group column and and there is a valid width, then convert
        // widths to flexes, and loop back.
        if (!state.flexesCalculated && owner.forceFit && !owner.isHeader) {
            childItems = ownerContext.childItems;
            len = childItems.length;

            for (i = 0; i < len; i++) {
                childContext = childItems[i];
                item = childContext.target;

                // For forceFit, just use allocated width as the flex value, and the proportions
                // will end up the same whatever HeaderContainer width they are being forced into.
                if (item.width) {
                    item.flex = ownerContext.childItems[i].flex = item.width;
                    delete item.width;
                    childContext.widthModel = calculated;
                    needsInvalidate = true;
                }
            }

            // Recalculate based upon all columns now being flexed instead of sized.
            // Set flag, so that we do not do this infinitely
            if (needsInvalidate) {
                me.cacheFlexes(ownerContext);
                ownerContext.invalidate({
                    state: {
                        flexesCalculated: true
                    }
                });
            }
        }
    },

    finalizeLayout: function() {
        var me = this,
            i = 0,
            items,
            len,
            itemsHeight,
            owner = me.owner,
            titleEl = owner.titleEl;

        // Set up padding in items
        items = me.getVisibleItems();
        len = items.length;
        // header container's items take up the whole height
        itemsHeight = owner.el.getViewSize().height;
        if (titleEl) {
        // if owner is a grouped column with children, we need to subtract the titleEl's height
        // to determine the remaining available height for the child items
            itemsHeight -= titleEl.getHeight();
        }
        for (; i < len; i++) {
            items[i].setPadding(itemsHeight);
        }
    },

    // FIX: when flexing we actually don't have enough space as we would
    // typically because of the scrollOffset on the GridView, must reserve this
    publishInnerCtSize: function(ownerContext) {
        var me = this,
            size = ownerContext.state.boxPlan.targetSize,
            cw = ownerContext.peek('contentWidth'),
            view;

        // InnerCt MUST stretch to accommodate all columns so that left/right scrolling is enabled in the header container.
        if ((cw != null) && !me.owner.isHeader) {
            size.width = cw;

            // innerCt must also encompass any vertical scrollbar width if there may be one
            view = me.owner.ownerCt.view;
            if (view.autoScroll || view.overflowY) {
                size.width += Ext.getScrollbarSize().width;
            }
        }

        return me.callParent(arguments);
    }
});

/**
 * Container which holds headers and is docked at the top or bottom of a TablePanel.
 * The HeaderContainer drives resizing/moving/hiding of columns within the TableView.
 * As headers are hidden, moved or resized the headercontainer is responsible for
 * triggering changes within the view.
 */
Ext.define('Ext.grid.header.Container', {
    extend: 'Ext.container.Container',
    requires: [
        'Ext.grid.ColumnLayout',
        'Ext.grid.plugin.HeaderResizer',
        'Ext.grid.plugin.HeaderReorderer'
    ],
    uses: [
        'Ext.grid.column.Column',
        'Ext.menu.Menu',
        'Ext.menu.CheckItem',
        'Ext.menu.Separator'
    ],
    border: true,

    alias: 'widget.headercontainer',

    baseCls: Ext.baseCSSPrefix + 'grid-header-ct',
    dock: 'top',

    /**
     * @cfg {Number} weight
     * HeaderContainer overrides the default weight of 0 for all docked items to 100.
     * This is so that it has more priority over things like toolbars.
     */
    weight: 100,

    defaultType: 'gridcolumn',
    
    detachOnRemove: false,

    /**
     * @cfg {Number} defaultWidth
     * Width of the header if no width or flex is specified.
     */
    defaultWidth: 100,
    
    /**
     * @cfg {Boolean} [sealed=false]
     * Specify as `true` to constrain column dragging so that a column cannot be dragged into or out of this column.
     *
     * **Note that this config is only valid for column headers which contain child column headers, eg:**
     *     {
     *         sealed: true
     *         text: 'ExtJS',
     *         columns: [{
     *             text: '3.0.4',
     *             dataIndex: 'ext304'
     *         }, {
     *             text: '4.1.0',
     *             dataIndex: 'ext410'
     *         }
     *     }
     *
     */

    //<locale>
    sortAscText: 'Sort Ascending',
    //</locale>
    //<locale>
    sortDescText: 'Sort Descending',
    //</locale>
    //<locale>
    sortClearText: 'Clear Sort',
    //</locale>
    //<locale>
    columnsText: 'Columns',
    //</locale>

    headerOpenCls: Ext.baseCSSPrefix + 'column-header-open',

    // private; will probably be removed by 4.0
    triStateSort: false,

    ddLock: false,

    dragging: false,

    /**
     * @property {Boolean} isGroupHeader
     * True if this HeaderContainer is in fact a group header which contains sub headers.
     */

    /**
     * @cfg {Boolean} sortable
     * Provides the default sortable state for all Headers within this HeaderContainer.
     * Also turns on or off the menus in the HeaderContainer. Note that the menu is
     * shared across every header and therefore turning it off will remove the menu
     * items for every header.
     */
    sortable: true,

    initComponent: function() {
        var me = this;

        me.headerCounter = 0;
        me.plugins = me.plugins || [];

        // TODO: Pass in configurations to turn on/off dynamic
        //       resizing and disable resizing all together

        // Only set up a Resizer and Reorderer for the topmost HeaderContainer.
        // Nested Group Headers are themselves HeaderContainers
        if (!me.isHeader) {
            if (me.enableColumnResize) {
                me.resizer = new Ext.grid.plugin.HeaderResizer();
                me.plugins.push(me.resizer);
            }
            if (me.enableColumnMove) {
                me.reorderer = new Ext.grid.plugin.HeaderReorderer();
                me.plugins.push(me.reorderer);
            }
        }

        // Base headers do not need a box layout
        if (me.isHeader && !me.items) {
            me.layout = me.layout || 'auto';
        }
        // HeaderContainer and Group header needs a gridcolumn layout.
        else {
            me.layout = Ext.apply({
                type: 'gridcolumn',
                align: 'stretchmax'
            }, me.initialConfig.layout);
        }
        me.defaults = me.defaults || {};
        Ext.applyIf(me.defaults, {
            triStateSort: me.triStateSort,
            sortable: me.sortable
        });
        
        me.menuTask = new Ext.util.DelayedTask(me.updateMenuDisabledState, me);
        me.callParent();
        me.addEvents(
            /**
             * @event columnresize
             * @param {Ext.grid.header.Container} ct The grid's header Container which encapsulates all column headers.
             * @param {Ext.grid.column.Column} column The Column header Component which provides the column definition
             * @param {Number} width
             */
            'columnresize',

            /**
             * @event headerclick
             * @param {Ext.grid.header.Container} ct The grid's header Container which encapsulates all column headers.
             * @param {Ext.grid.column.Column} column The Column header Component which provides the column definition
             * @param {Ext.EventObject} e
             * @param {HTMLElement} t
             */
            'headerclick',

            /**
             * @event headertriggerclick
             * @param {Ext.grid.header.Container} ct The grid's header Container which encapsulates all column headers.
             * @param {Ext.grid.column.Column} column The Column header Component which provides the column definition
             * @param {Ext.EventObject} e
             * @param {HTMLElement} t
             */
            'headertriggerclick',

            /**
             * @event columnmove
             * @param {Ext.grid.header.Container} ct The grid's header Container which encapsulates all column headers.
             * @param {Ext.grid.column.Column} column The Column header Component which provides the column definition
             * @param {Number} fromIdx
             * @param {Number} toIdx
             */
            'columnmove',
            /**
             * @event columnhide
             * @param {Ext.grid.header.Container} ct The grid's header Container which encapsulates all column headers.
             * @param {Ext.grid.column.Column} column The Column header Component which provides the column definition
             */
            'columnhide',
            /**
             * @event columnshow
             * @param {Ext.grid.header.Container} ct The grid's header Container which encapsulates all column headers.
             * @param {Ext.grid.column.Column} column The Column header Component which provides the column definition
             */
            'columnshow',
            /**
             * @event sortchange
             * @param {Ext.grid.header.Container} ct The grid's header Container which encapsulates all column headers.
             * @param {Ext.grid.column.Column} column The Column header Component which provides the column definition
             * @param {String} direction
             */
            'sortchange',
            /**
             * @event menucreate
             * Fired immediately after the column header menu is created.
             * @param {Ext.grid.header.Container} ct This instance
             * @param {Ext.menu.Menu} menu The Menu that was created
             */
            'menucreate'
        );
    },

    onDestroy: function() {
        var me = this;
        
        me.menuTask.cancel();
        Ext.destroy(me.resizer, me.reorderer);
        me.callParent();
    },

    applyColumnsState: function(columns) {
        if (!columns || !columns.length) {
            return;
        }

        var me     = this,
            items  = me.items.items,
            count  = items.length,
            i      = 0,
            length = columns.length,
            c, col, columnState, index;

        for (c = 0; c < length; c++) {
            columnState = columns[c];

            for (index = count; index--; ) {
                col = items[index];
                if (col.getStateId && col.getStateId() == columnState.id) {
                    // If a column in the new grid matches up with a saved state...
                    // Ensure that the column is restored to the state order.
                    // i is incremented upon every column match, so all persistent
                    // columns are ordered before any new columns.
                    if (i !== index) {
                        me.moveHeader(index, i);
                    }

                    if (col.applyColumnState) {
                        col.applyColumnState(columnState);
                    }
                    ++i;
                    break;
                }
            }
        }
    },

    getColumnsState: function () {
        var me = this,
            columns = [],
            state;

        me.items.each(function (col) {
            state = col.getColumnState && col.getColumnState();
            if (state) {
                columns.push(state);
            }
        });

        return columns;
    },

    // Invalidate column cache on add
    // We cannot refresh the View on every add because this method is called
    // when the HeaderDropZone moves Headers around, that will also refresh the view
    onAdd: function(c) {
        var me = this,
            headerCt = me.isHeader ? me.getOwnerHeaderCt() : me;

        if (!c.headerId) {
            c.headerId = c.initialConfig.id || Ext.id(null, 'header-');
        }

        if (!c.stateId) {
            // This was the headerId generated in 4.0, so to preserve saved state, we now
            // assign a default stateId in that same manner. The stateId's of a column are
            // not global at the stateProvider, but are local to the grid state data. The
            // headerId should still follow our standard naming convention.
            c.stateId = c.initialConfig.id || ('h' + (++me.headerCounter));
        }

        if (Ext.global.console && Ext.global.console.warn) {
            if (!me._usedIDs) {
                me._usedIDs = {};
            }
            if (me._usedIDs[c.headerId]) {
                Ext.global.console.warn(this.$className, 'attempted to reuse an existing id', c.headerId);
            }
            me._usedIDs[c.headerId] = true;
        }
        me.callParent(arguments);

        // Upon add of any column we need to purge the *HeaderContainer's* cache of leaf view columns.
        if (headerCt) {
            headerCt.purgeCache();
        }
    },

    // Invalidate column cache on remove
    // We cannot refresh the View on every remove because this method is called
    // when the HeaderDropZone moves Headers around, that will also refresh the view
    onRemove: function(c) {
        var me = this,
            headerCt = me.isHeader ? me.getOwnerHeaderCt() : me;

        me.callParent(arguments);
        
        if (!me._usedIDs) {
            me._usedIDs = {};
        }
        delete me._usedIDs[c.headerId];

        // Upon removal of any column we need to purge the *HeaderContainer's* cache of leaf view columns.
        if (headerCt) {
            me.purgeCache();
        }
    },

    // @private
    applyDefaults: function(config) {
        var ret; 
        /*
         * Ensure header.Container defaults don't get applied to a RowNumberer 
         * if an xtype is supplied. This isn't an ideal solution however it's 
         * much more likely that a RowNumberer with no options will be created, 
         * wanting to use the defaults specified on the class as opposed to 
         * those setup on the Container.
         */
        if (config && !config.isComponent && config.xtype == 'rownumberer') {
            ret = config;
        } else {
            ret = this.callParent(arguments);
            
            // Apply default width unless it's a group header (in which case it must be left to shrinkwrap), or it's flexed
            if (!config.isGroupHeader && !('width' in ret) && !ret.flex) {
                ret.width = this.defaultWidth;
            }
        }
        return ret;
    },

    afterRender: function() {
        this.callParent();
        this.setSortState();
        
    },
    
    setSortState: function(){
        var store   = this.up('[store]').store,
            // grab the first sorter, since there may also be groupers
            // in this collection
            first = store.getFirstSorter(),
            hd;

        if (first) {
            hd = this.down('gridcolumn[dataIndex=' + first.property  +']');
            if (hd) {
                hd.setSortState(first.direction, false, true);
            }
        } else {
            this.clearOtherSortStates(null);
        }
    },
    
    getHeaderMenu: function(){
        var menu = this.getMenu(),
            item;
            
        if (menu) {
            item = menu.child('#columnItem');
            if (item) {
                return item.menu;
            }
        }   
        return null; 
    },
    
    onHeaderVisibilityChange: function(header, visible){
        var me = this,
            menu = me.getHeaderMenu(),
            item;
        
        if (menu) {
            // If the header was hidden programmatically, sync the Menu state
            item = me.getMenuItemForHeader(menu, header);
            if (item) {
                item.setChecked(visible, true);
            }
            // delay this since the headers may fire a number of times if we're hiding/showing groups
            me.menuTask.delay(50);
        }
    },
    
    /**
     * @private
     * Gets all "leaf" menu nodes and returns the checked count for those leaves.
     * Only includes columns that are hideable via the menu
     */
    getLeafMenuItems: function() {
        var me = this,
            columns = me.getGridColumns(),
            items = [],
            i = 0,
            count = 0,
            len = columns.length,
            menu = me.getMenu(),
            item;

        for (; i < len; ++i) {
            item = columns[i];
            if (item.hideable) {
                item = me.getMenuItemForHeader(menu, item);
                if (item) {
                    items.push(item);
                    if (item.checked) {
                        ++count;
                    }
                }
            } else if (!item.hidden && !item.menuDisabled) {
                ++count;
            }
        }

        return {
            items: items,
            checkedCount: count    
        };
    },
    
    updateMenuDisabledState: function(){
        var me = this,
            result = me.getLeafMenuItems(),
            total = result.checkedCount,
            items = result.items,
            len = items.length,
            i = 0,
            rootItem = me.getMenu().child('#columnItem');
            
        if (total <= 1) {
            // only one column visible, prevent hiding of the remaining item
            me.disableMenuItems(rootItem, Ext.ComponentQuery.query('[checked=true]', items)[0]);
        } else {
            // at least 2 visible, set the state appropriately
            for (; i < len; ++i) {
                me.setMenuItemState(total, rootItem, items[i]);
            }
        }
    },
    
    disableMenuItems: function(rootItem, item){
        while (item && item != rootItem) {
            item.disableCheckChange();
            item = item.parentMenu.ownerItem;
        }
    },
    
    setMenuItemState: function(total, rootItem, item){
        var parentMenu,
            checkedChildren;
            
        while (item && item != rootItem) {
            parentMenu = item.parentMenu;
            checkedChildren = item.parentMenu.query('[checked=true]:not([menu])').length;
            item.enableCheckChange();
            item = parentMenu.ownerItem;
            if (checkedChildren === total) {
                // contains all the checked children, jump out the item and all parents
                break;
            }
        }
        
        // while we're not at the top, disable from the current item up
        this.disableMenuItems(rootItem, item);
    },
    
    getMenuItemForHeader: function(menu, header){
        return header ? menu.down('menucheckitem[headerId=' + header.id + ']') : null;
    },

    onHeaderShow: function(header) {
        // Pass up to the GridSection
        var me = this,
            gridSection = me.ownerCt;

        me.onHeaderVisibilityChange(header, true);

        // Only update the grid UI when we are notified about base level Header shows;
        // Group header shows just cause a layout of the HeaderContainer
        if (!header.isGroupHeader) {
            if (gridSection) {
                gridSection.onHeaderShow(me, header);
            }
        }
        me.fireEvent('columnshow', me, header);
    },

    onHeaderHide: function(header) {
        // Pass up to the GridSection
        var me = this,
            gridSection = me.ownerCt;

        me.onHeaderVisibilityChange(header, false);

        // Only update the UI when we are notified about base level Header hides;
        if (!header.isGroupHeader) {
            if (gridSection) {
                gridSection.onHeaderHide(me, header);
            }
        }
        me.fireEvent('columnhide', me, header);
    },

    /**
     * Temporarily lock the headerCt. This makes it so that clicking on headers
     * don't trigger actions like sorting or opening of the header menu. This is
     * done because extraneous events may be fired on the headers after interacting
     * with a drag drop operation.
     * @private
     */
    tempLock: function() {
        this.ddLock = true;
        Ext.Function.defer(function() {
            this.ddLock = false;
        }, 200, this);
    },

    onHeaderResize: function(header, w, suppressFocus) {
        var me = this,
            view = me.view,
            gridSection = me.ownerCt;

        // Do not react to header sizing during initial Panel layout when there is no view content to size.
        if (view && view.table.dom) {
            me.tempLock();
            if (gridSection) {
                gridSection.onHeaderResize(me, header, w);
            }
        }
        me.fireEvent('columnresize', this, header, w);
    },

    onHeaderClick: function(header, e, t) {
        header.fireEvent('headerclick', this, header, e, t);
        this.fireEvent("headerclick", this, header, e, t);
    },

    onHeaderTriggerClick: function(header, e, t) {
        // generate and cache menu, provide ability to cancel/etc
        var me = this;
        if (header.fireEvent('headertriggerclick', me, header, e, t) !== false && me.fireEvent("headertriggerclick", me, header, e, t) !== false) {
            me.showMenuBy(t, header);
        }
    },

    showMenuBy: function(t, header) {
        var menu = this.getMenu(),
            ascItem  = menu.down('#ascItem'),
            descItem = menu.down('#descItem'),
            sortableMth;

        menu.activeHeader = menu.ownerCt = header;
        menu.setFloatParent(header);
        // TODO: remove coupling to Header's titleContainer el
        header.titleEl.addCls(this.headerOpenCls);

        // enable or disable asc & desc menu items based on header being sortable
        sortableMth = header.sortable ? 'enable' : 'disable';
        if (ascItem) {
            ascItem[sortableMth]();
        }
        if (descItem) {
            descItem[sortableMth]();
        }
        menu.showBy(t);
    },

    // remove the trigger open class when the menu is hidden
    onMenuDeactivate: function() {
        var menu = this.getMenu();
        // TODO: remove coupling to Header's titleContainer el
        menu.activeHeader.titleEl.removeCls(this.headerOpenCls);
    },

    moveHeader: function(fromIdx, toIdx) {

        // An automatically expiring lock
        this.tempLock();
        this.onHeaderMoved(this.move(fromIdx, toIdx), 1, fromIdx, toIdx);
    },

    purgeCache: function() {
        var me = this;
        // Delete column cache - column order has changed.
        delete me.gridDataColumns;
        delete me.hideableColumns;

        // Menu changes when columns are moved. It will be recreated.
        if (me.menu) {
            // Must hide before destroy so that trigger el is deactivated
            me.menu.hide();
            me.menu.destroy();
            delete me.menu;
        }
    },

    onHeaderMoved: function(header, colsToMove, fromIdx, toIdx) {
        var me = this,
            gridSection = me.ownerCt;

        if (gridSection && gridSection.onHeaderMove) {
            gridSection.onHeaderMove(me, header, colsToMove, fromIdx, toIdx);
        }
        me.fireEvent("columnmove", me, header, fromIdx, toIdx);
    },

    /**
     * Gets the menu (and will create it if it doesn't already exist)
     * @private
     */
    getMenu: function() {
        var me = this;

        if (!me.menu) {
            me.menu = new Ext.menu.Menu({
                hideOnParentHide: false,  // Persists when owning ColumnHeader is hidden
                items: me.getMenuItems(),
                listeners: {
                    deactivate: me.onMenuDeactivate,
                    scope: me
                }
            });
            me.updateMenuDisabledState();
            me.fireEvent('menucreate', me, me.menu);
        }
        return me.menu;
    },

    /**
     * Returns an array of menu items to be placed into the shared menu
     * across all headers in this header container.
     * @returns {Array} menuItems
     */
    getMenuItems: function() {
        var me = this,
            menuItems = [],
            hideableColumns = me.enableColumnHide ? me.getColumnMenu(me) : null;

        if (me.sortable) {
            menuItems = [{
                itemId: 'ascItem',
                text: me.sortAscText,
                cls: Ext.baseCSSPrefix + 'hmenu-sort-asc',
                handler: me.onSortAscClick,
                scope: me
            },{
                itemId: 'descItem',
                text: me.sortDescText,
                cls: Ext.baseCSSPrefix + 'hmenu-sort-desc',
                handler: me.onSortDescClick,
                scope: me
            }];
        }
        if (hideableColumns && hideableColumns.length) {
            menuItems.push('-', {
                itemId: 'columnItem',
                text: me.columnsText,
                cls: Ext.baseCSSPrefix + 'cols-icon',
                menu: hideableColumns
            });
        }
        return menuItems;
    },

    // sort asc when clicking on item in menu
    onSortAscClick: function() {
        var menu = this.getMenu(),
            activeHeader = menu.activeHeader;

        activeHeader.setSortState('ASC');
    },

    // sort desc when clicking on item in menu
    onSortDescClick: function() {
        var menu = this.getMenu(),
            activeHeader = menu.activeHeader;

        activeHeader.setSortState('DESC');
    },

    /**
     * Returns an array of menu CheckItems corresponding to all immediate children
     * of the passed Container which have been configured as hideable.
     */
    getColumnMenu: function(headerContainer) {
        var menuItems = [],
            i = 0,
            item,
            items = headerContainer.query('>gridcolumn[hideable]'),
            itemsLn = items.length,
            menuItem;

        for (; i < itemsLn; i++) {
            item = items[i];
            menuItem = new Ext.menu.CheckItem({
                text: item.menuText || item.text,
                checked: !item.hidden,
                hideOnClick: false,
                headerId: item.id,
                menu: item.isGroupHeader ? this.getColumnMenu(item) : undefined,
                checkHandler: this.onColumnCheckChange,
                scope: this
            });
            menuItems.push(menuItem);

            // If the header is ever destroyed - for instance by dragging out the last remaining sub header,
            // then the associated menu item must also be destroyed.
            item.on({
                destroy: Ext.Function.bind(menuItem.destroy, menuItem)
            });
        }
        return menuItems;
    },

    onColumnCheckChange: function(checkItem, checked) {
        var header = Ext.getCmp(checkItem.headerId);
        header[checked ? 'show' : 'hide']();
    },

    /**
     * Get the columns used for generating a template via TableChunker.
     * Returns an array of all columns and their
     *
     *  - dataIndex
     *  - align
     *  - width
     *  - id
     *  - columnId - used to create an identifying CSS class
     *  - cls The tdCls configuration from the Column object
     *
     * @private
     */
    getColumnsForTpl: function(flushCache) {
        var cols    = [],
            headers   = this.getGridColumns(flushCache),
            headersLn = headers.length,
            i = 0,
            header,
            width;

        for (; i < headersLn; i++) {
            header = headers[i];

            if (header.hidden || header.up('headercontainer[hidden=true]')) {
                width = 0;
            } else {
                width = header.getDesiredWidth();
            }
            cols.push({
                dataIndex: header.dataIndex,
                align: header.align,
                width: width,
                id: header.id,
                cls: header.tdCls,
                columnId: header.getItemId()
            });
        }
        return cols;
    },

    /**
     * Returns the number of <b>grid columns</b> descended from this HeaderContainer.
     * Group Columns are HeaderContainers. All grid columns are returned, including hidden ones.
     */
    getColumnCount: function() {
        return this.getGridColumns().length;
    },

    /**
     * Gets the full width of all columns that are visible.
     */
    getFullWidth: function(flushCache) {
        var fullWidth = 0,
            headers = this.getVisibleGridColumns(flushCache),
            headersLn = headers.length,
            i = 0,
            header;
           

        for (; i < headersLn; i++) {
            header = headers[i];
            // use headers getDesiredWidth if its there
            if (header.getDesiredWidth) {
                fullWidth += header.getDesiredWidth() || 0;
            // if injected a diff cmp use getWidth
            } else {
                fullWidth += header.getWidth();
            }
        }
        return fullWidth;
    },

    // invoked internally by a header when not using triStateSorting
    clearOtherSortStates: function(activeHeader) {
        var headers   = this.getGridColumns(),
            headersLn = headers.length,
            i         = 0;

        for (; i < headersLn; i++) {
            if (headers[i] !== activeHeader) {
                // unset the sortstate and dont recurse
                headers[i].setSortState(null, true);
            }
        }
    },

    /**
     * Returns an array of the **visible** columns in the grid. This goes down to the lowest column header
     * level, and does not return **grouped** headers which contain sub headers.
     * @param {Boolean} refreshCache If omitted, the cached set of columns will be returned. Pass true to refresh the cache.
     * @returns {Array}
     */
    getVisibleGridColumns: function(refreshCache) {
        return Ext.ComponentQuery.query(':not([hidden])', this.getGridColumns(refreshCache));
    }, 

    /**
     * Returns an array of all columns which map to Store fields. This goes down to the lowest column header
     * level, and does not return **grouped** headers which contain sub headers.
     * @param {Boolean} refreshCache If omitted, the cached set of columns will be returned. Pass true to refresh the cache.
     * @returns {Array}
     */
    getGridColumns: function(refreshCache) {
        var me = this,
            result = refreshCache ? null : me.gridDataColumns;

        // Not already got the column cache, so collect the base columns
        if (!result) {
            me.gridDataColumns = result = [];
            me.cascade(function(c) {
                if ((c !== me) && !c.isGroupHeader) {
                    result.push(c);
                }
            });
        }

        return result;
    },

    /**
     * @private
     * For use by column headers in determining whether there are any hideable columns when deciding whether or not
     * the header menu should be disabled.
     */
    getHideableColumns: function(refreshCache) {
        var me = this,
            result = refreshCache ? null : me.hideableColumns;

        if (!result) {
            result = me.hideableColumns = me.query('[hideable]');
        }
        return result;
    },

    /**
     * Returns the index of a leaf level header regardless of what the nesting
     * structure is.
     *
     * If a group header is passed, the index of the first leaf level heder within it is returned.
     *
     * @param {Ext.grid.column.Column} header The header to find the index of
     * @return {Number} The index of the specified column header
     */
    getHeaderIndex: function(header) {
        // If we are being asked the index of a group header, find the first leaf header node, and return the index of that
        if (header.isGroupHeader) {
            header = header.down(':not([isgroupHeader])');
        }
        return Ext.Array.indexOf(this.getGridColumns(), header);
    },

    /**
     * Get a leaf level header by index regardless of what the nesting
     * structure is.
     * @param {Number} The column index for which to retrieve the column.
     */
    getHeaderAtIndex: function(index) {
        var columns = this.getGridColumns();
        return columns.length ? columns[index] : null;
    },

    /**
     * When passed a column index, returns the closet *visible* column to that. If the column at the passed index is visible,
     * that is returned. If it is hidden, either the next visible, or the previous visible column is returned.
     * @param {Number} index Position at which to find the closest visible column.
     */
    getVisibleHeaderClosestToIndex: function(index) {
        var result = this.getHeaderAtIndex(index);
        if (result && result.hidden) {
            result = result.next(':not([hidden])') || result.prev(':not([hidden])');
        }
        return result;
    },

    /**
     * Maps the record data to base it on the header id's.
     * This correlates to the markup/template generated by
     * TableChunker.
     */
    prepareData: function(data, rowIdx, record, view, panel) {
        var me        = this,
            obj       = {},
            headers   = me.gridDataColumns || me.getGridColumns(),
            headersLn = headers.length,
            colIdx    = 0,
            header,
            headerId,
            renderer,
            value,
            metaData,
            store = panel.store;

        for (; colIdx < headersLn; colIdx++) {
            metaData = {
                tdCls: '',
                style: ''
            };
            header = headers[colIdx];
            headerId = header.id;
            renderer = header.renderer;
            value = data[header.dataIndex];

            if (typeof renderer == "function") {
                value = renderer.call(
                    header.scope || me.ownerCt,
                    value,
                    // metadata per cell passing an obj by reference so that
                    // it can be manipulated inside the renderer
                    metaData,
                    record,
                    rowIdx,
                    colIdx,
                    store,
                    view
                );
            }

            if (metaData.css) {
                // This warning attribute is used by the compat layer
                obj.cssWarning = true;
                metaData.tdCls = metaData.css;
                delete metaData.css;
            }
            if (me.markDirty) {
                obj[headerId + '-modified'] = record.isModified(header.dataIndex) ? Ext.baseCSSPrefix + 'grid-dirty-cell' : '';
            }
            obj[headerId+'-tdCls'] = metaData.tdCls;
            obj[headerId+'-tdAttr'] = metaData.tdAttr;
            obj[headerId+'-style'] = metaData.style;
            if (typeof value === 'undefined' || value === null || value === '') {
                value = header.emptyCellText;
            }
            obj[headerId] = value;
        }
        return obj;
    },

    expandToFit: function(header) {
        var view = this.view;
        if (view) {
            view.expandToFit(header);
        }
    }
});

/**
 * This class specifies the definition for a column inside a {@link Ext.grid.Panel}. It encompasses
 * both the grid header configuration as well as displaying data within the grid itself. If the
 * {@link #columns} configuration is specified, this column will become a column group and can
 * contain other columns inside. In general, this class will not be created directly, rather
 * an array of column configurations will be passed to the grid:
 *
 *     @example
 *     Ext.create('Ext.data.Store', {
 *         storeId:'employeeStore',
 *         fields:['firstname', 'lastname', 'seniority', 'dep', 'hired'],
 *         data:[
 *             {firstname:"Michael", lastname:"Scott", seniority:7, dep:"Management", hired:"01/10/2004"},
 *             {firstname:"Dwight", lastname:"Schrute", seniority:2, dep:"Sales", hired:"04/01/2004"},
 *             {firstname:"Jim", lastname:"Halpert", seniority:3, dep:"Sales", hired:"02/22/2006"},
 *             {firstname:"Kevin", lastname:"Malone", seniority:4, dep:"Accounting", hired:"06/10/2007"},
 *             {firstname:"Angela", lastname:"Martin", seniority:5, dep:"Accounting", hired:"10/21/2008"}
 *         ]
 *     });
 *
 *     Ext.create('Ext.grid.Panel', {
 *         title: 'Column Demo',
 *         store: Ext.data.StoreManager.lookup('employeeStore'),
 *         columns: [
 *             {text: 'First Name',  dataIndex:'firstname'},
 *             {text: 'Last Name',  dataIndex:'lastname'},
 *             {text: 'Hired Month',  dataIndex:'hired', xtype:'datecolumn', format:'M'},
 *             {text: 'Department (Yrs)', xtype:'templatecolumn', tpl:'{dep} ({seniority})'}
 *         ],
 *         width: 400,
 *         forceFit: true,
 *         renderTo: Ext.getBody()
 *     });
 *
 * # Convenience Subclasses
 *
 * There are several column subclasses that provide default rendering for various data types
 *
 *  - {@link Ext.grid.column.Action}: Renders icons that can respond to click events inline
 *  - {@link Ext.grid.column.Boolean}: Renders for boolean values
 *  - {@link Ext.grid.column.Date}: Renders for date values
 *  - {@link Ext.grid.column.Number}: Renders for numeric values
 *  - {@link Ext.grid.column.Template}: Renders a value using an {@link Ext.XTemplate} using the record data
 *
 * # Setting Sizes
 *
 * The columns are laid out by a {@link Ext.layout.container.HBox} layout, so a column can either
 * be given an explicit width value or a flex configuration. If no width is specified the grid will
 * automatically the size the column to 100px. For column groups, the size is calculated by measuring
 * the width of the child columns, so a width option should not be specified in that case.
 *
 * # Header Options
 *
 *  - {@link #text}: Sets the header text for the column
 *  - {@link #sortable}: Specifies whether the column can be sorted by clicking the header or using the column menu
 *  - {@link #hideable}: Specifies whether the column can be hidden using the column menu
 *  - {@link #menuDisabled}: Disables the column header menu
 *  - {@link #cfg-draggable}: Specifies whether the column header can be reordered by dragging
 *  - {@link #groupable}: Specifies whether the grid can be grouped by the column dataIndex. See also {@link Ext.grid.feature.Grouping}
 *
 * # Data Options
 *
 *  - {@link #dataIndex}: The dataIndex is the field in the underlying {@link Ext.data.Store} to use as the value for the column.
 *  - {@link #renderer}: Allows the underlying store value to be transformed before being displayed in the grid
 */
Ext.define('Ext.grid.column.Column', {
    extend: 'Ext.grid.header.Container',
    alias: 'widget.gridcolumn',
    requires: ['Ext.util.KeyNav', 'Ext.grid.ColumnComponentLayout', 'Ext.grid.ColumnLayout'],
    alternateClassName: 'Ext.grid.Column',

    baseCls: Ext.baseCSSPrefix + 'column-header ' + Ext.baseCSSPrefix + 'unselectable',

    // Not the standard, automatically applied overCls because we must filter out overs of child headers.
    hoverCls: Ext.baseCSSPrefix + 'column-header-over',

    handleWidth: 5,

    sortState: null,

    possibleSortStates: ['ASC', 'DESC'],

    childEls: [
        'titleEl', 'triggerEl', 'textEl'
    ],

    renderTpl:
        '<div id="{id}-titleEl" {tipMarkup}class="' + Ext.baseCSSPrefix + 'column-header-inner">' +
            '<span id="{id}-textEl" class="' + Ext.baseCSSPrefix + 'column-header-text">' +
                '{text}' +
            '</span>' +
            '<tpl if="!menuDisabled">'+
                '<div id="{id}-triggerEl" class="' + Ext.baseCSSPrefix + 'column-header-trigger"></div>'+
            '</tpl>' +
        '</div>' +
        '{%this.renderContainer(out,values)%}',

    /**
     * @cfg {Object[]} columns
     * An optional array of sub-column definitions. This column becomes a group, and houses the columns defined in the
     * `columns` config.
     *
     * Group columns may not be sortable. But they may be hideable and moveable. And you may move headers into and out
     * of a group. Note that if all sub columns are dragged out of a group, the group is destroyed.
     */

    /**
     * @override
     * @cfg {String} stateId
     * An identifier which identifies this column uniquely within the owning grid's {@link #stateful state}.
     * 
     * This does not have to be *globally* unique. A column's state is not saved standalone. It is encapsulated within
     * the owning grid's state.
     */

    /**
     * @cfg {String} dataIndex
     * The name of the field in the grid's {@link Ext.data.Store}'s {@link Ext.data.Model} definition from
     * which to draw the column's value. **Required.**
     */
    dataIndex: null,

    /**
     * @cfg {String} text
     * The header text to be used as innerHTML (html tags are accepted) to display in the Grid.
     * **Note**: to have a clickable header with no text displayed you can use the default of `&#160;` aka `&nbsp;`.
     */
    text: '&#160;',

    /**
     * @cfg {String} header
     * The header text.
     * @deprecated 4.0 Use {@link #text} instead.
     */

    /**
     * @cfg {String} menuText
     * The text to render in the column visibility selection menu for this column.  If not
     * specified, will default to the text value.
     */
    menuText: null,

    /**
     * @cfg {String} [emptyCellText=undefined]
     * The text to diplay in empty cells (cells with a value of `undefined`, `null`, or `''`).
     *
     * Defaults to `&#160;` aka `&nbsp;`.
     */
    emptyCellText: '&#160;',

    /**
     * @cfg {Boolean} sortable
     * False to disable sorting of this column. Whether local/remote sorting is used is specified in
     * `{@link Ext.data.Store#remoteSort}`.
     */
    sortable: true,

    /**
     * @cfg {Boolean} groupable
     * If the grid uses a {@link Ext.grid.feature.Grouping}, this option may be used to disable the header menu
     * item to group by the column selected. By default, the header menu group option is enabled. Set to false to
     * disable (but still show) the group option in the header menu for the column.
     */

    /**
     * @cfg {Boolean} fixed
     * True to prevent the column from being resizable.
     * @deprecated 4.0 Use {@link #resizable} instead.
     */

    /**
     * @cfg {Boolean} [locked=false]
     * True to lock this column in place.  Implicitly enables locking on the grid.
     * See also {@link Ext.grid.Panel#enableLocking}.
     */

    /**
     * @cfg {Boolean} resizable
     * False to prevent the column from being resizable.
     */
    resizable: true,

    /**
     * @cfg {Boolean} hideable
     * False to prevent the user from hiding this column.
     */
    hideable: true,

    /**
     * @cfg {Boolean} menuDisabled
     * True to disable the column header menu containing sort/hide options.
     */
    menuDisabled: false,

    /**
     * @cfg {Function/String} renderer
     * A renderer is an 'interceptor' method which can be used to transform data (value, appearance, etc.)
     * before it is rendered. Example:
     *
     *     {
     *         renderer: function(value){
     *             if (value === 1) {
     *                 return '1 person';
     *             }
     *             return value + ' people';
     *         }
     *     }
     *
     * Additionally a string naming an {@link Ext.util.Format} method can be passed:
     *
     *     {
     *         renderer: 'uppercase'
     *     }
     *
     * @cfg {Object} renderer.value The data value for the current cell
     * @cfg {Object} renderer.metaData A collection of metadata about the current cell; can be used or modified
     * by the renderer. Recognized properties are: tdCls, tdAttr, and style.
     * @cfg {Ext.data.Model} renderer.record The record for the current row
     * @cfg {Number} renderer.rowIndex The index of the current row
     * @cfg {Number} renderer.colIndex The index of the current column
     * @cfg {Ext.data.Store} renderer.store The data store
     * @cfg {Ext.view.View} renderer.view The current view
     * @cfg {String} renderer.return The HTML string to be rendered.
     */
    renderer: false,

    /**
     * @cfg {Object} scope
     * The scope to use when calling the {@link #renderer} function.
     */
    
    /**
     * @method defaultRenderer
     * When defined this will take precedence over the {@link Ext.grid.column.Column#renderer renderer} config.
     * This is meant to be defined in subclasses that wish to supply their own renderer.
     * @protected
     * @template
     */

    /**
     * @cfg {Function} editRenderer
     * A renderer to be used in conjunction with {@link Ext.grid.plugin.RowEditing RowEditing}. This renderer is used to
     * display a custom value for non-editable fields.
     */
    editRenderer: false,

    /**
     * @cfg {String} align
     * Sets the alignment of the header and rendered columns.
     * Possible values are: `'left'`, `'center'`, and `'right'`.
     */
    align: 'left',

    /**
     * @cfg {Boolean} draggable
     * False to disable drag-drop reordering of this column.
     */
    draggable: true,
    
    /**
     * @cfg {String} tooltip
     * A tooltip to display for this column header
     */
    
    /**
     * @cfg {String} [tooltipType="qtip"]
     * The type of {@link #tooltip} to use. Either 'qtip' for QuickTips or 'title' for title attribute.
     */
    tooltipType: 'qtip',

    // Header does not use the typical ComponentDraggable class and therefore we
    // override this with an emptyFn. It is controlled at the HeaderDragZone.
    initDraggable: Ext.emptyFn,

    /**
     * @cfg {String} tdCls
     * A CSS class names to apply to the table cells for this column.
     */

    /**
     * @cfg {Object/String} editor
     * An optional xtype or config object for a {@link Ext.form.field.Field Field} to use for editing.
     * Only applicable if the grid is using an {@link Ext.grid.plugin.Editing Editing} plugin.
     */

    /**
     * @cfg {Object/String} field
     * Alias for {@link #editor}.
     * @deprecated 4.0.5 Use {@link #editor} instead.
     */

    /**
     * @property {Ext.Element} triggerEl
     * Element that acts as button for column header dropdown menu.
     */

    /**
     * @property {Ext.Element} textEl
     * Element that contains the text in column header.
     */

    /**
     * @property {Boolean} isHeader
     * Set in this class to identify, at runtime, instances which are not instances of the
     * HeaderContainer base class, but are in fact, the subclass: Header.
     */
    isHeader: true,

    componentLayout: 'columncomponent',
    
    // We need to override the default component resizable behaviour here
    initResizable: Ext.emptyFn,

    initComponent: function() {
        var me = this,
            renderer;

        if (Ext.isDefined(me.header)) {
            me.text = me.header;
            delete me.header;
        }

        if (!me.triStateSort) {
            me.possibleSortStates.length = 2;
        }

        // A group header; It contains items which are themselves Headers
        if (Ext.isDefined(me.columns)) {
            me.isGroupHeader = true;

            if (me.dataIndex) {
                Ext.Error.raise('Ext.grid.column.Column: Group header may not accept a dataIndex');
            }
            if ((me.width && me.width !== Ext.grid.header.Container.prototype.defaultWidth) || me.flex) {
                Ext.Error.raise('Ext.grid.column.Column: Group header does not support setting explicit widths or flexs. The group header width is calculated by the sum of its children.');
            }

            // The headers become child items
            me.items = me.columns;
            delete me.columns;
            delete me.flex;
            delete me.width;
            me.cls = (me.cls||'') + ' ' + Ext.baseCSSPrefix + 'group-header';
            me.sortable = false;
            me.resizable = false;
            me.align = 'center';
        } else {
            // If we are not a group header, then this is not to be used as a container, and must not have a container layout executed, and it must
            // acquire layout height from DOM content, not from child items.
            me.isContainer = false;

            // Flexed Headers need to have a minWidth defined so that they can never be squeezed out of existence by the
            // HeaderContainer's specialized Box layout, the ColumnLayout. The ColumnLayout's overridden calculateChildboxes
            // method extends the available layout space to accommodate the "desiredWidth" of all the columns.
            if (me.flex) {
                me.minWidth = me.minWidth || Ext.grid.plugin.HeaderResizer.prototype.minColWidth;
            }
        }
        me.addCls(Ext.baseCSSPrefix + 'column-header-align-' + me.align);
        
        renderer = me.renderer;
        if (renderer) {
            // When specifying a renderer as a string, it always resolves
            // to Ext.util.Format
            if (typeof renderer == 'string') {
                me.renderer = Ext.util.Format[renderer];
            }
            me.hasCustomRenderer = true;
        } else if (me.defaultRenderer) {
            me.scope = me;
            me.renderer = me.defaultRenderer;
        }

        // Initialize as a HeaderContainer
        me.callParent(arguments);

        me.on({
            element:  'el',
            click:    me.onElClick,
            dblclick: me.onElDblClick,
            scope:    me
        });
        me.on({
            element:    'titleEl',
            mouseenter: me.onTitleMouseOver,
            mouseleave: me.onTitleMouseOut,
            scope:      me
        });
    },

    onAdd: function(childHeader) {
        childHeader.isSubHeader = true;
        childHeader.addCls(Ext.baseCSSPrefix + 'group-sub-header');
        this.callParent(arguments);
    },

    onRemove: function(childHeader) {
        childHeader.isSubHeader = false;
        childHeader.removeCls(Ext.baseCSSPrefix + 'group-sub-header');
        this.callParent(arguments);
    },

    initRenderData: function() {
        var me = this,
            tipMarkup = '',
            tip = me.tooltip,
            attr = me.tooltipType == 'qtip' ? 'data-qtip' : 'title';
            
        if (!Ext.isEmpty(tip)) {
            tipMarkup = attr + '="' + tip + '" ';
        }
            
        return Ext.applyIf(me.callParent(arguments), {
            text: me.text,
            menuDisabled: me.menuDisabled,
            tipMarkup: tipMarkup
        });
    },

    applyColumnState: function (state) {
        var me = this,
            defined = Ext.isDefined;
            
        // apply any columns
        me.applyColumnsState(state.columns);

        // Only state properties which were saved should be restored.
        // (Only user-changed properties were saved by getState)
        if (defined(state.hidden)) {
            me.hidden = state.hidden;
        }
        if (defined(state.locked)) {
            me.locked = state.locked;
        }
        if (defined(state.sortable)) {
            me.sortable = state.sortable;
        }
        if (defined(state.width)) {
            delete me.flex;
            me.width = state.width;
        } else if (defined(state.flex)) {
            delete me.width;
            me.flex = state.flex;
        }
    },

    getColumnState: function () {
        var me = this,
            items = me.items.items,
            // Check for the existence of items, since column.Action won't have them
            iLen = items ? items.length : 0,
            i,
            columns = [],
            state = {
                id: me.getStateId()
            };

        me.savePropsToState(['hidden', 'sortable', 'locked', 'flex', 'width'], state);
        
        if (me.isGroupHeader) {
            for (i = 0; i < iLen; i++) {
                columns.push(items[i].getColumnState());
            }

            if (columns.length) {
                state.columns = columns;
            }
        } else if (me.isSubHeader && me.ownerCt.hidden) {
            // don't set hidden on the children so they can auto height
            delete me.hidden;
        }

        if ('width' in state) {
            delete state.flex; // width wins
        }
        return state;
    },

    getStateId: function () {
        return this.stateId || this.headerId;
    },

    /**
     * Sets the header text for this Column.
     * @param {String} text The header to display on this Column.
     */
    setText: function(text) {
        this.text = text;
        if (this.rendered) {
            this.textEl.update(text);
        }
    },

    // Find the topmost HeaderContainer: An ancestor which is NOT a Header.
    // Group Headers are themselves HeaderContainers
    getOwnerHeaderCt: function() {
        return this.up(':not([isHeader])');
    },

    /**
     * Returns the index of this column only if this column is a base level Column. If it
     * is a group column, it returns `false`.
     * @return {Number}
     */
    getIndex: function() {
        return this.isGroupColumn ? false : this.getOwnerHeaderCt().getHeaderIndex(this);
    },
    
    /**
     * Returns the index of this column in the list of *visible* columns only if this column is a base level Column. If it
     * is a group column, it returns `false`.
     * @return {Number}
     */
    getVisibleIndex: function() {
        return this.isGroupColumn ? false : Ext.Array.indexOf(this.getOwnerHeaderCt().getVisibleGridColumns(), this);
    },

    beforeRender: function() {
        var me = this,
            grid = me.up('tablepanel');

        me.callParent();

        // Disable the menu if there's nothing to show in the menu, ie:
        // Column cannot be sorted, grouped or locked, and there are no grid columns which may be hidden
        if (grid && (!me.sortable || grid.sortableColumns === false) && !me.groupable &&
                     !me.lockable && (grid.enableColumnHide === false ||
                     !me.getOwnerHeaderCt().getHideableColumns().length)) {
            me.menuDisabled = true;
        }
    },

    afterRender: function() {
        var me = this,
            el = me.el;

        me.callParent(arguments);

        if (me.overCls) {
            el.addClsOnOver(me.overCls);
        }

        // BrowserBug: Ie8 Strict Mode, this will break the focus for this browser,
        // must be fixed when focus management will be implemented.
        if (!Ext.isIE8 || !Ext.isStrict) {
            me.mon(me.getFocusEl(), {
                focus: me.onTitleMouseOver,
                blur: me.onTitleMouseOut,
                scope: me
            });
        }

        me.keyNav = new Ext.util.KeyNav(el, {
            enter: me.onEnterKey,
            down: me.onDownKey,
            scope: me
        });
    },

    // private
    // Inform the header container about the resize
    afterComponentLayout: function(width, height, oldWidth, oldHeight) {
        var me = this,
            ownerHeaderCt = me.getOwnerHeaderCt();

        me.callParent(arguments);

        if (ownerHeaderCt && (oldWidth != null || me.flex) && width !== oldWidth) {
            ownerHeaderCt.onHeaderResize(me, width, true);
        }
    },

    // private
    // After the container has laid out and stretched, it calls this to correctly pad the inner to center the text vertically
    // Total available header height must be passed to enable padding for inner elements to be calculated.
    setPadding: function(headerHeight) {
        var me = this,
            lineHeight = parseInt(me.textEl.getStyle('line-height'), 10),
            textHeight = me.textEl.dom.offsetHeight,
            titleEl = me.titleEl,
            availableHeight = headerHeight - me.el.getBorderWidth('tb'),
            titleElHeight;

        // Top title containing element must stretch to match height of sibling group headers
        if (!me.isGroupHeader) {
            if (titleEl.getHeight() < availableHeight) {
                titleEl.setHeight(availableHeight);
                // the column el's parent element (the 'innerCt') may have an incorrect height
                // at this point because it may have been shrink wrapped prior to the titleEl's
                // height being set, so we need to sync it up here
                me.ownerCt.layout.innerCt.setHeight(headerHeight);
            }
        }
        titleElHeight = titleEl.getViewSize().height;

        // Vertically center the header text in potentially vertically stretched header
        if (textHeight) {
            if(lineHeight) {
                textHeight = Math.ceil(textHeight / lineHeight) * lineHeight;
            }
            titleEl.setStyle({
                paddingTop: Math.floor(Math.max(((titleElHeight - textHeight) / 2), 0)) + 'px'
            });
        }

        // Only IE needs this
        if (Ext.isIE && me.triggerEl) {
            me.triggerEl.setHeight(titleElHeight);
        }
    },

    onDestroy: function() {
        var me = this;
        // force destroy on the textEl, IE reports a leak
        Ext.destroy(me.textEl, me.keyNav, me.field);
        delete me.keyNav;
        me.callParent(arguments);
    },

    onTitleMouseOver: function() {
        this.titleEl.addCls(this.hoverCls);
    },

    onTitleMouseOut: function() {
        this.titleEl.removeCls(this.hoverCls);
    },

    onDownKey: function(e) {
        if (this.triggerEl) {
            this.onElClick(e, this.triggerEl.dom || this.el.dom);
        }
    },

    onEnterKey: function(e) {
        this.onElClick(e, this.el.dom);
    },

    /**
     * @private
     * Double click
     * @param e
     * @param t
     */
    onElDblClick: function(e, t) {
        var me = this,
            ownerCt = me.ownerCt;
        if (ownerCt && Ext.Array.indexOf(ownerCt.items, me) !== 0 && me.isOnLeftEdge(e) ) {
            ownerCt.expandToFit(me.previousSibling('gridcolumn'));
        }
    },

    onElClick: function(e, t) {

        // The grid's docked HeaderContainer.
        var me = this,
            ownerHeaderCt = me.getOwnerHeaderCt();

        if (ownerHeaderCt && !ownerHeaderCt.ddLock) {
            // Firefox doesn't check the current target in a within check.
            // Therefore we check the target directly and then within (ancestors)
            if (me.triggerEl && (e.target === me.triggerEl.dom || t === me.triggerEl.dom || e.within(me.triggerEl))) {
                ownerHeaderCt.onHeaderTriggerClick(me, e, t);
            // if its not on the left hand edge, sort
            } else if (e.getKey() || (!me.isOnLeftEdge(e) && !me.isOnRightEdge(e))) {
                me.toggleSortState();
                ownerHeaderCt.onHeaderClick(me, e, t);
            }
        }
    },

    /**
     * @private
     * Process UI events from the view. The owning TablePanel calls this method, relaying events from the TableView
     * @param {String} type Event type, eg 'click'
     * @param {Ext.view.Table} view TableView Component
     * @param {HTMLElement} cell Cell HtmlElement the event took place within
     * @param {Number} recordIndex Index of the associated Store Model (-1 if none)
     * @param {Number} cellIndex Cell index within the row
     * @param {Ext.EventObject} e Original event
     */
    processEvent: function(type, view, cell, recordIndex, cellIndex, e) {
        return this.fireEvent.apply(this, arguments);
    },

    toggleSortState: function() {
        var me = this,
            idx,
            nextIdx;

        if (me.sortable) {
            idx = Ext.Array.indexOf(me.possibleSortStates, me.sortState);

            nextIdx = (idx + 1) % me.possibleSortStates.length;
            me.setSortState(me.possibleSortStates[nextIdx]);
        }
    },

    doSort: function(state) {
        var ds = this.up('tablepanel').store;
        ds.sort({
            property: this.getSortParam(),
            direction: state
        });
    },

    /**
     * Returns the parameter to sort upon when sorting this header. By default this returns the dataIndex and will not
     * need to be overriden in most cases.
     * @return {String}
     */
    getSortParam: function() {
        return this.dataIndex;
    },

    //setSortState: function(state, updateUI) {
    //setSortState: function(state, doSort) {
    setSortState: function(state, skipClear, initial) {
        var me = this,
            colSortClsPrefix = Ext.baseCSSPrefix + 'column-header-sort-',
            ascCls = colSortClsPrefix + 'ASC',
            descCls = colSortClsPrefix + 'DESC',
            nullCls = colSortClsPrefix + 'null',
            ownerHeaderCt = me.getOwnerHeaderCt(),
            oldSortState = me.sortState;

        if (oldSortState !== state && me.getSortParam()) {
            me.addCls(colSortClsPrefix + state);
            // don't trigger a sort on the first time, we just want to update the UI
            if (state && !initial) {
                me.doSort(state);
            }
            switch (state) {
                case 'DESC':
                    me.removeCls([ascCls, nullCls]);
                    break;
                case 'ASC':
                    me.removeCls([descCls, nullCls]);
                    break;
                case null:
                    me.removeCls([ascCls, descCls]);
                    break;
            }
            if (ownerHeaderCt && !me.triStateSort && !skipClear) {
                ownerHeaderCt.clearOtherSortStates(me);
            }
            me.sortState = state;
            // we only want to fire the event if we have a null state when using triStateSort
            if (me.triStateSort || state != null) {
                ownerHeaderCt.fireEvent('sortchange', ownerHeaderCt, me, state);
            }
        }
    },

    hide: function(fromOwner) {
        var me = this,
            ownerHeaderCt = me.getOwnerHeaderCt(),
            owner = me.ownerCt,
            ownerIsGroup = owner.isGroupHeader,
            item, items, len, i;

        // owner is a group, hide call didn't come from the owner
        if (ownerIsGroup && !fromOwner) {
            items = owner.query('>:not([hidden])');
            // only have one item that isn't hidden, this is it.
            if (items.length === 1 && items[0] == me) {
                me.ownerCt.hide();
                return;
            }
        }

        Ext.suspendLayouts();

        if (me.isGroupHeader) {
            items = me.items.items;
            for (i = 0, len = items.length; i < len; i++) {
                item = items[i];
                if (!item.hidden) {
                    item.hide(true);
                }
            }
        }

        me.callParent();
        // Notify owning HeaderContainer
        ownerHeaderCt.onHeaderHide(me);

        Ext.resumeLayouts(true);
    },

    show: function(fromOwner, fromChild) {
        var me = this,
            ownerCt = me.ownerCt,
            items,
            len, i,
            item;

        Ext.suspendLayouts();

        // If a sub header, ensure that the group header is visible
        if (me.isSubHeader && ownerCt.hidden) {
            ownerCt.show(false, true);
        }

        me.callParent(arguments);

        // If we've just shown a group with all its sub headers hidden, then show all its sub headers
        if (me.isGroupHeader && fromChild !== true && !me.query(':not([hidden])').length) {
            items = me.query('>*');
            for (i = 0, len = items.length; i < len; i++) {
                item = items[i];
                if (item.hidden) {
                    item.show(true);
                }
            }
        }

        Ext.resumeLayouts(true);

        // Notify owning HeaderContainer AFTER layout has been flushed so that header and headerCt widths are all correct
        ownerCt = me.getOwnerHeaderCt();
        if (ownerCt) {
            ownerCt.onHeaderShow(me);
        }
    },

    getDesiredWidth: function() {
        var me = this;
        if (me.rendered && me.componentLayout && me.componentLayout.lastComponentSize) {
            // headers always have either a width or a flex
            // because HeaderContainer sets a defaults width
            // therefore we can ignore the natural width
            // we use the componentLayout's tracked width so that
            // we can calculate the desired width when rendered
            // but not visible because its being obscured by a layout
            return me.componentLayout.lastComponentSize.width;
        // Flexed but yet to be rendered this could be the case
        // where a HeaderContainer and Headers are simply used as data
        // structures and not rendered.
        }
        else if (me.flex) {
            // this is going to be wrong, the defaultWidth
            return me.width;
        }
        else {
            return me.width;
        }
    },

    getCellSelector: function() {
        return '.' + Ext.baseCSSPrefix + 'grid-cell-' + this.getItemId();
    },

    getCellInnerSelector: function() {
        return this.getCellSelector() + ' .' + Ext.baseCSSPrefix + 'grid-cell-inner';
    },

    isOnLeftEdge: function(e) {
        return (e.getXY()[0] - this.el.getLeft() <= this.handleWidth);
    },

    isOnRightEdge: function(e) {
        return (this.el.getRight() - e.getXY()[0] <= this.handleWidth);
    }

    // intentionally omit getEditor and setEditor definitions bc we applyIf into columns
    // when the editing plugin is injected

    /**
     * @method getEditor
     * Retrieves the editing field for editing associated with this header. Returns false if there is no field
     * associated with the Header the method will return false. If the field has not been instantiated it will be
     * created. Note: These methods only has an implementation if a Editing plugin has been enabled on the grid.
     * @param {Object} record The {@link Ext.data.Model Model} instance being edited.
     * @param {Object} defaultField An object representing a default field to be created
     * @return {Ext.form.field.Field} field
     */
    /**
     * @method setEditor
     * Sets the form field to be used for editing. Note: This method only has an implementation if an Editing plugin has
     * been enabled on the grid.
     * @param {Object} field An object representing a field to be created. If no xtype is specified a 'textfield' is
     * assumed.
     */
});

/**
 * This is a utility class that can be passed into a {@link Ext.grid.column.Column} as a column config that provides
 * an automatic row numbering column.
 * 
 * Usage:
 *
 *     columns: [
 *         {xtype: 'rownumberer'},
 *         {text: "Company", flex: 1, sortable: true, dataIndex: 'company'},
 *         {text: "Price", width: 120, sortable: true, renderer: Ext.util.Format.usMoney, dataIndex: 'price'},
 *         {text: "Change", width: 120, sortable: true, dataIndex: 'change'},
 *         {text: "% Change", width: 120, sortable: true, dataIndex: 'pctChange'},
 *         {text: "Last Updated", width: 120, sortable: true, renderer: Ext.util.Format.dateRenderer('m/d/Y'), dataIndex: 'lastChange'}
 *     ]
 *
 */
Ext.define('Ext.grid.RowNumberer', {
    extend: 'Ext.grid.column.Column',
    alias: 'widget.rownumberer',

    /**
     * @cfg {String} text
     * Any valid text or HTML fragment to display in the header cell for the row number column.
     */
    text: "&#160",

    /**
     * @cfg {Number} width
     * The default width in pixels of the row number column.
     */
    width: 23,

    /**
     * @cfg {Boolean} sortable
     * @hide
     */
    sortable: false,
    
    /**
     * @cfg {Boolean} [draggable=false]
     * False to disable drag-drop reordering of this column.
     */
    draggable: false,

    align: 'right',

    constructor : function(config){

        // Copy the prototype's default width setting into an instance property to provide
        // a default width which will not be overridden by AbstractContainer.applyDefaults use of Ext.applyIf
        this.width = this.width;

        this.callParent(arguments);
        if (this.rowspan) {
            this.renderer = Ext.Function.bind(this.renderer, this);
        }
    },

    // private
    resizable: false,
    hideable: false,
    menuDisabled: true,
    dataIndex: '',
    cls: Ext.baseCSSPrefix + 'row-numberer',
    rowspan: undefined,

    // private
    renderer: function(value, metaData, record, rowIdx, colIdx, store) {
        if (this.rowspan){
            metaData.cellAttr = 'rowspan="'+this.rowspan+'"';
        }

        metaData.tdCls = Ext.baseCSSPrefix + 'grid-cell-special';
        return store.indexOfTotal(record) + 1;
    }
});

/**
 * A Grid header type which renders an icon, or a series of icons in a grid cell, and offers a scoped click
 * handler for each icon.
 *
 *     @example
 *     Ext.create('Ext.data.Store', {
 *         storeId:'employeeStore',
 *         fields:['firstname', 'lastname', 'seniority', 'dep', 'hired'],
 *         data:[
 *             {firstname:"Michael", lastname:"Scott"},
 *             {firstname:"Dwight", lastname:"Schrute"},
 *             {firstname:"Jim", lastname:"Halpert"},
 *             {firstname:"Kevin", lastname:"Malone"},
 *             {firstname:"Angela", lastname:"Martin"}
 *         ]
 *     });
 *
 *     Ext.create('Ext.grid.Panel', {
 *         title: 'Action Column Demo',
 *         store: Ext.data.StoreManager.lookup('employeeStore'),
 *         columns: [
 *             {text: 'First Name',  dataIndex:'firstname'},
 *             {text: 'Last Name',  dataIndex:'lastname'},
 *             {
 *                 xtype:'actioncolumn',
 *                 width:50,
 *                 items: [{
 *                     icon: 'extjs/examples/shared/icons/fam/cog_edit.png',  // Use a URL in the icon config
 *                     tooltip: 'Edit',
 *                     handler: function(grid, rowIndex, colIndex) {
 *                         var rec = grid.getStore().getAt(rowIndex);
 *                         alert("Edit " + rec.get('firstname'));
 *                     }
 *                 },{
 *                     icon: 'extjs/examples/restful/images/delete.png',
 *                     tooltip: 'Delete',
 *                     handler: function(grid, rowIndex, colIndex) {
 *                         var rec = grid.getStore().getAt(rowIndex);
 *                         alert("Terminate " + rec.get('firstname'));
 *                     }
 *                 }]
 *             }
 *         ],
 *         width: 250,
 *         renderTo: Ext.getBody()
 *     });
 *
 * The action column can be at any index in the columns array, and a grid can have any number of
 * action columns.
 */
Ext.define('Ext.grid.column.Action', {
    extend: 'Ext.grid.column.Column',
    alias: ['widget.actioncolumn'],
    alternateClassName: 'Ext.grid.ActionColumn',

    /**
     * @cfg {String} icon
     * The URL of an image to display as the clickable element in the column.
     *
     * Defaults to `{@link Ext#BLANK_IMAGE_URL}`.
     */
    /**
     * @cfg {String} iconCls
     * A CSS class to apply to the icon image. To determine the class dynamically, configure the Column with
     * a `{@link #getClass}` function.
     */
    /**
     * @cfg {Function} handler
     * A function called when the icon is clicked.
     * @cfg {Ext.view.Table} handler.view The owning TableView.
     * @cfg {Number} handler.rowIndex The row index clicked on.
     * @cfg {Number} handler.colIndex The column index clicked on.
     * @cfg {Object} handler.item The clicked item (or this Column if multiple {@link #cfg-items} were not configured).
     * @cfg {Event} handler.e The click event.
     * @cfg {Ext.data.Model} handler.record The Record underlying the clicked row.
     * @cfg {HtmlElement} row The table row clicked upon.
     */
    /**
     * @cfg {Object} scope
     * The scope (**this** reference) in which the `{@link #handler}` and `{@link #getClass}` fuctions are executed.
     * Defaults to this Column.
     */
    /**
     * @cfg {String} tooltip
     * A tooltip message to be displayed on hover. {@link Ext.tip.QuickTipManager#init Ext.tip.QuickTipManager} must
     * have been initialized.
     */
    /**
     * @cfg {Boolean} disabled
     * If true, the action will not respond to click events, and will be displayed semi-opaque.
     */
    /**
     * @cfg {Boolean} [stopSelection=true]
     * Prevent grid selection upon mousedown.
     */
    /**
     * @cfg {Function} getClass
     * A function which returns the CSS class to apply to the icon image.
     *
     * @cfg {Object} getClass.v The value of the column's configured field (if any).
     *
     * @cfg {Object} getClass.metadata An object in which you may set the following attributes:
     * @cfg {String} getClass.metadata.css A CSS class name to add to the cell's TD element.
     * @cfg {String} getClass.metadata.attr An HTML attribute definition string to apply to the data container
     * element *within* the table cell (e.g. 'style="color:red;"').
     *
     * @cfg {Ext.data.Model} getClass.r The Record providing the data.
     *
     * @cfg {Number} getClass.rowIndex The row index..
     *
     * @cfg {Number} getClass.colIndex The column index.
     *
     * @cfg {Ext.data.Store} getClass.store The Store which is providing the data Model.
     */
    /**
     * @cfg {Object[]} items
     * An Array which may contain multiple icon definitions, each element of which may contain:
     *
     * @cfg {String} items.icon The url of an image to display as the clickable element in the column.
     *
     * @cfg {String} items.iconCls A CSS class to apply to the icon image. To determine the class dynamically,
     * configure the item with a `getClass` function.
     *
     * @cfg {Function} items.getClass A function which returns the CSS class to apply to the icon image.
     * @cfg {Object} items.getClass.v The value of the column's configured field (if any).
     * @cfg {Object} items.getClass.metadata An object in which you may set the following attributes:
     * @cfg {String} items.getClass.metadata.css A CSS class name to add to the cell's TD element.
     * @cfg {String} items.getClass.metadata.attr An HTML attribute definition string to apply to the data
     * container element _within_ the table cell (e.g. 'style="color:red;"').
     * @cfg {Ext.data.Model} items.getClass.r The Record providing the data.
     * @cfg {Number} items.getClass.rowIndex The row index..
     * @cfg {Number} items.getClass.colIndex The column index.
     * @cfg {Ext.data.Store} items.getClass.store The Store which is providing the data Model.
     *
     * @cfg {Function} items.handler A function called when the icon is clicked.
     *
     * @cfg {Object} items.scope The scope (`this` reference) in which the `handler` and `getClass` functions
     * are executed. Fallback defaults are this Column's configured scope, then this Column.
     *
     * @cfg {String} items.tooltip A tooltip message to be displayed on hover.
     * @cfg {Boolean} items.disabled If true, the action will not respond to click events, and will be displayed semi-opaque.
     * {@link Ext.tip.QuickTipManager#init Ext.tip.QuickTipManager} must have been initialized.
     */
    /**
     * @property {Array} items
     * An array of action items copied from the configured {@link #cfg-items items} configuration. Each will have
     * an `enable` and `disable` method added which will enable and disable the associated action, and
     * update the displayed icon accordingly.
     */

    actionIdRe: new RegExp(Ext.baseCSSPrefix + 'action-col-(\\d+)'),

    /**
     * @cfg {String} altText
     * The alt text to use for the image element.
     */
    altText: '',

    /**
     * @cfg {String} menuText=[<i>Actions</i>]
     * Text to display in this column's menu item if no {@link #text} was specified as a header.
     */
    menuText: '<i>Actions</i>',

    sortable: false,

    constructor: function(config) {
        var me = this,
            cfg = Ext.apply({}, config),
            items = cfg.items || [me],
            hasGetClass,
            i,
            len;


        me.origRenderer = cfg.renderer || me.renderer;
        me.origScope = cfg.scope || me.scope;
        
        delete me.renderer;
        delete me.scope;
        delete cfg.renderer;
        delete cfg.scope;
        
        // This is a Container. Delete the items config to be reinstated after construction.
        delete cfg.items;
        me.callParent([cfg]);

        // Items is an array property of ActionColumns
        me.items = items;
        
        for (i = 0, len = items.length; i < len; ++i) {
            if (items[i].getClass) {
                hasGetClass = true;
                break;
            }
        }
        
        // Also need to check for getClass, since it changes how the cell renders
        if (me.origRenderer || hasGetClass) {
            me.hasCustomRenderer = true;
        }
    },
    
    // Renderer closure iterates through items creating an <img> element for each and tagging with an identifying
    // class name x-action-col-{n}
    defaultRenderer: function(v, meta){
        var me = this,
            prefix = Ext.baseCSSPrefix,
            scope = me.origScope || me,
            items = me.items,
            len = items.length,
            i = 0,
            item;
            
        // Allow a configured renderer to create initial value (And set the other values in the "metadata" argument!)
        v = Ext.isFunction(me.origRenderer) ? me.origRenderer.apply(scope, arguments) || '' : '';

        meta.tdCls += ' ' + Ext.baseCSSPrefix + 'action-col-cell';
        for (; i < len; i++) {
            item = items[i];
            
            // Only process the item action setup once.
            if (!item.hasActionConfiguration) {
                
                // Apply our documented default to all items
                item.stopSelection = me.stopSelection;
                item.disable = Ext.Function.bind(me.disableAction, me, [i], 0);
                item.enable = Ext.Function.bind(me.enableAction, me, [i], 0);
                item.hasActionConfiguration = true;
            }
            
            v += '<img alt="' + (item.altText || me.altText) + '" src="' + (item.icon || Ext.BLANK_IMAGE_URL) +
                '" class="' + prefix + 'action-col-icon ' + prefix + 'action-col-' + String(i) + ' ' + (item.disabled ? prefix + 'item-disabled' : ' ') +
                ' ' + (Ext.isFunction(item.getClass) ? item.getClass.apply(item.scope || scope, arguments) : (item.iconCls || me.iconCls || '')) + '"' +
                ((item.tooltip) ? ' data-qtip="' + item.tooltip + '"' : '') + ' />';
        }
        return v;    
    },

    /**
     * Enables this ActionColumn's action at the specified index.
     * @param {Number/Ext.grid.column.Action} index
     * @param {Boolean} [silent=false]
     */
    enableAction: function(index, silent) {
        var me = this;

        if (!index) {
            index = 0;
        } else if (!Ext.isNumber(index)) {
            index = Ext.Array.indexOf(me.items, index);
        }
        me.items[index].disabled = false;
        me.up('tablepanel').el.select('.' + Ext.baseCSSPrefix + 'action-col-' + index).removeCls(me.disabledCls);
        if (!silent) {
            me.fireEvent('enable', me);
        }
    },

    /**
     * Disables this ActionColumn's action at the specified index.
     * @param {Number/Ext.grid.column.Action} index
     * @param {Boolean} [silent=false]
     */
    disableAction: function(index, silent) {
        var me = this;

        if (!index) {
            index = 0;
        } else if (!Ext.isNumber(index)) {
            index = Ext.Array.indexOf(me.items, index);
        }
        me.items[index].disabled = true;
        me.up('tablepanel').el.select('.' + Ext.baseCSSPrefix + 'action-col-' + index).addCls(me.disabledCls);
        if (!silent) {
            me.fireEvent('disable', me);
        }
    },

    destroy: function() {
        delete this.items;
        delete this.renderer;
        return this.callParent(arguments);
    },

    /**
     * @private
     * Process and refire events routed from the GridView's processEvent method.
     * Also fires any configured click handlers. By default, cancels the mousedown event to prevent selection.
     * Returns the event handler's status to allow canceling of GridView's bubbling process.
     */
    processEvent : function(type, view, cell, recordIndex, cellIndex, e, record, row){
        var me = this,
            target = e.getTarget(),
            match,
            item, fn,
            key = type == 'keydown' && e.getKey();

        // If the target was not within a cell (ie it's a keydown event from the View), then
        // rely on the selection data injected by View.processUIEvent to grab the
        // first action icon from the selected cell.
        if (key && !Ext.fly(target).findParent(view.cellSelector)) {
            target = Ext.fly(cell).down('.' + Ext.baseCSSPrefix + 'action-col-icon', true);
        }

        // NOTE: The statement below tests the truthiness of an assignment.
        if (target && (match = target.className.match(me.actionIdRe))) {
            item = me.items[parseInt(match[1], 10)];
            if (item) {
                if (type == 'click' || (key == e.ENTER || key == e.SPACE)) {
                    fn = item.handler || me.handler;
                    if (fn && !item.disabled) {
                        fn.call(item.scope || me.origScope || me, view, recordIndex, cellIndex, item, e, record, row);
                    }
                } else if (type == 'mousedown' && item.stopSelection !== false) {
                    return false;
                }
            }
        }
        return me.callParent(arguments);
    },

    cascade: function(fn, scope) {
        fn.call(scope||this, this);
    },

    // Private override because this cannot function as a Container, and it has an items property which is an Array, NOT a MixedCollection.
    getRefItems: function() {
        return [];
    }
});

/**
 * A Column definition class which renders boolean data fields.  See the {@link Ext.grid.column.Column#xtype xtype}
 * config option of {@link Ext.grid.column.Column} for more details.
 *
 *     @example
 *     Ext.create('Ext.data.Store', {
 *        storeId:'sampleStore',
 *        fields:[
 *            {name: 'framework', type: 'string'},
 *            {name: 'rocks', type: 'boolean'}
 *        ],
 *        data:{'items':[
 *            { 'framework': "Ext JS 4",     'rocks': true  },
 *            { 'framework': "Sencha Touch", 'rocks': true  },
 *            { 'framework': "Ext GWT",      'rocks': true  }, 
 *            { 'framework': "Other Guys",   'rocks': false } 
 *        ]},
 *        proxy: {
 *            type: 'memory',
 *            reader: {
 *                type: 'json',
 *                root: 'items'
 *            }
 *        }
 *     });
 *     
 *     Ext.create('Ext.grid.Panel', {
 *         title: 'Boolean Column Demo',
 *         store: Ext.data.StoreManager.lookup('sampleStore'),
 *         columns: [
 *             { text: 'Framework',  dataIndex: 'framework', flex: 1 },
 *             {
 *                 xtype: 'booleancolumn', 
 *                 text: 'Rocks',
 *                 trueText: 'Yes',
 *                 falseText: 'No', 
 *                 dataIndex: 'rocks'
 *             }
 *         ],
 *         height: 200,
 *         width: 400,
 *         renderTo: Ext.getBody()
 *     });
 */
Ext.define('Ext.grid.column.Boolean', {
    extend: 'Ext.grid.column.Column',
    alias: ['widget.booleancolumn'],
    alternateClassName: 'Ext.grid.BooleanColumn',

    //<locale>
    /**
     * @cfg {String} trueText
     * The string returned by the renderer when the column value is not falsey.
     */
    trueText: 'true',
    //</locale>

    //<locale>
    /**
     * @cfg {String} falseText
     * The string returned by the renderer when the column value is falsey (but not undefined).
     */
    falseText: 'false',
    //</locale>

    /**
     * @cfg {String} undefinedText
     * The string returned by the renderer when the column value is undefined.
     */
    undefinedText: '&#160;',

    /**
     * @cfg renderer
     * @hide
     */
    /**
     * @cfg scope
     * @hide
     */

    defaultRenderer: function(value){
        if (value === undefined) {
            return this.undefinedText;
        }
        
        if (!value || value === 'false') {
            return this.falseText;
        }
        return this.trueText;
    }
});
/**
 * A Column definition class which renders a passed date according to the default locale, or a configured
 * {@link #format}.
 *
 *     @example
 *     Ext.create('Ext.data.Store', {
 *         storeId:'sampleStore',
 *         fields:[
 *             { name: 'symbol', type: 'string' },
 *             { name: 'date',   type: 'date' },
 *             { name: 'change', type: 'number' },
 *             { name: 'volume', type: 'number' },
 *             { name: 'topday', type: 'date' }                        
 *         ],
 *         data:[
 *             { symbol: "msft",   date: '2011/04/22', change: 2.43, volume: 61606325, topday: '04/01/2010' },
 *             { symbol: "goog",   date: '2011/04/22', change: 0.81, volume: 3053782,  topday: '04/11/2010' },
 *             { symbol: "apple",  date: '2011/04/22', change: 1.35, volume: 24484858, topday: '04/28/2010' },            
 *             { symbol: "sencha", date: '2011/04/22', change: 8.85, volume: 5556351,  topday: '04/22/2010' }            
 *         ]
 *     });
 *     
 *     Ext.create('Ext.grid.Panel', {
 *         title: 'Date Column Demo',
 *         store: Ext.data.StoreManager.lookup('sampleStore'),
 *         columns: [
 *             { text: 'Symbol',   dataIndex: 'symbol', flex: 1 },
 *             { text: 'Date',     dataIndex: 'date',   xtype: 'datecolumn',   format:'Y-m-d' },
 *             { text: 'Change',   dataIndex: 'change', xtype: 'numbercolumn', format:'0.00' },
 *             { text: 'Volume',   dataIndex: 'volume', xtype: 'numbercolumn', format:'0,000' },
 *             { text: 'Top Day',  dataIndex: 'topday', xtype: 'datecolumn',   format:'l' }            
 *         ],
 *         height: 200,
 *         width: 450,
 *         renderTo: Ext.getBody()
 *     });
 */
Ext.define('Ext.grid.column.Date', {
    extend: 'Ext.grid.column.Column',
    alias: ['widget.datecolumn'],
    requires: ['Ext.Date'],
    alternateClassName: 'Ext.grid.DateColumn',

    /**
     * @cfg {String} format
     * A formatting string as used by {@link Ext.Date#format} to format a Date for this Column.
     *
     * Defaults to the default date from {@link Ext.Date#defaultFormat} which itself my be overridden
     * in a locale file.
     */
    /**
     * @cfg renderer
     * @hide
     */
    /**
     * @cfg scope
     * @hide
     */

    initComponent: function(){
        if (!this.format) {
            this.format = Ext.Date.defaultFormat;
        }
        
        this.callParent(arguments);
    },
    
    defaultRenderer: function(value){
        return Ext.util.Format.date(value, this.format);
    }
});
/**
 * A Column definition class which renders a numeric data field according to a {@link #format} string.
 *
 *     @example
 *     Ext.create('Ext.data.Store', {
 *        storeId:'sampleStore',
 *        fields:[
 *            { name: 'symbol', type: 'string' },
 *            { name: 'price',  type: 'number' },
 *            { name: 'change', type: 'number' },
 *            { name: 'volume', type: 'number' }
 *        ],
 *        data:[
 *            { symbol: "msft",   price: 25.76,  change: 2.43, volume: 61606325 },
 *            { symbol: "goog",   price: 525.73, change: 0.81, volume: 3053782  },
 *            { symbol: "apple",  price: 342.41, change: 1.35, volume: 24484858 },
 *            { symbol: "sencha", price: 142.08, change: 8.85, volume: 5556351  }
 *        ]
 *     });
 *     
 *     Ext.create('Ext.grid.Panel', {
 *         title: 'Number Column Demo',
 *         store: Ext.data.StoreManager.lookup('sampleStore'),
 *         columns: [
 *             { text: 'Symbol',         dataIndex: 'symbol', flex: 1 },
 *             { text: 'Current Price',  dataIndex: 'price',  renderer: Ext.util.Format.usMoney },
 *             { text: 'Change',         dataIndex: 'change', xtype: 'numbercolumn', format:'0.00' },
 *             { text: 'Volume',         dataIndex: 'volume', xtype: 'numbercolumn', format:'0,000' }
 *         ],
 *         height: 200,
 *         width: 400,
 *         renderTo: Ext.getBody()
 *     });
 */
Ext.define('Ext.grid.column.Number', {
    extend: 'Ext.grid.column.Column',
    alias: ['widget.numbercolumn'],
    requires: ['Ext.util.Format'],
    alternateClassName: 'Ext.grid.NumberColumn',

    //<locale>
    /**
     * @cfg {String} format
     * A formatting string as used by {@link Ext.util.Format#number} to format a numeric value for this Column.
     */
    format : '0,000.00',
    //</locale>

    /**
     * @cfg renderer
     * @hide
     */
    /**
     * @cfg scope
     * @hide
     */

    defaultRenderer: function(value){
        return Ext.util.Format.number(value, this.format);
    }
});
/**
 * A Column definition class which renders a value by processing a {@link Ext.data.Model Model}'s
 * {@link Ext.data.Model#persistenceProperty data} using a {@link #tpl configured}
 * {@link Ext.XTemplate XTemplate}.
 * 
 *     @example
 *     Ext.create('Ext.data.Store', {
 *         storeId:'employeeStore',
 *         fields:['firstname', 'lastname', 'seniority', 'department'],
 *         groupField: 'department',
 *         data:[
 *             { firstname: "Michael", lastname: "Scott",   seniority: 7, department: "Management" },
 *             { firstname: "Dwight",  lastname: "Schrute", seniority: 2, department: "Sales" },
 *             { firstname: "Jim",     lastname: "Halpert", seniority: 3, department: "Sales" },
 *             { firstname: "Kevin",   lastname: "Malone",  seniority: 4, department: "Accounting" },
 *             { firstname: "Angela",  lastname: "Martin",  seniority: 5, department: "Accounting" }
 *         ]
 *     });
 *     
 *     Ext.create('Ext.grid.Panel', {
 *         title: 'Column Template Demo',
 *         store: Ext.data.StoreManager.lookup('employeeStore'),
 *         columns: [
 *             { text: 'Full Name',       xtype: 'templatecolumn', tpl: '{firstname} {lastname}', flex:1 },
 *             { text: 'Department (Yrs)', xtype: 'templatecolumn', tpl: '{department} ({seniority})' }
 *         ],
 *         height: 200,
 *         width: 300,
 *         renderTo: Ext.getBody()
 *     });
 */
Ext.define('Ext.grid.column.Template', {
    extend: 'Ext.grid.column.Column',
    alias: ['widget.templatecolumn'],
    requires: ['Ext.XTemplate'],
    alternateClassName: 'Ext.grid.TemplateColumn',

    /**
     * @cfg {String/Ext.XTemplate} tpl
     * An {@link Ext.XTemplate XTemplate}, or an XTemplate *definition string* to use to process a
     * {@link Ext.data.Model Model}'s {@link Ext.data.Model#persistenceProperty data} to produce a
     * column's rendered value.
     */
    /**
     * @cfg renderer
     * @hide
     */
    /**
     * @cfg scope
     * @hide
     */

    initComponent: function(){
        var me = this;
        me.tpl = (!Ext.isPrimitive(me.tpl) && me.tpl.compile) ? me.tpl : new Ext.XTemplate(me.tpl);
        // Set this here since the template may access any record values,
        // so we must always run the update for this column
        me.hasCustomRenderer = true;
        me.callParent(arguments);
    },
    
    defaultRenderer: function(value, meta, record) {
        var data = Ext.apply({}, record.data, record.getAssociatedData());
        return this.tpl.apply(data);
    }
});

/**
 * This class provides an abstract grid editing plugin on selected {@link Ext.grid.column.Column columns}.
 * The editable columns are specified by providing an {@link Ext.grid.column.Column#editor editor}
 * in the {@link Ext.grid.column.Column column configuration}.
 *
 * **Note:** This class should not be used directly. See {@link Ext.grid.plugin.CellEditing} and
 * {@link Ext.grid.plugin.RowEditing}.
 */
Ext.define('Ext.grid.plugin.Editing', {
    alias: 'editing.editing',
    extend: 'Ext.AbstractPlugin',

    requires: [
        'Ext.grid.column.Column',
        'Ext.util.KeyNav'
    ],

    mixins: {
        observable: 'Ext.util.Observable'
    },

    /**
     * @cfg {Number} clicksToEdit
     * The number of clicks on a grid required to display the editor.
     * The only accepted values are **1** and **2**.
     */
    clicksToEdit: 2,

    /**
     * @cfg {String} triggerEvent
     * The event which triggers editing. Supercedes the {@link #clicksToEdit} configuration. Maybe one of:
     *
     *  * cellclick
     *  * celldblclick
     *  * cellfocus
     *  * rowfocus
     */
    triggerEvent: undefined,

    // private
    defaultFieldXType: 'textfield',

    // cell, row, form
    editStyle: '',

    constructor: function(config) {
        var me = this;

        me.addEvents(
            /**
             * @event beforeedit
             * Fires before editing is triggered. Return false from event handler to stop the editing.
             *
             * @param {Ext.grid.plugin.Editing} editor
             * @param {Object} e An edit event with the following properties:
             *
             * - grid - The grid
             * - record - The record being edited
             * - field - The field name being edited
             * - value - The value for the field being edited.
             * - row - The grid table row
             * - column - The grid {@link Ext.grid.column.Column Column} defining the column that is being edited.
             * - rowIdx - The row index that is being edited
             * - colIdx - The column index that is being edited
             * - cancel - Set this to true to cancel the edit or return false from your handler.
             * - originalValue - Alias for value (only when using {@link Ext.grid.plugin.CellEditing CellEditing}).
             */
            'beforeedit',

            /**
             * @event edit
             * Fires after a editing. Usage example:
             *
             *     grid.on('edit', function(editor, e) {
             *         // commit the changes right after editing finished
             *         e.record.commit();
             *     });
             *
             * @param {Ext.grid.plugin.Editing} editor
             * @param {Object} e An edit event with the following properties:
             *
             * - grid - The grid
             * - record - The record that was edited
             * - field - The field name that was edited
             * - value - The value being set
             * - row - The grid table row
             * - column - The grid {@link Ext.grid.column.Column Column} defining the column that was edited.
             * - rowIdx - The row index that was edited
             * - colIdx - The column index that was edited
             * - originalValue - The original value for the field, before the edit (only when using {@link Ext.grid.plugin.CellEditing CellEditing})
             * - originalValues - The original values for the field, before the edit (only when using {@link Ext.grid.plugin.RowEditing RowEditing})
             * - newValues - The new values being set (only when using {@link Ext.grid.plugin.RowEditing RowEditing})
             * - view - The grid view (only when using {@link Ext.grid.plugin.RowEditing RowEditing})
             * - store - The grid store (only when using {@link Ext.grid.plugin.RowEditing RowEditing})
             */
            'edit',

            /**
             * @event validateedit
             * Fires after editing, but before the value is set in the record. Return false from event handler to
             * cancel the change.
             *
             * Usage example showing how to remove the red triangle (dirty record indicator) from some records (not all). By
             * observing the grid's validateedit event, it can be cancelled if the edit occurs on a targeted row (for example)
             * and then setting the field's new value in the Record directly:
             *
             *     grid.on('validateedit', function(editor, e) {
             *       var myTargetRow = 6;
             *
             *       if (e.rowIdx == myTargetRow) {
             *         e.cancel = true;
             *         e.record.data[e.field] = e.value;
             *       }
             *     });
             *
             * @param {Ext.grid.plugin.Editing} editor
             * @param {Object} e An edit event with the following properties:
             *
             * - grid - The grid
             * - record - The record being edited
             * - field - The field name being edited
             * - value - The value being set
             * - row - The grid table row
             * - column - The grid {@link Ext.grid.column.Column Column} defining the column that is being edited.
             * - rowIdx - The row index that is being edited
             * - colIdx - The column index that is being edited
             * - cancel - Set this to true to cancel the edit or return false from your handler.
             * - originalValue - The original value for the field, before the edit (only when using {@link Ext.grid.plugin.CellEditing CellEditing})
             * - originalValues - The original values for the field, before the edit (only when using {@link Ext.grid.plugin.RowEditing RowEditing})
             * - newValues - The new values being set (only when using {@link Ext.grid.plugin.RowEditing RowEditing})
             * - view - The grid view (only when using {@link Ext.grid.plugin.RowEditing RowEditing})
             * - store - The grid store (only when using {@link Ext.grid.plugin.RowEditing RowEditing})
             */
            'validateedit',
            /**
             * @event canceledit
             * Fires when the user started editing but then cancelled the edit.
             * @param {Ext.grid.plugin.Editing} editor
             * @param {Object} e An edit event with the following properties:
             * 
             * - grid - The grid
             * - record - The record that was edited
             * - field - The field name that was edited
             * - value - The value being set
             * - row - The grid table row
             * - column - The grid {@link Ext.grid.column.Column Column} defining the column that was edited.
             * - rowIdx - The row index that was edited
             * - colIdx - The column index that was edited
             * - view - The grid view
             * - store - The grid store
             */
            'canceledit'

        );
        me.callParent(arguments);
        me.mixins.observable.constructor.call(me);
        // TODO: Deprecated, remove in 5.0
        me.on("edit", function(editor, e) {
            me.fireEvent("afteredit", editor, e);
        });
    },

    // private
    init: function(grid) {
        var me = this;

        me.grid = grid;
        me.view = grid.view;
        me.initEvents();
        me.mon(grid, 'reconfigure', me.onReconfigure, me);
        me.onReconfigure();

        grid.relayEvents(me, [
            /**
             * @event beforeedit
             * Forwarded event from Ext.grid.plugin.Editing.
             * @member Ext.panel.Table
             * @inheritdoc Ext.grid.plugin.Editing#beforeedit
             */
            'beforeedit',
            /**
             * @event edit
             * Forwarded event from Ext.grid.plugin.Editing.
             * @member Ext.panel.Table
             * @inheritdoc Ext.grid.plugin.Editing#edit
             */
            'edit',
            /**
             * @event validateedit
             * Forwarded event from Ext.grid.plugin.Editing.
             * @member Ext.panel.Table
             * @inheritdoc Ext.grid.plugin.Editing#validateedit
             */
            'validateedit',
            /**
             * @event canceledit
             * Forwarded event from Ext.grid.plugin.Editing.
             * @member Ext.panel.Table
             * @inheritdoc Ext.grid.plugin.Editing#canceledit
             */
            'canceledit'
        ]);
        // Marks the grid as editable, so that the SelectionModel
        // can make appropriate decisions during navigation
        grid.isEditable = true;
        grid.editingPlugin = grid.view.editingPlugin = me;
    },

    /**
     * Fires after the grid is reconfigured
     * @private
     */
    onReconfigure: function() {
        this.initFieldAccessors(this.view.getGridColumns());
    },

    /**
     * @private
     * AbstractComponent calls destroy on all its plugins at destroy time.
     */
    destroy: function() {
        var me = this,
            grid = me.grid;

        Ext.destroy(me.keyNav);
        me.removeFieldAccessors(grid.getView().getGridColumns());

        // Clear all listeners from all our events, clear all managed listeners we added to other Observables
        me.clearListeners();

        delete me.grid.editingPlugin;
        delete me.grid.view.editingPlugin;
        delete me.grid;
        delete me.view;
        delete me.editor;
        delete me.keyNav;
    },

    // private
    getEditStyle: function() {
        return this.editStyle;
    },

    // private
    initFieldAccessors: function(columns) {
        columns = [].concat(columns);

        var me   = this,
            c,
            cLen = columns.length,
            column;

        for (c = 0; c < cLen; c++) {
            column = columns[c];

            Ext.applyIf(column, {
                getEditor: function(record, defaultField) {
                    return me.getColumnField(this, defaultField);
                },

                setEditor: function(field) {
                    me.setColumnField(this, field);
                }
            });
        }
    },

    // private
    removeFieldAccessors: function(columns) {
        columns = [].concat(columns);

        var c,
            cLen = columns.length,
            column;

        for (c = 0; c < cLen; c++) {
            column = columns[c];

            delete column.getEditor;
            delete column.setEditor;
        }
    },

    // private
    // remaps to the public API of Ext.grid.column.Column.getEditor
    getColumnField: function(columnHeader, defaultField) {
        var field = columnHeader.field;

        if (!field && columnHeader.editor) {
            field = columnHeader.editor;
            delete columnHeader.editor;
        }

        if (!field && defaultField) {
            field = defaultField;
        }

        if (field) {
            if (Ext.isString(field)) {
                field = { xtype: field };
            }
            if (!field.isFormField) {
                field = Ext.ComponentManager.create(field, this.defaultFieldXType);
            }
            columnHeader.field = field;
 
            Ext.apply(field, {
                name: columnHeader.dataIndex
            });

            return field;
        }
    },

    // private
    // remaps to the public API of Ext.grid.column.Column.setEditor
    setColumnField: function(column, field) {
        if (Ext.isObject(field) && !field.isFormField) {
            field = Ext.ComponentManager.create(field, this.defaultFieldXType);
        }
        column.field = field;
    },

    // private
    initEvents: function() {
        var me = this;
        me.initEditTriggers();
        me.initCancelTriggers();
    },

    // @abstract
    initCancelTriggers: Ext.emptyFn,
    
    // private
    initEditTriggers: function() {
        var me = this,
            view = me.view;

        // Listen for the edit trigger event.
        if (me.triggerEvent == 'cellfocus') {
            me.mon(view, 'cellfocus', me.onCellFocus, me);
        } else if (me.triggerEvent == 'rowfocus') {
            me.mon(view, 'rowfocus', me.onRowFocus, me);
        } else {

            // Prevent the View from processing when the SelectionModel focuses.
            // This is because the SelectionModel processes the mousedown event, and
            // focusing causes a scroll which means that the subsequent mouseup might
            // take place at a different document XY position, and will therefore
            // not trigger a click.
            // This Editor must call the View's focusCell method directly when we recieve a request to edit
            if (view.selModel.isCellModel) {
                view.onCellFocus = Ext.Function.bind(me.beforeViewCellFocus, me);
            }

            // Listen for whichever click event we are configured to use
            me.mon(view, me.triggerEvent || ('cell' + (me.clicksToEdit === 1 ? 'click' : 'dblclick')), me.onCellClick, me);
        }
        
        // add/remove header event listeners need to be added immediately because
        // columns can be added/removed before render
        me.initAddRemoveHeaderEvents()
        // wait until render to initialize keynav events since they are attached to an element
        view.on('render', me.initKeyNavHeaderEvents, me, {single: true});
    },

    // Override of View's method so that we can pre-empt the View's processing if the view is being triggered by a mousedown
    beforeViewCellFocus: function(position) {
        // Pass call on to view if the navigation is from the keyboard, or we are not going to edit this cell.
        if (this.view.selModel.keyNavigation || !this.editing || !this.isCellEditable || !this.isCellEditable(position.row, position.columnHeader)) {
            this.view.focusCell.apply(this.view, arguments);
        }
    },

    // private. Used if we are triggered by the rowfocus event
    onRowFocus: function(record, row, rowIdx) {
        this.startEdit(row, 0);
    },

    // private. Used if we are triggered by the cellfocus event
    onCellFocus: function(record, cell, position) {
        this.startEdit(position.row, position.column);
    },

    // private. Used if we are triggered by a cellclick event
    onCellClick: function(view, cell, colIdx, record, row, rowIdx, e) {
        // cancel editing if the element that was clicked was a tree expander
        if(!view.expanderSelector || !e.getTarget(view.expanderSelector)) {
            this.startEdit(record, view.getHeaderAtIndex(colIdx));
        }
    },

    initAddRemoveHeaderEvents: function(){
        var me = this;
        me.mon(me.grid.headerCt, {
            scope: me,
            add: me.onColumnAdd,
            remove: me.onColumnRemove
        });
    },

    initKeyNavHeaderEvents: function() {
        var me = this;

        me.keyNav = Ext.create('Ext.util.KeyNav', me.view.el, {
            enter: me.onEnterKey,
            esc: me.onEscKey,
            scope: me
        });
    },
    
    // private
    onColumnAdd: function(ct, column) {
        if (column.isHeader) {
            this.initFieldAccessors(column);
        }
    },

    // private
    onColumnRemove: function(ct, column) {
        if (column.isHeader) {
            this.removeFieldAccessors(column);
        }
    },

    // private
    onEnterKey: function(e) {
        var me = this,
            grid = me.grid,
            selModel = grid.getSelectionModel(),
            record,
            pos,
            columnHeader = grid.headerCt.getHeaderAtIndex(0);

        // Calculate editing start position from SelectionModel
        // CellSelectionModel
        if (selModel.getCurrentPosition) {
            pos = selModel.getCurrentPosition();
            if (pos) {
                record = grid.store.getAt(pos.row);
                columnHeader = grid.headerCt.getHeaderAtIndex(pos.column);
            }
        }
        // RowSelectionModel
        else {
            record = selModel.getLastSelected();
        }

        // If there was a selection to provide a starting context...
        if (record && columnHeader) {
            me.startEdit(record, columnHeader);
        }
    },

    // private
    onEscKey: function(e) {
        this.cancelEdit();
    },

    /**
     * @private
     * @template
     * Template method called before editing begins.
     * @param {Object} context The current editing context
     * @return {Boolean} Return false to cancel the editing process
     */
    beforeEdit: Ext.emptyFn,

    /**
     * Starts editing the specified record, using the specified Column definition to define which field is being edited.
     * @param {Ext.data.Model/Number} record The Store data record which backs the row to be edited, or index of the record in Store.
     * @param {Ext.grid.column.Column/Number} columnHeader The Column object defining the column to be edited, or index of the column.
     */
    startEdit: function(record, columnHeader) {
        var me = this,
            context = me.getEditingContext(record, columnHeader);

        if (context == null || me.beforeEdit(context) === false || me.fireEvent('beforeedit', me, context) === false || context.cancel || !me.grid.view.isVisible(true)) {
            return false;
        }

        me.context = context;

        /**
         * @property {Boolean} editing
         * Set to `true` while the editing plugin is active and an Editor is visible.
         */
        me.editing = true;
    },

    // TODO: Have this use a new class Ext.grid.CellContext for use here, and in CellSelectionModel
    /**
     * @private
     * Collects all information necessary for any subclasses to perform their editing functions.
     * @param record
     * @param columnHeader
     * @returns {Object/undefined} The editing context based upon the passed record and column
     */
    getEditingContext: function(record, columnHeader) {
        var me = this,
            grid = me.grid,
            view = grid.getView(),
            node = view.getNode(record),
            rowIdx, colIdx;

        // An intervening listener may have deleted the Record
        if (!node) {
            return;
        }

        // Coerce the column index to the closest visible column
        columnHeader = grid.headerCt.getVisibleHeaderClosestToIndex(Ext.isNumber(columnHeader) ? columnHeader : columnHeader.getIndex());

        // No corresponding column. Possible if all columns have been moved to the other side of a lockable grid pair
        if (!columnHeader) {
            return;
        }

        colIdx = columnHeader.getIndex();

        if (Ext.isNumber(record)) {
            // look up record if numeric row index was passed
            rowIdx = record;
            record = view.getRecord(node);
        } else {
            rowIdx = view.indexOf(node);
        }

        return {
            grid   : grid,
            record : record,
            field  : columnHeader.dataIndex,
            value  : record.get(columnHeader.dataIndex),
            row    : view.getNode(rowIdx),
            column : columnHeader,
            rowIdx : rowIdx,
            colIdx : colIdx
        };
    },

    /**
     * Cancels any active edit that is in progress.
     */
    cancelEdit: function() {
        var me = this;

        me.editing = false;
        me.fireEvent('canceledit', me, me.context);
    },

    /**
     * Completes the edit if there is an active edit in progress.
     */
    completeEdit: function() {
        var me = this;

        if (me.editing && me.validateEdit()) {
            me.fireEvent('edit', me, me.context);
        }

        delete me.context;
        me.editing = false;
    },

    // @abstract
    validateEdit: function() {
        var me = this,
            context = me.context;

        return me.fireEvent('validateedit', me, context) !== false && !context.cancel;
    }
});

/**
 * The Ext.grid.plugin.CellEditing plugin injects editing at a cell level for a Grid. Only a single
 * cell will be editable at a time. The field that will be used for the editor is defined at the
 * {@link Ext.grid.column.Column#editor editor}. The editor can be a field instance or a field configuration.
 *
 * If an editor is not specified for a particular column then that cell will not be editable and it will
 * be skipped when activated via the mouse or the keyboard.
 *
 * The editor may be shared for each column in the grid, or a different one may be specified for each column.
 * An appropriate field type should be chosen to match the data structure that it will be editing. For example,
 * to edit a date, it would be useful to specify {@link Ext.form.field.Date} as the editor.
 *
 * ## Example
 *
 * A grid with editor for the name and the email columns:
 *
 *     @example
 *     Ext.create('Ext.data.Store', {
 *         storeId:'simpsonsStore',
 *         fields:['name', 'email', 'phone'],
 *         data:{'items':[
 *             {"name":"Lisa", "email":"lisa@simpsons.com", "phone":"555-111-1224"},
 *             {"name":"Bart", "email":"bart@simpsons.com", "phone":"555-222-1234"},
 *             {"name":"Homer", "email":"home@simpsons.com", "phone":"555-222-1244"},
 *             {"name":"Marge", "email":"marge@simpsons.com", "phone":"555-222-1254"}
 *         ]},
 *         proxy: {
 *             type: 'memory',
 *             reader: {
 *                 type: 'json',
 *                 root: 'items'
 *             }
 *         }
 *     });
 *
 *     Ext.create('Ext.grid.Panel', {
 *         title: 'Simpsons',
 *         store: Ext.data.StoreManager.lookup('simpsonsStore'),
 *         columns: [
 *             {header: 'Name',  dataIndex: 'name', editor: 'textfield'},
 *             {header: 'Email', dataIndex: 'email', flex:1,
 *                 editor: {
 *                     xtype: 'textfield',
 *                     allowBlank: false
 *                 }
 *             },
 *             {header: 'Phone', dataIndex: 'phone'}
 *         ],
 *         selType: 'cellmodel',
 *         plugins: [
 *             Ext.create('Ext.grid.plugin.CellEditing', {
 *                 clicksToEdit: 1
 *             })
 *         ],
 *         height: 200,
 *         width: 400,
 *         renderTo: Ext.getBody()
 *     });
 *
 * This requires a little explanation. We're passing in `store` and `columns` as normal, but
 * we also specify a {@link Ext.grid.column.Column#field field} on two of our columns. For the
 * Name column we just want a default textfield to edit the value, so we specify 'textfield'.
 * For the Email column we customized the editor slightly by passing allowBlank: false, which
 * will provide inline validation.
 *
 * To support cell editing, we also specified that the grid should use the 'cellmodel'
 * {@link Ext.grid.Panel#selType selType}, and created an instance of the CellEditing plugin,
 * which we configured to activate each editor after a single click.
 *
 */
Ext.define('Ext.grid.plugin.CellEditing', {
    alias: 'plugin.cellediting',
    extend: 'Ext.grid.plugin.Editing',
    requires: ['Ext.grid.CellEditor', 'Ext.util.DelayedTask'],

    constructor: function() {
        /**
         * @event beforeedit
         * Fires before cell editing is triggered. Return false from event handler to stop the editing.
         *
         * @param {Ext.grid.plugin.CellEditing} editor
         * @param {Object} e An edit event with the following properties:
         *
         * - grid - The grid
         * - record - The record being edited
         * - field - The field name being edited
         * - value - The value for the field being edited.
         * - row - The grid table row
         * - column - The grid {@link Ext.grid.column.Column Column} defining the column that is being edited.
         * - rowIdx - The row index that is being edited
         * - colIdx - The column index that is being edited
         * - cancel - Set this to true to cancel the edit or return false from your handler.
         */
        /**
         * @event edit
         * Fires after a cell is edited. Usage example:
         *
         *     grid.on('edit', function(editor, e) {
         *         // commit the changes right after editing finished
         *         e.record.commit();
         *     });
         *
         * @param {Ext.grid.plugin.CellEditing} editor
         * @param {Object} e An edit event with the following properties:
         *
         * - grid - The grid
         * - record - The record that was edited
         * - field - The field name that was edited
         * - value - The value being set
         * - originalValue - The original value for the field, before the edit.
         * - row - The grid table row
         * - column - The grid {@link Ext.grid.column.Column Column} defining the column that was edited.
         * - rowIdx - The row index that was edited
         * - colIdx - The column index that was edited
         */
        /**
         * @event validateedit
         * Fires after a cell is edited, but before the value is set in the record. Return false from event handler to
         * cancel the change.
         *
         * Usage example showing how to remove the red triangle (dirty record indicator) from some records (not all). By
         * observing the grid's validateedit event, it can be cancelled if the edit occurs on a targeted row (for
         * example) and then setting the field's new value in the Record directly:
         *
         *     grid.on('validateedit', function(editor, e) {
         *       var myTargetRow = 6;
         *
         *       if (e.row == myTargetRow) {
         *         e.cancel = true;
         *         e.record.data[e.field] = e.value;
         *       }
         *     });
         *
         * @param {Ext.grid.plugin.CellEditing} editor
         * @param {Object} e An edit event with the following properties:
         *
         * - grid - The grid
         * - record - The record being edited
         * - field - The field name being edited
         * - value - The value being set
         * - originalValue - The original value for the field, before the edit.
         * - row - The grid table row
         * - column - The grid {@link Ext.grid.column.Column Column} defining the column that is being edited.
         * - rowIdx - The row index that is being edited
         * - colIdx - The column index that is being edited
         * - cancel - Set this to true to cancel the edit or return false from your handler.
         */
        /**
         * @event canceledit
         * Fires when the user started editing a cell but then cancelled the edit.
         * @param {Ext.grid.plugin.CellEditing} editor
         * @param {Object} e An edit event with the following properties:
         * 
         * - grid - The grid
         * - record - The record that was edited
         * - field - The field name that was edited
         * - value - The value being set
         * - row - The grid table row
         * - column - The grid {@link Ext.grid.column.Column Column} defining the column that was edited.
         * - rowIdx - The row index that was edited
         * - colIdx - The column index that was edited
         */

        this.callParent(arguments);
        this.editors = new Ext.util.MixedCollection(false, function(editor) {
            return editor.editorId;
        });
        this.editTask = new Ext.util.DelayedTask();
    },

    onReconfigure: function(){
        this.editors.clear();
        this.callParent();    
    },

    /**
     * @private
     * AbstractComponent calls destroy on all its plugins at destroy time.
     */
    destroy: function() {
        var me = this;
        me.editTask.cancel();
        me.editors.each(Ext.destroy, Ext);
        me.editors.clear();
        me.callParent(arguments);
    },
    
    onBodyScroll: function() {
        var me = this,
            ed = me.getActiveEditor(),
            scroll = me.view.el.getScroll();

        // Scroll happened during editing...
        if (ed && ed.editing) {
            // Terminate editing only on vertical scroll. Horiz scroll can be caused by tabbing between cells.
            if (scroll.top !== me.scroll.top) {
                if (ed.field) {
                    if (ed.field.triggerBlur) {
                        ed.field.triggerBlur();
                    } else {
                        ed.field.blur();
                    }
                }
            }
            // Horiz scroll just requires that the editor be realigned.
            else {
                 ed.realign();
            }
        }
        me.scroll = scroll;
    },

    // private
    // Template method called from base class's initEvents
    initCancelTriggers: function() {
        var me   = this,
            grid = me.grid,
            view = grid.view;
            
        view.addElListener('mousewheel', me.cancelEdit, me);
        me.mon(view, 'bodyscroll', me.onBodyScroll, me);
        me.mon(grid, {
            columnresize: me.cancelEdit,
            columnmove: me.cancelEdit,
            scope: me
        });
    },

    isCellEditable: function(record, columnHeader) {
        var me = this,
            context = me.getEditingContext(record, columnHeader);

        if (me.grid.view.isVisible(true) && context) {
            columnHeader = context.column;
            record = context.record;
            if (columnHeader && me.getEditor(record, columnHeader)) {
                return true;
            }
        }
    },

    /**
     * Starts editing the specified record, using the specified Column definition to define which field is being edited.
     * @param {Ext.data.Model} record The Store data record which backs the row to be edited.
     * @param {Ext.grid.column.Column} columnHeader The Column object defining the column to be edited.
     * @return `true` if editing was started, `false` otherwise.
     */
    startEdit: function(record, columnHeader) {
        var me = this,
            context = me.getEditingContext(record, columnHeader),
            value, ed;

        // Complete the edit now, before getting the editor's target
        // cell DOM element. Completing the edit causes a row refresh.
        // Also allows any post-edit events to take effect before continuing
        me.completeEdit();

        // Cancel editing if EditingContext could not be found (possibly because record has been deleted by an intervening listener), or if the grid view is not currently visible
        if (!context || !me.grid.view.isVisible(true)) {
            return false;
        }

        record = context.record;
        columnHeader = context.column;

        // See if the field is editable for the requested record
        if (columnHeader && !columnHeader.getEditor(record)) {
            return false;
        }

        value = record.get(columnHeader.dataIndex);
        context.originalValue = context.value = value;
        if (me.beforeEdit(context) === false || me.fireEvent('beforeedit', me, context) === false || context.cancel) {
            return false;
        }

        ed = me.getEditor(record, columnHeader);

        // Whether we are going to edit or not, ensure the edit cell is scrolled into view
        me.grid.view.cancelFocus();
        me.view.focusCell({
            row: context.rowIdx,
            column: context.colIdx
        });
        if (ed) {
            me.editTask.delay(15, me.showEditor, me, [ed, context, value]);
            return true;
        }
        return false;
    },

    showEditor: function(ed, context, value) {
        var me = this,
            record = context.record,
            columnHeader = context.column,
            sm = me.grid.getSelectionModel(),
            selection = sm.getCurrentPosition();

        me.context = context;
        me.setActiveEditor(ed);
        me.setActiveRecord(record);
        me.setActiveColumn(columnHeader);

        // Select cell on edit only if it's not the currently selected cell
        if (sm.selectByPosition && (!selection || selection.column !== context.colIdx || selection.row !== context.rowIdx)) {
            sm.selectByPosition({
                row: context.rowIdx,
                column: context.colIdx
            });
        }

        ed.startEdit(me.getCell(record, columnHeader), value);
        me.editing = true;
        me.scroll = me.view.el.getScroll();
    },

    completeEdit: function() {
        var activeEd = this.getActiveEditor();
        if (activeEd) {
            activeEd.completeEdit();
            this.editing = false;
        }
    },

    // internal getters/setters
    setActiveEditor: function(ed) {
        this.activeEditor = ed;
    },

    getActiveEditor: function() {
        return this.activeEditor;
    },

    setActiveColumn: function(column) {
        this.activeColumn = column;
    },

    getActiveColumn: function() {
        return this.activeColumn;
    },

    setActiveRecord: function(record) {
        this.activeRecord = record;
    },

    getActiveRecord: function() {
        return this.activeRecord;
    },

    getEditor: function(record, column) {
        var me = this,
            editors = me.editors,
            editorId = column.getItemId(),
            editor = editors.getByKey(editorId);

        if (editor) {
            return editor;
        } else {
            editor = column.getEditor(record);
            if (!editor) {
                return false;
            }

            // Allow them to specify a CellEditor in the Column
            // Either way, the Editor is a floating Component, and must be attached to an ownerCt
            // which it uses to traverse upwards to find a ZIndexManager at render time.
            if (!(editor instanceof Ext.grid.CellEditor)) {
                editor = new Ext.grid.CellEditor({
                    editorId: editorId,
                    field: editor,
                    ownerCt: me.grid
                });
            } else {
                editor.ownerCt = me.grid;
            }
            editor.editingPlugin = me;
            editor.isForTree = me.grid.isTree;
            editor.on({
                scope: me,
                specialkey: me.onSpecialKey,
                complete: me.onEditComplete,
                canceledit: me.cancelEdit
            });
            editors.add(editor);
            return editor;
        }
    },
    
    // inherit docs
    setColumnField: function(column, field) {
        var ed = this.editors.getByKey(column.getItemId());
        Ext.destroy(ed, column.field);
        this.editors.removeAtKey(column.getItemId());
        this.callParent(arguments);
    },

    /**
     * Gets the cell (td) for a particular record and column.
     * @param {Ext.data.Model} record
     * @param {Ext.grid.column.Column} column
     * @private
     */
    getCell: function(record, column) {
        return this.grid.getView().getCell(record, column);
    },

    onSpecialKey: function(ed, field, e) {
        var me = this,
            grid = me.grid,
            sm;
            
        if (e.getKey() === e.TAB) {
            e.stopEvent();
            
            if (ed) {
                // Allow the field to act on tabs before onEditorTab, which ends
                // up calling completeEdit. This is useful for picker type fields.
                ed.onEditorTab(e);
            }
            
            sm = grid.getSelectionModel();
            if (sm.onEditorTab) {
                sm.onEditorTab(me, e);
            }
        }
    },

    onEditComplete : function(ed, value, startValue) {
        var me = this,
            grid = me.grid,
            activeColumn = me.getActiveColumn(),
            sm = grid.getSelectionModel(),
            record;

        if (activeColumn) {
            record = me.context.record;

            me.setActiveEditor(null);
            me.setActiveColumn(null);
            me.setActiveRecord(null);
    
            if (!me.validateEdit()) {
                return;
            }

            // Only update the record if the new value is different than the
            // startValue. When the view refreshes its el will gain focus
            if (!record.isEqual(value, startValue)) {
                record.set(activeColumn.dataIndex, value);
            }

            // Restore focus back to the view's element.
            if (sm.setCurrentPosition) {
                sm.setCurrentPosition(sm.getCurrentPosition());
            }
            grid.getView().getEl(activeColumn).focus();

            me.context.value = value;
            me.fireEvent('edit', me, me.context);
        }
    },

    /**
     * Cancels any active editing.
     */
    cancelEdit: function() {
        var me = this,
            activeEd = me.getActiveEditor(),
            viewEl = me.grid.getView().getEl(me.getActiveColumn());

        me.setActiveEditor(null);
        me.setActiveColumn(null);
        me.setActiveRecord(null);
        if (activeEd) {
            activeEd.cancelEdit();
            viewEl.focus();
            me.callParent(arguments);
        }
    },

    /**
     * Starts editing by position (row/column)
     * @param {Object} position A position with keys of row and column.
     */
    startEditByPosition: function(position) {

        // Coerce the edit column to the closest visible column
        position.column = this.view.getHeaderCt().getVisibleHeaderClosestToIndex(position.column).getIndex();

        return this.startEdit(position.row, position.column);
    }
});

/**
 * A custom HeaderContainer for the {@link Ext.grid.property.Grid}.
 * Generally it should not need to be used directly.
 */
Ext.define('Ext.grid.property.HeaderContainer', {

    extend: 'Ext.grid.header.Container',

    alternateClassName: 'Ext.grid.PropertyColumnModel',
    
    nameWidth: 115,

    // private - strings used for locale support
    //<locale>
    nameText : 'Name',
    //</locale>
    //<locale>
    valueText : 'Value',
    //</locale>
    //<locale>
    dateFormat : 'm/j/Y',
    //</locale>
    //<locale>
    trueText: 'true',
    //</locale>
    //<locale>
    falseText: 'false',
    //</locale>

    // private
    nameColumnCls: Ext.baseCSSPrefix + 'grid-property-name',

    /**
     * Creates new HeaderContainer.
     * @param {Ext.grid.property.Grid} grid The grid this store will be bound to
     * @param {Object} source The source data config object
     */
    constructor : function(grid, store) {
        var me = this;
        
        me.grid = grid;
        me.store = store;
        me.callParent([{
            items: [{
                header: me.nameText,
                width: grid.nameColumnWidth || me.nameWidth,
                sortable: grid.sortableColumns,
                dataIndex: grid.nameField,
                renderer: Ext.Function.bind(me.renderProp, me),
                itemId: grid.nameField,
                menuDisabled :true,
                tdCls: me.nameColumnCls
            }, {
                header: me.valueText,
                renderer: Ext.Function.bind(me.renderCell, me),
                getEditor: Ext.Function.bind(me.getCellEditor, me),
                sortable: grid.sortableColumns,
                flex: 1,
                fixed: true,
                dataIndex: grid.valueField,
                itemId: grid.valueField,
                menuDisabled: true
            }]
        }]);
    },
    
    getCellEditor: function(record){
        return this.grid.getCellEditor(record, this);
    },

    // private
    // Render a property name cell
    renderProp : function(v) {
        return this.getPropertyName(v);
    },

    // private
    // Render a property value cell
    renderCell : function(val, meta, rec) {
        var me = this,
            renderer = me.grid.customRenderers[rec.get(me.grid.nameField)],
            result = val;

        if (renderer) {
            return renderer.apply(me, arguments);
        }
        if (Ext.isDate(val)) {
            result = me.renderDate(val);
        } else if (Ext.isBoolean(val)) {
            result = me.renderBool(val);
        }
        return Ext.util.Format.htmlEncode(result);
    },

    // private
    renderDate : Ext.util.Format.date,

    // private
    renderBool : function(bVal) {
        return this[bVal ? 'trueText' : 'falseText'];
    },

    // private
    // Renders custom property names instead of raw names if defined in the Grid
    getPropertyName : function(name) {
        var pn = this.grid.propertyNames;
        return pn && pn[name] ? pn[name] : name;
    }
});



/**
 * @private
 */
Ext.define('Ext.grid.ViewDropZone', {
    extend: 'Ext.view.DropZone',

    indicatorHtml: '<div class="' + Ext.baseCSSPrefix + 'grid-drop-indicator-left"></div><div class="' + Ext.baseCSSPrefix + 'grid-drop-indicator-right"></div>',
    indicatorCls: Ext.baseCSSPrefix + 'grid-drop-indicator',

    handleNodeDrop : function(data, record, position) {
        var view = this.view,
            store = view.getStore(),
            index, records, i, len;

        // If the copy flag is set, create a copy of the Models with the same IDs
        if (data.copy) {
            records = data.records;
            data.records = [];
            for (i = 0, len = records.length; i < len; i++) {
                data.records.push(records[i].copy(records[i].getId()));
            }
        } else {
            /*
             * Remove from the source store. We do this regardless of whether the store
             * is the same bacsue the store currently doesn't handle moving records
             * within the store. In the future it should be possible to do this.
             * Here was pass the isMove parameter if we're moving to the same view.
             */
            data.view.store.remove(data.records, data.view === view);
        }

        index = store.indexOf(record);

        // 'after', or undefined (meaning a drop at index -1 on an empty View)...
        if (position !== 'before') {
            index++;
        }
        store.insert(index, data.records);
        view.getSelectionModel().select(data.records);
    }
});
/**
 * @private
 *
 * Lockable is a private mixin which injects lockable behavior into any
 * TablePanel subclass such as GridPanel or TreePanel. TablePanel will
 * automatically inject the Ext.grid.Lockable mixin in when one of the
 * these conditions are met:
 *
 *  - The TablePanel has the lockable configuration set to true
 *  - One of the columns in the TablePanel has locked set to true/false
 *
 * Each TablePanel subclass must register an alias. It should have an array
 * of configurations to copy to the 2 separate tablepanel's that will be generated
 * to note what configurations should be copied. These are named normalCfgCopy and
 * lockedCfgCopy respectively.
 *
 * Columns which are locked must specify a fixed width. They do NOT support a
 * flex width.
 *
 * Configurations which are specified in this class will be available on any grid or
 * tree which is using the lockable functionality.
 */
Ext.define('Ext.grid.Lockable', {

    requires: [
        'Ext.grid.LockingView',
        'Ext.view.Table'
    ],

    /**
     * @cfg {Boolean} syncRowHeight Synchronize rowHeight between the normal and
     * locked grid view. This is turned on by default. If your grid is guaranteed
     * to have rows of all the same height, you should set this to false to
     * optimize performance.
     */
    syncRowHeight: true,

    /**
     * @cfg {String} subGridXType The xtype of the subgrid to specify. If this is
     * not specified lockable will determine the subgrid xtype to create by the
     * following rule. Use the superclasses xtype if the superclass is NOT
     * tablepanel, otherwise use the xtype itself.
     */

    /**
     * @cfg {Object} lockedViewConfig A view configuration to be applied to the
     * locked side of the grid. Any conflicting configurations between lockedViewConfig
     * and viewConfig will be overwritten by the lockedViewConfig.
     */

    /**
     * @cfg {Object} normalViewConfig A view configuration to be applied to the
     * normal/unlocked side of the grid. Any conflicting configurations between normalViewConfig
     * and viewConfig will be overwritten by the normalViewConfig.
     */

    headerCounter: 0,

    /**
     * @cfg {Number} scrollDelta
     * Number of pixels to scroll when scrolling the locked section with mousewheel.
     */
    scrollDelta: 40,
    
    /**
     * @cfg {Object} lockedGridConfig
     * Any special configuration options for the locked part of the grid
     */
    
    /**
     * @cfg {Object} normalGridConfig
     * Any special configuration options for the normal part of the grid
     */

    // i8n text
    //<locale>
    unlockText: 'Unlock',
    //</locale>
    //<locale>
    lockText: 'Lock',
    //</locale>

    determineXTypeToCreate: function() {
        var me = this,
            typeToCreate,
            xtypes, xtypesLn, xtype, superxtype;

        if (me.subGridXType) {
            typeToCreate = me.subGridXType;
        } else {
            xtypes     = this.getXTypes().split('/');
            xtypesLn   = xtypes.length;
            xtype      = xtypes[xtypesLn - 1];
            superxtype = xtypes[xtypesLn - 2];

            if (superxtype !== 'tablepanel') {
                typeToCreate = superxtype;
            } else {
                typeToCreate = xtype;
            }
        }

        return typeToCreate;
    },

    // injectLockable will be invoked before initComponent's parent class implementation
    // is called, so throughout this method this. are configurations
    injectLockable: function() {
        // ensure lockable is set to true in the TablePanel
        this.lockable = true;
        // Instruct the TablePanel it already has a view and not to create one.
        // We are going to aggregate 2 copies of whatever TablePanel we are using
        this.hasView = true;

        var me = this,
            // If the OS does not show a space-taking scrollbar, the locked view can be overflow:auto
            scrollLocked = Ext.getScrollbarSize().width === 0,
            store = me.store = Ext.StoreManager.lookup(me.store),
            // xtype of this class, 'treepanel' or 'gridpanel'
            // (Note: this makes it a requirement that any subclass that wants to use lockable functionality needs to register an
            // alias.)
            xtype = me.determineXTypeToCreate(),
            // share the selection model
            selModel = me.getSelectionModel(),
            lockedFeatures,
            normalFeatures,
            lockedPlugins,
            normalPlugins,
            lockedGrid,
            normalGrid,
            i, len,
            columns,
            lockedHeaderCt,
            normalHeaderCt,
            lockedView,
            normalView,
            listeners;

        lockedFeatures = me.constructFeatures();

        // Clone any Features in the Array which are already instantiated
        me.cloneFeatures();
        normalFeatures = me.constructFeatures();

        lockedPlugins = me.constructPlugins();

        // Clone any Plugins in the Array which are already instantiated
        me.clonePlugins();
        normalPlugins = me.constructPlugins();

        // The "shell" Panel which just acts as a Container for the two grids must not use the features and plugins
        delete me.features;
        delete me.plugins;

        // Each Feature must have a reference to its counterpart on the opposite side of the locking view
        for (i = 0, len = (lockedFeatures ? lockedFeatures.length : 0); i < len; i++) {
            lockedFeatures[i].lockingPartner = normalFeatures[i];
            normalFeatures[i].lockingPartner = lockedFeatures[i];
        }

        lockedGrid = Ext.apply({
            xtype: xtype,
            store: store,
            scrollerOwner: false,
            // Lockable does NOT support animations for Tree
            enableAnimations: false,
            scroll: scrollLocked ? 'vertical' : false,
            selModel: selModel,
            border: false,
            cls: Ext.baseCSSPrefix + 'grid-inner-locked',
            isLayoutRoot: function() {
                return false;
            },
            features: lockedFeatures,
            plugins: lockedPlugins
        }, me.lockedGridConfig);

        normalGrid = Ext.apply({
            xtype: xtype,
            store: store,
            scrollerOwner: false,
            enableAnimations: false,
            selModel: selModel,
            border: false,
            isLayoutRoot: function() {
                return false;
            },
            features: normalFeatures,
            plugins: normalPlugins
        }, me.normalGridConfig);

        me.addCls(Ext.baseCSSPrefix + 'grid-locked');

        // copy appropriate configurations to the respective
        // aggregated tablepanel instances and then delete them
        // from the master tablepanel.
        Ext.copyTo(normalGrid, me, me.bothCfgCopy);
        Ext.copyTo(lockedGrid, me, me.bothCfgCopy);
        Ext.copyTo(normalGrid, me, me.normalCfgCopy);
        Ext.copyTo(lockedGrid, me, me.lockedCfgCopy);
        for (i = 0; i < me.normalCfgCopy.length; i++) {
            delete me[me.normalCfgCopy[i]];
        }
        for (i = 0; i < me.lockedCfgCopy.length; i++) {
            delete me[me.lockedCfgCopy[i]];
        }

        me.addEvents(
            /**
             * @event lockcolumn
             * Fires when a column is locked.
             * @param {Ext.grid.Panel} this The gridpanel.
             * @param {Ext.grid.column.Column} column The column being locked.
             */
            'lockcolumn',

            /**
             * @event unlockcolumn
             * Fires when a column is unlocked.
             * @param {Ext.grid.Panel} this The gridpanel.
             * @param {Ext.grid.column.Column} column The column being unlocked.
             */
            'unlockcolumn'
        );

        me.addStateEvents(['lockcolumn', 'unlockcolumn']);

        me.lockedHeights = [];
        me.normalHeights = [];

        columns = me.processColumns(me.columns);

        lockedGrid.width = columns.lockedWidth + Ext.num(selModel.headerWidth, 0);
        lockedGrid.columns = columns.locked;
        normalGrid.columns = columns.normal;

        // normal grid should flex the rest of the width
        normalGrid.flex = 1;
        lockedGrid.viewConfig = me.lockedViewConfig || {};
        lockedGrid.viewConfig.loadingUseMsg = false;
        normalGrid.viewConfig = me.normalViewConfig || {};

        Ext.applyIf(lockedGrid.viewConfig, me.viewConfig);
        Ext.applyIf(normalGrid.viewConfig, me.viewConfig);

        me.lockedGrid = Ext.ComponentManager.create(lockedGrid);
        lockedView = me.lockedGrid.getView();
        
        normalGrid.viewConfig.lockingPartner = lockedView;
        me.normalGrid = Ext.ComponentManager.create(normalGrid);
        normalView = me.normalGrid.getView();

        me.view = new Ext.grid.LockingView({
            locked: me.lockedGrid,
            normal: me.normalGrid,
            panel: me
        });

        // Set up listeners for the locked view. If its SelModel ever scrolls it, the normal view must sync
        listeners = {
            scroll: {
                fn: me.onLockedViewScroll,
                element: 'el',
                scope: me
            }
        };
        // If there are system scrollbars, we have to monitor the mousewheel and fake a scroll
        if (!scrollLocked) {
            listeners.mousewheel = {
                fn: me.onLockedViewMouseWheel,
                element: 'el',
                scope: me
            };
        }
        if (me.syncRowHeight) {
            listeners.refresh = me.onLockedViewRefresh;
            listeners.itemupdate = me.onLockedViewItemUpdate;
            listeners.scope = me;
        }
        lockedView.on(listeners);

        // Set up listeners for the normal view
        listeners = {
            scroll: {
                fn: me.onNormalViewScroll,
                element: 'el',
                scope: me
            },
            refresh: me.syncRowHeight ? me.onNormalViewRefresh : me.updateSpacer,
            scope: me
        };
        normalView.on(listeners);

        lockedHeaderCt = me.lockedGrid.headerCt;
        normalHeaderCt = me.normalGrid.headerCt;

        lockedHeaderCt.lockedCt = true;
        lockedHeaderCt.lockableInjected = true;
        normalHeaderCt.lockableInjected = true;

        lockedHeaderCt.on({
            columnshow: me.onLockedHeaderShow,
            columnhide: me.onLockedHeaderHide,
            columnmove: me.onLockedHeaderMove,
            sortchange: me.onLockedHeaderSortChange,
            columnresize: me.onLockedHeaderResize,
            scope: me
        });

        normalHeaderCt.on({
            columnmove: me.onNormalHeaderMove,
            sortchange: me.onNormalHeaderSortChange,
            scope: me
        });

        me.modifyHeaderCt();
        me.items = [me.lockedGrid, me.normalGrid];

        me.relayHeaderCtEvents(lockedHeaderCt);
        me.relayHeaderCtEvents(normalHeaderCt);

        me.layout = {
            type: 'hbox',
            align: 'stretch'
        };
    },

    processColumns: function(columns){
        // split apart normal and lockedWidths
        var i = 0,
            len = columns.length,
            lockedWidth = 0,
            lockedHeaders = [],
            normalHeaders = [],
            column;

        for (; i < len; ++i) {
            column = columns[i];
            // MUST clone the column config because we mutate it, and we must not mutate passed in config objects in case they are re-used
            // eg, in an extend-to-configure scenario.
            if (!column.isComponent) {
                column = Ext.apply({}, columns[i]);
            }

            // mark the column as processed so that the locked attribute does not
            // trigger trying to aggregate the columns again.
            column.processed = true;
            if (column.locked) {
                if (column.flex) {
                    Ext.Error.raise("Columns which are locked do NOT support a flex width. You must set a width on the " + columns[i].text + "column.");
                }
                if (!column.hidden) {
                    lockedWidth += column.width || Ext.grid.header.Container.prototype.defaultWidth;
                }
                lockedHeaders.push(column);
            } else {
                normalHeaders.push(column);
            }
            if (!column.headerId) {
                column.headerId = (column.initialConfig || column).id || ('L' + (++this.headerCounter));
            }
        }
        return {
            lockedWidth: lockedWidth,
            locked: {
                items: lockedHeaders,
                itemId: 'lockedHeaderCt',
                stretchMaxPartner: '^^>>#normalHeaderCt'
            },
            normal: {
                items: normalHeaders,
                itemId: 'normalHeaderCt',
                stretchMaxPartner: '^^>>#lockedHeaderCt'
            }
        };
    },

    /**
     * @private
     * Listen for mousewheel events on the locked section which does not scroll.
     * Scroll it in response, and the other section will automatically sync.
     */
    onLockedViewMouseWheel: function(e) {
        var me = this,
            scrollDelta = -me.scrollDelta,
            deltaY = scrollDelta * e.getWheelDeltas().y,
            vertScrollerEl = me.lockedGrid.getView().el.dom,
            verticalCanScrollDown, verticalCanScrollUp;

        if (vertScrollerEl) {
            verticalCanScrollDown = vertScrollerEl.scrollTop !== vertScrollerEl.scrollHeight - vertScrollerEl.clientHeight;
            verticalCanScrollUp   = vertScrollerEl.scrollTop !== 0;
        }

        if ((deltaY < 0 && verticalCanScrollUp) || (deltaY > 0 && verticalCanScrollDown)) {
            e.stopEvent();

            // Inhibit processing of any scroll events we *may* cause here.
            // Some OSs do not fire a scroll event when we set the scrollTop of an overflow:hidden element,
            // so we invoke the scroll handler programatically below.
            me.scrolling = true;
            vertScrollerEl.scrollTop += deltaY;
            me.normalGrid.getView().el.dom.scrollTop = vertScrollerEl.scrollTop;
            me.scrolling = false;

            // Invoke the scroll event handler programatically to sync everything.
            me.onNormalViewScroll();
        }
    },

    onLockedViewScroll: function() {
        var me = this,
            lockedView = me.lockedGrid.getView(),
            normalView = me.normalGrid.getView(),
            normalTable,
            lockedTable;

        // Set a flag so that the scroll even doesn't bounce back when we set the normal view's scroll position
        if (!me.scrolling) {
            me.scrolling = true;
            normalView.el.dom.scrollTop = lockedView.el.dom.scrollTop;
    
            // For buffered views, the absolute position is important as well as scrollTop
            if (me.store.buffered) {
                lockedTable = lockedView.el.child('table', true);
                normalTable = normalView.el.child('table', true);
                lockedTable.style.position = 'absolute';
            }
            me.scrolling = false;
        }
    },
    
    onNormalViewScroll: function() {
        var me = this,
            lockedView = me.lockedGrid.getView(),
            normalView = me.normalGrid.getView(),
            normalTable,
            lockedTable;

        // Set a flag so that the scroll even doesn't bounce back when we set the locked view's scroll position
        if (!me.scrolling) {
            me.scrolling = true;
            lockedView.el.dom.scrollTop = normalView.el.dom.scrollTop;
    
            // For buffered views, the absolute position is important as well as scrollTop
            if (me.store.buffered) {
                lockedTable = lockedView.el.child('table', true);
                normalTable = normalView.el.child('table', true);
                lockedTable.style.position = 'absolute';
                lockedTable.style.top = normalTable.style.top;
            }
            me.scrolling = false;
        }
    },

    // trigger a pseudo refresh on the normal side
    onLockedHeaderMove: function() {
        if (this.syncRowHeight) {
            this.onNormalViewRefresh();
        }
    },

    // trigger a pseudo refresh on the locked side
    onNormalHeaderMove: function() {
        if (this.syncRowHeight) {
            this.onLockedViewRefresh();
        }
    },
    
    // Create a spacer in lockedsection and store a reference.
    // This is to allow the locked section to scroll past the bottom to
    // take the mormal section's horizontal scrollbar into account
    // TODO: Should destroy before refreshing content
    updateSpacer: function() {
        var me   = this,
            // This affects scrolling all the way to the bottom of a locked grid
            // additional test, sort a column and make sure it synchronizes
            lockedViewEl   = me.lockedGrid.getView().el,
            normalViewEl = me.normalGrid.getView().el.dom,
            spacerId = lockedViewEl.dom.id + '-spacer',
            spacerHeight = (normalViewEl.offsetHeight - normalViewEl.clientHeight) + 'px';

        me.spacerEl = Ext.getDom(spacerId);
        if (me.spacerEl) {
            me.spacerEl.style.height = spacerHeight;
        } else {
            Ext.core.DomHelper.append(lockedViewEl, {
                id: spacerId,
                style: 'height: ' + spacerHeight
            });
        }
    },

    // cache the heights of all locked rows and sync rowheights
    onLockedViewRefresh: function() {

        // Only bother if there are some columns in the normal grid to sync
        if (this.normalGrid.headerCt.getGridColumns().length) {
            var me     = this,
                view   = me.lockedGrid.getView(),
                el     = view.el,
                rowEls = el.query(view.getItemSelector()),
                ln     = rowEls.length,
                i = 0;
    
            // reset heights each time.
            me.lockedHeights = [];

            for (; i < ln; i++) {
                me.lockedHeights[i] = rowEls[i].offsetHeight;
            }
            me.syncRowHeights();
            me.updateSpacer();
        }
    },

    // cache the heights of all normal rows and sync rowheights
    onNormalViewRefresh: function() {

        // Only bother if there are some columns in the locked grid to sync
        if (this.lockedGrid.headerCt.getGridColumns().length) {
            var me     = this,
                view   = me.normalGrid.getView(),
                el     = view.el,
                rowEls = el.query(view.getItemSelector()),
                ln     = rowEls.length,
                i = 0;
    
            // reset heights each time.
            me.normalHeights = [];
    
            for (; i < ln; i++) {
                me.normalHeights[i] = rowEls[i].offsetHeight;
            }
            me.syncRowHeights();
            me.updateSpacer();
        }
    },

    // rows can get bigger/smaller
    onLockedViewItemUpdate: function(record, index, node) {

        // Only bother if there are some columns in the normal grid to sync
        if (this.normalGrid.headerCt.getGridColumns().length) {
            this.lockedHeights[index] = node.offsetHeight;
            this.syncRowHeights();
        }
    },

    // rows can get bigger/smaller
    onNormalViewItemUpdate: function(record, index, node) {
    
        // Only bother if there are some columns in the locked grid to sync
        if (this.lockedGrid.headerCt.getGridColumns().length) {
            this.normalHeights[index] = node.offsetHeight;
            this.syncRowHeights();
        }
    },

    /**
     * Synchronizes the row heights between the locked and non locked portion of the grid for each
     * row. If one row is smaller than the other, the height will be increased to match the larger one.
     */
    syncRowHeights: function() {
        var me = this,
            lockedHeights = me.lockedHeights,
            normalHeights = me.normalHeights,
            ln = lockedHeights.length,
            i  = 0,
            lockedView, normalView,
            lockedRowEls, normalRowEls,
            scrollTop;

        // ensure there are an equal num of locked and normal
        // rows before synchronization
        if (lockedHeights.length && normalHeights.length) {
            lockedView = me.lockedGrid.getView();
            normalView = me.normalGrid.getView();
            lockedRowEls = lockedView.el.query(lockedView.getItemSelector());
            normalRowEls = normalView.el.query(normalView.getItemSelector());

            // loop thru all of the heights and sync to the other side
            for (; i < ln; i++) {
                // ensure both are numbers
                if (!isNaN(lockedHeights[i]) && !isNaN(normalHeights[i])) {
                    if (lockedHeights[i] > normalHeights[i]) {
                        Ext.fly(normalRowEls[i]).setHeight(lockedHeights[i]);
                    } else if (lockedHeights[i] < normalHeights[i]) {
                        Ext.fly(lockedRowEls[i]).setHeight(normalHeights[i]);
                    }
                }
            }

            // Synchronize the scrollTop positions of the two views
            scrollTop = normalView.el.dom.scrollTop;
            normalView.el.dom.scrollTop = scrollTop;
            lockedView.el.dom.scrollTop = scrollTop;
            
            // reset the heights
            me.lockedHeights = [];
            me.normalHeights = [];
        }
    },

    // inject Lock and Unlock text
    modifyHeaderCt: function() {
        var me = this;
        me.lockedGrid.headerCt.getMenuItems = me.getMenuItems(me.lockedGrid.headerCt.getMenuItems, true);
        me.normalGrid.headerCt.getMenuItems = me.getMenuItems(me.normalGrid.headerCt.getMenuItems, false);
    },

    onUnlockMenuClick: function() {
        this.unlock();
    },

    onLockMenuClick: function() {
        this.lock();
    },

    getMenuItems: function(getMenuItems, locked) {
        var me            = this,
            unlockText    = me.unlockText,
            lockText      = me.lockText,
            unlockCls     = Ext.baseCSSPrefix + 'hmenu-unlock',
            lockCls       = Ext.baseCSSPrefix + 'hmenu-lock',
            unlockHandler = Ext.Function.bind(me.onUnlockMenuClick, me),
            lockHandler   = Ext.Function.bind(me.onLockMenuClick, me);

        // runs in the scope of headerCt
        return function() {

            // We cannot use the method from HeaderContainer's prototype here
            // because other plugins or features may already have injected an implementation
            var o = getMenuItems.call(this);
            o.push('-', {
                cls: unlockCls,
                text: unlockText,
                handler: unlockHandler,
                disabled: !locked
            });
            o.push({
                cls: lockCls,
                text: lockText,
                handler: lockHandler,
                disabled: locked
            });
            return o;
        };
    },

    // going from unlocked section to locked
    /**
     * Locks the activeHeader as determined by which menu is open OR a header
     * as specified.
     * @param {Ext.grid.column.Column} [header] Header to unlock from the locked section.
     * Defaults to the header which has the menu open currently.
     * @param {Number} [toIdx] The index to move the unlocked header to.
     * Defaults to appending as the last item.
     * @private
     */
    lock: function(activeHd, toIdx) {
        var me         = this,
            normalGrid = me.normalGrid,
            lockedGrid = me.lockedGrid,
            normalHCt  = normalGrid.headerCt,
            lockedHCt  = lockedGrid.headerCt;

        activeHd = activeHd || normalHCt.getMenu().activeHeader;

        // if column was previously flexed, get/set current width
        // and remove the flex
        if (activeHd.flex) {
            activeHd.width = activeHd.getWidth();
            delete activeHd.flex;
        }

        Ext.suspendLayouts();
        activeHd.ownerCt.remove(activeHd, false);
        activeHd.locked = true;
        if (Ext.isDefined(toIdx)) {
            lockedHCt.insert(toIdx, activeHd);
        } else {
            lockedHCt.add(activeHd);
        }
        me.syncLockedSection();
        Ext.resumeLayouts(true);
        me.updateSpacer();

        me.fireEvent('lockcolumn', me, activeHd);
    },

    syncLockedSection: function() {
        var me = this;
        me.syncLockedWidth();
        me.lockedGrid.getView().refresh();
        me.normalGrid.getView().refresh();
    },

    // adjust the locked section to the width of its respective
    // headerCt
    syncLockedWidth: function() {
        var me = this,
            locked = me.lockedGrid,
            width = locked.headerCt.getFullWidth(true);
            
        Ext.suspendLayouts();
        if (width > 0) {
            locked.setWidth(width);
            locked.show();
        } else {
            locked.hide();
        }
        Ext.resumeLayouts(true);
        
        return width > 0;
    },

    onLockedHeaderResize: function() {
        this.syncLockedWidth();
    },

    onLockedHeaderHide: function() {
        this.syncLockedWidth();
    },

    onLockedHeaderShow: function() {
        this.syncLockedWidth();
    },

    onLockedHeaderSortChange: function(headerCt, header, sortState) {
        if (sortState) {
            // no real header, and silence the event so we dont get into an
            // infinite loop
            this.normalGrid.headerCt.clearOtherSortStates(null, true);
        }
    },

    onNormalHeaderSortChange: function(headerCt, header, sortState) {
        if (sortState) {
            // no real header, and silence the event so we dont get into an
            // infinite loop
            this.lockedGrid.headerCt.clearOtherSortStates(null, true);
        }
    },

    // going from locked section to unlocked
    /**
     * Unlocks the activeHeader as determined by which menu is open OR a header
     * as specified.
     * @param {Ext.grid.column.Column} [header] Header to unlock from the locked section.
     * Defaults to the header which has the menu open currently.
     * @param {Number} [toIdx=0] The index to move the unlocked header to.
     * @private
     */
    unlock: function(activeHd, toIdx) {
        var me         = this,
            normalGrid = me.normalGrid,
            lockedGrid = me.lockedGrid,
            normalHCt  = normalGrid.headerCt,
            lockedHCt  = lockedGrid.headerCt,
            refreshLocked = false;

        if (!Ext.isDefined(toIdx)) {
            toIdx = 0;
        }
        activeHd = activeHd || lockedHCt.getMenu().activeHeader;

        Ext.suspendLayouts();
        activeHd.ownerCt.remove(activeHd, false);
        if (me.syncLockedWidth()) {
            refreshLocked = true;
        }
        activeHd.locked = false;

        // Refresh the locked section first in case it was empty
        normalHCt.insert(toIdx, activeHd);
        me.normalGrid.getView().refresh();

        if (refreshLocked) {
            me.lockedGrid.getView().refresh();
        }
        Ext.resumeLayouts(true);

        me.fireEvent('unlockcolumn', me, activeHd);
    },

    applyColumnsState: function (columns) {
        var me             = this,
            lockedGrid     = me.lockedGrid,
            lockedHeaderCt = lockedGrid.headerCt,
            normalHeaderCt = me.normalGrid.headerCt,
            lockedCols     = Ext.Array.toMap(lockedHeaderCt.items, 'headerId'),
            normalCols     = Ext.Array.toMap(normalHeaderCt.items, 'headerId'),
            locked         = [],
            normal         = [],
            lockedWidth    = 1,
            length         = columns.length,
            i, existing,
            lockedDefault,
            col;

        for (i = 0; i < length; i++) {
            col = columns[i];

            lockedDefault = lockedCols[col.id];
            existing = lockedDefault || normalCols[col.id];

            if (existing) {
                if (existing.applyColumnState) {
                    existing.applyColumnState(col);
                }
                if (existing.locked === undefined) {
                    existing.locked = !!lockedDefault;
                }
                if (existing.locked) {
                    locked.push(existing);
                    if (!existing.hidden && typeof existing.width == 'number') {
                        lockedWidth += existing.width;
                    }
                } else {
                    normal.push(existing);
                }
            }
        }

        // state and config must have the same columns (compare counts for now):
        if (locked.length + normal.length == lockedHeaderCt.items.getCount() + normalHeaderCt.items.getCount()) {
            lockedHeaderCt.removeAll(false);
            normalHeaderCt.removeAll(false);

            lockedHeaderCt.add(locked);
            normalHeaderCt.add(normal);

            lockedGrid.setWidth(lockedWidth);
        }
    },

    getColumnsState: function () {
        var me = this,
            locked = me.lockedGrid.headerCt.getColumnsState(),
            normal = me.normalGrid.headerCt.getColumnsState();

        return locked.concat(normal);
    },

    // we want to totally override the reconfigure behaviour here, since we're creating 2 sub-grids
    reconfigureLockable: function(store, columns) {
        var me = this,
            lockedGrid = me.lockedGrid,
            normalGrid = me.normalGrid;

        if (columns) {
            Ext.suspendLayouts();
            lockedGrid.headerCt.removeAll();
            normalGrid.headerCt.removeAll();

            columns = me.processColumns(columns);
            lockedGrid.setWidth(columns.lockedWidth);
            lockedGrid.headerCt.add(columns.locked.items);
            normalGrid.headerCt.add(columns.normal.items);
            Ext.resumeLayouts(true);
        }

        if (store) {
            store = Ext.data.StoreManager.lookup(store);
            me.store = store;
            lockedGrid.bindStore(store);
            normalGrid.bindStore(store);
        } else {
            lockedGrid.getView().refresh();
            normalGrid.getView().refresh();
        }
    },

    /**
     * Clones items in the features array if they are instantiated Features. If an item
     * is just a feature config, it leaves it alone.
     *
     * This is so that features can be replicated on both sides of the LockingView
     *
     */
    cloneFeatures: function() {
        var me = this,
            features = me.features,
            feature,
            i = 0, len;
        
        if (features) {
            len = features.length;
            for (; i < len; i++) {
                feature = features[i];
                if (feature.isFeature) {
                    features[i] = feature.clone();
                }
            }
        }
    },

    /**
     * Clones items in the plugins array if they are instantiated Plugins. If an item
     * is just a plugin config, it leaves it alone.
     *
     * This is so that plugins can be replicated on both sides of the LockingView
     *
     */
    clonePlugins: function() {
        var me = this,
            plugins = me.plugins,
            plugin,
            i = 0, len;
        
        if (plugins) {
            len = plugins.length;
            for (; i < len; i++) {
                plugin = plugins[i];
                if (typeof plugin.init === 'function') {
                    plugins[i] = plugin.clone();
                }
            }
        }
    }
}, function() {
    this.borrow(Ext.view.Table, ['constructFeatures']);
    this.borrow(Ext.AbstractComponent, ['constructPlugins', 'constructPlugin']);
});

/**
 * The grid View class provides extra {@link Ext.grid.Panel} specific functionality to the
 * {@link Ext.view.Table}. In general, this class is not instanced directly, instead a viewConfig
 * option is passed to the grid:
 *
 *     Ext.create('Ext.grid.Panel', {
 *         // other options
 *         viewConfig: {
 *             stripeRows: false
 *         }
 *     });
 *
 * ## Drag Drop
 *
 * Drag and drop functionality can be achieved in the grid by attaching a {@link Ext.grid.plugin.DragDrop} plugin
 * when creating the view.
 *
 *     Ext.create('Ext.grid.Panel', {
 *         // other options
 *         viewConfig: {
 *             plugins: {
 *                 ddGroup: 'people-group',
 *                 ptype: 'gridviewdragdrop',
 *                 enableDrop: false
 *             }
 *         }
 *     });
 */
Ext.define('Ext.grid.View', {
    extend: 'Ext.view.Table',
    alias: 'widget.gridview',

    /**
     * @cfg
     * True to stripe the rows.
     *
     * This causes the CSS class **`x-grid-row-alt`** to be added to alternate rows of the grid. A default CSS rule is
     * provided which sets a background color, but you can override this with a rule which either overrides the
     * **background-color** style using the `!important` modifier, or which uses a CSS selector of higher specificity.
     */
    stripeRows: true,

    autoScroll: true
});

/**
 * @author Aaron Conran
 * @docauthor Ed Spencer
 *
 * Grids are an excellent way of showing large amounts of tabular data on the client side. Essentially a supercharged
 * `<table>`, GridPanel makes it easy to fetch, sort and filter large amounts of data.
 *
 * Grids are composed of two main pieces - a {@link Ext.data.Store Store} full of data and a set of columns to render.
 *
 * ## Basic GridPanel
 *
 *     @example
 *     Ext.create('Ext.data.Store', {
 *         storeId:'simpsonsStore',
 *         fields:['name', 'email', 'phone'],
 *         data:{'items':[
 *             { 'name': 'Lisa',  "email":"lisa@simpsons.com",  "phone":"555-111-1224"  },
 *             { 'name': 'Bart',  "email":"bart@simpsons.com",  "phone":"555-222-1234" },
 *             { 'name': 'Homer', "email":"home@simpsons.com",  "phone":"555-222-1244"  },
 *             { 'name': 'Marge', "email":"marge@simpsons.com", "phone":"555-222-1254"  }
 *         ]},
 *         proxy: {
 *             type: 'memory',
 *             reader: {
 *                 type: 'json',
 *                 root: 'items'
 *             }
 *         }
 *     });
 *
 *     Ext.create('Ext.grid.Panel', {
 *         title: 'Simpsons',
 *         store: Ext.data.StoreManager.lookup('simpsonsStore'),
 *         columns: [
 *             { text: 'Name',  dataIndex: 'name' },
 *             { text: 'Email', dataIndex: 'email', flex: 1 },
 *             { text: 'Phone', dataIndex: 'phone' }
 *         ],
 *         height: 200,
 *         width: 400,
 *         renderTo: Ext.getBody()
 *     });
 *
 * The code above produces a simple grid with three columns. We specified a Store which will load JSON data inline.
 * In most apps we would be placing the grid inside another container and wouldn't need to use the
 * {@link #height}, {@link #width} and {@link #renderTo} configurations but they are included here to make it easy to get
 * up and running.
 *
 * The grid we created above will contain a header bar with a title ('Simpsons'), a row of column headers directly underneath
 * and finally the grid rows under the headers.
 *
 * ## Configuring columns
 *
 * By default, each column is sortable and will toggle between ASC and DESC sorting when you click on its header. Each
 * column header is also reorderable by default, and each gains a drop-down menu with options to hide and show columns.
 * It's easy to configure each column - here we use the same example as above and just modify the columns config:
 *
 *     columns: [
 *         {
 *             text: 'Name',
 *             dataIndex: 'name',
 *             sortable: false,
 *             hideable: false,
 *             flex: 1
 *         },
 *         {
 *             text: 'Email',
 *             dataIndex: 'email',
 *             hidden: true
 *         },
 *         {
 *             text: 'Phone',
 *             dataIndex: 'phone',
 *             width: 100
 *         }
 *     ]
 *
 * We turned off sorting and hiding on the 'Name' column so clicking its header now has no effect. We also made the Email
 * column hidden by default (it can be shown again by using the menu on any other column). We also set the Phone column to
 * a fixed with of 100px and flexed the Name column, which means it takes up all remaining width after the other columns
 * have been accounted for. See the {@link Ext.grid.column.Column column docs} for more details.
 *
 * ## Renderers
 *
 * As well as customizing columns, it's easy to alter the rendering of individual cells using renderers. A renderer is
 * tied to a particular column and is passed the value that would be rendered into each cell in that column. For example,
 * we could define a renderer function for the email column to turn each email address into a mailto link:
 *
 *     columns: [
 *         {
 *             text: 'Email',
 *             dataIndex: 'email',
 *             renderer: function(value) {
 *                 return Ext.String.format('<a href="mailto:{0}">{1}</a>', value, value);
 *             }
 *         }
 *     ]
 *
 * See the {@link Ext.grid.column.Column column docs} for more information on renderers.
 *
 * ## Selection Models
 *
 * Sometimes all you want is to render data onto the screen for viewing, but usually it's necessary to interact with or
 * update that data. Grids use a concept called a Selection Model, which is simply a mechanism for selecting some part of
 * the data in the grid. The two main types of Selection Model are RowSelectionModel, where entire rows are selected, and
 * CellSelectionModel, where individual cells are selected.
 *
 * Grids use a Row Selection Model by default, but this is easy to customise like so:
 *
 *     Ext.create('Ext.grid.Panel', {
 *         selType: 'cellmodel',
 *         store: ...
 *     });
 *
 * Specifying the `cellmodel` changes a couple of things. Firstly, clicking on a cell now
 * selects just that cell (using a {@link Ext.selection.RowModel rowmodel} will select the entire row), and secondly the
 * keyboard navigation will walk from cell to cell instead of row to row. Cell-based selection models are usually used in
 * conjunction with editing.
 *
 * ## Sorting & Filtering
 *
 * Every grid is attached to a {@link Ext.data.Store Store}, which provides multi-sort and filtering capabilities. It's
 * easy to set up a grid to be sorted from the start:
 *
 *     var myGrid = Ext.create('Ext.grid.Panel', {
 *         store: {
 *             fields: ['name', 'email', 'phone'],
 *             sorters: ['name', 'phone']
 *         },
 *         columns: [
 *             { text: 'Name',  dataIndex: 'name' },
 *             { text: 'Email', dataIndex: 'email' }
 *         ]
 *     });
 *
 * Sorting at run time is easily accomplished by simply clicking each column header. If you need to perform sorting on
 * more than one field at run time it's easy to do so by adding new sorters to the store:
 *
 *     myGrid.store.sort([
 *         { property: 'name',  direction: 'ASC' },
 *         { property: 'email', direction: 'DESC' }
 *     ]);
 *
 * See {@link Ext.data.Store} for examples of filtering.
 *
 * ## State saving
 * 
 * When configured {@link #stateful}, grids save their column state (order and width) encapsulated within the default
 * Panel state of changed width and height and collapsed/expanded state.
 *
 * Each {@link #columns column} of the grid may be configured with a {@link Ext.grid.column.Column#stateId stateId} which
 * identifies that column locally within the grid.
 *
 * ## Plugins and Features
 *
 * Grid supports addition of extra functionality through features and plugins:
 *
 * - {@link Ext.grid.plugin.CellEditing CellEditing} - editing grid contents one cell at a time.
 *
 * - {@link Ext.grid.plugin.RowEditing RowEditing} - editing grid contents an entire row at a time.
 *
 * - {@link Ext.grid.plugin.DragDrop DragDrop} - drag-drop reordering of grid rows.
 *
 * - {@link Ext.toolbar.Paging Paging toolbar} - paging through large sets of data.
 *
 * - {@link Ext.grid.PagingScroller Infinite scrolling} - another way to handle large sets of data.
 *
 * - {@link Ext.grid.RowNumberer RowNumberer} - automatically numbered rows.
 *
 * - {@link Ext.grid.feature.Grouping Grouping} - grouping together rows having the same value in a particular field.
 *
 * - {@link Ext.grid.feature.Summary Summary} - a summary row at the bottom of a grid.
 *
 * - {@link Ext.grid.feature.GroupingSummary GroupingSummary} - a summary row at the bottom of each group.
 */
Ext.define('Ext.grid.Panel', {
    extend: 'Ext.panel.Table',
    requires: ['Ext.grid.View'],
    alias: ['widget.gridpanel', 'widget.grid'],
    alternateClassName: ['Ext.list.ListView', 'Ext.ListView', 'Ext.grid.GridPanel'],
    viewType: 'gridview',

    lockable: false,

    // Required for the Lockable Mixin. These are the configurations which will be copied to the
    // normal and locked sub tablepanels
    bothCfgCopy: [
        'invalidateScrollerOnRefresh',
        'hideHeaders',
        'enableColumnHide',
        'enableColumnMove',
        'enableColumnResize',
        'sortableColumns'
    ],
    normalCfgCopy: [ 
        'verticalScroller', 
        'verticalScrollDock', 
        'verticalScrollerType', 
        'scroll'
    ],
    lockedCfgCopy: [],

    /**
     * @cfg {Boolean} rowLines False to remove row line styling
     */
    rowLines: true

    // Columns config is required in Grid
    /**
     * @cfg {Ext.grid.column.Column[]/Object} columns (required)
     * @inheritdoc
     */

    /**
     * @event reconfigure
     * Fires after a reconfigure.
     * @param {Ext.grid.Panel} this
     * @param {Ext.data.Store} store The store that was passed to the {@link #method-reconfigure} method
     * @param {Object[]} columns The column configs that were passed to the {@link #method-reconfigure} method
     */

    /**
     * @method reconfigure
     * Reconfigures the grid with a new store/columns. Either the store or the columns can be omitted if you don't wish
     * to change them.
     * @param {Ext.data.Store} store (Optional) The new store.
     * @param {Object[]} columns (Optional) An array of column configs
     */
});
/**
 * A specialized grid implementation intended to mimic the traditional property grid as typically seen in
 * development IDEs.  Each row in the grid represents a property of some object, and the data is stored
 * as a set of name/value pairs in {@link Ext.grid.property.Property Properties}.  Example usage:
 *
 *     @example
 *     Ext.create('Ext.grid.property.Grid', {
 *         title: 'Properties Grid',
 *         width: 300,
 *         renderTo: Ext.getBody(),
 *         source: {
 *             "(name)": "My Object",
 *             "Created": Ext.Date.parse('10/15/2006', 'm/d/Y'),
 *             "Available": false,
 *             "Version": 0.01,
 *             "Description": "A test object"
 *         }
 *     });
 */
Ext.define('Ext.grid.property.Grid', {

    extend: 'Ext.grid.Panel',

    alias: 'widget.propertygrid',

    alternateClassName: 'Ext.grid.PropertyGrid',

    uses: [
       'Ext.grid.plugin.CellEditing',
       'Ext.grid.property.Store',
       'Ext.grid.property.HeaderContainer',
       'Ext.XTemplate',
       'Ext.grid.CellEditor',
       'Ext.form.field.Date',
       'Ext.form.field.Text',
       'Ext.form.field.Number',
       'Ext.form.field.ComboBox'
    ],

   /**
    * @cfg {Object} propertyNames
    * An object containing custom property name/display name pairs.
    * If specified, the display name will be shown in the name column instead of the property name.
    */

    /**
     * @cfg {Object} source
     * A data object to use as the data source of the grid (see {@link #setSource} for details).
     */

    /**
     * @cfg {Object} customEditors
     * An object containing name/value pairs of custom editor type definitions that allow
     * the grid to support additional types of editable fields.  By default, the grid supports strongly-typed editing
     * of strings, dates, numbers and booleans using built-in form editors, but any custom type can be supported and
     * associated with a custom input control by specifying a custom editor.  The name of the editor
     * type should correspond with the name of the property that will use the editor.  Example usage:
     *
     *     var grid = new Ext.grid.property.Grid({
     *
     *         // Custom editors for certain property names
     *         customEditors: {
     *             evtStart: Ext.create('Ext.form.TimeField', {selectOnFocus: true})
     *         },
     *
     *         // Displayed name for property names in the source
     *         propertyNames: {
     *             evtStart: 'Start Time'
     *         },
     *
     *         // Data object containing properties to edit
     *         source: {
     *             evtStart: '10:00 AM'
     *         }
     *     });
     */

    /**
     * @cfg {Object} customRenderers
     * An object containing name/value pairs of custom renderer type definitions that allow
     * the grid to support custom rendering of fields.  By default, the grid supports strongly-typed rendering
     * of strings, dates, numbers and booleans using built-in form editors, but any custom type can be supported and
     * associated with the type of the value.  The name of the renderer type should correspond with the name of the property
     * that it will render.  Example usage:
     *
     *     var grid = Ext.create('Ext.grid.property.Grid', {
     *         customRenderers: {
     *             Available: function(v){
     *                 if (v) {
     *                     return '<span style="color: green;">Yes</span>';
     *                 } else {
     *                     return '<span style="color: red;">No</span>';
     *                 }
     *             }
     *         },
     *         source: {
     *             Available: true
     *         }
     *     });
     */

    /**
     * @cfg {String} valueField
     * The name of the field from the property store to use as the value field name.
     * This may be useful if you do not configure the property Grid from an object, but use your own store configuration.
     */
    valueField: 'value',

    /**
     * @cfg {String} nameField
     * The name of the field from the property store to use as the property field name.
     * This may be useful if you do not configure the property Grid from an object, but use your own store configuration.
     */
    nameField: 'name',

    /**
     * @cfg {Number} [nameColumnWidth=115]
     * Specify the width for the name column. The value column will take any remaining space.
     */

    // private config overrides
    enableColumnMove: false,
    columnLines: true,
    stripeRows: false,
    trackMouseOver: false,
    clicksToEdit: 1,
    enableHdMenu: false,

    // private
    initComponent : function(){
        var me = this;

        me.addCls(Ext.baseCSSPrefix + 'property-grid');
        me.plugins = me.plugins || [];

        // Enable cell editing. Inject a custom startEdit which always edits column 1 regardless of which column was clicked.
        me.plugins.push(new Ext.grid.plugin.CellEditing({
            clicksToEdit: me.clicksToEdit,

            // Inject a startEdit which always edits the value column
            startEdit: function(record, column) {
                // Maintainer: Do not change this 'this' to 'me'! It is the CellEditing object's own scope.
                return this.self.prototype.startEdit.call(this, record, me.headerCt.child('#' + me.valueField));
            }
        }));

        me.selModel = {
            selType: 'cellmodel',
            onCellSelect: function(position) {
                if (position.column != 1) {
                    position.column = 1;
                }
                return this.self.prototype.onCellSelect.call(this, position);
            }
        };
        me.customRenderers = me.customRenderers || {};
        me.customEditors = me.customEditors || {};

        // Create a property.Store from the source object unless configured with a store
        if (!me.store) {
            me.propStore = me.store = new Ext.grid.property.Store(me, me.source);
        }

        if (me.sortableColumns) {
            me.store.sort('name', 'ASC');
        }
        me.columns = new Ext.grid.property.HeaderContainer(me, me.store);

        me.addEvents(
            /**
             * @event beforepropertychange
             * Fires before a property value changes.  Handlers can return false to cancel the property change
             * (this will internally call {@link Ext.data.Model#reject} on the property's record).
             * @param {Object} source The source data object for the grid (corresponds to the same object passed in
             * as the {@link #source} config property).
             * @param {String} recordId The record's id in the data store
             * @param {Object} value The current edited property value
             * @param {Object} oldValue The original property value prior to editing
             */
            'beforepropertychange',
            /**
             * @event propertychange
             * Fires after a property value has changed.
             * @param {Object} source The source data object for the grid (corresponds to the same object passed in
             * as the {@link #source} config property).
             * @param {String} recordId The record's id in the data store
             * @param {Object} value The current edited property value
             * @param {Object} oldValue The original property value prior to editing
             */
            'propertychange'
        );
        me.callParent();

        // Inject a custom implementation of walkCells which only goes up or down
        me.getView().walkCells = this.walkCells;

        // Set up our default editor set for the 4 atomic data types
        me.editors = {
            'date'    : new Ext.grid.CellEditor({ field: new Ext.form.field.Date({selectOnFocus: true})}),
            'string'  : new Ext.grid.CellEditor({ field: new Ext.form.field.Text({selectOnFocus: true})}),
            'number'  : new Ext.grid.CellEditor({ field: new Ext.form.field.Number({selectOnFocus: true})}),
            'boolean' : new Ext.grid.CellEditor({ field: new Ext.form.field.ComboBox({
                editable: false,
                store: [[ true, me.headerCt.trueText ], [false, me.headerCt.falseText ]]
            })})
        };

        // Track changes to the data so we can fire our events.
        me.store.on('update', me.onUpdate, me);
    },

    // private
    onUpdate : function(store, record, operation) {
        var me = this,
            v, oldValue;

        if (me.rendered && operation == Ext.data.Model.EDIT) {
            v = record.get(me.valueField);
            oldValue = record.modified.value;
            if (me.fireEvent('beforepropertychange', me.source, record.getId(), v, oldValue) !== false) {
                if (me.source) {
                    me.source[record.getId()] = v;
                }
                record.commit();
                me.fireEvent('propertychange', me.source, record.getId(), v, oldValue);
            } else {
                record.reject();
            }
        }
    },

    // Custom implementation of walkCells which only goes up and down.
    walkCells: function(pos, direction, e, preventWrap, verifierFn, scope) {
        if (direction == 'left') {
            direction = 'up';
        } else if (direction == 'right') {
            direction = 'down';
        }
        pos = Ext.view.Table.prototype.walkCells.call(this, pos, direction, e, preventWrap, verifierFn, scope);
        if (!pos.column) {
            pos.column = 1;
        }
        return pos;
    },

    // private
    // returns the correct editor type for the property type, or a custom one keyed by the property name
    getCellEditor : function(record, column) {
        var me = this,
            propName = record.get(me.nameField),
            val = record.get(me.valueField),
            editor = me.customEditors[propName];

        // A custom editor was found. If not already wrapped with a CellEditor, wrap it, and stash it back
        // If it's not even a Field, just a config object, instantiate it before wrapping it.
        if (editor) {
            if (!(editor instanceof Ext.grid.CellEditor)) {
                if (!(editor instanceof Ext.form.field.Base)) {
                    editor = Ext.ComponentManager.create(editor, 'textfield');
                }
                editor = me.customEditors[propName] = new Ext.grid.CellEditor({ field: editor });
            }
        } else if (Ext.isDate(val)) {
            editor = me.editors.date;
        } else if (Ext.isNumber(val)) {
            editor = me.editors.number;
        } else if (Ext.isBoolean(val)) {
            editor = me.editors['boolean'];
        } else {
            editor = me.editors.string;
        }

        // Give the editor a unique ID because the CellEditing plugin caches them
        editor.editorId = propName;
        return editor;
    },

    beforeDestroy: function() {
        var me = this;
        me.callParent();
        me.destroyEditors(me.editors);
        me.destroyEditors(me.customEditors);
        delete me.source;
    },

    destroyEditors: function (editors) {
        for (var ed in editors) {
            if (editors.hasOwnProperty(ed)) {
                Ext.destroy(editors[ed]);
            }
        }
    },

    /**
     * Sets the source data object containing the property data.  The data object can contain one or more name/value
     * pairs representing all of the properties of an object to display in the grid, and this data will automatically
     * be loaded into the grid's {@link #store}.  The values should be supplied in the proper data type if needed,
     * otherwise string type will be assumed.  If the grid already contains data, this method will replace any
     * existing data.  See also the {@link #source} config value.  Example usage:
     *
     *     grid.setSource({
     *         "(name)": "My Object",
     *         "Created": Ext.Date.parse('10/15/2006', 'm/d/Y'),  // date type
     *         "Available": false,  // boolean type
     *         "Version": .01,      // decimal type
     *         "Description": "A test object"
     *     });
     *
     * @param {Object} source The data object
     */
    setSource: function(source) {
        this.source = source;
        this.propStore.setSource(source);
    },

    /**
     * Gets the source data object containing the property data.  See {@link #setSource} for details regarding the
     * format of the data object.
     * @return {Object} The data object
     */
    getSource: function() {
        return this.propStore.getSource();
    },

    /**
     * Sets the value of a property.
     * @param {String} prop The name of the property to set
     * @param {Object} value The value to test
     * @param {Boolean} [create=false] True to create the property if it doesn't already exist.
     */
    setProperty: function(prop, value, create) {
        this.propStore.setValue(prop, value, create);
    },

    /**
     * Removes a property from the grid.
     * @param {String} prop The name of the property to remove
     */
    removeProperty: function(prop) {
        this.propStore.remove(prop);
    }

    /**
     * @cfg store
     * @private
     */
    /**
     * @cfg columns
     * @private
     */
});



// Currently has the following issues:
// - Does not handle postEditValue
// - Fields without editors need to sync with their values in Store
// - starting to edit another record while already editing and dirty should probably prevent it
// - aggregating validation messages
// - tabIndex is not managed bc we leave elements in dom, and simply move via positioning
// - layout issues when changing sizes/width while hidden (layout bug)

/**
 * Internal utility class used to provide row editing functionality. For developers, they should use
 * the RowEditing plugin to use this functionality with a grid.
 *
 * @private
 */
Ext.define('Ext.grid.RowEditor', {
    extend: 'Ext.form.Panel',
    requires: [
        'Ext.tip.ToolTip',
        'Ext.util.HashMap',
        'Ext.util.KeyNav'
    ],

    //<locale>
    saveBtnText  : 'Update',
    //</locale>
    //<locale>
    cancelBtnText: 'Cancel',
    //</locale>
    //<locale>
    errorsText: 'Errors',
    //</locale>
    //<locale>
    dirtyText: 'You need to commit or cancel your changes',
    //</locale>

    lastScrollLeft: 0,
    lastScrollTop: 0,

    border: false,
    
    // Change the hideMode to offsets so that we get accurate measurements when
    // the roweditor is hidden for laying out things like a TriggerField.
    hideMode: 'offsets',

    initComponent: function() {
        var me = this,
            form;

        me.cls = Ext.baseCSSPrefix + 'grid-row-editor';

        me.layout = {
            type: 'hbox',
            align: 'middle'
        };

        // Maintain field-to-column mapping
        // It's easy to get a field from a column, but not vice versa
        me.columns = new Ext.util.HashMap();
        me.columns.getKey = function(columnHeader) {
            var f;
            if (columnHeader.getEditor) {
                f = columnHeader.getEditor();
                if (f) {
                    return f.id;
                }
            }
            return columnHeader.id;
        };
        me.mon(me.columns, {
            add: me.onFieldAdd,
            remove: me.onFieldRemove,
            replace: me.onFieldReplace,
            scope: me
        });

        me.callParent(arguments);

        if (me.fields) {
            me.setField(me.fields);
            delete me.fields;
        }
        
        me.mon(Ext.container.Container.hierarchyEventSource, {
            scope: me,
            show: me.repositionIfVisible
        });

        form = me.getForm();
        form.trackResetOnLoad = true;
    },

    onFieldChange: function() {
        var me = this,
            form = me.getForm(),
            valid = form.isValid();
        if (me.errorSummary && me.isVisible()) {
            me[valid ? 'hideToolTip' : 'showToolTip']();
        }
        me.updateButton(valid);
        me.isValid = valid;
    },
    
    updateButton: function(valid){
        var buttons = this.floatingButtons; 
        if (buttons) {
            buttons.child('#update').setDisabled(!valid);
        }    
    },

    afterRender: function() {
        var me = this,
            plugin = me.editingPlugin;

        me.callParent(arguments);
        me.mon(me.renderTo, 'scroll', me.onCtScroll, me, { buffer: 100 });

        // Prevent from bubbling click events to the grid view
        me.mon(me.el, {
            click: Ext.emptyFn,
            stopPropagation: true
        });

        me.el.swallowEvent([
            'keypress',
            'keydown'
        ]);

        me.keyNav = new Ext.util.KeyNav(me.el, {
            enter: plugin.completeEdit,
            esc: plugin.onEscKey,
            scope: plugin
        });

        me.mon(plugin.view, {
            beforerefresh: me.onBeforeViewRefresh,
            refresh: me.onViewRefresh,
            itemremove: me.onViewItemRemove,
            scope: me
        });
    },

    onBeforeViewRefresh: function(view) {
        var me = this,
            viewDom = view.el.dom;

        if (me.el.dom.parentNode === viewDom) {
            viewDom.removeChild(me.el.dom);
        }
    },

    onViewRefresh: function(view) {
        var me = this,
            viewDom = view.el.dom,
            context = me.context,
            idx;

        viewDom.appendChild(me.el.dom);

        // Recover our row node after a view refresh
        if (context && (idx = context.store.indexOf(context.record)) >= 0) {
            context.row = view.getNode(idx);
            me.reposition();
            if (me.tooltip && me.tooltip.isVisible()) {
                me.tooltip.setTarget(context.row);
            }
        } else {
            me.editingPlugin.cancelEdit();
        }
    },

    onViewItemRemove: function(record, index) {
        var context = this.context;
        if (context && record === context.record) {
            // if the record being edited was removed, cancel editing
            this.editingPlugin.cancelEdit();
        }
    },

    onCtScroll: function(e, target) {
        var me = this,
            scrollTop  = target.scrollTop,
            scrollLeft = target.scrollLeft;

        if (scrollTop !== me.lastScrollTop) {
            me.lastScrollTop = scrollTop;
            if ((me.tooltip && me.tooltip.isVisible()) || me.hiddenTip) {
                me.repositionTip();
            }
        }
        if (scrollLeft !== me.lastScrollLeft) {
            me.lastScrollLeft = scrollLeft;
            me.reposition();
        }
    },

    onColumnAdd: function(column) {
        if (!column.isGroupHeader) {
            this.setField(column);
        }
    },

    onColumnRemove: function(column) {
        this.columns.remove(column);
    },

    onColumnResize: function(column, width) {
        if (!column.isGroupHeader) {
            column.getEditor().setWidth(width - 2);
            this.repositionIfVisible();
        }
    },

    onColumnHide: function(column) {
        if (!column.isGroupHeader) {
            column.getEditor().hide();
            this.repositionIfVisible();
        }
    },

    onColumnShow: function(column) {
        var field = column.getEditor();
        field.setWidth(column.getWidth() - 2).show();
        this.repositionIfVisible();
    },

    onColumnMove: function(column, fromIdx, toIdx) {
        if (!column.isGroupHeader) {
            var field = column.getEditor();
            if (this.items.indexOf(field) != toIdx) {
                this.move(fromIdx, toIdx);
            }
        }
    },

    onFieldAdd: function(map, fieldId, column) {
        var me = this,
            colIdx,
            field;

        if (!column.isGroupHeader) {
            colIdx = me.editingPlugin.grid.headerCt.getHeaderIndex(column);
            field = column.getEditor({ xtype: 'displayfield' });
            me.insert(colIdx, field);
        }
    },

    onFieldRemove: function(map, fieldId, column) {
        var me = this,
            field,
            fieldEl;

        if (!column.isGroupHeader) {
            field = column.getEditor();
            fieldEl = field.el;
            me.remove(field, false);
            if (fieldEl) {
                fieldEl.remove();
            }
        }
    },

    onFieldReplace: function(map, fieldId, column, oldColumn) {
        this.onFieldRemove(map, fieldId, oldColumn);
    },

    clearFields: function() {
        var map = this.columns,
            key;

        for (key in map) {
            if (map.hasOwnProperty(key)) {
                map.removeAtKey(key);
            }
        }
    },

    getFloatingButtons: function() {
        var me = this,
            cssPrefix = Ext.baseCSSPrefix,
            btnsCss = cssPrefix + 'grid-row-editor-buttons',
            plugin = me.editingPlugin,
            minWidth = Ext.panel.Panel.prototype.minButtonWidth,
            btns;

        if (!me.floatingButtons) {
            btns = me.floatingButtons = new Ext.Container({
                renderTpl: [
                    '<div class="{baseCls}-ml"></div>',
                    '<div class="{baseCls}-mr"></div>',
                    '<div class="{baseCls}-bl"></div>',
                    '<div class="{baseCls}-br"></div>',
                    '<div class="{baseCls}-bc"></div>',
                    '{%this.renderContainer(out,values)%}'
                ],
                width: 200,
                renderTo: me.el,
                baseCls: btnsCss,
                layout: {
                    type: 'hbox',
                    align: 'middle'
                },
                defaults: {
                    flex: 1,
                    margins: '0 1 0 1'
                },
                items: [{
                    itemId: 'update',
                    xtype: 'button',
                    handler: plugin.completeEdit,
                    scope: plugin,
                    text: me.saveBtnText,
                    minWidth: minWidth
                }, {
                    xtype: 'button',
                    handler: plugin.cancelEdit,
                    scope: plugin,
                    text: me.cancelBtnText,
                    minWidth: minWidth
                }]
            });

            // Prevent from bubbling click events to the grid view
            me.mon(btns.el, {
                // BrowserBug: Opera 11.01
                //   causes the view to scroll when a button is focused from mousedown
                mousedown: Ext.emptyFn,
                click: Ext.emptyFn,
                stopEvent: true
            });
        }
        return me.floatingButtons;
    },
    
    repositionIfVisible: function(c){
        var me = this,
            view = me.view;
        
        // If we're showing ourselves, jump out
        // If the component we're showing doesn't contain the view
        if (c && (c == me || !view.isDescendantOf(c))) {
            return;
        }
        
        if (me.isVisible() && view.isVisible(true)) {
            me.reposition();    
        }
    },

    reposition: function(animateConfig) {
        var me = this,
            context = me.context,
            row = context && Ext.get(context.row),
            btns = me.getFloatingButtons(),
            btnEl = btns.el,
            grid = me.editingPlugin.grid,
            viewEl = grid.view.el,

            // always get data from ColumnModel as its what drives
            // the GridView's sizing
            mainBodyWidth = grid.headerCt.getFullWidth(),
            scrollerWidth = grid.getWidth(),

            // use the minimum as the columns may not fill up the entire grid
            // width
            width = Math.min(mainBodyWidth, scrollerWidth),
            scrollLeft = grid.view.el.dom.scrollLeft,
            btnWidth = btns.getWidth(),
            left = (width - btnWidth) / 2 + scrollLeft,
            y, rowH, newHeight,

            invalidateScroller = function() {
                btnEl.scrollIntoView(viewEl, false);
                if (animateConfig && animateConfig.callback) {
                    animateConfig.callback.call(animateConfig.scope || me);
                }
            },
            
            animObj;

        // need to set both top/left
        if (row && Ext.isElement(row.dom)) {
            // Bring our row into view if necessary, so a row editor that's already
            // visible and animated to the row will appear smooth
            row.scrollIntoView(viewEl, false);

            // Get the y position of the row relative to its top-most static parent.
            // offsetTop will be relative to the table, and is incorrect
            // when mixed with certain grid features (e.g., grouping).
            y = row.getXY()[1] - 5;
            rowH = row.getHeight();
            newHeight = rowH + (me.editingPlugin.grid.rowLines ? 9 : 10);

            // Set editor height to match the row height
            if (me.getHeight() != newHeight) {
                me.setHeight(newHeight);
                me.el.setLeft(0);
            }

            if (animateConfig) {
                animObj = {
                    to: {
                        y: y
                    },
                    duration: animateConfig.duration || 125,
                    listeners: {
                        afteranimate: function() {
                            invalidateScroller();
                            y = row.getXY()[1] - 5;
                        }
                    }
                };
                me.el.animate(animObj);
            } else {
                me.el.setY(y);
                invalidateScroller();
            }
        }
        if (me.getWidth() != mainBodyWidth) {
            me.setWidth(mainBodyWidth);
        }
        btnEl.setLeft(left);
    },

    getEditor: function(fieldInfo) {
        var me = this;

        if (Ext.isNumber(fieldInfo)) {
            // Query only form fields. This just future-proofs us in case we add
            // other components to RowEditor later on.  Don't want to mess with
            // indices.
            return me.query('>[isFormField]')[fieldInfo];
        } else if (fieldInfo.isHeader && !fieldInfo.isGroupHeader) {
            return fieldInfo.getEditor();
        }
    },

    removeField: function(field) {
        var me = this;

        // Incase we pass a column instead, which is fine
        field = me.getEditor(field);
        me.mun(field, 'validitychange', me.onValidityChange, me);

        // Remove field/column from our mapping, which will fire the event to
        // remove the field from our container
        me.columns.removeAtKey(field.id);
        Ext.destroy(field);
    },

    setField: function(column) {
        var me = this,
            i,
            length, field;

        if (Ext.isArray(column)) {
            length = column.length;

            for (i = 0; i < length; i++) {
                me.setField(column[i]);
            }

            return;
        }

        // Get a default display field if necessary
        field = column.getEditor(null, {
            xtype: 'displayfield',
            // Override Field's implementation so that the default display fields will not return values. This is done because
            // the display field will pick up column renderers from the grid.
            getModelData: function() {
                return null;
            }
        });
        field.margins = '0 0 0 2';
        me.mon(field, 'change', me.onFieldChange, me);
        
        if (me.isVisible() && me.context) {
            if (field.is('displayfield')) {
                me.renderColumnData(field, me.context.record, column);
            } else {
                field.suspendEvents();
                field.setValue(me.context.record.get(column.dataIndex));
                field.resumeEvents();
            }
        }

        // Maintain mapping of fields-to-columns
        // This will fire events that maintain our container items
        
        me.columns.add(field.id, column);
        if (column.hidden) {
            me.onColumnHide(column);
        } else if (column.rendered) {
            // Setting after initial render
            me.onColumnShow(column);
        }
    },

    loadRecord: function(record) {
        var me     = this,
            form   = me.getForm(),
            fields = form.getFields(),
            items  = fields.items,
            length = items.length,
            i, displayFields,
            isValid;
            
        // temporarily suspend events on form fields before loading record to prevent the fields' change events from firing
        for (i = 0; i < length; i++) {
            items[i].suspendEvents();
        }

        form.loadRecord(record);

        for (i = 0; i < length; i++) {
            items[i].resumeEvents();
        }

        isValid = form.isValid();
        if (me.errorSummary) {
            if (isValid) {
                me.hideToolTip();
            } else {
                me.showToolTip();
            }
        }
        
        me.updateButton(isValid);

        // render display fields so they honor the column renderer/template
        displayFields = me.query('>displayfield');
        length = displayFields.length;

        for (i = 0; i < length; i++) {
            me.renderColumnData(displayFields[i], record);
        }
    },

    renderColumnData: function(field, record, activeColumn) {
        var me = this,
            grid = me.editingPlugin.grid,
            headerCt = grid.headerCt,
            view = grid.view,
            store = view.store,
            column = activeColumn || me.columns.get(field.id),
            value = record.get(column.dataIndex),
            renderer = column.editRenderer || column.renderer,
            metaData,
            rowIdx,
            colIdx;

        // honor our column's renderer (TemplateHeader sets renderer for us!)
        if (renderer) {
            metaData = { tdCls: '', style: '' };
            rowIdx = store.indexOf(record);
            colIdx = headerCt.getHeaderIndex(column);

            value = renderer.call(
                column.scope || headerCt.ownerCt,
                value,
                metaData,
                record,
                rowIdx,
                colIdx,
                store,
                view
            );
        }

        field.setRawValue(value);
        field.resetOriginalValue();
    },

    beforeEdit: function() {
        var me = this;

        if (me.isVisible() && me.errorSummary && !me.autoCancel && me.isDirty()) {
            me.showToolTip();
            return false;
        }
    },

    /**
     * Start editing the specified grid at the specified position.
     * @param {Ext.data.Model} record The Store data record which backs the row to be edited.
     * @param {Ext.data.Model} columnHeader The Column object defining the column to be edited.
     */
    startEdit: function(record, columnHeader) {
        var me = this,
            grid = me.editingPlugin.grid,
            store = grid.store,
            context = me.context = Ext.apply(me.editingPlugin.context, {
                view: grid.getView(),
                store: store
            });

        // make sure our row is selected before editing
        context.grid.getSelectionModel().select(record);

        // Reload the record data
        me.loadRecord(record);

        if (!me.isVisible()) {
            me.show();
            me.focusContextCell();
        } else {
            me.reposition({
                callback: this.focusContextCell
            });
        }
    },

    // Focus the cell on start edit based upon the current context
    focusContextCell: function() {
        var field = this.getEditor(this.context.colIdx);
        if (field && field.focus) {
            field.focus();
        }
    },

    cancelEdit: function() {
        var me     = this,
            form   = me.getForm(),
            fields = form.getFields(),
            items  = fields.items,
            length = items.length,
            i;

        me.hide();
        form.clearInvalid();

        // temporarily suspend events on form fields before reseting the form to prevent the fields' change events from firing
        for (i = 0; i < length; i++) {
            items[i].suspendEvents();
        }

        form.reset();

        for (i = 0; i < length; i++) {
            items[i].resumeEvents();
        }
    },

    completeEdit: function() {
        var me = this,
            form = me.getForm();

        if (!form.isValid()) {
            return;
        }

        form.updateRecord(me.context.record);
        me.hide();
        return true;
    },

    onShow: function() {
        this.callParent(arguments);
        this.reposition();
    },

    onHide: function() {
        var me = this;
        me.callParent(arguments);
        if (me.tooltip) {
            me.hideToolTip();
        }
        if (me.context) {
            me.context.view.focus();
            me.context = null;
        }
    },

    isDirty: function() {
        var me = this,
            form = me.getForm();
        return form.isDirty();
    },

    getToolTip: function() {
        return this.tooltip || (this.tooltip = new Ext.tip.ToolTip({
            cls: Ext.baseCSSPrefix + 'grid-row-editor-errors',
            title: this.errorsText,
            autoHide: false,
            closable: true,
            closeAction: 'disable',
            anchor: 'left'
        }));
    },

    hideToolTip: function() {
        var me = this,
            tip = me.getToolTip();
        if (tip.rendered) {
            tip.disable();
        }
        me.hiddenTip = false;
    },

    showToolTip: function() {
        var me = this,
            tip = me.getToolTip(),
            context = me.context,
            row = Ext.get(context.row),
            viewEl = context.grid.view.el;

        tip.setTarget(row);
        tip.showAt([-10000, -10000]);
        tip.update(me.getErrors());
        tip.mouseOffset = [viewEl.getWidth() - row.getWidth() + me.lastScrollLeft + 15, 0];
        me.repositionTip();
        tip.doLayout();
        tip.enable();
    },

    repositionTip: function() {
        var me = this,
            tip = me.getToolTip(),
            context = me.context,
            row = Ext.get(context.row),
            viewEl = context.grid.view.el,
            viewHeight = viewEl.getHeight(),
            viewTop = me.lastScrollTop,
            viewBottom = viewTop + viewHeight,
            rowHeight = row.getHeight(),
            rowTop = row.dom.offsetTop,
            rowBottom = rowTop + rowHeight;

        if (rowBottom > viewTop && rowTop < viewBottom) {
            tip.show();
            me.hiddenTip = false;
        } else {
            tip.hide();
            me.hiddenTip = true;
        }
    },

    getErrors: function() {
        var me        = this,
            dirtyText = !me.autoCancel && me.isDirty() ? me.dirtyText + '<br />' : '',
            errors    = [],
            fields    = me.query('>[isFormField]'),
            length    = fields.length,
            i;

        function createListItem(e) {
            return '<li>' + e + '</li>';
        }

        for (i = 0; i < length; i++) {
            errors = errors.concat(
                Ext.Array.map(fields[i].getErrors(), createListItem)
            );
        }

        return dirtyText + '<ul>' + errors.join('') + '</ul>';
    },
    
    beforeDestroy: function(){
        Ext.destroy(this.floatingButtons, this.tooltip);
        this.callParent();    
    }
});
/**
 * The Ext.grid.plugin.RowEditing plugin injects editing at a row level for a Grid. When editing begins,
 * a small floating dialog will be shown for the appropriate row. Each editable column will show a field
 * for editing. There is a button to save or cancel all changes for the edit.
 *
 * The field that will be used for the editor is defined at the
 * {@link Ext.grid.column.Column#editor editor}. The editor can be a field instance or a field configuration.
 * If an editor is not specified for a particular column then that column won't be editable and the value of
 * the column will be displayed. To provide a custom renderer for non-editable values, use the 
 * {@link Ext.grid.column.Column#editRenderer editRenderer} configuration on the column.
 *
 * The editor may be shared for each column in the grid, or a different one may be specified for each column.
 * An appropriate field type should be chosen to match the data structure that it will be editing. For example,
 * to edit a date, it would be useful to specify {@link Ext.form.field.Date} as the editor.
 *
 *     @example
 *     Ext.create('Ext.data.Store', {
 *         storeId:'simpsonsStore',
 *         fields:['name', 'email', 'phone'],
 *         data: [
 *             {"name":"Lisa", "email":"lisa@simpsons.com", "phone":"555-111-1224"},
 *             {"name":"Bart", "email":"bart@simpsons.com", "phone":"555-222-1234"},
 *             {"name":"Homer", "email":"home@simpsons.com", "phone":"555-222-1244"},
 *             {"name":"Marge", "email":"marge@simpsons.com", "phone":"555-222-1254"}
 *         ]
 *     });
 *
 *     Ext.create('Ext.grid.Panel', {
 *         title: 'Simpsons',
 *         store: Ext.data.StoreManager.lookup('simpsonsStore'),
 *         columns: [
 *             {header: 'Name',  dataIndex: 'name', editor: 'textfield'},
 *             {header: 'Email', dataIndex: 'email', flex:1,
 *                 editor: {
 *                     xtype: 'textfield',
 *                     allowBlank: false
 *                 }
 *             },
 *             {header: 'Phone', dataIndex: 'phone'}
 *         ],
 *         selType: 'rowmodel',
 *         plugins: [
 *             Ext.create('Ext.grid.plugin.RowEditing', {
 *                 clicksToEdit: 1
 *             })
 *         ],
 *         height: 200,
 *         width: 400,
 *         renderTo: Ext.getBody()
 *     });
 *
 */
Ext.define('Ext.grid.plugin.RowEditing', {
    extend: 'Ext.grid.plugin.Editing',
    alias: 'plugin.rowediting',

    requires: [
        'Ext.grid.RowEditor'
    ],

    editStyle: 'row',

    /**
     * @cfg {Boolean} autoCancel
     * True to automatically cancel any pending changes when the row editor begins editing a new row.
     * False to force the user to explicitly cancel the pending changes. Defaults to true.
     */
    autoCancel: true,

    /**
     * @cfg {Number} clicksToMoveEditor
     * The number of clicks to move the row editor to a new row while it is visible and actively editing another row.
     * This will default to the same value as {@link Ext.grid.plugin.Editing#clicksToEdit clicksToEdit}.
     */

    /**
     * @cfg {Boolean} errorSummary
     * True to show a {@link Ext.tip.ToolTip tooltip} that summarizes all validation errors present
     * in the row editor. Set to false to prevent the tooltip from showing. Defaults to true.
     */
    errorSummary: true,

    constructor: function() {
        var me = this;

        me.callParent(arguments);

        if (!me.clicksToMoveEditor) {
            me.clicksToMoveEditor = me.clicksToEdit;
        }

        me.autoCancel = !!me.autoCancel;
    },

    init: function(grid) {
        this.callParent([grid]);
    },

    /**
     * @private
     * AbstractComponent calls destroy on all its plugins at destroy time.
     */
    destroy: function() {
        var me = this;
        Ext.destroy(me.editor);
        me.callParent(arguments);
    },

    /**
     * Starts editing the specified record, using the specified Column definition to define which field is being edited.
     * @param {Ext.data.Model} record The Store data record which backs the row to be edited.
     * @param {Ext.data.Model} columnHeader The Column object defining the column to be edited.
     * @return `true` if editing was started, `false` otherwise.
     */
    startEdit: function(record, columnHeader) {
        var me = this,
            editor = me.getEditor();

        if ((editor.beforeEdit() !== false) && (me.callParent(arguments) !== false)) {
            editor.startEdit(me.context.record, me.context.column);
            return true;
        }
        return false;
    },

    // private
    cancelEdit: function() {
        var me = this;

        if (me.editing) {
            me.getEditor().cancelEdit();
            me.callParent(arguments);
        }
    },

    // private
    completeEdit: function() {
        var me = this;

        if (me.editing && me.validateEdit()) {
            me.editing = false;
            me.fireEvent('edit', me, me.context);
        }
    },

    // private
    validateEdit: function() {
        var me             = this,
            editor         = me.editor,
            context        = me.context,
            record         = context.record,
            newValues      = {},
            originalValues = {},
            editors        = editor.items.items,
            e,
            eLen           = editors.length,
            name, item;

        for (e = 0; e < eLen; e++) {
            item = editors[e];
            name = item.name;

            newValues[name]      = item.getValue();
            originalValues[name] = record.get(name);
        }

        Ext.apply(context, {
            newValues      : newValues,
            originalValues : originalValues
        });

        return me.callParent(arguments) && me.getEditor().completeEdit();
    },

    // private
    getEditor: function() {
        var me = this;

        if (!me.editor) {
            me.editor = me.initEditor();
        }
        return me.editor;
    },

    // private
    initEditor: function() {
        var me       = this,
            grid     = me.grid,
            view     = me.view,
            headerCt = grid.headerCt,
            btns     = ['saveBtnText', 'cancelBtnText', 'errorsText', 'dirtyText'],
            b,
            bLen     = btns.length,
            cfg      = {
                autoCancel: me.autoCancel,
                errorSummary: me.errorSummary,
                fields: headerCt.getGridColumns(),
                hidden: true,
                view: view,
                // keep a reference..
                editingPlugin: me,
                renderTo: view.el
            },
            item;

        for (b = 0; b < bLen; b++) {
            item = btns[b];

            if (Ext.isDefined(me[item])) {
                cfg[item] = me[item];
            }
        }

        return Ext.create('Ext.grid.RowEditor', cfg);
    },

    // private
    initEditTriggers: function() {
        var me = this,
            view = me.view,
            moveEditorEvent = me.clicksToMoveEditor === 1 ? 'click' : 'dblclick';

        me.callParent(arguments);

        if (me.clicksToMoveEditor !== me.clicksToEdit) {
            me.mon(view, 'cell' + moveEditorEvent, me.moveEditorByClick, me);
        }

        view.on({
            render: function() {
                me.mon(me.grid.headerCt, {
                    scope: me,
                    columnresize: me.onColumnResize,
                    columnhide: me.onColumnHide,
                    columnshow: me.onColumnShow,
                    columnmove: me.onColumnMove
                });
            },
            single: true
        });
    },

    startEditByClick: function() {
        var me = this;
        if (!me.editing || me.clicksToMoveEditor === me.clicksToEdit) {
            me.callParent(arguments);
        }
    },

    moveEditorByClick: function() {
        var me = this;
        if (me.editing) {
            me.superclass.onCellClick.apply(me, arguments);
        }
    },
    
    // private
    onColumnAdd: function(ct, column) {
        if (column.isHeader) {
            var me = this,
                editor;

            me.initFieldAccessors(column);

            // Only inform the editor about a new column if the editor has already been instantiated,
            // so do not use getEditor which instantiates the editor if not present.
            editor = me.editor;
            if (editor && editor.onColumnAdd) {
                editor.onColumnAdd(column);
            }
        }
    },

    // private
    onColumnRemove: function(ct, column) {
        if (column.isHeader) {
            var me = this,
                editor = me.getEditor();

            if (editor && editor.onColumnRemove) {
                editor.onColumnRemove(column);
            }
            me.removeFieldAccessors(column);
        }
    },

    // private
    onColumnResize: function(ct, column, width) {
        if (column.isHeader) {
            var me = this,
                editor = me.getEditor();

            if (editor && editor.onColumnResize) {
                editor.onColumnResize(column, width);
            }
        }
    },

    // private
    onColumnHide: function(ct, column) {
        // no isHeader check here since its already a columnhide event.
        var me = this,
            editor = me.getEditor();

        if (editor && editor.onColumnHide) {
            editor.onColumnHide(column);
        }
    },

    // private
    onColumnShow: function(ct, column) {
        // no isHeader check here since its already a columnshow event.
        var me = this,
            editor = me.getEditor();

        if (editor && editor.onColumnShow) {
            editor.onColumnShow(column);
        }
    },

    // private
    onColumnMove: function(ct, column, fromIdx, toIdx) {
        // no isHeader check here since its already a columnmove event.
        var me = this,
            editor = me.getEditor();

        if (editor && editor.onColumnMove) {
            // Must adjust the toIdx to account for removal if moving rightwards
            // because RowEditor.onColumnMove just calls Container.move which does not do this.
            editor.onColumnMove(column, fromIdx, toIdx - (toIdx > fromIdx ? 1 : 0));
        }
    },

    // private
    setColumnField: function(column, field) {
        var me = this,
            editor = me.getEditor();
            
        editor.removeField(column);
        me.callParent(arguments);
        me.getEditor().setField(column);
    }
});
