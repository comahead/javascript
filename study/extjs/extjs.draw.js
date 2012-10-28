
/**
 * A composite Sprite handles a group of sprites with common methods to a sprite
 * such as `hide`, `show`, `setAttributes`. These methods are applied to the set of sprites
 * added to the group.
 *
 * CompositeSprite extends {@link Ext.util.MixedCollection} so you can use the same methods
 * in `MixedCollection` to iterate through sprites, add and remove elements, etc.
 *
 * In order to create a CompositeSprite, one has to provide a handle to the surface where it is
 * rendered:
 *
 *     var group = Ext.create('Ext.draw.CompositeSprite', {
 *         surface: drawComponent.surface
 *     });
 *                  
 * Then just by using `MixedCollection` methods it's possible to add {@link Ext.draw.Sprite}s:
 *  
 *     group.add(sprite1);
 *     group.add(sprite2);
 *     group.add(sprite3);
 *                  
 * And then apply common Sprite methods to them:
 *  
 *     group.setAttributes({
 *         fill: '#f00'
 *     }, true);
 */
Ext.define('Ext.draw.CompositeSprite', {

    /* Begin Definitions */

    extend: 'Ext.util.MixedCollection',
    mixins: {
        animate: 'Ext.util.Animate'
    },
    autoDestroy: false,
    
    /* End Definitions */
    isCompositeSprite: true,
    constructor: function(config) {
        var me = this;
        
        config = config || {};
        Ext.apply(me, config);

        me.addEvents(
            /**
             * @event
             * @inheritdoc Ext.draw.Sprite#mousedown
             */
            'mousedown',
            /**
             * @event
             * @inheritdoc Ext.draw.Sprite#mouseup
             */
            'mouseup',
            /**
             * @event
             * @inheritdoc Ext.draw.Sprite#mouseover
             */
            'mouseover',
            /**
             * @event
             * @inheritdoc Ext.draw.Sprite#mouseout
             */
            'mouseout',
            /**
             * @event
             * @inheritdoc Ext.draw.Sprite#click
             */
            'click'
        );
        me.id = Ext.id(null, 'ext-sprite-group-');
        me.callParent();
    },

    // @private
    onClick: function(e) {
        this.fireEvent('click', e);
    },

    // @private
    onMouseUp: function(e) {
        this.fireEvent('mouseup', e);
    },

    // @private
    onMouseDown: function(e) {
        this.fireEvent('mousedown', e);
    },

    // @private
    onMouseOver: function(e) {
        this.fireEvent('mouseover', e);
    },

    // @private
    onMouseOut: function(e) {
        this.fireEvent('mouseout', e);
    },

    attachEvents: function(o) {
        var me = this;
        
        o.on({
            scope: me,
            mousedown: me.onMouseDown,
            mouseup: me.onMouseUp,
            mouseover: me.onMouseOver,
            mouseout: me.onMouseOut,
            click: me.onClick
        });
    },

    // Inherit docs from MixedCollection
    add: function(key, o) {
        var result = this.callParent(arguments);
        this.attachEvents(result);
        return result;
    },

    insert: function(index, key, o) {
        return this.callParent(arguments);
    },

    // Inherit docs from MixedCollection
    remove: function(o) {
        var me = this;
        
        o.un({
            scope: me,
            mousedown: me.onMouseDown,
            mouseup: me.onMouseUp,
            mouseover: me.onMouseOver,
            mouseout: me.onMouseOut,
            click: me.onClick
        });
        return me.callParent(arguments);
    },
    
    /**
     * Returns the group bounding box.
     * Behaves like {@link Ext.draw.Sprite#getBBox} method.
     * @return {Object} an object with x, y, width, and height properties.
     */
    getBBox: function() {
        var i = 0,
            sprite,
            bb,
            items = this.items,
            len = this.length,
            infinity = Infinity,
            minX = infinity,
            maxHeight = -infinity,
            minY = infinity,
            maxWidth = -infinity,
            maxWidthBBox, maxHeightBBox;
        
        for (; i < len; i++) {
            sprite = items[i];
            if (sprite.el && ! sprite.bboxExcluded) {
                bb = sprite.getBBox();
                minX = Math.min(minX, bb.x);
                minY = Math.min(minY, bb.y);
                maxHeight = Math.max(maxHeight, bb.height + bb.y);
                maxWidth = Math.max(maxWidth, bb.width + bb.x);
            }
        }
        
        return {
            x: minX,
            y: minY,
            height: maxHeight - minY,
            width: maxWidth - minX
        };
    },

    /**
     * Iterates through all sprites calling `setAttributes` on each one. For more information {@link Ext.draw.Sprite}
     * provides a description of the attributes that can be set with this method.
     * @param {Object} attrs Attributes to be changed on the sprite.
     * @param {Boolean} redraw Flag to immediately draw the change.
     * @return {Ext.draw.CompositeSprite} this
     */
    setAttributes: function(attrs, redraw) {
        var i = 0,
            items = this.items,
            len = this.length;
            
        for (; i < len; i++) {
            items[i].setAttributes(attrs, redraw);
        }
        return this;
    },

    /**
     * Hides all sprites. If `true` is passed then a redraw will be forced for each sprite.
     * @param {Boolean} redraw Flag to immediately draw the change.
     * @return {Ext.draw.CompositeSprite} this
     */
    hide: function(redraw) {
        var i = 0,
            items = this.items,
            len = this.length;
            
        for (; i < len; i++) {
            items[i].hide(redraw);
        }
        return this;
    },

    /**
     * Shows all sprites. If `true` is passed then a redraw will be forced for each sprite.
     * @param {Boolean} redraw Flag to immediately draw the change.
     * @return {Ext.draw.CompositeSprite} this
     */
    show: function(redraw) {
        var i = 0,
            items = this.items,
            len = this.length;
            
        for (; i < len; i++) {
            items[i].show(redraw);
        }
        return this;
    },

    /**
     * Force redraw of all sprites.
     */
    redraw: function() {
        var me = this,
            i = 0,
            items = me.items,
            surface = me.getSurface(),
            len = me.length;
        
        if (surface) {
            for (; i < len; i++) {
                surface.renderItem(items[i]);
            }
        }
        return me;
    },

    /**
     * Sets style for all sprites.
     * @param {String} style CSS Style definition.
     */
    setStyle: function(obj) {
        var i = 0,
            items = this.items,
            len = this.length,
            item, el;
            
        for (; i < len; i++) {
            item = items[i];
            el = item.el;
            if (el) {
                el.setStyle(obj);
            }
        }
    },

    /**
     * Adds class to all sprites.
     * @param {String} cls CSS class name
     */
    addCls: function(obj) {
        var i = 0,
            items = this.items,
            surface = this.getSurface(),
            len = this.length;
        
        if (surface) {
            for (; i < len; i++) {
                surface.addCls(items[i], obj);
            }
        }
    },

    /**
     * Removes class from all sprites.
     * @param {String} cls CSS class name
     */
    removeCls: function(obj) {
        var i = 0,
            items = this.items,
            surface = this.getSurface(),
            len = this.length;
        
        if (surface) {
            for (; i < len; i++) {
                surface.removeCls(items[i], obj);
            }
        }
    },
    
    /**
     * Grab the surface from the items
     * @private
     * @return {Ext.draw.Surface} The surface, null if not found
     */
    getSurface: function(){
        var first = this.first();
        if (first) {
            return first.surface;
        }
        return null;
    },
    
    /**
     * Destroys this CompositeSprite.
     */
    destroy: function(){
        var me = this,
            surface = me.getSurface(),
            destroySprites = me.autoDestroy,
            item;
            
        if (surface) {
            while (me.getCount() > 0) {
                item = me.first();
                me.remove(item);
                surface.remove(item, destroySprites);
            }
        }
        me.clearListeners();
    }
});



/**
 * A Surface is an interface to render methods inside {@link Ext.draw.Component}.
 *
 * Most of the Surface methods are abstract and they have a concrete implementation
 * in {@link Ext.draw.engine.Vml VML} or {@link Ext.draw.engine.Svg SVG} engines.
 *
 * A Surface contains methods to render {@link Ext.draw.Sprite sprites}, get bounding
 * boxes of sprites, add sprites to the canvas, initialize other graphic components, etc.
 *
 * ## Adding sprites to surface
 *
 * One of the most used methods for this class is the {@link #add} method, to add Sprites to
 * the surface. For example:
 *
 *     drawComponent.surface.add({
 *         type: 'circle',
 *         fill: '#ffc',
 *         radius: 100,
 *         x: 100,
 *         y: 100
 *     });
 *
 * The configuration object passed in the `add` method is the same as described in the
 * {@link Ext.draw.Sprite} class documentation.
 *
 * Sprites can also be added to surface by setting their surface config at creation time:
 *
 *     var sprite = Ext.create('Ext.draw.Sprite', {
 *         type: 'circle',
 *         fill: '#ff0',
 *         surface: drawComponent.surface,
 *         radius: 5
 *     });
 *
 * In order to properly apply properties and render the sprite we have to
 * `show` the sprite setting the option `redraw` to `true`:
 *
 *     sprite.show(true);
 *
 */
