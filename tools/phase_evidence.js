#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Evidencia de fase (ejecución observada, firmada y verificable).
 *
 * Una fase del Fast-Forward NO se acredita con un booleano ni con un archivo
 * cualquiera. Se exige:
 * 1. Ejecución observada dentro del proceso productor (`runPhaseAndRecord` ejecuta el
 *    control y solo con exit 0 escribe el artefacto, con bloque `execution`).
 * 2. Artefacto tipado (`axion.phase-evidence/v1`) con fase, productor autorizado y PASS.
 * 3. Entrada de ledger firmada (firma obligatoria) y verificación con la clave pública
 *    del keyring del proyecto; sin clave pública no hay Fast-Forward posible.
 * 4. Lectura por descriptor único con `fstat` y `O_NOFOLLOW` (sin TOCTOU de ruta).
 * 5. Prohibición de reutilizar un artefacto entre fases.
 *
 * Límite declarado: la identidad sigue siendo local (la clave del keyring). La firma
 * prueba autoría local, no una autoridad externa independiente.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { appendEntry, verifyLedger } = require('./evidence_ledger.js');

const SCHEMA = 'axion.phase-evidence/v1';
const PHASE_PRODUCERS = Object.freeze({
  testsPassed: ['tools/verify_changes.js', 'tools/drive_dsse_attester.js'],
  vibeGuardPassed: ['tools/vibeguard_gate.js'],
  smtProofPassed: ['tools/temporal_state_verifier.js'],
  chaosFuzzPassed: ['tools/agent_chaos_monkey.js']
});
const PHASE_NAMES = Object.freeze(Object.keys(PHASE_PRODUCERS));
const O_NOFOLLOW = fs.constants.O_NOFOLLOW || 0;

function fail(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function clavePublicaPath(root) {
  return path.join(root, '.axion', 'keys', 'attestation_ed25519.pub');
}

/**
 * Firma obligatoria: sin clave pública del keyring no hay verificación posible.
 */
function cargarClavePublica(root) {
  const pubPath = clavePublicaPath(root);
  if (!fs.existsSync(pubPath)) {
    throw fail('ERR_PHASE_PUBLIC_KEY_MISSING',
      `No existe la clave pública del keyring (${pubPath}); la evidencia de fase no es verificable.`);
  }
  return fs.readFileSync(pubPath, 'utf8');
}

/**
 * Lectura por descriptor único: se abre (O_NOFOLLOW cuando la plataforma lo soporta),
 * se valida el tipo con `fstat` sobre ESE descriptor y se lee del mismo descriptor.
 */
function leerConDescriptor(root, artifactRef) {
  if (typeof artifactRef !== 'string' || artifactRef.trim() === '') {
    throw fail('ERR_PHASE_ARTIFACT_INVALID', 'La evidencia de fase requiere artifact (ruta).');
  }
  const abs = path.isAbsolute(artifactRef) ? artifactRef : path.resolve(root, artifactRef);

  if (!O_NOFOLLOW) {
    let lstat = null;
    try {
      lstat = fs.lstatSync(abs);
    } catch (_) {
      throw fail('ERR_PHASE_ARTIFACT_MISSING', `Artefacto de fase no existe: ${artifactRef}`);
    }
    if (lstat.isSymbolicLink()) {
      throw fail('ERR_PHASE_ARTIFACT_SYMLINK', `Artefacto de fase no puede ser symlink: ${artifactRef}`);
    }
  }

  let fd = null;
  try {
    try {
      fd = fs.openSync(abs, fs.constants.O_RDONLY | O_NOFOLLOW);
    } catch (openErr) {
      if (openErr.code === 'ELOOP' || openErr.code === 'EMLINK') {
        throw fail('ERR_PHASE_ARTIFACT_SYMLINK', `Artefacto de fase no puede ser symlink: ${artifactRef}`);
      }
      if (openErr.code === 'ENOENT') {
        throw fail('ERR_PHASE_ARTIFACT_MISSING', `Artefacto de fase no existe: ${artifactRef}`);
      }
      throw openErr;
    }

    const st = fs.fstatSync(fd);
    if (!st.isFile()) {
      throw fail('ERR_PHASE_ARTIFACT_INVALID', `Artefacto de fase no es un archivo regular: ${artifactRef}`);
    }

    // Contención: la ruta real debe permanecer en la raíz mientras el descriptor sigue abierto.
    const realRoot = fs.realpathSync(root);
    const realAbs = fs.realpathSync(abs);
    const rel = path.relative(realRoot, realAbs);
    if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) {
      throw fail('ERR_PHASE_ARTIFACT_ESCAPE', `Artefacto de fase fuera de la raíz: ${artifactRef}`);
    }

    const buffer = fs.readFileSync(fd);
    const hash = sha256(buffer);
    let parsed;
    try {
      parsed = JSON.parse(buffer.toString('utf8'));
    } catch (parseErr) {
      throw fail('ERR_PHASE_ARTIFACT_INVALID', `Artefacto de fase no es JSON válido: ${parseErr.message}`);
    }
    return { buffer, hash, parsed, rel: rel.split(path.sep).join('/'), abs: realAbs };
  } finally {
    if (fd !== null) {
      try { fs.closeSync(fd); } catch (_) { /* descriptor ya cerrado */ }
    }
  }
}

