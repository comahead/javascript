var hana = hana || {}, __app__ = {};

__app__.prefix = 'hana';
hana = __app__ = (function(app){
    var has = Object.prototype.hasOwnProperty, 
		toStr = Object.prototype.toString,
		console = $.browser.ie ? {log:function(){}} : console,
		isTouch = 'ontouchstart' in document.documentElement;
    
	return {
		// 터치 디바이스 여부
		isTouch : isTouch,
		// 마우스디바이스 여부
		isMouse : !isTouch,
		// 네임스페이스 생성
		namespace : function(ns){
			var parts = ns.split("."), parent = app.prefix ? window[app.prefix] : window, i;
			for (var i = -1, item; item = parts[++i];) {
				parent = (parent[item] = parent[item] || {});
			}
			return parent;
		},
		// 속성 복사
		extend : function(p, c){
			var i;
			c = c || {};
			for (i in p) {
				if (has.call(p, i)) {
					c[i] = p[i];
				}
			}
			return c;
		},
		// 깊은 속성 복사
        extendDeep: function(p, c){
            var i;
            c = c || {};
            for (i in p) {
                if (has.call(p, i)) {
                    c[i] = toStr.call(p[i]) === '[object Array]' ? [] : {};
                    this.extendDeep(p[i], c[i]);
                }
                else {
                    c[i] = p[i];
                }
            }
            return c;
        },
        // 새로운 객체에 속성 복제
        mix: function(){
            var arg, prop, c = {};
            for (arg = -1, item; item = arguments[++arg];) {
                for (prop in item) {
                    if (has.call(item, prop)) {
                        c[prop] = item[prop];
                    }
                }
            }
            return c;
        },
		// 지정한 자릿수만큼 0으로 채우는 함수
		zeroPad: function(num, numZeros){
			numZeros = numZeros || 2;
			var n = Math.abs(num), 
				zeros = Math.max(0, numZeros - Math.floor(n).toString().length ), 
				zeroString = Math.pow(10,zeros).toString().substr(1);
			if( num < 0 ) {
					zeroString = '-' + zeroString;
			}
			return zeroString + n;
		}
    };
    
})(__app__);

