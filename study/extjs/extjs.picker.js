
/**
 * Color picker provides a simple color palette for choosing colors. The picker can be rendered to any container. The
 * available default to a standard 40-color palette; this can be customized with the {@link #colors} config.
 *
 * Typically you will need to implement a handler function to be notified when the user chooses a color from the picker;
 * you can register the handler using the {@link #event-select} event, or by implementing the {@link #handler} method.
 *
 *     @example
 *     Ext.create('Ext.picker.Color', {
 *         value: '993300',  // initial selected color
 *         renderTo: Ext.getBody(),
 *         listeners: {
 *             select: function(picker, selColor) {
 *                 alert(selColor);
 *             }
 *         }
 *     });
 */
Ext.define('Ext.picker.Color', {
    extend: 'Ext.Component',
    requires: 'Ext.XTemplate',
    alias: 'widget.colorpicker',
    alternateClassName: 'Ext.ColorPalette',

    /**
     * @cfg {String} [componentCls='x-color-picker']
     * The CSS class to apply to the containing element.
     */
    componentCls : Ext.baseCSSPrefix + 'color-picker',

    /**
     * @cfg {String} [selectedCls='x-color-picker-selected']
     * The CSS class to apply to the selected element
     */
    selectedCls: Ext.baseCSSPrefix + 'color-picker-selected',

    /**
     * @cfg {String} value
     * The initial color to highlight (should be a valid 6-digit color hex code without the # symbol). Note that the hex
     * codes are case-sensitive.
     */
    value : null,

    /**
     * @cfg {String} clickEvent
     * The DOM event that will cause a color to be selected. This can be any valid event name (dblclick, contextmenu).
     */
    clickEvent :'click',

    /**
     * @cfg {Boolean} allowReselect
     * If set to true then reselecting a color that is already selected fires the {@link #event-select} event
     */
    allowReselect : false,

    /**
     * @property {String[]} colors
     * An array of 6-digit color hex code strings (without the # symbol). This array can contain any number of colors,
     * and each hex code should be unique. The width of the picker is controlled via CSS by adjusting the width property
     * of the 'x-color-picker' class (or assigning a custom class), so you can balance the number of colors with the
     * width setting until the box is symmetrical.
     *
     * You can override individual colors if needed:
     *
     *     var cp = new Ext.picker.Color();
     *     cp.colors[0] = 'FF0000';  // change the first box to red
     *
     * Or you can provide a custom array of your own for complete control:
     *
     *     var cp = new Ext.picker.Color();
     *     cp.colors = ['000000', '993300', '333300'];
     */
    colors : [
        '000000', '993300', '333300', '003300', '003366', '000080', '333399', '333333',
        '800000', 'FF6600', '808000', '008000', '008080', '0000FF', '666699', '808080',
        'FF0000', 'FF9900', '99CC00', '339966', '33CCCC', '3366FF', '800080', '969696',
        'FF00FF', 'FFCC00', 'FFFF00', '00FF00', '00FFFF', '00CCFF', '993366', 'C0C0C0',
        'FF99CC', 'FFCC99', 'FFFF99', 'CCFFCC', 'CCFFFF', '99CCFF', 'CC99FF', 'FFFFFF'
    ],

    /**
     * @cfg {Function} handler
     * A function that will handle the select event of this picker. The handler is passed the following parameters:
     *
     * - `picker` : ColorPicker
     *
     *   The {@link Ext.picker.Color picker}.
     *
     * - `color` : String
     *
     *   The 6-digit color hex code (without the # symbol).
     */

    /**
     * @cfg {Object} scope
     * The scope (`this` reference) in which the `{@link #handler}` function will be called.
     *
     * Defaults to this Color picker instance.
     */

    colorRe: /(?:^|\s)color-(.{6})(?:\s|$)/,
    
    renderTpl: [
        '<tpl for="colors">',
            '<a href="#" class="color-{.}" hidefocus="on">',
                '<em><span style="background:#{.}" unselectable="on">&#160;</span></em>',
            '</a>',
        '</tpl>'
    ],

    // private
    initComponent : function(){
        var me = this;

        me.callParent(arguments);
        me.addEvents(
            /**
             * @event select
             * Fires when a color is selected
             * @param {Ext.picker.Color} this
             * @param {String} color The 6-digit color hex code (without the # symbol)
             */
            'select'
        );

        if (me.handler) {
            me.on('select', me.handler, me.scope, true);
        }
    },


    // private
    initRenderData : function(){
        var me = this;
        return Ext.apply(me.callParent(), {
            itemCls: me.itemCls,
            colors: me.colors
        });
    },

    onRender : function(){
        var me = this,
            clickEvent = me.clickEvent;

        me.callParent(arguments);

        me.mon(me.el, clickEvent, me.handleClick, me, {delegate: 'a'});
        // always stop following the anchors
        if(clickEvent != 'click'){
            me.mon(me.el, 'click', Ext.emptyFn, me, {delegate: 'a', stopEvent: true});
        }
    },

    // private
    afterRender : function(){
        var me = this,
            value;

        me.callParent(arguments);
        if (me.value) {
            value = me.value;
            me.value = null;
            me.select(value, true);
        }
    },

    // private
    handleClick : function(event, target){
        var me = this,
            color;

        event.stopEvent();
        if (!me.disabled) {
            color = target.className.match(me.colorRe)[1];
            me.select(color.toUpperCase());
        }
    },

    /**
     * Selects the specified color in the picker (fires the {@link #event-select} event)
     * @param {String} color A valid 6-digit color hex code (# will be stripped if included)
     * @param {Boolean} [suppressEvent=false] True to stop the select event from firing.
     */
    select : function(color, suppressEvent){

        var me = this,
            selectedCls = me.selectedCls,
            value = me.value,
            el;

        color = color.replace('#', '');
        if (!me.rendered) {
            me.value = color;
            return;
        }


        if (color != value || me.allowReselect) {
            el = me.el;

            if (me.value) {
                el.down('a.color-' + value).removeCls(selectedCls);
            }
            el.down('a.color-' + color).addCls(selectedCls);
            me.value = color;
            if (suppressEvent !== true) {
                me.fireEvent('select', me, color);
            }
        }
    },

    /**
     * Get the currently selected color value.
     * @return {String} value The selected value. Null if nothing is selected.
     */
    getValue: function(){
        return this.value || null;
    }
});

/**
 * @private
 * A month picker component. This class is used by the {@link Ext.picker.Date Date picker} class
 * to allow browsing and selection of year/months combinations.
 */
