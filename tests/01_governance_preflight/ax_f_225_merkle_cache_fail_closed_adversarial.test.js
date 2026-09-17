'use strict';

/**
 * AX-F-225: Invariantes adversariales de la caché Merkle fail-closed.
 *
 * Demuestra que la corrección P0-A cierra el fail-open original:
 * 1. Cuatro fases `false` (o ausentes) nunca autorizan Fast-Forward.
 * 2. Cambios en configuración publicada, workflows u hooks invalidan la caché.
 * 3. Caché corrupta, incompleta o de formato antiguo bloquea Fast-Forward.
 * 4. Errores de lectura bloquean Fast-Forward y el sellado.
 * 5. Renombrar un archivo cambia el Merkle Root (la hoja vincula ruta + contenido).
 */

const assert = require('assert');
const { crearSandbox } = require('../../tools/test_sandbox.js');
const fs = require('fs');
const path = require('path');
const MerkleCacheEngine = require('../../tools/merkle_cache_fast_forward.js');

console.log('=== AX-F-225 Caché Merkle fail-closed: pruebas adversariales ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sandbox = crearSandbox('merkle-adversarial');

const ALL_TRUE = {
  testsPassed: true,
  vibeGuardPassed: true,
  smtProofPassed: true,
  chaosFuzzPassed: true
};

function escribir(rel, contenido) {
  const abs = path.join(sandbox, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, contenido, 'utf8');
}

try {
  escribir('tools/modulo.js', 'module.exports = 1;');
  escribir('tests/modulo.test.js', 'console.log("test");');
  escribir('package.json', JSON.stringify({ name: 'sandbox', version: '1.0.0' }));
  escribir('opencode.json', JSON.stringify({ $schema: 'x' }));
  escribir('.github/workflows/ci.yml', 'name: CI\non: push\n');
  escribir('.agents/hooks/validate.mjs', 'export const ok = true;\n');

  const engine = new MerkleCacheEngine(sandbox);

  // 1. Cuatro fases false: jamás un éxito
  const inicial = engine.computeMerkleRoot();
  assert.strictEqual(inicial.readErrors.length, 0, 'La superficie inicial debe ser legible');
  const selladoFalse = engine.sealState(inicial, {
    testsPassed: false,
    vibeGuardPassed: false,
    smtProofPassed: false,
    chaosFuzzPassed: false
  });
  assert.strictEqual(selladoFalse.sealed, true, 'El sellado debe registrar las fases tal como se aportan');
  const evalFalse = engine.evaluateFastForward();
  assert.strictEqual(evalFalse.canFastForward, false, 'Cuatro fases false no pueden autorizar Fast-Forward');
  assert.match(evalFalse.reason, /Fases no verificadas/);
  console.log('✓ Cuatro fases false bloquean Fast-Forward (sin fail-open)');

  // 2. Fase ausente: no se inventa
  engine.sealState(inicial, { testsPassed: true });
  const evalParcial = engine.evaluateFastForward();
  assert.strictEqual(evalParcial.canFastForward, false, 'Una fase ausente no puede asumirse true');
  console.log('✓ Fases ausentes bloquean Fast-Forward');

  // 3. Las cuatro fases true autorizan solo con Merkle Root idéntico
  engine.sealState(inicial, ALL_TRUE);
  const evalOk = engine.evaluateFastForward();
  assert.strictEqual(evalOk.canFastForward, true, 'Con las 4 fases verdes y raíz idéntica debe autorizar');
  console.log('✓ Las 4 fases verdes autorizan Fast-Forward con raíz idéntica');

  // 4. Mutaciones de configuración relevante invalidan la caché
  const mutaciones = [
    ['package.json', JSON.stringify({ name: 'sandbox', version: '2.0.0' })],
    ['.github/workflows/ci.yml', 'name: CI\non: pull_request\n'],
    ['.agents/hooks/validate.mjs', 'export const ok = false;\n'],
    ['opencode.json', JSON.stringify({ $schema: 'y' })],
    ['tools/modulo.js', 'module.exports = 2;']
  ];
  for (const [archivo, nuevoContenido] of mutaciones) {
    engine.sealState(engine.computeMerkleRoot(), ALL_TRUE);
    const original = fs.readFileSync(path.join(sandbox, archivo), 'utf8');
    fs.writeFileSync(path.join(sandbox, archivo), nuevoContenido, 'utf8');
    const ev = engine.evaluateFastForward();
    assert.strictEqual(ev.canFastForward, false, `Mutar ${archivo} debe invalidar el Fast-Forward`);
    fs.writeFileSync(path.join(sandbox, archivo), original, 'utf8');
  }
  console.log('✓ Mutaciones en package.json, workflows, hooks y opencode.json invalidan la caché');

  // 5. Caché corrupta / incompleta / formato antiguo
  const cacheFile = path.join(sandbox, '.axion', 'state', 'merkle_cache.json');
  const root = engine.computeMerkleRoot();

  fs.writeFileSync(cacheFile, '{ corrupto', 'utf8');
  assert.strictEqual(engine.evaluateFastForward().canFastForward, false, 'Caché corrupta debe bloquear');

  fs.writeFileSync(cacheFile, JSON.stringify({ cacheFormat: 2, merkleRoot: root.merkleRoot, filesCount: root.filesCount }), 'utf8');
  assert.strictEqual(engine.evaluateFastForward().canFastForward, false, 'Caché sin fases debe bloquear');

  fs.writeFileSync(cacheFile, JSON.stringify({
    merkleRoot: root.merkleRoot,
    filesCount: root.filesCount,
    verifiedPhases: { testsPassed: true, vibeGuardPassed: true, smtProofPassed: true, chaosFuzzPassed: true }
  }), 'utf8');
  assert.strictEqual(engine.evaluateFastForward().canFastForward, false, 'Formato antiguo (sin cacheFormat) debe bloquear');
  console.log('✓ Caché corrupta, incompleta y de formato antiguo bloquean Fast-Forward');

  // 6. Errores de lectura bloquean evaluación y sellado
  engine.sealState(root, ALL_TRUE);
  const conError = {
    merkleRoot: root.merkleRoot,
    filesCount: root.filesCount,
    readErrors: [{ path: 'tools/ilegible.js', error: 'READ_FAILED: EACCES' }],
    files: root.files
  };
  const evalError = engine.evaluateFastForward(conError);
  assert.strictEqual(evalError.canFastForward, false, 'Errores de lectura deben bloquear Fast-Forward');
  assert.match(evalError.reason, /Errores de lectura/);
  const selladoError = engine.sealState(conError, ALL_TRUE);
  assert.strictEqual(selladoError.sealed, false, 'Con errores de lectura no se sella');
  console.log('✓ Errores de lectura bloquean Fast-Forward y sellado');

  // 7. Renombrar cambia la raíz (hoja = ruta + contenido)
  engine.sealState(root, ALL_TRUE);
  fs.renameSync(path.join(sandbox, 'tools', 'modulo.js'), path.join(sandbox, 'tools', 'renombrado.js'));
  const evRenombrado = engine.evaluateFastForward();
  assert.strictEqual(evRenombrado.canFastForward, false, 'Renombrar un archivo debe invalidar la caché');
  console.log('✓ Renombrar un archivo cambia el Merkle Root');

  console.log('\nPASS: AX-F-225 — Caché Merkle fail-closed verificada adversarialmente.');
} finally {
  try {
    fs.rmSync(sandbox, { recursive: true, force: true });
  } catch (_) {
    // limpieza best-effort
  }
}
