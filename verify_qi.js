// 验证：拿到起手功法后，修炼面板不再说“你还没引气入体”
// 用法：node tools/verify_qi.js jiayuan
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const root = path.resolve(__dirname, '..');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const loc = process.argv[2] || 'jiayuan';

let html = fs.readFileSync(path.join(root, 'src', 'index.html'), 'utf8');

const probe = [
  '<script>',
  'window.__e = [];',
  'window.addEventListener("error", function (e) { window.__e.push(String(e.message)); });',
  'function pick() { return document.querySelector(".ev-opt"); }',
  'setTimeout(function () {',
  '  var b = pick(); if (b) b.click();',
  '  setTimeout(function () {',
  '    var S = W.state();',
  '    var before = { step: S.step, learned: (S.learned || []).slice(), main: S.mainTech };',
  '    // 关掉弹层，再点“修炼”',
  '    var close = document.querySelector(".modal-close, #modal-close, .md-close");',
  '    if (close) close.click();',
  '    var med = null;',
  '    document.querySelectorAll("#actions button, .act-btn, .action-btn").forEach(function (x) {',
  '      if (!med && /修\\s*炼/.test(x.textContent)) med = x;',
  '    });',
  '    if (med) med.click();',
  '    setTimeout(function () {',
  '      var body = document.querySelector("#modal-body");',
  '      var txt = body ? body.textContent.replace(/\\s+/g, " ").slice(0, 120) : null;',
  '      document.title = "Q:" + JSON.stringify({ before: before, clickedMeditate: !!med, modal: txt, errs: window.__e });',
  '    }, 700);',
  '  }, 900);',
  '}, 1400);',
  '</script>'
].join('\n');

html = html.replace(/<\/body>/i, probe + '</body>');
const tmp = path.join(root, 'src', '_qi.html');
fs.writeFileSync(tmp, html, 'utf8');

const prof = path.join(os.tmpdir(), 'cprof' + Date.now());
const args = ['--headless=old', '--no-sandbox', '--disable-gpu', '--no-first-run',
  '--allow-file-access-from-files', '--user-data-dir=' + prof, '--window-size=1440,900',
  '--virtual-time-budget=9000', '--dump-dom',
  'file:///' + tmp.replace(/\\/g, '/') + '?demo=start&loc=' + loc + '&noanim=1'];
const out = execFileSync(CHROME, args, { encoding: 'utf8', timeout: 120000 });
const m = out.match(/<title>([\s\S]*?)<\/title>/);
const title = m ? m[1] : '(none)';
try { console.log(JSON.stringify(JSON.parse(title.replace(/^Q:/, '')), null, 1)); }
catch (e) { console.log(title.slice(0, 600)); }
fs.rmSync(tmp, { force: true });