Ext.define('Ext.picker.Month', {
    extend: 'Ext.Component',
    requires: [
        'Ext.XTemplate', 
        'Ext.util.ClickRepeater', 
        'Ext.Date', 
        'Ext.button.Button'
    ],
    alias: 'widget.monthpicker',
    alternateClassName: 'Ext.MonthPicker',

    childEls: [
        'bodyEl', 'prevEl', 'nextEl', 'buttonsEl', 'monthEl', 'yearEl'
    ],

    renderTpl: [
        '<div id="{id}-bodyEl" class="{baseCls}-body">',
          '<div id="{id}-monthEl" class="{baseCls}-months">',
              '<tpl for="months">',
                  '<div class="{parent.baseCls}-item {parent.baseCls}-month"><a style="{parent.monthStyle}" href="#" hidefocus="on">{.}</a></div>',
              '</tpl>',
          '</div>',
          '<div id="{id}-yearEl" class="{baseCls}-years">',
              '<div class="{baseCls}-yearnav">',
                  '<button id="{id}-prevEl" class="{baseCls}-yearnav-prev"></button>',
                  '<button id="{id}-nextEl" class="{baseCls}-yearnav-next"></button>',
              '</div>',
              '<tpl for="years">',
                  '<div class="{parent.baseCls}-item {parent.baseCls}-year"><a href="#" hidefocus="on">{.}</a></div>',
              '</tpl>',
          '</div>',
          '<div class="' + Ext.baseCSSPrefix + 'clear"></div>',
        '</div>',
        '<tpl if="showButtons">',
            '<div id="{id}-buttonsEl" class="{baseCls}-buttons">{%',
                'var me=values.$comp, okBtn=me.okBtn, cancelBtn=me.cancelBtn;',
                'okBtn.ownerLayout = cancelBtn.ownerLayout = me.componentLayout;',
                'okBtn.ownerCt = cancelBtn.ownerCt = me;',
                'Ext.DomHelper.generateMarkup(okBtn.getRenderTree(), out);',
                'Ext.DomHelper.generateMarkup(cancelBtn.getRenderTree(), out);',
            '%}</div>',
        '</tpl>'
    ],

    //<locale>
    /**
     * @cfg {String} okText The text to display on the ok button.
     */
    okText: 'OK',
    //</locale>

    //<locale>
    /**
     * @cfg {String} cancelText The text to display on the cancel button.
     */
    cancelText: 'Cancel',
    //</locale>

    /**
     * @cfg {String} [baseCls='x-monthpicker']
     *  The base CSS class to apply to the picker element.
     */
    baseCls: Ext.baseCSSPrefix + 'monthpicker',

    /**
     * @cfg {Boolean} showButtons True to show ok and cancel buttons below the picker.
     */
    showButtons: true,

    /**
     * @cfg {String} [selectedCls='x-monthpicker-selected'] The class to be added to selected items in the picker.
     */

    /**
     * @cfg {Date/Number[]} value The default value to set. See {@link #setValue}
     */
    
    
    width: 178,
    measureWidth: 35,
    measureMaxHeight: 20,

    // used when attached to date picker which isnt showing buttons
    smallCls: Ext.baseCSSPrefix + 'monthpicker-small',

    // private
    totalYears: 10,
    yearOffset: 5, // 10 years in total, 2 per row
    monthOffset: 6, // 12 months, 2 per row

    // private, inherit docs
    initComponent: function(){
        var me = this;

        me.selectedCls = me.baseCls + '-selected';
        me.addEvents(
            /**
             * @event cancelclick
             * Fires when the cancel button is pressed.
             * @param {Ext.picker.Month} this
             */
            'cancelclick',

            /**
             * @event monthclick
             * Fires when a month is clicked.
             * @param {Ext.picker.Month} this
             * @param {Array} value The current value
             */
            'monthclick',

            /**
             * @event monthdblclick
             * Fires when a month is clicked.
             * @param {Ext.picker.Month} this
             * @param {Array} value The current value
             */
            'monthdblclick',

            /**
             * @event okclick
             * Fires when the ok button is pressed.
             * @param {Ext.picker.Month} this
             * @param {Array} value The current value
             */
            'okclick',

            /**
             * @event select
             * Fires when a month/year is selected.
             * @param {Ext.picker.Month} this
             * @param {Array} value The current value
             */
            'select',

            /**
             * @event yearclick
             * Fires when a year is clicked.
             * @param {Ext.picker.Month} this
             * @param {Array} value The current value
             */
            'yearclick',

            /**
             * @event yeardblclick
             * Fires when a year is clicked.
             * @param {Ext.picker.Month} this
             * @param {Array} value The current value
             */
            'yeardblclick'
        );
        if (me.small) {
            me.addCls(me.smallCls);
        }
        me.setValue(me.value);
        me.activeYear = me.getYear(new Date().getFullYear() - 4, -4);

        if (me.showButtons) {
            me.okBtn = new Ext.button.Button({
                text: me.okText,
                handler: me.onOkClick,
                scope: me
            });
            me.cancelBtn = new Ext.button.Button({
                text: me.cancelText,
                handler: me.onCancelClick,
                scope: me
            });
        }

        this.callParent();
    },

    // private, inherit docs
    beforeRender: function(){
        var me = this,
            i = 0,
            months = [],
            shortName = Ext.Date.getShortMonthName,
            monthLen = me.monthOffset,
            margin = me.monthMargin,
            style = '';

        me.callParent();

        for (; i < monthLen; ++i) {
            months.push(shortName(i), shortName(i + monthLen));
        }
        
        if (Ext.isDefined(margin)) {
            style = 'margin: 0 ' + margin + 'px;';
        }

        Ext.apply(me.renderData, {
            months: months,
            years: me.getYears(),
            showButtons: me.showButtons,
            monthStyle: style
        });
    },

    // private, inherit docs
    afterRender: function(){
        var me = this,
            body = me.bodyEl,
            buttonsEl = me.buttonsEl;

        me.callParent();

        me.mon(body, 'click', me.onBodyClick, me);
        me.mon(body, 'dblclick', me.onBodyClick, me);

        // keep a reference to the year/month elements since we'll be re-using them
        me.years = body.select('.' + me.baseCls + '-year a');
        me.months = body.select('.' + me.baseCls + '-month a');

        me.backRepeater = new Ext.util.ClickRepeater(me.prevEl, {
            handler: Ext.Function.bind(me.adjustYear, me, [-me.totalYears])
        });

        me.prevEl.addClsOnOver(me.baseCls + '-yearnav-prev-over');
        me.nextRepeater = new Ext.util.ClickRepeater(me.nextEl, {
            handler: Ext.Function.bind(me.adjustYear, me, [me.totalYears])
        });
        me.nextEl.addClsOnOver(me.baseCls + '-yearnav-next-over');
        me.updateBody();
        
        if (!Ext.isDefined(me.monthMargin)) {
            Ext.picker.Month.prototype.monthMargin = me.calculateMonthMargin();
        }
    },
    
    calculateMonthMargin: function(){
        // We use this method for locales where the short month name
        // may be longer than we see in English. For example in the 
        // zh_TW locale the month ends up spanning lines, so we loosen
        // the margins to get some extra space
        var me = this,
            monthEl = me.monthEl,
            months = me.months,
            first = months.first(),
            itemMargin = first.getMargin('l');
            
        while (itemMargin && me.getLargest() > me.measureMaxHeight) {
            --itemMargin;
            months.setStyle('margin', '0 ' + itemMargin + 'px');
        }
        return itemMargin;
    },
    
    getLargest: function(months){
        var largest = 0;
        this.months.each(function(item){
            var h = item.getHeight();
            if (h > largest) {
                largest = h;
            }
        });
        return largest;
        
    },

    /**
     * Set the value for the picker.
     * @param {Date/Number[]} value The value to set. It can be a Date object, where the month/year will be extracted, or
     * it can be an array, with the month as the first index and the year as the second.
     * @return {Ext.picker.Month} this
     */
    setValue: function(value){
        var me = this,
            active = me.activeYear,
            offset = me.monthOffset,
            year,
            index;

        if (!value) {
            me.value = [null, null];
        } else if (Ext.isDate(value)) {
            me.value = [value.getMonth(), value.getFullYear()];
        } else {
            me.value = [value[0], value[1]];
        }

        if (me.rendered) {
            year = me.value[1];
            if (year !== null) {
                if ((year < active || year > active + me.yearOffset)) {
                    me.activeYear = year - me.yearOffset + 1;
                }
            }
            me.updateBody();
        }

        return me;
    },

    /**
     * Gets the selected value. It is returned as an array [month, year]. It may
     * be a partial value, for example [null, 2010]. The month is returned as
     * 0 based.
     * @return {Number[]} The selected value
     */
    getValue: function(){
        return this.value;
    },

    /**
     * Checks whether the picker has a selection
     * @return {Boolean} Returns true if both a month and year have been selected
     */
    hasSelection: function(){
        var value = this.value;
        return value[0] !== null && value[1] !== null;
    },

    /**
     * Get an array of years to be pushed in the template. It is not in strict
     * numerical order because we want to show them in columns.
     * @private
     * @return {Number[]} An array of years
     */
    getYears: function(){
        var me = this,
            offset = me.yearOffset,
            start = me.activeYear, // put the "active" year on the left
            end = start + offset,
            i = start,
            years = [];

        for (; i < end; ++i) {
            years.push(i, i + offset);
        }

        return years;
    },

    /**
     * Update the years in the body based on any change
     * @private
     */
    updateBody: function(){
        var me = this,
            years = me.years,
            months = me.months,
            yearNumbers = me.getYears(),
            cls = me.selectedCls,
            value = me.getYear(null),
            month = me.value[0],
            monthOffset = me.monthOffset,
            year,
            yearItems, y, yLen, el;

        if (me.rendered) {
            years.removeCls(cls);
            months.removeCls(cls);

            yearItems = years.elements;
            yLen      = yearItems.length;

            for (y = 0; y < yLen; y++) {
                el = Ext.fly(yearItems[y]);

                year = yearNumbers[y];
                el.dom.innerHTML = year;
                if (year == value) {
                    el.dom.className = cls;
                }
            }
            if (month !== null) {
                if (month < monthOffset) {
                    month = month * 2;
                } else {
                    month = (month - monthOffset) * 2 + 1;
                }
                months.item(month).addCls(cls);
            }
        }
    },

    /**
     * Gets the current year value, or the default.
     * @private
     * @param {Number} defaultValue The default value to use if the year is not defined.
     * @param {Number} offset A number to offset the value by
     * @return {Number} The year value
     */
    getYear: function(defaultValue, offset) {
        var year = this.value[1];
        offset = offset || 0;
        return year === null ? defaultValue : year + offset;
    },

    /**
     * React to clicks on the body
     * @private
     */
    onBodyClick: function(e, t) {
        var me = this,
            isDouble = e.type == 'dblclick';

        if (e.getTarget('.' + me.baseCls + '-month')) {
            e.stopEvent();
            me.onMonthClick(t, isDouble);
        } else if (e.getTarget('.' + me.baseCls + '-year')) {
            e.stopEvent();
            me.onYearClick(t, isDouble);
        }
    },

    /**
     * Modify the year display by passing an offset.
     * @param {Number} [offset=10] The offset to move by.
     */
    adjustYear: function(offset){
        if (typeof offset != 'number') {
            offset = this.totalYears;
        }
        this.activeYear += offset;
        this.updateBody();
    },

    /**
     * React to the ok button being pressed
     * @private
     */
    onOkClick: function(){
        this.fireEvent('okclick', this, this.value);
    },

    /**
     * React to the cancel button being pressed
     * @private
     */
    onCancelClick: function(){
        this.fireEvent('cancelclick', this);
    },

    /**
     * React to a month being clicked
     * @private
     * @param {HTMLElement} target The element that was clicked
     * @param {Boolean} isDouble True if the event was a doubleclick
     */
    onMonthClick: function(target, isDouble){
        var me = this;
        me.value[0] = me.resolveOffset(me.months.indexOf(target), me.monthOffset);
        me.updateBody();
        me.fireEvent('month' + (isDouble ? 'dbl' : '') + 'click', me, me.value);
        me.fireEvent('select', me, me.value);
    },

    /**
     * React to a year being clicked
     * @private
     * @param {HTMLElement} target The element that was clicked
     * @param {Boolean} isDouble True if the event was a doubleclick
     */
    onYearClick: function(target, isDouble){
        var me = this;
        me.value[1] = me.activeYear + me.resolveOffset(me.years.indexOf(target), me.yearOffset);
        me.updateBody();
        me.fireEvent('year' + (isDouble ? 'dbl' : '') + 'click', me, me.value);
        me.fireEvent('select', me, me.value);

    },

    /**
     * Returns an offsetted number based on the position in the collection. Since our collections aren't
     * numerically ordered, this function helps to normalize those differences.
     * @private
     * @param {Object} index
     * @param {Object} offset
     * @return {Number} The correctly offsetted number
     */
    resolveOffset: function(index, offset){
        if (index % 2 === 0) {
            return (index / 2);
        } else {
            return offset + Math.floor(index / 2);
        }
    },

    // private, inherit docs
    beforeDestroy: function(){
        var me = this;
        me.years = me.months = null;
        Ext.destroyMembers(me, 'backRepeater', 'nextRepeater', 'okBtn', 'cancelBtn');
        me.callParent();
    },

    // Do the job of a container layout at this point even though we are not a Container.
    // TODO: Refactor as a Container.
    finishRenderChildren: function () {
        var me = this;

        this.callParent(arguments);

        if (this.showButtons) {
            me.okBtn.finishRender();
            me.cancelBtn.finishRender();
        }
    },

    onDestroy: function() {
        Ext.destroyMembers(this, 'okBtn', 'cancelBtn');
        this.callParent();
    }
    
});