Ext.define('Ext.draw.Surface', {

    /* Begin Definitions */

    mixins: {
        observable: 'Ext.util.Observable'
    },

    requires: ['Ext.draw.CompositeSprite'],
    uses: ['Ext.draw.engine.Svg', 'Ext.draw.engine.Vml', 'Ext.draw.engine.SvgExporter', 'Ext.draw.engine.ImageExporter'],

    separatorRe: /[, ]+/,

    statics: {
        /**
         * Creates and returns a new concrete Surface instance appropriate for the current environment.
         * @param {Object} config Initial configuration for the Surface instance
         * @param {String[]} enginePriority (Optional) order of implementations to use; the first one that is
         * available in the current environment will be used. Defaults to `['Svg', 'Vml']`.
         * @return {Object} The created Surface or false.
         * @static
         */
        create: function(config, enginePriority) {
            enginePriority = enginePriority || ['Svg', 'Vml'];

            var i = 0,
                len = enginePriority.length,
                surfaceClass;

            for (; i < len; i++) {
                if (Ext.supports[enginePriority[i]] !== false) {
                    return Ext.create('Ext.draw.engine.' + enginePriority[i], config);
                }
            }
            return false;
        },
        
        /**
         * Exports a {@link Ext.draw.Surface surface} in a different format.
         * The surface may be exported to an SVG string, using the
         * {@link Ext.draw.engine.SvgExporter}. It may also be exported
         * as an image using the {@link Ext.draw.engine.ImageExporter ImageExporter}.
         * Note that this requires sending data to a remote server to process
         * the SVG into an image, see the {@link Ext.draw.engine.ImageExporter} for
         * more details.
         * @param {Ext.draw.Surface} surface The surface to export.
         * @param {Object} [config] The configuration to be passed to the exporter.
         * See the export method for the appropriate exporter for the relevant
         * configuration options
         * @return {Object} See the return types for the appropriate exporter
         * @static
         */
        save: function(surface, config) {
            config = config || {};
            var exportTypes = {
                    'image/png': 'Image',
                    'image/jpeg': 'Image',
                    'image/svg+xml': 'Svg'
                },
                prefix = exportTypes[config.type] || 'Svg',
                exporter = Ext.draw.engine[prefix + 'Exporter'];           

            return exporter.generate(surface, config);
            
        }
    },

    /* End Definitions */

    // @private
    availableAttrs: {
        blur: 0,
        "clip-rect": "0 0 1e9 1e9",
        cursor: "default",
        cx: 0,
        cy: 0,
        'dominant-baseline': 'auto',
        fill: "none",
        "fill-opacity": 1,
        font: '10px "Arial"',
        "font-family": '"Arial"',
        "font-size": "10",
        "font-style": "normal",
        "font-weight": 400,
        gradient: "",
        height: 0,
        hidden: false,
        href: "http://sencha.com/",
        opacity: 1,
        path: "M0,0",
        radius: 0,
        rx: 0,
        ry: 0,
        scale: "1 1",
        src: "",
        stroke: "none",
        "stroke-dasharray": "",
        "stroke-linecap": "butt",
        "stroke-linejoin": "butt",
        "stroke-miterlimit": 0,
        "stroke-opacity": 1,
        "stroke-width": 1,
        target: "_blank",
        text: "",
        "text-anchor": "middle",
        title: "Ext Draw",
        width: 0,
        x: 0,
        y: 0,
        zIndex: 0
    },

    /**
     * @cfg {Number} height
     * The height of this component in pixels (defaults to auto).
     */
    /**
     * @cfg {Number} width
     * The width of this component in pixels (defaults to auto).
     */

    container: undefined,
    height: 352,
    width: 512,
    x: 0,
    y: 0,

    /**
     * @cfg {Ext.draw.Sprite[]} items
     * Array of sprites or sprite config objects to add initially to the surface.
     */

    /**
     * @private Flag indicating that the surface implementation requires sprites to be maintained
     * in order of their zIndex. Impls that don't require this can set it to false.
     */
    orderSpritesByZIndex: true,


    /**
     * Creates new Surface.
     * @param {Object} config (optional) Config object.
     */
    constructor: function(config) {
        var me = this;
        config = config || {};
        Ext.apply(me, config);

        me.domRef = Ext.getDoc().dom;

        me.customAttributes = {};

        me.addEvents(
            /**
             * @event
             * Fires when a mousedown is detected within the surface.
             * @param {Ext.EventObject} e An object encapsulating the DOM event.
             */
            'mousedown',
            /**
             * @event
             * Fires when a mouseup is detected within the surface.
             * @param {Ext.EventObject} e An object encapsulating the DOM event.
             */
            'mouseup',
            /**
             * @event
             * Fires when a mouseover is detected within the surface.
             * @param {Ext.EventObject} e An object encapsulating the DOM event.
             */
            'mouseover',
            /**
             * @event
             * Fires when a mouseout is detected within the surface.
             * @param {Ext.EventObject} e An object encapsulating the DOM event.
             */
            'mouseout',
            /**
             * @event
             * Fires when a mousemove is detected within the surface.
             * @param {Ext.EventObject} e An object encapsulating the DOM event.
             */
            'mousemove',
            /**
             * @event
             * Fires when a mouseenter is detected within the surface.
             * @param {Ext.EventObject} e An object encapsulating the DOM event.
             */
            'mouseenter',
            /**
             * @event
             * Fires when a mouseleave is detected within the surface.
             * @param {Ext.EventObject} e An object encapsulating the DOM event.
             */
            'mouseleave',
            /**
             * @event
             * Fires when a click is detected within the surface.
             * @param {Ext.EventObject} e An object encapsulating the DOM event.
             */
            'click',
            /**
             * @event
             * Fires when a dblclick is detected within the surface.
             * @param {Ext.EventObject} e An object encapsulating the DOM event.
             */
            'dblclick'
        );

        me.mixins.observable.constructor.call(me);

        me.getId();
        me.initGradients();
        me.initItems();
        if (me.renderTo) {
            me.render(me.renderTo);
            delete me.renderTo;
        }
        me.initBackground(config.background);
    },

    // @private called to initialize components in the surface
    // this is dependent on the underlying implementation.
    initSurface: Ext.emptyFn,

    // @private called to setup the surface to render an item
    //this is dependent on the underlying implementation.
    renderItem: Ext.emptyFn,

    // @private
    renderItems: Ext.emptyFn,

    // @private
    setViewBox: function (x, y, width, height) {
        if (isFinite(x) && isFinite(y) && isFinite(width) && isFinite(height)) {
            this.viewBox = {x: x, y: y, width: width, height: height};
            this.applyViewBox();
        }
    },

    /**
     * Adds one or more CSS classes to the element. Duplicate classes are automatically filtered out.
     *
     * For example:
     *
     *     drawComponent.surface.addCls(sprite, 'x-visible');
     *
     * @param {Object} sprite The sprite to add the class to.
     * @param {String/String[]} className The CSS class to add, or an array of classes
     * @method
     */
    addCls: Ext.emptyFn,

    /**
     * Removes one or more CSS classes from the element.
     *
     * For example:
     *
     *     drawComponent.surface.removeCls(sprite, 'x-visible');
     *
     * @param {Object} sprite The sprite to remove the class from.
     * @param {String/String[]} className The CSS class to remove, or an array of classes
     * @method
     */
    removeCls: Ext.emptyFn,

    /**
     * Sets CSS style attributes to an element.
     *
     * For example:
     *
     *     drawComponent.surface.setStyle(sprite, {
     *         'cursor': 'pointer'
     *     });
     *
     * @param {Object} sprite The sprite to add, or an array of classes to
     * @param {Object} styles An Object with CSS styles.
     * @method
     */
    setStyle: Ext.emptyFn,

    // @private
    initGradients: function() {
        if (this.hasOwnProperty('gradients')) {
            var gradients = this.gradients,
                gLen      = gradients.length,
                fn        = this.addGradient,
                g;

            if (gradients) {
                for (g = 0; g < gLen; g++) {
                    if (fn.call(this, gradients[g], g, gLen) === false) {
                        break;
                    }
                }
            }
        }
    },

    // @private
    initItems: function() {
        var items = this.items;
        this.items = new Ext.draw.CompositeSprite();
        this.items.autoDestroy = true;
        this.groups = new Ext.draw.CompositeSprite();
        if (items) {
            this.add(items);
        }
    },

    // @private
    initBackground: function(config) {
        var me = this,
            width = me.width,
            height = me.height,
            gradientId, gradient, backgroundSprite;
        if (Ext.isString(config)) {
            config = {
                fill : config
            };
        }
        if (config) {
            if (config.gradient) {
                gradient = config.gradient;
                gradientId = gradient.id;
                me.addGradient(gradient);
                me.background = me.add({
                    type: 'rect',
                    x: 0,
                    y: 0,
                    width: width,
                    height: height,
                    fill: 'url(#' + gradientId + ')',
                    zIndex: -1
                });
            } else if (config.fill) {
                me.background = me.add({
                    type: 'rect',
                    x: 0,
                    y: 0,
                    width: width,
                    height: height,
                    fill: config.fill,
                    zIndex: -1
                });
            } else if (config.image) {
                me.background = me.add({
                    type: 'image',
                    x: 0,
                    y: 0,
                    width: width,
                    height: height,
                    src: config.image,
                    zIndex: -1
                });
            }
            // prevent me.background to jeopardize me.items.getBBox
            me.background.bboxExcluded = true;
        }
    },

    /**
     * Sets the size of the surface. Accomodates the background (if any) to fit the new size too.
     *
     * For example:
     *
     *     drawComponent.surface.setSize(500, 500);
     *
     * This method is generally called when also setting the size of the draw Component.
     *
     * @param {Number} w The new width of the canvas.
     * @param {Number} h The new height of the canvas.
     */
    setSize: function(w, h) {
        this.applyViewBox();
    },

    // @private
    scrubAttrs: function(sprite) {
        var i,
            attrs = {},
            exclude = {},
            sattr = sprite.attr;
        for (i in sattr) {
            // Narrow down attributes to the main set
            if (this.translateAttrs.hasOwnProperty(i)) {
                // Translated attr
                attrs[this.translateAttrs[i]] = sattr[i];
                exclude[this.translateAttrs[i]] = true;
            }
            else if (this.availableAttrs.hasOwnProperty(i) && !exclude[i]) {
                // Passtrhough attr
                attrs[i] = sattr[i];
            }
        }
        return attrs;
    },

    // @private
    onClick: function(e) {
        this.processEvent('click', e);
    },
    
    // @private
    onDblClick: function(e) {
        this.processEvent('dblclick', e);
    },

    // @private
    onMouseUp: function(e) {
        this.processEvent('mouseup', e);
    },

    // @private
    onMouseDown: function(e) {
        this.processEvent('mousedown', e);
    },

    // @private
    onMouseOver: function(e) {
        this.processEvent('mouseover', e);
    },

    // @private
    onMouseOut: function(e) {
        this.processEvent('mouseout', e);
    },

    // @private
    onMouseMove: function(e) {
        this.fireEvent('mousemove', e);
    },

    // @private
    onMouseEnter: Ext.emptyFn,

    // @private
    onMouseLeave: Ext.emptyFn,

    /**
     * Adds a gradient definition to the Surface. Note that in some surface engines, adding
     * a gradient via this method will not take effect if the surface has already been rendered.
     * Therefore, it is preferred to pass the gradients as an item to the surface config, rather
     * than calling this method, especially if the surface is rendered immediately (e.g. due to
     * 'renderTo' in its config). For more information on how to create gradients in the Chart
     * configuration object please refer to {@link Ext.chart.Chart}.
     *
     * The gradient object to be passed into this method is composed by:
     *
     * - **id** - string - The unique name of the gradient.
     * - **angle** - number, optional - The angle of the gradient in degrees.
     * - **stops** - object - An object with numbers as keys (from 0 to 100) and style objects as values.
     *
     * For example:
     *
     *    drawComponent.surface.addGradient({
     *        id: 'gradientId',
     *        angle: 45,
     *        stops: {
     *            0: {
     *                color: '#555'
     *            },
     *            100: {
     *                color: '#ddd'
     *            }
     *        }
     *    });
     *
     * @param {Object} gradient A gradient config.
     * @method
     */
    addGradient: Ext.emptyFn,

    /**
     * Adds a Sprite to the surface. See {@link Ext.draw.Sprite} for the configuration object to be
     * passed into this method.
     *
     * For example:
     *
     *     drawComponent.surface.add({
     *         type: 'circle',
     *         fill: '#ffc',
     *         radius: 100,
     *         x: 100,
     *         y: 100
     *     });
     *
     * @param {Ext.draw.Sprite[]/Ext.draw.Sprite...} args One or more Sprite objects or configs.
     * @return {Ext.draw.Sprite[]/Ext.draw.Sprite} The sprites added.
     */
    add: function() {
        var args = Array.prototype.slice.call(arguments),
            sprite,
            index,
            hasMultipleArgs = args.length > 1,
            items,
            results,
            i,
            ln,
            item;
            
        if (hasMultipleArgs || Ext.isArray(args[0])) {
            items = hasMultipleArgs ? args : args[0];
            results = [];

            for (i = 0, ln = items.length; i < ln; i++) {
                item = items[i];
                item = this.add(item);
                results.push(item);
            }

            return results;
        }
        sprite = this.prepareItems(args[0], true)[0];
        this.insertByZIndex(sprite);
        this.onAdd(sprite);
        return sprite;
    },

    /**
     * @private
     * Inserts a given sprite into the correct position in the items collection, according to
     * its zIndex. It will be inserted at the end of an existing series of sprites with the same or
     * lower zIndex. By ensuring sprites are always ordered, this allows surface subclasses to render
     * the sprites in the correct order for proper z-index stacking.
     * @param {Ext.draw.Sprite} sprite
     * @return {Number} the sprite's new index in the list
     */
    insertByZIndex: function(sprite) {
        var me = this,
            sprites = me.items.items,
            len = sprites.length,
            ceil = Math.ceil,
            zIndex = sprite.attr.zIndex,
            idx = len,
            high = idx - 1,
            low = 0,
            otherZIndex;

        if (me.orderSpritesByZIndex && len && zIndex < sprites[high].attr.zIndex) {
            // Find the target index via a binary search for speed
            while (low <= high) {
                idx = ceil((low + high) / 2);
                otherZIndex = sprites[idx].attr.zIndex;
                if (otherZIndex > zIndex) {
                    high = idx - 1;
                }
                else if (otherZIndex < zIndex) {
                    low = idx + 1;
                }
                else {
                    break;
                }
            }
            // Step forward to the end of a sequence of the same or lower z-index
            while (idx < len && sprites[idx].attr.zIndex <= zIndex) {
                idx++;
            }
        }

        me.items.insert(idx, sprite);
        return idx;
    },

    onAdd: function(sprite) {
        var group = sprite.group,
            draggable = sprite.draggable,
            groups, ln, i;
        if (group) {
            groups = [].concat(group);
            ln = groups.length;
            for (i = 0; i < ln; i++) {
                group = groups[i];
                this.getGroup(group).add(sprite);
            }
            delete sprite.group;
        }
        if (draggable) {
            sprite.initDraggable();
        }
    },

    /**
     * Removes a given sprite from the surface, optionally destroying the sprite in the process.
     * You can also call the sprite own `remove` method.
     *
     * For example:
     *
     *     drawComponent.surface.remove(sprite);
     *     //or...
     *     sprite.remove();
     *
     * @param {Ext.draw.Sprite} sprite
     * @param {Boolean} destroySprite
     */
    remove: function(sprite, destroySprite) {
        if (sprite) {
            this.items.remove(sprite);

            var groups = [].concat(this.groups.items),
                gLen   = groups.length,
                g;

            for (g = 0; g < gLen; g++) {
                groups[g].remove(sprite);
            }

            sprite.onRemove();
            if (destroySprite === true) {
                sprite.destroy();
            }
        }
    },

    /**
     * Removes all sprites from the surface, optionally destroying the sprites in the process.
     *
     * For example:
     *
     *     drawComponent.surface.removeAll();
     *
     * @param {Boolean} destroySprites Whether to destroy all sprites when removing them.
     */
    removeAll: function(destroySprites) {
        var items = this.items.items,
            ln = items.length,
            i;
        for (i = ln - 1; i > -1; i--) {
            this.remove(items[i], destroySprites);
        }
    },

    onRemove: Ext.emptyFn,

    onDestroy: Ext.emptyFn,

    /**
     * @private Using the current viewBox property and the surface's width and height, calculate the
     * appropriate viewBoxShift that will be applied as a persistent transform to all sprites.
     */
    applyViewBox: function() {
        var me = this,
            viewBox = me.viewBox,
            width = me.width || 1, // Avoid problems in division
            height = me.height || 1,
            viewBoxX, viewBoxY, viewBoxWidth, viewBoxHeight,
            relativeHeight, relativeWidth, size;

        if (viewBox && (width || height)) {
            viewBoxX = viewBox.x;
            viewBoxY = viewBox.y;
            viewBoxWidth = viewBox.width;
            viewBoxHeight = viewBox.height;
            relativeHeight = height / viewBoxHeight;
            relativeWidth = width / viewBoxWidth;
            size = Math.min(relativeWidth, relativeHeight);

            if (viewBoxWidth * size < width) {
                viewBoxX -= (width - viewBoxWidth * size) / 2 / size;
            }
            if (viewBoxHeight * size < height) {
                viewBoxY -= (height - viewBoxHeight * size) / 2 / size;
            }

            me.viewBoxShift = {
                dx: -viewBoxX,
                dy: -viewBoxY,
                scale: size
            };
            
            if (me.background) {
                me.background.setAttributes(Ext.apply({}, {
                    x: viewBoxX,
                    y: viewBoxY,
                    width: width / size,
                    height: height / size
                }, { hidden: false }), true);
            }
        } else {
            if (me.background && width && height) {
                me.background.setAttributes(Ext.apply({x: 0, y: 0, width: width, height: height}, { hidden: false }), true);
            }
        }
    },


    getBBox: function (sprite, isWithoutTransform) {
        var realPath = this["getPath" + sprite.type](sprite);
        if (isWithoutTransform) {
            sprite.bbox.plain = sprite.bbox.plain || Ext.draw.Draw.pathDimensions(realPath);
            return sprite.bbox.plain;
        }
        if (sprite.dirtyTransform) {
            this.applyTransformations(sprite, true);
        }
        sprite.bbox.transform = sprite.bbox.transform || Ext.draw.Draw.pathDimensions(Ext.draw.Draw.mapPath(realPath, sprite.matrix));
        return sprite.bbox.transform;
    },
    
    transformToViewBox: function (x, y) {
        if (this.viewBoxShift) {
            var me = this, shift = me.viewBoxShift;
            return [x / shift.scale - shift.dx, y / shift.scale - shift.dy];
        } else {
            return [x, y];
        }
    },

    // @private
    applyTransformations: function(sprite, onlyMatrix) {
        if (sprite.type == 'text') {
            // TODO: getTextBBox function always take matrix into account no matter whether `isWithoutTransform` is true. Fix that.
            sprite.bbox.transform = 0;
            this.transform(sprite, false);
        }


        sprite.dirtyTransform = false;
        
        var me = this,
            attr = sprite.attr;

        if (attr.translation.x != null || attr.translation.y != null) {
            me.translate(sprite);
        }
        if (attr.scaling.x != null || attr.scaling.y != null) {
            me.scale(sprite);
        }
        if (attr.rotation.degrees != null) {
            me.rotate(sprite);
        }
        
        sprite.bbox.transform = 0;
        this.transform(sprite, onlyMatrix);
        sprite.transformations = [];
    },

    // @private
    rotate: function (sprite) {
        var bbox,
            deg = sprite.attr.rotation.degrees,
            centerX = sprite.attr.rotation.x,
            centerY = sprite.attr.rotation.y;
        if (!Ext.isNumber(centerX) || !Ext.isNumber(centerY)) {
            bbox = this.getBBox(sprite, true);
            centerX = !Ext.isNumber(centerX) ? bbox.x + bbox.width / 2 : centerX;
            centerY = !Ext.isNumber(centerY) ? bbox.y + bbox.height / 2 : centerY;
        }
        sprite.transformations.push({
            type: "rotate",
            degrees: deg,
            x: centerX,
            y: centerY
        });
    },

    // @private
    translate: function(sprite) {
        var x = sprite.attr.translation.x || 0,
            y = sprite.attr.translation.y || 0;
        sprite.transformations.push({
            type: "translate",
            x: x,
            y: y
        });
    },

    // @private
    scale: function(sprite) {
        var bbox,
            x = sprite.attr.scaling.x || 1,
            y = sprite.attr.scaling.y || 1,
            centerX = sprite.attr.scaling.centerX,
            centerY = sprite.attr.scaling.centerY;

        if (!Ext.isNumber(centerX) || !Ext.isNumber(centerY)) {
            bbox = this.getBBox(sprite, true);
            centerX = !Ext.isNumber(centerX) ? bbox.x + bbox.width / 2 : centerX;
            centerY = !Ext.isNumber(centerY) ? bbox.y + bbox.height / 2 : centerY;
        }
        sprite.transformations.push({
            type: "scale",
            x: x,
            y: y,
            centerX: centerX,
            centerY: centerY
        });
    },

    // @private
    rectPath: function (x, y, w, h, r) {
        if (r) {
            return [["M", x + r, y], ["l", w - r * 2, 0], ["a", r, r, 0, 0, 1, r, r], ["l", 0, h - r * 2], ["a", r, r, 0, 0, 1, -r, r], ["l", r * 2 - w, 0], ["a", r, r, 0, 0, 1, -r, -r], ["l", 0, r * 2 - h], ["a", r, r, 0, 0, 1, r, -r], ["z"]];
        }
        return [["M", x, y], ["l", w, 0], ["l", 0, h], ["l", -w, 0], ["z"]];
    },

    // @private
    ellipsePath: function (x, y, rx, ry) {
        if (ry == null) {
            ry = rx;
        }
        return [["M", x, y], ["m", 0, -ry], ["a", rx, ry, 0, 1, 1, 0, 2 * ry], ["a", rx, ry, 0, 1, 1, 0, -2 * ry], ["z"]];
    },

    // @private
    getPathpath: function (el) {
        return el.attr.path;
    },

    // @private
    getPathcircle: function (el) {
        var a = el.attr;
        return this.ellipsePath(a.x, a.y, a.radius, a.radius);
    },

    // @private
    getPathellipse: function (el) {
        var a = el.attr;
        return this.ellipsePath(a.x, a.y,
                                a.radiusX || (a.width / 2) || 0,
                                a.radiusY || (a.height / 2) || 0);
    },

    // @private
    getPathrect: function (el) {
        var a = el.attr;
        return this.rectPath(a.x || 0, a.y || 0, a.width || 0, a.height || 0, a.r || 0);
    },

    // @private
    getPathimage: function (el) {
        var a = el.attr;
        return this.rectPath(a.x || 0, a.y || 0, a.width, a.height);
    },

    // @private
    getPathtext: function (el) {
        var bbox = this.getBBoxText(el);
        return this.rectPath(bbox.x, bbox.y, bbox.width, bbox.height);
    },

    createGroup: function(id) {
        var group = this.groups.get(id);
        if (!group) {
            group = new Ext.draw.CompositeSprite({
                surface: this
            });
            group.id = id || Ext.id(null, 'ext-surface-group-');
            this.groups.add(group);
        }
        return group;
    },

    /**
     * Returns a new group or an existent group associated with the current surface.
     * The group returned is a {@link Ext.draw.CompositeSprite} group.
     *
     * For example:
     *
     *     var spriteGroup = drawComponent.surface.getGroup('someGroupId');
     *
     * @param {String} id The unique identifier of the group.
     * @return {Object} The {@link Ext.draw.CompositeSprite}.
     */
    getGroup: function(id) {
        var group;
        if (typeof id == "string") {
            group = this.groups.get(id);
            if (!group) {
                group = this.createGroup(id);
            }
        } else {
            group = id;
        }
        return group;
    },

    // @private
    prepareItems: function(items, applyDefaults) {
        items = [].concat(items);
        // Make sure defaults are applied and item is initialized
        var item, i, ln;
        for (i = 0, ln = items.length; i < ln; i++) {
            item = items[i];
            if (!(item instanceof Ext.draw.Sprite)) {
                // Temporary, just take in configs...
                item.surface = this;
                items[i] = this.createItem(item);
            } else {
                item.surface = this;
            }
        }
        return items;
    },

    /**
     * Changes the text in the sprite element. The sprite must be a `text` sprite.
     * This method can also be called from {@link Ext.draw.Sprite}.
     *
     * For example:
     *
     *     var spriteGroup = drawComponent.surface.setText(sprite, 'my new text');
     *
     * @param {Object} sprite The Sprite to change the text.
     * @param {String} text The new text to be set.
     * @method
     */
    setText: Ext.emptyFn,

    // @private Creates an item and appends it to the surface. Called
    // as an internal method when calling `add`.
    createItem: Ext.emptyFn,

    /**
     * Retrieves the id of this component.
     * Will autogenerate an id if one has not already been set.
     */
    getId: function() {
        return this.id || (this.id = Ext.id(null, 'ext-surface-'));
    },

    /**
     * Destroys the surface. This is done by removing all components from it and
     * also removing its reference to a DOM element.
     *
     * For example:
     *
     *      drawComponent.surface.destroy();
     */
    destroy: function() {
        var me = this;
        delete me.domRef;
        if (me.background) {
            me.background.destroy();
        }
        me.removeAll(true);
        Ext.destroy(me.groups.items);
    }
});




