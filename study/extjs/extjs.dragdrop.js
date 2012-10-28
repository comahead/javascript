

/*
 * This is a derivative of the similarly named class in the YUI Library.
 * The original license:
 * Copyright (c) 2006, Yahoo! Inc. All rights reserved.
 * Code licensed under the BSD License:
 * http://developer.yahoo.net/yui/license.txt
 */


/**
 * DragDropManager is a singleton that tracks the element interaction for
 * all DragDrop items in the window.  Generally, you will not call
 * this class directly, but it does have helper methods that could
 * be useful in your DragDrop implementations.
 */
Ext.define('Ext.dd.DragDropManager', {
    singleton: true,

    requires: ['Ext.util.Region'],

    uses: ['Ext.tip.QuickTipManager'],

    // shorter ClassName, to save bytes and use internally
    alternateClassName: ['Ext.dd.DragDropMgr', 'Ext.dd.DDM'],

    /**
     * @property {String[]} ids
     * Two dimensional Array of registered DragDrop objects.  The first
     * dimension is the DragDrop item group, the second the DragDrop
     * object.
     * @private
     */
    ids: {},

    /**
     * @property {String[]} handleIds
     * Array of element ids defined as drag handles.  Used to determine
     * if the element that generated the mousedown event is actually the
     * handle and not the html element itself.
     * @private
     */
    handleIds: {},

    /**
     * @property {Ext.dd.DragDrop} dragCurrent
     * the DragDrop object that is currently being dragged
     * @private
     */
    dragCurrent: null,

    /**
     * @property {Ext.dd.DragDrop[]} dragOvers
     * the DragDrop object(s) that are being hovered over
     * @private
     */
    dragOvers: {},

    /**
     * @property {Number} deltaX
     * the X distance between the cursor and the object being dragged
     * @private
     */
    deltaX: 0,

    /**
     * @property {Number} deltaY
     * the Y distance between the cursor and the object being dragged
     * @private
     */
    deltaY: 0,

    /**
     * @property {Boolean} preventDefault
     * Flag to determine if we should prevent the default behavior of the
     * events we define. By default this is true, but this can be set to
     * false if you need the default behavior (not recommended)
     */
    preventDefault: true,

    /**
     * @property {Boolean} stopPropagation
     * Flag to determine if we should stop the propagation of the events
     * we generate. This is true by default but you may want to set it to
     * false if the html element contains other features that require the
     * mouse click.
     */
    stopPropagation: true,

    /**
     * Internal flag that is set to true when drag and drop has been
     * intialized
     * @property initialized
     * @private
     */
    initialized: false,

    /**
     * All drag and drop can be disabled.
     * @property locked
     * @private
     */
    locked: false,

    /**
     * Called the first time an element is registered.
     * @private
     */
    init: function() {
        this.initialized = true;
    },

    /**
     * @property {Number} POINT
     * In point mode, drag and drop interaction is defined by the
     * location of the cursor during the drag/drop
     */
    POINT: 0,

    /**
     * @property {Number} INTERSECT
     * In intersect mode, drag and drop interaction is defined by the
     * overlap of two or more drag and drop objects.
     */
    INTERSECT: 1,

    /**
     * @property {Number} mode
     * The current drag and drop mode.  Default: POINT
     */
    mode: 0,

    /**
     * @property {Boolean} [notifyOccluded=false]
     * This config is only provided to provide old, usually unwanted drag/drop behaviour.
     *
     * From ExtJS 4.1.0 onwards, when drop targets are contained in floating, absolutely positioned elements
     * such as in {@link Ext.window.Window Windows}, which may overlap each other, `over` and `drop` events
     * are only delivered to the topmost drop target at the mouse position.
     *
     * If all targets below that in zIndex order should also receive notifications, set
     * `notifyOccluded` to `true`.
     */
    notifyOccluded: false,

    /**
     * Runs method on all drag and drop objects
     * @private
     */
    _execOnAll: function(sMethod, args) {
        var i, j, oDD;
        for (i in this.ids) {
            for (j in this.ids[i]) {
                oDD = this.ids[i][j];
                if (! this.isTypeOfDD(oDD)) {
                    continue;
                }
                oDD[sMethod].apply(oDD, args);
            }
        }
    },

    /**
     * Drag and drop initialization.  Sets up the global event handlers
     * @private
     */
    _onLoad: function() {

        this.init();

        var Event = Ext.EventManager;
        Event.on(document, "mouseup",   this.handleMouseUp, this, true);
        Event.on(document, "mousemove", this.handleMouseMove, this, true);
        Event.on(window,   "unload",    this._onUnload, this, true);
        Event.on(window,   "resize",    this._onResize, this, true);
        // Event.on(window,   "mouseout",    this._test);

    },

    /**
     * Reset constraints on all drag and drop objs
     * @private
     */
    _onResize: function(e) {
        this._execOnAll("resetConstraints", []);
    },

    /**
     * Lock all drag and drop functionality
     */
    lock: function() { this.locked = true; },

    /**
     * Unlock all drag and drop functionality
     */
    unlock: function() { this.locked = false; },

    /**
     * Is drag and drop locked?
     * @return {Boolean} True if drag and drop is locked, false otherwise.
     */
    isLocked: function() { return this.locked; },

    /**
     * @property {Object} locationCache
     * Location cache that is set for all drag drop objects when a drag is
     * initiated, cleared when the drag is finished.
     * @private
     */
    locationCache: {},

    /**
     * @property {Boolean} useCache
     * Set useCache to false if you want to force object the lookup of each
     * drag and drop linked element constantly during a drag.
     */
    useCache: true,

    /**
     * @property {Number} clickPixelThresh
     * The number of pixels that the mouse needs to move after the
     * mousedown before the drag is initiated.  Default=3;
     */
    clickPixelThresh: 3,

    /**
     * @property {Number} clickTimeThresh
     * The number of milliseconds after the mousedown event to initiate the
     * drag if we don't get a mouseup event. Default=350
     */
    clickTimeThresh: 350,

    /**
     * @property {Boolean} dragThreshMet
     * Flag that indicates that either the drag pixel threshold or the
     * mousdown time threshold has been met
     * @private
     */
    dragThreshMet: false,

    /**
     * @property {Object} clickTimeout
     * Timeout used for the click time threshold
     * @private
     */
    clickTimeout: null,

    /**
     * @property {Number} startX
     * The X position of the mousedown event stored for later use when a
     * drag threshold is met.
     * @private
     */
    startX: 0,

    /**
     * @property {Number} startY
     * The Y position of the mousedown event stored for later use when a
     * drag threshold is met.
     * @private
     */
    startY: 0,

    /**
     * Each DragDrop instance must be registered with the DragDropManager.
     * This is executed in DragDrop.init()
     * @param {Ext.dd.DragDrop} oDD the DragDrop object to register
     * @param {String} sGroup the name of the group this element belongs to
     */
    regDragDrop: function(oDD, sGroup) {
        if (!this.initialized) { this.init(); }

        if (!this.ids[sGroup]) {
            this.ids[sGroup] = {};
        }
        this.ids[sGroup][oDD.id] = oDD;
    },

    /**
     * Removes the supplied dd instance from the supplied group. Executed
     * by DragDrop.removeFromGroup, so don't call this function directly.
     * @private
     */
    removeDDFromGroup: function(oDD, sGroup) {
        if (!this.ids[sGroup]) {
            this.ids[sGroup] = {};
        }

        var obj = this.ids[sGroup];
        if (obj && obj[oDD.id]) {
            delete obj[oDD.id];
        }
    },

    /**
     * Unregisters a drag and drop item.  This is executed in
     * DragDrop.unreg, use that method instead of calling this directly.
     * @private
     */
    _remove: function(oDD) {
        for (var g in oDD.groups) {
            if (g && this.ids[g] && this.ids[g][oDD.id]) {
                delete this.ids[g][oDD.id];
            }
        }
        delete this.handleIds[oDD.id];
    },

    /**
     * Each DragDrop handle element must be registered.  This is done
     * automatically when executing DragDrop.setHandleElId()
     * @param {String} sDDId the DragDrop id this element is a handle for
     * @param {String} sHandleId the id of the element that is the drag
     * handle
     */
    regHandle: function(sDDId, sHandleId) {
        if (!this.handleIds[sDDId]) {
            this.handleIds[sDDId] = {};
        }
        this.handleIds[sDDId][sHandleId] = sHandleId;
    },

    /**
     * Utility function to determine if a given element has been
     * registered as a drag drop item.
     * @param {String} id the element id to check
     * @return {Boolean} true if this element is a DragDrop item,
     * false otherwise
     */
    isDragDrop: function(id) {
        return ( this.getDDById(id) ) ? true : false;
    },

    /**
     * Returns the drag and drop instances that are in all groups the
     * passed in instance belongs to.
     * @param {Ext.dd.DragDrop} p_oDD the obj to get related data for
     * @param {Boolean} bTargetsOnly if true, only return targetable objs
     * @return {Ext.dd.DragDrop[]} the related instances
     */
    getRelated: function(p_oDD, bTargetsOnly) {
        var oDDs = [],
            i, j, dd;
        for (i in p_oDD.groups) {
            for (j in this.ids[i]) {
                dd = this.ids[i][j];
                if (! this.isTypeOfDD(dd)) {
                    continue;
                }
                if (!bTargetsOnly || dd.isTarget) {
                    oDDs[oDDs.length] = dd;
                }
            }
        }

        return oDDs;
    },

    /**
     * Returns true if the specified dd target is a legal target for
     * the specifice drag obj
     * @param {Ext.dd.DragDrop} oDD the drag obj
     * @param {Ext.dd.DragDrop} oTargetDD the target
     * @return {Boolean} true if the target is a legal target for the
     * dd obj
     */
    isLegalTarget: function (oDD, oTargetDD) {
        var targets = this.getRelated(oDD, true),
            i, len;
        for (i=0, len=targets.length;i<len;++i) {
            if (targets[i].id == oTargetDD.id) {
                return true;
            }
        }

        return false;
    },

    /**
     * My goal is to be able to transparently determine if an object is
     * typeof DragDrop, and the exact subclass of DragDrop.  typeof
     * returns "object", oDD.constructor.toString() always returns
     * "DragDrop" and not the name of the subclass.  So for now it just
     * evaluates a well-known variable in DragDrop.
     * @param {Object} the object to evaluate
     * @return {Boolean} true if typeof oDD = DragDrop
     */
    isTypeOfDD: function (oDD) {
        return (oDD && oDD.__ygDragDrop);
    },

    /**
     * Utility function to determine if a given element has been
     * registered as a drag drop handle for the given Drag Drop object.
     * @param {String} id the element id to check
     * @return {Boolean} true if this element is a DragDrop handle, false
     * otherwise
     */
    isHandle: function(sDDId, sHandleId) {
        return ( this.handleIds[sDDId] &&
                        this.handleIds[sDDId][sHandleId] );
    },

    /**
     * Returns the DragDrop instance for a given id
     * @param {String} id the id of the DragDrop object
     * @return {Ext.dd.DragDrop} the drag drop object, null if it is not found
     */
    getDDById: function(id) {
        var me = this,
            i, dd;
        for (i in this.ids) {
            dd = this.ids[i][id];
            if (dd instanceof Ext.dd.DDTarget) {
                return dd;
            }
        }
        return null;
    },

    /**
     * Fired after a registered DragDrop object gets the mousedown event.
     * Sets up the events required to track the object being dragged
     * @param {Event} e the event
     * @param {Ext.dd.DragDrop} oDD the DragDrop object being dragged
     * @private
     */
    handleMouseDown: function(e, oDD) {
        if(Ext.tip.QuickTipManager){
            Ext.tip.QuickTipManager.ddDisable();
        }
        if(this.dragCurrent){
            // the original browser mouseup wasn't handled (e.g. outside FF browser window)
            // so clean up first to avoid breaking the next drag
            this.handleMouseUp(e);
        }

        this.currentTarget = e.getTarget();
        this.dragCurrent = oDD;

        var el = oDD.getEl();
        
        // We use this to handle an issu where a mouseup will not be detected 
        // if the mouseup event happens outside of the browser window. When the 
        // mouse comes back, any drag will still be active
        // http://msdn.microsoft.com/en-us/library/ms537630(VS.85).aspx
        if (Ext.isIE && el.setCapture) {
            el.setCapture();
        }

        // track start position
        this.startX = e.getPageX();
        this.startY = e.getPageY();

        this.deltaX = this.startX - el.offsetLeft;
        this.deltaY = this.startY - el.offsetTop;

        this.dragThreshMet = false;

        this.clickTimeout = setTimeout(
                function() {
                    var DDM = Ext.dd.DragDropManager;
                    DDM.startDrag(DDM.startX, DDM.startY);
                },
                this.clickTimeThresh );
    },

    /**
     * Fired when either the drag pixel threshol or the mousedown hold
     * time threshold has been met.
     * @param {Number} x the X position of the original mousedown
     * @param {Number} y the Y position of the original mousedown
     */
    startDrag: function(x, y) {
        clearTimeout(this.clickTimeout);
        if (this.dragCurrent) {
            this.dragCurrent.b4StartDrag(x, y);
            this.dragCurrent.startDrag(x, y);
        }
        this.dragThreshMet = true;
    },

    /**
     * Internal function to handle the mouseup event.  Will be invoked
     * from the context of the document.
     * @param {Event} e the event
     * @private
     */
    handleMouseUp: function(e) {
        var current = this.dragCurrent;
        
        if(Ext.tip && Ext.tip.QuickTipManager){
            Ext.tip.QuickTipManager.ddEnable();
        }
        if (!current) {
            return;
        }
        
        // See setCapture call in handleMouseDown
        if (Ext.isIE && document.releaseCapture) {
            document.releaseCapture();
        }

        clearTimeout(this.clickTimeout);

        if (this.dragThreshMet) {
            this.fireEvents(e, true);
        }

        this.stopDrag(e);

        this.stopEvent(e);
    },

    /**
     * Utility to stop event propagation and event default, if these
     * features are turned on.
     * @param {Event} e the event as returned by this.getEvent()
     */
    stopEvent: function(e){
        if(this.stopPropagation) {
            e.stopPropagation();
        }

        if (this.preventDefault) {
            e.preventDefault();
        }
    },

    /**
     * Internal function to clean up event handlers after the drag
     * operation is complete
     * @param {Event} e the event
     * @private
     */
    stopDrag: function(e) {
        // Fire the drag end event for the item that was dragged
        if (this.dragCurrent) {
            if (this.dragThreshMet) {
                this.dragCurrent.b4EndDrag(e);
                this.dragCurrent.endDrag(e);
            }

            this.dragCurrent.onMouseUp(e);
        }

        this.dragCurrent = null;
        this.dragOvers = {};
    },

    /**
     * Internal function to handle the mousemove event.  Will be invoked
     * from the context of the html element.
     *
     * @TODO figure out what we can do about mouse events lost when the
     * user drags objects beyond the window boundary.  Currently we can
     * detect this in internet explorer by verifying that the mouse is
     * down during the mousemove event.  Firefox doesn't give us the
     * button state on the mousemove event.
     *
     * @param {Event} e the event
     * @private
     */
    handleMouseMove: function(e) {
        var me = this,
            diffX,
            diffY;
            
        if (!me.dragCurrent) {
            return true;
        }

        if (!me.dragThreshMet) {
            diffX = Math.abs(me.startX - e.getPageX());
            diffY = Math.abs(me.startY - e.getPageY());
            if (diffX > me.clickPixelThresh ||
                        diffY > me.clickPixelThresh) {
                me.startDrag(me.startX, me.startY);
            }
        }

        if (me.dragThreshMet) {
            me.dragCurrent.b4Drag(e);
            me.dragCurrent.onDrag(e);
            if(!me.dragCurrent.moveOnly){
                me.fireEvents(e, false);
            }
        }

        me.stopEvent(e);

        return true;
    },

    /**
     * Iterates over all of the DragDrop elements to find ones we are
     * hovering over or dropping on
     * @param {Event} e the event
     * @param {Boolean} isDrop is this a drop op or a mouseover op?
     * @private
     */
    fireEvents: function(e, isDrop) {
        var me = this,
            dragCurrent = me.dragCurrent,
            mousePoint = e.getPoint(),
            overTarget,
            overTargetEl,
            allTargets = [],
            oldOvers  = [],  // cache the previous dragOver array
            outEvts   = [],
            overEvts  = [],
            dropEvts  = [],
            enterEvts = [],
            needsSort,
            i,
            len,
            sGroup;

        // If the user did the mouse up outside of the window, we could
        // get here even though we have ended the drag.
        if (!dragCurrent || dragCurrent.isLocked()) {
            return;
        }

        // Check to see if the object(s) we were hovering over is no longer
        // being hovered over so we can fire the onDragOut event
        for (i in me.dragOvers) {

            overTarget = me.dragOvers[i];

            if (! me.isTypeOfDD(overTarget)) {
                continue;
            }

            if (! this.isOverTarget(mousePoint, overTarget, me.mode)) {
                outEvts.push( overTarget );
            }

            oldOvers[i] = true;
            delete me.dragOvers[i];
        }

        // Collect all targets which are members of the same ddGoups that the dragCurrent is a member of, and which may recieve mouseover and drop notifications.
        // This is preparatory to seeing which one(s) we are currently over
        // Begin by iterating through the ddGroups of which the dragCurrent is a member
        for (sGroup in dragCurrent.groups) {

            if ("string" != typeof sGroup) {
                continue;
            }

            // Loop over the registered members of each group, testing each as a potential target
            for (i in me.ids[sGroup]) {
                overTarget = me.ids[sGroup][i];

                // The target is valid if it is a DD type
                // And it's got a DOM element
                // And it's configured to be a drop target
                // And it's not locked
                // And the DOM element is fully visible with no hidden ancestors
                // And it's either not the dragCurrent, or, if it is, tha dragCurrent is configured to not ignore itself.
                if (me.isTypeOfDD(overTarget) &&
                        (overTargetEl = overTarget.getEl()) &&
                        (overTarget.isTarget) &&
                        (!overTarget.isLocked()) &&
                        (Ext.fly(overTargetEl).isVisible(true)) &&
                        ((overTarget != dragCurrent) || (dragCurrent.ignoreSelf === false))) {

                    // Only sort by zIndex if there were some which had a floating zIndex value
                    if ((overTarget.zIndex = me.getZIndex(overTargetEl)) !== -1) {
                        needsSort = true;
                    }
                    allTargets.push(overTarget);
                }
            }
        }

        // If there were floating targets, sort the highest zIndex to the top
        if (needsSort) {
            Ext.Array.sort(allTargets, me.byZIndex);
        }

        // Loop through possible targets, notifying the one(s) we are over.
        // Usually we only deliver events to the topmost.
        for (i = 0, len = allTargets.length; i < len; i++) {
            overTarget = allTargets[i];

            // If we are over the overTarget, queue it up to recieve an event of whatever type we are handling
            if (me.isOverTarget(mousePoint, overTarget, me.mode)) {
                // look for drop interactions
                if (isDrop) {
                    dropEvts.push( overTarget );
                // look for drag enter and drag over interactions
                } else {

                    // initial drag over: dragEnter fires
                    if (!oldOvers[overTarget.id]) {
                        enterEvts.push( overTarget );
                    // subsequent drag overs: dragOver fires
                    } else {
                        overEvts.push( overTarget );
                    }
                    me.dragOvers[overTarget.id] = overTarget;
                }

                // Unless this DragDropManager has been explicitly configured to deliver events to multiple targets, then we are done.
                if (!me.notifyOccluded) {
                    break;
                }
            }
        }

        if (me.mode) {
            if (outEvts.length) {
                dragCurrent.b4DragOut(e, outEvts);
                dragCurrent.onDragOut(e, outEvts);
            }

            if (enterEvts.length) {
                dragCurrent.onDragEnter(e, enterEvts);
            }

            if (overEvts.length) {
                dragCurrent.b4DragOver(e, overEvts);
                dragCurrent.onDragOver(e, overEvts);
            }

            if (dropEvts.length) {
                dragCurrent.b4DragDrop(e, dropEvts);
                dragCurrent.onDragDrop(e, dropEvts);
            }

        } else {
            // fire dragout events
            for (i=0, len=outEvts.length; i<len; ++i) {
                dragCurrent.b4DragOut(e, outEvts[i].id);
                dragCurrent.onDragOut(e, outEvts[i].id);
            }

            // fire enter events
            for (i=0,len=enterEvts.length; i<len; ++i) {
                // dc.b4DragEnter(e, oDD.id);
                dragCurrent.onDragEnter(e, enterEvts[i].id);
            }

            // fire over events
            for (i=0,len=overEvts.length; i<len; ++i) {
                dragCurrent.b4DragOver(e, overEvts[i].id);
                dragCurrent.onDragOver(e, overEvts[i].id);
            }

            // fire drop events
            for (i=0, len=dropEvts.length; i<len; ++i) {
                dragCurrent.b4DragDrop(e, dropEvts[i].id);
                dragCurrent.onDragDrop(e, dropEvts[i].id);
            }

        }

        // notify about a drop that did not find a target
        if (isDrop && !dropEvts.length) {
            dragCurrent.onInvalidDrop(e);
        }

    },

    /**
     * @private
     * Collects the z-index of the passed element, looking up the parentNode axis to find an absolutely positioned ancestor
     * which is able to yield a z-index. If found to be not absolutely positionedm returns -1.
     *
     * This is used when sorting potential drop targets into z-index order so that only the topmost receives `over` and `drop` events.
     *
     * @return {Number} The z-index of the element, or of its topmost absolutely positioned ancestor. Returns -1 if the element is not
     * absolutely positioned.
     */
    getZIndex: function(element) {
        var body = document.body,
            z,
            zIndex = -1;

        element = Ext.getDom(element);
        while (element !== body) {
            if (!isNaN(z = Number(Ext.fly(element).getStyle('zIndex')))) {
                zIndex = z;
            }
            element = element.parentNode;
        }
        return zIndex;
    },

    /**
     * @private
     * Utility method to pass to {@link Ext.Array#sort} when sorting potential drop targets by z-index.
     */
    byZIndex: function(d1, d2) {
        return d1.zIndex < d2.zIndex;
    },

    /**
     * Helper function for getting the best match from the list of drag
     * and drop objects returned by the drag and drop events when we are
     * in INTERSECT mode.  It returns either the first object that the
     * cursor is over, or the object that has the greatest overlap with
     * the dragged element.
     * @param  {Ext.dd.DragDrop[]} dds The array of drag and drop objects
     * targeted
     * @return {Ext.dd.DragDrop}       The best single match
     */
    getBestMatch: function(dds) {
        var winner = null,
            len = dds.length,
            i, dd;
        // Return null if the input is not what we expect
        //if (!dds || !dds.length || dds.length == 0) {
           // winner = null;
        // If there is only one item, it wins
        //} else if (dds.length == 1) {


        if (len == 1) {
            winner = dds[0];
        } else {
            // Loop through the targeted items
            for (i=0; i<len; ++i) {
                dd = dds[i];
                // If the cursor is over the object, it wins.  If the
                // cursor is over multiple matches, the first one we come
                // to wins.
                if (dd.cursorIsOver) {
                    winner = dd;
                    break;
                // Otherwise the object with the most overlap wins
                } else {
                    if (!winner ||
                        winner.overlap.getArea() < dd.overlap.getArea()) {
                        winner = dd;
                    }
                }
            }
        }

        return winner;
    },

    /**
     * Refreshes the cache of the top-left and bottom-right points of the
     * drag and drop objects in the specified group(s).  This is in the
     * format that is stored in the drag and drop instance, so typical
     * usage is:
     *
     *     Ext.dd.DragDropManager.refreshCache(ddinstance.groups);
     *
     * Alternatively:
     *
     *     Ext.dd.DragDropManager.refreshCache({group1:true, group2:true});
     *
     * @TODO this really should be an indexed array.  Alternatively this
     * method could accept both.
     *
     * @param {Object} groups an associative array of groups to refresh
     */
    refreshCache: function(groups) {
        var sGroup, i, oDD, loc;
        for (sGroup in groups) {
            if ("string" != typeof sGroup) {
                continue;
            }
            for (i in this.ids[sGroup]) {
                oDD = this.ids[sGroup][i];

                if (this.isTypeOfDD(oDD)) {
                // if (this.isTypeOfDD(oDD) && oDD.isTarget) {
                    loc = this.getLocation(oDD);
                    if (loc) {
                        this.locationCache[oDD.id] = loc;
                    } else {
                        delete this.locationCache[oDD.id];
                        // this will unregister the drag and drop object if
                        // the element is not in a usable state
                        // oDD.unreg();
                    }
                }
            }
        }
    },

    /**
     * This checks to make sure an element exists and is in the DOM.  The
     * main purpose is to handle cases where innerHTML is used to remove
     * drag and drop objects from the DOM.  IE provides an 'unspecified
     * error' when trying to access the offsetParent of such an element
     * @param {HTMLElement} el the element to check
     * @return {Boolean} true if the element looks usable
     */
    verifyEl: function(el) {
        if (el) {
            var parent;
            if(Ext.isIE){
                try{
                    parent = el.offsetParent;
                }catch(e){}
            }else{
                parent = el.offsetParent;
            }
            if (parent) {
                return true;
            }
        }

        return false;
    },

    /**
     * Returns a Region object containing the drag and drop element's position
     * and size, including the padding configured for it
     * @param {Ext.dd.DragDrop} oDD the drag and drop object to get the location for.
     * @return {Ext.util.Region} a Region object representing the total area
     * the element occupies, including any padding
     * the instance is configured for.
     */
    getLocation: function(oDD) {
        if (! this.isTypeOfDD(oDD)) {
            return null;
        }

        //delegate getLocation method to the
        //drag and drop target.
        if (oDD.getRegion) {
            return oDD.getRegion();
        }

        var el = oDD.getEl(), pos, x1, x2, y1, y2, t, r, b, l;

        try {
            pos= Ext.Element.getXY(el);
        } catch (e) { }

        if (!pos) {
            return null;
        }

        x1 = pos[0];
        x2 = x1 + el.offsetWidth;
        y1 = pos[1];
        y2 = y1 + el.offsetHeight;

        t = y1 - oDD.padding[0];
        r = x2 + oDD.padding[1];
        b = y2 + oDD.padding[2];
        l = x1 - oDD.padding[3];

        return new Ext.util.Region(t, r, b, l);
    },

    /**
     * Checks the cursor location to see if it over the target
     * @param {Ext.util.Point} pt The point to evaluate
     * @param {Ext.dd.DragDrop} oTarget the DragDrop object we are inspecting
     * @return {Boolean} true if the mouse is over the target
     * @private
     */
    isOverTarget: function(pt, oTarget, intersect) {
        // use cache if available
        var loc = this.locationCache[oTarget.id],
            dc, pos, el, curRegion, overlap;
        if (!loc || !this.useCache) {
            loc = this.getLocation(oTarget);
            this.locationCache[oTarget.id] = loc;

        }

        if (!loc) {
            return false;
        }

        oTarget.cursorIsOver = loc.contains( pt );

        // DragDrop is using this as a sanity check for the initial mousedown
        // in this case we are done.  In POINT mode, if the drag obj has no
        // contraints, we are also done. Otherwise we need to evaluate the
        // location of the target as related to the actual location of the
        // dragged element.
        dc = this.dragCurrent;
        if (!dc || !dc.getTargetCoord ||
                (!intersect && !dc.constrainX && !dc.constrainY)) {
            return oTarget.cursorIsOver;
        }

        oTarget.overlap = null;

        // Get the current location of the drag element, this is the
        // location of the mouse event less the delta that represents
        // where the original mousedown happened on the element.  We
        // need to consider constraints and ticks as well.
        pos = dc.getTargetCoord(pt.x, pt.y);

        el = dc.getDragEl();
        curRegion = new Ext.util.Region(pos.y,
                                               pos.x + el.offsetWidth,
                                               pos.y + el.offsetHeight,
                                               pos.x );

        overlap = curRegion.intersect(loc);

        if (overlap) {
            oTarget.overlap = overlap;
            return (intersect) ? true : oTarget.cursorIsOver;
        } else {
            return false;
        }
    },

    /**
     * unload event handler
     * @private
     */
    _onUnload: function(e, me) {
        Ext.dd.DragDropManager.unregAll();
    },

    /**
     * Cleans up the drag and drop events and objects.
     * @private
     */
    unregAll: function() {

        if (this.dragCurrent) {
            this.stopDrag();
            this.dragCurrent = null;
        }

        this._execOnAll("unreg", []);

        for (var i in this.elementCache) {
            delete this.elementCache[i];
        }

        this.elementCache = {};
        this.ids = {};
    },

    /**
     * @property {Object} elementCache
     * A cache of DOM elements
     * @private
     */
    elementCache: {},

    /**
     * Get the wrapper for the DOM element specified
     * @param {String} id the id of the element to get
     * @return {Ext.dd.DragDropManager.ElementWrapper} the wrapped element
     * @private
     * @deprecated This wrapper isn't that useful
     */
    getElWrapper: function(id) {
        var oWrapper = this.elementCache[id];
        if (!oWrapper || !oWrapper.el) {
            oWrapper = this.elementCache[id] =
                new this.ElementWrapper(Ext.getDom(id));
        }
        return oWrapper;
    },

    /**
     * Returns the actual DOM element
     * @param {String} id the id of the elment to get
     * @return {Object} The element
     * @deprecated use Ext.lib.Ext.getDom instead
     */
    getElement: function(id) {
        return Ext.getDom(id);
    },

    /**
     * Returns the style property for the DOM element (i.e.,
     * document.getElById(id).style)
     * @param {String} id the id of the elment to get
     * @return {Object} The style property of the element
     */
    getCss: function(id) {
        var el = Ext.getDom(id);
        return (el) ? el.style : null;
    },

    /**
     * @class Ext.dd.DragDropManager.ElementWrapper
     * Deprecated inner class for cached elements.
     * @private
     * @deprecated This wrapper isn't that useful
     */
    ElementWrapper: function(el) {
        /** The element */
        this.el = el || null;
        /** The element id */
        this.id = this.el && el.id;
        /** A reference to the style property */
        this.css = this.el && el.style;
    },

    // Continue class docs
    /** @class Ext.dd.DragDropElement */

    /**
     * Returns the X position of an html element
     * @param {HTMLElement} el the element for which to get the position
     * @return {Number} the X coordinate
     */
    getPosX: function(el) {
        return Ext.Element.getX(el);
    },

    /**
     * Returns the Y position of an html element
     * @param {HTMLElement} el the element for which to get the position
     * @return {Number} the Y coordinate
     */
    getPosY: function(el) {
        return Ext.Element.getY(el);
    },

    /**
     * Swap two nodes.  In IE, we use the native method, for others we
     * emulate the IE behavior
     * @param {HTMLElement} n1 the first node to swap
     * @param {HTMLElement} n2 the other node to swap
     */
    swapNode: function(n1, n2) {
        if (n1.swapNode) {
            n1.swapNode(n2);
        } else {
            var p = n2.parentNode,
                s = n2.nextSibling;

            if (s == n1) {
                p.insertBefore(n1, n2);
            } else if (n2 == n1.nextSibling) {
                p.insertBefore(n2, n1);
            } else {
                n1.parentNode.replaceChild(n2, n1);
                p.insertBefore(n1, s);
            }
        }
    },

    /**
     * Returns the current scroll position
     * @private
     */
    getScroll: function () {
        var doc   = window.document,
            docEl = doc.documentElement,
            body  = doc.body,
            top   = 0,
            left  = 0;

        if (Ext.isGecko4) {
            top  = window.scrollYOffset;
            left = window.scrollXOffset;
        } else {
            if (docEl && (docEl.scrollTop || docEl.scrollLeft)) {
                top  = docEl.scrollTop;
                left = docEl.scrollLeft;
            } else if (body) {
                top  = body.scrollTop;
                left = body.scrollLeft;
            }
        }
        return {
            top: top,
            left: left
        };
    },

    /**
     * Returns the specified element style property
     * @param {HTMLElement} el          the element
     * @param {String}      styleProp   the style property
     * @return {String} The value of the style property
     */
    getStyle: function(el, styleProp) {
        return Ext.fly(el).getStyle(styleProp);
    },

    /**
     * Gets the scrollTop
     * @return {Number} the document's scrollTop
     */
    getScrollTop: function () {
        return this.getScroll().top;
    },

    /**
     * Gets the scrollLeft
     * @return {Number} the document's scrollTop
     */
    getScrollLeft: function () {
        return this.getScroll().left;
    },

    /**
     * Sets the x/y position of an element to the location of the
     * target element.
     * @param {HTMLElement} moveEl      The element to move
     * @param {HTMLElement} targetEl    The position reference element
     */
    moveToEl: function (moveEl, targetEl) {
        var aCoord = Ext.Element.getXY(targetEl);
        Ext.Element.setXY(moveEl, aCoord);
    },

    /**
     * Numeric array sort function
     * @param {Number} a
     * @param {Number} b
     * @returns {Number} positive, negative or 0
     */
    numericSort: function(a, b) {
        return (a - b);
    },

    /**
     * @property {Number} _timeoutCount
     * Internal counter
     * @private
     */
    _timeoutCount: 0,

    /**
     * Trying to make the load order less important.  Without this we get
     * an error if this file is loaded before the Event Utility.
     * @private
     */
    _addListeners: function() {
        if ( document ) {
            this._onLoad();
        } else {
            if (this._timeoutCount <= 2000) {
                setTimeout(this._addListeners, 10);
                if (document && document.body) {
                    this._timeoutCount += 1;
                }
            }
        }
    },

    /**
     * Recursively searches the immediate parent and all child nodes for
     * the handle element in order to determine wheter or not it was
     * clicked.
     * @param {HTMLElement} node the html element to inspect
     */
    handleWasClicked: function(node, id) {
        if (this.isHandle(id, node.id)) {
            return true;
        } else {
            // check to see if this is a text node child of the one we want
            var p = node.parentNode;

            while (p) {
                if (this.isHandle(id, p.id)) {
                    return true;
                } else {
                    p = p.parentNode;
                }
            }
        }

        return false;
    }
}, function() {
    this._addListeners();
});

