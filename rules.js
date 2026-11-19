/* =============================================================
   规则层：把「灵根 / 出身 / 特质 / 功法配置」算成一个可战斗的角色
   界面与无头测试共用这一份逻辑
   ============================================================= */
(function (g) {
  'use strict';

  var SLOTS = { tech: 6, spell: 6 };

  function merge() {
    var out = {};
    for (var i = 0; i < arguments.length; i++) {
      var src = arguments[i] || {};
      for (var k in src) out[k] = (out[k] || 0) + src[k];
    }
    return out;
  }

  function techPassives(techs) {
    var pct = {};
    (techs || []).forEach(function (id) {
      var t = g.TECHS[id];
      if (!t || !t.passive) return;
      t.passive.forEach(function (p) {
        pct[p.k] = (pct[p.k] || 0) + p.v;
      });
    });
    return pct;
  }

  function baseStats(realmId) {
    var R = g.REALMS[realmId] || g.REALMS[0];
    return { hp: R.hp, atk: R.atk, def: R.def, spd: R.spd, mana: R.mana, stam: 100 };
  }

  /* profile: {realm, root, identity, traits:[trait...], techs:[id], loadout:[id]} */
  function computePct(profile) {
    var root = profile.root ? (typeof profile.root === 'string' ? g.ROOTS.filter(function (r) { return r.id === profile.root; })[0] : profile.root) : null;
    var ident = profile.identity ? (typeof profile.identity === 'string' ? g.IDENTITIES.filter(function (r) { return r.id === profile.identity; })[0] : profile.identity) : null;
    var pct = merge(
      root ? g.rootPct(root) : {},
      ident ? ident.pct : {},
      techPassives(profile.techs),
      (profile.traits || []).reduce(function (a, t) { return merge(a, t.pct); }, {})
    );
    return pct;
  }

  function makePlayer(profile) {
    var st = baseStats(profile.realm);
    var pct = computePct(profile);
    var R = g.REALMS[profile.realm] || g.REALMS[0];
    return {
      name: profile.name || '无名',
      realm: profile.realm,
      faction: 'human',
      hp: st.hp, atk: st.atk, def: st.def, spd: st.spd, mana: st.mana, stam: st.stam,
      pct: pct,
      loadout: (profile.loadout || []).slice(),
      row: 'front',
      realmName: R.name
    };
  }

  function makeEncounter(enc, realmOverride) {
    var realm = realmOverride == null ? enc.realm : realmOverride;
    var R = g.REALMS[realm];
    return {
      enc: enc,
      realm: realm,
      enemies: enc.enemies.map(function (e, i) {
        var spells = (e.spells || []).map(function (s, j) {
          return {
            __id: 'e' + i + '_' + j,
            name: s.name, cd: s.cd || 0, target: s.target || 'enemy',
            effects: s.effects, el: (s.effects[0] && s.effects[0].el) || 'phys'
          };
        });
        return {
          name: e.name, row: e.row || 'front', faction: e.faction || 'human',
          realm: realm,
          hp: Math.round(R.hp * e.hp),
          atk: Math.round(R.atk * e.atk),
          def: Math.round(R.def * e.def),
          spd: Math.round(R.spd * e.spd),
          mana: 200, stam: 100,
          spells: spells
        };
      })
    };
  }

  function fight(opts) {
    var p = makePlayer(opts.profile);
    var enc = makeEncounter(opts.encounter, opts.profile.realm);
    var seed = opts.seed == null ? (Math.random() * 1e9) | 0 : opts.seed;
    return g.Engine.fight({
      player: p, enemies: enc.enemies, seed: seed, collect: opts.collect !== false
    });
  }

  /* 随机一套合法配置（无头测试 / 一键推荐用） */
  function randomBuild(rng, opts) {
    opts = opts || {};
    var pool = opts.learned || Object.keys(g.TECHS);
    var realm = opts.realm == null ? 0 : opts.realm;
    var legal = pool.filter(function (id) {
      var t = g.TECHS[id];
      return t && t.realm <= realm;
    });
    if (!legal.length) legal = pool.slice();

    var techs = [];
    var bag = legal.slice();
    while (techs.length < SLOTS.tech && bag.length) {
      techs.push(bag.splice(Math.floor(rng() * bag.length), 1)[0]);
    }

    var spells = [];
    techs.forEach(function (t) { spells = spells.concat(g.TECHS[t].spells); });
    var loadout = [];
    var sp = spells.slice();
    while (loadout.length < SLOTS.spell && sp.length) {
      loadout.push(sp.splice(Math.floor(rng() * sp.length), 1)[0]);
    }
    /* 补足：法术不够就补齐 */
    return { techs: techs, loadout: loadout };
  }

  /* 某境界可用的「战利品功法」池：优先本境界，不够再从上一境界补 */
  function rewardPool(realm, learned) {
    var maxRealm = g.REALMS.length - 1;
    var r = Math.min(realm, maxRealm);
    var cur = [], prev = [];
    for (var id in g.TECHS) {
      var t = g.TECHS[id];
      if (learned && learned.indexOf(id) >= 0) continue;
      if (t.realm === r) cur.push(id);
      else if (t.realm === r - 1) prev.push(id);
    }
    if (cur.length >= 3) return cur;
    return cur.concat(prev);
  }

  g.Rules = {
    SLOTS: SLOTS,
    computePct: computePct,
    techPassives: techPassives,
    baseStats: baseStats,
    makePlayer: makePlayer,
    makeEncounter: makeEncounter,
    fight: fight,
    randomBuild: randomBuild,
    rewardPool: rewardPool
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
