'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { computePublicKeyId } = require('../tools/approval_ed25519.js');
const { createSignedCheck } = require('../tools/check_ed25519.js');
const { hashCanonical } = require('../tools/canonical_json.js');

function createLowRiskFixture({ missionId, assertions, modifiedFiles = [] }) {
  const root = path.resolve(__dirname, '..');
  const { crearSandbox } = require('../tools/test_sandbox.js');
  const runtimeDir = path.join(crearSandbox('trust-fixture'), `legacy-${process.pid}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`);
  fs.mkdirSync(runtimeDir, { recursive: true });
  const auditorKeys = crypto.generateKeyPairSync('ed25519');
  const keyId = computePublicKeyId(auditorKeys.publicKey);
  const registryPath = path.join(runtimeDir, 'public-authorities.json');
  fs.mkdirSync(path.dirname(registryPath), { recursive: true });
  fs.writeFileSync(registryPath, JSON.stringify({
    version: '1.0.0',
    authorities: [{
      actorId: 'legacy-independent-auditor',
      keyId,
      publicKeyPem: auditorKeys.publicKey.export({ type: 'spki', format: 'pem' }),
      roles: ['INDEPENDENT_AUDITOR'],
      status: 'TRUSTED',
      expiresAt: '2027-08-03T00:00:00.000Z',
    }],
  }), 'utf8');

  const command = { executable: 'node', args: ['--version'], cwd: root, shell: false };
  const approvalDigest = hashCanonical({ missionId, approvalRequired: false, risk: 'LOW' });
  const checkEnvelope = createSignedCheck({
    contractVersion: '1.0.0',
    checkId: `CHK-${missionId}`,
    missionId,
    actorId: 'legacy-independent-auditor',
    keyId,
    executorActorId: 'legacy-executor',
    risk: 'LOW',
    commandHash: hashCanonical(command),
    approvalDigest,
    assertionsHash: hashCanonical(assertions),
    result: 'PASS',
    exitCode: 0,
    evidenceHash: hashCanonical({ missionId, fixture: 'legacy-independent-check' }),
    issuedAt: '2026-08-03T11:59:00.000Z',
    expiresAt: '2026-08-03T12:30:00.000Z',
  }, auditorKeys.privateKey);

  return {
    payload: {
      missionId,
      title: 'Comprobacion local de riesgo bajo',
      rawUserRequest: 'Ejecutar una comprobacion local segura con evidencia independiente verificable.',
      scope: modifiedFiles.length > 0 ? modifiedFiles : ['tools/preflight.js'],
      risk: 'LOW',
      command,
      testAssertions: assertions,
      checkEnvelope,
      modifiedFiles,
    },
    runtime: {
      registryPath,
      executorActorId: 'legacy-executor',
      executor: () => ({ status: 0 }),
      now: new Date('2026-08-03T12:00:00.000Z'),
    },
  };
}

module.exports = { createLowRiskFixture };
