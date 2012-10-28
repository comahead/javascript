
/**
 * This class is used as a mixin.
 *
 * This class is to be used to provide basic methods for binding/unbinding stores to other
 * classes. In general it will not be used directly.
 */
Ext.define('Ext.util.Bindable', {
    
    /**
     * Binds a store to this instance.
     * @param {Ext.data.AbstractStore/String} [store] The store to bind or ID of the store.
     * When no store given (or when `null` or `undefined` passed), unbinds the existing store.
     * @param {Boolean} [initial=false] True to not remove listeners from existing store.
     */
    bindStore: function(store, initial){
        var me = this,
            oldStore = me.store;
        
        if (!initial && me.store) {
            // Perform implementation-specific unbinding operations *before* possible Store destruction.
            me.onUnbindStore(oldStore, initial);

            if (store !== oldStore && oldStore.autoDestroy) {
                oldStore.destroyStore();
            } else {
                me.unbindStoreListeners(oldStore);
            }
        }
        if (store) {
            store = Ext.data.StoreManager.lookup(store);
            me.bindStoreListeners(store);
            me.onBindStore(store, initial);
        }
        me.store = store || null;
        return me;
    },
    
    /**
     * Gets the current store instance.
     * @return {Ext.data.AbstractStore} The store, null if one does not exist.
     */
    getStore: function(){
        return this.store;
    },
    
    /**
     * Unbinds listeners from this component to the store. By default it will remove
     * anything bound by the bindStoreListeners method, however it can be overridden
     * in a subclass to provide any more complicated handling.
     * @protected 
     * @param {Ext.data.AbstractStore} store The store to unbind from
     */
    unbindStoreListeners: function(store) {
        // Can be overridden in the subclass for more complex removal
        var listeners = this.storeListeners;
        if (listeners) {
            store.un(listeners);
        }
    },
    
    /**
     * Binds listeners for this component to the store. By default it will add
     * anything bound by the getStoreListeners method, however it can be overridden
     * in a subclass to provide any more complicated handling.
     * @protected 
     * @param {Ext.data.AbstractStore} store The store to bind to
     */
    bindStoreListeners: function(store) {
        // Can be overridden in the subclass for more complex binding
        var me = this,
            listeners = Ext.apply({}, me.getStoreListeners());
            
        if (!listeners.scope) {
            listeners.scope = me;
        }
        me.storeListeners = listeners;
        store.on(listeners);
    },
    
    /**
     * Gets the listeners to bind to a new store.
     * @protected
     * @return {Object} The listeners to be bound to the store in object literal form. The scope
     * may be omitted, it is assumed to be the current instance.
     */
    getStoreListeners: Ext.emptyFn,
    
    /**
     * Template method, it is called when an existing store is unbound
     * from the current instance.
     * @protected
     * @param {Ext.data.AbstractStore} store The store being unbound
     * @param {Boolean} initial True if this store is being bound as initialization of the instance.
     */
    onUnbindStore: Ext.emptyFn,
    
    /**
     * Template method, it is called when a new store is bound
     * to the current instance.
     * @protected
     * @param {Ext.data.AbstractStore} store The store being bound
     * @param {Boolean} initial True if this store is being bound as initialization of the instance.
     */
    onBindStore: Ext.emptyFn    
});

/**
 * This mixin enables classes to declare relationships to child elements and provides the
 * mechanics for acquiring the {@link Ext.Element elements} and storing them on an object
 * instance as properties.
 *
 * This class is used by {@link Ext.Component components} and {@link Ext.layout.container.Container container layouts} to
 * manage their child elements.
 * 
 * A typical component that uses these features might look something like this:
 * 
 *      Ext.define('Ext.ux.SomeComponent', {
 *          extend: 'Ext.Component',
 *          
 *          childEls: [
 *              'bodyEl'
 *          ],
 *          
 *          renderTpl: [
 *              '<div id="{id}-bodyEl"></div>'
 *          ],
 *          
 *          // ...
 *      });
 * 
 * The `childEls` array lists one or more relationships to child elements managed by the
 * component. The items in this array can be either of the following types:
 * 
 * - String: the id suffix and property name in one. For example, "bodyEl" in the above
 * example means a "bodyEl" property will be added to the instance with the result of
 * {@link Ext#get} given "componentId-bodyEl" where "componentId" is the component instance's
 * id.
 * - Object: with a `name` property that names the instance property for the element, and
 * one of the following additional properties:
 *      - `id`: The full id of the child element.
 *      - `itemId`: The suffix part of the id to which "componentId-" is prepended.
 *      - `select`: A selector that will be passed to {@link Ext#select}.
 *      - `selectNode`: A selector that will be passed to {@link Ext.DomQuery#selectNode}.
 * 
 * The example above could have used this instead to achieve the same result:
 *
 *      childEls: [
 *          { name: 'bodyEl', itemId: 'bodyEl' }
 *      ]
 *
 * When using `select`, the property will be an instance of {@link Ext.CompositeElement}. In
 * all other cases, the property will be an {@link Ext.Element} or `null` if not found.
 *
 * Care should be taken when using `select` or `selectNode` to find child elements. The
 * following issues should be considered:
 * 
 * - Performance: using selectors can be slower than id lookup by a factor 10x or more.
 * - Over-selecting: selectors are applied after the DOM elements for all children have
 * been rendered, so selectors can match elements from child components (including nested
 * versions of the same component) accidentally.
 * 
 * This above issues are most important when using `select` since it returns multiple
 * elements.
 *
 * **IMPORTANT** 
 * Unlike a `renderTpl` where there is a single value for an instance, `childEls` are aggregated
 * up the class hierarchy so that they are effectively inherited. In other words, if a
 * class where to derive from `Ext.ux.SomeComponent` in the example above, it could also
 * have a `childEls` property in the same way as `Ext.ux.SomeComponent`.
 * 
 *      Ext.define('Ext.ux.AnotherComponent', {
 *          extend: 'Ext.ux.SomeComponent',
 *          
 *          childEls: [
 *              // 'bodyEl' is inherited
 *              'innerEl'
 *          ],
 *          
 *          renderTpl: [
 *              '<div id="{id}-bodyEl">'
 *                  '<div id="{id}-innerEl"></div>'
 *              '</div>'
 *          ],
 *          
 *          // ...
 *      });
 * 
 * The `renderTpl` contains both child elements and unites them in the desired markup, but
 * the `childEls` only contains the new child element. The {@link #applyChildEls} method
 * takes care of looking up all `childEls` for an instance and considers `childEls`
 * properties on all the super classes and mixins.
 * 
 * @private
 */
Ext.define('Ext.util.ElementContainer', {

    childEls: [
        // empty - this solves a couple problems:
        //  1. It ensures that all classes have a childEls (avoid null ptr)
        //  2. It prevents mixins from smashing on their own childEls (these are gathered
        //      specifically)
    ],

    constructor: function () {
        var me = this,
            childEls;

        // if we have configured childEls, we need to merge them with those from this
        // class, its bases and the set of mixins...
        if (me.hasOwnProperty('childEls')) {
            childEls = me.childEls;
            delete me.childEls;

            me.addChildEls.apply(me, childEls);
        }
    },

    destroy: function () {
        var me = this,
            childEls = me.getChildEls(),
            child, childName, i, k;

        for (i = childEls.length; i--; ) {
            childName = childEls[i];
            if (typeof childName != 'string') {
                childName = childName.name;
            }

            child = me[childName];
            if (child) {
                me[childName] = null; // better than delete since that changes the "shape"
                child.remove();
            }
        }
    },

    /**
     * Adds each argument passed to this method to the {@link Ext.AbstractComponent#cfg-childEls childEls} array.
     */
    addChildEls: function () {
        var me = this,
            args = arguments;

        if (me.hasOwnProperty('childEls')) {
            me.childEls.push.apply(me.childEls, args);
        } else {
            me.childEls = me.getChildEls().concat(Array.prototype.slice.call(args));
        }
        
        me.prune(me.childEls, false);
    },

    /**
     * Sets references to elements inside the component. 
     * @private
     */
    applyChildEls: function(el, id) {
        var me = this,
            childEls = me.getChildEls(),
            baseId, childName, i, selector, value;

        baseId = (id || me.id) + '-';
        for (i = childEls.length; i--; ) {
            childName = childEls[i];

            if (typeof childName == 'string') {
                // We don't use Ext.get because that is 3x (or more) slower on IE6-8. Since
                // we know the el's are children of our el we use getById instead:
                value = el.getById(baseId + childName);
            } else {
                if ((selector = childName.select)) {
                    value = Ext.select(selector, true, el.dom); // a CompositeElement
                } else if ((selector = childName.selectNode)) {
                    value = Ext.get(Ext.DomQuery.selectNode(selector, el.dom));
                } else {
                    // see above re:getById...
                    value = el.getById(childName.id || (baseId + childName.itemId));
                }

                childName = childName.name;
            }

            me[childName] = value;
        }
    },

    getChildEls: function () {
        var me = this,
            self;

        // If an instance has its own childEls, that is the complete set:
        if (me.hasOwnProperty('childEls')) {
            return me.childEls;
        }

        // Typically, however, the childEls is a class-level concept, so check to see if
        // we have cached the complete set on the class:
        self = me.self;
        return self.$childEls || me.getClassChildEls(self);
    },

    getClassChildEls: function (cls) {
        var me = this,
            result = cls.$childEls,
            childEls, i, length, forked, mixin, mixins, name, parts, proto, supr, superMixins;

        if (!result) {
            // We put the various childEls arrays into parts in the order of superclass,
            // new mixins and finally from cls. These parts can be null or undefined and
            // we will skip them later.

            supr = cls.superclass;
            if (supr) {
                supr = supr.self;
                parts = [supr.$childEls || me.getClassChildEls(supr)]; // super+mixins
                superMixins = supr.prototype.mixins || {};
            } else {
                parts = [];
                superMixins = {};
            }

            proto = cls.prototype;
            mixins = proto.mixins; // since we are a mixin, there will be at least us
            for (name in mixins) {
                if (mixins.hasOwnProperty(name) && !superMixins.hasOwnProperty(name)) {
                    mixin = mixins[name].self;
                    parts.push(mixin.$childEls || me.getClassChildEls(mixin));
                }
            }

            parts.push(proto.hasOwnProperty('childEls') && proto.childEls);

            for (i = 0, length = parts.length; i < length; ++i) {
                childEls = parts[i];
                if (childEls && childEls.length) {
                    if (!result) {
                        result = childEls;
                    } else {
                        if (!forked) {
                            forked = true;
                            result = result.slice(0);
                        }
                        result.push.apply(result, childEls);
                    }
                }
            }

            cls.$childEls = result = (result ? me.prune(result, !forked) : []);
        }

        return result;
    },

    prune: function (childEls, shared) {
        var index = childEls.length,
            map = {},
            name;

        while (index--) {
            name = childEls[index];
            if (typeof name != 'string') {
                name = name.name;
            }

            if (!map[name]) {
                map[name] = 1;
            } else {
                if (shared) {
                    shared = false;
                    childEls = childEls.slice(0);
                }
                Ext.Array.erase(childEls, index, 1);
            }
        }

        return childEls;
    },

    /**
     * Removes items in the childEls array based on the return value of a supplied test
     * function. The function is called with a entry in childEls and if the test function
     * return true, that entry is removed. If false, that entry is kept.
     *
     * @param {Function} testFn The test function.
     */
    removeChildEls: function (testFn) {
        var me = this,
            old = me.getChildEls(),
            keepers = (me.childEls = []),
            n, i, cel;

        for (i = 0, n = old.length; i < n; ++i) {
            cel = old[i];
            if (!testFn(cel)) {
                keepers.push(cel);
            }
        }
    }
});

/**
 * Represents a filter that can be applied to a {@link Ext.util.MixedCollection MixedCollection}. Can either simply
 * filter on a property/value pair or pass in a filter function with custom logic. Filters are always used in the
 * context of MixedCollections, though {@link Ext.data.Store Store}s frequently create them when filtering and searching
 * on their records. Example usage:
 *
 *     //set up a fictional MixedCollection containing a few people to filter on
 *     var allNames = new Ext.util.MixedCollection();
 *     allNames.addAll([
 *         {id: 1, name: 'Ed',    age: 25},
 *         {id: 2, name: 'Jamie', age: 37},
 *         {id: 3, name: 'Abe',   age: 32},
 *         {id: 4, name: 'Aaron', age: 26},
 *         {id: 5, name: 'David', age: 32}
 *     ]);
 *
 *     var ageFilter = new Ext.util.Filter({
 *         property: 'age',
 *         value   : 32
 *     });
 *
 *     var longNameFilter = new Ext.util.Filter({
 *         filterFn: function(item) {
 *             return item.name.length > 4;
 *         }
 *     });
 *
 *     //a new MixedCollection with the 3 names longer than 4 characters
 *     var longNames = allNames.filter(longNameFilter);
 *
 *     //a new MixedCollection with the 2 people of age 32:
 *     var youngFolk = allNames.filter(ageFilter);
 *
 */
Ext.define('Ext.util.Filter', {

    /* Begin Definitions */

    /* End Definitions */
    /**
     * @cfg {String} property
     * The property to filter on. Required unless a {@link #filterFn} is passed
     */
    
    /**
     * @cfg {Function} filterFn
     * A custom filter function which is passed each item in the {@link Ext.util.MixedCollection} in turn. Should return
     * true to accept each item or false to reject it
     */
    
    /**
     * @cfg {Boolean} anyMatch
     * True to allow any match - no regex start/end line anchors will be added.
     */
    anyMatch: false,
    
    /**
     * @cfg {Boolean} exactMatch
     * True to force exact match (^ and $ characters added to the regex). Ignored if anyMatch is true.
     */
    exactMatch: false,
    
    /**
     * @cfg {Boolean} caseSensitive
     * True to make the regex case sensitive (adds 'i' switch to regex).
     */
    caseSensitive: false,
    
    /**
     * @cfg {String} root
     * Optional root property. This is mostly useful when filtering a Store, in which case we set the root to 'data' to
     * make the filter pull the {@link #property} out of the data object of each item
     */

    /**
     * Creates new Filter.
     * @param {Object} [config] Config object
     */
    constructor: function(config) {
        var me = this;
        Ext.apply(me, config);
        
        //we're aliasing filter to filterFn mostly for API cleanliness reasons, despite the fact it dirties the code here.
        //Ext.util.Sorter takes a sorterFn property but allows .sort to be called - we do the same here
        me.filter = me.filter || me.filterFn;
        
        if (me.filter === undefined) {
            if (me.property === undefined || me.value === undefined) {
                // Commented this out temporarily because it stops us using string ids in models. TODO: Remove this once
                // Model has been updated to allow string ids
                
                // Ext.Error.raise("A Filter requires either a property or a filterFn to be set");
            } else {
                me.filter = me.createFilterFn();
            }
            
            me.filterFn = me.filter;
        }
    },
    
    /**
     * @private
     * Creates a filter function for the configured property/value/anyMatch/caseSensitive options for this Filter
     */
    createFilterFn: function() {
        var me       = this,
            matcher  = me.createValueMatcher(),
            property = me.property;
        
        return function(item) {
            var value = me.getRoot.call(me, item)[property];
            return matcher === null ? value === null : matcher.test(value);
        };
    },
    
    /**
     * @private
     * Returns the root property of the given item, based on the configured {@link #root} property
     * @param {Object} item The item
     * @return {Object} The root property of the object
     */
    getRoot: function(item) {
        var root = this.root;
        return root === undefined ? item : item[root];
    },
    
    /**
     * @private
     * Returns a regular expression based on the given value and matching options
     */
    createValueMatcher : function() {
        var me            = this,
            value         = me.value,
            anyMatch      = me.anyMatch,
            exactMatch    = me.exactMatch,
            caseSensitive = me.caseSensitive,
            escapeRe      = Ext.String.escapeRegex;
            
        if (value === null) {
            return value;
        }
        
        if (!value.exec) { // not a regex
            value = String(value);

            if (anyMatch === true) {
                value = escapeRe(value);
            } else {
                value = '^' + escapeRe(value);
                if (exactMatch === true) {
                    value += '$';
                }
            }
            value = new RegExp(value, caseSensitive ? '' : 'i');
         }
         
         return value;
    }
});
/**
 * General purpose inflector class that {@link #pluralize pluralizes}, {@link #singularize singularizes} and
 * {@link #ordinalize ordinalizes} words. Sample usage:
 *
 *     //turning singular words into plurals
 *     Ext.util.Inflector.pluralize('word'); //'words'
 *     Ext.util.Inflector.pluralize('person'); //'people'
 *     Ext.util.Inflector.pluralize('sheep'); //'sheep'
 *
 *     //turning plurals into singulars
 *     Ext.util.Inflector.singularize('words'); //'word'
 *     Ext.util.Inflector.singularize('people'); //'person'
 *     Ext.util.Inflector.singularize('sheep'); //'sheep'
 *
 *     //ordinalizing numbers
 *     Ext.util.Inflector.ordinalize(11); //"11th"
 *     Ext.util.Inflector.ordinalize(21); //"21st"
 *     Ext.util.Inflector.ordinalize(1043); //"1043rd"
 *
 * # Customization
 *
 * The Inflector comes with a default set of US English pluralization rules. These can be augmented with additional
 * rules if the default rules do not meet your application's requirements, or swapped out entirely for other languages.
 * Here is how we might add a rule that pluralizes "ox" to "oxen":
 *
 *     Ext.util.Inflector.plural(/^(ox)$/i, "$1en");
 *
 * Each rule consists of two items - a regular expression that matches one or more rules, and a replacement string. In
 * this case, the regular expression will only match the string "ox", and will replace that match with "oxen". Here's
 * how we could add the inverse rule:
 *
 *     Ext.util.Inflector.singular(/^(ox)en$/i, "$1");
 *
 * Note that the ox/oxen rules are present by default.
 */
Ext.define('Ext.util.Inflector', {

    /* Begin Definitions */

    singleton: true,

    /* End Definitions */

    /**
     * @private
     * The registered plural tuples. Each item in the array should contain two items - the first must be a regular
     * expression that matchers the singular form of a word, the second must be a String that replaces the matched
     * part of the regular expression. This is managed by the {@link #plural} method.
     * @property {Array} plurals
     */
    plurals: [
        [(/(quiz)$/i),                "$1zes"  ],
        [(/^(ox)$/i),                 "$1en"   ],
        [(/([m|l])ouse$/i),           "$1ice"  ],
        [(/(matr|vert|ind)ix|ex$/i),  "$1ices" ],
        [(/(x|ch|ss|sh)$/i),          "$1es"   ],
        [(/([^aeiouy]|qu)y$/i),       "$1ies"  ],
        [(/(hive)$/i),                "$1s"    ],
        [(/(?:([^f])fe|([lr])f)$/i),  "$1$2ves"],
        [(/sis$/i),                   "ses"    ],
        [(/([ti])um$/i),              "$1a"    ],
        [(/(buffal|tomat|potat)o$/i), "$1oes"  ],
        [(/(bu)s$/i),                 "$1ses"  ],
        [(/(alias|status|sex)$/i),    "$1es"   ],
        [(/(octop|vir)us$/i),         "$1i"    ],
        [(/(ax|test)is$/i),           "$1es"   ],
        [(/^person$/),                "people" ],
        [(/^man$/),                   "men"    ],
        [(/^(child)$/),               "$1ren"  ],
        [(/s$/i),                     "s"      ],
        [(/$/),                       "s"      ]
    ],

    /**
     * @private
     * The set of registered singular matchers. Each item in the array should contain two items - the first must be a
     * regular expression that matches the plural form of a word, the second must be a String that replaces the
     * matched part of the regular expression. This is managed by the {@link #singular} method.
     * @property {Array} singulars
     */
    singulars: [
      [(/(quiz)zes$/i),                                                    "$1"     ],
      [(/(matr)ices$/i),                                                   "$1ix"   ],
      [(/(vert|ind)ices$/i),                                               "$1ex"   ],
      [(/^(ox)en/i),                                                       "$1"     ],
      [(/(alias|status)es$/i),                                             "$1"     ],
      [(/(octop|vir)i$/i),                                                 "$1us"   ],
      [(/(cris|ax|test)es$/i),                                             "$1is"   ],
      [(/(shoe)s$/i),                                                      "$1"     ],
      [(/(o)es$/i),                                                        "$1"     ],
      [(/(bus)es$/i),                                                      "$1"     ],
      [(/([m|l])ice$/i),                                                   "$1ouse" ],
      [(/(x|ch|ss|sh)es$/i),                                               "$1"     ],
      [(/(m)ovies$/i),                                                     "$1ovie" ],
      [(/(s)eries$/i),                                                     "$1eries"],
      [(/([^aeiouy]|qu)ies$/i),                                            "$1y"    ],
      [(/([lr])ves$/i),                                                    "$1f"    ],
      [(/(tive)s$/i),                                                      "$1"     ],
      [(/(hive)s$/i),                                                      "$1"     ],
      [(/([^f])ves$/i),                                                    "$1fe"   ],
      [(/(^analy)ses$/i),                                                  "$1sis"  ],
      [(/((a)naly|(b)a|(d)iagno|(p)arenthe|(p)rogno|(s)ynop|(t)he)ses$/i), "$1$2sis"],
      [(/([ti])a$/i),                                                      "$1um"   ],
      [(/(n)ews$/i),                                                       "$1ews"  ],
      [(/people$/i),                                                       "person" ],
      [(/s$/i),                                                            ""       ]
    ],

    /**
     * @private
     * The registered uncountable words
     * @property {String[]} uncountable
     */
     uncountable: [
        "sheep",
        "fish",
        "series",
        "species",
        "money",
        "rice",
        "information",
        "equipment",
        "grass",
        "mud",
        "offspring",
        "deer",
        "means"
    ],

    /**
     * Adds a new singularization rule to the Inflector. See the intro docs for more information
     * @param {RegExp} matcher The matcher regex
     * @param {String} replacer The replacement string, which can reference matches from the matcher argument
     */
    singular: function(matcher, replacer) {
        this.singulars.unshift([matcher, replacer]);
    },

    /**
     * Adds a new pluralization rule to the Inflector. See the intro docs for more information
     * @param {RegExp} matcher The matcher regex
     * @param {String} replacer The replacement string, which can reference matches from the matcher argument
     */
    plural: function(matcher, replacer) {
        this.plurals.unshift([matcher, replacer]);
    },

    /**
     * Removes all registered singularization rules
     */
    clearSingulars: function() {
        this.singulars = [];
    },

    /**
     * Removes all registered pluralization rules
     */
    clearPlurals: function() {
        this.plurals = [];
    },

    /**
     * Returns true if the given word is transnumeral (the word is its own singular and plural form - e.g. sheep, fish)
     * @param {String} word The word to test
     * @return {Boolean} True if the word is transnumeral
     */
    isTransnumeral: function(word) {
        return Ext.Array.indexOf(this.uncountable, word) != -1;
    },

    /**
     * Returns the pluralized form of a word (e.g. Ext.util.Inflector.pluralize('word') returns 'words')
     * @param {String} word The word to pluralize
     * @return {String} The pluralized form of the word
     */
    pluralize: function(word) {
        if (this.isTransnumeral(word)) {
            return word;
        }

        var plurals = this.plurals,
            length  = plurals.length,
            tuple, regex, i;

        for (i = 0; i < length; i++) {
            tuple = plurals[i];
            regex = tuple[0];

            if (regex == word || (regex.test && regex.test(word))) {
                return word.replace(regex, tuple[1]);
            }
        }

        return word;
    },

    /**
     * Returns the singularized form of a word (e.g. Ext.util.Inflector.singularize('words') returns 'word')
     * @param {String} word The word to singularize
     * @return {String} The singularized form of the word
     */
    singularize: function(word) {
        if (this.isTransnumeral(word)) {
            return word;
        }

        var singulars = this.singulars,
            length    = singulars.length,
            tuple, regex, i;

        for (i = 0; i < length; i++) {
            tuple = singulars[i];
            regex = tuple[0];

            if (regex == word || (regex.test && regex.test(word))) {
                return word.replace(regex, tuple[1]);
            }
        }

        return word;
    },

    /**
     * Returns the correct {@link Ext.data.Model Model} name for a given string. Mostly used internally by the data
     * package
     * @param {String} word The word to classify
     * @return {String} The classified version of the word
     */
    classify: function(word) {
        return Ext.String.capitalize(this.singularize(word));
    },

    /**
     * Ordinalizes a given number by adding a prefix such as 'st', 'nd', 'rd' or 'th' based on the last digit of the
     * number. 21 -> 21st, 22 -> 22nd, 23 -> 23rd, 24 -> 24th etc
     * @param {Number} number The number to ordinalize
     * @return {String} The ordinalized number
     */
    ordinalize: function(number) {
        var parsed = parseInt(number, 10),
            mod10  = parsed % 10,
            mod100 = parsed % 100;

        //11 through 13 are a special case
        if (11 <= mod100 && mod100 <= 13) {
            return number + "th";
        } else {
            switch(mod10) {
                case 1 : return number + "st";
                case 2 : return number + "nd";
                case 3 : return number + "rd";
                default: return number + "th";
            }
        }
    }
}, function() {
    //aside from the rules above, there are a number of words that have irregular pluralization so we add them here
    var irregulars = {
            alumnus: 'alumni',
            cactus : 'cacti',
            focus  : 'foci',
            nucleus: 'nuclei',
            radius: 'radii',
            stimulus: 'stimuli',
            ellipsis: 'ellipses',
            paralysis: 'paralyses',
            oasis: 'oases',
            appendix: 'appendices',
            index: 'indexes',
            beau: 'beaux',
            bureau: 'bureaux',
            tableau: 'tableaux',
            woman: 'women',
            child: 'children',
            man: 'men',
            corpus:	'corpora',
            criterion: 'criteria',
            curriculum:	'curricula',
            genus: 'genera',
            memorandum:	'memoranda',
            phenomenon:	'phenomena',
            foot: 'feet',
            goose: 'geese',
            tooth: 'teeth',
            antenna: 'antennae',
            formula: 'formulae',
            nebula: 'nebulae',
            vertebra: 'vertebrae',
            vita: 'vitae'
        },
        singular;

    for (singular in irregulars) {
        this.plural(singular, irregulars[singular]);
        this.singular(irregulars[singular], singular);
    }
});
/**
 * @class Ext.util.Memento
 * This class manages a set of captured properties from an object. These captured properties
 * can later be restored to an object.
 */
Ext.define('Ext.util.Memento', (function () {

    function captureOne (src, target, prop, prefix) {
        src[prefix ? prefix + prop : prop] = target[prop];
    }

    function removeOne (src, target, prop) {
        delete src[prop];
    }

    function restoreOne (src, target, prop, prefix) {
        var name = prefix ? prefix + prop : prop,
            value = src[name];

        if (value || src.hasOwnProperty(name)) {
            restoreValue(target, prop, value);
        }
    }

    function restoreValue (target, prop, value) {
        if (Ext.isDefined(value)) {
            target[prop] = value;
        } else {
            delete target[prop];
        }
    }

    function doMany (doOne, src, target, props, prefix) {
        if (src) {
            if (Ext.isArray(props)) {
                var p, pLen = props.length;
                for (p = 0; p < pLen; p++) {
                    doOne(src, target, props[p], prefix);
                }
            } else {
                doOne(src, target, props, prefix);
            }
        }
    }

    return {
        /**
         * @property data
         * The collection of captured properties.
         * @private
         */
        data: null,

        /**
         * @property target
         * The default target object for capture/restore (passed to the constructor).
         */
        target: null,

        /**
         * Creates a new memento and optionally captures properties from the target object.
         * @param {Object} target The target from which to capture properties. If specified in the
         * constructor, this target becomes the default target for all other operations.
         * @param {String/String[]} props The property or array of properties to capture.
         */
        constructor: function (target, props) {
            if (target) {
                this.target = target;
                if (props) {
                    this.capture(props);
                }
            }
        },

        /**
         * Captures the specified properties from the target object in this memento.
         * @param {String/String[]} props The property or array of properties to capture.
         * @param {Object} target The object from which to capture properties.
         */
        capture: function (props, target, prefix) {
            var me = this;
            doMany(captureOne, me.data || (me.data = {}), target || me.target, props, prefix);
        },

        /**
         * Removes the specified properties from this memento. These properties will not be
         * restored later without re-capturing their values.
         * @param {String/String[]} props The property or array of properties to remove.
         */
        remove: function (props) {
            doMany(removeOne, this.data, null, props);
        },

        /**
         * Restores the specified properties from this memento to the target object.
         * @param {String/String[]} props The property or array of properties to restore.
         * @param {Boolean} clear True to remove the restored properties from this memento or
         * false to keep them (default is true).
         * @param {Object} target The object to which to restore properties.
         */
        restore: function (props, clear, target, prefix) {
            doMany(restoreOne, this.data, target || this.target, props, prefix);
            if (clear !== false) {
                this.remove(props);
            }
        },

        /**
         * Restores all captured properties in this memento to the target object.
         * @param {Boolean} clear True to remove the restored properties from this memento or
         * false to keep them (default is true).
         * @param {Object} target The object to which to restore properties.
         */
        restoreAll: function (clear, target) {
            var me   = this,
                t    = target || this.target,
                data = me.data,
                prop;

            for (prop in data) {
                if (data.hasOwnProperty(prop)) {
                    restoreValue(t, prop, data[prop]);
                }
            }

            if (clear !== false) {
                delete me.data;
            }
        }
    };
}()));

/**
 * Base class that provides a common interface for publishing events. Subclasses are expected to to have a property
 * "events" with all the events defined, and, optionally, a property "listeners" with configured listeners defined.
 *
 * For example:
 *
 *     Ext.define('Employee', {
 *         mixins: {
 *             observable: 'Ext.util.Observable'
 *         },
 *
 *         constructor: function (config) {
 *             // The Observable constructor copies all of the properties of `config` on
 *             // to `this` using {@link Ext#apply}. Further, the `listeners` property is
 *             // processed to add listeners.
 *             //
 *             this.mixins.observable.constructor.call(this, config);
 *
 *             this.addEvents(
 *                 'fired',
 *                 'quit'
 *             );
 *         }
 *     });
 *
 * This could then be used like this:
 *
 *     var newEmployee = new Employee({
 *         name: employeeName,
 *         listeners: {
 *             quit: function() {
 *                 // By default, "this" will be the object that fired the event.
 *                 alert(this.name + " has quit!");
 *             }
 *         }
 *     });
 */
