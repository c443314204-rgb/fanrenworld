const fs = require('fs'), vm = require('vm');
const ctx = { console }; ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of ['data_world.js','data_world2.js']) vm.runInContext(fs.readFileSync('src/'+f,'utf8'), ctx);
const L = ctx.WORLD_DATA.LOCATIONS;
const by = {};
L.forEach(l => { (by[l.region] = by[l.region] || []).push(l.id + '|' + l.name + '|' + l.kind + '|r' + l.realmRec); });
Object.keys(by).forEach(r => { console.log('## ' + r + ' (' + by[r].length + ')'); console.log(by[r].join('\n')); });
