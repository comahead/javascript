

/**
 * @private
 */
Ext.define('Ext.fx.CubicBezier', {

    /* Begin Definitions */

    singleton: true,

    /* End Definitions */

    cubicBezierAtTime: function(t, p1x, p1y, p2x, p2y, duration) {
        var cx = 3 * p1x,
            bx = 3 * (p2x - p1x) - cx,
            ax = 1 - cx - bx,
            cy = 3 * p1y,
            by = 3 * (p2y - p1y) - cy,
            ay = 1 - cy - by;
        function sampleCurveX(t) {
            return ((ax * t + bx) * t + cx) * t;
        }
        function solve(x, epsilon) {
            var t = solveCurveX(x, epsilon);
            return ((ay * t + by) * t + cy) * t;
        }
        function solveCurveX(x, epsilon) {
            var t0, t1, t2, x2, d2, i;
            for (t2 = x, i = 0; i < 8; i++) {
                x2 = sampleCurveX(t2) - x;
                if (Math.abs(x2) < epsilon) {
                    return t2;
                }
                d2 = (3 * ax * t2 + 2 * bx) * t2 + cx;
                if (Math.abs(d2) < 1e-6) {
                    break;
                }
                t2 = t2 - x2 / d2;
            }
            t0 = 0;
            t1 = 1;
            t2 = x;
            if (t2 < t0) {
                return t0;
            }
            if (t2 > t1) {
                return t1;
            }
            while (t0 < t1) {
                x2 = sampleCurveX(t2);
                if (Math.abs(x2 - x) < epsilon) {
                    return t2;
                }
                if (x > x2) {
                    t0 = t2;
                } else {
                    t1 = t2;
                }
                t2 = (t1 - t0) / 2 + t0;
            }
            return t2;
        }
        return solve(t, 1 / (200 * duration));
    },

    cubicBezier: function(x1, y1, x2, y2) {
        var fn = function(pos) {
            return Ext.fx.CubicBezier.cubicBezierAtTime(pos, x1, y1, x2, y2, 1);
        };
        fn.toCSS3 = function() {
            return 'cubic-bezier(' + [x1, y1, x2, y2].join(',') + ')';
        };
        fn.reverse = function() {
            return Ext.fx.CubicBezier.cubicBezier(1 - x2, 1 - y2, 1 - x1, 1 - y1);
        };
        return fn;
    }
});
/**
 * @private
 */
