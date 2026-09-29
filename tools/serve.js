// Sıfır bağımlılıklı yerel geliştirme sunucusu.
// Neden: ES module'ler file:// üzerinden çalışmaz; Windows'ta python http.server
// .js dosyalarını registry eşlemesi yüzünden text/plain sunabilir.
// Kullanım: node tools/serve.js [port]   (varsayılan 8080, yalnızca 127.0.0.1)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
};

export function createStaticServer(rootDir) {
  const root = path.resolve(rootDir);

  return http.createServer((req, res) => {
    const send = (status, body, type = 'text/plain; charset=utf-8') => {
      res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
      res.end(body);
    };

    let rel;
    try {
      rel = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
      return send(400, 'Bad Request');
    }

    const filePath = path.resolve(root, '.' + path.sep + rel);
    // Kök dışına çıkış (path traversal) engellenir.
    if (filePath !== root && !filePath.startsWith(root + path.sep)) {
      return send(403, 'Forbidden');
    }

    let target = filePath;
    try {
      if (fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
      const body = fs.readFileSync(target);
      const type = MIME[path.extname(target).toLowerCase()] ?? 'application/octet-stream';
      send(200, body, type);
    } catch {
      send(404, 'Not Found');
    }
  });
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const port = Number(process.argv[2] ?? process.env.PORT ?? 8080);
  const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
  createStaticServer(root).listen(port, '127.0.0.1', () => {
    console.log(`Geliştirme sunucusu: http://127.0.0.1:${port}/`);
  });
}
