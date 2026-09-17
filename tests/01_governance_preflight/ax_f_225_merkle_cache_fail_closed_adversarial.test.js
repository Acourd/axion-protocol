'use strict';

/**
 * AX-F-225: Invariantes adversariales del Fast-Forward con evidencia firmada y ejecutada.
 *
 * Cierra la acreditación declarativa:
 * 1. Booleanos y JSON ordinario (aunque se reutilice) NO autorizan.
 * 2. La evidencia exige ejecución observada + firma; sin firma o sin clave pública, no hay FF.
 * 3. Productor no autorizado, artefacto reutilizado o sin ledger firmado: bloqueado.
 * 4. Symlink/fuera de raíz: rechazado por descriptor (O_NOFOLLOW + fstat).
 * 5. Mutaciones de artefactos, ledger, configuración o código: bloquean.
 * 6. Caché corrupta/antigua, errores de lectura y renombrados: bloquean.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const MerkleCacheEngine = require('../../tools/merkle_cache_fast_forward.js');
const PhaseEvidence = require('../../tools/phase_evidence.js');
const AttestationKeyring = require('../../tools/attestation_keyring.js');
const { appendEntry, sha256 } = require('../../tools/evidence_ledger.js');
const { crearSandbox } = require('../../tools/test_sandbox.js');

console.log('=== AX-F-225 Fast-Forward con evidencia firmada y ejecutada: adversariales ===\n');

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

const keyring = new AttestationKeyring(sandbox);
keyring.generateKeyPair();
const signer = keyring.buildSigner();

function fase(phase) {
  return PhaseEvidence.runPhaseAndRecord(sandbox, {
    phase,
    producer: PRODUCTORES[phase],
    signer,
    command: process.execPath,
    args: ['-e', 'process.exit(0)']
  }).ref;
}

function evidenciaCompleta() {
  return Object.fromEntries(FASE_NAMES.map((n) => [n, fase(n)]));
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

  // 1. Booleanos
  engine.sealState(inicial, {
    testsPassed: true, vibeGuardPassed: true, smtProofPassed: true, chaosFuzzPassed: true
  });
  assert.strictEqual(engine.evaluateFastForward().canFastForward, false, 'Los booleanos no autorizan');
  console.log('✓ Booleanos declarativos: bloqueado');

  // 2. JSON ordinario reutilizado en las cuatro fases
  escribir('ordinario.json', JSON.stringify({ result: 'PASS', nota: 'nunca ejecutado' }));
  const refOrdinaria = {
    artifact: 'ordinario.json',
    sha256: sha256(fs.readFileSync(path.join(sandbox, 'ordinario.json'))),
    result: 'PASS'
  };
  engine.sealState(inicial, {
    testsPassed: refOrdinaria, vibeGuardPassed: refOrdinaria, smtProofPassed: refOrdinaria, chaosFuzzPassed: refOrdinaria
  });
  assert.strictEqual(engine.evaluateFastForward().canFastForward, false, 'Un JSON ordinario no autoriza');
  console.log('✓ JSON ordinario reutilizado en 4 fases: bloqueado');

  // 3. Artefacto tipado y firmado reutilizado en otra fase
  const refTests = fase('testsPassed');
  engine.sealState(inicial, { testsPassed: refTests, vibeGuardPassed: refTests, smtProofPassed: null, chaosFuzzPassed: null });
  assert.strictEqual(engine.evaluateFastForward().canFastForward, false, 'Reutilizar evidencia no autoriza');
  console.log('✓ Artefacto firmado reutilizado en otra fase: bloqueado');

  // 4. Sin firma: entrada anónima en el ledger
  const dirFases = path.join(sandbox, '.axion', 'evidence', 'phases');
  fs.mkdirSync(dirFases, { recursive: true });
  const rutaSinFirma = path.join(dirFases, `vibe-sin-firma-${Date.now()}.json`);
  fs.writeFileSync(rutaSinFirma, JSON.stringify({
    schema: PhaseEvidence.SCHEMA,
    phase: 'vibeGuardPassed',
    producer: PRODUCTORES.vibeGuardPassed,
    result: 'PASS',
    execution: { command: 'x', exitCode: 0, outputSha256: 'a'.repeat(64) }
  }, null, 2), 'utf8');
  const relSinFirma = path.relative(sandbox, rutaSinFirma).split(path.sep).join('/');
  appendEntry(sandbox, {
    producer: PRODUCTORES.vibeGuardPassed,
    command: 'phase:vibeGuardPassed',
    exitCode: 0,
    artifact: relSinFirma,
    artifactSha256: sha256(fs.readFileSync(rutaSinFirma)),
    phase: 'vibeGuardPassed'
    // sin signer: firma ausente
  });
  engine.sealState(inicial, {
    testsPassed: refTests, vibeGuardPassed: { artifact: relSinFirma, sha256: sha256(fs.readFileSync(rutaSinFirma)), result: 'PASS' }, smtProofPassed: null, chaosFuzzPassed: null
  });
  assert.strictEqual(engine.evaluateFastForward().canFastForward, false, 'Sin firma no puede autorizar');
  console.log('✓ Entrada de ledger sin firma: bloqueado');

  // 5. Productor no autorizado (artefacto fabricado + firmado)
  const rutaAjena = path.join(dirFases, `smt-ajeno-${Date.now()}.json`);
  fs.writeFileSync(rutaAjena, JSON.stringify({
    schema: PhaseEvidence.SCHEMA,
    phase: 'smtProofPassed',
    producer: 'tools/verify_changes.js',
    result: 'PASS',
    execution: { command: 'x', exitCode: 0, outputSha256: 'b'.repeat(64) }
  }, null, 2), 'utf8');
  const relAjena = path.relative(sandbox, rutaAjena).split(path.sep).join('/');
  appendEntry(sandbox, {
    producer: 'tools/verify_changes.js',
    command: 'phase:smtProofPassed',
    exitCode: 0,
    artifact: relAjena,
    artifactSha256: sha256(fs.readFileSync(rutaAjena)),
    phase: 'smtProofPassed',
    signer
  });
  engine.sealState(inicial, {
    testsPassed: refTests, vibeGuardPassed: null, smtProofPassed: { artifact: relAjena, sha256: sha256(fs.readFileSync(rutaAjena)), result: 'PASS' }, chaosFuzzPassed: null
  });
  assert.strictEqual(engine.evaluateFastForward().canFastForward, false, 'Productor no autorizado no autoriza');
  console.log('✓ Productor no autorizado: bloqueado');

  // Se descarta el ledger contaminado con entradas anónimas/ajenas: los siguientes
  // casos parten de una cadena limpia (los bloqueos ya quedaron demostrados).
  const ledgerFile = path.join(sandbox, '.axion', 'evidence', 'ledger.jsonl');
  fs.rmSync(ledgerFile, { force: true });

  // 6. Ejecución fallida: no se emite evidencia
  let errorEjecucion = null;
  try {
    PhaseEvidence.runPhaseAndRecord(sandbox, {
      phase: 'chaosFuzzPassed',
      producer: PRODUCTORES.chaosFuzzPassed,
      signer,
      command: process.execPath,
      args: ['-e', 'process.exit(1)']
    });
  } catch (err) {
    errorEjecucion = err;
  }
  assert.ok(errorEjecucion);
  assert.strictEqual(errorEjecucion.code, 'ERR_PHASE_EXECUTION_FAILED');
  console.log('✓ Ejecución del control fallida: evidencia no emitida (ERR_PHASE_EXECUTION_FAILED)');

  // 7. Sin firma obligatoria: runPhaseAndRecord rechaza al llamador sin signer
  const errorSinSigner = (() => {
    try {
      PhaseEvidence.runPhaseAndRecord(sandbox, {
        phase: 'testsPassed', producer: PRODUCTORES.testsPassed, command: process.execPath, args: ['-e', 'process.exit(0)']
      });
      return null;
    } catch (err) {
      return err;
    }
  })();
  assert.ok(errorSinSigner);
  assert.strictEqual(errorSinSigner.code, 'ERR_PHASE_SIGNATURE_REQUIRED');
  console.log('✓ Firma obligatoria: sin signer se rechaza (ERR_PHASE_SIGNATURE_REQUIRED)');

  // 8. Evidencia completa válida
  engine.sealState(inicial, evidenciaCompleta());
  assert.strictEqual(engine.evaluateFastForward().canFastForward, true, '4 fases firmadas y verificadas deben autorizar');
  console.log('✓ Cuatro fases firmadas y verificadas con clave pública: Fast-Forward autorizado');

  // 9. Sin clave pública: no hay verificación posible
  const pubPath = path.join(sandbox, '.axion', 'keys', 'attestation_ed25519.pub');
  const pubContenido = fs.readFileSync(pubPath, 'utf8');
  engine.sealState(engine.computeMerkleRoot(), evidenciaCompleta());
  fs.rmSync(pubPath, { force: true });
  const evalSinPub = engine.evaluateFastForward();
  assert.strictEqual(evalSinPub.canFastForward, false, 'Sin clave pública no puede autorizar');
  fs.writeFileSync(pubPath, pubContenido, 'utf8');
  console.log('✓ Sin clave pública del keyring: Fast-Forward bloqueado');

  // 10. Symlink hacia fuera de la raíz: rechazo por descriptor
  const fuera = path.join(path.dirname(sandbox), `fuera-${Date.now()}.json`);
  fs.writeFileSync(fuera, JSON.stringify({
    schema: PhaseEvidence.SCHEMA,
    phase: 'chaosFuzzPassed',
    producer: PRODUCTORES.chaosFuzzPassed,
    result: 'PASS',
    execution: { command: 'x', exitCode: 0, outputSha256: 'c'.repeat(64) }
  }), 'utf8');
  const rutaEnlace = path.join(sandbox, 'enlace-fase.json');
  let enlaceCreado = false;
  try {
    fs.symlinkSync(fuera, rutaEnlace);
    enlaceCreado = true;
  } catch (_) {
    // Windows sin privilegios: caso omitido
  }
  if (enlaceCreado) {
    let errorEnlace = null;
    try {
      PhaseEvidence.leerConDescriptor(sandbox, 'enlace-fase.json');
    } catch (err) {
      errorEnlace = err;
    }
    assert.ok(errorEnlace, 'El descriptor debe rechazar symlinks');
    assert.ok(['ERR_PHASE_ARTIFACT_SYMLINK', 'ERR_PHASE_ARTIFACT_ESCAPE'].includes(errorEnlace.code));
    fs.rmSync(rutaEnlace, { force: true });
    console.log('✓ Symlink hacia fuera: rechazado por descriptor');
  } else {
    console.log('i Symlink no disponible en esta plataforma: caso omitido');
  }
  fs.rmSync(fuera, { force: true });

  // 11. Mutaciones de configuración y código
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
    assert.strictEqual(engine.evaluateFastForward().canFastForward, false, `Mutar ${archivo} debe invalidar`);
    fs.writeFileSync(path.join(sandbox, archivo), original, 'utf8');
  }
  console.log('✓ Mutaciones de configuración/código invalidan la caché');

  // 12. Artefacto mutado tras sellar
  const evidenciaDivergente = evidenciaCompleta();
  engine.sealState(engine.computeMerkleRoot(), evidenciaDivergente);
  const rutaTestsFase = path.join(sandbox, evidenciaDivergente.testsPassed.artifact);
  fs.writeFileSync(rutaTestsFase, JSON.stringify({
    schema: PhaseEvidence.SCHEMA, phase: 'testsPassed', producer: PRODUCTORES.testsPassed, result: 'PASS',
    execution: { command: 'x', exitCode: 0, outputSha256: 'd'.repeat(64) }, mutado: true
  }), 'utf8');
  const evalDivergente = engine.evaluateFastForward();
  assert.strictEqual(evalDivergente.canFastForward, false, 'Artefacto mutado debe bloquear');
  assert.match(evalDivergente.reason, /testsPassed/);
  console.log('✓ Artefacto mutado tras sellar: bloqueado');

  // 13. Artefacto eliminado tras sellar
  const evidenciaEliminada = evidenciaCompleta();
  engine.sealState(engine.computeMerkleRoot(), evidenciaEliminada);
  fs.rmSync(path.join(sandbox, evidenciaEliminada.smtProofPassed.artifact));
  assert.strictEqual(engine.evaluateFastForward().canFastForward, false, 'Artefacto ausente debe bloquear');
  console.log('✓ Artefacto eliminado tras sellar: bloqueado');

  // 14. Ledger manipulado
  const evidenciaLedger = evidenciaCompleta();
  const lineas = fs.readFileSync(ledgerFile, 'utf8').split('\n').filter(Boolean);
  const primera = JSON.parse(lineas[0]);
  primera.artifactSha256 = primera.artifactSha256.split('').reverse().join('');
  lineas[0] = JSON.stringify(primera);
  fs.writeFileSync(ledgerFile, `${lineas.join('\n')}\n`, 'utf8');
  engine.sealState(engine.computeMerkleRoot(), evidenciaLedger);
  assert.strictEqual(engine.evaluateFastForward().canFastForward, false, 'Ledger manipulado debe bloquear');
  console.log('✓ Ledger manipulado: bloqueado');
  fs.rmSync(ledgerFile, { force: true });

  // 15. Caché corrupta / incompleta / formato antiguo
  const cacheFile = path.join(sandbox, '.axion', 'state', 'merkle_cache.json');
  const root = engine.computeMerkleRoot();
  fs.writeFileSync(cacheFile, '{ corrupto', 'utf8');
  assert.strictEqual(engine.evaluateFastForward().canFastForward, false, 'Caché corrupta debe bloquear');
  fs.writeFileSync(cacheFile, JSON.stringify({ cacheFormat: 3, merkleRoot: root.merkleRoot, filesCount: root.filesCount }), 'utf8');
  assert.strictEqual(engine.evaluateFastForward().canFastForward, false, 'Caché sin fases debe bloquear');
  fs.writeFileSync(cacheFile, JSON.stringify({
    merkleRoot: root.merkleRoot, filesCount: root.filesCount,
    verifiedPhases: { testsPassed: true, vibeGuardPassed: true, smtProofPassed: true, chaosFuzzPassed: true }
  }), 'utf8');
  assert.strictEqual(engine.evaluateFastForward().canFastForward, false, 'Formato antiguo debe bloquear');
  console.log('✓ Caché corrupta, incompleta y antigua: bloqueado');

  // 16. Errores de lectura
  engine.sealState(root, evidenciaCompleta());
  const conError = {
    merkleRoot: root.merkleRoot, filesCount: root.filesCount,
    readErrors: [{ path: 'tools/ilegible.js', error: 'READ_FAILED: EACCES' }], files: root.files
  };
  const evalError = engine.evaluateFastForward(conError);
  assert.strictEqual(evalError.canFastForward, false, 'Errores de lectura deben bloquear');
  assert.match(evalError.reason, /Errores de lectura/);
  assert.strictEqual(engine.sealState(conError, evidenciaCompleta()).sealed, false, 'Con errores no se sella');
  console.log('✓ Errores de lectura bloquean evaluación y sellado');

  // 17. Renombrar archivo rastreado
  engine.sealState(root, evidenciaCompleta());
  fs.renameSync(path.join(sandbox, 'tools', 'modulo.js'), path.join(sandbox, 'tools', 'renombrado.js'));
  assert.strictEqual(engine.evaluateFastForward().canFastForward, false, 'Renombrar debe invalidar');
  console.log('✓ Renombrar un archivo cambia el Merkle Root');

  console.log('\nPASS: AX-F-225 — Fast-Forward con evidencia firmada y ejecutada verificado adversarialmente.');
} finally {
  try {
    fs.rmSync(sandbox, { recursive: true, force: true });
  } catch (_) {
    // limpieza best-effort
  }
}
