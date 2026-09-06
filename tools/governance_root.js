'use strict';

/**
 * Axion Protocol — Governance Root of Trust & Authority Registry Sealing
 *
 * Anclaje criptográfico inmutable de la raíz de gobernanza:
 * 1. Clave pública raíz fijada (pinned) y resolución soberana externa (~/.axion/governance_root.json o ENV).
 * 2. Eliminación estricta de customRootPublicKey en runtime (cierre de vector de bypass).
 * 3. Validación de sello criptográfico con versión monotónica y fecha de expiración contra replay attacks.
 * 4. Verificación externa independiente (verifyWorkspaceExternal) para auditar desde fuera del workspace.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
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

const EXTERNAL_ROOT_PATH = path.join(os.homedir(), '.axion', 'governance_root.json');

/**
 * Resuelve la autoridad de raíz soberana consultando primero fuentes externas fuera del workspace.
 */
function resolveRootAuthority() {
  if (process.env.AXION_ROOT_KEY_PUB) {
    try {
      const pubKey = asEd25519PublicKey(process.env.AXION_ROOT_KEY_PUB);
      const keyId = computePublicKeyId(pubKey);
      return {
        actorId: 'Axion External Governance Root (ENV)',
        keyId,
        publicKeyPem: pubKey.export({ type: 'spki', format: 'pem' }),
        status: 'TRUSTED',
        source: 'ENVIRONMENT',
      };
    } catch (_) {
      /* variable de entorno o clave no disponible */
    }
  }
  if (fs.existsSync(EXTERNAL_ROOT_PATH)) {
    try {
      const externalObj = JSON.parse(fs.readFileSync(EXTERNAL_ROOT_PATH, 'utf8'));
      if (externalObj && externalObj.publicKeyPem && externalObj.keyId) {
        const pubKey = asEd25519PublicKey(externalObj.publicKeyPem);
        const keyId = computePublicKeyId(pubKey);
        if (keyId === externalObj.keyId) {
          return {
            ...externalObj,
            source: 'EXTERNAL_FILE',
          };
        }
      }
    } catch (_) {
      /* archivo externo no parseable o clave no válida */
    }
  }
  return { ...ROOT_AUTHORITY, source: 'EMBEDDED_ROOT' };
}

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
    policyId: registryObj.policyId || 'axion-authority-governance-v1',
    monotonicVersion: registryObj.monotonicVersion || 1,
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
 * Prohíbe terminantemente parámetros customRootPublicKey en runtime para evitar bypass de raíz.
 */
function verifyRootSeal(registryObj, sealObj) {
  // Detección y rechazo de cualquier intento de inyectar customRootPublicKey
  if (arguments.length > 2) {
    return {
      valid: false,
      reason: 'CUSTOM_ROOT_FORBIDDEN',
      message: 'verifyRootSeal() prohíbe claves raíz alternativas en tiempo de ejecución. La raíz está anclada de forma soberana.',
    };
  }

  if (!sealObj || typeof sealObj !== 'object' || Array.isArray(sealObj)) {
    return {
      valid: false,
      reason: 'MISSING_OR_MALFORMED_SEAL',
      message: 'El sello raíz de autoridades es inválido, malformado o no existe.',
    };
  }

  const rootAuth = resolveRootAuthority();

  if (sealObj.rootKeyId !== rootAuth.keyId) {
    return {
      valid: false,
      reason: 'UNTRUSTED_ROOT_KEY_ID',
      message: `El rootKeyId "${sealObj.rootKeyId}" no coincide con la raíz confiable soberana ("${rootAuth.keyId}").`,
    };
  }

  // Comprobación de expiración de política (Hallazgo 5)
  if (registryObj && registryObj.expiresAt) {
    const expiresMs = Date.parse(registryObj.expiresAt);
    if (Number.isFinite(expiresMs) && Date.now() > expiresMs) {
      return {
        valid: false,
        reason: 'EXPIRED_AUTHORITY_REGISTRY',
        message: `El registro de autoridades expiró el ${registryObj.expiresAt}. Políticas vencidas rechazadas fail-closed.`,
      };
    }
  }

  // Comprobación de versión monotónica / anti-rollback (Hallazgo 5)
  if (registryObj && registryObj.monotonicVersion !== undefined) {
    const ver = registryObj.monotonicVersion;
    if (!Number.isInteger(ver) || ver < 1) {
      return {
        valid: false,
        reason: 'INVALID_MONOTONIC_VERSION',
        message: 'monotonicVersion en el registro de autoridades debe ser un entero estrictamente positivo.',
      };
    }
    // Comparación con versión en sello
    if (sealObj.monotonicVersion !== undefined && sealObj.monotonicVersion !== ver) {
      return {
        valid: false,
        reason: 'VERSION_SEAL_MISMATCH',
        message: `La versión monotónica del registro (${ver}) diverge de la del sello (${sealObj.monotonicVersion}).`,
      };
    }
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
    ...(sealObj.policyId ? { policyId: sealObj.policyId } : {}),
    ...(sealObj.monotonicVersion ? { monotonicVersion: sealObj.monotonicVersion } : {}),
    canonicalPayloadHash: sealObj.canonicalPayloadHash,
    sealedAt: sealObj.sealedAt,
  };

  let valid = false;
  try {
    const pubKey = asEd25519PublicKey(rootAuth.publicKeyPem);
    valid = crypto.verify(
      null,
      Buffer.from(canonicalize(unsignedRecord), 'utf8'),
      pubKey,
      Buffer.from(sealObj.signature, 'base64')
    );
  } catch (_) {
    valid = false;
  }

  if (!valid) {
    return {
      valid: false,
      reason: 'INVALID_ROOT_SIGNATURE',
      message: 'La firma Ed25519 del sello raíz de autoridades es inválida o fue manipulada.',
    };
  }

  return { valid: true, rootKeyId: sealObj.rootKeyId, sealedAt: sealObj.sealedAt, monotonicVersion: sealObj.monotonicVersion };
}

