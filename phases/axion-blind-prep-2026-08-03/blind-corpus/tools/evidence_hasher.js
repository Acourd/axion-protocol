#!/usr/bin/env node

/**
 * Axion Protocol - Evidence Cryptographic Hasher (SHA-256)
 * 
 * Genera manifiestos de evidencia inmutables con hashes SHA-256 para archivos,
 * salidas de comandos y snapshots de estado.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const process = require('process');

function hashFile(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex').toUpperCase();
  } catch (err) {
    return null;
  }
}

function hashString(content) {
  const hashSum = crypto.createHash('sha256');
  hashSum.update(content, 'utf8');
  return hashSum.digest('hex').toUpperCase();
}

/**
 * Emite un manifiesto conforme a schemas/evidence.schema.json.
 * Ninguna entrada solicitada se descarta en silencio: toda ruta aparece con su estado.
 * El generador NO aprueba su propia evidencia (policies/authority.yaml:
 * executor may_not approve_own_result); el manifiesto nace en estado WAITING.
 */
function createEvidenceManifest(options) {
  const {
    taskId = 'AX-TASK-0001',
    subject = 'Inspección de evidencias',
    files = [],
    logs = [],
    metadata = {}
  } = options;

  const fileEntries = [];
  let complete = true;

  for (const fPath of files) {
    const absPath = path.resolve(fPath);
    const relPath = path.relative(process.cwd(), absPath).split(path.sep).join('/');

    if (!fs.existsSync(absPath)) {
      fileEntries.push({ path: relPath, status: 'MISSING', size_bytes: null, sha256: null });
      complete = false;
      continue;
    }
    const stat = fs.statSync(absPath);
    if (!stat.isFile()) {
      fileEntries.push({ path: relPath, status: 'NOT_A_FILE', size_bytes: null, sha256: null });
      complete = false;
      continue;
    }
    const hash = hashFile(absPath);
    if (hash === null) {
      fileEntries.push({ path: relPath, status: 'UNREADABLE', size_bytes: stat.size, sha256: null });
      complete = false;
      continue;
    }
    fileEntries.push({ path: relPath, status: 'PRESENT', size_bytes: stat.size, sha256: hash });
  }

  const logHashes = logs.map((log, index) => {
    return {
      log_index: index + 1,
      content_sha256: hashString(log)
    };
  });

  const timestamp = new Date().toISOString();
  const evidenceId = `AX-EVD-${String(crypto.randomBytes(6).readUIntBE(0, 6)).padStart(15, '0')}`;

  const payload = {
    task_id: taskId,
    subject: subject,
    timestamp: timestamp,
    complete: complete,
    files: fileEntries,
    logs: logHashes,
    custom_metadata: metadata
  };

  return {
    identifier: evidenceId,
    version: '0.2.0',
    date: timestamp.split('T')[0],
    provenance: 'Axion Evidence Hasher Tool',
    status: complete ? 'COMPLETE' : 'INCOMPLETE',
    owner: 'Human Authority',
    risk: 'LOW',
    evidence: payload,
    approval: {
      required: true,
      state: 'WAITING',
      approved_by: null,
      approved_at: null
    },
    evidence_id: evidenceId,
    evidence_type: 'MANIFEST',
    source: taskId,
    location: process.cwd().split(path.sep).join('/'),
    hash_algorithm: 'SHA-256',
    hash: hashString(JSON.stringify(payload)),
    retention_class: 'OPERATIONAL',
    restoration_instructions: 'Recalcular el SHA-256 de cada archivo listado en evidence.files y compararlo con el valor registrado. Un manifiesto con complete:false no acredita cobertura total.'
  };
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Uso: node tools/evidence_hasher.js <archivo_1> [archivo_2 ...]');
    process.exit(0);
  }

  const manifest = createEvidenceManifest({
    taskId: 'AX-TASK-VERIFY',
    subject: 'Manifiesto de evidencia de prueba',
    files: args
  });

  console.log(JSON.stringify(manifest, null, 2));
}

if (require.main === module) {
  main();
}

module.exports = { hashFile, hashString, createEvidenceManifest };
