'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { canonicalize, hashCanonical } = require('./canonical_json.js');
const { mismoActor, buscarAlias } = require('./identity_canonical.js');

const APPROVAL_STATUS = Object.freeze({
  APPROVAL_VALID: 'APPROVAL_VALID',
  APPROVAL_MISSING: 'APPROVAL_MISSING',
  APPROVAL_NOT_INDEPENDENT: 'APPROVAL_NOT_INDEPENDENT',
  APPROVAL_INVALID_SIGNATURE: 'APPROVAL_INVALID_SIGNATURE',
  APPROVAL_UNKNOWN_AUTHORITY: 'APPROVAL_UNKNOWN_AUTHORITY',
  APPROVAL_REVOKED_AUTHORITY: 'APPROVAL_REVOKED_AUTHORITY',
  APPROVAL_COMPROMISED_KEY: 'APPROVAL_COMPROMISED_KEY',
  APPROVAL_EXPIRED: 'APPROVAL_EXPIRED',
  APPROVAL_SCOPE_MISMATCH: 'APPROVAL_SCOPE_MISMATCH',
  APPROVAL_POLICY_MISMATCH: 'APPROVAL_POLICY_MISMATCH',
  APPROVAL_ROLLBACK_MISMATCH: 'APPROVAL_ROLLBACK_MISMATCH',
  APPROVAL_REPLAYED: 'APPROVAL_REPLAYED',
  APPROVAL_STATE_UNAVAILABLE: 'BLOCKED_APPROVAL_STATE_UNAVAILABLE',
});

// R7 de Fase H distingue retirar una clave de perderla. REVOKED es una baja
// ordenada; COMPROMISED dice que la clave privada se fue de las manos, lo que
// ademas obliga a revisar a mano las misiones que ya firmo. Para el gating ambos
// bloquean, pero mezclarlos borraria esa diferencia justo cuando mas importa.
const REGISTRY_STATES = new Set(['TRUSTED', 'REVOKED', 'COMPROMISED', 'EXPIRED', 'UNKNOWN']);

function result(status, details = {}) {
  return Object.freeze({ status, ...details });
}

function asEd25519PublicKey(publicKey) {
  const key = publicKey instanceof crypto.KeyObject && publicKey.type === 'public'
    ? publicKey
    : crypto.createPublicKey(publicKey);
  if (key.asymmetricKeyType !== 'ed25519') throw new TypeError('La clave pública no es Ed25519.');
  return key;
}

function computePublicKeyId(publicKey) {
  const key = asEd25519PublicKey(publicKey);
  const der = key.export({ type: 'spki', format: 'der' });
  return `ed25519:${crypto.createHash('sha256').update(der).digest('hex')}`;
}

function validateUnsignedApproval(approval) {
  if (!approval || typeof approval !== 'object' || Array.isArray(approval)) return false;
  const strings = [
    'contractVersion', 'approvalId', 'missionId', 'actorId', 'keyId', 'decision',
    'risk', 'requirementsHash', 'policyHash', 'rollbackHash', 'issuedAt', 'expiresAt', 'nonce',
  ];
  const expectedKeys = [...strings, 'command', 'scope', 'usageLimit'].sort();
  if (Object.keys(approval).sort().join(',') !== expectedKeys.join(',')) return false;
  if (strings.some((key) => typeof approval[key] !== 'string' || approval[key].trim() === '')) return false;
  if (approval.contractVersion !== '1.0.0' || approval.decision !== 'APPROVE') return false;
  if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(approval.risk)) return false;
  if (!approval.command || typeof approval.command !== 'object' || Array.isArray(approval.command)) return false;
  if (Object.keys(approval.command).sort().join(',') !== 'args,cwd,executable,shell') return false;
  if (typeof approval.command.executable !== 'string' || approval.command.executable.trim() === '') return false;
  if (!Array.isArray(approval.command.args) || approval.command.args.some((arg) => typeof arg !== 'string')) return false;
  if (typeof approval.command.cwd !== 'string' || approval.command.cwd.trim() === '') return false;
  if (approval.command.shell !== false) return false;
  if (!Array.isArray(approval.scope) || approval.scope.length === 0
      || approval.scope.some((entry) => typeof entry !== 'string' || entry.trim() === '')) return false;
  if (!/^[a-f0-9]{64}$/.test(approval.requirementsHash)
      || !/^[a-f0-9]{64}$/.test(approval.policyHash)
      || !/^[a-f0-9]{64}$/.test(approval.rollbackHash)) return false;
  if (!/^[A-Za-z0-9_-]{32,}$/.test(approval.nonce)) return false;
  if (approval.usageLimit !== 1) return false;
  return true;
}

function createSignedApproval(approval, privateKey) {
  if (!validateUnsignedApproval(approval)) throw new TypeError('Contrato de aprobación inválido.');
  const key = privateKey instanceof crypto.KeyObject && privateKey.type === 'private'
    ? privateKey
    : crypto.createPrivateKey(privateKey);
  if (key.asymmetricKeyType !== 'ed25519') throw new TypeError('La clave privada no es Ed25519.');
  const signature = crypto.sign(null, Buffer.from(canonicalize(approval), 'utf8'), key).toString('base64');
  return { approval: JSON.parse(JSON.stringify(approval)), algorithm: 'Ed25519', signature };
}

