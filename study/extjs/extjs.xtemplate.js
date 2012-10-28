
/**
 * This class compiles the XTemplate syntax into a function object. The function is used
 * like so:
 * 
 *      function (out, values, parent, xindex, xcount) {
 *          // out is the output array to store results
 *          // values, parent, xindex and xcount have their historical meaning
 *      }
 *
 * @markdown
 * @private
 */
Ext.define('Ext.XTemplateCompiler', {
    extend: 'Ext.XTemplateParser',

    // Chrome really likes "new Function" to realize the code block (as in it is
    // 2x-3x faster to call it than using eval), but Firefox chokes on it badly.
    // IE and Opera are also fine with the "new Function" technique.
    useEval: Ext.isGecko,

    // See http://jsperf.com/nige-array-append for quickest way to append to an array of unknown length
    // (Due to arbitrary code execution inside a template, we cannot easily track the length in  var)
    // On IE6 and 7 myArray[myArray.length]='foo' is better. On other browsers myArray.push('foo') is better.
    useIndex: Ext.isIE6 || Ext.isIE7,

    useFormat: true,
    
    propNameRe: /^[\w\d\$]*$/,

    compile: function (tpl) {
        var me = this,
            code = me.generate(tpl);

        // When using "new Function", we have to pass our "Ext" variable to it in order to
        // support sandboxing. If we did not, the generated function would use the global
        // "Ext", not the "Ext" from our sandbox (scope chain).
        //
        return me.useEval ? me.evalTpl(code) : (new Function('Ext', code))(Ext);
    },

    generate: function (tpl) {
        var me = this,
            // note: Ext here is properly sandboxed
            definitions = 'var fm=Ext.util.Format,ts=Object.prototype.toString;',
            code;

        // Track how many levels we use, so that we only "var" each level's variables once
        me.maxLevel = 0;

        me.body = [
            'var c0=values, a0=' + me.createArrayTest(0) + ', p0=parent, n0=xcount, i0=xindex, v;\n'
        ];
        if (me.definitions) {
            if (typeof me.definitions === 'string') {
                me.definitions = [me.definitions, definitions ];
            } else {
                me.definitions.push(definitions);
            }
        } else {
            me.definitions = [ definitions ];
        }
        me.switches = [];

        me.parse(tpl);

        me.definitions.push(
            (me.useEval ? '$=' : 'return') + ' function (' + me.fnArgs + ') {',
                me.body.join(''),
            '}'
        );

        code = me.definitions.join('\n');

        // Free up the arrays.
        me.definitions.length = me.body.length = me.switches.length = 0;
        delete me.definitions;
        delete me.body;
        delete me.switches;

        return code;
    },

    //-----------------------------------
    // XTemplateParser callouts

    doText: function (text) {
        var me = this,
            out = me.body;

        text = text.replace(me.aposRe, "\\'").replace(me.newLineRe, '\\n');
        if (me.useIndex) {
            out.push('out[out.length]=\'', text, '\'\n');
        } else {
            out.push('out.push(\'', text, '\')\n');
        }
    },

    doExpr: function (expr) {
        var out = this.body;
        out.push('if ((v=' + expr + ')!==undefined) out');

        // Coerce value to string using concatenation of an empty string literal.
        // See http://jsperf.com/tostringvscoercion/5
        if (this.useIndex) {
             out.push('[out.length]=v+\'\'\n');
        } else {
             out.push('.push(v+\'\')\n');
        }
    },

    doTag: function (tag) {
        this.doExpr(this.parseTag(tag));
    },

    doElse: function () {
        this.body.push('} else {\n');
    },

    doEval: function (text) {
        this.body.push(text, '\n');
    },

    doIf: function (action, actions) {
        var me = this;

        // If it's just a propName, use it directly in the if
        if (action === '.') {
            me.body.push('if (values) {\n');
        } else if (me.propNameRe.test(action)) {
            me.body.push('if (', me.parseTag(action), ') {\n');
        }
        // Otherwise, it must be an expression, and needs to be returned from an fn which uses with(values)
        else {
            me.body.push('if (', me.addFn(action), me.callFn, ') {\n');
        }
        if (actions.exec) {
            me.doExec(actions.exec);
        }
    },

    doElseIf: function (action, actions) {
        var me = this;

        // If it's just a propName, use it directly in the else if
        if (action === '.') {
            me.body.push('else if (values) {\n');
        } else if (me.propNameRe.test(action)) {
            me.body.push('} else if (', me.parseTag(action), ') {\n');
        }
        // Otherwise, it must be an expression, and needs to be returned from an fn which uses with(values)
        else {
            me.body.push('} else if (', me.addFn(action), me.callFn, ') {\n');
        }
        if (actions.exec) {
            me.doExec(actions.exec);
        }
    },

    doSwitch: function (action) {
        var me = this;

        // If it's just a propName, use it directly in the switch
        if (action === '.') {
            me.body.push('switch (values) {\n');
        } else if (me.propNameRe.test(action)) {
            me.body.push('switch (', me.parseTag(action), ') {\n');
        }
        // Otherwise, it must be an expression, and needs to be returned from an fn which uses with(values)
        else {
            me.body.push('switch (', me.addFn(action), me.callFn, ') {\n');
        }
        me.switches.push(0);
    },

    doCase: function (action) {
        var me = this,
            cases = Ext.isArray(action) ? action : [action],
            n = me.switches.length - 1,
            match, i;

        if (me.switches[n]) {
            me.body.push('break;\n');
        } else {
            me.switches[n]++;
        }

        for (i = 0, n = cases.length; i < n; ++i) {
            match = me.intRe.exec(cases[i]);
            cases[i] = match ? match[1] : ("'" + cases[i].replace(me.aposRe,"\\'") + "'");
        }

        me.body.push('case ', cases.join(': case '), ':\n');
    },

    doDefault: function () {
        var me = this,
            n = me.switches.length - 1;

        if (me.switches[n]) {
            me.body.push('break;\n');
        } else {
            me.switches[n]++;
        }

        me.body.push('default:\n');
    },

    doEnd: function (type, actions) {
        var me = this,
            L = me.level-1;

        if (type == 'for') {
            /*
            To exit a for loop we must restore the outer loop's context. The code looks
            like this (which goes with that produced by doFor:

                    for (...) { // the part generated by doFor
                        ...  // the body of the for loop

                        // ... any tpl for exec statement goes here...
                    }
                    parent = p1;
                    values = r2;
                    xcount = n1;
                    xindex = i1
            */
            if (actions.exec) {
                me.doExec(actions.exec);
            }

            me.body.push('}\n');
            me.body.push('parent=p',L,';values=r',L+1,';xcount=n',L,';xindex=i',L,'\n');
        } else if (type == 'if' || type == 'switch') {
            me.body.push('}\n');
        }
    },

    doFor: function (action, actions) {
        var me = this,
            s,
            L = me.level,
            up = L-1,
            pL = 'p' + L,
            parentAssignment;

        // If it's just a propName, use it directly in the switch
        if (action === '.') {
            s = 'values';
        } else if (me.propNameRe.test(action)) {
            s = me.parseTag(action);
        }
        // Otherwise, it must be an expression, and needs to be returned from an fn which uses with(values)
        else {
            s = me.addFn(action) + me.callFn;
        }

        /*
        We are trying to produce a block of code that looks like below. We use the nesting
        level to uniquely name the control variables.

            // Omit "var " if we have already been through level 2
            var i2 = 0,
                n2 = 0,
                c2 = values['propName'],
                    // c2 is the context object for the for loop
                a2 = Array.isArray(c2);
                p2 = c1,
                    // p2 is the parent context (of the outer for loop)
                r2 = values
                    // r2 is the values object to 

            // If iterating over the current data, the parent is always set to c2
            parent = c2;
            // If iterating over a property in an object, set the parent to the object
            parent = a1 ? c1[i1] : p2 // set parent
            if (c2) {
                if (a2) {
                    n2 = c2.length;
                } else if (c2.isMixedCollection) {
                    c2 = c2.items;
                    n2 = c2.length;
                } else if (c2.isStore) {
                    c2 = c2.data.items;
                    n2 = c2.length;
                } else {
                    c2 = [ c2 ];
                    n2 = 1;
                }
            }
            // i2 is the loop index and n2 is the number (xcount) of this for loop
            for (xcount = n2; i2 < n2; ++i2) {
                values = c2[i2]           // adjust special vars to inner scope
                xindex = i2 + 1           // xindex is 1-based

        The body of the loop is whatever comes between the tpl and /tpl statements (which
        is handled by doEnd).
        */

        // Declare the vars for a particular level only if we have not already declared them.
        if (me.maxLevel < L) {
            me.maxLevel = L;
            me.body.push('var ');
        }
        
        if (action == '.') {
            parentAssignment = 'c' + L;
        } else {
            parentAssignment = 'a' + up + '?c' + up + '[i' + up + ']:p' + L;
        }
        
        me.body.push('i',L,'=0,n', L, '=0,c',L,'=',s,',a',L,'=', me.createArrayTest(L), ',p',L,'=c',up,',r',L,'=values;\n',
            'parent=',parentAssignment,'\n',
            'if (c',L,'){if(a',L,'){n', L,'=c', L, '.length;}else if (c', L, '.isMixedCollection){c',L,'=c',L,'.items;n',L,'=c',L,'.length;}else if(c',L,'.isStore){c',L,'=c',L,'.data.items;n',L,'=c',L,'.length;}else{c',L,'=[c',L,'];n',L,'=1;}}\n',
            'for (xcount=n',L,';i',L,'<n'+L+';++i',L,'){\n',
            'values=c',L,'[i',L,']');
        if (actions.propName) {
            me.body.push('.', actions.propName);
        }
        me.body.push('\n',
            'xindex=i',L,'+1\n');
    },

    createArrayTest: ('isArray' in Array) ? function(L) {
        return 'Array.isArray(c' + L + ')';
    } : function(L) {
        return 'ts.call(c' + L + ')==="[object Array]"';
    },

    doExec: function (action, actions) {
        var me = this,
            name = 'f' + me.definitions.length;

        me.definitions.push('function ' + name + '(' + me.fnArgs + ') {',
                            ' try { with(values) {',
                            '  ' + action,
                            ' }} catch(e) {',
                            'Ext.log("XTemplate Error: " + e.message);',
                            '}',
                      '}');

        me.body.push(name + me.callFn + '\n');
    },

    //-----------------------------------
    // Internal

    addFn: function (body) {
        var me = this,
            name = 'f' + me.definitions.length;

        if (body === '.') {
            me.definitions.push('function ' + name + '(' + me.fnArgs + ') {',
                            ' return values',
                       '}');
        } else if (body === '..') {
            me.definitions.push('function ' + name + '(' + me.fnArgs + ') {',
                            ' return parent',
                       '}');
        } else {
            me.definitions.push('function ' + name + '(' + me.fnArgs + ') {',
                            ' try { with(values) {',
                            '  return(' + body + ')',
                            ' }} catch(e) {',
                            'Ext.log("XTemplate Error: " + e.message);',
                            '}',
                       '}');
        }

        return name;
    },

    parseTag: function (tag) {
        var me = this,
            m = me.tagRe.exec(tag),
            name = m[1],
            format = m[2],
            args = m[3],
            math = m[4],
            v;

        // name = "." - Just use the values object.
        if (name == '.') {
            // filter to not include arrays/objects/nulls
            if (!me.validTypes) {
                me.definitions.push('var validTypes={string:1,number:1,boolean:1};');
                me.validTypes = true;
            }
            v = 'validTypes[typeof values] || ts.call(values) === "[object Date]" ? values : ""';
        }
        // name = "#" - Use the xindex
        else if (name == '#') {
            v = 'xindex';
        }
        else if (name.substr(0, 7) == "parent.") {
            v = name;
        }
        // compound Javascript property name (e.g., "foo.bar")
        else if (isNaN(name) && name.indexOf('-') == -1 && name.indexOf('.') != -1) {
            v = "values." + name;
        }
        // number or a '-' in it or a single word (maybe a keyword): use array notation
        // (http://jsperf.com/string-property-access/4)
        else {    
            v = "values['" + name + "']";
        }

        if (math) {
            v = '(' + v + math + ')';
        }

        if (format && me.useFormat) {
            args = args ? ',' + args : "";
            if (format.substr(0, 5) != "this.") {
                format = "fm." + format + '(';
            } else {
                format += '(';
            }
        } else {
            return v;
        }

        return format + v + args + ')';
    },

    // @private
    evalTpl: function ($) {

        // We have to use eval to realize the code block and capture the inner func we also
        // don't want a deep scope chain. We only do this in Firefox and it is also unhappy
        // with eval containing a return statement, so instead we assign to "$" and return
        // that. Because we use "eval", we are automatically sandboxed properly.
        eval($);
        return $;
    },

    newLineRe: /\r\n|\r|\n/g,
    aposRe: /[']/g,
    intRe:  /^\s*(\d+)\s*$/,
    tagRe:  /([\w-\.\#]+)(?:\:([\w\.]*)(?:\((.*?)?\))?)?(\s?[\+\-\*\/]\s?[\d\.\+\-\*\/\(\)]+)?/

}, function () {
    var proto = this.prototype;

    proto.fnArgs = 'out,values,parent,xindex,xcount';
    proto.callFn = '.call(this,' + proto.fnArgs + ')';
});

/**
 * A template class that supports advanced functionality like:
 *
 * - Autofilling arrays using templates and sub-templates
 * - Conditional processing with basic comparison operators
 * - Basic math function support
 * - Execute arbitrary inline code with special built-in template variables
 * - Custom member functions
 * - Many special tags and built-in operators that aren't defined as part of the API, but are supported in the templates that can be created
 *
 * XTemplate provides the templating mechanism built into {@link Ext.view.View}.
 *
 * The {@link Ext.Template} describes the acceptable parameters to pass to the constructor. The following examples
 * demonstrate all of the supported features.
 *
 * # Sample Data
 *
 * This is the data object used for reference in each code example:
 *
 *     var data = {
 *         name: 'Don Griffin',
 *         title: 'Senior Technomage',
 *         company: 'Sencha Inc.',
 *         drinks: ['Coffee', 'Water', 'More Coffee'],
 *         kids: [
 *             { name: 'Aubrey',  age: 17 },
 *             { name: 'Joshua',  age: 13 },
 *             { name: 'Cale',    age: 10 },
 *             { name: 'Nikol',   age: 5 },
 *             { name: 'Solomon', age: 0 }
 *         ]
 *     };
 *
 * # Auto filling of arrays
 *
 * The **tpl** tag and the **for** operator are used to process the provided data object:
 *
 * - If the value specified in for is an array, it will auto-fill, repeating the template block inside the tpl
 *   tag for each item in the array.
 * - If for="." is specified, the data object provided is examined.
 * - While processing an array, the special variable {#} will provide the current array index + 1 (starts at 1, not 0).
 *
 * Examples:
 *
 *     <tpl for=".">...</tpl>       // loop through array at root node
 *     <tpl for="foo">...</tpl>     // loop through array at foo node
 *     <tpl for="foo.bar">...</tpl> // loop through array at foo.bar node
 *
 * Using the sample data above:
 *
 *     var tpl = new Ext.XTemplate(
 *         '<p>Kids: ',
 *         '<tpl for=".">',       // process the data.kids node
 *             '<p>{#}. {name}</p>',  // use current array index to autonumber
 *         '</tpl></p>'
 *     );
 *     tpl.overwrite(panel.body, data.kids); // pass the kids property of the data object
 *
 * An example illustrating how the **for** property can be leveraged to access specified members of the provided data
 * object to populate the template:
 *
 *     var tpl = new Ext.XTemplate(
 *         '<p>Name: {name}</p>',
 *         '<p>Title: {title}</p>',
 *         '<p>Company: {company}</p>',
 *         '<p>Kids: ',
 *         '<tpl for="kids">',     // interrogate the kids property within the data
 *             '<p>{name}</p>',
 *         '</tpl></p>'
 *     );
 *     tpl.overwrite(panel.body, data);  // pass the root node of the data object
 *
 * Flat arrays that contain values (and not objects) can be auto-rendered using the special **`{.}`** variable inside a
 * loop. This variable will represent the value of the array at the current index:
 *
 *     var tpl = new Ext.XTemplate(
 *         '<p>{name}\'s favorite beverages:</p>',
 *         '<tpl for="drinks">',
 *             '<div> - {.}</div>',
 *         '</tpl>'
 *     );
 *     tpl.overwrite(panel.body, data);
 *
 * When processing a sub-template, for example while looping through a child array, you can access the parent object's
 * members via the **parent** object:
 *
 *     var tpl = new Ext.XTemplate(
 *         '<p>Name: {name}</p>',
 *         '<p>Kids: ',
 *         '<tpl for="kids">',
 *             '<tpl if="age &gt; 1">',
 *                 '<p>{name}</p>',
 *                 '<p>Dad: {parent.name}</p>',
 *             '</tpl>',
 *         '</tpl></p>'
 *     );
 *     tpl.overwrite(panel.body, data);
 *
 * # Conditional processing with basic comparison operators
 *
 * The **tpl** tag and the **if** operator are used to provide conditional checks for deciding whether or not to render
 * specific parts of the template.
 *
 * Using the sample data above:
 *
 *     var tpl = new Ext.XTemplate(
 *         '<p>Name: {name}</p>',
 *         '<p>Kids: ',
 *         '<tpl for="kids">',
 *             '<tpl if="age &gt; 1">',
 *                 '<p>{name}</p>',
 *             '</tpl>',
 *         '</tpl></p>'
 *     );
 *     tpl.overwrite(panel.body, data);
 *
 * More advanced conditionals are also supported:
 *
 *     var tpl = new Ext.XTemplate(
 *         '<p>Name: {name}</p>',
 *         '<p>Kids: ',
 *         '<tpl for="kids">',
 *             '<p>{name} is a ',
 *             '<tpl if="age &gt;= 13">',
 *                 '<p>teenager</p>',
 *             '<tpl elseif="age &gt;= 2">',
 *                 '<p>kid</p>',
 *             '<tpl else>',
 *                 '<p>baby</p>',
 *             '</tpl>',
 *         '</tpl></p>'
 *     );
 *
 *     var tpl = new Ext.XTemplate(
 *         '<p>Name: {name}</p>',
 *         '<p>Kids: ',
 *         '<tpl for="kids">',
 *             '<p>{name} is a ',
 *             '<tpl switch="name">',
 *                 '<tpl case="Aubrey" case="Nikol">',
 *                     '<p>girl</p>',
 *                 '<tpl default>',
 *                     '<p>boy</p>',
 *             '</tpl>',
 *         '</tpl></p>'
 *     );
 *
 * A `break` is implied between each case and default, however, multiple cases can be listed
 * in a single &lt;tpl&gt; tag.
 *
 * # Using double quotes
 *
 * Examples:
 *
 *     var tpl = new Ext.XTemplate(
 *         "<tpl if='age &gt; 1 && age &lt; 10'>Child</tpl>",
 *         "<tpl if='age &gt;= 10 && age &lt; 18'>Teenager</tpl>",
 *         "<tpl if='this.isGirl(name)'>...</tpl>",
 *         '<tpl if="id == \'download\'">...</tpl>',
 *         "<tpl if='needsIcon'><img src='{icon}' class='{iconCls}'/></tpl>",
 *         "<tpl if='name == \"Don\"'>Hello</tpl>"
 *     );
 *
 * # Basic math support
 *
 * The following basic math operators may be applied directly on numeric data values:
 *
 *     + - * /
 *
 * For example:
 *
 *     var tpl = new Ext.XTemplate(
 *         '<p>Name: {name}</p>',
 *         '<p>Kids: ',
 *         '<tpl for="kids">',
 *             '<tpl if="age &gt; 1">',  // <-- Note that the > is encoded
 *                 '<p>{#}: {name}</p>',  // <-- Auto-number each item
 *                 '<p>In 5 Years: {age+5}</p>',  // <-- Basic math
 *                 '<p>Dad: {parent.name}</p>',
 *             '</tpl>',
 *         '</tpl></p>'
 *     );
 *     tpl.overwrite(panel.body, data);
 *
 * # Execute arbitrary inline code with special built-in template variables
 *
 * Anything between `{[ ... ]}` is considered code to be executed in the scope of the template.
 * The expression is evaluated and the result is included in the generated result. There are
 * some special variables available in that code:
 *
 * - **out**: The output array into which the template is being appended (using `push` to later
 *   `join`).
 * - **values**: The values in the current scope. If you are using scope changing sub-templates,
 *   you can change what values is.
 * - **parent**: The scope (values) of the ancestor template.
 * - **xindex**: If you are in a looping template, the index of the loop you are in (1-based).
 * - **xcount**: If you are in a looping template, the total length of the array you are looping.
 *
 * This example demonstrates basic row striping using an inline code block and the xindex variable:
 *
 *     var tpl = new Ext.XTemplate(
 *         '<p>Name: {name}</p>',
 *         '<p>Company: {[values.company.toUpperCase() + ", " + values.title]}</p>',
 *         '<p>Kids: ',
 *         '<tpl for="kids">',
 *             '<div class="{[xindex % 2 === 0 ? "even" : "odd"]}">',
 *             '{name}',
 *             '</div>',
 *         '</tpl></p>'
 *      );
 *
 * Any code contained in "verbatim" blocks (using "{% ... %}") will be inserted directly in
 * the generated code for the template. These blocks are not included in the output. This
 * can be used for simple things like break/continue in a loop, or control structures or
 * method calls (when they don't produce output). The `this` references the template instance.
 *
 *     var tpl = new Ext.XTemplate(
 *         '<p>Name: {name}</p>',
 *         '<p>Company: {[values.company.toUpperCase() + ", " + values.title]}</p>',
 *         '<p>Kids: ',
 *         '<tpl for="kids">',
 *             '{% if (xindex % 2 === 0) continue; %}',
 *             '{name}',
 *             '{% if (xindex > 100) break; %}',
 *             '</div>',
 *         '</tpl></p>'
 *      );
 *
 * # Template member functions
 *
 * One or more member functions can be specified in a configuration object passed into the XTemplate constructor for
 * more complex processing:
 *
 *     var tpl = new Ext.XTemplate(
 *         '<p>Name: {name}</p>',
 *         '<p>Kids: ',
 *         '<tpl for="kids">',
 *             '<tpl if="this.isGirl(name)">',
 *                 '<p>Girl: {name} - {age}</p>',
 *             '<tpl else>',
 *                 '<p>Boy: {name} - {age}</p>',
 *             '</tpl>',
 *             '<tpl if="this.isBaby(age)">',
 *                 '<p>{name} is a baby!</p>',
 *             '</tpl>',
 *         '</tpl></p>',
 *         {
 *             // XTemplate configuration:
 *             disableFormats: true,
 *             // member functions:
 *             isGirl: function(name){
 *                return name == 'Aubrey' || name == 'Nikol';
 *             },
 *             isBaby: function(age){
 *                return age < 1;
 *             }
 *         }
 *     );
 *     tpl.overwrite(panel.body, data);
 */
Ext.define('Ext.XTemplate', {
    extend: 'Ext.Template',

    requires: 'Ext.XTemplateCompiler',

    /**
     * @private
     */
    emptyObj: {},

    /**
     * @cfg {Boolean} compiled
     * Only applies to {@link Ext.Template}, XTemplates are compiled automatically on the
     * first call to {@link #apply} or {@link #applyOut}.
     */

    /**
     * @cfg {String/Array} definitions
     * Optional. A statement, or array of statements which set up `var`s which may then
     * be accessed within the scope of the generated function.
     */

    apply: function(values, parent) {
        return this.applyOut(values, [], parent).join('');
    },

    applyOut: function(values, out, parent) {
        var me = this,
            compiler;

        if (!me.fn) {
            compiler = new Ext.XTemplateCompiler({
                useFormat: me.disableFormats !== true,
                definitions: me.definitions
            });

            me.fn = compiler.compile(me.html);
        }

        try {
            me.fn.call(me, out, values, parent || me.emptyObj, 1, 1);
        } catch (e) {
            Ext.log('Error: ' + e.message);
        }

        return out;
    },

    /**
     * Does nothing. XTemplates are compiled automatically, so this function simply returns this.
     * @return {Ext.XTemplate} this
     */
    compile: function() {
        return this;
    },

    statics: {
        /**
         * Gets an `XTemplate` from an object (an instance of an {@link Ext#define}'d class).
         * Many times, templates are configured high in the class hierarchy and are to be
         * shared by all classes that derive from that base. To further complicate matters,
         * these templates are seldom actual instances but are rather configurations. For
         * example:
         * 
         *      Ext.define('MyApp.Class', {
         *          someTpl: [
         *              'tpl text here'
         *          ]
         *      });
         * 
         * The goal being to share that template definition with all instances and even
         * instances of derived classes, until `someTpl` is overridden. This method will
         * "upgrade" these configurations to be real `XTemplate` instances *in place* (to
         * avoid creating one instance per object).
         *
         * @param {Object} instance The object from which to get the `XTemplate` (must be
         * an instance of an {@link Ext#define}'d class).
         * @param {String} name The name of the property by which to get the `XTemplate`.
         * @return {Ext.XTemplate} The `XTemplate` instance or null if not found.
         * @protected
         */
        getTpl: function (instance, name) {
            var tpl = instance[name], // go for it! 99% of the time we will get it!
                proto;

            if (tpl && !tpl.isTemplate) { // tpl is just a configuration (not an instance)
                // create the template instance from the configuration:
                tpl = Ext.ClassManager.dynInstantiate('Ext.XTemplate', tpl);

                // and replace the reference with the new instance:
                if (instance.hasOwnProperty(name)) { // the tpl is on the instance
                    instance[name] = tpl;
                } else { // must be somewhere in the prototype chain
                    for (proto = instance.self.prototype; proto; proto = proto.superclass) {
                        if (proto.hasOwnProperty(name)) {
                            proto[name] = tpl;
                            break;
                        }
                    }
                }
            }
            // else !tpl (no such tpl) or the tpl is an instance already... either way, tpl
            // is ready to return

            return tpl || null;
        }
    }
});