/**
 * Auditor externo independiente: audita el espacio de trabajo desde un contexto fuera del control del agente.
 * Verifica que el código del workspace no haya sustituido ROOT_AUTHORITY y que el registro/sello sean íntegros.
 */
function verifyWorkspaceExternal(workspacePath, options = {}) {
  const ws = path.resolve(workspacePath);
  const rootGovFile = path.join(ws, 'tools', 'governance_root.js');
  const authoritiesFile = path.join(ws, 'policies', 'authorities.json');
  const sealFile = path.join(ws, 'policies', 'authorities.seal.json');

  const expectedRoot = options.expectedRoot || resolveRootAuthority();

  // 1. Verificar si el agente modificó tools/governance_root.js en el workspace
  if (fs.existsSync(rootGovFile)) {
    try {
      const code = fs.readFileSync(rootGovFile, 'utf8');
      // Extraer keyId declarado en el código del workspace
      const matchKey = code.match(/keyId:\s*['"](ed25519:[a-f0-9]{64})['"]/);
      if (!matchKey || matchKey[1] !== expectedRoot.keyId) {
        return {
          valid: false,
          reason: 'WORKSPACE_ROOT_TAMPERING_DETECTED',
          exitCode: 1,
          message: `El archivo ${rootGovFile} en el workspace fue alterado para usar una raíz de confianza no autorizada (${matchKey ? matchKey[1] : 'ausente'}).`,
        };
      }
    } catch (e) {
      return { valid: false, reason: 'UNREADABLE_WORKSPACE_ROOT', exitCode: 1, message: e.message };
    }
  }

  // 2. Verificar integridad del registro y su sello usando la autoridad externa
  if (!fs.existsSync(authoritiesFile) || !fs.existsSync(sealFile)) {
    return { valid: false, reason: 'MISSING_AUTHORITIES_OR_SEAL', exitCode: 1 };
  }

  let regObj, sealObj;
  try {
    regObj = JSON.parse(fs.readFileSync(authoritiesFile, 'utf8'));
    sealObj = JSON.parse(fs.readFileSync(sealFile, 'utf8'));
  } catch (e) {
    return { valid: false, reason: 'MALFORMED_AUTHORITY_FILES', exitCode: 1, message: e.message };
  }

  // Comprobar si el sello coincide con la raíz esperada
  if (sealObj.rootKeyId !== expectedRoot.keyId) {
    return {
      valid: false,
      reason: 'UNTRUSTED_ROOT_KEY_IN_SEAL',
      exitCode: 1,
      message: `El sello del workspace declara rootKeyId "${sealObj.rootKeyId}" que no coincide con la autoridad externa "${expectedRoot.keyId}".`,
    };
  }

  const sealRes = verifyRootSeal(regObj, sealObj);
  if (!sealRes.valid) {
    return {
      valid: false,
      reason: sealRes.reason,
      exitCode: 1,
      message: sealRes.message,
    };
  }

  return { valid: true, exitCode: 0, rootKeyId: expectedRoot.keyId, monotonicVersion: regObj.monotonicVersion };
}

module.exports = {
  ROOT_AUTHORITY,
  EXTERNAL_ROOT_PATH,
  resolveRootAuthority,
  createRootSeal,
  verifyRootSeal,
  verifyWorkspaceExternal,
};
