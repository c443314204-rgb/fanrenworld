const fs = require('fs');
let u = fs.readFileSync('src/ui.js', 'utf8');
u = u.replace(`      if (W.autoEquip) W.autoEquip();
      else { S.loadout = []; }
      show('build'); renderAll();`,
`      if (W.autoEquip) W.autoEquip();
      show('build'); renderBuild();`);
fs.writeFileSync('src/ui.js', u, 'utf8');
console.log('ok');
