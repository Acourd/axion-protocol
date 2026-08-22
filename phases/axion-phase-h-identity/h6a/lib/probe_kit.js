'use strict';
/**
 * Utilidades compartidas por las sondas rojas de H-6a.
 * Operan sobre un corpus indicado por AXION_CORPUS; nunca lo modifican.
 */
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CORPUS = process.env.AXION_CORPUS
  ? path.resolve(process.env.AXION_CORPUS)
  : (() => { throw new Error('AXION_CORPUS no definido'); })();

const tool = (n) => require(path.join(CORPUS, 'tools', n));
const { createSignedApproval, computePublicKeyId } = tool('approval_ed25519.js');
const { createSignedCheck } = tool('check_ed25519.js');
const { hashCanonical } = tool('canonical_json.js');
const { compileRiskPolicy } = tool('risk_policy_compiler.js');
const { executeHybridWorkflow } = tool('workflow_runner.js');

const POLICY_SOURCE = fs.readFileSync(path.join(CORPUS, 'policies', 'risk.yaml'), 'utf8');
const COMPILED = compileRiskPolicy(POLICY_SOURCE);
const POLICY_HASH = crypto.createHash('sha256').update(POLICY_SOURCE, 'utf8').digest('hex');

// Espacio de trabajo fuera del corpus: las sondas no ensucian el artefacto auditado.
function workspace(label) {
  const dir = path.join(os.tmpdir(), 'axion-h6a', `${label}-${crypto.randomBytes(5).toString('hex')}`);
  fs.mkdirSync(path.join(dir, 'consumed'), { recursive: true });
  return { dir, consumptionDir: path.join(dir, 'consumed') };
}

function authority(actorId, keys, roles) {
  return {
    actorId,
    keyId: computePublicKeyId(keys.publicKey),
    publicKeyPem: keys.publicKey.export({ type: 'spki', format: 'pem' }),
    roles,
    status: 'TRUSTED',
    expiresAt: '2099-01-01T00:00:00.000Z',
  };
}

function writeRegistry(dir, entries) {
  const p = path.join(dir, 'authorities.json');
  fs.writeFileSync(p, JSON.stringify({ version: '1.0.0', authorities: entries }, null, 2), 'utf8');
  return p;
}

function mission(missionId, risk = 'HIGH') {
  const command = { executable: 'node', args: ['--version'], cwd: CORPUS, shell: false };
  const scope = ['tools/workflow_runner.js'];
  const rollbackPlan = {
    contractVersion: '1.0.0',
    planId: `RB-${missionId}`,
    missionId,
    strategy: 'RESTORE_SNAPSHOT',
    snapshotDigest: 'a'.repeat(64),
    steps: ['restaurar snapshot'],
    verification: ['comparar manifest'],
  };
  return {
    missionId, risk, command, scope, rollbackPlan,
    rollbackHash: hashCanonical(rollbackPlan),
    requirementsHash: hashCanonical(COMPILED.levels[risk].requirements),
    policyHash: POLICY_HASH,
    testAssertions: ['assert exit code 0'],
  };
}

function signApproval(m, actorId, keys) {
  return createSignedApproval({
    contractVersion: '1.0.0',
    approvalId: `APR-${crypto.randomBytes(6).toString('hex')}`,
    missionId: m.missionId,
    actorId,
    keyId: computePublicKeyId(keys.publicKey),
    decision: 'APPROVE',
    risk: m.risk,
    command: m.command,
    scope: m.scope,
    requirementsHash: m.requirementsHash,
    policyHash: m.policyHash,
    rollbackHash: m.rollbackHash,
    issuedAt: new Date(Date.now() - 60_000).toISOString(),
    expiresAt: new Date(Date.now() + 600_000).toISOString(),
    nonce: crypto.randomBytes(32).toString('base64url'),
    usageLimit: 1,
  }, keys.privateKey);
}

function signCheck(m, actorId, keys, executorActorId, approvalDigest) {
  return createSignedCheck({
    contractVersion: '1.0.0',
    checkId: `CHK-${crypto.randomBytes(6).toString('hex')}`,
    missionId: m.missionId,
    actorId,
    keyId: computePublicKeyId(keys.publicKey),
    executorActorId,
    risk: m.risk,
    commandHash: hashCanonical(m.command),
    approvalDigest,
    assertionsHash: hashCanonical(m.testAssertions),
    result: 'PASS',
    exitCode: 0,
    evidenceHash: hashCanonical({ probe: m.missionId }),
    issuedAt: new Date(Date.now() - 30_000).toISOString(),
    expiresAt: new Date(Date.now() + 600_000).toISOString(),
  }, keys.privateKey);
}

function payload(m, approvalEnvelope, checkEnvelope) {
  return {
    missionId: m.missionId,
    title: 'Sonda roja H-6a',
    rawUserRequest: 'Ejecutar una comprobacion verificable con evidencia independiente y alcance delimitado.',
    scope: m.scope,
    risk: m.risk,
    command: m.command,
    rollbackPlan: m.risk === 'LOW' ? undefined : m.rollbackPlan,
    testAssertions: m.testAssertions,
    approvalEnvelope,
    checkEnvelope,
    modifiedFiles: [],
  };
}

const keypair = () => crypto.generateKeyPairSync('ed25519');

/** Aserción de sonda roja: registra el hecho observado y propaga el fallo. */
function expectBlocked(label, result, note) {
  const ok = result.status !== 'VERIFIED';
  console.log(`  [${ok ? 'OK  ' : 'ROJO'}] ${label} -> ${result.status}`);
  if (!ok) {
    console.log(`         ${note}`);
    throw new Error(`INVARIANTE VIOLADA: ${label} alcanzo VERIFIED. ${note}`);
  }
}

function expectVerified(label, result, note) {
  const ok = result.status === 'VERIFIED';
  console.log(`  [${ok ? 'OK  ' : 'ROJO'}] ${label} -> ${result.status}`);
  if (!ok) {
    console.log(`         ${note}`);
    throw new Error(`FLUJO ROTO: ${label} no alcanzo VERIFIED. ${note}`);
  }
}

module.exports = {
  CORPUS, workspace, authority, writeRegistry, mission, signApproval, signCheck,
  payload, keypair, hashCanonical, executeHybridWorkflow, expectBlocked, expectVerified,
  crypto, fs, path,
};
