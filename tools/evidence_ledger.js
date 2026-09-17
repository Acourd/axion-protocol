#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Evidence Ledger (Cadena de Evidencia Verificable)
 *
 * Registro append-only con encadenamiento SHA-256 y firma Ed25519 local que vincula
 * cada artefacto de evidencia con el productor que lo registró:
 * 1. `recordEvidence(root, payload)` escribe el artefacto JSON y su entrada de ledger.
 * 2. `verifyLedger(root, publicKeyPem)` valida esquema, secuencia, cadena y firmas.
 * 3. `findEntry(root, artifactSha256, producer)` localiza la entrada de un artefacto.
 *
 * Límite declarado: la firma acredita que el registro lo hizo quien posee la clave
 * local; no prueba la ejecución frente a un actor con acceso al mismo usuario y a la
 * clave privada. Sin la firma y la entrada de ledger, la evidencia no es verificable.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const FileLock = require('./file_lock.js');

const LEDGER_SCHEMA = 'axion.evidence-ledger/v1';
const GENESIS_HASH = '0'.repeat(64);
const LOCK_FILE = 'ledger.lock';
const DEFAULT_LOCK_TIMEOUT_MS = 10000;
const DEFAULT_LOCK_STALE_MS = 30000;

function evidenceDir(root) {
  return path.join(root, '.axion', 'evidence');
}

function ledgerPath(root) {
  return path.join(evidenceDir(root), 'ledger.jsonl');
}

function lockPath(root) {
  return path.join(evidenceDir(root), LOCK_FILE);
}

/**
 * Lock exclusivo del ledger con token de propietario y lease por PID:
 * - Nunca se roba un lock cuyo dueño siga vivo, aunque sea antiguo.
 * - La recuperación reclama atómicamente (rename) y verifica el token observado.
 * - La liberación es condicional al token: un dueño viejo no borra el lock ajeno.
 * - Fail-closed: al agotar el timeout lanza ERR_LEDGER_LOCKED.
 */
function acquireLock(root, options = {}) {
  const file = lockPath(root);
  const lock = FileLock.acquire(file, {
    timeoutMs: Number.isFinite(options.lockTimeoutMs) ? options.lockTimeoutMs : DEFAULT_LOCK_TIMEOUT_MS,
    staleMs: Number.isFinite(options.lockStaleMs) ? options.lockStaleMs : DEFAULT_LOCK_STALE_MS,
    code: 'ERR_LEDGER_LOCKED'
  });
  return { lockFile: file, token: lock.token };
}

function releaseLock(lock) {
  if (!lock || typeof lock !== 'object') return false;
  return FileLock.release(lock.lockFile, lock.token);
}

function withLock(root, fn, options = {}) {
  const lock = acquireLock(root, options);
  try {
    return fn();
  } finally {
    releaseLock(lock);
  }
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Serialización canónica (claves ordenadas) para que el hash encadenado sea estable.
 */
function canonical(value) {
  if (value === undefined || value === null) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
}

function computeEntryHash(entry) {
  // El hash cubre el payload de la entrada; la firma se calcula sobre ese hash y
  // por eso ambos campos quedan fuera del cálculo.
  const { entryHash, signature, ...rest } = entry;
  void entryHash;
  void signature;
  return sha256(canonical(rest));
}

function readLedger(root) {
  const file = ledgerPath(root);
  if (!fs.existsSync(file)) return [];
  const lines = fs.readFileSync(file, 'utf8').split('\n').filter((line) => line.trim() !== '');
  const entries = [];
  for (let i = 0; i < lines.length; i++) {
    try {
      entries.push(JSON.parse(lines[i]));
    } catch (parseErr) {
      const err = new Error(`entrada ${i + 1}: JSON ilegible (${parseErr.message})`);
      err.code = 'ERR_LEDGER_UNREADABLE';
      throw err;
    }
  }
  return entries;
}

/**
 * Valida la cadena completa y, si se aporta clave pública, exige firma válida en cada
 * entrada. Cualquier ruptura invalida todo el ledger: no hay fast-forward de evidencia.
 * Nunca lanza: una entrada ilegible se reporta como ledger inválido.
 */
function verifyLedger(root, publicKeyPem) {
  let entries;
  try {
    entries = readLedger(root);
  } catch (readErr) {
    return { valid: false, reason: readErr.message, entries: [] };
  }
  let previous = GENESIS_HASH;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry || typeof entry !== 'object') {
      return { valid: false, reason: `entrada ${i + 1}: no es un objeto`, entries };
    }
    if (entry.schema !== LEDGER_SCHEMA) {
      return { valid: false, reason: `entrada ${i + 1}: schema inesperado`, entries };
    }
    if (entry.seq !== i + 1) {
      return { valid: false, reason: `entrada ${i + 1}: secuencia no contigua (${entry.seq})`, entries };
    }
    if (entry.prevEntryHash !== previous) {
      return { valid: false, reason: `entrada ${i + 1}: cadena rota`, entries };
    }
    if (computeEntryHash(entry) !== entry.entryHash) {
      return { valid: false, reason: `entrada ${i + 1}: hash manipulado`, entries };
    }
    if (publicKeyPem) {
      if (!entry.signature || !entry.signature.sig) {
        return { valid: false, reason: `entrada ${i + 1}: sin firma`, entries };
      }
      const ok = crypto.verify(
        null,
        Buffer.from(entry.entryHash, 'utf8'),
        publicKeyPem,
        Buffer.from(entry.signature.sig, 'base64')
      );
      if (!ok) {
        return { valid: false, reason: `entrada ${i + 1}: firma inválida`, entries };
      }
    }
    previous = entry.entryHash;
  }

  return { valid: true, entries, head: previous };
}

