/**
 * All-in-one server: serve static files + CORS proxy
 * Chạy: node proxy.js
 * Mở:   http://localhost:9999
 */
const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');

const PORT    = 9999;
const ROOT    = __dirname;
const MIME    = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

// ── Static file handler ──────────────────────────────────────────────────────
function serveStatic(req, res) {
  let filePath = path.join(ROOT, req.url === '/' ? 'index.html' : req.url);
  // Basic path traversal guard
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

// ── Proxy handler ─────────────────────────────────────────────────────────────
function handleProxy(req, res) {
  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    let payload;
    try { payload = JSON.parse(body); } catch (e) {
      res.writeHead(400); res.end(JSON.stringify({ error: 'Bad JSON: ' + e.message })); return;
    }

    const { url: targetUrl, method = 'GET', headers = {}, body: reqBody } = payload;
    if (!targetUrl) { res.writeHead(400); res.end(JSON.stringify({ error: 'Missing url' })); return; }

    let parsed;
    try { parsed = new URL(targetUrl); } catch (e) {
      res.writeHead(400); res.end(JSON.stringify({ error: 'Invalid URL: ' + e.message })); return;
    }

    const isHttps = parsed.protocol === 'https:';
    const lib     = isHttps ? https : http;
    const options = {
      hostname: parsed.hostname,
      port:     parsed.port || (isHttps ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method:   method.toUpperCase(),
      headers,
    };

    console.log(`  → ${options.method} ${targetUrl}`);

    const proxyReq = lib.request(options, proxyRes => {
      let data = '';
      proxyRes.setEncoding('utf8');
      proxyRes.on('data', c => data += c);
      proxyRes.on('end', () => {
        console.log(`  ← ${proxyRes.statusCode} (${data.length} chars)`);
        res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(data);
      });
    });

    proxyReq.on('error', e => {
      console.error('  ✗ Proxy error:', e.message);
      res.writeHead(502); res.end(JSON.stringify({ error: e.message }));
    });

    if (reqBody) proxyReq.write(reqBody);
    proxyReq.end();
  });
}

// ── Main server ──────────────────────────────────────────────────────────────
http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  if (url === '/proxy' && req.method === 'POST') {
    handleProxy(req, res);
  } else {
    serveStatic(req, res);
  }
}).listen(PORT, () => {
  console.log('');
  console.log('┌─────────────────────────────────────────┐');
  console.log('│  🏆  Bảng Vinh Danh — Server đang chạy  │');
  console.log('│                                         │');
  console.log(`│  👉  http://localhost:${PORT}              │`);
  console.log('│                                         │');
  console.log('│  Ctrl+C để dừng                         │');
  console.log('└─────────────────────────────────────────┘');
  console.log('');
});
