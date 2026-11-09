// Assembles the self-contained index.html from src/app.html.
//   node tools/build.mjs                  -> index.html
//   node tools/build.mjs --artifact <out> -> also writes a body-only variant for hosts
//                                            that wrap the page in their own <html> skeleton
// It inlines: orbits.js (verbatim, minus the `export` keywords), the vendored
// OrbitControls (three.js r180, MIT) and the textures as data URIs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

let html = read('src/app.html');

// --- orbits.js -> an object `O` holding every export
const orbitsSrc = read('orbits.js').replace(/^export /gm, '');
const names = [...read('orbits.js').matchAll(/^export (?:const|function) (\w+)/gm)].map((m) => m[1]);
const orbits = `const O = (() => {\n${orbitsSrc}\nreturn { ${names.join(', ')} };\n})();`;

// --- OrbitControls: swap its bare `three` import for the already-imported namespace
let oc = read('vendor/OrbitControls.js');
const imp = oc.match(/^import \{([^}]+)\} from 'three';/m);
if (!imp) throw new Error('OrbitControls import not found');
oc = oc.replace(imp[0], `const {${imp[1]}} = THREE;`).replace(/^export \{ OrbitControls \};\s*$/m, '');
const controls = `// OrbitControls from three.js r180 (MIT License, © three.js authors) — not hosted on cdnjs, so vendored here.\nconst OrbitControls = (() => {\n${oc}\nreturn OrbitControls;\n})();`;

// --- textures
const mime = { '.jpg': 'image/jpeg', '.png': 'image/png' };
const tex = {};
const dir = path.join(root, 'textures');
for (const f of fs.existsSync(dir) ? fs.readdirSync(dir).sort() : []) {
  const ext = path.extname(f);
  if (!mime[ext]) continue;
  tex[path.basename(f, ext)] = `data:${mime[ext]};base64,${fs.readFileSync(path.join(dir, f)).toString('base64')}`;
}

const put = (marker, value) => {
  if (!html.includes(marker)) throw new Error('marker missing: ' + marker);
  html = html.replace(marker, () => value);
};
put('/*__ORBITS__*/', orbits);
put('/*__ORBITCONTROLS__*/', controls);
put('/*__TEX__*/{}', JSON.stringify(tex));

fs.writeFileSync(path.join(root, 'index.html'), html);
console.log(`index.html  ${(html.length / 1048576).toFixed(2)} MB  (${Object.keys(tex).length} textures embedded)`);

const i = process.argv.indexOf('--artifact');
if (i > -1) {
  const body = html
    .replace(/<!DOCTYPE html>\s*/i, '')
    .replace(/<\/?(html|head|body)[^>]*>\s*/gi, '')
    .replace(/<meta charset[^>]*>\s*/i, '')
    .replace(/<meta name="viewport"[^>]*>\s*/i, '');
  fs.writeFileSync(process.argv[i + 1], body);
  console.log('artifact variant ->', process.argv[i + 1]);
}