Ext.define('Ext.fx.PropertyHandler', {

    /* Begin Definitions */

    requires: ['Ext.draw.Draw'],

    statics: {
        defaultHandler: {
            pixelDefaultsRE: /width|height|top$|bottom$|left$|right$/i,
            unitRE: /^(-?\d*\.?\d*){1}(em|ex|px|in|cm|mm|pt|pc|%)*$/,
            scrollRE: /^scroll/i,

            computeDelta: function(from, end, damper, initial, attr) {
                damper = (typeof damper == 'number') ? damper : 1;
                var unitRE = this.unitRE,
                    match = unitRE.exec(from),
                    start, units;
                if (match) {
                    from = match[1];
                    units = match[2];
                    if (!this.scrollRE.test(attr) && !units && this.pixelDefaultsRE.test(attr)) {
                        units = 'px';
                    }
                }
                from = +from || 0;

                match = unitRE.exec(end);
                if (match) {
                    end = match[1];
                    units = match[2] || units;
                }
                end = +end || 0;
                start = (initial != null) ? initial : from;
                return {
                    from: from,
                    delta: (end - start) * damper,
                    units: units
                };
            },

            get: function(from, end, damper, initialFrom, attr) {
                var ln = from.length,
                    out = [],
                    i, initial, res, j, len;
                for (i = 0; i < ln; i++) {
                    if (initialFrom) {
                        initial = initialFrom[i][1].from;
                    }
                    if (Ext.isArray(from[i][1]) && Ext.isArray(end)) {
                        res = [];
                        j = 0;
                        len = from[i][1].length;
                        for (; j < len; j++) {
                            res.push(this.computeDelta(from[i][1][j], end[j], damper, initial, attr));
                        }
                        out.push([from[i][0], res]);
                    }
                    else {
                        out.push([from[i][0], this.computeDelta(from[i][1], end, damper, initial, attr)]);
                    }
                }
                return out;
            },

            set: function(values, easing) {
                var ln = values.length,
                    out = [],
                    i, val, res, len, j;
                for (i = 0; i < ln; i++) {
                    val  = values[i][1];
                    if (Ext.isArray(val)) {
                        res = [];
                        j = 0;
                        len = val.length;
                        for (; j < len; j++) {
                            res.push(val[j].from + val[j].delta * easing + (val[j].units || 0));
                        }
                        out.push([values[i][0], res]);
                    } else {
                        out.push([values[i][0], val.from + val.delta * easing + (val.units || 0)]);
                    }
                }
                return out;
            }
        },
        stringHandler: {
            computeDelta: function(from, end, damper, initial, attr) {
                return {
                    from: from,
                    delta: end
                };
            },

            get: function(from, end, damper, initialFrom, attr) {
                var ln = from.length,
                    out = [],
                    i, initial, res, j, len;
                for (i = 0; i < ln; i++) {
                    out.push([from[i][0], this.computeDelta(from[i][1], end, damper, initial, attr)]);
                }
                return out;
            },

            set: function(values, easing) {
                var ln = values.length,
                    out = [],
                    i, val, res, len, j;
                for (i = 0; i < ln; i++) {
                    val  = values[i][1];
                    out.push([values[i][0], val.delta]);
                }
                return out;
            }
        },
        color: {
            rgbRE: /^rgb\(([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\)$/i,
            hexRE: /^#?([0-9A-F]{2})([0-9A-F]{2})([0-9A-F]{2})$/i,
            hex3RE: /^#?([0-9A-F]{1})([0-9A-F]{1})([0-9A-F]{1})$/i,

            parseColor : function(color, damper) {
                damper = (typeof damper == 'number') ? damper : 1;
                var out    = false,
                    reList = [this.hexRE, this.rgbRE, this.hex3RE],
                    length = reList.length,
                    match, base, re, i;

                for (i = 0; i < length; i++) {
                    re = reList[i];

                    base = (i % 2 === 0) ? 16 : 10;
                    match = re.exec(color);
                    if (match && match.length === 4) {
                        if (i === 2) {
                            match[1] += match[1];
                            match[2] += match[2];
                            match[3] += match[3];
                        }
                        out = {
                            red: parseInt(match[1], base),
                            green: parseInt(match[2], base),
                            blue: parseInt(match[3], base)
                        };
                        break;
                    }
                }

                return out || color;
            },

            computeDelta: function(from, end, damper, initial) {
                from = this.parseColor(from);
                end = this.parseColor(end, damper);
                var start = initial ? initial : from,
                    tfrom = typeof start,
                    tend = typeof end;
                //Extra check for when the color string is not recognized.
                if (tfrom == 'string' ||  tfrom == 'undefined'
                  || tend == 'string' || tend == 'undefined') {
                    return end || start;
                }
                return {
                    from:  from,
                    delta: {
                        red: Math.round((end.red - start.red) * damper),
                        green: Math.round((end.green - start.green) * damper),
                        blue: Math.round((end.blue - start.blue) * damper)
                    }
                };
            },

            get: function(start, end, damper, initialFrom) {
                var ln = start.length,
                    out = [],
                    i, initial;
                for (i = 0; i < ln; i++) {
                    if (initialFrom) {
                        initial = initialFrom[i][1].from;
                    }
                    out.push([start[i][0], this.computeDelta(start[i][1], end, damper, initial)]);
                }
                return out;
            },

            set: function(values, easing) {
                var ln = values.length,
                    out = [],
                    i, val, parsedString, from, delta;
                for (i = 0; i < ln; i++) {
                    val = values[i][1];
                    if (val) {
                        from = val.from;
                        delta = val.delta;
                        //multiple checks to reformat the color if it can't recognized by computeDelta.
                        val = (typeof val == 'object' && 'red' in val)? 
                                'rgb(' + val.red + ', ' + val.green + ', ' + val.blue + ')' : val;
                        val = (typeof val == 'object' && val.length)? val[0] : val;
                        if (typeof val == 'undefined') {
                            return [];
                        }
                        parsedString = typeof val == 'string'? val :
                            'rgb(' + [
                                  (from.red + Math.round(delta.red * easing)) % 256,
                                  (from.green + Math.round(delta.green * easing)) % 256,
                                  (from.blue + Math.round(delta.blue * easing)) % 256
                              ].join(',') + ')';
                        out.push([
                            values[i][0],
                            parsedString
                        ]);
                    }
                }
                return out;
            }
        },
        object: {
            interpolate: function(prop, damper) {
                damper = (typeof damper == 'number') ? damper : 1;
                var out = {},
                    p;
                for(p in prop) {
                    out[p] = parseFloat(prop[p]) * damper;
                }
                return out;
            },

            computeDelta: function(from, end, damper, initial) {
                from = this.interpolate(from);
                end = this.interpolate(end, damper);
                var start = initial ? initial : from,
                    delta = {},
                    p;

                for(p in end) {
                    delta[p] = end[p] - start[p];
                }
                return {
                    from:  from,
                    delta: delta
                };
            },

            get: function(start, end, damper, initialFrom) {
                var ln = start.length,
                    out = [],
                    i, initial;
                for (i = 0; i < ln; i++) {
                    if (initialFrom) {
                        initial = initialFrom[i][1].from;
                    }
                    out.push([start[i][0], this.computeDelta(start[i][1], end, damper, initial)]);
                }
                return out;
            },

            set: function(values, easing) {
                var ln = values.length,
                    out = [],
                    outObject = {},
                    i, from, delta, val, p;
                for (i = 0; i < ln; i++) {
                    val  = values[i][1];
                    from = val.from;
                    delta = val.delta;
                    for (p in from) {
                        outObject[p] = from[p] + delta[p] * easing;
                    }
                    out.push([
                        values[i][0],
                        outObject
                    ]);
                }
                return out;
            }
        },

        path: {
            computeDelta: function(from, end, damper, initial) {
                damper = (typeof damper == 'number') ? damper : 1;
                var start;
                from = +from || 0;
                end = +end || 0;
                start = (initial != null) ? initial : from;
                return {
                    from: from,
                    delta: (end - start) * damper
                };
            },

            forcePath: function(path) {
                if (!Ext.isArray(path) && !Ext.isArray(path[0])) {
                    path = Ext.draw.Draw.parsePathString(path);
                }
                return path;
            },

            get: function(start, end, damper, initialFrom) {
                var endPath = this.forcePath(end),
                    out = [],
                    startLn = start.length,
                    startPathLn, pointsLn, i, deltaPath, initial, j, k, path, startPath;
                for (i = 0; i < startLn; i++) {
                    startPath = this.forcePath(start[i][1]);

                    deltaPath = Ext.draw.Draw.interpolatePaths(startPath, endPath);
                    startPath = deltaPath[0];
                    endPath = deltaPath[1];

                    startPathLn = startPath.length;
                    path = [];
                    for (j = 0; j < startPathLn; j++) {
                        deltaPath = [startPath[j][0]];
                        pointsLn = startPath[j].length;
                        for (k = 1; k < pointsLn; k++) {
                            initial = initialFrom && initialFrom[0][1][j][k].from;
                            deltaPath.push(this.computeDelta(startPath[j][k], endPath[j][k], damper, initial));
                        }
                        path.push(deltaPath);
                    }
                    out.push([start[i][0], path]);
                }
                return out;
            },

            set: function(values, easing) {
                var ln = values.length,
                    out = [],
                    i, j, k, newPath, calcPath, deltaPath, deltaPathLn, pointsLn;
                for (i = 0; i < ln; i++) {
                    deltaPath = values[i][1];
                    newPath = [];
                    deltaPathLn = deltaPath.length;
                    for (j = 0; j < deltaPathLn; j++) {
                        calcPath = [deltaPath[j][0]];
                        pointsLn = deltaPath[j].length;
                        for (k = 1; k < pointsLn; k++) {
                            calcPath.push(deltaPath[j][k].from + deltaPath[j][k].delta * easing);
                        }
                        newPath.push(calcPath.join(','));
                    }
                    out.push([values[i][0], newPath.join(',')]);
                }
                return out;
            }
        }
        /* End Definitions */
    }
}, function() {
    //set color properties to color interpolator
    var props  = [
            'outlineColor',
            'backgroundColor',
            'borderColor',
            'borderTopColor',
            'borderRightColor',
            'borderBottomColor',
            'borderLeftColor',
            'fill',
            'stroke'
        ],
        length = props.length,
        i      = 0,
        prop;

    for (; i<length; i++) {
        prop = props[i];
        this[prop] = this.color;
    }
    
    //set string properties to string
    props  = ['cursor'];
    length = props.length;
    i      = 0;

    for (; i<length; i++) {
        prop = props[i];
        this[prop] = this.stringHandler;
    }
});

/**
 * @class Ext.fx.target.Target

This class specifies a generic target for an animation. It provides a wrapper around a
series of different types of objects to allow for a generic animation API.
A target can be a single object or a Composite object containing other objects that are 
to be animated. This class and it's subclasses are generally not created directly, the 
underlying animation will create the appropriate Ext.fx.target.Target object by passing 
the instance to be animated.

The following types of objects can be animated:

- {@link Ext.fx.target.Component Components}
- {@link Ext.fx.target.Element Elements}
- {@link Ext.fx.target.Sprite Sprites}

 * @markdown
 * @abstract
 */
Ext.define('Ext.fx.target.Target', {

    isAnimTarget: true,

    /**
     * Creates new Target.
     * @param {Ext.Component/Ext.Element/Ext.draw.Sprite} target The object to be animated
     */
    constructor: function(target) {
        this.target = target;
        this.id = this.getId();
    },
    
    getId: function() {
        return this.target.id;
    }
});




/**
 * @class Ext.fx.Easing
 *
 * This class contains a series of function definitions used to modify values during an animation.
 * They describe how the intermediate values used during a transition will be calculated. It allows for a transition to change
 * speed over its duration. The following options are available: 
 *
 * - linear The default easing type
 * - backIn
 * - backOut
 * - bounceIn
 * - bounceOut
 * - ease
 * - easeIn
 * - easeOut
 * - easeInOut
 * - elasticIn
 * - elasticOut
 * - cubic-bezier(x1, y1, x2, y2)
 *
 * Note that cubic-bezier will create a custom easing curve following the CSS3 [transition-timing-function][0]
 * specification.  The four values specify points P1 and P2 of the curve as (x1, y1, x2, y2). All values must
 * be in the range [0, 1] or the definition is invalid.
 *
 * [0]: http://www.w3.org/TR/css3-transitions/#transition-timing-function_tag
 *
 * @singleton
 */
Ext.ns('Ext.fx');

Ext.require('Ext.fx.CubicBezier', function() {
    var math = Math,
        pi = math.PI,
        pow = math.pow,
        sin = math.sin,
        sqrt = math.sqrt,
        abs = math.abs,
        backInSeed = 1.70158;
    Ext.fx.Easing = {
        // ease: Ext.fx.CubicBezier.cubicBezier(0.25, 0.1, 0.25, 1),
        // linear: Ext.fx.CubicBezier.cubicBezier(0, 0, 1, 1),
        // 'ease-in': Ext.fx.CubicBezier.cubicBezier(0.42, 0, 1, 1),
        // 'ease-out': Ext.fx.CubicBezier.cubicBezier(0, 0.58, 1, 1),
        // 'ease-in-out': Ext.fx.CubicBezier.cubicBezier(0.42, 0, 0.58, 1),
        // 'easeIn': Ext.fx.CubicBezier.cubicBezier(0.42, 0, 1, 1),
        // 'easeOut': Ext.fx.CubicBezier.cubicBezier(0, 0.58, 1, 1),
        // 'easeInOut': Ext.fx.CubicBezier.cubicBezier(0.42, 0, 0.58, 1)
    };

    Ext.apply(Ext.fx.Easing, {
        linear: function(n) {
            return n;
        },
        ease: function(n) {
            var q = 0.07813 - n / 2,
                alpha = -0.25,
                Q = sqrt(0.0066 + q * q),
                x = Q - q,
                X = pow(abs(x), 1/3) * (x < 0 ? -1 : 1),
                y = -Q - q,
                Y = pow(abs(y), 1/3) * (y < 0 ? -1 : 1),
                t = X + Y + 0.25;
            return pow(1 - t, 2) * 3 * t * 0.1 + (1 - t) * 3 * t * t + t * t * t;
        },
        easeIn: function (n) {
            return pow(n, 1.7);
        },
        easeOut: function (n) {
            return pow(n, 0.48);
        },
        easeInOut: function(n) {
            var q = 0.48 - n / 1.04,
                Q = sqrt(0.1734 + q * q),
                x = Q - q,
                X = pow(abs(x), 1/3) * (x < 0 ? -1 : 1),
                y = -Q - q,
                Y = pow(abs(y), 1/3) * (y < 0 ? -1 : 1),
                t = X + Y + 0.5;
            return (1 - t) * 3 * t * t + t * t * t;
        },
        backIn: function (n) {
            return n * n * ((backInSeed + 1) * n - backInSeed);
        },
        backOut: function (n) {
            n = n - 1;
            return n * n * ((backInSeed + 1) * n + backInSeed) + 1;
        },
        elasticIn: function (n) {
            if (n === 0 || n === 1) {
                return n;
            }
            var p = 0.3,
                s = p / 4;
            return pow(2, -10 * n) * sin((n - s) * (2 * pi) / p) + 1;
        },
        elasticOut: function (n) {
            return 1 - Ext.fx.Easing.elasticIn(1 - n);
        },
        bounceIn: function (n) {
            return 1 - Ext.fx.Easing.bounceOut(1 - n);
        },
        bounceOut: function (n) {
            var s = 7.5625,
                p = 2.75,
                l;
            if (n < (1 / p)) {
                l = s * n * n;
            } else {
                if (n < (2 / p)) {
                    n -= (1.5 / p);
                    l = s * n * n + 0.75;
                } else {
                    if (n < (2.5 / p)) {
                        n -= (2.25 / p);
                        l = s * n * n + 0.9375;
                    } else {
                        n -= (2.625 / p);
                        l = s * n * n + 0.984375;
                    }
                }
            }
            return l;
        }
    });
    Ext.apply(Ext.fx.Easing, {
        'back-in': Ext.fx.Easing.backIn,
        'back-out': Ext.fx.Easing.backOut,
        'ease-in': Ext.fx.Easing.easeIn,
        'ease-out': Ext.fx.Easing.easeOut,
        'elastic-in': Ext.fx.Easing.elasticIn,
        'elastic-out': Ext.fx.Easing.elasticIn,
        'bounce-in': Ext.fx.Easing.bounceIn,
        'bounce-out': Ext.fx.Easing.bounceOut,
        'ease-in-out': Ext.fx.Easing.easeInOut
    });
});
/**
 * @class Ext.fx.target.Component
 * 
 * This class represents a animation target for a {@link Ext.Component}. In general this class will not be
 * created directly, the {@link Ext.Component} will be passed to the animation and
 * and the appropriate target will be created.
 */
Ext.define('Ext.fx.target.Component', {

    /* Begin Definitions */
   
    extend: 'Ext.fx.target.Target',
    
    /* End Definitions */

    type: 'component',

    // Methods to call to retrieve unspecified "from" values from a target Component
    getPropMethod: {
        top: function() {
            return this.getPosition(true)[1];
        },
        left: function() {
            return this.getPosition(true)[0];
        },
        x: function() {
            return this.getPosition()[0];
        },
        y: function() {
            return this.getPosition()[1];
        },
        height: function() {
            return this.getHeight();
        },
        width: function() {
            return this.getWidth();
        },
        opacity: function() {
            return this.el.getStyle('opacity');
        }
    },

    compMethod: {
        top: 'setPosition',
        left: 'setPosition',
        x: 'setPagePosition',
        y: 'setPagePosition',
        height: 'setSize',
        width: 'setSize',
        opacity: 'setOpacity'
    },

    // Read the named attribute from the target Component. Use the defined getter for the attribute
    getAttr: function(attr, val) {
        return [[this.target, val !== undefined ? val : this.getPropMethod[attr].call(this.target)]];
    },

    setAttr: function(targetData, isFirstFrame, isLastFrame) {
        var me = this,
            target = me.target,
            ln = targetData.length,
            attrs, attr, o, i, j, meth, targets, left, top, w, h;
        for (i = 0; i < ln; i++) {
            attrs = targetData[i].attrs;
            for (attr in attrs) {
                targets = attrs[attr].length;
                meth = {
                    setPosition: {},
                    setPagePosition: {},
                    setSize: {},
                    setOpacity: {}
                };
                for (j = 0; j < targets; j++) {
                    o = attrs[attr][j];
                    // We REALLY want a single function call, so push these down to merge them: eg
                    // meth.setPagePosition.target = <targetComponent>
                    // meth.setPagePosition['x'] = 100
                    // meth.setPagePosition['y'] = 100
                    meth[me.compMethod[attr]].target = o[0];
                    meth[me.compMethod[attr]][attr] = o[1];
                }
                if (meth.setPosition.target) {
                    o = meth.setPosition;
                    left = (o.left === undefined) ? undefined : parseFloat(o.left);
                    top = (o.top === undefined) ? undefined : parseFloat(o.top);
                    o.target.setPosition(left, top);
                }
                if (meth.setPagePosition.target) {
                    o = meth.setPagePosition;
                    o.target.setPagePosition(o.x, o.y);
                }
                if (meth.setSize.target) {
                    o = meth.setSize;
                    // Dimensions not being animated MUST NOT be autosized. They must remain at current value.
                    w = (o.width === undefined) ? o.target.getWidth() : parseFloat(o.width);
                    h = (o.height === undefined) ? o.target.getHeight() : parseFloat(o.height);

                    // Only set the size of the Component on the last frame, or if the animation was
                    // configured with dynamic: true.
                    // In other cases, we just set the target element size.
                    // This will result in either clipping if animating a reduction in size, or the revealing of
                    // the inner elements of the Component if animating an increase in size.
                    // Component's animate function initially resizes to the larger size before resizing the
                    // outer element to clip the contents.
                    if (isLastFrame || me.dynamic) {
                        o.target.setSize(w, h);
                    } else {
                        o.target.el.setSize(w, h);
                    }
                }
                if (meth.setOpacity.target) {
                    o = meth.setOpacity;
                    o.target.el.setStyle('opacity', o.opacity);
                }
            }
        }
    }
});

/**
 * @class Ext.fx.target.Element
 * 
 * This class represents a animation target for an {@link Ext.Element}. In general this class will not be
 * created directly, the {@link Ext.Element} will be passed to the animation and
 * and the appropriate target will be created.
 */
Ext.define('Ext.fx.target.Element', {

    /* Begin Definitions */
    
    extend: 'Ext.fx.target.Target',
    
    /* End Definitions */

    type: 'element',

    getElVal: function(el, attr, val) {
        if (val == undefined) {
            if (attr === 'x') {
                val = el.getX();
            }
            else if (attr === 'y') {
                val = el.getY();
            }
            else if (attr === 'scrollTop') {
                val = el.getScroll().top;
            }
            else if (attr === 'scrollLeft') {
                val = el.getScroll().left;
            }
            else if (attr === 'height') {
                val = el.getHeight();
            }
            else if (attr === 'width') {
                val = el.getWidth();
            }
            else {
                val = el.getStyle(attr);
            }
        }
        return val;
    },

    getAttr: function(attr, val) {
        var el = this.target;
        return [[ el, this.getElVal(el, attr, val)]];
    },

    setAttr: function(targetData) {
        var target = this.target,
            ln = targetData.length,
            attrs, attr, o, i, j, ln2, element, value;
        for (i = 0; i < ln; i++) {
            attrs = targetData[i].attrs;
            for (attr in attrs) {
                if (attrs.hasOwnProperty(attr)) {
                    ln2 = attrs[attr].length;
                    for (j = 0; j < ln2; j++) {
                        o = attrs[attr][j];
                        element = o[0];
                        value = o[1];
                        if (attr === 'x') {
                            element.setX(value);
                        } else if (attr === 'y') {
                            element.setY(value);
                        } else if (attr === 'scrollTop') {
                            element.scrollTo('top', value);
                        } else if (attr === 'scrollLeft') {
                            element.scrollTo('left',value);
                        } else if (attr === 'width') {
                            element.setWidth(value);
                        } else if (attr === 'height') {
                            element.setHeight(value);
                        } else {
                            element.setStyle(attr, value);
                        }
                    }
                }
            }
        }
    }
});

/**
 * @class Ext.fx.target.CompositeElement
 * 
 * This class represents a animation target for a {@link Ext.CompositeElement}. It allows
 * each {@link Ext.Element} in the group to be animated as a whole. In general this class will not be
 * created directly, the {@link Ext.CompositeElement} will be passed to the animation and
 * and the appropriate target will be created.
 */
Ext.define('Ext.fx.target.CompositeElement', {

    /* Begin Definitions */

    extend: 'Ext.fx.target.Element',

    /* End Definitions */

    /**
     * @property {Boolean} isComposite
     * `true` in this class to identify an object as an instantiated CompositeElement, or subclass thereof.
     */
    isComposite: true,
    
    constructor: function(target) {
        target.id = target.id || Ext.id(null, 'ext-composite-');
        this.callParent([target]);
    },

    getAttr: function(attr, val) {
        var out      = [],
            elements = this.target.elements,
            length   = elements.length,
            i,
            el;

        for (i = 0; i < length; i++) {
            el = elements[i];

            if (el) {
                el = this.target.getElement(el);
                out.push([el, this.getElVal(el, attr, val)]);
            }
        }

        return out;
    }
});

/**
 * @class Ext.fx.target.ElementCSS
 * 
 * This class represents a animation target for an {@link Ext.Element} that supports CSS
 * based animation. In general this class will not be created directly, the {@link Ext.Element} 
 * will be passed to the animation and the appropriate target will be created.
 */
Ext.define('Ext.fx.target.ElementCSS', {

    /* Begin Definitions */

    extend: 'Ext.fx.target.Element',

    /* End Definitions */

    setAttr: function(targetData, isFirstFrame) {
        var cssArr = {
                attrs: [],
                duration: [],
                easing: []
            },
            ln = targetData.length,
            attributes,
            attrs,
            attr,
            easing,
            duration,
            o,
            i,
            j,
            ln2;
        for (i = 0; i < ln; i++) {
            attrs = targetData[i];
            duration = attrs.duration;
            easing = attrs.easing;
            attrs = attrs.attrs;
            for (attr in attrs) {
                if (Ext.Array.indexOf(cssArr.attrs, attr) == -1) {
                    cssArr.attrs.push(attr.replace(/[A-Z]/g, function(v) {
                        return '-' + v.toLowerCase();
                    }));
                    cssArr.duration.push(duration + 'ms');
                    cssArr.easing.push(easing);
                }
            }
        }
        attributes = cssArr.attrs.join(',');
        duration = cssArr.duration.join(',');
        easing = cssArr.easing.join(', ');
        for (i = 0; i < ln; i++) {
            attrs = targetData[i].attrs;
            for (attr in attrs) {
                ln2 = attrs[attr].length;
                for (j = 0; j < ln2; j++) {
                    o = attrs[attr][j];
                    o[0].setStyle(Ext.supports.CSS3Prefix + 'TransitionProperty', isFirstFrame ? '' : attributes);
                    o[0].setStyle(Ext.supports.CSS3Prefix + 'TransitionDuration', isFirstFrame ? '' : duration);
                    o[0].setStyle(Ext.supports.CSS3Prefix + 'TransitionTimingFunction', isFirstFrame ? '' : easing);
                    o[0].setStyle(attr, o[1]);

                    // Must trigger reflow to make this get used as the start point for the transition that follows
                    if (isFirstFrame) {
                        o = o[0].dom.offsetWidth;
                    }
                    else {
                        // Remove transition properties when completed.
                        o[0].on(Ext.supports.CSS3TransitionEnd, function() {
                            this.setStyle(Ext.supports.CSS3Prefix + 'TransitionProperty', null);
                            this.setStyle(Ext.supports.CSS3Prefix + 'TransitionDuration', null);
                            this.setStyle(Ext.supports.CSS3Prefix + 'TransitionTimingFunction', null);
                        }, o[0], { single: true });
                    }
                }
            }
        }
    }
});
/**
 * @class Ext.fx.target.CompositeElementCSS
 * 
 * This class represents a animation target for a {@link Ext.CompositeElement}, where the
 * constituent elements support CSS based animation. It allows each {@link Ext.Element} in 
 * the group to be animated as a whole. In general this class will not be created directly, 
 * the {@link Ext.CompositeElement} will be passed to the animation and the appropriate target 
 * will be created.
 */
Ext.define('Ext.fx.target.CompositeElementCSS', {

    /* Begin Definitions */

    extend: 'Ext.fx.target.CompositeElement',

    requires: ['Ext.fx.target.ElementCSS'],

    /* End Definitions */
    setAttr: function() {
        return Ext.fx.target.ElementCSS.prototype.setAttr.apply(this, arguments);
    }
});
/**
 * @class Ext.fx.target.Sprite

 This class represents an animation target for a {@link Ext.draw.Sprite}. In general this class will not be
 created directly, the {@link Ext.draw.Sprite} will be passed to the animation and
 and the appropriate target will be created.

 * @markdown
 */

Ext.define('Ext.fx.target.Sprite', {

    /* Begin Definitions */

    extend: 'Ext.fx.target.Target',

    /* End Definitions */

    type: 'draw',

    getFromPrim: function (sprite, attr) {
        var obj;
        switch (attr) {
            case 'rotate':
            case 'rotation':
                obj = sprite.attr.rotation;
                return {
                    x: obj.x || 0,
                    y: obj.y || 0,
                    degrees: obj.degrees || 0
                };
            case 'scale':
            case 'scaling':
                obj = sprite.attr.scaling;
                return {
                    x: obj.x || 1,
                    y: obj.y || 1,
                    cx: obj.cx || 0,
                    cy: obj.cy || 0
                };
            case 'translate':
            case 'translation':
                obj = sprite.attr.translation;
                return {
                    x: obj.x || 0,
                    y: obj.y || 0
                };
            default:
                return sprite.attr[attr];
        }
    },

    getAttr: function (attr, val) {
        return [
            [this.target, val != undefined ? val : this.getFromPrim(this.target, attr)]
        ];
    },

    setAttr: function (targetData) {
        var ln = targetData.length,
            spriteArr = [],
            attrsConf, attr, attrArr, attrs, sprite, idx, value, i, j, x, y, ln2;
        for (i = 0; i < ln; i++) {
            attrsConf = targetData[i].attrs;
            for (attr in attrsConf) {
                attrArr = attrsConf[attr];
                ln2 = attrArr.length;
                for (j = 0; j < ln2; j++) {
                    sprite = attrArr[j][0];
                    attrs = attrArr[j][1];
                    if (attr === 'translate' || attr === 'translation') {
                        value = {
                            x: attrs.x,
                            y: attrs.y
                        };
                    }
                    else if (attr === 'rotate' || attr === 'rotation') {
                        x = attrs.x;
                        if (isNaN(x)) {
                            x = null;
                        }
                        y = attrs.y;
                        if (isNaN(y)) {
                            y = null;
                        }
                        value = {
                            degrees: attrs.degrees,
                            x: x,
                            y: y
                        };
                    } else if (attr === 'scale' || attr === 'scaling') {
                        x = attrs.x;
                        if (isNaN(x)) {
                            x = null;
                        }
                        y = attrs.y;
                        if (isNaN(y)) {
                            y = null;
                        }
                        value = {
                            x: x,
                            y: y,
                            cx: attrs.cx,
                            cy: attrs.cy
                        };
                    }
                    else if (attr === 'width' || attr === 'height' || attr === 'x' || attr === 'y') {
                        value = parseFloat(attrs);
                    }
                    else {
                        value = attrs;
                    }
                    idx = Ext.Array.indexOf(spriteArr, sprite);
                    if (idx == -1) {
                        spriteArr.push([sprite, {}]);
                        idx = spriteArr.length - 1;
                    }
                    spriteArr[idx][1][attr] = value;
                }
            }
        }
        ln = spriteArr.length;
        for (i = 0; i < ln; i++) {
            spriteArr[i][0].setAttributes(spriteArr[i][1]);
        }
        this.target.redraw();
    }
});

/**
 * @class Ext.fx.target.CompositeSprite

This class represents a animation target for a {@link Ext.draw.CompositeSprite}. It allows
each {@link Ext.draw.Sprite} in the group to be animated as a whole. In general this class will not be
created directly, the {@link Ext.draw.CompositeSprite} will be passed to the animation and
and the appropriate target will be created.

 * @markdown
 */

Ext.define('Ext.fx.target.CompositeSprite', {

    /* Begin Definitions */

    extend: 'Ext.fx.target.Sprite',

    /* End Definitions */

    getAttr: function(attr, val) {
        var out     = [],
            sprites = [].concat(this.target.items),
            length  = sprites.length,
            i,
            sprite;

        for (i = 0; i < length; i++) {
            sprite = sprites[i];
            out.push([sprite, val != undefined ? val : this.getFromPrim(sprite, attr)]);
        }

        return out;
    }
});



/**
 * @class Ext.fx.Queue
 * Animation Queue mixin to handle chaining and queueing by target.
 * @private
 */

Ext.define('Ext.fx.Queue', {

    requires: ['Ext.util.HashMap'],

    constructor: function() {
        this.targets = new Ext.util.HashMap();
        this.fxQueue = {};
    },

    // @private
    getFxDefaults: function(targetId) {
        var target = this.targets.get(targetId);
        if (target) {
            return target.fxDefaults;
        }
        return {};
    },

    // @private
    setFxDefaults: function(targetId, obj) {
        var target = this.targets.get(targetId);
        if (target) {
            target.fxDefaults = Ext.apply(target.fxDefaults || {}, obj);
        }
    },

    // @private
    stopAnimation: function(targetId) {
        var me = this,
            queue = me.getFxQueue(targetId),
            ln = queue.length;
        while (ln) {
            queue[ln - 1].end();
            ln--;
        }
    },

    /**
     * @private
     * Returns current animation object if the element has any effects actively running or queued, else returns false.
     */
    getActiveAnimation: function(targetId) {
        var queue = this.getFxQueue(targetId);
        return (queue && !!queue.length) ? queue[0] : false;
    },

    // @private
    hasFxBlock: function(targetId) {
        var queue = this.getFxQueue(targetId);
        return queue && queue[0] && queue[0].block;
    },

    // @private get fx queue for passed target, create if needed.
    getFxQueue: function(targetId) {
        if (!targetId) {
            return false;
        }
        var me = this,
            queue = me.fxQueue[targetId],
            target = me.targets.get(targetId);

        if (!target) {
            return false;
        }

        if (!queue) {
            me.fxQueue[targetId] = [];
            // GarbageCollector will need to clean up Elements since they aren't currently observable
            if (target.type != 'element') {
                target.target.on('destroy', function() {
                    me.fxQueue[targetId] = [];
                });
            }
        }
        return me.fxQueue[targetId];
    },

    // @private
    queueFx: function(anim) {
        var me = this,
            target = anim.target,
            queue, ln;

        if (!target) {
            return;
        }

        queue = me.getFxQueue(target.getId());
        ln = queue.length;

        if (ln) {
            if (anim.concurrent) {
                anim.paused = false;
            }
            else {
                queue[ln - 1].on('afteranimate', function() {
                    anim.paused = false;
                });
            }
        }
        else {
            anim.paused = false;
        }
        anim.on('afteranimate', function() {
            Ext.Array.remove(queue, anim);
            if (anim.remove) {
                if (target.type == 'element') {
                    var el = Ext.get(target.id);
                    if (el) {
                        el.remove();
                    }
                }
            }
        }, this);
        queue.push(anim);
    }
});





/**
 * @class Ext.fx.Manager
 * Animation Manager which keeps track of all current animations and manages them on a frame by frame basis.
 * @private
 * @singleton
 */

Ext.define('Ext.fx.Manager', {

    /* Begin Definitions */

    singleton: true,

    requires: ['Ext.util.MixedCollection',
               'Ext.fx.target.Element',
               'Ext.fx.target.ElementCSS',
               'Ext.fx.target.CompositeElement',
               'Ext.fx.target.CompositeElementCSS',
               'Ext.fx.target.Sprite',
               'Ext.fx.target.CompositeSprite',
               'Ext.fx.target.Component'],

    mixins: {
        queue: 'Ext.fx.Queue'
    },

    /* End Definitions */

    constructor: function() {
        this.items = new Ext.util.MixedCollection();
        this.mixins.queue.constructor.call(this);

        // this.requestAnimFrame = (function() {
        //     var raf = window.requestAnimationFrame ||
        //               window.webkitRequestAnimationFrame ||
        //               window.mozRequestAnimationFrame ||
        //               window.oRequestAnimationFrame ||
        //               window.msRequestAnimationFrame;
        //     if (raf) {
        //         return function(callback, element) {
        //             raf(callback);
        //         };
        //     }
        //     else {
        //         return function(callback, element) {
        //             window.setTimeout(callback, Ext.fx.Manager.interval);
        //         };
        //     }
        // })();
    },

    /**
     * @cfg {Number} interval Default interval in miliseconds to calculate each frame.  Defaults to 16ms (~60fps)
     */
    interval: 16,

    /**
     * @cfg {Boolean} forceJS Force the use of JavaScript-based animation instead of CSS3 animation, even when CSS3
     * animation is supported by the browser. This defaults to true currently, as CSS3 animation support is still
     * considered experimental at this time, and if used should be thouroughly tested across all targeted browsers.
     * @protected
     */
    forceJS: true,

    // @private Target factory
    createTarget: function(target) {
        var me = this,
            useCSS3 = !me.forceJS && Ext.supports.Transitions,
            targetObj;

        me.useCSS3 = useCSS3;

        if (target) {
            // dom element, string or fly
            if (target.tagName || Ext.isString(target) || target.isFly) {
                target = Ext.get(target);
                targetObj = new Ext.fx.target['Element' + (useCSS3 ? 'CSS' : '')](target);
            }
            // Element
            else if (target.dom) {
                targetObj = new Ext.fx.target['Element' + (useCSS3 ? 'CSS' : '')](target);
            }
            // Element Composite
            else if (target.isComposite) {
                targetObj = new Ext.fx.target['CompositeElement' + (useCSS3 ? 'CSS' : '')](target);
            }
            // Draw Sprite
            else if (target.isSprite) {
                targetObj = new Ext.fx.target.Sprite(target);
            }
            // Draw Sprite Composite
            else if (target.isCompositeSprite) {
                targetObj = new Ext.fx.target.CompositeSprite(target);
            }
            // Component
            else if (target.isComponent) {
                targetObj = new Ext.fx.target.Component(target);
            }
            else if (target.isAnimTarget) {
                return target;
            }
            else {
                return null;
            }
            me.targets.add(targetObj);
            return targetObj;
        }
        else {
            return null;
        }
    },

    /**
     * Add an Anim to the manager. This is done automatically when an Anim instance is created.
     * @param {Ext.fx.Anim} anim
     */
    addAnim: function(anim) {
        var items = this.items,
            task = this.task;

        // Make sure we use the anim's id, not the anim target's id here. The anim id will be unique on
        // each call to addAnim. `anim.target` is the DOM element being targeted, and since multiple animations
        // can target a single DOM node concurrently, the target id cannot be assumned to be unique.
        items.add(anim.id, anim);
        //Ext.log('+     added anim ', anim.id, ', target: ', anim.target.getId(), ', duration: ', anim.duration);

        // Start the timer if not already running
        if (!task && items.length) {
            task = this.task = {
                run: this.runner,
                interval: this.interval,
                scope: this
            };
            //Ext.log('--->> Starting task');
            Ext.TaskManager.start(task);
        }
    },

    /**
     * Remove an Anim from the manager. This is done automatically when an Anim ends.
     * @param {Ext.fx.Anim} anim
     */
    removeAnim: function(anim) {
        var me = this,
            items = me.items,
            task = me.task;
                
        items.removeAtKey(anim.id);
        //Ext.log('    X removed anim ', anim.id, ', target: ', anim.target.getId(), ', frames: ', anim.frameCount, ', item count: ', items.length);
        
        // Stop the timer if there are no more managed Anims
        if (task && !items.length) {
            //Ext.log('[]--- Stopping task');
            Ext.TaskManager.stop(task);
            delete me.task;
        }
    },

    /**
     * @private
     * Runner function being called each frame
     */
    runner: function() {
        var me = this,
            items = me.items.getRange(),
            i = 0,
            len = items.length,
            anim;

        //Ext.log('      executing anim runner task with ', len, ' items');
        me.targetArr = {};

        // Single timestamp for all animations this interval
        me.timestamp = new Date();
        
        // Loop to start any new animations first before looping to
        // execute running animations (which will also include all animations
        // started in this loop). This is a subtle difference from simply
        // iterating in one loop and starting then running each animation,
        // but separating the loops is necessary to ensure that all new animations
        // actually kick off prior to existing ones regardless of array order.
        // Otherwise in edge cases when there is excess latency in overall
        // performance, allowing existing animations to run before new ones can
        // lead to dropped frames and subtle race conditions when they are
        // interdependent, which is often the case with certain Element fx.
        for (; i < len; i++) {
            anim = items[i];
            
            if (anim.isReady()) {
                //Ext.log('      starting anim ', anim.id, ', target: ', anim.target.id);
                me.startAnim(anim);
            }
        }
        
        for (i = 0; i < len; i++) {
            anim = items[i];
            
            if (anim.isRunning()) {
                //Ext.log('      running anim ', anim.target.id);
                me.runAnim(anim);
            } else if (!me.useCSS3) {
                // When using CSS3 transitions the animations get paused since they are not
                // needed once the transition is handed over to the browser, so we can
                // ignore this case. However if we are doing JS animations and something is
                // paused here it's possibly unintentional.
                //Ext.log(' (i)  anim ', anim.id, ' is active but not running...');
            }
        }

        // Apply all the pending changes to their targets
        me.applyPendingAttrs();
    },

    /**
     * @private
     * Start the individual animation (initialization)
     */
    startAnim: function(anim) {
        anim.start(this.timestamp);
    },

    /**
     * @private
     * Run the individual animation for this frame
     */
    runAnim: function(anim) {
        if (!anim) {
            return;
        }
        var me = this,
            targetId = anim.target.getId(),
            useCSS3 = me.useCSS3 && anim.target.type == 'element',
            elapsedTime = me.timestamp - anim.startTime,
            lastFrame = (elapsedTime >= anim.duration),
            target, o;

        target = this.collectTargetData(anim, elapsedTime, useCSS3, lastFrame);
        
        // For CSS3 animation, we need to immediately set the first frame's attributes without any transition
        // to get a good initial state, then add the transition properties and set the final attributes.
        if (useCSS3) {
            //Ext.log(' (i)  using CSS3 transitions');
            
            // Flush the collected attributes, without transition
            anim.target.setAttr(target.anims[anim.id].attributes, true);

            // Add the end frame data
            me.collectTargetData(anim, anim.duration, useCSS3, lastFrame);

            // Pause the animation so runAnim doesn't keep getting called
            anim.paused = true;

            target = anim.target.target;
            // We only want to attach an event on the last element in a composite
            if (anim.target.isComposite) {
                target = anim.target.target.last();
            }

            // Listen for the transitionend event
            o = {};
            o[Ext.supports.CSS3TransitionEnd] = anim.lastFrame;
            o.scope = anim;
            o.single = true;
            target.on(o);
        }
    },

    /**
     * @private
     * Collect target attributes for the given Anim object at the given timestamp
     * @param {Ext.fx.Anim} anim The Anim instance
     * @param {Number} timestamp Time after the anim's start time
     * @param {Boolean} [useCSS3=false] True if using CSS3-based animation, else false
     * @param {Boolean} [isLastFrame=false] True if this is the last frame of animation to be run, else false
     * @return {Object} The animation target wrapper object containing the passed animation along with the
     * new attributes to set on the target's element in the next animation frame.
     */
    collectTargetData: function(anim, elapsedTime, useCSS3, isLastFrame) {
        var targetId = anim.target.getId(),
            target = this.targetArr[targetId];
        
        if (!target) {
            // Create a thin wrapper around the target so that we can create a link between the
            // target element and its associated animations. This is important later when applying
            // attributes to the target so that each animation can be independently run with its own
            // duration and stopped at any point without affecting other animations for the same target.
            target = this.targetArr[targetId] = {
                id: targetId,
                el: anim.target,
                anims: {}
            };
        }

        // This is a wrapper for the animation so that we can also save state along with it,
        // including the current elapsed time and lastFrame status. Even though this method only
        // adds a single anim object per call, each target element could have multiple animations
        // associated with it, which is why the anim is added to the target's `anims` hash by id.
        target.anims[anim.id] = {
            id: anim.id,
            anim: anim,
            elapsed: elapsedTime,
            isLastFrame: isLastFrame,
            // This is the object that gets applied to the target element below in applyPendingAttrs():
            attributes: [{
                duration: anim.duration,
                easing: (useCSS3 && anim.reverse) ? anim.easingFn.reverse().toCSS3() : anim.easing,
                // This is where the magic happens. The anim calculates what its new attributes should
                // be based on the current frame and returns those as a hash of values.
                attrs: anim.runAnim(elapsedTime)
            }]
        };
        
        return target;
    },
    
    /**
     * @private
     * Apply all pending attribute changes to their targets
     */
    applyPendingAttrs: function() {
        var targetArr = this.targetArr,
            target, targetId, animWrap, anim, animId;
        
        // Loop through each target
        for (targetId in targetArr) {
            if (targetArr.hasOwnProperty(targetId)) {
                target = targetArr[targetId];
                
                // Each target could have multiple associated animations, so iterate those
                for (animId in target.anims) {
                    if (target.anims.hasOwnProperty(animId)) {
                        animWrap = target.anims[animId];
                        anim = animWrap.anim;
                        
                        // If the animation has valid attributes, set them on the target
                        if (animWrap.attributes && anim.isRunning()) {
                            //Ext.log('  >   applying attributes for anim ', animWrap.id, ', target: ', target.id, ', elapsed: ', animWrap.elapsed);
                            target.el.setAttr(animWrap.attributes, false, animWrap.isLastFrame);
                            
                            // If this particular anim is at the last frame end it
                            if (animWrap.isLastFrame) {
                                //Ext.log('      running last frame for ', animWrap.id, ', target: ', targetId);
                                anim.lastFrame();
                            }
                        }
                    }
                }
            }
        }
    }
});

/**
 * @class Ext.fx.Animator
 *
 * This class is used to run keyframe based animations, which follows the CSS3 based animation structure.
 * Keyframe animations differ from typical from/to animations in that they offer the ability to specify values
 * at various points throughout the animation.
 *
 * ## Using Keyframes
 *
 * The {@link #keyframes} option is the most important part of specifying an animation when using this
 * class. A key frame is a point in a particular animation. We represent this as a percentage of the
 * total animation duration. At each key frame, we can specify the target values at that time. Note that
 * you *must* specify the values at 0% and 100%, the start and ending values. There is also a {@link #keyframe}
 * event that fires after each key frame is reached.
 *
 * ## Example
 *
 * In the example below, we modify the values of the element at each fifth throughout the animation.
 *
 *     @example
 *     Ext.create('Ext.fx.Animator', {
 *         target: Ext.getBody().createChild({
 *             style: {
 *                 width: '100px',
 *                 height: '100px',
 *                 'background-color': 'red'
 *             }
 *         }),
 *         duration: 10000, // 10 seconds
 *         keyframes: {
 *             0: {
 *                 opacity: 1,
 *                 backgroundColor: 'FF0000'
 *             },
 *             20: {
 *                 x: 30,
 *                 opacity: 0.5
 *             },
 *             40: {
 *                 x: 130,
 *                 backgroundColor: '0000FF'
 *             },
 *             60: {
 *                 y: 80,
 *                 opacity: 0.3
 *             },
 *             80: {
 *                 width: 200,
 *                 y: 200
 *             },
 *             100: {
 *                 opacity: 1,
 *                 backgroundColor: '00FF00'
 *             }
 *         }
 *     });
 */
Ext.define('Ext.fx.Animator', {

    /* Begin Definitions */

    mixins: {
        observable: 'Ext.util.Observable'
    },

    requires: ['Ext.fx.Manager'],

    /* End Definitions */

    /**
     * @property {Boolean} isAnimator
     * `true` in this class to identify an object as an instantiated Animator, or subclass thereof.
     */
    isAnimator: true,

    /**
     * @cfg {Number} duration
     * Time in milliseconds for the animation to last. Defaults to 250.
     */
    duration: 250,

    /**
     * @cfg {Number} delay
     * Time to delay before starting the animation. Defaults to 0.
     */
    delay: 0,

    /* private used to track a delayed starting time */
    delayStart: 0,

    /**
     * @cfg {Boolean} dynamic
     * Currently only for Component Animation: Only set a component's outer element size bypassing layouts.  Set to true to do full layouts for every frame of the animation.  Defaults to false.
     */
    dynamic: false,

    /**
     * @cfg {String} easing
     *
     * This describes how the intermediate values used during a transition will be calculated. It allows for a transition to change
     * speed over its duration.
     *
     *  - backIn
     *  - backOut
     *  - bounceIn
     *  - bounceOut
     *  - ease
     *  - easeIn
     *  - easeOut
     *  - easeInOut
     *  - elasticIn
     *  - elasticOut
     *  - cubic-bezier(x1, y1, x2, y2)
     *
     * Note that cubic-bezier will create a custom easing curve following the CSS3 [transition-timing-function][0]
     * specification.  The four values specify points P1 and P2 of the curve as (x1, y1, x2, y2). All values must
     * be in the range [0, 1] or the definition is invalid.
     *
     * [0]: http://www.w3.org/TR/css3-transitions/#transition-timing-function_tag
     */
    easing: 'ease',

    /**
     * Flag to determine if the animation has started
     * @property running
     * @type Boolean
     */
    running: false,

    /**
     * Flag to determine if the animation is paused. Only set this to true if you need to
     * keep the Anim instance around to be unpaused later; otherwise call {@link #end}.
     * @property paused
     * @type Boolean
     */
    paused: false,

    /**
     * @private
     */
    damper: 1,

    /**
     * @cfg {Number} iterations
     * Number of times to execute the animation. Defaults to 1.
     */
    iterations: 1,

    /**
     * Current iteration the animation is running.
     * @property currentIteration
     * @type Number
     */
    currentIteration: 0,

    /**
     * Current keyframe step of the animation.
     * @property keyframeStep
     * @type Number
     */
    keyframeStep: 0,

    /**
     * @private
     */
    animKeyFramesRE: /^(from|to|\d+%?)$/,

    /**
     * @cfg {Ext.fx.target.Target} target
     * The Ext.fx.target to apply the animation to.  If not specified during initialization, this can be passed to the applyAnimator
     * method to apply the same animation to many targets.
     */

     /**
      * @cfg {Object} keyframes
      * Animation keyframes follow the CSS3 Animation configuration pattern. 'from' is always considered '0%' and 'to'
      * is considered '100%'.<b>Every keyframe declaration must have a keyframe rule for 0% and 100%, possibly defined using
      * "from" or "to"</b>.  A keyframe declaration without these keyframe selectors is invalid and will not be available for
      * animation.  The keyframe declaration for a keyframe rule consists of properties and values. Properties that are unable to
      * be animated are ignored in these rules, with the exception of 'easing' which can be changed at each keyframe. For example:
 <pre><code>
keyframes : {
    '0%': {
        left: 100
    },
    '40%': {
        left: 150
    },
    '60%': {
        left: 75
    },
    '100%': {
        left: 100
    }
}
 </code></pre>
      */
    constructor: function(config) {
        var me = this;
        config = Ext.apply(me, config || {});
        me.config = config;
        me.id = Ext.id(null, 'ext-animator-');
        me.addEvents(
            /**
             * @event beforeanimate
             * Fires before the animation starts. A handler can return false to cancel the animation.
             * @param {Ext.fx.Animator} this
             */
            'beforeanimate',
            /**
              * @event keyframe
              * Fires at each keyframe.
              * @param {Ext.fx.Animator} this
              * @param {Number} keyframe step number
              */
            'keyframe',
            /**
             * @event afteranimate
             * Fires when the animation is complete.
             * @param {Ext.fx.Animator} this
             * @param {Date} startTime
             */
            'afteranimate'
        );
        me.mixins.observable.constructor.call(me, config);
        me.timeline = [];
        me.createTimeline(me.keyframes);
        if (me.target) {
            me.applyAnimator(me.target);
            Ext.fx.Manager.addAnim(me);
        }
    },

    /**
     * @private
     */
    sorter: function (a, b) {
        return a.pct - b.pct;
    },

    /**
     * @private
     * Takes the given keyframe configuration object and converts it into an ordered array with the passed attributes per keyframe
     * or applying the 'to' configuration to all keyframes.  Also calculates the proper animation duration per keyframe.
     */
    createTimeline: function(keyframes) {
        var me = this,
            attrs = [],
            to = me.to || {},
            duration = me.duration,
            prevMs, ms, i, ln, pct, anim, nextAnim, attr;

        for (pct in keyframes) {
            if (keyframes.hasOwnProperty(pct) && me.animKeyFramesRE.test(pct)) {
                attr = {attrs: Ext.apply(keyframes[pct], to)};
                // CSS3 spec allow for from/to to be specified.
                if (pct == "from") {
                    pct = 0;
                }
                else if (pct == "to") {
                    pct = 100;
                }
                // convert % values into integers
                attr.pct = parseInt(pct, 10);
                attrs.push(attr);
            }
        }
        // Sort by pct property
        Ext.Array.sort(attrs, me.sorter);
        // Only an end
        //if (attrs[0].pct) {
        //    attrs.unshift({pct: 0, attrs: element.attrs});
        //}

        ln = attrs.length;
        for (i = 0; i < ln; i++) {
            prevMs = (attrs[i - 1]) ? duration * (attrs[i - 1].pct / 100) : 0;
            ms = duration * (attrs[i].pct / 100);
            me.timeline.push({
                duration: ms - prevMs,
                attrs: attrs[i].attrs
            });
        }
    },

    /**
     * Applies animation to the Ext.fx.target
     * @private
     * @param target
     * @type String/Object
     */
    applyAnimator: function(target) {
        var me = this,
            anims = [],
            timeline = me.timeline,
            reverse = me.reverse,
            ln = timeline.length,
            anim, easing, damper, initial, attrs, lastAttrs, i;

        if (me.fireEvent('beforeanimate', me) !== false) {
            for (i = 0; i < ln; i++) {
                anim = timeline[i];
                attrs = anim.attrs;
                easing = attrs.easing || me.easing;
                damper = attrs.damper || me.damper;
                delete attrs.easing;
                delete attrs.damper;
                anim = new Ext.fx.Anim({
                    target: target,
                    easing: easing,
                    damper: damper,
                    duration: anim.duration,
                    paused: true,
                    to: attrs
                });
                anims.push(anim);
            }
            me.animations = anims;
            me.target = anim.target;
            for (i = 0; i < ln - 1; i++) {
                anim = anims[i];
                anim.nextAnim = anims[i + 1];
                anim.on('afteranimate', function() {
                    this.nextAnim.paused = false;
                });
                anim.on('afteranimate', function() {
                    this.fireEvent('keyframe', this, ++this.keyframeStep);
                }, me);
            }
            anims[ln - 1].on('afteranimate', function() {
                this.lastFrame();
            }, me);
        }
    },

    /**
     * @private
     * Fires beforeanimate and sets the running flag.
     */
    start: function(startTime) {
        var me = this,
            delay = me.delay,
            delayStart = me.delayStart,
            delayDelta;
        if (delay) {
            if (!delayStart) {
                me.delayStart = startTime;
                return;
            }
            else {
                delayDelta = startTime - delayStart;
                if (delayDelta < delay) {
                    return;
                }
                else {
                    // Compensate for frame delay;
                    startTime = new Date(delayStart.getTime() + delay);
                }
            }
        }
        if (me.fireEvent('beforeanimate', me) !== false) {
            me.startTime = startTime;
            me.running = true;
            me.animations[me.keyframeStep].paused = false;
        }
    },

    /**
     * @private
     * Perform lastFrame cleanup and handle iterations
     * @returns a hash of the new attributes.
     */
    lastFrame: function() {
        var me = this,
            iter = me.iterations,
            iterCount = me.currentIteration;

        iterCount++;
        if (iterCount < iter) {
            me.startTime = new Date();
            me.currentIteration = iterCount;
            me.keyframeStep = 0;
            me.applyAnimator(me.target);
            me.animations[me.keyframeStep].paused = false;
        }
        else {
            me.currentIteration = 0;
            me.end();
        }
    },

    /**
     * Fire afteranimate event and end the animation. Usually called automatically when the
     * animation reaches its final frame, but can also be called manually to pre-emptively
     * stop and destroy the running animation.
     */
    end: function() {
        var me = this;
        me.fireEvent('afteranimate', me, me.startTime, new Date() - me.startTime);
    },
    
    isReady: function() {
        return this.paused === false && this.running === false && this.iterations > 0;
    },
    
    isRunning: function() {
        // Explicitly return false, we don't want to be run continuously by the manager
        return false;
    }
});
/**
 * This class manages animation for a specific {@link #target}. The animation allows
 * animation of various properties on the target, such as size, position, color and others.
 *
 * ## Starting Conditions
 *
 * The starting conditions for the animation are provided by the {@link #from} configuration.
 * Any/all of the properties in the {@link #from} configuration can be specified. If a particular
 * property is not defined, the starting value for that property will be read directly from the target.
 *
 * ## End Conditions
 *
 * The ending conditions for the animation are provided by the {@link #to} configuration. These mark
 * the final values once the animations has finished. The values in the {@link #from} can mirror
 * those in the {@link #to} configuration to provide a starting point.
 *
 * ## Other Options
 *
 *  - {@link #duration}: Specifies the time period of the animation.
 *  - {@link #easing}: Specifies the easing of the animation.
 *  - {@link #iterations}: Allows the animation to repeat a number of times.
 *  - {@link #alternate}: Used in conjunction with {@link #iterations}, reverses the direction every second iteration.
 *
 * ## Example Code
 *
 *     @example
 *     var myComponent = Ext.create('Ext.Component', {
 *         renderTo: document.body,
 *         width: 200,
 *         height: 200,
 *         style: 'border: 1px solid red;'
 *     });
 *
 *     Ext.create('Ext.fx.Anim', {
 *         target: myComponent,
 *         duration: 1000,
 *         from: {
 *             width: 400 //starting width 400
 *         },
 *         to: {
 *             width: 300, //end width 300
 *             height: 300 // end height 300
 *         }
 *     });
 */
Ext.define('Ext.fx.Anim', {

    /* Begin Definitions */

    mixins: {
        observable: 'Ext.util.Observable'
    },

    requires: ['Ext.fx.Manager', 'Ext.fx.Animator', 'Ext.fx.Easing', 'Ext.fx.CubicBezier', 'Ext.fx.PropertyHandler'],

    /* End Definitions */

    /**
     * @property {Boolean} isAnimation
     * `true` in this class to identify an object as an instantiated Anim, or subclass thereof.
     */
    isAnimation: true,

    /**
     * @cfg {Function} callback
     * A function to be run after the animation has completed.
     */

    /**
     * @cfg {Function} scope
     * The scope that the {@link #callback} function will be called with
     */

    /**
     * @cfg {Number} duration
     * Time in milliseconds for a single animation to last. If the {@link #iterations} property is
     * specified, then each animate will take the same duration for each iteration.
     */
    duration: 250,

    /**
     * @cfg {Number} delay
     * Time to delay before starting the animation.
     */
    delay: 0,

    /* @private used to track a delayed starting time */
    delayStart: 0,

    /**
     * @cfg {Boolean} dynamic
     * Currently only for Component Animation: Only set a component's outer element size bypassing layouts.
     * Set to true to do full layouts for every frame of the animation.
     */
    dynamic: false,

    /**
     * @cfg {String} easing
     * This describes how the intermediate values used during a transition will be calculated.
     * It allows for a transition to change speed over its duration.
     *
     * - backIn
     * - backOut
     * - bounceIn
     * - bounceOut
     * - ease
     * - easeIn
     * - easeOut
     * - easeInOut
     * - elasticIn
     * - elasticOut
     * - cubic-bezier(x1, y1, x2, y2)
     *
     * Note that cubic-bezier will create a custom easing curve following the CSS3 [transition-timing-function][0]
     * specification.  The four values specify points P1 and P2 of the curve as (x1, y1, x2, y2). All values must
     * be in the range [0, 1] or the definition is invalid.
     *
     * [0]: http://www.w3.org/TR/css3-transitions/#transition-timing-function_tag
     */
    easing: 'ease',

    /**
     * @cfg {Object} keyframes
     * Animation keyframes follow the CSS3 Animation configuration pattern. 'from' is always considered '0%' and 'to'
     * is considered '100%'. **Every keyframe declaration must have a keyframe rule for 0% and 100%, possibly defined using
     * "from" or "to".**  A keyframe declaration without these keyframe selectors is invalid and will not be available for
     * animation.  The keyframe declaration for a keyframe rule consists of properties and values. Properties that are unable to
     * be animated are ignored in these rules, with the exception of 'easing' which can be changed at each keyframe. For example:
     *
     *     keyframes : {
     *         '0%': {
     *             left: 100
     *         },
     *         '40%': {
     *             left: 150
     *         },
     *         '60%': {
     *             left: 75
     *         },
     *         '100%': {
     *             left: 100
     *         }
     *     }
     */

    /**
     * @private
     */
    damper: 1,

    /**
     * @private
     */
    bezierRE: /^(?:cubic-)?bezier\(([^,]+),([^,]+),([^,]+),([^\)]+)\)/,

    /**
     * Run the animation from the end to the beginning
     * Defaults to false.
     * @cfg {Boolean} reverse
     */
    reverse: false,

    /**
     * Flag to determine if the animation has started
     * @property running
     * @type Boolean
     */
    running: false,

    /**
     * Flag to determine if the animation is paused. Only set this to true if you need to
     * keep the Anim instance around to be unpaused later; otherwise call {@link #end}.
     * @property paused
     * @type Boolean
     */
    paused: false,

    /**
     * @cfg {Number} iterations
     * Number of times to execute the animation.
     */
    iterations: 1,

    /**
     * @cfg {Boolean} alternate
     * Used in conjunction with iterations to reverse the animation each time an iteration completes.
     */
    alternate: false,

    /**
     * Current iteration the animation is running.
     * @property currentIteration
     * @type Number
     */
    currentIteration: 0,

    /**
     * Starting time of the animation.
     * @property startTime
     * @type Date
     */
    startTime: 0,

    /**
     * Contains a cache of the interpolators to be used.
     * @private
     * @property propHandlers
     * @type Object
     */

    /**
     * @cfg {String/Object} target
     * The {@link Ext.fx.target.Target} to apply the animation to.  This should only be specified when creating an Ext.fx.Anim directly.
     * The target does not need to be a {@link Ext.fx.target.Target} instance, it can be the underlying object. For example, you can
     * pass a Component, Element or Sprite as the target and the Anim will create the appropriate {@link Ext.fx.target.Target} object
     * automatically.
     */

    /**
     * @cfg {Object} from
     * An object containing property/value pairs for the beginning of the animation.  If not specified, the current state of the
     * Ext.fx.target will be used. For example:
     *
     *     from: {
     *         opacity: 0,       // Transparent
     *         color: '#ffffff', // White
     *         left: 0
     *     }
     *
     */

    /**
     * @cfg {Object} to (required)
     * An object containing property/value pairs for the end of the animation. For example:
     *
     *     to: {
     *         opacity: 1,       // Opaque
     *         color: '#00ff00', // Green
     *         left: 500
     *     }
     *
     */
    
    // @private
    frameCount: 0,

    // @private
    constructor: function(config) {
        var me = this,
            curve;
            
        config = config || {};
        // If keyframes are passed, they really want an Animator instead.
        if (config.keyframes) {
            return new Ext.fx.Animator(config);
        }
        Ext.apply(me, config);
        if (me.from === undefined) {
            me.from = {};
        }
        me.propHandlers = {};
        me.config = config;
        me.target = Ext.fx.Manager.createTarget(me.target);
        me.easingFn = Ext.fx.Easing[me.easing];
        me.target.dynamic = me.dynamic;

        // If not a pre-defined curve, try a cubic-bezier
        if (!me.easingFn) {
            me.easingFn = String(me.easing).match(me.bezierRE);
            if (me.easingFn && me.easingFn.length == 5) {
                curve = me.easingFn;
                me.easingFn = Ext.fx.CubicBezier.cubicBezier(+curve[1], +curve[2], +curve[3], +curve[4]);
            }
        }
        me.id = Ext.id(null, 'ext-anim-');
        me.addEvents(
            /**
             * @event beforeanimate
             * Fires before the animation starts. A handler can return false to cancel the animation.
             * @param {Ext.fx.Anim} this
             */
            'beforeanimate',
             /**
              * @event afteranimate
              * Fires when the animation is complete.
              * @param {Ext.fx.Anim} this
              * @param {Date} startTime
              */
            'afteranimate',
             /**
              * @event lastframe
              * Fires when the animation's last frame has been set.
              * @param {Ext.fx.Anim} this
              * @param {Date} startTime
              */
            'lastframe'
        );
        me.mixins.observable.constructor.call(me);
        Ext.fx.Manager.addAnim(me);
    },

    /**
     * @private
     * Helper to the target
     */
    setAttr: function(attr, value) {
        return Ext.fx.Manager.items.get(this.id).setAttr(this.target, attr, value);
    },

    /**
     * @private
     * Set up the initial currentAttrs hash.
     */
    initAttrs: function() {
        var me = this,
            from = me.from,
            to = me.to,
            initialFrom = me.initialFrom || {},
            out = {},
            start, end, propHandler, attr;

        for (attr in to) {
            if (to.hasOwnProperty(attr)) {
                start = me.target.getAttr(attr, from[attr]);
                end = to[attr];
                // Use default (numeric) property handler
                if (!Ext.fx.PropertyHandler[attr]) {
                    if (Ext.isObject(end)) {
                        propHandler = me.propHandlers[attr] = Ext.fx.PropertyHandler.object;
                    } else {
                        propHandler = me.propHandlers[attr] = Ext.fx.PropertyHandler.defaultHandler;
                    }
                }
                // Use custom handler
                else {
                    propHandler = me.propHandlers[attr] = Ext.fx.PropertyHandler[attr];
                }
                out[attr] = propHandler.get(start, end, me.damper, initialFrom[attr], attr);
            }
        }
        me.currentAttrs = out;
    },

    /**
     * @private
     * Fires beforeanimate and sets the running flag.
     */
    start: function(startTime) {
        var me = this,
            delay = me.delay,
            delayStart = me.delayStart,
            delayDelta;
        
        if (delay) {
            if (!delayStart) {
                me.delayStart = startTime;
                return;
            }
            else {
                delayDelta = startTime - delayStart;
                if (delayDelta < delay) {
                    return;
                }
                else {
                    // Compensate for frame delay;
                    startTime = new Date(delayStart.getTime() + delay);
                }
            }
        }
        if (me.fireEvent('beforeanimate', me) !== false) {
            me.startTime = startTime;
            if (!me.paused && !me.currentAttrs) {
                me.initAttrs();
            }
            me.running = true;
            me.frameCount = 0;
        }
    },

    /**
     * @private
     * Calculate attribute value at the passed timestamp.
     * @returns a hash of the new attributes.
     */
    runAnim: function(elapsedTime) {
        var me = this,
            attrs = me.currentAttrs,
            duration = me.duration,
            easingFn = me.easingFn,
            propHandlers = me.propHandlers,
            ret = {},
            easing, values, attr, lastFrame;

        if (elapsedTime >= duration) {
            elapsedTime = duration;
            lastFrame = true;
        }
        if (me.reverse) {
            elapsedTime = duration - elapsedTime;
        }

        for (attr in attrs) {
            if (attrs.hasOwnProperty(attr)) {
                values = attrs[attr];
                easing = lastFrame ? 1 : easingFn(elapsedTime / duration);
                ret[attr] = propHandlers[attr].set(values, easing);
            }
        }
        me.frameCount++;
            
        return ret;
    },

    /**
     * @private
     * Perform lastFrame cleanup and handle iterations
     * @returns a hash of the new attributes.
     */
    lastFrame: function() {
        var me = this,
            iter = me.iterations,
            iterCount = me.currentIteration;

        iterCount++;
        if (iterCount < iter) {
            if (me.alternate) {
                me.reverse = !me.reverse;
            }
            me.startTime = new Date();
            me.currentIteration = iterCount;
            // Turn off paused for CSS3 Transitions
            me.paused = false;
        }
        else {
            me.currentIteration = 0;
            me.end();
            me.fireEvent('lastframe', me, me.startTime);
        }
    },

    endWasCalled: 0,

    /**
     * Fire afteranimate event and end the animation. Usually called automatically when the
     * animation reaches its final frame, but can also be called manually to pre-emptively
     * stop and destroy the running animation.
     */
    end: function() {
        if (this.endWasCalled++) {
            return;
        }
        var me = this;
        me.startTime = 0;
        me.paused = false;
        me.running = false;
        Ext.fx.Manager.removeAnim(me);
        me.fireEvent('afteranimate', me, me.startTime);
        Ext.callback(me.callback, me.scope, [me, me.startTime]);
    },
    
    isReady: function() {
        return this.paused === false && this.running === false && this.iterations > 0;
    },
    
    isRunning: function() {
        return this.paused === false && this.running === true && this.isAnimator !== true;
    }
});
// Set flag to indicate that Fx is available. Class might not be available immediately.
Ext.enableFx = true;
