/* =============================================================
   无头跑局：不需要浏览器
     node test-run.js [局数] [--aggr=0.5] [--seed=1]
   ============================================================= */
'use strict';
const path = require('path');
require(path.join(__dirname, 'src', 'data_tech.js'));
require(path.join(__dirname, 'src', 'data_char.js'));
require(path.join(__dirname, 'src', 'data_world.js'));
require(path.join(__dirname, 'src', 'data_extra.js'));
require(path.join(__dirname, 'src', 'engine.js'));
require(path.join(__dirname, 'src', 'rules.js'));
require(path.join(__dirname, 'src', 'world.js'));

const g = globalThis;
const W = g.W;
const RUNS = parseInt(process.argv[2] || '20', 10);
const SEED = parseInt((process.argv.find(a => a.startsWith('--seed=')) || '--seed=20261116').split('=')[1], 10);
const AGGRO = parseFloat((process.argv.find(a => a.startsWith('--aggr=')) || '--aggr=0.35').split('=')[1]);
const rng = g.Engine.mulberry32(SEED);
const pick = a => a[Math.floor(rng() * a.length)];

function playOne() {
  const ident = pick(g.IDENTITIES);
  const learned = ident.techs ? ident.techs.slice() : Object.keys(g.TECHS).filter(t => g.TECHS[t].realm === 0).slice(0, 6);
  const S = W.newGame({
    mode: 'normal', name: '跑局', root: pick(g.ROOTS), identity: ident,
    traits: [pick(g.TRAITS.good), pick(g.TRAITS.bad)], learned
  });
  let battles = 0, wins = 0, events = 0, breaks = 0, kills = 0;
  /* 先去找入门功法：正常人都会先点这个 */
  var sp0 = W.specialAt('qingniu');
  if (sp0) { var o0 = sp0.options[0].run(S, W.W); W.applyFx(o0.fx); W.markSpecial('qingniu'); }
  for (let step = 0; step < 400; step++) {
    if (S.dead) break;
    const r = rng();
    try {
      if (r < AGGRO) {
        const nf = W.npcsAt(S.loc).filter(n => !n.mortal && n.step <= S.step + 3);
        const npcs = nf;
        if (npcs.length) {
          const npc = pick(npcs);
          const lethal = rng() < 0.6;
          const out = lethal ? W.kill(npc) : W.spar(npc, 0);
          const b = W.makeBattle([out.battle]);
          battles++;
          if (b.result === 'win') { wins++; if (lethal) kills++; }
          W.afterBattle(b);
        }
      } else if (r < 0.55) {
        var spx = W.specialAt(S.loc);
        if (spx && rng() < 0.8) {
          var ox = spx.options[0].run(S, W.W);
          W.applyFx(ox.fx); W.markSpecial(S.loc); continue;
        }
        const loc = pick(g.WORLD_DATA.LOCATIONS);
        const res = W.travel(loc.id);
        if (res.event) {
          events++;
          const ev = res.event;
          const opt = pick(ev.options);
          const o = opt.run(S, W.W);
          W.applyFx(o.fx);
          if (o.grantTech && S.learned.indexOf(o.grantTech) < 0) S.learned.push(o.grantTech);
          if (o.battle) {
            const list = [];
            for (let k = 0; k < (o.battle.count || 1); k++) {
              list.push(o.battle.kind === 'beast' ? W.beastUnit(o.battle.realm || 0) : W.banditUnit(o.battle.realm || 0));
            }
            const b = W.makeBattle(list);
            battles++;
            if (b.result === 'win') wins++;
            W.afterBattle(b);
          }
        }
      } else if (r < 0.72) {
        W.meditate(rng() < 0.25 ? 3 : 1);
      } else if (r < 0.85) {
        W.rest();
      } else if (r < 0.95) {
        if (W.canBreak()) { breaks++; W.breakThrough(rng() < 0.5); }
      } else {
        W.addItem('herb', 1);
        W.advanceDays(7);
      }
    } catch (e) {
      console.error('❌ 第 ' + step + ' 步出错：', e && e.stack);
      process.exit(1);
    }
  }
  return {
    step: W.stepName(S.step), age: Math.floor(W.age()), dead: S.dead,
    battles, wins, kills, events, breaks, learned: S.learned.length,
    stones: S.stones, fame: Math.round(S.fame), notoriety: Math.round(S.notoriety)
  };
}

console.log(`\n=== 天南·无头跑局  ${RUNS} 局  seed=${SEED}  好斗度=${AGGRO} ===\n`);
let agg = { battles: 0, wins: 0, kills: 0, age: 0, dead: 0, learned: 0, events: 0 };
for (let i = 0; i < RUNS; i++) {
  const r = playOne();
  agg.battles += r.battles; agg.wins += r.wins; agg.kills += r.kills;
  agg.age += r.age; agg.dead += r.dead ? 1 : 0; agg.learned += r.learned; agg.events += r.events;
  console.log(
    `${String(i + 1).padStart(2)}. ${r.step.padEnd(7, '　')} 享年 ${String(r.age).padStart(3)}  ` +
    `斗法 ${String(r.battles).padStart(2)} 胜 ${String(r.wins).padStart(2)}  ` +
    `杀人 ${r.kills}  功法 ${r.learned}  凶名 ${r.notoriety}  ` +
    (r.dead ? '身死' : '在世')
  );
}
console.log('\n--- 汇总 ---');
console.log('平均进行到：', (agg.age / RUNS).toFixed(1), '岁');
console.log('平均斗法：', (agg.battles / RUNS).toFixed(1), '场，胜率', (agg.wins / Math.max(1, agg.battles) * 100).toFixed(0) + '%');
console.log('平均杀人：', (agg.kills / RUNS).toFixed(1), ' 平均遇事：', (agg.events / RUNS).toFixed(1), ' 平均功法：', (agg.learned / RUNS).toFixed(1));
console.log('身死：', agg.dead, '/', RUNS);
