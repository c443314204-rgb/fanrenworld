/* =============================================================
   斗法引擎：回合制自动战斗
   -------------------------------------------------------------
   特点：
   - 纯逻辑、无 DOM，可以直接 node 跑（用来调平衡）
   - 一次性推演出整场战斗的事件流，界面只负责按节奏回放
   - 先手值决定行动顺序，DoT 在回合开始结算
   ============================================================= */
(function (g) {
  'use strict';

  var K_DEF = 300;      // 防御收益系数：def / (def + 300)
  var CRIT_MULT = 1.7;
  var MAX_ROUND = 40;
  var BASIC = {
    id: '__basic', name: '寻常一击', cd: 0, target: 'enemy', el: 'phys',
    effects: [{ k: 'dmg', amt: 26 }, { k: 'mana', amt: 8 }, { k: 'stam', amt: 10 }],
    basic: true
  };

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function rint(rng, a, b) { return a + Math.floor(rng() * (b - a + 1)); }
  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

  /* ---------------- 单位 ---------------- */
  function createUnit(o) {
    var u = {
      uid: o.uid, side: o.side, name: o.name, realm: o.realm | 0,
      row: o.row || 'front', faction: o.faction || 'human',
      pct: Object.assign({}, o.pct || {}),
      base: { hp: o.hp, atk: o.atk, def: o.def, spd: o.spd, mana: o.mana, stam: o.stam },
      buffs: [], dots: [], hots: [], shields: [], seals: [],
      cds: {}, stacks: {}, stunLeft: 0, banishLeft: 0, untargetLeft: 0,
      loadout: o.loadout || [], conds: o.conds || [], spellList: o.spells || null,
      ai: o.ai || null, dead: false,
      reachBack: 0
    };
    u.hpMax = Math.round(o.hp * (1 + (u.pct.hp || 0)));
    u.hp = u.hpMax;
    u.manaMax = Math.round(o.mana * (1 + (u.pct.mana || 0)));
    u.mana = u.manaMax;
    u.stamMax = o.stam;
    u.stam = o.stam;
    u.cheatDeath = (u.pct.cheatDeath | 0) > 0;
    u.cheatUsed = false;
    return u;
  }

  function alive(u) { return u && u.hp > 0 && !u.dead; }

  function mod(u, k) {
    var s = 0;
    for (var i = 0; i < u.buffs.length; i++) {
      var b = u.buffs[i];
      if (b.stat === k) s += b.v;
      else if (b.stat === 'allStats' && (k === 'atk' || k === 'def' || k === 'spd')) s += b.v;
    }
    return s;
  }
  function S(u, k) { return (u.pct[k] || 0) + mod(u, k); }
  function atkOf(u) { return u.base.atk * (1 + S(u, 'atk')); }
  function defOf(u) { return Math.max(0, u.base.def * (1 + S(u, 'def'))); }
  function spdOf(u) { return Math.max(1, u.base.spd * (1 + S(u, 'spd'))); }


  /* ---------------- 战斗对象 ---------------- */
  function startBattle(opts) {
    var seed = (opts.seed == null) ? (Date.now() & 0x7fffffff) : opts.seed;
    var b = {
      round: 0, over: false, result: '', seed: seed,
      rng: mulberry32(seed), events: [], collect: opts.collect !== false,
      player: null, enemies: [], units: []
    };
    b.player = createUnit(Object.assign({ uid: 'p', side: 'player' }, opts.player));
    b.player.loadout = opts.player.loadout || [];
    b.enemies = (opts.enemies || []).map(function (e, i) {
      var spec = Object.assign({ uid: 'e' + i, side: 'enemy', name: e.name }, e);
      return createUnit(spec);
    });
    b.units = [b.player].concat(b.enemies);
    return b;
  }

  function ev(b, e) { if (b.collect) b.events.push(e); }

  function statusOf(u) {
    var list = [];
    u.buffs.forEach(function (x) {
      list.push({ name: x.name, kind: x.v >= 0 ? 'good' : 'bad', turns: x.turns });
    });
    u.dots.forEach(function (x) {
      list.push({ name: x.name, kind: 'bad', turns: x.turns, dot: true });
    });
    u.hots.forEach(function (x) {
      list.push({ name: x.name, kind: 'good', turns: x.turns, hot: true });
    });
    u.seals.forEach(function (x) {
      list.push({ name: x.name, kind: 'bad', turns: x.turns, seal: true });
    });
    if (u.stunLeft > 0) list.push({ name: '眩晕', kind: 'bad', turns: u.stunLeft, stun: true });
    if (u.banishLeft > 0) list.push({ name: '放逐', kind: 'bad', turns: u.banishLeft });
    if (u.shieldTotal && u.shieldTotal > 0) list.push({ name: '护盾', kind: 'good', turns: 0, shield: true });
    return list;
  }
  function pushStatus(b, u) {
    ev(b, { t: 'status', uid: u.uid, list: statusOf(u), shield: shieldTotal(u) });
  }
  function shieldTotal(u) {
    var s = 0;
    for (var i = 0; i < u.shields.length; i++) s += u.shields[i].amt;
    return Math.round(s);
  }

  /* ---------------- 伤害 ---------------- */
  function healUnit(b, u, amt, src) {
    if (!alive(u) || amt <= 0) return 0;
    var v = Math.round(amt * (1 + Math.max(-1, S(u, 'healBonus') + (u.pct.healBonus || 0))));
    if (v <= 0) return 0;
    var before = u.hp;
    u.hp = Math.min(u.hpMax, u.hp + v);
    var real = u.hp - before;
    if (real > 0) ev(b, { t: 'heal', uid: u.uid, amt: real, hp: u.hp, hpMax: u.hpMax });
    return real;
  }

  function gainMana(b, u, amt) {
    if (!alive(u) || !amt) return;
    u.mana = Math.max(0, Math.min(u.manaMax, u.mana + amt));
    ev(b, { t: 'mana', uid: u.uid, delta: amt, mana: u.mana, manaMax: u.manaMax });
  }

  function damage(b, src, tgt, op, meta) {
    meta = meta || {};
    if (!alive(tgt) || !alive(src)) return 0;

    var el = op.el || 'phys';
    var isTrue = !!op.true || (op.pierce || 0) + S(src, 'pierce') >= 1;

    /* 命中判定：只有闪避类 buff 会造成 miss */
    if (!meta.noHit) {
      var chance = 1 - Math.max(0, S(tgt, 'evade')) + Math.max(0, S(src, 'hit'));
      if (chance < 1 && b.rng() > chance) {
        ev(b, { t: 'miss', uid: tgt.uid, src: src.uid, name: meta.name || '' });
        return 0;
      }
    }

    var base = op.amt * atkOf(src) / 100;
    if (op.stack) {
      var n = Math.min(src.stacks[op.sid] || 0, op.stack.max);
      base += op.stack.per * n * atkOf(src) / 100;
    }
    var mult = 1 + S(src, 'dmg') + (S(src, el + 'Dmg') || 0) + (op.tag ? S(src, op.tag + 'Dmg') : 0);
    /* 境界压制：差一层就是一道坎 */
    var gap = Math.max(-4, Math.min(4, (src.realm | 0) - (tgt.realm | 0)));
    if (gap > 0) mult *= Math.pow(1.30, gap);
    else if (gap < 0) mult *= Math.pow(0.78, -gap);
    if (op.vsGhost && tgt.faction === 'ghost') mult += op.vsGhost;
    if (op.vsDemon && (tgt.faction === 'demon' || tgt.faction === 'ghost')) mult += op.vsDemon;
    if (op.lowHp && src.hp / src.hpMax < op.lowHp.below) mult *= op.lowHp.mult;
    if (op.scaleRound) mult *= 1 + (b.round - 1) * op.scaleRound;

    var dmgv = base * mult;

    if (!isTrue) {
      var pierce = Math.max(0, Math.min(1, (op.pierce || 0) + S(src, 'pierce')));
      var defv = defOf(tgt) * (1 - pierce);
      dmgv *= K_DEF / (K_DEF + defv);
    }

    /* 减伤 */
    var red = S(tgt, 'dmgReduce') + (tgt.pct.take || 0);
    if (el === 'phys') red += S(tgt, 'physReduce');
    red += S(tgt, 'take' + cap(el));
    red += (tgt.pct[el + 'Resist'] || 0);
    if (el === 'soul') red += (tgt.pct.takeHoly || 0);
    red = Math.max(-0.5, Math.min(0.8, red));
    dmgv *= (1 - red);

    /* 暴击 */
    var crit = false;
    if (!meta.noCrit) {
      var cc = 0.05 + S(src, 'crit');
      if (b.rng() < cc) { crit = true; dmgv *= CRIT_MULT; }
    }

    dmgv *= 0.94 + b.rng() * 0.12;

    var total = Math.max(1, Math.round(dmgv));
    var blocked = 0;

    if (!isTrue && !op.pierceShield) {
      for (var i = 0; i < tgt.shields.length && total > 0; i++) {
        var sh = tgt.shields[i];
        if (sh.amt <= 0) continue;
        var a = Math.min(sh.amt, total);
        sh.amt -= a;
        total -= a;
        blocked += a;
      }
      tgt.shields = tgt.shields.filter(function (x) { return x.amt > 0.5; });
    }

    if (total > 0) {
      tgt.hp -= total;
      if (tgt.hp <= 0 && tgt.cheatDeath && !tgt.cheatUsed) {
        tgt.cheatUsed = true;
        tgt.hp = 1;
        ev(b, { t: 'text', text: tgt.name + '魔功护体，硬生生留住了最后一口气。', cls: 'bad' });
      }
    }

    ev(b, {
      t: 'hit', uid: tgt.uid, src: src.uid, dmg: total, blocked: blocked,
      el: el, crit: crit, hp: Math.max(0, tgt.hp), hpMax: tgt.hpMax, name: meta.name || ''
    });

    /* 吸血 */
    var ls = S(src, 'lifesteal');
    if (ls > 0 && total > 0) healUnit(b, src, total * ls, src);

    /* 反伤 */
    var th = S(tgt, 'thorns');
    if (th > 0 && total > 0) {
      var td = th < 1 ? total * th : th;
      rawDamage(b, src, Math.round(td), '反伤');
    }

    /* 斩杀 */
    if (op.execute && tgt.hp > 0 && tgt.hp / tgt.hpMax < op.execute) {
      var ex = Math.round(tgt.hpMax * 0.4);
      tgt.hp -= ex;
      ev(b, { t: 'text', text: '剑光过处，' + tgt.name + '气机断绝（斩杀 ' + ex + '）。', cls: 'good' });
      ev(b, { t: 'hit', uid: tgt.uid, src: src.uid, dmg: ex, blocked: 0, el: 'soul', crit: true, hp: Math.max(0, tgt.hp), hpMax: tgt.hpMax, name: '斩杀' });
    }

    /* 击杀回血 */
    if (tgt.hp <= 0 && op.healOnKill) healUnit(b, src, tgt.hpMax * op.healOnKill, src);

    /* 境界压制在场面上说一句，免得玩家以为是数值 bug */
    if (gap >= 2 && total > 0 && !b.saidGap) {
      b.saidGap = true;
      ev(b, { t: 'text', text: '境界压制——' + tgt.name + '的气息被生生压了下去。', cls: 'good' });
    }

    if (tgt.hp <= 0) killUnit(b, tgt);
    return total;
  }

  function rawDamage(b, u, amt, label) {
    if (!alive(u)) return;
    u.hp -= amt;
    ev(b, { t: 'hit', uid: u.uid, src: null, dmg: amt, blocked: 0, el: 'true', crit: false, hp: Math.max(0, u.hp), hpMax: u.hpMax, name: label || '' });
    if (u.hp <= 0) killUnit(b, u);
  }

  function killUnit(b, u) {
    if (u.dead) return;
    u.dead = true;
    u.hp = 0;
    ev(b, { t: 'death', uid: u.uid });
    ev(b, { t: 'status', uid: u.uid, list: [], shield: 0 });
  }

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* ---------------- 目标选择 ---------------- */
  function foesOf(b, u) {
    return b.units.filter(function (x) { return x.side !== u.side && alive(x); });
  }

  function pickTargets(b, src, spell) {
    if (spell.target === 'self') return [src];
    var foes = foesOf(b, src);
    if (!foes.length) return [];
    if (spell.target === 'enemyAll') return foes;
    if (spell.target === 'enemyRandom') return [pick(b.rng, foes)];

    var pool = foes;
    if (src.side === 'player') {
      var front = foes.filter(function (f) { return f.row === 'front'; });
      var back = foes.filter(function (f) { return f.row === 'back'; });
      if (spell.target === 'enemyBack') pool = back.length ? back : (front.length ? front : foes);
      else if (spell.target === 'enemyFront') pool = front.length ? front : foes;
      else if (src.reachBack > 0) pool = foes;
      else pool = front.length ? front : foes;
    }
    /* 集火：优先血线最低的 */
    pool = pool.slice().sort(function (a, c) { return (a.hp / a.hpMax) - (c.hp / c.hpMax); });
    return [pool[0]];
  }

  /* ---------------- 状态施加 ---------------- */
  function applyBuff(b, u, e) {
    if (e.stat === 'hpMax') {
      var amt = Math.round(u.hpMax * e.v);
      u.shields.push({ amt: amt, turns: e.turns, name: e.name });
      ev(b, { t: 'shield', uid: u.uid, amt: amt, name: e.name });
      pushStatus(b, u);
      return;
    }
    u.buffs.push({ stat: e.stat, v: e.v, turns: e.turns, name: e.name, kind: e.v >= 0 ? 'good' : 'bad' });
    ev(b, { t: 'buff', uid: u.uid, name: e.name, kind: e.v >= 0 ? 'good' : 'bad', turns: e.turns });
    pushStatus(b, u);
  }

  function ctrlChance(b, src, tgt, base) {
    var p = base + Math.max(0, S(src, 'ctrlHit')) - Math.max(0, S(tgt, 'ctrlResist'));
    /* 境界差：低境界控不住高境界 */
    var gap = (src.realm | 0) - (tgt.realm | 0);
    if (gap < 0) p -= 0.14 * (-gap);
    else if (gap > 0) p += 0.08 * gap;
    return Math.max(0.05, Math.min(0.98, p));
  }

  /* ---------------- 施法 ---------------- */
  function cast(b, src, spell, targets) {
    ev(b, { t: 'act', uid: src.uid, spell: spell.name, id: spell.id, targets: targets.map(function (t) { return t.uid; }), el: spell.el || 'phys' });

    var self = src;
    var primary = targets[0] || self;

    for (var i = 0; i < spell.effects.length; i++) {
      var e = spell.effects[i];
      switch (e.k) {
        case 'dmg': {
          var hits = e.hits || 1;
          for (var h = 0; h < hits; h++) {
            var tg = primary;
            if (e.random) {
              var fo = foesOf(b, src);
              if (fo.length) tg = pick(b.rng, fo);
            }
            damage(b, src, tg, Object.assign({ sid: spell.id }, e), { name: spell.name });
            if (!alive(primary) && spell.target !== 'enemyAll' && spell.target !== 'enemyRandom' && !e.random) break;
          }
          if (e.stack) src.stacks[spell.id] = (src.stacks[spell.id] || 0) + 1;
          break;
        }
        case 'dot': {
          if (b.rng() > (e.chance == null ? 1 : e.chance)) break;
          targets.forEach(function (t) {
            if (!alive(t)) return;
            t.dots.push({ amt: e.amt, turns: e.turns, el: e.el, name: e.name });
            ev(b, { t: 'dot', uid: t.uid, name: e.name, amt: e.amt, turns: e.turns, el: e.el });
          });
          pushStatus(b, primary);
          break;
        }
        case 'hot': {
          self.hots.push({ amt: e.amt, turns: e.turns, name: e.name });
          ev(b, { t: 'hot', uid: self.uid, name: e.name, amt: e.amt, turns: e.turns });
          pushStatus(b, self);
          break;
        }
        case 'shield': {
          var amt = e.pct ? Math.round(self.hpMax * e.amt) : e.amt;
          self.shields.push({ amt: amt, turns: e.turns || 2, name: e.name || '护盾' });
          ev(b, { t: 'shield', uid: self.uid, amt: amt, name: e.name || '护盾' });
          pushStatus(b, self);
          break;
        }
        case 'buff': applyBuff(b, self, e); break;
        case 'debuff': {
          var caster = src;
          targets.forEach(function (t) {
            if (!alive(t)) return;
            var p = ctrlChance(b, caster, t, e.chance == null ? 1 : e.chance);
            if (b.rng() > Math.max(0.05, p)) { ev(b, { t: 'resist', uid: t.uid, name: e.name }); return; }
            t.buffs.push({ stat: e.stat, v: e.v, turns: e.turns, name: e.name, kind: 'bad' });
            ev(b, { t: 'buff', uid: t.uid, name: e.name, kind: 'bad', turns: e.turns });
            pushStatus(b, t);
          });
          break;
        }
        case 'stun': {
          var c = src;
          targets.forEach(function (t) {
            if (!alive(t)) return;
            if (b.rng() > ctrlChance(b, c, t, e.chance == null ? 1 : e.chance)) {
              ev(b, { t: 'resist', uid: t.uid, name: e.name });
              return;
            }
            t.stunLeft = Math.max(t.stunLeft, e.turns);
            ev(b, { t: 'stun', uid: t.uid, name: e.name, turns: e.turns });
            pushStatus(b, t);
          });
          break;
        }
        case 'seal': {
          var cs = src;
          targets.forEach(function (t) {
            if (!alive(t)) return;
            if (b.rng() > ctrlChance(b, cs, t, e.chance == null ? 1 : e.chance)) {
              ev(b, { t: 'resist', uid: t.uid, name: e.name });
              return;
            }
            t.seals.push({ tags: e.tags, turns: e.turns, name: e.name });
            ev(b, { t: 'seal', uid: t.uid, name: e.name, turns: e.turns });
            pushStatus(b, t);
          });
          break;
        }
        case 'heal': healUnit(b, self, e.amt, self); break;
        case 'mana': gainMana(b, self, e.amt); break;
        case 'stam': self.stam = Math.min(self.stamMax, self.stam + e.amt); break;
        case 'drain': {
          var t0 = primary;
          if (!alive(t0)) break;
          var hp = Math.min(e.hp, t0.hp);
          rawDamage(b, t0, hp, '抽元');
          healUnit(b, self, hp, self);
          gainMana(b, self, e.mp);
          t0.mana = Math.max(0, t0.mana - e.mp);
          ev(b, { t: 'mana', uid: t0.uid, delta: -e.mp, mana: t0.mana, manaMax: t0.manaMax });
          break;
        }
        case 'selfHp': {
          var cost = Math.round(self.hpMax * e.pct);
          if (self.hp > cost) { self.hp -= cost; ev(b, { t: 'hit', uid: self.uid, dmg: cost, hp: self.hp, hpMax: self.hpMax, el: 'true', name: '反噬' }); }
          break;
        }
        case 'thorns':
          applyBuff(b, self, { stat: 'thorns', v: e.amt, turns: e.turns, name: '反伤' });
          break;
        case 'untargetable':
          self.untargetLeft = Math.max(self.untargetLeft, e.turns);
          ev(b, { t: 'text', text: self.name + '气息隐去，一时难以锁定。', cls: 'good' });
          break;
        case 'banish':
          targets.forEach(function (t) {
            if (!alive(t)) return;
            t.banishLeft = Math.max(t.banishLeft, e.turns);
            ev(b, { t: 'text', text: t.name + '被封入空间裂缝，身影消失不见。', cls: 'good' });
            pushStatus(b, t);
          });
          break;
        case 'reachBack':
          self.reachBack = Math.max(self.reachBack, e.turns);
          break;
        case 'cleanse':
          self.buffs = self.buffs.filter(function (x) { return x.v >= 0; });
          self.dots = [];
          pushStatus(b, self);
          break;
        case 'dispel':
          targets.forEach(function (t) {
            if (!alive(t)) return;
            t.buffs = t.buffs.filter(function (x) { return x.v < 0; });
            pushStatus(b, t);
          });
          break;
      }
    }
  }

  /* ---------------- 可用性 ---------------- */
  function affordable(u, spell) {
    var c = spell.cost || {};
    if (c.mana && u.mana < c.mana) return false;
    if (c.stam && u.stam < c.stam) return false;
    if (c.hp && u.hp <= u.hpMax * c.hp + 1) return false;
    return true;
  }
  function payCost(u, spell) {
    var c = spell.cost || {};
    if (c.mana) u.mana -= c.mana;
    if (c.stam) u.stam -= c.stam;
    if (c.hp) u.hp = Math.max(1, u.hp - Math.round(u.hpMax * c.hp));
  }
  function sealed(u, spell) {
    var tags = spell.tags || [];
    for (var i = 0; i < u.seals.length; i++) {
      var s = u.seals[i];
      for (var j = 0; j < s.tags.length; j++) if (tags.indexOf(s.tags[j]) >= 0) return s.name;
    }
    return null;
  }

  function redundant(b, u, spell) {
    if (spell.target !== 'self') return false;
    var hasBuff = false, useful = false;
    for (var i = 0; i < spell.effects.length; i++) {
      var e = spell.effects[i];
      if (e.k === 'heal' && u.hp < u.hpMax * 0.88) useful = true;
      if (e.k === 'mana' && u.mana < u.manaMax * 0.85) useful = true;
      if (e.k === 'buff') {
        hasBuff = true;
        var active = u.buffs.some(function (x) { return x.name === e.name; });
        if (!active) useful = true;
      }
      if (e.k === 'shield') {
        hasBuff = true;
        var act2 = u.shields.some(function (x) { return x.name === (e.name || '护盾'); });
        if (!act2) useful = true;
      }
      if (e.k === 'untargetable' && u.untargetLeft <= 0) useful = true;
      if (e.k === 'hot' && !u.hots.length) useful = true;
      if (e.k === 'selfHp' || e.k === 'thorns' || e.k === 'reachBack' || e.k === 'cleanse' || e.k === 'dispel' || e.k === 'banish') useful = true;
    }
    /* 纯 buff 且都已经在身，就不重复放 */
    if (hasBuff && !useful) return true;
    if (!useful && !hasBuff) return true;
    return false;
  }

  /* 施法条件：玩家在法术栏里写「如果…就…」 */
  function condOk(b, u, c) {
    if (!c) return true;
    var foes = b.units.filter(function (x) { return x.side !== u.side && alive(x); });
    var t = foes[0];
    var foeHp = t ? t.hp / t.hpMax : 1;
    switch (c) {
      case 'foeLow': return foeHp < 0.35;
      case 'foeHigh': return foeHp > 0.6;
      case 'selfLow': return u.hp / u.hpMax < 0.5;
      case 'shielded': return shieldTotal(u) > 0;
      case 'noBuff': return u.buffs.filter(function (x) { return x.v >= 0; }).length === 0;
      case 'manaHigh': return u.mana >= u.manaMax * 0.6;
      case 'many': return foes.length >= 2;
    }
    return true;
  }

  function chooseSpell(b, u) {
    var list = u.side === 'player' ? u.loadout.map(function (id) { return g.SPELLS[id]; }) : (u.spellList || []);
    var fallback = null;
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      if (!s) continue;
      var sid = s.id || s.__id;
      if ((u.cds[sid] || 0) > b.round) continue;
      if (!affordable(u, s)) continue;
      if (sealed(u, s)) continue;
      if (redundant(b, u, s)) continue;
      if (pickTargets(b, u, s).length === 0) continue;
      if (s.aiCondition && !s.aiCondition(b, u)) continue;
      if (u.conds && u.conds[i] && !condOk(b, u, u.conds[i])) continue;
      return s;
    }
    return fallback || BASIC;
  }

  /* ---------------- 行动 ---------------- */
  function actUnit(b, u) {
    var spell = chooseSpell(b, u);
    var targets = pickTargets(b, u, spell);
    if (!targets.length) return;
    if (spell !== BASIC) {
      payCost(u, spell);
      var cm = (spell.cost || {}).mana || 0;
      if (cm) ev(b, { t: 'mana', uid: u.uid, delta: -cm, mana: u.mana, manaMax: u.manaMax });
      u.cds[spell.id || spell.__id] = b.round + (spell.cd || 0) + 1;
    }
    cast(b, u, spell, targets);
  }

  /* ---------------- 主循环 ---------------- */
  function run(b) {
    while (!b.over && b.round < MAX_ROUND) {
      b.round++;
      ev(b, { t: 'round', n: b.round });

      /* 回合开始：DoT / HoT / 回复 */
      for (var i = 0; i < b.units.length; i++) {
        var u = b.units[i];
        if (!alive(u)) continue;

        for (var d = 0; d < u.dots.length; d++) {
          var dot = u.dots[d];
          var dd = Math.round(dot.amt * (1 - Math.min(0.8, Math.max(0, S(u, 'dmgReduce')))));
          rawDamage(b, u, Math.max(1, dd), dot.name + '侵蚀');
          dot.turns--;
        }
        u.dots = u.dots.filter(function (x) { return x.turns > 0; });

        for (var h = 0; h < u.hots.length; h++) {
          healUnit(b, u, u.hots[h].amt, u);
          u.hots[h].turns--;
        }
        u.hots = u.hots.filter(function (x) { return x.turns > 0; });

        /* 法力 / 体力回复 */
        var mr = u.manaMax * 0.12 + S(u, 'manaRegen');
        gainMana(b, u, Math.round(mr));
        u.stam = Math.min(u.stamMax, u.stam + 12);

        /* 魔功反噬 / 心魔 */
        var up = u.pct.hpUpkeep || 0;
        if (up < 0) {
          var upkeep = u.hpMax * (-up);
          rawDamage(b, u, Math.max(1, Math.round(upkeep)), '反噬');
        }

        if (!alive(u)) continue;
        pushStatus(b, u);
      }

      if (checkEnd(b)) break;

      /* 行动顺序：先手值从高到低 */
      var order = b.units.filter(alive).sort(function (a, c) {
        var d = spdOf(c) - spdOf(a);
        if (Math.abs(d) > 0.001) return d;
        return a.side === 'player' ? -1 : 1;
      });
      ev(b, { t: 'order', list: order.map(function (x) { return { uid: x.uid, name: x.name, spd: Math.round(spdOf(x)) }; }) });

      for (var k = 0; k < order.length; k++) {
        var a = order[k];
        if (b.over || !alive(a)) continue;
        if (a.banishLeft > 0) {
          ev(b, { t: 'skip', uid: a.uid, reason: 'banish' });
          continue;
        }
        if (a.stunLeft > 0) {
          a.stunLeft--;
          ev(b, { t: 'skip', uid: a.uid, reason: 'stun' });
          pushStatus(b, a);
          continue;
        }
        actUnit(b, a);
        if (checkEnd(b)) break;
        /* 逐个行动后刷新状态 */
        b.units.forEach(function (x) { if (alive(x)) pushStatus(b, x); });
      }

      /* 回合结束：状态计时 */
      if (b.over) break;
      b.units.forEach(function (x) {
        x.buffs = x.buffs.filter(function (s) { return (s.turns = s.turns - 1) > 0; });
        x.shields = x.shields.filter(function (s) { return (s.turns = s.turns - 1) > 0 && s.amt > 0.5; });
        x.seals = x.seals.filter(function (s) { return (s.turns = s.turns - 1) > 0; });
        if (x.untargetLeft > 0) x.untargetLeft--;
        if (x.banishLeft > 0) x.banishLeft--;
        if (x.reachBack > 0) x.reachBack--;
      });
      b.units.forEach(function (x) { if (alive(x)) pushStatus(b, x); });

      if (checkEnd(b)) break;
    }

    if (!b.over) {
      b.over = true;
      b.result = 'timeout';
      ev(b, { t: 'end', result: 'timeout' });
    }
    return b;
  }

  function checkEnd(b) {
    if (b.over) return true;
    if (!alive(b.player)) {
      b.over = true; b.result = 'lose';
      ev(b, { t: 'end', result: 'lose' });
      return true;
    }
    if (!b.enemies.some(alive)) {
      b.over = true; b.result = 'win';
      ev(b, { t: 'end', result: 'win' });
      return true;
    }
    return false;
  }

  function fight(opts) {
    var b = startBattle(opts);
    run(b);
    b.finalHp = Math.max(0, Math.round(b.player.hp));
    b.finalHpMax = b.player.hpMax;
    b.rounds = b.round;
    b.playerHpPct = b.player.hp / b.player.hpMax;
    return b;
  }

  /* ---------------- 描述 ---------------- */
  var TARGET_TEXT = { self: '自身', enemy: '单体', enemyFront: '前排', enemyBack: '可越位', enemyAll: '群体', enemyRandom: '随机' };
  var STAT_TEXT = {
    atk: '攻击', def: '防御', spd: '先手', dmg: '伤害', dmgReduce: '减伤', evade: '闪避',
    hit: '命中', crit: '暴击', lifesteal: '吸血', manaRegen: '法力回复', healBonus: '治疗',
    physReduce: '物理减伤', allStats: '全属性', thorns: '反伤', hpMax: '气血', pierce: '破防',
    fireDmg: '火伤', waterDmg: '水伤', woodDmg: '木伤', metalDmg: '金伤', iceDmg: '冰伤',
    thunderDmg: '雷伤', ghostDmg: '阴伤', soulDmg: '魂伤', bloodDmg: '血伤', take: '受伤'
  };
  function statText(k) { return STAT_TEXT[k] || k; }
  function pctText(v) { return (v > 0 ? '+' : '') + Math.round(v * 100) + '%'; }

  function describe(spell) {
    var out = [];
    var c = spell.cost || {};
    var cost = [];
    if (c.mana) cost.push('法力 ' + c.mana);
    if (c.stam) cost.push('体力 ' + c.stam);
    if (c.hp) cost.push('气血 ' + Math.round(c.hp * 100) + '%');
    (spell.effects || []).forEach(function (e) {
      var t = '';
      switch (e.k) {
        case 'dmg': {
          t = (e.hits > 1 ? e.hits + '×' : '') + e.amt + '点' + (g.EL[e.el] ? g.EL[e.el].name + '系' : '') + '伤害';
          if (e.pierce >= 1) t += '（真实伤害）';
          else if (e.pierce) t += '（破防' + Math.round(e.pierce * 100) + '%）';
          if (e.execute) t += '，残血斩杀';
          if (e.stack) t += '，每层+' + e.stack.per;
          if (e.vsGhost) t += '，对鬼物+50%';
          break;
        }
        case 'dot':
          t = (e.chance < 1 ? Math.round(e.chance * 100) + '%概率' : '') + e.name + '：每回合' + e.amt + '点，' + e.turns + '回合';
          break;
        case 'hot': t = '每回合回复' + e.amt + '点，' + e.turns + '回合'; break;
        case 'shield': t = '护盾' + (e.pct ? Math.round(e.amt * 100) + '%气血' : e.amt) + '，' + (e.turns || 2) + '回合'; break;
        case 'buff':
          if (e.stat === 'manaRegen') t = '每回合法力 +' + e.v + '，' + e.turns + '回合';
          else if (e.stat === 'thorns') t = '反伤，' + e.turns + '回合';
          else t = statText(e.stat) + pctText(e.v) + '，' + e.turns + '回合';
          break;
        case 'debuff': t = (e.chance < 1 ? Math.round(e.chance * 100) + '%概率' : '') + '使目标' + statText(e.stat) + pctText(e.v) + '，' + e.turns + '回合'; break;
        case 'stun': t = (e.chance < 1 ? Math.round(e.chance * 100) + '%概率' : '') + e.name + ' ' + e.turns + '回合'; break;
        case 'seal': t = (e.chance < 1 ? Math.round(e.chance * 100) + '%概率' : '') + e.name + ' ' + e.turns + '回合'; break;
        case 'heal': t = '回复' + e.amt + '点气血'; break;
        case 'mana': t = '回复' + e.amt + '点法力'; break;
        case 'stam': t = '回复' + e.amt + '点体力'; break;
        case 'drain': t = '吸取' + e.hp + '气血 / ' + e.mp + '法力'; break;
        case 'selfHp': t = '自损' + Math.round(e.pct * 100) + '%气血'; break;
        case 'thorns':
          t = e.amt < 1 ? '反伤 ' + Math.round(e.amt * 100) + '% 伤害，' + e.turns + '回合'
            : '反伤' + e.amt + '，' + e.turns + '回合';
          break;
        case 'untargetable': t = '无法被选为目标 ' + e.turns + '回合'; break;
        case 'banish': t = '封入虚空 ' + e.turns + '回合'; break;
        case 'reachBack': t = '可越位攻击后排'; break;
        case 'cleanse': t = '净化自身负面'; break;
        case 'dispel': t = '驱散目标增益'; break;
      }
      if (t) out.push(t);
    });
    return { target: TARGET_TEXT[spell.target] || '单体', cost: cost.join(' / ') || '无', cd: spell.cd || 0, text: out.join(' · ') };
  }

  /* ---------------- 导出 ---------------- */
  var Engine = {
    MAX_ROUND: MAX_ROUND, BASIC: BASIC,
    createUnit: createUnit, startBattle: startBattle, run: run, fight: fight, condOk: condOk,
    describe: describe, statusOf: statusOf, shieldTotal: shieldTotal,
    alive: alive, spdOf: spdOf, atkOf: atkOf, defOf: defOf, S: S,
    mulberry32: mulberry32
  };
  g.Engine = Engine;
  if (typeof module !== 'undefined' && module.exports) module.exports = Engine;
})(typeof globalThis !== 'undefined' ? globalThis : this);