/**
 * A DragTracker listens for drag events on an Element and fires events at the start and end of the drag,
 * as well as during the drag. This is useful for components such as {@link Ext.slider.Multi}, where there is
 * an element that can be dragged around to change the Slider's value.
 *
 * DragTracker provides a series of template methods that should be overridden to provide functionality
 * in response to detected drag operations. These are onBeforeStart, onStart, onDrag and onEnd.
 * See {@link Ext.slider.Multi}'s initEvents function for an example implementation.
 */
Ext.define('Ext.dd.DragTracker', {

    uses: ['Ext.util.Region'],

    mixins: {
        observable: 'Ext.util.Observable'
    },

    /**
     * @property {Boolean} active
     * Indicates whether the user is currently dragging this tracker.
     * @readonly
     */
    active: false,

    /**
     * @property {HTMLElement} dragTarget
     * The element being dragged.
     *
     * Only valid during drag operations.
     *
     * If the {@link #delegate} option is used, this will be the delegate element which was mousedowned.
     * @readonly
     */

    /**
     * @cfg {Boolean} trackOver
     * Set to true to fire mouseover and mouseout events when the mouse enters or leaves the target element.
     *
     * This is implicitly set when an {@link #overCls} is specified.
     *
     * If the {@link #delegate} option is used, these events fire only when a delegate element is entered of left.
     */
    trackOver: false,

    /**
     * @cfg {String} overCls
     * A CSS class to add to the DragTracker's target element when the element (or, if the {@link #delegate}
     * option is used, when a delegate element) is mouseovered.
     *
     * If the {@link #delegate} option is used, these events fire only when a delegate element is entered of left.
     */

    /**
     * @cfg {Ext.util.Region/Ext.Element} constrainTo
     * A {@link Ext.util.Region Region} (Or an element from which a Region measurement will be read)
     * which is used to constrain the result of the {@link #getOffset} call.
     *
     * This may be set any time during the DragTracker's lifecycle to set a dynamic constraining region.
     */

    /**
     * @cfg {Number} tolerance
     * Number of pixels the drag target must be moved before dragging is
     * considered to have started.
     */
    tolerance: 5,

    /**
     * @cfg {Boolean/Number} autoStart
     * Specify `true` to defer trigger start by 1000 ms.
     * Specify a Number for the number of milliseconds to defer trigger start.
     */
    autoStart: false,

    /**
     * @cfg {String} delegate
     * A {@link Ext.DomQuery DomQuery} selector which identifies child elements within the DragTracker's encapsulating
     * Element which are the tracked elements. This limits tracking to only begin when the matching elements are mousedowned.
     *
     * This may also be a specific child element within the DragTracker's encapsulating element to use as the tracked element.
     */

    /**
     * @cfg {Boolean} [preventDefault=true]
     * Specify `false` to enable default actions on onMouseDown events.
     */

    /**
     * @cfg {Boolean} [stopEvent=false]
     * Specify `true` to stop the `mousedown` event from bubbling to outer listeners from the target element (or its delegates).
     */

    constructor : function(config){
        var me = this;
        Ext.apply(me, config);
        me.addEvents(
            /**
             * @event mouseover
             * Fires when the mouse enters the DragTracker's target element (or if {@link #delegate} is
             * used, when the mouse enters a delegate element).
             *
             * **Only available when {@link #trackOver} is `true`**
             *
             * @param {Object} this
             * @param {Object} e event object
             * @param {HTMLElement} target The element mouseovered.
             */
            'mouseover',

            /**
             * @event mouseout
             * Fires when the mouse exits the DragTracker's target element (or if {@link #delegate} is
             * used, when the mouse exits a delegate element).
             * 
             * **Only available when {@link #trackOver} is `true`**
             *
             * @param {Object} this
             * @param {Object} e event object
             */
            'mouseout',

            /**
             * @event mousedown
             * Fires when the mouse button is pressed down, but before a drag operation begins. The
             * drag operation begins after either the mouse has been moved by {@link #tolerance} pixels,
             * or after the {@link #autoStart} timer fires.
             *
             * Return false to veto the drag operation.
             *
             * @param {Object} this
             * @param {Object} e event object
             */
            'mousedown',

            /**
             * @event mouseup
             * @param {Object} this
             * @param {Object} e event object
             */
            'mouseup',

            /**
             * @event mousemove
             * Fired when the mouse is moved. Returning false cancels the drag operation.
             * @param {Object} this
             * @param {Object} e event object
             */
            'mousemove',

            /**
             * @event beforestart
             * @param {Object} this
             * @param {Object} e event object
             */
            'beforedragstart',

            /**
             * @event dragstart
             * @param {Object} this
             * @param {Object} e event object
             */
            'dragstart',

            /**
             * @event dragend
             * @param {Object} this
             * @param {Object} e event object
             */
            'dragend',

            /**
             * @event drag
             * @param {Object} this
             * @param {Object} e event object
             */
            'drag'
        );

        me.dragRegion = new Ext.util.Region(0,0,0,0);

        if (me.el) {
            me.initEl(me.el);
        }

        // Dont pass the config so that it is not applied to 'this' again
        me.mixins.observable.constructor.call(me);
        if (me.disabled) {
            me.disable();
        }

    },

    /**
     * Initializes the DragTracker on a given element.
     * @param {Ext.Element/HTMLElement} el The element
     */
    initEl: function(el) {
        var me = this;
        
        me.el = Ext.get(el);

        // The delegate option may also be an element on which to listen
        me.handle = Ext.get(me.delegate);

        // If delegate specified an actual element to listen on, we do not use the delegate listener option
        me.delegate = me.handle ? undefined : me.delegate;

        if (!me.handle) {
            me.handle = me.el;
        }

        // Add a mousedown listener which reacts only on the elements targeted by the delegate config.
        // We process mousedown to begin tracking.
        me.mon(me.handle, {
            mousedown: me.onMouseDown,
            delegate: me.delegate,
            scope: me
        });

        // If configured to do so, track mouse entry and exit into the target (or delegate).
        // The mouseover and mouseout CANNOT be replaced with mouseenter and mouseleave
        // because delegate cannot work with those pseudoevents. Entry/exit checking is done in the handler.
        if (me.trackOver || me.overCls) {
            me.mon(me.handle, {
                mouseover: me.onMouseOver,
                mouseout: me.onMouseOut,
                delegate: me.delegate,
                scope: me
            });
        }
    },

    disable: function() {
        this.disabled = true;
    },

    enable: function() {
        this.disabled = false;
    },

    destroy : function() {
        this.clearListeners();
        delete this.el;
    },

    // When the pointer enters a tracking element, fire a mouseover if the mouse entered from outside.
    // This is mouseenter functionality, but we cannot use mouseenter because we are using "delegate" to filter mouse targets
    onMouseOver: function(e, target) {
        var me = this;
        if (!me.disabled) {
            if (Ext.EventManager.contains(e) || me.delegate) {
                me.mouseIsOut = false;
                if (me.overCls) {
                    me.el.addCls(me.overCls);
                }
                me.fireEvent('mouseover', me, e, me.delegate ? e.getTarget(me.delegate, target) : me.handle);
            }
        }
    },

    // When the pointer exits a tracking element, fire a mouseout.
    // This is mouseleave functionality, but we cannot use mouseleave because we are using "delegate" to filter mouse targets
    onMouseOut: function(e) {
        var me = this;
        
        if (me.mouseIsDown) {
            me.mouseIsOut = true;
        } else {
            if (me.overCls) {
                me.el.removeCls(me.overCls);
            }
            me.fireEvent('mouseout', me, e);
        }
    },

    onMouseDown: function(e, target){
        var me = this,
            el;
        
        // If this is disabled, or the mousedown has been processed by an upstream DragTracker, return
        if (me.disabled ||e.dragTracked) {
            return;
        }

        // This information should be available in mousedown listener and onBeforeStart implementations
        me.dragTarget = me.delegate ? target : me.handle.dom;
        me.startXY = me.lastXY = e.getXY();
        me.startRegion = Ext.fly(me.dragTarget).getRegion();

        if (me.fireEvent('mousedown', me, e) === false ||
            me.fireEvent('beforedragstart', me, e) === false ||
            me.onBeforeStart(e) === false) {
            return;
        }

        // Track when the mouse is down so that mouseouts while the mouse is down are not processed.
        // The onMouseOut method will only ever be called after mouseup.
        me.mouseIsDown = true;

        // Flag for downstream DragTracker instances that the mouse is being tracked.
        e.dragTracked = true;
        
        // See Ext.dd.DragDropManager::handleMouseDown
        el = me.el.dom;
        if (Ext.isIE && el.setCapture) {
            el.setCapture();
        }

        if (me.preventDefault !== false) {
            e.preventDefault();
        }
        Ext.getDoc().on({
            scope: me,
            mouseup: me.onMouseUp,
            mousemove: me.onMouseMove,
            selectstart: me.stopSelect
        });
        if (me.autoStart) {
            me.timer =  Ext.defer(me.triggerStart, me.autoStart === true ? 1000 : me.autoStart, me, [e]);
        }
    },

    onMouseMove: function(e, target){
        var me = this,
            xy = e.getXY(),
            s = me.startXY;

        e.preventDefault();

        me.lastXY = xy;
        if (!me.active) {
            if (Math.max(Math.abs(s[0]-xy[0]), Math.abs(s[1]-xy[1])) > me.tolerance) {
                me.triggerStart(e);
            } else {
                return;
            }
        }

        // Returning false from a mousemove listener deactivates
        if (me.fireEvent('mousemove', me, e) === false) {
            me.onMouseUp(e);
        } else {
            me.onDrag(e);
            me.fireEvent('drag', me, e);
        }
    },

    onMouseUp: function(e) {
        var me = this;
        // Clear the flag which ensures onMouseOut fires only after the mouse button
        // is lifted if the mouseout happens *during* a drag.
        me.mouseIsDown = false;

        // If we mouseouted the el *during* the drag, the onMouseOut method will not have fired. Ensure that it gets processed.
        if (me.mouseIsOut) {
            me.mouseIsOut = false;
            me.onMouseOut(e);
        }
        e.preventDefault();
        
        // See Ext.dd.DragDropManager::handleMouseDown
        if (Ext.isIE && document.releaseCapture) {
            document.releaseCapture();
        }
        
        me.fireEvent('mouseup', me, e);
        me.endDrag(e);
    },

    /**
     * @private
     * Stop the drag operation, and remove active mouse listeners.
     */
    endDrag: function(e) {
        var me = this,
            doc = Ext.getDoc(),
            wasActive = me.active;

        doc.un('mousemove', me.onMouseMove, me);
        doc.un('mouseup', me.onMouseUp, me);
        doc.un('selectstart', me.stopSelect, me);
        me.clearStart();
        me.active = false;
        if (wasActive) {
            me.onEnd(e);
            me.fireEvent('dragend', me, e);
        }
        // Private property calculated when first required and only cached during a drag
        delete me._constrainRegion;

        // Remove flag from event singleton.  Using "Ext.EventObject" here since "endDrag" is called directly in some cases without an "e" param
        delete Ext.EventObject.dragTracked;
    },

    triggerStart: function(e) {
        var me = this;
        me.clearStart();
        me.active = true;
        me.onStart(e);
        me.fireEvent('dragstart', me, e);
    },

    clearStart : function() {
        var timer = this.timer;
        if (timer) {
            clearTimeout(timer);
            delete this.timer;
        }
    },

    stopSelect : function(e) {
        e.stopEvent();
        return false;
    },

    /**
     * Template method which should be overridden by each DragTracker instance. Called when the user first clicks and
     * holds the mouse button down. Return false to disallow the drag
     * @param {Ext.EventObject} e The event object
     * @template
     */
    onBeforeStart : function(e) {

    },

    /**
     * Template method which should be overridden by each DragTracker instance. Called when a drag operation starts
     * (e.g. the user has moved the tracked element beyond the specified tolerance)
     * @param {Ext.EventObject} e The event object
     * @template
     */
    onStart : function(xy) {

    },

    /**
     * Template method which should be overridden by each DragTracker instance. Called whenever a drag has been detected.
     * @param {Ext.EventObject} e The event object
     * @template
     */
    onDrag : function(e) {

    },

    /**
     * Template method which should be overridden by each DragTracker instance. Called when a drag operation has been completed
     * (e.g. the user clicked and held the mouse down, dragged the element and then released the mouse button)
     * @param {Ext.EventObject} e The event object
     * @template
     */
    onEnd : function(e) {

    },

    /**
     * Returns the drag target. This is usually the DragTracker's encapsulating element.
     *
     * If the {@link #delegate} option is being used, this may be a child element which matches the
     * {@link #delegate} selector.
     *
     * @return {Ext.Element} The element currently being tracked.
     */
    getDragTarget : function(){
        return this.dragTarget;
    },

    /**
     * @private
     * @returns {Ext.Element} The DragTracker's encapsulating element.
     */
    getDragCt : function(){
        return this.el;
    },

    /**
     * @private
     * Return the Region into which the drag operation is constrained.
     * Either the XY pointer itself can be constrained, or the dragTarget element
     * The private property _constrainRegion is cached until onMouseUp
     */
    getConstrainRegion: function() {
        var me = this;
        
        if (me.constrainTo) {
            if (me.constrainTo instanceof Ext.util.Region) {
                return me.constrainTo;
            }
            if (!me._constrainRegion) {
                me._constrainRegion = Ext.fly(me.constrainTo).getViewRegion();
            }
        } else {
            if (!me._constrainRegion) {
                me._constrainRegion = me.getDragCt().getViewRegion();
            }
        }
        return me._constrainRegion;
    },

    getXY : function(constrain){
        return constrain ? this.constrainModes[constrain](this, this.lastXY) : this.lastXY;
    },

    /**
     * Returns the X, Y offset of the current mouse position from the mousedown point.
     *
     * This method may optionally constrain the real offset values, and returns a point coerced in one
     * of two modes:
     *
     *  - `point`
     *    The current mouse position is coerced into the constrainRegion and the resulting position is returned.
     *  - `dragTarget`
     *    The new {@link Ext.util.Region Region} of the {@link #getDragTarget dragTarget} is calculated
     *    based upon the current mouse position, and then coerced into the constrainRegion. The returned
     *    mouse position is then adjusted by the same delta as was used to coerce the region.\
     *
     * @param constrainMode {String} (Optional) If omitted the true mouse position is returned. May be passed
     * as `point` or `dragTarget`. See above.
     * @returns {Number[]} The `X, Y` offset from the mousedown point, optionally constrained.
     */
    getOffset : function(constrain){
        var xy = this.getXY(constrain),
            s = this.startXY;

        return [xy[0]-s[0], xy[1]-s[1]];
    },

    constrainModes: {
        // Constrain the passed point to within the constrain region
        point: function(me, xy) {
            var dr = me.dragRegion,
                constrainTo = me.getConstrainRegion();

            // No constraint
            if (!constrainTo) {
                return xy;
            }

            dr.x = dr.left = dr[0] = dr.right = xy[0];
            dr.y = dr.top = dr[1] = dr.bottom = xy[1];
            dr.constrainTo(constrainTo);

            return [dr.left, dr.top];
        },

        // Constrain the dragTarget to within the constrain region. Return the passed xy adjusted by the same delta.
        dragTarget: function(me, xy) {
            var s = me.startXY,
                dr = me.startRegion.copy(),
                constrainTo = me.getConstrainRegion(),
                adjust;

            // No constraint
            if (!constrainTo) {
                return xy;
            }

            // See where the passed XY would put the dragTarget if translated by the unconstrained offset.
            // If it overflows, we constrain the passed XY to bring the potential
            // region back within the boundary.
            dr.translateBy(xy[0]-s[0], xy[1]-s[1]);

            // Constrain the X coordinate by however much the dragTarget overflows
            if (dr.right > constrainTo.right) {
                xy[0] += adjust = (constrainTo.right - dr.right);    // overflowed the right
                dr.left += adjust;
            }
            if (dr.left < constrainTo.left) {
                xy[0] += (constrainTo.left - dr.left);      // overflowed the left
            }

            // Constrain the Y coordinate by however much the dragTarget overflows
            if (dr.bottom > constrainTo.bottom) {
                xy[1] += adjust = (constrainTo.bottom - dr.bottom);  // overflowed the bottom
                dr.top += adjust;
            }
            if (dr.top < constrainTo.top) {
                xy[1] += (constrainTo.top - dr.top);        // overflowed the top
            }
            return xy;
        }
    }
});
/**
 * Provides easy access to all drag drop components that are registered on a page. Items can be retrieved either
 * directly by DOM node id, or by passing in the drag drop event that occurred and looking up the event target.
 */
