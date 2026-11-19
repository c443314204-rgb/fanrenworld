/* =============================================================
   界面：地图 / 地点 / NPC / 事件 / 人物功法 / 战斗回放
   ============================================================= */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var D = W.D;
  var EL = window.EL || {};
  var S = null;

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function pickN(a, n) {
    var c = a.slice(), o = [];
    while (c.length && o.length < n) o.push(c.splice(Math.floor(Math.random() * c.length), 1)[0]);
    return o;
  }
  function weighted(list, key) {
    var t = 0, i;
    for (i = 0; i < list.length; i++) t += (list[i][key] || 1);
    var r = Math.random() * t;
    for (i = 0; i < list.length; i++) { r -= (list[i][key] || 1); if (r <= 0) return list[i]; }
    return list[list.length - 1];
  }
  function pct(v) { var n = Math.round(v * 100); return (n > 0 ? '+' : '') + n + '%'; }
  function elColor(el) { return (EL[el] && EL[el].color) || '#b3ad9e'; }
  function elName(el) { return (EL[el] && EL[el].name) || el; }
  function grade(t) { return window.GRADES[window.gradeOf(t)]; }
  function money(n) { return n >= 10000 ? (n / 10000).toFixed(1) + '万' : String(n); }

  var toastTimer = null;
  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 1800);
  }
  function modal(title, html) {
    $('modal-title').textContent = title;
    $('modal-body').innerHTML = html;
    $('modal').hidden = false;
  }
  function closeModal() { $('modal').hidden = true; }

  var SCREENS = ['title', 'roll', 'map', 'build', 'battle', 'end'];
  function show(name) {
    SCREENS.forEach(function (k) { $('screen-' + k).hidden = (k !== name); });
  }

  /* =============================================================
     开局
     ============================================================= */
  var roll = { root: null, identity: null, traits: [], rerolls: 3 };
  var mode = 'normal';

  $('mode-row').addEventListener('click', function (e) {
    var b = e.target.closest('[data-mode]');
    if (!b) return;
    mode = b.getAttribute('data-mode');
    document.querySelectorAll('.mode-btn').forEach(function (x) { x.classList.toggle('on', x === b); });
  });

  function startTechs(ident) {
    if (ident.techs) return ident.techs.slice();
    var pool = Object.keys(window.TECHS).filter(function (id) { return window.TECHS[id].realm === 0; });
    var dm = pool.filter(function (id) {
      return window.TECHS[id].spells.some(function (s) {
        return (window.SPELLS[s].effects || []).some(function (e) { return e.k === 'dmg'; });
      });
    });
    return pickN(dm, 3).concat(pickN(pool.filter(function (id) { return dm.indexOf(id) < 0; }), 3));
  }

  function rollAll() {
    roll.root = weighted(window.ROOTS, 'weight');
    roll.identity = pick(window.IDENTITIES);
    roll.traits = [pick(window.TRAITS.good), pick(window.TRAITS.bad)];
  }

  function renderRoll() {
    $('roll-root-name').textContent = roll.root.name;
    $('roll-root-desc').textContent = roll.root.desc;
    $('roll-root-els').textContent = roll.root.els.map(function (e) { return elName(e) + '灵根'; }).join(' · ');
    $('roll-ident-name').textContent = roll.identity.name;
    $('roll-ident-desc').textContent = roll.identity.desc;
    $('roll-ident-tag').textContent = roll.identity.tag;
    var good = roll.traits[0], bad = roll.traits[1];
    $('roll-trait-name').textContent = good ? good.name : '—';
    $('roll-trait-desc').textContent = good ? good.desc : '';
    $('roll-trait-extra').textContent = bad ? ('另有 ' + bad.name + '：' + bad.desc) : '';
    $('roll-trait-extra').style.color = 'var(--red)';
    $('trait-chips').innerHTML = roll.traits.map(function (t, i) {
      return '<span class="trait-chip ' + (i === 0 ? 'good' : 'bad') + '">' +
        (i === 0 ? '＋' : '－') + esc(t.name) + '　' + esc(t.desc) + '</span>';
    }).join('');
    $('btn-reroll').textContent = roll.rerolls > 0 ? '重 卜（' + roll.rerolls + '）' : '重 卜（200 灵石）';
    $('btn-reroll').disabled = roll.rerolls <= 0;
  }

  $('btn-start').onclick = function () {
    if (S) { if (!confirm('放弃当前这一世，重新卜卦？')) return; try { W.clear(); } catch (e) {} }
    roll.rerolls = 3;
    rollAll();
    show('roll');
    renderRoll();
  };

  $('btn-reroll').onclick = function () {
    if (roll.rerolls <= 0) { toast('天命只可三卜'); return; }
    roll.rerolls--;
    rollAll();
    renderRoll();
  };

  $('btn-enter').onclick = function () {
    var name = $('input-name').value.trim() || '无名散修';
    S = W.newGame({
      mode: mode, name: name, root: roll.root, identity: roll.identity,
      traits: roll.traits, learned: startTechs(roll.identity)
    });
    W.save();
    show('map');
    renderAll();
    toast('你踏入了天南。');
  };

  $('btn-resume').onclick = function () {
    show('map');
    renderAll();
  };

  /* =============================================================
     顶栏
     ============================================================= */
  function renderHud() {
    var st = W.stats();
    var info = W.stepInfo(S.step);
    var life = W.lifespan();
    var cultNeed = W.needFor(S.step);
    var canBreak = S.cult >= cultNeed;
    $('hud').innerHTML =
      '<div class="hud-id">' +
      '<div class="hud-name">' + esc(S.name) + '</div>' +
      '<div class="hud-realm">' + W.stepName(S.step) + (W.bottleneck() ? ' · <span style="color:var(--red)">瓶颈</span>' : '') + '</div>' +
      '</div>' +
      (S.step < 0
        ? '<div class="hud-bar"><div class="bl"><span>修为</span><span>尚未引气入体</span></div><div class="bar"><i class="cult" style="width:0%"></i></div></div>'
        : '<div class="hud-bar">' +
          '<div class="bl"><span>修为</span><span>' + Math.floor(S.cult) + ' / ' + cultNeed + (canBreak ? ' · 可突破' : '') + '</span></div>' +
          '<div class="bar"><i class="cult" style="width:' + Math.min(100, S.cult / cultNeed * 100) + '%"></i></div>' +
          '</div>') +
      '<div class="hud-bar">' +
      '<div class="bl"><span>气血</span><span>' + Math.round(S.hp) + ' / ' + st.hpMax + '</span></div>' +
      '<div class="bar"><i class="hp" style="width:' + Math.min(100, S.hp / st.hpMax * 100) + '%"></i></div>' +
      '</div>' +
      '<div class="hud-stats">' +
      '<div class="hud-stat">寿元<b>' + Math.floor(W.age()) + ' / ' + life + '</b></div>' +
      '<div class="hud-stat">灵石<b class="gold">' + money(S.stones) + '</b></div>' +
      '<div class="hud-stat">名声<b>' + Math.round(S.fame) + '</b></div>' +
      '<div class="hud-stat">凶名<b class="' + (S.notoriety > 40 ? 'warn' : '') + '">' + Math.round(S.notoriety) + '</b></div>' +
      '</div>' +
      '<div class="hud-actions">' +
      '<button class="mini-btn" id="hud-char">人物</button>' +
      '<button class="mini-btn" id="hud-bag">储物袋</button>' +
      '<button class="mini-btn" id="hud-quest">任务</button>' +
        '<button class="mini-btn" id="hud-world">江湖</button>' +
        '<button class="mini-btn" id="hud-help">玩法</button>' +
      '</div>';
    $('hud-char').onclick = enterBuild;
    $('hud-bag').onclick = openBag;
    $('hud-world').onclick = openWorld;
    $('hud-quest').onclick = openQuests;
    $('hud-help').onclick = showHelp;
  }

  /* =============================================================
     地图
     ============================================================= */
  var selected = null;
  var mapRegion = null;

  function regionOf(locId) {
    var l = W.LOC_MAP[locId];
    return (l && l.region) || 'tiannan';
  }

  function renderRegionBar(reg) {
    var bar = $('region-bar');
    if (!bar) return;
    var regs = D.REGIONS || [{ id: 'tiannan', name: '天南' }];
    bar.innerHTML = regs.map(function (r) {
      var here = S.loc && regionOf(S.loc) === r.id;
      return '<button class="rg-btn' + (r.id === reg ? ' on' : '') + (here ? ' here' : '') +
        '" data-reg="' + r.id + '">' + esc(r.name) + (here ? '<i>·人在此</i>' : '') + '</button>';
    }).join('');
    bar.querySelectorAll('[data-reg]').forEach(function (b) {
      b.onclick = function () {
        mapRegion = b.getAttribute('data-reg');
        renderMap();
      };
    });
  }

  function renderMap() {
    var cur = S.loc;
    selected = selected || cur;
    if (!mapRegion) mapRegion = regionOf(cur);
    renderRegionBar(mapRegion);
    var card = $('map-card');
    if (card) card.className = 'map-card r-' + mapRegion;
    var svg = $('map-svg');
    if (svg) svg.style.opacity = mapRegion === 'tiannan' ? '' : '0';
    $('map-nodes').innerHTML = D.LOCATIONS.filter(function (l) {
      return (l.region || 'tiannan') === mapRegion;
    }).map(function (l) {
      var ctrl = W.controlOf ? W.controlOf(l.id) : 'none';
      var cls = 'node ctrl-' + ctrl + (l.id === cur ? ' cur' : '') + (l.id === selected ? ' sel' : '');
      return '<button class="' + cls + '" style="left:' + l.x + '%;top:' + l.y + '%" data-loc="' + l.id + '">' +
        '<i class="dot t' + l.tier + '"></i>' +
        '<span class="nm">' + esc(l.name) + '</span>' +
        '<span class="rec">' + W.REALM_NAMES[l.realmRec].replace('期', '') + '</span>' +
        '</button>';
    }).join('');
    var rn = $('map-region-name');
    if (rn) {
      var r = (D.REGIONS || []).filter(function (x) { return x.id === mapRegion; })[0];
      rn.textContent = r ? r.name : '';
      var rs = $('map-region-sub');
      if (rs) rs.textContent = r ? (r.sub + ' · ' + r.note) : '';
    }
  }

  /* ---------------- 江湖面板 ---------------- */
  function openWorld() {
    var ws = W.worldState();
    var sideName = ws.side === 'zheng' ? '正道' : ws.side === 'mo' ? '魔道' : '散修';
    var tone = function (t) { return t === 'bad' ? 'red' : t === 'good' ? 'jade' : 'gold'; };

    var html = '<div class="wd-head">' +
      '<div class="wd-year">第 ' + (ws.year + 1) + ' 年</div>' +
      '<div class="wd-side">你的立场：<b>' + sideName + '</b></div>' +
      '</div>';

    /* 正魔张力 */
    html += '<div class="wd-tension"><span>正魔张力</span>' +
      '<i style="width:' + ws.tension + '%"></i>' +
      '<em>' + ws.tension + '</em></div>';

    /* 大事 */
    html += '<div class="sec-title">江 湖 大 事<span>' + (ws.events.length ? ws.events.length + ' 件' : '风平浪静') + '</span></div>';
    if (ws.events.length) {
      html += '<div class="wd-events">' + ws.events.map(function (e) {
        return '<div class="wd-ev ' + e.tone + '">' +
          '<div class="wd-ev-h"><b>' + esc(e.name) + '</b><span>还剩 ' + e.turns + ' 年</span></div>' +
          '<div class="wd-ev-t">' + esc(e.text) + '</div></div>';
      }).join('') + '</div>';
    } else {
      html += '<div class="wd-none">这几年没什么大事，江湖安静得有点假。</div>';
    }

    /* 势力版图 */
    html += '<div class="sec-title">势 力 版 图<span>每年都在动</span></div><div class="wd-map">';
    ['zheng', 'mo', 'none'].forEach(function (f) {
      var list = D.LOCATIONS.filter(function (l) { return ws.control[l.id] === f; });
      html += '<div class="wd-row"><span class="wd-tag ' + f + '">' + W.FACTION[f].name + '</span>' +
        '<div class="wd-locs">' + (list.length ? list.map(function (l) {
          var here = l.id === ws.here.loc ? ' here' : '';
          return '<span class="wd-loc' + here + '">' + esc(l.name) + '</span>';
        }).join('') : '<i class="wd-empty">无</i>') + '</div></div>';
    });
    html += '</div>';

    /* 影响 */
    var m = ws.mods;
    var eff = [];
    if (Math.abs(m.cult - 1) > 0.02) eff.push('修炼 ' + (m.cult > 1 ? '+' : '') + Math.round((m.cult - 1) * 100) + '%');
    if (Math.abs(m.danger - 1) > 0.02) eff.push('凶险 ' + (m.danger > 1 ? '+' : '') + Math.round((m.danger - 1) * 100) + '%');
    if (Math.abs(m.price - 1) > 0.02) eff.push('物价 ' + (m.price > 1 ? '+' : '') + Math.round((m.price - 1) * 100) + '%');
    if (Math.abs(m.loot - 1) > 0.02) eff.push('掉落 ' + (m.loot > 1 ? '+' : '') + Math.round((m.loot - 1) * 100) + '%');
    if (eff.length) html += '<div class="wd-eff">眼下：' + eff.join(' · ') + '</div>';

    /* 纪事 */
    html += '<div class="sec-title">近 年 纪 事</div><div class="wd-news">' +
      (ws.news.length ? ws.news.map(function (n) {
        return '<div class="wd-n ' + (n.cls || '') + '"><span>' + (n.y + 1) + '</span>' + esc(n.text) + '</div>';
      }).join('') : '<div class="wd-none">还没有什么可记的。</div>') + '</div>';

    modal('江 湖', html);
  }

  function renderPanel() {
    var loc = W.LOC_MAP[selected];
    var here = selected === S.loc;
    var tierName = ['安全区', '低危区', '中危区', '高危区'][loc.tier];
    var dist = travelDays(loc.id);
    var html = '<div class="loc-kicker">' + (here ? '所 在' : '目 标') + '</div>' +
      '<div class="loc-name">' + esc(loc.name) + '</div>' +
      '<div class="loc-tags">' +
      '<span class="tag ' + (loc.tier === 0 ? 'jade' : loc.tier === 3 ? 'red' : 'gold') + '">' + tierName + '</span>' +
      '<span class="tag">' + esc(loc.kind) + '</span>' +
      '<span class="tag">推荐 ' + W.REALM_NAMES[loc.realmRec] + '</span>' +
      '</div>' +
      '<div class="loc-desc">' + esc(loc.desc) + '</div>' +
      (W.locLore ? '<div class="loc-lore">' + esc(W.locLore(loc.id)).replace(/\n/g, '<br>') + '</div>' : '');

    if (!here) {
      var xr = loc.region && W.LOC_MAP[S.loc].region && loc.region !== W.LOC_MAP[S.loc].region;
      html += '<div class="act-grid"><button class="act-btn primary" id="btn-travel"' +
        (xr ? ' disabled' : '') + '>赶 路' +
        '<small>' + (xr ? '隔着万里，走不过去' : dist + ' 天 · 路上可能遇事') + '</small></button>';
      if (W.canTeleport(loc.id)) {
        html += '<button class="act-btn" id="btn-tele">传送阵' +
          '<small>' + W.teleportCost(loc.id) + ' 灵石 · 3 天</small></button>';
      }
      html += '</div>';
    } else {
      html += '<div class="sec-title">行 动<span>' + loc.features.join(' · ') + '</span></div>' +
        '<div class="act-grid">' + actionButtons(loc) + '</div>' +
        '<div class="sec-title">此 处 的 人<span>' + W.npcsAt(loc.id).length + ' 人</span></div>' +
        '<div id="npc-list">' + npcRows(loc.id) + '</div>';
    }
    $('loc-panel').innerHTML = html;

    if (!here) {
      $('btn-travel').onclick = function () { travelTo(loc.id); };
      if ($('btn-tele')) $('btn-tele').onclick = function () { travelTo(loc.id, true); };
    } else {
      bindActions();
      bindNpcRows();
    }
  }

  function travelDays(id) { return W.travelDays(id); }

  function actionButtons(loc) {
    var f = loc.features;
    var canBreak = W.canBreak();
    var out = '';
    if (S.step >= 0) {
      out += '<button class="act-btn' + (canBreak ? ' primary' : '') + '" data-act="break">突 破<small>' +
        (canBreak ? '修为已够，可以一试' : '还差 ' + Math.max(0, W.needFor(S.step) - Math.floor(S.cult)) + ' 修为') + '</small></button>';
    }
    out += '<button class="act-btn" data-act="meditate">修 炼<small>选年数闭关，可能遇事</small></button>';
    if (f.indexOf('inn') >= 0) out += '<button class="act-btn" data-act="rest">客 栈<small>3 天 · 15 灵石 · 回气血</small></button>';
    if (f.indexOf('market') >= 0) out += '<button class="act-btn" data-act="shop">坊 市<small>买卖丹药</small></button>';
    if (f.indexOf('market') >= 0) out += '<button class="act-btn" data-act="alchemy">炼 丹<small>灵草 → 丹药</small></button>';
    if (f.indexOf('market') >= 0) out += '<button class="act-btn" data-act="forge">炼 器<small>矿石 → 法宝</small></button>';
    if (f.indexOf('auction') >= 0) out += '<button class="act-btn" data-act="auction">拍 卖 会<small>灵石换稀有功法</small></button>';
    var mj = W.mijingAt(loc.id);
    if (mj) out += '<button class="act-btn primary" data-act="mijing">' + esc(mj.name) +
      '<small>今年开启 · 还可进 ' + W.mijingLeft(mj) + ' 次 · 上限 ' + W.stepName(mj.cap) + '</small></button>';
    if (f.indexOf('herb') >= 0) out += '<button class="act-btn" data-act="herb">采 药<small>7 天 · 灵草</small></button>';
    if (f.indexOf('mine') >= 0) out += '<button class="act-btn" data-act="mine">挖 矿<small>7 天 · 矿石</small></button>';
    if (f.indexOf('ruin') >= 0) out += '<button class="act-btn danger" data-act="explore">探 索<small>10 天 · 有危险</small></button>';
    if (f.indexOf('sect') >= 0) out += '<button class="act-btn" data-act="sect">宗 门<small>求见长老</small></button>';
    if (f.indexOf('baibao') >= 0) out += '<button class="act-btn" data-act="baige">百 宝 阁<small>飞行法器 · 法宝 · 丹药</small></button>';
    if (loc.tier <= 1) {
      var bd = (CAVE ? CAVE.boardAt(loc.id) : []) || [];
      var left = bd.filter(function (b) { return !b.done; }).length;
      out += '<button class="act-btn" data-act="bounty">悬 赏 榜<small>' + (left ? left + ' 桩还挂着' : '今年的都让人揭走了') + '</small></button>';
    }
    if (CAVE) {
      if (S.cave && S.cave.loc === loc.id) {
        out += '<button class="act-btn primary" data-act="cave">洞 府<small>' + esc(CAVE.caveTier().name) + ' · 灵田 · 丹房 · 木人桩</small></button>';
      } else if (!S.cave && CAVE.canBuildHere(loc.id)) {
        out += '<button class="act-btn" data-act="cave">辟 洞 府<small>' + CAVE.buildCost() + ' 灵石起 · 可种灵田</small></button>';
      }
    }
    var sp = W.specialAt(loc.id);
    if (sp) out += '<button class="act-btn primary" data-act="special">' + esc(sp.title) + '<small>此地独有 · 只此一次</small></button>';
    var enc = W.encounterAt(loc.id);
    if (enc) out += '<button class="act-btn primary" data-act="enc">奇 遇<small>' + esc(enc.title) + ' · 今年只此一次</small></button>';
    return out;
  }

  function bindActions() {
    $('loc-panel').querySelectorAll('[data-act]').forEach(function (b) {
      b.onclick = function () { doAction(b.getAttribute('data-act'), b); };
    });
  }

  function npcRows(locId) {
    var all = S.npcs[locId] || [];
    if (!all.length) return '<div class="lib-empty">此地无人。</div>';
    return all.map(function (n) {
      var p = D.PERSONALITIES[n.personality];
      return '<div class="npc-row' + (n.alive ? '' : ' dead') + '" data-npc="' + n.id + '">' +
        '<div class="npc-main">' +
        '<div class="npc-name">' + esc(n.name) +
        '<span class="tag ' + (n.realm >= 2 ? 'red' : n.realm >= 1 ? 'gold' : '') + '">' +
        (n.mortal ? '凡人' : W.stepName(n.step)) + '</span>' +
        '</div>' +
        '<div class="npc-meta">' + p.name + ' · ' + (n.techs.length ? n.techs.length + ' 门功法' : '无功法') + '</div>' +
        '</div>' +
        '<div class="npc-rel">' + Math.round(n.relation) + '<div class="rel-bar"><i style="width:' +
        Math.min(100, Math.max(0, n.relation)) + '%"></i></div></div>' +
        '</div>';
    }).join('');
  }

  function bindNpcRows() {
    $('loc-panel').querySelectorAll('[data-npc]').forEach(function (row) {
      row.onclick = function () { openNpc(row.getAttribute('data-npc')); };
    });
  }

  $('map-nodes').addEventListener('click', function (e) {
    var b = e.target.closest('[data-loc]');
    if (!b) return;
    selected = b.getAttribute('data-loc');
    renderMap(); renderPanel();
  });

  /* =============================================================
     行动
     ============================================================= */
  function afterAction(res) {
    if (S.dead) { showEnd(); return; }
    W.save();
    renderAll();
    if (res && res.text) toast(res.text.split('\n')[0].slice(0, 30));
    var mail = W.takeMail();
    if (mail) { showMail(mail); return; }
    var h = W.checkHunter();
    if (h) {
      var u = W.banditUnit(0, h.name);
      u = W.npcUnit({ name: h.name, step: h.step, techs: ['qingyuan2'], faction: 'human', hpMul: 1.1 });
      startBattle([u], '寻 仇', h.text);
    }
  }

  function doAction(act, btn) {
    if (act === 'meditate') {
      openMeditate();
    } else if (act === 'rest') {
      var r3 = W.rest();
      if (!r3.ok) { toast(r3.text); return; }
      afterAction(r3);
      logToast(r3.text);
    } else if (act === 'break') {
      tryBreak();
    } else if (act === 'shop') {
      openShop();
    } else if (act === 'alchemy') {
      openAlchemy();
    } else if (act === 'forge') {
      openForge();
    } else if (act === 'auction') {
      openAuction();
    } else if (act === 'mijing') {
      var mj2 = W.mijingAt(S.loc);
      if (!mj2) { toast('秘境已经关了。'); return; }
      if (W.mijingLeft && W.mijingLeft(mj2) <= 0) { toast('这次开启的入口已经塌了。'); return; }
      W.startRun(S.loc, mj2);
      W.save();
      openRun();
      if (false) {
        var r = null;
      } else {
        modal(mj2.name, '<div class="ev-out">' + esc(r.text).replace(/\n/g, '<br>') + '</div>' +
          '<div class="ev-opts"><button class="ev-opt" id="mj-ok">继续</button></div>');
        $('mj-ok').onclick = closeModal;
      }
    } else if (act === 'herb') {
      gather('herb');
    } else if (act === 'mine') {
      gather('ore');
    } else if (act === 'explore') {
      explore();
    } else if (act === 'baige') {
      openBaige();
    } else if (act === 'bounty') {
      openBounty();
    } else if (act === 'cave') {
      openCave();
    } else if (act === 'sect') {
      var sp = W.specialAt(S.loc);
      var hereSect = W.sectAt(S.loc);
      if (S.sect) {
        if (hereSect && hereSect.id !== S.sect.id) {
          toast('这是' + hereSect.name + '的山门。你是' + W.sectDef().name + '的人，守门弟子拦住了你。');
        } else openSect();
      } else if (sp) runSpecial(sp);
      else toast('山门紧闭，没人理你。');
    } else if (act === 'special') {
      var sp2 = W.specialAt(S.loc);
      if (sp2) runSpecial(sp2);
    } else if (act === 'enc') {
      var enc = W.takeEncounter(S.loc);
      if (enc) showEvent(enc);
    }
  }

  function runSpecial(sp) {
    var out = null;
    var html = '<div class="ev-text">' + esc(sp.text).replace(/\n/g, '<br>') + '</div><div class="ev-opts">' +
      sp.options.map(function (o, i) {
        return '<button class="ev-opt" data-sp="' + i + '">' + esc(o.text) + '</button>';
      }).join('') + '</div>';
    modal(sp.title, html);
    $('modal-body').querySelectorAll('[data-sp]').forEach(function (b) {
      b.onclick = function () {
        var o = sp.options[parseInt(b.getAttribute('data-sp'), 10)];
        out = o.run(S, W.W);
        W.markSpecial(S.loc);
        W.applyFx(out.fx);
        if (W.ensureQiEntry) W.ensureQiEntry();
        if (out.battle) {
          closeModal();
          var list = [];
          for (var i = 0; i < (out.battle.count || 1); i++) {
            list.push(out.battle.kind === 'beast' ? W.beastUnit(out.battle.realm || 0) : W.banditUnit(out.battle.realm || 0));
          }
          startBattle(list, '遭 遇', out.text.slice(0, 30));
          return;
        }
        modal(sp.title, '<div class="ev-out">' + esc(out.text).replace(/\n/g, '<br>') + '</div>' +
          '<div class="ev-opts"><button class="ev-opt" id="sp-done">继续</button></div>');
        $('sp-done').onclick = function () {
          closeModal();
          if (S.dead) { showEnd(); return; }
          W.save(); renderAll();
        };
      };
    });
  }

  var cult = { strat: 'steady', log: [], years: 0, gain: 0 };

  function openMeditate() {
    if (W.ensureQiEntry) W.ensureQiEntry();
    if (S.step < 0) {
      modal('修 炼', '<div class="ev-text">你还没引气入体，枯坐只是白坐。<br><br>' +
        '<b>' + esc((D.START_HINT && D.START_HINT[S.loc]) || '这地方自有它的机缘。') + '</b></div>' +
        '<div class="ev-opts"><button class="ev-opt" id="md-ok">知道了</button></div>');
      $('md-ok').onclick = closeModal;
      return;
    }
    cult = { strat: 'steady', log: [], years: 0, gain: 0 };
    renderMeditate();
  }

  function renderMeditate() {
    var bn = W.bottleneck();
    var st = W.STRAT[cult.strat];
    var cost = Math.round(W.meditateCost(1) * st.cost);
    var poor = S.stones < cost;
    var need = W.needFor(S.step);
    var pct = Math.max(0, Math.min(100, S.cult / need * 100));

    var html = '<div class="cult-top">' +
      '<div class="cult-bar"><i style="width:' + pct.toFixed(1) + '%"></i>' +
      '<span>修为 ' + Math.floor(S.cult) + ' / ' + need + '</span></div>' +
      '<div class="cult-stats">' +
      '<span>灵石 <b class="' + (poor ? 'warn' : '') + '">' + S.stones + '</b></span>' +
      '<span>道心 <b class="' + ((S.dao || 60) < 30 ? 'warn' : '') + '">' + Math.round(S.dao || 60) + '</b></span>' +
      '<span>寿元 <b>' + Math.floor(W.age()) + ' / ' + W.lifespan() + '</b></span>' +
      '<span>灵气 <b>×' + W.qiOf(S.loc).toFixed(2) + '</b></span>' +
      '</div></div>';

    if (bn) html += '<div class="cult-warn">你已在瓶颈上，再坐也涨不动了，得先突破。</div>';

    html += '<div class="cult-strats">' + Object.keys(W.STRAT).map(function (k) {
      var s = W.STRAT[k];
      return '<button class="cult-strat' + (k === cult.strat ? ' on' : '') + '" data-strat="' + k + '">' +
        '<b>' + s.name + '</b><small>' + s.desc + '</small>' +
        '<em>修为 ×' + s.gain.toFixed(2) + ' · 耗灵石 ×' + s.cost.toFixed(2) + '<br>道心 −' + s.dao + ' /年</em>' +
        '</button>';
    }).join('') + '</div>';

    html += '<div class="cult-act">' +
      '<button class="btn btn-primary" id="cult-year"' + (poor ? ' disabled style="opacity:.45"' : '') + '>' +
      (poor ? '灵石不够' : '闭 关 一 年') + '</button>' +
      '<button class="btn" id="cult-out">收 功 出 关</button>' +
      '</div>';

    if (cult.years) {
      html += '<div class="cult-sum">已闭关 <b>' + cult.years + '</b> 年，累计修为 <b>+' + cult.gain + '</b></div>';
    }

    if (cult.log.length) {
      html += '<div class="cult-log">' + cult.log.slice(0, 6).map(function (t, i) {
        return '<div class="cl' + (i === 0 ? ' now' : '') + '">' + esc(t) + '</div>';
      }).join('') + '</div>';
    }

    modal('闭 关', html);
    var body = $('modal-body');
    body.querySelectorAll('[data-strat]').forEach(function (b) {
      b.onclick = function () { cult.strat = b.getAttribute('data-strat'); renderMeditate(); };
    });
    if ($('cult-year')) $('cult-year').onclick = doCultYear;
    $('cult-out').onclick = function () {
      closeModal();
      W.save(); renderAll();
    };
  }

  function doCultYear() {
    var r = W.meditateYear(cult.strat);
    if (!r.ok) { toast(r.text); return; }
    cult.years++;
    cult.gain += r.gain || 0;
    var line = '第 ' + cult.years + ' 年：修为 +' + r.gain + '，耗灵石 ' + r.cost +
      (r.poor ? '（灵石不够，只坐出四成效力）' : '');
    cult.log.unshift(line);
    if (r.lines && r.lines.length) cult.log.unshift(r.lines[0]);
    W.save();
    renderAll();
    renderMeditate();
  }

  function doMeditate(years) {
    var r = W.meditateFast(years);
    if (!r.ok) { toast(r.text); return; }
    closeModal();
    W.save(); renderAll();
    var html = '<div class="ev-out">' + esc(r.text).replace(/\n/g, '<br>') + '</div>';
    html += '<div class="ev-opts"><button class="ev-opt" id="md-go">继续</button></div>';
    modal('闭 关', html);
    $('md-go').onclick = function () { closeModal(); afterAction({}); };
  }

  function rootMulText() {
    var m = { tian: 2.0, shuang: 1.45, san: 1.0, si: 0.55, wu: 0.35, lei: 1.7, bing: 1.7, an: 1.6 };
    var v = m[S.root.id] || 1;
    return v >= 1 ? v.toFixed(2) + '（快）' : v.toFixed(2) + '（慢，建议靠丹药）';
  }

  function doMeditate(years) {
    var r = W.meditate(years);
    if (!r.ok) { toast(r.text); return; }
    closeModal();
    W.save(); renderAll();
    var html = '<div class="ev-out">' + esc(r.text).replace(/\n/g, '<br>') + '</div>';
    html += '<div class="ev-opts"><button class="ev-opt" id="md-go">继续</button></div>';
    modal('闭 关', html);
    $('md-go').onclick = function () {
      closeModal();
      if (r.event) showEvent(r.event);
      else afterAction({});
    };
  }

  function logToast(text) {
    modal('', '<div class="ev-out">' + esc(text) + '</div>');
  }

  function tryBreak() {
    if (!W.canBreak()) { toast('修为还不够。'); return; }
    var hasPill = W.itemCount('break') > 0;
    var last = W.isLastLayer(S.step);
    var chance = Math.round(W.breakChance(false) * 100);
    var chancePill = Math.round(W.breakChance(true) * 100);
    var gate = W.gateFor ? W.gateFor(S.step) : null;
    var gateLine = '';
    if (gate) {
      gateLine = gate.have > 0
        ? '<div class="gate ok">你身上有一枚 <b>' + esc(gate.name) + '</b>。破境时会用掉。</div>'
        : '<div class="gate bad">破 <b>' + W.REALM_NAMES[Math.min(4, W.stepInfo(S.step).realm + 1)] +
          '</b> 要一枚 <b>' + esc(gate.name) + '</b>，你没有。<br>' +
          '<span>空手硬冲只有 <b>' + chance + '%</b> 的生机。这东西只在秘境守关处、拍卖会上才有。</span></div>';
    }
    modal('突 破', '<div class="ev-text">你要在此冲击 <b>' + W.stepName(S.step + 1) + '</b>。<br>' +
      '修为：' + Math.floor(S.cult) + ' / ' + W.needFor(S.step) +
      (last ? '<br>关隘成功率：<b>' + chance + '%</b>（战斗历练 +' + Math.round((S.battleBonus || 0) * 100) + '%）' +
        '<br><span style="color:var(--red)">失败会掉四成修为。</span>' : '') +
      '</div>' + gateLine +
      '<div class="ev-opts">' +
      '<button class="ev-opt" id="brk-now">' + (gate && !gate.have ? '空手硬冲' : '直接冲关') +
      '<small>' + (gate && !gate.have ? '九死一生' : '不借助丹药') + '</small></button>' +
      (hasPill ? '<button class="ev-opt" id="brk-pill">服破境丹（剩 ' + W.itemCount('break') + ' 枚）<small>成功率 ' + chancePill + '%</small></button>' : '') +
      '<button class="ev-opt" id="brk-cancel">再等等</button></div>');
    $('brk-now').onclick = function () { doBreak(false); };
    if (hasPill) $('brk-pill').onclick = function () { doBreak(true); };
    $('brk-cancel').onclick = closeModal;
  }

  function doBreak(usePill) {
    var res = W.breakThrough(usePill);
    closeModal();
    if (S.dead) { showEnd(); return; }
    W.save();
    renderAll();
    if (res.ok) {
      modal('破 境', '<div class="ev-out" style="color:var(--jade)">' + esc(res.text) + '</div>' +
        '<div class="ev-opts"><button class="ev-opt" id="brk-ok">继续</button></div>');
      $('brk-ok').onclick = closeModal;
    } else {
      modal('关 隘', '<div class="ev-out" style="color:#c98b7c">' + esc(res.text) + '</div>' +
        '<div class="ev-opts"><button class="ev-opt" id="brk-no">退回去</button></div>');
      $('brk-no').onclick = closeModal;
    }
  }

  function gather(kind) {
    var loc = W.LOC_MAP[S.loc];
    var days = 7;
    var n = 1 + Math.floor(Math.random() * 2);
    var danger = loc.tier * 0.12 + 0.08;
    if (Math.random() < danger) {
      W.log('在' + loc.name + '采' + (kind === 'herb' ? '药' : '矿') + '时遇袭。', 'bad');
      var foe = W.beastUnit(Math.min(3, W.stepInfo(S.step).realm), kind === 'herb' ? '守药妖兽' : '矿洞妖鼠');
      startBattle([foe], '野 兽', '窸窣声从' + (kind === 'herb' ? '草丛' : '矿洞深处') + '里传出来。');
      return;
    }
    W.addItem(kind, n);
    W.advanceDays(days);
    if (W.questTick) for (var qi = 0; qi < n; qi++) W.questTick('gather', kind);
    W.log('在' + loc.name + (kind === 'herb' ? '采到灵草' : '挖到矿石') + ' ×' + n + '。', 'good');
    afterAction({ text: (kind === 'herb' ? '灵草' : '矿石') + ' +' + n });
  }

  function explore() {
    var loc = W.LOC_MAP[S.loc];
    W.advanceDays(10);
    if (Math.random() < 0.55) {
      var ev = W.rollEvent(loc.id);
      showEvent(ev);
    } else {
      var got = 20 + Math.floor(Math.random() * 40);
      W.addStones(got);
      W.log('在' + loc.name + '转了一圈，捡到些散碎灵石。', '');
      afterAction({ text: '灵石 +' + got });
    }
  }

  function travelTo(id, teleport) {
    if (teleport) {
      var cost = W.teleportCost(id);
      if (S.stones < cost) { toast('传送阵要 ' + cost + ' 灵石'); return; }
      W.addStones(-cost);
      W.advanceDays(3, true);
      var loc0 = W.LOC_MAP[id];
      S.loc = id;
      W.ensureNpcs(id);
      W.log('借传送阵到了' + loc0.name + '。', 'sys');
      selected = id;
      W.save(); renderAll();
      toast('传送至' + loc0.name + '，耗 ' + cost + ' 灵石。');
      return;
    }
    var res = W.travel(id);
    if (!res.ok) { toast(res.text); return; }
    selected = id;
    W.save();
    renderAll();
    if (res.event) {
      showEvent(res.event);
    } else {
      toast('赶路 ' + res.days + ' 天，到了' + res.loc.name + '。');
    }
  }

  /* =============================================================
     NPC 互动
     ============================================================= */
  function openNpc(id) {
    var npc = W.findNpc(id);
    if (!npc || !npc.alive) return;
    /* 点开就可能挨打 */
    var risk = W.openRisk(npc);
    if (risk > 0 && Math.random() < risk) {
      var k = W.kill(npc);
      W.log(npc.name + '二话不说就动了手。', 'bad');
      startBattle([k.battle], '遭 袭', npc.name + '盯着你看了两息，忽然出手：「你身上这股味儿，恶心。」');
      return;
    }
    var p = D.PERSONALITIES[npc.personality];
    var rel = Math.round(npc.relation);
    var att = W.attitude(npc);
    var wager = Math.min(120, npc.wealth, S.stones);
    var bio = (npc.bio || []).slice(-6).map(function (b) { return '<div class="bio-line">· ' + esc(b) + '</div>'; }).join('');
    var html = '<div class="npc-card-head"><div class="npc-card-sub">' + W.stepName(npc.step) + ' · ' + p.name +
      (npc.note ? ' · ' + esc(npc.note) : '') + '</div></div>' +
      '<div class="npc-line"><span>对你的印象</span><b style="color:' + (att < -20 ? 'var(--red)' : att > 20 ? 'var(--jade)' : 'var(--ink)') + '">' +
      W.attitudeLabel(att) + '（' + att + '）</b></div>' +
      '<div class="npc-line"><span>交情</span><b>' + relLabel(rel) + '</b></div>' +
      '<div class="npc-line"><span>随身灵石</span><b>' + npc.wealth + '</b></div>' +
      '<div class="npc-line"><span>功法</span><b>' +
      (npc.techs.length ? npc.techs.map(function (t) { return g_name(t) + '（' + grade(t) + '）'; }).join('、') : '无') +
      '</b></div>' +
      '<div class="npc-say" id="npc-say">「' + esc(p.talk[Math.floor(Math.random() * p.talk.length)]) + '」</div>' +
      '<div class="sec-title" style="margin-top:12px">经 历<span>' + (npc.age || '?') + ' 岁</span></div>' +
      '<div class="bio-list">' + (bio || '<div class="bio-line" style="color:var(--ink-3)">没什么可说的。</div>') + '</div>' +
      '<div class="npc-acts">' +
      '<button class="act-btn" data-npc-act="talk">交 谈<small>慢慢熟起来</small></button>' +
      '<button class="act-btn" data-npc-act="spar">切 磋<small>点到为止，不伤性命</small></button>' +
      '<button class="act-btn" data-npc-act="bet"' + (wager < 10 ? ' disabled' : '') + '>赌 斗<small>押 ' + wager + ' 灵石</small></button>' +
      '<button class="act-btn" data-npc-act="gift"' + (S.stones < 100 ? ' disabled' : '') + '>结 缘<small>100 灵石</small></button>' +
      '<button class="act-btn" data-npc-act="favor"' + (rel < 60 ? ' disabled' : '') + '>索 要<small>交情够深才给</small></button>' +
      '<button class="act-btn danger" data-npc-act="kill">劫 杀<small>杀人夺宝，结下血债</small></button>' +
      '</div>';
    modal(npc.name, html);

    $('modal-body').querySelectorAll('[data-npc-act]').forEach(function (b) {
      b.onclick = function () {
        var act = b.getAttribute('data-npc-act');
        closeModal();
        npcAct(npc, act, wager);
      };
    });
  }

  function g_name(id) { return window.TECHS[id] ? window.TECHS[id].name : id; }
  function trDef(id) { return W.treasureDef(id) || { name: id, desc: '' }; }
  function trSpellName(id) {
    var t = W.treasureDef(id);
    if (!t || !t.spell) return '';
    var sp = window.SPELLS[t.spell];
    return sp ? '技：' + sp.name : '';
  }
  function relLabel(v) {
    if (v >= 80) return '生死之交';
    if (v >= 50) return '相熟';
    if (v >= 20) return '点头之交';
    if (v > 0) return '见过';
    if (v > -20) return '冷淡';
    return '有仇';
  }

  function npcAct(npc, act, wager) {
    if (act === 'talk') {
      var tree = W.dialogueFor(npc);
      if (tree) { openDialogue(npc, tree, W.dialogStart ? W.dialogStart(npc, tree) : tree.start); return; }
      var r = W.talk(npc);
      afterAction({});
      modal(npc.name, '<div class="npc-say">' + esc(r.text) + '</div>' +
        '<div class="ev-opts"><button class="ev-opt" id="npc-back">再说两句</button></div>');
      $('npc-back').onclick = function () { closeModal(); openNpc(npc.id); };
      return;
    }
    if (act === 'gift') {
      var g = W.gift(npc, 100);
      afterAction({});
      modal(npc.name, '<div class="ev-out">' + esc(g.text) + '</div>');
      return;
    }
    if (act === 'favor') {
      var f = W.askFavor(npc);
      afterAction({});
      modal(npc.name, '<div class="ev-out" style="color:var(--gold-2)">' + esc(f.text) + '</div>');
      return;
    }
    if (act === 'spar') {
      var s = W.spar(npc, 0);
      startBattle([s.battle], '切 磋', npc.name + '摆开架势：「点到为止。」');
      return;
    }
    if (act === 'bet') {
      if (S.stones < wager) { toast('灵石不够。'); return; }
      W.addStones(-wager);
      var b = W.spar(npc, wager);
      startBattle([b.battle], '赌 斗', npc.name + '看着你押下的 ' + wager + ' 块灵石，笑了。');
      return;
    }
    if (act === 'kill') {
      doKill(npc);
    }
  }

  function doKill(npc) {
    var risk = npc.step - S.step;
    modal('下 死 手', '<div class="ev-text">真要杀 ' + esc(npc.name) + '？<br>' +
      '他' + (npc.techs.length ? '身怀《' + g_name(npc.techs[0]) + '》' : '身上没什么功法') +
      '，' + (risk > 2 ? '<span style="color:var(--red)">修为比你高，凶多吉少。</span>' : '修为与你相近。') +
      (npc.grudge ? '<br><span style="color:var(--red)">此人身世不简单，杀了他恐怕有人来寻仇。</span>' : '') +
      '</div><div class="ev-opts">' +
      '<button class="ev-opt danger" id="kl-yes">动 手</button>' +
      '<button class="ev-opt" id="kl-no">算 了</button></div>');
    $('kl-yes').onclick = function () {
      closeModal();
      var k = W.kill(npc);
      startBattle([k.battle], '劫 杀', '你反手扣住剑柄。' + npc.name + '的脸色变了。');
    };
    $('kl-no').onclick = closeModal;
  }

  function openSect() {
    var def = W.sectDef();
    if (!def) return;
    var atHome = def.loc === S.loc;
    var s = S.sect;
    var rank = def.ranks[s.rank];
    var next = def.ranks[s.rank + 1];
    var factionName = s.faction ? (def.factions.filter(function (f) { return f.id === s.faction; })[0] || {}).name : '未站队';
    var html = '<div class="sect-head">' +
      '<div class="sect-sub">' + esc(rank.name) + ' · ' + (def.align === 'righteous' ? '正道' : '魔道') + ' · ' + esc(factionName) + '</div>' +
      '</div>' +
      '<div class="npc-line"><span>宗门贡献</span><b>' + s.contribution + '</b></div>' +
      '<div class="npc-line"><span>年俸</span><b>' + rank.pay + ' 灵石</b></div>' +
      (next ? '<div class="npc-line"><span>晋升 ' + next.name + '</span><b style="color:' +
        (s.contribution >= next.need ? 'var(--jade)' : 'var(--ink-3)') + '">' +
        (s.contribution >= next.need ? '可以晋升' : '需 ' + next.need + ' 贡献') + '</b></div>' : '');

    if (!atHome) {
      html += '<div class="ev-text" style="color:var(--red);margin-top:6px">你不在' + esc(def.name) + '山门。差事与藏经阁要回去才能办。</div>';
    }
    html += '<div class="ev-opts" style="margin-top:10px">';
    if (next) html += '<button class="ev-opt" id="sc-promote"' + (atHome ? '' : ' disabled style="opacity:.45"') + '>晋 升</button>';
    if (!s.faction) {
      html += '<div class="sec-title">择 一 堂</div>';
      def.factions.forEach(function (f) {
        html += '<button class="ev-opt" data-faction="' + f.id + '">' + esc(f.name) +
          '<small>' + esc(f.perk) + '　' + esc(f.desc) + '</small></button>';
      });
    }
    html += '</div>';

    html += '<div class="sec-title">差 事<span>接一件慢慢办</span></div><div class="ev-opts">';
    W.sectTasks().forEach(function (t) {
      var ready = atHome && (!t.need || Object.keys(t.need).every(function (k) { return W.itemCount(k) >= t.need[k]; }));
      html += '<button class="ev-opt" data-task="' + t.id + '"' + (ready ? '' : ' disabled style="opacity:.45"') + '>' +
        esc(t.name) + '<small>' + esc(t.desc) + ' · 贡献 ' + t.contribution + ' · 灵石 ' + t.stones +
        ' · ' + (t.days || 0) + ' 天</small></button>';
    });
    html += '</div>';

    var style = (D.SECT_STYLE || {})[def.id];
    if (style) {
      html += '<div class="sect-motto">「' + esc(style.motto) + '」<span>' + esc(style.give) + '</span></div>';
    }
    var lib = atHome ? W.sectLibrary() : [];
    html += '<div class="sec-title">藏 经 阁<span>按身份开放</span></div>';
    if (!lib.length) {
      html += '<div class="lib-empty">' + (atHome ? '你的身份还进不去。' : '你不在山门，藏经阁不开。') + '</div>';
    } else {
      html += lib.map(function (it) {
        return '<div class="shop-row"><div class="sn">' + esc(g_name(it.id)) +
          '<span class="tag" style="margin-left:6px">' + (window.GRADES[window.gradeOf(it.id)]) + '</span>' +
          (it.sig ? '<span class="tag sig-tag" style="margin-left:6px">镇派</span>' : '') +
          '<div style="font-size:11px;color:var(--ink-3)">' +
          esc(it.note || passiveText(it.id)) + '</div></div>' +
          (it.owned
            ? '<span style="font-size:11px;color:var(--ink-3)">已抄录</span>'
            : '<button class="mini-btn" data-buy="' + it.id + '"' + (S.sect.contribution >= it.cost ? '' : ' disabled') + '>' + it.cost + ' 贡献</button>') +
          '</div>';
      }).join('');
    }

    html += '<div class="ev-opts" style="margin-top:14px">' +
      '<button class="ev-opt" id="sc-leave" style="color:#c98b7c">叛 出 宗 门</button></div>';

    modal(def.name, html);

    if ($('sc-promote') && atHome) $('sc-promote').onclick = function () {
      var r = W.promote();
      toast(r.text);
      W.save(); renderAll();
      if (r.ok) { closeModal(); openSect(); }
    };
    $('modal-body').querySelectorAll('[data-faction]').forEach(function (b) {
      b.onclick = function () {
        var r = W.chooseFaction(b.getAttribute('data-faction'));
        toast(r.text);
        W.save(); renderAll(); closeModal(); openSect();
      };
    });
    $('modal-body').querySelectorAll('[data-task]').forEach(function (b) {
      b.onclick = function () {
        var r = W.acceptTask(b.getAttribute('data-task'));
        if (!r.ok) { toast(r.text); return; }
        if (r.battle) {
          closeModal();
          startBattle([r.foe], '宗门差事', r.text);
        } else {
          toast(r.text);
          W.save(); renderAll(); closeModal(); openSect();
        }
      };
    });
    $('modal-body').querySelectorAll('[data-buy]').forEach(function (b) {
      b.onclick = function () {
        var r = W.buySectTech(b.getAttribute('data-buy'));
        toast(r.text);
        W.save(); renderAll();
        if (r.ok) { closeModal(); openSect(); }
      };
    });
    $('sc-leave').onclick = function () {
      modal('叛 出 师 门', '<div class="ev-text">真要叛出师门？正道宗门会记你一笔，往后不好相见。</div>' +
        '<div class="ev-opts"><button class="ev-opt danger" id="lv-yes">叛 出</button>' +
        '<button class="ev-opt" id="lv-no">算 了</button></div>');
      $('lv-yes').onclick = function () {
        closeModal();
        var r = W.leaveSect();
        toast(r.text);
        W.save(); renderAll();
      };
      $('lv-no').onclick = function () { closeModal(); openSect(); };
    };
  }

  function passiveText(id) {
    var p = window.Rules.techPassives([id]);
    var out = [];
    Object.keys(p).forEach(function (k) {
      if (Math.abs(p[k]) < 0.005) return;
      var pctKeys = { take: 1, takeFire: 1, takeIce: 1, takeHoly: 1, evade: 1, pierce: 1, dmgReduce: 1 };
      var label = ({
        breakBonus: '突破成功率', swordDmg: '剑系伤害', soulDmg: '神魂伤害', ghostDmg: '阴系伤害',
        woodDmg: '木系伤害', fireDmg: '火系伤害', waterDmg: '水系伤害', metalDmg: '金系伤害',
        iceDmg: '冰系伤害', thunderDmg: '雷系伤害', bloodDmg: '血系伤害', dmg: '全伤害',
        hp: '气血', atk: '攻击', def: '防御', mana: '法力', evade: '闪避', spd: '先手',
        ctrlHit: '控制命中', ctrlResist: '控制抗性', crit: '暴击', lifesteal: '吸血',
        healBonus: '疗伤', pierce: '穿透', take: '减伤', dmgReduce: '减伤',
        vsGhost: '对鬼物伤害', takeFire: '受火伤', takeIce: '受冰伤', takeHoly: '受正气伤',
        ghostImmune: '免疫阴毒', poisonImmune: '免疫中毒', cheatDeath: '保命', reachBack: '可击后排',
        hpUpkeep: '每回合流失', ghostResist: '鬼魂抗性'
      }[k] || k);
      if (k === 'manaRegen') {
        out.push(label + ' +' + Math.round(p[k] * 10) / 10 + '/回合');
        return;
      }
      var v = Math.round(p[k] * 100);
      out.push(label + ' ' + (v > 0 ? '+' : '') + v + '%');
    });
    return out.join('　') || '无被动';
  }

  function showMail(m) {
    var html = '<div class="ev-text">' + esc(m.text).replace(/\n/g, '<br>') + '</div>' +
      '<div class="ev-opts">' +
      (m.battle
        ? '<button class="ev-opt danger" id="ml-fight">出 手</button><button class="ev-opt" id="ml-no">不开门</button>'
        : '<button class="ev-opt" id="ml-ok">收 下</button>') +
      '</div>';
    modal(m.title, html);
    if (m.battle) {
      $('ml-fight').onclick = function () {
        closeModal();
        m.act();
        var u2 = W.npcUnit({ name: m.battle.name, step: m.battle.step, techs: m.battle.techs, faction: 'demon', hpMul: 1 });
        startBattle([u2], '救 援', m.npc.name + '躲在门后，手里攥着一把断剑。');
      };
      $('ml-no').onclick = function () {
        closeModal();
        m.npc.relation -= 20;
        toast(m.npc.name + '看了你一眼，从后窗翻了出去。');
        W.save(); renderAll();
      };
      return;
    }
    $('ml-ok').onclick = function () {
      closeModal();
      m.act();
      W.save(); renderAll();
    };
  }

  /* =============================================================
     战斗
     ============================================================= */
  var PB = null;
  var SC = window.BattleScene || null;

  function startBattle(units, kind, intro) {
    var b = W.makeBattle(units);
    show('battle');
    $('battle-title').textContent = kind || '斗法';
    $('battle-intro').textContent = intro || '';
    $('result-overlay').hidden = true;
    $('battle-log').innerHTML = '';
    $('battle-round').textContent = '第 1 回合';
    $('turnbar').innerHTML = '<span class="tb-label">先 手</span>';
    PB = { b: b, token: 0, speed: 1, view: {}, names: {}, units: {}, dmg: 0, taken: 0, done: false };
    b.init.forEach(function (u) {
      PB.view[u.uid] = { hp: u.hp, hpMax: u.hpMax, mana: u.mana, manaMax: u.manaMax, shield: 0, status: [], dead: false };
      PB.names[u.uid] = u.name;
      PB.units[u.uid] = u;
    });
    buildArena(b);
    play();
  }

  function buildArena(b) {
    var me = b.init.filter(function (u) { return u.side === 'player'; })[0];
    var foes = b.init.filter(function (u) { return u.side === 'enemy'; });
    $('player-zone').innerHTML = me ? unitHtml(me, true) : '';
    $('enemy-zone').innerHTML = foes.map(function (u) { return unitHtml(u, false); }).join('');
    var meta = document.querySelector('.unit.player .u-meta');
    if (meta) meta.textContent = '攻 ' + me.atk + ' · 防 ' + me.def + ' · 先手 ' + me.spd;
    if (SC) { SC.mount(); SC.reset(); SC.setup(b.init); }
  }
  function unitHtml(u, isMe) {
    var real = W.REALM_NAMES[u.realm] != null ? W.REALM_NAMES[u.realm] : '';
    return '<div class="unit' + (isMe ? ' player' : '') + '" data-uid="' + u.uid + '">' +
      '<div class="u-head"><span class="u-name">' + esc(u.name) + '</span>' +
      (isMe ? '<span class="u-tag">你</span>' : '') +
      '<span class="u-realm">' + (real || (u.realm < 0 ? '凡人' : '')) + '</span></div>' +
      '<div class="bar hp"><i style="width:100%"></i></div>' +
      '<div class="bar-text"><span class="bt-hp">' + u.hp + '/' + u.hpMax + '</span><span class="bt-extra"></span></div>' +
      '<div class="bar sh" style="display:none"><i style="width:0%"></i></div>' +
      '<div class="bar mp"><i style="width:100%"></i></div>' +
      '<div class="bar-text"><span>法力</span><span class="bt-mp">' + u.mana + '/' + u.manaMax + '</span></div>' +
      (isMe ? '<div class="u-meta"></div>' : '') +
      '<div class="u-status"></div><div class="float-layer"></div></div>';
  }

  function updateUnit(uid) {
    var v = PB.view[uid];
    var node = document.querySelector('.unit[data-uid="' + uid + '"]');
    if (!v || !node) return;
    node.querySelector('.bar.hp i').style.width = Math.max(0, v.hp / v.hpMax * 100) + '%';
    node.querySelector('.bt-hp').textContent = Math.max(0, Math.round(v.hp)) + '/' + v.hpMax;
    var mp = node.querySelector('.bar.mp i');
    if (mp) mp.style.width = Math.max(0, Math.min(100, v.mana / v.manaMax * 100)) + '%';
    var mt = node.querySelector('.bt-mp');
    if (mt) mt.textContent = Math.max(0, Math.round(v.mana)) + '/' + v.manaMax;
    var sh = node.querySelector('.bar.sh');
    if (v.shield > 0) {
      sh.style.display = 'block';
      sh.querySelector('i').style.width = Math.min(100, v.shield / v.hpMax * 100) + '%';
      node.querySelector('.bt-extra').textContent = '盾 ' + Math.round(v.shield);
    } else {
      sh.style.display = 'none';
      node.querySelector('.bt-extra').textContent = '';
    }
    node.querySelector('.u-status').innerHTML = (v.status || []).map(function (s) {
      var cls = s.shield ? 'shield' : (s.kind === 'good' ? 'good' : 'bad');
      return '<span class="status-chip ' + cls + '">' + esc(s.name) + (s.turns ? s.turns : '') + '</span>';
    }).join('');
    node.classList.toggle('dead', !!v.dead);
  }

  function floatText(uid, text, cls) {
    if (SC) {
      var a = SC.anchorOf(uid);
      if (a) {
        var kind = cls === 'heal' ? 'heal' : (cls === 'crit' ? 'crit' : (cls === 'miss' ? 'miss' : ''));
        SC.floatNum(a.x, a.y - 36, text, kind);
        return;
      }
    }
    var node = document.querySelector('.unit[data-uid="' + uid + '"] .float-layer');
    if (!node) return;
    var s = document.createElement('span');
    s.className = 'float-num ' + (cls || '');
    s.textContent = text;
    s.style.left = (30 + Math.random() * 40) + '%';
    node.appendChild(s);
    setTimeout(function () { s.remove(); }, 1000);
  }
  function shake(uid) {
    var n = document.querySelector('.unit[data-uid="' + uid + '"]');
    if (!n) return;
    n.classList.remove('hit'); void n.offsetWidth; n.classList.add('hit');
  }
  function logLine(text, cls) {
    var box = $('battle-log');
    var d = document.createElement('div');
    d.className = 'log-line ' + (cls || '');
    d.innerHTML = text;
    box.appendChild(d);
    while (box.children.length > 40) box.removeChild(box.firstChild);
    box.scrollTop = box.scrollHeight;
  }
  function delayOf(e) {
    switch (e.t) {
      case 'round': return 420;
      case 'order': return 60;
      case 'act': return 430;
      case 'hit': return 210;
      case 'heal': return 170;
      case 'buff': case 'shield': case 'dot': case 'hot': case 'seal': case 'stun': return 110;
      case 'miss': case 'resist': return 220;
      case 'skip': return 260;
      case 'death': return 340;
      case 'text': return 320;
      case 'end': return 450;
      default: return 0;
    }
  }

  function play() {
    var token = ++PB.token;
    var b = PB.b;
    (async function () {
      for (var i = 0; i < b.events.length; i++) {
        if (token !== PB.token) return;
        var e = b.events[i];
        applyEvent(e);
        var d = delayOf(e);
        if (d > 0) await sleep(d / PB.speed);
      }
      if (token !== PB.token) return;
      PB.done = true;
      finish();
    })();
  }

  function applyEvent(e) {
    var v;
    switch (e.t) {
      case 'round':
        $('battle-round').textContent = '第 ' + e.n + ' 回合';
        logLine('第 ' + e.n + ' 回合', 'sys');
        break;
      case 'order':
        $('turnbar').innerHTML = '<span class="tb-label">先 手</span>' + e.list.map(function (u, i) {
          return '<span class="turn-item' + (u.uid === 'p' ? ' me' : ' enemy') + (i === 0 ? ' now' : '') + '">' +
            esc(u.name) + ' ' + u.spd + '</span>';
        }).join('');
        break;
      case 'act':
        markActive(e.uid);
        logLine((e.uid === 'p' ? '<b>' + esc(PB.names[e.uid]) + '</b>' : esc(PB.names[e.uid])) +
          ' 施展 <b>' + esc(e.spell) + '</b>', e.uid === 'p' ? 'you' : 'foe');
        if (SC) SC.cast(e);
        break;
      case 'hit':
        v = PB.view[e.uid];
        if (!v) break;
        v.hp = e.hp; updateUnit(e.uid);
        if (e.dmg > 0) {
          if (SC) SC.hit(e.uid, e.dmg, e.crit, e.el === 'true' ? 'phys' : e.el);
          else { floatText(e.uid, '-' + e.dmg, e.crit ? 'crit' : ''); shake(e.uid); }
          if (e.src === 'p') PB.dmg += e.dmg; else if (e.src) PB.taken += e.dmg;
          if (e.blocked > 0) floatText(e.uid, '盾 -' + e.blocked, 'miss');
        }
        break;
      case 'heal':
        v = PB.view[e.uid];
        if (v) {
          v.hp = e.hp; updateUnit(e.uid);
          if (SC) SC.heal(e.uid, e.amt); else floatText(e.uid, '+' + e.amt, 'heal');
        }
        break;
      case 'mana':
        v = PB.view[e.uid];
        if (v) { v.mana = e.mana; updateUnit(e.uid); }
        break;
      case 'status':
        v = PB.view[e.uid];
        if (v) { v.status = e.list || []; if (e.shield != null) v.shield = e.shield; updateUnit(e.uid); }
        break;
      case 'death':
        v = PB.view[e.uid];
        if (v) { v.dead = true; v.hp = 0; v.status = []; v.shield = 0; updateUnit(e.uid); }
        if (SC) SC.death(e.uid);
        logLine(esc(PB.names[e.uid]) + ' 倒了下去', 'big');
        break;
      case 'miss':
        logLine('　' + esc(PB.names[e.uid]) + ' 闪开了', 'sys');
        if (SC) SC.miss(e.uid, '闪避'); else floatText(e.uid, '闪避', 'miss');
        break;
      case 'resist':
        logLine('　' + esc(PB.names[e.uid]) + ' 挣脱了' + esc(e.name || ''), 'sys');
        if (SC) SC.floatNum((SC.anchorOf(e.uid) || { x: 0, y: 0 }).x, (SC.anchorOf(e.uid) || { y: 0 }).y - 20, '挣脱', 'miss');
        break;
      case 'skip':
        logLine('　' + esc(PB.names[e.uid]) + (e.reason === 'banish' ? ' 被困在虚空里' : ' 被控住，无法出手'), 'sys');
        break;
      case 'text':
        logLine(esc(e.text), e.cls === 'bad' ? 'foe' : 'you');
        break;
    }
  }

  var activeTimer = null;
  function markActive(uid) {
    document.querySelectorAll('.unit.active').forEach(function (n) { n.classList.remove('active'); });
    var node = document.querySelector('.unit[data-uid="' + uid + '"]');
    if (node) node.classList.add('active');
    clearTimeout(activeTimer);
    activeTimer = setTimeout(function () { if (node) node.classList.remove('active'); }, 650 / (PB ? PB.speed : 1));
  }

  function finish() {
    var inRun = !!(S.run && S.run.pendingBattle);
    var res = W.afterBattle(PB.b);
    var taskRes = W.finishTask(res.win);
    if (taskRes) res.text += '\n\n' + taskRes.text;
    var ov = $('result-overlay');
    var win = res.win;
    /* 先把「胜 / 败」的印盖在台上，再落结算卡 */
    if (SC) SC.stamp(win);
    ov.hidden = true;
    setTimeout(function () { ov.hidden = false; }, PB.speed >= 8 ? 160 : 1050);
    $('result-kicker').textContent = win ? '斗 法 已 毕' : '落 败';
    $('result-title').textContent = win ? '胜' : '败';
    $('result-title').className = 'result-title' + (win ? '' : ' lose');
    $('result-text').innerHTML = esc(res.text).replace(/\n/g, '<br>');
    $('result-stats').innerHTML =
      '<div class="result-stat">回合<b>' + PB.b.round + '</b></div>' +
      '<div class="result-stat">造成伤害<b>' + PB.dmg + '</b></div>' +
      '<div class="result-stat">承受伤害<b>' + PB.taken + '</b></div>';
    if (S.dead) {
      $('result-actions').innerHTML = '<button class="btn btn-primary" id="r-end">…</button>';
      $('r-end').onclick = showEnd;
      return;
    }
    if (inRun) {
      $('result-actions').innerHTML = '<button class="btn btn-primary" id="r-run">继 续 前 行</button>';
      $('r-run').onclick = function () {
        ov.hidden = true;
        afterRunBattle(win);
      };
      return;
    }
    $('result-actions').innerHTML = '<button class="btn btn-primary" id="r-back">回 到 地 图</button>';
    $('r-back').onclick = function () {
      ov.hidden = true;
      selected = S.loc;
      W.save();
      show('map');
      renderAll();
    };
  }

  /* ---------- 查看状况 / 投降 ---------- */
  function inspectBattle() {
    if (!PB) return;
    var ids = ['p'].concat(Object.keys(PB.view).filter(function (k) { return k !== 'p'; }));
    var html = '<div class="insp">';
    ids.forEach(function (uid) {
      var u = PB.units[uid], v = PB.view[uid];
      if (!u || !v) return;
      var real = u.realm < 0 ? '凡人' : (W.REALM_NAMES[u.realm] || '');
      var chips = (v.status || []).map(function (s) {
        return '<span class="status-chip ' + (s.kind === 'good' ? 'good' : 'bad') + '">' + esc(s.name) + (s.turns || '') + '</span>';
      }).join('') || '<span class="insp-none">无</span>';
      html += '<div class="insp-row' + (uid === 'p' ? ' me' : '') + '">' +
        '<div class="insp-name">' + esc(u.name) + '<em>' + esc(real) + '</em></div>' +
        '<div class="insp-bars">' +
        '<div class="insp-bar hp"><i style="width:' + Math.max(0, v.hp / v.hpMax * 100) + '%"></i><span>气血 ' + Math.max(0, Math.round(v.hp)) + ' / ' + v.hpMax + '</span></div>' +
        '<div class="insp-bar mp"><i style="width:' + Math.max(0, v.mana / v.manaMax * 100) + '%"></i><span>法力 ' + Math.max(0, Math.round(v.mana)) + ' / ' + v.manaMax + '</span></div>' +
        (v.shield > 0 ? '<div class="insp-bar sh"><i style="width:' + Math.min(100, v.shield / v.hpMax * 100) + '%"></i><span>护盾 ' + Math.round(v.shield) + '</span></div>' : '') +
        '</div>' +
        '<div class="insp-meta">攻 ' + u.atk + ' · 防 ' + u.def + ' · 先手 ' + u.spd + '</div>' +
        '<div class="insp-chips">' + chips + '</div>' +
        '</div>';
    });
    html += '</div>';
    modal('战 况', html);
  }

  function giveUp() {
    if (!PB || PB.done) return;
    if (!window.confirm('认输退出这场斗法？按落败结算。')) return;
    PB.token++;            // 停掉回放
    PB.b.result = 'lose';
    PB.done = true;
    finish();
  }

  /* =============================================================
     事件
     ============================================================= */
  function showEvent(ev) {
    var html = '<div class="ev-text">' + esc(ev.text) + '</div><div class="ev-opts">' +
      ev.options.map(function (o, i) {
        return '<button class="ev-opt' + (o.danger ? ' danger' : '') + '" data-opt="' + i + '">' +
          esc(o.text) + (o.hint ? '<small>' + esc(o.hint) + '</small>' : '') + '</button>';
      }).join('') + '</div>';
    modal(ev.title, html);
    $('modal-body').querySelectorAll('[data-opt]').forEach(function (b) {
      b.onclick = function () {
        var o = ev.options[parseInt(b.getAttribute('data-opt'), 10)];
        var out = o.run(S, W.W);
        W.applyFx(out.fx);
        if (W.ensureQiEntry) W.ensureQiEntry();
        if (out.grantTech && S.learned.indexOf(out.grantTech) < 0) {
          W.grantTech(out.grantTech);
          S.learned.push(out.grantTech);
          toast('得《' + g_name(out.grantTech) + '》');
        }
        if (out.battle) {
          closeModal();
          var list = [];
          var n = out.battle.count || 1;
          for (var i = 0; i < n; i++) {
            list.push(out.battle.kind === 'beast'
              ? W.beastUnit(out.battle.realm || 0)
              : W.banditUnit(out.battle.realm || 0));
          }
          W.log('遇袭：' + ev.title, 'bad');
          startBattle(list, '遇 袭', ev.title + ' —— ' + out.text.slice(0, 28));
          return;
        }
        modal(ev.title, '<div class="ev-out">' + esc(out.text) + '</div>' +
          '<div class="ev-opts"><button class="ev-opt" id="ev-done">继续</button></div>');
        $('ev-done').onclick = function () {
          closeModal();
          if (S.dead) { showEnd(); return; }
          W.save();
          renderAll();
        };
      };
    });
  }

  /* =============================================================
     储物袋 / 坊市
     ============================================================= */
  function openBag() {
    var trList = (S.treasures || []).map(function (id) {
      var t = trDef(id);
      return '<div class="shop-row"><div class="sn">' + esc(t.name) +
        '<div style="font-size:11px;color:var(--ink-3)">' + esc(t.desc) + ' · ' + esc(trSpellName(id)) + '</div></div>' +
        '<button class="mini-btn" data-bagtr="' + id + '" data-slot="main">' + (S.treasure === id ? '主·收起' : '主') + '</button>' +
        '<button class="mini-btn" data-bagtr="' + id + '" data-slot="sub">' + (S.treasure2 === id ? '副·收起' : '副') + '</button></div>';
    }).join('');
    var items = Object.keys(S.items);
    var html = items.length ? items.map(function (id) {
      var it = D.ITEMS[id];
      if (!it) return '';
      return '<div class="shop-row"><div class="sn">' + esc(it.name) + ' ×' + S.items[id] +
        '<div style="font-size:11px;color:var(--ink-3)">' + esc(it.desc) + '</div></div>' +
        (it.use !== 'sell' ? '<button class="mini-btn" data-use="' + id + '">使用</button>' : '') +
        '</div>';
    }).join('') : '<div class="lib-empty">储物袋里空空如也。</div>';
    if (trList) html += '<div class="sec-title" style="margin-top:14px">法 宝</div>' + trList;
    html += '<div class="npc-line" style="margin-top:12px"><span>灵石</span><b>' + S.stones + '</b></div>';
    modal('储物袋', html);
    $('modal-body').querySelectorAll('[data-bagtr]').forEach(function (b) {
      b.onclick = function () {
        W.equipTreasure(b.getAttribute('data-bagtr'), b.getAttribute('data-slot'));
        W.save(); renderAll(); closeModal(); openBag();
      };
    });
    $('modal-body').querySelectorAll('[data-use]').forEach(function (b) {
      b.onclick = function () {
        var r = W.useItem(b.getAttribute('data-use'));
        toast(r.text);
        W.save(); renderAll(); closeModal(); openBag();
      };
    });
  }

  function matLine(need) {
    return Object.keys(need).map(function (k) {
      var have = W.itemCount(k), n = need[k];
      return '<span style="color:' + (have >= n ? 'var(--jade)' : 'var(--red)') + '">' +
        (D.ITEMS[k] ? D.ITEMS[k].name : k) + ' ' + have + '/' + n + '</span>';
    }).join('　');
  }

  function openAuction() {
    var a = W.ensureAuction();
    var html = '<div class="ev-text" style="margin-bottom:10px">嘉元城三层坊市的拍卖厅。每年换一批货，价高者得。<br>你身上有 <b>' + S.stones + '</b> 块灵石。</div>';
    if (!a.lots.length) html += '<div class="lib-empty">今年没什么好东西。</div>';
    a.lots.forEach(function (lot, i) {
      html += '<div class="shop-row"><div class="sn">' + esc(lot.name) +
        ' <span class="tag">' + (window.GRADES[lot.grade] || '') + '</span>' +
        '<div style="font-size:11px;color:var(--ink-3)">当前 ' + lot.price + ' 灵石 · 还剩 ' + lot.tries + ' 次叫价</div></div>' +
        (lot.sold
          ? '<span style="font-size:11px;color:var(--ink-3)">已成交</span>'
          : '<button class="mini-btn" data-bid="' + i + '">出价 ' + Math.round(lot.price * 1.15) + '</button>') +
        '</div>';
    });
    modal('拍 卖 会', html);
    $('modal-body').querySelectorAll('[data-bid]').forEach(function (b) {
      b.onclick = function () {
        var r = W.auctionBid(parseInt(b.getAttribute('data-bid'), 10));
        toast(r.text.slice(0, 30));
        W.save(); renderAll();
        if (r.ok) { closeModal(); openAuction(); }
        else openAuction();
      };
    });
  }

  function openAlchemy() {
    var html = '<div class="ev-text" style="margin-bottom:10px">丹炉就在坊市后头。你有：灵草 ×' + W.itemCount('herb') +
      '，矿石 ×' + W.itemCount('ore') + '，古修残片 ×' + W.itemCount('relic') + '。<br>' +
      '<span style="color:var(--ink-3);font-size:12px">开炉后要自己控火：三转之内，指针对上绿区才算凝住。</span></div>';
    html += D.PILLS.map(function (p) {
      var chk = W.canCraftPill ? W.canCraftPill(p.id) : { ok: true };
      return '<div class="shop-row"><div class="sn">' + esc(p.name) +
        '<div style="font-size:11px;color:var(--ink-3)">' + esc(p.desc) + ' · 7 天</div>' +
        '<div style="font-size:11px;margin-top:2px">' + matLine(p.need) + '</div></div>' +
        '<button class="mini-btn" data-pill="' + p.id + '"' + (chk.ok ? '' : ' style="opacity:.4"') + '>开炉</button></div>';
    }).join('');
    modal('丹 房', html);
    $('modal-body').querySelectorAll('[data-pill]').forEach(function (b) {
      b.onclick = function () { startFurnace(b.getAttribute('data-pill')); };
    });
  }

  /* ---------------- 炼丹：三转控火 ---------------- */
  var furnace = null;

  function startFurnace(id) {
    var chk = W.canCraftPill(id);
    if (!chk.ok) { toast(chk.text); return; }
    var rec = chk.rec;

    furnace = { id: id, rec: rec, round: 0, hits: 0, raf: null, pos: 0, t0: 0, dur: 0, zl: 0, zw: 0, locked: true };

    modal('丹 炉 · ' + rec.name, '');
    nextRound();
  }

  function nextRound() {
    var f = furnace;
    if (!f) return;
    if (f.round >= 3) return finishFurnace();

    var durs = [1750, 1450, 1200];
    var widths = [0.26, 0.20, 0.15];
    f.dur = durs[f.round];
    f.zw = widths[f.round];
    f.zl = 0.05 + Math.random() * (1 - f.zw - 0.10);
    f.pos = 0;
    f.locked = false;
    f.t0 = performance.now();

    $('modal-body').innerHTML =
      '<div class="fur-head">第 <b>' + (f.round + 1) + '</b> / 3 转　·　' + esc(f.rec.name) + '</div>' +
      '<div class="fur-track"><div class="fur-zone" style="left:' + (f.zl * 100).toFixed(1) + '%;width:' + (f.zw * 100).toFixed(1) + '%"></div>' +
      '<div class="fur-needle" id="fur-needle" style="left:0%"></div></div>' +
      '<div class="fur-tip">指针扫进绿区的一瞬点「凝」。早了灵气没聚拢，晚了药力就散了。</div>' +
      '<button class="btn btn-primary fur-tap" id="fur-tap">凝</button>' +
      '<div class="fur-hits">已凝 <b>' + f.hits + '</b> / 3' + (f.hits ? '　' + '●'.repeat(f.hits) : '') + '</div>';

    $('fur-tap').onclick = tapFurnace;
    f.raf = requestAnimationFrame(furLoop);
  }

  function furLoop(t) {
    var f = furnace;
    if (!f) return;
    var p = Math.min(1, (t - f.t0) / f.dur);
    f.pos = p;
    var n = document.getElementById('fur-needle');
    if (n) n.style.left = (p * 100).toFixed(2) + '%';
    if (p >= 1) { if (!f.locked) furResolve(false); return; }
    f.raf = requestAnimationFrame(furLoop);
  }

  function tapFurnace() {
    var f = furnace;
    if (!f || f.locked) return;
    furResolve(true);
  }

  function furResolve(pressed) {
    var f = furnace;
    if (!f) return;
    f.locked = true;
    if (f.raf) { cancelAnimationFrame(f.raf); f.raf = null; }
    var hit = pressed && f.pos >= f.zl && f.pos <= f.zl + f.zw;
    if (hit) f.hits++;
    var n = document.getElementById('fur-needle');
    if (n) n.classList.add(hit ? 'hit' : 'miss');
    var tip = document.querySelector('.fur-tip');
    if (tip) tip.textContent = hit ? '凝住了，药力正在成丹。' : (pressed ? '早了半分，药力散了。' : '火候过了，这一转废了。');
    f.round++;
    setTimeout(nextRound, 520);
  }

  function finishFurnace() {
    var f = furnace;
    if (!f) return;
    furnace = null;
    var r = W.craftPill(f.id, f.hits);
    W.save(); renderAll();
    var kick = f.hits >= 3 ? '三 转 丹 成' : f.hits === 2 ? '丹 成' : f.hits === 1 ? '残 丹' : '废 丹';
    var tone = f.hits >= 2 ? 'var(--gold-2)' : 'var(--red)';
    modal('丹 炉', '<div class="fur-done" style="color:' + tone + '">' + kick + '</div>' +
      '<div class="ev-out">' + esc(r.text || r.text) + '</div>' +
      '<div class="ev-opts"><button class="ev-opt" id="fur-again">再炼一炉</button>' +
      '<button class="ev-opt" id="fur-close">收炉</button></div>');
    $('fur-again').onclick = function () { openAlchemy(); };
    $('fur-close').onclick = closeModal;
  }

  /* ---------------- 秘境征程 ---------------- */
  function openRun() {
    var st = W.runState();
    if (!st) { closeModal(); return; }
    var dots = st.nodes.map(function (t, i) {
      var cls = i < st.idx ? ' past' : (i === st.idx ? ' now' : '');
      return '<i class="run-dot ' + t + cls + '"></i>';
    }).join('');

    var html = '<div class="run-head"><span>' + esc(st.name) + '</span>' +
      '<em>第 ' + Math.min(st.idx + 1, st.len) + ' / ' + st.len + ' 层</em></div>' +
      '<div class="run-track">' + dots + '</div>';

    var next = st.next;
    if (st.log.length) {
      html += '<div class="run-log">' + st.log.map(function (t) { return '<div>' + esc(t) + '</div>'; }).join('') + '</div>';
    }

    if (next === 'branch') {
      html += '<div class="run-ask">' + esc(W.RUN_TEXT.branch.line) + '</div>' +
        '<div class="run-acts"><button class="btn btn-primary" id="run-risk">走左边</button>' +
        '<button class="btn" id="run-safe">走右边</button></div>';
    } else if (next) {
      var rt = W.RUN_TEXT[next];
      html += '<div class="run-ask">前方：<b>' + rt.label + '</b>　' + esc(rt.line) + '</div>' +
        '<div class="run-acts"><button class="btn btn-primary" id="run-go">前 行</button>' +
        '<button class="btn" id="run-out">撤 出</button></div>';
    } else {
      html += '<div class="run-acts"><button class="btn" id="run-out">出 秘 境</button></div>';
    }

    modal('秘 境', html);
    if ($('run-go')) $('run-go').onclick = function () { doRunStep(); };
    if ($('run-risk')) $('run-risk').onclick = function () { doRunChoose('risk'); };
    if ($('run-safe')) $('run-safe').onclick = function () { doRunChoose('safe'); };
    if ($('run-out')) $('run-out').onclick = function () {
      W.exitRun(); W.save(); closeModal(); renderAll();
    };
  }

  function doRunChoose(k) {
    var r = W.runChoose(k);
    toast(r.text || '');
    W.save(); renderAll();
    openRun();
  }

  function doRunStep() {
    var r = W.runNext();
    if (!r.ok) { toast(r.text); return; }
    if (r.needBattle) {
      closeModal();
      W.save();
      startBattle([r.battle], r.boss ? '守 关' : '秘 境', r.text);
      return;
    }
    toast((r.text || '').slice(0, 30));
    W.save(); renderAll();
    openRun();
  }

  function afterRunBattle(win) {
    var r = W.runAfterBattle(win);
    W.save(); renderAll();
    if (!r.ok) { closeModal(); return; }
    var html = '<div class="run-res ' + (win ? (r.boss ? 'boss' : 'win') : 'lose') + '">' +
      (win ? (r.boss ? '破 阵' : '斩 获') : '被 逐') + '</div>' +
      '<div class="ev-out">' + r.text + '</div>' +
      '<div class="ev-opts"><button class="ev-opt" id="run-back">' +
      (win && !r.boss ? '继 续 前 行' : (win ? '出 秘 境' : '退 出')) + '</button></div>';
    modal('秘 境', html);
    $('run-back').onclick = function () {
      if (win && !r.boss) openRun(); else { W.exitRun(); W.save(); closeModal(); renderAll(); }
    };
  }

  /* ---------------- 任务 ---------------- */
  function openQuests() {
    var list = W.questList();
    var main = list.filter(function (q) { return q.kind === 'main'; });
    var side = list.filter(function (q) { return q.kind === 'side'; });

    var card = function (q) {
      var bar = q.total > 0 ? Math.round((q.stage + (q.done ? 0 : 0)) / q.total * 100) : 0;
      var prog = q.done ? '已了结' : ('第 ' + (q.stage + 1) + ' / ' + q.total + ' 步');
      var cnt = (!q.done && q.need > 1) ? '　' + q.have + ' / ' + q.need : '';
      return '<div class="q-card' + (q.done ? ' done' : '') + (q.kind === 'main' ? ' main' : '') + '">' +
        '<div class="q-h"><b>' + esc(q.title) + '</b><span>' + prog + '</span></div>' +
        '<div class="q-step">' + (q.done ? '已了结' : esc(q.cur) + cnt) + '</div>' +
        '<div class="q-bar"><i style="width:' + bar + '%"></i></div>' +
        (q.done ? '' : '<div class="q-intro">' + esc(q.intro).replace(/\n/g, '<br>') + '</div>') +
        '</div>';
    };

    var html = '';
    html += '<div class="sec-title">主 线<span>' + main.length + ' 条</span></div>';
    html += main.length ? main.map(card).join('') : '<div class="wd-none">还没有主线。先去青牛镇茶棚，从那个老道手里接过《长春功》。</div>';
    html += '<div class="sec-title">支 线<span>' + side.filter(function (q) { return !q.done; }).length + ' 进行中</span></div>';
    html += side.length ? side.map(card).join('') : '<div class="wd-none">走到地方，自然会有人找你办事。</div>';

    modal('任 务', html);
  }

  /* ---------------- 对话 ---------------- */
  function openDialogue(npc, tree, nodeId) {
    var say = W.dialogSay(npc, tree, nodeId);
    if (!say) { closeModal(); return; }
    var att = W.attitude(npc);
    var attColor = att < -20 ? 'var(--red)' : att > 20 ? 'var(--jade)' : 'var(--ink-2)';
    var html = '<div class="dlg-head">' +
      '<div class="dlg-name">' + esc(npc.name) + '<em>' + W.stepName(npc.step) + '</em></div>' +
      '<div class="dlg-att" style="color:' + attColor + '">' + W.attitudeLabel(att) + ' · 交情 ' + relLabel(npc.relation) + '</div>' +
      '</div>' +
      '<div class="dlg-say">' + esc(say.text).replace(/\n/g, '<br>') + '</div>' +
      '<div class="dlg-opts">' + say.opts.map(function (o) {
        return '<button class="dlg-opt" data-opt="' + o.i + '">' + esc(o.t) + '</button>';
      }).join('') +
      '<button class="dlg-opt back" data-opt="__end">（不再多说）</button></div>';

    modal(npc.name, html);
    $('modal-body').querySelectorAll('[data-opt]').forEach(function (b) {
      b.onclick = function () {
        var v = b.getAttribute('data-opt');
        if (v === '__end') { W.save(); closeModal(); openNpc(npc.id); return; }
        var r = W.dialogPick(npc, tree, nodeId, parseInt(v, 10));
        W.save();
        if (!r) { openNpc(npc.id); return; }
        if (r.gotTech) toast('得《' + r.gotTech + '》');
        if (r.next) openDialogue(npc, tree, r.next);
        else { closeModal(); openNpc(npc.id); }
      };
    });
  }

  function openForge() {
    var html = '<div class="ev-text" style="margin-bottom:10px">器坊的火常年不熄。矿石 ×' + W.itemCount('ore') +
      '，古修残片 ×' + W.itemCount('relic') + '，灵石 ' + S.stones + '。</div>';
    html += W.D.TREASURES.map(function (t) {
      var owned = S.treasures.indexOf(t.id) >= 0;
      var equipped = S.treasure === t.id;
      return '<div class="shop-row"><div class="sn">' + esc(t.name) +
        '<span class="tag" style="margin-left:6px">' + window.GRADES[t.grade] + '</span>' +
        '<div style="font-size:11px;color:var(--ink-3)">' + esc(t.desc) + '</div>' +
        '<div style="font-size:11px;margin-top:2px">' + matLine(t.need) +
        '　<span style="color:' + (S.stones >= (t.stones || 0) ? 'var(--jade)' : 'var(--red)') + '">灵石 ' +
        S.stones + '/' + (t.stones || 0) + '</span></div></div>' +
        (owned
          ? '<button class="mini-btn" data-eq="' + t.id + '">' + (equipped ? '收起' : '祭炼') + '</button>'
          : '<button class="mini-btn" data-forge="' + t.id + '">炼</button>') +
        (owned ? '<button class="mini-btn" data-eq2="' + t.id + '">' + (S.treasure2 === t.id ? '副·收' : '副') + '</button>' : '') +
        '</div>';
    }).join('');
    modal('器 坊', html);
    $('modal-body').querySelectorAll('[data-forge]').forEach(function (b) {
      b.onclick = function () {
        var r = W.craftTreasure(b.getAttribute('data-forge'));
        toast(r.text.split('\n')[0].slice(0, 26));
        W.save(); renderAll();
        if (r.ok) openForge(); else closeModal();
      };
    });
    $('modal-body').querySelectorAll('[data-eq]').forEach(function (b) {
      b.onclick = function () {
        W.equipTreasure(b.getAttribute('data-eq'), 'main');
        W.save(); renderAll(); closeModal(); openForge();
      };
    });
    $('modal-body').querySelectorAll('[data-eq2]').forEach(function (b) {
      b.onclick = function () {
        W.equipTreasure(b.getAttribute('data-eq2'), 'sub');
        W.save(); renderAll(); closeModal(); openForge();
      };
    });
  }

  var SHOP = ['heal', 'mana', 'cult', 'break', 'escape'];
  /* =============================================================
     洞府 / 百宝阁 / 悬赏 / 木人桩（v17）
     ============================================================= */

  function stoneLine(extra) {
    return '<div class="npc-line" style="margin-top:10px"><span>身上灵石</span><b>' + S.stones + '</b></div>' +
      (extra ? '<div class="ev-text" style="font-size:12px;color:var(--ink-3);margin-top:4px">' + extra + '</div>' : '');
  }

  /* ---------------- 洞府 ---------------- */
  function openCave() {
    if (!CAVE) return;
    var t = CAVE.caveTier();
    if (!S.cave) {
      var canHere = CAVE.canBuildHere(S.loc);
      var html = '<div class="ev-text">这里地气还行，山又是自家的——可以凿一处洞府。' +
        '洞府里有灵田、丹房、器坊、聚灵阵，可以靠它吃饭，也可以靠它修炼。</div>';
      D.CAVE_TIERS.forEach(function (x, i) {
        html += '<div class="shop-row"><div class="sn">' + x.name +
          '<span class="tag" style="margin-left:6px">' + (i === 0 ? '起点' : '第 ' + (i + 1) + ' 级') + '</span>' +
          '<div style="font-size:11px;color:var(--ink-3)">' + esc(x.desc) + '</div>' +
          '<div style="font-size:11px;margin-top:2px">可放 ' + x.rooms + ' 间房 · 每年维护 ' + x.upkeep + ' 灵石</div></div>' +
          '<div class="sp">' + x.cost + '</div></div>';
      });
      html += canHere
        ? '<button class="btn btn-primary" id="cave-build" style="width:100%;margin-top:12px"' +
          (S.stones < 300 ? ' disabled' : '') + '>开 辟 洞 府（300 灵石）</button>'
        : '<div class="ev-text" style="color:var(--red)">这里开不了洞府。得去有灵脉、又没人管的地方。</div>';
      html += stoneLine();
      modal('洞 府', html);
      if (canHere) $('cave-build').onclick = function () {
        var r = CAVE.build(S.loc);
        toast(r.text);
        W.save(); renderAll();
        if (r.ok) openCave(); else closeModal();
      };
      return;
    }

    var html2 = '<div class="ev-text">' + esc(CAVE.caveTier().desc) + '</div>' +
      '<div class="npc-line"><span>等级</span><b>' + t.name + ' · ' + esc(W.LOC_MAP[S.cave.loc].name) + '</b></div>' +
      '<div class="npc-line"><span>房间</span><b>' + CAVE.roomCount() + ' / ' + t.rooms + '</b></div>' +
      '<div class="npc-line"><span>每年维护</span><b>' + t.upkeep + ' 灵石</b></div>';

    if (CAVE.tierIndex() < D.CAVE_TIERS.length - 1) {
      var nx = D.CAVE_TIERS[CAVE.tierIndex() + 1];
      html2 += '<button class="btn btn-ghost" id="cave-up" style="width:100%;margin:8px 0">扩 建 为 ' + nx.name +
        '（' + nx.cost + ' 灵石 · ' + W.stepName(nx.step) + '）</button>';
    }

    html2 += '<div class="sec-title" style="margin-top:12px">房 间<span>' + t.rooms + ' 间</span></div>';
    D.ROOM_ORDER.forEach(function (id) {
      var r = D.CAVE_ROOMS[id];
      var lv = CAVE.roomLevel(id);
      var cost = D.roomUpCost(id, lv + 1);
      var full = lv === 0 && CAVE.roomCount() >= t.rooms;
      html2 += '<div class="shop-row"><div class="sn">' + r.name +
        (lv > 0 ? '<span class="tag jade" style="margin-left:6px">' + lv + ' 级</span>' : '') +
        '<div style="font-size:11px;color:var(--ink-3)">' + esc(r.desc) + '</div>' +
        '<div style="font-size:11px;margin-top:2px;color:var(--ink-2)">' + esc(r.each) + '</div></div>' +
        (lv >= r.max
          ? '<div class="sp">已满级</div>'
          : '<button class="mini-btn" data-room="' + id + '"' + (full || S.stones < cost ? ' disabled' : '') + '>' +
            (lv > 0 ? '升级 ' : '建 ') + cost + '</button>') +
        '</div>';
    });

    var lvTian = CAVE.roomLevel('lingtian');
    if (lvTian > 0) {
      var st = CAVE.fieldState();
      html2 += '<div class="sec-title" style="margin-top:12px">灵 田<span>' + st.length + ' 畦</span></div>';
      html2 += '<div class="shop-row"><div class="sn">' + st.map(function (p) { return p ? '● 已种' : '○ 空'; }).join('　') +
        '<div style="font-size:11px;color:var(--ink-3)">撒种 20 灵石，一年一收，收成看灵田等级</div></div>' +
        '<button class="mini-btn" id="cave-plant"' + (S.stones < 20 ? ' disabled' : '') + '>播 种</button></div>';
    }

    if (CAVE.roomLevel('muren') > 0) {
      html2 += '<button class="btn btn-ghost" id="cave-dummy" style="width:100%;margin-top:14px">对 木 人 桩 试 招</button>';
    }
    html2 += stoneLine();
    modal('洞 府', html2);

    if ($('cave-up')) $('cave-up').onclick = function () {
      var r = CAVE.upgrade(); toast(r.text); W.save(); renderAll();
      if (r.ok) openCave(); else closeModal();
    };
    $('modal-body').querySelectorAll('[data-room]').forEach(function (b) {
      b.onclick = function () {
        var r = CAVE.buildRoom(b.getAttribute('data-room'));
        toast(r.text); W.save(); renderAll();
        if (r.ok) openCave(); else closeModal();
      };
    });
    if ($('cave-plant')) $('cave-plant').onclick = function () {
      var r = CAVE.plant(); toast(r.text); W.save(); openCave();
    };
    if ($('cave-dummy')) $('cave-dummy').onclick = function () { closeModal(); testDummy(); };
  }

  /* ---------------- 木人桩 ---------------- */
  function testDummy() {
    var st = W.stats();
    var def = Math.round(st.def * 1.6);
    var dummy = {
      name: '木人桩', row: 'front', faction: 'beast', realm: 0,
      hp: 999999, atk: 1, def: def, spd: 1, mana: 0, spells: []
    };
    var b = W.makeBattle([dummy]);
    var uid = b.enemies[0].uid;
    var bySpell = {};
    var total = 0, hits = 0, crits = 0, max = 0;
    for (var i = 0; i < b.events.length; i++) {
      var e = b.events[i];
      if (e.t === 'act' && e.uid === 'p') { var cur = e.spell; }
      if (e.t === 'hit' && e.uid === uid && e.dmg > 0) {
        var k = cur || '寻常一击';
        if (!bySpell[k]) bySpell[k] = { n: 0, sum: 0, max: 0 };
        bySpell[k].n++; bySpell[k].sum += e.dmg;
        if (e.dmg > bySpell[k].max) bySpell[k].max = e.dmg;
        total += e.dmg; hits++;
        if (e.crit) crits++;
        if (e.dmg > max) max = e.dmg;
      }
    }
    var rows = Object.keys(bySpell).sort(function (a, c) { return bySpell[c].sum - bySpell[a].sum; });
    var html = '<div class="ev-text">你对着木人桩打了 ' + (b.round || 0) + ' 个回合。桩子上刻了阵纹，每一击的力道都记着。' +
      '（按你现在的属性打一个防御 ' + def + ' 的靶子）</div>';
    if (!rows.length) {
      html += '<div class="ev-text" style="color:var(--red)">一次都没打中。……先把功法练起来。</div>';
    } else {
      html += '<div class="dm-table">' + rows.map(function (k) {
        var r = bySpell[k];
        return '<div class="dm-row"><span class="dm-n">' + esc(k) + '</span>' +
          '<span class="dm-v">' + r.n + ' 次</span>' +
          '<span class="dm-v">均 ' + Math.round(r.sum / r.n) + '</span>' +
          '<span class="dm-v hi">高 ' + r.max + '</span></div>';
      }).join('') + '</div>';
      html += '<div class="npc-line"><span>总伤害 / 命中 / 暴击</span><b>' + total + ' · ' + hits + ' · ' + crits + '</b></div>' +
        '<div class="npc-line"><span>平均每击 · 单击最高</span><b>' + Math.round(total / hits) + ' · ' + max + '</b></div>' +
        '<div class="npc-line"><span>平均每回合</span><b>' + Math.round(total / Math.max(1, b.round || 1)) + '</b></div>';
    }
    html += '<div class="ev-opts" style="margin-top:14px"><button class="ev-opt" id="dm-ok">收 手</button></div>';
    modal('木 人 桩', html);
    $('dm-ok').onclick = closeModal;
  }

  /* ---------------- 百宝阁 ---------------- */
  function openBaige() {
    var stock = CAVE.baigeStock();
    var html = '<div class="ev-text">百宝阁在南城最亮的一层，柜子里的东西都罩着灵光。伙计不抬头，只说一句：「看中哪件，报个价。」</div>';
    stock.forEach(function (it) {
      var can = S.stones >= it.price && !it.owned;
      html += '<div class="shop-row"><div class="sn">' + esc(it.name) +
        '<span class="tag' + (it.kind === 'fly' ? ' gold' : '') + '" style="margin-left:6px">' +
        (it.kind === 'fly' ? '飞行法器' : '法宝') + '</span>' +
        '<div style="font-size:11px;color:var(--ink-3)">' + esc(it.desc) + '</div></div>' +
        (it.owned
          ? '<div class="sp" style="color:var(--jade)">已有</div>'
          : '<button class="mini-btn" data-bg="' + it.id + '" data-kind="' + it.kind + '"' + (can ? '' : ' disabled') + '>' + it.price + '</button>') +
        '</div>';
    });
    html += stoneLine('飞行法器能缩短赶路时间。法宝可以炼化最多两件。');
    modal('百 宝 阁', html);
    $('modal-body').querySelectorAll('[data-bg]').forEach(function (b) {
      b.onclick = function () {
        var r = CAVE.buyAtBaige(b.getAttribute('data-bg'), b.getAttribute('data-kind'));
        toast(r.text); W.save(); renderAll();
        if (r.ok) openBaige(); else closeModal();
      };
    });
  }

  /* ---------------- 悬赏 ---------------- */
  function openBounty() {
    var list = CAVE.boardAt(S.loc);
    var html = '<div class="ev-text">' + esc(W.LOC_MAP[S.loc].name) +
      '的告示板，木板上钉着几张纸，边角都被人摸毛了。</div>';
    if (!list.length) html += '<div class="lib-empty">今年一张都没贴。</div>';
    list.forEach(function (b, i) {
      var kindName = D.BOUNTY_KINDS[b.kind].name;
      html += '<div class="shop-row"><div class="sn">' + esc(b.name) +
        '<span class="tag' + (b.done ? '' : ' gold') + '" style="margin-left:6px">' + kindName + '</span>' +
        '<div style="font-size:11px;color:var(--ink-3)">' +
        (b.kind === 'beast' ? '去把东西打回来' : b.kind === 'hunt' ? '把人带来，死活不论' :
          b.kind === 'gather' ? '凑齐材料交货' : '走一趟，路上可能有麻烦') +
        ' · 约 ' + b.days + ' 天</div></div>' +
        (b.done
          ? '<div class="sp" style="color:var(--ink-3)">已交</div>'
          : '<button class="mini-btn" data-bt="' + i + '">' + b.stones + '</button>') +
        '</div>';
    });
    html += stoneLine('悬赏按修为和当地危险度给价，比采药稳，但要么打，要么跑。');
    modal('悬 赏 榜', html);
    $('modal-body').querySelectorAll('[data-bt]').forEach(function (btn) {
      btn.onclick = function () { takeBounty(list[+btn.getAttribute('data-bt')]); };
    });
  }

  function takeBounty(b) {
    if (!b || b.done) return;
    closeModal();
    if (b.kind === 'guard') {
      W.advanceDays(b.days);
      var r = CAVE.finishBounty(b);
      toast(r.text); W.save(); renderAll();
      return;
    }
    if (b.kind === 'gather') {
      var need = 2;
      if (W.itemCount('herb') >= need) {
        W.addItem('herb', -need);
        var r2 = CAVE.finishBounty(b);
        toast(r2.ok ? '交了货。' + r2.text : '交不了。'); W.save(); renderAll();
      } else {
        toast('要交两株灵草，你身上不够。');
      }
      return;
    }
    var realm = Math.max(0, Math.min(3, b.tier));
    var foe = b.kind === 'hunt'
      ? W.banditUnit(realm, b.name)
      : W.beastUnit(realm, b.name);
    W.setPending({ type: 'bounty', bounty: b, preHp: S.hp });
    startBattle([foe], b.kind === 'hunt' ? '缉 拿' : '悬 赏',
      b.kind === 'hunt' ? '那人回头看了你一眼，手已经按在刀上。' : '草丛里响起一声低吼。');
  }

  function openShop() {
    var html = SHOP.map(function (id) {
      var it = D.ITEMS[id];
      var price = Math.round(it.price * 1.15);
      return '<div class="shop-row"><div class="sn">' + esc(it.name) +
        '<div style="font-size:11px;color:var(--ink-3)">' + esc(it.desc) + '</div></div>' +
        '<div class="sp">' + price + '</div>' +
        '<button class="mini-btn" data-buy="' + id + '"' + (S.stones < price ? ' disabled' : '') + '>买</button></div>';
    }).join('');
    html += '<div class="sec-title" style="margin-top:16px">卖 货<span>按六折收</span></div>';
    Object.keys(S.items).forEach(function (id) {
      var it = D.ITEMS[id];
      if (!it || it.use !== 'sell') return;
      html += '<div class="shop-row"><div class="sn">' + esc(it.name) + ' ×' + S.items[id] + '</div>' +
        '<div class="sp">' + Math.round(it.price * 0.6) + '</div>' +
        '<button class="mini-btn" data-sell="' + id + '">卖</button></div>';
    });
    html += '<div class="npc-line" style="margin-top:12px"><span>身上灵石</span><b>' + S.stones + '</b></div>';
    modal('坊 市', html);
    $('modal-body').querySelectorAll('[data-buy]').forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-buy');
        var price = Math.round(D.ITEMS[id].price * 1.15);
        if (S.stones < price) return;
        W.addStones(-price); W.addItem(id, 1);
        toast('买下' + D.ITEMS[id].name);
        W.save(); renderAll(); closeModal(); openShop();
      };
    });
    $('modal-body').querySelectorAll('[data-sell]').forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-sell');
        W.addItem(id, -1);
        W.addStones(Math.round(D.ITEMS[id].price * 0.6));
        W.save(); renderAll(); closeModal(); openShop();
      };
    });
  }

  /* =============================================================
     人物 / 功法
     ============================================================= */
  var libTab = 'all';
  var openTech = null;

  function enterBuild() {
    show('build');
    renderBuild();
  }
  $('btn-back').onclick = function () { show('map'); renderAll(); };

  function renderBuild() {
    $('stones').textContent = S.stones;
    $('build-title').textContent = '人物 · 功法';
    $('char-brief').textContent = W.stepName(S.step) + ' · 寿元 ' + Math.floor(W.age()) + '/' + W.lifespan();
    renderChar();
    renderTechSlots();
    renderSpellSlots();
    renderLib();
  }

  var LABELS = {
    hp: '气血', atk: '攻击', def: '防御', spd: '先手', mana: '法力', dmg: '伤害',
    crit: '暴击', ctrlHit: '控制命中', ctrlResist: '控制抵抗', healBonus: '疗伤',
    lifesteal: '吸血', evade: '闪避', hit: '命中', thorns: '反伤', take: '受到伤害',
    pierce: '破防', manaRegen: '法力回复', hpUpkeep: '气血流失', ghostResist: '阴伤抗性',
    takeHoly: '受正气伤', physReduce: '物理减伤', cheatDeath: '保命', poisonImmune: '毒免疫', breakBonus: '突破成功率'
  };
  var EL_KEY = { fire: '火', water: '水', wood: '木', earth: '土', metal: '金', ice: '冰', thunder: '雷', wind: '风', ghost: '阴', soul: '魂', blood: '血', phys: '力', sword: '剑', spirit: '神识' };

  function labelOf(k) {
    if (LABELS[k]) return LABELS[k];
    var m = k.match(/^(.+)Dmg$/);
    if (m) return (EL_KEY[m[1].toLowerCase()] || m[1]) + '系伤害';
    m = k.match(/^take(.+)$/);
    if (m) return '受' + (EL_KEY[m[1].toLowerCase()] || m[1]) + '伤';
    return k;
  }
  function passiveLines(p, max) {
    var out = [], els = [];
    Object.keys(p).forEach(function (k) {
      var v = p[k];
      if (!v || Math.abs(v) < 0.005) return;
      if (/Dmg$/.test(k)) { els.push(labelOf(k).replace('伤害', '') + ' ' + pct(v)); return; }
      if (k === 'manaRegen') { out.push('每回合法力 <b>+' + v + '</b>'); return; }
      if (k === 'hpUpkeep') { out.push('每回合流失 <b>' + Math.abs(v * 100).toFixed(1) + '%</b>'); return; }
      if (k === 'take') { out.push('受伤 <b>' + (v < 0 ? '+' : '-') + Math.abs(v * 100).toFixed(0) + '%</b>'); return; }
      if (k === 'cheatDeath') { out.push('每场一次<b>保命</b>'); return; }
      out.push(labelOf(k) + ' <b>' + pct(v) + '</b>');
    });
    if (els.length) out.unshift(els.join('　'));
    return max ? out.slice(0, max) : out;
  }
  function spellCost(id) {
    var c = window.SPELLS[id].cost || {}, o = [];
    if (c.mana) o.push('法力 ' + c.mana);
    if (c.stam) o.push('体力 ' + c.stam);
    if (c.hp) o.push('气血 ' + Math.round(c.hp * 100) + '%');
    return o.join(' / ') || '无消耗';
  }
  function spellLine(id) { return g_describe(id); }
  function g_describe(id) { return window.Engine.describe(window.SPELLS[id]).text; }

  function renderChar() {
    var st = W.stats();
    var info = W.stepInfo(S.step);
    var p = st.pct;
    var traits = S.traits.map(function (t, i) {
      return '<div class="trait-line ' + (i === 0 ? 'good' : 'bad') + '">' + (i === 0 ? '＋' : '－') + esc(t.name) + '：' + esc(t.desc) + '</div>';
    }).join('');
    var pass = passiveLines(p).map(function (s) { return '<div class="passive-line">' + s + '</div>'; }).join('');
    $('char-panel').innerHTML =
      '<div class="char-name">' + esc(S.name) + '</div>' +
      '<div class="char-realm">' + W.stepName(S.step) + ' · ' + Math.floor(W.age()) + ' / ' + W.lifespan() + ' 岁</div>' +
      '<div class="char-tags"><span class="tag gold">' + esc(S.root.name) + '</span>' +
      '<span class="tag jade">' + esc(S.identity.name) + '</span></div>' +
      '<div class="stat-list">' +
      '<div class="stat-row"><span>气血</span><b>' + st.hpMax + '</b></div>' +
      '<div class="stat-row"><span>法力</span><b>' + st.manaMax + '</b></div>' +
      '<div class="stat-row"><span>攻击</span><b>' + st.atk + '</b></div>' +
      '<div class="stat-row"><span>防御</span><b>' + st.def + '</b></div>' +
      '<div class="stat-row"><span>先手</span><b>' + st.spd + '</b></div>' +
      '</div>' +
      '<div class="char-section"><div class="char-section-t">特 质</div>' + traits + '</div>' +
      '<div class="char-section"><div class="char-section-t">法 宝</div>' +
      (S.treasure || S.treasure2
        ? [S.treasure, S.treasure2].map(function (tid, i) {
            return tid ? '<div class="passive-line" style="color:var(--gold-2)">' + (i ? '副：' : '主：') +
              esc(trDef(tid).name) + '　<span style="color:var(--jade)">' + esc(trDef(tid).desc) + '</span>' +
              '　<span style="color:var(--ink-3)">' + esc(trSpellName(tid)) + '</span></div>' : '';
          }).join('')
        : '<div class="passive-line" style="color:var(--ink-3)">没有法宝。去坊市炼，或者杀人抢。</div>') +
      '</div>' +
      '<div class="char-section"><div class="char-section-t">功 法 被 动</div>' + (pass || '<div class="passive-line" style="color:var(--ink-3)">尚未装备功法</div>') + '</div>';
  }

  function renderTechSlots() {
    var slots = [['main', '主 修'], ['sub', '辅 修']];
    $('tech-slots').innerHTML = slots.map(function (sl) {
      var id = sl[0] === 'main' ? S.mainTech : S.subTech;
      if (id && window.TECHS[id]) {
        var t = window.TECHS[id];
        return '<div class="tech-slot filled">' +
          '<div class="ts-k">' + sl[1] + ' · ' + grade(id) + ' · ' + esc(t.kind) + '</div>' +
          '<div class="ts-n">' + esc(t.name) + '</div>' +
          '<div class="ts-m">' + t.spells.length + ' 个法术 · 被动' + (sl[0] === 'sub' ? '减半' : '全效') + '</div></div>';
      }
      return '<div class="tech-slot empty"><div class="ts-k">' + sl[1] + '</div>' +
        '<div class="ts-n">在右侧功法库点「' + sl[1].replace(/ /g, '') + '」</div></div>';
    }).join('');
  }

  var CONDS = [
    ['', '无 条 件'],
    ['foeHigh', '敌血 > 60%（起手）'],
    ['foeLow', '敌血 < 35%（收尾）'],
    ['selfLow', '我血 < 50%（保命）'],
    ['shielded', '我有护盾时'],
    ['noBuff', '我无增益时'],
    ['manaHigh', '法力 > 60%'],
    ['many', '敌人两个以上']
  ];

  function moveSpell(from, to) {
    var n = S.loadout.length;
    if (from === to || from < 0 || from >= n || to < 0 || to >= n) return false;
    var it = S.loadout.splice(from, 1)[0];
    S.loadout.splice(to, 0, it);
    if (S.conds && S.conds.length) {
      var cv = S.conds[from];
      S.conds.splice(from, 1);
      S.conds.splice(to, 0, cv);
    }
    return true;
  }

  function renderSpellSlots() {
    if (!S.loadout.length) {
      $('spell-slots').innerHTML = '<div class="spell-slot empty"><div class="ss-body">你还未入门，一门功法也没有。<br>去落脚的地方走走——' +
        (D.START_HINT && D.START_HINT[S.loc] ? D.START_HINT[S.loc] : '总有人肯教你第一门功法。') + '</div></div>';
      return;
    }
    if (!S.conds) S.conds = [];
    $('spell-slots').innerHTML = S.loadout.map(function (id, i) {
      var s = window.SPELLS[id];
      if (!s) return '';
      var cur = S.conds[i] || '';
      return '<div class="spell-slot"><input class="ss-n" type="number" inputmode="numeric" ' +
        'min="1" max="' + S.loadout.length + '" value="' + (i + 1) + '" data-pos="' + i + '" ' +
        'title="填数字直接换到这个位次">' +
        '<div class="ss-body"><div class="ss-name">' + esc(s.name) +
        '<span class="ss-el" style="--el:' + elColor(s.el) + '">' + elName(s.el) + '</span>' +
        '<span class="ss-cost">' + spellCost(id) + (s.cd ? ' · 冷却 ' + s.cd : '') + '</span></div>' +
        '<div class="ss-desc">' + esc(spellLine(id)) + '</div>' +
        '<select class="ss-cond" data-cond="' + i + '">' +
        CONDS.map(function (c) {
          return '<option value="' + c[0] + '"' + (c[0] === cur ? ' selected' : '') + '>' + c[1] + '</option>';
        }).join('') + '</select></div>' +
        '<div class="ss-ops">' +
        '<button class="op-btn" data-up="' + id + '">↑</button>' +
        '<button class="op-btn" data-down="' + id + '">↓</button></div></div>';
    }).join('');
    $('spell-slots').querySelectorAll('[data-pos]').forEach(function (inp) {
      inp.onchange = function () {
        var from = parseInt(inp.getAttribute('data-pos'), 10);
        var to = parseInt(inp.value, 10) - 1;
        if (isNaN(to)) { renderSpellSlots(); return; }
        to = Math.max(0, Math.min(S.loadout.length - 1, to));
        if (moveSpell(from, to)) {
          W.save();
          toast('移到第 ' + (to + 1) + ' 位');
        }
        renderSpellSlots();
      };
      inp.onkeydown = function (ev2) { if (ev2.key === 'Enter') inp.blur(); };
    });
    $('spell-slots').querySelectorAll('[data-cond]').forEach(function (sel) {
      sel.onchange = function () {
        var i = parseInt(sel.getAttribute('data-cond'), 10);
        if (!S.conds) S.conds = [];
        S.conds[i] = sel.value;
        W.save();
        toast(sel.value ? '条件：' + sel.options[sel.selectedIndex].text : '取消条件');
      };
    });
  }

  function renderLib() {
    var tabs = [['all', '全部'], ['equipped', '已修'], ['learned', '未修']];
    $('lib-tabs').innerHTML = tabs.map(function (t) {
      return '<button class="lib-tab' + (libTab === t[0] ? ' on' : '') + '" data-tab="' + t[0] + '">' + t[1] + '</button>';
    }).join('');
    var isEq = function (id) { return id === S.mainTech || id === S.subTech; };
    var list = S.learned.filter(function (id) { return window.TECHS[id]; });
    if (libTab === 'equipped') list = list.filter(isEq);
    if (libTab === 'learned') list = list.filter(function (id) { return !isEq(id); });
    list.sort(function (a, b) {
      return window.gradeOf(a) - window.gradeOf(b) || a.localeCompare(b);
    });
    $('lib-count').textContent = '已学 ' + S.learned.length + ' 门';
    if (!list.length) {
      $('lib-list').innerHTML = '<div class="lib-empty">这里什么都没有。<br>功法要靠奇遇、宗门、杀人或特定剧情拿。</div>';
      return;
    }
    $('lib-list').innerHTML = list.map(function (id) {
      var t = window.TECHS[id];
      var isMain = id === S.mainTech, isSub = id === S.subTech;
      var open = openTech === id;
      var pass = passiveLines(window.Rules.techPassives([id]), 3).join('　');
      var body = '';
      if (open) {
        body += '<div class="lib-ops">';
        if (!isMain) body += '<button class="retrain-btn" data-main="' + id + '">主修 · ' + W.switchDays(id) + ' 天</button>';
        if (!isSub) body += '<button class="retrain-btn" data-sub="' + id + '">辅修 · ' + W.switchDays(id) + ' 天</button>';
        body += '</div>';
        body += '<div class="lib-spells">' + t.spells.map(function (sid) {
          var sp = window.SPELLS[sid];
          var inBar = S.loadout.indexOf(sid) >= 0;
          return '<div class="lib-spell"><span class="ls-name">' + esc(sp.name) + '</span>' +
            '<span class="ls-cost">' + spellCost(sid) + '</span>' +
            '<span class="ls-cd">' + (inBar ? '在法术栏' : (isMain || isSub ? '—' : '未修')) + '</span></div>';
        }).join('') + '</div>';
      }
      return '<div class="lib-item' + (open ? ' on' : '') + '" data-tech="' + id + '">' +
        '<div class="lib-head"><span class="lib-name">' + esc(t.name) + '</span>' +
        '<span class="lib-tier">' + grade(id) + '·' + esc(t.kind) + '</span>' +
        (isMain ? '<span class="lib-equip">主修</span>' : isSub ? '<span class="lib-equip">辅修</span>' : '') +
        '</div><div class="lib-passive">' + pass + '</div>' + body + '</div>';
    }).join('');
  }

  $('tech-slots').addEventListener('click', function () {
    toast('换功法去右侧功法库点「主修/辅修」，要耗时间');
  });

  $('spell-slots').addEventListener('click', function (e) {
    var up = e.target.closest('[data-up]'), down = e.target.closest('[data-down]'), del = e.target.closest('[data-del]');
    if (up || down) {
      var id = (up || down).getAttribute(up ? 'data-up' : 'data-down');
      var i = S.loadout.indexOf(id), j = i + (up ? -1 : 1);
      if (moveSpell(i, j)) { W.save(); renderSpellSlots(); }
    }
  });

  $('lib-tabs').addEventListener('click', function (e) {
    var b = e.target.closest('[data-tab]');
    if (!b) return;
    libTab = b.getAttribute('data-tab');
    renderLib();
  });

  $('lib-list').addEventListener('click', function (e) {
    var mainBtn = e.target.closest('[data-main]');
    var subBtn = e.target.closest('[data-sub]');
    if (mainBtn || subBtn) {
      e.stopPropagation();
      doRetrain(mainBtn ? 'main' : 'sub', (mainBtn || subBtn).getAttribute(mainBtn ? 'data-main' : 'data-sub'));
      return;
    }
    var row = e.target.closest('[data-tech]');
    if (!row) return;
    var id = row.getAttribute('data-tech');
    openTech = openTech === id ? null : id;
    renderBuild();
  });

  function doRetrain(slot, id) {
    var days = W.switchDays(id);
    modal('转 修', '<div class="ev-text">改修《' + esc(window.TECHS[id].name) + '》为' +
      (slot === 'main' ? '主修' : '辅修') + '，需静心 <b>' + days + '</b> 天。<br>' +
      '这些天里天南照常运转，不会等你。</div>' +
      '<div class="ev-opts">' +
      '<button class="ev-opt" id="rt-yes">开始转修（' + days + ' 天）</button>' +
      '<button class="ev-opt" id="rt-no">再想想</button></div>');
    $('rt-yes').onclick = function () {
      var res = W.retrain(slot, id);
      closeModal();
      afterAction({});
      enterBuild();
      modal('转 修', '<div class="ev-out">' + esc(res.text) + '</div>' +
        '<div class="ev-opts"><button class="ev-opt" id="rt-ok">好</button></div>');
      $('rt-ok').onclick = closeModal;
    };
    $('rt-no').onclick = closeModal;
  }

  /* =============================================================
     结局
     ============================================================= */
  function showEnd() {
    W.save();
    show('end');
    $('end-kicker').textContent = S.mode === 'hardcore' ? '硬 核 之 死' : '道 途 至 此';
    $('end-title').textContent = S.mode === 'hardcore' ? '身死' : (S.dead ? '寿终' : '身死');
    $('end-text').textContent = S.deadText || '你的故事在这里停住了。';
    $('end-stats').innerHTML =
      '<div class="end-stat">境界<b>' + W.stepName(S.step) + '</b></div>' +
      '<div class="end-stat">享年<b>' + Math.floor(W.age()) + '</b></div>' +
      '<div class="end-stat">杀人<b>' + S.kills + '</b></div>' +
      '<div class="end-stat">斗法<b>' + S.battles + '</b></div>';
    $('btn-again').onclick = function () {
      try { W.clear(); } catch (e) {}
      S = null;
      $('btn-resume').hidden = true;
      $('btn-start').textContent = '卜 一 卦';
      show('title');
    };
  }

  /* =============================================================
     其它
     ============================================================= */
  function renderLog() {
    var lines = S.log.slice(-6);
    $('log-strip').innerHTML = lines.map(function (l) {
      return '<div class="log-line ' + (l.cls || '') + '"><span class="day">第 ' + (l.day + 1) + ' 天</span>' + esc(l.text) + '</div>';
    }).join('');
    $('log-strip').scrollTop = $('log-strip').scrollHeight;
  }

  function renderAll() {
    if (!S) return;
    renderHud();
    renderMap();
    renderPanel();
    renderLog();
  }

  function showHelp() {
    modal('玩法', [
      '<p>天南是一张沙盒地图。时间会走，人会老，寿元尽了就死。</p>',
      '<h4>一、地点</h4>',
      '<p>点地图上的光点，再在右侧点「赶路」。地方越危险，遇到的事越狠。安全区能住店、买卖、打坐。</p>',
      '<h4>二、人</h4>',
      '<p>每个地方都有人。点开可以交谈、切磋、赌斗、结缘，也可以劫杀。杀掉会掉灵石，还有概率掉他的功法。凡人没有功法，杀了只会脏手。</p>',
      '<h4>三、功法</h4>',
      '<p>品阶分人、凡、地、天、帝、仙六阶。你只能同时修<b>一门主修 + 一门辅修</b>：主修被动全效、法术全开，辅修被动减半。</p>',
      '<p>换功法叫「转修」，要按品阶耗时间：人阶十天、凡阶二十五天、地阶两个月、天阶五个月、帝阶一年、仙阶两年。</p>',
      '<h4>四、修为</h4>',
      '<p>你从凡人开始，先要在青牛镇茶棚拿到一门入门功法，引气入体。之后闭关按年算（1/3/5/10 年）。</p>',
      '<p>修为涨得快慢看灵根：天灵根最快，五灵根极慢，四五行灵根基本得靠丹药堆。每次闭馆的收益还有浮动，越接近瓶颈越少。</p>',
      '<p>摸到瓶颈后闭关几乎无用，必须突破：打赢斗法会积累「历练」加成，破境丹再加两成。</p>',
      '<h4>五、代价</h4>',
      '<p>战斗后气血不会自动回满，要住店或吃药。杀人会涨凶名。死了在寻常模式掉修为回安全区，硬核模式删档。</p>'
    ].join(''));
  }

  $('btn-howto').onclick = showHelp;
  $('modal-close').onclick = closeModal;
  $('modal').addEventListener('click', function (e) { if (e.target === $('modal')) closeModal(); });
  document.querySelectorAll('.speed-btn[data-speed]').forEach(function (b) {
    b.onclick = function () {
      document.querySelectorAll('.speed-btn').forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      if (PB) PB.speed = parseInt(b.getAttribute('data-speed'), 10);
    };
  });
  $('btn-skip').onclick = function () {
    if (!PB || PB.done) return;
    PB.speed = 60;
    document.querySelectorAll('.speed-btn').forEach(function (x) { x.classList.remove('on'); });
  };
  $('btn-inspect').onclick = inspectBattle;
  $('btn-giveup').onclick = giveUp;

  /* ---------------- 启动 ---------------- */
  var loaded = W.load();
  if (loaded) {
    S = loaded;
    $('btn-resume').hidden = false;
    $('btn-start').textContent = '重 新 开 始';
  }

  window.addEventListener('error', function (ev) {
    var box = document.createElement('div');
    box.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:999;background:#3a1410;color:#ffd7cc;font:12px/1.6 monospace;padding:8px 12px;white-space:pre-wrap';
    box.textContent = '运行时错误：' + (ev.message || '') + '\n' + (ev.filename || '') + ':' + (ev.lineno || '');
    document.body.appendChild(box);
  });

  /* 调试直达 */
  var demo = (location.search.match(/demo=(\w+)/) || [])[1];
  if (demo) {
    rollAll();
    if (demo === 'roll') { show('roll'); renderRoll(); return; }
    S = W.newGame({
      mode: mode, name: '韩立', root: roll.root, identity: roll.identity,
      traits: roll.traits, learned: startTechs(roll.identity)
    });
    if (demo === 'map') {
      var qreg = (location.search.match(/reg=(\w+)/) || [])[1];
      if (qreg) mapRegion = qreg;
      show('map'); renderAll();
    }
    else if (demo === 'start') {
      var want = (location.search.match(/loc=(\w+)/) || [])[1] || 'shahai';
      S.loc = want; S.startLoc = want;
      W.refreshEncounter(want);
      W.ensureNpcs(want);
      show('map'); renderAll();
      var sp0 = W.specialAt(want);
      if (sp0) runSpecial(sp0);
    }
    else if (demo === 'chain') {
      var cq = (location.search.match(/c=(\w+)/) || [])[1] || 'jade';
      var cs = parseInt((location.search.match(/s=(\d+)/) || [])[1] || '0', 10);
      S.loc = 'qingniu'; S.step = 6; S.stones = 800; S.flags = {};
      W.setChain(cq, cs);
      W.refreshEncounter('qingniu');
      var cev = W.takeEncounter('qingniu') || W.encounterAt('qingniu');
      show('map'); renderAll();
      if (cev) showEvent(cev);
    }
    else if (demo === 'place') {
      var pid = (location.search.match(/pid=([\w]+)/) || [])[1] || 'q_lingyao';
      var pev = (D.PLACE_EVENTS || []).filter(function (e) { return e.id === pid; })[0];
      if (pev) {
        S.loc = pev.loc; S.step = 6; S.stones = 400;
        show('map'); renderAll(); showEvent(pev);
      }
    }
    else if (demo === 'cave') {
      var cl = D.LOCATIONS.filter(function (x) { return x.features && x.features.indexOf('cave') >= 0 && x.realmRec > 0; })[0];
      S.loc = cl.id; S.step = 5; S.stones = 5000;
      CAVE.build(S.loc);
      CAVE.buildRoom('muren'); CAVE.buildRoom('lingtian'); CAVE.buildRoom('danfang'); CAVE.plant();
      show('map'); renderAll(); openCave();
    }
    else if (demo === 'baige') {
      S.loc = 'jiayuan'; S.stones = 9000; S.realm = 2;
      show('map'); renderAll(); openBaige();
    }
    else if (demo === 'bounty') {
      S.loc = 'jiayuan'; S.stones = 200;
      show('map'); renderAll(); openBounty();
    }
    else if (demo === 'dummy') {
      show('map'); renderAll(); testDummy();
    }
    else if (demo === 'npc') {
      show('map'); renderAll();
      var n = W.npcsAt(S.loc)[0];
      if (n) openNpc(n.id);
    }
    else if (demo === 'event') {
      show('map'); renderAll();
      showEvent(W.rollEvent(S.loc));
    }
    else if (demo === 'build') { show('build'); renderBuild(); }
    else if (demo === 'bar') {
      S.step = 6; S.stones = 1200;
      W.grantTech('qingyuan1'); W.grantTech('changchun');
      S.mainTech = 'qingyuan1'; S.subTech = 'changchun';
      if (W.autoEquip) W.autoEquip();
      show('build'); renderBuild();
    }
    else if (demo === 'battle') {
      show('map'); renderAll();
      var npc2 = W.npcsAt(S.loc).filter(function (x) { return !x.mortal; })[0] || W.npcsAt(S.loc)[0];
      var sp = W.spar(npc2, 0);
      startBattle([sp.battle], '切 磋', npc2.name + ' 抬手：「点到为止。」');
    }
    else if (demo === 'end') { S.dead = true; S.deadText = '你死在了一个没有名字的地方。'; showEnd(); }
    else if (demo === 'restart') {
      S.dead = true; S.deadText = '测试。'; showEnd();
      setTimeout(function () { document.getElementById('btn-again').click(); }, 120);
    }
    else if (demo === 'auction') {
      S.loc = 'jiayuan'; S.stones = 3000;
      show('map'); renderAll(); openAuction();
    }
    else if (demo === 'sect') {
      W.joinSect('huangfeng');
      S.loc = 'huangfeng'; S.step = 6;
      S.sect.rank = 2; S.sect.contribution = 900; S.sect.faction = 'jian';
      W.chooseFaction('jian');
      show('map'); renderAll(); openSect();
    }
    else if (demo === 'meditate') {
      show('map'); renderAll(); openMeditate();
    }
    else if (demo === 'special') {
      show('map'); renderAll();
      var sp = W.specialAt('qingniu'); if (sp) runSpecial(sp);
    }
    else if (demo === 'retrain') {
      show('build'); renderBuild();
      setTimeout(function () { doRetrain('main', S.learned[S.learned.length - 1]); }, 100);
    }
    else if (demo === 'flow') { runFlow(); }

    function runFlow() {
      var npc = W.npcsAt(S.loc).filter(function (n) { return !n.mortal; })[0];
      if (npc) { var k = W.kill(npc); startBattle([k.battle], '劫杀', 'flow'); }
      var t = setInterval(function () {
        var ov = $('result-overlay');
        if (ov.hidden) return;
        clearInterval(t);
        var back = document.getElementById('r-back');
        if (back) back.click();
        setTimeout(function () {
          try {
            var target = W.D.LOCATIONS.filter(function (l) { return l.tier === 1; })[0];
            travelTo(target.id);
          } catch (e) { console.error('flow travel', e.message); }
          setTimeout(function () {
            try {
              closeModal();
              doAction('meditate');
              closeModal();
              W.state().cult = 99999;
              doBreak(false);
              closeModal();
              enterBuild();
              setTimeout(function () { show('map'); renderAll(); }, 200);
            } catch (e2) { console.error('flow tail', e2.message); }
          }, 400);
        }, 400);
      }, 100);
    }
  }
})();
