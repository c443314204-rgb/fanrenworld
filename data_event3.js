/* =============================================================
   data_event3.js —— 路上遇到的事（分域）
   reg 字段表示「只在这一域出」，loc 表示「只在这一处出」。
   ============================================================= */
(function (g) {
  var D = g.WORLD_DATA;

  function ev(o) { return o; }
  var E = [];

  /* ================= 天南 ================= */
  E.push(ev({
    id: 'e3_tn_cart', title: '翻在沟里的牛车', reg: 'tiannan', weight: 12,
    text: '一辆牛车翻在路边沟里，车上的麻袋散了一地，里头是晒干的灵草，混着泥水。\n\n' +
      '车夫蹲在旁边抽烟，脸上没什么表情，看见你过来才站起来：「帮把手，一袋给你三株。」\n\n' +
      '远处路上有人赶着另一辆车过来，走得很快。',
    options: [
      {
        text: '帮他把车抬起来', hint: '得灵草，多一个熟人',
        run: function (S, W) {
          W.addItem('herb', 3); W.advanceDays(1);
          return { text: '你和车夫把车抬正，把湿了的麻袋一袋袋搬上去。他数了九株干草给你，多给了三株。\n\n「往南走别走夜路。」他说，「这半个月，沟里翻的三辆车，都是夜里翻的。」' };
        }
      },
      {
        text: '不帮，看看赶来的是什么人', hint: '可能惹麻烦',
        run: function (S, W) {
          var r = Math.random();
          if (r < 0.45) {
            return { text: '赶来的车上下来两个短打汉子，看了看你，又看了看车夫，什么也没说，帮着把车抬正就走了。\n\n车夫冲你吐了口唾沫。你站着没动，也没帮上忙。' };
          }
          W.log('你在路边被两个短打汉子拦下，打了一场。', 'bad');
          return { text: '那两个汉子走到近前，其中一个忽然伸手来抓你的袖口：「你是他的同伙？」\n\n你退了一步，他的刀已经出来了。',
            battle: { realm: Math.min(4, Math.floor(S.step / 13)), count: 1, kind: 'bandit' } };
        }
      },
      {
        text: '绕开走', hint: '干净，什么也没有',
        run: function () { return { text: '你从沟的另一侧绕过去，脚下的泥很软。走出很远，还能听见车夫在骂。' }; }
      }
    ]
  }));

  E.push(ev({
    id: 'e3_tn_peddler', title: '卖旧书的老货郎', reg: 'tiannan', weight: 11,
    text: '一个货郎挑着担子在路边歇脚，担子一头是针线，一头是一摞旧书，书皮都被雨泡得起了毛。\n\n' +
      '「看看？」他随手抽出一本，「不是功法，别指望。都是些游记、药谱、阵法图。\n\n' +
      '不过这个——」他又抽出一本，封皮上什么也没写，「这一本我看不懂，收了二十年，没人看得懂。」',
    options: [
      {
        text: '买下那本看不懂的', hint: '80 灵石，可能什么也不是',
        run: function (S, W) {
          if (S.stones < 80) return { text: '你摸了摸钱袋。货郎把书收回去，动作很轻，像收一块饼。' };
          W.addStones(-80);
          if (Math.random() < 0.5) {
            W.addItem('relic', 1);
            return { text: '你把书翻到最后一页，才发现夹层里有一片薄如蝉翼的东西，透着暗金色。\n\n货郎凑过来看了一眼，脸白了：「这……这不是书里的。」\n\n他把担子挑起来就走，走得很快。' };
          }
          S.cult += 60;
          return { text: '那本书里记的不是功法，是一个人二十年的行路笔记：哪条山路有灵泉，哪个镇的坊市收什么货，哪一年哪座山塌过。\n\n你读了一夜，觉得比一门功法有用。' };
        }
      },
      {
        text: '买一本药谱', hint: '30 灵石，炼丹用得上',
        run: function (S, W) {
          if (S.stones < 30) return { text: '你连三十块都掏不出。货郎摆摆手，让你看看就好。' };
          W.addStones(-30); W.addItem('herb', 2);
          return { text: '药谱是手抄的，字丑，但记得极细：什么草在什么坡上长，什么季节采，采下来怎么阴干。\n\n货郎还塞给你两株晒好的草：「照着书上的样子找，别乱吃。」' };
        }
      },
      {
        text: '翻两页就走', hint: '不花钱',
        run: function () { return { text: '你翻了半本游记。里面写一个人走遍天南，最后死在路上，死前把自己埋在一棵松树下。\n\n货郎说：「这种人多了。」' }; }
      }
    ]
  }));

  E.push(ev({
    id: 'e3_tn_well', title: '废村里的枯井', reg: 'tiannan', weight: 10,
    text: '路边是个废村，房子塌了大半，只剩一口井还立着，井台上长满青苔。\n\n' +
      '你往下看，黑得很深，什么也看不见。井绳还挂着，绳子是新的——这村子明明没人住了。',
    options: [
      {
        text: '顺着绳子下去', hint: '可能有东西，也可能上不来',
        run: function (S, W) {
          W.advanceDays(1);
          if (Math.random() < 0.62) {
            W.addItem('relic', 1); W.addStones(40);
            return { text: '井壁上有一处凹进去的洞，洞里是一只朽掉的木匣，匣里躺着三块灵石和一片泛着青光的碎瓦。\n\n你爬上来的时候手在抖。\n\n井口的天很小，但很亮。' };
          }
          S.hp = Math.max(1, S.hp - 26);
          return { text: '绳子在半途断了。你摔在井底的湿泥上，昏了不知多久，醒来时听见上面有人走动。\n\n你喊了几声，没人应。最后是自己一寸一寸爬上来的，指甲全翻了。' };
        }
      },
      {
        text: '把绳子割了', hint: '不给下一个人机会，也不给自己',
        run: function () { return { text: '你抽出刀，把井绳割断，看着它掉下去，很久才听见一声闷响。\n\n你不知道这算不算做了件好事。' }; }
      },
      {
        text: '在井边坐一会儿就走', hint: '回一点气血',
        run: function (S, W) {
          S.hp = Math.min(W.stats().hpMax, S.hp + Math.round(W.stats().hpMax * 0.15));
          W.advanceDays(1);
          return { text: '你在井台上坐了半个时辰，吃了半块干粮。风从村口穿过来，带着草木的味道。\n\n走的时候你没回头看那口井。' };
        }
      }
    ]
  }));

  E.push(ev({
    id: 'e3_tn_hunter', title: '追妖的散修', reg: 'tiannan', weight: 11,
    text: '林子里冲出一个人，身上有血，背后跟着一头半人高的灰毛畜生，眼睛是绿的。\n\n' +
      '「帮个忙！」那人喊，「它中了我的符，跑不远了！」\n\n' +
      '灰毛畜生在你面前停下，喉咙里发出低低的声音。',
    options: [
      {
        text: '帮着拦它', hint: '打一场，分东西',
        run: function (S, W) {
          return { text: '你横身拦住去路。那畜生一顿，转头朝你扑了过来。',
            battle: { realm: Math.min(4, Math.floor(S.step / 13)), count: 1, kind: 'beast' } };
        }
      },
      {
        text: '先问价', hint: '不见兔子不撒鹰',
        run: function (S, W) {
          var r = Math.random();
          if (r < 0.5) {
            W.addStones(60);
            return { text: '「三十块！」他一边退一边喊。你说六十。他愣了一下，咬牙：「六十！」\n\n你拦下那头畜生的时候，它已经快断气了。他剖出内丹，塞给你六十块灵石，一句话没多说，走了。' };
          }
          return { text: '「三十块！」他喊。你还没答话，那头畜生已经扑到你身上。\n\n他跑了。你替他挨了这一下。',
            battle: { realm: Math.min(4, Math.floor(S.step / 13)), count: 1, kind: 'beast' } };
        }
      },
      {
        text: '让开，不关我的事', hint: '安全',
        run: function (S, W) {
          W.addNotoriety(1);
          return { text: '你侧身让开路。那人从你身边冲过去，血滴在地上，一头畜生跟在他后面。\n\n林子很快安静下来。你听见远处一声惨叫，很短。' };
        }
      }
    ]
  }));

  E.push(ev({
    id: 'e3_tn_monk', title: '化缘的游方僧', reg: 'tiannan', weight: 9,
    text: '一个穿灰布僧衣的游方和尚站在路口，钵里空着。他不看你的脸，只看你的手。\n\n' +
      '「施主手上血腥气重。」他说，「贫僧不化钱，化一句话：\n\n' +
      '你要往哪里去？往那边去的人，十有八九回不来。」',
    options: [
      {
        text: '请他吃顿饭，听他讲', hint: '花点灵石，涨道心',
        run: function (S, W) {
          if (S.stones < 12) return { text: '和尚看了看你空着的钱袋，笑了笑，把钵收进袖子里走了。' };
          W.addStones(-12);
          S.dao = Math.min(100, (S.dao || 60) + 4);
          W.advanceDays(1);
          return { text: '你们在路边的小摊上吃了一碗面。他吃得很慢，把汤都喝完了。\n\n「我不劝你别杀。」他说，「我只劝你，杀完了记得洗手。」\n\n他走的时候没回头。你发现自己的呼吸比先前平了。' };
        }
      },
      {
        text: '问他前面有什么', hint: '得一条消息',
        run: function (S, W) {
          W.addFame(2);
          return { text: '「往东三十里，有个叫断魂坡的地方。」他说，「上个月塌了半边，塌出来的洞里有人进有人出。\n\n' +
            '进去的人多，出来的人少。出来的那些，身上都带着一层灰。」\n\n他念了声佛号，走了。' };
        }
      },
      {
        text: '不理他，走', hint: '什么也不会发生',
        run: function () { return { text: '你从他身边走过去。走出十几步，听见他在后面念经，声音很平，像在给谁送行。' }; }
      }
    ]
  }));

  E.push(ev({
    id: 'e3_tn_gambling', title: '赌坊门口', reg: 'tiannan', weight: 10,
    text: '镇口的赌坊挂着一盏红灯，门口蹲着几个输光了的人。里面很吵，有人在拍桌子。\n\n' +
      '一个伙计探出头，看见你腰间的灵石袋：「客官，进来玩两把？今儿有人连赢十一把了。」',
    options: [
      {
        text: '押一把大的', hint: '赌 100 灵石',
        run: function (S, W) {
          if (S.stones < 100) return { text: '你数了数，连一百都凑不齐。伙计看了你一眼，把帘子放下了。' };
          var win = Math.random() < 0.42;
          if (win) { W.addStones(120); return { text: '骰子开出来，是你要的那一面。\n\n满屋的人都不说话了。你把灵石收进袋里，慢慢往门口走——背后有人跟着，但你没敢回头。' }; }
          W.addStones(-100);
          return { text: '骰子开出来，不是你要的那一面。\n\n你又押了一把，又输了。等你回过神来，袋子里只剩二十块。伙计笑着替你掀开帘子：「客官慢走。」' };
        }
      },
      {
        text: '在门口看一会儿', hint: '看热闹，长见识',
        run: function (S, W) {
          S.cult += 20;
          return { text: '你蹲在门口看了半个时辰。里面那个连赢十一把的人，第十一把输了，输光了，被人架出来扔在墙根下。\n\n他一直笑。你看着他笑到天黑。' };
        }
      },
      {
        text: '走开', hint: '不沾这个',
        run: function () { return { text: '你走开了。身后的吆喝声跟了你一条街，才慢慢低下去。' }; }
      }
    ]
  }));

  E.push(ev({
    id: 'e3_tn_grave', title: '路边的野坟', reg: 'tiannan', weight: 9,
    text: '路边有一座新坟，土还是湿的，坟前插着一块木牌，字被雨冲得看不清了。\n\n' +
      '坟头的土有翻动过的痕迹——不是从外面翻，是从里面。',
    options: [
      {
        text: '挖开看看', hint: '可能得东西，也可能放出来什么',
        run: function (S, W) {
          W.advanceDays(1);
          if (Math.random() < 0.55) {
            W.addStones(70); W.addItem('relic', 1);
            return { text: '棺材里是空的，只有一件叠得整整齐齐的旧袍子，袍子下面压着七十块灵石和一片铜片。\n\n你抬头，看见坟边站着一只黑鸟，正歪头看你。\n\n你走的时候，它跟着飞了很远。' };
          }
          return { text: '土刚挖开一半，里面伸出一只手。\n\n你不知道那还算不算人。',
            battle: { realm: Math.min(4, Math.floor(S.step / 13)), count: 1, kind: 'bandit' } };
        }
      },
      {
        text: '替他培点土', hint: '涨道心',
        run: function (S, W) {
          S.dao = Math.min(100, (S.dao || 60) + 3);
          W.addFame(2);
          return { text: '你用刀鞘把坟头的土拍实，捡了块石头压住木牌。\n\n风把木牌吹得一响。你站起来的时候，心里忽然很静。' };
        }
      },
      {
        text: '走开', hint: '不碰',
        run: function () { return { text: '你从坟边走过去，没有回头。走出很远，还是闻得到新土的味道。' }; }
      }
    ]
  }));

  E.push(ev({
    id: 'e3_tn_caravan', title: '商队的护卫', reg: 'tiannan', weight: 12,
    text: '一支商队停在路边修车，十几辆车，插着同一面旗。护卫在四周散开站着，看你的眼神像在估一件货。\n\n' +
      '管事的走过来：「朋友，往哪去？顺路的话，跟我们走一段。人多，路上太平。」\n\n' +
      '他说话很客气，手一直按在腰上。',
    options: [
      {
        text: '跟一程', hint: '安全赶路，可能分点货',
        run: function (S, W) {
          W.advanceDays(4);
          if (Math.random() < 0.5) { W.addStones(50); return { text: '你跟了四天。第三天夜里遇上两个摸营的，护卫把人赶跑了，还从尸首上搜出些东西，分了你五十块灵石。\n\n管事的说：「会打架的，下次还找你。」' }; }
          return { text: '你跟了四天，一路太平。管事的分了你一囊水和半袋干粮，什么也没多说。\n\n分开的时候，他冲你抱了抱拳。' };
        }
      },
      {
        text: '不跟，自己走', hint: '快，但路上没人',
        run: function (S, W) {
          W.advanceDays(2);
          return { text: '你摆摆手，一个人先走了。回头看了一眼，商队还在原地，车轱辘歪在泥里。' };
        }
      },
      {
        text: '打听他们的货', hint: '可能惹祸',
        run: function (S, W) {
          if (Math.random() < 0.6) {
            W.addStones(20);
            return { text: '管事的笑了一下：「铁器、盐、还有几箱不值钱的符纸。」他随手抽出一张给你，「拿着，驱个小虫还成。」\n\n那张符纸你卖了二十块。' };
          }
          W.log('你问得太多，商队护卫动了手。', 'bad');
          return { text: '管事的脸上还笑着，手却已经抽出来了。\n\n「朋友，」他说，「有些话，问出口就收不回去了。」',
            battle: { realm: Math.min(4, Math.floor(S.step / 13)), count: 2, kind: 'bandit' } };
        }
      }
    ]
  }));

  E.push(ev({
    id: 'e3_tn_rain', title: '山雨里的破庙', reg: 'tiannan', weight: 10,
    text: '雨下得很大，你躲进一座半塌的山神庙。庙里的神像没有了头，供桌上落着灰。\n\n' +
      '角落里已经有人了：一个是背刀的汉子，一个是抱孩子的妇人，还有一个看不出年纪的道士。\n\n' +
      '没人说话，都在等雨停。',
    options: [
      {
        text: '生一堆火', hint: '大家都会记你一分好',
        run: function (S, W) {
          W.addFame(3); S.dao = Math.min(100, (S.dao || 60) + 2);
          return { text: '你摸出火折子，把神像底下散落的干木拖过来，火很快烧起来。\n\n妇人把孩子往火边挪了挪。背刀的汉子看了你一眼，把刀往旁边挪了挪，给你让出位置。\n\n雨下了一夜。天亮的时候，谁也没问谁的名字。' };
        }
      },
      {
        text: '和那道士搭话', hint: '可能听到点东西',
        run: function (S, W) {
          S.cult += 30;
          return { text: '道士不怎么理人，只说了一句：「这庙的神像，是被人从脖子上一刀砍断的，不是塌的。」\n\n他指了指供桌底下的划痕。你看了半天，才看出那是刀痕。\n\n雨停之前，道士先走了。' };
        }
      },
      {
        text: '靠着墙睡一觉', hint: '回气血',
        run: function (S, W) {
          S.hp = Math.min(W.stats().hpMax, S.hp + Math.round(W.stats().hpMax * 0.25));
          W.advanceDays(1);
          return { text: '你靠着墙睡着了，梦里什么也没有。\n\n醒来时雨停了，庙里只剩你一个人。' };
        }
      }
    ]
  }));

  /* ================= 乱星海 ================= */
  E.push(ev({
    id: 'e3_lx_salvage', title: '翻了半截的船', reg: 'luanxing', weight: 12,
    text: '退潮之后，礁石上搁浅着半截船，船身被烧过，桅杆断了，斜插在沙里。\n\n' +
      '船上没有人，也没有尸首。舱门开着，里面黑着。\n\n' +
      '海鸟在船顶上站着，一动不动地看着你。',
    options: [
      {
        text: '进舱看看', hint: '可能发财',
        run: function (S, W) {
          W.advanceDays(1);
          if (Math.random() < 0.6) { W.addStones(120); W.addItem('relic', 1);
            return { text: '舱里翻得乱七八糟，像是有人先来过。你在倾覆的货架底下摸出一只铁盒，锁已经被撬坏了，里头还剩一百二十块灵石和一块焦黑的铜牌。\n\n出来的时候，海鸟全飞了。' }; }
          S.hp = Math.max(1, S.hp - 30);
          return { text: '舱里积着半尺深的水，你在水里踩到一样软的东西——低头一看，是个人，脸朝下，泡得发白。\n\n他手里还攥着东西。你去掰的时候，他的手指动了。' };
        }
      },
      {
        text: '拆点木头走', hint: '稳当的一点收成',
        run: function (S, W) {
          W.addStones(35); W.advanceDays(1);
          return { text: '你把能拆的船板拆了几块，扛到镇上的木匠那里换了些灵石。\n\n「烧过的木头，不值钱。」木匠说，「但你要是不嫌少，三十五块。」' };
        }
      },
      {
        text: '在沙滩上等人来', hint: '看看是谁的船',
        run: function (S, W) {
          if (Math.random() < 0.5) {
            W.addStones(60);
            return { text: '傍晚来了一条小船，船上是这船的东家，急得脸都白了。听说你在这儿等了一天，他塞给你六十块灵石，什么也没多问，就开始搬东西。' };
          }
          W.log('等来的是打捞的人，不是东家。', 'bad');
          return { text: '来的是三条小船，船上的人带着钩子和刀，看见你在岸上，就先下了船，往你这边来。',
            battle: { realm: Math.min(4, Math.floor(S.step / 13)), count: 1, kind: 'bandit' } };
        }
      }
    ]
  }));

  E.push(ev({
    id: 'e3_lx_market', title: '海市的规矩', reg: 'luanxing', weight: 11,
    text: '海市开在退潮的滩涂上，几十个摊位，卖什么的都有：妖丹、旧符、断了一半的法器。\n\n' +
      '一个摊主拦住你，压低声音：「有件东西，不敢摆出来。你要不要看？」',
    options: [
      {
        text: '看', hint: '黑货，可能很便宜',
        run: function (S, W) {
          if (S.stones < 200) return { text: '你摇摇头。他也不恼，压低声音说：「那下次带够钱来。」' };
          if (Math.random() < 0.55) {
            W.addStones(-200); W.addItem('relic', 2);
            return { text: '他从怀里掏出两块黑乎乎的东西，像石头，又像凝固的血。\n\n「从沉船里捞的。」他说，「我不识货，你也不识。两百块，你赌一把。」\n\n你赌了。拿回住处一擦，是两块上好的灵材。' };
          }
          W.addStones(-200);
          return { text: '你付了两百块，摊主把东西塞给你，转身就收了摊，走得极快。\n\n回去一看，两块石头，一点灵气也无。\n\n你在海市上转了三圈，没再找到那个摊子。' };
        }
      },
      {
        text: '不看', hint: '不碰黑货',
        run: function (S, W) {
          W.addFame(1);
          return { text: '你摆摆手走开。摊主在后面啧了一声，又去拦下一个路过的人。\n\n海市上的人都很忙，没人多看你一眼。' };
        }
      },
      {
        text: '反问他是谁', hint: '可能得罪人',
        run: function (S, W) {
          return { text: '「你管我是谁。」他脸上的笑没了，「不买就滚。」\n\n他身后站起来两个人。你也站直了。' , battle: { realm: Math.min(4, Math.floor(S.step / 13)), count: 2, kind: 'bandit' } };
        }
      }
    ]
  }));

  E.push(ev({
    id: 'e3_lx_fog', title: '海雾里的灯', reg: 'luanxing', weight: 10,
    text: '海雾起来的时候，你在礁石上看见一盏灯，很远，一晃一晃。\n\n' +
      '老渔民说，雾里的灯不能追——那是引路的，也是索命的。\n\n' +
      '灯又晃了一下，好像近了些。',
    options: [
      {
        text: '追过去看', hint: '赌一把',
        run: function (S, W) {
          W.advanceDays(1);
          if (Math.random() < 0.5) {
            W.addStones(90); W.addItem('pelt', 1);
            return { text: '你追了半个时辰，灯停在一块礁石上，原来是个破了口的海灯，灯芯里塞着一小撮妖丹碎屑。\n\n灯下压着一张兽皮，还带着腥气。' };
          }
          S.hp = Math.max(1, S.hp - 40);
          W.log('你在雾里迷了路，跌进礁石缝里。', 'bad');
          return { text: '你在雾里走了很久，脚下忽然空了。\n\n醒来的时候，海浪正一下一下拍在你脸边。你不知自己是怎么爬回岸上的，只知道天已经亮了。' };
        }
      },
      {
        text: '在原地等雾散', hint: '稳妥',
        run: function (S, W) {
          W.advanceDays(1);
          return { text: '你坐下来，背靠礁石，看着那盏灯晃。晃到后半夜，灯灭了。\n\n雾散的时候，海上什么也没有。' };
        }
      },
      {
        text: '回去告诉渔民', hint: '换点人情',
        run: function (S, W) {
          W.addFame(2); W.addStones(25);
          return { text: '你回去把灯的位置说了。老渔民脸色一变，连夜带人出海，第二天回来，塞给你二十五块灵石。\n\n「雾里那盏灯，是去年沉的那条船上的。」他说，「总算找着了。」' };
        }
      }
    ]
  }));

  E.push(ev({
    id: 'e3_lx_duel', title: '滩涂上的约斗', reg: 'luanxing', weight: 11,
    text: '沙滩上围了一圈人，中间两个人正在斗法，打得很难看——不是高手过招，是两个走投无路的人在赌命。\n\n' +
      '有人在你旁边吆喝：「押不押？押左边的三比一！」',
    options: [
      {
        text: '押一把', hint: '80 灵石',
        run: function (S, W) {
          if (S.stones < 80) return { text: '你摸摸钱袋，退到人群外头去了。' };
          if (Math.random() < 0.45) { W.addStones(160); return { text: '你押的那个人赢了。他赢得也不好看，半边身子都烧黑了，但站着的那个是他。\n\n你收钱的时候，没人看你。' }; }
          W.addStones(-80);
          return { text: '你押的那个人倒了。倒下去就没再起来。\n\n场子散了，有人在拖尸首，有人在收赌注。你站了一会儿，也走了。' };
        }
      },
      {
        text: '下场替一个', hint: '打一场，赢面看命',
        run: function (S, W) {
          return { text: '你挤进圈里，说了句「我来」。倒下的那个被人拖走，对面的抬起眼看你。\n\n他脸上没有恨，只有累。',
            battle: { realm: Math.min(4, Math.floor(S.step / 13)), count: 1, kind: 'bandit' } };
        }
      },
      {
        text: '看完就走', hint: '长见识',
        run: function (S, W) {
          S.cult += 40;
          return { text: '你从头看到尾，把两个人的手法都记下了——一个爱抢中线，一个爱绕后。\n\n第七个回合，绕后的那个赢了。' };
        }
      }
    ]
  }));

  E.push(ev({
    id: 'e3_lx_merchant', title: '外海来的货郎', reg: 'luanxing', weight: 10,
    text: '一个皮肤晒得像树皮的老货郎，摆着一地的东西：妖丹、海盐、干鱼、还有几块刻着字的贝壳。\n\n' +
      '「看这个。」他拿起一块贝壳，「上头刻的是路。外海哪片礁底下有东西，哪片没有，都在上头。\n\n' +
      '一百五十块，卖你一份。」',
    options: [
      {
        text: '买', hint: '150 灵石换一条财路',
        run: function (S, W) {
          if (S.stones < 150) return { text: '「钱不够就回去攒。」他把贝壳收回袖子里，「这东西不等人。」' };
          W.addStones(-150);
          if (Math.random() < 0.65) { W.addStones(260); W.addItem('pelt', 1);
            return { text: '你照着贝壳上的刻痕找了三天，在一处暗礁底下捞出一只铁箱。\n\n箱子里的东西不多，但值二百六十块。\n\n老货郎说得没错：路是能卖的。' }; }
          return { text: '你照着找了五天，什么也没找到。贝壳上的刻痕太浅，有几处已经磨平了。\n\n老货郎早就不在原来的地方了。' };
        }
      },
      {
        text: '问他外海有什么', hint: '免费听点东西',
        run: function (S, W) {
          W.addFame(1);
          return { text: '「外海的妖兽多。」他说，「但外海没有规矩。天南那边杀人要找个由头，外海不用。\n\n' +
            '你身上有灵气，走出去三十里就会有人来找你——不是找你说话。」' };
        }
      },
      {
        text: '走开', hint: '不买',
        run: function () { return { text: '你走开了。他在后面喊：「一百二！一百二也卖！」你没回头。' }; }
      }
    ]
  }));

  /* ================= 大晋 ================= */
  E.push(ev({
    id: 'e3_dj_library', title: '书楼的三层', reg: 'dajin', weight: 11,
    text: '晋京的书楼有三层，头两层谁都能进，第三层要一块「阅书牌」。\n\n' +
      '你在门口站着，看见一个穿青衣的年轻人被拦下来，牌上少了一个角，就被轰了出去。\n\n' +
      '门房扫了你一眼：「有牌吗？」',
    options: [
      {
        text: '花灵石买一块临牌', hint: '120 灵石，进去抄一夜',
        run: function (S, W) {
          if (S.stones < 120) return { text: '你摸了摸口袋。门房已经把头转回去了。' };
          W.addStones(-120); W.advanceDays(3); S.cult += 120;
          return { text: '第三层的书不许带走，只能抄。你抄了三天，抄的是些零零碎碎的札记：某年某月，某位前辈在某地说过一句话。\n\n有用没用，说不清。但你抄完出来，脑子比进去时清楚。' };
        }
      },
      {
        text: '跟那个年轻人搭话', hint: '多个门路',
        run: function (S, W) {
          W.addFame(2); S.cult += 40;
          return { text: '年轻人叫陆平，家里败了，牌是祖上传下来的，缺了角就作废。\n\n「你要进第三层？」他笑了一下，「别花钱。晚上从后墙翻，门房后半夜要喝酒。」\n\n他说完就走了，没问你要不要一起。' };
        }
      },
      {
        text: '转身走', hint: '不花这个钱',
        run: function () { return { text: '你转身下了台阶。晋京的街上人来人往，每人身上都有一块牌子，牌子上写着他们能进哪一层。' }; }
      }
    ]
  }));

  E.push(ev({
    id: 'e3_dj_official', title: '巡街的执事', reg: 'dajin', weight: 12,
    text: '一队穿皂衣的执事从街那头过来，走得很齐。路两边的人纷纷低头让道。\n\n' +
      '为首那个在你面前停下：「面生。哪一宗的？路引拿出来。」',
    options: [
      {
        text: '报一个宗门', hint: '可能过关，也可能被查',
        run: function (S, W) {
          if (S.sect) return { text: '你报了宗门名号。执事皱了皱眉，看了一眼你腰上的令牌，挥手让你走。\n\n身后有人在低声说话，你没听清。' };
          if (Math.random() < 0.5) { W.addNotoriety(3); return { text: '你随口报了个宗门。执事盯着你看了三息，忽然笑了：「那宗门去年就散了。」\n\n他记下了你的脸。' }; }
          return { text: '你报了个名号，执事点点头，转身带人走了。\n\n走出十几步，你才发现后背全湿了。' };
        }
      },
      {
        text: '交灵石打点', hint: '50 灵石，省事',
        run: function (S, W) {
          if (S.stones < 50) return { text: '你掏不出五十块。执事看了你一眼，那一眼比刀还冷。' };
          W.addStones(-50);
          return { text: '你把灵石塞过去。执事收得很自然，连眼皮都没抬：「下次记得带路引。」\n\n队伍继续往前走，脚步声在石板上很齐。' };
        }
      },
      {
        text: '低头让到一边', hint: '最稳',
        run: function (S, W) {
          return { text: '你退到墙根，低着头。执事从你面前走过，靴子上的泥溅到你裤脚上。\n\n队伍过去很久，街上的人才敢直起腰。' };
        }
      }
    ]
  }));

  E.push(ev({
    id: 'e3_dj_tea', title: '茶楼里的说书人', reg: 'dajin', weight: 10,
    text: '茶楼二层，说书人正讲到一段旧事：三十年前，昆吾山里出了件东西，进去的七个人只回来两个。\n\n' +
      '满堂的人听得入神。说书人一拍醒木：「欲知后事——」\n\n' +
      '他停在这儿，端起茶喝了一口。',
    options: [
      {
        text: '赏他一锭灵石', hint: '20 灵石，听完整段',
        run: function (S, W) {
          if (S.stones < 20) return { text: '你摸了摸口袋，没动。说书人已经接着往下讲了，只是讲得很敷衍。' };
          W.addStones(-20); S.cult += 60;
          return { text: '「回来的那两个，一个疯了，一个闭了关。」说书人压低了声音，「疯的那个临死前说，山里头不是墓，是牢。\n\n' +
            '「锁着的那个东西，还活着。」\n\n满堂没人笑，也没人说话。' };
        }
      },
      {
        text: '追问他细节', hint: '可能问出事',
        run: function (S, W) {
          if (Math.random() < 0.6) { W.addFame(3); return { text: '散场之后你在后门堵住他。他看了你很久，说：「你要真想去，先记住一件事——进山之后，别应任何人的话。」\n\n「哪怕那个人长得像你娘。」' }; }
          W.addNotoriety(4);
          return { text: '他忽然不说话了，眼睛盯着你身后。\n\n你回头，什么也没有。再转回来，他已经不见了，桌上只剩那锭灵石。' };
        }
      },
      {
        text: '听完就走', hint: '不花钱',
        run: function (S, W) {
          S.cult += 20;
          return { text: '你在角落里站着听完。说书人讲了半个时辰，讲到最后自己都含糊了。\n\n出门的时候，天已经黑了。' };
        }
      }
    ]
  }));

  E.push(ev({
    id: 'e3_dj_youngmaster', title: '撞了人的世家子', reg: 'dajin', weight: 11,
    text: '拐角处你撞上一个人，是个锦衣少年，身后跟着四个随从。\n\n' +
      '少年被撞得退了一步，脸色立刻变了：「你眼睛长在哪里？」\n\n' +
      '四个随从已经围了上来。街上的人绕得很快，没人看。',
    options: [
      {
        text: '赔个不是', hint: '低头，省事',
        run: function (S, W) {
          W.addNotoriety(-2);
          return { text: '你抱了抱拳，说声得罪。少年盯着你看了两息，嗤了一声，带着人走了。\n\n走出很远，你还觉得后颈发凉。' };
        }
      },
      {
        text: '不赔，站着看他', hint: '可能打起来',
        run: function (S, W) {
          W.addFame(2); W.addNotoriety(4);
          return { text: '少年被你盯得有些不自在，忽然一巴掌扇过来。\n\n你侧头躲开了。\n\n街上忽然很安静。',
            battle: { realm: Math.min(4, Math.floor(S.step / 13)), count: 2, kind: 'bandit' } };
        }
      },
      {
        text: '塞灵石消灾', hint: '80 灵石',
        run: function (S, W) {
          if (S.stones < 80) return { text: '你掏不出八十块。少年的随从笑了一声，那笑声很难听。' };
          W.addStones(-80);
          return { text: '你把灵石递过去。少年愣了一下，随即笑了，接过去在手里掂了掂：「懂事。」\n\n他带人走了。街上的人这才重新走动起来。' };
        }
      }
    ]
  }));

  /* ================= 极西之地 ================= */
  E.push(ev({
    id: 'e3_jx_sand', title: '沙暴要来', reg: 'jixi', weight: 12,
    text: '天边是一条黄线，正在往这边推。老驼工抬头看了一眼，脸色就变了：「沙暴。一个时辰后到。」\n\n' +
      '前面有个背风的岩窝，后面是来路。岩窝里已经蹲了三个人。',
    options: [
      {
        text: '往岩窝跑', hint: '挤一挤，可能不愉快',
        run: function (S, W) {
          W.advanceDays(1); S.hp = Math.min(W.stats().hpMax, S.hp + Math.round(W.stats().hpMax * 0.2));
          if (Math.random() < 0.5) {
            return { text: '岩窝很小，五个人挤在一起，谁也动不了。风把沙子从缝里灌进来，打在脸上像针。\n\n天亮了，沙暴过去了。没人说话，各自收拾东西走了。' };
          }
          W.addNotoriety(2);
          return { text: '岩窝里那三个人不想让你进。\n\n「挤不下。」其中一个说。你看了看那个空出来的位置，没动。' };
        }
      },
      {
        text: '往回退', hint: '多走两天，稳',
        run: function (S, W) {
          W.advanceDays(3); S.hp = Math.max(1, S.hp - 15);
          return { text: '你掉头往回走了两天，在驿站躲过沙暴。再往西走的时候，路上多了几具没人收的尸首。' };
        }
      },
      {
        text: '硬往前走', hint: '搏一把',
        run: function (S, W) {
          W.advanceDays(2); S.hp = Math.max(1, S.hp - 35);
          W.log('你在沙暴里走了两天，差点没出来。', 'bad');
          return { text: '你在沙暴里走了两天，眼睛睁不开，只能跟着前面的驼印走。第二天晚上驼印没有了。\n\n你活着走出去了，但你自己也不知道是怎么走出来的。' };
        }
      }
    ]
  }));

  E.push(ev({
    id: 'e3_jx_bones', title: '沙下的白骨', reg: 'jixi', weight: 10,
    text: '风把沙子吹开，露出一截白骨。再往下看，是整具骨架，还保持着爬的姿势。\n\n' +
      '骨架的背上压着一只皮囊，皮囊被晒得发硬，但没破。',
    options: [
      {
        text: '拿皮囊', hint: '可能有东西',
        run: function (S, W) {
          if (Math.random() < 0.6) { W.addStones(90); W.addItem('herb', 2);
            return { text: '皮囊里是一包晒干的草、九十块灵石，还有一封没写完的信。\n\n信上只有一句：「阿妹，等我回去，就带你去看海。」\n\n你把信重新塞回囊里，把囊埋在他手边。' }; }
          S.hp = Math.max(1, S.hp - 20);
          return { text: '你刚把皮囊提起来，骨架散了，从里面爬出十几只沙蝎。\n\n你踩着它们跑出去很远。' };
        }
      },
      {
        text: '把他埋了', hint: '涨道心',
        run: function (S, W) {
          S.dao = Math.min(100, (S.dao || 60) + 4); W.advanceDays(1);
          return { text: '你用手把沙子推过去，盖住他，又捡了几块石头压上。\n\n做完这件事，你在旁边坐了一会儿。风很小，沙子很安静。' };
        }
      },
      {
        text: '绕过去', hint: '不碰死人东西',
        run: function () { return { text: '你绕开那具骨架。走出很远，回头看了一眼，风已经在把沙子往回吹了。' }; }
      }
    ]
  }));

  E.push(ev({
    id: 'e3_jx_monk', title: '苦行僧的请求', reg: 'jixi', weight: 10,
    text: '一个苦行僧坐在路边的石头上，背上背着半人高的木架子，架子上挂着七个水囊。\n\n' +
      '「施主，」他说，「往前三十里没有水。我这有七囊，分你两囊。\n\n' +
      '——只要你现在坐下，听我念一遍经。」',
    options: [
      {
        text: '坐下听经', hint: '得水，涨道心',
        run: function (S, W) {
          S.dao = Math.min(100, (S.dao || 60) + 5); W.addItem('heal', 1); W.advanceDays(1);
          return { text: '他念的经很长，你听不懂。念到一半你差点睡着了，但你还是坐着没动。\n\n念完了，他给你两囊水，又给了你一颗褐色的小药丸：「治外伤的，你自己留着。」' };
        }
      },
      {
        text: '买水', hint: '30 灵石',
        run: function (S, W) {
          if (S.stones < 30) return { text: '他摇摇头，给了你一囊水，没收钱：「那你回来的时候，替我念一遍。」' };
          W.addStones(-30);
          return { text: '他收下灵石，给了你三囊水，多给了一囊。\n\n「路上会遇着别人。」他说，「遇着了，分一囊。」' };
        }
      },
      {
        text: '不要，自己走', hint: '不需要',
        run: function (S, W) {
          S.hp = Math.max(1, S.hp - 18); W.advanceDays(1);
          return { text: '你摆摆手走了。三十里之后，你开始后悔。\n\n渴到极处的时候，你想起了那七囊水，也想起了他说的话。' };
        }
      }
    ]
  }));

  E.push(ev({
    id: 'e3_jx_ruins', title: '半埋的佛窟', reg: 'jixi', weight: 11,
    text: '崖壁上凿着一排洞窟，一半埋在沙里。最大的那个洞里，一尊石佛的脸被人凿掉了。\n\n' +
      '佛的掌心里放着一只石钵，钵里有水——在这地方，水不该还在。',
    options: [
      {
        text: '喝水', hint: '回气血，可能有事',
        run: function (S, W) {
          S.hp = Math.min(W.stats().hpMax, S.hp + Math.round(W.stats().hpMax * 0.35));
          S.cult += 50;
          return { text: '水是凉的，凉得不像这地方该有的温度。\n\n喝完之后你抬头看那尊无脸佛，忽然觉得它好像在笑。\n\n你退出洞窟的时候，钵里的水又满了。' };
        }
      },
      {
        text: '在洞里过一夜', hint: '安全，但有人来',
        run: function (S, W) {
          W.advanceDays(1);
          if (Math.random() < 0.5) { W.addItem('relic', 1);
            return { text: '半夜你听见沙子被踩的声音，睁眼看见一个影子从洞口退了出去。\n\n第二天，你在佛脚底下摸到一块铜片。' }; }
          W.log('夜里有人在洞口守着。', 'bad');
          return { text: '天亮的时候，洞口站着三个人。\n\n「这洞我们先来的。」其中一个说。',
            battle: { realm: Math.min(4, Math.floor(S.step / 13)), count: 2, kind: 'bandit' } };
        }
      },
      {
        text: '叩个头就走', hint: '涨道心',
        run: function (S, W) {
          S.dao = Math.min(100, (S.dao || 60) + 3);
          return { text: '你在无脸佛前磕了三个头。\n\n走出洞窟很久，你才想起来：你根本不信佛，也不知道自己在求什么。' };
        }
      }
    ]
  }));

  /* ================= 慕兰草原 ================= */
  E.push(ev({
    id: 'e3_ml_horse', title: '走失的马', reg: 'mulan', weight: 11,
    text: '一匹没有鞍的马站在坡上，鬃毛打结，身上有鞭痕。\n\n' +
      '它看见你，不跑，也不动。\n\n' +
      '坡下有两个牧人在喊，声音被风吹得断断续续。',
    options: [
      {
        text: '把马牵下去', hint: '换个人情',
        run: function (S, W) {
          W.addFame(3); W.addStones(20);
          return { text: '马很瘦，走得慢。你牵着它下坡，两个牧人迎上来，其中一个是孩子。\n\n孩子抱着马脖子哭了。老人从怀里掏出一把干肉和二十块灵石塞给你，说什么也不肯收回去。' };
        }
      },
      {
        text: '骑上就走', hint: '换一匹马，结一门怨',
        run: function (S, W) {
          W.addNotoriety(6); W.advanceDays(2);
          return { text: '你翻身上马，马没反抗。你跑出去两里，听见后面有马蹄声，越来越近。\n\n草原上的人，追马比追人狠。' };
        }
      },
      {
        text: '不理，继续走', hint: '什么也不发生',
        run: function () { return { text: '你从坡下绕过去。马抬起头看你，一直看到你走出视线。\n\n那两个牧人的喊声，后来就听不见了。' }; }
      }
    ]
  }));

  E.push(ev({
    id: 'e3_ml_wrestle', title: '部落的角力', reg: 'mulan', weight: 12,
    text: '部落里燃着火堆，两个汉子在空地上角力，周围人喊着号子。\n\n' +
      '一个上了年纪的妇人看见你，招手：「旱鸭子，来不来？赢了，给你一块肉、一囊奶酒。输了，脱件衣服。」',
    options: [
      {
        text: '下场', hint: '赢面看力气',
        run: function (S, W) {
          if (Math.random() < 0.55) {
            W.addFame(4); W.addItem('heal', 1); S.cult += 40;
            return { text: '你被摔了两次，第三次把对方掀翻了。周围人喊得嗓子都哑了。\n\n妇人把肉和酒塞给你，又拍拍你的背：「以后你就是草原上的客人了。」' };
          }
          W.addNotoriety(1); S.hp = Math.max(1, S.hp - 15);
          return { text: '你被摔得七荤八素，最后连站都站不稳。\n\n围观的人笑得很大声，但没有人上来踩你。散场的时候，有个孩子往你手里塞了块肉。' };
        }
      },
      {
        text: '在火边坐着看', hint: '安全，长见识',
        run: function (S, W) {
          S.cult += 30; W.addFame(1);
          return { text: '你在火边坐到半夜。慕兰人喝酒不劝，唱歌不停，唱的什么你一句听不懂。\n\n有个老人指着火对你说了一句话，没人翻译。但你大概明白了：火要是灭了，草原就黑了。' };
        }
      },
      {
        text: '走开', hint: '不属于这里',
        run: function () { return { text: '你退出人群。火堆的光照在背后，越走越淡。' }; }
      }
    ]
  }));

  E.push(ev({
    id: 'e3_ml_border', title: '边境的尸首', reg: 'mulan', weight: 10,
    text: '一处低洼地里横着七八具尸首，穿的是天南修士的衣裳，死了有些天了，已经被草原上的东西啃过。\n\n' +
      '其中一个手里还攥着半张符纸。',
    options: [
      {
        text: '搜一遍', hint: '得东西，也可能被人看见',
        run: function (S, W) {
          W.advanceDays(1);
          if (Math.random() < 0.6) { W.addStones(110); W.addItem('relic', 1);
            return { text: '你从尸首上搜出一百一十块灵石、两片残玉。有个人怀里还揣着家里的信，你没拿。\n\n走的时候你把他们的脸朝下翻过去了。' }; }
          W.log('搜尸的人不止你一个。', 'bad');
          return { text: '你蹲下去的时候，听见身后有脚步声。\n\n回头，是三个慕兰人，手里拿着弯刀。',
            battle: { realm: Math.min(4, Math.floor(S.step / 13)), count: 3, kind: 'bandit' } };
        }
      },
      {
        text: '把符纸取下来', hint: '得一枚符',
        run: function (S, W) {
          W.addItem('relic', 1);
          return { text: '符纸被血浸透了一半，剩下一半还亮着极淡的光。\n\n你把它收进怀里，走了很远还觉得胸口发烫。' };
        }
      },
      {
        text: '埋了他们', hint: '耗时间，涨道心',
        run: function (S, W) {
          S.dao = Math.min(100, (S.dao || 60) + 5); W.advanceDays(2); W.addFame(3);
          return { text: '你挖了两天，埋了七个人。草原上挖坑很难，土硬，石头多。\n\n埋完最后一个，你的手上全是血泡。\n\n你不知道他们是谁，也不知道他们为什么死在这儿。' };
        }
      }
    ]
  }));

  /* ================= 通用 ================= */
  E.push(ev({
    id: 'e3_all_rain', title: '暴雨', weight: 8,
    text: '雨来得没有预兆，天地一片白。你躲在一棵树下，树下很快就站满了人，谁也不说话。\n\n' +
      '雨停之后，路变成了泥。',
    options: [
      {
        text: '趁雨赶路', hint: '快，但会病',
        run: function (S, W) {
          W.advanceDays(1); S.hp = Math.max(1, S.hp - 14);
          return { text: '你在雨里走了一天，衣服贴在身上，走一步甩一下。\n\n到了地方，你发起热来，躺了两天才缓过来。' };
        }
      },
      {
        text: '等雨停', hint: '慢一点，稳稳的',
        run: function (S, W) {
          W.advanceDays(2);
          return { text: '你靠着树等了大半天。雨停的时候，天边出了一道彩虹。\n\n你忽然想起小时候也见过一次这样的雨，那时候你还不知道什么叫灵石。' };
        }
      }
    ]
  }));

  E.push(ev({
    id: 'e3_all_corpse', title: '路边的斗法痕迹', weight: 9,
    text: '地上有一大片焦痕，边缘的草被烧成了黑灰。焦痕中间是一件撕破的道袍，袍子底下压着半只靴子。\n\n' +
      '没有尸首。',
    options: [
      {
        text: '翻一翻', hint: '可能有东西',
        run: function (S, W) {
          if (Math.random() < 0.55) { W.addStones(60); W.addItem('heal', 1);
            return { text: '道袍的夹层里缝着六十块灵石和一包伤药，缝得很仔细，线脚密得不像修士的手艺。\n\n你想，大概是他家里人缝的。' }; }
          return { text: '翻到一半，焦痕里渗出一点暗红的东西，顺着你的手指爬了上来。\n\n你甩了半天才甩掉，手背上留下一个红印。' };
        }
      },
      {
        text: '看一眼就走', hint: '不碰',
        run: function () { return { text: '你看了一眼，绕开了。走出很远，你还在想那只靴子里原本装着的那只脚。' }; }
      }
    ]
  }));

  E.push(ev({
    id: 'e3_all_child', title: '蹲在路边的孩子', weight: 8,
    text: '一个七八岁的孩子蹲在路边，怀里抱着一只破碗，面前摆着三颗灵石，每颗上面都刻着一个字。\n\n' +
      '「买吗？」他抬头看你，「我爹让我在这儿等，说会有人买。」',
    options: [
      {
        text: '买下来', hint: '30 灵石',
        run: function (S, W) {
          if (S.stones < 30) return { text: '你摇摇头。孩子把灵石收回碗里，重新蹲好，继续看着路。' };
          W.addStones(-30); W.addItem('relic', 1);
          return { text: '三颗灵石上的字，连起来是一句没头没尾的话：「井底、第三块、别回头。」\n\n你回头看那孩子，他还在原地蹲着，像一尊小雕像。' };
        }
      },
      {
        text: '问他爹在哪', hint: '可能问出事',
        run: function (S, W) {
          W.addFame(2);
          return { text: '「我爹走了。」他说，「走了很多天。」\n\n他从怀里摸出一张画，画上是一个背刀的男人，画得很笨，但很像。\n\n你把手里的干粮分了他一半。' };
        }
      },
      {
        text: '走开', hint: '不管闲事',
        run: function (S, W) {
          W.addNotoriety(1);
          return { text: '你走开了。走出去一段，回头看了一眼——那孩子还在原地，抱着碗，看着路。' };
        }
      }
    ]
  }));

  /* 合并进事件池 */
  D.EXTRA_EVENTS = (D.EXTRA_EVENTS || []).concat(E);
  D.EVENT3_COUNT = E.length;
})(typeof globalThis !== 'undefined' ? globalThis : this);
