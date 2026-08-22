'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const { computePublicKeyId } = require('../../tools/approval_ed25519.js');
const {
  CHECK_STATUS,
  createSignedCheck,
  verifyIndependentCheck,
} = require('../../tools/check_ed25519.js');
const { hashCanonical } = require('../../tools/canonical_json.js');

const ROOT = path.join(__dirname, '..', '..');
const fixtureDir = path.join(
  ROOT,
  '.phase-e',
  'test-runtime',
  `check-${crypto.randomBytes(8).toString('hex')}`,
);
fs.mkdirSync(fixtureDir, { recursive: true });

const auditor = crypto.generateKeyPairSync('ed25519');
const auditorKeyId = computePublicKeyId(auditor.publicKey);
const publicKeyPem = auditor.publicKey.export({ type: 'spki', format: 'pem' });
const registryPath = path.join(fixtureDir, 'trusted-authorities.json');
fs.writeFileSync(registryPath, `${JSON.stringify({
  version: '1.0.0',
  authorities: [{
    keyId: auditorKeyId,
    actorId: 'independent-auditor-fixture',
    roles: ['INDEPENDENT_AUDITOR'],
    status: 'TRUSTED',
    expiresAt: '2099-01-01T00:00:00.000Z',
    publicKeyPem,
  }],
}, null, 2)}\n`, 'utf8');

const expectedBinding = {
  missionId: 'AX-MISSION-9200',
  risk: 'HIGH',
  commandHash: hashCanonical({ executable: 'node', args: ['--version'], cwd: 'C:/workspace', shell: false }),
  approvalDigest: 'a'.repeat(64),
  assertionsHash: hashCanonical(['fixture-check']),
};

function unsigned(overrides = {}) {
  return {
    contractVersion: '1.0.0',
    checkId: `AX-CHK-${crypto.randomBytes(8).toString('hex')}`,
    missionId: expectedBinding.missionId,
    actorId: 'independent-auditor-fixture',
    keyId: auditorKeyId,
    executorActorId: 'executor-fixture',
    risk: expectedBinding.risk,
    commandHash: expectedBinding.commandHash,
    approvalDigest: expectedBinding.approvalDigest,
    assertionsHash: expectedBinding.assertionsHash,
    result: 'PASS',
    exitCode: 0,
    evidenceHash: 'b'.repeat(64),
    issuedAt: new Date(Date.now() - 60_000).toISOString(),
    expiresAt: new Date(Date.now() + 600_000).toISOString(),
    ...overrides,
  };
}

function verify(envelope, binding = expectedBinding, executorActorId = 'executor-fixture', approvalActorId = 'approver-fixture') {
  return verifyIndependentCheck({
    envelope,
    expectedBinding: binding,
    registryPath,
    executorActorId,
    approvalActorId,
    now: new Date(),
  });
}

const valid = createSignedCheck(unsigned(), auditor.privateKey);
assert.strictEqual(verify(valid).status, CHECK_STATUS.CHECK_VALID);

const tampered = createSignedCheck(unsigned(), auditor.privateKey);
tampered.check.result = 'FAIL';
assert.strictEqual(verify(tampered).status, CHECK_STATUS.CHECK_INVALID_SIGNATURE);

const sameActor = createSignedCheck(unsigned({ executorActorId: 'independent-auditor-fixture' }), auditor.privateKey);
assert.strictEqual(
  verify(sameActor, expectedBinding, 'independent-auditor-fixture').status,
  CHECK_STATUS.CHECK_NOT_INDEPENDENT,
);

const bindingMismatch = createSignedCheck(unsigned(), auditor.privateKey);
assert.strictEqual(
  verify(bindingMismatch, { ...expectedBinding, commandHash: 'c'.repeat(64) }).status,
  CHECK_STATUS.CHECK_BINDING_MISMATCH,
);

const failed = createSignedCheck(unsigned({ result: 'FAIL', exitCode: 1 }), auditor.privateKey);
assert.strictEqual(verify(failed).status, CHECK_STATUS.CHECK_FAILED);

const expired = createSignedCheck(unsigned({
  issuedAt: new Date(Date.now() - 600_000).toISOString(),
  expiresAt: new Date(Date.now() - 60_000).toISOString(),
}), auditor.privateKey);
assert.strictEqual(verify(expired).status, CHECK_STATUS.CHECK_EXPIRED);

assert.strictEqual(verify(null).status, CHECK_STATUS.CHECK_MISSING);

console.log('PASS CHECK Ed25519 — firma, independencia, binding, expiración y fallo cerrado');
