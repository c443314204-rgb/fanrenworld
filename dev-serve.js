// 零依赖预览服务器：node dev-serve.js  →  http://127.0.0.1:8138/
const http = require('http');
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const PORT = parseInt(process.env.PORT || '8138', 10);
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/') rel = '/index.html';
  const file = path.join(dir, rel);
  if (!file.startsWith(dir)) { res.statusCode = 403; return res.end('forbidden'); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.statusCode = 404; return res.end('not found: ' + rel); }
    res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.end(buf);
  });
}).listen(PORT, '127.0.0.1', () => {
  console.log('凡人修仙传·斗法 预览： http://127.0.0.1:' + PORT + '/');
  console.log('调试直达： ?demo=roll / build / battle / end');
});
