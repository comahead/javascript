
/**
 * Provides indentation and folder structure markup for a Tree taking into account
 * depth and position within the tree hierarchy.
 * 
 * @private
 */
Ext.define('Ext.tree.Column', {
    extend: 'Ext.grid.column.Column',
    alias: 'widget.treecolumn',

    tdCls: Ext.baseCSSPrefix + 'grid-cell-treecolumn',
    
    treePrefix: Ext.baseCSSPrefix + 'tree-',
    elbowPrefix: Ext.baseCSSPrefix + 'tree-elbow-',
    expanderCls: Ext.baseCSSPrefix + 'tree-expander',
    imgText: '<img src="{1}" class="{0}" />',
    checkboxText: '<input type="button" role="checkbox" class="{0}" {1} />',

    initComponent: function() {
        var me = this;
        
        me.origRenderer = me.renderer || me.defaultRenderer;
        me.origScope = me.scope || window;

        me.renderer = me.treeRenderer;
        me.scope = me;
        
        me.callParent();
    },
    
    treeRenderer: function(value, metaData, record, rowIdx, colIdx, store, view){
        var me = this,
            buf = [],
            format = Ext.String.format,
            depth = record.getDepth(),
            treePrefix  = me.treePrefix,
            elbowPrefix = me.elbowPrefix,
            expanderCls = me.expanderCls,
            imgText     = me.imgText,
            checkboxText= me.checkboxText,
            formattedValue = me.origRenderer.apply(me.origScope, arguments),
            blank = Ext.BLANK_IMAGE_URL,
            href = record.get('href'),
            target = record.get('hrefTarget'),
            cls = record.get('cls');

        while (record) {
            if (!record.isRoot() || (record.isRoot() && view.rootVisible)) {
                if (record.getDepth() === depth) {
                    buf.unshift(format(imgText,
                        treePrefix + 'icon ' + 
                        treePrefix + 'icon' + (record.get('icon') ? '-inline ' : (record.isLeaf() ? '-leaf ' : '-parent ')) +
                        (record.get('iconCls') || ''),
                        record.get('icon') || blank
                    ));
                    if (record.get('checked') !== null) {
                        buf.unshift(format(
                            checkboxText,
                            (treePrefix + 'checkbox') + (record.get('checked') ? ' ' + treePrefix + 'checkbox-checked' : ''),
                            record.get('checked') ? 'aria-checked="true"' : ''
                        ));
                        if (record.get('checked')) {
                            metaData.tdCls += (' ' + treePrefix + 'checked');
                        }
                    }
                    if (record.isLast()) {
                        if (record.isExpandable()) {
                            buf.unshift(format(imgText, (elbowPrefix + 'end-plus ' + expanderCls), blank));
                        } else {
                            buf.unshift(format(imgText, (elbowPrefix + 'end'), blank));
                        }
                            
                    } else {
                        if (record.isExpandable()) {
                            buf.unshift(format(imgText, (elbowPrefix + 'plus ' + expanderCls), blank));
                        } else {
                            buf.unshift(format(imgText, (treePrefix + 'elbow'), blank));
                        }
                    }
                } else {
                    if (record.isLast() || record.getDepth() === 0) {
                        buf.unshift(format(imgText, (elbowPrefix + 'empty'), blank));
                    } else if (record.getDepth() !== 0) {
                        buf.unshift(format(imgText, (elbowPrefix + 'line'), blank));
                    }                      
                }
            }
            record = record.parentNode;
        }
        if (href) {
            buf.push('<a href="', href, '" target="', target, '">', formattedValue, '</a>');
        } else {
            buf.push(formattedValue);
        }
        if (cls) {
            metaData.tdCls += ' ' + cls;
        }
        return buf.join('');
    },

    defaultRenderer: function(value) {
        return value;
    }
});
/**
 * @private
 */
Ext.define('Ext.tree.ViewDragZone', {
    extend: 'Ext.view.DragZone',

    isPreventDrag: function(e, record) {
        return (record.get('allowDrag') === false) || !!e.getTarget(this.view.expanderSelector);
    },
    
    afterRepair: function() {
        var me = this,
            view = me.view,
            selectedRowCls = view.selectedItemCls,
            records = me.dragData.records,
            r,
            rLen    = records.length,
            fly = Ext.fly,
            item;
        
        if (Ext.enableFx && me.repairHighlight) {
            // Roll through all records and highlight all the ones we attempted to drag.
            for (r = 0; r < rLen; r++) {
                // anonymous fns below, don't hoist up unless below is wrapped in
                // a self-executing function passing in item.
                item = view.getNode(records[r]);

                // We must remove the selected row class before animating, because
                // the selected row class declares !important on its background-color.
                fly(item.firstChild).highlight(me.repairHighlightColor, {
                    listeners: {
                        beforeanimate: function() {
                            if (view.isSelected(item)) {
                                fly(item).removeCls(selectedRowCls);
                            }
                        },
                        afteranimate: function() {
                            if (view.isSelected(item)) {
                                fly(item).addCls(selectedRowCls);
                            }
                        }
                    }
                });
            }

        }
        me.dragging = false;
    }
});



/**
 * @private
 */
