// 把 src/ 下的页面、样式与脚本内联成一个单文件 HTML
const fs = require('fs');
const path = require('path');

const dir = __dirname;
let html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');

const css = fs.readFileSync(path.join(dir, 'style.css'), 'utf8').replace(/^\uFEFF/, '');
html = html.replace('<link rel="stylesheet" href="style.css">', '<style>\n' + css + '\n</style>');

const re = /<script src="([^"]+)"><\/script>/g;
const seen = [];
html = html.replace(re, (m, file) => {
  const p = path.join(dir, file);
  if (!fs.existsSync(p)) throw new Error('script not found: ' + file);
  seen.push(file);
  const js = fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
  if (js.includes('</script')) throw new Error(file + ' contains </script>, cannot inline');
  return '<script>\n/* ==== ' + file + ' ==== */\n' + js + '\n</script>';
});
if (!seen.length) throw new Error('no script tags found in index.html');
if (!seen.includes('ui.js')) throw new Error('ui.js not inlined');

const root = path.join(dir, '..');
function out(rel, content) {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, 'utf8');
}

out('凡人修仙传-人界.html', html);
out(path.join('便携版', 'Game.html'), html);
out(path.join('便携版', '开始游戏.cmd'), [
  '@echo off',
  'rem Fanren Xiuxian Zhuan - double-click to play offline',
  'cd /d "%~dp0"',
  'start "" "%~dp0Game.html"',
  'exit',
].join('\r\n'));
out(path.join('便携版', '说明.txt'), [
  '凡人修仙传 · 人界（沙盒框架 v17）',
  '================================',
  '',
  '怎么玩：',
  '  1. 双击「开始游戏.cmd」（或直接双击 Game.html）',
  '  2. 起手是凡人：没有功法，也没钱',
  '  3. 先去青牛镇茶棚，老道给《长春功》，引气入体才算炼气',
  '  4. 顶栏五个域：天南 / 乱星海 / 大晋 / 极西之地 / 慕兰草原，跨域要坐传送阵',
  '  5. 修炼按年算，灵根决定快慢；大境界要有天材地宝才冲得动',
  '  6. 谋生：采药、挖矿、悬赏、炼丹炼器、坊市倒手、辟洞府收灵草',
  '  7. 洞府里可以种灵田、开丹房器坊、打木人桩测每个法术的伤害',
  '',
  '同人作品，致敬忘语《凡人修仙传》。',
].join('\r\n'));

console.log('built bytes', Buffer.byteLength(html, 'utf8'), '| inlined:', seen.join(', '));
