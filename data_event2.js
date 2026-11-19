/* =============================================================
   拍卖会 / 定时秘境 / 法宝主动技
   ============================================================= */
(function (g) {
  'use strict';
  var D = g.WORLD_DATA;
  var fx = g.fx;
  var dmg = fx.dmg, shield = fx.shield, heal = fx.heal, buff = fx.buff, stun = fx.stun, dot = fx.dot;

  /* ---------------- 法宝主动技 ---------------- */
  D.TREASURE_SPELLS = {
    xuantie: {
      id: 'ts_xuantie', name: '玄铁壁', cost: { mana: 10 }, cd: 3, target: 'self', el: 'metal',
      effects: [shield(45, 2), buff('def', 0.15, 2, '铁壁')]
    },
    zhujian: {
      id: 'ts_zhujian', name: '蜂云剑雨', cost: { mana: 14 }, cd: 3, target: 'enemy', el: 'metal',
      effects: [dmg(45, 'metal', { hits: 2, random: true, pierce: 0.15 })]
    },
    hulu: {
      id: 'ts_hulu', name: '玉露回春', cost: { mana: 12 }, cd: 4, target: 'self', el: 'wood',
      effects: [heal(0.28), { k: 'mana', amt: 30 }]
    },
    xutian: {
      id: 'ts_xutian', name: '鼎镇山河', cost: { mana: 18 }, cd: 5, target: 'enemy', el: 'earth',
      effects: [dmg(80, 'earth'), stun(1, 0.5, '鼎镇')]
    }
  };
  Object.keys(D.TREASURE_SPELLS).forEach(function (k) {
    var sp = D.TREASURE_SPELLS[k];
    g.SPELLS[sp.id] = sp;
  });

  D.TREASURES.forEach(function (t) {
    if (D.TREASURE_SPELLS[t.id]) t.spell = D.TREASURE_SPELLS[t.id].id;
  });

  /* ---------------- 定时秘境 ---------------- */
  D.MIJING = [
    {
      id: 'xuese', name: '血色试炼', loc: 'xuese', every: 10, cap: 16,
      desc: '禁地每十年开一次，只容筑基以下入内。里面灵药遍地，也遍地是抢的人。',
      reward: { stones: [80, 260], relic: [0, 2], techGrade: [1, 2] }
    },
    {
      id: 'guxiu', name: '古修洞府开启', loc: 'guxiu', every: 12, cap: 19,
      desc: '洞府禁制十二年一弱，金丹以下进得去。里面的东西能让人少修五十年。',
      reward: { stones: [200, 600], relic: [1, 3], techGrade: [2, 3] }
    },
    {
      id: 'zhuimo', name: '坠魔谷血月', loc: 'zhuimo', every: 20, cap: 22,
      desc: '血月照进谷底时，魔气最薄。元婴以下都想进去捞一笔，出来的不到三成。',
      reward: { stones: [600, 1800], relic: [2, 5], techGrade: [3, 4] }
    }
  ];

  /* ---------------- 拍卖品 ---------------- */
  D.AUCTION_ITEMS = ['heal', 'mana', 'cult', 'break', 'escape'];

})(typeof globalThis !== 'undefined' ? globalThis : this);
