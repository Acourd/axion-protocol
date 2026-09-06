'use strict';

/**
 * Axion Protocol — Governance Root of Trust & Authority Registry Sealing
 *
 * Anclaje criptográfico inmutable de la raíz de gobernanza:
 * 1. Clave pública raíz fijada (pinned) en código inmutable.
 * 2. Validación de sellos criptográficos sobre el registro de autoridades.
 * 3. Detección y rechazo fail-closed de cualquier alteración no autorizada de policies/authorities.json.
 *
 * Cero dependencias externas.
 */

const crypto = require('crypto');
const { canonicalize, hashCanonical } = require('./canonical_json.js');
const { asEd25519PublicKey, computePublicKeyId } = require('./approval_ed25519.js');

const ROOT_AUTHORITY = Object.freeze({
  actorId: 'Axion Governance Root (@governance-root)',
  keyId: 'ed25519:c711dd47f603e8ef17921fc4605a8c22e0c0650e935481cecdb96086598d8ec1',
  publicKeyPem: '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEA+DLW8z65RpHPsGIbqMEu/gMzEoJw/WNSaCBTdu77d7s=\n-----END PUBLIC KEY-----\n',
  status: 'TRUSTED',
  roles: ['ROOT_GOVERNANCE_AUTHORITY'],
  expiresAt: '2040-01-01T00:00:00.000Z',
});

/**
 * Crea un sello criptográfico Ed25519 para un registro de autoridades dado.
 * Esta función es ejecutada fuera de banda por la autoridad raíz de gobernanza.
 */
function createRootSeal(registryObj, rootPrivateKey) {
  const privKey = rootPrivateKey instanceof crypto.KeyObject && rootPrivateKey.type === 'private'
    ? rootPrivateKey
    : crypto.createPrivateKey(rootPrivateKey);

  if (privKey.asymmetricKeyType !== 'ed25519') {
    throw new TypeError('La clave de sellado raíz debe ser de tipo Ed25519.');
  }

  const payloadHash = hashCanonical(registryObj);
  const sealRecord = {
    version: '1.0.0',
    format: 'AXION_AUTHORITY_ROOT_SEAL_V1',
    rootKeyId: ROOT_AUTHORITY.keyId,
    canonicalPayloadHash: payloadHash,
    sealedAt: new Date().toISOString(),
  };

  const canonicalPayload = canonicalize(sealRecord);
  const signature = crypto.sign(null, Buffer.from(canonicalPayload, 'utf8'), privKey).toString('base64');

  return {
    ...sealRecord,
    algorithm: 'Ed25519',
    signature,
  };
}

/**
 * Verifica la autenticidad e integridad del registro de autoridades contra el sello raíz.
 */
function verifyRootSeal(registryObj, sealObj, customRootPublicKey = null) {
  if (!sealObj || typeof sealObj !== 'object' || Array.isArray(sealObj)) {
    return {
      valid: false,
      reason: 'MISSING_OR_MALFORMED_SEAL',
      message: 'El sello raíz de autoridades es inválido, malformado o no existe.',
    };
  }

  const pubKeyPem = customRootPublicKey || ROOT_AUTHORITY.publicKeyPem;
  let expectedKeyId = ROOT_AUTHORITY.keyId;
  if (customRootPublicKey) {
    try {
      expectedKeyId = computePublicKeyId(asEd25519PublicKey(customRootPublicKey));
    } catch (e) {
      return { valid: false, reason: 'INVALID_CUSTOM_ROOT_KEY', message: e.message };
    }
  }

  if (sealObj.rootKeyId !== expectedKeyId) {
    return {
      valid: false,
      reason: 'UNTRUSTED_ROOT_KEY_ID',
      message: `El rootKeyId "${sealObj.rootKeyId}" no coincide con la raíz confiable fijada.`,
    };
  }

  const payloadHash = hashCanonical(registryObj);
  if (sealObj.canonicalPayloadHash !== payloadHash) {
    return {
      valid: false,
      reason: 'REGISTRY_HASH_MISMATCH',
      message: 'El hash del registro de autoridades no coincide con el sello criptográfico de la raíz de gobernanza. Modificación no autorizada detectada.',
      expected: sealObj.canonicalPayloadHash,
      actual: payloadHash,
    };
  }

  const unsignedRecord = {
    version: sealObj.version,
    format: sealObj.format,
    rootKeyId: sealObj.rootKeyId,
    canonicalPayloadHash: sealObj.canonicalPayloadHash,
    sealedAt: sealObj.sealedAt,
  };

  let valid = false;
  try {
    const pubKey = asEd25519PublicKey(pubKeyPem);
    valid = crypto.verify(
      null,
      Buffer.from(canonicalize(unsignedRecord), 'utf8'),
      pubKey,
      Buffer.from(sealObj.signature, 'base64')
    );
  } catch (verifyErr) {
    // Si la decodificación de la firma falla, se preserva valid = false
    valid = false;
  }

  if (!valid) {
    return {
      valid: false,
      reason: 'INVALID_ROOT_SIGNATURE',
      message: 'La firma Ed25519 del sello raíz de autoridades es inválida o fue manipulada.',
    };
  }

  return { valid: true, rootKeyId: sealObj.rootKeyId, sealedAt: sealObj.sealedAt };
}

module.exports = {
  ROOT_AUTHORITY,
  createRootSeal,
  verifyRootSeal,
};