(function(){
	// from John Resig
	// http://ejohn.org/blog/simple-javascript-inheritance/
    var initializing = false,
		fnTest = /xyz/.test(function(){
	        xyz;
	    }) ? /\b_super\b/ : /.*/;
    // 빈 베이스클래스 구현 
    this.Class = function(){};	
    
    Class.create = function(prop){
        var _super = this.prototype;
        initializing = true;
        var prototype = new this();
        initializing = false;
        
        for (var name in prop) {
            prototype[name] = typeof prop[name] == "function" &&
            typeof _super[name] == "function" &&
            fnTest.test(prop[name]) ? (function(name, fn){
                return function(){
                    var tmp = this._super;
                    
                    this._super = _super[name];
                    
                    var ret = fn.apply(this, arguments);
                    this._super = tmp;
                    
                    return ret;
                };
            })(name, prop[name]) : prop[name];
        }
        
        function Class(){
            if (!initializing && this.init) 
                this.init.apply(this, arguments);
        }
        
        Class.prototype = prototype;        
        Class.prototype.constructor = Class;        
        Class.extend = arguments.callee;
        
		Class.override = function(overrides){
            if(overrides){
                var p = this.prototype;
                for(var i in overrides){
					p[i] = overrides[i];
				}
            }
        }		

        return Class;
    };

	Class.statical = function(s){ return s }; 
})();


 (function(app){

	// 엘리먼트에 호버 효과 적용
	$.fn.hoverClass = function(c){
		return this.each(function(){
			var T = $(this).off('.hana');

			T.on({
				'mouseenter.hana': function(e){
					T.addClass('on');
				}, 
				'mouseleave.hana': function(e){
					T.removeClass('on');
				}
			});
		});
	};

	// 지정한 수 만큼 콜백함수 실행
	$.repeat = function(n, cb) {
		for(var i = 0; i < n; i++) {
			if(cb.call(null, i, i + 1, n) === false) return false;
		}
		return true;
	};

	// 0 ~ max사이의 now + dim(+/-1) 값
	$.nextNumber = function(max, now, dim) {
		now += dim;
		if (now >= max) {
			return 0;
		} else if (now < 0) {
			return max - 1;
		}
		return now;
	};

	// 마우스관련 이벤트 무효과
	$.fn.preventMouseEvent = function(option) {
		var o = $.extend({

		}, option);

		if (app.isTouch) {
			return this;
		}

		return this.each(function(){

			this.onclick = this.onselectstart = this.ondragstart = this.onmousedown = function(event){
				event = event || window.event;

				if ($.browser.msie && $.browser.version < 8) {
					event.returnValue=false; 
				}
				if ('preventDefault' in event) {
					event.preventDefault();
				}
				return false;
			};

			return;
		});
	};

	// 두번 바인딩이 되지 않도록 체크하기 위한 
	$.checkBuild = function(obj, name) {
		if ($(obj).data('apply-' + name)) return true;
		$(obj).data('apply-' + name, true);
		return false;
	};

 })(__app__);

 (function(app) {
	/**
	 * 갤러리 슬라이더
	 **/
 	$.fn.hanaGallerySlider = function(option) {
		var o = option = $.extend({
			onNextClick: function(idx, newIdx) {

			},
			onPrevClick: function(idx, newIdx) {

			}
		}, option);

		// 스와이프 구현
		function swipe(C){
			var P = $('>.btn_pre>a', C),
				N = $('>.btn_next>a', C);

			var swipeOptions = {
				allowPageScroll: 'vertical',
				threshold: 50,
				swipeStatus: function (event, phase, direction, distance) {
					if (phase == 'end') {
						//event.preventDefault(), event.stopPropagation();

						switch(direction){
						case "left":
							N.trigger('click');
							break;
						case "right": 
							P.trigger('click');
							break;
						}
					}
				}
			};

			C.off('.hana').on('selectstart.hana', function (e) { e.preventDefault(); }).swipe(swipeOptions);
		}

		return this.each(function(i){
			if ($.checkBuild(this, 'galleryslider')) return;

			var T = $(this),
				width = T.outerWidth(),
				height = T.outerHeight(),
				C = $('ul.viewer_list', T),
				H = C.children().css({'width': width}),
				total = H.size(),
				A = $('>.viewer_num', T),
				P = $('>.btn_pre>a', T).data('dim', -1),
				N = $('>.btn_next>a', T).data('dim', 1),
				B = P.add(N).removeClass('on'),
				current = 0,
				direction = false,
				caption = function(){
					// 현재 인덱스 표시
					A.html(['<strong>', current + 1, '</strong>', '/', '<span>', total, '</span>'].join(''));
				}, 
				rep = function(dim){
					if (C.data('animated')) return;

					var left = 0, old_current = current;
					current = $.nextNumber(total, current, dim);		

					if (dim > 0) { // <<<<<
						if (direction) {
							C.append(C.find('li:first')).css('left', 0);
						}
						left = -width, direction = true;
					} else if (dim < 0) { // >>>>>
						if (!direction) {
							C.prepend(C.find('li:last')).css('left', -width);
						}
						left = 0, direction = false;
					}

					C.data('animated', true).animate({'left': left},{
						'duration':'fast',
						'complete': function(){		
							caption();
							C.data('animated', false);
						}
					});
				};

			C.css({'width': width * total});
			caption();

			// 이미지가 하나 이하일 때는 슬라이더 기능 미구현
			if (total <= 1) {
				return B.add(N).hide(), false;
			}			

			if(app.isMouse) B.hoverClass('on');
			B.on('click', function(e){
				e.preventDefault();

				var self = $(this), dim = self.data('dim');
				rep(dim);	
				if (dim == 1) {
					o.onNextClick.call(this, current, $.nextNumber(total, current, 1));
				} else {
					o.onPrevClick.call(this, current, $.nextNumber(total, current, -1));
				}			
			});

			// 이전 버튼을 0.7초 이상 누르고 있으면 자동넘김
			app.isMouse && (function(){				
				var timer = null,
					stopTimer = function(){
						if(timer) { clearInterval(timer); timer = null; }
					};

				B.on('mousedown', function(e){
					var S = $(this),
						t = S.data('dim') == 1 ? N : P;
					stopTimer();
					timer = setInterval(function(){
						t.trigger('click');
					}, 700);
				}).on('mouseup', function(e){
					stopTimer();
				});			

				C.on('click', function(){
					stopTimer();			
				});
			})(), /*app.isTouch && */swipe($(this));

		});
	};

	/**
	 * 탭컨트롤 모듈
	 **/
	$.fn.hanaTabs = function(option) {
		option = $.extend({}, option);

		function getTabNumber(className){
			var m =  className.match(/([a-z]+)_([0-9]+)/i);
			return {
				className: m && m.length>2 ? m[0] : '',
				name: m && m.length>2 ? m[1] : '',
				num: m && m.length>2 ? parseInt(m[2]) : 1
			};
		}

		return this.each(function(i){
			if ($.checkBuild(this, 'tabs')) return;

			var $this = $(this), 
				$lis = $this.find('>ul>li.tab_m'), 
				$btns = $this.find('>ul>li.tab_m>a'), 
				$contents = $this.find('>ul>li>.ui_tab_content'),
				initTN = getTabNumber($this[0].className),
				tabNo = parseInt($this.attr('data-tab') || initTN.num) - 1;

			$lis.each(function(idx){
				var self = $(this), 
					btn = self.find('>a'), 
					content = self.find('.ui_tab_content');

				if (option.onTabsInit) {
					option.onTabsInit.call(self, idx);
				}
				btn.on('click', function(e){				
					// 탭별로 국가명_인덱스 에 해당하는 className으로 변경
					var tn = getTabNumber($this[0].className);
					tn && $this
						.removeClass(tn.className)
						.addClass(tn.name+'_'+app.zeroPad(idx+1));

					e.preventDefault(), $btns.removeClass('on'), btn.addClass('on'), $contents.hide(), content.eq(0).show();
					if(option.onTabClick){
						option.onTabClick.call($this[0], e, idx);
					}
				});
			});

			$lis.eq(tabNo).find('>a').trigger('click');
		});
	};

	$.fn.hanaGlobalTabs = $.fn.hanaTabs;

	// 페이지내에서 레이어가 단일로 표시되도록 관리 하기위한 ...
	var popupManager = app.popupManager = (function(){
		var activeDropbox = null, activeMenu = null;

		// 레이어영역 밖에서 터치/마우스다운일 때 열려있는 레이어가 닫히게 바인딩
		$(document).on('touchstart mousedown', function(e){
			var target = $(e.target);
			if (activeDropbox && target.closest(activeDropbox).size() == 0 && target.closest(activeMenu).size() == 0) {
				popupManager.hide();
			}
		});	

		return {
			hide: function(){
				activeDropbox && activeDropbox.hide();
				activeMenu && activeMenu.removeClass('on');
			},
			show: function(menu, box) {
				this.hide();
				menu && menu.addClass('on'), box && box.show();
				activeDropbox = box, activeMenu = menu;
			}
		};
	})();



	// GNB
	$.fn.hanaGNB = function(option){
		var o = $.extend({

		}, option);

		var showLayer = function(e) {

		};

		return this.each(function(){
			if ($.checkBuild(this, 'gnb')) return;

			var gnb = $(this),
				gnb_menu,
				util_menu,
				btn_sort = gnb.find('ul.btn_sort>li'),
				sub_layers = gnb.find('div.depth2_list, div.deapth2_img'),
				dropmenu_links = gnb.find('a.ui_dropmenu'),

				// 하나를 토글링하면 다른 메뉴의 타입도 토글 시킴
				toggle_all_type = function(type) {
					btn_sort.removeClass('on'), sub_layers.hide();
					btn_sort.filter('.'+type+'_type').addClass('on');

					if (type === 'img') {
						sub_layers
							.filter('.deapth2_img')
								.show()
							.parent()
								.addClass('navi_img')
								.end()						
							.find('>ul.img_type').trigger('refreshview');
					} 
					else if (type === 'list') {
						sub_layers.filter('.depth2_list').show().parent().removeClass('navi_img');						
					}
				};


			// 이미지형, 리스트형 토글
			btn_sort.find('>a').on('click', function(e) {
				e.preventDefault();

				var self = $(this), 
					li = self.parent();

				if (li.hasClass('on')) { return; }
				toggle_all_type(li.hasClass('list_type') ?'list':'img');
			});


			// pc에서는 페이지 이동, 터치에서는 레이어표시
			if (app.isTouch) {
				gnb.on('click', 'a.ui_dropmenu', function(e) {
					e.preventDefault();

					var self = $(this), 
						parent = self.parent(), 
						next = self.next(), 
						isActive = next.is(':visible');

					isActive && popupManager.hide();
					!isActive && popupManager.show(parent, next);							
				});
			} else if (app.isMouse) {
				gnb_menu = gnb.find('ul.depth1_navi');
				util_menu = gnb.find('ul.util_menu');

				// 리스트형 메뉴에 포커스가 오면 부모를 호버시킴
				gnb.find('.depth4')
					.hover(function(){ 
						$(this).parent().addClass('on'); 
					}, function(){ 
						$(this).parent().removeClass('on'); 
					});

				// 팝업 레이어 표시를 위한 바인딩
				gnb					
					.find('ul.depth1_navi .depth2_list a:last, ul.depth1_navi .deapth2_img a:last').on('keydown', function(e) {
						if (e.which == 9 && !e.shiftKey) {
							popupManager.hide();
						}
					});

				gnb.find('.util_menu a.ui_dropmenu:first').on('keydown', function(e) {
					if (e.which == 9 && e.shiftKey) {
						popupManager.hide();
					}
				});
				
				// 탭순서를 위한 키이벤트 바인딩
				gnb.find('ul.util_menu a.ui_dropmenu:last').on('keydown', function(e) {
						if (e.which == 9 && e.shiftKey) {
							var self = $(this),
								prev = self.parent().prev();
							prev.trigger('mouseenter').find('>div a:last').focus();
							e.preventDefault();
						}
					});

				gnb.find('ul.depth1_navi>li>a:eq(0)').on('keydown', function(e) {
						if (e.which == 9 && e.shiftKey) {
							gnb.find('ul.util_menu>li').trigger('mouseenter').find('>div a:last').focus();
							e.preventDefault();
						}
					});

				gnb.find('ul.depth1_navi>li>a:gt(0)').on('keydown', function(e) {
					if (e.which == 9 && e.shiftKey) {					
						var self = $(this), 
							prev = self.parent().prev(),
							layer;

						e.preventDefault();

						prev.trigger('mouseenter'), layer = prev.find('>div');
						if (layer.find('ul.btn_sort>li.on').addClass('list_type')) {
							layer.find('div.depth2_list a:last').focus();
						} else {
							layer.find('div.deapth2_img a:last').focus();
						}
					}
				})

				gnb
					.on('mouseenter mouseleave', 'li:has(>a.ui_dropmenu)', function(e) {
						var self = $(this), etype = e.type;
						switch (etype) {
						case 'mouseenter': 
							popupManager.show(self, self.find('>.ui_dropmenu').next());
							break;
						case 'mouseleave':
							popupManager.hide();
							break;	
						}
						e.preventDefault();
						e.stopPropagation();
					});

				dropmenu_links.focus(function(e) {
					var self = $(this), 
						parent = self.parent(), 
						next = self.next();
						popupManager.show(parent, next);
				});

				gnb_menu.on('movefocusend', function() {
					var last = gnb_menu.find('>li:last').trigger('mouseenter');
					alert(9);
					if (last.find('ul.btn_sort>li.on').hasClass('list_type')) {
						last.find('div.depth2_list a:last').focus();
					} else {
						last.find('div.deapth2_img a:last').focus();
					}
				});

				util_menu.on('movefocusend', function() {
					var last = util_menu.find('>li:last').trigger('mouseenter');
					last.find('>div a:last').focus();
				});

			}	// app.isMouse

			// 이미지형 메뉴 //////////////////////////////////////////////////////////////
			var img_layers = gnb.find('div.deapth2_img'),
				regex = /\{\{page\}\}/ig,
				ITEM_COUNT = 5,
				ITEM_WIDTH = 182,
				VIEW_WIDTH = ITEM_COUNT * ITEM_WIDTH;

			// 이미지 레이어들
			img_layers.each(function(iii) {
				var self = $(this),
					page_button,
					items = self.find('ul.depth3>li'),
					count = items.size(),
					pages = Math.ceil(count / ITEM_COUNT),
					navi_page = self.find('>div.navi_page'),
					pageBtns = navi_page.find('a'),
					img_panel = self.find('>ul.img_type'),
					movePage = function(page_idx) {
						img_panel.data('pageindex', page_idx);
						var showItems = [];
						items.each(function(ii){
							var btn = items.eq(ii);
							if (btn.data('page') != page_idx) {
								btn.find('>a').hide();
							} else {
								showItems.push(btn);
							}
						});
						pageBtns.removeClass('on').eq(page_idx).addClass('on');
					},

					// ul left 이동
					movingAnimate = function(page_idx, noanimate) {
						var left = -(ITEM_WIDTH * ITEM_COUNT * page_idx);

						if (noanimate === false) {
							items.find('>a').show();
							img_panel.stop().css({left: left});
							movePage(page_idx);
						} 
						else {
							if (img_panel.data('animated')) { return; }
							items.find('>a').show();
							img_panel.animate({left: left}, {complete: function() { 
								movePage(page_idx);
							}});
						}
					},

					// 끝부분에서 튕기는 효과
					swipeBouncing = function(left) {
						if (img_panel.data('animated')) { return; }
						var full_width = (pages - 1) * VIEW_WIDTH;
						img_panel.data('animated', true).animate(
							{left: left ? ITEM_WIDTH : -(full_width + ITEM_WIDTH)}, 
							{
								duration:'fast', 
								complete: function(){
									img_panel.animate({left: left ? 0 : -full_width}, {
										duration: 'fast',
										complete: function(){ img_panel.data('animated', false); }	
									});
								}
							}
						);
					};

				// img type에서 현재 아이템에 해당하는 페이지를 선택할 수 있도록 인덱스를 저장
				items.each(function(idx) {
					var m = $(this).data({index: idx, page: Math.floor(idx / ITEM_COUNT)}),
						n = (idx + 1) % ITEM_COUNT,
						isEnd = n == 0;

					// 목록의 끝에서 탭키를 눌렸을 때 다음 페이지로 이동시킨 후 첫번째 항목에 포커싱
					if (isEnd && items.length - 1 !== idx) {
						m.children().on('keydown', function(e) {
							if(e.which == 9 && !e.shiftKey) { // tab
								e.preventDefault();
								pageBtns.eq($.nextNumber(pages, m.data('page'), 1)).trigger('click', false);
								items.find('a:visible').first().focus();
							}
						});
					} else if (idx > 0 && n === 1) {
						m.children().on('keydown', function(e) {
							if(e.which == 9 && e.shiftKey) { // shift + tab
								e.preventDefault();
								pageBtns.eq($.nextNumber(pages, m.data('page'), -1)).trigger('click', false);
								items.find('a:visible').last().focus();
							}
						});
					}
				});

				// 페이징버튼 이벤트 바인딩
				pageBtns.each(function(idx) {
					var a = $(this);
					a.on('click', function(e, doAnimate) {
						e.preventDefault();
						a.siblings().removeClass('on').end().addClass('on');
						movingAnimate(idx, doAnimate);
					});
				}).eq(0).addClass('on');


				img_panel
					.swipe({
						allowPageScroll: 'vertical',
						threshold: 50,
						swipeStatus: function (event, phase, direction, distance) {
							if (phase == 'end') {
								var idx = img_panel.data('pageindex') || 0;
								event.preventDefault(), event.stopPropagation();
								switch(direction){
								case "left":
									if ((idx = idx  + 1) >= pages) {
										swipeBouncing(false);
										return;
									}
									movingAnimate(idx);
									break;
								case "right": 
									if ((idx = idx  - 1) < 0) {
										swipeBouncing(true);
										return;
									}
									movingAnimate(idx);
									break;
								}
							}
						}
					})
					.on('refreshview', function(){
						movePage($(this).data('pageindex') || 0);
					})
					.find('li:has(>a[data-pagecode])').on('selectItem', function(){
						var idx = $(this).data('index');
						items.filter('.on').removeClass('on').end().eq(idx).addClass('on');
						img_panel.data('pageindex', Math.floor(idx / ITEM_COUNT));
						movingAnimate(Math.floor(idx / ITEM_COUNT), false);
					});

			});
			//////////////////////////////////////////////////////////////////////////////

			setTimeout(function(){
				// 현재 페이지에 해당하는 메뉴를 활성화
				if(o.pageCode){
					for(var i = 1, ln = Math.ceil(o.pageCode.length / 2); i <= ln; i++) {
						var code = o.pageCode.substring(0, i * 2);
						gnb.find('a[data-pagecode="'+code+'"]').parent().addClass('change').trigger('selectItem')
					}
				}
				// 언어 선택
				gnb.find('ul.network_list.lang>li[data-lang="'+o.pageLang+'"]').addClass('on');
			}, 25);

		});
	};

	/**
	 * 로케이션
	 **/
	$.fn.hanaLocation = function(option) {
		var o = option;
		return this.each(function() {
			if ($.checkBuild(this, 'location')) return;

			var self = $(this), menus = self.find('ul.location_wrap>li');

			if (app.isMouse) {
				menus
					.on('mouseleave', function() {
						popupManager.hide();
					})
					.find('>a')
						.on('mouseenter focus',  function() {
							popupManager.show(null, $(this).next());
						});

				menus.find('a:last').on('keydown', function(e) {
					if (e.which == 9 && !e.shiftKey){
						popupManager.hide();
					}
				});

				self.find('ul.location_wrap').on('movefocusend', function() {
					self.find('ul.location_wrap').find('>li:last>div.menu_layer').show().find('a:last').focus();
				});

				loc.find('ul.location_wrap>li>a.more:gt(0)').on('keydown', function(e) {
					if (e.which == 9 && e.shiftKey) {
						var self = $(this), 
							prev = self.parent().prev(),
							layer = prev.find('div');
						e.preventDefault();

						prev.find('>a').trigger('mouseenter');
						layer.find('a:last').focus();
					}
				});
			}

			menus
				.find('>a')
				.on('click', function(e){
					e.preventDefault();

					var self = $(this), next = self.next(), isview = next.is(':visible');
					popupManager.hide();
					if (!isview) {
						popupManager.show(null, next);
					}
				});

				if(o.pageCode){
					for(var i = 1, ln = Math.ceil(o.pageCode.length / 2); i <= ln; i++) {
						var code = o.pageCode.substring(0, i * 2);
						self.find('a[data-pagecode="'+code+'"]').parent().addClass('change');
					}
				}
		});
	};

	/**
	 * 팝업레이어의 기본 옵션값
	 **/
	var popupDefault = {
		overlay: {
		   "position": "absolute", 
			"left":0, 
			"top":0, 
			'opacity':0.7, 
			'backgroundColor':'#000000'
		},
		position: {
		   my: "center",
		   at: "center",
		   of: window
		},
		create: function(dialog){
			if(dialog.data('created')) return dialog;

			dialog
				.data('created', true)
				.dialog({ autoOpen: false, modal: true })
				.css({top:'-200px', left:'-50px'})
				.off('dialogopen.hana dialogoutfocus.hana')
				.on('dialogopen.hana', function(){
					$("div.ui-widget-overlay").css(popupDefault.overlay);
				})
				.on('dialogoutfocus.hana', function(){
					dialog.find('a.ui_dialog_close').focus();
				})
				.find('>div.laypop')
					.css('zIndex', 1005)
					.end()
				.find('a.ui_dialog_close')
					.off('click.hana')
					.on('click.hana', function(e){ 
						e.preventDefault(); 						
						dialog.dialog('close');
					})
					.end()
				.parent()
				.find('a.ui-dialog-titlebar-close').hide();
			return dialog;
		}
	};

	// 팝업레이어가 a태그와 같은 위치에 있을 때 이 메소드를 사용
	$.fn.hanaInlineVideo = function(option) {
		var o = $.extend({
			width: 780
		}, option);

		return this.each(function(){
			if ($.checkBuild(this, 'inlinevideo')) return;

			var self = $(this);

			self.on('click', function(e) {
				e.preventDefault();
				if (o.onLinkClick && o.onLinkClick.call(this, self.next()) === false) return false;;

				var dialog = popupDefault.create(self.next().clone());
				dialog
					.on('dialogclose', function(){
						dialog.dialog('destroy').remove();
						self.focus();
					})
					.dialog('open')
					.css({'width':o.width})
					.position(popupDefault.position);
			});
		});
	};

	/**
	 * 팝업레이어 형식의 동영상 플레이어
	 **/
	$.fn.hanaVideo = function(option){
		var o = option = $.extend({
			width: 780
		}, option);


		return this.each(function(){
			if ($.checkBuild(this, 'video')) return;

			$(this).on('click', 'a.ui_layer_link', function(e){
				e.preventDefault();

				var link = $(this),
					dialog = popupDefault.create($(o.dialog || 'div.ui_dialog').clone()),
					media = $('.ui_dialog_media', dialog),
					title = $('p.ui_dialog_title',  dialog),
					content = $('span.ui_dialog_content', dialog),
					close = $('.ui_dialog_close', dialog),
					showDialog = function() {
						dialog					
							.on('dialogclose.hana', function(){
								dialog.off('dialogclose.hana');
								dialog.dialog('destroy').remove();
								link && link.focus(), link = null;
							})
							.dialog('open')
							.css({'width':o.width})
							.position(popupDefault.position);
					},
					setMediaData = function(json){
						media.attr({'src': json['url'], 'title': json['title']});
						title.html(json['title']);
						content.html(json['content']);
						showDialog();
					};

				if(o.onLinkClick) {
					if(o.onLinkClick.call(link, dialog) !== false) {
						// 콜백함수 안에서 다이얼로그에 내용을 채워야 한다.
						showDialog();
					}
				} else if (o.setMediaData) {
					// 콜백함수에서 json형식으로 데이타를 반환
					setMediaData(o.setMediaData.call(this));
				} else {
					// 기본포맷으로 태깅되어 있을 경우
					var data = link.next();
					if (data.length > 0)  {
						setMediaData({
							url: data.find('>span>a').attr('href'),
							title: data.find('dt').html(),
							content: data.find('dd').html()
						});
					}
				}
			});
		});
	};

	/**
	 * 팝업레이어 형식의 갤러리 모듈
	 **/
	$.fn.hanaGallery = function(option){
		var o = option = $.extend({
			width:810
		}, option);

		var $win = $(window),
			$doc = $(document),
			$link = null,
			$dialog = popupDefault.create($(o.dialog || 'div.ui_dialog')),
			$media = $('.ui_dialog_media', $dialog),
			$title = $('p.ui_dialog_title', $dialog),
			$content = $('span.ui_dialog_content', $dialog),
			$popup = $('a.ui_dialog_popup', $dialog),
			setMediaData = function(json){
				$dialog.dialog('open')
					.css({'width': o.width})
					.position(popupDefault.position)
					.parent()
						.next(".ui-widget-overlay")
							.css(popupDefault.overlay);

				$dialog.find('>div.laypop').css('zIndex', 1005);
				$media.attr({'src': json['url'], 'alt': json['title']});
				$title.html(json['title']);
				$content.html(json['content']);
				$popup.attr('href', json['original']);
			};

		$dialog.off('dialogclose.hana')
			.on('dialogclose.hana', function(){
				$link && $link.focus(), $link = null;
			});

		return this.each(function(){
			if ($.checkBuild(this, 'gallery')) return;

			$(this).delegate('a.ui_layer_link', 'click', function(e){
				$link = $(this);
				var $data = $link.siblings('div'), $btn = $data.find('>span>a');
				setMediaData({
					'url':$btn.attr('href'), 
					'original': $btn.attr('data-original'),
					'title': $data.find('dt').html(), 
					'content': $data.find('dd').html()
				});
				e.preventDefault();
			});
		});
	};

	/**
	 * SNS 공유하기 위한 팝업 오픈
	 **/
	$.fn.hanaShare = function(option){

		return this.each(function(){
			if ($.checkBuild(this, 'share')) return;

			var $this = $(this);

			$this.find('>a').each(function(){
					var type = this.className.replace('btn_', '');
					$(this).off('.hana').on('click.hana', function(e){
						e.preventDefault();

						switch(type){
						case 'facebook':
							window.open("http://www.facebook.com/sharer.php?u="+encodeURIComponent(location.href)+"", "", 'height=440, width=620, scrollbars=auto');
							break;
						case 'twitter':
							var targetUrl = "http://twitter.com/share?url="+encodeURIComponent(location.href)+"&text="+encodeURIComponent(document.title);
							window.open(targetUrl, "", 'height=440, width=620, scrollbars=auto');
							break;
						case 'me2day':
							var targetUrl  = "http://me2day.net/posts/new?new_post[body]="+encodeURIComponent(document.title+' '+location.href);
							window.open(targetUrl, "",'');
							break;
						case 'linked':
							var targetUrl = "http://www.linkedin.com/cws/share?isFramed=false&lang=ko_KR&url="+encodeURIComponent(location.href)+"&original_referer="+encodeURIComponent(location.href)+"&token=&_ts=1348633878478%2E025#state=&from_login=true";
							window.open(targetUrl, "",'height=440, width=620, scrollbars=auto');
							break;
						}
					});
				});
		});
	};

	/**
	 * 숨겨져 있는 영역을 쵸시하기 위한 더보기 모듈
	 **/
	$.fn.hanaStaticMore = function(option){
		var o = $.extend({}, option);

		function trigger(en) {
			if(o['on'+en]) return o['on'+en];
			return function() {}
		}

		this.each(function(){
			if ($.checkBuild(this, 'staticmore')) return;

			var self = $(this),
				content = $(self.data('content'));

			self.on('click', function(e){
				self.parent().animate({height: 0}, {complete: function(){ self.parent().hide(); }});
				if(trigger('beforeload').call(self, content) === false) return;
				content.show();
				trigger('load').call(self, content);
				e.preventDefault();
			});

		});
	}


})(__app__);