Ext.define('Ext.dd.Registry', {
    singleton: true,
    constructor: function() {
        this.elements = {}; 
        this.handles = {}; 
        this.autoIdSeed = 0;
    },
    
    getId: function(el, autogen){
        if(typeof el == "string"){
            return el;
        }
        var id = el.id;
        if(!id && autogen !== false){
            id = "extdd-" + (++this.autoIdSeed);
            el.id = id;
        }
        return id;
    },
    
    /**
     * Registers a drag drop element.
     *
     * @param {String/HTMLElement} element The id or DOM node to register
     * @param {Object} data An custom data object that will be passed between the elements that are involved in drag
     * drop operations. You can populate this object with any arbitrary properties that your own code knows how to
     * interpret, plus there are some specific properties known to the Registry that should be populated in the data
     * object (if applicable):
     * @param {HTMLElement[]} data.handles Array of DOM nodes that trigger dragging for the element being registered.
     * @param {Boolean} data.isHandle True if the element passed in triggers dragging itself, else false.
     */
    register : function(el, data){
        data = data || {};
        if (typeof el == "string") {
            el = document.getElementById(el);
        }
        data.ddel = el;
        this.elements[this.getId(el)] = data;
        if (data.isHandle !== false) {
            this.handles[data.ddel.id] = data;
        }
        if (data.handles) {
            var hs = data.handles,
                i, len;
            for (i = 0, len = hs.length; i < len; i++) {
                this.handles[this.getId(hs[i])] = data;
            }
        }
    },

    /**
     * Unregister a drag drop element
     * @param {String/HTMLElement} element The id or DOM node to unregister
     */
    unregister : function(el){
        var id = this.getId(el, false),
            data = this.elements[id],
            hs, i, len;
        if(data){
            delete this.elements[id];
            if(data.handles){
                hs = data.handles;
                for (i = 0, len = hs.length; i < len; i++) {
                    delete this.handles[this.getId(hs[i], false)];
                }
            }
        }
    },

    /**
     * Returns the handle registered for a DOM Node by id
     * @param {String/HTMLElement} id The DOM node or id to look up
     * @return {Object} handle The custom handle data
     */
    getHandle : function(id){
        if(typeof id != "string"){ // must be element?
            id = id.id;
        }
        return this.handles[id];
    },

    /**
     * Returns the handle that is registered for the DOM node that is the target of the event
     * @param {Event} e The event
     * @return {Object} handle The custom handle data
     */
    getHandleFromEvent : function(e){
        var t = e.getTarget();
        return t ? this.handles[t.id] : null;
    },

    /**
     * Returns a custom data object that is registered for a DOM node by id
     * @param {String/HTMLElement} id The DOM node or id to look up
     * @return {Object} data The custom data
     */
    getTarget : function(id){
        if(typeof id != "string"){ // must be element?
            id = id.id;
        }
        return this.elements[id];
    },

    /**
     * Returns a custom data object that is registered for the DOM node that is the target of the event
     * @param {Event} e The event
     * @return {Object} data The custom data
     */
    getTargetFromEvent : function(e){
        var t = e.getTarget();
        return t ? this.elements[t.id] || this.handles[t.id] : null;
    }
});
/**
 * Provides automatic scrolling of overflow regions in the page during drag operations.
 *
 * The ScrollManager configs will be used as the defaults for any scroll container registered with it, but you can also
 * override most of the configs per scroll container by adding a ddScrollConfig object to the target element that
 * contains these properties: {@link #hthresh}, {@link #vthresh}, {@link #increment} and {@link #frequency}. Example
 * usage:
 *
 *     var el = Ext.get('scroll-ct');
 *     el.ddScrollConfig = {
 *         vthresh: 50,
 *         hthresh: -1,
 *         frequency: 100,
 *         increment: 200
 *     };
 *     Ext.dd.ScrollManager.register(el);
 *
 * Note: This class is designed to be used in "Point Mode
 */