/**
 * Ejecuta el control de la fase y, solo si termina con exit 0, escribe el artefacto
 * tipado y lo registra en el ledger con firma obligatoria.
 */
function runPhaseAndRecord(root, options = {}) {
  const {
    phase,
    producer,
    signer,
    command,
    args = [],
    cwd = root,
    timeoutMs = 60000,
    extra = {}
  } = options;

  if (!PHASE_NAMES.includes(phase)) {
    throw fail('ERR_PHASE_UNKNOWN', `Fase desconocida: ${String(phase)}`);
  }
  if (!PHASE_PRODUCERS[phase].includes(producer)) {
    throw fail('ERR_PHASE_PRODUCER', `Productor '${String(producer)}' no autorizado para ${phase}.`);
  }
  if (!signer || typeof signer.sign !== 'function' || typeof signer.keyId !== 'string') {
    throw fail('ERR_PHASE_SIGNATURE_REQUIRED',
      `La evidencia de fase exige firma obligatoria del productor (${phase}).`);
  }
  if (typeof command !== 'string' || command.trim() === '') {
    throw fail('ERR_PHASE_EXECUTION_REQUIRED', `La evidencia de fase exige un control ejecutable (${phase}).`);
  }

  const startedAt = Date.now();
  const ejecucion = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    shell: false,
    timeout: timeoutMs,
    windowsHide: true
  });
  const finishedAt = Date.now();
  const salida = `${ejecucion.stdout || ''}${ejecucion.stderr || ''}`;
  const exitCode = typeof ejecucion.status === 'number' ? ejecucion.status : null;

  if (ejecucion.error || exitCode !== 0) {
    throw fail('ERR_PHASE_EXECUTION_FAILED',
      `El control de ${phase} no superó la ejecución (error=${ejecucion.error ? ejecucion.error.message : 'ninguno'}, exitCode=${exitCode}).`);
  }

  const dir = path.join(root, '.axion', 'evidence', 'phases');
  fs.mkdirSync(dir, { recursive: true });
  const archivo = path.join(dir, `${phase}-${crypto.randomBytes(8).toString('hex')}.json`);
  const contenido = JSON.stringify({
    schema: SCHEMA,
    phase,
    producer,
    result: 'PASS',
    createdAt: new Date().toISOString(),
    execution: {
      command,
      args,
      exitCode: 0,
      outputSha256: sha256(Buffer.from(salida, 'utf8')),
      startedAt: new Date(startedAt).toISOString(),
      finishedAt: new Date(finishedAt).toISOString(),
      durationMs: finishedAt - startedAt
    },
    ...extra
  }, null, 2);
  fs.writeFileSync(archivo, contenido, 'utf8');

  const relPath = path.relative(root, archivo).split(path.sep).join('/');
  const buffer = fs.readFileSync(archivo);
  const entry = appendEntry(root, {
    producer,
    command: `phase:${phase}`,
    exitCode: 0,
    suites: null,
    artifact: relPath,
    artifactSha256: sha256(buffer),
    phase,
    signer
  });

  return {
    artifact: archivo,
    relPath,
    sha256: sha256(buffer),
    entry,
    ref: { artifact: relPath, sha256: sha256(buffer), result: 'PASS' }
  };
}

/**
 * Valida la evidencia de una fase: tipado, ejecución observada, productor autorizado,
 * hash vigente, entrada de ledger firmada y ledger íntegro con la clave pública.
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
    leido = leerConDescriptor(root, evidence.artifact);
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

  const ejecucion = parsed.execution;
  const ejecucionValida = ejecucion && typeof ejecucion === 'object'
    && ejecucion.exitCode === 0
    && typeof ejecucion.command === 'string' && ejecucion.command.trim() !== ''
    && typeof ejecucion.outputSha256 === 'string' && /^[0-9a-f]{64}$/.test(ejecucion.outputSha256);
  if (!ejecucionValida) {
    return { ok: false, reason: `${phase}: sin bloque de ejecución observada válido` };
  }

  let publicKeyPem;
  try {
    publicKeyPem = cargarClavePublica(root);
  } catch (err) {
    return { ok: false, reason: `${phase}: ${err.code || 'ERROR'} ${err.message}` };
  }

  const ledger = verifyLedger(root, publicKeyPem);
  if (!ledger.valid) {
    return { ok: false, reason: `${phase}: ledger inválido (${ledger.reason})` };
  }
  const entrada = ledger.entries.find((e) => e.phase === phase
    && e.artifactSha256 === leido.hash
    && e.artifact === leido.rel
    && e.producer === parsed.producer
    && e.exitCode === 0
    && e.signature && e.signature.sig);
  if (!entrada) {
    return { ok: false, reason: `${phase}: sin entrada de ledger firmada (fase + hash + productor + exit 0)` };
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
      keyId: entrada.signature.keyid,
      observedAt: parsed.createdAt || entrada.recordedAt
    }
  };
}

module.exports = {
  SCHEMA,
  PHASE_NAMES,
  PHASE_PRODUCERS,
  leerConDescriptor,
  cargarClavePublica,
  runPhaseAndRecord,
  validatePhaseEvidence
};