(function(app) {
	// 메인페이지의 상단 큰 배너
	$.fn.hanaMainBanner = function(option) {
		var o = $.extend({
			control:'', 
			interval: 10000
		}, option);

		return this.each(function() {
			if ($.checkBuild(this, 'mainbanner')) return;

			var self = $(this),
				banners = self.find('>div'),
				items = banners.find('a'),
				control = $(o.control),
				wrapper = control.find('>div.control_wrap'),
				txt_tmpl = control.attr('data-tmpl'),
				tmpl = '<p class="tab_banner"><a href="#{{index}}"><span class="none">'+txt_tmpl+'</span></a></p>',
				tabs = null,
				oplay = wrapper.find('p.btn_play>a'),
				ostop = wrapper.find('p.btn_stop>a'),
				current = 0,
				interval = o.interval,
				count = banners.length,
				timer = null,

				isPlay = false,
				oldStatus = false,

				stopTimer = function() {
					if (timer) {
						clearInterval(timer);
						timer = null;
					}
				},

				play = function() {
					if(timer){ return; }
					isPlay = true;
					togglePlayButton(true);
					timer = setInterval(function() {
						change(nextNum(1));
					}, interval);
				},

				nextNum = function(dim) {
					var c = current + dim;
					if (c < 0) { return count - 1; }
					if (c >= count) { return 0; }
					return c;
				},

				stop = function() {
					isPlay = false;
					stopTimer(), togglePlayButton(false);
				},

				togglePlayButton = function(play) {
					ostop.parent()[play?'show':'hide']();
					oplay.parent()[play?'hide':'show']();
				},

				toggleButton = function() {
					wrapper.find('>p.tab_banner').removeClass('on').eq(current).addClass('on');
				},

				change = function(idx) {
					if (idx === current || banners.eq(current).data('animated')) { return; }

					var b = banners.filter(':visible');				
					banners.eq(idx).data('animated', true).fadeIn('slow', function(){ $(this).data('animated', false); });
					b.fadeOut('slow', function(){ $(this).data('animated', false); });

					current = idx, toggleButton();
				};

			if (banners.length <= 1) {
				wrapper.hide();
				return;
			}

			if( !txt_tmpl) {
				alert('not exist control_tmpl!!');
			}

			banners.removeClass('on').filter(':gt(0)').hide();			
			wrapper.find('>p.tab_banner').remove();

			$.repeat(count, function(idx, num) {
				var btn = $(tmpl.replace(/{{index}}/gi, idx + 1));
				wrapper.append(btn.data('index', idx));

				if (idx == 0) { btn.addClass('on'); }
				btn.on('click', function(e) {
					e.preventDefault();

					if($(this).hasClass('on')) return;
					stopTimer(), change($(this).data('index'));
				});
			});
			tabs = wrapper.find('>.tab_banner>a');

			oplay.on('click', function(e) {
				e.preventDefault();
				play(), ostop.focus();
			});

			ostop.on('click', function(e) {
				e.preventDefault();
				stop(), oplay.focus();
			});

			if (app.isMouse) {
				items.preventMouseEvent();

				self.on('mouseenter focus mouseleave blur', 'a', function(e){ 
					oldStatus = isPlay;
					switch(e.type) {
						case 'mouseenter':
						case 'focusin':
							oldStatus = isPlay, stopTimer();
							break;
						case 'mouseleave':
						case 'fousout':
							oldStatus && play();
							break
					}
				});
			}

			banners.find('a').swipe({
					allowPageScroll: 'vertical',
					threshold: 50,
					click: function(e, target, distance){
						var self = $(this), target = self.attr('target');
						if (target == '_blank') {
							window.open(self.attr('href'));
						} else {
							location.href = self.attr('href');
						}
					},
					swipeStatus: function (event, phase, direction, distance) {
						if (phase == 'end') {	
							stopTimer();
							switch(direction){
							case "left":
								tabs.eq(nextNum(1)).trigger('click');
								break;
							case "right": 
								tabs.eq(nextNum(-1)).trigger('click');
								break;
							}
						}
					}
				});

			play();
		});
	};

})(__app__);

