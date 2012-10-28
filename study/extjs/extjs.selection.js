
/**
 * Tracks what records are currently selected in a databound component.
 *
 * This is an abstract class and is not meant to be directly used. Databound UI widgets such as
 * {@link Ext.grid.Panel Grid} and {@link Ext.tree.Panel Tree} should subclass Ext.selection.Model
 * and provide a way to binding to the component.
 *
 * The abstract methods `onSelectChange` and `onLastFocusChanged` should be implemented in these
 * subclasses to update the UI widget.
 */
Ext.define('Ext.selection.Model', {
    extend: 'Ext.util.Observable',
    alternateClassName: 'Ext.AbstractSelectionModel',
    requires: ['Ext.data.StoreManager'],
    mixins: {
        bindable: 'Ext.util.Bindable'    
    },
    // lastSelected

    /**
     * @cfg {String} mode
     * Mode of selection.  Valid values are:
     *
     * - **SINGLE** - Only allows selecting one item at a time.  Use {@link #allowDeselect} to allow
     *   deselecting that item.  This is the default.
     * - **SIMPLE** - Allows simple selection of multiple items one-by-one. Each click in grid will either
     *   select or deselect an item.
     * - **MULTI** - Allows complex selection of multiple items using Ctrl and Shift keys.
     */

    /**
     * @cfg {Boolean} allowDeselect
     * Allow users to deselect a record in a DataView, List or Grid.
     * Only applicable when the {@link #mode} is 'SINGLE'.
     */
    allowDeselect: false,

    /**
     * @property {Ext.util.MixedCollection} [selected=undefined]
     * A MixedCollection that maintains all of the currently selected records.
     * @readonly
     */
    selected: null,

    /**
     * @cfg {Boolean} pruneRemoved
     * Prune records when they are removed from the store from the selection.
     * This is a private flag. For an example of its usage, take a look at
     * Ext.selection.TreeModel.
     */
    pruneRemoved: true,

    constructor: function(cfg) {
        var me = this;

        cfg = cfg || {};
        Ext.apply(me, cfg);

        me.addEvents(
            /**
             * @event
             * Fired after a selection change has occurred
             * @param {Ext.selection.Model} this
             * @param {Ext.data.Model[]} selected The selected records
             */
            'selectionchange',
            /**
             * @event
             * Fired when a row is focused
             * @param {Ext.selection.Model} this
             * @param {Ext.data.Model} oldFocused The previously focused record
             * @param {Ext.data.Model} newFocused The newly focused record
             */
            'focuschange'
        );

        me.modes = {
            SINGLE: true,
            SIMPLE: true,
            MULTI: true
        };

        // sets this.selectionMode
        me.setSelectionMode(cfg.mode || me.mode);

        // maintains the currently selected records.
        me.selected = new Ext.util.MixedCollection();

        me.callParent(arguments);
    },

    // binds the store to the selModel.
    bindStore: function(store, initial){
        var me = this;
        me.mixins.bindable.bindStore.apply(me, arguments);
        if(me.store && !initial) {
            me.refresh();
        }
    },
    
    getStoreListeners: function() {
        var me = this;
        return {
            add: me.onStoreAdd,
            clear: me.onStoreClear,
            remove: me.onStoreRemove,
            update: me.onStoreUpdate    
        }; 
    },

    /**
     * Selects all records in the view.
     * @param {Boolean} suppressEvent True to suppress any select events
     */
    selectAll: function(suppressEvent) {
        var me = this,
            selections = me.store.getRange(),
            i = 0,
            len = selections.length,
            start = me.getSelection().length;

        me.bulkChange = true;
        for (; i < len; i++) {
            me.doSelect(selections[i], true, suppressEvent);
        }
        delete me.bulkChange;
        // fire selection change only if the number of selections differs
        me.maybeFireSelectionChange(me.getSelection().length !== start);
    },

    /**
     * Deselects all records in the view.
     * @param {Boolean} suppressEvent True to suppress any deselect events
     */
    deselectAll: function(suppressEvent) {
        var me = this,
            selections = me.getSelection(),
            i = 0,
            len = selections.length,
            start = me.getSelection().length;

        me.bulkChange = true;
        for (; i < len; i++) {
            me.doDeselect(selections[i], suppressEvent);
        }
        delete me.bulkChange;
        // fire selection change only if the number of selections differs
        me.maybeFireSelectionChange(me.getSelection().length !== start);
    },

    // Provides differentiation of logic between MULTI, SIMPLE and SINGLE
    // selection modes. Requires that an event be passed so that we can know
    // if user held ctrl or shift.
    selectWithEvent: function(record, e, keepExisting) {
        var me = this;

        switch (me.selectionMode) {
            case 'MULTI':
                if (e.ctrlKey && me.isSelected(record)) {
                    me.doDeselect(record, false);
                } else if (e.shiftKey && me.lastFocused) {
                    me.selectRange(me.lastFocused, record, e.ctrlKey);
                } else if (e.ctrlKey) {
                    me.doSelect(record, true, false);
                } else if (me.isSelected(record) && !e.shiftKey && !e.ctrlKey && me.selected.getCount() > 1) {
                    me.doSelect(record, keepExisting, false);
                } else {
                    me.doSelect(record, false);
                }
                break;
            case 'SIMPLE':
                if (me.isSelected(record)) {
                    me.doDeselect(record);
                } else {
                    me.doSelect(record, true);
                }
                break;
            case 'SINGLE':
                // if allowDeselect is on and this record isSelected, deselect it
                if (me.allowDeselect && me.isSelected(record)) {
                    me.doDeselect(record);
                // select the record and do NOT maintain existing selections
                } else {
                    me.doSelect(record, false);
                }
                break;
        }
    },

    /**
     * Selects a range of rows if the selection model {@link #isLocked is not locked}.
     * All rows in between startRow and endRow are also selected.
     * @param {Ext.data.Model/Number} startRow The record or index of the first row in the range
     * @param {Ext.data.Model/Number} endRow The record or index of the last row in the range
     * @param {Boolean} keepExisting (optional) True to retain existing selections
     */
    selectRange : function(startRow, endRow, keepExisting, dir){
        var me = this,
            store = me.store,
            selectedCount = 0,
            i,
            tmp,
            dontDeselect,
            records = [];

        if (me.isLocked()){
            return;
        }

        if (!keepExisting) {
            me.deselectAll(true);
        }

        if (!Ext.isNumber(startRow)) {
            startRow = store.indexOf(startRow);
        }
        if (!Ext.isNumber(endRow)) {
            endRow = store.indexOf(endRow);
        }

        // swap values
        if (startRow > endRow){
            tmp = endRow;
            endRow = startRow;
            startRow = tmp;
        }

        for (i = startRow; i <= endRow; i++) {
            if (me.isSelected(store.getAt(i))) {
                selectedCount++;
            }
        }

        if (!dir) {
            dontDeselect = -1;
        } else {
            dontDeselect = (dir == 'up') ? startRow : endRow;
        }

        for (i = startRow; i <= endRow; i++){
            if (selectedCount == (endRow - startRow + 1)) {
                if (i != dontDeselect) {
                    me.doDeselect(i, true);
                }
            } else {
                records.push(store.getAt(i));
            }
        }
        me.doMultiSelect(records, true);
    },

    /**
     * Selects a record instance by record instance or index.
     * @param {Ext.data.Model[]/Number} records An array of records or an index
     * @param {Boolean} [keepExisting=false] True to retain existing selections
     * @param {Boolean} [suppressEvent=false] True to not fire a select event
     */
    select: function(records, keepExisting, suppressEvent) {
        // Automatically selecting eg store.first() or store.last() will pass undefined, so that must just return;
        if (Ext.isDefined(records)) {
            this.doSelect(records, keepExisting, suppressEvent);
        }
    },

    /**
     * Deselects a record instance by record instance or index.
     * @param {Ext.data.Model[]/Number} records An array of records or an index
     * @param {Boolean} [suppressEvent=false] True to not fire a deselect event
     */
    deselect: function(records, suppressEvent) {
        this.doDeselect(records, suppressEvent);
    },

    doSelect: function(records, keepExisting, suppressEvent) {
        var me = this,
            record;

        if (me.locked || !me.store) {
            return;
        }
        if (typeof records === "number") {
            records = [me.store.getAt(records)];
        }
        if (me.selectionMode == "SINGLE" && records) {
            record = records.length ? records[0] : records;
            me.doSingleSelect(record, suppressEvent);
        } else {
            me.doMultiSelect(records, keepExisting, suppressEvent);
        }
    },

    doMultiSelect: function(records, keepExisting, suppressEvent) {
        var me = this,
            selected = me.selected,
            change = false,
            i = 0,
            len, record;

        if (me.locked) {
            return;
        }


        records = !Ext.isArray(records) ? [records] : records;
        len = records.length;
        if (!keepExisting && selected.getCount() > 0) {
            if (me.doDeselect(me.getSelection(), suppressEvent) === false) {
                return;
            }
            // TODO - coalesce the selectionchange event in deselect w/the one below...
        }

        function commit () {
            selected.add(record);
            change = true;
        }

        for (; i < len; i++) {
            record = records[i];
            if (keepExisting && me.isSelected(record)) {
                continue;
            }
            me.lastSelected = record;

            me.onSelectChange(record, true, suppressEvent, commit);
        }
        if (!me.preventFocus) {
            me.setLastFocused(record, suppressEvent);
        }
        // fire selchange if there was a change and there is no suppressEvent flag
        me.maybeFireSelectionChange(change && !suppressEvent);
    },

    // records can be an index, a record or an array of records
    doDeselect: function(records, suppressEvent) {
        var me = this,
            selected = me.selected,
            i = 0,
            len, record,
            attempted = 0,
            accepted = 0;

        if (me.locked || !me.store) {
            return false;
        }

        if (typeof records === "number") {
            records = [me.store.getAt(records)];
        } else if (!Ext.isArray(records)) {
            records = [records];
        }

        function commit () {
            ++accepted;
            selected.remove(record);
        }

        len = records.length;

        for (; i < len; i++) {
            record = records[i];
            if (me.isSelected(record)) {
                if (me.lastSelected == record) {
                    me.lastSelected = selected.last();
                }
                ++attempted;
                me.onSelectChange(record, false, suppressEvent, commit);
            }
        }

        // fire selchange if there was a change and there is no suppressEvent flag
        me.maybeFireSelectionChange(accepted > 0 && !suppressEvent);
        return accepted === attempted;
    },

    doSingleSelect: function(record, suppressEvent) {
        var me = this,
            changed = false,
            selected = me.selected;

        if (me.locked) {
            return;
        }
        // already selected.
        // should we also check beforeselect?
        if (me.isSelected(record)) {
            return;
        }

        function commit () {
            me.bulkChange = true;
            if (selected.getCount() > 0 && me.doDeselect(me.lastSelected, suppressEvent) === false) {
                delete me.bulkChange;
                return false;
            }
            delete me.bulkChange;

            selected.add(record);
            me.lastSelected = record;
            changed = true;
        }

        me.onSelectChange(record, true, suppressEvent, commit);

        if (changed) {
            if (!suppressEvent) {
                me.setLastFocused(record);
            }
            me.maybeFireSelectionChange(!suppressEvent);
        }
    },

    /**
     * Sets a record as the last focused record. This does NOT mean
     * that the record has been selected.
     * @param {Ext.data.Model} record
     */
    setLastFocused: function(record, supressFocus) {
        var me = this,
            recordBeforeLast = me.lastFocused;

        me.lastFocused = record;
         
        // Only call the changed method if in fact the selected record *has* changed.
        if (record !== recordBeforeLast) {
            me.onLastFocusChanged(recordBeforeLast, record, supressFocus);
        }
    },

    /**
     * Determines if this record is currently focused.
     * @param {Ext.data.Model} record
     */
    isFocused: function(record) {
        return record === this.getLastFocused();
    },


    // fire selection change as long as true is not passed
    // into maybeFireSelectionChange
    maybeFireSelectionChange: function(fireEvent) {
        var me = this;
        if (fireEvent && !me.bulkChange) {
            me.fireEvent('selectionchange', me, me.getSelection());
        }
    },

    /**
     * Returns the last selected record.
     */
    getLastSelected: function() {
        return this.lastSelected;
    },

    getLastFocused: function() {
        return this.lastFocused;
    },

    /**
     * Returns an array of the currently selected records.
     * @return {Ext.data.Model[]} The selected records
     */
    getSelection: function() {
        return this.selected.getRange();
    },

    /**
     * Returns the current selectionMode.
     * @return {String} The selectionMode: 'SINGLE', 'MULTI' or 'SIMPLE'.
     */
    getSelectionMode: function() {
        return this.selectionMode;
    },

    /**
     * Sets the current selectionMode.
     * @param {String} selMode 'SINGLE', 'MULTI' or 'SIMPLE'.
     */
    setSelectionMode: function(selMode) {
        selMode = selMode ? selMode.toUpperCase() : 'SINGLE';
        // set to mode specified unless it doesnt exist, in that case
        // use single.
        this.selectionMode = this.modes[selMode] ? selMode : 'SINGLE';
    },

    /**
     * Returns true if the selections are locked.
     * @return {Boolean}
     */
    isLocked: function() {
        return this.locked;
    },

    /**
     * Locks the current selection and disables any changes from happening to the selection.
     * @param {Boolean} locked  True to lock, false to unlock.
     */
    setLocked: function(locked) {
        this.locked = !!locked;
    },

    /**
     * Returns true if the specified row is selected.
     * @param {Ext.data.Model/Number} record The record or index of the record to check
     * @return {Boolean}
     */
    isSelected: function(record) {
        record = Ext.isNumber(record) ? this.store.getAt(record) : record;
        return this.selected.indexOf(record) !== -1;
    },

    /**
     * Returns true if there are any a selected records.
     * @return {Boolean}
     */
    hasSelection: function() {
        return this.selected.getCount() > 0;
    },

    refresh: function() {
        var me = this,
            store = me.store,
            toBeSelected = [],
            oldSelections = me.getSelection(),
            len = oldSelections.length,
            selection,
            change,
            i = 0,
            lastFocused = me.getLastFocused();

        // Not been bound yet.
        if (!store) {
            return;
        }

        // check to make sure that there are no records
        // missing after the refresh was triggered, prune
        // them from what is to be selected if so
        for (; i < len; i++) {
            selection = oldSelections[i];
            if (!me.pruneRemoved || store.indexOf(selection) !== -1) {
                toBeSelected.push(selection);
            }
        }

        // there was a change from the old selected and
        // the new selection
        if (me.selected.getCount() != toBeSelected.length) {
            change = true;
        }

        me.clearSelections();

        if (store.indexOf(lastFocused) !== -1) {
            // restore the last focus but supress restoring focus
            me.setLastFocused(lastFocused, true);
        }

        if (toBeSelected.length) {
            // perform the selection again
            me.doSelect(toBeSelected, false, true);
        }

        me.maybeFireSelectionChange(change);
    },

    /**
     * A fast reset of the selections without firing events, updating the ui, etc.
     * For private usage only.
     * @private
     */
    clearSelections: function() {
        // reset the entire selection to nothing
        this.selected.clear();
        this.lastSelected = null;
        this.setLastFocused(null);
    },

    // when a record is added to a store
    onStoreAdd: Ext.emptyFn,

    // when a store is cleared remove all selections
    // (if there were any)
    onStoreClear: function() {
        if (this.selected.getCount > 0) {
            this.clearSelections();
            this.maybeFireSelectionChange(true);
        }
    },

    // prune records from the SelectionModel if
    // they were selected at the time they were
    // removed.
    onStoreRemove: function(store, record, index) {
        var me = this,
            selected = me.selected;

        if (me.locked || !me.pruneRemoved) {
            return;
        }

        if (selected.remove(record)) {
            if (me.lastSelected == record) {
                me.lastSelected = null;
            }
            if (me.getLastFocused() == record) {
                me.setLastFocused(null);
            }
            me.maybeFireSelectionChange(true);
        }
    },

    /**
     * Returns the count of selected records.
     * @return {Number} The number of selected records
     */
    getCount: function() {
        return this.selected.getCount();
    },

    // cleanup.
    destroy: Ext.emptyFn,

    // if records are updated
    onStoreUpdate: Ext.emptyFn,

    /**
     * @abstract
     * @private
     */
    onStoreLoad: Ext.emptyFn,

    // @abstract
    onSelectChange: Ext.emptyFn,

    // @abstract
    onLastFocusChanged: function(oldFocused, newFocused) {
        this.fireEvent('focuschange', this, oldFocused, newFocused);
    },

    // @abstract
    onEditorKey: Ext.emptyFn,

    // @abstract
    bindComponent: Ext.emptyFn,

    // @abstract
    beforeViewRender: Ext.emptyFn

});

