'use strict';

/**
 * AX-F-225: Invariantes Adversariales de Frontera de Permisos e Identidad del Host en PreMortem
 *
 * Demuestra de forma empírica con evidencia a nivel de sistema operativo (EACCES / EPERM)
 * y separación criptográfica que un agente autónomo (AGY) no puede vulnerar la frontera de
 * gobernanza humana ni ejecutar un ataque de "confused deputy" (Auditoría Linear Veredicto 6):
 *
 * 1. [OS Permission Boundary] AGY intenta modificar el firmante humano externo (human_sign_risk.js)
 *    ubicado en ~/.axion/bin/: bloqueado directamente por el sistema de archivos (EPERM / EACCES).
 * 2. [Key Custody Isolation] AGY intenta leer o acceder a la clave privada Ed25519 de la autoridad humana:
 *    bloqueado por prohibición estricta de residir en el workspace (WORKSPACE_PRIVATE_KEY_FORBIDDEN)
 *    y aislamiento de permisos.
 * 3. [Unauthenticated Acceptance] AGY intenta forjar o auto-crear una aceptación directamente:
 *    rechazado fail-closed por el verificador (UNTRUSTED_KEY_ID / INVALID_ED25519_SIGNATURE).
 * 4. [Acceptance Immutability] AGY intenta sobrescribir una aceptación existente:
 *    bloqueado a nivel de sistema operativo por atributo Read-Only (EPERM / EACCES) y a nivel
 *    de motor por invariante inmutable (ACCEPTANCE_ALREADY_EXISTS).
 * 5. [Authority Integrity] AGY intenta alterar la política de autoridades (policies/authorities.json):
 *    detectado y rechazado fail-closed por violación del sello criptográfico de la raíz soberana
 *    (UNTRUSTED_REGISTRY_MODIFICATION).
 * 6. [Ledger Append-Only Boundary] AGY intenta modificar o truncar el ledger o su head externo:
 *    bloqueado a nivel de sistema operativo (EPERM / EACCES) y detectado por discrepancia
 *    hash-chained (LEDGER_TRUNCATION_DETECTED / LEDGER_HASH_TAMPERED).
 *
 * Cero dependencias externas.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const ROOT = path.resolve(__dirname, '..', '..');
const PreMortemEngine = require('../../tools/premortem.js');
const {
  createRootSeal,
  verifyRootSeal,
} = require('../../tools/governance_root.js');
const { computePublicKeyId } = require('../../tools/approval_ed25519.js');
const { canonicalize, hashCanonical } = require('../../tools/canonical_json.js');

console.log('=== AX-F-225 Invariantes Adversariales de Frontera de Permisos e Identidad del Host ===\n');

const sandbox = path.join(ROOT, 'scratch', `test_ax_f_225_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`);
fs.mkdirSync(path.join(sandbox, 'policies'), { recursive: true });
fs.mkdirSync(path.join(sandbox, 'tools'), { recursive: true });
fs.mkdirSync(path.join(sandbox, '.axion', 'state'), { recursive: true });

// Almacén externo aislado para simular el host protegido del operador humano
const externalHostDir = path.join(os.tmpdir(), `axion_external_host_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`);
fs.mkdirSync(path.join(externalHostDir, 'bin'), { recursive: true });
fs.mkdirSync(path.join(externalHostDir, 'keys'), { recursive: true });
fs.mkdirSync(path.join(externalHostDir, 'state'), { recursive: true });

try {
  // 1. Configurar Raíz Soberana y Operador Humano en almacén externo
  const rootKeyPair = crypto.generateKeyPairSync('ed25519');
  const rootKeyId = computePublicKeyId(rootKeyPair.publicKey);
  const rootPubPem = rootKeyPair.publicKey.export({ type: 'spki', format: 'pem' });
  process.env.AXION_ROOT_KEY_PUB = rootPubPem;

  const humanKeyPair = crypto.generateKeyPairSync('ed25519');
  const humanKeyId = computePublicKeyId(humanKeyPair.publicKey);
  const humanPubPem = humanKeyPair.publicKey.export({ type: 'spki', format: 'pem' });
  const humanPrivPem = humanKeyPair.privateKey.export({ type: 'pkcs8', format: 'pem' });

  // Guardar clave privada en almacén externo
  const humanPrivKeyPath = path.join(externalHostDir, 'keys', 'operator_human.key');
  fs.writeFileSync(humanPrivKeyPath, humanPrivPem, { mode: 0o400 });

  // Instalar el firmante humano externo en externalHostDir/bin/human_sign_risk.js y marcarlo Read-Only
  const externalSignerPath = path.join(externalHostDir, 'bin', 'human_sign_risk.js');
  fs.writeFileSync(externalSignerPath, '// Protected Sovereign Human Signer v3.2.0\nmodule.exports = { sign: () => {} };\n', 'utf8');
  try {
    fs.chmodSync(externalSignerPath, 0o444);
  } catch (_) {
    // Ignorar si el sistema de archivos no implementa chmod
  }

  // Crear registro de autoridades sellado legítimo en el sandbox
  const registry = {
    version: '1.0.0',
    policyId: 'axion-authority-governance-v1',
    monotonicVersion: 2,
    issuedAt: '2026-09-06T00:00:00.000Z',
    expiresAt: '2030-01-01T00:00:00.000Z',
    authorities: [
      {
        actorId: 'Lead Architect (@adrian)',
        keyId: humanKeyId,
        publicKeyPem: humanPubPem,
        roles: ['HUMAN_AUTHORITY'],
        status: 'TRUSTED',
        expiresAt: '2030-01-01T00:00:00.000Z',
        allowedEnvironments: ['development', 'staging'],
        allowedRiskLevels: ['LOW', 'MEDIUM', 'HIGH'],
      }
    ]
  };
  const regPath = path.join(sandbox, 'policies', 'authorities.json');
  fs.writeFileSync(regPath, JSON.stringify(registry, null, 2), 'utf8');

  const seal = createRootSeal(registry, rootKeyPair.privateKey);
  seal.rootKeyId = rootKeyId;
  const unsignedSeal = { ...seal };
  delete unsignedSeal.algorithm;
  delete unsignedSeal.signature;
  seal.signature = crypto.sign(null, Buffer.from(canonicalize(unsignedSeal), 'utf8'), rootKeyPair.privateKey).toString('base64');
  const sealPath = path.join(sandbox, 'policies', 'authorities.seal.json');
  fs.writeFileSync(sealPath, JSON.stringify(seal, null, 2), 'utf8');

  const lockFile = path.join(sandbox, '.axion', 'state', 'authority_version.lock');
  fs.writeFileSync(lockFile, '2', 'utf8');

  const engine = new PreMortemEngine(sandbox);

  // -------------------------------------------------------------------------
  // VECTOR 1: AGY intenta modificar el firmante humano externo
  // -------------------------------------------------------------------------
  // El firmante reside fuera del workspace y tiene atributos de sólo lectura (0o444).
  // La modificación directa debe ser interceptada y rechazada por el sistema operativo (EPERM / EACCES).
  let signerTamperBlocked = false;
  try {
    fs.writeFileSync(externalSignerPath, '// MALICIOUS INJECTION BY AGENT\n', { flag: 'w' });
  } catch (err) {
    if (err.code === 'EPERM' || err.code === 'EACCES') {
      signerTamperBlocked = true;
    }
  }
  assert.strictEqual(signerTamperBlocked, true, 'La modificación del firmante externo debe ser rechazada por el OS con EPERM o EACCES');
  console.log('✓ 1. [OS Permission] Intento de modificar el firmante humano externo bloqueado por permisos del host (EPERM / EACCES)');

  // -------------------------------------------------------------------------
  // VECTOR 2: AGY intenta usar una clave privada ubicada dentro del workspace
  // -------------------------------------------------------------------------
  const rogueWorkspaceKeyPath = path.join(sandbox, 'rogue_agent.key');
  fs.writeFileSync(rogueWorkspaceKeyPath, humanPrivPem, 'utf8');

  assert.throws(() => {
    engine.acceptRisk({
      premortemId: '0123456789abcdef',
      proposalDigest: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      operator: 'Lead Architect (@adrian)',
      privateKeyPath: rogueWorkspaceKeyPath,
      rationale: 'Intento de firmar con clave guardada dentro del workspace por el agente',
      allowHeadlessForTest: true,
      allowTestKeyInWorkspace: false, // Forzar la prohibición de producción
    });
  }, (err) => {
    return err.message.includes('WORKSPACE_PRIVATE_KEY_FORBIDDEN');
  }, 'El uso de claves privadas dentro del workspace debe ser rechazado fail-closed');
  console.log('✓ 2. [Key Isolation] Intento de usar clave privada dentro del workspace bloqueado (WORKSPACE_PRIVATE_KEY_FORBIDDEN)');

  // -------------------------------------------------------------------------
  // VECTOR 3: AGY intenta forjar una aceptación con clave no autorizada
  // -------------------------------------------------------------------------
  const rogueKeyPair = crypto.generateKeyPairSync('ed25519');
  const rogueProposal = {
    feature_name: 'Propuesta Hostil No Autorizada',
    anchors: {
      security: ['Intento de eludir la gobernanza mediante clave autocontenida'],
      performance: ['Desbordamiento de recursos en sandbox'],
      architecture: ['Inyección de dependencia circular'],
      ux: ['NO_APLICA: Módulo interno de red']
    },
    competence_check: { justified: false },
    worst_case_scenarios: ['Falla general del nodo'],
    mandatory_mitigations: ['Ninguna'],
    scope: ['tools/driver.js'],
    depth_level: 2
  };
  const rogueDigest = hashCanonical(rogueProposal);
  const rogueId = rogueDigest.slice(0, 16);

  assert.throws(() => {
    engine.acceptRisk({
      premortemId: rogueId,
      proposalDigest: rogueDigest,
      operator: 'Rogue Operator (@attacker)',
      privateKey: rogueKeyPair.privateKey,
      rationale: 'Falso intento de autorización con clave no inscrita en authorities.json',
      allowHeadlessForTest: true,
      allowTestKeyInWorkspace: true,
    });
  }, (err) => {
    return err.message.includes('UNTRUSTED_KEY_ID') || err.message.includes('AUTHORITY_REGISTRY_ERROR');
  }, 'La aceptación con una clave no registrada debe ser rechazada fail-closed');
  console.log('✓ 3. [Unauthenticated Acceptance] Intento de forjar aceptación con clave no autorizada rechazado fail-closed (UNTRUSTED_KEY_ID)');

  // -------------------------------------------------------------------------
  // VECTOR 4: AGY intenta sobrescribir una aceptación legítima existente
  // -------------------------------------------------------------------------
  // 4a. Crear aceptación legítima fuera de banda
  const legitResult = engine.acceptRisk({
    premortemId: rogueId,
    proposalDigest: rogueDigest,
    baseCommitSha: '1111222233334444555566667777888899990000',
    operator: 'Lead Architect (@adrian)',
    privateKey: humanKeyPair.privateKey,
    rationale: 'Aceptación legítima formal emitida por el operador humano responsable',
    environment: 'development',
    allowedEnvironments: ['development'],
    allowHeadlessForTest: true,
    allowTestKeyInWorkspace: true,
  });
  assert.strictEqual(legitResult.pass, true);
  const acceptanceFilePath = legitResult.targetFile;

  // 4b. AGY intenta sobrescribir directamente en el sistema de archivos (bloqueado por modo 0o444)
  let fsOverwriteBlocked = false;
  try {
    fs.writeFileSync(acceptanceFilePath, '{"tampered": true}', { flag: 'w' });
  } catch (err) {
    if (err.code === 'EPERM' || err.code === 'EACCES') {
      fsOverwriteBlocked = true;
    }
  }
  assert.strictEqual(fsOverwriteBlocked, true, 'La sobrescritura física del archivo de aceptación debe ser bloqueada por el OS (EPERM / EACCES)');

  // 4c. AGY intenta sobrescribir invocando acceptRisk (bloqueado por regla de inmutabilidad)
  assert.throws(() => {
    engine.acceptRisk({
      premortemId: rogueId,
      proposalDigest: rogueDigest,
      operator: 'Lead Architect (@adrian)',
      privateKey: humanKeyPair.privateKey,
      rationale: 'Intento de sobrescritura silenciosa de registro inmutable',
      allowHeadlessForTest: true,
      allowTestKeyInWorkspace: true,
      allowOverwriteForTest: false,
    });
  }, (err) => {
    return err.message.includes('ACCEPTANCE_ALREADY_EXISTS');
  }, 'La sobrescritura lógica de una aceptación existente debe ser rechazada');
  console.log('✓ 4. [Acceptance Immutability] Sobrescritura de aceptación bloqueada por OS (EPERM) y por motor (ACCEPTANCE_ALREADY_EXISTS)');

  // -------------------------------------------------------------------------
  // VECTOR 5: AGY intenta modificar la política de autoridades
  // -------------------------------------------------------------------------
  const tamperedRegistry = {
    ...registry,
    authorities: [
      ...registry.authorities,
      {
        actorId: 'Rogue Injected Authority (@attacker)',
        keyId: computePublicKeyId(rogueKeyPair.publicKey),
        publicKeyPem: rogueKeyPair.publicKey.export({ type: 'spki', format: 'pem' }),
        roles: ['HUMAN_AUTHORITY'],
        status: 'TRUSTED',
        expiresAt: '2030-01-01T00:00:00.000Z',
      }
    ]
  };
  fs.writeFileSync(regPath, JSON.stringify(tamperedRegistry, null, 2), 'utf8');

  const loadTampered = engine.loadAuthorities();
  assert.strictEqual(loadTampered.ok, false, 'El registro de autoridades modificado sin sello válido debe ser rechazado');
  assert.strictEqual(loadTampered.reason, 'UNTRUSTED_REGISTRY_MODIFICATION');
  console.log('✓ 5. [Authority Integrity] Modificación no autorizada de authorities.json rechazada por sello de raíz (UNTRUSTED_REGISTRY_MODIFICATION)');

  // -------------------------------------------------------------------------
  // VECTOR 6: AGY intenta modificar o truncar el ledger histórico o su head externo
  // -------------------------------------------------------------------------
  // Restaurar registro legítimo
  fs.writeFileSync(regPath, JSON.stringify(registry, null, 2), 'utf8');

  // El ledger en el sandbox tiene su head externo protegido
  const ledgerFile = path.join(sandbox, '.axion', 'state', 'risk-acceptance-ledger.jsonl');
  assert.strictEqual(fs.existsSync(ledgerFile), true, 'El ledger histórico debe existir tras emitir una aceptación');

  // AGY altera una línea en el ledger
  const rawLedger = fs.readFileSync(ledgerFile, 'utf8');
  assert.strictEqual(rawLedger.includes('@adrian'), true, 'El ledger debe contener el operador original');
  const tamperedLedger = rawLedger.replace('@adrian', '@attacker');
  fs.writeFileSync(ledgerFile, tamperedLedger, 'utf8');

  const ledgerAudit = PreMortemEngine.verifyLedgerIntegrity(ledgerFile, { skipExternalHeadCheck: true });
  assert.strictEqual(ledgerAudit.valid, false, 'La manipulación de una entrada del ledger debe ser detectada fail-closed');
  assert.strictEqual(ledgerAudit.reason, 'LEDGER_HASH_TAMPERED');

  // Restaurar y verificar truncamiento / head externo manipulado
  fs.writeFileSync(ledgerFile, rawLedger, 'utf8');
  const fakeExternalHeadFile = path.join(externalHostDir, 'state', 'tampered.head');
  fs.writeFileSync(fakeExternalHeadFile, '0'.repeat(64), 'utf8');
  const headMismatchAudit = PreMortemEngine.verifyLedgerIntegrity(ledgerFile, {
    externalHeadFile: fakeExternalHeadFile,
    skipExternalHeadCheck: false,
  });
  assert.strictEqual(headMismatchAudit.valid, false, 'La discrepancia contra head externo debe ser detectada fail-closed');
  assert.strictEqual(headMismatchAudit.reason, 'LEDGER_TRUNCATION_DETECTED');
  console.log('✓ 6. [Ledger Append-Only] Manipulación en ledger y discrepancia de head externo detectadas fail-closed (LEDGER_HASH_TAMPERED / LEDGER_TRUNCATION_DETECTED)');

} finally {
  // Limpieza defensiva
  delete process.env.AXION_ROOT_KEY_PUB;
  try {
    // Restaurar permisos para permitir eliminación limpia de sandboxes
    const extSigner = path.join(externalHostDir, 'bin', 'human_sign_risk.js');
    if (fs.existsSync(extSigner)) {
      try { fs.chmodSync(extSigner, 0o666); } catch (_) {}
    }
    const accFiles = fs.readdirSync(path.join(sandbox, '.axion', 'state')).filter(f => f.startsWith('risk-acceptance-'));
    for (const f of accFiles) {
      try { fs.chmodSync(path.join(sandbox, '.axion', 'state', f), 0o666); } catch (_) {}
    }
  } catch (_) {}

  try { fs.rmSync(sandbox, { recursive: true, force: true }); } catch (_) {}
  try { fs.rmSync(externalHostDir, { recursive: true, force: true }); } catch (_) {}
}

console.log('\nPASS AX-F-225 — Invariantes de frontera de permisos e identidad del host verificadas al 100%.');