(function(app) {
	// 슬라이더형 배너
	$.fn.hanaBannerSlider = function(option) {
		var o = $.extend({
			interval: 10000,
			autoPlay: true
		}, option);

		return this.each(function() {
			if ($.checkBuild(this, 'bannerslider')) return;

			var self = $(this),
				BANNER_WIDTH = self.width(),
				controls = self.find('>div.btn_control'),
				btnStart = controls.find('>a.btn_start'),
				btnStop = controls.find('>a.btn_stop'),
				bannerBox = self.find('>ul.ui_banner_list').css({'position': 'absolute'}),
				pageBox = self.find('>p.page_num'),
				items = bannerBox.find('>li'),
				total = items.length,
				left = 0,
				current = 0,
				interval = o.interval,
				isPlay = false,
				direction = false,

				outerHidden = function(now) {
					bannerBox.find('a').each(function(idx) {
						if (idx != now) {
							$(this).css('visibility', 'hidden');
						}
					});
				},
				caption = function() {
					var childs = pageBox.children();
					childs.last().text(total);	
					return function(page){
						childs.first().text(page);
					};
				}(),
				movePage = function(dim) {
					if (bannerBox.data('animated')) {
						return;
					}		

					var showIdx = 0;
					current = $.nextNumber(total, current, dim);

					bannerBox.find('a').css('visibility', 'visible');
					if(dim > 0) {
						if (direction) {
							bannerBox.append(bannerBox.find('li:first')).css('left', 0);
						}
						left = -BANNER_WIDTH, showIdx = 1;
						direction = true;
					} else if (dim < 0) {
						if (!direction) {
							bannerBox.prepend(bannerBox.find('li:last')).css('left', -BANNER_WIDTH);							
						}
						left = 0, showIdx = 0;
						direction = false;
					}

					bannerBox.data('animated', true).animate({left: left}, {
						'duration': 'fast',
						'complete': function() {
							caption(current + 1);
							outerHidden(showIdx);
							bannerBox.data('animated', false);
						}
					});
				},
				timer = null,
				stopTimer = function() {
					if(timer) {
						clearInterval(timer);
						timer = null;
					}
				},
				start = function(dim) {
					if(timer) return;
					isPlay = true, btnStart.hide(), btnStop.show();
					timer = setInterval(function() {
						movePage(dim);
					}, interval);
				},
				stop = function() {
					isPlay = false, btnStop.hide(), btnStart.show();
					stopTimer();
				};

			bannerBox.css('width', BANNER_WIDTH * total);
			if (total <= 1) {
				controls.hide();
				return;
			}


			var oldStatus = false;
			if (app.isMouse) {
				bannerBox.on('mouseenter focus mouseleave blur', 'a', function(e) {
					switch(e.type) {
						case 'mouseenter':
						case 'focusin':
							oldStatus = isPlay, stopTimer();
							$(this).children().attr('src', function() {
								return this.src.replace(/_off\.png$/i, '_over.png');
							});
							break;
						case 'mouseleave':
						case 'focusout':
							oldStatus && start(1);
							$(this).children().attr('src', function() {
								return this.src.replace(/_over\.png$/i, '_off.png');
							});
							break;
					}
				})
				.find('a').each(function(idx) {
					$(this).data('index', idx).attr('data-index', idx);
				});
			}

			controls.on('click', 'a', function(e) {
				e.preventDefault(), oldStatus = isPlay;
				var btn = $(this);

				if (btn.hasClass('btn_pre')){
					stopTimer(), movePage(-1), oldStatus && start(1);
				} else if (btn.hasClass('btn_next')) {
					stopTimer(), movePage(1), oldStatus && start(1);
				} else if (btn.hasClass('btn_start')) {
					start(1), btnStop.focus();
				} else if (btn.hasClass('btn_stop')) {
					stop(), btnStart.focus();
				}
			});

			// 보일때만 작동하도록
			self.on('start', function(){
				start(1);
			}).on('stop', function(){
				stop();
			});

			items.each(function(){
				var self = $(this);
				self.find('img, a').preventMouseEvent();
			}).swipe({
				allowPageScroll: 'vertical',
				click: function(e, target, distance){
					var self = $(this), a = self.find('a'), target = a.attr('target');
					if (target == '_blank') {
							window.open(a.attr('href'));
					} else {
						location.href = a.attr('href');
					}
				},
				swipeStatus: function (event, phase, direction, distance) {
					if (phase == 'end') {	
						//event.preventDefault(), event.stopPropagation();

						stopTimer();
						switch(direction){
						case "left":
							movePage(1), isPlay && start(1);
							break;
						case "right": 
							movePage(-1), isPlay && start(1);
							break;
						}
					}
				}
			});

			o.autoPlay && start(1);
			outerHidden(0);
		});
	};

})(__app__);