Ext.define('Ext.util.Observable', {

    /* Begin Definitions */

    requires: ['Ext.util.Event'],

    statics: {
        /**
         * Removes **all** added captures from the Observable.
         *
         * @param {Ext.util.Observable} o The Observable to release
         * @static
         */
        releaseCapture: function(o) {
            o.fireEvent = this.prototype.fireEvent;
        },

        /**
         * Starts capture on the specified Observable. All events will be passed to the supplied function with the event
         * name + standard signature of the event **before** the event is fired. If the supplied function returns false,
         * the event will not fire.
         *
         * @param {Ext.util.Observable} o The Observable to capture events from.
         * @param {Function} fn The function to call when an event is fired.
         * @param {Object} scope (optional) The scope (`this` reference) in which the function is executed. Defaults to
         * the Observable firing the event.
         * @static
         */
        capture: function(o, fn, scope) {
            o.fireEvent = Ext.Function.createInterceptor(o.fireEvent, fn, scope);
        },

        /**
         * Sets observability on the passed class constructor.
         *
         * This makes any event fired on any instance of the passed class also fire a single event through
         * the **class** allowing for central handling of events on many instances at once.
         *
         * Usage:
         *
         *     Ext.util.Observable.observe(Ext.data.Connection);
         *     Ext.data.Connection.on('beforerequest', function(con, options) {
         *         console.log('Ajax request made to ' + options.url);
         *     });
         *
         * @param {Function} c The class constructor to make observable.
         * @param {Object} listeners An object containing a series of listeners to add. See {@link #addListener}.
         * @static
         */
        observe: function(cls, listeners) {
            if (cls) {
                if (!cls.isObservable) {
                    Ext.applyIf(cls, new this());
                    this.capture(cls.prototype, cls.fireEvent, cls);
                }
                if (Ext.isObject(listeners)) {
                    cls.on(listeners);
                }
            }
            return cls;
        },

        /**
         * Prepares a given class for observable instances. This method is called when a
         * class derives from this class or uses this class as a mixin.
         * @param {Function} T The class constructor to prepare.
         * @private
         */
        prepareClass: function (T, mixin) {
            // T.hasListeners is the object to track listeners on class T. This object's
            // prototype (__proto__) is the "hasListeners" of T.superclass.

            // Instances of T will create "hasListeners" that have T.hasListeners as their
            // immediate prototype (__proto__).

            if (!T.HasListeners) {
                // We create a HasListeners "class" for this class. The "prototype" of the
                // HasListeners class is an instance of the HasListeners class associated
                // with this class's super class (or with Observable).
                var Observable = Ext.util.Observable,
                    HasListeners = function () {},
                    SuperHL = T.superclass.HasListeners || (mixin && mixin.HasListeners) ||
                              Observable.HasListeners;

                // Make the HasListener class available on the class and its prototype:
                T.prototype.HasListeners = T.HasListeners = HasListeners;

                // And connect its "prototype" to the new HasListeners of our super class
                // (which is also the class-level "hasListeners" instance).
                HasListeners.prototype = T.hasListeners = new SuperHL();
            }
        }
    },

    /* End Definitions */

    /**
     * @cfg {Object} listeners
     *
     * A config object containing one or more event handlers to be added to this object during initialization. This
     * should be a valid listeners config object as specified in the {@link #addListener} example for attaching multiple
     * handlers at once.
     *
     * **DOM events from Ext JS {@link Ext.Component Components}**
     *
     * While _some_ Ext JS Component classes export selected DOM events (e.g. "click", "mouseover" etc), this is usually
     * only done when extra value can be added. For example the {@link Ext.view.View DataView}'s **`{@link
     * Ext.view.View#itemclick itemclick}`** event passing the node clicked on. To access DOM events directly from a
     * child element of a Component, we need to specify the `element` option to identify the Component property to add a
     * DOM listener to:
     *
     *     new Ext.panel.Panel({
     *         width: 400,
     *         height: 200,
     *         dockedItems: [{
     *             xtype: 'toolbar'
     *         }],
     *         listeners: {
     *             click: {
     *                 element: 'el', //bind to the underlying el property on the panel
     *                 fn: function(){ console.log('click el'); }
     *             },
     *             dblclick: {
     *                 element: 'body', //bind to the underlying body property on the panel
     *                 fn: function(){ console.log('dblclick body'); }
     *             }
     *         }
     *     });
     */

    /**
     * @property {Boolean} isObservable
     * `true` in this class to identify an object as an instantiated Observable, or subclass thereof.
     */
    isObservable: true,

    /**
     * @private
     * Initial suspended call count. Incremented when {@link #suspendEvents} is called, decremented when {@link #resumeEvents} is called.
     */
    eventsSuspended: 0,

    /**
     * @property {Object} hasListeners
     * @readonly
     * This object holds a key for any event that has a listener. The listener may be set
     * directly on the instance, or on its class or a super class (via {@link #observe}) or
     * on the {@link Ext.app.EventBus MVC EventBus}. The values of this object are truthy
     * (a non-zero number) and falsy (0 or undefined). They do not represent an exact count
     * of listeners. The value for an event is truthy if the event must be fired and is
     * falsy if there is no need to fire the event.
     * 
     * The intended use of this property is to avoid the expense of fireEvent calls when
     * there are no listeners. This can be particularly helpful when one would otherwise
     * have to call fireEvent hundreds or thousands of times. It is used like this:
     * 
     *      if (this.hasListeners.foo) {
     *          this.fireEvent('foo', this, arg1);
     *      }
     */

    constructor: function(config) {
        var me = this;

        Ext.apply(me, config);

        // The subclass may have already initialized it.
        if (!me.hasListeners) {
            me.hasListeners = new me.HasListeners();
        }

        me.events = me.events || {};
        if (me.listeners) {
            me.on(me.listeners);
            me.listeners = null; //Set as an instance property to pre-empt the prototype in case any are set there.
        }

        if (me.bubbleEvents) {
            me.enableBubble(me.bubbleEvents);
        }
    },

    onClassExtended: function (T) {
        if (!T.HasListeners) {
            // Some classes derive from us and some others derive from those classes. All
            // of these are passed to this method.
            Ext.util.Observable.prepareClass(T);
        }
    },

    // @private
    eventOptionsRe : /^(?:scope|delay|buffer|single|stopEvent|preventDefault|stopPropagation|normalized|args|delegate|element|vertical|horizontal|freezeEvent)$/,

    /**
     * Adds listeners to any Observable object (or Ext.Element) which are automatically removed when this Component is
     * destroyed.
     *
     * @param {Ext.util.Observable/Ext.Element} item The item to which to add a listener/listeners.
     * @param {Object/String} ename The event name, or an object containing event name properties.
     * @param {Function} fn (optional) If the `ename` parameter was an event name, this is the handler function.
     * @param {Object} scope (optional) If the `ename` parameter was an event name, this is the scope (`this` reference)
     * in which the handler function is executed.
     * @param {Object} opt (optional) If the `ename` parameter was an event name, this is the
     * {@link Ext.util.Observable#addListener addListener} options.
     */
    addManagedListener : function(item, ename, fn, scope, options) {
        var me = this,
            managedListeners = me.managedListeners = me.managedListeners || [],
            config;

        if (typeof ename !== 'string') {
            options = ename;
            for (ename in options) {
                if (options.hasOwnProperty(ename)) {
                    config = options[ename];
                    if (!me.eventOptionsRe.test(ename)) {
                        me.addManagedListener(item, ename, config.fn || config, config.scope || options.scope, config.fn ? config : options);
                    }
                }
            }
        }
        else {
            managedListeners.push({
                item: item,
                ename: ename,
                fn: fn,
                scope: scope,
                options: options
            });

            item.on(ename, fn, scope, options);
        }
    },

    /**
     * Removes listeners that were added by the {@link #mon} method.
     *
     * @param {Ext.util.Observable/Ext.Element} item The item from which to remove a listener/listeners.
     * @param {Object/String} ename The event name, or an object containing event name properties.
     * @param {Function} fn (optional) If the `ename` parameter was an event name, this is the handler function.
     * @param {Object} scope (optional) If the `ename` parameter was an event name, this is the scope (`this` reference)
     * in which the handler function is executed.
     */
    removeManagedListener : function(item, ename, fn, scope) {
        var me = this,
            options,
            config,
            managedListeners,
            length,
            i;

        if (typeof ename !== 'string') {
            options = ename;
            for (ename in options) {
                if (options.hasOwnProperty(ename)) {
                    config = options[ename];
                    if (!me.eventOptionsRe.test(ename)) {
                        me.removeManagedListener(item, ename, config.fn || config, config.scope || options.scope);
                    }
                }
            }
        }

        managedListeners = me.managedListeners ? me.managedListeners.slice() : [];

        for (i = 0, length = managedListeners.length; i < length; i++) {
            me.removeManagedListenerItem(false, managedListeners[i], item, ename, fn, scope);
        }
    },

    /**
     * Fires the specified event with the passed parameters (minus the event name, plus the `options` object passed
     * to {@link #addListener}).
     *
     * An event may be set to bubble up an Observable parent hierarchy (See {@link Ext.Component#getBubbleTarget}) by
     * calling {@link #enableBubble}.
     *
     * @param {String} eventName The name of the event to fire.
     * @param {Object...} args Variable number of parameters are passed to handlers.
     * @return {Boolean} returns false if any of the handlers return false otherwise it returns true.
     */
    fireEvent: function(eventName) {
        eventName = eventName.toLowerCase();
        var me = this,
            events = me.events,
            event = events && events[eventName],
            ret = true;

        // Only continue firing the event if there are listeners to be informed.
        // Bubbled events will always have a listener count, so will be fired.
        if (event && me.hasListeners[eventName]) {
            ret = me.continueFireEvent(eventName, Ext.Array.slice(arguments, 1), event.bubble);
        }
        return ret;
    },

    /**
     * Continue to fire event.
     * @private
     *
     * @param {String} eventName
     * @param {Array} args
     * @param {Boolean} bubbles
     */
    continueFireEvent: function(eventName, args, bubbles) {
        var target = this,
            queue, event,
            ret = true;

        do {
            if (target.eventsSuspended) {
                if ((queue = target.eventQueue)) {
                    queue.push([eventName, args, bubbles]);
                }
                return ret;
            } else {
                event = target.events[eventName];
                // Continue bubbling if event exists and it is `true` or the handler didn't returns false and it
                // configure to bubble.
                if (event && event != true) {
                    if ((ret = event.fire.apply(event, args)) === false) {
                        break;
                    }
                }
            }
        } while (bubbles && (target = target.getBubbleParent()));
        return ret;
    },

    /**
     * Gets the bubbling parent for an Observable
     * @private
     * @return {Ext.util.Observable} The bubble parent. null is returned if no bubble target exists
     */
    getBubbleParent: function(){
        var me = this, parent = me.getBubbleTarget && me.getBubbleTarget();
        if (parent && parent.isObservable) {
            return parent;
        }
        return null;
    },

    /**
     * Appends an event handler to this object.  For example:
     *
     *     myGridPanel.on("mouseover", this.onMouseOver, this);
     *
     * The method also allows for a single argument to be passed which is a config object
     * containing properties which specify multiple events. For example:
     *
     *     myGridPanel.on({
     *         cellClick: this.onCellClick,
     *         mouseover: this.onMouseOver,
     *         mouseout: this.onMouseOut,
     *         scope: this // Important. Ensure "this" is correct during handler execution
     *     });
     *
     * One can also specify options for each event handler separately:
     *
     *     myGridPanel.on({
     *         cellClick: {fn: this.onCellClick, scope: this, single: true},
     *         mouseover: {fn: panel.onMouseOver, scope: panel}
     *     });
     *
     * *Names* of methods in a specified scope may also be used. Note that
     * `scope` MUST be specified to use this option:
     *
     *     myGridPanel.on({
     *         cellClick: {fn: 'onCellClick', scope: this, single: true},
     *         mouseover: {fn: 'onMouseOver', scope: panel}
     *     });
     *
     * @param {String/Object} eventName The name of the event to listen for.
     * May also be an object who's property names are event names.
     *
     * @param {Function} [fn] The method the event invokes, or *if `scope` is specified, the *name* of the method within
     * the specified `scope`.  Will be called with arguments
     * given to {@link #fireEvent} plus the `options` parameter described below.
     *
     * @param {Object} [scope] The scope (`this` reference) in which the handler function is
     * executed. **If omitted, defaults to the object which fired the event.**
     *
     * @param {Object} [options] An object containing handler configuration.
     *
     * **Note:** Unlike in ExtJS 3.x, the options object will also be passed as the last
     * argument to every event handler.
     *
     * This object may contain any of the following properties:
     *
     * @param {Object} options.scope
     *   The scope (`this` reference) in which the handler function is executed. **If omitted,
     *   defaults to the object which fired the event.**
     *
     * @param {Number} options.delay
     *   The number of milliseconds to delay the invocation of the handler after the event fires.
     *
     * @param {Boolean} options.single
     *   True to add a handler to handle just the next firing of the event, and then remove itself.
     *
     * @param {Number} options.buffer
     *   Causes the handler to be scheduled to run in an {@link Ext.util.DelayedTask} delayed
     *   by the specified number of milliseconds. If the event fires again within that time,
     *   the original handler is _not_ invoked, but the new handler is scheduled in its place.
     *
     * @param {Ext.util.Observable} options.target
     *   Only call the handler if the event was fired on the target Observable, _not_ if the event
     *   was bubbled up from a child Observable.
     *
     * @param {String} options.element
     *   **This option is only valid for listeners bound to {@link Ext.Component Components}.**
     *   The name of a Component property which references an element to add a listener to.
     *
     *   This option is useful during Component construction to add DOM event listeners to elements of
     *   {@link Ext.Component Components} which will exist only after the Component is rendered.
     *   For example, to add a click listener to a Panel's body:
     *
     *       new Ext.panel.Panel({
     *           title: 'The title',
     *           listeners: {
     *               click: this.handlePanelClick,
     *               element: 'body'
     *           }
     *       });
     *
     * **Combining Options**
     *
     * Using the options argument, it is possible to combine different types of listeners:
     *
     * A delayed, one-time listener.
     *
     *     myPanel.on('hide', this.handleClick, this, {
     *         single: true,
     *         delay: 100
     *     });
     *
     */
    addListener: function(ename, fn, scope, options) {
        var me = this,
            config, event, hasListeners,
            prevListenerCount = 0;

        if (typeof ename !== 'string') {
            options = ename;
            for (ename in options) {
                if (options.hasOwnProperty(ename)) {
                    config = options[ename];
                    if (!me.eventOptionsRe.test(ename)) {
                        me.addListener(ename, config.fn || config, config.scope || options.scope, config.fn ? config : options);
                    }
                }
            }
        } else {
            ename = ename.toLowerCase();
            event = me.events[ename];
            if (event && event.isEvent) {
                prevListenerCount = event.listeners.length;
            } else {
                me.events[ename] = event = new Ext.util.Event(me, ename);
            }

            // Allow listeners: { click: 'onClick', scope: myObject }
            if (typeof fn === 'string') {
                if (!(scope[fn] || me[fn])) {
                    Ext.Error.raise('No method named "' + fn + '"');
                }
                fn = scope[fn] || me[fn];
            }
            event.addListener(fn, scope, options);

            // If a new listener has been added (Event.addListener rejects duplicates of the same fn+scope)
            // then increment the hasListeners counter
            if (event.listeners.length !== prevListenerCount) {
                hasListeners = me.hasListeners;
                if (hasListeners.hasOwnProperty(ename)) {
                    // if we already have listeners at this level, just increment the count...
                    ++hasListeners[ename];
                } else {
                    // otherwise, start the count at 1 (which hides whatever is in our prototype
                    // chain)...
                    hasListeners[ename] = 1;
                }
            }
        }
    },

    /**
     * Removes an event handler.
     *
     * @param {String} eventName The type of event the handler was associated with.
     * @param {Function} fn The handler to remove. **This must be a reference to the function passed into the
     * {@link #addListener} call.**
     * @param {Object} scope (optional) The scope originally specified for the handler. It must be the same as the
     * scope argument specified in the original call to {@link #addListener} or the listener will not be removed.
     */
    removeListener: function(ename, fn, scope) {
        var me = this,
            config,
            event,
            options;

        if (typeof ename !== 'string') {
            options = ename;
            for (ename in options) {
                if (options.hasOwnProperty(ename)) {
                    config = options[ename];
                    if (!me.eventOptionsRe.test(ename)) {
                        me.removeListener(ename, config.fn || config, config.scope || options.scope);
                    }
                }
            }
        } else {
            ename = ename.toLowerCase();
            event = me.events[ename];
            if (event && event.isEvent) {
                if (event.removeListener(fn, scope) && !--me.hasListeners[ename]) {
                    // Delete this entry, since 0 does not mean no one is listening, just
                    // that no one is *directly& listening. This allows the eventBus or
                    // class observers to "poke" through and expose their presence.
                    delete me.hasListeners[ename];
                }
            }
        }
    },

    /**
     * Removes all listeners for this object including the managed listeners
     */
    clearListeners: function() {
        var events = this.events,
            event,
            key;

        for (key in events) {
            if (events.hasOwnProperty(key)) {
                event = events[key];
                if (event.isEvent) {
                    event.clearListeners();
                }
            }
        }

        this.clearManagedListeners();
    },

    purgeListeners : function() {
        if (Ext.global.console) {
            Ext.global.console.warn('Observable: purgeListeners has been deprecated. Please use clearListeners.');
        }
        return this.clearListeners.apply(this, arguments);
    },

    /**
     * Removes all managed listeners for this object.
     */
    clearManagedListeners : function() {
        var managedListeners = this.managedListeners || [],
            i = 0,
            len = managedListeners.length;

        for (; i < len; i++) {
            this.removeManagedListenerItem(true, managedListeners[i]);
        }

        this.managedListeners = [];
    },

    /**
     * Remove a single managed listener item
     * @private
     * @param {Boolean} isClear True if this is being called during a clear
     * @param {Object} managedListener The managed listener item
     * See removeManagedListener for other args
     */
    removeManagedListenerItem: function(isClear, managedListener, item, ename, fn, scope){
        if (isClear || (managedListener.item === item && managedListener.ename === ename && (!fn || managedListener.fn === fn) && (!scope || managedListener.scope === scope))) {
            managedListener.item.un(managedListener.ename, managedListener.fn, managedListener.scope);
            if (!isClear) {
                Ext.Array.remove(this.managedListeners, managedListener);
            }
        }
    },

    purgeManagedListeners : function() {
        if (Ext.global.console) {
            Ext.global.console.warn('Observable: purgeManagedListeners has been deprecated. Please use clearManagedListeners.');
        }
        return this.clearManagedListeners.apply(this, arguments);
    },

    /**
     * Adds the specified events to the list of events which this Observable may fire.
     *
     * @param {Object/String...} eventNames Either an object with event names as properties with
     * a value of `true`. For example:
     *
     *     this.addEvents({
     *         storeloaded: true,
     *         storecleared: true
     *     });
     *
     * Or any number of event names as separate parameters. For example:
     *
     *     this.addEvents('storeloaded', 'storecleared');
     *
     */
    addEvents: function(o) {
        var me = this,
            events = me.events || (me.events = {}),
            arg, args, i;

        if (typeof o == 'string') {
            for (args = arguments, i = args.length; i--; ) {
                arg = args[i];
                if (!events[arg]) {
                    events[arg] = true;
                }
            }
        } else {
            Ext.applyIf(me.events, o);
        }
    },

    /**
     * Checks to see if this object has any listeners for a specified event, or whether the event bubbles. The answer
     * indicates whether the event needs firing or not.
     *
     * @param {String} eventName The name of the event to check for
     * @return {Boolean} `true` if the event is being listened for or bubbles, else `false`
     */
    hasListener: function(ename) {
        return !!this.hasListeners[ename.toLowerCase()];
    },

    /**
     * Suspends the firing of all events. (see {@link #resumeEvents})
     *
     * @param {Boolean} queueSuspended Pass as true to queue up suspended events to be fired
     * after the {@link #resumeEvents} call instead of discarding all suspended events.
     */
    suspendEvents: function(queueSuspended) {
        this.eventsSuspended += 1;
        if (queueSuspended && !this.eventQueue) {
            this.eventQueue = [];
        }
    },

    /**
     * Resumes firing events (see {@link #suspendEvents}).
     *
     * If events were suspended using the `queueSuspended` parameter, then all events fired
     * during event suspension will be sent to any listeners now.
     */
    resumeEvents: function() {
        var me = this,
            queued = me.eventQueue,
            qLen, q;

        if (me.eventsSuspended && ! --me.eventsSuspended) {
            delete me.eventQueue;

            if (queued) {
                qLen = queued.length;
                for (q = 0; q < qLen; q++) {
                    me.continueFireEvent.apply(me, queued[q]);
                }
            }
        }
    },

    /**
     * Relays selected events from the specified Observable as if the events were fired by `this`.
     *
     * For example if you are extending Grid, you might decide to forward some events from store.
     * So you can do this inside your initComponent:
     *
     *     this.relayEvents(this.getStore(), ['load']);
     *
     * The grid instance will then have an observable 'load' event which will be passed the
     * parameters of the store's load event and any function fired with the grid's load event
     * would have access to the grid using the `this` keyword.
     *
     * @param {Object} origin The Observable whose events this object is to relay.
     * @param {String[]} events Array of event names to relay.
     * @param {String} [prefix] A common prefix to prepend to the event names. For example:
     *
     *     this.relayEvents(this.getStore(), ['load', 'clear'], 'store');
     *
     * Now the grid will forward 'load' and 'clear' events of store as 'storeload' and 'storeclear'.
     */
    relayEvents : function(origin, events, prefix) {
        var me = this,
            len = events.length,
            i = 0,
            oldName,
            newName;

        for (; i < len; i++) {
            oldName = events[i];
            newName = prefix ? prefix + oldName : oldName;

            // Add the relaying function as a ManagedListener so that it is removed when this.clearListeners is called (usually when _this_ is destroyed)
            me.mon(origin, oldName, me.createRelayer(newName));
        }
    },

    /**
     * @private
     * Creates an event handling function which refires the event from this object as the passed event name.
     * @param newName
     * @param {Array} beginEnd (optional) The caller can specify on which indices to slice
     * @returns {Function}
     */
    createRelayer: function(newName, beginEnd){
        var me = this;
        return function() {
            return me.fireEvent.apply(me, [newName].concat(Array.prototype.slice.apply(arguments, beginEnd || [0, -1])));
        };
    },

    /**
     * Enables events fired by this Observable to bubble up an owner hierarchy by calling `this.getBubbleTarget()` if
     * present. There is no implementation in the Observable base class.
     *
     * This is commonly used by Ext.Components to bubble events to owner Containers.
     * See {@link Ext.Component#getBubbleTarget}. The default implementation in Ext.Component returns the
     * Component's immediate owner. But if a known target is required, this can be overridden to access the
     * required target more quickly.
     *
     * Example:
     *
     *     Ext.override(Ext.form.field.Base, {
     *         //  Add functionality to Field's initComponent to enable the change event to bubble
     *         initComponent : Ext.Function.createSequence(Ext.form.field.Base.prototype.initComponent, function() {
     *             this.enableBubble('change');
     *         }),
     *
     *         //  We know that we want Field's events to bubble directly to the FormPanel.
     *         getBubbleTarget : function() {
     *             if (!this.formPanel) {
     *                 this.formPanel = this.findParentByType('form');
     *             }
     *             return this.formPanel;
     *         }
     *     });
     *
     *     var myForm = new Ext.formPanel({
     *         title: 'User Details',
     *         items: [{
     *             ...
     *         }],
     *         listeners: {
     *             change: function() {
     *                 // Title goes red if form has been modified.
     *                 myForm.header.setStyle('color', 'red');
     *             }
     *         }
     *     });
     *
     * @param {String/String[]} eventNames The event name to bubble, or an Array of event names.
     */
    enableBubble: function(eventNames) {
        if (eventNames) {
            var me = this,
                names = (typeof eventNames == 'string') ? arguments : eventNames,
                length = names.length,
                events = me.events,
                ename, event, i;

            for (i = 0; i < length; ++i) {
                ename = names[i].toLowerCase();
                event = events[ename];

                if (!event || typeof event == 'boolean') {
                    events[ename] = event = new Ext.util.Event(me, ename);
                }

                // Event must fire if it bubbles (We don't know if anyone up the bubble hierarchy has listeners added)
                me.hasListeners[ename] = (me.hasListeners[ename]||0) + 1;

                event.bubble = true;
            }
        }
    }
}, function() {
    var Observable = this,
        proto = Observable.prototype,
        HasListeners = function () {},
        prepareMixin = function (T) {
            if (!T.HasListeners) {
                var proto = T.prototype;

                // Classes that use us as a mixin (best practice) need to be prepared.
                Observable.prepareClass(T, this);

                // Now that we are mixed in to class T, we need to watch T for derivations
                // and prepare them also.
                T.onExtended(function (U) {
                    Observable.prepareClass(U);
                });

                // Also, if a class uses us as a mixin and that class is then used as
                // a mixin, we need to be notified of that as well.
                if (proto.onClassMixedIn) {
                    // play nice with other potential overrides...
                    Ext.override(T, {
                        onClassMixedIn: function (U) {
                            prepareMixin.call(this, U);
                            this.callParent(arguments);
                        }
                    });
                } else {
                    // just us chickens, so add the method...
                    proto.onClassMixedIn = function (U) {
                        prepareMixin.call(this, U);
                    };
                }
            }
        };

    HasListeners.prototype = {
        //$$: 42  // to make sure we have a proper prototype
    };

    proto.HasListeners = Observable.HasListeners = HasListeners;

    Observable.createAlias({
        /**
         * @method
         * Shorthand for {@link #addListener}.
         * @inheritdoc Ext.util.Observable#addListener
         */
        on: 'addListener',
        /**
         * @method
         * Shorthand for {@link #removeListener}.
         * @inheritdoc Ext.util.Observable#removeListener
         */
        un: 'removeListener',
        /**
         * @method
         * Shorthand for {@link #addManagedListener}.
         * @inheritdoc Ext.util.Observable#addManagedListener
         */
        mon: 'addManagedListener',
        /**
         * @method
         * Shorthand for {@link #removeManagedListener}.
         * @inheritdoc Ext.util.Observable#removeManagedListener
         */
        mun: 'removeManagedListener'
    });

    //deprecated, will be removed in 5.0
    Observable.observeClass = Observable.observe;

    // this is considered experimental (along with beforeMethod, afterMethod, removeMethodListener?)
    // allows for easier interceptor and sequences, including cancelling and overwriting the return value of the call
    // private
    function getMethodEvent(method){
        var e = (this.methodEvents = this.methodEvents || {})[method],
            returnValue,
            v,
            cancel,
            obj = this,
            makeCall;

        if (!e) {
            this.methodEvents[method] = e = {};
            e.originalFn = this[method];
            e.methodName = method;
            e.before = [];
            e.after = [];

            makeCall = function(fn, scope, args){
                if((v = fn.apply(scope || obj, args)) !== undefined){
                    if (typeof v == 'object') {
                        if(v.returnValue !== undefined){
                            returnValue = v.returnValue;
                        }else{
                            returnValue = v;
                        }
                        cancel = !!v.cancel;
                    }
                    else
                        if (v === false) {
                            cancel = true;
                        }
                        else {
                            returnValue = v;
                        }
                }
            };

            this[method] = function(){
                var args = Array.prototype.slice.call(arguments, 0),
                    b, i, len;
                returnValue = v = undefined;
                cancel = false;

                for(i = 0, len = e.before.length; i < len; i++){
                    b = e.before[i];
                    makeCall(b.fn, b.scope, args);
                    if (cancel) {
                        return returnValue;
                    }
                }

                if((v = e.originalFn.apply(obj, args)) !== undefined){
                    returnValue = v;
                }

                for(i = 0, len = e.after.length; i < len; i++){
                    b = e.after[i];
                    makeCall(b.fn, b.scope, args);
                    if (cancel) {
                        return returnValue;
                    }
                }
                return returnValue;
            };
        }
        return e;
    }

    Ext.apply(proto, {
        onClassMixedIn: prepareMixin,

        // these are considered experimental
        // allows for easier interceptor and sequences, including cancelling and overwriting the return value of the call
        // adds an 'interceptor' called before the original method
        beforeMethod : function(method, fn, scope){
            getMethodEvent.call(this, method).before.push({
                fn: fn,
                scope: scope
            });
        },

        // adds a 'sequence' called after the original method
        afterMethod : function(method, fn, scope){
            getMethodEvent.call(this, method).after.push({
                fn: fn,
                scope: scope
            });
        },

        removeMethodListener: function(method, fn, scope){
            var e = this.getMethodEvent(method),
                i, len;
            for(i = 0, len = e.before.length; i < len; i++){
                if(e.before[i].fn == fn && e.before[i].scope == scope){
                    Ext.Array.erase(e.before, i, 1);
                    return;
                }
            }
            for(i = 0, len = e.after.length; i < len; i++){
                if(e.after[i].fn == fn && e.after[i].scope == scope){
                    Ext.Array.erase(e.after, i, 1);
                    return;
                }
            }
        },

        toggleEventLogging: function(toggle) {
            Ext.util.Observable[toggle ? 'capture' : 'releaseCapture'](this, function(en) {
                if (Ext.isDefined(Ext.global.console)) {
                    Ext.global.console.log(en, arguments);
                }
            });
        }
    });
});

/**
 * @private
 */
Ext.define('Ext.util.Offset', {

    /* Begin Definitions */

    statics: {
        fromObject: function(obj) {
            return new this(obj.x, obj.y);
        }
    },

    /* End Definitions */

    constructor: function(x, y) {
        this.x = (x != null && !isNaN(x)) ? x : 0;
        this.y = (y != null && !isNaN(y)) ? y : 0;

        return this;
    },

    copy: function() {
        return new Ext.util.Offset(this.x, this.y);
    },

    copyFrom: function(p) {
        this.x = p.x;
        this.y = p.y;
    },

    toString: function() {
        return "Offset[" + this.x + "," + this.y + "]";
    },

    equals: function(offset) {
        if(!(offset instanceof this.statics())) {
            Ext.Error.raise('Offset must be an instance of Ext.util.Offset');
        }

        return (this.x == offset.x && this.y == offset.y);
    },

    round: function(to) {
        if (!isNaN(to)) {
            var factor = Math.pow(10, to);
            this.x = Math.round(this.x * factor) / factor;
            this.y = Math.round(this.y * factor) / factor;
        } else {
            this.x = Math.round(this.x);
            this.y = Math.round(this.y);
        }
    },

    isZero: function() {
        return this.x == 0 && this.y == 0;
    }
});

/*
 * The dirty implementation in this class is quite naive. The reasoning for this is that the dirty state
 * will only be used in very specific circumstances, specifically, after the render process has begun but
 * the component is not yet rendered to the DOM. As such, we want it to perform as quickly as possible
 * so it's not as fully featured as you may expect.
 */

/**
 * Manages certain element-like data prior to rendering. These values are passed
 * on to the render process. This is currently used to manage the "class" and "style" attributes
 * of a component's primary el as well as the bodyEl of panels. This allows things like
 * addBodyCls in Panel to share logic with addCls in AbstractComponent.
 * @private
 */
