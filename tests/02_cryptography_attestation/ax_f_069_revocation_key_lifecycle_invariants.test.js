'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  APPROVAL_STATUS,
  REGISTRY_STATES,
  computePublicKeyId,
  createSignedApproval,
  verifyAndConsumeApproval,
} = require('../../tools/approval_ed25519.js');
const {
  CHECK_STATUS,
  createSignedCheck,
  verifyIndependentCheck,
} = require('../../tools/check_ed25519.js');
const { hashCanonical } = require('../../tools/canonical_json.js');

console.log('=== AX-F-069 Invariantes Criptográficos del Ciclo de Vida y Revocación de Claves (R7) ===\n');

// 1. Estados de primera clase del registro de autoridades
assert.strictEqual(REGISTRY_STATES.has('TRUSTED'), true);
assert.strictEqual(REGISTRY_STATES.has('REVOKED'), true);
assert.strictEqual(REGISTRY_STATES.has('COMPROMISED'), true);
assert.strictEqual(REGISTRY_STATES.has('EXPIRED'), true);
assert.strictEqual(REGISTRY_STATES.has('UNKNOWN'), true);
console.log('✓ Vocabulario REGISTRY_STATES con distinción de REVOKED y COMPROMISED verificado');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-revocation-test-'));

try {
  const consumptionDir = path.join(tempDir, 'consumed');
  fs.mkdirSync(consumptionDir, { recursive: true });

  // Generar claves para Human Authority y Auditores
  const kAuthTrusted = crypto.generateKeyPairSync('ed25519');
  const kAuthRevoked = crypto.generateKeyPairSync('ed25519');
  const kAuthCompromised = crypto.generateKeyPairSync('ed25519');

  const kAuditorTrusted = crypto.generateKeyPairSync('ed25519');
  const kAuditorRevoked = crypto.generateKeyPairSync('ed25519');
  const kAuditorCompromised = crypto.generateKeyPairSync('ed25519');

  const idAuthTrusted = computePublicKeyId(kAuthTrusted.publicKey);
  const idAuthRevoked = computePublicKeyId(kAuthRevoked.publicKey);
  const idAuthCompromised = computePublicKeyId(kAuthCompromised.publicKey);

  const idAuditorTrusted = computePublicKeyId(kAuditorTrusted.publicKey);
  const idAuditorRevoked = computePublicKeyId(kAuditorRevoked.publicKey);
  const idAuditorCompromised = computePublicKeyId(kAuditorCompromised.publicKey);

  const registryData = {
    version: '1.0.0',
    authorities: [
      {
        actorId: 'human-trusted',
        keyId: idAuthTrusted,
        publicKeyPem: kAuthTrusted.publicKey.export({ type: 'spki', format: 'pem' }),
        roles: ['HUMAN_AUTHORITY'],
        status: 'TRUSTED',
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      },
      {
        actorId: 'human-revoked',
        keyId: idAuthRevoked,
        publicKeyPem: kAuthRevoked.publicKey.export({ type: 'spki', format: 'pem' }),
        roles: ['HUMAN_AUTHORITY'],
        status: 'REVOKED',
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      },
      {
        actorId: 'human-compromised',
        keyId: idAuthCompromised,
        publicKeyPem: kAuthCompromised.publicKey.export({ type: 'spki', format: 'pem' }),
        roles: ['HUMAN_AUTHORITY'],
        status: 'COMPROMISED',
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      },
      {
        actorId: 'auditor-trusted',
        keyId: idAuditorTrusted,
        publicKeyPem: kAuditorTrusted.publicKey.export({ type: 'spki', format: 'pem' }),
        roles: ['INDEPENDENT_AUDITOR'],
        status: 'TRUSTED',
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      },
      {
        actorId: 'auditor-revoked',
        keyId: idAuditorRevoked,
        publicKeyPem: kAuditorRevoked.publicKey.export({ type: 'spki', format: 'pem' }),
        roles: ['INDEPENDENT_AUDITOR'],
        status: 'REVOKED',
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      },
      {
        actorId: 'auditor-compromised',
        keyId: idAuditorCompromised,
        publicKeyPem: kAuditorCompromised.publicKey.export({ type: 'spki', format: 'pem' }),
        roles: ['INDEPENDENT_AUDITOR'],
        status: 'COMPROMISED',
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      }
    ]
  };

  const registryPath = path.join(tempDir, 'authorities.json');
  fs.writeFileSync(registryPath, JSON.stringify(registryData, null, 2), 'utf8');

  // Payload base de aprobación
  const now = new Date();
  const baseCommand = { executable: 'node', args: ['-v'], cwd: tempDir, shell: false };
  const baseScope = ['tools/'];
  const hex64 = '0'.repeat(64);

  const makeApprovalContract = (actorId, keyId) => ({
    contractVersion: '1.0.0',
    approvalId: `APP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    missionId: 'AX-MISSION-REVOC-01',
    actorId,
    keyId,
    decision: 'APPROVE',
    risk: 'HIGH',
    command: baseCommand,
    scope: baseScope,
    requirementsHash: hex64,
    policyHash: hex64,
    rollbackHash: hex64,
    issuedAt: new Date(now.getTime() - 1000).toISOString(),
    expiresAt: new Date(now.getTime() + 60000).toISOString(),
    nonce: `nonce-${'x'.repeat(32)}`,
    usageLimit: 1
  });

  const expectedBinding = {
    contractVersion: '1.0.0',
    missionId: 'AX-MISSION-REVOC-01',
    command: baseCommand,
    scope: baseScope,
    risk: 'HIGH',
    requirementsHash: hex64,
    policyHash: hex64,
    rollbackHash: hex64
  };

  // 2. Comprobación de Human Authority: TRUSTED vs REVOKED vs COMPROMISED
  const appTrusted = createSignedApproval(makeApprovalContract('human-trusted', idAuthTrusted), kAuthTrusted.privateKey);
  const resTrusted = verifyAndConsumeApproval({
    envelope: appTrusted,
    expectedBinding,
    registryPath,
    consumptionDir,
    executorActorId: 'agent-executor',
    now
  });
  assert.strictEqual(resTrusted.status, APPROVAL_STATUS.APPROVAL_VALID);

  const appRevoked = createSignedApproval(makeApprovalContract('human-revoked', idAuthRevoked), kAuthRevoked.privateKey);
  const resRevoked = verifyAndConsumeApproval({
    envelope: appRevoked,
    expectedBinding,
    registryPath,
    consumptionDir,
    executorActorId: 'agent-executor',
    now
  });
  assert.strictEqual(resRevoked.status, APPROVAL_STATUS.APPROVAL_REVOKED_AUTHORITY);

  const appCompromised = createSignedApproval(makeApprovalContract('human-compromised', idAuthCompromised), kAuthCompromised.privateKey);
  const resCompromised = verifyAndConsumeApproval({
    envelope: appCompromised,
    expectedBinding,
    registryPath,
    consumptionDir,
    executorActorId: 'agent-executor',
    now
  });
  assert.strictEqual(resCompromised.status, APPROVAL_STATUS.APPROVAL_COMPROMISED_KEY);
  console.log('✓ Distinción estricta de APPROVAL_REVOKED_AUTHORITY y APPROVAL_COMPROMISED_KEY verificada');

  // 3. Comprobación de Auditor Independiente: TRUSTED vs REVOKED vs COMPROMISED
  const makeCheckContract = (actorId, keyId) => ({
    contractVersion: '1.0.0',
    checkId: `CHK-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    missionId: 'AX-MISSION-REVOC-01',
    actorId,
    keyId,
    executorActorId: 'agent-executor',
    risk: 'HIGH',
    commandHash: hashCanonical(baseCommand),
    approvalDigest: resTrusted.approvalDigest,
    assertionsHash: hashCanonical(['assertion 1']),
    evidenceHash: hex64,
    result: 'PASS',
    exitCode: 0,
    issuedAt: new Date(now.getTime() - 1000).toISOString(),
    expiresAt: new Date(now.getTime() + 60000).toISOString()
  });

  const expectedCheckBinding = {
    missionId: 'AX-MISSION-REVOC-01',
    risk: 'HIGH',
    commandHash: hashCanonical(baseCommand),
    approvalDigest: resTrusted.approvalDigest,
    assertionsHash: hashCanonical(['assertion 1'])
  };

  const chkTrusted = createSignedCheck(makeCheckContract('auditor-trusted', idAuditorTrusted), kAuditorTrusted.privateKey);
  const resChkTrusted = verifyIndependentCheck({
    envelope: chkTrusted,
    expectedBinding: expectedCheckBinding,
    registryPath,
    executorActorId: 'agent-executor',
    approvalActorId: 'human-trusted',
    approvalRequired: true,
    now
  });
  assert.strictEqual(resChkTrusted.status, CHECK_STATUS.CHECK_VALID);

  const chkRevoked = createSignedCheck(makeCheckContract('auditor-revoked', idAuditorRevoked), kAuditorRevoked.privateKey);
  const resChkRevoked = verifyIndependentCheck({
    envelope: chkRevoked,
    expectedBinding: expectedCheckBinding,
    registryPath,
    executorActorId: 'agent-executor',
    approvalActorId: 'human-trusted',
    approvalRequired: true,
    now
  });
  assert.strictEqual(resChkRevoked.status, CHECK_STATUS.CHECK_REVOKED_AUDITOR);

  const chkCompromised = createSignedCheck(makeCheckContract('auditor-compromised', idAuditorCompromised), kAuditorCompromised.privateKey);
  const resChkCompromised = verifyIndependentCheck({
    envelope: chkCompromised,
    expectedBinding: expectedCheckBinding,
    registryPath,
    executorActorId: 'agent-executor',
    approvalActorId: 'human-trusted',
    approvalRequired: true,
    now
  });
  assert.strictEqual(resChkCompromised.status, CHECK_STATUS.CHECK_COMPROMISED_KEY);
  console.log('✓ Distinción estricta de CHECK_REVOKED_AUDITOR y CHECK_COMPROMISED_KEY verificada');

} finally {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (_) {}
}

console.log('\nPASS AX-F-069 — Invariantes de revocación y compromiso demostrados al 100%.\n');
