(function () {
    var h = void 0,
        i = !0,
        j = null,
        n = !1,
        s, t = this;

    function aa(a) {
        for (var a = a.split("."), b = t, c; c = a.shift();) if (b[c] != j) b = b[c];
        else return j;
        return b
    }

    function u(a) {
        var b = typeof a;
        if ("object" == b) if (a) {
            if (a instanceof Array) return "array";
            if (a instanceof Object) return b;
            var c = Object.prototype.toString.call(a);
            if ("[object Window]" == c) return "object";
            if ("[object Array]" == c || "number" == typeof a.length && "undefined" != typeof a.splice && "undefined" != typeof a.propertyIsEnumerable && !a.propertyIsEnumerable("splice")) return "array";
            if ("[object Function]" == c || "undefined" != typeof a.call && "undefined" != typeof a.propertyIsEnumerable && !a.propertyIsEnumerable("call")) return "function"
        } else return "null";
        else if ("function" == b && "undefined" == typeof a.call) return "object";
        return b
    }
    function ba(a) {
        var b = u(a);
        return "array" == b || "object" == b && "number" == typeof a.length
    }
    function v(a) {
        return "string" == typeof a
    }
    function ca(a) {
        var b = typeof a;
        return "object" == b && a != j || "function" == b
    }
    function w(a) {
        return a[da] || (a[da] = ++ea)
    }
    var da = "closure_uid_" + Math.floor(2147483648 * Math.random())
        .toString(36),
        ea = 0,
        fa = Date.now || function () {
            return +new Date
        };

    function ga(a, b) {
        var c = a.split("."),
            d = t;
        !(c[0] in d) && d.execScript && d.execScript("var " + c[0]);
        for (var e; c.length && (e = c.shift());)!c.length && b !== h ? d[e] = b : d = d[e] ? d[e] : d[e] = {}
    }
    function x(a, b) {
        function c() {}
        c.prototype = b.prototype;
        a.u = b.prototype;
        a.prototype = new c
    };

    function ha(a) {
        if (!ia.test(a)) return a; - 1 != a.indexOf("&") && (a = a.replace(ja, "&amp;")); - 1 != a.indexOf("<") && (a = a.replace(ka, "&lt;")); - 1 != a.indexOf(">") && (a = a.replace(la, "&gt;")); - 1 != a.indexOf('"') && (a = a.replace(ma, "&quot;"));
        return a
    }
    var ja = /&/g,
        ka = /</g,
        la = />/g,
        ma = /\"/g,
        ia = /[&<>\"]/;
    var z = Array.prototype,
        A = z.indexOf ? function (a, b, c) {
            return z.indexOf.call(a, b, c)
        } : function (a, b, c) {
            c = c == j ? 0 : 0 > c ? Math.max(0, a.length + c) : c;
            if (v(a)) return !v(b) || 1 != b.length ? -1 : a.indexOf(b, c);
            for (; c < a.length; c++) if (c in a && a[c] === b) return c;
            return -1
        }, na = z.forEach ? function (a, b, c) {
            z.forEach.call(a, b, c)
        } : function (a, b, c) {
            for (var d = a.length, e = v(a) ? a.split("") : a, f = 0; f < d; f++) f in e && b.call(c, e[f], f, a)
        }, oa = z.filter ? function (a, b, c) {
            return z.filter.call(a, b, c)
        } : function (a, b, c) {
            for (var d = a.length, e = [], f = 0, g = v(a) ? a.split("") : a, k = 0; k < d; k++) if (k in g) {
                var m = g[k];
                b.call(c, m, k, a) && (e[f++] = m)
            }
            return e
        };

    function pa(a, b) {
        var c = A(a, b);
        0 <= c && z.splice.call(a, c, 1)
    }
    function qa(a, b, c) {
        return 2 >= arguments.length ? z.slice.call(a, b) : z.slice.call(a, b, c)
    };
    var ra;

    function sa(a) {
        a = a.className;
        return v(a) && a.match(/\S+/g) || []
    }
    function B(a, b) {
        for (var c = sa(a), d = qa(arguments, 1), e = c.length + d.length, f = c, g = 0; g < d.length; g++) 0 <= A(f, d[g]) || f.push(d[g]);
        a.className = c.join(" ");
        return c.length == e
    }
    function ua(a, b) {
        var c = sa(a),
            d = qa(arguments, 1),
            c = oa(c, function (a) {
                return !(0 <= A(d, a))
            });
        a.className = c.join(" ")
    };

    function C(a, b) {
        this.x = a !== h ? a : 0;
        this.y = b !== h ? b : 0
    }
    C.prototype.H = function () {
        return new C(this.x, this.y)
    };

    function va(a, b) {
        this.width = a;
        this.height = b
    }
    va.prototype.H = function () {
        return new va(this.width, this.height)
    };
    va.prototype.floor = function () {
        this.width = Math.floor(this.width);
        this.height = Math.floor(this.height);
        return this
    };

    function wa(a, b) {
        for (var c in a) b.call(h, a[c], c, a)
    }
    var xa = "constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");

    function ya(a, b) {
        for (var c, d, e = 1; e < arguments.length; e++) {
            d = arguments[e];
            for (c in d) a[c] = d[c];
            for (var f = 0; f < xa.length; f++) c = xa[f], Object.prototype.hasOwnProperty.call(d, c) && (a[c] = d[c])
        }
    };
    var D, za, Aa, Ba;

    function Ca() {
        return t.navigator ? t.navigator.userAgent : j
    }
    Ba = Aa = za = D = n;
    var Da;
    if (Da = Ca()) {
        var Ea = t.navigator;
        D = 0 == Da.indexOf("Opera");
        za = !D && -1 != Da.indexOf("MSIE");
        Aa = !D && -1 != Da.indexOf("WebKit");
        Ba = !D && !Aa && "Gecko" == Ea.product
    }
    var Fa = D,
        E = za,
        F = Ba,
        G = Aa,
        Ga = t.navigator,
        Ha = -1 != (Ga && Ga.platform || "")
            .indexOf("Mac"),
        Ia;
    a: {
        var Ja = "",
            Ka;
        if (Fa && t.opera) var La = t.opera.version,
            Ja = "function" == typeof La ? La() : La;
        else if (F ? Ka = /rv\:([^\);]+)(\)|;)/ : E ? Ka = /MSIE\s+([^\);]+)(\)|;)/ : G && (Ka = /WebKit\/(\S+)/), Ka) var Ma = Ka.exec(Ca()),
            Ja = Ma ? Ma[1] : "";
        if (E) {
            var Na, Oa = t.document;
            Na = Oa ? Oa.documentMode : h;
            if (Na > parseFloat(Ja)) {
                Ia = String(Na);
                break a
            }
        }
        Ia = Ja
    }
    var Pa = Ia,
        Qa = {};

    function H(a) {
        var b;
        if (!(b = Qa[a])) {
            b = 0;
            for (var c = String(Pa)
                .replace(/^[\s\xa0]+|[\s\xa0]+$/g, "")
                .split("."), d = String(a)
                .replace(/^[\s\xa0]+|[\s\xa0]+$/g, "")
                .split("."), e = Math.max(c.length, d.length), f = 0; 0 == b && f < e; f++) {
                var g = c[f] || "",
                    k = d[f] || "",
                    m = RegExp("(\\d*)(\\D*)", "g"),
                    p = RegExp("(\\d*)(\\D*)", "g");
                do {
                    var r = m.exec(g) || ["", "", ""],
                        l = p.exec(k) || ["", "", ""];
                    if (0 == r[0].length && 0 == l[0].length) break;
                    b = ((0 == r[1].length ? 0 : parseInt(r[1], 10)) < (0 == l[1].length ? 0 : parseInt(l[1], 10)) ? -1 : (0 == r[1].length ? 0 : parseInt(r[1],
                    10)) > (0 == l[1].length ? 0 : parseInt(l[1], 10)) ? 1 : 0) || ((0 == r[2].length) < (0 == l[2].length) ? -1 : (0 == r[2].length) > (0 == l[2].length) ? 1 : 0) || (r[2] < l[2] ? -1 : r[2] > l[2] ? 1 : 0)
                } while (0 == b)
            }
            b = Qa[a] = 0 <= b
        }
        return b
    }
    var Ra = {};

    function I(a) {
        return Ra[a] || (Ra[a] = E && !! document.documentMode && document.documentMode >= a)
    };
    var Sa = !E || I(9);
    !F && !E || E && I(9) || F && H("1.9.1");
    E && H("9");

    function J(a) {
        return a ? new Ta(K(a)) : ra || (ra = new Ta)
    }
    function Ua(a, b) {
        var c = b || document;
        c.querySelectorAll && c.querySelector ? c = c.querySelector("." + a) : (c = b || document, c = (c.querySelectorAll && c.querySelector ? c.querySelectorAll("." + a) : c.getElementsByClassName ? c.getElementsByClassName(a) : Va("*", a, b))[0]);
        return c || j
    }

    function Va(a, b, c) {
        var d = document,
            c = c || d,
            a = a && "*" != a ? a.toUpperCase() : "";
        if (c.querySelectorAll && c.querySelector && (a || b)) return c.querySelectorAll(a + (b ? "." + b : ""));
        if (b && c.getElementsByClassName) {
            c = c.getElementsByClassName(b);
            if (a) {
                for (var d = {}, e = 0, f = 0, g; g = c[f]; f++) a == g.nodeName && (d[e++] = g);
                d.length = e;
                return d
            }
            return c
        }
        c = c.getElementsByTagName(a || "*");
        if (b) {
            d = {};
            for (f = e = 0; g = c[f]; f++) a = g.className, "function" == typeof a.split && 0 <= A(a.split(/\s+/), b) && (d[e++] = g);
            d.length = e;
            return d
        }
        return c
    }
    var Wa = {
        cellpadding: "cellPadding",
        cellspacing: "cellSpacing",
        colspan: "colSpan",
        frameborder: "frameBorder",
        height: "height",
        maxlength: "maxLength",
        role: "role",
        rowspan: "rowSpan",
        type: "type",
        usemap: "useMap",
        valign: "vAlign",
        width: "width"
    };

    function Xa(a, b, c) {
        var d = arguments,
            e = document,
            f = d[0],
            g = d[1];
        if (!Sa && g && (g.name || g.type)) {
            f = ["<", f];
            g.name && f.push(' name="', ha(g.name), '"');
            if (g.type) {
                f.push(' type="', ha(g.type), '"');
                var k = {};
                ya(k, g);
                delete k.type;
                g = k
            }
            f.push(">");
            f = f.join("")
        }
        f = e.createElement(f);
        if (g) if (v(g)) f.className = g;
        else if ("array" == u(g)) B.apply(j, [f].concat(g));
        else {
            var m = f;
            wa(g, function (a, b) {
                "style" == b ? m.style.cssText = a : "class" == b ? m.className = a : "for" == b ? m.htmlFor = a : b in Wa ? m.setAttribute(Wa[b], a) : 0 == b.lastIndexOf("aria-",
                0) || 0 == b.lastIndexOf("data-", 0) ? m.setAttribute(b, a) : m[b] = a
            })
        }
        if (2 < d.length) for (var p = e, r = f, e = function (a) {
            a && r.appendChild(v(a) ? p.createTextNode(a) : a)
        }, g = 2; g < d.length; g++) {
            var l = d[g];
            if (ba(l) && !(ca(l) && 0 < l.nodeType)) {
                var k = na,
                    q;
                a: {
                    if ((q = l) && "number" == typeof q.length) {
                        if (ca(q)) {
                            q = "function" == typeof q.item || "string" == typeof q.item;
                            break a
                        }
                        if ("function" == u(q)) {
                            q = "function" == typeof q.item;
                            break a
                        }
                    }
                    q = n
                }
                if (q) if (q = l.length, 0 < q) {
                    for (var y = Array(q), ta = 0; ta < q; ta++) y[ta] = l[ta];
                    l = y
                } else l = [];
                k(l, e)
            } else e(l)
        }
        return f
    }

    function Ya(a, b) {
        if (a.contains && 1 == b.nodeType) return a == b || a.contains(b);
        if ("undefined" != typeof a.compareDocumentPosition) return a == b || Boolean(a.compareDocumentPosition(b) & 16);
        for (; b && a != b;) b = b.parentNode;
        return b == a
    }
    function K(a) {
        return 9 == a.nodeType ? a : a.ownerDocument || a.document
    }
    function Ta(a) {
        this.a = a || t.document || document
    }
    Ta.prototype.createElement = function (a) {
        return this.a.createElement(a)
    };

    function Za(a) {
        var b = a.a,
            a = !G && "CSS1Compat" == b.compatMode ? b.documentElement : b.body,
            b = b.parentWindow || b.defaultView;
        return new C(b.pageXOffset || a.scrollLeft, b.pageYOffset || a.scrollTop)
    }
    Ta.prototype.contains = Ya;

    function $a(a) {
        $a[" "](a);
        return a
    }
    $a[" "] = function () {};
    var ab = !E || I(9),
        bb = !E || I(9),
        cb = E && !H("9");
    !G || H("528");
    F && H("1.9b") || E && H("8") || Fa && H("9.5") || G && H("528");
    F && !H("8") || E && H("9");

    function L() {}
    L.prototype.R = n;
    L.prototype.C = function () {
        this.R || (this.R = i, this.k())
    };
    L.prototype.k = function () {
        this.ja && db.apply(j, this.ja);
        if (this.ga) for (; this.ga.length;) this.ga.shift()()
    };

    function db(a) {
        for (var b = 0, c = arguments.length; b < c; ++b) {
            var d = arguments[b];
            ba(d) ? db.apply(j, d) : d && "function" == typeof d.C && d.C()
        }
    };

    function M(a, b) {
        this.type = a;
        this.a = this.o = b
    }
    M.prototype.C = function () {};
    M.prototype.c = n;
    M.prototype.d = i;
    M.prototype.n = function () {
        this.d = n
    };

    function eb(a, b) {
        a && this.init(a, b)
    }
    x(eb, M);
    var fb = [1, 4, 2];
    s = eb.prototype;
    s.o = j;
    s.clientX = 0;
    s.clientY = 0;
    s.L = n;
    s.w = j;
    s.init = function (a, b) {
        var c = this.type = a.type;
        M.call(this, c);
        this.o = a.target || a.srcElement;
        this.a = b;
        if ((c = a.relatedTarget) && F) try {
            $a(c.nodeName)
        } catch (d) {}
        this.clientX = a.clientX !== h ? a.clientX : a.pageX;
        this.clientY = a.clientY !== h ? a.clientY : a.pageY;
        this.L = a.ctrlKey;
        this.w = a;
        a.defaultPrevented && this.n();
        delete this.c
    };

    function gb(a) {
        return ab ? 0 == a.w.button : "click" == a.type ? i : !! (a.w.button & fb[0])
    }
    s.n = function () {
        eb.u.n.call(this);
        var a = this.w;
        if (a.preventDefault) a.preventDefault();
        else if (a.returnValue = n, cb) try {
            if (a.ctrlKey || 112 <= a.keyCode && 123 >= a.keyCode) a.keyCode = -1
        } catch (b) {}
    };

    function hb() {}
    var ib = 0;
    s = hb.prototype;
    s.key = 0;
    s.v = n;
    s.ca = n;
    s.init = function (a, b, c, d, e, f) {
        if ("function" == u(a)) this.a = i;
        else if (a && a.handleEvent && "function" == u(a.handleEvent)) this.a = n;
        else throw Error("Invalid listener argument");
        this.F = a;
        this.b = b;
        this.src = c;
        this.type = d;
        this.capture = !! e;
        this.N = f;
        this.ca = n;
        this.key = ++ib;
        this.v = n
    };
    s.handleEvent = function (a) {
        return this.a ? this.F.call(this.N || this.src, a) : this.F.handleEvent.call(this.F, a)
    };
    var N = {}, O = {}, P = {}, Q = {};

    function R(a, b, c, d, e) {
        if (b) {
            if ("array" == u(b)) {
                for (var f = 0; f < b.length; f++) R(a, b[f], c, d, e);
                return j
            }
            var d = !! d,
                g = O;
            b in g || (g[b] = {
                j: 0,
                i: 0
            });
            g = g[b];
            d in g || (g[d] = {
                j: 0,
                i: 0
            }, g.j++);
            var g = g[d],
                k = w(a),
                m;
            g.i++;
            if (g[k]) {
                m = g[k];
                for (f = 0; f < m.length; f++) if (g = m[f], g.F == c && g.N == e) {
                    if (g.v) break;
                    return m[f].key
                }
            } else m = g[k] = [], g.j++;
            var p = jb,
                r = bb ? function (a) {
                    return p.call(r.src, r.key, a)
                } : function (a) {
                    a = p.call(r.src, r.key, a);
                    if (!a) return a
                }, f = r;
            f.src = a;
            g = new hb;
            g.init(c, f, a, b, d, e);
            c = g.key;
            f.key = c;
            m.push(g);
            N[c] = g;
            P[k] || (P[k] = []);
            P[k].push(g);
            a.addEventListener ? (a == t || !a.da) && a.addEventListener(b, f, d) : a.attachEvent(b in Q ? Q[b] : Q[b] = "on" + b, f);
            return c
        }
        throw Error("Invalid event type");
    }
    function S(a, b, c, d, e) {
        if ("array" == u(b)) for (var f = 0; f < b.length; f++) S(a, b[f], c, d, e);
        else {
            d = !! d;
            a: {
                f = O;
                if (b in f && (f = f[b], d in f && (f = f[d], a = w(a), f[a]))) {
                    a = f[a];
                    break a
                }
                a = j
            }
            if (a) for (f = 0; f < a.length; f++) if (a[f].F == c && a[f].capture == d && a[f].N == e) {
                kb(a[f].key);
                break
            }
        }
    }

    function kb(a) {
        if (!N[a]) return n;
        var b = N[a];
        if (b.v) return n;
        var c = b.src,
            d = b.type,
            e = b.b,
            f = b.capture;
        c.removeEventListener ? (c == t || !c.da) && c.removeEventListener(d, e, f) : c.detachEvent && c.detachEvent(d in Q ? Q[d] : Q[d] = "on" + d, e);
        c = w(c);
        P[c] && (e = P[c], pa(e, b), 0 == e.length && delete P[c]);
        b.v = i;
        if (b = O[d][f][c]) b.ea = i, lb(d, f, c, b);
        delete N[a];
        return i
    }

    function lb(a, b, c, d) {
        if (!d.J && d.ea) {
            for (var e = 0, f = 0; e < d.length; e++) d[e].v ? d[e].b.src = j : (e != f && (d[f] = d[e]), f++);
            d.length = f;
            d.ea = n;
            0 == f && (delete O[a][b][c], O[a][b].j--, 0 == O[a][b].j && (delete O[a][b], O[a].j--), 0 == O[a].j && delete O[a])
        }
    }
    function mb(a, b, c, d, e) {
        var f = 1,
            b = w(b);
        if (a[b]) {
            a.i--;
            a = a[b];
            a.J ? a.J++ : a.J = 1;
            try {
                for (var g = a.length, k = 0; k < g; k++) {
                    var m = a[k];
                    m && !m.v && (f &= nb(m, e) !== n)
                }
            } finally {
                a.J--, lb(c, d, b, a)
            }
        }
        return Boolean(f)
    }
    function nb(a, b) {
        a.ca && kb(a.key);
        return a.handleEvent(b)
    }

    function jb(a, b) {
        if (!N[a]) return i;
        var c = N[a],
            d = c.type,
            e = O;
        if (!(d in e)) return i;
        var e = e[d],
            f, g;
        if (!bb) {
            f = b || aa("window.event");
            var k = i in e,
                m = n in e;
            if (k) {
                if (0 > f.keyCode || f.returnValue != h) return i;
                a: {
                    var p = n;
                    if (0 == f.keyCode) try {
                        f.keyCode = -1;
                        break a
                    } catch (r) {
                        p = i
                    }
                    if (p || f.returnValue == h) f.returnValue = i
                }
            }
            p = new eb;
            p.init(f, this);
            f = i;
            try {
                if (k) {
                    for (var l = [], q = p.a; q; q = q.parentNode) l.push(q);
                    g = e[i];
                    g.i = g.j;
                    for (var y = l.length - 1; !p.c && 0 <= y && g.i; y--) p.a = l[y], f &= mb(g, l[y], d, i, p);
                    if (m) {
                        g = e[n];
                        g.i = g.j;
                        for (y = 0; !p.c && y < l.length && g.i; y++) p.a = l[y], f &= mb(g, l[y], d, n, p)
                    }
                } else f = nb(c, p)
            } finally {
                l && (l.length = 0)
            }
            return f
        }
        d = new eb(b, this);
        return f = nb(c, d)
    };

    function T() {}
    x(T, L);
    s = T.prototype;
    s.da = i;
    s.M = j;
    s.addEventListener = function (a, b, c, d) {
        R(this, a, b, c, d)
    };
    s.removeEventListener = function (a, b, c, d) {
        S(this, a, b, c, d)
    };
    s.dispatchEvent = function (a) {
        var b = a.type || a,
            c = O;
        if (b in c) {
            if (v(a)) a = new M(a, this);
            else if (a instanceof M) a.o = a.o || this;
            else {
                var d = a,
                    a = new M(b, this);
                ya(a, d)
            }
            var d = 1,
                e, c = c[b],
                b = i in c,
                f;
            if (b) {
                e = [];
                for (f = this; f; f = f.M) e.push(f);
                f = c[i];
                f.i = f.j;
                for (var g = e.length - 1; !a.c && 0 <= g && f.i; g--) a.a = e[g], d &= mb(f, e[g], a.type, i, a) && a.d != n
            }
            if (n in c) if (f = c[n], f.i = f.j, b) for (g = 0; !a.c && g < e.length && f.i; g++) a.a = e[g], d &= mb(f, e[g], a.type, n, a) && a.d != n;
            else for (e = this; !a.c && e && f.i; e = e.M) a.a = e, d &= mb(f, e, a.type, n, a) && a.d != n;
            a = Boolean(d)
        } else a = i;
        return a
    };
    s.k = function () {
        T.u.k.call(this);
        var a, b = 0,
            c = a == j;
        a = !! a;
        if (this == j) wa(P, function (d) {
            for (var e = d.length - 1; 0 <= e; e--) {
                var f = d[e];
                if (c || a == f.capture) kb(f.key), b++
            }
        });
        else {
            var d = w(this);
            if (P[d]) for (var d = P[d], e = d.length - 1; 0 <= e; e--) {
                var f = d[e];
                if (c || a == f.capture) kb(f.key), b++
            }
        }
        this.M = j
    };

    function U(a, b, c, d) {
        this.top = a;
        this.right = b;
        this.bottom = c;
        this.left = d
    }
    U.prototype.H = function () {
        return new U(this.top, this.right, this.bottom, this.left)
    };
    U.prototype.contains = function (a) {
        return !this || !a ? n : a instanceof U ? a.left >= this.left && a.right <= this.right && a.top >= this.top && a.bottom <= this.bottom : a.x >= this.left && a.x <= this.right && a.y >= this.top && a.y <= this.bottom
    };

    function ob(a, b, c, d) {
        this.left = a;
        this.top = b;
        this.width = c;
        this.height = d
    }
    ob.prototype.H = function () {
        return new ob(this.left, this.top, this.width, this.height)
    };
    ob.prototype.contains = function (a) {
        return a instanceof ob ? this.left <= a.left && this.left + this.width >= a.left + a.width && this.top <= a.top && this.top + this.height >= a.top + a.height : a.x >= this.left && a.x <= this.left + this.width && a.y >= this.top && a.y <= this.top + this.height
    };

    function pb(a, b) {
        var c = K(a);
        return c.defaultView && c.defaultView.getComputedStyle && (c = c.defaultView.getComputedStyle(a, j)) ? c[b] || c.getPropertyValue(b) || "" : ""
    }
    function qb(a, b) {
        return pb(a, b) || (a.currentStyle ? a.currentStyle[b] : j) || a.style && a.style[b]
    }
    function rb(a) {
        var b = a.getBoundingClientRect();
        E && (a = a.ownerDocument, b.left -= a.documentElement.clientLeft + a.body.clientLeft, b.top -= a.documentElement.clientTop + a.body.clientTop);
        return b
    }

    function sb(a) {
        if (E && !I(8)) return a.offsetParent;
        for (var b = K(a), c = qb(a, "position"), d = "fixed" == c || "absolute" == c, a = a.parentNode; a && a != b; a = a.parentNode) if (c = qb(a, "position"), d = d && "static" == c && a != b.documentElement && a != b.body, !d && (a.scrollWidth > a.clientWidth || a.scrollHeight > a.clientHeight || "fixed" == c || "absolute" == c || "relative" == c)) return a;
        return j
    }

    function tb(a) {
        var b, c = K(a),
            d = qb(a, "position"),
            e = F && c.getBoxObjectFor && !a.getBoundingClientRect && "absolute" == d && (b = c.getBoxObjectFor(a)) && (0 > b.screenX || 0 > b.screenY),
            f = new C(0, 0),
            g;
        b = c ? K(c) : document;
        if (g = E) if (g = !I(9)) g = "CSS1Compat" != J(b)
            .a.compatMode;
        g = g ? b.body : b.documentElement;
        if (a == g) return f;
        if (a.getBoundingClientRect) b = rb(a), a = Za(J(c)), f.x = b.left + a.x, f.y = b.top + a.y;
        else if (c.getBoxObjectFor && !e) b = c.getBoxObjectFor(a), a = c.getBoxObjectFor(g), f.x = b.screenX - a.screenX, f.y = b.screenY - a.screenY;
        else {
            e = a;
            do {
                f.x += e.offsetLeft;
                f.y += e.offsetTop;
                e != a && (f.x += e.clientLeft || 0, f.y += e.clientTop || 0);
                if (G && "fixed" == qb(e, "position")) {
                    f.x += c.body.scrollLeft;
                    f.y += c.body.scrollTop;
                    break
                }
                e = e.offsetParent
            } while (e && e != a);
            if (Fa || G && "absolute" == d) f.y -= c.body.offsetTop;
            for (e = a;
            (e = sb(e)) && e != c.body && e != g;) if (f.x -= e.scrollLeft, !Fa || "TR" != e.tagName) f.y -= e.scrollTop
        }
        return f
    }

    function ub(a) {
        if ("none" != qb(a, "display")) return vb(a);
        var b = a.style,
            c = b.display,
            d = b.visibility,
            e = b.position;
        b.visibility = "hidden";
        b.position = "absolute";
        b.display = "inline";
        a = vb(a);
        b.display = c;
        b.position = e;
        b.visibility = d;
        return a
    }
    function vb(a) {
        var b = a.offsetWidth,
            c = a.offsetHeight,
            d = G && !b && !c;
        return (b === h || d) && a.getBoundingClientRect ? (a = rb(a), new va(a.right - a.left, a.bottom - a.top)) : new va(b, c)
    }

    function wb(a, b) {
        if (/^\d+px?$/.test(b)) return parseInt(b, 10);
        var c = a.style.left,
            d = a.runtimeStyle.left;
        a.runtimeStyle.left = a.currentStyle.left;
        a.style.left = b;
        var e = a.style.pixelLeft;
        a.style.left = c;
        a.runtimeStyle.left = d;
        return e
    };

    function xb(a) {
        this.b = a;
        this.a = []
    }
    x(xb, L);
    var yb = [];

    function zb(a, b, c, d, e) {
        "array" != u(c) && (yb[0] = c, c = yb);
        for (var f = 0; f < c.length; f++) {
            var g = R(b, c[f], d || a, e || n, a.b || a);
            a.a.push(g)
        }
    }
    function Ab(a) {
        na(a.a, kb);
        a.a.length = 0
    }
    xb.prototype.k = function () {
        xb.u.k.call(this);
        Ab(this)
    };
    xb.prototype.handleEvent = function () {
        throw Error("EventHandler.handleEvent not implemented");
    };

    function Bb(a, b, c) {
        this.c = a;
        this.d = b || a;
        this.l = c || new ob(NaN, NaN, NaN, NaN);
        this.b = K(a);
        this.a = new xb(this);
        R(this.d, ["touchstart", "mousedown"], this.K, n, this)
    }
    x(Bb, T);
    var Cb = E || F && H("1.9.3");
    s = Bb.prototype;
    s.clientX = 0;
    s.clientY = 0;
    s.Z = 0;
    s.$ = 0;
    s.s = 0;
    s.t = 0;
    s.q = n;
    s.k = function () {
        Bb.u.k.call(this);
        S(this.d, ["touchstart", "mousedown"], this.K, n, this);
        Ab(this.a);
        Cb && this.b.releaseCapture();
        this.a = this.d = this.c = j
    };
    s.K = function (a) {
        var b = "mousedown" == a.type;
        if (!this.q && (!b || gb(a) && (!G || !Ha || !a.L))) {
            if (Db(a), this.dispatchEvent(new V("start", this, a.clientX, a.clientY))) {
                this.q = i;
                a.n();
                var b = this.b,
                    c = b.documentElement,
                    d = !Cb;
                zb(this.a, b, ["touchmove", "mousemove"], this.ia, d);
                zb(this.a, b, ["touchend", "mouseup"], this.G, d);
                Cb ? (c.setCapture(n), zb(this.a, c, "losecapture", this.G)) : zb(this.a, b ? b.parentWindow || b.defaultView : window, "blur", this.G);
                this.g && zb(this.a, this.g, "scroll", this.Y, d);
                this.clientX = this.Z = a.clientX;
                this.clientY = this.$ = a.clientY;
                this.s = this.c.offsetLeft;
                this.t = this.c.offsetTop;
                this.e = Za(J(this.b));
                fa()
            }
        } else this.dispatchEvent("earlycancel")
    };
    s.G = function (a, b) {
        Ab(this.a);
        Cb && this.b.releaseCapture();
        if (this.q) {
            Db(a);
            this.q = n;
            var c = Eb(this, this.s),
                d = Fb(this, this.t);
            this.dispatchEvent(new V("end", this, a.clientX, a.clientY, 0, c, d, b || "touchcancel" == a.type))
        } else this.dispatchEvent("earlycancel");
        ("touchend" == a.type || "touchcancel" == a.type) && a.n()
    };

    function Db(a) {
        var b = a.type;
        "touchstart" == b || "touchmove" == b ? a.init(a.w.targetTouches[0], a.a) : ("touchend" == b || "touchcancel" == b) && a.init(a.w.changedTouches[0], a.a)
    }
    s.ia = function (a) {
        Db(a);
        var b = 1 * (a.clientX - this.clientX),
            c = a.clientY - this.clientY;
        this.clientX = a.clientX;
        this.clientY = a.clientY;
        if (!this.q) {
            var d = this.Z - this.clientX,
                e = this.$ - this.clientY;
            if (0 < d * d + e * e) if (this.dispatchEvent(new V("start", this, a.clientX, a.clientY))) this.q = i;
            else {
                this.R || this.G(a);
                return
            }
        }
        c = Gb(this, b, c);
        b = c.x;
        c = c.y;
        this.q && this.dispatchEvent(new V("beforedrag", this, a.clientX, a.clientY, 0, b, c)) && (Hb(this, a, b, c), a.n())
    };

    function Gb(a, b, c) {
        var d = Za(J(a.b)),
            b = b + (d.x - a.e.x),
            c = c + (d.y - a.e.y);
        a.e = d;
        a.s += b;
        a.t += c;
        b = Eb(a, a.s);
        a = Fb(a, a.t);
        return new C(b, a)
    }
    s.Y = function (a) {
        var b = Gb(this, 0, 0);
        a.clientX = this.clientX;
        a.clientY = this.clientY;
        Hb(this, a, b.x, b.y)
    };

    function Hb(a, b, c, d) {
        a.c.style.left = c + "px";
        a.c.style.top = d + "px";
        a.dispatchEvent(new V("drag", a, b.clientX, b.clientY, 0, c, d))
    }
    function Eb(a, b) {
        var c = a.l,
            d = !isNaN(c.left) ? c.left : j,
            c = !isNaN(c.width) ? c.width : 0;
        return Math.min(d != j ? d + c : Infinity, Math.max(d != j ? d : -Infinity, b))
    }

    function Fb(a, b) {
        var c = a.l,
            d = !isNaN(c.top) ? c.top : j,
            c = !isNaN(c.height) ? c.height : 0;
        return Math.min(d != j ? d + c : Infinity, Math.max(d != j ? d : -Infinity, b))
    }
    function V(a, b, c, d, e, f, g, k) {
        M.call(this, a);
        this.clientX = c;
        this.clientY = d;
        this.left = f !== h ? f : b.s;
        this.top = g !== h ? g : b.t;
        this.b = !! k
    }
    x(V, M);

    function W() {
        this.D = [];
        this.ba = [];
        this.z = []
    }
    x(W, T);
    s = W.prototype;
    s.O = n;
    s.P = n;
    s.S = n;
    s.init = function () {
        if (!this.S) {
            for (var a, b = 0; a = this.D[b]; b++) Ib(this, a);
            this.S = i
        }
    };

    function Ib(a, b) {
        a.O && (R(b.a, "mousedown", b.e, n, b), a.I && B(b.a, a.I));
        a.P && a.Q && B(b.a, a.Q)
    }
    function Jb(a) {
        for (var b, c = 0; b = a.D[c]; c++) {
            var d = a;
            d.O && (S(b.a, "mousedown", b.e, n, b), d.I && ua(b.a, d.I));
            d.P && d.Q && ua(b.a, d.Q);
            b.C()
        }
        a.D.length = 0
    }

    function Kb(a) {
        a.l = [];
        for (var b, c = 0; b = a.ba[c]; c++) for (var d, e = 0; d = b.D[e]; e++) for (var f = a, g = b, k = [d.a], m = f.l, p = 0; p < k.length; p++) {
            var r = k[p],
                l = tb(r),
                q = ub(r),
                l = new U(l.y, l.x + q.width, l.y + q.height, l.x);
            m.push(new Lb(l, g, d, r));
            Mb(f, l)
        }
        a.d || (a.d = new U(0, 0, 0, 0))
    }
    s.U = function (a) {
        var b = a.b ? j : this.e;
        if (b && b.p) {
            var c = a.clientX,
                a = a.clientY,
                d = Za(J(this.g)),
                e = c + d.x,
                d = a + d.y;
            this.B && this.B(b.m, b.f, e, d);
            this.dispatchEvent(new X("drag", this, this.b, 0, b.m, 0, c, a));
            b.p.dispatchEvent(new X("drop", this, this.b, 0, b.m, 0, c, a))
        }
        this.dispatchEvent(new X("dragend", this, this.b));
        S(this.c, "drag", this.V, n, this);
        S(this.c, "end", this.U, n, this);
        S(K(this.b.r)
            .body, "selectstart", this.W);
        for (b = 0; c = this.z[b]; b++) S(c.h, "scroll", this.T, n, this), c.a = [];
        this.c.C();
        (b = this.g) && b.parentNode && b.parentNode.removeChild(b);
        delete this.b;
        delete this.g;
        delete this.c;
        delete this.l;
        delete this.e
    };
    s.V = function (a) {
        var b, c = Za(J(this.g));
        b = new C(a.clientX + c.x, a.clientY + c.y);
        var c = b.x,
            d = b.y,
            e = this.e,
            f;
        if (e) {
            this.B && e.p && (f = this.B(e.m, e.f, c, d));
            if (e.f.contains(b) && f == this.ha) return;
            e.p && (this.dispatchEvent(new X("dragout", this, this.b, 0, e.m)), e.p.dispatchEvent(new X("dragout", this, this.b, 0, e.m, 0, h, h)));
            this.ha = f;
            this.e = j
        }
        if (this.d.contains(b)) {
            a: {
                for (var g = 0; e = this.l[g]; g++) if (e.f.contains(b)) if (e.A) {
                    if (e.A.f.contains(b)) {
                        b = e;
                        break a
                    }
                } else {
                    b = e;
                    break a
                }
                b = j
            }
            if ((e = this.e = b) && e.p) this.B && (f = this.B(e.m,
            e.f, c, d)),
            c = new X("dragover", this, this.b, 0, e.m),
            c.l = f,
            this.dispatchEvent(c),
            e.p.dispatchEvent(new X("dragover", this, this.b, 0, e.m, 0, a.clientX, a.clientY));
            else if (!e) {
                this.a || (this.a = new Lb(this.d.H()));
                a = this.a.f;
                a.top = this.d.top;
                a.right = this.d.right;
                a.bottom = this.d.bottom;
                a.left = this.d.left;
                for (f = 0; e = this.l[f]; f++) b = e.f, e.A && (e = e.A.f, b = new U(Math.max(b.top, e.top), Math.min(b.right, e.right), Math.min(b.bottom, e.bottom), Math.max(b.left, e.left))), e = j, c >= b.right ? e = b.right > a.left ? b.right : a.left : c < b.left && (e = b.left < a.right ? b.left : a.right), g = j, d >= b.bottom ? g = b.bottom > a.top ? b.bottom : a.top : d < b.top && (g = b.top < a.bottom ? b.top : a.bottom), e !== j && g !== j && (Math.abs(e - c) > Math.abs(g - d) ? g = j : e = j), e === j ? g !== j && (g <= d ? a.top = g : a.bottom = g) : e <= c ? a.left = e : a.right = e;
                this.e = 10 <= (a.right - a.left) * (a.bottom - a.top) ? this.a : j
            }
        }
    };
    s.W = function () {
        return n
    };
    s.T = function (a) {
        for (var b = 0, c; c = this.z[b]; b++) if (a.o == c.h) {
            var d = c.c - c.h.scrollTop,
                e = c.b - c.h.scrollLeft;
            c.c = c.h.scrollTop;
            c.b = c.h.scrollLeft;
            this.a && this.e == this.a && (0 < d ? this.a.f.top += d : this.a.f.bottom += d, 0 < e ? this.a.f.left += e : this.a.f.right += e);
            for (var f = 0, g; g = c.a[f]; f++) g = g.f, g.top += d, g.left += e, g.bottom += d, g.right += e, Mb(this, g)
        }
        this.c.Y(a)
    };
    s.X = function (a) {
        a: {
            var b = a.cloneNode(i);
            switch (a.tagName.toLowerCase()) {
            case "tr":
                a = Xa("table", j, Xa("tbody", j, b));
                break a;
            case "td":
            case "th":
                a = Xa("table", j, Xa("tbody", j, Xa("tr", j, b)));
                break a;
            default:
                a = b
            }
        }
        this.fa && B(a, this.fa);
        return a
    };

    function Mb(a, b) {
        if (1 == a.l.length) a.d = new U(b.top, b.right, b.bottom, b.left);
        else {
            var c = a.d;
            c.left = Math.min(b.left, c.left);
            c.right = Math.max(b.right, c.right);
            c.top = Math.min(b.top, c.top);
            c.bottom = Math.max(b.bottom, c.bottom)
        }
    }
    s.k = function () {
        W.u.k.call(this);
        Jb(this)
    };

    function X(a, b, c, d, e, f, g, k) {
        M.call(this, a);
        this.g = b;
        this.b = c;
        this.e = e;
        this.clientX = g;
        this.clientY = k
    }
    x(X, M);

    function Y(a, b) {
        this.a = v(a) ? document.getElementById(a) : a;
        this.data = b;
        this.g = j;
        if (!this.a) throw Error("Invalid argument");
    }
    x(Y, T);
    Y.prototype.r = j;
    Y.prototype.e = function (a) {
        if (gb(a) && (!G || !Ha || !a.L)) {
            var b = a.o;
            b && (R(b, "mousemove", this.b, n, this), R(b, "mouseout", this.b, n, this), R(b, "mouseup", this.c, n, this), this.r = b, this.d = new C(a.clientX, a.clientY), a.n())
        }
    };
    Y.prototype.b = function (a) {
        var b = this.r,
            c = "mouseout" == a.type && a.o == b;
        if (5 < Math.abs(a.clientX - this.d.x) + Math.abs(a.clientY - this.d.y) || c) if (S(b, "mousemove", this.b, n, this), S(b, "mouseout", this.b, n, this), S(b, "mouseup", this.c, n, this), b = this.g, !b.b) if (b.b = this, b.dispatchEvent(new X("dragstart", b, b.b)) == n) b.b = j;
        else {
            var d = this.r;
            b.g = b.X(d);
            c = K(d);
            c.body.appendChild(b.g);
            var e;
            e = b.g;
            var f = tb(d),
                g;
            if (E) {
                g = wb(d, d.currentStyle ? d.currentStyle.marginLeft : j);
                var k = wb(d, d.currentStyle ? d.currentStyle.marginRight : j),
                    m = wb(d, d.currentStyle ? d.currentStyle.marginTop : j),
                    d = wb(d, d.currentStyle ? d.currentStyle.marginBottom : j);
                g = new U(m, k, d, g)
            } else g = pb(d, "marginLeft"), k = pb(d, "marginRight"), m = pb(d, "marginTop"), d = pb(d, "marginBottom"), g = new U(parseFloat(m), parseFloat(k), parseFloat(d), parseFloat(g));
            f.x -= 2 * (g.left || 0);
            f.y -= 2 * (g.top || 0);
            e.style.position = "absolute";
            e.style.left = f.x + "px";
            e.style.top = f.y + "px";
            e = new Bb(e);
            b.c = e;
            b.c.g = b.ka;
            R(b.c, "drag", b.V, n, b);
            R(b.c, "end", b.U, n, b);
            R(c.body, "selectstart", b.W);
            Kb(b);
            for (e = 0; c = b.z[e]; e++) c.a = [], c.b = c.h.scrollLeft, c.c = c.h.scrollTop, f = tb(c.h), g = ub(c.h), c.f = new U(f.y, f.x + g.width, f.y + g.height, f.x);
            for (e = 0; g = b.l[e]; e++) for (f = 0; c = b.z[f]; f++) Ya(c.h, g.h) && (c.a.push(g), g.A = c);
            b.e = j;
            for (e = 0; c = b.z[e]; e++) R(c.h, "scroll", b.T, n, b);
            b.c.K(a);
            a.n()
        }
    };
    Y.prototype.c = function () {
        var a = this.r;
        S(a, "mousemove", this.b, n, this);
        S(a, "mouseout", this.b, n, this);
        S(a, "mouseup", this.c, n, this);
        delete this.d;
        this.r = j
    };

    function Lb(a, b, c, d) {
        this.f = a;
        this.p = b;
        this.m = c;
        this.h = d
    }
    Lb.prototype.A = j;

    function Nb() {
        W.call(this)
    }
    x(Nb, W);

    function Z() {
        this.a = [];
        this.c = {}
    }
    x(Z, L);
    Z.prototype.e = 1;
    Z.prototype.d = 0;
    Z.prototype.g = function (a, b) {
        var c = this.c[a];
        if (c) {
            this.d++;
            for (var d = qa(arguments, 1), e = 0, f = c.length; e < f; e++) {
                var g = c[e];
                this.a[g + 1].apply(this.a[g + 2], d)
            }
            this.d--;
            if (this.b && 0 == this.d) for (; c = this.b.pop();) if (0 != this.d) this.b || (this.b = []), this.b.push(c);
            else if (d = this.a[c])(d = this.c[d]) && pa(d, c), delete this.a[c], delete this.a[c + 1], delete this.a[c + 2]
        }
    };
    Z.prototype.k = function () {
        Z.u.k.call(this);
        delete this.a;
        delete this.c;
        delete this.b
    };
    var Ob = aa("yt.dom.getNextId_");
    if (!Ob) {
        Ob = function () {
            return ++Pb
        };
        ga("yt.dom.getNextId_", Ob);
        var Pb = 0
    }
    function Qb(a) {
        var b = a.cloneNode(n);
        "TR" == b.tagName || "SELECT" == b.tagName ? na(a.childNodes, function (a) {
            b.appendChild(Qb(a))
        }) : b.innerHTML = a.innerHTML;
        return b
    };
    var Rb, Sb;

    function Tb() {
        W.call(this)
    }
    x(Tb, Nb);
    Tb.prototype.X = function (a) {
        var b;
        if (b = Rb) b: {
            for (var c = 0; a;) {
                var d = h;
                if (!(d = !b)) d = sa(a), d = 0 <= A(d, b);
                if (d) {
                    b = a;
                    break b
                }
                a = a.parentNode;
                c++
            }
            b = j
        } else b = j;
        (a = Ua("playlist-bar-item-exp", b)) || (a = Ua("video-thumb", b));
        b = Qb(v(a) ? document.getElementById(a) : a);
        b.removeAttribute("id");
        B(b, "playlist-bar-dragging-item");
        return b
    };
    var $ = new Z,
        Ub = j;

    function Vb(a) {
        B(a.b.a, "playlist-bar-drag-source-dragged")
    }

    function Wb(a) {
        var b = a.b.data.sourceIndex,
            c = a.b.data.aa;
        ua(a.b.a, "playlist-bar-drag-source-dragged");
        0 <= c && $.g("DROPPED_AT_INDEX", {
            sourceIndex: b,
            targetIndex: c
        })
    }

    function Xb(a) {
        if (a.clientX !== h) {
            var b = a.b.a,
                c = j;
            a.e && (c = a.e.a);
            var d = Va(j, Rb, Sb),
                e = A(d, b),
                d = A(d, c);
            b != c && c && (b.parentNode ? (b && b.parentNode && b.parentNode.removeChild(b), d > e ? c.parentNode && c.parentNode.insertBefore(b, c.nextSibling) : c.parentNode && c.parentNode.insertBefore(b, c)) : c.parentNode && c.parentNode.insertBefore(b, c), Kb(a.g));
            a.b.data.aa = d
        }
    };
    ga("yt.www.lists.dragdrop.init", function (a, b) {
        Sb = a;
        Rb = b;
        var c = new Tb;
        c.init();
        c.I = "playlist-bar-drag-source";
        c.fa = "playlist-bar-drag-target";
        R(c, "dragover", Xb);
        R(c, "dragstart", Vb);
        R(c, "dragend", Wb);
        Ub = c
    });
    ga("yt.www.lists.dragdrop.createDraggables", function () {
        var a = Ub;
        Jb(a);
        a.ba.push(a);
        a.P = i;
        a.O = i;
        var b = Va(j, Rb, Sb);
        na(b, function (b, d) {
            var e = new Y(b, {
                sourceIndex: d,
                aa: d
            });
            e.g = a;
            a.D.push(e);
            a.S && Ib(a, e)
        })
    });
    ga("yt.www.lists.dragdrop.subscribe", function (a, b, c) {
        var d = $.c[a];
        d || (d = $.c[a] = []);
        var e = $.e;
        $.a[e] = a;
        $.a[e + 1] = b;
        $.a[e + 2] = c;
        $.e = e + 3;
        d.push(e)
    });
})();