/**
 * @private
 */
Ext.define('Ext.selection.DataViewModel', {
    extend: 'Ext.selection.Model',

    requires: ['Ext.util.KeyNav'],

    deselectOnContainerClick: true,

    /**
     * @cfg {Boolean} enableKeyNav
     *
     * Turns on/off keyboard navigation within the DataView.
     */
    enableKeyNav: true,

    constructor: function(cfg){
        this.addEvents(
            /**
             * @event beforedeselect
             * Fired before a record is deselected. If any listener returns false, the
             * deselection is cancelled.
             * @param {Ext.selection.DataViewModel} this
             * @param {Ext.data.Model} record The deselected record
             */
            'beforedeselect',

            /**
             * @event beforeselect
             * Fired before a record is selected. If any listener returns false, the
             * selection is cancelled.
             * @param {Ext.selection.DataViewModel} this
             * @param {Ext.data.Model} record The selected record
             */
            'beforeselect',

            /**
             * @event deselect
             * Fired after a record is deselected
             * @param {Ext.selection.DataViewModel} this
             * @param  {Ext.data.Model} record The deselected record
             */
            'deselect',

            /**
             * @event select
             * Fired after a record is selected
             * @param {Ext.selection.DataViewModel} this
             * @param  {Ext.data.Model} record The selected record
             */
            'select'
        );
        this.callParent(arguments);
    },

    bindComponent: function(view) {
        var me = this,
            eventListeners = {
                refresh: me.refresh,
                scope: me
            };

        me.view = view;
        me.bindStore(view.getStore());

        eventListeners[view.triggerEvent] = me.onItemClick;
        eventListeners[view.triggerCtEvent] = me.onContainerClick;

        view.on(eventListeners);

        if (me.enableKeyNav) {
            me.initKeyNav(view);
        }
    },

    onItemClick: function(view, record, item, index, e) {
        this.selectWithEvent(record, e);
    },

    onContainerClick: function() {
        if (this.deselectOnContainerClick) {
            this.deselectAll();
        }
    },

    initKeyNav: function(view) {
        var me = this;

        if (!view.rendered) {
            view.on({
                render: Ext.Function.bind(me.initKeyNav, me, [view]),
                single: true
            });
            return;
        }

        view.el.set({
            tabIndex: -1
        });
        me.keyNav = new Ext.util.KeyNav({
            target: view.el,
            ignoreInputFields: true,
            down: Ext.pass(me.onNavKey, [1], me),
            right: Ext.pass(me.onNavKey, [1], me),
            left: Ext.pass(me.onNavKey, [-1], me),
            up: Ext.pass(me.onNavKey, [-1], me),
            scope: me
        });
    },

    onNavKey: function(step) {
        step = step || 1;
        var me = this,
            view = me.view,
            selected = me.getSelection()[0],
            numRecords = me.view.store.getCount(),
            idx;

        if (selected) {
            idx = view.indexOf(view.getNode(selected)) + step;
        } else {
            idx = 0;
        }

        if (idx < 0) {
            idx = numRecords - 1;
        } else if (idx >= numRecords) {
            idx = 0;
        }

        me.select(idx);
    },

    // Allow the DataView to update the ui
    onSelectChange: function(record, isSelected, suppressEvent, commitFn) {
        var me = this,
            view = me.view,
            eventName = isSelected ? 'select' : 'deselect';

        if ((suppressEvent || me.fireEvent('before' + eventName, me, record)) !== false &&
                commitFn() !== false) {

            if (view) {
                if (isSelected) {
                    view.onItemSelect(record);
                } else {
                    view.onItemDeselect(record);
                }
            }

            if (!suppressEvent) {
                me.fireEvent(eventName, me, record);
            }
        }
    },
    
    destroy: function(){
        Ext.destroy(this.keyNav);
        this.callParent();
    }
});