/**
 * A date picker. This class is used by the Ext.form.field.Date field to allow browsing and selection of valid
 * dates in a popup next to the field, but may also be used with other components.
 *
 * Typically you will need to implement a handler function to be notified when the user chooses a date from the picker;
 * you can register the handler using the {@link #select} event, or by implementing the {@link #handler} method.
 *
 * By default the user will be allowed to pick any date; this can be changed by using the {@link #minDate},
 * {@link #maxDate}, {@link #disabledDays}, {@link #disabledDatesRE}, and/or {@link #disabledDates} configs.
 *
 * All the string values documented below may be overridden by including an Ext locale file in your page.
 *
 *     @example
 *     Ext.create('Ext.panel.Panel', {
 *         title: 'Choose a future date:',
 *         width: 200,
 *         bodyPadding: 10,
 *         renderTo: Ext.getBody(),
 *         items: [{
 *             xtype: 'datepicker',
 *             minDate: new Date(),
 *             handler: function(picker, date) {
 *                 // do something with the selected date
 *             }
 *         }]
 *     });
 */
Ext.define('Ext.picker.Date', {
    extend: 'Ext.Component',
    requires: [
        'Ext.XTemplate',
        'Ext.button.Button',
        'Ext.button.Split',
        'Ext.util.ClickRepeater',
        'Ext.util.KeyNav',
        'Ext.EventObject',
        'Ext.fx.Manager',
        'Ext.picker.Month'
    ],
    alias: 'widget.datepicker',
    alternateClassName: 'Ext.DatePicker',

    childEls: [
        'innerEl', 'eventEl', 'prevEl', 'nextEl', 'middleBtnEl', 'footerEl'
    ],
    
    border: true,

    renderTpl: [
        '<div id="{id}-innerEl" role="grid">',
            '<div role="presentation" class="{baseCls}-header">',
                '<div class="{baseCls}-prev"><a id="{id}-prevEl" href="#" role="button" title="{prevText}"></a></div>',
                '<div class="{baseCls}-month" id="{id}-middleBtnEl">{%this.renderMonthBtn(values, out)%}</div>',
                '<div class="{baseCls}-next"><a id="{id}-nextEl" href="#" role="button" title="{nextText}"></a></div>',
            '</div>',
            '<table id="{id}-eventEl" class="{baseCls}-inner" cellspacing="0" role="presentation">',
                '<thead role="presentation"><tr role="presentation">',
                    '<tpl for="dayNames">',
                        '<th role="columnheader" title="{.}"><span>{.:this.firstInitial}</span></th>',
                    '</tpl>',
                '</tr></thead>',
                '<tbody role="presentation"><tr role="presentation">',
                    '<tpl for="days">',
                        '{#:this.isEndOfWeek}',
                        '<td role="gridcell" id="{[Ext.id()]}">',
                            '<a role="presentation" href="#" hidefocus="on" class="{parent.baseCls}-date" tabIndex="1">',
                                '<em role="presentation"><span role="presentation"></span></em>',
                            '</a>',
                        '</td>',
                    '</tpl>',
                '</tr></tbody>',
            '</table>',
            '<tpl if="showToday">',
                '<div id="{id}-footerEl" role="presentation" class="{baseCls}-footer">{%this.renderTodayBtn(values, out)%}</div>',
            '</tpl>',
        '</div>',
        {
            firstInitial: function(value) {
                return Ext.picker.Date.prototype.getDayInitial(value);
            },
            isEndOfWeek: function(value) {
                // convert from 1 based index to 0 based
                // by decrementing value once.
                value--;
                var end = value % 7 === 0 && value !== 0;
                return end ? '</tr><tr role="row">' : '';
            },
            renderTodayBtn: function(values, out) {
                Ext.DomHelper.generateMarkup(values.$comp.todayBtn.getRenderTree(), out);
            },
            renderMonthBtn: function(values, out) {
                Ext.DomHelper.generateMarkup(values.$comp.monthBtn.getRenderTree(), out);
            }
        }
    ],

    //<locale>
    /**
     * @cfg {String} todayText
     * The text to display on the button that selects the current date
     */
    todayText : 'Today',
    //</locale>
    
    //<locale>
    /**
     * @cfg {String} ariaTitle
     * The text to display for the aria title
     */
    ariaTitle: 'Date Picker: {0}',
    //</locale>
    
    //<locale>
    /**
     * @cfg {String} ariaTitleDateFormat
     * The date format to display for the current value in the {@link #ariaTitle}
     */
    ariaTitleDateFormat: 'F d, Y',
    //</locale>

    /**
     * @cfg {Function} handler
     * Optional. A function that will handle the select event of this picker. The handler is passed the following
     * parameters:
     *
     *   - `picker` : Ext.picker.Date
     *
     * This Date picker.
     *
     *   - `date` : Date
     *
     * The selected date.
     */

    /**
     * @cfg {Object} scope
     * The scope (`this` reference) in which the `{@link #handler}` function will be called.
     *
     * Defaults to this DatePicker instance.
     */

    //<locale>
    /**
     * @cfg {String} todayTip
     * A string used to format the message for displaying in a tooltip over the button that selects the current date.
     * The `{0}` token in string is replaced by today's date.
     */
    todayTip : '{0} (Spacebar)',
    //</locale>

    //<locale>
    /**
     * @cfg {String} minText
     * The error text to display if the minDate validation fails.
     */
    minText : 'This date is before the minimum date',
    //</locale>

    //<locale>
    /**
     * @cfg {String} maxText
     * The error text to display if the maxDate validation fails.
     */
    maxText : 'This date is after the maximum date',
    //</locale>

    /**
     * @cfg {String} format
     * The default date format string which can be overriden for localization support. The format must be valid
     * according to {@link Ext.Date#parse} (defaults to {@link Ext.Date#defaultFormat}).
     */

    //<locale>
    /**
     * @cfg {String} disabledDaysText
     * The tooltip to display when the date falls on a disabled day.
     */
    disabledDaysText : 'Disabled',
    //</locale>

    //<locale>
    /**
     * @cfg {String} disabledDatesText
     * The tooltip text to display when the date falls on a disabled date.
     */
    disabledDatesText : 'Disabled',
    //</locale>

    /**
     * @cfg {String[]} monthNames
     * An array of textual month names which can be overriden for localization support (defaults to Ext.Date.monthNames)
     */

    /**
     * @cfg {String[]} dayNames
     * An array of textual day names which can be overriden for localization support (defaults to Ext.Date.dayNames)
     */

    //<locale>
    /**
     * @cfg {String} nextText
     * The next month navigation button tooltip
     */
    nextText : 'Next Month (Control+Right)',
    //</locale>

    //<locale>
    /**
     * @cfg {String} prevText
     * The previous month navigation button tooltip
     */
    prevText : 'Previous Month (Control+Left)',
    //</locale>

    //<locale>
    /**
     * @cfg {String} monthYearText
     * The header month selector tooltip
     */
    monthYearText : 'Choose a month (Control+Up/Down to move years)',
    //</locale>
    
    //<locale>
    /**
     * @cfg {String} monthYearFormat
     * The date format for the header month
     */
    monthYearFormat: 'F Y',
    //</locale>

    //<locale>
    /**
     * @cfg {Number} [startDay=undefined]
     * Day index at which the week should begin, 0-based.
     *
     * Defaults to `0` (Sunday).
     */
    startDay : 0,
    //</locale>

    //<locale>
    /**
     * @cfg {Boolean} showToday
     * False to hide the footer area containing the Today button and disable the keyboard handler for spacebar that
     * selects the current date.
     */
    showToday : true,
    //</locale>

    /**
     * @cfg {Date} [minDate=null]
     * Minimum allowable date (JavaScript date object)
     */

    /**
     * @cfg {Date} [maxDate=null]
     * Maximum allowable date (JavaScript date object)
     */

    /**
     * @cfg {Number[]} [disabledDays=null]
     * An array of days to disable, 0-based. For example, [0, 6] disables Sunday and Saturday.
     */

    /**
     * @cfg {RegExp} [disabledDatesRE=null]
     * JavaScript regular expression used to disable a pattern of dates. The {@link #disabledDates}
     * config will generate this regex internally, but if you specify disabledDatesRE it will take precedence over the
     * disabledDates value.
     */

    /**
     * @cfg {String[]} disabledDates
     * An array of 'dates' to disable, as strings. These strings will be used to build a dynamic regular expression so
     * they are very powerful. Some examples:
     *
     *   - ['03/08/2003', '09/16/2003'] would disable those exact dates
     *   - ['03/08', '09/16'] would disable those days for every year
     *   - ['^03/08'] would only match the beginning (useful if you are using short years)
     *   - ['03/../2006'] would disable every day in March 2006
     *   - ['^03'] would disable every day in every March
     *
     * Note that the format of the dates included in the array should exactly match the {@link #format} config. In order
     * to support regular expressions, if you are using a date format that has '.' in it, you will have to escape the
     * dot when restricting dates. For example: ['03\\.08\\.03'].
     */

    /**
     * @cfg {Boolean} disableAnim
     * True to disable animations when showing the month picker.
     */
    disableAnim: false,

    /**
     * @cfg {String} [baseCls='x-datepicker']
     * The base CSS class to apply to this components element.
     */
    baseCls: Ext.baseCSSPrefix + 'datepicker',

    /**
     * @cfg {String} [selectedCls='x-datepicker-selected']
     * The class to apply to the selected cell.
     */

    /**
     * @cfg {String} [disabledCellCls='x-datepicker-disabled']
     * The class to apply to disabled cells.
     */

    //<locale>
    /**
     * @cfg {String} longDayFormat
     * The format for displaying a date in a longer format.
     */
    longDayFormat: 'F d, Y',
    //</locale>

    /**
     * @cfg {Object} keyNavConfig
     * Specifies optional custom key event handlers for the {@link Ext.util.KeyNav} attached to this date picker. Must
     * conform to the config format recognized by the {@link Ext.util.KeyNav} constructor. Handlers specified in this
     * object will replace default handlers of the same name.
     */

    /**
     * @cfg {Boolean} focusOnShow
     * True to automatically focus the picker on show.
     */
    focusOnShow: false,

    // private
    // Set by other components to stop the picker focus being updated when the value changes.
    focusOnSelect: true,

    width: 178,

    // default value used to initialise each date in the DatePicker
    // (note: 12 noon was chosen because it steers well clear of all DST timezone changes)
    initHour: 12, // 24-hour format

    numDays: 42,

    // private, inherit docs
    initComponent : function() {
        var me = this,
            clearTime = Ext.Date.clearTime;

        me.selectedCls = me.baseCls + '-selected';
        me.disabledCellCls = me.baseCls + '-disabled';
        me.prevCls = me.baseCls + '-prevday';
        me.activeCls = me.baseCls + '-active';
        me.nextCls = me.baseCls + '-prevday';
        me.todayCls = me.baseCls + '-today';
        me.dayNames = me.dayNames.slice(me.startDay).concat(me.dayNames.slice(0, me.startDay));

        me.listeners = Ext.apply(me.listeners||{}, {
            mousewheel: {
                element: 'eventEl',
                fn: me.handleMouseWheel,
                scope: me
            },
            click: {
                element: 'eventEl',
                fn: me.handleDateClick, 
                scope: me,
                delegate: 'a.' + me.baseCls + '-date'
            }
        });
        this.callParent();

        me.value = me.value ?
                 clearTime(me.value, true) : clearTime(new Date());

        me.addEvents(
            /**
             * @event select
             * Fires when a date is selected
             * @param {Ext.picker.Date} this DatePicker
             * @param {Date} date The selected date
             */
            'select'
        );

        me.initDisabledDays();
    },

    beforeRender: function () {
        /*
         * days array for looping through 6 full weeks (6 weeks * 7 days)
         * Note that we explicitly force the size here so the template creates
         * all the appropriate cells.
         */
        var me = this,
            days = new Array(me.numDays),
            today = Ext.Date.format(new Date(), me.format);

        // If there's a Menu among our ancestors, then add the menu class.
        // This is so that the MenuManager does not see a mousedown in this Component as a document mousedown, outside the Menu
        if (me.up('menu')) {
            me.addCls(Ext.baseCSSPrefix + 'menu');
        }

        me.monthBtn = new Ext.button.Split({
            ownerCt: me,
            ownerLayout: me.getComponentLayout(),
            text: '',
            tooltip: me.monthYearText,
            listeners: {
                click: me.showMonthPicker,
                arrowclick: me.showMonthPicker,
                scope: me
            }
        });

        if (this.showToday) {
            me.todayBtn = new Ext.button.Button({
                ownerCt: me,
                ownerLayout: me.getComponentLayout(),
                text: Ext.String.format(me.todayText, today),
                tooltip: Ext.String.format(me.todayTip, today),
                tooltipType: 'title',
                handler: me.selectToday,
                scope: me
            });
        }

        me.callParent();

        Ext.applyIf(me, {
            renderData: {}
        });

        Ext.apply(me.renderData, {
            dayNames: me.dayNames,
            showToday: me.showToday,
            prevText: me.prevText,
            nextText: me.nextText,
            days: days
        });
    },

    // Do the job of a container layout at this point even though we are not a Container.
    // TODO: Refactor as a Container.
    finishRenderChildren: function () {
        var me = this;
        
        me.callParent();
        me.monthBtn.finishRender();
        if (me.showToday) {
            me.todayBtn.finishRender();
        }
    },

    // private, inherit docs
    onRender : function(container, position){
        var me = this;

        me.callParent(arguments);
        me.el.unselectable();
        me.cells = me.eventEl.select('tbody td');
        me.textNodes = me.eventEl.query('tbody td span');
    },

    // private, inherit docs
    initEvents: function(){
        var me = this,
            eDate = Ext.Date,
            day = eDate.DAY;

        me.callParent();

        me.prevRepeater = new Ext.util.ClickRepeater(me.prevEl, {
            handler: me.showPrevMonth,
            scope: me,
            preventDefault: true,
            stopDefault: true
        });

        me.nextRepeater = new Ext.util.ClickRepeater(me.nextEl, {
            handler: me.showNextMonth,
            scope: me,
            preventDefault:true,
            stopDefault:true
        });

        me.keyNav = new Ext.util.KeyNav(me.eventEl, Ext.apply({
            scope: me,
            left : function(e){
                if(e.ctrlKey){
                    me.showPrevMonth();
                }else{
                    me.update(eDate.add(me.activeDate, day, -1));
                }
            },

            right : function(e){
                if(e.ctrlKey){
                    me.showNextMonth();
                }else{
                    me.update(eDate.add(me.activeDate, day, 1));
                }
            },

            up : function(e){
                if(e.ctrlKey){
                    me.showNextYear();
                }else{
                    me.update(eDate.add(me.activeDate, day, -7));
                }
            },

            down : function(e){
                if(e.ctrlKey){
                    me.showPrevYear();
                }else{
                    me.update(eDate.add(me.activeDate, day, 7));
                }
            },
            pageUp : me.showNextMonth,
            pageDown : me.showPrevMonth,
            enter : function(e){
                e.stopPropagation();
                return true;
            }
        }, me.keyNavConfig));

        if (me.showToday) {
            me.todayKeyListener = me.eventEl.addKeyListener(Ext.EventObject.SPACE, me.selectToday,  me);
        }
        me.update(me.value);
    },

    /**
     * Setup the disabled dates regex based on config options
     * @private
     */
    initDisabledDays : function(){
        var me = this,
            dd = me.disabledDates,
            re = '(?:',
            len,
            d, dLen, dI;

        if(!me.disabledDatesRE && dd){
                len = dd.length - 1;

            dLen = dd.length;

            for (d = 0; d < dLen; d++) {
                dI = dd[d];

                re += Ext.isDate(dI) ? '^' + Ext.String.escapeRegex(Ext.Date.dateFormat(dI, me.format)) + '$' : dI;
                if (d != len) {
                    re += '|';
                }
            }

            me.disabledDatesRE = new RegExp(re + ')');
        }
    },

    /**
     * Replaces any existing disabled dates with new values and refreshes the DatePicker.
     * @param {String[]/RegExp} disabledDates An array of date strings (see the {@link #disabledDates} config for
     * details on supported values), or a JavaScript regular expression used to disable a pattern of dates.
     * @return {Ext.picker.Date} this
     */
    setDisabledDates : function(dd){
        var me = this;

        if(Ext.isArray(dd)){
            me.disabledDates = dd;
            me.disabledDatesRE = null;
        }else{
            me.disabledDatesRE = dd;
        }
        me.initDisabledDays();
        me.update(me.value, true);
        return me;
    },

    /**
     * Replaces any existing disabled days (by index, 0-6) with new values and refreshes the DatePicker.
     * @param {Number[]} disabledDays An array of disabled day indexes. See the {@link #disabledDays} config for details
     * on supported values.
     * @return {Ext.picker.Date} this
     */
    setDisabledDays : function(dd){
        this.disabledDays = dd;
        return this.update(this.value, true);
    },

    /**
     * Replaces any existing {@link #minDate} with the new value and refreshes the DatePicker.
     * @param {Date} value The minimum date that can be selected
     * @return {Ext.picker.Date} this
     */
    setMinDate : function(dt){
        this.minDate = dt;
        return this.update(this.value, true);
    },

    /**
     * Replaces any existing {@link #maxDate} with the new value and refreshes the DatePicker.
     * @param {Date} value The maximum date that can be selected
     * @return {Ext.picker.Date} this
     */
    setMaxDate : function(dt){
        this.maxDate = dt;
        return this.update(this.value, true);
    },

    /**
     * Sets the value of the date field
     * @param {Date} value The date to set
     * @return {Ext.picker.Date} this
     */
    setValue : function(value){
        this.value = Ext.Date.clearTime(value, true);
        return this.update(this.value);
    },

    /**
     * Gets the current selected value of the date field
     * @return {Date} The selected date
     */
    getValue : function(){
        return this.value;
    },

    //<locale type="function">
    /**
     * Gets a single character to represent the day of the week
     * @return {String} The character
     */
    getDayInitial: function(value){
        return value.substr(0,1);
    },
    //</locale>

    // private
    focus : function(){
        this.update(this.activeDate);
    },

    // private, inherit docs
    onEnable: function(){
        this.callParent();
        this.setDisabledStatus(false);
        this.update(this.activeDate);

    },

    // private, inherit docs
    onDisable : function(){
        this.callParent();
        this.setDisabledStatus(true);
    },

    /**
     * Set the disabled state of various internal components
     * @private
     * @param {Boolean} disabled
     */
    setDisabledStatus : function(disabled){
        var me = this;

        me.keyNav.setDisabled(disabled);
        me.prevRepeater.setDisabled(disabled);
        me.nextRepeater.setDisabled(disabled);
        if (me.showToday) {
            me.todayKeyListener.setDisabled(disabled);
            me.todayBtn.setDisabled(disabled);
        }
    },

    /**
     * Get the current active date.
     * @private
     * @return {Date} The active date
     */
    getActive: function(){
        return this.activeDate || this.value;
    },

    /**
     * Run any animation required to hide/show the month picker.
     * @private
     * @param {Boolean} isHide True if it's a hide operation
     */
    runAnimation: function(isHide){
        var picker = this.monthPicker,
            options = {
                duration: 200,
                callback: function(){
                    if (isHide) {
                        picker.hide();
                    } else {
                        picker.show();
                    }
                }
            };

        if (isHide) {
            picker.el.slideOut('t', options);
        } else {
            picker.el.slideIn('t', options);
        }
    },

    /**
     * Hides the month picker, if it's visible.
     * @param {Boolean} [animate] Indicates whether to animate this action. If the animate
     * parameter is not specified, the behavior will use {@link #disableAnim} to determine
     * whether to animate or not.
     * @return {Ext.picker.Date} this
     */
    hideMonthPicker : function(animate){
        var me = this,
            picker = me.monthPicker;

        if (picker) {
            if (me.shouldAnimate(animate)) {
                me.runAnimation(true);
            } else {
                picker.hide();
            }
        }
        return me;
    },

    /**
     * Show the month picker
     * @param {Boolean} [animate] Indicates whether to animate this action. If the animate
     * parameter is not specified, the behavior will use {@link #disableAnim} to determine
     * whether to animate or not.
     * @return {Ext.picker.Date} this
     */
    showMonthPicker : function(animate){
        var me = this,
            picker;
        
        if (me.rendered && !me.disabled) {
            picker = me.createMonthPicker();
            picker.setValue(me.getActive());
            picker.setSize(me.getSize());
            picker.setPosition(-1, -1);
            if (me.shouldAnimate(animate)) {
                me.runAnimation(false);
            } else {
                picker.show();
            }
        }
        return me;
    },
    
    /**
     * Checks whether a hide/show action should animate
     * @private
     * @param {Boolean} [animate] A possible animation value
     * @return {Boolean} Whether to animate the action
     */
    shouldAnimate: function(animate){
        return Ext.isDefined(animate) ? animate : !this.disableAnim;
    },

    /**
     * Create the month picker instance
     * @private
     * @return {Ext.picker.Month} picker
     */
    createMonthPicker: function(){
        var me = this,
            picker = me.monthPicker;

        if (!picker) {
            me.monthPicker = picker = new Ext.picker.Month({
                renderTo: me.el,
                floating: true,
                shadow: false,
                small: me.showToday === false,
                listeners: {
                    scope: me,
                    cancelclick: me.onCancelClick,
                    okclick: me.onOkClick,
                    yeardblclick: me.onOkClick,
                    monthdblclick: me.onOkClick
                }
            });
            if (!me.disableAnim) {
                // hide the element if we're animating to prevent an initial flicker
                picker.el.setStyle('display', 'none');
            }
            me.on('beforehide', Ext.Function.bind(me.hideMonthPicker, me, [false]));
        }
        return picker;
    },

    /**
     * Respond to an ok click on the month picker
     * @private
     */
    onOkClick: function(picker, value){
        var me = this,
            month = value[0],
            year = value[1],
            date = new Date(year, month, me.getActive().getDate());

        if (date.getMonth() !== month) {
            // 'fix' the JS rolling date conversion if needed
            date = Ext.Date.getLastDateOfMonth(new Date(year, month, 1));
        }
        me.update(date);
        me.hideMonthPicker();
    },

    /**
     * Respond to a cancel click on the month picker
     * @private
     */
    onCancelClick: function(){
        // update the selected value, also triggers a focus
        this.selectedUpdate(this.activeDate);
        this.hideMonthPicker();
    },

    /**
     * Show the previous month.
     * @param {Object} e
     * @return {Ext.picker.Date} this
     */
    showPrevMonth : function(e){
        return this.update(Ext.Date.add(this.activeDate, Ext.Date.MONTH, -1));
    },

    /**
     * Show the next month.
     * @param {Object} e
     * @return {Ext.picker.Date} this
     */
    showNextMonth : function(e){
        return this.update(Ext.Date.add(this.activeDate, Ext.Date.MONTH, 1));
    },

    /**
     * Show the previous year.
     * @return {Ext.picker.Date} this
     */
    showPrevYear : function(){
        this.update(Ext.Date.add(this.activeDate, Ext.Date.YEAR, -1));
    },

    /**
     * Show the next year.
     * @return {Ext.picker.Date} this
     */
    showNextYear : function(){
        this.update(Ext.Date.add(this.activeDate, Ext.Date.YEAR, 1));
    },

    /**
     * Respond to the mouse wheel event
     * @private
     * @param {Ext.EventObject} e
     */
    handleMouseWheel : function(e){
        e.stopEvent();
        if(!this.disabled){
            var delta = e.getWheelDelta();
            if(delta > 0){
                this.showPrevMonth();
            } else if(delta < 0){
                this.showNextMonth();
            }
        }
    },

    /**
     * Respond to a date being clicked in the picker
     * @private
     * @param {Ext.EventObject} e
     * @param {HTMLElement} t
     */
    handleDateClick : function(e, t){
        var me = this,
            handler = me.handler;

        e.stopEvent();
        if(!me.disabled && t.dateValue && !Ext.fly(t.parentNode).hasCls(me.disabledCellCls)){
            me.doCancelFocus = me.focusOnSelect === false;
            me.setValue(new Date(t.dateValue));
            delete me.doCancelFocus;
            me.fireEvent('select', me, me.value);
            if (handler) {
                handler.call(me.scope || me, me, me.value);
            }
            // event handling is turned off on hide
            // when we are using the picker in a field
            // therefore onSelect comes AFTER the select
            // event.
            me.onSelect();
        }
    },

    /**
     * Perform any post-select actions
     * @private
     */
    onSelect: function() {
        if (this.hideOnSelect) {
             this.hide();
         }
    },

    /**
     * Sets the current value to today.
     * @return {Ext.picker.Date} this
     */
    selectToday : function(){
        var me = this,
            btn = me.todayBtn,
            handler = me.handler;

        if(btn && !btn.disabled){
            me.setValue(Ext.Date.clearTime(new Date()));
            me.fireEvent('select', me, me.value);
            if (handler) {
                handler.call(me.scope || me, me, me.value);
            }
            me.onSelect();
        }
        return me;
    },

    /**
     * Update the selected cell
     * @private
     * @param {Date} date The new date
     */
    selectedUpdate: function(date){
        var me        = this,
            t         = date.getTime(),
            cells     = me.cells,
            cls       = me.selectedCls,
            cellItems = cells.elements,
            c,
            cLen      = cellItems.length,
            cell;

        cells.removeCls(cls);

        for (c = 0; c < cLen; c++) {
            cell = Ext.fly(cellItems[c]);

            if (cell.dom.firstChild.dateValue == t) {
                me.fireEvent('highlightitem', me, cell);
                cell.addCls(cls);

                if(me.isVisible() && !me.doCancelFocus){
                    Ext.fly(cell.dom.firstChild).focus(50);
                }

                break;
            }
        }
    },

    /**
     * Update the contents of the picker for a new month
     * @private
     * @param {Date} date The new date
     */
    fullUpdate: function(date){
        var me = this,
            cells = me.cells.elements,
            textNodes = me.textNodes,
            disabledCls = me.disabledCellCls,
            eDate = Ext.Date,
            i = 0,
            extraDays = 0,
            visible = me.isVisible(),
            sel = +eDate.clearTime(date, true),
            today = +eDate.clearTime(new Date()),
            min = me.minDate ? eDate.clearTime(me.minDate, true) : Number.NEGATIVE_INFINITY,
            max = me.maxDate ? eDate.clearTime(me.maxDate, true) : Number.POSITIVE_INFINITY,
            ddMatch = me.disabledDatesRE,
            ddText = me.disabledDatesText,
            ddays = me.disabledDays ? me.disabledDays.join('') : false,
            ddaysText = me.disabledDaysText,
            format = me.format,
            days = eDate.getDaysInMonth(date),
            firstOfMonth = eDate.getFirstDateOfMonth(date),
            startingPos = firstOfMonth.getDay() - me.startDay,
            previousMonth = eDate.add(date, eDate.MONTH, -1),
            longDayFormat = me.longDayFormat,
            prevStart,
            current,
            disableToday,
            tempDate,
            setCellClass,
            html,
            cls,
            formatValue,
            value;

        if (startingPos < 0) {
            startingPos += 7;
        }

        days += startingPos;
        prevStart = eDate.getDaysInMonth(previousMonth) - startingPos;
        current = new Date(previousMonth.getFullYear(), previousMonth.getMonth(), prevStart, me.initHour);

        if (me.showToday) {
            tempDate = eDate.clearTime(new Date());
            disableToday = (tempDate < min || tempDate > max ||
                (ddMatch && format && ddMatch.test(eDate.dateFormat(tempDate, format))) ||
                (ddays && ddays.indexOf(tempDate.getDay()) != -1));

            if (!me.disabled) {
                me.todayBtn.setDisabled(disableToday);
                me.todayKeyListener.setDisabled(disableToday);
            }
        }

        setCellClass = function(cell){
            value = +eDate.clearTime(current, true);
            cell.title = eDate.format(current, longDayFormat);
            // store dateValue number as an expando
            cell.firstChild.dateValue = value;
            if(value == today){
                cell.className += ' ' + me.todayCls;
                cell.title = me.todayText;
            }
            if(value == sel){
                cell.className += ' ' + me.selectedCls;
                me.fireEvent('highlightitem', me, cell);
                if (visible && me.floating) {
                    Ext.fly(cell.firstChild).focus(50);
                }
            }
            // disabling
            if(value < min) {
                cell.className = disabledCls;
                cell.title = me.minText;
                return;
            }
            if(value > max) {
                cell.className = disabledCls;
                cell.title = me.maxText;
                return;
            }
            if(ddays){
                if(ddays.indexOf(current.getDay()) != -1){
                    cell.title = ddaysText;
                    cell.className = disabledCls;
                }
            }
            if(ddMatch && format){
                formatValue = eDate.dateFormat(current, format);
                if(ddMatch.test(formatValue)){
                    cell.title = ddText.replace('%0', formatValue);
                    cell.className = disabledCls;
                }
            }
        };

        for(; i < me.numDays; ++i) {
            if (i < startingPos) {
                html = (++prevStart);
                cls = me.prevCls;
            } else if (i >= days) {
                html = (++extraDays);
                cls = me.nextCls;
            } else {
                html = i - startingPos + 1;
                cls = me.activeCls;
            }
            textNodes[i].innerHTML = html;
            cells[i].className = cls;
            current.setDate(current.getDate() + 1);
            setCellClass(cells[i]);
        }

        me.monthBtn.setText(Ext.Date.format(date, me.monthYearFormat));
    },

    /**
     * Update the contents of the picker
     * @private
     * @param {Date} date The new date
     * @param {Boolean} forceRefresh True to force a full refresh
     */
    update : function(date, forceRefresh){
        var me = this,
            active = me.activeDate;

        if (me.rendered) {
            me.activeDate = date;
            if(!forceRefresh && active && me.el && active.getMonth() == date.getMonth() && active.getFullYear() == date.getFullYear()){
                me.selectedUpdate(date, active);
            } else {
                me.fullUpdate(date, active);
            }
            me.innerEl.dom.title = Ext.String.format(me.ariaTitle, Ext.Date.format(me.activeDate, me.ariaTitleDateFormat));
        }
        return me;
    },

    // private, inherit docs
    beforeDestroy : function() {
        var me = this;

        if (me.rendered) {
            Ext.destroy(
                me.todayKeyListener,
                me.keyNav,
                me.monthPicker,
                me.monthBtn,
                me.nextRepeater,
                me.prevRepeater,
                me.todayBtn
            );
            delete me.textNodes;
            delete me.cells.elements;
        }
        me.callParent();
    },

    // private, inherit docs
    onShow: function() {
        this.callParent(arguments);
        if (this.focusOnShow) {
            this.focus();
        }
    }
},

// After dependencies have loaded:
function() {
    var proto = this.prototype,
        date = Ext.Date;

    proto.monthNames = date.monthNames;
    proto.dayNames   = date.dayNames;
    proto.format     = date.defaultFormat;
});



