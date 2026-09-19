#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { canonicalize, hashCanonical } = require('./canonical_json.js');
const { pae } = require('./dsse.js');
const FileLock = require('./file_lock.js');
const { loadAuthorityRegistry } = require('./approval_ed25519.js');
const { readHaltState, HALT_STATUS } = require('./killswitch.js');

const COUNTERSIGN_PAYLOAD_TYPE = 'application/vnd.axion.memory-design-countersignature+json';
const DISPOSITION_PAYLOAD_TYPE = 'application/vnd.axion.memory-disposition+json';
const REGISTRY_ID = 'AX-MEM-REG-0001';
const REGISTRY_REVISION = 3;
const REGISTRY_DESIGN_VERSION = '0.13';
const REGISTRY_SHA256 = 'b8598241790c21f08f69035b69d7257c9a7c5b0e86776b1a5536e300f3142bf6';
const REGISTRY_SCOPE = Object.freeze(['D1', 'D2', 'D2-a', 'D3', 'D4a', 'D5', 'D6', 'D11', 'D12', 'D13']);
const MAX_COUNTERSIGN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_DISPOSITION_TTL_MS = 24 * 60 * 60 * 1000;
const CLOCK_SKEW_MS = 5 * 60 * 1000;
const GENESIS_HASH = '0'.repeat(64);
const STATE_PARTS = ['.axion', 'state', 'countersign-consumption'];
const SCHEMA_MARKER = 'axion.countersign-consumption-marker/v2';
const SCHEMA_CONSUMPTION = 'axion.countersign-consumption/v2';
const SCHEMA_DISP_MARKER = 'axion.countersign-disposition-marker/v1';
const SCHEMA_DISPOSITION = 'axion.countersign-disposition/v1';
const DISPOSITION_ACTIONS = Object.freeze(['REPAIR', 'INVALIDATE']);
const MARKER_NAME_RE = /^[a-f0-9]{64}\.used$/;
const DISP_MARKER_NAME_RE = /^disp-[a-f0-9]{64}\.used$/;
const STATEMENT_KEYS = Object.freeze(['designVersion', 'expiresAt', 'issuedAt', 'nonce', 'registryId', 'registryRevision', 'registrySha256', 'schemaVersion', 'scope', 'signer']);
const REPAIR_KEYS = Object.freeze(['action', 'dispositionId', 'expiresAt', 'issuedAt', 'markerContentSha256', 'markerFileNameHash', 'nonce', 'registryId', 'registryRevision', 'schemaVersion', 'signer', 'statementSha256', 'targetHead']);
const INVALIDATE_KEYS = Object.freeze(['action', 'dispositionId', 'expiresAt', 'issuedAt', 'markerContentSha256', 'markerFileNameHash', 'newRegistryRevision', 'nonce', 'registryId', 'registryRevision', 'schemaVersion', 'signer', 'statementSha256']);

const STATUS = Object.freeze({
  COUNTERSIGN_VALID: 'COUNTERSIGN_VALID',
  COUNTERSIGN_MALFORMED: 'COUNTERSIGN_MALFORMED',
  COUNTERSIGN_INVALID_SIGNATURE: 'COUNTERSIGN_INVALID_SIGNATURE',
  COUNTERSIGN_UNKNOWN_AUTHORITY: 'COUNTERSIGN_UNKNOWN_AUTHORITY',
  COUNTERSIGN_EXPIRED: 'COUNTERSIGN_EXPIRED',
  COUNTERSIGN_SCOPE_MISMATCH: 'COUNTERSIGN_SCOPE_MISMATCH',
  COUNTERSIGN_REPLAYED: 'COUNTERSIGN_REPLAYED',
  COUNTERSIGN_REVOKED: 'COUNTERSIGN_REVOKED',
  COUNTERSIGN_HALTED: 'COUNTERSIGN_HALTED',
  COUNTERSIGN_REVISION_INVALIDATED: 'COUNTERSIGN_REVISION_INVALIDATED',
  COUNTERSIGN_AUTHORIZATION_CHANGED: 'COUNTERSIGN_AUTHORIZATION_CHANGED',
  COUNTERSIGN_BASELINE_REQUIRED: 'COUNTERSIGN_BASELINE_REQUIRED',
  COUNTERSIGN_BASELINE_MISMATCH: 'COUNTERSIGN_BASELINE_MISMATCH',
  COUNTERSIGN_CLOCK_UNTRUSTED: 'BLOCKED_COUNTERSIGN_CLOCK_UNTRUSTED',
  COUNTERSIGN_STATE_UNAVAILABLE: 'BLOCKED_COUNTERSIGN_STATE_UNAVAILABLE',
  DISPOSITION_VALID: 'DISPOSITION_VALID',
  DISPOSITION_MALFORMED: 'DISPOSITION_MALFORMED',
  DISPOSITION_INVALID_SIGNATURE: 'DISPOSITION_INVALID_SIGNATURE',
  DISPOSITION_UNKNOWN_AUTHORITY: 'DISPOSITION_UNKNOWN_AUTHORITY',
  DISPOSITION_EXPIRED: 'DISPOSITION_EXPIRED',
  DISPOSITION_SCOPE_MISMATCH: 'DISPOSITION_SCOPE_MISMATCH',
  DISPOSITION_REPLAYED: 'DISPOSITION_REPLAYED',
  DISPOSITION_UNAVAILABLE: 'BLOCKED_DISPOSITION_STATE_UNAVAILABLE'
});

const USO = [
  'Uso:',
  '  node tools/countersign_bootstrap.js verify --envelope <f> --registry <f> --authorities <f> [--target <dir>]',
  '  node tools/countersign_bootstrap.js consume --envelope <f> --registry <f> --authorities <f> [--target <dir>]',
  '  node tools/countersign_bootstrap.js dispose --envelope <f> --registry <f> --authorities <f> [--target <dir>]',
  '',
  'Verifica, consume o dispone una contrafirma de diseno sobre AX-MEM-REG-0001 revision 3.',
  'Escrituras permitidas solo en <target>/.axion/state/countersign-consumption/.',
  'Sin --target se usa la raiz del repositorio que contiene esta herramienta.',
  '',
  'Codigos de salida: 0 valido, 1 bloqueado o invalido, 2 uso incorrecto.',
].join('\n');

function containmentError(reason) {
  const error = new Error(`Ruta no contenida: ${reason}`);
  error.code = 'PATH_NOT_CONTAINED';
  error.reason = reason;
  return error;
}

function canonicalRootOf(targetRoot) {
  const resolved = path.resolve(targetRoot);
  try {
    if (fs.existsSync(resolved)) return fs.realpathSync(resolved);
  } catch (_) {
    return resolved;
  }
  return resolved;
}

function pathKey(value) {
  return process.platform === 'win32' ? value.toLowerCase() : value;
}

function lstatOrNull(file) {
  try {
    return fs.lstatSync(file);
  } catch (_) {
    return null;
  }
}

function assertContained(targetRoot, absolutePath) {
  const root = canonicalRootOf(targetRoot);
  const resolved = path.resolve(absolutePath);
  const rel = path.relative(root, resolved);
  if (rel === '') return;
  if (rel.startsWith('..') || path.isAbsolute(rel)) throw containmentError('ESCAPED_PATH');
  let current = root;
  for (const part of rel.split(path.sep)) {
    current = path.join(current, part);
    let stats;
    try {
      stats = fs.lstatSync(current);
    } catch (_) {
      break;
    }
    if (stats.isSymbolicLink()) throw containmentError('SYMLINK_REJECTED');
    let real;
    try {
      real = fs.realpathSync(current);
    } catch (_) {
      throw containmentError('REALPATH_UNAVAILABLE');
    }
    if (pathKey(real) !== pathKey(current)) throw containmentError('SYMLINK_ESCAPE');
    if (stats.isFile() && stats.nlink > 1) throw containmentError('HARDLINK_REJECTED');
  }
}