/**
 * The Draw Component is a surface in which sprites can be rendered. The Draw Component
 * manages and holds an {@link Ext.draw.Surface} instance where
 * {@link Ext.draw.Sprite Sprites} can be appended.
 *
 * One way to create a draw component is:
 *
 *     @example
 *     var drawComponent = Ext.create('Ext.draw.Component', {
 *         viewBox: false,
 *         items: [{
 *             type: 'circle',
 *             fill: '#79BB3F',
 *             radius: 100,
 *             x: 100,
 *             y: 100
 *         }]
 *     });
 *
 *     Ext.create('Ext.Window', {
 *         width: 215,
 *         height: 235,
 *         layout: 'fit',
 *         items: [drawComponent]
 *     }).show();
 *
 * In this case we created a draw component and added a {@link Ext.draw.Sprite sprite} to it.
 * The {@link Ext.draw.Sprite#type type} of the sprite is `circle` so if you run this code you'll see a yellow-ish
 * circle in a Window. When setting `viewBox` to `false` we are responsible for setting the object's position and
 * dimensions accordingly.
 *
 * You can also add sprites by using the surface's add method:
 *
 *     drawComponent.surface.add({
 *         type: 'circle',
 *         fill: '#79BB3F',
 *         radius: 100,
 *         x: 100,
 *         y: 100
 *     });
 *
 * ## Larger example
 *
 *     @example
 *     var drawComponent = Ext.create('Ext.draw.Component', {
 *         width: 800,
 *         height: 600,
 *         renderTo: document.body
 *     }), surface = drawComponent.surface;
 *
 *     surface.add([{
 *         type: 'circle',
 *         radius: 10,
 *         fill: '#f00',
 *         x: 10,
 *         y: 10,
 *         group: 'circles'
 *     }, {
 *         type: 'circle',
 *         radius: 10,
 *         fill: '#0f0',
 *         x: 50,
 *         y: 50,
 *         group: 'circles'
 *     }, {
 *         type: 'circle',
 *         radius: 10,
 *         fill: '#00f',
 *         x: 100,
 *         y: 100,
 *         group: 'circles'
 *     }, {
 *         type: 'rect',
 *         width: 20,
 *         height: 20,
 *         fill: '#f00',
 *         x: 10,
 *         y: 10,
 *         group: 'rectangles'
 *     }, {
 *         type: 'rect',
 *         width: 20,
 *         height: 20,
 *         fill: '#0f0',
 *         x: 50,
 *         y: 50,
 *         group: 'rectangles'
 *     }, {
 *         type: 'rect',
 *         width: 20,
 *         height: 20,
 *         fill: '#00f',
 *         x: 100,
 *         y: 100,
 *         group: 'rectangles'
 *     }]);
 *
 *     // Get references to my groups
 *     circles = surface.getGroup('circles');
 *     rectangles = surface.getGroup('rectangles');
 *
 *     // Animate the circles down
 *     circles.animate({
 *         duration: 1000,
 *         to: {
 *             translate: {
 *                 y: 200
 *             }
 *         }
 *     });
 *
 *     // Animate the rectangles across
 *     rectangles.animate({
 *         duration: 1000,
 *         to: {
 *             translate: {
 *                 x: 200
 *             }
 *         }
 *     });
 *
 * For more information on Sprites, the core elements added to a draw component's surface,
 * refer to the {@link Ext.draw.Sprite} documentation.
 */
Ext.define('Ext.draw.Component', {

    /* Begin Definitions */

    alias: 'widget.draw',

    extend: 'Ext.Component',

    requires: [
        'Ext.draw.Surface',
        'Ext.layout.component.Draw'
    ],

    /* End Definitions */

    /**
     * @cfg {String[]} enginePriority
     * Defines the priority order for which Surface implementation to use. The first
     * one supported by the current environment will be used.
     */
    enginePriority: ['Svg', 'Vml'],

    baseCls: Ext.baseCSSPrefix + 'surface',

    componentLayout: 'draw',

    /**
     * @cfg {Boolean} viewBox
     * Turn on view box support which will scale and position items in the draw component to fit to the component while
     * maintaining aspect ratio. Note that this scaling can override other sizing settings on your items.
     */
    viewBox: true,

    shrinkWrap: 3,
    
    /**
     * @cfg {Boolean} autoSize
     * Turn on autoSize support which will set the bounding div's size to the natural size of the contents.
     */
    autoSize: false,

    /**
     * @cfg {Object[]} gradients (optional) Define a set of gradients that can be used as `fill` property in sprites.
     * The gradients array is an array of objects with the following properties:
     *
     *  - `id` - string - The unique name of the gradient.
     *  - `angle` - number, optional - The angle of the gradient in degrees.
     *  - `stops` - object - An object with numbers as keys (from 0 to 100) and style objects as values
     *
     * ## Example
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
     * @cfg {Ext.draw.Sprite[]} items
     * Array of sprites or sprite config objects to add initially to the surface.
     */

    /**
     * @property {Ext.draw.Surface} surface
     * The Surface instance managed by this component.
     */

    initComponent: function() {
        this.callParent(arguments);

        this.addEvents(
            /**
             * @event
             * Event forwarded from {@link Ext.draw.Surface surface}.
             * @inheritdoc Ext.draw.Surface#mousedown
             */
            'mousedown',
            /**
             * @event
             * Event forwarded from {@link Ext.draw.Surface surface}.
             * @inheritdoc Ext.draw.Surface#mouseup
             */
            'mouseup',
            /**
             * @event
             * Event forwarded from {@link Ext.draw.Surface surface}.
             * @inheritdoc Ext.draw.Surface#mousemove
             */
            'mousemove',
            /**
             * @event
             * Event forwarded from {@link Ext.draw.Surface surface}.
             * @inheritdoc Ext.draw.Surface#mouseenter
             */
            'mouseenter',
            /**
             * @event
             * Event forwarded from {@link Ext.draw.Surface surface}.
             * @inheritdoc Ext.draw.Surface#mouseleave
             */
            'mouseleave',
            /**
             * @event
             * Event forwarded from {@link Ext.draw.Surface surface}.
             * @inheritdoc Ext.draw.Surface#click
             */
            'click',
            /**
             * @event
             * Event forwarded from {@link Ext.draw.Surface surface}.
             * @inheritdoc Ext.draw.Surface#dblclick
             */
            'dblclick'
        );
    },

    /**
     * @private
     *
     * Create the Surface on initial render
     */
    onRender: function() {
        var me = this,
            viewBox = me.viewBox,
            autoSize = me.autoSize,
            bbox, items, width, height, x, y;
        me.callParent(arguments);

        if (me.createSurface() !== false) {
            items = me.surface.items;

            if (viewBox || autoSize) {
                bbox = items.getBBox();
                width = bbox.width;
                height = bbox.height;
                x = bbox.x;
                y = bbox.y;
                if (me.viewBox) {
                    me.surface.setViewBox(x, y, width, height);
                } else {
                    me.autoSizeSurface();
                }
            }
        }
    },

    // @private
    autoSizeSurface: function() {
        var bbox = this.surface.items.getBBox();
        this.setSurfaceSize(bbox.width, bbox.height);
    },

    setSurfaceSize: function (width, height) {
        this.surface.setSize(width, height);
        if (this.autoSize) {
            var bbox = this.surface.items.getBBox();
            this.surface.setViewBox(bbox.x, bbox.y - (+Ext.isOpera), width, height);
        }
    },
    
    /**
     * Create the Surface instance. Resolves the correct Surface implementation to
     * instantiate based on the 'enginePriority' config. Once the Surface instance is
     * created you can use the handle to that instance to add sprites. For example:
     *
     *     drawComponent.surface.add(sprite);
     *
     * @private
     */
    createSurface: function() {
        var me = this,
            cfg = Ext.applyIf({
                renderTo: me.el,
                height: me.height,
                width: me.width,
                items: me.items
            }, me.initialConfig), surface;

        // ensure we remove any listeners to prevent duplicate events since we refire them below
        delete cfg.listeners;
        surface = Ext.draw.Surface.create(cfg);
        if (!surface) {
            // In case we cannot create a surface, return false so we can stop
            return false;
        }
        me.surface = surface;


        function refire(eventName) {
            return function(e) {
                me.fireEvent(eventName, e);
            };
        }

        surface.on({
            scope: me,
            mouseup: refire('mouseup'),
            mousedown: refire('mousedown'),
            mousemove: refire('mousemove'),
            mouseenter: refire('mouseenter'),
            mouseleave: refire('mouseleave'),
            click: refire('click'),
            dblclick: refire('dblclick')
        });
    },


    /**
     * @private
     *
     * Clean up the Surface instance on component destruction
     */
    onDestroy: function() {
        Ext.destroy(this.surface);
        this.callParent(arguments);
    }

});


