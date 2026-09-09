/**
 * DIGNITI ADMIN COMMAND CENTER - LOCAL HTTP SERVER
 * Built with native Node.js (v24 compatible with --env-file=.env)
 * Features: Zero-dependency static file server & REST API proxy.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 8080;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS Headers for API requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API Endpoint: /api/config
  if (pathname === '/api/config' && req.method === 'GET') {
    const safeConfig = {
      spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID || '',
      tabRegistrasi: process.env.GOOGLE_SHEETS_TAB_REGISTRASI || 'DB_Registrasi_Webinar',
      tabPresensi: process.env.GOOGLE_SHEETS_TAB_PRESENSI || 'DB_Presensi_&_Sertifikat',
      sheetsApiKey: process.env.GOOGLE_SHEETS_API_KEY ? 'CONFIGURED' : '',
      gasWebAppUrl: process.env.GOOGLE_APPS_SCRIPT_WEB_APP_URL || '',
      adminPhone: process.env.ADMIN_WHATSAPP_NUMBER || '6289681077483',
      defaultSpeaker: process.env.DEFAULT_SPEAKER || 'diyah',
      serverPort: PORT,
      status: 'ONLINE'
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(safeConfig, null, 2));
    return;
  }

  // API Endpoint: /api/health
  if (pathname === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'OK', uptime: process.uptime(), time: new Date() }));
    return;
  }

  // Static File Serving
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

  // Security: prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found: ' + pathname);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log('\n================================================================');
  console.log('🚀 DIGNITI ADMIN COMMAND CENTER IS RUNNING!');
  console.log('================================================================');
  console.log(`🌐 Local URL    : http://localhost:${PORT}`);
  console.log(`📋 Mode         : Node.js with .env Environment Loader`);
  console.log(`📁 Workspace    : ${__dirname}`);
  console.log(`📲 Admin Hotline: +${process.env.ADMIN_WHATSAPP_NUMBER || '6289681077483'}`);
  console.log(`📊 Spreadsheet  : ${process.env.GOOGLE_SPREADSHEET_ID || 'Pending ID'}`);
  console.log('================================================================\n');
});
