/**
 * Verifica la integridad de la propia suite de pruebas.
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
const readme = leer(path.join(ROOT, 'README.md'));
const todos = fs.readdirSync(TESTS).filter(f => f.endsWith('.test.js'));
const noDocumentados = todos.filter(f => !readme.includes(f));
assert.deepStrictEqual(noDocumentados, [], 'el README debe documentar todos los archivos de prueba');

console.log(`PASS — ${todos.length} pruebas documentadas, 0 imports rotos, 0 tautologías, 0 mensajes falsos`);
