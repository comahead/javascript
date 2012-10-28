

/**
 * @class Ext.chart.Label
 *
 * Labels is a mixin to the Series class. Labels methods are implemented
 * in each of the Series (Pie, Bar, etc) for label creation and placement.
 *
 * The methods implemented by the Series are:
 *
 * - **`onCreateLabel(storeItem, item, i, display)`** Called each time a new label is created.
 *   The arguments of the method are:
 *   - *`storeItem`* The element of the store that is related to the label sprite.
 *   - *`item`* The item related to the label sprite. An item is an object containing the position of the shape
 *     used to describe the visualization and also pointing to the actual shape (circle, rectangle, path, etc).
 *   - *`i`* The index of the element created (i.e the first created label, second created label, etc)
 *   - *`display`* The display type. May be <b>false</b> if the label is hidden
 *
 *  - **`onPlaceLabel(label, storeItem, item, i, display, animate)`** Called for updating the position of the label.
 *    The arguments of the method are:
 *    - *`label`* The sprite label.</li>
 *    - *`storeItem`* The element of the store that is related to the label sprite</li>
 *    - *`item`* The item related to the label sprite. An item is an object containing the position of the shape
 *      used to describe the visualization and also pointing to the actual shape (circle, rectangle, path, etc).
 *    - *`i`* The index of the element to be updated (i.e. whether it is the first, second, third from the labelGroup)
 *    - *`display`* The display type. May be <b>false</b> if the label is hidden.
 *    - *`animate`* A boolean value to set or unset animations for the labels.
 */
Ext.define('Ext.chart.Label', {

    /* Begin Definitions */

    requires: ['Ext.draw.Color'],

    /* End Definitions */

    /**
     * @cfg {Object} label
     * Object with the following properties:
     *
     * - **display** : String
     *
     *   Specifies the presence and position of labels for each pie slice. Either "rotate", "middle", "insideStart",
     *   "insideEnd", "outside", "over", "under", or "none" to prevent label rendering.
     *   Default value: 'none'.
     *
     * - **color** : String
     *
     *   The color of the label text.
     *   Default value: '#000' (black).
     *
     * - **contrast** : Boolean
     *
     *   True to render the label in contrasting color with the backround.
     *   Default value: false.
     *
     * - **field** : String
     *
     *   The name of the field to be displayed in the label.
     *   Default value: 'name'.
     *
     * - **minMargin** : Number
     *
     *   Specifies the minimum distance from a label to the origin of the visualization.
     *   This parameter is useful when using PieSeries width variable pie slice lengths.
     *   Default value: 50.
     *
     * - **font** : String
     *
     *   The font used for the labels.
     *   Default value: "11px Helvetica, sans-serif".
     *
     * - **orientation** : String
     *
     *   Either "horizontal" or "vertical".
     *   Dafault value: "horizontal".
     *
     * - **renderer** : Function
     *
     *   Optional function for formatting the label into a displayable value.
     *   Default value: function(v) { return v; }
     */

    // @private a regex to parse url type colors.
    colorStringRe: /url\s*\(\s*#([^\/)]+)\s*\)/,

    // @private the mixin constructor. Used internally by Series.
    constructor: function(config) {
        var me = this;
        me.label = Ext.applyIf(me.label || {},
        {
            display: "none",
            color: "#000",
            field: "name",
            minMargin: 50,
            font: "11px Helvetica, sans-serif",
            orientation: "horizontal",
            renderer: function(v) {
                return v;
            }
        });

        if (me.label.display !== 'none') {
            me.labelsGroup = me.chart.surface.getGroup(me.seriesId + '-labels');
        }
    },

    // @private a method to render all labels in the labelGroup
    renderLabels: function() {
        var me = this,
            chart = me.chart,
            gradients = chart.gradients,
            items = me.items,
            animate = chart.animate,
            config = me.label,
            display = config.display,
            color = config.color,
            field = [].concat(config.field),
            group = me.labelsGroup,
            groupLength = (group || 0) && group.length,
            store = me.chart.getChartStore(),
            len = store.getCount(),
            itemLength = (items || 0) && items.length,
            ratio = itemLength / len,
            gradientsCount = (gradients || 0) && gradients.length,
            Color = Ext.draw.Color,
            hides = [],
            gradient, i, count, groupIndex, index, j, k, colorStopTotal, colorStopIndex, colorStop, item, label,
            storeItem, sprite, spriteColor, spriteBrightness, labelColor, colorString;

        if (display == 'none') {
            return;
        }
        // no items displayed, hide all labels
        if(itemLength == 0){
            while(groupLength--) {
                hides.push(groupLength);
            }
        } else {
            for (i = 0, count = 0, groupIndex = 0; i < len; i++) {
                index = 0;
                for (j = 0; j < ratio; j++) {
                    item = items[count];
                    label = group.getAt(groupIndex);
                    storeItem = store.getAt(i);
                    //check the excludes
                    while(this.__excludes && this.__excludes[index]) {
                        index++;
                    }

                    if (!item && label) {
                        label.hide(true);
                        groupIndex++;
                    }

                    if (item && field[j]) {
                        if (!label) {
                            label = me.onCreateLabel(storeItem, item, i, display, j, index);
                        }
                        me.onPlaceLabel(label, storeItem, item, i, display, animate, j, index);
                        groupIndex++;

                        //set contrast
                        if (config.contrast && item.sprite) {
                            sprite = item.sprite;
                            //set the color string to the color to be set.
                            if (sprite._endStyle) {
                                colorString = sprite._endStyle.fill;
                            }
                            else if (sprite._to) {
                                colorString = sprite._to.fill;
                            }
                            else {
                                colorString = sprite.attr.fill;
                            }
                            colorString = colorString || sprite.attr.fill;

                            spriteColor = Color.fromString(colorString);
                            //color wasn't parsed property maybe because it's a gradient id
                            if (colorString && !spriteColor) {
                                colorString = colorString.match(me.colorStringRe)[1];
                                for (k = 0; k < gradientsCount; k++) {
                                    gradient = gradients[k];
                                    if (gradient.id == colorString) {
                                        //avg color stops
                                        colorStop = 0; colorStopTotal = 0;
                                        for (colorStopIndex in gradient.stops) {
                                            colorStop++;
                                            colorStopTotal += Color.fromString(gradient.stops[colorStopIndex].color).getGrayscale();
                                        }
                                        spriteBrightness = (colorStopTotal / colorStop) / 255;
                                        break;
                                    }
                                }
                            }
                            else {
                                spriteBrightness = spriteColor.getGrayscale() / 255;
                            }
                            if (label.isOutside) {
                                spriteBrightness = 1;
                            }
                            labelColor = Color.fromString(label.attr.color || label.attr.fill).getHSL();
                            labelColor[2] = spriteBrightness > 0.5 ? 0.2 : 0.8;
                            label.setAttributes({
                                fill: String(Color.fromHSL.apply({}, labelColor))
                            }, true);
                        }

                    }
                    count++;
                    index++;
                }
            }
            groupLength = group.length;
        
            while(groupLength > groupIndex){
                hides.push(groupIndex);
                groupIndex++;
           }
        }
        me.hideLabels(hides);
    },

    hideLabels: function(hides){
        var labelsGroup = this.labelsGroup,
            hlen = !!hides && hides.length;

        if (!labelsGroup) {
            return;
        }

        if (hlen === false) {
            hlen = labelsGroup.getCount();
            while (hlen--) {
              labelsGroup.getAt(hlen).hide(true);
            }
        } else {
            while(hlen--) {
                labelsGroup.getAt(hides[hlen]).hide(true);
            }
        }
    }
});

/**
 * @class Ext.chart.theme.Theme
 * 
 * Provides chart theming.
 * 
 * Used as mixins by Ext.chart.Chart.
 */
Ext.define('Ext.chart.theme.Theme', {

    /* Begin Definitions */

    requires: ['Ext.draw.Color'],

    /* End Definitions */

    theme: 'Base',
    themeAttrs: false,
    
    initTheme: function(theme) {
        var me = this,
            themes = Ext.chart.theme,
            key, gradients;
        if (theme) {
            theme = theme.split(':');
            for (key in themes) {
                if (key == theme[0]) {
                    gradients = theme[1] == 'gradients';
                    me.themeAttrs = new themes[key]({
                        useGradients: gradients
                    });
                    if (gradients) {
                        me.gradients = me.themeAttrs.gradients;
                    }
                    if (me.themeAttrs.background) {
                        me.background = me.themeAttrs.background;
                    }
                    return;
                }
            }
            Ext.Error.raise('No theme found named "' + theme + '"');
        }
    }
}, 
// This callback is executed right after when the class is created. This scope refers to the newly created class itself
function() {
   /* Theme constructor: takes either a complex object with styles like:
  
   {
        axis: {
            fill: '#000',
            'stroke-width': 1
        },
        axisLabelTop: {
            fill: '#000',
            font: '11px Arial'
        },
        axisLabelLeft: {
            fill: '#000',
            font: '11px Arial'
        },
        axisLabelRight: {
            fill: '#000',
            font: '11px Arial'
        },
        axisLabelBottom: {
            fill: '#000',
            font: '11px Arial'
        },
        axisTitleTop: {
            fill: '#000',
            font: '11px Arial'
        },
        axisTitleLeft: {
            fill: '#000',
            font: '11px Arial'
        },
        axisTitleRight: {
            fill: '#000',
            font: '11px Arial'
        },
        axisTitleBottom: {
            fill: '#000',
            font: '11px Arial'
        },
        series: {
            'stroke-width': 1
        },
        seriesLabel: {
            font: '12px Arial',
            fill: '#333'
        },
        marker: {
            stroke: '#555',
            fill: '#000',
            radius: 3,
            size: 3
        },
        seriesThemes: [{
            fill: '#C6DBEF'
        }, {
            fill: '#9ECAE1'
        }, {
            fill: '#6BAED6'
        }, {
            fill: '#4292C6'
        }, {
            fill: '#2171B5'
        }, {
            fill: '#084594'
        }],
        markerThemes: [{
            fill: '#084594',
            type: 'circle' 
        }, {
            fill: '#2171B5',
            type: 'cross'
        }, {
            fill: '#4292C6',
            type: 'plus'
        }]
    }
  
  ...or also takes just an array of colors and creates the complex object:
  
  {
      colors: ['#aaa', '#bcd', '#eee']
  }
  
  ...or takes just a base color and makes a theme from it
  
  {
      baseColor: '#bce'
  }
  
  To create a new theme you may add it to the Themes object:
  
  Ext.chart.theme.MyNewTheme = Ext.extend(Object, {
      constructor: function(config) {
          Ext.chart.theme.call(this, config, {
              baseColor: '#mybasecolor'
          });
      }
  });
  
  //Proposal:
  Ext.chart.theme.MyNewTheme = Ext.chart.createTheme('#basecolor');
  
  ...and then to use it provide the name of the theme (as a lower case string) in the chart config.
  
  {
      theme: 'mynewtheme'
  }
 */

(function() {
    Ext.chart.theme = function(config, base) {
        config = config || {};
        var i = 0, d = +new Date(), l, colors, color,
            seriesThemes, markerThemes,
            seriesTheme, markerTheme, 
            key, gradients = [],
            midColor, midL;
        
        if (config.baseColor) {
            midColor = Ext.draw.Color.fromString(config.baseColor);
            midL = midColor.getHSL()[2];
            if (midL < 0.15) {
                midColor = midColor.getLighter(0.3);
            } else if (midL < 0.3) {
                midColor = midColor.getLighter(0.15);
            } else if (midL > 0.85) {
                midColor = midColor.getDarker(0.3);
            } else if (midL > 0.7) {
                midColor = midColor.getDarker(0.15);
            }
            config.colors = [ midColor.getDarker(0.3).toString(),
                              midColor.getDarker(0.15).toString(),
                              midColor.toString(),
                              midColor.getLighter(0.15).toString(),
                              midColor.getLighter(0.3).toString()];

            delete config.baseColor;
        }
        if (config.colors) {
            colors = config.colors.slice();
            markerThemes = base.markerThemes;
            seriesThemes = base.seriesThemes;
            l = colors.length;
            base.colors = colors;
            for (; i < l; i++) {
                color = colors[i];
                markerTheme = markerThemes[i] || {};
                seriesTheme = seriesThemes[i] || {};
                markerTheme.fill = seriesTheme.fill = markerTheme.stroke = seriesTheme.stroke = color;
                markerThemes[i] = markerTheme;
                seriesThemes[i] = seriesTheme;
            }
            base.markerThemes = markerThemes.slice(0, l);
            base.seriesThemes = seriesThemes.slice(0, l);
        //the user is configuring something in particular (either markers, series or pie slices)
        }
        for (key in base) {
            if (key in config) {
                if (Ext.isObject(config[key]) && Ext.isObject(base[key])) {
                    Ext.apply(base[key], config[key]);
                } else {
                    base[key] = config[key];
                }
            }
        }
        if (config.useGradients) {
            colors = base.colors || (function () {
                var ans = [];
                for (i = 0, seriesThemes = base.seriesThemes, l = seriesThemes.length; i < l; i++) {
                    ans.push(seriesThemes[i].fill || seriesThemes[i].stroke);
                }
                return ans;
            }());
            for (i = 0, l = colors.length; i < l; i++) {
                midColor = Ext.draw.Color.fromString(colors[i]);
                if (midColor) {
                    color = midColor.getDarker(0.1).toString();
                    midColor = midColor.toString();
                    key = 'theme-' + midColor.substr(1) + '-' + color.substr(1) + '-' + d;
                    gradients.push({
                        id: key,
                        angle: 45,
                        stops: {
                            0: {
                                color: midColor.toString()
                            },
                            100: {
                                color: color.toString()
                            }
                        }
                    });
                    colors[i] = 'url(#' + key + ')'; 
                }
            }
            base.gradients = gradients;
            base.colors = colors;
        }
        /*
        base.axis = Ext.apply(base.axis || {}, config.axis || {});
        base.axisLabel = Ext.apply(base.axisLabel || {}, config.axisLabel || {});
        base.axisTitle = Ext.apply(base.axisTitle || {}, config.axisTitle || {});
        */
        Ext.apply(this, base);
    };
}());
});

/**
 * Provides default colors for non-specified things. Should be sub-classed when creating new themes.
 * @private
 */
Ext.define('Ext.chart.theme.Base', {

    /* Begin Definitions */

    requires: ['Ext.chart.theme.Theme'],

    /* End Definitions */

    constructor: function(config) {
        Ext.chart.theme.call(this, config, {
            background: false,
            axis: {
                stroke: '#444',
                'stroke-width': 1
            },
            axisLabelTop: {
                fill: '#444',
                font: '12px Arial, Helvetica, sans-serif',
                spacing: 2,
                padding: 5,
                renderer: function(v) { return v; }
            },
            axisLabelRight: {
                fill: '#444',
                font: '12px Arial, Helvetica, sans-serif',
                spacing: 2,
                padding: 5,
                renderer: function(v) { return v; }
            },
            axisLabelBottom: {
                fill: '#444',
                font: '12px Arial, Helvetica, sans-serif',
                spacing: 2,
                padding: 5,
                renderer: function(v) { return v; }
            },
            axisLabelLeft: {
                fill: '#444',
                font: '12px Arial, Helvetica, sans-serif',
                spacing: 2,
                padding: 5,
                renderer: function(v) { return v; }
            },
            axisTitleTop: {
                font: 'bold 18px Arial',
                fill: '#444'
            },
            axisTitleRight: {
                font: 'bold 18px Arial',
                fill: '#444',
                rotate: {
                    x:0, y:0,
                    degrees: 270
                }
            },
            axisTitleBottom: {
                font: 'bold 18px Arial',
                fill: '#444'
            },
            axisTitleLeft: {
                font: 'bold 18px Arial',
                fill: '#444',
                rotate: {
                    x:0, y:0,
                    degrees: 270
                }
            },
            series: {
                'stroke-width': 0
            },
            seriesLabel: {
                font: '12px Arial',
                fill: '#333'
            },
            marker: {
                stroke: '#555',
                radius: 3,
                size: 3
            },
            colors: [ "#94ae0a", "#115fa6","#a61120", "#ff8809", "#ffd13e", "#a61187", "#24ad9a", "#7c7474", "#a66111"],
            seriesThemes: [{
                fill: "#115fa6"
            }, {
                fill: "#94ae0a"
            }, {
                fill: "#a61120"
            }, {
                fill: "#ff8809"
            }, {
                fill: "#ffd13e"
            }, {
                fill: "#a61187"
            }, {
                fill: "#24ad9a"
            }, {
                fill: "#7c7474"
            }, {
                fill: "#115fa6"
            }, {
                fill: "#94ae0a"
            }, {
                fill: "#a61120"
            }, {
                fill: "#ff8809"
            }, {
                fill: "#ffd13e"
            }, {
                fill: "#a61187"
            }, {
                fill: "#24ad9a"
            }, {
                fill: "#7c7474"
            }, {
                fill: "#a66111"
            }],
            markerThemes: [{
                fill: "#115fa6",
                type: 'circle' 
            }, {
                fill: "#94ae0a",
                type: 'cross'
            }, {
                fill: "#115fa6",
                type: 'plus' 
            }, {
                fill: "#94ae0a",
                type: 'circle'
            }, {
                fill: "#a61120",
                type: 'cross'
            }]
        });
    }
}, function() {
    var palette = ['#b1da5a', '#4ce0e7', '#e84b67', '#da5abd', '#4d7fe6', '#fec935'],
        names = ['Green', 'Sky', 'Red', 'Purple', 'Blue', 'Yellow'],
        i = 0, j = 0, l = palette.length, themes = Ext.chart.theme,
        categories = [['#f0a50a', '#c20024', '#2044ba', '#810065', '#7eae29'],
                      ['#6d9824', '#87146e', '#2a9196', '#d39006', '#1e40ac'],
                      ['#fbbc29', '#ce2e4e', '#7e0062', '#158b90', '#57880e'],
                      ['#ef5773', '#fcbd2a', '#4f770d', '#1d3eaa', '#9b001f'],
                      ['#7eae29', '#fdbe2a', '#910019', '#27b4bc', '#d74dbc'],
                      ['#44dce1', '#0b2592', '#996e05', '#7fb325', '#b821a1']],
        cats = categories.length;
    
    //Create themes from base colors
    for (; i < l; i++) {
        themes[names[i]] = (function(color) {
            return Ext.extend(themes.Base, {
                constructor: function(config) {
                    themes.Base.prototype.constructor.call(this, Ext.apply({
                        baseColor: color
                    }, config));
                }
            });
        }(palette[i]));
    }
    
    //Create theme from color array
    for (i = 0; i < cats; i++) {
        themes['Category' + (i + 1)] = (function(category) {
            return Ext.extend(themes.Base, {
                constructor: function(config) {
                    themes.Base.prototype.constructor.call(this, Ext.apply({
                        colors: category
                    }, config));
                }
            });
        }(categories[i]));
    }
});




/**
 * @class Ext.chart.LegendItem
 * A single item of a legend (marker plus label)
 */
Ext.define('Ext.chart.LegendItem', {

    /* Begin Definitions */

    extend: 'Ext.draw.CompositeSprite',

    requires: ['Ext.chart.Shape'],

    /* End Definitions */

    // Position of the item, relative to the upper-left corner of the legend box
    x: 0,
    y: 0,
    zIndex: 500,

    // checks to make sure that a unit size follows the bold keyword in the font style value
    boldRe: /bold\s\d{1,}.*/i,

    constructor: function(config) {
        this.callParent(arguments);
        this.createLegend(config);
    },

    /**
     * Creates all the individual sprites for this legend item
     */
    createLegend: function(config) {
        var me = this,
            index = config.yFieldIndex,
            series = me.series,
            seriesType = series.type,
            idx = me.yFieldIndex,
            legend = me.legend,
            surface = me.surface,
            refX = legend.x + me.x,
            refY = legend.y + me.y,
            bbox, z = me.zIndex,
            markerConfig, label, mask,
            radius, toggle = false,
            seriesStyle = Ext.apply(series.seriesStyle, series.style);

        function getSeriesProp(name) {
            var val = series[name];
            return (Ext.isArray(val) ? val[idx] : val);
        }
        
        label = me.add('label', surface.add({
            type: 'text',
            x: 20,
            y: 0,
            zIndex: (z || 0) + 2,
            fill: legend.labelColor,
            font: legend.labelFont,
            text: getSeriesProp('title') || getSeriesProp('yField'),
            style: {
                'cursor': 'pointer'
            }
        }));

        // Line series - display as short line with optional marker in the middle
        if (seriesType === 'line' || seriesType === 'scatter') {
            if(seriesType === 'line') {
                me.add('line', surface.add({
                    type: 'path',
                    path: 'M0.5,0.5L16.5,0.5',
                    zIndex: (z || 0) + 2,
                    "stroke-width": series.lineWidth,
                    "stroke-linejoin": "round",
                    "stroke-dasharray": series.dash,
                    stroke: seriesStyle.stroke || series.getLegendColor(index) || '#000',
                    style: {
                        cursor: 'pointer'
                    }
                }));
            }
            if (series.showMarkers || seriesType === 'scatter') {
                markerConfig = Ext.apply(series.markerStyle, series.markerConfig || {}, {
                    fill: series.getLegendColor(index)
                });
                me.add('marker', Ext.chart.Shape[markerConfig.type](surface, {
                    fill: markerConfig.fill,
                    x: 8.5,
                    y: 0.5,
                    zIndex: (z || 0) + 2,
                    radius: markerConfig.radius || markerConfig.size,
                    style: {
                        cursor: 'pointer'
                    }
                }));
            }
        }
        // All other series types - display as filled box
        else {
            me.add('box', surface.add({
                type: 'rect',
                zIndex: (z || 0) + 2,
                x: 0,
                y: 0,
                width: 12,
                height: 12,
                fill: series.getLegendColor(index),
                style: {
                    cursor: 'pointer'
                }
            }));
        }
        
        me.setAttributes({
            hidden: false
        }, true);
        
        bbox = me.getBBox();
        
        mask = me.add('mask', surface.add({
            type: 'rect',
            x: bbox.x,
            y: bbox.y,
            width: bbox.width || 20,
            height: bbox.height || 20,
            zIndex: (z || 0) + 1,
            fill: me.legend.boxFill,
            style: {
                'cursor': 'pointer'
            }
        }));

        //add toggle listener
        me.on('mouseover', function() {
            label.setStyle({
                'font-weight': 'bold'
            });
            mask.setStyle({
                'cursor': 'pointer'
            });
            series._index = index;
            series.highlightItem();
        }, me);

        me.on('mouseout', function() {
            label.setStyle({
                'font-weight': legend.labelFont && me.boldRe.test(legend.labelFont) ? 'bold' : 'normal'
            });
            series._index = index;
            series.unHighlightItem();
        }, me);
        
        if (!series.visibleInLegend(index)) {
            toggle = true;
            label.setAttributes({
               opacity: 0.5
            }, true);
        }

        me.on('mousedown', function() {
            if (!toggle) {
                series.hideAll(index);
                label.setAttributes({
                    opacity: 0.5
                }, true);
            } else {
                series.showAll(index);
                label.setAttributes({
                    opacity: 1
                }, true);
            }
            toggle = !toggle;
            me.legend.chart.redraw();
        }, me);
        me.updatePosition({x:0, y:0}); //Relative to 0,0 at first so that the bbox is calculated correctly
    },

    /**
     * Update the positions of all this item's sprites to match the root position
     * of the legend box.
     * @param {Object} relativeTo (optional) If specified, this object's 'x' and 'y' values will be used
     *                 as the reference point for the relative positioning. Defaults to the Legend.
     */
    updatePosition: function(relativeTo) {
        var me = this,
            items = me.items,
            ln = items.length,
            i = 0,
            item;
        if (!relativeTo) {
            relativeTo = me.legend;
        }
        for (; i < ln; i++) {
            item = items[i];
            switch (item.type) {
                case 'text':
                    item.setAttributes({
                        x: 20 + relativeTo.x + me.x,
                        y: relativeTo.y + me.y
                    }, true);
                    break;
                case 'rect':
                    item.setAttributes({
                        translate: {
                            x: relativeTo.x + me.x,
                            y: relativeTo.y + me.y - 6
                        }
                    }, true);
                    break;
                default:
                    item.setAttributes({
                        translate: {
                            x: relativeTo.x + me.x,
                            y: relativeTo.y + me.y
                        }
                    }, true);
            }
        }
    }
});

/**
 * @class Ext.chart.Legend
 *
 * Defines a legend for a chart's series.
 * The 'chart' member must be set prior to rendering.
 * The legend class displays a list of legend items each of them related with a
 * series being rendered. In order to render the legend item of the proper series
 * the series configuration object must have `showInLegend` set to true.
 *
 * The legend configuration object accepts a `position` as parameter.
 * The `position` parameter can be `left`, `right`
 * `top` or `bottom`. For example:
 *
 *     legend: {
 *         position: 'right'
 *     },
 *
 * ## Example
 *
 *     @example
 *     var store = Ext.create('Ext.data.JsonStore', {
 *         fields: ['name', 'data1', 'data2', 'data3', 'data4', 'data5'],
 *         data: [
 *             { 'name': 'metric one',   'data1': 10, 'data2': 12, 'data3': 14, 'data4': 8,  'data5': 13 },
 *             { 'name': 'metric two',   'data1': 7,  'data2': 8,  'data3': 16, 'data4': 10, 'data5': 3  },
 *             { 'name': 'metric three', 'data1': 5,  'data2': 2,  'data3': 14, 'data4': 12, 'data5': 7  },
 *             { 'name': 'metric four',  'data1': 2,  'data2': 14, 'data3': 6,  'data4': 1,  'data5': 23 },
 *             { 'name': 'metric five',  'data1': 27, 'data2': 38, 'data3': 36, 'data4': 13, 'data5': 33 }
 *         ]
 *     });
 *
 *     Ext.create('Ext.chart.Chart', {
 *         renderTo: Ext.getBody(),
 *         width: 500,
 *         height: 300,
 *         animate: true,
 *         store: store,
 *         shadow: true,
 *         theme: 'Category1',
 *         legend: {
 *             position: 'top'
 *         },
 *         axes: [
 *             {
 *                 type: 'Numeric',
 *                 grid: true,
 *                 position: 'left',
 *                 fields: ['data1', 'data2', 'data3', 'data4', 'data5'],
 *                 title: 'Sample Values',
 *                 grid: {
 *                     odd: {
 *                         opacity: 1,
 *                         fill: '#ddd',
 *                         stroke: '#bbb',
 *                         'stroke-width': 1
 *                     }
 *                 },
 *                 minimum: 0,
 *                 adjustMinimumByMajorUnit: 0
 *             },
 *             {
 *                 type: 'Category',
 *                 position: 'bottom',
 *                 fields: ['name'],
 *                 title: 'Sample Metrics',
 *                 grid: true,
 *                 label: {
 *                     rotate: {
 *                         degrees: 315
 *                     }
 *                 }
 *             }
 *         ],
 *         series: [{
 *             type: 'area',
 *             highlight: false,
 *             axis: 'left',
 *             xField: 'name',
 *             yField: ['data1', 'data2', 'data3', 'data4', 'data5'],
 *             style: {
 *                 opacity: 0.93
 *             }
 *         }]
 *     });
 */
Ext.define('Ext.chart.Legend', {

    /* Begin Definitions */

    requires: ['Ext.chart.LegendItem'],

    /* End Definitions */

    /**
     * @cfg {Boolean} visible
     * Whether or not the legend should be displayed.
     */
    visible: true,
    
    /**
     * @cfg {Boolean} update
     * If set to true the legend will be refreshed when the chart is.
     * This is useful to update the legend items if series are
     * added/removed/updated from the chart. Default is true.
     */
    update: true,

    /**
     * @cfg {String} position
     * The position of the legend in relation to the chart. One of: "top",
     * "bottom", "left", "right", or "float". If set to "float", then the legend
     * box will be positioned at the point denoted by the x and y parameters.
     */
    position: 'bottom',

    /**
     * @cfg {Number} x
     * X-position of the legend box. Used directly if position is set to "float", otherwise
     * it will be calculated dynamically.
     */
    x: 0,

    /**
     * @cfg {Number} y
     * Y-position of the legend box. Used directly if position is set to "float", otherwise
     * it will be calculated dynamically.
     */
    y: 0,

    /**
     * @cfg {String} labelColor
     * Color to be used for the legend labels, eg '#000'
     */
    labelColor: '#000',

    /**
     * @cfg {String} labelFont
     * Font to be used for the legend labels, eg '12px Helvetica'
     */
    labelFont: '12px Helvetica, sans-serif',

    /**
     * @cfg {String} boxStroke
     * Style of the stroke for the legend box
     */
    boxStroke: '#000',

    /**
     * @cfg {String} boxStrokeWidth
     * Width of the stroke for the legend box
     */
    boxStrokeWidth: 1,

    /**
     * @cfg {String} boxFill
     * Fill style for the legend box
     */
    boxFill: '#FFF',

    /**
     * @cfg {Number} itemSpacing
     * Amount of space between legend items
     */
    itemSpacing: 10,

    /**
     * @cfg {Number} padding
     * Amount of padding between the legend box's border and its items
     */
    padding: 5,

    // @private
    width: 0,
    // @private
    height: 0,

    /**
     * @cfg {Number} boxZIndex
     * Sets the z-index for the legend. Defaults to 100.
     */
    boxZIndex: 100,

    /**
     * Creates new Legend.
     * @param {Object} config  (optional) Config object.
     */
    constructor: function(config) {
        var me = this;
        if (config) {
            Ext.apply(me, config);
        }
        me.items = [];
        /**
         * Whether the legend box is oriented vertically, i.e. if it is on the left or right side or floating.
         * @type {Boolean}
         */
        me.isVertical = ("left|right|float".indexOf(me.position) !== -1);

        // cache these here since they may get modified later on
        me.origX = me.x;
        me.origY = me.y;
    },

    /**
     * @private Create all the sprites for the legend
     */
    create: function() {
        var me = this,
            seriesItems = me.chart.series.items,
            i, ln, series;

        me.createBox();
        
        if (me.rebuild !== false) {
            me.createItems();
        }
        
        if (!me.created && me.isDisplayed()) {
            me.created = true;

            // Listen for changes to series titles to trigger regeneration of the legend
            for (i = 0, ln = seriesItems.length; i < ln; i++) {
                series = seriesItems[i];
                series.on('titlechange', function() {
                    me.create();
                    me.updatePosition();
                });
            }
        }
    },

    /**
     * @private Determine whether the legend should be displayed. Looks at the legend's 'visible' config,
     * and also the 'showInLegend' config for each of the series.
     */
    isDisplayed: function() {
        return this.visible && this.chart.series.findIndex('showInLegend', true) !== -1;
    },

    /**
     * @private Create the series markers and labels
     */
    createItems: function() {
        var me = this,
            chart = me.chart,
            seriesItems = chart.series.items,
            ln, series,
            surface = chart.surface,
            items = me.items,
            padding = me.padding,
            itemSpacing = me.itemSpacing,
            spacingOffset = 2,
            maxWidth = 0,
            maxHeight = 0,
            totalWidth = 0,
            totalHeight = 0,
            vertical = me.isVertical,
            math = Math,
            mfloor = math.floor,
            mmax = math.max,
            index = 0,
            i = 0,
            len = items ? items.length : 0,
            x, y, spacing, item, bbox, height, width,
            fields, field, nFields, j;

        //remove all legend items
        if (len) {
            for (; i < len; i++) {
                items[i].destroy();
            }
        }
        //empty array
        items.length = [];
        // Create all the item labels, collecting their dimensions and positioning each one
        // properly in relation to the previous item
        for (i = 0, ln = seriesItems.length; i < ln; i++) {
            series = seriesItems[i];
            if (series.showInLegend) {
                fields = [].concat(series.yField);
                for (j = 0, nFields = fields.length; j < nFields; j++) {
                    field = fields[j];
                    item = new Ext.chart.LegendItem({
                        legend: this,
                        series: series,
                        surface: chart.surface,
                        yFieldIndex: j
                    });
                    bbox = item.getBBox();

                    //always measure from x=0, since not all markers go all the way to the left
                    width = bbox.width;
                    height = bbox.height;

                    if (i + j === 0) {
                        spacing = vertical ? padding + height / 2 : padding;
                    }
                    else {
                        spacing = itemSpacing / (vertical ? 2 : 1);
                    }
                    // Set the item's position relative to the legend box
                    item.x = mfloor(vertical ? padding : totalWidth + spacing);
                    item.y = mfloor(vertical ? totalHeight + spacing : padding + height / 2);

                    // Collect cumulative dimensions
                    totalWidth += width + spacing;
                    totalHeight += height + spacing;
                    maxWidth = mmax(maxWidth, width);
                    maxHeight = mmax(maxHeight, height);

                    items.push(item);
                }
            }
        }

        // Store the collected dimensions for later
        me.width = mfloor((vertical ? maxWidth : totalWidth) + padding * 2);
        if (vertical && items.length === 1) {
            spacingOffset = 1;
        }
        me.height = mfloor((vertical ? totalHeight - spacingOffset * spacing : maxHeight) + (padding * 2));
        me.itemHeight = maxHeight;
    },

    /**
     * @private Get the bounds for the legend's outer box
     */
    getBBox: function() {
        var me = this;
        return {
            x: Math.round(me.x) - me.boxStrokeWidth / 2,
            y: Math.round(me.y) - me.boxStrokeWidth / 2,
            width: me.width,
            height: me.height
        };
    },

    /**
     * @private Create the box around the legend items
     */
    createBox: function() {
        var me = this,
            box, bbox;

        if (me.boxSprite) {
            me.boxSprite.destroy();
        }

        bbox = me.getBBox();
        //if some of the dimensions are NaN this means that we
        //cannot set a specific width/height for the legend
        //container. One possibility for this is that there are
        //actually no items to show in the legend, and the legend
        //should be hidden.
        if (isNaN(bbox.width) || isNaN(bbox.height)) {
            me.boxSprite = false;
            return;
        }
        
        box = me.boxSprite = me.chart.surface.add(Ext.apply({
            type: 'rect',
            stroke: me.boxStroke,
            "stroke-width": me.boxStrokeWidth,
            fill: me.boxFill,
            zIndex: me.boxZIndex
        }, bbox));

        box.redraw();
    },

    /**
     * @private Update the position of all the legend's sprites to match its current x/y values
     */
    updatePosition: function() {
        var me = this,
            items = me.items,
            i, ln,
            x, y,
            legendWidth = me.width || 0,
            legendHeight = me.height || 0,
            padding = me.padding,
            chart = me.chart,
            chartBBox = chart.chartBBox,
            insets = chart.insetPadding,
            chartWidth = chartBBox.width - (insets * 2),
            chartHeight = chartBBox.height - (insets * 2),
            chartX = chartBBox.x + insets,
            chartY = chartBBox.y + insets,
            surface = chart.surface,
            mfloor = Math.floor,
            bbox;

        if (me.isDisplayed()) {
            // Find the position based on the dimensions
            switch(me.position) {
                case "left":
                    x = insets;
                    y = mfloor(chartY + chartHeight / 2 - legendHeight / 2);
                    break;
                case "right":
                    x = mfloor(surface.width - legendWidth) - insets;
                    y = mfloor(chartY + chartHeight / 2 - legendHeight / 2);
                    break;
                case "top":
                    x = mfloor(chartX + chartWidth / 2 - legendWidth / 2);
                    y = insets;
                    break;
                case "bottom":
                    x = mfloor(chartX + chartWidth / 2 - legendWidth / 2);
                    y = mfloor(surface.height - legendHeight) - insets;
                    break;
                default:
                    x = mfloor(me.origX) + insets;
                    y = mfloor(me.origY) + insets;
            }
            me.x = x;
            me.y = y;

            // Update the position of each item
            for (i = 0, ln = items.length; i < ln; i++) {
                items[i].updatePosition();
            }

            bbox = me.getBBox();

            //if some of the dimensions are NaN this means that we
            //cannot set a specific width/height for the legend
            //container. One possibility for this is that there are
            //actually no items to show in the legend, and the legend
            //should be hidden.
            if (isNaN(bbox.width) || isNaN(bbox.height)) {
                if (me.boxSprite) {
                    me.boxSprite.hide(true);
                }
            } else {
                if (!me.boxSprite) {
                    me.createBox();
                }
                // Update the position of the outer box
                me.boxSprite.setAttributes(bbox, true);
                me.boxSprite.show(true);
            }
        }
    },
    
    /** toggle
     * @param {Boolean} Whether to show or hide the legend.
     *
     */
    toggle: function(show) {
      var me = this,
          i = 0,
          items = me.items,
          len = items.length;

      if (me.boxSprite) {
          if (show) {
              me.boxSprite.show(true);
          } else {
              me.boxSprite.hide(true);
          }
      }

      for (; i < len; ++i) {
          if (show) {
            items[i].show(true);
          } else {
              items[i].hide(true);
          }
      }

      me.visible = show;
    }
});



/**
 * @class Ext.chart.Highlight
 * A mixin providing highlight functionality for Ext.chart.series.Series.
 */
Ext.define('Ext.chart.Highlight', {

    /* Begin Definitions */

    requires: ['Ext.fx.Anim'],

    /* End Definitions */

    /**
     * Highlight the given series item.
     * @param {Boolean/Object} Default's false. Can also be an object width style properties (i.e fill, stroke, radius) 
     * or just use default styles per series by setting highlight = true.
     */
    highlight: false,

    highlightCfg : {
        fill: '#fdd',
        "stroke-width": 5,
        stroke: '#f55'
    },

    constructor: function(config) {
        if (config.highlight) {
            if (config.highlight !== true) { //is an object
                this.highlightCfg = Ext.merge(this.highlightCfg, config.highlight);
            }
        }
    },

    /**
     * Highlight the given series item.
     * @param {Object} item Info about the item; same format as returned by #getItemForPoint.
     */
    highlightItem: function(item) {
        if (!item) {
            return;
        }
        
        var me = this,
            sprite = item.sprite,
            opts = Ext.merge({}, me.highlightCfg, me.highlight),
            surface = me.chart.surface,
            animate = me.chart.animate,
            p, from, to, pi;

        if (!me.highlight || !sprite || sprite._highlighted) {
            return;
        }
        if (sprite._anim) {
            sprite._anim.paused = true;
        }
        sprite._highlighted = true;
        if (!sprite._defaults) {
            sprite._defaults = Ext.apply({}, sprite.attr);
            from = {};
            to = {};
            for (p in opts) {
                if (! (p in sprite._defaults)) {
                    sprite._defaults[p] = surface.availableAttrs[p];
                }
                from[p] = sprite._defaults[p];
                to[p] = opts[p];
                if (Ext.isObject(opts[p])) {
                    from[p] = {};
                    to[p] = {};
                    Ext.apply(sprite._defaults[p], sprite.attr[p]);
                    Ext.apply(from[p], sprite._defaults[p]);
                    for (pi in sprite._defaults[p]) {
                        if (! (pi in opts[p])) {
                            to[p][pi] = from[p][pi];
                        } else {
                            to[p][pi] = opts[p][pi];
                        }
                    }
                    for (pi in opts[p]) {
                        if (! (pi in to[p])) {
                            to[p][pi] = opts[p][pi];
                        }
                    }
                }
            }
            sprite._from = from;
            sprite._to = to;
            sprite._endStyle = to;
        }
        if (animate) {
            sprite._anim = new Ext.fx.Anim({
                target: sprite,
                from: sprite._from,
                to: sprite._to,
                duration: 150
            });
        } else {
            sprite.setAttributes(sprite._to, true);
        }
    },

    /**
     * Un-highlight any existing highlights
     */
    unHighlightItem: function() {
        if (!this.highlight || !this.items) {
            return;
        }

        var me = this,
            items = me.items,
            len = items.length,
            opts = Ext.merge({}, me.highlightCfg, me.highlight),
            animate = me.chart.animate,
            i = 0,
            obj, p, sprite;
        for (; i < len; i++) {
            if (!items[i]) {
                continue;
            }
            sprite = items[i].sprite;
            if (sprite && sprite._highlighted) {
                if (sprite._anim) {
                    sprite._anim.paused = true;
                }
                obj = {};
                for (p in opts) {
                    if (Ext.isObject(sprite._defaults[p])) {
                        obj[p] = {};
                        Ext.apply(obj[p], sprite._defaults[p]);
                    }
                    else {
                        obj[p] = sprite._defaults[p];
                    }
                }
                if (animate) {
                    //sprite._to = obj;
                    sprite._endStyle = obj;
                    sprite._anim = new Ext.fx.Anim({
                        target: sprite,
                        to: obj,
                        duration: 150
                    });
                }
                else {
                    sprite.setAttributes(obj, true);
                }
                delete sprite._highlighted;
                //delete sprite._defaults;
            }
        }
    },

    cleanHighlights: function() {
        if (!this.highlight) {
            return;
        }

        var group = this.group,
            markerGroup = this.markerGroup,
            i = 0,
            l;
        for (l = group.getCount(); i < l; i++) {
            delete group.getAt(i)._defaults;
        }
        if (markerGroup) {
            for (l = markerGroup.getCount(); i < l; i++) {
                delete markerGroup.getAt(i)._defaults;
            }
        }
    }
});




/**
 * @private
 */
Ext.define('Ext.chart.MaskLayer', {
    extend: 'Ext.Component',
    
    constructor: function(config) {
        config = Ext.apply(config || {}, {
            style: 'position:absolute;background-color:#888;cursor:move;opacity:0.6;border:1px solid #222;'
        });
        this.callParent([config]);    
    },
    
    initComponent: function() {
        var me = this;
        me.callParent(arguments);
        me.addEvents(
            'mousedown',
            'mouseup',
            'mousemove',
            'mouseenter',
            'mouseleave'
        );
    },

    initDraggable: function() {
        this.callParent(arguments);
        this.dd.onStart = function (e) {
            var me = this,
                comp = me.comp;
    
            // Cache the start [X, Y] array
            this.startPosition = comp.getPosition(true);
    
            // If client Component has a ghost method to show a lightweight version of itself
            // then use that as a drag proxy unless configured to liveDrag.
            if (comp.ghost && !comp.liveDrag) {
                 me.proxy = comp.ghost();
                 me.dragTarget = me.proxy.header.el;
            }
    
            // Set the constrainTo Region before we start dragging.
            if (me.constrain || me.constrainDelegate) {
                me.constrainTo = me.calculateConstrainRegion();
            }
        };
    }
});
/**
 * Defines a mask for a chart's series.
 * The 'chart' member must be set prior to rendering.
 *
 * A Mask can be used to select a certain region in a chart.
 * When enabled, the `select` event will be triggered when a
 * region is selected by the mask, allowing the user to perform
 * other tasks like zooming on that region, etc.
 *
 * In order to use the mask one has to set the Chart `mask` option to
 * `true`, `vertical` or `horizontal`. Then a possible configuration for the
 * listener could be:
 *
 *     items: {
 *         xtype: 'chart',
 *         animate: true,
 *         store: store1,
 *         mask: 'horizontal',
 *         listeners: {
 *             select: {
 *                 fn: function(me, selection) {
 *                     me.setZoom(selection);
 *                     me.mask.hide();
 *                 }
 *             }
 *         }
 *     }
 *
 * In this example we zoom the chart to that particular region. You can also get
 * a handle to a mask instance from the chart object. The `chart.mask` element is a
 * `Ext.Panel`.
 * 
 */
Ext.define('Ext.chart.Mask', {
    requires: [
        'Ext.chart.MaskLayer'
    ],
    
    /**
     * @cfg {Boolean/String} mask
     * Enables selecting a region on chart. True to enable any selection,
     * 'horizontal' or 'vertical' to restrict the selection to X or Y axis.
     *
     * The mask in itself will do nothing but fire 'select' event.
     * See {@link Ext.chart.Mask} for example.
     */

    /**
     * Creates new Mask.
     * @param {Object} [config] Config object.
     */
    constructor: function(config) {
        var me = this,
            resizeHandler;

        me.addEvents('select');

        if (config) {
            Ext.apply(me, config);
        }
        if (me.enableMask) {
            me.on('afterrender', function() {
                //create a mask layer component
                var comp = new Ext.chart.MaskLayer({
                    renderTo: me.el,
                    hidden: true
                });
                comp.el.on({
                    'mousemove': function(e) {
                        me.onMouseMove(e);
                    },
                    'mouseup': function(e) {
                        me.resized(e);
                    }
                });
                //create a resize handler for the component
                resizeHandler = new Ext.resizer.Resizer({
                    el: comp.el,
                    handles: 'all',
                    pinned: true
                });
                resizeHandler.on({
                    'resize': function(e) {
                        me.resized(e);    
                    }    
                });
                comp.initDraggable();
                me.maskType = me.mask;
                me.mask = comp;
                me.maskSprite = me.surface.add({
                    type: 'path',
                    path: ['M', 0, 0],
                    zIndex: 1001,
                    opacity: 0.7,
                    hidden: true,
                    stroke: '#444'
                });
            }, me, { single: true });
        }
    },
    
    resized: function(e) {
        var me = this,
            bbox = me.bbox || me.chartBBox,
            x = bbox.x,
            y = bbox.y,
            width = bbox.width,
            height = bbox.height,
            box = me.mask.getBox(true),
            max = Math.max,
            min = Math.min,
            staticX = box.x - x,
            staticY = box.y - y;
        
        staticX = max(staticX, x);
        staticY = max(staticY, y);
        staticX = min(staticX, width);
        staticY = min(staticY, height);
        box.x = staticX;
        box.y = staticY;
        me.fireEvent('select', me, box);
    },

    onMouseUp: function(e) {
        var me = this,
            bbox = me.bbox || me.chartBBox,
            sel = me.maskSelection;
        me.maskMouseDown = false;
        me.mouseDown = false;
        if (me.mouseMoved) {
            me.onMouseMove(e);
            me.mouseMoved = false;
            me.fireEvent('select', me, {
                x: sel.x - bbox.x,
                y: sel.y - bbox.y,
                width: sel.width,
                height: sel.height
            });
        }
    },

    onMouseDown: function(e) {
        var me = this;
        me.mouseDown = true;
        me.mouseMoved = false;
        me.maskMouseDown = {
            x: e.getPageX() - me.el.getX(),
            y: e.getPageY() - me.el.getY()
        };
    },

    onMouseMove: function(e) {
        var me = this,
            mask = me.maskType,
            bbox = me.bbox || me.chartBBox,
            x = bbox.x,
            y = bbox.y,
            math = Math,
            floor = math.floor,
            abs = math.abs,
            min = math.min,
            max = math.max,
            height = floor(y + bbox.height),
            width = floor(x + bbox.width),
            posX = e.getPageX(),
            posY = e.getPageY(),
            staticX = posX - me.el.getX(),
            staticY = posY - me.el.getY(),
            maskMouseDown = me.maskMouseDown,
            path;
        
        me.mouseMoved = me.mouseDown;
        staticX = max(staticX, x);
        staticY = max(staticY, y);
        staticX = min(staticX, width);
        staticY = min(staticY, height);
        if (maskMouseDown && me.mouseDown) {
            if (mask == 'horizontal') {
                staticY = y;
                maskMouseDown.y = height;
                posY = me.el.getY() + bbox.height + me.insetPadding;
            }
            else if (mask == 'vertical') {
                staticX = x;
                maskMouseDown.x = width;
            }
            width = maskMouseDown.x - staticX;
            height = maskMouseDown.y - staticY;
            path = ['M', staticX, staticY, 'l', width, 0, 0, height, -width, 0, 'z'];
            me.maskSelection = {
                x: width > 0 ? staticX : staticX + width,
                y: height > 0 ? staticY : staticY + height,
                width: abs(width),
                height: abs(height)
            };
            me.mask.updateBox(me.maskSelection);
            me.mask.show();
            me.maskSprite.setAttributes({
                hidden: true    
            }, true);
        }
        else {
            if (mask == 'horizontal') {
                path = ['M', staticX, y, 'L', staticX, height];
            }
            else if (mask == 'vertical') {
                path = ['M', x, staticY, 'L', width, staticY];
            }
            else {
                path = ['M', staticX, y, 'L', staticX, height, 'M', x, staticY, 'L', width, staticY];
            }
            me.maskSprite.setAttributes({
                path: path,
                fill: me.maskMouseDown ? me.maskSprite.stroke : false,
                'stroke-width': mask === true ? 1 : 3,
                hidden: false
            }, true);
        }
    },

    onMouseLeave: function(e) {
        var me = this;
        me.mouseMoved = false;
        me.mouseDown = false;
        me.maskMouseDown = false;
        me.mask.hide();
        me.maskSprite.hide(true);
    }
});
    


/**
 * Charts provide a flexible way to achieve a wide range of data visualization capablitities.
 * Each Chart gets its data directly from a {@link Ext.data.Store Store}, and automatically
 * updates its display whenever data in the Store changes. In addition, the look and feel
 * of a Chart can be customized using {@link Ext.chart.theme.Theme Theme}s.
 * 
 * ## Creating a Simple Chart
 * 
 * Every Chart has three key parts - a {@link Ext.data.Store Store} that contains the data,
 * an array of {@link Ext.chart.axis.Axis Axes} which define the boundaries of the Chart,
 * and one or more {@link Ext.chart.series.Series Series} to handle the visual rendering of the data points.
 * 
 * ### 1. Creating a Store
 * 
 * The first step is to create a {@link Ext.data.Model Model} that represents the type of
 * data that will be displayed in the Chart. For example the data for a chart that displays
 * a weather forecast could be represented as a series of "WeatherPoint" data points with
 * two fields - "temperature", and "date":
 * 
 *     Ext.define('WeatherPoint', {
 *         extend: 'Ext.data.Model',
 *         fields: ['temperature', 'date']
 *     });
 * 
 * Next a {@link Ext.data.Store Store} must be created.  The store contains a collection of "WeatherPoint" Model instances.
 * The data could be loaded dynamically, but for sake of ease this example uses inline data:
 * 
 *     var store = Ext.create('Ext.data.Store', {
 *         model: 'WeatherPoint',
 *         data: [
 *             { temperature: 58, date: new Date(2011, 1, 1, 8) },
 *             { temperature: 63, date: new Date(2011, 1, 1, 9) },
 *             { temperature: 73, date: new Date(2011, 1, 1, 10) },
 *             { temperature: 78, date: new Date(2011, 1, 1, 11) },
 *             { temperature: 81, date: new Date(2011, 1, 1, 12) }
 *         ]
 *     });
 *    
 * For additional information on Models and Stores please refer to the [Data Guide](#/guide/data).
 * 
 * ### 2. Creating the Chart object
 * 
 * Now that a Store has been created it can be used in a Chart:
 * 
 *     Ext.create('Ext.chart.Chart', {
 *        renderTo: Ext.getBody(),
 *        width: 400,
 *        height: 300,
 *        store: store
 *     });
 *    
 * That's all it takes to create a Chart instance that is backed by a Store.
 * However, if the above code is run in a browser, a blank screen will be displayed.
 * This is because the two pieces that are responsible for the visual display,
 * the Chart's {@link #cfg-axes axes} and {@link #cfg-series series}, have not yet been defined.
 * 
 * ### 3. Configuring the Axes
 * 
 * {@link Ext.chart.axis.Axis Axes} are the lines that define the boundaries of the data points that a Chart can display.
 * This example uses one of the most common Axes configurations - a horizontal "x" axis, and a vertical "y" axis:
 * 
 *     Ext.create('Ext.chart.Chart', {
 *         ...
 *         axes: [
 *             {
 *                 title: 'Temperature',
 *                 type: 'Numeric',
 *                 position: 'left',
 *                 fields: ['temperature'],
 *                 minimum: 0,
 *                 maximum: 100
 *             },
 *             {
 *                 title: 'Time',
 *                 type: 'Time',
 *                 position: 'bottom',
 *                 fields: ['date'],
 *                 dateFormat: 'ga'
 *             }
 *         ]
 *     });
 *    
 * The "Temperature" axis is a vertical {@link Ext.chart.axis.Numeric Numeric Axis} and is positioned on the left edge of the Chart.
 * It represents the bounds of the data contained in the "WeatherPoint" Model's "temperature" field that was
 * defined above. The minimum value for this axis is "0", and the maximum is "100".
 * 
 * The horizontal axis is a {@link Ext.chart.axis.Time Time Axis} and is positioned on the bottom edge of the Chart.
 * It represents the bounds of the data contained in the "WeatherPoint" Model's "date" field.
 * The {@link Ext.chart.axis.Time#cfg-dateFormat dateFormat}
 * configuration tells the Time Axis how to format it's labels.
 * 
 * Here's what the Chart looks like now that it has its Axes configured:
 * 
 * {@img Ext.chart.Chart/Ext.chart.Chart1.png Chart Axes}
 * 
 * ### 4. Configuring the Series
 * 
 * The final step in creating a simple Chart is to configure one or more {@link Ext.chart.series.Series Series}.
 * Series are responsible for the visual representation of the data points contained in the Store.
 * This example only has one Series:
 * 
 *     Ext.create('Ext.chart.Chart', {
 *         ...
 *         axes: [
 *             ...
 *         ],
 *         series: [
 *             {
 *                 type: 'line',
 *                 xField: 'date',
 *                 yField: 'temperature'
 *             }
 *         ]
 *     });
 *     
 * This Series is a {@link Ext.chart.series.Line Line Series}, and it uses the "date" and "temperature" fields
 * from the "WeatherPoint" Models in the Store to plot its data points:
 * 
 * {@img Ext.chart.Chart/Ext.chart.Chart2.png Line Series}
 * 
 * See the [Line Charts Example](#!/example/charts/Charts.html) for a live demo.
 * 
 * ## Themes
 * 
 * The color scheme for a Chart can be easily changed using the {@link #cfg-theme theme} configuration option:
 * 
 *     Ext.create('Ext.chart.Chart', {
 *         ...
 *         theme: 'Green',
 *         ...
 *     });
 * 
 * {@img Ext.chart.Chart/Ext.chart.Chart3.png Green Theme}
 * 
 * For more information on Charts please refer to the [Drawing and Charting Guide](#/guide/drawing_and_charting).
 * 
 */
Ext.define('Ext.chart.Chart', {

    /* Begin Definitions */

    alias: 'widget.chart',

    extend: 'Ext.draw.Component',
    
    mixins: {
        themeManager: 'Ext.chart.theme.Theme',
        mask: 'Ext.chart.Mask',
        navigation: 'Ext.chart.Navigation',
        bindable: 'Ext.util.Bindable',
        observable: 'Ext.util.Observable'
    },

    uses: [
        'Ext.chart.series.Series'
    ],
    
    requires: [
        'Ext.util.MixedCollection',
        'Ext.data.StoreManager',
        'Ext.chart.Legend',
        'Ext.chart.theme.Base',
        'Ext.chart.theme.Theme',
        'Ext.util.DelayedTask'
    ],

    /* End Definitions */

    // @private
    viewBox: false,

    /**
     * @cfg {String} theme
     * The name of the theme to be used. A theme defines the colors and other visual displays of tick marks
     * on axis, text, title text, line colors, marker colors and styles, etc. Possible theme values are 'Base', 'Green',
     * 'Sky', 'Red', 'Purple', 'Blue', 'Yellow' and also six category themes 'Category1' to 'Category6'. Default value
     * is 'Base'.
     */

    /**
     * @cfg {Boolean/Object} animate
     * True for the default animation (easing: 'ease' and duration: 500) or a standard animation config
     * object to be used for default chart animations. Defaults to false.
     */
    animate: false,

    /**
     * @cfg {Boolean/Object} legend
     * True for the default legend display or a legend config object. Defaults to false.
     */
    legend: false,

    /**
     * @cfg {Number} insetPadding
     * The amount of inset padding in pixels for the chart. Defaults to 10.
     */
    insetPadding: 10,

    /**
     * @cfg {String[]} enginePriority
     * Defines the priority order for which Surface implementation to use. The first one supported by the current
     * environment will be used. Defaults to `['Svg', 'Vml']`.
     */
    enginePriority: ['Svg', 'Vml'],

    /**
     * @cfg {Object/Boolean} background
     * The chart background. This can be a gradient object, image, or color. Defaults to false for no
     * background. For example, if `background` were to be a color we could set the object as
     *
     *     background: {
     *         //color string
     *         fill: '#ccc'
     *     }
     *
     * You can specify an image by using:
     *
     *     background: {
     *         image: 'http://path.to.image/'
     *     }
     *
     * Also you can specify a gradient by using the gradient object syntax:
     *
     *     background: {
     *         gradient: {
     *             id: 'gradientId',
     *             angle: 45,
     *             stops: {
     *                 0: {
     *                     color: '#555'
     *                 }
     *                 100: {
     *                     color: '#ddd'
     *                 }
     *             }
     *         }
     *     }
     */
    background: false,

    /**
     * @cfg {Object[]} gradients
     * Define a set of gradients that can be used as `fill` property in sprites. The gradients array is an
     * array of objects with the following properties:
     *
     * - **id** - string - The unique name of the gradient.
     * - **angle** - number, optional - The angle of the gradient in degrees.
     * - **stops** - object - An object with numbers as keys (from 0 to 100) and style objects as values
     *
     * For example:
     *
     *     gradients: [{
     *         id: 'gradientId',
     *         angle: 45,
     *         stops: {
     *             0: {
     *                 color: '#555'
     *             },
     *             100: {
     *                 color: '#ddd'
     *             }
     *         }
     *     }, {
     *         id: 'gradientId2',
     *         angle: 0,
     *         stops: {
     *             0: {
     *                 color: '#590'
     *             },
     *             20: {
     *                 color: '#599'
     *             },
     *             100: {
     *                 color: '#ddd'
     *             }
     *         }
     *     }]
     *
     * Then the sprites can use `gradientId` and `gradientId2` by setting the fill attributes to those ids, for example:
     *
     *     sprite.setAttributes({
     *         fill: 'url(#gradientId)'
     *     }, true);
     */

    /**
     * @cfg {Ext.data.Store} store
     * The store that supplies data to this chart.
     */

    /**
     * @cfg {Ext.chart.series.Series[]} series
     * Array of {@link Ext.chart.series.Series Series} instances or config objects.  For example:
     * 
     *     series: [{
     *         type: 'column',
     *         axis: 'left',
     *         listeners: {
     *             'afterrender': function() {
     *                 console('afterrender');
     *             }
     *         },
     *         xField: 'category',
     *         yField: 'data1'
     *     }]
     */

    /**
     * @cfg {Ext.chart.axis.Axis[]} axes
     * Array of {@link Ext.chart.axis.Axis Axis} instances or config objects.  For example:
     * 
     *     axes: [{
     *         type: 'Numeric',
     *         position: 'left',
     *         fields: ['data1'],
     *         title: 'Number of Hits',
     *         minimum: 0,
     *         //one minor tick between two major ticks
     *         minorTickSteps: 1
     *     }, {
     *         type: 'Category',
     *         position: 'bottom',
     *         fields: ['name'],
     *         title: 'Month of the Year'
     *     }]
     */

    constructor: function(config) {
        var me = this,
            defaultAnim;

        config = Ext.apply({}, config);
        me.initTheme(config.theme || me.theme);
        if (me.gradients) {
            Ext.apply(config, { gradients: me.gradients });
        }
        if (me.background) {
            Ext.apply(config, { background: me.background });
        }
        if (config.animate) {
            defaultAnim = {
                easing: 'ease',
                duration: 500
            };
            if (Ext.isObject(config.animate)) {
                config.animate = Ext.applyIf(config.animate, defaultAnim);
            }
            else {
                config.animate = defaultAnim;
            }
        }

        me.mixins.observable.constructor.call(me, config);
        if (config.enableMask) {
            me.mixins.mask.constructor.call(me);
        }
        me.mixins.navigation.constructor.call(me);
        me.callParent([config]);
    },
    
    getChartStore: function(){
        return this.substore || this.store;
    },

    initComponent: function() {
        var me = this,
            axes,
            series;
        me.callParent();
        me.addEvents(
            'itemmousedown',
            'itemmouseup',
            'itemmouseover',
            'itemmouseout',
            'itemclick',
            'itemdblclick',
            'itemdragstart',
            'itemdrag',
            'itemdragend',
            /**
             * @event beforerefresh
             * Fires before a refresh to the chart data is called. If the beforerefresh handler returns false the
             * {@link #event-refresh} action will be cancelled.
             * @param {Ext.chart.Chart} this
             */
            'beforerefresh',
            /**
             * @event refresh
             * Fires after the chart data has been refreshed.
             * @param {Ext.chart.Chart} this
             */
            'refresh'
        );
        Ext.applyIf(me, {
            zoom: {
                width: 1,
                height: 1,
                x: 0,
                y: 0
            }
        });
        me.maxGutter = [0, 0];
        me.store = Ext.data.StoreManager.lookup(me.store);
        axes = me.axes;
        me.axes = new Ext.util.MixedCollection(false, function(a) { return a.position; });
        if (axes) {
            me.axes.addAll(axes);
        }
        series = me.series;
        me.series = new Ext.util.MixedCollection(false, function(a) { return a.seriesId || (a.seriesId = Ext.id(null, 'ext-chart-series-')); });
        if (series) {
            me.series.addAll(series);
        }
        if (me.legend !== false) {
            me.legend = new Ext.chart.Legend(Ext.applyIf({chart:me}, me.legend));
        }

        me.on({
            mousemove: me.onMouseMove,
            mouseleave: me.onMouseLeave,
            mousedown: me.onMouseDown,
            mouseup: me.onMouseUp,
            click: me.onClick,
            dblclick: me.onDblClick,
            scope: me
        });
    },

    // @private overrides the component method to set the correct dimensions to the chart.
    afterComponentLayout: function(width, height) {
        var me = this;
        if (Ext.isNumber(width) && Ext.isNumber(height)) {
            if (width !== me.curWidth || height !== me.curHeight) {
                me.curWidth = width;
                me.curHeight = height;
                me.redraw(true);
            } else if (me.needsRedraw) {
                delete me.needsRedraw;
                me.redraw();
            }
        }
        this.callParent(arguments);
    },

    /**
     * Redraws the chart. If animations are set this will animate the chart too. 
     * @param {Boolean} resize (optional) flag which changes the default origin points of the chart for animations.
     */
    redraw: function(resize) {
        var me = this,
            seriesItems = me.series.items,
            seriesLen = seriesItems.length,
            axesItems = me.axes.items,
            axesLen = axesItems.length,
            i,
            chartBBox = me.chartBBox = {
                x: 0,
                y: 0,
                height: me.curHeight,
                width: me.curWidth
            },
            legend = me.legend;
        me.surface.setSize(chartBBox.width, chartBBox.height);
        // Instantiate Series and Axes
        for (i = 0; i < seriesLen; i++) {
            me.initializeSeries(seriesItems[i],i);
        }
        for (i = 0; i < axesLen; i++) {
            me.initializeAxis(axesItems[i]);
        }
        //process all views (aggregated data etc) on stores
        //before rendering.
        for (i = 0; i < axesLen; i++) {
            axesItems[i].processView();
        }
        for (i = 0; i < axesLen; i++) {
            axesItems[i].drawAxis(true);
        }

        // Create legend if not already created
        if (legend !== false && legend.visible) {
            if (legend.update || !legend.created) {
              legend.create();
            }
        }

        // Place axes properly, including influence from each other
        me.alignAxes();

        // Reposition legend based on new axis alignment
        if (legend !== false && legend.visible) {
            legend.updatePosition();
        }

        // Find the max gutter
        me.getMaxGutter();

        // Draw axes and series
        me.resizing = !!resize;

        for (i = 0; i < axesLen; i++) {
            axesItems[i].drawAxis();
        }
        for (i = 0; i < seriesLen; i++) {
            me.drawCharts(seriesItems[i]);
        }
        me.resizing = false;
    },

    // @private set the store after rendering the chart.
    afterRender: function() {
        var ref,
            me = this;
        this.callParent();

        if (me.categoryNames) {
            me.setCategoryNames(me.categoryNames);
        }

        if (me.tipRenderer) {
            ref = me.getFunctionRef(me.tipRenderer);
            me.setTipRenderer(ref.fn, ref.scope);
        }
        me.bindStore(me.store, true);
        me.refresh();

        if (me.surface.engine === 'Vml') {
            me.on('added', me.onAddedVml, me);
            me.mon(Ext.container.Container.hierarchyEventSource, 'added', me.onContainerAddedVml, me);
        }
    },

    // When using a vml surface we need to redraw when this chart or one of its ancestors
    // is moved to a new container after render, because moving the vml chart causes the
    // vml elements to go haywire, some displaing incorrectly or not displaying at all.
    // This appears to be caused by the component being moved to the detached body element
    // before being added to the new container.
    onAddedVml: function() {
        this.needsRedraw = true; // redraw after component layout
    },

    onContainerAddedVml: function(container) {
        if (this.isDescendantOf(container)) {
            this.needsRedraw = true; // redraw after component layout
        }
    },

    // @private get x and y position of the mouse cursor.
    getEventXY: function(e) {
        var me = this,
            box = this.surface.getRegion(),
            pageXY = e.getXY(),
            x = pageXY[0] - box.left,
            y = pageXY[1] - box.top;
        return [x, y];
    },
    
    onClick: function(e) {
        this.handleClick('itemclick', e);
    },
    
    onDblClick: function(e) {
        this.handleClick('itemdblclick', e);
    },

    // @private wrap the mouse down position to delegate the event to the series.
    handleClick: function(name, e) {
        var me = this,
            position = me.getEventXY(e),
            seriesItems = me.series.items,
            i, ln, series,
            item;

        // Ask each series if it has an item corresponding to (not necessarily exactly
        // on top of) the current mouse coords. Fire itemclick event.
        for (i = 0, ln = seriesItems.length; i < ln; i++) {
            series = seriesItems[i];
            if (Ext.draw.Draw.withinBox(position[0], position[1], series.bbox)) {
                if (series.getItemForPoint) {
                    item = series.getItemForPoint(position[0], position[1]);
                    if (item) {
                        series.fireEvent(name, item);
                    }
                }
            }
        }
    },

    // @private wrap the mouse down position to delegate the event to the series.
    onMouseDown: function(e) {
        var me = this,
            position = me.getEventXY(e),
            seriesItems = me.series.items,
            i, ln, series,
            item;

        if (me.enableMask) {
            me.mixins.mask.onMouseDown.call(me, e);
        }
        // Ask each series if it has an item corresponding to (not necessarily exactly
        // on top of) the current mouse coords. Fire itemmousedown event.
        for (i = 0, ln = seriesItems.length; i < ln; i++) {
            series = seriesItems[i];
            if (Ext.draw.Draw.withinBox(position[0], position[1], series.bbox)) {
                if (series.getItemForPoint) {
                    item = series.getItemForPoint(position[0], position[1]);
                    if (item) {
                        series.fireEvent('itemmousedown', item);
                    }
                }
            }
        }
    },

    // @private wrap the mouse up event to delegate it to the series.
    onMouseUp: function(e) {
        var me = this,
            position = me.getEventXY(e),
            seriesItems = me.series.items,
            i, ln, series,
            item;

        if (me.enableMask) {
            me.mixins.mask.onMouseUp.call(me, e);
        }
        // Ask each series if it has an item corresponding to (not necessarily exactly
        // on top of) the current mouse coords. Fire itemmouseup event.
        for (i = 0, ln = seriesItems.length; i < ln; i++) {
            series = seriesItems[i];
            if (Ext.draw.Draw.withinBox(position[0], position[1], series.bbox)) {
                if (series.getItemForPoint) {
                    item = series.getItemForPoint(position[0], position[1]);
                    if (item) {
                        series.fireEvent('itemmouseup', item);
                    }
                }
            }
        }
    },

    // @private wrap the mouse move event so it can be delegated to the series.
    onMouseMove: function(e) {
        var me = this,
            position = me.getEventXY(e),
            seriesItems = me.series.items,
            i, ln, series,
            item, last, storeItem, storeField;

        
        if (me.enableMask) {
            me.mixins.mask.onMouseMove.call(me, e);
        }
        // Ask each series if it has an item corresponding to (not necessarily exactly
        // on top of) the current mouse coords. Fire itemmouseover/out events.
        for (i = 0, ln = seriesItems.length; i < ln; i++) {
            series = seriesItems[i];
            if (Ext.draw.Draw.withinBox(position[0], position[1], series.bbox)) {
                if (series.getItemForPoint) {
                    item = series.getItemForPoint(position[0], position[1]);
                    last = series._lastItemForPoint;
                    storeItem = series._lastStoreItem;
                    storeField = series._lastStoreField;


                    if (item !== last || item && (item.storeItem != storeItem || item.storeField != storeField)) {
                        if (last) {
                            series.fireEvent('itemmouseout', last);
                            delete series._lastItemForPoint;
                            delete series._lastStoreField;
                            delete series._lastStoreItem;
                        }
                        if (item) {
                            series.fireEvent('itemmouseover', item);
                            series._lastItemForPoint = item;
                            series._lastStoreItem = item.storeItem;
                            series._lastStoreField = item.storeField;
                        }
                    }
                }
            } else {
                last = series._lastItemForPoint;
                if (last) {
                    series.fireEvent('itemmouseout', last);
                    delete series._lastItemForPoint;
                    delete series._lastStoreField;
                    delete series._lastStoreItem;
                }
            }
        }
    },

    // @private handle mouse leave event.
    onMouseLeave: function(e) {
        var me = this,
            seriesItems = me.series.items,
            i, ln, series;

        if (me.enableMask) {
            me.mixins.mask.onMouseLeave.call(me, e);
        }
        for (i = 0, ln = seriesItems.length; i < ln; i++) {
            series = seriesItems[i];
            delete series._lastItemForPoint;
        }
    },

    // @private buffered refresh for when we update the store
    delayRefresh: function() {
        var me = this;
        if (!me.refreshTask) {
            me.refreshTask = new Ext.util.DelayedTask(me.refresh, me);
        }
        me.refreshTask.delay(me.refreshBuffer);
    },

    // @private
    refresh: function() {
        var me = this;
            
        if (me.rendered && me.curWidth !== undefined && me.curHeight !== undefined) {
            if (!me.isVisible(true) && !me.refreshPending) {
                me.setShowListeners('mon');
                me.refreshPending = true;
                return;
            }
            if (me.fireEvent('beforerefresh', me) !== false) {
                me.redraw();
                me.fireEvent('refresh', me);
            }
        }
    },
    
    onShow: function(){
        var me = this;
        me.callParent(arguments);
        if (me.refreshPending) {
            me.delayRefresh();
            me.setShowListeners('mun');
        }
        delete me.refreshPending;
    },
    
    setShowListeners: function(method){
        var me = this;
        me[method](Ext.container.Container.hierarchyEventSource, {
            scope: me,
            single: true,
            show: me.forceRefresh,
            expand: me.forceRefresh
        });
    },
    
    forceRefresh: function(container) {
        var me = this;
        if (me.isDescendantOf(container) && me.refreshPending) {
            // Add unbind here, because either expand/show could be fired,
            // so be sure to unbind the listener that didn't
            me.setShowListeners('mun');
            me.delayRefresh();
        }    
        delete me.refreshPending;
    },

    bindStore: function(store, initial) {
        var me = this;
        me.mixins.bindable.bindStore.apply(me, arguments);
        if (me.store && !initial) {
            me.refresh();
        }
    },
    
    getStoreListeners: function() {
        var refresh = this.refresh,
            delayRefresh = this.delayRefresh;
            
        return {
            refresh: refresh,
            add: delayRefresh,
            remove: delayRefresh,
            update: delayRefresh,
            clear: refresh
        };
    },

    // @private Create Axis
    initializeAxis: function(axis) {
        var me = this,
            chartBBox = me.chartBBox,
            w = chartBBox.width,
            h = chartBBox.height,
            x = chartBBox.x,
            y = chartBBox.y,
            themeAttrs = me.themeAttrs,
            config = {
                chart: me
            };
        if (themeAttrs) {
            config.axisStyle = Ext.apply({}, themeAttrs.axis);
            config.axisLabelLeftStyle = Ext.apply({}, themeAttrs.axisLabelLeft);
            config.axisLabelRightStyle = Ext.apply({}, themeAttrs.axisLabelRight);
            config.axisLabelTopStyle = Ext.apply({}, themeAttrs.axisLabelTop);
            config.axisLabelBottomStyle = Ext.apply({}, themeAttrs.axisLabelBottom);
            config.axisTitleLeftStyle = Ext.apply({}, themeAttrs.axisTitleLeft);
            config.axisTitleRightStyle = Ext.apply({}, themeAttrs.axisTitleRight);
            config.axisTitleTopStyle = Ext.apply({}, themeAttrs.axisTitleTop);
            config.axisTitleBottomStyle = Ext.apply({}, themeAttrs.axisTitleBottom);
        }
        switch (axis.position) {
            case 'top':
                Ext.apply(config, {
                    length: w,
                    width: h,
                    x: x,
                    y: y
                });
            break;
            case 'bottom':
                Ext.apply(config, {
                    length: w,
                    width: h,
                    x: x,
                    y: h
                });
            break;
            case 'left':
                Ext.apply(config, {
                    length: h,
                    width: w,
                    x: x,
                    y: h
                });
            break;
            case 'right':
                Ext.apply(config, {
                    length: h,
                    width: w,
                    x: w,
                    y: h
                });
            break;
        }
        if (!axis.chart) {
            Ext.apply(config, axis);
            axis = me.axes.replace(Ext.createByAlias('axis.' + axis.type.toLowerCase(), config));
        }
        else {
            Ext.apply(axis, config);
        }
    },


    /**
     * @private Adjust the dimensions and positions of each axis and the chart body area after accounting
     * for the space taken up on each side by the axes and legend.
     */
    alignAxes: function() {
        var me = this,
            axes = me.axes,
            axesItems = axes.items,
            axis,
            legend = me.legend,
            edges = ['top', 'right', 'bottom', 'left'],
            edge,
            i, ln,
            chartBBox,
            insetPadding = me.insetPadding,
            insets = {
                top: insetPadding,
                right: insetPadding,
                bottom: insetPadding,
                left: insetPadding
            },
            isVertical, bbox, pos;

        function getAxis(edge) {
            var i = axes.findIndex('position', edge);
            return (i < 0) ? null : axes.getAt(i);
        }

        // Find the space needed by axes and legend as a positive inset from each edge
        for (i = 0, ln = edges.length; i < ln; i++) {
            edge = edges[i];
            isVertical = (edge === 'left' || edge === 'right');
            axis = getAxis(edge);

            // Add legend size if it's on this edge
            if (legend !== false) {
                if (legend.position === edge) {
                    bbox = legend.getBBox();
                    insets[edge] += (isVertical ? bbox.width : bbox.height) + insets[edge];
                }
            }

            // Add axis size if there's one on this edge only if it has been
            //drawn before.
            if (axis && axis.bbox) {
                bbox = axis.bbox;
                insets[edge] += (isVertical ? bbox.width : bbox.height);
            }
        }
        // Build the chart bbox based on the collected inset values
        chartBBox = {
            x: insets.left,
            y: insets.top,
            width: me.curWidth - insets.left - insets.right,
            height: me.curHeight - insets.top - insets.bottom
        };
        me.chartBBox = chartBBox;

        // Go back through each axis and set its length and position based on the
        // corresponding edge of the chartBBox
        for (i = 0, ln = axesItems.length; i < ln; i++) {
            axis = axesItems[i];
            pos = axis.position;
            isVertical = (pos === 'left' || pos === 'right');

            axis.x = (pos === 'right' ? chartBBox.x + chartBBox.width : chartBBox.x);
            axis.y = (pos === 'top' ? chartBBox.y : chartBBox.y + chartBBox.height);
            axis.width = (isVertical ? chartBBox.width : chartBBox.height);
            axis.length = (isVertical ? chartBBox.height : chartBBox.width);
        }
    },

    // @private initialize the series.
    initializeSeries: function(series, idx) {
        var me = this,
            themeAttrs = me.themeAttrs,
            seriesObj, markerObj, seriesThemes, st,
            markerThemes, colorArrayStyle = [],
            i = 0, l,
            config = {
                chart: me,
                seriesId: series.seriesId
            };
        if (themeAttrs) {
            seriesThemes = themeAttrs.seriesThemes;
            markerThemes = themeAttrs.markerThemes;
            seriesObj = Ext.apply({}, themeAttrs.series);
            markerObj = Ext.apply({}, themeAttrs.marker);
            config.seriesStyle = Ext.apply(seriesObj, seriesThemes[idx % seriesThemes.length]);
            config.seriesLabelStyle = Ext.apply({}, themeAttrs.seriesLabel);
            config.markerStyle = Ext.apply(markerObj, markerThemes[idx % markerThemes.length]);
            if (themeAttrs.colors) {
                config.colorArrayStyle = themeAttrs.colors;
            } else {
                colorArrayStyle = [];
                for (l = seriesThemes.length; i < l; i++) {
                    st = seriesThemes[i];
                    if (st.fill || st.stroke) {
                        colorArrayStyle.push(st.fill || st.stroke);
                    }
                }
                if (colorArrayStyle.length) {
                    config.colorArrayStyle = colorArrayStyle;
                }
            }
            config.seriesIdx = idx;
        }
        if (series instanceof Ext.chart.series.Series) {
            Ext.apply(series, config);
        } else {
            Ext.applyIf(config, series);
            series = me.series.replace(Ext.createByAlias('series.' + series.type.toLowerCase(), config));
        }
        if (series.initialize) {
            series.initialize();
        }
    },

    // @private
    getMaxGutter: function() {
        var me = this,
            seriesItems = me.series.items,
            i, ln, series,
            maxGutter = [0, 0],
            gutter;
        for (i = 0, ln = seriesItems.length; i < ln; i++) {
            series = seriesItems[i];
            gutter = series.getGutters && series.getGutters() || [0, 0];
            maxGutter[0] = Math.max(maxGutter[0], gutter[0]);
            maxGutter[1] = Math.max(maxGutter[1], gutter[1]);
        }
        me.maxGutter = maxGutter;
    },

    // @private draw axis.
    drawAxis: function(axis) {
        axis.drawAxis();
    },

    // @private draw series.
    drawCharts: function(series) {
        series.triggerafterrender = false;
        series.drawSeries();
        if (!this.animate) {
            series.fireEvent('afterrender');
        }
    },
    /**
     * Saves the chart by either triggering a download or returning a string containing the chart data
     * as SVG.  The action depends on the export type specified in the passed configuration. The chart
     * will be exported using either the {@link Ext.draw.engine.SvgExporter} or the {@link Ext.draw.engine.ImageExporter}
     * classes.
     *
     * Possible export types:
     *
     * - 'image/png'
     * - 'image/jpeg',
     * - 'image/svg+xml'
     *
     * If 'image/svg+xml' is specified, the SvgExporter will be used. 
     * If 'image/png' or 'image/jpeg' are specified, the ImageExporter will be used. This exporter
     * must post the SVG data to a remote server to have the data processed, see the {@link Ext.draw.engine.ImageExporter}
     * for more details.
     *
     * Example usage:
     *
     *     chart.save({
     *          type: 'image/png'
     *     });
     *
     * @param {Object} [config] The configuration to be passed to the exporter.
     * See the export method for the appropriate exporter for the relevant
     * configuration options
     * @return {Object} See the return types for the appropriate exporter
     */
    save: function(config){
        return Ext.draw.Surface.save(this.surface, config);
    },
    // @private remove gently.
    destroy: function() {
        Ext.destroy(this.surface);
        this.bindStore(null);
        this.callParent(arguments);
    }
});

/**
 * @private
 */
Ext.define('Ext.chart.TipSurface', {

    /* Begin Definitions */

    extend: 'Ext.draw.Component',

    /* End Definitions */

    spriteArray: false,
    renderFirst: true,

    constructor: function(config) {
        this.callParent([config]);
        if (config.sprites) {
            this.spriteArray = [].concat(config.sprites);
            delete config.sprites;
        }
    },

    onRender: function() {
        var me = this,
            i = 0,
            l = 0,
            sp,
            sprites;
            this.callParent(arguments);
        sprites = me.spriteArray;
        if (me.renderFirst && sprites) {
            me.renderFirst = false;
            for (l = sprites.length; i < l; i++) {
                sp = me.surface.add(sprites[i]);
                sp.setAttributes({
                    hidden: false
                },
                true);
            }
        }
    }
});

/**
 * @class Ext.chart.axis.Abstract
 * Base class for all axis classes.
 * @private
 */
Ext.define('Ext.chart.axis.Abstract', {

    /* Begin Definitions */

    requires: ['Ext.chart.Chart'],

    /* End Definitions */
    
    /**
     * @cfg {Ext.chart.Label} label
     * The config for chart label.
     */

    /**
     * @cfg {String[]} fields
     * The fields of model to bind to this axis.
     * 
     * For example if you have a data set of lap times per car, each having the fields:
     * `'carName'`, `'avgSpeed'`, `'maxSpeed'`. Then you might want to show the data on chart
     * with `['carName']` on Name axis and `['avgSpeed', 'maxSpeed']` on Speed axis.
     */

    /**
     * Creates new Axis.
     * @param {Object} config (optional) Config options.
     */
    constructor: function(config) {
        config = config || {};

        var me = this,
            pos = config.position || 'left';

        pos = pos.charAt(0).toUpperCase() + pos.substring(1);
        //axisLabel(Top|Bottom|Right|Left)Style
        config.label = Ext.apply(config['axisLabel' + pos + 'Style'] || {}, config.label || {});
        config.axisTitleStyle = Ext.apply(config['axisTitle' + pos + 'Style'] || {}, config.labelTitle || {});
        Ext.apply(me, config);
        me.fields = Ext.Array.from(me.fields);
        this.callParent();
        me.labels = [];
        me.getId();
        me.labelGroup = me.chart.surface.getGroup(me.axisId + "-labels");
    },

    alignment: null,
    grid: false,
    steps: 10,
    x: 0,
    y: 0,
    minValue: 0,
    maxValue: 0,

    getId: function() {
        return this.axisId || (this.axisId = Ext.id(null, 'ext-axis-'));
    },

    /*
      Called to process a view i.e to make aggregation and filtering over
      a store creating a substore to be used to render the axis. Since many axes
      may do different things on the data and we want the final result of all these
      operations to be rendered we need to call processView on all axes before drawing
      them.
    */
    processView: Ext.emptyFn,

    drawAxis: Ext.emptyFn,
    addDisplayAndLabels: Ext.emptyFn
});

/**
 * @class Ext.chart.axis.Axis
 *
 * Defines axis for charts. The axis position, type, style can be configured.
 * The axes are defined in an axes array of configuration objects where the type,
 * field, grid and other configuration options can be set. To know more about how
 * to create a Chart please check the Chart class documentation. Here's an example for the axes part:
 * An example of axis for a series (in this case for an area chart that has multiple layers of yFields) could be:
 *
 *     axes: [{
 *         type: 'Numeric',
 *         position: 'left',
 *         fields: ['data1', 'data2', 'data3'],
 *         title: 'Number of Hits',
 *         grid: {
 *             odd: {
 *                 opacity: 1,
 *                 fill: '#ddd',
 *                 stroke: '#bbb',
 *                 'stroke-width': 1
 *             }
 *         },
 *         minimum: 0
 *     }, {
 *         type: 'Category',
 *         position: 'bottom',
 *         fields: ['name'],
 *         title: 'Month of the Year',
 *         grid: true,
 *         label: {
 *             rotate: {
 *                 degrees: 315
 *             }
 *         }
 *     }]
 *
 * In this case we use a `Numeric` axis for displaying the values of the Area series and a `Category` axis for displaying the names of
 * the store elements. The numeric axis is placed on the left of the screen, while the category axis is placed at the bottom of the chart.
 * Both the category and numeric axes have `grid` set, which means that horizontal and vertical lines will cover the chart background. In the
 * category axis the labels will be rotated so they can fit the space better.
 */
Ext.define('Ext.chart.axis.Axis', {

    /* Begin Definitions */

    extend: 'Ext.chart.axis.Abstract',

    alternateClassName: 'Ext.chart.Axis',

    requires: ['Ext.draw.Draw'],

    /* End Definitions */

    /**
     * @cfg {Boolean/Object} grid
     * The grid configuration enables you to set a background grid for an axis.
     * If set to *true* on a vertical axis, vertical lines will be drawn.
     * If set to *true* on a horizontal axis, horizontal lines will be drawn.
     * If both are set, a proper grid with horizontal and vertical lines will be drawn.
     *
     * You can set specific options for the grid configuration for odd and/or even lines/rows.
     * Since the rows being drawn are rectangle sprites, you can set to an odd or even property
     * all styles that apply to {@link Ext.draw.Sprite}. For more information on all the style
     * properties you can set please take a look at {@link Ext.draw.Sprite}. Some useful style properties are `opacity`, `fill`, `stroke`, `stroke-width`, etc.
     *
     * The possible values for a grid option are then *true*, *false*, or an object with `{ odd, even }` properties
     * where each property contains a sprite style descriptor object that is defined in {@link Ext.draw.Sprite}.
     *
     * For example:
     *
     *     axes: [{
     *         type: 'Numeric',
     *         position: 'left',
     *         fields: ['data1', 'data2', 'data3'],
     *         title: 'Number of Hits',
     *         grid: {
     *             odd: {
     *                 opacity: 1,
     *                 fill: '#ddd',
     *                 stroke: '#bbb',
     *                 'stroke-width': 1
     *             }
     *         }
     *     }, {
     *         type: 'Category',
     *         position: 'bottom',
     *         fields: ['name'],
     *         title: 'Month of the Year',
     *         grid: true
     *     }]
     *
     */

    /**
     * @cfg {Number} majorTickSteps
     * If `minimum` and `maximum` are specified it forces the number of major ticks to the specified value.
     * If a number of major ticks is forced, it wont search for pretty numbers at the ticks.
     */

    /**
     * @cfg {Number} minorTickSteps
     * The number of small ticks between two major ticks. Default is zero.
     */

    /**
     * @cfg {String} title
     * The title for the Axis
     */

    // @private force min/max values from store
    forceMinMax: false,

    /**
     * @cfg {Number} dashSize
     * The size of the dash marker. Default's 3.
     */
    dashSize: 3,

    /**
     * @cfg {String} position
     * Where to set the axis. Available options are `left`, `bottom`, `right`, `top`. Default's `bottom`.
     */
    position: 'bottom',

    // @private
    skipFirst: false,

    /**
     * @cfg {Number} length
     * Offset axis position. Default's 0.
     */
    length: 0,

    /**
     * @cfg {Number} width
     * Offset axis width. Default's 0.
     */
    width: 0,

    /**
     * @cfg {Boolean} adjustEnd
     * Whether to adjust the label at the end of the axis.
     */
    adjustEnd: true,

    majorTickSteps: false,

    // @private
    applyData: Ext.emptyFn,

    getRange: function () {
        var me = this,
            chart = me.chart,
            store = chart.getChartStore(),
            data = store.data.items,
            series = chart.series.items,
            position = me.position,
            boundedAxes,
            seriesClasses = Ext.chart.series,
            aggregations = [],
            min = Infinity, max = -Infinity,
            vertical = me.position === 'left' || me.position === 'right',
            i, ln, ln2, j, k, dataLength = data.length, aggregates,
            countedFields = {},
            allFields = {},
            excludable = true,
            fields, fieldMap, record, field, value;

        fields = me.fields;
        for (j = 0, ln = fields.length; j < ln; j++) {
            allFields[fields[j]] = true;
        }

        for (i = 0, ln = series.length; i < ln; i++) {
            if (series[i].seriesIsHidden) {
                continue;
            }
            if (!series[i].getAxesForXAndYFields) {
                continue;
            }

            boundedAxes = series[i].getAxesForXAndYFields();
            if (boundedAxes.xAxis && boundedAxes.xAxis !== position && boundedAxes.yAxis && boundedAxes.yAxis !== position) {
                // If the series explicitly exclude current Axis, then exit.
                continue;
            }

            if (seriesClasses.Bar && series[i] instanceof seriesClasses.Bar && !series[i].column) {
                // If this is a horizontal bar series, then flip xField and yField.
                fields = vertical ? Ext.Array.from(series[i].xField) : Ext.Array.from(series[i].yField);
            } else {
                fields = vertical ? Ext.Array.from(series[i].yField) : Ext.Array.from(series[i].xField);
            }

            if (me.fields.length) {
                for (j = 0, ln2 = fields.length; j < ln2; j++) {
                    if (allFields[fields[j]]) {
                        break;
                    }
                }
                if (j == ln2) {
                    // Not matching fields, skipping this series.
                    continue;
                }
            }

            if (aggregates = series[i].stacked) {
                // If this is a bar/column series, then it will be aggregated if it is of the same direction of the axis.
                if (seriesClasses.Bar && series[i] instanceof seriesClasses.Bar) {
                    if (series[i].column != vertical) {
                        aggregates = false;
                        excludable = false;
                    }
                }
                // Otherwise it is stacked vertically
                else if (!vertical) {
                    aggregates = false;
                    excludable = false;
                }
            }


            if (aggregates) {
                fieldMap = {};
                for (j = 0; j < fields.length; j++) {
                    if (excludable && series[i].__excludes && series[i].__excludes[j]) {
                        continue;
                    }
                    if (!allFields[fields[j]]) {
                        Ext.Logger.warn('Field `' + fields[j] + '` is not included in the ' + position + ' axis config.');
                    }
                    allFields[fields[j]] = fieldMap[fields[j]] = true;
                }
                aggregations.push({
                    fields: fieldMap,
                    value: 0
                });
            } else {

                if (!fields || fields.length == 0) {
                    fields = me.fields;
                }
                for (j = 0; j < fields.length; j++) {
                    if (excludable && series[i].__excludes && series[i].__excludes[j]) {
                        continue;
                    }
                    allFields[fields[j]] = countedFields[fields[j]] = true;
                }
            }
        }

        for (i = 0; i < dataLength; i++) {
            record = data[i];
            for (k = 0; k < aggregations.length; k++) {
                aggregations[k].value = 0;
            }
            for (field in allFields) {
                value = record.get(field);
                if (isNaN(value)) {
                    continue;
                }
                if (value === undefined) {
                    value = 0;
                }
                if (countedFields[field]) {
                    if (min > value) {
                        min = value;
                    }
                    if (max < value) {
                        max = value;
                    }
                }
                for (k = 0; k < aggregations.length; k++) {
                    if (aggregations[k].fields[field]) {
                        aggregations[k].value += value;
                        // If any aggregation is actually hit, then the min value should be at most 0.
                        if (min > 0) {
                            min = 0;
                        }
                        if (max < aggregations[k].value) {
                            max = aggregations[k].value;
                        }
                    }
                }
            }
        }

        if (!isFinite(max)) {
            max = me.prevMax || 0;
        }
        if (!isFinite(min)) {
            min = me.prevMin || 0;
        }

        //normalize min max for snapEnds.
        if (min != max && (max != Math.floor(max))) {
            max = Math.floor(max) + 1;
        }

        if (!isNaN(me.minimum)) {
            min = me.minimum;
        }

        if (!isNaN(me.maximum)) {
            max = me.maximum;
        }

        if (min >= max) {
            // snapEnds will return NaN if max >= min;
            max = min + 1;
        }

        return {min: min, max: max};
    },

    // @private creates a structure with start, end and step points.
    calcEnds: function () {
        var me = this,
            range = me.getRange(),
            min = range.min,
            max = range.max,
            steps, prettyNumbers, out, changedRange;

        steps = (Ext.isNumber(me.majorTickSteps) ? me.majorTickSteps + 1 : me.steps);
        prettyNumbers = !(Ext.isNumber(me.maximum) && Ext.isNumber(me.minimum) && Ext.isNumber(me.majorTickSteps) && me.majorTickSteps > 0);

        out = Ext.draw.Draw.snapEnds(min, max, steps, prettyNumbers);

        if (Ext.isNumber(me.maximum)) {
            out.to = me.maximum;
            changedRange = true;
        }
        if (Ext.isNumber(me.minimum)) {
            out.from = me.minimum;
            changedRange = true;
        }
        if (me.adjustMaximumByMajorUnit) {
            out.to = Math.ceil(out.to / out.step) * out.step;
            changedRange = true;
        }
        if (me.adjustMinimumByMajorUnit) {
            out.from = Math.floor(out.from / out.step) * out.step;
            changedRange = true;
        }

        if (changedRange) {
            out.steps = Math.ceil((out.to - out.from) / out.step);            
        }

        me.prevMin = (min == max ? 0 : min);
        me.prevMax = max;
        return out;
    },

    /**
     * Renders the axis into the screen and updates its position.
     */
    drawAxis: function (init) {
        var me = this,
            i, 
            x = me.x,
            y = me.y,
            gutterX = me.chart.maxGutter[0],
            gutterY = me.chart.maxGutter[1],
            dashSize = me.dashSize,
            subDashesX = me.minorTickSteps || 0,
            subDashesY = me.minorTickSteps || 0,
            length = me.length,
            position = me.position,
            inflections = [],
            calcLabels = false,
            stepCalcs = me.applyData(),
            step = stepCalcs.step,
            steps = stepCalcs.steps,
            from = stepCalcs.from,
            to = stepCalcs.to,
            trueLength,
            currentX,
            currentY,
            path,
            dashesX,
            dashesY,
            delta;

        //If no steps are specified
        //then don't draw the axis. This generally happens
        //when an empty store.
        if (me.hidden || isNaN(step) || (from > to)) {
            return;
        }

        me.from = stepCalcs.from;
        me.to = stepCalcs.to;

        if (position == 'left' || position == 'right') {
            currentX = Math.floor(x) + 0.5;
            path = ["M", currentX, y, "l", 0, -length];
            trueLength = length - (gutterY * 2);
        }
        else {
            currentY = Math.floor(y) + 0.5;
            path = ["M", x, currentY, "l", length, 0];
            trueLength = length - (gutterX * 2);
        }

        // Supports the case that we have only 1 record.
        delta = steps && trueLength / steps;
        dashesX = Math.max(subDashesX + 1, 0);
        dashesY = Math.max(subDashesY + 1, 0);
        if (me.type == 'Numeric' || me.type == 'Time') {
            calcLabels = true;
            me.labels = [stepCalcs.from];
        }

        if (position == 'right' || position == 'left') {
            currentY = y - gutterY;
            currentX = x - ((position == 'left') * dashSize * 2);
            while (currentY >= y - gutterY - trueLength) {
                path.push("M", currentX, Math.floor(currentY) + 0.5, "l", dashSize * 2 + 1, 0);
                if (currentY != y - gutterY) {
                    for (i = 1; i < dashesY; i++) {
                        path.push("M", currentX + dashSize, Math.floor(currentY + delta * i / dashesY) + 0.5, "l", dashSize + 1, 0);
                    }
                }
                inflections.push([ Math.floor(x), Math.floor(currentY) ]);
                currentY -= delta;

                if (calcLabels) {
                    me.labels.push(me.labels[me.labels.length - 1] + step);
                }

                if (delta === 0) {
                    break;
                }
            }
            if (Math.round(currentY + delta - (y - gutterY - trueLength))) {
                path.push("M", currentX, Math.floor(y - length + gutterY) + 0.5, "l", dashSize * 2 + 1, 0);
                for (i = 1; i < dashesY; i++) {
                    path.push("M", currentX + dashSize, Math.floor(y - length + gutterY + delta * i / dashesY) + 0.5, "l", dashSize + 1, 0);
                }
                inflections.push([ Math.floor(x), Math.floor(currentY) ]);
                if (calcLabels) {
                    me.labels.push(me.labels[me.labels.length - 1] + step);
                }
            }
        } else {
            currentX = x + gutterX;
            currentY = y - ((position == 'top') * dashSize * 2);
            while (currentX <= x + gutterX + trueLength) {
                path.push("M", Math.floor(currentX) + 0.5, currentY, "l", 0, dashSize * 2 + 1);
                if (currentX != x + gutterX) {
                    for (i = 1; i < dashesX; i++) {
                        path.push("M", Math.floor(currentX - delta * i / dashesX) + 0.5, currentY, "l", 0, dashSize + 1);
                    }
                }
                inflections.push([ Math.floor(currentX), Math.floor(y) ]);
                currentX += delta;
                if (calcLabels) {
                    me.labels.push(me.labels[me.labels.length - 1] + step);
                }
                if (delta === 0) {
                    break;
                }
            }
            if (Math.round(currentX - delta - (x + gutterX + trueLength))) {
                path.push("M", Math.floor(x + length - gutterX) + 0.5, currentY, "l", 0, dashSize * 2 + 1);
                for (i = 1; i < dashesX; i++) {
                    path.push("M", Math.floor(x + length - gutterX - delta * i / dashesX) + 0.5, currentY, "l", 0, dashSize + 1);
                }
                inflections.push([ Math.floor(currentX), Math.floor(y) ]);
                if (calcLabels) {
                    me.labels.push(me.labels[me.labels.length - 1] + step);
                }
            }
        }

        // the label on index "inflections.length-1" is the last label that gets rendered
        if (calcLabels) {
            me.labels[inflections.length - 1] = +(me.labels[inflections.length - 1]).toFixed(10);
        }

        if (!me.axis) {
            me.axis = me.chart.surface.add(Ext.apply({
                type: 'path',
                path: path
            }, me.axisStyle));
        }
        me.axis.setAttributes({
            path: path
        }, true);
        me.inflections = inflections;
        if (!init && me.grid) {
            me.drawGrid();
        }
        me.axisBBox = me.axis.getBBox();
        me.drawLabel();
    },

    /**
     * Renders an horizontal and/or vertical grid into the Surface.
     */
    drawGrid: function () {
        var me = this,
            surface = me.chart.surface,
            grid = me.grid,
            odd = grid.odd,
            even = grid.even,
            inflections = me.inflections,
            ln = inflections.length - ((odd || even) ? 0 : 1),
            position = me.position,
            gutter = me.chart.maxGutter,
            width = me.width - 2,
            point, prevPoint,
            i = 1,
            path = [], styles, lineWidth, dlineWidth,
            oddPath = [], evenPath = [];

        if ((gutter[1] !== 0 && (position == 'left' || position == 'right')) ||
            (gutter[0] !== 0 && (position == 'top' || position == 'bottom'))) {
            i = 0;
            ln++;
        }
        for (; i < ln; i++) {
            point = inflections[i];
            prevPoint = inflections[i - 1];
            if (odd || even) {
                path = (i % 2) ? oddPath : evenPath;
                styles = ((i % 2) ? odd : even) || {};
                lineWidth = (styles.lineWidth || styles['stroke-width'] || 0) / 2;
                dlineWidth = 2 * lineWidth;
                if (position == 'left') {
                    path.push("M", prevPoint[0] + 1 + lineWidth, prevPoint[1] + 0.5 - lineWidth,
                        "L", prevPoint[0] + 1 + width - lineWidth, prevPoint[1] + 0.5 - lineWidth,
                        "L", point[0] + 1 + width - lineWidth, point[1] + 0.5 + lineWidth,
                        "L", point[0] + 1 + lineWidth, point[1] + 0.5 + lineWidth, "Z");
                }
                else if (position == 'right') {
                    path.push("M", prevPoint[0] - lineWidth, prevPoint[1] + 0.5 - lineWidth,
                        "L", prevPoint[0] - width + lineWidth, prevPoint[1] + 0.5 - lineWidth,
                        "L", point[0] - width + lineWidth, point[1] + 0.5 + lineWidth,
                        "L", point[0] - lineWidth, point[1] + 0.5 + lineWidth, "Z");
                }
                else if (position == 'top') {
                    path.push("M", prevPoint[0] + 0.5 + lineWidth, prevPoint[1] + 1 + lineWidth,
                        "L", prevPoint[0] + 0.5 + lineWidth, prevPoint[1] + 1 + width - lineWidth,
                        "L", point[0] + 0.5 - lineWidth, point[1] + 1 + width - lineWidth,
                        "L", point[0] + 0.5 - lineWidth, point[1] + 1 + lineWidth, "Z");
                }
                else {
                    path.push("M", prevPoint[0] + 0.5 + lineWidth, prevPoint[1] - lineWidth,
                        "L", prevPoint[0] + 0.5 + lineWidth, prevPoint[1] - width + lineWidth,
                        "L", point[0] + 0.5 - lineWidth, point[1] - width + lineWidth,
                        "L", point[0] + 0.5 - lineWidth, point[1] - lineWidth, "Z");
                }
            } else {
                if (position == 'left') {
                    path = path.concat(["M", point[0] + 0.5, point[1] + 0.5, "l", width, 0]);
                }
                else if (position == 'right') {
                    path = path.concat(["M", point[0] - 0.5, point[1] + 0.5, "l", -width, 0]);
                }
                else if (position == 'top') {
                    path = path.concat(["M", point[0] + 0.5, point[1] + 0.5, "l", 0, width]);
                }
                else {
                    path = path.concat(["M", point[0] + 0.5, point[1] - 0.5, "l", 0, -width]);
                }
            }
        }
        if (odd || even) {
            if (oddPath.length) {
                if (!me.gridOdd && oddPath.length) {
                    me.gridOdd = surface.add({
                        type: 'path',
                        path: oddPath
                    });
                }
                me.gridOdd.setAttributes(Ext.apply({
                    path: oddPath,
                    hidden: false
                }, odd || {}), true);
            }
            if (evenPath.length) {
                if (!me.gridEven) {
                    me.gridEven = surface.add({
                        type: 'path',
                        path: evenPath
                    });
                }
                me.gridEven.setAttributes(Ext.apply({
                    path: evenPath,
                    hidden: false
                }, even || {}), true);
            }
        }
        else {
            if (path.length) {
                if (!me.gridLines) {
                    me.gridLines = me.chart.surface.add({
                        type: 'path',
                        path: path,
                        "stroke-width": me.lineWidth || 1,
                        stroke: me.gridColor || '#ccc'
                    });
                }
                me.gridLines.setAttributes({
                    hidden: false,
                    path: path
                }, true);
            }
            else if (me.gridLines) {
                me.gridLines.hide(true);
            }
        }
    },

    // @private
    getOrCreateLabel: function (i, text) {
        var me = this,
            labelGroup = me.labelGroup,
            textLabel = labelGroup.getAt(i),
            surface = me.chart.surface;
        if (textLabel) {
            if (text != textLabel.attr.text) {
                textLabel.setAttributes(Ext.apply({
                    text: text
                }, me.label), true);
                textLabel._bbox = textLabel.getBBox();
            }
        }
        else {
            textLabel = surface.add(Ext.apply({
                group: labelGroup,
                type: 'text',
                x: 0,
                y: 0,
                text: text
            }, me.label));
            surface.renderItem(textLabel);
            textLabel._bbox = textLabel.getBBox();
        }
        //get untransformed bounding box
        if (me.label.rotation) {
            textLabel.setAttributes({
                rotation: {
                    degrees: 0
                }
            }, true);
            textLabel._ubbox = textLabel.getBBox();
            textLabel.setAttributes(me.label, true);
        } else {
            textLabel._ubbox = textLabel._bbox;
        }
        return textLabel;
    },

    rect2pointArray: function (sprite) {
        var surface = this.chart.surface,
            rect = surface.getBBox(sprite, true),
            p1 = [rect.x, rect.y],
            p1p = p1.slice(),
            p2 = [rect.x + rect.width, rect.y],
            p2p = p2.slice(),
            p3 = [rect.x + rect.width, rect.y + rect.height],
            p3p = p3.slice(),
            p4 = [rect.x, rect.y + rect.height],
            p4p = p4.slice(),
            matrix = sprite.matrix;
        //transform the points
        p1[0] = matrix.x.apply(matrix, p1p);
        p1[1] = matrix.y.apply(matrix, p1p);

        p2[0] = matrix.x.apply(matrix, p2p);
        p2[1] = matrix.y.apply(matrix, p2p);

        p3[0] = matrix.x.apply(matrix, p3p);
        p3[1] = matrix.y.apply(matrix, p3p);

        p4[0] = matrix.x.apply(matrix, p4p);
        p4[1] = matrix.y.apply(matrix, p4p);
        return [p1, p2, p3, p4];
    },

    intersect: function (l1, l2) {
        var r1 = this.rect2pointArray(l1),
            r2 = this.rect2pointArray(l2);
        return !!Ext.draw.Draw.intersect(r1, r2).length;
    },

    drawHorizontalLabels: function () {
        var me = this,
            labelConf = me.label,
            floor = Math.floor,
            max = Math.max,
            axes = me.chart.axes,
            insetPadding = me.chart.insetPadding,
            position = me.position,
            inflections = me.inflections,
            ln = inflections.length,
            labels = me.labels,
            maxHeight = 0,
            ratio,
            bbox, point, prevLabel, prevLabelId,
            adjustEnd = me.adjustEnd,
            hasLeft = axes.findIndex('position', 'left') != -1,
            hasRight = axes.findIndex('position', 'right') != -1,
            textLabel, text,
            last, x, y, i, firstLabel;

        last = ln - 1;
        //get a reference to the first text label dimensions
        point = inflections[0];
        firstLabel = me.getOrCreateLabel(0, me.label.renderer(labels[0]));
        ratio = Math.floor(Math.abs(Math.sin(labelConf.rotate && (labelConf.rotate.degrees * Math.PI / 180) || 0)));

        for (i = 0; i < ln; i++) {
            point = inflections[i];
            text = me.label.renderer(labels[i]);
            textLabel = me.getOrCreateLabel(i, text);
            bbox = textLabel._bbox;
            maxHeight = max(maxHeight, bbox.height + me.dashSize + me.label.padding);
            x = floor(point[0] - (ratio ? bbox.height : bbox.width) / 2);
            if (adjustEnd && me.chart.maxGutter[0] == 0) {
                if (i == 0 && !hasLeft) {
                    x = point[0];
                }
                else if (i == last && !hasRight) {
                    x = Math.min(x, point[0] - bbox.width + insetPadding);
                }
            }
            if (position == 'top') {
                y = point[1] - (me.dashSize * 2) - me.label.padding - (bbox.height / 2);
            }
            else {
                y = point[1] + (me.dashSize * 2) + me.label.padding + (bbox.height / 2);
            }

            textLabel.setAttributes({
                hidden: false,
                x: x,
                y: y
            }, true);

            // Skip label if there isn't available minimum space
            if (i != 0 && (me.intersect(textLabel, prevLabel)
                || me.intersect(textLabel, firstLabel))) {
                if (i === last && prevLabelId !== 0) {
                    prevLabel.hide(true);
                } else {
                    textLabel.hide(true);
                    continue;
                }
            }

            prevLabel = textLabel;
            prevLabelId = i;
        }

        return maxHeight;
    },

    drawVerticalLabels: function () {
        var me = this,
            inflections = me.inflections,
            position = me.position,
            ln = inflections.length,
            chart = me.chart,
            insetPadding = chart.insetPadding,
            labels = me.labels,
            maxWidth = 0,
            max = Math.max,
            floor = Math.floor,
            ceil = Math.ceil,
            axes = me.chart.axes,
            gutterY = me.chart.maxGutter[1],
            bbox, point, prevLabel, prevLabelId,
            hasTop = axes.findIndex('position', 'top') != -1,
            hasBottom = axes.findIndex('position', 'bottom') != -1,
            adjustEnd = me.adjustEnd,
            textLabel, text,
            last = ln - 1, x, y, i;

        for (i = 0; i < ln; i++) {
            point = inflections[i];
            text = me.label.renderer(labels[i]);
            textLabel = me.getOrCreateLabel(i, text);
            bbox = textLabel._bbox;

            maxWidth = max(maxWidth, bbox.width + me.dashSize + me.label.padding);
            y = point[1];
            if (adjustEnd && gutterY < bbox.height / 2) {
                if (i == last && !hasTop) {
                    y = Math.max(y, me.y - me.length + ceil(bbox.height / 2) - insetPadding);
                }
                else if (i == 0 && !hasBottom) {
                    y = me.y + gutterY - floor(bbox.height / 2);
                }
            }
            if (position == 'left') {
                x = point[0] - bbox.width - me.dashSize - me.label.padding - 2;
            }
            else {
                x = point[0] + me.dashSize + me.label.padding + 2;
            }
            textLabel.setAttributes(Ext.apply({
                hidden: false,
                x: x,
                y: y
            }, me.label), true);
            // Skip label if there isn't available minimum space
            if (i != 0 && me.intersect(textLabel, prevLabel)) {
                if (i === last && prevLabelId !== 0) {
                    prevLabel.hide(true);
                } else {
                    textLabel.hide(true);
                    continue;
                }
            }
            prevLabel = textLabel;
            prevLabelId = i;
        }

        return maxWidth;
    },

    /**
     * Renders the labels in the axes.
     */
    drawLabel: function () {
        var me = this,
            position = me.position,
            labelGroup = me.labelGroup,
            inflections = me.inflections,
            maxWidth = 0,
            maxHeight = 0,
            ln, i;

        if (position == 'left' || position == 'right') {
            maxWidth = me.drawVerticalLabels();
        } else {
            maxHeight = me.drawHorizontalLabels();
        }

        // Hide unused bars
        ln = labelGroup.getCount();
        i = inflections.length;
        for (; i < ln; i++) {
            labelGroup.getAt(i).hide(true);
        }

        me.bbox = {};
        Ext.apply(me.bbox, me.axisBBox);
        me.bbox.height = maxHeight;
        me.bbox.width = maxWidth;
        if (Ext.isString(me.title)) {
            me.drawTitle(maxWidth, maxHeight);
        }
    },

    /**
     * Updates the {@link #title} of this axis.
     * @param {String} title
     */
    setTitle: function (title) {
        this.title = title;
        this.drawLabel();
    },

    // @private draws the title for the axis.
    drawTitle: function (maxWidth, maxHeight) {
        var me = this,
            position = me.position,
            surface = me.chart.surface,
            displaySprite = me.displaySprite,
            title = me.title,
            rotate = (position == 'left' || position == 'right'),
            x = me.x,
            y = me.y,
            base, bbox, pad;

        if (displaySprite) {
            displaySprite.setAttributes({text: title}, true);
        } else {
            base = {
                type: 'text',
                x: 0,
                y: 0,
                text: title
            };
            displaySprite = me.displaySprite = surface.add(Ext.apply(base, me.axisTitleStyle, me.labelTitle));
            surface.renderItem(displaySprite);
        }
        bbox = displaySprite.getBBox();
        pad = me.dashSize + me.label.padding;

        if (rotate) {
            y -= ((me.length / 2) - (bbox.height / 2));
            if (position == 'left') {
                x -= (maxWidth + pad + (bbox.width / 2));
            }
            else {
                x += (maxWidth + pad + bbox.width - (bbox.width / 2));
            }
            me.bbox.width += bbox.width + 10;
        }
        else {
            x += (me.length / 2) - (bbox.width * 0.5);
            if (position == 'top') {
                y -= (maxHeight + pad + (bbox.height * 0.3));
            }
            else {
                y += (maxHeight + pad + (bbox.height * 0.8));
            }
            me.bbox.height += bbox.height + 10;
        }
        displaySprite.setAttributes({
            translate: {
                x: x,
                y: y
            }
        }, true);
    }
});

/**
 * @class Ext.chart.axis.Category
 *
 * A type of axis that displays items in categories. This axis is generally used to
 * display categorical information like names of items, month names, quarters, etc.
 * but no quantitative values. For that other type of information `Number`
 * axis are more suitable.
 *
 * As with other axis you can set the position of the axis and its title. For example:
 *
 *     @example
 *     var store = Ext.create('Ext.data.JsonStore', {
 *         fields: ['name', 'data1', 'data2', 'data3', 'data4', 'data5'],
 *         data: [
 *             {'name':'metric one', 'data1':10, 'data2':12, 'data3':14, 'data4':8, 'data5':13},
 *             {'name':'metric two', 'data1':7, 'data2':8, 'data3':16, 'data4':10, 'data5':3},
 *             {'name':'metric three', 'data1':5, 'data2':2, 'data3':14, 'data4':12, 'data5':7},
 *             {'name':'metric four', 'data1':2, 'data2':14, 'data3':6, 'data4':1, 'data5':23},
 *             {'name':'metric five', 'data1':27, 'data2':38, 'data3':36, 'data4':13, 'data5':33}
 *         ]
 *     });
 *
 *     Ext.create('Ext.chart.Chart', {
 *         renderTo: Ext.getBody(),
 *         width: 500,
 *         height: 300,
 *         store: store,
 *         axes: [{
 *             type: 'Numeric',
 *             position: 'left',
 *             fields: ['data1', 'data2', 'data3', 'data4', 'data5'],
 *             title: 'Sample Values',
 *             grid: {
 *                 odd: {
 *                     opacity: 1,
 *                     fill: '#ddd',
 *                     stroke: '#bbb',
 *                     'stroke-width': 1
 *                 }
 *             },
 *             minimum: 0,
 *             adjustMinimumByMajorUnit: 0
 *         }, {
 *             type: 'Category',
 *             position: 'bottom',
 *             fields: ['name'],
 *             title: 'Sample Metrics',
 *             grid: true,
 *             label: {
 *                 rotate: {
 *                     degrees: 315
 *                 }
 *             }
 *         }],
 *         series: [{
 *             type: 'area',
 *             highlight: false,
 *             axis: 'left',
 *             xField: 'name',
 *             yField: ['data1', 'data2', 'data3', 'data4', 'data5'],
 *             style: {
 *                 opacity: 0.93
 *             }
 *         }]
 *     });
 *
 * In this example with set the category axis to the bottom of the surface, bound the axis to
 * the `name` property and set as title _Month of the Year_.
 */
Ext.define('Ext.chart.axis.Category', {

    /* Begin Definitions */

    extend: 'Ext.chart.axis.Axis',

    alternateClassName: 'Ext.chart.CategoryAxis',

    alias: 'axis.category',

    /* End Definitions */

    /**
     * A list of category names to display along this axis.
     * @property {String} categoryNames
     */
    categoryNames: null,

    /**
     * Indicates whether or not to calculate the number of categories (ticks and
     * labels) when there is not enough room to display all labels on the axis.
     * If set to true, the axis will determine the number of categories to plot.
     * If not, all categories will be plotted.
     *
     * @property calculateCategoryCount
     * @type Boolean
     */
    calculateCategoryCount: false,

    // @private creates an array of labels to be used when rendering.
    setLabels: function() {
        var store = this.chart.getChartStore(),
            data = store.data.items,
            d, dLen, record,
            fields = this.fields,
            ln = fields.length,
            i;

        this.labels = [];
        for (d = 0, dLen = data.length; d < dLen; d++) {
            record = data[d];
            for (i = 0; i < ln; i++) {
                this.labels.push(record.get(fields[i]));
            }
        }
    },

    // @private calculates labels positions and marker positions for rendering.
    applyData: function() {
        this.callParent();
        this.setLabels();
        var count = this.chart.getChartStore().getCount();
        return {
            from: 0,
            to: count - 1,
            power: 1,
            step: 1,
            steps: count - 1
        };
    }
});

/**
 * @class Ext.chart.axis.Gauge
 *
 * Gauge Axis is the axis to be used with a Gauge series. The Gauge axis
 * displays numeric data from an interval defined by the `minimum`, `maximum` and
 * `step` configuration properties. The placement of the numeric data can be changed
 * by altering the `margin` option that is set to `10` by default.
 *
 * A possible configuration for this axis would look like:
 *
 *     axes: [{
 *         type: 'gauge',
 *         position: 'gauge',
 *         minimum: 0,
 *         maximum: 100,
 *         steps: 10,
 *         margin: 7
 *     }],
 */
Ext.define('Ext.chart.axis.Gauge', {

    /* Begin Definitions */

    extend: 'Ext.chart.axis.Abstract',

    /* End Definitions */

    /**
     * @cfg {Number} minimum (required)
     * The minimum value of the interval to be displayed in the axis.
     */

    /**
     * @cfg {Number} maximum (required)
     * The maximum value of the interval to be displayed in the axis.
     */

    /**
     * @cfg {Number} steps (required)
     * The number of steps and tick marks to add to the interval.
     */

    /**
     * @cfg {Number} [margin=10]
     * The offset positioning of the tick marks and labels in pixels.
     */

    /**
     * @cfg {String} title
     * The title for the Axis.
     */

    position: 'gauge',

    alias: 'axis.gauge',

    drawAxis: function(init) {
        var chart = this.chart,
            surface = chart.surface,
            bbox = chart.chartBBox,
            centerX = bbox.x + (bbox.width / 2),
            centerY = bbox.y + bbox.height,
            margin = this.margin || 10,
            rho = Math.min(bbox.width, 2 * bbox.height) /2 + margin,
            sprites = [], sprite,
            steps = this.steps,
            i, pi = Math.PI,
            cos = Math.cos,
            sin = Math.sin;

        if (this.sprites && !chart.resizing) {
            this.drawLabel();
            return;
        }

        if (this.margin >= 0) {
            if (!this.sprites) {
                //draw circles
                for (i = 0; i <= steps; i++) {
                    sprite = surface.add({
                        type: 'path',
                        path: ['M', centerX + (rho - margin) * cos(i / steps * pi - pi),
                                    centerY + (rho - margin) * sin(i / steps * pi - pi),
                                    'L', centerX + rho * cos(i / steps * pi - pi),
                                    centerY + rho * sin(i / steps * pi - pi), 'Z'],
                        stroke: '#ccc'
                    });
                    sprite.setAttributes({
                        hidden: false
                    }, true);
                    sprites.push(sprite);
                }
            } else {
                sprites = this.sprites;
                //draw circles
                for (i = 0; i <= steps; i++) {
                    sprites[i].setAttributes({
                        path: ['M', centerX + (rho - margin) * cos(i / steps * pi - pi),
                                    centerY + (rho - margin) * sin(i / steps * pi - pi),
                               'L', centerX + rho * cos(i / steps * pi - pi),
                                    centerY + rho * sin(i / steps * pi - pi), 'Z'],
                        stroke: '#ccc'
                    }, true);
                }
            }
        }
        this.sprites = sprites;
        this.drawLabel();
        if (this.title) {
            this.drawTitle();
        }
    },

    drawTitle: function() {
        var me = this,
            chart = me.chart,
            surface = chart.surface,
            bbox = chart.chartBBox,
            labelSprite = me.titleSprite,
            labelBBox;

        if (!labelSprite) {
            me.titleSprite = labelSprite = surface.add({
                type: 'text',
                zIndex: 2
            });
        }
        labelSprite.setAttributes(Ext.apply({
            text: me.title
        }, me.label || {}), true);
        labelBBox = labelSprite.getBBox();
        labelSprite.setAttributes({
            x: bbox.x + (bbox.width / 2) - (labelBBox.width / 2),
            y: bbox.y + bbox.height - (labelBBox.height / 2) - 4
        }, true);
    },

    /**
     * Updates the {@link #title} of this axis.
     * @param {String} title
     */
    setTitle: function(title) {
        this.title = title;
        this.drawTitle();
    },

    drawLabel: function() {
        var chart = this.chart,
            surface = chart.surface,
            bbox = chart.chartBBox,
            centerX = bbox.x + (bbox.width / 2),
            centerY = bbox.y + bbox.height,
            margin = this.margin || 10,
            rho = Math.min(bbox.width, 2 * bbox.height) /2 + 2 * margin,
            round = Math.round,
            labelArray = [], label,
            maxValue = this.maximum || 0,
            minValue = this.minimum || 0,
            steps = this.steps, i = 0,
            adjY,
            pi = Math.PI,
            cos = Math.cos,
            sin = Math.sin,
            labelConf = this.label,
            renderer = labelConf.renderer || function(v) { return v; };

        if (!this.labelArray) {
            //draw scale
            for (i = 0; i <= steps; i++) {
                // TODO Adjust for height of text / 2 instead
                adjY = (i === 0 || i === steps) ? 7 : 0;
                label = surface.add({
                    type: 'text',
                    text: renderer(round(minValue + i / steps * (maxValue - minValue))),
                    x: centerX + rho * cos(i / steps * pi - pi),
                    y: centerY + rho * sin(i / steps * pi - pi) - adjY,
                    'text-anchor': 'middle',
                    'stroke-width': 0.2,
                    zIndex: 10,
                    stroke: '#333'
                });
                label.setAttributes({
                    hidden: false
                }, true);
                labelArray.push(label);
            }
        }
        else {
            labelArray = this.labelArray;
            //draw values
            for (i = 0; i <= steps; i++) {
                // TODO Adjust for height of text / 2 instead
                adjY = (i === 0 || i === steps) ? 7 : 0;
                labelArray[i].setAttributes({
                    text: renderer(round(minValue + i / steps * (maxValue - minValue))),
                    x: centerX + rho * cos(i / steps * pi - pi),
                    y: centerY + rho * sin(i / steps * pi - pi) - adjY
                }, true);
            }
        }
        this.labelArray = labelArray;
    }
});
/**
 * @class Ext.chart.axis.Numeric
 *
 * An axis to handle numeric values. This axis is used for quantitative data as
 * opposed to the category axis. You can set mininum and maximum values to the
 * axis so that the values are bound to that. If no values are set, then the
 * scale will auto-adjust to the values.
 *
 *     @example
 *     var store = Ext.create('Ext.data.JsonStore', {
 *          fields: ['name', 'data1', 'data2', 'data3', 'data4', 'data5'],
 *          data: [
 *              {'name':'metric one', 'data1':10, 'data2':12, 'data3':14, 'data4':8, 'data5':13},
 *              {'name':'metric two', 'data1':7, 'data2':8, 'data3':16, 'data4':10, 'data5':3},
 *              {'name':'metric three', 'data1':5, 'data2':2, 'data3':14, 'data4':12, 'data5':7},
 *              {'name':'metric four', 'data1':2, 'data2':14, 'data3':6, 'data4':1, 'data5':23},
 *              {'name':'metric five', 'data1':27, 'data2':38, 'data3':36, 'data4':13, 'data5':33}
 *          ]
 *     });
 *
 *     Ext.create('Ext.chart.Chart', {
 *         renderTo: Ext.getBody(),
 *         width: 500,
 *         height: 300,
 *         store: store,
 *         axes: [{
 *             type: 'Numeric',
 *             grid: true,
 *             position: 'left',
 *             fields: ['data1', 'data2', 'data3', 'data4', 'data5'],
 *             title: 'Sample Values',
 *             grid: {
 *                 odd: {
 *                     opacity: 1,
 *                     fill: '#ddd',
 *                     stroke: '#bbb',
 *                     'stroke-width': 1
 *                 }
 *             },
 *             minimum: 0,
 *             adjustMinimumByMajorUnit: 0
 *         }, {
 *             type: 'Category',
 *             position: 'bottom',
 *             fields: ['name'],
 *             title: 'Sample Metrics',
 *             grid: true,
 *             label: {
 *                 rotate: {
 *                     degrees: 315
 *                 }
 *             }
 *         }],
 *         series: [{
 *             type: 'area',
 *             highlight: false,
 *             axis: 'left',
 *             xField: 'name',
 *             yField: ['data1', 'data2', 'data3', 'data4', 'data5'],
 *             style: {
 *                 opacity: 0.93
 *             }
 *         }]
 *     });
 *
 * In this example we create an axis of Numeric type. We set a minimum value so that
 * even if all series have values greater than zero, the grid starts at zero. We bind
 * the axis onto the left part of the surface by setting `position` to `left`.
 * We bind three different store fields to this axis by setting `fields` to an array.
 * We set the title of the axis to _Number of Hits_ by using the `title` property.
 * We use a `grid` configuration to set odd background rows to a certain style and even rows
 * to be transparent/ignored.
 */
Ext.define('Ext.chart.axis.Numeric', {

    /* Begin Definitions */

    extend: 'Ext.chart.axis.Axis',

    alternateClassName: 'Ext.chart.NumericAxis',

    /* End Definitions */

    type: 'numeric',

    alias: 'axis.numeric',

    uses: ['Ext.data.Store'],

    constructor: function(config) {
        var me = this,
            hasLabel = !!(config.label && config.label.renderer),
            label;

        me.callParent([config]);
        label = me.label;

        if (config.constrain == null) {
            me.constrain = (config.minimum != null && config.maximum != null);
        }

        if (!hasLabel) {
            label.renderer = function(v) {
                return me.roundToDecimal(v, me.decimals);
            };
        }
    },

    roundToDecimal: function(v, dec) {
        var val = Math.pow(10, dec || 0);
        return Math.round(v * val) / val;
    },

    /**
     * The minimum value drawn by the axis. If not set explicitly, the axis
     * minimum will be calculated automatically.
     *
     * @property {Number} minimum
     */
    minimum: NaN,

    /**
     * The maximum value drawn by the axis. If not set explicitly, the axis
     * maximum will be calculated automatically.
     *
     * @property {Number} maximum
     */
    maximum: NaN,

    /**
     * @cfg {Boolean} constrain
     * If true, the values of the chart will be rendered only if they belong between minimum and maximum
     * If false, all values of the chart will be rendered, regardless of whether they belong between minimum and maximum or not
     * Default's true if maximum and minimum is specified.
     */
    constrain: true,

    /**
     * The number of decimals to round the value to.
     *
     * @property {Number} decimals
     */
    decimals: 2,

    /**
     * The scaling algorithm to use on this axis. May be "linear" or
     * "logarithmic".  Currently only linear scale is implemented.
     *
     * @property {String} scale
     * @private
     */
    scale: "linear",

    // @private constrains to datapoints between minimum and maximum only
    doConstrain: function() {
        var me = this,
            store = me.chart.store,
            items = store.data.items,
            d, dLen, record,
            series = me.chart.series.items,
            fields = me.fields,
            ln = fields.length,
            range = me.calcEnds(),
            min = range.from, max = range.to, i, l,
            useAcum = false,
            value, data = [],
            addRecord;

        for (i = 0, l = series.length; i < l; i++) {
            if (series[i].type === 'bar' && series[i].stacked) {
                // Do not constrain stacked bar chart.
                return;
            }
        }

        for (d = 0, dLen = items.length; d < dLen; d++) {
            addRecord = true;
            record = items[d];
            for (i = 0; i < ln; i++) {
                value = record.get(fields[i]);
                if (+value < +min) {
                    addRecord = false;
                    break;
                }
                if (+value > +max) {
                    addRecord = false;
                    break;
                }
            }
            if (addRecord) {
                data.push(record);
            }
        }
        me.chart.substore = Ext.create('Ext.data.Store', { model: store.model });
        me.chart.substore.loadData(data); // data records must be loaded (not passed as config above because it's not json)
    },
    /**
     * Indicates the position of the axis relative to the chart
     *
     * @property {String} position
     */
    position: 'left',

    /**
     * Indicates whether to extend maximum beyond data's maximum to the nearest
     * majorUnit.
     *
     * @property {Boolean} adjustMaximumByMajorUnit
     */
    adjustMaximumByMajorUnit: false,

    /**
     * Indicates whether to extend the minimum beyond data's minimum to the
     * nearest majorUnit.
     *
     * @property {Boolean} adjustMinimumByMajorUnit
     */
    adjustMinimumByMajorUnit: false,

    // applying constraint
    processView: function() {
        var me = this,
            constrain = me.constrain;
        if (constrain) {
            me.doConstrain();
        }
    },

    // @private apply data.
    applyData: function() {
        this.callParent();
        return this.calcEnds();
    }
});

/**
 * @private
 */
Ext.define('Ext.chart.axis.Radial', {

    /* Begin Definitions */

    extend: 'Ext.chart.axis.Abstract',

    /* End Definitions */

    position: 'radial',

    alias: 'axis.radial',

    drawAxis: function(init) {
        var chart = this.chart,
            surface = chart.surface,
            bbox = chart.chartBBox,
            store = chart.store,
            l = store.getCount(),
            centerX = bbox.x + (bbox.width / 2),
            centerY = bbox.y + (bbox.height / 2),
            rho = Math.min(bbox.width, bbox.height) /2,
            sprites = [], sprite,
            steps = this.steps,
            i, j, pi2 = Math.PI * 2,
            cos = Math.cos, sin = Math.sin;

        if (this.sprites && !chart.resizing) {
            this.drawLabel();
            return;
        }

        if (!this.sprites) {
            //draw circles
            for (i = 1; i <= steps; i++) {
                sprite = surface.add({
                    type: 'circle',
                    x: centerX,
                    y: centerY,
                    radius: Math.max(rho * i / steps, 0),
                    stroke: '#ccc'
                });
                sprite.setAttributes({
                    hidden: false
                }, true);
                sprites.push(sprite);
            }
            //draw lines
            for (i = 0; i < l; i++) {
                sprite = surface.add({
                    type: 'path',
                    path: ['M', centerX, centerY, 'L', centerX + rho * cos(i / l * pi2), centerY + rho * sin(i / l * pi2), 'Z'],
                    stroke: '#ccc'
                });
                sprite.setAttributes({
                    hidden: false
                }, true);
                sprites.push(sprite);
            }
        } else {
            sprites = this.sprites;
            //draw circles
            for (i = 0; i < steps; i++) {
                sprites[i].setAttributes({
                    x: centerX,
                    y: centerY,
                    radius: Math.max(rho * (i + 1) / steps, 0),
                    stroke: '#ccc'
                }, true);
            }
            //draw lines
            for (j = 0; j < l; j++) {
                sprites[i + j].setAttributes({
                    path: ['M', centerX, centerY, 'L', centerX + rho * cos(j / l * pi2), centerY + rho * sin(j / l * pi2), 'Z'],
                    stroke: '#ccc'
                }, true);
            }
        }
        this.sprites = sprites;

        this.drawLabel();
    },

    drawLabel: function() {
        var chart = this.chart,
            seriesItems = chart.series.items,
            series,
            surface = chart.surface,
            bbox = chart.chartBBox,
            store = chart.store,
            data = store.data.items,
            ln, record,
            centerX = bbox.x + (bbox.width / 2),
            centerY = bbox.y + (bbox.height / 2),
            rho = Math.min(bbox.width, bbox.height) /2,
            max = Math.max, round = Math.round,
            labelArray = [], label,
            fields = [], nfields,
            categories = [], xField,
            aggregate = !this.maximum,
            maxValue = this.maximum || 0,
            steps = this.steps, i = 0, j, dx, dy,
            pi2 = Math.PI * 2,
            cos = Math.cos, sin = Math.sin,
            display = this.label.display,
            draw = display !== 'none',
            margin = 10;

        if (!draw) {
            return;
        }

        //get all rendered fields
        for (i = 0, ln = seriesItems.length; i < ln; i++) {
            series = seriesItems[i];
            fields.push(series.yField);
            xField = series.xField;
        }
        
        //get maxValue to interpolate
        for (j = 0, ln = data.length; j < ln; j++) {
            record = data[j];
            if (aggregate) {
                for (i = 0, nfields = fields.length; i < nfields; i++) {
                    maxValue = max(+record.get(fields[i]), maxValue);
                }
            }
            categories.push(record.get(xField));
        }
        if (!this.labelArray) {
            if (display != 'categories') {
                //draw scale
                for (i = 1; i <= steps; i++) {
                    label = surface.add({
                        type: 'text',
                        text: round(i / steps * maxValue),
                        x: centerX,
                        y: centerY - rho * i / steps,
                        'text-anchor': 'middle',
                        'stroke-width': 0.1,
                        stroke: '#333'
                    });
                    label.setAttributes({
                        hidden: false
                    }, true);
                    labelArray.push(label);
                }
            }
            if (display != 'scale') {
                //draw text
                for (j = 0, steps = categories.length; j < steps; j++) {
                    dx = cos(j / steps * pi2) * (rho + margin);
                    dy = sin(j / steps * pi2) * (rho + margin);
                    label = surface.add({
                        type: 'text',
                        text: categories[j],
                        x: centerX + dx,
                        y: centerY + dy,
                        'text-anchor': dx * dx <= 0.001? 'middle' : (dx < 0? 'end' : 'start')
                    });
                    label.setAttributes({
                        hidden: false
                    }, true);
                    labelArray.push(label);
                }
            }
        }
        else {
            labelArray = this.labelArray;
            if (display != 'categories') {
                //draw values
                for (i = 0; i < steps; i++) {
                    labelArray[i].setAttributes({
                        text: round((i + 1) / steps * maxValue),
                        x: centerX,
                        y: centerY - rho * (i + 1) / steps,
                        'text-anchor': 'middle',
                        'stroke-width': 0.1,
                        stroke: '#333'
                    }, true);
                }
            }
            if (display != 'scale') {
                //draw text
                for (j = 0, steps = categories.length; j < steps; j++) {
                    dx = cos(j / steps * pi2) * (rho + margin);
                    dy = sin(j / steps * pi2) * (rho + margin);
                    if (labelArray[i + j]) {
                        labelArray[i + j].setAttributes({
                            type: 'text',
                            text: categories[j],
                            x: centerX + dx,
                            y: centerY + dy,
                            'text-anchor': dx * dx <= 0.001? 'middle' : (dx < 0? 'end' : 'start')
                        }, true);
                    }
                }
            }
        }
        this.labelArray = labelArray;
    }
});
/**
 * A type of axis whose units are measured in time values. Use this axis
 * for listing dates that you will want to group or dynamically change.
 * If you just want to display dates as categories then use the
 * Category class for axis instead.
 *
 * For example:
 *
 *     axes: [{
 *         type: 'Time',
 *         position: 'bottom',
 *         fields: 'date',
 *         title: 'Day',
 *         dateFormat: 'M d',
 *
 *         constrain: true,
 *         fromDate: new Date('1/1/11'),
 *         toDate: new Date('1/7/11')
 *     }]
 *
 * In this example we're creating a time axis that has as title *Day*.
 * The field the axis is bound to is `date`.
 * The date format to use to display the text for the axis labels is `M d`
 * which is a three letter month abbreviation followed by the day number.
 * The time axis will show values for dates between `fromDate` and `toDate`.
 * Since `constrain` is set to true all other values for other dates not between
 * the fromDate and toDate will not be displayed.
 *
 */
Ext.define('Ext.chart.axis.Time', {

    /* Begin Definitions */

    extend: 'Ext.chart.axis.Numeric',

    alternateClassName: 'Ext.chart.TimeAxis',

    alias: 'axis.time',

    uses: ['Ext.data.Store'],

    /* End Definitions */

    /**
     * @cfg {String/Boolean} dateFormat
     * Indicates the format the date will be rendered on.
     * For example: 'M d' will render the dates as 'Jan 30', etc.
     * For a list of possible format strings see {@link Ext.Date Date}
     */
    dateFormat: false,

    /**
     * @cfg {Date} fromDate The starting date for the time axis.
     */
    fromDate: false,

    /**
     * @cfg {Date} toDate The ending date for the time axis.
     */
    toDate: false,

    /**
     * @cfg {Array/Boolean} step
     * An array with two components: The first is the unit of the step (day, month, year, etc). The second one is the number of units for the step (1, 2, etc.).
     *
     * Defaults to: [Ext.Date.DAY, 1].
     */
    step: [Ext.Date.DAY, 1],

    /**
     * @cfg {Boolean} constrain
     * If true, the values of the chart will be rendered only if they belong between the fromDate and toDate.
     * If false, the time axis will adapt to the new values by adding/removing steps.
     */
    constrain: false,

    constructor: function (config) {
        var me = this, label, f, df;
        me.callParent([config]);
        label = me.label || {};
        df = this.dateFormat;
        if (df) {
            if (label.renderer) {
                f = label.renderer;
                label.renderer = function(v) {
                    v = f(v);
                    return Ext.Date.format(new Date(f(v)), df);
                };
            } else {
                label.renderer = function(v) {
                    return Ext.Date.format(new Date(v >> 0), df);
                };
            }
        }
    },

    // Before rendering, set current default step count to be number of records.
    processView: function () {
        var me = this;
        if (me.fromDate) {
            me.minimum = +me.fromDate;
        }
        if (me.toDate) {
            me.maximum = +me.toDate;
        }
        if(me.constrain){
            me.doConstrain();
        }
     },

    // @private modifies the store and creates the labels for the axes.
    calcEnds: function() {
        var me = this, range, step = me.step;
        if (step) {
            range = me.getRange();
            range = Ext.draw.Draw.snapEndsByDateAndStep(new Date(range.min), new Date(range.max), Ext.isNumber(step) ? [Date.MILLI, step]: step);
            if (me.minimum) {
                range.from = me.minimum;
            }
            if (me.maximum) {
                range.to = me.maximum;
            }
            range.step = (range.to - range.from) / range.steps;
            return range;
        } else {
            return me.callParent(arguments);
        }
    }
 });



/**
 * @class Ext.chart.Tip
 * Provides tips for Ext.chart.series.Series.
 */
Ext.define('Ext.chart.Tip', {

    /* Begin Definitions */

    requires: ['Ext.tip.ToolTip', 'Ext.chart.TipSurface'],

    /* End Definitions */

    constructor: function(config) {
        var me = this,
            surface,
            sprites,
            tipSurface;
        if (config.tips) {
            me.tipTimeout = null;
            me.tipConfig = Ext.apply({}, config.tips, {
                renderer: Ext.emptyFn,
                constrainPosition: true,
                autoHide: true
            });
            me.tooltip = new Ext.tip.ToolTip(me.tipConfig);
            me.chart.surface.on('mousemove', me.tooltip.onMouseMove, me.tooltip);
            me.chart.surface.on('mouseleave', function() {
                me.hideTip();
            });
            if (me.tipConfig.surface) {
                //initialize a surface
                surface = me.tipConfig.surface;
                sprites = surface.sprites;
                tipSurface = new Ext.chart.TipSurface({
                    id: 'tipSurfaceComponent',
                    sprites: sprites
                });
                if (surface.width && surface.height) {
                    tipSurface.setSize(surface.width, surface.height);
                }
                me.tooltip.add(tipSurface);
                me.spriteTip = tipSurface;
            }
        }
    },

    showTip: function(item) {
        var me = this,
            tooltip,
            spriteTip,
            tipConfig,
            trackMouse,
            sprite,
            surface,
            surfaceExt,
            pos,
            x,
            y;
        if (!me.tooltip) {
            return;
        }
        clearTimeout(me.tipTimeout);
        tooltip = me.tooltip;
        spriteTip = me.spriteTip;
        tipConfig = me.tipConfig;
        trackMouse = tooltip.trackMouse;
        if (!trackMouse) {
            tooltip.trackMouse = true;
            sprite = item.sprite;
            surface = sprite.surface;
            surfaceExt = Ext.get(surface.getId());
            if (surfaceExt) {
                pos = surfaceExt.getXY();
                x = pos[0] + (sprite.attr.x || 0) + (sprite.attr.translation && sprite.attr.translation.x || 0);
                y = pos[1] + (sprite.attr.y || 0) + (sprite.attr.translation && sprite.attr.translation.y || 0);
                tooltip.targetXY = [x, y];
            }
        }
        if (spriteTip) {
            tipConfig.renderer.call(tooltip, item.storeItem, item, spriteTip.surface);
        } else {
            tipConfig.renderer.call(tooltip, item.storeItem, item);
        }
        tooltip.show();
        tooltip.trackMouse = trackMouse;
    },

    hideTip: function(item) {
        var tooltip = this.tooltip;
        if (!tooltip) {
            return;
        }
        clearTimeout(this.tipTimeout);
        this.tipTimeout = setTimeout(function() {
            tooltip.hide();
        }, 0);
    }
});
/**
 * @class Ext.chart.series.Series
 *
 * Series is the abstract class containing the common logic to all chart series. Series includes
 * methods from Labels, Highlights, Tips and Callouts mixins. This class implements the logic of handling
 * mouse events, animating, hiding, showing all elements and returning the color of the series to be used as a legend item.
 *
 * ## Listeners
 *
 * The series class supports listeners via the Observable syntax. Some of these listeners are:
 *
 *  - `itemmouseup` When the user interacts with a marker.
 *  - `itemmousedown` When the user interacts with a marker.
 *  - `itemmousemove` When the user iteracts with a marker.
 *  - `afterrender` Will be triggered when the animation ends or when the series has been rendered completely.
 *
 * For example:
 *
 *     series: [{
 *             type: 'column',
 *             axis: 'left',
 *             listeners: {
 *                     'afterrender': function() {
 *                             console('afterrender');
 *                     }
 *             },
 *             xField: 'category',
 *             yField: 'data1'
 *     }]
 */
Ext.define('Ext.chart.series.Series', {

    /* Begin Definitions */

    mixins: {
        observable: 'Ext.util.Observable',
        labels: 'Ext.chart.Label',
        highlights: 'Ext.chart.Highlight',
        tips: 'Ext.chart.Tip',
        callouts: 'Ext.chart.Callout'
    },

    /* End Definitions */

    /**
     * @cfg {Boolean/Object} highlight
     * If set to `true` it will highlight the markers or the series when hovering
     * with the mouse. This parameter can also be an object with the same style
     * properties you would apply to a {@link Ext.draw.Sprite} to apply custom
     * styles to markers and series.
     */

    /**
     * @cfg {Object} tips
     * Add tooltips to the visualization's markers. The options for the tips are the
     * same configuration used with {@link Ext.tip.ToolTip}. For example:
     *
     *     tips: {
     *       trackMouse: true,
     *       width: 140,
     *       height: 28,
     *       renderer: function(storeItem, item) {
     *         this.setTitle(storeItem.get('name') + ': ' + storeItem.get('data1') + ' views');
     *       }
     *     },
     */

    /**
     * @cfg {String} type
     * The type of series. Set in subclasses.
     */
    type: null,

    /**
     * @cfg {String} title
     * The human-readable name of the series.
     */
    title: null,

    /**
     * @cfg {Boolean} showInLegend
     * Whether to show this series in the legend.
     */
    showInLegend: true,

    /**
     * @cfg {Function} renderer
     * A function that can be overridden to set custom styling properties to each rendered element.
     * Passes in (sprite, record, attributes, index, store) to the function.
     */
    renderer: function(sprite, record, attributes, index, store) {
        return attributes;
    },

    /**
     * @cfg {Array} shadowAttributes
     * An array with shadow attributes
     */
    shadowAttributes: null,

    // @private animating flag
    animating: false,

    /**
     * @cfg {Object} listeners
     * An (optional) object with event callbacks. All event callbacks get the target *item* as first parameter. The callback functions are:
     *
     *  - itemmouseover
     *  - itemmouseout
     *  - itemmousedown
     *  - itemmouseup
     */

    constructor: function(config) {
        var me = this;
        if (config) {
            Ext.apply(me, config);
        }

        me.shadowGroups = [];

        me.mixins.labels.constructor.call(me, config);
        me.mixins.highlights.constructor.call(me, config);
        me.mixins.tips.constructor.call(me, config);
        me.mixins.callouts.constructor.call(me, config);

        me.addEvents({
            scope: me,
            itemmouseover: true,
            itemmouseout: true,
            itemmousedown: true,
            itemmouseup: true,
            mouseleave: true,
            afterdraw: true,

            /**
             * @event titlechange
             * Fires when the series title is changed via {@link #setTitle}.
             * @param {String} title The new title value
             * @param {Number} index The index in the collection of titles
             */
            titlechange: true
        });

        me.mixins.observable.constructor.call(me, config);

        me.on({
            scope: me,
            itemmouseover: me.onItemMouseOver,
            itemmouseout: me.onItemMouseOut,
            mouseleave: me.onMouseLeave
        });
        
        if (me.style) {
            Ext.apply(me.seriesStyle, me.style);
        }
    },
    
    /**
     * Iterate over each of the records for this series. The default implementation simply iterates
     * through the entire data store, but individual series implementations can override this to
     * provide custom handling, e.g. adding/removing records.
     * @param {Function} fn The function to execute for each record.
     * @param {Object} scope Scope for the fn.
     */
    eachRecord: function(fn, scope) {
        var chart = this.chart;
        (chart.substore || chart.store).each(fn, scope);
    },

    /**
     * Return the number of records being displayed in this series. Defaults to the number of
     * records in the store; individual series implementations can override to provide custom handling.
     */
    getRecordCount: function() {
        var chart = this.chart,
            store = chart.substore || chart.store;
        return store ? store.getCount() : 0;
    },

    /**
     * Determines whether the series item at the given index has been excluded, i.e. toggled off in the legend.
     * @param index
     */
    isExcluded: function(index) {
        var excludes = this.__excludes;
        return !!(excludes && excludes[index]);
    },

    // @private set the bbox and clipBox for the series
    setBBox: function(noGutter) {
        var me = this,
            chart = me.chart,
            chartBBox = chart.chartBBox,
            gutterX = noGutter ? 0 : chart.maxGutter[0],
            gutterY = noGutter ? 0 : chart.maxGutter[1],
            clipBox, bbox;

        clipBox = {
            x: chartBBox.x,
            y: chartBBox.y,
            width: chartBBox.width,
            height: chartBBox.height
        };
        me.clipBox = clipBox;

        bbox = {
            x: (clipBox.x + gutterX) - (chart.zoom.x * chart.zoom.width),
            y: (clipBox.y + gutterY) - (chart.zoom.y * chart.zoom.height),
            width: (clipBox.width - (gutterX * 2)) * chart.zoom.width,
            height: (clipBox.height - (gutterY * 2)) * chart.zoom.height
        };
        me.bbox = bbox;
    },

    // @private set the animation for the sprite
    onAnimate: function(sprite, attr) {
        var me = this;
        sprite.stopAnimation();
        if (me.animating) {
            return sprite.animate(Ext.applyIf(attr, me.chart.animate));
        } else {
            me.animating = true;
            return sprite.animate(Ext.apply(Ext.applyIf(attr, me.chart.animate), {
                listeners: {
                    'afteranimate': function() {
                        me.animating = false;
                        me.fireEvent('afterrender');
                    }
                }
            }));
        }
    },

    // @private return the gutter.
    getGutters: function() {
        return [0, 0];
    },

    // @private wrapper for the itemmouseover event.
    onItemMouseOver: function(item) {
        var me = this;
        if (item.series === me) {
            if (me.highlight) {
                me.highlightItem(item);
            }
            if (me.tooltip) {
                me.showTip(item);
            }
        }
    },

    // @private wrapper for the itemmouseout event.
    onItemMouseOut: function(item) {
        var me = this;
        if (item.series === me) {
            me.unHighlightItem();
            if (me.tooltip) {
                me.hideTip(item);
            }
        }
    },

    // @private wrapper for the mouseleave event.
    onMouseLeave: function() {
        var me = this;
        me.unHighlightItem();
        if (me.tooltip) {
            me.hideTip();
        }
    },

    /**
     * For a given x/y point relative to the Surface, find a corresponding item from this
     * series, if any.
     * @param {Number} x
     * @param {Number} y
     * @return {Object} An object describing the item, or null if there is no matching item.
     * The exact contents of this object will vary by series type, but should always contain the following:
     * @return {Ext.chart.series.Series} return.series the Series object to which the item belongs
     * @return {Object} return.value the value(s) of the item's data point
     * @return {Array} return.point the x/y coordinates relative to the chart box of a single point
     * for this data item, which can be used as e.g. a tooltip anchor point.
     * @return {Ext.draw.Sprite} return.sprite the item's rendering Sprite.
     */
    getItemForPoint: function(x, y) {
        //if there are no items to query just return null.
        if (!this.items || !this.items.length || this.seriesIsHidden) {
            return null;
        }
        var me = this,
            items = me.items,
            bbox = me.bbox,
            item, i, ln;
        // Check bounds
        if (!Ext.draw.Draw.withinBox(x, y, bbox)) {
            return null;
        }
        for (i = 0, ln = items.length; i < ln; i++) {
            if (items[i] && this.isItemInPoint(x, y, items[i], i)) {
                return items[i];
            }
        }

        return null;
    },

    isItemInPoint: function(x, y, item, i) {
        return false;
    },

    /**
     * Hides all the elements in the series.
     */
    hideAll: function() {
        var me = this,
            items = me.items,
            item, len, i, j, l, sprite, shadows;

        me.seriesIsHidden = true;
        me._prevShowMarkers = me.showMarkers;

        me.showMarkers = false;
        //hide all labels
        me.hideLabels(0);
        //hide all sprites
        for (i = 0, len = items.length; i < len; i++) {
            item = items[i];
            sprite = item.sprite;
            if (sprite) {
                sprite.setAttributes({
                    hidden: true
                }, true);
            }

            if (sprite && sprite.shadows) {
                shadows = sprite.shadows;
                for (j = 0, l = shadows.length; j < l; ++j) {
                    shadows[j].setAttributes({
                        hidden: true
                    }, true);
                }
            }
        }
    },

    /**
     * Shows all the elements in the series.
     */
    showAll: function() {
        var me = this,
            prevAnimate = me.chart.animate;
        me.chart.animate = false;
        me.seriesIsHidden = false;
        me.showMarkers = me._prevShowMarkers;
        me.drawSeries();
        me.chart.animate = prevAnimate;
    },
    
    hide: function() {
        if (this.items) {
            var me = this,
                items = me.items,
                i, j, lsh, ln, shadows;
            
            if (items && items.length) {
                for (i = 0, ln = items.length; i < ln; ++i) {
                    if (items[i].sprite) {
                        items[i].sprite.hide(true);

                        shadows = items[i].shadows || items[i].sprite.shadows;
                        if (shadows) {
                            for (j = 0, lsh = shadows.length; j < lsh; ++j) {
                                shadows[j].hide(true);
                            }
                        }
                    }
                }
                me.hideLabels();
            }
        }
    },

    /**
     * Returns a string with the color to be used for the series legend item.
     */
    getLegendColor: function(index) {
        var me = this, fill, stroke;
        if (me.seriesStyle) {
            fill = me.seriesStyle.fill;
            stroke = me.seriesStyle.stroke;
            if (fill && fill != 'none') {
                return fill;
            }
            if(stroke){
                return stroke;
            }
        }
        return (me.colorArrayStyle)?me.colorArrayStyle[me.seriesIdx % me.colorArrayStyle.length]:'#000';
    },

    /**
     * Checks whether the data field should be visible in the legend
     * @private
     * @param {Number} index The index of the current item
     */
    visibleInLegend: function(index){
        var excludes = this.__excludes;
        if (excludes) {
            return !excludes[index];
        }
        return !this.seriesIsHidden;
    },

    /**
     * Changes the value of the {@link #title} for the series.
     * Arguments can take two forms:
     * <ul>
     * <li>A single String value: this will be used as the new single title for the series (applies
     * to series with only one yField)</li>
     * <li>A numeric index and a String value: this will set the title for a single indexed yField.</li>
     * </ul>
     * @param {Number} index
     * @param {String} title
     */
    setTitle: function(index, title) {
        var me = this,
            oldTitle = me.title;

        if (Ext.isString(index)) {
            title = index;
            index = 0;
        }

        if (Ext.isArray(oldTitle)) {
            oldTitle[index] = title;
        } else {
            me.title = title;
        }

        me.fireEvent('titlechange', title, index);
    }
});

/**
 * @class Ext.chart.series.Cartesian
 *
 * Common base class for series implementations which plot values using x/y coordinates.
 */
Ext.define('Ext.chart.series.Cartesian', {

    /* Begin Definitions */

    extend: 'Ext.chart.series.Series',

    alternateClassName: ['Ext.chart.CartesianSeries', 'Ext.chart.CartesianChart'],

    /* End Definitions */

    /**
     * The field used to access the x axis value from the items from the data
     * source.
     *
     * @cfg xField
     * @type String
     */
    xField: null,

    /**
     * The field used to access the y-axis value from the items from the data
     * source.
     *
     * @cfg yField
     * @type String
     */
    yField: null,

    /**
     * @cfg {String/String[]} axis
     * The position of the axis to bind the values to. Possible values are 'left', 'bottom', 'top' and 'right'.
     * You must explicitly set this value to bind the values of the line series to the ones in the axis, otherwise a
     * relative scale will be used. For example, if you're using a Scatter or Line series and you'd like to have the
     * values in the chart relative to the bottom and left axes then `axis` should be `['left', 'bottom']`.
     */
    axis: 'left',

    getLegendLabels: function() {
        var me = this,
            labels = [],
            fields, i, ln,
            combinations = me.combinations,
            title,
            combo, label0, label1;

        fields = [].concat(me.yField);
        for (i = 0, ln = fields.length; i < ln; i++) {
            title = me.title;
            // Use the 'title' config if present, otherwise use the raw yField name
            labels.push((Ext.isArray(title) ? title[i] : title) || fields[i]);
        }

        // Handle yFields combined via legend drag-drop
        // TODO need to check to see if this is supported in extjs 4 branch
        if (combinations) {
            combinations = Ext.Array.from(combinations);
            for (i = 0, ln = combinations.length; i < ln; i++) {
                combo = combinations[i];
                label0 = labels[combo[0]];
                label1 = labels[combo[1]];
                labels[combo[1]] = label0 + ' & ' + label1;
                labels.splice(combo[0], 1);
            }
        }

        return labels;
    },

    /**
     * @protected Iterates over a given record's values for each of this series's yFields,
     * executing a given function for each value. Any yFields that have been combined
     * via legend drag-drop will be treated as a single value.
     * @param {Ext.data.Model} record
     * @param {Function} fn
     * @param {Object} scope
     */
    eachYValue: function(record, fn, scope) {
        var me = this,
            yValueAccessors = me.getYValueAccessors(),
            i, ln, accessor;
        
        for (i = 0, ln = yValueAccessors.length; i < ln; i++) {
            accessor = yValueAccessors[i];
            fn.call(scope, accessor(record), i);
        }
    },

    /**
     * @protected Returns the number of yField values, taking into account fields combined
     * via legend drag-drop.
     * @return {Number}
     */
    getYValueCount: function() {
        return this.getYValueAccessors().length;
    },

    combine: function(index1, index2) {
        var me = this,
            accessors = me.getYValueAccessors(),
            accessor1 = accessors[index1],
            accessor2 = accessors[index2];

        // Combine the yValue accessors for the two indexes into a single accessor that returns their sum
        accessors[index2] = function(record) {
            return accessor1(record) + accessor2(record);
        };
        accessors.splice(index1, 1);

        me.callParent([index1, index2]);
    },

    clearCombinations: function() {
        // Clear combined accessors, they'll get regenerated on next call to getYValueAccessors
        delete this.yValueAccessors;
        this.callParent();
    },

    /**
     * @protected Returns an array of functions, each of which returns the value of the yField
     * corresponding to function's index in the array, for a given record (each function takes the
     * record as its only argument.) If yFields have been combined by the user via legend drag-drop,
     * this list of accessors will be kept in sync with those combinations.
     * @return {Array} array of accessor functions
     */
    getYValueAccessors: function() {
        var me = this,
            accessors = me.yValueAccessors,
            yFields, yField, i, ln;
        if (!accessors) {
            accessors = me.yValueAccessors = [];
            yFields = [].concat(me.yField);
            
            for (i = 0, ln = yFields.length; i < ln; i++) {
                yField = yFields[i];
                accessors.push(function(record) {
                    return record.get(yField);
                });
            }
        }
        return accessors;
    },

    /**
     * Calculate the min and max values for this series's xField.
     * @return {Array} [min, max]
     */
    getMinMaxXValues: function() {
        var me = this,
            chart = me.chart,
            store = chart.getChartStore(),
            data = store.data.items,
            i, ln, record,
            min, max,
            xField = me.xField,
            xValue;

        if (me.getRecordCount() > 0) {
            min = Infinity;
            max = -min;
                
            for (i = 0, ln = data.length; i < ln; i++) {
                record = data[i];
                xValue = record.get(xField);
                if (xValue > max) {
                    max = xValue;
                }
                if (xValue < min) {
                    min = xValue;
                }
            }
        } else {
            min = max = 0;
        }
        return [min, max];
    },

    /**
     * Calculate the min and max values for this series's yField(s). Takes into account yField
     * combinations, exclusions, and stacking.
     * @return {Array} [min, max]
     */
    getMinMaxYValues: function() {
        var me = this,
            chart = me.chart,
            store = chart.getChartStore(),
            data = store.data.items,
            i, ln, record,
            stacked = me.stacked,
            min, max,
            positiveTotal, negativeTotal;

        function eachYValueStacked(yValue, i) {
            if (!me.isExcluded(i)) {
                if (yValue < 0) {
                    negativeTotal += yValue;
                } else {
                    positiveTotal += yValue;
                }
            }
        }

        function eachYValue(yValue, i) {
            if (!me.isExcluded(i)) {
                if (yValue > max) {
                    max = yValue;
                }
                if (yValue < min) {
                    min = yValue;
                }
            }
        }

        if (me.getRecordCount() > 0) {
            min = Infinity;
            max = -min;
            
            for (i = 0, ln = data.length; i < ln; i++) {
                record = data[i];
                if (stacked) {
                    positiveTotal = 0;
                    negativeTotal = 0;
                    me.eachYValue(record, eachYValueStacked);
                    if (positiveTotal > max) {
                        max = positiveTotal;
                    }
                    if (negativeTotal < min) {
                        min = negativeTotal;
                    }
                } else {
                    me.eachYValue(record, eachYValue);
                }
            }
        } else {
            min = max = 0;
        }
        return [min, max];
    },

    getAxesForXAndYFields: function() {
        var me = this,
            axes = me.chart.axes,
            axis = [].concat(me.axis),
            yFields = {}, yFieldList = [].concat(me.yField),
            xFields = {}, xFieldList = [].concat(me.xField),
            fields, xAxis, yAxis, i, ln, flipXY;

        
        flipXY = me.type === 'bar' && me.column === false;
        if(flipXY) {
            fields = yFieldList;
            yFieldList = xFieldList;
            xFieldList = fields;
        }
        if (Ext.Array.indexOf(axis, 'top') > -1) {
            xAxis = 'top';
        } else if (Ext.Array.indexOf(axis, 'bottom') > -1) {
            xAxis = 'bottom';
        } else {
            if (axes.get('top') && axes.get('bottom')) {
                for (i = 0, ln = xFieldList.length; i < ln; i++) {
                    xFields[xFieldList[i]] = true;
                }
                fields = [].concat(axes.get('bottom').fields);
                for (i = 0, ln = fields.length; i < ln; i++) {
                    if (xFields[fields[i]]) {
                        xAxis = 'bottom';
                        break
                    }
                }
                fields = [].concat(axes.get('top').fields);
                for (i = 0, ln = fields.length; i < ln; i++) {
                    if (xFields[fields[i]]) {
                        xAxis = 'top';
                        break
                    }
                }
            } else if (axes.get('top')) {
                xAxis = 'top';
            } else if (axes.get('bottom')) {
                xAxis = 'bottom';
            }
        }
        if (Ext.Array.indexOf(axis, 'left') > -1) {
            yAxis = 'left';
        } else if (Ext.Array.indexOf(axis, 'right') > -1) {
            yAxis = 'right';
        } else {
            if (axes.get('left') && axes.get('right')) {
                for (i = 0, ln = yFieldList.length; i < ln; i++) {
                    yFields[yFieldList[i]] = true;
                }
                fields = [].concat(axes.get('right').fields);
                for (i = 0, ln = fields.length; i < ln; i++) {
                    if (yFields[fields[i]]) {

                        break
                    }
                }
                fields = [].concat(axes.get('left').fields);
                for (i = 0, ln = fields.length; i < ln; i++) {
                    if (yFields[fields[i]]) {
                        yAxis = 'left';
                        break
                    }
                }
            } else if (axes.get('left')) {
                yAxis = 'left';
            } else if (axes.get('right')) {
                yAxis = 'right';
            }
        }

        return flipXY ? {
            xAxis: yAxis,
            yAxis: xAxis
        }: {
            xAxis: xAxis,
            yAxis: yAxis
        };
    }


});

/**
 * @class Ext.chart.series.Area
 * @extends Ext.chart.series.Cartesian
 *
 * Creates a Stacked Area Chart. The stacked area chart is useful when displaying multiple aggregated layers of information.
 * As with all other series, the Area Series must be appended in the *series* Chart array configuration. See the Chart
 * documentation for more information. A typical configuration object for the area series could be:
 *
 *     @example
 *     var store = Ext.create('Ext.data.JsonStore', {
 *         fields: ['name', 'data1', 'data2', 'data3', 'data4', 'data5'],
 *         data: [
 *             { 'name': 'metric one',   'data1':10, 'data2':12, 'data3':14, 'data4':8,  'data5':13 },
 *             { 'name': 'metric two',   'data1':7,  'data2':8,  'data3':16, 'data4':10, 'data5':3  },
 *             { 'name': 'metric three', 'data1':5,  'data2':2,  'data3':14, 'data4':12, 'data5':7  },
 *             { 'name': 'metric four',  'data1':2,  'data2':14, 'data3':6,  'data4':1,  'data5':23 },
 *             { 'name': 'metric five',  'data1':27, 'data2':38, 'data3':36, 'data4':13, 'data5':33 }
 *         ]
 *     });
 *
 *     Ext.create('Ext.chart.Chart', {
 *         renderTo: Ext.getBody(),
 *         width: 500,
 *         height: 300,
 *         store: store,
 *         axes: [
 *             {
 *                 type: 'Numeric',
 *                 grid: true,
 *                 position: 'left',
 *                 fields: ['data1', 'data2', 'data3', 'data4', 'data5'],
 *                 title: 'Sample Values',
 *                 grid: {
 *                     odd: {
 *                         opacity: 1,
 *                         fill: '#ddd',
 *                         stroke: '#bbb',
 *                         'stroke-width': 1
 *                     }
 *                 },
 *                 minimum: 0,
 *                 adjustMinimumByMajorUnit: 0
 *             },
 *             {
 *                 type: 'Category',
 *                 position: 'bottom',
 *                 fields: ['name'],
 *                 title: 'Sample Metrics',
 *                 grid: true,
 *                 label: {
 *                     rotate: {
 *                         degrees: 315
 *                     }
 *                 }
 *             }
 *         ],
 *         series: [{
 *             type: 'area',
 *             highlight: false,
 *             axis: 'left',
 *             xField: 'name',
 *             yField: ['data1', 'data2', 'data3', 'data4', 'data5'],
 *             style: {
 *                 opacity: 0.93
 *             }
 *         }]
 *     });
 *
 * In this configuration we set `area` as the type for the series, set highlighting options to true for highlighting elements on hover,
 * take the left axis to measure the data in the area series, set as xField (x values) the name field of each element in the store,
 * and as yFields (aggregated layers) seven data fields from the same store. Then we override some theming styles by adding some opacity
 * to the style object.
 *
 * @xtype area
 */
Ext.define('Ext.chart.series.Area', {

    /* Begin Definitions */

    extend: 'Ext.chart.series.Cartesian',

    alias: 'series.area',

    requires: ['Ext.chart.axis.Axis', 'Ext.draw.Color', 'Ext.fx.Anim'],

    /* End Definitions */

    type: 'area',

    // @private Area charts are alyways stacked
    stacked: true,

    /**
     * @cfg {Object} style
     * Append styling properties to this object for it to override theme properties.
     */
    style: {},

    constructor: function(config) {
        this.callParent(arguments);
        var me = this,
            surface = me.chart.surface,
            i, l;
        config.highlightCfg = Ext.Object.merge({}, {
            lineWidth: 3,
            stroke: '#55c',
            opacity: 0.8,
            color: '#f00'
        }, config.highlightCfg);

        Ext.apply(me, config, {
            __excludes: []
        });
        if (me.highlight) {
            me.highlightSprite = surface.add({
                type: 'path',
                path: ['M', 0, 0],
                zIndex: 1000,
                opacity: 0.3,
                lineWidth: 5,
                hidden: true,
                stroke: '#444'
            });
        }
        me.group = surface.getGroup(me.seriesId);
    },

    // @private Shrinks dataSets down to a smaller size
    shrink: function(xValues, yValues, size) {
        var len = xValues.length,
            ratio = Math.floor(len / size),
            i, j,
            xSum = 0,
            yCompLen = this.areas.length,
            ySum = [],
            xRes = [],
            yRes = [];
        //initialize array
        for (j = 0; j < yCompLen; ++j) {
            ySum[j] = 0;
        }
        for (i = 0; i < len; ++i) {
            xSum += +xValues[i];
            for (j = 0; j < yCompLen; ++j) {
                ySum[j] += +yValues[i][j];
            }
            if (i % ratio == 0) {
                //push averages
                xRes.push(xSum/ratio);
                for (j = 0; j < yCompLen; ++j) {
                    ySum[j] /= ratio;
                }
                yRes.push(ySum);
                //reset sum accumulators
                xSum = 0;
                for (j = 0, ySum = []; j < yCompLen; ++j) {
                    ySum[j] = 0;
                }
            }
        }
        return {
            x: xRes,
            y: yRes
        };
    },

    // @private Get chart and data boundaries
    getBounds: function() {
        var me = this,
            chart = me.chart,
            store = chart.getChartStore(),
            data = store.data.items,
            i, l, record,
            areas = [].concat(me.yField),
            areasLen = areas.length,
            xValues = [],
            yValues = [],
            infinity = Infinity,
            minX = infinity,
            minY = infinity,
            maxX = -infinity,
            maxY = -infinity,
            math = Math,
            mmin = math.min,
            mmax = math.max,
            boundAxis = me.getAxesForXAndYFields(),
            boundXAxis = boundAxis.xAxis,
            boundYAxis = boundAxis.yAxis,
            ends, allowDate,
            bbox, xScale, yScale, xValue, yValue, areaIndex, acumY, ln, sumValues, clipBox, areaElem, axis, out;

        me.setBBox();
        bbox = me.bbox;

        if (axis = chart.axes.get(boundXAxis)) {
            if (axis.type === 'Time') {
                allowDate = true;
            }
            ends = axis.applyData();
            minX = ends.from;
            maxX = ends.to;
        }

        if (axis = chart.axes.get(boundYAxis)) {
            ends = axis.applyData();
            minY = ends.from;
            maxY = ends.to;
        }

        // If a field was specified without a corresponding axis, create one to get bounds
        if (me.xField && !Ext.isNumber(minX)) {
            axis = me.getMinMaxXValues();
            allowDate = true;
            minX = axis[0];
            maxX = axis[1];
        }

        if (me.yField && !Ext.isNumber(minY)) {
            axis = me.getMinMaxYValues();
            minY = axis[0];
            maxY = axis[1];
        }

        if (!Ext.isNumber(minY)) {
            minY = 0;
        }
        if (!Ext.isNumber(maxY)) {
            maxY = 0;
        }

        for (i = 0, l = data.length; i < l; i++) {
            record = data[i];
            xValue = record.get(me.xField);
            yValue = [];
            if (typeof xValue != 'number') {
                if (allowDate) {
                    xValue = +xValue;
                } else {
                    xValue = i;
                }
            }
            xValues.push(xValue);
            acumY = 0;
            for (areaIndex = 0; areaIndex < areasLen; areaIndex++) {
                // Excluded series
                if (me.__excludes[areaIndex]) {
                    continue;
                }
                areaElem = record.get(areas[areaIndex]);
                if (typeof areaElem == 'number') {
                    yValue.push(areaElem);
                }
            }
            yValues.push(yValue);
        }

        xScale = bbox.width / ((maxX - minX) || 1);
        yScale = bbox.height / ((maxY - minY) || 1);

        ln = xValues.length;
        if ((ln > bbox.width) && me.areas) {
            sumValues = me.shrink(xValues, yValues, bbox.width);
            xValues = sumValues.x;
            yValues = sumValues.y;
        }

        return {
            bbox: bbox,
            minX: minX,
            minY: minY,
            xValues: xValues,
            yValues: yValues,
            xScale: xScale,
            yScale: yScale,
            areasLen: areasLen
        };
    },

    // @private Build an array of paths for the chart
    getPaths: function() {
        var me = this,
            chart = me.chart,
            store = chart.getChartStore(),
            first = true,
            bounds = me.getBounds(),
            bbox = bounds.bbox,
            items = me.items = [],
            componentPaths = [],
            componentPath,
            count = 0,
            paths = [],
            i, ln, x, y, xValue, yValue, acumY, areaIndex, prevAreaIndex, areaElem, path;

        ln = bounds.xValues.length;
        // Start the path
        for (i = 0; i < ln; i++) {
            xValue = bounds.xValues[i];
            yValue = bounds.yValues[i];
            x = bbox.x + (xValue - bounds.minX) * bounds.xScale;
            acumY = 0;
            count = 0;
            for (areaIndex = 0; areaIndex < bounds.areasLen; areaIndex++) {
                // Excluded series
                if (me.__excludes[areaIndex]) {
                    continue;
                }
                if (!componentPaths[areaIndex]) {
                    componentPaths[areaIndex] = [];
                }
                areaElem = yValue[count];
                acumY += areaElem;
                y = bbox.y + bbox.height - (acumY - bounds.minY) * bounds.yScale;
                if (!paths[areaIndex]) {
                    paths[areaIndex] = ['M', x, y];
                    componentPaths[areaIndex].push(['L', x, y]);
                } else {
                    paths[areaIndex].push('L', x, y);
                    componentPaths[areaIndex].push(['L', x, y]);
                }
                if (!items[areaIndex]) {
                    items[areaIndex] = {
                        pointsUp: [],
                        pointsDown: [],
                        series: me
                    };
                }
                items[areaIndex].pointsUp.push([x, y]);
                count++;
            }
        }

        // Close the paths
        for (areaIndex = 0; areaIndex < bounds.areasLen; areaIndex++) {
            // Excluded series
            if (me.__excludes[areaIndex]) {
                continue;
            }
            path = paths[areaIndex];
            // Close bottom path to the axis
            if (areaIndex == 0 || first) {
                first = false;
                path.push('L', x, bbox.y + bbox.height,
                          'L', bbox.x, bbox.y + bbox.height,
                          'Z');
            }
            // Close other paths to the one before them
            else {
                componentPath = componentPaths[prevAreaIndex];
                componentPath.reverse();
                path.push('L', x, componentPath[0][2]);
                for (i = 0; i < ln; i++) {
                    path.push(componentPath[i][0],
                              componentPath[i][1],
                              componentPath[i][2]);
                    items[areaIndex].pointsDown[ln -i -1] = [componentPath[i][1], componentPath[i][2]];
                }
                path.push('L', bbox.x, path[2], 'Z');
            }
            prevAreaIndex = areaIndex;
        }
        return {
            paths: paths,
            areasLen: bounds.areasLen
        };
    },

    /**
     * Draws the series for the current chart.
     */
    drawSeries: function() {
        var me = this,
            chart = me.chart,
            store = chart.getChartStore(),
            surface = chart.surface,
            animate = chart.animate,
            group = me.group,
            endLineStyle = Ext.apply(me.seriesStyle, me.style),
            colorArrayStyle = me.colorArrayStyle,
            colorArrayLength = colorArrayStyle && colorArrayStyle.length || 0,
            areaIndex, areaElem, paths, path, rendererAttributes;
        
        me.unHighlightItem();
        me.cleanHighlights();

        if (!store || !store.getCount() || me.seriesIsHidden) {
            me.hide();
            me.items = [];
            return;
        }

        paths = me.getPaths();

        if (!me.areas) {
            me.areas = [];
        }

        for (areaIndex = 0; areaIndex < paths.areasLen; areaIndex++) {
            // Excluded series
            if (me.__excludes[areaIndex]) {
                continue;
            }
            if (!me.areas[areaIndex]) {
                me.items[areaIndex].sprite = me.areas[areaIndex] = surface.add(Ext.apply({}, {
                    type: 'path',
                    group: group,
                    // 'clip-rect': me.clipBox,
                    path: paths.paths[areaIndex],
                    stroke: endLineStyle.stroke || colorArrayStyle[areaIndex % colorArrayLength],
                    fill: colorArrayStyle[areaIndex % colorArrayLength]
                }, endLineStyle || {}));
            }
            areaElem = me.areas[areaIndex];
            path = paths.paths[areaIndex];
            if (animate) {
                //Add renderer to line. There is not a unique record associated with this.
                rendererAttributes = me.renderer(areaElem, false, {
                    path: path,
                    // 'clip-rect': me.clipBox,
                    fill: colorArrayStyle[areaIndex % colorArrayLength],
                    stroke: endLineStyle.stroke || colorArrayStyle[areaIndex % colorArrayLength]
                }, areaIndex, store);
                //fill should not be used here but when drawing the special fill path object
                me.animation = me.onAnimate(areaElem, {
                    to: rendererAttributes
                });
            } else {
                rendererAttributes = me.renderer(areaElem, false, {
                    path: path,
                    // 'clip-rect': me.clipBox,
                    hidden: false,
                    fill: colorArrayStyle[areaIndex % colorArrayLength],
                    stroke: endLineStyle.stroke || colorArrayStyle[areaIndex % colorArrayLength]
                }, areaIndex, store);
                me.areas[areaIndex].setAttributes(rendererAttributes, true);
            }
        }
        me.renderLabels();
        me.renderCallouts();
    },

    // @private
    onAnimate: function(sprite, attr) {
        sprite.show();
        return this.callParent(arguments);
    },

    // @private
    onCreateLabel: function(storeItem, item, i, display) {
        var me = this,
            group = me.labelsGroup,
            config = me.label,
            bbox = me.bbox,
            endLabelStyle = Ext.apply(config, me.seriesLabelStyle);

        return me.chart.surface.add(Ext.apply({
            'type': 'text',
            'text-anchor': 'middle',
            'group': group,
            'x': item.point[0],
            'y': bbox.y + bbox.height / 2
        }, endLabelStyle || {}));
    },

    // @private
    onPlaceLabel: function(label, storeItem, item, i, display, animate, index) {
        var me = this,
            chart = me.chart,
            resizing = chart.resizing,
            config = me.label,
            format = config.renderer,
            field = config.field,
            bbox = me.bbox,
            x = item.point[0],
            y = item.point[1],
            bb, width, height;

        label.setAttributes({
            text: format(storeItem.get(field[index])),
            hidden: true
        }, true);

        bb = label.getBBox();
        width = bb.width / 2;
        height = bb.height / 2;

        x = x - width < bbox.x? bbox.x + width : x;
        x = (x + width > bbox.x + bbox.width) ? (x - (x + width - bbox.x - bbox.width)) : x;
        y = y - height < bbox.y? bbox.y + height : y;
        y = (y + height > bbox.y + bbox.height) ? (y - (y + height - bbox.y - bbox.height)) : y;

        if (me.chart.animate && !me.chart.resizing) {
            label.show(true);
            me.onAnimate(label, {
                to: {
                    x: x,
                    y: y
                }
            });
        } else {
            label.setAttributes({
                x: x,
                y: y
            }, true);
            if (resizing) {
                me.animation.on('afteranimate', function() {
                    label.show(true);
                });
            } else {
                label.show(true);
            }
        }
    },

    // @private
    onPlaceCallout : function(callout, storeItem, item, i, display, animate, index) {
        var me = this,
            chart = me.chart,
            surface = chart.surface,
            resizing = chart.resizing,
            config = me.callouts,
            items = me.items,
            prev = (i == 0) ? false : items[i -1].point,
            next = (i == items.length -1) ? false : items[i +1].point,
            cur = item.point,
            dir, norm, normal, a, aprev, anext,
            bbox = callout.label.getBBox(),
            offsetFromViz = 30,
            offsetToSide = 10,
            offsetBox = 3,
            boxx, boxy, boxw, boxh,
            p, clipRect = me.clipRect,
            x, y;

        //get the right two points
        if (!prev) {
            prev = cur;
        }
        if (!next) {
            next = cur;
        }
        a = (next[1] - prev[1]) / (next[0] - prev[0]);
        aprev = (cur[1] - prev[1]) / (cur[0] - prev[0]);
        anext = (next[1] - cur[1]) / (next[0] - cur[0]);

        norm = Math.sqrt(1 + a * a);
        dir = [1 / norm, a / norm];
        normal = [-dir[1], dir[0]];

        //keep the label always on the outer part of the "elbow"
        if (aprev > 0 && anext < 0 && normal[1] < 0 || aprev < 0 && anext > 0 && normal[1] > 0) {
            normal[0] *= -1;
            normal[1] *= -1;
        } else if (Math.abs(aprev) < Math.abs(anext) && normal[0] < 0 || Math.abs(aprev) > Math.abs(anext) && normal[0] > 0) {
            normal[0] *= -1;
            normal[1] *= -1;
        }

        //position
        x = cur[0] + normal[0] * offsetFromViz;
        y = cur[1] + normal[1] * offsetFromViz;

        //box position and dimensions
        boxx = x + (normal[0] > 0? 0 : -(bbox.width + 2 * offsetBox));
        boxy = y - bbox.height /2 - offsetBox;
        boxw = bbox.width + 2 * offsetBox;
        boxh = bbox.height + 2 * offsetBox;

        //now check if we're out of bounds and invert the normal vector correspondingly
        //this may add new overlaps between labels (but labels won't be out of bounds).
        if (boxx < clipRect[0] || (boxx + boxw) > (clipRect[0] + clipRect[2])) {
            normal[0] *= -1;
        }
        if (boxy < clipRect[1] || (boxy + boxh) > (clipRect[1] + clipRect[3])) {
            normal[1] *= -1;
        }

        //update positions
        x = cur[0] + normal[0] * offsetFromViz;
        y = cur[1] + normal[1] * offsetFromViz;

        //update box position and dimensions
        boxx = x + (normal[0] > 0? 0 : -(bbox.width + 2 * offsetBox));
        boxy = y - bbox.height /2 - offsetBox;
        boxw = bbox.width + 2 * offsetBox;
        boxh = bbox.height + 2 * offsetBox;

        //set the line from the middle of the pie to the box.
        callout.lines.setAttributes({
            path: ["M", cur[0], cur[1], "L", x, y, "Z"]
        }, true);
        //set box position
        callout.box.setAttributes({
            x: boxx,
            y: boxy,
            width: boxw,
            height: boxh
        }, true);
        //set text position
        callout.label.setAttributes({
            x: x + (normal[0] > 0? offsetBox : -(bbox.width + offsetBox)),
            y: y
        }, true);
        for (p in callout) {
            callout[p].show(true);
        }
    },

    isItemInPoint: function(x, y, item, i) {
        var me = this,
            pointsUp = item.pointsUp,
            pointsDown = item.pointsDown,
            abs = Math.abs,
            distChanged = false,
            last = false,
            dist = Infinity, p, pln, point;

        for (p = 0, pln = pointsUp.length; p < pln; p++) {
            point = [pointsUp[p][0], pointsUp[p][1]];
            
            distChanged = false;
            last = p == pln -1;

            if (dist > abs(x - point[0])) {
                dist = abs(x - point[0]);
                distChanged = true;
                if (last) {
                    ++p;
                }
            }
            
            if (!distChanged || (distChanged && last)) {
                point = pointsUp[p -1];
                if (y >= point[1] && (!pointsDown.length || y <= (pointsDown[p -1][1]))) {
                    item.storeIndex = p -1;
                    item.storeField = me.yField[i];
                    item.storeItem = me.chart.store.getAt(p -1);
                    item._points = pointsDown.length? [point, pointsDown[p -1]] : [point];
                    return true;
                } else {
                    break;
                }
            }
        }
        return false;
    },

    /**
     * Highlight this entire series.
     * @param {Object} item Info about the item; same format as returned by #getItemForPoint.
     */
    highlightSeries: function() {
        var area, to, fillColor;
        if (this._index !== undefined) {
            area = this.areas[this._index];
            if (area.__highlightAnim) {
                area.__highlightAnim.paused = true;
            }
            area.__highlighted = true;
            area.__prevOpacity = area.__prevOpacity || area.attr.opacity || 1;
            area.__prevFill = area.__prevFill || area.attr.fill;
            area.__prevLineWidth = area.__prevLineWidth || area.attr.lineWidth;
            fillColor = Ext.draw.Color.fromString(area.__prevFill);
            to = {
                lineWidth: (area.__prevLineWidth || 0) + 2
            };
            if (fillColor) {
                to.fill = fillColor.getLighter(0.2).toString();
            }
            else {
                to.opacity = Math.max(area.__prevOpacity - 0.3, 0);
            }
            if (this.chart.animate) {
                area.__highlightAnim = new Ext.fx.Anim(Ext.apply({
                    target: area,
                    to: to
                }, this.chart.animate));
            }
            else {
                area.setAttributes(to, true);
            }
        }
    },

    /**
     * UnHighlight this entire series.
     * @param {Object} item Info about the item; same format as returned by #getItemForPoint.
     */
    unHighlightSeries: function() {
        var area;
        if (this._index !== undefined) {
            area = this.areas[this._index];
            if (area.__highlightAnim) {
                area.__highlightAnim.paused = true;
            }
            if (area.__highlighted) {
                area.__highlighted = false;
                area.__highlightAnim = new Ext.fx.Anim({
                    target: area,
                    to: {
                        fill: area.__prevFill,
                        opacity: area.__prevOpacity,
                        lineWidth: area.__prevLineWidth
                    }
                });
            }
        }
    },

    /**
     * Highlight the specified item. If no item is provided the whole series will be highlighted.
     * @param item {Object} Info about the item; same format as returned by #getItemForPoint
     */
    highlightItem: function(item) {
        var me = this,
            points, path;
        if (!item) {
            this.highlightSeries();
            return;
        }
        points = item._points;
        path = points.length == 2? ['M', points[0][0], points[0][1], 'L', points[1][0], points[1][1]]
                : ['M', points[0][0], points[0][1], 'L', points[0][0], me.bbox.y + me.bbox.height];
        me.highlightSprite.setAttributes({
            path: path,
            hidden: false
        }, true);
    },

    /**
     * Un-highlights the specified item. If no item is provided it will un-highlight the entire series.
     * @param {Object} item Info about the item; same format as returned by #getItemForPoint
     */
    unHighlightItem: function(item) {
        if (!item) {
            this.unHighlightSeries();
        }

        if (this.highlightSprite) {
            this.highlightSprite.hide(true);
        }
    },

    // @private
    hideAll: function(index) {
        var me = this;
        index = (isNaN(me._index) ? index : me._index) || 0;
        me.__excludes[index] = true;
        me.areas[index].hide(true);
        me.redraw();
    },

    // @private
    showAll: function(index) {
        var me = this;
        index = (isNaN(me._index) ? index : me._index) || 0;
        me.__excludes[index] = false;
        me.areas[index].show(true);
        me.redraw();
    },

    redraw: function() {
        //store previous configuration for the legend
        //and set it to false so we don't
        //re-build label elements if not necessary.
        var me = this,
            prevLegendConfig;
        prevLegendConfig = me.chart.legend.rebuild;
        me.chart.legend.rebuild = false;
        me.chart.redraw();
        me.chart.legend.rebuild = prevLegendConfig;
    },
    
    hide: function() {
        if (this.areas) {
            var me = this,
                areas = me.areas,
                i, j, l, ln, shadows;
            
            if (areas && areas.length) {
                for (i = 0, ln = areas.length; i < ln; ++i) {
                    if (areas[i]) {
                        areas[i].hide(true);
                    }
                }
                me.hideLabels();
            }
        }
    },

    /**
     * Returns the color of the series (to be displayed as color for the series legend item).
     * @param {Object} item Info about the item; same format as returned by #getItemForPoint
     */
    getLegendColor: function(index) {
        var me = this;
        return me.colorArrayStyle[index % me.colorArrayStyle.length];
    }
});

/**
 * Creates a Bar Chart. A Bar Chart is a useful visualization technique to display quantitative information for
 * different categories that can show some progression (or regression) in the dataset. As with all other series, the Bar
 * Series must be appended in the *series* Chart array configuration. See the Chart documentation for more information.
 * A typical configuration object for the bar series could be:
 *
 *     @example
 *     var store = Ext.create('Ext.data.JsonStore', {
 *         fields: ['name', 'data'],
 *         data: [
 *             { 'name': 'metric one',   'data':10 },
 *             { 'name': 'metric two',   'data': 7 },
 *             { 'name': 'metric three', 'data': 5 },
 *             { 'name': 'metric four',  'data': 2 },
 *             { 'name': 'metric five',  'data':27 }
 *         ]
 *     });
 *
 *     Ext.create('Ext.chart.Chart', {
 *         renderTo: Ext.getBody(),
 *         width: 500,
 *         height: 300,
 *         animate: true,
 *         store: store,
 *         axes: [{
 *             type: 'Numeric',
 *             position: 'bottom',
 *             fields: ['data'],
 *             label: {
 *                 renderer: Ext.util.Format.numberRenderer('0,0')
 *             },
 *             title: 'Sample Values',
 *             grid: true,
 *             minimum: 0
 *         }, {
 *             type: 'Category',
 *             position: 'left',
 *             fields: ['name'],
 *             title: 'Sample Metrics'
 *         }],
 *         series: [{
 *             type: 'bar',
 *             axis: 'bottom',
 *             highlight: true,
 *             tips: {
 *               trackMouse: true,
 *               width: 140,
 *               height: 28,
 *               renderer: function(storeItem, item) {
 *                 this.setTitle(storeItem.get('name') + ': ' + storeItem.get('data') + ' views');
 *               }
 *             },
 *             label: {
 *               display: 'insideEnd',
 *                 field: 'data',
 *                 renderer: Ext.util.Format.numberRenderer('0'),
 *                 orientation: 'horizontal',
 *                 color: '#333',
 *                 'text-anchor': 'middle'
 *             },
 *             xField: 'name',
 *             yField: 'data'
 *         }]
 *     });
 *
 * In this configuration we set `bar` as the series type, bind the values of the bar to the bottom axis and set the
 * xField or category field to the `name` parameter of the store. We also set `highlight` to true which enables smooth
 * animations when bars are hovered. We also set some configuration for the bar labels to be displayed inside the bar,
 * to display the information found in the `data1` property of each element store, to render a formated text with the
 * `Ext.util.Format` we pass in, to have an `horizontal` orientation (as opposed to a vertical one) and we also set
 * other styles like `color`, `text-anchor`, etc.
 */
Ext.define('Ext.chart.series.Bar', {

    /* Begin Definitions */

    extend: 'Ext.chart.series.Cartesian',

    alternateClassName: ['Ext.chart.BarSeries', 'Ext.chart.BarChart', 'Ext.chart.StackedBarChart'],

    requires: ['Ext.chart.axis.Axis', 'Ext.fx.Anim'],

    /* End Definitions */

    type: 'bar',

    alias: 'series.bar',
    /**
     * @cfg {Boolean} column Whether to set the visualization as column chart or horizontal bar chart.
     */
    column: false,

    /**
     * @cfg style Style properties that will override the theming series styles.
     */
    style: {},

    /**
     * @cfg {Number} gutter The gutter space between single bars, as a percentage of the bar width
     */
    gutter: 38.2,

    /**
     * @cfg {Number} groupGutter The gutter space between groups of bars, as a percentage of the bar width
     */
    groupGutter: 38.2,

    /**
     * @cfg {Number} xPadding Padding between the left/right axes and the bars
     */
    xPadding: 0,

    /**
     * @cfg {Number} yPadding Padding between the top/bottom axes and the bars
     */
    yPadding: 10,

    constructor: function(config) {
        this.callParent(arguments);
        var me = this,
            surface = me.chart.surface,
            shadow = me.chart.shadow,
            i, l;
        config.highlightCfg = Ext.Object.merge({
            lineWidth: 3,
            stroke: '#55c',
            opacity: 0.8,
            color: '#f00'
        }, config.highlightCfg);
        Ext.apply(me, config, {
            shadowAttributes: [{
                "stroke-width": 6,
                "stroke-opacity": 0.05,
                stroke: 'rgb(200, 200, 200)',
                translate: {
                    x: 1.2,
                    y: 1.2
                }
            }, {
                "stroke-width": 4,
                "stroke-opacity": 0.1,
                stroke: 'rgb(150, 150, 150)',
                translate: {
                    x: 0.9,
                    y: 0.9
                }
            }, {
                "stroke-width": 2,
                "stroke-opacity": 0.15,
                stroke: 'rgb(100, 100, 100)',
                translate: {
                    x: 0.6,
                    y: 0.6
                }
            }]
        });

        me.group = surface.getGroup(me.seriesId + '-bars');
        if (shadow) {
            for (i = 0, l = me.shadowAttributes.length; i < l; i++) {
                me.shadowGroups.push(surface.getGroup(me.seriesId + '-shadows' + i));
            }
        }
    },

    // @private sets the bar girth.
    getBarGirth: function() {
        var me = this,
            store = me.chart.getChartStore(),
            column = me.column,
            ln = store.getCount(),
            gutter = me.gutter / 100;

        return (me.chart.chartBBox[column ? 'width' : 'height'] - me[column ? 'xPadding' : 'yPadding'] * 2) / (ln * (gutter + 1) - gutter);
    },

    // @private returns the gutters.
    getGutters: function() {
        var me = this,
            column = me.column,
            gutter = Math.ceil(me[column ? 'xPadding' : 'yPadding'] + me.getBarGirth() / 2);
        return me.column ? [gutter, 0] : [0, gutter];
    },

    // @private Get chart and data boundaries
    getBounds: function() {
        var me = this,
            chart = me.chart,
            store = chart.getChartStore(),
            data = store.data.items,
            i, ln, record,
            bars = [].concat(me.yField),
            barsLen = bars.length,
            groupBarsLen = barsLen,
            groupGutter = me.groupGutter / 100,
            column = me.column,
            xPadding = me.xPadding,
            yPadding = me.yPadding,
            stacked = me.stacked,
            barWidth = me.getBarGirth(),
            barWidthProperty = column ? 'width' : 'height',
            math = Math,
            mmin = math.min,
            mmax = math.max,
            mabs = math.abs,
            boundAxes = me.getAxesForXAndYFields(),
            boundYAxis = boundAxes.yAxis,
            ends, shrunkBarWidth, groupBarWidth, bbox, minY, maxY, axis, out,
            scale, zero, total, rec, j, plus, minus;

        me.setBBox(true);
        bbox = me.bbox;

        //Skip excluded series
        if (me.__excludes) {
            for (j = 0, total = me.__excludes.length; j < total; j++) {
                if (me.__excludes[j]) {
                    groupBarsLen--;
                }
            }
        }
        axis = chart.axes.get(boundYAxis);
        if (axis) {
            ends = axis.applyData();
            minY = ends.from;
            maxY = ends.to;
        }

        if (me.yField && !Ext.isNumber(minY)) {
            out = me.getMinMaxYValues();
            minY = out[0];
            maxY = out[1];
        }

        if (!Ext.isNumber(minY)) {
            minY = 0;
        }
        if (!Ext.isNumber(maxY)) {
            maxY = 0;
        }
        scale = (column ? bbox.height - yPadding * 2 : bbox.width - xPadding * 2) / (maxY - minY);
        shrunkBarWidth = barWidth;
        groupBarWidth = (barWidth / ((stacked ? 1 : groupBarsLen) * (groupGutter + 1) - groupGutter));
        
        if (barWidthProperty in me.style) {
            groupBarWidth = mmin(groupBarWidth, me.style[barWidthProperty]);
            shrunkBarWidth = groupBarWidth * ((stacked ? 1 : groupBarsLen) * (groupGutter + 1) - groupGutter);
        }
        zero = (column) ? bbox.y + bbox.height - yPadding : bbox.x + xPadding;

        if (stacked) {
            total = [[], []];
            for (i = 0, ln = data.length; i < ln; i++) {
                record = data[i];
                total[0][i] = total[0][i] || 0;
                total[1][i] = total[1][i] || 0;
                for (j = 0; j < barsLen; j++) {
                    if (me.__excludes && me.__excludes[j]) {
                        continue;
                    }
                    rec = record.get(bars[j]);
                    total[+(rec > 0)][i] += mabs(rec);
                }
            }
            total[+(maxY > 0)].push(mabs(maxY));
            total[+(minY > 0)].push(mabs(minY));
            minus = mmax.apply(math, total[0]);
            plus = mmax.apply(math, total[1]);
            scale = (column ? bbox.height - yPadding * 2 : bbox.width - xPadding * 2) / (plus + minus);
            zero = zero + minus * scale * (column ? -1 : 1);
        }
        else if (minY / maxY < 0) {
            zero = zero - minY * scale * (column ? -1 : 1);
        }
        return {
            bars: bars,
            bbox: bbox,
            shrunkBarWidth: shrunkBarWidth,
            barsLen: barsLen,
            groupBarsLen: groupBarsLen,
            barWidth: barWidth,
            groupBarWidth: groupBarWidth,
            scale: scale,
            zero: zero,
            xPadding: xPadding,
            yPadding: yPadding,
            signed: minY / maxY < 0,
            minY: minY,
            maxY: maxY
        };
    },

    // @private Build an array of paths for the chart
    getPaths: function() {
        var me = this,
            chart = me.chart,
            store = chart.getChartStore(),
            data = store.data.items,
            i, total, record,
            bounds = me.bounds = me.getBounds(),
            items = me.items = [],
            yFields = me.yField,
            gutter = me.gutter / 100,
            groupGutter = me.groupGutter / 100,
            animate = chart.animate,
            column = me.column,
            group = me.group,
            enableShadows = chart.shadow,
            shadowGroups = me.shadowGroups,
            shadowAttributes = me.shadowAttributes,
            shadowGroupsLn = shadowGroups.length,
            bbox = bounds.bbox,
            barWidth = bounds.barWidth,
            shrunkBarWidth = bounds.shrunkBarWidth,
            xPadding = me.xPadding,
            yPadding = me.yPadding,
            stacked = me.stacked,
            barsLen = bounds.barsLen,
            colors = me.colorArrayStyle,
            colorLength = colors && colors.length || 0,
            math = Math,
            mmax = math.max,
            mmin = math.min,
            mabs = math.abs,
            j, yValue, height, totalDim, totalNegDim, bottom, top, hasShadow, barAttr, attrs, counter,
            shadowIndex, shadow, sprite, offset, floorY;

        for (i = 0, total = data.length; i < total; i++) {
            record = data[i];
            bottom = bounds.zero;
            top = bounds.zero;
            totalDim = 0;
            totalNegDim = 0;
            hasShadow = false;
            for (j = 0, counter = 0; j < barsLen; j++) {
                // Excluded series
                if (me.__excludes && me.__excludes[j]) {
                    continue;
                }
                yValue = record.get(bounds.bars[j]);
                height = Math.round((yValue - mmax(bounds.minY, 0)) * bounds.scale);
                barAttr = {
                    fill: colors[(barsLen > 1 ? j : 0) % colorLength]
                };
                if (column) {
                    Ext.apply(barAttr, {
                        height: height,
                        width: mmax(bounds.groupBarWidth, 0),
                        x: (bbox.x + xPadding + (barWidth - shrunkBarWidth) * 0.5 + i * barWidth * (1 + gutter) + counter * bounds.groupBarWidth * (1 + groupGutter) * !stacked),
                        y: bottom - height
                    });
                }
                else {
                    // draw in reverse order
                    offset = (total - 1) - i;
                    Ext.apply(barAttr, {
                        height: mmax(bounds.groupBarWidth, 0),
                        width: height + (bottom == bounds.zero),
                        x: bottom + (bottom != bounds.zero),
                        y: (bbox.y + yPadding + (barWidth - shrunkBarWidth) * 0.5 + offset * barWidth * (1 + gutter) + counter * bounds.groupBarWidth * (1 + groupGutter) * !stacked + 1)
                    });
                }
                if (height < 0) {
                    if (column) {
                        barAttr.y = top;
                        barAttr.height = mabs(height);
                    } else {
                        barAttr.x = top + height;
                        barAttr.width = mabs(height);
                    }
                }
                if (stacked) {
                    if (height < 0) {
                        top += height * (column ? -1 : 1);
                    } else {
                        bottom += height * (column ? -1 : 1);
                    }
                    totalDim += mabs(height);
                    if (height < 0) {
                        totalNegDim += mabs(height);
                    }
                }
                barAttr.x = Math.floor(barAttr.x) + 1;
                floorY = Math.floor(barAttr.y);
                if (!Ext.isIE9 && barAttr.y > floorY) {
                    floorY--;
                }
                barAttr.y = floorY;
                barAttr.width = Math.floor(barAttr.width);
                barAttr.height = Math.floor(barAttr.height);
                items.push({
                    series: me,
                    yField: yFields[j],
                    storeItem: record,
                    value: [record.get(me.xField), yValue],
                    attr: barAttr,
                    point: column ? [barAttr.x + barAttr.width / 2, yValue >= 0 ? barAttr.y : barAttr.y + barAttr.height] :
                                    [yValue >= 0 ? barAttr.x + barAttr.width : barAttr.x, barAttr.y + barAttr.height / 2]
                });
                // When resizing, reset before animating
                if (animate && chart.resizing) {
                    attrs = column ? {
                        x: barAttr.x,
                        y: bounds.zero,
                        width: barAttr.width,
                        height: 0
                    } : {
                        x: bounds.zero,
                        y: barAttr.y,
                        width: 0,
                        height: barAttr.height
                    };
                    if (enableShadows && (stacked && !hasShadow || !stacked)) {
                        hasShadow = true;
                        //update shadows
                        for (shadowIndex = 0; shadowIndex < shadowGroupsLn; shadowIndex++) {
                            shadow = shadowGroups[shadowIndex].getAt(stacked ? i : (i * barsLen + j));
                            if (shadow) {
                                shadow.setAttributes(attrs, true);
                            }
                        }
                    }
                    //update sprite position and width/height
                    sprite = group.getAt(i * barsLen + j);
                    if (sprite) {
                        sprite.setAttributes(attrs, true);
                    }
                }
                counter++;
            }
            if (stacked && items.length) {
                items[i * counter].totalDim = totalDim;
                items[i * counter].totalNegDim = totalNegDim;
            }
        }
        if (stacked && counter == 0) {
            // Remove ghost shadow ref: EXTJSIV-5982
            for (i = 0, total = data.length; i < total; i++) {
                for (shadowIndex = 0; shadowIndex < shadowGroupsLn; shadowIndex++) {
                    shadow = shadowGroups[shadowIndex].getAt(i);
                    if (shadow) {
                        shadow.hide(true);
                    }
                }
            }
        }
    },

    // @private render/setAttributes on the shadows
    renderShadows: function(i, barAttr, baseAttrs, bounds) {
        var me = this,
            chart = me.chart,
            surface = chart.surface,
            animate = chart.animate,
            stacked = me.stacked,
            shadowGroups = me.shadowGroups,
            shadowAttributes = me.shadowAttributes,
            shadowGroupsLn = shadowGroups.length,
            store = chart.getChartStore(),
            column = me.column,
            items = me.items,
            shadows = [],
            zero = bounds.zero,
            shadowIndex, shadowBarAttr, shadow, totalDim, totalNegDim, j, rendererAttributes;

        if ((stacked && (i % bounds.groupBarsLen === 0)) || !stacked) {
            j = i / bounds.groupBarsLen;
            //create shadows
            for (shadowIndex = 0; shadowIndex < shadowGroupsLn; shadowIndex++) {
                shadowBarAttr = Ext.apply({}, shadowAttributes[shadowIndex]);
                shadow = shadowGroups[shadowIndex].getAt(stacked ? j : i);
                Ext.copyTo(shadowBarAttr, barAttr, 'x,y,width,height');
                if (!shadow) {
                    shadow = surface.add(Ext.apply({
                        type: 'rect',
                        group: shadowGroups[shadowIndex]
                    }, Ext.apply({}, baseAttrs, shadowBarAttr)));
                }
                if (stacked) {
                    totalDim = items[i].totalDim;
                    totalNegDim = items[i].totalNegDim;
                    if (column) {
                        shadowBarAttr.y = zero + totalNegDim - totalDim - 1;
                        shadowBarAttr.height = totalDim;
                    }
                    else {
                        shadowBarAttr.x = zero - totalNegDim;
                        shadowBarAttr.width = totalDim;
                    }
                }
                
                rendererAttributes = me.renderer(shadow, store.getAt(j), shadowBarAttr, i, store);
                rendererAttributes.hidden = !!barAttr.hidden;
                if (animate) {
                    me.onAnimate(shadow, { to: rendererAttributes });
                }
                else {
                    shadow.setAttributes(rendererAttributes, true);
                }
                shadows.push(shadow);
            }
        }
        return shadows;
    },

    /**
     * Draws the series for the current chart.
     */
    drawSeries: function() {
        var me = this,
            chart = me.chart,
            store = chart.getChartStore(),
            surface = chart.surface,
            animate = chart.animate,
            stacked = me.stacked,
            column = me.column,
            enableShadows = chart.shadow,
            shadowGroups = me.shadowGroups,
            shadowGroupsLn = shadowGroups.length,
            group = me.group,
            seriesStyle = me.seriesStyle,
            items, ln, i, j, baseAttrs, sprite, rendererAttributes, shadowIndex, shadowGroup,
            bounds, endSeriesStyle, barAttr, attrs, anim;

        if (!store || !store.getCount() || me.seriesIsHidden) {
            me.hide();
            me.items = [];
            return;
        }

        //fill colors are taken from the colors array.
        endSeriesStyle = Ext.apply({}, this.style, seriesStyle);
        delete endSeriesStyle.fill;
        delete endSeriesStyle.x;
        delete endSeriesStyle.y;
        delete endSeriesStyle.width;
        delete endSeriesStyle.height;
        
        me.unHighlightItem();
        me.cleanHighlights();
        
        me.getPaths();
        bounds = me.bounds;
        items = me.items;

        baseAttrs = column ? {
            y: bounds.zero,
            height: 0
        } : {
            x: bounds.zero,
            width: 0
        };
        ln = items.length;
        // Create new or reuse sprites and animate/display
        for (i = 0; i < ln; i++) {
            sprite = group.getAt(i);
            barAttr = items[i].attr;

            if (enableShadows) {
                items[i].shadows = me.renderShadows(i, barAttr, baseAttrs, bounds);
            }

            // Create a new sprite if needed (no height)
            if (!sprite) {
                attrs = Ext.apply({}, baseAttrs, barAttr);
                attrs = Ext.apply(attrs, endSeriesStyle || {});
                sprite = surface.add(Ext.apply({}, {
                    type: 'rect',
                    group: group
                }, attrs));
            }
            if (animate) {
                rendererAttributes = me.renderer(sprite, store.getAt(i), barAttr, i, store);
                sprite._to = rendererAttributes;
                anim = me.onAnimate(sprite, { to: Ext.apply(rendererAttributes, endSeriesStyle) });
                if (enableShadows && stacked && (i % bounds.barsLen === 0)) {
                    j = i / bounds.barsLen;
                    for (shadowIndex = 0; shadowIndex < shadowGroupsLn; shadowIndex++) {
                        anim.on('afteranimate', function() {
                            this.show(true);
                        }, shadowGroups[shadowIndex].getAt(j));
                    }
                }
            }
            else {
                rendererAttributes = me.renderer(sprite, store.getAt(i), Ext.apply(barAttr, { hidden: false }), i, store);
                sprite.setAttributes(Ext.apply(rendererAttributes, endSeriesStyle), true);
            }
            items[i].sprite = sprite;
        }

        // Hide unused sprites
        ln = group.getCount();
        for (j = i; j < ln; j++) {
            group.getAt(j).hide(true);
        }
        
        if (me.stacked) {
            // If stacked, we have only store.getCount() shadows.
            i = store.getCount();    
        }
        
        // Hide unused shadows
        if (enableShadows) {
            for (shadowIndex = 0; shadowIndex < shadowGroupsLn; shadowIndex++) {
                shadowGroup = shadowGroups[shadowIndex];
                ln = shadowGroup.getCount();
                for (j = i; j < ln; j++) {
                    shadowGroup.getAt(j).hide(true);
                }
            }
        }
        me.renderLabels();
    },

    // @private handled when creating a label.
    onCreateLabel: function(storeItem, item, i, display) {
        var me = this,
            surface = me.chart.surface,
            group = me.labelsGroup,
            config = me.label,
            endLabelStyle = Ext.apply({}, config, me.seriesLabelStyle || {}),
            sprite;
        return surface.add(Ext.apply({
            type: 'text',
            group: group
        }, endLabelStyle || {}));
    },

    // @private callback used when placing a label.
    onPlaceLabel: function(label, storeItem, item, i, display, animate, j, index) {
        // Determine the label's final position. Starts with the configured preferred value but
        // may get flipped from inside to outside or vice-versa depending on space.
        var me = this,
            opt = me.bounds,
            groupBarWidth = opt.groupBarWidth,
            column = me.column,
            chart = me.chart,
            chartBBox = chart.chartBBox,
            resizing = chart.resizing,
            xValue = item.value[0],
            yValue = item.value[1],
            attr = item.attr,
            config = me.label,
            rotate = config.orientation == 'vertical',
            field = [].concat(config.field),
            format = config.renderer,
            text = format(storeItem.get(field[index])),
            size = me.getLabelSize(text),
            width = size.width,
            height = size.height,
            zero = opt.zero,
            outside = 'outside',
            insideStart = 'insideStart',
            insideEnd = 'insideEnd',
            offsetX = 10,
            offsetY = 6,
            signed = opt.signed,
            x, y, finalAttr;

        label.setAttributes({
            text: text
        });

        label.isOutside = false;
        if (column) {
            if (display == outside) {
                if (height + offsetY + attr.height > (yValue >= 0 ? zero - chartBBox.y : chartBBox.y + chartBBox.height - zero)) {
                    display = insideEnd;
                }
            } else {
                if (height + offsetY > attr.height) {
                    display = outside;
                    label.isOutside = true;
                }
            }
            x = attr.x + groupBarWidth / 2;
            y = display == insideStart ?
                    (zero + ((height / 2 + 3) * (yValue >= 0 ? -1 : 1))) :
                    (yValue >= 0 ? (attr.y + ((height / 2 + 3) * (display == outside ? -1 : 1))) :
                                   (attr.y + attr.height + ((height / 2 + 3) * (display === outside ? 1 : -1))));
        }
        else {
            if (display == outside) {
                if (width + offsetX + attr.width > (yValue >= 0 ? chartBBox.x + chartBBox.width - zero : zero - chartBBox.x)) {
                    display = insideEnd;
                }
            }
            else {
                if (width + offsetX > attr.width) {
                    display = outside;
                    label.isOutside = true;
                }
            }
            x = display == insideStart ?
                (zero + ((width / 2 + 5) * (yValue >= 0 ? 1 : -1))) :
                (yValue >= 0 ? (attr.x + attr.width + ((width / 2 + 5) * (display === outside ? 1 : -1))) :
                (attr.x + ((width / 2 + 5) * (display === outside ? -1 : 1))));
            y = attr.y + groupBarWidth / 2;
        }
        //set position
        finalAttr = {
            x: x,
            y: y
        };
        //rotate
        if (rotate) {
            finalAttr.rotate = {
                x: x,
                y: y,
                degrees: 270
            };
        }
        //check for resizing
        if (animate && resizing) {
            if (column) {
                x = attr.x + attr.width / 2;
                y = zero;
            } else {
                x = zero;
                y = attr.y + attr.height / 2;
            }
            label.setAttributes({
                x: x,
                y: y
            }, true);
            if (rotate) {
                label.setAttributes({
                    rotate: {
                        x: x,
                        y: y,
                        degrees: 270
                    }
                }, true);
            }
        }
        //handle animation
        if (animate) {
            me.onAnimate(label, { to: finalAttr });
        }
        else {
            label.setAttributes(Ext.apply(finalAttr, {
                hidden: false
            }), true);
        }
    },

    /* @private
     * Gets the dimensions of a given bar label. Uses a single hidden sprite to avoid
     * changing visible sprites.
     * @param value
     */
    getLabelSize: function(value) {
        var tester = this.testerLabel,
            config = this.label,
            endLabelStyle = Ext.apply({}, config, this.seriesLabelStyle || {}),
            rotated = config.orientation === 'vertical',
            bbox, w, h,
            undef;
        if (!tester) {
            tester = this.testerLabel = this.chart.surface.add(Ext.apply({
                type: 'text',
                opacity: 0
            }, endLabelStyle));
        }
        tester.setAttributes({
            text: value
        }, true);

        // Flip the width/height if rotated, as getBBox returns the pre-rotated dimensions
        bbox = tester.getBBox();
        w = bbox.width;
        h = bbox.height;
        return {
            width: rotated ? h : w,
            height: rotated ? w : h
        };
    },

    // @private used to animate label, markers and other sprites.
    onAnimate: function(sprite, attr) {
        sprite.show();
        return this.callParent(arguments);
    },

    isItemInPoint: function(x, y, item) {
        var bbox = item.sprite.getBBox();
        return bbox.x <= x && bbox.y <= y
            && (bbox.x + bbox.width) >= x
            && (bbox.y + bbox.height) >= y;
    },

    // @private hide all markers
    hideAll: function(index) {
        var axes      = this.chart.axes,
            axesItems = axes.items,
            ln        = axesItems.length,
            i         = 0;

        index = (isNaN(this._index) ? index : this._index) || 0;

        if (!this.__excludes) {
            this.__excludes = [];
        }

        this.__excludes[index] = true;
        this.drawSeries();

        for (i; i < ln; i++) {
            axesItems[i].drawAxis();
        }    
    },

    // @private show all markers
    showAll: function(index) {
        var axes = this.chart.axes,
            axesItems = axes.items,
            ln        = axesItems.length,
            i         = 0;

        index = (isNaN(this._index) ? index : this._index) || 0;

        if (!this.__excludes) {
            this.__excludes = [];
        }

        this.__excludes[index] = false;
        this.drawSeries();

        for (i; i < ln; i++) {
            axesItems[i].drawAxis();
        }    
    },

    /**
     * Returns a string with the color to be used for the series legend item.
     * @param index
     */
    getLegendColor: function(index) {
        var me = this,
            colorLength = me.colorArrayStyle.length;

        if (me.style && me.style.fill) {
            return me.style.fill;
        } else {
            return me.colorArrayStyle[index % colorLength];
        }
    },

    highlightItem: function(item) {
        this.callParent(arguments);
        this.renderLabels();
    },

    unHighlightItem: function() {
        this.callParent(arguments);
        this.renderLabels();
    },

    cleanHighlights: function() {
        this.callParent(arguments);
        this.renderLabels();
    }
});

/**
 * @class Ext.chart.series.Column
 *
 * Creates a Column Chart. Much of the methods are inherited from Bar. A Column Chart is a useful
 * visualization technique to display quantitative information for different categories that can
 * show some progression (or regression) in the data set. As with all other series, the Column Series
 * must be appended in the *series* Chart array configuration. See the Chart documentation for more
 * information. A typical configuration object for the column series could be:
 *
 *     @example
 *     var store = Ext.create('Ext.data.JsonStore', {
 *         fields: ['name', 'data'],
 *         data: [
 *             { 'name': 'metric one',   'data':10 },
 *             { 'name': 'metric two',   'data': 7 },
 *             { 'name': 'metric three', 'data': 5 },
 *             { 'name': 'metric four',  'data': 2 },
 *             { 'name': 'metric five',  'data':27 }
 *         ]
 *     });
 *
 *     Ext.create('Ext.chart.Chart', {
 *         renderTo: Ext.getBody(),
 *         width: 500,
 *         height: 300,
 *         animate: true,
 *         store: store,
 *         axes: [
 *             {
 *                 type: 'Numeric',
 *                 position: 'left',
 *                 fields: ['data'],
 *                 label: {
 *                     renderer: Ext.util.Format.numberRenderer('0,0')
 *                 },
 *                 title: 'Sample Values',
 *                 grid: true,
 *                 minimum: 0
 *             },
 *             {
 *                 type: 'Category',
 *                 position: 'bottom',
 *                 fields: ['name'],
 *                 title: 'Sample Metrics'
 *             }
 *         ],
 *         series: [
 *             {
 *                 type: 'column',
 *                 axis: 'left',
 *                 highlight: true,
 *                 tips: {
 *                   trackMouse: true,
 *                   width: 140,
 *                   height: 28,
 *                   renderer: function(storeItem, item) {
 *                     this.setTitle(storeItem.get('name') + ': ' + storeItem.get('data') + ' $');
 *                   }
 *                 },
 *                 label: {
 *                   display: 'insideEnd',
 *                   'text-anchor': 'middle',
 *                     field: 'data',
 *                     renderer: Ext.util.Format.numberRenderer('0'),
 *                     orientation: 'vertical',
 *                     color: '#333'
 *                 },
 *                 xField: 'name',
 *                 yField: 'data'
 *             }
 *         ]
 *     });
 *
 * In this configuration we set `column` as the series type, bind the values of the bars to the bottom axis,
 * set `highlight` to true so that bars are smoothly highlighted when hovered and bind the `xField` or category
 * field to the data store `name` property and the `yField` as the data1 property of a store element.
 */
Ext.define('Ext.chart.series.Column', {

    /* Begin Definitions */

    alternateClassName: ['Ext.chart.ColumnSeries', 'Ext.chart.ColumnChart', 'Ext.chart.StackedColumnChart'],

    extend: 'Ext.chart.series.Bar',

    /* End Definitions */

    type: 'column',
    alias: 'series.column',

    column: true,

    /**
     * @cfg {Number} xPadding
     * Padding between the left/right axes and the bars
     */
    xPadding: 10,

    /**
     * @cfg {Number} yPadding
     * Padding between the top/bottom axes and the bars
     */
    yPadding: 0
});




/**
 * @class Ext.chart.series.Gauge
 * 
 * Creates a Gauge Chart. Gauge Charts are used to show progress in a certain variable. There are two ways of using the Gauge chart.
 * One is setting a store element into the Gauge and selecting the field to be used from that store. Another one is instantiating the
 * visualization and using the `setValue` method to adjust the value you want.
 *
 * An example of Gauge visualization:
 *
 *     @example
 *     var store = Ext.create('Ext.data.JsonStore', {
 *         fields: ['data'],
 *         data: [
 *             { 'value':80 }
 *         ]
 *     });
 *
 *     Ext.create('Ext.chart.Chart', {
 *         renderTo: Ext.getBody(),
 *         store: store,
 *         width: 400,
 *         height: 250,
 *         animate: true,
 *         insetPadding: 30,
 *         axes: [{
 *             type: 'gauge',
 *             position: 'gauge',
 *             minimum: 0,
 *             maximum: 100,
 *             steps: 10,
 *             margin: 10
 *         }],
 *         series: [{
 *             type: 'gauge',
 *             field: 'value',
 *             donut: 30,
 *             colorSet: ['#F49D10', '#ddd']
 *         }]
 *     });
 *
 *     Ext.widget("button", {
 *         renderTo: Ext.getBody(),
 *         text: "Refresh",
 *         handler: function() {
 *             store.getAt(0).set('value', Math.round(Math.random()*100));
 *         }
 *     });
 * 
 * In this example we create a special Gauge axis to be used with the gauge visualization (describing half-circle markers), and also we're
 * setting a maximum, minimum and steps configuration options into the axis. The Gauge series configuration contains the store field to be bound to
 * the visual display and the color set to be used with the visualization.
 * 
 * @xtype gauge
 */
Ext.define('Ext.chart.series.Gauge', {

    /* Begin Definitions */

    extend: 'Ext.chart.series.Series',

    /* End Definitions */

    type: "gauge",
    alias: 'series.gauge',

    rad: Math.PI / 180,

    /**
     * @cfg {Number} highlightDuration
     * The duration for the pie slice highlight effect.
     */
    highlightDuration: 150,

    /**
     * @cfg {String} angleField (required)
     * The store record field name to be used for the pie angles.
     * The values bound to this field name must be positive real numbers.
     */
    angleField: false,

    /**
     * @cfg {Boolean} needle
     * Use the Gauge Series as an area series or add a needle to it. Default's false.
     */
    needle: false,
    
    /**
     * @cfg {Boolean/Number} donut
     * Use the entire disk or just a fraction of it for the gauge. Default's false.
     */
    donut: false,

    /**
     * @cfg {Boolean} showInLegend
     * Whether to add the pie chart elements as legend items. Default's false.
     */
    showInLegend: false,

    /**
     * @cfg {Object} style
     * An object containing styles for overriding series styles from Theming.
     */
    style: {},
    
    constructor: function(config) {
        this.callParent(arguments);
        var me = this,
            chart = me.chart,
            surface = chart.surface,
            store = chart.store,
            shadow = chart.shadow, i, l, cfg;
        Ext.apply(me, config, {
            shadowAttributes: [{
                "stroke-width": 6,
                "stroke-opacity": 1,
                stroke: 'rgb(200, 200, 200)',
                translate: {
                    x: 1.2,
                    y: 2
                }
            },
            {
                "stroke-width": 4,
                "stroke-opacity": 1,
                stroke: 'rgb(150, 150, 150)',
                translate: {
                    x: 0.9,
                    y: 1.5
                }
            },
            {
                "stroke-width": 2,
                "stroke-opacity": 1,
                stroke: 'rgb(100, 100, 100)',
                translate: {
                    x: 0.6,
                    y: 1
                }
            }]
        });
        me.group = surface.getGroup(me.seriesId);
        if (shadow) {
            for (i = 0, l = me.shadowAttributes.length; i < l; i++) {
                me.shadowGroups.push(surface.getGroup(me.seriesId + '-shadows' + i));
            }
        }
        surface.customAttributes.segment = function(opt) {
            return me.getSegment(opt);
        };
    },
    
    // @private updates some onbefore render parameters.
    initialize: function() {
        var me = this,
            store = me.chart.getChartStore(),
            data = store.data.items,
            i, ln, rec;
        //Add yFields to be used in Legend.js
        me.yField = [];
        if (me.label.field) {
            for (i = 0, ln = data.length; i < ln; i++) {
                rec = data[i];
                me.yField.push(rec.get(me.label.field));
            }
        }
    },

    // @private returns an object with properties for a Slice
    getSegment: function(opt) {
        var me = this,
            rad = me.rad,
            cos = Math.cos,
            sin = Math.sin,
            abs = Math.abs,
            x = me.centerX,
            y = me.centerY,
            x1 = 0, x2 = 0, x3 = 0, x4 = 0,
            y1 = 0, y2 = 0, y3 = 0, y4 = 0,
            delta = 1e-2,
            r = opt.endRho - opt.startRho,
            startAngle = opt.startAngle,
            endAngle = opt.endAngle,
            midAngle = (startAngle + endAngle) / 2 * rad,
            margin = opt.margin || 0,
            flag = abs(endAngle - startAngle) > 180,
            a1 = Math.min(startAngle, endAngle) * rad,
            a2 = Math.max(startAngle, endAngle) * rad,
            singleSlice = false;

        x += margin * cos(midAngle);
        y += margin * sin(midAngle);

        x1 = x + opt.startRho * cos(a1);
        y1 = y + opt.startRho * sin(a1);

        x2 = x + opt.endRho * cos(a1);
        y2 = y + opt.endRho * sin(a1);

        x3 = x + opt.startRho * cos(a2);
        y3 = y + opt.startRho * sin(a2);

        x4 = x + opt.endRho * cos(a2);
        y4 = y + opt.endRho * sin(a2);

        if (abs(x1 - x3) <= delta && abs(y1 - y3) <= delta) {
            singleSlice = true;
        }
        //Solves mysterious clipping bug with IE
        if (singleSlice) {
            return {
                path: [
                ["M", x1, y1],
                ["L", x2, y2],
                ["A", opt.endRho, opt.endRho, 0, +flag, 1, x4, y4],
                ["Z"]]
            };
        } else {
            return {
                path: [
                ["M", x1, y1],
                ["L", x2, y2],
                ["A", opt.endRho, opt.endRho, 0, +flag, 1, x4, y4],
                ["L", x3, y3],
                ["A", opt.startRho, opt.startRho, 0, +flag, 0, x1, y1],
                ["Z"]]
            };
        }
    },

    // @private utility function to calculate the middle point of a pie slice.
    calcMiddle: function(item) {
        var me = this,
            rad = me.rad,
            slice = item.slice,
            x = me.centerX,
            y = me.centerY,
            startAngle = slice.startAngle,
            endAngle = slice.endAngle,
            radius = Math.max(('rho' in slice) ? slice.rho: me.radius, me.label.minMargin),
            donut = +me.donut,
            a1 = Math.min(startAngle, endAngle) * rad,
            a2 = Math.max(startAngle, endAngle) * rad,
            midAngle = -(a1 + (a2 - a1) / 2),
            xm = x + (item.endRho + item.startRho) / 2 * Math.cos(midAngle),
            ym = y - (item.endRho + item.startRho) / 2 * Math.sin(midAngle);

        item.middle = {
            x: xm,
            y: ym
        };
    },

    /**
     * Draws the series for the current chart.
     */
    drawSeries: function() {
        var me = this,
            chart = me.chart,
            store = chart.getChartStore(),
            group = me.group,
            animate = me.chart.animate,
            axis = me.chart.axes.get(0),
            minimum = axis && axis.minimum || me.minimum || 0,
            maximum = axis && axis.maximum || me.maximum || 0,
            field = me.angleField || me.field || me.xField,
            surface = chart.surface,
            chartBBox = chart.chartBBox,
            rad = me.rad,
            donut = +me.donut,
            values = {},
            items = [],
            seriesStyle = me.seriesStyle,
            seriesLabelStyle = me.seriesLabelStyle,
            colorArrayStyle = me.colorArrayStyle,
            colorArrayLength = colorArrayStyle && colorArrayStyle.length || 0,
            gutterX = chart.maxGutter[0],
            gutterY = chart.maxGutter[1],
            cos = Math.cos,
            sin = Math.sin,
            rendererAttributes, centerX, centerY, slice, slices, sprite, value,
            item, ln, record, i, j, startAngle, endAngle, middleAngle, sliceLength, path,
            p, spriteOptions, bbox, splitAngle, sliceA, sliceB;
        
        Ext.apply(seriesStyle, me.style || {});

        me.setBBox();
        bbox = me.bbox;

        //override theme colors
        if (me.colorSet) {
            colorArrayStyle = me.colorSet;
            colorArrayLength = colorArrayStyle.length;
        }
        
        //if not store or store is empty then there's nothing to draw
        if (!store || !store.getCount() || me.seriesIsHidden) {
            me.hide();
            me.items = [];
            return;
        }
        
        centerX = me.centerX = chartBBox.x + (chartBBox.width / 2);
        centerY = me.centerY = chartBBox.y + chartBBox.height;
        me.radius = Math.min(centerX - chartBBox.x, centerY - chartBBox.y);
        me.slices = slices = [];
        me.items = items = [];
        
        if (!me.value) {
            record = store.getAt(0);
            me.value = record.get(field);
        }
        
        value = me.value;
        if (me.needle) {
            sliceA = {
                series: me,
                value: value,
                startAngle: -180,
                endAngle: 0,
                rho: me.radius
            };
            splitAngle = -180 * (1 - (value - minimum) / (maximum - minimum));
            slices.push(sliceA);
        } else {
            splitAngle = -180 * (1 - (value - minimum) / (maximum - minimum));
            sliceA = {
                series: me,
                value: value,
                startAngle: -180,
                endAngle: splitAngle,
                rho: me.radius
            };
            sliceB = {
                series: me,
                value: me.maximum - value,
                startAngle: splitAngle,
                endAngle: 0,
                rho: me.radius
            };
            slices.push(sliceA, sliceB);
        }
        
        //do pie slices after.
        for (i = 0, ln = slices.length; i < ln; i++) {
            slice = slices[i];
            sprite = group.getAt(i);
            //set pie slice properties
            rendererAttributes = Ext.apply({
                segment: {
                    startAngle: slice.startAngle,
                    endAngle: slice.endAngle,
                    margin: 0,
                    rho: slice.rho,
                    startRho: slice.rho * +donut / 100,
                    endRho: slice.rho
                } 
            }, Ext.apply(seriesStyle, colorArrayStyle && { fill: colorArrayStyle[i % colorArrayLength] } || {}));

            item = Ext.apply({},
            rendererAttributes.segment, {
                slice: slice,
                series: me,
                storeItem: record,
                index: i
            });
            items[i] = item;
            // Create a new sprite if needed (no height)
            if (!sprite) {
                spriteOptions = Ext.apply({
                    type: "path",
                    group: group
                }, Ext.apply(seriesStyle, colorArrayStyle && { fill: colorArrayStyle[i % colorArrayLength] } || {}));
                sprite = surface.add(Ext.apply(spriteOptions, rendererAttributes));
            }
            slice.sprite = slice.sprite || [];
            item.sprite = sprite;
            slice.sprite.push(sprite);
            if (animate) {
                rendererAttributes = me.renderer(sprite, record, rendererAttributes, i, store);
                sprite._to = rendererAttributes;
                me.onAnimate(sprite, {
                    to: rendererAttributes
                });
            } else {
                rendererAttributes = me.renderer(sprite, record, Ext.apply(rendererAttributes, {
                    hidden: false
                }), i, store);
                sprite.setAttributes(rendererAttributes, true);
            }
        }
        
        if (me.needle) {
            splitAngle = splitAngle * Math.PI / 180;
            
            if (!me.needleSprite) {
                me.needleSprite = me.chart.surface.add({
                    type: 'path',
                    path: ['M', centerX + (me.radius * +donut / 100) * cos(splitAngle),
                                centerY + -Math.abs((me.radius * +donut / 100) * sin(splitAngle)),
                           'L', centerX + me.radius * cos(splitAngle),
                                centerY + -Math.abs(me.radius * sin(splitAngle))],
                    'stroke-width': 4,
                    'stroke': '#222'
                });
            } else {
                if (animate) {
                    me.onAnimate(me.needleSprite, {
                        to: {
                        path: ['M', centerX + (me.radius * +donut / 100) * cos(splitAngle),
                                    centerY + -Math.abs((me.radius * +donut / 100) * sin(splitAngle)),
                               'L', centerX + me.radius * cos(splitAngle),
                                    centerY + -Math.abs(me.radius * sin(splitAngle))]
                        }
                    });
                } else {
                    me.needleSprite.setAttributes({
                        type: 'path',
                        path: ['M', centerX + (me.radius * +donut / 100) * cos(splitAngle),
                                    centerY + -Math.abs((me.radius * +donut / 100) * sin(splitAngle)),
                               'L', centerX + me.radius * cos(splitAngle),
                                    centerY + -Math.abs(me.radius * sin(splitAngle))]
                    });
                }
            }
            me.needleSprite.setAttributes({
                hidden: false    
            }, true);
        }
        
        delete me.value;
    },
    
    /**
     * Sets the Gauge chart to the current specified value.
    */
    setValue: function (value) {
        this.value = value;
        this.drawSeries();
    },

    // @private callback for when creating a label sprite.
    onCreateLabel: function(storeItem, item, i, display) {},

    // @private callback for when placing a label sprite.
    onPlaceLabel: function(label, storeItem, item, i, display, animate, index) {},

    // @private callback for when placing a callout.
    onPlaceCallout: function() {},

    // @private handles sprite animation for the series.
    onAnimate: function(sprite, attr) {
        sprite.show();
        return this.callParent(arguments);
    },

    isItemInPoint: function(x, y, item, i) {
        var me = this,
            cx = me.centerX,
            cy = me.centerY,
            abs = Math.abs,
            dx = abs(x - cx),
            dy = abs(y - cy),
            startAngle = item.startAngle,
            endAngle = item.endAngle,
            rho = Math.sqrt(dx * dx + dy * dy),
            angle = Math.atan2(y - cy, x - cx) / me.rad;

        //Only trigger events for the filled portion of the Gauge.
        return (i === 0) && (angle >= startAngle && angle < endAngle && 
                             rho >= item.startRho && rho <= item.endRho);
    },
    
    // @private shows all elements in the series.
    showAll: function() {
        if (!isNaN(this._index)) {
            this.__excludes[this._index] = false;
            this.drawSeries();
        }
    },
    
    /**
     * Returns the color of the series (to be displayed as color for the series legend item).
     * @param item {Object} Info about the item; same format as returned by #getItemForPoint
     */
    getLegendColor: function(index) {
        var me = this;
        return me.colorArrayStyle[index % me.colorArrayStyle.length];
    }
});


/**
 * @class Ext.chart.series.Line
 * @extends Ext.chart.series.Cartesian
 *
 * Creates a Line Chart. A Line Chart is a useful visualization technique to display quantitative information for different
 * categories or other real values (as opposed to the bar chart), that can show some progression (or regression) in the dataset.
 * As with all other series, the Line Series must be appended in the *series* Chart array configuration. See the Chart
 * documentation for more information. A typical configuration object for the line series could be:
 *
 *     @example
 *     var store = Ext.create('Ext.data.JsonStore', {
 *         fields: ['name', 'data1', 'data2', 'data3', 'data4', 'data5'],
 *         data: [
 *             { 'name': 'metric one',   'data1': 10, 'data2': 12, 'data3': 14, 'data4': 8,  'data5': 13 },
 *             { 'name': 'metric two',   'data1': 7,  'data2': 8,  'data3': 16, 'data4': 10, 'data5': 3  },
 *             { 'name': 'metric three', 'data1': 5,  'data2': 2,  'data3': 14, 'data4': 12, 'data5': 7  },
 *             { 'name': 'metric four',  'data1': 2,  'data2': 14, 'data3': 6,  'data4': 1,  'data5': 23 },
 *             { 'name': 'metric five',  'data1': 4,  'data2': 4,  'data3': 36, 'data4': 13, 'data5': 33 }
 *         ]
 *     });
 *
 *     Ext.create('Ext.chart.Chart', {
 *         renderTo: Ext.getBody(),
 *         width: 500,
 *         height: 300,
 *         animate: true,
 *         store: store,
 *         axes: [
 *             {
 *                 type: 'Numeric',
 *                 position: 'left',
 *                 fields: ['data1', 'data2'],
 *                 label: {
 *                     renderer: Ext.util.Format.numberRenderer('0,0')
 *                 },
 *                 title: 'Sample Values',
 *                 grid: true,
 *                 minimum: 0
 *             },
 *             {
 *                 type: 'Category',
 *                 position: 'bottom',
 *                 fields: ['name'],
 *                 title: 'Sample Metrics'
 *             }
 *         ],
 *         series: [
 *             {
 *                 type: 'line',
 *                 highlight: {
 *                     size: 7,
 *                     radius: 7
 *                 },
 *                 axis: 'left',
 *                 xField: 'name',
 *                 yField: 'data1',
 *                 markerConfig: {
 *                     type: 'cross',
 *                     size: 4,
 *                     radius: 4,
 *                     'stroke-width': 0
 *                 }
 *             },
 *             {
 *                 type: 'line',
 *                 highlight: {
 *                     size: 7,
 *                     radius: 7
 *                 },
 *                 axis: 'left',
 *                 fill: true,
 *                 xField: 'name',
 *                 yField: 'data2',
 *                 markerConfig: {
 *                     type: 'circle',
 *                     size: 4,
 *                     radius: 4,
 *                     'stroke-width': 0
 *                 }
 *             }
 *         ]
 *     });
 *
 * In this configuration we're adding two series (or lines), one bound to the `data1`
 * property of the store and the other to `data3`. The type for both configurations is
 * `line`. The `xField` for both series is the same, the name propert of the store.
 * Both line series share the same axis, the left axis. You can set particular marker
 * configuration by adding properties onto the markerConfig object. Both series have
 * an object as highlight so that markers animate smoothly to the properties in highlight
 * when hovered. The second series has `fill=true` which means that the line will also
 * have an area below it of the same color.
 *
 * **Note:** In the series definition remember to explicitly set the axis to bind the
 * values of the line series to. This can be done by using the `axis` configuration property.
 */
Ext.define('Ext.chart.series.Line', {

    /* Begin Definitions */

    extend: 'Ext.chart.series.Cartesian',

    alternateClassName: ['Ext.chart.LineSeries', 'Ext.chart.LineChart'],

    requires: ['Ext.chart.axis.Axis', 'Ext.chart.Shape', 'Ext.draw.Draw', 'Ext.fx.Anim'],

    /* End Definitions */

    type: 'line',

    alias: 'series.line',

    /**
     * @cfg {String} axis
     * The position of the axis to bind the values to. Possible values are 'left', 'bottom', 'top' and 'right'.
     * You must explicitly set this value to bind the values of the line series to the ones in the axis, otherwise a
     * relative scale will be used.
     */

    /**
     * @cfg {Number} selectionTolerance
     * The offset distance from the cursor position to the line series to trigger events (then used for highlighting series, etc).
     */
    selectionTolerance: 20,

    /**
     * @cfg {Boolean} showMarkers
     * Whether markers should be displayed at the data points along the line. If true,
     * then the {@link #markerConfig} config item will determine the markers' styling.
     */
    showMarkers: true,

    /**
     * @cfg {Object} markerConfig
     * The display style for the markers. Only used if {@link #showMarkers} is true.
     * The markerConfig is a configuration object containing the same set of properties defined in
     * the Sprite class. For example, if we were to set red circles as markers to the line series we could
     * pass the object:
     *
     <pre><code>
        markerConfig: {
            type: 'circle',
            radius: 4,
            'fill': '#f00'
        }
     </code></pre>

     */
    markerConfig: {},

    /**
     * @cfg {Object} style
     * An object containing style properties for the visualization lines and fill.
     * These styles will override the theme styles.  The following are valid style properties:
     *
     * - `stroke` - an rgb or hex color string for the background color of the line
     * - `stroke-width` - the width of the stroke (integer)
     * - `fill` - the background fill color string (hex or rgb), only works if {@link #fill} is `true`
     * - `opacity` - the opacity of the line and the fill color (decimal)
     *
     * Example usage:
     *
     *     style: {
     *         stroke: '#00ff00',
     *         'stroke-width': 10,
     *         fill: '#80A080',
     *         opacity: 0.2
     *     }
     */
    style: {},

    /**
     * @cfg {Boolean/Number} smooth
     * If set to `true` or a non-zero number, the line will be smoothed/rounded around its points; otherwise
     * straight line segments will be drawn.
     *
     * A numeric value is interpreted as a divisor of the horizontal distance between consecutive points in
     * the line; larger numbers result in sharper curves while smaller numbers result in smoother curves.
     *
     * If set to `true` then a default numeric value of 3 will be used. Defaults to `false`.
     */
    smooth: false,

    /**
     * @private Default numeric smoothing value to be used when {@link #smooth} = true.
     */
    defaultSmoothness: 3,

    /**
     * @cfg {Boolean} fill
     * If true, the area below the line will be filled in using the {@link #style eefill} and
     * {@link #style opacity} config properties. Defaults to false.
     */
    fill: false,

    constructor: function(config) {
        this.callParent(arguments);
        var me = this,
            surface = me.chart.surface,
            shadow = me.chart.shadow,
            i, l;
        config.highlightCfg = Ext.Object.merge({ 'stroke-width': 3 }, config.highlightCfg);
        Ext.apply(me, config, {
            shadowAttributes: [{
                "stroke-width": 6,
                "stroke-opacity": 0.05,
                stroke: 'rgb(0, 0, 0)',
                translate: {
                    x: 1,
                    y: 1
                }
            }, {
                "stroke-width": 4,
                "stroke-opacity": 0.1,
                stroke: 'rgb(0, 0, 0)',
                translate: {
                    x: 1,
                    y: 1
                }
            }, {
                "stroke-width": 2,
                "stroke-opacity": 0.15,
                stroke: 'rgb(0, 0, 0)',
                translate: {
                    x: 1,
                    y: 1
                }
            }]
        });
        me.group = surface.getGroup(me.seriesId);
        if (me.showMarkers) {
            me.markerGroup = surface.getGroup(me.seriesId + '-markers');
        }
        if (shadow) {
            for (i = 0, l = me.shadowAttributes.length; i < l; i++) {
                me.shadowGroups.push(surface.getGroup(me.seriesId + '-shadows' + i));
            }
        }
    },

    // @private makes an average of points when there are more data points than pixels to be rendered.
    shrink: function(xValues, yValues, size) {
        // Start at the 2nd point...
        var len = xValues.length,
            ratio = Math.floor(len / size),
            i = 1,
            xSum = 0,
            ySum = 0,
            xRes = [+xValues[0]],
            yRes = [+yValues[0]];

        for (; i < len; ++i) {
            xSum += +xValues[i] || 0;
            ySum += +yValues[i] || 0;
            if (i % ratio == 0) {
                xRes.push(xSum/ratio);
                yRes.push(ySum/ratio);
                xSum = 0;
                ySum = 0;
            }
        }
        return {
            x: xRes,
            y: yRes
        };
    },

    /**
     * Draws the series for the current chart.
     */
    drawSeries: function() {
        var me = this,
            chart = me.chart,
            chartAxes = chart.axes,
            store = chart.getChartStore(),
            data = store.data.items,
            record,
            storeCount = store.getCount(),
            surface = me.chart.surface,
            bbox = {},
            group = me.group,
            showMarkers = me.showMarkers,
            markerGroup = me.markerGroup,
            enableShadows = chart.shadow,
            shadowGroups = me.shadowGroups,
            shadowAttributes = me.shadowAttributes,
            smooth = me.smooth,
            lnsh = shadowGroups.length,
            dummyPath = ["M"],
            path = ["M"],
            renderPath = ["M"],
            smoothPath = ["M"],
            markerIndex = chart.markerIndex,
            axes = [].concat(me.axis),
            shadowBarAttr,
            xValues = [],
            xValueMap = {},
            yValues = [],
            yValueMap = {},
            onbreak = false,
            storeIndices = [],
            markerStyle = me.markerStyle,
            seriesStyle = me.seriesStyle,
            colorArrayStyle = me.colorArrayStyle,
            colorArrayLength = colorArrayStyle && colorArrayStyle.length || 0,
            isNumber = Ext.isNumber,
            seriesIdx = me.seriesIdx, 
            boundAxes = me.getAxesForXAndYFields(),
            boundXAxis = boundAxes.xAxis,
            boundYAxis = boundAxes.yAxis,
            shadows, shadow, shindex, fromPath, fill, fillPath, rendererAttributes,
            x, y, prevX, prevY, firstX, firstY, markerCount, i, j, ln, axis, ends, marker, markerAux, item, xValue,
            yValue, coords, xScale, yScale, minX, maxX, minY, maxY, line, animation, endMarkerStyle,
            endLineStyle, type, count, opacity, lineOpacity, fillOpacity, fillDefaultValue;

        if (me.fireEvent('beforedraw', me) === false) {
            return;
        }

        //if store is empty or the series is excluded in the legend then there's nothing to draw.
        if (!storeCount || me.seriesIsHidden) {
            me.hide();
            me.items = [];
            if (me.line) {
                me.line.hide(true);
                if (me.line.shadows) {
                    shadows = me.line.shadows;
                    for (j = 0, lnsh = shadows.length; j < lnsh; j++) {
                        shadow = shadows[j];
                        shadow.hide(true);
                    }
                }
                if (me.fillPath) {
                    me.fillPath.hide(true);
                }
            }
            me.line = null;
            me.fillPath = null;
            return;
        }

        //prepare style objects for line and markers
        endMarkerStyle = Ext.apply(markerStyle || {}, me.markerConfig, {
            fill: me.seriesStyle.fill || colorArrayStyle[seriesIdx % colorArrayStyle.length]
        });
        type = endMarkerStyle.type;
        delete endMarkerStyle.type;
        endLineStyle = seriesStyle;
        //if no stroke with is specified force it to 0.5 because this is
        //about making *lines*
        if (!endLineStyle['stroke-width']) {
            endLineStyle['stroke-width'] = 0.5;
        }
        
        //set opacity values
        opacity = 'opacity' in endLineStyle ? endLineStyle.opacity : 1;
        fillDefaultValue = 'opacity' in endLineStyle ? endLineStyle.opacity : 0.3;
        lineOpacity = 'lineOpacity' in endLineStyle ? endLineStyle.lineOpacity : opacity;
        fillOpacity = 'fillOpacity' in endLineStyle ? endLineStyle.fillOpacity : fillDefaultValue;

        //If we're using a time axis and we need to translate the points,
        //then reuse the first markers as the last markers.
        if (markerIndex && markerGroup && markerGroup.getCount()) {
            for (i = 0; i < markerIndex; i++) {
                marker = markerGroup.getAt(i);
                markerGroup.remove(marker);
                markerGroup.add(marker);
                markerAux = markerGroup.getAt(markerGroup.getCount() - 2);
                marker.setAttributes({
                    x: 0,
                    y: 0,
                    translate: {
                        x: markerAux.attr.translation.x,
                        y: markerAux.attr.translation.y
                    }
                }, true);
            }
        }

        me.unHighlightItem();
        me.cleanHighlights();

        me.setBBox();
        bbox = me.bbox;
        me.clipRect = [bbox.x, bbox.y, bbox.width, bbox.height];

        if (axis = chartAxes.get(boundXAxis)) {
            ends = axis.applyData();
            minX = ends.from;
            maxX = ends.to;
        }

        if (axis = chartAxes.get(boundYAxis)) {
            ends = axis.applyData();
            minY = ends.from;
            maxY = ends.to;
        }

        // If a field was specified without a corresponding axis, create one to get bounds
        if (me.xField && !Ext.isNumber(minX)) {
            axis = me.getMinMaxXValues();
            minX = axis[0];
            maxX = axis[1];
        }

        if (me.yField && !Ext.isNumber(minY)) {
            axis = me.getMinMaxYValues();
            minY = axis[0];
            maxY = axis[1];
        }
        
        if (isNaN(minX)) {
            minX = 0;
            xScale = bbox.width / ((storeCount - 1) || 1);
        }
        else {
            xScale = bbox.width / ((maxX - minX) || (storeCount -1) || 1);
        }

        if (isNaN(minY)) {
            minY = 0;
            yScale = bbox.height / ((storeCount - 1) || 1);
        }
        else {
            yScale = bbox.height / ((maxY - minY) || (storeCount - 1) || 1);
        }
        // Extract all x and y values from the store
        for (i = 0, ln = data.length; i < ln; i++) {
            record = data[i];
            xValue = record.get(me.xField);

            // Ensure a value
            if (typeof xValue == 'string' || typeof xValue == 'object' && !Ext.isDate(xValue)
                //set as uniform distribution if the axis is a category axis.
                || boundXAxis && chartAxes.get(boundXAxis) && chartAxes.get(boundXAxis).type == 'Category') {
                    if (xValue in xValueMap) {
                        xValue = xValueMap[xValue];
                    } else {
                        xValue = xValueMap[xValue] = i;
                    }
            }

            // Filter out values that don't fit within the pan/zoom buffer area
            yValue = record.get(me.yField);
            //skip undefined values
            if (typeof yValue == 'undefined' || (typeof yValue == 'string' && !yValue)) {
                if (Ext.isDefined(Ext.global.console)) {
                    Ext.global.console.warn("[Ext.chart.series.Line]  Skipping a store element with an undefined value at ", record, xValue, yValue);
                }
                continue;
            }
            // Ensure a value
            if (typeof yValue == 'string' || typeof yValue == 'object' && !Ext.isDate(yValue)
                //set as uniform distribution if the axis is a category axis.
                || boundYAxis && chartAxes.get(boundYAxis) && chartAxes.get(boundYAxis).type == 'Category') {
                yValue = i;
            }
            storeIndices.push(i);
            xValues.push(xValue);
            yValues.push(yValue);
        }

        ln = xValues.length;
        if (ln > bbox.width) {
            coords = me.shrink(xValues, yValues, bbox.width);
            xValues = coords.x;
            yValues = coords.y;
        }

        me.items = [];

        count = 0;
        ln = xValues.length;
        for (i = 0; i < ln; i++) {
            xValue = xValues[i];
            yValue = yValues[i];
            if (yValue === false) {
                if (path.length == 1) {
                    path = [];
                }
                onbreak = true;
                me.items.push(false);
                continue;
            } else {
                x = (bbox.x + (xValue - minX) * xScale).toFixed(2);
                y = ((bbox.y + bbox.height) - (yValue - minY) * yScale).toFixed(2);
                if (onbreak) {
                    onbreak = false;
                    path.push('M');
                }
                path = path.concat([x, y]);
            }
            if ((typeof firstY == 'undefined') && (typeof y != 'undefined')) {
                firstY = y;
                firstX = x;
            }
            // If this is the first line, create a dummypath to animate in from.
            if (!me.line || chart.resizing) {
                dummyPath = dummyPath.concat([x, bbox.y + bbox.height / 2]);
            }

            // When resizing, reset before animating
            if (chart.animate && chart.resizing && me.line) {
                me.line.setAttributes({
                    path: dummyPath,
                    opacity: lineOpacity
                }, true);
                if (me.fillPath) {
                    me.fillPath.setAttributes({
                        path: dummyPath,
                        opacity: fillOpacity
                    }, true);
                }
                if (me.line.shadows) {
                    shadows = me.line.shadows;
                    for (j = 0, lnsh = shadows.length; j < lnsh; j++) {
                        shadow = shadows[j];
                        shadow.setAttributes({
                            path: dummyPath
                        }, true);
                    }
                }
            }
            if (showMarkers) {
                marker = markerGroup.getAt(count++);
                if (!marker) {
                    marker = Ext.chart.Shape[type](surface, Ext.apply({
                        group: [group, markerGroup],
                        x: 0, y: 0,
                        translate: {
                            x: +(prevX || x),
                            y: prevY || (bbox.y + bbox.height / 2)
                        },
                        value: '"' + xValue + ', ' + yValue + '"',
                        zIndex: 4000
                    }, endMarkerStyle));
                    marker._to = {
                        translate: {
                            x: +x,
                            y: +y
                        }
                    };
                } else {
                    marker.setAttributes({
                        value: '"' + xValue + ', ' + yValue + '"',
                        x: 0, y: 0,
                        hidden: false
                    }, true);
                    marker._to = {
                        translate: {
                            x: +x, 
                            y: +y
                        }
                    };
                }
            }
            me.items.push({
                series: me,
                value: [xValue, yValue],
                point: [x, y],
                sprite: marker,
                storeItem: store.getAt(storeIndices[i])
            });
            prevX = x;
            prevY = y;
        }

        if (path.length <= 1) {
            //nothing to be rendered
            return;
        }

        if (me.smooth) {
            smoothPath = Ext.draw.Draw.smooth(path, isNumber(smooth) ? smooth : me.defaultSmoothness);
        }

        renderPath = smooth ? smoothPath : path;

        //Correct path if we're animating timeAxis intervals
        if (chart.markerIndex && me.previousPath) {
            fromPath = me.previousPath;
            if (!smooth) {
                Ext.Array.erase(fromPath, 1, 2);
            }
        } else {
            fromPath = path;
        }

        // Only create a line if one doesn't exist.
        if (!me.line) {
            me.line = surface.add(Ext.apply({
                type: 'path',
                group: group,
                path: dummyPath,
                stroke: endLineStyle.stroke || endLineStyle.fill
            }, endLineStyle || {}));

            //set configuration opacity
            me.line.setAttributes({
                opacity: lineOpacity
            }, true);

            if (enableShadows) {
                me.line.setAttributes(Ext.apply({}, me.shadowOptions), true);
            }

            //unset fill here (there's always a default fill withing the themes).
            me.line.setAttributes({
                fill: 'none',
                zIndex: 3000
            });
            if (!endLineStyle.stroke && colorArrayLength) {
                me.line.setAttributes({
                    stroke: colorArrayStyle[seriesIdx % colorArrayLength]
                }, true);
            }
            if (enableShadows) {
                //create shadows
                shadows = me.line.shadows = [];
                for (shindex = 0; shindex < lnsh; shindex++) {
                    shadowBarAttr = shadowAttributes[shindex];
                    shadowBarAttr = Ext.apply({}, shadowBarAttr, { path: dummyPath });
                    shadow = surface.add(Ext.apply({}, {
                        type: 'path',
                        group: shadowGroups[shindex]
                    }, shadowBarAttr));
                    shadows.push(shadow);
                }
            }
        }
        if (me.fill) {
            fillPath = renderPath.concat([
                ["L", x, bbox.y + bbox.height],
                ["L", firstX, bbox.y + bbox.height],
                ["L", firstX, firstY]
            ]);
            if (!me.fillPath) {
                me.fillPath = surface.add({
                    group: group,
                    type: 'path',
                    fill: endLineStyle.fill || colorArrayStyle[seriesIdx % colorArrayLength],
                    path: dummyPath
                });
            }
        }
        markerCount = showMarkers && markerGroup.getCount();
        if (chart.animate) {
            fill = me.fill;
            line = me.line;
            //Add renderer to line. There is not unique record associated with this.
            rendererAttributes = me.renderer(line, false, { path: renderPath }, i, store);
            Ext.apply(rendererAttributes, endLineStyle || {}, {
                stroke: endLineStyle.stroke || endLineStyle.fill
            });
            //fill should not be used here but when drawing the special fill path object
            delete rendererAttributes.fill;
            line.show(true);
            if (chart.markerIndex && me.previousPath) {
                me.animation = animation = me.onAnimate(line, {
                    to: rendererAttributes,
                    from: {
                        path: fromPath
                    }
                });
            } else {
                me.animation = animation = me.onAnimate(line, {
                    to: rendererAttributes
                });
            }
            //animate shadows
            if (enableShadows) {
                shadows = line.shadows;
                for(j = 0; j < lnsh; j++) {
                    shadows[j].show(true);
                    if (chart.markerIndex && me.previousPath) {
                        me.onAnimate(shadows[j], {
                            to: { path: renderPath },
                            from: { path: fromPath }
                        });
                    } else {
                        me.onAnimate(shadows[j], {
                            to: { path: renderPath }
                        });
                    }
                }
            }
            //animate fill path
            if (fill) {
                me.fillPath.show(true);
                me.onAnimate(me.fillPath, {
                    to: Ext.apply({}, {
                        path: fillPath,
                        fill: endLineStyle.fill || colorArrayStyle[seriesIdx % colorArrayLength],
                        'stroke-width': 0,
                        opacity: fillOpacity
                    }, endLineStyle || {})
                });
            }
            //animate markers
            if (showMarkers) {
                count = 0;
                for(i = 0; i < ln; i++) {
                    if (me.items[i]) {
                        item = markerGroup.getAt(count++);
                        if (item) {
                            rendererAttributes = me.renderer(item, store.getAt(i), item._to, i, store);
                            me.onAnimate(item, {
                                to: Ext.apply(rendererAttributes, endMarkerStyle || {})
                            });
                            item.show(true);
                        }
                    }
                }
                for(; count < markerCount; count++) {
                    item = markerGroup.getAt(count);
                    item.hide(true);
                }
//                for(i = 0; i < (chart.markerIndex || 0)-1; i++) {
//                    item = markerGroup.getAt(i);
//                    item.hide(true);
//                }
            }
        } else {
            rendererAttributes = me.renderer(me.line, false, { path: renderPath, hidden: false }, i, store);
            Ext.apply(rendererAttributes, endLineStyle || {}, {
                stroke: endLineStyle.stroke || endLineStyle.fill
            });
            //fill should not be used here but when drawing the special fill path object
            delete rendererAttributes.fill;
            me.line.setAttributes(rendererAttributes, true);
            me.line.setAttributes({
                opacity: lineOpacity
            }, true);
            //set path for shadows
            if (enableShadows) {
                shadows = me.line.shadows;
                for(j = 0; j < lnsh; j++) {
                    shadows[j].setAttributes({
                        path: renderPath,
                        hidden: false
                    }, true);
                }
            }
            if (me.fill) {
                me.fillPath.setAttributes({
                    path: fillPath,
                    hidden: false,
                    opacity: fillOpacity
                }, true);
            }
            if (showMarkers) {
                count = 0;
                for(i = 0; i < ln; i++) {
                    if (me.items[i]) {
                        item = markerGroup.getAt(count++);
                        if (item) {
                            rendererAttributes = me.renderer(item, store.getAt(i), item._to, i, store);
                            item.setAttributes(Ext.apply(endMarkerStyle || {}, rendererAttributes || {}), true);
                            if (!item.attr.hidden) {
                                item.show(true);
                            }
                        }
                    }
                }
                for(; count < markerCount; count++) {
                    item = markerGroup.getAt(count);
                    item.hide(true);
                }
            }
        }

        if (chart.markerIndex) {
            if (me.smooth) {
                Ext.Array.erase(path, 1, 2);
            } else {
                Ext.Array.splice(path, 1, 0, path[1], path[2]);
            }
            me.previousPath = path;
        }
        me.renderLabels();
        me.renderCallouts();

        me.fireEvent('draw', me);
    },

    // @private called when a label is to be created.
    onCreateLabel: function(storeItem, item, i, display) {
        var me = this,
            group = me.labelsGroup,
            config = me.label,
            bbox = me.bbox,
            endLabelStyle = Ext.apply(config, me.seriesLabelStyle);

        return me.chart.surface.add(Ext.apply({
            'type': 'text',
            'text-anchor': 'middle',
            'group': group,
            'x': item.point[0],
            'y': bbox.y + bbox.height / 2
        }, endLabelStyle || {}));
    },

    // @private called when a label is to be created.
    onPlaceLabel: function(label, storeItem, item, i, display, animate) {
        var me = this,
            chart = me.chart,
            resizing = chart.resizing,
            config = me.label,
            format = config.renderer,
            field = config.field,
            bbox = me.bbox,
            x = item.point[0],
            y = item.point[1],
            radius = item.sprite.attr.radius,
            bb, width, height;

        label.setAttributes({
            text: format(storeItem.get(field)),
            hidden: true
        }, true);

        if (display == 'rotate') {
            label.setAttributes({
                'text-anchor': 'start',
                'rotation': {
                    x: x,
                    y: y,
                    degrees: -45
                }
            }, true);
            //correct label position to fit into the box
            bb = label.getBBox();
            width = bb.width;
            height = bb.height;
            x = x < bbox.x? bbox.x : x;
            x = (x + width > bbox.x + bbox.width)? (x - (x + width - bbox.x - bbox.width)) : x;
            y = (y - height < bbox.y)? bbox.y + height : y;

        } else if (display == 'under' || display == 'over') {
            //TODO(nicolas): find out why width/height values in circle bounding boxes are undefined.
            bb = item.sprite.getBBox();
            bb.width = bb.width || (radius * 2);
            bb.height = bb.height || (radius * 2);
            y = y + (display == 'over'? -bb.height : bb.height);
            //correct label position to fit into the box
            bb = label.getBBox();
            width = bb.width/2;
            height = bb.height/2;
            x = x - width < bbox.x? bbox.x + width : x;
            x = (x + width > bbox.x + bbox.width) ? (x - (x + width - bbox.x - bbox.width)) : x;
            y = y - height < bbox.y? bbox.y + height : y;
            y = (y + height > bbox.y + bbox.height) ? (y - (y + height - bbox.y - bbox.height)) : y;
        }

        if (me.chart.animate && !me.chart.resizing) {
            label.show(true);
            me.onAnimate(label, {
                to: {
                    x: x,
                    y: y
                }
            });
        } else {
            label.setAttributes({
                x: x,
                y: y
            }, true);
            if (resizing && me.animation) {
                me.animation.on('afteranimate', function() {
                    label.show(true);
                });
            } else {
                label.show(true);
            }
        }
    },

    // @private Overriding highlights.js highlightItem method.
    highlightItem: function() {
        var me = this;
        me.callParent(arguments);
        if (me.line && !me.highlighted) {
            if (!('__strokeWidth' in me.line)) {
                me.line.__strokeWidth = parseFloat(me.line.attr['stroke-width']) || 0;
            }
            if (me.line.__anim) {
                me.line.__anim.paused = true;
            }
            me.line.__anim = Ext.create('Ext.fx.Anim', {
                target: me.line,
                to: {
                    'stroke-width': me.line.__strokeWidth + 3
                }
            });
            me.highlighted = true;
        }
    },

    // @private Overriding highlights.js unHighlightItem method.
    unHighlightItem: function() {
        var me = this;
        me.callParent(arguments);
        if (me.line && me.highlighted) {
            me.line.__anim = Ext.create('Ext.fx.Anim', {
                target: me.line,
                to: {
                    'stroke-width': me.line.__strokeWidth
                }
            });
            me.highlighted = false;
        }
    },

    // @private called when a callout needs to be placed.
    onPlaceCallout : function(callout, storeItem, item, i, display, animate, index) {
        if (!display) {
            return;
        }

        var me = this,
            chart = me.chart,
            surface = chart.surface,
            resizing = chart.resizing,
            config = me.callouts,
            items = me.items,
            prev = i == 0? false : items[i -1].point,
            next = (i == items.length -1)? false : items[i +1].point,
            cur = [+item.point[0], +item.point[1]],
            dir, norm, normal, a, aprev, anext,
            offsetFromViz = config.offsetFromViz || 30,
            offsetToSide = config.offsetToSide || 10,
            offsetBox = config.offsetBox || 3,
            boxx, boxy, boxw, boxh,
            p, clipRect = me.clipRect,
            bbox = {
                width: config.styles.width || 10,
                height: config.styles.height || 10
            },
            x, y;

        //get the right two points
        if (!prev) {
            prev = cur;
        }
        if (!next) {
            next = cur;
        }
        a = (next[1] - prev[1]) / (next[0] - prev[0]);
        aprev = (cur[1] - prev[1]) / (cur[0] - prev[0]);
        anext = (next[1] - cur[1]) / (next[0] - cur[0]);

        norm = Math.sqrt(1 + a * a);
        dir = [1 / norm, a / norm];
        normal = [-dir[1], dir[0]];

        //keep the label always on the outer part of the "elbow"
        if (aprev > 0 && anext < 0 && normal[1] < 0
            || aprev < 0 && anext > 0 && normal[1] > 0) {
            normal[0] *= -1;
            normal[1] *= -1;
        } else if (Math.abs(aprev) < Math.abs(anext) && normal[0] < 0
                   || Math.abs(aprev) > Math.abs(anext) && normal[0] > 0) {
            normal[0] *= -1;
            normal[1] *= -1;
        }
        //position
        x = cur[0] + normal[0] * offsetFromViz;
        y = cur[1] + normal[1] * offsetFromViz;

        //box position and dimensions
        boxx = x + (normal[0] > 0? 0 : -(bbox.width + 2 * offsetBox));
        boxy = y - bbox.height /2 - offsetBox;
        boxw = bbox.width + 2 * offsetBox;
        boxh = bbox.height + 2 * offsetBox;

        //now check if we're out of bounds and invert the normal vector correspondingly
        //this may add new overlaps between labels (but labels won't be out of bounds).
        if (boxx < clipRect[0] || (boxx + boxw) > (clipRect[0] + clipRect[2])) {
            normal[0] *= -1;
        }
        if (boxy < clipRect[1] || (boxy + boxh) > (clipRect[1] + clipRect[3])) {
            normal[1] *= -1;
        }

        //update positions
        x = cur[0] + normal[0] * offsetFromViz;
        y = cur[1] + normal[1] * offsetFromViz;

        //update box position and dimensions
        boxx = x + (normal[0] > 0? 0 : -(bbox.width + 2 * offsetBox));
        boxy = y - bbox.height /2 - offsetBox;
        boxw = bbox.width + 2 * offsetBox;
        boxh = bbox.height + 2 * offsetBox;

        if (chart.animate) {
            //set the line from the middle of the pie to the box.
            me.onAnimate(callout.lines, {
                to: {
                    path: ["M", cur[0], cur[1], "L", x, y, "Z"]
                }
            });
            //set component position
            if (callout.panel) {
                callout.panel.setPosition(boxx, boxy, true);
            }
        }
        else {
            //set the line from the middle of the pie to the box.
            callout.lines.setAttributes({
                path: ["M", cur[0], cur[1], "L", x, y, "Z"]
            }, true);
            //set component position
            if (callout.panel) {
                callout.panel.setPosition(boxx, boxy);
            }
        }
        for (p in callout) {
            callout[p].show(true);
        }
    },

    isItemInPoint: function(x, y, item, i) {
        var me = this,
            items = me.items,
            tolerance = me.selectionTolerance,
            result = null,
            prevItem,
            nextItem,
            prevPoint,
            nextPoint,
            ln,
            x1,
            y1,
            x2,
            y2,
            xIntersect,
            yIntersect,
            dist1, dist2, dist, midx, midy,
            sqrt = Math.sqrt, abs = Math.abs;

        nextItem = items[i];
        prevItem = i && items[i - 1];

        if (i >= ln) {
            prevItem = items[ln - 1];
        }
        prevPoint = prevItem && prevItem.point;
        nextPoint = nextItem && nextItem.point;
        x1 = prevItem ? prevPoint[0] : nextPoint[0] - tolerance;
        y1 = prevItem ? prevPoint[1] : nextPoint[1];
        x2 = nextItem ? nextPoint[0] : prevPoint[0] + tolerance;
        y2 = nextItem ? nextPoint[1] : prevPoint[1];
        dist1 = sqrt((x - x1) * (x - x1) + (y - y1) * (y - y1));
        dist2 = sqrt((x - x2) * (x - x2) + (y - y2) * (y - y2));
        dist = Math.min(dist1, dist2);

        if (dist <= tolerance) {
            return dist == dist1? prevItem : nextItem;
        }
        return false;
    },

    // @private toggle visibility of all series elements (markers, sprites).
    toggleAll: function(show) {
        var me = this,
            i, ln, shadow, shadows;
        if (!show) {
            Ext.chart.series.Cartesian.prototype.hideAll.call(me);
        }
        else {
            Ext.chart.series.Cartesian.prototype.showAll.call(me);
        }
        if (me.line) {
            me.line.setAttributes({
                hidden: !show
            }, true);
            //hide shadows too
            if (me.line.shadows) {
                for (i = 0, shadows = me.line.shadows, ln = shadows.length; i < ln; i++) {
                    shadow = shadows[i];
                    shadow.setAttributes({
                        hidden: !show
                    }, true);
                }
            }
        }
        if (me.fillPath) {
            me.fillPath.setAttributes({
                hidden: !show
            }, true);
        }
    },

    // @private hide all series elements (markers, sprites).
    hideAll: function() {
        this.toggleAll(false);
    },

    // @private hide all series elements (markers, sprites).
    showAll: function() {
        this.toggleAll(true);
    }
});

/**
 * @class Ext.chart.series.Pie
 *
 * Creates a Pie Chart. A Pie Chart is a useful visualization technique to display quantitative information for different
 * categories that also have a meaning as a whole.
 * As with all other series, the Pie Series must be appended in the *series* Chart array configuration. See the Chart
 * documentation for more information. A typical configuration object for the pie series could be:
 *
 *     @example
 *     var store = Ext.create('Ext.data.JsonStore', {
 *         fields: ['name', 'data'],
 *         data: [
 *             { 'name': 'metric one',   'data': 10 },
 *             { 'name': 'metric two',   'data':  7 },
 *             { 'name': 'metric three', 'data':  5 },
 *             { 'name': 'metric four',  'data':  2 },
 *             { 'name': 'metric five',  'data': 27 }
 *         ]
 *     });
 *
 *     Ext.create('Ext.chart.Chart', {
 *         renderTo: Ext.getBody(),
 *         width: 500,
 *         height: 350,
 *         animate: true,
 *         store: store,
 *         theme: 'Base:gradients',
 *         series: [{
 *             type: 'pie',
 *             angleField: 'data',
 *             showInLegend: true,
 *             tips: {
 *                 trackMouse: true,
 *                 width: 140,
 *                 height: 28,
 *                 renderer: function(storeItem, item) {
 *                     // calculate and display percentage on hover
 *                     var total = 0;
 *                     store.each(function(rec) {
 *                         total += rec.get('data');
 *                     });
 *                     this.setTitle(storeItem.get('name') + ': ' + Math.round(storeItem.get('data') / total * 100) + '%');
 *                 }
 *             },
 *             highlight: {
 *                 segment: {
 *                     margin: 20
 *                 }
 *             },
 *             label: {
 *                 field: 'name',
 *                 display: 'rotate',
 *                 contrast: true,
 *                 font: '18px Arial'
 *             }
 *         }]
 *     });
 *
 * In this configuration we set `pie` as the type for the series, set an object with specific style properties for highlighting options
 * (triggered when hovering elements). We also set true to `showInLegend` so all the pie slices can be represented by a legend item.
 *
 * We set `data` as the value of the field to determine the angle span for each pie slice. We also set a label configuration object
 * where we set the field name of the store field to be renderer as text for the label. The labels will also be displayed rotated.
 *
 * We set `contrast` to `true` to flip the color of the label if it is to similar to the background color. Finally, we set the font family
 * and size through the `font` parameter.
 *
 * @xtype pie
 */
Ext.define('Ext.chart.series.Pie', {

    /* Begin Definitions */

    alternateClassName: ['Ext.chart.PieSeries', 'Ext.chart.PieChart'],

    extend: 'Ext.chart.series.Series',

    /* End Definitions */

    type: "pie",

    alias: 'series.pie',

    accuracy: 100000,

    rad: Math.PI * 2 / 100000,

    /**
     * @cfg {Number} highlightDuration
     * The duration for the pie slice highlight effect.
     */
    highlightDuration: 150,

    /**
     * @cfg {String} angleField (required)
     * The store record field name to be used for the pie angles.
     * The values bound to this field name must be positive real numbers.
     */
    angleField: false,

    /**
     * @cfg {String} field
     * Alias for {@link #angleField}.
     */

    /**
     * @cfg {String} xField
     * Alias for {@link #angleField}.
     */

    /**
     * @cfg {String} lengthField
     * The store record field name to be used for the pie slice lengths.
     * The values bound to this field name must be positive real numbers.
     */
    lengthField: false,

    /**
     * @cfg {Boolean/Number} donut
     * Whether to set the pie chart as donut chart.
     * Default's false. Can be set to a particular percentage to set the radius
     * of the donut chart.
     */
    donut: false,

    /**
     * @cfg {Boolean} showInLegend
     * Whether to add the pie chart elements as legend items. Default's false.
     */
    showInLegend: false,

    /**
     * @cfg {Array} colorSet
     * An array of color values which will be used, in order, as the pie slice fill colors.
     */

    /**
     * @cfg {Object} style
     * An object containing styles for overriding series styles from Theming.
     */
    style: {},

    constructor: function(config) {
        this.callParent(arguments);
        var me = this,
            chart = me.chart,
            surface = chart.surface,
            store = chart.store,
            shadow = chart.shadow, i, l, cfg;
        config.highlightCfg = Ext.merge({
            segment: {
                margin: 20
            }
        }, config.highlightCfg);
        Ext.apply(me, config, {
            shadowAttributes: [{
                "stroke-width": 6,
                "stroke-opacity": 1,
                stroke: 'rgb(200, 200, 200)',
                translate: {
                    x: 1.2,
                    y: 2
                }
            },
            {
                "stroke-width": 4,
                "stroke-opacity": 1,
                stroke: 'rgb(150, 150, 150)',
                translate: {
                    x: 0.9,
                    y: 1.5
                }
            },
            {
                "stroke-width": 2,
                "stroke-opacity": 1,
                stroke: 'rgb(100, 100, 100)',
                translate: {
                    x: 0.6,
                    y: 1
                }
            }]
        });
        me.group = surface.getGroup(me.seriesId);
        if (shadow) {
            for (i = 0, l = me.shadowAttributes.length; i < l; i++) {
                me.shadowGroups.push(surface.getGroup(me.seriesId + '-shadows' + i));
            }
        }
        surface.customAttributes.segment = function(opt) {
            //Browsers will complain if we create a path
            //element that has no path commands. So ensure a dummy 
            //path command for an empty path.
            var ans = me.getSegment(opt);
            if (!ans.path || ans.path.length === 0) {
                ans.path = ['M', 0, 0];
            }
            return ans;
        };
        me.__excludes = me.__excludes || [];
    },

    // @private updates some onbefore render parameters.
    initialize: function() {
        var me = this,
            store = me.chart.getChartStore(),
            data = store.data.items,
            i, ln, rec;
        //Add yFields to be used in Legend.js
        me.yField = [];
        if (me.label.field) {
            for (i = 0, ln = data.length; i < ln; i++) {
                rec = data[i];
                me.yField.push(rec.get(me.label.field));
            }
        }
    },

    // @private returns an object with properties for a PieSlice.
    getSegment: function(opt) {
        var me = this,
            rad = me.rad,
            cos = Math.cos,
            sin = Math.sin,
            x = me.centerX,
            y = me.centerY,
            x1 = 0, x2 = 0, x3 = 0, x4 = 0,
            y1 = 0, y2 = 0, y3 = 0, y4 = 0,
            x5 = 0, y5 = 0, x6 = 0, y6 = 0,
            delta = 1e-2,
            startAngle = opt.startAngle,
            endAngle = opt.endAngle,
            midAngle = (startAngle + endAngle) / 2 * rad,
            margin = opt.margin || 0,
            a1 = Math.min(startAngle, endAngle) * rad,
            a2 = Math.max(startAngle, endAngle) * rad,
            c1 = cos(a1), s1 = sin(a1),
            c2 = cos(a2), s2 = sin(a2),
            cm = cos(midAngle), sm = sin(midAngle),
            flag = 0, hsqr2 = 0.7071067811865476; // sqrt(0.5)

        if (a2 - a1 < delta) {
            return {path: ""};
        }

        if (margin !== 0) {
            x += margin * cm;
            y += margin * sm;
        }

        x2 = x + opt.endRho * c1;
        y2 = y + opt.endRho * s1;

        x4 = x + opt.endRho * c2;
        y4 = y + opt.endRho * s2;

        x6 = x + opt.endRho * cm;
        y6 = y + opt.endRho * sm;

        if (opt.startRho !== 0) {
            x1 = x + opt.startRho * c1;
            y1 = y + opt.startRho * s1;
    
            x3 = x + opt.startRho * c2;
            y3 = y + opt.startRho * s2;
    
            x5 = x + opt.startRho * cm;
            y5 = y + opt.startRho * sm;

            return {
                path: [
                    ["M", x2, y2],
                    ["A", opt.endRho, opt.endRho, 0, 0, 1, x6, y6], ["L", x6, y6],
                    ["A", opt.endRho, opt.endRho, 0, flag, 1, x4, y4], ["L", x4, y4],
                    ["L", x3, y3],
                    ["A", opt.startRho, opt.startRho, 0, flag, 0, x5, y5], ["L", x5, y5],
                    ["A", opt.startRho, opt.startRho, 0, 0, 0, x1, y1], ["L", x1, y1],
                    ["Z"]
                ]
            };
        } else {
            return {
                path: [
                    ["M", x, y],
                    ["L", x2, y2],
                    ["A", opt.endRho, opt.endRho, 0, 0, 1, x6, y6], ["L", x6, y6],
                    ["A", opt.endRho, opt.endRho, 0, flag, 1, x4, y4], ["L", x4, y4],
                    ["L", x, y],
                    ["Z"]
                ]
            };
        }
    },

    // @private utility function to calculate the middle point of a pie slice.
    calcMiddle: function(item) {
        var me = this,
            rad = me.rad,
            slice = item.slice,
            x = me.centerX,
            y = me.centerY,
            startAngle = slice.startAngle,
            endAngle = slice.endAngle,
            donut = +me.donut,
            midAngle = -(startAngle + endAngle) * rad / 2,
            r = (item.endRho + item.startRho) / 2,
            xm = x + r * Math.cos(midAngle),
            ym = y - r * Math.sin(midAngle);

        item.middle = {
            x: xm,
            y: ym
        };
    },

    /**
     * Draws the series for the current chart.
     */
    drawSeries: function() {
        var me = this,
            store = me.chart.getChartStore(),
            data = store.data.items,
            record,
            group = me.group,
            animate = me.chart.animate,
            field = me.angleField || me.field || me.xField,
            lenField = [].concat(me.lengthField),
            totalLenField = 0,
            chart = me.chart,
            surface = chart.surface,
            chartBBox = chart.chartBBox,
            enableShadows = chart.shadow,
            shadowGroups = me.shadowGroups,
            shadowAttributes = me.shadowAttributes,
            lnsh = shadowGroups.length,
            layers = lenField.length,
            rhoAcum = 0,
            donut = +me.donut,
            layerTotals = [],
            items = [],
            totalField = 0,
            maxLenField = 0,
            angle = 0,
            seriesStyle = me.seriesStyle,
            colorArrayStyle = me.colorArrayStyle,
            colorArrayLength = colorArrayStyle && colorArrayStyle.length || 0,
            rendererAttributes,
            shadowAttr,
            shadows,
            shadow,
            shindex,
            centerX,
            centerY,
            deltaRho,
            first = 0,
            slice,
            slices,
            sprite,
            value,
            item,
            lenValue,
            ln,
            i,
            j,
            endAngle,
            path,
            p,
            spriteOptions, bbox;

        Ext.apply(seriesStyle, me.style || {});

        me.setBBox();
        bbox = me.bbox;

        //override theme colors
        if (me.colorSet) {
            colorArrayStyle = me.colorSet;
            colorArrayLength = colorArrayStyle.length;
        }

        //if not store or store is empty then there's nothing to draw
        if (!store || !store.getCount() || me.seriesIsHidden) {
            me.hide();
            me.items = [];
            return;
        }

        me.unHighlightItem();
        me.cleanHighlights();

        centerX = me.centerX = chartBBox.x + (chartBBox.width / 2);
        centerY = me.centerY = chartBBox.y + (chartBBox.height / 2);
        me.radius = Math.min(centerX - chartBBox.x, centerY - chartBBox.y);
        me.slices = slices = [];
        me.items = items = [];

        for (i = 0, ln = data.length; i < ln; i++) {
            record = data[i];
            if (this.__excludes && this.__excludes[i]) {
                //hidden series
                continue;
            }
            totalField += +record.get(field);
            if (lenField[0]) {
                for (j = 0, totalLenField = 0; j < layers; j++) {
                    totalLenField += +record.get(lenField[j]);
                }
                layerTotals[i] = totalLenField;
                maxLenField = Math.max(maxLenField, totalLenField);
            }
        }

        totalField = totalField || 1;
        for (i = 0, ln = data.length; i < ln; i++) {
            record = data[i];
            if (this.__excludes && this.__excludes[i]) {
                value = 0;
            } else {
                value = record.get(field);
                if (first == 0) {
                    first = 1;
                }
            }

            // First slice
            if (first == 1) {
                first = 2;
                me.firstAngle = angle = me.accuracy * value / totalField / 2;
                for (j = 0; j < i; j++) {
                    slices[j].startAngle = slices[j].endAngle = me.firstAngle;
                }
            }

            endAngle = angle - me.accuracy * value / totalField;
            slice = {
                series: me,
                value: value,
                startAngle: angle,
                endAngle: endAngle,
                storeItem: record
            };
            if (lenField[0]) {
                lenValue = +layerTotals[i];
                //removing the floor will break Opera 11.6*
                slice.rho = Math.floor(me.radius / maxLenField * lenValue);
            } else {
                slice.rho = me.radius;
            }
            slices[i] = slice;
            // Do not remove this closure for the sake of https://sencha.jira.com/browse/EXTJSIV-5836
            (function () {
                angle = endAngle;
            })();
        }

        //do all shadows first.
        if (enableShadows) {
            for (i = 0, ln = slices.length; i < ln; i++) {
                slice = slices[i];
                slice.shadowAttrs = [];
                for (j = 0, rhoAcum = 0, shadows = []; j < layers; j++) {
                    sprite = group.getAt(i * layers + j);
                    deltaRho = lenField[j] ? store.getAt(i).get(lenField[j]) / layerTotals[i] * slice.rho: slice.rho;
                    //set pie slice properties
                    rendererAttributes = {
                        segment: {
                            startAngle: slice.startAngle,
                            endAngle: slice.endAngle,
                            margin: 0,
                            rho: slice.rho,
                            startRho: rhoAcum + (deltaRho * donut / 100),
                            endRho: rhoAcum + deltaRho
                        },
                        hidden: !slice.value && (slice.startAngle % me.accuracy) == (slice.endAngle % me.accuracy)
                    };
                    //create shadows
                    for (shindex = 0, shadows = []; shindex < lnsh; shindex++) {
                        shadowAttr = shadowAttributes[shindex];
                        shadow = shadowGroups[shindex].getAt(i);
                        if (!shadow) {
                            shadow = chart.surface.add(Ext.apply({}, {
                                type: 'path',
                                group: shadowGroups[shindex],
                                strokeLinejoin: "round"
                            }, rendererAttributes, shadowAttr));
                        }
                        shadowAttr = me.renderer(shadow, store.getAt(i), Ext.apply({}, rendererAttributes, shadowAttr), i, store);
                        if (animate) {
                            me.onAnimate(shadow, {
                                to: shadowAttr
                            });
                        } else {
                            shadow.setAttributes(shadowAttr, true);
                        }
                        shadows.push(shadow);
                    }
                    slice.shadowAttrs[j] = shadows;
                }
            }
        }
        //do pie slices after.
        for (i = 0, ln = slices.length; i < ln; i++) {
            slice = slices[i];
            for (j = 0, rhoAcum = 0; j < layers; j++) {
                sprite = group.getAt(i * layers + j);
                deltaRho = lenField[j] ? store.getAt(i).get(lenField[j]) / layerTotals[i] * slice.rho: slice.rho;
                //set pie slice properties
                rendererAttributes = Ext.apply({
                    segment: {
                        startAngle: slice.startAngle,
                        endAngle: slice.endAngle,
                        margin: 0,
                        rho: slice.rho,
                        startRho: rhoAcum + (deltaRho * donut / 100),
                        endRho: rhoAcum + deltaRho
                    },
                    hidden: (!slice.value && (slice.startAngle % me.accuracy) == (slice.endAngle % me.accuracy))
                }, Ext.apply(seriesStyle, colorArrayStyle && { fill: colorArrayStyle[(layers > 1? j : i) % colorArrayLength] } || {}));
                item = Ext.apply({},
                rendererAttributes.segment, {
                    slice: slice,
                    series: me,
                    storeItem: slice.storeItem,
                    index: i
                });
                me.calcMiddle(item);
                if (enableShadows) {
                    item.shadows = slice.shadowAttrs[j];
                }
                items[i] = item;
                // Create a new sprite if needed (no height)
                if (!sprite) {
                    spriteOptions = Ext.apply({
                        type: "path",
                        group: group,
                        middle: item.middle
                    }, Ext.apply(seriesStyle, colorArrayStyle && { fill: colorArrayStyle[(layers > 1? j : i) % colorArrayLength] } || {}));
                    sprite = surface.add(Ext.apply(spriteOptions, rendererAttributes));
                }
                slice.sprite = slice.sprite || [];
                item.sprite = sprite;
                slice.sprite.push(sprite);
                slice.point = [item.middle.x, item.middle.y];
                if (animate) {
                    rendererAttributes = me.renderer(sprite, store.getAt(i), rendererAttributes, i, store);
                    sprite._to = rendererAttributes;
                    sprite._animating = true;
                    me.onAnimate(sprite, {
                        to: rendererAttributes,
                        listeners: {
                            afteranimate: {
                                fn: function() {
                                    this._animating = false;
                                },
                                scope: sprite
                            }
                        }
                    });
                } else {
                    rendererAttributes = me.renderer(sprite, store.getAt(i), Ext.apply(rendererAttributes, {
                        hidden: false
                    }), i, store);
                    sprite.setAttributes(rendererAttributes, true);
                }
                rhoAcum += deltaRho;
            }
        }

        // Hide unused bars
        ln = group.getCount();
        for (i = 0; i < ln; i++) {
            if (!slices[(i / layers) >> 0] && group.getAt(i)) {
                group.getAt(i).hide(true);
            }
        }
        if (enableShadows) {
            lnsh = shadowGroups.length;
            for (shindex = 0; shindex < ln; shindex++) {
                if (!slices[(shindex / layers) >> 0]) {
                    for (j = 0; j < lnsh; j++) {
                        if (shadowGroups[j].getAt(shindex)) {
                            shadowGroups[j].getAt(shindex).hide(true);
                        }
                    }
                }
            }
        }
        me.renderLabels();
        me.renderCallouts();
    },

    // @private callback for when creating a label sprite.
    onCreateLabel: function(storeItem, item, i, display) {
        var me = this,
            group = me.labelsGroup,
            config = me.label,
            centerX = me.centerX,
            centerY = me.centerY,
            middle = item.middle,
            endLabelStyle = Ext.apply(me.seriesLabelStyle || {}, config || {});

        return me.chart.surface.add(Ext.apply({
            'type': 'text',
            'text-anchor': 'middle',
            'group': group,
            'x': middle.x,
            'y': middle.y
        }, endLabelStyle));
    },

    // @private callback for when placing a label sprite.
    onPlaceLabel: function(label, storeItem, item, i, display, animate, index) {
        var me = this,
            chart = me.chart,
            resizing = chart.resizing,
            config = me.label,
            format = config.renderer,
            field = [].concat(config.field),
            centerX = me.centerX,
            centerY = me.centerY,
            middle = item.middle,
            opt = {
                x: middle.x,
                y: middle.y
            },
            x = middle.x - centerX,
            y = middle.y - centerY,
            from = {},
            rho = 1,
            theta = Math.atan2(y, x || 1),
            dg = theta * 180 / Math.PI,
            prevDg;

        opt.hidden = false;

        if (this.__excludes && this.__excludes[i]) {
            opt.hidden = true;
        }

        function fixAngle(a) {
            if (a < 0) {
                a += 360;
            }
            return a % 360;
        }

        label.setAttributes({
            text: format(storeItem.get(field[index]))
        }, true);

        switch (display) {
        case 'outside':
            rho = Math.sqrt(x * x + y * y) * 2;
            //update positions
            opt.x = rho * Math.cos(theta) + centerX;
            opt.y = rho * Math.sin(theta) + centerY;
            break;

        case 'rotate':
            dg = fixAngle(dg);
            dg = (dg > 90 && dg < 270) ? dg + 180: dg;

            prevDg = label.attr.rotation.degrees;
            if (prevDg != null && Math.abs(prevDg - dg) > 180 * 0.5) {
                if (dg > prevDg) {
                    dg -= 360;
                } else {
                    dg += 360;
                }
                dg = dg % 360;
            } else {
                dg = fixAngle(dg);
            }
            //update rotation angle
            opt.rotate = {
                degrees: dg,
                x: opt.x,
                y: opt.y
            };
            break;

        default:
            break;
        }
        //ensure the object has zero translation
        opt.translate = {
            x: 0, y: 0
        };
        if (animate && !resizing && (display != 'rotate' || prevDg != null)) {
            me.onAnimate(label, {
                to: opt
            });
        } else {
            label.setAttributes(opt, true);
        }
        label._from = from;
    },

    // @private callback for when placing a callout sprite.
    onPlaceCallout: function(callout, storeItem, item, i, display, animate, index) {
        var me = this,
            chart = me.chart,
            centerX = me.centerX,
            centerY = me.centerY,
            middle = item.middle,
            opt = {
                x: middle.x,
                y: middle.y
            },
            x = middle.x - centerX,
            y = middle.y - centerY,
            rho = 1,
            rhoCenter,
            theta = Math.atan2(y, x || 1),
            bbox = callout.label.getBBox(),
            offsetFromViz = 20,
            offsetToSide = 10,
            offsetBox = 10,
            p;

        //should be able to config this.
        rho = item.endRho + offsetFromViz;
        rhoCenter = (item.endRho + item.startRho) / 2 + (item.endRho - item.startRho) / 3;
        //update positions
        opt.x = rho * Math.cos(theta) + centerX;
        opt.y = rho * Math.sin(theta) + centerY;

        x = rhoCenter * Math.cos(theta);
        y = rhoCenter * Math.sin(theta);

        if (chart.animate) {
            //set the line from the middle of the pie to the box.
            me.onAnimate(callout.lines, {
                to: {
                    path: ["M", x + centerX, y + centerY, "L", opt.x, opt.y, "Z", "M", opt.x, opt.y, "l", x > 0 ? offsetToSide: -offsetToSide, 0, "z"]
                }
            });
            //set box position
            me.onAnimate(callout.box, {
                to: {
                    x: opt.x + (x > 0 ? offsetToSide: -(offsetToSide + bbox.width + 2 * offsetBox)),
                    y: opt.y + (y > 0 ? ( - bbox.height - offsetBox / 2) : ( - bbox.height - offsetBox / 2)),
                    width: bbox.width + 2 * offsetBox,
                    height: bbox.height + 2 * offsetBox
                }
            });
            //set text position
            me.onAnimate(callout.label, {
                to: {
                    x: opt.x + (x > 0 ? (offsetToSide + offsetBox) : -(offsetToSide + bbox.width + offsetBox)),
                    y: opt.y + (y > 0 ? -bbox.height / 4: -bbox.height / 4)
                }
            });
        } else {
            //set the line from the middle of the pie to the box.
            callout.lines.setAttributes({
                path: ["M", x + centerX, y + centerY, "L", opt.x, opt.y, "Z", "M", opt.x, opt.y, "l", x > 0 ? offsetToSide: -offsetToSide, 0, "z"]
            },
            true);
            //set box position
            callout.box.setAttributes({
                x: opt.x + (x > 0 ? offsetToSide: -(offsetToSide + bbox.width + 2 * offsetBox)),
                y: opt.y + (y > 0 ? ( - bbox.height - offsetBox / 2) : ( - bbox.height - offsetBox / 2)),
                width: bbox.width + 2 * offsetBox,
                height: bbox.height + 2 * offsetBox
            },
            true);
            //set text position
            callout.label.setAttributes({
                x: opt.x + (x > 0 ? (offsetToSide + offsetBox) : -(offsetToSide + bbox.width + offsetBox)),
                y: opt.y + (y > 0 ? -bbox.height / 4: -bbox.height / 4)
            },
            true);
        }
        for (p in callout) {
            callout[p].show(true);
        }
    },

    // @private handles sprite animation for the series.
    onAnimate: function(sprite, attr) {
        sprite.show();
        return this.callParent(arguments);
    },

    isItemInPoint: function(x, y, item, i) {
        var me = this,
            cx = me.centerX,
            cy = me.centerY,
            abs = Math.abs,
            dx = abs(x - cx),
            dy = abs(y - cy),
            startAngle = item.startAngle,
            endAngle = item.endAngle,
            rho = Math.sqrt(dx * dx + dy * dy),
            angle = Math.atan2(y - cy, x - cx) / me.rad;

        // normalize to the same range of angles created by drawSeries
        if (angle > me.firstAngle) {
            angle -= me.accuracy;
        }
        return (angle <= startAngle && angle > endAngle
                && rho >= item.startRho && rho <= item.endRho);
    },

    // @private hides all elements in the series.
    hideAll: function(index) {
        var i, l, shadow, shadows, sh, lsh, sprite;
        index = (isNaN(this._index) ? index : this._index) || 0;
        this.__excludes = this.__excludes || [];
        this.__excludes[index] = true;
        sprite = this.slices[index].sprite;
        for (sh = 0, lsh = sprite.length; sh < lsh; sh++) {
            sprite[sh].setAttributes({
                hidden: true
            }, true);
        }
        if (this.slices[index].shadowAttrs) {
            for (i = 0, shadows = this.slices[index].shadowAttrs, l = shadows.length; i < l; i++) {
                shadow = shadows[i];
                for (sh = 0, lsh = shadow.length; sh < lsh; sh++) {
                    shadow[sh].setAttributes({
                        hidden: true
                    }, true);
                }
            }
        }
        this.drawSeries();
    },

    // @private shows all elements in the series.
    showAll: function(index) {
        index = (isNaN(this._index) ? index : this._index) || 0;
        this.__excludes[index] = false;
        this.drawSeries();
    },

    /**
     * Highlight the specified item. If no item is provided the whole series will be highlighted.
     * @param item {Object} Info about the item; same format as returned by #getItemForPoint
     */
    highlightItem: function(item) {
        var me = this,
            rad = me.rad,
            highlightSegment,
            animate,
            attrs,
            i,
            shadows,
            shadow,
            ln,
            to,
            itemHighlightSegment,
            prop,
            group,
            display,
            label,
            middle,
            r,
            x,
            y;
        item = item || this.items[this._index];

        //TODO(nico): sometimes in IE itemmouseover is triggered
        //twice without triggering itemmouseout in between. This
        //fixes the highlighting bug. Eventually, events should be
        //changed to trigger one itemmouseout between two itemmouseovers.
        this.unHighlightItem();

        if (!item || me.animating || (item.sprite && item.sprite._animating)) {
            return;
        }
        me.callParent([item]);
        if (!me.highlight) {
            return;
        }
        if ('segment' in me.highlightCfg) {
            highlightSegment = me.highlightCfg.segment;
            animate = me.chart.animate;
            //animate labels
            if (me.labelsGroup) {
                group = me.labelsGroup;
                display = me.label.display;
                label = group.getAt(item.index);
                middle = (item.startAngle + item.endAngle) / 2 * rad;
                r = highlightSegment.margin || 0;
                x = r * Math.cos(middle);
                y = r * Math.sin(middle);

                //TODO(nico): rounding to 1e-10
                //gives the right translation. Translation
                //was buggy for very small numbers. In this
                //case we're not looking to translate to very small
                //numbers but not to translate at all.
                if (Math.abs(x) < 1e-10) {
                    x = 0;
                }
                if (Math.abs(y) < 1e-10) {
                    y = 0;
                }

                if (animate) {
                    label.stopAnimation();
                    label.animate({
                        to: {
                            translate: {
                                x: x,
                                y: y
                            }
                        },
                        duration: me.highlightDuration
                    });
                }
                else {
                    label.setAttributes({
                        translate: {
                            x: x,
                            y: y
                        }
                    }, true);
                }
            }
            //animate shadows
            if (me.chart.shadow && item.shadows) {
                i = 0;
                shadows = item.shadows;
                ln = shadows.length;
                for (; i < ln; i++) {
                    shadow = shadows[i];
                    to = {};
                    itemHighlightSegment = item.sprite._from.segment;
                    for (prop in itemHighlightSegment) {
                        if (! (prop in highlightSegment)) {
                            to[prop] = itemHighlightSegment[prop];
                        }
                    }
                    attrs = {
                        segment: Ext.applyIf(to, me.highlightCfg.segment)
                    };
                    if (animate) {
                        shadow.stopAnimation();
                        shadow.animate({
                            to: attrs,
                            duration: me.highlightDuration
                        });
                    }
                    else {
                        shadow.setAttributes(attrs, true);
                    }
                }
            }
        }
    },

    /**
     * Un-highlights the specified item. If no item is provided it will un-highlight the entire series.
     * @param item {Object} Info about the item; same format as returned by #getItemForPoint
     */
    unHighlightItem: function() {
        var me = this,
            items,
            animate,
            shadowsEnabled,
            group,
            len,
            i,
            j,
            display,
            shadowLen,
            p,
            to,
            ihs,
            hs,
            sprite,
            shadows,
            shadow,
            item,
            label,
            attrs;
        if (!me.highlight) {
            return;
        }

        if (('segment' in me.highlightCfg) && me.items) {
            items = me.items;
            animate = me.chart.animate;
            shadowsEnabled = !!me.chart.shadow;
            group = me.labelsGroup;
            len = items.length;
            i = 0;
            j = 0;
            display = me.label.display;

            for (; i < len; i++) {
                item = items[i];
                if (!item) {
                    continue;
                }
                sprite = item.sprite;
                if (sprite && sprite._highlighted) {
                    //animate labels
                    if (group) {
                        label = group.getAt(item.index);
                        attrs = Ext.apply({
                            translate: {
                                x: 0,
                                y: 0
                            }
                        },
                        display == 'rotate' ? {
                            rotate: {
                                x: label.attr.x,
                                y: label.attr.y,
                                degrees: label.attr.rotation.degrees
                            }
                        }: {});
                        if (animate) {
                            label.stopAnimation();
                            label.animate({
                                to: attrs,
                                duration: me.highlightDuration
                            });
                        }
                        else {
                            label.setAttributes(attrs, true);
                        }
                    }
                    if (shadowsEnabled) {
                        shadows = item.shadows;
                        shadowLen = shadows.length;
                        for (; j < shadowLen; j++) {
                            to = {};
                            ihs = item.sprite._to.segment;
                            hs = item.sprite._from.segment;
                            Ext.apply(to, hs);
                            for (p in ihs) {
                                if (! (p in hs)) {
                                    to[p] = ihs[p];
                                }
                            }
                            shadow = shadows[j];
                            if (animate) {
                                shadow.stopAnimation();
                                shadow.animate({
                                    to: {
                                        segment: to
                                    },
                                    duration: me.highlightDuration
                                });
                            }
                            else {
                                shadow.setAttributes({ segment: to }, true);
                            }
                        }
                    }
                }
            }
        }
        me.callParent(arguments);
    },

    /**
     * Returns the color of the series (to be displayed as color for the series legend item).
     * @param item {Object} Info about the item; same format as returned by #getItemForPoint
     */
    getLegendColor: function(index) {
        var me = this;
        return (me.colorSet && me.colorSet[index % me.colorSet.length]) || me.colorArrayStyle[index % me.colorArrayStyle.length];
    }
});


/**
 * @class Ext.chart.series.Radar
 *
 * Creates a Radar Chart. A Radar Chart is a useful visualization technique for comparing different quantitative values for
 * a constrained number of categories.
 *
 * As with all other series, the Radar series must be appended in the *series* Chart array configuration. See the Chart
 * documentation for more information. A typical configuration object for the radar series could be:
 *
 *     @example
 *     var store = Ext.create('Ext.data.JsonStore', {
 *         fields: ['name', 'data1', 'data2', 'data3'],
 *         data: [
 *             { 'name': 'metric one',   'data1': 14, 'data2': 12, 'data3': 13 },
 *             { 'name': 'metric two',   'data1': 16, 'data2':  8, 'data3':  3 },
 *             { 'name': 'metric three', 'data1': 14, 'data2':  2, 'data3':  7 },
 *             { 'name': 'metric four',  'data1':  6, 'data2': 14, 'data3': 23 },
 *             { 'name': 'metric five',  'data1': 36, 'data2': 38, 'data3': 33 }
 *         ]
 *     });
 *
 *     Ext.create('Ext.chart.Chart', {
 *         renderTo: Ext.getBody(),
 *         width: 500,
 *         height: 300,
 *         animate: true,
 *         theme:'Category2',
 *         store: store,
 *         axes: [{
 *             type: 'Radial',
 *             position: 'radial',
 *             label: {
 *                 display: true
 *             }
 *         }],
 *         series: [{
 *             type: 'radar',
 *             xField: 'name',
 *             yField: 'data1',
 *             showInLegend: true,
 *             showMarkers: true,
 *             markerConfig: {
 *                 radius: 5,
 *                 size: 5
 *             },
 *             style: {
 *                 'stroke-width': 2,
 *                 fill: 'none'
 *             }
 *         },{
 *             type: 'radar',
 *             xField: 'name',
 *             yField: 'data2',
 *             showMarkers: true,
 *             showInLegend: true,
 *             markerConfig: {
 *                 radius: 5,
 *                 size: 5
 *             },
 *             style: {
 *                 'stroke-width': 2,
 *                 fill: 'none'
 *             }
 *         },{
 *             type: 'radar',
 *             xField: 'name',
 *             yField: 'data3',
 *             showMarkers: true,
 *             showInLegend: true,
 *             markerConfig: {
 *                 radius: 5,
 *                 size: 5
 *             },
 *             style: {
 *                 'stroke-width': 2,
 *                 fill: 'none'
 *             }
 *         }]
 *     });
 *
 * In this configuration we add three series to the chart. Each of these series is bound to the same
 * categories field, `name` but bound to different properties for each category, `data1`, `data2` and
 * `data3` respectively. All series display markers by having `showMarkers` enabled. The configuration
 * for the markers of each series can be set by adding properties onto the markerConfig object.
 * Finally we override some theme styling properties by adding properties to the `style` object.
 *
 * @xtype radar
 */
Ext.define('Ext.chart.series.Radar', {

    /* Begin Definitions */

    extend: 'Ext.chart.series.Series',

    requires: ['Ext.chart.Shape', 'Ext.fx.Anim'],

    /* End Definitions */

    type: "radar",
    alias: 'series.radar',


    rad: Math.PI / 180,

    showInLegend: false,

    /**
     * @cfg {Object} style
     * An object containing styles for overriding series styles from Theming.
     */
    style: {},

    constructor: function(config) {
        this.callParent(arguments);
        var me = this,
            surface = me.chart.surface, i, l;
        me.group = surface.getGroup(me.seriesId);
        if (me.showMarkers) {
            me.markerGroup = surface.getGroup(me.seriesId + '-markers');
        }
    },

    /**
     * Draws the series for the current chart.
     */
    drawSeries: function() {
        var me = this,
            store = me.chart.getChartStore(),
            data = store.data.items,
            d, record,
            group = me.group,
            sprite,
            chart = me.chart,
            seriesItems = chart.series.items,
            s, sLen, series,
            animate = chart.animate,
            field = me.field || me.yField,
            surface = chart.surface,
            chartBBox = chart.chartBBox,
            seriesIdx = me.seriesIdx,
            colorArrayStyle = me.colorArrayStyle,
            centerX, centerY,
            items,
            radius,
            maxValue = 0,
            fields = [],
            max = Math.max,
            cos = Math.cos,
            sin = Math.sin,
            pi2 = Math.PI * 2,
            l = store.getCount(),
            startPath, path, x, y, rho,
            i, nfields,
            seriesStyle = me.seriesStyle,
            seriesLabelStyle = me.seriesLabelStyle,
            first = chart.resizing || !me.radar,
            axis = chart.axes && chart.axes.get(0),
            aggregate = !(axis && axis.maximum);

        me.setBBox();
        
        maxValue = aggregate? 0 : (axis.maximum || 0);
        
        Ext.apply(seriesStyle, me.style || {});

        //if the store is empty then there's nothing to draw
        if (!store || !store.getCount() || me.seriesIsHidden) {
            me.hide();
            me.items = [];
            if (me.radar) {
                me.radar.hide(true);
            }
            me.radar = null;
            return;
        }
        
        if(!seriesStyle['stroke']){
            seriesStyle['stroke'] = colorArrayStyle[seriesIdx % colorArrayStyle.length];
        }

        me.unHighlightItem();
        me.cleanHighlights();

        centerX = me.centerX = chartBBox.x + (chartBBox.width / 2);
        centerY = me.centerY = chartBBox.y + (chartBBox.height / 2);
        me.radius = radius = Math.min(chartBBox.width, chartBBox.height) /2;
        me.items = items = [];

        if (aggregate) {
            //get all renderer fields
            for (s = 0, sLen = seriesItems.length; s < sLen; s++) {
                series = seriesItems[s];
                fields.push(series.yField);
            }
            //get maxValue to interpolate
            for (d = 0; d < l; d++) {
                record = data[d];
                for (i = 0, nfields = fields.length; i < nfields; i++) {
                    maxValue = max(+record.get(fields[i]), maxValue);
                }
            }
        }
        //ensure non-zero value.
        maxValue = maxValue || 1;
        //create path and items
        startPath = []; path = [];
        for (i = 0; i < l; i++) {
            record = data[i];
            rho = radius * record.get(field) / maxValue;
            x = rho * cos(i / l * pi2);
            y = rho * sin(i / l * pi2);
            if (i == 0) {
                path.push('M', x + centerX, y + centerY);
                startPath.push('M', 0.01 * x + centerX, 0.01 * y + centerY);
            } else {
                path.push('L', x + centerX, y + centerY);
                startPath.push('L', 0.01 * x + centerX, 0.01 * y + centerY);
            }
            items.push({
                sprite: false, //TODO(nico): add markers
                point: [centerX + x, centerY + y],
                storeItem: record,
                series: me
            });
        }
        path.push('Z');
        //create path sprite
        if (!me.radar) {
            me.radar = surface.add(Ext.apply({
                type: 'path',
                group: group,
                path: startPath
            }, seriesStyle || {}));
        }
        //reset on resizing
        if (chart.resizing) {
            me.radar.setAttributes({
                path: startPath
            }, true);
        }
        //render/animate
        if (chart.animate) {
            me.onAnimate(me.radar, {
                to: Ext.apply({
                    path: path
                }, seriesStyle || {})
            });
        } else {
            me.radar.setAttributes(Ext.apply({
                path: path
            }, seriesStyle || {}), true);
        }
        //render markers, labels and callouts
        if (me.showMarkers) {
            me.drawMarkers();
        }
        me.renderLabels();
        me.renderCallouts();
    },

    // @private draws the markers for the lines (if any).
    drawMarkers: function() {
        var me = this,
            chart = me.chart,
            surface = chart.surface,
            markerStyle = Ext.apply({}, me.markerStyle || {}),
            endMarkerStyle = Ext.apply(markerStyle, me.markerConfig, {
                fill: me.colorArrayStyle[me.seriesIdx % me.colorArrayStyle.length]
            }),
            items = me.items,
            type = endMarkerStyle.type,
            markerGroup = me.markerGroup,
            centerX = me.centerX,
            centerY = me.centerY,
            item, i, l, marker;
        delete endMarkerStyle.type;

        for (i = 0, l = items.length; i < l; i++) {
            item = items[i];
            marker = markerGroup.getAt(i);
            if (!marker) {
                marker = Ext.chart.Shape[type](surface, Ext.apply({
                    group: markerGroup,
                    x: 0,
                    y: 0,
                    translate: {
                        x: centerX,
                        y: centerY
                    }
                }, endMarkerStyle));
            }
            else {
                marker.show();
            }
            item.sprite = marker;
            if (chart.resizing) {
                marker.setAttributes({
                    x: 0,
                    y: 0,
                    translate: {
                        x: centerX,
                        y: centerY
                    }
                }, true);
            }
            marker._to = {
                translate: {
                    x: item.point[0],
                    y: item.point[1]
                }
            };
            //render/animate
            if (chart.animate) {
                me.onAnimate(marker, {
                    to: marker._to
                });
            }
            else {
                marker.setAttributes(Ext.apply(marker._to, endMarkerStyle || {}), true);
            }
        }
    },

    isItemInPoint: function(x, y, item) {
        var point,
            tolerance = 10,
            abs = Math.abs;
        point = item.point;
        return (abs(point[0] - x) <= tolerance &&
                abs(point[1] - y) <= tolerance);
    },

    // @private callback for when creating a label sprite.
    onCreateLabel: function(storeItem, item, i, display) {
        var me = this,
            group = me.labelsGroup,
            config = me.label,
            centerX = me.centerX,
            centerY = me.centerY,
            point = item.point,
            endLabelStyle = Ext.apply(me.seriesLabelStyle || {}, config);

        return me.chart.surface.add(Ext.apply({
            'type': 'text',
            'text-anchor': 'middle',
            'group': group,
            'x': centerX,
            'y': centerY
        }, config || {}));
    },

    // @private callback for when placing a label sprite.
    onPlaceLabel: function(label, storeItem, item, i, display, animate) {
        var me = this,
            chart = me.chart,
            resizing = chart.resizing,
            config = me.label,
            format = config.renderer,
            field = config.field,
            centerX = me.centerX,
            centerY = me.centerY,
            opt = {
                x: item.point[0],
                y: item.point[1]
            },
            x = opt.x - centerX,
            y = opt.y - centerY;

        label.setAttributes({
            text: format(storeItem.get(field)),
            hidden: true
        },
        true);

        if (resizing) {
            label.setAttributes({
                x: centerX,
                y: centerY
            }, true);
        }

        if (animate) {
            label.show(true);
            me.onAnimate(label, {
                to: opt
            });
        } else {
            label.setAttributes(opt, true);
            label.show(true);
        }
    },

    // @private for toggling (show/hide) series.
    toggleAll: function(show) {
        var me = this,
            i, ln, shadow, shadows;
        if (!show) {
            Ext.chart.series.Radar.superclass.hideAll.call(me);
        }
        else {
            Ext.chart.series.Radar.superclass.showAll.call(me);
        }
        if (me.radar) {
            me.radar.setAttributes({
                hidden: !show
            }, true);
            //hide shadows too
            if (me.radar.shadows) {
                for (i = 0, shadows = me.radar.shadows, ln = shadows.length; i < ln; i++) {
                    shadow = shadows[i];
                    shadow.setAttributes({
                        hidden: !show
                    }, true);
                }
            }
        }
    },

    // @private hide all elements in the series.
    hideAll: function() {
        this.toggleAll(false);
        this.hideMarkers(0);
    },

    // @private show all elements in the series.
    showAll: function() {
        this.toggleAll(true);
    },

    // @private hide all markers that belong to `markerGroup`
    hideMarkers: function(index) {
        var me = this,
            count = me.markerGroup && me.markerGroup.getCount() || 0,
            i = index || 0;
        for (; i < count; i++) {
            me.markerGroup.getAt(i).hide(true);
        }
    }
});


/**
 * @class Ext.chart.series.Scatter
 * @extends Ext.chart.series.Cartesian
 *
 * Creates a Scatter Chart. The scatter plot is useful when trying to display more than two variables in the same visualization.
 * These variables can be mapped into x, y coordinates and also to an element's radius/size, color, etc.
 * As with all other series, the Scatter Series must be appended in the *series* Chart array configuration. See the Chart
 * documentation for more information on creating charts. A typical configuration object for the scatter could be:
 *
 *     @example
 *     var store = Ext.create('Ext.data.JsonStore', {
 *         fields: ['name', 'data1', 'data2', 'data3', 'data4', 'data5'],
 *         data: [
 *             { 'name': 'metric one',   'data1': 10, 'data2': 12, 'data3': 14, 'data4': 8,  'data5': 13 },
 *             { 'name': 'metric two',   'data1': 7,  'data2': 8,  'data3': 16, 'data4': 10, 'data5': 3  },
 *             { 'name': 'metric three', 'data1': 5,  'data2': 2,  'data3': 14, 'data4': 12, 'data5': 7  },
 *             { 'name': 'metric four',  'data1': 2,  'data2': 14, 'data3': 6,  'data4': 1,  'data5': 23 },
 *             { 'name': 'metric five',  'data1': 27, 'data2': 38, 'data3': 36, 'data4': 13, 'data5': 33 }
 *         ]
 *     });
 *
 *     Ext.create('Ext.chart.Chart', {
 *         renderTo: Ext.getBody(),
 *         width: 500,
 *         height: 300,
 *         animate: true,
 *         theme:'Category2',
 *         store: store,
 *         axes: [{
 *             type: 'Numeric',
 *             position: 'left',
 *             fields: ['data2', 'data3'],
 *             title: 'Sample Values',
 *             grid: true,
 *             minimum: 0
 *         }, {
 *             type: 'Category',
 *             position: 'bottom',
 *             fields: ['name'],
 *             title: 'Sample Metrics'
 *         }],
 *         series: [{
 *             type: 'scatter',
 *             markerConfig: {
 *                 radius: 5,
 *                 size: 5
 *             },
 *             axis: 'left',
 *             xField: 'name',
 *             yField: 'data2'
 *         }, {
 *             type: 'scatter',
 *             markerConfig: {
 *                 radius: 5,
 *                 size: 5
 *             },
 *             axis: 'left',
 *             xField: 'name',
 *             yField: 'data3'
 *         }]
 *     });
 *
 * In this configuration we add three different categories of scatter series. Each of them is bound to a different field of the same data store,
 * `data1`, `data2` and `data3` respectively. All x-fields for the series must be the same field, in this case `name`.
 * Each scatter series has a different styling configuration for markers, specified by the `markerConfig` object. Finally we set the left axis as
 * axis to show the current values of the elements.
 *
 * @xtype scatter
 */
Ext.define('Ext.chart.series.Scatter', {

    /* Begin Definitions */

    extend: 'Ext.chart.series.Cartesian',

    requires: ['Ext.chart.axis.Axis', 'Ext.chart.Shape', 'Ext.fx.Anim'],

    /* End Definitions */

    type: 'scatter',
    alias: 'series.scatter',

    /**
     * @cfg {Object} markerConfig
     * The display style for the scatter series markers.
     */

    /**
     * @cfg {Object} style
     * Append styling properties to this object for it to override theme properties.
     */
    
    /**
     * @cfg {String/Array} axis
     * The position of the axis to bind the values to. Possible values are 'left', 'bottom', 'top' and 'right'.
     * You must explicitly set this value to bind the values of the line series to the ones in the axis, otherwise a
     * relative scale will be used. If multiple axes are being used, they should both be specified in in the configuration.
     */

    constructor: function(config) {
        this.callParent(arguments);
        var me = this,
            shadow = me.chart.shadow,
            surface = me.chart.surface, i, l;
        Ext.apply(me, config, {
            style: {},
            markerConfig: {},
            shadowAttributes: [{
                "stroke-width": 6,
                "stroke-opacity": 0.05,
                stroke: 'rgb(0, 0, 0)'
            }, {
                "stroke-width": 4,
                "stroke-opacity": 0.1,
                stroke: 'rgb(0, 0, 0)'
            }, {
                "stroke-width": 2,
                "stroke-opacity": 0.15,
                stroke: 'rgb(0, 0, 0)'
            }]
        });
        me.group = surface.getGroup(me.seriesId);
        if (shadow) {
            for (i = 0, l = me.shadowAttributes.length; i < l; i++) {
                me.shadowGroups.push(surface.getGroup(me.seriesId + '-shadows' + i));
            }
        }
    },

    // @private Get chart and data boundaries
    getBounds: function() {
        var me = this,
            chart = me.chart,
            store = chart.getChartStore(),
            chartAxes = chart.axes,
            boundAxes = me.getAxesForXAndYFields(),
            boundXAxis = boundAxes.xAxis,
            boundYAxis = boundAxes.yAxis,
            bbox, xScale, yScale, ln, minX, minY, maxX, maxY, i, axis, ends;

        me.setBBox();
        bbox = me.bbox;

        if (axis = chartAxes.get(boundXAxis)) {
            ends = axis.applyData();
            minX = ends.from;
            maxX = ends.to;
        }

        if (axis = chartAxes.get(boundYAxis)) {
            ends = axis.applyData();
            minY = ends.from;
            maxY = ends.to;
        }

        // If a field was specified without a corresponding axis, create one to get bounds
        if (me.xField && !Ext.isNumber(minX)) {
            axis = me.getMinMaxXValues();
            minX = axis[0];
            maxX = axis[1];
        }

        if (me.yField && !Ext.isNumber(minY)) {
            axis = me.getMinMaxYValues();
            minY = axis[0];
            maxY = axis[1];
        }

        if (isNaN(minX)) {
            minX = 0;
            maxX = store.getCount() - 1;
            xScale = bbox.width / (store.getCount() - 1);
        }
        else {
            xScale = bbox.width / (maxX - minX);
        }

        if (isNaN(minY)) {
            minY = 0;
            maxY = store.getCount() - 1;
            yScale = bbox.height / (store.getCount() - 1);
        }
        else {
            yScale = bbox.height / (maxY - minY);
        }

        return {
            bbox: bbox,
            minX: minX,
            minY: minY,
            xScale: xScale,
            yScale: yScale
        };
    },

    // @private Build an array of paths for the chart
    getPaths: function() {
        var me = this,
            chart = me.chart,
            enableShadows = chart.shadow,
            store = chart.getChartStore(),
            data = store.data.items,
            i, ln, record,
            group = me.group,
            bounds = me.bounds = me.getBounds(),
            bbox = me.bbox,
            xScale = bounds.xScale,
            yScale = bounds.yScale,
            minX = bounds.minX,
            minY = bounds.minY,
            boxX = bbox.x,
            boxY = bbox.y,
            boxHeight = bbox.height,
            items = me.items = [],
            attrs = [],
            x, y, xValue, yValue, sprite;

        for (i = 0, ln = data.length; i < ln; i++) {
            record = data[i];
            xValue = record.get(me.xField);
            yValue = record.get(me.yField);
            //skip undefined or null values
            if (typeof yValue == 'undefined' || (typeof yValue == 'string' && !yValue)
                || xValue == null || yValue == null) {
                if (Ext.isDefined(Ext.global.console)) {
                    Ext.global.console.warn("[Ext.chart.series.Scatter]  Skipping a store element with a value which is either undefined or null  at ", record, xValue, yValue);
                }
                continue;
            }
            // Ensure a value
            if (typeof xValue == 'string' || typeof xValue == 'object' && !Ext.isDate(xValue)) {
                xValue = i;
            }
            if (typeof yValue == 'string' || typeof yValue == 'object' && !Ext.isDate(yValue)) {
                yValue = i;
            }
            x = boxX + (xValue - minX) * xScale;
            y = boxY + boxHeight - (yValue - minY) * yScale;
            attrs.push({
                x: x,
                y: y
            });

            me.items.push({
                series: me,
                value: [xValue, yValue],
                point: [x, y],
                storeItem: record
            });

            // When resizing, reset before animating
            if (chart.animate && chart.resizing) {
                sprite = group.getAt(i);
                if (sprite) {
                    me.resetPoint(sprite);
                    if (enableShadows) {
                        me.resetShadow(sprite);
                    }
                }
            }
        }
        return attrs;
    },

    // @private translate point to the center
    resetPoint: function(sprite) {
        var bbox = this.bbox;
        sprite.setAttributes({
            translate: {
                x: (bbox.x + bbox.width) / 2,
                y: (bbox.y + bbox.height) / 2
            }
        }, true);
    },

    // @private translate shadows of a sprite to the center
    resetShadow: function(sprite) {
        var me = this,
            shadows = sprite.shadows,
            shadowAttributes = me.shadowAttributes,
            ln = me.shadowGroups.length,
            bbox = me.bbox,
            i, attr;
        for (i = 0; i < ln; i++) {
            attr = Ext.apply({}, shadowAttributes[i]);
            // TODO: fix this with setAttributes
            if (attr.translate) {
                attr.translate.x += (bbox.x + bbox.width) / 2;
                attr.translate.y += (bbox.y + bbox.height) / 2;
            }
            else {
                attr.translate = {
                    x: (bbox.x + bbox.width) / 2,
                    y: (bbox.y + bbox.height) / 2
                };
            }
            shadows[i].setAttributes(attr, true);
        }
    },

    // @private create a new point
    createPoint: function(attr, type) {
        var me = this,
            chart = me.chart,
            group = me.group,
            bbox = me.bbox;

        return Ext.chart.Shape[type](chart.surface, Ext.apply({}, {
            x: 0,
            y: 0,
            group: group,
            translate: {
                x: (bbox.x + bbox.width) / 2,
                y: (bbox.y + bbox.height) / 2
            }
        }, attr));
    },

    // @private create a new set of shadows for a sprite
    createShadow: function(sprite, endMarkerStyle, type) {
        var me = this,
            chart = me.chart,
            shadowGroups = me.shadowGroups,
            shadowAttributes = me.shadowAttributes,
            lnsh = shadowGroups.length,
            bbox = me.bbox,
            i, shadow, shadows, attr;

        sprite.shadows = shadows = [];

        for (i = 0; i < lnsh; i++) {
            attr = Ext.apply({}, shadowAttributes[i]);
            if (attr.translate) {
                attr.translate.x += (bbox.x + bbox.width) / 2;
                attr.translate.y += (bbox.y + bbox.height) / 2;
            }
            else {
                Ext.apply(attr, {
                    translate: {
                        x: (bbox.x + bbox.width) / 2,
                        y: (bbox.y + bbox.height) / 2
                    }
                });
            }
            Ext.apply(attr, endMarkerStyle);
            shadow = Ext.chart.Shape[type](chart.surface, Ext.apply({}, {
                x: 0,
                y: 0,
                group: shadowGroups[i]
            }, attr));
            shadows.push(shadow);
        }
    },

    /**
     * Draws the series for the current chart.
     */
    drawSeries: function() {
        var me = this,
            chart = me.chart,
            store = chart.getChartStore(),
            group = me.group,
            enableShadows = chart.shadow,
            shadowGroups = me.shadowGroups,
            shadowAttributes = me.shadowAttributes,
            lnsh = shadowGroups.length,
            sprite, attrs, attr, ln, i, endMarkerStyle, shindex, type, shadows,
            rendererAttributes, shadowAttribute;

        endMarkerStyle = Ext.apply(me.markerStyle, me.markerConfig);
        type = endMarkerStyle.type;
        delete endMarkerStyle.type;

        //if the store is empty then there's nothing to be rendered
        if (!store || !store.getCount()) {
            me.hide();
            me.items = [];
            return;
        }


        me.unHighlightItem();
        me.cleanHighlights();

        attrs = me.getPaths();
        ln = attrs.length;
        for (i = 0; i < ln; i++) {
            attr = attrs[i];
            sprite = group.getAt(i);
            Ext.apply(attr, endMarkerStyle);

            // Create a new sprite if needed (no height)
            if (!sprite) {
                sprite = me.createPoint(attr, type);
                if (enableShadows) {
                    me.createShadow(sprite, endMarkerStyle, type);
                }
            }

            shadows = sprite.shadows;
            if (chart.animate) {
                rendererAttributes = me.renderer(sprite, store.getAt(i), { translate: attr }, i, store);
                sprite._to = rendererAttributes;
                me.onAnimate(sprite, {
                    to: rendererAttributes
                });
                //animate shadows
                for (shindex = 0; shindex < lnsh; shindex++) {
                    shadowAttribute = Ext.apply({}, shadowAttributes[shindex]);
                    rendererAttributes = me.renderer(shadows[shindex], store.getAt(i), Ext.apply({}, { 
                        hidden: false,
                        translate: {
                            x: attr.x + (shadowAttribute.translate? shadowAttribute.translate.x : 0),
                            y: attr.y + (shadowAttribute.translate? shadowAttribute.translate.y : 0)
                        }
                    }, shadowAttribute), i, store);
                    me.onAnimate(shadows[shindex], { to: rendererAttributes });
                }
            }
            else {
                rendererAttributes = me.renderer(sprite, store.getAt(i), { translate: attr }, i, store);
                sprite._to = rendererAttributes;
                sprite.setAttributes(rendererAttributes, true);
                //animate shadows
                for (shindex = 0; shindex < lnsh; shindex++) {
                    shadowAttribute = Ext.apply({}, shadowAttributes[shindex]);
                    rendererAttributes = me.renderer(shadows[shindex], store.getAt(i), Ext.apply({}, { 
                        hidden: false,
                        translate: {
                            x: attr.x + (shadowAttribute.translate? shadowAttribute.translate.x : 0),
                            y: attr.y + (shadowAttribute.translate? shadowAttribute.translate.y : 0)
                        } 
                    }, shadowAttribute), i, store);
                    shadows[shindex].setAttributes(rendererAttributes, true);
                }
            }
            me.items[i].sprite = sprite;
        }

        // Hide unused sprites
        ln = group.getCount();
        for (i = attrs.length; i < ln; i++) {
            group.getAt(i).hide(true);
        }
        me.renderLabels();
        me.renderCallouts();
    },

    // @private callback for when creating a label sprite.
    onCreateLabel: function(storeItem, item, i, display) {
        var me = this,
            group = me.labelsGroup,
            config = me.label,
            endLabelStyle = Ext.apply({}, config, me.seriesLabelStyle),
            bbox = me.bbox;

        return me.chart.surface.add(Ext.apply({
            type: 'text',
            group: group,
            x: item.point[0],
            y: bbox.y + bbox.height / 2
        }, endLabelStyle));
    },

    // @private callback for when placing a label sprite.
    onPlaceLabel: function(label, storeItem, item, i, display, animate) {
        var me = this,
            chart = me.chart,
            resizing = chart.resizing,
            config = me.label,
            format = config.renderer,
            field = config.field,
            bbox = me.bbox,
            x = item.point[0],
            y = item.point[1],
            radius = item.sprite.attr.radius,
            bb, width, height, anim;

        label.setAttributes({
            text: format(storeItem.get(field)),
            hidden: true
        }, true);

        if (display == 'rotate') {
            label.setAttributes({
                'text-anchor': 'start',
                'rotation': {
                    x: x,
                    y: y,
                    degrees: -45
                }
            }, true);
            //correct label position to fit into the box
            bb = label.getBBox();
            width = bb.width;
            height = bb.height;
            x = x < bbox.x? bbox.x : x;
            x = (x + width > bbox.x + bbox.width)? (x - (x + width - bbox.x - bbox.width)) : x;
            y = (y - height < bbox.y)? bbox.y + height : y;

        } else if (display == 'under' || display == 'over') {
            //TODO(nicolas): find out why width/height values in circle bounding boxes are undefined.
            bb = item.sprite.getBBox();
            bb.width = bb.width || (radius * 2);
            bb.height = bb.height || (radius * 2);
            y = y + (display == 'over'? -bb.height : bb.height);
            //correct label position to fit into the box
            bb = label.getBBox();
            width = bb.width/2;
            height = bb.height/2;
            x = x - width < bbox.x ? bbox.x + width : x;
            x = (x + width > bbox.x + bbox.width) ? (x - (x + width - bbox.x - bbox.width)) : x;
            y = y - height < bbox.y? bbox.y + height : y;
            y = (y + height > bbox.y + bbox.height) ? (y - (y + height - bbox.y - bbox.height)) : y;
        }

        if (!chart.animate) {
            label.setAttributes({
                x: x,
                y: y
            }, true);
            label.show(true);
        }
        else {
            if (resizing) {
                anim = item.sprite.getActiveAnimation();
                if (anim) {
                    anim.on('afteranimate', function() {
                        label.setAttributes({
                            x: x,
                            y: y
                        }, true);
                        label.show(true);
                    });
                }
                else {
                    label.show(true);
                }
            }
            else {
                me.onAnimate(label, {
                    to: {
                        x: x,
                        y: y
                    }
                });
            }
        }
    },

    // @private callback for when placing a callout sprite.
    onPlaceCallout: function(callout, storeItem, item, i, display, animate, index) {
        var me = this,
            chart = me.chart,
            surface = chart.surface,
            resizing = chart.resizing,
            config = me.callouts,
            items = me.items,
            cur = item.point,
            normal,
            bbox = callout.label.getBBox(),
            offsetFromViz = 30,
            offsetToSide = 10,
            offsetBox = 3,
            boxx, boxy, boxw, boxh,
            p, clipRect = me.bbox,
            x, y;

        //position
        normal = [Math.cos(Math.PI /4), -Math.sin(Math.PI /4)];
        x = cur[0] + normal[0] * offsetFromViz;
        y = cur[1] + normal[1] * offsetFromViz;

        //box position and dimensions
        boxx = x + (normal[0] > 0? 0 : -(bbox.width + 2 * offsetBox));
        boxy = y - bbox.height /2 - offsetBox;
        boxw = bbox.width + 2 * offsetBox;
        boxh = bbox.height + 2 * offsetBox;

        //now check if we're out of bounds and invert the normal vector correspondingly
        //this may add new overlaps between labels (but labels won't be out of bounds).
        if (boxx < clipRect[0] || (boxx + boxw) > (clipRect[0] + clipRect[2])) {
            normal[0] *= -1;
        }
        if (boxy < clipRect[1] || (boxy + boxh) > (clipRect[1] + clipRect[3])) {
            normal[1] *= -1;
        }

        //update positions
        x = cur[0] + normal[0] * offsetFromViz;
        y = cur[1] + normal[1] * offsetFromViz;

        //update box position and dimensions
        boxx = x + (normal[0] > 0? 0 : -(bbox.width + 2 * offsetBox));
        boxy = y - bbox.height /2 - offsetBox;
        boxw = bbox.width + 2 * offsetBox;
        boxh = bbox.height + 2 * offsetBox;

        if (chart.animate) {
            //set the line from the middle of the pie to the box.
            me.onAnimate(callout.lines, {
                to: {
                    path: ["M", cur[0], cur[1], "L", x, y, "Z"]
                }
            }, true);
            //set box position
            me.onAnimate(callout.box, {
                to: {
                    x: boxx,
                    y: boxy,
                    width: boxw,
                    height: boxh
                }
            }, true);
            //set text position
            me.onAnimate(callout.label, {
                to: {
                    x: x + (normal[0] > 0? offsetBox : -(bbox.width + offsetBox)),
                    y: y
                }
            }, true);
        } else {
            //set the line from the middle of the pie to the box.
            callout.lines.setAttributes({
                path: ["M", cur[0], cur[1], "L", x, y, "Z"]
            }, true);
            //set box position
            callout.box.setAttributes({
                x: boxx,
                y: boxy,
                width: boxw,
                height: boxh
            }, true);
            //set text position
            callout.label.setAttributes({
                x: x + (normal[0] > 0? offsetBox : -(bbox.width + offsetBox)),
                y: y
            }, true);
        }
        for (p in callout) {
            callout[p].show(true);
        }
    },

    // @private handles sprite animation for the series.
    onAnimate: function(sprite, attr) {
        sprite.show();
        return this.callParent(arguments);
    },

    isItemInPoint: function(x, y, item) {
        var point,
            tolerance = 10,
            abs = Math.abs;

        function dist(point) {
            var dx = abs(point[0] - x),
                dy = abs(point[1] - y);
            return Math.sqrt(dx * dx + dy * dy);
        }
        point = item.point;
        return (point[0] - tolerance <= x && point[0] + tolerance >= x &&
            point[1] - tolerance <= y && point[1] + tolerance >= y);
    }
});