/**
 * This class encapsulates a drawn text item as rendered by the Ext.draw package within a Component which can be
 * then used anywhere in an ExtJS application just like any other Component.
 *
 * ## Example usage
 *
 *     @example
 *     Ext.create('Ext.panel.Panel', {
 *         title: 'Panel with VerticalTextItem',
 *         width: 300,
 *         height: 200,
 *         lbar: {
 *             layout: {
 *                 align: 'center'
 *             },
 *             items: [{
 *                 xtype: 'text',
 *                 text: 'Sample VerticalTextItem',
 *                 degrees: 90
 *             }]
 *         },
 *         renderTo: Ext.getBody()
 *     });
 *
 * @constructor
 * Creates a new Text Component
 * @param {Object} text A config object containing a `text` property, a `degrees` property,
 * and, optionally, a `styleSelector` property which specifies a selector which provides CSS rules to
 * give font family, size and color to the drawn text.
 */
Ext.define('Ext.draw.Text', {
    extend: 'Ext.draw.Component',
    uses: ['Ext.util.CSS'],
    alias: 'widget.text',

    /**
     * @cfg {String} text
     * The text to display (html tags are <b>not</b> accepted)
     */
    text: '',

    /**
     * @cfg {String} styleSelector
     * A CSS selector string which matches a style rule in the document stylesheet from which
     * the text's font properties are read.
     *
     * **Drawn** text is not styled by CSS, but by properties set during its construction, so these styles
     * must be programatically read from a stylesheet rule found via a selector at construction time.
     */

    /**
     * @cfg {Number} degrees
     * The angle by which to initially rotate the text clockwise. Defaults to zero.
     */

    focusable: false,
    viewBox: false,
    autoSize: true,
    baseCls: Ext.baseCSSPrefix + 'surface ' + Ext.baseCSSPrefix + 'draw-text',

    initComponent: function() {
        var me = this;

        me.textConfig = Ext.apply({
            type: 'text',
            text: me.text,
            rotate: {
                degrees: me.degrees || 0
            }
        }, me.textStyle);
        Ext.apply(me.textConfig, me.getStyles(me.styleSelectors || me.styleSelector));

        // Surface is created from the *initialConfig*, not the current object state,
        // So the generated items must go into the initialConfig
        me.initialConfig.items = [me.textConfig];
        me.callParent(arguments);
    },

    /**
     * @private
     * Accumulates a style object based upon the styles specified in document stylesheets
     * by an array of CSS selectors
     */
    getStyles: function(selectors) {
        selectors = Ext.Array.from(selectors);
        var i = 0,
            len = selectors.length,
            rule,
            style,
            prop,
            result = {};

        for (; i < len; i++) {
            // Get the style rule which exactly matches the selector.
            rule = Ext.util.CSS.getRule(selectors[i]);
            if (rule) {
                style = rule.style;
                if (style) {
                    Ext.apply(result, {
                        'font-family': style.fontFamily,
                        'font-weight': style.fontWeight,
                        'line-height': style.lineHeight,
                        'font-size': style.fontSize,
                        fill: style.color
                    });
                }
            }
        }
        return result;
    },

    /**
     * Sets the clockwise rotation angle relative to the horizontal axis.
     * @param {Number} degrees The clockwise angle (in degrees) from the horizontal axis
     * by which the text should be rotated.
     */
    setAngle: function(degrees) {
        var me = this,
            surface,
            sprite;
            
        if (me.rendered) {
            surface = me.surface;
            sprite = surface.items.items[0];

            me.degrees = degrees;
            sprite.setAttributes({
                rotate: {
                    degrees: degrees
                }
            }, true);
            if (me.autoSize || me.viewBox) {
                me.updateLayout();
            }
        } else {
            me.degrees = degrees;
        }
    },

    /**
     * Updates this item's text.
     * @param {String} t The text to display (html **not** accepted).
     */
    setText: function(text) {
        var me = this,
            surface,
            sprite;
            
        if (me.rendered) {
            surface = me.surface;
            sprite = surface.items.items[0];

            me.text = text || '';
            surface.remove(sprite);
            me.textConfig.type = 'text';
            me.textConfig.text = me.text;
            sprite = surface.add(me.textConfig);
            sprite.setAttributes({
                rotate: {
                    degrees: me.degrees
                }
            }, true);
            if (me.autoSize || me.viewBox) {
                me.updateLayout();
            }
        } else {
            me.on({
                render: function() {
                    me.setText(text);
                },
                single: true
            });
        }
    }
});




/**
 * DD implementation for Panels.
 * @private
 */
Ext.define('Ext.draw.SpriteDD', {
    extend: 'Ext.dd.DragSource',

    constructor : function(sprite, cfg){
        var me = this,
            el = sprite.el;
        me.sprite = sprite;
        me.el = el;
        me.dragData = {el: el, sprite: sprite};
        me.callParent([el, cfg]);
        me.sprite.setStyle('cursor', 'move');
    },

    showFrame: Ext.emptyFn,
    createFrame : Ext.emptyFn,

    getDragEl : function(e){
        return this.el;
    },
    
    getRegion: function() {
        var me = this,
            el = me.el,
            pos, x1, x2, y1, y2, t, r, b, l, bbox, sprite;
        
        sprite = me.sprite;
        bbox = sprite.getBBox();
        
        try {
            pos = Ext.Element.getXY(el);
        } catch (e) { }

        if (!pos) {
            return null;
        }

        x1 = pos[0];
        x2 = x1 + bbox.width;
        y1 = pos[1];
        y2 = y1 + bbox.height;
        
        return new Ext.util.Region(y1, x2, y2, x1);
    },

    /*
      TODO(nico): Cumulative translations in VML are handled
      differently than in SVG. While in SVG we specify the translation
      relative to the original x, y position attributes, in VML the translation
      is a delta between the last position of the object (modified by the last
      translation) and the new one.
      
      In VML the translation alters the position
      of the object, we should change that or alter the SVG impl.
    */
     
    startDrag: function(x, y) {
        var me = this,
            attr = me.sprite.attr;
        me.prev = me.sprite.surface.transformToViewBox(x, y);
    },

    onDrag: function(e) {
        var xy = e.getXY(),
            me = this,
            sprite = me.sprite,
            attr = sprite.attr, dx, dy;
        xy = me.sprite.surface.transformToViewBox(xy[0], xy[1]);
        dx = xy[0] - me.prev[0];
        dy = xy[1] - me.prev[1];
        sprite.setAttributes({
            translate: {
                x: attr.translation.x + dx,
                y: attr.translation.y + dy
            }
        }, true);
        me.prev = xy;
    },

    setDragElPos: function () {
        // Disable automatic DOM move in DD that spoils layout of VML engine.
        return false;
    }
});
/**
 * A Sprite is an object rendered in a Drawing surface.
 *
 * ## Types
 *
 * The following sprite types are supported:
 *
 * ### Rect
 *
 * Rectangle requires `width` and `height` attributes:
 *
 *     @example
 *     Ext.create('Ext.draw.Component', {
 *         renderTo: Ext.getBody(),
 *         width: 200,
 *         height: 200,
 *         items: [{
 *             type: 'rect',
 *             width: 100,
 *             height: 50,
 *             radius: 10,
 *             fill: 'green',
 *             opacity: 0.5,
 *             stroke: 'red',
 *             'stroke-width': 2
 *         }]
 *     });
 *
 * ### Circle
 *
 * Circle requires `x`, `y` and `radius` attributes:
 *
 *     @example
 *     Ext.create('Ext.draw.Component', {
 *         renderTo: Ext.getBody(),
 *         width: 200,
 *         height: 200,
 *         items: [{
 *             type: 'circle',
 *             radius: 90,
 *             x: 100,
 *             y: 100,
 *             fill: 'blue',
 *         }]
 *     });
 *
 * ### Ellipse
 *
 * Ellipse requires `x`, `y`, `radiusX` and `radiusY` attributes:
 *
 *     @example
 *     Ext.create('Ext.draw.Component', {
 *         renderTo: Ext.getBody(),
 *         width: 200,
 *         height: 200,
 *         items: [{
 *             type: "ellipse",
 *             radiusX: 100,
 *             radiusY: 50,
 *             x: 100,
 *             y: 100,
 *             fill: 'red'
 *         }]
 *     });
 *
 * ### Path
 *
 * Path requires the `path` attribute:
 *
 *     @example
 *     Ext.create('Ext.draw.Component', {
 *         renderTo: Ext.getBody(),
 *         width: 200,
 *         height: 200,
 *         items: [{
 *             type: "path",
 *             path: "M-66.6 26C-66.6 26 -75 22 -78.2 18.4C-81.4 14.8 -80.948 19.966 " +
 *                   "-85.8 19.6C-91.647 19.159 -90.6 3.2 -90.6 3.2L-94.6 10.8C-94.6 " +
 *                   "10.8 -95.8 25.2 -87.8 22.8C-83.893 21.628 -82.6 23.2 -84.2 " +
 *                   "24C-85.8 24.8 -78.6 25.2 -81.4 26.8C-84.2 28.4 -69.8 23.2 -72.2 " +
 *                   "33.6L-66.6 26z",
 *             fill: "purple"
 *         }]
 *     });
 *
 * ### Text
 *
 * Text requires the `text` attribute:
 *
 *     @example
 *     Ext.create('Ext.draw.Component', {
 *         renderTo: Ext.getBody(),
 *         width: 200,
 *         height: 200,
 *         items: [{
 *             type: "text",
 *             text: "Hello, Sprite!",
 *             fill: "green",
 *             font: "18px monospace"
 *         }]
 *     });
 *
 * ### Image
 *
 * Image requires `width`, `height` and `src` attributes:
 *
 *     @example
 *     Ext.create('Ext.draw.Component', {
 *         renderTo: Ext.getBody(),
 *         width: 200,
 *         height: 200,
 *         items: [{
 *             type: "image",
 *             src: "http://www.sencha.com/img/apple-touch-icon.png",
 *             width: 200,
 *             height: 200
 *         }]
 *     });
 *
 * ## Creating and adding a Sprite to a Surface
 *
 * See {@link Ext.draw.Surface} documentation.
 *
 * ## Transforming sprites
 *
 * See {@link #setAttributes} method documentation for examples on how to translate, scale and rotate the sprites.
 *
 */
