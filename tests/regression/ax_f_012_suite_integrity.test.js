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

// --- 1. Todo símbolo importado de un módulo local debe existir en sus exports ---
const archivosPrueba = fs.readdirSync(TESTS).filter(f => f.endsWith('.test.js'));
const importsRotos = [];
for (const archivo of archivosPrueba) {
  const src = leer(path.join(TESTS, archivo));
  const re = /const\s*\{([^}]+)\}\s*=\s*require\(\s*['"](\.\.[^'"]+)['"]\s*\)/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const nombres = m[1].split(',').map(s => s.trim()).filter(Boolean);
    const mod = require(path.resolve(TESTS, m[2]));
    for (const n of nombres) {
      if (typeof mod[n] === 'undefined') importsRotos.push(`${archivo}: '${n}' no existe en ${m[2]}`);
    }
  }
}
assert.deepStrictEqual(importsRotos, [], 'ninguna prueba debe importar símbolos inexistentes');

// --- 2. El caso "directorio no-git" no puede apuntar a una ruta interna del repositorio ---
const adversarial = leer(path.join(TESTS, 'adversarial.test.js'));
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
const learningGit = leer(path.join(TESTS, 'learning_git.test.js'));
const tautologias = (learningGit.match(/assert\.strictEqual\(\s*typeof\s+\w+(\.\w+)*\s*,\s*'string'\s*\)/g) || []);
assert.strictEqual(tautologias.length, 0, `aserciones tautológicas encontradas: ${tautologias.length}`);

// --- 5. El README debe documentar todos los archivos de prueba ejecutables ---
// Se auditan las tres tandas, no solo la raiz: antes una suite nueva bajo regression/
// o phase_e/ podia quedar sin documentar sin que nadie se enterase.
const readme = leer(path.join(ROOT, 'README.md'));
const suitesDe = (dir) => (fs.existsSync(dir)
  ? fs.readdirSync(dir).filter(f => f.endsWith('.test.js'))
  : []);
const todos = [
  ...suitesDe(TESTS),
  ...suitesDe(path.join(TESTS, 'regression')),
  ...suitesDe(path.join(TESTS, 'phase_e')),
];
const noDocumentados = todos.filter(f => !readme.includes(f));
assert.deepStrictEqual(noDocumentados, [], 'el README debe documentar todos los archivos de prueba');

console.log(`PASS AX-F-012 — ${todos.length} pruebas documentadas, 0 imports rotos, 0 tautologías, 0 mensajes falsos`);

// --- 4. Ningun fichero de codigo puede contener texto doblemente codificado ---
// Se colaron 11 secuencias de mojibake en mensajes que ve el usuario: la vocal acentuada
// aparecia sustituida por dos caracteres basura. Ocurre al guardar un fichero UTF-8 desde
// un editor que lo interpreta como Latin-1. Sin este guardian, reaparecen a la primera
// edicion mal configurada. El propio test no puede incrustar la secuencia, o se delataria.
const mojibake = /[ÂÃ][-¿]/;
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
