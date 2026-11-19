/* =============================================================
   洞府 / 飞行法器 / 灵田 / 悬赏 / 百宝阁 —— 逻辑层（v17）
   通过 W 的公开 API 操作状态，不改世界层的内部变量
   ============================================================= */
(function (g) {
  'use strict';
  var D = g.WORLD_DATA;

  function S() { return g.W.state(); }

  function ensure() {
    var s = S();
    if (s.cave === undefined) s.cave = null;
    if (!s.fly) s.fly = null;
    if (!s.bounties) s.bounties = {};
    if (!s.bountyDone) s.bountyDone = 0;
    if (!s.caveSeed) s.caveSeed = (Math.random() * 1e9) | 0;
    return s;
  }

  function rnd(n) { return Math.floor(Math.random() * n); }

  /* ---------------- 洞府 ---------------- */
  function caveTier() {
    var s = ensure();
    if (!s.cave) return null;
    for (var i = 0; i < D.CAVE_TIERS.length; i++) if (D.CAVE_TIERS[i].id === s.cave.tier) return D.CAVE_TIERS[i];
    return null;
  }

  function tierIndex() {
    var s = ensure();
    if (!s.cave) return -1;
    for (var i = 0; i < D.CAVE_TIERS.length; i++) if (D.CAVE_TIERS[i].id === s.cave.tier) return i;
    return -1;
  }

  function canBuildHere(locId) {
    var loc = g.W.LOC_MAP[locId];
    return !!(loc && loc.features && loc.features.indexOf('cave') >= 0);
  }

  function buildCost() {
    var s = ensure();
    var idx = tierIndex();
    if (idx < 0) return D.CAVE_TIERS[0].cost;
    var next = D.CAVE_TIERS[idx + 1];
    return next ? next.cost : 0;
  }

  function build(locId) {
    var s = ensure();
    var t = D.CAVE_TIERS[0];
    if (s.cave) return { ok: false, text: '你已经有洞府了。' };
    if (!canBuildHere(locId)) return { ok: false, text: '这里开不了洞府。' };
    var realm = g.W.stepInfo(s.step).realm;
    if (s.step < t.step) return { ok: false, text: '修为不够，至少要有炼气' + (t.step + 1) + '层的底子才压得住地气。' };
    if (s.stones < t.cost) return { ok: false, text: '开辟洞府要 ' + t.cost + ' 块灵石，你只有 ' + s.stones + '。' };
    g.W.addStones(-t.cost);
    s.cave = { tier: t.id, loc: locId, rooms: {}, fields: [], built: s.day, lastYear: Math.floor(s.day / 365) };
    g.W.addFame(2);
    g.W.log('你在' + g.W.LOC_MAP[locId].name + '凿了一间洞府。石门合上的那一刻，外面的风一下就听不见了。', 'good');
    return { ok: true, text: '洞府开辟成功。' };
  }

  function upgrade() {
    var s = ensure();
    if (!s.cave) return { ok: false, text: '你还没有洞府。' };
    var idx = tierIndex();
    var next = D.CAVE_TIERS[idx + 1];
    if (!next) return { ok: false, text: '已是洞天，再往上就不是人界的东西了。' };
    if (s.step < next.step) return { ok: false, text: '修为不够，' + next.name + '要' + g.W.stepName(next.step) + '才撑得住。' };
    if (s.stones < next.cost) return { ok: false, text: '扩建成' + next.name + '要 ' + next.cost + ' 块灵石。' };
    g.W.addStones(-next.cost);
    s.cave.tier = next.id;
    g.W.log('洞府扩建成了' + next.name + '。', 'good');
    return { ok: true, text: '洞府扩建完成。' };
  }

  function roomLevel(id) {
    var s = ensure();
    return (s.cave && s.cave.rooms && s.cave.rooms[id]) || 0;
  }

  function roomCount() {
    var s = ensure();
    if (!s.cave) return 0;
    var n = 0;
    Object.keys(s.cave.rooms || {}).forEach(function (k) { if (k !== 'muren' && s.cave.rooms[k] > 0) n++; });
    return n;
  }

  function buildRoom(id) {
    var s = ensure();
    var def = D.CAVE_ROOMS[id];
    if (!def) return { ok: false, text: '没有这种房间。' };
    if (!s.cave) return { ok: false, text: '先开洞府。' };
    var lv = roomLevel(id);
    if (lv >= def.max) return { ok: false, text: def.name + '已经到顶了。' };
    if (id !== 'muren' && lv === 0 && roomCount() >= caveTier().rooms) {
      return { ok: false, text: caveTier().name + '只放得下 ' + caveTier().rooms + ' 间，得先扩建。' };
    }
    var cost = D.roomUpCost(id, lv + 1);
    if (s.stones < cost) return { ok: false, text: def.name + '要 ' + cost + ' 块灵石。' };
    g.W.addStones(-cost);
    s.cave.rooms[id] = lv + 1;
    if (id === 'lingtian') { s.cave.fields.push({ planted: Math.floor(s.day / 365) }); }
    g.W.log('洞里多了一间' + def.name + '。', 'good');
    return { ok: true, text: def.name + ' 建成（' + (lv + 1) + ' 级）。' };
  }

  /* 每年：灵田出产、灵泉产灵石、扣维护费 */
  function yearly() {
    var s = ensure();
    if (!s.cave) return;
    var t = caveTier();
    var msgs = [];
    var lvQuan = roomLevel('lingquan');
    if (lvQuan > 0) {
      var stones = 60 * lvQuan;
      g.W.addStones(stones);
      msgs.push('灵泉结出 ' + stones + ' 块灵石');
    }
    var lvTian = roomLevel('lingtian');
    if (lvTian > 0) {
      var y = Math.floor(s.day / 365);
      s.cave.fields.forEach(function (f, i) {
        if (!f || !f.planted) return;
        if (y - f.planted >= 1) {
          var n = 2 + rnd(3) + lvTian;
          g.W.addItem('herb', n);
          msgs.push('灵田收成 ' + n + ' 株灵草');
          f.planted = 0;
        }
      });
    }
    var upkeep = t ? t.upkeep : 0;
    if (upkeep > 0) {
      if (s.stones >= upkeep) { g.W.addStones(-upkeep); }
      else {
        g.W.log('洞府的灵气养不住了，石门上的禁制暗了一格。', 'bad');
        s.cave.neglect = (s.cave.neglect || 0) + 1;
        if (s.cave.neglect >= 3) {
          g.W.log('洞府塌了半边，你只剩下几间还能用的石室。', 'bad');
          s.cave.neglect = 0;
          var idx = tierIndex();
          if (idx > 0) s.cave.tier = D.CAVE_TIERS[idx - 1].id;
        }
      }
    }
    if (msgs.length) g.W.log('洞府：' + msgs.join('，') + '。', 'good');
  }

  function plant() {
    var s = ensure();
    if (!s.cave) return { ok: false, text: '你还没有洞府。' };
    if (roomLevel('lingtian') <= 0) return { ok: false, text: '得先有一畦灵田。' };
    var free = s.cave.fields.filter(function (f) { return f && !f.planted; });
    if (!free.length) return { ok: false, text: '田里都种满了，等明年收。' };
    if (s.stones < 20) return { ok: false, text: '灵种要 20 块灵石。' };
    g.W.addStones(-20);
    free[0].planted = Math.floor(s.day / 365);
    return { ok: true, text: '撒下灵种，明年这个时候能收。' };
  }

  function fieldState() {
    var s = ensure();
    if (!s.cave) return [];
    return s.cave.fields.map(function (f) { return !!f.planted; });
  }

  /* ---------------- 修炼加成 ---------------- */
  function cultBonus() {
    return roomLevel('juling') * 0.15;
  }

  /* ---------------- 飞行法器 ---------------- */
  function flyMul() {
    var s = ensure();
    if (!s.fly) return 1;
    for (var i = 0; i < D.FLY.length; i++) if (D.FLY[i].id === s.fly) return D.FLY[i].mul;
    return 1;
  }

  function flyName() {
    var s = ensure();
    if (!s.fly) return '无';
    for (var i = 0; i < D.FLY.length; i++) if (D.FLY[i].id === s.fly) return D.FLY[i].name;
    return '无';
  }

  function buyFly(id) {
    var s = ensure();
    var def = null;
    D.FLY.forEach(function (f) { if (f.id === id) def = f; });
    if (!def) return { ok: false, text: '没有这件法器。' };
    if (s.fly === id) return { ok: false, text: '你已经在用它了。' };
    var realm = g.W.stepInfo(s.step).realm;
    if (realm < def.need) return { ok: false, text: '御不动，至少要' + g.W.REALM_NAMES[def.need] + '。' };
    if (s.stones < def.price) return { ok: false, text: def.name + '要 ' + def.price + ' 块灵石。' };
    g.W.addStones(-def.price);
    s.fly = id;
    g.W.log('你买下了' + def.name + '。', 'good');
    return { ok: true, text: '买下' + def.name + '，赶路快了不少。' };
  }

  /* ---------------- 悬赏 ---------------- */
  function ensureBoard(locId) {
    var s = ensure();
    var loc = g.W.LOC_MAP[locId];
    if (!loc || (loc.tier > 1)) return;
    var key = locId + '_' + Math.floor(s.day / 365);
    if (s.bounties[key]) return s.bounties[key];
    var n = 3 + (loc.kind === '城' || loc.kind === '都城' ? 2 : 0);
    var list = [];
    var kinds = loc.tier === 0 ? ['gather', 'beast', 'guard'] : ['beast', 'hunt', 'gather'];
    for (var i = 0; i < n; i++) {
      var kind = kinds[rnd(kinds.length)];
      var names = D.BOUNTY_NAMES[kind];
      var tier = Math.max(0, Math.min(3, g.W.stepInfo(s.step).realm + (loc.tier >= 1 ? rnd(2) : 0)));
      var base = [140, 420, 1200, 3600][Math.min(3, tier)] || 140;
      list.push({
        id: 'b' + i + '_' + key,
        kind: kind,
        name: names[rnd(names.length)],
        tier: tier,
        days: 4 + rnd(8),
        stones: Math.round(base * (0.8 + Math.random() * 0.7)),
        fame: 1 + rnd(3),
        done: false
      });
    }
    s.bounties[key] = list;
    return list;
  }

  function boardAt(locId) { return ensureBoard(locId); }

  function bonusFor(b) {
    var s = ensure();
    if (b.kind === 'guard') return { ok: true, text: '你押着货走了' + b.days + '天，路上没出事。' };
    return null;
  }

  function finishBounty(b) {
    var s = ensure();
    if (!b || b.done) return { ok: false };
    b.done = true;
    s.bountyDone = (s.bountyDone || 0) + 1;
    g.W.addStones(b.stones);
    g.W.addFame(b.fame);
    g.W.log('交了悬赏：' + b.name + '，得 ' + b.stones + ' 块灵石。', 'good');
    return { ok: true, text: b.name + ' —— 得 ' + b.stones + ' 灵石。' };
  }

  /* ---------------- 百宝阁 ---------------- */
  function baigeStock() {
    var s = ensure();
    var out = [];
    D.FLY.forEach(function (f) {
      out.push({
        id: f.id, kind: 'fly', name: f.name, price: Math.round(f.price * D.BAIGE_MARKUP),
        desc: f.desc, owned: s.fly === f.id, grade: f.grade
      });
    });
    var book = D.TREASURE_BOOK || [];
    var realm = g.W.stepInfo(s.step).realm;
    book.forEach(function (t) {
      if (t.grade > realm + 1) return;               // 高一阶的东西看得见买不着
      var price = Math.round(t.price * D.BAIGE_MARKUP);
      out.push({
        id: t.id, kind: 'treasure', name: t.name, price: price, desc: t.desc,
        owned: s.treasures.indexOf(t.id) >= 0, grade: t.grade,
        locked: t.grade > realm
      });
    });
    return out;
  }

  function buyAtBaige(id, kind) {
    var s = ensure();
    if (kind === 'fly') return buyFly(id);
    var def = null;
    (D.TREASURE_BOOK || []).forEach(function (t) { if (t.id === id) def = t; });
    if (!def) (D.TREASURES || []).forEach(function (t) { if (t.id === id) def = t; });
    if (def && def.grade != null) {
      var rr = g.W.stepInfo(s.step).realm;
      if (def.grade > rr) return { ok: false, text: '你压不住这件东西的灵气。' };
    }
    if (!def) return { ok: false, text: '没这东西。' };
    if (s.treasures.indexOf(id) >= 0) return { ok: false, text: '你已经有一件了。' };
    var price = Math.round((def.price || 2000) * D.BAIGE_MARKUP);
    if (s.stones < price) return { ok: false, text: def.name + '要 ' + price + ' 块灵石。' };
    g.W.addStones(-price);
    s.treasures.push(id);
    g.W.log('你在百宝阁买下' + def.name + '。', 'good');
    return { ok: true, text: '得' + def.name + '。' };
  }

  /* ---------------- 木人桩 ---------------- */
  function dummyUnit() {
    var s = ensure();
    var st = g.W.stats();
    return {
      uid: 'dummy', name: '木人桩', side: 'foe', front: true, isDummy: true,
      hp: 999999, hpMax: 999999, mana: 0, manaMax: 0,
      atk: 1, def: Math.max(1, Math.round(st.def)), spd: 40,
      spells: [], realm: 0, alive: true
    };
  }

  g.CAVE = {
    ensure: ensure, build: build, upgrade: upgrade, buildRoom: buildRoom,
    caveTier: caveTier, tierIndex: tierIndex, canBuildHere: canBuildHere, buildCost: buildCost,
    roomLevel: roomLevel, roomCount: roomCount, fieldState: fieldState, plant: plant,
    yearly: yearly, cultBonus: cultBonus,
    flyMul: flyMul, flyName: flyName, buyFly: buyFly,
    boardAt: boardAt, finishBounty: finishBounty, bonusFor: bonusFor,
    baigeStock: baigeStock, buyAtBaige: buyAtBaige, dummyUnit: dummyUnit
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
