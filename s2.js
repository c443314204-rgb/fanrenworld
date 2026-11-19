const fs = require('fs');
let c = fs.readFileSync('src/style.css', 'utf8');
const oldQ = `@media (max-width: 860px) {
  .map-screen { height: auto; overflow: visible; }
  .map-main { grid-template-columns: 1fr; }
  .map-card { height: 52vh; border-right: none; border-bottom: 1px solid var(--line); }
  .loc-panel { border-left: none; }`;
const newQ = `@media (max-width: 860px) {
  .map-screen { height: auto; overflow: visible; }
  .map-main {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto 44vh minmax(0, 1fr);
  }
  .region-bar { grid-column: 1; grid-row: 1; }
  .map-card {
    grid-column: 1; grid-row: 2; height: 44vh;
    border-right: none; border-bottom: 1px solid var(--line);
  }
  .loc-panel { grid-column: 1; grid-row: 3; border-left: none; }
  .rg-btn { font-size: 12px; padding: 4px 9px; letter-spacing: .08em; }`;
if (!c.includes(oldQ)) { console.log('MISS'); process.exit(1); }
c = c.replace(oldQ, newQ);
fs.writeFileSync('src/style.css', c, 'utf8');
console.log('860 媒体块已重写');
