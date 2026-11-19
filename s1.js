const fs = require('fs');

/* ---------- 一、窄屏布局：删掉覆盖单列的那行裸规则 ---------- */
let c = fs.readFileSync('src/style.css', 'utf8');
const bad = '\n.loc-panel { grid-column: 2; grid-row: 2; }\n';
if (!c.includes(bad)) console.log('WARN: 未找到那行裸规则');
c = c.replace(bad, '\n');

const oldQ = `@media (max-width: 860px) {
  .map-main { grid-template-columns: 1fr; }
  .map-card { height: 52vh; border-right: none; border-bottom: 1px solid var(--line); }
  .loc-panel { border-left: none; }
}`;
const newQ = `@media (max-width: 860px) {
  .map-main {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto 46vh minmax(0, 1fr);
  }
  .region-bar { grid-column: 1; grid-row: 1; }
  .map-card {
    grid-column: 1; grid-row: 2; height: 46vh;
    border-right: none; border-bottom: 1px solid var(--line);
  }
  .loc-panel { grid-column: 1; grid-row: 3; border-left: none; }
}`;
if (!c.includes(oldQ)) { console.log('WARN: 未找到 860 媒体块'); } else { c = c.replace(oldQ, newQ); }

/* ---------- 二、字号 ---------- */
c = c.replace('.loc-desc { font-size: 13px; color: var(--ink-2); line-height: 1.9; margin-bottom: 14px; }',
              '.loc-desc { font-size: 14px; color: var(--ink-2); line-height: 1.95; margin-bottom: 14px; }');
c = c.replace(`  font-size: 12.5px; line-height: 2; color: var(--ink-3);
  border-left: 2px solid var(--line); background: rgba(0,0,0,.18);`,
`  font-size: 13.5px; line-height: 2.05; color: var(--ink-2);
  border-left: 2px solid var(--line); background: rgba(0,0,0,.18);`);
c = c.replace('.loc-kicker { font-size: 10.5px;', '.loc-kicker { font-size: 11.5px;');
c = c.replace('.loc-name { font-size: 24px;', '.loc-name { font-size: 25px;');

/* 序号码改成可输入 */
c = c.replace(`.spell-slot .ss-n {
  width: 22px; height: 22px; line-height: 21px; text-align: center; font-size: 11px;
  border: 1px solid var(--gold-dim); color: var(--gold); border-radius: 50%;
}`,
`.spell-slot .ss-n {
  width: 26px; height: 26px; line-height: 24px; text-align: center; font-size: 12px;
  border: 1px solid var(--gold-dim); color: var(--gold); border-radius: 50%;
}
input.ss-n {
  -webkit-appearance: none; appearance: none; box-sizing: border-box;
  background: rgba(201, 169, 97, .06); font-family: inherit; cursor: text;
  transition: all .15s; padding: 0;
}
input.ss-n::-webkit-outer-spin-button,
input.ss-n::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
input.ss-n:hover { border-color: var(--gold); background: rgba(201, 169, 97, .14); }
input.ss-n:focus { outline: none; border-color: var(--gold-2); color: var(--gold-2); background: rgba(201, 169, 97, .2); }`);

fs.writeFileSync('src/style.css', c, 'utf8');
console.log('CSS 改完');
