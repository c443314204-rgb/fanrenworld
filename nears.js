const fs = require('fs'), vm = require('vm');
const ctx = { console, globalThis: null };
ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ['data_world.js','data_world2.js']) {
  vm.runInContext(fs.readFileSync('src/'+f,'utf8'), ctx);
}
const L = ctx.WORLD_DATA.LOCATIONS;
const by = {};
L.forEach(l => (by[l.region] = by[l.region] || []).push(l));
for (const r in by) {
  const a = by[r];
  console.log('== ' + r + ' (' + a.length + ')');
  for (let i = 0; i < a.length; i++) for (let j = i+1; j < a.length; j++) {
    const d = Math.hypot(a[i].x-a[j].x, a[i].y-a[j].y);
    if (d < 11) console.log('  近:', a[i].name, `(${a[i].x},${a[i].y})`, '<->', a[j].name, `(${a[j].x},${a[j].y})`, d.toFixed(1));
  }
}