/**
 *
 */
Ext.define('Ext.selection.CellModel', {
    extend: 'Ext.selection.Model',
    alias: 'selection.cellmodel',
    requires: ['Ext.util.KeyNav'],

    isCellModel: true,

    /**
     * @cfg {Boolean} enableKeyNav
     * Turns on/off keyboard navigation within the grid.
     */
    enableKeyNav: true,

    /**
     * @cfg {Boolean} preventWrap
     * Set this configuration to true to prevent wrapping around of selection as
     * a user navigates to the first or last column.
     */
    preventWrap: false,

    // private property to use when firing a deselect when no old selection exists.
    noSelection: {
        row: -1,
        column: -1
    },

    constructor: function() {
        this.addEvents(
            /**
             * @event deselect
             * Fired after a cell is deselected
             * @param {Ext.selection.CellModel} this
             * @param {Ext.data.Model} record The record of the deselected cell
             * @param {Number} row The row index deselected
             * @param {Number} column The column index deselected
             */
            'deselect',

            /**
             * @event select
             * Fired after a cell is selected
             * @param {Ext.selection.CellModel} this
             * @param {Ext.data.Model} record The record of the selected cell
             * @param {Number} row The row index selected
             * @param {Number} column The column index selected
             */
            'select'
        );
        this.callParent(arguments);
    },

    bindComponent: function(view) {
        var me = this,
            grid = view.ownerCt;
        me.primaryView = view;
        me.views = me.views || [];
        me.views.push(view);
        me.bindStore(view.getStore(), true);

        view.on({
            cellmousedown: me.onMouseDown,
            refresh: me.onViewRefresh,
            scope: me
        });
        if (grid.optimizedColumnMove !== false) {
            grid.on('columnmove', me.onColumnMove, me);
        }

        if (me.enableKeyNav) {
            me.initKeyNav(view);
        }
    },

    initKeyNav: function(view) {
        var me = this;

        if (!view.rendered) {
            view.on('render', Ext.Function.bind(me.initKeyNav, me, [view], 0), me, {single: true});
            return;
        }

        view.el.set({
            tabIndex: -1
        });

        // view.el has tabIndex -1 to allow for
        // keyboard events to be passed to it.
        me.keyNav = new Ext.util.KeyNav({
            target: view.el,
            ignoreInputFields: true,
            up: me.onKeyUp,
            down: me.onKeyDown,
            right: me.onKeyRight,
            left: me.onKeyLeft,
            tab: me.onKeyTab,
            scope: me
        });
    },

    getHeaderCt: function() {
        var selection = this.getCurrentPosition(),
            view = selection ? selection.view : this.primaryView;

        return view.headerCt;
    },

    onKeyUp: function(e, t) {
        this.keyNavigation = true;
        this.move('up', e);
        this.keyNavigation = false;
    },

    onKeyDown: function(e, t) {
        this.keyNavigation = true;
        this.move('down', e);
        this.keyNavigation = false;
    },

    onKeyLeft: function(e, t) {
        this.keyNavigation = true;
        this.move('left', e);
        this.keyNavigation = false;
    },

    onKeyRight: function(e, t) {
        this.keyNavigation = true;
        this.move('right', e);
        this.keyNavigation = false;
    },

    move: function(dir, e) {
        var me = this,
            pos = me.getCurrentPosition(),
            
            // Calculate the new row and column position
            newPos = pos.view.walkCells(pos, dir, e, me.preventWrap);

        // If walk was successful, select new Position
        if (newPos) {
            newPos.view = pos.view;
            return me.setCurrentPosition(newPos);
        }
        // Enforce code correctness in unbuilt source.
        return null;
    },

    /**
     * Returns the current position in the format {row: row, column: column}
     */
    getCurrentPosition: function() {
        return this.selection;
    },

    /**
     * Sets the current position
     * @param {Object} position The position to set.
     */
    setCurrentPosition: function(pos) {
        var me = this;

        // onSelectChange uses lastSelection and nextSelection
        me.lastSelection = me.selection;
        if (me.selection) {
            me.onCellDeselect(me.selection);
        }

        if (pos) {
            me.nextSelection = new me.Selection(me);
            me.nextSelection.setPosition(pos);
            me.onCellSelect(me.nextSelection);

            // Deselect triggered by new selection will kill the selection property, so restore it here.
            return me.selection = me.nextSelection;
        }
        // Enforce code correctness in unbuilt source.
        return null;
    },

    // Keep selection model in consistent state upon record deletion.
    onStoreRemove: function(store, record, index) {
        var me = this,
            pos = me.getCurrentPosition();

        me.callParent(arguments);
        if (pos) {
            // Deleting the row containing the selection.
            // Attempt to reselect the same cell which has moved up if there is one
            if (pos.row == index) {
                if (index < store.getCount() - 1) {
                    pos.setPosition(index, pos.column);
                    me.setCurrentPosition(pos);
                } else {
                    delete me.selection;
                }
            }
            // Deleting a row before the selection.
            // Move the selection up by one row
            else if (index < pos.row) {
                pos.setPosition(pos.row - 1, pos.column);
                me.setCurrentPosition(pos);
            }
        }
    },

    /**
     * Set the current position based on where the user clicks.
     * @private
     */
    onMouseDown: function(view, cell, cellIndex, record, row, rowIndex, e) {
        this.setCurrentPosition({
            view: view,
            row: rowIndex,
            column: cellIndex
        });
    },

    // notify the view that the cell has been selected to update the ui
    // appropriately and bring the cell into focus
    onCellSelect: function(position, supressEvent) {
        if (position && position.row !== undefined && position.row > -1) {
            this.doSelect(position.view.getStore().getAt(position.row), /*keepExisting*/false, supressEvent);
        }
    },

    // notify view that the cell has been deselected to update the ui
    // appropriately
    onCellDeselect: function(position, supressEvent) {
        if (position && position.row !== undefined) {
            this.doDeselect(position.view.getStore().getAt(position.row), supressEvent);
        }
    },

    onSelectChange: function(record, isSelected, suppressEvent, commitFn) {
        var me = this,
            pos,
            eventName,
            view;

        if (isSelected) {
            pos = me.nextSelection;
            eventName = 'select';
        } else {
            pos = me.lastSelection || me.noSelection;
            eventName = 'deselect';
        }

        // CellModel may be shared between two sides of a Lockable.
        // The position must include a reference to the view in which the selection is current.
        // Ensure we use the view specifiied by the position.
        view = pos.view || me.primaryView;

        if ((suppressEvent || me.fireEvent('before' + eventName, me, record, pos.row, pos.column)) !== false &&
                commitFn() !== false) {

            if (isSelected) {
                view.onCellSelect(pos);
                view.onCellFocus(pos);
            } else {
                view.onCellDeselect(pos);
                delete me.selection;
            }

            if (!suppressEvent) {
                me.fireEvent(eventName, me, record, pos.row, pos.column);
            }
        }
    },

    // Tab key from the View's KeyNav, *not* from an editor.
    onKeyTab: function(e, t) {
        var me = this,
            editingPlugin = me.getCurrentPosition().view.editingPlugin;

        // If we were in editing mode, but just focused on a non-editable cell, behave as if we tabbed off an editable field
        if (editingPlugin && me.wasEditing) {
            me.onEditorTab(editingPlugin, e)
        } else {
            me.move(e.shiftKey ? 'left' : 'right', e);
        }
    },

    onEditorTab: function(editingPlugin, e) {
        var me = this,
            direction = e.shiftKey ? 'left' : 'right',
            position  = me.move(direction, e);

        // Navigation had somewhere to go.... not hit the buffers.
        if (position) {
            // If we were able to begin editing clear the wasEditing flag. It gets set during navigation off an active edit.
            if (editingPlugin.startEditByPosition(position)) {
                me.wasEditing = false;
            }
            // If we could not continue editing...
            // Set a flag that we should go back into editing mode upon next onKeyTab call
            else {
                me.wasEditing = true;
                if (!position.columnHeader.dataIndex) {
                    me.onEditorTab(editingPlugin, e);
                }
            }
        }
    },

    refresh: function() {
        var pos = this.getCurrentPosition(),
            selRowIdx;

        // Synchronize the current position's row with the row of the last selected record.
        if (pos && (selRowIdx = this.store.indexOf(this.selected.last())) !== -1) {
            pos.row = selRowIdx;
        }
    },

    /**
     * @private
     * When grid uses {@link Ext.panel.Table#optimizedColumnMove optimizedColumnMove} (the default), this is added as a
     * {@link Ext.panel.Table#columnmove columnmove} handler to correctly maintain the
     * selected column using the same column header.
     * 
     * If optimizedColumnMove === false, (which some grid Features set) then the view is refreshed,
     * so this is not added as a handler because the selected column.
     */
    onColumnMove: function(headerCt, header, fromIdx, toIdx) {
        var grid = headerCt.up('tablepanel');
        if (grid) {
            this.onViewRefresh(grid.view);
        }
    },

    onViewRefresh: function(view) {
        var me = this,
            pos = me.getCurrentPosition(),
            headerCt = view.headerCt,
            record, columnHeader;

        // Re-establish selection of the same cell coordinate.
        // DO NOT fire events because the selected 
        if (pos && pos.view === view) {
            record = pos.record;
            columnHeader = pos.columnHeader;

            // After a refresh, recreate the selection using the same record and grid column as before
            if (!columnHeader.isDescendantOf(headerCt)) {
                // column header is not a child of the header container
                // this happens when the grid is reconfigured with new columns
                // make a best effor to select something by matching on id, then text, then dataIndex
                columnHeader = headerCt.queryById(columnHeader.id) || 
                               headerCt.down('[text="' + columnHeader.text + '"]') ||
                               headerCt.down('[dataIndex="' + columnHeader.dataIndex + '"]');
            }

            // If we have a columnHeader (either the column header that already exists in
            // the headerCt, or a suitable match that was found after reconfiguration)
            // AND the record still exists in the store (or a record matching the id of
            // the previously selected record) We are ok to go ahead and set the selection
            if (columnHeader && (view.store.indexOfId(record.getId()) !== -1)) {
                me.setCurrentPosition({
                    row: record,
                    column: columnHeader,
                    view: view
                });
            }
        }
    },

    selectByPosition: function(position) {
        this.setCurrentPosition(position);
    }
}, function() {
    
    // Encapsulate a single selection position.
    // Maintains { row: n, column: n, record: r, columnHeader: c}
    var Selection = this.prototype.Selection = function(model) {
        this.model = model;
    };
    // Selection row/record & column/columnHeader
    Selection.prototype.setPosition = function(row, col) {
        var me = this,
            view;

        // We were passed {row: 1, column: 2, view: myView}
        if (arguments.length === 1) {
            
            // SelectionModel is shared between both sides of a locking grid.
            // It can be positioned on either view.
            if (row.view) {
                me.view = view = row.view;
            }
            col = row.column;
            row = row.row;
        }
        
        // If setting the position without specifying a view, and the position is already without a view
        // use the owning Model's primary view
        if (!view) {
            me.view = view = me.model.primaryView;
        }

        // Row index passed
        if (typeof row === 'number') {
            me.row = row;
            me.record = view.store.getAt(row);
        }
        // row is a Record
        else if (row.isModel) {
            me.record = row;
            me.row = view.indexOf(row);
        }
        // row is a grid row
        else if (row.tagName) {
            me.record = view.getRecord(row);
            me.row = view.indexOf(me.record);
        }
        
        // column index passed
        if (typeof col === 'number') {
            me.column = col;
            me.columnHeader = view.getHeaderAtIndex(col);
        }
        // col is a column Header
        else {
            me.columnHeader = col;
            me.column = col.getIndex();
        }
        return me;
    }
});
/**
 * Implements row based navigation via keyboard.
 *
 * Must synchronize across grid sections.
 */
