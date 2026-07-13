import { c as Mt } from "./mount-CV8u78K6.js";
var fi = Object.create, on = Object.defineProperty, di = Object.getOwnPropertyDescriptor, pi = Object.getOwnPropertyNames, mi = Object.getPrototypeOf, wi = Object.prototype.hasOwnProperty, sn = (e, n) => () => (e && (n = e(e = 0)), n), le = (e, n) => () => (n || (e((n = { exports: {} }).exports, n), e = null), n.exports), gi = (e, n, t, u) => {
  if (n && typeof n == "object" || typeof n == "function") for (var l = pi(n), o = 0, s = l.length, a; o < s; o++)
    a = l[o], !wi.call(e, a) && a !== t && on(e, a, {
      get: ((d) => n[d]).bind(null, a),
      enumerable: !(u = di(n, a)) || u.enumerable
    });
  return e;
}, br = (e, n, t) => (t = e != null ? fi(mi(e)) : {}, gi(on(t, "default", {
  value: e,
  enumerable: !0
}), e)), jt = /* @__PURE__ */ ((e) => typeof require < "u" ? require : typeof Proxy < "u" ? new Proxy(e, { get: (n, t) => (typeof require < "u" ? require : n)[t] }) : e)(function(e) {
  if (typeof require < "u") return require.apply(this, arguments);
  throw Error('Calling `require` for "' + e + "\" in an environment that doesn't expose the `require` function. See https://rolldown.rs/in-depth/bundling-cjs#require-external-modules for more details.");
});
function It(e) {
  "@babel/helpers - typeof";
  return It = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(n) {
    return typeof n;
  } : function(n) {
    return n && typeof Symbol == "function" && n.constructor === Symbol && n !== Symbol.prototype ? "symbol" : typeof n;
  }, It(e);
}
function vi(e, n) {
  if (It(e) != "object" || !e) return e;
  var t = e[Symbol.toPrimitive];
  if (t !== void 0) {
    var u = t.call(e, n);
    if (It(u) != "object") return u;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (n === "string" ? String : Number)(e);
}
function yi(e) {
  var n = vi(e, "string");
  return It(n) == "symbol" ? n : n + "";
}
function ie(e, n, t) {
  return (n = yi(n)) in e ? Object.defineProperty(e, n, {
    value: t,
    enumerable: !0,
    configurable: !0,
    writable: !0
  }) : e[n] = t, e;
}
var $t = class {
  /**
  * Creates a new BaseXmlComponent with the specified XML element name.
  *
  * @param rootKey - The XML element name (e.g., "w:p", "w:r", "w:t")
  */
  constructor(e) {
    ie(
      this,
      /** The XML element name for this component (e.g., "w:p" for paragraph). */
      "rootKey",
      void 0
    ), this.rootKey = e;
  }
}, bi = Object.seal({}), ce = class extends $t {
  /**
  * Creates a new XmlComponent.
  *
  * @param rootKey - The XML element name (e.g., "w:p", "w:r", "w:t")
  */
  constructor(e) {
    super(e), ie(
      this,
      /**
      * Array of child components, text nodes, and attributes.
      *
      * This array forms the content of the XML element. It can contain other
      * XmlComponents, string values (text nodes), or attribute components.
      */
      "root",
      void 0
    ), this.root = new Array();
  }
  /**
  * Prepares this component and its children for XML serialization.
  *
  * This method is called by the Formatter to convert the component tree into
  * an object structure compatible with the xml library (https://www.npmjs.com/package/xml).
  * It recursively processes all children and handles special cases like
  * attribute-only elements and empty elements.
  *
  * The method can be overridden by subclasses to customize XML representation
  * or execute side effects during serialization (e.g., creating relationships).
  *
  * @param context - The serialization context containing document state
  * @returns The XML-serializable object, or undefined to exclude from output
  *
  * @example
  * ```typescript
  * // Override to add custom serialization logic
  * prepForXml(context: IContext): IXmlableObject | undefined {
  *   // Custom logic here
  *   return super.prepForXml(context);
  * }
  * ```
  */
  prepForXml(e) {
    var n;
    e.stack.push(this);
    const t = this.root.map((u) => u instanceof $t ? u.prepForXml(e) : u).filter((u) => u !== void 0);
    return e.stack.pop(), { [this.rootKey]: t.length ? t.length === 1 && (!((n = t[0]) === null || n === void 0) && n._attr) ? t[0] : t : bi };
  }
  /**
  * Adds a child element to this component.
  *
  * @deprecated Do not use this method. It is only used internally by the library. It will be removed in a future version.
  * @param child - The child component or text string to add
  * @returns This component (for chaining)
  */
  addChildElement(e) {
    return this.root.push(e), this;
  }
}, Xe = class extends ce {
  constructor(e, n) {
    super(e), ie(this, "includeIfEmpty", void 0), this.includeIfEmpty = n;
  }
  /**
  * Prepares the component for XML serialization, excluding it if empty.
  *
  * @param context - The serialization context
  * @returns The XML-serializable object, or undefined if empty
  */
  prepForXml(e) {
    const n = super.prepForXml(e);
    if (this.includeIfEmpty || n && (typeof n[this.rootKey] != "object" || Object.keys(n[this.rootKey]).length)) return n;
  }
};
function Mr(e, n) {
  var t = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var u = Object.getOwnPropertySymbols(e);
    n && (u = u.filter(function(l) {
      return Object.getOwnPropertyDescriptor(e, l).enumerable;
    })), t.push.apply(t, u);
  }
  return t;
}
function pe(e) {
  for (var n = 1; n < arguments.length; n++) {
    var t = arguments[n] != null ? arguments[n] : {};
    n % 2 ? Mr(Object(t), !0).forEach(function(u) {
      ie(e, u, t[u]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : Mr(Object(t)).forEach(function(u) {
      Object.defineProperty(e, u, Object.getOwnPropertyDescriptor(t, u));
    });
  }
  return e;
}
var ve = class extends $t {
  /**
  * Creates a new attribute component.
  *
  * @param root - The attribute data object
  */
  constructor(e) {
    super("_attr"), ie(this, "root", void 0), ie(
      this,
      /** Optional mapping from property names to XML attribute names. */
      "xmlKeys",
      void 0
    ), this.root = e;
  }
  /**
  * Converts the attribute data to an XML-serializable object.
  *
  * This method transforms the property names using xmlKeys (if defined)
  * and filters out undefined values.
  *
  * @param _ - Context (unused for attributes)
  * @returns Object with _attr key containing the mapped attributes
  */
  prepForXml(e) {
    const n = {};
    return Object.entries(this.root).forEach(([t, u]) => {
      if (u !== void 0) {
        const l = this.xmlKeys && this.xmlKeys[t] || t;
        n[l] = u;
      }
    }), { _attr: n };
  }
}, _i = class extends $t {
  /**
  * Creates a new NextAttributeComponent.
  *
  * @param root - Attribute payload with explicit key-value mappings
  */
  constructor(e) {
    super("_attr"), ie(this, "root", void 0), this.root = e;
  }
  /**
  * Converts the attribute payload to an XML-serializable object.
  *
  * Extracts the key and value from each property and filters out
  * undefined values.
  *
  * @param _ - Context (unused for attributes)
  * @returns Object with _attr key containing the attributes
  */
  prepForXml(e) {
    return { _attr: Object.values(this.root).filter(({ value: n }) => n !== void 0).reduce((n, { key: t, value: u }) => pe(pe({}, n), {}, { [t]: u }), {}) };
  }
}, Re = class extends ve {
  constructor(...e) {
    super(...e), ie(this, "xmlKeys", {
      val: "w:val",
      color: "w:color",
      fill: "w:fill",
      space: "w:space",
      sz: "w:sz",
      type: "w:type",
      rsidR: "w:rsidR",
      rsidRPr: "w:rsidRPr",
      rsidSect: "w:rsidSect",
      w: "w:w",
      h: "w:h",
      top: "w:top",
      right: "w:right",
      bottom: "w:bottom",
      left: "w:left",
      header: "w:header",
      footer: "w:footer",
      gutter: "w:gutter",
      linePitch: "w:linePitch",
      pos: "w:pos"
    });
  }
}, _r = /* @__PURE__ */ le(((e, n) => {
  var t = typeof Reflect == "object" ? Reflect : null, u = t && typeof t.apply == "function" ? t.apply : function(F, M, I) {
    return Function.prototype.apply.call(F, M, I);
  }, l;
  t && typeof t.ownKeys == "function" ? l = t.ownKeys : Object.getOwnPropertySymbols ? l = function(F) {
    return Object.getOwnPropertyNames(F).concat(Object.getOwnPropertySymbols(F));
  } : l = function(F) {
    return Object.getOwnPropertyNames(F);
  };
  function o(p) {
    console && console.warn && console.warn(p);
  }
  var s = Number.isNaN || function(F) {
    return F !== F;
  };
  function a() {
    a.init.call(this);
  }
  n.exports = a, n.exports.once = x, a.EventEmitter = a, a.prototype._events = void 0, a.prototype._eventsCount = 0, a.prototype._maxListeners = void 0;
  var d = 10;
  function g(p) {
    if (typeof p != "function") throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof p);
  }
  Object.defineProperty(a, "defaultMaxListeners", {
    enumerable: !0,
    get: function() {
      return d;
    },
    set: function(p) {
      if (typeof p != "number" || p < 0 || s(p)) throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + p + ".");
      d = p;
    }
  }), a.init = function() {
    (this._events === void 0 || this._events === Object.getPrototypeOf(this)._events) && (this._events = /* @__PURE__ */ Object.create(null), this._eventsCount = 0), this._maxListeners = this._maxListeners || void 0;
  }, a.prototype.setMaxListeners = function(F) {
    if (typeof F != "number" || F < 0 || s(F)) throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + F + ".");
    return this._maxListeners = F, this;
  };
  function v(p) {
    return p._maxListeners === void 0 ? a.defaultMaxListeners : p._maxListeners;
  }
  a.prototype.getMaxListeners = function() {
    return v(this);
  }, a.prototype.emit = function(F) {
    for (var M = [], I = 1; I < arguments.length; I++) M.push(arguments[I]);
    var q = F === "error", Q = this._events;
    if (Q !== void 0) q = q && Q.error === void 0;
    else if (!q) return !1;
    if (q) {
      var O;
      if (M.length > 0 && (O = M[0]), O instanceof Error) throw O;
      var W = /* @__PURE__ */ new Error("Unhandled error." + (O ? " (" + O.message + ")" : ""));
      throw W.context = O, W;
    }
    var T = Q[F];
    if (T === void 0) return !1;
    if (typeof T == "function") u(T, this, M);
    else
      for (var H = T.length, J = k(T, H), I = 0; I < H; ++I) u(J[I], this, M);
    return !0;
  };
  function b(p, F, M, I) {
    var q, Q, O;
    if (g(M), Q = p._events, Q === void 0 ? (Q = p._events = /* @__PURE__ */ Object.create(null), p._eventsCount = 0) : (Q.newListener !== void 0 && (p.emit("newListener", F, M.listener ? M.listener : M), Q = p._events), O = Q[F]), O === void 0)
      O = Q[F] = M, ++p._eventsCount;
    else if (typeof O == "function" ? O = Q[F] = I ? [M, O] : [O, M] : I ? O.unshift(M) : O.push(M), q = v(p), q > 0 && O.length > q && !O.warned) {
      O.warned = !0;
      var W = /* @__PURE__ */ new Error("Possible EventEmitter memory leak detected. " + O.length + " " + String(F) + " listeners added. Use emitter.setMaxListeners() to increase limit");
      W.name = "MaxListenersExceededWarning", W.emitter = p, W.type = F, W.count = O.length, o(W);
    }
    return p;
  }
  a.prototype.addListener = function(F, M) {
    return b(this, F, M, !1);
  }, a.prototype.on = a.prototype.addListener, a.prototype.prependListener = function(F, M) {
    return b(this, F, M, !0);
  };
  function R() {
    if (!this.fired)
      return this.target.removeListener(this.type, this.wrapFn), this.fired = !0, arguments.length === 0 ? this.listener.call(this.target) : this.listener.apply(this.target, arguments);
  }
  function m(p, F, M) {
    var I = {
      fired: !1,
      wrapFn: void 0,
      target: p,
      type: F,
      listener: M
    }, q = R.bind(I);
    return q.listener = M, I.wrapFn = q, q;
  }
  a.prototype.once = function(F, M) {
    return g(M), this.on(F, m(this, F, M)), this;
  }, a.prototype.prependOnceListener = function(F, M) {
    return g(M), this.prependListener(F, m(this, F, M)), this;
  }, a.prototype.removeListener = function(F, M) {
    var I, q, Q, O, W;
    if (g(M), q = this._events, q === void 0) return this;
    if (I = q[F], I === void 0) return this;
    if (I === M || I.listener === M) --this._eventsCount === 0 ? this._events = /* @__PURE__ */ Object.create(null) : (delete q[F], q.removeListener && this.emit("removeListener", F, I.listener || M));
    else if (typeof I != "function") {
      for (Q = -1, O = I.length - 1; O >= 0; O--) if (I[O] === M || I[O].listener === M) {
        W = I[O].listener, Q = O;
        break;
      }
      if (Q < 0) return this;
      Q === 0 ? I.shift() : N(I, Q), I.length === 1 && (q[F] = I[0]), q.removeListener !== void 0 && this.emit("removeListener", F, W || M);
    }
    return this;
  }, a.prototype.off = a.prototype.removeListener, a.prototype.removeAllListeners = function(F) {
    var M, I = this._events, q;
    if (I === void 0) return this;
    if (I.removeListener === void 0)
      return arguments.length === 0 ? (this._events = /* @__PURE__ */ Object.create(null), this._eventsCount = 0) : I[F] !== void 0 && (--this._eventsCount === 0 ? this._events = /* @__PURE__ */ Object.create(null) : delete I[F]), this;
    if (arguments.length === 0) {
      var Q = Object.keys(I), O;
      for (q = 0; q < Q.length; ++q)
        O = Q[q], O !== "removeListener" && this.removeAllListeners(O);
      return this.removeAllListeners("removeListener"), this._events = /* @__PURE__ */ Object.create(null), this._eventsCount = 0, this;
    }
    if (M = I[F], typeof M == "function") this.removeListener(F, M);
    else if (M !== void 0) for (q = M.length - 1; q >= 0; q--) this.removeListener(F, M[q]);
    return this;
  };
  function w(p, F, M) {
    var I = p._events;
    if (I === void 0) return [];
    var q = I[F];
    return q === void 0 ? [] : typeof q == "function" ? M ? [q.listener || q] : [q] : M ? _(q) : k(q, q.length);
  }
  a.prototype.listeners = function(F) {
    return w(this, F, !0);
  }, a.prototype.rawListeners = function(F) {
    return w(this, F, !1);
  }, a.listenerCount = function(p, F) {
    return typeof p.listenerCount == "function" ? p.listenerCount(F) : y.call(p, F);
  }, a.prototype.listenerCount = y;
  function y(p) {
    var F = this._events;
    if (F !== void 0) {
      var M = F[p];
      if (typeof M == "function") return 1;
      if (M !== void 0) return M.length;
    }
    return 0;
  }
  a.prototype.eventNames = function() {
    return this._eventsCount > 0 ? l(this._events) : [];
  };
  function k(p, F) {
    for (var M = new Array(F), I = 0; I < F; ++I) M[I] = p[I];
    return M;
  }
  function N(p, F) {
    for (; F + 1 < p.length; F++) p[F] = p[F + 1];
    p.pop();
  }
  function _(p) {
    for (var F = new Array(p.length), M = 0; M < F.length; ++M) F[M] = p[M].listener || p[M];
    return F;
  }
  function x(p, F) {
    return new Promise(function(M, I) {
      function q(O) {
        p.removeListener(F, Q), I(O);
      }
      function Q() {
        typeof p.removeListener == "function" && p.removeListener("error", q), M([].slice.call(arguments));
      }
      S(p, F, Q, { once: !0 }), F !== "error" && A(p, q, { once: !0 });
    });
  }
  function A(p, F, M) {
    typeof p.on == "function" && S(p, "error", F, M);
  }
  function S(p, F, M, I) {
    if (typeof p.on == "function") I.once ? p.once(F, M) : p.on(F, M);
    else if (typeof p.addEventListener == "function") p.addEventListener(F, function q(Q) {
      I.once && p.removeEventListener(F, q), M(Q);
    });
    else throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type ' + typeof p);
  }
})), Ze = /* @__PURE__ */ le(((e, n) => {
  typeof Object.create == "function" ? n.exports = function(u, l) {
    l && (u.super_ = l, u.prototype = Object.create(l.prototype, { constructor: {
      value: u,
      enumerable: !1,
      writable: !0,
      configurable: !0
    } }));
  } : n.exports = function(u, l) {
    if (l) {
      u.super_ = l;
      var o = function() {
      };
      o.prototype = l.prototype, u.prototype = new o(), u.prototype.constructor = u;
    }
  };
})), Ce, vt = sn((() => {
  Ce = globalThis || self;
}));
function xi(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, "default") ? e.default : e;
}
function wr() {
  throw new Error("setTimeout has not been defined");
}
function gr() {
  throw new Error("clearTimeout has not been defined");
}
function un(e) {
  if (Be === setTimeout) return setTimeout(e, 0);
  if ((Be === wr || !Be) && setTimeout)
    return Be = setTimeout, setTimeout(e, 0);
  try {
    return Be(e, 0);
  } catch {
    try {
      return Be.call(null, e, 0);
    } catch {
      return Be.call(this, e, 0);
    }
  }
}
function Ei(e) {
  if (Le === clearTimeout) return clearTimeout(e);
  if ((Le === gr || !Le) && clearTimeout)
    return Le = clearTimeout, clearTimeout(e);
  try {
    return Le(e);
  } catch {
    try {
      return Le.call(null, e);
    } catch {
      return Le.call(this, e);
    }
  }
}
function Si() {
  !nt || !rt || (nt = !1, rt.length ? Ue = rt.concat(Ue) : Rt = -1, Ue.length && ln());
}
function ln() {
  if (!nt) {
    var e = un(Si);
    nt = !0;
    for (var n = Ue.length; n; ) {
      for (rt = Ue, Ue = []; ++Rt < n; ) rt && rt[Rt].run();
      Rt = -1, n = Ue.length;
    }
    rt = null, nt = !1, Ei(e);
  }
}
function jr(e, n) {
  this.fun = e, this.array = n;
}
function ze() {
}
var ir, _e, Be, Le, Ue, nt, rt, Rt, zr, ge, Ye = sn((() => {
  ir = { exports: {} }, _e = ir.exports = {}, (function() {
    try {
      typeof setTimeout == "function" ? Be = setTimeout : Be = wr;
    } catch {
      Be = wr;
    }
    try {
      typeof clearTimeout == "function" ? Le = clearTimeout : Le = gr;
    } catch {
      Le = gr;
    }
  })(), Ue = [], nt = !1, Rt = -1, _e.nextTick = function(e) {
    var n = new Array(arguments.length - 1);
    if (arguments.length > 1) for (var t = 1; t < arguments.length; t++) n[t - 1] = arguments[t];
    Ue.push(new jr(e, n)), Ue.length === 1 && !nt && un(ln);
  }, jr.prototype.run = function() {
    this.fun.apply(null, this.array);
  }, _e.title = "browser", _e.browser = !0, _e.env = {}, _e.argv = [], _e.version = "", _e.versions = {}, _e.on = ze, _e.addListener = ze, _e.once = ze, _e.off = ze, _e.removeListener = ze, _e.removeAllListeners = ze, _e.emit = ze, _e.prependListener = ze, _e.prependOnceListener = ze, _e.listeners = function(e) {
    return [];
  }, _e.binding = function(e) {
    throw new Error("process.binding is not supported");
  }, _e.cwd = function() {
    return "/";
  }, _e.chdir = function(e) {
    throw new Error("process.chdir is not supported");
  }, _e.umask = function() {
    return 0;
  }, zr = ir.exports, ge = /* @__PURE__ */ xi(zr);
})), cn = /* @__PURE__ */ le(((e, n) => {
  n.exports = _r().EventEmitter;
})), Ti = /* @__PURE__ */ le(((e) => {
  e.byteLength = d, e.toByteArray = v, e.fromByteArray = m;
  for (var n = [], t = [], u = typeof Uint8Array < "u" ? Uint8Array : Array, l = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", o = 0, s = l.length; o < s; ++o)
    n[o] = l[o], t[l.charCodeAt(o)] = o;
  t[45] = 62, t[95] = 63;
  function a(w) {
    var y = w.length;
    if (y % 4 > 0) throw new Error("Invalid string. Length must be a multiple of 4");
    var k = w.indexOf("=");
    k === -1 && (k = y);
    var N = k === y ? 0 : 4 - k % 4;
    return [k, N];
  }
  function d(w) {
    var y = a(w), k = y[0], N = y[1];
    return (k + N) * 3 / 4 - N;
  }
  function g(w, y, k) {
    return (y + k) * 3 / 4 - k;
  }
  function v(w) {
    var y, k = a(w), N = k[0], _ = k[1], x = new u(g(w, N, _)), A = 0, S = _ > 0 ? N - 4 : N, p;
    for (p = 0; p < S; p += 4)
      y = t[w.charCodeAt(p)] << 18 | t[w.charCodeAt(p + 1)] << 12 | t[w.charCodeAt(p + 2)] << 6 | t[w.charCodeAt(p + 3)], x[A++] = y >> 16 & 255, x[A++] = y >> 8 & 255, x[A++] = y & 255;
    return _ === 2 && (y = t[w.charCodeAt(p)] << 2 | t[w.charCodeAt(p + 1)] >> 4, x[A++] = y & 255), _ === 1 && (y = t[w.charCodeAt(p)] << 10 | t[w.charCodeAt(p + 1)] << 4 | t[w.charCodeAt(p + 2)] >> 2, x[A++] = y >> 8 & 255, x[A++] = y & 255), x;
  }
  function b(w) {
    return n[w >> 18 & 63] + n[w >> 12 & 63] + n[w >> 6 & 63] + n[w & 63];
  }
  function R(w, y, k) {
    for (var N, _ = [], x = y; x < k; x += 3)
      N = (w[x] << 16 & 16711680) + (w[x + 1] << 8 & 65280) + (w[x + 2] & 255), _.push(b(N));
    return _.join("");
  }
  function m(w) {
    for (var y, k = w.length, N = k % 3, _ = [], x = 16383, A = 0, S = k - N; A < S; A += x) _.push(R(w, A, A + x > S ? S : A + x));
    return N === 1 ? (y = w[k - 1], _.push(n[y >> 2] + n[y << 4 & 63] + "==")) : N === 2 && (y = (w[k - 2] << 8) + w[k - 1], _.push(n[y >> 10] + n[y >> 4 & 63] + n[y << 2 & 63] + "=")), _.join("");
  }
})), Ai = /* @__PURE__ */ le(((e) => {
  /*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
  e.read = function(n, t, u, l, o) {
    var s, a, d = o * 8 - l - 1, g = (1 << d) - 1, v = g >> 1, b = -7, R = u ? o - 1 : 0, m = u ? -1 : 1, w = n[t + R];
    for (R += m, s = w & (1 << -b) - 1, w >>= -b, b += d; b > 0; s = s * 256 + n[t + R], R += m, b -= 8) ;
    for (a = s & (1 << -b) - 1, s >>= -b, b += l; b > 0; a = a * 256 + n[t + R], R += m, b -= 8) ;
    if (s === 0) s = 1 - v;
    else {
      if (s === g) return a ? NaN : (w ? -1 : 1) * (1 / 0);
      a = a + Math.pow(2, l), s = s - v;
    }
    return (w ? -1 : 1) * a * Math.pow(2, s - l);
  }, e.write = function(n, t, u, l, o, s) {
    var a, d, g, v = s * 8 - o - 1, b = (1 << v) - 1, R = b >> 1, m = o === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0, w = l ? 0 : s - 1, y = l ? 1 : -1, k = t < 0 || t === 0 && 1 / t < 0 ? 1 : 0;
    for (t = Math.abs(t), isNaN(t) || t === 1 / 0 ? (d = isNaN(t) ? 1 : 0, a = b) : (a = Math.floor(Math.log(t) / Math.LN2), t * (g = Math.pow(2, -a)) < 1 && (a--, g *= 2), a + R >= 1 ? t += m / g : t += m * Math.pow(2, 1 - R), t * g >= 2 && (a++, g /= 2), a + R >= b ? (d = 0, a = b) : a + R >= 1 ? (d = (t * g - 1) * Math.pow(2, o), a = a + R) : (d = t * Math.pow(2, R - 1) * Math.pow(2, o), a = 0)); o >= 8; n[u + w] = d & 255, w += y, d /= 256, o -= 8) ;
    for (a = a << o | d, v += o; v > 0; n[u + w] = a & 255, w += y, a /= 256, v -= 8) ;
    n[u + w - y] |= k * 128;
  };
}));
/*!
* The buffer module from node.js, for the browser.
*
* @author   Feross Aboukhadijeh <https://feross.org>
* @license  MIT
*/
var Zt = /* @__PURE__ */ le(((e) => {
  var n = Ti(), t = Ai(), u = typeof Symbol == "function" && typeof Symbol.for == "function" ? Symbol.for("nodejs.util.inspect.custom") : null;
  e.Buffer = a, e.SlowBuffer = _, e.INSPECT_MAX_BYTES = 50;
  var l = 2147483647;
  e.kMaxLength = l, a.TYPED_ARRAY_SUPPORT = o(), !a.TYPED_ARRAY_SUPPORT && typeof console < "u" && typeof console.error == "function" && console.error("This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support.");
  function o() {
    try {
      var C = new Uint8Array(1), r = { foo: function() {
        return 42;
      } };
      return Object.setPrototypeOf(r, Uint8Array.prototype), Object.setPrototypeOf(C, r), C.foo() === 42;
    } catch {
      return !1;
    }
  }
  Object.defineProperty(a.prototype, "parent", {
    enumerable: !0,
    get: function() {
      if (a.isBuffer(this))
        return this.buffer;
    }
  }), Object.defineProperty(a.prototype, "offset", {
    enumerable: !0,
    get: function() {
      if (a.isBuffer(this))
        return this.byteOffset;
    }
  });
  function s(C) {
    if (C > l) throw new RangeError('The value "' + C + '" is invalid for option "size"');
    var r = new Uint8Array(C);
    return Object.setPrototypeOf(r, a.prototype), r;
  }
  function a(C, r, i) {
    if (typeof C == "number") {
      if (typeof r == "string") throw new TypeError('The "string" argument must be of type string. Received type number');
      return b(C);
    }
    return d(C, r, i);
  }
  a.poolSize = 8192;
  function d(C, r, i) {
    if (typeof C == "string") return R(C, r);
    if (ArrayBuffer.isView(C)) return w(C);
    if (C == null) throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof C);
    if (B(C, ArrayBuffer) || C && B(C.buffer, ArrayBuffer) || typeof SharedArrayBuffer < "u" && (B(C, SharedArrayBuffer) || C && B(C.buffer, SharedArrayBuffer))) return y(C, r, i);
    if (typeof C == "number") throw new TypeError('The "value" argument must not be of type number. Received type number');
    var f = C.valueOf && C.valueOf();
    if (f != null && f !== C) return a.from(f, r, i);
    var L = k(C);
    if (L) return L;
    if (typeof Symbol < "u" && Symbol.toPrimitive != null && typeof C[Symbol.toPrimitive] == "function") return a.from(C[Symbol.toPrimitive]("string"), r, i);
    throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof C);
  }
  a.from = function(C, r, i) {
    return d(C, r, i);
  }, Object.setPrototypeOf(a.prototype, Uint8Array.prototype), Object.setPrototypeOf(a, Uint8Array);
  function g(C) {
    if (typeof C != "number") throw new TypeError('"size" argument must be of type number');
    if (C < 0) throw new RangeError('The value "' + C + '" is invalid for option "size"');
  }
  function v(C, r, i) {
    return g(C), C <= 0 ? s(C) : r !== void 0 ? typeof i == "string" ? s(C).fill(r, i) : s(C).fill(r) : s(C);
  }
  a.alloc = function(C, r, i) {
    return v(C, r, i);
  };
  function b(C) {
    return g(C), s(C < 0 ? 0 : N(C) | 0);
  }
  a.allocUnsafe = function(C) {
    return b(C);
  }, a.allocUnsafeSlow = function(C) {
    return b(C);
  };
  function R(C, r) {
    if ((typeof r != "string" || r === "") && (r = "utf8"), !a.isEncoding(r)) throw new TypeError("Unknown encoding: " + r);
    var i = x(C, r) | 0, f = s(i), L = f.write(C, r);
    return L !== i && (f = f.slice(0, L)), f;
  }
  function m(C) {
    for (var r = C.length < 0 ? 0 : N(C.length) | 0, i = s(r), f = 0; f < r; f += 1) i[f] = C[f] & 255;
    return i;
  }
  function w(C) {
    if (B(C, Uint8Array)) {
      var r = new Uint8Array(C);
      return y(r.buffer, r.byteOffset, r.byteLength);
    }
    return m(C);
  }
  function y(C, r, i) {
    if (r < 0 || C.byteLength < r) throw new RangeError('"offset" is outside of buffer bounds');
    if (C.byteLength < r + (i || 0)) throw new RangeError('"length" is outside of buffer bounds');
    var f;
    return r === void 0 && i === void 0 ? f = new Uint8Array(C) : i === void 0 ? f = new Uint8Array(C, r) : f = new Uint8Array(C, r, i), Object.setPrototypeOf(f, a.prototype), f;
  }
  function k(C) {
    if (a.isBuffer(C)) {
      var r = N(C.length) | 0, i = s(r);
      return i.length === 0 || C.copy(i, 0, 0, r), i;
    }
    if (C.length !== void 0)
      return typeof C.length != "number" || c(C.length) ? s(0) : m(C);
    if (C.type === "Buffer" && Array.isArray(C.data)) return m(C.data);
  }
  function N(C) {
    if (C >= l) throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + l.toString(16) + " bytes");
    return C | 0;
  }
  function _(C) {
    return +C != C && (C = 0), a.alloc(+C);
  }
  a.isBuffer = function(r) {
    return r != null && r._isBuffer === !0 && r !== a.prototype;
  }, a.compare = function(r, i) {
    if (B(r, Uint8Array) && (r = a.from(r, r.offset, r.byteLength)), B(i, Uint8Array) && (i = a.from(i, i.offset, i.byteLength)), !a.isBuffer(r) || !a.isBuffer(i)) throw new TypeError('The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array');
    if (r === i) return 0;
    for (var f = r.length, L = i.length, K = 0, z = Math.min(f, L); K < z; ++K) if (r[K] !== i[K]) {
      f = r[K], L = i[K];
      break;
    }
    return f < L ? -1 : L < f ? 1 : 0;
  }, a.isEncoding = function(r) {
    switch (String(r).toLowerCase()) {
      case "hex":
      case "utf8":
      case "utf-8":
      case "ascii":
      case "latin1":
      case "binary":
      case "base64":
      case "ucs2":
      case "ucs-2":
      case "utf16le":
      case "utf-16le":
        return !0;
      default:
        return !1;
    }
  }, a.concat = function(r, i) {
    if (!Array.isArray(r)) throw new TypeError('"list" argument must be an Array of Buffers');
    if (r.length === 0) return a.alloc(0);
    var f;
    if (i === void 0)
      for (i = 0, f = 0; f < r.length; ++f) i += r[f].length;
    var L = a.allocUnsafe(i), K = 0;
    for (f = 0; f < r.length; ++f) {
      var z = r[f];
      if (B(z, Uint8Array)) K + z.length > L.length ? a.from(z).copy(L, K) : Uint8Array.prototype.set.call(L, z, K);
      else if (a.isBuffer(z)) z.copy(L, K);
      else throw new TypeError('"list" argument must be an Array of Buffers');
      K += z.length;
    }
    return L;
  };
  function x(C, r) {
    if (a.isBuffer(C)) return C.length;
    if (ArrayBuffer.isView(C) || B(C, ArrayBuffer)) return C.byteLength;
    if (typeof C != "string") throw new TypeError('The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type ' + typeof C);
    var i = C.length, f = arguments.length > 2 && arguments[2] === !0;
    if (!f && i === 0) return 0;
    for (var L = !1; ; ) switch (r) {
      case "ascii":
      case "latin1":
      case "binary":
        return i;
      case "utf8":
      case "utf-8":
        return h(C).length;
      case "ucs2":
      case "ucs-2":
      case "utf16le":
      case "utf-16le":
        return i * 2;
      case "hex":
        return i >>> 1;
      case "base64":
        return re(C).length;
      default:
        if (L) return f ? -1 : h(C).length;
        r = ("" + r).toLowerCase(), L = !0;
    }
  }
  a.byteLength = x;
  function A(C, r, i) {
    var f = !1;
    if ((r === void 0 || r < 0) && (r = 0), r > this.length || ((i === void 0 || i > this.length) && (i = this.length), i <= 0) || (i >>>= 0, r >>>= 0, i <= r)) return "";
    for (C || (C = "utf8"); ; ) switch (C) {
      case "hex":
        return Z(this, r, i);
      case "utf8":
      case "utf-8":
        return T(this, r, i);
      case "ascii":
        return $(this, r, i);
      case "latin1":
      case "binary":
        return oe(this, r, i);
      case "base64":
        return W(this, r, i);
      case "ucs2":
      case "ucs-2":
      case "utf16le":
      case "utf-16le":
        return ee(this, r, i);
      default:
        if (f) throw new TypeError("Unknown encoding: " + C);
        C = (C + "").toLowerCase(), f = !0;
    }
  }
  a.prototype._isBuffer = !0;
  function S(C, r, i) {
    var f = C[r];
    C[r] = C[i], C[i] = f;
  }
  a.prototype.swap16 = function() {
    var r = this.length;
    if (r % 2 !== 0) throw new RangeError("Buffer size must be a multiple of 16-bits");
    for (var i = 0; i < r; i += 2) S(this, i, i + 1);
    return this;
  }, a.prototype.swap32 = function() {
    var r = this.length;
    if (r % 4 !== 0) throw new RangeError("Buffer size must be a multiple of 32-bits");
    for (var i = 0; i < r; i += 4)
      S(this, i, i + 3), S(this, i + 1, i + 2);
    return this;
  }, a.prototype.swap64 = function() {
    var r = this.length;
    if (r % 8 !== 0) throw new RangeError("Buffer size must be a multiple of 64-bits");
    for (var i = 0; i < r; i += 8)
      S(this, i, i + 7), S(this, i + 1, i + 6), S(this, i + 2, i + 5), S(this, i + 3, i + 4);
    return this;
  }, a.prototype.toString = function() {
    var r = this.length;
    return r === 0 ? "" : arguments.length === 0 ? T(this, 0, r) : A.apply(this, arguments);
  }, a.prototype.toLocaleString = a.prototype.toString, a.prototype.equals = function(r) {
    if (!a.isBuffer(r)) throw new TypeError("Argument must be a Buffer");
    return this === r ? !0 : a.compare(this, r) === 0;
  }, a.prototype.inspect = function() {
    var r = "", i = e.INSPECT_MAX_BYTES;
    return r = this.toString("hex", 0, i).replace(/(.{2})/g, "$1 ").trim(), this.length > i && (r += " ... "), "<Buffer " + r + ">";
  }, u && (a.prototype[u] = a.prototype.inspect), a.prototype.compare = function(r, i, f, L, K) {
    if (B(r, Uint8Array) && (r = a.from(r, r.offset, r.byteLength)), !a.isBuffer(r)) throw new TypeError('The "target" argument must be one of type Buffer or Uint8Array. Received type ' + typeof r);
    if (i === void 0 && (i = 0), f === void 0 && (f = r ? r.length : 0), L === void 0 && (L = 0), K === void 0 && (K = this.length), i < 0 || f > r.length || L < 0 || K > this.length) throw new RangeError("out of range index");
    if (L >= K && i >= f) return 0;
    if (L >= K) return -1;
    if (i >= f) return 1;
    if (i >>>= 0, f >>>= 0, L >>>= 0, K >>>= 0, this === r) return 0;
    for (var z = K - L, ne = f - i, se = Math.min(z, ne), ae = this.slice(L, K), he = r.slice(i, f), de = 0; de < se; ++de) if (ae[de] !== he[de]) {
      z = ae[de], ne = he[de];
      break;
    }
    return z < ne ? -1 : ne < z ? 1 : 0;
  };
  function p(C, r, i, f, L) {
    if (C.length === 0) return -1;
    if (typeof i == "string" ? (f = i, i = 0) : i > 2147483647 ? i = 2147483647 : i < -2147483648 && (i = -2147483648), i = +i, c(i) && (i = L ? 0 : C.length - 1), i < 0 && (i = C.length + i), i >= C.length) {
      if (L) return -1;
      i = C.length - 1;
    } else if (i < 0) if (L) i = 0;
    else return -1;
    if (typeof r == "string" && (r = a.from(r, f)), a.isBuffer(r))
      return r.length === 0 ? -1 : F(C, r, i, f, L);
    if (typeof r == "number")
      return r = r & 255, typeof Uint8Array.prototype.indexOf == "function" ? L ? Uint8Array.prototype.indexOf.call(C, r, i) : Uint8Array.prototype.lastIndexOf.call(C, r, i) : F(C, [r], i, f, L);
    throw new TypeError("val must be string, number or Buffer");
  }
  function F(C, r, i, f, L) {
    var K = 1, z = C.length, ne = r.length;
    if (f !== void 0 && (f = String(f).toLowerCase(), f === "ucs2" || f === "ucs-2" || f === "utf16le" || f === "utf-16le")) {
      if (C.length < 2 || r.length < 2) return -1;
      K = 2, z /= 2, ne /= 2, i /= 2;
    }
    function se(Ee, Ve) {
      return K === 1 ? Ee[Ve] : Ee.readUInt16BE(Ve * K);
    }
    var ae;
    if (L) {
      var he = -1;
      for (ae = i; ae < z; ae++) if (se(C, ae) === se(r, he === -1 ? 0 : ae - he)) {
        if (he === -1 && (he = ae), ae - he + 1 === ne) return he * K;
      } else
        he !== -1 && (ae -= ae - he), he = -1;
    } else
      for (i + ne > z && (i = z - ne), ae = i; ae >= 0; ae--) {
        for (var de = !0, me = 0; me < ne; me++) if (se(C, ae + me) !== se(r, me)) {
          de = !1;
          break;
        }
        if (de) return ae;
      }
    return -1;
  }
  a.prototype.includes = function(r, i, f) {
    return this.indexOf(r, i, f) !== -1;
  }, a.prototype.indexOf = function(r, i, f) {
    return p(this, r, i, f, !0);
  }, a.prototype.lastIndexOf = function(r, i, f) {
    return p(this, r, i, f, !1);
  };
  function M(C, r, i, f) {
    i = Number(i) || 0;
    var L = C.length - i;
    f ? (f = Number(f), f > L && (f = L)) : f = L;
    var K = r.length;
    f > K / 2 && (f = K / 2);
    for (var z = 0; z < f; ++z) {
      var ne = parseInt(r.substr(z * 2, 2), 16);
      if (c(ne)) return z;
      C[i + z] = ne;
    }
    return z;
  }
  function I(C, r, i, f) {
    return D(h(r, C.length - i), C, i, f);
  }
  function q(C, r, i, f) {
    return D(j(r), C, i, f);
  }
  function Q(C, r, i, f) {
    return D(re(r), C, i, f);
  }
  function O(C, r, i, f) {
    return D(U(r, C.length - i), C, i, f);
  }
  a.prototype.write = function(r, i, f, L) {
    if (i === void 0)
      L = "utf8", f = this.length, i = 0;
    else if (f === void 0 && typeof i == "string")
      L = i, f = this.length, i = 0;
    else if (isFinite(i))
      i = i >>> 0, isFinite(f) ? (f = f >>> 0, L === void 0 && (L = "utf8")) : (L = f, f = void 0);
    else throw new Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");
    var K = this.length - i;
    if ((f === void 0 || f > K) && (f = K), r.length > 0 && (f < 0 || i < 0) || i > this.length) throw new RangeError("Attempt to write outside buffer bounds");
    L || (L = "utf8");
    for (var z = !1; ; ) switch (L) {
      case "hex":
        return M(this, r, i, f);
      case "utf8":
      case "utf-8":
        return I(this, r, i, f);
      case "ascii":
      case "latin1":
      case "binary":
        return q(this, r, i, f);
      case "base64":
        return Q(this, r, i, f);
      case "ucs2":
      case "ucs-2":
      case "utf16le":
      case "utf-16le":
        return O(this, r, i, f);
      default:
        if (z) throw new TypeError("Unknown encoding: " + L);
        L = ("" + L).toLowerCase(), z = !0;
    }
  }, a.prototype.toJSON = function() {
    return {
      type: "Buffer",
      data: Array.prototype.slice.call(this._arr || this, 0)
    };
  };
  function W(C, r, i) {
    return r === 0 && i === C.length ? n.fromByteArray(C) : n.fromByteArray(C.slice(r, i));
  }
  function T(C, r, i) {
    i = Math.min(C.length, i);
    for (var f = [], L = r; L < i; ) {
      var K = C[L], z = null, ne = K > 239 ? 4 : K > 223 ? 3 : K > 191 ? 2 : 1;
      if (L + ne <= i) {
        var se, ae, he, de;
        switch (ne) {
          case 1:
            K < 128 && (z = K);
            break;
          case 2:
            se = C[L + 1], (se & 192) === 128 && (de = (K & 31) << 6 | se & 63, de > 127 && (z = de));
            break;
          case 3:
            se = C[L + 1], ae = C[L + 2], (se & 192) === 128 && (ae & 192) === 128 && (de = (K & 15) << 12 | (se & 63) << 6 | ae & 63, de > 2047 && (de < 55296 || de > 57343) && (z = de));
            break;
          case 4:
            se = C[L + 1], ae = C[L + 2], he = C[L + 3], (se & 192) === 128 && (ae & 192) === 128 && (he & 192) === 128 && (de = (K & 15) << 18 | (se & 63) << 12 | (ae & 63) << 6 | he & 63, de > 65535 && de < 1114112 && (z = de));
        }
      }
      z === null ? (z = 65533, ne = 1) : z > 65535 && (z -= 65536, f.push(z >>> 10 & 1023 | 55296), z = 56320 | z & 1023), f.push(z), L += ne;
    }
    return J(f);
  }
  var H = 4096;
  function J(C) {
    var r = C.length;
    if (r <= H) return String.fromCharCode.apply(String, C);
    for (var i = "", f = 0; f < r; ) i += String.fromCharCode.apply(String, C.slice(f, f += H));
    return i;
  }
  function $(C, r, i) {
    var f = "";
    i = Math.min(C.length, i);
    for (var L = r; L < i; ++L) f += String.fromCharCode(C[L] & 127);
    return f;
  }
  function oe(C, r, i) {
    var f = "";
    i = Math.min(C.length, i);
    for (var L = r; L < i; ++L) f += String.fromCharCode(C[L]);
    return f;
  }
  function Z(C, r, i) {
    var f = C.length;
    (!r || r < 0) && (r = 0), (!i || i < 0 || i > f) && (i = f);
    for (var L = "", K = r; K < i; ++K) L += G[C[K]];
    return L;
  }
  function ee(C, r, i) {
    for (var f = C.slice(r, i), L = "", K = 0; K < f.length - 1; K += 2) L += String.fromCharCode(f[K] + f[K + 1] * 256);
    return L;
  }
  a.prototype.slice = function(r, i) {
    var f = this.length;
    r = ~~r, i = i === void 0 ? f : ~~i, r < 0 ? (r += f, r < 0 && (r = 0)) : r > f && (r = f), i < 0 ? (i += f, i < 0 && (i = 0)) : i > f && (i = f), i < r && (i = r);
    var L = this.subarray(r, i);
    return Object.setPrototypeOf(L, a.prototype), L;
  };
  function V(C, r, i) {
    if (C % 1 !== 0 || C < 0) throw new RangeError("offset is not uint");
    if (C + r > i) throw new RangeError("Trying to access beyond buffer length");
  }
  a.prototype.readUintLE = a.prototype.readUIntLE = function(r, i, f) {
    r = r >>> 0, i = i >>> 0, f || V(r, i, this.length);
    for (var L = this[r], K = 1, z = 0; ++z < i && (K *= 256); ) L += this[r + z] * K;
    return L;
  }, a.prototype.readUintBE = a.prototype.readUIntBE = function(r, i, f) {
    r = r >>> 0, i = i >>> 0, f || V(r, i, this.length);
    for (var L = this[r + --i], K = 1; i > 0 && (K *= 256); ) L += this[r + --i] * K;
    return L;
  }, a.prototype.readUint8 = a.prototype.readUInt8 = function(r, i) {
    return r = r >>> 0, i || V(r, 1, this.length), this[r];
  }, a.prototype.readUint16LE = a.prototype.readUInt16LE = function(r, i) {
    return r = r >>> 0, i || V(r, 2, this.length), this[r] | this[r + 1] << 8;
  }, a.prototype.readUint16BE = a.prototype.readUInt16BE = function(r, i) {
    return r = r >>> 0, i || V(r, 2, this.length), this[r] << 8 | this[r + 1];
  }, a.prototype.readUint32LE = a.prototype.readUInt32LE = function(r, i) {
    return r = r >>> 0, i || V(r, 4, this.length), (this[r] | this[r + 1] << 8 | this[r + 2] << 16) + this[r + 3] * 16777216;
  }, a.prototype.readUint32BE = a.prototype.readUInt32BE = function(r, i) {
    return r = r >>> 0, i || V(r, 4, this.length), this[r] * 16777216 + (this[r + 1] << 16 | this[r + 2] << 8 | this[r + 3]);
  }, a.prototype.readIntLE = function(r, i, f) {
    r = r >>> 0, i = i >>> 0, f || V(r, i, this.length);
    for (var L = this[r], K = 1, z = 0; ++z < i && (K *= 256); ) L += this[r + z] * K;
    return K *= 128, L >= K && (L -= Math.pow(2, 8 * i)), L;
  }, a.prototype.readIntBE = function(r, i, f) {
    r = r >>> 0, i = i >>> 0, f || V(r, i, this.length);
    for (var L = i, K = 1, z = this[r + --L]; L > 0 && (K *= 256); ) z += this[r + --L] * K;
    return K *= 128, z >= K && (z -= Math.pow(2, 8 * i)), z;
  }, a.prototype.readInt8 = function(r, i) {
    return r = r >>> 0, i || V(r, 1, this.length), this[r] & 128 ? (255 - this[r] + 1) * -1 : this[r];
  }, a.prototype.readInt16LE = function(r, i) {
    r = r >>> 0, i || V(r, 2, this.length);
    var f = this[r] | this[r + 1] << 8;
    return f & 32768 ? f | 4294901760 : f;
  }, a.prototype.readInt16BE = function(r, i) {
    r = r >>> 0, i || V(r, 2, this.length);
    var f = this[r + 1] | this[r] << 8;
    return f & 32768 ? f | 4294901760 : f;
  }, a.prototype.readInt32LE = function(r, i) {
    return r = r >>> 0, i || V(r, 4, this.length), this[r] | this[r + 1] << 8 | this[r + 2] << 16 | this[r + 3] << 24;
  }, a.prototype.readInt32BE = function(r, i) {
    return r = r >>> 0, i || V(r, 4, this.length), this[r] << 24 | this[r + 1] << 16 | this[r + 2] << 8 | this[r + 3];
  }, a.prototype.readFloatLE = function(r, i) {
    return r = r >>> 0, i || V(r, 4, this.length), t.read(this, r, !0, 23, 4);
  }, a.prototype.readFloatBE = function(r, i) {
    return r = r >>> 0, i || V(r, 4, this.length), t.read(this, r, !1, 23, 4);
  }, a.prototype.readDoubleLE = function(r, i) {
    return r = r >>> 0, i || V(r, 8, this.length), t.read(this, r, !0, 52, 8);
  }, a.prototype.readDoubleBE = function(r, i) {
    return r = r >>> 0, i || V(r, 8, this.length), t.read(this, r, !1, 52, 8);
  };
  function P(C, r, i, f, L, K) {
    if (!a.isBuffer(C)) throw new TypeError('"buffer" argument must be a Buffer instance');
    if (r > L || r < K) throw new RangeError('"value" argument is out of bounds');
    if (i + f > C.length) throw new RangeError("Index out of range");
  }
  a.prototype.writeUintLE = a.prototype.writeUIntLE = function(r, i, f, L) {
    if (r = +r, i = i >>> 0, f = f >>> 0, !L) {
      var K = Math.pow(2, 8 * f) - 1;
      P(this, r, i, f, K, 0);
    }
    var z = 1, ne = 0;
    for (this[i] = r & 255; ++ne < f && (z *= 256); ) this[i + ne] = r / z & 255;
    return i + f;
  }, a.prototype.writeUintBE = a.prototype.writeUIntBE = function(r, i, f, L) {
    if (r = +r, i = i >>> 0, f = f >>> 0, !L) {
      var K = Math.pow(2, 8 * f) - 1;
      P(this, r, i, f, K, 0);
    }
    var z = f - 1, ne = 1;
    for (this[i + z] = r & 255; --z >= 0 && (ne *= 256); ) this[i + z] = r / ne & 255;
    return i + f;
  }, a.prototype.writeUint8 = a.prototype.writeUInt8 = function(r, i, f) {
    return r = +r, i = i >>> 0, f || P(this, r, i, 1, 255, 0), this[i] = r & 255, i + 1;
  }, a.prototype.writeUint16LE = a.prototype.writeUInt16LE = function(r, i, f) {
    return r = +r, i = i >>> 0, f || P(this, r, i, 2, 65535, 0), this[i] = r & 255, this[i + 1] = r >>> 8, i + 2;
  }, a.prototype.writeUint16BE = a.prototype.writeUInt16BE = function(r, i, f) {
    return r = +r, i = i >>> 0, f || P(this, r, i, 2, 65535, 0), this[i] = r >>> 8, this[i + 1] = r & 255, i + 2;
  }, a.prototype.writeUint32LE = a.prototype.writeUInt32LE = function(r, i, f) {
    return r = +r, i = i >>> 0, f || P(this, r, i, 4, 4294967295, 0), this[i + 3] = r >>> 24, this[i + 2] = r >>> 16, this[i + 1] = r >>> 8, this[i] = r & 255, i + 4;
  }, a.prototype.writeUint32BE = a.prototype.writeUInt32BE = function(r, i, f) {
    return r = +r, i = i >>> 0, f || P(this, r, i, 4, 4294967295, 0), this[i] = r >>> 24, this[i + 1] = r >>> 16, this[i + 2] = r >>> 8, this[i + 3] = r & 255, i + 4;
  }, a.prototype.writeIntLE = function(r, i, f, L) {
    if (r = +r, i = i >>> 0, !L) {
      var K = Math.pow(2, 8 * f - 1);
      P(this, r, i, f, K - 1, -K);
    }
    var z = 0, ne = 1, se = 0;
    for (this[i] = r & 255; ++z < f && (ne *= 256); )
      r < 0 && se === 0 && this[i + z - 1] !== 0 && (se = 1), this[i + z] = (r / ne >> 0) - se & 255;
    return i + f;
  }, a.prototype.writeIntBE = function(r, i, f, L) {
    if (r = +r, i = i >>> 0, !L) {
      var K = Math.pow(2, 8 * f - 1);
      P(this, r, i, f, K - 1, -K);
    }
    var z = f - 1, ne = 1, se = 0;
    for (this[i + z] = r & 255; --z >= 0 && (ne *= 256); )
      r < 0 && se === 0 && this[i + z + 1] !== 0 && (se = 1), this[i + z] = (r / ne >> 0) - se & 255;
    return i + f;
  }, a.prototype.writeInt8 = function(r, i, f) {
    return r = +r, i = i >>> 0, f || P(this, r, i, 1, 127, -128), r < 0 && (r = 255 + r + 1), this[i] = r & 255, i + 1;
  }, a.prototype.writeInt16LE = function(r, i, f) {
    return r = +r, i = i >>> 0, f || P(this, r, i, 2, 32767, -32768), this[i] = r & 255, this[i + 1] = r >>> 8, i + 2;
  }, a.prototype.writeInt16BE = function(r, i, f) {
    return r = +r, i = i >>> 0, f || P(this, r, i, 2, 32767, -32768), this[i] = r >>> 8, this[i + 1] = r & 255, i + 2;
  }, a.prototype.writeInt32LE = function(r, i, f) {
    return r = +r, i = i >>> 0, f || P(this, r, i, 4, 2147483647, -2147483648), this[i] = r & 255, this[i + 1] = r >>> 8, this[i + 2] = r >>> 16, this[i + 3] = r >>> 24, i + 4;
  }, a.prototype.writeInt32BE = function(r, i, f) {
    return r = +r, i = i >>> 0, f || P(this, r, i, 4, 2147483647, -2147483648), r < 0 && (r = 4294967295 + r + 1), this[i] = r >>> 24, this[i + 1] = r >>> 16, this[i + 2] = r >>> 8, this[i + 3] = r & 255, i + 4;
  };
  function X(C, r, i, f, L, K) {
    if (i + f > C.length) throw new RangeError("Index out of range");
    if (i < 0) throw new RangeError("Index out of range");
  }
  function Y(C, r, i, f, L) {
    return r = +r, i = i >>> 0, L || X(C, r, i, 4), t.write(C, r, i, f, 23, 4), i + 4;
  }
  a.prototype.writeFloatLE = function(r, i, f) {
    return Y(this, r, i, !0, f);
  }, a.prototype.writeFloatBE = function(r, i, f) {
    return Y(this, r, i, !1, f);
  };
  function te(C, r, i, f, L) {
    return r = +r, i = i >>> 0, L || X(C, r, i, 8), t.write(C, r, i, f, 52, 8), i + 8;
  }
  a.prototype.writeDoubleLE = function(r, i, f) {
    return te(this, r, i, !0, f);
  }, a.prototype.writeDoubleBE = function(r, i, f) {
    return te(this, r, i, !1, f);
  }, a.prototype.copy = function(r, i, f, L) {
    if (!a.isBuffer(r)) throw new TypeError("argument should be a Buffer");
    if (f || (f = 0), !L && L !== 0 && (L = this.length), i >= r.length && (i = r.length), i || (i = 0), L > 0 && L < f && (L = f), L === f || r.length === 0 || this.length === 0) return 0;
    if (i < 0) throw new RangeError("targetStart out of bounds");
    if (f < 0 || f >= this.length) throw new RangeError("Index out of range");
    if (L < 0) throw new RangeError("sourceEnd out of bounds");
    L > this.length && (L = this.length), r.length - i < L - f && (L = r.length - i + f);
    var K = L - f;
    return this === r && typeof Uint8Array.prototype.copyWithin == "function" ? this.copyWithin(i, f, L) : Uint8Array.prototype.set.call(r, this.subarray(f, L), i), K;
  }, a.prototype.fill = function(r, i, f, L) {
    if (typeof r == "string") {
      if (typeof i == "string" ? (L = i, i = 0, f = this.length) : typeof f == "string" && (L = f, f = this.length), L !== void 0 && typeof L != "string") throw new TypeError("encoding must be a string");
      if (typeof L == "string" && !a.isEncoding(L)) throw new TypeError("Unknown encoding: " + L);
      if (r.length === 1) {
        var K = r.charCodeAt(0);
        (L === "utf8" && K < 128 || L === "latin1") && (r = K);
      }
    } else typeof r == "number" ? r = r & 255 : typeof r == "boolean" && (r = Number(r));
    if (i < 0 || this.length < i || this.length < f) throw new RangeError("Out of range index");
    if (f <= i) return this;
    i = i >>> 0, f = f === void 0 ? this.length : f >>> 0, r || (r = 0);
    var z;
    if (typeof r == "number") for (z = i; z < f; ++z) this[z] = r;
    else {
      var ne = a.isBuffer(r) ? r : a.from(r, L), se = ne.length;
      if (se === 0) throw new TypeError('The value "' + r + '" is invalid for argument "value"');
      for (z = 0; z < f - i; ++z) this[z + i] = ne[z % se];
    }
    return this;
  };
  var fe = /[^+/0-9A-Za-z-_]/g;
  function E(C) {
    if (C = C.split("=")[0], C = C.trim().replace(fe, ""), C.length < 2) return "";
    for (; C.length % 4 !== 0; ) C = C + "=";
    return C;
  }
  function h(C, r) {
    r = r || 1 / 0;
    for (var i, f = C.length, L = null, K = [], z = 0; z < f; ++z) {
      if (i = C.charCodeAt(z), i > 55295 && i < 57344) {
        if (!L) {
          if (i > 56319) {
            (r -= 3) > -1 && K.push(239, 191, 189);
            continue;
          } else if (z + 1 === f) {
            (r -= 3) > -1 && K.push(239, 191, 189);
            continue;
          }
          L = i;
          continue;
        }
        if (i < 56320) {
          (r -= 3) > -1 && K.push(239, 191, 189), L = i;
          continue;
        }
        i = (L - 55296 << 10 | i - 56320) + 65536;
      } else L && (r -= 3) > -1 && K.push(239, 191, 189);
      if (L = null, i < 128) {
        if ((r -= 1) < 0) break;
        K.push(i);
      } else if (i < 2048) {
        if ((r -= 2) < 0) break;
        K.push(i >> 6 | 192, i & 63 | 128);
      } else if (i < 65536) {
        if ((r -= 3) < 0) break;
        K.push(i >> 12 | 224, i >> 6 & 63 | 128, i & 63 | 128);
      } else if (i < 1114112) {
        if ((r -= 4) < 0) break;
        K.push(i >> 18 | 240, i >> 12 & 63 | 128, i >> 6 & 63 | 128, i & 63 | 128);
      } else throw new Error("Invalid code point");
    }
    return K;
  }
  function j(C) {
    for (var r = [], i = 0; i < C.length; ++i) r.push(C.charCodeAt(i) & 255);
    return r;
  }
  function U(C, r) {
    for (var i, f, L, K = [], z = 0; z < C.length && !((r -= 2) < 0); ++z)
      i = C.charCodeAt(z), f = i >> 8, L = i % 256, K.push(L), K.push(f);
    return K;
  }
  function re(C) {
    return n.toByteArray(E(C));
  }
  function D(C, r, i, f) {
    for (var L = 0; L < f && !(L + i >= r.length || L >= C.length); ++L)
      r[L + i] = C[L];
    return L;
  }
  function B(C, r) {
    return C instanceof r || C != null && C.constructor != null && C.constructor.name != null && C.constructor.name === r.name;
  }
  function c(C) {
    return C !== C;
  }
  var G = (function() {
    for (var C = "0123456789abcdef", r = new Array(256), i = 0; i < 16; ++i)
      for (var f = i * 16, L = 0; L < 16; ++L) r[f + L] = C[i] + C[L];
    return r;
  })();
})), hn = /* @__PURE__ */ le(((e, n) => {
  n.exports = function() {
    if (typeof Symbol != "function" || typeof Object.getOwnPropertySymbols != "function") return !1;
    if (typeof Symbol.iterator == "symbol") return !0;
    var u = {}, l = Symbol("test"), o = Object(l);
    if (typeof l == "string" || Object.prototype.toString.call(l) !== "[object Symbol]" || Object.prototype.toString.call(o) !== "[object Symbol]") return !1;
    var s = 42;
    u[l] = s;
    for (var a in u) return !1;
    if (typeof Object.keys == "function" && Object.keys(u).length !== 0 || typeof Object.getOwnPropertyNames == "function" && Object.getOwnPropertyNames(u).length !== 0) return !1;
    var d = Object.getOwnPropertySymbols(u);
    if (d.length !== 1 || d[0] !== l || !Object.prototype.propertyIsEnumerable.call(u, l)) return !1;
    if (typeof Object.getOwnPropertyDescriptor == "function") {
      var g = Object.getOwnPropertyDescriptor(u, l);
      if (g.value !== s || g.enumerable !== !0) return !1;
    }
    return !0;
  };
})), xr = /* @__PURE__ */ le(((e, n) => {
  var t = hn();
  n.exports = function() {
    return t() && !!Symbol.toStringTag;
  };
})), fn = /* @__PURE__ */ le(((e, n) => {
  n.exports = Object;
})), ki = /* @__PURE__ */ le(((e, n) => {
  n.exports = Error;
})), Ri = /* @__PURE__ */ le(((e, n) => {
  n.exports = EvalError;
})), Ci = /* @__PURE__ */ le(((e, n) => {
  n.exports = RangeError;
})), Ii = /* @__PURE__ */ le(((e, n) => {
  n.exports = ReferenceError;
})), dn = /* @__PURE__ */ le(((e, n) => {
  n.exports = SyntaxError;
})), Yt = /* @__PURE__ */ le(((e, n) => {
  n.exports = TypeError;
})), Ni = /* @__PURE__ */ le(((e, n) => {
  n.exports = URIError;
})), Oi = /* @__PURE__ */ le(((e, n) => {
  n.exports = Math.abs;
})), Fi = /* @__PURE__ */ le(((e, n) => {
  n.exports = Math.floor;
})), Pi = /* @__PURE__ */ le(((e, n) => {
  n.exports = Math.max;
})), Di = /* @__PURE__ */ le(((e, n) => {
  n.exports = Math.min;
})), Bi = /* @__PURE__ */ le(((e, n) => {
  n.exports = Math.pow;
})), Li = /* @__PURE__ */ le(((e, n) => {
  n.exports = Math.round;
})), Ui = /* @__PURE__ */ le(((e, n) => {
  n.exports = Number.isNaN || function(u) {
    return u !== u;
  };
})), Mi = /* @__PURE__ */ le(((e, n) => {
  var t = Ui();
  n.exports = function(l) {
    return t(l) || l === 0 ? l : l < 0 ? -1 : 1;
  };
})), ji = /* @__PURE__ */ le(((e, n) => {
  n.exports = Object.getOwnPropertyDescriptor;
})), Nt = /* @__PURE__ */ le(((e, n) => {
  var t = ji();
  if (t) try {
    t([], "length");
  } catch {
    t = null;
  }
  n.exports = t;
})), Jt = /* @__PURE__ */ le(((e, n) => {
  var t = Object.defineProperty || !1;
  if (t) try {
    t({}, "a", { value: 1 });
  } catch {
    t = !1;
  }
  n.exports = t;
})), zi = /* @__PURE__ */ le(((e, n) => {
  var t = typeof Symbol < "u" && Symbol, u = hn();
  n.exports = function() {
    return typeof t != "function" || typeof Symbol != "function" || typeof t("foo") != "symbol" || typeof Symbol("bar") != "symbol" ? !1 : u();
  };
})), pn = /* @__PURE__ */ le(((e, n) => {
  n.exports = typeof Reflect < "u" && Reflect.getPrototypeOf || null;
})), mn = /* @__PURE__ */ le(((e, n) => {
  n.exports = fn().getPrototypeOf || null;
})), Wi = /* @__PURE__ */ le(((e, n) => {
  var t = "Function.prototype.bind called on incompatible ", u = Object.prototype.toString, l = Math.max, o = "[object Function]", s = function(v, b) {
    for (var R = [], m = 0; m < v.length; m += 1) R[m] = v[m];
    for (var w = 0; w < b.length; w += 1) R[w + v.length] = b[w];
    return R;
  }, a = function(v, b) {
    for (var R = [], m = b, w = 0; m < v.length; m += 1, w += 1) R[w] = v[m];
    return R;
  }, d = function(g, v) {
    for (var b = "", R = 0; R < g.length; R += 1)
      b += g[R], R + 1 < g.length && (b += v);
    return b;
  };
  n.exports = function(v) {
    var b = this;
    if (typeof b != "function" || u.apply(b) !== o) throw new TypeError(t + b);
    for (var R = a(arguments, 1), m, w = function() {
      if (this instanceof m) {
        var x = b.apply(this, s(R, arguments));
        return Object(x) === x ? x : this;
      }
      return b.apply(v, s(R, arguments));
    }, y = l(0, b.length - R.length), k = [], N = 0; N < y; N++) k[N] = "$" + N;
    if (m = Function("binder", "return function (" + d(k, ",") + "){ return binder.apply(this,arguments); }")(w), b.prototype) {
      var _ = function() {
      };
      _.prototype = b.prototype, m.prototype = new _(), _.prototype = null;
    }
    return m;
  };
})), Ot = /* @__PURE__ */ le(((e, n) => {
  var t = Wi();
  n.exports = Function.prototype.bind || t;
})), Er = /* @__PURE__ */ le(((e, n) => {
  n.exports = Function.prototype.call;
})), Sr = /* @__PURE__ */ le(((e, n) => {
  n.exports = Function.prototype.apply;
})), Hi = /* @__PURE__ */ le(((e, n) => {
  n.exports = typeof Reflect < "u" && Reflect && Reflect.apply;
})), wn = /* @__PURE__ */ le(((e, n) => {
  var t = Ot(), u = Sr(), l = Er();
  n.exports = Hi() || t.call(l, u);
})), Tr = /* @__PURE__ */ le(((e, n) => {
  var t = Ot(), u = Yt(), l = Er(), o = wn();
  n.exports = function(a) {
    if (a.length < 1 || typeof a[0] != "function") throw new u("a function is required");
    return o(t, l, a);
  };
})), Ki = /* @__PURE__ */ le(((e, n) => {
  var t = Tr(), u = Nt(), l;
  try {
    l = [].__proto__ === Array.prototype;
  } catch (d) {
    if (!d || typeof d != "object" || !("code" in d) || d.code !== "ERR_PROTO_ACCESS") throw d;
  }
  var o = !!l && u && u(Object.prototype, "__proto__"), s = Object, a = s.getPrototypeOf;
  n.exports = o && typeof o.get == "function" ? t([o.get]) : typeof a == "function" ? function(g) {
    return a(g == null ? g : s(g));
  } : !1;
})), gn = /* @__PURE__ */ le(((e, n) => {
  var t = pn(), u = mn(), l = Ki();
  n.exports = t ? function(s) {
    return t(s);
  } : u ? function(s) {
    if (!s || typeof s != "object" && typeof s != "function") throw new TypeError("getProto: not an object");
    return u(s);
  } : l ? function(s) {
    return l(s);
  } : null;
})), Gi = /* @__PURE__ */ le(((e, n) => {
  var t = Function.prototype.call, u = Object.prototype.hasOwnProperty;
  n.exports = Ot().call(t, u);
})), vn = /* @__PURE__ */ le(((e, n) => {
  var t, u = fn(), l = ki(), o = Ri(), s = Ci(), a = Ii(), d = dn(), g = Yt(), v = Ni(), b = Oi(), R = Fi(), m = Pi(), w = Di(), y = Bi(), k = Li(), N = Mi(), _ = Function, x = function(U) {
    try {
      return _('"use strict"; return (' + U + ").constructor;")();
    } catch {
    }
  }, A = Nt(), S = Jt(), p = function() {
    throw new g();
  }, F = A ? (function() {
    try {
      return arguments.callee, p;
    } catch {
      try {
        return A(arguments, "callee").get;
      } catch {
        return p;
      }
    }
  })() : p, M = zi()(), I = gn(), q = mn(), Q = pn(), O = Sr(), W = Er(), T = {}, H = typeof Uint8Array > "u" || !I ? t : I(Uint8Array), J = {
    __proto__: null,
    "%AggregateError%": typeof AggregateError > "u" ? t : AggregateError,
    "%Array%": Array,
    "%ArrayBuffer%": typeof ArrayBuffer > "u" ? t : ArrayBuffer,
    "%ArrayIteratorPrototype%": M && I ? I([][Symbol.iterator]()) : t,
    "%AsyncFromSyncIteratorPrototype%": t,
    "%AsyncFunction%": T,
    "%AsyncGenerator%": T,
    "%AsyncGeneratorFunction%": T,
    "%AsyncIteratorPrototype%": T,
    "%Atomics%": typeof Atomics > "u" ? t : Atomics,
    "%BigInt%": typeof BigInt > "u" ? t : BigInt,
    "%BigInt64Array%": typeof BigInt64Array > "u" ? t : BigInt64Array,
    "%BigUint64Array%": typeof BigUint64Array > "u" ? t : BigUint64Array,
    "%Boolean%": Boolean,
    "%DataView%": typeof DataView > "u" ? t : DataView,
    "%Date%": Date,
    "%decodeURI%": decodeURI,
    "%decodeURIComponent%": decodeURIComponent,
    "%encodeURI%": encodeURI,
    "%encodeURIComponent%": encodeURIComponent,
    "%Error%": l,
    "%eval%": eval,
    "%EvalError%": o,
    "%Float16Array%": typeof Float16Array > "u" ? t : Float16Array,
    "%Float32Array%": typeof Float32Array > "u" ? t : Float32Array,
    "%Float64Array%": typeof Float64Array > "u" ? t : Float64Array,
    "%FinalizationRegistry%": typeof FinalizationRegistry > "u" ? t : FinalizationRegistry,
    "%Function%": _,
    "%GeneratorFunction%": T,
    "%Int8Array%": typeof Int8Array > "u" ? t : Int8Array,
    "%Int16Array%": typeof Int16Array > "u" ? t : Int16Array,
    "%Int32Array%": typeof Int32Array > "u" ? t : Int32Array,
    "%isFinite%": isFinite,
    "%isNaN%": isNaN,
    "%IteratorPrototype%": M && I ? I(I([][Symbol.iterator]())) : t,
    "%JSON%": typeof JSON == "object" ? JSON : t,
    "%Map%": typeof Map > "u" ? t : Map,
    "%MapIteratorPrototype%": typeof Map > "u" || !M || !I ? t : I((/* @__PURE__ */ new Map())[Symbol.iterator]()),
    "%Math%": Math,
    "%Number%": Number,
    "%Object%": u,
    "%Object.getOwnPropertyDescriptor%": A,
    "%parseFloat%": parseFloat,
    "%parseInt%": parseInt,
    "%Promise%": typeof Promise > "u" ? t : Promise,
    "%Proxy%": typeof Proxy > "u" ? t : Proxy,
    "%RangeError%": s,
    "%ReferenceError%": a,
    "%Reflect%": typeof Reflect > "u" ? t : Reflect,
    "%RegExp%": RegExp,
    "%Set%": typeof Set > "u" ? t : Set,
    "%SetIteratorPrototype%": typeof Set > "u" || !M || !I ? t : I((/* @__PURE__ */ new Set())[Symbol.iterator]()),
    "%SharedArrayBuffer%": typeof SharedArrayBuffer > "u" ? t : SharedArrayBuffer,
    "%String%": String,
    "%StringIteratorPrototype%": M && I ? I(""[Symbol.iterator]()) : t,
    "%Symbol%": M ? Symbol : t,
    "%SyntaxError%": d,
    "%ThrowTypeError%": F,
    "%TypedArray%": H,
    "%TypeError%": g,
    "%Uint8Array%": typeof Uint8Array > "u" ? t : Uint8Array,
    "%Uint8ClampedArray%": typeof Uint8ClampedArray > "u" ? t : Uint8ClampedArray,
    "%Uint16Array%": typeof Uint16Array > "u" ? t : Uint16Array,
    "%Uint32Array%": typeof Uint32Array > "u" ? t : Uint32Array,
    "%URIError%": v,
    "%WeakMap%": typeof WeakMap > "u" ? t : WeakMap,
    "%WeakRef%": typeof WeakRef > "u" ? t : WeakRef,
    "%WeakSet%": typeof WeakSet > "u" ? t : WeakSet,
    "%Function.prototype.call%": W,
    "%Function.prototype.apply%": O,
    "%Object.defineProperty%": S,
    "%Object.getPrototypeOf%": q,
    "%Math.abs%": b,
    "%Math.floor%": R,
    "%Math.max%": m,
    "%Math.min%": w,
    "%Math.pow%": y,
    "%Math.round%": k,
    "%Math.sign%": N,
    "%Reflect.getPrototypeOf%": Q
  };
  if (I) try {
    null.error;
  } catch (U) {
    J["%Error.prototype%"] = I(I(U));
  }
  var $ = function U(re) {
    var D;
    if (re === "%AsyncFunction%") D = x("async function () {}");
    else if (re === "%GeneratorFunction%") D = x("function* () {}");
    else if (re === "%AsyncGeneratorFunction%") D = x("async function* () {}");
    else if (re === "%AsyncGenerator%") {
      var B = U("%AsyncGeneratorFunction%");
      B && (D = B.prototype);
    } else if (re === "%AsyncIteratorPrototype%") {
      var c = U("%AsyncGenerator%");
      c && I && (D = I(c.prototype));
    }
    return J[re] = D, D;
  }, oe = {
    __proto__: null,
    "%ArrayBufferPrototype%": ["ArrayBuffer", "prototype"],
    "%ArrayPrototype%": ["Array", "prototype"],
    "%ArrayProto_entries%": [
      "Array",
      "prototype",
      "entries"
    ],
    "%ArrayProto_forEach%": [
      "Array",
      "prototype",
      "forEach"
    ],
    "%ArrayProto_keys%": [
      "Array",
      "prototype",
      "keys"
    ],
    "%ArrayProto_values%": [
      "Array",
      "prototype",
      "values"
    ],
    "%AsyncFunctionPrototype%": ["AsyncFunction", "prototype"],
    "%AsyncGenerator%": ["AsyncGeneratorFunction", "prototype"],
    "%AsyncGeneratorPrototype%": [
      "AsyncGeneratorFunction",
      "prototype",
      "prototype"
    ],
    "%BooleanPrototype%": ["Boolean", "prototype"],
    "%DataViewPrototype%": ["DataView", "prototype"],
    "%DatePrototype%": ["Date", "prototype"],
    "%ErrorPrototype%": ["Error", "prototype"],
    "%EvalErrorPrototype%": ["EvalError", "prototype"],
    "%Float32ArrayPrototype%": ["Float32Array", "prototype"],
    "%Float64ArrayPrototype%": ["Float64Array", "prototype"],
    "%FunctionPrototype%": ["Function", "prototype"],
    "%Generator%": ["GeneratorFunction", "prototype"],
    "%GeneratorPrototype%": [
      "GeneratorFunction",
      "prototype",
      "prototype"
    ],
    "%Int8ArrayPrototype%": ["Int8Array", "prototype"],
    "%Int16ArrayPrototype%": ["Int16Array", "prototype"],
    "%Int32ArrayPrototype%": ["Int32Array", "prototype"],
    "%JSONParse%": ["JSON", "parse"],
    "%JSONStringify%": ["JSON", "stringify"],
    "%MapPrototype%": ["Map", "prototype"],
    "%NumberPrototype%": ["Number", "prototype"],
    "%ObjectPrototype%": ["Object", "prototype"],
    "%ObjProto_toString%": [
      "Object",
      "prototype",
      "toString"
    ],
    "%ObjProto_valueOf%": [
      "Object",
      "prototype",
      "valueOf"
    ],
    "%PromisePrototype%": ["Promise", "prototype"],
    "%PromiseProto_then%": [
      "Promise",
      "prototype",
      "then"
    ],
    "%Promise_all%": ["Promise", "all"],
    "%Promise_reject%": ["Promise", "reject"],
    "%Promise_resolve%": ["Promise", "resolve"],
    "%RangeErrorPrototype%": ["RangeError", "prototype"],
    "%ReferenceErrorPrototype%": ["ReferenceError", "prototype"],
    "%RegExpPrototype%": ["RegExp", "prototype"],
    "%SetPrototype%": ["Set", "prototype"],
    "%SharedArrayBufferPrototype%": ["SharedArrayBuffer", "prototype"],
    "%StringPrototype%": ["String", "prototype"],
    "%SymbolPrototype%": ["Symbol", "prototype"],
    "%SyntaxErrorPrototype%": ["SyntaxError", "prototype"],
    "%TypedArrayPrototype%": ["TypedArray", "prototype"],
    "%TypeErrorPrototype%": ["TypeError", "prototype"],
    "%Uint8ArrayPrototype%": ["Uint8Array", "prototype"],
    "%Uint8ClampedArrayPrototype%": ["Uint8ClampedArray", "prototype"],
    "%Uint16ArrayPrototype%": ["Uint16Array", "prototype"],
    "%Uint32ArrayPrototype%": ["Uint32Array", "prototype"],
    "%URIErrorPrototype%": ["URIError", "prototype"],
    "%WeakMapPrototype%": ["WeakMap", "prototype"],
    "%WeakSetPrototype%": ["WeakSet", "prototype"]
  }, Z = Ot(), ee = Gi(), V = Z.call(W, Array.prototype.concat), P = Z.call(O, Array.prototype.splice), X = Z.call(W, String.prototype.replace), Y = Z.call(W, String.prototype.slice), te = Z.call(W, RegExp.prototype.exec), fe = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g, E = /\\(\\)?/g, h = function(re) {
    var D = Y(re, 0, 1), B = Y(re, -1);
    if (D === "%" && B !== "%") throw new d("invalid intrinsic syntax, expected closing `%`");
    if (B === "%" && D !== "%") throw new d("invalid intrinsic syntax, expected opening `%`");
    var c = [];
    return X(re, fe, function(G, C, r, i) {
      c[c.length] = r ? X(i, E, "$1") : C || G;
    }), c;
  }, j = function(re, D) {
    var B = re, c;
    if (ee(oe, B) && (c = oe[B], B = "%" + c[0] + "%"), ee(J, B)) {
      var G = J[B];
      if (G === T && (G = $(B)), typeof G > "u" && !D) throw new g("intrinsic " + re + " exists, but is not available. Please file an issue!");
      return {
        alias: c,
        name: B,
        value: G
      };
    }
    throw new d("intrinsic " + re + " does not exist!");
  };
  n.exports = function(re, D) {
    if (typeof re != "string" || re.length === 0) throw new g("intrinsic name must be a non-empty string");
    if (arguments.length > 1 && typeof D != "boolean") throw new g('"allowMissing" argument must be a boolean');
    if (te(/^%?[^%]*%?$/, re) === null) throw new d("`%` may not be present anywhere but at the beginning and end of the intrinsic name");
    var B = h(re), c = B.length > 0 ? B[0] : "", G = j("%" + c + "%", D), C = G.name, r = G.value, i = !1, f = G.alias;
    f && (c = f[0], P(B, V([0, 1], f)));
    for (var L = 1, K = !0; L < B.length; L += 1) {
      var z = B[L], ne = Y(z, 0, 1), se = Y(z, -1);
      if ((ne === '"' || ne === "'" || ne === "`" || se === '"' || se === "'" || se === "`") && ne !== se) throw new d("property names with quotes must have matching quotes");
      if ((z === "constructor" || !K) && (i = !0), c += "." + z, C = "%" + c + "%", ee(J, C)) r = J[C];
      else if (r != null) {
        if (!(z in r)) {
          if (!D) throw new g("base intrinsic for " + re + " exists, but the property is not available.");
          return;
        }
        if (A && L + 1 >= B.length) {
          var ae = A(r, z);
          K = !!ae, K && "get" in ae && !("originalValue" in ae.get) ? r = ae.get : r = r[z];
        } else
          K = ee(r, z), r = r[z];
        K && !i && (J[C] = r);
      }
    }
    return r;
  };
})), yn = /* @__PURE__ */ le(((e, n) => {
  var t = vn(), u = Tr(), l = u([t("%String.prototype.indexOf%")]);
  n.exports = function(s, a) {
    var d = t(s, !!a);
    return typeof d == "function" && l(s, ".prototype.") > -1 ? u([d]) : d;
  };
})), qi = /* @__PURE__ */ le(((e, n) => {
  var t = xr()(), u = yn()("Object.prototype.toString"), l = function(d) {
    return t && d && typeof d == "object" && Symbol.toStringTag in d ? !1 : u(d) === "[object Arguments]";
  }, o = function(d) {
    return l(d) ? !0 : d !== null && typeof d == "object" && "length" in d && typeof d.length == "number" && d.length >= 0 && u(d) !== "[object Array]" && "callee" in d && u(d.callee) === "[object Function]";
  }, s = (function() {
    return l(arguments);
  })();
  l.isLegacyArguments = o, n.exports = s ? l : o;
})), Vi = /* @__PURE__ */ le(((e, n) => {
  var t = Object.prototype.toString, u = Function.prototype.toString, l = /^\s*(?:function)?\*/, o = xr()(), s = Object.getPrototypeOf, a = function() {
    if (!o) return !1;
    try {
      return Function("return function*() {}")();
    } catch {
    }
  }, d;
  n.exports = function(v) {
    if (typeof v != "function") return !1;
    if (l.test(u.call(v))) return !0;
    if (!o) return t.call(v) === "[object GeneratorFunction]";
    if (!s) return !1;
    if (typeof d > "u") {
      var b = a();
      d = b ? s(b) : !1;
    }
    return s(v) === d;
  };
})), $i = /* @__PURE__ */ le(((e, n) => {
  var t = Function.prototype.toString, u = typeof Reflect == "object" && Reflect !== null && Reflect.apply, l, o;
  if (typeof u == "function" && typeof Object.defineProperty == "function") try {
    l = Object.defineProperty({}, "length", { get: function() {
      throw o;
    } }), o = {}, u(function() {
      throw 42;
    }, null, l);
  } catch (A) {
    A !== o && (u = null);
  }
  else u = null;
  var s = /^\s*class\b/, a = function(S) {
    try {
      var p = t.call(S);
      return s.test(p);
    } catch {
      return !1;
    }
  }, d = function(S) {
    try {
      return a(S) ? !1 : (t.call(S), !0);
    } catch {
      return !1;
    }
  }, g = Object.prototype.toString, v = "[object Object]", b = "[object Function]", R = "[object GeneratorFunction]", m = "[object HTMLAllCollection]", w = "[object HTML document.all class]", y = "[object HTMLCollection]", k = typeof Symbol == "function" && !!Symbol.toStringTag, N = !(0 in [,]), _ = function() {
    return !1;
  };
  if (typeof document == "object") {
    var x = document.all;
    g.call(x) === g.call(document.all) && (_ = function(S) {
      if ((N || !S) && (typeof S > "u" || typeof S == "object")) try {
        var p = g.call(S);
        return (p === m || p === w || p === y || p === v) && S("") == null;
      } catch {
      }
      return !1;
    });
  }
  n.exports = u ? function(S) {
    if (_(S)) return !0;
    if (!S || typeof S != "function" && typeof S != "object") return !1;
    try {
      u(S, null, l);
    } catch (p) {
      if (p !== o) return !1;
    }
    return !a(S) && d(S);
  } : function(S) {
    if (_(S)) return !0;
    if (!S || typeof S != "function" && typeof S != "object") return !1;
    if (k) return d(S);
    if (a(S)) return !1;
    var p = g.call(S);
    return p !== b && p !== R && !/^\[object HTML/.test(p) ? !1 : d(S);
  };
})), Xi = /* @__PURE__ */ le(((e, n) => {
  var t = $i(), u = Object.prototype.toString, l = Object.prototype.hasOwnProperty, o = function(v, b, R) {
    for (var m = 0, w = v.length; m < w; m++) l.call(v, m) && (R == null ? b(v[m], m, v) : b.call(R, v[m], m, v));
  }, s = function(v, b, R) {
    for (var m = 0, w = v.length; m < w; m++) R == null ? b(v.charAt(m), m, v) : b.call(R, v.charAt(m), m, v);
  }, a = function(v, b, R) {
    for (var m in v) l.call(v, m) && (R == null ? b(v[m], m, v) : b.call(R, v[m], m, v));
  };
  function d(g) {
    return u.call(g) === "[object Array]";
  }
  n.exports = function(v, b, R) {
    if (!t(b)) throw new TypeError("iterator must be a function");
    var m;
    arguments.length >= 3 && (m = R), d(v) ? o(v, b, m) : typeof v == "string" ? s(v, b, m) : a(v, b, m);
  };
})), Zi = /* @__PURE__ */ le(((e, n) => {
  n.exports = [
    "Float32Array",
    "Float64Array",
    "Int8Array",
    "Int16Array",
    "Int32Array",
    "Uint8Array",
    "Uint8ClampedArray",
    "Uint16Array",
    "Uint32Array",
    "BigInt64Array",
    "BigUint64Array"
  ];
})), Yi = /* @__PURE__ */ le(((e, n) => {
  vt();
  var t = Zi(), u = typeof globalThis > "u" ? Ce : globalThis;
  n.exports = function() {
    for (var o = [], s = 0; s < t.length; s++) typeof u[t[s]] == "function" && (o[o.length] = t[s]);
    return o;
  };
})), Ji = /* @__PURE__ */ le(((e, n) => {
  var t = Jt(), u = dn(), l = Yt(), o = Nt();
  n.exports = function(a, d, g) {
    if (!a || typeof a != "object" && typeof a != "function") throw new l("`obj` must be an object or a function`");
    if (typeof d != "string" && typeof d != "symbol") throw new l("`property` must be a string or a symbol`");
    if (arguments.length > 3 && typeof arguments[3] != "boolean" && arguments[3] !== null) throw new l("`nonEnumerable`, if provided, must be a boolean or null");
    if (arguments.length > 4 && typeof arguments[4] != "boolean" && arguments[4] !== null) throw new l("`nonWritable`, if provided, must be a boolean or null");
    if (arguments.length > 5 && typeof arguments[5] != "boolean" && arguments[5] !== null) throw new l("`nonConfigurable`, if provided, must be a boolean or null");
    if (arguments.length > 6 && typeof arguments[6] != "boolean") throw new l("`loose`, if provided, must be a boolean");
    var v = arguments.length > 3 ? arguments[3] : null, b = arguments.length > 4 ? arguments[4] : null, R = arguments.length > 5 ? arguments[5] : null, m = arguments.length > 6 ? arguments[6] : !1, w = !!o && o(a, d);
    if (t) t(a, d, {
      configurable: R === null && w ? w.configurable : !R,
      enumerable: v === null && w ? w.enumerable : !v,
      value: g,
      writable: b === null && w ? w.writable : !b
    });
    else if (m || !v && !b && !R) a[d] = g;
    else throw new u("This environment does not support defining a property as non-configurable, non-writable, or non-enumerable.");
  };
})), Qi = /* @__PURE__ */ le(((e, n) => {
  var t = Jt(), u = function() {
    return !!t;
  };
  u.hasArrayLengthDefineBug = function() {
    if (!t) return null;
    try {
      return t([], "length", { value: 1 }).length !== 1;
    } catch {
      return !0;
    }
  }, n.exports = u;
})), ea = /* @__PURE__ */ le(((e, n) => {
  var t = vn(), u = Ji(), l = Qi()(), o = Nt(), s = Yt(), a = t("%Math.floor%");
  n.exports = function(g, v) {
    if (typeof g != "function") throw new s("`fn` is not a function");
    if (typeof v != "number" || v < 0 || v > 4294967295 || a(v) !== v) throw new s("`length` must be a positive 32-bit integer");
    var b = arguments.length > 2 && !!arguments[2], R = !0, m = !0;
    if ("length" in g && o) {
      var w = o(g, "length");
      w && !w.configurable && (R = !1), w && !w.writable && (m = !1);
    }
    return (R || m || !b) && (l ? u(g, "length", v, !0, !0) : u(g, "length", v)), g;
  };
})), ta = /* @__PURE__ */ le(((e, n) => {
  var t = Ot(), u = Sr(), l = wn();
  n.exports = function() {
    return l(t, u, arguments);
  };
})), ra = /* @__PURE__ */ le(((e, n) => {
  var t = ea(), u = Jt(), l = Tr(), o = ta();
  n.exports = function(a) {
    var d = l(arguments), g = a.length - (arguments.length - 1);
    return t(d, 1 + (g > 0 ? g : 0), !0);
  }, u ? u(n.exports, "apply", { value: o }) : n.exports.apply = o;
})), bn = /* @__PURE__ */ le(((e, n) => {
  vt();
  var t = Xi(), u = Yi(), l = ra(), o = yn(), s = Nt(), a = gn(), d = o("Object.prototype.toString"), g = xr()(), v = typeof globalThis > "u" ? Ce : globalThis, b = u(), R = o("String.prototype.slice"), m = o("Array.prototype.indexOf", !0) || function(_, x) {
    for (var A = 0; A < _.length; A += 1) if (_[A] === x) return A;
    return -1;
  }, w = { __proto__: null };
  g && s && a ? t(b, function(N) {
    var _ = new v[N]();
    if (Symbol.toStringTag in _ && a) {
      var x = a(_), A = s(x, Symbol.toStringTag);
      !A && x && (A = s(a(x), Symbol.toStringTag)), w["$" + N] = l(A.get);
    }
  }) : t(b, function(N) {
    var _ = new v[N](), x = _.slice || _.set;
    x && (w["$" + N] = l(x));
  });
  var y = function(_) {
    var x = !1;
    return t(
      w,
      /** @type {(getter: Getter, name: `\$${import('.').TypedArrayName}`) => void} */
      function(A, S) {
        if (!x) try {
          "$" + A(_) === S && (x = R(S, 1));
        } catch {
        }
      }
    ), x;
  }, k = function(_) {
    var x = !1;
    return t(
      w,
      /** @type {(getter: Getter, name: `\$${import('.').TypedArrayName}`) => void} */
      function(A, S) {
        if (!x) try {
          A(_), x = R(S, 1);
        } catch {
        }
      }
    ), x;
  };
  n.exports = function(_) {
    if (!_ || typeof _ != "object") return !1;
    if (!g) {
      var x = R(d(_), 8, -1);
      return m(b, x) > -1 ? x : x !== "Object" ? !1 : k(_);
    }
    return s ? y(_) : null;
  };
})), na = /* @__PURE__ */ le(((e, n) => {
  var t = bn();
  n.exports = function(l) {
    return !!t(l);
  };
})), ia = /* @__PURE__ */ le(((e) => {
  var n = qi(), t = Vi(), u = bn(), l = na();
  function o(f) {
    return f.call.bind(f);
  }
  var s = typeof BigInt < "u", a = typeof Symbol < "u", d = o(Object.prototype.toString), g = o(Number.prototype.valueOf), v = o(String.prototype.valueOf), b = o(Boolean.prototype.valueOf);
  if (s) var R = o(BigInt.prototype.valueOf);
  if (a) var m = o(Symbol.prototype.valueOf);
  function w(f, L) {
    if (typeof f != "object") return !1;
    try {
      return L(f), !0;
    } catch {
      return !1;
    }
  }
  e.isArgumentsObject = n, e.isGeneratorFunction = t, e.isTypedArray = l;
  function y(f) {
    return typeof Promise < "u" && f instanceof Promise || f !== null && typeof f == "object" && typeof f.then == "function" && typeof f.catch == "function";
  }
  e.isPromise = y;
  function k(f) {
    return typeof ArrayBuffer < "u" && ArrayBuffer.isView ? ArrayBuffer.isView(f) : l(f) || X(f);
  }
  e.isArrayBufferView = k;
  function N(f) {
    return u(f) === "Uint8Array";
  }
  e.isUint8Array = N;
  function _(f) {
    return u(f) === "Uint8ClampedArray";
  }
  e.isUint8ClampedArray = _;
  function x(f) {
    return u(f) === "Uint16Array";
  }
  e.isUint16Array = x;
  function A(f) {
    return u(f) === "Uint32Array";
  }
  e.isUint32Array = A;
  function S(f) {
    return u(f) === "Int8Array";
  }
  e.isInt8Array = S;
  function p(f) {
    return u(f) === "Int16Array";
  }
  e.isInt16Array = p;
  function F(f) {
    return u(f) === "Int32Array";
  }
  e.isInt32Array = F;
  function M(f) {
    return u(f) === "Float32Array";
  }
  e.isFloat32Array = M;
  function I(f) {
    return u(f) === "Float64Array";
  }
  e.isFloat64Array = I;
  function q(f) {
    return u(f) === "BigInt64Array";
  }
  e.isBigInt64Array = q;
  function Q(f) {
    return u(f) === "BigUint64Array";
  }
  e.isBigUint64Array = Q;
  function O(f) {
    return d(f) === "[object Map]";
  }
  O.working = typeof Map < "u" && O(/* @__PURE__ */ new Map());
  function W(f) {
    return typeof Map > "u" ? !1 : O.working ? O(f) : f instanceof Map;
  }
  e.isMap = W;
  function T(f) {
    return d(f) === "[object Set]";
  }
  T.working = typeof Set < "u" && T(/* @__PURE__ */ new Set());
  function H(f) {
    return typeof Set > "u" ? !1 : T.working ? T(f) : f instanceof Set;
  }
  e.isSet = H;
  function J(f) {
    return d(f) === "[object WeakMap]";
  }
  J.working = typeof WeakMap < "u" && J(/* @__PURE__ */ new WeakMap());
  function $(f) {
    return typeof WeakMap > "u" ? !1 : J.working ? J(f) : f instanceof WeakMap;
  }
  e.isWeakMap = $;
  function oe(f) {
    return d(f) === "[object WeakSet]";
  }
  oe.working = typeof WeakSet < "u" && oe(/* @__PURE__ */ new WeakSet());
  function Z(f) {
    return oe(f);
  }
  e.isWeakSet = Z;
  function ee(f) {
    return d(f) === "[object ArrayBuffer]";
  }
  ee.working = typeof ArrayBuffer < "u" && ee(/* @__PURE__ */ new ArrayBuffer());
  function V(f) {
    return typeof ArrayBuffer > "u" ? !1 : ee.working ? ee(f) : f instanceof ArrayBuffer;
  }
  e.isArrayBuffer = V;
  function P(f) {
    return d(f) === "[object DataView]";
  }
  P.working = typeof ArrayBuffer < "u" && typeof DataView < "u" && P(new DataView(/* @__PURE__ */ new ArrayBuffer(1), 0, 1));
  function X(f) {
    return typeof DataView > "u" ? !1 : P.working ? P(f) : f instanceof DataView;
  }
  e.isDataView = X;
  var Y = typeof SharedArrayBuffer < "u" ? SharedArrayBuffer : void 0;
  function te(f) {
    return d(f) === "[object SharedArrayBuffer]";
  }
  function fe(f) {
    return typeof Y > "u" ? !1 : (typeof te.working > "u" && (te.working = te(new Y())), te.working ? te(f) : f instanceof Y);
  }
  e.isSharedArrayBuffer = fe;
  function E(f) {
    return d(f) === "[object AsyncFunction]";
  }
  e.isAsyncFunction = E;
  function h(f) {
    return d(f) === "[object Map Iterator]";
  }
  e.isMapIterator = h;
  function j(f) {
    return d(f) === "[object Set Iterator]";
  }
  e.isSetIterator = j;
  function U(f) {
    return d(f) === "[object Generator]";
  }
  e.isGeneratorObject = U;
  function re(f) {
    return d(f) === "[object WebAssembly.Module]";
  }
  e.isWebAssemblyCompiledModule = re;
  function D(f) {
    return w(f, g);
  }
  e.isNumberObject = D;
  function B(f) {
    return w(f, v);
  }
  e.isStringObject = B;
  function c(f) {
    return w(f, b);
  }
  e.isBooleanObject = c;
  function G(f) {
    return s && w(f, R);
  }
  e.isBigIntObject = G;
  function C(f) {
    return a && w(f, m);
  }
  e.isSymbolObject = C;
  function r(f) {
    return D(f) || B(f) || c(f) || G(f) || C(f);
  }
  e.isBoxedPrimitive = r;
  function i(f) {
    return typeof Uint8Array < "u" && (V(f) || fe(f));
  }
  e.isAnyArrayBuffer = i, [
    "isProxy",
    "isExternal",
    "isModuleNamespaceObject"
  ].forEach(function(f) {
    Object.defineProperty(e, f, {
      enumerable: !1,
      value: function() {
        throw new Error(f + " is not supported in userland");
      }
    });
  });
})), aa = /* @__PURE__ */ le(((e, n) => {
  n.exports = function(u) {
    return u && typeof u == "object" && typeof u.copy == "function" && typeof u.fill == "function" && typeof u.readUInt8 == "function";
  };
})), _n = /* @__PURE__ */ le(((e) => {
  Ye();
  var n = Object.getOwnPropertyDescriptors || function(X) {
    for (var Y = Object.keys(X), te = {}, fe = 0; fe < Y.length; fe++) te[Y[fe]] = Object.getOwnPropertyDescriptor(X, Y[fe]);
    return te;
  }, t = /%[sdj%]/g;
  e.format = function(P) {
    if (!S(P)) {
      for (var X = [], Y = 0; Y < arguments.length; Y++) X.push(s(arguments[Y]));
      return X.join(" ");
    }
    for (var Y = 1, te = arguments, fe = te.length, E = String(P).replace(t, function(j) {
      if (j === "%%") return "%";
      if (Y >= fe) return j;
      switch (j) {
        case "%s":
          return String(te[Y++]);
        case "%d":
          return Number(te[Y++]);
        case "%j":
          try {
            return JSON.stringify(te[Y++]);
          } catch {
            return "[Circular]";
          }
        default:
          return j;
      }
    }), h = te[Y]; Y < fe; h = te[++Y]) _(h) || !I(h) ? E += " " + h : E += " " + s(h);
    return E;
  }, e.deprecate = function(P, X) {
    if (typeof ge < "u" && ge.noDeprecation === !0) return P;
    if (typeof ge > "u") return function() {
      return e.deprecate(P, X).apply(this, arguments);
    };
    var Y = !1;
    function te() {
      if (!Y) {
        if (ge.throwDeprecation) throw new Error(X);
        ge.traceDeprecation ? console.trace(X) : console.error(X), Y = !0;
      }
      return P.apply(this, arguments);
    }
    return te;
  };
  var u = {}, l = /^$/;
  if (ge.env.NODE_DEBUG) {
    var o = ge.env.NODE_DEBUG;
    o = o.replace(/[|\\{}()[\]^$+?.]/g, "\\$&").replace(/\*/g, ".*").replace(/,/g, "$|^").toUpperCase(), l = new RegExp("^" + o + "$", "i");
  }
  e.debuglog = function(P) {
    if (P = P.toUpperCase(), !u[P]) if (l.test(P)) {
      var X = ge.pid;
      u[P] = function() {
        var Y = e.format.apply(e, arguments);
        console.error("%s %d: %s", P, X, Y);
      };
    } else u[P] = function() {
    };
    return u[P];
  };
  function s(P, X) {
    var Y = {
      seen: [],
      stylize: d
    };
    return arguments.length >= 3 && (Y.depth = arguments[2]), arguments.length >= 4 && (Y.colors = arguments[3]), N(X) ? Y.showHidden = X : X && e._extend(Y, X), F(Y.showHidden) && (Y.showHidden = !1), F(Y.depth) && (Y.depth = 2), F(Y.colors) && (Y.colors = !1), F(Y.customInspect) && (Y.customInspect = !0), Y.colors && (Y.stylize = a), v(Y, P, Y.depth);
  }
  e.inspect = s, s.colors = {
    bold: [1, 22],
    italic: [3, 23],
    underline: [4, 24],
    inverse: [7, 27],
    white: [37, 39],
    grey: [90, 39],
    black: [30, 39],
    blue: [34, 39],
    cyan: [36, 39],
    green: [32, 39],
    magenta: [35, 39],
    red: [31, 39],
    yellow: [33, 39]
  }, s.styles = {
    special: "cyan",
    number: "yellow",
    boolean: "yellow",
    undefined: "grey",
    null: "bold",
    string: "green",
    date: "magenta",
    regexp: "red"
  };
  function a(P, X) {
    var Y = s.styles[X];
    return Y ? "\x1B[" + s.colors[Y][0] + "m" + P + "\x1B[" + s.colors[Y][1] + "m" : P;
  }
  function d(P, X) {
    return P;
  }
  function g(P) {
    var X = {};
    return P.forEach(function(Y, te) {
      X[Y] = !0;
    }), X;
  }
  function v(P, X, Y) {
    if (P.customInspect && X && O(X.inspect) && X.inspect !== e.inspect && !(X.constructor && X.constructor.prototype === X)) {
      var te = X.inspect(Y, P);
      return S(te) || (te = v(P, te, Y)), te;
    }
    var fe = b(P, X);
    if (fe) return fe;
    var E = Object.keys(X), h = g(E);
    if (P.showHidden && (E = Object.getOwnPropertyNames(X)), Q(X) && (E.indexOf("message") >= 0 || E.indexOf("description") >= 0)) return R(X);
    if (E.length === 0) {
      if (O(X)) {
        var j = X.name ? ": " + X.name : "";
        return P.stylize("[Function" + j + "]", "special");
      }
      if (M(X)) return P.stylize(RegExp.prototype.toString.call(X), "regexp");
      if (q(X)) return P.stylize(Date.prototype.toString.call(X), "date");
      if (Q(X)) return R(X);
    }
    var U = "", re = !1, D = ["{", "}"];
    if (k(X) && (re = !0, D = ["[", "]"]), O(X) && (U = " [Function" + (X.name ? ": " + X.name : "") + "]"), M(X) && (U = " " + RegExp.prototype.toString.call(X)), q(X) && (U = " " + Date.prototype.toUTCString.call(X)), Q(X) && (U = " " + R(X)), E.length === 0 && (!re || X.length == 0)) return D[0] + U + D[1];
    if (Y < 0) return M(X) ? P.stylize(RegExp.prototype.toString.call(X), "regexp") : P.stylize("[Object]", "special");
    P.seen.push(X);
    var B;
    return re ? B = m(P, X, Y, h, E) : B = E.map(function(c) {
      return w(P, X, Y, h, c, re);
    }), P.seen.pop(), y(B, U, D);
  }
  function b(P, X) {
    if (F(X)) return P.stylize("undefined", "undefined");
    if (S(X)) {
      var Y = "'" + JSON.stringify(X).replace(/^"|"$/g, "").replace(/'/g, "\\'").replace(/\\"/g, '"') + "'";
      return P.stylize(Y, "string");
    }
    if (A(X)) return P.stylize("" + X, "number");
    if (N(X)) return P.stylize("" + X, "boolean");
    if (_(X)) return P.stylize("null", "null");
  }
  function R(P) {
    return "[" + Error.prototype.toString.call(P) + "]";
  }
  function m(P, X, Y, te, fe) {
    for (var E = [], h = 0, j = X.length; h < j; ++h) oe(X, String(h)) ? E.push(w(P, X, Y, te, String(h), !0)) : E.push("");
    return fe.forEach(function(U) {
      U.match(/^\d+$/) || E.push(w(P, X, Y, te, U, !0));
    }), E;
  }
  function w(P, X, Y, te, fe, E) {
    var h, j, U = Object.getOwnPropertyDescriptor(X, fe) || { value: X[fe] };
    if (U.get ? U.set ? j = P.stylize("[Getter/Setter]", "special") : j = P.stylize("[Getter]", "special") : U.set && (j = P.stylize("[Setter]", "special")), oe(te, fe) || (h = "[" + fe + "]"), j || (P.seen.indexOf(U.value) < 0 ? (_(Y) ? j = v(P, U.value, null) : j = v(P, U.value, Y - 1), j.indexOf(`
`) > -1 && (E ? j = j.split(`
`).map(function(re) {
      return "  " + re;
    }).join(`
`).slice(2) : j = `
` + j.split(`
`).map(function(re) {
      return "   " + re;
    }).join(`
`))) : j = P.stylize("[Circular]", "special")), F(h)) {
      if (E && fe.match(/^\d+$/)) return j;
      h = JSON.stringify("" + fe), h.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/) ? (h = h.slice(1, -1), h = P.stylize(h, "name")) : (h = h.replace(/'/g, "\\'").replace(/\\"/g, '"').replace(/(^"|"$)/g, "'"), h = P.stylize(h, "string"));
    }
    return h + ": " + j;
  }
  function y(P, X, Y) {
    return P.reduce(function(te, fe) {
      return fe.indexOf(`
`) >= 0, te + fe.replace(/\u001b\[\d\d?m/g, "").length + 1;
    }, 0) > 60 ? Y[0] + (X === "" ? "" : X + `
 `) + " " + P.join(`,
  `) + " " + Y[1] : Y[0] + X + " " + P.join(", ") + " " + Y[1];
  }
  e.types = ia();
  function k(P) {
    return Array.isArray(P);
  }
  e.isArray = k;
  function N(P) {
    return typeof P == "boolean";
  }
  e.isBoolean = N;
  function _(P) {
    return P === null;
  }
  e.isNull = _;
  function x(P) {
    return P == null;
  }
  e.isNullOrUndefined = x;
  function A(P) {
    return typeof P == "number";
  }
  e.isNumber = A;
  function S(P) {
    return typeof P == "string";
  }
  e.isString = S;
  function p(P) {
    return typeof P == "symbol";
  }
  e.isSymbol = p;
  function F(P) {
    return P === void 0;
  }
  e.isUndefined = F;
  function M(P) {
    return I(P) && T(P) === "[object RegExp]";
  }
  e.isRegExp = M, e.types.isRegExp = M;
  function I(P) {
    return typeof P == "object" && P !== null;
  }
  e.isObject = I;
  function q(P) {
    return I(P) && T(P) === "[object Date]";
  }
  e.isDate = q, e.types.isDate = q;
  function Q(P) {
    return I(P) && (T(P) === "[object Error]" || P instanceof Error);
  }
  e.isError = Q, e.types.isNativeError = Q;
  function O(P) {
    return typeof P == "function";
  }
  e.isFunction = O;
  function W(P) {
    return P === null || typeof P == "boolean" || typeof P == "number" || typeof P == "string" || typeof P == "symbol" || typeof P > "u";
  }
  e.isPrimitive = W, e.isBuffer = aa();
  function T(P) {
    return Object.prototype.toString.call(P);
  }
  function H(P) {
    return P < 10 ? "0" + P.toString(10) : P.toString(10);
  }
  var J = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec"
  ];
  function $() {
    var P = /* @__PURE__ */ new Date(), X = [
      H(P.getHours()),
      H(P.getMinutes()),
      H(P.getSeconds())
    ].join(":");
    return [
      P.getDate(),
      J[P.getMonth()],
      X
    ].join(" ");
  }
  e.log = function() {
    console.log("%s - %s", $(), e.format.apply(e, arguments));
  }, e.inherits = Ze(), e._extend = function(P, X) {
    if (!X || !I(X)) return P;
    for (var Y = Object.keys(X), te = Y.length; te--; ) P[Y[te]] = X[Y[te]];
    return P;
  };
  function oe(P, X) {
    return Object.prototype.hasOwnProperty.call(P, X);
  }
  var Z = typeof Symbol < "u" ? Symbol("util.promisify.custom") : void 0;
  e.promisify = function(X) {
    if (typeof X != "function") throw new TypeError('The "original" argument must be of type Function');
    if (Z && X[Z]) {
      var Y = X[Z];
      if (typeof Y != "function") throw new TypeError('The "util.promisify.custom" argument must be of type Function');
      return Object.defineProperty(Y, Z, {
        value: Y,
        enumerable: !1,
        writable: !1,
        configurable: !0
      }), Y;
    }
    function Y() {
      for (var te, fe, E = new Promise(function(U, re) {
        te = U, fe = re;
      }), h = [], j = 0; j < arguments.length; j++) h.push(arguments[j]);
      h.push(function(U, re) {
        U ? fe(U) : te(re);
      });
      try {
        X.apply(this, h);
      } catch (U) {
        fe(U);
      }
      return E;
    }
    return Object.setPrototypeOf(Y, Object.getPrototypeOf(X)), Z && Object.defineProperty(Y, Z, {
      value: Y,
      enumerable: !1,
      writable: !1,
      configurable: !0
    }), Object.defineProperties(Y, n(X));
  }, e.promisify.custom = Z;
  function ee(P, X) {
    if (!P) {
      var Y = /* @__PURE__ */ new Error("Promise was rejected with a falsy value");
      Y.reason = P, P = Y;
    }
    return X(P);
  }
  function V(P) {
    if (typeof P != "function") throw new TypeError('The "original" argument must be of type Function');
    function X() {
      for (var Y = [], te = 0; te < arguments.length; te++) Y.push(arguments[te]);
      var fe = Y.pop();
      if (typeof fe != "function") throw new TypeError("The last argument must be of type Function");
      var E = this, h = function() {
        return fe.apply(E, arguments);
      };
      P.apply(this, Y).then(function(j) {
        ge.nextTick(h.bind(null, null, j));
      }, function(j) {
        ge.nextTick(ee.bind(null, j, h));
      });
    }
    return Object.setPrototypeOf(X, Object.getPrototypeOf(P)), Object.defineProperties(X, n(P)), X;
  }
  e.callbackify = V;
})), oa = /* @__PURE__ */ le(((e, n) => {
  function t(w, y) {
    var k = Object.keys(w);
    if (Object.getOwnPropertySymbols) {
      var N = Object.getOwnPropertySymbols(w);
      y && (N = N.filter(function(_) {
        return Object.getOwnPropertyDescriptor(w, _).enumerable;
      })), k.push.apply(k, N);
    }
    return k;
  }
  function u(w) {
    for (var y = 1; y < arguments.length; y++) {
      var k = arguments[y] != null ? arguments[y] : {};
      y % 2 ? t(Object(k), !0).forEach(function(N) {
        l(w, N, k[N]);
      }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(w, Object.getOwnPropertyDescriptors(k)) : t(Object(k)).forEach(function(N) {
        Object.defineProperty(w, N, Object.getOwnPropertyDescriptor(k, N));
      });
    }
    return w;
  }
  function l(w, y, k) {
    return y = d(y), y in w ? Object.defineProperty(w, y, {
      value: k,
      enumerable: !0,
      configurable: !0,
      writable: !0
    }) : w[y] = k, w;
  }
  function o(w, y) {
    if (!(w instanceof y)) throw new TypeError("Cannot call a class as a function");
  }
  function s(w, y) {
    for (var k = 0; k < y.length; k++) {
      var N = y[k];
      N.enumerable = N.enumerable || !1, N.configurable = !0, "value" in N && (N.writable = !0), Object.defineProperty(w, d(N.key), N);
    }
  }
  function a(w, y, k) {
    return y && s(w.prototype, y), Object.defineProperty(w, "prototype", { writable: !1 }), w;
  }
  function d(w) {
    var y = g(w, "string");
    return typeof y == "symbol" ? y : String(y);
  }
  function g(w, y) {
    if (typeof w != "object" || w === null) return w;
    var k = w[Symbol.toPrimitive];
    if (k !== void 0) {
      var N = k.call(w, y);
      if (typeof N != "object") return N;
      throw new TypeError("@@toPrimitive must return a primitive value.");
    }
    return String(w);
  }
  var v = Zt().Buffer, b = _n().inspect, R = b && b.custom || "inspect";
  function m(w, y, k) {
    v.prototype.copy.call(w, y, k);
  }
  n.exports = /* @__PURE__ */ (function() {
    function w() {
      o(this, w), this.head = null, this.tail = null, this.length = 0;
    }
    return a(w, [
      {
        key: "push",
        value: function(k) {
          var N = {
            data: k,
            next: null
          };
          this.length > 0 ? this.tail.next = N : this.head = N, this.tail = N, ++this.length;
        }
      },
      {
        key: "unshift",
        value: function(k) {
          var N = {
            data: k,
            next: this.head
          };
          this.length === 0 && (this.tail = N), this.head = N, ++this.length;
        }
      },
      {
        key: "shift",
        value: function() {
          if (this.length !== 0) {
            var k = this.head.data;
            return this.length === 1 ? this.head = this.tail = null : this.head = this.head.next, --this.length, k;
          }
        }
      },
      {
        key: "clear",
        value: function() {
          this.head = this.tail = null, this.length = 0;
        }
      },
      {
        key: "join",
        value: function(k) {
          if (this.length === 0) return "";
          for (var N = this.head, _ = "" + N.data; N = N.next; ) _ += k + N.data;
          return _;
        }
      },
      {
        key: "concat",
        value: function(k) {
          if (this.length === 0) return v.alloc(0);
          for (var N = v.allocUnsafe(k >>> 0), _ = this.head, x = 0; _; )
            m(_.data, N, x), x += _.data.length, _ = _.next;
          return N;
        }
      },
      {
        key: "consume",
        value: function(k, N) {
          var _;
          return k < this.head.data.length ? (_ = this.head.data.slice(0, k), this.head.data = this.head.data.slice(k)) : k === this.head.data.length ? _ = this.shift() : _ = N ? this._getString(k) : this._getBuffer(k), _;
        }
      },
      {
        key: "first",
        value: function() {
          return this.head.data;
        }
      },
      {
        key: "_getString",
        value: function(k) {
          var N = this.head, _ = 1, x = N.data;
          for (k -= x.length; N = N.next; ) {
            var A = N.data, S = k > A.length ? A.length : k;
            if (S === A.length ? x += A : x += A.slice(0, k), k -= S, k === 0) {
              S === A.length ? (++_, N.next ? this.head = N.next : this.head = this.tail = null) : (this.head = N, N.data = A.slice(S));
              break;
            }
            ++_;
          }
          return this.length -= _, x;
        }
      },
      {
        key: "_getBuffer",
        value: function(k) {
          var N = v.allocUnsafe(k), _ = this.head, x = 1;
          for (_.data.copy(N), k -= _.data.length; _ = _.next; ) {
            var A = _.data, S = k > A.length ? A.length : k;
            if (A.copy(N, N.length - k, 0, S), k -= S, k === 0) {
              S === A.length ? (++x, _.next ? this.head = _.next : this.head = this.tail = null) : (this.head = _, _.data = A.slice(S));
              break;
            }
            ++x;
          }
          return this.length -= x, N;
        }
      },
      {
        key: R,
        value: function(k, N) {
          return b(this, u(u({}, N), {}, {
            depth: 0,
            customInspect: !1
          }));
        }
      }
    ]), w;
  })();
})), xn = /* @__PURE__ */ le(((e, n) => {
  Ye();
  function t(d, g) {
    var v = this, b = this._readableState && this._readableState.destroyed, R = this._writableState && this._writableState.destroyed;
    return b || R ? (g ? g(d) : d && (this._writableState ? this._writableState.errorEmitted || (this._writableState.errorEmitted = !0, ge.nextTick(s, this, d)) : ge.nextTick(s, this, d)), this) : (this._readableState && (this._readableState.destroyed = !0), this._writableState && (this._writableState.destroyed = !0), this._destroy(d || null, function(m) {
      !g && m ? v._writableState ? v._writableState.errorEmitted ? ge.nextTick(l, v) : (v._writableState.errorEmitted = !0, ge.nextTick(u, v, m)) : ge.nextTick(u, v, m) : g ? (ge.nextTick(l, v), g(m)) : ge.nextTick(l, v);
    }), this);
  }
  function u(d, g) {
    s(d, g), l(d);
  }
  function l(d) {
    d._writableState && !d._writableState.emitClose || d._readableState && !d._readableState.emitClose || d.emit("close");
  }
  function o() {
    this._readableState && (this._readableState.destroyed = !1, this._readableState.reading = !1, this._readableState.ended = !1, this._readableState.endEmitted = !1), this._writableState && (this._writableState.destroyed = !1, this._writableState.ended = !1, this._writableState.ending = !1, this._writableState.finalCalled = !1, this._writableState.prefinished = !1, this._writableState.finished = !1, this._writableState.errorEmitted = !1);
  }
  function s(d, g) {
    d.emit("error", g);
  }
  function a(d, g) {
    var v = d._readableState, b = d._writableState;
    v && v.autoDestroy || b && b.autoDestroy ? d.destroy(g) : d.emit("error", g);
  }
  n.exports = {
    destroy: t,
    undestroy: o,
    errorOrDestroy: a
  };
})), yt = /* @__PURE__ */ le(((e, n) => {
  function t(g, v) {
    g.prototype = Object.create(v.prototype), g.prototype.constructor = g, g.__proto__ = v;
  }
  var u = {};
  function l(g, v, b) {
    b || (b = Error);
    function R(w, y, k) {
      return typeof v == "string" ? v : v(w, y, k);
    }
    var m = /* @__PURE__ */ (function(w) {
      t(y, w);
      function y(k, N, _) {
        return w.call(this, R(k, N, _)) || this;
      }
      return y;
    })(b);
    m.prototype.name = b.name, m.prototype.code = g, u[g] = m;
  }
  function o(g, v) {
    if (Array.isArray(g)) {
      var b = g.length;
      return g = g.map(function(R) {
        return String(R);
      }), b > 2 ? "one of ".concat(v, " ").concat(g.slice(0, b - 1).join(", "), ", or ") + g[b - 1] : b === 2 ? "one of ".concat(v, " ").concat(g[0], " or ").concat(g[1]) : "of ".concat(v, " ").concat(g[0]);
    } else return "of ".concat(v, " ").concat(String(g));
  }
  function s(g, v, b) {
    return g.substr(0, v.length) === v;
  }
  function a(g, v, b) {
    return (b === void 0 || b > g.length) && (b = g.length), g.substring(b - v.length, b) === v;
  }
  function d(g, v, b) {
    return typeof b != "number" && (b = 0), b + v.length > g.length ? !1 : g.indexOf(v, b) !== -1;
  }
  l("ERR_INVALID_OPT_VALUE", function(g, v) {
    return 'The value "' + v + '" is invalid for option "' + g + '"';
  }, TypeError), l("ERR_INVALID_ARG_TYPE", function(g, v, b) {
    var R;
    typeof v == "string" && s(v, "not ") ? (R = "must not be", v = v.replace(/^not /, "")) : R = "must be";
    var m;
    if (a(g, " argument")) m = "The ".concat(g, " ").concat(R, " ").concat(o(v, "type"));
    else {
      var w = d(g, ".") ? "property" : "argument";
      m = 'The "'.concat(g, '" ').concat(w, " ").concat(R, " ").concat(o(v, "type"));
    }
    return m += ". Received type ".concat(typeof b), m;
  }, TypeError), l("ERR_STREAM_PUSH_AFTER_EOF", "stream.push() after EOF"), l("ERR_METHOD_NOT_IMPLEMENTED", function(g) {
    return "The " + g + " method is not implemented";
  }), l("ERR_STREAM_PREMATURE_CLOSE", "Premature close"), l("ERR_STREAM_DESTROYED", function(g) {
    return "Cannot call " + g + " after a stream was destroyed";
  }), l("ERR_MULTIPLE_CALLBACK", "Callback called multiple times"), l("ERR_STREAM_CANNOT_PIPE", "Cannot pipe, not readable"), l("ERR_STREAM_WRITE_AFTER_END", "write after end"), l("ERR_STREAM_NULL_VALUES", "May not write null values to stream", TypeError), l("ERR_UNKNOWN_ENCODING", function(g) {
    return "Unknown encoding: " + g;
  }, TypeError), l("ERR_STREAM_UNSHIFT_AFTER_END_EVENT", "stream.unshift() after end event"), n.exports.codes = u;
})), En = /* @__PURE__ */ le(((e, n) => {
  var t = yt().codes.ERR_INVALID_OPT_VALUE;
  function u(o, s, a) {
    return o.highWaterMark != null ? o.highWaterMark : s ? o[a] : null;
  }
  function l(o, s, a, d) {
    var g = u(s, d, a);
    if (g != null) {
      if (!(isFinite(g) && Math.floor(g) === g) || g < 0) throw new t(d ? a : "highWaterMark", g);
      return Math.floor(g);
    }
    return o.objectMode ? 16 : 16 * 1024;
  }
  n.exports = { getHighWaterMark: l };
})), sa = /* @__PURE__ */ le(((e, n) => {
  vt(), n.exports = t;
  function t(l, o) {
    if (u("noDeprecation")) return l;
    var s = !1;
    function a() {
      if (!s) {
        if (u("throwDeprecation")) throw new Error(o);
        u("traceDeprecation") ? console.trace(o) : console.warn(o), s = !0;
      }
      return l.apply(this, arguments);
    }
    return a;
  }
  function u(l) {
    try {
      if (!Ce.localStorage) return !1;
    } catch {
      return !1;
    }
    var o = Ce.localStorage[l];
    return o == null ? !1 : String(o).toLowerCase() === "true";
  }
})), Sn = /* @__PURE__ */ le(((e, n) => {
  vt(), Ye(), n.exports = I;
  function t(E) {
    var h = this;
    this.next = null, this.entry = null, this.finish = function() {
      fe(h, E);
    };
  }
  var u;
  I.WritableState = F;
  var l = { deprecate: sa() }, o = cn(), s = Zt().Buffer, a = (typeof Ce < "u" ? Ce : typeof window < "u" ? window : typeof self < "u" ? self : {}).Uint8Array || function() {
  };
  function d(E) {
    return s.from(E);
  }
  function g(E) {
    return s.isBuffer(E) || E instanceof a;
  }
  var v = xn(), b = En().getHighWaterMark, R = yt().codes, m = R.ERR_INVALID_ARG_TYPE, w = R.ERR_METHOD_NOT_IMPLEMENTED, y = R.ERR_MULTIPLE_CALLBACK, k = R.ERR_STREAM_CANNOT_PIPE, N = R.ERR_STREAM_DESTROYED, _ = R.ERR_STREAM_NULL_VALUES, x = R.ERR_STREAM_WRITE_AFTER_END, A = R.ERR_UNKNOWN_ENCODING, S = v.errorOrDestroy;
  Ze()(I, o);
  function p() {
  }
  function F(E, h, j) {
    u = u || ht(), E = E || {}, typeof j != "boolean" && (j = h instanceof u), this.objectMode = !!E.objectMode, j && (this.objectMode = this.objectMode || !!E.writableObjectMode), this.highWaterMark = b(this, E, "writableHighWaterMark", j), this.finalCalled = !1, this.needDrain = !1, this.ending = !1, this.ended = !1, this.finished = !1, this.destroyed = !1;
    var U = E.decodeStrings === !1;
    this.decodeStrings = !U, this.defaultEncoding = E.defaultEncoding || "utf8", this.length = 0, this.writing = !1, this.corked = 0, this.sync = !0, this.bufferProcessing = !1, this.onwrite = function(re) {
      $(h, re);
    }, this.writecb = null, this.writelen = 0, this.bufferedRequest = null, this.lastBufferedRequest = null, this.pendingcb = 0, this.prefinished = !1, this.errorEmitted = !1, this.emitClose = E.emitClose !== !1, this.autoDestroy = !!E.autoDestroy, this.bufferedRequestCount = 0, this.corkedRequestsFree = new t(this);
  }
  F.prototype.getBuffer = function() {
    for (var h = this.bufferedRequest, j = []; h; )
      j.push(h), h = h.next;
    return j;
  }, (function() {
    try {
      Object.defineProperty(F.prototype, "buffer", { get: l.deprecate(function() {
        return this.getBuffer();
      }, "_writableState.buffer is deprecated. Use _writableState.getBuffer instead.", "DEP0003") });
    } catch {
    }
  })();
  var M;
  typeof Symbol == "function" && Symbol.hasInstance && typeof Function.prototype[Symbol.hasInstance] == "function" ? (M = Function.prototype[Symbol.hasInstance], Object.defineProperty(I, Symbol.hasInstance, { value: function(h) {
    return M.call(this, h) ? !0 : this !== I ? !1 : h && h._writableState instanceof F;
  } })) : M = function(h) {
    return h instanceof this;
  };
  function I(E) {
    u = u || ht();
    var h = this instanceof u;
    if (!h && !M.call(I, this)) return new I(E);
    this._writableState = new F(E, this, h), this.writable = !0, E && (typeof E.write == "function" && (this._write = E.write), typeof E.writev == "function" && (this._writev = E.writev), typeof E.destroy == "function" && (this._destroy = E.destroy), typeof E.final == "function" && (this._final = E.final)), o.call(this);
  }
  I.prototype.pipe = function() {
    S(this, new k());
  };
  function q(E, h) {
    var j = new x();
    S(E, j), ge.nextTick(h, j);
  }
  function Q(E, h, j, U) {
    var re;
    return j === null ? re = new _() : typeof j != "string" && !h.objectMode && (re = new m("chunk", ["string", "Buffer"], j)), re ? (S(E, re), ge.nextTick(U, re), !1) : !0;
  }
  I.prototype.write = function(E, h, j) {
    var U = this._writableState, re = !1, D = !U.objectMode && g(E);
    return D && !s.isBuffer(E) && (E = d(E)), typeof h == "function" && (j = h, h = null), D ? h = "buffer" : h || (h = U.defaultEncoding), typeof j != "function" && (j = p), U.ending ? q(this, j) : (D || Q(this, U, E, j)) && (U.pendingcb++, re = W(this, U, D, E, h, j)), re;
  }, I.prototype.cork = function() {
    this._writableState.corked++;
  }, I.prototype.uncork = function() {
    var E = this._writableState;
    E.corked && (E.corked--, !E.writing && !E.corked && !E.bufferProcessing && E.bufferedRequest && ee(this, E));
  }, I.prototype.setDefaultEncoding = function(h) {
    if (typeof h == "string" && (h = h.toLowerCase()), !([
      "hex",
      "utf8",
      "utf-8",
      "ascii",
      "binary",
      "base64",
      "ucs2",
      "ucs-2",
      "utf16le",
      "utf-16le",
      "raw"
    ].indexOf((h + "").toLowerCase()) > -1)) throw new A(h);
    return this._writableState.defaultEncoding = h, this;
  }, Object.defineProperty(I.prototype, "writableBuffer", {
    enumerable: !1,
    get: function() {
      return this._writableState && this._writableState.getBuffer();
    }
  });
  function O(E, h, j) {
    return !E.objectMode && E.decodeStrings !== !1 && typeof h == "string" && (h = s.from(h, j)), h;
  }
  Object.defineProperty(I.prototype, "writableHighWaterMark", {
    enumerable: !1,
    get: function() {
      return this._writableState.highWaterMark;
    }
  });
  function W(E, h, j, U, re, D) {
    if (!j) {
      var B = O(h, U, re);
      U !== B && (j = !0, re = "buffer", U = B);
    }
    var c = h.objectMode ? 1 : U.length;
    h.length += c;
    var G = h.length < h.highWaterMark;
    if (G || (h.needDrain = !0), h.writing || h.corked) {
      var C = h.lastBufferedRequest;
      h.lastBufferedRequest = {
        chunk: U,
        encoding: re,
        isBuf: j,
        callback: D,
        next: null
      }, C ? C.next = h.lastBufferedRequest : h.bufferedRequest = h.lastBufferedRequest, h.bufferedRequestCount += 1;
    } else T(E, h, !1, c, U, re, D);
    return G;
  }
  function T(E, h, j, U, re, D, B) {
    h.writelen = U, h.writecb = B, h.writing = !0, h.sync = !0, h.destroyed ? h.onwrite(new N("write")) : j ? E._writev(re, h.onwrite) : E._write(re, D, h.onwrite), h.sync = !1;
  }
  function H(E, h, j, U, re) {
    --h.pendingcb, j ? (ge.nextTick(re, U), ge.nextTick(Y, E, h), E._writableState.errorEmitted = !0, S(E, U)) : (re(U), E._writableState.errorEmitted = !0, S(E, U), Y(E, h));
  }
  function J(E) {
    E.writing = !1, E.writecb = null, E.length -= E.writelen, E.writelen = 0;
  }
  function $(E, h) {
    var j = E._writableState, U = j.sync, re = j.writecb;
    if (typeof re != "function") throw new y();
    if (J(j), h) H(E, j, U, h, re);
    else {
      var D = V(j) || E.destroyed;
      !D && !j.corked && !j.bufferProcessing && j.bufferedRequest && ee(E, j), U ? ge.nextTick(oe, E, j, D, re) : oe(E, j, D, re);
    }
  }
  function oe(E, h, j, U) {
    j || Z(E, h), h.pendingcb--, U(), Y(E, h);
  }
  function Z(E, h) {
    h.length === 0 && h.needDrain && (h.needDrain = !1, E.emit("drain"));
  }
  function ee(E, h) {
    h.bufferProcessing = !0;
    var j = h.bufferedRequest;
    if (E._writev && j && j.next) {
      var U = h.bufferedRequestCount, re = new Array(U), D = h.corkedRequestsFree;
      D.entry = j;
      for (var B = 0, c = !0; j; )
        re[B] = j, j.isBuf || (c = !1), j = j.next, B += 1;
      re.allBuffers = c, T(E, h, !0, h.length, re, "", D.finish), h.pendingcb++, h.lastBufferedRequest = null, D.next ? (h.corkedRequestsFree = D.next, D.next = null) : h.corkedRequestsFree = new t(h), h.bufferedRequestCount = 0;
    } else {
      for (; j; ) {
        var G = j.chunk, C = j.encoding, r = j.callback;
        if (T(E, h, !1, h.objectMode ? 1 : G.length, G, C, r), j = j.next, h.bufferedRequestCount--, h.writing) break;
      }
      j === null && (h.lastBufferedRequest = null);
    }
    h.bufferedRequest = j, h.bufferProcessing = !1;
  }
  I.prototype._write = function(E, h, j) {
    j(new w("_write()"));
  }, I.prototype._writev = null, I.prototype.end = function(E, h, j) {
    var U = this._writableState;
    return typeof E == "function" ? (j = E, E = null, h = null) : typeof h == "function" && (j = h, h = null), E != null && this.write(E, h), U.corked && (U.corked = 1, this.uncork()), U.ending || te(this, U, j), this;
  }, Object.defineProperty(I.prototype, "writableLength", {
    enumerable: !1,
    get: function() {
      return this._writableState.length;
    }
  });
  function V(E) {
    return E.ending && E.length === 0 && E.bufferedRequest === null && !E.finished && !E.writing;
  }
  function P(E, h) {
    E._final(function(j) {
      h.pendingcb--, j && S(E, j), h.prefinished = !0, E.emit("prefinish"), Y(E, h);
    });
  }
  function X(E, h) {
    !h.prefinished && !h.finalCalled && (typeof E._final == "function" && !h.destroyed ? (h.pendingcb++, h.finalCalled = !0, ge.nextTick(P, E, h)) : (h.prefinished = !0, E.emit("prefinish")));
  }
  function Y(E, h) {
    var j = V(h);
    if (j && (X(E, h), h.pendingcb === 0 && (h.finished = !0, E.emit("finish"), h.autoDestroy))) {
      var U = E._readableState;
      (!U || U.autoDestroy && U.endEmitted) && E.destroy();
    }
    return j;
  }
  function te(E, h, j) {
    h.ending = !0, Y(E, h), j && (h.finished ? ge.nextTick(j) : E.once("finish", j)), h.ended = !0, E.writable = !1;
  }
  function fe(E, h, j) {
    var U = E.entry;
    for (E.entry = null; U; ) {
      var re = U.callback;
      h.pendingcb--, re(j), U = U.next;
    }
    h.corkedRequestsFree.next = E;
  }
  Object.defineProperty(I.prototype, "destroyed", {
    enumerable: !1,
    get: function() {
      return this._writableState === void 0 ? !1 : this._writableState.destroyed;
    },
    set: function(h) {
      this._writableState && (this._writableState.destroyed = h);
    }
  }), I.prototype.destroy = v.destroy, I.prototype._undestroy = v.undestroy, I.prototype._destroy = function(E, h) {
    h(E);
  };
})), ht = /* @__PURE__ */ le(((e, n) => {
  Ye();
  var t = Object.keys || function(b) {
    var R = [];
    for (var m in b) R.push(m);
    return R;
  };
  n.exports = d;
  var u = Tn(), l = Sn();
  Ze()(d, u);
  for (var o = t(l.prototype), s = 0; s < o.length; s++) {
    var a = o[s];
    d.prototype[a] || (d.prototype[a] = l.prototype[a]);
  }
  function d(b) {
    if (!(this instanceof d)) return new d(b);
    u.call(this, b), l.call(this, b), this.allowHalfOpen = !0, b && (b.readable === !1 && (this.readable = !1), b.writable === !1 && (this.writable = !1), b.allowHalfOpen === !1 && (this.allowHalfOpen = !1, this.once("end", g)));
  }
  Object.defineProperty(d.prototype, "writableHighWaterMark", {
    enumerable: !1,
    get: function() {
      return this._writableState.highWaterMark;
    }
  }), Object.defineProperty(d.prototype, "writableBuffer", {
    enumerable: !1,
    get: function() {
      return this._writableState && this._writableState.getBuffer();
    }
  }), Object.defineProperty(d.prototype, "writableLength", {
    enumerable: !1,
    get: function() {
      return this._writableState.length;
    }
  });
  function g() {
    this._writableState.ended || ge.nextTick(v, this);
  }
  function v(b) {
    b.end();
  }
  Object.defineProperty(d.prototype, "destroyed", {
    enumerable: !1,
    get: function() {
      return this._readableState === void 0 || this._writableState === void 0 ? !1 : this._readableState.destroyed && this._writableState.destroyed;
    },
    set: function(R) {
      this._readableState === void 0 || this._writableState === void 0 || (this._readableState.destroyed = R, this._writableState.destroyed = R);
    }
  });
})), ua = /* @__PURE__ */ le(((e, n) => {
  var t = Zt(), u = t.Buffer;
  function l(s, a) {
    for (var d in s) a[d] = s[d];
  }
  u.from && u.alloc && u.allocUnsafe && u.allocUnsafeSlow ? n.exports = t : (l(t, e), e.Buffer = o);
  function o(s, a, d) {
    return u(s, a, d);
  }
  l(u, o), o.from = function(s, a, d) {
    if (typeof s == "number") throw new TypeError("Argument must not be a number");
    return u(s, a, d);
  }, o.alloc = function(s, a, d) {
    if (typeof s != "number") throw new TypeError("Argument must be a number");
    var g = u(s);
    return a !== void 0 ? typeof d == "string" ? g.fill(a, d) : g.fill(a) : g.fill(0), g;
  }, o.allocUnsafe = function(s) {
    if (typeof s != "number") throw new TypeError("Argument must be a number");
    return u(s);
  }, o.allocUnsafeSlow = function(s) {
    if (typeof s != "number") throw new TypeError("Argument must be a number");
    return t.SlowBuffer(s);
  };
})), vr = /* @__PURE__ */ le(((e) => {
  var n = ua().Buffer, t = n.isEncoding || function(_) {
    switch (_ = "" + _, _ && _.toLowerCase()) {
      case "hex":
      case "utf8":
      case "utf-8":
      case "ascii":
      case "binary":
      case "base64":
      case "ucs2":
      case "ucs-2":
      case "utf16le":
      case "utf-16le":
      case "raw":
        return !0;
      default:
        return !1;
    }
  };
  function u(_) {
    if (!_) return "utf8";
    for (var x; ; ) switch (_) {
      case "utf8":
      case "utf-8":
        return "utf8";
      case "ucs2":
      case "ucs-2":
      case "utf16le":
      case "utf-16le":
        return "utf16le";
      case "latin1":
      case "binary":
        return "latin1";
      case "base64":
      case "ascii":
      case "hex":
        return _;
      default:
        if (x) return;
        _ = ("" + _).toLowerCase(), x = !0;
    }
  }
  function l(_) {
    var x = u(_);
    if (typeof x != "string" && (n.isEncoding === t || !t(_))) throw new Error("Unknown encoding: " + _);
    return x || _;
  }
  e.StringDecoder = o;
  function o(_) {
    this.encoding = l(_);
    var x;
    switch (this.encoding) {
      case "utf16le":
        this.text = R, this.end = m, x = 4;
        break;
      case "utf8":
        this.fillLast = g, x = 4;
        break;
      case "base64":
        this.text = w, this.end = y, x = 3;
        break;
      default:
        this.write = k, this.end = N;
        return;
    }
    this.lastNeed = 0, this.lastTotal = 0, this.lastChar = n.allocUnsafe(x);
  }
  o.prototype.write = function(_) {
    if (_.length === 0) return "";
    var x, A;
    if (this.lastNeed) {
      if (x = this.fillLast(_), x === void 0) return "";
      A = this.lastNeed, this.lastNeed = 0;
    } else A = 0;
    return A < _.length ? x ? x + this.text(_, A) : this.text(_, A) : x || "";
  }, o.prototype.end = b, o.prototype.text = v, o.prototype.fillLast = function(_) {
    if (this.lastNeed <= _.length)
      return _.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed), this.lastChar.toString(this.encoding, 0, this.lastTotal);
    _.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, _.length), this.lastNeed -= _.length;
  };
  function s(_) {
    return _ <= 127 ? 0 : _ >> 5 === 6 ? 2 : _ >> 4 === 14 ? 3 : _ >> 3 === 30 ? 4 : _ >> 6 === 2 ? -1 : -2;
  }
  function a(_, x, A) {
    var S = x.length - 1;
    if (S < A) return 0;
    var p = s(x[S]);
    return p >= 0 ? (p > 0 && (_.lastNeed = p - 1), p) : --S < A || p === -2 ? 0 : (p = s(x[S]), p >= 0 ? (p > 0 && (_.lastNeed = p - 2), p) : --S < A || p === -2 ? 0 : (p = s(x[S]), p >= 0 ? (p > 0 && (p === 2 ? p = 0 : _.lastNeed = p - 3), p) : 0));
  }
  function d(_, x, A) {
    if ((x[0] & 192) !== 128)
      return _.lastNeed = 0, "�";
    if (_.lastNeed > 1 && x.length > 1) {
      if ((x[1] & 192) !== 128)
        return _.lastNeed = 1, "�";
      if (_.lastNeed > 2 && x.length > 2 && (x[2] & 192) !== 128)
        return _.lastNeed = 2, "�";
    }
  }
  function g(_) {
    var x = this.lastTotal - this.lastNeed, A = d(this, _);
    if (A !== void 0) return A;
    if (this.lastNeed <= _.length)
      return _.copy(this.lastChar, x, 0, this.lastNeed), this.lastChar.toString(this.encoding, 0, this.lastTotal);
    _.copy(this.lastChar, x, 0, _.length), this.lastNeed -= _.length;
  }
  function v(_, x) {
    var A = a(this, _, x);
    if (!this.lastNeed) return _.toString("utf8", x);
    this.lastTotal = A;
    var S = _.length - (A - this.lastNeed);
    return _.copy(this.lastChar, 0, S), _.toString("utf8", x, S);
  }
  function b(_) {
    var x = _ && _.length ? this.write(_) : "";
    return this.lastNeed ? x + "�" : x;
  }
  function R(_, x) {
    if ((_.length - x) % 2 === 0) {
      var A = _.toString("utf16le", x);
      if (A) {
        var S = A.charCodeAt(A.length - 1);
        if (S >= 55296 && S <= 56319)
          return this.lastNeed = 2, this.lastTotal = 4, this.lastChar[0] = _[_.length - 2], this.lastChar[1] = _[_.length - 1], A.slice(0, -1);
      }
      return A;
    }
    return this.lastNeed = 1, this.lastTotal = 2, this.lastChar[0] = _[_.length - 1], _.toString("utf16le", x, _.length - 1);
  }
  function m(_) {
    var x = _ && _.length ? this.write(_) : "";
    if (this.lastNeed) {
      var A = this.lastTotal - this.lastNeed;
      return x + this.lastChar.toString("utf16le", 0, A);
    }
    return x;
  }
  function w(_, x) {
    var A = (_.length - x) % 3;
    return A === 0 ? _.toString("base64", x) : (this.lastNeed = 3 - A, this.lastTotal = 3, A === 1 ? this.lastChar[0] = _[_.length - 1] : (this.lastChar[0] = _[_.length - 2], this.lastChar[1] = _[_.length - 1]), _.toString("base64", x, _.length - A));
  }
  function y(_) {
    var x = _ && _.length ? this.write(_) : "";
    return this.lastNeed ? x + this.lastChar.toString("base64", 0, 3 - this.lastNeed) : x;
  }
  function k(_) {
    return _.toString(this.encoding);
  }
  function N(_) {
    return _ && _.length ? this.write(_) : "";
  }
})), Ar = /* @__PURE__ */ le(((e, n) => {
  var t = yt().codes.ERR_STREAM_PREMATURE_CLOSE;
  function u(a) {
    var d = !1;
    return function() {
      if (!d) {
        d = !0;
        for (var g = arguments.length, v = new Array(g), b = 0; b < g; b++) v[b] = arguments[b];
        a.apply(this, v);
      }
    };
  }
  function l() {
  }
  function o(a) {
    return a.setHeader && typeof a.abort == "function";
  }
  function s(a, d, g) {
    if (typeof d == "function") return s(a, null, d);
    d || (d = {}), g = u(g || l);
    var v = d.readable || d.readable !== !1 && a.readable, b = d.writable || d.writable !== !1 && a.writable, R = function() {
      a.writable || w();
    }, m = a._writableState && a._writableState.finished, w = function() {
      b = !1, m = !0, v || g.call(a);
    }, y = a._readableState && a._readableState.endEmitted, k = function() {
      v = !1, y = !0, b || g.call(a);
    }, N = function(S) {
      g.call(a, S);
    }, _ = function() {
      var S;
      if (v && !y)
        return (!a._readableState || !a._readableState.ended) && (S = new t()), g.call(a, S);
      if (b && !m)
        return (!a._writableState || !a._writableState.ended) && (S = new t()), g.call(a, S);
    }, x = function() {
      a.req.on("finish", w);
    };
    return o(a) ? (a.on("complete", w), a.on("abort", _), a.req ? x() : a.on("request", x)) : b && !a._writableState && (a.on("end", R), a.on("close", R)), a.on("end", k), a.on("finish", w), d.error !== !1 && a.on("error", N), a.on("close", _), function() {
      a.removeListener("complete", w), a.removeListener("abort", _), a.removeListener("request", x), a.req && a.req.removeListener("finish", w), a.removeListener("end", R), a.removeListener("close", R), a.removeListener("finish", w), a.removeListener("end", k), a.removeListener("error", N), a.removeListener("close", _);
    };
  }
  n.exports = s;
})), la = /* @__PURE__ */ le(((e, n) => {
  Ye();
  var t;
  function u(A, S, p) {
    return S = l(S), S in A ? Object.defineProperty(A, S, {
      value: p,
      enumerable: !0,
      configurable: !0,
      writable: !0
    }) : A[S] = p, A;
  }
  function l(A) {
    var S = o(A, "string");
    return typeof S == "symbol" ? S : String(S);
  }
  function o(A, S) {
    if (typeof A != "object" || A === null) return A;
    var p = A[Symbol.toPrimitive];
    if (p !== void 0) {
      var F = p.call(A, S);
      if (typeof F != "object") return F;
      throw new TypeError("@@toPrimitive must return a primitive value.");
    }
    return (S === "string" ? String : Number)(A);
  }
  var s = Ar(), a = Symbol("lastResolve"), d = Symbol("lastReject"), g = Symbol("error"), v = Symbol("ended"), b = Symbol("lastPromise"), R = Symbol("handlePromise"), m = Symbol("stream");
  function w(A, S) {
    return {
      value: A,
      done: S
    };
  }
  function y(A) {
    var S = A[a];
    if (S !== null) {
      var p = A[m].read();
      p !== null && (A[b] = null, A[a] = null, A[d] = null, S(w(p, !1)));
    }
  }
  function k(A) {
    ge.nextTick(y, A);
  }
  function N(A, S) {
    return function(p, F) {
      A.then(function() {
        if (S[v]) {
          p(w(void 0, !0));
          return;
        }
        S[R](p, F);
      }, F);
    };
  }
  var _ = Object.getPrototypeOf(function() {
  }), x = Object.setPrototypeOf((t = {
    get stream() {
      return this[m];
    },
    next: function() {
      var S = this, p = this[g];
      if (p !== null) return Promise.reject(p);
      if (this[v]) return Promise.resolve(w(void 0, !0));
      if (this[m].destroyed) return new Promise(function(q, Q) {
        ge.nextTick(function() {
          S[g] ? Q(S[g]) : q(w(void 0, !0));
        });
      });
      var F = this[b], M;
      if (F) M = new Promise(N(F, this));
      else {
        var I = this[m].read();
        if (I !== null) return Promise.resolve(w(I, !1));
        M = new Promise(this[R]);
      }
      return this[b] = M, M;
    }
  }, u(t, Symbol.asyncIterator, function() {
    return this;
  }), u(t, "return", function() {
    var S = this;
    return new Promise(function(p, F) {
      S[m].destroy(null, function(M) {
        if (M) {
          F(M);
          return;
        }
        p(w(void 0, !0));
      });
    });
  }), t), _);
  n.exports = function(S) {
    var p, F = Object.create(x, (p = {}, u(p, m, {
      value: S,
      writable: !0
    }), u(p, a, {
      value: null,
      writable: !0
    }), u(p, d, {
      value: null,
      writable: !0
    }), u(p, g, {
      value: null,
      writable: !0
    }), u(p, v, {
      value: S._readableState.endEmitted,
      writable: !0
    }), u(p, R, {
      value: function(I, q) {
        var Q = F[m].read();
        Q ? (F[b] = null, F[a] = null, F[d] = null, I(w(Q, !1))) : (F[a] = I, F[d] = q);
      },
      writable: !0
    }), p));
    return F[b] = null, s(S, function(M) {
      if (M && M.code !== "ERR_STREAM_PREMATURE_CLOSE") {
        var I = F[d];
        I !== null && (F[b] = null, F[a] = null, F[d] = null, I(M)), F[g] = M;
        return;
      }
      var q = F[a];
      q !== null && (F[b] = null, F[a] = null, F[d] = null, q(w(void 0, !0))), F[v] = !0;
    }), S.on("readable", k.bind(null, F)), F;
  };
})), ca = /* @__PURE__ */ le(((e, n) => {
  n.exports = function() {
    throw new Error("Readable.from is not available in the browser");
  };
})), Tn = /* @__PURE__ */ le(((e, n) => {
  vt(), Ye(), n.exports = q;
  var t;
  q.ReadableState = I, _r().EventEmitter;
  var u = function(B, c) {
    return B.listeners(c).length;
  }, l = cn(), o = Zt().Buffer, s = (typeof Ce < "u" ? Ce : typeof window < "u" ? window : typeof self < "u" ? self : {}).Uint8Array || function() {
  };
  function a(D) {
    return o.from(D);
  }
  function d(D) {
    return o.isBuffer(D) || D instanceof s;
  }
  var g = _n(), v;
  g && g.debuglog ? v = g.debuglog("stream") : v = function() {
  };
  var b = oa(), R = xn(), m = En().getHighWaterMark, w = yt().codes, y = w.ERR_INVALID_ARG_TYPE, k = w.ERR_STREAM_PUSH_AFTER_EOF, N = w.ERR_METHOD_NOT_IMPLEMENTED, _ = w.ERR_STREAM_UNSHIFT_AFTER_END_EVENT, x, A, S;
  Ze()(q, l);
  var p = R.errorOrDestroy, F = [
    "error",
    "close",
    "destroy",
    "pause",
    "resume"
  ];
  function M(D, B, c) {
    if (typeof D.prependListener == "function") return D.prependListener(B, c);
    !D._events || !D._events[B] ? D.on(B, c) : Array.isArray(D._events[B]) ? D._events[B].unshift(c) : D._events[B] = [c, D._events[B]];
  }
  function I(D, B, c) {
    t = t || ht(), D = D || {}, typeof c != "boolean" && (c = B instanceof t), this.objectMode = !!D.objectMode, c && (this.objectMode = this.objectMode || !!D.readableObjectMode), this.highWaterMark = m(this, D, "readableHighWaterMark", c), this.buffer = new b(), this.length = 0, this.pipes = null, this.pipesCount = 0, this.flowing = null, this.ended = !1, this.endEmitted = !1, this.reading = !1, this.sync = !0, this.needReadable = !1, this.emittedReadable = !1, this.readableListening = !1, this.resumeScheduled = !1, this.paused = !0, this.emitClose = D.emitClose !== !1, this.autoDestroy = !!D.autoDestroy, this.destroyed = !1, this.defaultEncoding = D.defaultEncoding || "utf8", this.awaitDrain = 0, this.readingMore = !1, this.decoder = null, this.encoding = null, D.encoding && (x || (x = vr().StringDecoder), this.decoder = new x(D.encoding), this.encoding = D.encoding);
  }
  function q(D) {
    if (t = t || ht(), !(this instanceof q)) return new q(D);
    var B = this instanceof t;
    this._readableState = new I(D, this, B), this.readable = !0, D && (typeof D.read == "function" && (this._read = D.read), typeof D.destroy == "function" && (this._destroy = D.destroy)), l.call(this);
  }
  Object.defineProperty(q.prototype, "destroyed", {
    enumerable: !1,
    get: function() {
      return this._readableState === void 0 ? !1 : this._readableState.destroyed;
    },
    set: function(B) {
      this._readableState && (this._readableState.destroyed = B);
    }
  }), q.prototype.destroy = R.destroy, q.prototype._undestroy = R.undestroy, q.prototype._destroy = function(D, B) {
    B(D);
  }, q.prototype.push = function(D, B) {
    var c = this._readableState, G;
    return c.objectMode ? G = !0 : typeof D == "string" && (B = B || c.defaultEncoding, B !== c.encoding && (D = o.from(D, B), B = ""), G = !0), Q(this, D, B, !1, G);
  }, q.prototype.unshift = function(D) {
    return Q(this, D, null, !0, !1);
  };
  function Q(D, B, c, G, C) {
    v("readableAddChunk", B);
    var r = D._readableState;
    if (B === null)
      r.reading = !1, $(D, r);
    else {
      var i;
      if (C || (i = W(r, B)), i) p(D, i);
      else if (r.objectMode || B && B.length > 0)
        if (typeof B != "string" && !r.objectMode && Object.getPrototypeOf(B) !== o.prototype && (B = a(B)), G) r.endEmitted ? p(D, new _()) : O(D, r, B, !0);
        else if (r.ended) p(D, new k());
        else {
          if (r.destroyed) return !1;
          r.reading = !1, r.decoder && !c ? (B = r.decoder.write(B), r.objectMode || B.length !== 0 ? O(D, r, B, !1) : ee(D, r)) : O(D, r, B, !1);
        }
      else G || (r.reading = !1, ee(D, r));
    }
    return !r.ended && (r.length < r.highWaterMark || r.length === 0);
  }
  function O(D, B, c, G) {
    B.flowing && B.length === 0 && !B.sync ? (B.awaitDrain = 0, D.emit("data", c)) : (B.length += B.objectMode ? 1 : c.length, G ? B.buffer.unshift(c) : B.buffer.push(c), B.needReadable && oe(D)), ee(D, B);
  }
  function W(D, B) {
    var c;
    return !d(B) && typeof B != "string" && B !== void 0 && !D.objectMode && (c = new y("chunk", [
      "string",
      "Buffer",
      "Uint8Array"
    ], B)), c;
  }
  q.prototype.isPaused = function() {
    return this._readableState.flowing === !1;
  }, q.prototype.setEncoding = function(D) {
    x || (x = vr().StringDecoder);
    var B = new x(D);
    this._readableState.decoder = B, this._readableState.encoding = this._readableState.decoder.encoding;
    for (var c = this._readableState.buffer.head, G = ""; c !== null; )
      G += B.write(c.data), c = c.next;
    return this._readableState.buffer.clear(), G !== "" && this._readableState.buffer.push(G), this._readableState.length = G.length, this;
  };
  var T = 1073741824;
  function H(D) {
    return D >= T ? D = T : (D--, D |= D >>> 1, D |= D >>> 2, D |= D >>> 4, D |= D >>> 8, D |= D >>> 16, D++), D;
  }
  function J(D, B) {
    return D <= 0 || B.length === 0 && B.ended ? 0 : B.objectMode ? 1 : D !== D ? B.flowing && B.length ? B.buffer.head.data.length : B.length : (D > B.highWaterMark && (B.highWaterMark = H(D)), D <= B.length ? D : B.ended ? B.length : (B.needReadable = !0, 0));
  }
  q.prototype.read = function(D) {
    v("read", D), D = parseInt(D, 10);
    var B = this._readableState, c = D;
    if (D !== 0 && (B.emittedReadable = !1), D === 0 && B.needReadable && ((B.highWaterMark !== 0 ? B.length >= B.highWaterMark : B.length > 0) || B.ended))
      return v("read: emitReadable", B.length, B.ended), B.length === 0 && B.ended ? j(this) : oe(this), null;
    if (D = J(D, B), D === 0 && B.ended)
      return B.length === 0 && j(this), null;
    var G = B.needReadable;
    v("need readable", G), (B.length === 0 || B.length - D < B.highWaterMark) && (G = !0, v("length less than watermark", G)), B.ended || B.reading ? (G = !1, v("reading or ended", G)) : G && (v("do read"), B.reading = !0, B.sync = !0, B.length === 0 && (B.needReadable = !0), this._read(B.highWaterMark), B.sync = !1, B.reading || (D = J(c, B)));
    var C;
    return D > 0 ? C = h(D, B) : C = null, C === null ? (B.needReadable = B.length <= B.highWaterMark, D = 0) : (B.length -= D, B.awaitDrain = 0), B.length === 0 && (B.ended || (B.needReadable = !0), c !== D && B.ended && j(this)), C !== null && this.emit("data", C), C;
  };
  function $(D, B) {
    if (v("onEofChunk"), !B.ended) {
      if (B.decoder) {
        var c = B.decoder.end();
        c && c.length && (B.buffer.push(c), B.length += B.objectMode ? 1 : c.length);
      }
      B.ended = !0, B.sync ? oe(D) : (B.needReadable = !1, B.emittedReadable || (B.emittedReadable = !0, Z(D)));
    }
  }
  function oe(D) {
    var B = D._readableState;
    v("emitReadable", B.needReadable, B.emittedReadable), B.needReadable = !1, B.emittedReadable || (v("emitReadable", B.flowing), B.emittedReadable = !0, ge.nextTick(Z, D));
  }
  function Z(D) {
    var B = D._readableState;
    v("emitReadable_", B.destroyed, B.length, B.ended), !B.destroyed && (B.length || B.ended) && (D.emit("readable"), B.emittedReadable = !1), B.needReadable = !B.flowing && !B.ended && B.length <= B.highWaterMark, E(D);
  }
  function ee(D, B) {
    B.readingMore || (B.readingMore = !0, ge.nextTick(V, D, B));
  }
  function V(D, B) {
    for (; !B.reading && !B.ended && (B.length < B.highWaterMark || B.flowing && B.length === 0); ) {
      var c = B.length;
      if (v("maybeReadMore read 0"), D.read(0), c === B.length) break;
    }
    B.readingMore = !1;
  }
  q.prototype._read = function(D) {
    p(this, new N("_read()"));
  }, q.prototype.pipe = function(D, B) {
    var c = this, G = this._readableState;
    switch (G.pipesCount) {
      case 0:
        G.pipes = D;
        break;
      case 1:
        G.pipes = [G.pipes, D];
        break;
      default:
        G.pipes.push(D);
        break;
    }
    G.pipesCount += 1, v("pipe count=%d opts=%j", G.pipesCount, B);
    var C = (!B || B.end !== !1) && D !== ge.stdout && D !== ge.stderr ? i : he;
    G.endEmitted ? ge.nextTick(C) : c.once("end", C), D.on("unpipe", r);
    function r(de, me) {
      v("onunpipe"), de === c && me && me.hasUnpiped === !1 && (me.hasUnpiped = !0, K());
    }
    function i() {
      v("onend"), D.end();
    }
    var f = P(c);
    D.on("drain", f);
    var L = !1;
    function K() {
      v("cleanup"), D.removeListener("close", se), D.removeListener("finish", ae), D.removeListener("drain", f), D.removeListener("error", ne), D.removeListener("unpipe", r), c.removeListener("end", i), c.removeListener("end", he), c.removeListener("data", z), L = !0, G.awaitDrain && (!D._writableState || D._writableState.needDrain) && f();
    }
    c.on("data", z);
    function z(de) {
      v("ondata");
      var me = D.write(de);
      v("dest.write", me), me === !1 && ((G.pipesCount === 1 && G.pipes === D || G.pipesCount > 1 && re(G.pipes, D) !== -1) && !L && (v("false write response, pause", G.awaitDrain), G.awaitDrain++), c.pause());
    }
    function ne(de) {
      v("onerror", de), he(), D.removeListener("error", ne), u(D, "error") === 0 && p(D, de);
    }
    M(D, "error", ne);
    function se() {
      D.removeListener("finish", ae), he();
    }
    D.once("close", se);
    function ae() {
      v("onfinish"), D.removeListener("close", se), he();
    }
    D.once("finish", ae);
    function he() {
      v("unpipe"), c.unpipe(D);
    }
    return D.emit("pipe", c), G.flowing || (v("pipe resume"), c.resume()), D;
  };
  function P(D) {
    return function() {
      var c = D._readableState;
      v("pipeOnDrain", c.awaitDrain), c.awaitDrain && c.awaitDrain--, c.awaitDrain === 0 && u(D, "data") && (c.flowing = !0, E(D));
    };
  }
  q.prototype.unpipe = function(D) {
    var B = this._readableState, c = { hasUnpiped: !1 };
    if (B.pipesCount === 0) return this;
    if (B.pipesCount === 1)
      return D && D !== B.pipes ? this : (D || (D = B.pipes), B.pipes = null, B.pipesCount = 0, B.flowing = !1, D && D.emit("unpipe", this, c), this);
    if (!D) {
      var G = B.pipes, C = B.pipesCount;
      B.pipes = null, B.pipesCount = 0, B.flowing = !1;
      for (var r = 0; r < C; r++) G[r].emit("unpipe", this, { hasUnpiped: !1 });
      return this;
    }
    var i = re(B.pipes, D);
    return i === -1 ? this : (B.pipes.splice(i, 1), B.pipesCount -= 1, B.pipesCount === 1 && (B.pipes = B.pipes[0]), D.emit("unpipe", this, c), this);
  }, q.prototype.on = function(D, B) {
    var c = l.prototype.on.call(this, D, B), G = this._readableState;
    return D === "data" ? (G.readableListening = this.listenerCount("readable") > 0, G.flowing !== !1 && this.resume()) : D === "readable" && !G.endEmitted && !G.readableListening && (G.readableListening = G.needReadable = !0, G.flowing = !1, G.emittedReadable = !1, v("on readable", G.length, G.reading), G.length ? oe(this) : G.reading || ge.nextTick(Y, this)), c;
  }, q.prototype.addListener = q.prototype.on, q.prototype.removeListener = function(D, B) {
    var c = l.prototype.removeListener.call(this, D, B);
    return D === "readable" && ge.nextTick(X, this), c;
  }, q.prototype.removeAllListeners = function(D) {
    var B = l.prototype.removeAllListeners.apply(this, arguments);
    return (D === "readable" || D === void 0) && ge.nextTick(X, this), B;
  };
  function X(D) {
    var B = D._readableState;
    B.readableListening = D.listenerCount("readable") > 0, B.resumeScheduled && !B.paused ? B.flowing = !0 : D.listenerCount("data") > 0 && D.resume();
  }
  function Y(D) {
    v("readable nexttick read 0"), D.read(0);
  }
  q.prototype.resume = function() {
    var D = this._readableState;
    return D.flowing || (v("resume"), D.flowing = !D.readableListening, te(this, D)), D.paused = !1, this;
  };
  function te(D, B) {
    B.resumeScheduled || (B.resumeScheduled = !0, ge.nextTick(fe, D, B));
  }
  function fe(D, B) {
    v("resume", B.reading), B.reading || D.read(0), B.resumeScheduled = !1, D.emit("resume"), E(D), B.flowing && !B.reading && D.read(0);
  }
  q.prototype.pause = function() {
    return v("call pause flowing=%j", this._readableState.flowing), this._readableState.flowing !== !1 && (v("pause"), this._readableState.flowing = !1, this.emit("pause")), this._readableState.paused = !0, this;
  };
  function E(D) {
    var B = D._readableState;
    for (v("flow", B.flowing); B.flowing && D.read() !== null; ) ;
  }
  q.prototype.wrap = function(D) {
    var B = this, c = this._readableState, G = !1;
    D.on("end", function() {
      if (v("wrapped end"), c.decoder && !c.ended) {
        var i = c.decoder.end();
        i && i.length && B.push(i);
      }
      B.push(null);
    }), D.on("data", function(i) {
      v("wrapped data"), c.decoder && (i = c.decoder.write(i)), !(c.objectMode && i == null) && (!c.objectMode && (!i || !i.length) || B.push(i) || (G = !0, D.pause()));
    });
    for (var C in D) this[C] === void 0 && typeof D[C] == "function" && (this[C] = /* @__PURE__ */ (function(f) {
      return function() {
        return D[f].apply(D, arguments);
      };
    })(C));
    for (var r = 0; r < F.length; r++) D.on(F[r], this.emit.bind(this, F[r]));
    return this._read = function(i) {
      v("wrapped _read", i), G && (G = !1, D.resume());
    }, this;
  }, typeof Symbol == "function" && (q.prototype[Symbol.asyncIterator] = function() {
    return A === void 0 && (A = la()), A(this);
  }), Object.defineProperty(q.prototype, "readableHighWaterMark", {
    enumerable: !1,
    get: function() {
      return this._readableState.highWaterMark;
    }
  }), Object.defineProperty(q.prototype, "readableBuffer", {
    enumerable: !1,
    get: function() {
      return this._readableState && this._readableState.buffer;
    }
  }), Object.defineProperty(q.prototype, "readableFlowing", {
    enumerable: !1,
    get: function() {
      return this._readableState.flowing;
    },
    set: function(B) {
      this._readableState && (this._readableState.flowing = B);
    }
  }), q._fromList = h, Object.defineProperty(q.prototype, "readableLength", {
    enumerable: !1,
    get: function() {
      return this._readableState.length;
    }
  });
  function h(D, B) {
    if (B.length === 0) return null;
    var c;
    return B.objectMode ? c = B.buffer.shift() : !D || D >= B.length ? (B.decoder ? c = B.buffer.join("") : B.buffer.length === 1 ? c = B.buffer.first() : c = B.buffer.concat(B.length), B.buffer.clear()) : c = B.buffer.consume(D, B.decoder), c;
  }
  function j(D) {
    var B = D._readableState;
    v("endReadable", B.endEmitted), B.endEmitted || (B.ended = !0, ge.nextTick(U, B, D));
  }
  function U(D, B) {
    if (v("endReadableNT", D.endEmitted, D.length), !D.endEmitted && D.length === 0 && (D.endEmitted = !0, B.readable = !1, B.emit("end"), D.autoDestroy)) {
      var c = B._writableState;
      (!c || c.autoDestroy && c.finished) && B.destroy();
    }
  }
  typeof Symbol == "function" && (q.from = function(D, B) {
    return S === void 0 && (S = ca()), S(q, D, B);
  });
  function re(D, B) {
    for (var c = 0, G = D.length; c < G; c++) if (D[c] === B) return c;
    return -1;
  }
})), An = /* @__PURE__ */ le(((e, n) => {
  n.exports = g;
  var t = yt().codes, u = t.ERR_METHOD_NOT_IMPLEMENTED, l = t.ERR_MULTIPLE_CALLBACK, o = t.ERR_TRANSFORM_ALREADY_TRANSFORMING, s = t.ERR_TRANSFORM_WITH_LENGTH_0, a = ht();
  Ze()(g, a);
  function d(R, m) {
    var w = this._transformState;
    w.transforming = !1;
    var y = w.writecb;
    if (y === null) return this.emit("error", new l());
    w.writechunk = null, w.writecb = null, m != null && this.push(m), y(R);
    var k = this._readableState;
    k.reading = !1, (k.needReadable || k.length < k.highWaterMark) && this._read(k.highWaterMark);
  }
  function g(R) {
    if (!(this instanceof g)) return new g(R);
    a.call(this, R), this._transformState = {
      afterTransform: d.bind(this),
      needTransform: !1,
      transforming: !1,
      writecb: null,
      writechunk: null,
      writeencoding: null
    }, this._readableState.needReadable = !0, this._readableState.sync = !1, R && (typeof R.transform == "function" && (this._transform = R.transform), typeof R.flush == "function" && (this._flush = R.flush)), this.on("prefinish", v);
  }
  function v() {
    var R = this;
    typeof this._flush == "function" && !this._readableState.destroyed ? this._flush(function(m, w) {
      b(R, m, w);
    }) : b(this, null, null);
  }
  g.prototype.push = function(R, m) {
    return this._transformState.needTransform = !1, a.prototype.push.call(this, R, m);
  }, g.prototype._transform = function(R, m, w) {
    w(new u("_transform()"));
  }, g.prototype._write = function(R, m, w) {
    var y = this._transformState;
    if (y.writecb = w, y.writechunk = R, y.writeencoding = m, !y.transforming) {
      var k = this._readableState;
      (y.needTransform || k.needReadable || k.length < k.highWaterMark) && this._read(k.highWaterMark);
    }
  }, g.prototype._read = function(R) {
    var m = this._transformState;
    m.writechunk !== null && !m.transforming ? (m.transforming = !0, this._transform(m.writechunk, m.writeencoding, m.afterTransform)) : m.needTransform = !0;
  }, g.prototype._destroy = function(R, m) {
    a.prototype._destroy.call(this, R, function(w) {
      m(w);
    });
  };
  function b(R, m, w) {
    if (m) return R.emit("error", m);
    if (w != null && R.push(w), R._writableState.length) throw new s();
    if (R._transformState.transforming) throw new o();
    return R.push(null);
  }
})), ha = /* @__PURE__ */ le(((e, n) => {
  n.exports = u;
  var t = An();
  Ze()(u, t);
  function u(l) {
    if (!(this instanceof u)) return new u(l);
    t.call(this, l);
  }
  u.prototype._transform = function(l, o, s) {
    s(null, l);
  };
})), fa = /* @__PURE__ */ le(((e, n) => {
  var t;
  function u(w) {
    var y = !1;
    return function() {
      y || (y = !0, w.apply(void 0, arguments));
    };
  }
  var l = yt().codes, o = l.ERR_MISSING_ARGS, s = l.ERR_STREAM_DESTROYED;
  function a(w) {
    if (w) throw w;
  }
  function d(w) {
    return w.setHeader && typeof w.abort == "function";
  }
  function g(w, y, k, N) {
    N = u(N);
    var _ = !1;
    w.on("close", function() {
      _ = !0;
    }), t === void 0 && (t = Ar()), t(w, {
      readable: y,
      writable: k
    }, function(A) {
      if (A) return N(A);
      _ = !0, N();
    });
    var x = !1;
    return function(A) {
      if (!_ && !x) {
        if (x = !0, d(w)) return w.abort();
        if (typeof w.destroy == "function") return w.destroy();
        N(A || new s("pipe"));
      }
    };
  }
  function v(w) {
    w();
  }
  function b(w, y) {
    return w.pipe(y);
  }
  function R(w) {
    return !w.length || typeof w[w.length - 1] != "function" ? a : w.pop();
  }
  function m() {
    for (var w = arguments.length, y = new Array(w), k = 0; k < w; k++) y[k] = arguments[k];
    var N = R(y);
    if (Array.isArray(y[0]) && (y = y[0]), y.length < 2) throw new o("streams");
    var _, x = y.map(function(A, S) {
      var p = S < y.length - 1;
      return g(A, p, S > 0, function(F) {
        _ || (_ = F), F && x.forEach(v), !p && (x.forEach(v), N(_));
      });
    });
    return y.reduce(b);
  }
  n.exports = m;
})), kr = /* @__PURE__ */ le(((e, n) => {
  n.exports = u;
  var t = _r().EventEmitter;
  Ze()(u, t), u.Readable = Tn(), u.Writable = Sn(), u.Duplex = ht(), u.Transform = An(), u.PassThrough = ha(), u.finished = Ar(), u.pipeline = fa(), u.Stream = u;
  function u() {
    t.call(this);
  }
  u.prototype.pipe = function(l, o) {
    var s = this;
    function a(w) {
      l.writable && l.write(w) === !1 && s.pause && s.pause();
    }
    s.on("data", a);
    function d() {
      s.readable && s.resume && s.resume();
    }
    l.on("drain", d), !l._isStdio && (!o || o.end !== !1) && (s.on("end", v), s.on("close", b));
    var g = !1;
    function v() {
      g || (g = !0, l.end());
    }
    function b() {
      g || (g = !0, typeof l.destroy == "function" && l.destroy());
    }
    function R(w) {
      if (m(), t.listenerCount(this, "error") === 0) throw w;
    }
    s.on("error", R), l.on("error", R);
    function m() {
      s.removeListener("data", a), l.removeListener("drain", d), s.removeListener("end", v), s.removeListener("close", b), s.removeListener("error", R), l.removeListener("error", R), s.removeListener("end", m), s.removeListener("close", m), l.removeListener("close", m);
    }
    return s.on("end", m), s.on("close", m), l.on("close", m), l.emit("pipe", s), l;
  };
})), da = /* @__PURE__ */ le(((e) => {
  (function(n) {
    n.parser = function(E, h) {
      return new u(E, h);
    }, n.SAXParser = u, n.SAXStream = v, n.createStream = g, n.MAX_BUFFER_LENGTH = 64 * 1024;
    var t = [
      "comment",
      "sgmlDecl",
      "textNode",
      "tagName",
      "doctype",
      "procInstName",
      "procInstBody",
      "entity",
      "attribName",
      "attribValue",
      "cdata",
      "script"
    ];
    n.EVENTS = [
      "text",
      "processinginstruction",
      "sgmldeclaration",
      "doctype",
      "comment",
      "opentagstart",
      "attribute",
      "opentag",
      "closetag",
      "opencdata",
      "cdata",
      "closecdata",
      "error",
      "end",
      "ready",
      "script",
      "opennamespace",
      "closenamespace"
    ];
    function u(E, h) {
      if (!(this instanceof u)) return new u(E, h);
      var j = this;
      o(j), j.q = j.c = "", j.bufferCheckPosition = n.MAX_BUFFER_LENGTH, j.opt = h || {}, j.opt.lowercase = j.opt.lowercase || j.opt.lowercasetags, j.looseCase = j.opt.lowercase ? "toLowerCase" : "toUpperCase", j.tags = [], j.closed = j.closedRoot = j.sawRoot = !1, j.tag = j.error = null, j.strict = !!E, j.noscript = !!(E || j.opt.noscript), j.state = I.BEGIN, j.strictEntities = j.opt.strictEntities, j.ENTITIES = j.strictEntities ? Object.create(n.XML_ENTITIES) : Object.create(n.ENTITIES), j.attribList = [], j.opt.xmlns && (j.ns = Object.create(y)), j.trackPosition = j.opt.position !== !1, j.trackPosition && (j.position = j.line = j.column = 0), Q(j, "onready");
    }
    Object.create || (Object.create = function(E) {
      function h() {
      }
      return h.prototype = E, new h();
    }), Object.keys || (Object.keys = function(E) {
      var h = [];
      for (var j in E) E.hasOwnProperty(j) && h.push(j);
      return h;
    });
    function l(E) {
      for (var h = Math.max(n.MAX_BUFFER_LENGTH, 10), j = 0, U = 0, re = t.length; U < re; U++) {
        var D = E[t[U]].length;
        if (D > h) switch (t[U]) {
          case "textNode":
            W(E);
            break;
          case "cdata":
            O(E, "oncdata", E.cdata), E.cdata = "";
            break;
          case "script":
            O(E, "onscript", E.script), E.script = "";
            break;
          default:
            H(E, "Max buffer length exceeded: " + t[U]);
        }
        j = Math.max(j, D);
      }
      E.bufferCheckPosition = n.MAX_BUFFER_LENGTH - j + E.position;
    }
    function o(E) {
      for (var h = 0, j = t.length; h < j; h++) E[t[h]] = "";
    }
    function s(E) {
      W(E), E.cdata !== "" && (O(E, "oncdata", E.cdata), E.cdata = ""), E.script !== "" && (O(E, "onscript", E.script), E.script = "");
    }
    u.prototype = {
      end: function() {
        J(this);
      },
      write: fe,
      resume: function() {
        return this.error = null, this;
      },
      close: function() {
        return this.write(null);
      },
      flush: function() {
        s(this);
      }
    };
    var a;
    try {
      a = kr().Stream;
    } catch {
      a = function() {
      };
    }
    var d = n.EVENTS.filter(function(E) {
      return E !== "error" && E !== "end";
    });
    function g(E, h) {
      return new v(E, h);
    }
    function v(E, h) {
      if (!(this instanceof v)) return new v(E, h);
      a.apply(this), this._parser = new u(E, h), this.writable = !0, this.readable = !0;
      var j = this;
      this._parser.onend = function() {
        j.emit("end");
      }, this._parser.onerror = function(U) {
        j.emit("error", U), j._parser.error = null;
      }, this._decoder = null, d.forEach(function(U) {
        Object.defineProperty(j, "on" + U, {
          get: function() {
            return j._parser["on" + U];
          },
          set: function(re) {
            if (!re)
              return j.removeAllListeners(U), j._parser["on" + U] = re, re;
            j.on(U, re);
          },
          enumerable: !0,
          configurable: !1
        });
      });
    }
    v.prototype = Object.create(a.prototype, { constructor: { value: v } }), v.prototype.write = function(E) {
      if (typeof Buffer == "function" && typeof Buffer.isBuffer == "function" && Buffer.isBuffer(E)) {
        if (!this._decoder) {
          var h = vr().StringDecoder;
          this._decoder = new h("utf8");
        }
        E = this._decoder.write(E);
      }
      return this._parser.write(E.toString()), this.emit("data", E), !0;
    }, v.prototype.end = function(E) {
      return E && E.length && this.write(E), this._parser.end(), !0;
    }, v.prototype.on = function(E, h) {
      var j = this;
      return !j._parser["on" + E] && d.indexOf(E) !== -1 && (j._parser["on" + E] = function() {
        var U = arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments);
        U.splice(0, 0, E), j.emit.apply(j, U);
      }), a.prototype.on.call(j, E, h);
    };
    var b = "[CDATA[", R = "DOCTYPE", m = "http://www.w3.org/XML/1998/namespace", w = "http://www.w3.org/2000/xmlns/", y = {
      xml: m,
      xmlns: w
    }, k = /[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/, N = /[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u00B7\u0300-\u036F\u203F-\u2040.\d-]/, _ = /[#:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/, x = /[#:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u00B7\u0300-\u036F\u203F-\u2040.\d-]/;
    function A(E) {
      return E === " " || E === `
` || E === "\r" || E === "	";
    }
    function S(E) {
      return E === '"' || E === "'";
    }
    function p(E) {
      return E === ">" || A(E);
    }
    function F(E, h) {
      return E.test(h);
    }
    function M(E, h) {
      return !F(E, h);
    }
    var I = 0;
    n.STATE = {
      BEGIN: I++,
      BEGIN_WHITESPACE: I++,
      TEXT: I++,
      TEXT_ENTITY: I++,
      OPEN_WAKA: I++,
      SGML_DECL: I++,
      SGML_DECL_QUOTED: I++,
      DOCTYPE: I++,
      DOCTYPE_QUOTED: I++,
      DOCTYPE_DTD: I++,
      DOCTYPE_DTD_QUOTED: I++,
      COMMENT_STARTING: I++,
      COMMENT: I++,
      COMMENT_ENDING: I++,
      COMMENT_ENDED: I++,
      CDATA: I++,
      CDATA_ENDING: I++,
      CDATA_ENDING_2: I++,
      PROC_INST: I++,
      PROC_INST_BODY: I++,
      PROC_INST_ENDING: I++,
      OPEN_TAG: I++,
      OPEN_TAG_SLASH: I++,
      ATTRIB: I++,
      ATTRIB_NAME: I++,
      ATTRIB_NAME_SAW_WHITE: I++,
      ATTRIB_VALUE: I++,
      ATTRIB_VALUE_QUOTED: I++,
      ATTRIB_VALUE_CLOSED: I++,
      ATTRIB_VALUE_UNQUOTED: I++,
      ATTRIB_VALUE_ENTITY_Q: I++,
      ATTRIB_VALUE_ENTITY_U: I++,
      CLOSE_TAG: I++,
      CLOSE_TAG_SAW_WHITE: I++,
      SCRIPT: I++,
      SCRIPT_ENDING: I++
    }, n.XML_ENTITIES = {
      amp: "&",
      gt: ">",
      lt: "<",
      quot: '"',
      apos: "'"
    }, n.ENTITIES = {
      amp: "&",
      gt: ">",
      lt: "<",
      quot: '"',
      apos: "'",
      AElig: 198,
      Aacute: 193,
      Acirc: 194,
      Agrave: 192,
      Aring: 197,
      Atilde: 195,
      Auml: 196,
      Ccedil: 199,
      ETH: 208,
      Eacute: 201,
      Ecirc: 202,
      Egrave: 200,
      Euml: 203,
      Iacute: 205,
      Icirc: 206,
      Igrave: 204,
      Iuml: 207,
      Ntilde: 209,
      Oacute: 211,
      Ocirc: 212,
      Ograve: 210,
      Oslash: 216,
      Otilde: 213,
      Ouml: 214,
      THORN: 222,
      Uacute: 218,
      Ucirc: 219,
      Ugrave: 217,
      Uuml: 220,
      Yacute: 221,
      aacute: 225,
      acirc: 226,
      aelig: 230,
      agrave: 224,
      aring: 229,
      atilde: 227,
      auml: 228,
      ccedil: 231,
      eacute: 233,
      ecirc: 234,
      egrave: 232,
      eth: 240,
      euml: 235,
      iacute: 237,
      icirc: 238,
      igrave: 236,
      iuml: 239,
      ntilde: 241,
      oacute: 243,
      ocirc: 244,
      ograve: 242,
      oslash: 248,
      otilde: 245,
      ouml: 246,
      szlig: 223,
      thorn: 254,
      uacute: 250,
      ucirc: 251,
      ugrave: 249,
      uuml: 252,
      yacute: 253,
      yuml: 255,
      copy: 169,
      reg: 174,
      nbsp: 160,
      iexcl: 161,
      cent: 162,
      pound: 163,
      curren: 164,
      yen: 165,
      brvbar: 166,
      sect: 167,
      uml: 168,
      ordf: 170,
      laquo: 171,
      not: 172,
      shy: 173,
      macr: 175,
      deg: 176,
      plusmn: 177,
      sup1: 185,
      sup2: 178,
      sup3: 179,
      acute: 180,
      micro: 181,
      para: 182,
      middot: 183,
      cedil: 184,
      ordm: 186,
      raquo: 187,
      frac14: 188,
      frac12: 189,
      frac34: 190,
      iquest: 191,
      times: 215,
      divide: 247,
      OElig: 338,
      oelig: 339,
      Scaron: 352,
      scaron: 353,
      Yuml: 376,
      fnof: 402,
      circ: 710,
      tilde: 732,
      Alpha: 913,
      Beta: 914,
      Gamma: 915,
      Delta: 916,
      Epsilon: 917,
      Zeta: 918,
      Eta: 919,
      Theta: 920,
      Iota: 921,
      Kappa: 922,
      Lambda: 923,
      Mu: 924,
      Nu: 925,
      Xi: 926,
      Omicron: 927,
      Pi: 928,
      Rho: 929,
      Sigma: 931,
      Tau: 932,
      Upsilon: 933,
      Phi: 934,
      Chi: 935,
      Psi: 936,
      Omega: 937,
      alpha: 945,
      beta: 946,
      gamma: 947,
      delta: 948,
      epsilon: 949,
      zeta: 950,
      eta: 951,
      theta: 952,
      iota: 953,
      kappa: 954,
      lambda: 955,
      mu: 956,
      nu: 957,
      xi: 958,
      omicron: 959,
      pi: 960,
      rho: 961,
      sigmaf: 962,
      sigma: 963,
      tau: 964,
      upsilon: 965,
      phi: 966,
      chi: 967,
      psi: 968,
      omega: 969,
      thetasym: 977,
      upsih: 978,
      piv: 982,
      ensp: 8194,
      emsp: 8195,
      thinsp: 8201,
      zwnj: 8204,
      zwj: 8205,
      lrm: 8206,
      rlm: 8207,
      ndash: 8211,
      mdash: 8212,
      lsquo: 8216,
      rsquo: 8217,
      sbquo: 8218,
      ldquo: 8220,
      rdquo: 8221,
      bdquo: 8222,
      dagger: 8224,
      Dagger: 8225,
      bull: 8226,
      hellip: 8230,
      permil: 8240,
      prime: 8242,
      Prime: 8243,
      lsaquo: 8249,
      rsaquo: 8250,
      oline: 8254,
      frasl: 8260,
      euro: 8364,
      image: 8465,
      weierp: 8472,
      real: 8476,
      trade: 8482,
      alefsym: 8501,
      larr: 8592,
      uarr: 8593,
      rarr: 8594,
      darr: 8595,
      harr: 8596,
      crarr: 8629,
      lArr: 8656,
      uArr: 8657,
      rArr: 8658,
      dArr: 8659,
      hArr: 8660,
      forall: 8704,
      part: 8706,
      exist: 8707,
      empty: 8709,
      nabla: 8711,
      isin: 8712,
      notin: 8713,
      ni: 8715,
      prod: 8719,
      sum: 8721,
      minus: 8722,
      lowast: 8727,
      radic: 8730,
      prop: 8733,
      infin: 8734,
      ang: 8736,
      and: 8743,
      or: 8744,
      cap: 8745,
      cup: 8746,
      int: 8747,
      there4: 8756,
      sim: 8764,
      cong: 8773,
      asymp: 8776,
      ne: 8800,
      equiv: 8801,
      le: 8804,
      ge: 8805,
      sub: 8834,
      sup: 8835,
      nsub: 8836,
      sube: 8838,
      supe: 8839,
      oplus: 8853,
      otimes: 8855,
      perp: 8869,
      sdot: 8901,
      lceil: 8968,
      rceil: 8969,
      lfloor: 8970,
      rfloor: 8971,
      lang: 9001,
      rang: 9002,
      loz: 9674,
      spades: 9824,
      clubs: 9827,
      hearts: 9829,
      diams: 9830
    }, Object.keys(n.ENTITIES).forEach(function(E) {
      var h = n.ENTITIES[E], j = typeof h == "number" ? String.fromCharCode(h) : h;
      n.ENTITIES[E] = j;
    });
    for (var q in n.STATE) n.STATE[n.STATE[q]] = q;
    I = n.STATE;
    function Q(E, h, j) {
      E[h] && E[h](j);
    }
    function O(E, h, j) {
      E.textNode && W(E), Q(E, h, j);
    }
    function W(E) {
      E.textNode = T(E.opt, E.textNode), E.textNode && Q(E, "ontext", E.textNode), E.textNode = "";
    }
    function T(E, h) {
      return E.trim && (h = h.trim()), E.normalize && (h = h.replace(/\s+/g, " ")), h;
    }
    function H(E, h) {
      return W(E), E.trackPosition && (h += `
Line: ` + E.line + `
Column: ` + E.column + `
Char: ` + E.c), h = new Error(h), E.error = h, Q(E, "onerror", h), E;
    }
    function J(E) {
      return E.sawRoot && !E.closedRoot && $(E, "Unclosed root tag"), E.state !== I.BEGIN && E.state !== I.BEGIN_WHITESPACE && E.state !== I.TEXT && H(E, "Unexpected end"), W(E), E.c = "", E.closed = !0, Q(E, "onend"), u.call(E, E.strict, E.opt), E;
    }
    function $(E, h) {
      if (typeof E != "object" || !(E instanceof u)) throw new Error("bad call to strictFail");
      E.strict && H(E, h);
    }
    function oe(E) {
      E.strict || (E.tagName = E.tagName[E.looseCase]());
      var h = E.tags[E.tags.length - 1] || E, j = E.tag = {
        name: E.tagName,
        attributes: {}
      };
      E.opt.xmlns && (j.ns = h.ns), E.attribList.length = 0, O(E, "onopentagstart", j);
    }
    function Z(E, h) {
      var j = E.indexOf(":") < 0 ? ["", E] : E.split(":"), U = j[0], re = j[1];
      return h && E === "xmlns" && (U = "xmlns", re = ""), {
        prefix: U,
        local: re
      };
    }
    function ee(E) {
      if (E.strict || (E.attribName = E.attribName[E.looseCase]()), E.attribList.indexOf(E.attribName) !== -1 || E.tag.attributes.hasOwnProperty(E.attribName)) {
        E.attribName = E.attribValue = "";
        return;
      }
      if (E.opt.xmlns) {
        var h = Z(E.attribName, !0), j = h.prefix, U = h.local;
        if (j === "xmlns") if (U === "xml" && E.attribValue !== m) $(E, "xml: prefix must be bound to " + m + `
Actual: ` + E.attribValue);
        else if (U === "xmlns" && E.attribValue !== w) $(E, "xmlns: prefix must be bound to " + w + `
Actual: ` + E.attribValue);
        else {
          var re = E.tag, D = E.tags[E.tags.length - 1] || E;
          re.ns === D.ns && (re.ns = Object.create(D.ns)), re.ns[U] = E.attribValue;
        }
        E.attribList.push([E.attribName, E.attribValue]);
      } else
        E.tag.attributes[E.attribName] = E.attribValue, O(E, "onattribute", {
          name: E.attribName,
          value: E.attribValue
        });
      E.attribName = E.attribValue = "";
    }
    function V(E, h) {
      if (E.opt.xmlns) {
        var j = E.tag, U = Z(E.tagName);
        j.prefix = U.prefix, j.local = U.local, j.uri = j.ns[U.prefix] || "", j.prefix && !j.uri && ($(E, "Unbound namespace prefix: " + JSON.stringify(E.tagName)), j.uri = U.prefix);
        var re = E.tags[E.tags.length - 1] || E;
        j.ns && re.ns !== j.ns && Object.keys(j.ns).forEach(function(z) {
          O(E, "onopennamespace", {
            prefix: z,
            uri: j.ns[z]
          });
        });
        for (var D = 0, B = E.attribList.length; D < B; D++) {
          var c = E.attribList[D], G = c[0], C = c[1], r = Z(G, !0), i = r.prefix, f = r.local, L = i === "" ? "" : j.ns[i] || "", K = {
            name: G,
            value: C,
            prefix: i,
            local: f,
            uri: L
          };
          i && i !== "xmlns" && !L && ($(E, "Unbound namespace prefix: " + JSON.stringify(i)), K.uri = i), E.tag.attributes[G] = K, O(E, "onattribute", K);
        }
        E.attribList.length = 0;
      }
      E.tag.isSelfClosing = !!h, E.sawRoot = !0, E.tags.push(E.tag), O(E, "onopentag", E.tag), h || (!E.noscript && E.tagName.toLowerCase() === "script" ? E.state = I.SCRIPT : E.state = I.TEXT, E.tag = null, E.tagName = ""), E.attribName = E.attribValue = "", E.attribList.length = 0;
    }
    function P(E) {
      if (!E.tagName) {
        $(E, "Weird empty close tag."), E.textNode += "</>", E.state = I.TEXT;
        return;
      }
      if (E.script) {
        if (E.tagName !== "script") {
          E.script += "</" + E.tagName + ">", E.tagName = "", E.state = I.SCRIPT;
          return;
        }
        O(E, "onscript", E.script), E.script = "";
      }
      var h = E.tags.length, j = E.tagName;
      E.strict || (j = j[E.looseCase]());
      for (var U = j; h-- && E.tags[h].name !== U; ) $(E, "Unexpected close tag");
      if (h < 0) {
        $(E, "Unmatched closing tag: " + E.tagName), E.textNode += "</" + E.tagName + ">", E.state = I.TEXT;
        return;
      }
      E.tagName = j;
      for (var re = E.tags.length; re-- > h; ) {
        var D = E.tag = E.tags.pop();
        E.tagName = E.tag.name, O(E, "onclosetag", E.tagName);
        var B = {};
        for (var c in D.ns) B[c] = D.ns[c];
        var G = E.tags[E.tags.length - 1] || E;
        E.opt.xmlns && D.ns !== G.ns && Object.keys(D.ns).forEach(function(C) {
          var r = D.ns[C];
          O(E, "onclosenamespace", {
            prefix: C,
            uri: r
          });
        });
      }
      h === 0 && (E.closedRoot = !0), E.tagName = E.attribValue = E.attribName = "", E.attribList.length = 0, E.state = I.TEXT;
    }
    function X(E) {
      var h = E.entity, j = h.toLowerCase(), U, re = "";
      return E.ENTITIES[h] ? E.ENTITIES[h] : E.ENTITIES[j] ? E.ENTITIES[j] : (h = j, h.charAt(0) === "#" && (h.charAt(1) === "x" ? (h = h.slice(2), U = parseInt(h, 16), re = U.toString(16)) : (h = h.slice(1), U = parseInt(h, 10), re = U.toString(10))), h = h.replace(/^0+/, ""), isNaN(U) || re.toLowerCase() !== h ? ($(E, "Invalid character entity"), "&" + E.entity + ";") : String.fromCodePoint(U));
    }
    function Y(E, h) {
      h === "<" ? (E.state = I.OPEN_WAKA, E.startTagPosition = E.position) : A(h) || ($(E, "Non-whitespace before first tag."), E.textNode = h, E.state = I.TEXT);
    }
    function te(E, h) {
      var j = "";
      return h < E.length && (j = E.charAt(h)), j;
    }
    function fe(E) {
      var h = this;
      if (this.error) throw this.error;
      if (h.closed) return H(h, "Cannot write after close. Assign an onready handler.");
      if (E === null) return J(h);
      typeof E == "object" && (E = E.toString());
      for (var j = 0, U = ""; U = te(E, j++), h.c = U, !!U; )
        switch (h.trackPosition && (h.position++, U === `
` ? (h.line++, h.column = 0) : h.column++), h.state) {
          case I.BEGIN:
            if (h.state = I.BEGIN_WHITESPACE, U === "\uFEFF") continue;
            Y(h, U);
            continue;
          case I.BEGIN_WHITESPACE:
            Y(h, U);
            continue;
          case I.TEXT:
            if (h.sawRoot && !h.closedRoot) {
              for (var re = j - 1; U && U !== "<" && U !== "&"; )
                U = te(E, j++), U && h.trackPosition && (h.position++, U === `
` ? (h.line++, h.column = 0) : h.column++);
              h.textNode += E.substring(re, j - 1);
            }
            U === "<" && !(h.sawRoot && h.closedRoot && !h.strict) ? (h.state = I.OPEN_WAKA, h.startTagPosition = h.position) : (!A(U) && (!h.sawRoot || h.closedRoot) && $(h, "Text data outside of root node."), U === "&" ? h.state = I.TEXT_ENTITY : h.textNode += U);
            continue;
          case I.SCRIPT:
            U === "<" ? h.state = I.SCRIPT_ENDING : h.script += U;
            continue;
          case I.SCRIPT_ENDING:
            U === "/" ? h.state = I.CLOSE_TAG : (h.script += "<" + U, h.state = I.SCRIPT);
            continue;
          case I.OPEN_WAKA:
            if (U === "!")
              h.state = I.SGML_DECL, h.sgmlDecl = "";
            else if (!A(U)) if (F(k, U))
              h.state = I.OPEN_TAG, h.tagName = U;
            else if (U === "/")
              h.state = I.CLOSE_TAG, h.tagName = "";
            else if (U === "?")
              h.state = I.PROC_INST, h.procInstName = h.procInstBody = "";
            else {
              if ($(h, "Unencoded <"), h.startTagPosition + 1 < h.position) {
                var D = h.position - h.startTagPosition;
                U = new Array(D).join(" ") + U;
              }
              h.textNode += "<" + U, h.state = I.TEXT;
            }
            continue;
          case I.SGML_DECL:
            (h.sgmlDecl + U).toUpperCase() === b ? (O(h, "onopencdata"), h.state = I.CDATA, h.sgmlDecl = "", h.cdata = "") : h.sgmlDecl + U === "--" ? (h.state = I.COMMENT, h.comment = "", h.sgmlDecl = "") : (h.sgmlDecl + U).toUpperCase() === R ? (h.state = I.DOCTYPE, (h.doctype || h.sawRoot) && $(h, "Inappropriately located doctype declaration"), h.doctype = "", h.sgmlDecl = "") : U === ">" ? (O(h, "onsgmldeclaration", h.sgmlDecl), h.sgmlDecl = "", h.state = I.TEXT) : (S(U) && (h.state = I.SGML_DECL_QUOTED), h.sgmlDecl += U);
            continue;
          case I.SGML_DECL_QUOTED:
            U === h.q && (h.state = I.SGML_DECL, h.q = ""), h.sgmlDecl += U;
            continue;
          case I.DOCTYPE:
            U === ">" ? (h.state = I.TEXT, O(h, "ondoctype", h.doctype), h.doctype = !0) : (h.doctype += U, U === "[" ? h.state = I.DOCTYPE_DTD : S(U) && (h.state = I.DOCTYPE_QUOTED, h.q = U));
            continue;
          case I.DOCTYPE_QUOTED:
            h.doctype += U, U === h.q && (h.q = "", h.state = I.DOCTYPE);
            continue;
          case I.DOCTYPE_DTD:
            h.doctype += U, U === "]" ? h.state = I.DOCTYPE : S(U) && (h.state = I.DOCTYPE_DTD_QUOTED, h.q = U);
            continue;
          case I.DOCTYPE_DTD_QUOTED:
            h.doctype += U, U === h.q && (h.state = I.DOCTYPE_DTD, h.q = "");
            continue;
          case I.COMMENT:
            U === "-" ? h.state = I.COMMENT_ENDING : h.comment += U;
            continue;
          case I.COMMENT_ENDING:
            U === "-" ? (h.state = I.COMMENT_ENDED, h.comment = T(h.opt, h.comment), h.comment && O(h, "oncomment", h.comment), h.comment = "") : (h.comment += "-" + U, h.state = I.COMMENT);
            continue;
          case I.COMMENT_ENDED:
            U !== ">" ? ($(h, "Malformed comment"), h.comment += "--" + U, h.state = I.COMMENT) : h.state = I.TEXT;
            continue;
          case I.CDATA:
            U === "]" ? h.state = I.CDATA_ENDING : h.cdata += U;
            continue;
          case I.CDATA_ENDING:
            U === "]" ? h.state = I.CDATA_ENDING_2 : (h.cdata += "]" + U, h.state = I.CDATA);
            continue;
          case I.CDATA_ENDING_2:
            U === ">" ? (h.cdata && O(h, "oncdata", h.cdata), O(h, "onclosecdata"), h.cdata = "", h.state = I.TEXT) : U === "]" ? h.cdata += "]" : (h.cdata += "]]" + U, h.state = I.CDATA);
            continue;
          case I.PROC_INST:
            U === "?" ? h.state = I.PROC_INST_ENDING : A(U) ? h.state = I.PROC_INST_BODY : h.procInstName += U;
            continue;
          case I.PROC_INST_BODY:
            if (!h.procInstBody && A(U)) continue;
            U === "?" ? h.state = I.PROC_INST_ENDING : h.procInstBody += U;
            continue;
          case I.PROC_INST_ENDING:
            U === ">" ? (O(h, "onprocessinginstruction", {
              name: h.procInstName,
              body: h.procInstBody
            }), h.procInstName = h.procInstBody = "", h.state = I.TEXT) : (h.procInstBody += "?" + U, h.state = I.PROC_INST_BODY);
            continue;
          case I.OPEN_TAG:
            F(N, U) ? h.tagName += U : (oe(h), U === ">" ? V(h) : U === "/" ? h.state = I.OPEN_TAG_SLASH : (A(U) || $(h, "Invalid character in tag name"), h.state = I.ATTRIB));
            continue;
          case I.OPEN_TAG_SLASH:
            U === ">" ? (V(h, !0), P(h)) : ($(h, "Forward-slash in opening tag not followed by >"), h.state = I.ATTRIB);
            continue;
          case I.ATTRIB:
            if (A(U)) continue;
            U === ">" ? V(h) : U === "/" ? h.state = I.OPEN_TAG_SLASH : F(k, U) ? (h.attribName = U, h.attribValue = "", h.state = I.ATTRIB_NAME) : $(h, "Invalid attribute name");
            continue;
          case I.ATTRIB_NAME:
            U === "=" ? h.state = I.ATTRIB_VALUE : U === ">" ? ($(h, "Attribute without value"), h.attribValue = h.attribName, ee(h), V(h)) : A(U) ? h.state = I.ATTRIB_NAME_SAW_WHITE : F(N, U) ? h.attribName += U : $(h, "Invalid attribute name");
            continue;
          case I.ATTRIB_NAME_SAW_WHITE:
            if (U === "=") h.state = I.ATTRIB_VALUE;
            else {
              if (A(U)) continue;
              $(h, "Attribute without value"), h.tag.attributes[h.attribName] = "", h.attribValue = "", O(h, "onattribute", {
                name: h.attribName,
                value: ""
              }), h.attribName = "", U === ">" ? V(h) : F(k, U) ? (h.attribName = U, h.state = I.ATTRIB_NAME) : ($(h, "Invalid attribute name"), h.state = I.ATTRIB);
            }
            continue;
          case I.ATTRIB_VALUE:
            if (A(U)) continue;
            S(U) ? (h.q = U, h.state = I.ATTRIB_VALUE_QUOTED) : ($(h, "Unquoted attribute value"), h.state = I.ATTRIB_VALUE_UNQUOTED, h.attribValue = U);
            continue;
          case I.ATTRIB_VALUE_QUOTED:
            if (U !== h.q) {
              U === "&" ? h.state = I.ATTRIB_VALUE_ENTITY_Q : h.attribValue += U;
              continue;
            }
            ee(h), h.q = "", h.state = I.ATTRIB_VALUE_CLOSED;
            continue;
          case I.ATTRIB_VALUE_CLOSED:
            A(U) ? h.state = I.ATTRIB : U === ">" ? V(h) : U === "/" ? h.state = I.OPEN_TAG_SLASH : F(k, U) ? ($(h, "No whitespace between attributes"), h.attribName = U, h.attribValue = "", h.state = I.ATTRIB_NAME) : $(h, "Invalid attribute name");
            continue;
          case I.ATTRIB_VALUE_UNQUOTED:
            if (!p(U)) {
              U === "&" ? h.state = I.ATTRIB_VALUE_ENTITY_U : h.attribValue += U;
              continue;
            }
            ee(h), U === ">" ? V(h) : h.state = I.ATTRIB;
            continue;
          case I.CLOSE_TAG:
            if (h.tagName) U === ">" ? P(h) : F(N, U) ? h.tagName += U : h.script ? (h.script += "</" + h.tagName, h.tagName = "", h.state = I.SCRIPT) : (A(U) || $(h, "Invalid tagname in closing tag"), h.state = I.CLOSE_TAG_SAW_WHITE);
            else {
              if (A(U)) continue;
              M(k, U) ? h.script ? (h.script += "</" + U, h.state = I.SCRIPT) : $(h, "Invalid tagname in closing tag.") : h.tagName = U;
            }
            continue;
          case I.CLOSE_TAG_SAW_WHITE:
            if (A(U)) continue;
            U === ">" ? P(h) : $(h, "Invalid characters in closing tag");
            continue;
          case I.TEXT_ENTITY:
          case I.ATTRIB_VALUE_ENTITY_Q:
          case I.ATTRIB_VALUE_ENTITY_U:
            var B, c;
            switch (h.state) {
              case I.TEXT_ENTITY:
                B = I.TEXT, c = "textNode";
                break;
              case I.ATTRIB_VALUE_ENTITY_Q:
                B = I.ATTRIB_VALUE_QUOTED, c = "attribValue";
                break;
              case I.ATTRIB_VALUE_ENTITY_U:
                B = I.ATTRIB_VALUE_UNQUOTED, c = "attribValue";
                break;
            }
            U === ";" ? (h[c] += X(h), h.entity = "", h.state = B) : F(h.entity.length ? x : _, U) ? h.entity += U : ($(h, "Invalid character in entity name"), h[c] += "&" + h.entity + U, h.entity = "", h.state = B);
            continue;
          default:
            throw new Error(h, "Unknown state: " + h.state);
        }
      return h.position >= h.bufferCheckPosition && l(h), h;
    }
    /*! http://mths.be/fromcodepoint v0.1.0 by @mathias */
    String.fromCodePoint || (function() {
      var E = String.fromCharCode, h = Math.floor, j = function() {
        var U = 16384, re = [], D, B, c = -1, G = arguments.length;
        if (!G) return "";
        for (var C = ""; ++c < G; ) {
          var r = Number(arguments[c]);
          if (!isFinite(r) || r < 0 || r > 1114111 || h(r) !== r) throw RangeError("Invalid code point: " + r);
          r <= 65535 ? re.push(r) : (r -= 65536, D = (r >> 10) + 55296, B = r % 1024 + 56320, re.push(D, B)), (c + 1 === G || re.length > U) && (C += E.apply(null, re), re.length = 0);
        }
        return C;
      };
      Object.defineProperty ? Object.defineProperty(String, "fromCodePoint", {
        value: j,
        configurable: !0,
        writable: !0
      }) : String.fromCodePoint = j;
    })();
  })(typeof e > "u" ? e.sax = {} : e);
})), Rr = /* @__PURE__ */ le(((e, n) => {
  n.exports = { isArray: function(t) {
    return Array.isArray ? Array.isArray(t) : Object.prototype.toString.call(t) === "[object Array]";
  } };
})), Cr = /* @__PURE__ */ le(((e, n) => {
  var t = Rr().isArray;
  n.exports = {
    copyOptions: function(u) {
      var l, o = {};
      for (l in u) u.hasOwnProperty(l) && (o[l] = u[l]);
      return o;
    },
    ensureFlagExists: function(u, l) {
      (!(u in l) || typeof l[u] != "boolean") && (l[u] = !1);
    },
    ensureSpacesExists: function(u) {
      (!("spaces" in u) || typeof u.spaces != "number" && typeof u.spaces != "string") && (u.spaces = 0);
    },
    ensureAlwaysArrayExists: function(u) {
      (!("alwaysArray" in u) || typeof u.alwaysArray != "boolean" && !t(u.alwaysArray)) && (u.alwaysArray = !1);
    },
    ensureKeyExists: function(u, l) {
      (!(u + "Key" in l) || typeof l[u + "Key"] != "string") && (l[u + "Key"] = l.compact ? "_" + u : u);
    },
    checkFnExists: function(u, l) {
      return u + "Fn" in l;
    }
  };
})), kn = /* @__PURE__ */ le(((e, n) => {
  var t = da(), u = Cr(), l = Rr().isArray, o, s;
  function a(x) {
    return o = u.copyOptions(x), u.ensureFlagExists("ignoreDeclaration", o), u.ensureFlagExists("ignoreInstruction", o), u.ensureFlagExists("ignoreAttributes", o), u.ensureFlagExists("ignoreText", o), u.ensureFlagExists("ignoreComment", o), u.ensureFlagExists("ignoreCdata", o), u.ensureFlagExists("ignoreDoctype", o), u.ensureFlagExists("compact", o), u.ensureFlagExists("alwaysChildren", o), u.ensureFlagExists("addParent", o), u.ensureFlagExists("trim", o), u.ensureFlagExists("nativeType", o), u.ensureFlagExists("nativeTypeAttributes", o), u.ensureFlagExists("sanitize", o), u.ensureFlagExists("instructionHasAttributes", o), u.ensureFlagExists("captureSpacesBetweenElements", o), u.ensureAlwaysArrayExists(o), u.ensureKeyExists("declaration", o), u.ensureKeyExists("instruction", o), u.ensureKeyExists("attributes", o), u.ensureKeyExists("text", o), u.ensureKeyExists("comment", o), u.ensureKeyExists("cdata", o), u.ensureKeyExists("doctype", o), u.ensureKeyExists("type", o), u.ensureKeyExists("name", o), u.ensureKeyExists("elements", o), u.ensureKeyExists("parent", o), u.checkFnExists("doctype", o), u.checkFnExists("instruction", o), u.checkFnExists("cdata", o), u.checkFnExists("comment", o), u.checkFnExists("text", o), u.checkFnExists("instructionName", o), u.checkFnExists("elementName", o), u.checkFnExists("attributeName", o), u.checkFnExists("attributeValue", o), u.checkFnExists("attributes", o), o;
  }
  function d(x) {
    var A = Number(x);
    if (!isNaN(A)) return A;
    var S = x.toLowerCase();
    return S === "true" ? !0 : S === "false" ? !1 : x;
  }
  function g(x, A) {
    var S;
    if (o.compact) {
      if (!s[o[x + "Key"]] && (l(o.alwaysArray) ? o.alwaysArray.indexOf(o[x + "Key"]) !== -1 : o.alwaysArray) && (s[o[x + "Key"]] = []), s[o[x + "Key"]] && !l(s[o[x + "Key"]]) && (s[o[x + "Key"]] = [s[o[x + "Key"]]]), x + "Fn" in o && typeof A == "string" && (A = o[x + "Fn"](A, s)), x === "instruction" && ("instructionFn" in o || "instructionNameFn" in o)) {
        for (S in A) if (A.hasOwnProperty(S)) if ("instructionFn" in o) A[S] = o.instructionFn(A[S], S, s);
        else {
          var p = A[S];
          delete A[S], A[o.instructionNameFn(S, p, s)] = p;
        }
      }
      l(s[o[x + "Key"]]) ? s[o[x + "Key"]].push(A) : s[o[x + "Key"]] = A;
    } else {
      s[o.elementsKey] || (s[o.elementsKey] = []);
      var F = {};
      if (F[o.typeKey] = x, x === "instruction") {
        for (S in A) if (A.hasOwnProperty(S)) break;
        F[o.nameKey] = "instructionNameFn" in o ? o.instructionNameFn(S, A, s) : S, o.instructionHasAttributes ? (F[o.attributesKey] = A[S][o.attributesKey], "instructionFn" in o && (F[o.attributesKey] = o.instructionFn(F[o.attributesKey], S, s))) : ("instructionFn" in o && (A[S] = o.instructionFn(A[S], S, s)), F[o.instructionKey] = A[S]);
      } else
        x + "Fn" in o && (A = o[x + "Fn"](A, s)), F[o[x + "Key"]] = A;
      o.addParent && (F[o.parentKey] = s), s[o.elementsKey].push(F);
    }
  }
  function v(x) {
    if ("attributesFn" in o && x && (x = o.attributesFn(x, s)), (o.trim || "attributeValueFn" in o || "attributeNameFn" in o || o.nativeTypeAttributes) && x) {
      var A;
      for (A in x) if (x.hasOwnProperty(A) && (o.trim && (x[A] = x[A].trim()), o.nativeTypeAttributes && (x[A] = d(x[A])), "attributeValueFn" in o && (x[A] = o.attributeValueFn(x[A], A, s)), "attributeNameFn" in o)) {
        var S = x[A];
        delete x[A], x[o.attributeNameFn(A, x[A], s)] = S;
      }
    }
    return x;
  }
  function b(x) {
    var A = {};
    if (x.body && (x.name.toLowerCase() === "xml" || o.instructionHasAttributes)) {
      for (var S = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\w+))\s*/g, p; (p = S.exec(x.body)) !== null; ) A[p[1]] = p[2] || p[3] || p[4];
      A = v(A);
    }
    if (x.name.toLowerCase() === "xml") {
      if (o.ignoreDeclaration) return;
      s[o.declarationKey] = {}, Object.keys(A).length && (s[o.declarationKey][o.attributesKey] = A), o.addParent && (s[o.declarationKey][o.parentKey] = s);
    } else {
      if (o.ignoreInstruction) return;
      o.trim && (x.body = x.body.trim());
      var F = {};
      o.instructionHasAttributes && Object.keys(A).length ? (F[x.name] = {}, F[x.name][o.attributesKey] = A) : F[x.name] = x.body, g("instruction", F);
    }
  }
  function R(x, A) {
    var S;
    if (typeof x == "object" && (A = x.attributes, x = x.name), A = v(A), "elementNameFn" in o && (x = o.elementNameFn(x, s)), o.compact) {
      if (S = {}, !o.ignoreAttributes && A && Object.keys(A).length) {
        S[o.attributesKey] = {};
        var p;
        for (p in A) A.hasOwnProperty(p) && (S[o.attributesKey][p] = A[p]);
      }
      !(x in s) && (l(o.alwaysArray) ? o.alwaysArray.indexOf(x) !== -1 : o.alwaysArray) && (s[x] = []), s[x] && !l(s[x]) && (s[x] = [s[x]]), l(s[x]) ? s[x].push(S) : s[x] = S;
    } else
      s[o.elementsKey] || (s[o.elementsKey] = []), S = {}, S[o.typeKey] = "element", S[o.nameKey] = x, !o.ignoreAttributes && A && Object.keys(A).length && (S[o.attributesKey] = A), o.alwaysChildren && (S[o.elementsKey] = []), s[o.elementsKey].push(S);
    S[o.parentKey] = s, s = S;
  }
  function m(x) {
    o.ignoreText || !x.trim() && !o.captureSpacesBetweenElements || (o.trim && (x = x.trim()), o.nativeType && (x = d(x)), o.sanitize && (x = x.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")), g("text", x));
  }
  function w(x) {
    o.ignoreComment || (o.trim && (x = x.trim()), g("comment", x));
  }
  function y(x) {
    var A = s[o.parentKey];
    o.addParent || delete s[o.parentKey], s = A;
  }
  function k(x) {
    o.ignoreCdata || (o.trim && (x = x.trim()), g("cdata", x));
  }
  function N(x) {
    o.ignoreDoctype || (x = x.replace(/^ /, ""), o.trim && (x = x.trim()), g("doctype", x));
  }
  function _(x) {
    x.note = x;
  }
  n.exports = function(x, A) {
    var S = t.parser(!0, {}), p = {};
    if (s = p, o = a(A), S.opt = { strictEntities: !0 }, S.onopentag = R, S.ontext = m, S.oncomment = w, S.onclosetag = y, S.onerror = _, S.oncdata = k, S.ondoctype = N, S.onprocessinginstruction = b, S.write(x).close(), p[o.elementsKey]) {
      var F = p[o.elementsKey];
      delete p[o.elementsKey], p[o.elementsKey] = F, delete p.text;
    }
    return p;
  };
})), pa = /* @__PURE__ */ le(((e, n) => {
  var t = Cr(), u = kn();
  function l(o) {
    var s = t.copyOptions(o);
    return t.ensureSpacesExists(s), s;
  }
  n.exports = function(o, s) {
    var a = l(s), d = u(o, a), g, v = "compact" in a && a.compact ? "_parent" : "parent";
    return "addParent" in a && a.addParent ? g = JSON.stringify(d, function(b, R) {
      return b === v ? "_" : R;
    }, a.spaces) : g = JSON.stringify(d, null, a.spaces), g.replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  };
})), Rn = /* @__PURE__ */ le(((e, n) => {
  var t = Cr(), u = Rr().isArray, l, o;
  function s(S) {
    var p = t.copyOptions(S);
    return t.ensureFlagExists("ignoreDeclaration", p), t.ensureFlagExists("ignoreInstruction", p), t.ensureFlagExists("ignoreAttributes", p), t.ensureFlagExists("ignoreText", p), t.ensureFlagExists("ignoreComment", p), t.ensureFlagExists("ignoreCdata", p), t.ensureFlagExists("ignoreDoctype", p), t.ensureFlagExists("compact", p), t.ensureFlagExists("indentText", p), t.ensureFlagExists("indentCdata", p), t.ensureFlagExists("indentAttributes", p), t.ensureFlagExists("indentInstruction", p), t.ensureFlagExists("fullTagEmptyElement", p), t.ensureFlagExists("noQuotesForNativeAttributes", p), t.ensureSpacesExists(p), typeof p.spaces == "number" && (p.spaces = Array(p.spaces + 1).join(" ")), t.ensureKeyExists("declaration", p), t.ensureKeyExists("instruction", p), t.ensureKeyExists("attributes", p), t.ensureKeyExists("text", p), t.ensureKeyExists("comment", p), t.ensureKeyExists("cdata", p), t.ensureKeyExists("doctype", p), t.ensureKeyExists("type", p), t.ensureKeyExists("name", p), t.ensureKeyExists("elements", p), t.checkFnExists("doctype", p), t.checkFnExists("instruction", p), t.checkFnExists("cdata", p), t.checkFnExists("comment", p), t.checkFnExists("text", p), t.checkFnExists("instructionName", p), t.checkFnExists("elementName", p), t.checkFnExists("attributeName", p), t.checkFnExists("attributeValue", p), t.checkFnExists("attributes", p), t.checkFnExists("fullTagEmptyElement", p), p;
  }
  function a(S, p, F) {
    return (!F && S.spaces ? `
` : "") + Array(p + 1).join(S.spaces);
  }
  function d(S, p, F) {
    if (p.ignoreAttributes) return "";
    "attributesFn" in p && (S = p.attributesFn(S, o, l));
    var M, I, q, Q, O = [];
    for (M in S) S.hasOwnProperty(M) && S[M] !== null && S[M] !== void 0 && (Q = p.noQuotesForNativeAttributes && typeof S[M] != "string" ? "" : '"', I = "" + S[M], I = I.replace(/"/g, "&quot;"), q = "attributeNameFn" in p ? p.attributeNameFn(M, I, o, l) : M, O.push(p.spaces && p.indentAttributes ? a(p, F + 1, !1) : " "), O.push(q + "=" + Q + ("attributeValueFn" in p ? p.attributeValueFn(I, M, o, l) : I) + Q));
    return S && Object.keys(S).length && p.spaces && p.indentAttributes && O.push(a(p, F, !1)), O.join("");
  }
  function g(S, p, F) {
    return l = S, o = "xml", p.ignoreDeclaration ? "" : "<?xml" + d(S[p.attributesKey], p, F) + "?>";
  }
  function v(S, p, F) {
    if (p.ignoreInstruction) return "";
    var M;
    for (M in S) if (S.hasOwnProperty(M)) break;
    var I = "instructionNameFn" in p ? p.instructionNameFn(M, S[M], o, l) : M;
    if (typeof S[M] == "object")
      return l = S, o = I, "<?" + I + d(S[M][p.attributesKey], p, F) + "?>";
    var q = S[M] ? S[M] : "";
    return "instructionFn" in p && (q = p.instructionFn(q, M, o, l)), "<?" + I + (q ? " " + q : "") + "?>";
  }
  function b(S, p) {
    return p.ignoreComment ? "" : "<!--" + ("commentFn" in p ? p.commentFn(S, o, l) : S) + "-->";
  }
  function R(S, p) {
    return p.ignoreCdata ? "" : "<![CDATA[" + ("cdataFn" in p ? p.cdataFn(S, o, l) : S.replace("]]>", "]]]]><![CDATA[>")) + "]]>";
  }
  function m(S, p) {
    return p.ignoreDoctype ? "" : "<!DOCTYPE " + ("doctypeFn" in p ? p.doctypeFn(S, o, l) : S) + ">";
  }
  function w(S, p) {
    return p.ignoreText ? "" : (S = "" + S, S = S.replace(/&amp;/g, "&"), S = S.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"), "textFn" in p ? p.textFn(S, o, l) : S);
  }
  function y(S, p) {
    var F;
    if (S.elements && S.elements.length) for (F = 0; F < S.elements.length; ++F) switch (S.elements[F][p.typeKey]) {
      case "text":
        if (p.indentText) return !0;
        break;
      case "cdata":
        if (p.indentCdata) return !0;
        break;
      case "instruction":
        if (p.indentInstruction) return !0;
        break;
      case "doctype":
      case "comment":
      case "element":
        return !0;
      default:
        return !0;
    }
    return !1;
  }
  function k(S, p, F) {
    l = S, o = S.name;
    var M = [], I = "elementNameFn" in p ? p.elementNameFn(S.name, S) : S.name;
    M.push("<" + I), S[p.attributesKey] && M.push(d(S[p.attributesKey], p, F));
    var q = S[p.elementsKey] && S[p.elementsKey].length || S[p.attributesKey] && S[p.attributesKey]["xml:space"] === "preserve";
    return q || ("fullTagEmptyElementFn" in p ? q = p.fullTagEmptyElementFn(S.name, S) : q = p.fullTagEmptyElement), q ? (M.push(">"), S[p.elementsKey] && S[p.elementsKey].length && (M.push(N(S[p.elementsKey], p, F + 1)), l = S, o = S.name), M.push(p.spaces && y(S, p) ? `
` + Array(F + 1).join(p.spaces) : ""), M.push("</" + I + ">")) : M.push("/>"), M.join("");
  }
  function N(S, p, F, M) {
    return S.reduce(function(I, q) {
      var Q = a(p, F, M && !I);
      switch (q.type) {
        case "element":
          return I + Q + k(q, p, F);
        case "comment":
          return I + Q + b(q[p.commentKey], p);
        case "doctype":
          return I + Q + m(q[p.doctypeKey], p);
        case "cdata":
          return I + (p.indentCdata ? Q : "") + R(q[p.cdataKey], p);
        case "text":
          return I + (p.indentText ? Q : "") + w(q[p.textKey], p);
        case "instruction":
          var O = {};
          return O[q[p.nameKey]] = q[p.attributesKey] ? q : q[p.instructionKey], I + (p.indentInstruction ? Q : "") + v(O, p, F);
      }
    }, "");
  }
  function _(S, p, F) {
    var M;
    for (M in S) if (S.hasOwnProperty(M)) switch (M) {
      case p.parentKey:
      case p.attributesKey:
        break;
      case p.textKey:
        if (p.indentText || F) return !0;
        break;
      case p.cdataKey:
        if (p.indentCdata || F) return !0;
        break;
      case p.instructionKey:
        if (p.indentInstruction || F) return !0;
        break;
      case p.doctypeKey:
      case p.commentKey:
        return !0;
      default:
        return !0;
    }
    return !1;
  }
  function x(S, p, F, M, I) {
    l = S, o = p;
    var q = "elementNameFn" in F ? F.elementNameFn(p, S) : p;
    if (typeof S > "u" || S === null || S === "") return "fullTagEmptyElementFn" in F && F.fullTagEmptyElementFn(p, S) || F.fullTagEmptyElement ? "<" + q + "></" + q + ">" : "<" + q + "/>";
    var Q = [];
    if (p) {
      if (Q.push("<" + q), typeof S != "object")
        return Q.push(">" + w(S, F) + "</" + q + ">"), Q.join("");
      S[F.attributesKey] && Q.push(d(S[F.attributesKey], F, M));
      var O = _(S, F, !0) || S[F.attributesKey] && S[F.attributesKey]["xml:space"] === "preserve";
      if (O || ("fullTagEmptyElementFn" in F ? O = F.fullTagEmptyElementFn(p, S) : O = F.fullTagEmptyElement), O) Q.push(">");
      else
        return Q.push("/>"), Q.join("");
    }
    return Q.push(A(S, F, M + 1, !1)), l = S, o = p, p && Q.push((I ? a(F, M, !1) : "") + "</" + q + ">"), Q.join("");
  }
  function A(S, p, F, M) {
    var I, q, Q, O = [];
    for (q in S) if (S.hasOwnProperty(q))
      for (Q = u(S[q]) ? S[q] : [S[q]], I = 0; I < Q.length; ++I) {
        switch (q) {
          case p.declarationKey:
            O.push(g(Q[I], p, F));
            break;
          case p.instructionKey:
            O.push((p.indentInstruction ? a(p, F, M) : "") + v(Q[I], p, F));
            break;
          case p.attributesKey:
          case p.parentKey:
            break;
          case p.textKey:
            O.push((p.indentText ? a(p, F, M) : "") + w(Q[I], p));
            break;
          case p.cdataKey:
            O.push((p.indentCdata ? a(p, F, M) : "") + R(Q[I], p));
            break;
          case p.doctypeKey:
            O.push(a(p, F, M) + m(Q[I], p));
            break;
          case p.commentKey:
            O.push(a(p, F, M) + b(Q[I], p));
            break;
          default:
            O.push(a(p, F, M) + x(Q[I], q, p, F, _(Q[I], p)));
        }
        M = M && !O.length;
      }
    return O.join("");
  }
  n.exports = function(S, p) {
    p = s(p);
    var F = [];
    return l = S, o = "_root_", p.compact ? F.push(A(S, p, 0, !0)) : (S[p.declarationKey] && F.push(g(S[p.declarationKey], p, 0)), S[p.elementsKey] && S[p.elementsKey].length && F.push(N(S[p.elementsKey], p, 0, !F.length))), F.join("");
  };
})), ma = /* @__PURE__ */ le(((e, n) => {
  var t = Rn();
  n.exports = function(u, l) {
    u instanceof Buffer && (u = u.toString());
    var o = null;
    if (typeof u == "string") try {
      o = JSON.parse(u);
    } catch {
      throw new Error("The JSON structure is invalid");
    }
    else o = u;
    return t(o, l);
  };
})), Cn = (/* @__PURE__ */ le(((e, n) => {
  n.exports = {
    xml2js: kn(),
    xml2json: pa(),
    js2xml: Rn(),
    json2xml: ma()
  };
})))(), Ir = (e) => {
  switch (e.type) {
    case void 0:
    case "element":
      const n = new ga(e.name, e.attributes), t = e.elements || [];
      for (const u of t) {
        const l = Ir(u);
        l !== void 0 && n.push(l);
      }
      return n;
    case "text":
      return e.text;
    default:
      return;
  }
}, wa = class extends ve {
}, ga = class extends ce {
  /**
  * Parses an XML string and converts it to an ImportedXmlComponent tree.
  *
  * This static method is the primary way to import external XML content.
  * It uses xml-js to parse the XML string into a JSON representation,
  * then converts that into a tree of XmlComponent objects.
  *
  * @param importedContent - The XML content as a string
  * @returns An ImportedXmlComponent representing the parsed XML
  *
  * @example
  * ```typescript
  * const xml = '<w:p><w:r><w:t>Hello</w:t></w:r></w:p>';
  * const component = ImportedXmlComponent.fromXmlString(xml);
  * ```
  */
  static fromXmlString(e) {
    return Ir((0, Cn.xml2js)(e, { compact: !1 }));
  }
  /**
  * Creates an ImportedXmlComponent.
  *
  * @param rootKey - The XML element name
  * @param _attr - Optional attributes for the root element
  */
  constructor(e, n) {
    super(e), n && this.root.push(new wa(n));
  }
  /**
  * Adds a child component or text to this element.
  *
  * @param xmlComponent - The child component or text string to add
  */
  push(e) {
    this.root.push(e);
  }
}, va = class extends ce {
  /**
  * Creates an ImportedRootElementAttributes component.
  *
  * @param _attr - The attributes object to pass through
  */
  constructor(e) {
    super(""), ie(this, "_attr", void 0), this._attr = e;
  }
  /**
  * Prepares the attributes for XML serialization.
  *
  * @param _ - Context (unused)
  * @returns Object with _attr key containing the raw attributes
  */
  prepForXml(e) {
    return { _attr: this._attr };
  }
}, In = class extends ce {
  /**
  * Creates a new InitializableXmlComponent.
  *
  * @param rootKey - The XML element name
  * @param initComponent - Optional component to copy children from
  */
  constructor(e, n) {
    super(e), n && (this.root = n.root);
  }
}, ke = (e) => {
  if (isNaN(e)) throw new Error(`Invalid value '${e}' specified. Must be an integer.`);
  return Math.floor(e);
}, Qt = (e) => {
  const n = ke(e);
  if (n < 0) throw new Error(`Invalid value '${e}' specified. Must be a positive integer.`);
  return n;
}, Nn = (e, n) => {
  const t = n * 2;
  if (e.length !== t || isNaN(+`0x${e}`)) throw new Error(`Invalid hex value '${e}'. Expected ${t} digit hex value`);
  return e;
}, Wr = (e) => Nn(e, 1), Nr = (e) => {
  const n = e.slice(-2), t = e.substring(0, e.length - 2);
  return `${Number(t)}${n}`;
}, On = (e) => {
  const n = Nr(e);
  if (parseFloat(n) < 0) throw new Error(`Invalid value '${n}' specified. Expected a positive number.`);
  return n;
}, ft = (e) => e === "auto" ? e : Nn(e.charAt(0) === "#" ? e.substring(1) : e, 3), Ge = (e) => typeof e == "string" ? Nr(e) : ke(e), ya = (e) => typeof e == "string" ? On(e) : Qt(e), Te = (e) => typeof e == "string" ? On(e) : Qt(e), ba = (e) => {
  const n = e.substring(0, e.length - 1);
  return `${Number(n)}%`;
}, Fn = (e) => typeof e == "number" ? ke(e) : e.slice(-1) === "%" ? ba(e) : Nr(e), _a = Qt, xa = Qt, Ea = (e) => e.toISOString(), ue = class extends ce {
  /**
  * Creates an OnOffElement.
  *
  * @param name - The XML element name (e.g., "w:b", "w:i")
  * @param val - The boolean value (defaults to true)
  */
  constructor(e, n = !0) {
    super(e), n !== !0 && this.root.push(new Re({ val: n }));
  }
}, ar = class extends ce {
  /**
  * Creates an HpsMeasureElement.
  *
  * @param name - The XML element name
  * @param val - The measurement value (number in half-points or string with units)
  */
  constructor(e, n) {
    super(e), this.root.push(new Re({ val: ya(n) }));
  }
}, Sa = class extends ce {
}, it = class extends ce {
  /**
  * Creates a StringValueElement.
  *
  * @param name - The XML element name
  * @param val - The string value
  */
  constructor(e, n) {
    super(e), this.root.push(new Re({ val: n }));
  }
}, Et = (e, n) => new we({
  name: e,
  attributes: { value: {
    key: "w:val",
    value: n
  } }
}), Ct = class extends ce {
  /**
  * Creates a NumberValueElement.
  *
  * @param name - The XML element name
  * @param val - The numeric value
  */
  constructor(e, n) {
    super(e), this.root.push(new Re({ val: n }));
  }
}, et = class extends ce {
  /**
  * Creates a StringContainer.
  *
  * @param name - The XML element name
  * @param val - The text content
  */
  constructor(e, n) {
    super(e), this.root.push(n);
  }
}, we = class extends ce {
  /**
  * Creates a BuilderElement with the specified configuration.
  *
  * @param config - Element configuration
  * @param config.name - The XML element name
  * @param config.attributes - Optional attributes with explicit key-value pairs
  * @param config.children - Optional child elements
  */
  constructor({ name: e, attributes: n, children: t }) {
    super(e), n && this.root.push(new _i(n)), t && this.root.push(...t);
  }
}, Ne = {
  /** Align Start */
  START: "start",
  /** Align Center */
  CENTER: "center",
  /** Align Left */
  LEFT: "left"
}, Pn = (e) => new we({
  name: "w:jc",
  attributes: { val: {
    key: "w:val",
    value: e
  } }
}), be = (e, { color: n, size: t, space: u, style: l }) => new we({
  name: e,
  attributes: {
    style: {
      key: "w:val",
      value: l
    },
    color: {
      key: "w:color",
      value: n === void 0 ? void 0 : ft(n)
    },
    size: {
      key: "w:sz",
      value: t === void 0 ? void 0 : _a(t)
    },
    space: {
      key: "w:space",
      value: u === void 0 ? void 0 : xa(u)
    }
  }
}), Ke = {
  /** a single line */
  SINGLE: "single",
  /** no border */
  NONE: "none"
}, Ta = class extends Xe {
  constructor(e) {
    super("w:pBdr"), e.top && this.root.push(be("w:top", e.top)), e.bottom && this.root.push(be("w:bottom", e.bottom)), e.left && this.root.push(be("w:left", e.left)), e.right && this.root.push(be("w:right", e.right)), e.between && this.root.push(be("w:between", e.between));
  }
}, Aa = class extends ce {
  constructor() {
    super("w:pBdr");
    const e = be("w:bottom", {
      color: "auto",
      space: 1,
      style: Ke.SINGLE,
      size: 6
    });
    this.root.push(e);
  }
}, ka = ({ start: e, end: n, left: t, right: u, hanging: l, firstLine: o, firstLineChars: s }) => new we({
  name: "w:ind",
  attributes: {
    start: {
      key: "w:start",
      value: e === void 0 ? void 0 : Ge(e)
    },
    end: {
      key: "w:end",
      value: n === void 0 ? void 0 : Ge(n)
    },
    left: {
      key: "w:left",
      value: t === void 0 ? void 0 : Ge(t)
    },
    right: {
      key: "w:right",
      value: u === void 0 ? void 0 : Ge(u)
    },
    hanging: {
      key: "w:hanging",
      value: l === void 0 ? void 0 : Te(l)
    },
    firstLine: {
      key: "w:firstLine",
      value: o === void 0 ? void 0 : Te(o)
    },
    firstLineChars: {
      key: "w:firstLineChars",
      value: s === void 0 ? void 0 : ke(s)
    }
  }
}), Ra = () => new we({ name: "w:br" }), Or = {
  BEGIN: "begin",
  END: "end",
  SEPARATE: "separate"
}, Fr = (e, n) => new we({
  name: "w:fldChar",
  attributes: {
    type: {
      key: "w:fldCharType",
      value: e
    },
    dirty: {
      key: "w:dirty",
      value: n
    }
  }
}), zt = (e) => Fr(Or.BEGIN, e), Wt = (e) => Fr(Or.SEPARATE, e), Ht = (e) => Fr(Or.END, e), dt = {
  DEFAULT: "default",
  PRESERVE: "preserve"
}, pt = class extends ve {
  constructor(...e) {
    super(...e), ie(this, "xmlKeys", { space: "xml:space" });
  }
}, Ca = class extends ce {
  constructor() {
    super("w:instrText"), this.root.push(new pt({ space: dt.PRESERVE })), this.root.push("PAGE");
  }
}, Ia = class extends ce {
  constructor() {
    super("w:instrText"), this.root.push(new pt({ space: dt.PRESERVE })), this.root.push("NUMPAGES");
  }
}, Na = class extends ce {
  constructor() {
    super("w:instrText"), this.root.push(new pt({ space: dt.PRESERVE })), this.root.push("SECTIONPAGES");
  }
}, Oa = class extends ce {
  constructor() {
    super("w:instrText"), this.root.push(new pt({ space: dt.PRESERVE })), this.root.push("SECTION");
  }
}, er = ({ fill: e, color: n, type: t }) => new we({
  name: "w:shd",
  attributes: {
    fill: {
      key: "w:fill",
      value: e === void 0 ? void 0 : ft(e)
    },
    color: {
      key: "w:color",
      value: n === void 0 ? void 0 : ft(n)
    },
    type: {
      key: "w:val",
      value: t
    }
  }
}), Fe = class extends ve {
  constructor(...e) {
    super(...e), ie(this, "xmlKeys", {
      id: "w:id",
      author: "w:author",
      date: "w:date"
    });
  }
}, Fa = class extends ce {
  constructor(e) {
    super("w:del"), this.root.push(new Fe({
      id: e.id,
      author: e.author,
      date: e.date
    }));
  }
}, Pa = class extends ce {
  constructor(e) {
    super("w:ins"), this.root.push(new Fe({
      id: e.id,
      author: e.author,
      date: e.date
    }));
  }
}, Da = {
  /** Dot emphasis mark */
  DOT: "dot"
}, Ba = (e = Da.DOT) => new we({
  name: "w:em",
  attributes: { val: {
    key: "w:val",
    value: e
  } }
}), La = class extends ce {
  constructor(e) {
    super("w:spacing"), this.root.push(new Re({ val: Ge(e) }));
  }
}, Ua = class extends ce {
  constructor(e) {
    super("w:color"), this.root.push(new Re({ val: ft(e) }));
  }
}, Ma = class extends ce {
  constructor(e) {
    super("w:highlight"), this.root.push(new Re({ val: e }));
  }
}, ja = class extends ce {
  constructor(e) {
    super("w:highlightCs"), this.root.push(new Re({ val: e }));
  }
}, za = (e) => new we({
  name: "w:lang",
  attributes: {
    value: {
      key: "w:val",
      value: e.value
    },
    eastAsia: {
      key: "w:eastAsia",
      value: e.eastAsia
    },
    bidirectional: {
      key: "w:bidi",
      value: e.bidirectional
    }
  }
}), or = (e, n) => {
  if (typeof e == "string") {
    const u = e;
    return new we({
      name: "w:rFonts",
      attributes: {
        ascii: {
          key: "w:ascii",
          value: u
        },
        cs: {
          key: "w:cs",
          value: u
        },
        eastAsia: {
          key: "w:eastAsia",
          value: u
        },
        hAnsi: {
          key: "w:hAnsi",
          value: u
        },
        hint: {
          key: "w:hint",
          value: n
        }
      }
    });
  }
  const t = e;
  return new we({
    name: "w:rFonts",
    attributes: {
      ascii: {
        key: "w:ascii",
        value: t.ascii
      },
      cs: {
        key: "w:cs",
        value: t.cs
      },
      eastAsia: {
        key: "w:eastAsia",
        value: t.eastAsia
      },
      hAnsi: {
        key: "w:hAnsi",
        value: t.hAnsi
      },
      hint: {
        key: "w:hint",
        value: t.hint
      }
    }
  });
}, Dn = (e) => new we({
  name: "w:vertAlign",
  attributes: { val: {
    key: "w:val",
    value: e
  } }
}), Wa = () => Dn("superscript"), Ha = () => Dn("subscript"), Bn = {
  /** Single underline */
  SINGLE: "single"
}, Ka = (e = Bn.SINGLE, n) => new we({
  name: "w:u",
  attributes: {
    val: {
      key: "w:val",
      value: e
    },
    color: {
      key: "w:color",
      value: n === void 0 ? void 0 : ft(n)
    }
  }
}), ot = class extends Xe {
  constructor(e) {
    if (super("w:rPr"), !e) return;
    if (e.style && this.push(new it("w:rStyle", e.style)), e.font && (typeof e.font == "string" ? this.push(or(e.font)) : "name" in e.font ? this.push(or(e.font.name, e.font.hint)) : this.push(or(e.font))), e.bold !== void 0 && this.push(new ue("w:b", e.bold)), e.boldComplexScript === void 0 && e.bold !== void 0 || e.boldComplexScript) {
      var n;
      this.push(new ue("w:bCs", (n = e.boldComplexScript) !== null && n !== void 0 ? n : e.bold));
    }
    if (e.italics !== void 0 && this.push(new ue("w:i", e.italics)), e.italicsComplexScript === void 0 && e.italics !== void 0 || e.italicsComplexScript) {
      var t;
      this.push(new ue("w:iCs", (t = e.italicsComplexScript) !== null && t !== void 0 ? t : e.italics));
    }
    e.smallCaps !== void 0 ? this.push(new ue("w:smallCaps", e.smallCaps)) : e.allCaps !== void 0 && this.push(new ue("w:caps", e.allCaps)), e.strike !== void 0 && this.push(new ue("w:strike", e.strike)), e.doubleStrike !== void 0 && this.push(new ue("w:dstrike", e.doubleStrike)), e.emboss !== void 0 && this.push(new ue("w:emboss", e.emboss)), e.imprint !== void 0 && this.push(new ue("w:imprint", e.imprint)), e.noProof !== void 0 && this.push(new ue("w:noProof", e.noProof)), e.snapToGrid !== void 0 && this.push(new ue("w:snapToGrid", e.snapToGrid)), e.vanish && this.push(new ue("w:vanish", e.vanish)), e.color && this.push(new Ua(e.color)), e.characterSpacing && this.push(new La(e.characterSpacing)), e.scale !== void 0 && this.push(new Ct("w:w", e.scale)), e.kern && this.push(new ar("w:kern", e.kern)), e.position && this.push(new it("w:position", e.position)), e.size !== void 0 && this.push(new ar("w:sz", e.size));
    const u = e.sizeComplexScript === void 0 || e.sizeComplexScript === !0 ? e.size : e.sizeComplexScript;
    u && this.push(new ar("w:szCs", u)), e.highlight && this.push(new Ma(e.highlight));
    const l = e.highlightComplexScript === void 0 || e.highlightComplexScript === !0 ? e.highlight : e.highlightComplexScript;
    l && this.push(new ja(l)), e.underline && this.push(Ka(e.underline.type, e.underline.color)), e.effect && this.push(new it("w:effect", e.effect)), e.border && this.push(be("w:bdr", e.border)), e.shading && this.push(er(e.shading)), e.subScript && this.push(Ha()), e.superScript && this.push(Wa()), e.rightToLeft !== void 0 && this.push(new ue("w:rtl", e.rightToLeft)), e.emphasisMark && this.push(Ba(e.emphasisMark.type)), e.language && this.push(za(e.language)), e.specVanish && this.push(new ue("w:specVanish", e.vanish)), e.math && this.push(new ue("w:oMath", e.math)), e.revision && this.push(new qa(e.revision));
  }
  push(e) {
    this.root.push(e);
  }
}, Ga = class extends ot {
  constructor(e) {
    super(e), e?.insertion && this.push(new Pa(e.insertion)), e?.deletion && this.push(new Fa(e.deletion));
  }
}, qa = class extends ce {
  constructor(e) {
    super("w:rPrChange"), this.root.push(new Fe({
      id: e.id,
      author: e.author,
      date: e.date
    })), this.addChildElement(new ot(e));
  }
}, Hr = class extends ce {
  constructor(e) {
    if (super("w:t"), typeof e == "string")
      this.root.push(new pt({ space: dt.PRESERVE })), this.root.push(e);
    else {
      var n;
      this.root.push(new pt({ space: (n = e.space) !== null && n !== void 0 ? n : dt.DEFAULT })), this.root.push(e.text);
    }
  }
}, Kt = {
  /** Inserts the current page number */
  CURRENT: "CURRENT",
  /** Inserts the total number of pages in the document */
  TOTAL_PAGES: "TOTAL_PAGES",
  /** Inserts the total number of pages in the current section */
  TOTAL_PAGES_IN_SECTION: "TOTAL_PAGES_IN_SECTION",
  /** Inserts the current section number */
  CURRENT_SECTION: "SECTION"
}, Ft = class extends ce {
  constructor(e) {
    if (super("w:r"), ie(this, "properties", void 0), this.properties = new ot(e), this.root.push(this.properties), e.break) for (let n = 0; n < e.break; n++) this.root.push(Ra());
    if (e.children) for (const n of e.children) {
      if (typeof n == "string") {
        switch (n) {
          case Kt.CURRENT:
            this.root.push(zt()), this.root.push(new Ca()), this.root.push(Wt()), this.root.push(Ht());
            break;
          case Kt.TOTAL_PAGES:
            this.root.push(zt()), this.root.push(new Ia()), this.root.push(Wt()), this.root.push(Ht());
            break;
          case Kt.TOTAL_PAGES_IN_SECTION:
            this.root.push(zt()), this.root.push(new Na()), this.root.push(Wt()), this.root.push(Ht());
            break;
          case Kt.CURRENT_SECTION:
            this.root.push(zt()), this.root.push(new Oa()), this.root.push(Wt()), this.root.push(Ht());
            break;
          default:
            this.root.push(new Hr(n));
            break;
        }
        continue;
      }
      this.root.push(n);
    }
    else e.text !== void 0 && this.root.push(new Hr(e.text));
  }
}, qe = class extends Ft {
  constructor(e) {
    super(typeof e == "string" ? { text: e } : e);
  }
}, Pt = /* @__PURE__ */ le(((e, n) => {
  n.exports = t;
  function t(u, l) {
    if (!u) throw new Error(l || "Assertion failed");
  }
  t.equal = function(l, o, s) {
    if (l != o) throw new Error(s || "Assertion failed: " + l + " != " + o);
  };
})), Me = /* @__PURE__ */ le(((e) => {
  var n = Pt();
  e.inherits = Ze();
  function t(O, W) {
    return (O.charCodeAt(W) & 64512) !== 55296 || W < 0 || W + 1 >= O.length ? !1 : (O.charCodeAt(W + 1) & 64512) === 56320;
  }
  function u(O, W) {
    if (Array.isArray(O)) return O.slice();
    if (!O) return [];
    var T = [];
    if (typeof O == "string")
      if (W) {
        if (W === "hex")
          for (O = O.replace(/[^a-z0-9]+/gi, ""), O.length % 2 !== 0 && (O = "0" + O), J = 0; J < O.length; J += 2) T.push(parseInt(O[J] + O[J + 1], 16));
      } else for (var H = 0, J = 0; J < O.length; J++) {
        var $ = O.charCodeAt(J);
        $ < 128 ? T[H++] = $ : $ < 2048 ? (T[H++] = $ >> 6 | 192, T[H++] = $ & 63 | 128) : t(O, J) ? ($ = 65536 + (($ & 1023) << 10) + (O.charCodeAt(++J) & 1023), T[H++] = $ >> 18 | 240, T[H++] = $ >> 12 & 63 | 128, T[H++] = $ >> 6 & 63 | 128, T[H++] = $ & 63 | 128) : (T[H++] = $ >> 12 | 224, T[H++] = $ >> 6 & 63 | 128, T[H++] = $ & 63 | 128);
      }
    else for (J = 0; J < O.length; J++) T[J] = O[J] | 0;
    return T;
  }
  e.toArray = u;
  function l(O) {
    for (var W = "", T = 0; T < O.length; T++) W += a(O[T].toString(16));
    return W;
  }
  e.toHex = l;
  function o(O) {
    return (O >>> 24 | O >>> 8 & 65280 | O << 8 & 16711680 | (O & 255) << 24) >>> 0;
  }
  e.htonl = o;
  function s(O, W) {
    for (var T = "", H = 0; H < O.length; H++) {
      var J = O[H];
      W === "little" && (J = o(J)), T += d(J.toString(16));
    }
    return T;
  }
  e.toHex32 = s;
  function a(O) {
    return O.length === 1 ? "0" + O : O;
  }
  e.zero2 = a;
  function d(O) {
    return O.length === 7 ? "0" + O : O.length === 6 ? "00" + O : O.length === 5 ? "000" + O : O.length === 4 ? "0000" + O : O.length === 3 ? "00000" + O : O.length === 2 ? "000000" + O : O.length === 1 ? "0000000" + O : O;
  }
  e.zero8 = d;
  function g(O, W, T, H) {
    var J = T - W;
    n(J % 4 === 0);
    for (var $ = new Array(J / 4), oe = 0, Z = W; oe < $.length; oe++, Z += 4) {
      var ee;
      H === "big" ? ee = O[Z] << 24 | O[Z + 1] << 16 | O[Z + 2] << 8 | O[Z + 3] : ee = O[Z + 3] << 24 | O[Z + 2] << 16 | O[Z + 1] << 8 | O[Z], $[oe] = ee >>> 0;
    }
    return $;
  }
  e.join32 = g;
  function v(O, W) {
    for (var T = new Array(O.length * 4), H = 0, J = 0; H < O.length; H++, J += 4) {
      var $ = O[H];
      W === "big" ? (T[J] = $ >>> 24, T[J + 1] = $ >>> 16 & 255, T[J + 2] = $ >>> 8 & 255, T[J + 3] = $ & 255) : (T[J + 3] = $ >>> 24, T[J + 2] = $ >>> 16 & 255, T[J + 1] = $ >>> 8 & 255, T[J] = $ & 255);
    }
    return T;
  }
  e.split32 = v;
  function b(O, W) {
    return O >>> W | O << 32 - W;
  }
  e.rotr32 = b;
  function R(O, W) {
    return O << W | O >>> 32 - W;
  }
  e.rotl32 = R;
  function m(O, W) {
    return O + W >>> 0;
  }
  e.sum32 = m;
  function w(O, W, T) {
    return O + W + T >>> 0;
  }
  e.sum32_3 = w;
  function y(O, W, T, H) {
    return O + W + T + H >>> 0;
  }
  e.sum32_4 = y;
  function k(O, W, T, H, J) {
    return O + W + T + H + J >>> 0;
  }
  e.sum32_5 = k;
  function N(O, W, T, H) {
    var J = O[W], $ = H + O[W + 1] >>> 0;
    O[W] = ($ < H ? 1 : 0) + T + J >>> 0, O[W + 1] = $;
  }
  e.sum64 = N;
  function _(O, W, T, H) {
    return (W + H >>> 0 < W ? 1 : 0) + O + T >>> 0;
  }
  e.sum64_hi = _;
  function x(O, W, T, H) {
    return W + H >>> 0;
  }
  e.sum64_lo = x;
  function A(O, W, T, H, J, $, oe, Z) {
    var ee = 0, V = W;
    return V = V + H >>> 0, ee += V < W ? 1 : 0, V = V + $ >>> 0, ee += V < $ ? 1 : 0, V = V + Z >>> 0, ee += V < Z ? 1 : 0, O + T + J + oe + ee >>> 0;
  }
  e.sum64_4_hi = A;
  function S(O, W, T, H, J, $, oe, Z) {
    return W + H + $ + Z >>> 0;
  }
  e.sum64_4_lo = S;
  function p(O, W, T, H, J, $, oe, Z, ee, V) {
    var P = 0, X = W;
    return X = X + H >>> 0, P += X < W ? 1 : 0, X = X + $ >>> 0, P += X < $ ? 1 : 0, X = X + Z >>> 0, P += X < Z ? 1 : 0, X = X + V >>> 0, P += X < V ? 1 : 0, O + T + J + oe + ee + P >>> 0;
  }
  e.sum64_5_hi = p;
  function F(O, W, T, H, J, $, oe, Z, ee, V) {
    return W + H + $ + Z + V >>> 0;
  }
  e.sum64_5_lo = F;
  function M(O, W, T) {
    return (W << 32 - T | O >>> T) >>> 0;
  }
  e.rotr64_hi = M;
  function I(O, W, T) {
    return (O << 32 - T | W >>> T) >>> 0;
  }
  e.rotr64_lo = I;
  function q(O, W, T) {
    return O >>> T;
  }
  e.shr64_hi = q;
  function Q(O, W, T) {
    return (O << 32 - T | W >>> T) >>> 0;
  }
  e.shr64_lo = Q;
})), Dt = /* @__PURE__ */ le(((e) => {
  var n = Me(), t = Pt();
  function u() {
    this.pending = null, this.pendingTotal = 0, this.blockSize = this.constructor.blockSize, this.outSize = this.constructor.outSize, this.hmacStrength = this.constructor.hmacStrength, this.padLength = this.constructor.padLength / 8, this.endian = "big", this._delta8 = this.blockSize / 8, this._delta32 = this.blockSize / 32;
  }
  e.BlockHash = u, u.prototype.update = function(o, s) {
    if (o = n.toArray(o, s), this.pending ? this.pending = this.pending.concat(o) : this.pending = o, this.pendingTotal += o.length, this.pending.length >= this._delta8) {
      o = this.pending;
      var a = o.length % this._delta8;
      this.pending = o.slice(o.length - a, o.length), this.pending.length === 0 && (this.pending = null), o = n.join32(o, 0, o.length - a, this.endian);
      for (var d = 0; d < o.length; d += this._delta32) this._update(o, d, d + this._delta32);
    }
    return this;
  }, u.prototype.digest = function(o) {
    return this.update(this._pad()), t(this.pending === null), this._digest(o);
  }, u.prototype._pad = function() {
    var o = this.pendingTotal, s = this._delta8, a = s - (o + this.padLength) % s, d = new Array(a + this.padLength);
    d[0] = 128;
    for (var g = 1; g < a; g++) d[g] = 0;
    if (o <<= 3, this.endian === "big") {
      for (var v = 8; v < this.padLength; v++) d[g++] = 0;
      d[g++] = 0, d[g++] = 0, d[g++] = 0, d[g++] = 0, d[g++] = o >>> 24 & 255, d[g++] = o >>> 16 & 255, d[g++] = o >>> 8 & 255, d[g++] = o & 255;
    } else
      for (d[g++] = o & 255, d[g++] = o >>> 8 & 255, d[g++] = o >>> 16 & 255, d[g++] = o >>> 24 & 255, d[g++] = 0, d[g++] = 0, d[g++] = 0, d[g++] = 0, v = 8; v < this.padLength; v++) d[g++] = 0;
    return d;
  };
})), Ln = /* @__PURE__ */ le(((e) => {
  var n = Me().rotr32;
  function t(v, b, R, m) {
    if (v === 0) return u(b, R, m);
    if (v === 1 || v === 3) return o(b, R, m);
    if (v === 2) return l(b, R, m);
  }
  e.ft_1 = t;
  function u(v, b, R) {
    return v & b ^ ~v & R;
  }
  e.ch32 = u;
  function l(v, b, R) {
    return v & b ^ v & R ^ b & R;
  }
  e.maj32 = l;
  function o(v, b, R) {
    return v ^ b ^ R;
  }
  e.p32 = o;
  function s(v) {
    return n(v, 2) ^ n(v, 13) ^ n(v, 22);
  }
  e.s0_256 = s;
  function a(v) {
    return n(v, 6) ^ n(v, 11) ^ n(v, 25);
  }
  e.s1_256 = a;
  function d(v) {
    return n(v, 7) ^ n(v, 18) ^ v >>> 3;
  }
  e.g0_256 = d;
  function g(v) {
    return n(v, 17) ^ n(v, 19) ^ v >>> 10;
  }
  e.g1_256 = g;
})), Va = /* @__PURE__ */ le(((e, n) => {
  var t = Me(), u = Dt(), l = Ln(), o = t.rotl32, s = t.sum32, a = t.sum32_5, d = l.ft_1, g = u.BlockHash, v = [
    1518500249,
    1859775393,
    2400959708,
    3395469782
  ];
  function b() {
    if (!(this instanceof b)) return new b();
    g.call(this), this.h = [
      1732584193,
      4023233417,
      2562383102,
      271733878,
      3285377520
    ], this.W = new Array(80);
  }
  t.inherits(b, g), n.exports = b, b.blockSize = 512, b.outSize = 160, b.hmacStrength = 80, b.padLength = 64, b.prototype._update = function(m, w) {
    for (var y = this.W, k = 0; k < 16; k++) y[k] = m[w + k];
    for (; k < y.length; k++) y[k] = o(y[k - 3] ^ y[k - 8] ^ y[k - 14] ^ y[k - 16], 1);
    var N = this.h[0], _ = this.h[1], x = this.h[2], A = this.h[3], S = this.h[4];
    for (k = 0; k < y.length; k++) {
      var p = ~~(k / 20), F = a(o(N, 5), d(p, _, x, A), S, y[k], v[p]);
      S = A, A = x, x = o(_, 30), _ = N, N = F;
    }
    this.h[0] = s(this.h[0], N), this.h[1] = s(this.h[1], _), this.h[2] = s(this.h[2], x), this.h[3] = s(this.h[3], A), this.h[4] = s(this.h[4], S);
  }, b.prototype._digest = function(m) {
    return m === "hex" ? t.toHex32(this.h, "big") : t.split32(this.h, "big");
  };
})), Un = /* @__PURE__ */ le(((e, n) => {
  var t = Me(), u = Dt(), l = Ln(), o = Pt(), s = t.sum32, a = t.sum32_4, d = t.sum32_5, g = l.ch32, v = l.maj32, b = l.s0_256, R = l.s1_256, m = l.g0_256, w = l.g1_256, y = u.BlockHash, k = [
    1116352408,
    1899447441,
    3049323471,
    3921009573,
    961987163,
    1508970993,
    2453635748,
    2870763221,
    3624381080,
    310598401,
    607225278,
    1426881987,
    1925078388,
    2162078206,
    2614888103,
    3248222580,
    3835390401,
    4022224774,
    264347078,
    604807628,
    770255983,
    1249150122,
    1555081692,
    1996064986,
    2554220882,
    2821834349,
    2952996808,
    3210313671,
    3336571891,
    3584528711,
    113926993,
    338241895,
    666307205,
    773529912,
    1294757372,
    1396182291,
    1695183700,
    1986661051,
    2177026350,
    2456956037,
    2730485921,
    2820302411,
    3259730800,
    3345764771,
    3516065817,
    3600352804,
    4094571909,
    275423344,
    430227734,
    506948616,
    659060556,
    883997877,
    958139571,
    1322822218,
    1537002063,
    1747873779,
    1955562222,
    2024104815,
    2227730452,
    2361852424,
    2428436474,
    2756734187,
    3204031479,
    3329325298
  ];
  function N() {
    if (!(this instanceof N)) return new N();
    y.call(this), this.h = [
      1779033703,
      3144134277,
      1013904242,
      2773480762,
      1359893119,
      2600822924,
      528734635,
      1541459225
    ], this.k = k, this.W = new Array(64);
  }
  t.inherits(N, y), n.exports = N, N.blockSize = 512, N.outSize = 256, N.hmacStrength = 192, N.padLength = 64, N.prototype._update = function(x, A) {
    for (var S = this.W, p = 0; p < 16; p++) S[p] = x[A + p];
    for (; p < S.length; p++) S[p] = a(w(S[p - 2]), S[p - 7], m(S[p - 15]), S[p - 16]);
    var F = this.h[0], M = this.h[1], I = this.h[2], q = this.h[3], Q = this.h[4], O = this.h[5], W = this.h[6], T = this.h[7];
    for (o(this.k.length === S.length), p = 0; p < S.length; p++) {
      var H = d(T, R(Q), g(Q, O, W), this.k[p], S[p]), J = s(b(F), v(F, M, I));
      T = W, W = O, O = Q, Q = s(q, H), q = I, I = M, M = F, F = s(H, J);
    }
    this.h[0] = s(this.h[0], F), this.h[1] = s(this.h[1], M), this.h[2] = s(this.h[2], I), this.h[3] = s(this.h[3], q), this.h[4] = s(this.h[4], Q), this.h[5] = s(this.h[5], O), this.h[6] = s(this.h[6], W), this.h[7] = s(this.h[7], T);
  }, N.prototype._digest = function(x) {
    return x === "hex" ? t.toHex32(this.h, "big") : t.split32(this.h, "big");
  };
})), $a = /* @__PURE__ */ le(((e, n) => {
  var t = Me(), u = Un();
  function l() {
    if (!(this instanceof l)) return new l();
    u.call(this), this.h = [
      3238371032,
      914150663,
      812702999,
      4144912697,
      4290775857,
      1750603025,
      1694076839,
      3204075428
    ];
  }
  t.inherits(l, u), n.exports = l, l.blockSize = 512, l.outSize = 224, l.hmacStrength = 192, l.padLength = 64, l.prototype._digest = function(s) {
    return s === "hex" ? t.toHex32(this.h.slice(0, 7), "big") : t.split32(this.h.slice(0, 7), "big");
  };
})), Mn = /* @__PURE__ */ le(((e, n) => {
  var t = Me(), u = Dt(), l = Pt(), o = t.rotr64_hi, s = t.rotr64_lo, a = t.shr64_hi, d = t.shr64_lo, g = t.sum64, v = t.sum64_hi, b = t.sum64_lo, R = t.sum64_4_hi, m = t.sum64_4_lo, w = t.sum64_5_hi, y = t.sum64_5_lo, k = u.BlockHash, N = [
    1116352408,
    3609767458,
    1899447441,
    602891725,
    3049323471,
    3964484399,
    3921009573,
    2173295548,
    961987163,
    4081628472,
    1508970993,
    3053834265,
    2453635748,
    2937671579,
    2870763221,
    3664609560,
    3624381080,
    2734883394,
    310598401,
    1164996542,
    607225278,
    1323610764,
    1426881987,
    3590304994,
    1925078388,
    4068182383,
    2162078206,
    991336113,
    2614888103,
    633803317,
    3248222580,
    3479774868,
    3835390401,
    2666613458,
    4022224774,
    944711139,
    264347078,
    2341262773,
    604807628,
    2007800933,
    770255983,
    1495990901,
    1249150122,
    1856431235,
    1555081692,
    3175218132,
    1996064986,
    2198950837,
    2554220882,
    3999719339,
    2821834349,
    766784016,
    2952996808,
    2566594879,
    3210313671,
    3203337956,
    3336571891,
    1034457026,
    3584528711,
    2466948901,
    113926993,
    3758326383,
    338241895,
    168717936,
    666307205,
    1188179964,
    773529912,
    1546045734,
    1294757372,
    1522805485,
    1396182291,
    2643833823,
    1695183700,
    2343527390,
    1986661051,
    1014477480,
    2177026350,
    1206759142,
    2456956037,
    344077627,
    2730485921,
    1290863460,
    2820302411,
    3158454273,
    3259730800,
    3505952657,
    3345764771,
    106217008,
    3516065817,
    3606008344,
    3600352804,
    1432725776,
    4094571909,
    1467031594,
    275423344,
    851169720,
    430227734,
    3100823752,
    506948616,
    1363258195,
    659060556,
    3750685593,
    883997877,
    3785050280,
    958139571,
    3318307427,
    1322822218,
    3812723403,
    1537002063,
    2003034995,
    1747873779,
    3602036899,
    1955562222,
    1575990012,
    2024104815,
    1125592928,
    2227730452,
    2716904306,
    2361852424,
    442776044,
    2428436474,
    593698344,
    2756734187,
    3733110249,
    3204031479,
    2999351573,
    3329325298,
    3815920427,
    3391569614,
    3928383900,
    3515267271,
    566280711,
    3940187606,
    3454069534,
    4118630271,
    4000239992,
    116418474,
    1914138554,
    174292421,
    2731055270,
    289380356,
    3203993006,
    460393269,
    320620315,
    685471733,
    587496836,
    852142971,
    1086792851,
    1017036298,
    365543100,
    1126000580,
    2618297676,
    1288033470,
    3409855158,
    1501505948,
    4234509866,
    1607167915,
    987167468,
    1816402316,
    1246189591
  ];
  function _() {
    if (!(this instanceof _)) return new _();
    k.call(this), this.h = [
      1779033703,
      4089235720,
      3144134277,
      2227873595,
      1013904242,
      4271175723,
      2773480762,
      1595750129,
      1359893119,
      2917565137,
      2600822924,
      725511199,
      528734635,
      4215389547,
      1541459225,
      327033209
    ], this.k = N, this.W = new Array(160);
  }
  t.inherits(_, k), n.exports = _, _.blockSize = 1024, _.outSize = 512, _.hmacStrength = 192, _.padLength = 128, _.prototype._prepareBlock = function(J, $) {
    for (var oe = this.W, Z = 0; Z < 32; Z++) oe[Z] = J[$ + Z];
    for (; Z < oe.length; Z += 2) {
      var ee = W(oe[Z - 4], oe[Z - 3]), V = T(oe[Z - 4], oe[Z - 3]), P = oe[Z - 14], X = oe[Z - 13], Y = Q(oe[Z - 30], oe[Z - 29]), te = O(oe[Z - 30], oe[Z - 29]), fe = oe[Z - 32], E = oe[Z - 31];
      oe[Z] = R(ee, V, P, X, Y, te, fe, E), oe[Z + 1] = m(ee, V, P, X, Y, te, fe, E);
    }
  }, _.prototype._update = function(J, $) {
    this._prepareBlock(J, $);
    var oe = this.W, Z = this.h[0], ee = this.h[1], V = this.h[2], P = this.h[3], X = this.h[4], Y = this.h[5], te = this.h[6], fe = this.h[7], E = this.h[8], h = this.h[9], j = this.h[10], U = this.h[11], re = this.h[12], D = this.h[13], B = this.h[14], c = this.h[15];
    l(this.k.length === oe.length);
    for (var G = 0; G < oe.length; G += 2) {
      var C = B, r = c, i = I(E, h), f = q(E, h), L = x(E, h, j, U, re), K = A(E, h, j, U, re, D), z = this.k[G], ne = this.k[G + 1], se = oe[G], ae = oe[G + 1], he = w(C, r, i, f, L, K, z, ne, se, ae), de = y(C, r, i, f, L, K, z, ne, se, ae);
      C = F(Z, ee), r = M(Z, ee), i = S(Z, ee, V, P, X), f = p(Z, ee, V, P, X, Y);
      var me = v(C, r, i, f), Ee = b(C, r, i, f);
      B = re, c = D, re = j, D = U, j = E, U = h, E = v(te, fe, he, de), h = b(fe, fe, he, de), te = X, fe = Y, X = V, Y = P, V = Z, P = ee, Z = v(he, de, me, Ee), ee = b(he, de, me, Ee);
    }
    g(this.h, 0, Z, ee), g(this.h, 2, V, P), g(this.h, 4, X, Y), g(this.h, 6, te, fe), g(this.h, 8, E, h), g(this.h, 10, j, U), g(this.h, 12, re, D), g(this.h, 14, B, c);
  }, _.prototype._digest = function(J) {
    return J === "hex" ? t.toHex32(this.h, "big") : t.split32(this.h, "big");
  };
  function x(H, J, $, oe, Z) {
    var ee = H & $ ^ ~H & Z;
    return ee < 0 && (ee += 4294967296), ee;
  }
  function A(H, J, $, oe, Z, ee) {
    var V = J & oe ^ ~J & ee;
    return V < 0 && (V += 4294967296), V;
  }
  function S(H, J, $, oe, Z) {
    var ee = H & $ ^ H & Z ^ $ & Z;
    return ee < 0 && (ee += 4294967296), ee;
  }
  function p(H, J, $, oe, Z, ee) {
    var V = J & oe ^ J & ee ^ oe & ee;
    return V < 0 && (V += 4294967296), V;
  }
  function F(H, J) {
    var $ = o(H, J, 28), oe = o(J, H, 2), Z = o(J, H, 7), ee = $ ^ oe ^ Z;
    return ee < 0 && (ee += 4294967296), ee;
  }
  function M(H, J) {
    var $ = s(H, J, 28), oe = s(J, H, 2), Z = s(J, H, 7), ee = $ ^ oe ^ Z;
    return ee < 0 && (ee += 4294967296), ee;
  }
  function I(H, J) {
    var $ = o(H, J, 14), oe = o(H, J, 18), Z = o(J, H, 9), ee = $ ^ oe ^ Z;
    return ee < 0 && (ee += 4294967296), ee;
  }
  function q(H, J) {
    var $ = s(H, J, 14), oe = s(H, J, 18), Z = s(J, H, 9), ee = $ ^ oe ^ Z;
    return ee < 0 && (ee += 4294967296), ee;
  }
  function Q(H, J) {
    var $ = o(H, J, 1), oe = o(H, J, 8), Z = a(H, J, 7), ee = $ ^ oe ^ Z;
    return ee < 0 && (ee += 4294967296), ee;
  }
  function O(H, J) {
    var $ = s(H, J, 1), oe = s(H, J, 8), Z = d(H, J, 7), ee = $ ^ oe ^ Z;
    return ee < 0 && (ee += 4294967296), ee;
  }
  function W(H, J) {
    var $ = o(H, J, 19), oe = o(J, H, 29), Z = a(H, J, 6), ee = $ ^ oe ^ Z;
    return ee < 0 && (ee += 4294967296), ee;
  }
  function T(H, J) {
    var $ = s(H, J, 19), oe = s(J, H, 29), Z = d(H, J, 6), ee = $ ^ oe ^ Z;
    return ee < 0 && (ee += 4294967296), ee;
  }
})), Xa = /* @__PURE__ */ le(((e, n) => {
  var t = Me(), u = Mn();
  function l() {
    if (!(this instanceof l)) return new l();
    u.call(this), this.h = [
      3418070365,
      3238371032,
      1654270250,
      914150663,
      2438529370,
      812702999,
      355462360,
      4144912697,
      1731405415,
      4290775857,
      2394180231,
      1750603025,
      3675008525,
      1694076839,
      1203062813,
      3204075428
    ];
  }
  t.inherits(l, u), n.exports = l, l.blockSize = 1024, l.outSize = 384, l.hmacStrength = 192, l.padLength = 128, l.prototype._digest = function(s) {
    return s === "hex" ? t.toHex32(this.h.slice(0, 12), "big") : t.split32(this.h.slice(0, 12), "big");
  };
})), Za = /* @__PURE__ */ le(((e) => {
  e.sha1 = Va(), e.sha224 = $a(), e.sha256 = Un(), e.sha384 = Xa(), e.sha512 = Mn();
})), Ya = /* @__PURE__ */ le(((e) => {
  var n = Me(), t = Dt(), u = n.rotl32, l = n.sum32, o = n.sum32_3, s = n.sum32_4, a = t.BlockHash;
  function d() {
    if (!(this instanceof d)) return new d();
    a.call(this), this.h = [
      1732584193,
      4023233417,
      2562383102,
      271733878,
      3285377520
    ], this.endian = "little";
  }
  n.inherits(d, a), e.ripemd160 = d, d.blockSize = 512, d.outSize = 160, d.hmacStrength = 192, d.padLength = 64, d.prototype._update = function(N, _) {
    for (var x = this.h[0], A = this.h[1], S = this.h[2], p = this.h[3], F = this.h[4], M = x, I = A, q = S, Q = p, O = F, W = 0; W < 80; W++) {
      var T = l(u(s(x, g(W, A, S, p), N[R[W] + _], v(W)), w[W]), F);
      x = F, F = p, p = u(S, 10), S = A, A = T, T = l(u(s(M, g(79 - W, I, q, Q), N[m[W] + _], b(W)), y[W]), O), M = O, O = Q, Q = u(q, 10), q = I, I = T;
    }
    T = o(this.h[1], S, Q), this.h[1] = o(this.h[2], p, O), this.h[2] = o(this.h[3], F, M), this.h[3] = o(this.h[4], x, I), this.h[4] = o(this.h[0], A, q), this.h[0] = T;
  }, d.prototype._digest = function(N) {
    return N === "hex" ? n.toHex32(this.h, "little") : n.split32(this.h, "little");
  };
  function g(k, N, _, x) {
    return k <= 15 ? N ^ _ ^ x : k <= 31 ? N & _ | ~N & x : k <= 47 ? (N | ~_) ^ x : k <= 63 ? N & x | _ & ~x : N ^ (_ | ~x);
  }
  function v(k) {
    return k <= 15 ? 0 : k <= 31 ? 1518500249 : k <= 47 ? 1859775393 : k <= 63 ? 2400959708 : 2840853838;
  }
  function b(k) {
    return k <= 15 ? 1352829926 : k <= 31 ? 1548603684 : k <= 47 ? 1836072691 : k <= 63 ? 2053994217 : 0;
  }
  var R = [
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    7,
    4,
    13,
    1,
    10,
    6,
    15,
    3,
    12,
    0,
    9,
    5,
    2,
    14,
    11,
    8,
    3,
    10,
    14,
    4,
    9,
    15,
    8,
    1,
    2,
    7,
    0,
    6,
    13,
    11,
    5,
    12,
    1,
    9,
    11,
    10,
    0,
    8,
    12,
    4,
    13,
    3,
    7,
    15,
    14,
    5,
    6,
    2,
    4,
    0,
    5,
    9,
    7,
    12,
    2,
    10,
    14,
    1,
    3,
    8,
    11,
    6,
    15,
    13
  ], m = [
    5,
    14,
    7,
    0,
    9,
    2,
    11,
    4,
    13,
    6,
    15,
    8,
    1,
    10,
    3,
    12,
    6,
    11,
    3,
    7,
    0,
    13,
    5,
    10,
    14,
    15,
    8,
    12,
    4,
    9,
    1,
    2,
    15,
    5,
    1,
    3,
    7,
    14,
    6,
    9,
    11,
    8,
    12,
    2,
    10,
    0,
    4,
    13,
    8,
    6,
    4,
    1,
    3,
    11,
    15,
    0,
    5,
    12,
    2,
    13,
    9,
    7,
    10,
    14,
    12,
    15,
    10,
    4,
    1,
    5,
    8,
    7,
    6,
    2,
    13,
    14,
    0,
    3,
    9,
    11
  ], w = [
    11,
    14,
    15,
    12,
    5,
    8,
    7,
    9,
    11,
    13,
    14,
    15,
    6,
    7,
    9,
    8,
    7,
    6,
    8,
    13,
    11,
    9,
    7,
    15,
    7,
    12,
    15,
    9,
    11,
    7,
    13,
    12,
    11,
    13,
    6,
    7,
    14,
    9,
    13,
    15,
    14,
    8,
    13,
    6,
    5,
    12,
    7,
    5,
    11,
    12,
    14,
    15,
    14,
    15,
    9,
    8,
    9,
    14,
    5,
    6,
    8,
    6,
    5,
    12,
    9,
    15,
    5,
    11,
    6,
    8,
    13,
    12,
    5,
    12,
    13,
    14,
    11,
    8,
    5,
    6
  ], y = [
    8,
    9,
    9,
    11,
    13,
    15,
    15,
    5,
    7,
    7,
    8,
    11,
    14,
    14,
    12,
    6,
    9,
    13,
    15,
    7,
    12,
    8,
    9,
    11,
    7,
    7,
    12,
    7,
    6,
    15,
    13,
    11,
    9,
    7,
    15,
    11,
    8,
    6,
    6,
    14,
    12,
    13,
    5,
    14,
    13,
    13,
    7,
    5,
    15,
    5,
    8,
    11,
    14,
    14,
    6,
    14,
    6,
    9,
    12,
    9,
    12,
    5,
    15,
    8,
    8,
    5,
    12,
    9,
    12,
    5,
    14,
    6,
    8,
    13,
    6,
    5,
    15,
    13,
    11,
    11
  ];
})), Ja = /* @__PURE__ */ le(((e, n) => {
  var t = Me(), u = Pt();
  function l(o, s, a) {
    if (!(this instanceof l)) return new l(o, s, a);
    this.Hash = o, this.blockSize = o.blockSize / 8, this.outSize = o.outSize / 8, this.inner = null, this.outer = null, this._init(t.toArray(s, a));
  }
  n.exports = l, l.prototype._init = function(s) {
    s.length > this.blockSize && (s = new this.Hash().update(s).digest()), u(s.length <= this.blockSize);
    for (var a = s.length; a < this.blockSize; a++) s.push(0);
    for (a = 0; a < s.length; a++) s[a] ^= 54;
    for (this.inner = new this.Hash().update(s), a = 0; a < s.length; a++) s[a] ^= 106;
    this.outer = new this.Hash().update(s);
  }, l.prototype.update = function(s, a) {
    return this.inner.update(s, a), this;
  }, l.prototype.digest = function(s) {
    return this.outer.update(this.inner.digest()), this.outer.digest(s);
  };
}));
(/* @__PURE__ */ le(((e) => {
  var n = e;
  n.utils = Me(), n.common = Dt(), n.sha = Za(), n.ripemd = Ya(), n.hmac = Ja(), n.sha1 = n.sha.sha1, n.sha256 = n.sha.sha256, n.sha224 = n.sha.sha224, n.sha384 = n.sha.sha384, n.sha512 = n.sha.sha512, n.ripemd160 = n.ripemd.ripemd160;
})))();
var Qa = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict", eo = (e, n = 21) => (t = n) => {
  let u = "", l = t | 0;
  for (; l--; ) u += e[Math.random() * e.length | 0];
  return u;
}, to = (e = 21) => {
  let n = "", t = e | 0;
  for (; t--; ) n += Qa[Math.random() * 64 | 0];
  return n;
}, Pe = (e) => Math.floor(e * 72 * 20), Pr = (e = 0) => {
  let n = e;
  return () => ++n;
}, ro = () => Pr(), no = () => Pr(1), io = () => Pr(), ao = () => to().toLowerCase(), St = (e) => eo("1234567890abcdef", e)(), oo = () => `${St(8)}-${St(4)}-${St(4)}-${St(4)}-${St(12)}`, sr = (e) => new Uint8Array(new TextEncoder().encode(e)), so = class extends ve {
  constructor(...e) {
    super(...e), ie(this, "xmlKeys", { xmlns: "xmlns" });
  }
}, uo = {
  /** Target is external to the package (e.g., hyperlink to a URL) */
  EXTERNAL: "External"
}, lo = (e, n, t, u) => new we({
  name: "Relationship",
  attributes: {
    id: {
      key: "Id",
      value: e
    },
    type: {
      key: "Type",
      value: n
    },
    target: {
      key: "Target",
      value: t
    },
    targetMode: {
      key: "TargetMode",
      value: u
    }
  }
}), Je = class extends ce {
  constructor() {
    super("Relationships"), this.root.push(new so({ xmlns: "http://schemas.openxmlformats.org/package/2006/relationships" }));
  }
  /**
  * Creates a new relationship to another part in the package.
  *
  * @param id - Unique identifier for this relationship (will be prefixed with "rId")
  * @param type - Relationship type URI (e.g., image, header, hyperlink)
  * @param target - Path to the target part
  * @param targetMode - Optional mode indicating if target is external
  */
  addRelationship(e, n, t, u) {
    this.root.push(lo(`rId${e}`, n, t, u));
  }
  /**
  * Gets the count of relationships in this collection.
  * Excludes the attributes element from the count.
  */
  get RelationshipCount() {
    return this.root.length - 1;
  }
}, co = class extends ve {
  constructor(...e) {
    super(...e), ie(this, "xmlKeys", {
      id: "w:id",
      initials: "w:initials",
      author: "w:author",
      date: "w:date"
    });
  }
}, ho = class extends ve {
  constructor(...e) {
    super(...e), ie(this, "xmlKeys", {
      "xmlns:cx": "xmlns:cx",
      "xmlns:cx1": "xmlns:cx1",
      "xmlns:cx2": "xmlns:cx2",
      "xmlns:cx3": "xmlns:cx3",
      "xmlns:cx4": "xmlns:cx4",
      "xmlns:cx5": "xmlns:cx5",
      "xmlns:cx6": "xmlns:cx6",
      "xmlns:cx7": "xmlns:cx7",
      "xmlns:cx8": "xmlns:cx8",
      "xmlns:mc": "xmlns:mc",
      "xmlns:aink": "xmlns:aink",
      "xmlns:am3d": "xmlns:am3d",
      "xmlns:o": "xmlns:o",
      "xmlns:r": "xmlns:r",
      "xmlns:m": "xmlns:m",
      "xmlns:v": "xmlns:v",
      "xmlns:wp14": "xmlns:wp14",
      "xmlns:wp": "xmlns:wp",
      "xmlns:w10": "xmlns:w10",
      "xmlns:w": "xmlns:w",
      "xmlns:w14": "xmlns:w14",
      "xmlns:w15": "xmlns:w15",
      "xmlns:w16cex": "xmlns:w16cex",
      "xmlns:w16cid": "xmlns:w16cid",
      "xmlns:w16": "xmlns:w16",
      "xmlns:w16sdtdh": "xmlns:w16sdtdh",
      "xmlns:w16se": "xmlns:w16se",
      "xmlns:wpg": "xmlns:wpg",
      "xmlns:wpi": "xmlns:wpi",
      "xmlns:wne": "xmlns:wne",
      "xmlns:wps": "xmlns:wps"
    });
  }
}, Kr = class extends ce {
  constructor({ id: e, initials: n, author: t, date: u = /* @__PURE__ */ new Date(), children: l }, o) {
    super("w:comment"), ie(this, "paraId", void 0), this.paraId = o, this.root.push(new co({
      id: e,
      initials: n,
      author: t,
      date: u.toISOString()
    }));
    for (const s of l) this.root.push(s);
  }
  /**
  * Serializes this comment to XML, injecting w14:paraId and w14:textId into the last
  * paragraph when threading is active. These attributes link the comment to its
  * corresponding w15:commentEx entry in commentsExtended.xml.
  */
  prepForXml(e) {
    const n = super.prepForXml(e);
    if (!n || !this.paraId) return n;
    const t = n["w:comment"];
    if (!Array.isArray(t)) return n;
    for (let u = t.length - 1; u >= 0; u--) {
      const l = t[u];
      if (l && typeof l == "object" && "w:p" in l) {
        const o = l["w:p"];
        Array.isArray(o) && o.unshift({ _attr: {
          "w14:paraId": this.paraId,
          "w14:textId": this.paraId
        } });
        break;
      }
    }
    return n;
  }
}, fo = (e) => (e + 1).toString(16).toUpperCase().padStart(8, "0"), po = class extends ce {
  constructor({ children: e }) {
    if (super("w:comments"), ie(this, "relationships", void 0), ie(this, "threadData", void 0), this.root.push(new ho({
      "xmlns:cx": "http://schemas.microsoft.com/office/drawing/2014/chartex",
      "xmlns:cx1": "http://schemas.microsoft.com/office/drawing/2015/9/8/chartex",
      "xmlns:cx2": "http://schemas.microsoft.com/office/drawing/2015/10/21/chartex",
      "xmlns:cx3": "http://schemas.microsoft.com/office/drawing/2016/5/9/chartex",
      "xmlns:cx4": "http://schemas.microsoft.com/office/drawing/2016/5/10/chartex",
      "xmlns:cx5": "http://schemas.microsoft.com/office/drawing/2016/5/11/chartex",
      "xmlns:cx6": "http://schemas.microsoft.com/office/drawing/2016/5/12/chartex",
      "xmlns:cx7": "http://schemas.microsoft.com/office/drawing/2016/5/13/chartex",
      "xmlns:cx8": "http://schemas.microsoft.com/office/drawing/2016/5/14/chartex",
      "xmlns:mc": "http://schemas.openxmlformats.org/markup-compatibility/2006",
      "xmlns:aink": "http://schemas.microsoft.com/office/drawing/2016/ink",
      "xmlns:am3d": "http://schemas.microsoft.com/office/drawing/2017/model3d",
      "xmlns:o": "urn:schemas-microsoft-com:office:office",
      "xmlns:r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
      "xmlns:m": "http://schemas.openxmlformats.org/officeDocument/2006/math",
      "xmlns:v": "urn:schemas-microsoft-com:vml",
      "xmlns:wp14": "http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing",
      "xmlns:wp": "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
      "xmlns:w10": "urn:schemas-microsoft-com:office:word",
      "xmlns:w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
      "xmlns:w14": "http://schemas.microsoft.com/office/word/2010/wordml",
      "xmlns:w15": "http://schemas.microsoft.com/office/word/2012/wordml",
      "xmlns:w16cex": "http://schemas.microsoft.com/office/word/2018/wordml/cex",
      "xmlns:w16cid": "http://schemas.microsoft.com/office/word/2016/wordml/cid",
      "xmlns:w16": "http://schemas.microsoft.com/office/word/2018/wordml",
      "xmlns:w16sdtdh": "http://schemas.microsoft.com/office/word/2020/wordml/sdtdatahash",
      "xmlns:w16se": "http://schemas.microsoft.com/office/word/2015/wordml/symex",
      "xmlns:wpg": "http://schemas.microsoft.com/office/word/2010/wordprocessingGroup",
      "xmlns:wpi": "http://schemas.microsoft.com/office/word/2010/wordprocessingInk",
      "xmlns:wne": "http://schemas.microsoft.com/office/word/2006/wordml",
      "xmlns:wps": "http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
    })), e.some((n) => n.parentId !== void 0)) {
      const n = new Map(e.map((t) => [t.id, fo(t.id)]));
      for (const t of e) this.root.push(new Kr(t, n.get(t.id)));
      this.threadData = e.map((t) => ({
        paraId: n.get(t.id),
        parentParaId: t.parentId !== void 0 ? n.get(t.parentId) : void 0,
        done: t.resolved
      }));
    } else for (const n of e) this.root.push(new Kr(n));
    this.relationships = new Je();
  }
  get Relationships() {
    return this.relationships;
  }
  /** Thread data for commentsExtended.xml, or undefined when no comments use parentId. */
  get ThreadData() {
    return this.threadData;
  }
}, mo = class extends ve {
  constructor(...e) {
    super(...e), ie(this, "xmlKeys", {
      "xmlns:wpc": "xmlns:wpc",
      "xmlns:mc": "xmlns:mc",
      "xmlns:w15": "xmlns:w15",
      "mc:Ignorable": "mc:Ignorable"
    });
  }
}, wo = class extends ve {
  constructor(...e) {
    super(...e), ie(this, "xmlKeys", {
      paraId: "w15:paraId",
      paraIdParent: "w15:paraIdParent",
      done: "w15:done"
    });
  }
}, go = class extends ce {
  constructor(e) {
    super("w15:commentEx"), this.root.push(new wo({
      paraId: e.paraId,
      paraIdParent: e.parentParaId,
      done: e.done !== void 0 ? e.done ? "1" : "0" : void 0
    }));
  }
}, vo = class extends ce {
  constructor(e) {
    super("w15:commentsEx"), this.root.push(new mo({
      "xmlns:wpc": "http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas",
      "xmlns:mc": "http://schemas.openxmlformats.org/markup-compatibility/2006",
      "xmlns:w15": "http://schemas.microsoft.com/office/word/2012/wordml",
      "mc:Ignorable": "w15"
    }));
    for (const n of e) this.root.push(new go(n));
  }
}, yo = class extends Sa {
  constructor() {
    super("w:endnoteRef");
  }
}, bo = class extends ce {
  constructor() {
    super("w:pageBreakBefore");
  }
}, mt = {
  /** Line spacing is automatically determined based on content */
  AUTO: "auto"
}, _o = ({ after: e, before: n, line: t, lineRule: u, beforeAutoSpacing: l, afterAutoSpacing: o }) => new we({
  name: "w:spacing",
  attributes: {
    after: {
      key: "w:after",
      value: e
    },
    before: {
      key: "w:before",
      value: n
    },
    line: {
      key: "w:line",
      value: t
    },
    lineRule: {
      key: "w:lineRule",
      value: u
    },
    beforeAutoSpacing: {
      key: "w:beforeAutospacing",
      value: l
    },
    afterAutoSpacing: {
      key: "w:afterAutospacing",
      value: o
    }
  }
}), Gr = {
  /** Heading 1 style */
  HEADING_1: "Heading1"
}, At = (e) => new we({
  name: "w:pStyle",
  attributes: { val: {
    key: "w:val",
    value: e
  } }
}), qr = {
  /** Left-aligned tab stop */
  LEFT: "left",
  /** Right-aligned tab stop */
  RIGHT: "right"
}, xo = ({ type: e, position: n, leader: t }) => new we({
  name: "w:tab",
  attributes: {
    val: {
      key: "w:val",
      value: e
    },
    pos: {
      key: "w:pos",
      value: n
    },
    leader: {
      key: "w:leader",
      value: t
    }
  }
}), Eo = (e) => new we({
  name: "w:tabs",
  children: e.map((n) => xo(n))
}), ur = class extends ce {
  constructor(e, n) {
    super("w:numPr"), this.root.push(new So(n)), this.root.push(new To(e));
  }
}, So = class extends ce {
  constructor(e) {
    if (super("w:ilvl"), e > 9) throw new Error("Level cannot be greater than 9. Read more here: https://answers.microsoft.com/en-us/msoffice/forum/all/does-word-support-more-than-9-list-levels/d130fdcd-1781-446d-8c84-c6c79124e4d7");
    this.root.push(new Re({ val: e }));
  }
}, To = class extends ce {
  constructor(e) {
    super("w:numId"), this.root.push(new Re({ val: typeof e == "string" ? `{${e}}` : e }));
  }
}, jn = class extends ce {
  constructor(...e) {
    super(...e), ie(
      this,
      /** Marker property identifying this as a FileChild */
      "fileChild",
      Symbol()
    );
  }
}, Ao = class extends ve {
  constructor(...e) {
    super(...e), ie(this, "xmlKeys", {
      id: "r:id",
      history: "w:history",
      anchor: "w:anchor"
    });
  }
}, ko = class extends ce {
  constructor(e, n, t) {
    super("w:hyperlink"), ie(this, "linkId", void 0), this.linkId = n;
    const u = new Ao({
      history: 1,
      anchor: t || void 0,
      id: t ? void 0 : `rId${this.linkId}`
    });
    this.root.push(u), e.forEach((l) => {
      this.root.push(l);
    });
  }
}, Ro = class extends ce {
  constructor(e) {
    super("w:externalHyperlink"), ie(this, "options", void 0), this.options = e;
  }
}, Co = class extends ve {
  constructor(...e) {
    super(...e), ie(this, "xmlKeys", {
      id: "w:id",
      name: "w:name"
    });
  }
}, Io = class extends ve {
  constructor(...e) {
    super(...e), ie(this, "xmlKeys", { id: "w:id" });
  }
}, No = class {
  constructor(e) {
    ie(this, "bookmarkUniqueNumericId", io()), ie(this, "start", void 0), ie(this, "children", void 0), ie(this, "end", void 0);
    const n = this.bookmarkUniqueNumericId();
    this.start = new Oo(e.id, n), this.children = e.children, this.end = new Fo(n);
  }
}, Oo = class extends ce {
  constructor(e, n) {
    super("w:bookmarkStart");
    const t = new Co({
      name: e,
      id: n
    });
    this.root.push(t);
  }
}, Fo = class extends ce {
  constructor(e) {
    super("w:bookmarkEnd");
    const n = new Io({ id: e });
    this.root.push(n);
  }
}, Po = (e) => new we({
  name: "w:outlineLvl",
  attributes: { val: {
    key: "w:val",
    value: e
  } }
}), Gt = ({ id: e, fontKey: n, subsetted: t }, u) => new we({
  name: u,
  attributes: pe({ id: {
    key: "r:id",
    value: e
  } }, n ? { fontKey: {
    key: "w:fontKey",
    value: `{${n}}`
  } } : {}),
  children: [...t ? [new ue("w:subsetted", t)] : []]
}), Do = ({ name: e, altName: n, panose1: t, charset: u, family: l, notTrueType: o, pitch: s, sig: a, embedRegular: d, embedBold: g, embedItalic: v, embedBoldItalic: b }) => new we({
  name: "w:font",
  attributes: { name: {
    key: "w:name",
    value: e
  } },
  children: [
    ...n ? [Et("w:altName", n)] : [],
    ...t ? [Et("w:panose1", t)] : [],
    ...u ? [Et("w:charset", u)] : [],
    Et("w:family", l),
    ...o ? [new ue("w:notTrueType", o)] : [],
    Et("w:pitch", s),
    ...a ? [new we({
      name: "w:sig",
      attributes: {
        usb0: {
          key: "w:usb0",
          value: a.usb0
        },
        usb1: {
          key: "w:usb1",
          value: a.usb1
        },
        usb2: {
          key: "w:usb2",
          value: a.usb2
        },
        usb3: {
          key: "w:usb3",
          value: a.usb3
        },
        csb0: {
          key: "w:csb0",
          value: a.csb0
        },
        csb1: {
          key: "w:csb1",
          value: a.csb1
        }
      }
    })] : [],
    ...d ? [Gt(d, "w:embedRegular")] : [],
    ...g ? [Gt(g, "w:embedBold")] : [],
    ...v ? [Gt(v, "w:embedItalic")] : [],
    ...b ? [Gt(b, "w:embedBoldItalic")] : []
  ]
}), Bo = ({ name: e, index: n, fontKey: t, characterSet: u }) => Do({
  name: e,
  sig: {
    usb0: "E0002AFF",
    usb1: "C000247B",
    usb2: "00000009",
    usb3: "00000000",
    csb0: "000001FF",
    csb1: "00000000"
  },
  charset: u,
  family: "auto",
  pitch: "variable",
  embedRegular: {
    fontKey: t,
    id: `rId${n}`
  }
}), Lo = (e) => new we({
  name: "w:fonts",
  attributes: {
    mc: {
      key: "xmlns:mc",
      value: "http://schemas.openxmlformats.org/markup-compatibility/2006"
    },
    r: {
      key: "xmlns:r",
      value: "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
    },
    w: {
      key: "xmlns:w",
      value: "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    },
    w14: {
      key: "xmlns:w14",
      value: "http://schemas.microsoft.com/office/word/2010/wordml"
    },
    w15: {
      key: "xmlns:w15",
      value: "http://schemas.microsoft.com/office/word/2012/wordml"
    },
    w16cex: {
      key: "xmlns:w16cex",
      value: "http://schemas.microsoft.com/office/word/2018/wordml/cex"
    },
    w16cid: {
      key: "xmlns:w16cid",
      value: "http://schemas.microsoft.com/office/word/2016/wordml/cid"
    },
    w16: {
      key: "xmlns:w16",
      value: "http://schemas.microsoft.com/office/word/2018/wordml"
    },
    w16sdtdh: {
      key: "xmlns:w16sdtdh",
      value: "http://schemas.microsoft.com/office/word/2020/wordml/sdtdatahash"
    },
    w16se: {
      key: "xmlns:w16se",
      value: "http://schemas.microsoft.com/office/word/2015/wordml/symex"
    },
    Ignorable: {
      key: "mc:Ignorable",
      value: "w14 w15 w16se w16cid w16 w16cex w16sdtdh"
    }
  },
  children: e.map((n, t) => Bo({
    name: n.name,
    index: t + 1,
    fontKey: n.fontKey,
    characterSet: n.characterSet
  }))
}), zn = class {
  constructor(e) {
    ie(this, "options", void 0), ie(this, "fontTable", void 0), ie(this, "relationships", void 0), ie(this, "fontOptionsWithKey", []), this.options = e, this.fontOptionsWithKey = e.map((n) => pe(pe({}, n), {}, { fontKey: oo() })), this.fontTable = Lo(this.fontOptionsWithKey), this.relationships = new Je();
    for (let n = 0; n < e.length; n++) this.relationships.addRelationship(n + 1, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/font", `fonts/font${n + 1}.odttf`);
  }
  get View() {
    return this.fontTable;
  }
  get Relationships() {
    return this.relationships;
  }
}, Uo = () => new we({
  name: "w:wordWrap",
  attributes: { val: {
    key: "w:val",
    value: 0
  } }
}), Mo = (e) => {
  var n, t;
  return new we({
    name: "w:framePr",
    attributes: {
      anchorLock: {
        key: "w:anchorLock",
        value: e.anchorLock
      },
      dropCap: {
        key: "w:dropCap",
        value: e.dropCap
      },
      width: {
        key: "w:w",
        value: e.width
      },
      height: {
        key: "w:h",
        value: e.height
      },
      x: {
        key: "w:x",
        value: e.position ? e.position.x : void 0
      },
      y: {
        key: "w:y",
        value: e.position ? e.position.y : void 0
      },
      anchorHorizontal: {
        key: "w:hAnchor",
        value: e.anchor.horizontal
      },
      anchorVertical: {
        key: "w:vAnchor",
        value: e.anchor.vertical
      },
      spaceHorizontal: {
        key: "w:hSpace",
        value: (n = e.space) === null || n === void 0 ? void 0 : n.horizontal
      },
      spaceVertical: {
        key: "w:vSpace",
        value: (t = e.space) === null || t === void 0 ? void 0 : t.vertical
      },
      rule: {
        key: "w:hRule",
        value: e.rule
      },
      alignmentX: {
        key: "w:xAlign",
        value: e.alignment ? e.alignment.x : void 0
      },
      alignmentY: {
        key: "w:yAlign",
        value: e.alignment ? e.alignment.y : void 0
      },
      lines: {
        key: "w:lines",
        value: e.lines
      },
      wrap: {
        key: "w:wrap",
        value: e.wrap
      }
    }
  });
}, at = class extends Xe {
  constructor(e) {
    if (super("w:pPr", e?.includeIfEmpty), ie(this, "numberingReferences", []), !e) return this;
    if (e.heading && this.push(At(e.heading)), e.bullet && this.push(At("ListParagraph")), e.numbering && !e.style && !e.heading && (e.numbering.custom || this.push(At("ListParagraph"))), e.style && this.push(At(e.style)), e.keepNext !== void 0 && this.push(new ue("w:keepNext", e.keepNext)), e.keepLines !== void 0 && this.push(new ue("w:keepLines", e.keepLines)), e.pageBreakBefore && this.push(new bo()), e.frame && this.push(Mo(e.frame)), e.widowControl !== void 0 && this.push(new ue("w:widowControl", e.widowControl)), e.bullet && this.push(new ur(1, e.bullet.level)), e.numbering) {
      var n, t;
      this.numberingReferences.push({
        reference: e.numbering.reference,
        instance: (n = e.numbering.instance) !== null && n !== void 0 ? n : 0
      }), this.push(new ur(`${e.numbering.reference}-${(t = e.numbering.instance) !== null && t !== void 0 ? t : 0}`, e.numbering.level));
    } else e.numbering === !1 && this.push(new ur(0, 0));
    e.border && this.push(new Ta(e.border)), e.thematicBreak && this.push(new Aa()), e.shading && this.push(er(e.shading)), e.wordWrap && this.push(Uo()), e.overflowPunctuation && this.push(new ue("w:overflowPunct", e.overflowPunctuation));
    const u = [
      ...e.rightTabStop !== void 0 ? [{
        type: qr.RIGHT,
        position: e.rightTabStop
      }] : [],
      ...e.tabStops ? e.tabStops : [],
      ...e.leftTabStop !== void 0 ? [{
        type: qr.LEFT,
        position: e.leftTabStop
      }] : []
    ];
    u.length > 0 && this.push(Eo(u)), e.bidirectional !== void 0 && this.push(new ue("w:bidi", e.bidirectional)), e.spacing && this.push(_o(e.spacing)), e.indent && this.push(ka(e.indent)), e.contextualSpacing !== void 0 && this.push(new ue("w:contextualSpacing", e.contextualSpacing)), e.alignment && this.push(Pn(e.alignment)), e.outlineLevel !== void 0 && this.push(Po(e.outlineLevel)), e.suppressLineNumbers !== void 0 && this.push(new ue("w:suppressLineNumbers", e.suppressLineNumbers)), e.autoSpaceEastAsianText !== void 0 && this.push(new ue("w:autoSpaceDN", e.autoSpaceEastAsianText)), e.run && this.push(new Ga(e.run)), e.revision && this.push(new jo(e.revision));
  }
  /**
  * Adds a property element to the paragraph properties.
  *
  * @param item - The XML component to add to the paragraph properties
  */
  push(e) {
    this.root.push(e);
  }
  /**
  * Prepares the paragraph properties for XML serialization.
  *
  * This method creates concrete numbering instances for any numbering references
  * before the properties are converted to XML.
  *
  * @param context - The XML context containing document and file information
  * @returns The prepared XML object, or undefined if the component should be ignored
  */
  prepForXml(e) {
    if (!(e.viewWrapper instanceof zn)) for (const n of this.numberingReferences) e.file.Numbering.createConcreteNumberingInstance(n.reference, n.instance);
    return super.prepForXml(e);
  }
}, jo = class extends ce {
  constructor(e) {
    super("w:pPrChange"), this.root.push(new Fe({
      id: e.id,
      author: e.author,
      date: e.date
    })), this.root.push(new at(pe(pe({}, e), {}, { includeIfEmpty: !0 })));
  }
}, Ae = class extends jn {
  constructor(e) {
    if (super("w:p"), ie(this, "properties", void 0), typeof e == "string")
      return this.properties = new at({}), this.root.push(this.properties), this.root.push(new qe(e)), this;
    if (this.properties = new at(e), this.root.push(this.properties), e.text && this.root.push(new qe(e.text)), e.children) for (const n of e.children) {
      if (n instanceof No) {
        this.root.push(n.start);
        for (const t of n.children) this.root.push(t);
        this.root.push(n.end);
        continue;
      }
      this.root.push(n);
    }
  }
  prepForXml(e) {
    for (const n of this.root) if (n instanceof Ro) {
      const t = this.root.indexOf(n), u = new ko(n.options.children, ao());
      e.viewWrapper.Relationships.addRelationship(u.linkId, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink", n.options.link, uo.EXTERNAL), this.root[t] = u;
    }
    return super.prepForXml(e);
  }
  addRunToFront(e) {
    return this.root.splice(1, 0, e), this;
  }
}, zo = (e) => new we({
  name: "w:gridCol",
  attributes: e !== void 0 ? { width: {
    key: "w:w",
    value: Te(e)
  } } : void 0
}), Wn = class extends ce {
  constructor(e, n) {
    super("w:tblGrid");
    for (const t of e) this.root.push(zo(t));
    n && this.root.push(new Ho(n));
  }
}, Wo = class extends ve {
  constructor(...e) {
    super(...e), ie(this, "xmlKeys", { id: "w:id" });
  }
}, Ho = class extends ce {
  constructor(e) {
    super("w:tblGridChange"), this.root.push(new Wo({ id: e.id })), this.root.push(new Wn(e.columnWidths));
  }
}, Ko = class extends ce {
  constructor(e) {
    super("w:ins"), this.root.push(new Fe({
      id: e.id,
      author: e.author,
      date: e.date
    }));
  }
}, Go = class extends ce {
  constructor(e) {
    super("w:del"), this.root.push(new Fe({
      id: e.id,
      author: e.author,
      date: e.date
    }));
  }
}, qo = class extends ce {
  constructor(e) {
    super("w:cellIns"), this.root.push(new Fe({
      id: e.id,
      author: e.author,
      date: e.date
    }));
  }
}, Vo = class extends ce {
  constructor(e) {
    super("w:cellDel"), this.root.push(new Fe({
      id: e.id,
      author: e.author,
      date: e.date
    }));
  }
}, $o = class extends ve {
  constructor(...e) {
    super(...e), ie(this, "xmlKeys", {
      id: "w:id",
      author: "w:author",
      date: "w:date",
      verticalMerge: "w:vMerge",
      verticalMergeOriginal: "w:vMergeOrig"
    });
  }
}, Xo = class extends ce {
  constructor(e) {
    super("w:cellMerge"), this.root.push(new $o(e));
  }
}, Zo = {
  TOP: "top",
  CENTER: "center",
  BOTTOM: "bottom"
};
pe(pe({}, Zo), {}, { BOTH: "both" });
var Hn = (e) => new we({
  name: "w:vAlign",
  attributes: { verticalAlign: {
    key: "w:val",
    value: e
  } }
}), Kn = ({ marginUnitType: e = wt.DXA, top: n, left: t, bottom: u, right: l }) => [
  {
    name: "w:top",
    size: n
  },
  {
    name: "w:left",
    size: t
  },
  {
    name: "w:bottom",
    size: u
  },
  {
    name: "w:right",
    size: l
  }
].filter((o) => o.size !== void 0).map(({ name: o, size: s }) => Xt(o, {
  type: e,
  size: s
})), Yo = (e) => {
  const n = Kn(e);
  if (n.length !== 0)
    return new we({
      name: "w:tblCellMar",
      children: n
    });
}, Jo = (e) => {
  const n = Kn(e);
  if (n.length !== 0)
    return new we({
      name: "w:tcMar",
      children: n
    });
}, wt = {
  /** Auto. */
  AUTO: "auto",
  /** Value is in twentieths of a point */
  DXA: "dxa",
  /** Value is in percentage. */
  PERCENTAGE: "pct"
}, Xt = (e, { type: n = wt.AUTO, size: t }) => {
  let u = t;
  return n === wt.PERCENTAGE && typeof t == "number" && (u = `${t}%`), new we({
    name: e,
    attributes: {
      type: {
        key: "w:type",
        value: n
      },
      size: {
        key: "w:w",
        value: Fn(u)
      }
    }
  });
}, Qo = class extends Xe {
  constructor(e) {
    super("w:tcBorders"), e.top && this.root.push(be("w:top", e.top)), e.start && this.root.push(be("w:start", e.start)), e.left && this.root.push(be("w:left", e.left)), e.bottom && this.root.push(be("w:bottom", e.bottom)), e.end && this.root.push(be("w:end", e.end)), e.right && this.root.push(be("w:right", e.right));
  }
}, es = class extends ve {
  constructor(...e) {
    super(...e), ie(this, "xmlKeys", { val: "w:val" });
  }
}, ts = class extends ce {
  constructor(e) {
    super("w:gridSpan"), this.root.push(new es({ val: ke(e) }));
  }
}, Gn = {
  /**
  * Cell that is merged with upper one.
  * This cell continues a vertical merge started by a cell above it.
  */
  CONTINUE: "continue",
  /**
  * Cell that is starting the vertical merge.
  * This cell begins a new vertical merge region.
  */
  RESTART: "restart"
}, rs = class extends ve {
  constructor(...e) {
    super(...e), ie(this, "xmlKeys", { val: "w:val" });
  }
}, Vr = class extends ce {
  constructor(e) {
    super("w:vMerge"), this.root.push(new rs({ val: e }));
  }
}, ns = class extends ve {
  constructor(...e) {
    super(...e), ie(this, "xmlKeys", { val: "w:val" });
  }
}, is = class extends ce {
  constructor(e) {
    super("w:textDirection"), this.root.push(new ns({ val: e }));
  }
}, qn = class extends Xe {
  constructor(e) {
    if (super("w:tcPr", e.includeIfEmpty), e.width && this.root.push(Xt("w:tcW", e.width)), e.columnSpan && this.root.push(new ts(e.columnSpan)), e.verticalMerge ? this.root.push(new Vr(e.verticalMerge)) : e.rowSpan && e.rowSpan > 1 && this.root.push(new Vr(Gn.RESTART)), e.borders && this.root.push(new Qo(e.borders)), e.shading && this.root.push(er(e.shading)), e.margins) {
      const n = Jo(e.margins);
      n && this.root.push(n);
    }
    e.textDirection && this.root.push(new is(e.textDirection)), e.verticalAlign && this.root.push(Hn(e.verticalAlign)), e.insertion && this.root.push(new qo(e.insertion)), e.deletion && this.root.push(new Vo(e.deletion)), e.revision && this.root.push(new as(e.revision)), e.cellMerge && this.root.push(new Xo(e.cellMerge));
  }
}, as = class extends ce {
  constructor(e) {
    super("w:tcPrChange"), this.root.push(new Fe({
      id: e.id,
      author: e.author,
      date: e.date
    })), this.root.push(new qn(pe(pe({}, e), {}, { includeIfEmpty: !0 })));
  }
}, Dr = class extends ce {
  constructor(e) {
    super("w:tc"), ie(this, "options", void 0), this.options = e, this.root.push(new qn(e));
    for (const n of e.children) this.root.push(n);
  }
  prepForXml(e) {
    return this.root[this.root.length - 1] instanceof Ae || this.root.push(new Ae({})), super.prepForXml(e);
  }
}, st = {
  style: Ke.NONE,
  size: 0,
  color: "auto"
}, ut = {
  style: Ke.SINGLE,
  size: 4,
  color: "auto"
}, Vn = class extends ce {
  constructor(e) {
    var n, t, u, l, o, s;
    super("w:tblBorders"), this.root.push(be("w:top", (n = e.top) !== null && n !== void 0 ? n : ut)), this.root.push(be("w:left", (t = e.left) !== null && t !== void 0 ? t : ut)), this.root.push(be("w:bottom", (u = e.bottom) !== null && u !== void 0 ? u : ut)), this.root.push(be("w:right", (l = e.right) !== null && l !== void 0 ? l : ut)), this.root.push(be("w:insideH", (o = e.insideHorizontal) !== null && o !== void 0 ? o : ut)), this.root.push(be("w:insideV", (s = e.insideVertical) !== null && s !== void 0 ? s : ut));
  }
};
ie(Vn, "NONE", {
  top: st,
  bottom: st,
  left: st,
  right: st,
  insideHorizontal: st,
  insideVertical: st
});
var os = (e) => new we({
  name: "w:tblOverlap",
  attributes: { val: {
    key: "w:val",
    value: e
  } }
}), ss = ({ horizontalAnchor: e, verticalAnchor: n, absoluteHorizontalPosition: t, relativeHorizontalPosition: u, absoluteVerticalPosition: l, relativeVerticalPosition: o, bottomFromText: s, topFromText: a, leftFromText: d, rightFromText: g, overlap: v }) => new we({
  name: "w:tblpPr",
  attributes: {
    leftFromText: {
      key: "w:leftFromText",
      value: d === void 0 ? void 0 : Te(d)
    },
    rightFromText: {
      key: "w:rightFromText",
      value: g === void 0 ? void 0 : Te(g)
    },
    topFromText: {
      key: "w:topFromText",
      value: a === void 0 ? void 0 : Te(a)
    },
    bottomFromText: {
      key: "w:bottomFromText",
      value: s === void 0 ? void 0 : Te(s)
    },
    absoluteHorizontalPosition: {
      key: "w:tblpX",
      value: t === void 0 ? void 0 : Ge(t)
    },
    absoluteVerticalPosition: {
      key: "w:tblpY",
      value: l === void 0 ? void 0 : Ge(l)
    },
    horizontalAnchor: {
      key: "w:horzAnchor",
      value: e
    },
    relativeHorizontalPosition: {
      key: "w:tblpXSpec",
      value: u
    },
    relativeVerticalPosition: {
      key: "w:tblpYSpec",
      value: o
    },
    verticalAnchor: {
      key: "w:vertAnchor",
      value: n
    }
  },
  children: v ? [os(v)] : void 0
}), us = (e) => new we({
  name: "w:tblLayout",
  attributes: { type: {
    key: "w:type",
    value: e
  } }
}), ls = {
  /** Value is in twentieths of a point */
  DXA: "dxa"
}, $n = ({ type: e = ls.DXA, value: n }) => new we({
  name: "w:tblCellSpacing",
  attributes: {
    type: {
      key: "w:type",
      value: e
    },
    value: {
      key: "w:w",
      value: Fn(n)
    }
  }
}), cs = ({ firstRow: e, lastRow: n, firstColumn: t, lastColumn: u, noHBand: l, noVBand: o }) => new we({
  name: "w:tblLook",
  attributes: {
    firstRow: {
      key: "w:firstRow",
      value: e
    },
    lastRow: {
      key: "w:lastRow",
      value: n
    },
    firstColumn: {
      key: "w:firstColumn",
      value: t
    },
    lastColumn: {
      key: "w:lastColumn",
      value: u
    },
    noHBand: {
      key: "w:noHBand",
      value: l
    },
    noVBand: {
      key: "w:noVBand",
      value: o
    }
  }
}), Xn = class extends Xe {
  constructor(e) {
    if (super("w:tblPr", e.includeIfEmpty), e.style && this.root.push(new it("w:tblStyle", e.style)), e.float && this.root.push(ss(e.float)), e.visuallyRightToLeft !== void 0 && this.root.push(new ue("w:bidiVisual", e.visuallyRightToLeft)), e.width && this.root.push(Xt("w:tblW", e.width)), e.alignment && this.root.push(Pn(e.alignment)), e.indent && this.root.push(Xt("w:tblInd", e.indent)), e.borders && this.root.push(new Vn(e.borders)), e.shading && this.root.push(er(e.shading)), e.layout && this.root.push(us(e.layout)), e.cellMargin) {
      const n = Yo(e.cellMargin);
      n && this.root.push(n);
    }
    e.tableLook && this.root.push(cs(e.tableLook)), e.cellSpacing && this.root.push($n(e.cellSpacing)), e.revision && this.root.push(new hs(e.revision));
  }
}, hs = class extends ce {
  constructor(e) {
    super("w:tblPrChange"), this.root.push(new Fe({
      id: e.id,
      author: e.author,
      date: e.date
    })), this.root.push(new Xn(pe(pe({}, e), {}, { includeIfEmpty: !0 })));
  }
}, Zn = class extends jn {
  constructor({ rows: e, width: n, columnWidths: t = Array(Math.max(...e.map((y) => y.CellCount))).fill(100), columnWidthsRevision: u, margins: l, indent: o, float: s, layout: a, style: d, borders: g, alignment: v, visuallyRightToLeft: b, tableLook: R, cellSpacing: m, revision: w }) {
    super("w:tbl"), this.root.push(new Xn({
      borders: g ?? {},
      width: n ?? { size: 100 },
      indent: o,
      float: s,
      layout: a,
      style: d,
      alignment: v,
      cellMargin: l,
      visuallyRightToLeft: b,
      tableLook: R,
      cellSpacing: m,
      revision: w
    })), this.root.push(new Wn(t, u));
    for (const y of e) this.root.push(y);
    e.forEach((y, k) => {
      if (k === e.length - 1) return;
      let N = 0;
      y.cells.forEach((_) => {
        if (_.options.rowSpan && _.options.rowSpan > 1) {
          const x = new Dr({
            rowSpan: _.options.rowSpan - 1,
            columnSpan: _.options.columnSpan,
            borders: _.options.borders,
            children: [],
            verticalMerge: Gn.CONTINUE
          });
          e[k + 1].addCellToColumnIndex(x, N);
        }
        N += _.options.columnSpan || 1;
      });
    });
  }
}, fs = (e, n) => new we({
  name: "w:trHeight",
  attributes: {
    value: {
      key: "w:val",
      value: Te(e)
    },
    rule: {
      key: "w:hRule",
      value: n
    }
  }
}), Yn = class extends Xe {
  constructor(e) {
    super("w:trPr", e.includeIfEmpty), e.cantSplit !== void 0 && this.root.push(new ue("w:cantSplit", e.cantSplit)), e.tableHeader !== void 0 && this.root.push(new ue("w:tblHeader", e.tableHeader)), e.height && this.root.push(fs(e.height.value, e.height.rule)), e.cellSpacing && this.root.push($n(e.cellSpacing)), e.insertion && this.root.push(new Ko(e.insertion)), e.deletion && this.root.push(new Go(e.deletion)), e.revision && this.root.push(new ds(e.revision));
  }
}, ds = class extends ce {
  constructor(e) {
    super("w:trPrChange"), this.root.push(new Fe({
      id: e.id,
      author: e.author,
      date: e.date
    })), this.root.push(new Yn(pe(pe({}, e), {}, { includeIfEmpty: !0 })));
  }
}, kt = class extends ce {
  constructor(e) {
    super("w:tr"), ie(this, "options", void 0), this.options = e, this.root.push(new Yn(e));
    for (const n of e.children) this.root.push(n);
  }
  get CellCount() {
    return this.options.children.length;
  }
  get cells() {
    return this.root.filter((e) => e instanceof Dr);
  }
  addCellToIndex(e, n) {
    this.root.splice(n + 1, 0, e);
  }
  addCellToColumnIndex(e, n) {
    const t = this.columnIndexToRootIndex(n, !0);
    this.addCellToIndex(e, t - 1);
  }
  rootIndexToColumnIndex(e) {
    if (e < 1 || e >= this.root.length) throw new Error(`cell 'rootIndex' should between 1 to ${this.root.length - 1}`);
    let n = 0;
    for (let t = 1; t < e; t++) {
      const u = this.root[t];
      n += u.options.columnSpan || 1;
    }
    return n;
  }
  columnIndexToRootIndex(e, n = !1) {
    if (e < 0) throw new Error("cell 'columnIndex' should not less than zero");
    let t = 0, u = 1;
    for (; t <= e; ) {
      if (u >= this.root.length) {
        if (n) return this.root.length;
        throw new Error(`cell 'columnIndex' should not great than ${t - 1}`);
      }
      const l = this.root[u];
      u += 1, t += l && l.options.columnSpan || 1;
    }
    return u - 1;
  }
}, ps = class extends ve {
  constructor(...e) {
    super(...e), ie(this, "xmlKeys", {
      xmlns: "xmlns",
      vt: "xmlns:vt"
    });
  }
}, ms = class extends ce {
  constructor() {
    super("Properties"), this.root.push(new ps({
      xmlns: "http://schemas.openxmlformats.org/officeDocument/2006/extended-properties",
      vt: "http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"
    }));
  }
}, ws = class extends ve {
  constructor(...e) {
    super(...e), ie(this, "xmlKeys", { xmlns: "xmlns" });
  }
}, We = (e, n) => new we({
  name: "Default",
  attributes: {
    contentType: {
      key: "ContentType",
      value: e
    },
    extension: {
      key: "Extension",
      value: n
    }
  }
}), Ie = (e, n) => new we({
  name: "Override",
  attributes: {
    contentType: {
      key: "ContentType",
      value: e
    },
    partName: {
      key: "PartName",
      value: n
    }
  }
}), gs = class extends ce {
  constructor() {
    super("Types"), this.root.push(new ws({ xmlns: "http://schemas.openxmlformats.org/package/2006/content-types" })), this.root.push(We("image/png", "png")), this.root.push(We("image/jpeg", "jpeg")), this.root.push(We("image/jpeg", "jpg")), this.root.push(We("image/bmp", "bmp")), this.root.push(We("image/gif", "gif")), this.root.push(We("image/svg+xml", "svg")), this.root.push(We("application/vnd.openxmlformats-package.relationships+xml", "rels")), this.root.push(We("application/xml", "xml")), this.root.push(We("application/vnd.openxmlformats-officedocument.obfuscatedFont", "odttf")), this.root.push(Ie("application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml", "/word/document.xml")), this.root.push(Ie("application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml", "/word/styles.xml")), this.root.push(Ie("application/vnd.openxmlformats-package.core-properties+xml", "/docProps/core.xml")), this.root.push(Ie("application/vnd.openxmlformats-officedocument.custom-properties+xml", "/docProps/custom.xml")), this.root.push(Ie("application/vnd.openxmlformats-officedocument.extended-properties+xml", "/docProps/app.xml")), this.root.push(Ie("application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml", "/word/numbering.xml")), this.root.push(Ie("application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml", "/word/footnotes.xml")), this.root.push(Ie("application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml", "/word/endnotes.xml")), this.root.push(Ie("application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml", "/word/settings.xml")), this.root.push(Ie("application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml", "/word/comments.xml")), this.root.push(Ie("application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml", "/word/fontTable.xml"));
  }
  /**
  * Registers the commentsExtended part in the content types.
  */
  addCommentsExtended() {
    this.root.push(Ie("application/vnd.openxmlformats-officedocument.wordprocessingml.commentsExtended+xml", "/word/commentsExtended.xml"));
  }
  /**
  * Registers a footer part in the content types.
  *
  * @param index - Footer index number (e.g., 1 for footer1.xml)
  */
  addFooter(e) {
    this.root.push(Ie("application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml", `/word/footer${e}.xml`));
  }
  /**
  * Registers a header part in the content types.
  *
  * @param index - Header index number (e.g., 1 for header1.xml)
  */
  addHeader(e) {
    this.root.push(Ie("application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml", `/word/header${e}.xml`));
  }
}, $r = {
  wpc: "http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas",
  mc: "http://schemas.openxmlformats.org/markup-compatibility/2006",
  o: "urn:schemas-microsoft-com:office:office",
  r: "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
  m: "http://schemas.openxmlformats.org/officeDocument/2006/math",
  v: "urn:schemas-microsoft-com:vml",
  wp14: "http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing",
  wp: "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
  w10: "urn:schemas-microsoft-com:office:word",
  w: "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
  w14: "http://schemas.microsoft.com/office/word/2010/wordml",
  w15: "http://schemas.microsoft.com/office/word/2012/wordml",
  wpg: "http://schemas.microsoft.com/office/word/2010/wordprocessingGroup",
  wpi: "http://schemas.microsoft.com/office/word/2010/wordprocessingInk",
  wne: "http://schemas.microsoft.com/office/word/2006/wordml",
  wps: "http://schemas.microsoft.com/office/word/2010/wordprocessingShape",
  cp: "http://schemas.openxmlformats.org/package/2006/metadata/core-properties",
  dc: "http://purl.org/dc/elements/1.1/",
  dcterms: "http://purl.org/dc/terms/",
  dcmitype: "http://purl.org/dc/dcmitype/",
  xsi: "http://www.w3.org/2001/XMLSchema-instance",
  cx: "http://schemas.microsoft.com/office/drawing/2014/chartex",
  cx1: "http://schemas.microsoft.com/office/drawing/2015/9/8/chartex",
  cx2: "http://schemas.microsoft.com/office/drawing/2015/10/21/chartex",
  cx3: "http://schemas.microsoft.com/office/drawing/2016/5/9/chartex",
  cx4: "http://schemas.microsoft.com/office/drawing/2016/5/10/chartex",
  cx5: "http://schemas.microsoft.com/office/drawing/2016/5/11/chartex",
  cx6: "http://schemas.microsoft.com/office/drawing/2016/5/12/chartex",
  cx7: "http://schemas.microsoft.com/office/drawing/2016/5/13/chartex",
  cx8: "http://schemas.microsoft.com/office/drawing/2016/5/14/chartex",
  aink: "http://schemas.microsoft.com/office/drawing/2016/ink",
  am3d: "http://schemas.microsoft.com/office/drawing/2017/model3d",
  w16cex: "http://schemas.microsoft.com/office/word/2018/wordml/cex",
  w16cid: "http://schemas.microsoft.com/office/word/2016/wordml/cid",
  w16: "http://schemas.microsoft.com/office/word/2018/wordml",
  w16sdtdh: "http://schemas.microsoft.com/office/word/2020/wordml/sdtdatahash",
  w16se: "http://schemas.microsoft.com/office/word/2015/wordml/symex"
}, tr = class extends ve {
  constructor(e, n) {
    super(pe({ Ignorable: n }, Object.fromEntries(e.map((t) => [t, $r[t]])))), ie(this, "xmlKeys", pe({ Ignorable: "mc:Ignorable" }, Object.fromEntries(Object.keys($r).map((t) => [t, `xmlns:${t}`]))));
  }
}, vs = class extends ce {
  constructor(e) {
    super("cp:coreProperties"), this.root.push(new tr([
      "cp",
      "dc",
      "dcterms",
      "dcmitype",
      "xsi"
    ])), e.title && this.root.push(new et("dc:title", e.title)), e.subject && this.root.push(new et("dc:subject", e.subject)), e.creator && this.root.push(new et("dc:creator", e.creator)), e.keywords && this.root.push(new et("cp:keywords", e.keywords)), e.description && this.root.push(new et("dc:description", e.description)), e.lastModifiedBy && this.root.push(new et("cp:lastModifiedBy", e.lastModifiedBy)), e.revision && this.root.push(new et("cp:revision", String(e.revision))), this.root.push(new Xr("dcterms:created")), this.root.push(new Xr("dcterms:modified"));
  }
}, ys = class extends ve {
  constructor(...e) {
    super(...e), ie(this, "xmlKeys", { type: "xsi:type" });
  }
}, Xr = class extends ce {
  constructor(e) {
    super(e), this.root.push(new ys({ type: "dcterms:W3CDTF" })), this.root.push(Ea(/* @__PURE__ */ new Date()));
  }
}, bs = class extends ve {
  constructor(...e) {
    super(...e), ie(this, "xmlKeys", {
      xmlns: "xmlns",
      vt: "xmlns:vt"
    });
  }
}, _s = class extends ve {
  constructor(...e) {
    super(...e), ie(this, "xmlKeys", {
      formatId: "fmtid",
      pid: "pid",
      name: "name"
    });
  }
}, xs = class extends ce {
  constructor(e, n) {
    super("property"), this.root.push(new _s({
      formatId: "{D5CDD505-2E9C-101B-9397-08002B2CF9AE}",
      pid: e.toString(),
      name: n.name
    })), this.root.push(new Es(n.value));
  }
}, Es = class extends ce {
  constructor(e) {
    super("vt:lpwstr"), this.root.push(e);
  }
}, Ss = class extends ce {
  constructor(e) {
    super("Properties"), ie(this, "nextId", void 0), ie(this, "properties", []), this.root.push(new bs({
      xmlns: "http://schemas.openxmlformats.org/officeDocument/2006/custom-properties",
      vt: "http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"
    })), this.nextId = 2;
    for (const n of e) this.addCustomProperty(n);
  }
  prepForXml(e) {
    return this.properties.forEach((n) => this.root.push(n)), super.prepForXml(e);
  }
  addCustomProperty(e) {
    this.properties.push(new xs(this.nextId++, e));
  }
}, Ts = ({ space: e, count: n, separate: t, equalWidth: u, children: l }) => new we({
  name: "w:cols",
  attributes: {
    space: {
      key: "w:space",
      value: e === void 0 ? void 0 : Te(e)
    },
    count: {
      key: "w:num",
      value: n === void 0 ? void 0 : ke(n)
    },
    separate: {
      key: "w:sep",
      value: t
    },
    equalWidth: {
      key: "w:equalWidth",
      value: u
    }
  },
  children: !u && l ? l : void 0
}), As = ({ type: e, linePitch: n, charSpace: t }) => new we({
  name: "w:docGrid",
  attributes: {
    type: {
      key: "w:type",
      value: e
    },
    linePitch: {
      key: "w:linePitch",
      value: ke(n)
    },
    charSpace: {
      key: "w:charSpace",
      value: t ? ke(t) : void 0
    }
  }
}), ct = {
  /** Specifies that this header or footer shall appear on every page in this section which is not overridden with a specific `even` or `first` page header/footer. In a section with all three types specified, this type shall be used on all odd numbered pages (counting from the `first` page in the section, not the section numbering). */
  DEFAULT: "default",
  /** Specifies that this header or footer shall appear on the first page in this section. The appearance of this header or footer is contingent on the setting of the `titlePg` element (§2.10.6). */
  FIRST: "first",
  /** Specifies that this header or footer shall appear on all even numbered pages in this section (counting from the first page in the section, not the section numbering). The appearance of this header or footer is contingent on the setting of the `evenAndOddHeaders` element (§2.10.1). */
  EVEN: "even"
}, Zr = {
  HEADER: "w:headerReference",
  FOOTER: "w:footerReference"
}, lr = (e, n) => new we({
  name: e,
  attributes: {
    type: {
      key: "w:type",
      value: n.type || ct.DEFAULT
    },
    id: {
      key: "r:id",
      value: `rId${n.id}`
    }
  }
}), ks = ({ countBy: e, start: n, restart: t, distance: u }) => new we({
  name: "w:lnNumType",
  attributes: {
    countBy: {
      key: "w:countBy",
      value: e === void 0 ? void 0 : ke(e)
    },
    start: {
      key: "w:start",
      value: n === void 0 ? void 0 : ke(n)
    },
    restart: {
      key: "w:restart",
      value: t
    },
    distance: {
      key: "w:distance",
      value: u === void 0 ? void 0 : Te(u)
    }
  }
}), Yr = class extends ve {
  constructor(...e) {
    super(...e), ie(this, "xmlKeys", {
      display: "w:display",
      offsetFrom: "w:offsetFrom",
      zOrder: "w:zOrder"
    });
  }
}, Rs = class extends Xe {
  constructor(e) {
    if (super("w:pgBorders"), !e) return this;
    e.pageBorders ? this.root.push(new Yr({
      display: e.pageBorders.display,
      offsetFrom: e.pageBorders.offsetFrom,
      zOrder: e.pageBorders.zOrder
    })) : this.root.push(new Yr({})), e.pageBorderTop && this.root.push(be("w:top", e.pageBorderTop)), e.pageBorderLeft && this.root.push(be("w:left", e.pageBorderLeft)), e.pageBorderBottom && this.root.push(be("w:bottom", e.pageBorderBottom)), e.pageBorderRight && this.root.push(be("w:right", e.pageBorderRight));
  }
}, Cs = (e, n, t, u, l, o, s) => new we({
  name: "w:pgMar",
  attributes: {
    top: {
      key: "w:top",
      value: Ge(e)
    },
    right: {
      key: "w:right",
      value: Te(n)
    },
    bottom: {
      key: "w:bottom",
      value: Ge(t)
    },
    left: {
      key: "w:left",
      value: Te(u)
    },
    header: {
      key: "w:header",
      value: Te(l)
    },
    footer: {
      key: "w:footer",
      value: Te(o)
    },
    gutter: {
      key: "w:gutter",
      value: Te(s)
    }
  }
}), Is = ({ start: e, formatType: n, separator: t }) => new we({
  name: "w:pgNumType",
  attributes: {
    start: {
      key: "w:start",
      value: e === void 0 ? void 0 : ke(e)
    },
    formatType: {
      key: "w:fmt",
      value: n
    },
    separator: {
      key: "w:chapSep",
      value: t
    }
  }
}), yr = {
  /**
  * ## Portrait Mode
  *
  * Specifies that pages in this section shall be printed in portrait mode.
  */
  PORTRAIT: "portrait",
  /**
  * ## Landscape Mode
  *
  * Specifies that pages in this section shall be printed in landscape mode, which prints the page contents with a 90 degree rotation with respect to the normal page orientation.
  */
  LANDSCAPE: "landscape"
}, Ns = ({ width: e, height: n, orientation: t, code: u }) => {
  const l = Te(e), o = Te(n);
  return new we({
    name: "w:pgSz",
    attributes: {
      width: {
        key: "w:w",
        value: t === yr.LANDSCAPE ? o : l
      },
      height: {
        key: "w:h",
        value: t === yr.LANDSCAPE ? l : o
      },
      orientation: {
        key: "w:orient",
        value: t
      },
      code: {
        key: "w:code",
        value: u
      }
    }
  });
}, Os = class extends ve {
  constructor(...e) {
    super(...e), ie(this, "xmlKeys", { val: "w:val" });
  }
}, Fs = class extends ce {
  constructor(e) {
    super("w:textDirection"), this.root.push(new Os({ val: e }));
  }
}, Ps = (e) => new we({
  name: "w:type",
  attributes: { val: {
    key: "w:val",
    value: e
  } }
}), tt = {
  /** Top margin: 1440 twips (1 inch) */
  TOP: 1440,
  /** Right margin: 1440 twips (1 inch) */
  RIGHT: 1440,
  /** Bottom margin: 1440 twips (1 inch) */
  BOTTOM: 1440,
  /** Left margin: 1440 twips (1 inch) */
  LEFT: 1440,
  /** Header margin from top: 708 twips (0.5 inches) */
  HEADER: 708,
  /** Footer margin from bottom: 708 twips (0.5 inches) */
  FOOTER: 708,
  /** Gutter margin for binding: 0 twips */
  GUTTER: 0
}, cr = {
  /** Page width: 11906 twips (8.27 inches, 210mm) */
  WIDTH: 11906,
  /** Page height: 16838 twips (11.69 inches, 297mm) */
  HEIGHT: 16838,
  /** Page orientation: portrait */
  ORIENTATION: yr.PORTRAIT
}, Jn = class extends ce {
  constructor({ page: { size: { width: e = cr.WIDTH, height: n = cr.HEIGHT, orientation: t = cr.ORIENTATION, code: u } = {}, margin: { top: l = tt.TOP, right: o = tt.RIGHT, bottom: s = tt.BOTTOM, left: a = tt.LEFT, header: d = tt.HEADER, footer: g = tt.FOOTER, gutter: v = tt.GUTTER } = {}, pageNumbers: b = {}, borders: R, textDirection: m } = {}, grid: { linePitch: w = 360, charSpace: y, type: k } = {}, headerWrapperGroup: N = {}, footerWrapperGroup: _ = {}, lineNumbers: x, titlePage: A, verticalAlign: S, column: p, type: F, revision: M } = {}) {
    super("w:sectPr"), this.addHeaderFooterGroup(Zr.HEADER, N), this.addHeaderFooterGroup(Zr.FOOTER, _), F && this.root.push(Ps(F)), this.root.push(Ns({
      width: e,
      height: n,
      orientation: t,
      code: u
    })), this.root.push(Cs(l, o, s, a, d, g, v)), R && this.root.push(new Rs(R)), x && this.root.push(ks(x)), this.root.push(Is(b)), p && this.root.push(Ts(p)), S && this.root.push(Hn(S)), A !== void 0 && this.root.push(new ue("w:titlePg", A)), m && this.root.push(new Fs(m)), M && this.root.push(new Ds(M)), this.root.push(As({
      linePitch: w,
      charSpace: y,
      type: k
    }));
  }
  addHeaderFooterGroup(e, n) {
    n.default && this.root.push(lr(e, {
      type: ct.DEFAULT,
      id: n.default.View.ReferenceId
    })), n.first && this.root.push(lr(e, {
      type: ct.FIRST,
      id: n.first.View.ReferenceId
    })), n.even && this.root.push(lr(e, {
      type: ct.EVEN,
      id: n.even.View.ReferenceId
    }));
  }
}, Ds = class extends ce {
  constructor(e) {
    super("w:sectPrChange"), this.root.push(new Fe({
      id: e.id,
      author: e.author,
      date: e.date
    })), this.root.push(new Jn(e));
  }
}, Bs = class extends ce {
  constructor() {
    super("w:body"), ie(this, "sections", []);
  }
  /**
  * Adds new section properties to the document body.
  *
  * Creates a new section by moving the previous section's properties into a paragraph
  * at the end of that section, and then adding the new section as the current section.
  *
  * According to the OOXML specification:
  * - Section properties for all sections except the last must be stored in a paragraph's
  *   properties (pPr/sectPr) at the end of each section
  * - The last section's properties are stored as a direct child of the body element (w:body/w:sectPr)
  *
  * @param options - Section properties configuration (page size, margins, headers, footers, etc.)
  */
  addSection(e) {
    const n = this.sections.pop();
    this.root.push(this.createSectionParagraph(n)), this.sections.push(new Jn(e));
  }
  /**
  * Prepares the body element for XML serialization.
  *
  * Ensures that the last section's properties are placed as a direct child of the body
  * element, as required by the OOXML specification.
  *
  * @param context - The XML serialization context
  * @returns The prepared XML object or undefined
  */
  prepForXml(e) {
    return this.sections.length === 1 && (this.root.splice(0, 1), this.root.push(this.sections.pop())), super.prepForXml(e);
  }
  /**
  * Adds a block-level component to the body.
  *
  * This method is used internally by the Document class to add paragraphs,
  * tables, and other block-level elements to the document body.
  *
  * @param component - The XML component to add (paragraph, table, etc.)
  */
  push(e) {
    this.root.push(e);
  }
  createSectionParagraph(e) {
    const n = new Ae({}), t = new at({});
    return t.push(e), n.addChildElement(t), n;
  }
}, Ls = class extends ve {
  constructor(...e) {
    super(...e), ie(this, "xmlKeys", {
      color: "w:color",
      themeColor: "w:themeColor",
      themeShade: "w:themeShade",
      themeTint: "w:themeTint"
    });
  }
}, Us = class extends ce {
  constructor(e) {
    super("w:background"), this.root.push(new Ls({
      color: e.color === void 0 ? void 0 : ft(e.color),
      themeColor: e.themeColor,
      themeShade: e.themeShade === void 0 ? void 0 : Wr(e.themeShade),
      themeTint: e.themeTint === void 0 ? void 0 : Wr(e.themeTint)
    }));
  }
}, Ms = class extends ce {
  constructor(e) {
    super("w:document"), ie(this, "body", void 0), this.root.push(new tr([
      "wpc",
      "mc",
      "o",
      "r",
      "m",
      "v",
      "wp14",
      "wp",
      "w10",
      "w",
      "w14",
      "w15",
      "wpg",
      "wpi",
      "wne",
      "wps",
      "cx",
      "cx1",
      "cx2",
      "cx3",
      "cx4",
      "cx5",
      "cx6",
      "cx7",
      "cx8",
      "aink",
      "am3d",
      "w16cex",
      "w16cid",
      "w16",
      "w16sdtdh",
      "w16se"
    ], "w14 w15 wp14")), this.body = new Bs(), e.background && this.root.push(new Us(e.background)), this.root.push(this.body);
  }
  /**
  * Adds a block-level element to the document body.
  *
  * @param item - The element to add (paragraph, table, table of contents, or hyperlink)
  * @returns The Document instance for method chaining
  */
  add(e) {
    return this.body.push(e), this;
  }
  /**
  * Gets the document body element.
  *
  * @returns The Body instance containing all document content
  */
  get Body() {
    return this.body;
  }
}, js = class {
  constructor(e) {
    ie(this, "document", void 0), ie(this, "relationships", void 0), this.document = new Ms(e), this.relationships = new Je();
  }
  get View() {
    return this.document;
  }
  get Relationships() {
    return this.relationships;
  }
}, zs = class extends ve {
  constructor(...e) {
    super(...e), ie(this, "xmlKeys", {
      wpc: "xmlns:wpc",
      mc: "xmlns:mc",
      o: "xmlns:o",
      r: "xmlns:r",
      m: "xmlns:m",
      v: "xmlns:v",
      wp14: "xmlns:wp14",
      wp: "xmlns:wp",
      w10: "xmlns:w10",
      w: "xmlns:w",
      w14: "xmlns:w14",
      w15: "xmlns:w15",
      wpg: "xmlns:wpg",
      wpi: "xmlns:wpi",
      wne: "xmlns:wne",
      wps: "xmlns:wps",
      Ignorable: "mc:Ignorable"
    });
  }
}, Ws = class extends ve {
  constructor(...e) {
    super(...e), ie(this, "xmlKeys", {
      type: "w:type",
      id: "w:id"
    });
  }
}, Hs = class extends Ft {
  constructor() {
    super({ style: "EndnoteReference" }), this.root.push(new yo());
  }
}, Jr = {
  SEPARATOR: "separator",
  CONTINUATION_SEPARATOR: "continuationSeparator"
}, hr = class extends ce {
  constructor(e) {
    super("w:endnote"), this.root.push(new Ws({
      type: e.type,
      id: e.id
    }));
    for (let n = 0; n < e.children.length; n++) {
      const t = e.children[n];
      n === 0 && t.addRunToFront(new Hs()), this.root.push(t);
    }
  }
}, Ks = class extends ce {
  constructor() {
    super("w:continuationSeparator");
  }
}, Qn = class extends Ft {
  constructor() {
    super({}), this.root.push(new Ks());
  }
}, Gs = class extends ce {
  constructor() {
    super("w:separator");
  }
}, ei = class extends Ft {
  constructor() {
    super({}), this.root.push(new Gs());
  }
}, qs = class extends ce {
  constructor() {
    super("w:endnotes"), this.root.push(new zs({
      wpc: "http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas",
      mc: "http://schemas.openxmlformats.org/markup-compatibility/2006",
      o: "urn:schemas-microsoft-com:office:office",
      r: "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
      m: "http://schemas.openxmlformats.org/officeDocument/2006/math",
      v: "urn:schemas-microsoft-com:vml",
      wp14: "http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing",
      wp: "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
      w10: "urn:schemas-microsoft-com:office:word",
      w: "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
      w14: "http://schemas.microsoft.com/office/word/2010/wordml",
      w15: "http://schemas.microsoft.com/office/word/2012/wordml",
      wpg: "http://schemas.microsoft.com/office/word/2010/wordprocessingGroup",
      wpi: "http://schemas.microsoft.com/office/word/2010/wordprocessingInk",
      wne: "http://schemas.microsoft.com/office/word/2006/wordml",
      wps: "http://schemas.microsoft.com/office/word/2010/wordprocessingShape",
      Ignorable: "w14 w15 wp14"
    }));
    const e = new hr({
      id: -1,
      type: Jr.SEPARATOR,
      children: [new Ae({
        spacing: {
          after: 0,
          line: 240,
          lineRule: mt.AUTO
        },
        children: [new ei()]
      })]
    });
    this.root.push(e);
    const n = new hr({
      id: 0,
      type: Jr.CONTINUATION_SEPARATOR,
      children: [new Ae({
        spacing: {
          after: 0,
          line: 240,
          lineRule: mt.AUTO
        },
        children: [new Qn()]
      })]
    });
    this.root.push(n);
  }
  createEndnote(e, n) {
    const t = new hr({
      id: e,
      children: n
    });
    this.root.push(t);
  }
}, Vs = class {
  constructor() {
    ie(this, "endnotes", void 0), ie(this, "relationships", void 0), this.endnotes = new qs(), this.relationships = new Je();
  }
  get View() {
    return this.endnotes;
  }
  get Relationships() {
    return this.relationships;
  }
}, $s = class extends ve {
  constructor(...e) {
    super(...e), ie(this, "xmlKeys", {
      wpc: "xmlns:wpc",
      mc: "xmlns:mc",
      o: "xmlns:o",
      r: "xmlns:r",
      m: "xmlns:m",
      v: "xmlns:v",
      wp14: "xmlns:wp14",
      wp: "xmlns:wp",
      w10: "xmlns:w10",
      w: "xmlns:w",
      w14: "xmlns:w14",
      w15: "xmlns:w15",
      wpg: "xmlns:wpg",
      wpi: "xmlns:wpi",
      wne: "xmlns:wne",
      wps: "xmlns:wps",
      cp: "xmlns:cp",
      dc: "xmlns:dc",
      dcterms: "xmlns:dcterms",
      dcmitype: "xmlns:dcmitype",
      xsi: "xmlns:xsi",
      type: "xsi:type"
    });
  }
}, Xs = class extends In {
  constructor(e, n) {
    super("w:ftr", n), ie(this, "refId", void 0), this.refId = e, n || this.root.push(new $s({
      wpc: "http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas",
      mc: "http://schemas.openxmlformats.org/markup-compatibility/2006",
      o: "urn:schemas-microsoft-com:office:office",
      r: "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
      m: "http://schemas.openxmlformats.org/officeDocument/2006/math",
      v: "urn:schemas-microsoft-com:vml",
      wp14: "http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing",
      wp: "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
      w10: "urn:schemas-microsoft-com:office:word",
      w: "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
      w14: "http://schemas.microsoft.com/office/word/2010/wordml",
      w15: "http://schemas.microsoft.com/office/word/2012/wordml",
      wpg: "http://schemas.microsoft.com/office/word/2010/wordprocessingGroup",
      wpi: "http://schemas.microsoft.com/office/word/2010/wordprocessingInk",
      wne: "http://schemas.microsoft.com/office/word/2006/wordml",
      wps: "http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
    }));
  }
  get ReferenceId() {
    return this.refId;
  }
  add(e) {
    this.root.push(e);
  }
}, Zs = class {
  constructor(e, n, t) {
    ie(this, "media", void 0), ie(this, "footer", void 0), ie(this, "relationships", void 0), this.media = e, this.footer = new Xs(n, t), this.relationships = new Je();
  }
  add(e) {
    this.footer.add(e);
  }
  addChildElement(e) {
    this.footer.addChildElement(e);
  }
  get View() {
    return this.footer;
  }
  get Relationships() {
    return this.relationships;
  }
  get Media() {
    return this.media;
  }
}, Ys = class extends ve {
  constructor(...e) {
    super(...e), ie(this, "xmlKeys", {
      type: "w:type",
      id: "w:id"
    });
  }
}, Js = class extends ce {
  constructor() {
    super("w:footnoteRef");
  }
}, Qs = class extends Ft {
  constructor() {
    super({ style: "FootnoteReference" }), this.root.push(new Js());
  }
}, Qr = {
  /** Separator line between body text and footnotes */
  SEPERATOR: "separator",
  /** Continuation separator for footnotes spanning pages */
  CONTINUATION_SEPERATOR: "continuationSeparator"
}, fr = class extends ce {
  constructor(e) {
    super("w:footnote"), this.root.push(new Ys({
      type: e.type,
      id: e.id
    }));
    for (let n = 0; n < e.children.length; n++) {
      const t = e.children[n];
      n === 0 && t.addRunToFront(new Qs()), this.root.push(t);
    }
  }
}, eu = class extends ve {
  constructor(...e) {
    super(...e), ie(this, "xmlKeys", {
      wpc: "xmlns:wpc",
      mc: "xmlns:mc",
      o: "xmlns:o",
      r: "xmlns:r",
      m: "xmlns:m",
      v: "xmlns:v",
      wp14: "xmlns:wp14",
      wp: "xmlns:wp",
      w10: "xmlns:w10",
      w: "xmlns:w",
      w14: "xmlns:w14",
      w15: "xmlns:w15",
      wpg: "xmlns:wpg",
      wpi: "xmlns:wpi",
      wne: "xmlns:wne",
      wps: "xmlns:wps",
      Ignorable: "mc:Ignorable"
    });
  }
}, tu = class extends ce {
  constructor() {
    super("w:footnotes"), this.root.push(new eu({
      wpc: "http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas",
      mc: "http://schemas.openxmlformats.org/markup-compatibility/2006",
      o: "urn:schemas-microsoft-com:office:office",
      r: "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
      m: "http://schemas.openxmlformats.org/officeDocument/2006/math",
      v: "urn:schemas-microsoft-com:vml",
      wp14: "http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing",
      wp: "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
      w10: "urn:schemas-microsoft-com:office:word",
      w: "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
      w14: "http://schemas.microsoft.com/office/word/2010/wordml",
      w15: "http://schemas.microsoft.com/office/word/2012/wordml",
      wpg: "http://schemas.microsoft.com/office/word/2010/wordprocessingGroup",
      wpi: "http://schemas.microsoft.com/office/word/2010/wordprocessingInk",
      wne: "http://schemas.microsoft.com/office/word/2006/wordml",
      wps: "http://schemas.microsoft.com/office/word/2010/wordprocessingShape",
      Ignorable: "w14 w15 wp14"
    }));
    const e = new fr({
      id: -1,
      type: Qr.SEPERATOR,
      children: [new Ae({
        spacing: {
          after: 0,
          line: 240,
          lineRule: mt.AUTO
        },
        children: [new ei()]
      })]
    });
    this.root.push(e);
    const n = new fr({
      id: 0,
      type: Qr.CONTINUATION_SEPERATOR,
      children: [new Ae({
        spacing: {
          after: 0,
          line: 240,
          lineRule: mt.AUTO
        },
        children: [new Qn()]
      })]
    });
    this.root.push(n);
  }
  /**
  * Creates and adds a new footnote to the collection.
  *
  * @param id - Unique numeric identifier for the footnote
  * @param paragraph - Array of paragraphs that make up the footnote content
  */
  createFootNote(e, n) {
    const t = new fr({
      id: e,
      children: n
    });
    this.root.push(t);
  }
}, ru = class {
  constructor() {
    ie(this, "footnotess", void 0), ie(this, "relationships", void 0), this.footnotess = new tu(), this.relationships = new Je();
  }
  get View() {
    return this.footnotess;
  }
  get Relationships() {
    return this.relationships;
  }
}, nu = class extends ve {
  constructor(...e) {
    super(...e), ie(this, "xmlKeys", {
      wpc: "xmlns:wpc",
      mc: "xmlns:mc",
      o: "xmlns:o",
      r: "xmlns:r",
      m: "xmlns:m",
      v: "xmlns:v",
      wp14: "xmlns:wp14",
      wp: "xmlns:wp",
      w10: "xmlns:w10",
      w: "xmlns:w",
      w14: "xmlns:w14",
      w15: "xmlns:w15",
      wpg: "xmlns:wpg",
      wpi: "xmlns:wpi",
      wne: "xmlns:wne",
      wps: "xmlns:wps",
      cp: "xmlns:cp",
      dc: "xmlns:dc",
      dcterms: "xmlns:dcterms",
      dcmitype: "xmlns:dcmitype",
      xsi: "xmlns:xsi",
      type: "xsi:type",
      cx: "xmlns:cx",
      cx1: "xmlns:cx1",
      cx2: "xmlns:cx2",
      cx3: "xmlns:cx3",
      cx4: "xmlns:cx4",
      cx5: "xmlns:cx5",
      cx6: "xmlns:cx6",
      cx7: "xmlns:cx7",
      cx8: "xmlns:cx8",
      w16cid: "xmlns:w16cid",
      w16se: "xmlns:w16se"
    });
  }
}, iu = class extends In {
  constructor(e, n) {
    super("w:hdr", n), ie(this, "refId", void 0), this.refId = e, n || this.root.push(new nu({
      wpc: "http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas",
      mc: "http://schemas.openxmlformats.org/markup-compatibility/2006",
      o: "urn:schemas-microsoft-com:office:office",
      r: "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
      m: "http://schemas.openxmlformats.org/officeDocument/2006/math",
      v: "urn:schemas-microsoft-com:vml",
      wp14: "http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing",
      wp: "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
      w10: "urn:schemas-microsoft-com:office:word",
      w: "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
      w14: "http://schemas.microsoft.com/office/word/2010/wordml",
      w15: "http://schemas.microsoft.com/office/word/2012/wordml",
      wpg: "http://schemas.microsoft.com/office/word/2010/wordprocessingGroup",
      wpi: "http://schemas.microsoft.com/office/word/2010/wordprocessingInk",
      wne: "http://schemas.microsoft.com/office/word/2006/wordml",
      wps: "http://schemas.microsoft.com/office/word/2010/wordprocessingShape",
      cx: "http://schemas.microsoft.com/office/drawing/2014/chartex",
      cx1: "http://schemas.microsoft.com/office/drawing/2015/9/8/chartex",
      cx2: "http://schemas.microsoft.com/office/drawing/2015/10/21/chartex",
      cx3: "http://schemas.microsoft.com/office/drawing/2016/5/9/chartex",
      cx4: "http://schemas.microsoft.com/office/drawing/2016/5/10/chartex",
      cx5: "http://schemas.microsoft.com/office/drawing/2016/5/11/chartex",
      cx6: "http://schemas.microsoft.com/office/drawing/2016/5/12/chartex",
      cx7: "http://schemas.microsoft.com/office/drawing/2016/5/13/chartex",
      cx8: "http://schemas.microsoft.com/office/drawing/2016/5/14/chartex",
      w16cid: "http://schemas.microsoft.com/office/word/2016/wordml/cid",
      w16se: "http://schemas.microsoft.com/office/word/2015/wordml/symex"
    }));
  }
  get ReferenceId() {
    return this.refId;
  }
  add(e) {
    this.root.push(e);
  }
}, au = class {
  constructor(e, n, t) {
    ie(this, "media", void 0), ie(this, "header", void 0), ie(this, "relationships", void 0), this.media = e, this.header = new iu(n, t), this.relationships = new Je();
  }
  add(e) {
    return this.header.add(e), this;
  }
  addChildElement(e) {
    this.header.addChildElement(e);
  }
  get View() {
    return this.header;
  }
  get Relationships() {
    return this.relationships;
  }
  get Media() {
    return this.media;
  }
}, ou = class {
  constructor() {
    ie(this, "map", void 0), this.map = /* @__PURE__ */ new Map();
  }
  /**
  * Adds an image to the media collection.
  *
  * @param key - Unique identifier for this image
  * @param mediaData - Complete image data including file name, transformation, and raw data
  */
  addImage(e, n) {
    this.map.set(e, n);
  }
  /**
  * Gets all images as an array.
  *
  * @returns Read-only array of all media data in the collection
  */
  get Array() {
    return Array.from(this.map.values());
  }
}, He = {
  /** Bullet points. */
  BULLET: "bullet"
}, su = class extends ve {
  constructor(...e) {
    super(...e), ie(this, "xmlKeys", {
      ilvl: "w:ilvl",
      tentative: "w15:tentative"
    });
  }
}, uu = class extends ce {
  constructor(e) {
    super("w:numFmt"), this.root.push(new Re({ val: e }));
  }
}, lu = class extends ce {
  constructor(e) {
    super("w:lvlText"), this.root.push(new Re({ val: e }));
  }
}, cu = class extends ce {
  constructor(e) {
    super("w:lvlJc"), this.root.push(new Re({ val: e }));
  }
}, hu = class extends ce {
  constructor(e) {
    super("w:suff"), this.root.push(new Re({ val: e }));
  }
}, fu = class extends ce {
  constructor() {
    super("w:isLgl");
  }
}, du = class extends ce {
  /**
  * Creates a new numbering level.
  *
  * @param options - Level configuration options
  * @throws Error if level is greater than 9 (Word limitation)
  */
  constructor({ level: e, format: n, text: t, alignment: u = Ne.START, start: l = 1, style: o, suffix: s, isLegalNumberingStyle: a }) {
    if (super("w:lvl"), ie(this, "paragraphProperties", void 0), ie(this, "runProperties", void 0), this.root.push(new Ct("w:start", ke(l))), n && this.root.push(new uu(n)), s && this.root.push(new hu(s)), a && this.root.push(new fu()), t && this.root.push(new lu(t)), this.root.push(new cu(u)), o?.style && this.root.push(At(o.style)), this.paragraphProperties = new at(o && o.paragraph), this.runProperties = new ot(o && o.run), this.root.push(this.paragraphProperties), this.root.push(this.runProperties), e > 9) throw new Error("Level cannot be greater than 9. Read more here: https://answers.microsoft.com/en-us/msoffice/forum/all/does-word-support-more-than-9-list-levels/d130fdcd-1781-446d-8c84-c6c79124e4d7");
    this.root.push(new su({
      ilvl: ke(e),
      tentative: 1
    }));
  }
}, pu = class extends du {
}, mu = class extends ce {
  /**
  * Creates a new multi-level type specification.
  *
  * @param value - The multi-level type: "singleLevel", "multilevel", or "hybridMultilevel"
  */
  constructor(e) {
    super("w:multiLevelType"), this.root.push(new Re({ val: e }));
  }
}, wu = class extends ve {
  constructor(...e) {
    super(...e), ie(this, "xmlKeys", {
      abstractNumId: "w:abstractNumId",
      restartNumberingAfterBreak: "w15:restartNumberingAfterBreak"
    });
  }
}, en = class extends ce {
  /**
  * Creates a new abstract numbering definition.
  *
  * @param id - Unique identifier for this abstract numbering definition
  * @param levelOptions - Array of level definitions (up to 9 levels)
  */
  constructor(e, n) {
    super("w:abstractNum"), ie(
      this,
      /** The unique identifier for this abstract numbering definition. */
      "id",
      void 0
    ), this.root.push(new wu({
      abstractNumId: ke(e),
      restartNumberingAfterBreak: 0
    })), this.root.push(new mu("hybridMultilevel")), this.id = e;
    for (const t of n) this.root.push(new pu(t));
  }
}, gu = class extends ce {
  constructor(e) {
    super("w:abstractNumId"), this.root.push(new Re({ val: e }));
  }
}, vu = class extends ve {
  constructor(...e) {
    super(...e), ie(this, "xmlKeys", { numId: "w:numId" });
  }
}, tn = class extends ce {
  /**
  * Creates a new concrete numbering instance.
  *
  * @param options - Configuration options for the numbering instance
  */
  constructor(e) {
    if (super("w:num"), ie(
      this,
      /** The unique identifier for this numbering instance. */
      "numId",
      void 0
    ), ie(
      this,
      /** The reference name for this numbering instance. */
      "reference",
      void 0
    ), ie(
      this,
      /** The instance number for tracking multiple uses. */
      "instance",
      void 0
    ), this.numId = e.numId, this.reference = e.reference, this.instance = e.instance, this.root.push(new vu({ numId: ke(e.numId) })), this.root.push(new gu(ke(e.abstractNumId))), e.overrideLevels && e.overrideLevels.length) for (const n of e.overrideLevels) this.root.push(new bu(n.num, n.start));
  }
}, yu = class extends ve {
  constructor(...e) {
    super(...e), ie(this, "xmlKeys", { ilvl: "w:ilvl" });
  }
}, bu = class extends ce {
  /**
  * Creates a new level override.
  *
  * @param levelNum - The level number to override (0-8)
  * @param start - Optional starting number for the level
  */
  constructor(e, n) {
    super("w:lvlOverride"), this.root.push(new yu({ ilvl: e })), n !== void 0 && this.root.push(new xu(n));
  }
}, _u = class extends ve {
  constructor(...e) {
    super(...e), ie(this, "xmlKeys", { val: "w:val" });
  }
}, xu = class extends ce {
  /**
  * Creates a new start override.
  *
  * @param start - The starting number
  */
  constructor(e) {
    super("w:startOverride"), this.root.push(new _u({ val: e }));
  }
}, Eu = class extends ce {
  /**
  * Creates a new numbering definition collection.
  *
  * Initializes the numbering with a default bullet list configuration and
  * any custom numbering configurations provided in the options.
  *
  * @param options - Configuration options for numbering definitions
  */
  constructor(e) {
    super("w:numbering"), ie(this, "abstractNumberingMap", /* @__PURE__ */ new Map()), ie(this, "concreteNumberingMap", /* @__PURE__ */ new Map()), ie(this, "referenceConfigMap", /* @__PURE__ */ new Map()), ie(this, "abstractNumUniqueNumericId", ro()), ie(this, "concreteNumUniqueNumericId", no()), this.root.push(new tr([
      "wpc",
      "mc",
      "o",
      "r",
      "m",
      "v",
      "wp14",
      "wp",
      "w10",
      "w",
      "w14",
      "w15",
      "wpg",
      "wpi",
      "wne",
      "wps"
    ], "w14 w15 wp14"));
    const n = new en(this.abstractNumUniqueNumericId(), [
      {
        level: 0,
        format: He.BULLET,
        text: "●",
        alignment: Ne.LEFT,
        style: { paragraph: { indent: {
          left: Pe(0.5),
          hanging: Pe(0.25)
        } } }
      },
      {
        level: 1,
        format: He.BULLET,
        text: "○",
        alignment: Ne.LEFT,
        style: { paragraph: { indent: {
          left: Pe(1),
          hanging: Pe(0.25)
        } } }
      },
      {
        level: 2,
        format: He.BULLET,
        text: "■",
        alignment: Ne.LEFT,
        style: { paragraph: { indent: {
          left: 2160,
          hanging: Pe(0.25)
        } } }
      },
      {
        level: 3,
        format: He.BULLET,
        text: "●",
        alignment: Ne.LEFT,
        style: { paragraph: { indent: {
          left: 2880,
          hanging: Pe(0.25)
        } } }
      },
      {
        level: 4,
        format: He.BULLET,
        text: "○",
        alignment: Ne.LEFT,
        style: { paragraph: { indent: {
          left: 3600,
          hanging: Pe(0.25)
        } } }
      },
      {
        level: 5,
        format: He.BULLET,
        text: "■",
        alignment: Ne.LEFT,
        style: { paragraph: { indent: {
          left: 4320,
          hanging: Pe(0.25)
        } } }
      },
      {
        level: 6,
        format: He.BULLET,
        text: "●",
        alignment: Ne.LEFT,
        style: { paragraph: { indent: {
          left: 5040,
          hanging: Pe(0.25)
        } } }
      },
      {
        level: 7,
        format: He.BULLET,
        text: "●",
        alignment: Ne.LEFT,
        style: { paragraph: { indent: {
          left: 5760,
          hanging: Pe(0.25)
        } } }
      },
      {
        level: 8,
        format: He.BULLET,
        text: "●",
        alignment: Ne.LEFT,
        style: { paragraph: { indent: {
          left: 6480,
          hanging: Pe(0.25)
        } } }
      }
    ]);
    this.concreteNumberingMap.set("default-bullet-numbering", new tn({
      numId: 1,
      abstractNumId: n.id,
      reference: "default-bullet-numbering",
      instance: 0,
      overrideLevels: [{
        num: 0,
        start: 1
      }]
    })), this.abstractNumberingMap.set("default-bullet-numbering", n);
    for (const t of e.config)
      this.abstractNumberingMap.set(t.reference, new en(this.abstractNumUniqueNumericId(), t.levels)), this.referenceConfigMap.set(t.reference, t.levels);
  }
  /**
  * Prepares the numbering definitions for XML serialization.
  *
  * Adds all abstract and concrete numbering definitions to the XML tree.
  *
  * @param context - The XML context
  * @returns The prepared XML object
  */
  prepForXml(e) {
    for (const n of this.abstractNumberingMap.values()) this.root.push(n);
    for (const n of this.concreteNumberingMap.values()) this.root.push(n);
    return super.prepForXml(e);
  }
  /**
  * Creates a concrete numbering instance from an abstract numbering definition.
  *
  * This method creates a new concrete numbering instance that references an
  * abstract numbering definition. It's used internally when paragraphs reference
  * numbering configurations.
  *
  * @param reference - The reference name of the abstract numbering definition
  * @param instance - The instance number for this concrete numbering
  */
  createConcreteNumberingInstance(e, n) {
    const t = this.abstractNumberingMap.get(e);
    if (!t) return;
    const u = `${e}-${n}`;
    if (this.concreteNumberingMap.has(u)) return;
    const l = this.referenceConfigMap.get(e), o = l && l[0].start, s = {
      numId: this.concreteNumUniqueNumericId(),
      abstractNumId: t.id,
      reference: e,
      instance: n,
      overrideLevels: [typeof o == "number" && Number.isInteger(o) ? {
        num: 0,
        start: o
      } : {
        num: 0,
        start: 1
      }]
    };
    this.concreteNumberingMap.set(u, new tn(s));
  }
  /**
  * Gets all concrete numbering instances.
  *
  * @returns An array of all concrete numbering instances
  */
  get ConcreteNumbering() {
    return Array.from(this.concreteNumberingMap.values());
  }
  /**
  * Gets all reference configurations.
  *
  * @returns An array of all numbering reference configurations
  */
  get ReferenceConfig() {
    return Array.from(this.referenceConfigMap.values());
  }
}, Su = (e) => new we({
  name: "w:compatSetting",
  attributes: {
    version: {
      key: "w:val",
      value: e
    },
    name: {
      key: "w:name",
      value: "compatibilityMode"
    },
    uri: {
      key: "w:uri",
      value: "http://schemas.microsoft.com/office/word"
    }
  }
}), Tu = class extends ce {
  constructor(e) {
    super("w:compat"), e.version && this.root.push(Su(e.version)), e.useSingleBorderforContiguousCells && this.root.push(new ue("w:useSingleBorderforContiguousCells", e.useSingleBorderforContiguousCells)), e.wordPerfectJustification && this.root.push(new ue("w:wpJustification", e.wordPerfectJustification)), e.noTabStopForHangingIndent && this.root.push(new ue("w:noTabHangInd", e.noTabStopForHangingIndent)), e.noLeading && this.root.push(new ue("w:noLeading", e.noLeading)), e.spaceForUnderline && this.root.push(new ue("w:spaceForUL", e.spaceForUnderline)), e.noColumnBalance && this.root.push(new ue("w:noColumnBalance", e.noColumnBalance)), e.balanceSingleByteDoubleByteWidth && this.root.push(new ue("w:balanceSingleByteDoubleByteWidth", e.balanceSingleByteDoubleByteWidth)), e.noExtraLineSpacing && this.root.push(new ue("w:noExtraLineSpacing", e.noExtraLineSpacing)), e.doNotLeaveBackslashAlone && this.root.push(new ue("w:doNotLeaveBackslashAlone", e.doNotLeaveBackslashAlone)), e.underlineTrailingSpaces && this.root.push(new ue("w:ulTrailSpace", e.underlineTrailingSpaces)), e.doNotExpandShiftReturn && this.root.push(new ue("w:doNotExpandShiftReturn", e.doNotExpandShiftReturn)), e.spacingInWholePoints && this.root.push(new ue("w:spacingInWholePoints", e.spacingInWholePoints)), e.lineWrapLikeWord6 && this.root.push(new ue("w:lineWrapLikeWord6", e.lineWrapLikeWord6)), e.printBodyTextBeforeHeader && this.root.push(new ue("w:printBodyTextBeforeHeader", e.printBodyTextBeforeHeader)), e.printColorsBlack && this.root.push(new ue("w:printColBlack", e.printColorsBlack)), e.spaceWidth && this.root.push(new ue("w:wpSpaceWidth", e.spaceWidth)), e.showBreaksInFrames && this.root.push(new ue("w:showBreaksInFrames", e.showBreaksInFrames)), e.subFontBySize && this.root.push(new ue("w:subFontBySize", e.subFontBySize)), e.suppressBottomSpacing && this.root.push(new ue("w:suppressBottomSpacing", e.suppressBottomSpacing)), e.suppressTopSpacing && this.root.push(new ue("w:suppressTopSpacing", e.suppressTopSpacing)), e.suppressSpacingAtTopOfPage && this.root.push(new ue("w:suppressSpacingAtTopOfPage", e.suppressSpacingAtTopOfPage)), e.suppressTopSpacingWP && this.root.push(new ue("w:suppressTopSpacingWP", e.suppressTopSpacingWP)), e.suppressSpBfAfterPgBrk && this.root.push(new ue("w:suppressSpBfAfterPgBrk", e.suppressSpBfAfterPgBrk)), e.swapBordersFacingPages && this.root.push(new ue("w:swapBordersFacingPages", e.swapBordersFacingPages)), e.convertMailMergeEsc && this.root.push(new ue("w:convMailMergeEsc", e.convertMailMergeEsc)), e.truncateFontHeightsLikeWP6 && this.root.push(new ue("w:truncateFontHeightsLikeWP6", e.truncateFontHeightsLikeWP6)), e.macWordSmallCaps && this.root.push(new ue("w:mwSmallCaps", e.macWordSmallCaps)), e.usePrinterMetrics && this.root.push(new ue("w:usePrinterMetrics", e.usePrinterMetrics)), e.doNotSuppressParagraphBorders && this.root.push(new ue("w:doNotSuppressParagraphBorders", e.doNotSuppressParagraphBorders)), e.wrapTrailSpaces && this.root.push(new ue("w:wrapTrailSpaces", e.wrapTrailSpaces)), e.footnoteLayoutLikeWW8 && this.root.push(new ue("w:footnoteLayoutLikeWW8", e.footnoteLayoutLikeWW8)), e.shapeLayoutLikeWW8 && this.root.push(new ue("w:shapeLayoutLikeWW8", e.shapeLayoutLikeWW8)), e.alignTablesRowByRow && this.root.push(new ue("w:alignTablesRowByRow", e.alignTablesRowByRow)), e.forgetLastTabAlignment && this.root.push(new ue("w:forgetLastTabAlignment", e.forgetLastTabAlignment)), e.adjustLineHeightInTable && this.root.push(new ue("w:adjustLineHeightInTable", e.adjustLineHeightInTable)), e.autoSpaceLikeWord95 && this.root.push(new ue("w:autoSpaceLikeWord95", e.autoSpaceLikeWord95)), e.noSpaceRaiseLower && this.root.push(new ue("w:noSpaceRaiseLower", e.noSpaceRaiseLower)), e.doNotUseHTMLParagraphAutoSpacing && this.root.push(new ue("w:doNotUseHTMLParagraphAutoSpacing", e.doNotUseHTMLParagraphAutoSpacing)), e.layoutRawTableWidth && this.root.push(new ue("w:layoutRawTableWidth", e.layoutRawTableWidth)), e.layoutTableRowsApart && this.root.push(new ue("w:layoutTableRowsApart", e.layoutTableRowsApart)), e.useWord97LineBreakRules && this.root.push(new ue("w:useWord97LineBreakRules", e.useWord97LineBreakRules)), e.doNotBreakWrappedTables && this.root.push(new ue("w:doNotBreakWrappedTables", e.doNotBreakWrappedTables)), e.doNotSnapToGridInCell && this.root.push(new ue("w:doNotSnapToGridInCell", e.doNotSnapToGridInCell)), e.selectFieldWithFirstOrLastCharacter && this.root.push(new ue("w:selectFldWithFirstOrLastChar", e.selectFieldWithFirstOrLastCharacter)), e.applyBreakingRules && this.root.push(new ue("w:applyBreakingRules", e.applyBreakingRules)), e.doNotWrapTextWithPunctuation && this.root.push(new ue("w:doNotWrapTextWithPunct", e.doNotWrapTextWithPunctuation)), e.doNotUseEastAsianBreakRules && this.root.push(new ue("w:doNotUseEastAsianBreakRules", e.doNotUseEastAsianBreakRules)), e.useWord2002TableStyleRules && this.root.push(new ue("w:useWord2002TableStyleRules", e.useWord2002TableStyleRules)), e.growAutofit && this.root.push(new ue("w:growAutofit", e.growAutofit)), e.useFELayout && this.root.push(new ue("w:useFELayout", e.useFELayout)), e.useNormalStyleForList && this.root.push(new ue("w:useNormalStyleForList", e.useNormalStyleForList)), e.doNotUseIndentAsNumberingTabStop && this.root.push(new ue("w:doNotUseIndentAsNumberingTabStop", e.doNotUseIndentAsNumberingTabStop)), e.useAlternateEastAsianLineBreakRules && this.root.push(new ue("w:useAltKinsokuLineBreakRules", e.useAlternateEastAsianLineBreakRules)), e.allowSpaceOfSameStyleInTable && this.root.push(new ue("w:allowSpaceOfSameStyleInTable", e.allowSpaceOfSameStyleInTable)), e.doNotSuppressIndentation && this.root.push(new ue("w:doNotSuppressIndentation", e.doNotSuppressIndentation)), e.doNotAutofitConstrainedTables && this.root.push(new ue("w:doNotAutofitConstrainedTables", e.doNotAutofitConstrainedTables)), e.autofitToFirstFixedWidthCell && this.root.push(new ue("w:autofitToFirstFixedWidthCell", e.autofitToFirstFixedWidthCell)), e.underlineTabInNumberingList && this.root.push(new ue("w:underlineTabInNumList", e.underlineTabInNumberingList)), e.displayHangulFixedWidth && this.root.push(new ue("w:displayHangulFixedWidth", e.displayHangulFixedWidth)), e.splitPgBreakAndParaMark && this.root.push(new ue("w:splitPgBreakAndParaMark", e.splitPgBreakAndParaMark)), e.doNotVerticallyAlignCellWithSp && this.root.push(new ue("w:doNotVertAlignCellWithSp", e.doNotVerticallyAlignCellWithSp)), e.doNotBreakConstrainedForcedTable && this.root.push(new ue("w:doNotBreakConstrainedForcedTable", e.doNotBreakConstrainedForcedTable)), e.ignoreVerticalAlignmentInTextboxes && this.root.push(new ue("w:doNotVertAlignInTxbx", e.ignoreVerticalAlignmentInTextboxes)), e.useAnsiKerningPairs && this.root.push(new ue("w:useAnsiKerningPairs", e.useAnsiKerningPairs)), e.cachedColumnBalance && this.root.push(new ue("w:cachedColBalance", e.cachedColumnBalance));
  }
}, Au = class extends ve {
  constructor(...e) {
    super(...e), ie(this, "xmlKeys", {
      wpc: "xmlns:wpc",
      mc: "xmlns:mc",
      o: "xmlns:o",
      r: "xmlns:r",
      m: "xmlns:m",
      v: "xmlns:v",
      wp14: "xmlns:wp14",
      wp: "xmlns:wp",
      w10: "xmlns:w10",
      w: "xmlns:w",
      w14: "xmlns:w14",
      w15: "xmlns:w15",
      wpg: "xmlns:wpg",
      wpi: "xmlns:wpi",
      wne: "xmlns:wne",
      wps: "xmlns:wps",
      Ignorable: "mc:Ignorable"
    });
  }
}, ku = class extends ce {
  constructor(e) {
    var n, t, u, l, o, s, a, d;
    super("w:settings"), this.root.push(new Au({
      wpc: "http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas",
      mc: "http://schemas.openxmlformats.org/markup-compatibility/2006",
      o: "urn:schemas-microsoft-com:office:office",
      r: "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
      m: "http://schemas.openxmlformats.org/officeDocument/2006/math",
      v: "urn:schemas-microsoft-com:vml",
      wp14: "http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing",
      wp: "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
      w10: "urn:schemas-microsoft-com:office:word",
      w: "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
      w14: "http://schemas.microsoft.com/office/word/2010/wordml",
      w15: "http://schemas.microsoft.com/office/word/2012/wordml",
      wpg: "http://schemas.microsoft.com/office/word/2010/wordprocessingGroup",
      wpi: "http://schemas.microsoft.com/office/word/2010/wordprocessingInk",
      wne: "http://schemas.microsoft.com/office/word/2006/wordml",
      wps: "http://schemas.microsoft.com/office/word/2010/wordprocessingShape",
      Ignorable: "w14 w15 wp14"
    })), this.root.push(new ue("w:displayBackgroundShape", !0)), e.trackRevisions !== void 0 && this.root.push(new ue("w:trackRevisions", e.trackRevisions)), e.evenAndOddHeaders !== void 0 && this.root.push(new ue("w:evenAndOddHeaders", e.evenAndOddHeaders)), e.updateFields !== void 0 && this.root.push(new ue("w:updateFields", e.updateFields)), e.defaultTabStop !== void 0 && this.root.push(new Ct("w:defaultTabStop", e.defaultTabStop)), ((n = e.hyphenation) === null || n === void 0 ? void 0 : n.autoHyphenation) !== void 0 && this.root.push(new ue("w:autoHyphenation", e.hyphenation.autoHyphenation)), ((t = e.hyphenation) === null || t === void 0 ? void 0 : t.hyphenationZone) !== void 0 && this.root.push(new Ct("w:hyphenationZone", e.hyphenation.hyphenationZone)), ((u = e.hyphenation) === null || u === void 0 ? void 0 : u.consecutiveHyphenLimit) !== void 0 && this.root.push(new Ct("w:consecutiveHyphenLimit", e.hyphenation.consecutiveHyphenLimit)), ((l = e.hyphenation) === null || l === void 0 ? void 0 : l.doNotHyphenateCaps) !== void 0 && this.root.push(new ue("w:doNotHyphenateCaps", e.hyphenation.doNotHyphenateCaps)), this.root.push(new Tu(pe(pe({}, (o = e.compatibility) !== null && o !== void 0 ? o : {}), {}, { version: (s = (a = (d = e.compatibility) === null || d === void 0 ? void 0 : d.version) !== null && a !== void 0 ? a : e.compatibilityModeVersion) !== null && s !== void 0 ? s : 15 })));
  }
}, ti = class extends ve {
  constructor(...e) {
    super(...e), ie(this, "xmlKeys", { val: "w:val" });
  }
}, Ru = class extends ce {
  constructor(e) {
    super("w:name"), this.root.push(new ti({ val: e }));
  }
}, Cu = class extends ce {
  constructor(e) {
    super("w:uiPriority"), this.root.push(new ti({ val: ke(e) }));
  }
}, Iu = class extends ve {
  constructor(...e) {
    super(...e), ie(this, "xmlKeys", {
      type: "w:type",
      styleId: "w:styleId",
      default: "w:default",
      customStyle: "w:customStyle"
    });
  }
}, ri = class extends ce {
  constructor(e, n) {
    super("w:style"), this.root.push(new Iu(e)), n.name && this.root.push(new Ru(n.name)), n.basedOn && this.root.push(new it("w:basedOn", n.basedOn)), n.next && this.root.push(new it("w:next", n.next)), n.link && this.root.push(new it("w:link", n.link)), n.uiPriority !== void 0 && this.root.push(new Cu(n.uiPriority)), n.semiHidden !== void 0 && this.root.push(new ue("w:semiHidden", n.semiHidden)), n.unhideWhenUsed !== void 0 && this.root.push(new ue("w:unhideWhenUsed", n.unhideWhenUsed)), n.quickFormat !== void 0 && this.root.push(new ue("w:qFormat", n.quickFormat));
  }
}, Bt = class extends ri {
  constructor(e) {
    super({
      type: "paragraph",
      styleId: e.id
    }, e), ie(this, "paragraphProperties", void 0), ie(this, "runProperties", void 0), this.paragraphProperties = new at(e.paragraph), this.runProperties = new ot(e.run), this.root.push(this.paragraphProperties), this.root.push(this.runProperties);
  }
}, bt = class extends ri {
  constructor(e) {
    super({
      type: "character",
      styleId: e.id
    }, pe({
      uiPriority: 99,
      unhideWhenUsed: !0
    }, e)), ie(this, "runProperties", void 0), this.runProperties = new ot(e.run), this.root.push(this.runProperties);
  }
}, Qe = class extends Bt {
  constructor(e) {
    super(pe({
      basedOn: "Normal",
      next: "Normal",
      quickFormat: !0
    }, e));
  }
}, Nu = class extends Qe {
  constructor(e) {
    super(pe({
      id: "Title",
      name: "Title"
    }, e));
  }
}, Ou = class extends Qe {
  constructor(e) {
    super(pe({
      id: "Heading1",
      name: "Heading 1"
    }, e));
  }
}, Fu = class extends Qe {
  constructor(e) {
    super(pe({
      id: "Heading2",
      name: "Heading 2"
    }, e));
  }
}, Pu = class extends Qe {
  constructor(e) {
    super(pe({
      id: "Heading3",
      name: "Heading 3"
    }, e));
  }
}, Du = class extends Qe {
  constructor(e) {
    super(pe({
      id: "Heading4",
      name: "Heading 4"
    }, e));
  }
}, Bu = class extends Qe {
  constructor(e) {
    super(pe({
      id: "Heading5",
      name: "Heading 5"
    }, e));
  }
}, Lu = class extends Qe {
  constructor(e) {
    super(pe({
      id: "Heading6",
      name: "Heading 6"
    }, e));
  }
}, Uu = class extends Qe {
  constructor(e) {
    super(pe({
      id: "Strong",
      name: "Strong"
    }, e));
  }
}, Mu = class extends Bt {
  constructor(e) {
    super(pe({
      id: "ListParagraph",
      name: "List Paragraph",
      basedOn: "Normal",
      quickFormat: !0
    }, e));
  }
}, ju = class extends Bt {
  constructor(e) {
    super(pe({
      id: "FootnoteText",
      name: "footnote text",
      link: "FootnoteTextChar",
      basedOn: "Normal",
      uiPriority: 99,
      semiHidden: !0,
      unhideWhenUsed: !0,
      paragraph: { spacing: {
        after: 0,
        line: 240,
        lineRule: mt.AUTO
      } },
      run: { size: 20 }
    }, e));
  }
}, zu = class extends bt {
  constructor(e) {
    super(pe({
      id: "FootnoteReference",
      name: "footnote reference",
      basedOn: "DefaultParagraphFont",
      semiHidden: !0,
      run: { superScript: !0 }
    }, e));
  }
}, Wu = class extends bt {
  constructor(e) {
    super(pe({
      id: "FootnoteTextChar",
      name: "Footnote Text Char",
      basedOn: "DefaultParagraphFont",
      link: "FootnoteText",
      semiHidden: !0,
      run: { size: 20 }
    }, e));
  }
}, Hu = class extends Bt {
  constructor(e) {
    super(pe({
      id: "EndnoteText",
      name: "endnote text",
      link: "EndnoteTextChar",
      basedOn: "Normal",
      uiPriority: 99,
      semiHidden: !0,
      unhideWhenUsed: !0,
      paragraph: { spacing: {
        after: 0,
        line: 240,
        lineRule: mt.AUTO
      } },
      run: { size: 20 }
    }, e));
  }
}, Ku = class extends bt {
  constructor(e) {
    super(pe({
      id: "EndnoteReference",
      name: "endnote reference",
      basedOn: "DefaultParagraphFont",
      semiHidden: !0,
      run: { superScript: !0 }
    }, e));
  }
}, Gu = class extends bt {
  constructor(e) {
    super(pe({
      id: "EndnoteTextChar",
      name: "Endnote Text Char",
      basedOn: "DefaultParagraphFont",
      link: "EndnoteText",
      semiHidden: !0,
      run: { size: 20 }
    }, e));
  }
}, qu = class extends bt {
  constructor(e) {
    super(pe({
      id: "Hyperlink",
      name: "Hyperlink",
      basedOn: "DefaultParagraphFont",
      run: {
        color: "0563C1",
        underline: { type: Bn.SINGLE }
      }
    }, e));
  }
}, dr = class extends ce {
  constructor(e) {
    if (super("w:styles"), e.initialStyles && this.root.push(e.initialStyles), e.importedStyles) for (const n of e.importedStyles) this.root.push(n);
    if (e.paragraphStyles) for (const n of e.paragraphStyles) this.root.push(new Bt(n));
    if (e.characterStyles) for (const n of e.characterStyles) this.root.push(new bt(n));
  }
}, Vu = class extends ce {
  constructor(e) {
    super("w:pPrDefault"), this.root.push(new at(e));
  }
}, $u = class extends ce {
  constructor(e) {
    super("w:rPrDefault"), this.root.push(new ot(e));
  }
}, Xu = class extends ce {
  constructor(e) {
    super("w:docDefaults"), ie(this, "runPropertiesDefaults", void 0), ie(this, "paragraphPropertiesDefaults", void 0), this.runPropertiesDefaults = new $u(e.run), this.paragraphPropertiesDefaults = new Vu(e.paragraph), this.root.push(this.runPropertiesDefaults), this.root.push(this.paragraphPropertiesDefaults);
  }
}, Zu = class {
  /**
  * Creates new Styles based on the given XML data.
  *
  * Parses the styles XML and converts them to XmlComponent instances.
  *
  * Example content from styles.xml:
  * ```xml
  * <?xml version="1.0"?>
  * <w:styles xmlns:mc="some schema" ...>
  *   <w:style w:type="paragraph" w:styleId="Heading1">
  *     <w:name w:val="heading 1"/>
  *     ...
  *   </w:style>
  *   <w:style w:type="paragraph" w:styleId="Heading2">
  *     <w:name w:val="heading 2"/>
  *     ...
  *   </w:style>
  *   <w:docDefaults>...</w:docDefaults>
  * </w:styles>
  * ```
  *
  * @param xmlData - XML string containing styles data from styles.xml
  * @returns Styles object containing all parsed styles
  * @throws Error if styles element cannot be found in the XML
  */
  newInstance(e) {
    const n = (0, Cn.xml2js)(e, { compact: !1 });
    let t;
    for (const l of n.elements || []) l.name === "w:styles" && (t = l);
    if (t === void 0) throw new Error("can not find styles element");
    const u = t.elements || [];
    return {
      initialStyles: new va(t.attributes),
      importedStyles: u.map((l) => Ir(l))
    };
  }
}, pr = class {
  newInstance(e = {}) {
    var n;
    return {
      initialStyles: new tr([
        "mc",
        "r",
        "w",
        "w14",
        "w15"
      ], "w14 w15"),
      importedStyles: [
        new Xu((n = e.document) !== null && n !== void 0 ? n : {}),
        new Nu(pe({ run: { size: 56 } }, e.title)),
        new Ou(pe({ run: {
          color: "2E74B5",
          size: 32
        } }, e.heading1)),
        new Fu(pe({ run: {
          color: "2E74B5",
          size: 26
        } }, e.heading2)),
        new Pu(pe({ run: {
          color: "1F4D78",
          size: 24
        } }, e.heading3)),
        new Du(pe({ run: {
          color: "2E74B5",
          italics: !0
        } }, e.heading4)),
        new Bu(pe({ run: { color: "2E74B5" } }, e.heading5)),
        new Lu(pe({ run: { color: "1F4D78" } }, e.heading6)),
        new Uu(pe({ run: { bold: !0 } }, e.strong)),
        new Mu(e.listParagraph || {}),
        new qu(e.hyperlink || {}),
        new zu(e.footnoteReference || {}),
        new ju(e.footnoteText || {}),
        new Wu(e.footnoteTextChar || {}),
        new Ku(e.endnoteReference || {}),
        new Hu(e.endnoteText || {}),
        new Gu(e.endnoteTextChar || {})
      ]
    };
  }
}, ni = class {
  constructor(e) {
    var n, t, u, l, o, s, a, d, g, v, b, R;
    if (ie(this, "currentRelationshipId", 1), ie(this, "documentWrapper", void 0), ie(this, "headers", []), ie(this, "footers", []), ie(this, "coreProperties", void 0), ie(this, "numbering", void 0), ie(this, "media", void 0), ie(this, "fileRelationships", void 0), ie(this, "footnotesWrapper", void 0), ie(this, "endnotesWrapper", void 0), ie(this, "settings", void 0), ie(this, "contentTypes", void 0), ie(this, "customProperties", void 0), ie(this, "appProperties", void 0), ie(this, "styles", void 0), ie(this, "comments", void 0), ie(
      this,
      /** Extended comment data for reply threading and resolved state (word/commentsExtended.xml). */
      "commentsExtended",
      void 0
    ), ie(this, "fontWrapper", void 0), this.coreProperties = new vs(pe(pe({}, e), {}, {
      creator: (n = e.creator) !== null && n !== void 0 ? n : "Un-named",
      revision: (t = e.revision) !== null && t !== void 0 ? t : 1,
      lastModifiedBy: (u = e.lastModifiedBy) !== null && u !== void 0 ? u : "Un-named"
    })), this.numbering = new Eu(e.numbering ? e.numbering : { config: [] }), this.comments = new po((l = e.comments) !== null && l !== void 0 ? l : { children: [] }), this.comments.ThreadData && (this.commentsExtended = new vo(this.comments.ThreadData)), this.fileRelationships = new Je(), this.customProperties = new Ss((o = e.customProperties) !== null && o !== void 0 ? o : []), this.appProperties = new ms(), this.footnotesWrapper = new ru(), this.endnotesWrapper = new Vs(), this.contentTypes = new gs(), this.documentWrapper = new js({ background: e.background }), this.settings = new ku({
      compatibilityModeVersion: e.compatabilityModeVersion,
      compatibility: e.compatibility,
      evenAndOddHeaders: !!e.evenAndOddHeaderAndFooters,
      trackRevisions: (s = e.features) === null || s === void 0 ? void 0 : s.trackRevisions,
      updateFields: (a = e.features) === null || a === void 0 ? void 0 : a.updateFields,
      defaultTabStop: e.defaultTabStop,
      hyphenation: {
        autoHyphenation: (d = e.hyphenation) === null || d === void 0 ? void 0 : d.autoHyphenation,
        hyphenationZone: (g = e.hyphenation) === null || g === void 0 ? void 0 : g.hyphenationZone,
        consecutiveHyphenLimit: (v = e.hyphenation) === null || v === void 0 ? void 0 : v.consecutiveHyphenLimit,
        doNotHyphenateCaps: (b = e.hyphenation) === null || b === void 0 ? void 0 : b.doNotHyphenateCaps
      }
    }), this.media = new ou(), e.externalStyles !== void 0) {
      var m;
      const w = new pr().newInstance((m = e.styles) === null || m === void 0 ? void 0 : m.default), y = new Zu().newInstance(e.externalStyles);
      this.styles = new dr(pe(pe({}, y), {}, { importedStyles: [...w.importedStyles, ...y.importedStyles] }));
    } else if (e.styles) {
      const w = new pr().newInstance(e.styles.default);
      this.styles = new dr(pe(pe({}, w), e.styles));
    } else {
      const w = new pr();
      this.styles = new dr(w.newInstance());
    }
    this.addDefaultRelationships();
    for (const w of e.sections) this.addSection(w);
    if (e.footnotes) for (const w in e.footnotes) this.footnotesWrapper.View.createFootNote(parseFloat(w), e.footnotes[w].children);
    if (e.endnotes) for (const w in e.endnotes) this.endnotesWrapper.View.createEndnote(parseFloat(w), e.endnotes[w].children);
    this.fontWrapper = new zn((R = e.fonts) !== null && R !== void 0 ? R : []);
  }
  addSection({ headers: e = {}, footers: n = {}, children: t, properties: u }) {
    this.documentWrapper.View.Body.addSection(pe(pe({}, u), {}, {
      headerWrapperGroup: {
        default: e.default ? this.createHeader(e.default) : void 0,
        first: e.first ? this.createHeader(e.first) : void 0,
        even: e.even ? this.createHeader(e.even) : void 0
      },
      footerWrapperGroup: {
        default: n.default ? this.createFooter(n.default) : void 0,
        first: n.first ? this.createFooter(n.first) : void 0,
        even: n.even ? this.createFooter(n.even) : void 0
      }
    }));
    for (const l of t) this.documentWrapper.View.add(l);
  }
  createHeader(e) {
    const n = new au(this.media, this.currentRelationshipId++);
    for (const t of e.options.children) n.add(t);
    return this.addHeaderToDocument(n), n;
  }
  createFooter(e) {
    const n = new Zs(this.media, this.currentRelationshipId++);
    for (const t of e.options.children) n.add(t);
    return this.addFooterToDocument(n), n;
  }
  addHeaderToDocument(e, n = ct.DEFAULT) {
    this.headers.push({
      header: e,
      type: n
    }), this.documentWrapper.Relationships.addRelationship(e.View.ReferenceId, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/header", `header${this.headers.length}.xml`), this.contentTypes.addHeader(this.headers.length);
  }
  addFooterToDocument(e, n = ct.DEFAULT) {
    this.footers.push({
      footer: e,
      type: n
    }), this.documentWrapper.Relationships.addRelationship(e.View.ReferenceId, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer", `footer${this.footers.length}.xml`), this.contentTypes.addFooter(this.footers.length);
  }
  addDefaultRelationships() {
    this.fileRelationships.addRelationship(1, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument", "word/document.xml"), this.fileRelationships.addRelationship(2, "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties", "docProps/core.xml"), this.fileRelationships.addRelationship(3, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties", "docProps/app.xml"), this.fileRelationships.addRelationship(4, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/custom-properties", "docProps/custom.xml"), this.documentWrapper.Relationships.addRelationship(this.currentRelationshipId++, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles", "styles.xml"), this.documentWrapper.Relationships.addRelationship(this.currentRelationshipId++, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering", "numbering.xml"), this.documentWrapper.Relationships.addRelationship(this.currentRelationshipId++, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes", "footnotes.xml"), this.documentWrapper.Relationships.addRelationship(this.currentRelationshipId++, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/endnotes", "endnotes.xml"), this.documentWrapper.Relationships.addRelationship(this.currentRelationshipId++, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings", "settings.xml"), this.documentWrapper.Relationships.addRelationship(this.currentRelationshipId++, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments", "comments.xml"), this.commentsExtended && (this.documentWrapper.Relationships.addRelationship(this.currentRelationshipId++, "http://schemas.microsoft.com/office/2011/relationships/commentsExtended", "commentsExtended.xml"), this.contentTypes.addCommentsExtended());
  }
  get Document() {
    return this.documentWrapper;
  }
  get Styles() {
    return this.styles;
  }
  get CoreProperties() {
    return this.coreProperties;
  }
  get Numbering() {
    return this.numbering;
  }
  get Media() {
    return this.media;
  }
  get FileRelationships() {
    return this.fileRelationships;
  }
  get Headers() {
    return this.headers.map((e) => e.header);
  }
  get Footers() {
    return this.footers.map((e) => e.footer);
  }
  get ContentTypes() {
    return this.contentTypes;
  }
  get CustomProperties() {
    return this.customProperties;
  }
  get AppProperties() {
    return this.appProperties;
  }
  get FootNotes() {
    return this.footnotesWrapper;
  }
  get Endnotes() {
    return this.endnotesWrapper;
  }
  get Settings() {
    return this.settings;
  }
  get Comments() {
    return this.comments;
  }
  /** Extended comments part for reply threading. Undefined when no comment threads exist. */
  get CommentsExtended() {
    return this.commentsExtended;
  }
  get FontTable() {
    return this.fontWrapper;
  }
}, Yu = /* @__PURE__ */ le(((e, n) => {
  vt(), Ye();
  /*!
  
  JSZip v3.10.1 - A JavaScript class for generating and reading zip files
  <http://stuartk.com/jszip>
  
  (c) 2009-2016 Stuart Knightley <stuart [at] stuartk.com>
  Dual licenced under the MIT license or GPLv3. See https://raw.github.com/Stuk/jszip/main/LICENSE.markdown.
  
  JSZip uses the library pako released under the MIT license :
  https://github.com/nodeca/pako/blob/main/LICENSE
  */
  (function(t) {
    typeof e == "object" && typeof n < "u" ? n.exports = t() : typeof define == "function" && define.amd ? define([], t) : (typeof window < "u" ? window : typeof Ce < "u" ? Ce : typeof self < "u" ? self : this).JSZip = t();
  })(function() {
    return (function t(u, l, o) {
      function s(g, v) {
        if (!l[g]) {
          if (!u[g]) {
            var b = typeof jt == "function" && jt;
            if (!v && b) return b(g, !0);
            if (a) return a(g, !0);
            var R = /* @__PURE__ */ new Error("Cannot find module '" + g + "'");
            throw R.code = "MODULE_NOT_FOUND", R;
          }
          var m = l[g] = { exports: {} };
          u[g][0].call(m.exports, function(w) {
            var y = u[g][1][w];
            return s(y || w);
          }, m, m.exports, t, u, l, o);
        }
        return l[g].exports;
      }
      for (var a = typeof jt == "function" && jt, d = 0; d < o.length; d++) s(o[d]);
      return s;
    })({
      1: [function(t, u, l) {
        var o = t("./utils"), s = t("./support"), a = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        l.encode = function(d) {
          for (var g, v, b, R, m, w, y, k = [], N = 0, _ = d.length, x = _, A = o.getTypeOf(d) !== "string"; N < d.length; ) x = _ - N, b = A ? (g = d[N++], v = N < _ ? d[N++] : 0, N < _ ? d[N++] : 0) : (g = d.charCodeAt(N++), v = N < _ ? d.charCodeAt(N++) : 0, N < _ ? d.charCodeAt(N++) : 0), R = g >> 2, m = (3 & g) << 4 | v >> 4, w = 1 < x ? (15 & v) << 2 | b >> 6 : 64, y = 2 < x ? 63 & b : 64, k.push(a.charAt(R) + a.charAt(m) + a.charAt(w) + a.charAt(y));
          return k.join("");
        }, l.decode = function(d) {
          var g, v, b, R, m, w, y = 0, k = 0, N = "data:";
          if (d.substr(0, N.length) === N) throw new Error("Invalid base64 input, it looks like a data url.");
          var _, x = 3 * (d = d.replace(/[^A-Za-z0-9+/=]/g, "")).length / 4;
          if (d.charAt(d.length - 1) === a.charAt(64) && x--, d.charAt(d.length - 2) === a.charAt(64) && x--, x % 1 != 0) throw new Error("Invalid base64 input, bad content length.");
          for (_ = s.uint8array ? new Uint8Array(0 | x) : new Array(0 | x); y < d.length; ) g = a.indexOf(d.charAt(y++)) << 2 | (R = a.indexOf(d.charAt(y++))) >> 4, v = (15 & R) << 4 | (m = a.indexOf(d.charAt(y++))) >> 2, b = (3 & m) << 6 | (w = a.indexOf(d.charAt(y++))), _[k++] = g, m !== 64 && (_[k++] = v), w !== 64 && (_[k++] = b);
          return _;
        };
      }, {
        "./support": 30,
        "./utils": 32
      }],
      2: [function(t, u, l) {
        var o = t("./external"), s = t("./stream/DataWorker"), a = t("./stream/Crc32Probe"), d = t("./stream/DataLengthProbe");
        function g(v, b, R, m, w) {
          this.compressedSize = v, this.uncompressedSize = b, this.crc32 = R, this.compression = m, this.compressedContent = w;
        }
        g.prototype = {
          getContentWorker: function() {
            var v = new s(o.Promise.resolve(this.compressedContent)).pipe(this.compression.uncompressWorker()).pipe(new d("data_length")), b = this;
            return v.on("end", function() {
              if (this.streamInfo.data_length !== b.uncompressedSize) throw new Error("Bug : uncompressed data size mismatch");
            }), v;
          },
          getCompressedWorker: function() {
            return new s(o.Promise.resolve(this.compressedContent)).withStreamInfo("compressedSize", this.compressedSize).withStreamInfo("uncompressedSize", this.uncompressedSize).withStreamInfo("crc32", this.crc32).withStreamInfo("compression", this.compression);
          }
        }, g.createWorkerFrom = function(v, b, R) {
          return v.pipe(new a()).pipe(new d("uncompressedSize")).pipe(b.compressWorker(R)).pipe(new d("compressedSize")).withStreamInfo("compression", b);
        }, u.exports = g;
      }, {
        "./external": 6,
        "./stream/Crc32Probe": 25,
        "./stream/DataLengthProbe": 26,
        "./stream/DataWorker": 27
      }],
      3: [function(t, u, l) {
        var o = t("./stream/GenericWorker");
        l.STORE = {
          magic: "\0\0",
          compressWorker: function() {
            return new o("STORE compression");
          },
          uncompressWorker: function() {
            return new o("STORE decompression");
          }
        }, l.DEFLATE = t("./flate");
      }, {
        "./flate": 7,
        "./stream/GenericWorker": 28
      }],
      4: [function(t, u, l) {
        var o = t("./utils"), s = (function() {
          for (var a, d = [], g = 0; g < 256; g++) {
            a = g;
            for (var v = 0; v < 8; v++) a = 1 & a ? 3988292384 ^ a >>> 1 : a >>> 1;
            d[g] = a;
          }
          return d;
        })();
        u.exports = function(a, d) {
          return a !== void 0 && a.length ? o.getTypeOf(a) !== "string" ? (function(g, v, b, R) {
            var m = s, w = R + b;
            g ^= -1;
            for (var y = R; y < w; y++) g = g >>> 8 ^ m[255 & (g ^ v[y])];
            return -1 ^ g;
          })(0 | d, a, a.length, 0) : (function(g, v, b, R) {
            var m = s, w = R + b;
            g ^= -1;
            for (var y = R; y < w; y++) g = g >>> 8 ^ m[255 & (g ^ v.charCodeAt(y))];
            return -1 ^ g;
          })(0 | d, a, a.length, 0) : 0;
        };
      }, { "./utils": 32 }],
      5: [function(t, u, l) {
        l.base64 = !1, l.binary = !1, l.dir = !1, l.createFolders = !0, l.date = null, l.compression = null, l.compressionOptions = null, l.comment = null, l.unixPermissions = null, l.dosPermissions = null;
      }, {}],
      6: [function(t, u, l) {
        var o = null;
        o = typeof Promise < "u" ? Promise : t("lie"), u.exports = { Promise: o };
      }, { lie: 37 }],
      7: [function(t, u, l) {
        var o = typeof Uint8Array < "u" && typeof Uint16Array < "u" && typeof Uint32Array < "u", s = t("pako"), a = t("./utils"), d = t("./stream/GenericWorker"), g = o ? "uint8array" : "array";
        function v(b, R) {
          d.call(this, "FlateWorker/" + b), this._pako = null, this._pakoAction = b, this._pakoOptions = R, this.meta = {};
        }
        l.magic = "\b\0", a.inherits(v, d), v.prototype.processChunk = function(b) {
          this.meta = b.meta, this._pako === null && this._createPako(), this._pako.push(a.transformTo(g, b.data), !1);
        }, v.prototype.flush = function() {
          d.prototype.flush.call(this), this._pako === null && this._createPako(), this._pako.push([], !0);
        }, v.prototype.cleanUp = function() {
          d.prototype.cleanUp.call(this), this._pako = null;
        }, v.prototype._createPako = function() {
          this._pako = new s[this._pakoAction]({
            raw: !0,
            level: this._pakoOptions.level || -1
          });
          var b = this;
          this._pako.onData = function(R) {
            b.push({
              data: R,
              meta: b.meta
            });
          };
        }, l.compressWorker = function(b) {
          return new v("Deflate", b);
        }, l.uncompressWorker = function() {
          return new v("Inflate", {});
        };
      }, {
        "./stream/GenericWorker": 28,
        "./utils": 32,
        pako: 38
      }],
      8: [function(t, u, l) {
        function o(m, w) {
          var y, k = "";
          for (y = 0; y < w; y++) k += String.fromCharCode(255 & m), m >>>= 8;
          return k;
        }
        function s(m, w, y, k, N, _) {
          var x, A, S = m.file, p = m.compression, F = _ !== g.utf8encode, M = a.transformTo("string", _(S.name)), I = a.transformTo("string", g.utf8encode(S.name)), q = S.comment, Q = a.transformTo("string", _(q)), O = a.transformTo("string", g.utf8encode(q)), W = I.length !== S.name.length, T = O.length !== q.length, H = "", J = "", $ = "", oe = S.dir, Z = S.date, ee = {
            crc32: 0,
            compressedSize: 0,
            uncompressedSize: 0
          };
          w && !y || (ee.crc32 = m.crc32, ee.compressedSize = m.compressedSize, ee.uncompressedSize = m.uncompressedSize);
          var V = 0;
          w && (V |= 8), F || !W && !T || (V |= 2048);
          var P = 0, X = 0;
          oe && (P |= 16), N === "UNIX" ? (X = 798, P |= (function(te, fe) {
            var E = te;
            return te || (E = fe ? 16893 : 33204), (65535 & E) << 16;
          })(S.unixPermissions, oe)) : (X = 20, P |= (function(te) {
            return 63 & (te || 0);
          })(S.dosPermissions)), x = Z.getUTCHours(), x <<= 6, x |= Z.getUTCMinutes(), x <<= 5, x |= Z.getUTCSeconds() / 2, A = Z.getUTCFullYear() - 1980, A <<= 4, A |= Z.getUTCMonth() + 1, A <<= 5, A |= Z.getUTCDate(), W && (J = o(1, 1) + o(v(M), 4) + I, H += "up" + o(J.length, 2) + J), T && ($ = o(1, 1) + o(v(Q), 4) + O, H += "uc" + o($.length, 2) + $);
          var Y = "";
          return Y += `
\0`, Y += o(V, 2), Y += p.magic, Y += o(x, 2), Y += o(A, 2), Y += o(ee.crc32, 4), Y += o(ee.compressedSize, 4), Y += o(ee.uncompressedSize, 4), Y += o(M.length, 2), Y += o(H.length, 2), {
            fileRecord: b.LOCAL_FILE_HEADER + Y + M + H,
            dirRecord: b.CENTRAL_FILE_HEADER + o(X, 2) + Y + o(Q.length, 2) + "\0\0\0\0" + o(P, 4) + o(k, 4) + M + H + Q
          };
        }
        var a = t("../utils"), d = t("../stream/GenericWorker"), g = t("../utf8"), v = t("../crc32"), b = t("../signature");
        function R(m, w, y, k) {
          d.call(this, "ZipFileWorker"), this.bytesWritten = 0, this.zipComment = w, this.zipPlatform = y, this.encodeFileName = k, this.streamFiles = m, this.accumulate = !1, this.contentBuffer = [], this.dirRecords = [], this.currentSourceOffset = 0, this.entriesCount = 0, this.currentFile = null, this._sources = [];
        }
        a.inherits(R, d), R.prototype.push = function(m) {
          var w = m.meta.percent || 0, y = this.entriesCount, k = this._sources.length;
          this.accumulate ? this.contentBuffer.push(m) : (this.bytesWritten += m.data.length, d.prototype.push.call(this, {
            data: m.data,
            meta: {
              currentFile: this.currentFile,
              percent: y ? (w + 100 * (y - k - 1)) / y : 100
            }
          }));
        }, R.prototype.openedSource = function(m) {
          this.currentSourceOffset = this.bytesWritten, this.currentFile = m.file.name;
          var w = this.streamFiles && !m.file.dir;
          if (w) {
            var y = s(m, w, !1, this.currentSourceOffset, this.zipPlatform, this.encodeFileName);
            this.push({
              data: y.fileRecord,
              meta: { percent: 0 }
            });
          } else this.accumulate = !0;
        }, R.prototype.closedSource = function(m) {
          this.accumulate = !1;
          var w = this.streamFiles && !m.file.dir, y = s(m, w, !0, this.currentSourceOffset, this.zipPlatform, this.encodeFileName);
          if (this.dirRecords.push(y.dirRecord), w) this.push({
            data: (function(k) {
              return b.DATA_DESCRIPTOR + o(k.crc32, 4) + o(k.compressedSize, 4) + o(k.uncompressedSize, 4);
            })(m),
            meta: { percent: 100 }
          });
          else for (this.push({
            data: y.fileRecord,
            meta: { percent: 0 }
          }); this.contentBuffer.length; ) this.push(this.contentBuffer.shift());
          this.currentFile = null;
        }, R.prototype.flush = function() {
          for (var m = this.bytesWritten, w = 0; w < this.dirRecords.length; w++) this.push({
            data: this.dirRecords[w],
            meta: { percent: 100 }
          });
          var y = this.bytesWritten - m, k = (function(N, _, x, A, S) {
            var p = a.transformTo("string", S(A));
            return b.CENTRAL_DIRECTORY_END + "\0\0\0\0" + o(N, 2) + o(N, 2) + o(_, 4) + o(x, 4) + o(p.length, 2) + p;
          })(this.dirRecords.length, y, m, this.zipComment, this.encodeFileName);
          this.push({
            data: k,
            meta: { percent: 100 }
          });
        }, R.prototype.prepareNextSource = function() {
          this.previous = this._sources.shift(), this.openedSource(this.previous.streamInfo), this.isPaused ? this.previous.pause() : this.previous.resume();
        }, R.prototype.registerPrevious = function(m) {
          this._sources.push(m);
          var w = this;
          return m.on("data", function(y) {
            w.processChunk(y);
          }), m.on("end", function() {
            w.closedSource(w.previous.streamInfo), w._sources.length ? w.prepareNextSource() : w.end();
          }), m.on("error", function(y) {
            w.error(y);
          }), this;
        }, R.prototype.resume = function() {
          return !!d.prototype.resume.call(this) && (!this.previous && this._sources.length ? (this.prepareNextSource(), !0) : this.previous || this._sources.length || this.generatedError ? void 0 : (this.end(), !0));
        }, R.prototype.error = function(m) {
          var w = this._sources;
          if (!d.prototype.error.call(this, m)) return !1;
          for (var y = 0; y < w.length; y++) try {
            w[y].error(m);
          } catch {
          }
          return !0;
        }, R.prototype.lock = function() {
          d.prototype.lock.call(this);
          for (var m = this._sources, w = 0; w < m.length; w++) m[w].lock();
        }, u.exports = R;
      }, {
        "../crc32": 4,
        "../signature": 23,
        "../stream/GenericWorker": 28,
        "../utf8": 31,
        "../utils": 32
      }],
      9: [function(t, u, l) {
        var o = t("../compressions"), s = t("./ZipFileWorker");
        l.generateWorker = function(a, d, g) {
          var v = new s(d.streamFiles, g, d.platform, d.encodeFileName), b = 0;
          try {
            a.forEach(function(R, m) {
              b++;
              var w = (function(_, x) {
                var A = _ || x, S = o[A];
                if (!S) throw new Error(A + " is not a valid compression method !");
                return S;
              })(m.options.compression, d.compression), y = m.options.compressionOptions || d.compressionOptions || {}, k = m.dir, N = m.date;
              m._compressWorker(w, y).withStreamInfo("file", {
                name: R,
                dir: k,
                date: N,
                comment: m.comment || "",
                unixPermissions: m.unixPermissions,
                dosPermissions: m.dosPermissions
              }).pipe(v);
            }), v.entriesCount = b;
          } catch (R) {
            v.error(R);
          }
          return v;
        };
      }, {
        "../compressions": 3,
        "./ZipFileWorker": 8
      }],
      10: [function(t, u, l) {
        function o() {
          if (!(this instanceof o)) return new o();
          if (arguments.length) throw new Error("The constructor with parameters has been removed in JSZip 3.0, please check the upgrade guide.");
          this.files = /* @__PURE__ */ Object.create(null), this.comment = null, this.root = "", this.clone = function() {
            var s = new o();
            for (var a in this) typeof this[a] != "function" && (s[a] = this[a]);
            return s;
          };
        }
        (o.prototype = t("./object")).loadAsync = t("./load"), o.support = t("./support"), o.defaults = t("./defaults"), o.version = "3.10.1", o.loadAsync = function(s, a) {
          return new o().loadAsync(s, a);
        }, o.external = t("./external"), u.exports = o;
      }, {
        "./defaults": 5,
        "./external": 6,
        "./load": 11,
        "./object": 15,
        "./support": 30
      }],
      11: [function(t, u, l) {
        var o = t("./utils"), s = t("./external"), a = t("./utf8"), d = t("./zipEntries"), g = t("./stream/Crc32Probe"), v = t("./nodejsUtils");
        function b(R) {
          return new s.Promise(function(m, w) {
            var y = R.decompressed.getContentWorker().pipe(new g());
            y.on("error", function(k) {
              w(k);
            }).on("end", function() {
              y.streamInfo.crc32 !== R.decompressed.crc32 ? w(/* @__PURE__ */ new Error("Corrupted zip : CRC32 mismatch")) : m();
            }).resume();
          });
        }
        u.exports = function(R, m) {
          var w = this;
          return m = o.extend(m || {}, {
            base64: !1,
            checkCRC32: !1,
            optimizedBinaryString: !1,
            createFolders: !1,
            decodeFileName: a.utf8decode
          }), v.isNode && v.isStream(R) ? s.Promise.reject(/* @__PURE__ */ new Error("JSZip can't accept a stream when loading a zip file.")) : o.prepareContent("the loaded zip file", R, !0, m.optimizedBinaryString, m.base64).then(function(y) {
            var k = new d(m);
            return k.load(y), k;
          }).then(function(y) {
            var k = [s.Promise.resolve(y)], N = y.files;
            if (m.checkCRC32) for (var _ = 0; _ < N.length; _++) k.push(b(N[_]));
            return s.Promise.all(k);
          }).then(function(y) {
            for (var k = y.shift(), N = k.files, _ = 0; _ < N.length; _++) {
              var x = N[_], A = x.fileNameStr, S = o.resolve(x.fileNameStr);
              w.file(S, x.decompressed, {
                binary: !0,
                optimizedBinaryString: !0,
                date: x.date,
                dir: x.dir,
                comment: x.fileCommentStr.length ? x.fileCommentStr : null,
                unixPermissions: x.unixPermissions,
                dosPermissions: x.dosPermissions,
                createFolders: m.createFolders
              }), x.dir || (w.file(S).unsafeOriginalName = A);
            }
            return k.zipComment.length && (w.comment = k.zipComment), w;
          });
        };
      }, {
        "./external": 6,
        "./nodejsUtils": 14,
        "./stream/Crc32Probe": 25,
        "./utf8": 31,
        "./utils": 32,
        "./zipEntries": 33
      }],
      12: [function(t, u, l) {
        var o = t("../utils"), s = t("../stream/GenericWorker");
        function a(d, g) {
          s.call(this, "Nodejs stream input adapter for " + d), this._upstreamEnded = !1, this._bindStream(g);
        }
        o.inherits(a, s), a.prototype._bindStream = function(d) {
          var g = this;
          (this._stream = d).pause(), d.on("data", function(v) {
            g.push({
              data: v,
              meta: { percent: 0 }
            });
          }).on("error", function(v) {
            g.isPaused ? this.generatedError = v : g.error(v);
          }).on("end", function() {
            g.isPaused ? g._upstreamEnded = !0 : g.end();
          });
        }, a.prototype.pause = function() {
          return !!s.prototype.pause.call(this) && (this._stream.pause(), !0);
        }, a.prototype.resume = function() {
          return !!s.prototype.resume.call(this) && (this._upstreamEnded ? this.end() : this._stream.resume(), !0);
        }, u.exports = a;
      }, {
        "../stream/GenericWorker": 28,
        "../utils": 32
      }],
      13: [function(t, u, l) {
        var o = t("readable-stream").Readable;
        function s(a, d, g) {
          o.call(this, d), this._helper = a;
          var v = this;
          a.on("data", function(b, R) {
            v.push(b) || v._helper.pause(), g && g(R);
          }).on("error", function(b) {
            v.emit("error", b);
          }).on("end", function() {
            v.push(null);
          });
        }
        t("../utils").inherits(s, o), s.prototype._read = function() {
          this._helper.resume();
        }, u.exports = s;
      }, {
        "../utils": 32,
        "readable-stream": 16
      }],
      14: [function(t, u, l) {
        u.exports = {
          isNode: typeof Buffer < "u",
          newBufferFrom: function(o, s) {
            if (Buffer.from && Buffer.from !== Uint8Array.from) return Buffer.from(o, s);
            if (typeof o == "number") throw new Error('The "data" argument must not be a number');
            return new Buffer(o, s);
          },
          allocBuffer: function(o) {
            if (Buffer.alloc) return Buffer.alloc(o);
            var s = new Buffer(o);
            return s.fill(0), s;
          },
          isBuffer: function(o) {
            return Buffer.isBuffer(o);
          },
          isStream: function(o) {
            return o && typeof o.on == "function" && typeof o.pause == "function" && typeof o.resume == "function";
          }
        };
      }, {}],
      15: [function(t, u, l) {
        function o(A, S, p) {
          var F, M = a.getTypeOf(S), I = a.extend(p || {}, v);
          I.date = I.date || /* @__PURE__ */ new Date(), I.compression !== null && (I.compression = I.compression.toUpperCase()), typeof I.unixPermissions == "string" && (I.unixPermissions = parseInt(I.unixPermissions, 8)), I.unixPermissions && 16384 & I.unixPermissions && (I.dir = !0), I.dosPermissions && 16 & I.dosPermissions && (I.dir = !0), I.dir && (A = N(A)), I.createFolders && (F = k(A)) && _.call(this, F, !0);
          var q = M === "string" && I.binary === !1 && I.base64 === !1;
          p && p.binary !== void 0 || (I.binary = !q), (S instanceof b && S.uncompressedSize === 0 || I.dir || !S || S.length === 0) && (I.base64 = !1, I.binary = !0, S = "", I.compression = "STORE", M = "string");
          var Q = null;
          Q = S instanceof b || S instanceof d ? S : w.isNode && w.isStream(S) ? new y(A, S) : a.prepareContent(A, S, I.binary, I.optimizedBinaryString, I.base64);
          var O = new R(A, Q, I);
          this.files[A] = O;
        }
        var s = t("./utf8"), a = t("./utils"), d = t("./stream/GenericWorker"), g = t("./stream/StreamHelper"), v = t("./defaults"), b = t("./compressedObject"), R = t("./zipObject"), m = t("./generate"), w = t("./nodejsUtils"), y = t("./nodejs/NodejsStreamInputAdapter"), k = function(A) {
          A.slice(-1) === "/" && (A = A.substring(0, A.length - 1));
          var S = A.lastIndexOf("/");
          return 0 < S ? A.substring(0, S) : "";
        }, N = function(A) {
          return A.slice(-1) !== "/" && (A += "/"), A;
        }, _ = function(A, S) {
          return S = S !== void 0 ? S : v.createFolders, A = N(A), this.files[A] || o.call(this, A, null, {
            dir: !0,
            createFolders: S
          }), this.files[A];
        };
        function x(A) {
          return Object.prototype.toString.call(A) === "[object RegExp]";
        }
        u.exports = {
          load: function() {
            throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
          },
          forEach: function(A) {
            var S, p, F;
            for (S in this.files) F = this.files[S], (p = S.slice(this.root.length, S.length)) && S.slice(0, this.root.length) === this.root && A(p, F);
          },
          filter: function(A) {
            var S = [];
            return this.forEach(function(p, F) {
              A(p, F) && S.push(F);
            }), S;
          },
          file: function(A, S, p) {
            if (arguments.length !== 1) return A = this.root + A, o.call(this, A, S, p), this;
            if (x(A)) {
              var F = A;
              return this.filter(function(I, q) {
                return !q.dir && F.test(I);
              });
            }
            var M = this.files[this.root + A];
            return M && !M.dir ? M : null;
          },
          folder: function(A) {
            if (!A) return this;
            if (x(A)) return this.filter(function(M, I) {
              return I.dir && A.test(M);
            });
            var S = this.root + A, p = _.call(this, S), F = this.clone();
            return F.root = p.name, F;
          },
          remove: function(A) {
            A = this.root + A;
            var S = this.files[A];
            if (S || (A.slice(-1) !== "/" && (A += "/"), S = this.files[A]), S && !S.dir) delete this.files[A];
            else for (var p = this.filter(function(M, I) {
              return I.name.slice(0, A.length) === A;
            }), F = 0; F < p.length; F++) delete this.files[p[F].name];
            return this;
          },
          generate: function() {
            throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
          },
          generateInternalStream: function(A) {
            var S, p = {};
            try {
              if ((p = a.extend(A || {}, {
                streamFiles: !1,
                compression: "STORE",
                compressionOptions: null,
                type: "",
                platform: "DOS",
                comment: null,
                mimeType: "application/zip",
                encodeFileName: s.utf8encode
              })).type = p.type.toLowerCase(), p.compression = p.compression.toUpperCase(), p.type === "binarystring" && (p.type = "string"), !p.type) throw new Error("No output type specified.");
              a.checkSupport(p.type), p.platform !== "darwin" && p.platform !== "freebsd" && p.platform !== "linux" && p.platform !== "sunos" || (p.platform = "UNIX"), p.platform === "win32" && (p.platform = "DOS");
              var F = p.comment || this.comment || "";
              S = m.generateWorker(this, p, F);
            } catch (M) {
              (S = new d("error")).error(M);
            }
            return new g(S, p.type || "string", p.mimeType);
          },
          generateAsync: function(A, S) {
            return this.generateInternalStream(A).accumulate(S);
          },
          generateNodeStream: function(A, S) {
            return (A = A || {}).type || (A.type = "nodebuffer"), this.generateInternalStream(A).toNodejsStream(S);
          }
        };
      }, {
        "./compressedObject": 2,
        "./defaults": 5,
        "./generate": 9,
        "./nodejs/NodejsStreamInputAdapter": 12,
        "./nodejsUtils": 14,
        "./stream/GenericWorker": 28,
        "./stream/StreamHelper": 29,
        "./utf8": 31,
        "./utils": 32,
        "./zipObject": 35
      }],
      16: [function(t, u, l) {
        u.exports = t("stream");
      }, { stream: void 0 }],
      17: [function(t, u, l) {
        var o = t("./DataReader");
        function s(a) {
          o.call(this, a);
          for (var d = 0; d < this.data.length; d++) a[d] = 255 & a[d];
        }
        t("../utils").inherits(s, o), s.prototype.byteAt = function(a) {
          return this.data[this.zero + a];
        }, s.prototype.lastIndexOfSignature = function(a) {
          for (var d = a.charCodeAt(0), g = a.charCodeAt(1), v = a.charCodeAt(2), b = a.charCodeAt(3), R = this.length - 4; 0 <= R; --R) if (this.data[R] === d && this.data[R + 1] === g && this.data[R + 2] === v && this.data[R + 3] === b) return R - this.zero;
          return -1;
        }, s.prototype.readAndCheckSignature = function(a) {
          var d = a.charCodeAt(0), g = a.charCodeAt(1), v = a.charCodeAt(2), b = a.charCodeAt(3), R = this.readData(4);
          return d === R[0] && g === R[1] && v === R[2] && b === R[3];
        }, s.prototype.readData = function(a) {
          if (this.checkOffset(a), a === 0) return [];
          var d = this.data.slice(this.zero + this.index, this.zero + this.index + a);
          return this.index += a, d;
        }, u.exports = s;
      }, {
        "../utils": 32,
        "./DataReader": 18
      }],
      18: [function(t, u, l) {
        var o = t("../utils");
        function s(a) {
          this.data = a, this.length = a.length, this.index = 0, this.zero = 0;
        }
        s.prototype = {
          checkOffset: function(a) {
            this.checkIndex(this.index + a);
          },
          checkIndex: function(a) {
            if (this.length < this.zero + a || a < 0) throw new Error("End of data reached (data length = " + this.length + ", asked index = " + a + "). Corrupted zip ?");
          },
          setIndex: function(a) {
            this.checkIndex(a), this.index = a;
          },
          skip: function(a) {
            this.setIndex(this.index + a);
          },
          byteAt: function() {
          },
          readInt: function(a) {
            var d, g = 0;
            for (this.checkOffset(a), d = this.index + a - 1; d >= this.index; d--) g = (g << 8) + this.byteAt(d);
            return this.index += a, g;
          },
          readString: function(a) {
            return o.transformTo("string", this.readData(a));
          },
          readData: function() {
          },
          lastIndexOfSignature: function() {
          },
          readAndCheckSignature: function() {
          },
          readDate: function() {
            var a = this.readInt(4);
            return new Date(Date.UTC(1980 + (a >> 25 & 127), (a >> 21 & 15) - 1, a >> 16 & 31, a >> 11 & 31, a >> 5 & 63, (31 & a) << 1));
          }
        }, u.exports = s;
      }, { "../utils": 32 }],
      19: [function(t, u, l) {
        var o = t("./Uint8ArrayReader");
        function s(a) {
          o.call(this, a);
        }
        t("../utils").inherits(s, o), s.prototype.readData = function(a) {
          this.checkOffset(a);
          var d = this.data.slice(this.zero + this.index, this.zero + this.index + a);
          return this.index += a, d;
        }, u.exports = s;
      }, {
        "../utils": 32,
        "./Uint8ArrayReader": 21
      }],
      20: [function(t, u, l) {
        var o = t("./DataReader");
        function s(a) {
          o.call(this, a);
        }
        t("../utils").inherits(s, o), s.prototype.byteAt = function(a) {
          return this.data.charCodeAt(this.zero + a);
        }, s.prototype.lastIndexOfSignature = function(a) {
          return this.data.lastIndexOf(a) - this.zero;
        }, s.prototype.readAndCheckSignature = function(a) {
          return a === this.readData(4);
        }, s.prototype.readData = function(a) {
          this.checkOffset(a);
          var d = this.data.slice(this.zero + this.index, this.zero + this.index + a);
          return this.index += a, d;
        }, u.exports = s;
      }, {
        "../utils": 32,
        "./DataReader": 18
      }],
      21: [function(t, u, l) {
        var o = t("./ArrayReader");
        function s(a) {
          o.call(this, a);
        }
        t("../utils").inherits(s, o), s.prototype.readData = function(a) {
          if (this.checkOffset(a), a === 0) return new Uint8Array(0);
          var d = this.data.subarray(this.zero + this.index, this.zero + this.index + a);
          return this.index += a, d;
        }, u.exports = s;
      }, {
        "../utils": 32,
        "./ArrayReader": 17
      }],
      22: [function(t, u, l) {
        var o = t("../utils"), s = t("../support"), a = t("./ArrayReader"), d = t("./StringReader"), g = t("./NodeBufferReader"), v = t("./Uint8ArrayReader");
        u.exports = function(b) {
          var R = o.getTypeOf(b);
          return o.checkSupport(R), R !== "string" || s.uint8array ? R === "nodebuffer" ? new g(b) : s.uint8array ? new v(o.transformTo("uint8array", b)) : new a(o.transformTo("array", b)) : new d(b);
        };
      }, {
        "../support": 30,
        "../utils": 32,
        "./ArrayReader": 17,
        "./NodeBufferReader": 19,
        "./StringReader": 20,
        "./Uint8ArrayReader": 21
      }],
      23: [function(t, u, l) {
        l.LOCAL_FILE_HEADER = "PK", l.CENTRAL_FILE_HEADER = "PK", l.CENTRAL_DIRECTORY_END = "PK", l.ZIP64_CENTRAL_DIRECTORY_LOCATOR = "PK\x07", l.ZIP64_CENTRAL_DIRECTORY_END = "PK", l.DATA_DESCRIPTOR = "PK\x07\b";
      }, {}],
      24: [function(t, u, l) {
        var o = t("./GenericWorker"), s = t("../utils");
        function a(d) {
          o.call(this, "ConvertWorker to " + d), this.destType = d;
        }
        s.inherits(a, o), a.prototype.processChunk = function(d) {
          this.push({
            data: s.transformTo(this.destType, d.data),
            meta: d.meta
          });
        }, u.exports = a;
      }, {
        "../utils": 32,
        "./GenericWorker": 28
      }],
      25: [function(t, u, l) {
        var o = t("./GenericWorker"), s = t("../crc32");
        function a() {
          o.call(this, "Crc32Probe"), this.withStreamInfo("crc32", 0);
        }
        t("../utils").inherits(a, o), a.prototype.processChunk = function(d) {
          this.streamInfo.crc32 = s(d.data, this.streamInfo.crc32 || 0), this.push(d);
        }, u.exports = a;
      }, {
        "../crc32": 4,
        "../utils": 32,
        "./GenericWorker": 28
      }],
      26: [function(t, u, l) {
        var o = t("../utils"), s = t("./GenericWorker");
        function a(d) {
          s.call(this, "DataLengthProbe for " + d), this.propName = d, this.withStreamInfo(d, 0);
        }
        o.inherits(a, s), a.prototype.processChunk = function(d) {
          if (d) {
            var g = this.streamInfo[this.propName] || 0;
            this.streamInfo[this.propName] = g + d.data.length;
          }
          s.prototype.processChunk.call(this, d);
        }, u.exports = a;
      }, {
        "../utils": 32,
        "./GenericWorker": 28
      }],
      27: [function(t, u, l) {
        var o = t("../utils"), s = t("./GenericWorker");
        function a(d) {
          s.call(this, "DataWorker");
          var g = this;
          this.dataIsReady = !1, this.index = 0, this.max = 0, this.data = null, this.type = "", this._tickScheduled = !1, d.then(function(v) {
            g.dataIsReady = !0, g.data = v, g.max = v && v.length || 0, g.type = o.getTypeOf(v), g.isPaused || g._tickAndRepeat();
          }, function(v) {
            g.error(v);
          });
        }
        o.inherits(a, s), a.prototype.cleanUp = function() {
          s.prototype.cleanUp.call(this), this.data = null;
        }, a.prototype.resume = function() {
          return !!s.prototype.resume.call(this) && (!this._tickScheduled && this.dataIsReady && (this._tickScheduled = !0, o.delay(this._tickAndRepeat, [], this)), !0);
        }, a.prototype._tickAndRepeat = function() {
          this._tickScheduled = !1, this.isPaused || this.isFinished || (this._tick(), this.isFinished || (o.delay(this._tickAndRepeat, [], this), this._tickScheduled = !0));
        }, a.prototype._tick = function() {
          if (this.isPaused || this.isFinished) return !1;
          var d = null, g = Math.min(this.max, this.index + 16384);
          if (this.index >= this.max) return this.end();
          switch (this.type) {
            case "string":
              d = this.data.substring(this.index, g);
              break;
            case "uint8array":
              d = this.data.subarray(this.index, g);
              break;
            case "array":
            case "nodebuffer":
              d = this.data.slice(this.index, g);
          }
          return this.index = g, this.push({
            data: d,
            meta: { percent: this.max ? this.index / this.max * 100 : 0 }
          });
        }, u.exports = a;
      }, {
        "../utils": 32,
        "./GenericWorker": 28
      }],
      28: [function(t, u, l) {
        function o(s) {
          this.name = s || "default", this.streamInfo = {}, this.generatedError = null, this.extraStreamInfo = {}, this.isPaused = !0, this.isFinished = !1, this.isLocked = !1, this._listeners = {
            data: [],
            end: [],
            error: []
          }, this.previous = null;
        }
        o.prototype = {
          push: function(s) {
            this.emit("data", s);
          },
          end: function() {
            if (this.isFinished) return !1;
            this.flush();
            try {
              this.emit("end"), this.cleanUp(), this.isFinished = !0;
            } catch (s) {
              this.emit("error", s);
            }
            return !0;
          },
          error: function(s) {
            return !this.isFinished && (this.isPaused ? this.generatedError = s : (this.isFinished = !0, this.emit("error", s), this.previous && this.previous.error(s), this.cleanUp()), !0);
          },
          on: function(s, a) {
            return this._listeners[s].push(a), this;
          },
          cleanUp: function() {
            this.streamInfo = this.generatedError = this.extraStreamInfo = null, this._listeners = [];
          },
          emit: function(s, a) {
            if (this._listeners[s]) for (var d = 0; d < this._listeners[s].length; d++) this._listeners[s][d].call(this, a);
          },
          pipe: function(s) {
            return s.registerPrevious(this);
          },
          registerPrevious: function(s) {
            if (this.isLocked) throw new Error("The stream '" + this + "' has already been used.");
            this.streamInfo = s.streamInfo, this.mergeStreamInfo(), this.previous = s;
            var a = this;
            return s.on("data", function(d) {
              a.processChunk(d);
            }), s.on("end", function() {
              a.end();
            }), s.on("error", function(d) {
              a.error(d);
            }), this;
          },
          pause: function() {
            return !this.isPaused && !this.isFinished && (this.isPaused = !0, this.previous && this.previous.pause(), !0);
          },
          resume: function() {
            if (!this.isPaused || this.isFinished) return !1;
            var s = this.isPaused = !1;
            return this.generatedError && (this.error(this.generatedError), s = !0), this.previous && this.previous.resume(), !s;
          },
          flush: function() {
          },
          processChunk: function(s) {
            this.push(s);
          },
          withStreamInfo: function(s, a) {
            return this.extraStreamInfo[s] = a, this.mergeStreamInfo(), this;
          },
          mergeStreamInfo: function() {
            for (var s in this.extraStreamInfo) Object.prototype.hasOwnProperty.call(this.extraStreamInfo, s) && (this.streamInfo[s] = this.extraStreamInfo[s]);
          },
          lock: function() {
            if (this.isLocked) throw new Error("The stream '" + this + "' has already been used.");
            this.isLocked = !0, this.previous && this.previous.lock();
          },
          toString: function() {
            var s = "Worker " + this.name;
            return this.previous ? this.previous + " -> " + s : s;
          }
        }, u.exports = o;
      }, {}],
      29: [function(t, u, l) {
        var o = t("../utils"), s = t("./ConvertWorker"), a = t("./GenericWorker"), d = t("../base64"), g = t("../support"), v = t("../external"), b = null;
        if (g.nodestream) try {
          b = t("../nodejs/NodejsStreamOutputAdapter");
        } catch {
        }
        function R(w, y) {
          return new v.Promise(function(k, N) {
            var _ = [], x = w._internalType, A = w._outputType, S = w._mimeType;
            w.on("data", function(p, F) {
              _.push(p), y && y(F);
            }).on("error", function(p) {
              _ = [], N(p);
            }).on("end", function() {
              try {
                k((function(p, F, M) {
                  switch (p) {
                    case "blob":
                      return o.newBlob(o.transformTo("arraybuffer", F), M);
                    case "base64":
                      return d.encode(F);
                    default:
                      return o.transformTo(p, F);
                  }
                })(A, (function(p, F) {
                  var M, I = 0, q = null, Q = 0;
                  for (M = 0; M < F.length; M++) Q += F[M].length;
                  switch (p) {
                    case "string":
                      return F.join("");
                    case "array":
                      return Array.prototype.concat.apply([], F);
                    case "uint8array":
                      for (q = new Uint8Array(Q), M = 0; M < F.length; M++) q.set(F[M], I), I += F[M].length;
                      return q;
                    case "nodebuffer":
                      return Buffer.concat(F);
                    default:
                      throw new Error("concat : unsupported type '" + p + "'");
                  }
                })(x, _), S));
              } catch (p) {
                N(p);
              }
              _ = [];
            }).resume();
          });
        }
        function m(w, y, k) {
          var N = y;
          switch (y) {
            case "blob":
            case "arraybuffer":
              N = "uint8array";
              break;
            case "base64":
              N = "string";
          }
          try {
            this._internalType = N, this._outputType = y, this._mimeType = k, o.checkSupport(N), this._worker = w.pipe(new s(N)), w.lock();
          } catch (_) {
            this._worker = new a("error"), this._worker.error(_);
          }
        }
        m.prototype = {
          accumulate: function(w) {
            return R(this, w);
          },
          on: function(w, y) {
            var k = this;
            return w === "data" ? this._worker.on(w, function(N) {
              y.call(k, N.data, N.meta);
            }) : this._worker.on(w, function() {
              o.delay(y, arguments, k);
            }), this;
          },
          resume: function() {
            return o.delay(this._worker.resume, [], this._worker), this;
          },
          pause: function() {
            return this._worker.pause(), this;
          },
          toNodejsStream: function(w) {
            if (o.checkSupport("nodestream"), this._outputType !== "nodebuffer") throw new Error(this._outputType + " is not supported by this method");
            return new b(this, { objectMode: this._outputType !== "nodebuffer" }, w);
          }
        }, u.exports = m;
      }, {
        "../base64": 1,
        "../external": 6,
        "../nodejs/NodejsStreamOutputAdapter": 13,
        "../support": 30,
        "../utils": 32,
        "./ConvertWorker": 24,
        "./GenericWorker": 28
      }],
      30: [function(t, u, l) {
        if (l.base64 = !0, l.array = !0, l.string = !0, l.arraybuffer = typeof ArrayBuffer < "u" && typeof Uint8Array < "u", l.nodebuffer = typeof Buffer < "u", l.uint8array = typeof Uint8Array < "u", typeof ArrayBuffer > "u") l.blob = !1;
        else {
          var o = /* @__PURE__ */ new ArrayBuffer(0);
          try {
            l.blob = new Blob([o], { type: "application/zip" }).size === 0;
          } catch {
            try {
              var s = new (self.BlobBuilder || self.WebKitBlobBuilder || self.MozBlobBuilder || self.MSBlobBuilder)();
              s.append(o), l.blob = s.getBlob("application/zip").size === 0;
            } catch {
              l.blob = !1;
            }
          }
        }
        try {
          l.nodestream = !!t("readable-stream").Readable;
        } catch {
          l.nodestream = !1;
        }
      }, { "readable-stream": 16 }],
      31: [function(t, u, l) {
        for (var o = t("./utils"), s = t("./support"), a = t("./nodejsUtils"), d = t("./stream/GenericWorker"), g = new Array(256), v = 0; v < 256; v++) g[v] = 252 <= v ? 6 : 248 <= v ? 5 : 240 <= v ? 4 : 224 <= v ? 3 : 192 <= v ? 2 : 1;
        g[254] = g[254] = 1;
        function b() {
          d.call(this, "utf-8 decode"), this.leftOver = null;
        }
        function R() {
          d.call(this, "utf-8 encode");
        }
        l.utf8encode = function(m) {
          return s.nodebuffer ? a.newBufferFrom(m, "utf-8") : (function(w) {
            var y, k, N, _, x, A = w.length, S = 0;
            for (_ = 0; _ < A; _++) (64512 & (k = w.charCodeAt(_))) == 55296 && _ + 1 < A && (64512 & (N = w.charCodeAt(_ + 1))) == 56320 && (k = 65536 + (k - 55296 << 10) + (N - 56320), _++), S += k < 128 ? 1 : k < 2048 ? 2 : k < 65536 ? 3 : 4;
            for (y = s.uint8array ? new Uint8Array(S) : new Array(S), _ = x = 0; x < S; _++) (64512 & (k = w.charCodeAt(_))) == 55296 && _ + 1 < A && (64512 & (N = w.charCodeAt(_ + 1))) == 56320 && (k = 65536 + (k - 55296 << 10) + (N - 56320), _++), k < 128 ? y[x++] = k : (k < 2048 ? y[x++] = 192 | k >>> 6 : (k < 65536 ? y[x++] = 224 | k >>> 12 : (y[x++] = 240 | k >>> 18, y[x++] = 128 | k >>> 12 & 63), y[x++] = 128 | k >>> 6 & 63), y[x++] = 128 | 63 & k);
            return y;
          })(m);
        }, l.utf8decode = function(m) {
          return s.nodebuffer ? o.transformTo("nodebuffer", m).toString("utf-8") : (function(w) {
            var y, k, N, _, x = w.length, A = new Array(2 * x);
            for (y = k = 0; y < x; ) if ((N = w[y++]) < 128) A[k++] = N;
            else if (4 < (_ = g[N])) A[k++] = 65533, y += _ - 1;
            else {
              for (N &= _ === 2 ? 31 : _ === 3 ? 15 : 7; 1 < _ && y < x; ) N = N << 6 | 63 & w[y++], _--;
              1 < _ ? A[k++] = 65533 : N < 65536 ? A[k++] = N : (N -= 65536, A[k++] = 55296 | N >> 10 & 1023, A[k++] = 56320 | 1023 & N);
            }
            return A.length !== k && (A.subarray ? A = A.subarray(0, k) : A.length = k), o.applyFromCharCode(A);
          })(m = o.transformTo(s.uint8array ? "uint8array" : "array", m));
        }, o.inherits(b, d), b.prototype.processChunk = function(m) {
          var w = o.transformTo(s.uint8array ? "uint8array" : "array", m.data);
          if (this.leftOver && this.leftOver.length) {
            if (s.uint8array) {
              var y = w;
              (w = new Uint8Array(y.length + this.leftOver.length)).set(this.leftOver, 0), w.set(y, this.leftOver.length);
            } else w = this.leftOver.concat(w);
            this.leftOver = null;
          }
          var k = (function(_, x) {
            var A;
            for ((x = x || _.length) > _.length && (x = _.length), A = x - 1; 0 <= A && (192 & _[A]) == 128; ) A--;
            return A < 0 || A === 0 ? x : A + g[_[A]] > x ? A : x;
          })(w), N = w;
          k !== w.length && (s.uint8array ? (N = w.subarray(0, k), this.leftOver = w.subarray(k, w.length)) : (N = w.slice(0, k), this.leftOver = w.slice(k, w.length))), this.push({
            data: l.utf8decode(N),
            meta: m.meta
          });
        }, b.prototype.flush = function() {
          this.leftOver && this.leftOver.length && (this.push({
            data: l.utf8decode(this.leftOver),
            meta: {}
          }), this.leftOver = null);
        }, l.Utf8DecodeWorker = b, o.inherits(R, d), R.prototype.processChunk = function(m) {
          this.push({
            data: l.utf8encode(m.data),
            meta: m.meta
          });
        }, l.Utf8EncodeWorker = R;
      }, {
        "./nodejsUtils": 14,
        "./stream/GenericWorker": 28,
        "./support": 30,
        "./utils": 32
      }],
      32: [function(t, u, l) {
        var o = t("./support"), s = t("./base64"), a = t("./nodejsUtils"), d = t("./external");
        function g(y) {
          return y;
        }
        function v(y, k) {
          for (var N = 0; N < y.length; ++N) k[N] = 255 & y.charCodeAt(N);
          return k;
        }
        t("setimmediate"), l.newBlob = function(y, k) {
          l.checkSupport("blob");
          try {
            return new Blob([y], { type: k });
          } catch {
            try {
              var N = new (self.BlobBuilder || self.WebKitBlobBuilder || self.MozBlobBuilder || self.MSBlobBuilder)();
              return N.append(y), N.getBlob(k);
            } catch {
              throw new Error("Bug : can't construct the Blob.");
            }
          }
        };
        var b = {
          stringifyByChunk: function(y, k, N) {
            var _ = [], x = 0, A = y.length;
            if (A <= N) return String.fromCharCode.apply(null, y);
            for (; x < A; ) k === "array" || k === "nodebuffer" ? _.push(String.fromCharCode.apply(null, y.slice(x, Math.min(x + N, A)))) : _.push(String.fromCharCode.apply(null, y.subarray(x, Math.min(x + N, A)))), x += N;
            return _.join("");
          },
          stringifyByChar: function(y) {
            for (var k = "", N = 0; N < y.length; N++) k += String.fromCharCode(y[N]);
            return k;
          },
          applyCanBeUsed: {
            uint8array: (function() {
              try {
                return o.uint8array && String.fromCharCode.apply(null, new Uint8Array(1)).length === 1;
              } catch {
                return !1;
              }
            })(),
            nodebuffer: (function() {
              try {
                return o.nodebuffer && String.fromCharCode.apply(null, a.allocBuffer(1)).length === 1;
              } catch {
                return !1;
              }
            })()
          }
        };
        function R(y) {
          var k = 65536, N = l.getTypeOf(y), _ = !0;
          if (N === "uint8array" ? _ = b.applyCanBeUsed.uint8array : N === "nodebuffer" && (_ = b.applyCanBeUsed.nodebuffer), _) for (; 1 < k; ) try {
            return b.stringifyByChunk(y, N, k);
          } catch {
            k = Math.floor(k / 2);
          }
          return b.stringifyByChar(y);
        }
        function m(y, k) {
          for (var N = 0; N < y.length; N++) k[N] = y[N];
          return k;
        }
        l.applyFromCharCode = R;
        var w = {};
        w.string = {
          string: g,
          array: function(y) {
            return v(y, new Array(y.length));
          },
          arraybuffer: function(y) {
            return w.string.uint8array(y).buffer;
          },
          uint8array: function(y) {
            return v(y, new Uint8Array(y.length));
          },
          nodebuffer: function(y) {
            return v(y, a.allocBuffer(y.length));
          }
        }, w.array = {
          string: R,
          array: g,
          arraybuffer: function(y) {
            return new Uint8Array(y).buffer;
          },
          uint8array: function(y) {
            return new Uint8Array(y);
          },
          nodebuffer: function(y) {
            return a.newBufferFrom(y);
          }
        }, w.arraybuffer = {
          string: function(y) {
            return R(new Uint8Array(y));
          },
          array: function(y) {
            return m(new Uint8Array(y), new Array(y.byteLength));
          },
          arraybuffer: g,
          uint8array: function(y) {
            return new Uint8Array(y);
          },
          nodebuffer: function(y) {
            return a.newBufferFrom(new Uint8Array(y));
          }
        }, w.uint8array = {
          string: R,
          array: function(y) {
            return m(y, new Array(y.length));
          },
          arraybuffer: function(y) {
            return y.buffer;
          },
          uint8array: g,
          nodebuffer: function(y) {
            return a.newBufferFrom(y);
          }
        }, w.nodebuffer = {
          string: R,
          array: function(y) {
            return m(y, new Array(y.length));
          },
          arraybuffer: function(y) {
            return w.nodebuffer.uint8array(y).buffer;
          },
          uint8array: function(y) {
            return m(y, new Uint8Array(y.length));
          },
          nodebuffer: g
        }, l.transformTo = function(y, k) {
          return k = k || "", y ? (l.checkSupport(y), w[l.getTypeOf(k)][y](k)) : k;
        }, l.resolve = function(y) {
          for (var k = y.split("/"), N = [], _ = 0; _ < k.length; _++) {
            var x = k[_];
            x === "." || x === "" && _ !== 0 && _ !== k.length - 1 || (x === ".." ? N.pop() : N.push(x));
          }
          return N.join("/");
        }, l.getTypeOf = function(y) {
          return typeof y == "string" ? "string" : Object.prototype.toString.call(y) === "[object Array]" ? "array" : o.nodebuffer && a.isBuffer(y) ? "nodebuffer" : o.uint8array && y instanceof Uint8Array ? "uint8array" : o.arraybuffer && y instanceof ArrayBuffer ? "arraybuffer" : void 0;
        }, l.checkSupport = function(y) {
          if (!o[y.toLowerCase()]) throw new Error(y + " is not supported by this platform");
        }, l.MAX_VALUE_16BITS = 65535, l.MAX_VALUE_32BITS = -1, l.pretty = function(y) {
          var k, N, _ = "";
          for (N = 0; N < (y || "").length; N++) _ += "\\x" + ((k = y.charCodeAt(N)) < 16 ? "0" : "") + k.toString(16).toUpperCase();
          return _;
        }, l.delay = function(y, k, N) {
          setImmediate(function() {
            y.apply(N || null, k || []);
          });
        }, l.inherits = function(y, k) {
          function N() {
          }
          N.prototype = k.prototype, y.prototype = new N();
        }, l.extend = function() {
          var y, k, N = {};
          for (y = 0; y < arguments.length; y++) for (k in arguments[y]) Object.prototype.hasOwnProperty.call(arguments[y], k) && N[k] === void 0 && (N[k] = arguments[y][k]);
          return N;
        }, l.prepareContent = function(y, k, N, _, x) {
          return d.Promise.resolve(k).then(function(A) {
            return o.blob && (A instanceof Blob || ["[object File]", "[object Blob]"].indexOf(Object.prototype.toString.call(A)) !== -1) && typeof FileReader < "u" ? new d.Promise(function(S, p) {
              var F = new FileReader();
              F.onload = function(M) {
                S(M.target.result);
              }, F.onerror = function(M) {
                p(M.target.error);
              }, F.readAsArrayBuffer(A);
            }) : A;
          }).then(function(A) {
            var S = l.getTypeOf(A);
            return S ? (S === "arraybuffer" ? A = l.transformTo("uint8array", A) : S === "string" && (x ? A = s.decode(A) : N && _ !== !0 && (A = (function(p) {
              return v(p, o.uint8array ? new Uint8Array(p.length) : new Array(p.length));
            })(A))), A) : d.Promise.reject(/* @__PURE__ */ new Error("Can't read the data of '" + y + "'. Is it in a supported JavaScript type (String, Blob, ArrayBuffer, etc) ?"));
          });
        };
      }, {
        "./base64": 1,
        "./external": 6,
        "./nodejsUtils": 14,
        "./support": 30,
        setimmediate: 54
      }],
      33: [function(t, u, l) {
        var o = t("./reader/readerFor"), s = t("./utils"), a = t("./signature"), d = t("./zipEntry"), g = t("./support");
        function v(b) {
          this.files = [], this.loadOptions = b;
        }
        v.prototype = {
          checkSignature: function(b) {
            if (!this.reader.readAndCheckSignature(b)) {
              this.reader.index -= 4;
              var R = this.reader.readString(4);
              throw new Error("Corrupted zip or bug: unexpected signature (" + s.pretty(R) + ", expected " + s.pretty(b) + ")");
            }
          },
          isSignature: function(b, R) {
            var m = this.reader.index;
            this.reader.setIndex(b);
            var w = this.reader.readString(4) === R;
            return this.reader.setIndex(m), w;
          },
          readBlockEndOfCentral: function() {
            this.diskNumber = this.reader.readInt(2), this.diskWithCentralDirStart = this.reader.readInt(2), this.centralDirRecordsOnThisDisk = this.reader.readInt(2), this.centralDirRecords = this.reader.readInt(2), this.centralDirSize = this.reader.readInt(4), this.centralDirOffset = this.reader.readInt(4), this.zipCommentLength = this.reader.readInt(2);
            var b = this.reader.readData(this.zipCommentLength), R = g.uint8array ? "uint8array" : "array", m = s.transformTo(R, b);
            this.zipComment = this.loadOptions.decodeFileName(m);
          },
          readBlockZip64EndOfCentral: function() {
            this.zip64EndOfCentralSize = this.reader.readInt(8), this.reader.skip(4), this.diskNumber = this.reader.readInt(4), this.diskWithCentralDirStart = this.reader.readInt(4), this.centralDirRecordsOnThisDisk = this.reader.readInt(8), this.centralDirRecords = this.reader.readInt(8), this.centralDirSize = this.reader.readInt(8), this.centralDirOffset = this.reader.readInt(8), this.zip64ExtensibleData = {};
            for (var b, R, m, w = this.zip64EndOfCentralSize - 44; 0 < w; ) b = this.reader.readInt(2), R = this.reader.readInt(4), m = this.reader.readData(R), this.zip64ExtensibleData[b] = {
              id: b,
              length: R,
              value: m
            };
          },
          readBlockZip64EndOfCentralLocator: function() {
            if (this.diskWithZip64CentralDirStart = this.reader.readInt(4), this.relativeOffsetEndOfZip64CentralDir = this.reader.readInt(8), this.disksCount = this.reader.readInt(4), 1 < this.disksCount) throw new Error("Multi-volumes zip are not supported");
          },
          readLocalFiles: function() {
            var b, R;
            for (b = 0; b < this.files.length; b++) R = this.files[b], this.reader.setIndex(R.localHeaderOffset), this.checkSignature(a.LOCAL_FILE_HEADER), R.readLocalPart(this.reader), R.handleUTF8(), R.processAttributes();
          },
          readCentralDir: function() {
            var b;
            for (this.reader.setIndex(this.centralDirOffset); this.reader.readAndCheckSignature(a.CENTRAL_FILE_HEADER); ) (b = new d({ zip64: this.zip64 }, this.loadOptions)).readCentralPart(this.reader), this.files.push(b);
            if (this.centralDirRecords !== this.files.length && this.centralDirRecords !== 0 && this.files.length === 0) throw new Error("Corrupted zip or bug: expected " + this.centralDirRecords + " records in central dir, got " + this.files.length);
          },
          readEndOfCentral: function() {
            var b = this.reader.lastIndexOfSignature(a.CENTRAL_DIRECTORY_END);
            if (b < 0) throw this.isSignature(0, a.LOCAL_FILE_HEADER) ? /* @__PURE__ */ new Error("Corrupted zip: can't find end of central directory") : /* @__PURE__ */ new Error("Can't find end of central directory : is this a zip file ? If it is, see https://stuk.github.io/jszip/documentation/howto/read_zip.html");
            this.reader.setIndex(b);
            var R = b;
            if (this.checkSignature(a.CENTRAL_DIRECTORY_END), this.readBlockEndOfCentral(), this.diskNumber === s.MAX_VALUE_16BITS || this.diskWithCentralDirStart === s.MAX_VALUE_16BITS || this.centralDirRecordsOnThisDisk === s.MAX_VALUE_16BITS || this.centralDirRecords === s.MAX_VALUE_16BITS || this.centralDirSize === s.MAX_VALUE_32BITS || this.centralDirOffset === s.MAX_VALUE_32BITS) {
              if (this.zip64 = !0, (b = this.reader.lastIndexOfSignature(a.ZIP64_CENTRAL_DIRECTORY_LOCATOR)) < 0) throw new Error("Corrupted zip: can't find the ZIP64 end of central directory locator");
              if (this.reader.setIndex(b), this.checkSignature(a.ZIP64_CENTRAL_DIRECTORY_LOCATOR), this.readBlockZip64EndOfCentralLocator(), !this.isSignature(this.relativeOffsetEndOfZip64CentralDir, a.ZIP64_CENTRAL_DIRECTORY_END) && (this.relativeOffsetEndOfZip64CentralDir = this.reader.lastIndexOfSignature(a.ZIP64_CENTRAL_DIRECTORY_END), this.relativeOffsetEndOfZip64CentralDir < 0)) throw new Error("Corrupted zip: can't find the ZIP64 end of central directory");
              this.reader.setIndex(this.relativeOffsetEndOfZip64CentralDir), this.checkSignature(a.ZIP64_CENTRAL_DIRECTORY_END), this.readBlockZip64EndOfCentral();
            }
            var m = this.centralDirOffset + this.centralDirSize;
            this.zip64 && (m += 20, m += 12 + this.zip64EndOfCentralSize);
            var w = R - m;
            if (0 < w) this.isSignature(R, a.CENTRAL_FILE_HEADER) || (this.reader.zero = w);
            else if (w < 0) throw new Error("Corrupted zip: missing " + Math.abs(w) + " bytes.");
          },
          prepareReader: function(b) {
            this.reader = o(b);
          },
          load: function(b) {
            this.prepareReader(b), this.readEndOfCentral(), this.readCentralDir(), this.readLocalFiles();
          }
        }, u.exports = v;
      }, {
        "./reader/readerFor": 22,
        "./signature": 23,
        "./support": 30,
        "./utils": 32,
        "./zipEntry": 34
      }],
      34: [function(t, u, l) {
        var o = t("./reader/readerFor"), s = t("./utils"), a = t("./compressedObject"), d = t("./crc32"), g = t("./utf8"), v = t("./compressions"), b = t("./support");
        function R(m, w) {
          this.options = m, this.loadOptions = w;
        }
        R.prototype = {
          isEncrypted: function() {
            return (1 & this.bitFlag) == 1;
          },
          useUTF8: function() {
            return (2048 & this.bitFlag) == 2048;
          },
          readLocalPart: function(m) {
            var w, y;
            if (m.skip(22), this.fileNameLength = m.readInt(2), y = m.readInt(2), this.fileName = m.readData(this.fileNameLength), m.skip(y), this.compressedSize === -1 || this.uncompressedSize === -1) throw new Error("Bug or corrupted zip : didn't get enough information from the central directory (compressedSize === -1 || uncompressedSize === -1)");
            if ((w = (function(k) {
              for (var N in v) if (Object.prototype.hasOwnProperty.call(v, N) && v[N].magic === k) return v[N];
              return null;
            })(this.compressionMethod)) === null) throw new Error("Corrupted zip : compression " + s.pretty(this.compressionMethod) + " unknown (inner file : " + s.transformTo("string", this.fileName) + ")");
            this.decompressed = new a(this.compressedSize, this.uncompressedSize, this.crc32, w, m.readData(this.compressedSize));
          },
          readCentralPart: function(m) {
            this.versionMadeBy = m.readInt(2), m.skip(2), this.bitFlag = m.readInt(2), this.compressionMethod = m.readString(2), this.date = m.readDate(), this.crc32 = m.readInt(4), this.compressedSize = m.readInt(4), this.uncompressedSize = m.readInt(4);
            var w = m.readInt(2);
            if (this.extraFieldsLength = m.readInt(2), this.fileCommentLength = m.readInt(2), this.diskNumberStart = m.readInt(2), this.internalFileAttributes = m.readInt(2), this.externalFileAttributes = m.readInt(4), this.localHeaderOffset = m.readInt(4), this.isEncrypted()) throw new Error("Encrypted zip are not supported");
            m.skip(w), this.readExtraFields(m), this.parseZIP64ExtraField(m), this.fileComment = m.readData(this.fileCommentLength);
          },
          processAttributes: function() {
            this.unixPermissions = null, this.dosPermissions = null;
            var m = this.versionMadeBy >> 8;
            this.dir = !!(16 & this.externalFileAttributes), m == 0 && (this.dosPermissions = 63 & this.externalFileAttributes), m == 3 && (this.unixPermissions = this.externalFileAttributes >> 16 & 65535), this.dir || this.fileNameStr.slice(-1) !== "/" || (this.dir = !0);
          },
          parseZIP64ExtraField: function() {
            if (this.extraFields[1]) {
              var m = o(this.extraFields[1].value);
              this.uncompressedSize === s.MAX_VALUE_32BITS && (this.uncompressedSize = m.readInt(8)), this.compressedSize === s.MAX_VALUE_32BITS && (this.compressedSize = m.readInt(8)), this.localHeaderOffset === s.MAX_VALUE_32BITS && (this.localHeaderOffset = m.readInt(8)), this.diskNumberStart === s.MAX_VALUE_32BITS && (this.diskNumberStart = m.readInt(4));
            }
          },
          readExtraFields: function(m) {
            var w, y, k, N = m.index + this.extraFieldsLength;
            for (this.extraFields || (this.extraFields = {}); m.index + 4 < N; ) w = m.readInt(2), y = m.readInt(2), k = m.readData(y), this.extraFields[w] = {
              id: w,
              length: y,
              value: k
            };
            m.setIndex(N);
          },
          handleUTF8: function() {
            var m = b.uint8array ? "uint8array" : "array";
            if (this.useUTF8()) this.fileNameStr = g.utf8decode(this.fileName), this.fileCommentStr = g.utf8decode(this.fileComment);
            else {
              var w = this.findExtraFieldUnicodePath();
              if (w !== null) this.fileNameStr = w;
              else {
                var y = s.transformTo(m, this.fileName);
                this.fileNameStr = this.loadOptions.decodeFileName(y);
              }
              var k = this.findExtraFieldUnicodeComment();
              if (k !== null) this.fileCommentStr = k;
              else {
                var N = s.transformTo(m, this.fileComment);
                this.fileCommentStr = this.loadOptions.decodeFileName(N);
              }
            }
          },
          findExtraFieldUnicodePath: function() {
            var m = this.extraFields[28789];
            if (m) {
              var w = o(m.value);
              return w.readInt(1) !== 1 || d(this.fileName) !== w.readInt(4) ? null : g.utf8decode(w.readData(m.length - 5));
            }
            return null;
          },
          findExtraFieldUnicodeComment: function() {
            var m = this.extraFields[25461];
            if (m) {
              var w = o(m.value);
              return w.readInt(1) !== 1 || d(this.fileComment) !== w.readInt(4) ? null : g.utf8decode(w.readData(m.length - 5));
            }
            return null;
          }
        }, u.exports = R;
      }, {
        "./compressedObject": 2,
        "./compressions": 3,
        "./crc32": 4,
        "./reader/readerFor": 22,
        "./support": 30,
        "./utf8": 31,
        "./utils": 32
      }],
      35: [function(t, u, l) {
        function o(w, y, k) {
          this.name = w, this.dir = k.dir, this.date = k.date, this.comment = k.comment, this.unixPermissions = k.unixPermissions, this.dosPermissions = k.dosPermissions, this._data = y, this._dataBinary = k.binary, this.options = {
            compression: k.compression,
            compressionOptions: k.compressionOptions
          };
        }
        var s = t("./stream/StreamHelper"), a = t("./stream/DataWorker"), d = t("./utf8"), g = t("./compressedObject"), v = t("./stream/GenericWorker");
        o.prototype = {
          internalStream: function(w) {
            var y = null, k = "string";
            try {
              if (!w) throw new Error("No output type specified.");
              var N = (k = w.toLowerCase()) === "string" || k === "text";
              k !== "binarystring" && k !== "text" || (k = "string"), y = this._decompressWorker();
              var _ = !this._dataBinary;
              _ && !N && (y = y.pipe(new d.Utf8EncodeWorker())), !_ && N && (y = y.pipe(new d.Utf8DecodeWorker()));
            } catch (x) {
              (y = new v("error")).error(x);
            }
            return new s(y, k, "");
          },
          async: function(w, y) {
            return this.internalStream(w).accumulate(y);
          },
          nodeStream: function(w, y) {
            return this.internalStream(w || "nodebuffer").toNodejsStream(y);
          },
          _compressWorker: function(w, y) {
            if (this._data instanceof g && this._data.compression.magic === w.magic) return this._data.getCompressedWorker();
            var k = this._decompressWorker();
            return this._dataBinary || (k = k.pipe(new d.Utf8EncodeWorker())), g.createWorkerFrom(k, w, y);
          },
          _decompressWorker: function() {
            return this._data instanceof g ? this._data.getContentWorker() : this._data instanceof v ? this._data : new a(this._data);
          }
        };
        for (var b = [
          "asText",
          "asBinary",
          "asNodeBuffer",
          "asUint8Array",
          "asArrayBuffer"
        ], R = function() {
          throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
        }, m = 0; m < b.length; m++) o.prototype[b[m]] = R;
        u.exports = o;
      }, {
        "./compressedObject": 2,
        "./stream/DataWorker": 27,
        "./stream/GenericWorker": 28,
        "./stream/StreamHelper": 29,
        "./utf8": 31
      }],
      36: [function(t, u, l) {
        (function(o) {
          var s, a, d = o.MutationObserver || o.WebKitMutationObserver;
          if (d) {
            var g = 0, v = new d(w), b = o.document.createTextNode("");
            v.observe(b, { characterData: !0 }), s = function() {
              b.data = g = ++g % 2;
            };
          } else if (o.setImmediate || o.MessageChannel === void 0) s = "document" in o && "onreadystatechange" in o.document.createElement("script") ? function() {
            var y = o.document.createElement("script");
            y.onreadystatechange = function() {
              w(), y.onreadystatechange = null, y.parentNode.removeChild(y), y = null;
            }, o.document.documentElement.appendChild(y);
          } : function() {
            setTimeout(w, 0);
          };
          else {
            var R = new o.MessageChannel();
            R.port1.onmessage = w, s = function() {
              R.port2.postMessage(0);
            };
          }
          var m = [];
          function w() {
            var y, k;
            a = !0;
            for (var N = m.length; N; ) {
              for (k = m, m = [], y = -1; ++y < N; ) k[y]();
              N = m.length;
            }
            a = !1;
          }
          u.exports = function(y) {
            m.push(y) !== 1 || a || s();
          };
        }).call(this, typeof Ce < "u" ? Ce : typeof self < "u" ? self : typeof window < "u" ? window : {});
      }, {}],
      37: [function(t, u, l) {
        var o = t("immediate");
        function s() {
        }
        var a = {}, d = ["REJECTED"], g = ["FULFILLED"], v = ["PENDING"];
        function b(N) {
          if (typeof N != "function") throw new TypeError("resolver must be a function");
          this.state = v, this.queue = [], this.outcome = void 0, N !== s && y(this, N);
        }
        function R(N, _, x) {
          this.promise = N, typeof _ == "function" && (this.onFulfilled = _, this.callFulfilled = this.otherCallFulfilled), typeof x == "function" && (this.onRejected = x, this.callRejected = this.otherCallRejected);
        }
        function m(N, _, x) {
          o(function() {
            var A;
            try {
              A = _(x);
            } catch (S) {
              return a.reject(N, S);
            }
            A === N ? a.reject(N, /* @__PURE__ */ new TypeError("Cannot resolve promise with itself")) : a.resolve(N, A);
          });
        }
        function w(N) {
          var _ = N && N.then;
          if (N && (typeof N == "object" || typeof N == "function") && typeof _ == "function") return function() {
            _.apply(N, arguments);
          };
        }
        function y(N, _) {
          var x = !1;
          function A(F) {
            x || (x = !0, a.reject(N, F));
          }
          function S(F) {
            x || (x = !0, a.resolve(N, F));
          }
          var p = k(function() {
            _(S, A);
          });
          p.status === "error" && A(p.value);
        }
        function k(N, _) {
          var x = {};
          try {
            x.value = N(_), x.status = "success";
          } catch (A) {
            x.status = "error", x.value = A;
          }
          return x;
        }
        (u.exports = b).prototype.finally = function(N) {
          if (typeof N != "function") return this;
          var _ = this.constructor;
          return this.then(function(x) {
            return _.resolve(N()).then(function() {
              return x;
            });
          }, function(x) {
            return _.resolve(N()).then(function() {
              throw x;
            });
          });
        }, b.prototype.catch = function(N) {
          return this.then(null, N);
        }, b.prototype.then = function(N, _) {
          if (typeof N != "function" && this.state === g || typeof _ != "function" && this.state === d) return this;
          var x = new this.constructor(s);
          return this.state !== v ? m(x, this.state === g ? N : _, this.outcome) : this.queue.push(new R(x, N, _)), x;
        }, R.prototype.callFulfilled = function(N) {
          a.resolve(this.promise, N);
        }, R.prototype.otherCallFulfilled = function(N) {
          m(this.promise, this.onFulfilled, N);
        }, R.prototype.callRejected = function(N) {
          a.reject(this.promise, N);
        }, R.prototype.otherCallRejected = function(N) {
          m(this.promise, this.onRejected, N);
        }, a.resolve = function(N, _) {
          var x = k(w, _);
          if (x.status === "error") return a.reject(N, x.value);
          var A = x.value;
          if (A) y(N, A);
          else {
            N.state = g, N.outcome = _;
            for (var S = -1, p = N.queue.length; ++S < p; ) N.queue[S].callFulfilled(_);
          }
          return N;
        }, a.reject = function(N, _) {
          N.state = d, N.outcome = _;
          for (var x = -1, A = N.queue.length; ++x < A; ) N.queue[x].callRejected(_);
          return N;
        }, b.resolve = function(N) {
          return N instanceof this ? N : a.resolve(new this(s), N);
        }, b.reject = function(N) {
          var _ = new this(s);
          return a.reject(_, N);
        }, b.all = function(N) {
          var _ = this;
          if (Object.prototype.toString.call(N) !== "[object Array]") return this.reject(/* @__PURE__ */ new TypeError("must be an array"));
          var x = N.length, A = !1;
          if (!x) return this.resolve([]);
          for (var S = new Array(x), p = 0, F = -1, M = new this(s); ++F < x; ) I(N[F], F);
          return M;
          function I(q, Q) {
            _.resolve(q).then(function(O) {
              S[Q] = O, ++p !== x || A || (A = !0, a.resolve(M, S));
            }, function(O) {
              A || (A = !0, a.reject(M, O));
            });
          }
        }, b.race = function(N) {
          var _ = this;
          if (Object.prototype.toString.call(N) !== "[object Array]") return this.reject(/* @__PURE__ */ new TypeError("must be an array"));
          var x = N.length, A = !1;
          if (!x) return this.resolve([]);
          for (var S = -1, p = new this(s); ++S < x; ) F = N[S], _.resolve(F).then(function(M) {
            A || (A = !0, a.resolve(p, M));
          }, function(M) {
            A || (A = !0, a.reject(p, M));
          });
          var F;
          return p;
        };
      }, { immediate: 36 }],
      38: [function(t, u, l) {
        var o = {};
        (0, t("./lib/utils/common").assign)(o, t("./lib/deflate"), t("./lib/inflate"), t("./lib/zlib/constants")), u.exports = o;
      }, {
        "./lib/deflate": 39,
        "./lib/inflate": 40,
        "./lib/utils/common": 41,
        "./lib/zlib/constants": 44
      }],
      39: [function(t, u, l) {
        var o = t("./zlib/deflate"), s = t("./utils/common"), a = t("./utils/strings"), d = t("./zlib/messages"), g = t("./zlib/zstream"), v = Object.prototype.toString, b = 0, R = -1, m = 0, w = 8;
        function y(N) {
          if (!(this instanceof y)) return new y(N);
          this.options = s.assign({
            level: R,
            method: w,
            chunkSize: 16384,
            windowBits: 15,
            memLevel: 8,
            strategy: m,
            to: ""
          }, N || {});
          var _ = this.options;
          _.raw && 0 < _.windowBits ? _.windowBits = -_.windowBits : _.gzip && 0 < _.windowBits && _.windowBits < 16 && (_.windowBits += 16), this.err = 0, this.msg = "", this.ended = !1, this.chunks = [], this.strm = new g(), this.strm.avail_out = 0;
          var x = o.deflateInit2(this.strm, _.level, _.method, _.windowBits, _.memLevel, _.strategy);
          if (x !== b) throw new Error(d[x]);
          if (_.header && o.deflateSetHeader(this.strm, _.header), _.dictionary) {
            var A;
            if (A = typeof _.dictionary == "string" ? a.string2buf(_.dictionary) : v.call(_.dictionary) === "[object ArrayBuffer]" ? new Uint8Array(_.dictionary) : _.dictionary, (x = o.deflateSetDictionary(this.strm, A)) !== b) throw new Error(d[x]);
            this._dict_set = !0;
          }
        }
        function k(N, _) {
          var x = new y(_);
          if (x.push(N, !0), x.err) throw x.msg || d[x.err];
          return x.result;
        }
        y.prototype.push = function(N, _) {
          var x, A, S = this.strm, p = this.options.chunkSize;
          if (this.ended) return !1;
          A = _ === ~~_ ? _ : _ === !0 ? 4 : 0, typeof N == "string" ? S.input = a.string2buf(N) : v.call(N) === "[object ArrayBuffer]" ? S.input = new Uint8Array(N) : S.input = N, S.next_in = 0, S.avail_in = S.input.length;
          do {
            if (S.avail_out === 0 && (S.output = new s.Buf8(p), S.next_out = 0, S.avail_out = p), (x = o.deflate(S, A)) !== 1 && x !== b) return this.onEnd(x), !(this.ended = !0);
            S.avail_out !== 0 && (S.avail_in !== 0 || A !== 4 && A !== 2) || (this.options.to === "string" ? this.onData(a.buf2binstring(s.shrinkBuf(S.output, S.next_out))) : this.onData(s.shrinkBuf(S.output, S.next_out)));
          } while ((0 < S.avail_in || S.avail_out === 0) && x !== 1);
          return A === 4 ? (x = o.deflateEnd(this.strm), this.onEnd(x), this.ended = !0, x === b) : A !== 2 || (this.onEnd(b), !(S.avail_out = 0));
        }, y.prototype.onData = function(N) {
          this.chunks.push(N);
        }, y.prototype.onEnd = function(N) {
          N === b && (this.options.to === "string" ? this.result = this.chunks.join("") : this.result = s.flattenChunks(this.chunks)), this.chunks = [], this.err = N, this.msg = this.strm.msg;
        }, l.Deflate = y, l.deflate = k, l.deflateRaw = function(N, _) {
          return (_ = _ || {}).raw = !0, k(N, _);
        }, l.gzip = function(N, _) {
          return (_ = _ || {}).gzip = !0, k(N, _);
        };
      }, {
        "./utils/common": 41,
        "./utils/strings": 42,
        "./zlib/deflate": 46,
        "./zlib/messages": 51,
        "./zlib/zstream": 53
      }],
      40: [function(t, u, l) {
        var o = t("./zlib/inflate"), s = t("./utils/common"), a = t("./utils/strings"), d = t("./zlib/constants"), g = t("./zlib/messages"), v = t("./zlib/zstream"), b = t("./zlib/gzheader"), R = Object.prototype.toString;
        function m(y) {
          if (!(this instanceof m)) return new m(y);
          this.options = s.assign({
            chunkSize: 16384,
            windowBits: 0,
            to: ""
          }, y || {});
          var k = this.options;
          k.raw && 0 <= k.windowBits && k.windowBits < 16 && (k.windowBits = -k.windowBits, k.windowBits === 0 && (k.windowBits = -15)), !(0 <= k.windowBits && k.windowBits < 16) || y && y.windowBits || (k.windowBits += 32), 15 < k.windowBits && k.windowBits < 48 && (15 & k.windowBits) == 0 && (k.windowBits |= 15), this.err = 0, this.msg = "", this.ended = !1, this.chunks = [], this.strm = new v(), this.strm.avail_out = 0;
          var N = o.inflateInit2(this.strm, k.windowBits);
          if (N !== d.Z_OK) throw new Error(g[N]);
          this.header = new b(), o.inflateGetHeader(this.strm, this.header);
        }
        function w(y, k) {
          var N = new m(k);
          if (N.push(y, !0), N.err) throw N.msg || g[N.err];
          return N.result;
        }
        m.prototype.push = function(y, k) {
          var N, _, x, A, S, p, F = this.strm, M = this.options.chunkSize, I = this.options.dictionary, q = !1;
          if (this.ended) return !1;
          _ = k === ~~k ? k : k === !0 ? d.Z_FINISH : d.Z_NO_FLUSH, typeof y == "string" ? F.input = a.binstring2buf(y) : R.call(y) === "[object ArrayBuffer]" ? F.input = new Uint8Array(y) : F.input = y, F.next_in = 0, F.avail_in = F.input.length;
          do {
            if (F.avail_out === 0 && (F.output = new s.Buf8(M), F.next_out = 0, F.avail_out = M), (N = o.inflate(F, d.Z_NO_FLUSH)) === d.Z_NEED_DICT && I && (p = typeof I == "string" ? a.string2buf(I) : R.call(I) === "[object ArrayBuffer]" ? new Uint8Array(I) : I, N = o.inflateSetDictionary(this.strm, p)), N === d.Z_BUF_ERROR && q === !0 && (N = d.Z_OK, q = !1), N !== d.Z_STREAM_END && N !== d.Z_OK) return this.onEnd(N), !(this.ended = !0);
            F.next_out && (F.avail_out !== 0 && N !== d.Z_STREAM_END && (F.avail_in !== 0 || _ !== d.Z_FINISH && _ !== d.Z_SYNC_FLUSH) || (this.options.to === "string" ? (x = a.utf8border(F.output, F.next_out), A = F.next_out - x, S = a.buf2string(F.output, x), F.next_out = A, F.avail_out = M - A, A && s.arraySet(F.output, F.output, x, A, 0), this.onData(S)) : this.onData(s.shrinkBuf(F.output, F.next_out)))), F.avail_in === 0 && F.avail_out === 0 && (q = !0);
          } while ((0 < F.avail_in || F.avail_out === 0) && N !== d.Z_STREAM_END);
          return N === d.Z_STREAM_END && (_ = d.Z_FINISH), _ === d.Z_FINISH ? (N = o.inflateEnd(this.strm), this.onEnd(N), this.ended = !0, N === d.Z_OK) : _ !== d.Z_SYNC_FLUSH || (this.onEnd(d.Z_OK), !(F.avail_out = 0));
        }, m.prototype.onData = function(y) {
          this.chunks.push(y);
        }, m.prototype.onEnd = function(y) {
          y === d.Z_OK && (this.options.to === "string" ? this.result = this.chunks.join("") : this.result = s.flattenChunks(this.chunks)), this.chunks = [], this.err = y, this.msg = this.strm.msg;
        }, l.Inflate = m, l.inflate = w, l.inflateRaw = function(y, k) {
          return (k = k || {}).raw = !0, w(y, k);
        }, l.ungzip = w;
      }, {
        "./utils/common": 41,
        "./utils/strings": 42,
        "./zlib/constants": 44,
        "./zlib/gzheader": 47,
        "./zlib/inflate": 49,
        "./zlib/messages": 51,
        "./zlib/zstream": 53
      }],
      41: [function(t, u, l) {
        var o = typeof Uint8Array < "u" && typeof Uint16Array < "u" && typeof Int32Array < "u";
        l.assign = function(d) {
          for (var g = Array.prototype.slice.call(arguments, 1); g.length; ) {
            var v = g.shift();
            if (v) {
              if (typeof v != "object") throw new TypeError(v + "must be non-object");
              for (var b in v) v.hasOwnProperty(b) && (d[b] = v[b]);
            }
          }
          return d;
        }, l.shrinkBuf = function(d, g) {
          return d.length === g ? d : d.subarray ? d.subarray(0, g) : (d.length = g, d);
        };
        var s = {
          arraySet: function(d, g, v, b, R) {
            if (g.subarray && d.subarray) d.set(g.subarray(v, v + b), R);
            else for (var m = 0; m < b; m++) d[R + m] = g[v + m];
          },
          flattenChunks: function(d) {
            var g, v, b, R, m, w;
            for (g = b = 0, v = d.length; g < v; g++) b += d[g].length;
            for (w = new Uint8Array(b), g = R = 0, v = d.length; g < v; g++) m = d[g], w.set(m, R), R += m.length;
            return w;
          }
        }, a = {
          arraySet: function(d, g, v, b, R) {
            for (var m = 0; m < b; m++) d[R + m] = g[v + m];
          },
          flattenChunks: function(d) {
            return [].concat.apply([], d);
          }
        };
        l.setTyped = function(d) {
          d ? (l.Buf8 = Uint8Array, l.Buf16 = Uint16Array, l.Buf32 = Int32Array, l.assign(l, s)) : (l.Buf8 = Array, l.Buf16 = Array, l.Buf32 = Array, l.assign(l, a));
        }, l.setTyped(o);
      }, {}],
      42: [function(t, u, l) {
        var o = t("./common"), s = !0, a = !0;
        try {
          String.fromCharCode.apply(null, [0]);
        } catch {
          s = !1;
        }
        try {
          String.fromCharCode.apply(null, new Uint8Array(1));
        } catch {
          a = !1;
        }
        for (var d = new o.Buf8(256), g = 0; g < 256; g++) d[g] = 252 <= g ? 6 : 248 <= g ? 5 : 240 <= g ? 4 : 224 <= g ? 3 : 192 <= g ? 2 : 1;
        function v(b, R) {
          if (R < 65537 && (b.subarray && a || !b.subarray && s)) return String.fromCharCode.apply(null, o.shrinkBuf(b, R));
          for (var m = "", w = 0; w < R; w++) m += String.fromCharCode(b[w]);
          return m;
        }
        d[254] = d[254] = 1, l.string2buf = function(b) {
          var R, m, w, y, k, N = b.length, _ = 0;
          for (y = 0; y < N; y++) (64512 & (m = b.charCodeAt(y))) == 55296 && y + 1 < N && (64512 & (w = b.charCodeAt(y + 1))) == 56320 && (m = 65536 + (m - 55296 << 10) + (w - 56320), y++), _ += m < 128 ? 1 : m < 2048 ? 2 : m < 65536 ? 3 : 4;
          for (R = new o.Buf8(_), y = k = 0; k < _; y++) (64512 & (m = b.charCodeAt(y))) == 55296 && y + 1 < N && (64512 & (w = b.charCodeAt(y + 1))) == 56320 && (m = 65536 + (m - 55296 << 10) + (w - 56320), y++), m < 128 ? R[k++] = m : (m < 2048 ? R[k++] = 192 | m >>> 6 : (m < 65536 ? R[k++] = 224 | m >>> 12 : (R[k++] = 240 | m >>> 18, R[k++] = 128 | m >>> 12 & 63), R[k++] = 128 | m >>> 6 & 63), R[k++] = 128 | 63 & m);
          return R;
        }, l.buf2binstring = function(b) {
          return v(b, b.length);
        }, l.binstring2buf = function(b) {
          for (var R = new o.Buf8(b.length), m = 0, w = R.length; m < w; m++) R[m] = b.charCodeAt(m);
          return R;
        }, l.buf2string = function(b, R) {
          var m, w, y, k, N = R || b.length, _ = new Array(2 * N);
          for (m = w = 0; m < N; ) if ((y = b[m++]) < 128) _[w++] = y;
          else if (4 < (k = d[y])) _[w++] = 65533, m += k - 1;
          else {
            for (y &= k === 2 ? 31 : k === 3 ? 15 : 7; 1 < k && m < N; ) y = y << 6 | 63 & b[m++], k--;
            1 < k ? _[w++] = 65533 : y < 65536 ? _[w++] = y : (y -= 65536, _[w++] = 55296 | y >> 10 & 1023, _[w++] = 56320 | 1023 & y);
          }
          return v(_, w);
        }, l.utf8border = function(b, R) {
          var m;
          for ((R = R || b.length) > b.length && (R = b.length), m = R - 1; 0 <= m && (192 & b[m]) == 128; ) m--;
          return m < 0 || m === 0 ? R : m + d[b[m]] > R ? m : R;
        };
      }, { "./common": 41 }],
      43: [function(t, u, l) {
        u.exports = function(o, s, a, d) {
          for (var g = 65535 & o | 0, v = o >>> 16 & 65535 | 0, b = 0; a !== 0; ) {
            for (a -= b = 2e3 < a ? 2e3 : a; v = v + (g = g + s[d++] | 0) | 0, --b; ) ;
            g %= 65521, v %= 65521;
          }
          return g | v << 16 | 0;
        };
      }, {}],
      44: [function(t, u, l) {
        u.exports = {
          Z_NO_FLUSH: 0,
          Z_PARTIAL_FLUSH: 1,
          Z_SYNC_FLUSH: 2,
          Z_FULL_FLUSH: 3,
          Z_FINISH: 4,
          Z_BLOCK: 5,
          Z_TREES: 6,
          Z_OK: 0,
          Z_STREAM_END: 1,
          Z_NEED_DICT: 2,
          Z_ERRNO: -1,
          Z_STREAM_ERROR: -2,
          Z_DATA_ERROR: -3,
          Z_BUF_ERROR: -5,
          Z_NO_COMPRESSION: 0,
          Z_BEST_SPEED: 1,
          Z_BEST_COMPRESSION: 9,
          Z_DEFAULT_COMPRESSION: -1,
          Z_FILTERED: 1,
          Z_HUFFMAN_ONLY: 2,
          Z_RLE: 3,
          Z_FIXED: 4,
          Z_DEFAULT_STRATEGY: 0,
          Z_BINARY: 0,
          Z_TEXT: 1,
          Z_UNKNOWN: 2,
          Z_DEFLATED: 8
        };
      }, {}],
      45: [function(t, u, l) {
        var o = (function() {
          for (var s, a = [], d = 0; d < 256; d++) {
            s = d;
            for (var g = 0; g < 8; g++) s = 1 & s ? 3988292384 ^ s >>> 1 : s >>> 1;
            a[d] = s;
          }
          return a;
        })();
        u.exports = function(s, a, d, g) {
          var v = o, b = g + d;
          s ^= -1;
          for (var R = g; R < b; R++) s = s >>> 8 ^ v[255 & (s ^ a[R])];
          return -1 ^ s;
        };
      }, {}],
      46: [function(t, u, l) {
        var o, s = t("../utils/common"), a = t("./trees"), d = t("./adler32"), g = t("./crc32"), v = t("./messages"), b = 0, R = 4, m = 0, w = -2, y = -1, k = 4, N = 2, _ = 8, x = 9, A = 286, S = 30, p = 19, F = 2 * A + 1, M = 15, I = 3, q = 258, Q = q + I + 1, O = 42, W = 113, T = 1, H = 2, J = 3, $ = 4;
        function oe(c, G) {
          return c.msg = v[G], G;
        }
        function Z(c) {
          return (c << 1) - (4 < c ? 9 : 0);
        }
        function ee(c) {
          for (var G = c.length; 0 <= --G; ) c[G] = 0;
        }
        function V(c) {
          var G = c.state, C = G.pending;
          C > c.avail_out && (C = c.avail_out), C !== 0 && (s.arraySet(c.output, G.pending_buf, G.pending_out, C, c.next_out), c.next_out += C, G.pending_out += C, c.total_out += C, c.avail_out -= C, G.pending -= C, G.pending === 0 && (G.pending_out = 0));
        }
        function P(c, G) {
          a._tr_flush_block(c, 0 <= c.block_start ? c.block_start : -1, c.strstart - c.block_start, G), c.block_start = c.strstart, V(c.strm);
        }
        function X(c, G) {
          c.pending_buf[c.pending++] = G;
        }
        function Y(c, G) {
          c.pending_buf[c.pending++] = G >>> 8 & 255, c.pending_buf[c.pending++] = 255 & G;
        }
        function te(c, G) {
          var C, r, i = c.max_chain_length, f = c.strstart, L = c.prev_length, K = c.nice_match, z = c.strstart > c.w_size - Q ? c.strstart - (c.w_size - Q) : 0, ne = c.window, se = c.w_mask, ae = c.prev, he = c.strstart + q, de = ne[f + L - 1], me = ne[f + L];
          c.prev_length >= c.good_match && (i >>= 2), K > c.lookahead && (K = c.lookahead);
          do
            if (ne[(C = G) + L] === me && ne[C + L - 1] === de && ne[C] === ne[f] && ne[++C] === ne[f + 1]) {
              f += 2, C++;
              do
                ;
              while (ne[++f] === ne[++C] && ne[++f] === ne[++C] && ne[++f] === ne[++C] && ne[++f] === ne[++C] && ne[++f] === ne[++C] && ne[++f] === ne[++C] && ne[++f] === ne[++C] && ne[++f] === ne[++C] && f < he);
              if (r = q - (he - f), f = he - q, L < r) {
                if (c.match_start = G, K <= (L = r)) break;
                de = ne[f + L - 1], me = ne[f + L];
              }
            }
          while ((G = ae[G & se]) > z && --i != 0);
          return L <= c.lookahead ? L : c.lookahead;
        }
        function fe(c) {
          var G, C, r, i, f, L, K, z, ne, se, ae = c.w_size;
          do {
            if (i = c.window_size - c.lookahead - c.strstart, c.strstart >= ae + (ae - Q)) {
              for (s.arraySet(c.window, c.window, ae, ae, 0), c.match_start -= ae, c.strstart -= ae, c.block_start -= ae, G = C = c.hash_size; r = c.head[--G], c.head[G] = ae <= r ? r - ae : 0, --C; ) ;
              for (G = C = ae; r = c.prev[--G], c.prev[G] = ae <= r ? r - ae : 0, --C; ) ;
              i += ae;
            }
            if (c.strm.avail_in === 0) break;
            if (L = c.strm, K = c.window, z = c.strstart + c.lookahead, ne = i, se = void 0, se = L.avail_in, ne < se && (se = ne), C = se === 0 ? 0 : (L.avail_in -= se, s.arraySet(K, L.input, L.next_in, se, z), L.state.wrap === 1 ? L.adler = d(L.adler, K, se, z) : L.state.wrap === 2 && (L.adler = g(L.adler, K, se, z)), L.next_in += se, L.total_in += se, se), c.lookahead += C, c.lookahead + c.insert >= I) for (f = c.strstart - c.insert, c.ins_h = c.window[f], c.ins_h = (c.ins_h << c.hash_shift ^ c.window[f + 1]) & c.hash_mask; c.insert && (c.ins_h = (c.ins_h << c.hash_shift ^ c.window[f + I - 1]) & c.hash_mask, c.prev[f & c.w_mask] = c.head[c.ins_h], c.head[c.ins_h] = f, f++, c.insert--, !(c.lookahead + c.insert < I)); ) ;
          } while (c.lookahead < Q && c.strm.avail_in !== 0);
        }
        function E(c, G) {
          for (var C, r; ; ) {
            if (c.lookahead < Q) {
              if (fe(c), c.lookahead < Q && G === b) return T;
              if (c.lookahead === 0) break;
            }
            if (C = 0, c.lookahead >= I && (c.ins_h = (c.ins_h << c.hash_shift ^ c.window[c.strstart + I - 1]) & c.hash_mask, C = c.prev[c.strstart & c.w_mask] = c.head[c.ins_h], c.head[c.ins_h] = c.strstart), C !== 0 && c.strstart - C <= c.w_size - Q && (c.match_length = te(c, C)), c.match_length >= I) if (r = a._tr_tally(c, c.strstart - c.match_start, c.match_length - I), c.lookahead -= c.match_length, c.match_length <= c.max_lazy_match && c.lookahead >= I) {
              for (c.match_length--; c.strstart++, c.ins_h = (c.ins_h << c.hash_shift ^ c.window[c.strstart + I - 1]) & c.hash_mask, C = c.prev[c.strstart & c.w_mask] = c.head[c.ins_h], c.head[c.ins_h] = c.strstart, --c.match_length != 0; ) ;
              c.strstart++;
            } else c.strstart += c.match_length, c.match_length = 0, c.ins_h = c.window[c.strstart], c.ins_h = (c.ins_h << c.hash_shift ^ c.window[c.strstart + 1]) & c.hash_mask;
            else r = a._tr_tally(c, 0, c.window[c.strstart]), c.lookahead--, c.strstart++;
            if (r && (P(c, !1), c.strm.avail_out === 0)) return T;
          }
          return c.insert = c.strstart < I - 1 ? c.strstart : I - 1, G === R ? (P(c, !0), c.strm.avail_out === 0 ? J : $) : c.last_lit && (P(c, !1), c.strm.avail_out === 0) ? T : H;
        }
        function h(c, G) {
          for (var C, r, i; ; ) {
            if (c.lookahead < Q) {
              if (fe(c), c.lookahead < Q && G === b) return T;
              if (c.lookahead === 0) break;
            }
            if (C = 0, c.lookahead >= I && (c.ins_h = (c.ins_h << c.hash_shift ^ c.window[c.strstart + I - 1]) & c.hash_mask, C = c.prev[c.strstart & c.w_mask] = c.head[c.ins_h], c.head[c.ins_h] = c.strstart), c.prev_length = c.match_length, c.prev_match = c.match_start, c.match_length = I - 1, C !== 0 && c.prev_length < c.max_lazy_match && c.strstart - C <= c.w_size - Q && (c.match_length = te(c, C), c.match_length <= 5 && (c.strategy === 1 || c.match_length === I && 4096 < c.strstart - c.match_start) && (c.match_length = I - 1)), c.prev_length >= I && c.match_length <= c.prev_length) {
              for (i = c.strstart + c.lookahead - I, r = a._tr_tally(c, c.strstart - 1 - c.prev_match, c.prev_length - I), c.lookahead -= c.prev_length - 1, c.prev_length -= 2; ++c.strstart <= i && (c.ins_h = (c.ins_h << c.hash_shift ^ c.window[c.strstart + I - 1]) & c.hash_mask, C = c.prev[c.strstart & c.w_mask] = c.head[c.ins_h], c.head[c.ins_h] = c.strstart), --c.prev_length != 0; ) ;
              if (c.match_available = 0, c.match_length = I - 1, c.strstart++, r && (P(c, !1), c.strm.avail_out === 0)) return T;
            } else if (c.match_available) {
              if ((r = a._tr_tally(c, 0, c.window[c.strstart - 1])) && P(c, !1), c.strstart++, c.lookahead--, c.strm.avail_out === 0) return T;
            } else c.match_available = 1, c.strstart++, c.lookahead--;
          }
          return c.match_available && (r = a._tr_tally(c, 0, c.window[c.strstart - 1]), c.match_available = 0), c.insert = c.strstart < I - 1 ? c.strstart : I - 1, G === R ? (P(c, !0), c.strm.avail_out === 0 ? J : $) : c.last_lit && (P(c, !1), c.strm.avail_out === 0) ? T : H;
        }
        function j(c, G, C, r, i) {
          this.good_length = c, this.max_lazy = G, this.nice_length = C, this.max_chain = r, this.func = i;
        }
        function U() {
          this.strm = null, this.status = 0, this.pending_buf = null, this.pending_buf_size = 0, this.pending_out = 0, this.pending = 0, this.wrap = 0, this.gzhead = null, this.gzindex = 0, this.method = _, this.last_flush = -1, this.w_size = 0, this.w_bits = 0, this.w_mask = 0, this.window = null, this.window_size = 0, this.prev = null, this.head = null, this.ins_h = 0, this.hash_size = 0, this.hash_bits = 0, this.hash_mask = 0, this.hash_shift = 0, this.block_start = 0, this.match_length = 0, this.prev_match = 0, this.match_available = 0, this.strstart = 0, this.match_start = 0, this.lookahead = 0, this.prev_length = 0, this.max_chain_length = 0, this.max_lazy_match = 0, this.level = 0, this.strategy = 0, this.good_match = 0, this.nice_match = 0, this.dyn_ltree = new s.Buf16(2 * F), this.dyn_dtree = new s.Buf16(2 * (2 * S + 1)), this.bl_tree = new s.Buf16(2 * (2 * p + 1)), ee(this.dyn_ltree), ee(this.dyn_dtree), ee(this.bl_tree), this.l_desc = null, this.d_desc = null, this.bl_desc = null, this.bl_count = new s.Buf16(M + 1), this.heap = new s.Buf16(2 * A + 1), ee(this.heap), this.heap_len = 0, this.heap_max = 0, this.depth = new s.Buf16(2 * A + 1), ee(this.depth), this.l_buf = 0, this.lit_bufsize = 0, this.last_lit = 0, this.d_buf = 0, this.opt_len = 0, this.static_len = 0, this.matches = 0, this.insert = 0, this.bi_buf = 0, this.bi_valid = 0;
        }
        function re(c) {
          var G;
          return c && c.state ? (c.total_in = c.total_out = 0, c.data_type = N, (G = c.state).pending = 0, G.pending_out = 0, G.wrap < 0 && (G.wrap = -G.wrap), G.status = G.wrap ? O : W, c.adler = G.wrap === 2 ? 0 : 1, G.last_flush = b, a._tr_init(G), m) : oe(c, w);
        }
        function D(c) {
          var G = re(c);
          return G === m && (function(C) {
            C.window_size = 2 * C.w_size, ee(C.head), C.max_lazy_match = o[C.level].max_lazy, C.good_match = o[C.level].good_length, C.nice_match = o[C.level].nice_length, C.max_chain_length = o[C.level].max_chain, C.strstart = 0, C.block_start = 0, C.lookahead = 0, C.insert = 0, C.match_length = C.prev_length = I - 1, C.match_available = 0, C.ins_h = 0;
          })(c.state), G;
        }
        function B(c, G, C, r, i, f) {
          if (!c) return w;
          var L = 1;
          if (G === y && (G = 6), r < 0 ? (L = 0, r = -r) : 15 < r && (L = 2, r -= 16), i < 1 || x < i || C !== _ || r < 8 || 15 < r || G < 0 || 9 < G || f < 0 || k < f) return oe(c, w);
          r === 8 && (r = 9);
          var K = new U();
          return (c.state = K).strm = c, K.wrap = L, K.gzhead = null, K.w_bits = r, K.w_size = 1 << K.w_bits, K.w_mask = K.w_size - 1, K.hash_bits = i + 7, K.hash_size = 1 << K.hash_bits, K.hash_mask = K.hash_size - 1, K.hash_shift = ~~((K.hash_bits + I - 1) / I), K.window = new s.Buf8(2 * K.w_size), K.head = new s.Buf16(K.hash_size), K.prev = new s.Buf16(K.w_size), K.lit_bufsize = 1 << i + 6, K.pending_buf_size = 4 * K.lit_bufsize, K.pending_buf = new s.Buf8(K.pending_buf_size), K.d_buf = 1 * K.lit_bufsize, K.l_buf = 3 * K.lit_bufsize, K.level = G, K.strategy = f, K.method = C, D(c);
        }
        o = [
          new j(0, 0, 0, 0, function(c, G) {
            var C = 65535;
            for (C > c.pending_buf_size - 5 && (C = c.pending_buf_size - 5); ; ) {
              if (c.lookahead <= 1) {
                if (fe(c), c.lookahead === 0 && G === b) return T;
                if (c.lookahead === 0) break;
              }
              c.strstart += c.lookahead, c.lookahead = 0;
              var r = c.block_start + C;
              if ((c.strstart === 0 || c.strstart >= r) && (c.lookahead = c.strstart - r, c.strstart = r, P(c, !1), c.strm.avail_out === 0) || c.strstart - c.block_start >= c.w_size - Q && (P(c, !1), c.strm.avail_out === 0)) return T;
            }
            return c.insert = 0, G === R ? (P(c, !0), c.strm.avail_out === 0 ? J : $) : (c.strstart > c.block_start && (P(c, !1), c.strm.avail_out), T);
          }),
          new j(4, 4, 8, 4, E),
          new j(4, 5, 16, 8, E),
          new j(4, 6, 32, 32, E),
          new j(4, 4, 16, 16, h),
          new j(8, 16, 32, 32, h),
          new j(8, 16, 128, 128, h),
          new j(8, 32, 128, 256, h),
          new j(32, 128, 258, 1024, h),
          new j(32, 258, 258, 4096, h)
        ], l.deflateInit = function(c, G) {
          return B(c, G, _, 15, 8, 0);
        }, l.deflateInit2 = B, l.deflateReset = D, l.deflateResetKeep = re, l.deflateSetHeader = function(c, G) {
          return c && c.state ? c.state.wrap !== 2 ? w : (c.state.gzhead = G, m) : w;
        }, l.deflate = function(c, G) {
          var C, r, i, f;
          if (!c || !c.state || 5 < G || G < 0) return c ? oe(c, w) : w;
          if (r = c.state, !c.output || !c.input && c.avail_in !== 0 || r.status === 666 && G !== R) return oe(c, c.avail_out === 0 ? -5 : w);
          if (r.strm = c, C = r.last_flush, r.last_flush = G, r.status === O) if (r.wrap === 2) c.adler = 0, X(r, 31), X(r, 139), X(r, 8), r.gzhead ? (X(r, (r.gzhead.text ? 1 : 0) + (r.gzhead.hcrc ? 2 : 0) + (r.gzhead.extra ? 4 : 0) + (r.gzhead.name ? 8 : 0) + (r.gzhead.comment ? 16 : 0)), X(r, 255 & r.gzhead.time), X(r, r.gzhead.time >> 8 & 255), X(r, r.gzhead.time >> 16 & 255), X(r, r.gzhead.time >> 24 & 255), X(r, r.level === 9 ? 2 : 2 <= r.strategy || r.level < 2 ? 4 : 0), X(r, 255 & r.gzhead.os), r.gzhead.extra && r.gzhead.extra.length && (X(r, 255 & r.gzhead.extra.length), X(r, r.gzhead.extra.length >> 8 & 255)), r.gzhead.hcrc && (c.adler = g(c.adler, r.pending_buf, r.pending, 0)), r.gzindex = 0, r.status = 69) : (X(r, 0), X(r, 0), X(r, 0), X(r, 0), X(r, 0), X(r, r.level === 9 ? 2 : 2 <= r.strategy || r.level < 2 ? 4 : 0), X(r, 3), r.status = W);
          else {
            var L = _ + (r.w_bits - 8 << 4) << 8;
            L |= (2 <= r.strategy || r.level < 2 ? 0 : r.level < 6 ? 1 : r.level === 6 ? 2 : 3) << 6, r.strstart !== 0 && (L |= 32), L += 31 - L % 31, r.status = W, Y(r, L), r.strstart !== 0 && (Y(r, c.adler >>> 16), Y(r, 65535 & c.adler)), c.adler = 1;
          }
          if (r.status === 69) if (r.gzhead.extra) {
            for (i = r.pending; r.gzindex < (65535 & r.gzhead.extra.length) && (r.pending !== r.pending_buf_size || (r.gzhead.hcrc && r.pending > i && (c.adler = g(c.adler, r.pending_buf, r.pending - i, i)), V(c), i = r.pending, r.pending !== r.pending_buf_size)); ) X(r, 255 & r.gzhead.extra[r.gzindex]), r.gzindex++;
            r.gzhead.hcrc && r.pending > i && (c.adler = g(c.adler, r.pending_buf, r.pending - i, i)), r.gzindex === r.gzhead.extra.length && (r.gzindex = 0, r.status = 73);
          } else r.status = 73;
          if (r.status === 73) if (r.gzhead.name) {
            i = r.pending;
            do {
              if (r.pending === r.pending_buf_size && (r.gzhead.hcrc && r.pending > i && (c.adler = g(c.adler, r.pending_buf, r.pending - i, i)), V(c), i = r.pending, r.pending === r.pending_buf_size)) {
                f = 1;
                break;
              }
              f = r.gzindex < r.gzhead.name.length ? 255 & r.gzhead.name.charCodeAt(r.gzindex++) : 0, X(r, f);
            } while (f !== 0);
            r.gzhead.hcrc && r.pending > i && (c.adler = g(c.adler, r.pending_buf, r.pending - i, i)), f === 0 && (r.gzindex = 0, r.status = 91);
          } else r.status = 91;
          if (r.status === 91) if (r.gzhead.comment) {
            i = r.pending;
            do {
              if (r.pending === r.pending_buf_size && (r.gzhead.hcrc && r.pending > i && (c.adler = g(c.adler, r.pending_buf, r.pending - i, i)), V(c), i = r.pending, r.pending === r.pending_buf_size)) {
                f = 1;
                break;
              }
              f = r.gzindex < r.gzhead.comment.length ? 255 & r.gzhead.comment.charCodeAt(r.gzindex++) : 0, X(r, f);
            } while (f !== 0);
            r.gzhead.hcrc && r.pending > i && (c.adler = g(c.adler, r.pending_buf, r.pending - i, i)), f === 0 && (r.status = 103);
          } else r.status = 103;
          if (r.status === 103 && (r.gzhead.hcrc ? (r.pending + 2 > r.pending_buf_size && V(c), r.pending + 2 <= r.pending_buf_size && (X(r, 255 & c.adler), X(r, c.adler >> 8 & 255), c.adler = 0, r.status = W)) : r.status = W), r.pending !== 0) {
            if (V(c), c.avail_out === 0) return r.last_flush = -1, m;
          } else if (c.avail_in === 0 && Z(G) <= Z(C) && G !== R) return oe(c, -5);
          if (r.status === 666 && c.avail_in !== 0) return oe(c, -5);
          if (c.avail_in !== 0 || r.lookahead !== 0 || G !== b && r.status !== 666) {
            var K = r.strategy === 2 ? (function(z, ne) {
              for (var se; ; ) {
                if (z.lookahead === 0 && (fe(z), z.lookahead === 0)) {
                  if (ne === b) return T;
                  break;
                }
                if (z.match_length = 0, se = a._tr_tally(z, 0, z.window[z.strstart]), z.lookahead--, z.strstart++, se && (P(z, !1), z.strm.avail_out === 0)) return T;
              }
              return z.insert = 0, ne === R ? (P(z, !0), z.strm.avail_out === 0 ? J : $) : z.last_lit && (P(z, !1), z.strm.avail_out === 0) ? T : H;
            })(r, G) : r.strategy === 3 ? (function(z, ne) {
              for (var se, ae, he, de, me = z.window; ; ) {
                if (z.lookahead <= q) {
                  if (fe(z), z.lookahead <= q && ne === b) return T;
                  if (z.lookahead === 0) break;
                }
                if (z.match_length = 0, z.lookahead >= I && 0 < z.strstart && (ae = me[he = z.strstart - 1]) === me[++he] && ae === me[++he] && ae === me[++he]) {
                  de = z.strstart + q;
                  do
                    ;
                  while (ae === me[++he] && ae === me[++he] && ae === me[++he] && ae === me[++he] && ae === me[++he] && ae === me[++he] && ae === me[++he] && ae === me[++he] && he < de);
                  z.match_length = q - (de - he), z.match_length > z.lookahead && (z.match_length = z.lookahead);
                }
                if (z.match_length >= I ? (se = a._tr_tally(z, 1, z.match_length - I), z.lookahead -= z.match_length, z.strstart += z.match_length, z.match_length = 0) : (se = a._tr_tally(z, 0, z.window[z.strstart]), z.lookahead--, z.strstart++), se && (P(z, !1), z.strm.avail_out === 0)) return T;
              }
              return z.insert = 0, ne === R ? (P(z, !0), z.strm.avail_out === 0 ? J : $) : z.last_lit && (P(z, !1), z.strm.avail_out === 0) ? T : H;
            })(r, G) : o[r.level].func(r, G);
            if (K !== J && K !== $ || (r.status = 666), K === T || K === J) return c.avail_out === 0 && (r.last_flush = -1), m;
            if (K === H && (G === 1 ? a._tr_align(r) : G !== 5 && (a._tr_stored_block(r, 0, 0, !1), G === 3 && (ee(r.head), r.lookahead === 0 && (r.strstart = 0, r.block_start = 0, r.insert = 0))), V(c), c.avail_out === 0)) return r.last_flush = -1, m;
          }
          return G !== R ? m : r.wrap <= 0 ? 1 : (r.wrap === 2 ? (X(r, 255 & c.adler), X(r, c.adler >> 8 & 255), X(r, c.adler >> 16 & 255), X(r, c.adler >> 24 & 255), X(r, 255 & c.total_in), X(r, c.total_in >> 8 & 255), X(r, c.total_in >> 16 & 255), X(r, c.total_in >> 24 & 255)) : (Y(r, c.adler >>> 16), Y(r, 65535 & c.adler)), V(c), 0 < r.wrap && (r.wrap = -r.wrap), r.pending !== 0 ? m : 1);
        }, l.deflateEnd = function(c) {
          var G;
          return c && c.state ? (G = c.state.status) !== O && G !== 69 && G !== 73 && G !== 91 && G !== 103 && G !== W && G !== 666 ? oe(c, w) : (c.state = null, G === W ? oe(c, -3) : m) : w;
        }, l.deflateSetDictionary = function(c, G) {
          var C, r, i, f, L, K, z, ne, se = G.length;
          if (!c || !c.state || (f = (C = c.state).wrap) === 2 || f === 1 && C.status !== O || C.lookahead) return w;
          for (f === 1 && (c.adler = d(c.adler, G, se, 0)), C.wrap = 0, se >= C.w_size && (f === 0 && (ee(C.head), C.strstart = 0, C.block_start = 0, C.insert = 0), ne = new s.Buf8(C.w_size), s.arraySet(ne, G, se - C.w_size, C.w_size, 0), G = ne, se = C.w_size), L = c.avail_in, K = c.next_in, z = c.input, c.avail_in = se, c.next_in = 0, c.input = G, fe(C); C.lookahead >= I; ) {
            for (r = C.strstart, i = C.lookahead - (I - 1); C.ins_h = (C.ins_h << C.hash_shift ^ C.window[r + I - 1]) & C.hash_mask, C.prev[r & C.w_mask] = C.head[C.ins_h], C.head[C.ins_h] = r, r++, --i; ) ;
            C.strstart = r, C.lookahead = I - 1, fe(C);
          }
          return C.strstart += C.lookahead, C.block_start = C.strstart, C.insert = C.lookahead, C.lookahead = 0, C.match_length = C.prev_length = I - 1, C.match_available = 0, c.next_in = K, c.input = z, c.avail_in = L, C.wrap = f, m;
        }, l.deflateInfo = "pako deflate (from Nodeca project)";
      }, {
        "../utils/common": 41,
        "./adler32": 43,
        "./crc32": 45,
        "./messages": 51,
        "./trees": 52
      }],
      47: [function(t, u, l) {
        u.exports = function() {
          this.text = 0, this.time = 0, this.xflags = 0, this.os = 0, this.extra = null, this.extra_len = 0, this.name = "", this.comment = "", this.hcrc = 0, this.done = !1;
        };
      }, {}],
      48: [function(t, u, l) {
        u.exports = function(o, s) {
          var a = o.state, d = o.next_in, g, v, b, R, m, w, y, k, N, _, x, A, S, p, F, M, I, q, Q, O, W, T = o.input, H;
          g = d + (o.avail_in - 5), v = o.next_out, H = o.output, b = v - (s - o.avail_out), R = v + (o.avail_out - 257), m = a.dmax, w = a.wsize, y = a.whave, k = a.wnext, N = a.window, _ = a.hold, x = a.bits, A = a.lencode, S = a.distcode, p = (1 << a.lenbits) - 1, F = (1 << a.distbits) - 1;
          e: do {
            x < 15 && (_ += T[d++] << x, x += 8, _ += T[d++] << x, x += 8), M = A[_ & p];
            t: for (; ; ) {
              if (_ >>>= I = M >>> 24, x -= I, (I = M >>> 16 & 255) === 0) H[v++] = 65535 & M;
              else {
                if (!(16 & I)) {
                  if ((64 & I) == 0) {
                    M = A[(65535 & M) + (_ & (1 << I) - 1)];
                    continue t;
                  }
                  if (32 & I) {
                    a.mode = 12;
                    break e;
                  }
                  o.msg = "invalid literal/length code", a.mode = 30;
                  break e;
                }
                q = 65535 & M, (I &= 15) && (x < I && (_ += T[d++] << x, x += 8), q += _ & (1 << I) - 1, _ >>>= I, x -= I), x < 15 && (_ += T[d++] << x, x += 8, _ += T[d++] << x, x += 8), M = S[_ & F];
                r: for (; ; ) {
                  if (_ >>>= I = M >>> 24, x -= I, !(16 & (I = M >>> 16 & 255))) {
                    if ((64 & I) == 0) {
                      M = S[(65535 & M) + (_ & (1 << I) - 1)];
                      continue r;
                    }
                    o.msg = "invalid distance code", a.mode = 30;
                    break e;
                  }
                  if (Q = 65535 & M, x < (I &= 15) && (_ += T[d++] << x, (x += 8) < I && (_ += T[d++] << x, x += 8)), m < (Q += _ & (1 << I) - 1)) {
                    o.msg = "invalid distance too far back", a.mode = 30;
                    break e;
                  }
                  if (_ >>>= I, x -= I, (I = v - b) < Q) {
                    if (y < (I = Q - I) && a.sane) {
                      o.msg = "invalid distance too far back", a.mode = 30;
                      break e;
                    }
                    if (W = N, (O = 0) === k) {
                      if (O += w - I, I < q) {
                        for (q -= I; H[v++] = N[O++], --I; ) ;
                        O = v - Q, W = H;
                      }
                    } else if (k < I) {
                      if (O += w + k - I, (I -= k) < q) {
                        for (q -= I; H[v++] = N[O++], --I; ) ;
                        if (O = 0, k < q) {
                          for (q -= I = k; H[v++] = N[O++], --I; ) ;
                          O = v - Q, W = H;
                        }
                      }
                    } else if (O += k - I, I < q) {
                      for (q -= I; H[v++] = N[O++], --I; ) ;
                      O = v - Q, W = H;
                    }
                    for (; 2 < q; ) H[v++] = W[O++], H[v++] = W[O++], H[v++] = W[O++], q -= 3;
                    q && (H[v++] = W[O++], 1 < q && (H[v++] = W[O++]));
                  } else {
                    for (O = v - Q; H[v++] = H[O++], H[v++] = H[O++], H[v++] = H[O++], 2 < (q -= 3); ) ;
                    q && (H[v++] = H[O++], 1 < q && (H[v++] = H[O++]));
                  }
                  break;
                }
              }
              break;
            }
          } while (d < g && v < R);
          d -= q = x >> 3, _ &= (1 << (x -= q << 3)) - 1, o.next_in = d, o.next_out = v, o.avail_in = d < g ? g - d + 5 : 5 - (d - g), o.avail_out = v < R ? R - v + 257 : 257 - (v - R), a.hold = _, a.bits = x;
        };
      }, {}],
      49: [function(t, u, l) {
        var o = t("../utils/common"), s = t("./adler32"), a = t("./crc32"), d = t("./inffast"), g = t("./inftrees"), v = 1, b = 2, R = 0, m = -2, w = 1, y = 852, k = 592;
        function N(O) {
          return (O >>> 24 & 255) + (O >>> 8 & 65280) + ((65280 & O) << 8) + ((255 & O) << 24);
        }
        function _() {
          this.mode = 0, this.last = !1, this.wrap = 0, this.havedict = !1, this.flags = 0, this.dmax = 0, this.check = 0, this.total = 0, this.head = null, this.wbits = 0, this.wsize = 0, this.whave = 0, this.wnext = 0, this.window = null, this.hold = 0, this.bits = 0, this.length = 0, this.offset = 0, this.extra = 0, this.lencode = null, this.distcode = null, this.lenbits = 0, this.distbits = 0, this.ncode = 0, this.nlen = 0, this.ndist = 0, this.have = 0, this.next = null, this.lens = new o.Buf16(320), this.work = new o.Buf16(288), this.lendyn = null, this.distdyn = null, this.sane = 0, this.back = 0, this.was = 0;
        }
        function x(O) {
          var W;
          return O && O.state ? (W = O.state, O.total_in = O.total_out = W.total = 0, O.msg = "", W.wrap && (O.adler = 1 & W.wrap), W.mode = w, W.last = 0, W.havedict = 0, W.dmax = 32768, W.head = null, W.hold = 0, W.bits = 0, W.lencode = W.lendyn = new o.Buf32(y), W.distcode = W.distdyn = new o.Buf32(k), W.sane = 1, W.back = -1, R) : m;
        }
        function A(O) {
          var W;
          return O && O.state ? ((W = O.state).wsize = 0, W.whave = 0, W.wnext = 0, x(O)) : m;
        }
        function S(O, W) {
          var T, H;
          return O && O.state ? (H = O.state, W < 0 ? (T = 0, W = -W) : (T = 1 + (W >> 4), W < 48 && (W &= 15)), W && (W < 8 || 15 < W) ? m : (H.window !== null && H.wbits !== W && (H.window = null), H.wrap = T, H.wbits = W, A(O))) : m;
        }
        function p(O, W) {
          var T, H;
          return O ? (H = new _(), (O.state = H).window = null, (T = S(O, W)) !== R && (O.state = null), T) : m;
        }
        var F, M, I = !0;
        function q(O) {
          if (I) {
            var W;
            for (F = new o.Buf32(512), M = new o.Buf32(32), W = 0; W < 144; ) O.lens[W++] = 8;
            for (; W < 256; ) O.lens[W++] = 9;
            for (; W < 280; ) O.lens[W++] = 7;
            for (; W < 288; ) O.lens[W++] = 8;
            for (g(v, O.lens, 0, 288, F, 0, O.work, { bits: 9 }), W = 0; W < 32; ) O.lens[W++] = 5;
            g(b, O.lens, 0, 32, M, 0, O.work, { bits: 5 }), I = !1;
          }
          O.lencode = F, O.lenbits = 9, O.distcode = M, O.distbits = 5;
        }
        function Q(O, W, T, H) {
          var J, $ = O.state;
          return $.window === null && ($.wsize = 1 << $.wbits, $.wnext = 0, $.whave = 0, $.window = new o.Buf8($.wsize)), H >= $.wsize ? (o.arraySet($.window, W, T - $.wsize, $.wsize, 0), $.wnext = 0, $.whave = $.wsize) : (H < (J = $.wsize - $.wnext) && (J = H), o.arraySet($.window, W, T - H, J, $.wnext), (H -= J) ? (o.arraySet($.window, W, T - H, H, 0), $.wnext = H, $.whave = $.wsize) : ($.wnext += J, $.wnext === $.wsize && ($.wnext = 0), $.whave < $.wsize && ($.whave += J))), 0;
        }
        l.inflateReset = A, l.inflateReset2 = S, l.inflateResetKeep = x, l.inflateInit = function(O) {
          return p(O, 15);
        }, l.inflateInit2 = p, l.inflate = function(O, W) {
          var T, H, J, $, oe, Z, ee, V, P, X, Y, te, fe, E, h, j, U, re, D, B, c, G, C, r, i = 0, f = new o.Buf8(4), L = [
            16,
            17,
            18,
            0,
            8,
            7,
            9,
            6,
            10,
            5,
            11,
            4,
            12,
            3,
            13,
            2,
            14,
            1,
            15
          ];
          if (!O || !O.state || !O.output || !O.input && O.avail_in !== 0) return m;
          (T = O.state).mode === 12 && (T.mode = 13), oe = O.next_out, J = O.output, ee = O.avail_out, $ = O.next_in, H = O.input, Z = O.avail_in, V = T.hold, P = T.bits, X = Z, Y = ee, G = R;
          e: for (; ; ) switch (T.mode) {
            case w:
              if (T.wrap === 0) {
                T.mode = 13;
                break;
              }
              for (; P < 16; ) {
                if (Z === 0) break e;
                Z--, V += H[$++] << P, P += 8;
              }
              if (2 & T.wrap && V === 35615) {
                f[T.check = 0] = 255 & V, f[1] = V >>> 8 & 255, T.check = a(T.check, f, 2, 0), P = V = 0, T.mode = 2;
                break;
              }
              if (T.flags = 0, T.head && (T.head.done = !1), !(1 & T.wrap) || (((255 & V) << 8) + (V >> 8)) % 31) {
                O.msg = "incorrect header check", T.mode = 30;
                break;
              }
              if ((15 & V) != 8) {
                O.msg = "unknown compression method", T.mode = 30;
                break;
              }
              if (P -= 4, c = 8 + (15 & (V >>>= 4)), T.wbits === 0) T.wbits = c;
              else if (c > T.wbits) {
                O.msg = "invalid window size", T.mode = 30;
                break;
              }
              T.dmax = 1 << c, O.adler = T.check = 1, T.mode = 512 & V ? 10 : 12, P = V = 0;
              break;
            case 2:
              for (; P < 16; ) {
                if (Z === 0) break e;
                Z--, V += H[$++] << P, P += 8;
              }
              if (T.flags = V, (255 & T.flags) != 8) {
                O.msg = "unknown compression method", T.mode = 30;
                break;
              }
              if (57344 & T.flags) {
                O.msg = "unknown header flags set", T.mode = 30;
                break;
              }
              T.head && (T.head.text = V >> 8 & 1), 512 & T.flags && (f[0] = 255 & V, f[1] = V >>> 8 & 255, T.check = a(T.check, f, 2, 0)), P = V = 0, T.mode = 3;
            case 3:
              for (; P < 32; ) {
                if (Z === 0) break e;
                Z--, V += H[$++] << P, P += 8;
              }
              T.head && (T.head.time = V), 512 & T.flags && (f[0] = 255 & V, f[1] = V >>> 8 & 255, f[2] = V >>> 16 & 255, f[3] = V >>> 24 & 255, T.check = a(T.check, f, 4, 0)), P = V = 0, T.mode = 4;
            case 4:
              for (; P < 16; ) {
                if (Z === 0) break e;
                Z--, V += H[$++] << P, P += 8;
              }
              T.head && (T.head.xflags = 255 & V, T.head.os = V >> 8), 512 & T.flags && (f[0] = 255 & V, f[1] = V >>> 8 & 255, T.check = a(T.check, f, 2, 0)), P = V = 0, T.mode = 5;
            case 5:
              if (1024 & T.flags) {
                for (; P < 16; ) {
                  if (Z === 0) break e;
                  Z--, V += H[$++] << P, P += 8;
                }
                T.length = V, T.head && (T.head.extra_len = V), 512 & T.flags && (f[0] = 255 & V, f[1] = V >>> 8 & 255, T.check = a(T.check, f, 2, 0)), P = V = 0;
              } else T.head && (T.head.extra = null);
              T.mode = 6;
            case 6:
              if (1024 & T.flags && (Z < (te = T.length) && (te = Z), te && (T.head && (c = T.head.extra_len - T.length, T.head.extra || (T.head.extra = new Array(T.head.extra_len)), o.arraySet(T.head.extra, H, $, te, c)), 512 & T.flags && (T.check = a(T.check, H, te, $)), Z -= te, $ += te, T.length -= te), T.length)) break e;
              T.length = 0, T.mode = 7;
            case 7:
              if (2048 & T.flags) {
                if (Z === 0) break e;
                for (te = 0; c = H[$ + te++], T.head && c && T.length < 65536 && (T.head.name += String.fromCharCode(c)), c && te < Z; ) ;
                if (512 & T.flags && (T.check = a(T.check, H, te, $)), Z -= te, $ += te, c) break e;
              } else T.head && (T.head.name = null);
              T.length = 0, T.mode = 8;
            case 8:
              if (4096 & T.flags) {
                if (Z === 0) break e;
                for (te = 0; c = H[$ + te++], T.head && c && T.length < 65536 && (T.head.comment += String.fromCharCode(c)), c && te < Z; ) ;
                if (512 & T.flags && (T.check = a(T.check, H, te, $)), Z -= te, $ += te, c) break e;
              } else T.head && (T.head.comment = null);
              T.mode = 9;
            case 9:
              if (512 & T.flags) {
                for (; P < 16; ) {
                  if (Z === 0) break e;
                  Z--, V += H[$++] << P, P += 8;
                }
                if (V !== (65535 & T.check)) {
                  O.msg = "header crc mismatch", T.mode = 30;
                  break;
                }
                P = V = 0;
              }
              T.head && (T.head.hcrc = T.flags >> 9 & 1, T.head.done = !0), O.adler = T.check = 0, T.mode = 12;
              break;
            case 10:
              for (; P < 32; ) {
                if (Z === 0) break e;
                Z--, V += H[$++] << P, P += 8;
              }
              O.adler = T.check = N(V), P = V = 0, T.mode = 11;
            case 11:
              if (T.havedict === 0) return O.next_out = oe, O.avail_out = ee, O.next_in = $, O.avail_in = Z, T.hold = V, T.bits = P, 2;
              O.adler = T.check = 1, T.mode = 12;
            case 12:
              if (W === 5 || W === 6) break e;
            case 13:
              if (T.last) {
                V >>>= 7 & P, P -= 7 & P, T.mode = 27;
                break;
              }
              for (; P < 3; ) {
                if (Z === 0) break e;
                Z--, V += H[$++] << P, P += 8;
              }
              switch (T.last = 1 & V, P -= 1, 3 & (V >>>= 1)) {
                case 0:
                  T.mode = 14;
                  break;
                case 1:
                  if (q(T), T.mode = 20, W !== 6) break;
                  V >>>= 2, P -= 2;
                  break e;
                case 2:
                  T.mode = 17;
                  break;
                case 3:
                  O.msg = "invalid block type", T.mode = 30;
              }
              V >>>= 2, P -= 2;
              break;
            case 14:
              for (V >>>= 7 & P, P -= 7 & P; P < 32; ) {
                if (Z === 0) break e;
                Z--, V += H[$++] << P, P += 8;
              }
              if ((65535 & V) != (V >>> 16 ^ 65535)) {
                O.msg = "invalid stored block lengths", T.mode = 30;
                break;
              }
              if (T.length = 65535 & V, P = V = 0, T.mode = 15, W === 6) break e;
            case 15:
              T.mode = 16;
            case 16:
              if (te = T.length) {
                if (Z < te && (te = Z), ee < te && (te = ee), te === 0) break e;
                o.arraySet(J, H, $, te, oe), Z -= te, $ += te, ee -= te, oe += te, T.length -= te;
                break;
              }
              T.mode = 12;
              break;
            case 17:
              for (; P < 14; ) {
                if (Z === 0) break e;
                Z--, V += H[$++] << P, P += 8;
              }
              if (T.nlen = 257 + (31 & V), V >>>= 5, P -= 5, T.ndist = 1 + (31 & V), V >>>= 5, P -= 5, T.ncode = 4 + (15 & V), V >>>= 4, P -= 4, 286 < T.nlen || 30 < T.ndist) {
                O.msg = "too many length or distance symbols", T.mode = 30;
                break;
              }
              T.have = 0, T.mode = 18;
            case 18:
              for (; T.have < T.ncode; ) {
                for (; P < 3; ) {
                  if (Z === 0) break e;
                  Z--, V += H[$++] << P, P += 8;
                }
                T.lens[L[T.have++]] = 7 & V, V >>>= 3, P -= 3;
              }
              for (; T.have < 19; ) T.lens[L[T.have++]] = 0;
              if (T.lencode = T.lendyn, T.lenbits = 7, C = { bits: T.lenbits }, G = g(0, T.lens, 0, 19, T.lencode, 0, T.work, C), T.lenbits = C.bits, G) {
                O.msg = "invalid code lengths set", T.mode = 30;
                break;
              }
              T.have = 0, T.mode = 19;
            case 19:
              for (; T.have < T.nlen + T.ndist; ) {
                for (; j = (i = T.lencode[V & (1 << T.lenbits) - 1]) >>> 16 & 255, U = 65535 & i, !((h = i >>> 24) <= P); ) {
                  if (Z === 0) break e;
                  Z--, V += H[$++] << P, P += 8;
                }
                if (U < 16) V >>>= h, P -= h, T.lens[T.have++] = U;
                else {
                  if (U === 16) {
                    for (r = h + 2; P < r; ) {
                      if (Z === 0) break e;
                      Z--, V += H[$++] << P, P += 8;
                    }
                    if (V >>>= h, P -= h, T.have === 0) {
                      O.msg = "invalid bit length repeat", T.mode = 30;
                      break;
                    }
                    c = T.lens[T.have - 1], te = 3 + (3 & V), V >>>= 2, P -= 2;
                  } else if (U === 17) {
                    for (r = h + 3; P < r; ) {
                      if (Z === 0) break e;
                      Z--, V += H[$++] << P, P += 8;
                    }
                    P -= h, c = 0, te = 3 + (7 & (V >>>= h)), V >>>= 3, P -= 3;
                  } else {
                    for (r = h + 7; P < r; ) {
                      if (Z === 0) break e;
                      Z--, V += H[$++] << P, P += 8;
                    }
                    P -= h, c = 0, te = 11 + (127 & (V >>>= h)), V >>>= 7, P -= 7;
                  }
                  if (T.have + te > T.nlen + T.ndist) {
                    O.msg = "invalid bit length repeat", T.mode = 30;
                    break;
                  }
                  for (; te--; ) T.lens[T.have++] = c;
                }
              }
              if (T.mode === 30) break;
              if (T.lens[256] === 0) {
                O.msg = "invalid code -- missing end-of-block", T.mode = 30;
                break;
              }
              if (T.lenbits = 9, C = { bits: T.lenbits }, G = g(v, T.lens, 0, T.nlen, T.lencode, 0, T.work, C), T.lenbits = C.bits, G) {
                O.msg = "invalid literal/lengths set", T.mode = 30;
                break;
              }
              if (T.distbits = 6, T.distcode = T.distdyn, C = { bits: T.distbits }, G = g(b, T.lens, T.nlen, T.ndist, T.distcode, 0, T.work, C), T.distbits = C.bits, G) {
                O.msg = "invalid distances set", T.mode = 30;
                break;
              }
              if (T.mode = 20, W === 6) break e;
            case 20:
              T.mode = 21;
            case 21:
              if (6 <= Z && 258 <= ee) {
                O.next_out = oe, O.avail_out = ee, O.next_in = $, O.avail_in = Z, T.hold = V, T.bits = P, d(O, Y), oe = O.next_out, J = O.output, ee = O.avail_out, $ = O.next_in, H = O.input, Z = O.avail_in, V = T.hold, P = T.bits, T.mode === 12 && (T.back = -1);
                break;
              }
              for (T.back = 0; j = (i = T.lencode[V & (1 << T.lenbits) - 1]) >>> 16 & 255, U = 65535 & i, !((h = i >>> 24) <= P); ) {
                if (Z === 0) break e;
                Z--, V += H[$++] << P, P += 8;
              }
              if (j && (240 & j) == 0) {
                for (re = h, D = j, B = U; j = (i = T.lencode[B + ((V & (1 << re + D) - 1) >> re)]) >>> 16 & 255, U = 65535 & i, !(re + (h = i >>> 24) <= P); ) {
                  if (Z === 0) break e;
                  Z--, V += H[$++] << P, P += 8;
                }
                V >>>= re, P -= re, T.back += re;
              }
              if (V >>>= h, P -= h, T.back += h, T.length = U, j === 0) {
                T.mode = 26;
                break;
              }
              if (32 & j) {
                T.back = -1, T.mode = 12;
                break;
              }
              if (64 & j) {
                O.msg = "invalid literal/length code", T.mode = 30;
                break;
              }
              T.extra = 15 & j, T.mode = 22;
            case 22:
              if (T.extra) {
                for (r = T.extra; P < r; ) {
                  if (Z === 0) break e;
                  Z--, V += H[$++] << P, P += 8;
                }
                T.length += V & (1 << T.extra) - 1, V >>>= T.extra, P -= T.extra, T.back += T.extra;
              }
              T.was = T.length, T.mode = 23;
            case 23:
              for (; j = (i = T.distcode[V & (1 << T.distbits) - 1]) >>> 16 & 255, U = 65535 & i, !((h = i >>> 24) <= P); ) {
                if (Z === 0) break e;
                Z--, V += H[$++] << P, P += 8;
              }
              if ((240 & j) == 0) {
                for (re = h, D = j, B = U; j = (i = T.distcode[B + ((V & (1 << re + D) - 1) >> re)]) >>> 16 & 255, U = 65535 & i, !(re + (h = i >>> 24) <= P); ) {
                  if (Z === 0) break e;
                  Z--, V += H[$++] << P, P += 8;
                }
                V >>>= re, P -= re, T.back += re;
              }
              if (V >>>= h, P -= h, T.back += h, 64 & j) {
                O.msg = "invalid distance code", T.mode = 30;
                break;
              }
              T.offset = U, T.extra = 15 & j, T.mode = 24;
            case 24:
              if (T.extra) {
                for (r = T.extra; P < r; ) {
                  if (Z === 0) break e;
                  Z--, V += H[$++] << P, P += 8;
                }
                T.offset += V & (1 << T.extra) - 1, V >>>= T.extra, P -= T.extra, T.back += T.extra;
              }
              if (T.offset > T.dmax) {
                O.msg = "invalid distance too far back", T.mode = 30;
                break;
              }
              T.mode = 25;
            case 25:
              if (ee === 0) break e;
              if (te = Y - ee, T.offset > te) {
                if ((te = T.offset - te) > T.whave && T.sane) {
                  O.msg = "invalid distance too far back", T.mode = 30;
                  break;
                }
                fe = te > T.wnext ? (te -= T.wnext, T.wsize - te) : T.wnext - te, te > T.length && (te = T.length), E = T.window;
              } else E = J, fe = oe - T.offset, te = T.length;
              for (ee < te && (te = ee), ee -= te, T.length -= te; J[oe++] = E[fe++], --te; ) ;
              T.length === 0 && (T.mode = 21);
              break;
            case 26:
              if (ee === 0) break e;
              J[oe++] = T.length, ee--, T.mode = 21;
              break;
            case 27:
              if (T.wrap) {
                for (; P < 32; ) {
                  if (Z === 0) break e;
                  Z--, V |= H[$++] << P, P += 8;
                }
                if (Y -= ee, O.total_out += Y, T.total += Y, Y && (O.adler = T.check = T.flags ? a(T.check, J, Y, oe - Y) : s(T.check, J, Y, oe - Y)), Y = ee, (T.flags ? V : N(V)) !== T.check) {
                  O.msg = "incorrect data check", T.mode = 30;
                  break;
                }
                P = V = 0;
              }
              T.mode = 28;
            case 28:
              if (T.wrap && T.flags) {
                for (; P < 32; ) {
                  if (Z === 0) break e;
                  Z--, V += H[$++] << P, P += 8;
                }
                if (V !== (4294967295 & T.total)) {
                  O.msg = "incorrect length check", T.mode = 30;
                  break;
                }
                P = V = 0;
              }
              T.mode = 29;
            case 29:
              G = 1;
              break e;
            case 30:
              G = -3;
              break e;
            case 31:
              return -4;
            case 32:
            default:
              return m;
          }
          return O.next_out = oe, O.avail_out = ee, O.next_in = $, O.avail_in = Z, T.hold = V, T.bits = P, (T.wsize || Y !== O.avail_out && T.mode < 30 && (T.mode < 27 || W !== 4)) && Q(O, O.output, O.next_out, Y - O.avail_out) ? (T.mode = 31, -4) : (X -= O.avail_in, Y -= O.avail_out, O.total_in += X, O.total_out += Y, T.total += Y, T.wrap && Y && (O.adler = T.check = T.flags ? a(T.check, J, Y, O.next_out - Y) : s(T.check, J, Y, O.next_out - Y)), O.data_type = T.bits + (T.last ? 64 : 0) + (T.mode === 12 ? 128 : 0) + (T.mode === 20 || T.mode === 15 ? 256 : 0), (X == 0 && Y === 0 || W === 4) && G === R && (G = -5), G);
        }, l.inflateEnd = function(O) {
          if (!O || !O.state) return m;
          var W = O.state;
          return W.window && (W.window = null), O.state = null, R;
        }, l.inflateGetHeader = function(O, W) {
          var T;
          return O && O.state ? (2 & (T = O.state).wrap) == 0 ? m : ((T.head = W).done = !1, R) : m;
        }, l.inflateSetDictionary = function(O, W) {
          var T, H = W.length;
          return O && O.state ? (T = O.state).wrap !== 0 && T.mode !== 11 ? m : T.mode === 11 && s(1, W, H, 0) !== T.check ? -3 : Q(O, W, H, H) ? (T.mode = 31, -4) : (T.havedict = 1, R) : m;
        }, l.inflateInfo = "pako inflate (from Nodeca project)";
      }, {
        "../utils/common": 41,
        "./adler32": 43,
        "./crc32": 45,
        "./inffast": 48,
        "./inftrees": 50
      }],
      50: [function(t, u, l) {
        var o = t("../utils/common"), s = [
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          11,
          13,
          15,
          17,
          19,
          23,
          27,
          31,
          35,
          43,
          51,
          59,
          67,
          83,
          99,
          115,
          131,
          163,
          195,
          227,
          258,
          0,
          0
        ], a = [
          16,
          16,
          16,
          16,
          16,
          16,
          16,
          16,
          17,
          17,
          17,
          17,
          18,
          18,
          18,
          18,
          19,
          19,
          19,
          19,
          20,
          20,
          20,
          20,
          21,
          21,
          21,
          21,
          16,
          72,
          78
        ], d = [
          1,
          2,
          3,
          4,
          5,
          7,
          9,
          13,
          17,
          25,
          33,
          49,
          65,
          97,
          129,
          193,
          257,
          385,
          513,
          769,
          1025,
          1537,
          2049,
          3073,
          4097,
          6145,
          8193,
          12289,
          16385,
          24577,
          0,
          0
        ], g = [
          16,
          16,
          16,
          16,
          17,
          17,
          18,
          18,
          19,
          19,
          20,
          20,
          21,
          21,
          22,
          22,
          23,
          23,
          24,
          24,
          25,
          25,
          26,
          26,
          27,
          27,
          28,
          28,
          29,
          29,
          64,
          64
        ];
        u.exports = function(v, b, R, m, w, y, k, N) {
          var _, x, A, S, p, F, M, I, q, Q = N.bits, O = 0, W = 0, T = 0, H = 0, J = 0, $ = 0, oe = 0, Z = 0, ee = 0, V = 0, P = null, X = 0, Y = new o.Buf16(16), te = new o.Buf16(16), fe = null, E = 0;
          for (O = 0; O <= 15; O++) Y[O] = 0;
          for (W = 0; W < m; W++) Y[b[R + W]]++;
          for (J = Q, H = 15; 1 <= H && Y[H] === 0; H--) ;
          if (H < J && (J = H), H === 0) return w[y++] = 20971520, w[y++] = 20971520, N.bits = 1, 0;
          for (T = 1; T < H && Y[T] === 0; T++) ;
          for (J < T && (J = T), O = Z = 1; O <= 15; O++) if (Z <<= 1, (Z -= Y[O]) < 0) return -1;
          if (0 < Z && (v === 0 || H !== 1)) return -1;
          for (te[1] = 0, O = 1; O < 15; O++) te[O + 1] = te[O] + Y[O];
          for (W = 0; W < m; W++) b[R + W] !== 0 && (k[te[b[R + W]]++] = W);
          if (F = v === 0 ? (P = fe = k, 19) : v === 1 ? (P = s, X -= 257, fe = a, E -= 257, 256) : (P = d, fe = g, -1), O = T, p = y, oe = W = V = 0, A = -1, S = (ee = 1 << ($ = J)) - 1, v === 1 && 852 < ee || v === 2 && 592 < ee) return 1;
          for (; ; ) {
            for (M = O - oe, q = k[W] < F ? (I = 0, k[W]) : k[W] > F ? (I = fe[E + k[W]], P[X + k[W]]) : (I = 96, 0), _ = 1 << O - oe, T = x = 1 << $; w[p + (V >> oe) + (x -= _)] = M << 24 | I << 16 | q | 0, x !== 0; ) ;
            for (_ = 1 << O - 1; V & _; ) _ >>= 1;
            if (_ !== 0 ? (V &= _ - 1, V += _) : V = 0, W++, --Y[O] == 0) {
              if (O === H) break;
              O = b[R + k[W]];
            }
            if (J < O && (V & S) !== A) {
              for (oe === 0 && (oe = J), p += T, Z = 1 << ($ = O - oe); $ + oe < H && !((Z -= Y[$ + oe]) <= 0); ) $++, Z <<= 1;
              if (ee += 1 << $, v === 1 && 852 < ee || v === 2 && 592 < ee) return 1;
              w[A = V & S] = J << 24 | $ << 16 | p - y | 0;
            }
          }
          return V !== 0 && (w[p + V] = O - oe << 24 | 4194304), N.bits = J, 0;
        };
      }, { "../utils/common": 41 }],
      51: [function(t, u, l) {
        u.exports = {
          2: "need dictionary",
          1: "stream end",
          0: "",
          "-1": "file error",
          "-2": "stream error",
          "-3": "data error",
          "-4": "insufficient memory",
          "-5": "buffer error",
          "-6": "incompatible version"
        };
      }, {}],
      52: [function(t, u, l) {
        var o = t("../utils/common"), s = 0, a = 1;
        function d(i) {
          for (var f = i.length; 0 <= --f; ) i[f] = 0;
        }
        var g = 0, v = 29, b = 256, R = b + 1 + v, m = 30, w = 19, y = 2 * R + 1, k = 15, N = 16, _ = 7, x = 256, A = 16, S = 17, p = 18, F = [
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          1,
          1,
          1,
          1,
          2,
          2,
          2,
          2,
          3,
          3,
          3,
          3,
          4,
          4,
          4,
          4,
          5,
          5,
          5,
          5,
          0
        ], M = [
          0,
          0,
          0,
          0,
          1,
          1,
          2,
          2,
          3,
          3,
          4,
          4,
          5,
          5,
          6,
          6,
          7,
          7,
          8,
          8,
          9,
          9,
          10,
          10,
          11,
          11,
          12,
          12,
          13,
          13
        ], I = [
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          2,
          3,
          7
        ], q = [
          16,
          17,
          18,
          0,
          8,
          7,
          9,
          6,
          10,
          5,
          11,
          4,
          12,
          3,
          13,
          2,
          14,
          1,
          15
        ], Q = new Array(2 * (R + 2));
        d(Q);
        var O = new Array(2 * m);
        d(O);
        var W = new Array(512);
        d(W);
        var T = new Array(256);
        d(T);
        var H = new Array(v);
        d(H);
        var J, $, oe, Z = new Array(m);
        function ee(i, f, L, K, z) {
          this.static_tree = i, this.extra_bits = f, this.extra_base = L, this.elems = K, this.max_length = z, this.has_stree = i && i.length;
        }
        function V(i, f) {
          this.dyn_tree = i, this.max_code = 0, this.stat_desc = f;
        }
        function P(i) {
          return i < 256 ? W[i] : W[256 + (i >>> 7)];
        }
        function X(i, f) {
          i.pending_buf[i.pending++] = 255 & f, i.pending_buf[i.pending++] = f >>> 8 & 255;
        }
        function Y(i, f, L) {
          i.bi_valid > N - L ? (i.bi_buf |= f << i.bi_valid & 65535, X(i, i.bi_buf), i.bi_buf = f >> N - i.bi_valid, i.bi_valid += L - N) : (i.bi_buf |= f << i.bi_valid & 65535, i.bi_valid += L);
        }
        function te(i, f, L) {
          Y(i, L[2 * f], L[2 * f + 1]);
        }
        function fe(i, f) {
          for (var L = 0; L |= 1 & i, i >>>= 1, L <<= 1, 0 < --f; ) ;
          return L >>> 1;
        }
        function E(i, f, L) {
          var K, z, ne = new Array(k + 1), se = 0;
          for (K = 1; K <= k; K++) ne[K] = se = se + L[K - 1] << 1;
          for (z = 0; z <= f; z++) {
            var ae = i[2 * z + 1];
            ae !== 0 && (i[2 * z] = fe(ne[ae]++, ae));
          }
        }
        function h(i) {
          var f;
          for (f = 0; f < R; f++) i.dyn_ltree[2 * f] = 0;
          for (f = 0; f < m; f++) i.dyn_dtree[2 * f] = 0;
          for (f = 0; f < w; f++) i.bl_tree[2 * f] = 0;
          i.dyn_ltree[2 * x] = 1, i.opt_len = i.static_len = 0, i.last_lit = i.matches = 0;
        }
        function j(i) {
          8 < i.bi_valid ? X(i, i.bi_buf) : 0 < i.bi_valid && (i.pending_buf[i.pending++] = i.bi_buf), i.bi_buf = 0, i.bi_valid = 0;
        }
        function U(i, f, L, K) {
          var z = 2 * f, ne = 2 * L;
          return i[z] < i[ne] || i[z] === i[ne] && K[f] <= K[L];
        }
        function re(i, f, L) {
          for (var K = i.heap[L], z = L << 1; z <= i.heap_len && (z < i.heap_len && U(f, i.heap[z + 1], i.heap[z], i.depth) && z++, !U(f, K, i.heap[z], i.depth)); ) i.heap[L] = i.heap[z], L = z, z <<= 1;
          i.heap[L] = K;
        }
        function D(i, f, L) {
          var K, z, ne, se, ae = 0;
          if (i.last_lit !== 0) for (; K = i.pending_buf[i.d_buf + 2 * ae] << 8 | i.pending_buf[i.d_buf + 2 * ae + 1], z = i.pending_buf[i.l_buf + ae], ae++, K === 0 ? te(i, z, f) : (te(i, (ne = T[z]) + b + 1, f), (se = F[ne]) !== 0 && Y(i, z -= H[ne], se), te(i, ne = P(--K), L), (se = M[ne]) !== 0 && Y(i, K -= Z[ne], se)), ae < i.last_lit; ) ;
          te(i, x, f);
        }
        function B(i, f) {
          var L, K, z, ne = f.dyn_tree, se = f.stat_desc.static_tree, ae = f.stat_desc.has_stree, he = f.stat_desc.elems, de = -1;
          for (i.heap_len = 0, i.heap_max = y, L = 0; L < he; L++) ne[2 * L] !== 0 ? (i.heap[++i.heap_len] = de = L, i.depth[L] = 0) : ne[2 * L + 1] = 0;
          for (; i.heap_len < 2; ) ne[2 * (z = i.heap[++i.heap_len] = de < 2 ? ++de : 0)] = 1, i.depth[z] = 0, i.opt_len--, ae && (i.static_len -= se[2 * z + 1]);
          for (f.max_code = de, L = i.heap_len >> 1; 1 <= L; L--) re(i, ne, L);
          for (z = he; L = i.heap[1], i.heap[1] = i.heap[i.heap_len--], re(i, ne, 1), K = i.heap[1], i.heap[--i.heap_max] = L, i.heap[--i.heap_max] = K, ne[2 * z] = ne[2 * L] + ne[2 * K], i.depth[z] = (i.depth[L] >= i.depth[K] ? i.depth[L] : i.depth[K]) + 1, ne[2 * L + 1] = ne[2 * K + 1] = z, i.heap[1] = z++, re(i, ne, 1), 2 <= i.heap_len; ) ;
          i.heap[--i.heap_max] = i.heap[1], (function(me, Ee) {
            var Ve, De, _t, xe, Lt, nr, je = Ee.dyn_tree, Lr = Ee.max_code, li = Ee.stat_desc.static_tree, ci = Ee.stat_desc.has_stree, hi = Ee.stat_desc.extra_bits, Ur = Ee.stat_desc.extra_base, xt = Ee.stat_desc.max_length, Ut = 0;
            for (xe = 0; xe <= k; xe++) me.bl_count[xe] = 0;
            for (je[2 * me.heap[me.heap_max] + 1] = 0, Ve = me.heap_max + 1; Ve < y; Ve++) xt < (xe = je[2 * je[2 * (De = me.heap[Ve]) + 1] + 1] + 1) && (xe = xt, Ut++), je[2 * De + 1] = xe, Lr < De || (me.bl_count[xe]++, Lt = 0, Ur <= De && (Lt = hi[De - Ur]), nr = je[2 * De], me.opt_len += nr * (xe + Lt), ci && (me.static_len += nr * (li[2 * De + 1] + Lt)));
            if (Ut !== 0) {
              do {
                for (xe = xt - 1; me.bl_count[xe] === 0; ) xe--;
                me.bl_count[xe]--, me.bl_count[xe + 1] += 2, me.bl_count[xt]--, Ut -= 2;
              } while (0 < Ut);
              for (xe = xt; xe !== 0; xe--) for (De = me.bl_count[xe]; De !== 0; ) Lr < (_t = me.heap[--Ve]) || (je[2 * _t + 1] !== xe && (me.opt_len += (xe - je[2 * _t + 1]) * je[2 * _t], je[2 * _t + 1] = xe), De--);
            }
          })(i, f), E(ne, de, i.bl_count);
        }
        function c(i, f, L) {
          var K, z, ne = -1, se = f[1], ae = 0, he = 7, de = 4;
          for (se === 0 && (he = 138, de = 3), f[2 * (L + 1) + 1] = 65535, K = 0; K <= L; K++) z = se, se = f[2 * (K + 1) + 1], ++ae < he && z === se || (ae < de ? i.bl_tree[2 * z] += ae : z !== 0 ? (z !== ne && i.bl_tree[2 * z]++, i.bl_tree[2 * A]++) : ae <= 10 ? i.bl_tree[2 * S]++ : i.bl_tree[2 * p]++, ne = z, de = (ae = 0) === se ? (he = 138, 3) : z === se ? (he = 6, 3) : (he = 7, 4));
        }
        function G(i, f, L) {
          var K, z, ne = -1, se = f[1], ae = 0, he = 7, de = 4;
          for (se === 0 && (he = 138, de = 3), K = 0; K <= L; K++) if (z = se, se = f[2 * (K + 1) + 1], !(++ae < he && z === se)) {
            if (ae < de) for (; te(i, z, i.bl_tree), --ae != 0; ) ;
            else z !== 0 ? (z !== ne && (te(i, z, i.bl_tree), ae--), te(i, A, i.bl_tree), Y(i, ae - 3, 2)) : ae <= 10 ? (te(i, S, i.bl_tree), Y(i, ae - 3, 3)) : (te(i, p, i.bl_tree), Y(i, ae - 11, 7));
            ne = z, de = (ae = 0) === se ? (he = 138, 3) : z === se ? (he = 6, 3) : (he = 7, 4);
          }
        }
        d(Z);
        var C = !1;
        function r(i, f, L, K) {
          Y(i, (g << 1) + (K ? 1 : 0), 3), (function(z, ne, se, ae) {
            j(z), X(z, se), X(z, ~se), o.arraySet(z.pending_buf, z.window, ne, se, z.pending), z.pending += se;
          })(i, f, L);
        }
        l._tr_init = function(i) {
          C || ((function() {
            var f, L, K, z, ne, se = new Array(k + 1);
            for (z = K = 0; z < v - 1; z++) for (H[z] = K, f = 0; f < 1 << F[z]; f++) T[K++] = z;
            for (T[K - 1] = z, z = ne = 0; z < 16; z++) for (Z[z] = ne, f = 0; f < 1 << M[z]; f++) W[ne++] = z;
            for (ne >>= 7; z < m; z++) for (Z[z] = ne << 7, f = 0; f < 1 << M[z] - 7; f++) W[256 + ne++] = z;
            for (L = 0; L <= k; L++) se[L] = 0;
            for (f = 0; f <= 143; ) Q[2 * f + 1] = 8, f++, se[8]++;
            for (; f <= 255; ) Q[2 * f + 1] = 9, f++, se[9]++;
            for (; f <= 279; ) Q[2 * f + 1] = 7, f++, se[7]++;
            for (; f <= 287; ) Q[2 * f + 1] = 8, f++, se[8]++;
            for (E(Q, R + 1, se), f = 0; f < m; f++) O[2 * f + 1] = 5, O[2 * f] = fe(f, 5);
            J = new ee(Q, F, b + 1, R, k), $ = new ee(O, M, 0, m, k), oe = new ee(new Array(0), I, 0, w, _);
          })(), C = !0), i.l_desc = new V(i.dyn_ltree, J), i.d_desc = new V(i.dyn_dtree, $), i.bl_desc = new V(i.bl_tree, oe), i.bi_buf = 0, i.bi_valid = 0, h(i);
        }, l._tr_stored_block = r, l._tr_flush_block = function(i, f, L, K) {
          var z, ne, se = 0;
          0 < i.level ? (i.strm.data_type === 2 && (i.strm.data_type = (function(ae) {
            var he, de = 4093624447;
            for (he = 0; he <= 31; he++, de >>>= 1) if (1 & de && ae.dyn_ltree[2 * he] !== 0) return s;
            if (ae.dyn_ltree[18] !== 0 || ae.dyn_ltree[20] !== 0 || ae.dyn_ltree[26] !== 0) return a;
            for (he = 32; he < b; he++) if (ae.dyn_ltree[2 * he] !== 0) return a;
            return s;
          })(i)), B(i, i.l_desc), B(i, i.d_desc), se = (function(ae) {
            var he;
            for (c(ae, ae.dyn_ltree, ae.l_desc.max_code), c(ae, ae.dyn_dtree, ae.d_desc.max_code), B(ae, ae.bl_desc), he = w - 1; 3 <= he && ae.bl_tree[2 * q[he] + 1] === 0; he--) ;
            return ae.opt_len += 3 * (he + 1) + 5 + 5 + 4, he;
          })(i), z = i.opt_len + 3 + 7 >>> 3, (ne = i.static_len + 3 + 7 >>> 3) <= z && (z = ne)) : z = ne = L + 5, L + 4 <= z && f !== -1 ? r(i, f, L, K) : i.strategy === 4 || ne === z ? (Y(i, 2 + (K ? 1 : 0), 3), D(i, Q, O)) : (Y(i, 4 + (K ? 1 : 0), 3), (function(ae, he, de, me) {
            var Ee;
            for (Y(ae, he - 257, 5), Y(ae, de - 1, 5), Y(ae, me - 4, 4), Ee = 0; Ee < me; Ee++) Y(ae, ae.bl_tree[2 * q[Ee] + 1], 3);
            G(ae, ae.dyn_ltree, he - 1), G(ae, ae.dyn_dtree, de - 1);
          })(i, i.l_desc.max_code + 1, i.d_desc.max_code + 1, se + 1), D(i, i.dyn_ltree, i.dyn_dtree)), h(i), K && j(i);
        }, l._tr_tally = function(i, f, L) {
          return i.pending_buf[i.d_buf + 2 * i.last_lit] = f >>> 8 & 255, i.pending_buf[i.d_buf + 2 * i.last_lit + 1] = 255 & f, i.pending_buf[i.l_buf + i.last_lit] = 255 & L, i.last_lit++, f === 0 ? i.dyn_ltree[2 * L]++ : (i.matches++, f--, i.dyn_ltree[2 * (T[L] + b + 1)]++, i.dyn_dtree[2 * P(f)]++), i.last_lit === i.lit_bufsize - 1;
        }, l._tr_align = function(i) {
          Y(i, 2, 3), te(i, x, Q), (function(f) {
            f.bi_valid === 16 ? (X(f, f.bi_buf), f.bi_buf = 0, f.bi_valid = 0) : 8 <= f.bi_valid && (f.pending_buf[f.pending++] = 255 & f.bi_buf, f.bi_buf >>= 8, f.bi_valid -= 8);
          })(i);
        };
      }, { "../utils/common": 41 }],
      53: [function(t, u, l) {
        u.exports = function() {
          this.input = null, this.next_in = 0, this.avail_in = 0, this.total_in = 0, this.output = null, this.next_out = 0, this.avail_out = 0, this.total_out = 0, this.msg = "", this.state = null, this.data_type = 2, this.adler = 0;
        };
      }, {}],
      54: [function(t, u, l) {
        (function(o) {
          (function(s, a) {
            if (!s.setImmediate) {
              var d, g, v, b, R = 1, m = {}, w = !1, y = s.document, k = Object.getPrototypeOf && Object.getPrototypeOf(s);
              k = k && k.setTimeout ? k : s, d = {}.toString.call(s.process) === "[object process]" ? function(A) {
                ge.nextTick(function() {
                  _(A);
                });
              } : (function() {
                if (s.postMessage && !s.importScripts) {
                  var A = !0, S = s.onmessage;
                  return s.onmessage = function() {
                    A = !1;
                  }, s.postMessage("", "*"), s.onmessage = S, A;
                }
              })() ? (b = "setImmediate$" + Math.random() + "$", s.addEventListener ? s.addEventListener("message", x, !1) : s.attachEvent("onmessage", x), function(A) {
                s.postMessage(b + A, "*");
              }) : s.MessageChannel ? ((v = new MessageChannel()).port1.onmessage = function(A) {
                _(A.data);
              }, function(A) {
                v.port2.postMessage(A);
              }) : y && "onreadystatechange" in y.createElement("script") ? (g = y.documentElement, function(A) {
                var S = y.createElement("script");
                S.onreadystatechange = function() {
                  _(A), S.onreadystatechange = null, g.removeChild(S), S = null;
                }, g.appendChild(S);
              }) : function(A) {
                setTimeout(_, 0, A);
              }, k.setImmediate = function(A) {
                typeof A != "function" && (A = new Function("" + A));
                for (var S = new Array(arguments.length - 1), p = 0; p < S.length; p++) S[p] = arguments[p + 1];
                return m[R] = {
                  callback: A,
                  args: S
                }, d(R), R++;
              }, k.clearImmediate = N;
            }
            function N(A) {
              delete m[A];
            }
            function _(A) {
              if (w) setTimeout(_, 0, A);
              else {
                var S = m[A];
                if (S) {
                  w = !0;
                  try {
                    (function(p) {
                      var F = p.callback, M = p.args;
                      switch (M.length) {
                        case 0:
                          F();
                          break;
                        case 1:
                          F(M[0]);
                          break;
                        case 2:
                          F(M[0], M[1]);
                          break;
                        case 3:
                          F(M[0], M[1], M[2]);
                          break;
                        default:
                          F.apply(a, M);
                      }
                    })(S);
                  } finally {
                    N(A), w = !1;
                  }
                }
              }
            }
            function x(A) {
              A.source === s && typeof A.data == "string" && A.data.indexOf(b) === 0 && _(+A.data.slice(b.length));
            }
          })(typeof self > "u" ? o === void 0 ? this : o : self);
        }).call(this, typeof Ce < "u" ? Ce : typeof self < "u" ? self : typeof window < "u" ? window : {});
      }, {}]
    }, {}, [10])(10);
  });
})), Ju = /* @__PURE__ */ le(((e, n) => {
  var t = {
    "&": "&amp;",
    '"': "&quot;",
    "'": "&apos;",
    "<": "&lt;",
    ">": "&gt;"
  };
  function u(l) {
    return l && l.replace ? l.replace(/([&"<>'])/g, function(o, s) {
      return t[s];
    }) : l;
  }
  n.exports = u;
})), Qu = /* @__PURE__ */ le(((e, n) => {
  Ye();
  var t = Ju(), u = kr().Stream, l = "    ";
  function o(b, R) {
    typeof R != "object" && (R = { indent: R });
    var m = R.stream ? new u() : null, w = "", y = !1, k = R.indent ? R.indent === !0 ? l : R.indent : "", N = !0;
    function _(F) {
      N ? ge.nextTick(F) : F();
    }
    function x(F, M) {
      if (M !== void 0 && (w += M), F && !y && (m = m || new u(), y = !0), F && y) {
        var I = w;
        _(function() {
          m.emit("data", I);
        }), w = "";
      }
    }
    function A(F, M) {
      g(x, d(F, k, k ? 1 : 0), M);
    }
    function S() {
      if (m) {
        var F = w;
        _(function() {
          m.emit("data", F), m.emit("end"), m.readable = !1, m.emit("close");
        });
      }
    }
    function p(F) {
      var M = {
        version: "1.0",
        encoding: F.encoding || "UTF-8"
      };
      F.standalone && (M.standalone = F.standalone), A({ "?xml": { _attr: M } }), w = w.replace("/>", "?>");
    }
    return _(function() {
      N = !1;
    }), R.declaration && p(R.declaration), b && b.forEach ? b.forEach(function(F, M) {
      var I;
      M + 1 === b.length && (I = S), A(F, I);
    }) : A(b, S), m ? (m.readable = !0, m) : w;
  }
  function s() {
    var b = { _elem: d(Array.prototype.slice.call(arguments)) };
    return b.push = function(R) {
      if (!this.append) throw new Error("not assigned to a parent!");
      var m = this, w = this._elem.indent;
      g(this.append, d(R, w, this._elem.icount + (w ? 1 : 0)), function() {
        m.append(!0);
      });
    }, b.close = function(R) {
      R !== void 0 && this.push(R), this.end && this.end();
    }, b;
  }
  function a(b, R) {
    return new Array(R || 0).join(b || "");
  }
  function d(b, R, m) {
    m = m || 0;
    var w = a(R, m), y, k = b, N = !1;
    if (typeof b == "object" && (y = Object.keys(b)[0], k = b[y], k && k._elem))
      return k._elem.name = y, k._elem.icount = m, k._elem.indent = R, k._elem.indents = w, k._elem.interrupt = k, k._elem;
    var _ = [], x = [], A;
    function S(p) {
      Object.keys(p).forEach(function(F) {
        _.push(v(F, p[F]));
      });
    }
    switch (typeof k) {
      case "object":
        if (k === null) break;
        k._attr && S(k._attr), k._cdata && x.push(("<![CDATA[" + k._cdata).replace(/\]\]>/g, "]]]]><![CDATA[>") + "]]>"), k.forEach && (A = !1, x.push(""), k.forEach(function(p) {
          typeof p == "object" ? Object.keys(p)[0] == "_attr" ? S(p._attr) : x.push(d(p, R, m + 1)) : (x.pop(), A = !0, x.push(t(p)));
        }), A || x.push(""));
        break;
      default:
        x.push(t(k));
    }
    return {
      name: y,
      interrupt: N,
      attributes: _,
      content: x,
      icount: m,
      indents: w,
      indent: R
    };
  }
  function g(b, R, m) {
    if (typeof R != "object") return b(!1, R);
    var w = R.interrupt ? 1 : R.content.length;
    function y() {
      for (; R.content.length; ) {
        var N = R.content.shift();
        if (N !== void 0) {
          if (k(N)) return;
          g(b, N);
        }
      }
      b(!1, (w > 1 ? R.indents : "") + (R.name ? "</" + R.name + ">" : "") + (R.indent && !m ? `
` : "")), m && m();
    }
    function k(N) {
      return N.interrupt ? (N.interrupt.append = b, N.interrupt.end = y, N.interrupt = !1, b(!0), !0) : !1;
    }
    if (b(!1, R.indents + (R.name ? "<" + R.name : "") + (R.attributes.length ? " " + R.attributes.join(" ") : "") + (w ? R.name ? ">" : "" : R.name ? "/>" : "") + (R.indent && w > 1 ? `
` : "")), !w) return b(!1, R.indent ? `
` : "");
    k(R) || y();
  }
  function v(b, R) {
    return b + '="' + t(R) + '"';
  }
  n.exports = o, n.exports.element = n.exports.Element = s;
})), el = kr(), tl = /* @__PURE__ */ br(Yu()), ye = /* @__PURE__ */ br(Qu()), Tt = 0, mr = 32, rl = 32, nl = (e, n) => {
  const t = n.replace(/-/g, "");
  if (t.length !== rl) throw new Error(`Error: Cannot extract GUID from font filename: ${n}`);
  const u = t.replace(/(..)/g, "$1 ").trim().split(" ").map((s) => parseInt(s, 16));
  u.reverse();
  const l = e.slice(Tt, mr).map((s, a) => s ^ u[a % u.length]), o = new Uint8Array(Tt + l.length + Math.max(0, e.length - mr));
  return o.set(e.slice(0, Tt)), o.set(l, Tt), o.set(e.slice(mr), Tt + l.length), o;
}, il = class {
  /**
  * Formats an XML component into a serializable object.
  *
  * @param input - The XML component to format
  * @param context - The context containing file state and relationships
  * @returns A serializable XML object structure
  * @throws Error if the component cannot be formatted correctly
  */
  format(e, n = { stack: [] }) {
    const t = e.prepForXml(n);
    if (t) return t;
    throw Error("XMLComponent did not format correctly");
  }
}, al = class {
  /**
  * Replaces image placeholder tokens with relationship IDs.
  *
  * @param xmlData - The XML string containing image placeholders
  * @param mediaData - Array of media data to replace
  * @param offset - Starting offset for relationship IDs
  * @returns XML string with placeholders replaced by relationship IDs
  */
  replace(e, n, t) {
    let u = e;
    return n.forEach((l, o) => {
      u = u.replace(new RegExp(`{${l.fileName}}`, "g"), (t + o).toString());
    }), u;
  }
  /**
  * Extracts media data referenced in the XML content.
  *
  * @param xmlData - The XML string to search for media references
  * @param media - The media collection to search within
  * @returns Array of media data found in the XML
  */
  getMediaData(e, n) {
    return n.Array.filter((t) => e.search(`{${t.fileName}}`) > 0);
  }
}, ol = class {
  /**
  * Replaces numbering placeholder tokens with actual numbering IDs.
  *
  * Placeholder format: {reference-instance} where reference identifies the
  * numbering definition and instance is the specific usage.
  *
  * @param xmlData - The XML string containing numbering placeholders
  * @param concreteNumberings - Array of concrete numbering instances to replace
  * @returns XML string with placeholders replaced by numbering IDs
  */
  replace(e, n) {
    let t = e;
    for (const u of n) t = t.replace(new RegExp(`{${u.reference}-${u.instance}}`, "g"), u.numId.toString());
    return t;
  }
}, sl = class {
  /**
  * Creates a new Compiler instance.
  *
  * Initializes the formatter and replacer utilities used during compilation.
  */
  constructor() {
    ie(this, "formatter", void 0), ie(this, "imageReplacer", void 0), ie(this, "numberingReplacer", void 0), this.formatter = new il(), this.imageReplacer = new al(), this.numberingReplacer = new ol();
  }
  /**
  * Compiles a File object into a JSZip archive containing the complete OOXML package.
  *
  * This method orchestrates the entire compilation process:
  * - Converts all document components to XML
  * - Manages image and numbering placeholder replacements
  * - Creates relationship files
  * - Packages fonts and media files
  * - Assembles everything into a ZIP archive
  *
  * @param file - The document to compile
  * @param prettifyXml - Optional XML formatting style
  * @param overrides - Optional custom XML file overrides
  * @returns A JSZip instance containing the complete .docx package
  */
  compile(e, n, t = []) {
    const u = new tl.default(), l = this.xmlifyFile(e, n), o = new Map(Object.entries(l));
    for (const [, s] of o) if (Array.isArray(s)) for (const a of s) u.file(a.path, sr(a.data));
    else u.file(s.path, sr(s.data));
    for (const s of t) u.file(s.path, sr(s.data));
    for (const s of e.Media.Array) s.type !== "svg" ? u.file(`word/media/${s.fileName}`, s.data) : (u.file(`word/media/${s.fileName}`, s.data), u.file(`word/media/${s.fallback.fileName}`, s.fallback.data));
    for (const [s, { data: a, fontKey: d }] of e.FontTable.fontOptionsWithKey.entries()) u.file(`word/fonts/font${s + 1}.odttf`, nl(a, d));
    return u;
  }
  xmlifyFile(e, n) {
    const t = e.Document.Relationships.RelationshipCount + 1, u = (0, ye.default)(this.formatter.format(e.Document.View, {
      viewWrapper: e.Document,
      file: e,
      stack: []
    }), {
      indent: n,
      declaration: {
        standalone: "yes",
        encoding: "UTF-8"
      }
    }), l = e.Comments.Relationships.RelationshipCount + 1, o = (0, ye.default)(this.formatter.format(e.Comments, {
      viewWrapper: {
        View: e.Comments,
        Relationships: e.Comments.Relationships
      },
      file: e,
      stack: []
    }), {
      indent: n,
      declaration: {
        standalone: "yes",
        encoding: "UTF-8"
      }
    }), s = e.FootNotes.Relationships.RelationshipCount + 1, a = (0, ye.default)(this.formatter.format(e.FootNotes.View, {
      viewWrapper: e.FootNotes,
      file: e,
      stack: []
    }), {
      indent: n,
      declaration: {
        standalone: "yes",
        encoding: "UTF-8"
      }
    }), d = this.imageReplacer.getMediaData(u, e.Media), g = this.imageReplacer.getMediaData(o, e.Media), v = this.imageReplacer.getMediaData(a, e.Media);
    return pe(pe({
      Relationships: {
        data: (d.forEach((b, R) => {
          e.Document.Relationships.addRelationship(t + R, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image", `media/${b.fileName}`);
        }), e.Document.Relationships.addRelationship(e.Document.Relationships.RelationshipCount + 1, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable", "fontTable.xml"), (0, ye.default)(this.formatter.format(e.Document.Relationships, {
          viewWrapper: e.Document,
          file: e,
          stack: []
        }), {
          indent: n,
          declaration: { encoding: "UTF-8" }
        })),
        path: "word/_rels/document.xml.rels"
      },
      Document: {
        data: (() => {
          const b = this.imageReplacer.replace(u, d, t);
          return this.numberingReplacer.replace(b, e.Numbering.ConcreteNumbering);
        })(),
        path: "word/document.xml"
      },
      Styles: {
        data: (() => {
          const b = (0, ye.default)(this.formatter.format(e.Styles, {
            viewWrapper: e.Document,
            file: e,
            stack: []
          }), {
            indent: n,
            declaration: {
              standalone: "yes",
              encoding: "UTF-8"
            }
          });
          return this.numberingReplacer.replace(b, e.Numbering.ConcreteNumbering);
        })(),
        path: "word/styles.xml"
      },
      Properties: {
        data: (0, ye.default)(this.formatter.format(e.CoreProperties, {
          viewWrapper: e.Document,
          file: e,
          stack: []
        }), {
          indent: n,
          declaration: {
            standalone: "yes",
            encoding: "UTF-8"
          }
        }),
        path: "docProps/core.xml"
      },
      Numbering: {
        data: (0, ye.default)(this.formatter.format(e.Numbering, {
          viewWrapper: e.Document,
          file: e,
          stack: []
        }), {
          indent: n,
          declaration: {
            standalone: "yes",
            encoding: "UTF-8"
          }
        }),
        path: "word/numbering.xml"
      },
      FileRelationships: {
        data: (0, ye.default)(this.formatter.format(e.FileRelationships, {
          viewWrapper: e.Document,
          file: e,
          stack: []
        }), {
          indent: n,
          declaration: { encoding: "UTF-8" }
        }),
        path: "_rels/.rels"
      },
      HeaderRelationships: e.Headers.map((b, R) => {
        const m = (0, ye.default)(this.formatter.format(b.View, {
          viewWrapper: b,
          file: e,
          stack: []
        }), {
          indent: n,
          declaration: { encoding: "UTF-8" }
        });
        return this.imageReplacer.getMediaData(m, e.Media).forEach((w, y) => {
          b.Relationships.addRelationship(y, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image", `media/${w.fileName}`);
        }), {
          data: (0, ye.default)(this.formatter.format(b.Relationships, {
            viewWrapper: b,
            file: e,
            stack: []
          }), {
            indent: n,
            declaration: { encoding: "UTF-8" }
          }),
          path: `word/_rels/header${R + 1}.xml.rels`
        };
      }),
      FooterRelationships: e.Footers.map((b, R) => {
        const m = (0, ye.default)(this.formatter.format(b.View, {
          viewWrapper: b,
          file: e,
          stack: []
        }), {
          indent: n,
          declaration: { encoding: "UTF-8" }
        });
        return this.imageReplacer.getMediaData(m, e.Media).forEach((w, y) => {
          b.Relationships.addRelationship(y, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image", `media/${w.fileName}`);
        }), {
          data: (0, ye.default)(this.formatter.format(b.Relationships, {
            viewWrapper: b,
            file: e,
            stack: []
          }), {
            indent: n,
            declaration: { encoding: "UTF-8" }
          }),
          path: `word/_rels/footer${R + 1}.xml.rels`
        };
      }),
      Headers: e.Headers.map((b, R) => {
        const m = (0, ye.default)(this.formatter.format(b.View, {
          viewWrapper: b,
          file: e,
          stack: []
        }), {
          indent: n,
          declaration: { encoding: "UTF-8" }
        }), w = this.imageReplacer.getMediaData(m, e.Media), y = this.imageReplacer.replace(m, w, 0);
        return {
          data: this.numberingReplacer.replace(y, e.Numbering.ConcreteNumbering),
          path: `word/header${R + 1}.xml`
        };
      }),
      Footers: e.Footers.map((b, R) => {
        const m = (0, ye.default)(this.formatter.format(b.View, {
          viewWrapper: b,
          file: e,
          stack: []
        }), {
          indent: n,
          declaration: { encoding: "UTF-8" }
        }), w = this.imageReplacer.getMediaData(m, e.Media), y = this.imageReplacer.replace(m, w, 0);
        return {
          data: this.numberingReplacer.replace(y, e.Numbering.ConcreteNumbering),
          path: `word/footer${R + 1}.xml`
        };
      }),
      ContentTypes: {
        data: (0, ye.default)(this.formatter.format(e.ContentTypes, {
          viewWrapper: e.Document,
          file: e,
          stack: []
        }), {
          indent: n,
          declaration: { encoding: "UTF-8" }
        }),
        path: "[Content_Types].xml"
      },
      CustomProperties: {
        data: (0, ye.default)(this.formatter.format(e.CustomProperties, {
          viewWrapper: e.Document,
          file: e,
          stack: []
        }), {
          indent: n,
          declaration: {
            standalone: "yes",
            encoding: "UTF-8"
          }
        }),
        path: "docProps/custom.xml"
      },
      AppProperties: {
        data: (0, ye.default)(this.formatter.format(e.AppProperties, {
          viewWrapper: e.Document,
          file: e,
          stack: []
        }), {
          indent: n,
          declaration: {
            standalone: "yes",
            encoding: "UTF-8"
          }
        }),
        path: "docProps/app.xml"
      },
      FootNotes: {
        data: (() => {
          const b = this.imageReplacer.replace(a, v, s);
          return this.numberingReplacer.replace(b, e.Numbering.ConcreteNumbering);
        })(),
        path: "word/footnotes.xml"
      },
      FootNotesRelationships: {
        data: (v.forEach((b, R) => {
          e.FootNotes.Relationships.addRelationship(s + R, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image", `media/${b.fileName}`);
        }), (0, ye.default)(this.formatter.format(e.FootNotes.Relationships, {
          viewWrapper: e.FootNotes,
          file: e,
          stack: []
        }), {
          indent: n,
          declaration: { encoding: "UTF-8" }
        })),
        path: "word/_rels/footnotes.xml.rels"
      },
      Endnotes: {
        data: (0, ye.default)(this.formatter.format(e.Endnotes.View, {
          viewWrapper: e.Endnotes,
          file: e,
          stack: []
        }), {
          indent: n,
          declaration: { encoding: "UTF-8" }
        }),
        path: "word/endnotes.xml"
      },
      EndnotesRelationships: {
        data: (0, ye.default)(this.formatter.format(e.Endnotes.Relationships, {
          viewWrapper: e.Endnotes,
          file: e,
          stack: []
        }), {
          indent: n,
          declaration: { encoding: "UTF-8" }
        }),
        path: "word/_rels/endnotes.xml.rels"
      },
      Settings: {
        data: (0, ye.default)(this.formatter.format(e.Settings, {
          viewWrapper: e.Document,
          file: e,
          stack: []
        }), {
          indent: n,
          declaration: {
            standalone: "yes",
            encoding: "UTF-8"
          }
        }),
        path: "word/settings.xml"
      },
      Comments: {
        data: (() => {
          const b = this.imageReplacer.replace(o, g, l);
          return this.numberingReplacer.replace(b, e.Numbering.ConcreteNumbering);
        })(),
        path: "word/comments.xml"
      },
      CommentsRelationships: {
        data: (g.forEach((b, R) => {
          e.Comments.Relationships.addRelationship(l + R, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image", `media/${b.fileName}`);
        }), (0, ye.default)(this.formatter.format(e.Comments.Relationships, {
          viewWrapper: {
            View: e.Comments,
            Relationships: e.Comments.Relationships
          },
          file: e,
          stack: []
        }), {
          indent: n,
          declaration: { encoding: "UTF-8" }
        })),
        path: "word/_rels/comments.xml.rels"
      }
    }, e.CommentsExtended ? { CommentsExtended: {
      data: (0, ye.default)(this.formatter.format(e.CommentsExtended, {
        viewWrapper: {
          View: e.CommentsExtended,
          Relationships: e.Comments.Relationships
        },
        file: e,
        stack: []
      }), {
        indent: n,
        declaration: {
          standalone: "yes",
          encoding: "UTF-8"
        }
      }),
      path: "word/commentsExtended.xml"
    } } : {}), {}, {
      FontTable: {
        data: (0, ye.default)(this.formatter.format(e.FontTable.View, {
          viewWrapper: e.Document,
          file: e,
          stack: []
        }), {
          indent: n,
          declaration: {
            standalone: "yes",
            encoding: "UTF-8"
          }
        }),
        path: "word/fontTable.xml"
      },
      FontTableRelationships: {
        data: (0, ye.default)(this.formatter.format(e.FontTable.Relationships, {
          viewWrapper: e.Document,
          file: e,
          stack: []
        }), {
          indent: n,
          declaration: { encoding: "UTF-8" }
        }),
        path: "word/_rels/fontTable.xml.rels"
      }
    });
  }
};
function rn(e, n, t, u, l, o, s) {
  try {
    var a = e[o](s), d = a.value;
  } catch (g) {
    t(g);
    return;
  }
  a.done ? n(d) : Promise.resolve(d).then(u, l);
}
function ul(e) {
  return function() {
    var n = this, t = arguments;
    return new Promise(function(u, l) {
      var o = e.apply(n, t);
      function s(d) {
        rn(o, u, l, s, a, "next", d);
      }
      function a(d) {
        rn(o, u, l, s, a, "throw", d);
      }
      s(void 0);
    });
  };
}
var ll = {
  /** Indent with 2 spaces */
  WITH_2_BLANKS: "  "
}, nn = (e) => e === !0 ? ll.WITH_2_BLANKS : e === !1 ? void 0 : e, Br = class lt {
  /**
  * Exports a document to the specified output format.
  *
  * @param file - The document to export
  * @param type - The output format type (e.g., "nodebuffer", "blob", "string")
  * @param prettify - Whether to prettify the XML output (boolean or PrettifyType)
  * @param overrides - Optional array of file overrides for custom XML content
  * @returns A promise resolving to the exported document in the specified format
  */
  static pack(n, t, u) {
    var l = this;
    return ul(function* (o, s, a, d = []) {
      return l.compiler.compile(o, nn(a), d).generateAsync({
        type: s,
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        compression: "DEFLATE"
      });
    }).apply(this, arguments);
  }
  /**
  * Exports a document to a string representation.
  *
  * @param file - The document to export
  * @param prettify - Whether to prettify the XML output
  * @param overrides - Optional array of file overrides
  * @returns A promise resolving to the document as a string
  */
  static toString(n, t, u = []) {
    return lt.pack(n, "string", t, u);
  }
  /**
  * Exports a document to a Node.js Buffer.
  *
  * @param file - The document to export
  * @param prettify - Whether to prettify the XML output
  * @param overrides - Optional array of file overrides
  * @returns A promise resolving to the document as a Buffer
  */
  static toBuffer(n, t, u = []) {
    return lt.pack(n, "nodebuffer", t, u);
  }
  /**
  * Exports a document to a base64-encoded string.
  *
  * @param file - The document to export
  * @param prettify - Whether to prettify the XML output
  * @param overrides - Optional array of file overrides
  * @returns A promise resolving to the document as a base64 string
  */
  static toBase64String(n, t, u = []) {
    return lt.pack(n, "base64", t, u);
  }
  /**
  * Exports a document to a Blob (for browser environments).
  *
  * @param file - The document to export
  * @param prettify - Whether to prettify the XML output
  * @param overrides - Optional array of file overrides
  * @returns A promise resolving to the document as a Blob
  */
  static toBlob(n, t, u = []) {
    return lt.pack(n, "blob", t, u);
  }
  /**
  * Exports a document to an ArrayBuffer.
  *
  * @param file - The document to export
  * @param prettify - Whether to prettify the XML output
  * @param overrides - Optional array of file overrides
  * @returns A promise resolving to the document as an ArrayBuffer
  */
  static toArrayBuffer(n, t, u = []) {
    return lt.pack(n, "arraybuffer", t, u);
  }
  /**
  * Exports a document to a Node.js Stream.
  *
  * @param file - The document to export
  * @param prettify - Whether to prettify the XML output
  * @param overrides - Optional array of file overrides
  * @returns A readable stream containing the document data
  */
  static toStream(n, t, u = []) {
    const l = new el.Stream();
    return this.compiler.compile(n, nn(t), u).generateAsync({
      type: "nodebuffer",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      compression: "DEFLATE"
    }).then((o) => {
      l.emit("data", o), l.emit("end");
    }), l;
  }
};
ie(Br, "compiler", new sl());
var qt = { exports: {} }, cl = qt.exports, an;
function hl() {
  return an || (an = 1, (function(e, n) {
    (function(t, u) {
      u();
    })(cl, function() {
      function t(g, v) {
        return typeof v > "u" ? v = { autoBom: !1 } : typeof v != "object" && (console.warn("Deprecated: Expected third argument to be a object"), v = { autoBom: !v }), v.autoBom && /^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(g.type) ? new Blob(["\uFEFF", g], { type: g.type }) : g;
      }
      function u(g, v, b) {
        var R = new XMLHttpRequest();
        R.open("GET", g), R.responseType = "blob", R.onload = function() {
          d(R.response, v, b);
        }, R.onerror = function() {
          console.error("could not download file");
        }, R.send();
      }
      function l(g) {
        var v = new XMLHttpRequest();
        v.open("HEAD", g, !1);
        try {
          v.send();
        } catch {
        }
        return 200 <= v.status && 299 >= v.status;
      }
      function o(g) {
        try {
          g.dispatchEvent(new MouseEvent("click"));
        } catch {
          var v = document.createEvent("MouseEvents");
          v.initMouseEvent("click", !0, !0, window, 0, 0, 0, 80, 20, !1, !1, !1, !1, 0, null), g.dispatchEvent(v);
        }
      }
      var s = typeof window == "object" && window.window === window ? window : typeof self == "object" && self.self === self ? self : typeof Mt == "object" && Mt.global === Mt ? Mt : void 0, a = s.navigator && /Macintosh/.test(navigator.userAgent) && /AppleWebKit/.test(navigator.userAgent) && !/Safari/.test(navigator.userAgent), d = s.saveAs || (typeof window != "object" || window !== s ? function() {
      } : "download" in HTMLAnchorElement.prototype && !a ? function(g, v, b) {
        var R = s.URL || s.webkitURL, m = document.createElement("a");
        v = v || g.name || "download", m.download = v, m.rel = "noopener", typeof g == "string" ? (m.href = g, m.origin === location.origin ? o(m) : l(m.href) ? u(g, v, b) : o(m, m.target = "_blank")) : (m.href = R.createObjectURL(g), setTimeout(function() {
          R.revokeObjectURL(m.href);
        }, 4e4), setTimeout(function() {
          o(m);
        }, 0));
      } : "msSaveOrOpenBlob" in navigator ? function(g, v, b) {
        if (v = v || g.name || "download", typeof g != "string") navigator.msSaveOrOpenBlob(t(g, b), v);
        else if (l(g)) u(g, v, b);
        else {
          var R = document.createElement("a");
          R.href = g, R.target = "_blank", setTimeout(function() {
            o(R);
          });
        }
      } : function(g, v, b, R) {
        if (R = R || open("", "_blank"), R && (R.document.title = R.document.body.innerText = "downloading..."), typeof g == "string") return u(g, v, b);
        var m = g.type === "application/octet-stream", w = /constructor/i.test(s.HTMLElement) || s.safari, y = /CriOS\/[\d]+/.test(navigator.userAgent);
        if ((y || m && w || a) && typeof FileReader < "u") {
          var k = new FileReader();
          k.onloadend = function() {
            var x = k.result;
            x = y ? x : x.replace(/^data:[^;]*;/, "data:attachment/file;"), R ? R.location.href = x : location = x, R = null;
          }, k.readAsDataURL(g);
        } else {
          var N = s.URL || s.webkitURL, _ = N.createObjectURL(g);
          R ? R.location = _ : location.href = _, R = null, setTimeout(function() {
            N.revokeObjectURL(_);
          }, 4e4);
        }
      });
      s.saveAs = d.saveAs = d, e.exports = d;
    });
  })(qt)), qt.exports;
}
var ii = hl();
const $e = "Arial", Vt = (e, n = !1, t = 23) => new Ae({
  children: [new qe({ text: e, bold: n, size: t, font: $e })],
  spacing: { after: 100, line: 300 }
}), Se = (e, n = !1, t = 50) => new Dr({
  width: { size: t, type: wt.PERCENTAGE },
  margins: { top: 90, bottom: 90, left: 110, right: 110 },
  children: [Vt(e, n, 21)]
}), ai = {
  top: { style: Ke.SINGLE, size: 4, color: "D7DCE5" },
  bottom: { style: Ke.SINGLE, size: 4, color: "D7DCE5" },
  left: { style: Ke.SINGLE, size: 4, color: "D7DCE5" },
  right: { style: Ke.SINGLE, size: 4, color: "D7DCE5" },
  insideHorizontal: { style: Ke.SINGLE, size: 3, color: "E7EAF0" },
  insideVertical: { style: Ke.SINGLE, size: 3, color: "E7EAF0" }
}, fl = (e) => new Zn({
  width: { size: 100, type: wt.PERCENTAGE },
  borders: ai,
  rows: [
    new kt({ children: [Se("Grade", !0), Se(e.grade), Se("Textbook", !0), Se(e.book)] }),
    new kt({ children: [Se("Unit", !0), Se(e.unit), Se("Lesson", !0), Se(e.lesson)] }),
    new kt({ children: [Se("Lesson type", !0), Se(e.lessonType), Se("CEFR", !0), Se(e.cefr)] }),
    new kt({ children: [Se("Duration", !0), Se(`${e.periods} period(s) × ${e.minutes} minutes`), Se("Class size", !0), Se(String(e.classSize))] })
  ]
}), rr = (e) => e.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((n) => n.trim()), gt = (e) => /^\|.*\|$/.test(e.trim()) && rr(e).length > 1, oi = (e) => e.every((n) => /^:?-{2,}:?$/.test(n)), si = (e) => {
  const n = e.filter((u) => !oi(u)), t = Math.max(1, ...n.map((u) => u.length));
  return new Zn({
    width: { size: 100, type: wt.PERCENTAGE },
    borders: ai,
    rows: n.map((u, l) => new kt({
      children: Array.from({ length: t }, (o, s) => Se(u[s] || "", l === 0, Math.floor(100 / t)))
    }))
  });
}, dl = (e) => {
  const n = e.split(`
`).map((u) => u.trim()).filter(Boolean), t = [];
  for (let u = 0; u < n.length; ) {
    if (gt(n[u])) {
      const a = [];
      for (; u < n.length && gt(n[u]); ) a.push(rr(n[u++]));
      t.push(si(a)), t.push(new Ae({ text: "", spacing: { after: 70 } }));
      continue;
    }
    const l = n[u++], o = /^(Digital integration|Digital competence objective|Digital resources|AI literacy|AI integration|Inclusive support)/i.test(l), s = /^[-•]\s/.test(l);
    t.push(new Ae({
      children: [new qe({ text: s ? l.replace(/^[-•]\s*/, "") : l, bold: o, size: 23, font: $e })],
      spacing: { after: 100, line: 300 },
      bullet: s ? { level: 0 } : void 0
    }));
  }
  return t;
};
async function gl(e, n, t = "english-lesson-integrated.docx", u) {
  const l = [
    new Ae({ children: [new qe({ text: "ENGLISH LESSON PLAN", bold: !0, size: 34, font: $e })], alignment: Ne.CENTER, spacing: { after: 160 } }),
    new Ae({ children: [new qe({ text: e.title || `${e.unit} – ${e.lesson}`, bold: !0, size: 27, font: $e })], alignment: Ne.CENTER, spacing: { after: 240 } }),
    fl(e),
    new Ae({ text: "", spacing: { after: 80 } })
  ];
  n.forEach((s) => {
    l.push(new Ae({
      children: [new qe({ text: s.title, bold: !0, size: 26, font: $e })],
      heading: Gr.HEADING_1,
      spacing: { before: 260, after: 120 },
      keepNext: !0
    })), l.push(...dl(s.content));
  }), u && (l.push(new Ae({ text: "QUALITY AUDIT SUMMARY", heading: Gr.HEADING_1, spacing: { before: 300, after: 120 } })), l.push(Vt(`Score: ${u.score}/100 · Rating: ${u.rating}`, !0)), l.push(Vt(u.summary)), u.issues.filter((s) => s.severity !== "passed").slice(0, 8).forEach((s) => l.push(Vt(`• ${s.title}: ${s.recommendation}`))));
  const o = new ni({
    styles: { default: { document: { run: { font: $e, size: 23 }, paragraph: { spacing: { line: 300 } } } } },
    sections: [{ properties: { page: { margin: { top: 900, right: 900, bottom: 900, left: 900 } } }, children: l }]
  });
  ii.saveAs(await Br.toBlob(o), t);
}
const pl = (e) => e.split(`
`).filter(gt).map(rr);
async function vl(e, n) {
  const t = pl(e.content), u = [
    new Ae({ children: [new qe({ text: e.title, bold: !0, size: 34, font: $e })], alignment: Ne.CENTER, spacing: { after: 220 } })
  ];
  e.content.split(`
`).filter((o) => !gt(o)).forEach((o) => {
    const s = /^[A-Z][A-Z &/–-]{3,}$/.test(o.trim()) || /^\d+\.\s/.test(o);
    u.push(new Ae({
      children: [new qe({ text: o, bold: s, size: s ? 25 : 23, font: $e })],
      spacing: { before: s ? 150 : 0, after: 100, line: 300 }
    }));
  }), t.length && u.push(si(t));
  const l = new ni({ sections: [{ properties: { page: { margin: { top: 900, right: 900, bottom: 900, left: 900 } } }, children: u }] });
  ii.saveAs(await Br.toBlob(l), n || `${ml(e.title)}.docx`);
}
const Oe = (e) => e.replace(/[&<>"']/g, (n) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[n] || n), ui = (e) => {
  const n = e.split(`
`).map((u) => u.trim()).filter(Boolean);
  let t = "";
  for (let u = 0; u < n.length; ) {
    if (gt(n[u])) {
      const o = [];
      for (; u < n.length && gt(n[u]); ) o.push(rr(n[u++]));
      const s = o.filter((a) => !oi(a));
      t += `<table>${s.map((a, d) => `<tr>${a.map((g) => `<${d === 0 ? "th" : "td"}>${Oe(g)}</${d === 0 ? "th" : "td"}>`).join("")}</tr>`).join("")}</table>`;
      continue;
    }
    const l = n[u++];
    t += `<p class="${/^(Digital|AI|Inclusive)/i.test(l) ? "integration" : ""}">${Oe(l)}</p>`;
  }
  return t;
};
function yl(e, n, t = "english-lesson-integrated.html", u) {
  const l = n.map((v) => `<section><h2>${Oe(v.title)}</h2>${ui(v.content)}</section>`).join(""), o = u ? `<aside><strong>Quality score: ${u.score}/100</strong><p>${Oe(u.summary)}</p></aside>` : "", s = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${Oe(e.title || e.lesson)}</title><style>body{font-family:Arial,sans-serif;max-width:900px;margin:40px auto;padding:0 24px;color:#172033;line-height:1.6}header{text-align:center;border-bottom:1px solid #d9deea;padding-bottom:20px}dl{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}dt{font-weight:700}dd{margin:0}section{margin-top:28px}h2{font-size:18px}.integration{background:#eef6ff;border-left:4px solid #3b82f6;padding:10px 12px}table{width:100%;border-collapse:collapse;margin:12px 0}th,td{border:1px solid #ccd3df;padding:8px;text-align:left;vertical-align:top}th{background:#f2f5f9}aside{margin-top:30px;padding:16px;background:#f7f8fb}@media print{body{margin:0}.integration,table{break-inside:avoid}}</style></head><body><header><h1>ENGLISH LESSON PLAN</h1><h2>${Oe(e.title || `${e.unit} – ${e.lesson}`)}</h2><dl><dt>Grade</dt><dd>${e.grade}</dd><dt>CEFR</dt><dd>${e.cefr}</dd><dt>Unit</dt><dd>${Oe(e.unit)}</dd><dt>Lesson</dt><dd>${Oe(e.lesson)}</dd></dl></header>${l}${o}</body></html>`, a = new Blob([s], { type: "text/html;charset=utf-8" }), d = URL.createObjectURL(a), g = document.createElement("a");
  g.href = d, g.download = t, g.click(), setTimeout(() => URL.revokeObjectURL(d), 1e3);
}
function bl(e, n) {
  const t = window.open("", "_blank", "width=1000,height=800");
  if (!t) throw new Error("Trình duyệt đã chặn cửa sổ in.");
  try {
    t.opener = null;
  } catch {
  }
  t.document.write(`<html><head><title>${Oe(e.title || e.lesson)}</title><style>body{font-family:Arial,sans-serif;margin:18mm;line-height:1.5;color:#111}h1{text-align:center}h2{font-size:16px;margin-top:22px}p{margin:6px 0}.integration{font-weight:700;border-left:3px solid #555;padding-left:10px}table{width:100%;border-collapse:collapse;margin:10px 0}th,td{border:1px solid #aaa;padding:7px;text-align:left;vertical-align:top}</style></head><body><h1>ENGLISH LESSON PLAN</h1><p style="text-align:center">${Oe(e.unit)} · ${Oe(e.lesson)} · Grade ${e.grade}</p>${n.map((u) => `<h2>${Oe(u.title)}</h2>${ui(u.content)}`).join("")}</body></html>`), t.document.close(), t.focus(), t.print();
}
const ml = (e) => e.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "resource";
export {
  gl as exportLessonDocx,
  yl as exportLessonHtml,
  vl as exportResourceDocx,
  bl as printLesson
};
