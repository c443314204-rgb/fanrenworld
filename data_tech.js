/* =============================================================
   功法 / 法术数据表
   -------------------------------------------------------------
   一条功法 = 若干法术 + 一组被动。
   装备功法才会解锁其法术，并吃到被动。
   数值来自设计稿，effects 是战斗引擎能读的效果 DSL。
   ============================================================= */
(function (g) {
  'use strict';

  var TIER_NAME = ['凡阶', '灵阶', '宝阶', '半仙阶'];
  var TIER_SUB  = ['下品', '中品', '上品'];

  var EL = {
    phys:    { name: '力', color: '#c8c2b2' },
    fire:    { name: '火', color: '#d9784f' },
    water:   { name: '水', color: '#6f9fc4' },
    wood:    { name: '木', color: '#7fb39a' },
    earth:   { name: '土', color: '#b79a6a' },
    metal:   { name: '金', color: '#d8c98f' },
    ice:     { name: '冰', color: '#8fc4d8' },
    thunder: { name: '雷', color: '#b7a3e0' },
    wind:    { name: '风', color: '#9fc4a8' },
    ghost:   { name: '阴', color: '#9a8fbf' },
    soul:    { name: '魂', color: '#c9a9d8' },
    blood:   { name: '血', color: '#b8564f' }
  };

  var TECHS = {};
  var SPELLS = {};

  /* ---------- 效果构造器 ---------- */
  function dmg(amt, el, o) {
    var e = { k: 'dmg', amt: amt, el: el || 'phys' };
    if (o) for (var k in o) e[k] = o[k];
    return e;
  }
  function dot(amt, turns, el, chance, name) {
    return { k: 'dot', amt: amt, turns: turns, el: el || 'phys',
             chance: chance == null ? 1 : chance, name: name || '持续伤害' };
  }
  function hot(amt, turns, name) {
    return { k: 'hot', amt: amt, turns: turns, name: name || '回春' };
  }
  function shield(amt, turns, o) {
    var e = { k: 'shield', amt: amt, turns: turns || 2 };
    if (o) for (var k in o) e[k] = o[k];
    return e;
  }
  function buff(stat, v, turns, name) {
    return { k: 'buff', stat: stat, v: v, turns: turns, name: name || stat };
  }
  function debuff(stat, v, turns, chance, name) {
    return { k: 'debuff', stat: stat, v: v, turns: turns,
             chance: chance == null ? 1 : chance, name: name || stat };
  }
  function stun(turns, chance, name) {
    return { k: 'stun', turns: turns, chance: chance == null ? 1 : chance, name: name || '眩晕' };
  }
  function seal(tags, turns, chance, name) {
    return { k: 'seal', tags: tags, turns: turns,
             chance: chance == null ? 1 : chance, name: name || '封印' };
  }
  function heal(amt) { return { k: 'heal', amt: amt }; }
  function mana(amt) { return { k: 'mana', amt: amt }; }
  function drain(hp, mp) { return { k: 'drain', hp: hp, mp: mp }; }
  function thorns(amt, turns) { return { k: 'thorns', amt: amt, turns: turns }; }
  function selfHp(pct) { return { k: 'selfHp', pct: pct }; }
  function cleanse() { return { k: 'cleanse' }; }
  function dispel() { return { k: 'dispel' }; }

  function sp(id, o) { o.id = id; SPELLS[id] = o; return id; }
  function tech(id, o) { o.id = id; TECHS[id] = o; return id; }

  /* =============================================================
     一、世俗武学 / 炼气期（凡阶）
     ============================================================= */

  tech('zhengyang', {
    name: '正阳劲', tier: 0, sub: 0, realm: 0, kind: '内功', el: 'phys',
    passive: [{ k: 'atk', v: 0.04 }],
    spells: [sp('zhengyang_quan', {
      name: '正阳拳劲', cost: { stam: 5 }, cd: 0, target: 'enemy', el: 'phys',
      effects: [dmg(15)]
    })]
  });

  tech('xiangjia', {
    name: '象甲功', tier: 0, sub: 0, realm: 0, kind: '横练', el: 'phys',
    passive: [{ k: 'hp', v: 0.08 }, { k: 'def', v: 0.05 }],
    spells: [sp('xiangjia_hu', {
      name: '象甲护体', cost: { stam: 10 }, cd: 2, target: 'self', el: 'phys',
      effects: [buff('def', 0.2, 2, '象甲护体')]
    })]
  });

  tech('bawangjia', {
    name: '霸王甲', tier: 0, sub: 0, realm: 0, kind: '横练', el: 'phys',
    passive: [{ k: 'hp', v: 0.08 }, { k: 'def', v: 0.05 }],
    spells: [sp('bawang_ying', {
      name: '霸王硬功', cost: { stam: 12 }, cd: 3, target: 'self', el: 'phys',
      effects: [buff('dmgReduce', 0.15, 2, '霸王硬功'), thorns(5, 2)]
    })]
  });

  tech('zhayan', {
    name: '眨眼剑法', tier: 0, sub: 0, realm: 0, kind: '刺杀', el: 'phys', tag: 'sword',
    passive: [{ k: 'swordDmg', v: 0.05 }],
    spells: [sp('zhayan_ci', {
      name: '眨眼突刺', cost: { stam: 8 }, cd: 0, target: 'enemy', el: 'phys', tag: 'sword',
      effects: [dmg(20), debuff('hit', -0.2, 1, 0.1, '眼花')]
    })]
  });

  tech('luoyan', {
    name: '罗烟步', tier: 0, sub: 0, realm: 0, kind: '轻功', el: 'phys',
    passive: [{ k: 'spd', v: 0.1 }],
    spells: [sp('luoyan_bu', {
      name: '罗烟疾步', cost: { stam: 8 }, cd: 2, target: 'self', el: 'phys', tags: ['movement'],
      effects: [buff('spd', 0.15, 2, '罗烟'), buff('evade', 0.1, 2, '罗烟')]
    })]
  });

  tech('guixi', {
    name: '龟息功', tier: 0, sub: 0, realm: 0, kind: '隐匿', el: 'phys',
    passive: [{ k: 'evade', v: 0.04 }],
    spells: [sp('guixi_jiasi', {
      name: '龟息假死', cost: { stam: 10 }, cd: 3, target: 'self', el: 'phys',
      effects: [{ k: 'untargetable', turns: 1 }, buff('evade', 0.5, 1, '龟息')]
    })]
  });

  tech('changchun', {
    name: '长春功', tier: 0, sub: 1, realm: 0, kind: '木系', el: 'wood',
    passive: [{ k: 'woodDmg', v: 0.08 }, { k: 'ctrlHit', v: 0.15 }],
    spells: [
      sp('huodan', {
        name: '火弹术', cost: { mana: 8 }, cd: 0, target: 'enemy', el: 'fire',
        effects: [dmg(25, 'fire'), dot(6, 2, 'fire', 0.15, '灼烧')]
      }),
      sp('dici', {
        name: '地刺术', cost: { mana: 8 }, cd: 1, target: 'enemyFront', el: 'earth',
        effects: [dmg(22, 'earth'), stun(1, 0.2, '定身')]
      }),
      sp('bingdong', {
        name: '冰冻术', cost: { mana: 9 }, cd: 1, target: 'enemy', el: 'ice',
        effects: [dmg(20, 'ice'), debuff('spd', -0.15, 2, 1, '冻缓')]
      }),
      sp('chanrao', {
        name: '缠绕术', cost: { mana: 10 }, cd: 2, target: 'enemy', el: 'wood',
        effects: [seal(['movement'], 2, 1, '缠绕'), debuff('spd', -0.2, 2, 1, '缠绕')]
      }),
      sp('liusha', {
        name: '流沙术', cost: { mana: 10 }, cd: 2, target: 'enemyFront', el: 'earth',
        effects: [debuff('spd', -0.25, 2, 1, '流沙')]
      }),
      sp('yufeng', {
        name: '御风诀', cost: { mana: 8 }, cd: 1, target: 'enemyBack', el: 'wind', tags: ['movement'],
        effects: [dmg(20, 'wind', { back: true })]
      }),
      sp('tianyan', {
        name: '天眼术', cost: { mana: 5 }, cd: 0, target: 'enemy', el: 'soul', tags: ['soul'],
        effects: [dmg(6, 'soul', { pierce: 1 }), debuff('def', -0.15, 2, 1, '看破'),
                  debuff('evade', -0.15, 2, 1, '看破')]
      }),
      sp('nishen', {
        name: '匿身术', cost: { mana: 8 }, cd: 2, target: 'self', el: 'wood',
        effects: [buff('evade', 0.3, 1, '匿身')]
      }),
      sp('chuanyin', {
        name: '传音术', cost: { mana: 3 }, cd: 0, target: 'self', el: 'wood',
        effects: [mana(9)]
      }),
      sp('kongwu', {
        name: '控物术', cost: { mana: 6 }, cd: 1, target: 'enemy', el: 'metal', tags: ['art'],
        effects: [dmg(30, 'metal')]
      })
    ]
  });

  tech('yinqi', {
    name: '引气术', tier: 0, sub: 0, realm: 0, kind: '入门', el: 'wood',
    passive: [{ k: 'manaRegen', v: 1 }, { k: 'breakBonus', v: 0.03 }],
    spells: [sp('yinqi_ru', {
      name: '引气入体', cost: {}, cd: 2, target: 'self', el: 'wood',
      effects: [mana(14)]
    })]
  });

  tech('lianqi', {
    name: '敛气术', tier: 0, sub: 1, realm: 0, kind: '辅助', el: 'wood',
    passive: [{ k: 'evade', v: 0.03 }],
    spells: [sp('lianxi_cang', {
      name: '敛息藏灵', cost: { mana: 8 }, cd: 2, target: 'self', el: 'wood',
      effects: [buff('evade', 0.15, 2, '敛息'), buff('spd', -0.1, 2, '敛息')]
    })]
  });

  tech('ningyuan', {
    name: '凝元功', tier: 0, sub: 1, realm: 0, kind: '辅助', el: 'wood',
    passive: [{ k: 'manaRegen', v: 2 }, { k: 'breakBonus', v: 0.02 }],
    spells: [sp('ningyuan_ju', {
      name: '凝元聚气', cost: { mana: 10 }, cd: 3, target: 'self', el: 'wood',
      effects: [buff('manaRegen', 4, 3, '凝元')]
    })]
  });

  tech('guiyuan', {
    name: '归元功', tier: 0, sub: 1, realm: 0, kind: '防御', el: 'earth',
    passive: [{ k: 'def', v: 0.04 }],
    spells: [sp('guiyuan_jia', {
      name: '归元灵甲', cost: { mana: 12 }, cd: 2, target: 'self', el: 'earth',
      effects: [shield(25, 2)]
    })]
  });

  tech('huanling', {
    name: '幻灵诀', tier: 0, sub: 1, realm: 0, kind: '幻术', el: 'soul',
    passive: [{ k: 'evade', v: 0.03 }],
    spells: [sp('huanling_fen', {
      name: '幻影分身', cost: { mana: 15 }, cd: 3, target: 'self', el: 'soul', tags: ['illusion'],
      effects: [shield(0.15, 2, { pct: true, name: '幻影' }), buff('evade', 0.1, 2, '幻影')]
    })]
  });

  tech('qigui', {
    name: '七鬼噬魂大法', tier: 0, sub: 2, realm: 0, kind: '邪术', el: 'ghost',
    passive: [{ k: 'lifesteal', v: 0.05 }, { k: 'hpUpkeep', v: -0.005 }],
    spells: [sp('qigui_shi', {
      name: '饲鬼借法', cost: { hp: 0.06 }, cd: 5, target: 'self', el: 'ghost',
      effects: [buff('atk', 0.4, 1, '饲鬼'), buff('dmg', 0.2, 1, '饲鬼')]
    })]
  });

  tech('konshen', {
    name: '控神术', tier: 0, sub: 2, realm: 0, kind: '邪术', el: 'soul',
    passive: [{ k: 'ctrlHit', v: 0.05 }],
    spells: [sp('konshen_she', {
      name: '摄心', cost: { mana: 15 }, cd: 4, target: 'enemy', el: 'soul', tags: ['soul'],
      effects: [stun(1, 0.7, '摄心'), debuff('atk', -0.1, 2, 1, '失神')]
    })]
  });

  tech('xuejian', {
    name: '血箭阴魂咒', tier: 0, sub: 2, realm: 0, kind: '邪咒', el: 'blood',
    passive: [{ k: 'bloodDmg', v: 0.06 }],
    spells: [sp('xuejian_zhou', {
      name: '阴魂血咒', cost: { mana: 12 }, cd: 3, target: 'enemy', el: 'blood',
      effects: [dot(5, 3, 'blood', 1, '阴魂血咒'), debuff('atk', -0.05, 3, 1, '衰老')]
    })]
  });

  /* =============================================================
     二、筑基期（灵阶）
     ============================================================= */

  tech('qingyuan1', {
    name: '青元剑诀·一至六层', tier: 1, sub: 1, realm: 1, kind: '剑修', el: 'metal', tag: 'sword',
    passive: [{ k: 'swordDmg', v: 0.12 }, { k: 'crit', v: 0.08 }],
    spells: [
      sp('qingyuan_mang', {
        name: '青元剑芒', cost: { mana: 18 }, cd: 0, target: 'enemy', el: 'metal', tag: 'sword',
        effects: [dmg(55, 'metal', { pierce: 0.1 })]
      }),
      sp('huti_jian', {
        name: '护体剑盾', cost: { mana: 20 }, cd: 2, target: 'self', el: 'metal', tag: 'sword',
        effects: [shield(35, 2), thorns(10, 2)]
      }),
      sp('jujian', {
        name: '巨剑术', cost: { mana: 25 }, cd: 2, target: 'enemyFront', el: 'metal', tag: 'sword',
        effects: [dmg(70, 'metal'), stun(1, 0.2, '击退')]
      })
    ]
  });

  tech('dayan1', {
    name: '大衍诀·一至二层', tier: 1, sub: 1, realm: 1, kind: '神识', el: 'soul',
    passive: [{ k: 'ctrlHit', v: 0.1 }, { k: 'soulDmg', v: 0.12 }, { k: 'mana', v: 0.05 }, { k: 'breakBonus', v: 0.05 }],
    spells: [
      sp('shennian_ci', {
        name: '神念刺', cost: { mana: 15 }, cd: 2, target: 'enemy', el: 'soul', tags: ['soul'],
        effects: [dmg(40, 'soul'), stun(1, 0.2, '失神')]
      }),
      sp('shennian_fu', {
        name: '神念附灵', cost: { mana: 20 }, cd: 3, target: 'self', el: 'soul', tags: ['soul'],
        effects: [buff('dmg', 0.3, 1, '附灵'), buff('crit', 0.1, 1, '附灵')]
      })
    ]
  });

  tech('taiyang', {
    name: '泰阳诀', tier: 1, sub: 1, realm: 1, kind: '火系', el: 'fire',
    passive: [{ k: 'fireDmg', v: 0.1 }],
    spells: [sp('taiyang_lie', {
      name: '真阳烈焰', cost: { mana: 22 }, cd: 1, target: 'enemy', el: 'fire',
      effects: [dmg(60, 'fire'), dot(15, 2, 'fire', 1, '烈焰')]
    })]
  });

  tech('haoran', {
    name: '浩然正气诀', tier: 1, sub: 1, realm: 1, kind: '儒门', el: 'soul',
    passive: [{ k: 'vsGhost', v: 0.2 }, { k: 'take', v: 0.03 }],
    spells: [
      sp('zhengqi_hu', {
        name: '正气护体', cost: { mana: 20 }, cd: 3, target: 'self', el: 'soul',
        effects: [buff('dmgReduce', 0.15, 2, '正气'), cleanse(), { k: 'ghostImmune', turns: 2 }]
      }),
      sp('haoran_chi', {
        name: '浩然斥邪', cost: { mana: 18 }, cd: 2, target: 'enemy', el: 'soul',
        effects: [dmg(50, 'soul', { vsGhost: 0.5 }), dispel()]
      })
    ]
  });

  tech('taibai', {
    name: '太白剑诀', tier: 1, sub: 1, realm: 1, kind: '剑修', el: 'metal', tag: 'sword',
    passive: [{ k: 'swordDmg', v: 0.1 }, { k: 'crit', v: 0.05 }],
    spells: [sp('taibai_guang', {
      name: '太白剑光', cost: { mana: 18 }, cd: 0, target: 'enemy', el: 'metal', tag: 'sword',
      effects: [dmg(50, 'metal'), buff('crit', 0.1, 2, '剑意')]
    })]
  });

  tech('daluo', {
    name: '大罗千幻诀', tier: 1, sub: 1, realm: 1, kind: '幻术', el: 'soul',
    passive: [{ k: 'evade', v: 0.05 }],
    spells: [sp('qianhuan_ti', {
      name: '千幻替身', cost: { mana: 25 }, cd: 3, target: 'self', el: 'soul', tags: ['illusion'],
      effects: [shield(0.12, 2, { pct: true, name: '千幻' }), buff('evade', 0.3, 2, '千幻')]
    })]
  });

  tech('qianlang', {
    name: '千浪诀', tier: 1, sub: 0, realm: 1, kind: '水系', el: 'water',
    passive: [{ k: 'waterDmg', v: 0.08 }],
    spells: [
      sp('dielang', {
        name: '叠浪击', cost: { mana: 16 }, cd: 0, target: 'enemy', el: 'water',
        effects: [dmg(45, 'water', { stack: { per: 8, max: 3 } })]
      }),
      sp('langdun', {
        name: '浪遁', cost: { mana: 18 }, cd: 3, target: 'self', el: 'water', tags: ['movement'],
        effects: [buff('dmgReduce', 0.2, 1, '浪遁'), buff('evade', 0.1, 1, '浪遁')]
      })
    ]
  });

  tech('yunxue', {
    name: '云雪诀', tier: 1, sub: 1, realm: 1, kind: '冰系', el: 'ice',
    passive: [{ k: 'iceDmg', v: 0.08 }],
    spells: [sp('yunxue_feng', {
      name: '云雪冰封', cost: { mana: 20 }, cd: 2, target: 'enemy', el: 'ice',
      effects: [dmg(45, 'ice'), stun(1, 0.3, '冰封')]
    })]
  });

  tech('xuanbing', {
    name: '玄冰诀', tier: 1, sub: 0, realm: 1, kind: '冰系', el: 'ice',
    passive: [{ k: 'takeIce', v: 0.1 }],
    spells: [sp('hanshuang_jia', {
      name: '寒霜甲', cost: { mana: 15 }, cd: 2, target: 'self', el: 'ice',
      effects: [shield(25, 2), buff('def', 0.1, 2, '寒霜')]
    })]
  });

  tech('qingling', {
    name: '青灵功', tier: 1, sub: 0, realm: 1, kind: '木系', el: 'wood',
    passive: [{ k: 'healBonus', v: 0.1 }, { k: 'woodDmg', v: 0.05 }],
    spells: [sp('qingling_huichun', {
      name: '青灵回春', cost: { mana: 18 }, cd: 2, target: 'self', el: 'wood',
      effects: [heal(35)]
    })]
  });

  tech('yudan', {
    name: '玉丹功', tier: 1, sub: 1, realm: 1, kind: '正道', el: 'earth',
    passive: [{ k: 'healBonus', v: 0.1 }, { k: 'hp', v: 0.04 }],
    spells: [sp('yudan_hu', {
      name: '玉丹护体', cost: { mana: 25 }, cd: 3, target: 'self', el: 'earth',
      effects: [shield(40, 2), buff('manaRegen', 3, 2, '玉丹')]
    })]
  });

  tech('tianluo', {
    name: '天罗真功', tier: 1, sub: 2, realm: 1, kind: '儒门', el: 'thunder',
    passive: [{ k: 'thunderDmg', v: 0.1 }],
    spells: [sp('tianluo_lei', {
      name: '天罗真雷', cost: { mana: 30 }, cd: 3, target: 'enemy', el: 'thunder',
      effects: [dmg(70, 'thunder'), stun(1, 0.3, '麻痹')]
    })]
  });

  tech('jinlian', {
    name: '金炼诀', tier: 1, sub: 1, realm: 1, kind: '金系', el: 'metal',
    passive: [{ k: 'metalDmg', v: 0.1 }],
    spells: [sp('jinfeng', {
      name: '金锋斩', cost: { mana: 20 }, cd: 0, target: 'enemy', el: 'metal', tag: 'sword',
      effects: [dmg(55, 'metal', { pierce: 0.15 })]
    })]
  });

  tech('lingying', {
    name: '灵影术', tier: 1, sub: 0, realm: 1, kind: '幻术', el: 'soul',
    passive: [{ k: 'evade', v: 0.04 }],
    spells: [sp('shuangying', {
      name: '双影', cost: { mana: 20 }, cd: 3, target: 'self', el: 'soul', tags: ['illusion'],
      effects: [shield(0.16, 2, { pct: true, name: '双影' }), buff('evade', 0.1, 2, '双影')]
    })]
  });

  tech('ningyuan2', {
    name: '凝元功·进阶', tier: 1, sub: 0, realm: 1, kind: '辅助', el: 'wood',
    passive: [{ k: 'manaRegen', v: 3 }],
    spells: [sp('zhoutian', {
      name: '周天聚气', cost: { mana: 10 }, cd: 4, target: 'self', el: 'wood',
      effects: [mana(30)]
    })]
  });

  tech('xueying', {
    name: '血影遁', tier: 1, sub: 1, realm: 1, kind: '妖修遁术', el: 'blood', tags: ['movement'],
    passive: [{ k: 'spd', v: 0.12 }],
    spells: [sp('xueying_xi', {
      name: '血影突袭', cost: { mana: 22 }, cd: 2, target: 'enemy', el: 'blood', tags: ['movement'],
      effects: [dmg(50, 'blood', { lowHp: { below: 0.5, mult: 1.3 } }),
                buff('spd', 0.3, 1, '血影'), buff('evade', 0.1, 1, '血影')]
    })]
  });

  tech('jifeng', {
    name: '疾风九变', tier: 1, sub: 1, realm: 1, kind: '身法', el: 'wind', tags: ['movement'],
    passive: [{ k: 'spd', v: 0.12 }],
    spells: [sp('jifeng_bian', {
      name: '疾风变', cost: { mana: 25 }, cd: 4, target: 'self', el: 'wind', tags: ['movement'],
      effects: [buff('spd', 0.4, 3, '疾风'), buff('evade', 0.15, 3, '疾风')]
    })]
  });

  tech('lianxi', {
    name: '敛息术', tier: 1, sub: 0, realm: 1, kind: '隐匿', el: 'wood',
    passive: [{ k: 'evade', v: 0.04 }],
    spells: [sp('nifeng', {
      name: '匿风藏形', cost: { mana: 15 }, cd: 3, target: 'self', el: 'wood', tags: ['movement'],
      effects: [{ k: 'untargetable', turns: 1 }, buff('evade', 0.2, 1, '潜行')]
    })]
  });

  tech('huanxing', {
    name: '换形诀', tier: 1, sub: 0, realm: 1, kind: '变化', el: 'soul',
    passive: [{ k: 'evade', v: 0.04 }],
    spells: [sp('yirong', {
      name: '易容改貌', cost: { mana: 18 }, cd: 3, target: 'self', el: 'soul', tags: ['illusion'],
      effects: [buff('evade', 0.4, 2, '易容')]
    })]
  });

  tech('nongyan', {
    name: '弄焰诀', tier: 1, sub: 0, realm: 1, kind: '火系辅助', el: 'fire',
    passive: [{ k: 'fireDmg', v: 0.06 }],
    spells: [sp('yanxing', {
      name: '焰形变化', cost: { mana: 10 }, cd: 2, target: 'self', el: 'fire',
      effects: [buff('fireDmg', 0.35, 2, '焰形')]
    })]
  });

  tech('xuelian', {
    name: '血炼神光', tier: 1, sub: 0, realm: 1, kind: '魔功', el: 'blood',
    passive: [{ k: 'lifesteal', v: 0.05 }, { k: 'hpUpkeep', v: -0.005 }],
    spells: [sp('xueguang', {
      name: '血光护罩', cost: { mana: 20 }, cd: 2, target: 'self', el: 'blood',
      effects: [shield(40, 2, { hpCost: 5 })]
    })]
  });

  tech('shayao', {
    name: '煞妖诀', tier: 1, sub: 0, realm: 1, kind: '血祭', el: 'blood',
    passive: [{ k: 'lifesteal', v: 0.05 }, { k: 'hpUpkeep', v: -0.005 }],
    spells: [sp('xuening', {
      name: '血凝丹煞', cost: { hp: 0.1 }, cd: 3, target: 'self', el: 'blood',
      effects: [buff('dmg', 0.5, 1, '丹煞')]
    })]
  });

  tech('qisha', {
    name: '七煞诀', tier: 1, sub: 0, realm: 1, kind: '魔道', el: 'ghost',
    passive: [{ k: 'ghostDmg', v: 0.06 }],
    spells: [sp('shagan', {
      name: '煞感追踪', cost: { mana: 15 }, cd: 2, target: 'enemy', el: 'ghost',
      effects: [debuff('def', -0.1, 2, 1, '煞印'), buff('dmg', 0.1, 2, '煞感')]
    })]
  });

  tech('yousha', {
    name: '幽杀诀', tier: 1, sub: 0, realm: 1, kind: '鬼道', el: 'ghost',
    passive: [{ k: 'ghostDmg', v: 0.1 }],
    spells: [sp('youying', {
      name: '幽影刺杀', cost: { mana: 18 }, cd: 2, target: 'enemy', el: 'ghost',
      effects: [dmg(45, 'ghost', { lowHp: { below: 0.3, mult: 1.3 } })]
    })]
  });

  tech('sunv', {
    name: '素女轮回功', tier: 1, sub: 2, realm: 1, kind: '双修', el: 'wood',
    passive: [{ k: 'lifesteal', v: 0.04 }],
    spells: [sp('lunhui', {
      name: '轮回抽元', cost: { mana: 25 }, cd: 3, target: 'enemy', el: 'wood',
      effects: [drain(15, 15), debuff('atk', -0.15, 2, 0.3, '虚弱')]
    })]
  });

  tech('chanyu', {
    name: '缠玉诀', tier: 1, sub: 0, realm: 1, kind: '女修', el: 'wood',
    passive: [{ k: 'ctrlHit', v: 0.05 }],
    spells: [sp('chanyu_si', {
      name: '缠玉丝', cost: { mana: 15 }, cd: 2, target: 'enemy', el: 'wood',
      effects: [seal(['movement'], 2, 1, '缠玉'), debuff('spd', -0.2, 2, 1, '缠玉')]
    })]
  });

  tech('huachun', {
    name: '化春诀', tier: 1, sub: 0, realm: 1, kind: '养颜', el: 'wood',
    passive: [{ k: 'healBonus', v: 0.1 }, { k: 'hp', v: 0.03 }],
    spells: [sp('chunyan', {
      name: '春颜护体', cost: { mana: 18 }, cd: 3, target: 'self', el: 'wood',
      effects: [hot(8, 3)]
    })]
  });

  tech('lingwen', {
    name: '灵纹术', tier: 1, sub: 0, realm: 1, kind: '毒修', el: 'wood',
    passive: [{ k: 'woodDmg', v: 0.06 }],
    spells: [sp('duwen', {
      name: '毒纹烙印', cost: { mana: 18 }, cd: 2, target: 'enemy', el: 'wood',
      effects: [dot(10, 3, 'wood', 1, '毒纹')]
    })]
  });

  /* =============================================================
     三、金丹期（宝阶）
     ============================================================= */

  tech('qingyuan2', {
    name: '青元剑诀·七至九层', tier: 2, sub: 1, realm: 2, kind: '剑修', el: 'metal', tag: 'sword',
    passive: [{ k: 'swordDmg', v: 0.15 }, { k: 'crit', v: 0.05 }],
    spells: [
      sp('jianying', {
        name: '剑影分光术', cost: { mana: 40 }, cd: 3, target: 'enemy', el: 'metal', tag: 'sword',
        effects: [dmg(35, 'metal', { hits: 3, random: true })]
      }),
      sp('chunli', {
        name: '春黎剑芒', cost: { mana: 35 }, cd: 0, target: 'enemy', el: 'metal', tag: 'sword',
        effects: [dmg(90, 'metal'), heal(25)]
      })
    ]
  });

  tech('dayan2', {
    name: '大衍诀·三至四层', tier: 2, sub: 1, realm: 2, kind: '神识', el: 'soul',
    passive: [{ k: 'soulDmg', v: 0.15 }, { k: 'ctrlHit', v: 0.1 }, { k: 'breakBonus', v: 0.06 }],
    spells: [
      sp('shishen_ci', {
        name: '失神刺', cost: { mana: 30 }, cd: 2, target: 'enemy', el: 'soul', tags: ['soul'],
        effects: [dmg(70, 'soul'), stun(1, 0.4, '失神')]
      }),
      sp('shenshi_qian', {
        name: '神识化千', cost: { mana: 45 }, cd: 5, target: 'self', el: 'soul', tags: ['soul'],
        effects: [buff('dmg', 0.2, 2, '化千'), buff('ctrlHit', 0.15, 2, '化千')]
      }),
      sp('wugui', {
        name: '五鬼锁神', cost: { mana: 40 }, cd: 4, target: 'enemy', el: 'soul', tags: ['soul'],
        effects: [seal(['soul', 'illusion'], 2, 0.9, '锁神')]
      })
    ]
  });

  tech('jinzhen', {
    name: '金真功', tier: 2, sub: 1, realm: 2, kind: '金系', el: 'metal',
    passive: [{ k: 'def', v: 0.08 }, { k: 'takeFire', v: 0.05 }],
    spells: [sp('jinzhen_hu', {
      name: '金真护体', cost: { mana: 35 }, cd: 4, target: 'self', el: 'metal',
      effects: [buff('physReduce', 0.2, 3, '金真')]
    })]
  });

  tech('baihua', {
    name: '百花阳春诀', tier: 2, sub: 1, realm: 2, kind: '木系', el: 'wood',
    passive: [{ k: 'healBonus', v: 0.15 }, { k: 'hp', v: 0.05 }],
    spells: [sp('yangchun', {
      name: '阳春花雨', cost: { mana: 50 }, cd: 5, target: 'self', el: 'wood',
      effects: [heal(50), hot(8, 2)]
    })]
  });

  tech('xuanyin', {
    name: '玄阴经', tier: 2, sub: 2, realm: 2, kind: '魔道', el: 'ghost',
    passive: [{ k: 'ghostDmg', v: 0.18 }, { k: 'ghostResist', v: 0.15 }, { k: 'takeHoly', v: 0.15 }],
    spells: [
      sp('yinmo_zhan', {
        name: '阴魔斩', cost: { mana: 50 }, cd: 4, target: 'enemy', el: 'ghost',
        effects: [dmg(110, 'ghost', { scaleRound: 0.15, pierceShield: true })]
      }),
      sp('xuanyin_qi', {
        name: '玄阴魔气', cost: { mana: 45 }, cd: 3, target: 'enemyAll', el: 'ghost',
        effects: [dmg(40, 'ghost'), debuff('spd', -0.15, 2, 0.3, '阴风')]
      }),
      sp('xueling_zuan', {
        name: '血灵钻', cost: { mana: 55 }, cd: 6, target: 'enemy', el: 'blood',
        effects: [dmg(100, 'blood', { pierce: 1 })]
      }),
      sp('lihun', {
        name: '离魂术', cost: { mana: 45 }, cd: 5, target: 'enemy', el: 'soul', tags: ['soul'],
        effects: [dmg(80, 'soul'), debuff('healBonus', -0.8, 2, 1, '离魂')]
      })
    ]
  });

  tech('xuanyin2', {
    name: '玄阴大法', tier: 2, sub: 2, realm: 2, kind: '魔道', el: 'ghost',
    passive: [{ k: 'ghostDmg', v: 0.1 }],
    spells: [sp('xuanyin_wu', {
      name: '玄阴鬼雾', cost: { mana: 55 }, cd: 5, target: 'enemyAll', el: 'ghost',
      effects: [dot(15, 3, 'ghost', 1, '阴毒'), debuff('hit', -0.2, 3, 1, '鬼雾')]
    })]
  });

  tech('tuotian', {
    name: '托天魔功', tier: 2, sub: 2, realm: 2, kind: '魔体', el: 'phys',
    passive: [{ k: 'hp', v: 0.2 }, { k: 'def', v: 0.12 }],
    spells: [
      sp('tianmo_bian', {
        name: '天魔变身', cost: { mana: 60 }, cd: 6, target: 'self', el: 'phys',
        effects: [buff('atk', 0.4, 3, '天魔'), buff('def', 0.3, 3, '金鳞')]
      }),
      sp('tuotian_quan', {
        name: '托天魔拳', cost: { mana: 35 }, cd: 2, target: 'enemyFront', el: 'phys',
        effects: [dmg(90), stun(1, 0.25, '击退')]
      })
    ]
  });

  tech('liuji', {
    name: '六极真魔功', tier: 2, sub: 2, realm: 2, kind: '魔道', el: 'ghost',
    passive: [{ k: 'dmg', v: 0.1 }, { k: 'cheatDeath', v: 1 }],
    spells: [sp('liumo', {
      name: '六魔虚影', cost: { mana: 70 }, cd: 8, target: 'enemyRandom', el: 'ghost',
      effects: [dmg(30, 'ghost', { hits: 4, random: true })]
    })]
  });

  tech('tiansha', {
    name: '天刹真魔功', tier: 2, sub: 2, realm: 2, kind: '魔道', el: 'ghost',
    passive: [{ k: 'dmg', v: 0.1 }, { k: 'cheatDeath', v: 1 }],
    spells: [sp('tiansha_fu', {
      name: '天煞附体', cost: { mana: 65 }, cd: 7, target: 'self', el: 'ghost',
      effects: [buff('allStats', 0.25, 3, '天煞')]
    })]
  });

  tech('kuishui', {
    name: '葵水魔功', tier: 2, sub: 1, realm: 2, kind: '水系魔功', el: 'water',
    passive: [{ k: 'waterDmg', v: 0.1 }],
    spells: [sp('kuishui_liu', {
      name: '葵水阴流', cost: { mana: 40 }, cd: 3, target: 'enemy', el: 'water',
      effects: [dmg(85, 'water'), dot(12, 3, 'water', 1, '蚀骨'),
                debuff('healBonus', -0.5, 3, 1, '蚀骨')]
    })]
  });

  tech('sisha', {
    name: '四煞化甲术', tier: 2, sub: 1, realm: 2, kind: '魔道', el: 'ghost',
    passive: [{ k: 'hp', v: 0.1 }, { k: 'def', v: 0.08 }],
    spells: [sp('shaqi_jia', {
      name: '煞气凝甲', cost: { mana: 40 }, cd: 4, target: 'self', el: 'ghost',
      effects: [shield(60, 2), thorns(15, 2)]
    })]
  });

  tech('minghe', {
    name: '冥河天尸诀', tier: 2, sub: 2, realm: 2, kind: '尸修', el: 'ghost',
    passive: [{ k: 'hp', v: 0.15 }, { k: 'poisonImmune', v: 1 }],
    spells: [sp('tianshi', {
      name: '天尸之躯', cost: { mana: 50 }, cd: 6, target: 'self', el: 'ghost',
      effects: [buff('def', 0.35, 3, '尸躯'), buff('healBonus', -0.5, 3, '尸躯'),
                buff('dmgReduce', 0.1, 3, '尸躯')]
    })]
  });

  tech('fenghun', {
    name: '封魂咒', tier: 2, sub: 1, realm: 2, kind: '魔咒', el: 'soul',
    passive: [{ k: 'ctrlHit', v: 0.1 }],
    spells: [sp('fenghun_yin', {
      name: '封魂印', cost: { mana: 50 }, cd: 6, target: 'enemy', el: 'soul', tags: ['soul'],
      effects: [stun(2, 0.7, '封魂'), dmg(20, 'soul', { pierce: 1 })]
    })]
  });

  tech('xueluo', {
    name: '血罗罩', tier: 2, sub: 1, realm: 2, kind: '魔术', el: 'blood',
    passive: [{ k: 'bloodDmg', v: 0.1 }],
    spells: [sp('xueshi_bao', {
      name: '血尸爆罩', cost: { mana: 45 }, cd: 5, target: 'enemy', el: 'blood',
      effects: [dmg(50, 'blood'), seal(['movement'], 2, 1, '血罩'), dot(8, 2, 'blood', 1, '血罩')]
    })]
  });

  tech('xuanpin', {
    name: '玄牝化婴大法', tier: 2, sub: 2, realm: 2, kind: '秘术', el: 'soul',
    passive: [{ k: 'mana', v: 0.1 }],
    spells: [sp('erying', {
      name: '培育第二元婴', cost: { mana: 80 }, cd: 10, target: 'self', el: 'soul',
      effects: [shield(0.25, 3, { pct: true, name: '元婴' }), buff('atk', 0.3, 3, '元婴'),
                buff('dmg', 0.15, 3, '元婴')]
    })]
  });

  tech('huashen', {
    name: '身外化身', tier: 2, sub: 2, realm: 2, kind: '秘术', el: 'soul',
    passive: [{ k: 'hp', v: 0.05 }],
    spells: [sp('huashen_chu', {
      name: '化身出窍', cost: { mana: 70 }, cd: 10, target: 'self', el: 'soul',
      effects: [shield(0.3, 9, { pct: true, name: '化身' }), buff('dmg', 0.25, 9, '化身')]
    })]
  });

  tech('yinlong', {
    name: '引龙诀', tier: 2, sub: 0, realm: 2, kind: '双修邪功', el: 'wood',
    passive: [{ k: 'lifesteal', v: 0.05 }],
    spells: [sp('caibu', {
      name: '采补牵引', cost: { mana: 30 }, cd: 4, target: 'enemy', el: 'wood',
      effects: [drain(20, 10)]
    })]
  });

  tech('dianfeng', {
    name: '颠凤培元功', tier: 2, sub: 2, realm: 2, kind: '双修邪功', el: 'fire',
    passive: [{ k: 'dmg', v: 0.05 }, { k: 'hpUpkeep', v: -0.005 }],
    spells: [sp('duoyuan', {
      name: '夺元破境', cost: { hp: 0.08 }, cd: 8, target: 'self', el: 'fire',
      effects: [buff('dmg', 0.3, 3, '夺元'), buff('atk', -0.2, 2, '虚弱')]
    })]
  });

  tech('xueling', {
    name: '血灵大法', tier: 2, sub: 2, realm: 2, kind: '魔功', el: 'blood',
    passive: [{ k: 'lifesteal', v: 0.06 }, { k: 'hpUpkeep', v: -0.005 }],
    spells: [sp('xueling_shi', {
      name: '血灵噬魂', cost: { mana: 50 }, cd: 5, target: 'enemy', el: 'blood',
      effects: [dmg(95, 'blood', { healOnKill: 0.2 })]
    })]
  });

  /* =============================================================
     四、元婴 — 化神（宝阶上品 / 半仙阶）
     ============================================================= */

  tech('qingyuan3', {
    name: '青元剑诀·十至十三层', tier: 3, sub: 0, realm: 3, kind: '剑修', el: 'metal', tag: 'sword',
    passive: [{ k: 'swordDmg', v: 0.3 }, { k: 'crit', v: 0.08 }, { k: 'ctrlResist', v: 0.1 }],
    spells: [
      sp('dageng', {
        name: '大庚剑阵', cost: { mana: 100 }, cd: 7, target: 'enemyAll', el: 'metal', tag: 'sword',
        effects: [dmg(150, 'metal'), dot(40, 3, 'metal', 1, '剑丝'),
                  debuff('spd', -0.15, 3, 1, '剑阵')]
      }),
      sp('zhumo', {
        name: '青元诛魔剑', cost: { mana: 90 }, cd: 6, target: 'enemy', el: 'metal', tag: 'sword',
        effects: [dmg(300, 'metal', { pierce: 0.5, execute: 0.3 })]
      }),
      sp('jianxin', {
        name: '剑心通明', cost: { mana: 50 }, cd: 6, target: 'self', el: 'metal', tag: 'sword',
        effects: [buff('crit', 1, 3, '剑心'), buff('pierce', 0.3, 3, '剑心')]
      })
    ]
  });

  tech('dayan3', {
    name: '大衍诀·圆满', tier: 2, sub: 2, realm: 3, kind: '神识', el: 'soul',
    passive: [{ k: 'soulDmg', v: 0.2 }, { k: 'ctrlHit', v: 0.15 }, { k: 'mana', v: 0.1 }, { k: 'breakBonus', v: 0.08 }],
    spells: [sp('jingshen', {
      name: '惊神刺', cost: { mana: 60 }, cd: 4, target: 'enemy', el: 'soul', tags: ['soul'],
      effects: [dmg(150, 'soul', { pierce: 1 }), stun(1, 0.5, '失神')]
    })]
  });

  tech('mingwang', {
    name: '明王诀', tier: 2, sub: 2, realm: 3, kind: '佛门炼体', el: 'metal',
    passive: [{ k: 'hp', v: 0.15 }, { k: 'def', v: 0.1 }, { k: 'breakBonus', v: 0.05 }],
    spells: [
      sp('mingwang_ti', {
        name: '明王法体', cost: { mana: 80 }, cd: 7, target: 'self', el: 'metal',
        effects: [buff('hpMax', 0.3, 3, '法体'), buff('def', 0.3, 3, '法体'),
                  buff('dmgReduce', 0.1, 3, '佛光')]
      }),
      sp('jingang', {
        name: '金刚降魔', cost: { mana: 60 }, cd: 4, target: 'enemy', el: 'metal',
        effects: [dmg(160, 'metal', { vsDemon: 0.5 })]
      })
    ]
  });

  tech('sanfan', {
    name: '三梵圣功', tier: 2, sub: 2, realm: 3, kind: '妖魔改良', el: 'fire',
    passive: [{ k: 'fireDmg', v: 0.15 }, { k: 'def', v: 0.05 }, { k: 'breakBonus', v: 0.04 }],
    spells: [
      sp('fansheng', {
        name: '梵圣魔焰', cost: { mana: 65 }, cd: 4, target: 'enemy', el: 'fire',
        effects: [dmg(140, 'fire'), debuff('healBonus', -0.6, 3, 1, '魔烬')]
      }),
      sp('faxiang', {
        name: '法相雏形', cost: { mana: 90 }, cd: 8, target: 'self', el: 'fire',
        effects: [buff('atk', 0.2, 3, '法相'), buff('def', 0.2, 3, '法相'),
                  buff('dmgReduce', 0.3, 3, '法相承伤')]
      })
    ]
  });

  tech('yuanci', {
    name: '元磁神光', tier: 3, sub: 0, realm: 3, kind: '五行', el: 'metal',
    passive: [{ k: 'take', v: 0.1 }, { k: 'metalDmg', v: 0.1 }],
    spells: [
      sp('yuanci_xi', {
        name: '元磁吸力', cost: { mana: 60 }, cd: 4, target: 'enemyFront', el: 'metal',
        effects: [dmg(30, 'metal'), debuff('def', -0.3, 2, 1, '卸甲')]
      }),
      sp('yuanci_dun', {
        name: '元磁光盾', cost: { mana: 70 }, cd: 4, target: 'self', el: 'metal',
        effects: [buff('dmgReduce', 0.3, 2, '磁盾'), buff('takeFire', -0.25, 2, '磁盾')]
      }),
      sp('ciguang', {
        name: '磁光裂杀', cost: { mana: 80 }, cd: 6, target: 'enemy', el: 'metal',
        effects: [dmg(180, 'metal', { pierce: 1 })]
      })
    ]
  });

  tech('cuigu', {
    name: '淬骨诀', tier: 2, sub: 1, realm: 3, kind: '炼体', el: 'phys',
    passive: [{ k: 'hp', v: 0.1 }, { k: 'def', v: 0.12 }],
    spells: [sp('cuigu_jin', {
      name: '淬骨锻筋', cost: { mana: 50 }, cd: 5, target: 'self', el: 'phys',
      effects: [buff('physReduce', 0.25, 3, '淬骨'), thorns(0.2, 3)]
    })]
  });

  tech('niqing', {
    name: '逆情断天大法', tier: 2, sub: 2, realm: 3, kind: '魔道', el: 'ghost',
    passive: [{ k: 'dmg', v: 0.08 }],
    spells: [sp('duantian', {
      name: '断天逆情', cost: { mana: 70 }, cd: 8, target: 'self', el: 'ghost',
      effects: [buff('dmg', 0.35, 3, '逆情'), buff('healBonus', -1, 3, '逆情')]
    })]
  });

  tech('xuanhun', {
    name: '玄魂炼妖大法', tier: 2, sub: 2, realm: 3, kind: '鬼道', el: 'soul',
    passive: [{ k: 'ghostResist', v: 0.2 }, { k: 'evade', v: 0.05 }],
    spells: [sp('xuanhun_ti', {
      name: '玄魂之体', cost: { mana: 90 }, cd: 10, target: 'self', el: 'soul',
      effects: [buff('ctrlResist', 1, 3, '玄魂'), buff('dmgReduce', 0.2, 3, '玄魂'),
                buff('evade', 0.15, 3, '玄魂')]
    })]
  });

  tech('huaying', {
    name: '化影遁', tier: 2, sub: 2, realm: 3, kind: '遁术', el: 'ghost', tags: ['movement'],
    passive: [{ k: 'spd', v: 0.08 }],
    spells: [sp('huaying_wu', {
      name: '化影无踪', cost: { mana: 60 }, cd: 6, target: 'self', el: 'ghost', tags: ['movement'],
      effects: [{ k: 'untargetable', turns: 1 }, buff('dmg', 0.4, 2, '化影'),
                buff('spd', 0.5, 2, '化影')]
    })]
  });

  tech('suodi', {
    name: '缩地术', tier: 2, sub: 2, realm: 3, kind: '遁术', el: 'earth', tags: ['movement'],
    passive: [{ k: 'spd', v: 0.06 }],
    spells: [sp('suodi_cun', {
      name: '缩地成寸', cost: { mana: 50 }, cd: 5, target: 'self', el: 'earth', tags: ['movement'],
      effects: [buff('spd', 0.3, 2, '缩地'), { k: 'reachBack', turns: 2 }]
    })]
  });

  tech('kunxian', {
    name: '幻妙天象·困仙笼', tier: 3, sub: 0, realm: 3, kind: '上古秘术', el: 'soul',
    passive: [{ k: 'ctrlHit', v: 0.15 }],
    spells: [sp('kunxian_meng', {
      name: '困仙梦魇', cost: { mana: 120 }, cd: 10, target: 'enemy', el: 'soul', tags: ['soul'],
      effects: [stun(2, 0.85, '困仙'), { k: 'banish', turns: 2 }]
    })]
  });

  tech('daxing', {
    name: '大五行擒仙手', tier: 2, sub: 2, realm: 3, kind: '秘术', el: 'earth',
    passive: [{ k: 'ctrlHit', v: 0.08 }],
    spells: [sp('qinxian', {
      name: '擒仙大手', cost: { mana: 65 }, cd: 5, target: 'enemyBack', el: 'earth',
      effects: [dmg(120, 'earth', { back: true }), stun(1, 0.6, '擒拿')]
    })]
  });

  tech('tongbao', {
    name: '通宝诀', tier: 2, sub: 2, realm: 3, kind: '灵宝驱使', el: 'metal',
    passive: [{ k: 'dmg', v: 0.05 }],
    spells: [sp('lingbao', {
      name: '灵宝催动', cost: { mana: 40 }, cd: 6, target: 'self', el: 'metal',
      effects: [buff('dmg', 0.3, 3, '灵宝'), buff('crit', 0.1, 3, '灵宝')]
    })]
  });

  /* =============================================================
     校验 & 导出
     ============================================================= */
  for (var tid in TECHS) {
    var t = TECHS[tid];
    if (!t.spells.length) throw new Error('功法没有法术: ' + tid);
    t.spells.forEach(function (sid) {
      if (!SPELLS[sid]) throw new Error('法术不存在: ' + tid + '/' + sid);
      SPELLS[sid].tech = tid;
    });
  }

  /* 六阶：人 / 凡 / 地 / 天 / 帝 / 仙 */
  var GRADES = ['人阶', '凡阶', '地阶', '天阶', '帝阶', '仙阶'];
  function gradeOf(t) {
    if (typeof t === 'string') t = TECHS[t] || SPELLS[t];
    if (!t) return 0;
    if (t.tech) t = TECHS[t.tech];
    if (!t) return 0;
    if (t.tier === 0) return t.sub === 0 ? 0 : 1;
    if (t.tier === 1) return 2;
    if (t.tier === 2) return t.realm >= 3 ? 4 : 3;
    return 5;
  }
  g.GRADES = GRADES;
  g.gradeOf = gradeOf;

  g.TIER_NAME = TIER_NAME;
  g.TIER_SUB = TIER_SUB;
  g.EL = EL;
  g.TECHS = TECHS;
  g.SPELLS = SPELLS;
  g.fx = {
    dmg: dmg, dot: dot, hot: hot, shield: shield, buff: buff, debuff: debuff,
    stun: stun, seal: seal, heal: heal, mana: mana, drain: drain,
    thorns: thorns, selfHp: selfHp, cleanse: cleanse, dispel: dispel
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
