/* =============================================================
   人界 · 地图扩展（v17）
   天南 / 乱星海 / 大晋 / 极西之地 / 慕兰草原
   每个区域各自一套百分比坐标，UI 按区域切换显示
   ============================================================= */
(function (g) {
  'use strict';
  var D = g.WORLD_DATA;

  var REGIONS = [
    { id: 'tiannan', name: '天南', sub: '越国 · 元武 · 天罗 · 九国盟', note: '九国盟与魔道六宗对峙之地，灵气中等，人多。' },
    { id: 'luanxing', name: '乱星海', sub: '星宫 · 碧灵岛 · 鬼雾海', note: '海外群岛，一天能遇上十种人，九种想要你的命。' },
    { id: 'dajin', name: '大晋', sub: '太一门 · 昆吾山 · 落日之森', note: '人界第一大修仙国，宗门如林，规矩比天南多十倍。' },
    { id: 'jixi', name: '极西之地', sub: '千竹教 · 强风沙漠', note: '风沙刮三千里，灵脉稀薄，唯佛门与苦修者能久居。' },
    { id: 'mulan', name: '慕兰草原', sub: '慕兰族 · 铁壁城', note: '草原上有自己的规矩，外来修士一律先当贼看。' }
  ];

  /* 原有 16 处补上 region 字段（天南） */
  (D.LOCATIONS || []).forEach(function (l) { l.region = l.region || 'tiannan'; });

  var EXTRA = [
    /* ---------------- 天南 ---------------- */
    {
      id: 'yuejing', name: '越京', region: 'tiannan', x: 43, y: 25, tier: 0, realmRec: 2, kind: '都城',
      desc: '越国都城。城墙上有修士巡视，坊市分三层，最上一层只有筑基以上才进得去。',
      features: ['market', 'inn', 'meditate', 'auction', 'baibao'],
      crowd: [['zhuji', 3], ['lianqi', 2], ['jindan', 1], ['shi', 1]]
    },
    {
      id: 'yuanwu', name: '元武国', region: 'tiannan', x: 72, y: 30, tier: 0, realmRec: 2, kind: '国',
      desc: '与越国隔着一道山脉。元武国人尚武，街上卖的符箓比丹药多。',
      features: ['market', 'inn', 'meditate', 'baibao'],
      crowd: [['zhuji', 2], ['lianqi', 3], ['shi', 2]]
    },
    {
      id: 'tianluo', name: '天罗国', region: 'tiannan', x: 86, y: 50, tier: 1, realmRec: 3, kind: '国',
      desc: '魔道六宗盘踞的地方。白天下矿，夜里炼尸，路上没人多看你一眼。',
      features: ['market', 'inn', 'ruin'],
      crowd: [['jindan', 2], ['yin', 2], ['zhuji', 1]]
    },
    {
      id: 'huaxige', name: '花溪阁', region: 'tiannan', x: 66, y: 24, tier: 0, realmRec: 2, kind: '商楼',
      desc: '只做女修生意的商楼，卖幻术法器与养颜丹。男人进去会被请出来。',
      features: ['market', 'baibao'],
      crowd: [['zhuji', 2], ['lianqi', 2], ['shi', 1]]
    },
    {
      id: 'yunmeng', name: '云梦山', region: 'tiannan', x: 56, y: 10, tier: 0, realmRec: 3, kind: '宗门',
      desc: '落云宗山门。终年云雾，山道两侧立着七十二座石碑，刻的是历代死在乱星海里的弟子。',
      features: ['market', 'inn', 'meditate', 'sect', 'cave'],
      crowd: [['jindan', 2], ['zhuji', 2], ['yuanying', 1]]
    },
    {
      id: 'wuligou', name: '五里沟', region: 'tiannan', x: 44, y: 66, tier: 0, realmRec: 0, kind: '村落',
      desc: '青牛镇往南五里的一条沟。沟里九户人家，靠给七玄门种灵田过活。',
      features: ['inn', 'herb'],
      crowd: [['mortal', 3], ['lianqi', 1]]
    },
    {
      id: 'tainanshan', name: '太南山', region: 'tiannan', x: 37, y: 84, tier: 1, realmRec: 1, kind: '山脉',
      desc: '太南小会背后那座山。山腹里有一条半废的灵脉，散修偷偷在里面凿洞府。',
      features: ['herb', 'mine', 'cave'],
      crowd: [['lianqi', 3], ['zhuji', 1], ['beast', 1]]
    },
    {
      id: 'duwu', name: '毒雾沼泽', region: 'tiannan', x: 78, y: 78, tier: 2, realmRec: 1, kind: '沼泽',
      desc: '瘴气终年不散，虫豸比人凶。毒修在这里如鱼得水，别人进来走三天就得躺下。',
      features: ['herb', 'ruin'],
      crowd: [['beast', 2], ['yin', 1], ['lianqi', 1]]
    },
    {
      id: 'bingyu', name: '冰玉谷', region: 'tiannan', x: 22, y: 22, tier: 2, realmRec: 2, kind: '谷地',
      desc: '谷底有一条冰属性灵脉，岩壁上结着千年不化的冰。冰修抢这块地方抢了三百年。',
      features: ['herb', 'mine', 'cave'],
      crowd: [['zhuji', 2], ['jindan', 1], ['beast', 1]]
    },
    {
      id: 'luoxia', name: '落霞岛', region: 'tiannan', x: 68, y: 88, tier: 1, realmRec: 1, kind: '海岛',
      desc: '离岸最远的一座岛，落日时整片海都是红的。岛上有散修自己立的规矩：不杀降。',
      features: ['herb', 'market', 'cave'],
      crowd: [['lianqi', 2], ['zhuji', 1], ['shi', 1]]
    },

    /* ---------------- 乱星海 ---------------- */
    {
      id: 'tianxing', name: '天星城', region: 'luanxing', x: 50, y: 48, tier: 0, realmRec: 3, kind: '城',
      desc: '乱星海第一城，星宫治下。城里禁斗，出了城就没人管了。',
      features: ['market', 'inn', 'meditate', 'auction', 'baibao'],
      crowd: [['jindan', 2], ['zhuji', 2], ['yuanying', 1], ['shi', 1]]
    },
    {
      id: 'biling', name: '碧灵岛', region: 'luanxing', x: 30, y: 30, tier: 2, realmRec: 3, kind: '海岛',
      desc: '岛上有上古药园，灵草成精，会跑。守着药园的妖兽比药园还老。',
      features: ['herb', 'ruin', 'cave'],
      crowd: [['jindan', 2], ['beast', 2], ['zhuji', 1]]
    },
    {
      id: 'guiwu', name: '鬼雾海', region: 'luanxing', x: 72, y: 62, tier: 3, realmRec: 3, kind: '海域',
      desc: '常年起雾，进去的船九条回不来。海底沉着不知哪一朝的古战场。',
      features: ['ruin', 'herb'],
      crowd: [['yuanying', 1], ['jindan', 2], ['yin', 2]]
    },

    /* ---------------- 大晋 ---------------- */
    {
      id: 'taiyi', name: '太一门', region: 'dajin', x: 44, y: 34, tier: 0, realmRec: 4, kind: '宗门',
      desc: '大晋第一道门，山门高九丈。门内元婴过百，外人站在阶下连头都不敢抬。',
      features: ['market', 'inn', 'meditate', 'sect', 'baibao'],
      crowd: [['yuanying', 2], ['jindan', 2], ['zhuji', 1]]
    },
    {
      id: 'kunwu', name: '昆吾山', region: 'dajin', x: 60, y: 52, tier: 3, realmRec: 4, kind: '山脉',
      desc: '大晋的禁山。山里埋着上古修士的墓，也埋着比墓更老的东西。',
      features: ['ruin', 'herb', 'mine'],
      crowd: [['yuanying', 2], ['jindan', 2], ['beast', 1]]
    },
    {
      id: 'luori', name: '落日之森', region: 'dajin', x: 26, y: 62, tier: 2, realmRec: 3, kind: '森林',
      desc: '树高得看不见天，林子里有一条妖怪自己的集市。人进去了，得按妖的规矩来。',
      features: ['herb', 'mine'],
      crowd: [['beast', 2], ['jindan', 1], ['zhuji', 1]]
    },

    /* ---------------- 极西之地 ---------------- */
    {
      id: 'qianzhu', name: '千竹教', region: 'jixi', x: 38, y: 40, tier: 1, realmRec: 2, kind: '宗门',
      desc: '极西唯一的佛门大宗，教众戴竹笠、修苦行。教中「明王诀」不传外人，除非你熬过三年斋。',
      features: ['market', 'meditate', 'sect'],
      crowd: [['zhuji', 2], ['lianqi', 2], ['jindan', 1]]
    },
    {
      id: 'fengsha', name: '风沙城', region: 'jixi', x: 60, y: 62, tier: 0, realmRec: 1, kind: '城',
      desc: '沙漠里唯一的城，水比灵石贵。商队在这里换完货就走，没人留下。',
      features: ['market', 'inn', 'baibao'],
      crowd: [['lianqi', 3], ['zhuji', 1], ['shi', 2]]
    },

    /* ---------------- 慕兰草原 ---------------- */
    {
      id: 'mulan', name: '慕兰圣殿', region: 'mulan', x: 46, y: 42, tier: 2, realmRec: 3, kind: '圣殿',
      desc: '慕兰族的祖庙。草原上的大祭司在这里听天，外族修士没被请就进去，会被当成祭品。',
      features: ['ruin', 'herb'],
      crowd: [['jindan', 2], ['yuanying', 1], ['beast', 1]]
    },
    {
      id: 'tiebi', name: '铁壁城', region: 'mulan', x: 64, y: 58, tier: 1, realmRec: 2, kind: '城',
      desc: '慕兰人修的边城，城墙三层，箭孔里常年插着断箭。城里可以对赌，但不许赖账。',
      features: ['market', 'inn', 'cave'],
      crowd: [['zhuji', 2], ['lianqi', 2], ['shi', 2]]
    }
  ];

  EXTRA.forEach(function (l) { D.LOCATIONS.push(l); });

  /* 适合开辟洞府的地形 */
  var CAVE_KINDS = ['谷地', '山林', '沼泽', '海岛', '遗迹', '山脉', '村落', '荒野', '灵脉', '废墟'];
  D.LOCATIONS.forEach(function (l) {
    if (CAVE_KINDS.indexOf(l.kind) >= 0 && l.features && l.features.indexOf('cave') < 0) l.features.push('cave');
  });

  D.REGIONS = REGIONS;

  /* 区域间传送（只能从这些节点走） */
  D.GATES = [
    { from: 'yuejing', to: 'tianxing', cost: 600 },
    { from: 'tianxing', to: 'taiyi', cost: 900 },
    { from: 'taiyi', to: 'qianzhu', cost: 900 },
    { from: 'taiyi', to: 'mulan', cost: 700 },
    { from: 'yunmeng', to: 'tianxing', cost: 500 }
  ];


  /* ---------------- 五域补全：wiki 地名 ---------------- */
  var MORE_PLACES = [
    /* 乱星海 */
    ['kuixing', '魁星岛', 'luanxing', 30, 46, 0, 2, '岛城', '乱星海的落脚点。岛上有镇妖台，台下压着一只雷鹏，岛上人人当它是井。', ['market', 'inn', 'auction', 'baige', 'meditate']],
    ['nanhe', '南鹤岛', 'luanxing', 62, 22, 1, 2, '海岛', '散修青易居士的岛。岛上只有一间草庐和一林子白鹤，来客多半是想求他炼一炉丹。'],
    ['xiedao', '蝎岛', 'luanxing', 38, 64, 2, 1, '海岛', '岛上妖人劫财杀人，商船过此都要结队。', ['market']],
    ['haiyuan', '海猿岛', 'luanxing', 74, 46, 1, 1, '海岛', '礁石上蹲满海猿，叫声像婴儿。躲追杀的人爱往这儿钻。'],
    ['jiyin', '极阴岛', 'luanxing', 82, 66, 3, 3, '魔岛', '乱星海魔道的一处巢。岛上不点灯，夜里能听见磨刀声。'],
    ['xutiandian', '虚天殿', 'luanxing', 20, 68, 3, 4, '上古秘境', '海面下的巨殿，殿中供着一只鼎。开一次门，要死一批人。'],
    ['yinming', '阴冥之地', 'luanxing', 54, 78, 3, 3, '绝灵之地', '鬼雾把人和灵气一起卷进去的地方。出来的人都说里面没有灵。'],
    ['waihai', '外海', 'luanxing', 82, 32, 2, 1, '海域', '乱星海外围，妖兽成群。猎妖的人在外海发财，也死在外海。', ['herb']],
    /* 大晋 */
    ['jinjing', '晋京', 'dajin', 34, 40, 0, 3, '都城', '大晋的京城。坊市九层，最上一层只在十五月圆开门。', ['market', 'inn', 'auction', 'baige', 'meditate']],
    ['xiaojigong', '小极宫', 'dajin', 66, 30, 1, 3, '宗门', '寒骊上人坐镇的小宗门，宫中藏着一口万年寒潭。'],
    ['kunwudian', '昆吾殿', 'dajin', 18, 74, 3, 4, '上古宫殿', '昆吾山深处的宫殿，殿柱上刻着谁也读不全的古字。'],
    ['tianjige', '天机阁', 'dajin', 76, 58, 1, 2, '楼阁', '大晋最会算的地方。阁里卖消息，价钱看你要问的是谁。', ['market']],
    ['zhaixing', '摘星台', 'dajin', 46, 18, 2, 3, '高台', '台高三万丈，据说能接住掉下来的星辰。台上风大得站不住人。'],
    /* 极西之地 */
    ['jingang', '金刚寺', 'jixi', 46, 30, 1, 2, '佛寺', '极西唯一的佛门大寺。寺中僧人炼体，不炼气。', ['inn', 'meditate']],
    ['shahai', '沙海驿站', 'jixi', 22, 52, 0, 1, '驿站', '沙漠里的一口井、四间土屋。往西三千里，只有这里能睡。', ['inn', 'market']],
    ['gucheng', '残破古城', 'jixi', 70, 70, 3, 3, '废墟', '半座城埋在沙里，露出的一半还保持着当年逃命的样子。'],
    ['folu', '佛窟', 'jixi', 72, 24, 2, 2, '石窟', '崖壁上凿了三百个洞，洞里各有一尊佛。有些佛的脸被人凿掉了。'],
    ['heifeng', '黑风峡', 'jixi', 52, 74, 2, 2, '峡谷', '风从峡口灌进来，带着铁锈味。过路的人都说听见有人哭。'],
    /* 慕兰草原 */
    ['tianlan', '天澜草原', 'mulan', 34, 46, 1, 2, '草原', '草原深处有驿道，驿道两侧每隔百里一座石堆，堆上插着骨头。', ['herb']],
    ['tianlanc', '天澜城', 'mulan', 54, 66, 0, 2, '城池', '慕兰人修在草原上的土城。城门口挂着天南修士的头骨。', ['market', 'inn', 'baige']],
    ['buluo', '慕兰部落', 'mulan', 22, 28, 1, 1, '部落', '几十顶毡房围成圈，中间烧着一堆不灭的火。', ['inn']],
    ['gudao', '草原古道', 'mulan', 74, 34, 2, 2, '古道', '一条从极西通往天南的旧道，路面下的石板上刻满了名字。'],
    ['shengtan', '慕兰圣坛', 'mulan', 50, 16, 3, 3, '圣坛', '慕兰四神师议事的地方。坛上有四根石柱，柱头各缺一角。']
  ];
  MORE_PLACES.forEach(function (a) {
    var l = {
      id: a[0], name: a[1], region: a[2], x: a[3], y: a[4], tier: a[5], realmRec: a[6], kind: a[7],
      desc: a[8], features: a[9] || []
    };
    var t = l.tier;
    l.crowd = t === 0 ? [['zhuji', 3], ['lianqi', 2], ['jindan', 1], ['shi', 1]]
      : t === 1 ? [['lianqi', 4], ['zhuji', 2], ['shi', 1]]
      : t === 2 ? [['lianqi', 3], ['zhuji', 3], ['jindan', 1]]
      : [['zhuji', 2], ['jindan', 2], ['yuanying', 1]];
    D.LOCATIONS.push(l);
  });

  /* 传送阵：五域之间的口子 */
  D.GATES = D.GATES || [];
  [['yuejing', 'kuixing', 600], ['yunmeng', 'kuixing', 500], ['kuixing', 'jinjing', 900],
   ['jinjing', 'jingang', 900], ['jinjing', 'tianlanc', 700], ['tianxing', 'kuixing', 300]]
    .forEach(function (g) {
      if (!D.GATES.some(function (x) { return (x.from === g[0] && x.to === g[1]) || (x.from === g[1] && x.to === g[0]); })) {
        D.GATES.push({ from: g[0], to: g[1], cost: g[2] });
      }
    });

  /* 每个区域在地图上的英文副标题 */
  D.REGION_BY_ID = {};
  REGIONS.forEach(function (r) { D.REGION_BY_ID[r.id] = r; });
})(typeof globalThis !== 'undefined' ? globalThis : this);
