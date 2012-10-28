(function(global){
	global.Ext = {};

	Ext.apply(Ext, {
		// 
		alias: function(object, methodName) {
			return function() {
				return object[methodName].apply(object, arguments);
			}
		}
	});

})(window);

(function(Class, alias) {
	var slice = Array.prototype.slice;
	var Manager = Ext.ClassManager = {
		classes: {},
		existCache: {},
		
		namespaceRewrites: [{
			from: 'Ext.',
			to: Ext
		}],
		
		maps: {
			alternateToName: {},
			aliasToName: {},
			nameToAliases: {}
		},

		enableNamespaceParseCache: true,

		namespaceParseCache: {},

		instantiators: [],

		instantiationCounts: {},

		isCreated: function(className) {
			var i, ln, part, root, parts;

			if (typeof className !== 'string' || className.length < 1) {
				throw new Error('Invalid classname, must be a string and must not be empty');
			}

			if (this.classes.hasOwnProperty(className) || this.existCache.hasOwnProperty(className)) {
				return true;
			}

			root = Ext.global;
			parts = this.parseNamespace(className);

			for (i = 0, ln = parts.length; i < ln; i++) {
				part = parts[i];

				if (typeof part !== 'string') {
					root = part;
				}
				else {
					if (!root || !root[part]) {
						return false;
					}

					root = root[part];
				}
			}

			Ext.Loader.historyPush(className); // TODO

			this.existCache[className] = true;

			return true;
		},
		
		// line : 5709
		parseNamespace: function(namespace) {
			if (typeof namespace !== 'string') {
				throw new Error('Invalid namespace, must be a string');
			}
			
			var cache = this.namespaceParseCache;

			if (this.enableNamespaceParseCache) {
				if (cache.hasOwnProperty(namespace)) {
					return cache[namespace];
				}
			}

			var parts = [],
				rewrites = this.namespaceRewrites,
				rewrite, from, to, i, ln, root = Ext.global;

			for (i = 0, ln = rewites.length; i < ln; i++) {
				rewrite = rewrites[i];
				from = rewrite.from;
				to = rewrite.to;

				if (namespace === from || namespace.substring(0, from.length) === from) {
					namespace = namespace.substring(from.length);

					if (typeof to !== 'string') {
						root = to;
					}
					else {
						parts = parts.concat(to.split('.'));
					}
					break;
				}
			}

			parts.push(root);

			parts = parts.concat(namespace.split('.'));

			if (this.enableNamespaceParseCache) {
				cache[namespace] = parts;
			}

			return parts;
		},

		/**
		Ext.ClassManager.setNamespace('MyCompany.pkg.Example', someObject);
		alert(MyCompany.pkg.Example === someObject); // true
		*/
		setNamespace: function(name, value) {
			var root = Ext.global,
				parts = this.parseNamespace(name),
				leaf = parts.pop(),
				i, ln, part;

			for (i = 0, ln = parts.length; i < ln ; i++) {
				part = parts[i];

				if (typeof part !== 'string') {
					root = part;
				}
				else {
					if (!root[part]) {
						root[part] = {};
					}
					root = root[part];
				}
			}
			root[leaf] = value;
			return root[leaf];
		},

		createNamespace: function() {
			var root = Ext.global,
				parts, part, i, j, ln, subLn;

			for (i = 0, ln = arguments.length; i < ln ; i++) {
				part = this.parseNamespace(arguments[i]);

				for (j = 0, subLn = parts.length; j < subLn ; j++) {
					part = parts[j];

					if (typeof part !== 'string') {
						root = part;
					}
					else {
						if (!root[part]) {
							root[part] = {};
						}
						root = root[part];
					}
				}
			}

			return root;
		},

		set: function(name, value) {
			var targetName = this.getName(value); // value.$className

			this.classes[name] = this.setNamespace(name, value);

			if (targetName && targetName !== name) {
				this.maps.alterbateToName[name] = targetName;
			}
			return this;
		},

		get: function(name) {
            if (this.classes.hasOwnProperty(name)) {
                return this.classes[name];
            }

            var root = Ext.global,
                parts = this.parseNamespace(name),
                part, i, ln;

            for (i = 0, ln = parts.length; i < ln; i++) {
                part = parts[i];

                if (typeof part !== 'string') {
                    root = part;
                } else {
                    if (!root || !root[part]) {
                        return null;
                    }

                    root = root[part];
                }
            }

            return root;			
		},

        setAlias: function(cls, alias) {
            var aliasToNameMap = this.maps.aliasToName,
                nameToAliasesMap = this.maps.nameToAliases,
                className;

            if (typeof cls === 'string') {
                className = cls;
            } else {
                className = this.getName(cls);
            }

            if (alias && aliasToNameMap[alias] !== className) {
                if (aliasToNameMap.hasOwnProperty(alias) && Ext.isDefined(Ext.global.console)) {
                    Ext.global.console.log("[Ext.ClassManager] Overriding existing alias: '" + alias + "' " +
                        "of: '" + aliasToNameMap[alias] + "' with: '" + className + "'. Be sure it's intentional.");
                }

                aliasToNameMap[alias] = className;
            }

            if (!nameToAliasesMap[className]) {
                nameToAliasesMap[className] = [];
            }

            if (alias) {
                Ext.Array.include(nameToAliasesMap[className], alias);
            }

            return this;
        },

        getByAlias: function(alias) {
            return this.get(this.getNameByAlias(alias));
        },

        getNameByAlias: function(alias) {
            return this.maps.aliasToName[alias] || '';
        },

        getAliasesByName: function(name) {
            return this.maps.nameToAliases[name] || [];
        },

        getName: function(object) {
            return object && object.$className || '';
        },

        getClass: function(object) {
            return object && object.self || null;
        },

		create: function(className, data, createdFn) {
			var manager = this;

			if (typeof className !== 'string') {
				throw new Error('Invalid class name specified, must be a non-empty string');
			}

			data.$className = className;

			return new Class(data, function() {
				var postprocessorStack = data.postprocessors || manager.defaultPostprocessors,
					registeredPostprocessors = manager.postprocessors,
					index = 0,
					postprocessors = [],
					postprocessor, process, i, ln;

				delete data.postprocessors;

				for (i = 0, ln = postproessorsStack.length; i < ln ; i++) {
					postprocessor = postproessorsStack[i];

					if (typeof postprocessor === 'string') {
						postprocessor = registeredPostprocessors[postprocessor];

						if (!postprocessor.always) {
							if (data[postprocessor.name] !== undefined) {
								postprocessors.push(postprocessor.fn);
							}							
						}
						else {
							postprocessors.push(postprosessor.fn);
						}
					}
					else {
						postprocessors.push(postprocessor);
					}
				}

				process = function(clsName, cls, clsData) {
					postprocessor = postprocessors[index++];

					if (!postprocessor) {
						manager.set(className, cls);

						Ext.loader.historyPush(className);

						if (createdFn) {
							createdFn.call(cls, cls);
						}

						return;
					}

					if (postprocessor.call(this, clsName, cls, clsData, process) !== false) {
						process.apply(this, arguments);
					}
				};

				process.call(manager, className, this, data);
			}
		}, // 6084
		
	};
})();


(function(global){

	Ext.apply(Ext, {
		create: alias(Manager, 'instantiate')
	});

	var ExtObject = Ext.Object = {
		merge: function(source, key, value) {
			if (typeof key === 'string') {
				if (value && value.constructor === Object) {
					if (source[key] && source[key].constructor === Object) {
						ExtObject.merge(source[key], value);
					}
					else {
						source[key] = Ext.clone(value);
					}
				}
				else {
					source[key] = value;
				}
				return source;
			}

			var i = 1,
				ln = arguments.length,
				object, property;

			for ( ; i < ln; i++) {
				object = arguments[i];

				for (property in object) {
					if (object.hasOwnProperty(property)) {
						ExtObject.merge(source, property, object[property]);
					}
				}
			}
			return source;
		}	
	};

	Ext.apply(Ext.Function, {
		/**
		var setValue = Ext.Function.flexSetter(function(name, value) {
			this[name] = value;
		});

		setValue('name1', 'value1');
		
		setValue({
			name1: 'value1',
			name2: 'value2',
			name3: 'value3'
		});
		*/
		flexSetter: function(fn) {
			return function(a, b) {
				var k, i;

				if (a === null) {
					return this; // Class Object
				}

				// 키가 문자열이 아니고 json일 때 하나씩 호출
				if (typeof a !== 'string') {
					for (k in a) {
						if (a.hasOwnProperty(k)) {
							fn.call(this, k, a[k]);
						}
					}
					
					if (Ext.enumerables) {
						for (i = Ext.enumerables.length; i--; ) {
							k = Ext.enumerables[i];
							if (a.hasOwnProperty(k)) {
								fn.call(this, k, a[k]);
							}
						}
					}
				}
				else {
					fn.call(this, a, b);
				}
			}
		}
	});


	var flexSetter = Ext.Function.flexSetter;
	var Base = Ext.Base = function() {};

	Base.prototype = {
		$className: 'Ext.Base',
		
		$class: Ext,

		/**
		 * Ext.define('My.Cat', {
			 statics: {
				 specialsName: 'Cat', // My.Cat.specialsName
			 },

			 constructor: function() {
				 alert(this.self.specialsName);
				 return this;
			 },

			 clone: function() {
				 return new this.self();
			 }
			});
		 */
		 self: Base,

		/**
		 * 기본 생성자, 단순히 this를 리턴
		 *
		 * @constructor
		 * @protected
		 * @return {Object} this
		 */
		constructor: function() {
			return this;
		},

		/**
		 * 설정정보를 초기화
		Ext.define('My.awesome.Class', {
			// The default config
			config: {
				name: 'Awesome',
				isAwesome: true
			},

			constuctor: function(config) {
				this.initConfig(config);

				return this;
			}
		});

		var awesome = new My.awesome.Class({
			name: 'Super awesome'
		});
		 * @protected
		 * @param {Object} config
		 * @return {Object} mixins The prototypes  as key - value pairs
		 */
		initConfig: function(config) {
			if (!this.$configInited) {
				this.config = Ext.Object.merge({}, this.config || {}, config || {});

				this.applyConfig(this.config);

				this.$configInited = true;
			}

			return this;
		},

		/**
		 * @private
		 */
		setConfig: function(config) {
			this.applyConfig(config || {});

			return this;
		},

		/**
		 * @private
		 * flexSetter: 첫인자가 문자열이냐 json이냐 따라서 알아서 (넘기는 함수)를 호출하도록 해주는 함수
		 */
		applyConfig: flexSetter(function(name, value) {
			var setter = 'set' + Ext.String.capitalize(name);
			
			if (typeof this[setter] === 'function') {
				this[setter].call(this, value);
			}
		}),

		/**
		Ext.define('My.own.A', {
			constructor: function(test) {
				alert(test);
			}
		});

		Ext.define('My.own.B', {
			extend: 'My.own.A',

			constructor: function(test) {
				alert(test);

				this.callParent([test + 1]);
			}
		});

		var b = new My.own.B(1); // alerts 1, than alerts 2
		*/
		callParent: function(args) {
			var method = this.callParent.caller, // 자식 메소드?
				parentClass, methodName;

			if (!method.$owner) {
				if (!method.caller) { // 자식메소드의 자식메소드
					throw new Error();
				}
				method = method.caller;
			}

			parentClass = method.$owner.superclass;
			methodName = method.$name;

			if (!(methodName in parentClass)) {
				throw new Error();
			}

			return parentClass[methodName].apply(this, args || []);
		},

		statics: function() {
			var method = this.statics.caller,
				self = this.self;

			if (!method) {
				return self;
			}

			return method.$owner;
		},

		callOverridden: function(args) {
			var method = this.callOverriddden.caller;

			if (!method.$onwer || !method.$previous) {
				throw new Error();
			}
			return method.$previous.apply(this, args || {});
		},

		destroy: function() {}
	};

	Ext.apply(Ext.Base, {
		// line : 4646
		create: function() {
			return Ext.create.apply(Ext, [this].concat(Array.prototype.slice.call(arguments, 0)));
		}
	});

})(window);