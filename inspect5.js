const fs = require('fs'), vm = require('vm');
const ctx = { console }; ctx.globalThis = ctx; vm.createContext(ctx);
const files = ['data_tech.js','data_char.js','data_world.js','data_world2.js','data_lore.js','data_quest.js','data_dialogue.js','data_extra.js','data_start.js','data_sect.js','data_cave.js','data_wiki.js','data_event2.js','data_chain.js','data_event3.js','data_trim.js'];
for (const f of files) vm.runInContext(fs.readFileSync('src/'+f,'utf8'), ctx);
const T = ctx.TECHS;
const counts = {};
Object.keys(T).forEach(id => { const n = T[id].spells.length; counts[n] = (counts[n]||0)+1; });
console.log('tech total', Object.keys(T).length, 'spell-count histogram', JSON.stringify(counts));
['changchun','qingyuan1','qiyin','xuanyin'].forEach(id => {
  if (T[id]) console.log(id, T[id].name, '->', T[id].spells.map(s => ctx.SPELLS[s].name).join(' / '));
});