Ext.define('Ext.selection.RowModel', {
    extend: 'Ext.selection.Model',
    alias: 'selection.rowmodel',
    requires: ['Ext.util.KeyNav'],

    /**
     * @private
     * Number of pixels to scroll to the left/right when pressing
     * left/right keys.
     */
    deltaScroll: 5,

    /**
     * @cfg {Boolean} enableKeyNav
     *
     * Turns on/off keyboard navigation within the grid.
     */
    enableKeyNav: true,
    
    /**
     * @cfg {Boolean} [ignoreRightMouseSelection=false]
     * True to ignore selections that are made when using the right mouse button if there are
     * records that are already selected. If no records are selected, selection will continue 
     * as normal
     */
    ignoreRightMouseSelection: false,

    constructor: function() {
        this.addEvents(
            /**
             * @event beforedeselect
             * Fired before a record is deselected. If any listener returns false, the
             * deselection is cancelled.
             * @param {Ext.selection.RowModel} this
             * @param {Ext.data.Model} record The deselected record
             * @param {Number} index The row index deselected
             */
            'beforedeselect',

            /**
             * @event beforeselect
             * Fired before a record is selected. If any listener returns false, the
             * selection is cancelled.
             * @param {Ext.selection.RowModel} this
             * @param {Ext.data.Model} record The selected record
             * @param {Number} index The row index selected
             */
            'beforeselect',

            /**
             * @event deselect
             * Fired after a record is deselected
             * @param {Ext.selection.RowModel} this
             * @param {Ext.data.Model} record The deselected record
             * @param {Number} index The row index deselected
             */
            'deselect',

            /**
             * @event select
             * Fired after a record is selected
             * @param {Ext.selection.RowModel} this
             * @param {Ext.data.Model} record The selected record
             * @param {Number} index The row index selected
             */
            'select'
        );
        this.views = [];
        this.callParent(arguments);
    },

    bindComponent: function(view) {
        var me = this;

        me.views = me.views || [];
        me.views.push(view);
        me.bindStore(view.getStore(), true);

        view.on({
            itemmousedown: me.onRowMouseDown,
            scope: me
        });

        if (me.enableKeyNav) {
            me.initKeyNav(view);
        }
    },

    initKeyNav: function(view) {
        var me = this;

        if (!view.rendered) {
            view.on('render', Ext.Function.bind(me.initKeyNav, me, [view], 0), me, {single: true});
            return;
        }

        // view.el has tabIndex -1 to allow for
        // keyboard events to be passed to it.
        view.el.set({
            tabIndex: -1
        });

        // Drive the KeyNav off the View's itemkeydown event so that beforeitemkeydown listeners may veto
        me.keyNav = new Ext.util.KeyNav({
            target: view,
            ignoreInputFields: true,
            eventName: 'itemkeydown',
            processEvent: function(view, record, node, index, event) {
                event.record = record;
                event.recordIndex = index;
                return event;
            },
            up: me.onKeyUp,
            down: me.onKeyDown,
            right: me.onKeyRight,
            left: me.onKeyLeft,
            pageDown: me.onKeyPageDown,
            pageUp: me.onKeyPageUp,
            home: me.onKeyHome,
            end: me.onKeyEnd,
            space: me.onKeySpace,
            enter: me.onKeyEnter,
            scope: me
        });
    },

    // Returns the number of rows currently visible on the screen or
    // false if there were no rows. This assumes that all rows are
    // of the same height and the first view is accurate.
    getRowsVisible: function() {
        var rowsVisible = false,
            view = this.views[0],
            row = view.getNode(0),
            rowHeight, gridViewHeight;

        if (row) {
            rowHeight = Ext.fly(row).getHeight();
            gridViewHeight = view.el.getHeight();
            rowsVisible = Math.floor(gridViewHeight / rowHeight);
        }

        return rowsVisible;
    },

    // go to last visible record in grid.
    onKeyEnd: function(e) {
        var me = this,
            last = me.store.getAt(me.store.getCount() - 1);

        if (last) {
            if (e.shiftKey) {
                me.selectRange(last, me.lastFocused || 0);
                me.setLastFocused(last);
            } else if (e.ctrlKey) {
                me.setLastFocused(last);
            } else {
                me.doSelect(last);
            }
        }
    },

    // go to first visible record in grid.
    onKeyHome: function(e) {
        var me = this,
            first = me.store.getAt(0);

        if (first) {
            if (e.shiftKey) {
                me.selectRange(first, me.lastFocused || 0);
                me.setLastFocused(first);
            } else if (e.ctrlKey) {
                me.setLastFocused(first);
            } else {
                me.doSelect(first, false);
            }
        }
    },

    // Go one page up from the lastFocused record in the grid.
    onKeyPageUp: function(e) {
        var me = this,
            rowsVisible = me.getRowsVisible(),
            selIdx,
            prevIdx,
            prevRecord;

        if (rowsVisible) {
            selIdx = e.recordIndex;
            prevIdx = selIdx - rowsVisible;
            if (prevIdx < 0) {
                prevIdx = 0;
            }
            prevRecord = me.store.getAt(prevIdx);
            if (e.shiftKey) {
                me.selectRange(prevRecord, e.record, e.ctrlKey, 'up');
                me.setLastFocused(prevRecord);
            } else if (e.ctrlKey) {
                e.preventDefault();
                me.setLastFocused(prevRecord);
            } else {
                me.doSelect(prevRecord);
            }

        }
    },

    // Go one page down from the lastFocused record in the grid.
    onKeyPageDown: function(e) {
        var me = this,
            rowsVisible = me.getRowsVisible(),
            selIdx,
            nextIdx,
            nextRecord;

        if (rowsVisible) {
            selIdx = e.recordIndex;
            nextIdx = selIdx + rowsVisible;
            if (nextIdx >= me.store.getCount()) {
                nextIdx = me.store.getCount() - 1;
            }
            nextRecord = me.store.getAt(nextIdx);
            if (e.shiftKey) {
                me.selectRange(nextRecord, e.record, e.ctrlKey, 'down');
                me.setLastFocused(nextRecord);
            } else if (e.ctrlKey) {
                // some browsers, this means go thru browser tabs
                // attempt to stop.
                e.preventDefault();
                me.setLastFocused(nextRecord);
            } else {
                me.doSelect(nextRecord);
            }
        }
    },

    // Select/Deselect based on pressing Spacebar.
    // Assumes a SIMPLE selectionmode style
    onKeySpace: function(e) {
        var me = this,
            record = me.lastFocused;

        if (record) {
            if (me.isSelected(record)) {
                me.doDeselect(record, false);
            } else {
                me.doSelect(record, true);
            }
        }
    },
    
    onKeyEnter: Ext.emptyFn,

    // Navigate one record up. This could be a selection or
    // could be simply focusing a record for discontiguous
    // selection. Provides bounds checking.
    onKeyUp: function(e) {
        var me = this,
            idx  = me.store.indexOf(me.lastFocused),
            record;

        if (idx > 0) {
            // needs to be the filtered count as thats what
            // will be visible.
            record = me.store.getAt(idx - 1);
            if (e.shiftKey && me.lastFocused) {
                if (me.isSelected(me.lastFocused) && me.isSelected(record)) {
                    me.doDeselect(me.lastFocused, true);
                    me.setLastFocused(record);
                } else if (!me.isSelected(me.lastFocused)) {
                    me.doSelect(me.lastFocused, true);
                    me.doSelect(record, true);
                } else {
                    me.doSelect(record, true);
                }
            } else if (e.ctrlKey) {
                me.setLastFocused(record);
            } else {
                me.doSelect(record);
                //view.focusRow(idx - 1);
            }
        }
        // There was no lastFocused record, and the user has pressed up
        // Ignore??
        //else if (this.selected.getCount() == 0) {
        //
        //    this.doSelect(record);
        //    //view.focusRow(idx - 1);
        //}
    },

    // Navigate one record down. This could be a selection or
    // could be simply focusing a record for discontiguous
    // selection. Provides bounds checking.
    onKeyDown: function(e) {
        var me = this,
            idx  = me.store.indexOf(me.lastFocused),
            record;

        // needs to be the filtered count as thats what
        // will be visible.
        if (idx + 1 < me.store.getCount()) {
            record = me.store.getAt(idx + 1);
            if (me.selected.getCount() === 0) {
                if (!e.ctrlKey) {
                    me.doSelect(record);
                } else {
                    me.setLastFocused(record);
                }
                //view.focusRow(idx + 1);
            } else if (e.shiftKey && me.lastFocused) {
                if (me.isSelected(me.lastFocused) && me.isSelected(record)) {
                    me.doDeselect(me.lastFocused, true);
                    me.setLastFocused(record);
                } else if (!me.isSelected(me.lastFocused)) {
                    me.doSelect(me.lastFocused, true);
                    me.doSelect(record, true);
                } else {
                    me.doSelect(record, true);
                }
            } else if (e.ctrlKey) {
                me.setLastFocused(record);
            } else {
                me.doSelect(record);
                //view.focusRow(idx + 1);
            }
        }
    },

    scrollByDeltaX: function(delta) {
        var view    = this.views[0],
            section = view.up(),
            hScroll = section.horizontalScroller;

        if (hScroll) {
            hScroll.scrollByDeltaX(delta);
        }
    },

    onKeyLeft: function(e) {
        this.scrollByDeltaX(-this.deltaScroll);
    },

    onKeyRight: function(e) {
        this.scrollByDeltaX(this.deltaScroll);
    },

    // Select the record with the event included so that
    // we can take into account ctrlKey, shiftKey, etc
    onRowMouseDown: function(view, record, item, index, e) {
        if (!this.allowRightMouseSelection(e)) {
            return;
        }

        if (e.button === 0 || !this.isSelected(record)) {
            this.selectWithEvent(record, e);
        }
    },
    
    /**
     * Checks whether a selection should proceed based on the ignoreRightMouseSelection
     * option.
     * @private
     * @param {Ext.EventObject} e The event
     * @return {Boolean} False if the selection should not proceed
     */
    allowRightMouseSelection: function(e) {
        var disallow = this.ignoreRightMouseSelection && e.button !== 0;
        if (disallow) {
            disallow = this.hasSelection();
        }
        return !disallow;
    },

    // Allow the GridView to update the UI by
    // adding/removing a CSS class from the row.
    onSelectChange: function(record, isSelected, suppressEvent, commitFn) {
        var me      = this,
            views   = me.views,
            viewsLn = views.length,
            store   = me.store,
            rowIdx  = store.indexOf(record),
            eventName = isSelected ? 'select' : 'deselect',
            i = 0;

        if ((suppressEvent || me.fireEvent('before' + eventName, me, record, rowIdx)) !== false &&
                commitFn() !== false) {

            for (; i < viewsLn; i++) {
                if (isSelected) {
                    views[i].onRowSelect(rowIdx, suppressEvent);
                } else {
                    views[i].onRowDeselect(rowIdx, suppressEvent);
                }
            }

            if (!suppressEvent) {
                me.fireEvent(eventName, me, record, rowIdx);
            }
        }
    },

    // Provide indication of what row was last focused via
    // the gridview.
    onLastFocusChanged: function(oldFocused, newFocused, supressFocus) {
        var views   = this.views,
            viewsLn = views.length,
            store   = this.store,
            rowIdx,
            i = 0;

        if (oldFocused) {
            rowIdx = store.indexOf(oldFocused);
            if (rowIdx != -1) {
                for (; i < viewsLn; i++) {
                    views[i].onRowFocus(rowIdx, false);
                }
            }
        }

        if (newFocused) {
            rowIdx = store.indexOf(newFocused);
            if (rowIdx != -1) {
                for (i = 0; i < viewsLn; i++) {
                    views[i].onRowFocus(rowIdx, true, supressFocus);
                }
            }
        }
        this.callParent();
    },

    onEditorTab: function(editingPlugin, e) {
        var me = this,
            view = me.views[0],
            record = editingPlugin.getActiveRecord(),
            header = editingPlugin.getActiveColumn(),
            position = view.getPosition(record, header),
            direction = e.shiftKey ? 'left' : 'right';

        do {
            position  = view.walkCells(position, direction, e, me.preventWrap);
        } while(position && !view.headerCt.getHeaderAtIndex(position.column).getEditor());

        if (position) {
            editingPlugin.startEditByPosition(position);
        }
    },


    /**
     * Returns position of the first selected cell in the selection in the format {row: row, column: column}
     */
    getCurrentPosition: function() {
        var firstSelection = this.selected.items[0];
        if (firstSelection) {
            return {
                row: this.store.indexOf(firstSelection),
                column: 0
            };
        }
    },

    selectByPosition: function(position) {
        var record = this.store.getAt(position.row);
        this.select(record);
    },


    /**
     * Selects the record immediately following the currently selected record.
     * @param {Boolean} [keepExisting] True to retain existing selections
     * @param {Boolean} [suppressEvent] Set to false to not fire a select event
     * @return {Boolean} `true` if there is a next record, else `false`
     */
    selectNext: function(keepExisting, suppressEvent) {
        var me = this,
            store = me.store,
            selection = me.getSelection(),
            record = selection[selection.length - 1],
            index = store.indexOf(record) + 1,
            success;

        if(index === store.getCount() || index === 0) {
            success = false;
        } else {
            me.doSelect(index, keepExisting, suppressEvent);
            success = true;
        }
        return success;
    },

    /**
     * Selects the record that precedes the currently selected record.
     * @param {Boolean} [keepExisting] True to retain existing selections
     * @param {Boolean} [suppressEvent] Set to false to not fire a select event
     * @return {Boolean} `true` if there is a previous record, else `false`
     */
    selectPrevious: function(keepExisting, suppressEvent) {
        var me = this,
            selection = me.getSelection(),
            record = selection[0],
            index = me.store.indexOf(record) - 1,
            success;

        if (index < 0) {
            success = false;
        } else {
            me.doSelect(index, keepExisting, suppressEvent);
            success = true;
        }
        return success;
    }
});
/**
 * A selection model that renders a column of checkboxes that can be toggled to
 * select or deselect rows. The default mode for this selection model is MULTI.
 *
 * The selection model will inject a header for the checkboxes in the first view
 * and according to the 'injectCheckbox' configuration.
 */