Ext.define('Ext.util.ProtoElement', (function () {
    var splitWords = Ext.String.splitWords,
        toMap = Ext.Array.toMap;

    return {
        
        isProtoEl: true,
        
        /**
         * The property name for the className on the data object passed to {@link #writeTo}.
         */
        clsProp: 'cls',

        /**
         * The property name for the style on the data object passed to {@link #writeTo}.
         */
        styleProp: 'style',
        
        /**
         * The property name for the removed classes on the data object passed to {@link #writeTo}.
         */
        removedProp: 'removed',

        /**
         * True if the style must be converted to text during {@link #writeTo}. When used to
         * populate tpl data, this will be true. When used to populate {@link Ext.DomHelper}
         * specs, this will be false (the default).
         */
        styleIsText: false,

        constructor: function (config) {
            var me = this;

            Ext.apply(me, config);

            me.classList = splitWords(me.cls);
            me.classMap = toMap(me.classList);
            delete me.cls;

            if (Ext.isFunction(me.style)) {
                me.styleFn = me.style;
                delete me.style;
            } else if (typeof me.style == 'string') {
                me.style = Ext.Element.parseStyles(me.style);
            } else if (me.style) {
                me.style = Ext.apply({}, me.style); // don't edit the given object
            }
        },
        
        /**
         * Indicates that the current state of the object has been flushed to the DOM, so we need
         * to track any subsequent changes
         */
        flush: function(){
            this.flushClassList = [];
            this.removedClasses = {};
            // clear the style, it will be recreated if we add anything new
            delete this.style;
        },

        /**
         * Adds class to the element.
         * @param {String} cls One or more classnames separated with spaces.
         * @return {Ext.util.ProtoElement} this
         */
        addCls: function (cls) {
            var me = this,
                add = splitWords(cls),
                length = add.length,
                list = me.classList,
                map = me.classMap,
                flushList = me.flushClassList,
                i = 0,
                c;

            for (; i < length; ++i) {
                c = add[i];
                if (!map[c]) {
                    map[c] = true;
                    list.push(c);
                    if (flushList) {
                        flushList.push(c);
                        delete me.removedClasses[c];
                    }
                }
            }

            return me;
        },

        /**
         * True if the element has given class.
         * @param {String} cls
         * @return {Boolean}
         */
        hasCls: function (cls) {
            return cls in this.classMap;
        },

        /**
         * Removes class from the element.
         * @param {String} cls One or more classnames separated with spaces.
         * @return {Ext.util.ProtoElement} this
         */
        removeCls: function (cls) {
            var me = this,
                list = me.classList,
                newList = (me.classList = []),
                remove = toMap(splitWords(cls)),
                length = list.length,
                map = me.classMap,
                removedClasses = me.removedClasses,
                i, c;

            for (i = 0; i < length; ++i) {
                c = list[i];
                if (remove[c]) {
                    if (removedClasses) {
                        if (map[c]) {
                            removedClasses[c] = true;
                            Ext.Array.remove(me.flushClassList, c);
                        }
                    }
                    delete map[c];
                } else {
                    newList.push(c);
                }
            }

            return me;
        },

        /**
         * Adds styles to the element.
         * @param {String/Object} prop The style property to be set, or an object of multiple styles.
         * @param {String} [value] The value to apply to the given property.
         * @return {Ext.util.ProtoElement} this
         */
        setStyle: function (prop, value) {
            var me = this,
                style = me.style || (me.style = {});

            if (typeof prop == 'string') {
                if (arguments.length === 1) {
                    me.setStyle(Ext.Element.parseStyles(prop));
                } else {
                    style[prop] = value;
                }
            } else {
                Ext.apply(style, prop);
            }

            return me;
        },

        /**
         * Writes style and class properties to given object.
         * Styles will be written to {@link #styleProp} and class names to {@link #clsProp}.
         * @param {Object} to
         * @return {Object} to
         */
        writeTo: function (to) {
            var me = this,
                classList = me.flushClassList || me.classList,
                removedClasses = me.removedClasses,
                style;

            if (me.styleFn) {
                style = Ext.apply({}, me.styleFn());
                Ext.apply(style, me.style);
            } else {
                style = me.style;
            }

            to[me.clsProp] = classList.join(' ');

            if (style) {
                to[me.styleProp] = me.styleIsText ? Ext.DomHelper.generateStyles(style) : style;
            }
            
            if (removedClasses) {
                removedClasses = Ext.Object.getKeys(removedClasses);
                if (removedClasses.length) {
                    to[me.removedProp] = removedClasses.join(' ');
                }
            }

            return to;
        }
    };
}()));

/**
 * An internal Queue class.
 * @private
 */
Ext.define('Ext.util.Queue', {

    constructor: function() {
        this.clear();
    },

    add : function(obj) {
        var me = this,
            key = me.getKey(obj);

        if (!me.map[key]) {
            ++me.length;
            me.items.push(obj);
            me.map[key] = obj;
        }

        return obj;
    },

    /**
     * Removes all items from the collection.
     */
    clear : function(){
        var me = this,
            items = me.items;

        me.items = [];
        me.map = {};
        me.length = 0;

        return items;
    },

    contains: function (obj) {
        var key = this.getKey(obj);

        return this.map.hasOwnProperty(key);
    },

    /**
     * Returns the number of items in the collection.
     * @return {Number} the number of items in the collection.
     */
    getCount : function(){
        return this.length;
    },

    getKey : function(obj){
         return obj.id;
    },

    /**
     * Remove an item from the collection.
     * @param {Object} obj The item to remove.
     * @return {Object} The item removed or false if no item was removed.
     */
    remove : function(obj){
        var me = this,
            key = me.getKey(obj),
            items = me.items,
            index;

        if (me.map[key]) {
            index = Ext.Array.indexOf(items, obj);
            Ext.Array.erase(items, index, 1);
            delete me.map[key];
            --me.length;
        }

        return obj;
    }
});
/**
 * This class represents a rectangular region in X,Y space, and performs geometric
 * transformations or tests upon the region.
 *
 * This class may be used to compare the document regions occupied by elements.
 */
Ext.define('Ext.util.Region', {

    /* Begin Definitions */

    requires: ['Ext.util.Offset'],

    statics: {
        /**
         * @static
         * Retrieves an Ext.util.Region for a particular element.
         * @param {String/HTMLElement/Ext.Element} el An element ID, htmlElement or Ext.Element representing an element in the document.
         * @returns {Ext.util.Region} region
         */
        getRegion: function(el) {
            return Ext.fly(el).getPageBox(true);
        },

        /**
         * @static
         * Creates a Region from a "box" Object which contains four numeric properties `top`, `right`, `bottom` and `left`.
         * @param {Object} o An object with `top`, `right`, `bottom` and `left` properties.
         * @return {Ext.util.Region} region The Region constructed based on the passed object
         */
        from: function(o) {
            return new this(o.top, o.right, o.bottom, o.left);
        }
    },

    /* End Definitions */

    /**
     * Creates a region from the bounding sides.
     * @param {Number} top Top The topmost pixel of the Region.
     * @param {Number} right Right The rightmost pixel of the Region.
     * @param {Number} bottom Bottom The bottom pixel of the Region.
     * @param {Number} left Left The leftmost pixel of the Region.
     */
    constructor : function(t, r, b, l) {
        var me = this;
        me.y = me.top = me[1] = t;
        me.right = r;
        me.bottom = b;
        me.x = me.left = me[0] = l;
    },

    /**
     * Checks if this region completely contains the region that is passed in.
     * @param {Ext.util.Region} region
     * @return {Boolean}
     */
    contains : function(region) {
        var me = this;
        return (region.x >= me.x &&
                region.right <= me.right &&
                region.y >= me.y &&
                region.bottom <= me.bottom);

    },

    /**
     * Checks if this region intersects the region passed in.
     * @param {Ext.util.Region} region
     * @return {Ext.util.Region/Boolean} Returns the intersected region or false if there is no intersection.
     */
    intersect : function(region) {
        var me = this,
            t = Math.max(me.y, region.y),
            r = Math.min(me.right, region.right),
            b = Math.min(me.bottom, region.bottom),
            l = Math.max(me.x, region.x);

        if (b > t && r > l) {
            return new this.self(t, r, b, l);
        }
        else {
            return false;
        }
    },

    /**
     * Returns the smallest region that contains the current AND targetRegion.
     * @param {Ext.util.Region} region
     * @return {Ext.util.Region} a new region
     */
    union : function(region) {
        var me = this,
            t = Math.min(me.y, region.y),
            r = Math.max(me.right, region.right),
            b = Math.max(me.bottom, region.bottom),
            l = Math.min(me.x, region.x);

        return new this.self(t, r, b, l);
    },

    /**
     * Modifies the current region to be constrained to the targetRegion.
     * @param {Ext.util.Region} targetRegion
     * @return {Ext.util.Region} this
     */
    constrainTo : function(r) {
        var me = this,
            constrain = Ext.Number.constrain;
        me.top = me.y = constrain(me.top, r.y, r.bottom);
        me.bottom = constrain(me.bottom, r.y, r.bottom);
        me.left = me.x = constrain(me.left, r.x, r.right);
        me.right = constrain(me.right, r.x, r.right);
        return me;
    },

    /**
     * Modifies the current region to be adjusted by offsets.
     * @param {Number} top top offset
     * @param {Number} right right offset
     * @param {Number} bottom bottom offset
     * @param {Number} left left offset
     * @return {Ext.util.Region} this
     */
    adjust : function(t, r, b, l) {
        var me = this;
        me.top = me.y += t;
        me.left = me.x += l;
        me.right += r;
        me.bottom += b;
        return me;
    },

    /**
     * Get the offset amount of a point outside the region
     * @param {String} [axis]
     * @param {Ext.util.Point} [p] the point
     * @return {Ext.util.Offset}
     */
    getOutOfBoundOffset: function(axis, p) {
        if (!Ext.isObject(axis)) {
            if (axis == 'x') {
                return this.getOutOfBoundOffsetX(p);
            } else {
                return this.getOutOfBoundOffsetY(p);
            }
        } else {
            p = axis;
            var d = new Ext.util.Offset();
            d.x = this.getOutOfBoundOffsetX(p.x);
            d.y = this.getOutOfBoundOffsetY(p.y);
            return d;
        }

    },

    /**
     * Get the offset amount on the x-axis
     * @param {Number} p the offset
     * @return {Number}
     */
    getOutOfBoundOffsetX: function(p) {
        if (p <= this.x) {
            return this.x - p;
        } else if (p >= this.right) {
            return this.right - p;
        }

        return 0;
    },

    /**
     * Get the offset amount on the y-axis
     * @param {Number} p the offset
     * @return {Number}
     */
    getOutOfBoundOffsetY: function(p) {
        if (p <= this.y) {
            return this.y - p;
        } else if (p >= this.bottom) {
            return this.bottom - p;
        }

        return 0;
    },

    /**
     * Check whether the point / offset is out of bound
     * @param {String} [axis]
     * @param {Ext.util.Point/Number} [p] the point / offset
     * @return {Boolean}
     */
    isOutOfBound: function(axis, p) {
        if (!Ext.isObject(axis)) {
            if (axis == 'x') {
                return this.isOutOfBoundX(p);
            } else {
                return this.isOutOfBoundY(p);
            }
        } else {
            p = axis;
            return (this.isOutOfBoundX(p.x) || this.isOutOfBoundY(p.y));
        }
    },

    /**
     * Check whether the offset is out of bound in the x-axis
     * @param {Number} p the offset
     * @return {Boolean}
     */
    isOutOfBoundX: function(p) {
        return (p < this.x || p > this.right);
    },

    /**
     * Check whether the offset is out of bound in the y-axis
     * @param {Number} p the offset
     * @return {Boolean}
     */
    isOutOfBoundY: function(p) {
        return (p < this.y || p > this.bottom);
    },

    /**
     * Restrict a point within the region by a certain factor.
     * @param {String} [axis]
     * @param {Ext.util.Point/Ext.util.Offset/Object} [p]
     * @param {Number} [factor]
     * @return {Ext.util.Point/Ext.util.Offset/Object/Number}
     * @private
     */
    restrict: function(axis, p, factor) {
        if (Ext.isObject(axis)) {
            var newP;

            factor = p;
            p = axis;

            if (p.copy) {
                newP = p.copy();
            }
            else {
                newP = {
                    x: p.x,
                    y: p.y
                };
            }

            newP.x = this.restrictX(p.x, factor);
            newP.y = this.restrictY(p.y, factor);
            return newP;
        } else {
            if (axis == 'x') {
                return this.restrictX(p, factor);
            } else {
                return this.restrictY(p, factor);
            }
        }
    },

    /**
     * Restrict an offset within the region by a certain factor, on the x-axis
     * @param {Number} p
     * @param {Number} [factor=1] The factor.
     * @return {Number}
     * @private
     */
    restrictX : function(p, factor) {
        if (!factor) {
            factor = 1;
        }

        if (p <= this.x) {
            p -= (p - this.x) * factor;
        }
        else if (p >= this.right) {
            p -= (p - this.right) * factor;
        }
        return p;
    },

    /**
     * Restrict an offset within the region by a certain factor, on the y-axis
     * @param {Number} p
     * @param {Number} [factor] The factor, defaults to 1
     * @return {Number}
     * @private
     */
    restrictY : function(p, factor) {
        if (!factor) {
            factor = 1;
        }

        if (p <= this.y) {
            p -= (p - this.y) * factor;
        }
        else if (p >= this.bottom) {
            p -= (p - this.bottom) * factor;
        }
        return p;
    },

    /**
     * Get the width / height of this region
     * @return {Object} an object with width and height properties
     * @private
     */
    getSize: function() {
        return {
            width: this.right - this.x,
            height: this.bottom - this.y
        };
    },

    /**
     * Create a copy of this Region.
     * @return {Ext.util.Region}
     */
    copy: function() {
        return new this.self(this.y, this.right, this.bottom, this.x);
    },

    /**
     * Copy the values of another Region to this Region
     * @param {Ext.util.Region} p The region to copy from.
     * @return {Ext.util.Region} This Region
     */
    copyFrom: function(p) {
        var me = this;
        me.top = me.y = me[1] = p.y;
        me.right = p.right;
        me.bottom = p.bottom;
        me.left = me.x = me[0] = p.x;

        return this;
    },

    /*
     * Dump this to an eye-friendly string, great for debugging
     * @return {String}
     */
    toString: function() {
        return "Region[" + this.top + "," + this.right + "," + this.bottom + "," + this.left + "]";
    },

    /**
     * Translate this region by the given offset amount
     * @param {Ext.util.Offset/Object} x Object containing the `x` and `y` properties.
     * Or the x value is using the two argument form.
     * @param {Number} y The y value unless using an Offset object.
     * @return {Ext.util.Region} this This Region
     */
    translateBy: function(x, y) {
        if (arguments.length == 1) {
            y = x.y;
            x = x.x;
        }
        var me = this;
        me.top = me.y += y;
        me.right += x;
        me.bottom += y;
        me.left = me.x += x;

        return me;
    },

    /**
     * Round all the properties of this region
     * @return {Ext.util.Region} this This Region
     */
    round: function() {
        var me = this;
        me.top = me.y = Math.round(me.y);
        me.right = Math.round(me.right);
        me.bottom = Math.round(me.bottom);
        me.left = me.x = Math.round(me.x);

        return me;
    },

    /**
     * Check whether this region is equivalent to the given region
     * @param {Ext.util.Region} region The region to compare with
     * @return {Boolean}
     */
    equals: function(region) {
        return (this.top == region.top && this.right == region.right && this.bottom == region.bottom && this.left == region.left);
    }
});

/**
 * Given a component hierarchy of this:
 *
 *      {
 *          xtype: 'panel',
 *          id: 'ContainerA',
 *          layout: 'hbox',
 *          renderTo: Ext.getBody(),
 *          items: [
 *              {
 *                  id: 'ContainerB',
 *                  xtype: 'container',
 *                  items: [
 *                      { id: 'ComponentA' }
 *                  ]
 *              }
 *          ]
 *      }
 *
 * The rendering of the above proceeds roughly like this:
 *
 *  - ContainerA's initComponent calls #render passing the `renderTo` property as the
 *    container argument.
 *  - `render` calls the `getRenderTree` method to get a complete {@link Ext.DomHelper} spec.
 *  - `getRenderTree` fires the "beforerender" event and calls the #beforeRender
 *    method. Its result is obtained by calling #getElConfig.
 *  - The #getElConfig method uses the `renderTpl` and its render data as the content
 *    of the `autoEl` described element.
 *  - The result of `getRenderTree` is passed to {@link Ext.DomHelper#append}.
 *  - The `renderTpl` contains calls to render things like docked items, container items
 *    and raw markup (such as the `html` or `tpl` config properties). These calls are to
 *    methods added to the {@link Ext.XTemplate} instance by #setupRenderTpl.
 *  - The #setupRenderTpl method adds methods such as `renderItems`, `renderContent`, etc.
 *    to the template. These are directed to "doRenderItems", "doRenderContent" etc..
 *  - The #setupRenderTpl calls traverse from components to their {@link Ext.layout.Layout}
 *    object.
 *  - When a container is rendered, it also has a `renderTpl`. This is processed when the
 *    `renderContainer` method is called in the component's `renderTpl`. This call goes to
 *    Ext.layout.container.Container#doRenderContainer. This method repeats this
 *    process for all components in the container.
 *  - After the top-most component's markup is generated and placed in to the DOM, the next
 *    step is to link elements to their components and finish calling the component methods
 *    `onRender` and `afterRender` as well as fire the corresponding events.
 *  - The first step in this is to call #finishRender. This method descends the
 *    component hierarchy and calls `onRender` and fires the `render` event. These calls
 *    are delivered top-down to approximate the timing of these calls/events from previous
 *    versions.
 *  - During the pass, the component's `el` is set. Likewise, the `renderSelectors` and
 *    `childEls` are applied to capture references to the component's elements.
 *  - These calls are also made on the {@link Ext.layout.container.Container} layout to
 *    capture its elements. Both of these classes use {@link Ext.util.ElementContainer} to
 *    handle `childEls` processing.
 *  - Once this is complete, a similar pass is made by calling #finishAfterRender.
 *    This call also descends the component hierarchy, but this time the calls are made in
 *    a bottom-up order to `afterRender`.
 *
 * @private
 */
