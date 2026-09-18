'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..', '..');
const REGISTRY_FIXTURE = path.join(__dirname, 'registry-rev3.json');
const { canonicalize, hashCanonical } = require(path.join(ROOT, 'tools', 'canonical_json.js'));
const { signEnvelope } = require(path.join(ROOT, 'tools', 'dsse.js'));

const COUNTERSIGN_PAYLOAD_TYPE = 'application/vnd.axion.memory-design-countersignature+json';
const DISPOSITION_PAYLOAD_TYPE = 'application/vnd.axion.memory-disposition+json';
const GENESIS_HASH = '0'.repeat(64);

function loadRegistry() {
  return JSON.parse(fs.readFileSync(REGISTRY_FIXTURE, 'utf8'));
}

function makeWorkspace(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix || 'axion-countersign-'));
}

function makeAuthority(dir, options = {}) {
  const actorId = options.actorId || 'Test Human Authority';
  const status = options.status || 'TRUSTED';
  const roles = options.roles || ['HUMAN_AUTHORITY'];
  const expiresInMs = options.expiresInMs === undefined ? 365 * 24 * 60 * 60 * 1000 : options.expiresInMs;
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const der = publicKey.export({ type: 'spki', format: 'der' });
  const keyId = `ed25519:${crypto.createHash('sha256').update(der).digest('hex')}`;
  const registry = {
    version: '1.0.0',
    authorities: [{
      actorId,
      keyId,
      status,
      roles,
      expiresAt: new Date(Date.now() + expiresInMs).toISOString(),
      publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' })
    }]
  };
  const file = path.join(dir, `authorities-${keyId.slice(8, 16)}.json`);
  fs.writeFileSync(file, `${JSON.stringify(registry, null, 2)}\n`, 'utf8');
  return { actorId, status, roles, keyId, publicKey, privateKey, file, registry };
}

function makeStatement(options = {}) {
  const registry = options.registry || loadRegistry();
  const now = options.now || new Date();
  const ttlMs = options.ttlMs === undefined ? 60 * 60 * 1000 : options.ttlMs;
  const statement = {
    schemaVersion: '1.0.0',
    registryId: registry.registryId,
    registryRevision: registry.registryRevision,
    designVersion: registry.designVersion,
    registrySha256: hashCanonical(registry),
    scope: registry.decisions
      .filter((d) => d.state === 'RATIFICADA_HUMANA' || d.state === 'PENDIENTE_CONTRAFIRMA')
      .map((d) => d.id),
    signer: { actorId: options.actorId, keyId: options.keyId },
    issuedAt: new Date(now.getTime() - 60000).toISOString(),
    expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
    nonce: options.nonce || crypto.randomBytes(24).toString('base64url')
  };
  if (options.overrides) {
    for (const key of Object.keys(options.overrides)) {
      if (options.overrides[key] === undefined) delete statement[key];
      else statement[key] = options.overrides[key];
    }
  }
  return statement;
}

function signStatement(statement, authority) {
  const body = Buffer.from(canonicalize(statement), 'utf8');
  return signEnvelope({ payloadType: COUNTERSIGN_PAYLOAD_TYPE, body, privateKey: authority.privateKey, keyId: authority.keyId });
}

function signDispositionStatement(statement, authority) {
  const body = Buffer.from(canonicalize(statement), 'utf8');
  return signEnvelope({ payloadType: DISPOSITION_PAYLOAD_TYPE, body, privateKey: authority.privateKey, keyId: authority.keyId });
}

function makeSignedEnvelope(options = {}) {
  const statement = makeStatement({
    ...options,
    actorId: options.authority.actorId,
    keyId: options.authority.keyId
  });
  return { statement, envelope: signStatement(statement, options.authority) };
}

function makeRepairStatement(options) {
  const registry = options.registry || loadRegistry();
  const now = options.now || new Date();
  return {
    schemaVersion: '1.0.0',
    dispositionId: options.dispositionId || 'AX-DISP-0001',
    registryId: registry.registryId,
    registryRevision: registry.registryRevision,
    action: 'REPAIR',
    markerFileNameHash: options.markerFileNameHash,
    markerContentSha256: options.markerContentSha256,
    statementSha256: options.statementSha256,
    targetHead: options.targetHead,
    signer: { actorId: options.authority.actorId, keyId: options.authority.keyId },
    issuedAt: new Date(now.getTime() - 60000).toISOString(),
    expiresAt: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
    nonce: options.nonce || crypto.randomBytes(24).toString('base64url')
  };
}

