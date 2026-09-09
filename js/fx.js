/* ============================================================
   FX — shared rendering helpers used by every canvas game.
   HiDPI, particles, screen shake, glow, parallax, easing.
   ============================================================ */
(function () {
  'use strict';

  var FX = {};

  /* ---------- crisp canvas on high-density / scaled displays ----------
     Keeps the logical coordinate system identical, so game code that
     draws in "css pixels" needs no changes. */
  FX.dpr = function (cv) {
    var d = Math.min(window.devicePixelRatio || 1, 2.5);
    var w = cv.width, h = cv.height;
    cv.style.width = w + 'px';
    cv.style.height = h + 'px';
    cv.width = Math.round(w * d);
    cv.height = Math.round(h * d);
    var ctx = cv.getContext('2d');
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.__base = [d, 0, 0, d, 0, 0];
    ctx.__w = w; ctx.__h = h;
    return ctx;
  };
  FX.reset = function (ctx) { ctx.setTransform.apply(ctx, ctx.__base || [1, 0, 0, 1, 0, 0]); };

  /* ---------- math ---------- */
  FX.lerp = function (a, b, t) { return a + (b - a) * t; };
  FX.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  FX.easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };
  FX.easeIn = function (t) { return t * t * t; };
  FX.easeInOut = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  FX.bounce = function (t) {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) { t -= 1.5 / 2.75; return 7.5625 * t * t + .75; }
    if (t < 2.5 / 2.75) { t -= 2.25 / 2.75; return 7.5625 * t * t + .9375; }
    t -= 2.625 / 2.75; return 7.5625 * t * t + .984375;
  };
  /* frame-rate independent smoothing */
  FX.approach = function (cur, target, rate, dt) {
    return target + (cur - target) * Math.exp(-rate * dt);
  };

  /* ---------- shapes ---------- */
  FX.rr = function (ctx, x, y, w, h, r) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };
  FX.glow = function (ctx, color, blur, fn) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    fn();
    ctx.restore();
  };
  FX.text = function (ctx, txt, x, y, o) {
    o = o || {};
    ctx.save();
    ctx.font = (o.weight || 700) + ' ' + (o.size || 18) + 'px ' + (o.font || '"Segoe UI",system-ui,sans-serif');
    ctx.textAlign = o.align || 'center';
    ctx.textBaseline = o.baseline || 'alphabetic';
    if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.blur || 16; }
    ctx.globalAlpha = o.alpha === undefined ? 1 : o.alpha;
    ctx.fillStyle = o.color || '#e8e8ff';
    ctx.fillText(txt, x, y);
    ctx.restore();
  };

  /* ---------- screen shake ---------- */
  FX.shake = function () {
    return {
      t: 0,
      add: function (a) { this.t = Math.min(1, this.t + a); },
      update: function (dt) { this.t = Math.max(0, this.t - dt * 1.8); },
      apply: function (ctx) {
        if (this.t <= 0) return;
        var m = this.t * this.t * 16;
        ctx.translate((Math.random() * 2 - 1) * m, (Math.random() * 2 - 1) * m);
      }
    };
  };

  /* ---------- particles ---------- */
  FX.particles = function (max) {
    var ps = [];
    max = max || 700;
    return {
      list: ps,
      burst: function (x, y, n, o) {
        o = o || {};
        for (var i = 0; i < n && ps.length < max; i++) {
          var a = o.angle !== undefined
            ? o.angle + (Math.random() - .5) * (o.spread === undefined ? 6.283 : o.spread)
            : Math.random() * 6.283;
          var sp = (o.speed || 130) * (.35 + Math.random() * .9);
          ps.push({
            x: x + (o.jitter ? (Math.random() - .5) * o.jitter : 0),
            y: y + (o.jitter ? (Math.random() - .5) * o.jitter : 0),
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
            life: (o.life || .6) * (.7 + Math.random() * .6), t: 0,
            size: (o.size || 3) * (.6 + Math.random() * .8),
            color: (o.colors ? o.colors[(Math.random() * o.colors.length) | 0] : o.color) || '#ffffff',
            g: o.gravity || 0,
            drag: o.drag === undefined ? 1.4 : o.drag,
            square: !!o.square,
            spin: (Math.random() - .5) * 12, rot: Math.random() * 6.283
          });
        }
      },
      update: function (dt) {
        for (var i = ps.length - 1; i >= 0; i--) {
          var p = ps[i];
          p.t += dt;
          if (p.t >= p.life) { ps.splice(i, 1); continue; }
          p.vy += p.g * dt;
          var f = Math.exp(-p.drag * dt);
          p.vx *= f; p.vy *= f;
          p.x += p.vx * dt; p.y += p.vy * dt;
          p.rot += p.spin * dt;
        }
      },
      draw: function (ctx) {
        if (!ps.length) return;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (var i = 0; i < ps.length; i++) {
          var p = ps[i], k = 1 - p.t / p.life;
          ctx.globalAlpha = k * k;
          ctx.fillStyle = p.color;
          var s = Math.max(.5, p.size * k);
          if (p.square) {
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
            ctx.fillRect(-s / 2, -s / 2, s, s); ctx.restore();
          } else {
            ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, 6.283); ctx.fill();
          }
        }
        ctx.restore();
      },
      clear: function () { ps.length = 0; }
    };
  };

  /* ---------- floating score numbers ---------- */
  FX.floaters = function () {
    var f = [];
    return {
      add: function (x, y, txt, color, size) { f.push({ x: x, y: y, txt: txt, c: color || '#ffd93d', s: size || 22, t: 0 }); },
      update: function (dt) { for (var i = f.length - 1; i >= 0; i--) { f[i].t += dt; if (f[i].t > .9) f.splice(i, 1); } },
      draw: function (ctx) {
        f.forEach(function (p) {
          var k = p.t / .9;
          FX.text(ctx, p.txt, p.x, p.y - FX.easeOut(k) * 46, {
            size: p.s * (1 + (1 - k) * .18), color: p.c, alpha: 1 - k * k, glow: p.c, blur: 14
          });
        });
      },
      clear: function () { f.length = 0; }
    };
  };

  /* ---------- parallax starfield ---------- */
  FX.stars = function (w, h, n) {
    var s = [];
    for (var i = 0; i < (n || 90); i++) {
      s.push({ x: Math.random() * w, y: Math.random() * h, z: .25 + Math.random(), tw: Math.random() * 6.283 });
    }
    return {
      update: function (dt, speed) {
        for (var i = 0; i < s.length; i++) {
          s[i].y += (speed || 30) * s[i].z * dt;
          s[i].tw += dt * 3;
          if (s[i].y > h) { s[i].y = -2; s[i].x = Math.random() * w; }
        }
      },
      draw: function (ctx) {
        for (var i = 0; i < s.length; i++) {
          var p = s[i], a = .18 + p.z * .4 + Math.sin(p.tw) * .12;
          ctx.fillStyle = 'rgba(210,225,255,' + a.toFixed(3) + ')';
          var sz = p.z * 1.9;
          ctx.fillRect(p.x, p.y, sz, sz);
        }
      }
    };
  };

  /* ---------- backgrounds ---------- */
  FX.bg = function (ctx, w, h, top, bottom) {
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, top); g.addColorStop(1, bottom);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  };
  FX.grid = function (ctx, w, h, cell, alpha, offX, offY) {
    ctx.save();
    ctx.strokeStyle = 'rgba(150,180,255,' + (alpha || .05) + ')';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var x = (offX || 0) % cell; x <= w; x += cell) { ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, h); }
    for (var y = (offY || 0) % cell; y <= h; y += cell) { ctx.moveTo(0, y + .5); ctx.lineTo(w, y + .5); }
    ctx.stroke();
    ctx.restore();
  };
  /* horizon grid that scrolls toward the viewer */
  FX.retroFloor = function (ctx, w, h, t, horizon, color) {
    ctx.save();
    ctx.strokeStyle = color || 'rgba(139,92,255,.35)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (var i = -14; i <= 14; i++) {
      ctx.moveTo(w / 2 + i * 26, horizon);
      ctx.lineTo(w / 2 + i * 260, h);
    }
    for (var j = 0; j < 16; j++) {
      var p = ((j + (t * .35) % 1) / 16);
      var y = horizon + Math.pow(p, 2.6) * (h - horizon);
      ctx.moveTo(0, y); ctx.lineTo(w, y);
    }
    ctx.stroke();
    ctx.restore();
  };
  FX.vignette = function (ctx, w, h, strength) {
    var g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .32, w / 2, h / 2, Math.max(w, h) * .78);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,' + (strength || .5) + ')');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  };
  FX.scanlines = function (ctx, w, h, alpha) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,' + (alpha || .16) + ')';
    for (var y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
    ctx.restore();
  };

  /* ---------- neon block / bar used by several games ---------- */
  FX.block = function (ctx, x, y, w, h, color, r) {
    var g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, FX.tint(color, .35));
    g.addColorStop(.55, color);
    g.addColorStop(1, FX.tint(color, -.28));
    ctx.fillStyle = g;
    FX.rr(ctx, x, y, w, h, r === undefined ? 4 : r);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.28)';
    FX.rr(ctx, x + 1.5, y + 1.5, w - 3, Math.max(2, h * .22), 2);
    ctx.fill();
  };

  /* lighten (+) or darken (-) a hex colour */
  FX.tint = function (hex, amt) {
    var c = hex.replace('#', '');
    if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    var n = parseInt(c, 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (amt >= 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
    else { r *= (1 + amt); g *= (1 + amt); b *= (1 + amt); }
    return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
  };
  FX.rgba = function (hex, a) {
    var c = hex.replace('#', '');
    if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    var n = parseInt(c, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  };

  /* ---------- trail buffer ---------- */
  FX.trail = function (len) {
    var pts = [];
    return {
      pts: pts,
      push: function (x, y) { pts.push({ x: x, y: y }); if (pts.length > len) pts.shift(); },
      clear: function () { pts.length = 0; },
      draw: function (ctx, color, width) {
        if (pts.length < 2) return;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (var i = 1; i < pts.length; i++) {
          var k = i / pts.length;
          ctx.strokeStyle = FX.rgba(color, k * .5);
          ctx.lineWidth = (width || 6) * k;
          ctx.beginPath();
          ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
          ctx.lineTo(pts[i].x, pts[i].y);
          ctx.stroke();
        }
        ctx.restore();
      }
    };
  };

  window.FX = FX;
})();
