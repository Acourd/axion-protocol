'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { createSignedApproval, computePublicKeyId } = require('../../tools/approval_ed25519.js');
const { createSignedCheck } = require('../../tools/check_ed25519.js');
const { hashCanonical } = require('../../tools/canonical_json.js');
const { compileRiskPolicy } = require('../../tools/risk_policy_compiler.js');
const { executeHybridWorkflow } = require('../../tools/workflow_runner.js');

const root = path.resolve(__dirname, '..', '..');
const runtimeDir = path.join(root, '.runtime-fixtures', 'test-runtime', `workflow-${process.pid}-${Date.now()}`);
const consumptionDir = path.join(runtimeDir, 'consumption');
fs.mkdirSync(consumptionDir, { recursive: true });

const now = new Date('2026-08-03T12:00:00.000Z');
const expiresAt = '2026-08-03T12:30:00.000Z';
const authorityExpiresAt = '2027-08-03T00:00:00.000Z';
const humanKeys = crypto.generateKeyPairSync('ed25519');
const auditorKeys = crypto.generateKeyPairSync('ed25519');
const humanKeyId = computePublicKeyId(humanKeys.publicKey);
const auditorKeyId = computePublicKeyId(auditorKeys.publicKey);
const registryPath = path.join(runtimeDir, 'public-authorities.json');

fs.writeFileSync(registryPath, JSON.stringify({
  version: '1.0.0',
  authorities: [
    {
      actorId: 'human-authority-e2e',
      keyId: humanKeyId,
      publicKeyPem: humanKeys.publicKey.export({ type: 'spki', format: 'pem' }),
      roles: ['HUMAN_AUTHORITY'],
      status: 'TRUSTED',
      expiresAt: authorityExpiresAt,
    },
    {
      actorId: 'independent-auditor-e2e',
      keyId: auditorKeyId,
      publicKeyPem: auditorKeys.publicKey.export({ type: 'spki', format: 'pem' }),
      roles: ['INDEPENDENT_AUDITOR'],
      status: 'TRUSTED',
      expiresAt: authorityExpiresAt,
    },
  ],
}, null, 2), 'utf8');

const missionId = 'AX-E2E-HIGH-001';
const risk = 'HIGH';
const command = Object.freeze({
  executable: 'node',
  args: ['--version'],
  cwd: root,
  shell: false,
});
const scope = ['tools/workflow_runner.js'];
const rollbackPlan = {
  contractVersion: '1.0.0',
  planId: 'RB-E2E-001',
  missionId,
  strategy: 'RESTORE_SNAPSHOT',
  snapshotDigest: 'a'.repeat(64),
  steps: ['restore authorized paths from immutable snapshot'],
  verification: ['compare canonical SHA-256 manifest'],
};
const testAssertions = ['structured command exits zero', 'evidence binding is complete'];
const policySource = fs.readFileSync(path.join(root, 'policies', 'risk.yaml'), 'utf8');
const compiledPolicy = compileRiskPolicy(policySource);
const policyHash = crypto.createHash('sha256').update(policySource, 'utf8').digest('hex');
const requirementsHash = hashCanonical(compiledPolicy.levels.HIGH.requirements);
const rollbackHash = hashCanonical(rollbackPlan);

const unsignedApproval = {
  contractVersion: '1.0.0',
  approvalId: 'APR-E2E-001',
  missionId,
  actorId: 'human-authority-e2e',
  keyId: humanKeyId,
  decision: 'APPROVE',
  risk,
  command,
  scope,
  requirementsHash,
  policyHash,
  rollbackHash,
  issuedAt: '2026-08-03T11:59:00.000Z',
  expiresAt,
  nonce: crypto.randomBytes(24).toString('base64url'),
  usageLimit: 1,
};
const approvalEnvelope = createSignedApproval(unsignedApproval, humanKeys.privateKey);
const approvalDigest = hashCanonical(unsignedApproval);
const commandHash = hashCanonical(command);
const assertionsHash = hashCanonical(testAssertions);
const checkEnvelope = createSignedCheck({
  contractVersion: '1.0.0',
  checkId: 'CHK-E2E-001',
  missionId,
  actorId: 'independent-auditor-e2e',
  keyId: auditorKeyId,
  executorActorId: 'axion-executor-e2e',
  risk,
  commandHash,
  approvalDigest,
  assertionsHash,
  result: 'PASS',
  exitCode: 0,
  evidenceHash: hashCanonical({ fixture: 'independent-e2e-result' }),
  issuedAt: '2026-08-03T11:59:30.000Z',
  expiresAt,
}, auditorKeys.privateKey);

const payload = {
  missionId,
  title: 'E2E de enforcement HIGH',
  rawUserRequest: 'Ejecutar una comprobación segura y verificable',
  scope,
  risk,
  command,
  rollbackPlan,
  testAssertions,
  approvalEnvelope,
  checkEnvelope,
  modifiedFiles: [],
};
const runtime = {
  registryPath,
  approvalConsumptionDir: consumptionDir,
  executorActorId: 'axion-executor-e2e',
  executor: () => ({ status: 0 }),
  now,
};

const result = executeHybridWorkflow(payload, runtime);
assert.equal(result.status, 'VERIFIED', JSON.stringify(result));
assert.deepEqual(result.workflow.history.map((entry) => entry.phase), [
  'ENTENDER', 'PLANIFICAR', 'GATE', 'TEST', 'CONSTRUIR', 'AUDITAR', 'PROMOVER',
]);
assert.equal(result.approval.status, 'APPROVAL_VALID');
assert.equal(result.check.status, 'CHECK_VALID');
assert.equal(result.evidenceManifest.evidence.binding.missionId, missionId);
assert.equal(result.evidenceManifest.evidence.binding.status, 'VERIFIED');

const forged = executeHybridWorkflow({
  ...payload,
  missionId: 'AX-E2E-FORGED-BOOLEAN',
  approvalEnvelope: undefined,
  checkEnvelope: undefined,
  humanApproval: true,
  checkResults: [{ passed: true }],
}, {
  ...runtime,
  approvalConsumptionDir: path.join(runtimeDir, 'forged-consumption'),
});
assert.notEqual(forged.status, 'VERIFIED');
assert.match(forged.status, /^BLOCKED_/);

const replay = executeHybridWorkflow(payload, runtime);
assert.equal(replay.status, 'BLOCKED_APPROVAL_REPLAYED');

console.log('PASS E2E enforcement — firma, CHECK independiente, siete fases y replay fail-closed');
