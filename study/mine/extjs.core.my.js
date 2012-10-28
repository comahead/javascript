/**
 * @class Ext 
 * @singleton
 **/
(function() {
	var global = this,
		objectPrototype = Object.prototype,
		toString = Object.prototype.toString,
		enumerables = true,
		enumerablesTest = { toString: 1 },
		i;

	if (typeof Ext === 'undefined') {
		global.Ext = {};
	}

	Ext.global = global;

	for(i in enumerablesTest) {
		enumerables = null;
	}

	if (enumerables)
	{
		enumerables = ['hasOwnProperty', 'valueOf', 'isPrototypeOf', 'propertyIsEnumerable', 
					   'toLocaleString', 'toString', 'constructor'];
	}

	/**
	 * An array containing extra enumerables for old browsers
	 * 구브라우저를 위해 이넘을 풀어서 배열에 담는다?
	 * @type Array
	 */
	Ext.enumerables = enumerables;

	/**
	 * Copies all the properties of config to the specified object.
	 * 특정 오브젝트에 있는 설정의 모든 속성들을 복사시킨다.
	 * Note that if recursive merging and cloning without referencing the original objects / arrays is needed, use
	 * 알아두라. 만약 순환적인 병합이고 원래 객체로부터 참조없이 복제되기를 원한다면 배열이 요한다.
	 * {@link Ext.Object#merge} instead
	 * @param {Object} object The receiver of the properties
	 * @param {Object} config The source of the properties
	 * @param {Object} defaults A different object that will also be applied for default values
	 * @return {Object} returns obj
	 */
	Ext.apply = function(object, config, defaults) {
		defaults && Ext.apply(object, defaults);

		if (object && config && typeof config === 'object') {
			var i, j, k;

			for (i in config) {
				object[i] = config[i];
			}

			if (enumerables) {
				// tip
				for (j = enumerables.length; j--; ){
					k = enumerables[j];
					if(config.hasOwnProperty(k)) {
						object[k] = config[k];
					}
				}
			}
		}
		return object;
	};

	Ext.buildSettings = Ext.apply({
		baseCSSPrefix: 'x-',
		scopeResetCSS: false
	}, EXt.buildSettings || {});

	Ext.apply(Ext, {
		/**
		 * 재사용할 수 있는 빈 함수
		 */
		emptyFn: function() {},

		baseCSSPrefix: Ext.buildSettings.baseCSSPrefix,

		/**
		 * 존재하지 않는 속성만 복사
		 * @function 
		 * @param {Object} object The receiver of the properties
		 * @param {Object} config The source of the properties
		 * @return {Object} returns obj
		 */
		applyIf: function(object, config) {
			var property;

			if (object) {
				for (property in config){
					if (object[property] === undefined) {
						object[property] = config[property];
					}
				}
			}
			return object;
		},

		/**
		 * 오브젝트나 배열을 순환시킨다. 이 메소드는 다음 메소드의 별칭이다.
		 * {@link Ext.Array#each Ext.Array.each} 만약 주어진 값이 반복자이면 {@link Ext.Object#each Ext.Object.each} 도 사용할 수 있다.
		 *
		 * @param {Object/Array} object The object or array to be iterated.
		 * @param {Function} fn The function to be called for each iteration. See and {@link Ext.Array#each Ext.Array.each} and
		 * {@link Ext.Object#each Ext.Object.each} for detailed lists of arguments passedto this function depending on the given object
		 * type that is being iterated.
		 * @param {Object} scope (Optional) The scope ('this' reference) in which the specified function is excuted.
		 * Defaults to the object being iterated itself.
		 */
		iterate: function(object, fn, scope) {
			if (Ext.isEmpty(object)) {
				return;
			}
			if (scope === undefined) {
				scope = object;
			}
			if (Ext.isIterable(object)) {
				Ext.Array.each.call(Ext.Array, object, fn, scope);
			}
			else {
				Ext.Object.each.call(Ext.Object, object, fn, scope);
			}
		}
	});

	Ext.apply(Ext, {
		/**
		 * This method deprecated. use {@link Ext#define Ext.define} instead.
		 * @method
		 * @param {Function} superclass
		 * @param {object} overrides
		 * @return {Function} The subclass constructor from the <tt>overrides</tt> parameter, or a generated one if not provided.
		 * @deprecated 4.0.0 Use {@link Ext#define Ext.define} instead
		 */
		extend: function() {
			// inline overrides
			var objectConstructor = objectPrototype.constructor,
				inlineOverrides = function(o) {
					for (var m in o) {
						if (!o.hasOwnProperty(m)) {
							continue;
						}
						this[m] = o[m];
					}
				};
			
			return function(subclass, superclass, overrides) {
				// First we check if the user passed in just the superClass with overrides
				if (Ext.isObject(superclass)) {
					overrides = superclass;
					superclass = subclass;
					subclass = overrides.constructor !== objectConstructor ? overrides.constructor : function() {
						superclass.apply(this, arguments);
					};
				}
			};
	});

})();