Ext.define('Ext.util.Renderable', {
    requires: [
        'Ext.dom.Element'
    ],

    frameCls: Ext.baseCSSPrefix + 'frame',

    frameIdRegex: /[\-]frame\d+[TMB][LCR]$/,

    frameElementCls: {
        tl: [],
        tc: [],
        tr: [],
        ml: [],
        mc: [],
        mr: [],
        bl: [],
        bc: [],
        br: []
    },

    frameElNames: ['TL','TC','TR','ML','MC','MR','BL','BC','BR'],

    frameTpl: [
        '{%this.renderDockedItems(out,values,0);%}',
        '<tpl if="top">',
            '<tpl if="left"><div id="{fgid}TL" class="{frameCls}-tl {baseCls}-tl {baseCls}-{ui}-tl<tpl for="uiCls"> {parent.baseCls}-{parent.ui}-{.}-tl</tpl>" style="background-position: {tl}; padding-left: {frameWidth}px" role="presentation"></tpl>',
                '<tpl if="right"><div id="{fgid}TR" class="{frameCls}-tr {baseCls}-tr {baseCls}-{ui}-tr<tpl for="uiCls"> {parent.baseCls}-{parent.ui}-{.}-tr</tpl>" style="background-position: {tr}; padding-right: {frameWidth}px" role="presentation"></tpl>',
                    '<div id="{fgid}TC" class="{frameCls}-tc {baseCls}-tc {baseCls}-{ui}-tc<tpl for="uiCls"> {parent.baseCls}-{parent.ui}-{.}-tc</tpl>" style="background-position: {tc}; height: {frameWidth}px" role="presentation"></div>',
                '<tpl if="right"></div></tpl>',
            '<tpl if="left"></div></tpl>',
        '</tpl>',
        '<tpl if="left"><div id="{fgid}ML" class="{frameCls}-ml {baseCls}-ml {baseCls}-{ui}-ml<tpl for="uiCls"> {parent.baseCls}-{parent.ui}-{.}-ml</tpl>" style="background-position: {ml}; padding-left: {frameWidth}px" role="presentation"></tpl>',
            '<tpl if="right"><div id="{fgid}MR" class="{frameCls}-mr {baseCls}-mr {baseCls}-{ui}-mr<tpl for="uiCls"> {parent.baseCls}-{parent.ui}-{.}-mr</tpl>" style="background-position: {mr}; padding-right: {frameWidth}px" role="presentation"></tpl>',
                '<div id="{fgid}MC" class="{frameCls}-mc {baseCls}-mc {baseCls}-{ui}-mc<tpl for="uiCls"> {parent.baseCls}-{parent.ui}-{.}-mc</tpl>" role="presentation">',
                    '{%this.applyRenderTpl(out, values)%}',
                '</div>',
            '<tpl if="right"></div></tpl>',
        '<tpl if="left"></div></tpl>',
        '<tpl if="bottom">',
            '<tpl if="left"><div id="{fgid}BL" class="{frameCls}-bl {baseCls}-bl {baseCls}-{ui}-bl<tpl for="uiCls"> {parent.baseCls}-{parent.ui}-{.}-bl</tpl>" style="background-position: {bl}; padding-left: {frameWidth}px" role="presentation"></tpl>',
                '<tpl if="right"><div id="{fgid}BR" class="{frameCls}-br {baseCls}-br {baseCls}-{ui}-br<tpl for="uiCls"> {parent.baseCls}-{parent.ui}-{.}-br</tpl>" style="background-position: {br}; padding-right: {frameWidth}px" role="presentation"></tpl>',
                    '<div id="{fgid}BC" class="{frameCls}-bc {baseCls}-bc {baseCls}-{ui}-bc<tpl for="uiCls"> {parent.baseCls}-{parent.ui}-{.}-bc</tpl>" style="background-position: {bc}; height: {frameWidth}px" role="presentation"></div>',
                '<tpl if="right"></div></tpl>',
            '<tpl if="left"></div></tpl>',
        '</tpl>',
        '{%this.renderDockedItems(out,values,1);%}'
    ],

    frameTableTpl: [
        '{%this.renderDockedItems(out,values,0);%}',
        '<table><tbody>',
            '<tpl if="top">',
                '<tr>',
                    '<tpl if="left"><td id="{fgid}TL" class="{frameCls}-tl {baseCls}-tl {baseCls}-{ui}-tl<tpl for="uiCls"> {parent.baseCls}-{parent.ui}-{.}-tl</tpl>" style="background-position: {tl}; padding-left:{frameWidth}px" role="presentation"></td></tpl>',
                    '<td id="{fgid}TC" class="{frameCls}-tc {baseCls}-tc {baseCls}-{ui}-tc<tpl for="uiCls"> {parent.baseCls}-{parent.ui}-{.}-tc</tpl>" style="background-position: {tc}; height: {frameWidth}px" role="presentation"></td>',
                    '<tpl if="right"><td id="{fgid}TR" class="{frameCls}-tr {baseCls}-tr {baseCls}-{ui}-tr<tpl for="uiCls"> {parent.baseCls}-{parent.ui}-{.}-tr</tpl>" style="background-position: {tr}; padding-left: {frameWidth}px" role="presentation"></td></tpl>',
                '</tr>',
            '</tpl>',
            '<tr>',
                '<tpl if="left"><td id="{fgid}ML" class="{frameCls}-ml {baseCls}-ml {baseCls}-{ui}-ml<tpl for="uiCls"> {parent.baseCls}-{parent.ui}-{.}-ml</tpl>" style="background-position: {ml}; padding-left: {frameWidth}px" role="presentation"></td></tpl>',
                '<td id="{fgid}MC" class="{frameCls}-mc {baseCls}-mc {baseCls}-{ui}-mc<tpl for="uiCls"> {parent.baseCls}-{parent.ui}-{.}-mc</tpl>" style="background-position: 0 0;" role="presentation">',
                    '{%this.applyRenderTpl(out, values)%}',
                '</td>',
                '<tpl if="right"><td id="{fgid}MR" class="{frameCls}-mr {baseCls}-mr {baseCls}-{ui}-mr<tpl for="uiCls"> {parent.baseCls}-{parent.ui}-{.}-mr</tpl>" style="background-position: {mr}; padding-left: {frameWidth}px" role="presentation"></td></tpl>',
            '</tr>',
            '<tpl if="bottom">',
                '<tr>',
                    '<tpl if="left"><td id="{fgid}BL" class="{frameCls}-bl {baseCls}-bl {baseCls}-{ui}-bl<tpl for="uiCls"> {parent.baseCls}-{parent.ui}-{.}-bl</tpl>" style="background-position: {bl}; padding-left: {frameWidth}px" role="presentation"></td></tpl>',
                    '<td id="{fgid}BC" class="{frameCls}-bc {baseCls}-bc {baseCls}-{ui}-bc<tpl for="uiCls"> {parent.baseCls}-{parent.ui}-{.}-bc</tpl>" style="background-position: {bc}; height: {frameWidth}px" role="presentation"></td>',
                    '<tpl if="right"><td id="{fgid}BR" class="{frameCls}-br {baseCls}-br {baseCls}-{ui}-br<tpl for="uiCls"> {parent.baseCls}-{parent.ui}-{.}-br</tpl>" style="background-position: {br}; padding-left: {frameWidth}px" role="presentation"></td></tpl>',
                '</tr>',
            '</tpl>',
        '</tbody></table>',
        '{%this.renderDockedItems(out,values,1);%}'
    ],

    /**
     * Allows addition of behavior after rendering is complete. At this stage the Component’s Element
     * will have been styled according to the configuration, will have had any configured CSS class
     * names added, and will be in the configured visibility and the configured enable state.
     *
     * @template
     * @protected
     */
    afterRender : function() {
        var me = this,
            data = {},
            protoEl = me.protoEl,
            target = me.getTargetEl(),
            item;

        me.finishRenderChildren();

        if (me.styleHtmlContent) {
            target.addCls(me.styleHtmlCls);
        }
        
        protoEl.writeTo(data);
        
        // Here we apply any styles that were set on the protoEl during the rendering phase
        // A majority of times this will not happen, but we still need to handle it
        
        item = data.removed;
        if (item) {
            target.removeCls(item);
        }
        
        item = data.cls;
        if (item.length) {
            target.addCls(item);
        }
        
        item = data.style;
        if (data.style) {
            target.setStyle(item);
        }
        
        me.protoEl = null;

        // If this is the outermost Container, lay it out as soon as it is rendered.
        if (!me.ownerCt) {
            me.updateLayout();
        }
    },

    afterFirstLayout : function(width, height) {
        var me = this,
            hasX = Ext.isDefined(me.x),
            hasY = Ext.isDefined(me.y),
            pos, xy;

        // For floaters, calculate x and y if they aren't defined by aligning
        // the sized element to the center of either the container or the ownerCt
        if (me.floating && (!hasX || !hasY)) {
            if (me.floatParent) {
                pos = me.floatParent.getTargetEl().getViewRegion();
                xy = me.el.getAlignToXY(me.floatParent.getTargetEl(), 'c-c');
                pos.left = xy[0] - pos.left;
                pos.top =  xy[1] - pos.top;
            } else {
                xy = me.el.getAlignToXY(me.container, 'c-c');
                pos = me.container.translatePoints(xy[0], xy[1]);
            }
            me.x = hasX ? me.x : pos.left;
            me.y = hasY ? me.y : pos.top;
            hasX = hasY = true;
        }

        if (hasX || hasY) {
            me.setPosition(me.x, me.y);
        }
        me.onBoxReady(width, height);
        if (me.hasListeners.boxready) {
            me.fireEvent('boxready', me, width, height);
        }
    },

    onBoxReady: Ext.emptyFn,

    /**
     * Sets references to elements inside the component. This applies {@link Ext.AbstractComponent#cfg-renderSelectors renderSelectors}
     * as well as {@link Ext.AbstractComponent#cfg-childEls childEls}.
     * @private
     */
    applyRenderSelectors: function() {
        var me = this,
            selectors = me.renderSelectors,
            el = me.el,
            dom = el.dom,
            selector;

        me.applyChildEls(el);

        // We still support renderSelectors. There are a few places in the framework that
        // need them and they are a documented part of the API. In fact, we support mixing
        // childEls and renderSelectors (no reason not to).
        if (selectors) {
            for (selector in selectors) {
                if (selectors.hasOwnProperty(selector) && selectors[selector]) {
                    me[selector] = Ext.get(Ext.DomQuery.selectNode(selectors[selector], dom));
                }
            }
        }
    },

    beforeRender: function () {
        var me = this,
            target = me.getTargetEl(),
            layout = me.getComponentLayout();

        // Just before rendering, set the frame flag if we are an always-framed component like Window or Tip.
        me.frame = me.frame || me.alwaysFramed;

        if (!layout.initialized) {
            layout.initLayout();
        }

        // Attempt to set overflow style prior to render if the targetEl can be accessed.
        // If the targetEl does not exist yet, this will take place in finishRender
        if (target) {
            target.setStyle(me.getOverflowStyle());
            me.overflowStyleSet = true;
        }

        me.setUI(me.ui);

        if (me.disabled) {
            // pass silent so the event doesn't fire the first time.
            me.disable(true);
        }
    },

    /**
     * @private
     * Called from the selected frame generation template to insert this Component's inner structure inside the framing structure.
     *
     * When framing is used, a selected frame generation template is used as the primary template of the #getElConfig instead
     * of the configured {@link Ext.AbstractComponent#renderTpl renderTpl}. The renderTpl is invoked by this method which is injected into the framing template.
     */
    doApplyRenderTpl: function(out, values) {
        // Careful! This method is bolted on to the frameTpl so all we get for context is
        // the renderData! The "this" pointer is the frameTpl instance!

        var me = values.$comp,
            tpl;

        // Don't do this if the component is already rendered:
        if (!me.rendered) {
            tpl = me.initRenderTpl();
            tpl.applyOut(values.renderData, out);
        }
    },

    /**
     * Handles autoRender.
     * Floating Components may have an ownerCt. If they are asking to be constrained, constrain them within that
     * ownerCt, and have their z-index managed locally. Floating Components are always rendered to document.body
     */
    doAutoRender: function() {
        var me = this;
        if (!me.rendered) {
            if (me.floating) {
                me.render(document.body);
            } else {
                me.render(Ext.isBoolean(me.autoRender) ? Ext.getBody() : me.autoRender);
            }
        }
    },

    doRenderContent: function (out, renderData) {
        // Careful! This method is bolted on to the renderTpl so all we get for context is
        // the renderData! The "this" pointer is the renderTpl instance!

        var me = renderData.$comp;

        if (me.html) {
            Ext.DomHelper.generateMarkup(me.html, out);
            delete me.html;
        }

        if (me.tpl) {
            // Make sure this.tpl is an instantiated XTemplate
            if (!me.tpl.isTemplate) {
                me.tpl = new Ext.XTemplate(me.tpl);
            }

            if (me.data) {
                //me.tpl[me.tplWriteMode](target, me.data);
                me.tpl.applyOut(me.data, out);
                delete me.data;
            }
        }
    },

    doRenderFramingDockedItems: function (out, renderData, after) {
        // Careful! This method is bolted on to the frameTpl so all we get for context is
        // the renderData! The "this" pointer is the frameTpl instance!

        var me = renderData.$comp;

        // Most components don't have dockedItems, so check for doRenderDockedItems on the
        // component (also, don't do this if the component is already rendered):
        if (!me.rendered && me.doRenderDockedItems) {
            // The "renderData" property is placed in scope for the renderTpl, but we don't
            // want to render docked items at that level in addition to the framing level:
            renderData.renderData.$skipDockedItems = true;

            // doRenderDockedItems requires the $comp property on renderData, but this is
            // set on the frameTpl's renderData as well:
            me.doRenderDockedItems.call(this, out, renderData, after);
        }
    },

    /**
     * This method visits the rendered component tree in a "top-down" order. That is, this
     * code runs on a parent component before running on a child. This method calls the
     * {@link #onRender} method of each component.
     * @param {Number} containerIdx The index into the Container items of this Component.
     *
     * @private
     */
    finishRender: function(containerIdx) {
        var me = this,
            tpl, data, contentEl, el, pre, hide;

        // We are typically called w/me.el==null as a child of some ownerCt that is being
        // rendered. We are also called by render for a normal component (w/o a configured
        // me.el). In this case, render sets me.el and me.rendering (indirectly). Lastly
        // we are also called on a component (like a Viewport) that has a configured me.el
        // (body for a Viewport) when render is called. In this case, it is not flagged as
        // "me.rendering" yet becasue it does not produce a renderTree. We use this to know
        // not to regen the renderTpl.

        if (!me.el || me.$pid) {
            if (me.container) {
                el = me.container.getById(me.id, true);
            } else {
                el = Ext.getDom(me.id);
            }

            if (!me.el) {
                // Typical case: we produced the el during render
                me.wrapPrimaryEl(el);
            } else {
                // We were configured with an el and created a proxy, so now we can swap
                // the proxy for me.el:
                delete me.$pid;

                if (!me.el.dom) {
                    // make sure me.el is an Element
                    me.wrapPrimaryEl(me.el);
                }
                el.parentNode.insertBefore(me.el.dom, el);
                Ext.removeNode(el); // remove placeholder el
                // TODO - what about class/style?
            }
        } else if (!me.rendering) {
            // We were configured with an el and then told to render (e.g., Viewport). We
            // need to generate the proper DOM. Insert first because the layout system
            // insists that child Component elements indices match the Component indices.
            tpl = me.initRenderTpl();
            if (tpl) {
                data = me.initRenderData();
                tpl.insertFirst(me.getTargetEl(), data);
            }
        }
        // else we are rendering

        if (!me.container) {
            // top-level rendered components will already have me.container set up
            me.container = Ext.get(me.el.dom.parentNode);
        }

        if (me.ctCls) {
            me.container.addCls(me.ctCls);
        }

        // Sets the rendered flag and clears the redering flag
        me.onRender(me.container, containerIdx);

        // If we could not access a target protoEl in bewforeRender, we have to set the overflow styles here.
        if (!me.overflowStyleSet) {
            me.getTargetEl().setStyle(me.getOverflowStyle());
        }

        // Tell the encapsulating element to hide itself in the way the Component is configured to hide
        // This means DISPLAY, VISIBILITY or OFFSETS.
        me.el.setVisibilityMode(Ext.Element[me.hideMode.toUpperCase()]);

        if (me.overCls) {
            me.el.hover(me.addOverCls, me.removeOverCls, me);
        }

        if (me.hasListeners.render) {
            me.fireEvent('render', me);
        }

        if (me.contentEl) {
            pre = Ext.baseCSSPrefix;
            hide = pre + 'hide-';
            contentEl = Ext.get(me.contentEl);
            contentEl.removeCls([pre+'hidden', hide+'display', hide+'offsets', hide+'nosize']);
            me.getTargetEl().appendChild(contentEl.dom);
        }

        me.afterRender(); // this can cause a layout
        if (me.hasListeners.afterrender) {
            me.fireEvent('afterrender', me);
        }
        me.initEvents();

        if (me.hidden) {
            // Hiding during the render process should not perform any ancillary
            // actions that the full hide process does; It is not hiding, it begins in a hidden state.'
            // So just make the element hidden according to the configured hideMode
            me.el.hide();
        }
    },

    finishRenderChildren: function () {
        var layout = this.getComponentLayout();

        layout.finishRender();
    },

    getElConfig : function() {
        var me = this,
            autoEl = me.autoEl,
            frameInfo = me.getFrameInfo(),
            config = {
                tag: 'div',
                tpl: frameInfo ? me.initFramingTpl(frameInfo.table) : me.initRenderTpl()
            },
            i, frameElNames, len, suffix, frameGenId;

        me.initStyles(me.protoEl);
        me.protoEl.writeTo(config);
        me.protoEl.flush();

        if (Ext.isString(autoEl)) {
            config.tag = autoEl;
        } else {
            Ext.apply(config, autoEl); // harmless if !autoEl
        }

        // It's important to assign the id here as an autoEl.id could have been (wrongly) applied and this would get things out of sync
        config.id = me.id;

        if (config.tpl) {
            // Use the framingTpl as the main content creating template. It will call out to this.applyRenderTpl(out, values)
            if (frameInfo) {
                frameElNames = me.frameElNames;
                len = frameElNames.length;
                frameGenId = me.id + '-frame1';

                me.frameGenId = 1;
                config.tplData = Ext.apply({}, {
                    $comp:      me,
                    fgid:       frameGenId,
                    ui:         me.ui,
                    uiCls:      me.uiCls,
                    frameCls:   me.frameCls,
                    baseCls:    me.baseCls,
                    frameWidth: frameInfo.maxWidth,
                    top:        !!frameInfo.top,
                    left:       !!frameInfo.left,
                    right:      !!frameInfo.right,
                    bottom:     !!frameInfo.bottom,
                    renderData: me.initRenderData()
                }, me.getFramePositions(frameInfo));

                // Add the childEls for each of the frame elements
                for (i = 0; i < len; i++) {
                    suffix = frameElNames[i];
                    me.addChildEls({ name: 'frame' + suffix, id: frameGenId + suffix });
                }

                // Panel must have a frameBody
                me.addChildEls({
                    name: 'frameBody',
                    id: frameGenId + 'MC'
                });
            } else {
                config.tplData = me.initRenderData();
            }
        }

        return config;
    },

    // Create the framingTpl from the string.
    // Poke in a reference to applyRenderTpl(frameInfo, out)
    initFramingTpl: function(table) {
        var tpl = table ? this.getTpl('frameTableTpl') : this.getTpl('frameTpl');

        if (tpl && !tpl.applyRenderTpl) {
            this.setupFramingTpl(tpl);
        }

        return tpl;
    },

    /**
     * @private
     * Inject a reference to the function which applies the render template into the framing template. The framing template
     * wraps the content.
     */
    setupFramingTpl: function(frameTpl) {
        frameTpl.applyRenderTpl = this.doApplyRenderTpl;
        frameTpl.renderDockedItems = this.doRenderFramingDockedItems;
    },

    /**
     * This function takes the position argument passed to onRender and returns a
     * DOM element that you can use in the insertBefore.
     * @param {String/Number/Ext.dom.Element/HTMLElement} position Index, element id or element you want
     * to put this component before.
     * @return {HTMLElement} DOM element that you can use in the insertBefore
     */
    getInsertPosition: function(position) {
        // Convert the position to an element to insert before
        if (position !== undefined) {
            if (Ext.isNumber(position)) {
                position = this.container.dom.childNodes[position];
            }
            else {
                position = Ext.getDom(position);
            }
        }

        return position;
    },

    getRenderTree: function() {
        var me = this;

        if (!me.hasListeners.beforerender || me.fireEvent('beforerender', me) !== false) {
            me.beforeRender();

            // Flag to let the layout's finishRenderItems and afterFinishRenderItems
            // know which items to process
            me.rendering = true;

            if (me.el) {
                // Since we are producing a render tree, we produce a "proxy el" that will
                // sit in the rendered DOM precisely where me.el belongs. We replace the
                // proxy el in the finishRender phase.
                return {
                    tag: 'div',
                    id: (me.$pid = Ext.id())
                };
            }

            return me.getElConfig();
        }

        return null;
    },

    initContainer: function(container) {
        var me = this;

        // If you render a component specifying the el, we get the container
        // of the el, and make sure we dont move the el around in the dom
        // during the render
        if (!container && me.el) {
            container = me.el.dom.parentNode;
            me.allowDomMove = false;
        }
        me.container = container.dom ? container : Ext.get(container);

        return me.container;
    },

    /**
     * Initialized the renderData to be used when rendering the renderTpl.
     * @return {Object} Object with keys and values that are going to be applied to the renderTpl
     * @private
     */
    initRenderData: function() {
        var me = this;

        return Ext.apply({
            $comp: me,
            id: me.id,
            ui: me.ui,
            uiCls: me.uiCls,
            baseCls: me.baseCls,
            componentCls: me.componentCls,
            frame: me.frame
        }, me.renderData);
    },

    /**
     * Initializes the renderTpl.
     * @return {Ext.XTemplate} The renderTpl XTemplate instance.
     * @private
     */
    initRenderTpl: function() {
        var tpl = this.getTpl('renderTpl');

        if (tpl && !tpl.renderContent) {
            this.setupRenderTpl(tpl);
        }

        return tpl;
    },

    /**
     * Template method called when this Component's DOM structure is created.
     *
     * At this point, this Component's (and all descendants') DOM structure *exists* but it has not
     * been layed out (positioned and sized).
     *
     * Subclasses which override this to gain access to the structure at render time should
     * call the parent class's method before attempting to access any child elements of the Component.
     *
     * @param {Ext.core.Element} parentNode The parent Element in which this Component's encapsulating element is contained.
     * @param {Number} containerIdx The index within the parent Container's child collection of this Component.
     *
     * @template
     * @protected
     */
    onRender: function(parentNode, containerIdx) {
        var me = this,
            x = me.x,
            y = me.y,
            lastBox, width, height,
            el = me.el,
            body = Ext.getBody().dom;

        // Wrap this Component in a reset wraper if necessary
        if (Ext.scopeResetCSS && !me.ownerCt) {
            // If this component's el is the body element, we add the reset class to the html tag
            if (el.dom === body) {
                el.parent().addCls(Ext.resetCls);
            }
            // Otherwise, we ensure that there is a wrapper which has the reset class
            else {
                // Floaters rendered into the body can all be bumped into the common reset element
                if (me.floating && me.el.dom.parentNode === body) {
                    Ext.resetElement.appendChild(me.el);
                }
                // Else we wrap this element in an element that adds the reset class.
                else {
                    // Wrap this Component's DOM with a reset structure as determined in EventManager's initExtCss closure.
                    me.resetEl = el.wrap(Ext.resetElementSpec, false, Ext.supports.CSS3LinearGradient ? undefined : '*');
                }
            }
        }

        me.applyRenderSelectors();

        // Flag set on getRenderTree to flag to the layout's postprocessing routine that
        // the Component is in the process of being rendered and needs postprocessing.
        delete me.rendering;

        me.rendered = true;

        // We need to remember these to avoid writing them during the initial layout:
        lastBox = null;

        if (x !== undefined) {
            lastBox = lastBox || {};
            lastBox.x = x;
        }
        if (y !== undefined) {
            lastBox = lastBox || {};
            lastBox.y = y;
        }
        // Framed components need their width/height to apply to the frame, which is
        // best handled in layout at present.
        // If we're using the content box model, we also cannot assign initial sizes since we do not know the border widths to subtract
        if (!me.getFrameInfo() && Ext.isBorderBox) {
            width = me.width;
            height = me.height;

            if (typeof width == 'number') {
                lastBox = lastBox || {};
                lastBox.width = width;
            }
            if (typeof height == 'number') {
                lastBox = lastBox || {};
                lastBox.height = height;
            }
        }

        me.lastBox = me.el.lastBox = lastBox;
    },

    /**
     * Renders the Component into the passed HTML element.
     * 
     * **If you are using a {@link Ext.container.Container Container} object to house this
     * Component, then do not use the render method.**
     *
     * A Container's child Components are rendered by that Container's
     * {@link Ext.container.Container#layout layout} manager when the Container is first rendered.
     *
     * If the Container is already rendered when a new child Component is added, you may need to call
     * the Container's {@link Ext.container.Container#doLayout doLayout} to refresh the view which
     * causes any unrendered child Components to be rendered. This is required so that you can add
     * multiple child components if needed while only refreshing the layout once.
     *
     * When creating complex UIs, it is important to remember that sizing and positioning
     * of child items is the responsibility of the Container's {@link Ext.container.Container#layout layout}
     * manager.  If you expect child items to be sized in response to user interactions, you must
     * configure the Container with a layout manager which creates and manages the type of layout you
     * have in mind.
     *
     * **Omitting the Container's {@link Ext.Container#layout layout} config means that a basic
     * layout manager is used which does nothing but render child components sequentially into the
     * Container. No sizing or positioning will be performed in this situation.**
     *
     * @param {Ext.Element/HTMLElement/String} [container] The element this Component should be
     * rendered into. If it is being created from existing markup, this should be omitted.
     * @param {String/Number} [position] The element ID or DOM node index within the container **before**
     * which this component will be inserted (defaults to appending to the end of the container)
     */
    render: function(container, position) {
        var me = this,
            el = me.el && (me.el = Ext.get(me.el)), // ensure me.el is wrapped
            vetoed,
            tree,
            nextSibling;

        Ext.suspendLayouts();

        container = me.initContainer(container);

        nextSibling = me.getInsertPosition(position);

        if (!el) {
            tree = me.getRenderTree();
            if (me.ownerLayout && me.ownerLayout.transformItemRenderTree) {
                tree = me.ownerLayout.transformItemRenderTree(tree);
            }

            // tree will be null if a beforerender listener returns false
            if (tree) {
                if (nextSibling) {
                    el = Ext.DomHelper.insertBefore(nextSibling, tree);
                } else {
                    el = Ext.DomHelper.append(container, tree);
                }

                me.wrapPrimaryEl(el);
            }
        } else {
            if (!me.hasListeners.beforerender || me.fireEvent('beforerender', me) !== false) {
                // Set configured styles on pre-rendered Component's element
                me.initStyles(el);
                if (me.allowDomMove !== false) {
                    //debugger; // TODO
                    if (nextSibling) {
                        container.dom.insertBefore(el.dom, nextSibling);
                    } else {
                        container.dom.appendChild(el.dom);
                    }
                }
            } else {
                vetoed = true;
            }
        }

        if (el && !vetoed) {
            me.finishRender(position);
        }

        Ext.resumeLayouts(!container.isDetachedBody);
    },

    /**
     * Ensures that this component is attached to `document.body`. If the component was
     * rendered to {@link Ext#getDetachedBody}, then it will be appended to `document.body`.
     * Any configured position is also restored.
     * @param {Boolean} [runLayout=false] True to run the component's layout.
     */
    ensureAttachedToBody: function (runLayout) {
        var comp = this,
            body;

        while (comp.ownerCt) {
            comp = comp.ownerCt;
        }

        if (comp.container.isDetachedBody) {
            comp.container = body = Ext.resetElement;
            body.appendChild(comp.el.dom);
            if (runLayout) {
                comp.updateLayout();
            }
            if (typeof comp.x == 'number' || typeof comp.y == 'number') {
                comp.setPosition(comp.x, comp.y);
            }
        }
    },

    setupRenderTpl: function (renderTpl) {
        renderTpl.renderBody = renderTpl.renderContent = this.doRenderContent;
    },

    wrapPrimaryEl: function (dom) {
        this.el = Ext.get(dom, true);
    },

    /**
     * @private
     */
    initFrame : function() {
        if (Ext.supports.CSS3BorderRadius || !this.frame) {
            return;
        }

        var me = this,
            frameInfo = me.getFrameInfo(),
            frameWidth, frameTpl, frameGenId,
            i,
            frameElNames = me.frameElNames,
            len = frameElNames.length,
            suffix;

        if (frameInfo) {
            frameWidth = frameInfo.maxWidth;
            frameTpl = me.getFrameTpl(frameInfo.table);

            // since we render id's into the markup and id's NEED to be unique, we have a
            // simple strategy for numbering their generations.
            me.frameGenId = frameGenId = (me.frameGenId || 0) + 1;
            frameGenId = me.id + '-frame' + frameGenId;

            // Here we render the frameTpl to this component. This inserts the 9point div or the table framing.
            frameTpl.insertFirst(me.el, Ext.apply({
                $comp:      me,
                fgid:       frameGenId,
                ui:         me.ui,
                uiCls:      me.uiCls,
                frameCls:   me.frameCls,
                baseCls:    me.baseCls,
                frameWidth: frameWidth,
                top:        !!frameInfo.top,
                left:       !!frameInfo.left,
                right:      !!frameInfo.right,
                bottom:     !!frameInfo.bottom
            }, me.getFramePositions(frameInfo)));

            // The frameBody is returned in getTargetEl, so that layouts render items to the correct target.
            me.frameBody = me.el.down('.' + me.frameCls + '-mc');

            // Clean out the childEls for the old frame elements (the majority of the els)
            me.removeChildEls(function (c) {
                return c.id && me.frameIdRegex.test(c.id);
            });

            // Grab references to the childEls for each of the new frame elements
            for (i = 0; i < len; i++) {
                suffix = frameElNames[i];
                me['frame' + suffix] = me.el.getById(frameGenId + suffix);
            }
        }
    },

    updateFrame: function() {
        if (Ext.supports.CSS3BorderRadius || !this.frame) {
            return;
        }

        var me = this,
            wasTable = this.frameSize && this.frameSize.table,
            oldFrameTL = this.frameTL,
            oldFrameBL = this.frameBL,
            oldFrameML = this.frameML,
            oldFrameMC = this.frameMC,
            newMCClassName;

        this.initFrame();

        if (oldFrameMC) {
            if (me.frame) {

                // Store the class names set on the new MC
                newMCClassName = this.frameMC.dom.className;

                // Framing elements have been selected in initFrame, no need to run applyRenderSelectors
                // Replace the new mc with the old mc
                oldFrameMC.insertAfter(this.frameMC);
                this.frameMC.remove();

                // Restore the reference to the old frame mc as the framebody
                this.frameBody = this.frameMC = oldFrameMC;

                // Apply the new mc classes to the old mc element
                oldFrameMC.dom.className = newMCClassName;

                // Remove the old framing
                if (wasTable) {
                    me.el.query('> table')[1].remove();
                }
                else {
                    if (oldFrameTL) {
                        oldFrameTL.remove();
                    }
                    if (oldFrameBL) {
                        oldFrameBL.remove();
                    }
                    if (oldFrameML) {
                        oldFrameML.remove();
                    }
                }
            }
        }
        else if (me.frame) {
            this.applyRenderSelectors();
        }
    },

    /**
     * @private
     * On render, reads an encoded style attribute, "background-position" from the style of this Component's element.
     * This information is memoized based upon the CSS class name of this Component's element.
     * Because child Components are rendered as textual HTML as part of the topmost Container, a dummy div is inserted
     * into the document to receive the document element's CSS class name, and therefore style attributes.
     */
    getFrameInfo: function() {
        // If native framing can be used, or this component is not going to be framed, then do not attempt to read CSS framing info.
        if (Ext.supports.CSS3BorderRadius || !this.frame) {
            return false;
        }

        var me = this,
            frameInfoCache = me.frameInfoCache,
            el = me.el || me.protoEl,
            cls = el.dom ? el.dom.className : el.classList.join(' '),
            frameInfo = frameInfoCache[cls],
            styleEl, left, top, info;

        if (frameInfo == null) {
            // Get the singleton frame style proxy with our el class name stamped into it.
            styleEl = Ext.fly(me.getStyleProxy(cls), 'frame-style-el');
            left = styleEl.getStyle('background-position-x');
            top = styleEl.getStyle('background-position-y');

            // Some browsers don't support background-position-x and y, so for those
            // browsers let's split background-position into two parts.
            if (!left && !top) {
                info = styleEl.getStyle('background-position').split(' ');
                left = info[0];
                top = info[1];
            }

            frameInfo = me.calculateFrame(left, top);

            if (frameInfo) {
                // Just to be sure we set the background image of the el to none.
                el.setStyle('background-image', 'none');
            }

            // This happens when you set frame: true explicitly without using the x-frame mixin in sass.
            // This way IE can't figure out what sizes to use and thus framing can't work.
            if (me.frame === true && !frameInfo) {
                Ext.log.error('You have set frame: true explicity on this component (' + me.getXType() + ') and it ' +
                        'does not have any framing defined in the CSS template. In this case IE cannot figure out ' +
                        'what sizes to use and thus framing on this component will be disabled.');
            }

            frameInfoCache[cls] = frameInfo;
        }

        me.frame = !!frameInfo;
        me.frameSize = frameInfo;

        return frameInfo;
    },
    
    calculateFrame: function(left, top){
        // We actually pass a string in the form of '[type][tl][tr]px [direction][br][bl]px' as
        // the background position of this.el from the CSS to indicate to IE that this component needs
        // framing. We parse it here.
        if (!(parseInt(left, 10) >= 1000000 && parseInt(top, 10) >= 1000000)) {
            return false;
        }
        var max = Math.max,
            tl = parseInt(left.substr(3, 2), 10),
            tr = parseInt(left.substr(5, 2), 10),
            br = parseInt(top.substr(3, 2), 10),
            bl = parseInt(top.substr(5, 2), 10),
            frameInfo = {
                // Table markup starts with 110, div markup with 100.
                table: left.substr(0, 3) == '110',

                // Determine if we are dealing with a horizontal or vertical component
                vertical: top.substr(0, 3) == '110',

                // Get and parse the different border radius sizes
                top:    max(tl, tr),
                right:  max(tr, br),
                bottom: max(bl, br),
                left:   max(tl, bl)
            };

        frameInfo.maxWidth = max(frameInfo.top, frameInfo.right, frameInfo.bottom, frameInfo.left);
        frameInfo.width = frameInfo.left + frameInfo.right;
        frameInfo.height = frameInfo.top + frameInfo.bottom;
        return frameInfo;
    },

    /**
     * @private
     * Returns an offscreen div with the same class name as the element this is being rendered.
     * This is because child item rendering takes place in a detached div which, being not part of the document, has no styling.
     */
    getStyleProxy: function(cls) {
        var result = this.styleProxyEl || (Ext.AbstractComponent.prototype.styleProxyEl = Ext.resetElement.createChild({
                style: {
                    position: 'absolute',
                    top: '-10000px'
                }
            }, null, true));

        result.className = cls;
        return result;
    },

    getFramePositions: function(frameInfo) {
        var me = this,
            frameWidth = frameInfo.maxWidth,
            dock = me.dock,
            positions, tc, bc, ml, mr;

        if (frameInfo.vertical) {
            tc = '0 -' + (frameWidth * 0) + 'px';
            bc = '0 -' + (frameWidth * 1) + 'px';

            if (dock && dock == "right") {
                tc = 'right -' + (frameWidth * 0) + 'px';
                bc = 'right -' + (frameWidth * 1) + 'px';
            }

            positions = {
                tl: '0 -' + (frameWidth * 0) + 'px',
                tr: '0 -' + (frameWidth * 1) + 'px',
                bl: '0 -' + (frameWidth * 2) + 'px',
                br: '0 -' + (frameWidth * 3) + 'px',

                ml: '-' + (frameWidth * 1) + 'px 0',
                mr: 'right 0',

                tc: tc,
                bc: bc
            };
        } else {
            ml = '-' + (frameWidth * 0) + 'px 0';
            mr = 'right 0';

            if (dock && dock == "bottom") {
                ml = 'left bottom';
                mr = 'right bottom';
            }

            positions = {
                tl: '0 -' + (frameWidth * 2) + 'px',
                tr: 'right -' + (frameWidth * 3) + 'px',
                bl: '0 -' + (frameWidth * 4) + 'px',
                br: 'right -' + (frameWidth * 5) + 'px',

                ml: ml,
                mr: mr,

                tc: '0 -' + (frameWidth * 0) + 'px',
                bc: '0 -' + (frameWidth * 1) + 'px'
            };
        }

        return positions;
    },

    /**
     * @private
     */
    getFrameTpl : function(table) {
        return this.getTpl(table ? 'frameTableTpl' : 'frameTpl');
    },

    // Cache the frame information object so as not to cause style recalculations
    frameInfoCache: {}
});

/**
 * Represents a single sorter that can be applied to a Store. The sorter is used
 * to compare two values against each other for the purpose of ordering them. Ordering
 * is achieved by specifying either:
 *
 * - {@link #property A sorting property}
 * - {@link #sorterFn A sorting function}
 *
 * As a contrived example, we can specify a custom sorter that sorts by rank:
 *
 *     Ext.define('Person', {
 *         extend: 'Ext.data.Model',
 *         fields: ['name', 'rank']
 *     });
 *
 *     Ext.create('Ext.data.Store', {
 *         model: 'Person',
 *         proxy: 'memory',
 *         sorters: [{
 *             sorterFn: function(o1, o2){
 *                 var getRank = function(o){
 *                     var name = o.get('rank');
 *                     if (name === 'first') {
 *                         return 1;
 *                     } else if (name === 'second') {
 *                         return 2;
 *                     } else {
 *                         return 3;
 *                     }
 *                 },
 *                 rank1 = getRank(o1),
 *                 rank2 = getRank(o2);
 *
 *                 if (rank1 === rank2) {
 *                     return 0;
 *                 }
 *
 *                 return rank1 < rank2 ? -1 : 1;
 *             }
 *         }],
 *         data: [{
 *             name: 'Person1',
 *             rank: 'second'
 *         }, {
 *             name: 'Person2',
 *             rank: 'third'
 *         }, {
 *             name: 'Person3',
 *             rank: 'first'
 *         }]
 *     });
 */
Ext.define('Ext.util.Sorter', {

    /**
     * @cfg {String} property
     * The property to sort by. Required unless {@link #sorterFn} is provided. The property is extracted from the object
     * directly and compared for sorting using the built in comparison operators.
     */
    
    /**
     * @cfg {Function} sorterFn
     * A specific sorter function to execute. Can be passed instead of {@link #property}. This sorter function allows
     * for any kind of custom/complex comparisons. The sorterFn receives two arguments, the objects being compared. The
     * function should return:
     *
     *   - -1 if o1 is "less than" o2
     *   - 0 if o1 is "equal" to o2
     *   - 1 if o1 is "greater than" o2
     */
    
    /**
     * @cfg {String} root
     * Optional root property. This is mostly useful when sorting a Store, in which case we set the root to 'data' to
     * make the filter pull the {@link #property} out of the data object of each item
     */
    
    /**
     * @cfg {Function} transform
     * A function that will be run on each value before it is compared in the sorter. The function will receive a single
     * argument, the value.
     */
    
    /**
     * @cfg {String} direction
     * The direction to sort by.
     */
    direction: "ASC",
    
    constructor: function(config) {
        var me = this;
        
        Ext.apply(me, config);
        
        if (me.property === undefined && me.sorterFn === undefined) {
            Ext.Error.raise("A Sorter requires either a property or a sorter function");
        }
        
        me.updateSortFunction();
    },
    
    /**
     * @private
     * Creates and returns a function which sorts an array by the given property and direction
     * @return {Function} A function which sorts by the property/direction combination provided
     */
    createSortFunction: function(sorterFn) {
        var me        = this,
            property  = me.property,
            direction = me.direction || "ASC",
            modifier  = direction.toUpperCase() == "DESC" ? -1 : 1;
        
        //create a comparison function. Takes 2 objects, returns 1 if object 1 is greater,
        //-1 if object 2 is greater or 0 if they are equal
        return function(o1, o2) {
            return modifier * sorterFn.call(me, o1, o2);
        };
    },
    
    /**
     * @private
     * Basic default sorter function that just compares the defined property of each object
     */
    defaultSorterFn: function(o1, o2) {
        var me = this,
            transform = me.transform,
            v1 = me.getRoot(o1)[me.property],
            v2 = me.getRoot(o2)[me.property];
            
        if (transform) {
            v1 = transform(v1);
            v2 = transform(v2);
        }

        return v1 > v2 ? 1 : (v1 < v2 ? -1 : 0);
    },
    
    /**
     * @private
     * Returns the root property of the given item, based on the configured {@link #root} property
     * @param {Object} item The item
     * @return {Object} The root property of the object
     */
    getRoot: function(item) {
        return this.root === undefined ? item : item[this.root];
    },
    
    /**
     * Set the sorting direction for this sorter.
     * @param {String} direction The direction to sort in. Should be either 'ASC' or 'DESC'.
     */
    setDirection: function(direction) {
        var me = this;
        me.direction = direction ? direction.toUpperCase() : direction;
        me.updateSortFunction();
    },
    
    /**
     * Toggles the sorting direction for this sorter.
     */
    toggle: function() {
        var me = this;
        me.direction = Ext.String.toggle(me.direction, "ASC", "DESC");
        me.updateSortFunction();
    },
    
    /**
     * Update the sort function for this sorter.
     * @param {Function} [fn] A new sorter function for this sorter. If not specified it will use the default
     * sorting function.
     */
    updateSortFunction: function(fn) {
        var me = this;
        fn = fn || me.sorterFn || me.defaultSorterFn;
        me.sort = me.createSortFunction(fn);
    }
});