Ext.define('Ext.tree.ViewDropZone', {
    extend: 'Ext.view.DropZone',

    /**
     * @cfg {Boolean} allowParentInsert
     * Allow inserting a dragged node between an expanded parent node and its first child that will become a
     * sibling of the parent when dropped.
     */
    allowParentInserts: false,
 
    /**
     * @cfg {String} allowContainerDrop
     * True if drops on the tree container (outside of a specific tree node) are allowed.
     */
    allowContainerDrops: false,

    /**
     * @cfg {String} appendOnly
     * True if the tree should only allow append drops (use for trees which are sorted).
     */
    appendOnly: false,

    /**
     * @cfg {String} expandDelay
     * The delay in milliseconds to wait before expanding a target tree node while dragging a droppable node
     * over the target.
     */
    expandDelay : 500,

    indicatorCls: Ext.baseCSSPrefix + 'tree-ddindicator',

    // private
    expandNode : function(node) {
        var view = this.view;
        if (!node.isLeaf() && !node.isExpanded()) {
            view.expand(node);
            this.expandProcId = false;
        }
    },

    // private
    queueExpand : function(node) {
        this.expandProcId = Ext.Function.defer(this.expandNode, this.expandDelay, this, [node]);
    },

    // private
    cancelExpand : function() {
        if (this.expandProcId) {
            clearTimeout(this.expandProcId);
            this.expandProcId = false;
        }
    },

    getPosition: function(e, node) {
        var view = this.view,
            record = view.getRecord(node),
            y = e.getPageY(),
            noAppend = record.isLeaf(),
            noBelow = false,
            region = Ext.fly(node).getRegion(),
            fragment;

        // If we are dragging on top of the root node of the tree, we always want to append.
        if (record.isRoot()) {
            return 'append';
        }

        // Return 'append' if the node we are dragging on top of is not a leaf else return false.
        if (this.appendOnly) {
            return noAppend ? false : 'append';
        }

        if (!this.allowParentInsert) {
            noBelow = record.hasChildNodes() && record.isExpanded();
        }

        fragment = (region.bottom - region.top) / (noAppend ? 2 : 3);
        if (y >= region.top && y < (region.top + fragment)) {
            return 'before';
        }
        else if (!noBelow && (noAppend || (y >= (region.bottom - fragment) && y <= region.bottom))) {
            return 'after';
        }
        else {
            return 'append';
        }
    },

    isValidDropPoint : function(node, position, dragZone, e, data) {
        if (!node || !data.item) {
            return false;
        }

        var view = this.view,
            targetNode = view.getRecord(node),
            draggedRecords = data.records,
            dataLength = draggedRecords.length,
            ln = draggedRecords.length,
            i, record;

        // No drop position, or dragged records: invalid drop point
        if (!(targetNode && position && dataLength)) {
            return false;
        }

        // If the targetNode is within the folder we are dragging
        for (i = 0; i < ln; i++) {
            record = draggedRecords[i];
            if (record.isNode && record.contains(targetNode)) {
                return false;
            }
        }
        
        // Respect the allowDrop field on Tree nodes
        if (position === 'append' && targetNode.get('allowDrop') === false) {
            return false;
        }
        else if (position != 'append' && targetNode.parentNode.get('allowDrop') === false) {
            return false;
        }

        // If the target record is in the dragged dataset, then invalid drop
        if (Ext.Array.contains(draggedRecords, targetNode)) {
             return false;
        }

        // @TODO: fire some event to notify that there is a valid drop possible for the node you're dragging
        // Yes: this.fireViewEvent(blah....) fires an event through the owning View.
        return true;
    },

    onNodeOver : function(node, dragZone, e, data) {
        var position = this.getPosition(e, node),
            returnCls = this.dropNotAllowed,
            view = this.view,
            targetNode = view.getRecord(node),
            indicator = this.getIndicator(),
            indicatorX = 0,
            indicatorY = 0;

        // auto node expand check
        this.cancelExpand();
        if (position == 'append' && !this.expandProcId && !Ext.Array.contains(data.records, targetNode) && !targetNode.isLeaf() && !targetNode.isExpanded()) {
            this.queueExpand(targetNode);
        }
            
            
        if (this.isValidDropPoint(node, position, dragZone, e, data)) {
            this.valid = true;
            this.currentPosition = position;
            this.overRecord = targetNode;

            indicator.setWidth(Ext.fly(node).getWidth());
            indicatorY = Ext.fly(node).getY() - Ext.fly(view.el).getY() - 1;

            /*
             * In the code below we show the proxy again. The reason for doing this is showing the indicator will
             * call toFront, causing it to get a new z-index which can sometimes push the proxy behind it. We always 
             * want the proxy to be above, so calling show on the proxy will call toFront and bring it forward.
             */
            if (position == 'before') {
                returnCls = targetNode.isFirst() ? Ext.baseCSSPrefix + 'tree-drop-ok-above' : Ext.baseCSSPrefix + 'tree-drop-ok-between';
                indicator.showAt(0, indicatorY);
                dragZone.proxy.show();
            } else if (position == 'after') {
                returnCls = targetNode.isLast() ? Ext.baseCSSPrefix + 'tree-drop-ok-below' : Ext.baseCSSPrefix + 'tree-drop-ok-between';
                indicatorY += Ext.fly(node).getHeight();
                indicator.showAt(0, indicatorY);
                dragZone.proxy.show();
            } else {
                returnCls = Ext.baseCSSPrefix + 'tree-drop-ok-append';
                // @TODO: set a class on the parent folder node to be able to style it
                indicator.hide();
            }
        } else {
            this.valid = false;
        }

        this.currentCls = returnCls;
        return returnCls;
    },

    onContainerOver : function(dd, e, data) {
        return e.getTarget('.' + this.indicatorCls) ? this.currentCls : this.dropNotAllowed;
    },
    
    notifyOut: function() {
        this.callParent(arguments);
        this.cancelExpand();
    },

    handleNodeDrop : function(data, targetNode, position) {
        var me = this,
            view = me.view,
            parentNode = targetNode.parentNode,
            store = view.getStore(),
            recordDomNodes = [],
            records, i, len,
            insertionMethod, argList,
            needTargetExpand,
            transferData,
            processDrop;

        // If the copy flag is set, create a copy of the Models with the same IDs
        if (data.copy) {
            records = data.records;
            data.records = [];
            for (i = 0, len = records.length; i < len; i++) {
                data.records.push(Ext.apply({}, records[i].data));
            }
        }

        // Cancel any pending expand operation
        me.cancelExpand();

        // Grab a reference to the correct node insertion method.
        // Create an arg list array intended for the apply method of the
        // chosen node insertion method.
        // Ensure the target object for the method is referenced by 'targetNode'
        if (position == 'before') {
            insertionMethod = parentNode.insertBefore;
            argList = [null, targetNode];
            targetNode = parentNode;
        }
        else if (position == 'after') {
            if (targetNode.nextSibling) {
                insertionMethod = parentNode.insertBefore;
                argList = [null, targetNode.nextSibling];
            }
            else {
                insertionMethod = parentNode.appendChild;
                argList = [null];
            }
            targetNode = parentNode;
        }
        else {
            if (!targetNode.isExpanded()) {
                needTargetExpand = true;
            }
            insertionMethod = targetNode.appendChild;
            argList = [null];
        }

        // A function to transfer the data into the destination tree
        transferData = function() {
            var node,
                r, rLen, color, n;
            for (i = 0, len = data.records.length; i < len; i++) {
                argList[0] = data.records[i];
                node = insertionMethod.apply(targetNode, argList);
                
                if (Ext.enableFx && me.dropHighlight) {
                    recordDomNodes.push(view.getNode(node));
                }
            }
            
            // Kick off highlights after everything's been inserted, so they are
            // more in sync without insertion/render overhead.
            if (Ext.enableFx && me.dropHighlight) {
                //FIXME: the check for n.firstChild is not a great solution here. Ideally the line should simply read 
                //Ext.fly(n.firstChild) but this yields errors in IE6 and 7. See ticket EXTJSIV-1705 for more details
                rLen  = recordDomNodes.length;
                color = me.dropHighlightColor;

                for (r = 0; r < rLen; r++) {
                    n = recordDomNodes[r];

                    if (n) {
                        Ext.fly(n.firstChild ? n.firstChild : n).highlight(color);
                    }
                }
            }
        };

        // If dropping right on an unexpanded node, transfer the data after it is expanded.
        if (needTargetExpand) {
            targetNode.expand(false, transferData);
        }
        // Otherwise, call the data transfer function immediately
        else {
            transferData();
        }
    }
});