Ext.define('Ext.dd.ScrollManager', {
    singleton: true,
    requires: [
        'Ext.dd.DragDropManager'
    ],

    constructor: function() {
        var ddm = Ext.dd.DragDropManager;
        ddm.fireEvents = Ext.Function.createSequence(ddm.fireEvents, this.onFire, this);
        ddm.stopDrag = Ext.Function.createSequence(ddm.stopDrag, this.onStop, this);
        this.doScroll = Ext.Function.bind(this.doScroll, this);
        this.ddmInstance = ddm;
        this.els = {};
        this.dragEl = null;
        this.proc = {};
    },

    onStop: function(e){
        var sm = Ext.dd.ScrollManager;
        sm.dragEl = null;
        sm.clearProc();
    },

    triggerRefresh: function() {
        if (this.ddmInstance.dragCurrent) {
            this.ddmInstance.refreshCache(this.ddmInstance.dragCurrent.groups);
        }
    },

    doScroll: function() {
        if (this.ddmInstance.dragCurrent) {
            var proc   = this.proc,
                procEl = proc.el,
                ddScrollConfig = proc.el.ddScrollConfig,
                inc = ddScrollConfig ? ddScrollConfig.increment : this.increment;

            if (!this.animate) {
                if (procEl.scroll(proc.dir, inc)) {
                    this.triggerRefresh();
                }
            } else {
                procEl.scroll(proc.dir, inc, true, this.animDuration, this.triggerRefresh);
            }
        }
    },

    clearProc: function() {
        var proc = this.proc;
        if (proc.id) {
            clearInterval(proc.id);
        }
        proc.id = 0;
        proc.el = null;
        proc.dir = "";
    },

    startProc: function(el, dir) {
        this.clearProc();
        this.proc.el = el;
        this.proc.dir = dir;
        var group = el.ddScrollConfig ? el.ddScrollConfig.ddGroup : undefined,
            freq  = (el.ddScrollConfig && el.ddScrollConfig.frequency)
                  ? el.ddScrollConfig.frequency
                  : this.frequency;

        if (group === undefined || this.ddmInstance.dragCurrent.ddGroup == group) {
            this.proc.id = setInterval(this.doScroll, freq);
        }
    },

    onFire: function(e, isDrop) {
        if (isDrop || !this.ddmInstance.dragCurrent) {
            return;
        }
        if (!this.dragEl || this.dragEl != this.ddmInstance.dragCurrent) {
            this.dragEl = this.ddmInstance.dragCurrent;
            // refresh regions on drag start
            this.refreshCache();
        }

        var xy = e.getXY(),
            pt = e.getPoint(),
            proc = this.proc,
            els = this.els,
            id, el, r, c;

        for (id in els) {
            el = els[id];
            r = el._region;
            c = el.ddScrollConfig ? el.ddScrollConfig : this;
            if (r && r.contains(pt) && el.isScrollable()) {
                if (r.bottom - pt.y <= c.vthresh) {
                    if(proc.el != el){
                        this.startProc(el, "down");
                    }
                    return;
                }else if (r.right - pt.x <= c.hthresh) {
                    if (proc.el != el) {
                        this.startProc(el, "left");
                    }
                    return;
                } else if(pt.y - r.top <= c.vthresh) {
                    if (proc.el != el) {
                        this.startProc(el, "up");
                    }
                    return;
                } else if(pt.x - r.left <= c.hthresh) {
                    if (proc.el != el) {
                        this.startProc(el, "right");
                    }
                    return;
                }
            }
        }
        this.clearProc();
    },

    /**
     * Registers new overflow element(s) to auto scroll
     * @param {String/HTMLElement/Ext.Element/String[]/HTMLElement[]/Ext.Element[]} el
     * The id of or the element to be scrolled or an array of either
     */
    register : function(el){
        if (Ext.isArray(el)) {
            for(var i = 0, len = el.length; i < len; i++) {
                    this.register(el[i]);
            }
        } else {
            el = Ext.get(el);
            this.els[el.id] = el;
        }
    },

    /**
     * Unregisters overflow element(s) so they are no longer scrolled
     * @param {String/HTMLElement/Ext.Element/String[]/HTMLElement[]/Ext.Element[]} el
     * The id of or the element to be removed or an array of either
     */
    unregister : function(el){
        if(Ext.isArray(el)){
            for (var i = 0, len = el.length; i < len; i++) {
                this.unregister(el[i]);
            }
        }else{
            el = Ext.get(el);
            delete this.els[el.id];
        }
    },

    /**
     * The number of pixels from the top or bottom edge of a container the pointer needs to be to trigger scrolling
     */
    vthresh : 25,

    /**
     * The number of pixels from the right or left edge of a container the pointer needs to be to trigger scrolling
     */
    hthresh : 25,

    /**
     * The number of pixels to scroll in each scroll increment
     */
    increment : 100,

    /**
     * The frequency of scrolls in milliseconds
     */
    frequency : 500,

    /**
     * True to animate the scroll
     */
    animate: true,

    /**
     * The animation duration in seconds - MUST BE less than Ext.dd.ScrollManager.frequency!
     */
    animDuration: 0.4,

    /**
     * @property {String} ddGroup
     * The named drag drop {@link Ext.dd.DragSource#ddGroup group} to which this container belongs. If a ddGroup is
     * specified, then container scrolling will only occur when a dragged object is in the same ddGroup.
     */
    ddGroup: undefined,

    /**
     * Manually trigger a cache refresh.
     */
    refreshCache : function(){
        var els = this.els,
            id;
        for (id in els) {
            if(typeof els[id] == 'object'){ // for people extending the object prototype
                els[id]._region = els[id].getRegion();
            }
        }
    }
});





/**
 * Defines the interface and base operation of items that that can be
 * dragged or can be drop targets.  It was designed to be extended, overriding
 * the event handlers for startDrag, onDrag, onDragOver and onDragOut.
 * Up to three html elements can be associated with a DragDrop instance:
 *
 * - linked element: the element that is passed into the constructor.
 *   This is the element which defines the boundaries for interaction with
 *   other DragDrop objects.
 *
 * - handle element(s): The drag operation only occurs if the element that
 *   was clicked matches a handle element.  By default this is the linked
 *   element, but there are times that you will want only a portion of the
 *   linked element to initiate the drag operation, and the setHandleElId()
 *   method provides a way to define this.
 *
 * - drag element: this represents the element that would be moved along
 *   with the cursor during a drag operation.  By default, this is the linked
 *   element itself as in {@link Ext.dd.DD}.  setDragElId() lets you define
 *   a separate element that would be moved, as in {@link Ext.dd.DDProxy}.
 *
 * This class should not be instantiated until the onload event to ensure that
 * the associated elements are available.
 * The following would define a DragDrop obj that would interact with any
 * other DragDrop obj in the "group1" group:
 *
 *     dd = new Ext.dd.DragDrop("div1", "group1");
 *
 * Since none of the event handlers have been implemented, nothing would
 * actually happen if you were to run the code above.  Normally you would
 * override this class or one of the default implementations, but you can
 * also override the methods you want on an instance of the class...
 *
 *     dd.onDragDrop = function(e, id) {
 *         alert("dd was dropped on " + id);
 *     }
 *
 */