/**
 * This animation class is a mixin.
 *
 * Ext.util.Animate provides an API for the creation of animated transitions of properties and styles.
 * This class is used as a mixin and currently applied to {@link Ext.Element}, {@link Ext.CompositeElement},
 * {@link Ext.draw.Sprite}, {@link Ext.draw.CompositeSprite}, and {@link Ext.Component}.  Note that Components
 * have a limited subset of what attributes can be animated such as top, left, x, y, height, width, and
 * opacity (color, paddings, and margins can not be animated).
 *
 * ## Animation Basics
 *
 * All animations require three things - `easing`, `duration`, and `to` (the final end value for each property)
 * you wish to animate. Easing and duration are defaulted values specified below.
 * Easing describes how the intermediate values used during a transition will be calculated.
 * {@link Ext.fx.Anim#easing Easing} allows for a transition to change speed over its duration.
 * You may use the defaults for easing and duration, but you must always set a
 * {@link Ext.fx.Anim#to to} property which is the end value for all animations.
 *
 * Popular element 'to' configurations are:
 *
 *  - opacity
 *  - x
 *  - y
 *  - color
 *  - height
 *  - width
 *
 * Popular sprite 'to' configurations are:
 *
 *  - translation
 *  - path
 *  - scale
 *  - stroke
 *  - rotation
 *
 * The default duration for animations is 250 (which is a 1/4 of a second).  Duration is denoted in
 * milliseconds.  Therefore 1 second is 1000, 1 minute would be 60000, and so on. The default easing curve
 * used for all animations is 'ease'.  Popular easing functions are included and can be found in {@link Ext.fx.Anim#easing Easing}.
 *
 * For example, a simple animation to fade out an element with a default easing and duration:
 *
 *     var p1 = Ext.get('myElementId');
 *
 *     p1.animate({
 *         to: {
 *             opacity: 0
 *         }
 *     });
 *
 * To make this animation fade out in a tenth of a second:
 *
 *     var p1 = Ext.get('myElementId');
 *
 *     p1.animate({
 *        duration: 100,
 *         to: {
 *             opacity: 0
 *         }
 *     });
 *
 * ## Animation Queues
 *
 * By default all animations are added to a queue which allows for animation via a chain-style API.
 * For example, the following code will queue 4 animations which occur sequentially (one right after the other):
 *
 *     p1.animate({
 *         to: {
 *             x: 500
 *         }
 *     }).animate({
 *         to: {
 *             y: 150
 *         }
 *     }).animate({
 *         to: {
 *             backgroundColor: '#f00'  //red
 *         }
 *     }).animate({
 *         to: {
 *             opacity: 0
 *         }
 *     });
 *
 * You can change this behavior by calling the {@link Ext.util.Animate#syncFx syncFx} method and all
 * subsequent animations for the specified target will be run concurrently (at the same time).
 *
 *     p1.syncFx();  //this will make all animations run at the same time
 *
 *     p1.animate({
 *         to: {
 *             x: 500
 *         }
 *     }).animate({
 *         to: {
 *             y: 150
 *         }
 *     }).animate({
 *         to: {
 *             backgroundColor: '#f00'  //red
 *         }
 *     }).animate({
 *         to: {
 *             opacity: 0
 *         }
 *     });
 *
 * This works the same as:
 *
 *     p1.animate({
 *         to: {
 *             x: 500,
 *             y: 150,
 *             backgroundColor: '#f00'  //red
 *             opacity: 0
 *         }
 *     });
 *
 * The {@link Ext.util.Animate#stopAnimation stopAnimation} method can be used to stop any
 * currently running animations and clear any queued animations.
 *
 * ## Animation Keyframes
 *
 * You can also set up complex animations with {@link Ext.fx.Anim#keyframes keyframes} which follow the
 * CSS3 Animation configuration pattern. Note rotation, translation, and scaling can only be done for sprites.
 * The previous example can be written with the following syntax:
 *
 *     p1.animate({
 *         duration: 1000,  //one second total
 *         keyframes: {
 *             25: {     //from 0 to 250ms (25%)
 *                 x: 0
 *             },
 *             50: {   //from 250ms to 500ms (50%)
 *                 y: 0
 *             },
 *             75: {  //from 500ms to 750ms (75%)
 *                 backgroundColor: '#f00'  //red
 *             },
 *             100: {  //from 750ms to 1sec
 *                 opacity: 0
 *             }
 *         }
 *     });
 *
 * ## Animation Events
 *
 * Each animation you create has events for {@link Ext.fx.Anim#beforeanimate beforeanimate},
 * {@link Ext.fx.Anim#afteranimate afteranimate}, and {@link Ext.fx.Anim#lastframe lastframe}.
 * Keyframed animations adds an additional {@link Ext.fx.Animator#keyframe keyframe} event which
 * fires for each keyframe in your animation.
 *
 * All animations support the {@link Ext.util.Observable#listeners listeners} configuration to attact functions to these events.
 *
 *     startAnimate: function() {
 *         var p1 = Ext.get('myElementId');
 *         p1.animate({
 *            duration: 100,
 *             to: {
 *                 opacity: 0
 *             },
 *             listeners: {
 *                 beforeanimate:  function() {
 *                     // Execute my custom method before the animation
 *                     this.myBeforeAnimateFn();
 *                 },
 *                 afteranimate: function() {
 *                     // Execute my custom method after the animation
 *                     this.myAfterAnimateFn();
 *                 },
 *                 scope: this
 *         });
 *     },
 *     myBeforeAnimateFn: function() {
 *       // My custom logic
 *     },
 *     myAfterAnimateFn: function() {
 *       // My custom logic
 *     }
 *
 * Due to the fact that animations run asynchronously, you can determine if an animation is currently
 * running on any target by using the {@link Ext.util.Animate#getActiveAnimation getActiveAnimation}
 * method.  This method will return false if there are no active animations or return the currently
 * running {@link Ext.fx.Anim} instance.
 *
 * In this example, we're going to wait for the current animation to finish, then stop any other
 * queued animations before we fade our element's opacity to 0:
 *
 *     var curAnim = p1.getActiveAnimation();
 *     if (curAnim) {
 *         curAnim.on('afteranimate', function() {
 *             p1.stopAnimation();
 *             p1.animate({
 *                 to: {
 *                     opacity: 0
 *                 }
 *             });
 *         });
 *     }
 */
Ext.define('Ext.util.Animate', {

    uses: ['Ext.fx.Manager', 'Ext.fx.Anim'],

    /**
     * Performs custom animation on this object.
     *
     * This method is applicable to both the {@link Ext.Component Component} class and the {@link Ext.draw.Sprite Sprite}
     * class. It performs animated transitions of certain properties of this object over a specified timeline.
     *
     * ### Animating a {@link Ext.Component Component}
     *
     * When animating a Component, the following properties may be specified in `from`, `to`, and `keyframe` objects:
     *
     *   - `x` - The Component's page X position in pixels.
     *
     *   - `y` - The Component's page Y position in pixels
     *
     *   - `left` - The Component's `left` value in pixels.
     *
     *   - `top` - The Component's `top` value in pixels.
     *
     *   - `width` - The Component's `width` value in pixels.
     *
     *   - `width` - The Component's `width` value in pixels.
     *
     *   - `dynamic` - Specify as true to update the Component's layout (if it is a Container) at every frame of the animation.
     *     *Use sparingly as laying out on every intermediate size change is an expensive operation.*
     *
     * For example, to animate a Window to a new size, ensuring that its internal layout and any shadow is correct:
     *
     *     myWindow = Ext.create('Ext.window.Window', {
     *         title: 'Test Component animation',
     *         width: 500,
     *         height: 300,
     *         layout: {
     *             type: 'hbox',
     *             align: 'stretch'
     *         },
     *         items: [{
     *             title: 'Left: 33%',
     *             margins: '5 0 5 5',
     *             flex: 1
     *         }, {
     *             title: 'Left: 66%',
     *             margins: '5 5 5 5',
     *             flex: 2
     *         }]
     *     });
     *     myWindow.show();
     *     myWindow.header.el.on('click', function() {
     *         myWindow.animate({
     *             to: {
     *                 width: (myWindow.getWidth() == 500) ? 700 : 500,
     *                 height: (myWindow.getHeight() == 300) ? 400 : 300
     *             }
     *         });
     *     });
     *
     * For performance reasons, by default, the internal layout is only updated when the Window reaches its final `"to"`
     * size. If dynamic updating of the Window's child Components is required, then configure the animation with
     * `dynamic: true` and the two child items will maintain their proportions during the animation.
     *
     * @param {Object} config  Configuration for {@link Ext.fx.Anim}.
     * Note that the {@link Ext.fx.Anim#to to} config is required.
     * @return {Object} this
     */
    animate: function(animObj) {
        var me = this;
        if (Ext.fx.Manager.hasFxBlock(me.id)) {
            return me;
        }
        Ext.fx.Manager.queueFx(new Ext.fx.Anim(me.anim(animObj)));
        return this;
    },

    // @private - process the passed fx configuration.
    anim: function(config) {
        if (!Ext.isObject(config)) {
            return (config) ? {} : false;
        }

        var me = this;

        if (config.stopAnimation) {
            me.stopAnimation();
        }

        Ext.applyIf(config, Ext.fx.Manager.getFxDefaults(me.id));

        return Ext.apply({
            target: me,
            paused: true
        }, config);
    },

    /**
     * Stops any running effects and clears this object's internal effects queue if it contains any additional effects
     * that haven't started yet.
     * @deprecated 4.0 Replaced by {@link #stopAnimation}
     * @return {Ext.Element} The Element
     * @method
     */
    stopFx: Ext.Function.alias(Ext.util.Animate, 'stopAnimation'),

    /**
     * Stops any running effects and clears this object's internal effects queue if it contains any additional effects
     * that haven't started yet.
     * @return {Ext.Element} The Element
     */
    stopAnimation: function() {
        Ext.fx.Manager.stopAnimation(this.id);
        return this;
    },

    /**
     * Ensures that all effects queued after syncFx is called on this object are run concurrently. This is the opposite
     * of {@link #sequenceFx}.
     * @return {Object} this
     */
    syncFx: function() {
        Ext.fx.Manager.setFxDefaults(this.id, {
            concurrent: true
        });
        return this;
    },

    /**
     * Ensures that all effects queued after sequenceFx is called on this object are run in sequence. This is the
     * opposite of {@link #syncFx}.
     * @return {Object} this
     */
    sequenceFx: function() {
        Ext.fx.Manager.setFxDefaults(this.id, {
            concurrent: false
        });
        return this;
    },

    /**
     * @deprecated 4.0 Replaced by {@link #getActiveAnimation}
     * @inheritdoc Ext.util.Animate#getActiveAnimation
     * @method
     */
    hasActiveFx: Ext.Function.alias(Ext.util.Animate, 'getActiveAnimation'),

    /**
     * Returns the current animation if this object has any effects actively running or queued, else returns false.
     * @return {Ext.fx.Anim/Boolean} Anim if element has active effects, else false
     */
    getActiveAnimation: function() {
        return Ext.fx.Manager.getActiveAnimation(this.id);
    }
}, function(){
    // Apply Animate mixin manually until Element is defined in the proper 4.x way
    Ext.applyIf(Ext.Element.prototype, this.prototype);
    // We need to call this again so the animation methods get copied over to CE
    Ext.CompositeElementLite.importElementMethods();
});
/**
 * A wrapper class which can be applied to any element. Fires a "click" event while the
 * mouse is pressed. The interval between firings may be specified in the config but
 * defaults to 20 milliseconds.
 *
 * Optionally, a CSS class may be applied to the element during the time it is pressed.
 */
Ext.define('Ext.util.ClickRepeater', {
    extend: 'Ext.util.Observable',

    /**
     * Creates new ClickRepeater.
     * @param {String/HTMLElement/Ext.Element} el The element or its ID to listen on
     * @param {Object} [config] Config object.
     */
    constructor : function(el, config){
        var me = this;

        me.el = Ext.get(el);
        me.el.unselectable();

        Ext.apply(me, config);

        me.callParent();

        me.addEvents(
        /**
         * @event mousedown
         * Fires when the mouse button is depressed.
         * @param {Ext.util.ClickRepeater} this
         * @param {Ext.EventObject} e
         */
        "mousedown",
        /**
         * @event click
         * Fires on a specified interval during the time the element is pressed.
         * @param {Ext.util.ClickRepeater} this
         * @param {Ext.EventObject} e
         */
        "click",
        /**
         * @event mouseup
         * Fires when the mouse key is released.
         * @param {Ext.util.ClickRepeater} this
         * @param {Ext.EventObject} e
         */
        "mouseup"
        );

        if(!me.disabled){
            me.disabled = true;
            me.enable();
        }

        // allow inline handler
        if(me.handler){
            me.on("click", me.handler,  me.scope || me);
        }
    },

    /**
     * @cfg {String/HTMLElement/Ext.Element} el
     * The element to act as a button.
     */

    /**
     * @cfg {String} pressedCls
     * A CSS class name to be applied to the element while pressed.
     */

    /**
     * @cfg {Boolean} accelerate
     * True if autorepeating should start slowly and accelerate.
     * "interval" and "delay" are ignored.
     */

    /**
     * @cfg {Number} interval
     * The interval between firings of the "click" event (in milliseconds).
     */
    interval : 20,

    /**
     * @cfg {Number} delay
     * The initial delay before the repeating event begins firing.
     * Similar to an autorepeat key delay.
     */
    delay: 250,

    /**
     * @cfg {Boolean} preventDefault
     * True to prevent the default click event
     */
    preventDefault : true,

    /**
     * @cfg {Boolean} stopDefault
     * True to stop the default click event
     */
    stopDefault : false,

    timer : 0,

    /**
     * Enables the repeater and allows events to fire.
     */
    enable: function(){
        if(this.disabled){
            this.el.on('mousedown', this.handleMouseDown, this);
            // IE versions will detect clicks as in sequence as dblclicks
            // if they happen in quick succession
            if (Ext.isIE && !(Ext.isStrict && Ext.isIE9)){
                this.el.on('dblclick', this.handleDblClick, this);
            }
            if(this.preventDefault || this.stopDefault){
                this.el.on('click', this.eventOptions, this);
            }
        }
        this.disabled = false;
    },

    /**
     * Disables the repeater and stops events from firing.
     */
    disable: function(/* private */ force){
        if(force || !this.disabled){
            clearTimeout(this.timer);
            if(this.pressedCls){
                this.el.removeCls(this.pressedCls);
            }
            Ext.getDoc().un('mouseup', this.handleMouseUp, this);
            this.el.removeAllListeners();
        }
        this.disabled = true;
    },

    /**
     * Convenience function for setting disabled/enabled by boolean.
     * @param {Boolean} disabled
     */
    setDisabled: function(disabled){
        this[disabled ? 'disable' : 'enable']();
    },

    eventOptions: function(e){
        if(this.preventDefault){
            e.preventDefault();
        }
        if(this.stopDefault){
            e.stopEvent();
        }
    },

    // private
    destroy : function() {
        this.disable(true);
        Ext.destroy(this.el);
        this.clearListeners();
    },

    handleDblClick : function(e){
        clearTimeout(this.timer);
        this.el.blur();

        this.fireEvent("mousedown", this, e);
        this.fireEvent("click", this, e);
    },

    // private
    handleMouseDown : function(e){
        clearTimeout(this.timer);
        this.el.blur();
        if(this.pressedCls){
            this.el.addCls(this.pressedCls);
        }
        this.mousedownTime = new Date();

        Ext.getDoc().on("mouseup", this.handleMouseUp, this);
        this.el.on("mouseout", this.handleMouseOut, this);

        this.fireEvent("mousedown", this, e);
        this.fireEvent("click", this, e);

        // Do not honor delay or interval if acceleration wanted.
        if (this.accelerate) {
            this.delay = 400;
        }

        // Re-wrap the event object in a non-shared object, so it doesn't lose its context if
        // the global shared EventObject gets a new Event put into it before the timer fires.
        e = new Ext.EventObjectImpl(e);

        this.timer =  Ext.defer(this.click, this.delay || this.interval, this, [e]);
    },

    // private
    click : function(e){
        this.fireEvent("click", this, e);
        this.timer =  Ext.defer(this.click, this.accelerate ?
            this.easeOutExpo(Ext.Date.getElapsed(this.mousedownTime),
                400,
                -390,
                12000) :
            this.interval, this, [e]);
    },

    easeOutExpo : function (t, b, c, d) {
        return (t==d) ? b+c : c * (-Math.pow(2, -10 * t/d) + 1) + b;
    },

    // private
    handleMouseOut : function(){
        clearTimeout(this.timer);
        if(this.pressedCls){
            this.el.removeCls(this.pressedCls);
        }
        this.el.on("mouseover", this.handleMouseReturn, this);
    },

    // private
    handleMouseReturn : function(){
        this.el.un("mouseover", this.handleMouseReturn, this);
        if(this.pressedCls){
            this.el.addCls(this.pressedCls);
        }
        this.click();
    },

    // private
    handleMouseUp : function(e){
        clearTimeout(this.timer);
        this.el.un("mouseover", this.handleMouseReturn, this);
        this.el.un("mouseout", this.handleMouseOut, this);
        Ext.getDoc().un("mouseup", this.handleMouseUp, this);
        if(this.pressedCls){
            this.el.removeCls(this.pressedCls);
        }
        this.fireEvent("mouseup", this, e);
    }
});

/**
 * A subclass of Ext.dd.DragTracker which handles dragging any Component.
 *
 * This is configured with a Component to be made draggable, and a config object for the {@link Ext.dd.DragTracker}
 * class.
 *
 * A {@link #delegate} may be provided which may be either the element to use as the mousedown target or a {@link
 * Ext.DomQuery} selector to activate multiple mousedown targets.
 *
 * When the Component begins to be dragged, its `beginDrag` method will be called if implemented.
 *
 * When the drag ends, its `endDrag` method will be called if implemented.
 */
Ext.define('Ext.util.ComponentDragger', {
    extend: 'Ext.dd.DragTracker',

    /**
     * @cfg {Boolean} constrain
     * Specify as `true` to constrain the Component to within the bounds of the {@link #constrainTo} region.
     */

    /**
     * @cfg {String/Ext.Element} delegate
     * A {@link Ext.DomQuery DomQuery} selector which identifies child elements within the Component's encapsulating
     * Element which are the drag handles. This limits dragging to only begin when the matching elements are
     * mousedowned.
     *
     * This may also be a specific child element within the Component's encapsulating element to use as the drag handle.
     */

    /**
     * @cfg {Boolean} constrainDelegate
     * Specify as `true` to constrain the drag handles within the {@link #constrainTo} region.
     */

    autoStart: 500,

    /**
     * Creates new ComponentDragger.
     * @param {Object} comp The Component to provide dragging for.
     * @param {Object} [config] Config object
     */
    constructor: function(comp, config) {
        this.comp = comp;
        this.initialConstrainTo = config.constrainTo;
        this.callParent([ config ]);
    },

    onStart: function(e) {
        var me = this,
            comp = me.comp;

        // Cache the start [X, Y] array
        this.startPosition = comp.el.getXY();

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

        if (comp.beginDrag) {
            comp.beginDrag();
        }
    },

    calculateConstrainRegion: function() {
        var me = this,
            comp = me.comp,
            c = me.initialConstrainTo,
            delegateRegion,
            elRegion,
            dragEl = me.proxy ? me.proxy.el : comp.el,
            shadowSize = (!me.constrainDelegate && dragEl.shadow && !dragEl.shadowDisabled) ? dragEl.shadow.getShadowSize() : 0;

        // The configured constrainTo might be a Region or an element
        if (!(c instanceof Ext.util.Region)) {
            c =  Ext.fly(c).getViewRegion();
        }

        // Reduce the constrain region to allow for shadow
        if (shadowSize) {
            c.adjust(shadowSize[0], -shadowSize[1], -shadowSize[2], shadowSize[3]);
        }

        // If they only want to constrain the *delegate* to within the constrain region,
        // adjust the region to be larger based on the insets of the delegate from the outer
        // edges of the Component.
        if (!me.constrainDelegate) {
            delegateRegion = Ext.fly(me.dragTarget).getRegion();
            elRegion = dragEl.getRegion();

            c.adjust(
                delegateRegion.top - elRegion.top,
                delegateRegion.right - elRegion.right,
                delegateRegion.bottom - elRegion.bottom,
                delegateRegion.left - elRegion.left
            );
        }
        return c;
    },

    // Move either the ghost Component or the target Component to its new position on drag
    onDrag: function(e) {
        var me = this,
            comp = (me.proxy && !me.comp.liveDrag) ? me.proxy : me.comp,
            offset = me.getOffset(me.constrain || me.constrainDelegate ? 'dragTarget' : null);

        comp.setPagePosition(me.startPosition[0] + offset[0], me.startPosition[1] + offset[1]);
    },

    onEnd: function(e) {
        var comp = this.comp;
        if (this.proxy && !comp.liveDrag) {
            comp.unghost();
        }
        if (comp.endDrag) {
            comp.endDrag();
        }
    }
});
/**
 * Utility class for setting/reading values from browser cookies.
 * Values can be written using the {@link #set} method.
 * Values can be read using the {@link #get} method.
 * A cookie can be invalidated on the client machine using the {@link #clear} method.
 */
Ext.define('Ext.util.Cookies', {
    singleton: true,
    
    /**
     * Creates a cookie with the specified name and value. Additional settings for the cookie may be optionally specified
     * (for example: expiration, access restriction, SSL).
     * @param {String} name The name of the cookie to set.
     * @param {Object} value The value to set for the cookie.
     * @param {Object} [expires] Specify an expiration date the cookie is to persist until. Note that the specified Date
     * object will be converted to Greenwich Mean Time (GMT).
     * @param {String} [path] Setting a path on the cookie restricts access to pages that match that path. Defaults to all
     * pages ('/').
     * @param {String} [domain] Setting a domain restricts access to pages on a given domain (typically used to allow
     * cookie access across subdomains). For example, "sencha.com" will create a cookie that can be accessed from any
     * subdomain of sencha.com, including www.sencha.com, support.sencha.com, etc.
     * @param {Boolean} [secure] Specify true to indicate that the cookie should only be accessible via SSL on a page
     * using the HTTPS protocol. Defaults to false. Note that this will only work if the page calling this code uses the
     * HTTPS protocol, otherwise the cookie will be created with default options.
     */
    set : function(name, value){
        var argv = arguments,
            argc = arguments.length,
            expires = (argc > 2) ? argv[2] : null,
            path = (argc > 3) ? argv[3] : '/',
            domain = (argc > 4) ? argv[4] : null,
            secure = (argc > 5) ? argv[5] : false;
            
        document.cookie = name + "=" + escape(value) + ((expires === null) ? "" : ("; expires=" + expires.toGMTString())) + ((path === null) ? "" : ("; path=" + path)) + ((domain === null) ? "" : ("; domain=" + domain)) + ((secure === true) ? "; secure" : "");
    },

    /**
     * Retrieves cookies that are accessible by the current page. If a cookie does not exist, `get()` returns null. The
     * following example retrieves the cookie called "valid" and stores the String value in the variable validStatus.
     *
     *     var validStatus = Ext.util.Cookies.get("valid");
     *
     * @param {String} name The name of the cookie to get
     * @return {Object} Returns the cookie value for the specified name;
     * null if the cookie name does not exist.
     */
    get : function(name){
        var arg = name + "=",
            alen = arg.length,
            clen = document.cookie.length,
            i = 0,
            j = 0;
            
        while(i < clen){
            j = i + alen;
            if(document.cookie.substring(i, j) == arg){
                return this.getCookieVal(j);
            }
            i = document.cookie.indexOf(" ", i) + 1;
            if(i === 0){
                break;
            }
        }
        return null;
    },

    /**
     * Removes a cookie with the provided name from the browser
     * if found by setting its expiration date to sometime in the past.
     * @param {String} name The name of the cookie to remove
     * @param {String} [path] The path for the cookie.
     * This must be included if you included a path while setting the cookie.
     */
    clear : function(name, path){
        if(this.get(name)){
            path = path || '/';
            document.cookie = name + '=' + '; expires=Thu, 01-Jan-70 00:00:01 GMT; path=' + path;
        }
    },
    
    /**
     * @private
     */
    getCookieVal : function(offset){
        var endstr = document.cookie.indexOf(";", offset);
        if(endstr == -1){
            endstr = document.cookie.length;
        }
        return unescape(document.cookie.substring(offset, endstr));
    }
});

/**
 * Utility class for manipulating CSS rules
 * @singleton
 */
Ext.define('Ext.util.CSS', (function() {
    var rules = null,
        doc = document,
        camelRe = /(-[a-z])/gi,
        camelFn = function(m, a){ return a.charAt(1).toUpperCase(); };

    return {

        singleton: true,

        constructor: function() {
            this.rules = {};
            this.initialized = false;
        },

        /**
         * Creates a stylesheet from a text blob of rules.
         * These rules will be wrapped in a STYLE tag and appended to the HEAD of the document.
         * @param {String} cssText The text containing the css rules
         * @param {String} id An id to add to the stylesheet for later removal
         * @return {CSSStyleSheet}
         */
        createStyleSheet : function(cssText, id) {
            var ss,
                head = doc.getElementsByTagName("head")[0],
                styleEl = doc.createElement("style");

            styleEl.setAttribute("type", "text/css");
            if (id) {
               styleEl.setAttribute("id", id);
            }

            if (Ext.isIE) {
               head.appendChild(styleEl);
               ss = styleEl.styleSheet;
               ss.cssText = cssText;
            } else {
                try{
                    styleEl.appendChild(doc.createTextNode(cssText));
                } catch(e) {
                   styleEl.cssText = cssText;
                }
                head.appendChild(styleEl);
                ss = styleEl.styleSheet ? styleEl.styleSheet : (styleEl.sheet || doc.styleSheets[doc.styleSheets.length-1]);
            }
            this.cacheStyleSheet(ss);
            return ss;
        },

        /**
         * Removes a style or link tag by id
         * @param {String} id The id of the tag
         */
        removeStyleSheet : function(id) {
            var existing = document.getElementById(id);
            if (existing) {
                existing.parentNode.removeChild(existing);
            }
        },

        /**
         * Dynamically swaps an existing stylesheet reference for a new one
         * @param {String} id The id of an existing link tag to remove
         * @param {String} url The href of the new stylesheet to include
         */
        swapStyleSheet : function(id, url) {
            var doc = document,
                ss;
            this.removeStyleSheet(id);
            ss = doc.createElement("link");
            ss.setAttribute("rel", "stylesheet");
            ss.setAttribute("type", "text/css");
            ss.setAttribute("id", id);
            ss.setAttribute("href", url);
            doc.getElementsByTagName("head")[0].appendChild(ss);
        },

        /**
         * Refresh the rule cache if you have dynamically added stylesheets
         * @return {Object} An object (hash) of rules indexed by selector
         */
        refreshCache : function() {
            return this.getRules(true);
        },

        // private
        cacheStyleSheet : function(ss) {
            if(!rules){
                rules = {};
            }
            try {// try catch for cross domain access issue
                var ssRules = ss.cssRules || ss.rules,
                    selectorText,
                    i = ssRules.length - 1,
                    j,
                    selectors;

                for (; i >= 0; --i) {
                    selectorText = ssRules[i].selectorText;
                    if (selectorText) {

                        // Split in case there are multiple, comma-delimited selectors
                        selectorText = selectorText.split(',');
                        selectors = selectorText.length;
                        for (j = 0; j < selectors; j++) {
                            rules[Ext.String.trim(selectorText[j]).toLowerCase()] = ssRules[i];
                        }
                    }
                }
            } catch(e) {}
        },

        /**
         * Gets all css rules for the document
         * @param {Boolean} refreshCache true to refresh the internal cache
         * @return {Object} An object (hash) of rules indexed by selector
         */
        getRules : function(refreshCache) {
            if (rules === null || refreshCache) {
                rules = {};
                var ds = doc.styleSheets,
                    i = 0,
                    len = ds.length;

                for (; i < len; i++) {
                    try {
                        if (!ds[i].disabled) {
                            this.cacheStyleSheet(ds[i]);
                        }
                    } catch(e) {}
                }
            }
            return rules;
        },

        /**
         * Gets an an individual CSS rule by selector(s)
         * @param {String/String[]} selector The CSS selector or an array of selectors to try. The first selector that is found is returned.
         * @param {Boolean} refreshCache true to refresh the internal cache if you have recently updated any rules or added styles dynamically
         * @return {CSSStyleRule} The CSS rule or null if one is not found
         */
        getRule: function(selector, refreshCache) {
            var rs = this.getRules(refreshCache),
                i;
            if (!Ext.isArray(selector)) {
                return rs[selector.toLowerCase()];
            }
            for (i = 0; i < selector.length; i++) {
                if (rs[selector[i]]) {
                    return rs[selector[i].toLowerCase()];
                }
            }
            return null;
        },

        /**
         * Updates a rule property
         * @param {String/String[]} selector If it's an array it tries each selector until it finds one. Stops immediately once one is found.
         * @param {String} property The css property
         * @param {String} value The new value for the property
         * @return {Boolean} true If a rule was found and updated
         */
        updateRule : function(selector, property, value){
            var rule, i;
            if (!Ext.isArray(selector)) {
                rule = this.getRule(selector);
                if (rule) {
                    rule.style[property.replace(camelRe, camelFn)] = value;
                    return true;
                }
            } else {
                for (i = 0; i < selector.length; i++) {
                    if (this.updateRule(selector[i], property, value)) {
                        return true;
                    }
                }
            }
            return false;
        }
    };
}()));
/**
 * A mixin to add floating capability to a Component.
 */
