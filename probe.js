// 把每条事件的每个选项都真正跑一遍，抓运行时错误
// 用法：node tools/probe.js
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const root = path.resolve(__dirname, '..');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

let html = fs.readFileSync(path.join(root, 'src', 'index.html'), 'utf8');

const probe = `
<script>
window.__errs = [];
window.addEventListener('error', function (e) { window.__errs.push(String(e.message)); });
setTimeout(function () {
  var D = window.WORLD_DATA;
  var errs = [], total = 0;
  function tryRun(ev, oi) {
    total++;
    try {
      if (window.W.newGame) W.newGame({ start: ev.loc || 'qingniu' });
      var S = W.state();
      S.step = 6;
      var o = ev.options[oi];
      if (!o || typeof o.run !== 'function') { errs.push(ev.id + '#' + oi + ': no run'); return; }
      o.run(S, W.W);
    } catch (e) {
      var st = String(e.stack || '').split(String.fromCharCode(10)).slice(1, 4).join(' | ');
      errs.push((ev.id || '?') + '#' + oi + ': ' + e.message + ' @ ' + st);
    }
  }
  (D.EXTRA_EVENTS || []).concat(D.CHAIN_EVENTS || []).forEach(function (ev) {
    (ev.options || []).forEach(function (_, oi) { tryRun(ev, oi); });
  });
  document.title = 'R:' + JSON.stringify({ total: total, errs: errs.slice(0, 12), nerr: errs.length });
}, 1500);
</script>
`;

html = html.replace(/<\/body>/i, probe + '</body>');
const tmp = path.join(root, 'src', '_probe.html');
fs.writeFileSync(tmp, html, 'utf8');

const prof = path.join(os.tmpdir(), 'cprof' + Date.now());
const args = ['--headless=old', '--no-sandbox', '--disable-gpu', '--no-first-run',
  '--allow-file-access-from-files', '--user-data-dir=' + prof, '--window-size=1280,900',
  '--virtual-time-budget=9000', '--dump-dom', 'file:///' + tmp.replace(/\\/g, '/')];
const out = execFileSync(CHROME, args, { encoding: 'utf8', timeout: 120000 });
const m = out.match(/<title>([\s\S]*?)<\/title>/);
const title = m ? m[1] : '(none)';
try {
  const j = JSON.parse(title.replace(/^R:/, ''));
  console.log('跑了', j.total, '个选项，错误', j.nerr, '条');
  j.errs.forEach(function (e) { console.log('  -', e); });
} catch (e) {
  console.log(title.slice(0, 800));
}
fs.rmSync(tmp, { force: true });
