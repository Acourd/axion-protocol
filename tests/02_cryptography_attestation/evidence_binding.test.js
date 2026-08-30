'use strict';

const assert = require('assert');
const { createBoundEvidenceManifest } = require('../../tools/evidence_hasher.js');

function binding(overrides = {}) {
  return {
    missionId: 'AX-EVD-BIND-001',
    risk: 'HIGH',
    command: { executable: 'node', args: ['--version'], cwd: 'C:/workspace', shell: false },
    scope: ['C:/workspace'],
    approval: { id: 'APR-1', keyId: 'ed25519:key', digest: 'a'.repeat(64) },
    rollback: { id: 'RB-1', digest: 'b'.repeat(64) },
    check: { id: 'CHK-1', keyId: 'ed25519:auditor', digest: 'c'.repeat(64), evidenceHash: 'd'.repeat(64) },
    status: 'VERIFIED',
    evidence: { digest: 'd'.repeat(64) },
    ...overrides,
  };
}

function manifest(bound) {
  return createBoundEvidenceManifest({
    taskId: bound.missionId,
    subject: 'fixture',
    files: [],
    logs: [],
    binding: bound,
  });
}

const original = manifest(binding());
const approvalChanged = manifest(binding({
  approval: { id: 'APR-1', keyId: 'ed25519:key', digest: 'e'.repeat(64) },
}));
const statusChanged = manifest(binding({ status: 'APPROVED' }));
const argsChanged = manifest(binding({
  command: { executable: 'node', args: ['--help'], cwd: 'C:/workspace', shell: false },
}));

assert.notEqual(original.binding_hash, approvalChanged.binding_hash);
assert.notEqual(original.binding_hash, statusChanged.binding_hash);
assert.notEqual(original.binding_hash, argsChanged.binding_hash);
assert.equal(original.evidence.binding.status, 'VERIFIED');
assert.equal(original.evidence.binding.approval.digest, 'a'.repeat(64));

console.log('PASS evidence binding — aprobacion, estado y argumentos alteran el hash');