Ext.define('Ext.util.Floating', {

    uses: ['Ext.Layer', 'Ext.window.Window'],

    /**
     * @cfg {Boolean} focusOnToFront
     * Specifies whether the floated component should be automatically {@link Ext.Component#method-focus focused} when
     * it is {@link #toFront brought to the front}.
     */
    focusOnToFront: true,

    /**
     * @cfg {String/Boolean} shadow
     * Specifies whether the floating component should be given a shadow. Set to true to automatically create an
     * {@link Ext.Shadow}, or a string indicating the shadow's display {@link Ext.Shadow#mode}. Set to false to
     * disable the shadow.
     */
    shadow: 'sides',

    /**
     * @cfg {String/Boolean} shadowOffset
     * Number of pixels to offset the shadow.
     */

    constructor: function (dom) {
        var me = this;

        me.el = new Ext.Layer(Ext.apply({
            hideMode     : me.hideMode,
            hidden       : me.hidden,
            shadow       : (typeof me.shadow != 'undefined') ? me.shadow : 'sides',
            shadowOffset : me.shadowOffset,
            constrain    : false,
            shim         : (me.shim === false) ? false : undefined
        }, me.floating), dom);

        // release config object (if it was one)
        me.floating = true;
        
        // Register with the configured ownerCt.
        // With this we acquire a floatParent for relative positioning, and a zIndexParent which is an
        // ancestor floater which provides zIndex management.
        me.registerWithOwnerCt();
    },

    registerWithOwnerCt: function() {
        var me = this;

        if (me.zIndexParent) {
            me.zIndexParent.unregisterFloatingItem(me);
        }

        // Acquire a zIndexParent by traversing the ownerCt axis for the nearest floating ancestor
        me.zIndexParent = me.up('[floating]');
        me.setFloatParent(me.ownerCt);
        delete me.ownerCt;

        if (me.zIndexParent) {
            me.zIndexParent.registerFloatingItem(me);
        } else {
            Ext.WindowManager.register(me);
        }
    },

    setFloatParent: function(floatParent) {
        var me = this;

        // Remove listeners from previous floatParent
        if (me.floatParent) {
            me.mun(me.floatParent, {
                hide: me.onFloatParentHide,
                show: me.onFloatParentShow,
                scope: me
            });
        }

        me.floatParent = floatParent;

        // Floating Components as children of Containers must hide when their parent hides.
        if (floatParent) {
            me.mon(me.floatParent, {
                hide: me.onFloatParentHide,
                show: me.onFloatParentShow,
                scope: me
            });
        }

        // If a floating Component is configured to be constrained, but has no configured
        // constrainTo setting, set its constrainTo to be it's ownerCt before rendering.
        if ((me.constrain || me.constrainHeader) && !me.constrainTo) {
            me.constrainTo = floatParent ? floatParent.getTargetEl() : me.container;
        }
    },
    
    onAfterFloatLayout: function(){
        this.syncShadow();   
    },

    onFloatParentHide: function() {
        var me = this;

        if (me.hideOnParentHide !== false && me.isVisible()) {
            me.hide();
            me.showOnParentShow = true;
        }
    },

    onFloatParentShow: function() {
        if (this.showOnParentShow) {
            delete this.showOnParentShow;
            this.show();
        }
    },

    // private
    // z-index is managed by the zIndexManager and may be overwritten at any time.
    // Returns the next z-index to be used.
    // If this is a Container, then it will have rebased any managed floating Components,
    // and so the next available z-index will be approximately 10000 above that.
    setZIndex: function(index) {
        var me = this;

        me.el.setZIndex(index);

        // Next item goes 10 above;
        index += 10;

        // When a Container with floating descendants has its z-index set, it rebases any floating descendants it is managing.
        // The returned value is a round number approximately 10000 above the last z-index used.
        if (me.floatingDescendants) {
            index = Math.floor(me.floatingDescendants.setBase(index) / 100) * 100 + 10000;
        }
        return index;
    },

    /**
     * Moves this floating Component into a constrain region.
     *
     * By default, this Component is constrained to be within the container it was added to, or the element it was
     * rendered to.
     *
     * An alternative constraint may be passed.
     * @param {String/HTMLElement/Ext.Element/Ext.util.Region} [constrainTo] The Element or {@link Ext.util.Region Region}
     * into which this Component is to be constrained. Defaults to the element into which this floating Component
     * was rendered.
     */
    doConstrain: function(constrainTo) {
        var me = this,

            // Calculate the constrain vector to coerce our position to within our
            // constrainTo setting. getConstrainVector will provide a default constraint
            // region if there is no explicit constrainTo, *and* there is no floatParent owner Component.
            vector = me.getConstrainVector(constrainTo),
            xy;

        if (vector) {
            xy = me.getPosition(!!me.floatParent);
            xy[0] += vector[0];
            xy[1] += vector[1];
            me.setPosition(xy);
        }
    },


    /**
     * Gets the x/y offsets to constrain this float
     * @private
     * @param {String/HTMLElement/Ext.Element/Ext.util.Region} [constrainTo] The Element or {@link Ext.util.Region Region}
     * into which this Component is to be constrained.
     * @return {Number[]} The x/y constraints
     */
    getConstrainVector: function(constrainTo){
        var me = this;

        if (me.constrain || me.constrainHeader) {
            constrainTo = constrainTo || (me.floatParent && me.floatParent.getTargetEl()) || me.container || me.el.getScopeParent();
            return (me.constrainHeader ? me.header.el : me.el).getConstrainVector(constrainTo);
        }
    },

    /**
     * Aligns this floating Component to the specified element
     *
     * @param {Ext.Component/Ext.Element/HTMLElement/String} element
     * The element or {@link Ext.Component} to align to. If passing a component, it must be a
     * component instance. If a string id is passed, it will be used as an element id.
     * @param {String} [position="tl-bl?"] The position to align to
     * (see {@link Ext.Element#alignTo} for more details).
     * @param {Number[]} [offsets] Offset the positioning by [x, y]
     * @return {Ext.Component} this
     */
    alignTo: function(element, position, offsets) {

        // element may be a Component, so first attempt to use its el to align to.
        // When aligning to an Element's X,Y position, we must use setPagePosition which disregards any floatParent
        this.setPagePosition(this.el.getAlignToXY(element.el || element, position, offsets));
        return this;
    },

    /**
     * Brings this floating Component to the front of any other visible, floating Components managed by the same
     * {@link Ext.ZIndexManager ZIndexManager}
     *
     * If this Component is modal, inserts the modal mask just below this Component in the z-index stack.
     *
     * @param {Boolean} [preventFocus=false] Specify `true` to prevent the Component from being focused.
     * @return {Ext.Component} this
     */
    toFront: function(preventFocus) {
        var me = this;

        // Find the floating Component which provides the base for this Component's zIndexing.
        // That must move to front to then be able to rebase its zIndex stack and move this to the front
        if (me.zIndexParent && me.bringParentToFront !== false) {
            me.zIndexParent.toFront(true);
        }
        
        if (!Ext.isDefined(preventFocus)) {
            preventFocus = !me.focusOnToFront;
        }
        
        if (preventFocus) {
            me.preventFocusOnActivate = true;
        }
        if (me.zIndexManager.bringToFront(me)) {    
            if (!preventFocus) {
                // Kick off a delayed focus request.
                // If another floating Component is toFronted before the delay expires
                // this will not receive focus.
                me.focus(false, true);
            }
        }
        delete me.preventFocusOnActivate;
        return me;
    },

    /**
     * This method is called internally by {@link Ext.ZIndexManager} to signal that a floating Component has either been
     * moved to the top of its zIndex stack, or pushed from the top of its zIndex stack.
     *
     * If a _Window_ is superceded by another Window, deactivating it hides its shadow.
     *
     * This method also fires the {@link Ext.Component#activate activate} or
     * {@link Ext.Component#deactivate deactivate} event depending on which action occurred.
     *
     * @param {Boolean} [active=false] True to activate the Component, false to deactivate it.
     * @param {Ext.Component} [newActive] The newly active Component which is taking over topmost zIndex position.
     */
    setActive: function(active, newActive) {
        var me = this;
        
        if (active) {
            if (me.el.shadow && !me.maximized) {
                me.el.enableShadow(true);
            }
            if (me.modal && !me.preventFocusOnActivate) {
                me.focus(false, true);
            }
            me.fireEvent('activate', me);
        } else {
            // Only the *Windows* in a zIndex stack share a shadow. All other types of floaters
            // can keep their shadows all the time
            if (me.isWindow && (newActive && newActive.isWindow)) {
                me.el.disableShadow();
            }
            me.fireEvent('deactivate', me);
        }
    },

    /**
     * Sends this Component to the back of (lower z-index than) any other visible windows
     * @return {Ext.Component} this
     */
    toBack: function() {
        this.zIndexManager.sendToBack(this);
        return this;
    },

    /**
     * Center this Component in its container.
     * @return {Ext.Component} this
     */
    center: function() {
        var me = this,
            xy;
            
        if (me.isVisible()) {
            xy = me.el.getAlignToXY(me.container, 'c-c');
            me.setPagePosition(xy);
        } else {
            me.needsCenter = true;
        }
        return me;
    },
    
    onFloatShow: function() {
        if (this.needsCenter) {
            this.center();    
        }
        delete this.needsCenter;
    },

    // private
    syncShadow : function() {
        if (this.floating) {
            this.el.sync(true);
        }
    },

    // private
    fitContainer: function() {
        var me = this,
            parent = me.floatParent,
            container = parent ? parent.getTargetEl() : me.container;

        me.setSize(container.getViewSize(false));
        me.setPosition.apply(me, parent ? [0, 0] : container.getXY());
    }
});

/**
 * History management component that allows you to register arbitrary tokens that signify application
 * history state on navigation actions.  You can then handle the history {@link #change} event in order
 * to reset your application UI to the appropriate state when the user navigates forward or backward through
 * the browser history stack.
 *
 * ## Initializing
 *
 * The {@link #init} method of the History object must be called before using History. This sets up the internal
 * state and must be the first thing called before using History.
 */
Ext.define('Ext.util.History', {
    singleton: true,
    alternateClassName: 'Ext.History',
    mixins: {
        observable: 'Ext.util.Observable'
    },

    /**
     * @property
     * True to use `window.top.location.hash` or false to use `window.location.hash`.
     */
    useTopWindow: true,

    /**
     * @property
     * The id of the hidden field required for storing the current history token.
     */
    fieldId: Ext.baseCSSPrefix + 'history-field',
    /**
     * @property
     * The id of the iframe required by IE to manage the history stack.
     */
    iframeId: Ext.baseCSSPrefix + 'history-frame',

    constructor: function() {
        var me = this;
        me.oldIEMode = Ext.isIE6 || Ext.isIE7 || !Ext.isStrict && Ext.isIE8;
        me.iframe = null;
        me.hiddenField = null;
        me.ready = false;
        me.currentToken = null;
        me.mixins.observable.constructor.call(me);
    },

    getHash: function() {
        var href = window.location.href,
            i = href.indexOf("#");

        return i >= 0 ? href.substr(i + 1) : null;
    },

    setHash: function (hash) {
        var me = this,
            win = me.useTopWindow ? window.top : window;
        try {
            win.location.hash = hash;
        } catch (e) {
            // IE can give Access Denied (esp. in popup windows)
        }
    },

    doSave: function() {
        this.hiddenField.value = this.currentToken;
    },


    handleStateChange: function(token) {
        this.currentToken = token;
        this.fireEvent('change', token);
    },

    updateIFrame: function(token) {
        var html = '<html><body><div id="state">' +
                    Ext.util.Format.htmlEncode(token) +
                    '</div></body></html>',
            doc;

        try {
            doc = this.iframe.contentWindow.document;
            doc.open();
            doc.write(html);
            doc.close();
            return true;
        } catch (e) {
            return false;
        }
    },

    checkIFrame: function () {
        var me = this,
            contentWindow = me.iframe.contentWindow,
            doc, elem, oldToken, oldHash;

        if (!contentWindow || !contentWindow.document) {
            Ext.Function.defer(this.checkIFrame, 10, this);
            return;
        }

        doc = contentWindow.document;
        elem = doc.getElementById("state");
        oldToken = elem ? elem.innerText : null;
        oldHash = me.getHash();

        Ext.TaskManager.start({
            run: function () {
                var doc = contentWindow.document,
                    elem = doc.getElementById("state"),
                    newToken = elem ? elem.innerText : null,
                    newHash = me.getHash();

                if (newToken !== oldToken) {
                    oldToken = newToken;
                    me.handleStateChange(newToken);
                    me.setHash(newToken);
                    oldHash = newToken;
                    me.doSave();
                } else if (newHash !== oldHash) {
                    oldHash = newHash;
                    me.updateIFrame(newHash);
                }
            },
            interval: 50,
            scope: me
        });
        me.ready = true;
        me.fireEvent('ready', me);
    },

    startUp: function () {
        var me = this,
            hash;

        me.currentToken = me.hiddenField.value || this.getHash();

        if (me.oldIEMode) {
            me.checkIFrame();
        } else {
            hash = me.getHash();
            Ext.TaskManager.start({
                run: function () {
                    var newHash = me.getHash();
                    if (newHash !== hash) {
                        hash = newHash;
                        me.handleStateChange(hash);
                        me.doSave();
                    }
                },
                interval: 50,
                scope: me
            });
            me.ready = true;
            me.fireEvent('ready', me);
        }

    },

    /**
     * Initializes the global History instance.
     * @param {Function} [onReady] A callback function that will be called once the history
     * component is fully initialized.
     * @param {Object} [scope] The scope (`this` reference) in which the callback is executed.
     * Defaults to the browser window.
     */
    init: function (onReady, scope) {
        var me = this,
            DomHelper = Ext.DomHelper;

        if (me.ready) {
            Ext.callback(onReady, scope, [me]);
            return;
        }

        if (!Ext.isReady) {
            Ext.onReady(function() {
                me.init(onReady, scope);
            });
            return;
        }

        /*
        <form id="history-form" class="x-hide-display">
            <input type="hidden" id="x-history-field" />
            <iframe id="x-history-frame"></iframe>
        </form>
        */
        me.hiddenField = Ext.getDom(me.fieldId);
        if (!me.hiddenField) {
            me.hiddenField = Ext.getBody().createChild({
                id: Ext.id(),
                tag: 'form',
                cls: Ext.baseCSSPrefix + 'hide-display',
                children: [{
                    tag: 'input',
                    type: 'hidden',
                    id: me.fieldId
                }]
            }, false, true).firstChild;
        }

        if (me.oldIEMode) {
            me.iframe = Ext.getDom(me.iframeId);
            if (!me.iframe) {
                me.iframe = DomHelper.append(me.hiddenField.parentNode, {
                    tag: 'iframe',
                    id: me.iframeId,
                    src: Ext.SSL_SECURE_URL
                });
            }
        }

        me.addEvents(
            /**
             * @event ready
             * Fires when the Ext.util.History singleton has been initialized and is ready for use.
             * @param {Ext.util.History} The Ext.util.History singleton.
             */
            'ready',
            /**
             * @event change
             * Fires when navigation back or forwards within the local page's history occurs.
             * @param {String} token An identifier associated with the page state at that point in its history.
             */
            'change'
        );

        if (onReady) {
            me.on('ready', onReady, scope, {single: true});
        }
        me.startUp();
    },

    /**
     * Add a new token to the history stack. This can be any arbitrary value, although it would
     * commonly be the concatenation of a component id and another id marking the specific history
     * state of that component. Example usage:
     *
     *     // Handle tab changes on a TabPanel
     *     tabPanel.on('tabchange', function(tabPanel, tab){
     *          Ext.History.add(tabPanel.id + ':' + tab.id);
     *     });
     *
     * @param {String} token The value that defines a particular application-specific history state
     * @param {Boolean} [preventDuplicates=true] When true, if the passed token matches the current token
     * it will not save a new history step. Set to false if the same state can be saved more than once
     * at the same history stack location.
     */
    add: function (token, preventDup) {
        var me = this;

        if (preventDup !== false) {
            if (me.getToken() === token) {
                return true;
            }
        }

        if (me.oldIEMode) {
            return me.updateIFrame(token);
        } else {
            me.setHash(token);
            return true;
        }
    },

    /**
     * Programmatically steps back one step in browser history (equivalent to the user pressing the Back button).
     */
    back: function() {
        window.history.go(-1);
    },

    /**
     * Programmatically steps forward one step in browser history (equivalent to the user pressing the Forward button).
     */
    forward: function(){
        window.history.go(1);
    },

    /**
     * Retrieves the currently-active history token.
     * @return {String} The token
     */
    getToken: function() {
        return this.ready ? this.currentToken : this.getHash();
    }
});
/**
 * Handles mapping key events to handling functions for an element or a Component. One KeyMap can be used for multiple
 * actions.
 *
 * A KeyMap must be configured with a {@link #target} as an event source which may be an Element or a Component.
 *
 * If the target is an element, then the `keydown` event will trigger the invocation of {@link #binding}s.
 *
 * It is possible to configure the KeyMap with a custom {@link #eventName} to listen for. This may be useful when the
 * {@link #target} is a Component.
 *
 * The KeyMap's event handling requires that the first parameter passed is a key event. So if the Component's event
 * signature is different, specify a {@link #processEvent} configuration which accepts the event's parameters and
 * returns a key event.
 *
 * Functions specified in {@link #binding}s are called with this signature : `(String key, Ext.EventObject e)` (if the
 * match is a multi-key combination the callback will still be called only once). A KeyMap can also handle a string
 * representation of keys. By default KeyMap starts enabled.
 *
 * Usage:
 *
 *     // map one key by key code
 *     var map = new Ext.util.KeyMap({
 *         target: "my-element",
 *         key: 13, // or Ext.EventObject.ENTER
 *         fn: myHandler,
 *         scope: myObject
 *     });
 *
 *     // map multiple keys to one action by string
 *     var map = new Ext.util.KeyMap({
 *         target: "my-element",
 *         key: "a\r\n\t",
 *         fn: myHandler,
 *         scope: myObject
 *     });
 *
 *     // map multiple keys to multiple actions by strings and array of codes
 *     var map = new Ext.util.KeyMap({
 *         target: "my-element",
 *         binding: [{
 *             key: [10,13],
 *             fn: function(){ alert("Return was pressed"); }
 *         }, {
 *             key: "abc",
 *             fn: function(){ alert('a, b or c was pressed'); }
 *         }, {
 *             key: "\t",
 *             ctrl:true,
 *             shift:true,
 *             fn: function(){ alert('Control + shift + tab was pressed.'); }
 *         }]
 *     });
 *
 * Since 4.1.0, KeyMaps can bind to Components and process key-based events fired by Components.
 *
 * To bind to a Component, use the single parameter form of constructor and include the Component event name
 * to listen for, and a `processEvent` implementation which returns the key event for further processing by
 * the KeyMap:
 *
 *     var map = new Ext.util.KeyMap({
 *         target: myGridView,
 *         eventName: 'itemkeydown',
 *         processEvent: function(view, record, node, index, event) {
 *
 *             // Load the event with the extra information needed by the mappings
 *             event.view = view;
 *             event.store = view.getStore();
 *             event.record = record;
 *             event.index = index;
 *             return event;
 *         },
 *         binding: {
 *             key: Ext.EventObject.DELETE,
 *             fn: function(keyCode, e) {
 *                 e.store.remove(e.record);
 *
 *                 // Attempt to select the record that's now in its place
 *                 e.view.getSelectionModel().select(e.index);
 *                 e.view.el.focus();
 *             }
 *         }
 *     });
 */
Ext.define('Ext.util.KeyMap', {
    alternateClassName: 'Ext.KeyMap',

    /**
     * @cfg {Ext.Component/Ext.Element/HTMLElement/String} target
     * The object on which to listen for the event specified by the {@link #eventName} config option.
     */

    /**
     * @cfg {Object/Object[][]} binding
     * Either a single object describing a handling function for s specified key (or set of keys), or
     * an array of such objects.
     * @cfg {String/String[]} binding.key A single keycode or an array of keycodes to handle
     * @cfg {Boolean}  binding.shift True to handle key only when shift is pressed, False to handle the
     *  key only when shift is not pressed (defaults to undefined)
     * @cfg {Boolean}  binding.ctrl True to handle key only when ctrl is pressed, False to handle the
     *  key only when ctrl is not pressed (defaults to undefined)
     * @cfg {Boolean}  binding.alt True to handle key only when alt is pressed, False to handle the key
     *  only when alt is not pressed (defaults to undefined)
     * @cfg {Function} binding.handler The function to call when KeyMap finds the expected key combination
     * @cfg {Function} binding.fn Alias of handler (for backwards-compatibility)
     * @cfg {Object}   binding.scope The scope of the callback function
     * @cfg {String}   binding.defaultEventAction A default action to apply to the event. Possible values
     *  are: stopEvent, stopPropagation, preventDefault. If no value is set no action is performed.
     */

    /**
     * @cfg {Object} [processEventScope=this]
     * The scope (`this` context) in which the {@link #processEvent} method is executed.
     */

    /**
     * @cfg {Boolean} [ignoreInputFields=false]
     * Configure this as `true` if there are any input fields within the {@link #target}, and this KeyNav
     * should not process events from input fields, (`&lt;input>, &lt;textarea> and elements with `contentEditable="true"`)
     */

    /**
     * @cfg {String} eventName
     * The event to listen for to pick up key events.
     */
    eventName: 'keydown',

    constructor: function(config) {
        var me = this;

        // Handle legacy arg list in which the first argument is the target.
        // TODO: Deprecate in V5
        if ((arguments.length !== 1) || (typeof config === 'string') || config.dom || config.tagName || config === document || config.isComponent) {
            me.legacyConstructor.apply(me, arguments);
            return;
        }

        Ext.apply(me, config);
        me.bindings = [];

        if (!me.target.isComponent) {
            me.target = Ext.get(me.target);
        }

        if (me.binding) {
            me.addBinding(me.binding);
        } else if (config.key) {
            me.addBinding(config);
        }
        me.enable();
    },

    /**
     * @private
     * Old constructor signature
     * @param {String/HTMLElement/Ext.Element/Ext.Component} el The element or its ID, or Component to bind to
     * @param {Object} binding The binding (see {@link #addBinding})
     * @param {String} [eventName="keydown"] The event to bind to
     */
    legacyConstructor: function(el, binding, eventName){
        var me = this;

        Ext.apply(me, {
            target: Ext.get(el),
            eventName: eventName || me.eventName,
            bindings: []
        });
        if (binding) {
            me.addBinding(binding);
        }
        me.enable();
    },

    /**
     * Add a new binding to this KeyMap.
     *
     * Usage:
     *
     *     // Create a KeyMap
     *     var map = new Ext.util.KeyMap(document, {
     *         key: Ext.EventObject.ENTER,
     *         fn: handleKey,
     *         scope: this
     *     });
     *
     *     //Add a new binding to the existing KeyMap later
     *     map.addBinding({
     *         key: 'abc',
     *         shift: true,
     *         fn: handleKey,
     *         scope: this
     *     });
     *
     * @param {Object/Object[]} binding A single KeyMap config or an array of configs.
     * The following config object properties are supported:
     * @param {String/Array} binding.key A single keycode or an array of keycodes to handle.
     * @param {Boolean} binding.shift True to handle key only when shift is pressed,
     * False to handle the keyonly when shift is not pressed (defaults to undefined).
     * @param {Boolean} binding.ctrl True to handle key only when ctrl is pressed,
     * False to handle the key only when ctrl is not pressed (defaults to undefined).
     * @param {Boolean} binding.alt True to handle key only when alt is pressed,
     * False to handle the key only when alt is not pressed (defaults to undefined).
     * @param {Function} binding.handler The function to call when KeyMap finds the
     * expected key combination.
     * @param {Function} binding.fn Alias of handler (for backwards-compatibility).
     * @param {Object} binding.scope The scope of the callback function.
     * @param {String} binding.defaultEventAction A default action to apply to the event.
     * Possible values are: stopEvent, stopPropagation, preventDefault. If no value is
     * set no action is performed..
     */
    addBinding : function(binding){
        var keyCode = binding.key,
            processed = false,
            key,
            keys,
            keyString,
            i,
            len;

        if (Ext.isArray(binding)) {
            for (i = 0, len = binding.length; i < len; i++) {
                this.addBinding(binding[i]);
            }
            return;
        }

        if (Ext.isString(keyCode)) {
            keys = [];
            keyString = keyCode.toUpperCase();

            for (i = 0, len = keyString.length; i < len; ++i){
                keys.push(keyString.charCodeAt(i));
            }
            keyCode = keys;
            processed = true;
        }

        if (!Ext.isArray(keyCode)) {
            keyCode = [keyCode];
        }

        if (!processed) {
            for (i = 0, len = keyCode.length; i < len; ++i) {
                key = keyCode[i];
                if (Ext.isString(key)) {
                    keyCode[i] = key.toUpperCase().charCodeAt(0);
                }
            }
        }

        this.bindings.push(Ext.apply({
            keyCode: keyCode
        }, binding));
    },

    /**
     * Process the {@link #eventName event} from the {@link #target}.
     * @private
     * @param {Ext.EventObject} event
     */
    handleTargetEvent: (function() {
        var tagRe = /input|textarea/i;

        return function(event) {
            var me = this,
                bindings, i, len,
                target, contentEditable;

            if (this.enabled) { //just in case
                bindings = this.bindings;
                i = 0;
                len = bindings.length;

                // Process the event
                event = me.processEvent.apply(me||me.processEventScope, arguments);

                // Ignore events from input fields if configured to do so
                if (me.ignoreInputFields) {
                    target = event.target;
                    contentEditable = target.contentEditable;
                    // contentEditable will default to inherit if not specified, only check if the
                    // attribute has been set or explicitly set to true
                    // http://html5doctor.com/the-contenteditable-attribute/
                    if (tagRe.test(target.tagName) || (contentEditable === '' || contentEditable === 'true')) {
                        return;
                    }
                }

                // If the processor does not return a keyEvent, we can't process it.
                // Allow them to return false to cancel processing of the event
                if (!event.getKey) {
                    return event;
                }
                for(; i < len; ++i){
                    this.processBinding(bindings[i], event);
                }
            }
        }
    }()),

    /**
     * @cfg {Function} processEvent
     * An optional event processor function which accepts the argument list provided by the
     * {@link #eventName configured event} of the {@link #target}, and returns a keyEvent for processing by the KeyMap.
     *
     * This may be useful when the {@link #target} is a Component with s complex event signature, where the event is not
     * the first parameter. Extra information from the event arguments may be injected into the event for use by the handler
     * functions before returning it.
     */
    processEvent: function(event){
        return event;
    },

    /**
     * Process a particular binding and fire the handler if necessary.
     * @private
     * @param {Object} binding The binding information
     * @param {Ext.EventObject} event
     */
    processBinding: function(binding, event){
        if (this.checkModifiers(binding, event)) {
            var key = event.getKey(),
                handler = binding.fn || binding.handler,
                scope = binding.scope || this,
                keyCode = binding.keyCode,
                defaultEventAction = binding.defaultEventAction,
                i,
                len,
                keydownEvent = new Ext.EventObjectImpl(event);


            for (i = 0, len = keyCode.length; i < len; ++i) {
                if (key === keyCode[i]) {
                    if (handler.call(scope, key, event) !== true && defaultEventAction) {
                        keydownEvent[defaultEventAction]();
                    }
                    break;
                }
            }
        }
    },

    /**
     * Check if the modifiers on the event match those on the binding
     * @private
     * @param {Object} binding
     * @param {Ext.EventObject} event
     * @return {Boolean} True if the event matches the binding
     */
    checkModifiers: function(binding, e) {
        var keys = ['shift', 'ctrl', 'alt'],
            i = 0,
            len = keys.length,
            val, key;

        for (; i < len; ++i){
            key = keys[i];
            val = binding[key];
            if (!(val === undefined || (val === e[key + 'Key']))) {
                return false;
            }
        }
        return true;
    },

    /**
     * Shorthand for adding a single key listener.
     *
     * @param {Number/Number[]/Object} key Either the numeric key code, array of key codes or an object with the
     * following options: `{key: (number or array), shift: (true/false), ctrl: (true/false), alt: (true/false)}`
     * @param {Function} fn The function to call
     * @param {Object} [scope] The scope (`this` reference) in which the function is executed.
     * Defaults to the browser window.
     */
    on: function(key, fn, scope) {
        var keyCode, shift, ctrl, alt;
        if (Ext.isObject(key) && !Ext.isArray(key)) {
            keyCode = key.key;
            shift = key.shift;
            ctrl = key.ctrl;
            alt = key.alt;
        } else {
            keyCode = key;
        }
        this.addBinding({
            key: keyCode,
            shift: shift,
            ctrl: ctrl,
            alt: alt,
            fn: fn,
            scope: scope
        });
    },

    /**
     * Returns true if this KeyMap is enabled
     * @return {Boolean}
     */
    isEnabled : function() {
        return this.enabled;
    },

    /**
     * Enables this KeyMap
     */
    enable: function() {
        var me = this;
        
        if (!me.enabled) {
            me.target.on(me.eventName, me.handleTargetEvent, me);
            me.enabled = true;
        }
    },

    /**
     * Disable this KeyMap
     */
    disable: function() {
        var me = this;
        
        if (me.enabled) {
            me.target.removeListener(me.eventName, me.handleTargetEvent, me);
            me.enabled = false;
        }
    },

    /**
     * Convenience function for setting disabled/enabled by boolean.
     * @param {Boolean} disabled
     */
    setDisabled : function(disabled) {
        if (disabled) {
            this.disable();
        } else {
            this.enable();
        }
    },

    /**
     * Destroys the KeyMap instance and removes all handlers.
     * @param {Boolean} removeTarget True to also remove the {@link #target}
     */
    destroy: function(removeTarget) {
        var me = this,
            target = me.target;

        me.bindings = [];
        me.disable();
        if (removeTarget === true) {
            if (target.isComponent) {
                target.destroy();
            } else {
                target.remove();
            }
        }
        delete me.target;
    }
});
/**
 * Provides a convenient wrapper for normalized keyboard navigation. KeyNav allows you to bind navigation keys to
 * function calls that will get called when the keys are pressed, providing an easy way to implement custom navigation
 * schemes for any UI component.
 *
 * The following are all of the possible keys that can be implemented: enter, space, left, right, up, down, tab, esc,
 * pageUp, pageDown, del, backspace, home, end.
 *
 * Usage:
 *
 *     var nav = new Ext.util.KeyNav({
 *         target : "my-element",
 *         left   : function(e){
 *             this.moveLeft(e.ctrlKey);
 *         },
 *         right  : function(e){
 *             this.moveRight(e.ctrlKey);
 *         },
 *         enter  : function(e){
 *             this.save();
 *         },
 *         
 *         // Binding may be a function specifiying fn, scope and defaultAction
 *         esc: {
 *             fn: this.onEsc,
 *             defaultEventAction: false
 *         },
 *         scope : this
 *     });
 */
