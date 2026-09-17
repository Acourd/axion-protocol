#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Evidencia de fase (tipada, con productor autorizado y ledger).
 *
 * Una fase del Fast-Forward NO se acredita con un booleano ni con un archivo
 * cualquiera: exige un artefacto JSON tipado (`axion.phase-evidence/v1`) que declare
 * su fase, un productor autorizado para esa fase y resultado PASS, registrado además
 * en el ledger encadenado (hash + ruta + fase + productor).
 *
 * Endurecimiento:
 * - Se rechazan symlinks y rutas que escapan de la raíz (realpath dentro de raíz).
 * - El hash se calcula sobre una única lectura del archivo (sin TOCTOU hash/parseo).
 * - Un artefacto no puede reutilizarse entre fases (distinción obligatoria).
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { appendEntry, verifyLedger } = require('./evidence_ledger.js');

const SCHEMA = 'axion.phase-evidence/v1';
const PHASE_PRODUCERS = Object.freeze({
  testsPassed: ['tools/verify_changes.js', 'tools/drive_dsse_attester.js'],
  vibeGuardPassed: ['tools/vibeguard_gate.js'],
  smtProofPassed: ['tools/temporal_state_verifier.js'],
  chaosFuzzPassed: ['tools/agent_chaos_monkey.js']
});
const PHASE_NAMES = Object.freeze(Object.keys(PHASE_PRODUCERS));

function fail(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function dentroDeRaiz(root, abs) {
  const realRoot = fs.realpathSync(root);
  const realAbs = fs.realpathSync(abs);
  const rel = path.relative(realRoot, realAbs);
  return {
    dentro: rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel),
    realAbs,
    realRoot,
    rel: rel.split(path.sep).join('/')
  };
}

/**
 * Lee un artefacto una sola vez, rechazando symlinks y rutas fuera de la raíz.
 * Devuelve buffer, hash, parsed y ruta relativa canónica.
 */
function leerArtefacto(root, artifactRef) {
  if (typeof artifactRef !== 'string' || artifactRef.trim() === '') {
    throw fail('ERR_PHASE_ARTIFACT_INVALID', 'La evidencia de fase requiere artifact (ruta).');
  }
  const abs = path.isAbsolute(artifactRef) ? artifactRef : path.resolve(root, artifactRef);
  if (!fs.existsSync(abs)) {
    throw fail('ERR_PHASE_ARTIFACT_MISSING', `Artefacto de fase no existe: ${artifactRef}`);
  }
  const lstat = fs.lstatSync(abs);
  if (lstat.isSymbolicLink()) {
    throw fail('ERR_PHASE_ARTIFACT_SYMLINK', `Artefacto de fase no puede ser symlink: ${artifactRef}`);
  }
  if (!lstat.isFile()) {
    throw fail('ERR_PHASE_ARTIFACT_INVALID', `Artefacto de fase no es un archivo: ${artifactRef}`);
  }
  const ubic = dentroDeRaiz(root, abs);
  if (!ubic.dentro) {
    throw fail('ERR_PHASE_ARTIFACT_ESCAPE', `Artefacto de fase fuera de la raíz: ${artifactRef}`);
  }

  // Lectura única: el mismo buffer se hashea y se parsea.
  const buffer = fs.readFileSync(abs);
  const hash = sha256(buffer);

  let parsed;
  try {
    parsed = JSON.parse(buffer.toString('utf8'));
  } catch (parseErr) {
    throw fail('ERR_PHASE_ARTIFACT_INVALID', `Artefacto de fase no es JSON válido: ${parseErr.message}`);
  }

  return { buffer, hash, parsed, rel: ubic.rel, abs: ubic.realAbs };
}

/**
 * Crea un artefacto de fase tipado para pruebas y productores internos.
 */
