const fs = require('fs');
let u = fs.readFileSync('src/ui.js', 'utf8');
if (!u.includes("demo === 'place'")) {
  u = u.replace("    else if (demo === 'cave') {", `    else if (demo === 'place') {
      var pid = (location.search.match(/pid=([\\w]+)/) || [])[1] || 'q_lingyao';
      var pev = (D.PLACE_EVENTS || []).filter(function (e) { return e.id === pid; })[0];
      if (pev) {
        S.loc = pev.loc; S.step = 6; S.stones = 400;
        show('map'); renderAll(); showEvent(pev);
      }
    }
    else if (demo === 'cave') {`);
  fs.writeFileSync('src/ui.js', u, 'utf8');
}
console.log('place demo added');