Ext.define('Ext.dd.DragDrop', {
    requires: ['Ext.dd.DragDropManager'],

    /**
     * Creates new DragDrop.
     * @param {String} id of the element that is linked to this instance
     * @param {String} sGroup the group of related DragDrop objects
     * @param {Object} config an object containing configurable attributes.
     * Valid properties for DragDrop:
     *
     * - padding
     * - isTarget
     * - maintainOffset
     * - primaryButtonOnly
     */
    constructor: function(id, sGroup, config) {
        if(id) {
            this.init(id, sGroup, config);
        }
    },

    /**
     * @property {Boolean} ignoreSelf
     * Set to false to enable a DragDrop object to fire drag events while dragging
     * over its own Element. Defaults to true - DragDrop objects do not by default
     * fire drag events to themselves.
     */

    /**
     * @property {String} id
     * The id of the element associated with this object.  This is what we
     * refer to as the "linked element" because the size and position of
     * this element is used to determine when the drag and drop objects have
     * interacted.
     */
    id: null,

    /**
     * @property {Object} config
     * Configuration attributes passed into the constructor
     */
    config: null,

    /**
     * @property {String} dragElId
     * The id of the element that will be dragged.  By default this is same
     * as the linked element, but could be changed to another element. Ex:
     * Ext.dd.DDProxy
     * @private
     */
    dragElId: null,

    /**
     * @property {String} handleElId
     * The ID of the element that initiates the drag operation.  By default
     * this is the linked element, but could be changed to be a child of this
     * element.  This lets us do things like only starting the drag when the
     * header element within the linked html element is clicked.
     * @private
     */
    handleElId: null,

    /**
     * @property {Object} invalidHandleTypes
     * An object who's property names identify HTML tags to be considered invalid as drag handles.
     * A non-null property value identifies the tag as invalid. Defaults to the
     * following value which prevents drag operations from being initiated by `<a>` elements:
     *
     *     {
     *         A: "A"
     *     }
     */
    invalidHandleTypes: null,

    /**
     * @property {Object} invalidHandleIds
     * An object who's property names identify the IDs of elements to be considered invalid as drag handles.
     * A non-null property value identifies the ID as invalid. For example, to prevent
     * dragging from being initiated on element ID "foo", use:
     *
     *     {
     *         foo: true
     *     }
     */
    invalidHandleIds: null,

    /**
     * @property {String[]} invalidHandleClasses
     * An Array of CSS class names for elements to be considered in valid as drag handles.
     */
    invalidHandleClasses: null,

    /**
     * @property {Number} startPageX
     * The linked element's absolute X position at the time the drag was
     * started
     * @private
     */
    startPageX: 0,

    /**
     * @property {Number} startPageY
     * The linked element's absolute X position at the time the drag was
     * started
     * @private
     */
    startPageY: 0,

    /**
     * @property {Object} groups
     * The group defines a logical collection of DragDrop objects that are
     * related.  Instances only get events when interacting with other
     * DragDrop object in the same group.  This lets us define multiple
     * groups using a single DragDrop subclass if we want.
     *
     * An object in the format {'group1':true, 'group2':true}
     */
    groups: null,

    /**
     * @property {Boolean} locked
     * Individual drag/drop instances can be locked.  This will prevent
     * onmousedown start drag.
     * @private
     */
    locked: false,

    /**
     * Locks this instance
     */
    lock: function() {
        this.locked = true;
    },

    /**
     * @property {Boolean} moveOnly
     * When set to true, other DD objects in cooperating DDGroups do not receive
     * notification events when this DD object is dragged over them.
     */
    moveOnly: false,

    /**
     * Unlocks this instace
     */
    unlock: function() {
        this.locked = false;
    },

    /**
     * @property {Boolean} isTarget
     * By default, all instances can be a drop target.  This can be disabled by
     * setting isTarget to false.
     */
    isTarget: true,

    /**
     * @property {Number[]} padding
     * The padding configured for this drag and drop object for calculating
     * the drop zone intersection with this object.
     * An array containing the 4 padding values: [top, right, bottom, left]
     */
    padding: null,

    /**
     * @property _domRef
     * Cached reference to the linked element
     * @private
     */
    _domRef: null,

    /**
     * @property __ygDragDrop
     * Internal typeof flag
     * @private
     */
    __ygDragDrop: true,

    /**
     * @property {Boolean} constrainX
     * Set to true when horizontal contraints are applied
     * @private
     */
    constrainX: false,

    /**
     * @property {Boolean} constrainY
     * Set to true when vertical contraints are applied
     * @private
     */
    constrainY: false,

    /**
     * @property {Number} minX
     * The left constraint
     * @private
     */
    minX: 0,

    /**
     * @property {Number} maxX
     * The right constraint
     * @private
     */
    maxX: 0,

    /**
     * @property {Number} minY
     * The up constraint
     * @private
     */
    minY: 0,

    /**
     * @property {Number} maxY
     * The down constraint
     * @private
     */
    maxY: 0,

    /**
     * @property {Boolean} maintainOffset
     * Maintain offsets when we resetconstraints.  Set to true when you want
     * the position of the element relative to its parent to stay the same
     * when the page changes
     */
    maintainOffset: false,

    /**
     * @property {Number[]} xTicks
     * Array of pixel locations the element will snap to if we specified a
     * horizontal graduation/interval.  This array is generated automatically
     * when you define a tick interval.
     */
    xTicks: null,

    /**
     * @property {Number[]} yTicks
     * Array of pixel locations the element will snap to if we specified a
     * vertical graduation/interval.  This array is generated automatically
     * when you define a tick interval.
     */
    yTicks: null,

    /**
     * @property {Boolean} primaryButtonOnly
     * By default the drag and drop instance will only respond to the primary
     * button click (left button for a right-handed mouse).  Set to true to
     * allow drag and drop to start with any mouse click that is propogated
     * by the browser
     */
    primaryButtonOnly: true,

    /**
     * @property {Boolean} available
     * The available property is false until the linked dom element is accessible.
     */
    available: false,

    /**
     * @property {Boolean} hasOuterHandles
     * By default, drags can only be initiated if the mousedown occurs in the
     * region the linked element is.  This is done in part to work around a
     * bug in some browsers that mis-report the mousedown if the previous
     * mouseup happened outside of the window.  This property is set to true
     * if outer handles are defined. Defaults to false.
     */
    hasOuterHandles: false,

    /**
     * Code that executes immediately before the startDrag event
     * @private
     */
    b4StartDrag: function(x, y) { },

    /**
     * Abstract method called after a drag/drop object is clicked
     * and the drag or mousedown time thresholds have beeen met.
     * @param {Number} X click location
     * @param {Number} Y click location
     */
    startDrag: function(x, y) { /* override this */ },

    /**
     * Code that executes immediately before the onDrag event
     * @private
     */
    b4Drag: function(e) { },

    /**
     * Abstract method called during the onMouseMove event while dragging an
     * object.
     * @param {Event} e the mousemove event
     */
    onDrag: function(e) { /* override this */ },

    /**
     * Abstract method called when this element fist begins hovering over
     * another DragDrop obj
     * @param {Event} e the mousemove event
     * @param {String/Ext.dd.DragDrop[]} id In POINT mode, the element
     * id this is hovering over.  In INTERSECT mode, an array of one or more
     * dragdrop items being hovered over.
     */
    onDragEnter: function(e, id) { /* override this */ },

    /**
     * Code that executes immediately before the onDragOver event
     * @private
     */
    b4DragOver: function(e) { },

    /**
     * Abstract method called when this element is hovering over another
     * DragDrop obj
     * @param {Event} e the mousemove event
     * @param {String/Ext.dd.DragDrop[]} id In POINT mode, the element
     * id this is hovering over.  In INTERSECT mode, an array of dd items
     * being hovered over.
     */
    onDragOver: function(e, id) { /* override this */ },

    /**
     * Code that executes immediately before the onDragOut event
     * @private
     */
    b4DragOut: function(e) { },

    /**
     * Abstract method called when we are no longer hovering over an element
     * @param {Event} e the mousemove event
     * @param {String/Ext.dd.DragDrop[]} id In POINT mode, the element
     * id this was hovering over.  In INTERSECT mode, an array of dd items
     * that the mouse is no longer over.
     */
    onDragOut: function(e, id) { /* override this */ },

    /**
     * Code that executes immediately before the onDragDrop event
     * @private
     */
    b4DragDrop: function(e) { },

    /**
     * Abstract method called when this item is dropped on another DragDrop
     * obj
     * @param {Event} e the mouseup event
     * @param {String/Ext.dd.DragDrop[]} id In POINT mode, the element
     * id this was dropped on.  In INTERSECT mode, an array of dd items this
     * was dropped on.
     */
    onDragDrop: function(e, id) { /* override this */ },

    /**
     * Abstract method called when this item is dropped on an area with no
     * drop target
     * @param {Event} e the mouseup event
     */
    onInvalidDrop: function(e) { /* override this */ },

    /**
     * Code that executes immediately before the endDrag event
     * @private
     */
    b4EndDrag: function(e) { },

    /**
     * Called when we are done dragging the object
     * @param {Event} e the mouseup event
     */
    endDrag: function(e) { /* override this */ },

    /**
     * Code executed immediately before the onMouseDown event
     * @param {Event} e the mousedown event
     * @private
     */
    b4MouseDown: function(e) {  },

    /**
     * Called when a drag/drop obj gets a mousedown
     * @param {Event} e the mousedown event
     */
    onMouseDown: function(e) { /* override this */ },

    /**
     * Called when a drag/drop obj gets a mouseup
     * @param {Event} e the mouseup event
     */
    onMouseUp: function(e) { /* override this */ },

    /**
     * Override the onAvailable method to do what is needed after the initial
     * position was determined.
     */
    onAvailable: function () {
    },

    /**
     * @property {Object} defaultPadding
     * Provides default constraint padding to "constrainTo" elements.
     */
    defaultPadding: {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0
    },

    /**
     * Initializes the drag drop object's constraints to restrict movement to a certain element.
     *
     * Usage:
     *
     *     var dd = new Ext.dd.DDProxy("dragDiv1", "proxytest",
     *                    { dragElId: "existingProxyDiv" });
     *     dd.startDrag = function(){
     *         this.constrainTo("parent-id");
     *     };
     *
     * Or you can initalize it using the {@link Ext.Element} object:
     *
     *     Ext.get("dragDiv1").initDDProxy("proxytest", {dragElId: "existingProxyDiv"}, {
     *         startDrag : function(){
     *             this.constrainTo("parent-id");
     *         }
     *     });
     *
     * @param {String/HTMLElement/Ext.Element} constrainTo The element or element ID to constrain to.
     * @param {Object/Number} pad (optional) Pad provides a way to specify "padding" of the constraints,
     * and can be either a number for symmetrical padding (4 would be equal to `{left:4, right:4, top:4, bottom:4}`) or
     * an object containing the sides to pad. For example: `{right:10, bottom:10}`
     * @param {Boolean} inContent (optional) Constrain the draggable in the content box of the element (inside padding and borders)
     */
    constrainTo : function(constrainTo, pad, inContent){
        if(Ext.isNumber(pad)){
            pad = {left: pad, right:pad, top:pad, bottom:pad};
        }
        pad = pad || this.defaultPadding;
        var b = Ext.get(this.getEl()).getBox(),
            ce = Ext.get(constrainTo),
            s = ce.getScroll(),
            c,
            cd = ce.dom,
            xy,
            topSpace,
            leftSpace;
        if(cd == document.body){
            c = { x: s.left, y: s.top, width: Ext.Element.getViewWidth(), height: Ext.Element.getViewHeight()};
        }else{
            xy = ce.getXY();
            c = {x : xy[0], y: xy[1], width: cd.clientWidth, height: cd.clientHeight};
        }

        topSpace = b.y - c.y;
        leftSpace = b.x - c.x;

        this.resetConstraints();
        this.setXConstraint(leftSpace - (pad.left||0), // left
                c.width - leftSpace - b.width - (pad.right||0), //right
        this.xTickSize
        );
        this.setYConstraint(topSpace - (pad.top||0), //top
                c.height - topSpace - b.height - (pad.bottom||0), //bottom
        this.yTickSize
        );
    },

    /**
     * Returns a reference to the linked element
     * @return {HTMLElement} the html element
     */
    getEl: function() {
        if (!this._domRef) {
            this._domRef = Ext.getDom(this.id);
        }

        return this._domRef;
    },

    /**
     * Returns a reference to the actual element to drag.  By default this is
     * the same as the html element, but it can be assigned to another
     * element. An example of this can be found in Ext.dd.DDProxy
     * @return {HTMLElement} the html element
     */
    getDragEl: function() {
        return Ext.getDom(this.dragElId);
    },

    /**
     * Sets up the DragDrop object.  Must be called in the constructor of any
     * Ext.dd.DragDrop subclass
     * @param {String} id the id of the linked element
     * @param {String} sGroup the group of related items
     * @param {Object} config configuration attributes
     */
    init: function(id, sGroup, config) {
        this.initTarget(id, sGroup, config);
        Ext.EventManager.on(this.id, "mousedown", this.handleMouseDown, this);
        // Ext.EventManager.on(this.id, "selectstart", Event.preventDefault);
    },

    /**
     * Initializes Targeting functionality only... the object does not
     * get a mousedown handler.
     * @param {String} id the id of the linked element
     * @param {String} sGroup the group of related items
     * @param {Object} config configuration attributes
     */
    initTarget: function(id, sGroup, config) {
        // configuration attributes
        this.config = config || {};

        // create a local reference to the drag and drop manager
        this.DDMInstance = Ext.dd.DragDropManager;
        // initialize the groups array
        this.groups = {};

        // assume that we have an element reference instead of an id if the
        // parameter is not a string
        if (typeof id !== "string") {
            id = Ext.id(id);
        }

        // set the id
        this.id = id;

        // add to an interaction group
        this.addToGroup((sGroup) ? sGroup : "default");

        // We don't want to register this as the handle with the manager
        // so we just set the id rather than calling the setter.
        this.handleElId = id;

        // the linked element is the element that gets dragged by default
        this.setDragElId(id);

        // by default, clicked anchors will not start drag operations.
        this.invalidHandleTypes = { A: "A" };
        this.invalidHandleIds = {};
        this.invalidHandleClasses = [];

        this.applyConfig();

        this.handleOnAvailable();
    },

    /**
     * Applies the configuration parameters that were passed into the constructor.
     * This is supposed to happen at each level through the inheritance chain.  So
     * a DDProxy implentation will execute apply config on DDProxy, DD, and
     * DragDrop in order to get all of the parameters that are available in
     * each object.
     */
    applyConfig: function() {

        // configurable properties:
        //    padding, isTarget, maintainOffset, primaryButtonOnly
        this.padding           = this.config.padding || [0, 0, 0, 0];
        this.isTarget          = (this.config.isTarget !== false);
        this.maintainOffset    = (this.config.maintainOffset);
        this.primaryButtonOnly = (this.config.primaryButtonOnly !== false);

    },

    /**
     * Executed when the linked element is available
     * @private
     */
    handleOnAvailable: function() {
        this.available = true;
        this.resetConstraints();
        this.onAvailable();
    },

    /**
     * Configures the padding for the target zone in px.  Effectively expands
     * (or reduces) the virtual object size for targeting calculations.
     * Supports css-style shorthand; if only one parameter is passed, all sides
     * will have that padding, and if only two are passed, the top and bottom
     * will have the first param, the left and right the second.
     * @param {Number} iTop    Top pad
     * @param {Number} iRight  Right pad
     * @param {Number} iBot    Bot pad
     * @param {Number} iLeft   Left pad
     */
    setPadding: function(iTop, iRight, iBot, iLeft) {
        // this.padding = [iLeft, iRight, iTop, iBot];
        if (!iRight && 0 !== iRight) {
            this.padding = [iTop, iTop, iTop, iTop];
        } else if (!iBot && 0 !== iBot) {
            this.padding = [iTop, iRight, iTop, iRight];
        } else {
            this.padding = [iTop, iRight, iBot, iLeft];
        }
    },

    /**
     * Stores the initial placement of the linked element.
     * @param {Number} diffX   the X offset, default 0
     * @param {Number} diffY   the Y offset, default 0
     */
    setInitPosition: function(diffX, diffY) {
        var el = this.getEl(),
            dx, dy, p;

        if (!this.DDMInstance.verifyEl(el)) {
            return;
        }

        dx = diffX || 0;
        dy = diffY || 0;

        p = Ext.Element.getXY( el );

        this.initPageX = p[0] - dx;
        this.initPageY = p[1] - dy;

        this.lastPageX = p[0];
        this.lastPageY = p[1];

        this.setStartPosition(p);
    },

    /**
     * Sets the start position of the element.  This is set when the obj
     * is initialized, the reset when a drag is started.
     * @param pos current position (from previous lookup)
     * @private
     */
    setStartPosition: function(pos) {
        var p = pos || Ext.Element.getXY( this.getEl() );
        this.deltaSetXY = null;

        this.startPageX = p[0];
        this.startPageY = p[1];
    },

    /**
     * Adds this instance to a group of related drag/drop objects.  All
     * instances belong to at least one group, and can belong to as many
     * groups as needed.
     * @param {String} sGroup the name of the group
     */
    addToGroup: function(sGroup) {
        this.groups[sGroup] = true;
        this.DDMInstance.regDragDrop(this, sGroup);
    },

    /**
     * Removes this instance from the supplied interaction group
     * @param {String} sGroup  The group to drop
     */
    removeFromGroup: function(sGroup) {
        if (this.groups[sGroup]) {
            delete this.groups[sGroup];
        }

        this.DDMInstance.removeDDFromGroup(this, sGroup);
    },

    /**
     * Allows you to specify that an element other than the linked element
     * will be moved with the cursor during a drag
     * @param {String} id the id of the element that will be used to initiate the drag
     */
    setDragElId: function(id) {
        this.dragElId = id;
    },

    /**
     * Allows you to specify a child of the linked element that should be
     * used to initiate the drag operation.  An example of this would be if
     * you have a content div with text and links.  Clicking anywhere in the
     * content area would normally start the drag operation.  Use this method
     * to specify that an element inside of the content div is the element
     * that starts the drag operation.
     * @param {String} id the id of the element that will be used to
     * initiate the drag.
     */
    setHandleElId: function(id) {
        if (typeof id !== "string") {
            id = Ext.id(id);
        }
        this.handleElId = id;
        this.DDMInstance.regHandle(this.id, id);
    },

    /**
     * Allows you to set an element outside of the linked element as a drag
     * handle
     * @param {String} id the id of the element that will be used to initiate the drag
     */
    setOuterHandleElId: function(id) {
        if (typeof id !== "string") {
            id = Ext.id(id);
        }
        Ext.EventManager.on(id, "mousedown", this.handleMouseDown, this);
        this.setHandleElId(id);

        this.hasOuterHandles = true;
    },

    /**
     * Removes all drag and drop hooks for this element
     */
    unreg: function() {
        Ext.EventManager.un(this.id, "mousedown", this.handleMouseDown, this);
        this._domRef = null;
        this.DDMInstance._remove(this);
    },

    destroy : function(){
        this.unreg();
    },

    /**
     * Returns true if this instance is locked, or the drag drop mgr is locked
     * (meaning that all drag/drop is disabled on the page.)
     * @return {Boolean} true if this obj or all drag/drop is locked, else
     * false
     */
    isLocked: function() {
        return (this.DDMInstance.isLocked() || this.locked);
    },

    /**
     * Called when this object is clicked
     * @param {Event} e
     * @param {Ext.dd.DragDrop} oDD the clicked dd object (this dd obj)
     * @private
     */
    handleMouseDown: function(e, oDD){
        if (this.primaryButtonOnly && e.button != 0) {
            return;
        }

        if (this.isLocked()) {
            return;
        }

        this.DDMInstance.refreshCache(this.groups);

        if (this.hasOuterHandles || this.DDMInstance.isOverTarget(e.getPoint(), this) )  {
            if (this.clickValidator(e)) {
                // set the initial element position
                this.setStartPosition();
                this.b4MouseDown(e);
                this.onMouseDown(e);

                this.DDMInstance.handleMouseDown(e, this);

                this.DDMInstance.stopEvent(e);
            }
        }
    },

    clickValidator: function(e) {
        var target = e.getTarget();
        return ( this.isValidHandleChild(target) &&
                    (this.id == this.handleElId ||
                        this.DDMInstance.handleWasClicked(target, this.id)) );
    },

    /**
     * Allows you to specify a tag name that should not start a drag operation
     * when clicked.  This is designed to facilitate embedding links within a
     * drag handle that do something other than start the drag.
     * @method addInvalidHandleType
     * @param {String} tagName the type of element to exclude
     */
    addInvalidHandleType: function(tagName) {
        var type = tagName.toUpperCase();
        this.invalidHandleTypes[type] = type;
    },

    /**
     * Lets you to specify an element id for a child of a drag handle
     * that should not initiate a drag
     * @method addInvalidHandleId
     * @param {String} id the element id of the element you wish to ignore
     */
    addInvalidHandleId: function(id) {
        if (typeof id !== "string") {
            id = Ext.id(id);
        }
        this.invalidHandleIds[id] = id;
    },

    /**
     * Lets you specify a css class of elements that will not initiate a drag
     * @param {String} cssClass the class of the elements you wish to ignore
     */
    addInvalidHandleClass: function(cssClass) {
        this.invalidHandleClasses.push(cssClass);
    },

    /**
     * Unsets an excluded tag name set by addInvalidHandleType
     * @param {String} tagName the type of element to unexclude
     */
    removeInvalidHandleType: function(tagName) {
        var type = tagName.toUpperCase();
        // this.invalidHandleTypes[type] = null;
        delete this.invalidHandleTypes[type];
    },

    /**
     * Unsets an invalid handle id
     * @param {String} id the id of the element to re-enable
     */
    removeInvalidHandleId: function(id) {
        if (typeof id !== "string") {
            id = Ext.id(id);
        }
        delete this.invalidHandleIds[id];
    },

    /**
     * Unsets an invalid css class
     * @param {String} cssClass the class of the element(s) you wish to
     * re-enable
     */
    removeInvalidHandleClass: function(cssClass) {
        for (var i=0, len=this.invalidHandleClasses.length; i<len; ++i) {
            if (this.invalidHandleClasses[i] == cssClass) {
                delete this.invalidHandleClasses[i];
            }
        }
    },

    /**
     * Checks the tag exclusion list to see if this click should be ignored
     * @param {HTMLElement} node the HTMLElement to evaluate
     * @return {Boolean} true if this is a valid tag type, false if not
     */
    isValidHandleChild: function(node) {

        var valid = true,
            nodeName,
            i, len;
        // var n = (node.nodeName == "#text") ? node.parentNode : node;
        try {
            nodeName = node.nodeName.toUpperCase();
        } catch(e) {
            nodeName = node.nodeName;
        }
        valid = valid && !this.invalidHandleTypes[nodeName];
        valid = valid && !this.invalidHandleIds[node.id];

        for (i=0, len=this.invalidHandleClasses.length; valid && i<len; ++i) {
            valid = !Ext.fly(node).hasCls(this.invalidHandleClasses[i]);
        }


        return valid;

    },

    /**
     * Creates the array of horizontal tick marks if an interval was specified
     * in setXConstraint().
     * @private
     */
    setXTicks: function(iStartX, iTickSize) {
        this.xTicks = [];
        this.xTickSize = iTickSize;

        var tickMap = {},
            i;

        for (i = this.initPageX; i >= this.minX; i = i - iTickSize) {
            if (!tickMap[i]) {
                this.xTicks[this.xTicks.length] = i;
                tickMap[i] = true;
            }
        }

        for (i = this.initPageX; i <= this.maxX; i = i + iTickSize) {
            if (!tickMap[i]) {
                this.xTicks[this.xTicks.length] = i;
                tickMap[i] = true;
            }
        }

        Ext.Array.sort(this.xTicks, this.DDMInstance.numericSort);
    },

    /**
     * Creates the array of vertical tick marks if an interval was specified in
     * setYConstraint().
     * @private
     */
    setYTicks: function(iStartY, iTickSize) {
        this.yTicks = [];
        this.yTickSize = iTickSize;

        var tickMap = {},
            i;

        for (i = this.initPageY; i >= this.minY; i = i - iTickSize) {
            if (!tickMap[i]) {
                this.yTicks[this.yTicks.length] = i;
                tickMap[i] = true;
            }
        }

        for (i = this.initPageY; i <= this.maxY; i = i + iTickSize) {
            if (!tickMap[i]) {
                this.yTicks[this.yTicks.length] = i;
                tickMap[i] = true;
            }
        }

        Ext.Array.sort(this.yTicks, this.DDMInstance.numericSort);
    },

    /**
     * By default, the element can be dragged any place on the screen.  Use
     * this method to limit the horizontal travel of the element.  Pass in
     * 0,0 for the parameters if you want to lock the drag to the y axis.
     * @param {Number} iLeft the number of pixels the element can move to the left
     * @param {Number} iRight the number of pixels the element can move to the
     * right
     * @param {Number} iTickSize (optional) parameter for specifying that the
     * element should move iTickSize pixels at a time.
     */
    setXConstraint: function(iLeft, iRight, iTickSize) {
        this.leftConstraint = iLeft;
        this.rightConstraint = iRight;

        this.minX = this.initPageX - iLeft;
        this.maxX = this.initPageX + iRight;
        if (iTickSize) { this.setXTicks(this.initPageX, iTickSize); }

        this.constrainX = true;
    },

    /**
     * Clears any constraints applied to this instance.  Also clears ticks
     * since they can't exist independent of a constraint at this time.
     */
    clearConstraints: function() {
        this.constrainX = false;
        this.constrainY = false;
        this.clearTicks();
    },

    /**
     * Clears any tick interval defined for this instance
     */
    clearTicks: function() {
        this.xTicks = null;
        this.yTicks = null;
        this.xTickSize = 0;
        this.yTickSize = 0;
    },

    /**
     * By default, the element can be dragged any place on the screen.  Set
     * this to limit the vertical travel of the element.  Pass in 0,0 for the
     * parameters if you want to lock the drag to the x axis.
     * @param {Number} iUp the number of pixels the element can move up
     * @param {Number} iDown the number of pixels the element can move down
     * @param {Number} iTickSize (optional) parameter for specifying that the
     * element should move iTickSize pixels at a time.
     */
    setYConstraint: function(iUp, iDown, iTickSize) {
        this.topConstraint = iUp;
        this.bottomConstraint = iDown;

        this.minY = this.initPageY - iUp;
        this.maxY = this.initPageY + iDown;
        if (iTickSize) { this.setYTicks(this.initPageY, iTickSize); }

        this.constrainY = true;

    },

    /**
     * Must be called if you manually reposition a dd element.
     * @param {Boolean} maintainOffset
     */
    resetConstraints: function() {
        // Maintain offsets if necessary
        if (this.initPageX || this.initPageX === 0) {
            // figure out how much this thing has moved
            var dx = (this.maintainOffset) ? this.lastPageX - this.initPageX : 0,
                dy = (this.maintainOffset) ? this.lastPageY - this.initPageY : 0;

            this.setInitPosition(dx, dy);

        // This is the first time we have detected the element's position
        } else {
            this.setInitPosition();
        }

        if (this.constrainX) {
            this.setXConstraint( this.leftConstraint,
                                 this.rightConstraint,
                                 this.xTickSize        );
        }

        if (this.constrainY) {
            this.setYConstraint( this.topConstraint,
                                 this.bottomConstraint,
                                 this.yTickSize         );
        }
    },

    /**
     * Normally the drag element is moved pixel by pixel, but we can specify
     * that it move a number of pixels at a time.  This method resolves the
     * location when we have it set up like this.
     * @param {Number} val where we want to place the object
     * @param {Number[]} tickArray sorted array of valid points
     * @return {Number} the closest tick
     * @private
     */
    getTick: function(val, tickArray) {
        if (!tickArray) {
            // If tick interval is not defined, it is effectively 1 pixel,
            // so we return the value passed to us.
            return val;
        } else if (tickArray[0] >= val) {
            // The value is lower than the first tick, so we return the first
            // tick.
            return tickArray[0];
        } else {
            var i, len, next, diff1, diff2;
            for (i=0, len=tickArray.length; i<len; ++i) {
                next = i + 1;
                if (tickArray[next] && tickArray[next] >= val) {
                    diff1 = val - tickArray[i];
                    diff2 = tickArray[next] - val;
                    return (diff2 > diff1) ? tickArray[i] : tickArray[next];
                }
            }

            // The value is larger than the last tick, so we return the last
            // tick.
            return tickArray[tickArray.length - 1];
        }
    },

    /**
     * toString method
     * @return {String} string representation of the dd obj
     */
    toString: function() {
        return ("DragDrop " + this.id);
    }

});

/*
 * This is a derivative of the similarly named class in the YUI Library.
 * The original license:
 * Copyright (c) 2006, Yahoo! Inc. All rights reserved.
 * Code licensed under the BSD License:
 * http://developer.yahoo.net/yui/license.txt
 */


/**
 * A DragDrop implementation where the linked element follows the
 * mouse cursor during a drag.
 */
