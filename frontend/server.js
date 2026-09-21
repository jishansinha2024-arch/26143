const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 3000);
const ROOT = path.join(__dirname, 'build');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
};

function safePath(urlPath) {
  let pathname;
  try { pathname = decodeURIComponent(urlPath.split('?')[0]); }
  catch { return null; }
  const normalized = path.normalize(pathname).replace(/^([/\\])+/, '');
  const full = path.resolve(ROOT, normalized);
  if (!full.startsWith(path.resolve(ROOT) + path.sep) && full !== path.resolve(ROOT)) return null;
  return full;
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Allow': 'GET, HEAD' });
    return res.end('Method Not Allowed');
  }

  const requested = safePath(req.url || '/');
  if (!requested) {
    res.writeHead(400);
    return res.end('Bad Request');
  }

  let file = requested;
  try {
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(ROOT, 'index.html');
  } catch {
    file = path.join(ROOT, 'index.html');
  }

  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Unable to serve application');
    }
    const ext = path.extname(file).toLowerCase();
    const headers = {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
    };
    res.writeHead(200, headers);
    if (req.method === 'HEAD') return res.end();
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Varuna Netra frontend listening on 0.0.0.0:${PORT}`);
});
