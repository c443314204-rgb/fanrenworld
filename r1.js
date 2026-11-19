const fs = require('fs');
let p = fs.readFileSync('src/data_place.js', 'utf8');
p = p.split("转身下樓").join("转身下楼");
p = p.split(", heritage: 1").join("");
fs.writeFileSync('src/data_place.js', p, 'utf8');

let h = fs.readFileSync('src/index.html', 'utf8');
if (!h.includes('data_lore2.js')) {
  h = h.replace('<script src="data_lore.js"></script>', '<script src="data_lore.js"></script>\n  <script src="data_lore2.js"></script>');
}
if (!h.includes('data_place.js')) {
  h = h.replace('<script src="data_event3.js"></script>', '<script src="data_event3.js"></script>\n  <script src="data_place.js"></script>\n  <script src="data_place2.js"></script>');
}
fs.writeFileSync('src/index.html', h, 'utf8');
console.log('patched');
