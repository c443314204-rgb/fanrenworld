/* =============================================================
   人物绑定 · 国风剪影
   -------------------------------------------------------------
   静止姿势就是「正面偏侧 45° 的战斗站姿」：右臂屈肘持剑，
   左臂垂袖。所有动作只是在关节上做旋转，没有缩放，
   所以四肢长度恒定、轮廓不会变形。
   坐标：viewBox 0 0 200 390，脚底约 y=378。
   ============================================================= */
(function (g) {
  'use strict';

  /* ---------------- 骨架：静止 = 战斗站姿 ---------------- */
  var J = {
    pelvis: [100, 206],
    spineMid: [100, 160],
    neck: [100, 120],
    head: [100, 84],
    shL: [78, 126], shR: [120, 126],     // 肩
    elL: [58, 172], elR: [146, 172],     // 肘
    wrL: [52, 216], wrR: [166, 140],     // 腕（右手抬在胸前）
    hipL: [92, 208], hipR: [108, 208],
    knL: [90, 292], knR: [110, 292],
    ftL: [88, 372], ftR: [112, 372]
  };

  /* ---------------- 姿势表 ----------------
     全部是「相对静止姿势」的旋转量，正 = 顺时针。          */
  var POSE = {
    idle:   { spine: -2, head: 3, shR: 0, elR: 0, wrR: -74, shL: 0, elL: 0, step: 0, crouch: 0, skirt: 0, breath: 1 },
    windup: { spine: -13, head: -8, shR: -34, elR: -20, wrR: -108, shL: 10, elL: 14, step: -12, crouch: 3, skirt: -6, breath: 0 },
    strike: { spine: 12, head: 10, shR: 20, elR: 22, wrR: -28, shL: -14, elL: 20, step: 20, crouch: 6, skirt: 10, breath: 0 },
    guard:  { spine: -7, head: 2, shR: -14, elR: 30, wrR: -86, shL: 12, elL: 26, step: -4, crouch: 3, skirt: -3, breath: 0 },
    cast:   { spine: -9, head: -8, shR: -50, elR: -12, wrR: -58, shL: -30, elL: 12, step: -4, crouch: 1, skirt: -4, breath: 0 },
    hurt:   { spine: -19, head: -16, shR: -22, elR: 14, wrR: -60, shL: 22, elL: 24, step: -15, crouch: 4, skirt: -9, breath: 0 },
    dead:   { spine: -36, head: -28, shR: -14, elR: 26, wrR: -30, shL: 30, elL: 16, step: -12, crouch: 18, skirt: -16, breath: 0 }
  };

  /* ---------------- 配色 ---------------- */
  var FAMILY = {
    player: [{ ink: '#0e1512', rim: '#8fa694', accent: '#6d826f' }],
    human: [
      { ink: '#131313', rim: '#8f8a7c', accent: '#6f695c' },
      { ink: '#101216', rim: '#828da0', accent: '#616b7c' },
      { ink: '#121416', rim: '#7d929a', accent: '#5e6f76' }
    ],
    demon: [
      { ink: '#110b0c', rim: '#9b4a39', accent: '#6e3327' },
      { ink: '#0f0a11', rim: '#7a559c', accent: '#543a6e' }
    ],
    ghost: [
      { ink: '#151222', rim: '#7a6f9c', accent: '#564c74' },
      { ink: '#101820', rim: '#63899a', accent: '#45606b' }
    ],
    beast: [
      { ink: '#161310', rim: '#a8853f', accent: '#7a6029' },
      { ink: '#131116', rim: '#7a7086', accent: '#575060' }
    ]
  };

  function hash(s) {
    var h = 2166136261;
    s = String(s == null ? 'x' : s);
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function lookOf(u) {
    var fam = u.uid === 'p' ? 'player' : (u.faction || 'human');
    var list = FAMILY[fam] || FAMILY.human;
    var L = Object.assign({}, list[hash(u.name) % list.length]);
    if ((u.realm || 0) >= 2 && fam === 'player') L.rim = '#b4b18f';
    return L;
  }

  function rot(x, y, deg, cx, cy) {
    var a = deg * Math.PI / 180, s = Math.sin(a), c = Math.cos(a);
    var dx = x - cx, dy = y - cy;
    return [cx + dx * c - dy * s, cy + dx * s + dy * c];
  }

  /* 一根骨头：从 a 到 b，两端半宽 w1/w2 的锥形 */
  function bone(a, b, w1, w2) {
    var dx = b[0] - a[0], dy = b[1] - a[1];
    var len = Math.hypot(dx, dy) || 1;
    var nx = -dy / len, ny = dx / len;
    return 'M' + (a[0] + nx * w1).toFixed(1) + ',' + (a[1] + ny * w1).toFixed(1) +
      ' L' + (b[0] + nx * w2).toFixed(1) + ',' + (b[1] + ny * w2).toFixed(1) +
      ' L' + (b[0] - nx * w2).toFixed(1) + ',' + (b[1] - ny * w2).toFixed(1) +
      ' L' + (a[0] - nx * w1).toFixed(1) + ',' + (a[1] - ny * w1).toFixed(1) + ' Z';
  }
  function circle(c, r) {
    return 'M' + (c[0] - r) + ',' + c[1] + ' a' + r + ',' + r + ' 0 1,0 ' + (r * 2) + ',0 a' + r + ',' + r + ' 0 1,0 ' + (-r * 2) + ',0 Z';
  }

  /* ---------------- 零件 ---------------- */
  function partPaths(u) {
    var ghost = u.faction === 'ghost';
    var demon = u.faction === 'demon';
    var beast = u.faction === 'beast';
    var p = {};

    /* 头：颅 + 下颌 + 髻 + 簪 + 短须 */
    p.head =
      '<path d="M94,111 L106,111 L106,126 L94,126 Z"/>' +
      '<path d="M100,54 C87,54 81,68 81,84 C81,100 89,112 100,112 C111,112 119,100 119,84 C119,68 113,54 100,54 Z"/>' +
      '<path d="M90,98 C93,108 96,112 100,112 C104,112 107,108 110,98 Z"/>' +
      '<path d="M94,104 C96,114 100,119 104,104 Z" opacity=".85"/>' +
      '<path d="M100,42 C94,42 91,48 95,53 C98,56 102,56 105,53 C109,48 106,42 100,42 Z"/>' +
      '' +
      '<path d="M82,78 C80,90 82,100 87,110 L91,106 C86,98 84,88 85,78 Z"/>';
    if (demon) p.head += '<path d="M86,66 L76,42 L92,58 Z"/><path d="M114,66 L124,42 L108,58 Z"/>';
    if (beast) p.head += '<path d="M87,60 L80,38 L94,54 Z"/><path d="M113,60 L120,38 L106,54 Z"/>';

    /* 后发 */
    p.hairBack = ghost
      ? '<path d="M86,84 C80,104 82,124 88,138 L96,132 C91,118 90,98 93,86 Z"/>' +
        '<path d="M114,84 C120,104 118,124 112,138 L104,132 C109,118 110,98 107,86 Z"/>'
      : '<path d="M88,80 C83,100 85,118 90,130 L97,124 C93,112 92,94 94,82 Z"/>';

    /* 上身：斜襟道袍，肩宽腰收 */
    p.torso =
      '<path d="M100,112 C86,112 74,118 70,132 C66,148 68,172 72,192 C74,200 78,204 82,206 L118,206 C122,204 126,200 128,192 C132,172 134,148 130,132 C126,118 114,112 100,112 Z"/>' +
      '<path d="M70,132 C63,137 61,148 65,156 C69,148 73,139 79,134 Z"/>' +
      '<path d="M130,132 C137,137 139,148 135,156 C131,148 127,139 121,134 Z"/>' +
      '<path d="M100,113 L91,132 L100,145 L109,132 Z" opacity="1"/>' +
      '<path d="M92,132 C87,156 85,180 85,204" fill="none" stroke-width="1.7" stroke="currentColor" opacity=".18"/>' +
      '<path d="M72,190 L128,190 L129,204 L71,204 Z" opacity=".95"/>' +
      '<path d="M95,190 L105,190 L105,206 L95,206 Z" opacity=".5"/>' +
      '<path d="M97,204 C93,218 90,232 88,246" fill="none" stroke-width="3.2" stroke="currentColor" opacity=".18"/>';
    if (demon) {
      p.torso += '<path d="M70,134 L54,126 L63,150 Z"/><path d="M130,134 L146,126 L137,150 Z"/>';
    }

    /* 前后裙摆 */
    p.skirtBack =
      '<path d="M84,196 C74,240 66,300 60,348 C80,356 102,357 124,350 C116,300 108,240 106,196 Z"/>';
    p.skirtFront =
      '<path d="M78,198 C70,246 62,304 56,348 C78,357 102,358 126,350 C118,304 110,246 122,198 Z"/>' +
      '<path d="M99,204 L96,352" fill="none" stroke-width="1.8" stroke="currentColor" opacity=".16"/>' +
      '<path d="M86,206 C82,254 78,306 74,344" fill="none" stroke-width="1.3" stroke="currentColor" opacity=".12"/>' +
      '<path d="M113,206 C117,254 121,306 125,344" fill="none" stroke-width="1.3" stroke="currentColor" opacity=".12"/>' +
      (ghost
        ? '<path d="M56,346 L64,332 L72,350 L80,334 L88,352 L96,336 L104,352 L112,334 L120,350 L127,336" fill="none" stroke-width="3" stroke="currentColor" opacity=".85"/>'
        : '<path d="M56,348 C64,356 70,350 78,358 C86,350 94,359 102,352 C110,359 118,350 126,354" fill="none" stroke-width="2.2" stroke="currentColor" opacity=".18"/>');

    /* 左臂：上臂 + 垂袖 */
    p.armL =
      '<path d="' + bone(J.shL, J.elL, 11, 9) + '"/>' +
      '<path d="M80,130 C66,144 56,172 52,204 C50,220 52,234 58,242 C64,248 72,244 73,236 C69,222 67,204 71,186 C75,168 82,150 90,140 Z"/>' +
      '<path d="M52,240 C46,256 50,270 58,274 C66,276 73,268 72,260 C70,250 64,246 73,236 Z"/>';

    /* 右臂：上臂 / 前臂 / 垂袖 / 手 */
    p.armR =
      '<path d="' + bone(J.shR, J.elR, 11, 9) + '"/>';
    p.foreR =
      '<path d="' + bone(J.elR, J.wrR, 9, 7) + '"/>' +
      '<path d="M146,176 C158,190 162,214 158,236 C154,250 142,252 136,242 C140,224 140,196 146,176 Z"/>';
    p.handR = '<path d="' + circle(J.wrR, 8) + '"/>';

    /* 鞋尖 */
    p.feet =
      '<path d="M84,348 C80,360 76,370 78,377 C86,380 96,379 102,375 C100,366 96,356 94,346 Z"/>' +
      '<path d="M116,348 C120,360 124,370 122,377 C114,380 104,379 98,375 C100,366 104,356 106,346 Z"/>';

    return p;
  }

  function fillOf(pathStr, fill) {
    return pathStr.replace(/<path (?![^>]*\bfill=)/g, '<path fill="' + fill + '" ');
  }

  /* 剑：以腕点为原点，+X 为剑尖 */
  function swordSVG() {
    return '<g transform="translate(' + J.wrR[0] + ',' + J.wrR[1] + ')">' +
      '<path d="M-13,-3 L3,-3 L3,3 L-13,3 Z"/>' +
      '<path d="M3,-9 L10,-9 L10,9 L3,9 Z"/>' +
      '<path d="M10,-3.4 L104,-1.8 L122,0 L104,1.8 L10,3.4 Z"/>' +
      '</g>';
  }

  function create(u) {
    var L = lookOf(u);
    var P = partPaths(u);

    function layer(fill) {
      return '<g class="l-armL">' + fillOf(P.armL, fill) + '</g>' +
        fillOf(P.hairBack, fill) +
        '<g class="l-skirtBack">' + fillOf(P.skirtBack, fill) + '</g>' +
        '<g class="l-torso">' +
          fillOf(P.torso, fill) +
          '<g class="l-head">' + fillOf(P.head, fill) + '</g>' +
          '<g class="l-armR">' +
            fillOf(P.armR, fill) +
            '<g class="l-foreR">' +
              fillOf(P.foreR, fill) +
              '<g class="l-handR">' +
                fillOf(P.handR, fill) +
                '<g class="l-sword">' + swordSVG().replace(/<path /g, '<path fill="' + fill + '" ') + '</g>' +
              '</g>' +
            '</g>' +
          '</g>' +
          '<g class="l-skirtFront">' + fillOf(P.skirtFront, fill) + '</g>' +
        '</g>' +
        fillOf(P.feet, fill);
    }

    var svg =
      '<svg viewBox="0 0 200 390" class="rig-svg" preserveAspectRatio="xMidYMax meet">' +
      '<g class="f-root">' +
        '<g class="rig-ink" color="' + L.accent + '">' + layer(L.ink) + '</g>' +
      '</g>' +
      '</svg>';

    return {
      uid: u.uid, svg: svg, look: L,
      el: null,
      pose: Object.assign({}, POSE.idle),
      from: Object.assign({}, POSE.idle),
      to: Object.assign({}, POSE.idle),
      pt: 1, dur: 0.2, queue: null,
      breath: Math.random() * 6, bob: 0, dir: 1,
      tipRest: [0, 0], handRest: [0, 0], headRest: [0, 0]
    };
  }

  function setPose(fig, name, dur, backToIdle) {
    var target = POSE[name] || POSE.idle;
    fig.from = Object.assign({}, fig.pose);
    fig.to = Object.assign({}, target);
    fig.pt = 0;
    fig.dur = Math.max(0.04, dur || 0.25);
    fig.queue = (backToIdle === false || name === 'idle') ? null : 'idle';
  }

  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  function tick(fig, dt) {
    if (fig.pt < 1) {
      fig.pt = Math.min(1, fig.pt + dt / fig.dur);
      var k = easeInOut(fig.pt);
      for (var key in fig.to) {
        var a = fig.from[key] == null ? 0 : fig.from[key];
        var b = fig.to[key] == null ? 0 : fig.to[key];
        fig.pose[key] = a + (b - a) * k;
      }
      if (fig.pt >= 1 && fig.queue) {
        var q = fig.queue; fig.queue = null;
        setPose(fig, q, 0.36, false);
      }
    }
    fig.breath += dt;
    apply(fig);
  }

  function apply(fig) {
    var el = fig.el;
    if (!el) return;
    var p = fig.pose;
    var idleAmp = p.breath || 0;
    var breath = Math.sin(fig.breath * 1.7) * 1.2 * idleAmp;
    fig.bob = Math.sin(fig.breath * 1.7) * 1.6 * idleAmp;

    var spine = p.spine;
    var head = p.head + breath * 0.45;
    var step = p.step * fig.dir;
    var crouch = p.crouch || 0;
    var skirt = (p.skirt || 0) * fig.dir;

    function setAll(cls, t) {
      var ns = el.querySelectorAll('.' + cls);
      for (var i = 0; i < ns.length; i++) ns[i].setAttribute('transform', t);
    }
    setAll('l-torso', 'rotate(' + spine.toFixed(2) + ' ' + J.pelvis[0] + ' ' + J.pelvis[1] + ')');
    setAll('l-head', 'rotate(' + head.toFixed(2) + ' ' + J.neck[0] + ' ' + J.neck[1] + ')');
    setAll('l-armR', 'rotate(' + p.shR.toFixed(2) + ' ' + J.shR[0] + ' ' + J.shR[1] + ')');
    setAll('l-foreR', 'rotate(' + p.elR.toFixed(2) + ' ' + J.elR[0] + ' ' + J.elR[1] + ')');
    setAll('l-handR', 'rotate(' + p.wrR.toFixed(2) + ' ' + J.wrR[0] + ' ' + J.wrR[1] + ')');
    setAll('l-armL', 'rotate(' + p.shL.toFixed(2) + ' ' + J.shL[0] + ' ' + J.shL[1] + ')');
    setAll('l-skirtBack', 'rotate(' + (skirt * 0.7).toFixed(2) + ' ' + J.pelvis[0] + ' ' + J.pelvis[1] + ')');
    setAll('l-skirtFront', 'rotate(' + (skirt * 0.45).toFixed(2) + ' ' + J.pelvis[0] + ' ' + J.pelvis[1] + ')');

    var root = el.querySelector('.f-root');
    if (root) root.setAttribute('transform', 'translate(' + step.toFixed(2) + ',' + (fig.bob + crouch * 0.6).toFixed(2) + ')');

    /* 关键点 */
    var tip = [J.wrR[0] + 122, J.wrR[1]];
    tip = rot(tip[0], tip[1], p.wrR, J.wrR[0], J.wrR[1]);
    tip = rot(tip[0], tip[1], p.elR, J.elR[0], J.elR[1]);
    tip = rot(tip[0], tip[1], p.shR, J.shR[0], J.shR[1]);
    tip = rot(tip[0], tip[1], spine, J.pelvis[0], J.pelvis[1]);
    var hand = rot(J.wrR[0], J.wrR[1], p.wrR, J.wrR[0], J.wrR[1]);
    hand = rot(hand[0], hand[1], p.elR, J.elR[0], J.elR[1]);
    hand = rot(hand[0], hand[1], p.shR, J.shR[0], J.shR[1]);
    hand = rot(hand[0], hand[1], spine, J.pelvis[0], J.pelvis[1]);
    var hd = rot(J.head[0], J.head[1], head, J.neck[0], J.neck[1]);
    hd = rot(hd[0], hd[1], spine, J.pelvis[0], J.pelvis[1]);

    var oy = fig.bob + crouch * 0.6;
    fig.tipRest = [tip[0] + step, tip[1] + oy];
    fig.handRest = [hand[0] + step, hand[1] + oy];
    fig.headRest = [hd[0] + step, hd[1] + oy];
  }

  g.Rig = {
    J: J, POSE: POSE, create: create, setPose: setPose, tick: tick, apply: apply,
    lookOf: lookOf, hash: hash, rot: rot, bone: bone
  };
})(typeof window !== 'undefined' ? window : globalThis);