Ext.define('Ext.util.KeyNav', {
    alternateClassName: 'Ext.KeyNav',
    
    requires: ['Ext.util.KeyMap'],
    
    statics: {
        keyOptions: {
            left: 37,
            right: 39,
            up: 38,
            down: 40,
            space: 32,
            pageUp: 33,
            pageDown: 34,
            del: 46,
            backspace: 8,
            home: 36,
            end: 35,
            enter: 13,
            esc: 27,
            tab: 9
        }
    },

    constructor: function(config) {
        var me = this;
        if (arguments.length === 2) {
            me.legacyConstructor.apply(me, arguments);
            return;
        }
        me.setConfig(config);
    },

    /**
     * @private
     * Old constructor signature.
     * @param {String/HTMLElement/Ext.Element} el The element or its ID to bind to
     * @param {Object} config The config
     */
    legacyConstructor: function(el, config) {
        this.setConfig(Ext.apply({
            target: el
        }, config));
    },

    /**
     * Sets up a configuration for the KeyNav.
     * @private
     * @param {String/HTMLElement/Ext.Element} el The element or its ID to bind to
     * @param {Object} config A configuration object as specified in the constructor.
     */
    setConfig: function(config) {
        var me = this,
            keymapCfg = {
                target: config.target,
                ignoreInputFields: config.ignoreInputFields,
                eventName: me.getKeyEvent('forceKeyDown' in config ? config.forceKeyDown : me.forceKeyDown, config.eventName)
            },
            map, keyCodes, defaultScope, keyName, binding;

        if (me.map) {
            me.map.destroy();
        }

        if (config.processEvent) {
            keymapCfg.processEvent = config.processEvent;
            keymapCfg.processEventScope = config.processEventScope||me;
        }
        map = me.map = new Ext.util.KeyMap(keymapCfg);
        keyCodes = Ext.util.KeyNav.keyOptions;
        defaultScope = config.scope || me;
        
        for (keyName in keyCodes) {
            if (keyCodes.hasOwnProperty(keyName)) {

                // There is a property named after a key name.
                // It may be a function or an binding spec containing handler, scope and defaultAction configs
                if (binding = config[keyName]) {
                    if (typeof binding === 'function') {
                        binding = {
                            handler: binding,
                            defaultAction: (config.defaultEventAction !== undefined) ? config.defaultEventAction : me.defaultEventAction
                        };
                    }
                    map.addBinding({
                        key: keyCodes[keyName],
                        handler: Ext.Function.bind(me.handleEvent, binding.scope||defaultScope, binding.handler||binding.fn, true),
                        defaultEventAction: (binding.defaultEventAction !== undefined) ? binding.defaultAction : me.defaultEventAction
                    });
                }
            }
        }
        
        map.disable();
        if (!config.disabled) {
            map.enable();
        }
    },
    
    /**
     * Method for filtering out the map argument
     * @private
     * @param {Number} keyCode
     * @param {Ext.EventObject} event
     * @param {Object} options Contains the handler to call
     */
    handleEvent: function(keyCode, event, handler){
        return handler.call(this, event);
    },
    
    /**
     * @cfg {Boolean} disabled
     * True to disable this KeyNav instance.
     */
    disabled: false,
    
    /**
     * @cfg {String} defaultEventAction
     * The method to call on the {@link Ext.EventObject} after this KeyNav intercepts a key. Valid values are {@link
     * Ext.EventObject#stopEvent}, {@link Ext.EventObject#preventDefault} and {@link Ext.EventObject#stopPropagation}.
     *
     * If a falsy value is specified, no method is called on the key event.
     */
    defaultEventAction: "stopEvent",
    
    /**
     * @cfg {Boolean} forceKeyDown
     * Handle the keydown event instead of keypress. KeyNav automatically does this for IE since IE does not propagate
     * special keys on keypress, but setting this to true will force other browsers to also handle keydown instead of
     * keypress.
     */
    forceKeyDown: false,

    /**
     * @cfg {Ext.Component/Ext.Element/HTMLElement/String} target
     * The object on which to listen for the event specified by the {@link #eventName} config option.
     */

    /**
     * @cfg {String} eventName
     * The event to listen for to pick up key events.
     */
    eventName: 'keypress',

    /**
     * @cfg {Function} processEvent
     * An optional event processor function which accepts the argument list provided by the {@link #eventName configured
     * event} of the {@link #target}, and returns a keyEvent for processing by the KeyMap.
     *
     * This may be useful when the {@link #target} is a Component with s complex event signature. Extra information from
     * the event arguments may be injected into the event for use by the handler functions before returning it.
     */

    /**
     * @cfg {Object} [processEventScope=this]
     * The scope (`this` context) in which the {@link #processEvent} method is executed.
     */

    /**
     * @cfg {Boolean} [ignoreInputFields=false]
     * Configure this as `true` if there are any input fields within the {@link #target}, and this KeyNav
     * should not process events from input fields, (`&lt;input>, &lt;textarea> and elements with `contentEditable="true"`)
     */

    /**
     * Destroy this KeyNav (this is the same as calling disable).
     * @param {Boolean} removeEl True to remove the element associated with this KeyNav.
     */
    destroy: function(removeEl) {
        this.map.destroy(removeEl);
        delete this.map;
    },

    /**
     * Enables this KeyNav.
     */
    enable: function() {
        this.map.enable();
        this.disabled = false;
    },

    /**
     * Disables this KeyNav.
     */
    disable: function() {
        this.map.disable();
        this.disabled = true;
    },
    
    /**
     * Convenience function for setting disabled/enabled by boolean.
     * @param {Boolean} disabled
     */
    setDisabled : function(disabled) {
        this.map.setDisabled(disabled);
        this.disabled = disabled;
    },
    
    /**
     * @private
     * Determines the event to bind to listen for keys. Defaults to the {@link #eventName} value, but
     * may be overridden the {@link #forceKeyDown} setting.
     *
     * The useKeyDown option on the EventManager modifies the default {@link #eventName} to be `keydown`,
     * but a configured {@link #eventName} takes priority over this.
     *
     * @return {String} The type of event to listen for.
     */
    getKeyEvent: function(forceKeyDown, configuredEventName) {
        if (forceKeyDown || (Ext.EventManager.useKeyDown && !configuredEventName)) {
            return 'keydown';
        } else {
            return configuredEventName||this.eventName;
        }
    }
});
/**
 * Provides precise pixel measurements for blocks of text so that you can determine exactly how high and
 * wide, in pixels, a given block of text will be. Note that when measuring text, it should be plain text and
 * should not contain any HTML, otherwise it may not be measured correctly.
 *
 * The measurement works by copying the relevant CSS styles that can affect the font related display, 
 * then checking the size of an element that is auto-sized. Note that if the text is multi-lined, you must 
 * provide a **fixed width** when doing the measurement.
 *
 * If multiple measurements are being done on the same element, you create a new instance to initialize 
 * to avoid the overhead of copying the styles to the element repeatedly.
 */
Ext.define('Ext.util.TextMetrics', {
    statics: {
        shared: null,
        /**
         * Measures the size of the specified text
         * @param {String/HTMLElement} el The element, dom node or id from which to copy existing CSS styles
         * that can affect the size of the rendered text
         * @param {String} text The text to measure
         * @param {Number} fixedWidth (optional) If the text will be multiline, you have to set a fixed width
         * in order to accurately measure the text height
         * @return {Object} An object containing the text's size `{width: (width), height: (height)}`
         * @static
         */
        measure: function(el, text, fixedWidth){
            var me = this,
                shared = me.shared;
            
            if(!shared){
                shared = me.shared = new me(el, fixedWidth);
            }
            shared.bind(el);
            shared.setFixedWidth(fixedWidth || 'auto');
            return shared.getSize(text);
        },
        
        /**
         * Destroy the TextMetrics instance created by {@link #measure}.
         * @static
         */
        destroy: function(){
            var me = this;
            Ext.destroy(me.shared);
            me.shared = null;
        }
    },
    
    /**
     * Creates new TextMetrics.
     * @param {String/HTMLElement/Ext.Element} bindTo The element or its ID to bind to.
     * @param {Number} [fixedWidth] A fixed width to apply to the measuring element.
     */
    constructor: function(bindTo, fixedWidth){
        var measure = this.measure = Ext.getBody().createChild({
            cls: Ext.baseCSSPrefix + 'textmetrics'
        });
        this.el = Ext.get(bindTo);
        
        measure.position('absolute');
        measure.setLeftTop(-1000, -1000);
        measure.hide();

        if (fixedWidth) {
           measure.setWidth(fixedWidth);
        }
    },
    
    /**
     * Returns the size of the specified text based on the internal element's style and width properties
     * @param {String} text The text to measure
     * @return {Object} An object containing the text's size `{width: (width), height: (height)}`
     */
    getSize: function(text){
        var measure = this.measure,
            size;
        
        measure.update(text);
        size = measure.getSize();
        measure.update('');
        return size;
    },
    
    /**
     * Binds this TextMetrics instance to a new element
     * @param {String/HTMLElement/Ext.Element} el The element or its ID.
     */
    bind: function(el){
        var me = this;
        
        me.el = Ext.get(el);
        me.measure.setStyle(
            me.el.getStyles('font-size','font-style', 'font-weight', 'font-family','line-height', 'text-transform', 'letter-spacing')
        );
    },
    
    /**
     * Sets a fixed width on the internal measurement element.  If the text will be multiline, you have
     * to set a fixed width in order to accurately measure the text height.
     * @param {Number} width The width to set on the element
     */
     setFixedWidth : function(width){
         this.measure.setWidth(width);
     },
     
     /**
      * Returns the measured width of the specified text
      * @param {String} text The text to measure
      * @return {Number} width The width in pixels
      */
     getWidth : function(text){
         this.measure.dom.style.width = 'auto';
         return this.getSize(text).width;
     },
     
     /**
      * Returns the measured height of the specified text
      * @param {String} text The text to measure
      * @return {Number} height The height in pixels
      */
     getHeight : function(text){
         return this.getSize(text).height;
     },
     
     /**
      * Destroy this instance
      */
     destroy: function(){
         var me = this;
         me.measure.remove();
         delete me.el;
         delete me.measure;
     }
}, function(){
    Ext.Element.addMethods({
        /**
         * Returns the width in pixels of the passed text, or the width of the text in this Element.
         * @param {String} text The text to measure. Defaults to the innerHTML of the element.
         * @param {Number} [min] The minumum value to return.
         * @param {Number} [max] The maximum value to return.
         * @return {Number} The text width in pixels.
         * @member Ext.dom.Element
         */
        getTextWidth : function(text, min, max){
            return Ext.Number.constrain(Ext.util.TextMetrics.measure(this.dom, Ext.value(text, this.dom.innerHTML, true)).width, min || 0, max || 1000000);
        }
    });
});






/**
 * @class Ext.util.AbstractMixedCollection
 * @private
 */
Ext.define('Ext.util.AbstractMixedCollection', {
    requires: ['Ext.util.Filter'],

    mixins: {
        observable: 'Ext.util.Observable'
    },

    /**
     * @property {Boolean} isMixedCollection
     * `true` in this class to identify an object as an instantiated MixedCollection, or subclass thereof.
     */
    isMixedCollection: true,

    /**
     * @private Mutation counter which is incremented upon add and remove.
     */
    generation: 0,

    constructor: function(allowFunctions, keyFn) {
        var me = this;

        me.items = [];
        me.map = {};
        me.keys = [];
        me.length = 0;

            /**
             * @event clear
             * Fires when the collection is cleared.
             */

            /**
             * @event add
             * Fires when an item is added to the collection.
             * @param {Number} index The index at which the item was added.
             * @param {Object} o The item added.
             * @param {String} key The key associated with the added item.
             */

            /**
             * @event replace
             * Fires when an item is replaced in the collection.
             * @param {String} key he key associated with the new added.
             * @param {Object} old The item being replaced.
             * @param {Object} new The new item.
             */
            /**
             * @event remove
             * Fires when an item is removed from the collection.
             * @param {Object} o The item being removed.
             * @param {String} key (optional) The key associated with the removed item.
             */

        me.allowFunctions = allowFunctions === true;

        if (keyFn) {
            me.getKey = keyFn;
        }

        me.mixins.observable.constructor.call(me);
    },

    /**
     * @cfg {Boolean} allowFunctions Specify <code>true</code> if the {@link #addAll}
     * function should add function references to the collection. Defaults to
     * <code>false</code>.
     */
    allowFunctions : false,

    /**
     * Adds an item to the collection. Fires the {@link #event-add} event when complete.
     *
     * @param {String/Object} key The key to associate with the item, or the new item.
     *
     * If a {@link #getKey} implementation was specified for this MixedCollection,
     * or if the key of the stored items is in a property called `id`,
     * the MixedCollection will be able to *derive* the key for the new item.
     * In this case just pass the new item in this parameter.
     *
     * @param {Object} [o] The item to add.
     *
     * @return {Object} The item added.
     */
    add : function(key, obj){
        var me = this,
            myObj = obj,
            myKey = key,
            old;

        if (arguments.length == 1) {
            myObj = myKey;
            myKey = me.getKey(myObj);
        }
        if (typeof myKey != 'undefined' && myKey !== null) {
            old = me.map[myKey];
            if (typeof old != 'undefined') {
                return me.replace(myKey, myObj);
            }
            me.map[myKey] = myObj;
        }
        me.generation++;
        me.length++;
        me.items.push(myObj);
        me.keys.push(myKey);
        if (me.hasListeners.add) {
            me.fireEvent('add', me.length - 1, myObj, myKey);
        }
        return myObj;
    },

    /**
      * MixedCollection has a generic way to fetch keys if you implement getKey.  The default implementation
      * simply returns <b><code>item.id</code></b> but you can provide your own implementation
      * to return a different value as in the following examples:<pre><code>
// normal way
var mc = new Ext.util.MixedCollection();
mc.add(someEl.dom.id, someEl);
mc.add(otherEl.dom.id, otherEl);
//and so on

// using getKey
var mc = new Ext.util.MixedCollection();
mc.getKey = function(el){
   return el.dom.id;
};
mc.add(someEl);
mc.add(otherEl);

// or via the constructor
var mc = new Ext.util.MixedCollection(false, function(el){
   return el.dom.id;
});
mc.add(someEl);
mc.add(otherEl);
     * </code></pre>
     * @param {Object} item The item for which to find the key.
     * @return {Object} The key for the passed item.
     */
    getKey : function(o){
         return o.id;
    },

    /**
     * Replaces an item in the collection. Fires the {@link #event-replace} event when complete.
     * @param {String} key <p>The key associated with the item to replace, or the replacement item.</p>
     * <p>If you supplied a {@link #getKey} implementation for this MixedCollection, or if the key
     * of your stored items is in a property called <code><b>id</b></code>, then the MixedCollection
     * will be able to <i>derive</i> the key of the replacement item. If you want to replace an item
     * with one having the same key value, then just pass the replacement item in this parameter.</p>
     * @param o {Object} o (optional) If the first parameter passed was a key, the item to associate
     * with that key.
     * @return {Object}  The new item.
     */
    replace : function(key, o){
        var me = this,
            old,
            index;

        if (arguments.length == 1) {
            o = arguments[0];
            key = me.getKey(o);
        }
        old = me.map[key];
        if (typeof key == 'undefined' || key === null || typeof old == 'undefined') {
             return me.add(key, o);
        }
        me.generation++;
        index = me.indexOfKey(key);
        me.items[index] = o;
        me.map[key] = o;
        if (me.hasListeners.replace) {
            me.fireEvent('replace', key, old, o);
        }
        return o;
    },

    /**
     * Adds all elements of an Array or an Object to the collection.
     * @param {Object/Array} objs An Object containing properties which will be added
     * to the collection, or an Array of values, each of which are added to the collection.
     * Functions references will be added to the collection if <code>{@link #allowFunctions}</code>
     * has been set to <code>true</code>.
     */
    addAll : function(objs){
        var me = this,
            i = 0,
            args,
            len,
            key;

        if (arguments.length > 1 || Ext.isArray(objs)) {
            args = arguments.length > 1 ? arguments : objs;
            for (len = args.length; i < len; i++) {
                me.add(args[i]);
            }
        } else {
            for (key in objs) {
                if (objs.hasOwnProperty(key)) {
                    if (me.allowFunctions || typeof objs[key] != 'function') {
                        me.add(key, objs[key]);
                    }
                }
            }
        }
    },

    /**
     * Executes the specified function once for every item in the collection.
     * The function should return a boolean value.
     * Returning false from the function will stop the iteration.
     *
     * @param {Function} fn The function to execute for each item.
     * @param {Mixed} fn.item The collection item.
     * @param {Number} fn.index The index of item.
     * @param {Number} fn.len Total length of collection.
     * @param {Object} scope (optional) The scope (<code>this</code> reference)
     * in which the function is executed. Defaults to the current item in the iteration.
     */
    each : function(fn, scope){
        var items = [].concat(this.items), // each safe for removal
            i = 0,
            len = items.length,
            item;

        for (; i < len; i++) {
            item = items[i];
            if (fn.call(scope || item, item, i, len) === false) {
                break;
            }
        }
    },

    /**
     * Executes the specified function once for every key in the collection, passing each
     * key, and its associated item as the first two parameters.
     * @param {Function} fn The function to execute for each item.
     * @param {String} fn.key The key of collection item.
     * @param {Mixed} fn.item The collection item.
     * @param {Number} fn.index The index of item.
     * @param {Number} fn.len Total length of collection.
     * @param {Object} scope (optional) The scope (<code>this</code> reference) in which the
     * function is executed. Defaults to the browser window.
     */
    eachKey : function(fn, scope){
        var keys = this.keys,
            items = this.items,
            i = 0,
            len = keys.length;

        for (; i < len; i++) {
            fn.call(scope || window, keys[i], items[i], i, len);
        }
    },

    /**
     * Returns the first item in the collection which elicits a true return value from the
     * passed selection function.
     * @param {Function} fn The selection function to execute for each item.
     * @param {Mixed} fn.item The collection item.
     * @param {String} fn.key The key of collection item.
     * @param {Object} scope (optional) The scope (<code>this</code> reference) in which the
     * function is executed. Defaults to the browser window.
     * @return {Object} The first item in the collection which returned true from the selection
     * function, or null if none was found.
     */
    findBy : function(fn, scope) {
        var keys = this.keys,
            items = this.items,
            i = 0,
            len = items.length;

        for (; i < len; i++) {
            if (fn.call(scope || window, items[i], keys[i])) {
                return items[i];
            }
        }
        return null;
    },

    find : function() {
        if (Ext.isDefined(Ext.global.console)) {
            Ext.global.console.warn('Ext.util.MixedCollection: find has been deprecated. Use findBy instead.');
        }
        return this.findBy.apply(this, arguments);
    },

    /**
     * Inserts an item at the specified index in the collection. Fires the {@link #event-add} event when complete.
     * @param {Number} index The index to insert the item at.
     * @param {String} key The key to associate with the new item, or the item itself.
     * @param {Object} o (optional) If the second parameter was a key, the new item.
     * @return {Object} The item inserted.
     */
    insert : function(index, key, obj){
        var me = this,
            myKey = key,
            myObj = obj;

        if (arguments.length == 2) {
            myObj = myKey;
            myKey = me.getKey(myObj);
        }
        if (me.containsKey(myKey)) {
            me.suspendEvents();
            me.removeAtKey(myKey);
            me.resumeEvents();
        }
        if (index >= me.length) {
            return me.add(myKey, myObj);
        }
        me.generation++;
        me.length++;
        Ext.Array.splice(me.items, index, 0, myObj);
        if (typeof myKey != 'undefined' && myKey !== null) {
            me.map[myKey] = myObj;
        }
        Ext.Array.splice(me.keys, index, 0, myKey);
        if (me.hasListeners.add) {
            me.fireEvent('add', index, myObj, myKey);
        }
        return myObj;
    },

    /**
     * Remove an item from the collection.
     * @param {Object} o The item to remove.
     * @return {Object} The item removed or false if no item was removed.
     */
    remove : function(o) {
        this.generation++;
        return this.removeAt(this.indexOf(o));
    },

    /**
     * Remove all items in the passed array from the collection.
     * @param {Array} items An array of items to be removed.
     * @return {Ext.util.MixedCollection} this object
     */
    removeAll : function(items) {
        items = [].concat(items);
        var i, iLen = items.length;
        for (i = 0; i < iLen; i++) {
            this.remove(items[i]);
        }

        return this;
    },

    /**
     * Remove an item from a specified index in the collection. Fires the {@link #event-remove} event when complete.
     * @param {Number} index The index within the collection of the item to remove.
     * @return {Object} The item removed or false if no item was removed.
     */
    removeAt : function(index) {
        var me = this,
            o,
            key;

        if (index < me.length && index >= 0) {
            me.length--;
            o = me.items[index];
            Ext.Array.erase(me.items, index, 1);
            key = me.keys[index];
            if (typeof key != 'undefined') {
                delete me.map[key];
            }
            Ext.Array.erase(me.keys, index, 1);
            if (me.hasListeners.remove) {
                me.fireEvent('remove', o, key);
            }
            me.generation++;
            return o;
        }
        return false;
    },

    /**
     * Removed an item associated with the passed key fom the collection.
     * @param {String} key The key of the item to remove.
     * @return {Object} The item removed or false if no item was removed.
     */
    removeAtKey : function(key){
        return this.removeAt(this.indexOfKey(key));
    },

    /**
     * Returns the number of items in the collection.
     * @return {Number} the number of items in the collection.
     */
    getCount : function(){
        return this.length;
    },

    /**
     * Returns index within the collection of the passed Object.
     * @param {Object} o The item to find the index of.
     * @return {Number} index of the item. Returns -1 if not found.
     */
    indexOf : function(o){
        return Ext.Array.indexOf(this.items, o);
    },

    /**
     * Returns index within the collection of the passed key.
     * @param {String} key The key to find the index of.
     * @return {Number} index of the key.
     */
    indexOfKey : function(key){
        return Ext.Array.indexOf(this.keys, key);
    },

    /**
     * Returns the item associated with the passed key OR index.
     * Key has priority over index.  This is the equivalent
     * of calling {@link #getByKey} first, then if nothing matched calling {@link #getAt}.
     * @param {String/Number} key The key or index of the item.
     * @return {Object} If the item is found, returns the item.  If the item was not found, returns <code>undefined</code>.
     * If an item was found, but is a Class, returns <code>null</code>.
     */
    get : function(key) {
        var me = this,
            mk = me.map[key],
            item = mk !== undefined ? mk : (typeof key == 'number') ? me.items[key] : undefined;
        return typeof item != 'function' || me.allowFunctions ? item : null; // for prototype!
    },

    /**
     * Returns the item at the specified index.
     * @param {Number} index The index of the item.
     * @return {Object} The item at the specified index.
     */
    getAt : function(index) {
        return this.items[index];
    },

    /**
     * Returns the item associated with the passed key.
     * @param {String/Number} key The key of the item.
     * @return {Object} The item associated with the passed key.
     */
    getByKey : function(key) {
        return this.map[key];
    },

    /**
     * Returns true if the collection contains the passed Object as an item.
     * @param {Object} o  The Object to look for in the collection.
     * @return {Boolean} True if the collection contains the Object as an item.
     */
    contains : function(o){
        return typeof this.map[this.getKey(o)] != 'undefined';
    },

    /**
     * Returns true if the collection contains the passed Object as a key.
     * @param {String} key The key to look for in the collection.
     * @return {Boolean} True if the collection contains the Object as a key.
     */
    containsKey : function(key){
        return typeof this.map[key] != 'undefined';
    },

    /**
     * Removes all items from the collection.  Fires the {@link #event-clear} event when complete.
     */
    clear : function(){
        var me = this;

        me.length = 0;
        me.items = [];
        me.keys = [];
        me.map = {};
        me.generation++;
        if (me.hasListeners.clear) {
            me.fireEvent('clear');
        }
    },

    /**
     * Returns the first item in the collection.
     * @return {Object} the first item in the collection..
     */
    first : function() {
        return this.items[0];
    },

    /**
     * Returns the last item in the collection.
     * @return {Object} the last item in the collection..
     */
    last : function() {
        return this.items[this.length - 1];
    },

    /**
     * Collects all of the values of the given property and returns their sum
     * @param {String} property The property to sum by
     * @param {String} [root] 'root' property to extract the first argument from. This is used mainly when
     * summing fields in records, where the fields are all stored inside the 'data' object
     * @param {Number} [start=0] The record index to start at
     * @param {Number} [end=-1] The record index to end at
     * @return {Number} The total
     */
    sum: function(property, root, start, end) {
        var values = this.extractValues(property, root),
            length = values.length,
            sum    = 0,
            i;

        start = start || 0;
        end   = (end || end === 0) ? end : length - 1;

        for (i = start; i <= end; i++) {
            sum += values[i];
        }

        return sum;
    },

    /**
     * Collects unique values of a particular property in this MixedCollection
     * @param {String} property The property to collect on
     * @param {String} root (optional) 'root' property to extract the first argument from. This is used mainly when
     * summing fields in records, where the fields are all stored inside the 'data' object
     * @param {Boolean} allowBlank (optional) Pass true to allow null, undefined or empty string values
     * @return {Array} The unique values
     */
    collect: function(property, root, allowNull) {
        var values = this.extractValues(property, root),
            length = values.length,
            hits   = {},
            unique = [],
            value, strValue, i;

        for (i = 0; i < length; i++) {
            value = values[i];
            strValue = String(value);

            if ((allowNull || !Ext.isEmpty(value)) && !hits[strValue]) {
                hits[strValue] = true;
                unique.push(value);
            }
        }

        return unique;
    },

    /**
     * @private
     * Extracts all of the given property values from the items in the MC. Mainly used as a supporting method for
     * functions like sum and collect.
     * @param {String} property The property to extract
     * @param {String} root (optional) 'root' property to extract the first argument from. This is used mainly when
     * extracting field data from Model instances, where the fields are stored inside the 'data' object
     * @return {Array} The extracted values
     */
    extractValues: function(property, root) {
        var values = this.items;

        if (root) {
            values = Ext.Array.pluck(values, root);
        }

        return Ext.Array.pluck(values, property);
    },

    /**
     * Returns a range of items in this collection
     * @param {Number} startIndex (optional) The starting index. Defaults to 0.
     * @param {Number} endIndex (optional) The ending index. Defaults to the last item.
     * @return {Array} An array of items
     */
    getRange : function(start, end){
        var me = this,
            items = me.items,
            range = [],
            i;

        if (items.length < 1) {
            return range;
        }

        start = start || 0;
        end = Math.min(typeof end == 'undefined' ? me.length - 1 : end, me.length - 1);
        if (start <= end) {
            for (i = start; i <= end; i++) {
                range[range.length] = items[i];
            }
        } else {
            for (i = start; i >= end; i--) {
                range[range.length] = items[i];
            }
        }
        return range;
    },

    /**
     * <p>Filters the objects in this collection by a set of {@link Ext.util.Filter Filter}s, or by a single
     * property/value pair with optional parameters for substring matching and case sensitivity. See
     * {@link Ext.util.Filter Filter} for an example of using Filter objects (preferred). Alternatively,
     * MixedCollection can be easily filtered by property like this:</p>
<pre><code>
//create a simple store with a few people defined
var people = new Ext.util.MixedCollection();
people.addAll([
    {id: 1, age: 25, name: 'Ed'},
    {id: 2, age: 24, name: 'Tommy'},
    {id: 3, age: 24, name: 'Arne'},
    {id: 4, age: 26, name: 'Aaron'}
]);

//a new MixedCollection containing only the items where age == 24
var middleAged = people.filter('age', 24);
</code></pre>
     *
     *
     * @param {Ext.util.Filter[]/String} property A property on your objects, or an array of {@link Ext.util.Filter Filter} objects
     * @param {String/RegExp} value Either string that the property values
     * should start with or a RegExp to test against the property
     * @param {Boolean} [anyMatch=false] True to match any part of the string, not just the beginning
     * @param {Boolean} [caseSensitive=false] True for case sensitive comparison.
     * @return {Ext.util.MixedCollection} The new filtered collection
     */
    filter : function(property, value, anyMatch, caseSensitive) {
        var filters = [],
            filterFn;

        //support for the simple case of filtering by property/value
        if (Ext.isString(property)) {
            filters.push(new Ext.util.Filter({
                property     : property,
                value        : value,
                anyMatch     : anyMatch,
                caseSensitive: caseSensitive
            }));
        } else if (Ext.isArray(property) || property instanceof Ext.util.Filter) {
            filters = filters.concat(property);
        }

        //at this point we have an array of zero or more Ext.util.Filter objects to filter with,
        //so here we construct a function that combines these filters by ANDing them together
        filterFn = function(record) {
            var isMatch = true,
                length = filters.length,
                i,
                filter,
                fn,
                scope;
                

            for (i = 0; i < length; i++) {
                filter = filters[i];
                fn     = filter.filterFn;
                scope  = filter.scope;

                isMatch = isMatch && fn.call(scope, record);
            }

            return isMatch;
        };

        return this.filterBy(filterFn);
    },

    /**
     * Filter by a function. Returns a <i>new</i> collection that has been filtered.
     * The passed function will be called with each object in the collection.
     * If the function returns true, the value is included otherwise it is filtered.
     * @param {Function} fn The function to be called.
     * @param {Mixed} fn.item The collection item.
     * @param {String} fn.key The key of collection item.
     * @param {Object} scope (optional) The scope (<code>this</code> reference) in
     * which the function is executed. Defaults to this MixedCollection.
     * @return {Ext.util.MixedCollection} The new filtered collection
     */
    filterBy : function(fn, scope) {
        var me = this,
            newMC  = new this.self(),
            keys   = me.keys,
            items  = me.items,
            length = items.length,
            i;

        newMC.getKey = me.getKey;

        for (i = 0; i < length; i++) {
            if (fn.call(scope || me, items[i], keys[i])) {
                newMC.add(keys[i], items[i]);
            }
        }

        return newMC;
    },

    /**
     * Finds the index of the first matching object in this collection by a specific property/value.
     * @param {String} property The name of a property on your objects.
     * @param {String/RegExp} value A string that the property values
     * should start with or a RegExp to test against the property.
     * @param {Number} [start=0] The index to start searching at.
     * @param {Boolean} [anyMatch=false] True to match any part of the string, not just the beginning.
     * @param {Boolean} [caseSensitive=false] True for case sensitive comparison.
     * @return {Number} The matched index or -1
     */
    findIndex : function(property, value, start, anyMatch, caseSensitive){
        if(Ext.isEmpty(value, false)){
            return -1;
        }
        value = this.createValueMatcher(value, anyMatch, caseSensitive);
        return this.findIndexBy(function(o){
            return o && value.test(o[property]);
        }, null, start);
    },

    /**
     * Find the index of the first matching object in this collection by a function.
     * If the function returns <i>true</i> it is considered a match.
     * @param {Function} fn The function to be called.
     * @param {Mixed} fn.item The collection item.
     * @param {String} fn.key The key of collection item.
     * @param {Object} [scope] The scope (<code>this</code> reference) in which the function is executed. Defaults to this MixedCollection.
     * @param {Number} [start=0] The index to start searching at.
     * @return {Number} The matched index or -1
     */
    findIndexBy : function(fn, scope, start){
        var me = this,
            keys = me.keys,
            items = me.items,
            i = start || 0,
            len = items.length;

        for (; i < len; i++) {
            if (fn.call(scope || me, items[i], keys[i])) {
                return i;
            }
        }
        return -1;
    },

    /**
     * Returns a regular expression based on the given value and matching options. This is used internally for finding and filtering,
     * and by Ext.data.Store#filter
     * @private
     * @param {String} value The value to create the regex for. This is escaped using Ext.escapeRe
     * @param {Boolean} anyMatch True to allow any match - no regex start/end line anchors will be added. Defaults to false
     * @param {Boolean} caseSensitive True to make the regex case sensitive (adds 'i' switch to regex). Defaults to false.
     * @param {Boolean} exactMatch True to force exact match (^ and $ characters added to the regex). Defaults to false. Ignored if anyMatch is true.
     */
    createValueMatcher : function(value, anyMatch, caseSensitive, exactMatch) {
        if (!value.exec) { // not a regex
            var er = Ext.String.escapeRegex;
            value = String(value);

            if (anyMatch === true) {
                value = er(value);
            } else {
                value = '^' + er(value);
                if (exactMatch === true) {
                    value += '$';
                }
            }
            value = new RegExp(value, caseSensitive ? '' : 'i');
        }
        return value;
    },

    /**
     * Creates a shallow copy of this collection
     * @return {Ext.util.MixedCollection}
     */
    clone : function() {
        var me = this,
            copy = new this.self(),
            keys = me.keys,
            items = me.items,
            i = 0,
            len = items.length;

        for(; i < len; i++){
            copy.add(keys[i], items[i]);
        }
        copy.getKey = me.getKey;
        return copy;
    }
});













/**
 * @class Ext.util.Grouper

Represents a single grouper that can be applied to a Store. The grouper works
in the same fashion as the {@link Ext.util.Sorter}.

 * @markdown
 */
 
