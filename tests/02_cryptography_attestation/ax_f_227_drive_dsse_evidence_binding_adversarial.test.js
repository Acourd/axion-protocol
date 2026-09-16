'use strict';

/**
 * AX-F-227: Invariantes adversariales de atestación basada en evidencia (P0-C).
 *
 * Demuestra que la corrección cierra la fabricación de métricas:
 * 1. Sin claves no hay atestación: falla explícita (no genera ni rota en silencio).
 * 2. La creación de claves es atómica, explícita y con permisos restrictivos en POSIX.
 * 3. Cifras fabricadas del llamador no producen una atestación verificada.
 * 4. Solo evidencia real (artefacto con hash coincidente y ejecución exitosa) produce VERIFIED.
 * 5. Hash de evidencia alterado, ejecución fallida o clave corrupta fallan explícitamente.
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const DriveDsseAttester = require('../../tools/drive_dsse_attester.js');

console.log('=== AX-F-227 Atestación evidence-bound: pruebas adversariales ===\n');

function capturarError(fn) {
  try {
    fn();
    return null;
  } catch (err) {
    return err;
  }
}

function sha256File(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
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

  // 2. Creación explícita
  const par = attester.generateKeyPair();
  assert.strictEqual(par.created, true);
  assert.ok(fs.existsSync(attester.privKeyPath()));
  if (process.platform !== 'win32') {
    const modo = fs.statSync(attester.privKeyPath()).mode & 0o777;
    assert.strictEqual(modo, 0o600, `La clave privada debe ser 0600, es ${modo.toString(8)}`);
    console.log('✓ Clave privada creada con permisos 0600');
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
  assert.strictEqual(stmt.predicate.governance.vibeGuardStrictClean, null, 'No puede afirmar VibeGuard limpio sin evidencia');
  assert.strictEqual(stmt.predicate.mission.converged, null, 'No puede afirmar convergencia sin evidencia');
  assert.strictEqual(stmt.predicate.unverifiedClaims.values.suitesPassed, 9999, 'La cifra queda marcada como claim no verificado');
  assert.strictEqual(stmt.predicate.unverifiedClaims.trust, 'CALLER_ASSERTED');
  console.log('✓ Cifras fabricadas quedan UNVERIFIED y marcadas como claims del llamador');

  // 5. Evidencia con hash declarado que no coincide: fallo explícito
  const evidenciaDir = path.join(root, '.axion', 'evidence');
  fs.mkdirSync(evidenciaDir, { recursive: true });
  const testRunPath = path.join(evidenciaDir, 'test-run.json');
  const testRunOk = {
    schema: 'axion.verification/v1',
    runner: 'node tests/run_all.js',
    exitCode: 0,
    status: 'PASS',
    suites: { total: 3, passed: 3, failed: 0 },
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString()
  };
  fs.writeFileSync(testRunPath, JSON.stringify(testRunOk, null, 2), 'utf8');

  const errHash = capturarError(() => attester.attestSession({
    missionId: 'MISSION_HASH',
    title: 'Hash alterado',
    evidence: { testRun: { path: testRunPath, sha256: '0'.repeat(64) } }
  }));
  assert.ok(errHash);
  assert.strictEqual(errHash.code, 'ERR_EVIDENCE_HASH_MISMATCH');
  console.log('✓ Hash de evidencia alterado rechazado (ERR_EVIDENCE_HASH_MISMATCH)');

  // 6. Ejecución fallida: UNVERIFIED
  const testRunFallido = JSON.parse(JSON.stringify(testRunOk));
  testRunFallido.exitCode = 1;
  testRunFallido.status = 'FAIL';
  testRunFallido.suites = { total: 3, passed: 2, failed: 1 };
  fs.writeFileSync(testRunPath, JSON.stringify(testRunFallido, null, 2), 'utf8');
  const conFallo = attester.attestSession({
    missionId: 'MISSION_FALLO',
    title: 'Suite en rojo',
    evidence: { testRun: { path: testRunPath } }
  });
  assert.strictEqual(conFallo.verificationStatus, 'UNVERIFIED', 'Una ejecución fallida no puede atestarse como éxito');
  console.log('✓ Ejecución fallida produce UNVERIFIED');

  // 7. Evidencia real + VibeGuard limpio: VERIFIED con hashes vinculados
  fs.writeFileSync(testRunPath, JSON.stringify(testRunOk, null, 2), 'utf8');
  const vibeGuardPath = path.join(evidenciaDir, 'vibeguard.json');
  fs.writeFileSync(vibeGuardPath, JSON.stringify({
    schema: 'axion.vibeguard/v1',
    pass: true,
    findings: 0,
    finishedAt: new Date().toISOString()
  }, null, 2), 'utf8');

  const verificada = attester.attestSession({
    missionId: 'MISSION_VERIFICADA',
    title: 'Evidencia real',
    suitesPassed: 9999,
    evidence: {
      testRun: { path: testRunPath },
      vibeGuard: { path: vibeGuardPath }
    }
  });
  assert.strictEqual(verificada.verificationStatus, 'VERIFIED');
  const stmtOk = JSON.parse(Buffer.from(verificada.dsseEnvelope.payload, 'base64').toString('utf8'));
  assert.strictEqual(stmtOk.predicate.verification.status, 'VERIFIED');
  assert.strictEqual(stmtOk.predicate.governance.suitesPassed, 3, 'Las cifras verificadas vienen del artefacto, no del llamador');
  assert.strictEqual(stmtOk.predicate.governance.vibeGuardStrictClean, true);
  assert.strictEqual(stmtOk.predicate.governance.vibeGuardFindings, 0);
  const evidencia = stmtOk.predicate.verification.evidence.find((e) => e.slot === 'testRun');
  assert.strictEqual(evidencia.sha256, sha256File(testRunPath), 'El SHA-256 debe corresponder al artefacto real');
  assert.ok(attester.verifyAttestation(verificada.dsseEnvelope).valid);
  console.log('✓ Evidencia real produce VERIFIED con SHA-256 del artefacto vinculado');

  // 8. Clave corrupta: fallo explícito y sin reparación silenciosa
  const rootCorrupto = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-dsse-corrupto-'));
  try {
    const attesterCorrupto = new DriveDsseAttester(rootCorrupto);
    fs.writeFileSync(attesterCorrupto.privKeyPath(), '-----BEGIN PRIVATE KEY-----\nbasura\n-----END PRIVATE KEY-----\n', 'utf8');
    fs.writeFileSync(attesterCorrupto.pubKeyPath(), '-----BEGIN PUBLIC KEY-----\nbasura\n-----END PUBLIC KEY-----\n', 'utf8');
    const antes = fs.readFileSync(attesterCorrupto.privKeyPath(), 'utf8');
    const errCorrupto = capturarError(() => attesterCorrupto.attestSession({ missionId: 'M2', title: 'corrupta' }));
    assert.ok(errCorrupto);
    assert.strictEqual(errCorrupto.code, 'ERR_KEYS_CORRUPT');
    assert.strictEqual(fs.readFileSync(attesterCorrupto.privKeyPath(), 'utf8'), antes, 'No debe reparar ni rotar la clave corrupta');
    console.log('✓ Clave corrupta: ERR_KEYS_CORRUPT sin reparación silenciosa');
  } finally {
    fs.rmSync(rootCorrupto, { recursive: true, force: true });
  }

  // 9. keyid ajeno: la verificación no debe aceptar cualquier clave
  const envelopeAjeno = JSON.parse(JSON.stringify(verificada.dsseEnvelope));
  envelopeAjeno.signatures[0].keyid = 'ed25519:0000000000000000';
  assert.strictEqual(attester.verifyAttestation(envelopeAjeno).valid, false);
  console.log('✓ keyid ajeno rechazado por la verificación');

  console.log('\nPASS: AX-F-227 — Atestación basada en evidencia verificada adversarialmente.');
} finally {
  try {
    fs.rmSync(root, { recursive: true, force: true });
  } catch (_) {
    // limpieza best-effort
  }
}