function makeInvalidateStatement(options) {
  const registry = options.registry || loadRegistry();
  const now = options.now || new Date();
  return {
    schemaVersion: '1.0.0',
    dispositionId: options.dispositionId || 'AX-DISP-0002',
    registryId: registry.registryId,
    registryRevision: registry.registryRevision,
    action: 'INVALIDATE',
    markerFileNameHash: null,
    markerContentSha256: null,
    statementSha256: options.statementSha256,
    newRegistryRevision: options.newRegistryRevision || registry.registryRevision + 1,
    signer: { actorId: options.authority.actorId, keyId: options.authority.keyId },
    issuedAt: new Date(now.getTime() - 60000).toISOString(),
    expiresAt: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
    nonce: options.nonce || crypto.randomBytes(24).toString('base64url')
  };
}

function writeJsonFile(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  return file;
}

function runCli(rel, args, options = {}) {
  return spawnSync(process.execPath, [path.join(ROOT, rel), ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    input: '',
    windowsHide: true,
    timeout: options.timeout || 60000
  });
}

function parseCliJson(result) {
  try {
    return JSON.parse(result.stdout);
  } catch (_) {
    return null;
  }
}

function readState(root) {
  const dir = path.join(root, '.axion', 'state', 'countersign-consumption');
  const names = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  const markerNames = names.filter((n) => /^[a-f0-9]{64}\.used$/.test(n)).sort();
  const dispMarkerNames = names.filter((n) => /^disp-[a-f0-9]{64}\.used$/.test(n)).sort();
  const entries = [];
  const log = path.join(dir, 'consumption.log');
  if (fs.existsSync(log)) {
    for (const line of fs.readFileSync(log, 'utf8').split('\n').filter((l) => l.trim() !== '')) {
      try {
        entries.push(JSON.parse(line));
      } catch (_) {
        entries.push({ unreadable: line });
      }
    }
  }
  const dispositionEntries = [];
  const dispositionLog = path.join(dir, 'disposition.log');
  if (fs.existsSync(dispositionLog)) {
    for (const line of fs.readFileSync(dispositionLog, 'utf8').split('\n').filter((l) => l.trim() !== '')) {
      try {
        dispositionEntries.push(JSON.parse(line));
      } catch (_) {
        dispositionEntries.push({ unreadable: line });
      }
    }
  }
  return { dir, markerNames, dispMarkerNames, entries, dispositionEntries };
}

function readTree(root) {
  const results = [];
  function walk(dir, prefix) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(abs, rel);
      else results.push(rel);
    }
  }
  if (fs.existsSync(root)) walk(root, '');
  return results.sort();
}

function writeHalt(root, reason) {
  const axion = path.join(root, '.axion');
  fs.mkdirSync(axion, { recursive: true });
  fs.writeFileSync(path.join(axion, 'HALT'), `${JSON.stringify({ reason: reason || 'test halt', haltedAt: new Date().toISOString(), haltedBy: 'test' }, null, 2)}\n`, 'utf8');
}

function writeCrl(root, keyIds) {
  const dir = path.join(root, '.axion', 'revocations');
  fs.mkdirSync(dir, { recursive: true });
  const entries = keyIds.map((keyId, index) => ({
    revocationId: `REV-TEST-${index}`,
    targetKeyId: keyId,
    reason: 'KEY_COMPROMISE',
    revokedAt: new Date().toISOString()
  }));
  fs.writeFileSync(path.join(dir, 'crl.json'), `${JSON.stringify({ version: '1.0.0', entries }, null, 2)}\n`, 'utf8');
}

function fakeHash(seed) {
  return crypto.createHash('sha256').update(String(seed), 'utf8').digest('hex');
}

function writeRaw(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
  return file;
}

function cleanup(paths) {
  for (const target of paths) {
    try {
      fs.rmSync(target, { recursive: true, force: true });
    } catch (_) {
      /* limpieza best-effort */
    }
  }
}

module.exports = {
  ROOT,
  REGISTRY_FIXTURE,
  GENESIS_HASH,
  COUNTERSIGN_PAYLOAD_TYPE,
  DISPOSITION_PAYLOAD_TYPE,
  loadRegistry,
  makeWorkspace,
  makeAuthority,
  makeStatement,
  signStatement,
  signDispositionStatement,
  makeSignedEnvelope,
  makeRepairStatement,
  makeInvalidateStatement,
  writeJsonFile,
  runCli,
  parseCliJson,
  readState,
  readTree,
  writeHalt,
  writeCrl,
  fakeHash,
  writeRaw,
  cleanup,
  hashCanonical,
  canonicalize
};
