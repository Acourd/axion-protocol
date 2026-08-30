'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { inspectFileContent, scanFile } = require('../../tools/vibeguard.js');

console.log('=== AX-F-072 Invariantes Adversariales del Escáner Léxico VibeGuard y Puerta Anti-Vibecoding ===\n');

// 1. Manejo seguro de entradas no textuales
const rNull = inspectFileContent(null);
assert.strictEqual(rNull.status, 'ERROR');
assert.strictEqual(rNull.totalIssues, 0);

const rUndef = inspectFileContent(undefined);
assert.strictEqual(rUndef.status, 'ERROR');
console.log('✓ Manejo seguro y fail-closed de entradas no textuales verificado');

// 2. Invariantes de SILENT_EXCEPTION (Catch mudo vs Catch documentado)
const codigoCatchMudo = `
function test1() {
  try {
    doRisky();
  } catch (err) {
  }
}
function test2() {
  try {
    doAnother();
  } catch {}
}
function test3Valido() {
  try {
    doIgnored();
  } catch (_) {
    // Justificación técnica intencional
  }
}
`;

const resCatch = inspectFileContent(codigoCatchMudo, 'test-catch.js');
assert.strictEqual(resCatch.totalIssues, 2, 'debe detectar exactamente 2 catch mudos');
assert.strictEqual(resCatch.issues.every((i) => i.category === 'SILENT_EXCEPTION'), true);
console.log('✓ Detección de catch mudos y discriminación de catch con comentarios justificados verificada');

// 3. Invariantes de UNFINISHED_CODE (TODO/FIXME/HACK vs Prosa en español vs Strings)
const codigoMarcadores = `
// TODO: refactorizar este algoritmo
// FIXME: reparar fuga de memoria
// HACK: parche temporal para CI
// Todo el mundo sabe que esta funcion es critica (no es marcador)
const mensaje = "Muestra la lista TODO al usuario";
<!-- TODO: migrar componente -->
`;

const resMarcadores = inspectFileContent(codigoMarcadores, 'test-markers.js');
assert.strictEqual(resMarcadores.totalIssues, 4, 'debe detectar exactamente 4 marcadores reales');
assert.strictEqual(resMarcadores.issues.every((i) => i.category === 'UNFINISHED_CODE'), true);
console.log('✓ Detección de marcadores en comentarios y discriminación de prosa en español y strings verificada');

// 4. Invariantes de CSS_OVERRIDE (!important en CSS/cadenas vs comentarios vs regex)
const codigoCSS = `
const styles = \`
  .boton {
    color: red !important;
    background: blue !important;
  }
\`;
// Evitar el uso de !important en estilos (no es CSS real)
const regexCheck = /!important\\s*;/i;
`;

const resCSS = inspectFileContent(codigoCSS, 'test-css.js');
assert.strictEqual(resCSS.totalIssues, 2, 'debe detectar exactamente 2 usos reales de !important en cadenas');
assert.strictEqual(resCSS.issues.every((i) => i.category === 'CSS_OVERRIDE'), true);
console.log('✓ Detección de !important en código CSS y discriminación de comentarios y regex verificada');

// 5. Invariantes de scanFile (archivos inexistentes y directorios)
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-vibeguard-test-'));

try {
  const missingFile = path.join(tempDir, 'no-existe.js');
  const resMissing = scanFile(missingFile);
  assert.strictEqual(resMissing.status, 'ERROR');
  assert.strictEqual(resMissing.reason.includes('no existe'), true);

  const resDir = scanFile(tempDir);
  assert.strictEqual(resDir.status, 'ERROR');
  assert.strictEqual(resDir.reason.includes('es un directorio'), true);

  const validFile = path.join(tempDir, 'clean.js');
  fs.writeFileSync(validFile, 'console.log("Codigo perfectamente limpio");\n', 'utf8');
  const resClean = scanFile(validFile);
  assert.strictEqual(resClean.status, 'CLEAN');
  assert.strictEqual(resClean.totalIssues, 0);
  console.log('✓ Inspección de archivos limpios, inexistentes y directorios con scanFile verificada');

} finally {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (_) {}
}

console.log('\nPASS AX-F-072 — Invariantes de VibeGuard demostrados al 100%.\n');