Ext.define('Ext.dd.DD', {
    extend: 'Ext.dd.DragDrop',
    requires: ['Ext.dd.DragDropManager'],

    /**
     * Creates new DD instance.
     * @param {String} id the id of the linked element
     * @param {String} sGroup the group of related DragDrop items
     * @param {Object} config an object containing configurable attributes.
     * Valid properties for DD: scroll
     */
    constructor: function(id, sGroup, config) {
        if (id) {
            this.init(id, sGroup, config);
        }
    },

    /**
     * @property {Boolean} scroll
     * When set to true, the utility automatically tries to scroll the browser
     * window when a drag and drop element is dragged near the viewport boundary.
     */
    scroll: true,

    /**
     * Sets the pointer offset to the distance between the linked element's top
     * left corner and the location the element was clicked.
     * @param {Number} iPageX the X coordinate of the click
     * @param {Number} iPageY the Y coordinate of the click
     */
    autoOffset: function(iPageX, iPageY) {
        var x = iPageX - this.startPageX,
            y = iPageY - this.startPageY;
        this.setDelta(x, y);
    },

    /**
     * Sets the pointer offset.  You can call this directly to force the
     * offset to be in a particular location (e.g., pass in 0,0 to set it
     * to the center of the object)
     * @param {Number} iDeltaX the distance from the left
     * @param {Number} iDeltaY the distance from the top
     */
    setDelta: function(iDeltaX, iDeltaY) {
        this.deltaX = iDeltaX;
        this.deltaY = iDeltaY;
    },

    /**
     * Sets the drag element to the location of the mousedown or click event,
     * maintaining the cursor location relative to the location on the element
     * that was clicked.  Override this if you want to place the element in a
     * location other than where the cursor is.
     * @param {Number} iPageX the X coordinate of the mousedown or drag event
     * @param {Number} iPageY the Y coordinate of the mousedown or drag event
     */
    setDragElPos: function(iPageX, iPageY) {
        // the first time we do this, we are going to check to make sure
        // the element has css positioning

        var el = this.getDragEl();
        this.alignElWithMouse(el, iPageX, iPageY);
    },

    /**
     * Sets the element to the location of the mousedown or click event,
     * maintaining the cursor location relative to the location on the element
     * that was clicked.  Override this if you want to place the element in a
     * location other than where the cursor is.
     * @param {HTMLElement} el the element to move
     * @param {Number} iPageX the X coordinate of the mousedown or drag event
     * @param {Number} iPageY the Y coordinate of the mousedown or drag event
     */
    alignElWithMouse: function(el, iPageX, iPageY) {
        var oCoord = this.getTargetCoord(iPageX, iPageY),
            fly = el.dom ? el : Ext.fly(el, '_dd'),
            elSize = fly.getSize(),
            EL = Ext.Element,
            vpSize,
            aCoord,
            newLeft,
            newTop;

        if (!this.deltaSetXY) {
            vpSize = this.cachedViewportSize = { width: EL.getDocumentWidth(), height: EL.getDocumentHeight() };
            aCoord = [
                Math.max(0, Math.min(oCoord.x, vpSize.width - elSize.width)),
                Math.max(0, Math.min(oCoord.y, vpSize.height - elSize.height))
            ];
            fly.setXY(aCoord);
            newLeft = fly.getLocalX();
            newTop  = fly.getLocalY();
            this.deltaSetXY = [newLeft - oCoord.x, newTop - oCoord.y];
        } else {
            vpSize = this.cachedViewportSize;
            fly.setLeftTop(
                Math.max(0, Math.min(oCoord.x + this.deltaSetXY[0], vpSize.width - elSize.width)),
                Math.max(0, Math.min(oCoord.y + this.deltaSetXY[1], vpSize.height - elSize.height))
            );
        }

        this.cachePosition(oCoord.x, oCoord.y);
        this.autoScroll(oCoord.x, oCoord.y, el.offsetHeight, el.offsetWidth);
        return oCoord;
    },

    /**
     * Saves the most recent position so that we can reset the constraints and
     * tick marks on-demand.  We need to know this so that we can calculate the
     * number of pixels the element is offset from its original position.
     *
     * @param {Number} [iPageX] the current x position (this just makes it so we
     * don't have to look it up again)
     * @param {Number} [iPageY] the current y position (this just makes it so we
     * don't have to look it up again)
     */
    cachePosition: function(iPageX, iPageY) {
        if (iPageX) {
            this.lastPageX = iPageX;
            this.lastPageY = iPageY;
        } else {
            var aCoord = Ext.Element.getXY(this.getEl());
            this.lastPageX = aCoord[0];
            this.lastPageY = aCoord[1];
        }
    },

    /**
     * Auto-scroll the window if the dragged object has been moved beyond the
     * visible window boundary.
     * @param {Number} x the drag element's x position
     * @param {Number} y the drag element's y position
     * @param {Number} h the height of the drag element
     * @param {Number} w the width of the drag element
     * @private
     */
    autoScroll: function(x, y, h, w) {

        if (this.scroll) {
            // The client height
            var clientH = Ext.Element.getViewHeight(),
                // The client width
                clientW = Ext.Element.getViewWidth(),
                // The amt scrolled down
                st = this.DDMInstance.getScrollTop(),
                // The amt scrolled right
                sl = this.DDMInstance.getScrollLeft(),
                // Location of the bottom of the element
                bot = h + y,
                // Location of the right of the element
                right = w + x,
                // The distance from the cursor to the bottom of the visible area,
                // adjusted so that we don't scroll if the cursor is beyond the
                // element drag constraints
                toBot = (clientH + st - y - this.deltaY),
                // The distance from the cursor to the right of the visible area
                toRight = (clientW + sl - x - this.deltaX),
                // How close to the edge the cursor must be before we scroll
                // var thresh = (document.all) ? 100 : 40;
                thresh = 40,
                // How many pixels to scroll per autoscroll op.  This helps to reduce
                // clunky scrolling. IE is more sensitive about this ... it needs this
                // value to be higher.
                scrAmt = (document.all) ? 80 : 30;

            // Scroll down if we are near the bottom of the visible page and the
            // obj extends below the crease
            if ( bot > clientH && toBot < thresh ) {
                window.scrollTo(sl, st + scrAmt);
            }

            // Scroll up if the window is scrolled down and the top of the object
            // goes above the top border
            if ( y < st && st > 0 && y - st < thresh ) {
                window.scrollTo(sl, st - scrAmt);
            }

            // Scroll right if the obj is beyond the right border and the cursor is
            // near the border.
            if ( right > clientW && toRight < thresh ) {
                window.scrollTo(sl + scrAmt, st);
            }

            // Scroll left if the window has been scrolled to the right and the obj
            // extends past the left border
            if ( x < sl && sl > 0 && x - sl < thresh ) {
                window.scrollTo(sl - scrAmt, st);
            }
        }
    },

    /**
     * Finds the location the element should be placed if we want to move
     * it to where the mouse location less the click offset would place us.
     * @param {Number} iPageX the X coordinate of the click
     * @param {Number} iPageY the Y coordinate of the click
     * @return an object that contains the coordinates (Object.x and Object.y)
     * @private
     */
    getTargetCoord: function(iPageX, iPageY) {
        var x = iPageX - this.deltaX,
            y = iPageY - this.deltaY;

        if (this.constrainX) {
            if (x < this.minX) {
                x = this.minX;
            }
            if (x > this.maxX) {
                x = this.maxX;
            }
        }

        if (this.constrainY) {
            if (y < this.minY) {
                y = this.minY;
            }
            if (y > this.maxY) {
                y = this.maxY;
            }
        }

        x = this.getTick(x, this.xTicks);
        y = this.getTick(y, this.yTicks);


        return {x: x, y: y};
    },

    /**
     * Sets up config options specific to this class. Overrides
     * Ext.dd.DragDrop, but all versions of this method through the
     * inheritance chain are called
     */
    applyConfig: function() {
        this.callParent();
        this.scroll = (this.config.scroll !== false);
    },

    /**
     * Event that fires prior to the onMouseDown event.  Overrides
     * Ext.dd.DragDrop.
     */
    b4MouseDown: function(e) {
        // this.resetConstraints();
        this.autoOffset(e.getPageX(), e.getPageY());
    },

    /**
     * Event that fires prior to the onDrag event.  Overrides
     * Ext.dd.DragDrop.
     */
    b4Drag: function(e) {
        this.setDragElPos(e.getPageX(), e.getPageY());
    },

    toString: function() {
        return ("DD " + this.id);
    }

    //////////////////////////////////////////////////////////////////////////
    // Debugging ygDragDrop events that can be overridden
    //////////////////////////////////////////////////////////////////////////
    /*
    startDrag: function(x, y) {
    },

    onDrag: function(e) {
    },

    onDragEnter: function(e, id) {
    },

    onDragOver: function(e, id) {
    },

    onDragOut: function(e, id) {
    },

    onDragDrop: function(e, id) {
    },

    endDrag: function(e) {
    }

    */

});

/*
 * This is a derivative of the similarly named class in the YUI Library.
 * The original license:
 * Copyright (c) 2006, Yahoo! Inc. All rights reserved.
 * Code licensed under the BSD License:
 * http://developer.yahoo.net/yui/license.txt
 */

/**
 * A DragDrop implementation that inserts an empty, bordered div into
 * the document that follows the cursor during drag operations.  At the time of
 * the click, the frame div is resized to the dimensions of the linked html
 * element, and moved to the exact location of the linked element.
 *
 * References to the "frame" element refer to the single proxy element that
 * was created to be dragged in place of all DDProxy elements on the
 * page.
 */
Ext.define('Ext.dd.DDProxy', {
    extend: 'Ext.dd.DD',

    statics: {
        /**
         * The default drag frame div id
         * @static
         */
        dragElId: "ygddfdiv"
    },

    /**
     * Creates new DDProxy.
     * @param {String} id the id of the linked html element
     * @param {String} sGroup the group of related DragDrop objects
     * @param {Object} config an object containing configurable attributes.
     * Valid properties for DDProxy in addition to those in DragDrop:
     * 
     * - resizeFrame
     * - centerFrame
     * - dragElId
     */
    constructor: function(id, sGroup, config) {
        if (id) {
            this.init(id, sGroup, config);
            this.initFrame();
        }
    },

    /**
     * @property {Boolean} resizeFrame
     * By default we resize the drag frame to be the same size as the element
     * we want to drag (this is to get the frame effect).  We can turn it off
     * if we want a different behavior.
     */
    resizeFrame: true,

    /**
     * @property {Boolean} centerFrame
     * By default the frame is positioned exactly where the drag element is, so
     * we use the cursor offset provided by Ext.dd.DD.  Another option that works only if
     * you do not have constraints on the obj is to have the drag frame centered
     * around the cursor.  Set centerFrame to true for this effect.
     */
    centerFrame: false,

    /**
     * Creates the proxy element if it does not yet exist
     */
    createFrame: function() {
        var self = this,
            body = document.body,
            div,
            s;

        if (!body || !body.firstChild) {
            setTimeout( function() { self.createFrame(); }, 50 );
            return;
        }

        div = this.getDragEl();

        if (!div) {
            div    = document.createElement("div");
            div.id = this.dragElId;
            s  = div.style;

            s.position   = "absolute";
            s.visibility = "hidden";
            s.cursor     = "move";
            s.border     = "2px solid #aaa";
            s.zIndex     = 999;

            // appendChild can blow up IE if invoked prior to the window load event
            // while rendering a table.  It is possible there are other scenarios
            // that would cause this to happen as well.
            body.insertBefore(div, body.firstChild);
        }
    },

    /**
     * Initialization for the drag frame element.  Must be called in the
     * constructor of all subclasses
     */
    initFrame: function() {
        this.createFrame();
    },

    applyConfig: function() {
        this.callParent();

        this.resizeFrame = (this.config.resizeFrame !== false);
        this.centerFrame = (this.config.centerFrame);
        this.setDragElId(this.config.dragElId || Ext.dd.DDProxy.dragElId);
    },

    /**
     * Resizes the drag frame to the dimensions of the clicked object, positions
     * it over the object, and finally displays it
     * @param {Number} iPageX X click position
     * @param {Number} iPageY Y click position
     * @private
     */
    showFrame: function(iPageX, iPageY) {
        var el = this.getEl(),
            dragEl = this.getDragEl(),
            s = dragEl.style;

        this._resizeProxy();

        if (this.centerFrame) {
            this.setDelta( Math.round(parseInt(s.width,  10)/2),
                           Math.round(parseInt(s.height, 10)/2) );
        }

        this.setDragElPos(iPageX, iPageY);

        Ext.fly(dragEl).show();
    },

    /**
     * The proxy is automatically resized to the dimensions of the linked
     * element when a drag is initiated, unless resizeFrame is set to false
     * @private
     */
    _resizeProxy: function() {
        if (this.resizeFrame) {
            var el = this.getEl();
            Ext.fly(this.getDragEl()).setSize(el.offsetWidth, el.offsetHeight);
        }
    },

    // overrides Ext.dd.DragDrop
    b4MouseDown: function(e) {
        var x = e.getPageX(),
            y = e.getPageY();
        this.autoOffset(x, y);
        this.setDragElPos(x, y);
    },

    // overrides Ext.dd.DragDrop
    b4StartDrag: function(x, y) {
        // show the drag frame
        this.showFrame(x, y);
    },

    // overrides Ext.dd.DragDrop
    b4EndDrag: function(e) {
        Ext.fly(this.getDragEl()).hide();
    },

    // overrides Ext.dd.DragDrop
    // By default we try to move the element to the last location of the frame.
    // This is so that the default behavior mirrors that of Ext.dd.DD.
    endDrag: function(e) {

        var lel = this.getEl(),
            del = this.getDragEl();

        // Show the drag frame briefly so we can get its position
        del.style.visibility = "";

        this.beforeMove();
        // Hide the linked element before the move to get around a Safari
        // rendering bug.
        lel.style.visibility = "hidden";
        Ext.dd.DDM.moveToEl(lel, del);
        del.style.visibility = "hidden";
        lel.style.visibility = "";

        this.afterDrag();
    },

    beforeMove : function(){

    },

    afterDrag : function(){

    },

    toString: function() {
        return ("DDProxy " + this.id);
    }

});

/*
 * This is a derivative of the similarly named class in the YUI Library.
 * The original license:
 * Copyright (c) 2006, Yahoo! Inc. All rights reserved.
 * Code licensed under the BSD License:
 * http://developer.yahoo.net/yui/license.txt
 */


/**
 * A DragDrop implementation that does not move, but can be a drop
 * target.  You would get the same result by simply omitting implementation
 * for the event callbacks, but this way we reduce the processing cost of the
 * event listener and the callbacks.
 */
Ext.define('Ext.dd.DDTarget', {
    extend: 'Ext.dd.DragDrop',

    /**
     * Creates new DDTarget.
     * @param {String} id the id of the element that is a drop target
     * @param {String} sGroup the group of related DragDrop objects
     * @param {Object} config an object containing configurable attributes.
     * Valid properties for DDTarget in addition to those in DragDrop: none.
     */
    constructor: function(id, sGroup, config) {
        if (id) {
            this.initTarget(id, sGroup, config);
        }
    },

    /**
     * Overridden and disabled. A DDTarget does not support being dragged.
     * @method
     */
    getDragEl: Ext.emptyFn,
    /**
     * Overridden and disabled. A DDTarget does not support being dragged.
     * @method
     */
    isValidHandleChild: Ext.emptyFn,
    /**
     * Overridden and disabled. A DDTarget does not support being dragged.
     * @method
     */
    startDrag: Ext.emptyFn,
    /**
     * Overridden and disabled. A DDTarget does not support being dragged.
     * @method
     */
    endDrag: Ext.emptyFn,
    /**
     * Overridden and disabled. A DDTarget does not support being dragged.
     * @method
     */
    onDrag: Ext.emptyFn,
    /**
     * Overridden and disabled. A DDTarget does not support being dragged.
     * @method
     */
    onDragDrop: Ext.emptyFn,
    /**
     * Overridden and disabled. A DDTarget does not support being dragged.
     * @method
     */
    onDragEnter: Ext.emptyFn,
    /**
     * Overridden and disabled. A DDTarget does not support being dragged.
     * @method
     */
    onDragOut: Ext.emptyFn,
    /**
     * Overridden and disabled. A DDTarget does not support being dragged.
     * @method
     */
    onDragOver: Ext.emptyFn,
    /**
     * Overridden and disabled. A DDTarget does not support being dragged.
     * @method
     */
    onInvalidDrop: Ext.emptyFn,
    /**
     * Overridden and disabled. A DDTarget does not support being dragged.
     * @method
     */
    onMouseDown: Ext.emptyFn,
    /**
     * Overridden and disabled. A DDTarget does not support being dragged.
     * @method
     */
    onMouseUp: Ext.emptyFn,
    /**
     * Overridden and disabled. A DDTarget does not support being dragged.
     * @method
     */
    setXConstraint: Ext.emptyFn,
    /**
     * Overridden and disabled. A DDTarget does not support being dragged.
     * @method
     */
    setYConstraint: Ext.emptyFn,
    /**
     * Overridden and disabled. A DDTarget does not support being dragged.
     * @method
     */
    resetConstraints: Ext.emptyFn,
    /**
     * Overridden and disabled. A DDTarget does not support being dragged.
     * @method
     */
    clearConstraints: Ext.emptyFn,
    /**
     * Overridden and disabled. A DDTarget does not support being dragged.
     * @method
     */
    clearTicks: Ext.emptyFn,
    /**
     * Overridden and disabled. A DDTarget does not support being dragged.
     * @method
     */
    setInitPosition: Ext.emptyFn,
    /**
     * Overridden and disabled. A DDTarget does not support being dragged.
     * @method
     */
    setDragElId: Ext.emptyFn,
    /**
     * Overridden and disabled. A DDTarget does not support being dragged.
     * @method
     */
    setHandleElId: Ext.emptyFn,
    /**
     * Overridden and disabled. A DDTarget does not support being dragged.
     * @method
     */
    setOuterHandleElId: Ext.emptyFn,
    /**
     * Overridden and disabled. A DDTarget does not support being dragged.
     * @method
     */
    addInvalidHandleClass: Ext.emptyFn,
    /**
     * Overridden and disabled. A DDTarget does not support being dragged.
     * @method
     */
    addInvalidHandleId: Ext.emptyFn,
    /**
     * Overridden and disabled. A DDTarget does not support being dragged.
     * @method
     */
    addInvalidHandleType: Ext.emptyFn,
    /**
     * Overridden and disabled. A DDTarget does not support being dragged.
     * @method
     */
    removeInvalidHandleClass: Ext.emptyFn,
    /**
     * Overridden and disabled. A DDTarget does not support being dragged.
     * @method
     */
    removeInvalidHandleId: Ext.emptyFn,
    /**
     * Overridden and disabled. A DDTarget does not support being dragged.
     * @method
     */
    removeInvalidHandleType: Ext.emptyFn,

    toString: function() {
        return ("DDTarget " + this.id);
    }
});
/**
 * A simple class that provides the basic implementation needed to make any element a drop target that can have
 * draggable items dropped onto it.  The drop has no effect until an implementation of notifyDrop is provided.
 */