Ext.define('Ext.selection.CheckboxModel', {
    alias: 'selection.checkboxmodel',
    extend: 'Ext.selection.RowModel',

    /**
     * @cfg {String} mode
     * Modes of selection.
     * Valid values are SINGLE, SIMPLE, and MULTI.
     */
    mode: 'MULTI',

    /**
     * @cfg {Number/String} [injectCheckbox=0]
     * The index at which to insert the checkbox column.
     * Supported values are a numeric index, and the strings 'first' and 'last'.
     */
    injectCheckbox: 0,

    /**
     * @cfg {Boolean} checkOnly
     * True if rows can only be selected by clicking on the checkbox column.
     */
    checkOnly: false,
    
    /**
     * @cfg {Boolean} showHeaderCheckbox
     * Configure as `false` to not display the header checkbox at the top of the column.
     */
    showHeaderCheckbox: true,

    headerWidth: 24,

    // private
    checkerOnCls: Ext.baseCSSPrefix + 'grid-hd-checker-on',

    // private
    refreshOnRemove: true,

    beforeViewRender: function(view) {
        var me = this;
        me.callParent(arguments);

        // if we have a locked header, only hook up to the first
        if (!me.hasLockedHeader() || view.headerCt.lockedCt) {
            if (me.showHeaderCheckbox !== false) {
                view.headerCt.on('headerclick', me.onHeaderClick, me);
            }
            me.addCheckbox(view, true);
            me.mon(view.ownerCt, 'reconfigure', me.onReconfigure, me);
        }
    },

    bindComponent: function(view) {
        var me = this;
        me.sortable = false;
        me.callParent(arguments);
    },

    hasLockedHeader: function(){
        var views     = this.views,
            vLen      = views.length,
            v;

        for (v = 0; v < vLen; v++) {
            if (views[v].headerCt.lockedCt) {
                return true;
            }
        }
        return false;
    },

    /**
     * Add the header checkbox to the header row
     * @private
     * @param {Boolean} initial True if we're binding for the first time.
     */
    addCheckbox: function(view, initial){
        var me = this,
            checkbox = me.injectCheckbox,
            headerCt = view.headerCt;

        // Preserve behaviour of false, but not clear why that would ever be done.
        if (checkbox !== false) {
            if (checkbox == 'first') {
                checkbox = 0;
            } else if (checkbox == 'last') {
                checkbox = headerCt.getColumnCount();
            }
            Ext.suspendLayouts();
            headerCt.add(checkbox,  me.getHeaderConfig());
            Ext.resumeLayouts();
        }

        if (initial !== true) {
            view.refresh();
        }
    },

    /**
     * Handles the grid's reconfigure event.  Adds the checkbox header if the columns have been reconfigured.
     * @private
     * @param {Ext.panel.Table} grid
     * @param {Ext.data.Store} store
     * @param {Object[]} columns
     */
    onReconfigure: function(grid, store, columns) {
        if(columns) {
            this.addCheckbox(this.views[0]);
        }
    },

    /**
     * Toggle the ui header between checked and unchecked state.
     * @param {Boolean} isChecked
     * @private
     */
    toggleUiHeader: function(isChecked) {
        var view     = this.views[0],
            headerCt = view.headerCt,
            checkHd  = headerCt.child('gridcolumn[isCheckerHd]');

        if (checkHd) {
            if (isChecked) {
                checkHd.el.addCls(this.checkerOnCls);
            } else {
                checkHd.el.removeCls(this.checkerOnCls);
            }
        }
    },

    /**
     * Toggle between selecting all and deselecting all when clicking on
     * a checkbox header.
     */
    onHeaderClick: function(headerCt, header, e) {
        if (header.isCheckerHd) {
            e.stopEvent();
            var me = this,
                isChecked = header.el.hasCls(Ext.baseCSSPrefix + 'grid-hd-checker-on');
                
            // Prevent focus changes on the view, since we're selecting/deselecting all records
            me.preventFocus = true;
            if (isChecked) {
                me.deselectAll();
            } else {
                me.selectAll();
            }
            delete me.preventFocus;
        }
    },

    /**
     * Retrieve a configuration to be used in a HeaderContainer.
     * This should be used when injectCheckbox is set to false.
     */
    getHeaderConfig: function() {
        var me = this,
            showCheck = me.showHeaderCheckbox !== false;

        return {
            isCheckerHd: showCheck,
            text : '&#160;',
            width: me.headerWidth,
            sortable: false,
            draggable: false,
            resizable: false,
            hideable: false,
            menuDisabled: true,
            dataIndex: '',
            cls: showCheck ? Ext.baseCSSPrefix + 'column-header-checkbox ' : '',
            renderer: Ext.Function.bind(me.renderer, me),
            editRenderer: me.editRenderer || me.renderEmpty,
            locked: me.hasLockedHeader()
        };
    },
    
    renderEmpty: function(){
        return '&#160;';    
    },

    /**
     * Generates the HTML to be rendered in the injected checkbox column for each row.
     * Creates the standard checkbox markup by default; can be overridden to provide custom rendering.
     * See {@link Ext.grid.column.Column#renderer} for description of allowed parameters.
     */
    renderer: function(value, metaData, record, rowIndex, colIndex, store, view) {
        var baseCSSPrefix = Ext.baseCSSPrefix;
        metaData.tdCls = baseCSSPrefix + 'grid-cell-special ' + baseCSSPrefix + 'grid-cell-row-checker';
        return '<div class="' + baseCSSPrefix + 'grid-row-checker">&#160;</div>';
    },

    // override
    onRowMouseDown: function(view, record, item, index, e) {
        view.el.focus();
        var me = this,
            checker = e.getTarget('.' + Ext.baseCSSPrefix + 'grid-row-checker'),
            mode;
            
        if (!me.allowRightMouseSelection(e)) {
            return;
        }

        // checkOnly set, but we didn't click on a checker.
        if (me.checkOnly && !checker) {
            return;
        }

        if (checker) {
            mode = me.getSelectionMode();
            // dont change the mode if its single otherwise
            // we would get multiple selection
            if (mode !== 'SINGLE') {
                me.setSelectionMode('SIMPLE');
            }
            me.selectWithEvent(record, e);
            me.setSelectionMode(mode);
        } else {
            me.selectWithEvent(record, e);
        }
    },

    /**
     * Synchronize header checker value as selection changes.
     * @private
     */
    onSelectChange: function() {
        var me = this;
        me.callParent(arguments);
        me.updateHeaderState();
    },

    /**
     * @private
     */
    onStoreLoad: function() {
        var me = this;
        me.callParent(arguments);
        me.updateHeaderState();
    },

    /**
     * @private
     */
    updateHeaderState: function() {
        // check to see if all records are selected
        var hdSelectStatus = this.selected.getCount() === this.store.getCount();
        this.toggleUiHeader(hdSelectStatus);
    }
});

