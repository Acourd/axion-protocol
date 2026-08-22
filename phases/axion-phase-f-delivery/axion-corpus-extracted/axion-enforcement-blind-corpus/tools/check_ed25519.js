'use strict';

const crypto = require('crypto');
const {
  asEd25519PublicKey,
  computePublicKeyId,
  decodeEd25519Signature,
  loadAuthorityRegistry,
} = require('./approval_ed25519.js');
const { canonicalize, hashCanonical } = require('./canonical_json.js');

const CHECK_STATUS = Object.freeze({
  CHECK_VALID: 'CHECK_VALID',
  CHECK_MISSING: 'CHECK_MISSING',
  CHECK_INVALID_SIGNATURE: 'CHECK_INVALID_SIGNATURE',
  CHECK_UNKNOWN_AUDITOR: 'CHECK_UNKNOWN_AUDITOR',
  CHECK_REVOKED_AUDITOR: 'CHECK_REVOKED_AUDITOR',
  CHECK_EXPIRED: 'CHECK_EXPIRED',
  CHECK_NOT_INDEPENDENT: 'CHECK_NOT_INDEPENDENT',
  CHECK_BINDING_MISMATCH: 'CHECK_BINDING_MISMATCH',
  CHECK_FAILED: 'CHECK_FAILED',
  CHECK_STATE_UNAVAILABLE: 'BLOCKED_CHECK_STATE_UNAVAILABLE',
});

function result(status, details = {}) {
  return Object.freeze({ status, ...details });
}

function validateUnsignedCheck(check) {
  if (!check || typeof check !== 'object' || Array.isArray(check)) return false;
  const strings = [
    'contractVersion', 'checkId', 'missionId', 'actorId', 'keyId', 'executorActorId',
    'risk', 'commandHash', 'approvalDigest', 'assertionsHash', 'result', 'evidenceHash',
    'issuedAt', 'expiresAt',
  ];
  const expectedKeys = [...strings, 'exitCode'].sort();
  if (Object.keys(check).sort().join(',') !== expectedKeys.join(',')) return false;
  if (strings.some((key) => typeof check[key] !== 'string' || check[key].trim() === '')) return false;
  if (check.contractVersion !== '1.0.0') return false;
  if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(check.risk)) return false;
  if (!['PASS', 'FAIL'].includes(check.result) || !Number.isInteger(check.exitCode)) return false;
  for (const key of ['commandHash', 'approvalDigest', 'assertionsHash', 'evidenceHash']) {
    if (!/^[a-f0-9]{64}$/.test(check[key])) return false;
  }
  return true;
}

function createSignedCheck(check, privateKey) {
  if (!validateUnsignedCheck(check)) throw new TypeError('Contrato de CHECK inválido.');
  const key = privateKey instanceof crypto.KeyObject && privateKey.type === 'private'
    ? privateKey
    : crypto.createPrivateKey(privateKey);
  if (key.asymmetricKeyType !== 'ed25519') throw new TypeError('La clave privada no es Ed25519.');
  const signature = crypto.sign(null, Buffer.from(canonicalize(check), 'utf8'), key).toString('base64');
  return { check: JSON.parse(JSON.stringify(check)), algorithm: 'Ed25519', signature };
}

function verifyIndependentCheck({ envelope, expectedBinding, registryPath, executorActorId, now = new Date() }) {
  if (!envelope || typeof envelope !== 'object' || !envelope.check) {
    return result(CHECK_STATUS.CHECK_MISSING);
  }
  if (Object.keys(envelope).sort().join(',') !== 'algorithm,check,signature'
      || envelope.algorithm !== 'Ed25519'
      || typeof envelope.signature !== 'string'
      || !validateUnsignedCheck(envelope.check)) {
    return result(CHECK_STATUS.CHECK_INVALID_SIGNATURE);
  }

  const registryResult = loadAuthorityRegistry(registryPath);
  if (!registryResult.ok) return result(CHECK_STATUS.CHECK_STATE_UNAVAILABLE);

  const check = envelope.check;
  const auditor = registryResult.registry.authorities.find((entry) => entry && entry.keyId === check.keyId);
  if (!auditor || auditor.status === 'UNKNOWN') return result(CHECK_STATUS.CHECK_UNKNOWN_AUDITOR);
  if (auditor.status === 'REVOKED') return result(CHECK_STATUS.CHECK_REVOKED_AUDITOR);
  if (auditor.status === 'EXPIRED') return result(CHECK_STATUS.CHECK_EXPIRED);
  if (auditor.status !== 'TRUSTED'
      || auditor.actorId !== check.actorId
      || !Array.isArray(auditor.roles)
      || !auditor.roles.includes('INDEPENDENT_AUDITOR')) {
    return result(CHECK_STATUS.CHECK_UNKNOWN_AUDITOR);
  }

  let publicKey;
  try {
    publicKey = asEd25519PublicKey(auditor.publicKeyPem);
    if (computePublicKeyId(publicKey) !== check.keyId) return result(CHECK_STATUS.CHECK_UNKNOWN_AUDITOR);
  } catch (_) {
    return result(CHECK_STATUS.CHECK_UNKNOWN_AUDITOR);
  }

  const signature = decodeEd25519Signature(envelope.signature);
  if (!signature) return result(CHECK_STATUS.CHECK_INVALID_SIGNATURE);
  if (!crypto.verify(null, Buffer.from(canonicalize(check), 'utf8'), publicKey, signature)) {
    return result(CHECK_STATUS.CHECK_INVALID_SIGNATURE);
  }

  const issuedAt = Date.parse(check.issuedAt);
  const expiresAt = Date.parse(check.expiresAt);
  const auditorExpiresAt = Date.parse(auditor.expiresAt);
  const nowMs = now instanceof Date ? now.getTime() : Number.NaN;
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt) || !Number.isFinite(nowMs)
      || expiresAt <= issuedAt || nowMs < issuedAt || nowMs >= expiresAt
      || !Number.isFinite(auditorExpiresAt) || nowMs >= auditorExpiresAt) {
    return result(CHECK_STATUS.CHECK_EXPIRED);
  }

  if (typeof executorActorId !== 'string'
      || check.executorActorId !== executorActorId
      || check.actorId === executorActorId) {
    return result(CHECK_STATUS.CHECK_NOT_INDEPENDENT);
  }
  if (!expectedBinding
      || check.missionId !== expectedBinding.missionId
      || check.risk !== expectedBinding.risk
      || check.commandHash !== expectedBinding.commandHash
      || check.approvalDigest !== expectedBinding.approvalDigest
      || check.assertionsHash !== expectedBinding.assertionsHash) {
    return result(CHECK_STATUS.CHECK_BINDING_MISMATCH);
  }
  if (check.result !== 'PASS' || check.exitCode !== 0) return result(CHECK_STATUS.CHECK_FAILED);

  return result(CHECK_STATUS.CHECK_VALID, {
    checkId: check.checkId,
    checkDigest: hashCanonical(check),
    keyId: check.keyId,
    evidenceHash: check.evidenceHash,
  });
}

module.exports = { CHECK_STATUS, createSignedCheck, verifyIndependentCheck };
