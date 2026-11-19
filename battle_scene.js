/* =============================================================
   斗法演出 · 舞台
   -------------------------------------------------------------
   - 人物：生成好的剪影贴图，整身做刚体动画（位移 / 旋转 / 淡出）
   - 背景：月夜远山，四层山脊带雾
   - 特效：canvas 粒子 + 生成好的术法贴图叠加
   ============================================================= */
(function (g) {
  'use strict';

  var FX = g.BattleFX;
  var SPR = g.SPRITES || {};

  var stage, inner, landEl, fightersEl, canvas, ctx, capEl, stampEl, floatEl;
  var W = 0, H = 0, DPR = 1;
  var units = {};
  var figs = {};
  var last = 0, running = false;
  var capTimer = null;

  /* =============================================================
     一、背景
     ============================================================= */
  var THEME = {
    human:  { sky: ['#080d12', '#16232a', '#202e30'], moon: '#e9e4cf', ridge: ['#22323a', '#19262c', '#0f1a1f', '#070d10'] },
    demon:  { sky: ['#090809', '#151112', '#1b1718'], moon: '#bb8d7e', ridge: ['#241b1c', '#1a1415', '#100d0e', '#080707'] },
    ghost:  { sky: ['#08070f', '#161329', '#211c34'], moon: '#cdc2ea', ridge: ['#241f3a', '#1a162c', '#120f20', '#08060f'] },
    beast:  { sky: ['#0a0906', '#1a1710', '#262017'], moon: '#e6d3a0', ridge: ['#2a2318', '#1e1910', '#14100a', '#080604'] }
  };

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function smoothRidge(w, baseY, amp, step, rng) {
    var pts = [];
    var x = -80;
    while (x < w + 80) {
      pts.push([x, baseY - amp * (0.25 + rng() * 0.75)]);
      x += step * (0.7 + rng() * 0.7);
    }
    var d = 'M' + pts[0][0].toFixed(1) + ',' + pts[0][1].toFixed(1);
    for (var i = 1; i < pts.length - 1; i++) {
      var mx = (pts[i][0] + pts[i + 1][0]) / 2;
      var my = (pts[i][1] + pts[i + 1][1]) / 2;
      d += ' Q' + pts[i][0].toFixed(1) + ',' + pts[i][1].toFixed(1) + ' ' + mx.toFixed(1) + ',' + my.toFixed(1);
    }
    var lastP = pts[pts.length - 1];
    d += ' T' + (lastP[0] + 40).toFixed(1) + ',' + lastP[1].toFixed(1);
    return d;
  }

  function buildBackdrop(seed, theme) {
    var w = 1200, h = 640;
    var rng = mulberry32(seed);
    var moonX = 240 + rng() * 720;
    var moonY = 96 + rng() * 40;
    var moonR = 44;
    var hills = '';
    var layers = [
      { y: h * 0.66, amp: 150, step: 210, fill: theme.ridge[0], op: 0.62, blur: 3.2 },
      { y: h * 0.74, amp: 120, step: 170, fill: theme.ridge[1], op: 0.78, blur: 2.0 },
      { y: h * 0.82, amp: 92, step: 140, fill: theme.ridge[2], op: 0.92, blur: 1.0 },
      { y: h * 0.90, amp: 58, step: 110, fill: theme.ridge[3], op: 0.96, blur: 0 }
    ];
    layers.forEach(function (L, i) {
      var d = smoothRidge(w, L.y, L.amp, L.step, mulberry32(seed + i * 131));
      hills += '<path d="' + d + ' L' + (w + 80) + ',' + h + ' L-80,' + h + ' Z" fill="' + L.fill + '" opacity="' + L.op + '"' +
        (L.blur ? ' filter="url(#blur' + i + ')"' : '') + '/>';
      hills += '<rect x="-80" y="' + (L.y - 14).toFixed(0) + '" width="' + (w + 160) + '" height="86" fill="url(#mist)" opacity="' + (0.5 - i * 0.09) + '"/>';
    });

    var pines = '';
    for (var i = 0; i < 3; i++) {
      var px = i === 0 ? 70 + rng() * 120 : (w - 90 - rng() * 180);
      var py = h * (0.90 + rng() * 0.03);
      var sc = 0.8 + rng() * 0.5;
      pines += '<g transform="translate(' + px.toFixed(0) + ',' + py.toFixed(0) + ') scale(' + sc.toFixed(2) + ')" opacity=".95">' +
        '<path d="M0,0 L0,-70" stroke="#050807" stroke-width="3.4"/>' +
        '<path d="M0,-40 L-19,-8 L19,-8 Z" fill="#050807"/>' +
        '<path d="M0,-56 L-15,-24 L15,-24 Z" fill="#050807"/>' +
        '<path d="M0,-72 L-10,-46 L10,-46 Z" fill="#050807"/>' +
        '</g>';
    }

    return '' +
      '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid slice" class="land-svg" data-mx="' + (moonX / w).toFixed(2) + '">' +
      '<defs>' +
      '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' + theme.sky[0] + '"/>' +
      '<stop offset="52%" stop-color="' + theme.sky[1] + '"/>' +
      '<stop offset="100%" stop-color="' + theme.sky[2] + '"/>' +
      '</linearGradient>' +
      '<radialGradient id="halo">' +
      '<stop offset="0%" stop-color="' + theme.moon + '" stop-opacity=".30"/>' +
      '<stop offset="34%" stop-color="' + theme.moon + '" stop-opacity=".10"/>' +
      '<stop offset="100%" stop-color="' + theme.moon + '" stop-opacity="0"/>' +
      '</radialGradient>' +
      '<radialGradient id="moonGlow">' +
      '<stop offset="60%" stop-color="' + theme.moon + '" stop-opacity=".22"/>' +
      '<stop offset="100%" stop-color="' + theme.moon + '" stop-opacity="0"/>' +
      '</radialGradient>' +
      '<linearGradient id="mist" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' + theme.moon + '" stop-opacity="0"/>' +
      '<stop offset="55%" stop-color="' + theme.moon + '" stop-opacity=".09"/>' +
      '<stop offset="100%" stop-color="' + theme.moon + '" stop-opacity="0"/>' +
      '</linearGradient>' +
      '<linearGradient id="band" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' + theme.moon + '" stop-opacity="0"/>' +
      '<stop offset="50%" stop-color="' + theme.moon + '" stop-opacity=".17"/>' +
      '<stop offset="100%" stop-color="' + theme.moon + '" stop-opacity="0"/>' +
      '</linearGradient>' +
      '<linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' + theme.ridge[3] + '"/>' +
      '<stop offset="100%" stop-color="#040706"/>' +
      '</linearGradient>' +
      '<radialGradient id="pool">' +
      '<stop offset="0%" stop-color="' + theme.moon + '" stop-opacity=".16"/>' +
      '<stop offset="100%" stop-color="' + theme.moon + '" stop-opacity="0"/>' +
      '</radialGradient>' +
      '<filter id="blur0" x="-10%" y="-20%" width="120%" height="140%"><feGaussianBlur stdDeviation="3.4"/></filter>' +
      '<filter id="blur1" x="-10%" y="-20%" width="120%" height="140%"><feGaussianBlur stdDeviation="2.1"/></filter>' +
      '<filter id="blur2" x="-10%" y="-20%" width="120%" height="140%"><feGaussianBlur stdDeviation="1"/></filter>' +
      '<filter id="soft" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="14"/></filter>' +
      '</defs>' +
      '<rect width="' + w + '" height="' + h + '" fill="url(#sky)"/>' +
      '<circle cx="' + moonX.toFixed(0) + '" cy="' + moonY.toFixed(0) + '" r="' + (moonR * 7) + '" fill="url(#halo)"/>' +
      '<circle cx="' + moonX.toFixed(0) + '" cy="' + moonY.toFixed(0) + '" r="' + (moonR * 2.6) + '" fill="url(#moonGlow)"/>' +
      '<circle cx="' + moonX.toFixed(0) + '" cy="' + moonY.toFixed(0) + '" r="' + moonR + '" fill="' + theme.moon + '" opacity=".93"/>' +
      '<circle cx="' + (moonX - 12).toFixed(0) + '" cy="' + (moonY - 8).toFixed(0) + '" r="9" fill="#000" opacity=".045"/>' +
      '<circle cx="' + (moonX + 15).toFixed(0) + '" cy="' + (moonY + 12).toFixed(0) + '" r="6" fill="#000" opacity=".05"/>' +
      '<g filter="url(#soft)" opacity=".5">' +
      '<ellipse cx="' + (moonX - 120).toFixed(0) + '" cy="' + (moonY + 26).toFixed(0) + '" rx="300" ry="16" fill="' + theme.moon + '" opacity=".10"/>' +
      '<ellipse cx="' + (moonX + 200).toFixed(0) + '" cy="' + (moonY - 18).toFixed(0) + '" rx="240" ry="11" fill="' + theme.moon + '" opacity=".07"/>' +
      '</g>' +
      '<rect x="-80" y="' + (h * 0.40).toFixed(0) + '" width="' + (w + 160) + '" height="' + (h * 0.44).toFixed(0) + '" fill="url(#band)"/>' +
      hills +
      '<path d="M-80,' + (h * 0.905).toFixed(0) + ' C' + (w * 0.3).toFixed(0) + ',' + (h * 0.885).toFixed(0) + ' ' +
      (w * 0.7).toFixed(0) + ',' + (h * 0.895).toFixed(0) + ' ' + (w + 80) + ',' + (h * 0.875).toFixed(0) +
      ' L' + (w + 80) + ',' + h + ' L-80,' + h + ' Z" fill="url(#ground)"/>' +
      '<ellipse cx="' + (w * 0.47).toFixed(0) + '" cy="' + (h * 0.925).toFixed(0) + '" rx="' + (w * 0.34).toFixed(0) + '" ry="52" fill="url(#pool)"/>' +
      pines +
      '</svg>';
  }

  /* =============================================================
     二、挂载
     ============================================================= */
  function mount() {
    stage = document.getElementById('stage');
    if (!stage) return false;
    inner = document.getElementById('stage-inner');
    landEl = document.getElementById('stage-land');
    fightersEl = document.getElementById('stage-fighters');
    canvas = document.getElementById('fx-canvas');
    capEl = document.getElementById('skill-banner');
    stampEl = document.getElementById('stage-stamp');
    floatEl = document.getElementById('stage-float');
    ctx = canvas.getContext('2d');
    if (FX.loadTextures) {
      var tex = {};
      ['metal', 'fire', 'ice', 'thunder', 'ghost', 'wood', 'shield'].forEach(function (k) {
        if (SPR['fx_' + k]) tex[k] = SPR['fx_' + k];
      });
      FX.loadTextures(tex);
    }
    resize();
    if (stage.dataset.mounted !== '1') {
      stage.dataset.mounted = '1';
      window.addEventListener('resize', function () { resize(); measureAll(); });
    }
    running = true;
    if (!stage.dataset.loop) {
      stage.dataset.loop = '1';
      requestAnimationFrame(loop);
    }
    return true;
  }

  function resize() {
    if (!canvas || !stage) return;
    var r = stage.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    DPR = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function loop(ts) {
    if (!running) return;
    requestAnimationFrame(loop);
    if (!stage || !stage.offsetParent || !ctx) return;
    var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016;
    last = ts;
    var frozen = performance.now() < freezeUntil;
    if (!frozen) {
      for (var uid in figs) tickFighter(figs[uid], dt);
      tickTrails();
      FX.step(dt);
    }
    var sh = FX.shakeOffset();
    if (inner) inner.style.transform = (sh[0] || sh[1]) ? 'translate(' + sh[0].toFixed(1) + 'px,' + sh[1].toFixed(1) + 'px)' : '';
    ctx.clearRect(0, 0, W, H);
    drawTrails();
    FX.draw(ctx);
  }

  /* =============================================================
     三、人物
     ============================================================= */
  var SPOSE = {
    idle:   { x: 0, y: 0, rot: 0, alpha: 1 },
    windup: { x: -18, y: -4, rot: -5, alpha: 1 },
    strike: { x: 48, y: 2, rot: 7, alpha: 1 },
    guard:  { x: -8, y: 0, rot: -3, alpha: 1 },
    cast:   { x: -10, y: -12, rot: -4, alpha: 1 },
    hurt:   { x: -20, y: 6, rot: -9, alpha: 1 },
    dead:   { x: -14, y: 30, rot: 66, alpha: 0.45 },
    /* 兵刃相交用 */
    brace:  { x: 22, y: 0, rot: 4, alpha: 1 },     // 迎上去
    clashAtk: { x: 86, y: 0, rot: 7, alpha: 1 },   // 冲到刀剑相接的距离
    clashDef: { x: 62, y: 0, rot: 6, alpha: 1 },
    knock:  { x: -62, y: 8, rot: -11, alpha: 1 },  // 被震退
    give:   { x: -30, y: 3, rot: -6, alpha: 1 }    // 反震半步
  };

  function hashStr(s) {
    var h = 2166136261;
    s = String(s == null ? 'x' : s);
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function spriteFor(u) {
    if (u.uid === 'p') return SPR.player || SPR.human;
    var fac = u.faction || 'human';
    if (fac === 'beast') return SPR.beast || SPR.human;
    if (fac === 'demon') return SPR.demon || SPR.human;
    if (fac === 'ghost') return SPR.ghost || SPR.human;
    /* 正道：剑修 / 老者按名字轮换 */
    if (SPR.elder && hashStr(u.name) % 3 === 0) return SPR.elder;
    return SPR.human || SPR.player;
  }

  /* 贴图里人物只占画布的一部分（头顶留白），按 head 锚点换算高度，让所有人物的“人”一样高 */
  function hsFor(spr) {
    var hy = (spr && spr.head && typeof spr.head[1] === 'number') ? spr.head[1] : 0.04;
    return 1 / Math.max(0.6, 1 - hy);
  }

  function fighterHTML(u) {
    var spr = spriteFor(u);
    var uid = u.uid;
    var ar = spr ? (spr.w / spr.h) : 0.72;
    var tag = uid === 'p' ? '你' : (u.realm >= 0 ? (g.W && g.W.REALM_NAMES ? g.W.REALM_NAMES[u.realm] : '') : '凡人');
    return '' +
      '<div class="fighter ' + (uid === 'p' ? 'me' : 'foe') + '" data-uid="' + uid + '" data-fac="' + (u.faction || 'human') + '" style="--ar:' + ar.toFixed(3) + ';--hs:' + hsFor(spr).toFixed(3) + '">' +
      '<div class="f-ground"></div>' +
      '<div class="f-aura"></div>' +
      '<div class="f-move"><img class="f-img" alt="" draggable="false" src="' + (spr ? spr.src : '') + '"></div>' +
      '<div class="f-plate"><span class="f-nm">' + esc(u.name) + '</span><span class="f-sub">' + esc(tag) + '</span></div>' +
      '</div>';
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function setup(initList) {
    if (!mount()) return;
    units = {}; figs = {};
    FX.clear();
    resize();

    var me = null, foes = [];
    initList.forEach(function (u) {
      units[u.uid] = u;
      if (u.side === 'player') me = u; else foes.push(u);
    });

    var fac = foes.length ? (foes[0].faction || 'human') : 'human';
    var theme = THEME[fac] || THEME.human;
    var seed = (Date.now() & 0xffff) ^ (foes.length * 131) ^ (me ? me.name.length * 17 : 0);
    if (landEl) landEl.innerHTML = buildBackdrop(seed, theme);
    stage.setAttribute('data-fac', fac);
    var n = Math.min(foes.length, 3);
    stage.setAttribute('data-foes', String(n));

    var html = '';
    if (me) html += fighterHTML(me);
    foes.slice(0, 3).forEach(function (f) { html += fighterHTML(f); });
    fightersEl.innerHTML = html;

    var slot = [[74], [69, 89], [63, 81, 96]][n - 1] || [74];
    fightersEl.querySelectorAll('.fighter.foe').forEach(function (el, i) {
      el.style.left = slot[i] + '%';
      el.style.zIndex = String(10 - i);
    });
    var meEl = fightersEl.querySelector('.fighter.me');
    if (meEl) meEl.style.left = '24%';

    /* 建立 fig 记录 */
    fightersEl.querySelectorAll('.fighter').forEach(function (el) {
      var uid = el.getAttribute('data-uid');
      var u = units[uid];
      if (!u) return;
      var spr = spriteFor(u);
      figs[uid] = {
        uid: uid, u: u, el: el, move: el.querySelector('.f-move'),
        img: el.querySelector('.f-img'), spr: spr,
        dir: uid === 'p' ? 1 : -1,
        pose: Object.assign({}, SPOSE.idle), from: Object.assign({}, SPOSE.idle), to: Object.assign({}, SPOSE.idle),
        pt: 1, dur: 0.2, queue: null, breath: Math.random() * 6,
        tf: { x: 0, y: 0, rot: 0 }, box: null
      };
    });

    measureAll();

    if (capEl) { capEl.className = 'stage-cap'; capEl.textContent = ''; }
    if (stampEl) { stampEl.className = 'stage-stamp'; stampEl.textContent = ''; }
    if (floatEl) floatEl.innerHTML = '';
  }

  function measureAll() {
    if (!canvas) return;
    var c = canvas.getBoundingClientRect();
    for (var uid in figs) {
      var el = figs[uid].el;
      var r = el.getBoundingClientRect();
      figs[uid].box = { left: r.left - c.left, top: r.top - c.top, w: r.width, h: r.height };
    }
  }

  /* ---------- 刚体动画 ---------- */
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  function setPose(f, name, dur, backIdle) {
    f.from = Object.assign({}, f.pose);
    f.to = Object.assign({}, SPOSE[name] || SPOSE.idle);
    f.pt = 0;
    f.dur = Math.max(0.04, dur || 0.25);
    f.queue = (backIdle === false || name === 'idle') ? null : 'idle';
  }

  function tickFighter(f, dt) {
    if (f.pt < 1) {
      f.pt = Math.min(1, f.pt + dt / f.dur);
      var k = easeInOut(f.pt);
      for (var key in f.to) {
        var a = f.from[key] == null ? 0 : f.from[key];
        var b = f.to[key] == null ? 0 : f.to[key];
        f.pose[key] = a + (b - a) * k;
      }
      if (f.pt >= 1 && f.queue) {
        var q = f.queue; f.queue = null;
        setPose(f, q, 0.36, false);
      }
    }
    f.breath += dt;
    applySprite(f);
  }

  function applySprite(f) {
    var p = f.pose;
    var idle = (p.rot === 0 && p.x === 0) ? 1 : 0.25;
    var bob = Math.sin(f.breath * 1.7) * 1.8 * idle;
    var x = p.x * f.dir;
    var rot = p.rot * f.dir;
    f.tf.x = x;
    f.tf.y = p.y + bob;
    f.tf.rot = rot;
    if (f.move) {
      f.move.style.transform = 'translate(' + x.toFixed(2) + 'px,' + (p.y + bob).toFixed(2) + 'px) rotate(' + rot.toFixed(2) + 'deg)';
      f.move.style.opacity = p.alpha == null ? 1 : p.alpha;
    }
  }

  /* ---------- 锚点 ---------- */
  function spritePoint(uid, key) {
    var f = figs[uid];
    if (!f || !f.box) return null;
    var s = f.spr || { head: [0.5, 0.1], tip: [0.8, 0.2], foot: [0.5, 1], hand: [0.6, 0.45] };
    var n = s[key] || s.head;
    var b = f.box;
    var nx = f.dir < 0 ? (1 - n[0]) : n[0];
    var nx2 = nx * b.w - b.w / 2;
    var ny2 = n[1] * b.h - b.h;
    var a = (f.tf.rot || 0) * Math.PI / 180;
    var rx = nx2 * Math.cos(a) - ny2 * Math.sin(a);
    var ry = nx2 * Math.sin(a) + ny2 * Math.cos(a);
    return { x: b.left + b.w / 2 + rx + (f.tf.x || 0), y: b.top + b.h + ry + (f.tf.y || 0) };
  }

  function anchorOf(uid) {
    var f = figs[uid];
    if (!f || !f.box) return null;
    var c = spritePoint(uid, 'head');
    var ft = spritePoint(uid, 'foot');
    var body = { x: f.box.left + f.box.w / 2 + (f.tf.x || 0), y: f.box.top + f.box.h * 0.58 + (f.tf.y || 0) };
    body.foot = ft ? ft.y : body.y + 80;
    return body;
  }
  function headOf(uid) { return spritePoint(uid, 'head'); }
  function handOf(uid) { return spritePoint(uid, 'hand'); }

  /* ---------- 剑轨 ---------- */
  function tickTrails() {
    for (var uid in figs) {
      var f = figs[uid];
      if (!f.striking) { continue; }
      var p = spritePoint(uid, 'tip');
      if (!p) continue;
      if (!f.trail) f.trail = [];
      var lx = f.trail[f.trail.length - 1];
      if (lx && Math.hypot(p.x - lx.x, p.y - lx.y) > 70) f.trail.length = 0;
      f.trail.push({ x: p.x, y: p.y, t: performance.now() });
    }
  }

  function drawTrails() {
    var now = performance.now();
    for (var uid in figs) {
      var f = figs[uid];
      var tr = f.trail;
      if (!tr || tr.length < 2) continue;
      while (tr.length && now - tr[0].t > 150) tr.shift();
      if (tr.length < 2) continue;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (var i = 1; i < tr.length; i++) {
        var a = tr[i - 1], b = tr[i];
        var k = i / tr.length;
        var age = 1 - Math.min(1, (now - b.t) / 150);
        ctx.strokeStyle = 'rgba(235,242,236,' + (0.45 * k * age).toFixed(3) + ')';
        ctx.lineWidth = 1 + 11 * k * age;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  /* =============================================================
     四、动作
     ============================================================= */
  var MELEE = { melee: 1, slash: 1, palm: 1 };

  /* 顿挫：这段时间里世界停住，画面不动 */
  var freezeUntil = 0;
  function freeze(sec) { freezeUntil = performance.now() + sec * 1000; }

  /* -------------------------------------------------------------
     兵刃相交
     蓄势 → 双方上步 → 双剑撞在一起（白闪 / 冲击波 / 碎屑 / 顿挫）
     → 反震（攻方半步、守方连退，脚下扬尘）→ 稳住身形
     ------------------------------------------------------------- */
  function clashBeat(attacker, defender, el) {
    var fa = figs[attacker], fd = figs[defender];
    if (!fa || !fd) return false;
    var ua = units[attacker], ud = units[defender];
    /* 兽类不使兵器，鬼物穿身而过，都不走这套 */
    if (!ua || !ud) return false;
    if (ua.faction === 'beast' || ud.faction === 'beast') return false;
    if (ua.faction === 'ghost' || ud.faction === 'ghost') return false;

    faceTo(attacker, anchorOf(defender));
    faceTo(defender, anchorOf(attacker));

    setPose(fa, 'windup', 0.20, false);
    setPose(fd, 'idle', 0.10, false);

    /* 上步（双方都朝对方冲半步） */
    setTimeout(function () {
      if (figs[attacker] !== fa || figs[defender] !== fd) return;
      setPose(fa, 'clashAtk', 0.15, false);
      setPose(fd, 'clashDef', 0.15, false);
    }, 190);

    /* 撞击 */
    setTimeout(function () {
      if (figs[attacker] !== fa || figs[defender] !== fd) return;
      var ta = spritePoint(attacker, 'tip'), td = spritePoint(defender, 'tip');
      var pa = anchorOf(attacker), pd = anchorOf(defender);
      if (pa && pd) {
        var mx = (ta && td) ? (ta.x + td.x) / 2 : (pa.x + pd.x) / 2;
        var my = (ta && td) ? (ta.y + td.y) / 2 + 18 : Math.min(pa.y, pd.y) - 6;
        FX.clash(mx, my);
        FX.dustBurst(pa.foot, 6);
        FX.dustBurst(pd.foot, 6);
      }
      freeze(0.10);          // 抽帧顿挫
    }, 320);

    /* 反震 */
    setTimeout(function () {
      if (figs[attacker] !== fa || figs[defender] !== fd) return;
      setPose(fa, 'give', 0.16, false);
      setPose(fd, 'knock', 0.20, false);
      var pa = anchorOf(attacker), pd = anchorOf(defender);
      if (pa) FX.dustBurst(pa.foot, 5);
      if (pd) FX.dustBurst(pd.foot, 8);
    }, 460);

    /* 稳住 */
    setTimeout(function () {
      if (figs[attacker] === fa) setPose(fa, 'idle', 0.42);
      if (figs[defender] === fd) setPose(fd, 'idle', 0.46);
    }, 780);

    return true;
  }

  function faceTo(uid, to) {
    var f = figs[uid];
    if (!f || !to) return;
    var a = anchorOf(uid);
    if (!a) return;
    f.dir = to.x >= a.x ? 1 : -1;
  }

  function cast(ev) {
    var u = units[ev.uid];
    if (!u) return;
    var from = handOf(ev.uid) || anchorOf(ev.uid);
    var tgt = (ev.targets || []).map(function (id) { return anchorOf(id); }).filter(Boolean);
    if (!from || !tgt.length) return;
    var self = ev.targets && ev.targets.length === 1 && ev.targets[0] === ev.uid;

    var f = figs[ev.uid];
    var tUid = ev.targets && ev.targets[0];
    var spec = FX.SPEC[ev.id] || {};
    var isMelee = MELEE[spec.sh] || !spec.sh;
    var clashed = false;

    /* 只有真·贴身近战才走兵刃相交；剑气、掌法另走一套 */
    var canClash = spec.sh === 'melee' || !spec.sh;
    if (canClash && tUid && tUid !== ev.uid) clashed = clashBeat(ev.uid, tUid, ev.el);

    if (f && !clashed) {
      if (!self) faceTo(ev.uid, tgt[0]);
      from = handOf(ev.uid) || from;
      if (isMelee) {
        setPose(f, 'windup', 0.22, false);
        setTimeout(function () { if (figs[ev.uid] === f) setPose(f, 'strike', 0.16, false); }, 200);
        setTimeout(function () { f.striking = true; }, 220);
        setTimeout(function () { f.striking = false; }, 540);
        setTimeout(function () { if (figs[ev.uid] === f) setPose(f, 'idle', 0.42); }, 620);
      } else {
        setPose(f, 'cast', 0.3);
        setTimeout(function () { if (figs[ev.uid] === f) setPose(f, 'idle', 0.4); }, 640);
      }
    } else if (f && clashed) {
      /* 撞击时剑轨也记一段 */
      setTimeout(function () { f.striking = true; }, 200);
      setTimeout(function () { f.striking = false; }, 520);
    }

    FX.play({
      id: ev.id, name: ev.spell, el: ev.el,
      from: from, targets: tgt, gy: tgt[0].foot, noTex: clashed,
      scale: Math.min(1.25, 0.85 + (u.realm || 0) * 0.09)
    });
    caption(ev.spell, ev.el, ev.uid === 'p');
  }

  function hit(uid, dmg, crit, el) {
    var f = figs[uid];
    if (f) setPose(f, 'hurt', 0.12);
    var a = headOf(uid) || anchorOf(uid);
    if (a) {
      floatNum(a.x, a.y, (dmg > 0 ? '-' : '') + Math.abs(dmg || 0), crit ? 'crit' : '', el);
      if (dmg > 0) FX.impact(a.x, a.y + 40, el || 'phys', crit ? 1.5 : 1);
    }
  }

  function heal(uid, amt) {
    var a = headOf(uid) || anchorOf(uid);
    if (a) floatNum(a.x, a.y, '+' + amt, 'heal', 'wood');
  }

  function miss(uid, text) {
    var a = headOf(uid) || anchorOf(uid);
    if (a) floatNum(a.x, a.y + 14, text || '闪避', 'miss', 'wind');
  }

  function death(uid) {
    var f = figs[uid];
    if (f) setPose(f, 'dead', 0.8, false);
    var a = anchorOf(uid);
    if (a) FX.impact(a.x, a.y + 40, 'phys', 0.8);
  }

  function caption(text, el, mine) {
    if (!capEl) return;
    var c = (FX.pal(el) || ['#e8d3a0'])[1];
    capEl.textContent = text;
    capEl.style.setProperty('--cap-c', mine ? c : '#e8b0a0');
    capEl.className = 'stage-cap';
    void capEl.offsetWidth;
    capEl.className = 'stage-cap show' + (mine ? ' mine' : '');
    clearTimeout(capTimer);
    capTimer = setTimeout(function () { capEl.className = 'stage-cap'; }, 1200);
  }

  function floatNum(x, y, text, cls, el) {
    if (!floatEl) return;
    var d = document.createElement('span');
    d.className = 'fnum ' + (cls || '');
    d.textContent = text;
    if (el) d.style.setProperty('--fc', (FX.pal(el) || ['#fff'])[1]);
    d.style.left = x + 'px';
    d.style.top = y + 'px';
    floatEl.appendChild(d);
    setTimeout(function () { d.remove(); }, 1100);
  }

  function stamp(win) {
    if (!stampEl) return;
    stampEl.textContent = win ? '胜' : '败';
    stampEl.className = 'stage-stamp show ' + (win ? 'win' : 'lose');
  }
  function clearStamp() {
    if (stampEl) { stampEl.className = 'stage-stamp'; stampEl.textContent = ''; }
  }
  function reset() {
    FX.clear();
    clearStamp();
    if (capEl) capEl.className = 'stage-cap';
    if (floatEl) floatEl.innerHTML = '';
  }

  g.BattleScene = {
    mount: mount, setup: setup, reset: reset,
    cast: cast, hit: hit, heal: heal, miss: miss, death: death,
    stamp: stamp, caption: caption, floatNum: floatNum,
    anchorOf: anchorOf, headOf: headOf, handOf: handOf, resize: resize,
    measure: measureAll,
    get size() { return { w: W, h: H }; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
