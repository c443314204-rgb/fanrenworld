/* =============================================================
   v17 补录：据凡人 wiki 整理出的功法 / 法宝 / 镇派传承
   -------------------------------------------------------------
   1) 新增 10 门功法（原著有、旧稿未收），每门 2~3 个法术
   2) 法宝图录：百宝阁与拍卖行共用的货架（按品阶分档）
   3) 宗门镇派：各宗只有一两门看家本事，不外传
   ============================================================= */
(function (g) {
  'use strict';

  var TECHS = g.TECHS, SPELLS = g.SPELLS;
  var D = g.WORLD_DATA;

  /* ---------- 效果构造（与 data_tech.js 同构） ---------- */
  function dmg(amt, el, o) {
    var e = { k: 'dmg', amt: amt, el: el || 'phys' };
    if (o) for (var k in o) e[k] = o[k];
    return e;
  }
  function dot(amt, turns, el, chance, name) {
    return { k: 'dot', amt: amt, turns: turns, el: el || 'phys',
             chance: chance == null ? 1 : chance, name: name || '持续伤害' };
  }
  function hot(amt, turns, name) { return { k: 'hot', amt: amt, turns: turns, name: name || '回春' }; }
  function shield(amt, turns, o) {
    var e = { k: 'shield', amt: amt, turns: turns || 2 };
    if (o) for (var k in o) e[k] = o[k];
    return e;
  }
  function buff(stat, v, turns, name) { return { k: 'buff', stat: stat, v: v, turns: turns, name: name || stat }; }
  function debuff(stat, v, turns, chance, name) {
    return { k: 'debuff', stat: stat, v: v, turns: turns, chance: chance == null ? 1 : chance, name: name || stat };
  }
  function stun(turns, chance, name) { return { k: 'stun', turns: turns, chance: chance == null ? 1 : chance, name: name || '眩晕' }; }
  function seal(tags, turns, chance, name) { return { k: 'seal', tags: tags, turns: turns, chance: chance == null ? 1 : chance, name: name || '封印' }; }
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
     一、补录功法
     ============================================================= */

  /* 三转重元功 —— 黄枫谷不传之秘，散功重修三次 */
  tech('sanzhuan', {
    name: '三转重元功', tier: 1, sub: 2, realm: 1, kind: '辅助', el: 'wood',
    lore: '散功重修三次，每一次都像死过一回。修成的人结丹时比旁人稳得多。',
    passive: [{ k: 'breakBonus', v: 0.06 }, { k: 'hp', v: 0.06 }],
    spells: [
      sp('sanzhuan_gui', {
        name: '三转归元', cost: { mp: 26 }, cd: 3, target: 'self', el: 'wood',
        effects: [heal(70), cleanse(), buff('def', 0.15, 2, '重元护体')]
      }),
      sp('sanzhuan_qi', {
        name: '重元一气', cost: { mp: 22 }, cd: 3, target: 'self', el: 'wood',
        effects: [buff('atk', 0.22, 3, '重元一气'), buff('manaRegen', 4, 3, '元气流转')]
      })
    ]
  });

  /* 太上忘情 —— 道门心法，斩因果，也斩自己 */
  tech('taishang', {
    name: '太上忘情', tier: 2, sub: 0, realm: 2, kind: '道门', el: 'soul',
    lore: '斩断私情因果，心不动则法不乱。修得深了，连自己是谁都记不清。',
    passive: [{ k: 'ctrlResist', v: 0.25 }, { k: 'soulDmg', v: 0.1 }],
    spells: [
      sp('taishang_zhan', {
        name: '忘情斩缘', cost: { mp: 40 }, cd: 3, target: 'enemy', el: 'soul',
        effects: [dmg(85, 'soul'), seal(['soul'], 1, 0.3, '断缘')]
      }),
      sp('taishang_shui', {
        name: '心如止水', cost: { mp: 34 }, cd: 4, target: 'self', el: 'soul',
        effects: [buff('ctrlResist', 0.6, 2, '止水'), cleanse()]
      })
    ]
  });

  /* 望月诀 —— 苍坤上人主修，载于淡蓝玉简 */
  tech('wangyue', {
    name: '望月诀', tier: 1, sub: 2, realm: 1, kind: '水系', el: 'water',
    lore: '苍坤上人留下的淡蓝玉简，只有月夜才看得清字。',
    passive: [{ k: 'waterDmg', v: 0.12 }, { k: 'manaRegen', v: 2 }],
    spells: [
      sp('wangyue_yin', {
        name: '望月引', cost: { mp: 24 }, cd: 1, target: 'enemy', el: 'water',
        effects: [dmg(62, 'water'), heal(18)]
      }),
      sp('wangyue_zhao', {
        name: '月华罩', cost: { mp: 28 }, cd: 3, target: 'self', el: 'water',
        effects: [shield(46, 2), buff('evade', 0.08, 2, '月影')]
      })
    ]
  });

  /* 炼神术 —— 仙狱里磨神魂的法子 */
  tech('lianshen', {
    name: '炼神术', tier: 2, sub: 1, realm: 2, kind: '神识', el: 'soul',
    lore: '一层一层淬神魂，像锻铁。修到第七层的人，神魂能离体三日不散。',
    passive: [{ k: 'soulDmg', v: 0.18 }, { k: 'ctrlHit', v: 0.08 }],
    spells: [
      sp('lianshen_ci', {
        name: '炼神刺', cost: { mp: 34 }, cd: 2, target: 'enemy', el: 'soul',
        effects: [dmg(88, 'soul'), stun(1, 0.22, '神魂震荡')]
      }),
      sp('lianshen_cui', {
        name: '神魂淬炼', cost: { mp: 30 }, cd: 4, target: 'self', el: 'soul',
        effects: [buff('soulDmg', 0.3, 3, '淬神'), buff('ctrlHit', 0.15, 3, '神凝')]
      })
    ]
  });

  /* 阴阳轮回诀 —— 青阳门人鬼合修 */
  tech('yinyang', {
    name: '阴阳轮回诀', tier: 1, sub: 2, realm: 1, kind: '鬼道', el: 'ghost',
    lore: '活人修阴气，死人借阳火。青阳门靠这个把鬼修和道修拴在一根绳上。',
    passive: [{ k: 'ghostDmg', v: 0.12 }, { k: 'lifesteal', v: 0.05 }],
    spells: [
      sp('yinyang_zhuan', {
        name: '阴阳倒转', cost: { mp: 26 }, cd: 2, target: 'enemy', el: 'ghost',
        effects: [dmg(55, 'ghost'), drain(28, 12)]
      }),
      sp('yinyang_yin', {
        name: '轮回印', cost: { mp: 30 }, cd: 3, target: 'enemy', el: 'ghost',
        effects: [dmg(40, 'ghost'), dot(14, 3, 'ghost', 1, '轮回印记'), debuff('def', -0.12, 3, 0.5, '阴蚀')]
      })
    ]
  });

  /* 魔银手 —— 墨大夫成名绝学，带寒毒 */
  tech('moyin', {
    name: '魔银手', tier: 0, sub: 2, realm: 0, kind: '武学', el: 'phys',
    lore: '墨大夫成名的那只手，掌心一层银皮，中了寒毒的人手指先黑。',
    passive: [{ k: 'atk', v: 0.05 }],
    spells: [
      sp('moyin_zhang', {
        name: '银手毒掌', cost: { stam: 10 }, cd: 1, target: 'enemy', el: 'phys',
        effects: [dmg(22), dot(6, 3, 'phys', 0.6, '寒毒')]
      })
    ]
  });

  /* 虫甲术 —— 借虫壳护身 */
  tech('chongjia', {
    name: '虫甲术', tier: 1, sub: 0, realm: 1, kind: '防御', el: 'wood',
    lore: '养一窝铁背虫，脱了壳贴在身上。远看像个人，近看像只虫。',
    passive: [{ k: 'def', v: 0.1 }, { k: 'hp', v: 0.06 }],
    spells: [
      sp('chongjia_fu', {
        name: '虫甲覆体', cost: { mp: 20 }, cd: 3, target: 'self', el: 'wood',
        effects: [shield(34, 2), thorns(9, 2)]
      })
    ]
  });

  /* 青阳魔火诀 —— 魔焰门看家火法 */
  tech('qingyang_mo', {
    name: '青阳魔火诀', tier: 2, sub: 0, realm: 2, kind: '魔道', el: 'fire',
    lore: '魔焰门的火不烧柴，烧的是修士的元气。扑不灭，只能等它自己烧完。',
    passive: [{ k: 'fireDmg', v: 0.15 }, { k: 'takeFire', v: -0.1 }],
    spells: [
      sp('qingyang_huo', {
        name: '青阳魔火', cost: { mp: 38 }, cd: 1, target: 'enemy', el: 'fire',
        effects: [dmg(92, 'fire'), dot(18, 2, 'fire', 0.8, '魔焰')]
      }),
      sp('qingyang_fen', {
        name: '魔焰焚天', cost: { mp: 52 }, cd: 4, target: 'enemyAll', el: 'fire',
        effects: [dmg(58, 'fire'), dot(10, 2, 'fire', 0.4, '余烬')]
      })
    ]
  });

  /* 蛰龙诀 —— 藏锋蓄势，一击定胜负 */
  tech('zhelong', {
    name: '蛰龙诀', tier: 2, sub: 1, realm: 2, kind: '剑修', el: 'metal', tag: 'sword',
    lore: '蛰伏时一动不动，出手只有一次。剑修里最不讲道理的一路。',
    passive: [{ k: 'swordDmg', v: 0.16 }, { k: 'crit', v: 0.05 }],
    spells: [
      sp('zhelong_fu', {
        name: '蛰龙伏渊', cost: { mp: 28 }, cd: 4, target: 'self', el: 'metal',
        effects: [buff('pierce', 0.25, 2, '伏渊'), buff('crit', 0.2, 2, '蓄势')]
      }),
      sp('zhelong_chu', {
        name: '蛰龙出海', cost: { mp: 44 }, cd: 2, target: 'enemy', el: 'metal', tag: 'sword',
        effects: [dmg(120, 'metal', { pierce: 0.35 })]
      })
    ]
  });

  /* 万木回春诀 —— 木系续航 */
  tech('wanmu', {
    name: '万木回春诀', tier: 1, sub: 1, realm: 1, kind: '木系', el: 'wood',
    lore: '山林里坐三年，把一身的生机都跟草木连起来。',
    passive: [{ k: 'woodDmg', v: 0.1 }, { k: 'healBonus', v: 0.15 }],
    spells: [
      sp('wanmu_chun', {
        name: '回春', cost: { mp: 22 }, cd: 2, target: 'self', el: 'wood',
        effects: [heal(46), hot(9, 2, '生机')]
      }),
      sp('wanmu_jia', {
        name: '万木甲', cost: { mp: 30 }, cd: 3, target: 'self', el: 'wood',
        effects: [shield(42, 3), buff('def', 0.12, 3, '木甲')]
      })
    ]
  });

  /* =============================================================
     二、法宝图录（百宝阁货架 · 拍卖行备选）
     grade 1 凡品 / 2 灵品 / 3 宝品 / 4 古宝
     ============================================================= */
  var TREASURE_BOOK = [
    { id: 'qingfu', name: '青蚨符', grade: 1, price: 120, pct: { manaRegen: 1 },
      desc: '每回合法力 +1', lore: '青蚨生子，母血涂钱，花出去还回来。散修最爱的符。' },
    { id: 'tieyu', name: '铁羽袍', grade: 1, price: 260, pct: { def: 0.08 },
      desc: '防御 +8%', lore: '妖兽铁羽织的袍子，轻得像没穿。' },
    { id: 'shixiong', name: '石熊胆', grade: 1, price: 320, pct: { hp: 0.08 },
      desc: '气血 +8%', lore: '石熊胆泡在酒里，喝了抗打。' },
    { id: 'liuyun', name: '流云靴', grade: 1, price: 380, pct: { spd: 0.1 },
      desc: '先手 +10%', lore: '踏云而行，跑得快的人先活下来。' },
    { id: 'hanyu', name: '寒玉佩', grade: 2, price: 900, pct: { iceDmg: 0.15, takeFire: -0.1 },
      desc: '冰系伤害 +15%，受火伤 -10%', lore: '寒玉贴身戴，血都是凉的。' },
    { id: 'huolei', name: '火雷珠', grade: 2, price: 1100, pct: { fireDmg: 0.15, thunderDmg: 0.1 },
      desc: '火系 +15%，雷系 +10%', lore: '一掌拍出去，珠子先炸。' },
    { id: 'guimu', name: '鬼木杖', grade: 2, price: 1250, pct: { ghostDmg: 0.18 },
      desc: '阴系伤害 +18%', lore: '坟头长出来的枣木，阴气重，握久了手发凉。' },
    { id: 'qingzhu', name: '青竹蜂云剑', grade: 2, price: 1400, pct: { swordDmg: 0.18, crit: 0.04 },
      desc: '剑系 +18%，暴击 +4%', lore: '竹节里养着七十二口飞针。' },
    { id: 'yulou', name: '白玉葫芦', grade: 2, price: 1600, pct: { manaRegen: 3, healBonus: 0.15 },
      desc: '每回合法力 +3，疗伤 +15%', lore: '葫芦里养着一缕灵泉。' },
    { id: 'xuantie_d', name: '玄铁盾', grade: 2, price: 1750, pct: { take: 0.1, def: 0.1 },
      desc: '减伤 10%，防御 +10%', lore: '凡铁反复淬炼，挡得住寻常飞剑。' },
    { id: 'yinguang', name: '阴光镜', grade: 3, price: 4200, pct: { soulDmg: 0.18, ctrlHit: 0.1 },
      desc: '神魂伤害 +18%，控制命中 +10%', lore: '镜面照不出人，只照得出魂。' },
    { id: 'zidian', name: '紫电锤', grade: 3, price: 4800, pct: { thunderDmg: 0.24, atk: 0.06 },
      desc: '雷系 +24%，攻击 +6%', lore: '锤身上缠着几缕没散的电光。' },
    { id: 'xuepao', name: '血玉袍', grade: 3, price: 5200, pct: { bloodDmg: 0.2, lifesteal: 0.06 },
      desc: '血系 +20%，吸血 +6%', lore: '袍子会自己吸人血，颜色越来越深。' },
    { id: 'qingzhu_d', name: '青竹剑匣', grade: 3, price: 5600, pct: { swordDmg: 0.22, pierce: 0.12 },
      desc: '剑系 +22%，穿透 +12%', lore: '匣中十八口飞剑，开匣即是剑雨。' },
    { id: 'luocha', name: '罗刹幡', grade: 3, price: 6000, pct: { ghostDmg: 0.22, takeHoly: 0.12 },
      desc: '阴系 +22%，受正气伤 +12%', lore: '幡上画着三个没脸的人。' },
    { id: 'moyan', name: '魔焰幡', grade: 3, price: 6400, pct: { fireDmg: 0.22, dmg: 0.05 },
      desc: '火系 +22%，全伤害 +5%', lore: '魔焰门炼的，火种养在幡里。' },
    { id: 'xutian_d', name: '虚天鼎', grade: 4, price: 12000, pct: { dmg: 0.1, hp: 0.1, take: 0.06 },
      desc: '全伤害 +10%，气血 +10%，减伤 6%', lore: '上古遗物，鼎身刻满看不懂的字。' },
    { id: 'chixiao', name: '赤霄剑', grade: 4, price: 15000, pct: { swordDmg: 0.3, crit: 0.1 },
      desc: '剑系 +30%，暴击 +10%', lore: '剑成之时天有赤气，故名。' },
    { id: 'hunhe', name: '魂盒', grade: 4, price: 18000, pct: { soulDmg: 0.3, ctrlResist: 0.2 },
      desc: '神魂 +30%，控制抗性 +20%', lore: '盒里装着别人的半条命。' },
    { id: 'wangui', name: '万鬼珠', grade: 4, price: 22000, pct: { ghostDmg: 0.32, hp: 0.08, takeHoly: 0.15 },
      desc: '阴系 +32%，气血 +8%，受正气伤 +15%', lore: '一颗珠子里缩着上万只鬼。' }
  ];

  /* =============================================================
     三、镇派功法：每宗只有一两门，非真传不传
     ============================================================= */
  var SIGNATURE = {
    huangfeng: [
      { tech: 'qingyuan1', rank: 2, note: '青元剑诀前六层，剑堂真传方能领' },
      { tech: 'qingyuan2', rank: 2, note: '青元剑诀七至九层，非真传不传' },
      { tech: 'sanzhuan', rank: 2, note: '三转重元功，散功重修三次，掌门亲授' }
    ],
    guiling: [
      { tech: 'xuelian', rank: 2, note: '血灵大法，血堂真传' },
      { tech: 'xuanyin', rank: 2, note: '玄阴经，鬼灵门镇门之宝' },
      { tech: 'xuanyin_dafa', rank: 3, note: '玄阴大法，长老以上才见得到' }
    ]
  };

  /* 各宗「只此一家」的气质描述，用于宗门面板 */
  var SECT_STYLE = {
    huangfeng: { motto: '剑在人在，剑断人亡。', give: '剑堂弟子每战多得一份剑意' },
    guiling: { motto: '活着的人，才配谈道。', give: '血堂弟子杀敌后可夺其精血' }
  };

  if (TECHS && SPELLS) {
    D.TREASURE_BOOK = TREASURE_BOOK;
    D.SIGNATURE = SIGNATURE;
    D.SECT_STYLE = SECT_STYLE;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
