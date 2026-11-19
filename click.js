// 打开某个调试场景，点第一个选项，看看会不会报运行时错误
// 用法：node tools/click.js 'demo=chain&c=jade&s=0&noanim=1'
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const root = path.resolve(__dirname, '..');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const q = process.argv[2] || 'demo=chain&c=jade&s=0&noanim=1';

let html = fs.readFileSync(path.join(root, 'src', 'index.html'), 'utf8');

const probe = [
  '<script>',
  'window.__e = [];',
  'window.addEventListener("error", function (e) { window.__e.push(String(e.message)); });',
  'setTimeout(function () {',
  '  var btn = document.querySelector(".ev-opt") || document.querySelector(".opt-btn") || document.querySelector(".ev-options button");',
  '  if (btn) btn.click();',
  '  setTimeout(function () {',
  '    var errbar = document.querySelector(".errbar, #errbar, .err-bar");',
  '    document.title = "C:" + JSON.stringify({',
  '      clickable: !!btn,',
  '      clicked: btn ? (btn.textContent || "").trim().slice(0, 20) : null,',
  '      errs: window.__e,',
  '      errbar: errbar ? String(errbar.textContent).slice(0, 160) : null,',
  '      modal: !!document.querySelector(".modal"),',
  '      log: (document.querySelector("#log") ? document.querySelector("#log").textContent : "").trim().slice(-160)',
  '    });',
  '  }, 1200);',
  '}, 1400);',
  '</script>'
].join('\n');

html = html.replace(/<\/body>/i, probe + '</body>');
const tmp = path.join(root, 'src', '_click.html');
fs.writeFileSync(tmp, html, 'utf8');

const prof = path.join(os.tmpdir(), 'cprof' + Date.now());
const args = ['--headless=old', '--no-sandbox', '--disable-gpu', '--no-first-run',
  '--allow-file-access-from-files', '--user-data-dir=' + prof, '--window-size=1440,900',
  '--virtual-time-budget=8000', '--dump-dom',
  'file:///' + tmp.replace(/\\/g, '/') + '?' + q];
const out = execFileSync(CHROME, args, { encoding: 'utf8', timeout: 120000 });
const m = out.match(/<title>([\s\S]*?)<\/title>/);
const title = m ? m[1] : '(none)';
try {
  console.log(JSON.stringify(JSON.parse(title.replace(/^C:/, '')), null, 1));
} catch (e) {
  console.log(title.slice(0, 600));
}
fs.rmSync(tmp, { force: true });
