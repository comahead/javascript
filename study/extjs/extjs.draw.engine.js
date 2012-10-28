
/**
 * Exports a {@link Ext.draw.Surface Surface} to an image. To do this,
 * the svg string must be sent to a remote server and processed.
 *
 * # Sending the data
 *
 * A post request is made to the URL. The following fields are sent:
 *
 * + width: The width of the image
 * + height: The height of the image
 * + type: The image type to save as, see {@link #supportedTypes}
 * + svg: The svg string for the surface
 *
 * # The response
 *
 * It is expected that the user will be prompted with an image download.
 * As such, the following options should be set on the server:
 *
 * + Content-Disposition: 'attachment, filename="chart.png"'
 * + Content-Type: 'image/png'
 *
 * **Important**: By default, chart data is sent to a server operated
 * by Sencha to do data processing. You may change this default by
 * setting the {@link #defaultUrl} of this class.
 */
Ext.define('Ext.draw.engine.ImageExporter', {
    singleton: true,

    /**
     * @property {String} [defaultUrl="http://svg.sencha.io"]
     * The default URL to submit the form request.
     */
    defaultUrl: 'http://svg.sencha.io',

    /**
     * @property {Array} [supportedTypes=["image/png", "image/jpeg"]]
     * A list of export types supported by the server
     */
    supportedTypes: ['image/png', 'image/jpeg'],

    /**
     * @property {String} [widthParam="width"]
     * The name of the width parameter to be sent to the server.
     * The Sencha IO server expects it to be the default value.
     */
    widthParam: 'width',

    /**
     * @property {String} [heightParam="height"]
     * The name of the height parameter to be sent to the server.
     * The Sencha IO server expects it to be the default value.
     */
    heightParam: 'height',

    /**
     * @property {String} [typeParam="type"]
     * The name of the type parameter to be sent to the server.
     * The Sencha IO server expects it to be the default value.
     */
    typeParam: 'type',

    /**
     * @property {String} [svgParam="svg"]
     * The name of the svg parameter to be sent to the server.
     * The Sencha IO server expects it to be the default value.
     */
    svgParam: 'svg',

    formCls: Ext.baseCSSPrefix + 'hide-display',

    /**
     * Exports the surface to an image
     * @param {Ext.draw.Surface} surface The surface to export
     * @param {Object} [config] The following config options are supported:
     *
     * @param {Number} config.width A width to send to the server to for
     * configuring the image height
     *
     * @param {Number} config.height A height to send to the server for
     * configuring the image height
     *
     * @param {String} config.url The url to post the data to. Defaults to
     * the {@link #defaultUrl} configuration on the class.
     *
     * @param {String} config.type The type of image to export. See the
     * {@link #supportedTypes}
     *
     * @param {String} config.widthParam The name of the width parameter to send
     * to the server. Defaults to {@link #widthParam}
     *
     * @param {String} config.heightParam The name of the height parameter to send
     * to the server. Defaults to {@link #heightParam}
     *
     * @param {String} config.typeParam The name of the type parameter to send
     * to the server. Defaults to {@link #typeParam}
     *
     * @param {String} config.svgParam The name of the svg parameter to send
     * to the server. Defaults to {@link #svgParam}
     *
     * @return {Boolean} True if the surface was successfully sent to the server.
     */
    generate: function(surface, config) {
        config = config || {};
        var me = this,
            type = config.type,
            form;

        if (Ext.Array.indexOf(me.supportedTypes, type) === -1) {
            return false;
        }

        form = Ext.getBody().createChild({
            tag: 'form',
            method: 'POST',
            action: config.url || me.defaultUrl,
            cls: me.formCls,
            children: [{
                tag: 'input',
                type: 'hidden',
                name: config.widthParam || me.widthParam,
                value: config.width || surface.width
            }, {
                tag: 'input',
                type: 'hidden',
                name: config.heightParam || me.heightParam,
                value: config.height || surface.height
            }, {
                tag: 'input',
                type: 'hidden',
                name: config.typeParam || me.typeParam,
                value: type
            }, {
                tag: 'input',
                type: 'hidden',
                name: config.svgParam || me.svgParam
            }]
        });

        // Assign the data on the value so it doesn't get messed up in the html insertion
        form.last(null, true).value = Ext.draw.engine.SvgExporter.generate(surface);

        form.dom.submit();
        form.remove();
        return true;
    }

});

