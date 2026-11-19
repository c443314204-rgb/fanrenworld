/* =============================================================
   天南 · 世界数据
   地点 / 人物性格 / 物品 / 随机事件
   ============================================================= */
(function (g) {
  'use strict';

  /* ---------------- 地点 ---------------- */
  /* tier: 0 安全区, 1 低危, 2 中危, 3 高危
     x/y 是百分比坐标，参照你给的天南示意图摆的方位 */
  var LOCATIONS = [
    {
      id: 'qingniu', name: '青牛镇', x: 37, y: 62, tier: 0, realmRec: 0, kind: '镇',
      desc: '越国边上一个不起眼的小镇。镇口有间茶棚，镇尾是七玄门的招工处，往南三十里就是彩霞山。',
      features: ['market', 'inn', 'meditate'],
      crowd: [['mortal', 2], ['lianqi', 2], ['shi', 1]]
    },
    {
      id: 'jiayuan', name: '嘉元城', x: 52, y: 86, tier: 0, realmRec: 1, kind: '城',
      desc: '九国盟西境的通商大城，三层坊市昼夜不歇。灵石在这里比人命值钱。',
      features: ['market', 'inn', 'meditate', 'auction'],
      crowd: [['lianqi', 3], ['zhuji', 1], ['shi', 2], ['mortal', 1]]
    },
    {
      id: 'huangfeng', name: '黄枫谷', x: 52, y: 33, tier: 0, realmRec: 1, kind: '宗门',
      desc: '越国七派之一。满山枫叶红得像火，山门外的石阶上常年坐着等消息的散修。',
      features: ['market', 'inn', 'meditate', 'sect'],
      crowd: [['lianqi', 3], ['zhuji', 2], ['xia', 1]]
    },
    {
      id: 'tainan', name: '太南小会', x: 28, y: 74, tier: 0, realmRec: 0, kind: '集会',
      desc: '散修交换东西的地方，逢五开市。没人问你从哪来，也没人管你往哪去。',
      features: ['market', 'meditate'],
      crowd: [['lianqi', 3], ['mortal', 2], ['shi', 1]]
    },
    {
      id: 'qixuan', name: '七玄门后山', x: 47, y: 47, tier: 1, realmRec: 0, kind: '山林',
      desc: '后山多野狼，也长着最普通的止血草。门里弟子常来这儿试手。',
      features: ['herb', 'meditate'],
      crowd: [['lianqi', 2], ['beast', 2]]
    },
    {
      id: 'caixia', name: '彩霞山外围', x: 62, y: 39, tier: 1, realmRec: 0, kind: '山林',
      desc: '彩霞山矿脉的外围，灵石碎屑被雨水冲下山沟，捡得着，也抢得凶。',
      features: ['herb', 'mine'],
      crowd: [['lianqi', 3], ['beast', 1]]
    },
    {
      id: 'lingyao', name: '灵药谷', x: 26, y: 55, tier: 1, realmRec: 0, kind: '谷地',
      desc: '谷里终年有雾，灵草比外面密。采药的人进去，十个里有两三个出不来。',
      features: ['herb'],
      crowd: [['lianqi', 2], ['beast', 2], ['chi', 1]]
    },
    {
      id: 'luanzang', name: '乱葬岗', x: 63, y: 55, tier: 1, realmRec: 0, kind: '荒地',
      desc: '野狗比人多。偶尔有散修在这儿杀人埋尸，也偶尔有人在这儿挖到死人留下的东西。',
      features: ['herb', 'ruin'],
      crowd: [['beast', 2], ['yin', 1], ['lianqi', 1]]
    },
    {
      id: 'xigu', name: '溪谷', x: 40, y: 80, tier: 1, realmRec: 0, kind: '溪谷',
      desc: '水声很响，适合埋伏。走这条路的人都知道要贴着崖壁走。',
      features: ['herb'],
      crowd: [['lianqi', 2], ['yin', 1]]
    },
    {
      id: 'wanling', name: '万岭山脉', x: 22, y: 38, tier: 2, realmRec: 1, kind: '山脉',
      desc: '山脉横贯天南西境，深处有灵脉也有妖王。筑基修士结伴才敢往里走。',
      features: ['herb', 'mine', 'ruin'],
      crowd: [['zhuji', 2], ['beast', 2], ['yin', 1]]
    },
    {
      id: 'guxiu', name: '古修遗址', x: 68, y: 17, tier: 2, realmRec: 2, kind: '遗迹',
      desc: '半截埋在土里的上古洞府，禁制还在，进去的人有的发了财，有的连骨头都没留下。',
      features: ['ruin', 'meditate'],
      crowd: [['zhuji', 2], ['jindan', 1], ['chi', 1]]
    },
    {
      id: 'huangdao', name: '荒岛', x: 76, y: 68, tier: 2, realmRec: 1, kind: '海岛',
      desc: '海外散修的落脚点，鱼龙混杂。岛中央的火山口据说通着地火。',
      features: ['herb', 'market'],
      crowd: [['zhuji', 2], ['lianqi', 2], ['shi', 1]]
    },
    {
      id: 'xuese', name: '血色禁地边缘', x: 50, y: 19, tier: 2, realmRec: 2, kind: '禁地',
      desc: '禁地每几十年开一次。边缘的灵气已经开始发甜，那是血的味道。',
      features: ['ruin', 'herb'],
      crowd: [['zhuji', 2], ['jindan', 1], ['yin', 1]]
    },
    {
      id: 'zhuimo', name: '坠魔谷', x: 30, y: 20, tier: 3, realmRec: 2, kind: '魔域',
      desc: '谷底有魔气，进去的修士十个有九个回来后会做同一个梦。',
      features: ['ruin', 'herb'],
      crowd: [['jindan', 2], ['yin', 2], ['zhuji', 1]]
    },
    {
      id: 'modao', name: '魔道据点', x: 82, y: 36, tier: 3, realmRec: 2, kind: '魔窟',
      desc: '天南魔道的暗桩之一。挂着客栈的招牌，卖的是人肉包子。',
      features: ['market', 'ruin'],
      crowd: [['jindan', 2], ['yin', 2], ['yuanying', 1]]
    },
    {
      id: 'xutian', name: '虚天殿遗迹', x: 17, y: 66, tier: 3, realmRec: 3, kind: '秘殿',
      desc: '传说中的上古宫殿，每隔百年从地底浮出来一次。殿门上的字没人认得全。',
      features: ['ruin', 'meditate'],
      crowd: [['yuanying', 2], ['jindan', 2], ['yin', 1]]
    }
  ];

  /* ---------------- 性格 ---------------- */
  var PERSONALITIES = {
    xia: { id: 'xia', name: '侠义', aggro: 0.03, spar: 0.65, gift: 1.3, trade: 0.8,
      talk: ['路见不平，拔刀而已。', '你这人看着不像坏人。', '天南这地方，好人活不长。'] },
    hao: { id: 'hao', name: '豪爽', aggro: 0.08, spar: 0.9, gift: 1.2, trade: 1,
      talk: ['来来来，喝一碗！', '爽快！我就喜欢跟你这样的人打交道。', '灵石算什么，交个朋友。'] },
    jin: { id: 'jin', name: '谨慎', aggro: 0.02, spar: 0.35, gift: 0.9, trade: 1.1,
      talk: ['……有事？', '我不喜欢跟生人走太近。', '你说的我都记下了，但我不会全信。'] },
    yin: { id: 'yin', name: '阴狠', aggro: 0.45, spar: 0.5, gift: 0.7, trade: 1.3,
      talk: ['你身上有股味道，我很熟。', '别站在我背后。', '这地方，死个人很正常。'] },
    chi: { id: 'chi', name: '痴道', aggro: 0.05, spar: 0.85, gift: 1, trade: 0.6,
      talk: ['你也是修道之人？', '我卡在这一层十七年了。', '功法？拿东西来换。'] },
    shi: { id: 'shi', name: '市侩', aggro: 0.1, spar: 0.3, gift: 0.8, trade: 0.75,
      talk: ['客官看点什么？', '这个价，全城找不出第二家。', '买卖不成仁义在，别动手啊。'] }
  };

  /* ---------------- 姓名 ---------------- */
  var SURNAMES = ['王', '李', '张', '刘', '陈', '杨', '赵', '孙', '周', '吴', '徐', '胡',
    '朱', '高', '林', '何', '郭', '马', '罗', '梁', '宋', '郑', '谢', '韩', '唐', '冯'];
  var GIVEN = ['铁柱', '二狗', '慕云', '长庚', '清源', '怀山', '元朗', '少卿', '文昭', '子期',
    '青', '砚', '松', '柏', '舟', '野', '尘', '霜', '岳', '渊', '衡', '砚秋', '听雪',
    '不悔', '无咎', '知白', '抱朴', '守拙', '乘舟', '踏雪', '问天', '孤鸿'];
  var DAOHAO = ['玄阴', '青阳', '枯木', '赤松', '白云', '无为', '参同', '抱一', '守中',
    '寒山', '照水', '残阳', '孤云', '断岳', '沉舟'];

  /* ---------------- 物品 ---------------- */
  var ITEMS = {
    heal: { id: 'heal', name: '疗伤丹', price: 40, desc: '回复 35% 气血', use: 'heal' },
    mana: { id: 'mana', name: '回气丹', price: 32, desc: '回复 45% 法力', use: 'mana' },
    cult: { id: 'cult', name: '培元丹', price: 90, desc: '增长 120 点修为', use: 'cult' },
    break: { id: 'break', name: '破境丹', price: 220, desc: '突破成功率 +20%', use: 'break' },
    zhuji: { id: 'zhuji', name: '筑基丹', price: 1200, desc: '结筑基之基，破境必需', use: 'gate' },
    jiedan: { id: 'jiedan', name: '结丹灵液', price: 2600, desc: '凝液成丹，破境必需', use: 'gate' },
    ningying: { id: 'ningying', name: '凝婴果', price: 5200, desc: '孕化元婴，破境必需', use: 'gate' },
    huashen: { id: 'huashen', name: '化神花', price: 9000, desc: '神游太虚，破境必需', use: 'gate' },
    escape: { id: 'escape', name: '遁地符', price: 70, desc: '战斗中脱身一次', use: 'escape' },
    herb: { id: 'herb', name: '灵草', price: 26, desc: '常见的炼丹材料', use: 'sell' },
    ore: { id: 'ore', name: '灵石矿', price: 34, desc: '蕴含灵气的矿石', use: 'sell' },
    pelt: { id: 'pelt', name: '妖兽皮', price: 22, desc: '能做符纸，也能卖钱', use: 'sell' },
    relic: { id: 'relic', name: '古修残片', price: 160, desc: '不知用途的上古物件', use: 'sell' }
  };

  /* ---------------- 随机事件 ---------------- */
  /* run(S, W) 返回 { text, battle?, fx? }，W 是世界层提供的一组动作 */
  var EVENTS = [
    {
      id: 'wounded', title: '路遇伤修', weight: 10,
      text: '路边歪着一个修士，腿上插着半截骨刺，血已经把道袍洇透了。他看见你，手慢慢摸向腰间。',
      options: [
        { text: '给他一枚疗伤丹', hint: '花一枚丹药，也许结个善缘',
          run: function (S, W) {
            if (!S.items.heal) return { text: '你翻了翻储物袋，才发现自己连一枚疗伤丹都没有。他眼里的光暗了下去。' };
            if (W.roll() < 0.25) {
              return { text: '他接过丹药吞下，抱拳道：「在下记下了。」说完便一瘸一拐地走了。——你不知道他叫什么，但他记住了你的脸。', fx: { heal: -1, fame: 3 } };
            }
            return { text: '他吞下丹药，脸色缓了些，从怀里摸出一块碎灵石塞给你，什么也没说就走了。', fx: { heal: -1, stones: 20, fame: 2 } };
          } },
        { text: '搜他的身', hint: '趁他伤，要他命', danger: true,
          run: function (S, W) {
            var got = 30 + Math.floor(W.roll() * 60);
            return { text: '你蹲下去，他没有力气反抗，只是盯着你看。你从他怀里摸出 ' + got + ' 块灵石，还有半瓶伤药。走远之后，那道目光还在背上。', fx: { stones: got, notoriety: 6 } };
          } },
        { text: '绕开', hint: '多一事不如少一事',
          run: function () { return { text: '你从他身边绕过去。走出十几步，听见身后有动静，没回头。' }; } }
      ]
    },
    {
      id: 'herb', title: '崖边灵草', weight: 12,
      text: '崖缝里长着一株三叶的灵草，叶子边缘泛着淡青的光。旁边有一摊新鲜的兽粪。',
      options: [
        { text: '直接采了', hint: '快，但可能惊动守草的东西',
          run: function (S, W) {
            if (W.roll() < 0.35) {
              return { text: '你刚把草拔出来，崖下就窜出一头灰背妖狼。', battle: { kind: 'beast', realm: 0 } };
            }
            return { text: '你屏住气把灵草连根起出，塞进储物袋。运气不错。', fx: { herb: 1 } };
          } },
        { text: '先看看四周', hint: '慢一点，稳一点',
          run: function (S, W) {
            var n = W.roll() < 0.5 ? 2 : 1;
            return { text: '你沿着崖壁绕了一圈，确认没有妖兽，才把灵草采下。' + (n > 1 ? '还顺手在石缝里摸到一株小的。' : ''), fx: { herb: n, days: 1 } };
          } }
      ]
    },
    {
      id: 'ambush', title: '邪修截杀', weight: 9,
      text: '三个人从两侧的林子里走出来，为首那个脸上有一道从眉骨到嘴角的疤。「留下储物袋，滚。」',
      options: [
        { text: '动手', hint: '打不过就跑，跑不掉就死', danger: true,
          run: function () { return { text: '你没有说话，只是把手按在了剑柄上。', battle: { kind: 'bandit', realm: 0, count: 2 } }; } },
        { text: '交出一半灵石', hint: '破财消灾',
          run: function (S, W) {
            var loss = Math.floor(S.stones * 0.4);
            return { text: '你把储物袋翻过来，倒出一半灵石。疤脸掂了掂，挥手让你走。走出很远，你才敢回头。', fx: { stones: -loss } };
          } },
        { text: '转身就遁', hint: '看身法',
          run: function (S, W) {
            if (W.speedCheck()) return { text: '你脚下一点，人已经窜了出去。身后传来骂声，没有人追上来。', fx: { days: 1 } };
            return { text: '你刚转身，一道血光就贴着头皮扫过。跑不掉了。', battle: { kind: 'bandit', realm: 0, count: 1 } };
          } }
      ]
    },
    {
      id: 'fakemanual', title: '摊上的秘籍', weight: 8,
      text: '一个裹着破毡的老头蹲在墙角，面前摊着一本《青元剑诀·残卷》，开口只要五十灵石。',
      options: [
        { text: '买下来', hint: '五十灵石，赌一手',
          run: function (S, W) {
            if (S.stones < 50) return { text: '你摸了摸储物袋，五十灵石也拿不出来。老头嗤笑一声，把书收了回去。' };
            if (W.roll() < 0.35) return { text: '翻开第一页，剑气扑面。是真的——虽然只有前六层，但确实是青元剑诀的路子。', grantTech: 'qingyuan1', fx: { stones: -50 } };
            return { text: '回去一翻，通篇都是抄来的拳谱，末页还有一行小字：「上当者，蠢。」', fx: { stones: -50 } };
          } },
        { text: '用天眼术辨一辨', hint: '需修习天眼术',
          run: function (S, W) {
            if (!W.hasSpell('tianyan')) return { text: '你盯着那本书看了半天，什么也没看出来。老头似笑非笑地看着你。' };
            if (W.roll() < 0.4) return { text: '灵目之下，书页上没有半点灵光。你把书扔回去，老头收起摊子就走。' };
            return { text: '灵目之下，残卷上浮着极淡的剑意。你付了钱，老头走的时候多看了你一眼。', grantTech: 'qingyuan1', fx: { stones: -50 } };
          } },
        { text: '走开', hint: '不赌',
          run: function () { return { text: '你摇摇头走开。身后老头还在喊：「四十！三十也行啊！」' }; } }
      ]
    },
    {
      id: 'caravan', title: '商队', weight: 7,
      text: '一队挂了嘉元城旗号的商队停在路边修车，管事的是个胖商人，正急得团团转。',
      options: [
        { text: '帮着护送到下一个镇', hint: '耗时，但有钱有名',
          run: function () {
            return { text: '你跟着商队走了三天，路上赶跑了两拨小毛贼。管事塞给你一袋灵石，千恩万谢。', fx: { stones: 80, fame: 4, days: 3 } };
          } },
        { text: '趁乱抢一票', hint: '钱来得快，麻烦也来得快', danger: true,
          run: function () {
            return { text: '你等护院转身的工夫，拎起两箱货就往林子里钻。', battle: { kind: 'guard', realm: 1 }, fx: { notoriety: 10 } };
          } },
        { text: '不管', hint: '赶路要紧',
          run: function () { return { text: '你从商队边上走过去，胖商人喊了两声，你没回头。' }; } }
      ]
    },
    {
      id: 'ruin', title: '半塌的洞府', weight: 7,
      text: '山壁上塌出半个洞口，里面透出极淡的灵光。洞口有一层几乎看不见的禁制纹路。',
      options: [
        { text: '强闯', hint: '受伤，但里面可能有好东西', danger: true,
          run: function (S, W) {
            var dmg = Math.floor(W.maxHp() * 0.18);
            return { text: '禁制炸开的一瞬，你被震得气血翻涌，喉咙里一股腥甜。洞里只剩半块玉简和一枚古修残片。', fx: { relic: 1, hpLoss: dmg } };
          } },
        { text: '慢慢找阵眼', hint: '看神识',
          run: function (S, W) {
            if (W.roll() < 0.6) return { text: '你蹲在洞口看了半个时辰，终于找到那处褪色的阵纹。禁制散了，你从洞里取走两块残片。', fx: { relic: 2 } };
            return { text: '阵纹突然亮起，你只来得及退开半步。禁制没破，你却挂了彩。', fx: { hpLoss: Math.floor(W.maxHp() * 0.08) } };
          } },
        { text: '记下位置，以后再来', hint: '稳妥',
          run: function () { return { text: '你记下方位，在旁边的树上刻了个记号。等有把握了再来也不迟。', fx: { days: 1 } }; } }
      ]
    }
  ];

  g.WORLD_DATA = {
    LOCATIONS: LOCATIONS,
    PERSONALITIES: PERSONALITIES,
    SURNAMES: SURNAMES,
    GIVEN: GIVEN,
    DAOHAO: DAOHAO,
    ITEMS: ITEMS,
    EVENTS: EVENTS
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
