'use strict';

/**
 * AX-F-225: Invariantes adversariales de la caché Merkle con evidencia por fase.
 *
 * Demuestra que el Fast-Forward ya no puede autorizarse con señales declarativas:
 * 1. Booleanos (`testsPassed: true`, ...) NO son evidencia: las fases quedan null.
 * 2. Cada fase exige artefacto existente dentro del proyecto, SHA-256 vigente y PASS.
 * 3. Artefacto mutado/eliminado tras sellar, `result: FAIL` o ruta escapada bloquean.
 * 4. Cambios en configuración publicada, workflows, hooks o código invalidan la caché.
 * 5. Caché corrupta, incompleta o de formato antiguo bloquea Fast-Forward.
 * 6. Errores de lectura bloquean evaluación y sellado; renombrar cambia la raíz.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const MerkleCacheEngine = require('../../tools/merkle_cache_fast_forward.js');

console.log('=== AX-F-225 Caché Merkle con evidencia por fase: pruebas adversariales ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sandbox = path.join(ROOT, 'scratch', `merkle-adversarial-${Date.now()}`);
const FASE_NAMES = ['testsPassed', 'vibeGuardPassed', 'smtProofPassed', 'chaosFuzzPassed'];

function escribir(rel, contenido) {
  const abs = path.join(sandbox, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, contenido, 'utf8');
}

function evidencia(nombre, extra = {}) {
  const rel = `evidence/${nombre}.json`;
  escribir(rel, JSON.stringify({ fase: nombre, resultado: 'PASS', ...extra }));
  return {
    artifact: rel,
    sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(sandbox, rel))).digest('hex'),
    result: extra.result || 'PASS'
  };
}

function evidenciaCompleta() {
  return Object.fromEntries(FASE_NAMES.map((n) => [n, evidencia(n)]));
}

try {
  escribir('tools/modulo.js', 'module.exports = 1;');
  escribir('tests/modulo.test.js', 'console.log("test");');
  escribir('package.json', JSON.stringify({ name: 'sandbox', version: '1.0.0' }));
  escribir('opencode.json', JSON.stringify({ $schema: 'x' }));
  escribir('.github/workflows/ci.yml', 'name: CI\non: push\n');
  escribir('.agents/hooks/validate.mjs', 'export const ok = true;\n');

  const engine = new MerkleCacheEngine(sandbox);
  const inicial = engine.computeMerkleRoot();
  assert.strictEqual(inicial.readErrors.length, 0, 'La superficie inicial debe ser legible');

  // 1. Booleanos declarativos: no autorizan
  engine.sealState(inicial, {
    testsPassed: true,
    vibeGuardPassed: true,
    smtProofPassed: true,
    chaosFuzzPassed: true
  });
  const evalBooleanos = engine.evaluateFastForward();
  assert.strictEqual(evalBooleanos.canFastForward, false, 'Los booleanos no pueden autorizar Fast-Forward');
  console.log('✓ Booleanos declarativos bloquean Fast-Forward (las fases quedan sin evidencia)');

  // 2. Fase ausente: no se completa por defecto
  engine.sealState(inicial, { testsPassed: evidencia('testsPassed') });
  const evalParcial = engine.evaluateFastForward();
  assert.strictEqual(evalParcial.canFastForward, false, 'Una fase ausente no puede asumirse verificada');
  console.log('✓ Fases ausentes bloquean Fast-Forward');

  // 3. Evidencia completa: autoriza solo con raíz idéntica
  engine.sealState(inicial, evidenciaCompleta());
  const evalOk = engine.evaluateFastForward();
  assert.strictEqual(evalOk.canFastForward, true, 'Con 4 fases con evidencia y raíz idéntica debe autorizar');
  console.log('✓ Las 4 fases con evidencia vigente autorizan Fast-Forward');

  // 4. Mutaciones de configuración relevante invalidan la caché
  const mutaciones = [
    ['package.json', JSON.stringify({ name: 'sandbox', version: '2.0.0' })],
    ['.github/workflows/ci.yml', 'name: CI\non: pull_request\n'],
    ['.agents/hooks/validate.mjs', 'export const ok = false;\n'],
    ['opencode.json', JSON.stringify({ $schema: 'y' })],
    ['tools/modulo.js', 'module.exports = 2;']
  ];
  for (const [archivo, nuevoContenido] of mutaciones) {
    engine.sealState(engine.computeMerkleRoot(), evidenciaCompleta());
    const original = fs.readFileSync(path.join(sandbox, archivo), 'utf8');
    fs.writeFileSync(path.join(sandbox, archivo), nuevoContenido, 'utf8');
    const ev = engine.evaluateFastForward();
    assert.strictEqual(ev.canFastForward, false, `Mutar ${archivo} debe invalidar el Fast-Forward`);
    fs.writeFileSync(path.join(sandbox, archivo), original, 'utf8');
  }
  console.log('✓ Mutaciones en package.json, workflows, hooks y opencode.json invalidan la caché');

  // 5. Divergencia de artefacto tras sellar
  const evidenciaDivergente = evidenciaCompleta();
  engine.sealState(engine.computeMerkleRoot(), evidenciaDivergente);
  escribir('evidence/testsPassed.json', JSON.stringify({ fase: 'testsPassed', resultado: 'PASS', mutado: true }));
  const evalDivergente = engine.evaluateFastForward();
  assert.strictEqual(evalDivergente.canFastForward, false, 'Un artefacto mutado tras sellar debe bloquear');
  assert.match(evalDivergente.reason, /testsPassed/);
  console.log('✓ Artefacto de fase mutado tras sellar bloquea el Fast-Forward');

  // 6. Artefacto eliminado tras sellar
  engine.sealState(engine.computeMerkleRoot(), evidenciaCompleta());
  fs.rmSync(path.join(sandbox, 'evidence', 'smtProofPassed.json'));
  assert.strictEqual(engine.evaluateFastForward().canFastForward, false, 'Un artefacto ausente debe bloquear');
  console.log('✓ Artefacto de fase eliminado bloquea el Fast-Forward');

  // 7. result FAIL y ruta escapada: no cuentan como evidencia
  const completa = evidenciaCompleta();
  completa.smtProofPassed = evidencia('smtProofPassed', { result: 'FAIL' });
  completa.chaosFuzzPassed = {
    artifact: '../../fuera.json',
    sha256: 'a'.repeat(64),
    result: 'PASS'
  };
  engine.sealState(engine.computeMerkleRoot(), completa);
  const evalInvalida = engine.evaluateFastForward();
  assert.strictEqual(evalInvalida.canFastForward, false);
  assert.match(evalInvalida.reason, /smtProofPassed/);
  assert.match(evalInvalida.reason, /chaosFuzzPassed/);
  console.log('✓ result FAIL y ruta escapada no cuentan como evidencia');

  // 8. Caché corrupta / incompleta / formato antiguo
  const cacheFile = path.join(sandbox, '.axion', 'state', 'merkle_cache.json');
  const root = engine.computeMerkleRoot();

  fs.writeFileSync(cacheFile, '{ corrupto', 'utf8');
  assert.strictEqual(engine.evaluateFastForward().canFastForward, false, 'Caché corrupta debe bloquear');

  fs.writeFileSync(cacheFile, JSON.stringify({ cacheFormat: 3, merkleRoot: root.merkleRoot, filesCount: root.filesCount }), 'utf8');
  assert.strictEqual(engine.evaluateFastForward().canFastForward, false, 'Caché sin fases debe bloquear');

  fs.writeFileSync(cacheFile, JSON.stringify({
    merkleRoot: root.merkleRoot,
    filesCount: root.filesCount,
    verifiedPhases: { testsPassed: true, vibeGuardPassed: true, smtProofPassed: true, chaosFuzzPassed: true }
  }), 'utf8');
  assert.strictEqual(engine.evaluateFastForward().canFastForward, false, 'Formato antiguo (sin cacheFormat) debe bloquear');
  console.log('✓ Caché corrupta, incompleta y de formato antiguo bloquean Fast-Forward');

  // 9. Errores de lectura bloquean evaluación y sellado
  engine.sealState(root, evidenciaCompleta());
  const conError = {
    merkleRoot: root.merkleRoot,
    filesCount: root.filesCount,
    readErrors: [{ path: 'tools/ilegible.js', error: 'READ_FAILED: EACCES' }],
    files: root.files
  };
  const evalError = engine.evaluateFastForward(conError);
  assert.strictEqual(evalError.canFastForward, false, 'Errores de lectura deben bloquear Fast-Forward');
  assert.match(evalError.reason, /Errores de lectura/);
  const selladoError = engine.sealState(conError, evidenciaCompleta());
  assert.strictEqual(selladoError.sealed, false, 'Con errores de lectura no se sella');
  console.log('✓ Errores de lectura bloquean Fast-Forward y sellado');

  // 10. Renombrar un archivo rastreado cambia la raíz
  engine.sealState(root, evidenciaCompleta());
  fs.renameSync(path.join(sandbox, 'tools', 'modulo.js'), path.join(sandbox, 'tools', 'renombrado.js'));
  assert.strictEqual(engine.evaluateFastForward().canFastForward, false, 'Renombrar un archivo debe invalidar la caché');
  console.log('✓ Renombrar un archivo cambia el Merkle Root');

  console.log('\nPASS: AX-F-225 — Caché Merkle con evidencia por fase verificada adversarialmente.');
} finally {
  try {
    fs.rmSync(sandbox, { recursive: true, force: true });
  } catch (_) {
    // limpieza best-effort
  }
}