Ext.define('Ext.draw.Sprite', {

    /* Begin Definitions */

    mixins: {
        observable: 'Ext.util.Observable',
        animate: 'Ext.util.Animate'
    },

    requires: ['Ext.draw.SpriteDD'],

    /* End Definitions */

    /**
     * @cfg {String} type The type of the sprite.
     * Possible options are 'circle', 'ellipse', 'path', 'rect', 'text', 'image'.
     *
     * See {@link Ext.draw.Sprite} class documentation for examples of all types.
     */

    /**
     * @cfg {Number} width The width of the rect or image sprite.
     */

    /**
     * @cfg {Number} height The height of the rect or image sprite.
     */

    /**
     * @cfg {Number} radius The radius of the circle sprite. Or in case of rect sprite, the border radius.
     */

    /**
     * @cfg {Number} radiusX The radius of the ellipse sprite along x-axis.
     */

    /**
     * @cfg {Number} radiusY The radius of the ellipse sprite along y-axis.
     */

    /**
     * @cfg {Number} x Sprite position along the x-axis.
     */

    /**
     * @cfg {Number} y Sprite position along the y-axis.
     */

    /**
     * @cfg {String} path The path of the path sprite written in SVG-like path syntax.
     */

    /**
     * @cfg {Number} opacity The opacity of the sprite. A number between 0 and 1.
     */

    /**
     * @cfg {String} fill The fill color.
     */

    /**
     * @cfg {String} stroke The stroke color.
     */

    /**
     * @cfg {Number} stroke-width The width of the stroke.
     *
     * Note that this attribute needs to be quoted when used.  Like so:
     *
     *     "stroke-width": 12,
     */

    /**
     * @cfg {String} font Used with text type sprites. The full font description.
     * Uses the same syntax as the CSS font parameter
     */

    /**
     * @cfg {String} text The actual text to render in text sprites.
     */

    /**
     * @cfg {String} src Path to the image to show in image sprites.
     */

    /**
     * @cfg {String/String[]} group The group that this sprite belongs to, or an array of groups.
     * Only relevant when added to a {@link Ext.draw.Surface Surface}.
     */

    /**
     * @cfg {Boolean} draggable True to make the sprite draggable.
     */

    dirty: false,
    dirtyHidden: false,
    dirtyTransform: false,
    dirtyPath: true,
    dirtyFont: true,
    zIndexDirty: true,

    /**
     * @property {Boolean} isSprite
     * `true` in this class to identify an object as an instantiated Sprite, or subclass thereof.
     */
    isSprite: true,
    zIndex: 0,
    fontProperties: [
        'font',
        'font-size',
        'font-weight',
        'font-style',
        'font-family',
        'text-anchor',
        'text'
    ],
    pathProperties: [
        'x',
        'y',
        'd',
        'path',
        'height',
        'width',
        'radius',
        'r',
        'rx',
        'ry',
        'cx',
        'cy'
    ],
    constructor: function(config) {
        var me = this;
        config = Ext.merge({}, config || {});
        me.id = Ext.id(null, 'ext-sprite-');
        me.transformations = [];
        Ext.copyTo(this, config, 'surface,group,type,draggable');
        //attribute bucket
        me.bbox = {};
        me.attr = {
            zIndex: 0,
            translation: {
                x: null,
                y: null
            },
            rotation: {
                degrees: null,
                x: null,
                y: null
            },
            scaling: {
                x: null,
                y: null,
                cx: null,
                cy: null
            }
        };
        //delete not bucket attributes
        delete config.surface;
        delete config.group;
        delete config.type;
        delete config.draggable;
        me.setAttributes(config);
        me.addEvents(
            /**
             * @event
             * Fires before the sprite is destroyed. Return false from an event handler to stop the destroy.
             * @param {Ext.draw.Sprite} this
             */
            'beforedestroy',
            /**
             * @event
             * Fires after the sprite is destroyed.
             * @param {Ext.draw.Sprite} this
             */
            'destroy',
            /**
             * @event
             * Fires after the sprite markup is rendered.
             * @param {Ext.draw.Sprite} this
             */
            'render',
            /**
             * @event
             * @inheritdoc Ext.dom.Element#mousedown
             */
            'mousedown',
            /**
             * @event
             * @inheritdoc Ext.dom.Element#mouseup
             */
            'mouseup',
            /**
             * @event
             * @inheritdoc Ext.dom.Element#mouseover
             */
            'mouseover',
            /**
             * @event
             * @inheritdoc Ext.dom.Element#mouseout
             */
            'mouseout',
            /**
             * @event
             * @inheritdoc Ext.dom.Element#mousemove
             */
            'mousemove',
            /**
             * @event
             * @inheritdoc Ext.dom.Element#click
             */
            'click'
        );
        me.mixins.observable.constructor.apply(this, arguments);
    },

    /**
     * @property {Ext.dd.DragSource} dd
     * If this Sprite is configured {@link #draggable}, this property will contain
     * an instance of {@link Ext.dd.DragSource} which handles dragging the Sprite.
     *
     * The developer must provide implementations of the abstract methods of {@link Ext.dd.DragSource}
     * in order to supply behaviour for each stage of the drag/drop process. See {@link #draggable}.
     */

    initDraggable: function() {
        var me = this;
        me.draggable = true;
        //create element if it doesn't exist.
        if (!me.el) {
            me.surface.createSpriteElement(me);
        }
        me.dd = new Ext.draw.SpriteDD(me, Ext.isBoolean(me.draggable) ? null : me.draggable);
        me.on('beforedestroy', me.dd.destroy, me.dd);
    },

    /**
     * Change the attributes of the sprite.
     *
     * ## Translation
     *
     * For translate, the configuration object contains x and y attributes that indicate where to
     * translate the object. For example:
     *
     *     sprite.setAttributes({
     *       translate: {
     *        x: 10,
     *        y: 10
     *       }
     *     }, true);
     *
     *
     * ## Rotation
     *
     * For rotation, the configuration object contains x and y attributes for the center of the rotation (which are optional),
     * and a `degrees` attribute that specifies the rotation in degrees. For example:
     *
     *     sprite.setAttributes({
     *       rotate: {
     *        degrees: 90
     *       }
     *     }, true);
     *
     * That example will create a 90 degrees rotation using the centroid of the Sprite as center of rotation, whereas:
     *
     *     sprite.setAttributes({
     *       rotate: {
     *        x: 0,
     *        y: 0,
     *        degrees: 90
     *       }
     *     }, true);
     *
     * will create a rotation around the `(0, 0)` axis.
     *
     *
     * ## Scaling
     *
     * For scaling, the configuration object contains x and y attributes for the x-axis and y-axis scaling. For example:
     *
     *     sprite.setAttributes({
     *       scale: {
     *        x: 10,
     *        y: 3
     *       }
     *     }, true);
     *
     * You can also specify the center of scaling by adding `cx` and `cy` as properties:
     *
     *     sprite.setAttributes({
     *       scale: {
     *        cx: 0,
     *        cy: 0,
     *        x: 10,
     *        y: 3
     *       }
     *     }, true);
     *
     * That last example will scale a sprite taking as centers of scaling the `(0, 0)` coordinate.
     *
     * @param {Object} attrs attributes to be changed on the sprite.
     * @param {Boolean} redraw Flag to immediately draw the change.
     * @return {Ext.draw.Sprite} this
     */
    setAttributes: function(attrs, redraw) {
        var me = this,
            fontProps = me.fontProperties,
            fontPropsLength = fontProps.length,
            pathProps = me.pathProperties,
            pathPropsLength = pathProps.length,
            hasSurface = !!me.surface,
            custom = hasSurface && me.surface.customAttributes || {},
            spriteAttrs = me.attr,
            dirtyBBox = false,
            attr, i, newTranslation, translation, newRotate, rotation, newScaling, scaling;

        attrs = Ext.apply({}, attrs);
        for (attr in custom) {
            if (attrs.hasOwnProperty(attr) && typeof custom[attr] == "function") {
                Ext.apply(attrs, custom[attr].apply(me, [].concat(attrs[attr])));
            }
        }

        // Flag a change in hidden
        if (!!attrs.hidden !== !!spriteAttrs.hidden) {
            me.dirtyHidden = true;
        }

        // Flag path change
        for (i = 0; i < pathPropsLength; i++) {
            attr = pathProps[i];
            if (attr in attrs && attrs[attr] !== spriteAttrs[attr]) {
                me.dirtyPath = true;
                dirtyBBox = true;
                break;
            }
        }

        // Flag zIndex change
        if ('zIndex' in attrs) {
            me.zIndexDirty = true;
        }

        // Flag font/text change
        if ('text' in attrs) {
            me.dirtyFont = true;
            dirtyBBox = true;
        }

        for (i = 0; i < fontPropsLength; i++) {
            attr = fontProps[i];
            if (attr in attrs && attrs[attr] !== spriteAttrs[attr]) {
                me.dirtyFont = true;
                dirtyBBox = true;
                break;
            }
        }

        newTranslation = attrs.translation || attrs.translate;
        delete attrs.translate;
        delete attrs.translation;
        translation = spriteAttrs.translation;
        if (newTranslation) {
            if (('x' in newTranslation && newTranslation.x !== translation.x) ||
                ('y' in newTranslation && newTranslation.y !== translation.y)) {
                me.dirtyTransform = true;
                translation.x = newTranslation.x;
                translation.y = newTranslation.y;
            }
        }

        newRotate = attrs.rotation || attrs.rotate;
        rotation = spriteAttrs.rotation;
        delete attrs.rotate;
        delete attrs.rotation;
        if (newRotate) {
            if (('x' in newRotate && newRotate.x !== rotation.x) ||
                ('y' in newRotate && newRotate.y !== rotation.y) ||
                ('degrees' in newRotate && newRotate.degrees !== rotation.degrees)) {
                me.dirtyTransform = true;
                rotation.x = newRotate.x;
                rotation.y = newRotate.y;
                rotation.degrees = newRotate.degrees;
            }
        }

        newScaling = attrs.scaling || attrs.scale;
        scaling = spriteAttrs.scaling;
        delete attrs.scale;
        delete attrs.scaling;
        if (newScaling) {
            if (('x' in newScaling && newScaling.x !== scaling.x) ||
                ('y' in newScaling && newScaling.y !== scaling.y) ||
                ('cx' in newScaling && newScaling.cx !== scaling.cx) ||
                ('cy' in newScaling && newScaling.cy !== scaling.cy)) {
                me.dirtyTransform = true;
                scaling.x = newScaling.x;
                scaling.y = newScaling.y;
                scaling.cx = newScaling.cx;
                scaling.cy = newScaling.cy;
            }
        }

        // If the bbox is changed, then the bbox based transforms should be invalidated.
        if (!me.dirtyTransform && dirtyBBox) {
            if (spriteAttrs.scaling.x === null ||
                spriteAttrs.scaling.y === null ||
                spriteAttrs.rotation.y === null ||
                spriteAttrs.rotation.y === null) {
                me.dirtyTransform = true;
            }
        }

        Ext.apply(spriteAttrs, attrs);
        me.dirty = true;

        if (redraw === true && hasSurface) {
            me.redraw();
        }
        return this;
    },

    /**
     * Retrieves the bounding box of the sprite.
     * This will be returned as an object with x, y, width, and height properties.
     * @return {Object} bbox
     */
    getBBox: function() {
        return this.surface.getBBox(this);
    },

    setText: function(text) {
        return this.surface.setText(this, text);
    },

    /**
     * Hides the sprite.
     * @param {Boolean} redraw Flag to immediately draw the change.
     * @return {Ext.draw.Sprite} this
     */
    hide: function(redraw) {
        this.setAttributes({
            hidden: true
        }, redraw);
        return this;
    },

    /**
     * Shows the sprite.
     * @param {Boolean} redraw Flag to immediately draw the change.
     * @return {Ext.draw.Sprite} this
     */
    show: function(redraw) {
        this.setAttributes({
            hidden: false
        }, redraw);
        return this;
    },

    /**
     * Removes the sprite.
     * @return {Boolean} True if sprite was successfully removed.
     * False when there was no surface to remove it from.
     */
    remove: function() {
        if (this.surface) {
            this.surface.remove(this);
            return true;
        }
        return false;
    },

    onRemove: function() {
        this.surface.onRemove(this);
    },

    /**
     * Removes the sprite and clears all listeners.
     */
    destroy: function() {
        var me = this;
        if (me.fireEvent('beforedestroy', me) !== false) {
            me.remove();
            me.surface.onDestroy(me);
            me.clearListeners();
            me.fireEvent('destroy');
        }
    },

    /**
     * Redraws the sprite.
     * @return {Ext.draw.Sprite} this
     */
    redraw: function() {
        this.surface.renderItem(this);
        return this;
    },

    /**
     * Wrapper for setting style properties, also takes single object parameter of multiple styles.
     * @param {String/Object} property The style property to be set, or an object of multiple styles.
     * @param {String} value (optional) The value to apply to the given property, or null if an object was passed.
     * @return {Ext.draw.Sprite} this
     */
    setStyle: function() {
        this.el.setStyle.apply(this.el, arguments);
        return this;
    },

    /**
     * Adds one or more CSS classes to the element. Duplicate classes are automatically filtered out.  Note this method
     * is severly limited in VML.
     * @param {String/String[]} className The CSS class to add, or an array of classes
     * @return {Ext.draw.Sprite} this
     */
    addCls: function(obj) {
        this.surface.addCls(this, obj);
        return this;
    },

    /**
     * Removes one or more CSS classes from the element.
     * @param {String/String[]} className The CSS class to remove, or an array of classes.  Note this method
     * is severly limited in VML.
     * @return {Ext.draw.Sprite} this
     */
    removeCls: function(obj) {
        this.surface.removeCls(this, obj);
        return this;
    }
});

/**
 * Provides specific methods to draw with SVG.
 */