function ensureContainedDirectory(targetRoot, parts) {
  const root = canonicalRootOf(targetRoot);
  if (!fs.existsSync(root)) throw containmentError('TARGET_ROOT_MISSING');
  let current = root;
  for (const part of parts) {
    const next = path.join(current, part);
    if (lstatOrNull(next) === null) fs.mkdirSync(next, { mode: 0o700 });
    assertContained(targetRoot, next);
    const stats = fs.lstatSync(next);
    if (!stats.isDirectory()) throw containmentError('NOT_A_DIRECTORY');
    current = next;
  }
  return current;
}

function withNoFollow(flags) {
  if (process.platform !== 'win32' && fs.constants.O_NOFOLLOW) return flags | fs.constants.O_NOFOLLOW;
  return flags;
}

function safeReadText(targetRoot, file) {
  if (lstatOrNull(file) === null) return null;
  assertContained(targetRoot, file);
  return fs.readFileSync(file, 'utf8');
}

function safeAppendText(targetRoot, file, text) {
  assertContained(targetRoot, file);
  const flags = withNoFollow(fs.constants.O_APPEND | fs.constants.O_CREAT | fs.constants.O_WRONLY);
  const descriptor = fs.openSync(file, flags, 0o600);
  try {
    fs.writeSync(descriptor, text);
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
}

function safeCreateExclusive(targetRoot, file, text) {
  let descriptor;
  try {
    assertContained(targetRoot, file);
    descriptor = fs.openSync(file, withNoFollow(fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY), 0o600);
  } catch (error) {
    if (error && error.code === 'EEXIST') return { ok: false, code: 'EXISTS' };
    if (error && error.code === 'PATH_NOT_CONTAINED') throw error;
    return { ok: false, code: 'UNAVAILABLE', error };
  }
  try {
    fs.writeSync(descriptor, text);
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    return { ok: true };
  } catch (error) {
    if (descriptor !== undefined) {
      try { fs.closeSync(descriptor); } catch (_) { /* descriptor ya cerrado */ }
    }
    return { ok: false, code: 'WRITE_FAILED', error };
  }
}

function containmentResult(status, error) {
  return { status, reason: 'PATH_NOT_CONTAINED', detail: error && error.reason };
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

function consumptionLogPath(targetRoot) {
  return path.join(stateDir(targetRoot), 'consumption.log');
}

function dispositionLogPath(targetRoot) {
  return path.join(stateDir(targetRoot), 'disposition.log');
}

function nowOf(options) {
  if (options && options.now instanceof Date) return options.now;
  if (options && typeof options.now === 'string' && Number.isFinite(Date.parse(options.now))) return new Date(options.now);
  return new Date();
}

function readJsonStrict(file) {
  const source = fs.readFileSync(file, 'utf8');
  return JSON.parse(source);
}

function sameKeys(object, expected) {
  if (!object || typeof object !== 'object' || Array.isArray(object)) return false;
  const actual = Object.keys(object).sort().join(',');
  return actual === [...expected].sort().join(',');
}

function readRegistry(registryPath) {
  const parsed = readJsonStrict(registryPath);
  if (!sameKeys(parsed, ['date', 'decisions', 'designVersion', 'registry', 'registryId', 'registryRevision', 'schemaVersion'])) {
    return { ok: false, reason: 'REGISTRY_MALFORMED' };
  }
  if (parsed.registry !== 'axion.memory-design-registry'
      || parsed.registryId !== REGISTRY_ID
      || parsed.registryRevision !== REGISTRY_REVISION
      || parsed.designVersion !== REGISTRY_DESIGN_VERSION) {
    return { ok: false, reason: 'REGISTRY_BINDING_MISMATCH' };
  }
  if (hashCanonical(parsed) !== REGISTRY_SHA256) {
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

function readCrl(targetRoot) {
  const file = path.join(targetRoot, '.axion', 'revocations', 'crl.json');
  assertContained(targetRoot, path.dirname(file));
  if (lstatOrNull(file) === null) return { state: 'ABSENT', sha256: null, revokedKeyIds: [] };
  assertContained(targetRoot, file);
  let parsed;
  try {
    parsed = readJsonStrict(file);
  } catch (_) {
    return { state: 'UNREADABLE', sha256: null, revokedKeyIds: [] };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || !Array.isArray(parsed.entries)) {
    return { state: 'UNREADABLE', sha256: null, revokedKeyIds: [] };
  }
  const revokedKeyIds = parsed.entries
    .filter((e) => e && typeof e.targetKeyId === 'string')
    .map((e) => e.targetKeyId);
  return { state: 'OK', sha256: hashCanonical(parsed), revokedKeyIds };
}

function readHalt(targetRoot) {
  const haltFile = path.join(targetRoot, '.axion', 'HALT');
  assertContained(targetRoot, path.dirname(haltFile));
  if (lstatOrNull(haltFile) !== null) assertContained(targetRoot, haltFile);
  const result = readHaltState({ haltDir: path.join(targetRoot, '.axion') });
  return result.status;
}

function decodeBase64Signature(encoded) {
  if (typeof encoded !== 'string' || encoded.length === 0 || encoded.length % 4 !== 0) return null;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) return null;
  const bytes = Buffer.from(encoded, 'base64');
  if (bytes.length !== 64 || bytes.toString('base64') !== encoded) return null;
  return bytes;
}

function operationIdOf(registryId, registryRevision, keyId, nonce) {
  return hashCanonical({ domain: 'countersign-operation/v1', registryId, registryRevision, keyId, nonce });
}

function markerNameOf(registryId, registryRevision, keyId, nonce) {
  return `${hashCanonical({ registryId, registryRevision, keyId, nonce })}.used`;
}

function dispositionMarkerNameOf(registryId, registryRevision, keyId, nonce) {
  return `disp-${hashCanonical({ domain: 'disposition', registryId, registryRevision, keyId, nonce })}.used`;
}

function parseEnvelopeStrict(envelope, payloadType) {
  if (!sameKeys(envelope, ['payload', 'payloadType', 'signatures'])) {
    return { ok: false, reason: 'ENVELOPE_KEYS' };
  }
  if (envelope.payloadType !== payloadType) {
    return { ok: false, reason: 'PAYLOAD_TYPE_MISMATCH' };
  }
  if (!Array.isArray(envelope.signatures) || envelope.signatures.length !== 1) {
    return { ok: false, reason: 'SIGNATURE_CARDINALITY' };
  }
  const signature = envelope.signatures[0];
  if (!sameKeys(signature, ['keyid', 'sig'])) {
    return { ok: false, reason: 'SIGNATURE_KEYS' };
  }
  const signatureBytes = decodeBase64Signature(signature.sig);
  if (!signatureBytes) return { ok: false, reason: 'SIGNATURE_ENCODING' };
  let payloadBytes;
  try {
    payloadBytes = Buffer.from(envelope.payload, 'base64');
  } catch (_) {
    return { ok: false, reason: 'PAYLOAD_ENCODING' };
  }
  if (payloadBytes.length === 0 || payloadBytes.toString('base64') !== envelope.payload) {
    return { ok: false, reason: 'PAYLOAD_ENCODING' };
  }
  const payloadText = payloadBytes.toString('utf8');
  if (!Buffer.from(payloadText, 'utf8').equals(payloadBytes)) {
    return { ok: false, reason: 'PAYLOAD_NOT_UTF8' };
  }
  let statement;
  try {
    statement = JSON.parse(payloadText);
  } catch (_) {
    return { ok: false, reason: 'PAYLOAD_NOT_JSON' };
  }
  if (canonicalize(statement) !== payloadText) {
    return { ok: false, reason: 'PAYLOAD_NOT_CANONICAL' };
  }
  return { ok: true, signature, signatureBytes, payloadBytes, payloadText, statement };
}

function verifyStatementSignature(statement, payloadBytes, signatureBytes, publicKey) {
  try {
    return crypto.verify(null, pae(COUNTERSIGN_PAYLOAD_TYPE, payloadBytes), publicKey, signatureBytes);
  } catch (_) {
    return false;
  }
}

function verifyDispositionSignature(statement, payloadBytes, signatureBytes, publicKey) {
  try {
    return crypto.verify(null, pae(DISPOSITION_PAYLOAD_TYPE, payloadBytes), publicKey, signatureBytes);
  } catch (_) {
    return false;
  }
}

function resolveAuthority(authorityRegistryPath, keyId, actorId) {
  const loaded = loadAuthorityRegistry(authorityRegistryPath);
  if (!loaded.ok) return { ok: false, reason: 'AUTHORITY_REGISTRY_UNAVAILABLE' };
  const authority = loaded.registry.authorities.find((entry) => entry && entry.keyId === keyId);
  if (!authority) return { ok: false, reason: 'UNKNOWN_AUTHORITY' };
  if (authority.status === 'REVOKED') return { ok: false, reason: 'REVOKED_AUTHORITY' };
  if (authority.status === 'COMPROMISED') return { ok: false, reason: 'COMPROMISED_KEY' };
  if (authority.status === 'EXPIRED') return { ok: false, reason: 'EXPIRED_AUTHORITY' };
  if (authority.status !== 'TRUSTED') return { ok: false, reason: 'UNKNOWN_AUTHORITY' };
  if (!Array.isArray(authority.roles) || !authority.roles.includes('HUMAN_AUTHORITY')) {
    return { ok: false, reason: 'ROLE_MISMATCH' };
  }
  if (authority.actorId !== actorId) return { ok: false, reason: 'ACTOR_MISMATCH' };
  return { ok: true, authority, registry: loaded.registry, sha256: hashCanonical(loaded.registry) };
}

function parseLogStrict(text, schema) {
  if (text === null || text.trim() === '') return { ok: true, entries: [] };
  const lines = text.split('\n').filter((line) => line.trim() !== '');
  const entries = [];
  for (const line of lines) {
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

function verifyConsumptionChain(entries) {
  let previous = GENESIS_HASH;
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    if (sameKeys(entry, ['baselineDigest', 'clockHighWaterMark', 'consumedAt', 'entryHash', 'keyId', 'nonce', 'operationId', 'prevEntryHash', 'registryId', 'registryRevision', 'schema', 'seq', 'statementSha256']) === false) {
      return { ok: false, reason: 'CONSUMPTION_ENTRY_KEYS' };
    }
    if (entry.seq !== i + 1) return { ok: false, reason: 'CONSUMPTION_SEQUENCE' };
    if (entry.prevEntryHash !== previous) return { ok: false, reason: 'CONSUMPTION_CHAIN_BROKEN' };
    const { entryHash, ...rest } = entry;
    if (hashCanonical(rest) !== entryHash) return { ok: false, reason: 'CONSUMPTION_HASH_MISMATCH' };
    previous = entry.entryHash;
  }
  return { ok: true, head: previous };
}

function verifyDispositionChain(entries) {
  let previous = GENESIS_HASH;
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    if (sameKeys(entry, ['envelope', 'envelopeSha256', 'entryHash', 'prevEntryHash', 'schema', 'seq']) === false) {
      return { ok: false, reason: 'DISPOSITION_ENTRY_KEYS' };
    }
    if (entry.seq !== i + 1) return { ok: false, reason: 'DISPOSITION_SEQUENCE' };
    if (entry.prevEntryHash !== previous) return { ok: false, reason: 'DISPOSITION_CHAIN_BROKEN' };
    if (hashCanonical(entry.envelope) !== entry.envelopeSha256) return { ok: false, reason: 'DISPOSITION_ENVELOPE_HASH' };
    const { entryHash, ...rest } = entry;
    if (hashCanonical(rest) !== entryHash) return { ok: false, reason: 'DISPOSITION_HASH_MISMATCH' };
    previous = entry.entryHash;
  }
  return { ok: true, head: previous };
}

function readState(targetRoot, options = {}) {
  const dir = stateDir(targetRoot);
  assertContained(targetRoot, dir);
  const names = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  const markerNames = names.filter((n) => MARKER_NAME_RE.test(n)).sort();
  const dispMarkerNames = names.filter((n) => DISP_MARKER_NAME_RE.test(n)).sort();
  const markers = [];
  for (const name of markerNames) {
    let parsed;
    try {
      parsed = JSON.parse(safeReadText(targetRoot, path.join(dir, name)));
    } catch (error) {
      if (error && error.code === 'PATH_NOT_CONTAINED') throw error;
      return { ok: false, reason: 'PARTIAL_CONSUMPTION_MARKER_UNWRITTEN' };
    }
    if (!sameKeys(parsed, ['baselineDigest', 'clockHighWaterMark', 'consumedAt', 'keyId', 'nonce', 'operationId', 'registryId', 'registryRevision', 'schema', 'statementSha256'])) {
      return { ok: false, reason: 'PARTIAL_CONSUMPTION_MARKER_MALFORMED' };
    }
    if (parsed.schema !== SCHEMA_MARKER) return { ok: false, reason: 'PARTIAL_CONSUMPTION_MARKER_MALFORMED' };
    if (name !== markerNameOf(parsed.registryId, parsed.registryRevision, parsed.keyId, parsed.nonce)) {
      return { ok: false, reason: 'PARTIAL_CONSUMPTION_MARKER_UNBOUND' };
    }
    markers.push({ name, content: parsed });
  }
  const dispMarkers = [];
  for (const name of dispMarkerNames) {
    let parsed;
    try {
      parsed = JSON.parse(safeReadText(targetRoot, path.join(dir, name)));
    } catch (error) {
      if (error && error.code === 'PATH_NOT_CONTAINED') throw error;
      return { ok: false, reason: 'PARTIAL_DISPOSITION_MARKER_UNWRITTEN' };
    }
    if (!sameKeys(parsed, ['envelopeSha256', 'schema', 'statement']) || parsed.schema !== SCHEMA_DISP_MARKER) {
      return { ok: false, reason: 'PARTIAL_DISPOSITION_MARKER_MALFORMED' };
    }
    dispMarkers.push({ name, content: parsed });
  }

  const consumptionRead = parseLogStrict(safeReadText(targetRoot, consumptionLogPath(targetRoot)), SCHEMA_CONSUMPTION);
  if (!consumptionRead.ok) return { ok: false, reason: 'CONSUMPTION_CHAIN_INVALID' };
  const chain = verifyConsumptionChain(consumptionRead.entries);
  if (!chain.ok) return { ok: false, reason: chain.reason };

  const dispositionRead = parseLogStrict(safeReadText(targetRoot, dispositionLogPath(targetRoot)), SCHEMA_DISPOSITION);
  if (!dispositionRead.ok) return { ok: false, reason: 'DISPOSITION_CHAIN_INVALID' };
  const dispositionChain = verifyDispositionChain(dispositionRead.entries);
  if (!dispositionChain.ok) return { ok: false, reason: dispositionChain.reason };

  const markerByOperation = new Map(markers.map((m) => [m.content.operationId, m]));
  const entryByOperation = new Map();
  for (const entry of consumptionRead.entries) {
    if (entryByOperation.has(entry.operationId)) {
      return { ok: false, reason: 'CONSUMPTION_DUPLICATE_OPERATION' };
    }
    entryByOperation.set(entry.operationId, entry);
  }
  const repairablePartials = [];
  for (const marker of markers) {
    const entry = entryByOperation.get(marker.content.operationId);
    if (!entry) {
      if (options.allowRepairableConsumptionPartial !== true) {
        return { ok: false, reason: 'PARTIAL_CONSUMPTION_MARKER_WITHOUT_LOG' };
      }
      repairablePartials.push(marker);
      continue;
    }
    for (const field of ['baselineDigest', 'clockHighWaterMark', 'consumedAt', 'keyId', 'nonce', 'registryId', 'registryRevision', 'statementSha256']) {
      if (entry[field] !== marker.content[field]) return { ok: false, reason: 'CONSUMPTION_MARKER_LOG_MISMATCH' };
    }
  }
  for (const entry of consumptionRead.entries) {
    if (!markerByOperation.has(entry.operationId)) {
      return { ok: false, reason: 'PARTIAL_CONSUMPTION_LOG_WITHOUT_MARKER' };
    }
  }

  const dispositionByMarker = new Map();
  const invalidatedRevisions = new Set();
  for (const entry of dispositionRead.entries) {
    let statement = null;
    try {
      statement = JSON.parse(Buffer.from(entry.envelope.payload, 'base64').toString('utf8'));
    } catch (_) {
      return { ok: false, reason: 'DISPOSITION_CHAIN_INVALID' };
    }
    const name = dispositionMarkerNameOf(statement.registryId, statement.registryRevision, statement.signer.keyId, statement.nonce);
    if (dispositionByMarker.has(name)) {
      return { ok: false, reason: 'DISPOSITION_DUPLICATE_OPERATION' };
    }
    dispositionByMarker.set(name, entry);
    if (statement.action === 'INVALIDATE') invalidatedRevisions.add(statement.registryRevision);
  }
  for (const marker of dispMarkers) {
    const expected = dispositionMarkerNameOf(
      marker.content.statement.registryId,
      marker.content.statement.registryRevision,
      marker.content.statement.signer.keyId,
      marker.content.statement.nonce
    );
    if (marker.name !== expected) return { ok: false, reason: 'PARTIAL_DISPOSITION_MARKER_UNBOUND' };
    if (!dispositionByMarker.has(marker.name)) {
      return { ok: false, reason: 'PARTIAL_DISPOSITION_MARKER_WITHOUT_LOG' };
    }
  }
  for (const name of dispositionByMarker.keys()) {
    if (!dispMarkers.some((m) => m.name === name)) {
      return { ok: false, reason: 'PARTIAL_DISPOSITION_LOG_WITHOUT_MARKER' };
    }
  }

  const entries = consumptionRead.entries;
  const tailEntryHash = entries.length > 0 ? entries[entries.length - 1].entryHash : GENESIS_HASH;
  const hwm = entries.length > 0 ? entries[entries.length - 1].clockHighWaterMark : null;
  const markerSetHash = hashCanonical(markerNames);
  return {
    ok: true,
    entries,
    markers,
    repairablePartials,
    dispMarkers,
    dispositionEntries: dispositionRead.entries,
    invalidatedRevisions: [...invalidatedRevisions].sort(),
    tailSeq: entries.length,
    tailEntryHash,
    hwm,
    markerSetHash,
    logLength: entries.length,
    dispositionHead: dispositionChain.head,
    dispositionLength: dispositionRead.entries.length,
    dispMarkerSetHash: hashCanonical(dispMarkerNames)
  };
}

function stateDigestOf(state) {
  return hashCanonical({
    domain: 'countersign-state/v1',
    tailSeq: state.tailSeq,
    tailEntryHash: state.tailEntryHash,
    hwm: state.hwm,
    markerSetHash: state.markerSetHash,
    logLength: state.logLength
  });
}

function dispositionStateDigestOf(state) {
  return hashCanonical({
    domain: 'countersign-disposition-state/v1',
    length: state.dispositionLength,
    head: state.dispositionHead,
    markerSetHash: state.dispMarkerSetHash,
    invalidatedRevisions: state.invalidatedRevisions
  });
}

function authorizationDigestOf({ registryObject, envelopeSha256, statementSha256, signerActorId, signerKeyId, authorityRegistrySha256, crl, haltState, dispositionStateDigest }) {
  return hashCanonical({
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
  return hashCanonical({
    domain: 'countersign-baseline/v2',
    baselineSchemaVersion: '1.0.0',
    operationId,
    authorizationDigest,
    stateDigest
  });
}

function validateCountersignStatement({ statement, registryObject, now }) {
  if (sameKeys(statement, STATEMENT_KEYS) === false) {
    return { ok: false, status: STATUS.COUNTERSIGN_MALFORMED, reason: 'STATEMENT_KEYS' };
  }
  if (!sameKeys(statement.signer, ['actorId', 'keyId'])) {
    return { ok: false, status: STATUS.COUNTERSIGN_MALFORMED, reason: 'SIGNER_KEYS' };
  }
  if (statement.schemaVersion !== '1.0.0') {
    return { ok: false, status: STATUS.COUNTERSIGN_MALFORMED, reason: 'SCHEMA_VERSION' };
  }
  if (statement.registryId !== registryObject.registryId || statement.registryRevision !== registryObject.registryRevision) {
    return { ok: false, status: STATUS.COUNTERSIGN_SCOPE_MISMATCH, reason: 'REGISTRY_BINDING' };
  }
  if (statement.designVersion !== registryObject.designVersion) {
    return { ok: false, status: STATUS.COUNTERSIGN_SCOPE_MISMATCH, reason: 'DESIGN_VERSION' };
  }
  if (statement.registrySha256 !== REGISTRY_SHA256) {
    return { ok: false, status: STATUS.COUNTERSIGN_SCOPE_MISMATCH, reason: 'REGISTRY_SHA_MISMATCH' };
  }
  if (!Array.isArray(statement.scope)
      || statement.scope.length !== REGISTRY_SCOPE.length
      || statement.scope.some((id, i) => id !== REGISTRY_SCOPE[i])) {
    return { ok: false, status: STATUS.COUNTERSIGN_SCOPE_MISMATCH, reason: 'SCOPE_MISMATCH' };
  }
  if (typeof statement.signer.actorId !== 'string' || statement.signer.actorId.trim() === '') {
    return { ok: false, status: STATUS.COUNTERSIGN_MALFORMED, reason: 'ACTOR_ID' };
  }
  if (!/^ed25519:[a-f0-9]{64}$/.test(statement.signer.keyId)) {
    return { ok: false, status: STATUS.COUNTERSIGN_MALFORMED, reason: 'KEY_ID' };
  }
  const issuedAt = Date.parse(statement.issuedAt);
  const expiresAt = Date.parse(statement.expiresAt);
  const current = now.getTime();
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt) || !Number.isFinite(current)) {
    return { ok: false, status: STATUS.COUNTERSIGN_MALFORMED, reason: 'TIMESTAMPS' };
  }
  const ttl = expiresAt - issuedAt;
  if (ttl <= 0 || ttl > MAX_COUNTERSIGN_TTL_MS) {
    return { ok: false, status: STATUS.COUNTERSIGN_MALFORMED, reason: 'TTL_EXCEEDED' };
  }
  if (issuedAt > current + CLOCK_SKEW_MS || current >= expiresAt) {
    return { ok: false, status: STATUS.COUNTERSIGN_EXPIRED, reason: 'OUT_OF_WINDOW' };
  }
  if (!/^[A-Za-z0-9_-]{32,}$/.test(statement.nonce)) {
    return { ok: false, status: STATUS.COUNTERSIGN_MALFORMED, reason: 'NONCE' };
  }
  return { ok: true, issuedAt, expiresAt };
}

function verifyCountersignature({ envelope, registryPath, authorityRegistryPath, targetRoot, options }) {
  const now = nowOf(options);
  const registryRead = readRegistry(registryPath);
  if (!registryRead.ok) {
    return { status: STATUS.COUNTERSIGN_SCOPE_MISMATCH, reason: registryRead.reason };
  }
  const parsed = parseEnvelopeStrict(envelope, COUNTERSIGN_PAYLOAD_TYPE);
  if (!parsed.ok) {
    return { status: STATUS.COUNTERSIGN_MALFORMED, reason: parsed.reason };
  }
  const statementResult = validateCountersignStatement({ statement: parsed.statement, registryObject: registryRead.registry, now });
  if (!statementResult.ok) {
    return { status: statementResult.status, reason: statementResult.reason };
  }
  if (parsed.signature.keyid !== parsed.statement.signer.keyId) {
    return { status: STATUS.COUNTERSIGN_MALFORMED, reason: 'KEYID_MISMATCH' };
  }
  const authorityResult = resolveAuthority(authorityRegistryPath, parsed.statement.signer.keyId, parsed.statement.signer.actorId);
  if (!authorityResult.ok) {
    const status = authorityResult.reason === 'REVOKED_AUTHORITY' || authorityResult.reason === 'COMPROMISED_KEY'
      ? STATUS.COUNTERSIGN_REVOKED
      : STATUS.COUNTERSIGN_UNKNOWN_AUTHORITY;
    return { status, reason: authorityResult.reason };
  }
  if (!Number.isFinite(Date.parse(authorityResult.authority.expiresAt)) || now.getTime() >= Date.parse(authorityResult.authority.expiresAt)) {
    return { status: STATUS.COUNTERSIGN_EXPIRED, reason: 'AUTHORITY_EXPIRED' };
  }
  const publicKey = crypto.createPublicKey(authorityResult.authority.publicKeyPem);
  if (!verifyStatementSignature(parsed.statement, parsed.payloadBytes, parsed.signatureBytes, publicKey)) {
    return { status: STATUS.COUNTERSIGN_INVALID_SIGNATURE, reason: 'SIGNATURE_INVALID' };
  }
  let crl;
  try {
    crl = readCrl(targetRoot);
  } catch (error) {
    if (error && error.code === 'PATH_NOT_CONTAINED') return containmentResult(STATUS.COUNTERSIGN_STATE_UNAVAILABLE, error);
    throw error;
  }
  if (crl.state === 'UNREADABLE') {
    return { status: STATUS.COUNTERSIGN_STATE_UNAVAILABLE, reason: 'CRL_UNREADABLE' };
  }
  if (crl.revokedKeyIds.includes(parsed.statement.signer.keyId)) {
    return { status: STATUS.COUNTERSIGN_REVOKED, reason: 'CRL_REVOKED' };
  }
  let haltState;
  try {
    haltState = readHalt(targetRoot);
  } catch (error) {
    if (error && error.code === 'PATH_NOT_CONTAINED') return containmentResult(STATUS.COUNTERSIGN_STATE_UNAVAILABLE, error);
    throw error;
  }
  if (haltState !== HALT_STATUS.RUNNING) {
    return { status: STATUS.COUNTERSIGN_HALTED, reason: haltState };
  }
  const operationId = operationIdOf(
    parsed.statement.registryId,
    parsed.statement.registryRevision,
    parsed.statement.signer.keyId,
    parsed.statement.nonce
  );
  return {
    status: STATUS.COUNTERSIGN_VALID,
    operationId,
    statement: parsed.statement,
    statementSha256: hashCanonical(parsed.statement),
    envelopeSha256: hashCanonical(envelope),
    keyId: parsed.statement.signer.keyId,
    actorId: parsed.statement.signer.actorId,
    authorityRegistrySha256: authorityResult.sha256,
    crl,
    haltState,
    registryObject: registryRead.registry
  };
}

function writeMarkerExclusive(targetRoot, file, content) {
  return safeCreateExclusive(targetRoot, file, `${canonicalize(content)}\n`);
}

function appendChainedEntry(targetRoot, file, payload) {
  const text = safeReadText(targetRoot, file);
  const previous = text === null ? { ok: true, entries: [] } : parseLogStrict(text, payload.schema);
  if (!previous.ok) return { ok: false, code: 'CHAIN_INVALID' };
  const seq = previous.entries.length + 1;
  const prevEntryHash = previous.entries.length > 0 ? previous.entries[previous.entries.length - 1].entryHash : GENESIS_HASH;
  const entry = { ...payload, seq, prevEntryHash };
  entry.entryHash = hashCanonical(entry);
  try {
    safeAppendText(targetRoot, file, `${canonicalize(entry)}\n`);
    return { ok: true, entry };
  } catch (error) {
    return { ok: false, code: 'APPEND_FAILED', error };
  }
}

function maybeFault(options, point) {
  if (!options || !options.faultInjection) return;
  if (options.faultInjection !== point) return;
  if (point === 'after-marker-write-kill') {
    process.kill(process.pid, 'SIGKILL');
    return;
  }
  const error = new Error(`FAULT_INJECTED:${point}`);
  error.code = 'FAULT_INJECTED';
  throw error;
}

function readPreReport(targetRoot, operationId, options) {
  const explicit = options && options.preReportPath;
  const file = explicit || path.join(reportsDir(targetRoot), `v2-pre-${operationId}.json`);
  if (lstatOrNull(file) === null) return { ok: false, reason: 'V2_PRE_REPORT_MISSING', file };
  try {
    assertContained(targetRoot, file);
  } catch (error) {
    if (error && error.code === 'PATH_NOT_CONTAINED') return { ok: false, reason: 'PATH_NOT_CONTAINED', file };
    throw error;
  }
  let parsed;
  try {
    parsed = readJsonStrict(file);
  } catch (_) {
    return { ok: false, reason: 'V2_PRE_REPORT_UNREADABLE', file };
  }
  if (!sameKeys(parsed, ['authorizationDigest', 'baselineDigest', 'envelopeSha256', 'operationId', 'phase', 'registry', 'schema', 'signer', 'snapshot', 'statementSha256', 'verifiedAt', 'verifier'])) {
    return { ok: false, reason: 'V2_PRE_REPORT_MALFORMED', file };
  }
  if (parsed.schema !== 'axion.countersign-v2-pre/v1' || parsed.phase !== 'pre' || parsed.verifier !== 'V2') {
    return { ok: false, reason: 'V2_PRE_REPORT_MALFORMED', file };
  }
  if (parsed.operationId !== operationId) {
    return { ok: false, reason: 'V2_PRE_REPORT_BINDING', file };
  }
  return { ok: true, report: parsed, file };
}

function consumeCountersignature({ targetRoot, envelope, registryPath, authorityRegistryPath, options }) {
  const now = nowOf(options);
  const verification = verifyCountersignature({ envelope, registryPath, authorityRegistryPath, targetRoot, options });
  if (verification.status !== STATUS.COUNTERSIGN_VALID) return verification;
  const operationId = verification.operationId;
  let dir;
  try {
    dir = ensureContainedDirectory(targetRoot, STATE_PARTS);
  } catch (error) {
    return error && error.code === 'PATH_NOT_CONTAINED'
      ? containmentResult(STATUS.COUNTERSIGN_STATE_UNAVAILABLE, error)
      : { status: STATUS.COUNTERSIGN_STATE_UNAVAILABLE, reason: 'STATE_DIRECTORY_FAILED' };
  }
  let lock;
  try {
    lock = FileLock.acquire(lockPath(targetRoot), {
      timeoutMs: options && Number.isFinite(options.lockTimeoutMs) ? options.lockTimeoutMs : 10000,
      staleMs: options && Number.isFinite(options.lockStaleMs) ? options.lockStaleMs : 30000,
      code: 'ERR_COUNTERSIGN_LOCKED'
    });
  } catch (error) {
    return { status: STATUS.COUNTERSIGN_STATE_UNAVAILABLE, reason: 'LOCK_BUSY', detail: error && error.message };
  }
  try {
    const state = readState(targetRoot);
    if (!state.ok) {
      return { status: STATUS.COUNTERSIGN_STATE_UNAVAILABLE, reason: state.reason };
    }
    if (state.invalidatedRevisions.includes(verification.statement.registryRevision)) {
      return { status: STATUS.COUNTERSIGN_REVISION_INVALIDATED, reason: 'REVISION_INVALIDATED' };
    }
    const markerPath = path.join(dir, markerNameOf(
      verification.statement.registryId,
      verification.statement.registryRevision,
      verification.statement.signer.keyId,
      verification.statement.nonce
    ));
    if (fs.existsSync(markerPath)) {
      return { status: STATUS.COUNTERSIGN_REPLAYED, reason: 'MARKER_EXISTS' };
    }
    const preReport = readPreReport(targetRoot, operationId, options);
    if (!preReport.ok) {
      return { status: STATUS.COUNTERSIGN_BASELINE_REQUIRED, reason: preReport.reason, file: preReport.file };
    }
    const stateDigest = stateDigestOf(state);
    const dispositionStateDigest = dispositionStateDigestOf(state);
    const authorizationDigest = authorizationDigestOf({
      registryObject: verification.registryObject,
      envelopeSha256: verification.envelopeSha256,
      statementSha256: verification.statementSha256,
      signerActorId: verification.actorId,
      signerKeyId: verification.keyId,
      authorityRegistrySha256: verification.authorityRegistrySha256,
      crl: verification.crl,
      haltState: verification.haltState,
      dispositionStateDigest
    });
    if (preReport.report.authorizationDigest !== authorizationDigest) {
      return { status: STATUS.COUNTERSIGN_AUTHORIZATION_CHANGED, reason: 'AUTHORIZATION_CHANGED' };
    }
    if (preReport.report.envelopeSha256 !== verification.envelopeSha256
        || preReport.report.statementSha256 !== verification.statementSha256) {
      return { status: STATUS.COUNTERSIGN_BASELINE_MISMATCH, reason: 'ENVELOPE_BINDING' };
    }
    if (preReport.report.snapshot && preReport.report.snapshot.stateDigest !== stateDigest) {
      return { status: STATUS.COUNTERSIGN_BASELINE_MISMATCH, reason: 'STATE_CHANGED' };
    }
    const expectedBaselineDigest = baselineDigestOf(operationId, authorizationDigest, stateDigest);
    if (preReport.report.baselineDigest !== expectedBaselineDigest) {
      return { status: STATUS.COUNTERSIGN_BASELINE_MISMATCH, reason: 'BASELINE_DIGEST' };
    }
    const previousHwm = state.hwm;
    if (previousHwm !== null) {
      const previousMs = Date.parse(previousHwm);
      if (!Number.isFinite(previousMs)) {
        return { status: STATUS.COUNTERSIGN_STATE_UNAVAILABLE, reason: 'HWM_UNREADABLE' };
      }
      if (now.getTime() + CLOCK_SKEW_MS < previousMs) {
        return { status: STATUS.COUNTERSIGN_CLOCK_UNTRUSTED, reason: 'CLOCK_REGRESSION' };
      }
    }
    const consumedAt = now.toISOString();
    const highWaterMark = previousHwm !== null && Date.parse(previousHwm) > Date.parse(consumedAt)
      ? previousHwm
      : consumedAt;
    const baselineDigest = baselineDigestOf(operationId, authorizationDigest, stateDigest);
    const markerContent = {
      schema: SCHEMA_MARKER,
      operationId,
      baselineDigest,
      registryId: verification.statement.registryId,
      registryRevision: verification.statement.registryRevision,
      keyId: verification.keyId,
      nonce: verification.statement.nonce,
      statementSha256: verification.statementSha256,
      consumedAt,
      clockHighWaterMark: highWaterMark
    };
    const markerResult = writeMarkerExclusive(targetRoot, markerPath, markerContent);
    if (!markerResult.ok) {
      return markerResult.code === 'EXISTS'
        ? { status: STATUS.COUNTERSIGN_REPLAYED, reason: 'MARKER_RACE' }
        : { status: STATUS.COUNTERSIGN_STATE_UNAVAILABLE, reason: 'MARKER_WRITE_FAILED' };
    }
    maybeFault(options, 'after-marker-write');
    maybeFault(options, 'after-marker-write-kill');
    maybeFault(options, 'before-log-open');
    let appendResult;
    try {
      appendResult = appendChainedEntry(targetRoot, consumptionLogPath(targetRoot), {
        schema: SCHEMA_CONSUMPTION,
        operationId,
        baselineDigest,
        registryId: verification.statement.registryId,
        registryRevision: verification.statement.registryRevision,
        keyId: verification.keyId,
        nonce: verification.statement.nonce,
        statementSha256: verification.statementSha256,
        consumedAt,
        clockHighWaterMark: highWaterMark
      });
    } catch (error) {
      if (error && error.code === 'PATH_NOT_CONTAINED') return containmentResult(STATUS.COUNTERSIGN_STATE_UNAVAILABLE, error);
      throw error;
    }
    if (!appendResult.ok) {
      return { status: STATUS.COUNTERSIGN_STATE_UNAVAILABLE, reason: 'CONSUMPTION_LOG_APPEND_FAILED' };
    }
    maybeFault(options, 'after-log-write');
    const lockRead = FileLock.leerLock(lockPath(targetRoot));
    if (!lockRead || lockRead.token !== lock.token) {
      return { status: STATUS.COUNTERSIGN_STATE_UNAVAILABLE, reason: 'LOCK_LOST' };
    }
    maybeFault(options, 'before-valid-return');
    return {
      status: STATUS.COUNTERSIGN_VALID,
      operationId,
      baselineDigest,
      authorizationDigest,
      stateDigest,
      entry: appendResult.entry,
      highWaterMark,
      report: preReport.file
    };
  } catch (error) {
    if (error && error.code === 'PATH_NOT_CONTAINED') return containmentResult(STATUS.COUNTERSIGN_STATE_UNAVAILABLE, error);
    throw error;
  } finally {
    FileLock.release(lock.lockFile, lock.token);
  }
}

function validateDispositionStatement({ statement, registryObject, now }) {
  if (!DISPOSITION_ACTIONS.includes(statement.action)) {
    return { ok: false, status: STATUS.DISPOSITION_MALFORMED, reason: 'ACTION' };
  }
  const expectedKeys = statement.action === 'REPAIR' ? REPAIR_KEYS : INVALIDATE_KEYS;
  if (!sameKeys(statement, expectedKeys)) {
    return { ok: false, status: STATUS.DISPOSITION_MALFORMED, reason: 'STATEMENT_KEYS' };
  }
  if (!sameKeys(statement.signer, ['actorId', 'keyId'])) {
    return { ok: false, status: STATUS.DISPOSITION_MALFORMED, reason: 'SIGNER_KEYS' };
  }
  if (statement.schemaVersion !== '1.0.0') {
    return { ok: false, status: STATUS.DISPOSITION_MALFORMED, reason: 'SCHEMA_VERSION' };
  }
  if (statement.registryId !== registryObject.registryId || statement.registryRevision !== registryObject.registryRevision) {
    return { ok: false, status: STATUS.DISPOSITION_SCOPE_MISMATCH, reason: 'REGISTRY_BINDING' };
  }
  if (!/^AX-DISP-[0-9]{4,}$/.test(statement.dispositionId)) {
    return { ok: false, status: STATUS.DISPOSITION_MALFORMED, reason: 'DISPOSITION_ID' };
  }
  if (typeof statement.signer.actorId !== 'string' || statement.signer.actorId.trim() === '') {
    return { ok: false, status: STATUS.DISPOSITION_MALFORMED, reason: 'ACTOR_ID' };
  }
  if (!/^ed25519:[a-f0-9]{64}$/.test(statement.signer.keyId)) {
    return { ok: false, status: STATUS.DISPOSITION_MALFORMED, reason: 'KEY_ID' };
  }
  const issuedAt = Date.parse(statement.issuedAt);
  const expiresAt = Date.parse(statement.expiresAt);
  const current = now.getTime();
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt)) {
    return { ok: false, status: STATUS.DISPOSITION_MALFORMED, reason: 'TIMESTAMPS' };
  }
  const ttl = expiresAt - issuedAt;
  if (ttl <= 0 || ttl > MAX_DISPOSITION_TTL_MS) {
    return { ok: false, status: STATUS.DISPOSITION_MALFORMED, reason: 'TTL_EXCEEDED' };
  }
  if (issuedAt > current + CLOCK_SKEW_MS || current >= expiresAt) {
    return { ok: false, status: STATUS.DISPOSITION_EXPIRED, reason: 'OUT_OF_WINDOW' };
  }
  if (!/^[A-Za-z0-9_-]{32,}$/.test(statement.nonce)) {
    return { ok: false, status: STATUS.DISPOSITION_MALFORMED, reason: 'NONCE' };
  }
  if (statement.action === 'REPAIR') {
    if (!statement.targetHead || typeof statement.targetHead !== 'object'
        || !sameKeys(statement.targetHead, ['entryHash', 'seq'])
        || !Number.isInteger(statement.targetHead.seq) || statement.targetHead.seq < 0
        || !/^[a-f0-9]{64}$/.test(statement.targetHead.entryHash)) {
      return { ok: false, status: STATUS.DISPOSITION_MALFORMED, reason: 'TARGET_HEAD' };
    }
    if (!/^[a-f0-9]{64}$/.test(statement.markerFileNameHash) || !/^[a-f0-9]{64}$/.test(statement.markerContentSha256)) {
      return { ok: false, status: STATUS.DISPOSITION_MALFORMED, reason: 'MARKER_BINDING' };
    }
  } else {
    if (!Number.isInteger(statement.newRegistryRevision) || statement.newRegistryRevision <= registryObject.registryRevision) {
      return { ok: false, status: STATUS.DISPOSITION_MALFORMED, reason: 'NEW_REVISION' };
    }
    if (statement.markerFileNameHash !== null || statement.markerContentSha256 !== null) {
      return { ok: false, status: STATUS.DISPOSITION_MALFORMED, reason: 'MARKER_BINDING' };
    }
  }
  if (statement.markerFileNameHash !== null && !/^[a-f0-9]{64}$/.test(statement.markerFileNameHash)) {
    return { ok: false, status: STATUS.DISPOSITION_MALFORMED, reason: 'MARKER_BINDING' };
  }
  if (statement.markerContentSha256 !== null && !/^[a-f0-9]{64}$/.test(statement.markerContentSha256)) {
    return { ok: false, status: STATUS.DISPOSITION_MALFORMED, reason: 'MARKER_BINDING' };
  }
  if (!/^[a-f0-9]{64}$/.test(statement.statementSha256)) {
    return { ok: false, status: STATUS.DISPOSITION_MALFORMED, reason: 'STATEMENT_BINDING' };
  }
  return { ok: true };
}

function applyDisposition({ targetRoot, envelope, registryPath, authorityRegistryPath, options }) {
  const now = nowOf(options);
  const registryRead = readRegistry(registryPath);
  if (!registryRead.ok) {
    return { status: STATUS.DISPOSITION_SCOPE_MISMATCH, reason: registryRead.reason };
  }
  const parsed = parseEnvelopeStrict(envelope, DISPOSITION_PAYLOAD_TYPE);
  if (!parsed.ok) {
    return { status: STATUS.DISPOSITION_MALFORMED, reason: parsed.reason };
  }
  const statementResult = validateDispositionStatement({ statement: parsed.statement, registryObject: registryRead.registry, now });
  if (!statementResult.ok) {
    return { status: statementResult.status, reason: statementResult.reason };
  }
  if (parsed.signature.keyid !== parsed.statement.signer.keyId) {
    return { status: STATUS.DISPOSITION_MALFORMED, reason: 'KEYID_MISMATCH' };
  }
  const authorityResult = resolveAuthority(authorityRegistryPath, parsed.statement.signer.keyId, parsed.statement.signer.actorId);
  if (!authorityResult.ok) {
    return { status: STATUS.DISPOSITION_UNKNOWN_AUTHORITY, reason: authorityResult.reason };
  }
  const publicKey = crypto.createPublicKey(authorityResult.authority.publicKeyPem);
  if (!verifyDispositionSignature(parsed.statement, parsed.payloadBytes, parsed.signatureBytes, publicKey)) {
    return { status: STATUS.DISPOSITION_INVALID_SIGNATURE, reason: 'SIGNATURE_INVALID' };
  }
  let haltState;
  try {
    haltState = readHalt(targetRoot);
  } catch (error) {
    if (error && error.code === 'PATH_NOT_CONTAINED') return containmentResult(STATUS.DISPOSITION_UNAVAILABLE, error);
    throw error;
  }
  if (haltState !== HALT_STATUS.RUNNING) {
    return { status: STATUS.DISPOSITION_UNAVAILABLE, reason: haltState };
  }
  let dir;
  try {
    dir = ensureContainedDirectory(targetRoot, STATE_PARTS);
  } catch (error) {
    return error && error.code === 'PATH_NOT_CONTAINED'
      ? containmentResult(STATUS.DISPOSITION_UNAVAILABLE, error)
      : { status: STATUS.DISPOSITION_UNAVAILABLE, reason: 'STATE_DIRECTORY_FAILED' };
  }
  let lock;
  try {
    lock = FileLock.acquire(lockPath(targetRoot), {
      timeoutMs: options && Number.isFinite(options.lockTimeoutMs) ? options.lockTimeoutMs : 10000,
      staleMs: options && Number.isFinite(options.lockStaleMs) ? options.lockStaleMs : 30000,
      code: 'ERR_COUNTERSIGN_LOCKED'
    });
  } catch (error) {
    return { status: STATUS.DISPOSITION_UNAVAILABLE, reason: 'LOCK_BUSY', detail: error && error.message };
  }
  try {
    const state = readState(targetRoot, { allowRepairableConsumptionPartial: true });
    if (!state.ok) {
      return { status: STATUS.DISPOSITION_UNAVAILABLE, reason: state.reason };
    }
    const dispMarkerPath = path.join(dir, dispositionMarkerNameOf(
      parsed.statement.registryId,
      parsed.statement.registryRevision,
      parsed.statement.signer.keyId,
      parsed.statement.nonce
    ));
    if (fs.existsSync(dispMarkerPath)) {
      return { status: STATUS.DISPOSITION_REPLAYED, reason: 'MARKER_EXISTS' };
    }
    if (parsed.statement.action === 'REPAIR') {
      const markerFileName = `${parsed.statement.markerFileNameHash}.used`;
      const partials = state.repairablePartials;
      if (partials.length !== 1 || partials[0].name !== markerFileName) {
        return { status: STATUS.DISPOSITION_SCOPE_MISMATCH, reason: 'REPAIR_TARGET' };
      }
      const marker = partials[0];
      if (hashCanonical(marker.content) !== parsed.statement.markerContentSha256) {
        return { status: STATUS.DISPOSITION_SCOPE_MISMATCH, reason: 'REPAIR_MARKER_HASH' };
      }
      if (marker.content.statementSha256 !== parsed.statement.statementSha256) {
        return { status: STATUS.DISPOSITION_SCOPE_MISMATCH, reason: 'REPAIR_STATEMENT' };
      }
      if (state.tailSeq !== parsed.statement.targetHead.seq || state.tailEntryHash !== parsed.statement.targetHead.entryHash) {
        return { status: STATUS.DISPOSITION_SCOPE_MISMATCH, reason: 'REPAIR_HEAD' };
      }
    }
    const markerContent = {
      schema: SCHEMA_DISP_MARKER,
      statement: parsed.statement,
      envelopeSha256: hashCanonical(envelope)
    };
    const markerResult = writeMarkerExclusive(targetRoot, dispMarkerPath, markerContent);
    if (!markerResult.ok) {
      return markerResult.code === 'EXISTS'
        ? { status: STATUS.DISPOSITION_REPLAYED, reason: 'MARKER_RACE' }
        : { status: STATUS.DISPOSITION_UNAVAILABLE, reason: 'MARKER_WRITE_FAILED' };
    }
    if (parsed.statement.action === 'REPAIR') {
      const marker = state.markers.find((m) => m.name === `${parsed.statement.markerFileNameHash}.used`);
      const appendResult = appendChainedEntry(targetRoot, consumptionLogPath(targetRoot), {
        schema: SCHEMA_CONSUMPTION,
        operationId: marker.content.operationId,
        baselineDigest: marker.content.baselineDigest,
        registryId: marker.content.registryId,
        registryRevision: marker.content.registryRevision,
        keyId: marker.content.keyId,
        nonce: marker.content.nonce,
        statementSha256: marker.content.statementSha256,
        consumedAt: marker.content.consumedAt,
        clockHighWaterMark: marker.content.clockHighWaterMark
      });
      if (!appendResult.ok) {
        return { status: STATUS.DISPOSITION_UNAVAILABLE, reason: 'REPAIR_APPEND_FAILED' };
      }
    }
    const dispositionAppend = appendChainedEntry(targetRoot, dispositionLogPath(targetRoot), {
      schema: SCHEMA_DISPOSITION,
      envelope,
      envelopeSha256: hashCanonical(envelope)
    });
    if (!dispositionAppend.ok) {
      return { status: STATUS.DISPOSITION_UNAVAILABLE, reason: 'DISPOSITION_LOG_APPEND_FAILED' };
    }
    const lockRead = FileLock.leerLock(lockPath(targetRoot));
    if (!lockRead || lockRead.token !== lock.token) {
      return { status: STATUS.DISPOSITION_UNAVAILABLE, reason: 'LOCK_LOST' };
    }
    return {
      status: STATUS.DISPOSITION_VALID,
      action: parsed.statement.action,
      dispositionId: parsed.statement.dispositionId,
      entry: dispositionAppend.entry
    };
  } catch (error) {
    if (error && error.code === 'PATH_NOT_CONTAINED') return containmentResult(STATUS.DISPOSITION_UNAVAILABLE, error);
    throw error;
  } finally {
    FileLock.release(lock.lockFile, lock.token);
  }
}

function parseOptions(args) {
  const options = { positional: [] };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = args[i + 1];
      if (value === undefined || value.startsWith('--')) {
        return { ok: false, reason: `FALTA_VALOR:${key}` };
      }
      options[key] = value;
      i += 1;
    } else {
      options.positional.push(arg);
    }
  }
  return { ok: true, options };
}

