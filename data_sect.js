/* =============================================================
   宗门：黄枫谷（正道） / 鬼灵门（魔道）
   ============================================================= */
(function (g) {
  'use strict';
  var D = g.WORLD_DATA;

  var RANKS = [
    { name: '外门弟子', need: 0, pay: 20 },
    { name: '内门弟子', need: 80, pay: 50 },
    { name: '真传弟子', need: 240, pay: 100 },
    { name: '执事', need: 600, pay: 180 },
    { name: '长老', need: 1200, pay: 300 }
  ];

  var COST = { 0: 30, 1: 60, 2: 150, 3: 400, 4: 900, 5: 1500 };

  var SECTS = {
    huangfeng: {
      id: 'huangfeng', name: '黄枫谷', loc: 'huangfeng', align: 'righteous',
      desc: '越国七派之一。剑修与丹修并重，山门外的石阶上常年坐着等消息的散修。',
      ranks: RANKS,
      factions: [
        { id: 'jian', name: '剑堂', perk: '剑系伤害 +8%', desc: '主战，主张对魔道用剑说话。' },
        { id: 'dan', name: '丹堂', perk: '丹药半价 · 疗伤 +10%', desc: '主和，靠丹药和人情维系山门。' }
      ],
      library: [
        { rank: 0, techs: ['changchun', 'zhengyang', 'zhayan', 'guiyuan', 'yinqi'] },
        { rank: 1, techs: ['taibai', 'yudan', 'ningyuan2', 'haoran'] },
        { rank: 2, techs: ['dayan2', 'jinzhen', 'tianluo', 'qianlang'] },
        { rank: 3, techs: ['qingyuan3', 'dayan3', 'mingwang', 'sanfan'] },
        { rank: 4, techs: ['yuanci', 'kunxian', 'tongbao'] }
      ],
      tasks: [
        { id: 'hf_herb', name: '采药', desc: '交三株灵草给药圃', need: { herb: 3 }, contribution: 30, stones: 30, days: 10 },
        { id: 'hf_beast', name: '清剿妖兽', desc: '后山有妖兽伤人', battle: { realm: 0 }, contribution: 55, stones: 40, days: 6 },
        { id: 'hf_patrol', name: '巡山', desc: '沿山门走一圈，看看有没有外人', contribution: 25, stones: 20, days: 5 },
        { id: 'hf_guard', name: '护送', desc: '护送药队去嘉元城', contribution: 45, stones: 70, days: 12 }
      ]
    },
    modao: {
      id: 'modao', name: '鬼灵门', loc: 'modao', align: 'demonic',
      desc: '天南魔道的一处暗桩。入门容易，活着升上去难。',
      ranks: RANKS,
      factions: [
        { id: 'xue', name: '血堂', perk: '吸血 +6%', desc: '以杀养功，战力最凶。' },
        { id: 'hun', name: '魂堂', perk: '神魂伤害 +10%', desc: '炼魂养鬼，擅长阴人。' }
      ],
      library: [
        { rank: 0, techs: ['xuejian', 'qigui', 'konshen', 'guixi'] },
        { rank: 1, techs: ['yousha', 'xuelian', 'qisha', 'chanyu', 'lingwen'] },
        { rank: 2, techs: ['xuanyin', 'kuishui', 'sisha', 'fenghun'] },
        { rank: 3, techs: ['xuanyin2', 'tuotian', 'liuji', 'minghe'] },
        { rank: 4, techs: ['xueling', 'dianfeng', 'xuanpin'] }
      ],
      tasks: [
        { id: 'md_blood', name: '取血', desc: '带一具妖兽尸首回来', need: { pelt: 2 }, contribution: 30, stones: 25, days: 8 },
        { id: 'md_kill', name: '杀人', desc: '据点外有个不长眼的散修', battle: { realm: 0, human: true }, contribution: 60, stones: 50, days: 5 },
        { id: 'md_guard', name: '护法', desc: '给一位魔修护法三日', contribution: 35, stones: 40, days: 3 },
        { id: 'md_raid', name: '劫道', desc: '去溪谷劫一队商旅', contribution: 50, stones: 80, days: 9 }
      ]
    }
  };

  D.SECTS = SECTS;
  D.SECT_RANKS = RANKS;
  D.SECT_COST = COST;
})(typeof globalThis !== 'undefined' ? globalThis : this);