function createPhaseArtifact(root, { phase, producer, extra = {} } = {}) {
  if (!PHASE_NAMES.includes(phase)) {
    throw fail('ERR_PHASE_UNKNOWN', `Fase desconocida: ${String(phase)}`);
  }
  if (!PHASE_PRODUCERS[phase].includes(producer)) {
    throw fail('ERR_PHASE_PRODUCER', `Productor '${String(producer)}' no autorizado para ${phase}.`);
  }
  const dir = path.join(root, '.axion', 'evidence', 'phases');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${phase}-${crypto.randomBytes(8).toString('hex')}.json`);
  const contenido = JSON.stringify({
    schema: SCHEMA,
    phase,
    producer,
    result: 'PASS',
    createdAt: new Date().toISOString(),
    ...extra
  }, null, 2);
  fs.writeFileSync(file, contenido, 'utf8');
  const buffer = fs.readFileSync(file);
  return {
    path: file,
    relPath: path.relative(root, file).split(path.sep).join('/'),
    sha256: sha256(buffer)
  };
}

/**
 * Registra la evidencia de fase en el ledger (encadenado y, si hay signer, firmado).
 */
function registerPhaseEvidence(root, { phase, artifactPath, producer, signer = null, suites = null } = {}) {
  const { parsed, hash, rel } = leerArtefacto(root, artifactPath);
  if (parsed.schema !== SCHEMA || parsed.phase !== phase) {
    throw fail('ERR_PHASE_ARTIFACT_INVALID', `El artefacto no declara schema/phase esperados (${SCHEMA}, ${phase}).`);
  }
  if (parsed.producer !== producer) {
    throw fail('ERR_PHASE_PRODUCER', `El artefacto declara productor '${parsed.producer}', se esperaba '${producer}'.`);
  }
  const entry = appendEntry(root, {
    producer,
    command: `phase:${phase}`,
    exitCode: 0,
    suites,
    artifact: rel,
    artifactSha256: hash,
    phase,
    signer
  });
  return { entry, sha256: hash, relPath: rel };
}

/**
 * Valida la evidencia de una fase completa: tipado, productor autorizado, dentro de
 * la raíz, sin symlink, hash vigente y entrada correspondiente en el ledger.
 */
function validatePhaseEvidence(root, phase, evidence) {
  if (!PHASE_NAMES.includes(phase)) {
    return { ok: false, reason: `fase desconocida ${String(phase)}` };
  }
  if (!evidence || typeof evidence !== 'object') {
    return { ok: false, reason: `${phase}: sin evidencia` };
  }
  if (evidence.result !== 'PASS') {
    return { ok: false, reason: `${phase}: resultado distinto de PASS` };
  }
  if (typeof evidence.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(evidence.sha256)) {
    return { ok: false, reason: `${phase}: SHA-256 ausente o inválido` };
  }

  let leido;
  try {
    leido = leerArtefacto(root, evidence.artifact);
  } catch (err) {
    return { ok: false, reason: `${phase}: ${err.code || 'ERROR'} ${err.message}` };
  }

  const parsed = leido.parsed;
  if (parsed.schema !== SCHEMA) {
    return { ok: false, reason: `${phase}: schema '${String(parsed.schema)}' distinto de '${SCHEMA}'` };
  }
  if (parsed.phase !== phase) {
    return { ok: false, reason: `${phase}: el artefacto declara la fase '${String(parsed.phase)}'` };
  }
  if (parsed.result !== 'PASS') {
    return { ok: false, reason: `${phase}: el artefacto no declara PASS` };
  }
  if (!PHASE_PRODUCERS[phase].includes(parsed.producer)) {
    return { ok: false, reason: `${phase}: productor '${String(parsed.producer)}' no autorizado` };
  }
  if (leido.hash !== evidence.sha256) {
    return { ok: false, reason: `${phase}: SHA-256 no coincide con el contenido actual` };
  }

  const ledger = verifyLedger(root);
  if (!ledger.valid) {
    return { ok: false, reason: `${phase}: ledger inválido (${ledger.reason})` };
  }
  const entrada = ledger.entries.find((e) => e.phase === phase
    && e.artifactSha256 === leido.hash
    && e.artifact === leido.rel
    && e.producer === parsed.producer);
  if (!entrada) {
    return { ok: false, reason: `${phase}: sin entrada de ledger vinculada (fase + hash + productor)` };
  }

  return {
    ok: true,
    verified: {
      phase,
      artifact: leido.rel,
      sha256: leido.hash,
      result: 'PASS',
      producer: parsed.producer,
      ledgerSeq: entrada.seq,
      observedAt: parsed.createdAt || entrada.recordedAt
    }
  };
}

module.exports = {
  SCHEMA,
  PHASE_NAMES,
  PHASE_PRODUCERS,
  leerArtefacto,
  createPhaseArtifact,
  registerPhaseEvidence,
  validatePhaseEvidence
};
