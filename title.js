const { execFileSync } = require('child_process');
const path = require('path');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const page = path.join(process.cwd(), 'src', 'index-test.html');
const prof = path.join(require('os').tmpdir(), 'cprof' + Date.now());
const q = process.argv[2] || 'demo=bar&noanim=1';
const args = ['--headless=old','--no-sandbox','--disable-gpu','--no-first-run','--allow-file-access-from-files',
  '--user-data-dir=' + prof, '--window-size=1280,800', '--virtual-time-budget=5000', '--dump-dom',
  `file:///${page.replace(/\\/g,'/')}?${q}`];
const out = execFileSync(CHROME, args, { encoding: 'utf8', timeout: 90000 });
const t = out.match(/<title>([\s\S]*?)<\/title>/);
console.log('TITLE:', t ? t[1].slice(0, 300) : '(none)');
