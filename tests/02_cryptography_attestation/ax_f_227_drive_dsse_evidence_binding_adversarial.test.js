'use strict';

/**
 * AX-F-227: Invariantes adversariales de atestación con autoridad separada (P0-C).
 *
 * Contrato tras el cierre del hallazgo "autoridad de evidencia no separada":
 * - La evidencia externa, incluso firmada y registrada en el ledger, NUNCA es VERIFIED:
 *   el firmante no observó la ejecución. Máximo estado: EXTERNAL_EVIDENCE, sin métricas.
 * - VERIFIED solo se emite ejecutando la suite DENTRO del componente firmante
 *   (`runSuiteAndAttest`), con cifras leídas de la salida real del proceso.
 * - Un actor con la clave local no puede obtener VERIFIED con `runner: never-executed`
 *   ni con cifras arbitrarias: solo ejecutando.
 *
 * Cubre además: SHA obligatorio, productor autorizado, ledger encadenado/firmado,
 * manipulación detectada, fixtures umask-safe, CLI `--evidence` con SHA automático.
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const DriveDsseAttester = require('../../tools/drive_dsse_attester.js');
const { recordEvidence, sha256 } = require('../../tools/evidence_ledger.js');

console.log('=== AX-F-227 Atestación con autoridad separada: pruebas adversariales ===\n');

const ROOT = path.resolve(__dirname, '..', '..');

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

function crearRaizConRunner(bodyRunner) {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-attester-run-'));
  fs.mkdirSync(path.join(raiz, 'tests'), { recursive: true });
  fs.writeFileSync(path.join(raiz, 'tests', 'run_all.js'), bodyRunner, 'utf8');
  return raiz;
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

  // 6. JSON fabricado con SHA correcto pero sin ledger: NO es verificado
  const fabricadoConSha = attester.attestSession({
    missionId: 'MISSION_FABRICADA_SHA',
    title: 'JSON suelto con SHA',
    evidence: { testRun: { path: sinSha, sha256: sha256(fs.readFileSync(sinSha)) } }
  });
  assert.strictEqual(fabricadoConSha.verificationStatus, 'UNVERIFIED');
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

  const signer = signerFor(attester);

  // 8. El escenario auditado: actor con la clave firma "runner: never-executed" y 999
  //    suites. Aunque el ledger esté íntegro, NO obtiene VERIFIED ni métricas de gobierno.
  const neverExecuted = recordEvidence(root, payloadTestRun({
    runner: 'never-executed',
    suites: { total: 999, passed: 999, failed: 0 },
    signer
  }));
  const fabricadaRegistrada = attester.attestSession({
    missionId: 'MISSION_NEVER_EXECUTED',
    title: 'Evidencia registrada pero no ejecutada',
    suitesPassed: 999,
    evidence: { testRun: { path: neverExecuted.path, sha256: neverExecuted.sha256 } }
  });
  assert.strictEqual(fabricadaRegistrada.verificationStatus, 'EXTERNAL_EVIDENCE',
    'La evidencia externa registrada no puede ser VERIFIED');
  const stmtRegistrado = JSON.parse(Buffer.from(fabricadaRegistrada.dsseEnvelope.payload, 'base64').toString('utf8'));
  assert.strictEqual(stmtRegistrado.predicate.verification.status, 'EXTERNAL_EVIDENCE');
  assert.strictEqual(stmtRegistrado.predicate.verification.mode, 'EXTERNAL_EVIDENCE');
  assert.strictEqual(stmtRegistrado.predicate.governance.suitesPassed, null, 'No se publican métricas desde un archivo externo');
  assert.strictEqual(stmtRegistrado.predicate.mission.converged, null);
  assert.strictEqual(stmtRegistrado.predicate.verification.externalEvidence.suites.passed, 999, 'La cifra externa queda etiquetada como no observada');
  assert.strictEqual(stmtRegistrado.predicate.verification.externalEvidence.trust, 'REGISTERED_NOT_OBSERVED');
  console.log('✓ Evidencia externa con clave local: EXTERNAL_EVIDENCE, sin VERIFIED ni métricas');

  // 9. Evidencia externa fallida registrada: UNVERIFIED
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
  assert.strictEqual(conFallo.verificationStatus, 'UNVERIFIED');
  console.log('✓ Evidencia externa fallida produce UNVERIFIED');

  // 10. Ledger manipulado: la evidencia externa deja de estar registrada
  const ledgerFile = path.join(evidenciaDir, 'ledger.jsonl');
  const lineas = fs.readFileSync(ledgerFile, 'utf8').split('\n').filter(Boolean);
  const primera = JSON.parse(lineas[0]);
  primera.artifactSha256 = primera.artifactSha256.split('').reverse().join('');
  lineas[0] = JSON.stringify(primera);
  fs.writeFileSync(ledgerFile, `${lineas.join('\n')}\n`, 'utf8');
  const conLedgerRoto = attester.attestSession({
    missionId: 'MISSION_LEDGER_ROTO',
    title: 'Ledger manipulado',
    evidence: { testRun: { path: neverExecuted.path, sha256: neverExecuted.sha256 } }
  });
  assert.strictEqual(conLedgerRoto.verificationStatus, 'UNVERIFIED');
  console.log('✓ Ledger manipulado invalida la evidencia externa (UNVERIFIED)');

  // 11. VERIFIED solo por ejecución dentro del firmante: runner que pasa
  const raizOk = crearRaizConRunner(
    "console.log('suites totales : 3');console.log('en verde       : 3');console.log('en rojo        : 0');process.exit(0);"
  );
  try {
    const atesterEjecutor = new DriveDsseAttester(raizOk);
    atesterEjecutor.ensureKeyPair();
    const ejecutada = atesterEjecutor.runSuiteAndAttest({ missionId: 'MISSION_EJECUTADA', title: 'Ejecución real' });
    assert.strictEqual(ejecutada.verificationStatus, 'VERIFIED');
    const stmtEjecutado = JSON.parse(Buffer.from(ejecutada.dsseEnvelope.payload, 'base64').toString('utf8'));
    assert.strictEqual(stmtEjecutado.predicate.verification.mode, 'EXECUTED_IN_SIGNER');
    assert.strictEqual(stmtEjecutado.predicate.governance.suitesPassed, 3, 'Las cifras provienen de la salida del proceso real');
    assert.strictEqual(stmtEjecutado.predicate.mission.converged, true);
    assert.strictEqual(stmtEjecutado.predicate.verification.evidence[0].producer, 'tools/drive_dsse_attester.js');
    assert.strictEqual(stmtEjecutado.predicate.verification.ledger.valid, true);
    assert.ok(atesterEjecutor.verifyAttestation(ejecutada.dsseEnvelope).valid);
    console.log('✓ runSuiteAndAttest con runner real: VERIFIED con cifras observadas en el proceso');
  } finally {
    fs.rmSync(raizOk, { recursive: true, force: true });
  }

  // 12. VERIFIED no se emite si la ejecución observada falla
  const raizFallo = crearRaizConRunner(
    "console.log('suites totales : 3');console.log('en verde       : 2');console.log('en rojo        : 1');process.exit(1);"
  );
  try {
    const atesterFallo = new DriveDsseAttester(raizFallo);
    atesterFallo.ensureKeyPair();
    const ejecutadaFallo = atesterFallo.runSuiteAndAttest({ missionId: 'MISSION_FALLO_REAL', title: 'Fallo real' });
    assert.strictEqual(ejecutadaFallo.verificationStatus, 'UNVERIFIED');
    const stmtFallo = JSON.parse(Buffer.from(ejecutadaFallo.dsseEnvelope.payload, 'base64').toString('utf8'));
    assert.strictEqual(stmtFallo.predicate.governance.suitesPassed, 2, 'Las cifras observadas se reportan tal cual');
    assert.strictEqual(stmtFallo.predicate.governance.suitesFailed, 1);
    assert.strictEqual(stmtFallo.predicate.mission.converged, false);
    console.log('✓ runSuiteAndAttest con runner que falla: UNVERIFIED con cifras reales');
  } finally {
    fs.rmSync(raizFallo, { recursive: true, force: true });
  }

  // 12b. Ledger corrupto preexistente: aunque la ejecución sea verde, NO hay VERIFIED
  const raizLedgerRoto = crearRaizConRunner(
    "console.log('suites totales : 3');console.log('en verde       : 3');console.log('en rojo        : 0');process.exit(0);"
  );
  try {
    const atesterLedgerRoto = new DriveDsseAttester(raizLedgerRoto);
    atesterLedgerRoto.ensureKeyPair();
    const dirEvidencia = path.join(raizLedgerRoto, '.axion', 'evidence');
    fs.mkdirSync(dirEvidencia, { recursive: true });
    fs.writeFileSync(path.join(dirEvidencia, 'ledger.jsonl'), '{"schema":"roto"}\n', 'utf8');
    const conLedgerPrevioRoto = atesterLedgerRoto.runSuiteAndAttest({ missionId: 'MISSION_LEDGER_PREVIO', title: 'Ledger previo roto' });
    assert.strictEqual(conLedgerPrevioRoto.verificationStatus, 'UNVERIFIED', 'Un ledger roto no puede sostener VERIFIED');
    const stmtLedgerRoto = JSON.parse(Buffer.from(conLedgerPrevioRoto.dsseEnvelope.payload, 'base64').toString('utf8'));
    assert.strictEqual(stmtLedgerRoto.predicate.verification.ledger.valid, false);
    assert.strictEqual(stmtLedgerRoto.predicate.verification.ledger.verifiedBefore, false);
    assert.strictEqual(stmtLedgerRoto.predicate.verification.evidence.length, 0, 'No se anexa evidencia a una cadena rota');
    assert.strictEqual(stmtLedgerRoto.predicate.governance.suitesPassed, 3, 'La ejecución sí ocurrió y se reporta tal cual');
    console.log('✓ Ledger corrupto previo: ejecución observada pero UNVERIFIED (sin VERIFIED ni anexado)');
  } finally {
    fs.rmSync(raizLedgerRoto, { recursive: true, force: true });
  }

  // 12c. TOCTOU del árbol: el runner termina verde pero muta un archivo rastreado
  const raizMutante = crearRaizConRunner(
    "const fs=require('fs');const path=require('path');" +
    "fs.writeFileSync(path.join(__dirname,'..','tools','tracked.js'),'mutado '+Date.now());" +
    "console.log('suites totales : 3');console.log('en verde       : 3');console.log('en rojo        : 0');process.exit(0);"
  );
  fs.mkdirSync(path.join(raizMutante, 'tools'), { recursive: true });
  fs.writeFileSync(path.join(raizMutante, 'tools', 'tracked.js'), 'original', 'utf8');
  try {
    const atesterMutante = new DriveDsseAttester(raizMutante);
    atesterMutante.ensureKeyPair();
    const conArbolMutado = atesterMutante.runSuiteAndAttest({ missionId: 'MISSION_TOCTOU', title: 'Árbol mutado en corrida' });
    assert.strictEqual(conArbolMutado.verificationStatus, 'UNVERIFIED', 'Un árbol mutado durante la corrida no puede declarar VERIFIED');
    const stmtMutado = JSON.parse(Buffer.from(conArbolMutado.dsseEnvelope.payload, 'base64').toString('utf8'));
    assert.strictEqual(stmtMutado.predicate.verification.tree.stable, false);
    assert.notStrictEqual(
      stmtMutado.predicate.verification.tree.merkleBefore,
      stmtMutado.predicate.verification.tree.merkleAfter,
      'La raíz previa y la posterior deben diferir si el árbol mutó'
    );
    console.log('✓ TOCTOU del árbol: mutación durante la corrida bloquea VERIFIED');
  } finally {
    fs.rmSync(raizMutante, { recursive: true, force: true });
  }

  // 13. keyid ajeno: la verificación no acepta cualquier clave
  const envelopeAjeno = JSON.parse(JSON.stringify(fabricadaRegistrada.dsseEnvelope));
  envelopeAjeno.signatures[0].keyid = 'ed25519:0000000000000000';
  assert.strictEqual(attester.verifyAttestation(envelopeAjeno).valid, false);
  console.log('✓ keyid ajeno rechazado por la verificación');

  // 14. Clave corrupta: fallo explícito, fixture con permisos fijados (umask-safe)
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

  // 15. CLI --evidence: calcula el SHA por sí misma y ya no muere con ERR_EVIDENCE_HASH_REQUIRED
  const attesterRepo = new DriveDsseAttester(ROOT);
  attesterRepo.ensureKeyPair();
  const producidaRepo = recordEvidence(ROOT, payloadTestRun({ signer: signerFor(attesterRepo) }));
  const cli = spawnSync(process.execPath, [
    path.join(ROOT, 'tools', 'drive_dsse_attester.js'),
    '--evidence', producidaRepo.path
  ], { encoding: 'utf8' });
  assert.strictEqual(cli.status, 0, `CLI debe salir con 0, salió ${cli.status}: ${cli.stderr}`);
  assert.ok(cli.stdout.includes('EXTERNAL_EVIDENCE'), 'El CLI debe reportar EXTERNAL_EVIDENCE (no VERIFIED)');
  assert.ok(!cli.stderr.includes('ERR_EVIDENCE_HASH_REQUIRED'), 'El CLI no debe exigir un SHA que no puede suministrar');
  console.log('✓ CLI --evidence: SHA automático y estado EXTERNAL_EVIDENCE, sin error de interfaz');

  console.log('\nPASS: AX-F-227 — Autoridad de evidencia separada verificada adversarialmente.');
} finally {
  try {
    fs.rmSync(root, { recursive: true, force: true });
  } catch (_) {
    // limpieza best-effort
  }
}
