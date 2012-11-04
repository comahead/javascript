(function(global, undefined){
	var objectPrototype = Object.prototype,
		toString = objectPrototype.toString,
		emptyFn = function () {};
		
	IU = {};	
	IU.copy = function (object, attr, defaults) {
		defaults && IU.copy(object, defaults);
		if (typeof object === 'undefined') object = {};
		if (typeof attr == 'object') {
			for(var k in attr) {
				object[k] = attr[k];
			}
		}
		return object;
	}
	
	IU.copy(IU, (function () {
		var win = window,
			ua = function () {
				var uaStr = navigator.userAgent;
				return function(reg){
					return reg.test(uaStr);
				};
			}(),
			app = function () {
				var anStr = navigator.appName;
				return function(reg) {
					return reg.test(anStr)
				};
			}(),
			isIE = ua(/MSIE/gi) && app(/Explorer/gi),
			isIE6 = isIE && ua(/MSIE [56]/),
			isOpera = win.opera && opera.buildNumber,
			isWebkit = ua(/WebKit/),
			isChrome = ua(/Chrome/),
			isGecko = ua(/FireFox/),
			isSafari = ua(/Safari/);
			
		return {
			isIE: isIE,
			isIE6: isIE6,
			isOpera: isOpera,
			isWebkit: isWebkit,
			isChrome: isChrome,
			isGecko: isGecko,
			isSafari: isSafari
		};
	})()),
	
	IU.copy(IU, {
		emptyFn: emptyFn,
		
		isObject: function(value) {
			return toString.call(value) == '[object Object]' && value.ownerDocument === undefined;	
		},
		
		isArray: 'isArray' in Array ? Array.isArray : function (value) {
			return toString.call(value) == '[object Array]';
		},
		
		isNumber: function (value, comma) {
			if (comma === true) {
				return !isNaN(parseFloat(value)) && isFinite(value);
			} else {
				return typeof value === 'number' && isFinite(value);
			}
		},
		
		isDefined: function (value) {
			return typeof value !== 'undefined';
		},
		
		isFunction: function (value) {
			return typeof value === 'function';
		},
		
		isString: function (value) {
			return typeof value === 'string';
		},
		
		isBoolean: function (value) {
			return typeof value === 'boolean';
		},
		
		isElement: function (value) {
			return value && value.nodeType === 1;
		},
		
		isEmpty: function (value) {
			return (value == null) 
				|| (value == undefined)
				|| (value == '')
				|| (IU.isObject(value) && (function(){ for (var k in value) {
					return false;
				} return true; })())
				|| (IU.isArray(value) && value.length === 0)
		}
	});
	
	IU.copy(IU, {
		
		copyIf: function (object, attr) {
			if (object) for(var k in attr) {
				if (object[k] == undifined) {
					object[k] = attr[k];
				}
			}
			return object;
		},
		
		copyOwn: function (scope, object) {
			for (var k in object) {
				if (!object.hasOwnProperty(k)) {
					continue;
				}
				scope[k] = object[k];
			}
			return scope;
		},
		
		each: function (object, fn, scope) {
			if (IU.isEmpty(object)) {
				return;
			}
			
			if (IU.isArray(object)) {
				return IU.Array.each.call(IU.Array, object, fn, scope || object);
			} else {
				return IU.Object.each.call(IU.Object, object, fn, scope || object);
			}
		}
	});
	
	
	IU.copy(IU, {
		Array: {
			each: function(object, fn, scope){
				for (var i = -1, item; item = object[++i];) {
					if (fn.call(scope || object, i, item) === false) {
						return false;
					}
				}
				return true;
			}
		}
	});
	
	IU.copy(IU, {
		Object: {
			each: function(object, fn, scope){
				for (var k in object) {
					if (fn.call(scope || object, k, object[k]) === false) {
						return false;
					}
				}
				return true;
			},
			
			toQueryString: function(o){
				if (IU.isEmpty(o)) {
					return '';
				}
				if (IU.isString(o)) {
					return o;
				}
				
				var pieces = [];
				for (var key in o) {
					pieces.push(encodeURIComponent(key) + '=' + encodeURIComponent(o[key]));
				}
				return pieces.join('&');
			}
		}
	});
	
	// from Ext
	IU.copy(IU, {
		extend: (function (){
			var objectConstructor = objectPrototype.constructor,
				inlineOverrides = function (o) {
					IU.copyOwn(this, o);
				};

			return function(subclass, superclass, overrides) {
				if (IU.isObject(superclass)) {
					overrides = superclass;
					superclass = subclass;
					subclass = overrides.constructor !== objectPrototype ? overrides.constructor : function () {
						superclass.apply(this, aguments);
					};
				}
				
                if (!superclass) {
                    IU.Error.raise({
                        sourceClass: 'Ext',
                        sourceMethod: 'extend',
                        msg: 'Attempting to extend from a class which has not been loaded on the page.'
                    });
                }

                var F = function() {},
                    subclassProto, superclassProto = superclass.prototype;

                F.prototype = superclassProto;
                subclassProto = subclass.prototype = new F();
                subclassProto.constructor = subclass;
                subclass.superclass = superclassProto;

                if (superclassProto.constructor === objectConstructor) {
                    superclassProto.constructor = superclass;
                }

                /*subclass.override = function(overrides) {
                    Ext.override(subclass, overrides);
                };*/

                subclassProto.override = inlineOverrides;
                subclassProto.proto = subclassProto;

                //subclass.override(overrides);
                subclass.extend = function(o) {
                    return IU.extend(subclass, o);
                };

                return subclass;				
			};				
		})()
	});
	
	IU.copy(IU, {
		ajax: (function (){
			var win = window,
				emptyFn = IU.emptyFn,
				createRequest = function(params) {
					var req = null;
					if (win.XMLHttpRequest) {
						req = new XMLHttpRequest();
						req.overrideMimeType && req.overrideMimeType('text/html');
					} else if (win.ActiveXObject) {
						try {
							req = new ActiveXObject('Msxml2.XMLHTTP');
						} catch(e) {
							try {
								req = new ActiveXObject('Microsoft.XMLHTTP');
							} catch(er){}
						}
					}
					if (!req){
						throw "Could not create a XMLHttpRequest instance.";
					}			
					req.onreadystatechange = function(e) {
						if (req.readyState === 1) {
							(params.load || emptyFn)(req)
						} else if (req.readyState === 4) {
							var res = req.responseText;
							if (params.dataType === 'json') {
								try {
									JSON.parse(res);
								} catch(e){
									throw "UnSupport JSON.parse()..";
								}
							}
							
							if ((req.status > 190 && req.status < 300) || req.status === 304) {
								(params.success || emptyFn)(res, req.status, req);
							} else {
								(params.error || emptyFn)(req.status, res);
							}
						}
						
						if (params.always) {						
							params.always(req);
						}
					};
					
					return req;		
				},
				setHeader = function(req, params) {
					req.setRequestHeader('X-Requested-With', 'XMLHttpRequest');					
					if (params.type === 'POST' || params.type === 'post') {
						req.setRequestHeader(
							'Content-Type',
							'application/x-www-form-urlencode; charset=' + (params.charset || 'utf-8')
						);
					}				
					(params.beforeSend || emptyFn)(req);	
				};
				
			return function (params) {
				var req = createRequest(params),
					data = IU.Object.toQueryString(params.data);
				params.async = params.async === false ? false : true;
				if ((params.type || '').toUpperCase() === 'POST') {
					req.open('POST', params.url, params.async);
					setHeader(req, params)
					req.send(data);
				} else {
					req.open('GET', 
						params.url + (!IU.isEmpty(data) ? (params.url.match(/\?/) ? '&' : '?') + data : ''),
						params.async
					);
					setHeader(req, params);
					req.send();
				}
			};
		})()
	});
	
	IU.copy(IU, {
		require: function(url) {
			if (!IU.isArray(url)) {
				url = [url];
			}
			var head = document.getElementsByTagName('head')[0];
			
			for(var i=-1, js; js = url[++i]; ) {
				IU.ajax({
					async: false,
					url: js,
					success: function(res) {
						var js = document.createElement('script');
						js.type = 'text/javascript';
						if (IU.isIE && !IU.isOpera) {
							js.text = res;
						} else {
							js.appendChild(document.createTextNode(res));
						}			
						head.appendChild(js);				
					}
				});
			}
		}
	});
	
	/*
	IU.copy(IU, {
		requireJs: (function() {
			var require = function(module, callback) {
				var url = IU.require.resolve(module);
			
				if (IU.require.cache[url]) {
					// NOTE The callback should always be called asynchronously
					callback && setTimeout(function(){callback(IU.require.cache[url])}, 0);
					return IU.require.cache[url];
				}
			
				var exports = new Object();
				var request = new XMLHttpRequest();
				request.onreadystatechange = function() {
					if (this.readyState != 4)
						return;
					if (this.status != 200)
						throw 'Require() exception: GET '+url+' '+this.status+' ('+this.statusText+')';
			
			
					if (IU.require.cache[url]) {
						exports = IU.require.cache[url];
					}
					else if (this.getResponseHeader('Content-Type').indexOf('application/json') != -1) { 
						exports = JSON.parse(this.responseText);
						IU.require.cache[url] = exports;
					}
					else {
						IU.require.cache[url] = exports;
						var source = this.responseText.match(/^\s*(?:(['"]use strict['"])(?:;\r?\n?|\r?\n))?\s*((?:.*\r?\n?)*)/);
						eval('(function(){'+source[1]+';var exports=window.require.cache[\''+url+'\'];\n\n'+source[2]+'\n})();\n//@ sourceURL='+url+'\n');
					}
			
					callback && callback(IU.require.cache[url]);
				};
				request.open('GET', url, !!callback);
				request.send();
				return exports;
			}
			
			IU.require.resolve = function(module) {
				var r = module.match(/^(\.{0,2}\/)?([^\.]*)(\..*)?$/);
				return (r[1]?r[1]:IU.require.baseURI)+r[2]+(r[3]?r[3]:(r[2].match(/\/$/)?'index.js':'.js'));
			}
			
			IU.require.cache = new Object();		
		})(),
		
		includeJs: function(url, options) {
			var doc = document, 
				js = doc.createElement('script');
			if (!IU.includeJs.cache[url]) {
				return;
			}	
			
			IU.each(IU.copy({
				'type': 'text/javascript',
				'src' : url
			}, options), function(k, v) {
				this.setAttibute(k, v);
			}, js);
		
			IU.includeJs.cache[url] = true;	
			doc.getElementsByTagName('head')[0].appendChild(js);
		},
		
		loadJs: function (url) {
			if (IU.loadJs.cache[url]) {
				return;
			}
			
			var xhr = new XMLHttpRequest();
			
			xhr.open('get', url, false);
			xhr.send();
			if (xhr.status === 200 && xhr.getResponseHeader('Content-Type') === 'application/x-javascript') {
				var js = document.createElement('script');
				js.type = 'text/javascript';
				if (IU.isIE && !IU.isOpera) {
					js.text = xhr.responseText;
				} else {
					js.appendChild(document.createTextNode(xhr.responseText));
				}
				
				IU.loadJs.cache[url] = true;
			}
		}
		
	})
	*/
	
})(window);
