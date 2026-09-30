// Relative path denetleyicisi.
// Windows dosya sistemi büyük/küçük harf ayırmaz, GitHub Pages (Linux) ayırır:
// './Lib.js' yerelde çalışır, yayında 404 verir. Ayrıca '/js/x.js' gibi
// root-absolute path'ler repo alt dizininde (username.github.io/repo/) kırılır.
// Taranan: JS import/export/import()/new URL(…, import.meta.url)/fetch/Worker,
// HTML src/href/srcset, CSS url()/@import.
// Kullanım: node tools/check-paths.js   (sorun varsa exit code 1)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SKIP_DIRS = new Set(['node_modules', '.git', '.superpowers', '.claude', '.playwright-mcp', '_site']);
const IGNORE_MARKER = 'check-paths: ignore-file';

// base: 'file' → dosyanın klasörüne göre, 'root' → belgeye (index.html = kök) göre çözülür.
// bare: true → önek yoksa da relative sayılır (HTML/CSS); JS'te bare = paket adı.
const JS_PATTERNS = [
  { re: /\b(?:import|export)\s[^'"`;]*?\bfrom\s*(['"])([^'"]+)\1/g, base: 'file' },
  { re: /\bimport\s*(['"])([^'"]+)\1/g, base: 'file' },
  { re: /\bimport\s*\(\s*(['"`])([^'"`$]+)\1\s*\)/g, base: 'file' },
  { re: /\bnew\s+URL\s*\(\s*(['"`])([^'"`$]+)\1\s*,\s*import\.meta\.url/g, base: 'file' },
  { re: /\bfetch\s*\(\s*(['"`])([^'"`$]+)\1/g, base: 'root' },
  { re: /\bnew\s+(?:Shared)?Worker\s*\(\s*(['"`])([^'"`$]+)\1/g, base: 'root' },
];
const HTML_PATTERNS = [
  { re: /\b(?:src|href)\s*=\s*(["'])([^"']+)\1/g, base: 'file', bare: true },
  { re: /\bsrcset\s*=\s*(["'])([^"']+)\1/g, base: 'file', bare: true, list: true },
];
const CSS_PATTERNS = [
  { re: /url\(\s*(['"]?)([^'")]+)\1\s*\)/g, base: 'file', bare: true },
  { re: /@import\s+(['"])([^'"]+)\1/g, base: 'file', bare: true },
];

function collectFiles(root) {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name));
      } else if (/\.(m?js|html|css)$/.test(entry.name)) {
        out.push(path.join(dir, entry.name));
      }
    }
  };
  walk(root);
  return out;
}

// Yorumlar: blok yorumlar ve satır başı/boşluk sonrası // yorumları (URL içindeki // korunur).
function stripComments(source, kind) {
  let s = source.replace(/\/\*[\s\S]*?\*\//g, '');
  if (kind === 'js') s = s.replace(/(^|\s)\/\/[^\n]*/g, '$1');
  if (kind === 'html') s = s.replace(/<!--[\s\S]*?-->/g, '');
  return s;
}

function classify(spec, bare) {
  if (spec.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(spec) || spec.startsWith('#')) return 'skip';
  if (spec.startsWith('/')) return 'root-absolute';
  if (spec.startsWith('./') || spec.startsWith('../')) return 'relative';
  return bare ? 'relative' : 'skip'; // JS'te bare specifier = paket
}

// Hedefi kökten başlayarak segment segment, harf büyüklüğüne duyarlı arar.
function checkTarget(root, target) {
  const rel = path.relative(root, target);
  if (rel === '') return null; // kökün kendisi (ör. href="./")
  if (rel.startsWith('..') || path.isAbsolute(rel)) return fs.existsSync(target) ? null : 'missing';
  let current = root;
  for (const segment of rel.split(path.sep)) {
    let names;
    try {
      names = fs.readdirSync(current);
    } catch {
      return 'missing';
    }
    if (!names.includes(segment)) {
      return names.some((n) => n.toLowerCase() === segment.toLowerCase()) ? 'case-mismatch' : 'missing';
    }
    current = path.join(current, segment);
  }
  return null;
}

export function findPathProblems(rootDir) {
  const root = path.resolve(rootDir);
  const problems = [];

  for (const file of collectFiles(root)) {
    const raw = fs.readFileSync(file, 'utf8');
    if (raw.slice(0, 300).includes(IGNORE_MARKER)) continue;
    const kind = file.endsWith('.html') ? 'html' : file.endsWith('.css') ? 'css' : 'js';
    const source = stripComments(raw, kind);
    const patterns = kind === 'html' ? HTML_PATTERNS : kind === 'css' ? CSS_PATTERNS : JS_PATTERNS;
    const seen = new Set();

    const check = (specifier, { base, bare }) => {
      if (seen.has(specifier)) return;
      seen.add(specifier);
      const cls = classify(specifier, bare);
      if (cls === 'skip') return;
      const report = (k) => problems.push({ file: path.relative(root, file), specifier, kind: k });
      if (cls === 'root-absolute') return report('root-absolute');
      const clean = specifier.split(/[?#]/)[0];
      const baseDir = base === 'root' ? root : path.dirname(file);
      const problem = checkTarget(root, path.resolve(baseDir, clean));
      if (problem) report(problem);
    };

    for (const pattern of patterns) {
      for (const match of source.matchAll(pattern.re)) {
        const value = match[2].trim();
        if (pattern.list) {
          for (const candidate of value.split(',')) {
            const url = candidate.trim().split(/\s+/)[0];
            if (url) check(url, pattern);
          }
        } else {
          check(value, pattern);
        }
      }
    }
  }
  return problems;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
  const problems = findPathProblems(root);
  for (const p of problems) console.log(`${p.kind.padEnd(14)} ${p.file}  →  ${p.specifier}`);
  console.log(problems.length ? `${problems.length} path problemi bulundu.` : 'Path problemi yok.');
  process.exitCode = problems.length ? 1 : 0;
}