/**
 * Used as a view by {@link Ext.tree.Panel TreePanel}.
 */
Ext.define('Ext.tree.View', {
    extend: 'Ext.view.Table',
    alias: 'widget.treeview',

    requires: [
        'Ext.data.NodeStore'
    ],

    loadingCls: Ext.baseCSSPrefix + 'grid-tree-loading',
    expandedCls: Ext.baseCSSPrefix + 'grid-tree-node-expanded',
    leafCls: Ext.baseCSSPrefix + 'grid-tree-node-leaf',

    expanderSelector: '.' + Ext.baseCSSPrefix + 'tree-expander',
    checkboxSelector: '.' + Ext.baseCSSPrefix + 'tree-checkbox',
    expanderIconOverCls: Ext.baseCSSPrefix + 'tree-expander-over',

    // Class to add to the node wrap element used to hold nodes when a parent is being
    // collapsed or expanded. During the animation, UI interaction is forbidden by testing
    // for an ancestor node with this class.
    nodeAnimWrapCls: Ext.baseCSSPrefix + 'tree-animator-wrap',

    blockRefresh: true,
    
    /**
     * @cfg
     * @inheritdoc
     */
    loadMask: false,

    /** 
     * @cfg {Boolean} rootVisible
     * False to hide the root node.
     */
    rootVisible: true,

    /**
     * @cfg {Boolean} deferInitialRefresh
     * Must be false for Tree Views because the root node must be rendered in order to be updated with its child nodes.
     */
    deferInitialRefresh: false,

    /** 
     * @cfg {Boolean} animate
     * True to enable animated expand/collapse (defaults to the value of {@link Ext#enableFx Ext.enableFx})
     */

    expandDuration: 250,
    collapseDuration: 250,

    toggleOnDblClick: true,

    stripeRows: false,

    // fields that will trigger a change in the ui that aren't likely to be bound to a column
    uiFields: ['expanded', 'loaded', 'checked', 'expandable', 'leaf', 'icon', 'iconCls', 'loading', 'qtip', 'qtitle'],

    initComponent: function() {
        var me = this,
            treeStore = me.panel.getStore();

        if (me.initialConfig.animate === undefined) {
            me.animate = Ext.enableFx;
        }

        me.store = new Ext.data.NodeStore({
            treeStore: treeStore,
            recursive: true,
            rootVisible: me.rootVisible,
            listeners: {
                beforeexpand: me.onBeforeExpand,
                expand: me.onExpand,
                beforecollapse: me.onBeforeCollapse,
                collapse: me.onCollapse,
                write: me.onStoreWrite,
                datachanged: me.onStoreDataChanged,
                scope: me
            }
        });

        if (me.node) {
            me.setRootNode(me.node);
        }
        me.animQueue = {};
        me.animWraps = {};
        me.addEvents(
            /**
             * @event afteritemexpand
             * Fires after an item has been visually expanded and is visible in the tree. 
             * @param {Ext.data.NodeInterface} node         The node that was expanded
             * @param {Number} index                        The index of the node
             * @param {HTMLElement} item                    The HTML element for the node that was expanded
             */
            'afteritemexpand',
            /**
             * @event afteritemcollapse
             * Fires after an item has been visually collapsed and is no longer visible in the tree. 
             * @param {Ext.data.NodeInterface} node         The node that was collapsed
             * @param {Number} index                        The index of the node
             * @param {HTMLElement} item                    The HTML element for the node that was collapsed
             */
            'afteritemcollapse'
        );
        me.callParent(arguments);
        me.on({
            element: 'el',
            scope: me,
            delegate: me.expanderSelector,
            mouseover: me.onExpanderMouseOver,
            mouseout: me.onExpanderMouseOut
        });
        me.on({
            element: 'el',
            scope: me,
            delegate: me.checkboxSelector,
            click: me.onCheckboxChange
        });
    },
    
    getMaskStore: function(){
        return this.panel.getStore();    
    },

    afterComponentLayout: function(){
        this.callParent(arguments);
        var stretcher = this.stretcher;
        if (stretcher) {
            stretcher.setWidth((this.getWidth() - Ext.getScrollbarSize().width));
        }
    },

    processUIEvent: function(e) {
        // If the clicked node is part of an animation, ignore the click.
        // This is because during a collapse animation, the associated Records
        // will already have been removed from the Store, and the event is not processable.
        if (e.getTarget('.' + this.nodeAnimWrapCls, this.el)) {
            return false;
        }
        return this.callParent(arguments);
    },

    onClear: function(){
        this.store.removeAll();    
    },

    setRootNode: function(node) {
        var me = this;        
        me.store.setNode(node);
        me.node = node;
    },

    onCheckboxChange: function(e, t) {
        var me = this,
            item = e.getTarget(me.getItemSelector(), me.getTargetEl());

        if (item) {
            me.onCheckChange(me.getRecord(item));
        }
    },

    onCheckChange: function(record){
        var checked = record.get('checked');
        if (Ext.isBoolean(checked)) {
            checked = !checked;
            record.set('checked', checked);
            this.fireEvent('checkchange', record, checked);
        }
    },

    getChecked: function() {
        var checked = [];
        this.node.cascadeBy(function(rec){
            if (rec.get('checked')) {
                checked.push(rec);
            }
        });
        return checked;
    },

    isItemChecked: function(rec){
        return rec.get('checked');
    },

    /**
     * @private
     */
    createAnimWrap: function(record, index) {
        var thHtml = '',
            headerCt = this.panel.headerCt,
            headers = headerCt.getGridColumns(),
            i = 0, len = headers.length, item,
            node = this.getNode(record),
            tmpEl, nodeEl;

        for (; i < len; i++) {
            item = headers[i];
            thHtml += '<th style="width: ' + (item.hidden ? 0 : item.getDesiredWidth()) + 'px; height: 0px;"></th>';
        }

        nodeEl = Ext.get(node);        
        tmpEl = nodeEl.insertSibling({
            tag: 'tr',
            html: [
                '<td colspan="' + headerCt.getColumnCount() + '">',
                    '<div class="' + this.nodeAnimWrapCls + '">',
                        '<table class="' + Ext.baseCSSPrefix + 'grid-table" style="width: ' + headerCt.getFullWidth() + 'px;"><tbody>',
                            thHtml,
                        '</tbody></table>',
                    '</div>',
                '</td>'
            ].join('')
        }, 'after');

        return {
            record: record,
            node: node,
            el: tmpEl,
            expanding: false,
            collapsing: false,
            animating: false,
            animateEl: tmpEl.down('div'),
            targetEl: tmpEl.down('tbody')
        };
    },

    /**
     * @private
     * Returns the animation wrapper element for the specified parent node, used to wrap the child nodes as
     * they slide up or down during expand/collapse.
     * 
     * @param parent The parent node to be expanded or collapsed
     * 
     * @param [bubble=true] If the passed parent node does not already have a wrap element created, by default
     * this function will bubble up to each parent node looking for a valid wrap element to reuse, returning 
     * the first one it finds. This is the appropriate behavior, e.g., for the collapse direction, so that the
     * entire expanded set of branch nodes can collapse as a single unit.
     * 
     * However for expanding each parent node should instead always create its own animation wrap if one 
     * doesn't exist, so that its children can expand independently of any other nodes -- this is crucial 
     * when executing the "expand all" behavior. If multiple nodes attempt to reuse the same ancestor wrap
     * element concurrently during expansion it will lead to problems as the first animation to complete will
     * delete the wrap el out from under other running animations. For that reason, when expanding you should
     * always pass `bubble: false` to be on the safe side.
     * 
     * If the passed parent has no wrap (or there is no valid ancestor wrap after bubbling), this function 
     * will return null and the calling code should then call {@link #createAnimWrap} if needed.
     * 
     * @return {Ext.Element} The wrapping element as created in {@link #createAnimWrap}, or null
     */
    getAnimWrap: function(parent, bubble) {
        if (!this.animate) {
            return null;
        }

        var wraps = this.animWraps,
            wrap = wraps[parent.internalId];

        if (bubble !== false) {
            while (!wrap && parent) {
                parent = parent.parentNode;
                if (parent) {
                    wrap = wraps[parent.internalId];
                }
            }
        }
        return wrap;
    },

    doAdd: function(nodes, records, index) {
        // If we are adding records which have a parent that is currently expanding
        // lets add them to the animation wrap
        var me = this,
            record = records[0],
            parent = record.parentNode,
            a = me.all.elements,
            relativeIndex = 0,
            animWrap = me.getAnimWrap(parent),
            targetEl, children, len;

        if (!animWrap || !animWrap.expanding) {
            return me.callParent(arguments);
        }

        // We need the parent that has the animWrap, not the nodes parent
        parent = animWrap.record;

        // If there is an anim wrap we do our special magic logic
        targetEl = animWrap.targetEl;
        children = targetEl.dom.childNodes;

        // We subtract 1 from the childrens length because we have a tr in there with the th'es
        len = children.length - 1;

        // The relative index is the index in the full flat collection minus the index of the wraps parent
        relativeIndex = index - me.indexOf(parent) - 1;

        // If we are adding records to the wrap that have a higher relative index then there are currently children
        // it means we have to append the nodes to the wrap
        if (!len || relativeIndex >= len) {
            targetEl.appendChild(nodes);
        }
        // If there are already more children then the relative index it means we are adding child nodes of
        // some expanded node in the anim wrap. In this case we have to insert the nodes in the right location
        else {
            // +1 because of the tr with th'es that is already there
            Ext.fly(children[relativeIndex + 1]).insertSibling(nodes, 'before', true);
        }

        // We also have to update the CompositeElementLite collection of the DataView
        Ext.Array.insert(a, index, nodes);

        // If we were in an animation we need to now change the animation
        // because the targetEl just got higher.
        if (animWrap.isAnimating) {
            me.onExpand(parent);
        }
    },

    beginBulkUpdate: function(){
        this.bulkUpdate = true;  
    },

    endBulkUpdate: function(){
        this.bulkUpdate = false;
    },

    onRemove : function(ds, record, index) {
        var me = this,
            bulk = me.bulkUpdate;
            
        if (me.viewReady) {
            me.doRemove(record, index);
            if (!bulk) {
                me.updateIndexes(index);
            }
            if (me.store.getCount() === 0){
                me.refresh();
            }
            if (!bulk) {
                me.fireEvent('itemremove', record, index);
            }
        }
    },

    doRemove: function(record, index) {
        // If we are adding records which have a parent that is currently expanding
        // lets add them to the animation wrap
        var me = this,
            all = me.all,
            animWrap = me.getAnimWrap(record),
            item = all.item(index),
            node = item ? item.dom : null;

        if (!node || !animWrap || !animWrap.collapsing) {
            return me.callParent(arguments);
        }

        animWrap.targetEl.appendChild(node);
        all.removeElement(index);
    },

    onBeforeExpand: function(parent, records, index) {
        var me = this,
            animWrap;

        if (!me.rendered || !me.animate) {
            return;
        }

        if (me.getNode(parent)) {
            animWrap = me.getAnimWrap(parent, false);
            if (!animWrap) {
                animWrap = me.animWraps[parent.internalId] = me.createAnimWrap(parent);
                animWrap.animateEl.setHeight(0);
            }
            else if (animWrap.collapsing) {
                // If we expand this node while it is still expanding then we
                // have to remove the nodes from the animWrap.
                animWrap.targetEl.select(me.itemSelector).remove();
            } 
            animWrap.expanding = true;
            animWrap.collapsing = false;
        }
    },

    onExpand: function(parent) {
        var me = this,
            queue = me.animQueue,
            id = parent.getId(),
            node = me.getNode(parent),
            index = node ? me.indexOf(node) : -1,
            animWrap,
            animateEl, 
            targetEl;        

        if (me.singleExpand) {
            me.ensureSingleExpand(parent);
        }

        // The item is not visible yet
        if (index === -1) {
            return;
        }

        animWrap = me.getAnimWrap(parent, false);

        if (!animWrap) {
            me.isExpandingOrCollapsing = false;
            me.fireEvent('afteritemexpand', parent, index, node);
            return;
        }

        animateEl = animWrap.animateEl;
        targetEl = animWrap.targetEl;

        animateEl.stopAnimation();
        // @TODO: we are setting it to 1 because quirks mode on IE seems to have issues with 0
        queue[id] = true;
        animateEl.slideIn('t', {
            duration: me.expandDuration,
            listeners: {
                scope: me,
                lastframe: function() {
                    // Move all the nodes out of the anim wrap to their proper location
                    animWrap.el.insertSibling(targetEl.query(me.itemSelector), 'before');
                    animWrap.el.remove();
                    me.refreshSize();
                    delete me.animWraps[animWrap.record.internalId];
                    delete queue[id];
                }
            },
            callback: function() {
                me.isExpandingOrCollapsing = false;
                me.fireEvent('afteritemexpand', parent, index, node);
            }
        });

        animWrap.isAnimating = true;
    },

    onBeforeCollapse: function(parent, records, index) {
        var me = this,
            animWrap;

        if (!me.rendered || !me.animate) {
            return;
        }

        if (me.getNode(parent)) {
            animWrap = me.getAnimWrap(parent);
            if (!animWrap) {
                animWrap = me.animWraps[parent.internalId] = me.createAnimWrap(parent, index);
            }
            else if (animWrap.expanding) {
                // If we collapse this node while it is still expanding then we
                // have to remove the nodes from the animWrap.
                animWrap.targetEl.select(this.itemSelector).remove();
            }
            animWrap.expanding = false;
            animWrap.collapsing = true;
        }
    },

    onCollapse: function(parent) {
        var me = this,
            queue = me.animQueue,
            id = parent.getId(),
            node = me.getNode(parent),
            index = node ? me.indexOf(node) : -1,
            animWrap = me.getAnimWrap(parent),
            animateEl, targetEl;

        // The item has already been removed by a parent node
        if (index === -1) {
            return;
        }

        if (!animWrap) {
            me.isExpandingOrCollapsing = false;
            me.fireEvent('afteritemcollapse', parent, index, node);
            return;
        }

        animateEl = animWrap.animateEl;
        targetEl = animWrap.targetEl;

        queue[id] = true;

        // @TODO: we are setting it to 1 because quirks mode on IE seems to have issues with 0
        animateEl.stopAnimation();
        animateEl.slideOut('t', {
            duration: me.collapseDuration,
            listeners: {
                scope: me,
                lastframe: function() {
                    animWrap.el.remove();
                    me.refreshSize();
                    delete me.animWraps[animWrap.record.internalId];
                    delete queue[id];
                }             
            },
            callback: function() {
                me.isExpandingOrCollapsing = false;
                me.fireEvent('afteritemcollapse', parent, index, node);
            }
        });
        animWrap.isAnimating = true;
    },

    /**
     * Checks if a node is currently undergoing animation
     * @private
     * @param {Ext.data.Model} node The node
     * @return {Boolean} True if the node is animating
     */
    isAnimating: function(node) {
        return !!this.animQueue[node.getId()];    
    },

    collectData: function(records) {
        var data = this.callParent(arguments),
            rows = data.rows,
            len = rows.length,
            i = 0,
            row, record;

        for (; i < len; i++) {
            row = rows[i];
            record = records[i];
            if (record.get('qtip')) {
                row.rowAttr = 'data-qtip="' + record.get('qtip') + '"';
                if (record.get('qtitle')) {
                    row.rowAttr += ' ' + 'data-qtitle="' + record.get('qtitle') + '"';
                }
            }
            if (record.isExpanded()) {
                row.rowCls = (row.rowCls || '') + ' ' + this.expandedCls;
            }
            if (record.isLeaf()) {
                row.rowCls = (row.rowCls || '') + ' ' + this.leafCls;
            }
            if (record.isLoading()) {
                row.rowCls = (row.rowCls || '') + ' ' + this.loadingCls;
            }
        }

        return data;
    },

    /**
     * Expands a record that is loaded in the view.
     * @param {Ext.data.Model} record The record to expand
     * @param {Boolean} [deep] True to expand nodes all the way down the tree hierarchy.
     * @param {Function} [callback] The function to run after the expand is completed
     * @param {Object} [scope] The scope of the callback function.
     */
    expand: function(record, deep, callback, scope) {
        return record.expand(deep, callback, scope);
    },

    /**
     * Collapses a record that is loaded in the view.
     * @param {Ext.data.Model} record The record to collapse
     * @param {Boolean} [deep] True to collapse nodes all the way up the tree hierarchy.
     * @param {Function} [callback] The function to run after the collapse is completed
     * @param {Object} [scope] The scope of the callback function.
     */
    collapse: function(record, deep, callback, scope) {
        return record.collapse(deep, callback, scope);
    },

    /**
     * Toggles a record between expanded and collapsed.
     * @param {Ext.data.Model} record
     * @param {Boolean} [deep] True to collapse nodes all the way up the tree hierarchy.
     * @param {Function} [callback] The function to run after the expand/collapse is completed
     * @param {Object} [scope] The scope of the callback function.
     */
    toggle: function(record, deep, callback, scope) {
        var me = this,
            doAnimate = !!this.animate;

        // Block toggling if we are already animating an expand or collapse operation.
        if (!doAnimate || !this.isExpandingOrCollapsing) {
            if (!record.isLeaf()) {
                this.isExpandingOrCollapsing = doAnimate;
            }
            if (record.isExpanded()) {
                me.collapse(record, deep, callback, scope);
            } else {
                me.expand(record, deep, callback, scope);
            }
        }
    },

    onItemDblClick: function(record, item, index) {
        var me = this,
            editingPlugin = me.editingPlugin;
            
        me.callParent(arguments);
        if (me.toggleOnDblClick && record.isExpandable() && !(editingPlugin && editingPlugin.clicksToEdit === 2)) {
            me.toggle(record);
        }
    },

    onBeforeItemMouseDown: function(record, item, index, e) {
        if (e.getTarget(this.expanderSelector, item)) {
            return false;
        }
        return this.callParent(arguments);
    },

    onItemClick: function(record, item, index, e) {
        if (e.getTarget(this.expanderSelector, item) && record.isExpandable()) {
            this.toggle(record, e.ctrlKey);
            return false;
        }
        return this.callParent(arguments);
    },

    onExpanderMouseOver: function(e, t) {
        e.getTarget(this.cellSelector, 10, true).addCls(this.expanderIconOverCls);
    },

    onExpanderMouseOut: function(e, t) {
        e.getTarget(this.cellSelector, 10, true).removeCls(this.expanderIconOverCls);
    },

    /**
     * Gets the base TreeStore from the bound TreePanel.
     */
    getTreeStore: function() {
        return this.panel.store;
    },    

    ensureSingleExpand: function(node) {
        var parent = node.parentNode;
        if (parent) {
            parent.eachChild(function(child) {
                if (child !== node && child.isExpanded()) {
                    child.collapse();
                }
            });
        }
    },

    shouldUpdateCell: function(column, changedFieldNames){
        if (changedFieldNames) {
            var i = 0,
                len = changedFieldNames.length;
                
            for (; i < len; ++i) {
                if (Ext.Array.contains(this.uiFields, changedFieldNames[i])) {
                    return true;
                }
            }
        }
        return this.callParent(arguments);
    },

    /**
     * Re-fires the NodeStore's "write" event as a TreeStore event
     * @private
     * @param {Ext.data.NodeStore} store
     * @param {Ext.data.Operation} operation
     */
    onStoreWrite: function(store, operation) {
        var treeStore = this.panel.store;
        treeStore.fireEvent('write', treeStore, operation);
    },

    /**
     * Re-fires the NodeStore's "datachanged" event as a TreeStore event
     * @private
     * @param {Ext.data.NodeStore} store
     * @param {Ext.data.Operation} operation
     */
    onStoreDataChanged: function(store, operation) {
        var treeStore = this.panel.store;
        treeStore.fireEvent('datachanged', treeStore);
    }
});

