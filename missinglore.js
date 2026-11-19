const fs = require('fs'), vm = require('vm');
const ctx = { console }; ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of ['data_world.js','data_world2.js']) vm.runInContext(fs.readFileSync('src/'+f,'utf8'), ctx);
vm.runInContext(fs.readFileSync('src/data_lore.js','utf8'), ctx);
const L = ctx.WORLD_DATA.LOCATIONS, LOC = ctx.LORE.LOC;
const missing = L.filter(l => !LOC[l.id]).map(l => l.id + '|' + l.name);
const have = L.length - missing.length;
console.log('have', have, 'missing', missing.length);
console.log(missing.join('\n'));
