#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const FileLock = require('./file_lock.js');

const COUNTERSIGN_PAYLOAD_TYPE = 'application/vnd.axion.memory-design-countersignature+json';
const REGISTRY_ID = 'AX-MEM-REG-0001';
const REGISTRY_REVISION = 3;
const REGISTRY_DESIGN_VERSION = '0.13';
const REGISTRY_SHA256 = 'b8598241790c21f08f69035b69d7257c9a7c5b0e86776b1a5536e300f3142bf6';
const REGISTRY_SCOPE = Object.freeze(['D1', 'D2', 'D2-a', 'D3', 'D4a', 'D5', 'D6', 'D11', 'D12', 'D13']);
const MAX_COUNTERSIGN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const CLOCK_SKEW_MS = 5 * 60 * 1000;
const GENESIS_HASH = '0'.repeat(64);
const STATE_PARTS = ['.axion', 'state', 'countersign-consumption'];
const SCHEMA_CONSUMPTION = 'axion.countersign-consumption/v2';
const SCHEMA_DISPOSITION = 'axion.countersign-disposition/v1';
const MARKER_NAME_RE = /^[a-f0-9]{64}\.used$/;
const DISP_MARKER_NAME_RE = /^disp-[a-f0-9]{64}\.used$/;
const PRE_REPORT_KEYS = Object.freeze(['authorizationDigest', 'baselineDigest', 'envelopeSha256', 'operationId', 'phase', 'registry', 'schema', 'signer', 'snapshot', 'statementSha256', 'verifiedAt', 'verifier']);
const POST_REPORT_KEYS = Object.freeze(['authorizationUnchanged', 'baselineDigest', 'envelopeSha256', 'expectedEntryHash', 'finalStateDigest', 'operationId', 'phase', 'reasons', 'registry', 'result', 'schema', 'statementSha256', 'verifier', 'verifiedAt']);

const STATUS = Object.freeze({
  V2_PRE_OK: 'V2_PRE_OK',
  V2_PRE_FAIL: 'V2_PRE_FAIL',
  INDEPENDENT_VERIFICATION_PASS: 'INDEPENDENT_VERIFICATION_PASS',
  INDEPENDENT_VERIFICATION_FAIL: 'INDEPENDENT_VERIFICATION_FAIL',
  V2_STATE_UNAVAILABLE: 'BLOCKED_V2_STATE_UNAVAILABLE'
});

const USO = [
  'Uso:',
  '  node tools/countersign_independent_verifier.js pre --envelope <f> --registry <f> --authorities <f> [--target <dir>]',
  '  node tools/countersign_independent_verifier.js post --envelope <f> --registry <f> --authorities <f> [--target <dir>] [--pre-report <f>]',
  '',
  'Verificador V2 independiente: sin helpers del bootstrap, implementa su propio',
  'parsing, canonicalizacion, PAE y validacion. Escribe solo sus reportes en',
  '<target>/.axion/state/countersign-consumption/reports/.',
  '',
  'Codigos de salida: 0 PASS, 1 FAIL o bloqueo, 2 uso incorrecto.',
].join('\n');

