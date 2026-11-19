const fs = require('fs');
const files = ['src/data_world.js', 'src/data_world2.js'];
let rows = [];
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  const re = /id: '([a-z_0-9]+)', name: '([^']+)'[^\n]*?x: ([\d.]+), y: ([\d.]+)/g;
  let m;
  while ((m = re.exec(s))) {
    if (m[1] === 'tiannan' || m[1] === 'luanxing') continue;
    rows.push({ id: m[1], name: m[2], x: +m[3], y: +m[4], f });
  }
}
rows.sort((a, b) => a.y - b.y || a.x - b.x);
console.log('总计', rows.length, '个地点');
for (const r of rows) {
  const near = rows.filter(o => o !== r && Math.abs(o.x - r.x) < 7 && Math.abs(o.y - r.y) < 5.5).map(o => o.name).join(' / ');
  console.log(`${String(r.y).padStart(5)} ${String(r.x).padStart(5)}  ${r.name}${near ? '   << 挤: ' + near : ''}`);
}