function loadRegistry(registryPath) {
  let parsed;
  try {
    const source = fs.readFileSync(registryPath, 'utf8');
    if (/PRIVATE KEY|privateKey|secret|token/i.test(source)) throw new Error('El registro contiene material prohibido.');
    parsed = JSON.parse(source);
  } catch (error) {
    return { ok: false, error };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)
      || Object.keys(parsed).sort().join(',') !== 'authorities,version'
      || parsed.version !== '1.0.0' || !Array.isArray(parsed.authorities)) {
    return { ok: false, error: new Error('Registro de autoridades malformado.') };
  }
  const seenKeyIds = new Set();
  const allowedRoles = new Set(['HUMAN_AUTHORITY', 'INDEPENDENT_AUDITOR']);
  const expectedAuthorityKeys = 'actorId,expiresAt,keyId,publicKeyPem,roles,status';
  try {
    for (const authority of parsed.authorities) {
      if (!authority || typeof authority !== 'object' || Array.isArray(authority)
          || Object.keys(authority).sort().join(',') !== expectedAuthorityKeys
          || typeof authority.actorId !== 'string' || authority.actorId.trim() === ''
          || typeof authority.keyId !== 'string' || !/^ed25519:[a-f0-9]{64}$/.test(authority.keyId)
          || !REGISTRY_STATES.has(authority.status)
          || typeof authority.expiresAt !== 'string' || !Number.isFinite(Date.parse(authority.expiresAt))
          || !Array.isArray(authority.roles) || authority.roles.length === 0
          || authority.roles.some((role) => !allowedRoles.has(role))
          || new Set(authority.roles).size !== authority.roles.length
          || typeof authority.publicKeyPem !== 'string'
          || seenKeyIds.has(authority.keyId)) {
        throw new Error('Entrada de autoridad malformada o ambigua.');
      }
      const publicKey = asEd25519PublicKey(authority.publicKeyPem);
      if (computePublicKeyId(publicKey) !== authority.keyId) {
        throw new Error('El identificador no corresponde a la clave publica.');
      }
      seenKeyIds.add(authority.keyId);
    }
    // Regla R4 de Fase H: el registro no puede contener dos actores distintos que
    // designen al mismo sujeto canonico. Es el alta duplicada del mismo humano, y se
    // corta aqui, en la raiz, ademas de en cada comparacion aguas abajo.
    const alias = buscarAlias(parsed.authorities.map((a) => a.actorId));
    if (alias) {
      throw new Error(`Registro ambiguo (${alias.reason}): ${JSON.stringify(alias.actorId)}.`);
    }
  } catch (error) {
    return { ok: false, error };
  }
  return { ok: true, registry: parsed };
}

function decodeEd25519Signature(encoded) {
  if (typeof encoded !== 'string' || encoded.length === 0 || encoded.length % 4 !== 0
      || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) return null;
  const signature = Buffer.from(encoded, 'base64');
  if (signature.length !== 64 || signature.toString('base64') !== encoded) return null;
  return signature;
}

function consumeOnce(consumptionDir, approval) {
  const markerName = `${hashCanonical({
    approvalId: approval.approvalId,
    keyId: approval.keyId,
    nonce: approval.nonce,
  })}.used`;
  const markerPath = path.join(consumptionDir, markerName);
  let descriptor;
  try {
    const state = fs.statSync(consumptionDir);
    if (!state.isDirectory()) throw new Error('El registro de consumo no es un directorio.');
    descriptor = fs.openSync(markerPath, 'wx', 0o600);
    const marker = canonicalize({
      approvalId: approval.approvalId,
      approvalDigest: hashCanonical(approval),
      consumedAt: new Date().toISOString(),
      keyId: approval.keyId,
    });
    fs.writeFileSync(descriptor, `${marker}\n`, 'utf8');
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    return APPROVAL_STATUS.APPROVAL_VALID;
  } catch (error) {
    if (descriptor !== undefined) {
      try { fs.closeSync(descriptor); } catch (_) { /* fail closed */ }
    }
    return error && error.code === 'EEXIST'
      ? APPROVAL_STATUS.APPROVAL_REPLAYED
      : APPROVAL_STATUS.APPROVAL_STATE_UNAVAILABLE;
  }
}