function canonicalizeIndependent(value) {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('numero no finito');
    return Object.is(value, -0) ? '0' : JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalizeIndependent).join(',')}]`;
  if (typeof value !== 'object') throw new TypeError(`valor ${typeof value} no soportado`);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw new TypeError('objeto no plano');
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalizeIndependent(value[key])}`)
    .join(',')}}`;
}

function hashCanonicalIndependent(value) {
  return crypto.createHash('sha256').update(canonicalizeIndependent(value), 'utf8').digest('hex');
}

function sha256Hex(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function paeIndependent(payloadType, body) {
  const type = Buffer.from(String(payloadType), 'utf8');
  const payload = Buffer.isBuffer(body) ? body : Buffer.from(String(body), 'utf8');
  return Buffer.concat([
    Buffer.from('DSSEv1', 'utf8'),
    Buffer.from(' ', 'utf8'),
    Buffer.from(String(type.length), 'utf8'),
    Buffer.from(' ', 'utf8'),
    type,
    Buffer.from(' ', 'utf8'),
    Buffer.from(String(payload.length), 'utf8'),
    Buffer.from(' ', 'utf8'),
    payload
  ]);
}

function stateDir(targetRoot) {
  return path.join(targetRoot, ...STATE_PARTS);
}

function reportsDir(targetRoot) {
  return path.join(stateDir(targetRoot), 'reports');
}

function lockPath(targetRoot) {
  return path.join(stateDir(targetRoot), 'consumption.lock');
}

function nowOf(options) {
  if (options && options.now instanceof Date) return options.now;
  if (options && typeof options.now === 'string' && Number.isFinite(Date.parse(options.now))) return new Date(options.now);
  return new Date();
}

function sameKeys(object, expected) {
  if (!object || typeof object !== 'object' || Array.isArray(object)) return false;
  return Object.keys(object).sort().join(',') === [...expected].sort().join(',');
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function readRegistryIndependent(registryPath) {
  const parsed = readJson(registryPath);
  if (!sameKeys(parsed, ['date', 'decisions', 'designVersion', 'registry', 'registryId', 'registryRevision', 'schemaVersion'])) {
    return { ok: false, reason: 'REGISTRY_MALFORMED' };
  }
  if (parsed.registry !== 'axion.memory-design-registry'
      || parsed.registryId !== REGISTRY_ID
      || parsed.registryRevision !== REGISTRY_REVISION
      || parsed.designVersion !== REGISTRY_DESIGN_VERSION) {
    return { ok: false, reason: 'REGISTRY_BINDING_MISMATCH' };
  }
  if (hashCanonicalIndependent(parsed) !== REGISTRY_SHA256) {
    return { ok: false, reason: 'REGISTRY_HASH_MISMATCH' };
  }
  if (!Array.isArray(parsed.decisions) || parsed.decisions.length === 0) {
    return { ok: false, reason: 'REGISTRY_DECISIONS_MALFORMED' };
  }
  const scope = parsed.decisions
    .filter((d) => d && (d.state === 'RATIFICADA_HUMANA' || d.state === 'PENDIENTE_CONTRAFIRMA'))
    .map((d) => d.id);
  if (scope.join(',') !== REGISTRY_SCOPE.join(',')) {
    return { ok: false, reason: 'REGISTRY_SCOPE_MISMATCH' };
  }
  return { ok: true, registry: parsed, scope };
}

function computePublicKeyIdIndependent(publicKey) {
  const der = publicKey.export({ type: 'spki', format: 'der' });
  return `ed25519:${crypto.createHash('sha256').update(der).digest('hex')}`;
}

function parseAuthorityRegistryIndependent(authorityRegistryPath) {
  let parsed;
  try {
    const source = fs.readFileSync(authorityRegistryPath, 'utf8');
    if (/PRIVATE KEY|privateKey|secret|token/i.test(source)) return { ok: false, reason: 'AUTHORITY_REGISTRY_FORBIDDEN_MATERIAL' };
    parsed = JSON.parse(source);
  } catch (_) {
    return { ok: false, reason: 'AUTHORITY_REGISTRY_UNAVAILABLE' };
  }
  if (!sameKeys(parsed, ['authorities', 'version']) || parsed.version !== '1.0.0' || !Array.isArray(parsed.authorities)) {
    return { ok: false, reason: 'AUTHORITY_REGISTRY_MALFORMED' };
  }
  const seen = new Set();
  const allowedRoles = new Set(['HUMAN_AUTHORITY', 'INDEPENDENT_AUDITOR']);
  const allowedStatus = new Set(['TRUSTED', 'REVOKED', 'COMPROMISED', 'EXPIRED', 'UNKNOWN']);
  for (const authority of parsed.authorities) {
    if (!sameKeys(authority, ['actorId', 'expiresAt', 'keyId', 'publicKeyPem', 'roles', 'status'])) return { ok: false, reason: 'AUTHORITY_REGISTRY_MALFORMED' };
    if (typeof authority.actorId !== 'string' || authority.actorId.trim() === '') return { ok: false, reason: 'AUTHORITY_REGISTRY_MALFORMED' };
    if (!/^ed25519:[a-f0-9]{64}$/.test(authority.keyId) || seen.has(authority.keyId)) return { ok: false, reason: 'AUTHORITY_REGISTRY_MALFORMED' };
    if (!allowedStatus.has(authority.status) || !Array.isArray(authority.roles) || authority.roles.length === 0) return { ok: false, reason: 'AUTHORITY_REGISTRY_MALFORMED' };
    if (authority.roles.some((role) => !allowedRoles.has(role))) return { ok: false, reason: 'AUTHORITY_REGISTRY_MALFORMED' };
    if (new Set(authority.roles).size !== authority.roles.length) return { ok: false, reason: 'AUTHORITY_REGISTRY_MALFORMED' };
    if (!Number.isFinite(Date.parse(authority.expiresAt))) return { ok: false, reason: 'AUTHORITY_REGISTRY_MALFORMED' };
    let publicKey;
    try {
      publicKey = crypto.createPublicKey(authority.publicKeyPem);
    } catch (_) {
      return { ok: false, reason: 'AUTHORITY_REGISTRY_MALFORMED' };
    }
    if (publicKey.asymmetricKeyType !== 'ed25519' || computePublicKeyIdIndependent(publicKey) !== authority.keyId) {
      return { ok: false, reason: 'AUTHORITY_REGISTRY_MALFORMED' };
    }
    seen.add(authority.keyId);
  }
  return { ok: true, registry: parsed };
}

function resolveAuthorityIndependent(parsedRegistry, keyId, actorId, now) {
  const authority = parsedRegistry.authorities.find((entry) => entry && entry.keyId === keyId);
  if (!authority) return { ok: false, reason: 'UNKNOWN_AUTHORITY' };
  if (authority.status !== 'TRUSTED') return { ok: false, reason: `AUTHORITY_STATUS_${authority.status}` };
  if (!authority.roles.includes('HUMAN_AUTHORITY')) return { ok: false, reason: 'ROLE_MISMATCH' };
  if (authority.actorId !== actorId) return { ok: false, reason: 'ACTOR_MISMATCH' };
  if (!Number.isFinite(Date.parse(authority.expiresAt)) || now.getTime() >= Date.parse(authority.expiresAt)) {
    return { ok: false, reason: 'AUTHORITY_EXPIRED' };
  }
  return { ok: true, authority };
}

function readCrlIndependent(targetRoot) {
  const file = path.join(targetRoot, '.axion', 'revocations', 'crl.json');
  if (!fs.existsSync(file)) return { state: 'ABSENT', sha256: null, revokedKeyIds: [] };
  let parsed;
  try {
    parsed = readJson(file);
  } catch (_) {
    return { state: 'UNREADABLE', sha256: null, revokedKeyIds: [] };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || !Array.isArray(parsed.entries)) {
    return { state: 'UNREADABLE', sha256: null, revokedKeyIds: [] };
  }
  return {
    state: 'OK',
    sha256: hashCanonicalIndependent(parsed),
    revokedKeyIds: parsed.entries.filter((e) => e && typeof e.targetKeyId === 'string').map((e) => e.targetKeyId)
  };
}

function readHaltIndependent(targetRoot) {
  const file = path.join(targetRoot, '.axion', 'HALT');
  if (!fs.existsSync(file)) return 'RUNNING';
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_) {
    return 'HALT_STATE_UNREADABLE';
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)
      || typeof parsed.reason !== 'string' || parsed.reason.trim() === ''
      || typeof parsed.haltedAt !== 'string' || !Number.isFinite(Date.parse(parsed.haltedAt))) {
    return 'HALT_STATE_UNREADABLE';
  }
  return 'HALTED';
}

function decodeSignatureIndependent(encoded) {
  if (typeof encoded !== 'string' || encoded.length === 0 || encoded.length % 4 !== 0) return null;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) return null;
  const bytes = Buffer.from(encoded, 'base64');
  if (bytes.length !== 64 || bytes.toString('base64') !== encoded) return null;
  return bytes;
}

function parseEnvelopeIndependent(envelope) {
  if (!sameKeys(envelope, ['payload', 'payloadType', 'signatures'])) return { ok: false, reason: 'ENVELOPE_KEYS' };
  if (envelope.payloadType !== COUNTERSIGN_PAYLOAD_TYPE) return { ok: false, reason: 'PAYLOAD_TYPE_MISMATCH' };
  if (!Array.isArray(envelope.signatures) || envelope.signatures.length !== 1) return { ok: false, reason: 'SIGNATURE_CARDINALITY' };
  if (!sameKeys(envelope.signatures[0], ['keyid', 'sig'])) return { ok: false, reason: 'SIGNATURE_KEYS' };
  const signatureBytes = decodeSignatureIndependent(envelope.signatures[0].sig);
  if (!signatureBytes) return { ok: false, reason: 'SIGNATURE_ENCODING' };
  const payloadBytes = Buffer.from(envelope.payload, 'base64');
  if (payloadBytes.length === 0 || payloadBytes.toString('base64') !== envelope.payload) return { ok: false, reason: 'PAYLOAD_ENCODING' };
  const payloadText = payloadBytes.toString('utf8');
  if (!Buffer.from(payloadText, 'utf8').equals(payloadBytes)) return { ok: false, reason: 'PAYLOAD_NOT_UTF8' };
  let statement;
  try {
    statement = JSON.parse(payloadText);
  } catch (_) {
    return { ok: false, reason: 'PAYLOAD_NOT_JSON' };
  }
  if (canonicalizeIndependent(statement) !== payloadText) return { ok: false, reason: 'PAYLOAD_NOT_CANONICAL' };
  return { ok: true, signature: envelope.signatures[0], signatureBytes, payloadBytes, payloadText, statement };
}

function validateStatementIndependent(statement, registryObject, now) {
  const keys = ['designVersion', 'expiresAt', 'issuedAt', 'nonce', 'registryId', 'registryRevision', 'registrySha256', 'schemaVersion', 'scope', 'signer'];
  if (!sameKeys(statement, keys) || !sameKeys(statement.signer, ['actorId', 'keyId'])) return { ok: false, reason: 'STATEMENT_KEYS' };
  if (statement.schemaVersion !== '1.0.0') return { ok: false, reason: 'SCHEMA_VERSION' };
  if (statement.registryId !== registryObject.registryId || statement.registryRevision !== registryObject.registryRevision) return { ok: false, reason: 'REGISTRY_BINDING' };
  if (statement.designVersion !== registryObject.designVersion) return { ok: false, reason: 'DESIGN_VERSION' };
  if (statement.registrySha256 !== REGISTRY_SHA256) return { ok: false, reason: 'REGISTRY_SHA_MISMATCH' };
  if (!Array.isArray(statement.scope) || statement.scope.length !== REGISTRY_SCOPE.length || statement.scope.some((id, i) => id !== REGISTRY_SCOPE[i])) {
    return { ok: false, reason: 'SCOPE_MISMATCH' };
  }
  if (typeof statement.signer.actorId !== 'string' || statement.signer.actorId.trim() === '') return { ok: false, reason: 'ACTOR_ID' };
  if (!/^ed25519:[a-f0-9]{64}$/.test(statement.signer.keyId)) return { ok: false, reason: 'KEY_ID' };
  if (!/^[A-Za-z0-9_-]{32,}$/.test(statement.nonce)) return { ok: false, reason: 'NONCE' };
  const issuedAt = Date.parse(statement.issuedAt);
  const expiresAt = Date.parse(statement.expiresAt);
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt)) return { ok: false, reason: 'TIMESTAMPS' };
  const ttl = expiresAt - issuedAt;
  if (ttl <= 0 || ttl > MAX_COUNTERSIGN_TTL_MS) return { ok: false, reason: 'TTL_EXCEEDED' };
  if (issuedAt > now.getTime() + CLOCK_SKEW_MS || now.getTime() >= expiresAt) return { ok: false, reason: 'OUT_OF_WINDOW' };
  return { ok: true };
}

function verifyEnvelopeIndependent({ envelope, registryObject, authorityRegistry, now }) {
  const parsed = parseEnvelopeIndependent(envelope);
  if (!parsed.ok) return { ok: false, reason: parsed.reason };
  const statementResult = validateStatementIndependent(parsed.statement, registryObject, now);
  if (!statementResult.ok) return { ok: false, reason: statementResult.reason };
  if (parsed.signature.keyid !== parsed.statement.signer.keyId) return { ok: false, reason: 'KEYID_MISMATCH' };
  const authorityResult = resolveAuthorityIndependent(authorityRegistry, parsed.statement.signer.keyId, parsed.statement.signer.actorId, now);
  if (!authorityResult.ok) return { ok: false, reason: authorityResult.reason };
  let publicKey;
  try {
    publicKey = crypto.createPublicKey(authorityResult.authority.publicKeyPem);
  } catch (_) {
    return { ok: false, reason: 'AUTHORITY_KEY_UNREADABLE' };
  }
  let signatureValid = false;
  try {
    signatureValid = crypto.verify(null, paeIndependent(COUNTERSIGN_PAYLOAD_TYPE, parsed.payloadBytes), publicKey, parsed.signatureBytes);
  } catch (_) {
    signatureValid = false;
  }
  if (!signatureValid) return { ok: false, reason: 'SIGNATURE_INVALID' };
  return { ok: true, statement: parsed.statement, statementSha256: hashCanonicalIndependent(parsed.statement), envelopeSha256: hashCanonicalIndependent(envelope) };
}

function readLogIndependent(file, schema) {
  if (!fs.existsSync(file)) return { ok: true, entries: [] };
  const text = fs.readFileSync(file, 'utf8');
  if (text.trim() === '') return { ok: true, entries: [] };
  const entries = [];
  for (const line of text.split('\n').filter((l) => l.trim() !== '')) {
    let entry;
    try {
      entry = JSON.parse(line);
    } catch (_) {
      return { ok: false, reason: 'LOG_LINE_UNREADABLE' };
    }
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) || entry.schema !== schema) {
      return { ok: false, reason: 'LOG_ENTRY_SCHEMA' };
    }
    entries.push(entry);
  }
  return { ok: true, entries };
}

function readStateIndependent(targetRoot) {
  const dir = stateDir(targetRoot);
  const names = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  const markerNames = names.filter((n) => MARKER_NAME_RE.test(n)).sort();
  const dispMarkerNames = names.filter((n) => DISP_MARKER_NAME_RE.test(n)).sort();
  const markers = [];
  for (const name of markerNames) {
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
    } catch (_) {
      return { ok: false, reason: 'PARTIAL_CONSUMPTION_MARKER_UNWRITTEN' };
    }
    if (!sameKeys(parsed, ['baselineDigest', 'clockHighWaterMark', 'consumedAt', 'keyId', 'nonce', 'operationId', 'registryId', 'registryRevision', 'schema', 'statementSha256'])
        || parsed.schema !== 'axion.countersign-consumption-marker/v2') {
      return { ok: false, reason: 'PARTIAL_CONSUMPTION_MARKER_MALFORMED' };
    }
    markers.push({ name, content: parsed });
  }
  const consumptionRead = readLogIndependent(path.join(dir, 'consumption.log'), SCHEMA_CONSUMPTION);
  if (!consumptionRead.ok) return { ok: false, reason: 'CONSUMPTION_CHAIN_INVALID' };
  let previous = GENESIS_HASH;
  for (let i = 0; i < consumptionRead.entries.length; i += 1) {
    const entry = consumptionRead.entries[i];
    if (!sameKeys(entry, ['baselineDigest', 'clockHighWaterMark', 'consumedAt', 'entryHash', 'keyId', 'nonce', 'operationId', 'prevEntryHash', 'registryId', 'registryRevision', 'schema', 'seq', 'statementSha256'])) {
      return { ok: false, reason: 'CONSUMPTION_ENTRY_KEYS' };
    }
    if (entry.seq !== i + 1 || entry.prevEntryHash !== previous) return { ok: false, reason: 'CONSUMPTION_CHAIN_BROKEN' };
    const { entryHash, ...rest } = entry;
    if (hashCanonicalIndependent(rest) !== entryHash) return { ok: false, reason: 'CONSUMPTION_HASH_MISMATCH' };
    previous = entry.entryHash;
  }
  const markerByOperation = new Map(markers.map((m) => [m.content.operationId, m]));
  const entryByOperation = new Map();
  for (const entry of consumptionRead.entries) {
    if (entryByOperation.has(entry.operationId)) return { ok: false, reason: 'CONSUMPTION_DUPLICATE_OPERATION' };
    entryByOperation.set(entry.operationId, entry);
  }
  for (const marker of markers) {
    const entry = entryByOperation.get(marker.content.operationId);
    if (!entry) return { ok: false, reason: 'PARTIAL_CONSUMPTION_MARKER_WITHOUT_LOG' };
    for (const field of ['baselineDigest', 'clockHighWaterMark', 'consumedAt', 'keyId', 'nonce', 'registryId', 'registryRevision', 'statementSha256']) {
      if (entry[field] !== marker.content[field]) return { ok: false, reason: 'CONSUMPTION_MARKER_LOG_MISMATCH' };
    }
  }
  for (const entry of consumptionRead.entries) {
    if (!markerByOperation.has(entry.operationId)) return { ok: false, reason: 'PARTIAL_CONSUMPTION_LOG_WITHOUT_MARKER' };
  }
  const dispositionRead = readLogIndependent(path.join(dir, 'disposition.log'), SCHEMA_DISPOSITION);
  if (!dispositionRead.ok) return { ok: false, reason: 'DISPOSITION_CHAIN_INVALID' };
  previous = GENESIS_HASH;
  const invalidatedRevisions = new Set();
  const dispositionMarkerNamesFromLog = [];
  for (let i = 0; i < dispositionRead.entries.length; i += 1) {
    const entry = dispositionRead.entries[i];
    if (!sameKeys(entry, ['envelope', 'envelopeSha256', 'entryHash', 'prevEntryHash', 'schema', 'seq'])) {
      return { ok: false, reason: 'DISPOSITION_ENTRY_KEYS' };
    }
    if (entry.seq !== i + 1 || entry.prevEntryHash !== previous) return { ok: false, reason: 'DISPOSITION_CHAIN_BROKEN' };
    if (hashCanonicalIndependent(entry.envelope) !== entry.envelopeSha256) return { ok: false, reason: 'DISPOSITION_ENVELOPE_HASH' };
    const { entryHash, ...rest } = entry;
    if (hashCanonicalIndependent(rest) !== entryHash) return { ok: false, reason: 'DISPOSITION_HASH_MISMATCH' };
    previous = entry.entryHash;
    let statement = null;
    try {
      statement = JSON.parse(Buffer.from(entry.envelope.payload, 'base64').toString('utf8'));
      dispositionMarkerNamesFromLog.push(`disp-${hashCanonicalIndependent({ domain: 'disposition', registryId: statement.registryId, registryRevision: statement.registryRevision, keyId: statement.signer.keyId, nonce: statement.nonce })}.used`);
    } catch (_) {
      return { ok: false, reason: 'DISPOSITION_CHAIN_INVALID' };
    }
    if (statement.action === 'INVALIDATE') invalidatedRevisions.add(statement.registryRevision);
  }
  if (dispositionMarkerNamesFromLog.slice().sort().join(',') !== dispMarkerNames.join(',')) {
    return { ok: false, reason: 'PARTIAL_DISPOSITION_STATE_MISMATCH' };
  }
  const entries = consumptionRead.entries;
  const tailEntryHash = entries.length > 0 ? entries[entries.length - 1].entryHash : GENESIS_HASH;
  const hwm = entries.length > 0 ? entries[entries.length - 1].clockHighWaterMark : null;
  const markerSetHash = hashCanonicalIndependent(markerNames);
  return {
    ok: true,
    entries,
    markerNames,
    markerSetHash,
    invalidatedRevisions: [...invalidatedRevisions].sort(),
    tailSeq: entries.length,
    tailEntryHash,
    hwm,
    logLength: entries.length,
    dispositionHead: previous,
    dispositionLength: dispositionRead.entries.length,
    dispMarkerSetHash: hashCanonicalIndependent(dispMarkerNames)
  };
}

function operationIdOf(registryId, registryRevision, keyId, nonce) {
  return hashCanonicalIndependent({ domain: 'countersign-operation/v1', registryId, registryRevision, keyId, nonce });
}

function markerNameOf(registryId, registryRevision, keyId, nonce) {
  return `${hashCanonicalIndependent({ registryId, registryRevision, keyId, nonce })}.used`;
}

function stateDigestOf(state) {
  return hashCanonicalIndependent({
    domain: 'countersign-state/v1',
    tailSeq: state.tailSeq,
    tailEntryHash: state.tailEntryHash,
    hwm: state.hwm,
    markerSetHash: state.markerSetHash,
    logLength: state.logLength
  });
}

function dispositionStateDigestOf(state) {
  return hashCanonicalIndependent({
    domain: 'countersign-disposition-state/v1',
    length: state.dispositionLength,
    head: state.dispositionHead,
    markerSetHash: state.dispMarkerSetHash,
    invalidatedRevisions: state.invalidatedRevisions
  });
}

function authorizationDigestOf({ registryObject, envelopeSha256, statementSha256, signerActorId, signerKeyId, authorityRegistrySha256, crl, haltState, dispositionStateDigest }) {
  return hashCanonicalIndependent({
    domain: 'countersign-authorization/v1',
    registryId: registryObject.registryId,
    registryRevision: registryObject.registryRevision,
    designVersion: registryObject.designVersion,
    registrySha256: REGISTRY_SHA256,
    envelopeSha256,
    statementSha256,
    payloadType: COUNTERSIGN_PAYLOAD_TYPE,
    signerActorId,
    signerKeyId,
    authorityRegistrySha256,
    crlSha256: crl.sha256,
    haltState,
    dispositionLogDigest: dispositionStateDigest
  });
}

function baselineDigestOf(operationId, authorizationDigest, stateDigest) {
  return hashCanonicalIndependent({
    domain: 'countersign-baseline/v2',
    baselineSchemaVersion: '1.0.0',
    operationId,
    authorizationDigest,
    stateDigest
  });
}

function writeReportAtomic(file, report) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, file);
}

function withLock(targetRoot, options, fn) {
  let lock;
  try {
    lock = FileLock.acquire(lockPath(targetRoot), {
      timeoutMs: options && Number.isFinite(options.lockTimeoutMs) ? options.lockTimeoutMs : 10000,
      staleMs: options && Number.isFinite(options.lockStaleMs) ? options.lockStaleMs : 30000,
      code: 'ERR_COUNTERSIGN_LOCKED'
    });
  } catch (error) {
    return { status: STATUS.V2_STATE_UNAVAILABLE, reason: 'LOCK_BUSY', detail: error && error.message };
  }
  try {
    return fn();
  } finally {
    FileLock.release(lock.lockFile, lock.token);
  }
}

function pre({ targetRoot, envelope, registryPath, authorityRegistryPath, options }) {
  const now = nowOf(options);
  const registryRead = readRegistryIndependent(registryPath);
  if (!registryRead.ok) return { status: STATUS.V2_PRE_FAIL, reason: registryRead.reason };
  let authorityRead;
  try {
    authorityRead = parseAuthorityRegistryIndependent(authorityRegistryPath);
  } catch (error) {
    return { status: STATUS.V2_PRE_FAIL, reason: 'AUTHORITY_REGISTRY_UNAVAILABLE', detail: error && error.message };
  }
  if (!authorityRead.ok) return { status: STATUS.V2_PRE_FAIL, reason: authorityRead.reason };
  const envelopeRead = verifyEnvelopeIndependent({ envelope, registryObject: registryRead.registry, authorityRegistry: authorityRead.registry, now });
  if (!envelopeRead.ok) return { status: STATUS.V2_PRE_FAIL, reason: envelopeRead.reason };
  return withLock(targetRoot, options, () => {
    const state = readStateIndependent(targetRoot);
    if (!state.ok) return { status: STATUS.V2_PRE_FAIL, reason: state.reason };
    const crl = readCrlIndependent(targetRoot);
    if (crl.state === 'UNREADABLE') return { status: STATUS.V2_PRE_FAIL, reason: 'CRL_UNREADABLE' };
    if (crl.revokedKeyIds.includes(envelopeRead.statement.signer.keyId)) return { status: STATUS.V2_PRE_FAIL, reason: 'CRL_REVOKED' };
    const haltState = readHaltIndependent(targetRoot);
    if (haltState !== 'RUNNING') return { status: STATUS.V2_PRE_FAIL, reason: haltState };
    if (state.invalidatedRevisions.includes(envelopeRead.statement.registryRevision)) {
      return { status: STATUS.V2_PRE_FAIL, reason: 'REVISION_INVALIDATED' };
    }
    const operationId = operationIdOf(
      envelopeRead.statement.registryId,
      envelopeRead.statement.registryRevision,
      envelopeRead.statement.signer.keyId,
      envelopeRead.statement.nonce
    );
    const stateDigest = stateDigestOf(state);
    const authorizationDigest = authorizationDigestOf({
      registryObject: registryRead.registry,
      envelopeSha256: envelopeRead.envelopeSha256,
      statementSha256: envelopeRead.statementSha256,
      signerActorId: envelopeRead.statement.signer.actorId,
      signerKeyId: envelopeRead.statement.signer.keyId,
      authorityRegistrySha256: hashCanonicalIndependent(authorityRead.registry),
      crl,
      haltState,
      dispositionStateDigest: dispositionStateDigestOf(state)
    });
    const baselineDigest = baselineDigestOf(operationId, authorizationDigest, stateDigest);
    const report = {
      schema: 'axion.countersign-v2-pre/v1',
      phase: 'pre',
      verifier: 'V2',
      operationId,
      verifiedAt: now.toISOString(),
      registry: {
        id: registryRead.registry.registryId,
        revision: registryRead.registry.registryRevision,
        designVersion: registryRead.registry.designVersion,
        sha256: REGISTRY_SHA256
      },
      envelopeSha256: envelopeRead.envelopeSha256,
      statementSha256: envelopeRead.statementSha256,
      signer: { actorId: envelopeRead.statement.signer.actorId, keyId: envelopeRead.statement.signer.keyId },
      authorizationDigest,
      baselineDigest,
      snapshot: {
        stateDigest,
        tailSeq: state.tailSeq,
        tailEntryHash: state.tailEntryHash,
        hwm: state.hwm,
        markerSetHash: state.markerSetHash,
        markerNames: state.markerNames,
        logLength: state.logLength,
        dispositionLength: state.dispositionLength,
        dispositionHead: state.dispositionHead,
        dispMarkerSetHash: state.dispMarkerSetHash,
        invalidatedRevisions: state.invalidatedRevisions
      }
    };
    if (!sameKeys(report, PRE_REPORT_KEYS)) return { status: STATUS.V2_PRE_FAIL, reason: 'REPORT_SHAPE' };
    const reportPath = path.join(reportsDir(targetRoot), `v2-pre-${operationId}.json`);
    writeReportAtomic(reportPath, report);
    return { status: STATUS.V2_PRE_OK, operationId, baselineDigest, reportPath, report };
  });
}

function post({ targetRoot, envelope, registryPath, authorityRegistryPath, options }) {
  const now = nowOf(options);
  const registryRead = readRegistryIndependent(registryPath);
  if (!registryRead.ok) return { status: STATUS.INDEPENDENT_VERIFICATION_FAIL, reasons: [registryRead.reason] };
  let authorityRead;
  try {
    authorityRead = parseAuthorityRegistryIndependent(authorityRegistryPath);
  } catch (error) {
    return { status: STATUS.INDEPENDENT_VERIFICATION_FAIL, reasons: ['AUTHORITY_REGISTRY_UNAVAILABLE'], detail: error && error.message };
  }
  if (!authorityRead.ok) return { status: STATUS.INDEPENDENT_VERIFICATION_FAIL, reasons: [authorityRead.reason] };
  const envelopeRead = verifyEnvelopeIndependent({ envelope, registryObject: registryRead.registry, authorityRegistry: authorityRead.registry, now });
  if (!envelopeRead.ok) return { status: STATUS.INDEPENDENT_VERIFICATION_FAIL, reasons: [envelopeRead.reason] };
  const operationId = operationIdOf(
    envelopeRead.statement.registryId,
    envelopeRead.statement.registryRevision,
    envelopeRead.statement.signer.keyId,
    envelopeRead.statement.nonce
  );
  const explicit = options && options.preReportPath;
  const preReportPath = explicit || path.join(reportsDir(targetRoot), `v2-pre-${operationId}.json`);
  if (!fs.existsSync(preReportPath)) {
    return { status: STATUS.INDEPENDENT_VERIFICATION_FAIL, reasons: ['PRE_REPORT_MISSING'] };
  }
  let preReport;
  try {
    preReport = readJson(preReportPath);
  } catch (_) {
    return { status: STATUS.INDEPENDENT_VERIFICATION_FAIL, reasons: ['PRE_REPORT_UNREADABLE'] };
  }
  if (!sameKeys(preReport, PRE_REPORT_KEYS) || preReport.schema !== 'axion.countersign-v2-pre/v1' || preReport.operationId !== operationId) {
    return { status: STATUS.INDEPENDENT_VERIFICATION_FAIL, reasons: ['PRE_REPORT_MALFORMED'] };
  }
  return withLock(targetRoot, options, () => {
    const reasons = [];
    const state = readStateIndependent(targetRoot);
    if (!state.ok) return { status: STATUS.INDEPENDENT_VERIFICATION_FAIL, reasons: [state.reason] };
    const crl = readCrlIndependent(targetRoot);
    const haltState = readHaltIndependent(targetRoot);
    const currentAuthorization = authorizationDigestOf({
      registryObject: registryRead.registry,
      envelopeSha256: envelopeRead.envelopeSha256,
      statementSha256: envelopeRead.statementSha256,
      signerActorId: envelopeRead.statement.signer.actorId,
      signerKeyId: envelopeRead.statement.signer.keyId,
      authorityRegistrySha256: hashCanonicalIndependent(authorityRead.registry),
      crl,
      haltState,
      dispositionStateDigest: dispositionStateDigestOf(state)
    });
    const authorizationUnchanged = currentAuthorization === preReport.authorizationDigest;
    if (!authorizationUnchanged) reasons.push('AUTHORIZATION_CHANGED_DURING_CONSUMPTION');
    if (state.tailSeq !== preReport.snapshot.tailSeq + 1) reasons.push('TRANSITION_COUNT');
    if (state.logLength !== preReport.snapshot.logLength + 1) reasons.push('LOG_LENGTH');
    const newEntry = state.entries[state.entries.length - 1];
    if (!newEntry) {
      reasons.push('ENTRY_MISSING');
    } else {
      if (newEntry.prevEntryHash !== preReport.snapshot.tailEntryHash) reasons.push('CHAIN_PREV');
      if (newEntry.operationId !== operationId) reasons.push('OPERATION_ID');
      if (newEntry.baselineDigest !== preReport.baselineDigest) reasons.push('BASELINE_BINDING');
      if (newEntry.nonce !== envelopeRead.statement.nonce) reasons.push('NONCE');
      if (newEntry.keyId !== envelopeRead.statement.signer.keyId) reasons.push('KEY_ID');
      if (newEntry.registryId !== envelopeRead.statement.registryId || newEntry.registryRevision !== envelopeRead.statement.registryRevision) reasons.push('REGISTRY_BINDING');
      if (newEntry.statementSha256 !== envelopeRead.statementSha256) reasons.push('STATEMENT_BINDING');
      if (!Number.isFinite(Date.parse(newEntry.consumedAt))) reasons.push('CONSUMED_AT');
      const expectedHwm = preReport.snapshot.hwm !== null && Date.parse(preReport.snapshot.hwm) > Date.parse(newEntry.consumedAt)
        ? preReport.snapshot.hwm
        : newEntry.consumedAt;
      if (newEntry.clockHighWaterMark !== expectedHwm) reasons.push('HWM');
    }
    const expectedMarkerName = markerNameOf(
      envelopeRead.statement.registryId,
      envelopeRead.statement.registryRevision,
      envelopeRead.statement.signer.keyId,
      envelopeRead.statement.nonce
    );
    const expectedMarkers = [...preReport.snapshot.markerNames, expectedMarkerName].sort();
    if (state.markerNames.join(',') !== expectedMarkers.join(',')) reasons.push('MARKER_TRANSITION');
    const finalStateDigest = stateDigestOf(state);
    const result = reasons.length === 0 ? STATUS.INDEPENDENT_VERIFICATION_PASS : STATUS.INDEPENDENT_VERIFICATION_FAIL;
    const report = {
      schema: 'axion.countersign-v2-post/v1',
      phase: 'post',
      verifier: 'V2',
      operationId,
      verifiedAt: now.toISOString(),
      registry: {
        id: registryRead.registry.registryId,
        revision: registryRead.registry.registryRevision,
        designVersion: registryRead.registry.designVersion,
        sha256: REGISTRY_SHA256
      },
      envelopeSha256: envelopeRead.envelopeSha256,
      statementSha256: envelopeRead.statementSha256,
      baselineDigest: preReport.baselineDigest,
      finalStateDigest,
      expectedEntryHash: newEntry ? newEntry.entryHash : null,
      authorizationUnchanged,
      result,
      reasons
    };
    if (!sameKeys(report, POST_REPORT_KEYS)) return { status: STATUS.INDEPENDENT_VERIFICATION_FAIL, reasons: ['REPORT_SHAPE'] };
    const reportPath = path.join(reportsDir(targetRoot), `v2-post-${operationId}.json`);
    writeReportAtomic(reportPath, report);
    return { status: result, operationId, reasons, reportPath, report };
  });
}

function parseOptions(args) {
  const options = { positional: [] };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = args[i + 1];
      if (value === undefined || value.startsWith('--')) return { ok: false, reason: `FALTA_VALOR:${key}` };
      options[key] = value;
      i += 1;
    } else {
      options.positional.push(arg);
    }
  }
  return { ok: true, options };
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  if (!command || command === '--help' || command === '-h') {
    console.log(USO);
    process.exit(2);
  }
  const parsedOptions = parseOptions(args.slice(1));
  if (!parsedOptions.ok) {
    console.log(USO);
    process.exit(2);
  }
  const options = parsedOptions.options;
  if (!options.envelope || !options.registry || !options.authorities) {
    console.log(USO);
    process.exit(2);
  }
  const targetRoot = options.target ? path.resolve(options.target) : path.resolve(__dirname, '..');
  let envelope;
  try {
    envelope = readJson(options.envelope);
  } catch (error) {
    console.log(JSON.stringify({ status: STATUS.INDEPENDENT_VERIFICATION_FAIL, reasons: ['ENVELOPE_UNREADABLE'], detail: error.message }, null, 2));
    process.exitCode = 1;
    return;
  }
  const base = {
    targetRoot,
    envelope,
    registryPath: path.resolve(options.registry),
    authorityRegistryPath: path.resolve(options.authorities),
    options: {
      now: options.now,
      preReportPath: options['pre-report'] ? path.resolve(options['pre-report']) : undefined,
      lockTimeoutMs: options['lock-timeout'] ? Number(options['lock-timeout']) : undefined,
      lockStaleMs: options['lock-stale'] ? Number(options['lock-stale']) : undefined
    }
  };
  let result;
  if (command === 'pre') {
    result = pre(base);
  } else if (command === 'post') {
    result = post(base);
  } else {
    console.log(USO);
    process.exit(2);
    return;
  }
  console.log(JSON.stringify(result, null, 2));
  const ok = result.status === STATUS.V2_PRE_OK || result.status === STATUS.INDEPENDENT_VERIFICATION_PASS;
  process.exitCode = ok ? 0 : 1;
}

if (require.main === module) main();

module.exports = {
  STATUS,
  canonicalizeIndependent,
  hashCanonicalIndependent,
  paeIndependent,
  operationIdOf,
  markerNameOf,
  readRegistryIndependent,
  parseAuthorityRegistryIndependent,
  parseEnvelopeIndependent,
  verifyEnvelopeIndependent,
  readStateIndependent,
  stateDigestOf,
  dispositionStateDigestOf,
  authorizationDigestOf,
  baselineDigestOf,
  pre,
  post,
  USO
};
