// 用 headless chrome 截图/取 DOM
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const root = path.resolve(__dirname, '..');
const page = process.env.SHOT_PAGE || path.join(process.cwd(), 'src', 'index-test.html');
const q = process.argv[2] || 'demo=map&noanim=1';
const out = process.argv[3] || 'preview/shot.png';
const w = process.argv[4] || '1440', h = process.argv[5] || '900';
const budget = process.argv[6] || '2600';
const prof = path.join(require('os').tmpdir(), 'cprof' + Date.now());
const args = ['--headless=old', '--allow-file-access-from-files', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
  '--no-first-run', '--user-data-dir=' + prof, `--window-size=${w},${h}`,
  '--virtual-time-budget=' + budget, '--screenshot=' + path.join(root, out),
  `file:///${page}?${q}`];
try { execFileSync(CHROME, args, { stdio: 'ignore', timeout: 60000 }); } catch (e) {}
try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) {}
console.log('shot ->', out);
