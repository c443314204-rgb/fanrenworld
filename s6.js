const fs = require('fs');
let c = fs.readFileSync('src/style.css', 'utf8');

c = c.replace(`.ss-cond {
  margin-top: 6px; width: 100%;`,
`.ss-cond {
  margin-top: 6px; width: 170px; max-width: 100%;`);

c = c.replace(`  .rg-btn { font-size: 12px; padding: 4px 9px; letter-spacing: .08em; }`,
`  .rg-btn { font-size: 12px; padding: 4px 9px; letter-spacing: .08em; }
  .loc-lore { max-height: none; }
  .node .nm { font-size: 12px; }`);

fs.writeFileSync('src/style.css', c, 'utf8');
console.log('tweaks ok');
