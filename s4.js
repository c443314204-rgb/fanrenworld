const fs = require('fs');
let u = fs.readFileSync('src/ui.js', 'utf8');
if (!u.includes("demo === 'bar'")) {
  u = u.replace("    else if (demo === 'battle') {", `    else if (demo === 'bar') {
      S.step = 6; S.stones = 1200;
      W.grantTech('qingyuan1'); W.grantTech('changchun');
      S.mainTech = 'qingyuan1'; S.subTech = 'changchun';
      if (W.autoEquip) W.autoEquip();
      else { S.loadout = []; }
      show('build'); renderAll();
    }
    else if (demo === 'battle') {`);
  fs.writeFileSync('src/ui.js', u, 'utf8');
}
console.log('bar demo ok');
