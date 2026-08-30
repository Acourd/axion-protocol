/**
 * Regresión AX-F-012 — Integridad de la propia suite de pruebas.
 * Comprueba defectos intrínsecos de los archivos de prueba, no del producto.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const TESTS = path.join(ROOT, 'tests');
const leer = (p) => fs.readFileSync(p, 'utf8');

const DOMINIOS = [
  '01_governance_preflight',
  '02_cryptography_attestation',
  '03_intent_socratic',
  '04_state_recovery',
  '05_adversarial_resilience'
];

// --- 1. Todo símbolo importado de un módulo local debe existir en sus exports ---
const todos = [];
const importsRotos = [];
for (const dom of DOMINIOS) {
  const domDir = path.join(TESTS, dom);
  if (!fs.existsSync(domDir)) continue;
  const files = fs.readdirSync(domDir).filter(f => f.endsWith('.test.js'));
  for (const archivo of files) {
    todos.push(archivo);
    const src = leer(path.join(domDir, archivo));
    const re = /const\s*\{([^}]+)\}\s*=\s*require\(\s*['"](\.\.[^'"]+)['"]\s*\)/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      const nombres = m[1].split(',').map(s => s.trim()).filter(Boolean);
      try {
        const mod = require(path.resolve(domDir, m[2]));
        for (const n of nombres) {
          if (typeof mod[n] === 'undefined') importsRotos.push(`${archivo}: '${n}' no existe en ${m[2]}`);
        }
      } catch (err) {
        importsRotos.push(`${archivo}: error resolviendo ${m[2]} (${err.message})`);
      }
    }
  }
}
assert.deepStrictEqual(importsRotos, [], 'ninguna prueba debe importar símbolos inexistentes');

// --- 2. El caso "directorio no-git" no puede apuntar a una ruta interna del repositorio ---
const adversarial = leer(path.join(TESTS, '05_adversarial_resilience', 'adversarial.test.js'));
assert.ok(
  !/nonGitDir\s*=\s*path\.join\(__dirname,\s*['"]\.\.['"],\s*['"]scratch['"]\)/.test(adversarial),
  'scratch/ está dentro del repositorio git y no sirve como directorio no-git'
);

// --- 3. Ningún mensaje de éxito puede afirmar un comportamiento que no ocurre ---
assert.ok(
  !adversarial.includes('hash de resguardo seguro'),
  'no debe afirmarse la generación de un hash de resguardo que el código no produce'
);

// --- 4. Ninguna aserción puede ser tautológica como única comprobación del caso ---
const learningGit = leer(path.join(TESTS, '03_intent_socratic', 'learning_git.test.js'));
const tautologias = (learningGit.match(/assert\.strictEqual\(\s*typeof\s+\w+(\.\w+)*\s*,\s*'string'\s*\)/g) || []);
assert.strictEqual(tautologias.length, 0, `aserciones tautológicas encontradas: ${tautologias.length}`);

// --- 5. Toda superficie que declare un recuento de suites tiene que cuadrar ---
// 5a/5b. Ambos README declaran el total, y ambos tienen que cuadrar con el árbol.
const superficies = [
  { fichero: 'README.md', patron: /includes \*\*(\d+) deterministic test suites\*\*/ },
  { fichero: 'README.es.md', patron: /incluye \*\*(\d+) suites de prueba deterministas\*\*/ },
];

for (const { fichero, patron } of superficies) {
  const ruta = path.join(ROOT, fichero);
  if (!fs.existsSync(ruta)) continue;
  const m = leer(ruta).match(patron);
  assert.ok(m, `${fichero} debe declarar el total de suites`);
  assert.strictEqual(
    parseInt(m[1], 10), todos.length,
    `${fichero} declara ${m[1]} suites pero existen ${todos.length}`
  );
}

// 5c. La Matriz de Cobertura por Dominios tiene que sumar el total que ella misma declara.
const readme = leer(path.join(ROOT, 'README.md'));
const inicioMatriz = readme.indexOf('Coverage by Domain');
assert.notStrictEqual(inicioMatriz, -1, 'el README debe contener la Matriz de Cobertura por Dominios');

const finMatriz = readme.indexOf('**Total:', inicioMatriz);
assert.notStrictEqual(finMatriz, -1, 'la matriz debe cerrarse con una línea de total');

const filas = readme.slice(inicioMatriz, finMatriz)
  .split(/\r?\n/)
  .map((l) => l.trim().match(/^\|.*\|\s*(\d+)\s*\|$/))
  .filter(Boolean)
  .map((m) => parseInt(m[1], 10));

assert.ok(filas.length >= 2, `la matriz debe tener filas de dominio con recuento, se encontraron ${filas.length}`);

const sumaDominios = filas.reduce((a, b) => a + b, 0);
assert.strictEqual(
  sumaDominios, todos.length,
  `la matriz por dominios suma ${sumaDominios} (${filas.join('+')}) pero existen ${todos.length} suites`
);

const mTotalMatriz = readme.slice(finMatriz).match(/\*\*Total: (\d+) suites/);
assert.ok(mTotalMatriz, 'la matriz debe declarar su total en la línea de cierre');
assert.strictEqual(
  parseInt(mTotalMatriz[1], 10), sumaDominios,
  `la línea de total dice ${mTotalMatriz[1]} pero los dominios suman ${sumaDominios}`
);

console.log(`PASS AX-F-012 — ${todos.length} suites contabilizadas en 2 README y ${filas.length} dominios, 0 imports rotos, 0 tautologías, 0 mensajes falsos`);

// --- 6. Ningun fichero de codigo puede contener texto doblemente codificado ---
const mojibake = /[\u00C2\u00C3][\u0080-\u00BF]/;
const conMojibake = [];

function recorrer(dir) {
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entrada.name === '.phase-e' || entrada.name === 'node_modules') continue;
    const abs = path.join(dir, entrada.name);
    if (entrada.isDirectory()) { recorrer(abs); continue; }
    if (!/\.js$/.test(entrada.name)) continue;
    if (mojibake.test(fs.readFileSync(abs, 'utf8'))) {
      conMojibake.push(path.relative(ROOT, abs).split(path.sep).join('/'));
    }
  }
}
recorrer(path.join(ROOT, 'tools'));
recorrer(TESTS);

assert.deepStrictEqual(
  conMojibake, [],
  'ficheros con texto doblemente codificado (guardalos como UTF-8):\n  - ' + conMojibake.join('\n  - '),
);

console.log('PASS AX-F-012 (mojibake) — sin texto doblemente codificado en tools/ ni tests/');
