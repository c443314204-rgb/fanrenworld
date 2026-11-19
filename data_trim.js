/* =============================================================
   data_trim.js —— 功法招式收口
   一、按品阶定上限：凡阶 3、灵阶 3、宝阶 4、半仙 5。多余招式不再挂在功法上
       （法术本身仍留在大表里，NPC、法宝、事件照旧能用）。
   二、招数不足两式的，补一门同属性的基础一式，免得一本功法只有一下。
   ============================================================= */
(function (g) {
  var TECHS = g.TECHS, SPELLS = g.SPELLS;
  var CAP = { 0: 2, 1: 3, 2: 4, 3: 5 };

  function isDamage(sp) {
    if (!sp || !sp.effects) return false;
    return sp.effects.some(function (e) { return e && (e.k === 'dmg' || e.k === 'dot'); });
  }

  var STRIKE = {
    fire: ['火弹术', 15], water: ['水箭术', 13], wood: ['木刺术', 13],
    metal: ['金丸术', 14], earth: ['土锥术', 14], wind: ['风刃术', 12],
    ice: ['冰棱术', 13], thunder: ['雷弧术', 16], ghost: ['阴风术', 14],
    blood: ['血珠术', 14], soul: ['神念刺', 15], phys: ['拳掌功', 12],
    poison: ['毒针术', 12], holy: ['正气掌', 15]
  };

  Object.keys(TECHS).forEach(function (id) {
    var t = TECHS[id];
    if (!t.spells) t.spells = [];

    /* 一、截断 */
    var cap = CAP[t.tier] || 3;
    if (t.spells.length > cap) {
      var kept = [];
      /* 先留一手能打的，再按原顺序补到 cap */
      var dmgIdx = -1;
      t.spells.forEach(function (sid, i) { if (dmgIdx < 0 && isDamage(SPELLS[sid])) dmgIdx = i; });
      if (dmgIdx >= 0) kept.push(t.spells[dmgIdx]);
      t.spells.forEach(function (sid) {
        if (kept.length < cap && kept.indexOf(sid) < 0) kept.push(sid);
      });
      t.spells = kept;
    }

    /* 二、不足两式，补一式同属性的基础招 */
    if (t.spells.length > 0 && t.spells.length < 2) {
      var el = t.el || 'phys';
      var st = STRIKE[el] || STRIKE.phys;
      var sid = id + '_x1';
      if (!SPELLS[sid]) {
        SPELLS[sid] = {
          id: sid, name: st[0], tech: id, tier: t.tier,
          cost: { mp: 5 + t.tier * 3 }, cd: 0, target: 'enemy', el: el,
          desc: '《' + t.name + '》附带的起手一式。',
          effects: [{ k: 'dmg', amt: st[1] + t.tier * 14, el: el }]
        };
      }
      t.spells.push(sid);
    }
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