Ext.define('Ext.dd.DropTarget', {
    extend: 'Ext.dd.DDTarget',
    requires: ['Ext.dd.ScrollManager'],

    /**
     * Creates new DropTarget.
     * @param {String/HTMLElement/Ext.Element} el The container element or ID of it.
     * @param {Object} config
     */
    constructor : function(el, config){
        this.el = Ext.get(el);

        Ext.apply(this, config);

        if(this.containerScroll){
            Ext.dd.ScrollManager.register(this.el);
        }

        this.callParent([this.el.dom, this.ddGroup || this.group,
              {isTarget: true}]);
    },

    /**
     * @cfg {String} ddGroup
     * A named drag drop group to which this object belongs.  If a group is specified, then this object will only
     * interact with other drag drop objects in the same group.
     */
    /**
     * @cfg {String} [overClass=""]
     * The CSS class applied to the drop target element while the drag source is over it.
     */
    /**
     * @cfg {String} dropAllowed
     * The CSS class returned to the drag source when drop is allowed.
     */
    dropAllowed : Ext.baseCSSPrefix + 'dd-drop-ok',
    /**
     * @cfg {String} dropNotAllowed
     * The CSS class returned to the drag source when drop is not allowed.
     */
    dropNotAllowed : Ext.baseCSSPrefix + 'dd-drop-nodrop',

    // private
    isTarget : true,

    // private
    isNotifyTarget : true,

    /**
     * The function a {@link Ext.dd.DragSource} calls once to notify this drop target that the source is now over the
     * target.  This default implementation adds the CSS class specified by overClass (if any) to the drop element
     * and returns the dropAllowed config value.  This method should be overridden if drop validation is required.
     * @param {Ext.dd.DragSource} source The drag source that was dragged over this drop target
     * @param {Event} e The event
     * @param {Object} data An object containing arbitrary data supplied by the drag source
     * @return {String} status The CSS class that communicates the drop status back to the source so that the
     * underlying {@link Ext.dd.StatusProxy} can be updated
     * @template
     */
    notifyEnter : function(dd, e, data){
        if(this.overClass){
            this.el.addCls(this.overClass);
        }
        return this.dropAllowed;
    },

    /**
     * The function a {@link Ext.dd.DragSource} calls continuously while it is being dragged over the target.
     * This method will be called on every mouse movement while the drag source is over the drop target.
     * This default implementation simply returns the dropAllowed config value.
     * @param {Ext.dd.DragSource} source The drag source that was dragged over this drop target
     * @param {Event} e The event
     * @param {Object} data An object containing arbitrary data supplied by the drag source
     * @return {String} status The CSS class that communicates the drop status back to the source so that the
     * underlying {@link Ext.dd.StatusProxy} can be updated
     * @template
     */
    notifyOver : function(dd, e, data){
        return this.dropAllowed;
    },

    /**
     * The function a {@link Ext.dd.DragSource} calls once to notify this drop target that the source has been dragged
     * out of the target without dropping.  This default implementation simply removes the CSS class specified by
     * overClass (if any) from the drop element.
     * @param {Ext.dd.DragSource} source The drag source that was dragged over this drop target
     * @param {Event} e The event
     * @param {Object} data An object containing arbitrary data supplied by the drag source
     * @template
     */
    notifyOut : function(dd, e, data){
        if(this.overClass){
            this.el.removeCls(this.overClass);
        }
    },

    /**
     * The function a {@link Ext.dd.DragSource} calls once to notify this drop target that the dragged item has
     * been dropped on it.  This method has no default implementation and returns false, so you must provide an
     * implementation that does something to process the drop event and returns true so that the drag source's
     * repair action does not run.
     * @param {Ext.dd.DragSource} source The drag source that was dragged over this drop target
     * @param {Event} e The event
     * @param {Object} data An object containing arbitrary data supplied by the drag source
     * @return {Boolean} False if the drop was invalid.
     * @template
     */
    notifyDrop : function(dd, e, data){
        return false;
    },

    destroy : function(){
        this.callParent();
        if(this.containerScroll){
            Ext.dd.ScrollManager.unregister(this.el);
        }
    }
});

/**
 * This class provides a container DD instance that allows dropping on multiple child target nodes.
 *
 * By default, this class requires that child nodes accepting drop are registered with {@link Ext.dd.Registry}.
 * However a simpler way to allow a DropZone to manage any number of target elements is to configure the
 * DropZone with an implementation of {@link #getTargetFromEvent} which interrogates the passed
 * mouse event to see if it has taken place within an element, or class of elements. This is easily done
 * by using the event's {@link Ext.EventObject#getTarget getTarget} method to identify a node based on a
 * {@link Ext.DomQuery} selector.
 *
 * Once the DropZone has detected through calling getTargetFromEvent, that the mouse is over
 * a drop target, that target is passed as the first parameter to {@link #onNodeEnter}, {@link #onNodeOver},
 * {@link #onNodeOut}, {@link #onNodeDrop}. You may configure the instance of DropZone with implementations
 * of these methods to provide application-specific behaviour for these events to update both
 * application state, and UI state.
 *
 * For example to make a GridPanel a cooperating target with the example illustrated in
 * {@link Ext.dd.DragZone DragZone}, the following technique might be used:
 *
 *     myGridPanel.on('render', function() {
 *         myGridPanel.dropZone = new Ext.dd.DropZone(myGridPanel.getView().scroller, {
 *
 *             // If the mouse is over a grid row, return that node. This is
 *             // provided as the "target" parameter in all "onNodeXXXX" node event handling functions
 *             getTargetFromEvent: function(e) {
 *                 return e.getTarget(myGridPanel.getView().rowSelector);
 *             },
 *
 *             // On entry into a target node, highlight that node.
 *             onNodeEnter : function(target, dd, e, data){
 *                 Ext.fly(target).addCls('my-row-highlight-class');
 *             },
 *
 *             // On exit from a target node, unhighlight that node.
 *             onNodeOut : function(target, dd, e, data){
 *                 Ext.fly(target).removeCls('my-row-highlight-class');
 *             },
 *
 *             // While over a target node, return the default drop allowed class which
 *             // places a "tick" icon into the drag proxy.
 *             onNodeOver : function(target, dd, e, data){
 *                 return Ext.dd.DropZone.prototype.dropAllowed;
 *             },
 *
 *             // On node drop we can interrogate the target to find the underlying
 *             // application object that is the real target of the dragged data.
 *             // In this case, it is a Record in the GridPanel's Store.
 *             // We can use the data set up by the DragZone's getDragData method to read
 *             // any data we decided to attach in the DragZone's getDragData method.
 *             onNodeDrop : function(target, dd, e, data){
 *                 var rowIndex = myGridPanel.getView().findRowIndex(target);
 *                 var r = myGridPanel.getStore().getAt(rowIndex);
 *                 Ext.Msg.alert('Drop gesture', 'Dropped Record id ' + data.draggedRecord.id +
 *                     ' on Record id ' + r.id);
 *                 return true;
 *             }
 *         });
 *     }
 *
 * See the {@link Ext.dd.DragZone DragZone} documentation for details about building a DragZone which
 * cooperates with this DropZone.
 */
Ext.define('Ext.dd.DropZone', {
    extend: 'Ext.dd.DropTarget',
    requires: ['Ext.dd.Registry'],

    /**
     * Returns a custom data object associated with the DOM node that is the target of the event.  By default
     * this looks up the event target in the {@link Ext.dd.Registry}, although you can override this method to
     * provide your own custom lookup.
     * @param {Event} e The event
     * @return {Object} data The custom data
     */
    getTargetFromEvent : function(e){
        return Ext.dd.Registry.getTargetFromEvent(e);
    },

    /**
     * Called when the DropZone determines that a {@link Ext.dd.DragSource} has entered a drop node
     * that has either been registered or detected by a configured implementation of {@link #getTargetFromEvent}.
     * This method has no default implementation and should be overridden to provide
     * node-specific processing if necessary.
     * @param {Object} nodeData The custom data associated with the drop node (this is the same value returned from 
     * {@link #getTargetFromEvent} for this node)
     * @param {Ext.dd.DragSource} source The drag source that was dragged over this drop zone
     * @param {Event} e The event
     * @param {Object} data An object containing arbitrary data supplied by the drag source
     */
    onNodeEnter : function(n, dd, e, data){
        
    },

    /**
     * Called while the DropZone determines that a {@link Ext.dd.DragSource} is over a drop node
     * that has either been registered or detected by a configured implementation of {@link #getTargetFromEvent}.
     * The default implementation returns this.dropAllowed, so it should be
     * overridden to provide the proper feedback.
     * @param {Object} nodeData The custom data associated with the drop node (this is the same value returned from
     * {@link #getTargetFromEvent} for this node)
     * @param {Ext.dd.DragSource} source The drag source that was dragged over this drop zone
     * @param {Event} e The event
     * @param {Object} data An object containing arbitrary data supplied by the drag source
     * @return {String} status The CSS class that communicates the drop status back to the source so that the
     * underlying {@link Ext.dd.StatusProxy} can be updated
     * @template
     */
    onNodeOver : function(n, dd, e, data){
        return this.dropAllowed;
    },

    /**
     * Called when the DropZone determines that a {@link Ext.dd.DragSource} has been dragged out of
     * the drop node without dropping.  This method has no default implementation and should be overridden to provide
     * node-specific processing if necessary.
     * @param {Object} nodeData The custom data associated with the drop node (this is the same value returned from
     * {@link #getTargetFromEvent} for this node)
     * @param {Ext.dd.DragSource} source The drag source that was dragged over this drop zone
     * @param {Event} e The event
     * @param {Object} data An object containing arbitrary data supplied by the drag source
     * @template
     */
    onNodeOut : function(n, dd, e, data){
        
    },

    /**
     * Called when the DropZone determines that a {@link Ext.dd.DragSource} has been dropped onto
     * the drop node.  The default implementation returns false, so it should be overridden to provide the
     * appropriate processing of the drop event and return true so that the drag source's repair action does not run.
     * @param {Object} nodeData The custom data associated with the drop node (this is the same value returned from
     * {@link #getTargetFromEvent} for this node)
     * @param {Ext.dd.DragSource} source The drag source that was dragged over this drop zone
     * @param {Event} e The event
     * @param {Object} data An object containing arbitrary data supplied by the drag source
     * @return {Boolean} True if the drop was valid, else false
     * @template
     */
    onNodeDrop : function(n, dd, e, data){
        return false;
    },

    /**
     * Called while the DropZone determines that a {@link Ext.dd.DragSource} is being dragged over it,
     * but not over any of its registered drop nodes.  The default implementation returns this.dropNotAllowed, so
     * it should be overridden to provide the proper feedback if necessary.
     * @param {Ext.dd.DragSource} source The drag source that was dragged over this drop zone
     * @param {Event} e The event
     * @param {Object} data An object containing arbitrary data supplied by the drag source
     * @return {String} status The CSS class that communicates the drop status back to the source so that the
     * underlying {@link Ext.dd.StatusProxy} can be updated
     * @template
     */
    onContainerOver : function(dd, e, data){
        return this.dropNotAllowed;
    },

    /**
     * Called when the DropZone determines that a {@link Ext.dd.DragSource} has been dropped on it,
     * but not on any of its registered drop nodes.  The default implementation returns false, so it should be
     * overridden to provide the appropriate processing of the drop event if you need the drop zone itself to
     * be able to accept drops.  It should return true when valid so that the drag source's repair action does not run.
     * @param {Ext.dd.DragSource} source The drag source that was dragged over this drop zone
     * @param {Event} e The event
     * @param {Object} data An object containing arbitrary data supplied by the drag source
     * @return {Boolean} True if the drop was valid, else false
     * @template
     */
    onContainerDrop : function(dd, e, data){
        return false;
    },

    /**
     * The function a {@link Ext.dd.DragSource} calls once to notify this drop zone that the source is now over
     * the zone.  The default implementation returns this.dropNotAllowed and expects that only registered drop
     * nodes can process drag drop operations, so if you need the drop zone itself to be able to process drops
     * you should override this method and provide a custom implementation.
     * @param {Ext.dd.DragSource} source The drag source that was dragged over this drop zone
     * @param {Event} e The event
     * @param {Object} data An object containing arbitrary data supplied by the drag source
     * @return {String} status The CSS class that communicates the drop status back to the source so that the
     * underlying {@link Ext.dd.StatusProxy} can be updated
     * @template
     */
    notifyEnter : function(dd, e, data){
        return this.dropNotAllowed;
    },

    /**
     * The function a {@link Ext.dd.DragSource} calls continuously while it is being dragged over the drop zone.
     * This method will be called on every mouse movement while the drag source is over the drop zone.
     * It will call {@link #onNodeOver} while the drag source is over a registered node, and will also automatically
     * delegate to the appropriate node-specific methods as necessary when the drag source enters and exits
     * registered nodes ({@link #onNodeEnter}, {@link #onNodeOut}). If the drag source is not currently over a
     * registered node, it will call {@link #onContainerOver}.
     * @param {Ext.dd.DragSource} source The drag source that was dragged over this drop zone
     * @param {Event} e The event
     * @param {Object} data An object containing arbitrary data supplied by the drag source
     * @return {String} status The CSS class that communicates the drop status back to the source so that the
     * underlying {@link Ext.dd.StatusProxy} can be updated
     * @template
     */
    notifyOver : function(dd, e, data){
        var n = this.getTargetFromEvent(e);
        if(!n) { // not over valid drop target
            if(this.lastOverNode){
                this.onNodeOut(this.lastOverNode, dd, e, data);
                this.lastOverNode = null;
            }
            return this.onContainerOver(dd, e, data);
        }
        if(this.lastOverNode != n){
            if(this.lastOverNode){
                this.onNodeOut(this.lastOverNode, dd, e, data);
            }
            this.onNodeEnter(n, dd, e, data);
            this.lastOverNode = n;
        }
        return this.onNodeOver(n, dd, e, data);
    },

    /**
     * The function a {@link Ext.dd.DragSource} calls once to notify this drop zone that the source has been dragged
     * out of the zone without dropping.  If the drag source is currently over a registered node, the notification
     * will be delegated to {@link #onNodeOut} for node-specific handling, otherwise it will be ignored.
     * @param {Ext.dd.DragSource} source The drag source that was dragged over this drop target
     * @param {Event} e The event
     * @param {Object} data An object containing arbitrary data supplied by the drag zone
     * @template
     */
    notifyOut : function(dd, e, data){
        if(this.lastOverNode){
            this.onNodeOut(this.lastOverNode, dd, e, data);
            this.lastOverNode = null;
        }
    },

    /**
     * The function a {@link Ext.dd.DragSource} calls once to notify this drop zone that the dragged item has
     * been dropped on it.  The drag zone will look up the target node based on the event passed in, and if there
     * is a node registered for that event, it will delegate to {@link #onNodeDrop} for node-specific handling,
     * otherwise it will call {@link #onContainerDrop}.
     * @param {Ext.dd.DragSource} source The drag source that was dragged over this drop zone
     * @param {Event} e The event
     * @param {Object} data An object containing arbitrary data supplied by the drag source
     * @return {Boolean} False if the drop was invalid.
     * @template
     */
    notifyDrop : function(dd, e, data){
        if(this.lastOverNode){
            this.onNodeOut(this.lastOverNode, dd, e, data);
            this.lastOverNode = null;
        }
        var n = this.getTargetFromEvent(e);
        return n ?
            this.onNodeDrop(n, dd, e, data) :
            this.onContainerDrop(dd, e, data);
    },

    // private
    triggerCacheRefresh : function() {
        Ext.dd.DDM.refreshCache(this.groups);
    }
});
/**
 * A specialized floating Component that supports a drop status icon, {@link Ext.Layer} styles
 * and auto-repair.  This is the default drag proxy used by all Ext.dd components.
 */
Ext.define('Ext.dd.StatusProxy', {
    extend: 'Ext.Component',
    animRepair: false,

    childEls: [
        'ghost'
    ],

    renderTpl: [
        '<div class="' + Ext.baseCSSPrefix + 'dd-drop-icon"></div>' +
        '<div id="{id}-ghost" class="' + Ext.baseCSSPrefix + 'dd-drag-ghost"></div>'
    ],

    /**
     * Creates new StatusProxy.
     * @param {Object} [config] Config object.
     */
    constructor: function(config) {
        var me = this;

        config = config || {};

        Ext.apply(me, {
            hideMode: 'visibility',
            hidden: true,
            floating: true,
            id: me.id || Ext.id(),
            cls: Ext.baseCSSPrefix + 'dd-drag-proxy ' + this.dropNotAllowed,
            shadow: config.shadow || false,
            renderTo: Ext.getDetachedBody()
        });
        me.callParent(arguments);
        this.dropStatus = this.dropNotAllowed;
    },

    /**
     * @cfg {String} dropAllowed
     * The CSS class to apply to the status element when drop is allowed.
     */
    dropAllowed : Ext.baseCSSPrefix + 'dd-drop-ok',

    /**
     * @cfg {String} dropNotAllowed
     * The CSS class to apply to the status element when drop is not allowed.
     */
    dropNotAllowed : Ext.baseCSSPrefix + 'dd-drop-nodrop',

    /**
     * Updates the proxy's visual element to indicate the status of whether or not drop is allowed
     * over the current target element.
     * @param {String} cssClass The css class for the new drop status indicator image
     */
    setStatus : function(cssClass){
        cssClass = cssClass || this.dropNotAllowed;
        if (this.dropStatus != cssClass) {
            this.el.replaceCls(this.dropStatus, cssClass);
            this.dropStatus = cssClass;
        }
    },

    /**
     * Resets the status indicator to the default dropNotAllowed value
     * @param {Boolean} clearGhost True to also remove all content from the ghost, false to preserve it
     */
    reset : function(clearGhost){
        var me = this,
            clsPrefix = Ext.baseCSSPrefix + 'dd-drag-proxy ';

        me.el.replaceCls(clsPrefix + me.dropAllowed, clsPrefix + me.dropNotAllowed);
        me.dropStatus = me.dropNotAllowed;
        if (clearGhost) {
            me.ghost.update('');
        }
    },

    /**
     * Updates the contents of the ghost element
     * @param {String/HTMLElement} html The html that will replace the current innerHTML of the ghost element, or a
     * DOM node to append as the child of the ghost element (in which case the innerHTML will be cleared first).
     */
    update : function(html){
        if (typeof html == "string") {
            this.ghost.update(html);
        } else {
            this.ghost.update("");
            html.style.margin = "0";
            this.ghost.dom.appendChild(html);
        }
        var el = this.ghost.dom.firstChild;
        if (el) {
            Ext.fly(el).setStyle('float', 'none');
        }
    },

    /**
     * Returns the ghost element
     * @return {Ext.Element} el
     */
    getGhost : function(){
        return this.ghost;
    },

    /**
     * Hides the proxy
     * @param {Boolean} clear True to reset the status and clear the ghost contents,
     * false to preserve them
     */
    hide : function(clear) {
        this.callParent();
        if (clear) {
            this.reset(true);
        }
    },

    /**
     * Stops the repair animation if it's currently running
     */
    stop : function(){
        if (this.anim && this.anim.isAnimated && this.anim.isAnimated()) {
            this.anim.stop();
        }
    },

    /**
     * Force the Layer to sync its shadow and shim positions to the element
     */
    sync : function(){
        this.el.sync();
    },

    /**
     * Causes the proxy to return to its position of origin via an animation.
     * Should be called after an invalid drop operation by the item being dragged.
     * @param {Number[]} xy The XY position of the element ([x, y])
     * @param {Function} callback The function to call after the repair is complete.
     * @param {Object} scope The scope (`this` reference) in which the callback function is executed.
     * Defaults to the browser window.
     */
    repair : function(xy, callback, scope) {
        var me = this;

        me.callback = callback;
        me.scope = scope;
        if (xy && me.animRepair !== false) {
            me.el.addCls(Ext.baseCSSPrefix + 'dd-drag-repair');
            me.el.hideUnders(true);
            me.anim = me.el.animate({
                duration: me.repairDuration || 500,
                easing: 'ease-out',
                to: {
                    x: xy[0],
                    y: xy[1]
                },
                stopAnimation: true,
                callback: me.afterRepair,
                scope: me
            });
        } else {
            me.afterRepair();
        }
    },

    // private
    afterRepair : function() {
        var me = this;
    
        me.hide(true);
        me.el.removeCls(Ext.baseCSSPrefix + 'dd-drag-repair');
        if (typeof me.callback == "function") {
            me.callback.call(me.scope || me);
        }
        delete me.callback;
        delete me.scope;
    }
});

