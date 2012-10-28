(function () {
    var h = void 0,
        k = !0,
        l = null,
        p = !1,
        r, s = this;

    function aa(a) {
        for (var a = a.split("."), b = s, c; c = a.shift();) if (b[c] != l) b = b[c];
        else return l;
        return b
    }
    function ba(a) {
        a.getInstance = function () {
            return a.ea ? a.ea : a.ea = new a
        }
    }

    function ca(a) {
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
    function t(a) {
        return a !== h
    }
    function da(a) {
        return "array" == ca(a)
    }
    function u(a) {
        return "string" == typeof a
    }
    var ea = "closure_uid_" + Math.floor(2147483648 * Math.random())
        .toString(36),
        fa = 0;

    function ga(a, b, c) {
        return a.call.apply(a.bind, arguments)
    }

    function ia(a, b, c) {
        if (!a) throw Error();
        if (2 < arguments.length) {
            var d = Array.prototype.slice.call(arguments, 2);
            return function () {
                var c = Array.prototype.slice.call(arguments);
                Array.prototype.unshift.apply(c, d);
                return a.apply(b, c)
            }
        }
        return function () {
            return a.apply(b, arguments)
        }
    }
    function v(a, b, c) {
        v = Function.prototype.bind && -1 != Function.prototype.bind.toString()
            .indexOf("native code") ? ga : ia;
        return v.apply(l, arguments)
    }
    var ja = Date.now || function () {
            return +new Date
        };

    function y(a, b) {
        var c = a.split("."),
            d = s;
        !(c[0] in d) && d.execScript && d.execScript("var " + c[0]);
        for (var e; c.length && (e = c.shift());)!c.length && t(b) ? d[e] = b : d = d[e] ? d[e] : d[e] = {}
    }
    function ka(a, b) {
        function c() {}
        c.prototype = b.prototype;
        a.$ = b.prototype;
        a.prototype = new c
    }
    Function.prototype.bind = Function.prototype.bind || function (a, b) {
        if (1 < arguments.length) {
            var c = Array.prototype.slice.call(arguments, 1);
            c.unshift(this, a);
            return v.apply(l, c)
        }
        return v(this, a)
    };

    function la(a, b) {
        for (var c = 1; c < arguments.length; c++) var d = String(arguments[c])
            .replace(/\$/g, "$$$$"),
            a = a.replace(/\%s/, d);
        return a
    }
    function ma(a) {
        if (!na.test(a)) return a; - 1 != a.indexOf("&") && (a = a.replace(oa, "&amp;")); - 1 != a.indexOf("<") && (a = a.replace(pa, "&lt;")); - 1 != a.indexOf(">") && (a = a.replace(qa, "&gt;")); - 1 != a.indexOf('"') && (a = a.replace(ra, "&quot;"));
        return a
    }
    var oa = /&/g,
        pa = /</g,
        qa = />/g,
        ra = /\"/g,
        na = /[&<>\"]/;
    var z = Array.prototype,
        sa = z.indexOf ? function (a, b, c) {
            return z.indexOf.call(a, b, c)
        } : function (a, b, c) {
            c = c == l ? 0 : 0 > c ? Math.max(0, a.length + c) : c;
            if (u(a)) return !u(b) || 1 != b.length ? -1 : a.indexOf(b, c);
            for (; c < a.length; c++) if (c in a && a[c] === b) return c;
            return -1
        }, A = z.forEach ? function (a, b, c) {
            z.forEach.call(a, b, c)
        } : function (a, b, c) {
            for (var d = a.length, e = u(a) ? a.split("") : a, f = 0; f < d; f++) f in e && b.call(c, e[f], f, a)
        }, ta = z.filter ? function (a, b, c) {
            return z.filter.call(a, b, c)
        } : function (a, b, c) {
            for (var d = a.length, e = [], f = 0, g = u(a) ? a.split("") : a, i = 0; i < d; i++) if (i in g) {
                var j = g[i];
                b.call(c, j, i, a) && (e[f++] = j)
            }
            return e
        }, ua = z.map ? function (a, b, c) {
            return z.map.call(a, b, c)
        } : function (a, b, c) {
            for (var d = a.length, e = Array(d), f = u(a) ? a.split("") : a, g = 0; g < d; g++) g in f && (e[g] = b.call(c, f[g], g, a));
            return e
        };

    function va(a, b) {
        var c;
        a: {
            c = a.length;
            for (var d = u(a) ? a.split("") : a, e = 0; e < c; e++) if (e in d && b.call(h, d[e], e, a)) {
                c = e;
                break a
            }
            c = -1
        }
        return 0 > c ? l : u(a) ? a.charAt(c) : a[c]
    }

    function wa(a, b) {
        for (var c = 1; c < arguments.length; c++) {
            var d = arguments[c],
                e, f;
            if (!(f = da(d))) e = d, f = ca(e), f = (e = "array" == f || "object" == f && "number" == typeof e.length) && d.hasOwnProperty("callee");
            if (f) a.push.apply(a, d);
            else if (e) {
                f = a.length;
                for (var g = d.length, i = 0; i < g; i++) a[f + i] = d[i]
            } else a.push(d)
        }
    }
    function xa(a, b, c, d) {
        z.splice.apply(a, ya(arguments, 1))
    }
    function ya(a, b, c) {
        return 2 >= arguments.length ? z.slice.call(a, b) : z.slice.call(a, b, c)
    };
    var za;

    function Aa(a) {
        a = a.className;
        return u(a) && a.match(/\S+/g) || []
    }
    function Ba(a, b) {
        var c = Aa(a),
            d = ya(arguments, 1);
        Ca(c, d);
        a.className = c.join(" ")
    }
    function Da(a, b) {
        var c = Aa(a),
            d = ya(arguments, 1),
            c = Ea(c, d);
        a.className = c.join(" ")
    }
    function Ca(a, b) {
        for (var c = 0; c < b.length; c++) 0 <= sa(a, b[c]) || a.push(b[c])
    }
    function Ea(a, b) {
        return ta(a, function (a) {
            return !(0 <= sa(b, a))
        })
    }
    function B(a, b) {
        var c = Aa(a);
        return 0 <= sa(c, b)
    }
    function C(a, b, c) {
        c ? Ba(a, b) : Da(a, b)
    };

    function E(a, b) {
        this.x = t(a) ? a : 0;
        this.y = t(b) ? b : 0
    }
    E.prototype.u = function () {
        return new E(this.x, this.y)
    };

    function Fa(a, b) {
        return new E(a.x - b.x, a.y - b.y)
    };

    function Ga(a, b) {
        this.width = a;
        this.height = b
    }
    Ga.prototype.u = function () {
        return new Ga(this.width, this.height)
    };
    Ga.prototype.floor = function () {
        this.width = Math.floor(this.width);
        this.height = Math.floor(this.height);
        return this
    };
    Ga.prototype.round = function () {
        this.width = Math.round(this.width);
        this.height = Math.round(this.height);
        return this
    };
    Ga.prototype.scale = function (a) {
        this.width *= a;
        this.height *= a;
        return this
    };
    var Ha = "constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");

    function Ia(a, b) {
        for (var c, d, e = 1; e < arguments.length; e++) {
            d = arguments[e];
            for (c in d) a[c] = d[c];
            for (var f = 0; f < Ha.length; f++) c = Ha[f], Object.prototype.hasOwnProperty.call(d, c) && (a[c] = d[c])
        }
    };
    var Ja, Ka, La, Ma, Na;

    function Oa() {
        return s.navigator ? s.navigator.userAgent : l
    }
    function Pa() {
        return s.navigator
    }
    Ma = La = Ka = Ja = p;
    var Qa;
    if (Qa = Oa()) {
        var Ra = Pa();
        Ja = 0 == Qa.indexOf("Opera");
        Ka = !Ja && -1 != Qa.indexOf("MSIE");
        La = !Ja && -1 != Qa.indexOf("WebKit");
        Ma = !Ja && !La && "Gecko" == Ra.product
    }
    var Sa = Ja,
        G = Ka,
        Ta = Ma,
        H = La,
        Ua = Pa();
    Na = -1 != (Ua && Ua.platform || "")
        .indexOf("Mac");
    var Va = !! Pa() && -1 != (Pa()
        .appVersion || "")
        .indexOf("X11"),
        Wa;
    a: {
        var Xa = "",
            Ya;
        if (Sa && s.opera) var Za = s.opera.version,
            Xa = "function" == typeof Za ? Za() : Za;
        else if (Ta ? Ya = /rv\:([^\);]+)(\)|;)/ : G ? Ya = /MSIE\s+([^\);]+)(\)|;)/ : H && (Ya = /WebKit\/(\S+)/), Ya) var $a = Ya.exec(Oa()),
            Xa = $a ? $a[1] : "";
        if (G) {
            var ab, bb = s.document;
            ab = bb ? bb.documentMode : h;
            if (ab > parseFloat(Xa)) {
                Wa = String(ab);
                break a
            }
        }
        Wa = Xa
    }
    var cb = Wa,
        db = {};

    function eb(a) {
        var b;
        if (!(b = db[a])) {
            b = 0;
            for (var c = String(cb)
                .replace(/^[\s\xa0]+|[\s\xa0]+$/g, "")
                .split("."), d = String(a)
                .replace(/^[\s\xa0]+|[\s\xa0]+$/g, "")
                .split("."), e = Math.max(c.length, d.length), f = 0; 0 == b && f < e; f++) {
                var g = c[f] || "",
                    i = d[f] || "",
                    j = RegExp("(\\d*)(\\D*)", "g"),
                    n = RegExp("(\\d*)(\\D*)", "g");
                do {
                    var m = j.exec(g) || ["", "", ""],
                        q = n.exec(i) || ["", "", ""];
                    if (0 == m[0].length && 0 == q[0].length) break;
                    b = ((0 == m[1].length ? 0 : parseInt(m[1], 10)) < (0 == q[1].length ? 0 : parseInt(q[1], 10)) ? -1 : (0 == m[1].length ? 0 : parseInt(m[1],
                    10)) > (0 == q[1].length ? 0 : parseInt(q[1], 10)) ? 1 : 0) || ((0 == m[2].length) < (0 == q[2].length) ? -1 : (0 == m[2].length) > (0 == q[2].length) ? 1 : 0) || (m[2] < q[2] ? -1 : m[2] > q[2] ? 1 : 0)
                } while (0 == b)
            }
            b = db[a] = 0 <= b
        }
        return b
    }
    var fb = {};

    function gb(a) {
        return fb[a] || (fb[a] = G && !! document.documentMode && document.documentMode >= a)
    };
    !G || gb(9);
    !Ta && !G || G && gb(9) || Ta && eb("1.9.1");
    G && eb("9");

    function hb(a) {
        return a ? new ib(jb(a)) : za || (za = new ib)
    }
    function I(a) {
        return u(a) ? document.getElementById(a) : a
    }
    function J(a, b) {
        var c = b || document;
        return c.querySelectorAll && c.querySelector ? c.querySelectorAll("." + a) : c.getElementsByClassName ? c.getElementsByClassName(a) : kb("*", a, b)
    }
    function L(a, b) {
        var c = b || document,
            d = l;
        return (d = c.querySelectorAll && c.querySelector ? c.querySelector("." + a) : J(a, b)[0]) || l
    }

    function kb(a, b, c) {
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
            for (f = e = 0; g = c[f]; f++) a = g.className, "function" == typeof a.split && 0 <= sa(a.split(/\s+/), b) && (d[e++] = g);
            d.length = e;
            return d
        }
        return c
    }

    function lb(a) {
        a && a.parentNode && a.parentNode.removeChild(a)
    }
    function jb(a) {
        return 9 == a.nodeType ? a : a.ownerDocument || a.document
    }
    function M(a, b, c) {
        if (!b && !c) return l;
        var d = b ? b.toUpperCase() : l;
        return mb(a, function (a) {
            return (!d || a.nodeName == d) && (!c || B(a, c))
        }, k)
    }
    function mb(a, b, c, d) {
        c || (a = a.parentNode);
        for (var c = d == l, e = 0; a && (c || e <= d);) {
            if (b(a)) return a;
            a = a.parentNode;
            e++
        }
        return l
    }
    function ib(a) {
        this.a = a || s.document || document
    }
    ib.prototype.createElement = function (a) {
        return this.a.createElement(a)
    };

    function nb(a) {
        return "CSS1Compat" == a.a.compatMode
    }
    function ob(a) {
        var b = a.a,
            a = !H && "CSS1Compat" == b.compatMode ? b.documentElement : b.body,
            b = b.parentWindow || b.defaultView;
        return new E(b.pageXOffset || a.scrollLeft, b.pageYOffset || a.scrollTop)
    }
    ib.prototype.appendChild = function (a, b) {
        a.appendChild(b)
    };

    function pb(a) {
        this.a = a
    }
    var qb = /\s*;\s*/;

    function rb(a, b, c, d, e, f) {
        if (/[;=\s]/.test(b)) throw Error('Invalid cookie name "' + b + '"');
        if (/[;\r\n]/.test(c)) throw Error('Invalid cookie value "' + c + '"');
        t(d) || (d = -1);
        f = f ? ";domain=" + f : "";
        e = e ? ";path=" + e : "";
        d = 0 > d ? "" : 0 == d ? ";expires=" + (new Date(1970, 1, 1))
            .toUTCString() : ";expires=" + (new Date(ja() + 1E3 * d))
            .toUTCString();
        a.a.cookie = b + "=" + c + f + e + d + ""
    }
    r = pb.prototype;
    r.get = function (a, b) {
        for (var c = a + "=", d = (this.a.cookie || "")
            .split(qb), e = 0, f; f = d[e]; e++) {
            if (0 == f.indexOf(c)) return f.substr(c.length);
            if (f == a) return ""
        }
        return b
    };
    r.remove = function (a, b, c) {
        var d = t(this.get(a));
        rb(this, a, "", 0, b, c);
        return d
    };
    r.U = function () {
        return sb(this)
            .keys
    };
    r.V = function () {
        return sb(this)
            .ja
    };
    r.clear = function () {
        for (var a = sb(this)
            .keys, b = a.length - 1; 0 <= b; b--) this.remove(a[b])
    };

    function sb(a) {
        for (var a = (a.a.cookie || "")
            .split(qb), b = [], c = [], d, e, f = 0; e = a[f]; f++) d = e.indexOf("="), - 1 == d ? (b.push(""), c.push(e)) : (b.push(e.substring(0, d)), c.push(e.substring(d + 1)));
        return {
            keys: b,
            ja: c
        }
    }
    var tb = new pb(document);
    tb.b = 3950;

    function ub(a, b, c) {
        rb(tb, "" + a, b, c, "/", "youtube.com")
    }
    function vb(a) {
        return tb.get("" + a, h)
    };

    function wb() {
        var a = vb("PREF");
        if (a) for (var a = unescape(a)
            .split("&"), b = 0; b < a.length; b++) {
            var c = a[b].split("="),
                d = c[0];
            (c = c[1]) && (N[d] = c.toString())
        }
    }
    ba(wb);
    var N = aa("yt.prefs.UserPrefs.prefs_") || {};
    y("yt.prefs.UserPrefs.prefs_", N);

    function xb(a) {
        if (/^f([1-9][0-9]*)$/.test(a)) throw "ExpectedRegexMatch: " + a;
    }
    function yb(a) {
        if (!/^\w+$/.test(a)) throw "ExpectedRegexMismatch: " + a;
    }
    function zb(a) {
        a = N[a] !== h ? N[a].toString() : l;
        return a != l && /^[A-Fa-f0-9]+$/.test(a) ? parseInt(a, 16) : l
    }
    wb.prototype.get = function (a, b) {
        yb(a);
        xb(a);
        var c = N[a] !== h ? N[a].toString() : l;
        return c != l ? c : b ? b : ""
    };

    function Ab(a) {
        return !!((zb("f" + (Math.floor(a / 31) + 1)) || 0) & 1 << a % 31)
    }
    function Bb(a, b) {
        var c = "f" + (Math.floor(a / 31) + 1),
            d = 1 << a % 31,
            e = zb(c) || 0,
            e = b ? e | d : e & ~d;
        0 == e ? delete N[c] : (d = e.toString(16), N[c] = d.toString())
    }
    wb.prototype.remove = function (a) {
        yb(a);
        xb(a);
        delete N[a]
    };
    wb.prototype.clear = function () {
        N = {}
    };
    var Cb = {
        $b: 0,
        Xa: 1,
        Sa: 2,
        Db: 3,
        Ya: 4,
        Ac: 5,
        Cc: 6,
        zc: 7,
        xc: 8,
        yc: 9,
        Bc: 10,
        wc: 11,
        gc: 12,
        fc: 13,
        ec: 14,
        pb: 15,
        Qb: 16,
        Tb: 17,
        Ub: 18,
        Sb: 19,
        Rb: 20,
        hc: 21,
        ab: 22,
        vc: 23,
        $a: 24,
        Ha: 25,
        bb: 26,
        nb: 27,
        cc: 28,
        Za: 29,
        bc: 30,
        oc: 31,
        nc: 32,
        kb: 33,
        lc: 34,
        ic: 35,
        jc: 36,
        kc: 37,
        mc: 38,
        Eb: 39,
        Xb: 40,
        Ia: 41,
        Wb: 42,
        Ka: 43,
        Ra: 44,
        eb: 45,
        Nb: 46,
        pc: 47,
        Dc: 48,
        Ec: 49,
        Gc: 50,
        dc: 51,
        Qa: 52,
        Ua: 53,
        Ob: 54,
        zb: 55,
        cb: 56,
        ac: 57,
        Yb: 58,
        mb: 59,
        Kb: 60,
        Ab: 61,
        Fb: 62,
        Ja: 63,
        uc: 64,
        Na: 65,
        Ma: 66,
        Gb: 67,
        Wa: 68,
        gb: 69,
        vb: 70,
        Lb: 71,
        ob: 72,
        Zb: 73,
        Hb: 74,
        qc: 75,
        La: 76,
        Vb: 77,
        hb: 78,
        sc: 79,
        Bb: 80,
        Ta: 81,
        Jb: 82,
        wb: 83,
        yb: 84,
        xb: 85,
        P: 86,
        Q: 87,
        Oa: 88,
        Ga: 89,
        Pa: 90,
        Pb: 91,
        Mb: 92,
        Va: 93,
        Fc: 94,
        jb: 95,
        ib: 96,
        lb: 97,
        Cb: 98,
        fb: 99,
        Ib: 100,
        rb: 101,
        qb: 102,
        tb: 103,
        ub: 104,
        sb: 105,
        tc: 106
    };

    function O(a, b, c) {
        a.dataset ? a.dataset[Db(b)] = c : a.setAttribute("data-" + b, c)
    }
    function P(a, b) {
        return a.dataset ? a.dataset[Db(b)] : a.getAttribute("data-" + b)
    }
    function Eb(a, b) {
        a.dataset ? delete a.dataset[Db(b)] : a.removeAttribute("data-" + b)
    }
    var Fb = {};

    function Db(a) {
        return Fb[a] || (Fb[a] = String(a)
            .replace(/\-([a-z])/g, function (a, c) {
            return c.toUpperCase()
        }))
    };

    function Gb(a) {
        var b = a.__yt_uid_key;
        b || (b = Hb(), a.__yt_uid_key = b);
        return b
    }
    var Hb = aa("yt.dom.getNextId_");
    if (!Hb) {
        Hb = function () {
            return ++Ib
        };
        y("yt.dom.getNextId_", Hb);
        var Ib = 0
    }
    function Jb(a, b) {
        a = I(a);
        b = I(b);
        return !!mb(a, function (a) {
            return a === b
        }, k, h)
    }
    function Kb(a) {
        var b = document.createElement("div");
        b.innerHTML = a;
        if (b.firstElementChild != h) a = b.firstElementChild;
        else for (a = b.firstChild; a && 1 != a.nodeType;) a = a.nextSibling;
        return a
    };

    function Lb(a) {
        if (a = a || window.event) {
            for (var b in a) b in Mb || (this[b] = a[b]);
            this.scale = a.scale;
            this.rotation = a.rotation;
            this.K = a;
            if ((b = a.target || a.srcElement) && 3 == b.nodeType) b = b.parentNode;
            this.target = b;
            if (b = a.relatedTarget) try {
                b = b.nodeName && b
            } catch (c) {
                b = l
            } else "mouseover" == this.type ? b = a.fromElement : "mouseout" == this.type && (b = a.toElement);
            this.relatedTarget = b;
            this.clientX = a.clientX != h ? a.clientX : a.pageX;
            this.clientY = a.clientY != h ? a.clientY : a.pageY;
            if (document.body && document.documentElement) {
                b = document.body.scrollLeft + document.documentElement.scrollLeft;
                var d = document.body.scrollTop + document.documentElement.scrollTop;
                this.pageX = a.pageX != h ? a.pageX : a.clientX + b;
                this.pageY = a.pageY != h ? a.pageY : a.clientY + d
            }
            this.keyCode = a.keyCode ? a.keyCode : a.which;
            this.charCode = a.charCode || ("keypress" == this.type ? this.keyCode : 0);
            this.altKey = a.altKey;
            this.ctrlKey = a.ctrlKey;
            this.shiftKey = a.shiftKey;
            "MozMousePixelScroll" == this.type ? (this.wheelDeltaX = a.axis == a.HORIZONTAL_AXIS ? a.detail : 0, this.wheelDeltaY = a.axis == a.HORIZONTAL_AXIS ? 0 : a.detail) : window.opera ? (this.wheelDeltaX = 0, this.wheelDeltaY = a.detail) : 0 == a.wheelDelta % 120 ? "WebkitTransform" in document.documentElement.style ? window.a && 0 == navigator.platform.indexOf("Mac") ? (this.wheelDeltaX = a.wheelDeltaX / -30, this.wheelDeltaY = a.wheelDeltaY / -30) : (this.wheelDeltaX = a.wheelDeltaX / -1.2, this.wheelDeltaY = a.wheelDeltaY / -1.2) : (this.wheelDeltaX = 0, this.wheelDeltaY = a.wheelDelta / -1.6) : (this.wheelDeltaX = a.wheelDeltaX / -3, this.wheelDeltaY = a.wheelDeltaY / -3)
        }
    }
    r = Lb.prototype;
    r.K = l;
    r.type = "";
    r.target = l;
    r.relatedTarget = l;
    r.currentTarget = l;
    r.data = l;
    r.keyCode = 0;
    r.charCode = 0;
    r.altKey = p;
    r.ctrlKey = p;
    r.shiftKey = p;
    r.clientX = 0;
    r.clientY = 0;
    r.pageX = 0;
    r.pageY = 0;
    r.wheelDeltaX = 0;
    r.wheelDeltaY = 0;
    r.rotation = 0;
    r.scale = 1;
    r.preventDefault = function () {
        this.K.returnValue = p;
        this.K.preventDefault && this.K.preventDefault()
    };
    var Mb = {
        stopPropagation: 1,
        preventMouseEvent: 1,
        preventManipulation: 1,
        preventDefault: 1,
        layerX: 1,
        layerY: 1,
        scale: 1,
        rotation: 1
    };
    var Nb = aa("yt.events.listeners_") || {};
    y("yt.events.listeners_", Nb);
    var Ob = aa("yt.events.counter_") || {
        count: 0
    };
    y("yt.events.counter_", Ob);

    function Q(a, b, c, d) {
        if (!a || !a.addEventListener && !a.attachEvent) return "";
        var e = !! d,
            f;
        a: {
            d = function (d) {
                return d[0] == a && d[1] == b && d[2] == c && d[4] == !! e
            };
            for (f in Nb) if (d.call(h, Nb[f])) break a;
            f = h
        }
        if (f) return f;
        f = ++Ob.count + "";
        var d = !(!("mouseenter" == b || "mouseleave" == b) || !a.addEventListener || "onmouseenter" in document),
            g;
        g = d ? function (d) {
            d = new Lb(d);
            if (!mb(d.relatedTarget, function (b) {
                return b == a
            }, k)) return d.currentTarget = a, d.type = b, c.call(a, d)
        } : function (b) {
            b = new Lb(b);
            b.currentTarget = a;
            return c.call(a, b)
        };
        Nb[f] = [a, b, c, g, e];
        a.addEventListener ? "mouseenter" == b && d ? a.addEventListener("mouseover", g, e) : "mouseleave" == b && d ? a.addEventListener("mouseout", g, e) : "mousewheel" == b && "MozBoxSizing" in document.documentElement.style ? a.addEventListener("MozMousePixelScroll", g, e) : a.addEventListener(b, g, e) : a.attachEvent("on" + b, g);
        return f
    }

    function Pb(a, b, c) {
        var d;
        d = Q(a, b, function () {
            var b = d;
            "string" == typeof b && (b = [b]);
            A(b, function (a) {
                if (a in Nb) {
                    var b = Nb[a],
                        c = b[0],
                        d = b[1],
                        e = b[3],
                        b = b[4];
                    c.removeEventListener ? c.removeEventListener(d, e, b) : c.detachEvent("on" + d, e);
                    delete Nb[a]
                }
            });
            c.apply(a, arguments)
        }, h)
    }
    function R(a, b, c) {
        var d = a || document;
        Q(d, "click", function (a) {
            var f = mb(a.target, function (a) {
                return a === d || B(a, c)
            }, k);
            f && f !== d && (a.currentTarget = f, b.call(f, a))
        })
    };
    var Qb = window.yt && window.yt.config_ || {};
    y("yt.config_", Qb);
    var Rb = window.yt && window.yt.tokens_ || {};
    y("yt.tokens_", Rb);
    y("yt.globals_", window.yt && window.yt.globals_ || {});
    y("yt.msgs_", window.yt && window.yt.msgs_ || {});
    var Sb = window.yt && window.yt.timeouts_ || [];
    y("yt.timeouts_", Sb);
    var Tb = window.yt && window.yt.intervals_ || [];
    y("yt.intervals_", Tb);

    function Ub(a) {
        Vb(Qb, arguments)
    }
    function Wb(a, b) {
        return a in Qb ? Qb[a] : b
    }
    function Xb(a) {
        Vb(Rb, arguments)
    }
    function T(a) {
        return a in Rb ? Rb[a] : h
    }

    function Yb(a, b) {
        var c = window.setTimeout(a, b);
        Sb.push(c);
        return c
    }
    function Vb(a, b) {
        if (1 < b.length) {
            var c = b[0];
            a[c] = b[1]
        } else {
            var d = b[0];
            for (c in d) a[c] = d[c]
        }
    };

    function Zb(a) {
        this.e = 1E3 / a;
        this.b = l;
        this.a = []
    }
    var $b = new Zb(24);
    Zb.prototype.g = function () {
        for (var a = ja(), b = this.a.length - 1; 0 <= b; b--) ac(this.a[b], a) && bc(this, b)
    };
    Zb.prototype.add = function (a) {
        this.a.push(a);
        this.b || (a = v(this.g, this), a = window.setInterval(a, this.e), Tb.push(a), this.b = a)
    };
    Zb.prototype.remove = function (a) {
        a = sa(this.a, a);
        0 <= a && bc(this, a)
    };

    function bc(a, b) {
        z.splice.call(a.a, b, 1);
        a.a.length || (window.clearInterval(a.b), delete a.b)
    };

    function cc(a, b, c, d, e, f, g, i) {
        this.a = a;
        this.i = b;
        this.b = c;
        this.k = d;
        this.e = e;
        this.o = f;
        this.g = g;
        this.q = i
    }
    cc.prototype.u = function () {
        return new cc(this.a, this.i, this.b, this.k, this.e, this.o, this.g, this.q)
    };

    function dc(a, b) {
        if (0 == b) return new E(a.a, a.i);
        if (1 == b) return new E(a.g, a.q);
        var c = a.a + b * (a.b - a.a),
            d = a.i + b * (a.k - a.i),
            e = a.b + b * (a.e - a.b),
            f = a.k + b * (a.o - a.k),
            g = a.e + b * (a.g - a.e),
            i = a.o + b * (a.q - a.o),
            c = c + b * (e - c),
            d = d + b * (f - d);
        return new E(c + b * (e + b * (g - e) - c), d + b * (f + b * (i - f) - d))
    }

    function ec(a, b) {
        var c = (b - a.a) / (a.g - a.a);
        if (0 >= c) return 0;
        if (1 <= c) return 1;
        for (var d = 0, e = 1, f = 0; 8 > f; f++) {
            var g = dc(a, c)
                .x,
                i = (dc(a, c + 1E-6)
                    .x - g) / 1E-6;
            if (1E-6 > Math.abs(g - b)) return c;
            if (1E-6 > Math.abs(i)) break;
            else g < b ? d = c : e = c, c -= (g - b) / i
        }
        for (f = 0; 1E-6 < Math.abs(g - b) && 8 > f; f++) g < b ? (d = c, c = (c + e) / 2) : (e = c, c = (c + d) / 2), g = dc(a, c)
            .x;
        return c
    };

    function fc(a, b) {
        this.a = new cc(0, 0, a.x, a.y, b.x, b.y, 1, 1)
    }
    function hc(a) {
        return a
    }
    var ic = new fc({
        x: 0.25,
        y: 0.1
    }, {
        x: 0.25,
        y: 1
    });

    function jc(a) {
        return dc(ic.a, ec(ic.a, a))
            .y
    }
    var kc = new fc({
        x: 0.42,
        y: 0
    }, {
        x: 1,
        y: 1
    });

    function lc(a) {
        return dc(kc.a, ec(kc.a, a))
            .y
    }
    var mc = new fc({
        x: 0,
        y: 0
    }, {
        x: 0.58,
        y: 1
    });

    function nc(a) {
        return dc(mc.a, ec(mc.a, a))
            .y
    }
    var oc = new fc({
        x: 0.42,
        y: 0
    }, {
        x: 0.58,
        y: 1
    });

    function pc(a) {
        return dc(oc.a, ec(oc.a, a))
            .y
    }

    function qc(a) {
        switch (a) {
        case "linear":
            return hc;
        case "ease-in":
            return lc;
        case "ease-out":
            return nc;
        case "ease-in-out":
            return pc;
        default:
            return jc
        }
    };

    function rc(a, b) {
        var c = b || {};
        this.f = a;
        this.X = c.duration || 0.25;
        this.e = 1E3 * this.X;
        this.G = c.r || l;
        this.S = c.Ea || "ease";
        this.n(c);
        c.Da || this.k()
    }
    rc.prototype.n = function () {};
    var sc;

    function tc() {
        if (!t(sc)) {
            var a = document.createElement("div");
            t(a.style.MozTransition) ? sc = "Moz" : t(a.style.WebkitTransition) ? sc = "Webkit" : t(a.style.a) ? sc = "O" : sc = l
        }
        return sc
    };

    function uc(a, b) {
        rc.call(this, a, b)
    }
    ka(uc, rc);

    function vc(a, b, c) {
        b = tc() + b;
        a.f.style[b] = c
    }
    uc.prototype.k = function () {
        this.f.style.opacity = this.b;
        Yb(v(function () {
            vc(this, "TransitionTimingFunction", this.S);
            vc(this, "TransitionDuration", this.X + "s");
            vc(this, "TransitionProperty", "opacity");
            Pb(this.f, H ? "webkitTransitionEnd" : Sa ? "oTransitionEnd" : "transitionend", v(function () {
                vc(this, "TransitionTimingFunction", "");
                vc(this, "TransitionDuration", "");
                vc(this, "TransitionProperty", "");
                this.G && this.G(this)
            }, this));
            this.f.style.opacity = this.H
        }, this), 20)
    };

    function wc(a, b) {
        rc.call(this, a, b)
    }
    ka(wc, rc);
    wc.prototype.n = function (a) {
        this.a = 0;
        this.q = a.loop || $b;
        this.o = qc(this.S)
    };
    wc.prototype.k = function () {
        this.g = ja();
        ac(this, this.g);
        this.q.add(this)
    };

    function ac(a, b) {
        a.a = Math.min(a.a + (b - a.g), a.e);
        a.g = b;
        var c = a.o(a.a / a.e),
            c = a.b - (a.b - a.H) * c;
        a.i ? a.f.style.filter = "alpha(opacity=" + Math.floor(100 * c) + ")" : a.f.style.opacity = c;
        if (c = a.a >= a.e) a.D(), a.G && Yb(v(a.G, s, a), 0);
        return c
    }
    wc.prototype.D = function () {};

    function xc(a, b) {
        rc.call(this, a, b)
    }
    ka(xc, wc);
    xc.prototype.n = function (a) {
        var b = parseFloat(a.start),
            c = parseFloat(a.end);
        this.b = isNaN(b) ? 1 : b;
        this.H = isNaN(c) ? 0 : c;
        this.i = !t(this.f.style.opacity);
        xc.$.n.call(this, a)
    };
    xc.prototype.D = function () {
        this.i && 1 == this.H && (this.f.style.filter = "")
    };

    function yc(a, b) {
        rc.call(this, a, b)
    }
    ka(yc, uc);
    yc.prototype.n = function (a) {
        var b = parseFloat(a.start),
            c = parseFloat(a.end);
        this.b = isNaN(b) ? 1 : b;
        this.H = isNaN(c) ? 0 : c;
        yc.$.n.call(this, a)
    };

    function zc(a, b) {
        var c = b || {};
        c.start = 0;
        c.end = 1;
        tc() ? new yc(a, c) : new xc(a, c)
    }
    function Ac(a, b) {
        var c = b || {};
        c.start = 1;
        c.end = 0;
        tc() ? new yc(a, c) : new xc(a, c)
    };
    var Bc = "StopIteration" in s ? s.StopIteration : Error("StopIteration");

    function Cc() {}
    Cc.prototype.a = function () {
        throw Bc;
    };
    Cc.prototype.ra = function () {
        return this
    };

    function Dc(a, b) {
        this.b = {};
        this.a = [];
        var c = arguments.length;
        if (1 < c) {
            if (c % 2) throw Error("Uneven number of arguments");
            for (var d = 0; d < c; d += 2) Ec(this, arguments[d], arguments[d + 1])
        } else if (a) {
            var e;
            if (a instanceof Dc) e = a.U(), d = a.V();
            else {
                var c = [],
                    f = 0;
                for (e in a) c[f++] = e;
                e = c;
                c = [];
                f = 0;
                for (d in a) c[f++] = a[d];
                d = c
            }
            for (c = 0; c < e.length; c++) Ec(this, e[c], d[c])
        }
    }
    r = Dc.prototype;
    r.w = 0;
    r.C = 0;
    r.V = function () {
        Fc(this);
        for (var a = [], b = 0; b < this.a.length; b++) a.push(this.b[this.a[b]]);
        return a
    };
    r.U = function () {
        Fc(this);
        return this.a.concat()
    };
    r.clear = function () {
        this.b = {};
        this.C = this.w = this.a.length = 0
    };
    r.remove = function (a) {
        return Object.prototype.hasOwnProperty.call(this.b, a) ? (delete this.b[a], this.w--, this.C++, this.a.length > 2 * this.w && Fc(this), k) : p
    };

    function Fc(a) {
        if (a.w != a.a.length) {
            for (var b = 0, c = 0; b < a.a.length;) {
                var d = a.a[b];
                Object.prototype.hasOwnProperty.call(a.b, d) && (a.a[c++] = d);
                b++
            }
            a.a.length = c
        }
        if (a.w != a.a.length) {
            for (var e = {}, c = b = 0; b < a.a.length;) d = a.a[b], Object.prototype.hasOwnProperty.call(e, d) || (a.a[c++] = d, e[d] = 1), b++;
            a.a.length = c
        }
    }
    r.get = function (a, b) {
        return Object.prototype.hasOwnProperty.call(this.b, a) ? this.b[a] : b
    };

    function Ec(a, b, c) {
        Object.prototype.hasOwnProperty.call(a.b, b) || (a.w++, a.a.push(b), a.C++);
        a.b[b] = c
    }
    r.u = function () {
        return new Dc(this)
    };
    r.ra = function (a) {
        Fc(this);
        var b = 0,
            c = this.a,
            d = this.b,
            e = this.C,
            f = this,
            g = new Cc;
        g.a = function () {
            for (;;) {
                if (e != f.C) throw Error("The map has changed since the iterator was created");
                if (b >= c.length) throw Bc;
                var g = c[b++];
                return a ? g : d[g]
            }
        };
        return g
    };

    function Gc(a, b, c) {
        for (var d = a.elements, e, f = 0; e = d[f]; f++) if (!(e.form != a || e.disabled || "fieldset" == e.tagName.toLowerCase())) {
            var g = e.name;
            switch (e.type.toLowerCase()) {
            case "file":
            case "submit":
            case "reset":
            case "button":
                break;
            case "select-multiple":
                e = Hc(e);
                if (e != l) for (var i, j = 0; i = e[j]; j++) c(b, g, i);
                break;
            default:
                i = Hc(e), i != l && c(b, g, i)
            }
        }
        d = a.getElementsByTagName("input");
        for (f = 0; e = d[f]; f++) e.form == a && "image" == e.type.toLowerCase() && (g = e.name, c(b, g, e.value), c(b, g + ".x", "0"), c(b, g + ".y", "0"))
    }

    function Ic(a, b, c) {
        var d = a.get(b);
        d || (d = [], Ec(a, b, d));
        d.push(c)
    }
    function Jc(a, b, c) {
        a.push(encodeURIComponent(b) + "=" + encodeURIComponent(c))
    }
    function Hc(a) {
        var b = a.type;
        if (!t(b)) return l;
        switch (b.toLowerCase()) {
        case "checkbox":
        case "radio":
            return a.checked ? a.value : l;
        case "select-one":
            return b = a.selectedIndex, 0 <= b ? a.options[b].value : l;
        case "select-multiple":
            for (var b = [], c, d = 0; c = a.options[d]; d++) c.selected && b.push(c.value);
            return b.length ? b : l;
        default:
            return t(a.value) ? a.value : l
        }
    };

    function Kc(a) {
        return eval("(" + a + ")")
    };

    function Lc() {
        this.a = ja()
    }
    new Lc;
    Lc.prototype.get = function () {
        return this.a
    };
    var Mc = RegExp("^(?:([^:/?#.]+):)?(?://(?:([^/?#]*)@)?([\\w\\d\\-\\u0100-\\uffff.%]*)(?::([0-9]+))?)?([^?#]+)?(?:\\?([^#]*))?(?:#(.*))?$");

    function Nc(a) {
        if (Oc) {
            Oc = p;
            var b = s.location;
            if (b) {
                var c = b.href;
                if (c && (c = Pc(Nc(c)[3] || l)) && c != b.hostname) throw Oc = k, Error();
            }
        }
        return a.match(Mc)
    }
    var Oc = H;

    function Pc(a) {
        return a && decodeURIComponent(a)
    }

    function Qc(a) {
        if (a[1]) {
            var b = a[0],
                c = b.indexOf("#");
            0 <= c && (a.push(b.substr(c)), a[0] = b = b.substr(0, c));
            c = b.indexOf("?");
            0 > c ? a[1] = "?" : c == b.length - 1 && (a[1] = h)
        }
        return a.join("")
    }
    function Rc(a, b, c) {
        if (da(b)) for (var d = 0; d < b.length; d++) Rc(a, String(b[d]), c);
        else b != l && c.push("&", a, "" === b ? "" : "=", encodeURIComponent(String(b)))
    }
    function Sc(a, b, c) {
        Math.max(b.length - (c || 0), 0);
        for (c = c || 0; c < b.length; c += 2) Rc(b[c], b[c + 1], a);
        return a
    }
    function Tc(a, b) {
        for (var c in b) Rc(c, b[c], a);
        return a
    }

    function Uc(a, b) {
        return Qc(2 == arguments.length ? Sc([a], arguments[1], 0) : Sc([a], arguments, 1))
    };

    function Vc(a) {
        "?" == a.charAt(0) && (a = a.substr(1));
        for (var a = a.split("&"), b = {}, c = 0, d = a.length; c < d; c++) {
            var e = a[c].split("=");
            if (1 == e.length && e[0] || 2 == e.length) {
                var f = decodeURIComponent((e[0] || "")
                    .replace(/\+/g, " ")),
                    e = decodeURIComponent((e[1] || "")
                        .replace(/\+/g, " "));
                f in b ? da(b[f]) ? wa(b[f], e) : b[f] = [b[f], e] : b[f] = e
            }
        }
        return b
    }
    function Wc(a) {
        a = Tc([], a);
        a[0] = "";
        return a.join("")
    }
    function Xc(a, b) {
        var c = a.split("?", 2),
            a = c[0],
            c = Vc(c[1] || ""),
            d;
        for (d in b) c[d] = b[d];
        return Qc(Tc([a], c))
    };
    var Yc = l;
    "undefined" != typeof XMLHttpRequest ? Yc = function () {
        return new XMLHttpRequest
    } : "undefined" != typeof ActiveXObject && (Yc = function () {
        return new ActiveXObject("Microsoft.XMLHTTP")
    });

    function Zc(a) {
        switch (a && "status" in a ? a.status : -1) {
        case 0:
        case 200:
        case 204:
        case 304:
            return k;
        default:
            return p
        }
    };

    function $c(a, b, c, d, e) {
        var f = Yc && Yc();
        if ("open" in f) {
            f.onreadystatechange = function () {
                4 == (f && "readyState" in f ? f.readyState : 0) && b && b(f)
            };
            c = (c || "GET")
                .toUpperCase();
            d = d || "";
            f.open(c, a, k);
            a = "POST" == c;
            if (e) for (var g in e) f.setRequestHeader(g, e[g]), "content-type" == g.toLowerCase() && (a = p);
            a && f.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
            f.send(d);
            return f
        }
    }

    function U(a, b) {
        var c = b.format || "JSON";
        b.Fa && (a = document.location.protocol + "//" + document.location.hostname + a);
        var d = b.h;
        d && (a = Xc(a, d));
        var e = b.fa || "";
        if (d = b.m) e = Vc(e), Ia(e, d), e = Wc(e);
        var f = p,
            g, i = $c(a, function (a) {
                if (!f) {
                    f = k;
                    g && window.clearTimeout(g);
                    var d = Zc(a),
                        e = l;
                    if (d || 400 <= a.status && 500 > a.status) {
                        var i = l;
                        switch (c) {
                        case "JSON":
                            var e = a.responseText,
                                w = a.getResponseHeader("Content-Type") || "";
                            e && 0 <= w.indexOf("json") && (i = Kc(e));
                            break;
                        case "XML":
                            if (e = (e = a.responseXML) ? ad(e) : l) i = {}, A(e.getElementsByTagName("*"),

                            function (a) {
                                i[a.tagName] = bd(a)
                            })
                        }
                        e = i
                    }
                    if (d) a: {
                        switch (c) {
                        case "XML":
                            d = 0 == parseInt(e && e.return_code, 10);
                            break a;
                        case "RAW":
                            d = k;
                            break a
                        }
                        d = !! e
                    }
                    e = e || {};
                    w = b.M || s;
                    d ? b.l && b.l.call(w, a, e) : b.onError && b.onError.call(w, a, e);
                    b.r && b.r.call(w, a, e)
                }
            }, b.method, e, b.headers);
        b.la && 0 < b.timeout && (g = Yb(function () {
            f || (f = k, i.abort(), window.clearTimeout(g), b.la.call(b.M || s, i))
        }, b.timeout))
    }

    function cd(a, b) {
        var c = b.onComplete || l,
            d = b.onException || l,
            e = b.onError || l,
            f = b.update || l,
            g = b.json || p;
        $c(a, function (a) {
            if (Zc(a)) {
                var b = a.responseXML,
                    n = b ? ad(b) : l,
                    b = !(!b || !n),
                    m, q;
                if (b && (m = dd(n, "return_code"), q = dd(n, "html_content"), 0 == m)) {
                    f && q && (I(f)
                        .innerHTML = q);
                    var w = dd(n, "js_content");
                    if (w) {
                        var K = document.createElement("script");
                        K.text = w;
                        document.getElementsByTagName("head")[0].appendChild(K)
                    }
                }
                c && (b ? (b = dd(n, "redirect_on_success"), m && b ? window.location = b : ((n = dd(n, 0 == m ? "success_message" : "error_message")) && alert(n), a = g ? eval("(" + q + ")") : a, 0 == m ? c(a) : d && d(a))) : a.responseText && c(a))
            } else e && e(a)
        }, b.method || "POST", b.postBody || l, b.headers || l)
    }
    function ad(a) {
        return !a ? l : (a = ("responseXML" in a ? a.responseXML : a)
            .getElementsByTagName("root")) && 0 < a.length ? a[0] : l
    }
    function dd(a, b) {
        if (!a) return l;
        var c = a.getElementsByTagName(b);
        return c && 0 < c.length ? bd(c[0]) : l
    }
    function bd(a) {
        var b = "";
        A(a.childNodes, function (a) {
            b += a.nodeValue
        });
        return b
    };

    function ed() {};

    function fd() {
        this.a = [];
        this.p = {}
    }
    ka(fd, ed);
    r = fd.prototype;
    r.Y = 1;
    r.J = 0;
    r.L = function (a, b, c) {
        var d = this.p[a];
        d || (d = this.p[a] = []);
        var e = this.Y;
        this.a[e] = a;
        this.a[e + 1] = b;
        this.a[e + 2] = c;
        this.Y = e + 3;
        d.push(e);
        return e
    };
    r.ba = function (a, b, c) {
        if (a = this.p[a]) {
            var d = this.a;
            if (a = va(a, function (a) {
                return d[a + 1] == b && d[a + 2] == c
            })) return this.I(a)
        }
        return p
    };
    r.I = function (a) {
        if (0 != this.J) return this.b || (this.b = []), this.b.push(a), p;
        var b = this.a[a];
        if (b) {
            var c = this.p[b];
            if (c) {
                var d = sa(c, a);
                0 <= d && z.splice.call(c, d, 1)
            }
            delete this.a[a];
            delete this.a[a + 1];
            delete this.a[a + 2]
        }
        return !!b
    };
    r.R = function (a, b) {
        var c = this.p[a];
        if (c) {
            this.J++;
            for (var d = ya(arguments, 1), e = 0, f = c.length; e < f; e++) {
                var g = c[e];
                this.a[g + 1].apply(this.a[g + 2], d)
            }
            this.J--;
            if (this.b && 0 == this.J) for (; c = this.b.pop();) this.I(c);
            return 0 != e
        }
        return p
    };
    r.clear = function (a) {
        if (a) {
            var b = this.p[a];
            b && (A(b, this.I, this), delete this.p[a])
        } else this.a.length = 0, this.p = {}
    };
    var gd = aa("yt.pubsub.instance_") || new fd;
    fd.prototype.subscribe = fd.prototype.L;
    fd.prototype.unsubscribeByKey = fd.prototype.I;
    fd.prototype.publish = fd.prototype.R;
    fd.prototype.clear = fd.prototype.clear;
    y("yt.pubsub.instance_", gd);

    function hd(a, b, c) {
        var d = aa("yt.pubsub.instance_");
        return d ? d.subscribe(a, function () {
            var a = arguments;
            Yb(function () {
                b.apply(c || s, a)
            }, 0)
        }, c) : 0
    }
    function id(a, b) {
        var c = aa("yt.pubsub.instance_");
        return c ? c.publish.apply(c, arguments) : p
    };

    function jd(a, b, c, d) {
        this.top = a;
        this.right = b;
        this.bottom = c;
        this.left = d
    }
    jd.prototype.u = function () {
        return new jd(this.top, this.right, this.bottom, this.left)
    };

    function kd(a, b, c, d) {
        this.left = a;
        this.top = b;
        this.width = c;
        this.height = d
    }
    kd.prototype.u = function () {
        return new kd(this.left, this.top, this.width, this.height)
    };

    function V(a, b) {
        var c = jb(a);
        return c.defaultView && c.defaultView.getComputedStyle && (c = c.defaultView.getComputedStyle(a, l)) ? c[b] || c.getPropertyValue(b) || "" : ""
    }
    function ld(a, b) {
        return a.currentStyle ? a.currentStyle[b] : l
    }
    function md(a, b) {
        return V(a, b) || ld(a, b) || a.style && a.style[b]
    }
    function nd(a) {
        var b = a.getBoundingClientRect();
        G && (a = a.ownerDocument, b.left -= a.documentElement.clientLeft + a.body.clientLeft, b.top -= a.documentElement.clientTop + a.body.clientTop);
        return b
    }

    function od(a) {
        if (G && !gb(8)) return a.offsetParent;
        for (var b = jb(a), c = md(a, "position"), d = "fixed" == c || "absolute" == c, a = a.parentNode; a && a != b; a = a.parentNode) if (c = md(a, "position"), d = d && "static" == c && a != b.documentElement && a != b.body, !d && (a.scrollWidth > a.clientWidth || a.scrollHeight > a.clientHeight || "fixed" == c || "absolute" == c || "relative" == c)) return a;
        return l
    }

    function pd(a) {
        for (var b = new jd(0, Infinity, Infinity, 0), c = hb(a), d = c.a.body, e = c.a.documentElement, f = !H && "CSS1Compat" == c.a.compatMode ? c.a.documentElement : c.a.body; a = od(a);) if ((!G || 0 != a.clientWidth) && (!H || 0 != a.clientHeight || a != d) && a != d && a != e && "visible" != md(a, "overflow")) {
            var g = qd(a),
                i;
            i = a;
            if (Ta && !eb("1.9")) {
                var j = parseFloat(V(i, "borderLeftWidth"));
                if (rd(i)) var n = i.offsetWidth - i.clientWidth - j - parseFloat(V(i, "borderRightWidth")),
                    j = j + n;
                i = new E(j, parseFloat(V(i, "borderTopWidth")))
            } else i = new E(i.clientLeft,
            i.clientTop);
            g.x += i.x;
            g.y += i.y;
            b.top = Math.max(b.top, g.y);
            b.right = Math.min(b.right, g.x + a.clientWidth);
            b.bottom = Math.min(b.bottom, g.y + a.clientHeight);
            b.left = Math.max(b.left, g.x)
        }
        d = f.scrollLeft;
        f = f.scrollTop;
        b.left = Math.max(b.left, d);
        b.top = Math.max(b.top, f);
        c = (c.a.parentWindow || c.a.defaultView || window)
            .document;
        c = "CSS1Compat" == c.compatMode ? c.documentElement : c.body;
        c = new Ga(c.clientWidth, c.clientHeight);
        b.right = Math.min(b.right, d + c.width);
        b.bottom = Math.min(b.bottom, f + c.height);
        return 0 <= b.top && 0 <= b.left && b.bottom > b.top && b.right > b.left ? b : l
    }

    function qd(a) {
        var b, c = jb(a),
            d = md(a, "position"),
            e = Ta && c.getBoxObjectFor && !a.getBoundingClientRect && "absolute" == d && (b = c.getBoxObjectFor(a)) && (0 > b.screenX || 0 > b.screenY),
            f = new E(0, 0),
            g;
        b = c ? jb(c) : document;
        g = G && !gb(9) && !nb(hb(b)) ? b.body : b.documentElement;
        if (a == g) return f;
        if (a.getBoundingClientRect) b = nd(a), a = ob(hb(c)), f.x = b.left + a.x, f.y = b.top + a.y;
        else if (c.getBoxObjectFor && !e) b = c.getBoxObjectFor(a), a = c.getBoxObjectFor(g), f.x = b.screenX - a.screenX, f.y = b.screenY - a.screenY;
        else {
            b = a;
            do {
                f.x += b.offsetLeft;
                f.y += b.offsetTop;
                b != a && (f.x += b.clientLeft || 0, f.y += b.clientTop || 0);
                if (H && "fixed" == md(b, "position")) {
                    f.x += c.body.scrollLeft;
                    f.y += c.body.scrollTop;
                    break
                }
                b = b.offsetParent
            } while (b && b != a);
            if (Sa || H && "absolute" == d) f.y -= c.body.offsetTop;
            for (b = a;
            (b = od(b)) && b != c.body && b != g;) if (f.x -= b.scrollLeft, !Sa || "TR" != b.tagName) f.y -= b.scrollTop
        }
        return f
    }
    function sd(a, b) {
        "number" == typeof a && (a = (b ? Math.round(a) : a) + "px");
        return a
    }

    function td(a) {
        if ("none" != md(a, "display")) return ud(a);
        var b = a.style,
            c = b.display,
            d = b.visibility,
            e = b.position;
        b.visibility = "hidden";
        b.position = "absolute";
        b.display = "inline";
        a = ud(a);
        b.display = c;
        b.position = e;
        b.visibility = d;
        return a
    }
    function ud(a) {
        var b = a.offsetWidth,
            c = a.offsetHeight,
            d = H && !b && !c;
        return (!t(b) || d) && a.getBoundingClientRect ? (a = nd(a), new Ga(a.right - a.left, a.bottom - a.top)) : new Ga(b, c)
    }
    function rd(a) {
        return "rtl" == md(a, "direction")
    }

    function vd(a, b) {
        if (/^\d+px?$/.test(b)) return parseInt(b, 10);
        var c = a.style.left,
            d = a.runtimeStyle.left;
        a.runtimeStyle.left = a.currentStyle.left;
        a.style.left = b;
        var e = a.style.pixelLeft;
        a.style.left = c;
        a.runtimeStyle.left = d;
        return e
    }
    var wd = {
        thin: 2,
        medium: 4,
        thick: 6
    };

    function xd(a, b) {
        if ("none" == ld(a, b + "Style")) return 0;
        var c = ld(a, b + "Width");
        return c in wd ? wd[c] : vd(a, c)
    }
    var yd = /matrix\([0-9\.\-]+, [0-9\.\-]+, [0-9\.\-]+, [0-9\.\-]+, ([0-9\.\-]+)p?x?, ([0-9\.\-]+)p?x?\)/;

    function zd(a, b) {
        if ((a = I(a)) && a.style) a.style.display = b ? "" : "none", C(a, "hid", !b)
    }
    function Ad(a) {
        A(arguments, function (a) {
            zd(a, k)
        })
    }
    function W(a) {
        A(arguments, function (a) {
            zd(a, p)
        })
    };

    function X(a, b, c, d, e) {
        this.O = "session_token=" + a;
        if ((this.a = b) && "/" != this.a.charAt(this.a.length - 1)) this.a += "/";
        this.v = d;
        this.o = e;
        this.b = l;
        this.q = [];
        this.k = [];
        this.g = [];
        this.N = {}
    }
    y("yt.sharing.AutoShare", X);
    X.prototype.e = function (a, b, c, d) {
        Q(a, "click", v(this.da, this));
        if (a.id) this.N[a.id] = {
            serviceName: b,
            connectOnly: c
        }, d && (this.N[a.id].connectOnlyCallback = d);
        else throw "Connect dialog launch buttons must have an id.";
    };
    X.prototype.registerConnectDialogLauncher = X.prototype.e;
    X.prototype.da = function (a) {
        if (a = this.N[a.currentTarget.id]) {
            var b = a.connectOnly;
            a.connectOnlyCallback && (b = (0, a.connectOnlyCallback)());
            this.i(a.serviceName, b)
        }
    };
    X.prototype.handleConnectService = X.prototype.da;
    X.prototype.xa = function () {
        this.t()
    };
    X.prototype.doOnLoad = X.prototype.xa;
    X.prototype.ca = function (a) {
        this.q.push(a)
    };
    X.prototype.addServiceChangedCallback = X.prototype.ca;
    X.prototype.ua = function (a) {
        this.k.push(a)
    };
    X.prototype.addGaiaChangedCallback = X.prototype.ua;
    X.prototype.ta = function (a) {
        this.g.push(a)
    };
    X.prototype.addCanConnectCallback = X.prototype.ta;
    X.prototype.za = function () {
        return this.o
    };
    X.prototype.isGaiaUser = X.prototype.za;
    X.prototype.Ba = function () {
        this.W(this.a + "autoshare?action_link_start=1&root_url=" + encodeURIComponent(this.a), {
            height: 660,
            width: 1E3
        })
    };
    X.prototype.upgradeToGoogleAccount = X.prototype.Ba;
    X.prototype.Ca = function (a, b) {
        this.o = a;
        this.oa();
        b && b()
    };
    X.prototype.upgradeToGoogleAccountDone = X.prototype.Ca;
    X.prototype.ya = function () {
        return this.v
    };
    X.prototype.getServiceInfo = X.prototype.ya;
    X.prototype.i = function (a, b) {
        this.o || cd(this.a + "autoshare?action_ajax_stats_ping=1&stat=connect_no_google&service=" + a, {
            method: "GET",
            onComplete: function () {}
        });
        for (var c in this.g) if (!(0, this.g[c])(this, a, b)) return;
        cd(this.a + "autoshare?action_ajax_stats_ping=1&stat=connect_has_google&service=" + a, {
            method: "GET",
            onComplete: function () {}
        });
        c = this.a + "autoshare?action_popup_auth=1&service=" + a + "&connect_only=" + (b ? "True" : "False") + "&root_url=" + encodeURIComponent(this.a);
        if ("facebook" == a) {
            var d = "read_stream,offline_access";
            b || (d = [d, "publish_stream"].join());
            c += "&permissions=" + encodeURIComponent(d)
        }
        this.W(c, {
            height: 500,
            width: 860
        })
    };
    X.prototype.connectService = X.prototype.i;
    X.prototype.va = function (a, b) {
        var c = v(function (a) {
            this.v = a;
            this.t();
            b && b()
        }, this),
            d = v(function () {
                b && b();
                this.t()
            }, this),
            e = {
                action_ajax_connect_service: 1
            };
        e.return_url = a;
        cd(this.a + "autoshare?ajax_connect_service", {
            postBody: Wc(e) + "&" + this.O,
            onComplete: c,
            onException: d,
            json: k
        })
    };
    X.prototype.connectServiceDone = X.prototype.va;
    X.prototype.wa = function (a) {
        this.sa(a)
    };
    X.prototype.disconnectService = X.prototype.wa;
    X.prototype.Aa = function (a, b) {
        var c = v(function (a) {
            this.v = a;
            this.t()
        }, this),
            d = v(function () {
                this.t()
            }, this),
            e = {
                action_ajax_set_connect_only: 1
            };
        e.service = a;
        e.connect_only = b ? "True" : "False";
        cd(this.a + "autoshare?ajax_set_connect_only", {
            postBody: Wc(e) + "&" + this.O,
            onComplete: c,
            onException: d,
            json: k
        })
    };
    X.prototype.setConnectOnly = X.prototype.Aa;
    r = X.prototype;
    r.sa = function (a) {
        var b = v(function (a) {
            this.v = a;
            this.t()
        }, this),
            c = v(function () {
                this.t()
            }, this),
            d = {
                action_ajax_disconnect_service: 1
            };
        d.service = a;
        cd(this.a + "autoshare?ajax_disconnect_service", {
            postBody: Wc(d) + "&" + this.O,
            onComplete: b,
            onException: c,
            json: k
        })
    };
    r.oa = function () {
        for (var a in this.k)(0, this.k[a])(this)
    };
    r.t = function () {
        for (var a in this.q)(0, this.q[a])(this)
    };
    r.W = function (a, b) {
        if (this.b) try {
            this.b.close()
        } catch (c) {
            this.b = l
        }
        var d;
        d = b || {};
        d.target = d.target || a.target || "YouTube";
        d.width = d.width || 600;
        d.height = d.height || 600;
        var e = d;
        e || (e = {});
        var f = window;
        d = "undefined" != typeof a.href ? a.href : String(a);
        var g = e.target || a.target,
            i = [],
            j;
        for (j in e) switch (j) {
        case "width":
        case "height":
        case "top":
        case "left":
            i.push(j + "=" + e[j]);
            break;
        case "target":
        case "noreferrer":
            break;
        default:
            i.push(j + "=" + (e[j] ? 1 : 0))
        }
        j = i.join(",");
        if (e.noreferrer) {
            if (e = f.open("", g, j)) G && -1 != d.indexOf(";") && (d = "'" + d.replace(/'/g, "%27") + "'"), e.opener = l, H ? e.location.href = d : (d = ma(d), e.document.write('<META HTTP-EQUIV="refresh" content="0; url=' + d + '">'), e.document.close())
        } else e = f.open(d, g, j);
        (d = e) ? (d.opener || (d.opener = window), d.focus()) : d = l;
        this.b = !d
    };
    r.Hc = function () {
        this.i("facebook", !this.v.facebook.is_autosharing)
    };
    var Bd = {}, Cd = "ontouchstart" in document;

    function Dd(a, b, c) {
        var d;
        switch (a) {
        case "mouseover":
        case "mouseout":
            d = 3;
            break;
        case "mouseenter":
        case "mouseleave":
            d = 9
        }
        return mb(c, function (a) {
            return B(a, b)
        }, k, d)
    }

    function Y(a) {
        var b = "mouseover" == a.type && "mouseenter" in Bd || "mouseout" == a.type && "mouseleave" in Bd,
            c = a.type in Bd || b;
        if ("HTML" != a.target.tagName && c) {
            if (b) {
                var b = "mouseover" == a.type ? "mouseenter" : "mouseleave",
                    c = Bd[b],
                    d;
                for (d in c.p) {
                    var e = Dd(b, d, a.target);
                    e && !mb(a.relatedTarget, function (a) {
                        return a == e
                    }, k) && c.R(d, e, b, a)
                }
            }
            if (b = Bd[a.type]) for (d in b.p)(e = Dd(a.type, d, a.target)) && b.R(d, e, a.type, a)
        }
    }
    Q(document, "blur", Y, k);
    Q(document, "change", Y, k);
    Q(document, "click", Y);
    Q(document, "focus", Y, k);
    Q(document, "mouseover", Y);
    Q(document, "mouseout", Y);
    Q(document, "mousedown", Y);
    Q(document, "keydown", Y);
    Q(document, "keyup", Y);
    Q(document, "keypress", Y);
    Q(document, "cut", Y);
    Q(document, "paste", Y);
    Cd && (Q(document, "touchstart", Y), Q(document, "touchend", Y), Q(document, "touchcancel", Y));
    y("yt.uix.widgets_", window.yt && window.yt.uix && window.yt.uix.widgets_ || {});

    function Ed() {}
    Ed.prototype.b = function (a, b, c) {
        var d = P(a, b);
        if (d && (d = aa(d))) {
            var e = ya(arguments, 2);
            xa(e, 0, 0, a);
            d.apply(l, e)
        }
    };

    function Z(a, b) {
        return "yt-uix" + (a.a ? "-" + a.a : "") + (b ? "-" + b : "")
    };

    function Fd() {}
    ka(Fd, Ed);
    ba(Fd);
    Fd.prototype.a = "form-input";

    function Gd(a, b) {
        var c = Pc(Nc(a)[3] || l),
            d;
        if (!(d = c == Pc(Nc(window.location.href)[3] || l))) {
            if (c = !c) c = 0 == a.lastIndexOf("/", 0);
            d = c
        }
        if (d) {
            var e = Nc(a),
                c = e[5];
            d = e[6];
            var e = e[7],
                f = "";
            c && (f += c);
            d && (f += "?" + d);
            e && (f += "#" + e);
            c = f;
            d = c.indexOf("#");
            if (c = 0 > d ? c : c.substr(0, d)) {
                for (e = d = 0; e < c.length; ++e) d = 31 * d + c.charCodeAt(e), d %= 4294967296;
                c = "s_tempdata-" + d;
                d = b ? Wc(b) : "";
                ub(c, d, 5)
            }
        }
    };
    var Hd = {}, Id = 0;

    function Jd(a) {
        if (a) {
            var b = new Image,
                c = "" + Id++;
            Hd[c] = b;
            b.onload = b.onerror = function () {
                delete Hd[c]
            };
            b.src = a;
            b = eval("null")
        }
    };

    function Kd(a, b) {
        if ("view" == a && b.convViewUrl) return b.convViewUrl;
        if (!b.baseUrl || !b.uid) return l;
        var c = b.rmktEnabled,
            d = b.focEnabled && !b.isAd;
        if (!c && !d) return l;
        var e = {
            label: d ? "followon_" + a : "default"
        };
        if (c) {
            c = {
                utuid: b.uid,
                type: a
            };
            b.vid && (c.utvid = b.vid);
            b.eventLabel && (c.el = b.eventLabel);
            b.playerStyle && (c.ps = b.playerStyle);
            b.feature && (c.feature = b.feature);
            b.ppe && (c.ppe = b.ppe);
            var f = [],
                g;
            for (g in c) f.push(encodeURIComponent(g) + "=" + encodeURIComponent(c[g]));
            e.data = f.join(";")
        }
        if (d && "view" == a && b.vid && b.uid && (b.oeid || b.ieid)) b.oeid && (e.oeid = b.oeid), b.ieid && (e.ieid = b.ieid), e.evid = b.vid;
        d && (e.foc_id = b.uid);
        return Qc(Tc([b.baseUrl], e))
    }
    function Ld(a) {
        var b = Wb("CONVERSION_CONFIG_DICT");
        b && (a = Kd(a, b)) && Jd(a)
    };

    function Md(a, b, c, d, e, f, g) {
        var i, j;
        if (i = c.offsetParent) {
            var n = "HTML" == i.tagName || "BODY" == i.tagName;
            if (!n || "static" != md(i, "position")) j = qd(i), n || (n = (n = rd(i)) && Ta ? -i.scrollLeft : n && (!G || !eb("8")) ? i.scrollWidth - i.clientWidth - i.scrollLeft : i.scrollLeft, j = Fa(j, new E(n, i.scrollTop)))
        }
        i = j || new E;
        j = qd(a);
        n = td(a);
        j = new kd(j.x, j.y, n.width, n.height);
        if (n = pd(a)) {
            var m = new kd(n.left, n.top, n.right - n.left, n.bottom - n.top),
                n = Math.max(j.left, m.left),
                q = Math.min(j.left + j.width, m.left + m.width);
            if (n <= q) {
                var w = Math.max(j.top,
                m.top),
                    m = Math.min(j.top + j.height, m.top + m.height);
                w <= m && (j.left = n, j.top = w, j.width = q - n, j.height = m - w)
            }
        }
        n = hb(a);
        w = hb(c);
        if (n.a != w.a) {
            var q = n.a.body,
                w = w.a.parentWindow || w.a.defaultView,
                m = new E(0, 0),
                K = jb(q) ? jb(q)
                    .parentWindow || jb(q)
                    .defaultView : window,
                gc = q;
            do {
                var D;
                if (K == w) D = qd(gc);
                else {
                    D = gc;
                    var ha = new E;
                    if (1 == D.nodeType) {
                        if (D.getBoundingClientRect) {
                            var F = nd(D);
                            ha.x = F.left;
                            ha.y = F.top
                        } else {
                            var F = ob(hb(D)),
                                S = qd(D);
                            ha.x = S.x - F.x;
                            ha.y = S.y - F.y
                        }
                        Ta && !eb(12) && (F = h, F = h, G ? F = "-ms-transform" : H ? F = "-webkit-transform" : Sa ? F = "-o-transform" : Ta && (F = "-moz-transform"), S = h, F && (S = md(D, F)), S || (S = md(D, "transform")), S ? (D = S.match(yd), F = !D ? new E(0, 0) : new E(parseFloat(D[1]), parseFloat(D[2]))) : F = new E(0, 0), ha = new E(ha.x + F.x, ha.y + F.y))
                    } else F = "function" == ca(D.Z), S = D, D.targetTouches ? S = D.targetTouches[0] : F && D.Z()
                        .targetTouches && (S = D.Z()
                        .targetTouches[0]), ha.x = S.clientX, ha.y = S.clientY;
                    D = ha
                }
                m.x += D.x;
                m.y += D.y
            } while (K && K != w && (gc = K.frameElement) && (K = K.parent));
            q = Fa(m, qd(q));
            G && !nb(n) && (q = Fa(q, ob(n)));
            j.left += q.x;
            j.top += q.y
        }
        a = (b & 4 && rd(a) ? b ^ 2 : b) & -5;
        j = new E(a & 2 ? j.left + j.width : j.left, a & 1 ? j.top + j.height : j.top);
        j = Fa(j, i);
        e && (j.x += (a & 2 ? -1 : 1) * e.x, j.y += (a & 1 ? -1 : 1) * e.y);
        var x;
        if (g && (x = pd(c))) x.top -= i.y, x.right -= i.x, x.bottom -= i.y, x.left -= i.x;
        a: {
            b = x;
            a = j.u();
            e = 0;
            i = (d & 4 && rd(c) ? d ^ 2 : d) & -5;
            x = td(c);
            d = x.u();
            if (f || 0 != i) i & 2 ? a.x -= d.width + (f ? f.right : 0) : f && (a.x += f.left), i & 1 ? a.y -= d.height + (f ? f.bottom : 0) : f && (a.y += f.top);
            if (g) {
                if (b) {
                    f = a;
                    e = 0;
                    if (65 == (g & 65) && (f.x < b.left || f.x >= b.right)) g &= -2;
                    if (132 == (g & 132) && (f.y < b.top || f.y >= b.bottom)) g &= -5;
                    f.x < b.left && g & 1 && (f.x = b.left, e |= 1);
                    f.x < b.left && (f.x + d.width > b.right && g & 16) && (d.width = Math.max(d.width - (f.x + d.width - b.right), 0), e |= 4);
                    f.x + d.width > b.right && g & 1 && (f.x = Math.max(b.right - d.width, b.left), e |= 1);
                    g & 2 && (e |= (f.x < b.left ? 16 : 0) | (f.x + d.width > b.right ? 32 : 0));
                    f.y < b.top && g & 4 && (f.y = b.top, e |= 2);
                    f.y >= b.top && (f.y + d.height > b.bottom && g & 32) && (d.height = Math.max(d.height - (f.y + d.height - b.bottom), 0), e |= 8);
                    f.y + d.height > b.bottom && g & 4 && (f.y = Math.max(b.bottom - d.height, b.top), e |= 2);
                    g & 8 && (e |= (f.y < b.top ? 64 : 0) | (f.y + d.height > b.bottom ? 128 : 0));
                    g = e
                } else g = 256;
                e = g;
                if (e & 496) {
                    c = e;
                    break a
                }
            }
            f = Ta && (Na || Va) && eb("1.9");
            a instanceof E ? (g = a.x, a = a.y) : (g = a, a = h);
            c.style.left = sd(g, f);
            c.style.top = sd(a, f);
            if (!(x == d || (!x || !d ? 0 : x.width == d.width && x.height == d.height))) f = nb(hb(jb(c))), G && (!f || !eb("8")) ? (g = c.style, f ? (G ? (f = vd(c, ld(c, "paddingLeft")), x = vd(c, ld(c, "paddingRight")), a = vd(c, ld(c, "paddingTop")), b = vd(c, ld(c, "paddingBottom")), f = new jd(a, x, b, f)) : (f = V(c, "paddingLeft"), x = V(c, "paddingRight"), a = V(c, "paddingTop"), b = V(c, "paddingBottom"), f = new jd(parseFloat(a),
            parseFloat(x), parseFloat(b), parseFloat(f))), G ? (x = xd(c, "borderLeft"), a = xd(c, "borderRight"), b = xd(c, "borderTop"), c = xd(c, "borderBottom"), c = new jd(b, a, c, x)) : (x = V(c, "borderLeftWidth"), a = V(c, "borderRightWidth"), b = V(c, "borderTopWidth"), c = V(c, "borderBottomWidth"), c = new jd(parseFloat(b), parseFloat(a), parseFloat(c), parseFloat(x))), g.pixelWidth = d.width - c.left - f.left - f.right - c.right, g.pixelHeight = d.height - c.top - f.top - f.bottom - c.bottom) : (g.pixelWidth = d.width, g.pixelHeight = d.height)) : (c = c.style, Ta ? c.MozBoxSizing = "border-box" : H ? c.WebkitBoxSizing = "border-box" : c.boxSizing = "border-box", c.width = Math.max(d.width, 0) + "px", c.height = Math.max(d.height, 0) + "px");
            c = e
        }
        return c
    };

    function Nd() {}
    ka(Nd, Ed);
    ba(Nd);
    Nd.prototype.a = "tooltip";
    y("yt.pubsub.publish", id);

    function Od(a) {
        var b = {
            channel: "c",
            all: "a"
        };
        return b[a] || b.channel
    };

    function Pd() {}
    ka(Pd, Ed);

    function Qd(a, b, c) {
        var d = Z(a, "card"),
            e = d + Gb(c),
            f = I(e);
        if (f) return f;
        var g = Rd(a, c);
        if (!g) return l;
        f = document.createElement("div");
        f.id = e;
        f.className = d;
        (c = P(c, "card-class")) && Ba(f, c);
        c = document.createElement("div");
        c.className = Z(a, "card-border");
        b = P(b, "orientation") || "horizontal";
        d = document.createElement("div");
        d.className = "yt-uix-card-border-arrow yt-uix-card-border-arrow-" + b;
        e = document.createElement("div");
        e.className = Z(a, "card-body");
        a = document.createElement("div");
        a.className = "yt-uix-card-body-arrow yt-uix-card-body-arrow-" + b;
        lb(g);
        e.appendChild(g);
        c.appendChild(a);
        c.appendChild(e);
        f.appendChild(d);
        f.appendChild(c);
        document.body.appendChild(f);
        return f
    }

    function Sd(a, b, c) {
        var d = P(b, "orientation") || "horizontal",
            e = P(b, "position"),
            f = !! P(b, "force-position"),
            d = "horizontal" == d,
            g = "bottomright" == e || "bottomleft" == e,
            e = "topright" == e || "bottomright" == e,
            i, j;
        e && g ? (j = 7, i = 4) : e && !g ? (j = 6, i = 5) : !e && g ? (j = 5, i = 6) : (j = 4, i = 7);
        var n = rd(document.body),
            m = rd(b);
        n != m && (j ^= 2);
        var q;
        d ? (m = b.offsetHeight / 2 - 12, q = new E(-12, b.offsetHeight + 6)) : (m = b.offsetWidth / 2 - 6, q = new E(b.offsetWidth + 6, - 12));
        var w = td(c),
            m = Math.min(m, (d ? w.height : w.width) - 24 - 6);
        6 > m && (m = 6, d ? q.y += 12 - b.offsetHeight / 2 : q.x += 12 - b.offsetWidth / 2);
        var K = l;
        f || (K = 10);
        w = Z(a, "card-flip");
        a = Z(a, "card-reverse");
        C(c, w, e);
        C(c, a, g);
        K = Md(b, j, c, i, q, l, K);
        !f && K && (K & 48 && (e = !e, j ^= 2, i ^= 2), K & 192 && (g = !g, j ^= 1, i ^= 1), C(c, w, e), C(c, a, g), Md(b, j, c, i, q));
        b = L("yt-uix-card-body-arrow", c);
        c = L("yt-uix-card-border-arrow", c);
        d = d ? g ? "top" : "bottom" : !n && e || n && !e ? "left" : "right";
        b.setAttribute("style", "");
        c.setAttribute("style", "");
        b.style[d] = m + "px";
        c.style[d] = m + "px"
    }
    Pd.prototype.B = function (a) {
        var b = M(a, l, Z(this));
        if (b && (a = Qd(this, a, b))) Da(b, Z(this, "active")), Da(a, Z(this, "card-visible")), W(a), a.cardTargetNode = l, a.cardRootNode = l
    };

    function Rd(a, b) {
        var c = b.cardContentNode;
        if (!c) {
            var d = Z(a, "content"),
                e = Z(a, "card-content"),
                f = c = L(d, b),
                g = Aa(f);
            if (u(d)) {
                var i = g,
                    d = sa(i, d);
                0 <= d && z.splice.call(i, d, 1)
            } else da(d) && (g = Ea(g, d));
            u(e) && !(0 <= sa(g, e)) ? g.push(e) : da(e) && Ca(g, e);
            f.className = g.join(" ");
            b.cardContentNode = c
        }
        return c
    };

    function Td() {}
    ka(Td, Pd);
    ba(Td);
    Td.prototype.a = "hovercard";

    function Ud(a, b, c) {
        this.f = a;
        this.g = b;
        this.a = !! c;
        this.b = p;
        this.e = [];
        this.i = []
    }
    r = Ud.prototype;
    r.init = function () {
        var a = M(this.f, l, "yt-subscription-button-hovercard"),
            b = v(this.ma, this),
            c = v(this.na, this),
            b = Q(a, "mouseenter", b);
        this.e.push(b);
        b = Q(a, "mouseleave", c);
        this.e.push(b)
    };
    r.B = function () {
        Td.getInstance()
            .B(this.f)
    };
    r.ma = function () {
        this.b = k;
        if (this.a) {
            var a = v(this.T, this),
                a = Yb(a, 500);
            this.i.push(a)
        }
    };
    r.na = function () {
        this.b = p
    };
    r.T = function () {
        var a = Td.getInstance(),
            b;
        if (b = !this.aa) b = M(this.f, l, Z(a)), b = !b ? p : B(b, Z(a, "active"));
        b && (this.aa = k, b = {
            session_token: T("subscription_ajax")
        }, b[Od()] = this.g, U("/subscription_ajax", {
            method: "POST",
            h: {
                hovercard: 1,
                action_get_subscription_form_for_channel: 1
            },
            m: b,
            M: this,
            l: function (b, d) {
                var e = this.f,
                    f = d.response.html_content,
                    g = M(e, l, Z(a));
                if (g) {
                    var i = Rd(a, g);
                    i && (i.innerHTML = f, B(g, Z(a, "active")) && (f = Qd(a, e, g), Sd(a, e, f), Ad(f)))
                }
                this.n()
            },
            onError: function () {
                this.aa = p
            }
        }))
    };
    r.n = function () {
        var a = Td.getInstance(),
            b = M(this.f, l, Z(a)),
            c = Rd(a, b);
        A(c.getElementsByTagName("input"), function (a) {
            var b = v(function () {
                var a = c.getElementsByTagName("form")[0],
                    b = {};
                b.method = a.method.toUpperCase();
                if ("POST" == b.method) {
                    var d = [];
                    Gc(a, d, Jc);
                    b.fa = d.join("&")
                } else {
                    var e = new Dc;
                    Gc(a, e, Ic);
                    Fc(e);
                    for (var d = {}, n = 0; n < e.a.length; n++) {
                        var m = e.a[n];
                        d[m] = e.b[m]
                    }
                    e = b.h || {};
                    Ia(e, d);
                    b.h = e
                }
                U(a.action, b)
            }, this),
                a = Q(a, "change", b);
            this.e.push(a)
        }, this)
    };

    function Vd(a) {
        this.d = a;
        this.type = P(a, "subscription-type") || "channel";
        this.z = P(a, "subscription-value") || "";
        this.b = !! P(a, "enable-tooltip");
        this.j = P(a, "enable-hovercard") ? new Ud(this.d, this.z) : l;
        this.A = p;
        this.e = [];
        this.a = [];
        this.F = P(this.d, "sessionlink") || "";
        this.n()
    }
    function Wd(a) {
        a = J("yt-subscription-button-js-default", a);
        A(a, function (a) {
            P(a, "subscription-initialized") || (new Vd(a), O(a, "subscription-initialized", "true"))
        })
    }
    var Xd = [];

    function $(a) {
        return P(a.d, "subscription-id") || l
    }

    function Yd(a, b) {
        b ? O(a.d, "subscription-id", b) : Eb(a.d, "subscription-id");
        Zd(a)
    }

    function Zd(a) {
        var b = a.d;
        (b.dataset ? Db("subscription-button-type") in b.dataset : b.hasAttribute ? b.hasAttribute("data-subscription-button-type") : b.getAttribute("data-subscription-button-type")) ? (b = "-" + P(a.d, "subscription-button-type"), C(a.d, "yt-uix-button-subscribed" + b, !! $(a)), C(a.d, "yt-uix-button-subscribe" + b, !$(a))) : C(a.d, "subscribed", !! $(a));
        $(a) ? (b = M(a.d, l, "yt-uix-button-subscription-container"), Pb(b, "mouseleave", v(function () {
            Ba(this.d, "hover-enabled")
        }, a))) : Da(a.d, "hover-enabled");
        B(a.d, "yt-uix-button-link") && ($(a) ? $d(a) : ae(a));
        if (a.j) {
            var b = a.j,
                c = !! $(a),
                d = Z(Td.getInstance(), "target");
            C(b.f, d, c);
            b = a.j;
            c = !! $(a);
            (b.a = c) || b.B()
        }
        if (a.b && (b = ($(a) ? "un" : "") + "subscribe-tooltip", b = P(a.d, b) || "", Nd.getInstance(), a = a.d, O(a, "tooltip-text", b), a = P(a, "content-id"), a = I(a))) a.innerHTML = b
    }
    r = Vd.prototype;
    r.n = function () {
        this.e.push(Q(this.d, "click", v(this.ga, this)));
        this.a.push(hd("SUBSCRIBE", this.ha, this));
        this.a.push(hd("UNSUBSCRIBE", this.ia, this));
        this.j && this.j.init();
        Xd.push(this);
        Zd(this)
    };

    function be(a, b, c, d) {
        c != $(a) && a.z == b && Yd(a, c);
        d == a && a.j && a.j.B()
    }
    r.ga = function (a) {
        if (this.A) return p;
        a.preventDefault();
        var b = Nd.getInstance();
        if (a = this.d) {
            var c = I(Z(b) + Gb(a));
            if (c) {
                var d = (b = I("yt-uix-tooltip-shared-mask")) && mb(b, function (a) {
                    return a == c
                }, p, 2);
                b && d && (b.parentNode.removeChild(b), W(b), document.body.appendChild(b));
                lb(c);
                Eb(a, "content-id")
            }
        }
        $(this) ? this.ba() : this.L()
    };

    function $d(a) {
        "BUTTON" == a.d.tagName && Ba(a.d.parentNode, "yt-subscription-button-disabled-mask-container");
        a.d.disabled = k
    }
    function ae(a) {
        Da(a.d.parentNode, "yt-subscription-button-disabled-mask-container");
        a.d.disabled = p
    }
    r.L = function () {
        var a = this.type,
            b = this.z,
            c = P(this.d, "subscription-feature");
        this.A = k;
        $d(this);
        if (T("subscription_ajax")) {
            var d, e = this;
            d = a || "channel";
            var a = {}, f = {
                channel: "channel",
                all: "all"
            };
            a["action_create_subscription_to_" + (f[d] || f.channel)] = 1;
            c && (a.feature = c);
            e && e.F && (c = Xc("/subscription_ajax", a), f = Vc(e.F), Gd(c, f));
            c = Od(d);
            d = {};
            d.session_token = T("subscription_ajax");
            d[c] = b;
            (c = Wb("PLAYBACK_ID")) && (d.plid = c);
            U("/subscription_ajax", {
                method: "POST",
                h: a,
                m: d,
                l: function (a, c) {
                    id("SUBSCRIBE", b, c, e)
                },
                r: function () {
                    e && e.D()
                }
            });
            Ld("subscribe")
        } else if (!this.d.getAttribute("href")) {
            var g = v(this.ka, this),
                a = Uc("/signin?context=popup", "next", document.location.protocol + "//" + document.domain + "/post_login"),
                a = Uc(a, "feature", "sub_button");
            if (a = window.open(a, "loginPopup", "width=375,height=440,resizable=yes,scrollbars=yes", k)) d = hd("LOGGED_IN", function (a) {
                var b = Wb("LOGGED_IN_PUBSUB_KEY", b),
                    c = aa("yt.pubsub.instance_");
                c && ("number" == typeof b && (b = [b]), A(b, function (a) {
                    c.unsubscribeByKey(a)
                }));
                g(a)
            }), Ub("LOGGED_IN_PUBSUB_KEY", d),
            a.moveTo((screen.width - 375) / 2, (screen.height - 440) / 2)
        }
    };
    r.ka = function (a) {
        Xb("subscription_ajax", a.subscription_ajax);
        this.L()
    };
    r.D = function () {
        this.A = p;
        B(this.d, "yt-uix-button-link") || ae(this)
    };
    r.ba = function () {
        var a = {
            s: $(this),
            session_token: T("subscription_ajax")
        }, b = {
            action_remove_subscriptions: 1
        }, c = P(this.d, "subscription-feature");
        c && (b.feature = c);
        (c = Wb("PLAYBACK_ID")) && (a.plid = c);
        this.A = k;
        $d(this);
        if (this.F) {
            var c = Xc("/subscription_ajax", b),
                d = Vc(this.F);
            Gd(c, d)
        }
        U("/subscription_ajax", {
            method: "POST",
            M: this,
            h: b,
            m: a,
            l: function (a, b) {
                Yd(this, l);
                if (this.j) {
                    var c = this.j;
                    c.a = p;
                    c.B()
                }
                id("UNSUBSCRIBE", this.z, b, this)
            },
            r: function () {
                this.A = p;
                ae(this)
            }
        });
        Ld("unsubscribe")
    };
    r.ha = function (a, b, c) {
        b = b.response.id;
        be(this, a, b, c);
        if (a == this.z && (Yd(this, b), this.j && (a = this.j, a.b))) {
            var c = Td.getInstance(),
                b = a.f,
                d = M(b, l, Z(c));
            if (d) {
                Ba(d, Z(c, "active"));
                var e = Qd(c, b, d);
                if (e) {
                    e.cardTargetNode = b;
                    e.cardRootNode = d;
                    Sd(c, b, e);
                    var f = Z(c, "card-visible"),
                        g = P(b, "card-delegate-show") && P(d, "card-action");
                    c.b(d, "card-action", b);
                    W(e);
                    Yb(function () {
                        g || Ad(e);
                        Ba(e, f)
                    }, 10)
                }
            }
            a.T()
        }
    };
    r.ia = function (a, b) {
        be(this, a, b.response.id, this)
    };
    var ce = {};

    function de(a) {
        function b(a, b) {
            var e = P(a, "group-key");
            if (e) {
                var f = a,
                    f = I(f),
                    e = e || f[ea] || (f[ea] = ++fa),
                    g = ce[e];
                g && (ce[e] = ta(g, function (a) {
                    return a[0] != f
                }));
                Eb(a, "group-key")
            }
            a.src = b
        }
        a = kb("img", l, a);
        A(a, function (a) {
            var d = P(a, "thumb");
            d && b.call(s, a, d)
        })
    };
    var ee, fe, ge, he, ie, je = p;

    function ke(a) {
        var b = P(a.currentTarget, "action");
        le[b](a.currentTarget)
    }
    var le = {
        hide: function (a, b) {
            var c = M(a, l, "feed-item-dismiss-menu");
            c || (c = M(a, l, "feed-item-action-menu"));
            var d = P(c, "external-id");
            b ? b(d) : U("/guide_ajax?action_dismiss_item=1", {
                method: "POST",
                m: {
                    session_token: T("guide_ajax"),
                    external_id: d
                }
            });
            c = M(c, l, "feed-item-container");
            me(c);
            d = M(c, "li");
            d = L("feed-item-dismissal-hide", d);
            Ad(d);
            ne(c)
        },
        uploads: function (a) {
            var b = P(a, "subscription-id");
            if (b) {
                var c = !B(a, "checked");
                C(a, "checked", c);
                U("/subscription_ajax?action_update_subscription_preferences=1", {
                    method: "POST",
                    m: {
                        modify_uploads_only: k,
                        uploads_only: c,
                        session_token: T("subscription_ajax"),
                        subscription_id: b
                    }
                });
                a = M(a, l, "feed-item-container");
                me(a);
                b = M(a, "li");
                L("feed-item-dismissal-uploads", b);
                L("feed-item-dismissal-all-activity", b);
                b = c ? L("feed-item-dismissal-uploads", b) : L("feed-item-dismissal-all-activity", b);
                Ad(b);
                oe(a, function (a) {
                    a = L("feed-item-dismiss-menu", a);
                    a = L("uploads", a);
                    C(a, "checked", c)
                })
            }
        },
        subscribe: function (a) {
            var b = M(a, l, "feed-item-container"),
                a = P(b, "channel-key");
            U("/subscription_ajax?action_create_subscription_to_channel=1", {
                method: "POST",
                m: {
                    session_token: T("subscription_ajax"),
                    c: a
                },
                l: function (a, d) {
                    oe(b, function (a) {
                        var a = L("feed-item-dismiss-menu", a),
                            b = L("unsubscribe", a);
                        O(b, "subscription-id", d.response.id);
                        Ba(a, "subscribed")
                    })
                }
            })
        },
        unsubscribe: function (a) {
            var b = P(a, "subscription-id");
            b && (U("/subscription_ajax?action_remove_subscription=1", {
                method: "POST",
                m: {
                    session_token: T("subscription_ajax"),
                    subscription_id: b
                }
            }), a = M(a, l, "feed-item-container"), me(a), b = M(a, "li"), b = L("feed-item-dismissal-unsubscribe", b), Ad(b), oe(a, function (a) {
                ne(a)
            }))
        }
    };

    function oe(a, b) {
        var c = P(a, "channel-key"),
            d = J("feed-item-container");
        A(d, function (a) {
            P(a, "channel-key") == c && b(a)
        })
    }
    function me(a) {
        a = M(a, "li");
        a = J("feed-item-dismissal", a);
        W.apply(l, a)
    }
    function ne(a) {
        Ac(a, {
            duration: 0.3,
            r: function () {
                W(a)
            }
        })
    };

    function pe(a) {
        var a = a.v,
            b;
        for (b in a) {
            var c = I(b + "-connected");
            if (c) {
                var d = a[b],
                    e = I(b + "-not-connected"),
                    f = I(b + "-display-name"),
                    g = d.is_connected;
                zd(c, g);
                zd(e, !g);
                c = f;
                d = d.connected_as || "";
                if ("textContent" in c) c.textContent = d;
                else if (c.firstChild && 3 == c.firstChild.nodeType) {
                    for (; c.lastChild != c.firstChild;) c.removeChild(c.lastChild);
                    c.firstChild.data = d
                } else {
                    e = c;
                    for (f = h; f = e.firstChild;) e.removeChild(f);
                    c.appendChild(jb(c)
                        .createTextNode(d))
                }
            }
        }
    }

    function qe(a, b) {
        if (b) {
            var c = Kb(b),
                d = a.parentNode;
            d && d.replaceChild(c, a);
            de(c);
            Wd(c);
            zc(c, {
                duration: 0.3
            })
        } else re(a)
    }
    function se(a, b, c) {
        a = c.d;
        if (Jb(a, ee)) {
            var d = M(a, "li"),
                a = M(d, "ul"),
                a = J("guide-recommendation-item", a),
                a = ua(a, function (a) {
                    return P(a, "external-id")
                });
            U("/guide_ajax?action_load_channel_rec=1", {
                method: "POST",
                h: {},
                m: {
                    session_token: T("guide_ajax"),
                    shown_ids: a.join()
                },
                l: function (a, b) {
                    qe(d, b.new_suggested_html)
                },
                onError: function () {
                    re(d)
                }
            })
        }
    }

    function te(a) {
        a.preventDefault();
        var b = M(a.currentTarget, l, "guide-recommendation-item"),
            a = B(b, "featured"),
            c = P(b, "external-id"),
            d = M(b, "li"),
            b = M(d, "ul"),
            b = J("guide-recommendation-item", b),
            b = ua(b, function (a) {
                return P(a, "external-id")
            }),
            e = {};
        a && (e.featured = 1);
        U("/guide_ajax?action_dismiss_channel=1", {
            method: "POST",
            h: e,
            m: {
                session_token: T("guide_ajax"),
                dismissed_id: c,
                shown_ids: b.join()
            },
            l: function (a, b) {
                qe(d, b.new_suggested_html)
            },
            onError: function () {
                re(d)
            }
        })
    }

    function ue(a) {
        a.preventDefault();
        var b = M(a.currentTarget, l, "recommended-video-item"),
            a = P(b, "video-id");
        U("/guide_ajax?action_dismiss_video=1", {
            method: "POST",
            m: {
                session_token: T("guide_ajax"),
                video_id: a
            },
            l: function () {
                re(b)
            },
            onError: function () {
                re(b)
            }
        })
    }
    function re(a) {
        Ac(a, {
            duration: 0.3,
            r: function () {
                lb(a)
            }
        })
    }
    function ve(a) {
        if (!M(a.target, l, "guide-item-action")) {
            var a = a.currentTarget,
                b = we(a);
            xe(b.pa, b.qa, a)
        }
    }

    function we(a) {
        var b = P(a, "feed-name") || l,
            c = P(a, "feed-type") || l,
            a = J("guide-item", ee);
        A(a, function (a) {
            var e = P(a, "feed-name"),
                f = P(a, "feed-type"),
                e = !! b && e == b && f == c;
            C(a, "selected", e);
            (a = M(a, l, "guide-item-container")) && C(a, "selected-child", e)
        });
        return {
            qa: c,
            pa: b
        }
    }

    function ye(a) {
        var b = M(a.currentTarget, l, "feed-container"),
            c = M(b, l, "individual-feed"),
            a = P(c, "feed-name") || l,
            c = P(c, "feed-type") || l,
            d = P(b, "filter-type") || l,
            e = P(b, "view-type") || l,
            f = P(b, "paging") || l,
            c = ze(a, c, d, e, f),
            a = c.url,
            c = c.h,
            g = L("feed-load-more-container", b);
        Ba(g, "loading");
        U(a, {
            h: c,
            format: "JSON",
            l: function (a, c) {
                if (2 == Wb("GUIDE_VERSION")) {
                    var d = L("last", b);
                    Da(d, "last")
                }
                d = Kb(c.feed_html);
                g.parentNode && g.parentNode.insertBefore(d, g);
                de(d);
                Da(g, "loading");
                c.paging ? O(b, "paging", c.paging) : W(g);
                W(ie)
            },
            onError: function () {
                Da(g, "loading");
                Ad(ie)
            }
        })
    }
    function Ae(a) {
        var b = M(a.currentTarget, l, "individual-feed"),
            c = L("feed-view-button", b),
            d = P(b, "feed-name") || l,
            e = P(b, "feed-type") || l,
            a = a.currentTarget.checked ? "u" : l,
            c = c && P(c, "view-type") || l;
        wb.getInstance();
        "u" == a ? (Bb(Cb.P, p), Bb(Cb.Q, k)) : (Bb(Cb.P, p), Bb(Cb.Q, p));
        var f = [],
            g;
        for (g in N) f.push(g + "=" + escape(N[g]));
        ub("PREF", f.join("&"), 31536E4);
        Be(b, d, e, a, c)
    }

    function Ce(a) {
        var b = l,
            b = M(a.currentTarget, l, "individual-feed"),
            c = P(b, "feed-name") || l,
            d = P(b, "feed-type") || l,
            e = P(a.currentTarget, "filter-type") || l,
            a = J("user-feed-filter", b);
        A(a, function (a) {
            var b = P(a, "filter-type") || l;
            C(a, "selected", e == b)
        });
        Be(b, c, d, e, l)
    }

    function De(a) {
        var b = P(a.currentTarget, "feed-name") || l,
            c = P(a.currentTarget, "feed-type") || l,
            d = I(["feed", c, b].join("-")),
            e = L("feed-view-button", d),
            f = L("feed-filter", d)
                .checked ? "u" : l,
            a = P(a.currentTarget, "view-type") || l;
        O(e, "view-type", a || "");
        a ? ub("feed_view", a || "") : tb.remove("feed_view", "/", "youtube.com");
        Ee(a);
        Be(d, b, c, f, a)
    }
    function Ee(a) {
        var b = J("feed-view-choice");
        A(b, function (b) {
            var d = P(b, "view-type") || l;
            C(b, "checked", a == d)
        })
    }

    function Be(a, b, c, d, e) {
        var f = J("feed-container", a);
        A(f, function (a) {
            W(a)
        });
        W(ie);
        O(a, "last-clicked-filter", d || "");
        O(a, "last-clicked-view", e || "");
        if (f = va(f, function (a) {
            var b = P(a, "filter-type") || l,
                a = P(a, "view-type") || l;
            return b == d && a == e
        })) Ad(f), Fe(a);
        else {
            var g = document.createElement("div");
            g.className = "feed-container";
            g.innerHTML = he.innerHTML;
            O(g, "filter-type", d || "");
            a.appendChild(g);
            b = ze(b, c, d, e);
            U(b.url, {
                h: b.h,
                format: "JSON",
                l: function (b, c) {
                    var f = Kb(c.feed_html),
                        m = L("before-feed-content", a);
                    m.parentNode && m.parentNode.insertBefore(f, m.nextSibling);
                    de(f);
                    lb(g);
                    c.paging && O(f, "paging", c.paging);
                    var m = P(a, "last-clicked-filter") || l,
                        q = P(a, "last-clicked-view") || l;
                    (m != d || q != e) && W(f);
                    W(ie)
                },
                onError: function () {
                    lb(g);
                    Ad(ie)
                }
            })
        }
    }

    function xe(a, b, c) {
        var d = J("individual-feed", ge);
        A(d, function (a) {
            W(a)
        });
        var e = ["feed", b, a].join("-"),
            f = I(e);
        O(ee, "last-clicked-item", e);
        f ? Fe(f) : (f = document.createElement("div"), f.id = e, f.className = "individual-feed", f.innerHTML = he.innerHTML, O(f, "feed-name", a || ""), O(f, "feed-type", b || ""), ge.appendChild(f), a = ze(a, b), U(a.url, {
            h: a.h,
            format: "JSON",
            l: function (a, b) {
                f.innerHTML = b.feed_html;
                de(f);
                Wd(f);
                P(ee, "last-clicked-item") == e && Fe(f);
                b.is_ypc_enabled && id("ypc-delayedloader-load", function () {
                    id("guide-feed-loaded",
                    f)
                });
                if (c) {
                    var d = L("guide-count", c);
                    d && lb(d)
                }
            },
            onError: function () {
                Ad(ie);
                lb(f)
            }
        }))
    }
    function Fe(a) {
        zc(a, {
            duration: 0.5
        });
        Ad(a)
    }

    function ze(a, b, c, d, e) {
        var f = "",
            g = {};
        "chart" == b ? (f = "/guide_ajax?action_load_chart_feed=1", g = {
            chart_name: a
        }) : "personal" == b ? (f = "/guide_ajax?action_load_personal_feed=1", g = {
            feed_name: a
        }) : "show" == b ? (f = "/guide_ajax?action_load_show_feed=1", g = {
            show_id: a
        }) : "social" == b ? (f = "/guide_ajax?action_load_social_feed=1", g = {
            feed_name: a
        }) : "system" == b ? (f = "/guide_ajax?action_load_system_feed=1", g = {
            feed_name: a
        }) : "main" == b ? f = "/guide_ajax?action_load_main_feed=1" : "topic" == b ? (f = "/guide_ajax?action_load_topic_feed=1", g = {
            topic_id: a
        }) : "user" == b && (f = "/guide_ajax?action_load_user_feed=1", g = {
            user_id: a
        });
        c && (g.filter_type = c);
        d && (g.view_type = d);
        e && (g.paging = e);
        Wb("FEED_DEBUG") && (g.debug = 1);
        return {
            url: f,
            h: g
        }
    };

    function Ge(a) {
        this.a = a;
        a = l;
        if (!a) {
            var b = [],
                c = {};
            this.a.replace(He, function (a, e) {
                e in c || (c[e] = k, b.push(e))
            });
            a = b
        }
        a = la("__%s__", "(" + a.join("|") + ")");
        this.b = RegExp(a, "g")
    }
    var He = /__([a-z]+(?:_[a-z]+)*)__/g;

    function Ie(a) {
        a = I(a)
            .innerHTML;
        a = a.replace(/^\s*(<\!--\s*)?/, "");
        a = a.replace(/(\s*--\>)?\s*$/, "");
        return new Ge(a)
    }
    function Je(a, b) {
        var c = v(function (a, c) {
            return ma(b[c] || "")
        }, a);
        return a.a.replace(a.b, c)
    };

    function Ke() {}
    ka(Ke, Ed);
    ba(Ke);
    Ke.prototype.a = "button";
    var Le, Me, Ne, Oe, Pe;

    function Qe(a) {
        a = {
            sort: P(a.target, "sort-type")
        };
        a = Qc(Tc(["/subscription_manager/friends"], a));
        window.location = Qc(Tc([a], {})) + ""
    }
    function Re(a) {
        if (!M(a.target, "button") && !M(a.target, "a") && (a = P(a.currentTarget, "href"))) window.location = Qc(Tc([a], {})) + ""
    }
    function Se(a, b, c) {
        a = c.d;
        Jb(a, Le) && (a = M(a, l, "subscription-item"), c = !$(c), C(a, "unsubscribed", c), c && B(a, "pinned") && (C(a, "pinned", p), Te()))
    }

    function Ue(a) {
        var b = M(a.currentTarget, l, "subscription-item");
        if (!P(b, "loading")) {
            O(b, "loading", "true");
            var a = P(b, "subscription-id"),
                c = !B(b, "pinned");
            if (!c || J("pinned", Le)
                .length < Pe) {
                C(b, "pinned", c);
                Te();
                var d = {};
                c && (d.pinned = "true");
                U("/subscription_ajax?action_update_subscription_pinned=1", {
                    format: "JSON",
                    method: "POST",
                    h: d,
                    m: {
                        session_token: T("subscription_ajax"),
                        subscription_id: a
                    },
                    onError: function () {
                        C(b, "pinned", !c);
                        Te()
                    },
                    r: function () {
                        Eb(b, "loading")
                    }
                })
            }
        }
    }

    function Te() {
        var a = J("pinned", Le),
            b = (a || J("pinned", Le))
                .length < Pe;
        C(Le, "can-pin-more", b);
        for (var b = ua(a, function (a) {
            var b = P(a, "subscription-id"),
                c = L("subscription-title", a)
                    .innerHTML,
                a = a.getElementsByTagName("img")[0],
                a = P(a, "thumb") || a.src;
            return Je(Ne, {
                subscription_id: b,
                display_name: c,
                profile_image_url: a
            })
        }), a = Pe - a.length, c = Je(Oe, {}), d = 0; d < a; d++) b.push(c);
        Me.innerHTML = b.join("")
    };
    y("yt.www.guide.init", function () {
        ee = L("guide");
        1 == Wb("GUIDE_VERSION") && R(ee, ve, "guide-item");
        Wd(ee);
        hd("SUBSCRIBE", se);
        R(ee, te, "guide-subscription-dismiss");
        ge = I("feed");
        he = I("feed-loading-template");
        ie = I("feed-error");
        R(ge, ye, "feed-load-more");
        var a = ge,
            b = L("yt-uix-button-menu-short", ge);
        R(a, Ae, "feed-filter");
        R(a, Ce, "user-feed-filter");
        R(b, De, "feed-view-choice");
        fe = I("video-sidebar");
        R(fe, ue, "recommended-video-dismiss");
        if ((a = ge) && !je) je = k, R(a, ke, "dismiss-menu-choice");
        wb.getInstance();
        var a = L("individual-feed",
        ge),
            b = L("feed-filter", a),
            c = L("feed-view-button", a);
        if (b && c) {
            var d = P(a, "feed-name") || l,
                e = P(a, "feed-type") || l,
                f = L("feed-container", a),
                g = P(f, "filter-type") || l,
                i = P(f, "view-type") || l,
                f = vb("feed_view") || l,
                j = Ab(Cb.P),
                j = Ab(Cb.Q) && !j ? "u" : l;
            if (g != j || i != f) b.checked = "u" == j, g = Fd.getInstance(), g = M(b, l, Z(g, "checkbox-container")), b.checked && B(g, "partial") && (b.checked = p, b.a = p, Da(g, "partial")), C(g, "checked", b.checked), O(c, "view-type", f || ""), Ee(f), Be(a, d, e, j, f)
        }
    });
    y("yt.www.guide.initAutoshare", function (a, b) {
        var c = new X(T("autoshare"), b, 0, l, k);
        c.ca(pe);
        var d = I("facebook-connect-button");
        d && c.e(d, "facebook", k);
        (d = I("twitter-connect-button")) && c.e(d, "twitter", k);
        (d = I("orkut-connect-button")) && c.e(d, "orkut", k);
        window.autoshare = c
    });
    y("yt.www.guide.loadSocialPanel", function () {
        we(I("social-guide-item"));
        xe("connect", "social")
    });
    y("yt.www.guide.subscriptionmanager.init", function () {
        Le = I("subscription-manager-list");
        R(Le, Ue, "subscription-pin");
        R(Le, Re, "subscription-item");
        var a = I("sort-button");
        if (a) {
            var b = Ke.getInstance();
            if (!a.widgetMenu) {
                var c = P(a, "button-menu-id"),
                    c = c && I(c),
                    d = Z(b, "menu");
                c ? (Ba(c, d), Ba(c, Z(b, "menu-external"))) : c = L(d, a);
                a.widgetMenu = c
            }
            R(a.widgetMenu, Qe, "friend-sort")
        }
        if (Me = a = I("pinned-subscriptions")) a = P(a, "max-pinned"), Pe = parseInt(a, 10), a = I("pinned-channel-template"), Ne = Ie(a), a = I("pinned-channel-placeholder-template"),
        Oe = Ie(a);
        Wd(Le);
        hd("SUBSCRIBE", Se);
        hd("UNSUBSCRIBE", Se)
    });
})();