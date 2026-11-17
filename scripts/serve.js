import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const root = resolve(process.argv[2] || '.');
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = resolve(root, '.' + (path === '/' ? '/index.html' : path));
    if (!file.startsWith(root + sep) || !Object.hasOwn(types, extname(file))) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    const data = await readFile(file);
    const isImage = extname(file) === '.png';
    res.writeHead(200, {
      'Content-Type': types[extname(file)] + (isImage ? '' : '; charset=utf-8'),
      'Cache-Control': isImage ? 'private, max-age=3600' : 'no-store',
    }).end(data);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`山海同行 http://127.0.0.1:${port}`));