(function(app) {
	// 메인페이지의 컨텐츠 슬라이더
	$.fn.hanaMainSlider = function(option) {
		var o = option,
			MAIN_WIDTH = 1024,
			oldMenu = 0;

		return this.each(function() {
			if ($.checkBuild(this, 'mainslider')) return;

			var self = $(this),
				parts = self.find('>ul>li'),
				btns = parts.find('>p>a').each(function(idx){ $(this).data('index', idx); }),
				boxes = self.find('div.main_con'),
				total = boxes.length,
				current = 0,
				activeMenu = function(btn) {
					btns.removeClass('on'), btn.addClass('on');
				},
				pos = [[0, -1024, -2048], [1024, 0, -1024], [2048, 1024, 0]];

			boxes.each(function(idx){ 
				var box = $(this);
				box.show().css({left: 1024 * idx});
			});

			function animate(idx) {
				current = idx;

				$.repeat(boxes.length, function(i) {
					boxes.eq(i).show().animate({left: pos[i][idx]}, {complete: function(){ 
						if (idx !== i) {
							$(this).hide();
						}
					}});
				});
			};

			btns.on('click', function(e){
				e.preventDefault();

				var btn = $(this);
				if (btn.hasClass('on')) {
					return;
				}

				animate(btn.data('index')), activeMenu(btn);
			});

			// 외부에서 호출할 수 있도록 이벤트를 바인딩
			self.on('swipeLeft', function() {
				btns.eq(Math.min(current + 1, total - 1)).trigger('click');
			});

			self.on('swipeRight', function() {
				btns.eq(Math.max(current - 1, 0)).trigger('click');
			});

			animate(0);
		});
	};

})(__app__);


