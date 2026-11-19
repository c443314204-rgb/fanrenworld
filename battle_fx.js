/* =============================================================
   斗法演出 · 特效引擎（canvas 2D）
   -------------------------------------------------------------
   - 只吃坐标，不碰 DOM：界面层负责量锚点，这里负责画
   - 每个法术有自己的配方（SPEC 表），共 17 种招式形态 + 18 种意象
   - 未收录的招式按「元素 + 效果」兜底推演，NPC 随手一招也有样子
   ============================================================= */
(function (g) {
  'use strict';

  /* =============================================================
     一、色板
     ============================================================= */
  var COLORS = {
    phys:    ['#ded8c8', '#fff9e8', '#8d8778'],
    fire:    ['#e8743a', '#ffc06a', '#7d1d0c'],
    water:   ['#4f93c8', '#a8dcf6', '#1b4463'],
    wood:    ['#5fbb8b', '#c2f0c8', '#1d5439'],
    earth:   ['#b5894f', '#ead196', '#543615'],
    metal:   ['#e8d998', '#fff8d2', '#7d6321'],
    ice:     ['#8fd4ea', '#e0f8ff', '#2a6382'],
    thunder: ['#b5a2f0', '#f2ecff', '#3f2670'],
    wind:    ['#a9d6bb', '#eafbef', '#356048'],
    ghost:   ['#8f7fb8', '#cfc0ec', '#241a36'],
    soul:    ['#c9a4dd', '#f4e6ff', '#33204a'],
    blood:   ['#c0392b', '#ff8574', '#400a06'],
    true:    ['#ffffff', '#ffe6e6', '#7a7a7a']
  };

  function pal(el) { return COLORS[el] || COLORS.phys; }

  /* =============================================================
     二、随机数：招式 id 决定它的「手感」，同一招每次都一样
     ============================================================= */
  function hash(s) {
    var h = 2166136261;
    s = String(s || 'x');
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* =============================================================
     三、粒子池
     ============================================================= */
  var P = [];
  var MAX = 780;
  var shakeAmp = 0, shakeT = 0;

  /* 生成好的术法贴图（黑底发光，叠加混合） */
  var TEX = {};
  function loadTextures(map) {
    if (!map) return;
    for (var k in map) {
      if (!map[k] || !map[k].src) continue;
      var im = new Image();
      im.decoding = 'async';
      im.src = map[k].src;
      TEX[k] = im;
    }
  }
  function texKeyFor(el) {
    if (el === 'fire' || el === 'blood') return 'fire';
    if (el === 'ice' || el === 'water') return 'ice';
    if (el === 'thunder') return 'thunder';
    if (el === 'ghost' || el === 'soul') return 'ghost';
    if (el === 'wood') return 'wood';
    return 'metal';
  }
  function texBurst(key, x, y, o) {
    o = o || {};
    var img = TEX[key];
    if (!img) return;
    add({
      k: 'tex', img: img, x: x, y: y, size: o.size || 300,
      rot: o.rot || 0, spin: o.spin || 0, ttl: o.ttl || 0.62, delay: o.delay || 0,
      alpha: o.alpha == null ? 0.92 : o.alpha, grow: o.grow == null ? 0.34 : o.grow
    });
  }
  /* 全局时间拉伸：招式要读得出来，不能一闪就没 */
  var TIME_SCALE = 1.45;

  function add(o) {
    if (P.length >= MAX) P.shift();
    o.t = 0;
    o.ttl = (o.ttl == null ? 0.6 : o.ttl) * TIME_SCALE;
    P.push(o);
    return o;
  }
  function clear() { P.length = 0; shakeAmp = 0; shakeT = 0; }
  function count() { return P.length; }

  function step(dt) {
    for (var i = P.length - 1; i >= 0; i--) {
      var p = P[i];
      p.t += dt;
      if (p.t >= p.ttl) { P.splice(i, 1); continue; }
      if (p.delay && p.t < p.delay) continue;
      if (p.x2 != null && p.x2v != null) p.x2 += p.x2v * dt;
      if (p.vx || p.vy) {
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.ax || p.ay) { p.vx += (p.ax || 0) * dt; p.vy += (p.ay || 0) * dt; }
        if (p.drag) { p.vx *= Math.max(0, 1 - p.drag * dt); p.vy *= Math.max(0, 1 - p.drag * dt); }
      }
      if (p.rot != null && p.vr) p.rot += p.vr * dt;
      if (p.life != null) p.life += dt;
    }
    if (shakeT > 0) shakeT -= dt;
  }

  function ease(t) { return 1 - Math.pow(1 - t, 3); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rgba(hex, a) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  /* =============================================================
     四、笔触原语
     ============================================================= */

  function spark(x, y, o) {
    o = o || {};
    return add({
      k: 'spark', x: x, y: y, vx: o.vx || 0, vy: o.vy || 0,
      ax: o.ax || 0, ay: o.ay || 0, drag: o.drag == null ? 2.4 : o.drag,
      r: o.r || 2.2, col: o.col || '#fff', ttl: o.ttl || 0.5, add: true,
      delay: o.delay || 0
    });
  }
  function streak(x, y, o) {
    o = o || {};
    return add({
      k: 'streak', x: x, y: y, vx: o.vx || 0, vy: o.vy || 0, drag: o.drag == null ? 1.6 : o.drag,
      r: o.r || 1.8, len: o.len || 0.035, col: o.col || '#fff', ttl: o.ttl || 0.4, add: true,
      delay: o.delay || 0
    });
  }
  function shard(x, y, o) {
    o = o || {};
    return add({
      k: 'shard', x: x, y: y, vx: o.vx || 0, vy: o.vy || 0, ax: o.ax, ay: o.ay || 0,
      drag: o.drag == null ? 1.2 : o.drag, r: o.r || 7, rot: o.rot || 0, vr: o.vr || 0,
      col: o.col || '#fff', col2: o.col2 || null, ttl: o.ttl || 0.6, add: !!o.add,
      delay: o.delay || 0
    });
  }
  function petal(x, y, o) {
    o = o || {};
    return add({
      k: 'petal', x: x, y: y, vx: o.vx || 0, vy: o.vy || 0, ax: o.ax || 0, ay: o.ay || 0,
      drag: o.drag == null ? 0.8 : o.drag, r: o.r || 5, rot: o.rot || 0, vr: o.vr || 0,
      col: o.col || '#fff', ttl: o.ttl || 1.1, add: !!o.add, delay: o.delay || 0
    });
  }
  function smoke(x, y, o) {
    o = o || {};
    return add({
      k: 'smoke', x: x, y: y, vx: o.vx || 0, vy: o.vy || 0, ax: o.ax || 0, ay: o.ay || 0,
      drag: o.drag == null ? 0.9 : o.drag, r: o.r || 20, r2: o.r2 || (o.r || 20) * 2.1,
      col: o.col || '#888', ttl: o.ttl || 1.0, alpha: o.alpha == null ? 0.5 : o.alpha,
      rot: o.rot || 0, vr: o.vr || 0, add: false, delay: o.delay || 0
    });
  }
  function ring(x, y, o) {
    o = o || {};
    return add({
      k: 'ring', x: x, y: y, r: o.r || 8, r2: o.r2 || 90, w: o.w || 2.4,
      col: o.col || '#fff', ttl: o.ttl || 0.55, add: true, delay: o.delay || 0,
      squeeze: o.squeeze == null ? 1 : o.squeeze, rot: o.rot || 0
    });
  }
  function band(x1, y1, x2, y2, o) {
    o = o || {};
    return add({
      k: 'band', x: x1, y: y1, x2: x2, y2: y2,
      cx: o.cx == null ? (x1 + x2) / 2 : o.cx, cy: o.cy == null ? (y1 + y2) / 2 : o.cy,
      w: o.w || 12, col: o.col || '#fff', col2: o.col2 || o.col || '#fff',
      ttl: o.ttl || 0.42, delay: o.delay || 0, grow: o.grow == null ? 1 : o.grow
    });
  }

  /* 剑弧：两端收锋，中间最厚——这样才能读成「剑气」而不是一根管子 */
  /* 弧形剑气：绕目标一圈的月牙，两端收锋 */
  function crescent(cx, cy, o) {
    o = o || {};
    return add({
      k: 'crescent', cx: cx, cy: cy, R: o.R || 140,
      a0: o.a0 == null ? -2.3 : o.a0, a1: o.a1 == null ? 0.7 : o.a1,
      w: o.w || 26, col: o.col || '#fff', col2: o.col2 || '#fff',
      ttl: o.ttl || 0.5, delay: o.delay || 0, core: o.core !== false
    });
  }

  function bladeArc(x1, y1, x2, y2, o) {
    o = o || {};
    return add({
      k: 'arc', x1: x1, y1: y1, x2: x2, y2: y2,
      cx: o.cx == null ? (x1 + x2) / 2 : o.cx, cy: o.cy == null ? (y1 + y2) / 2 : o.cy,
      w: o.w || 14, col: o.col || '#fff', col2: o.col2 || '#fff',
      ttl: o.ttl || 0.42, delay: o.delay || 0, core: o.core !== false
    });
  }
  function bolt(x1, y1, x2, y2, o) {
    o = o || {};
    var pts = [];
    var segs = o.segs || 9;
    var amp = o.amp || 26;
    var rng = o.rng || Math.random;
    for (var i = 0; i <= segs; i++) {
      var t = i / segs;
      var nx = lerp(x1, x2, t) + (i && i < segs ? (rng() - 0.5) * amp * 2 : 0);
      var ny = lerp(y1, y2, t) + (i && i < segs ? (rng() - 0.5) * amp : 0);
      pts.push([nx, ny]);
    }
    return add({
      k: 'bolt', pts: pts, w: o.w || 3, col: o.col || '#fff', col2: o.col2 || '#fff',
      ttl: o.ttl || 0.32, delay: o.delay || 0, flick: 1
    });
  }
  function pillar(x, y, o) {
    o = o || {};
    return add({
      k: 'pillar', x: x, y: y, w: o.w || 60, h: o.h || 300,
      col: o.col || '#fff', col2: o.col2 || '#fff', ttl: o.ttl || 0.5, delay: o.delay || 0
    });
  }
  function rune(x, y, o) {
    o = o || {};
    return add({
      k: 'rune', x: x, y: y, text: o.text || '道', size: o.size || 26,
      col: o.col || '#fff', ttl: o.ttl || 0.8, rot: o.rot || 0, vr: o.vr || 0,
      vy: o.vy || 0, delay: o.delay || 0, add: true
    });
  }
  function flash(x, y, o) {
    o = o || {};
    return add({
      k: 'flash', x: x, y: y, r: o.r || 140, col: o.col || '#fff',
      ttl: o.ttl || 0.28, delay: o.delay || 0
    });
  }
  function dust(x, y, o) {
    o = o || {};
    return add({
      k: 'ring', x: x, y: y, r: o.r || 6, r2: o.r2 || 120, w: o.w || 3,
      col: o.col || '#8b8371', ttl: o.ttl || 0.7, add: false, squeeze: 0.26,
      delay: o.delay || 0, rot: 0
    });
  }
  function sword(x, y, o) {
    o = o || {};
    return add({
      k: 'sword', x: x, y: y, len: o.len || 90, rot: o.rot || -0.7, w: o.w || 3,
      col: o.col || '#fff', col2: o.col2 || '#fff', ttl: o.ttl || 0.5,
      delay: o.delay || 0, vx: o.vx || 0, vy: o.vy || 0, vr: o.vr || 0
    });
  }
  function glyphRing(x, y, o) {
    o = o || {};
    var n = o.n || 6;
    var txt = o.text || '道';
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2 + (o.phase || 0);
      var rr = o.r || 60;
      rune(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.55, {
        text: txt, size: o.size || 18, col: o.col, ttl: o.ttl || 0.9,
        delay: (o.delay || 0) + i * 0.035, vy: -14
      });
    }
  }

  /* =============================================================
     五、绘制
     ============================================================= */
  function draw(ctx) {
    for (var i = 0; i < P.length; i++) {
      var p = P[i];
      if (p.delay && p.t < p.delay) continue;
      var vt = p.t - (p.delay || 0);
      var k = Math.max(0, Math.min(1, vt / p.ttl));
      var fade = 1 - k;
      ctx.globalCompositeOperation = p.add ? 'lighter' : 'source-over';

      switch (p.k) {
        case 'tex': {
          var img = p.img;
          if (!img || !img.complete || !img.naturalWidth) { break; }
          var sz = p.size * (1 + (p.grow || 0) * ease(k));
          var al = (p.alpha == null ? 1 : p.alpha) * Math.pow(1 - k, 1.5);
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = al;
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rot || 0) + (p.spin || 0) * k);
          ctx.drawImage(img, -sz / 2, -sz / 2, sz, sz);
          ctx.restore();
          break;
        }
        case 'spark': {
          var r = p.r * (0.4 + fade * 0.9);
          var gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 4.2);
          gr.addColorStop(0, rgba(p.col, 0.95 * fade));
          gr.addColorStop(0.35, rgba(p.col, 0.45 * fade));
          gr.addColorStop(1, rgba(p.col, 0));
          ctx.fillStyle = gr;
          ctx.beginPath(); ctx.arc(p.x, p.y, r * 4.2, 0, 6.2832); ctx.fill();
          break;
        }
        case 'streak': {
          var len = Math.min(90, Math.hypot(p.vx, p.vy) * p.len);
          ctx.strokeStyle = rgba(p.col, 0.85 * fade);
          ctx.lineWidth = p.r * (0.5 + fade);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * p.len * 1.6, p.y - p.vy * p.len * 1.6);
          ctx.stroke();
          break;
        }
        case 'shard': {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = rgba(p.col, 0.85 * fade);
          if (p.col2) {
            var g2 = ctx.createLinearGradient(0, -p.r, 0, p.r);
            g2.addColorStop(0, rgba(p.col2, 0.95 * fade));
            g2.addColorStop(1, rgba(p.col, 0.7 * fade));
            ctx.fillStyle = g2;
          }
          ctx.beginPath();
          ctx.moveTo(0, -p.r);
          ctx.lineTo(p.r * 0.55, p.r * 0.75);
          ctx.lineTo(-p.r * 0.5, p.r * 0.5);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
          break;
        }
        case 'petal': {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = rgba(p.col, 0.75 * fade);
          ctx.beginPath();
          ctx.ellipse(0, 0, p.r, p.r * 0.45, 0, 0, 6.2832);
          ctx.fill();
          ctx.restore();
          break;
        }
        case 'smoke': {
          var rr = lerp(p.r, p.r2, ease(k));
          var sg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr);
          sg.addColorStop(0, rgba(p.col, p.alpha * (1 - k) * 0.9));
          sg.addColorStop(0.55, rgba(p.col, p.alpha * (1 - k) * 0.4));
          sg.addColorStop(1, rgba(p.col, 0));
          ctx.fillStyle = sg;
          ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, 6.2832); ctx.fill();
          break;
        }
        case 'ring': {
          var cr = lerp(p.r, p.r2, ease(k));
          ctx.strokeStyle = rgba(p.col, 0.9 * fade);
          ctx.lineWidth = p.w * (0.3 + fade);
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, cr, cr * p.squeeze, p.rot, 0, 6.2832);
          ctx.stroke();
          if (p.w > 2.2) {
            ctx.strokeStyle = rgba(p.col, 0.28 * fade);
            ctx.lineWidth = p.w * 3.2 * fade;
            ctx.stroke();
          }
          break;
        }
        case 'band': {
          var g = ease(k);
          var ex = lerp(p.x, p.x2, p.grow ? Math.min(1, g * 1.6) : 1);
          var ey = lerp(p.y, p.y2, p.grow ? Math.min(1, g * 1.6) : 1);
          var a = 0.95 * Math.pow(fade, 0.7);
          ctx.strokeStyle = rgba(p.col2, a * 0.55);
          ctx.lineWidth = p.w * (1.2 - k * 0.7);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.quadraticCurveTo(p.cx, p.cy, ex, ey);
          ctx.stroke();
          ctx.strokeStyle = rgba(p.col, a);
          ctx.lineWidth = Math.max(1, p.w * 0.34 * (1.2 - k * 0.7));
          ctx.stroke();
          break;
        }
        case 'crescent': {
          var a = p.a0 + (p.a1 - p.a0) * Math.min(1, k * 2.8);
          var cw = p.w * (0.45 + 0.55 * fade);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(p.cx, p.cy, p.R, p.a0, a);
          ctx.strokeStyle = rgba(p.col, 0.55 * fade);
          ctx.lineWidth = cw * 1.9;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(p.cx, p.cy, p.R, p.a0, a);
          ctx.strokeStyle = rgba(p.col2, 0.95 * fade);
          ctx.lineWidth = cw;
          ctx.stroke();
          if (p.core) {
            ctx.beginPath();
            ctx.arc(p.cx, p.cy, p.R, p.a0, a);
            ctx.strokeStyle = rgba('#ffffff', 0.75 * fade);
            ctx.lineWidth = Math.max(1.4, cw * 0.22);
            ctx.stroke();
          }
          break;
        }
        case 'arc': {
          var steps = 22;
          var top = [], bot = [], mid = [];
          var growT = Math.min(1, k * 2.6);
          for (var s2 = 0; s2 <= steps; s2++) {
            var t2 = s2 / steps;
            var px = (1 - t2) * (1 - t2) * p.x1 + 2 * (1 - t2) * t2 * p.cx + t2 * t2 * p.x2;
            var py = (1 - t2) * (1 - t2) * p.y1 + 2 * (1 - t2) * t2 * p.cy + t2 * t2 * p.y2;
            var tx = 2 * (1 - t2) * (p.cx - p.x1) + 2 * t2 * (p.x2 - p.cx);
            var ty = 2 * (1 - t2) * (p.cy - p.y1) + 2 * t2 * (p.y2 - p.cy);
            var tl = Math.hypot(tx, ty) || 1;
            var nx = -ty / tl, ny = tx / tl;
            var taper = Math.pow(Math.sin(Math.PI * Math.min(1, t2 / growT)), 0.75);
            var wd = p.w * taper * (0.55 + 0.45 * fade);
            mid.push([px, py]);
            top.push([px + nx * wd, py + ny * wd]);
            bot.push([px - nx * wd, py - ny * wd]);
          }
          ctx.beginPath();
          ctx.moveTo(top[0][0], top[0][1]);
          for (var i3 = 1; i3 < top.length; i3++) ctx.lineTo(top[i3][0], top[i3][1]);
          for (var i4 = bot.length - 1; i4 >= 0; i4--) ctx.lineTo(bot[i4][0], bot[i4][1]);
          ctx.closePath();
          var ag = ctx.createLinearGradient(p.x1, p.y1, p.x2, p.y2);
          ag.addColorStop(0, rgba(p.col, 0.2 * fade));
          ag.addColorStop(0.35, rgba(p.col, 0.85 * fade));
          ag.addColorStop(0.72, rgba(p.col2, 0.95 * fade));
          ag.addColorStop(1, rgba(p.col2, 0.3 * fade));
          ctx.fillStyle = ag;
          ctx.fill();
          if (p.core) {
            ctx.strokeStyle = rgba('#ffffff', 0.55 * fade);
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(mid[0][0], mid[0][1]);
            for (var i5 = 1; i5 < mid.length; i5++) ctx.lineTo(mid[i5][0], mid[i5][1]);
            ctx.stroke();
          }
          break;
        }
        case 'bolt': {
          var fl = 0.55 + 0.45 * Math.sin(p.t * 60);
          ctx.lineCap = 'round';
          ctx.strokeStyle = rgba(p.col, 0.9 * fade * fl);
          ctx.lineWidth = p.w * (0.5 + fade * 1.4);
          ctx.beginPath();
          ctx.moveTo(p.pts[0][0], p.pts[0][1]);
          for (var b = 1; b < p.pts.length; b++) ctx.lineTo(p.pts[b][0], p.pts[b][1]);
          ctx.stroke();
          ctx.strokeStyle = rgba(p.col2, 0.55 * fade);
          ctx.lineWidth = p.w * 0.45;
          ctx.stroke();
          break;
        }
        case 'pillar': {
          var pg = ctx.createLinearGradient(0, p.y - p.h, 0, p.y);
          pg.addColorStop(0, rgba(p.col2, 0));
          pg.addColorStop(0.35, rgba(p.col, 0.55 * fade));
          pg.addColorStop(0.85, rgba(p.col2, 0.85 * fade));
          pg.addColorStop(1, rgba(p.col2, 0));
          ctx.fillStyle = pg;
          var pw = p.w * (0.6 + 0.4 * (1 - k)) * (1 + k * 0.35);
          ctx.beginPath();
          ctx.moveTo(p.x - pw * 0.2, p.y - p.h);
          ctx.lineTo(p.x + pw * 0.2, p.y - p.h);
          ctx.lineTo(p.x + pw * 0.5, p.y);
          ctx.lineTo(p.x - pw * 0.5, p.y);
          ctx.closePath();
          ctx.fill();
          break;
        }
        case 'rune': {
          ctx.save();
          ctx.translate(p.x, p.y + p.vy * vt);
          ctx.rotate(p.rot + p.vr * vt);
          ctx.globalAlpha = 0.9 * fade;
          ctx.font = p.size + 'px "KaiTi","STKaiti",serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = rgba(p.col, 0.9);
          ctx.shadowBlur = 14;
          ctx.fillStyle = rgba(p.col, 0.95);
          ctx.fillText(p.text, 0, 0);
          ctx.restore();
          break;
        }
        case 'flash': {
          var fr = p.r * (0.4 + ease(k) * 1.6);
          var fg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, fr);
          fg.addColorStop(0, rgba(p.col, 0.85 * fade * fade));
          fg.addColorStop(0.4, rgba(p.col, 0.35 * fade * fade));
          fg.addColorStop(1, rgba(p.col, 0));
          ctx.fillStyle = fg;
          ctx.beginPath(); ctx.arc(p.x, p.y, fr, 0, 6.2832); ctx.fill();
          break;
        }
        case 'sword': {
          ctx.save();
          ctx.translate(p.x + (p.vx || 0) * vt, p.y + (p.vy || 0) * vt);
          ctx.rotate(p.rot + (p.vr || 0) * vt);
          ctx.globalAlpha = 0.95 * fade;
          var wg = ctx.createLinearGradient(0, 0, p.len, 0);
          wg.addColorStop(0, rgba(p.col2, 0.15));
          wg.addColorStop(0.55, rgba(p.col2, 0.95));
          wg.addColorStop(1, rgba(p.col, 1));
          ctx.strokeStyle = wg;
          ctx.lineWidth = p.w;
          ctx.lineCap = 'round';
          ctx.shadowColor = rgba(p.col, 0.9);
          ctx.shadowBlur = 16;
          ctx.beginPath();
          ctx.moveTo(-p.len * 0.22, 0);
          ctx.lineTo(p.len, 0);
          ctx.stroke();
          break;
        }
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  /* =============================================================
     六、招式配方表
     -------------------------------------------------------------
     sh = 形态，m = 意象，[可选] 第三个是颜色键
     形态：melee 近身 / slash 剑气 / proj 投射 / beam 光束
           rain 天降 / ground 地涌 / sky 天罚 / aoe 扩散
           aura 环身 / heal 回复 / shield 护罩 / seal 禁锢
           drain 抽元 / rift 虚空 / summon 召鬼 / palm 掌印 / burst 爆
     ============================================================= */
  var SPEC = {
    /* —— 世俗武学 —— */
    zhengyang_quan:  { sh: 'melee', m: 'fist' },
    xiangjia_hu:     { sh: 'aura', m: 'armor' },
    bawang_ying:     { sh: 'aura', m: 'armor', c: 'blood' },
    zhayan_ci:       { sh: 'melee', m: 'sword' },
    luoyan_bu:       { sh: 'aura', m: 'smoke' },
    guixi_jiasi:     { sh: 'aura', m: 'shell' },

    /* —— 五行基础术法 —— */
    huodan:          { sh: 'proj', m: 'flame' },
    dici:            { sh: 'ground', m: 'spike' },
    bingdong:        { sh: 'proj', m: 'snow' },
    chanrao:         { sh: 'seal', m: 'vine' },
    liusha:          { sh: 'ground', m: 'sand' },
    yufeng:          { sh: 'proj', m: 'wind' },
    tianyan:         { sh: 'beam', m: 'eye' },
    nishen:          { sh: 'aura', m: 'smoke' },
    chuanyin:        { sh: 'aura', m: 'rune', ch: '传' },
    kongwu:          { sh: 'proj', m: 'blade', c: 'metal' },

    /* —— 炼气人阶 —— */
    yinqi_ru:        { sh: 'aura', m: 'spiral' },
    lianxi_cang:     { sh: 'aura', m: 'veil' },
    ningyuan_ju:     { sh: 'aura', m: 'spiral' },
    guiyuan_jia:     { sh: 'shield', m: 'armor', c: 'earth' },
    huanling_fen:    { sh: 'aura', m: 'clone' },
    qigui_shi:       { sh: 'summon', m: 'ghost' },
    konshen_she:     { sh: 'beam', m: 'eye', c: 'soul' },
    xuejian_zhou:    { sh: 'proj', m: 'needle', c: 'blood' },

    /* —— 青元剑诀 —— */
    qingyuan_mang:   { sh: 'slash', m: 'sword' },
    huti_jian:       { sh: 'shield', m: 'swords' },
    jujian:          { sh: 'sky', m: 'bigsword' },
    shennian_ci:     { sh: 'beam', m: 'needle' },
    shennian_fu:     { sh: 'aura', m: 'orb' },
    taiyang_lie:     { sh: 'proj', m: 'flame', c: 'fire' },
    zhengqi_hu:      { sh: 'aura', m: 'radiance' },
    haoran_chi:      { sh: 'beam', m: 'radiance', c: 'soul' },
    taibai_guang:    { sh: 'beam', m: 'sword', c: 'metal' },
    qianhuan_ti:     { sh: 'aura', m: 'mirror' },
    dielang:         { sh: 'proj', m: 'wave', c: 'water' },
    langdun:         { sh: 'aura', m: 'wave', c: 'water' },
    yunxue_feng:     { sh: 'rain', m: 'snow', c: 'ice' },
    hanshuang_jia:   { sh: 'shield', m: 'ice', c: 'ice' },
    qingling_huichun: { sh: 'heal', m: 'lotus', c: 'wood' },
    yudan_hu:        { sh: 'shield', m: 'jade', c: 'earth' },
    tianluo_lei:     { sh: 'sky', m: 'thunder', c: 'thunder' },
    jinfeng:         { sh: 'slash', m: 'sword', c: 'metal' },
    shuangying:      { sh: 'aura', m: 'mirror', c: 'soul' },
    zhoutian:        { sh: 'aura', m: 'spiral', c: 'wood' },
    xueying_xi:      { sh: 'melee', m: 'blood', c: 'blood' },
    jifeng_bian:     { sh: 'aura', m: 'wind' },
    nifeng:          { sh: 'aura', m: 'veil', c: 'wind' },
    yirong:          { sh: 'aura', m: 'mask', c: 'soul' },
    yanxing:         { sh: 'aura', m: 'flame', c: 'fire' },
    xueguang:        { sh: 'shield', m: 'blood', c: 'blood' },
    xuening:         { sh: 'aura', m: 'orb', c: 'blood' },
    shagan:          { sh: 'seal', m: 'mark', c: 'ghost' },
    youying:         { sh: 'melee', m: 'shadow', c: 'ghost' },
    lunhui:          { sh: 'drain', m: 'vortex', c: 'wood' },
    chanyu_si:       { sh: 'seal', m: 'silk', c: 'wood' },
    chunyan:         { sh: 'heal', m: 'petal', c: 'wood' },
    duwen:           { sh: 'seal', m: 'mark', c: 'wood' },
    jianying:        { sh: 'slash', m: 'sword', c: 'metal' },
    chunli:          { sh: 'slash', m: 'sword', c: 'metal' },
    shishen_ci:      { sh: 'beam', m: 'needle', c: 'soul' },
    shenshi_qian:    { sh: 'aura', m: 'orb', c: 'soul' },
    wugui:           { sh: 'seal', m: 'chain', c: 'soul' },
    jinzhen_hu:      { sh: 'aura', m: 'armor', c: 'metal' },
    yangchun:        { sh: 'heal', m: 'petal', c: 'wood' },

    /* —— 魔道 —— */
    yinmo_zhan:      { sh: 'slash', m: 'shadow', c: 'ghost' },
    xuanyin_qi:      { sh: 'aoe', m: 'mist', c: 'ghost' },
    xueling_zuan:    { sh: 'beam', m: 'drill', c: 'blood' },
    lihun:           { sh: 'drain', m: 'soul', c: 'soul' },
    xuanyin_wu:      { sh: 'aoe', m: 'mist', c: 'ghost' },
    tianmo_bian:     { sh: 'aura', m: 'demon' },
    tuotian_quan:    { sh: 'melee', m: 'fist' },
    liumo:           { sh: 'summon', m: 'sixghost', c: 'ghost' },
    tiansha_fu:      { sh: 'aura', m: 'demon', c: 'ghost' },
    kuishui_liu:     { sh: 'beam', m: 'wave', c: 'water' },
    shaqi_jia:       { sh: 'shield', m: 'armor', c: 'ghost' },
    tianshi:         { sh: 'aura', m: 'corpse', c: 'ghost' },
    fenghun_yin:     { sh: 'seal', m: 'rune', ch: '封魂', c: 'soul' },
    xueshi_bao:      { sh: 'burst', m: 'blood', c: 'blood' },
    erying:          { sh: 'aura', m: 'infant', c: 'soul' },
    huashen_chu:     { sh: 'aura', m: 'spirit', c: 'soul' },
    caibu:           { sh: 'drain', m: 'silk', c: 'wood' },
    duoyuan:         { sh: 'aura', m: 'flame', c: 'fire' },
    xueling_shi:     { sh: 'burst', m: 'blood', c: 'blood' },
    dageng:          { sh: 'aoe', m: 'swordform', c: 'metal' },
    zhumo:           { sh: 'sky', m: 'bigsword', c: 'metal' },
    jianxin:         { sh: 'aura', m: 'sword', c: 'metal' },
    jingshen:        { sh: 'beam', m: 'needle', c: 'soul' },
    mingwang_ti:     { sh: 'aura', m: 'buddha', c: 'metal' },
    jingang:         { sh: 'palm', m: 'palm', c: 'metal' },
    fansheng:        { sh: 'proj', m: 'flame', c: 'fire' },
    faxiang:         { sh: 'aura', m: 'giant', c: 'fire' },
    yuanci_xi:       { sh: 'drain', m: 'magnet', c: 'metal' },
    yuanci_dun:      { sh: 'shield', m: 'magnet', c: 'metal' },
    ciguang:         { sh: 'beam', m: 'drill', c: 'metal' },
    cuigu_jin:       { sh: 'aura', m: 'bone' },
    duantian:        { sh: 'aura', m: 'demon', c: 'ghost' },
    xuanhun_ti:      { sh: 'aura', m: 'soul', c: 'soul' },
    huaying_wu:      { sh: 'aura', m: 'shadow', c: 'ghost' },
    suodi_cun:       { sh: 'aura', m: 'earth', c: 'earth' },
    kunxian_meng:    { sh: 'rift', m: 'cage', c: 'soul' },
    qinxian:         { sh: 'sky', m: 'hand', c: 'earth' },
    lingbao:         { sh: 'aura', m: 'treasure', c: 'metal' },

    /* —— 法宝主动技 —— */
    ts_xuantie:      { sh: 'shield', m: 'iron', c: 'metal' },
    ts_zhujian:      { sh: 'rain', m: 'swords', c: 'metal' },
    ts_hulu:         { sh: 'heal', m: 'dew', c: 'wood' },
    ts_xutian:       { sh: 'sky', m: 'tripod', c: 'earth' },

    /* —— 兜底 —— */
    __basic:         { sh: 'melee', m: 'fist' }
  };

  /* =============================================================
     七、形态配方
     ============================================================= */
  var R = {};
  var seq = 0;

  function spread(n, fn) { for (var i = 0; i < n; i++) fn(i, n); }

  /* 根据意象补一点签名细节 */
  function motifExtra(m, x, y, c, o) {
    var rng = o.rng, pal3 = o.pal, s = o.scale;
    switch (m) {
      case 'sword':
        for (var i = 0; i < 3; i++) {
          var a = -0.9 + i * 0.42;
          sword(x - 40 * s, y + (i - 1) * 22 * s, { rot: a, len: (120 + i * 26) * s, w: 2.6 * s, col: pal3[0], col2: pal3[1], ttl: 0.45, delay: i * 0.06, vr: 0.4 });
        }
        break;
      case 'bigsword':
        sword(x, y - 190 * s, { rot: Math.PI / 2, len: 300 * s, w: 7 * s, col: pal3[0], col2: pal3[1], ttl: 0.6, vy: 620 * s });
        break;
      case 'swords':
        spread(9, function (i) {
          sword(x + (rng() - 0.5) * 200 * s, y - (rng() * 120 + 40) * s, {
            rot: Math.PI / 2 + (rng() - 0.5) * 0.5, len: (80 + rng() * 70) * s, w: 2 * s,
            col: pal3[1], col2: pal3[0], ttl: 0.7, delay: i * 0.045, vy: 520 * s
          });
        });
        break;
      case 'swordform':
        spread(10, function (i) {
          var ang = (i / 10) * Math.PI * 2 - Math.PI / 2;
          sword(x + Math.cos(ang) * 130 * s, y + Math.sin(ang) * 62 * s, {
            rot: ang + Math.PI, len: 120 * s, w: 4 * s, col: pal3[1], col2: pal3[0],
            ttl: 1.0, delay: 0.12 + i * 0.035
          });
          ring(x + Math.cos(ang) * 130 * s, y + Math.sin(ang) * 62 * s, {
            r: 2, r2: 26 * s, w: 1.6, col: pal3[1], ttl: 0.6, delay: 0.2 + i * 0.035
          });
        });
        break;
      case 'chain':
        for (var c2 = 0; c2 < 7; c2++) {
          ring(x, y, { r: 20 + c2 * 9 * s, r2: 26 + c2 * 9 * s, w: 3 * s, col: pal3[2], ttl: 0.5, delay: 0.05 * c2, rot: c2 * 0.4 });
        }
        break;
      case 'eye':
        ring(x, y, { r: 6, r2: 60 * s, w: 2, col: pal3[1], ttl: 0.5 });
        ring(x, y, { r: 4, r2: 34 * s, w: 3, col: pal3[0], ttl: 0.42, delay: 0.08 });
        rune(x, y, { text: '眼', size: 30 * s, col: pal3[1], ttl: 0.7 });
        break;
      case 'lotus':
        spread(10, function (i) {
          var a = (i / 10) * Math.PI * 2;
          petal(x + Math.cos(a) * 34 * s, y + Math.sin(a) * 20 * s, {
            vx: Math.cos(a) * 12, vy: -22 - rng() * 14, r: 7 * s, rot: a, col: pal3[1], ttl: 1.2, delay: i * 0.04
          });
        });
        break;
      case 'tripod':
        rune(x, y - 150 * s, { text: '鼎', size: 64 * s, col: pal3[1], ttl: 0.85, vy: 260 });
        break;
      case 'hand':
        /* 一只大手从天上按下来 */
        for (var h = 0; h < 5; h++) {
          var hx = x + (h - 2) * 30 * s;
          band(hx * 0.15 + x * 0.85, y - 210 * s, hx, (o.gy || y + 50 * s), {
            w: 9 * s, col: pal3[1], col2: pal3[0], ttl: 0.6, delay: h * 0.04,
            cx: hx + (h - 2) * 6 * s, cy: y - 90 * s
          });
        }
        ring(x, y - 120 * s, { r: 10, r2: 80 * s, w: 3 * s, col: pal3[1], ttl: 0.6, delay: 0.12, squeeze: 0.62 });
        rune(x, y - 150 * s, { text: '掌', size: 54 * s, col: pal3[1], ttl: 0.8, vy: 260 });
        break;
      case 'rune':
        glyphRing(x, y - 20 * s, { n: 6, text: o.ch || '镇', r: 58 * s, col: pal3[1], size: 20 * s, ttl: 1.0 });
        break;
      case 'mark':
        rune(x, y - 30 * s, { text: o.ch || '印', size: 42 * s, col: pal3[1], ttl: 1.0 });
        ring(x, y, { r: 8, r2: 70 * s, w: 2, col: pal3[0], ttl: 0.6, delay: 0.05 });
        break;
      case 'mist':
        spread(9, function (i) {
          smoke(x + (rng() - 0.5) * 220 * s, y + (rng() - 0.5) * 70 * s, {
            r: (28 + rng() * 26) * s, r2: (90 + rng() * 70) * s, col: pal3[0],
            alpha: 0.34, ttl: 1.4, delay: i * 0.05, vx: (rng() - 0.5) * 30
          });
        });
        break;
      case 'demon':
        rune(x, y - 60 * s, { text: '魔', size: 54 * s, col: pal3[1], ttl: 0.9, vy: -20 });
        spread(8, function (i) {
          var a = rng() * 6.28;
          smoke(x + Math.cos(a) * 50 * s, y + Math.sin(a) * 30 * s, { r: 18 * s, r2: 62 * s, col: pal3[2], alpha: 0.5, ttl: 0.9, delay: i * 0.03 });
        });
        break;
      case 'buddha':
        glyphRing(x, y - 40 * s, { n: 8, text: '佛', r: 80 * s, col: pal3[1], size: 18 * s, ttl: 1.1 });
        break;
      case 'treasure':
        rune(x, y - 40 * s, { text: '宝', size: 46 * s, col: pal3[1], ttl: 0.9 });
        break;
      case 'cage':
        spread(6, function (i) {
          var a = (i / 6) * Math.PI * 2;
          band(x + Math.cos(a) * 20 * s, y + Math.sin(a) * 12 * s, x + Math.cos(a) * 92 * s, y + Math.sin(a) * 46 * s, {
            w: 4 * s, col: pal3[2], col2: pal3[1], ttl: 0.7, delay: i * 0.04
          });
        });
        break;

      /* —— 环身类的细分意象 —— */
      case 'armor':
        spread(8, function (i) {
          var a = (i / 8) * Math.PI * 2;
          shard(x + Math.cos(a) * 62 * s, y + Math.sin(a) * 40 * s, {
            vx: Math.cos(a) * 40, vy: Math.sin(a) * 26 - 8, r: (7 + rng() * 5) * s,
            rot: a, vr: 1.6, col: pal3[0], col2: pal3[1], ttl: 0.8, delay: i * 0.03, drag: 1.8
          });
        });
        break;
      case 'spiral':
        for (var sp1 = 0; sp1 < 34; sp1++) {
          var t1 = sp1 / 34;
          var a1 = t1 * Math.PI * 5;
          var r1 = (18 + t1 * 62) * s;
          spark(x + Math.cos(a1) * r1, y + 40 * s - t1 * 120 * s, {
            vx: -Math.sin(a1) * 26, vy: -34, r: 1.5 + rng() * 1.6,
            col: sp1 % 2 ? pal3[1] : pal3[0], ttl: 0.9, delay: t1 * 0.34, drag: 1.1
          });
        }
        break;
      case 'veil':
        spread(10, function (i) {
          var ox = (rng() - 0.5) * 90 * s;
          smoke(x + ox, y + 20 * s - rng() * 80 * s, {
            r: 14 * s, r2: 46 * s, col: pal3[0], alpha: 0.3, ttl: 0.9, delay: i * 0.035, vy: -18
          });
        });
        break;
      case 'clone':
        spread(2, function (i) {
          var side = i ? 1 : -1;
          ring(x + side * 62 * s, y + 10 * s, { r: 10, r2: 90 * s, w: 1.6, col: pal3[1], ttl: 0.8, squeeze: 0.32, delay: 0.12 + i * 0.08 });
          pillar(x + side * 62 * s, o.gy || (y + 40 * s), { w: 20 * s, h: 150 * s, col: pal3[0], col2: pal3[1], ttl: 0.7, delay: 0.1 + i * 0.08 });
        });
        break;
      case 'mirror':
        spread(2, function (i) {
          var side = i ? 1 : -1;
          for (var m2 = 0; m2 < 3; m2++) {
            band(x + side * 20 * s, y - 40 * s + m2 * 30 * s, x + side * 96 * s, y - 20 * s + m2 * 26 * s, {
              w: 9 * s, col: pal3[1], col2: pal3[0], ttl: 0.55, delay: 0.1 + m2 * 0.05 + i * 0.04,
              cx: x + side * 60 * s, cy: y + 6 * s
            });
          }
        });
        break;
      case 'radiance':
        spread(12, function (i) {
          var a = (i / 12) * Math.PI * 2;
          band(x, y + 10 * s, x + Math.cos(a) * 130 * s, y + 10 * s + Math.sin(a) * 130 * s, {
            w: 7 * s, col: pal3[1], col2: pal3[0], ttl: 0.7, delay: i * 0.025,
            cx: x + Math.cos(a) * 60 * s, cy: y + 10 * s + Math.sin(a) * 60 * s, grow: 1
          });
        });
        break;
      case 'orb':
        spread(5, function (i) {
          var a = (i / 5) * Math.PI * 2;
          add({
            k: 'spark', x: x + Math.cos(a) * 54 * s, y: y + Math.sin(a) * 34 * s,
            vx: Math.cos(a + 1.4) * 40, vy: Math.sin(a + 1.4) * 26, drag: 0.6,
            r: 5 * s, col: pal3[1], ttl: 1.0, add: true, delay: i * 0.05
          });
          ring(x + Math.cos(a) * 54 * s, y + Math.sin(a) * 34 * s, { r: 2, r2: 26 * s, w: 1.4, col: pal3[1], ttl: 0.7, delay: i * 0.05 });
        });
        break;
      case 'silk':
        spread(7, function (i) {
          var a = (i / 7) * Math.PI * 2 + 0.3;
          band(x + Math.cos(a) * 90 * s, y + Math.sin(a) * 52 * s, x, y + 10 * s, {
            w: 1.8 * s, col: pal3[1], col2: pal3[0], ttl: 0.75, delay: i * 0.04,
            cx: x + Math.cos(a + 0.6) * 60 * s, cy: y + Math.sin(a + 0.6) * 70 * s
          });
        });
        break;
      case 'vine':
        spread(5, function (i) {
          var bx = x + (i - 2) * 26 * s;
          for (var k2 = 0; k2 < 4; k2++) {
            band(bx, y + 50 * s - k2 * 4 * s, bx + (rng() - 0.5) * 40 * s, y - (10 + k2 * 34) * s, {
              w: 5 * s, col: pal3[1], col2: pal3[0], ttl: 0.8, delay: 0.05 * i + k2 * 0.05,
              cx: bx + (rng() - 0.5) * 30 * s, cy: y + 10 * s
            });
          }
          petal(bx, y - 130 * s, { vx: (rng() - 0.5) * 20, vy: 20, r: 5 * s, col: pal3[1], ttl: 0.9, delay: 0.3 })
        });
        break;
      case 'jade':
        spread(6, function (i) {
          var a = (i / 6) * Math.PI * 2;
          petal(x + Math.cos(a) * 58 * s, y + Math.sin(a) * 36 * s, {
            vx: Math.cos(a) * 20, vy: Math.sin(a) * 14 - 20, r: 7 * s, rot: a, col: pal3[1], ttl: 1.0, delay: i * 0.04
          });
        });
        ring(x, y + 10 * s, { r: 20, r2: 96 * s, w: 4 * s, col: pal3[1], ttl: 0.8, delay: 0.1, squeeze: 0.34 });
        break;
      case 'ice':
        spread(9, function (i) {
          var a = (i / 9) * Math.PI * 2;
          shard(x + Math.cos(a) * 70 * s, y + Math.sin(a) * 42 * s, {
            vx: Math.cos(a) * 24, vy: Math.sin(a) * 16 - 24, r: (8 + rng() * 6) * s,
            rot: a, vr: (rng() - 0.5) * 4, col: pal3[1], col2: pal3[0], ttl: 1.0, delay: i * 0.03, add: true, drag: 1.4
          });
        });
        break;
      case 'iron':
        spread(7, function (i) {
          var a = (i / 7) * Math.PI * 2;
          shard(x + Math.cos(a) * 64 * s, y + Math.sin(a) * 40 * s, {
            vx: Math.cos(a) * 10, vy: Math.sin(a) * 8, r: (11 + rng() * 6) * s,
            rot: a + 1.57, vr: 0.6, col: pal3[2], col2: pal3[0], ttl: 1.0, delay: i * 0.04, drag: 2
          });
        });
        break;
      case 'bone':
        spread(8, function (i) {
          var a = (i / 8) * Math.PI * 2;
          shard(x + Math.cos(a) * 56 * s, y + Math.sin(a) * 36 * s, {
            vx: Math.cos(a) * 34, vy: Math.sin(a) * 22, r: (13 + rng() * 7) * s, rot: a + 0.3,
            vr: 0.8, col: '#efe9d8', col2: pal3[1], ttl: 0.9, delay: i * 0.035, drag: 1.6
          });
        });
        break;
      case 'earth':
        spread(14, function (i) {
          shard(x + (rng() - 0.5) * 120 * s, o.gy || (y + 56 * s), {
            vx: (rng() - 0.5) * 70, vy: -90 - rng() * 120, ax: 0, ay: 460, r: (5 + rng() * 8) * s,
            rot: rng() * 6.28, vr: (rng() - 0.5) * 6, col: pal3[0], col2: pal3[1], ttl: 0.8, delay: i * 0.02, drag: 0
          });
        });
        dust(x, o.gy || (y + 56 * s), { r: 8, r2: 140 * s, w: 2.4, col: '#6b6455', ttl: 0.8 });
        break;
      case 'corpse':
        spread(10, function (i) {
          smoke(x + (rng() - 0.5) * 80 * s, y + (rng() - 0.5) * 90 * s, {
            r: 16 * s, r2: 56 * s, col: pal3[2], alpha: 0.42, ttl: 1.2, delay: i * 0.04, vy: -26
          });
        });
        rune(x, y - 50 * s, { text: '尸', size: 32 * s, col: pal3[1], ttl: 0.9 });
        break;
      case 'infant':
        add({ k: 'spark', x: x, y: y - 20 * s, vx: 0, vy: 0, r: 9 * s, col: pal3[1], ttl: 1.1, add: true });
        spread(3, function (i) {
          ring(x, y - 20 * s, { r: 10, r2: (40 + i * 26) * s, w: 2, col: pal3[1], ttl: 0.9, delay: i * 0.14, squeeze: 0.9 });
        });
        break;
      case 'spirit':
        pillar(x, o.gy || (y + 40 * s), { w: 46 * s, h: 260 * s, col: pal3[0], col2: pal3[1], ttl: 0.9 });
        rune(x, y - 70 * s, { text: '神', size: 34 * s, col: pal3[1], ttl: 0.9, vy: -30 });
        break;
      case 'giant':
        for (var gi = 0; gi < 3; gi++) {
          ring(x, y + 10 * s, { r: 40 + gi * 30, r2: 150 + gi * 40 * s, w: 2, col: pal3[1], ttl: 1.0, squeeze: 0.5, delay: gi * 0.1 });
        }
        glyphRing(x, y - 40 * s, { n: 6, text: '相', r: 96 * s, col: pal3[1], size: 22 * s, ttl: 1.1 });
        break;
      case 'soul':
        spread(9, function (i) {
          rune(x + (rng() - 0.5) * 90 * s, y + 30 * s, { text: '魂', size: (14 + rng() * 12) * s, col: pal3[1], ttl: 1.0, vy: -60 - rng() * 40, delay: i * 0.05 });
        });
        break;
      case 'shadow':
        spread(8, function (i) {
          var a = (i / 8) * Math.PI * 2;
          streak(x + Math.cos(a) * 50 * s, y + Math.sin(a) * 34 * s, {
            vx: Math.cos(a) * 70, vy: Math.sin(a) * 44 - 20, r: 3.4 * s, col: pal3[2], ttl: 0.7, delay: i * 0.03, drag: 1.4
          });
        });
        break;
      case 'drill':
        spread(12, function (i) {
          var t2 = i / 12;
          streak(x - 90 * s + t2 * 170 * s, y + (rng() - 0.5) * 60 * s, {
            vx: 60, vy: (rng() - 0.5) * 40, r: 2.6 * s, col: i % 2 ? pal3[1] : pal3[0], ttl: 0.5, delay: t2 * 0.2, drag: 2
          });
        });
        break;
      case 'magnet':
        spread(10, function (i) {
          var a = (i / 10) * Math.PI * 2;
          band(x + Math.cos(a) * 120 * s, y + Math.sin(a) * 70 * s, x + Math.cos(a) * 24 * s, y + Math.sin(a) * 14 * s, {
            w: 3 * s, col: pal3[1], col2: pal3[0], ttl: 0.6, delay: i * 0.03,
            cx: x + Math.cos(a) * 70 * s, cy: y + Math.sin(a) * 40 * s
          });
        });
        break;
    }
  }

  /* —— 环身 / 增益 —— */
  R.aura = function (x, y, o) {
    var rng = o.rng, p = o.pal, s = o.scale, m = o.m;
    ring(x, y + 10 * s, { r: 10, r2: 130 * s, w: 2.2 * s, col: p[1], ttl: 0.75, squeeze: 0.3 });
    ring(x, y + 10 * s, { r: 8, r2: 96 * s, w: 1.4 * s, col: p[0], ttl: 0.9, squeeze: 0.3, delay: 0.12 });
    spread(26, function (i) {
      var a = rng() * 6.2832;
      var rr = 40 + rng() * 46;
      spark(x + Math.cos(a) * rr * s, y + Math.sin(a) * rr * 0.62 * s, {
        vx: Math.cos(a) * 8, vy: -40 - rng() * 60, r: 1.6 + rng() * 1.8,
        col: rng() > 0.5 ? p[0] : p[1], ttl: 0.8 + rng() * 0.5, delay: i * 0.02, drag: 1.2
      });
    });
    for (var i = 0; i < 3; i++) {
      ring(x, y + 10 * s, { r: 30 + i * 18, r2: 60 + i * 22, w: 1.2, col: p[1], ttl: 0.9, squeeze: 0.32, delay: 0.1 + i * 0.07 });
    }
    motifExtra(m, x, y, p, o);
    for (var k = 0; k < 3; k++) {
      pillar(x + (rng() - 0.5) * 40 * s, y + 30 * s, { w: (14 + rng() * 16) * s, h: (150 + rng() * 90) * s, col: p[0], col2: p[1], ttl: 0.7, delay: k * 0.06 });
    }
    return 900;
  };

  /* —— 近身 —— */
  R.melee = function (x, y, o) {
    var rng = o.rng, p = o.pal, s = o.scale, m = o.m;
    var fx = o.from ? o.from.x : x - 120 * s;
    var fy = o.from ? o.from.y : y;
    /* 冲刺残影 */
    for (var i = 0; i < 7; i++) {
      streak(fx + (x - fx) * (i / 7), fy + (y - fy) * (i / 7) - rng() * 20 * s, {
        vx: -60, vy: -10, r: 2.4 * s, col: p[1], ttl: 0.34, delay: i * 0.012, len: 0.05
      });
    }
    flash(x, y, { r: 92 * s, col: p[1], ttl: 0.26 });
    ring(x, y, { r: 6, r2: 86 * s, w: 3 * s, col: p[1], ttl: 0.42 });
    ring(x, y, { r: 6, r2: 56 * s, w: 1.6 * s, col: p[0], ttl: 0.32, delay: 0.05 });
    spread(22, function (i) {
      var a = rng() * 6.2832, sp = 160 + rng() * 340;
      streak(x, y, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, r: 2.2 * s, col: i % 3 ? p[0] : p[1], ttl: 0.4, len: 0.03 });
    });
    band(x - 60 * s, y - 10 * s, x + 62 * s, y + 16 * s, { w: 11 * s, col: p[1], col2: p[0], ttl: 0.3, cx: x, cy: y - 34 * s });
    dust(x, o.gy || (y + 66 * s), { r: 8, r2: 130 * s, w: 2.4, col: '#6b6455', ttl: 0.7 });
    if (m === 'sword' || m === 'shadow' || m === 'blood') motifExtra('sword', x, y, p, o);
    if (m === 'fist') {
      for (var f = 0; f < 4; f++) rune(x - 20 * s + f * 14 * s, y - 10 * s, { text: '拳', size: 22 * s, col: p[1], ttl: 0.5, vy: -70, delay: f * 0.03 });
    }
    return 520;
  };

  /* —— 剑气 —— */
  R.slash = function (x, y, o) {
    var rng = o.rng, p = o.pal, s = o.scale;
    var n = o.hits || 3;
    for (var i = 0; i < n; i++) {
      var dir = i % 2 ? 1 : -1;
      var y0 = y - 132 * s * dir, y1 = y + 6 * s * dir;
      band(x - 150 * s, y0, x + 150 * s, y1, {
        w: 16 * s, col: p[0], col2: p[1], ttl: 0.42, delay: i * 0.08,
        cx: x + 10 * s, cy: y - 46 * s * dir
      });
      band(x - 140 * s, y0 + 4 * s * dir, x + 140 * s, y1 - 4 * s * dir, {
        w: 3.4 * s, col: '#ffffff', col2: p[1], ttl: 0.34, delay: i * 0.08 + 0.02,
        cx: x + 10 * s, cy: y - 46 * s * dir
      });
    }
    /* 剑气拖尾 */
    for (var t2 = 0; t2 < 10; t2++) {
      streak(x + (rng() - 0.5) * 260 * s, y + (rng() - 0.5) * 140 * s, {
        vx: (rng() - 0.5) * 320, vy: (rng() - 0.5) * 120, r: 2.4 * s,
        col: p[1], ttl: 0.55, delay: 0.06 + t2 * 0.012, len: 0.04, drag: 1.2
      });
    }
    spread(16, function (i) {
      var a = rng() * 6.2832;
      streak(x + (rng() - 0.5) * 120 * s, y + (rng() - 0.5) * 90 * s, {
        vx: Math.cos(a) * 220, vy: Math.sin(a) * 160, r: 1.8 * s, col: p[1], ttl: 0.36, delay: 0.05 + i * 0.01
      });
    });
    flash(x, y, { r: 70 * s, col: p[1], ttl: 0.22, delay: 0.04 });
    if (o.m === 'shadow') {
      spread(6, function (i) { smoke(x + (rng() - 0.5) * 100 * s, y + (rng() - 0.5) * 60 * s, { r: 16 * s, r2: 50 * s, col: p[2], alpha: 0.45, ttl: 0.7, delay: i * 0.04 }); });
    }
    return 560;
  };

  /* —— 投射 —— */
  R.proj = function (x, y, o) {
    var rng = o.rng, p = o.pal, s = o.scale, from = o.from || { x: x - 200 * s, y: y };
    var dur = 0.30;
    var dx = x - from.x, dy = y - from.y;
    var steps = 16;
    for (var i = 0; i < steps; i++) {
      var t = i / steps;
      var px = from.x + dx * t, py = from.y + dy * t - Math.sin(t * Math.PI) * 26 * s;
      spark(px, py, { vx: (rng() - 0.5) * 30, vy: (rng() - 0.5) * 30, r: (3.2 + rng() * 2.4) * s, col: i % 2 ? p[0] : p[1], ttl: 0.34, delay: t * dur, drag: 3 });
    }
    flash(x, y, { r: 84 * s, col: p[1], ttl: 0.26, delay: dur });
    ring(x, y, { r: 8, r2: 96 * s, w: 3 * s, col: p[1], ttl: 0.42, delay: dur });
    spread(20, function (i) {
      var a = rng() * 6.2832, sp = 120 + rng() * 300;
      streak(x, y, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 2 * s, col: i % 2 ? p[0] : p[1], ttl: 0.42, delay: dur, len: 0.035 });
    });
    if (o.m === 'flame') {
      for (var f = 0; f < 12; f++) smoke(x, y, { r: 16 * s, r2: 60 * s, col: p[0], alpha: 0.4, ttl: 0.8, delay: dur + f * 0.02, vy: -46, vx: (rng() - 0.5) * 40 });
      rune(x, y - 30 * s, { text: '火', size: 34 * s, col: p[1], ttl: 0.6, delay: dur });
    }
    if (o.m === 'snow') {
      for (var n2 = 0; n2 < 14; n2++) shard(x + (rng() - 0.5) * 90 * s, y + (rng() - 0.5) * 70 * s, {
        vx: (rng() - 0.5) * 120, vy: -20 - rng() * 40, r: (5 + rng() * 5) * s, vr: (rng() - 0.5) * 6,
        col: p[1], col2: p[0], ttl: 0.9, delay: dur + n2 * 0.015, add: true, drag: 1.4
      });
      smoke(x, y, { r: 30 * s, r2: 90 * s, col: p[0], alpha: 0.35, ttl: 1.0, delay: dur });
    }
    if (o.m === 'wave') {
      for (var w = 0; w < 3; w++) {
        ring(x, y, { r: 10, r2: (70 + w * 30) * s, w: 3 * s, col: p[1], ttl: 0.6, delay: dur + w * 0.06, squeeze: 0.55 });
      }
    }
    if (o.m === 'needle') {
      for (var nn = 0; nn < 3; nn++) {
        band(from.x, from.y, x, y, { w: 5 * s, col: p[1], col2: p[0], ttl: 0.3, delay: nn * 0.05, cx: (from.x + x) / 2, cy: (from.y + y) / 2 - 18 * s });
      }
    }
    if (o.m === 'blade' || o.m === 'wind') {
      for (var b = 0; b < 4; b++) {
        band(from.x, from.y - 40 * s + b * 20 * s, x, y - 30 * s + b * 18 * s, { w: 7 * s, col: p[1], col2: p[0], ttl: 0.34, delay: 0.06 * b, cx: (from.x + x) / 2, cy: (from.y + y) / 2 - 30 * s });
      }
    }
    return 780;
  };

  /* —— 光束 —— */
  R.beam = function (x, y, o) {
    var rng = o.rng, p = o.pal, s = o.scale, from = o.from || { x: x - 220 * s, y: y };
    band(from.x, from.y - 26 * s, x, y, { w: 26 * s, col: p[1], col2: p[0], ttl: 0.36, cx: (from.x + x) / 2, cy: (from.y + y) / 2 - 44 * s });
    band(from.x, from.y - 26 * s, x, y, { w: 8 * s, col: '#ffffff', col2: p[1], ttl: 0.3, cx: (from.x + x) / 2, cy: (from.y + y) / 2 - 44 * s, delay: 0.02 });
    flash(x, y, { r: 90 * s, col: p[1], ttl: 0.3, delay: 0.06 });
    ring(x, y, { r: 6, r2: 110 * s, w: 3 * s, col: p[1], ttl: 0.4, delay: 0.06, squeeze: 0.85 });
    spread(18, function (i) {
      var a = rng() * 6.2832, sp = 100 + rng() * 260;
      streak(x, y, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 2 * s, col: p[1], ttl: 0.4, delay: 0.06 + i * 0.008 });
    });
    if (o.m === 'thunder') bolt(from.x, from.y - 120 * s, x, y, { w: 4 * s, col: p[1], col2: p[0], segs: 12, amp: 40 * s, ttl: 0.34 });
    motifExtra(o.m, x, y, p, o);
    return 640;
  };

  /* —— 天降 —— */
  R.rain = function (x, y, o) {
    var rng = o.rng, p = o.pal, s = o.scale;
    var n = 12;
    flash(x, y - 10 * s, { r: 110 * s, col: p[1], ttl: 0.4, delay: 0.3 });
    for (var i = 0; i < n; i++) {
      var sx = x + (rng() - 0.5) * 230 * s;
      var delay = i * 0.05;
      var top = y - (200 + rng() * 120) * s;
      spark(sx, top, { vx: 0, vy: 700 * s, r: 2.6 * s, col: p[1], ttl: 0.34, delay: delay, drag: 0 });
      shard(sx, top, { vx: 0, vy: 620 * s, r: (6 + rng() * 6) * s, rot: Math.PI, col: p[1], col2: p[0], ttl: 0.34, delay: delay, drag: 0, add: true, vr: 2 });
      ring(sx, y + (rng() - 0.3) * 40 * s, { r: 4, r2: 40 * s, w: 1.6, col: p[1], ttl: 0.4, delay: delay + 0.26, squeeze: 0.5 });
    }
    if (o.m === 'swords') motifExtra('swords', x, y, p, o);
    for (var k = 0; k < 6; k++) smoke(x + (rng() - 0.5) * 200 * s, y + 40 * s, { r: 24 * s, r2: 70 * s, col: p[0], alpha: 0.3, ttl: 0.9, delay: 0.4 + k * 0.03 });
    return 900;
  };

  /* —— 地涌 —— */
  R.ground = function (x, y, o) {
    var rng = o.rng, p = o.pal, s = o.scale;
    var gy = o.gy || (y + 56 * s);
    dust(x, gy, { r: 10, r2: 170 * s, w: 3 * s, col: '#6b6455', ttl: 0.7 });
    ring(x, gy, { r: 8, r2: 120 * s, w: 2.4 * s, col: p[1], ttl: 0.55, squeeze: 0.3 });
    var n = 7;
    for (var i = 0; i < n; i++) {
      var sx = x + (i - (n - 1) / 2) * 30 * s;
      shard(sx, gy, {
        vx: (rng() - 0.5) * 30, vy: -260 - rng() * 240, ax: 0, ay: 620,
        r: (16 + rng() * 16) * s, rot: 0, vr: (rng() - 0.5) * 1.2,
        col: p[0], col2: p[1], ttl: 0.6 + rng() * 0.2, delay: i * 0.04, drag: 0
      });
    }
    for (var k = 0; k < 10; k++) {
      smoke(x + (rng() - 0.5) * 150 * s, gy, { r: 18 * s, r2: 60 * s, col: p[0], alpha: 0.4, ttl: 0.8, delay: 0.05 * k, vy: -30 - rng() * 40 });
    }
    if (o.m === 'sand') {
      spread(20, function (i) { petal(x + (rng() - 0.5) * 180 * s, gy - rng() * 40 * s, { vx: (rng() - 0.5) * 160, vy: -60 - rng() * 90, r: (3 + rng() * 4) * s, col: p[1], ttl: 0.9, delay: i * 0.02, drag: 1.6 }); });
    }
    return 780;
  };

  /* —— 天罚 —— */
  R.sky = function (x, y, o) {
    var rng = o.rng, p = o.pal, s = o.scale;
    var top = y - 300 * s;
    flash(x, top, { r: 60 * s, col: p[1], ttl: 0.24 });
    flash(x, y, { r: 120 * s, col: p[1], ttl: 0.34, delay: 0.16 });
    for (var i = 0; i < 6; i++) {
      bolt(x + (rng() - 0.5) * 90 * s, top, x + (rng() - 0.5) * 34 * s, y + 6 * s, {
        w: (9 - i * 1.2) * s, col: p[1], col2: p[0], segs: 13, amp: 34 * s,
        ttl: 0.5, delay: 0.1 + i * 0.05, rng: rng
      });
    }
    for (var b2 = 0; b2 < 3; b2++) {
      bolt(x + (rng() - 0.5) * 120 * s, top, x + (rng() - 0.5) * 50 * s, y - 30 * s, {
        w: 2.4 * s, col: '#ffffff', col2: p[1], segs: 11, amp: 44 * s,
        ttl: 0.42, delay: 0.18 + b2 * 0.09, rng: rng
      });
    }
    pillar(x, o.gy || (y + 40 * s), { w: 90 * s, h: 400 * s, col: p[0], col2: p[1], ttl: 0.55, delay: 0.16 });
    ring(x, o.gy || (y + 56 * s), { r: 10, r2: 170 * s, w: 4 * s, col: p[1], ttl: 0.6, squeeze: 0.3, delay: 0.2 });
    ring(x, y, { r: 8, r2: 130 * s, w: 2.4 * s, col: p[1], ttl: 0.5, delay: 0.18, squeeze: 0.9 });
    spread(24, function (i) {
      var a = rng() * 6.2832, sp = 140 + rng() * 340;
      streak(x, y, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, r: 2.2 * s, col: i % 2 ? p[1] : p[0], ttl: 0.5, delay: 0.18, len: 0.03 });
    });
    dust(x, o.gy || (y + 56 * s), { r: 12, r2: 200 * s, w: 3, col: '#6b6455', ttl: 0.8, delay: 0.2 });
    if (o.m === 'bigsword') motifExtra('bigsword', x, y, p, o);
    if (o.m === 'tripod') motifExtra('tripod', x, y, p, o);
    if (o.m === 'hand') motifExtra('hand', x, y, p, o);
    if (o.m === 'thunder') glyphRing(x, y - 30 * s, { n: 5, text: '雷', r: 54 * s, col: p[1], size: 20 * s, ttl: 0.8, delay: 0.2 });
    return 900;
  };

  /* —— 群体扩散 —— */
  R.aoe = function (x, y, o) {
    var rng = o.rng, p = o.pal, s = o.scale;
    var list = o.targets && o.targets.length ? o.targets : [{ x: x, y: y }];
    list.forEach(function (t, ti) {
      flash(t.x, t.y, { r: 70 * s, col: p[1], ttl: 0.3, delay: ti * 0.06 });
      ring(t.x, t.y, { r: 8, r2: 96 * s, w: 2.6 * s, col: p[1], ttl: 0.5, delay: ti * 0.06 });
    });
    var cx = list.reduce(function (a, t) { return a + t.x; }, 0) / list.length;
    var cy = list.reduce(function (a, t) { return a + t.y; }, 0) / list.length;
    var gy2 = o.gy || (cy + 40 * s);
    ring(cx, gy2, { r: 20, r2: 250 * s, w: 2.4 * s, col: p[0], ttl: 0.8, squeeze: 0.3 });
    ring(cx, gy2, { r: 20, r2: 190 * s, w: 1.4 * s, col: p[0], ttl: 0.9, squeeze: 0.3, delay: 0.12 });
    spread(30, function (i) {
      var a = rng() * 6.2832, sp = 200 + rng() * 380;
      streak(cx, cy, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.5, r: 2.4 * s, col: i % 2 ? p[1] : p[0], ttl: 0.6, delay: i * 0.012, len: 0.03 });
    });
    motifExtra(o.m, cx, cy, p, o);
    if (o.m === 'swordform') {
      list.forEach(function (t) {
        for (var i = 0; i < 4; i++) band(t.x - 90 * s, t.y - 40 * s, t.x + 90 * s, t.y + 34 * s, { w: 8 * s, col: p[1], col2: p[0], ttl: 0.34, delay: 0.1 + i * 0.06, cx: t.x, cy: t.y + 30 * s });
      });
    }
    return 950;
  };

  /* —— 回复 —— */
  R.heal = function (x, y, o) {
    var rng = o.rng, p = o.pal, s = o.scale;
    ring(x, y + 10 * s, { r: 10, r2: 120 * s, w: 2, col: p[1], ttl: 0.8, squeeze: 0.3 });
    for (var i = 0; i < 4; i++) ring(x, y + 10 * s, { r: 26 + i * 16, r2: 70 + i * 22 * s, w: 1.2, col: p[1], ttl: 1.0, squeeze: 0.32, delay: 0.1 + i * 0.08 });
    spread(30, function (i) {
      var a = rng() * 6.2832, rr = 20 + rng() * 70;
      spark(x + Math.cos(a) * rr * s, y + rng() * 70 * s, {
        vx: Math.cos(a) * 6, vy: -40 - rng() * 70, r: 1.6 + rng() * 2.2,
        col: rng() > 0.4 ? p[1] : '#ffffff', ttl: 1.1 + rng() * 0.5, delay: i * 0.022, drag: 0.8
      });
    });
    motifExtra(o.m, x, y, p, o);
    pillar(x, y + 30 * s, { w: 26 * s, h: 190 * s, col: p[0], col2: p[1], ttl: 0.9 });
    return 950;
  };

  /* —— 护罩 —— */
  R.shield = function (x, y, o) {
    var rng = o.rng, p = o.pal, s = o.scale;
    ring(x, y + 10 * s, { r: 12, r2: 118 * s, w: 3 * s, col: p[1], ttl: 0.6 });
    /* 穹顶：左右两道弧拢在头顶 */
    band(x - 96 * s, (o.gy || y + 60 * s), x, (o.gy || y + 60 * s) - 190 * s, {
      w: 5 * s, col: p[1], col2: p[0], ttl: 0.9, cx: x - 74 * s, cy: (o.gy || y + 60 * s) - 118 * s
    });
    band(x, (o.gy || y + 60 * s) - 190 * s, x + 96 * s, (o.gy || y + 60 * s), {
      w: 5 * s, col: p[1], col2: p[0], ttl: 0.9, delay: 0.05, cx: x + 74 * s, cy: (o.gy || y + 60 * s) - 118 * s
    });
    for (var i = 0; i < 3; i++) {
      ring(x, y + 10 * s, { r: 40 + i * 8, r2: 104 + i * 6 * s, w: 1.4, col: p[0], ttl: 1.0, delay: i * 0.07, squeeze: 0.9 });
    }
    spread(16, function (i) {
      var a = (i / 16) * 6.2832;
      shard(x + Math.cos(a) * 96 * s, y + 10 * s + Math.sin(a) * 96 * s, {
        vx: Math.cos(a) * 26, vy: Math.sin(a) * 26, r: (5 + rng() * 5) * s, rot: a, col: p[1], col2: p[0],
        ttl: 0.9, delay: i * 0.02, add: true, drag: 2
      });
    });
    glyphRing(x, y - 10 * s, { n: 5, text: o.ch || '护', r: 84 * s, col: p[1], size: 18 * s, ttl: 1.0 });
    motifExtra(o.m, x, y, p, o);
    return 900;
  };

  /* —— 禁锢 —— */
  R.seal = function (x, y, o) {
    var rng = o.rng, p = o.pal, s = o.scale;
    flash(x, y - 10 * s, { r: 74 * s, col: p[1], ttl: 0.3 });
    for (var i = 0; i < 5; i++) {
      ring(x, y, { r: 110 * s - i * 16 * s, r2: 26 * s, w: 2.2 * s, col: i % 2 ? p[1] : p[0], ttl: 0.6, delay: i * 0.05, squeeze: 0.8 });
    }
    motifExtra(o.m, x, y, p, o);
    spread(14, function (i) {
      var a = (i / 14) * 6.2832;
      spark(x + Math.cos(a) * 100 * s, y + Math.sin(a) * 50 * s, {
        vx: -Math.cos(a) * 90, vy: -Math.sin(a) * 45 - 10, r: 2 * s, col: p[1], ttl: 0.55, delay: 0.1 + i * 0.01
      });
    });
    return 800;
  };

  /* —— 抽元 —— */
  R.drain = function (x, y, o) {
    var rng = o.rng, p = o.pal, s = o.scale, from = o.from || { x: x - 200 * s, y: y };
    for (var i = 0; i < 26; i++) {
      var t = rng();
      var sx = x + (rng() - 0.5) * 60 * s, sy = y + (rng() - 0.5) * 80 * s;
      var tx = from.x, ty = from.y - 20 * s;
      spark(sx, sy, {
        vx: (tx - sx) / 0.62, vy: (ty - sy) / 0.62, r: 2.4 * s,
        col: i % 3 ? p[1] : p[0], ttl: 0.62, delay: i * 0.03, drag: 0.4
      });
    }
    ring(x, y, { r: 96 * s, r2: 18 * s, w: 2.4 * s, col: p[1], ttl: 0.7, squeeze: 0.8 });
    glyphRing(from.x, from.y - 20 * s, { n: 4, text: '收', r: 46 * s, col: p[1], size: 18 * s, ttl: 0.8, delay: 0.3 });
    ring(from.x, from.y + 10 * s, { r: 20, r2: 90 * s, w: 2, col: p[1], ttl: 0.7, squeeze: 0.3, delay: 0.4 });
    motifExtra(o.m, x, y, p, o);
    return 820;
  };

  /* —— 虚空 —— */
  R.rift = function (x, y, o) {
    var rng = o.rng, p = o.pal, s = o.scale;
    flash(x, y, { r: 90 * s, col: p[2], ttl: 0.4 });
    for (var i = 0; i < 7; i++) {
      band(x - 40 * s, y - 90 * s + i * 26 * s, x + 40 * s, y - 78 * s + i * 28 * s, {
        w: (4 + rng() * 5) * s, col: p[2], col2: p[0], ttl: 0.8, delay: i * 0.04,
        cx: x + (rng() - 0.5) * 40 * s, cy: y + (rng() - 0.5) * 40 * s
      });
    }
    for (var k = 0; k < 20; k++) {
      var a = rng() * 6.2832, rr = 90 + rng() * 80;
      spark(x + Math.cos(a) * rr * s, y + Math.sin(a) * rr * 0.7 * s, {
        vx: -Math.cos(a) * rr * 1.4, vy: -Math.sin(a) * rr * 1.4, r: 2 * s,
        col: p[0], ttl: 0.7, delay: k * 0.02, drag: 0.6
      });
    }
    rune(x, y - 20 * s, { text: '虚', size: 44 * s, col: p[1], ttl: 0.9 });
    motifExtra(o.m, x, y, p, o);
    return 850;
  };

  /* —— 召鬼 —— */
  R.summon = function (x, y, o) {
    var rng = o.rng, p = o.pal, s = o.scale, from = o.from || { x: x - 200 * s, y: y };
    var n = o.m === 'sixghost' ? 6 : 3;
    for (var i = 0; i < n; i++) {
      var ox = from.x + (rng() - 0.5) * 90 * s;
      smoke(ox, from.y + 20 * s, { r: 26 * s, r2: 88 * s, col: p[2], alpha: 0.55, ttl: 1.1, delay: i * 0.06, vy: -30 });
      rune(ox, from.y - 20 * s, { text: '鬼', size: (26 + rng() * 10) * s, col: p[1], ttl: 0.9, delay: i * 0.06, vy: -24 });
      spark(ox, from.y, { vx: (x - ox) / 0.9, vy: (y - from.y) / 0.9, r: 3 * s, col: p[1], ttl: 0.9, delay: 0.2 + i * 0.05, drag: 0.2 });
    }
    flash(x, y, { r: 80 * s, col: p[1], ttl: 0.3, delay: 0.85 });
    ring(x, y, { r: 8, r2: 100 * s, w: 2.6 * s, col: p[1], ttl: 0.5, delay: 0.85 });
    return 1000;
  };

  /* —— 掌印 —— */
  R.palm = function (x, y, o) {
    var rng = o.rng, p = o.pal, s = o.scale, from = o.from || { x: x - 220 * s, y: y };
    rune(from.x + 20 * s, from.y - 40 * s, { text: '掌', size: 46 * s, col: p[1], ttl: 0.5 });
    for (var i = 0; i < 5; i++) {
      band(from.x, from.y - 30 * s, x + (i - 2) * 10 * s, y - 20 * s + (i - 2) * 8 * s, {
        w: 9 * s, col: p[1], col2: p[0], ttl: 0.42, delay: 0.16 + i * 0.02, cx: (from.x + x) / 2, cy: (from.y + y) / 2 - 30 * s
      });
    }
    flash(x, y, { r: 110 * s, col: p[1], ttl: 0.34, delay: 0.3 });
    ring(x, y, { r: 10, r2: 130 * s, w: 4 * s, col: p[1], ttl: 0.5, delay: 0.3, squeeze: 0.9 });
    spread(18, function (i) {
      var a = rng() * 6.2832, sp = 160 + rng() * 300;
      streak(x, y, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 2.4 * s, col: p[1], ttl: 0.45, delay: 0.3, len: 0.03 });
    });
    return 760;
  };

  /* —— 爆发 —— */
  R.burst = function (x, y, o) {
    var rng = o.rng, p = o.pal, s = o.scale;
    flash(x, y, { r: 130 * s, col: p[1], ttl: 0.36 });
    ring(x, y, { r: 8, r2: 150 * s, w: 4 * s, col: p[1], ttl: 0.55 });
    ring(x, y, { r: 8, r2: 110 * s, w: 2 * s, col: p[0], ttl: 0.7, delay: 0.08 });
    spread(34, function (i) {
      var a = rng() * 6.2832, sp = 180 + rng() * 420;
      streak(x, y, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 2.6 * s, col: i % 3 ? p[1] : p[0], ttl: 0.55, delay: i * 0.008, len: 0.028 });
    });
    for (var i = 0; i < 16; i++) {
      var a2 = rng() * 6.2832;
      shard(x, y, { vx: Math.cos(a2) * (120 + rng() * 260), vy: Math.sin(a2) * (120 + rng() * 260) - 60, ax: 0, ay: 420, r: (6 + rng() * 8) * s, rot: a2, vr: (rng() - 0.5) * 8, col: p[0], col2: p[1], ttl: 0.8, drag: 0.6 });
    }
    if (o.m === 'blood') {
      for (var k = 0; k < 10; k++) smoke(x + (rng() - 0.5) * 120 * s, y + (rng() - 0.5) * 80 * s, { r: 20 * s, r2: 74 * s, col: p[2], alpha: 0.5, ttl: 1.0, delay: k * 0.03, vy: -30 });
      rune(x, y - 40 * s, { text: '血', size: 40 * s, col: p[1], ttl: 0.8 });
    }
    return 780;
  };

  function math(x) { return x; }

  /* =============================================================
     八、兜底：没有配方时按元素和效果推
     ============================================================= */
  function guess(el, name, effects) {
    var txt = String(name || '');
    if (/剑/.test(txt)) return { sh: 'slash', m: 'sword' };
    if (/雷/.test(txt)) return { sh: 'sky', m: 'thunder' };
    if (/火|焰/.test(txt)) return { sh: 'proj', m: 'flame' };
    if (/冰|雪|霜/.test(txt)) return { sh: 'proj', m: 'snow' };
    if (/风/.test(txt)) return { sh: 'proj', m: 'wind' };
    if (/鬼|魂|尸|煞/.test(txt)) return { sh: 'summon', m: 'ghost' };
    if (/血/.test(txt)) return { sh: 'burst', m: 'blood' };
    if (/掌|拳|爪/.test(txt)) return { sh: 'melee', m: 'fist' };
    if (/盾|甲|罩|护/.test(txt)) return { sh: 'shield', m: 'armor' };
    if (/封|锁|禁|困|缠/.test(txt)) return { sh: 'seal', m: 'chain' };
    if (/毒|咒/.test(txt)) return { sh: 'seal', m: 'mark' };
    var map = { fire: 'flame', ice: 'snow', water: 'wave', wood: 'vine', earth: 'spike', metal: 'blade', thunder: 'thunder', ghost: 'ghost', soul: 'orb', blood: 'blood', wind: 'wind', phys: 'fist' };
    return { sh: (el === 'phys' ? 'melee' : 'proj'), m: map[el] || 'fist' };
  }

  /* =============================================================
     九、播放入口
     ============================================================= */
  function play(o) {
    if (!o) return 0;
    var id = o.id || '__basic';
    var sp = SPEC[id];
    if (!sp) {
      var g2 = guess(o.el, o.name, o.effects);
      sp = { sh: g2.sh, m: g2.m };
      if (o.el) sp.c = o.el;
    }
    var colKey = sp.c || o.el || 'phys';
    var p = pal(colKey);
    var sh = sp.sh || 'melee';
    var rng = mulberry32(hash(id) + (seq++ & 7));
    var targets = o.targets && o.targets.length ? o.targets
      : (o.to ? [{ x: o.to.x, y: o.to.y }] : null);
    if (!targets) return 0;
    var t0 = targets[0];
    var s = o.scale || 1;

    var ctx = {
      rng: rng, pal: p, scale: s, m: sp.m, ch: sp.ch,
      from: o.from, to: t0, targets: targets, hits: o.hits, gy: o.gy
    };

    /* —— 术法贴图：真正的光效，压在粒子上 —— */
    var tk = texKeyFor(colKey);
    if (o.noTex) { tk = null; }
    if (!tk) {
      /* 兵刃相交：光效由 clash 自己出，这里不再叠术法贴图 */
    } else if (sh === 'heal') {
      texBurst('wood', t0.x, t0.y, { size: 320 * s, ttl: 1.05, delay: 0.05, grow: 0.2 });
    } else if (sh === 'shield') {
      texBurst('shield', t0.x, t0.y, { size: 360 * s, ttl: 1.05, delay: 0.05, grow: 0.18 });
    } else if (sh === 'sky') {
      texBurst(colKey === 'thunder' ? 'thunder' : tk, t0.x, t0.y - 110 * s, { size: 460 * s, ttl: 0.85, delay: 0.12, grow: 0.1 });
    } else if (sh === 'slash') {
      for (var ti = 0; ti < Math.min(3, o.hits || 3); ti++) {
        texBurst('metal', t0.x, t0.y - 20 * s, {
          size: 300 * s, ttl: 0.5, delay: 0.05 + ti * 0.09,
          rot: (ti % 2 ? 0.42 : -0.42), grow: 0.25, alpha: 0.85
        });
      }
    } else if (sh === 'aura') {
      texBurst('shield', t0.x, t0.y, { size: 230 * s, ttl: 0.8, delay: 0.05, grow: 0.14, alpha: 0.38 });
    } else if (sh === 'summon' || sh === 'rift' || sh === 'seal' || sh === 'drain') {
      texBurst(tk === 'metal' ? 'ghost' : tk, t0.x, t0.y, { size: 300 * s, ttl: 0.8, delay: 0.15, grow: 0.25 });
    } else if (sh === 'aoe') {
      targets.forEach(function (t, ii) {
        texBurst(tk, t.x, t.y, { size: 330 * s, ttl: 0.75, delay: 0.08 + ii * 0.05, grow: 0.3 });
      });
    } else {
      texBurst(tk, t0.x, t0.y, {
        size: (sh === 'melee' ? 230 : 270) * s, ttl: 0.58,
        delay: sh === 'melee' ? 0.2 : 0.3, grow: 0.32,
        rot: sh === 'melee' ? -0.85 : 0
      });
    }

    var dur = 0;
    /* 群体：多目标时用 aoe；自我：aura */
    var fn = R[sh];
    if (sh === 'aoe' || (targets.length > 1 && sh !== 'rain')) {
      R.aoe(t0.x, t0.y, ctx);
      dur = 950;
      if (targets.length > 1 && sh !== 'aoe') { R[sh] && R[sh](t0.x, t0.y, ctx); }
    } else if (fn) {
      dur = fn(t0.x, t0.y, ctx) || 700;
    } else {
      dur = R.melee(t0.x, t0.y, ctx) || 600;
    }

    /* 屏幕震动（近身、天罚、爆发更狠） */
    var amp = (sh === 'sky' || sh === 'burst') ? 7 : (sh === 'melee' ? 5 : (sh === 'aoe' ? 6 : 2));
    shakeAmp = Math.max(shakeAmp, amp * s);
    shakeT = 0.34;
    return dur;
  }

  /* 兵刃相交：白闪 + 环形冲击波 + 剑光碎屑，全部集中在交点 */
  function clash(x, y) {
    add({ k: 'flash', x: x, y: y, r: 108, col: '#ffffff', ttl: 0.24 });
    add({ k: 'flash', x: x, y: y, r: 62, col: '#fff8e4', ttl: 0.18, delay: 0.02 });
    ring(x, y, { r: 5, r2: 124, w: 5, col: '#ffffff', ttl: 0.4 });
    ring(x, y, { r: 5, r2: 92, w: 2.6, col: '#ffe6a8', ttl: 0.52, delay: 0.03 });
    ring(x, y, { r: 4, r2: 62, w: 1.6, col: '#ffffff', ttl: 0.62, delay: 0.07, squeeze: 0.94 });
    /* 两道交叉的剑光 */
    for (var i = 0; i < 2; i++) {
      var sd = i ? 1 : -1;
      band(x - 62, y - 46 * sd, x + 62, y + 46 * sd, {
        w: 9, col: '#ffffff', col2: '#ffeec2', ttl: 0.24, cx: x + 6 * sd, cy: y + 10 * sd
      });
      band(x - 62, y - 46 * sd, x + 62, y + 46 * sd, {
        w: 3, col: '#ffffff', col2: '#ffffff', ttl: 0.18, delay: 0.02, cx: x + 6 * sd, cy: y + 10 * sd
      });
    }
    /* 细碎剑光碎屑 */
    for (var j = 0; j < 34; j++) {
      var a = Math.random() * 6.2832, sp = 220 + Math.random() * 480;
      streak(x, y, {
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 1.6 + Math.random() * 1.6,
        col: Math.random() > 0.5 ? '#ffffff' : '#ffe3a6',
        ttl: 0.42 + Math.random() * 0.3, delay: 0.02 + Math.random() * 0.06, len: 0.03, drag: 2.4
      });
    }
    for (var k2 = 0; k2 < 18; k2++) {
      var a2 = Math.random() * 6.2832, sp2 = 130 + Math.random() * 280;
      spark(x, y, {
        vx: Math.cos(a2) * sp2, vy: Math.sin(a2) * sp2 + 30, r: 2.2 + Math.random() * 2,
        col: '#ffdda0', ttl: 0.55, delay: 0.03, drag: 2
      });
    }
    shakeAmp = Math.max(shakeAmp, 10); shakeT = 0.42;
    return 620;
  }

  /* 脚下尘土 */
  function dustBurst(x, y, n) {
    n = n || 10;
    dust(x, y, { r: 8, r2: 130, w: 2.6, col: '#8b8371', ttl: 0.75 });
    for (var i = 0; i < n; i++) {
      smoke(x + (Math.random() - 0.5) * 60, y, {
        r: 14 + Math.random() * 12, r2: 46 + Math.random() * 30, col: '#6f6757',
        alpha: 0.3, ttl: 0.8, delay: i * 0.02,
        vx: (Math.random() - 0.5) * 70, vy: -10 - Math.random() * 30
      });
    }
  }

  function shakeOffset() {
    if (shakeT <= 0) return [0, 0];
    var k = shakeT / 0.34;
    return [(Math.random() - 0.5) * shakeAmp * k, (Math.random() - 0.5) * shakeAmp * k];
  }

  /* 轻量命中：持续伤害、反伤、倒地这类「没有招式」的掉血 */
  function impact(x, y, el, power) {
    var p = pal(el);
    var s = power || 1;
    flash(x, y, { r: 46 * s, col: p[1], ttl: 0.24 });
    ring(x, y, { r: 4, r2: 46 * s, w: 2 * s, col: p[1], ttl: 0.34 });
    for (var i = 0; i < 10; i++) {
      var a = Math.random() * 6.2832, sp = 90 + Math.random() * 220;
      streak(x, y, {
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 1.8 * s,
        col: i % 2 ? p[0] : p[1], ttl: 0.34, len: 0.03
      });
    }
    shakeAmp = Math.max(shakeAmp, 2.6 * s);
    shakeT = 0.2;
    return 340;
  }

  function glow(x, y, el, power) {
    var p = pal(el);
    var s = power || 1;
    add({
      k: 'flash', x: x, y: y, r: 60 * s, col: p[1], ttl: 0.5, delay: 0
    });
    ring(x, y, { r: 6, r2: 70 * s, w: 2 * s, col: p[1], ttl: 0.6, squeeze: 0.9 });
  }

  g.BattleFX = {
    play: play, step: step, draw: draw, clear: clear, count: count,
    loadTextures: loadTextures, TEX: TEX, clash: clash, dustBurst: dustBurst,
    impact: impact, glow: glow,
    shakeOffset: shakeOffset, pal: pal, SPEC: SPEC, hash: hash,
    _P: function () { return P; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
