'use strict';

/**
 * AX-F-225: Invariantes adversariales de la caché Merkle con evidencia de fase tipada.
 *
 * Cierra el bypass de evidencia declarativa:
 * 1. Booleanos NO son evidencia; un JSON ordinario tampoco (schema tipado obligatorio).
 * 2. La misma evidencia no puede acreditar fases distintas (reutilización prohibida).
 * 3. Productor no autorizado para la fase: bloqueado.
 * 4. Artefacto sin entrada de ledger: bloqueado.
 * 5. Symlink hacia fuera de la raíz: rechazado (realpath + lstat).
 * 6. Artefacto mutado/eliminado tras sellar, `result: FAIL`, ledger manipulado: bloquean.
 * 7. Mutaciones de configuración/código, caché corrupta o de formato antiguo: bloquean.
 * 8. Errores de lectura bloquean evaluación y sellado; renombrar cambia la raíz.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const MerkleCacheEngine = require('../../tools/merkle_cache_fast_forward.js');
const PhaseEvidence = require('../../tools/phase_evidence.js');
const { sha256 } = require('../../tools/evidence_ledger.js');
const { crearSandbox } = require('../../tools/test_sandbox.js');

console.log('=== AX-F-225 Caché Merkle con evidencia de fase tipada: pruebas adversariales ===\n');

const sandbox = crearSandbox('merkle-adversarial');
const FASE_NAMES = PhaseEvidence.PHASE_NAMES;
const PRODUCTORES = {
  testsPassed: 'tools/verify_changes.js',
  vibeGuardPassed: 'tools/vibeguard_gate.js',
  smtProofPassed: 'tools/temporal_state_verifier.js',
  chaosFuzzPassed: 'tools/agent_chaos_monkey.js'
};

function escribir(rel, contenido) {
  const abs = path.join(sandbox, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, contenido, 'utf8');
}

function artefactoTipado(phase, { registrar = true, producer = PRODUCTORES[phase] } = {}) {
  const art = PhaseEvidence.createPhaseArtifact(sandbox, { phase, producer });
  if (registrar) {
    PhaseEvidence.registerPhaseEvidence(sandbox, { phase, artifactPath: art.path, producer });
  }
  return { artifact: art.relPath, sha256: art.sha256, result: 'PASS' };
}

function evidenciaCompleta() {
  return Object.fromEntries(FASE_NAMES.map((n) => [n, artefactoTipado(n)]));
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
  assert.strictEqual(engine.evaluateFastForward().canFastForward, false, 'Los booleanos no pueden autorizar Fast-Forward');
  console.log('✓ Booleanos declarativos bloquean Fast-Forward (las fases quedan sin evidencia)');

  // 2. JSON ordinario reutilizado en las cuatro fases (escenario auditado)
  escribir('ordinario.json', JSON.stringify({ result: 'PASS', nota: 'nunca ejecutado' }));
  const shaOrdinario = sha256(fs.readFileSync(path.join(sandbox, 'ordinario.json')));
  const refOrdinaria = { artifact: 'ordinario.json', sha256: shaOrdinario, result: 'PASS' };
  const selladoOrdinario = engine.sealState(inicial, {
    testsPassed: refOrdinaria,
    vibeGuardPassed: refOrdinaria,
    smtProofPassed: refOrdinaria,
    chaosFuzzPassed: refOrdinaria
  });
  assert.strictEqual(selladoOrdinario.sealed, true);
  assert.strictEqual(engine.evaluateFastForward().canFastForward, false,
    'Un JSON ordinario (sin schema tipado) no puede acreditar cuatro fases');
  console.log('✓ JSON ordinario reutilizado en 4 fases: Fast-Forward bloqueado (schema tipado obligatorio)');

  // 3. Reutilización de un artefacto tipado en otra fase
  const tipadoTests = artefactoTipado('testsPassed');
  const selladoReuso = engine.sealState(inicial, {
    testsPassed: tipadoTests,
    vibeGuardPassed: tipadoTests,
    smtProofPassed: null,
    chaosFuzzPassed: null
  });
  assert.strictEqual(selladoReuso.sealed, true);
  assert.strictEqual(engine.evaluateFastForward().canFastForward, false, 'La misma evidencia no puede acreditar otra fase');
  console.log('✓ Artefacto tipado reutilizado en otra fase: bloqueado');

  // 4. Productor no autorizado para la fase (artefacto fabricado a mano + registrado)
  const dirFases = path.join(sandbox, '.axion', 'evidence', 'phases');
  fs.mkdirSync(dirFases, { recursive: true });
  const rutaAjeno = path.join(dirFases, `smt-ajeno-${Date.now()}.json`);
  fs.writeFileSync(rutaAjeno, JSON.stringify({
    schema: PhaseEvidence.SCHEMA,
    phase: 'smtProofPassed',
    producer: 'tools/verify_changes.js',
    result: 'PASS'
  }, null, 2), 'utf8');
  const shaAjeno = sha256(fs.readFileSync(rutaAjeno));
  PhaseEvidence.registerPhaseEvidence(sandbox, {
    phase: 'smtProofPassed',
    artifactPath: rutaAjeno,
    producer: 'tools/verify_changes.js'
  });
  const refAjeno = {
    artifact: path.relative(sandbox, rutaAjeno).split(path.sep).join('/'),
    sha256: shaAjeno,
    result: 'PASS'
  };
  engine.sealState(inicial, { testsPassed: tipadoTests, vibeGuardPassed: null, smtProofPassed: refAjeno, chaosFuzzPassed: null });
  assert.strictEqual(engine.evaluateFastForward().canFastForward, false, 'Productor no autorizado no acredita la fase');
  console.log('✓ Productor no autorizado para la fase: bloqueado');

  // 5. Artefacto tipado sin entrada de ledger
  const sinLedger = artefactoTipado('vibeGuardPassed', { registrar: false });
  engine.sealState(inicial, {
    testsPassed: tipadoTests,
    vibeGuardPassed: sinLedger,
    smtProofPassed: null,
    chaosFuzzPassed: null
  });
  assert.strictEqual(engine.evaluateFastForward().canFastForward, false, 'Sin entrada de ledger la fase no se acredita');
  console.log('✓ Artefacto tipado sin registro en ledger: bloqueado');

  // 6. Evidencia completa válida: autoriza con raíz idéntica
  engine.sealState(inicial, evidenciaCompleta());
  assert.strictEqual(engine.evaluateFastForward().canFastForward, true, 'Con 4 fases tipadas y registradas debe autorizar');
  console.log('✓ Cuatro fases tipadas con ledger y raíz idéntica autorizan Fast-Forward');

  // 7. Symlink hacia fuera de la raíz
  const fuera = path.join(sandbox, '..', `fuera-${Date.now()}.json`);
  fs.writeFileSync(fuera, JSON.stringify({ schema: PhaseEvidence.SCHEMA, phase: 'chaosFuzzPassed', producer: PRODUCTORES.chaosFuzzPassed, result: 'PASS' }), 'utf8');
  let symlinkCreado = false;
  try {
    fs.symlinkSync(fuera, path.join(sandbox, 'enlace.json'));
    symlinkCreado = true;
  } catch (_) {
    // Windows sin privilegios de symlink: caso omitido
  }
  if (symlinkCreado) {
    const enlace = {
      artifact: 'enlace.json',
      sha256: sha256(fs.readFileSync(fuera)),
      result: 'PASS'
    };
    engine.sealState(inicial, evidenciaCompleta());
    const selladoEnlace = engine.sealState(inicial, {
      testsPassed: artefactoTipado('testsPassed'),
      vibeGuardPassed: artefactoTipado('vibeGuardPassed'),
      smtProofPassed: artefactoTipado('smtProofPassed'),
      chaosFuzzPassed: enlace
    });
    assert.strictEqual(selladoEnlace.sealed, true);
    assert.strictEqual(engine.evaluateFastForward().canFastForward, false, 'Un symlink no puede acreditar una fase');
    fs.rmSync(path.join(sandbox, 'enlace.json'), { force: true });
    console.log('✓ Symlink hacia fuera de la raíz: rechazado');
  } else {
    console.log('i Symlink no disponible en esta plataforma: caso omitido');
  }
  fs.rmSync(fuera, { force: true });

  // 8. Mutaciones de configuración y código
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
    assert.strictEqual(engine.evaluateFastForward().canFastForward, false, `Mutar ${archivo} debe invalidar el Fast-Forward`);
    fs.writeFileSync(path.join(sandbox, archivo), original, 'utf8');
  }
  console.log('✓ Mutaciones en package.json, workflows, hooks y opencode.json invalidan la caché');

  // 9. Divergencia de artefacto tras sellar
  const evidenciaDivergente = evidenciaCompleta();
  engine.sealState(engine.computeMerkleRoot(), evidenciaDivergente);
  const rutaTests = path.join(sandbox, evidenciaDivergente.testsPassed.artifact);
  fs.writeFileSync(rutaTests, JSON.stringify({ schema: PhaseEvidence.SCHEMA, phase: 'testsPassed', producer: PRODUCTORES.testsPassed, result: 'PASS', mutado: true }), 'utf8');
  const evalDivergente = engine.evaluateFastForward();
  assert.strictEqual(evalDivergente.canFastForward, false, 'Un artefacto mutado tras sellar debe bloquear');
  assert.match(evalDivergente.reason, /testsPassed/);
  console.log('✓ Artefacto de fase mutado tras sellar bloquea el Fast-Forward');

  // 10. Artefacto eliminado tras sellar
  const evidenciaEliminada = evidenciaCompleta();
  engine.sealState(engine.computeMerkleRoot(), evidenciaEliminada);
  fs.rmSync(path.join(sandbox, evidenciaEliminada.smtProofPassed.artifact));
  assert.strictEqual(engine.evaluateFastForward().canFastForward, false, 'Un artefacto ausente debe bloquear');
  console.log('✓ Artefacto de fase eliminado bloquea el Fast-Forward');

  // 11. Ledger manipulado invalida la fase
  const evidenciaLedger = evidenciaCompleta();
  const ledgerFile = path.join(sandbox, '.axion', 'evidence', 'ledger.jsonl');
  const lineas = fs.readFileSync(ledgerFile, 'utf8').split('\n').filter(Boolean);
  const primera = JSON.parse(lineas[0]);
  primera.artifactSha256 = primera.artifactSha256.split('').reverse().join('');
  lineas[0] = JSON.stringify(primera);
  fs.writeFileSync(ledgerFile, `${lineas.join('\n')}\n`, 'utf8');
  engine.sealState(engine.computeMerkleRoot(), evidenciaLedger);
  assert.strictEqual(engine.evaluateFastForward().canFastForward, false, 'Un ledger manipulado no puede acreditar fases');
  console.log('✓ Ledger manipulado bloquea el Fast-Forward');

  // Se descarta el ledger manipulado: los siguientes casos registran sus propias
  // entradas en una cadena nueva (el ledger roto ya quedó verificado como bloqueante).
  fs.rmSync(ledgerFile, { force: true });

  // 12. Caché corrupta / incompleta / formato antiguo
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

  // 13. Errores de lectura bloquean evaluación y sellado
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
  assert.strictEqual(engine.sealState(conError, evidenciaCompleta()).sealed, false, 'Con errores de lectura no se sella');
  console.log('✓ Errores de lectura bloquean Fast-Forward y sellado');

  // 14. Renombrar un archivo rastreado cambia la raíz
  engine.sealState(root, evidenciaCompleta());
  fs.renameSync(path.join(sandbox, 'tools', 'modulo.js'), path.join(sandbox, 'tools', 'renombrado.js'));
  assert.strictEqual(engine.evaluateFastForward().canFastForward, false, 'Renombrar un archivo debe invalidar la caché');
  console.log('✓ Renombrar un archivo cambia el Merkle Root');

  console.log('\nPASS: AX-F-225 — Caché Merkle con evidencia de fase tipada verificada adversarialmente.');
} finally {
  try {
    fs.rmSync(sandbox, { recursive: true, force: true });
  } catch (_) {
    // limpieza best-effort
  }
}
