/* =============================================================
   洞府 · 飞行法器 · 悬赏（v17）
   ============================================================= */
(function (g) {
  'use strict';
  var D = g.WORLD_DATA;

  /* ---------------- 洞府 ---------------- */
  var CAVE_TIERS = [
    {
      id: 'dongfu', name: '洞府', cost: 300, step: 2, rooms: 2, upkeep: 25,
      desc: '依山凿的一间石室，一扇石门，一口井。够一个人打坐到天亮。'
    },
    {
      id: 'lingfu', name: '灵府', cost: 2600, step: 12, rooms: 4, upkeep: 120,
      desc: '引了一条支脉进府，石壁上能看见细细的灵光。可以分几间用。'
    },
    {
      id: 'dongtian', name: '洞天', cost: 16000, step: 16, rooms: 6, upkeep: 420,
      desc: '自成一方小天地，云在半空里走。天南没几个人有这种东西。'
    }
  ];

  /* 房间：lv 从 1 起，cost 是升级到该级的灵石 */
  var CAVE_ROOMS = {
    lingtian: {
      id: 'lingtian', name: '灵田', max: 3, base: 180,
      desc: '一畦能种灵草的田。每年收一茬，年份越久，草越好。',
      each: '每年收 3 株灵草（每级 +3）'
    },
    danfang: {
      id: 'danfang', name: '丹房', max: 3, base: 420,
      desc: '丹炉、地火口、一排晾药的架子。在这儿炼丹不容易炸炉。',
      each: '炼丹成功率 +12%（每级），成丹 +1'
    },
    qifang: {
      id: 'qifang', name: '器坊', max: 3, base: 420,
      desc: '铁砧、淬火池、一整套刻阵的家伙。法宝在这儿炼得更好。',
      each: '炼器成功率 +12%（每级），法宝品质更高'
    },
    juling: {
      id: 'juling', name: '聚灵阵', max: 3, base: 640,
      desc: '把方圆十里的灵气往这一间屋子里拽。在府里修炼快得多。',
      each: '府中修炼收益 +15%（每级）'
    },
    lingquan: {
      id: 'lingquan', name: '灵泉', max: 3, base: 520,
      desc: '泉眼里冒的是带灵气的水。喝一口回法力，剩下的能换灵石。',
      each: '每年产 60 灵石（每级 +60），战斗中回法力 +5%'
    },
    muren: {
      id: 'muren', name: '木人桩', max: 1, base: 150,
      desc: '一根裹着铁皮的木桩，刻了测伤的阵纹。打它伤不了自己，能看见每一击的数字。',
      each: '可以和木人桩试招，测伤害'
    }
  };

  var ROOM_ORDER = ['lingtian', 'juling', 'lingquan', 'danfang', 'qifang', 'muren'];

  function roomUpCost(roomId, lv) {
    var r = CAVE_ROOMS[roomId];
    return Math.round(r.base * Math.pow(2.1, lv - 1));
  }

  /* ---------------- 飞行法器 ---------------- */
  var FLY = [
    { id: 'qingye', name: '青叶舟', grade: 0, price: 800, mul: 0.78, need: 0,
      desc: '一片青叶化的舟，坐上去像坐在风里。比走路快一点，胜在便宜。' },
    { id: 'baihe', name: '白鹤羽', grade: 1, price: 4200, mul: 0.60, need: 1,
      desc: '一支三丈长的白羽，御起来无声。筑基修士的体面。' },
    { id: 'bibo', name: '碧波帆', grade: 2, price: 19000, mul: 0.44, need: 2,
      desc: '碧色帆船，能载三四人，破开罡风像破开水面。' },
    { id: 'fentian', name: '焚天梭', grade: 3, price: 68000, mul: 0.30, need: 3,
      desc: '一梭金光，日行万里。据说原是乱星海星宫的巡海之物。' }
  ];

  /* ---------------- 悬赏 ---------------- */
  /* kind: beast 打妖兽 / hunt 找修士 / gather 交材料 / guard 护送 */
  var BOUNTY_KINDS = {
    beast: { name: '妖兽悬赏', minTier: 0 },
    hunt: { name: '缉拿', minTier: 1 },
    gather: { name: '采办', minTier: 0 },
    guard: { name: '押运', minTier: 0 }
  };

  var BOUNTY_NAMES = {
    beast: ['妖狼', '铁背妖猿', '食腐乌鸦', '地穴蜈蚣', '赤目山魈', '黑鳞蟒', '双头豺'],
    hunt: ['一个姓周的散修', '鬼灵门的采血人', '偷灵田的贼', '杀过三人的刀客', '拐人的马贩'],
    gather: ['三株回春草', '两块灵石矿', '一具完整妖皮', '七叶莲的根', '一块古修残片'],
    guard: ['药队去嘉元城', '商队走溪谷', '把货送到太南小会', '送一位重伤的师兄回山']
  };

  /* 百宝阁：飞行法器 + 法宝成品 + 高档丹药 */
  var BAIGE_MARKUP = 1.15;

  D.CAVE_TIERS = CAVE_TIERS;
  D.CAVE_ROOMS = CAVE_ROOMS;
  D.ROOM_ORDER = ROOM_ORDER;
  D.roomUpCost = roomUpCost;
  D.FLY = FLY;
  D.BOUNTY_KINDS = BOUNTY_KINDS;
  D.BOUNTY_NAMES = BOUNTY_NAMES;
  D.BAIGE_MARKUP = BAIGE_MARKUP;
})(typeof globalThis !== 'undefined' ? globalThis : this);