function appendEntry(root, payload, options = {}) {
  const dir = evidenceDir(root);
  fs.mkdirSync(dir, { recursive: true });

  // Sección crítica: lectura de la cadena, validación, anexado y liberación del lock.
  return withLock(root, () => {
    // Fail-closed: no se anexa a una cadena rota; se exige ledger íntegro antes de escribir.
    const state = verifyLedger(root);
    if (!state.valid) {
      const err = new Error(`No se anexa evidencia: ledger inválido (${state.reason}).`);
      err.code = 'ERR_LEDGER_INVALID';
      throw err;
    }

    const entries = state.entries;
    const previous = entries.length > 0 ? entries[entries.length - 1].entryHash : GENESIS_HASH;

    const entry = {
      schema: LEDGER_SCHEMA,
      seq: entries.length + 1,
      recordedAt: new Date().toISOString(),
      producer: payload.producer === undefined ? null : payload.producer,
      command: payload.command === undefined ? null : payload.command,
      exitCode: payload.exitCode === undefined ? null : payload.exitCode,
      suites: payload.suites === undefined ? null : payload.suites,
      artifact: payload.artifact === undefined ? null : payload.artifact,
      artifactSha256: payload.artifactSha256 === undefined ? null : payload.artifactSha256,
      prevEntryHash: previous
    };
    if (payload.phase) entry.phase = payload.phase;
    entry.entryHash = computeEntryHash(entry);

    if (payload.signer) {
      entry.signature = {
        keyid: payload.signer.keyId,
        sig: payload.signer.sign(Buffer.from(entry.entryHash, 'utf8')).toString('base64')
      };
    }

    fs.appendFileSync(ledgerPath(root), `${JSON.stringify(entry)}\n`, 'utf8');
    return entry;
  }, options);
}

/**
 * Registra un artefacto de evidencia y su entrada firmada en el ledger.
 * Devuelve la ruta, el SHA-256 real del archivo y la entrada registrada.
 */
function recordEvidence(root, payload, options = {}) {
  const dir = evidenceDir(root);
  fs.mkdirSync(dir, { recursive: true });

  const evidence = {
    schema: payload.schema,
    producer: payload.producer,
    runner: payload.runner,
    command: payload.command,
    exitCode: payload.exitCode,
    status: payload.status,
    suites: payload.suites,
    startedAt: payload.startedAt,
    finishedAt: payload.finishedAt,
    durationMs: payload.durationMs,
    outputSha256: payload.outputSha256
  };

  const content = JSON.stringify(evidence, null, 2);
  const fileName = `${path.basename(payload.schema).replace(/[^a-z0-9.-]/gi, '-')}-${sha256(content).slice(0, 16)}.json`;
  const finalPath = path.join(dir, fileName);
  const tmpPath = `${finalPath}.tmp-${process.pid}`;
  fs.writeFileSync(tmpPath, content, 'utf8');
  fs.renameSync(tmpPath, finalPath);

  const artifactSha256 = sha256(fs.readFileSync(finalPath));
  const entry = appendEntry(root, {
    producer: payload.producer,
    command: payload.command,
    exitCode: payload.exitCode,
    suites: payload.suites,
    artifact: path.relative(root, finalPath).split(path.sep).join('/'),
    artifactSha256,
    signer: payload.signer
  }, options);

  return {
    path: finalPath,
    relPath: path.relative(root, finalPath).split(path.sep).join('/'),
    sha256: artifactSha256,
    bytes: fs.statSync(finalPath).size,
    entry
  };
}

function findEntry(root, artifactSha256, producer) {
  const entries = readLedger(root);
  return entries.find((e) => e.artifactSha256 === artifactSha256 && e.producer === producer) || null;
}

module.exports = {
  LEDGER_SCHEMA,
  GENESIS_HASH,
  evidenceDir,
  ledgerPath,
  lockPath,
  acquireLock,
  releaseLock,
  withLock,
  sha256,
  canonical,
  computeEntryHash,
  readLedger,
  verifyLedger,
  appendEntry,
  recordEvidence,
  findEntry
};
