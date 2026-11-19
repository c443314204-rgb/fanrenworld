/* =============================================================
   天南 · 扩展数据
   原著人物 / 地点专属剧情 / 奇遇 / NPC 经历
   ============================================================= */
(function (g) {
  'use strict';
  var D = g.WORLD_DATA;
  var fx = g.fx;

  /* ---------------- 原著人物（固定，不随机生成） ---------------- */
  var CANON = [
    {
      id: 'canon_mo', name: '墨居仁', loc: 'qixuan', step: 15, personality: 'yin',
      faction: 'human', wealth: 380, age: 132, techs: ['changchun', 'guiyuan', 'ningyuan', 'qingling'],
      bio: ['七玄门长老，笑面虎。', '据说他收过不少记名弟子，没几个活过三年。', '最近在后山转得越来越勤了。'],
      note: '七玄门长老'
    },
    {
      id: 'canon_li', name: '厉飞雨', loc: 'qixuan', step: 8, personality: 'hao',
      faction: 'human', wealth: 120, age: 23, techs: ['zhayan', 'luoyan', 'zhengyang'],
      bio: ['七玄门年轻一辈里最快的剑。', '跟人打赌输了三次，还是照赌。'],
      note: '七玄门弟子'
    },
    {
      id: 'canon_zhang', name: '张铁', loc: 'qingniu', step: 2, personality: 'xia',
      faction: 'human', wealth: 40, age: 18, techs: ['xiangjia', 'bawangjia'],
      bio: ['青牛镇长大的憨小子，一门心思拜进七玄门。', '练的是横练功夫，皮糙肉厚。'],
      note: '七玄门记名弟子'
    },
    {
      id: 'canon_chen', name: '陈巧倩', loc: 'huangfeng', step: 14, personality: 'jin',
      faction: 'human', wealth: 260, age: 41, techs: ['qingyuan1', 'taibai', 'yudan'],
      bio: ['黄枫谷内门弟子，剑修。', '不喜欢人多的地方。'],
      note: '黄枫谷内门'
    },
    {
      id: 'canon_dong', name: '董萱儿', loc: 'huangfeng', step: 16, personality: 'chi',
      faction: 'human', wealth: 300, age: 46, techs: ['daluo', 'huanling', 'lianxi'],
      bio: ['黄枫谷有名的幻术修士。', '看她一眼，未必是看她本人。'],
      note: '黄枫谷内门'
    },
    {
      id: 'canon_lihy', name: '李化元', loc: 'huangfeng', step: 18, personality: 'xia',
      faction: 'human', wealth: 900, age: 187, techs: ['qingyuan2', 'tianluo', 'jinzhen'],
      bio: ['黄枫谷长老，结丹修士。', '护短，也记仇。', '门下弟子都怕他，也都服他。'],
      note: '黄枫谷长老'
    },
    {
      id: 'canon_nan', name: '南宫婉', loc: 'huangfeng', step: 19, personality: 'jin',
      faction: 'human', wealth: 1200, age: 210, techs: ['yudan', 'qingling', 'lingying', 'yunxue'],
      bio: ['掩月宗修士，寄居黄枫谷。', '很少有人见她说笑。', '她看人的时候，像在算一件很久以后的事。'],
      note: '掩月宗'
    },
    {
      id: 'canon_hong', name: '红拂', loc: 'modao', step: 18, personality: 'yin',
      faction: 'demon', wealth: 760, age: 168, techs: ['xuanyin', 'xuanyin2', 'xuejian'],
      bio: ['魔道红拂，喜怒无常。', '据点里的魔修都不敢多看她一眼。'],
      note: '魔道'
    }
  ];

  /* ---------------- NPC 经历模板 ---------------- */
  var BIOS = [
    '在{loc}与人斗法，赢了一招，结了个仇。',
    '闭关三月，出来时瘦了一圈。',
    '在{loc}低价收了一批灵草，转手赚了一笔。',
    '被同门挤兑，只在{loc}转了一夜。',
    '说是在找一样东西，问什么都不肯讲。',
    '酒后失言，得罪了一个不该得罪的人。',
    '替人押了一趟货，回来时少了半只耳朵。',
    '在{loc}捡到半本残卷，看了三年也没看懂。',
    '救过一个落难的散修，从此多了一个不知名姓的恩。',
    '杀了人，把尸首丢进了{loc}外的河里。',
    '被人骗光了灵石，在破庙里躺了半个月。',
    '据说他手上有一件不该有的东西。',
    '近来修为精进，说是得了什么机缘。',
    '去了一趟太南，回来闭口不谈。',
    '欠了坊市一笔债，利滚利已经翻了三倍。'
  ];
  var BIO_FIRST = [
    '出身{home}，自幼便被说是有灵根的料子。',
    '{home}人，家里原本开着一间小铺子，后来败了。',
    '孤儿，被{home}一个老修士捡回去养大。',
    '曾在{home}当过几年杂役，后来跑了。',
    '自己也不愿提起从前，只说家没了。'
  ];

  /* ---------------- 地点专属剧情 ---------------- */
  var SPECIAL = {
    qingniu: {
      id: 'sp_qingniu', title: '茶棚里的老道', once: 'changchun',
      text: '青牛镇口的茶棚里，一个穿灰袍的老道趴在桌上，面前摆着一本翻烂的册子。他见你进来，抬眼看了看你的手，又看了看你的脸。\n\n「想修仙？」他把册子往前推了推，「《长春功》，入门够用了。不要你灵石，只要你替我办一件事——将来若有人拿着半块青玉佩找你，别问，帮我杀了他。」',
      options: [
        { text: '答应他，收下长春功', hint: '得入门功法，欠下一桩因果',
          run: function (S, W) {
            var got = W.grantTech('changchun');
            return { text: got + '\n\n老道点点头，把册子推给你，起身走了。他走得很慢，像是背上压着什么。', fx: { cult: 30 } };
          } },
        { text: '不接因果，只买功法', hint: '200 灵石，两清',
          run: function (S, W) {
            if (S.stones < 200) return { text: '你摸遍全身，凑不出两百灵石。老道笑了笑，把册子收了回去。' };
            var got = W.grantTech('changchun');
            return { text: got + '\n\n老道收了灵石，看你的眼神冷了一点：「也好，干净。」', fx: { stones: -200 } };
          } },
        { text: '转身离开', hint: '不沾这家人的事',
          run: function () { return { text: '你摇了摇头。老道没留你，只是把那本册子又往桌上一放，继续趴着。' }; } }
      ]
    },
    huangfeng: {
      id: 'sp_huangfeng', title: '山门外的石阶', once: 'sect',
      text: '黄枫谷的山门外，石阶下坐着十几个等消息的散修。守门的执事扫了你一眼：「想入门？先过问心三问。」\n\n他伸出三根手指：「一，你为何修仙；二，你杀过人没有；三，若师门要你去死，你去不去。」',
      options: [
        { text: '答：为长生，没杀过，不去', hint: '正派弟子最稳的答案',
          run: function (S, W) {
            if (W.evil()) return { text: '执事盯着你看了很久，忽然冷笑：「你身上那股味儿，隔着三丈都闻得到。滚。」' };
            var got = W.grantTech('qingyuan1');
            return { text: got + '\n\n执事点点头：「进去吧，外门弟子，明日卯时到灵药园报到。」\n\n——你成了黄枫谷的人。', fx: { fame: 8, sect: 'huangfeng' } };
          } },
        { text: '答：为杀人，杀过，去', hint: '疯话，但有人吃这套',
          run: function (S, W) {
            if (W.roll() < 0.35) {
              var got = W.grantTech('qingyuan1');
              return { text: got + '\n\n执事愣了一下，随即大笑：「有点意思。」他扔给你一块外门令牌，「出了事别说是黄枫谷的。」', fx: { fame: 3, notoriety: 6, sect: 'huangfeng' } };
            }
            return { text: '执事的脸沉下来：「滚远点，别让我再看见你。」', fx: { notoriety: 4 } };
          } },
        { text: '不入了', hint: '散修也有散修的活法',
          run: function () { return { text: '你转身下了石阶。身后有人在笑，笑得很轻。' }; } }
      ]
    },
    modao: {
      id: 'sp_modao', title: '据点里的招揽', once: 'modao',
      text: '据点的地下一层，烛火绿得渗人。一个戴铜面的魔修把一叠玉简推过来：「正道那套，慢。我们这套，快。」\n\n「入了魔道，三年金丹，十年元婴——只要你不死在半路上。」',
      options: [
        { text: '入魔道', hint: '得魔功，正道人人喊打',
          run: function (S, W) {
            var got = W.grantTech('xuanyin');
            return { text: got + '\n\n铜面魔修笑了：「好。从今天起，你身上就有味儿了——正道闻得到，我们也闻得到。」', fx: { notoriety: 25, sect: 'modao' } };
          } },
        { text: '问价不入门', hint: '买一门魔功就走',
          run: function (S, W) {
            if (S.stones < 400) return { text: '铜面魔修看了眼你的储物袋：「四百灵石，一分不少。」你拿不出来。' };
            var got = W.grantTech('xuejian');
            return { text: got + '\n\n「买可以，别说是从这儿出去的。」他收了灵石，把玉简扔给你。', fx: { stones: -400, notoriety: 6 } };
          } },
        { text: '退出去', hint: '这地方不宜久留',
          run: function () { return { text: '你退出地下层，身后的烛火灭了。' }; } }
      ]
    },
    luanzang: {
      id: 'sp_luanzang', title: '乱葬岗的哭声', once: 'luanzang',
      text: '入夜，乱葬岗上有人在哭。你循声过去，看见一座新坟前蹲着一个白衣女子，肩膀一抽一抽的。\n\n她没有影子。',
      options: [
        { text: '听她把话说完', hint: '可能是机缘，也可能是夺舍',
          run: function (S, W) {
            if (W.roll() < 0.45) {
              return { text: '女子抬起头，脸是空的。「谢谢。」声音很轻。她把手里的东西放在地上，人散了。你捡起来，是一枚温热的玉牌。', fx: { relic: 1, cult: 40 } };
            }
            return { text: '女子忽然抬头，脸是空的。你眼前一黑，神魂像被人攥住——', battle: { kind: 'ghost', realm: 1 } };
          } },
        { text: '远远绕开', hint: '不赚这个钱',
          run: function () { return { text: '你绕出半里地，哭声还在背后。第二天再去看，那座新坟不见了。' }; } }
      ]
    },
    xutian: {
      id: 'sp_xutian', title: '虚天殿残碑', once: 'xutian',
      text: '残碑半截埋在土里，碑文被磨得只剩几个字。你伸手摸上去，指尖忽然一凉——\n\n碑上浮出一行字：「持此碑者，可问一次。」',
      options: [
        { text: '问：何处有功法', hint: '要一门帝阶以上的传承',
          run: function (S, W) {
            if (S.step < 17) return { text: '石碑震了一下，把你弹开。你吐了一口血——它嫌你境界太低。', fx: { hpLoss: Math.floor(W.maxHp() * 0.25) } };
            var got = W.grantTechAny(['qingyuan3', 'dayan3', 'mingwang', 'yuanci']);
            return { text: got + '\n\n石碑碎成粉。你手里多了一卷东西。', fx: { hpLoss: Math.floor(W.maxHp() * 0.1) } };
          } },
        { text: '问：我能活多久', hint: '问命',
          run: function (S, W) {
            return { text: '碑上浮出两个字：「看你。」\n\n然后碎了。你站在原地，觉得这两个字比什么功法都可恶。', fx: { cult: 120 } };
          } },
        { text: '什么都不问', hint: '有些东西不该碰',
          run: function () { return { text: '你收回手。碑上的字慢慢淡了，像从来没出现过。' }; } }
      ]
    }
  };

  /* ---------------- 奇遇（每个地点定期刷新） ---------------- */
  var ENCOUNTERS = [
    {
      id: 'enc_spring', title: '石缝里的灵泉', weight: 10,
      text: '山壁的石缝里渗出一线泉水，落在石窝里，泛着极淡的青光。',
      options: [
        { text: '喝一口', hint: '回气血，涨修为',
          run: function (S, W) { return { text: '泉水入喉，一股暖意从丹田升起。你在石边坐了半个时辰，伤好了大半。', fx: { hpHeal: 0.5, cult: 80 } }; } },
        { text: '装起来带走', hint: '换灵石',
          run: function () { return { text: '你解下水囊，把石窝里的泉水刮得干干净净。拿到坊市能换几个钱。', fx: { stones: 60 } }; } }
      ]
    },
    {
      id: 'enc_jade', title: '半块玉简', weight: 9,
      text: '土里露出半块玉简，边缘的灵光还没散尽。',
      options: [
        { text: '贴在额上看看', hint: '可能是功法，也可能是陷阱',
          run: function (S, W) {
            if (W.roll() < 0.4) {
              var pool = ['qingyuan1', 'jinlian', 'tianluo', 'yunxue', 'dayan1', 'lingwen', 'qisha', 'xuelian'];
              var got = W.grantTechAny(pool);
              return { text: got + '\n\n玉简在你手里碎成了粉。', fx: { cult: 20 } };
            }
            return { text: '玉简里什么都没有，只有一道残留的禁制。你的神识被扎了一下，头痛欲裂。', fx: { hpLoss: Math.floor(W.maxHp() * 0.1) } };
          } },
        { text: '直接收起来卖掉', hint: '稳妥',
          run: function () { return { text: '你把玉简收进袋里。坊市里有人专收这种东西，价钱不高，但不亏。', fx: { relic: 1 } }; } }
      ]
    },
    {
      id: 'enc_nest', title: '妖兽的窝', weight: 8,
      text: '一丛灌木后面是个土洞，洞口散着骨头，里面有东西在动。',
      options: [
        { text: '杀了它', hint: '打一场，有皮有骨',
          run: function (S, W) { return { text: '你抽出兵器，洞里传出一声低吼。', battle: { kind: 'beast', realm: 1 } }; } },
        { text: '摸进去偷蛋', hint: '不打架，但要身法',
          run: function (S, W) {
            if (W.roll() < 0.55) return { text: '你屏着气摸进去，抱了两枚蛋出来。拿到坊市，能换不少灵石。', fx: { stones: 90 } };
            return { text: '你刚伸出手，洞里就炸了。', battle: { kind: 'beast', realm: 0 } };
          } }
      ]
    },
    {
      id: 'enc_oldman', title: '路边的老头', weight: 7,
      text: '一个老头蹲在路边晒太阳，见你过来，忽然开口：「小友，要买功法吗？」',
      options: [
        { text: '看看货', hint: '可能是真的',
          run: function (S, W) {
            if (S.stones < 150) return { text: '老头看了眼你的口袋，摆摆手：「穷鬼。」' };
            if (W.roll() < 0.5) {
              var got = W.grantTechAny(['changchun', 'zhayan', 'lianwen', 'qingling', 'qianlang']);
              return { text: got + '\n\n老头收了灵石，揣着手走了：「下次有好东西还等你。」', fx: { stones: -150 } };
            }
            return { text: '你付了灵石，翻开一看，是半本账本。老头已经没影了。', fx: { stones: -150 } };
          } },
        { text: '不理', hint: '天上不掉馅饼',
          run: function () { return { text: '你从老头身边走过去。他在背后喊：「一百五！一百二也行！」' }; } }
      ]
    },
    {
      id: 'enc_trap', title: '荒阵', weight: 6,
      text: '地上有几道浅浅的刻痕，像是有人在布阵。你退后一步，刻痕却亮了。',
      options: [
        { text: '硬闯', hint: '受伤换东西',
          run: function (S, W) {
            var dmg = Math.floor(W.maxHp() * 0.2);
            return { text: '你顶着阵光冲了过去，喉咙里一股腥甜。阵盘被你踩碎，底下压着一只储物袋。', fx: { hpLoss: dmg, stones: 120, relic: 1 } };
          } },
        { text: '找阵眼拆了它', hint: '看神识',
          run: function (S, W) {
            if (W.roll() < 0.5) return { text: '你花了半个时辰找到阵眼，轻轻一扣。阵光散了，阵盘完整地留在你手里。', fx: { relic: 1, stones: 60 } };
            var dmg2 = Math.floor(W.maxHp() * 0.12);
            return { text: '你算错了一步。阵光炸开，你被掀翻在地。', fx: { hpLoss: dmg2 } };
          } }
      ]
    }
  ];

  /* ---------------- 丹方 ---------------- */
  var PILLS = [
    { id: 'heal', name: '疗伤丹', need: { herb: 2 }, desc: '回复 35% 气血' },
    { id: 'mana', name: '回气丹', need: { herb: 2, ore: 1 }, desc: '回复 45% 法力' },
    { id: 'cult', name: '培元丹', need: { herb: 4, ore: 1 }, desc: '修为 +120' },
    { id: 'break', name: '破境丹', need: { herb: 6, ore: 2, relic: 1 }, desc: '突破成功率 +20%' }
  ];

  /* ---------------- 器方 / 法宝 ---------------- */
  var TREASURES = [
    {
      id: 'xuantie', name: '玄铁盾', grade: 1, need: { ore: 4 }, stones: 40,
      pct: { take: 0.08, def: 0.1 }, desc: '减伤 8%，防御 +10%',
      lore: '凡铁反复淬炼，挡得住寻常飞剑。'
    },
    {
      id: 'zhujian', name: '青竹蜂云剑', grade: 2, need: { ore: 6, relic: 1 }, stones: 120,
      pct: { swordDmg: 0.2, crit: 0.05 }, desc: '剑系伤害 +20%，暴击 +5%',
      lore: '竹节里藏着七十二口飞针，出手时像一群蜂。'
    },
    {
      id: 'hulu', name: '白玉葫芦', grade: 2, need: { herb: 3, ore: 2, relic: 1 }, stones: 100,
      pct: { manaRegen: 3, healBonus: 0.15 }, desc: '每回合法力 +3，疗伤 +15%',
      lore: '葫芦里养着一缕灵泉，喝一口能续半条命。'
    },
    {
      id: 'xutian', name: '虚天鼎', grade: 3, need: { ore: 8, relic: 3 }, stones: 400,
      pct: { dmg: 0.08, hp: 0.08, take: 0.05 }, desc: '伤害 +8%，气血 +8%，减伤 5%',
      lore: '上古遗物，鼎身刻满看不懂的字。'
    }
  ];

  g.WORLD_DATA.PILLS = PILLS;
  g.WORLD_DATA.TREASURES = TREASURES;

  g.WORLD_DATA.CANON = CANON;
  g.WORLD_DATA.BIOS = BIOS;
  g.WORLD_DATA.BIO_FIRST = BIO_FIRST;
  g.WORLD_DATA.SPECIAL = SPECIAL;
  g.WORLD_DATA.EXTRA_EVENTS = ENCOUNTERS;
  g.WORLD_DATA.gradeSwitchDays = function (gid) { return [10, 25, 60, 150, 360, 720][gid] || 60; };
})(typeof globalThis !== 'undefined' ? globalThis : this);
