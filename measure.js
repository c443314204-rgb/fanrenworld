// 量一下斗法场景里每个人物的实际渲染尺寸
// 用法：node tools/measure.js 'demo=battle&noanim=1'
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const root = path.resolve(__dirname, '..');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const q = process.argv[2] || 'demo=battle&noanim=1';

let html = fs.readFileSync(path.join(root, 'src', 'index.html'), 'utf8');
const probe = `
<script>
setTimeout(function () {
  try {
    var stage = document.querySelector('.stage');
    var out = { stage: stage ? [Math.round(stage.getBoundingClientRect().width), Math.round(stage.getBoundingClientRect().height)] : null, figs: [] };
    document.querySelectorAll('.fighter').forEach(function (el) {
      var r = el.getBoundingClientRect();
      var img = el.querySelector('.f-img');
      out.figs.push({
        uid: el.getAttribute('data-uid'),
        cls: el.className,
        box: [Math.round(r.width), Math.round(r.height)], top: Math.round(r.top), bottom: Math.round(r.bottom), hs: getComputedStyle(el).getPropertyValue('--hs'),
        cssH: getComputedStyle(el).height,
        ar: getComputedStyle(el).getPropertyValue('--ar'),
        nat: img ? [img.naturalWidth, img.naturalHeight] : null
      });
    });
    document.title = 'M:' + JSON.stringify(out);
  } catch (e) { document.title = 'ERR:' + e.message; }
}, 2200);
</script>
`;
html = html.replace(/<\/body>/i, probe + '</body>');
const tmp = path.join(root, 'src', '_measure.html');
fs.writeFileSync(tmp, html, 'utf8');

const prof = path.join(os.tmpdir(), 'cprof' + Date.now());
const args = ['--headless=old', '--no-sandbox', '--disable-gpu', '--no-first-run',
  '--allow-file-access-from-files', '--user-data-dir=' + prof, '--window-size=1440,900',
  '--virtual-time-budget=6000', '--dump-dom',
  'file:///' + tmp.replace(/\\/g, '/') + '?' + q];
const out = execFileSync(CHROME, args, { encoding: 'utf8', timeout: 90000 });
const m = out.match(/<title>([\s\S]*?)<\/title>/);
let title = m ? m[1] : '(none)';
try {
  console.log(JSON.stringify(JSON.parse(title.replace(/^M:/, '')), null, 1));
} catch (e) { console.log(title.slice(0, 500)); }
fs.rmSync(tmp, { force: true });