Ext.define('Ext.draw.engine.Svg', {

    /* Begin Definitions */

    extend: 'Ext.draw.Surface',

    requires: ['Ext.draw.Draw', 'Ext.draw.Sprite', 'Ext.draw.Matrix', 'Ext.Element'],

    /* End Definitions */

    engine: 'Svg',

    trimRe: /^\s+|\s+$/g,
    spacesRe: /\s+/,
    xlink: "http:/" + "/www.w3.org/1999/xlink",

    translateAttrs: {
        radius: "r",
        radiusX: "rx",
        radiusY: "ry",
        path: "d",
        lineWidth: "stroke-width",
        fillOpacity: "fill-opacity",
        strokeOpacity: "stroke-opacity",
        strokeLinejoin: "stroke-linejoin"
    },

    parsers: {},

    minDefaults: {
        circle: {
            cx: 0,
            cy: 0,
            r: 0,
            fill: "none",
            stroke: null,
            "stroke-width": null,
            opacity: null,
            "fill-opacity": null,
            "stroke-opacity": null
        },
        ellipse: {
            cx: 0,
            cy: 0,
            rx: 0,
            ry: 0,
            fill: "none",
            stroke: null,
            "stroke-width": null,
            opacity: null,
            "fill-opacity": null,
            "stroke-opacity": null
        },
        rect: {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            rx: 0,
            ry: 0,
            fill: "none",
            stroke: null,
            "stroke-width": null,
            opacity: null,
            "fill-opacity": null,
            "stroke-opacity": null
        },
        text: {
            x: 0,
            y: 0,
            "text-anchor": "start",
            "font-family": null,
            "font-size": null,
            "font-weight": null,
            "font-style": null,
            fill: "#000",
            stroke: null,
            "stroke-width": null,
            opacity: null,
            "fill-opacity": null,
            "stroke-opacity": null
        },
        path: {
            d: "M0,0",
            fill: "none",
            stroke: null,
            "stroke-width": null,
            opacity: null,
            "fill-opacity": null,
            "stroke-opacity": null
        },
        image: {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            preserveAspectRatio: "none",
            opacity: null
        }
    },

    createSvgElement: function(type, attrs) {
        var el = this.domRef.createElementNS("http:/" + "/www.w3.org/2000/svg", type),
            key;
        if (attrs) {
            for (key in attrs) {
                el.setAttribute(key, String(attrs[key]));
            }
        }
        return el;
    },

    createSpriteElement: function(sprite) {
        // Create svg element and append to the DOM.
        var el = this.createSvgElement(sprite.type);
        el.id = sprite.id;
        if (el.style) {
            el.style.webkitTapHighlightColor = "rgba(0,0,0,0)";
        }
        sprite.el = Ext.get(el);
        this.applyZIndex(sprite); //performs the insertion
        sprite.matrix = new Ext.draw.Matrix();
        sprite.bbox = {
            plain: 0,
            transform: 0
        };
        this.applyAttrs(sprite);
        this.applyTransformations(sprite);
        sprite.fireEvent("render", sprite);
        return el;
    },
    
    getBBoxText: function (sprite) {
        var bbox = {},
            bb, height, width, i, ln, el;

        if (sprite && sprite.el) {
            el = sprite.el.dom;
            try {
                bbox = el.getBBox();
                return bbox;
            } catch(e) {
                // Firefox 3.0.x plays badly here
            }
            bbox = {x: bbox.x, y: Infinity, width: 0, height: 0};
            ln = el.getNumberOfChars();
            for (i = 0; i < ln; i++) {
                bb = el.getExtentOfChar(i);
                bbox.y = Math.min(bb.y, bbox.y);
                height = bb.y + bb.height - bbox.y;
                bbox.height = Math.max(bbox.height, height);
                width = bb.x + bb.width - bbox.x;
                bbox.width = Math.max(bbox.width, width);
            }
            return bbox;
        }
    },

    hide: function() {
        Ext.get(this.el).hide();
    },

    show: function() {
        Ext.get(this.el).show();
    },

    hidePrim: function(sprite) {
        this.addCls(sprite, Ext.baseCSSPrefix + 'hide-visibility');
    },

    showPrim: function(sprite) {
        this.removeCls(sprite, Ext.baseCSSPrefix + 'hide-visibility');
    },

    getDefs: function() {
        return this._defs || (this._defs = this.createSvgElement("defs"));
    },

    transform: function(sprite, matrixOnly) {
        var me = this,
            matrix = new Ext.draw.Matrix(),
            transforms = sprite.transformations,
            transformsLength = transforms.length,
            i = 0,
            transform, type;
            
        for (; i < transformsLength; i++) {
            transform = transforms[i];
            type = transform.type;
            if (type == "translate") {
                matrix.translate(transform.x, transform.y);
            }
            else if (type == "rotate") {
                matrix.rotate(transform.degrees, transform.x, transform.y);
            }
            else if (type == "scale") {
                matrix.scale(transform.x, transform.y, transform.centerX, transform.centerY);
            }
        }
        sprite.matrix = matrix;
        if (!matrixOnly) {
            sprite.el.set({transform: matrix.toSvg()});
        }
    },

    setSize: function(width, height) {
        var me = this,
            el = me.el;
        
        width = +width || me.width;
        height = +height || me.height;
        me.width = width;
        me.height = height;

        el.setSize(width, height);
        el.set({
            width: width,
            height: height
        });
        me.callParent([width, height]);
    },

    /**
     * Get the region for the surface's canvas area
     * @returns {Ext.util.Region}
     */
    getRegion: function() {
        // Mozilla requires using the background rect because the svg element returns an
        // incorrect region. Webkit gives no region for the rect and must use the svg element.
        var svgXY = this.el.getXY(),
            rectXY = this.bgRect.getXY(),
            max = Math.max,
            x = max(svgXY[0], rectXY[0]),
            y = max(svgXY[1], rectXY[1]);
        return {
            left: x,
            top: y,
            right: x + this.width,
            bottom: y + this.height
        };
    },

    onRemove: function(sprite) {
        if (sprite.el) {
            sprite.el.destroy();
            delete sprite.el;
        }
        this.callParent(arguments);
    },
    
    setViewBox: function(x, y, width, height) {
        if (isFinite(x) && isFinite(y) && isFinite(width) && isFinite(height)) {
            this.callParent(arguments);
            this.el.dom.setAttribute("viewBox", [x, y, width, height].join(" "));
        }
    },

    render: function (container) {
        var me = this,
            width,
            height,
            el,
            defs,
            bgRect,
            webkitRect;
        if (!me.el) {
            width = me.width || 0;
            height = me.height || 0;
            el = me.createSvgElement('svg', {
                xmlns: "http:/" + "/www.w3.org/2000/svg",
                version: 1.1,
                width: width,
                height: height
            });
            defs = me.getDefs();

            // Create a rect that is always the same size as the svg root; this serves 2 purposes:
            // (1) It allows mouse events to be fired over empty areas in Webkit, and (2) we can
            // use it rather than the svg element for retrieving the correct client rect of the
            // surface in Mozilla (see https://bugzilla.mozilla.org/show_bug.cgi?id=530985)
            bgRect = me.createSvgElement("rect", {
                width: "100%",
                height: "100%",
                fill: "#000",
                stroke: "none",
                opacity: 0
            });
            
            if (Ext.isSafari3) {
                // Rect that we will show/hide to fix old WebKit bug with rendering issues.
                webkitRect = me.createSvgElement("rect", {
                    x: -10,
                    y: -10,
                    width: "110%",
                    height: "110%",
                    fill: "none",
                    stroke: "#000"
                });
            }
            el.appendChild(defs);
            if (Ext.isSafari3) {
                el.appendChild(webkitRect);
            }
            el.appendChild(bgRect);
            container.appendChild(el);
            me.el = Ext.get(el);
            me.bgRect = Ext.get(bgRect);
            if (Ext.isSafari3) {
                me.webkitRect = Ext.get(webkitRect);
                me.webkitRect.hide();
            }
            me.el.on({
                scope: me,
                mouseup: me.onMouseUp,
                mousedown: me.onMouseDown,
                mouseover: me.onMouseOver,
                mouseout: me.onMouseOut,
                mousemove: me.onMouseMove,
                mouseenter: me.onMouseEnter,
                mouseleave: me.onMouseLeave,
                click: me.onClick,
                dblclick: me.onDblClick
            });
        }
        me.renderAll();
    },

    // private
    onMouseEnter: function(e) {
        if (this.el.parent().getRegion().contains(e.getPoint())) {
            this.fireEvent('mouseenter', e);
        }
    },

    // private
    onMouseLeave: function(e) {
        if (!this.el.parent().getRegion().contains(e.getPoint())) {
            this.fireEvent('mouseleave', e);
        }
    },
    // @private - Normalize a delegated single event from the main container to each sprite and sprite group
    processEvent: function(name, e) {
        var target = e.getTarget(),
            surface = this.surface,
            sprite;

        this.fireEvent(name, e);
        // We wrap text types in a tspan, sprite is the parent.
        if (target.nodeName == "tspan" && target.parentNode) {
            target = target.parentNode;
        }
        sprite = this.items.get(target.id);
        if (sprite) {
            sprite.fireEvent(name, sprite, e);
        }
    },

    /* @private - Wrap SVG text inside a tspan to allow for line wrapping.  In addition this normallizes
     * the baseline for text the vertical middle of the text to be the same as VML.
     */
    tuneText: function (sprite, attrs) {
        var el = sprite.el.dom,
            tspans = [],
            height, tspan, text, i, ln, texts, factor, x;

        if (attrs.hasOwnProperty("text")) {
            //only create new tspans for text lines if the text has been 
            //updated or if it's the first time we're setting the text
            //into the sprite.

            //get the actual rendered text.
            text = sprite.tspans && Ext.Array.map(sprite.tspans, function(t) { return t.textContent; }).join('');

            if (!sprite.tspans || attrs.text != text) {
                tspans = this.setText(sprite, attrs.text);
                sprite.tspans = tspans;
            //for all other cases reuse the tspans previously created.
            } else {
                tspans = sprite.tspans || [];
            }
        }
        // Normalize baseline via a DY shift of first tspan. Shift other rows by height * line height (1.2)
        if (tspans.length) {
            height = this.getBBoxText(sprite).height;
            x = sprite.el.dom.getAttribute("x");
            for (i = 0, ln = tspans.length; i < ln; i++) {
                // The text baseline for FireFox 3.0 and 3.5 is different than other SVG implementations
                // so we are going to normalize that here
                factor = (Ext.isFF3_0 || Ext.isFF3_5) ? 2 : 4;
                tspans[i].setAttribute("x", x);
                tspans[i].setAttribute("dy", i ? height * 1.2 : height / factor);
            }
            sprite.dirty = true;
        }
    },

    setText: function(sprite, textString) {
         var me = this,
             el = sprite.el.dom,
             tspans = [],
             height, tspan, text, i, ln, texts;
        
        while (el.firstChild) {
            el.removeChild(el.firstChild);
        }
        // Wrap each row into tspan to emulate rows
        texts = String(textString).split("\n");
        for (i = 0, ln = texts.length; i < ln; i++) {
            text = texts[i];
            if (text) {
                tspan = me.createSvgElement("tspan");
                tspan.appendChild(document.createTextNode(Ext.htmlDecode(text)));
                el.appendChild(tspan);
                tspans[i] = tspan;
            }
        }
        return tspans;
    },

    renderAll: function() {
        this.items.each(this.renderItem, this);
    },

    renderItem: function (sprite) {
        if (!this.el) {
            return;
        }
        if (!sprite.el) {
            this.createSpriteElement(sprite);
        }
        if (sprite.zIndexDirty) {
            this.applyZIndex(sprite);
        }
        if (sprite.dirty) {
            this.applyAttrs(sprite);
            if (sprite.dirtyTransform) {
                this.applyTransformations(sprite);
            }
        }
    },

    redraw: function(sprite) {
        sprite.dirty = sprite.zIndexDirty = true;
        this.renderItem(sprite);
    },

    applyAttrs: function (sprite) {
        var me = this,
            el = sprite.el,
            group = sprite.group,
            sattr = sprite.attr,
            parsers = me.parsers,
            //Safari does not handle linear gradients correctly in quirksmode
            //ref: https://bugs.webkit.org/show_bug.cgi?id=41952
            //ref: EXTJSIV-1472
            gradientsMap = me.gradientsMap || {},
            safariFix = Ext.isSafari && !Ext.isStrict,
            groups, i, ln, attrs, font, key, style, name, rect;

        if (group) {
            groups = [].concat(group);
            ln = groups.length;
            for (i = 0; i < ln; i++) {
                group = groups[i];
                me.getGroup(group).add(sprite);
            }
            delete sprite.group;
        }
        attrs = me.scrubAttrs(sprite) || {};

        // if (sprite.dirtyPath) {
            sprite.bbox.plain = 0;
            sprite.bbox.transform = 0;
            if (sprite.type == "circle" || sprite.type == "ellipse") {
                attrs.cx = attrs.cx || attrs.x;
                attrs.cy = attrs.cy || attrs.y;
            }
            else if (sprite.type == "rect") {
                attrs.rx = attrs.ry = attrs.r;
            }
            else if (sprite.type == "path" && attrs.d) {
                attrs.d = Ext.draw.Draw.pathToString(Ext.draw.Draw.pathToAbsolute(attrs.d));
            }
            sprite.dirtyPath = false;
        // }
        // else {
        //     delete attrs.d;
        // }

        if (attrs['clip-rect']) {
            me.setClip(sprite, attrs);
            delete attrs['clip-rect'];
        }
        if (sprite.type == 'text' && attrs.font && sprite.dirtyFont) {
            el.set({ style: "font: " + attrs.font});
        }
        if (sprite.type == "image") {
            el.dom.setAttributeNS(me.xlink, "href", attrs.src);
        }
        Ext.applyIf(attrs, me.minDefaults[sprite.type]);

        if (sprite.dirtyHidden) {
            (sattr.hidden) ? me.hidePrim(sprite) : me.showPrim(sprite);
            sprite.dirtyHidden = false;
        }
        for (key in attrs) {
            if (attrs.hasOwnProperty(key) && attrs[key] != null) {
                //Safari does not handle linear gradients correctly in quirksmode
                //ref: https://bugs.webkit.org/show_bug.cgi?id=41952
                //ref: EXTJSIV-1472
                //if we're Safari in QuirksMode and we're applying some color attribute and the value of that
                //attribute is a reference to a gradient then assign a plain color to that value instead of the gradient.
                if (safariFix && ('color|stroke|fill'.indexOf(key) > -1) && (attrs[key] in gradientsMap)) {
                    attrs[key] = gradientsMap[attrs[key]];
                }
                //hidden is not a proper SVG attribute.
                if (key == 'hidden' && sprite.type == 'text') {
                    continue;
                }
                if (key in parsers) {
                    el.dom.setAttribute(key, parsers[key](attrs[key], sprite, me));
                } else {
                    el.dom.setAttribute(key, attrs[key]);
                }
            }
        }
        
        if (sprite.type == 'text') {
            me.tuneText(sprite, attrs);
        }
        sprite.dirtyFont = false;

        //set styles
        style = sattr.style;
        if (style) {
            el.setStyle(style);
        }

        sprite.dirty = false;

        if (Ext.isSafari3) {
            // Refreshing the view to fix bug EXTJSIV-1: rendering issue in old Safari 3
            me.webkitRect.show();
            setTimeout(function () {
                me.webkitRect.hide();
            });
        }
    },

    setClip: function(sprite, params) {
        var me = this,
            rect = params["clip-rect"],
            clipEl, clipPath;
        if (rect) {
            if (sprite.clip) {
                sprite.clip.parentNode.parentNode.removeChild(sprite.clip.parentNode);
            }
            clipEl = me.createSvgElement('clipPath');
            clipPath = me.createSvgElement('rect');
            clipEl.id = Ext.id(null, 'ext-clip-');
            clipPath.setAttribute("x", rect.x);
            clipPath.setAttribute("y", rect.y);
            clipPath.setAttribute("width", rect.width);
            clipPath.setAttribute("height", rect.height);
            clipEl.appendChild(clipPath);
            me.getDefs().appendChild(clipEl);
            sprite.el.dom.setAttribute("clip-path", "url(#" + clipEl.id + ")");
            sprite.clip = clipPath;
        } 
        // if (!attrs[key]) {
        //     var clip = Ext.getDoc().dom.getElementById(sprite.el.getAttribute("clip-path").replace(/(^url\(#|\)$)/g, ""));
        //     clip && clip.parentNode.removeChild(clip);
        //     sprite.el.setAttribute("clip-path", "");
        //     delete attrss.clip;
        // }
    },

    /**
     * Insert or move a given sprite's element to the correct place in the DOM list for its zIndex
     * @param {Ext.draw.Sprite} sprite
     */
    applyZIndex: function(sprite) {
        var me = this,
            items = me.items,
            idx = items.indexOf(sprite),
            el = sprite.el,
            prevEl;
        if (me.el.dom.childNodes[idx + 2] !== el.dom) { //shift by 2 to account for defs and bg rect
            if (idx > 0) {
                // Find the first previous sprite which has its DOM element created already
                do {
                    prevEl = items.getAt(--idx).el;
                } while (!prevEl && idx > 0);
            }
            el.insertAfter(prevEl || me.bgRect);
        }
        sprite.zIndexDirty = false;
    },

    createItem: function (config) {
        var sprite = new Ext.draw.Sprite(config);
        sprite.surface = this;
        return sprite;
    },

    addGradient: function(gradient) {
        gradient = Ext.draw.Draw.parseGradient(gradient);
        var me = this,
            ln = gradient.stops.length,
            vector = gradient.vector,
            //Safari does not handle linear gradients correctly in quirksmode
            //ref: https://bugs.webkit.org/show_bug.cgi?id=41952
            //ref: EXTJSIV-1472
            usePlain = Ext.isSafari && !Ext.isStrict,
            gradientEl, stop, stopEl, i, gradientsMap;
            
        gradientsMap = me.gradientsMap || {};
        
        if (!usePlain) {
            if (gradient.type == "linear") {
                gradientEl = me.createSvgElement("linearGradient");
                gradientEl.setAttribute("x1", vector[0]);
                gradientEl.setAttribute("y1", vector[1]);
                gradientEl.setAttribute("x2", vector[2]);
                gradientEl.setAttribute("y2", vector[3]);
            }
            else {
                gradientEl = me.createSvgElement("radialGradient");
                gradientEl.setAttribute("cx", gradient.centerX);
                gradientEl.setAttribute("cy", gradient.centerY);
                gradientEl.setAttribute("r", gradient.radius);
                if (Ext.isNumber(gradient.focalX) && Ext.isNumber(gradient.focalY)) {
                    gradientEl.setAttribute("fx", gradient.focalX);
                    gradientEl.setAttribute("fy", gradient.focalY);
                }
            }
            gradientEl.id = gradient.id;
            me.getDefs().appendChild(gradientEl);
            for (i = 0; i < ln; i++) {
                stop = gradient.stops[i];
                stopEl = me.createSvgElement("stop");
                stopEl.setAttribute("offset", stop.offset + "%");
                stopEl.setAttribute("stop-color", stop.color);
                stopEl.setAttribute("stop-opacity",stop.opacity);
                gradientEl.appendChild(stopEl);
            }
        } else {
            gradientsMap['url(#' + gradient.id + ')'] = gradient.stops[0].color;
        }
        me.gradientsMap = gradientsMap;
    },

    /**
     * Checks if the specified CSS class exists on this element's DOM node.
     * @param {Ext.draw.Sprite} sprite The sprite to look into.
     * @param {String} className The CSS class to check for
     * @return {Boolean} True if the class exists, else false
     */
    hasCls: function(sprite, className) {
        return className && (' ' + (sprite.el.dom.getAttribute('class') || '') + ' ').indexOf(' ' + className + ' ') != -1;
    },

    addCls: function(sprite, className) {
        var el = sprite.el,
            i,
            len,
            v,
            cls = [],
            curCls =  el.getAttribute('class') || '';
        // Separate case is for speed
        if (!Ext.isArray(className)) {
            if (typeof className == 'string' && !this.hasCls(sprite, className)) {
                el.set({ 'class': curCls + ' ' + className });
            }
        }
        else {
            for (i = 0, len = className.length; i < len; i++) {
                v = className[i];
                if (typeof v == 'string' && (' ' + curCls + ' ').indexOf(' ' + v + ' ') == -1) {
                    cls.push(v);
                }
            }
            if (cls.length) {
                el.set({ 'class': ' ' + cls.join(' ') });
            }
        }
    },

    removeCls: function(sprite, className) {
        var me = this,
            el = sprite.el,
            curCls =  el.getAttribute('class') || '',
            i, idx, len, cls, elClasses;
        if (!Ext.isArray(className)){
            className = [className];
        }
        if (curCls) {
            elClasses = curCls.replace(me.trimRe, ' ').split(me.spacesRe);
            for (i = 0, len = className.length; i < len; i++) {
                cls = className[i];
                if (typeof cls == 'string') {
                    cls = cls.replace(me.trimRe, '');
                    idx = Ext.Array.indexOf(elClasses, cls);
                    if (idx != -1) {
                        Ext.Array.erase(elClasses, idx, 1);
                    }
                }
            }
            el.set({ 'class': elClasses.join(' ') });
        }
    },

    destroy: function() {
        var me = this;
        
        me.callParent();
        if (me.el) {
            me.el.remove();
        }
        if (me._defs) {
            Ext.get(me._defs).destroy();
        }
        if (me.bgRect) {
            Ext.get(me.bgRect).destroy();
        }
        if (me.webkitRect) {
            Ext.get(me.webkitRect).destroy();
        }
        delete me.el;
    }
});