/**
 * A utility class for exporting a {@link Ext.draw.Surface Surface} to a string
 * that may be saved or used for processing on the server.
 *
 * @singleton
 */
Ext.define('Ext.draw.engine.SvgExporter', function(){
   var commaRe = /,/g,
       fontRegex = /(-?\d*\.?\d*){1}(em|ex|px|in|cm|mm|pt|pc|%)\s('*.*'*)/,
       rgbColorRe = /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g,
       rgbaColorRe = /rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,([\d\.]+)\)/g,
       surface, len, width, height,

   init = function(s){
       surface = s;
       len = surface.length;
       width = surface.width;
       height = surface.height;
   },
   spriteProcessor = {
       path: function(sprite){

           var attr = sprite.attr,
               path = attr.path,
               pathString = '',
               props, p, pLen;

           if (Ext.isArray(path[0])) {
               pLen = path.length;
               for (p = 0; p < pLen; p++) {
                   pathString += path[p].join(' ');
               }
           } else if (Ext.isArray(path)) {
               pathString = path.join(' ');
           } else {
               pathString = path.replace(commaRe,' ');
           }

           props = toPropertyString({
               d: pathString,
               fill: attr.fill || 'none',
               stroke: attr.stroke,
               'fill-opacity': attr.opacity,
               'stroke-width': attr['stroke-width'],
               'stroke-opacity': attr['stroke-opacity'],
               "z-index": attr.zIndex,
               transform: sprite.matrix.toSvg()
           });

           return '<path ' + props + '/>';
       },
       text: function(sprite){

           // TODO
           // implement multi line support (@see Svg.js tuneText)

           var attr = sprite.attr,
               match = fontRegex.exec(attr.font),
               size = (match && match[1]) || "12",
               // default font family is Arial
               family = (match && match[3]) || 'Arial',
               text = attr.text,
               factor = (Ext.isFF3_0 || Ext.isFF3_5) ? 2 : 4,
               tspanString = '',
               props;

           sprite.getBBox();
           tspanString += '<tspan x="' + (attr.x || '') + '" dy="';
           tspanString += (size/factor)+'">';
           tspanString += Ext.htmlEncode(text) + '</tspan>';


           props = toPropertyString({
               x: attr.x,
               y: attr.y,
               'font-size': size,
               'font-family': family,
               'font-weight': attr['font-weight'],
               'text-anchor': attr['text-anchor'],
               // if no fill property is set it will be black
               fill: attr.fill || '#000',
               'fill-opacity': attr.opacity,
               transform: sprite.matrix.toSvg()
           });



           return '<text '+ props + '>' +  tspanString + '</text>';
       },
       rect: function(sprite){

           var attr = sprite.attr,
               props =  toPropertyString({
                   x: attr.x,
                   y: attr.y,
                   rx: attr.rx,
                   ry: attr.ry,
                   width: attr.width,
                   height: attr.height,
                   fill: attr.fill || 'none',
                   'fill-opacity': attr.opacity,
                   stroke: attr.stroke,
                   'stroke-opacity': attr['stroke-opacity'],
                   'stroke-width':attr['stroke-width'],
                   transform: sprite.matrix && sprite.matrix.toSvg()
               });

           return '<rect ' + props + '/>';
       },
       circle: function(sprite){

           var attr = sprite.attr,
               props = toPropertyString({
                   cx: attr.x,
                   cy: attr.y,
                   r: attr.radius,
                   fill: attr.translation.fill || attr.fill || 'none',
                   'fill-opacity': attr.opacity,
                   stroke: attr.stroke,
                   'stroke-opacity': attr['stroke-opacity'],
                   'stroke-width':attr['stroke-width'],
                   transform: sprite.matrix.toSvg()
               });

           return '<circle ' + props + ' />';
       },
       image: function(sprite){

           var attr = sprite.attr,
               props = toPropertyString({
                   x: attr.x - (attr.width/2 >> 0),
                   y: attr.y - (attr.height/2 >> 0),
                   width: attr.width,
                   height: attr.height,
                   'xlink:href': attr.src,
                   transform: sprite.matrix.toSvg()
               });

           return '<image ' + props + ' />';
       }
   },
   svgHeader = function(){
       var svg = '<?xml version="1.0" standalone="yes"?>';
       svg += '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">';
       return svg;
   },
   svgContent = function(){
       var svg = '<svg width="'+width+'px" height="'+height+'px" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1">',
           defs = '', item, itemsLen, items, gradient,
           getSvgString, colorstops, stop,
           coll, keys, colls, k, kLen, key, collI, i, j, stopsLen, sortedItems, za, zb;

       items = surface.items.items;
       itemsLen = items.length;


       getSvgString = function(node){

           var childs = node.childNodes,
               childLength = childs.length,
               i = 0,
               attrLength,
               j,
               svgString = '', child, attr, tagName, attrItem;

               for(; i < childLength; i++){
                   child = childs[i];
                   attr = child.attributes;
                   tagName = child.tagName;

                   svgString += '<' +tagName;

                   for(j = 0, attrLength = attr.length; j < attrLength; j++){
                       attrItem = attr.item(j);
                       svgString += ' '+attrItem.name+'="'+attrItem.value+'"';
                   }

                   svgString += '>';

                   if(child.childNodes.length > 0){
                       svgString += getSvgString(child);
                   }

                   svgString += '</' + tagName + '>';

               }
           return svgString;
       };


       if(surface.getDefs){
           defs = getSvgString(surface.getDefs());
       }else{
           // IE
           coll = surface.gradientsColl;
           if (coll) {
               keys  = coll.keys;
               colls = coll.items;
               k     = 0;
               kLen  = keys.length;
           }

           for (; k < kLen; k++) {
               key   = keys[k];
               collI = colls[k];

               gradient = surface.gradientsColl.getByKey(key);
               defs += '<linearGradient id="' + key + '" x1="0" y1="0" x2="1" y2="1">';

               var color = gradient.colors.replace(rgbColorRe, 'rgb($1|$2|$3)');
               color = color.replace(rgbaColorRe, 'rgba($1|$2|$3|$4)')
               colorstops = color.split(',');
               for(i=0, stopsLen = colorstops.length; i < stopsLen; i++){
                   stop = colorstops[i].split(' ');
                   color = Ext.draw.Color.fromString(stop[1].replace(/\|/g,','));
                   defs += '<stop offset="'+stop[0]+'" stop-color="' + color.toString() + '" stop-opacity="1"></stop>';
               }
               defs += '</linearGradient>';
           }
       }

       svg += '<defs>' + defs + '</defs>';

       // thats the background rectangle
       svg += spriteProcessor.rect({
           attr: {
                   width: '100%',
                   height: '100%',
                   fill: '#fff',
                   stroke: 'none',
                   opacity: '0'
           }
       });

       // Sort the items (stable sort guaranteed)
       sortedItems = new Array(itemsLen);
       for(i = 0; i < itemsLen; i++){
           sortedItems[i] = i;
       }
       sortedItems.sort(function (a, b) {
           za = items[a].attr.zIndex || 0;
           zb = items[b].attr.zIndex || 0;
           if (za == zb) {
               return a - b;
           }
           return za - zb;
       });

       for(i = 0; i < itemsLen; i++){
           item = items[sortedItems[i]];
           if(!item.attr.hidden){
               svg += spriteProcessor[item.type](item);
           }
       }

       svg += '</svg>';

       return svg;
   },
   toPropertyString = function(obj){
       var propString = '',
           key;

       for(key in obj){

           if(obj.hasOwnProperty(key) && obj[key] != null){
               propString += key +'="'+ obj[key]+'" ';
           }

       }

       return propString;
   };

   return {
       singleton: true,

       /**
        * Exports the passed surface to a SVG string representation
        * @param {Ext.draw.Surface} surface The surface to export
        * @param {Object} [config] Any configuration for the export. Currently this is
        * unused but may provide more options in the future
        * @return {String} The SVG as a string
        */
       generate: function(surface, config){
           config = config || {};
           init(surface);
           return svgHeader() + svgContent();
       }
   };
});