function verifyAndConsumeApproval({
  envelope,
  expectedBinding,
  registryPath,
  consumptionDir,
  executorActorId,
  now = new Date(),
}) {
  if (!envelope || typeof envelope !== 'object' || !envelope.approval) {
    return result(APPROVAL_STATUS.APPROVAL_MISSING);
  }
  if (typeof executorActorId !== 'string' || executorActorId.trim() === '') {
    return result(APPROVAL_STATUS.APPROVAL_NOT_INDEPENDENT);
  }
  if (Object.keys(envelope).sort().join(',') !== 'algorithm,approval,signature'
      || envelope.algorithm !== 'Ed25519'
      || typeof envelope.signature !== 'string'
      || !validateUnsignedApproval(envelope.approval)) {
    return result(APPROVAL_STATUS.APPROVAL_INVALID_SIGNATURE);
  }

  const registryResult = loadRegistry(registryPath);
  if (!registryResult.ok) return result(APPROVAL_STATUS.APPROVAL_STATE_UNAVAILABLE);

  const approval = envelope.approval;
  // Identidad canonica, por el mismo motivo que en check_ed25519.js.
  if (mismoActor(approval.actorId, executorActorId)) {
    return result(APPROVAL_STATUS.APPROVAL_NOT_INDEPENDENT);
  }
  const authority = registryResult.registry.authorities.find((entry) => entry && entry.keyId === approval.keyId);
  if (!authority || !REGISTRY_STATES.has(authority.status) || authority.status === 'UNKNOWN') {
    return result(APPROVAL_STATUS.APPROVAL_UNKNOWN_AUTHORITY);
  }
  if (authority.status === 'REVOKED') return result(APPROVAL_STATUS.APPROVAL_REVOKED_AUTHORITY);
  if (authority.status === 'COMPROMISED') return result(APPROVAL_STATUS.APPROVAL_COMPROMISED_KEY);
  if (authority.status === 'EXPIRED') return result(APPROVAL_STATUS.APPROVAL_EXPIRED);
  if (authority.status !== 'TRUSTED'
      || authority.actorId !== approval.actorId
      || !Array.isArray(authority.roles)
      || !authority.roles.includes('HUMAN_AUTHORITY')) {
    return result(APPROVAL_STATUS.APPROVAL_UNKNOWN_AUTHORITY);
  }

  let publicKey;
  try {
    publicKey = asEd25519PublicKey(authority.publicKeyPem);
    if (computePublicKeyId(publicKey) !== approval.keyId) {
      return result(APPROVAL_STATUS.APPROVAL_UNKNOWN_AUTHORITY);
    }
  } catch (_) {
    return result(APPROVAL_STATUS.APPROVAL_UNKNOWN_AUTHORITY);
  }

  const signature = decodeEd25519Signature(envelope.signature);
  if (!signature) return result(APPROVAL_STATUS.APPROVAL_INVALID_SIGNATURE);
  const validSignature = crypto.verify(
    null,
    Buffer.from(canonicalize(approval), 'utf8'),
    publicKey,
    signature,
  );
  if (!validSignature) return result(APPROVAL_STATUS.APPROVAL_INVALID_SIGNATURE);

  const issuedAt = Date.parse(approval.issuedAt);
  const expiresAt = Date.parse(approval.expiresAt);
  const authorityExpiresAt = Date.parse(authority.expiresAt);
  const nowMs = now instanceof Date ? now.getTime() : Number.NaN;
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt) || !Number.isFinite(nowMs)
      || expiresAt <= issuedAt || nowMs < issuedAt || nowMs >= expiresAt
      || !Number.isFinite(authorityExpiresAt) || nowMs >= authorityExpiresAt) {
    return result(APPROVAL_STATUS.APPROVAL_EXPIRED);
  }

  if (!expectedBinding || approval.contractVersion !== expectedBinding.contractVersion
      || approval.missionId !== expectedBinding.missionId
      || hashCanonical(approval.command) !== hashCanonical(expectedBinding.command)
      || hashCanonical(approval.scope) !== hashCanonical(expectedBinding.scope)) {
    return result(APPROVAL_STATUS.APPROVAL_SCOPE_MISMATCH);
  }
  if (approval.risk !== expectedBinding.risk
      || approval.requirementsHash !== expectedBinding.requirementsHash
      || approval.policyHash !== expectedBinding.policyHash) {
    return result(APPROVAL_STATUS.APPROVAL_POLICY_MISMATCH);
  }
  if (approval.rollbackHash !== expectedBinding.rollbackHash) {
    return result(APPROVAL_STATUS.APPROVAL_ROLLBACK_MISMATCH);
  }

  const consumptionStatus = consumeOnce(consumptionDir, approval);
  if (consumptionStatus !== APPROVAL_STATUS.APPROVAL_VALID) return result(consumptionStatus);
  // Se devuelve tambien el actorId tomado de la instantanea ya verificada. El runner
    // lo releia del sobre original, que es dato no confiable y puede cambiar entre
  // lecturas (AX-NC-0001, vector de relectura del payload).
  return result(APPROVAL_STATUS.APPROVAL_VALID, {
    approvalId: approval.approvalId,
    approvalDigest: hashCanonical(approval),
    keyId: approval.keyId,
    actorId: approval.actorId,
  });
}

module.exports = {
  APPROVAL_STATUS,
  REGISTRY_STATES,
  asEd25519PublicKey,
  computePublicKeyId,
  createSignedApproval,
  loadAuthorityRegistry: loadRegistry,
  decodeEd25519Signature,
  verifyAndConsumeApproval,
};