/**
 * The TreePanel provides tree-structured UI representation of tree-structured data.
 * A TreePanel must be bound to a {@link Ext.data.TreeStore}. TreePanel's support
 * multiple columns through the {@link #columns} configuration.
 *
 * Simple TreePanel using inline data:
 *
 *     @example
 *     var store = Ext.create('Ext.data.TreeStore', {
 *         root: {
 *             expanded: true,
 *             children: [
 *                 { text: "detention", leaf: true },
 *                 { text: "homework", expanded: true, children: [
 *                     { text: "book report", leaf: true },
 *                     { text: "alegrbra", leaf: true}
 *                 ] },
 *                 { text: "buy lottery tickets", leaf: true }
 *             ]
 *         }
 *     });
 *
 *     Ext.create('Ext.tree.Panel', {
 *         title: 'Simple Tree',
 *         width: 200,
 *         height: 150,
 *         store: store,
 *         rootVisible: false,
 *         renderTo: Ext.getBody()
 *     });
 *
 * For the tree node config options (like `text`, `leaf`, `expanded`), see the documentation of
 * {@link Ext.data.NodeInterface NodeInterface} config options.
 */
Ext.define('Ext.tree.Panel', {
    extend: 'Ext.panel.Table',
    alias: 'widget.treepanel',
    alternateClassName: ['Ext.tree.TreePanel', 'Ext.TreePanel'],
    requires: ['Ext.tree.View', 'Ext.selection.TreeModel', 'Ext.tree.Column', 'Ext.data.TreeStore'],
    viewType: 'treeview',
    selType: 'treemodel',

    treeCls: Ext.baseCSSPrefix + 'tree-panel',

    deferRowRender: false,

    /**
     * @cfg {Boolean} rowLines
     * False so that rows are not separated by lines.
     */
    rowLines: false,

    /**
     * @cfg {Boolean} lines
     * False to disable tree lines.
     */
    lines: true,

    /**
     * @cfg {Boolean} useArrows
     * True to use Vista-style arrows in the tree.
     */
    useArrows: false,

    /**
     * @cfg {Boolean} singleExpand
     * True if only 1 node per branch may be expanded.
     */
    singleExpand: false,

    ddConfig: {
        enableDrag: true,
        enableDrop: true
    },

    /**
     * @cfg {Boolean} animate
     * True to enable animated expand/collapse. Defaults to the value of {@link Ext#enableFx}.
     */

    /**
     * @cfg {Boolean} rootVisible
     * False to hide the root node.
     */
    rootVisible: true,

    /**
     * @cfg {String} displayField
     * The field inside the model that will be used as the node's text.
     */
    displayField: 'text',

    /**
     * @cfg {Ext.data.Model/Ext.data.NodeInterface/Object} root
     * Allows you to not specify a store on this TreePanel. This is useful for creating a simple tree with preloaded
     * data without having to specify a TreeStore and Model. A store and model will be created and root will be passed
     * to that store. For example:
     *
     *     Ext.create('Ext.tree.Panel', {
     *         title: 'Simple Tree',
     *         root: {
     *             text: "Root node",
     *             expanded: true,
     *             children: [
     *                 { text: "Child 1", leaf: true },
     *                 { text: "Child 2", leaf: true }
     *             ]
     *         },
     *         renderTo: Ext.getBody()
     *     });
     */
    root: null,

    // Required for the Lockable Mixin. These are the configurations which will be copied to the
    // normal and locked sub tablepanels
    normalCfgCopy: ['displayField', 'root', 'singleExpand', 'useArrows', 'lines', 'rootVisible', 'scroll'],
    lockedCfgCopy: ['displayField', 'root', 'singleExpand', 'useArrows', 'lines', 'rootVisible'],
    
    isTree: true,

    /**
     * @cfg {Boolean} hideHeaders
     * True to hide the headers.
     */

    /**
     * @cfg {Boolean} folderSort
     * True to automatically prepend a leaf sorter to the store.
     */
     
    /**
     * @cfg {Ext.data.TreeStore} store (required)
     * The {@link Ext.data.TreeStore Store} the tree should use as its data source.
     */

    constructor: function(config) {
        config = config || {};
        if (config.animate === undefined) {
            config.animate = Ext.isDefined(this.animate) ? this.animate : Ext.enableFx;
        }
        this.enableAnimations = config.animate;
        delete config.animate;

        this.callParent([config]);
    },

    initComponent: function() {
        var me = this,
            cls = [me.treeCls],
            view;

        if (me.useArrows) {
            cls.push(Ext.baseCSSPrefix + 'tree-arrows');
            me.lines = false;
        }

        if (me.lines) {
            cls.push(Ext.baseCSSPrefix + 'tree-lines');
        } else if (!me.useArrows) {
            cls.push(Ext.baseCSSPrefix + 'tree-no-lines');
        }

        if (Ext.isString(me.store)) {
            me.store = Ext.StoreMgr.lookup(me.store);
        } else if (!me.store || Ext.isObject(me.store) && !me.store.isStore) {
            me.store = new Ext.data.TreeStore(Ext.apply({}, me.store || {}, {
                root: me.root,
                fields: me.fields,
                model: me.model,
                folderSort: me.folderSort
            }));
        } else if (me.root) {
            me.store = Ext.data.StoreManager.lookup(me.store);
            me.store.setRootNode(me.root);
            if (me.folderSort !== undefined) {
                me.store.folderSort = me.folderSort;
                me.store.sort();
            }
        }

        // I'm not sure if we want to this. It might be confusing
        // if (me.initialConfig.rootVisible === undefined && !me.getRootNode()) {
        //     me.rootVisible = false;
        // }

        me.viewConfig = Ext.apply({}, me.viewConfig);
        me.viewConfig = Ext.applyIf(me.viewConfig, {
            rootVisible: me.rootVisible,
            animate: me.enableAnimations,
            singleExpand: me.singleExpand,
            node: me.store.getRootNode(),
            hideHeaders: me.hideHeaders
        });

        me.mon(me.store, {
            scope: me,
            rootchange: me.onRootChange,
            clear: me.onClear
        });

        me.relayEvents(me.store, [
            /**
             * @event beforeload
             * @inheritdoc Ext.data.TreeStore#beforeload
             */
            'beforeload',

            /**
             * @event load
             * @inheritdoc Ext.data.TreeStore#load
             */
            'load'
        ]);

        me.mon(me.store, {
            /**
             * @event itemappend
             * @inheritdoc Ext.data.TreeStore#append
             */
            append: me.createRelayer('itemappend'),

            /**
             * @event itemremove
             * @inheritdoc Ext.data.TreeStore#remove
             */
            remove: me.createRelayer('itemremove'),

            /**
             * @event itemmove
             * @inheritdoc Ext.data.TreeStore#move
             */
            move: me.createRelayer('itemmove', [0, 4]),

            /**
             * @event iteminsert
             * @inheritdoc Ext.data.TreeStore#insert
             */
            insert: me.createRelayer('iteminsert'),

            /**
             * @event beforeitemappend
             * @inheritdoc Ext.data.TreeStore#beforeappend
             */
            beforeappend: me.createRelayer('beforeitemappend'),

            /**
             * @event beforeitemremove
             * @inheritdoc Ext.data.TreeStore#beforeremove
             */
            beforeremove: me.createRelayer('beforeitemremove'),

            /**
             * @event beforeitemmove
             * @inheritdoc Ext.data.TreeStore#beforemove
             */
            beforemove: me.createRelayer('beforeitemmove'),

            /**
             * @event beforeiteminsert
             * @inheritdoc Ext.data.TreeStore#beforeinsert
             */
            beforeinsert: me.createRelayer('beforeiteminsert'),

            /**
             * @event itemexpand
             * @inheritdoc Ext.data.TreeStore#expand
             */
            expand: me.createRelayer('itemexpand', [0, 1]),

            /**
             * @event itemcollapse
             * @inheritdoc Ext.data.TreeStore#collapse
             */
            collapse: me.createRelayer('itemcollapse', [0, 1]),

            /**
             * @event beforeitemexpand
             * @inheritdoc Ext.data.TreeStore#beforeexpand
             */
            beforeexpand: me.createRelayer('beforeitemexpand', [0, 1]),

            /**
             * @event beforeitemcollapse
             * @inheritdoc Ext.data.TreeStore#beforecollapse
             */
            beforecollapse: me.createRelayer('beforeitemcollapse', [0, 1])
        });

        // If the user specifies the headers collection manually then dont inject our own
        if (!me.columns) {
            if (me.initialConfig.hideHeaders === undefined) {
                me.hideHeaders = true;
            }
            me.addCls(Ext.baseCSSPrefix + 'autowidth-table');
            me.columns = [{
                xtype    : 'treecolumn',
                text     : 'Name',
                width    : Ext.isIE6 ? null : 10000,
                dataIndex: me.displayField         
            }];
        }

        if (me.cls) {
            cls.push(me.cls);
        }
        me.cls = cls.join(' ');
        me.callParent();
        
        view = me.getView();

        me.relayEvents(view, [
            /**
             * @event checkchange
             * Fires when a node with a checkbox's checked property changes
             * @param {Ext.data.NodeInterface} node The node who's checked property was changed
             * @param {Boolean} checked The node's new checked state
             */
            'checkchange',
            /**
             * @event afteritemexpand
             * @inheritdoc Ext.tree.View#afteritemexpand
             */
            'afteritemexpand',
            /**
             * @event afteritemcollapse
             * @inheritdoc Ext.tree.View#afteritemcollapse
             */
            'afteritemcollapse'
        ]);

        // If the root is not visible and there is no rootnode defined, then just lets load the store
        if (!view.rootVisible && !me.getRootNode()) {
            me.setRootNode({
                expanded: true
            });
        }
    },
    
    onClear: function(){
        this.view.onClear();
    },

    /**
     * Sets root node of this tree.
     * @param {Ext.data.Model/Ext.data.NodeInterface/Object} root
     * @return {Ext.data.NodeInterface} The new root
     */
    setRootNode: function() {
        return this.store.setRootNode.apply(this.store, arguments);
    },

    /**
     * Returns the root node for this tree.
     * @return {Ext.data.NodeInterface}
     */
    getRootNode: function() {
        return this.store.getRootNode();
    },

    onRootChange: function(root) {
        this.view.setRootNode(root);
    },

    /**
     * Retrieve an array of checked records.
     * @return {Ext.data.NodeInterface[]} An array containing the checked records
     */
    getChecked: function() {
        return this.getView().getChecked();
    },

    isItemChecked: function(rec) {
        return rec.get('checked');
    },
    
    /**
     * Expands a record that is loaded in the tree.
     * @param {Ext.data.Model} record The record to expand
     * @param {Boolean} [deep] True to expand nodes all the way down the tree hierarchy.
     * @param {Function} [callback] The function to run after the expand is completed
     * @param {Object} [scope] The scope of the callback function.
     */
    expandNode: function(record, deep, callback, scope) {
        return this.getView().expand(record, deep, callback, scope || this);
    },

    /**
     * Collapses a record that is loaded in the tree.
     * @param {Ext.data.Model} record The record to collapse
     * @param {Boolean} [deep] True to collapse nodes all the way up the tree hierarchy.
     * @param {Function} [callback] The function to run after the collapse is completed
     * @param {Object} [scope] The scope of the callback function.
     */
    collapseNode: function(record, deep, callback, scope) {
        return this.getView().collapse(record, deep, callback, scope || this);
    },

    /**
     * Expand all nodes
     * @param {Function} [callback] A function to execute when the expand finishes.
     * @param {Object} [scope] The scope of the callback function
     */
    expandAll : function(callback, scope) {
        var me = this,
            root = me.getRootNode(),
            animate = me.enableAnimations,
            view = me.getView();
        if (root) {
            if (!animate) {
                view.beginBulkUpdate();
            }
            root.expand(true, callback, scope || me);
            if (!animate) {
                view.endBulkUpdate();
            }
        }
    },

    /**
     * Collapse all nodes
     * @param {Function} [callback] A function to execute when the collapse finishes.
     * @param {Object} [scope] The scope of the callback function
     */
    collapseAll : function(callback, scope) {
        var me = this,
            root = me.getRootNode(),
            animate = me.enableAnimations,
            view = me.getView();

        if (root) {
            if (!animate) {
                view.beginBulkUpdate();
            }
            scope = scope || me;
            if (view.rootVisible) {
                root.collapse(true, callback, scope);
            } else {
                root.collapseChildren(true, callback, scope);
            }
            if (!animate) {
                view.endBulkUpdate();
            }
        }
    },

    /**
     * Expand the tree to the path of a particular node.
     * @param {String} path The path to expand. The path should include a leading separator.
     * @param {String} [field] The field to get the data from. Defaults to the model idProperty.
     * @param {String} [separator='/'] A separator to use.
     * @param {Function} [callback] A function to execute when the expand finishes. The callback will be called with
     * (success, lastNode) where success is if the expand was successful and lastNode is the last node that was expanded.
     * @param {Object} [scope] The scope of the callback function
     */
    expandPath: function(path, field, separator, callback, scope) {
        var me = this,
            current = me.getRootNode(),
            index = 1,
            view = me.getView(),
            keys,
            expander;

        field = field || me.getRootNode().idProperty;
        separator = separator || '/';

        if (Ext.isEmpty(path)) {
            Ext.callback(callback, scope || me, [false, null]);
            return;
        }

        keys = path.split(separator);
        if (current.get(field) != keys[1]) {
            // invalid root
            Ext.callback(callback, scope || me, [false, current]);
            return;
        }

        expander = function(){
            if (++index === keys.length) {
                Ext.callback(callback, scope || me, [true, current]);
                return;
            }
            var node = current.findChild(field, keys[index]);
            if (!node) {
                Ext.callback(callback, scope || me, [false, current]);
                return;
            }
            current = node;
            current.expand(false, expander);
        };
        current.expand(false, expander);
    },

    /**
     * Expand the tree to the path of a particular node, then select it.
     * @param {String} path The path to select. The path should include a leading separator.
     * @param {String} [field] The field to get the data from. Defaults to the model idProperty.
     * @param {String} [separator='/'] A separator to use.
     * @param {Function} [callback] A function to execute when the select finishes. The callback will be called with
     * (bSuccess, oLastNode) where bSuccess is if the select was successful and oLastNode is the last node that was expanded.
     * @param {Object} [scope] The scope of the callback function
     */
    selectPath: function(path, field, separator, callback, scope) {
        var me = this,
            root,
            keys,
            last;

        field = field || me.getRootNode().idProperty;
        separator = separator || '/';

        keys = path.split(separator);
        last = keys.pop();
        if (keys.length > 1) {
            me.expandPath(keys.join(separator), field, separator, function(success, node){
                var lastNode = node;
                if (success && node) {
                    node = node.findChild(field, last);
                    if (node) {
                        me.getSelectionModel().select(node);
                        Ext.callback(callback, scope || me, [true, node]);
                        return;
                    }
                }
                Ext.callback(callback, scope || me, [false, lastNode]);
            }, me);
        } else {
            root = me.getRootNode();
            if (root.getId() === last) {
                me.getSelectionModel().select(root);
                Ext.callback(callback, scope || me, [true, root]);
            } else {
                Ext.callback(callback, scope || me, [false, null]);
            }
        }
    }
});
