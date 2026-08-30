'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const {
  APPROVAL_STATUS,
  computePublicKeyId,
  createSignedApproval,
  verifyAndConsumeApproval,
} = require('../../tools/approval_ed25519.js');
const { hashCanonical } = require('../../tools/canonical_json.js');

const ROOT = path.join(__dirname, '..', '..');
const FIXTURE_ROOT = path.join(ROOT, '.phase-e', 'test-runtime', 'approval');
fs.mkdirSync(FIXTURE_ROOT, { recursive: true });

function uniqueDir(label) {
  const suffix = crypto.randomBytes(8).toString('hex');
  const dir = path.join(FIXTURE_ROOT, `${label}-${suffix}`);
  fs.mkdirSync(dir, { recursive: false });
  return dir;
}

function createFixture(label, authorityStatus = 'TRUSTED', keyPair = null) {
  const pair = keyPair || crypto.generateKeyPairSync('ed25519');
  const dir = uniqueDir(label);
  const registryPath = path.join(dir, 'trusted-authorities.json');
  const consumptionDir = path.join(dir, 'consumed');
  fs.mkdirSync(consumptionDir, { recursive: false });

  const publicKeyPem = pair.publicKey.export({ type: 'spki', format: 'pem' });
  const keyId = computePublicKeyId(pair.publicKey);
  const registry = {
    version: '1.0.0',
    authorities: [{
      keyId,
      actorId: 'human-authority-fixture',
      roles: ['HUMAN_AUTHORITY'],
      status: authorityStatus,
      expiresAt: '2099-01-01T00:00:00.000Z',
      publicKeyPem,
    }],
  };
  fs.writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`, 'utf8');
  assert.ok(!fs.readFileSync(registryPath, 'utf8').includes('PRIVATE KEY'));
  return { pair, dir, registryPath, consumptionDir, keyId };
}

function expectedBinding(overrides = {}) {
  const rollbackPlan = {
    rollbackId: 'AX-RBK-9100',
    steps: ['Restaurar el snapshot previo'],
    verification: ['Comparar SHA-256'],
  };
  return {
    contractVersion: '1.0.0',
    missionId: 'AX-MISSION-9100',
    risk: 'HIGH',
    command: {
      executable: 'node',
      args: ['--version'],
      cwd: 'C:/workspace',
      shell: false,
    },
    scope: ['C:/workspace'],
    requirementsHash: hashCanonical([
      'written_human_approval',
      'explicit_scope',
      'executable_check',
      'rollback_plan',
      'independent_audit',
    ]),
    policyHash: crypto.createHash('sha256')
      .update(fs.readFileSync(path.join(ROOT, 'policies', 'risk.yaml')))
      .digest('hex'),
    rollbackHash: hashCanonical(rollbackPlan),
    ...overrides,
  };
}

function unsignedApproval(fixture, binding, overrides = {}) {
  const issuedAt = new Date(Date.now() - 60_000).toISOString();
  const expiresAt = new Date(Date.now() + 600_000).toISOString();
  return {
    contractVersion: binding.contractVersion,
    approvalId: `AX-APR-${crypto.randomBytes(8).toString('hex')}`,
    missionId: binding.missionId,
    actorId: 'human-authority-fixture',
    keyId: fixture.keyId,
    decision: 'APPROVE',
    risk: binding.risk,
    command: binding.command,
    scope: binding.scope,
    requirementsHash: binding.requirementsHash,
    policyHash: binding.policyHash,
    rollbackHash: binding.rollbackHash,
    issuedAt,
    expiresAt,
    nonce: crypto.randomBytes(32).toString('base64url'),
    usageLimit: 1,
    ...overrides,
  };
}

function verify(fixture, envelope, binding, overrides = {}) {
  return verifyAndConsumeApproval({
    envelope,
    expectedBinding: binding,
    registryPath: fixture.registryPath,
    consumptionDir: fixture.consumptionDir,
    executorActorId: 'axion-executor-fixture',
    now: new Date(),
    ...overrides,
  });
}

// 1. Firma válida y binding exacto.
{
  const fixture = createFixture('valid');
  const binding = expectedBinding();
  const envelope = createSignedApproval(unsignedApproval(fixture, binding), fixture.pair.privateKey);
  assert.strictEqual(verify(fixture, envelope, binding).status, APPROVAL_STATUS.APPROVAL_VALID);
}

// 2. Firma alterada.
{
  const fixture = createFixture('tampered-signature');
  const binding = expectedBinding();
  const envelope = createSignedApproval(unsignedApproval(fixture, binding), fixture.pair.privateKey);
  envelope.signature = `${envelope.signature.slice(0, -4)}AAAA`;
  assert.strictEqual(verify(fixture, envelope, binding).status, APPROVAL_STATUS.APPROVAL_INVALID_SIGNATURE);
}

// 3. Misión distinta.
{
  const fixture = createFixture('mission');
  const binding = expectedBinding();
  const envelope = createSignedApproval(unsignedApproval(fixture, binding), fixture.pair.privateKey);
  assert.strictEqual(
    verify(fixture, envelope, expectedBinding({ missionId: 'AX-MISSION-OTHER' })).status,
    APPROVAL_STATUS.APPROVAL_SCOPE_MISMATCH,
  );
}

// 4. Comando distinto.
{
  const fixture = createFixture('command');
  const binding = expectedBinding();
  const envelope = createSignedApproval(unsignedApproval(fixture, binding), fixture.pair.privateKey);
  const changed = expectedBinding({ command: { ...binding.command, executable: 'git' } });
  assert.strictEqual(verify(fixture, envelope, changed).status, APPROVAL_STATUS.APPROVAL_SCOPE_MISMATCH);
}

// 5. Argumentos distintos.
{
  const fixture = createFixture('args');
  const binding = expectedBinding();
  const envelope = createSignedApproval(unsignedApproval(fixture, binding), fixture.pair.privateKey);
  const changed = expectedBinding({ command: { ...binding.command, args: ['--help'] } });
  assert.strictEqual(verify(fixture, envelope, changed).status, APPROVAL_STATUS.APPROVAL_SCOPE_MISMATCH);
}

// 6. Riesgo distinto.
{
  const fixture = createFixture('risk');
  const binding = expectedBinding();
  const envelope = createSignedApproval(unsignedApproval(fixture, binding), fixture.pair.privateKey);
  assert.strictEqual(
    verify(fixture, envelope, expectedBinding({ risk: 'CRITICAL' })).status,
    APPROVAL_STATUS.APPROVAL_POLICY_MISMATCH,
  );
}

// 7. Política distinta.
{
  const fixture = createFixture('policy');
  const binding = expectedBinding();
  const envelope = createSignedApproval(unsignedApproval(fixture, binding), fixture.pair.privateKey);
  assert.strictEqual(
    verify(fixture, envelope, expectedBinding({ policyHash: '0'.repeat(64) })).status,
    APPROVAL_STATUS.APPROVAL_POLICY_MISMATCH,
  );
}

// 8. Rollback distinto.
{
  const fixture = createFixture('rollback');
  const binding = expectedBinding();
  const envelope = createSignedApproval(unsignedApproval(fixture, binding), fixture.pair.privateKey);
  assert.strictEqual(
    verify(fixture, envelope, expectedBinding({ rollbackHash: 'f'.repeat(64) })).status,
    APPROVAL_STATUS.APPROVAL_ROLLBACK_MISMATCH,
  );
}

// 9. Clave desconocida.
{
  const trusted = createFixture('unknown-trusted');
  const outsider = crypto.generateKeyPairSync('ed25519');
  const binding = expectedBinding();
  const approval = unsignedApproval(trusted, binding, { keyId: computePublicKeyId(outsider.publicKey) });
  const envelope = createSignedApproval(approval, outsider.privateKey);
  assert.strictEqual(verify(trusted, envelope, binding).status, APPROVAL_STATUS.APPROVAL_UNKNOWN_AUTHORITY);
}

// 10. Clave revocada.
{
  const fixture = createFixture('revoked', 'REVOKED');
  const binding = expectedBinding();
  const envelope = createSignedApproval(unsignedApproval(fixture, binding), fixture.pair.privateKey);
  assert.strictEqual(verify(fixture, envelope, binding).status, APPROVAL_STATUS.APPROVAL_REVOKED_AUTHORITY);
}

// 11. Aprobación expirada.
{
  const fixture = createFixture('expired');
  const binding = expectedBinding();
  const approval = unsignedApproval(fixture, binding, {
    issuedAt: new Date(Date.now() - 600_000).toISOString(),
    expiresAt: new Date(Date.now() - 60_000).toISOString(),
  });
  const envelope = createSignedApproval(approval, fixture.pair.privateKey);
  assert.strictEqual(verify(fixture, envelope, binding).status, APPROVAL_STATUS.APPROVAL_EXPIRED);
}

// 12. Nonce reutilizado.
{
  const fixture = createFixture('replay');
  const binding = expectedBinding();
  const envelope = createSignedApproval(unsignedApproval(fixture, binding), fixture.pair.privateKey);
  assert.strictEqual(verify(fixture, envelope, binding).status, APPROVAL_STATUS.APPROVAL_VALID);
  assert.strictEqual(verify(fixture, envelope, binding).status, APPROVAL_STATUS.APPROVAL_REPLAYED);
}

// 13. Registro de consumo no escribible/no disponible.
{
  const fixture = createFixture('state-unavailable');
  const binding = expectedBinding();
  const envelope = createSignedApproval(unsignedApproval(fixture, binding), fixture.pair.privateKey);
  const unavailable = path.join(fixture.dir, 'not-a-directory');
  fs.writeFileSync(unavailable, 'fixture', 'utf8');
  assert.strictEqual(
    verify(fixture, envelope, binding, { consumptionDir: unavailable }).status,
    APPROVAL_STATUS.APPROVAL_STATE_UNAVAILABLE,
  );
}

// 14. humanApproval:true no forma parte del contrato firmado (cubierto además por integración).
{
  const fixture = createFixture('boolean');
  const binding = expectedBinding();
  assert.strictEqual(
    verify(fixture, { humanApproval: true }, binding).status,
    APPROVAL_STATUS.APPROVAL_MISSING,
  );
}

// 15. Firma válida de autoridad no registrada.
{
  const registryFixture = createFixture('unregistered-registry');
  const outsiderFixture = createFixture('unregistered-signer');
  const binding = expectedBinding();
  const approval = unsignedApproval(outsiderFixture, binding);
  const envelope = createSignedApproval(approval, outsiderFixture.pair.privateKey);
  assert.strictEqual(
    verify(registryFixture, envelope, binding).status,
    APPROVAL_STATUS.APPROVAL_UNKNOWN_AUTHORITY,
  );
}

// 16. Una entrada extra vuelve no canonico al registro completo.
{
  const fixture = createFixture('malformed-registry');
  const registry = JSON.parse(fs.readFileSync(fixture.registryPath, 'utf8'));
  registry.authorities[0].comment = 'campo no permitido';
  fs.writeFileSync(fixture.registryPath, JSON.stringify(registry), 'utf8');
  const binding = expectedBinding();
  const envelope = createSignedApproval(unsignedApproval(fixture, binding), fixture.pair.privateKey);
  assert.strictEqual(
    verify(fixture, envelope, binding).status,
    APPROVAL_STATUS.APPROVAL_STATE_UNAVAILABLE,
  );
}

// 17. Identificadores de clave duplicados bloquean por ambiguedad.
{
  const fixture = createFixture('duplicate-registry');
  const registry = JSON.parse(fs.readFileSync(fixture.registryPath, 'utf8'));
  registry.authorities.push({ ...registry.authorities[0] });
  fs.writeFileSync(fixture.registryPath, JSON.stringify(registry), 'utf8');
  const binding = expectedBinding();
  const envelope = createSignedApproval(unsignedApproval(fixture, binding), fixture.pair.privateKey);
  assert.strictEqual(
    verify(fixture, envelope, binding).status,
    APPROVAL_STATUS.APPROVAL_STATE_UNAVAILABLE,
  );
}

console.log('PASS approval Ed25519 - 17 escenarios fail-closed verificados');