Ext.define('Ext.util.Grouper', {

    /* Begin Definitions */

    extend: 'Ext.util.Sorter',

    /* End Definitions */
   
   isGrouper: true,

    /**
     * Returns the value for grouping to be used.
     * @param {Ext.data.Model} instance The Model instance
     * @return {String} The group string for this model
     */
    getGroupString: function(instance) {
        return instance.get(this.property);
    }
});
/**
 * @class Ext.util.HashMap
 * <p>
 * Represents a collection of a set of key and value pairs. Each key in the HashMap
 * must be unique, the same key cannot exist twice. Access to items is provided via
 * the key only. Sample usage:
 * <pre><code>
var map = new Ext.util.HashMap();
map.add('key1', 1);
map.add('key2', 2);
map.add('key3', 3);

map.each(function(key, value, length){
    console.log(key, value, length);
});
 * </code></pre>
 * </p>
 *
 * <p>The HashMap is an unordered class,
 * there is no guarantee when iterating over the items that they will be in any particular
 * order. If this is required, then use a {@link Ext.util.MixedCollection}.
 * </p>
 */
Ext.define('Ext.util.HashMap', {
    mixins: {
        observable: 'Ext.util.Observable'
    },

    /**
     * @cfg {Function} keyFn A function that is used to retrieve a default key for a passed object.
     * A default is provided that returns the <b>id</b> property on the object. This function is only used
     * if the add method is called with a single argument.
     */

    /**
     * Creates new HashMap.
     * @param {Object} config (optional) Config object.
     */
    constructor: function(config) {
        config = config || {};

        var me = this,
            keyFn = config.keyFn;

        me.addEvents(
            /**
             * @event add
             * Fires when a new item is added to the hash
             * @param {Ext.util.HashMap} this.
             * @param {String} key The key of the added item.
             * @param {Object} value The value of the added item.
             */
            'add',
            /**
             * @event clear
             * Fires when the hash is cleared.
             * @param {Ext.util.HashMap} this.
             */
            'clear',
            /**
             * @event remove
             * Fires when an item is removed from the hash.
             * @param {Ext.util.HashMap} this.
             * @param {String} key The key of the removed item.
             * @param {Object} value The value of the removed item.
             */
            'remove',
            /**
             * @event replace
             * Fires when an item is replaced in the hash.
             * @param {Ext.util.HashMap} this.
             * @param {String} key The key of the replaced item.
             * @param {Object} value The new value for the item.
             * @param {Object} old The old value for the item.
             */
            'replace'
        );

        me.mixins.observable.constructor.call(me, config);
        me.clear(true);

        if (keyFn) {
            me.getKey = keyFn;
        }
    },

    /**
     * Gets the number of items in the hash.
     * @return {Number} The number of items in the hash.
     */
    getCount: function() {
        return this.length;
    },

    /**
     * Implementation for being able to extract the key from an object if only
     * a single argument is passed.
     * @private
     * @param {String} key The key
     * @param {Object} value The value
     * @return {Array} [key, value]
     */
    getData: function(key, value) {
        // if we have no value, it means we need to get the key from the object
        if (value === undefined) {
            value = key;
            key = this.getKey(value);
        }

        return [key, value];
    },

    /**
     * Extracts the key from an object. This is a default implementation, it may be overridden
     * @param {Object} o The object to get the key from
     * @return {String} The key to use.
     */
    getKey: function(o) {
        return o.id;
    },

    /**
     * Adds an item to the collection. Fires the {@link #event-add} event when complete.
     *
     * @param {String/Object} key The key to associate with the item, or the new item.
     *
     * If a {@link #getKey} implementation was specified for this HashMap,
     * or if the key of the stored items is in a property called `id`,
     * the HashMap will be able to *derive* the key for the new item.
     * In this case just pass the new item in this parameter.
     *
     * @param {Object} [o] The item to add.
     *
     * @return {Object} The item added.
     */
    add: function(key, value) {
        var me = this;

        if (value === undefined) {
            value = key;
            key = me.getKey(value);
        }

        if (me.containsKey(key)) {
            return me.replace(key, value);
        }

        me.map[key] = value;
        ++me.length;
        if (me.hasListeners.add) {
            me.fireEvent('add', me, key, value);
        }
        return value;
    },

    /**
     * Replaces an item in the hash. If the key doesn't exist, the
     * {@link #method-add} method will be used.
     * @param {String} key The key of the item.
     * @param {Object} value The new value for the item.
     * @return {Object} The new value of the item.
     */
    replace: function(key, value) {
        var me = this,
            map = me.map,
            old;

        if (value === undefined) {
            value = key;
            key = me.getKey(value);
        }

        if (!me.containsKey(key)) {
            me.add(key, value);
        }
        old = map[key];
        map[key] = value;
        if (me.hasListeners.replace) {
            me.fireEvent('replace', me, key, value, old);
        }
        return value;
    },

    /**
     * Remove an item from the hash.
     * @param {Object} o The value of the item to remove.
     * @return {Boolean} True if the item was successfully removed.
     */
    remove: function(o) {
        var key = this.findKey(o);
        if (key !== undefined) {
            return this.removeAtKey(key);
        }
        return false;
    },

    /**
     * Remove an item from the hash.
     * @param {String} key The key to remove.
     * @return {Boolean} True if the item was successfully removed.
     */
    removeAtKey: function(key) {
        var me = this,
            value;

        if (me.containsKey(key)) {
            value = me.map[key];
            delete me.map[key];
            --me.length;
            if (me.hasListeners.remove) {
                me.fireEvent('remove', me, key, value);
            }
            return true;
        }
        return false;
    },

    /**
     * Retrieves an item with a particular key.
     * @param {String} key The key to lookup.
     * @return {Object} The value at that key. If it doesn't exist, <tt>undefined</tt> is returned.
     */
    get: function(key) {
        return this.map[key];
    },

    /**
     * Removes all items from the hash.
     * @return {Ext.util.HashMap} this
     */
    clear: function(/* private */ initial) {
        var me = this;
        me.map = {};
        me.length = 0;
        if (initial !== true && me.hasListeners.clear) {
            me.fireEvent('clear', me);
        }
        return me;
    },

    /**
     * Checks whether a key exists in the hash.
     * @param {String} key The key to check for.
     * @return {Boolean} True if they key exists in the hash.
     */
    containsKey: function(key) {
        return this.map[key] !== undefined;
    },

    /**
     * Checks whether a value exists in the hash.
     * @param {Object} value The value to check for.
     * @return {Boolean} True if the value exists in the dictionary.
     */
    contains: function(value) {
        return this.containsKey(this.findKey(value));
    },

    /**
     * Return all of the keys in the hash.
     * @return {Array} An array of keys.
     */
    getKeys: function() {
        return this.getArray(true);
    },

    /**
     * Return all of the values in the hash.
     * @return {Array} An array of values.
     */
    getValues: function() {
        return this.getArray(false);
    },

    /**
     * Gets either the keys/values in an array from the hash.
     * @private
     * @param {Boolean} isKey True to extract the keys, otherwise, the value
     * @return {Array} An array of either keys/values from the hash.
     */
    getArray: function(isKey) {
        var arr = [],
            key,
            map = this.map;
        for (key in map) {
            if (map.hasOwnProperty(key)) {
                arr.push(isKey ? key: map[key]);
            }
        }
        return arr;
    },

    /**
     * Executes the specified function once for each item in the hash.
     * Returning false from the function will cease iteration.
     *
     * The paramaters passed to the function are:
     * <div class="mdetail-params"><ul>
     * <li><b>key</b> : String<p class="sub-desc">The key of the item</p></li>
     * <li><b>value</b> : Number<p class="sub-desc">The value of the item</p></li>
     * <li><b>length</b> : Number<p class="sub-desc">The total number of items in the hash</p></li>
     * </ul></div>
     * @param {Function} fn The function to execute.
     * @param {Object} scope The scope to execute in. Defaults to <tt>this</tt>.
     * @return {Ext.util.HashMap} this
     */
    each: function(fn, scope) {
        // copy items so they may be removed during iteration.
        var items = Ext.apply({}, this.map),
            key,
            length = this.length;

        scope = scope || this;
        for (key in items) {
            if (items.hasOwnProperty(key)) {
                if (fn.call(scope, key, items[key], length) === false) {
                    break;
                }
            }
        }
        return this;
    },

    /**
     * Performs a shallow copy on this hash.
     * @return {Ext.util.HashMap} The new hash object.
     */
    clone: function() {
        var hash = new this.self(),
            map = this.map,
            key;

        hash.suspendEvents();
        for (key in map) {
            if (map.hasOwnProperty(key)) {
                hash.add(key, map[key]);
            }
        }
        hash.resumeEvents();
        return hash;
    },

    /**
     * @private
     * Find the key for a value.
     * @param {Object} value The value to find.
     * @return {Object} The value of the item. Returns <tt>undefined</tt> if not found.
     */
    findKey: function(value) {
        var key,
            map = this.map;

        for (key in map) {
            if (map.hasOwnProperty(key) && map[key] === value) {
                return key;
            }
        }
        return undefined;
    }
});







/**
 * @private
 * @class Ext.util.LruCache
 * @extend Ext.util.HashMap
 * A linked {@link Ext.util.HashMap HashMap} implementation which maintains most recently accessed
 * items at the end of the list, and purges the cache down to the most recently accessed {@link #maxSize} items
 * upon add.
 */
Ext.define('Ext.util.LruCache', {
    extend: 'Ext.util.HashMap',

    /**
     * @cfg {Number} maxSize The maximum size the cache is allowed to grow to before further additions cause
     * removal of the least recently used entry.
     */

    constructor: function(config) {
        Ext.apply(this, config);
        this.callParent([config]);
    },

    /*
     * @inheritdoc
     */
    add: function(key, newValue) {
        var me = this,
            existingKey = me.findKey(newValue),
            entry;

        // "new" value is in the list.
        if (existingKey) {
            me.unlinkEntry(entry = me.map[existingKey]);
            entry.prev = me.last;
            entry.next = null;
        }
        // Genuinely new: create an entry for it.
        else {
            entry = {
                prev: me.last,
                next: null,
                key: key,
                value: newValue
            };
        }

        // If the list is not empty, update the last entry
        if (me.last) {
            me.last.next = entry;
        }
        // List is empty
        else {
            me.first = entry;
        }
        me.last = entry;
        me.callParent([key, entry]);
        me.prune();
        return newValue;
    },

    // @private
    insertBefore: function(key, newValue, sibling) {
        var me = this,
            existingKey,
            entry;

        // NOT an assignment.
        // If there is a following sibling
        if (sibling = this.map[this.findKey(sibling)]) {
            existingKey = me.findKey(newValue);

            // "new" value is in the list.
            if (existingKey) {
                me.unlinkEntry(entry = me.map[existingKey]);
            }
            // Genuinely new: create an entry for it.
            else {
                entry = {
                    prev: sibling.prev,
                    next: sibling,
                    key: key,
                    value: newValue
                };
            }

            if (sibling.prev) {
                entry.prev.next = entry;
            } else {
                me.first = entry;
            }
            entry.next = sibling;
            sibling.prev = entry;
            me.prune();
            return newValue;
        }
        // No following sibling, it's just an add.
        else {
            return me.add(key, newValue);
        }
    },

    /*
     * @inheritdoc
     */
    get: function(key) {
        var entry = this.map[key];
        if (entry) {

            // If it's not the end, move to end of list on get
            if (entry.next) {
                this.moveToEnd(entry);
            }
            return entry.value;
        }
    },

    /*
     * @private
     */
    removeAtKey: function(key) {
        this.unlinkEntry(this.map[key]);
        return this.callParent(arguments);
    },

    /*
     * @inheritdoc
     */
    clear: function(/* private */ initial) {
        this.first = this.last = null;
        return this.callParent(arguments);
    },

    // private. Only used by internal methods.
    unlinkEntry: function(entry) {
        // Stitch the list back up.
        if (entry) {
            if (entry.next) {
                entry.next.prev = entry.prev;
            } else {
                this.last = entry.prev;
            }
            if (entry.prev) {
                entry.prev.next = entry.next;
            } else {
                this.first = entry.next;
            }
            entry.prev = entry.next = null;
        }
    },

    // private. Only used by internal methods.
    moveToEnd: function(entry) {
        this.unlinkEntry(entry);

        // NOT an assignment.
        // If the list is not empty, update the last entry
        if (entry.prev = this.last) {
            this.last.next = entry;
        }
        // List is empty
        else {
            this.first = entry;
        }
        this.last = entry;
    },

    /*
     * @private
     */
    getArray: function(isKey) {
        var arr = [],
            entry = this.first;

        while (entry) {
            arr.push(isKey ? entry.key: entry.value);
            entry = entry.next;
        }
        return arr;
    },

    /**
     * Executes the specified function once for each item in the cache.
     * Returning false from the function will cease iteration.
     *
     * By default, iteration is from least recently used to most recent.
     *
     * The paramaters passed to the function are:
     * <div class="mdetail-params"><ul>
     * <li><b>key</b> : String<p class="sub-desc">The key of the item</p></li>
     * <li><b>value</b> : Number<p class="sub-desc">The value of the item</p></li>
     * <li><b>length</b> : Number<p class="sub-desc">The total number of items in the hash</p></li>
     * </ul></div>
     * @param {Function} fn The function to execute.
     * @param {Object} scope The scope (<code>this</code> reference) to execute in. Defaults to this LruCache.
     * @param {Boolean} [reverse=false] Pass <code>true</code> to iterate the list in reverse (most recent first) order.
     * @return {Ext.util.LruCache} this
     */
    each: function(fn, scope, reverse) {
        var me = this,
            entry = reverse ? me.last : me.first,
            length = me.length;

        scope = scope || me;
        while (entry) {
            if (fn.call(scope, entry.key, entry.value, length) === false) {
                break;
            }
            entry = reverse ? entry.prev : entry.next;
        }
        return me;
    },

    /**
     * @private
     */
    findKey: function(value) {
        var key,
            map = this.map;

        for (key in map) {
            if (map.hasOwnProperty(key) && map[key].value === value) {
                return key;
            }
        }
        return undefined;
    },

    /**
     * Purge the least recently used entries if the maxSize has been exceeded.
     */
    prune: function() {
        var me = this,
            purgeCount = me.maxSize ? (me.length - me.maxSize) : 0;

        if (purgeCount > 0) {
            for (; me.first && purgeCount; purgeCount--) {
                me.removeAtKey(me.first.key);
            }
        }
    }

  /**
   * @method containsKey
   * @private
   */
  /**
   * @method contains
   * @private
   */
  /**
   * @method getKeys
   * @private
   */
  /**
   * @method getValues
   * @private
   */
});
/**
 * Represents a 2D point with x and y properties, useful for comparison and instantiation
 * from an event:
 *
 *     var point = Ext.util.Point.fromEvent(e);
 *
 */
Ext.define('Ext.util.Point', {

    /* Begin Definitions */
    extend: 'Ext.util.Region',

    statics: {

        /**
         * Returns a new instance of Ext.util.Point base on the pageX / pageY values of the given event
         * @static
         * @param {Event} e The event
         * @return {Ext.util.Point}
         */
        fromEvent: function(e) {
            e = (e.changedTouches && e.changedTouches.length > 0) ? e.changedTouches[0] : e;
            return new this(e.pageX, e.pageY);
        }
    },

    /* End Definitions */

    /**
     * Creates a point from two coordinates.
     * @param {Number} x X coordinate.
     * @param {Number} y Y coordinate.
     */
    constructor: function(x, y) {
        this.callParent([y, x, y, x]);
    },

    /**
     * Returns a human-eye-friendly string that represents this point,
     * useful for debugging
     * @return {String}
     */
    toString: function() {
        return "Point[" + this.x + "," + this.y + "]";
    },

    /**
     * Compare this point and another point
     * @param {Ext.util.Point/Object} The point to compare with, either an instance
     * of Ext.util.Point or an object with left and top properties
     * @return {Boolean} Returns whether they are equivalent
     */
    equals: function(p) {
        return (this.x == p.x && this.y == p.y);
    },

    /**
     * Whether the given point is not away from this point within the given threshold amount.
     * @param {Ext.util.Point/Object} p The point to check with, either an instance
     * of Ext.util.Point or an object with left and top properties
     * @param {Object/Number} threshold Can be either an object with x and y properties or a number
     * @return {Boolean}
     */
    isWithin: function(p, threshold) {
        if (!Ext.isObject(threshold)) {
            threshold = {
                x: threshold,
                y: threshold
            };
        }

        return (this.x <= p.x + threshold.x && this.x >= p.x - threshold.x &&
                this.y <= p.y + threshold.y && this.y >= p.y - threshold.y);
    },

    /**
     * Compare this point with another point when the x and y values of both points are rounded. E.g:
     * [100.3,199.8] will equals to [100, 200]
     * @param {Ext.util.Point/Object} p The point to compare with, either an instance
     * of Ext.util.Point or an object with x and y properties
     * @return {Boolean}
     */
    roundedEquals: function(p) {
        return (Math.round(this.x) == Math.round(p.x) && Math.round(this.y) == Math.round(p.y));
    }
}, function() {
    /**
     * @method
     * Alias for {@link #translateBy}
     * @inheritdoc Ext.util.Region#translateBy
     */
    this.prototype.translate = Ext.util.Region.prototype.translateBy;
});

/**
 * @docauthor Tommy Maintz <tommy@sencha.com>
 *
 * A mixin which allows a data component to be sorted. This is used by e.g. {@link Ext.data.Store} and {@link Ext.data.TreeStore}.
 *
 * **NOTE**: This mixin is mainly for internal use and most users should not need to use it directly. It
 * is more likely you will want to use one of the component classes that import this mixin, such as
 * {@link Ext.data.Store} or {@link Ext.data.TreeStore}.
 */
Ext.define("Ext.util.Sortable", {
    /**
     * @property {Boolean} isSortable
     * `true` in this class to identify an object as an instantiated Sortable, or subclass thereof.
     */
    isSortable: true,

    /**
     * @property {String} defaultSortDirection
     * The default sort direction to use if one is not specified.
     */
    defaultSortDirection: "ASC",

    requires: [
        'Ext.util.Sorter'
    ],

    /**
     * @property {String} sortRoot
     * The property in each item that contains the data to sort.
     */

    /**
     * Performs initialization of this mixin. Component classes using this mixin should call this method during their
     * own initialization.
     */
    initSortable: function() {
        var me = this,
            sorters = me.sorters;

        /**
         * @property {Ext.util.MixedCollection} sorters
         * The collection of {@link Ext.util.Sorter Sorters} currently applied to this Store
         */
        me.sorters = new Ext.util.AbstractMixedCollection(false, function(item) {
            return item.id || item.property;
        });

        if (sorters) {
            me.sorters.addAll(me.decodeSorters(sorters));
        }
    },

    /**
     * Sorts the data in the Store by one or more of its properties. Example usage:
     *
     *     //sort by a single field
     *     myStore.sort('myField', 'DESC');
     *
     *     //sorting by multiple fields
     *     myStore.sort([
     *         {
     *             property : 'age',
     *             direction: 'ASC'
     *         },
     *         {
     *             property : 'name',
     *             direction: 'DESC'
     *         }
     *     ]);
     *
     * Internally, Store converts the passed arguments into an array of {@link Ext.util.Sorter} instances, and delegates
     * the actual sorting to its internal {@link Ext.util.MixedCollection}.
     *
     * When passing a single string argument to sort, Store maintains a ASC/DESC toggler per field, so this code:
     *
     *     store.sort('myField');
     *     store.sort('myField');
     *
     * Is equivalent to this code, because Store handles the toggling automatically:
     *
     *     store.sort('myField', 'ASC');
     *     store.sort('myField', 'DESC');
     *
     * @param {String/Ext.util.Sorter[]} [sorters] Either a string name of one of the fields in this Store's configured
     * {@link Ext.data.Model Model}, or an array of sorter configurations.
     * @param {String} [direction="ASC"] The overall direction to sort the data by.
     * @return {Ext.util.Sorter[]}
     */
    sort: function(sorters, direction, where, doSort) {
        var me = this,
            sorter, sorterFn,
            newSorters;

        if (Ext.isArray(sorters)) {
            doSort = where;
            where = direction;
            newSorters = sorters;
        }
        else if (Ext.isObject(sorters)) {
            doSort = where;
            where = direction;
            newSorters = [sorters];
        }
        else if (Ext.isString(sorters)) {
            sorter = me.sorters.get(sorters);

            if (!sorter) {
                sorter = {
                    property : sorters,
                    direction: direction
                };
                newSorters = [sorter];
            }
            else if (direction === undefined) {
                sorter.toggle();
            }
            else {
                sorter.setDirection(direction);
            }
        }

        if (newSorters && newSorters.length) {
            newSorters = me.decodeSorters(newSorters);
            if (Ext.isString(where)) {
                if (where === 'prepend') {
                    sorters = me.sorters.clone().items;

                    me.sorters.clear();
                    me.sorters.addAll(newSorters);
                    me.sorters.addAll(sorters);
                }
                else {
                    me.sorters.addAll(newSorters);
                }
            }
            else {
                me.sorters.clear();
                me.sorters.addAll(newSorters);
            }
        }

        if (doSort !== false) {
            me.onBeforeSort(newSorters);
            
            sorters = me.sorters.items;
            if (sorters.length) {
                // Sort using a generated sorter function which combines all of the Sorters passed
                me.doSort(me.generateComparator());
            }
        }

        return sorters;
    },

    /**
     * <p>Returns a comparator function which compares two items and returns -1, 0, or 1 depending
     * on the currently defined set of {@link #sorters}.</p>
     * <p>If there are no {@link #sorters} defined, it returns a function which returns <code>0</code> meaning that no sorting will occur.</p>
     */
    generateComparator: function() {
        var sorters = this.sorters.getRange();
        return sorters.length ? this.createComparator(sorters) : this.emptyComparator;
    },
    
    createComparator: function(sorters) {
        return function(r1, r2) {
            var result = sorters[0].sort(r1, r2),
                length = sorters.length,
                i = 1;

            // if we have more than one sorter, OR any additional sorter functions together
            for (; i < length; i++) {
                result = result || sorters[i].sort.call(this, r1, r2);
            }
            return result;
        };
    },
    
    emptyComparator: function(){
        return 0;
    },

    onBeforeSort: Ext.emptyFn,

    /**
     * @private
     * Normalizes an array of sorter objects, ensuring that they are all Ext.util.Sorter instances
     * @param {Object[]} sorters The sorters array
     * @return {Ext.util.Sorter[]} Array of Ext.util.Sorter objects
     */
    decodeSorters: function(sorters) {
        if (!Ext.isArray(sorters)) {
            if (sorters === undefined) {
                sorters = [];
            } else {
                sorters = [sorters];
            }
        }

        var length = sorters.length,
            Sorter = Ext.util.Sorter,
            fields = this.model ? this.model.prototype.fields : null,
            field,
            config, i;

        for (i = 0; i < length; i++) {
            config = sorters[i];

            if (!(config instanceof Sorter)) {
                if (Ext.isString(config)) {
                    config = {
                        property: config
                    };
                }

                Ext.applyIf(config, {
                    root     : this.sortRoot,
                    direction: "ASC"
                });

                //support for 3.x style sorters where a function can be defined as 'fn'
                if (config.fn) {
                    config.sorterFn = config.fn;
                }

                //support a function to be passed as a sorter definition
                if (typeof config == 'function') {
                    config = {
                        sorterFn: config
                    };
                }

                // ensure sortType gets pushed on if necessary
                if (fields && !config.transform) {
                    field = fields.get(config.property);
                    config.transform = field ? field.sortType : undefined;
                }
                sorters[i] = new Ext.util.Sorter(config);
            }
        }

        return sorters;
    },

    getSorters: function() {
        return this.sorters.items;
    },
    
    /**
     * Gets the first sorter from the sorters collection, excluding
     * any groupers that may be in place
     * @protected
     * @return {Ext.util.Sorter} The sorter, null if none exist
     */
    getFirstSorter: function(){
        var sorters = this.sorters.items,
            len = sorters.length,
            i = 0,
            sorter;
            
        for (; i < len; ++i) {
            sorter = sorters[i];
            if (!sorter.isGrouper) {
                return sorter;    
            }
        }
        return null;
    }
});
/**
 * @class Ext.util.MixedCollection
 * <p>
 * Represents a collection of a set of key and value pairs. Each key in the MixedCollection
 * must be unique, the same key cannot exist twice. This collection is ordered, items in the
 * collection can be accessed by index  or via the key. Newly added items are added to
 * the end of the collection. This class is similar to {@link Ext.util.HashMap} however it
 * is heavier and provides more functionality. Sample usage:
 * <pre><code>
var coll = new Ext.util.MixedCollection();
coll.add('key1', 'val1');
coll.add('key2', 'val2');
coll.add('key3', 'val3');

console.log(coll.get('key1')); // prints 'val1'
console.log(coll.indexOfKey('key3')); // prints 2
 * </code></pre>
 *
 * <p>
 * The MixedCollection also has support for sorting and filtering of the values in the collection.
 * <pre><code>
var coll = new Ext.util.MixedCollection();
coll.add('key1', 100);
coll.add('key2', -100);
coll.add('key3', 17);
coll.add('key4', 0);
var biggerThanZero = coll.filterBy(function(value){
    return value > 0;
});
console.log(biggerThanZero.getCount()); // prints 2
 * </code></pre>
 * </p>
 */
Ext.define('Ext.util.MixedCollection', {
    extend: 'Ext.util.AbstractMixedCollection',
    mixins: {
        sortable: 'Ext.util.Sortable'
    },

    /**
     * Creates new MixedCollection.
     * @param {Boolean} allowFunctions Specify <tt>true</tt> if the {@link #addAll}
     * function should add function references to the collection. Defaults to
     * <tt>false</tt>.
     * @param {Function} keyFn A function that can accept an item of the type(s) stored in this MixedCollection
     * and return the key value for that item.  This is used when available to look up the key on items that
     * were passed without an explicit key parameter to a MixedCollection method.  Passing this parameter is
     * equivalent to providing an implementation for the {@link #getKey} method.
     */
    constructor: function() {
        var me = this;
        me.callParent(arguments);
        me.addEvents('sort');
        me.mixins.sortable.initSortable.call(me);
    },

    doSort: function(sorterFn) {
        this.sortBy(sorterFn);
    },

    /**
     * @private
     * Performs the actual sorting based on a direction and a sorting function. Internally,
     * this creates a temporary array of all items in the MixedCollection, sorts it and then writes
     * the sorted array data back into this.items and this.keys
     * @param {String} property Property to sort by ('key', 'value', or 'index')
     * @param {String} dir (optional) Direction to sort 'ASC' or 'DESC'. Defaults to 'ASC'.
     * @param {Function} fn (optional) Comparison function that defines the sort order.
     * Defaults to sorting by numeric value.
     */
    _sort : function(property, dir, fn){
        var me = this,
            i, len,
            dsc   = String(dir).toUpperCase() == 'DESC' ? -1 : 1,

            //this is a temporary array used to apply the sorting function
            c     = [],
            keys  = me.keys,
            items = me.items;

        //default to a simple sorter function if one is not provided
        fn = fn || function(a, b) {
            return a - b;
        };

        //copy all the items into a temporary array, which we will sort
        for(i = 0, len = items.length; i < len; i++){
            c[c.length] = {
                key  : keys[i],
                value: items[i],
                index: i
            };
        }

        //sort the temporary array
        Ext.Array.sort(c, function(a, b){
            var v = fn(a[property], b[property]) * dsc;
            if(v === 0){
                v = (a.index < b.index ? -1 : 1);
            }
            return v;
        });

        //copy the temporary array back into the main this.items and this.keys objects
        for(i = 0, len = c.length; i < len; i++){
            items[i] = c[i].value;
            keys[i]  = c[i].key;
        }

        me.fireEvent('sort', me);
    },

    /**
     * Sorts the collection by a single sorter function
     * @param {Function} sorterFn The function to sort by
     */
    sortBy: function(sorterFn) {
        var me     = this,
            items  = me.items,
            keys   = me.keys,
            length = items.length,
            temp   = [],
            i;

        //first we create a copy of the items array so that we can sort it
        for (i = 0; i < length; i++) {
            temp[i] = {
                key  : keys[i],
                value: items[i],
                index: i
            };
        }

        Ext.Array.sort(temp, function(a, b) {
            var v = sorterFn(a.value, b.value);
            if (v === 0) {
                v = (a.index < b.index ? -1 : 1);
            }

            return v;
        });

        //copy the temporary array back into the main this.items and this.keys objects
        for (i = 0; i < length; i++) {
            items[i] = temp[i].value;
            keys[i]  = temp[i].key;
        }

        me.fireEvent('sort', me, items, keys);
    },

    /**
     * Calculates the insertion index of the new item based upon the comparison function passed, or the current sort order.
     * @param {Object} newItem The new object to find the insertion position of.
     * @param {Function} [sorterFn] The function to sort by. This is the same as the sorting function
     * passed to {@link #sortBy}. It accepts 2 items from this MixedCollection, and returns -1 0, or 1
     * depending on the relative sort positions of the 2 compared items.
     *
     * If omitted, a function {@link #generateComparator generated} from the currently defined set of
     * {@link #sorters} will be used.
     *
     * @return {Number} The insertion point to add the new item into this MixedCollection at using {@link #insert}
     */
    findInsertionIndex: function(newItem, sorterFn) {
        var me    = this,
            items = me.items,
            start = 0,
            end   = items.length - 1,
            middle,
            comparison;

        if (!sorterFn) {
            sorterFn = me.generateComparator();
        }
        while (start <= end) {
            middle = (start + end) >> 1;
            comparison = sorterFn(newItem, items[middle]);
            if (comparison >= 0) {
                start = middle + 1;
            } else if (comparison < 0) {
                end = middle - 1;
            }
        }
        return start;
    },

    /**
     * Reorders each of the items based on a mapping from old index to new index. Internally this
     * just translates into a sort. The 'sort' event is fired whenever reordering has occured.
     * @param {Object} mapping Mapping from old item index to new item index
     */
    reorder: function(mapping) {
        var me = this,
            items = me.items,
            index = 0,
            length = items.length,
            order = [],
            remaining = [],
            oldIndex;

        me.suspendEvents();

        //object of {oldPosition: newPosition} reversed to {newPosition: oldPosition}
        for (oldIndex in mapping) {
            order[mapping[oldIndex]] = items[oldIndex];
        }

        for (index = 0; index < length; index++) {
            if (mapping[index] == undefined) {
                remaining.push(items[index]);
            }
        }

        for (index = 0; index < length; index++) {
            if (order[index] == undefined) {
                order[index] = remaining.shift();
            }
        }

        me.clear();
        me.addAll(order);

        me.resumeEvents();
        me.fireEvent('sort', me);
    },

    /**
     * Sorts this collection by <b>key</b>s.
     * @param {String} direction (optional) 'ASC' or 'DESC'. Defaults to 'ASC'.
     * @param {Function} fn (optional) Comparison function that defines the sort order.
     * Defaults to sorting by case insensitive string.
     */
    sortByKey : function(dir, fn){
        this._sort('key', dir, fn || function(a, b){
            var v1 = String(a).toUpperCase(), v2 = String(b).toUpperCase();
            return v1 > v2 ? 1 : (v1 < v2 ? -1 : 0);
        });
    }
});