/**
 * A simple class that provides the basic implementation needed to make any element draggable.
 */
Ext.define('Ext.dd.DragSource', {
    extend: 'Ext.dd.DDProxy',
    requires: [
        'Ext.dd.StatusProxy',
        'Ext.dd.DragDropManager'
    ],

    /**
     * @cfg {String} ddGroup
     * A named drag drop group to which this object belongs.  If a group is specified, then this object will only
     * interact with other drag drop objects in the same group.
     */

    /**
     * @cfg {String} dropAllowed
     * The CSS class returned to the drag source when drop is allowed.
     */
    dropAllowed : Ext.baseCSSPrefix + 'dd-drop-ok',
    /**
     * @cfg {String} dropNotAllowed
     * The CSS class returned to the drag source when drop is not allowed.
     */
    dropNotAllowed : Ext.baseCSSPrefix + 'dd-drop-nodrop',

    /**
     * @cfg {Boolean} animRepair
     * If true, animates the proxy element back to the position of the handle element used to trigger the drag.
     */
    animRepair: true,

    /**
     * @cfg {String} repairHighlightColor
     * The color to use when visually highlighting the drag source in the afterRepair
     * method after a failed drop (defaults to light blue). The color must be a 6 digit hex value, without
     * a preceding '#'.
     */
    repairHighlightColor: 'c3daf9',

    /**
     * Creates new drag-source.
     * @param {String/HTMLElement/Ext.Element} el The container element or ID of it.
     * @param {Object} config (optional) Config object.
     */
    constructor: function(el, config) {
        this.el = Ext.get(el);
        if(!this.dragData){
            this.dragData = {};
        }

        Ext.apply(this, config);

        if(!this.proxy){
            this.proxy = new Ext.dd.StatusProxy({
                id: this.el.id + '-drag-status-proxy',
                animRepair: this.animRepair
            });
        }
        this.callParent([this.el.dom, this.ddGroup || this.group,
              {dragElId : this.proxy.id, resizeFrame: false, isTarget: false, scroll: this.scroll === true}]);

        this.dragging = false;
    },

    /**
     * Returns the data object associated with this drag source
     * @return {Object} data An object containing arbitrary data
     */
    getDragData : function(e){
        return this.dragData;
    },

    // private
    onDragEnter : function(e, id){
        var target = Ext.dd.DragDropManager.getDDById(id),
            status;
        this.cachedTarget = target;
        if (this.beforeDragEnter(target, e, id) !== false) {
            if (target.isNotifyTarget) {
                status = target.notifyEnter(this, e, this.dragData);
                this.proxy.setStatus(status);
            } else {
                this.proxy.setStatus(this.dropAllowed);
            }

            if (this.afterDragEnter) {
                /**
                 * An empty function by default, but provided so that you can perform a custom action
                 * when the dragged item enters the drop target by providing an implementation.
                 * @param {Ext.dd.DragDrop} target The drop target
                 * @param {Event} e The event object
                 * @param {String} id The id of the dragged element
                 * @method afterDragEnter
                 */
                this.afterDragEnter(target, e, id);
            }
        }
    },

    /**
     * An empty function by default, but provided so that you can perform a custom action
     * before the dragged item enters the drop target and optionally cancel the onDragEnter.
     * @param {Ext.dd.DragDrop} target The drop target
     * @param {Event} e The event object
     * @param {String} id The id of the dragged element
     * @return {Boolean} isValid True if the drag event is valid, else false to cancel
     * @template
     */
    beforeDragEnter: function(target, e, id) {
        return true;
    },

    // private
    onDragOver: function(e, id) {
        var target = this.cachedTarget || Ext.dd.DragDropManager.getDDById(id),
            status;
        if (this.beforeDragOver(target, e, id) !== false) {
            if(target.isNotifyTarget){
                status = target.notifyOver(this, e, this.dragData);
                this.proxy.setStatus(status);
            }

            if (this.afterDragOver) {
                /**
                 * An empty function by default, but provided so that you can perform a custom action
                 * while the dragged item is over the drop target by providing an implementation.
                 * @param {Ext.dd.DragDrop} target The drop target
                 * @param {Event} e The event object
                 * @param {String} id The id of the dragged element
                 * @method afterDragOver
                 */
                this.afterDragOver(target, e, id);
            }
        }
    },

    /**
     * An empty function by default, but provided so that you can perform a custom action
     * while the dragged item is over the drop target and optionally cancel the onDragOver.
     * @param {Ext.dd.DragDrop} target The drop target
     * @param {Event} e The event object
     * @param {String} id The id of the dragged element
     * @return {Boolean} isValid True if the drag event is valid, else false to cancel
     * @template
     */
    beforeDragOver: function(target, e, id) {
        return true;
    },

    // private
    onDragOut: function(e, id) {
        var target = this.cachedTarget || Ext.dd.DragDropManager.getDDById(id);
        if (this.beforeDragOut(target, e, id) !== false) {
            if (target.isNotifyTarget) {
                target.notifyOut(this, e, this.dragData);
            }
            this.proxy.reset();
            if (this.afterDragOut) {
                /**
                 * An empty function by default, but provided so that you can perform a custom action
                 * after the dragged item is dragged out of the target without dropping.
                 * @param {Ext.dd.DragDrop} target The drop target
                 * @param {Event} e The event object
                 * @param {String} id The id of the dragged element
                 * @method afterDragOut
                 */
                this.afterDragOut(target, e, id);
            }
        }
        this.cachedTarget = null;
    },

    /**
     * An empty function by default, but provided so that you can perform a custom action before the dragged
     * item is dragged out of the target without dropping, and optionally cancel the onDragOut.
     * @param {Ext.dd.DragDrop} target The drop target
     * @param {Event} e The event object
     * @param {String} id The id of the dragged element
     * @return {Boolean} isValid True if the drag event is valid, else false to cancel
     * @template
     */
    beforeDragOut: function(target, e, id){
        return true;
    },

    // private
    onDragDrop: function(e, id){
        var target = this.cachedTarget || Ext.dd.DragDropManager.getDDById(id);
        if (this.beforeDragDrop(target, e, id) !== false) {
            if (target.isNotifyTarget) {
                if (target.notifyDrop(this, e, this.dragData) !== false) { // valid drop?
                    this.onValidDrop(target, e, id);
                } else {
                    this.onInvalidDrop(target, e, id);
                }
            } else {
                this.onValidDrop(target, e, id);
            }

            if (this.afterDragDrop) {
                /**
                 * An empty function by default, but provided so that you can perform a custom action
                 * after a valid drag drop has occurred by providing an implementation.
                 * @param {Ext.dd.DragDrop} target The drop target
                 * @param {Event} e The event object
                 * @param {String} id The id of the dropped element
                 * @method afterDragDrop
                 */
                this.afterDragDrop(target, e, id);
            }
        }
        delete this.cachedTarget;
    },

    /**
     * An empty function by default, but provided so that you can perform a custom action before the dragged
     * item is dropped onto the target and optionally cancel the onDragDrop.
     * @param {Ext.dd.DragDrop} target The drop target
     * @param {Event} e The event object
     * @param {String} id The id of the dragged element
     * @return {Boolean} isValid True if the drag drop event is valid, else false to cancel
     * @template
     */
    beforeDragDrop: function(target, e, id){
        return true;
    },

    // private
    onValidDrop: function(target, e, id){
        this.hideProxy();
        if(this.afterValidDrop){
            /**
             * An empty function by default, but provided so that you can perform a custom action
             * after a valid drop has occurred by providing an implementation.
             * @param {Object} target The target DD
             * @param {Event} e The event object
             * @param {String} id The id of the dropped element
             * @method afterValidDrop
             */
            this.afterValidDrop(target, e, id);
        }
    },

    // private
    getRepairXY: function(e, data){
        return this.el.getXY();
    },

    // private
    onInvalidDrop: function(target, e, id) {
        // This method may be called by the DragDropManager.
        // To preserve backwards compat, it only passes the event object
        // Here we correct the arguments.
        if (!e) {
            e = target;
            target = null;
            id = e.getTarget().id;
        }
        this.beforeInvalidDrop(target, e, id);
        if (this.cachedTarget) {
            if(this.cachedTarget.isNotifyTarget){
                this.cachedTarget.notifyOut(this, e, this.dragData);
            }
            this.cacheTarget = null;
        }
        this.proxy.repair(this.getRepairXY(e, this.dragData), this.afterRepair, this);

        if (this.afterInvalidDrop) {
            /**
             * An empty function by default, but provided so that you can perform a custom action
             * after an invalid drop has occurred by providing an implementation.
             * @param {Event} e The event object
             * @param {String} id The id of the dropped element
             * @method afterInvalidDrop
             */
            this.afterInvalidDrop(e, id);
        }
    },

    // private
    afterRepair: function() {
        var me = this;
        if (Ext.enableFx) {
            me.el.highlight(me.repairHighlightColor);
        }
        me.dragging = false;
    },

    /**
     * An empty function by default, but provided so that you can perform a custom action after an invalid
     * drop has occurred.
     * @param {Ext.dd.DragDrop} target The drop target
     * @param {Event} e The event object
     * @param {String} id The id of the dragged element
     * @return {Boolean} isValid True if the invalid drop should proceed, else false to cancel
     * @template
     */
    beforeInvalidDrop: function(target, e, id) {
        return true;
    },

    // private
    handleMouseDown: function(e) {
        if (this.dragging) {
            return;
        }
        var data = this.getDragData(e);
        if (data && this.onBeforeDrag(data, e) !== false) {
            this.dragData = data;
            this.proxy.stop();
            this.callParent(arguments);
        }
    },

    /**
     * An empty function by default, but provided so that you can perform a custom action before the initial
     * drag event begins and optionally cancel it.
     * @param {Object} data An object containing arbitrary data to be shared with drop targets
     * @param {Event} e The event object
     * @return {Boolean} isValid True if the drag event is valid, else false to cancel
     * @template
     */
    onBeforeDrag: function(data, e){
        return true;
    },

    /**
     * An empty function by default, but provided so that you can perform a custom action once the initial
     * drag event has begun.  The drag cannot be canceled from this function.
     * @param {Number} x The x position of the click on the dragged object
     * @param {Number} y The y position of the click on the dragged object
     * @method
     * @template
     */
    onStartDrag: Ext.emptyFn,

    alignElWithMouse: function() {
        this.proxy.ensureAttachedToBody(true);
        return this.callParent(arguments);
    },

    // private override
    startDrag: function(x, y) {
        this.proxy.reset();
        this.proxy.hidden = false;
        this.dragging = true;
        this.proxy.update("");
        this.onInitDrag(x, y);
        this.proxy.show();
    },

    // private
    onInitDrag: function(x, y) {
        var clone = this.el.dom.cloneNode(true);
        clone.id = Ext.id(); // prevent duplicate ids
        this.proxy.update(clone);
        this.onStartDrag(x, y);
        return true;
    },

    /**
     * Returns the drag source's underlying {@link Ext.dd.StatusProxy}
     * @return {Ext.dd.StatusProxy} proxy The StatusProxy
     */
    getProxy: function() {
        return this.proxy;
    },

    /**
     * Hides the drag source's {@link Ext.dd.StatusProxy}
     */
    hideProxy: function() {
        this.proxy.hide();
        this.proxy.reset(true);
        this.dragging = false;
    },

    // private
    triggerCacheRefresh: function() {
        Ext.dd.DDM.refreshCache(this.groups);
    },

    // private - override to prevent hiding
    b4EndDrag: function(e) {
    },

    // private - override to prevent moving
    endDrag : function(e){
        this.onEndDrag(this.dragData, e);
    },

    // private
    onEndDrag : function(data, e){
    },

    // private - pin to cursor
    autoOffset : function(x, y) {
        this.setDelta(-12, -20);
    },

    destroy: function(){
        this.callParent();
        Ext.destroy(this.proxy);
    }
});


/**
 * This class provides a container DD instance that allows dragging of multiple child source nodes.
 *
 * This class does not move the drag target nodes, but a proxy element which may contain any DOM structure you wish. The
 * DOM element to show in the proxy is provided by either a provided implementation of {@link #getDragData}, or by
 * registered draggables registered with {@link Ext.dd.Registry}
 *
 * If you wish to provide draggability for an arbitrary number of DOM nodes, each of which represent some application
 * object (For example nodes in a {@link Ext.view.View DataView}) then use of this class is the most efficient way to
 * "activate" those nodes.
 *
 * By default, this class requires that draggable child nodes are registered with {@link Ext.dd.Registry}. However a
 * simpler way to allow a DragZone to manage any number of draggable elements is to configure the DragZone with an
 * implementation of the {@link #getDragData} method which interrogates the passed mouse event to see if it has taken
 * place within an element, or class of elements. This is easily done by using the event's {@link
 * Ext.EventObject#getTarget getTarget} method to identify a node based on a {@link Ext.DomQuery} selector. For example,
 * to make the nodes of a DataView draggable, use the following technique. Knowledge of the use of the DataView is
 * required:
 *
 *     myDataView.on('render', function(v) {
 *         myDataView.dragZone = new Ext.dd.DragZone(v.getEl(), {
 *
 *     //      On receipt of a mousedown event, see if it is within a DataView node.
 *     //      Return a drag data object if so.
 *             getDragData: function(e) {
 *
 *     //          Use the DataView's own itemSelector (a mandatory property) to
 *     //          test if the mousedown is within one of the DataView's nodes.
 *                 var sourceEl = e.getTarget(v.itemSelector, 10);
 *
 *     //          If the mousedown is within a DataView node, clone the node to produce
 *     //          a ddel element for use by the drag proxy. Also add application data
 *     //          to the returned data object.
 *                 if (sourceEl) {
 *                     d = sourceEl.cloneNode(true);
 *                     d.id = Ext.id();
 *                     return {
 *                         ddel: d,
 *                         sourceEl: sourceEl,
 *                         repairXY: Ext.fly(sourceEl).getXY(),
 *                         sourceStore: v.store,
 *                         draggedRecord: v.{@link Ext.view.View#getRecord getRecord}(sourceEl)
 *                     }
 *                 }
 *             },
 *
 *     //      Provide coordinates for the proxy to slide back to on failed drag.
 *     //      This is the original XY coordinates of the draggable element captured
 *     //      in the getDragData method.
 *             getRepairXY: function() {
 *                 return this.dragData.repairXY;
 *             }
 *         });
 *     });
 *
 * See the {@link Ext.dd.DropZone DropZone} documentation for details about building a DropZone which cooperates with
 * this DragZone.
 */
Ext.define('Ext.dd.DragZone', {
    extend: 'Ext.dd.DragSource',

    /**
     * Creates new DragZone.
     * @param {String/HTMLElement/Ext.Element} el The container element or ID of it.
     * @param {Object} config
     */
    constructor : function(el, config){
        this.callParent([el, config]);
        if (this.containerScroll) {
            Ext.dd.ScrollManager.register(this.el);
        }
    },

    /**
     * @property {Object} dragData
     * This property contains the data representing the dragged object. This data is set up by the implementation of the
     * {@link #getDragData} method. It must contain a ddel property, but can contain any other data according to the
     * application's needs.
     */

    /**
     * @cfg {Boolean} containerScroll
     * True to register this container with the Scrollmanager for auto scrolling during drag operations.
     */

    /**
     * Called when a mousedown occurs in this container. Looks in {@link Ext.dd.Registry} for a valid target to drag
     * based on the mouse down. Override this method to provide your own lookup logic (e.g. finding a child by class
     * name). Make sure your returned object has a "ddel" attribute (with an HTML Element) for other functions to work.
     * @param {Event} e The mouse down event
     * @return {Object} The dragData
     */
    getDragData : function(e){
        return Ext.dd.Registry.getHandleFromEvent(e);
    },

    /**
     * Called once drag threshold has been reached to initialize the proxy element. By default, it clones the
     * this.dragData.ddel
     * @param {Number} x The x position of the click on the dragged object
     * @param {Number} y The y position of the click on the dragged object
     * @return {Boolean} true to continue the drag, false to cancel
     * @template
     */
    onInitDrag : function(x, y){
        this.proxy.update(this.dragData.ddel.cloneNode(true));
        this.onStartDrag(x, y);
        return true;
    },

    /**
     * Called after a repair of an invalid drop. By default, highlights this.dragData.ddel
     * @template
     */
    afterRepair : function(){
        var me = this;
        if (Ext.enableFx) {
            Ext.fly(me.dragData.ddel).highlight(me.repairHighlightColor);
        }
        me.dragging = false;
    },

    /**
     * Called before a repair of an invalid drop to get the XY to animate to. By default returns the XY of
     * this.dragData.ddel
     * @param {Event} e The mouse up event
     * @return {Number[]} The xy location (e.g. `[100, 200]`)
     * @template
     */
    getRepairXY : function(e){
        return Ext.fly(this.dragData.ddel).getXY();
    },

    destroy : function(){
        this.callParent();
        if (this.containerScroll) {
            Ext.dd.ScrollManager.unregister(this.el);
        }
    }
});