function requiredPaths(options) {
  const missing = [];
  for (const key of ['envelope', 'registry', 'authorities']) {
    if (!options[key]) missing.push(key);
  }
  return missing;
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
  const missing = requiredPaths(options);
  if (missing.length > 0) {
    console.log(USO);
    process.exit(2);
  }
  const targetRoot = options.target ? path.resolve(options.target) : path.resolve(__dirname, '..');
  let envelope;
  try {
    envelope = readJsonStrict(options.envelope);
  } catch (error) {
    console.log(JSON.stringify({ status: 'COUNTERSIGN_MALFORMED', reason: 'ENVELOPE_UNREADABLE', detail: error.message }, null, 2));
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
      lockTimeoutMs: options['lock-timeout'] ? Number(options['lock-timeout']) : undefined,
      lockStaleMs: options['lock-stale'] ? Number(options['lock-stale']) : undefined
    }
  };
  let result;
  try {
    if (command === 'verify') {
      result = verifyCountersignature(base);
    } else if (command === 'consume') {
      result = consumeCountersignature(base);
    } else if (command === 'dispose') {
      result = applyDisposition(base);
    } else {
      console.log(USO);
      process.exit(2);
      return;
    }
  } catch (error) {
    result = { status: STATUS.COUNTERSIGN_STATE_UNAVAILABLE, reason: error && error.code === 'FAULT_INJECTED' ? 'FAULT_INJECTED' : 'UNEXPECTED_ERROR', detail: error && error.message };
  }
  console.log(JSON.stringify(result, null, 2));
  const ok = result.status === STATUS.COUNTERSIGN_VALID || result.status === STATUS.DISPOSITION_VALID;
  process.exitCode = ok ? 0 : 1;
}

if (require.main === module) main();

module.exports = {
  STATUS,
  REGISTRY_ID,
  REGISTRY_REVISION,
  REGISTRY_SHA256,
  REGISTRY_SCOPE,
  COUNTERSIGN_PAYLOAD_TYPE,
  DISPOSITION_PAYLOAD_TYPE,
  stateDir,
  reportsDir,
  operationIdOf,
  markerNameOf,
  dispositionMarkerNameOf,
  readRegistry,
  readState,
  stateDigestOf,
  dispositionStateDigestOf,
  authorizationDigestOf,
  baselineDigestOf,
  parseEnvelopeStrict,
  verifyCountersignature,
  consumeCountersignature,
  validateDispositionStatement,
  applyDisposition,
  assertContained,
  ensureContainedDirectory,
  USO
};
