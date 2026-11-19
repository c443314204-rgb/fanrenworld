// 生成 src/index-test.html：在 index.html 基础上注入全局错误捕获，把错误写进 <title>
// 用法：node tools/mktest.js   （之后用 tools/shot.js 截图，错误会出现在标题里）
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const src = path.join(root, 'src', 'index.html');
const out = path.join(root, 'src', 'index-test.html');

let html = fs.readFileSync(src, 'utf8');

const inject = `
<script>
(function () {
  window.__errs = [];
  window.addEventListener('error', function (e) {
    var m = (e.message || 'error') + ' @ ' + String(e.filename || '').split('/').pop() + ':' + (e.lineno || 0);
    window.__errs.push(m);
    document.title = 'JSERR: ' + m;
  }, true);
  window.addEventListener('unhandledrejection', function (e) {
    document.title = 'JSERR: ' + (e.reason && e.reason.message ? e.reason.message : 'rejection');
  });
})();
</script>
`;

html = html.replace(/<body([^>]*)>/i, '<body$1>' + inject);
html = html.replace(/<\/body>/i, `
<div id="__errbar" style="position:fixed;left:0;right:0;bottom:0;z-index:99999;display:none;
  background:#5a1a1a;color:#fff;font:12px/1.5 monospace;padding:4px 8px;white-space:pre-wrap"></div>
<script>
setTimeout(function () {
  if (window.__errs && window.__errs.length) {
    var b = document.getElementById('__errbar');
    b.style.display = 'block';
    b.textContent = window.__errs.slice(0, 4).join('\\n');
  }
}, 1500);
</script>
</body>`);

fs.writeFileSync(out, html, 'utf8');
console.log('probe page written', (html.length / 1024).toFixed(0) + 'KB');
