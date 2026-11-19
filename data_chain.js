/* =============================================================
   v17 连续奇遇：一条线要走好几步
   -------------------------------------------------------------
   每条链有若干「步」，按 S.chains[chain] 的进度解锁。
   走到某一步，那一步会在地图上等你——不是随机碰运气，
   而是你上一次的选择把这一步留下来了。
   ============================================================= */
(function (g) {
  'use strict';

  var D = g.WORLD_DATA;

  /* 走到下一步 */
  function next(chain, step) {
    return function (S, W) { W.setChain(chain, step); };
  }

  var EVENTS = [

    /* ================= 一、半块青玉佩 ================= */
    {
      id: 'ch_jade1', chain: 'jade', step: 1, title: '青玉佩（一）', weight: 30,
      loc: 'qingniu',
      text: '茶棚的老道把那半块青玉佩推到你面前，指腹在断口上摩挲了两下。「拿着。' +
        '将来有人拿着另半块来找你，你就知道该做什么了。」',
      options: [
        { text: '收下', hint: '这东西以后会有用',
          run: function (S, W) {
            S.flags.jade = true;
            next('jade', 2)(S, W);
            return { text: '玉佩入手温凉，断口处有一道极细的血纹。你把它贴在胸口，像揣着一块冰。', fx: {} };
          } },
        { text: '不收', hint: '不想欠人情',
          run: function (S, W) {
            W.setChain('jade', -1);
            return { text: '老道看了你一眼，把玉佩收回袖里，没再说话。茶凉了，他也没添。', fx: {} };
          } }
      ]
    },
    {
      id: 'ch_jade2', chain: 'jade', step: 2, title: '青玉佩（二）', weight: 30,
      text: '一个穿灰袍的中年修士在街口拦住你，手里捏着半块青玉佩，断口朝上。' +
        '「小友，你身上那半块，是我的。」',
      options: [
        { text: '还给他', hint: '息事宁人',
          run: function (S, W) {
            S.flags.jade = false;
            W.setChain('jade', 3);
            return { text: '他接过玉佩，两块一合，严丝合缝。他抬头看你，眼神忽然变得很复杂：「你比我当年老实。」说完转身就走。', fx: { fame: 3 } };
          } },
        { text: '问他凭什么', hint: '可能打起来',
          run: function (S, W) {
            W.setChain('jade', 3);
            return {
              text: '他笑了一下，把玉佩收回袖里：「凭我打得过你。」\n\n他抬手时，你才看清他袖口的血色纹路。',
              battle: { realm: Math.min(4, Math.floor(S.step / 13) + 0), count: 1, kind: 'bandit' }
            };
          } },
        { text: '转身就跑', hint: '保命要紧',
          run: function (S, W) {
            W.setChain('jade', -1);
            return { text: '你钻进人堆里，绕了三条巷子才停下。回头看，街口空无一人。', fx: { spd: 1 } };
          } }
      ]
    },
    {
      id: 'ch_jade3', chain: 'jade', step: 3, title: '青玉佩（三）', weight: 30,
      text: '三天后，那半块玉佩被人放在你住处的门槛上。底下压着一张字条：' +
        '「墨师叔让我带句话——他欠你师父一条命，现在还。」',
      options: [
        { text: '按字条上的地址去', hint: '可能有功法',
          run: function (S, W) {
            W.setChain('jade', 4);
            return { text: '城西一间废弃的丹房，桌上放着一只木匣。匣里是三枚培元丹和一卷手抄的《长春功》批注。', fx: { cult: 120, pill: 'peiyuan' } };
          } },
        { text: '把玉佩扔了', hint: '不想跟墨大夫扯上关系',
          run: function (S, W) {
            W.setChain('jade', -1);
            return { text: '你把玉佩扔进了护城河。水花很小，声音很快就没了。', fx: {} };
          } }
      ]
    },

    /* ================= 二、乱葬岗的血尸 ================= */
    {
      id: 'ch_blood1', chain: 'blood', step: 1, title: '血尸（一）', weight: 26,
      loc: 'luanzang',
      text: '乱葬岗的新土在动。一下，两下，像有什么东西在底下用手刨。',
      options: [
        { text: '挖开看看', hint: '危险',
          run: function (S, W) {
            W.setChain('blood', 2);
            return { text: '土下是一具裹着红布的尸体，指甲长得不像人。你刚碰到布角，它就睁开了眼。',
              battle: { realm: Math.min(4, Math.floor(S.step / 13) + 0), count: 1, kind: 'bandit' } };
          } },
        { text: '退开，记下位置', hint: '稳妥',
          run: function (S, W) {
            W.setChain('blood', -1);
            return { text: '你退到土坡后面，看着那堆土慢慢平息下去。记下了位置，但没打算再来。', fx: {} };
          } }
      ]
    },
    {
      id: 'ch_blood2', chain: 'blood', step: 2, title: '血尸（二）', weight: 26,
      text: '血尸被你打散之后，土里露出一块铁牌，牌上刻着一个「炼」字。' +
        '再往深处挖，是一口薄棺，棺盖上钉着七根黑钉。',
      options: [
        { text: '拔钉开棺', hint: '可能有好东西',
          run: function (S, W) {
            W.setChain('blood', 3);
            return { text: '棺里没有尸体，只有一册用血写的《血炼神光》残卷，和一小瓶凝成块的妖血。', fx: { relic: 2, cult: 90 } };
          } },
        { text: '把土填回去', hint: '不该碰的东西别碰',
          run: function (S, W) {
            W.setChain('blood', -1);
            return { text: '你一锹一锹把土填回去，填得很实。做到一半，天亮了。', fx: { dao: 6 } };
          } }
      ]
    },
    {
      id: 'ch_blood3', chain: 'blood', step: 3, title: '血尸（三）', weight: 26,
      text: '当夜，一个披着黑袍的人站在你窗外，声音很轻：' +
        '「我炼的尸，你也敢拆。把东西还回来，我留你一条命。」',
      options: [
        { text: '还给他', hint: '破财消灾',
          run: function (S, W) {
            W.setChain('blood', -1);
            return { text: '你把残卷和妖血从窗缝递出去。他收了，临走前丢下一句：「下次别多管闲事。」', fx: { fame: -2 } };
          } },
        { text: '不还', hint: '打一场',
          run: function (S, W) {
            W.setChain('blood', -1);
            return { text: '他沉默了很久，然后你听见窗框在响。\n\n「那你就陪我的尸一起躺着吧。」',
              battle: { realm: Math.min(4, Math.floor(S.step / 13) + 1), count: 1, kind: 'bandit' } };
          } }
      ]
    },

    /* ================= 三、万宝楼的信 ================= */
    {
      id: 'ch_letter1', chain: 'letter', step: 1, title: '万宝楼的信（一）', weight: 22,
      loc: 'jiayuan',
      text: '万宝楼的老掌柜把你叫到柜台后面，压低了声音：「小友看着面生，正好。' +
        '这封信，替我送到太南山。路上别拆。」信封上什么都没写。',
      options: [
        { text: '接了', hint: '有钱拿',
          run: function (S, W) {
            W.setChain('letter', 2);
            return { text: '他塞给你三十块灵石当路费，又添了一句：「半个月内送到，回来还有重谢。」', fx: { stones: 30 } };
          } },
        { text: '不接', hint: '',
          run: function (S, W) {
            W.setChain('letter', -1);
            return { text: '老掌柜叹了口气，把信收回袖里：「也罢。」', fx: {} };
          } }
      ]
    },
    {
      id: 'ch_letter2', chain: 'letter', step: 2, title: '万宝楼的信（二）', weight: 22,
      text: '离太南山还有半日路程，林子里有人拦路。三个，都是一身灰布，脸上罩着布巾。' +
        '「信留下，人可以走。」',
      options: [
        { text: '交信', hint: '保命',
          run: function (S, W) {
            W.setChain('letter', -1);
            return { text: '他们把信拆开看了一眼，笑了，随手扔进溪里：「早这么懂事，何必让我们跑一趟。」', fx: { fame: -3 } };
          } },
        { text: '拔剑', hint: '一打三',
          run: function (S, W) {
            W.setChain('letter', 2);
            return { text: '你后退半步，把信塞进怀里。他们三个一起动了。',
              battle: { realm: Math.min(4, Math.floor(S.step / 13) + 1), count: 1, kind: 'bandit' } };
          } }
      ]
    },
    {
      id: 'ch_letter3', chain: 'letter', step: 3, title: '万宝楼的信（三）', weight: 22,
      text: '太南山的收信人拆开信，脸色一点点沉下去。他把信递给你看——' +
        '上面只有一行字：「本楼已被人盯上，勿再往来。」',
      options: [
        { text: '回去看看老掌柜', hint: '有后续',
          run: function (S, W) {
            W.setChain('letter', 4);
            return { text: '你赶回嘉元城时，万宝楼的门板已经钉上了。邻居说，三天前的夜里，楼里着了一场火，没烧到外面。', fx: {} };
          } },
        { text: '不管，继续赶路', hint: '',
          run: function (S, W) {
            W.setChain('letter', -1);
            return { text: '你把这件事从脑子里划掉了。天南每天都有人失踪，不差一个掌柜。', fx: {} };
          } }
      ]
    },
    {
      id: 'ch_letter4', chain: 'letter', step: 4, title: '万宝楼的信（四）', weight: 22,
      text: '烧空的柜台底下，你摸到一块活动的砖。砖后是个小铁盒，盒里有一沓灵石、一本账册，' +
        '还有一张画着七个人脸的纸——其中一张，是茶棚里的老道。',
      options: [
        { text: '把账册带走', hint: '以后能拿来换东西',
          run: function (S, W) {
            W.setChain('letter', -1);
            S.flags.ledger = true;
            return { text: '你把账册贴身收好，灵石装了半袋。走出门时，街上已经有人在看你。', fx: { stones: 260, relic: 1 } };
          } },
        { text: '只拿灵石', hint: '少惹事',
          run: function (S, W) {
            W.setChain('letter', -1);
            return { text: '你只把灵石倒进袋里，砖块照原样塞回去。账册留在原处，谁爱拿谁拿。', fx: { stones: 180 } };
          } }
      ]
    },

    /* ================= 四、结丹的机缘 ================= */
    {
      id: 'ch_dan1', chain: 'dan', step: 1, title: '丹方（一）', weight: 18,
      loc: 'jiayuan',
      text: '一个醉醺醺的筑基修士在酒楼里拍桌子，说他手里有半张「凝元丹方」，' +
        '谁给他一百灵石，就把方子讲给谁听。周围的人都当他发酒疯。',
      options: [
        { text: '给他一百灵石', hint: '可能是酒话',
          run: function (S, W) {
            W.setChain('dan', 2);
            return { text: '他收了钱，把方子上的十七味药念了三遍，念到第九味时你听出不对——那味药早绝了。', fx: { stones: -100, cult: 40 } };
          } },
        { text: '听他吹完就走', hint: '',
          run: function (S, W) {
            W.setChain('dan', -1);
            return { text: '你听完就走。走出酒楼时，听见他在背后把桌子拍得更响。', fx: {} };
          } }
      ]
    },
    {
      id: 'ch_dan2', chain: 'dan', step: 2, title: '丹方（二）', weight: 18,
      text: '第二天，那个筑基修士死在城外的水沟里，脸朝下，身上的储物袋空了。' +
        '昨夜同桌的两个人，正在不远处朝你这边看。',
      options: [
        { text: '走过去问', hint: '可能打起来',
          run: function (S, W) {
            W.setChain('dan', 3);
            return { text: '其中一个拦住你，笑得很客气：「他欠我们的东西，你替他还不还？」',
              battle: { realm: Math.min(4, Math.floor(S.step / 13) + 1), count: 1, kind: 'bandit' } };
          } },
        { text: '绕路走', hint: '',
          run: function (S, W) {
            W.setChain('dan', -1);
            return { text: '你拐进另一条街。走出一段路，背后没有脚步声。', fx: {} };
          } }
      ]
    },
    {
      id: 'ch_dan3', chain: 'dan', step: 3, title: '丹方（三）', weight: 18,
      text: '他们身上果然带着那半张方子。方子背面写着另一个地名——偏北三百里的一个山洞。' +
        '据说方子的另半张，就压在洞里的石桌上。',
      options: [
        { text: '去找另半张', hint: '要走远路',
          run: function (S, W) {
            W.setChain('dan', 4);
            S.flags.dan_half = true;
            return { text: '你在山洞里找到另半张方子。两张一拼，缺的那位药是「三百年血参」——正好是你洞府灵田里种得出来的东西。', fx: { cult: 200, relic: 1 } };
          } },
        { text: '把半张卖了', hint: '现钱',
          run: function (S, W) {
            W.setChain('dan', -1);
            return { text: '你把半张方子卖给了坊市的丹师，得了一笔不薄的灵石。他看你的眼神，像在看一个不懂行的人。', fx: { stones: 220 } };
          } }
      ]
    }
  ];

  D.CHAIN_EVENTS = EVENTS;
  D.CHAINS = [
    { id: 'jade', name: '青玉佩', total: 3, hint: '茶棚的老道给了你半块玉。' },
    { id: 'blood', name: '乱葬岗的血尸', total: 3, hint: '有人的尸炼得不对。' },
    { id: 'letter', name: '万宝楼的信', total: 4, hint: '一封信，一趟路，一场火。' },
    { id: 'dan', name: '凝元丹方', total: 4, hint: '半张方子，两条命。' }
  ];
})(typeof globalThis !== 'undefined' ? globalThis : this);