/**
 * A time picker which provides a list of times from which to choose. This is used by the Ext.form.field.Time
 * class to allow browsing and selection of valid times, but could also be used with other components.
 *
 * By default, all times starting at midnight and incrementing every 15 minutes will be presented. This list of
 * available times can be controlled using the {@link #minValue}, {@link #maxValue}, and {@link #increment}
 * configuration properties. The format of the times presented in the list can be customized with the {@link #format}
 * config.
 *
 * To handle when the user selects a time from the list, you can subscribe to the {@link #selectionchange} event.
 *
 *     @example
 *     Ext.create('Ext.picker.Time', {
 *        width: 60,
 *        minValue: Ext.Date.parse('04:30:00 AM', 'h:i:s A'),
 *        maxValue: Ext.Date.parse('08:00:00 AM', 'h:i:s A'),
 *        renderTo: Ext.getBody()
 *     });
 */
Ext.define('Ext.picker.Time', {
    extend: 'Ext.view.BoundList',
    alias: 'widget.timepicker',
    requires: ['Ext.data.Store', 'Ext.Date'],

    /**
     * @cfg {Date} minValue
     * The minimum time to be shown in the list of times. This must be a Date object (only the time fields will be
     * used); no parsing of String values will be done.
     */

    /**
     * @cfg {Date} maxValue
     * The maximum time to be shown in the list of times. This must be a Date object (only the time fields will be
     * used); no parsing of String values will be done.
     */

    /**
     * @cfg {Number} increment
     * The number of minutes between each time value in the list.
     */
    increment: 15,

    //<locale>
    /**
     * @cfg {String} [format=undefined]
     * The default time format string which can be overriden for localization support. The format must be valid
     * according to {@link Ext.Date#parse}.
     *
     * Defaults to `'g:i A'`, e.g., `'3:15 PM'`. For 24-hour time format try `'H:i'` instead.
     */
    format : "g:i A",
    //</locale>

    /**
     * @private
     * The field in the implicitly-generated Model objects that gets displayed in the list. This is
     * an internal field name only and is not useful to change via config.
     */
    displayField: 'disp',

    /**
     * @private
     * Year, month, and day that all times will be normalized into internally.
     */
    initDate: [2008,0,1],

    componentCls: Ext.baseCSSPrefix + 'timepicker',

    /**
     * @cfg
     * @private
     */
    loadMask: false,

    initComponent: function() {
        var me = this,
            dateUtil = Ext.Date,
            clearTime = dateUtil.clearTime,
            initDate = me.initDate;

        // Set up absolute min and max for the entire day
        me.absMin = clearTime(new Date(initDate[0], initDate[1], initDate[2]));
        me.absMax = dateUtil.add(clearTime(new Date(initDate[0], initDate[1], initDate[2])), 'mi', (24 * 60) - 1);

        me.store = me.createStore();
        me.updateList();

        me.callParent();
    },

    /**
     * Set the {@link #minValue} and update the list of available times. This must be a Date object (only the time
     * fields will be used); no parsing of String values will be done.
     * @param {Date} value
     */
    setMinValue: function(value) {
        this.minValue = value;
        this.updateList();
    },

    /**
     * Set the {@link #maxValue} and update the list of available times. This must be a Date object (only the time
     * fields will be used); no parsing of String values will be done.
     * @param {Date} value
     */
    setMaxValue: function(value) {
        this.maxValue = value;
        this.updateList();
    },

    /**
     * @private
     * Sets the year/month/day of the given Date object to the {@link #initDate}, so that only
     * the time fields are significant. This makes values suitable for time comparison.
     * @param {Date} date
     */
    normalizeDate: function(date) {
        var initDate = this.initDate;
        date.setFullYear(initDate[0], initDate[1], initDate[2]);
        return date;
    },

    /**
     * Update the list of available times in the list to be constrained within the {@link #minValue}
     * and {@link #maxValue}.
     */
    updateList: function() {
        var me = this,
            min = me.normalizeDate(me.minValue || me.absMin),
            max = me.normalizeDate(me.maxValue || me.absMax);

        me.store.filterBy(function(record) {
            var date = record.get('date');
            return date >= min && date <= max;
        });
    },

    /**
     * @private
     * Creates the internal {@link Ext.data.Store} that contains the available times. The store
     * is loaded with all possible times, and it is later filtered to hide those times outside
     * the minValue/maxValue.
     */
    createStore: function() {
        var me = this,
            utilDate = Ext.Date,
            times = [],
            min = me.absMin,
            max = me.absMax;

        while(min <= max){
            times.push({
                disp: utilDate.dateFormat(min, me.format),
                date: min
            });
            min = utilDate.add(min, 'mi', me.increment);
        }

        return new Ext.data.Store({
            fields: ['disp', 'date'],
            data: times
        });
    }

});