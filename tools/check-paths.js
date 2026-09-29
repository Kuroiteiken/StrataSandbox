// Relative path denetleyicisi.
// Windows dosya sistemi büyük/küçük harf ayırmaz, GitHub Pages (Linux) ayırır:
// './Lib.js' yerelde çalışır, yayında 404 verir. Ayrıca '/js/x.js' gibi
// root-absolute path'ler repo alt dizininde (username.github.io/repo/) kırılır.
// Kullanım: node tools/check-paths.js   (sorun varsa exit code 1)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SKIP_DIRS = new Set(['node_modules', '.git', '.superpowers', '.claude']);
const IGNORE_MARKER = 'check-paths: ignore-file';

const JS_PATTERNS = [
  /\b(?:import|export)\s[^'"`;]*?\bfrom\s*(['"])([^'"]+)\1/g, // import x from '…' / export … from '…'
  /\bimport\s*(['"])([^'"]+)\1/g, // import '…'
  /\bimport\s*\(\s*(['"])([^'"]+)\1\s*\)/g, // import('…')
];
const HTML_PATTERN = /\b(?:src|href)\s*=\s*(["'])([^"']+)\1/g;

function collectFiles(root) {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name));
      } else if (/\.(m?js|html)$/.test(entry.name)) {
        out.push(path.join(dir, entry.name));
      }
    }
  };
  walk(root);
  return out;
}

function classify(spec, isHtml) {
  if (spec.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(spec) || spec.startsWith('#')) return 'skip';
  if (spec.startsWith('/')) return 'root-absolute';
  if (spec.startsWith('./') || spec.startsWith('../')) return 'relative';
  return isHtml ? 'relative' : 'skip'; // JS'te bare specifier = paket
}

// Hedefi kökten başlayarak segment segment, harf büyüklüğüne duyarlı arar.
function checkTarget(root, target) {
  const rel = path.relative(root, target);
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
    const source = fs.readFileSync(file, 'utf8');
    if (source.slice(0, 300).includes(IGNORE_MARKER)) continue;
    const isHtml = file.endsWith('.html');
    const patterns = isHtml ? [HTML_PATTERN] : JS_PATTERNS;
    const seen = new Set();

    for (const pattern of patterns) {
      for (const match of source.matchAll(pattern)) {
        const specifier = match[2];
        if (seen.has(specifier)) continue;
        seen.add(specifier);

        const kind = classify(specifier, isHtml);
        if (kind === 'skip') continue;
        const report = (k) => problems.push({ file: path.relative(root, file), specifier, kind: k });
        if (kind === 'root-absolute') {
          report('root-absolute');
          continue;
        }
        const clean = specifier.split(/[?#]/)[0];
        const problem = checkTarget(root, path.resolve(path.dirname(file), clean));
        if (problem) report(problem);
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