/**
 * Provides specific methods to draw with VML.
 */
Ext.define('Ext.draw.engine.Vml', {

    /* Begin Definitions */

    extend: 'Ext.draw.Surface',

    requires: ['Ext.draw.Draw', 'Ext.draw.Color', 'Ext.draw.Sprite', 'Ext.draw.Matrix', 'Ext.Element'],

    /* End Definitions */

    engine: 'Vml',

    map: {M: "m", L: "l", C: "c", Z: "x", m: "t", l: "r", c: "v", z: "x"},
    bitesRe: /([clmz]),?([^clmz]*)/gi,
    valRe: /-?[^,\s\-]+/g,
    fillUrlRe: /^url\(\s*['"]?([^\)]+?)['"]?\s*\)$/i,
    pathlike: /^(path|rect)$/,
    NonVmlPathRe: /[ahqstv]/ig, // Non-VML Pathing ops
    partialPathRe: /[clmz]/g,
    fontFamilyRe: /^['"]+|['"]+$/g,
    baseVmlCls: Ext.baseCSSPrefix + 'vml-base',
    vmlGroupCls: Ext.baseCSSPrefix + 'vml-group',
    spriteCls: Ext.baseCSSPrefix + 'vml-sprite',
    measureSpanCls: Ext.baseCSSPrefix + 'vml-measure-span',
    zoom: 21600,
    coordsize: 1000,
    coordorigin: '0 0',
    zIndexShift: 0,
    // VML uses CSS z-index and therefore doesn't need sprites to be kept in zIndex order
    orderSpritesByZIndex: false,

    // @private
    // Convert an SVG standard path into a VML path
    path2vml: function (path) {
        var me = this,
            nonVML = me.NonVmlPathRe,
            map = me.map,
            val = me.valRe,
            zoom = me.zoom,
            bites = me.bitesRe,
            command = Ext.Function.bind(Ext.draw.Draw.pathToAbsolute, Ext.draw.Draw),
            res, pa, p, r, i, ii, j, jj;
        if (String(path).match(nonVML)) {
            command = Ext.Function.bind(Ext.draw.Draw.path2curve, Ext.draw.Draw);
        } else if (!String(path).match(me.partialPathRe)) {
            res = String(path).replace(bites, function (all, command, args) {
                var vals = [],
                    isMove = command.toLowerCase() == "m",
                    res = map[command];
                args.replace(val, function (value) {
                    if (isMove && vals.length === 2) {
                        res += vals + map[command == "m" ? "l" : "L"];
                        vals = [];
                    }
                    vals.push(Math.round(value * zoom));
                });
                return res + vals;
            });
            return res;
        }
        pa = command(path);
        res = [];
        for (i = 0, ii = pa.length; i < ii; i++) {
            p = pa[i];
            r = pa[i][0].toLowerCase();
            if (r == "z") {
                r = "x";
            }
            for (j = 1, jj = p.length; j < jj; j++) {
                r += Math.round(p[j] * me.zoom) + (j != jj - 1 ? "," : "");
            }
            res.push(r);
        }
        return res.join(" ");
    },

    // @private - set of attributes which need to be translated from the sprite API to the native browser API
    translateAttrs: {
        radius: "r",
        radiusX: "rx",
        radiusY: "ry",
        lineWidth: "stroke-width",
        fillOpacity: "fill-opacity",
        strokeOpacity: "stroke-opacity",
        strokeLinejoin: "stroke-linejoin"
    },

    // @private - Minimun set of defaults for different types of sprites.
    minDefaults: {
        circle: {
            fill: "none",
            stroke: null,
            "stroke-width": null,
            opacity: null,
            "fill-opacity": null,
            "stroke-opacity": null
        },
        ellipse: {
            cx: 0,
            cy: 0,
            rx: 0,
            ry: 0,
            fill: "none",
            stroke: null,
            "stroke-width": null,
            opacity: null,
            "fill-opacity": null,
            "stroke-opacity": null
        },
        rect: {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            rx: 0,
            ry: 0,
            fill: "none",
            stroke: null,
            "stroke-width": null,
            opacity: null,
            "fill-opacity": null,
            "stroke-opacity": null
        },
        text: {
            x: 0,
            y: 0,
            "text-anchor": "start",
            font: '10px "Arial"',
            fill: "#000",
            stroke: null,
            "stroke-width": null,
            opacity: null,
            "fill-opacity": null,
            "stroke-opacity": null
        },
        path: {
            d: "M0,0",
            fill: "none",
            stroke: null,
            "stroke-width": null,
            opacity: null,
            "fill-opacity": null,
            "stroke-opacity": null
        },
        image: {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            preserveAspectRatio: "none",
            opacity: null
        }
    },

    // private
    onMouseEnter: function (e) {
        this.fireEvent("mouseenter", e);
    },

    // private
    onMouseLeave: function (e) {
        this.fireEvent("mouseleave", e);
    },

    // @private - Normalize a delegated single event from the main container to each sprite and sprite group
    processEvent: function (name, e) {
        var target = e.getTarget(),
            surface = this.surface,
            sprite;
        this.fireEvent(name, e);
        sprite = this.items.get(target.id);
        if (sprite) {
            sprite.fireEvent(name, sprite, e);
        }
    },

    // Create the VML element/elements and append them to the DOM
    createSpriteElement: function (sprite) {
        var me = this,
            attr = sprite.attr,
            type = sprite.type,
            zoom = me.zoom,
            vml = sprite.vml || (sprite.vml = {}),
            round = Math.round,
            el = (type === 'image') ? me.createNode('image') : me.createNode('shape'),
            path, skew, textPath;

        el.coordsize = zoom + ' ' + zoom;
        el.coordorigin = attr.coordorigin || "0 0";
        Ext.get(el).addCls(me.spriteCls);
        if (type == "text") {
            vml.path = path = me.createNode("path");
            path.textpathok = true;
            vml.textpath = textPath = me.createNode("textpath");
            textPath.on = true;
            el.appendChild(textPath);
            el.appendChild(path);
        }
        el.id = sprite.id;
        sprite.el = Ext.get(el);
        sprite.el.setStyle('zIndex', -me.zIndexShift);
        me.el.appendChild(el);
        if (type !== 'image') {
            skew = me.createNode("skew");
            skew.on = true;
            el.appendChild(skew);
            sprite.skew = skew;
        }
        sprite.matrix = new Ext.draw.Matrix();
        sprite.bbox = {
            plain: null,
            transform: null
        };

        this.applyAttrs(sprite);
        this.applyTransformations(sprite);        
        sprite.fireEvent("render", sprite);
        return sprite.el;
    },

    getBBoxText: function (sprite) {
        var vml = sprite.vml;
        return {
            x: vml.X + (vml.bbx || 0) - vml.W / 2,
            y: vml.Y - vml.H / 2,
            width: vml.W,
            height: vml.H
        };
    },

    applyAttrs: function (sprite) {
        var me = this,
            vml = sprite.vml,
            group = sprite.group,
            spriteAttr = sprite.attr,
            el = sprite.el,
            dom = el.dom,
            style, name, groups, i, ln, scrubbedAttrs, font, key,
            cx, cy, rx, ry;

        if (group) {
            groups = [].concat(group);
            ln = groups.length;
            for (i = 0; i < ln; i++) {
                group = groups[i];
                me.getGroup(group).add(sprite);
            }
            delete sprite.group;
        }
        scrubbedAttrs = me.scrubAttrs(sprite) || {};

        if (sprite.zIndexDirty) {
            me.setZIndex(sprite);
        }

        // Apply minimum default attributes
        Ext.applyIf(scrubbedAttrs, me.minDefaults[sprite.type]);

        if (sprite.type == 'image') {
            Ext.apply(sprite.attr, {
                x: scrubbedAttrs.x,
                y: scrubbedAttrs.y,
                width: scrubbedAttrs.width,
                height: scrubbedAttrs.height
            });
            el.setStyle({
                width: scrubbedAttrs.width + 'px',
                height: scrubbedAttrs.height + 'px'
            });
            dom.src = scrubbedAttrs.src;
        }

        if (dom.href) {
            dom.href = scrubbedAttrs.href;
        }
        if (dom.title) {
            dom.title = scrubbedAttrs.title;
        }
        if (dom.target) {
            dom.target = scrubbedAttrs.target;
        }
        if (dom.cursor) {
            dom.cursor = scrubbedAttrs.cursor;
        }

        // Change visibility
        if (sprite.dirtyHidden) {
            (scrubbedAttrs.hidden) ? me.hidePrim(sprite) : me.showPrim(sprite);
            sprite.dirtyHidden = false;
        }

        // Update path
        if (sprite.dirtyPath) {
            if (sprite.type == "circle" || sprite.type == "ellipse") {
                cx = scrubbedAttrs.x;
                cy = scrubbedAttrs.y;
                rx = scrubbedAttrs.rx || scrubbedAttrs.r || 0;
                ry = scrubbedAttrs.ry || scrubbedAttrs.r || 0;
                dom.path = Ext.String.format("ar{0},{1},{2},{3},{4},{1},{4},{1}",
                    Math.round((cx - rx) * me.zoom),
                    Math.round((cy - ry) * me.zoom),
                    Math.round((cx + rx) * me.zoom),
                    Math.round((cy + ry) * me.zoom),
                    Math.round(cx * me.zoom));
                sprite.dirtyPath = false;
            }
            else if (sprite.type !== "text" && sprite.type !== 'image') {
                sprite.attr.path = scrubbedAttrs.path = me.setPaths(sprite, scrubbedAttrs) || scrubbedAttrs.path;
                dom.path = me.path2vml(scrubbedAttrs.path);
                sprite.dirtyPath = false;
            }
        }

        // Apply clipping
        if ("clip-rect" in scrubbedAttrs) {
            me.setClip(sprite, scrubbedAttrs);
        }

        // Handle text (special handling required)
        if (sprite.type == "text") {
            me.setTextAttributes(sprite, scrubbedAttrs);
        }

        // Handle fill and opacity
        if (scrubbedAttrs.opacity || scrubbedAttrs['stroke-opacity'] || scrubbedAttrs.fill) {
            me.setFill(sprite, scrubbedAttrs);
        }

        // Handle stroke (all fills require a stroke element)
        if (scrubbedAttrs.stroke || scrubbedAttrs['stroke-opacity'] || scrubbedAttrs.fill) {
            me.setStroke(sprite, scrubbedAttrs);
        }

        //set styles
        style = spriteAttr.style;
        if (style) {
            el.setStyle(style);
        }

        sprite.dirty = false;
    },

    setZIndex: function (sprite) {
        var me = this,
            zIndex = sprite.attr.zIndex,
            shift = me.zIndexShift,
            items, iLen, item, i;

        if (zIndex < shift) {
            // This means bad thing happened.
            // The algorithm below will guarantee O(n) time.
            items = me.items.items;
            iLen = items.length;

            for (i = 0; i < iLen; i++) {
                if ((zIndex = items[i].attr.zIndex) && zIndex < shift) { // zIndex is no longer useful this case
                    shift = zIndex;
                }
            }

            me.zIndexShift = shift;
            for (i = 0; i < iLen; i++) {
                item = items[i];
                if (item.el) {
                    item.el.setStyle('zIndex', item.attr.zIndex - shift);
                }
                item.zIndexDirty = false;
            }
        } else if (sprite.el) {
            sprite.el.setStyle('zIndex', zIndex - shift);
            sprite.zIndexDirty = false;
        }
    },

    // Normalize all virtualized types into paths.
    setPaths: function (sprite, params) {
        var spriteAttr = sprite.attr, thickness = sprite.attr['stroke-width'] || 1;
        // Clear bbox cache
        sprite.bbox.plain = null;
        sprite.bbox.transform = null;
        if (sprite.type == 'circle') {
            spriteAttr.rx = spriteAttr.ry = params.r;
            return Ext.draw.Draw.ellipsePath(sprite);
        }
        else if (sprite.type == 'ellipse') {
            spriteAttr.rx = params.rx;
            spriteAttr.ry = params.ry;
            return Ext.draw.Draw.ellipsePath(sprite);
        }
        else if (sprite.type == 'rect') {
            spriteAttr.rx = spriteAttr.ry = params.r;
            return Ext.draw.Draw.rectPath(sprite);
        }
        else if (sprite.type == 'path' && spriteAttr.path) {
            return Ext.draw.Draw.pathToAbsolute(spriteAttr.path);
        }
        return false;
    },

    setFill: function (sprite, params) {
        var me = this,
            el = sprite.el.dom,
            fillEl = el.fill,
            newfill = false,
            opacity, gradient, fillUrl, rotation, angle;

        if (!fillEl) {
            // NOT an expando (but it sure looks like one)...
            fillEl = el.fill = me.createNode("fill");
            newfill = true;
        }
        if (Ext.isArray(params.fill)) {
            params.fill = params.fill[0];
        }
        if (params.fill == "none") {
            fillEl.on = false;
        }
        else {
            if (typeof params.opacity == "number") {
                fillEl.opacity = params.opacity;
            }
            if (typeof params["fill-opacity"] == "number") {
                fillEl.opacity = params["fill-opacity"];
            }
            fillEl.on = true;
            if (typeof params.fill == "string") {
                fillUrl = params.fill.match(me.fillUrlRe);
                if (fillUrl) {
                    fillUrl = fillUrl[1];
                    // If the URL matches one of the registered gradients, render that gradient
                    if (fillUrl.charAt(0) == "#") {
                        gradient = me.gradientsColl.getByKey(fillUrl.substring(1));
                    }
                    if (gradient) {
                        // VML angle is offset and inverted from standard, and must be adjusted to match rotation transform
                        rotation = params.rotation;
                        angle = -(gradient.angle + 270 + (rotation ? rotation.degrees : 0)) % 360;
                        // IE will flip the angle at 0 degrees...
                        if (angle === 0) {
                            angle = 180;
                        }
                        fillEl.angle = angle;
                        fillEl.type = "gradient";
                        fillEl.method = "sigma";
                        if (fillEl.colors) {
                            fillEl.colors.value = gradient.colors;
                        } else {
                            fillEl.colors = gradient.colors;
                        }
                    }
                    // Otherwise treat it as an image
                    else {
                        fillEl.src = fillUrl;
                        fillEl.type = "tile";
                    }
                }
                else {
                    fillEl.color = Ext.draw.Color.toHex(params.fill);
                    fillEl.src = "";
                    fillEl.type = "solid";
                }
            }
        }
        if (newfill) {
            el.appendChild(fillEl);
        }
    },

    setStroke: function (sprite, params) {
        var me = this,
            el = sprite.el.dom,
            strokeEl = sprite.strokeEl,
            newStroke = false,
            width, opacity;

        if (!strokeEl) {
            strokeEl = sprite.strokeEl = me.createNode("stroke");
            newStroke = true;
        }
        if (Ext.isArray(params.stroke)) {
            params.stroke = params.stroke[0];
        }
        if (!params.stroke || params.stroke == "none" || params.stroke == 0 || params["stroke-width"] == 0) {
            strokeEl.on = false;
        }
        else {
            strokeEl.on = true;
            if (params.stroke && !params.stroke.match(me.fillUrlRe)) {
                // VML does NOT support a gradient stroke :(
                strokeEl.color = Ext.draw.Color.toHex(params.stroke);
            }
            strokeEl.dashstyle = params["stroke-dasharray"] ? "dash" : "solid";
            strokeEl.joinstyle = params["stroke-linejoin"];
            strokeEl.endcap = params["stroke-linecap"] || "round";
            strokeEl.miterlimit = params["stroke-miterlimit"] || 8;
            width = parseFloat(params["stroke-width"] || 1) * 0.75;
            opacity = params["stroke-opacity"] || 1;
            // VML Does not support stroke widths under 1, so we're going to fiddle with stroke-opacity instead.
            if (Ext.isNumber(width) && width < 1) {
                strokeEl.weight = 1;
                strokeEl.opacity = opacity * width;
            }
            else {
                strokeEl.weight = width;
                strokeEl.opacity = opacity;
            }
        }
        if (newStroke) {
            el.appendChild(strokeEl);
        }
    },

    setClip: function (sprite, params) {
        var me = this,
            el = sprite.el,
            clipEl = sprite.clipEl,
            rect = String(params["clip-rect"]).split(me.separatorRe);
        if (!clipEl) {
            clipEl = sprite.clipEl = me.el.insertFirst(Ext.getDoc().dom.createElement("div"));
            clipEl.addCls(Ext.baseCSSPrefix + 'vml-sprite');
        }
        if (rect.length == 4) {
            rect[2] = +rect[2] + (+rect[0]);
            rect[3] = +rect[3] + (+rect[1]);
            clipEl.setStyle("clip", Ext.String.format("rect({1}px {2}px {3}px {0}px)", rect[0], rect[1], rect[2], rect[3]));
            clipEl.setSize(me.el.width, me.el.height);
        }
        else {
            clipEl.setStyle("clip", "");
        }
    },

    setTextAttributes: function (sprite, params) {
        var me = this,
            vml = sprite.vml,
            textStyle = vml.textpath.style,
            spanCacheStyle = me.span.style,
            zoom = me.zoom,
            round = Math.round,
            fontObj = {
                fontSize: "font-size",
                fontWeight: "font-weight",
                fontStyle: "font-style"
            },
            fontProp,
            paramProp;
        if (sprite.dirtyFont) {
            if (params.font) {
                textStyle.font = spanCacheStyle.font = params.font;
            }
            if (params["font-family"]) {
                textStyle.fontFamily = '"' + params["font-family"].split(",")[0].replace(me.fontFamilyRe, "") + '"';
                spanCacheStyle.fontFamily = params["font-family"];
            }

            for (fontProp in fontObj) {
                paramProp = params[fontObj[fontProp]];
                if (paramProp) {
                    textStyle[fontProp] = spanCacheStyle[fontProp] = paramProp;
                }
            }

            me.setText(sprite, params.text);

            if (vml.textpath.string) {
                me.span.innerHTML = String(vml.textpath.string).replace(/</g, "&#60;").replace(/&/g, "&#38;").replace(/\n/g, "<br/>");
            }
            vml.W = me.span.offsetWidth;
            vml.H = me.span.offsetHeight + 2; // TODO handle baseline differences and offset in VML Textpath

            // text-anchor emulation
            if (params["text-anchor"] == "middle") {
                textStyle["v-text-align"] = "center";
            }
            else if (params["text-anchor"] == "end") {
                textStyle["v-text-align"] = "right";
                vml.bbx = -Math.round(vml.W / 2);
            }
            else {
                textStyle["v-text-align"] = "left";
                vml.bbx = Math.round(vml.W / 2);
            }
        }
        vml.X = params.x;
        vml.Y = params.y;
        vml.path.v = Ext.String.format("m{0},{1}l{2},{1}", Math.round(vml.X * zoom), Math.round(vml.Y * zoom), Math.round(vml.X * zoom) + 1);
        // Clear bbox cache
        sprite.bbox.plain = null;
        sprite.bbox.transform = null;
        sprite.dirtyFont = false;
    },

    setText: function (sprite, text) {
        sprite.vml.textpath.string = Ext.htmlDecode(text);
    },

    hide: function () {
        this.el.hide();
    },

    show: function () {
        this.el.show();
    },

    hidePrim: function (sprite) {
        sprite.el.addCls(Ext.baseCSSPrefix + 'hide-visibility');
    },

    showPrim: function (sprite) {
        sprite.el.removeCls(Ext.baseCSSPrefix + 'hide-visibility');
    },

    setSize: function (width, height) {
        var me = this;
        width = width || me.width;
        height = height || me.height;
        me.width = width;
        me.height = height;

        if (me.el) {
            // Size outer div
            if (width != undefined) {
                me.el.setWidth(width);
            }
            if (height != undefined) {
                me.el.setHeight(height);
            }
        }

        me.callParent(arguments);
    },

    /**
     * @private Using the current viewBox property and the surface's width and height, calculate the
     * appropriate viewBoxShift that will be applied as a persistent transform to all sprites.
     */
    applyViewBox: function () {
        var me = this,
            viewBox = me.viewBox,
            width = me.width,
            height = me.height,
            items,
            iLen,
            i;
        
        me.callParent();

        if (viewBox && (width || height)) {
            items = me.items.items;
            iLen = items.length;

            for (i = 0; i < iLen; i++) {
                me.applyTransformations(items[i]);
            }
        }
    },

    onAdd: function (item) {
        this.callParent(arguments);
        if (this.el) {
            this.renderItem(item);
        }
    },

    onRemove: function (sprite) {
        if (sprite.el) {
            sprite.el.remove();
            delete sprite.el;
        }
        this.callParent(arguments);
    },

    render: function (container) {
        var me = this,
            doc = Ext.getDoc().dom,
            el;
        // VML Node factory method (createNode)
        if (!me.createNode) {
            try {
                if (!doc.namespaces.rvml) {
                    doc.namespaces.add("rvml", "urn:schemas-microsoft-com:vml");
                }
                me.createNode = function (tagName) {
                    return doc.createElement("<rvml:" + tagName + ' class="rvml">');
                };
            } catch (e) {
                me.createNode = function (tagName) {
                    return doc.createElement("<" + tagName + ' xmlns="urn:schemas-microsoft.com:vml" class="rvml">');
                };
            }
        }

        if (!me.el) {
            el = doc.createElement("div");
            me.el = Ext.get(el);
            me.el.addCls(me.baseVmlCls);

            // Measuring span (offscrren)
            me.span = doc.createElement("span");
            Ext.get(me.span).addCls(me.measureSpanCls);
            el.appendChild(me.span);
            me.el.setSize(me.width || 0, me.height || 0);
            container.appendChild(el);
            me.el.on({
                scope: me,
                mouseup: me.onMouseUp,
                mousedown: me.onMouseDown,
                mouseover: me.onMouseOver,
                mouseout: me.onMouseOut,
                mousemove: me.onMouseMove,
                mouseenter: me.onMouseEnter,
                mouseleave: me.onMouseLeave,
                click: me.onClick,
                dblclick: me.onDblClick
            });
        }
        me.renderAll();
    },

    renderAll: function () {
        this.items.each(this.renderItem, this);
    },

    redraw: function (sprite) {
        sprite.dirty = true;
        this.renderItem(sprite);
    },

    renderItem: function (sprite) {
        // Does the surface element exist?
        if (!this.el) {
            return;
        }

        // Create sprite element if necessary
        if (!sprite.el) {
            this.createSpriteElement(sprite);
        }

        if (sprite.dirty) {
            this.applyAttrs(sprite);
            if (sprite.dirtyTransform) {
                this.applyTransformations(sprite);
            }
        }
    },

    rotationCompensation: function (deg, dx, dy) {
        var matrix = new Ext.draw.Matrix();
        matrix.rotate(-deg, 0.5, 0.5);
        return {
            x: matrix.x(dx, dy),
            y: matrix.y(dx, dy)
        };
    },

    transform: function (sprite, matrixOnly) {
        var me = this,
            bbox = me.getBBox(sprite, true),
            cx = bbox.x + bbox.width * 0.5,
            cy = bbox.y + bbox.height * 0.5,
            matrix = new Ext.draw.Matrix(),
            transforms = sprite.transformations,
            transformsLength = transforms.length,
            i = 0,
            deltaDegrees = 0,
            deltaScaleX = 1,
            deltaScaleY = 1,
            flip = "",
            el = sprite.el,
            dom = el.dom,
            domStyle = dom.style,
            zoom = me.zoom,
            skew = sprite.skew,
            shift = me.viewBoxShift,
            deltaX, deltaY, transform, type, compensate, y, fill, newAngle, zoomScaleX, zoomScaleY, newOrigin, offset;


        for (; i < transformsLength; i++) {
            transform = transforms[i];
            type = transform.type;
            if (type == "translate") {
                matrix.translate(transform.x, transform.y);
            }
            else if (type == "rotate") {
                matrix.rotate(transform.degrees, transform.x, transform.y);
                deltaDegrees += transform.degrees;
            }
            else if (type == "scale") {
                matrix.scale(transform.x, transform.y, transform.centerX, transform.centerY);
                deltaScaleX *= transform.x;
                deltaScaleY *= transform.y;
            }
        }

        sprite.matrix = matrix.clone();

        if (matrixOnly) {
            return;
        }

        if (shift) {
            matrix.prepend(shift.scale, 0, 0, shift.scale, shift.dx * shift.scale, shift.dy * shift.scale);
        }

        // Hide element while we transform
        if (sprite.type != "image" && skew) {
            skew.origin = "0,0";
            // matrix transform via VML skew
            skew.matrix = matrix.toString();
            // skew.offset = '32767,1' OK
            // skew.offset = '32768,1' Crash
            // M$, R U kidding??
            offset = matrix.offset();
            if (offset[0] > 32767) {
                offset[0] = 32767;
            } else if (offset[0] < -32768) {
                offset[0] = -32768;
            }
            if (offset[1] > 32767) {
                offset[1] = 32767;
            } else if (offset[1] < -32768) {
                offset[1] = -32768;
            }
            skew.offset = offset;
        }
        else {
            domStyle.filter = matrix.toFilter();
            domStyle.left = Math.min(
                matrix.x(bbox.x, bbox.y),
                matrix.x(bbox.x + bbox.width, bbox.y),
                matrix.x(bbox.x, bbox.y + bbox.height),
                matrix.x(bbox.x + bbox.width, bbox.y + bbox.height)) + 'px';
            domStyle.top = Math.min(
                matrix.y(bbox.x, bbox.y),
                matrix.y(bbox.x + bbox.width, bbox.y),
                matrix.y(bbox.x, bbox.y + bbox.height),
                matrix.y(bbox.x + bbox.width, bbox.y + bbox.height)) + 'px';
        }
    },

    createItem: function (config) {
        return Ext.create('Ext.draw.Sprite', config);
    },

    getRegion: function () {
        return this.el.getRegion();
    },

    addCls: function (sprite, className) {
        if (sprite && sprite.el) {
            sprite.el.addCls(className);
        }
    },

    removeCls: function (sprite, className) {
        if (sprite && sprite.el) {
            sprite.el.removeCls(className);
        }
    },

    /**
     * Adds a definition to this Surface for a linear gradient. We convert the gradient definition
     * to its corresponding VML attributes and store it for later use by individual sprites.
     * @param {Object} gradient
     */
    addGradient: function (gradient) {
        var gradients = this.gradientsColl || (this.gradientsColl = Ext.create('Ext.util.MixedCollection')),
            colors = [],
            stops = Ext.create('Ext.util.MixedCollection'),
            keys,
            items,
            iLen,
            key,
            item,
            i;

        // Build colors string
        stops.addAll(gradient.stops);
        stops.sortByKey("ASC", function (a, b) {
            a = parseInt(a, 10);
            b = parseInt(b, 10);
            return a > b ? 1 : (a < b ? -1 : 0);
        });

        keys = stops.keys;
        items = stops.items;
        iLen = keys.length;

        for (i = 0; i < iLen; i++) {
            key = keys[i];
            item = items[i];
            colors.push(key + '% ' + item.color);
        }

        gradients.add(gradient.id, {
            colors: colors.join(","),
            angle: gradient.angle
        });
    },

    destroy: function () {
        var me = this;

        me.callParent(arguments);
        if (me.el) {
            me.el.remove();
        }
        delete me.el;
    }
});