$(function(){
	var app = __app__;

	// 터치디바이스일 때 body에 ui_touch 클래스를 추가
	app.isTouch && $(document.body).addClass('ui_touch');

	var gnb = $('#gnb'),
		loc = $('#location_wrap');

	// 현재페이지의 메뉴를 활성화시키기 위해 페이지코드와 국가코드를 넘김
	var option = {
		pageCode: (typeof pageCode == 'undefined' ? '' : pageCode),
		pageLang: (typeof pageLang == 'undefined' ? 'KO' : pageLang)
	};

	// GNB
	gnb.hanaGNB(option);
	loc.hanaLocation(option);

	// 대다수의 페이지에 공유하기 버튼이 존재하기에 강제로 바인딩
	$('div.sns_wrap').hanaShare();

	if (app.isMouse) {


		// 탭키
		loc.find('ul.location_wrap>li>a.more:eq(0)').on('keydown', function(e) {
			if (e.which == 9 && e.shiftKey) {
				e.preventDefault();
				gnb.find('ul.depth1_navi').trigger('movefocusend');
			}
		});

		$('#contents').find(':focusable:first').on('focus', function() {
			app.popupManager.hide();
		}).on('keydown', function(e) {
			if (e.which == 9 && e.shiftKey) {
				if (loc.size() > 0) {
					e.preventDefault();
					loc.find('ul.location_wrap').trigger('movefocusend');
					return;
				}
				if (gnb.size() > 0) {
					e.preventDefault();
					gnb.find('ul.depth1_navi').trigger('movefocusend');
				}
			}
		});

		$('#main_content').find('.control_wrap a:lt(2)').on('focus', function() {
			app.popupManager.hide();
		}).on('keydown', function(e) {
			if (e.which == 9 && e.shiftKey) {
				if (loc.size() > 0) {
					e.preventDefault();
					loc.find('ul.location_wrap').trigger('movefocusend');
					return;
				}
				alert('?');
				if (gnb.size() > 0) {
					e.preventDefault();
					alert(88);
					gnb.find('ul.depth1_navi').trigger('movefocusend');
				}			
			}
		});
	}
});