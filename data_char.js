/* =============================================================
   开局、境界、关卡数据
   ============================================================= */
(function (g) {
  'use strict';

  var fx = g.fx;
  var dmg = fx.dmg, dot = fx.dot, buff = fx.buff, debuff = fx.debuff,
      stun = fx.stun, seal = fx.seal, shield = fx.shield, heal = fx.heal,
      hot = fx.hot, thorns = fx.thorns, mana = fx.mana;

  /* ---------------- 境界 ---------------- */
  var REALMS = [
    { id: 0, name: '炼气期', stage: '引气入体', hp: 320, atk: 100, def: 18, spd: 100, mana: 140,
      note: '刚摸到修仙的门槛，一身凡骨未脱。' },
    { id: 1, name: '筑基期', stage: '灵根初成', hp: 700, atk: 122, def: 38, spd: 110, mana: 260,
      note: '灵气成液，丹田筑起道基。' },
    { id: 2, name: '结丹期', stage: '金丹凝形', hp: 1500, atk: 152, def: 68, spd: 120, mana: 420,
      note: '一粒金丹吞入腹，我命由我不由天。' },
    { id: 3, name: '元婴期', stage: '元婴出窍', hp: 3000, atk: 190, def: 105, spd: 132, mana: 620,
      note: '元婴坐于紫府，神游千里。' },
    { id: 4, name: '化神期', stage: '神游太虚', hp: 5600, atk: 240, def: 150, spd: 145, mana: 850,
      note: '人界之巅，再往上便是传说中的仙界。' }
  ];

  /* ---------------- 灵根 ---------------- */
  var ROOTS = [
    { id: 'tian', name: '天灵根', weight: 3, els: ['fire'], desc: '单一火属性天灵根，万中无一，修炼一日千里。' },
    { id: 'shuang', name: '双灵根', weight: 12, els: ['water', 'wood'], desc: '水木双灵根，资质上佳，可兼修两系法术。' },
    { id: 'san', name: '三灵根', weight: 27, els: ['metal', 'water', 'earth'], desc: '金水土三灵根，中人之姿，胜在驳杂能用。' },
    { id: 'si', name: '四灵根', weight: 28, els: ['fire', 'wood', 'earth', 'metal'], desc: '四灵根，杂而不纯，修行事倍功半。' },
    { id: 'wu', name: '五灵根', weight: 20, els: ['fire', 'water', 'wood', 'earth', 'metal'], desc: '五行俱全的伪灵根，最是常见，也最是难出头。' },
    { id: 'lei', name: '雷灵根', weight: 3, els: ['thunder'], desc: '变异雷灵根，天生克邪，雷法威力倍增。' },
    { id: 'bing', name: '冰灵根', weight: 4, els: ['ice'], desc: '变异冰灵根，心性冷冽，冰法天成。' },
    { id: 'an', name: '暗灵根', weight: 3, els: ['ghost'], desc: '变异暗灵根，与阴鬼之道天然亲近。' }
  ];

  /* 灵根加成：本命属性 +15%（天灵根 +28%），其余属性 +3% */
  function rootPct(root) {
    var pct = {};
    var own = root.els.length === 1 ? 0.28 : (root.els.length === 2 ? 0.16 : 0.07);
    ['fire', 'water', 'wood', 'earth', 'metal', 'ice', 'thunder', 'wind', 'ghost', 'soul', 'blood', 'phys'].forEach(function (el) {
      if (root.els.indexOf(el) >= 0) pct[el + 'Dmg'] = own;
      else if (root.els.length < 4) pct[el + 'Dmg'] = 0.03;
    });
    if (root.els.length === 1) pct.mana = 0.1;
    if (root.els.length >= 4) pct.hp = 0.05;
    return pct;
  }

  /* ---------------- 出身 ---------------- */
  var IDENTITIES = [
    {
      id: 'qixuan', name: '七玄门弟子', tag: '凡俗武门',
      desc: '神手谷出来的记名弟子，学的是凡俗武功，却有一副好筋骨。',
      techs: ['zhengyang', 'zhayan', 'xiangjia', 'luoyan', 'changchun', 'guixi'],
      pct: { hp: 0.05, atk: 0.02 }
    },
    {
      id: 'huangfeng', name: '黄枫谷弟子', tag: '越国七派',
      desc: '七派之一的黄枫谷外门弟子，长春功是入门功课。',
      techs: ['changchun', 'yinqi', 'guiyuan', 'ningyuan', 'qingyuan1', 'lianqi'],
      pct: { mana: 0.1 }
    },
    {
      id: 'shijia', name: '世家子弟', tag: '地方豪族',
      desc: '家中世代经营法器铺子，自幼拿剑当玩具，底子比散修厚。',
      techs: ['taibai', 'jinlian', 'qianlang', 'yudan', 'qingyuan1', 'huanling'],
      pct: { crit: 0.06, mana: 0.05 }
    },
    {
      id: 'sanxiu', name: '山野散修', tag: '无门无派',
      desc: '在乱葬岗捡过半本残卷，功法杂，但路子野。',
      techs: null, random: 4, pct: { spd: 0.04, hp: 0.03 }
    },
    {
      id: 'modao', name: '魔道散修', tag: '魔道',
      desc: '沾过血的手，练的是速成魔功。快，但反噬也快。',
      techs: ['qigui', 'xuejian', 'xuelian', 'qisha', 'xueying', 'yousha'],
      pct: { atk: 0.08, hp: -0.05, lifesteal: 0.03 }
    },
    {
      id: 'guidao', name: '鬼道传人', tag: '鬼修',
      desc: '师父是个养鬼的老道，临终只留下一句话：莫让人知道你的底。',
      techs: ['yousha', 'konshen', 'chanyu', 'lingwen', 'xuejian', 'huanling'],
      pct: { ghostDmg: 0.1, evade: 0.03 }
    },
    {
      id: 'yaonong', name: '药农之子', tag: '山民',
      desc: '从小在药圃里长大，识得百草，也懂得怎么让自己活久一点。',
      techs: ['changchun', 'qingling', 'huachun', 'yudan', 'guiyuan', 'lingwen'],
      pct: { healBonus: 0.2, hp: 0.04 }
    },
    {
      id: 'shusheng', name: '落魄书生', tag: '儒门',
      desc: '屡试不第，倒在一卷《浩然正气篇》里读出了炼气的门道。',
      techs: ['haoran', 'dayan1', 'huanxing', 'lianxi', 'tianluo', 'taibai'],
      pct: { soulDmg: 0.1, mana: 0.08 }
    },
    {
      id: 'junwu', name: '军伍出身', tag: '边军',
      desc: '在边关杀过妖，皮糙肉厚，最不怕的就是挨打。',
      techs: ['bawangjia', 'xiangjia', 'zhengyang', 'luoyan', 'zhayan', 'guixi'],
      pct: { hp: 0.12, def: 0.06, spd: -0.05 }
    },
    {
      id: 'yaozu', name: '妖族遗孤', tag: '半妖',
      desc: '母亲是山里的妖，父亲是个人。两边都不认你，但你跑得比谁都快。',
      techs: ['xueying', 'yousha', 'jifeng', 'guixi', 'shayao', 'huanxing'],
      pct: { spd: 0.09, hp: 0.03 }
    }
  ];

  /* ---------------- 特质 ---------------- */
  var TRAITS = {
    good: [
      { id: 'lingti', name: '天生灵体', desc: '气血比常人厚实。', pct: { hp: 0.12 } },
      { id: 'jiangu', name: '剑骨天成', desc: '剑系法术伤害 +18%。', pct: { swordDmg: 0.18 } },
      { id: 'shenshi', name: '神识敏锐', desc: '神魂伤害 +15%，控制更易命中。', pct: { soulDmg: 0.15, ctrlHit: 0.1 } },
      { id: 'zhishui', name: '心如止水', desc: '对控制的抵抗 +25%。', pct: { ctrlResist: 0.25 } },
      { id: 'guomu', name: '过目不忘', desc: '法力上限 +15%。', pct: { mana: 0.15 } },
      { id: 'tixiu', name: '体修底子', desc: '气血 +10%，防御 +12%。', pct: { hp: 0.1, def: 0.12 } },
      { id: 'xuemai', name: '血脉觉醒', desc: '所有伤害 +8%。', pct: { dmg: 0.08 } },
      { id: 'qiyun', name: '气运加身', desc: '暴击率 +10%。', pct: { crit: 0.1 } },
      { id: 'yidao', name: '医道通神', desc: '治疗与回血效果 +30%。', pct: { healBonus: 0.3 } },
      { id: 'ercong', name: '耳聪目明', desc: '闪避 +8%，命中 +8%。', pct: { evade: 0.08, hit: 0.08 } },
      { id: 'caibo', name: '财帛丰厚', desc: '开局多带 200 灵石。', pct: {}, stones: 200 }
    ],
    bad: [
      { id: 'baza', name: '灵根驳杂', desc: '法力上限 -15%。', pct: { mana: -0.15 } },
      { id: 'jingmai', name: '经脉有损', desc: '气血上限 -10%。', pct: { hp: -0.1 } },
      { id: 'xinmo', name: '心魔缠身', desc: '每回合流失 0.8% 气血。', pct: { hpUpkeep: -0.008 } },
      { id: 'tiruo', name: '体弱多病', desc: '气血 -12%，防御 -15%。', pct: { hp: -0.12, def: -0.15 } },
      { id: 'xinji', name: '心急气躁', desc: '先手 +10%，防御 -10%。', pct: { spd: 0.1, def: -0.1 } },
      { id: 'tanshi', name: '天生煞星', desc: '治疗效果 -40%。', pct: { healBonus: -0.4 } },
      { id: 'mingtu', name: '命途多舛', desc: '暴击 -6%，先手 -5%。', pct: { crit: -0.06, spd: -0.05 } },
      { id: 'shudi', name: '树敌太多', desc: '受到的伤害 +8%。', pct: { take: -0.08 } },
      { id: 'hunpo', name: '神魂不稳', desc: '对控制的抵抗 -20%。', pct: { ctrlResist: -0.2 } },
      { id: 'jingmai2', name: '经脉滞涩', desc: '先手 -10%，法力上限 -8%。', pct: { spd: -0.1, mana: -0.08 } },
      { id: 'xinci', name: '心慈手软', desc: '所有伤害 -6%。', pct: { dmg: -0.06 } }
    ]
  };

  /* ---------------- 关卡 ---------------- */
  function es(name, cd, target, effects) {
    return { name: name, cd: cd, target: target, effects: effects };
  }

  var ENCOUNTERS = [
    {
      id: 'w1', name: '乱葬岗', title: '第一关 · 乱葬岗',
      realm: 0, row: 1,
      intro: '腐土翻起，三头灰背野狼从坟包后踱出来，眼睛里泛着饿极了的绿光。',
      enemies: [
        { name: '灰背野狼', row: 'front', faction: 'beast', hp: 0.17, atk: 0.36, def: 0.5, spd: 0.95,
          spells: [
            es('撕咬', 0, 'enemy', [dmg(30)]),
            es('扑击', 2, 'enemy', [dmg(20), dot(6, 2, 'phys', 1, '撕裂')])
          ] },
        { name: '灰背野狼', row: 'front', faction: 'beast', hp: 0.17, atk: 0.36, def: 0.5, spd: 0.95,
          spells: [
            es('撕咬', 0, 'enemy', [dmg(30)]),
            es('扑击', 2, 'enemy', [dmg(20), dot(6, 2, 'phys', 1, '撕裂')])
          ] },
        { name: '独眼头狼', row: 'back', faction: 'beast', hp: 0.21, atk: 0.39, def: 0.6, spd: 1.0,
          spells: [
            es('狼嚎', 3, 'self', [buff('atk', 0.25, 3, '狼嚎')]),
            es('血口', 2, 'enemy', [dmg(28), dot(8, 2, 'blood', 1, '流血')])
          ] }
      ]
    },
    {
      id: 'w2', name: '溪谷截杀', title: '第二关 · 溪谷截杀',
      realm: 1, row: 2,
      intro: '溪水声里夹着两道剑气。两个散修一前一后堵住谷口，还有一具铁傀儡压阵。',
      enemies: [
        { name: '瘦高散修', row: 'front', faction: 'human', hp: 0.22, atk: 0.45, def: 0.9, spd: 1.02,
          spells: [
            es('飞剑', 0, 'enemy', [dmg(42, 'metal')]),
            es('流沙术', 2, 'enemy', [debuff('spd', -0.25, 2, 1, '流沙'), dmg(18, 'earth')])
          ] },
        { name: '铁面傀儡', row: 'front', faction: 'puppet', hp: 0.19, atk: 0.28, def: 1.7, spd: 0.7,
          spells: [
            es('铁臂横扫', 0, 'enemy', [dmg(34)], null),
            es('硬化', 3, 'self', [buff('def', 0.3, 3, '铁甲'), shield(40, 3)])
          ] },
        { name: '矮胖散修', row: 'back', faction: 'human', hp: 0.19, atk: 0.40, def: 0.8, spd: 0.92,
          spells: [
            es('火弹术', 0, 'enemy', [dmg(38, 'fire'), dot(8, 2, 'fire', 0.3, '灼烧')]),
            es('御风诀', 2, 'enemy', [dmg(34, 'wind')])
          ] }
      ]
    },
    {
      id: 'w3', name: '古洞守灵', title: '第三关 · 古洞守灵',
      realm: 2, row: 3,
      intro: '洞开的古墓里没有棺，只有一具三丈高的守灵傀儡，和两缕从壁画里渗出来的阴魂。',
      enemies: [
        { name: '守灵傀儡', row: 'front', faction: 'puppet', hp: 0.21, atk: 0.34, def: 1.2, spd: 0.85,
          spells: [
            es('镇魂印', 3, 'enemy', [dmg(60, 'earth'), stun(1, 0.3, '镇魂')]),
            es('灵光护体', 5, 'self', [shield(60, 3)]),
            es('石拳', 0, 'enemy', [dmg(55)])
          ] },
        { name: '壁画阴魂', row: 'back', faction: 'ghost', hp: 0.08, atk: 0.28, def: 0.4, spd: 1.05,
          spells: [
            es('阴风', 0, 'enemy', [dmg(40, 'ghost'), dot(8, 3, 'ghost', 1, '阴毒')]),
            es('附体', 4, 'enemy', [seal(['soul'], 2, 0.8, '附体')])
          ] },
        { name: '壁画阴魂', row: 'back', faction: 'ghost', hp: 0.08, atk: 0.28, def: 0.4, spd: 1.05,
          spells: [
            es('阴风', 0, 'enemy', [dmg(40, 'ghost'), dot(8, 3, 'ghost', 1, '阴毒')]),
            es('鬼哭', 4, 'enemy', [debuff('atk', -0.2, 2, 0.8, '鬼哭')])
          ] }
      ]
    },
    {
      id: 'w4', name: '血袍魔修', title: '第四关 · 血袍魔修',
      realm: 3, row: 4,
      intro: '血袍拖过山道，留下两道湿痕。两名魔修与一具血傀儡拦在路上——他们等的就是落单的结丹修士。',
      enemies: [
        { name: '血袍魔修', row: 'front', faction: 'demon', hp: 0.18, atk: 0.47, def: 0.9, spd: 1.0,
          spells: [
            es('血刃', 0, 'enemy', [dmg(80, 'blood'), dot(18, 2, 'blood', 1, '血毒')]),
            es('血光遁', 5, 'self', [heal(70), buff('evade', 0.2, 2, '血光')])
          ] },
        { name: '血傀儡', row: 'front', faction: 'puppet', hp: 0.14, atk: 0.29, def: 1.25, spd: 0.8,
          spells: [
            es('血爆', 3, 'enemy', [dmg(70, 'blood')]),
            es('自愈', 5, 'self', [heal(60)])
          ] },
        { name: '披发魔女', row: 'back', faction: 'demon', hp: 0.13, atk: 0.48, def: 0.8, spd: 1.08,
          spells: [
            es('阴魔斩', 0, 'enemy', [dmg(90, 'ghost', { pierce: 0.3 })]),
            es('摄魂', 4, 'enemy', [stun(1, 0.55, '摄魂')]),
            es('玄阴魔气', 5, 'enemy', [dmg(60, 'ghost'), debuff('def', -0.2, 2, 1, '阴蚀')])
          ] }
      ]
    },
    {
      id: 'w5', name: '化神老怪', title: '第五关 · 化神老怪',
      realm: 4, row: 5,
      intro: '云层压得极低。那名老怪盘坐在虚空里，脚下两名护法垂手而立，看你的眼神像在看一件器物。',
      enemies: [
        { name: '青袍老怪', row: 'back', faction: 'human', hp: 0.17, atk: 0.66, def: 1.05, spd: 1.1,
          spells: [
            es('大庚剑阵', 5, 'enemy', [dmg(180, 'metal'), dot(45, 3, 'metal', 1, '剑丝')]),
            es('青元诛魔剑', 4, 'enemy', [dmg(300, 'metal', { pierce: 0.5 })]),
            es('元磁吸力', 3, 'enemy', [dmg(90, 'metal'), debuff('def', -0.3, 2, 1, '卸甲')]),
            es('元婴护体', 7, 'self', [shield(380, 3), heal(120)])
          ] },
        { name: '护法甲', row: 'front', faction: 'human', hp: 0.075, atk: 0.44, def: 1.0, spd: 0.95,
          spells: [
            es('巨剑术', 0, 'enemy', [dmg(120, 'metal')]),
            es('护体剑盾', 4, 'self', [shield(180, 2), thorns(30, 2)])
          ] },
        { name: '护法乙', row: 'front', faction: 'human', hp: 0.075, atk: 0.44, def: 1.0, spd: 0.95,
          spells: [
            es('金锋斩', 0, 'enemy', [dmg(110, 'metal', { pierce: 0.2 })]),
            es('剑影分光', 3, 'enemy', [dmg(60, 'metal', { hits: 3, random: true })])
          ] }
      ]
    }
  ];

  g.REALMS = REALMS;
  g.ROOTS = ROOTS;
  g.rootPct = rootPct;
  g.IDENTITIES = IDENTITIES;
  g.TRAITS = TRAITS;
  g.ENCOUNTERS = ENCOUNTERS;
})(typeof globalThis !== 'undefined' ? globalThis : this);
