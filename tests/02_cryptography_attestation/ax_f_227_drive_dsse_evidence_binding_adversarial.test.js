'use strict';

/**
 * AX-F-227: Invariantes adversariales de atestación basada en evidencia (P0-C).
 *
 * Demuestra que la corrección cierra la fabricación de métricas y de evidencia:
 * 1. Sin claves no hay atestación: falla explícita (no genera ni rota en silencio).
 * 2. La creación de claves es atómica y con permisos 0600 en POSIX.
 * 3. Cifras fabricadas del llamador no producen una atestación verificada.
 * 4. Un JSON de evidencia sin SHA declarado se rechaza explícitamente.
 * 5. Un JSON fabricado con SHA correcto pero sin entrada en el ledger no es VERIFIED.
 * 6. Un productor no autorizado se rechaza explícitamente.
 * 7. Solo la evidencia registrada por el productor (ledger encadenado y firmado) da VERIFIED.
 * 8. Una ejecución fallida registrada no da VERIFIED.
 * 9. Un ledger manipulado invalida la evidencia.
 * 10. Clave corrupta: fallo explícito sin reparación silenciosa (fixture umask-safe).
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const DriveDsseAttester = require('../../tools/drive_dsse_attester.js');
const { recordEvidence, sha256 } = require('../../tools/evidence_ledger.js');

console.log('=== AX-F-227 Atestación evidence-bound: pruebas adversariales ===\n');

function capturarError(fn) {
  try {
    fn();
    return null;
  } catch (err) {
    return err;
  }
}

function signerFor(attester) {
  const { privateKeyPem, publicKeyPem } = attester.loadKeyPair();
  return {
    keyId: attester.keyIdFor(publicKeyPem),
    sign: (buffer) => crypto.sign(null, buffer, privateKeyPem)
  };
}

function payloadTestRun(overrides = {}) {
  return {
    schema: 'axion.verification/v1',
    producer: 'tools/verify_changes.js',
    runner: 'node tests/run_all.js',
    command: 'node tests/run_all.js',
    exitCode: 0,
    status: 'PASS',
    suites: { total: 3, passed: 3, failed: 0 },
    startedAt: new Date(0).toISOString(),
    finishedAt: new Date(1000).toISOString(),
    durationMs: 1000,
    outputSha256: sha256('salida controlada'),
    ...overrides
  };
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-dsse-'));
try {
  const attester = new DriveDsseAttester(root);

  // 1. Sin claves: falla explícita; no se crea material silenciosamente
  const errSinClaves = capturarError(() => attester.attestSession({ missionId: 'M1', title: 'sin claves' }));
  assert.ok(errSinClaves, 'Debe fallar sin claves');
  assert.strictEqual(errSinClaves.code, 'ERR_KEYS_MISSING');
  assert.strictEqual(fs.existsSync(attester.privKeyPath()), false, 'No debe crear clave privada en silencio');
  console.log('✓ Sin claves: fallo explícito ERR_KEYS_MISSING, sin generación silenciosa');

  // 2. Creación explícita con permisos restrictivos
  const par = attester.generateKeyPair();
  assert.strictEqual(par.created, true);
  if (process.platform !== 'win32') {
    const modo = fs.statSync(attester.privKeyPath()).mode & 0o777;
    assert.strictEqual(modo, 0o600, `La clave privada debe ser 0600, es ${modo.toString(8)}`);
    console.log('✓ Clave privada creada con permisos 0600 (independiente del umask por chmod explícito)');
  } else {
    console.log('✓ Clave privada creada (permisos POSIX no aplican en Windows)');
  }

  // 3. Segunda creación: nunca rota en silencio
  const contenidoAntes = fs.readFileSync(attester.privKeyPath(), 'utf8');
  const errRotar = capturarError(() => attester.generateKeyPair());
  assert.ok(errRotar);
  assert.strictEqual(errRotar.code, 'ERR_KEYS_EXIST');
  assert.strictEqual(fs.readFileSync(attester.privKeyPath(), 'utf8'), contenidoAntes, 'La clave no debe rotarse');
  console.log('✓ Re-generación rechazada (ERR_KEYS_EXIST) sin rotación silenciosa');

  // 4. Métricas fabricadas sin evidencia: UNVERIFIED
  const fabricada = attester.attestSession({
    missionId: 'MISSION_FABRICADA',
    title: 'Cifras inventadas',
    suitesPassed: 9999,
    chaosVectorsBlocked: 123456,
    converged: true
  });
  assert.strictEqual(fabricada.verificationStatus, 'UNVERIFIED');
  const stmt = JSON.parse(Buffer.from(fabricada.dsseEnvelope.payload, 'base64').toString('utf8'));
  assert.strictEqual(stmt.predicate.governance.suitesPassed, null, 'No puede afirmar suitesPassed sin evidencia');
  assert.strictEqual(stmt.predicate.mission.converged, null, 'No puede afirmar convergencia sin evidencia');
  assert.strictEqual(stmt.predicate.unverifiedClaims.values.suitesPassed, 9999, 'La cifra queda marcada como claim no verificado');
  console.log('✓ Cifras fabricadas quedan UNVERIFIED y marcadas como claims del llamador');

  // 5. Evidencia sin SHA declarado: rechazo explícito
  const evidenciaDir = path.join(root, '.axion', 'evidence');
  fs.mkdirSync(evidenciaDir, { recursive: true });
  const sinSha = path.join(evidenciaDir, 'sin-sha.json');
  fs.writeFileSync(sinSha, JSON.stringify(payloadTestRun(), null, 2), 'utf8');
  const errSinSha = capturarError(() => attester.attestSession({
    missionId: 'MISSION_SIN_SHA',
    title: 'Sin SHA',
    evidence: { testRun: { path: sinSha } }
  }));
  assert.ok(errSinSha);
  assert.strictEqual(errSinSha.code, 'ERR_EVIDENCE_HASH_REQUIRED');
  console.log('✓ Evidencia sin SHA declarado rechazada (ERR_EVIDENCE_HASH_REQUIRED)');

  // 6. JSON fabricado con SHA correcto pero sin ledger: NO es VERIFIED
  const fabricadoConSha = attester.attestSession({
    missionId: 'MISSION_FABRICADA_SHA',
    title: 'JSON suelto con SHA',
    evidence: { testRun: { path: sinSha, sha256: sha256(fs.readFileSync(sinSha)) } }
  });
  assert.strictEqual(fabricadoConSha.verificationStatus, 'UNVERIFIED', 'Un JSON suelto no puede acreditar ejecución');
  const stmtSuelto = JSON.parse(Buffer.from(fabricadoConSha.dsseEnvelope.payload, 'base64').toString('utf8'));
  assert.match(stmtSuelto.predicate.verification.reason, /ledger/i, 'La razón debe mencionar el ledger');
  console.log('✓ JSON con SHA correcto pero sin ledger queda UNVERIFIED');

  // 7. Productor no autorizado: rechazo explícito
  const otroProductor = path.join(evidenciaDir, 'otro-productor.json');
  fs.writeFileSync(otroProductor, JSON.stringify(payloadTestRun({ producer: 'tools/otro.js' }), null, 2), 'utf8');
  const errProductor = capturarError(() => attester.attestSession({
    missionId: 'MISSION_PRODUCTOR',
    title: 'Productor ajeno',
    evidence: { testRun: { path: otroProductor, sha256: sha256(fs.readFileSync(otroProductor)) } }
  }));
  assert.ok(errProductor);
  assert.strictEqual(errProductor.code, 'ERR_EVIDENCE_PRODUCER_MISMATCH');
  console.log('✓ Productor no autorizado rechazado (ERR_EVIDENCE_PRODUCER_MISMATCH)');

  // 8. Evidencia real registrada por el productor: VERIFIED con vínculo de ledger
  const signer = signerFor(attester);
  const producida = recordEvidence(root, payloadTestRun({ signer }));
  const verificada = attester.attestSession({
    missionId: 'MISSION_VERIFICADA',
    title: 'Evidencia registrada',
    suitesPassed: 9999,
    evidence: { testRun: { path: producida.path, sha256: producida.sha256 } }
  });
  assert.strictEqual(verificada.verificationStatus, 'VERIFIED');
  const stmtOk = JSON.parse(Buffer.from(verificada.dsseEnvelope.payload, 'base64').toString('utf8'));
  assert.strictEqual(stmtOk.predicate.verification.status, 'VERIFIED');
  assert.strictEqual(stmtOk.predicate.verification.ledger.valid, true);
  assert.strictEqual(stmtOk.predicate.governance.suitesPassed, 3, 'Las cifras verificadas vienen del artefacto, no del llamador');
  const evidencia = stmtOk.predicate.verification.evidence.find((e) => e.slot === 'testRun');
  assert.strictEqual(evidencia.sha256, producida.sha256, 'El SHA-256 debe corresponder al artefacto real');
  assert.strictEqual(evidencia.producer, 'tools/verify_changes.js');
  assert.strictEqual(evidencia.ledgerSeq, 1, 'La evidencia debe estar registrada en el ledger');
  assert.ok(attester.verifyAttestation(verificada.dsseEnvelope).valid);
  console.log('✓ Evidencia registrada por el productor produce VERIFIED con ledger firmado');

  // 9. Ejecución fallida registrada: UNVERIFIED
  const fallida = recordEvidence(root, payloadTestRun({
    exitCode: 1,
    status: 'FAIL',
    suites: { total: 3, passed: 2, failed: 1 },
    signer
  }));
  const conFallo = attester.attestSession({
    missionId: 'MISSION_FALLO',
    title: 'Suite en rojo',
    evidence: { testRun: { path: fallida.path, sha256: fallida.sha256 } }
  });
  assert.strictEqual(conFallo.verificationStatus, 'UNVERIFIED', 'Una ejecución fallida no puede atestarse como éxito');
  console.log('✓ Ejecución fallida registrada produce UNVERIFIED');

  // 10. Ledger manipulado: la evidencia deja de verificar
  const ledgerFile = path.join(evidenciaDir, 'ledger.jsonl');
  const lineas = fs.readFileSync(ledgerFile, 'utf8').split('\n').filter(Boolean);
  const primera = JSON.parse(lineas[0]);
  primera.artifactSha256 = primera.artifactSha256.split('').reverse().join('');
  lineas[0] = JSON.stringify(primera);
  fs.writeFileSync(ledgerFile, `${lineas.join('\n')}\n`, 'utf8');
  const conLedgerRoto = attester.attestSession({
    missionId: 'MISSION_LEDGER_ROTO',
    title: 'Ledger manipulado',
    evidence: { testRun: { path: producida.path, sha256: producida.sha256 } }
  });
  assert.strictEqual(conLedgerRoto.verificationStatus, 'UNVERIFIED', 'Un ledger manipulado no puede verificar');
  console.log('✓ Ledger manipulado invalida la evidencia (UNVERIFIED)');

  // 11. keyid ajeno: la verificación no acepta cualquier clave
  const envelopeAjeno = JSON.parse(JSON.stringify(verificada.dsseEnvelope));
  envelopeAjeno.signatures[0].keyid = 'ed25519:0000000000000000';
  assert.strictEqual(attester.verifyAttestation(envelopeAjeno).valid, false);
  console.log('✓ keyid ajeno rechazado por la verificación');

  // 12. Clave corrupta: fallo explícito, fixture con permisos fijados (umask-safe)
  const rootCorrupto = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-dsse-corrupto-'));
  try {
    const attesterCorrupto = new DriveDsseAttester(rootCorrupto);
    fs.writeFileSync(attesterCorrupto.privKeyPath(), '-----BEGIN PRIVATE KEY-----\nbasura\n-----END PRIVATE KEY-----\n', 'utf8');
    fs.writeFileSync(attesterCorrupto.pubKeyPath(), '-----BEGIN PUBLIC KEY-----\nbasura\n-----END PUBLIC KEY-----\n', 'utf8');
    if (process.platform !== 'win32') {
      fs.chmodSync(attesterCorrupto.privKeyPath(), 0o600);
      fs.chmodSync(attesterCorrupto.pubKeyPath(), 0o644);
    }
    const antes = fs.readFileSync(attesterCorrupto.privKeyPath(), 'utf8');
    const errCorrupto = capturarError(() => attesterCorrupto.attestSession({ missionId: 'M2', title: 'corrupta' }));
    assert.ok(errCorrupto);
    assert.strictEqual(errCorrupto.code, 'ERR_KEYS_CORRUPT');
    assert.strictEqual(fs.readFileSync(attesterCorrupto.privKeyPath(), 'utf8'), antes, 'No debe reparar ni rotar la clave corrupta');
    console.log('✓ Clave corrupta: ERR_KEYS_CORRUPT sin reparación silenciosa (fixture 0600 explícito)');
  } finally {
    fs.rmSync(rootCorrupto, { recursive: true, force: true });
  }

  console.log('\nPASS: AX-F-227 — Atestación basada en evidencia y ledger verificada adversarialmente.');
} finally {
  try {
    fs.rmSync(root, { recursive: true, force: true });
  } catch (_) {
    // limpieza best-effort
  }
}