/**
 * Adds custom behavior for left/right keyboard navigation for use with a tree.
 * Depends on the view having an expand and collapse method which accepts a
 * record.
 * 
 * @private
 */
Ext.define('Ext.selection.TreeModel', {
    extend: 'Ext.selection.RowModel',
    alias: 'selection.treemodel',
    
    // typically selection models prune records from the selection
    // model when they are removed, because the TreeView constantly
    // adds/removes records as they are expanded/collapsed
    pruneRemoved: false,
    
    onKeyRight: function(e, t) {
        var focused = this.getLastFocused(),
            view    = this.view;
            
        if (focused) {
            // tree node is already expanded, go down instead
            // this handles both the case where we navigate to firstChild and if
            // there are no children to the nextSibling
            if (focused.isExpanded()) {
                this.onKeyDown(e, t);
            // if its not a leaf node, expand it
            } else if (focused.isExpandable()) {
                view.expand(focused);
            }
        }
    },
    
    onKeyLeft: function(e, t) {
        var focused = this.getLastFocused(),
            view    = this.view,
            viewSm  = view.getSelectionModel(),
            parentNode, parentRecord;

        if (focused) {
            parentNode = focused.parentNode;
            // if focused node is already expanded, collapse it
            if (focused.isExpanded()) {
                view.collapse(focused);
            // has a parentNode and its not root
            // TODO: this needs to cover the case where the root isVisible
            } else if (parentNode && !parentNode.isRoot()) {
                // Select a range of records when doing multiple selection.
                if (e.shiftKey) {
                    viewSm.selectRange(parentNode, focused, e.ctrlKey, 'up');
                    viewSm.setLastFocused(parentNode);
                // just move focus, not selection
                } else if (e.ctrlKey) {
                    viewSm.setLastFocused(parentNode);
                // select it
                } else {
                    viewSm.select(parentNode);
                }
            }
        }
    },
    
    onKeySpace: function(e, t) {
        this.toggleCheck(e);
    },
    
    onKeyEnter: function(e, t) {
        this.toggleCheck(e);
    },
    
    toggleCheck: function(e){
        e.stopEvent();
        var selected = this.getLastSelected();
        if (selected) {
            this.view.onCheckChange(selected);
        }
    }
});
