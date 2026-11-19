/* =============================================================
   世界层 v2：主修/辅修、NPC 生涯、奇遇、因果
   ============================================================= */
(function (g) {
  'use strict';

  var D = g.WORLD_DATA;
  var Engine = g.Engine;
  var Rules = g.Rules;

  var LAYER_COUNTS = [13, 4, 3, 3, 3];
  var REALM_NAMES = ['炼气期', '筑基期', '金丹期', '元婴期', '化神期'];
  var LAYER_NAMES = {
    0: ['一层', '二层', '三层', '四层', '五层', '六层', '七层', '八层', '九层', '十层', '十一层', '十二层', '十三层'],
    1: ['初期', '中期', '后期', '圆满'],
    2: ['初期', '中期', '后期'],
    3: ['初期', '中期', '后期'],
    4: ['初期', '中期', '后期']
  };
  var REALM_BASE = [
    { hp: 300, atk: 100, def: 18, spd: 100, mana: 140 },
    { hp: 760, atk: 165, def: 42, spd: 112, mana: 260 },
    { hp: 1650, atk: 265, def: 78, spd: 126, mana: 430 },
    { hp: 3400, atk: 420, def: 118, spd: 142, mana: 640 },
    { hp: 6400, atk: 640, def: 162, spd: 160, mana: 900 }
  ];
  var LIFESPAN = [120, 300, 600, 1200, 2400];
  var NEED = [420, 3000, 15000, 50000, 150000];
  var GAIN = [44, 90, 200, 420, 800];
  var ROOT_CULT = { tian: 2.0, shuang: 1.45, san: 1.0, si: 0.55, wu: 0.35, lei: 1.7, bing: 1.7, an: 1.6 };
  var YEAR_GAIN = [220, 620, 1800, 5200, 14000];
  var REALM_SPEED = [4.0, 2.4, 1.5, 1.0, 0.7, 0.5];

  var LOC_MAP = {};
  D.LOCATIONS.forEach(function (l) { LOC_MAP[l.id] = l; });

  var S = null;
  var pending = null;

  /* ---------------- 基础换算 ---------------- */
  function stepInfo(step) {
    if (step < 0) return { realm: -1, layer: 0, index: step };
    var s = step, r = 0;
    while (r < LAYER_COUNTS.length && s >= LAYER_COUNTS[r]) { s -= LAYER_COUNTS[r]; r++; }
    if (r >= LAYER_COUNTS.length) { r = 4; s = LAYER_COUNTS[4] - 1; }
    return { realm: r, layer: s, index: step };
  }
  function stepOf(realm, layer) {
    var i = 0;
    for (var r = 0; r < realm; r++) i += LAYER_COUNTS[r];
    return i + layer;
  }
  function stepName(step) {
    if (step < 0) return '凡人';
    var i = stepInfo(step);
    return REALM_NAMES[i.realm] + LAYER_NAMES[i.realm][i.layer];
  }
  function isLastLayer(step) {
    if (step < 0) return false;
    var i = stepInfo(step);
    return i.layer === LAYER_COUNTS[i.realm] - 1;
  }
  function needFor(step) {
    if (step < 0) return 1;
    var i = stepInfo(step);
    return Math.round(NEED[i.realm] * (1 + i.layer * 0.12));
  }
  function lifespan() { return S.step < 0 ? 80 : LIFESPAN[stepInfo(S.step).realm]; }
  function age() { return 16 + S.day / 365; }
  function gradeOf(id) { return g.gradeOf(id); }

  function merge() {
    var out = {};
    for (var i = 0; i < arguments.length; i++) {
      var src = arguments[i] || {};
      for (var k in src) out[k] = (out[k] || 0) + src[k];
    }
    return out;
  }
  function half(p) {
    var o = {};
    for (var k in p) o[k] = p[k] * 0.5;
    return o;
  }

  /* ---------------- 建号 ---------------- */
  function pickWeighted(arr) {
    var total = 0, i;
    for (i = 0; i < arr.length; i++) total += (arr[i].w || 1);
    var r = Math.random() * total;
    for (i = 0; i < arr.length; i++) { r -= (arr[i].w || 1); if (r <= 0) return arr[i]; }
    return arr[arr.length - 1];
  }

  function newGame(opts) {
    opts = opts || {};
    S = {
      version: 2,
      mode: opts.mode || 'normal',
      name: opts.name || '无名散修',
      root: opts.root || (g.ROOTS && g.ROOTS[0]) || { id: 'wu', name: '五灵根', els: ['fire', 'water', 'wood', 'earth', 'metal'] },
  identity: opts.identity || (g.IDENTITIES && g.IDENTITIES[0]) || { id: 'san', name: '散修', pct: {}, techs: [] },
  traits: opts.traits || [],
      step: -1, cult: 0,
      hp: 0, mana: 0,
      stones: 60,
      items: { heal: 2, mana: 1 },
      learned: [],
      battleBonus: 0, dao: 60,
      treasures: [], treasure: null, treasure2: null,
      mainTech: null, subTech: null, loadout: [], conds: [],
      sect: null,
      loc: 'qingniu', startLoc: 'qingniu',
      day: 0, year: 0,
      fame: 0, notoriety: 0, bloodDebt: 0,
      npcs: {}, npcSeed: (Math.random() * 1e9) | 0,
      encounters: {}, flags: {}, hunter: null, mail: [], npcSeq: 0,
      log: [], dead: false, deadText: '',
      kills: 0, battles: 0, wins: 0, quests: {}
    };
    initWorld();
    /* 开局地点：六大口岸之一，不再固定青牛镇 */
    var starts = D.START_LOCS || [];
    var pick = starts.length ? pickWeighted(starts) : null;
    var startId = opts.start || (pick ? pick.id : 'qingniu');
    S.loc = startId; S.startLoc = startId;
    autoStudy();
    var st = stats();
    S.hp = st.hpMax; S.mana = st.manaMax;
    ensureNpcs(startId);
    refreshEncounter(startId);
    if (pick && pick.id === startId) {
      log(pick.text.split('\n\n')[0], 'sys');
    } else {
      log('你在' + (LOC_MAP[startId] || { name: '某处' }).name + '醒来。身上只有六十块灵石。', 'sys');
    }
    return S;
  }

  function spellsOf(main, sub) {
    var out = [];
    [S.treasure, S.treasure2].forEach(function (tid) {
      if (!tid) return;
      var t = treasureDef(tid);
      if (t && t.spell && out.indexOf(t.spell) < 0) out.push(t.spell);
    });
    [main === undefined ? S.mainTech : main, sub === undefined ? S.subTech : sub].forEach(function (t) {
      if (!t || !g.TECHS[t]) return;
      g.TECHS[t].spells.forEach(function (s) { if (out.indexOf(s) < 0) out.push(s); });
    });
    return out;
  }
  function spellScore(sid) {
    var v = 0;
    (g.SPELLS[sid].effects || []).forEach(function (e) {
      if (e.k === 'dmg') v += e.amt * (e.hits || 1);
      if (e.k === 'dot') v += e.amt * (e.turns || 1) * 0.8;
    });
    return v;
  }
  /* 主修 + 辅修的全部法术，按强度排一遍 */
  function autoLoadout() {
    var sp = spellsOf().slice();
    var dm = sp.filter(function (s) {
      return (g.SPELLS[s].effects || []).some(function (e) { return e.k === 'dmg'; });
    }).sort(function (a, b) { return spellScore(b) - spellScore(a); });
    var guard = sp.filter(function (s) {
      return (g.SPELLS[s].effects || []).some(function (e) {
        return e.k === 'shield' || e.k === 'heal' || e.k === 'untargetable' ||
          (e.k === 'buff' && (e.stat === 'dmgReduce' || e.stat === 'def'));
      });
    });
    var out = [];
    if (dm[0]) out.push(dm[0]);
    if (guard[0]) out.push(guard[0]);
    dm.slice(1).forEach(function (s) { if (out.indexOf(s) < 0) out.push(s); });
    sp.forEach(function (s) { if (out.indexOf(s) < 0) out.push(s); });
    return out;
  }

  /* 转修后保住原来的排序，把新法术接在后面 */
  function rebuildLoadout() {
    var all = spellsOf();
    var ordered = S.loadout.filter(function (s) { return all.indexOf(s) >= 0; });
    all.forEach(function (s) { if (ordered.indexOf(s) < 0) ordered.push(s); });
    S.loadout = ordered;
  }

  function autoStudy() {
    var cand = S.learned.filter(function (id) { return g.TECHS[id]; });
    cand.sort(function (a, b) {
      return gradeOf(b) - gradeOf(a) || dmgCount(b) - dmgCount(a);
    });
    S.mainTech = cand[0] || null;
    S.subTech = cand[1] || null;
    S.loadout = autoLoadout();
  }
  function dmgCount(t) {
    return g.TECHS[t].spells.filter(function (s) {
      return (g.SPELLS[s].effects || []).some(function (e) { return e.k === 'dmg'; });
    }).length;
  }

  /* ---------------- 属性 ---------------- */
  function treasureDef(id) {
    return (D.TREASURES || []).filter(function (t) { return t.id === id; })[0] || null;
  }
  function sectDef() { return (S.sect && D.SECTS) ? D.SECTS[S.sect.id] : null; }
  function sectAt(locId) {
    var out = null;
    Object.keys(D.SECTS || {}).forEach(function (k) {
      if (D.SECTS[k].loc === locId) out = D.SECTS[k];
    });
    return out;
  }
  function sectPct() {
    var p = {};
    if (!S.sect) return p;
    var f = S.sect.faction;
    if (f === 'jian') p.swordDmg = (p.swordDmg || 0) + 0.08;
    if (f === 'dan') p.healBonus = (p.healBonus || 0) + 0.1;
    if (f === 'xue') p.lifesteal = (p.lifesteal || 0) + 0.06;
    if (f === 'hun') p.soulDmg = (p.soulDmg || 0) + 0.1;
    if (S.sect.rank >= 2) p.dmg = (p.dmg || 0) + 0.04;
    if (S.sect.rank >= 4) p.hp = (p.hp || 0) + 0.05;
    return p;
  }
  function pctOf() {
    var pMain = S.mainTech ? Rules.techPassives([S.mainTech]) : {};
    var pSub = S.subTech ? half(Rules.techPassives([S.subTech])) : {};
    var tr = S.treasure ? (treasureDef(S.treasure) || {}).pct : null;
    var tr2 = S.treasure2 ? half((treasureDef(S.treasure2) || {}).pct || {}) : null;
    return merge(g.rootPct(S.root), S.identity.pct, pMain, pSub, tr, tr2, sectPct(),
      (S.traits || []).reduce(function (a, t) { return merge(a, t.pct); }, {}));
  }

  function stats() {
    if (S.step < 0) {
      return { hpMax: 120, atk: 15, def: 4, spd: 90, manaMax: 20, pct: {}, realm: -1, layer: 0, step: -1, name: '凡人' };
    }
    var info = stepInfo(S.step);
    var base = REALM_BASE[info.realm];
    var mul = 1 + 0.035 * info.layer;
    var pct = pctOf();
    function v(k, b) { return Math.round(b * (1 + (pct[k] || 0))); }
    return {
      hpMax: v('hp', base.hp * mul),
      atk: v('atk', base.atk * mul),
      def: v('def', base.def * mul),
      spd: v('spd', base.spd),
      manaMax: v('mana', base.mana),
      pct: pct, realm: info.realm, layer: info.layer, step: S.step,
      name: stepName(S.step)
    };
  }

  /* ---------------- 时间 ---------------- */
  function advanceDays(n, silent) {
    S.day += n;
    if (age() >= lifespan()) {
      S.dead = true;
      S.deadText = '寿元耗尽。你活到了 ' + Math.floor(age()) + ' 岁，终究没能再进一步。';
      return { dead: true };
    }
    if (!silent) yearTick();
    return { dead: false };
  }

  var lastYear = 0;
  function yearTick() {
    var y = Math.floor(S.day / 365);
    if (y <= lastYear) return;
    for (var yy = lastYear + 1; yy <= y; yy++) {
      S.year = yy;
      log('—— 第 ' + (yy + 1) + ' 年 ——', 'sys');
      tickNpcs();
      refreshEncounters();
      sectYearly();
      worldYearly();
      if (g.CAVE && g.CAVE.yearly) g.CAVE.yearly();
    }
    lastYear = y;
  }

  function tickNpcs() {
    var dead = [];
    var canonCount = {};
    (D.CANON || []).forEach(function (c) { canonCount[c.loc] = (canonCount[c.loc] || 0) + 1; });

    Object.keys(S.npcs).forEach(function (locId) {
      var arr = S.npcs[locId];
      arr.forEach(function (n) {
        if (!n.alive) return;
        n.age = (n.age || 20) + 1;
        var life = LIFESPAN[n.realm] || 80;
        var pDie = n.mortal ? 0.055 : 0.012;
        if (n.age > life * 0.88) pDie += 0.16;
        if (Math.random() < pDie) {
          n.alive = false;
          dead.push(n);
          return;
        }

        /* 修为：绝大多数人一辈子挪不了几层 */
        var info = stepInfo(n.step);
        var talent = n.talent == null ? 0.35 : n.talent;
        var baseRate = [0.09, 0.045, 0.018, 0.007, 0.003][info.realm] || 0.003;
        if (Math.random() < baseRate * (0.35 + talent * 1.8)) {
          if (isLastLayer(n.step)) {
            /* 大境界：十不存一 */
            var bc = 0.08 + talent * 0.28 + (n.treasure ? 0.05 : 0);
            var roll = Math.random();
            if (roll < bc) {
              n.step += 1;
              n.realm = stepInfo(n.step).realm;
              n.bio.push('破境成功，踏入' + stepName(n.step) + '。');
            } else if (roll > 0.82) {
              n.alive = false;
              n.bio.push('破境失败，身死道消。');
              dead.push(n);
            } else {
              n.hpMul = Math.max(0.8, (n.hpMul || 1) * 0.9);
              n.bio.push('破境失败，重伤闭关。');
            }
          } else {
            n.step += 1;
            n.realm = stepInfo(n.step).realm;
            if (Math.random() < 0.35) n.bio.push('修为精进，已是' + stepName(n.step) + '。');
          }
        }

        if (Math.random() < 0.3) n.bio.push(bioLine(n));
        if (n.bio.length > 8) n.bio = n.bio.slice(-8);

        /* 结缘：交情够的人会来找你 */
        if (!n.mortal && n.relation >= 45 && Math.random() < 0.14) {
          S.mail.push({ npcId: n.id, loc: locId });
        }
      });

      /* 死者退场 */
      dead.forEach(function (n) { if (n.loc === locId) log(n.name + '死了。' + (n.origin === 'canon' ? '' : LOC_MAP[locId].name + '少了一个人。'), 'sys'); });
      S.npcs[locId] = arr.filter(function (n) { return n.alive; });

      /* 补新人，别让格子空着 */
      var want = (LOC_MAP[locId].crowd || []).reduce(function (a, p) { return a + p[1]; }, 0) + (canonCount[locId] || 0);
      var have = S.npcs[locId].length;
      var rng = seeded((S.npcSeq || 1) * 7919 + S.day);
      var crowd = LOC_MAP[locId].crowd || [];
      while (have < want && crowd.length) {
        var pair = crowd[Math.floor(rng() * crowd.length)];
        S.npcs[locId].push(makeNpc(locId, rng, pair[0]));
        have++;
      }
    });
  }

  function bioLine(n) {
    var pool = D.BIOS || ['在外游历了一年。'];

    var t = pool[Math.floor(Math.random() * pool.length)];
    return t.replace('{loc}', LOC_MAP[n.loc].name);
  }

  /* ---------------- 日志 ---------------- */
  function log(text, cls) {
    S.log.push({ day: S.day, text: text, cls: cls || '' });
    if (S.log.length > 240) S.log.shift();
  }

  /* ---------------- 资源 ---------------- */
  function addStones(n) { S.stones = Math.max(0, S.stones + n); }
  function addItem(id, n) {
    S.items[id] = (S.items[id] || 0) + n;
    if (S.items[id] <= 0) delete S.items[id];
  }
  function itemCount(id) { return S.items[id] || 0; }
  function addFame(n) { S.fame += n; }
  function addNotoriety(n) { S.notoriety += n; }

  /* 只要会了任何一门功法，就不该再算凡人——老存档/直推 learned 的事件都靠这里兜住 */
  function ensureQiEntry() {
    if (S.step >= 0) return false;
    if (!S.learned || !S.learned.length) return false;
    S.step = 0;
    S.cult = 0;
    if (!S.mainTech) S.mainTech = S.learned[0];
    var st = stats();
    S.hp = st.hpMax;
    S.mana = st.manaMax;
    if (!S.loadout || !S.loadout.length) S.loadout = autoLoadout();
    return true;
  }

  function grantTech(id) {
    if (!g.TECHS[id]) return '';
    if (S.learned.indexOf(id) >= 0) return '这门功法你已经会了。';
    S.learned.push(id);
    var mortalBefore = S.step < 0;
    if (mortalBefore) {
      S.step = 0; S.cult = 0;
      var st0 = stats();
      S.hp = st0.hpMax; S.mana = st0.manaMax;
    }
    if (!S.mainTech) { S.mainTech = id; S.loadout = autoLoadout(); }
    return '得《' + g.TECHS[id].name + '》（' + g.GRADES[gradeOf(id)] + '）。' +
      (mortalBefore ? '\n\n一股气从丹田升起——你引气入体了。' : '');
  }
  function grantTechAny(pool) {
    var avail = (pool || Object.keys(g.TECHS)).filter(function (id) {
      return g.TECHS[id] && S.learned.indexOf(id) < 0;
    });
    if (!avail.length) return '……什么都没有。';
    avail.sort(function (a, b) { return gradeOf(b) - gradeOf(a); });
    var id = avail[Math.floor(Math.random() * Math.min(4, avail.length))];
    return grantTech(id);
  }

  function evilPlayer() {
    var t = [S.mainTech, S.subTech].filter(Boolean).map(function (id) { return g.TECHS[id]; });
    return t.some(function (x) { return /魔|邪|鬼|尸|血/.test(x.kind || ''); });
  }

  /* ---------------- NPC ---------------- */
  var ARCH = {
    mortal: { step: [0, 0], mortal: true, techs: 0, hpMul: 0.3, wealth: [8, 30] },
    lianqi: { step: [1, 10], techs: [2, 4], hpMul: 1, wealth: [20, 90] },
    zhuji: { step: [13, 16], techs: [3, 5], hpMul: 1, wealth: [80, 260] },
    jindan: { step: [17, 19], techs: [4, 6], hpMul: 1, wealth: [300, 800] },
    yuanying: { step: [20, 22], techs: [4, 6], hpMul: 1, wealth: [900, 2000] },
    beast: { step: [1, 6], techs: 0, hpMul: 1.3, wealth: [0, 20], faction: 'beast' },
    bandit: { step: [2, 9], techs: [2, 3], hpMul: 1, wealth: [30, 120], personality: 'yin' },
    guard: { step: [13, 15], techs: [3, 5], hpMul: 1.1, wealth: [60, 160], personality: 'xia' },
    demon: { step: [10, 18], techs: [3, 5], hpMul: 1.05, wealth: [120, 500], faction: 'demon', personality: 'yin' }
  };

  function seeded(seed) {
    var a = seed | 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pickWith(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

  function npcName(rng, realm) {
    if (realm >= 2) return pickWith(rng, D.DAOHAO) + pickWith(rng, ['上人', '真人', '道人']);
    return pickWith(rng, D.SURNAMES) + pickWith(rng, D.GIVEN);
  }

  function genNpcs(locId) {
    var loc = LOC_MAP[locId];
    var rng = seeded(S.npcSeed + locId.length * 7919 + locId.charCodeAt(0) * 131 + locId.charCodeAt(1) * 17);
    var out = [];

    (D.CANON || []).forEach(function (c, ci) {
      if (c.loc !== locId) return;
      out.push({
        id: c.id, loc: locId, name: c.name, arch: 'canon', step: c.step,
        realm: stepInfo(c.step).realm, personality: c.personality,
        faction: c.faction, mortal: false, techs: (c.techs || []).filter(function (t) { return g.TECHS[t]; }),
        wealth: c.wealth, relation: 0, alive: true, giftGiven: false, hpMul: 1,
        desc: c.note, note: c.note, origin: 'canon', talent: 0.85, treasure: null,
        bio: c.bio.slice(), age: c.age || (40 + ci * 7 + Math.floor(rng() * 30)), grudge: false
      });
    });

    (loc.crowd || []).forEach(function (pair) {
      for (var i = 0; i < pair[1]; i++) out.push(makeNpc(locId, rng, pair[0]));
    });
    return out;
  }

  function makeNpc(locId, rng, archKey) {
    var arch = ARCH[archKey] || ARCH.lianqi;
    var step = arch.mortal ? -1 : arch.step[0] + Math.floor(rng() * (arch.step[1] - arch.step[0] + 1));
    var info = stepInfo(step);
    var personality = arch.personality || pickWith(rng, ['xia', 'hao', 'jin', 'yin', 'chi', 'shi']);
    var techs = [];
    var grudge = false;
    if (arch.techs && !arch.mortal) {
      var r0 = rng();
      if (r0 < 0.13 && info.realm >= 1) {
        var strongPool = Object.keys(g.TECHS).filter(function (id) {
          return gradeOf(id) >= 2 && gradeOf(id) <= 3;
        });
        if (strongPool.length) {
          techs = [strongPool[Math.floor(rng() * strongPool.length)]];
          grudge = true;
        }
      } else if (r0 < 0.42) {
        var pool = Object.keys(g.TECHS).filter(function (id) {
          var t = g.TECHS[id];
          return t.realm <= info.realm && gradeOf(t) <= (info.realm === 0 ? 1 : info.realm + 1);
        });
        if (pool.length) techs = [pool[Math.floor(rng() * pool.length)]];
      }
    }
    var wealth = Math.round(arch.wealth[0] + rng() * (arch.wealth[1] - arch.wealth[0]));
    var npcTres = null;
    if (!arch.mortal && info.realm >= 2 && rng() < 0.45) {
      var tl = (D.TREASURES || []);
      if (tl.length) npcTres = tl[Math.floor(rng() * tl.length)].id;
    } else if (!arch.mortal && info.realm <= 1 && rng() < 0.04) {
      var tl2 = (D.TREASURES || []);
      if (tl2.length) { npcTres = tl2[tl2.length - 1].id; grudge = true; }
    }
    /* 天赋：绝大多数平庸，极少数是天之骄子 */
    var tR = rng();
    var talent = tR < 0.03 ? 0.92 : tR < 0.15 ? 0.7 : 0.25 + rng() * 0.35;
    var nMortal = !!arch.mortal;
    S.npcSeq = (S.npcSeq || 0) + 1;
    return {
      id: locId + '_n' + S.npcSeq, loc: locId,
      name: nMortal ? npcName(rng, 0) : npcName(rng, info.realm),
      arch: archKey, step: step, realm: info.realm,
      personality: personality, faction: arch.faction || 'human',
      mortal: nMortal, techs: techs, wealth: wealth, relation: 0, alive: true,
      giftGiven: false, hpMul: arch.hpMul || 1, origin: 'random', grudge: grudge,
      treasure: npcTres, talent: talent,
      desc: npcDesc(archKey, info.realm, personality),
      bio: [firstBio(rng, locId)], age: nMortal ? 20 + Math.floor(rng() * 50) : 18 + Math.floor(rng() * 60)
    };
  }

  function firstBio(rng, locId) {
    var t = pickWith(rng, (D.BIO_FIRST && D.BIO_FIRST.length) ? D.BIO_FIRST : ['出身{home}。']);
    return t.replace('{home}', LOC_MAP[locId].name);
  }

  function npcDesc(archKey, realm, personality) {
    var p = D.PERSONALITIES[personality];
    var role = {
      mortal: '凡人', lianqi: '炼气散修', zhuji: '筑基修士', jindan: '金丹修士',
      yuanying: '元婴修士', beast: '妖兽', bandit: '邪修', guard: '商队护院',
      demon: '魔修', canon: '名人'
    }[archKey] || '修士';
    return role + ' · ' + p.name;
  }

  function ensureNpcs(locId) {
    if (!S.npcs[locId]) S.npcs[locId] = genNpcs(locId);
  }
  function npcsAt(locId) {
    ensureNpcs(locId);
    return S.npcs[locId].filter(function (n) { return n.alive; });
  }
  function findNpc(id) {
    for (var k in S.npcs) {
      for (var i = 0; i < S.npcs[k].length; i++) if (S.npcs[k][i].id === id) return S.npcs[k][i];
    }
    return null;
  }

  /* 印象：身份 + 功法 + 名声 */
  function attitude(npc) {
    var v = 0;
    var evil = evilPlayer();
    if (npc.faction === 'demon') v += evil ? 20 : -28;
    else if (npc.faction === 'beast') v -= 60;
    else v += evil ? -26 : 6;
    v += Math.min(18, S.fame * 0.35);
    v -= Math.min(35, S.notoriety * 0.45);
    v += Math.max(-30, Math.min(30, npc.relation * 0.35));
    if (npc.origin === 'canon') v += 4;
    return Math.round(v);
  }
  function attitudeLabel(v) {
    if (v >= 35) return '顺眼';
    if (v >= 12) return '平常';
    if (v >= -12) return '冷淡';
    if (v >= -35) return '厌恶';
    return '敌意';
  }
  /* 点开就可能挨打 */
  function openRisk(npc) {
    if (!npc.alive || npc.mortal) return 0;
    var a = attitude(npc);
    if (a > -20) return 0;
    var p = 0.10;
    if (npc.personality === 'yin') p += 0.18;
    if (npc.faction === 'demon' && !evilPlayer()) p += 0.12;
    if (S.notoriety > 60) p += 0.08;
    if (npc.origin === 'canon') p += 0.05;
    return Math.min(0.75, p * dangerMul() + hostileDanger(npc.loc || S.loc));
  }

  /* ---------------- 奇遇 ---------------- */
  function setChain(id, step) {
    S.chains = S.chains || {};
    S.chains[id] = step;
  }
  function chainStep(id) {
    return (S.chains && S.chains[id]) || 0;
  }

  function refreshEncounter(locId) {
    /* 连续事件优先：进度对得上、地点也对得上，就先给它 */
    var chainPool = (D.CHAIN_EVENTS || []).filter(function (e) {
      var prog = chainStep(e.chain);
      if (prog < 0) return false;
      var want = prog === 0 ? 1 : prog;
      return e.step === want && (!e.loc || e.loc === locId);
    });
    if (chainPool.length && Math.random() < 0.75) {
      var ce = chainPool[Math.floor(Math.random() * chainPool.length)];
      S.encounters[locId] = { id: ce.id, taken: false };
      return;
    }
    var reg = (LOC_MAP[locId] || {}).region;
    var pool = (D.EXTRA_EVENTS || []).concat(D.CHAIN_EVENTS || [])
      .filter(function (e) {
        if (e.loc && e.loc !== locId) return false;
        if (e.reg && e.reg !== reg) return false;
        return true;
      });
    if (!pool.length) pool = D.EXTRA_EVENTS || [];
    if (!pool.length) return;
    var ev = pool[Math.floor(Math.random() * pool.length)];
    S.encounters[locId] = { id: ev.id, taken: false };
  }
  function refreshEncounters() {
    Object.keys(S.encounters).forEach(function (id) {
      if (S.encounters[id].taken) refreshEncounter(id);
    });
    D.LOCATIONS.forEach(function (l) {
      if (!S.encounters[l.id]) refreshEncounter(l.id);
    });
  }
  function encounterAt(locId) {
    var e = S.encounters[locId];
    if (!e) { refreshEncounter(locId); e = S.encounters[locId]; }
    if (e.taken) return null;
    return (D.EXTRA_EVENTS || []).concat(D.CHAIN_EVENTS || [])
      .filter(function (x) { return x.id === e.id; })[0] || null;
  }
  function takeEncounter(locId) {
    var ev = encounterAt(locId);
    if (!ev) return null;
    S.encounters[locId].taken = true;
    return ev;
  }

  /* 地点专属剧情 */
  function specialAt(locId) {
    var sp = (D.SPECIAL || {})[locId];
    if (!sp) return null;
    if (S.flags['sp_' + locId]) return null;
    return sp;
  }
  function markSpecial(locId) { S.flags['sp_' + locId] = true; }

  /* ---------------- 战斗 ---------------- */
  function statsForStep(step, hpMul) {
    var info = stepInfo(step);
    var base = REALM_BASE[info.realm];
    var mul = (1 + 0.035 * info.layer) * (hpMul || 1);
    return {
      hp: Math.round(base.hp * mul * 0.86),
      atk: Math.round(base.atk * mul * 0.9),
      def: Math.round(base.def * mul * 0.85),
      spd: Math.round(base.spd * (1 + 0.02 * info.layer)),
      mana: 200
    };
  }

  function npcSpellScore(s) {
    var v = 0;
    (s.effects || []).forEach(function (e) {
      if (e.k === 'dmg') v += e.amt * (e.hits || 1) * (e.pierce ? 1.2 : 1);
      if (e.k === 'dot') v += e.amt * e.turns * 0.7;
      if (e.k === 'shield') v += (e.pct ? 60 : e.amt) * 0.5;
      if (e.k === 'heal') v += e.amt * 0.6;
      if (e.k === 'stun') v += 18 * (e.chance || 1);
      if (e.k === 'buff') v += 10;
    });
    return v;
  }

  function npcUnit(npc) {
    var trMul = npc.treasure ? 1.18 : 1;
    if (npc.mortal || npc.step < 0) {
      return {
        name: npc.name, row: 'front', faction: 'human', realm: -1,
        hp: 60, atk: 8, def: 2, spd: 80, mana: 10,
        spells: [{ __id: 'm1', name: '胡乱一推', cd: 0, target: 'enemy', effects: [{ k: 'dmg', amt: 20, el: 'phys' }] }]
      };
    }
    var info = stepInfo(npc.step);
    var st = statsForStep(npc.step, npc.hpMul);
    var spells = [];
    npc.techs.forEach(function (t) {
      g.TECHS[t].spells.forEach(function (sid) {
        if (spells.indexOf(g.SPELLS[sid]) < 0) spells.push(g.SPELLS[sid]);
      });
    });
    if (!spells.length) {
      spells = [{ __id: 'npc_qi', name: '仓促一击', cd: 0, target: 'enemy', effects: [{ k: 'dmg', amt: 26, el: 'phys' }] }];
    }
    spells = spells.slice().sort(function (a, b) { return npcSpellScore(b) - npcSpellScore(a); });
    return {
      name: npc.name + (npc.treasure ? '·持宝' : ''), row: 'front', faction: npc.faction, realm: info.realm,
      hp: Math.round(st.hp * trMul), atk: Math.round(st.atk * trMul),
      def: Math.round(st.def * trMul), spd: st.spd, mana: st.mana, spells: spells
    };
  }

  /* 路上的拦路货不越级太多：最多比玩家高一个大境界 */
  function clampRealmForPlayer(realmIdx) {
    var pr = S.step < 0 ? 0 : stepInfo(S.step).realm;
    return Math.max(0, Math.min(realmIdx, pr + 1, 4));
  }
  function beastUnit(realmIdx, name) {
    realmIdx = clampRealmForPlayer(realmIdx);
    var st = statsForStep(stepOf(Math.min(realmIdx, 4), 0), 1.3);
    return {
      name: name || '灰背妖狼', row: 'front', faction: 'beast', realm: realmIdx,
      hp: st.hp, atk: st.atk, def: st.def, spd: st.spd, mana: 100,
      spells: [
        { __id: 'b1', name: '撕咬', cd: 0, target: 'enemy', effects: [{ k: 'dmg', amt: 30, el: 'phys' }] },
        { __id: 'b2', name: '扑击', cd: 2, target: 'enemy', effects: [{ k: 'dmg', amt: 20, el: 'phys' }, { k: 'dot', amt: 6, turns: 2, el: 'phys', chance: 1, name: '撕裂' }] }
      ]
    };
  }

  function banditUnit(realmIdx, name) {
    realmIdx = clampRealmForPlayer(realmIdx);
    var st = statsForStep(stepOf(Math.min(realmIdx, 4), 0), 1);
    return {
      name: name || '蒙面邪修', row: 'front', faction: 'demon', realm: realmIdx,
      hp: st.hp, atk: st.atk, def: st.def, spd: st.spd, mana: 200,
      spells: [
        { __id: 'r1', name: '血刃', cd: 0, target: 'enemy', effects: [{ k: 'dmg', amt: 40, el: 'blood' }] },
        { __id: 'r2', name: '阴风', cd: 2, target: 'enemy', effects: [{ k: 'dmg', amt: 26, el: 'ghost' }, { k: 'debuff', stat: 'def', v: -0.15, turns: 2, chance: 1, name: '阴蚀' }] }
      ]
    };
  }

  function playerSpec() {
    var st = stats();
    var info = stepInfo(S.step);
    if (info.realm < 0) {
      return {
        name: S.name, realm: 0, faction: 'human',
        hp: 120, atk: 15, def: 4, spd: 90, mana: 20, stam: 100,
        pct: {}, loadout: S.loadout.slice()
      };
    }
    return {
      name: S.name, realm: info.realm, faction: 'human',
      hp: Math.round(REALM_BASE[info.realm].hp * (1 + 0.035 * info.layer)),
      atk: Math.round(REALM_BASE[info.realm].atk * (1 + 0.035 * info.layer)),
      def: Math.round(REALM_BASE[info.realm].def * (1 + 0.035 * info.layer)),
      spd: REALM_BASE[info.realm].spd,
      mana: REALM_BASE[info.realm].mana,
      stam: 100, pct: st.pct, loadout: S.loadout.slice(), conds: (S.conds || []).slice()
    };
  }

  function makeBattle(enemies) {
    var b = Engine.startBattle({
      player: playerSpec(), enemies: enemies,
      seed: (Math.random() * 1e9) | 0, collect: true
    });
    b.player.hp = Math.max(1, Math.min(S.hp, b.player.hpMax));
    b.player.mana = Math.max(0, Math.min(S.mana, b.player.manaMax));
    b.init = [b.player].concat(b.enemies).map(function (u) {
      return {
        uid: u.uid, name: u.name, side: u.side, row: u.row, realm: u.realm,
        hp: u.hp, hpMax: u.hpMax, mana: u.mana, manaMax: u.manaMax,
        atk: Math.round(Engine.atkOf(u)), def: Math.round(Engine.defOf(u)),
        spd: Math.round(Engine.spdOf(u)), faction: u.faction
      };
    });
    Engine.run(b);
    return b;
  }

  /* ---------------- 交互 ---------------- */
  function talk(npc) {
    var p = D.PERSONALITIES[npc.personality];
    var gain = 1 + Math.floor(Math.random() * 3);
    npc.relation += gain;
    var text = '「' + p.talk[Math.floor(Math.random() * p.talk.length)] + '」';
    var extra = '';
    if (Math.random() < 0.25) {
      var loc = D.LOCATIONS[Math.floor(Math.random() * D.LOCATIONS.length)];
      extra = '\n\n闲聊间他提到：' + loc.name + '一带' + ['最近不太平', '好像出了好东西', '有人在那边失踪了', '灵气比别处浓'][Math.floor(Math.random() * 4)] + '。';
    }
    log('与' + npc.name + '交谈。', '');
    return { text: text + extra, gain: gain };
  }

  function spar(npc, wager) {
    pending = { type: 'spar', npcId: npc.id, wager: wager || 0, lethal: false, preHp: S.hp };
    log('与' + npc.name + '切磋' + (wager ? '，赌注 ' + wager + ' 灵石' : '') + '。', '');
    return { battle: npcUnit(npc) };
  }

  function kill(npc) {
    pending = { type: 'kill', npcId: npc.id, lethal: true, preHp: S.hp };
    log('你对' + npc.name + '动了杀心。', 'bad');
    return { battle: npcUnit(npc) };
  }

  function gift(npc, cost) {
    cost = cost || 100;
    if (S.stones < cost) return { text: '你摸遍全身，也凑不出 ' + cost + ' 块灵石。' };
    addStones(-cost);
    npc.relation += 14;
    log('赠' + npc.name + '灵石 ' + cost + '。', '');
    return { text: '你把 ' + cost + ' 块灵石推过去。' + npc.name + '推辞了两下，收下了，看你的眼神松了些。' };
  }

  function askFavor(npc) {
    if (npc.relation < 60) return { text: npc.name + '笑了笑：「你我交情还没到那份上。」' };
    if (npc.giftGiven) return { text: npc.name + '摊手：「上次给你的，已经是压箱底的东西了。」' };
    npc.giftGiven = true;
    if (npc.techs.length && Math.random() < 0.75) {
      var id = npc.techs[Math.floor(Math.random() * npc.techs.length)];
      if (S.learned.indexOf(id) < 0) {
        var got = grantTech(id);
        log('从' + npc.name + '处得到《' + g.TECHS[id].name + '》。', 'good');
        return { text: npc.name + '沉吟良久，从怀里摸出一卷玉简：「' + got + '我留着也没用了，你拿去吧。」', tech: id };
      }
    }
    var st = 100 + Math.floor(Math.random() * 200);
    addStones(st);
    return { text: npc.name + '摆摆手，塞给你一袋灵石：「拿去做点正事。」', stones: st };
  }

  function afterBattle(b) {
    S.battles++;
    S.hp = Math.max(0, Math.round(b.player.hp));
    S.mana = Math.max(0, Math.round(b.player.mana));
    var win = b.result === 'win';
    if (win) { questTick('battle'); if (pending && pending.type === 'kill') questTick('kill'); }
    if (win) { S.wins++; S.battleBonus = Math.min(0.3, (S.battleBonus || 0) + 0.05); S.dao = Math.min(100, (S.dao || 60) + 3); }

    var out = { win: win, text: '', death: false, loot: [] };
    var p = pending || {};
    var npc = p.npcId ? findNpc(p.npcId) : null;

    /* 木人桩：打它不掉气血，也不给奖励，只看数字 */
    if (p.type === 'dummy') {
      S.hp = p.preHp;
      pending = null;
      out.text = '木人桩上的刻痕又多了几道。';
      out.dummy = true;
      return out;
    }

    /* 悬赏：赢了交差 */
    if (p.type === 'bounty') {
      S.hp = Math.max(0, Math.round(b.player.hp));
      if (win) {
        var bres = g.CAVE.finishBounty(p.bounty);
        out.text = bres.ok ? bres.text : '悬赏已经交过了。';
        questTick('battle');
      } else {
        out.text = '你没能办成这桩悬赏，赏钱自然也没了。';
      }
      pending = null;
      return out;
    }

    /* 切磋：不伤气血，只耗法力 */
    if (p.type === 'spar' && npc) {
      S.hp = p.preHp;
      npc.relation += win ? 6 : 3;
      if (win) S.cult += Math.round(30 + npc.step * 4);
      if (p.wager && win) { addStones(p.wager); npc.relation -= 3; }
      out.text = win
        ? npc.name + '收了手，抱拳道：「受教。」' + (p.wager ? '你赢下了赌注。' : '') + '\n\n切磋点到为止，气血未伤，只耗了些法力。'
        : '你输了。' + npc.name + '收了手，没要你的命。\n\n气血未伤，法力耗了大半。';
      log('切磋' + (win ? '胜' : '负') + npc.name + '。', win ? 'good' : '');
      pending = null;
      return out;
    }

    if (win) {
      if (p.type === 'kill' && npc) {
        npc.alive = false;
        var stones = Math.floor(npc.wealth * (0.6 + Math.random() * 0.8));
        addStones(stones);
        addNotoriety(12 + npc.realm * 6);
        addFame(-6);
        S.kills++;
        npc.bio.push('死于' + S.name + '之手。');
        out.text = npc.name + '倒了下去。你从他身上搜出 ' + stones + ' 块灵石。';
        if (npc.techs.length && Math.random() < 0.45) {
          var id = npc.techs[Math.floor(Math.random() * npc.techs.length)];
          if (S.learned.indexOf(id) < 0) {
            S.learned.push(id);
            out.text += '\n还有一卷《' + g.TECHS[id].name + '》（' + g.GRADES[gradeOf(id)] + '）。';
          }
        }
        if (npc.treasure && Math.random() < 0.6) {
          if (S.treasures.indexOf(npc.treasure) < 0) S.treasures.push(npc.treasure);
          out.text += '\n尸身上还有一件法宝：' + treasureDef(npc.treasure).name + '。';
        }
        log('杀了' + npc.name + '。', 'bad');
        if (npc.grudge) {
          S.hunter = {
            name: '某位前辈', step: Math.min(25, npc.step + 7),
            due: S.day + 40 + Math.floor(Math.random() * 40),
            reason: npc.name
          };
          out.text += '\n\n你翻他储物袋的时候，摸到一枚刻着族徽的玉牌。心里忽然一沉。';
        }
      } else {
        out.text = '对手退去了。';
        addStones(20 + Math.floor(Math.random() * 40));
      }
    } else {
      if (p.type === 'kill') {
        out.death = handleDeath(out);
      } else {
        S.hp = Math.max(1, Math.round(stats().hpMax * 0.1));
        out.text = '你输了。';
      }
    }
    pending = null;
    return out;
  }

  function handleDeath(out) {
    if (S.mode === 'hardcore') {
      S.dead = true;
      S.deadText = '你死在了天南的某个角落。这一世，到此为止。';
      out.text = '你死了。';
      out.death = true;
      return true;
    }
    var safe = D.LOCATIONS.filter(function (l) { return l.tier === 0; })[0];
    var lostCult = Math.round(S.cult * 0.25);
    var lostStones = Math.round(S.stones * 0.4);
    S.cult = Math.max(0, S.cult - lostCult);
    addStones(-lostStones);
    S.hp = Math.round(stats().hpMax * 0.3);
    S.mana = 0;
    S.loc = safe.id;
    advanceDays(30, true);
    log('你在' + safe.name + '醒来，浑身是伤。修为散了 ' + lostCult + '，灵石少了 ' + lostStones + '。', 'bad');
    out.text = '你眼前一黑。再睁眼时，人已经在' + safe.name + '的客栈里，躺了整整一个月。';
    return false;
  }

  /* 被追杀 */
  function checkHunter() {
    if (!S.hunter) return null;
    if (S.day < S.hunter.due) return null;
    var h = S.hunter;
    S.hunter = null;
    return {
      name: h.name, step: h.step,
      text: '一个陌生修士拦在你面前，声音很平：「你杀' + h.reason + '的时候，没想过会有人来找你？」'
    };
  }

  /* ---------------- 拍卖会 ---------------- */
  function auctionOpen() {
    return S.loc === 'jiayuan';
  }

  function ensureAuction() {
    var y = Math.floor(S.day / 365);
    if (S.auction && S.auction.year === y) return S.auction;
    var lots = [];
    var techPool = Object.keys(g.TECHS).filter(function (id) {
      return gradeOf(id) >= 2 && gradeOf(id) <= 3 && S.learned.indexOf(id) < 0;
    });
    for (var i = 0; i < 3; i++) {
      var kind = i === 0 && techPool.length ? 'tech' : (i === 1 && Math.random() < 0.5 ? 'treasure' : 'item');
      if (kind === 'tech') {
        var tid = techPool.splice(Math.floor(Math.random() * techPool.length), 1)[0];
        var base = (D.SECT_COST || {})[gradeOf(tid)] || 150;
        lots.push({ kind: 'tech', id: tid, name: g.TECHS[tid].name, grade: gradeOf(tid),
          price: base * 4 + Math.floor(Math.random() * 200), rival: base * 5 + Math.floor(Math.random() * 300), tries: 3, sold: false });
      } else if (kind === 'treasure') {
        var tl = (D.TREASURES || []).filter(function (t) { return S.treasures.indexOf(t.id) < 0; });
        if (!tl.length) continue;
        var t2 = tl[Math.floor(Math.random() * tl.length)];
        lots.push({ kind: 'treasure', id: t2.id, name: t2.name, grade: t2.grade,
          price: 500 + t2.grade * 300, rival: 700 + t2.grade * 400, tries: 3, sold: false });
      } else {
        var it = ['cult', 'break', 'heal'][Math.floor(Math.random() * 3)];
        lots.push({ kind: 'item', id: it, name: (D.ITEMS[it] || {}).name, grade: 0,
          price: 150 + Math.floor(Math.random() * 100), rival: 200 + Math.floor(Math.random() * 150), tries: 3, sold: false });
      }
    }
    S.auction = { year: y, lots: lots };
    return S.auction;
  }

  function auctionBid(idx) {
    var a = ensureAuction();
    var lot = a.lots[idx];
    if (!lot || lot.sold) return { ok: false, text: '这件已经拍完了。' };
    var offer = Math.round(lot.price * 1.15);
    if (S.stones < offer) return { ok: false, text: '你只有 ' + S.stones + ' 块灵石，出不起 ' + offer + '。' };
    if (offer >= lot.rival) {
      addStones(-offer);
      lot.sold = true;
      if (lot.kind === 'tech') { S.learned.push(lot.id); }
      if (lot.kind === 'treasure') { if (S.treasures.indexOf(lot.id) < 0) S.treasures.push(lot.id); }
      if (lot.kind === 'item') { addItem(lot.id, 1); }
      log('在拍卖会上以 ' + offer + ' 灵石拍下' + lot.name + '。', 'good');
      return { ok: true, text: '落槌。「' + lot.name + '」，归你了。' };
    }
    lot.tries -= 1;
    lot.price = Math.round(lot.rival * (1.02 + Math.random() * 0.06));
    if (lot.tries <= 0) {
      lot.sold = true;
      return { ok: false, text: '二楼有人一直跟你抬价。你犹豫了一下，槌声落下，东西归了别人。' };
    }
    return { ok: false, text: '你刚出价，二楼就有人跟上——现在叫到 ' + lot.price + ' 灵石。' };
  }

  /* ---------------- 定时秘境 ---------------- */
  function mijingAt(locId) {
    var y = Math.floor(S.day / 365);
    var list = (D.MIJING || []).filter(function (m) {
      return m.loc === locId && (y + m.every) % m.every === 0 && y > 0;
    });
    return list[0] || null;
  }
  function spawnMijingCrowd(locId, m) {
    var key = 'crowd_' + m.id + '_' + Math.floor(S.day / 365);
    S.mijingCrowd = S.mijingCrowd || {};
    if (S.mijingCrowd[key]) return;
    S.mijingCrowd[key] = true;
    var rng = seeded((S.npcSeq || 1) * 31 + S.day);
    for (var i = 0; i < 3; i++) {
      var npc = makeNpc(locId, rng, 'bandit');
      var base = stepInfo(m.cap).realm;
      npc.step = Math.min(m.cap, stepOf(base, 0) + Math.floor(rng() * 4));
      npc.realm = stepInfo(npc.step).realm;
      npc.name = (i === 0 ? '闻讯而来的散修' : '抢先一步的修士');
      npc.wealth = 200 + Math.floor(rng() * 400);
      npc.bio = ['听说' + m.name + '开了，连夜赶来的。'];
      npc.talent = 0.6;
      S.npcs[locId].push(npc);
    }
    log('秘境一开，' + LOC_MAP[locId].name + '一下多了不少生面孔。', 'sys');
  }

  function mijingLeft(m) {
    var key = 'mj_' + m.id + '_' + Math.floor(S.day / 365);
    S.mijingUsed = S.mijingUsed || {};
    return 3 - (S.mijingUsed[key] || 0);
  }
  function enterMijing(m) {
    var key = 'mj_' + m.id + '_' + Math.floor(S.day / 365);
    S.mijingUsed = S.mijingUsed || {};
    if (S.step > m.cap) return { ok: false, text: '你境界太高，秘境的门径在你面前塌了。' };
    if ((S.mijingUsed[key] || 0) >= 3) return { ok: false, text: '这一次的机缘已经尽了。' };
    S.mijingUsed[key] = (S.mijingUsed[key] || 0) + 1;
    advanceDays(25);
    var r = Math.random();
    if (r < 0.30) {
      var foe = banditUnit(Math.min(3, stepInfo(S.step).realm), '抢宝的修士');
      foe.hp = Math.round(foe.hp * 1.1);
      return { ok: true, text: '你刚摸到一株灵药，身后就有人出手。', battle: true, foe: foe };
    }
    var rew = m.reward;
    var stones = rew.stones[0] + Math.floor(Math.random() * (rew.stones[1] - rew.stones[0]));
    var relic = rew.relic[0] + Math.floor(Math.random() * (rew.relic[1] - rew.relic[0] + 1));
    addStones(stones);
    if (relic) addItem('relic', relic);
    var text = '你在秘境里转了一圈，捡到 ' + stones + ' 块灵石';
    if (relic) text += '、' + relic + ' 枚古修残片';
    text += '。';
    if (Math.random() < 0.35) {
      var pool = Object.keys(g.TECHS).filter(function (id) {
        return gradeOf(id) >= rew.techGrade[0] && gradeOf(id) <= rew.techGrade[1] && S.learned.indexOf(id) < 0;
      });
      if (pool.length) {
        var tid = pool[Math.floor(Math.random() * pool.length)];
        S.learned.push(tid);
        text += '\n角落里还压着一卷《' + g.TECHS[tid].name + '》（' + g.GRADES[gradeOf(tid)] + '）。';
      }
    }
    log('入' + m.name + '，所得：灵石 ' + stones + '，残片 ' + relic + '。', 'good');
    return { ok: true, text: text, stones: stones, relic: relic };
  }

  /* ---------------- 宗门 ---------------- */
  function joinSect(id) {
    var def = (D.SECTS || {})[id];
    if (!def) return { ok: false, text: '没有这个宗门。' };
    if (S.sect) return { ok: false, text: '你已经是' + sectDef().name + '的人了。' };
    if (def.align === 'righteous' && evilPlayer()) {
      return { ok: false, text: '执事盯着你看了很久，冷笑：「你身上那股味儿，隔着三丈都闻得到。滚。」' };
    }
    if (def.align === 'demonic' && S.fame > 60) {
      return { ok: false, text: '铜面魔修摇头：「你名声太干净了，我们不敢收。」' };
    }
    S.sect = { id: id, rank: 0, contribution: 0, faction: null };
    addFame(def.align === 'righteous' ? 8 : -4);
    log('拜入' + def.name + '，成了外门弟子。', 'good');
    return { ok: true, text: '你拜入' + def.name + '，领了一块外门令牌。' };
  }

  function promote() {
    if (!S.sect) return { ok: false, text: '你还没入宗门。' };
    var def = sectDef();
    var next = def.ranks[S.sect.rank + 1];
    if (!next) return { ok: false, text: '已经是长老了，再往上得看机缘。' };
    if (S.sect.contribution < next.need) {
      return { ok: false, text: '晋升' + next.name + '要 ' + next.need + ' 贡献。你还差 ' + (next.need - S.sect.contribution) + '。' };
    }
    S.sect.rank += 1;
    log('晋升为' + def.ranks[S.sect.rank].name + '。', 'good');
    return { ok: true, text: '你被擢升为' + def.ranks[S.sect.rank].name + '。' };
  }

  function chooseFaction(fid) {
    if (!S.sect) return { ok: false, text: '你还没入宗门。' };
    if (S.sect.faction) return { ok: false, text: '已经站过队了，改不了。' };
    var def = sectDef();
    var f = def.factions.filter(function (x) { return x.id === fid; })[0];
    if (!f) return { ok: false, text: '没有这一堂。' };
    S.sect.faction = fid;
    log('你入了' + f.name + '。', '');
    return { ok: true, text: '你在' + f.name + '的名册上按了手印。' + f.perk + '。' };
  }

  function sectTasks() {
    return (sectDef() || {}).tasks || [];
  }

  function acceptTask(id) {
    if (!S.sect) return { ok: false, text: '你还没入宗门。' };
    var def = sectDef();
    var t = (def.tasks || []).filter(function (x) { return x.id === id; })[0];
    if (!t) return { ok: false, text: '没有这个差事。' };
    if (S.sectTask) return { ok: false, text: '手上的差事还没办完。' };
    if (t.need) {
      var lack = [];
      Object.keys(t.need).forEach(function (k) {
        if (itemCount(k) < t.need[k]) lack.push((D.ITEMS[k] || {}).name + ' ' + (t.need[k] - itemCount(k)));
      });
      if (lack.length) return { ok: false, text: '缺：' + lack.join('、') };
      Object.keys(t.need).forEach(function (k) { addItem(k, -t.need[k]); });
      rewardTask(t);
      return { ok: true, text: '交了差，得贡献 ' + t.contribution + '，灵石 ' + t.stones + '。' };
    }
    if (t.battle) {
      S.sectTask = id;
      var realm = Math.min(3, stepInfo(S.step).realm);
      return {
        ok: true, battle: true, taskId: id,
        foe: t.battle.human ? banditUnit(realm, '不长眼的散修') : beastUnit(realm, '后山妖兽'),
        text: '你接了「' + t.name + '」，往' + (t.battle.human ? '据点外' : '后山') + '去了。'
      };
    }
    advanceDays(t.days || 3);
    rewardTask(t);
    return { ok: true, text: '办了几天差，得贡献 ' + t.contribution + '，灵石 ' + t.stones + '。' };
  }

  function rewardTask(t) {
    S.sect.contribution += t.contribution;
    addStones(t.stones || 0);
    advanceDays(t.days || 0);
    log('完成宗门差事「' + t.name + '」，贡献 +' + t.contribution + '。', 'good');
  }

  function finishTask(win) {
    if (!S.sectTask) return null;
    var def = sectDef();
    var t = (def.tasks || []).filter(function (x) { return x.id === S.sectTask; })[0];
    S.sectTask = null;
    if (!t) return null;
    if (!win) {
      S.sect.contribution = Math.max(0, S.sect.contribution - 10);
      return { text: '差事办砸了，贡献 -10。' };
    }
    rewardTask(t);
    return { text: '差事办成了。贡献 +' + t.contribution + '，灵石 +' + t.stones + '。' };
  }

  function sectLibrary() {
    var def = sectDef();
    if (!def) return [];
    var out = [];
    var owned = [];
    def.library.forEach(function (entry) {
      if (S.sect.rank < entry.rank) return;
      entry.techs.forEach(function (id) {
        if (!g.TECHS[id]) return;
        if (owned.indexOf(id) >= 0) return;
        owned.push(id);
        out.push({ id: id, rank: entry.rank, cost: (D.SECT_COST || {})[gradeOf(id)] || 100,
                   owned: S.learned.indexOf(id) >= 0 });
      });
    });
    /* 镇派功法：只有本门有，且要真传以上才见得到 */
    var sig = (D.SIGNATURE || {})[def.id] || [];
    sig.forEach(function (it) {
      if (!g.TECHS[it.tech]) return;
      if (S.sect.rank < it.rank) return;
      if (owned.indexOf(it.tech) >= 0) return;
      owned.push(it.tech);
      out.push({ id: it.tech, rank: it.rank, sig: true, note: it.note,
                 cost: Math.round(((D.SECT_COST || {})[gradeOf(it.tech)] || 100) * 2.2),
                 owned: S.learned.indexOf(it.tech) >= 0 });
    });
    return out;
  }

  function buySectTech(id) {
    if (!S.sect) return { ok: false, text: '你还没入宗门。' };
    var item = sectLibrary().filter(function (x) { return x.id === id; })[0];
    if (!item) return { ok: false, text: '藏经阁里没有这一门，或者你的身份还不够。' };
    if (item.owned) return { ok: false, text: '你已经抄过这门了。' };
    if (S.sect.contribution < item.cost) return { ok: false, text: '贡献不够，要 ' + item.cost + '。' };
    S.sect.contribution -= item.cost;
    S.learned.push(id);
    advanceDays(7);
    log('以 ' + item.cost + ' 贡献从藏经阁换得《' + g.TECHS[id].name + '》。', 'good');
    return { ok: true, text: '你抄录了《' + g.TECHS[id].name + '》。' };
  }

  function leaveSect() {
    if (!S.sect) return { ok: false, text: '你不在宗门里。' };
    var name = sectDef().name;
    var evil = sectDef().align === 'righteous';
    S.sect = null;
    if (evil) { addFame(-20); addNotoriety(15); }
    log('你离开了' + name + '。', 'bad');
    return { ok: true, text: '你把令牌留在山门口，走了。' };
  }

  function sectYearly() {
    if (!S.sect) return;
    var def = sectDef();
    var rank = def.ranks[S.sect.rank];
    addStones(rank.pay || 0);
    S.sect.contribution += 3;
    if (S.sect.faction && Math.random() < 0.22) {
      var f = def.factions.filter(function (x) { return x.id === S.sect.faction; })[0];
      if (Math.random() < 0.5) {
        S.sect.contribution += 25;
        log('派系倾轧，' + f.name + '占了上风，你跟着分了一杯羹（贡献 +25）。', 'good');
      } else {
        S.sect.contribution = Math.max(0, S.sect.contribution - 20);
        log('派系倾轧，' + f.name + '吃了亏，你被扣了 20 贡献。', 'bad');
      }
    }
    if (def.align === 'righteous' && evilPlayer()) {
      log('执法队查到你修了魔功。你被逐出' + def.name + '。', 'bad');
      S.sect = null;
      addFame(-25); addNotoriety(20);
    }
  }

  /* ---------------- 结缘事件 ---------------- */
  function takeMail() {
    if (!S.mail || !S.mail.length) return null;
    var m = S.mail.shift();
    var npc = findNpc(m.npcId);
    if (!npc || !npc.alive) return takeMail();
    var step = npc.step;
    var r = Math.random();
    if (r < 0.4) {
      var st = 60 + step * 12;
      var it = Math.random() < 0.5 ? 'heal' : 'mana';
      return {
        npc: npc, title: npc.name + '来访',
        text: npc.name + '提着一只布包上门，往桌上一放：「路上顺手弄的，你用得上。」\n\n布包里有 ' + st + ' 块灵石，还有一枚' + (D.ITEMS[it] || {}).name + '。',
        act: function () { addStones(st); addItem(it, 1); npc.relation += 6; }
      };
    }
    if (r < 0.7) {
      var gain = Math.round((40 + step * 30) * (0.8 + Math.random() * 0.5));
      return {
        npc: npc, title: npc.name + '指点',
        text: npc.name + '看了你半晌，忽然伸指在你眉心一点：「你这一口气走岔了。」\n\n你顺着他的意思运了一遍功，许多滞涩处忽然通了。',
        act: function () { S.cult += gain; npc.relation += 4; }
      };
    }
    var foe = { name: '寻仇的散修', step: Math.min(25, step + 2), techs: ['qingyuan1'], faction: 'demon', hpMul: 1, mortal: false };
    return {
      npc: npc, title: npc.name + '求救',
      text: npc.name + '浑身是血撞进门来，反手把门闩上：「有人在追我，帮不帮？」\n\n门外已经响起了脚步声。',
      battle: foe,
      act: function () { npc.relation += 15; }
    };
  }

  /* ---------------- 事件 ---------------- */
  function rollEvent(locId) {
    var loc = LOC_MAP[locId] || LOC_MAP.qingniu;
    var pool = D.EVENTS.filter(function (e) {
      if (e.id === 'ruin') return loc.features.indexOf('ruin') >= 0 || loc.tier >= 2;
      return true;
    });
    var total = pool.reduce(function (a, e) { return a + e.weight; }, 0);
    var r = Math.random() * total;
    for (var i = 0; i < pool.length; i++) { r -= pool[i].weight; if (r <= 0) return pool[i]; }
    return pool[0];
  }

  /* 事件脚本手里的 W：data_chain / data_place 等事件数据的 run(S, W) 直接调这些 */
  var W = {
    roll: function () { return Math.random(); },
    maxHp: function () { return stats().hpMax; },
    hasSpell: function (sid) { return S.loadout.indexOf(sid) >= 0; },
    speedCheck: function () { return stats().spd >= 110 || Math.random() < 0.5; },
    evil: function () { return evilPlayer(); },
    grantTech: function (id) { return grantTech(id); },
    grantTechAny: function (pool) { return grantTechAny(pool); },
    stats: function () { return stats(); },
    log: function (t, cls) { return log(t, cls); },
    addStones: function (n) { return addStones(n); },
    addItem: function (k, n) { return addItem(k, n); },
    addFame: function (n) { return addFame(n); },
    addNotoriety: function (n) { return addNotoriety(n); },
    advanceDays: function (n) { return advanceDays(n); },
    setChain: function (id, step) { return setChain(id, step); },
    chainStep: function (id) { return chainStep(id); },
    markSpecial: function (id) { return markSpecial(id); }
  };

  function applyFx(fx) {
    if (!fx) return;
    if (fx.stones) addStones(fx.stones);
    if (fx.fame) addFame(fx.fame);
    if (fx.notoriety) addNotoriety(fx.notoriety);
    if (fx.cult) S.cult += fx.cult;
    if (fx.hpLoss) S.hp = Math.max(1, S.hp - fx.hpLoss);
    if (fx.hpHeal) S.hp = Math.min(stats().hpMax, S.hp + Math.round(stats().hpMax * fx.hpHeal));
    ['heal', 'mana', 'herb', 'ore', 'pelt', 'relic'].forEach(function (k) {
      if (fx[k]) addItem(k, fx[k]);
    });
    if (fx.pill) addItem('pill', 1);
    if (fx.dao) S.dao = Math.min(100, (S.dao || 50) + fx.dao);
    if (fx.sect) joinSect(fx.sect);
    if (fx.days) advanceDays(fx.days);
  }

  /* ---------------- 行动 ---------------- */
  function travelDays(locId) {
    var from = LOC_MAP[S.loc], to = LOC_MAP[locId];
    if (!to) return 0;
    var dist = Math.sqrt(Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2));
    var sp = S.step < 0 ? REALM_SPEED[0] : REALM_SPEED[stepInfo(S.step).realm + 1];
    var fly = (g.CAVE && g.CAVE.flyMul) ? g.CAVE.flyMul() : 1;
    return Math.max(2, Math.round(Math.pow(dist / 8, 2.4) * Math.pow(sp, 1.6) * 4 * fly));
  }
  function teleportCost(locId) {
    var g = gateBetween(S.loc, locId);
    if (g) return g.cost;
    var from = LOC_MAP[S.loc], to = LOC_MAP[locId];
    var dist = Math.sqrt(Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2));
    return Math.round(80 + dist * 8);
  }
  function gateBetween(a, b) {
    return (D.GATES || []).filter(function (g) {
      return (g.from === a && g.to === b) || (g.from === b && g.to === a);
    })[0] || null;
  }
  function canTeleport(locId) {
    return !!gateBetween(S.loc, locId);
  }

  function travel(locId) {
    var from = LOC_MAP[S.loc], to = LOC_MAP[locId];
    if (!to || locId === S.loc) return { ok: false, text: '你已经在这里了。' };
    if (from.region && to.region && from.region !== to.region) {
      return { ok: false, text: '那是' + (D.REGION_BY_ID[to.region] ? D.REGION_BY_ID[to.region].name : '别处') +
        '，隔着万里，脚走不到。得先找传送阵。' };
    }
    var days = travelDays(locId);
    S.loc = locId;
    ensureNpcs(locId);
    var mjHere = mijingAt(locId);
    if (mjHere) spawnMijingCrowd(locId, mjHere);
    advanceDays(days, true);
    yearTick();
    var risk = (0.28 + (to.tier - stepInfo(S.step).realm) * 0.08 + days * 0.01) * dangerMul() + hostileDanger(locId);
    /* 到地必有一遇：每次落脚，都先看这里有没有等你的事 */
    var ev = null;
    if (Math.random() < Math.min(0.85, Math.max(0.1, risk))) ev = rollEvent(locId);
    if (!ev) ev = takeEncounter(locId);
    log('赶路 ' + days + ' 天，到了' + to.name + '。', 'sys');
    questTick('reach', locId);
    if (!S.visited) S.visited = {};
    if (!S.visited[locId]) { S.visited[locId] = 1; var arr = locArrive(locId); if (arr) log(arr, 'sys'); }
    return { ok: true, days: days, event: ev, loc: to };
  }

  function rest() {
    var inn = Math.max(5, Math.round(15 * priceMul()));
    if (S.stones < inn) return { ok: false, text: '住店要' + inn + '块灵石，你拿不出来。' };
    addStones(-inn);
    var st = stats();
    S.hp = Math.min(st.hpMax, S.hp + Math.round(st.hpMax * 0.7));
    S.mana = st.manaMax;
    advanceDays(3);
    log('在客栈歇了三日，伤痛好了大半。', 'good');
    return { ok: true, days: 3, text: '三日好眠，气血与法力都回来了。' };
  }

  function qiOf(locId) {
    var l = LOC_MAP[locId] || LOC_MAP.qingniu;
    return [0.9, 1.0, 1.15, 1.35][l.tier] + (l.features.indexOf('mine') >= 0 ? 0.05 : 0);
  }
  function bottleneck() { return S.step >= 0 && S.cult >= needFor(S.step); }

  /* 洞府聚灵阵：只有人待在府里才算 */
  function caveCultMul() {
    if (!g.CAVE || !g.CAVE.cultBonus) return 1;
    if (!S.cave || S.cave.loc !== S.loc) return 1;
    return 1 + g.CAVE.cultBonus();
  }

  function estimateGain(years) {
    if (S.step < 0) return 0;
    var info = stepInfo(S.step);
    var rootMul = ROOT_CULT[S.root.id] || 1;
    var need = needFor(S.step);
    var ratio = S.cult / need;
    var bn = ratio >= 1 ? 0.08 : ratio > 0.8 ? 0.75 : ratio > 0.5 ? 1.0 : 1.15;
    return Math.round(YEAR_GAIN[info.realm] * years * rootMul * qiOf(S.loc) * bn * caveCultMul());
  }

  function meditateCost(years) {
    return (12 + stepInfo(Math.max(0, S.step)).realm * 18) * years;
  }

  function meditateLegacy(years) {
    years = years || 1;
    if (S.step < 0) return { ok: false, text: '你还没引气入体，枯坐也是白坐。青牛镇茶棚里那个老道，也许能给你个门路。' };
    var cost = meditateCost(years);
    var poor = S.stones < cost;
    addStones(-Math.min(S.stones, cost));
    var info = stepInfo(S.step);
    var rootMul = ROOT_CULT[S.root.id] || 1;
    var need = needFor(S.step);
    var ratio = S.cult / need;
    var bn = ratio >= 1 ? 0.08 : ratio > 0.8 ? 0.75 : ratio > 0.5 ? 1.0 : 1.15;
    var gain = Math.round(YEAR_GAIN[info.realm] * years * rootMul * qiOf(S.loc) * bn * (0.85 + Math.random() * 0.3) * (poor ? 0.4 : 1) * cultMul());
    var before = S.cult;
    S.cult += gain;
    advanceDays(years * 365);
    var atBn = S.cult >= needFor(S.step);

    /* 道心：久坐生魔 */
    S.dao = Math.max(0, Math.min(100, (S.dao == null ? 60 : S.dao) - years * 2.5));
    if (S.dao < 30 && Math.random() < 0.3) {
      var lost2 = Math.round(S.cult * 0.12);
      S.cult = Math.max(0, S.cult - lost2);
      S.hp = Math.max(1, S.hp - Math.round(stats().hpMax * 0.25));
      S.dao = Math.min(100, S.dao + 12);
      log('闭关中心魔翻涌，你咬破舌尖才压下去，修为散了 ' + lost2 + '。', 'bad');
      return { ok: true, years: years, gain: -lost2, demon: true, cost: cost,
        text: '闭关到第' + (1 + Math.floor(Math.random() * years)) + '年，心魔翻涌。你在识海里跟自己打了一架，醒来时浑身冷汗，修为散了 ' + lost2 + ' 点。' };
    }
    if (S.dao > 80) gain = Math.round(gain * 1.1);

    var ev = null;
    var evChance = Math.min(0.8, 0.2 + years * 0.06);
    if (Math.random() < evChance) ev = rollEvent(S.loc);

    var text = '闭关 ' + years + ' 年，耗灵石 ' + Math.min(S.stones + cost, cost) + '，修为 +' + gain + '。' +
      (poor ? '\n\n灵石不够，聚灵阵半明半灭，这一年只坐出了四成效力。' : '');
    if (atBn && before < needFor(S.step)) text += '\n\n你摸到了瓶颈。再坐下去也涨不动了，得想办法破关。';
    else if (atBn) text += '\n\n瓶颈仍在。枯坐无用，要么打一场，要么服破境丹。';
    log('闭关 ' + years + ' 年，修为 +' + gain + '。', atBn ? '' : 'good');
    return { ok: true, years: years, days: years * 365, gain: gain, bottleneck: atBn, event: ev, cost: cost, text: text };
  }

  function canBreak() { return S.cult >= needFor(S.step); }

  /* 大境界的关隘：没有对应的天材地宝，硬冲基本是送死 */
  var GATE_ITEM = { 1: 'zhuji', 2: 'jiedan', 3: 'ningying', 4: 'huashen' };
  function gateFor(step) {
    var info = stepInfo(step);
    if (!isLastLayer(step)) return null;
    var next = info.realm + 1;
    var id = GATE_ITEM[next];
    if (!id) return null;
    return { id: id, name: (D.ITEMS[id] || {}).name || id, have: itemCount(id) };
  }

  function breakChance(usePill) {
    if (!isLastLayer(S.step)) return 1;
    var info = stepInfo(S.step);
    var rm = ROOT_CULT[S.root.id] || 1;
    var gate = gateFor(S.step);
    var hasGate = gate && gate.have > 0;
    var base = 0.18 + (rm - 1) * 0.28 + (S.battleBonus || 0) + (pctOf().breakBonus || 0);
    if (usePill) base += 0.22;
    if (hasGate) base += 0.20;
    if (info.realm >= 3) base -= 0.04;
    /* 没有天材地宝：只剩一线生机 */
    if (!hasGate) return 0.05;
    return Math.max(0.05, Math.min(0.92, base));
  }

  function breakThrough(usePill) {
    var need = needFor(S.step);
    if (S.cult < need) return { ok: false, text: '修为还不够。还差 ' + (need - S.cult) + ' 点。' };
    var info = stepInfo(S.step);
    var last = isLastLayer(S.step);
    if (usePill && itemCount('break')) addItem('break', -1);
    var gate = gateFor(S.step);
    if (gate && gate.have > 0) addItem(gate.id, -1);
    if (!last) {
      S.cult -= need;
      S.step += 1;
      var st = stats();
      S.hp = Math.min(st.hpMax, S.hp + Math.round(st.hpMax * 0.2));
      log('突破至' + stepName(S.step) + '。', 'good');
      return { ok: true, text: '气机一转，你踏入了' + stepName(S.step) + '。', step: S.step };
    }
    var chance = breakChance(usePill);
    if (Math.random() < chance) {
      S.cult -= need;
      S.step += 1;
      S.battleBonus = 0;
      var r = stats();
      S.hp = r.hpMax; S.mana = r.manaMax;
      log('破境成功，踏入' + REALM_NAMES[stepInfo(S.step).realm] + '！', 'good');
      return { ok: true, text: '关隘轰然洞开。你踏入了' + stepName(S.step) + '。', step: S.step, big: true };
    }
    var lose = Math.round(need * 0.4);
    S.cult = Math.max(0, S.cult - lose);
    S.hp = Math.max(1, S.hp - Math.round(stats().hpMax * 0.25));
    advanceDays(30);
    log('破境失败，修为倒跌 ' + lose + ' 点。', 'bad');
    return { ok: false, text: '一线之差，气机崩了。你吐血倒地，修为倒跌 ' + lose + ' 点。', failed: true };
  }

  /* 转修 */
  function switchDays(techId) { return D.gradeSwitchDays(gradeOf(techId)); }

  function retrain(slot, techId) {
    if (!g.TECHS[techId]) return { ok: false, text: '没有这门功法。' };
    if (S.learned.indexOf(techId) < 0) return { ok: false, text: '你还没学过这门功法。' };
    var cur = slot === 'main' ? S.mainTech : S.subTech;
    if (cur === techId) return { ok: false, text: '已经在修了。' };
    var other = slot === 'main' ? S.subTech : S.mainTech;
    if (other === techId) return { ok: false, text: '它已经在另一个位置上了。' };
    var days = switchDays(techId);
    advanceDays(days);
    if (slot === 'main') S.mainTech = techId; else S.subTech = techId;
    rebuildLoadout();
    log('转修《' + g.TECHS[techId].name + '》，耗时 ' + days + ' 天。', 'sys');
    return {
      ok: true, days: days,
      text: '你散去旧功，重头来过。' + days + ' 天后，你改修《' + g.TECHS[techId].name + '》。'
    };
  }

  function canCraftPill(id) {
    var rec = (D.PILLS || []).filter(function (p) { return p.id === id; })[0];
    if (!rec) return { ok: false, text: '没有这个丹方。' };
    var lack = [];
    Object.keys(rec.need).forEach(function (k) {
      if (itemCount(k) < rec.need[k]) lack.push((D.ITEMS[k] || {}).name + ' ' + (rec.need[k] - itemCount(k)));
    });
    if (lack.length) return { ok: false, text: '缺材料：' + lack.join('、') };
    return { ok: true, rec: rec };
  }

  /* quality: 0 废丹 / 1 下品 / 2 中品 / 3 上品（控火三转） */
  function craftPill(id, quality) {
    var chk = canCraftPill(id);
    if (!chk.ok) return chk;
    var rec = chk.rec;
    var q = quality == null ? 2 : quality;
    Object.keys(rec.need).forEach(function (k) { addItem(k, -rec.need[k]); });
    advanceDays(7);

    if (q <= 0) {
      log('一炉' + rec.name + '炼废了，只剩一炉黑渣。', 'bad');
      return { ok: true, fail: true, q: 0, text: '火候散了。丹炉里只剩一团黑渣，材料全废。' };
    }
    var yieldN = q >= 3 ? 2 : 1;
    addItem(id, yieldN);
    var grade = q >= 3 ? '上品' : q >= 2 ? '中品' : '下品';
    log('炼成 ' + yieldN + ' 枚' + grade + rec.name + '。', 'good');
    return {
      ok: true, fail: false, q: q, yield: yieldN, grade: grade,
      text: grade + '·' + rec.name + ' ×' + yieldN +
        (q >= 3 ? '（三转火候，丹成两枚）' : q === 1 ? '（火候不稳，只成一枚残丹）' : '') + '。（7 天）'
    };
  }

  function craftTreasure(id) {
    var rec = (D.TREASURES || []).filter(function (t) { return t.id === id; })[0];
    if (!rec) return { ok: false, text: '没有这个器方。' };
    var lack = [];
    Object.keys(rec.need).forEach(function (k) {
      if (itemCount(k) < rec.need[k]) lack.push((D.ITEMS[k] || {}).name + ' ' + (rec.need[k] - itemCount(k)));
    });
    if (S.stones < (rec.stones || 0)) lack.push('灵石 ' + ((rec.stones || 0) - S.stones));
    if (lack.length) return { ok: false, text: '缺：' + lack.join('、') };
    Object.keys(rec.need).forEach(function (k) { addItem(k, -rec.need[k]); });
    addStones(-(rec.stones || 0));
    advanceDays(30);
    if (S.treasures.indexOf(id) < 0) S.treasures.push(id);
    log('炼制出法宝「' + rec.name + '」。', 'good');
    return { ok: true, text: '器成。炉中一枚「' + rec.name + '」缓缓浮起。（30 天）' };
  }

  function equipTreasure(id, slot) {
    slot = slot || 'main';
    if (S.treasures.indexOf(id) < 0) return { ok: false, text: '你没有这件法宝。' };
    if (slot === 'sub') {
      if (S.treasure2 === id) { S.treasure2 = null; rebuildLoadout(); return { ok: true, text: '已收起副法宝。' }; }
      if (S.treasure === id) { S.treasure = null; }
      S.treasure2 = id;
    } else {
      if (S.treasure === id) { S.treasure = null; rebuildLoadout(); return { ok: true, text: '已收起法宝。' }; }
      if (S.treasure2 === id) { S.treasure2 = null; }
      S.treasure = id;
    }
    rebuildLoadout();
    return { ok: true, text: '已祭炼「' + treasureDef(id).name + '」为' + (slot === 'sub' ? '副法宝' : '主法宝') + '。' };
  }

  function useItem(id) {
    if (!D.ITEMS[id] || !itemCount(id)) return { ok: false, text: '没有这个东西。' };
    var st = stats();
    if (id === 'heal') {
      addItem('heal', -1);
      var v = Math.round(st.hpMax * 0.35);
      S.hp = Math.min(st.hpMax, S.hp + v);
      return { ok: true, text: '服下疗伤丹，气血 +' + v + '。' };
    }
    if (id === 'mana') {
      addItem('mana', -1);
      var m = Math.round(st.manaMax * 0.45);
      S.mana = Math.min(st.manaMax, S.mana + m);
      return { ok: true, text: '服下回气丹，法力 +' + m + '。' };
    }
    if (id === 'cult') {
      addItem('cult', -1);
      S.cult += 120;
      return { ok: true, text: '培元丹化开，修为 +120。' };
    }
    return { ok: false, text: '此物现在用不上。' };
  }

  /* ---------------- 存档 ---------------- */
  /* =============================================================
     江湖：势力版图 · 江湖大事 · 年度纪事
     -------------------------------------------------------------
     世界每年推演一次：
       1. 进行中的大事走一年，散场就记一笔
       2. 正魔张力涨落（凶名越高，越容易被卷进去）
       3. 张力够高时，一方发难，抢一个地盘
       4. 随机起一件大事，影响修炼 / 物价 / 凶险
       5. 记几条纪事，写进日志
     ============================================================= */
  var FACTION = {
    zheng: { name: '正道', cls: 'zheng' },
    mo: { name: '魔道', cls: 'mo' },
    none: { name: '无主', cls: 'none' }
  };

  /* 起始归属：山门与门户之地归各派，荒野无主 */
  var HOME = {
    zheng: ['huangfeng', 'qixuan', 'qingniu', 'tainan'],
    mo: ['modao', 'luanzang', 'zhuimo']
  };

  var WORLD_EVENTS = [
    {
      id: 'lingchao', name: '灵潮', turns: 3, tone: 'good',
      text: '天南灵气忽然涨了一截，各处洞府门前都坐满了人。',
      mods: { cult: 1.35, price: 0.9 }
    },
    {
      id: 'xueyue', name: '血月', turns: 3, tone: 'bad',
      text: '夜空挂了三天红月。魔修像是被什么唤醒，野外的动静比往年大得多。',
      mods: { danger: 1.45, cult: 0.95, price: 1.15 }
    },
    {
      id: 'yaoshou', name: '妖兽潮', turns: 2, tone: 'bad',
      text: '万岭山脉的妖兽成群下山，山道上到处是血迹。',
      mods: { danger: 1.5, price: 1.2 }
    },
    {
      id: 'dabi', name: '正道大比', turns: 2, tone: 'good',
      text: '黄枫谷开山门收徒，七派弟子齐聚，城里连客栈都满了。',
      mods: { fame: 2, price: 1.1 }
    },
    {
      id: 'yehang', name: '魔道夜行', turns: 2, tone: 'bad',
      text: '魔道据点灯火彻夜不熄，来往的修士都绕着走。',
      mods: { danger: 1.3, cult: 1.1, price: 1.12 }
    },
    {
      id: 'dajie', name: '大能陨落', turns: 2, tone: 'good',
      text: '有人在坠魔谷外捡到半截断剑，说是一位老怪物的遗物。',
      mods: { loot: 1.4, price: 1.08 }
    },
    {
      id: 'huangnian', name: '荒年', turns: 2, tone: 'bad',
      text: '灵草歉收，丹药价格一路往上。',
      mods: { price: 1.35, cult: 0.9 }
    },
    {
      id: 'kaimen', name: '秘境松动', turns: 2, tone: 'good',
      text: '几处古修遗址的禁制松了，有人听见地下传来钟声。',
      mods: { loot: 1.3, danger: 1.15 }
    }
  ];

  function clampNum(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function initWorld() {
    var ctrl = {};
    D.LOCATIONS.forEach(function (l) { ctrl[l.id] = 'none'; });
    HOME.zheng.forEach(function (id) { if (ctrl[id] !== undefined) ctrl[id] = 'zheng'; });
    HOME.mo.forEach(function (id) { if (ctrl[id] !== undefined) ctrl[id] = 'mo'; });
    S.world = {
      control: ctrl,
      events: [],
      news: [],
      tension: 22,
      seq: 0
    };
  }

  function worldReady() {
    if (!S.world || !S.world.control) initWorld();
    return S.world;
  }

  function pushNews(text, cls) {
    var w = worldReady();
    w.news.push({ y: S.year, text: text, cls: cls || '' });
    if (w.news.length > 40) w.news.shift();
    log(text, cls === 'bad' ? 'bad' : cls === 'good' ? 'good' : 'sys');
  }

  function activeMods() {
    var w = worldReady();
    var m = { cult: 1, danger: 1, price: 1, loot: 1, fame: 1 };
    w.events.forEach(function (e) {
      for (var k in e.mods) m[k] = (m[k] || 1) * e.mods[k];
    });
    return m;
  }
  function cultMul() { return activeMods().cult; }
  function dangerMul() { return activeMods().danger; }
  function priceMul() { return activeMods().price; }
  function lootMul() { return activeMods().loot; }

  /* 玩家在某个地盘上的处境：同门 / 敌对 / 无主 */
  function controlOf(locId) {
    var w = worldReady();
    return w.control[locId] || 'none';
  }
  function playerSide() {
    if (!S.sect) return null;
    return S.sect.id === 'huangfeng' ? 'zheng' : S.sect.id === 'modao' ? 'mo' : null;
  }
  function isHostile(locId) {
    var c = controlOf(locId);
    var me = playerSide();
    if (!me || c === 'none') return false;
    return c !== me;
  }
  /* 敌对地盘的额外凶险 */
  function hostileDanger(locId) {
    return isHostile(locId) ? 0.35 : 0;
  }

  function spawnWorldEvent() {
    var w = worldReady();
    var act = w.events.map(function (e) { return e.id; });
    var pool = WORLD_EVENTS.filter(function (e) { return act.indexOf(e.id) < 0; });
    if (!pool.length) return null;
    var base = pool[Math.floor(Math.random() * pool.length)];
    var ev = {
      id: base.id, name: base.name, text: base.text, tone: base.tone,
      turns: base.turns, mods: base.mods
    };
    w.events.push(ev);
    pushNews('【' + ev.name + '】' + ev.text, ev.tone === 'bad' ? 'bad' : 'good');
    return ev;
  }

  /* 一方发难，抢一个地盘 */
  function factionPush(side) {
    var w = worldReady();
    var targets = D.LOCATIONS.filter(function (l) {
      return (w.control[l.id] || 'none') !== side;
    });
    if (!targets.length) return null;
    /* 优先抢邻接的、无主的、低危的 */
    targets.sort(function (a, b) {
      var sa = (w.control[a.id] === 'none' ? 2 : 0) + (4 - a.tier) + Math.random() * 2;
      var sb = (w.control[b.id] === 'none' ? 2 : 0) + (4 - b.tier) + Math.random() * 2;
      return sb - sa;
    });
    var loc = targets[0];
    var from = w.control[loc.id] || 'none';
    w.control[loc.id] = side;
    var nm = FACTION[side].name;
    var txt = from === 'none'
      ? '【' + nm + '】' + nm + '修士进了' + loc.name + '，从此那里有了主人。'
      : '【' + nm + '】' + nm + '从' + FACTION[from].name + '手里夺下了' + loc.name + '。';
    pushNews(txt, side === 'mo' ? 'bad' : 'good');
    return { side: side, loc: loc.id, from: from };
  }

  function worldYearly() {
    var w = worldReady();

    /* 1. 大事推进 */
    var still = [];
    w.events.forEach(function (e) {
      e.turns--;
      if (e.turns > 0) still.push(e);
      else pushNews('【' + e.name + '】风波渐息。', 'sys');
    });
    w.events = still;

    /* 2. 张力 */
    var drift = 2 + (Math.random() * 14 - 6) + (S.notoriety || 0) * 0.05 + (S.kills || 0) * 0.03;
    if (S.sect) drift -= 1.5;
    w.tension = clampNum(w.tension + drift, 0, 100);

    /* 3. 起大事 */
    /* 开局前两年必有一件大事，让人一进来就撞上江湖 */
    var first = (w.news.length === 0 && S.year <= 2);
    var p = 0.30 + w.tension / 300;
    if (w.events.length < 2 && (first || Math.random() < p)) spawnWorldEvent();

    /* 4. 势力推进：张力高才打 */
    if (w.tension > 34 && Math.random() < 0.38) {
      var me = playerSide();
      var side = Math.random() < 0.5 ? 'zheng' : 'mo';
      if (me && Math.random() < 0.45) side = me;
      factionPush(side);
    }

    /* 5. 常态纪事：让每年都有东西可读 */
    if (Math.random() < 0.55) {
      var pool = (g.LORE && g.LORE.RUMORS) ? g.LORE.RUMORS : [
        '嘉元城的坊市换了新价，听说北边来的货少了。',
        '有人在太南小会上出了一枚来路不明的玉简。',
        '黄枫谷外门又收了一批弟子，山道上全是生面孔。',
        '魔道据点的灯火熄了三夜，不知道在做什么。',
        '万岭山脉深处传来兽吼，附近村落闭门不开。',
        '有个散修在血色禁地边缘失踪，尸首没找到。',
        '坊间传着一位元婴老怪的洞府图，真假难辨。'
      ];
      pushNews(pool[Math.floor(Math.random() * pool.length)], 'sys');
    }
  }

  /* 面板用：一次取出全部状态 */
  function worldState() {
    var w = worldReady();
    var mods = activeMods();
    return {
      year: S.year,
      tension: Math.round(w.tension),
      side: playerSide(),
      control: Object.assign({}, w.control),
      events: w.events.map(function (e) {
        return { id: e.id, name: e.name, text: e.text, tone: e.tone, turns: e.turns };
      }),
      news: w.news.slice(-14).reverse(),
      mods: mods,
      here: { loc: S.loc, control: controlOf(S.loc), hostile: isHostile(S.loc) }
    };
  }

  /* =============================================================
     闭关：一年一推，随时收功
     -------------------------------------------------------------
     修炼不再是「选几年、点确定」，而是坐在洞府里一年一年熬：
       灵石在烧、道心在掉、寿元在走，偶尔还有事发生。
     三种心法：稳健 / 精进 / 参悟，收益与风险都不同。
     ============================================================= */
  var STRAT = {
    steady: {
      name: '稳健', gain: 1.0, cost: 1.0, dao: 2, ev: 0.20,
      desc: '按部就班，聚灵阵开小一点。收益平平，但不容易出事。'
    },
    push: {
      name: '精进', gain: 1.45, cost: 1.15, dao: 4, ev: 0.38,
      desc: '把阵法开到最大，灵气往里灌。涨得快，心魔也快。'
    },
    insight: {
      name: '参悟', gain: 1.15, cost: 1.35, dao: 1, ev: 0.30,
      desc: '不求快，只求明白。耗灵石多，但偶有顿悟。'
    }
  };

  /* 闭关中可能撞上的事 */
  function rollCultEvent(st) {
    var r = Math.random();
    var dao = S.dao == null ? 60 : S.dao;
    /* 道心越低，心魔越容易翻上来 */
    var demonP = 0.10 + Math.max(0, (55 - dao) / 100) + (st === STRAT.push ? 0.10 : 0);
    if (r < demonP) return 'demon';
    r -= demonP;
    if (r < 0.18) return 'insight';
    if (r < 0.34) return 'fluct';
    if (r < 0.44 && (S.notoriety || 0) > 25) return 'challenge';
    if (r < 0.54 && itemCount('herb') > 0) return 'windfall';
    return 'quiet';
  }

  function meditateYear(strategy) {
    var st = STRAT[strategy] || STRAT.steady;
    if (S.step < 0) return { ok: false, text: '你还没引气入体，枯坐也是白坐。' };

    var info = stepInfo(S.step);
    var rootMul = ROOT_CULT[S.root.id] || 1;
    var need = needFor(S.step);
    var ratio = S.cult / need;
    var bn = ratio >= 1 ? 0.08 : ratio > 0.8 ? 0.75 : ratio > 0.5 ? 1.0 : 1.15;
    var cost = Math.max(1, Math.round(meditateCost(1) * st.cost));
    var poor = S.stones < cost;
    addStones(-Math.min(S.stones, cost));

    var gain = Math.round(YEAR_GAIN[info.realm] * rootMul * qiOf(S.loc) * bn *
      (0.85 + Math.random() * 0.3) * st.gain * cultMul() * (poor ? 0.4 : 1) * caveCultMul());

    var lines = [];
    var ev = rollCultEvent(st);
    var daoLoss = st.dao;
    var extra = {};

    if (ev === 'demon') {
      var lost = Math.round(S.cult * 0.08);
      S.cult = Math.max(0, S.cult - lost);
      daoLoss += 6;
      S.hp = Math.max(1, S.hp - Math.round(stats().hpMax * 0.12));
      lines.push('心魔翻涌，识海里有人在叫你名字。你咬破舌尖才压下去，修为散了 ' + lost + '。');
      extra.demon = true;
    } else if (ev === 'insight') {
      gain = Math.round(gain * 2.4);
      S.dao = Math.min(100, (S.dao || 60) + 6);
      lines.push('某个瞬间，你忽然看懂了灵气流转的那条线。这一年抵得上三年。');
      extra.insight = true;
    } else if (ev === 'fluct') {
      gain = Math.round(gain * 0.6);
      lines.push('这一带灵气忽然稀薄，聚灵阵的光弱了一半。');
    } else if (ev === 'challenge') {
      var loss = Math.round(stats().hpMax * 0.18);
      S.hp = Math.max(1, S.hp - loss);
      S.notoriety = (S.notoriety || 0) + 2;
      lines.push('有人在你洞府外叫阵。你没出去，只听着他在外头骂了半个时辰。气血亏了 ' + loss + '。');
      extra.challenge = true;
    } else if (ev === 'windfall') {
      addItem('herb', 1);
      lines.push('洞府石缝里长出一株灵草，你顺手收了。');
    } else if (Math.random() < 0.3) {
      lines.push(['洞里只有水滴声。你把这一段经脉又走了一遍。',
        '一年过去，头发长了一寸，修为涨了一点。',
        '夜里听见山风，恍惚间像是有人在远处笑。'][Math.floor(Math.random() * 3)]);
    }

    S.cult += gain;
    S.dao = Math.max(0, Math.min(100, (S.dao == null ? 60 : S.dao) - daoLoss));
    if (S.dao > 80) gain = Math.round(gain * 1.05);

    advanceDays(365);
    var atBn = S.cult >= needFor(S.step);
    log('闭关一年，修为 +' + gain + '。', atBn ? '' : 'good');

    return {
      ok: true, gain: gain, cost: Math.min(S.stones + cost, cost), poor: poor,
      dao: Math.round(S.dao), bottleneck: atBn, event: ev, lines: lines,
      cult: S.cult, need: needFor(S.step)
    };
  }

  /* 旧的「闭关 N 年」保留：给无头跑局和快捷入口用 */
  function meditateFast(years) {
    years = years || 1;
    var total = 0, last = null;
    for (var i = 0; i < years; i++) {
      last = meditateYear('steady');
      if (!last.ok) return last;
      total += last.gain || 0;
    }
    return {
      ok: true, years: years, gain: total, bottleneck: last && last.bottleneck,
      dao: last && last.dao, text: '闭关 ' + years + ' 年，修为 +' + total + '。'
    };
  }

  /* =============================================================
     秘境征程
     -------------------------------------------------------------
     进秘境后是一条线：一层一层往前走，每层一个地块。
       妖气 = 战斗 / 灵材 = 采集 / 异象 = 奇遇 / 泉眼 = 歇脚
       岔口 = 选路（险路油水多，稳路少遇敌）
       终点 = 守关 BOSS，赢了才拿得到天材地宝
     ============================================================= */
  var RUN_TYPES = [
    { t: 'battle', w: 4 }, { t: 'gather', w: 3 }, { t: 'event', w: 3 }, { t: 'rest', w: 2 }
  ];

  function pickRunType() {
    var tot = RUN_TYPES.reduce(function (a, b) { return a + b.w; }, 0);
    var r = Math.random() * tot;
    for (var i = 0; i < RUN_TYPES.length; i++) { r -= RUN_TYPES[i].w; if (r <= 0) return RUN_TYPES[i].t; }
    return 'battle';
  }

  function startRun(locId, mj) {
    var len = 7 + Math.floor(Math.random() * 2);
    var nodes = [];
    for (var i = 0; i < len; i++) {
      if (i === len - 1) { nodes.push({ t: 'boss' }); break; }
      if (i > 0 && i % 3 === 0) { nodes.push({ t: 'branch' }); continue; }
      nodes.push({ t: pickRunType() });
    }
    S.run = {
      loc: locId, name: mj.name, idx: 0, nodes: nodes, log: [],
      active: true, tier: Math.min(4, mj.realmCap || 2), loot: 1, wins: 0
    };
    log('踏入' + mj.name + '。禁制在身后合上了。', 'sys');
    return S.run;
  }

  function runState() {
    if (!S.run) return null;
    var n = S.run.nodes[S.run.idx] || null;
    return {
      name: S.run.name, idx: S.run.idx, len: S.run.nodes.length,
      nodes: S.run.nodes.map(function (x) { return x.t; }),
      log: S.run.log.slice(-6),
      next: n ? n.t : null,
      active: S.run.active, loot: S.run.loot
    };
  }

  var RUN_TEXT = {
    battle: { label: '妖气', line: '前头有东西在动，气息不稳。' },
    gather: { label: '灵材', line: '石缝里有灵光，像是长了些年头。' },
    event: { label: '异象', line: '半空浮着一行古字，看不清是警示还是饵。' },
    rest: { label: '泉眼', line: '一泓冷泉，灵气足得很。' },
    branch: { label: '岔口', line: '洞道在这里分成两条。' },
    boss: { label: '守关', line: '洞底开阔。有东西守在那里。' }
  };

  function runEnemy(tier, boss) {
    var base = boss ? beastUnit(Math.min(4, tier + 1), '守关妖兽') : beastUnit(tier);
    if (boss) {
      base.name = '守关妖兽';
      base.hp = Math.round(base.hp * 1.5);
    }
    return base;
  }

  /* 推进一层：返回给界面渲染的描述；战斗类由界面去开打 */
  function runNext() {
    var R = S.run;
    if (!R || !R.active) return { ok: false, text: '你已经不在秘境里了。' };
    var node = R.nodes[R.idx];
    if (!node) { R.active = false; return { ok: true, kind: 'out', text: '你走到了尽头。' }; }

    if (node.t === 'branch') {
      return { ok: true, kind: 'branch', text: RUN_TEXT.branch.line, options: [
        { k: 'risk', text: '走左边（洞壁有抓痕，油水多）' },
        { k: 'safe', text: '走右边（风是通的，稳妥些）' }
      ] };
    }

    R.idx++;
    var res = { ok: true, kind: node.t, idx: R.idx, len: R.nodes.length };

    if (node.t === 'battle') {
      res.text = '你惊动了一头东西。';
      res.battle = runEnemy(R.tier, false);
      res.needBattle = true;
      R.pendingBattle = true;
      return res;
    }
    if (node.t === 'boss') {
      res.text = '守关的东西站了起来。';
      res.battle = runEnemy(R.tier, true);
      res.needBattle = true;
      res.boss = true;
      R.pendingBattle = true;
      return res;
    }
    if (node.t === 'gather') {
      var got = Math.random() < 0.5 ? 'herb' : 'ore';
      var n = 1 + Math.floor(Math.random() * 2);
      addItem(got, n);
      var stones = Math.round((30 + Math.random() * 60) * R.loot);
      addStones(stones);
      res.text = '采到 ' + (D.ITEMS[got] || {}).name + ' ×' + n + '，还有 ' + stones + ' 块灵石。';
      res.gain = true;
    } else if (node.t === 'rest') {
      var st = stats();
      S.hp = Math.min(st.hpMax, S.hp + Math.round(st.hpMax * 0.3));
      S.mana = Math.min(st.manaMax, S.mana + Math.round(st.manaMax * 0.3));
      res.text = '你在泉边坐了一阵，气血与法力都回了三成。';
      res.rest = true;
    } else if (node.t === 'event') {
      var roll = Math.random();
      if (roll < 0.4) {
        var c = Math.round(60 + Math.random() * 140);
        S.cult += c;
        res.text = '古字是一段残缺的口诀。你照着走了半遍，修为 +' + c + '。';
      } else if (roll < 0.7) {
        var lost = Math.round(S.hp * 0.12);
        S.hp = Math.max(1, S.hp - lost);
        res.text = '禁制忽然反噬，你被弹开，气血 -' + lost + '。';
      } else {
        var it = Math.random() < 0.5 ? 'heal' : 'mana';
        addItem(it, 1);
        res.text = '石台上留着一枚' + (D.ITEMS[it] || {}).name + '，还能用。';
      }
    }
    R.log.push(res.text);
    return res;
  }

  /* 岔口选路 */
  function runChoose(k) {
    var R = S.run;
    if (!R || !R.active) return { ok: false };
    if (k === 'risk') {
      R.loot = Math.min(2.2, R.loot * 1.6);
      var insertAt = Math.min(R.nodes.length - 1, R.idx + 1);
      R.nodes.splice(insertAt, 0, { t: 'battle' });
      R.idx++;
      R.log.push('你选了左边。洞壁上有新鲜的抓痕，空气里有铁锈味。');
      return { ok: true, text: '你选了左边。抓痕很新，前面多半有东西。' };
    }
    R.loot = Math.max(0.8, R.loot * 0.9);
    var st = stats();
    S.hp = Math.min(st.hpMax, S.hp + Math.round(st.hpMax * 0.1));
    R.idx++;
    R.log.push('你选了右边。风是通的，前面应该没什么活物。');
    return { ok: true, text: '你选了右边。风是通的，走出去多半没什么活物。' };
  }

  /* 一场秘境战斗结束 */
  function runAfterBattle(win) {
    var R = S.run;
    if (!R) return { ok: false };
    R.pendingBattle = false;
    if (!win) {
      R.active = false;
      var lost = Math.round(S.hp * 0.3);
      S.hp = Math.max(1, S.hp - lost);
      S.run = null;
      log('你被轰出' + R.name + '，在洞口躺了半日。', 'bad');
      return { ok: true, win: false, text: '你被打了出来。气血压了一半，东西也没拿到。', boss: false };
    }
    R.wins++;
    var stones = Math.round((60 + Math.random() * 80) * R.loot);
    addStones(stones);
    var isBoss = R.idx >= R.nodes.length;
    if (isBoss) {
      return finishRun(stones);
    }
    R.log.push('打赢了。从尸体上摸出 ' + stones + ' 块灵石。');
    return { ok: true, win: true, text: '打赢了，摸出 ' + stones + ' 块灵石。', stones: stones, boss: false };
  }

  function finishRun(stones) {
    var R = S.run;
    var gate = gateFor(S.step + 1) || gateFor(S.step);
    var spoil = null;
    if (gate) { addItem(gate.id, 1); spoil = gate.name; }
    var cult = Math.round(300 + Math.random() * 400);
    S.cult += cult;
    S.run = null;
    var txt = '守关的东西倒了下去。' + (spoil ? '它的巢里有一枚 <b>' + spoil + '</b>。' : '') +
      '你收刮了 ' + stones + ' 块灵石，修为 +' + cult + '。';
    log('破了' + R.name + '，得' + (spoil || '灵石若干') + '。', 'good');
    return { ok: true, win: true, boss: true, text: txt, spoil: spoil, stones: stones, cult: cult };
  }

  function exitRun() {
    if (S.run) { S.run.active = false; S.run = null; }
    return { ok: true };
  }

  /* =============================================================
     任务
     -------------------------------------------------------------
     条件驱动：到达 / 战斗 / 采集 / 杀人。
     主线靠学功法自动开始；支线到你走到那个地方自动接下。
     ============================================================= */
  function questDef(id) {
    var list = g.QUESTS || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function startQuest(id) {
    var q = questDef(id);
    if (!q) return null;
    if (!S.quests) S.quests = {};
    if (S.quests[id]) return null;
    S.quests[id] = { stage: 0, c: 0, done: false };
    log('【' + q.title + '】' + q.steps[0].text, 'good');
    return q;
  }

  function completeQuest(id) {
    var q = questDef(id);
    var st = S.quests[id];
    if (!q || !st || st.done) return;
    st.done = true;
    var r = q.reward || {};
    if (r.stones) addStones(r.stones);
    if (r.cult) S.cult += r.cult;
    if (r.fame) addFame(r.fame);
    if (r.notoriety) addNotoriety(r.notoriety);
    if (r.items) Object.keys(r.items).forEach(function (k) { addItem(k, r.items[k]); });
    if (r.tech && S.learned.indexOf(r.tech) < 0) {
      S.learned.push(r.tech);
      log('得《' + (g.TECHS[r.tech] ? g.TECHS[r.tech].name : r.tech) + '》。', 'good');
    }
    log('【' + q.title + '】了结。', 'good');
    if (q.outro) log(q.outro, 'good');
  }

  /* 被对话推进：无视条件，直接进下一层 */
  function advanceQuest(id) {
    var q = questDef(id);
    var st = S.quests && S.quests[id];
    if (!q || !st || st.done) return null;
    var step = q.steps[st.stage];
    if (!step) return null;
    st.c = 0;
    st.stage++;
    if (step.hit) log(step.hit, 'good');
    if (st.stage >= q.steps.length) completeQuest(id);
    else log('【' + q.title + '】' + q.steps[st.stage].text, 'good');
    return st;
  }

  function questTick(kind, arg) {
    if (!S.quests) S.quests = {};
    var list = g.QUESTS || [];
    var i, q, a;

    /* 1. 自动接取 */
    for (i = 0; i < list.length; i++) {
      q = list[i];
      if (S.quests[q.id]) continue;
      a = q.auto;
      if (!a) continue;
      if (a.tech && S.learned.indexOf(a.tech) < 0) continue;
      if (a.loc && S.loc !== a.loc) continue;
      if (a.realm != null && stepInfo(S.step).realm < a.realm) continue;
      startQuest(q.id);
    }

    /* 2. 推进 */
    for (i = 0; i < list.length; i++) {
      q = list[i];
      var st = S.quests[q.id];
      if (!st || st.done) continue;
      var step = q.steps[st.stage];
      if (!step || step.do !== kind) continue;
      if (kind === 'reach' && arg !== step.loc) continue;
      if (kind === 'gather' && step.item && arg !== step.item) continue;

      st.c = (st.c || 0) + 1;
      if (st.c < (step.n || 1)) continue;

      st.c = 0;
      st.stage++;
      if (step.hit) log(step.hit, 'good');
      if (st.stage >= q.steps.length) {
        completeQuest(q.id);
      } else {
        log('【' + q.title + '】' + q.steps[st.stage].text, 'good');
      }
    }
  }

  function questList() {
    var out = [];
    var list = g.QUESTS || [];
    for (var i = 0; i < list.length; i++) {
      var q = list[i];
      var st = S.quests && S.quests[q.id];
      if (!st) continue;
      var step = q.steps[st.stage] || null;
      out.push({
        id: q.id, kind: q.kind, title: q.title, intro: q.intro,
        stage: st.stage, total: q.steps.length, done: st.done,
        cur: step ? step.text : '', need: step ? (step.n || 1) : 0, have: st.c || 0,
        reward: q.reward, outro: q.outro
      });
    }
    out.sort(function (a, b) {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (a.kind !== b.kind) return a.kind === 'main' ? -1 : 1;
      return 0;
    });
    return out;
  }

  /* 地点长文 + 初见 */
  function locLore(locId) {
    return (g.LORE && g.LORE.LOC && g.LORE.LOC[locId]) || '';
  }
  function locArrive(locId) {
    return (g.LORE && g.LORE.ARRIVE && g.LORE.ARRIVE[locId]) || '';
  }

  /* ---------------- 对话树 ---------------- */
  function dialogueFor(npc) {
    var list = g.DIALOGUES || [];
    var i;
    for (i = 0; i < list.length; i++) if (list[i].npc && list[i].npc === npc.id) return list[i];
    for (i = 0; i < list.length; i++) if (list[i].personality && list[i].personality === npc.personality) return list[i];
    return null;
  }

  function dialogOptOk(npc, opt) {
    var c = opt.if;
    if (!c) return true;
    var mem = npc.mem || {};
    if (c.flag && !mem[c.flag]) return false;
    if (c.notFlag && mem[c.notFlag]) return false;
    if (c.qstage) {
      var qs = S.quests && S.quests[c.qstage.id];
      if (!qs || qs.done || qs.stage < c.qstage.n) return false;
    }
    if (c.rel != null && (npc.relation || 0) < c.rel) return false;
    if (c.stones != null && S.stones < c.stones) return false;
    if (c.realm != null && stepInfo(S.step).realm < c.realm) return false;
    if (c.item && itemCount(c.item) < 1) return false;
    return true;
  }

  function applyDialogFx(npc, fx) {
    if (!fx) return null;
    var got = null;
    if (fx.rel) npc.relation = (npc.relation || 0) + fx.rel;
    if (fx.fame) addFame(fx.fame);
    if (fx.notoriety) addNotoriety(fx.notoriety);
    if (fx.stones) addStones(fx.stones);
    if (fx.cult) S.cult += fx.cult;
    if (fx.hp) S.hp = Math.max(1, S.hp + fx.hp);
    if (fx.item) Object.keys(fx.item).forEach(function (k) { addItem(k, fx.item[k]); });
    if (fx.flag) {
      npc.mem = npc.mem || {};
      (Array.isArray(fx.flag) ? fx.flag : [fx.flag]).forEach(function (f) { npc.mem[f] = 1; });
    }
    if (fx.forget) { npc.mem = npc.mem || {}; delete npc.mem[fx.forget]; }
    if (fx.quest) advanceQuest(fx.quest);
    if (fx.tech && S.learned.indexOf(fx.tech) < 0) {
      S.learned.push(fx.tech);
      got = (g.TECHS[fx.tech] || {}).name || fx.tech;
      log('从' + npc.name + '处得《' + got + '》。', 'good');
    }
    if (fx.cult) log('与' + npc.name + '一席话，修为 +' + fx.cult + '。', 'good');
    return got;
  }

  /* 按记忆挑开场：记着哪件事，就从哪个节点说起 */
  function dialogStart(npc, tree) {
    var si = tree.startIf || [];
    var mem = npc.mem || {};
    for (var i = 0; i < si.length; i++) {
      if (mem[si[i][0]]) return si[i][1];
    }
    return tree.start;
  }

  function dialogSay(npc, tree, nodeId) {
    var node = tree.nodes[nodeId];
    if (!node) return null;
    var opts = [];
    (node.opts || []).forEach(function (o, i) {
      if (!dialogOptOk(npc, o)) return;
      opts.push({ i: i, t: o.t });
    });
    return { text: node.text, opts: opts, node: nodeId };
  }

  function dialogPick(npc, tree, nodeId, idx) {
    var node = tree.nodes[nodeId];
    if (!node || !node.opts || !node.opts[idx]) return null;
    var opt = node.opts[idx];
    if (!dialogOptOk(npc, opt)) return null;
    var got = applyDialogFx(npc, opt.fx);
    return { next: opt.to || null, gotTech: got };
  }
  function save() {
    try { localStorage.setItem('fanren_v15_tiannan', JSON.stringify(S)); return true; }
    catch (e) { return false; }
  }
  function load() {
    try {
      var raw = localStorage.getItem('fanren_v15_tiannan');
      if (!raw) return null;
      var d = JSON.parse(raw);
      if (!d || !d.root || d.version !== 2) return null;
      S = d;
      lastYear = Math.floor(S.day / 365);
      worldReady();
      ensureQiEntry();
      return S;
    } catch (e) { return null; }
  }
  function clear() { try { localStorage.removeItem('fanren_v15_tiannan'); } catch (e) {} }

  g.W = {
    D: D, LOC_MAP: LOC_MAP, FACTION: FACTION, STRAT: STRAT,
    meditateYear: meditateYear, meditateFast: meditateFast, meditateLegacy: meditateLegacy,
    canCraftPill: canCraftPill,
    meditate: meditateFast,
    worldState: worldState, initWorld: initWorld, worldReady: worldReady,
    controlOf: controlOf, isHostile: isHostile, playerSide: playerSide,
    cultMul: cultMul, dangerMul: dangerMul, priceMul: priceMul, lootMul: lootMul, REALM_NAMES: REALM_NAMES,
    newGame: newGame, state: function () { return S; },
    stats: stats, stepInfo: stepInfo, stepName: stepName, needFor: needFor,
    age: age, lifespan: lifespan, isLastLayer: isLastLayer,
    npcsAt: npcsAt, findNpc: findNpc, ensureNpcs: ensureNpcs, npcUnit: npcUnit,
    talk: talk, spar: spar, kill: kill, gift: gift, askFavor: askFavor,
    attitude: attitude, attitudeLabel: attitudeLabel, openRisk: openRisk, evil: evilPlayer,
    travel: travel, travelDays: travelDays, canTeleport: canTeleport, gateBetween: gateBetween, rest: rest, meditate: meditateFast, canBreak: canBreak,
    bottleneck: bottleneck, qiOf: qiOf, estimateGain: estimateGain, breakChance: breakChance,
    meditateCost: meditateCost, teleportCost: teleportCost, canTeleport: canTeleport,
    craftPill: craftPill, craftTreasure: craftTreasure, equipTreasure: equipTreasure, treasureDef: treasureDef,
    breakThrough: breakThrough, gateFor: gateFor, retrain: retrain, switchDays: switchDays,
    startRun: startRun, runState: runState, runNext: runNext, runChoose: runChoose,
    questTick: questTick, questList: questList, startQuest: startQuest, locLore: locLore, locArrive: locArrive,
    dialogueFor: dialogueFor, dialogSay: dialogSay, dialogPick: dialogPick,
    dialogStart: dialogStart, advanceQuest: advanceQuest,
    runAfterBattle: runAfterBattle, exitRun: exitRun, RUN_TEXT: RUN_TEXT,
    useItem: useItem, spellsOf: spellsOf, autoLoadout: autoLoadout, autoStudy: autoStudy, rebuildLoadout: rebuildLoadout,
    makeBattle: makeBattle, afterBattle: afterBattle, pending: function () { return pending; },
    setPending: function (p) { pending = p; },
    rollEvent: rollEvent, applyFx: applyFx, W: W,
    beastUnit: beastUnit, banditUnit: banditUnit,
    addStones: addStones, addItem: addItem, itemCount: itemCount,
    addFame: addFame, addNotoriety: addNotoriety, log: log,
    save: save, load: load, clear: clear, advanceDays: advanceDays,
    encounterAt: encounterAt, takeEncounter: takeEncounter, refreshEncounter: refreshEncounter,
    setChain: setChain, chainStep: chainStep,
    specialAt: specialAt, markSpecial: markSpecial,
    grantTech: grantTech, grantTechAny: grantTechAny, ensureQiEntry: ensureQiEntry,
    checkHunter: checkHunter, takeMail: takeMail,
    joinSect: joinSect, sectDef: sectDef, sectAt: sectAt, promote: promote, chooseFaction: chooseFaction,
    auctionOpen: auctionOpen, ensureAuction: ensureAuction, auctionBid: auctionBid,
    mijingAt: mijingAt, mijingLeft: mijingLeft, enterMijing: enterMijing,
    sectTasks: sectTasks, acceptTask: acceptTask, finishTask: finishTask,
    sectLibrary: sectLibrary, buySectTech: buySectTech, leaveSect: leaveSect, sectPct: sectPct,
    LAYER_COUNTS: LAYER_COUNTS
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
