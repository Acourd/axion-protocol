#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Drive DSSE & in-toto v1 Cryptographic Attester (Authority-Separated)
 *
 * Emite y verifica atestaciones in-toto Statement v1 selladas en sobre DSSE con firma
 * asimétrica Ed25519:
 * 1. Carga claves Ed25519 existentes en .axion/keys/. Nunca las regenera en silencio:
 *    si faltan, están corruptas o tienen permisos inseguros, la operación falla.
 * 2. La creación de claves es una acción explícita (`generateKeyPair`/`ensureKeyPair`)
 *    con escritura atómica y permisos restrictivos (0600 en plataformas POSIX).
 * 3. La evidencia externa (aunque venga firmada y registrada en el ledger) NUNCA es
 *    `VERIFIED`: el firmante no observó la ejecución. Máximo estado: `EXTERNAL_EVIDENCE`,
 *    sin métricas de gobierno en el predicado.
 * 4. `VERIFIED` solo se emite ejecutando la suite DENTRO de este componente
 *    (`runSuiteAndAttest`, CLI `--run-suite`): las cifras provienen de la salida real
 *    del proceso (exit code + conteos), nunca de parámetros del llamador.
 * 5. Las métricas que aporte el llamador se registran como claims no verificados;
 *    jamás como hechos ni como `true` fijo.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const MerkleCacheEngine = require('./merkle_cache_fast_forward.js');
const AttestationKeyring = require('./attestation_keyring.js');

const ROOT = path.resolve(__dirname, '..');

const EVIDENCE_SCHEMAS = {
  testRun: 'axion.verification/v1',
  vibeGuard: 'axion.vibeguard/v1'
};
const EVIDENCE_SLOTS = ['testRun', 'vibeGuard'];
// Productor autorizado por slot: la evidencia debe declararlo y estar registrada en el
// ledger firmado por la clave local. Un JSON suelto no acredita una ejecución.
const EVIDENCE_PRODUCERS = {
  testRun: 'tools/verify_changes.js',
  vibeGuard: 'tools/vibeguard_gate.js'
};

class DriveDsseAttester {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
    this.keysDir = path.join(this.root, '.axion', 'keys');
    this.attestDir = path.join(this.root, '.axion', 'attestations');
    this.keyring = new AttestationKeyring(this.root);
    this.ensureDirs();
  }

  ensureDirs() {
    // El keyring crea y protege .axion/keys; aquí solo el directorio de atestaciones.
    if (!fs.existsSync(this.attestDir)) {
      fs.mkdirSync(this.attestDir, { recursive: true });
    }
  }

  privKeyPath() {
    return this.keyring.privKeyPath();
  }

  pubKeyPath() {
    return this.keyring.pubKeyPath();
  }

  keyIdFor(publicKeyPem) {
    return this.keyring.keyIdFor(publicKeyPem);
  }

  fail(code, message) {
    const err = new Error(message);
    err.code = code;
    return err;
  }

  assertSecurePermissions(keyPath) {
    return this.keyring.assertSecurePermissions(keyPath);
  }

  /**
   * Carga y valida el par de claves (delegado al keyring aislado).
   */
  loadKeyPair() {
    return this.keyring.loadKeyPair();
  }

  /**
   * Creación explícita de claves (delegada al keyring; nunca rota en silencio).
   */
  generateKeyPair() {
    return this.keyring.generateKeyPair();
  }

  /**
   * Bootstrap idempotente y tolerante a carreras (delegado al keyring).
   */
  ensureKeyPair() {
    return this.keyring.ensureKeyPair();
  }

  /**
   * Codificación PAE (Pre-Authentication Encoding) conforme al estándar DSSE.
   */
  dssePae(payloadType, payloadBuffer) {
    const pt = Buffer.from(payloadType, 'utf8');
    return Buffer.concat([
      Buffer.from(`DSSEv1 ${pt.length} `, 'utf8'),
      pt,
      Buffer.from(` ${payloadBuffer.length} `, 'utf8'),
      payloadBuffer
    ]);
  }

  sha256File(filePath) {
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
  }

  /**
   * Valida un artefacto de evidencia aportado: existe, declara su SHA-256 y coincide,
   * su esquema es el esperado y su productor es el autorizado para el slot.
   */
  loadEvidenceArtifact(slot, evidence) {
    const expectedSchema = EVIDENCE_SCHEMAS[slot];
    const expectedProducer = EVIDENCE_PRODUCERS[slot];
    const ref = evidence[slot];
    if (!ref || typeof ref !== 'object' || typeof ref.path !== 'string' || ref.path.trim() === '') {
      throw this.fail('ERR_EVIDENCE_INVALID', `Evidencia '${slot}' sin path válido.`);
    }
    if (typeof ref.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(ref.sha256)) {
      throw this.fail('ERR_EVIDENCE_HASH_REQUIRED',
        `Evidencia '${slot}' debe declarar el SHA-256 (64 hex) del artefacto; sin él no es verificable.`);
    }

    const absPath = path.isAbsolute(ref.path) ? ref.path : path.resolve(this.root, ref.path);
    const lstat = fs.existsSync(absPath) ? fs.lstatSync(absPath) : null;
    if (!lstat || lstat.isSymbolicLink() || !lstat.isFile()) {
      if (lstat && lstat.isSymbolicLink()) {
        throw this.fail('ERR_EVIDENCE_SYMLINK', `Artefacto de evidencia '${slot}' no puede ser un symlink: ${ref.path}`);
      }
      throw this.fail('ERR_EVIDENCE_MISSING', `Artefacto de evidencia '${slot}' no existe o no es un archivo: ${ref.path}`);
    }

    // La ruta real debe permanecer dentro de la raíz (sin escapes por symlink en ancestros).
    const realRoot = fs.realpathSync(this.root);
    const realAbs = fs.realpathSync(absPath);
    const relReal = path.relative(realRoot, realAbs);
    if (relReal.startsWith('..') || path.isAbsolute(relReal)) {
      throw this.fail('ERR_EVIDENCE_ESCAPE', `Artefacto de evidencia '${slot}' resuelve fuera de la raíz: ${ref.path}`);
    }

    // Lectura única: el mismo buffer se hashea y se parsea (sin TOCTOU entre hash y parseo).
    const content = fs.readFileSync(absPath);
    const actualSha256 = crypto.createHash('sha256').update(content).digest('hex');
    if (ref.sha256 !== actualSha256) {
      throw this.fail('ERR_EVIDENCE_HASH_MISMATCH',
        `Hash declarado para '${slot}' no coincide con el archivo (${actualSha256}).`);
    }

    let parsed;
    try {
      parsed = JSON.parse(content.toString('utf8'));
    } catch (parseErr) {
      throw this.fail('ERR_EVIDENCE_INVALID', `Artefacto '${slot}' no es JSON válido: ${parseErr.message}`);
    }

    if (parsed.schema !== expectedSchema) {
      throw this.fail('ERR_EVIDENCE_SCHEMA_MISMATCH',
        `Artefacto '${slot}' declara schema '${String(parsed.schema)}'; se esperaba '${expectedSchema}'.`);
    }

    if (parsed.producer !== expectedProducer) {
      throw this.fail('ERR_EVIDENCE_PRODUCER_MISMATCH',
        `Artefacto '${slot}' declara productor '${String(parsed.producer)}'; se esperaba '${expectedProducer}'.`);
    }

    return {
      slot,
      uri: path.relative(this.root, absPath).split(path.sep).join('/'),
      sha256: actualSha256,
      bytes: fs.statSync(absPath).size,
      parsed
    };
  }

  /**
   * Verifica el ledger de evidencia completo (cadena + firmas con la clave local).
   */
  verifyEvidenceLedger() {
    const { verifyLedger } = require('./evidence_ledger.js');
    const { publicKeyPem } = this.loadKeyPair();
    return verifyLedger(this.root, publicKeyPem);
  }

  /**
   * Evalúa la evidencia. `VERIFIED` exige una ejecución real con exit 0, cero fallos,
   * SHA-256 declarado y una entrada en el ledger encadenado y firmada por el productor.
   */
  evaluateEvidence(evidence) {
    if (!evidence || typeof evidence !== 'object') {
      return {
        status: 'UNVERIFIED',
        artifacts: [],
        ledger: { valid: false, entries: 0, reason: 'sin evidencia aportada' },
        reason: 'No se aportó evidencia de ejecución.'
      };
    }

    const artifacts = [];
    const problems = [];

    for (const slot of EVIDENCE_SLOTS) {
      if (evidence[slot]) {
        artifacts.push(this.loadEvidenceArtifact(slot, evidence));
      }
    }

    const ledger = this.verifyEvidenceLedger();
    if (!ledger.valid) {
      problems.push(`Ledger de evidencia inválido: ${ledger.reason}.`);
    }

    const bindToLedger = (artifact) => {
      if (!artifact) return null;
      if (!ledger.valid) return null;
      const entry = ledger.entries.find(
        (e) => e.artifactSha256 === artifact.sha256 && e.producer === artifact.parsed.producer
      );
      if (!entry) {
        problems.push(`Evidencia '${artifact.slot}' sin entrada de ledger firmada por su productor.`);
        return null;
      }
      artifact.ledgerSeq = entry.seq;
      artifact.ledgerRecordedAt = entry.recordedAt;
      return entry;
    };

    const testRun = artifacts.find((a) => a.slot === 'testRun');
    const vibeGuard = artifacts.find((a) => a.slot === 'vibeGuard');
    const testRunEntry = bindToLedger(testRun);
    const vibeGuardEntry = bindToLedger(vibeGuard);

    let testRunVerified = false;
    if (testRun) {
      const p = testRun.parsed;
      const suites = p.suites && typeof p.suites === 'object' ? p.suites : {};
      const total = Number(suites.total);
      const passed = Number(suites.passed);
      const failed = Number(suites.failed);
      testRunVerified = p.exitCode === 0 && failed === 0 && total > 0 && passed === total && Boolean(testRunEntry);
      if (!testRunVerified && !testRunEntry) {
        problems.push('testRun no está registrado en el ledger firmado.');
      } else if (!testRunVerified) {
        problems.push(`testRun no acredita éxito real (exitCode=${p.exitCode}, total=${suites.total}, passed=${suites.passed}, failed=${suites.failed}).`);
      }
    } else {
      problems.push('Falta evidencia de ejecución de la suite (testRun).');
    }

    let vibeGuardVerified = false;
    if (vibeGuard) {
      const p = vibeGuard.parsed;
      vibeGuardVerified = p.pass === true && Number(p.findings) === 0 && Boolean(vibeGuardEntry);
      if (!vibeGuardVerified) {
        problems.push(`vibeGuard no acredita limpieza registrada en ledger (pass=${p.pass}, findings=${p.findings}).`);
      }
    }

    // La evidencia externa, aun firmada y registrada en el ledger, NO acredita ejecución
    // observada por el firmante. El máximo estado posible es EXTERNAL_EVIDENCE y no se
    // publican métricas de gobierno desde un archivo: VERIFIED solo se emite ejecutando
    // la suite dentro de este componente (runSuiteAndAttest).
    const structurallyBound = testRunVerified;
    const status = structurallyBound ? 'EXTERNAL_EVIDENCE' : 'UNVERIFIED';
    return {
      status,
      reason: structurallyBound
        ? 'Evidencia externa firmada y registrada; no observada por el firmante (no acredita ejecución).'
        : problems.join(' '),
      artifacts,
      testRun: null,
      vibeGuard: null,
      externalEvidence: structurallyBound
        ? {
            trust: 'REGISTERED_NOT_OBSERVED',
            producer: testRun.parsed.producer,
            runner: testRun.parsed.runner,
            suites: testRun.parsed.suites,
            exitCode: testRun.parsed.exitCode,
            ledgerSeq: testRun.ledgerSeq || null
          }
        : null,
      ledger: { valid: ledger.valid, entries: ledger.entries.length, reason: ledger.reason || null },
      assurance: 'EVIDENCE_BOUND+LEDGER_SIGNED_NOT_EXECUTED',
      limitation: 'La firma acredita autoría y registro; la ejecución no fue observada por el firmante. VERIFIED solo se emite ejecutando la suite dentro de este componente.'
    };
  }

  buildCallerClaims(sessionData = {}) {
    // Métricas aportadas por el llamador: se registran como claims no verificados,
    // nunca como hechos. El llamador no puede acreditar resultados por sí mismo.
    const callerClaims = {};
    for (const key of ['suitesPassed', 'chaosVectorsBlocked', 'converged']) {
      if (Object.prototype.hasOwnProperty.call(sessionData, key)) {
        callerClaims[key] = sessionData[key];
      }
    }
    return Object.keys(callerClaims).length > 0
      ? { trust: 'CALLER_ASSERTED', values: callerClaims }
      : null;
  }

  buildSigner() {
    return this.keyring.buildSigner();
  }

  /**
   * Construye, firma y persiste el sobre DSSE in-toto v1.
   */
  emitStatement({ mission, verification, governance, unverifiedClaims, merkle }) {
    const { publicKeyPem, privateKeyPem } = this.loadKeyPair();
    const keyId = this.keyIdFor(publicKeyPem);

    const statement = {
      _type: 'https://in-toto.io/Statement/v1',
      subject: [
        {
          name: 'axion-protocol-workspace',
          digest: {
            sha256: merkle.merkleRoot
          }
        }
      ],
      predicateType: 'https://axion.dev/attestations/drive-session/v1',
      predicate: {
        mission,
        verification,
        governance,
        unverifiedClaims,
        runtime: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch
        }
      }
    };

    const payloadType = 'application/vnd.in-toto+json';
    const payloadJson = JSON.stringify(statement);
    const payloadBuffer = Buffer.from(payloadJson, 'utf8');
    const paeBuffer = this.dssePae(payloadType, payloadBuffer);

    const signatureBuffer = crypto.sign(null, paeBuffer, privateKeyPem);

    const dsseEnvelope = {
      payloadType,
      payload: payloadBuffer.toString('base64'),
      signatures: [
        {
          keyid: `ed25519:${keyId}`,
          sig: signatureBuffer.toString('base64')
        }
      ]
    };

    const envelopeDigest = crypto.createHash('sha256').update(JSON.stringify(dsseEnvelope)).digest('hex');
    const attestationPath = path.join(this.attestDir, `drive-session-${envelopeDigest.slice(0, 16)}.dsse.json`);
    const tmpPath = `${attestationPath}.tmp-${process.pid}`;
    fs.writeFileSync(tmpPath, JSON.stringify(dsseEnvelope, null, 2), 'utf8');
    fs.renameSync(tmpPath, attestationPath);

    return {
      attestationPath,
      envelopeDigest,
      keyId,
      merkleRoot: merkle.merkleRoot,
      verificationStatus: verification.status,
      dsseEnvelope
    };
  }

  /**
   * Emite una atestación in-toto v1 para evidencia externa aportada.
   * Nunca emite VERIFIED: la ejecución no es observada por el firmante.
   */
  attestSession(sessionData = {}) {
    const {
      missionId = `mission_${Date.now()}`,
      title = 'Sesión Autónoma /drive',
      iterations = 1,
      evidence = null
    } = sessionData;

    const merkle = new MerkleCacheEngine(this.root).computeMerkleRoot();
    const verification = this.evaluateEvidence(evidence);

    const verificationBlock = {
      status: verification.status,
      mode: 'EXTERNAL_EVIDENCE',
      assurance: verification.assurance,
      reason: verification.reason,
      limitation: verification.limitation,
      ledger: {
        valid: verification.ledger.valid,
        entries: verification.ledger.entries,
        reason: verification.ledger.reason
      },
      evidence: verification.artifacts.map((a) => ({
        slot: a.slot,
        uri: a.uri,
        sha256: a.sha256,
        bytes: a.bytes,
        producer: a.parsed.producer,
        ledgerSeq: a.ledgerSeq || null
      })),
      externalEvidence: verification.externalEvidence
    };

    return this.emitStatement({
      mission: {
        missionId,
        title,
        converged: null,
        iterations,
        timestamp: new Date().toISOString()
      },
      verification: verificationBlock,
      governance: {
        suitesPassed: null,
        suitesTotal: null,
        suitesFailed: null,
        testRunExitCode: null,
        testRunCommand: null,
        testRunFinishedAt: null,
        vibeGuardStrictClean: null,
        vibeGuardFindings: null,
        vibeGuardFinishedAt: null,
        trackedFilesCount: merkle.filesCount
      },
      unverifiedClaims: this.buildCallerClaims(sessionData),
      merkle
    });
  }

  /**
   * Ejecuta la suite DENTRO del componente firmante y solo entonces puede emitir
   * VERIFIED. Las cifras y el veredicto provienen de la observación directa del
   * proceso (exit code + salida), nunca de parámetros del llamador.
   *
   * Fail-closed estricto:
   * - El ledger se valida antes de anexar y después de anexar; cualquier fallo bloquea VERIFIED.
   * - Se sella el Merkle Root antes y después de la ejecución; si el árbol mutó durante
   *   la corrida, el sellado posterior no puede representar la prueba y VERIFIED se bloquea.
   */
  async runSuiteAndAttest(sessionData = {}, options = {}) {
    const { spawn } = require('child_process');
    const { detectarVerificador, parseSuiteCounts } = require('./verify_changes.js');
    const { recordEvidence } = require('./evidence_ledger.js');
    const { killTree } = require('./process_tree.js');

    const {
      missionId = `mission_${Date.now()}`,
      title = 'Sesión verificada por ejecución',
      iterations = 1
    } = sessionData;

    const runner = detectarVerificador(this.root);
    if (!runner) {
      throw this.fail('ERR_RUNNER_NOT_FOUND', `No hay suite ejecutable en ${this.root} (ni tests/run_all.js ni script test).`);
    }
    // Fail-fast: sin claves no tiene sentido ejecutar la suite para luego no poder firmar.
    this.loadKeyPair();

    const merkleEngine = new MerkleCacheEngine(this.root);
    const merkleBefore = merkleEngine.computeMerkleRoot();
    const ledgerBefore = this.verifyEvidenceLedger();

    const timeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0
      ? options.timeoutMs
      : 10 * 60 * 1000;

    const startedAtMs = Date.now();
    const ejecucion = await new Promise((resolve) => {
      const child = spawn(runner.executable, runner.args, {
        cwd: this.root,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: process.platform !== 'win32'
      });
      let salida = '';
      let settled = false;
      const finalizar = (resultado) => {
        if (settled) return;
        settled = true;
        clearTimeout(watchdog);
        resolve({ ...resultado, output: salida, elapsedMs: Date.now() - startedAtMs });
      };
      const watchdog = setTimeout(() => {
        const kill = killTree(child, { graceMs: 400 });
        try { child.stdout.destroy(); } catch (_) { /* stream ya cerrado */ }
        try { child.stderr.destroy(); } catch (_) { /* stream ya cerrado */ }
        finalizar({ timeout: true, kill, error: `Timeout de ejecución (${timeoutMs}ms); árbol terminado vía ${kill.method}` });
      }, timeoutMs);
      child.stdout.on('data', (d) => { salida += d; });
      child.stderr.on('data', (d) => { salida += d; });
      child.on('error', (err) => finalizar({ timeout: false, error: `spawn error: ${err.message}` }));
      child.on('close', (code, signal) => {
        if (signal) {
          finalizar({ timeout: false, signal, error: `Terminado por señal ${signal}` });
          return;
        }
        finalizar({ timeout: false, signal: null, exitCode: typeof code === 'number' ? code : null, error: null });
      });
    });

    const finishedAtMs = startedAtMs + ejecucion.elapsedMs;
    const output = ejecucion.output;
    const suites = parseSuiteCounts(output);
    const exitCode = typeof ejecucion.exitCode === 'number' ? ejecucion.exitCode : null;
    const ranGreen = !ejecucion.timeout && !ejecucion.error && exitCode === 0
      && suites.total > 0 && suites.failed === 0 && suites.passed === suites.total;
    const command = `${path.basename(runner.executable)} ${runner.args.join(' ')}`;

    const merkleAfter = merkleEngine.computeMerkleRoot();
    const treeStable = merkleBefore.readErrors.length === 0
      && merkleAfter.readErrors.length === 0
      && merkleBefore.merkleRoot === merkleAfter.merkleRoot;

    // Solo se anexa con ledger íntegro; anexar a una cadena rota lanzaría ERR_LEDGER_INVALID.
    let produced = null;
    let ledgerAfter = ledgerBefore;
    if (ledgerBefore.valid) {
      try {
        produced = recordEvidence(this.root, {
          schema: 'axion.execution/v1',
          producer: 'tools/drive_dsse_attester.js',
          runner: runner.etiqueta,
          command,
          exitCode: exitCode === null ? 1 : exitCode,
          status: ranGreen ? 'PASS' : 'FAIL',
          suites,
          startedAt: new Date(startedAtMs).toISOString(),
          finishedAt: new Date(finishedAtMs).toISOString(),
          durationMs: finishedAtMs - startedAtMs,
          outputSha256: crypto.createHash('sha256').update(output).digest('hex'),
          signer: this.buildSigner()
        });
        ledgerAfter = this.verifyEvidenceLedger();
      } catch (appendErr) {
        produced = null;
        ledgerAfter = {
          valid: false,
          entries: ledgerBefore.entries.length,
          reason: `${appendErr.code || 'ERROR'}: ${appendErr.message}`
        };
      }
    }

    const verified = ranGreen && treeStable && ledgerAfter.valid;
    const reasons = [];
    if (!ranGreen) reasons.push(`ejecución no superada (error=${ejecucion.error || 'ninguno'}, exitCode=${exitCode}, total=${suites.total}, passed=${suites.passed}, failed=${suites.failed})`);
    if (!treeStable) reasons.push('el árbol rastreado cambió durante la ejecución; el sellado posterior no representa el estado probado');
    if (!ledgerAfter.valid) reasons.push(`ledger inválido (${ledgerAfter.reason || 'cadena no verificable'})`);

    return this.emitStatement({
      mission: {
        missionId,
        title,
        converged: verified,
        iterations,
        timestamp: new Date().toISOString()
      },
      verification: {
        status: verified ? 'VERIFIED' : 'UNVERIFIED',
        mode: 'EXECUTED_IN_SIGNER',
        assurance: 'EXECUTED_IN_SIGNER',
        reason: verified
          ? 'Suite ejecutada y observada por el firmante (exit code 0, cero fallos) con árbol estable y ledger íntegro.'
          : `No verificado: ${reasons.join('; ')}.`,
        limitation: 'La ejecución fue observada por este proceso y el árbol sellado antes/después coincide; sustituir archivos durante la corrida o la suite en disco antes de ella queda fuera del perímetro de confianza.',
        tree: {
          stable: treeStable,
          merkleBefore: merkleBefore.merkleRoot,
          merkleAfter: merkleAfter.merkleRoot,
          readErrors: merkleBefore.readErrors.length + merkleAfter.readErrors.length
        },
        ledger: {
          valid: ledgerAfter.valid,
          verifiedBefore: ledgerBefore.valid,
          entries: ledgerAfter.entries.length,
          reason: ledgerAfter.reason || null
        },
        evidence: produced
          ? [{
              slot: 'testRun',
              uri: produced.relPath,
              sha256: produced.sha256,
              bytes: produced.bytes,
              producer: 'tools/drive_dsse_attester.js',
              ledgerSeq: produced.entry.seq
            }]
          : [],
        externalEvidence: null
      },
      governance: {
        suitesPassed: exitCode === null ? null : suites.passed,
        suitesTotal: exitCode === null ? null : suites.total,
        suitesFailed: exitCode === null ? null : suites.failed,
        testRunExitCode: exitCode,
        testRunCommand: runner.etiqueta,
        testRunFinishedAt: new Date(finishedAtMs).toISOString(),
        vibeGuardStrictClean: null,
        vibeGuardFindings: null,
        vibeGuardFinishedAt: null,
        trackedFilesCount: merkleAfter.filesCount
      },
      unverifiedClaims: this.buildCallerClaims(sessionData),
      merkle: merkleAfter
    });
  }

  /**
   * Alias de conveniencia para emitir atestación.
   */
  emitAttestation(sessionData = {}) {
    return this.attestSession(sessionData);
  }

  /**
   * Verifica matemáticamente un sobre DSSE in-toto v1 con la clave pública local.
   */
  verifyAttestation(dsseEnvelope) {
    if (!dsseEnvelope || !dsseEnvelope.payload || !dsseEnvelope.signatures || dsseEnvelope.signatures.length === 0) {
      return { valid: false, reason: 'Sobre DSSE incompleto o inválido' };
    }

    const { publicKeyPem } = this.loadKeyPair();
    const expectedKeyId = `ed25519:${this.keyIdFor(publicKeyPem)}`;
    const sigObj = dsseEnvelope.signatures[0];

    if (sigObj.keyid !== expectedKeyId) {
      return { valid: false, keyId: sigObj.keyid, reason: 'keyid no corresponde a la clave pública local.' };
    }

    const payloadBuffer = Buffer.from(dsseEnvelope.payload, 'base64');
    const paeBuffer = this.dssePae(dsseEnvelope.payloadType, payloadBuffer);
    const sigBuffer = Buffer.from(sigObj.sig, 'base64');

    const isValid = crypto.verify(null, paeBuffer, publicKeyPem, sigBuffer);

    let statement = null;
    try {
      statement = JSON.parse(payloadBuffer.toString('utf8'));
    } catch (parseErr) {
      statement = { error: parseErr.message };
    }

    return {
      valid: isValid,
      keyId: sigObj.keyid,
      statement,
      reason: isValid ? 'Firma Ed25519 DSSE verificada' : 'Firma criptográfica inválida'
    };
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const iTarget = args.indexOf('--target');
  const targetDir = iTarget !== -1 && args[iTarget + 1] ? path.resolve(args[iTarget + 1]) : ROOT;
  const attester = new DriveDsseAttester(targetDir);

  if (args.includes('--init-keys')) {
    try {
      const res = attester.generateKeyPair();
      console.log(`✓ Par de claves Ed25519 generado explícitamente (keyid ed25519:${res.keyId}).`);
      console.log(`  Directorio: ${res.keysDir}`);
      process.exit(0);
    } catch (err) {
      console.error(`✗ ${err.code || 'ERROR'}: ${err.message}`);
      process.exit(2);
    }
  }

  if (args.includes('--run-suite')) {
    const iTimeout = args.indexOf('--timeout');
    const timeoutMs = iTimeout !== -1 && args[iTimeout + 1] ? Number(args[iTimeout + 1]) : undefined;
    (async () => {
      try {
        const res = await attester.runSuiteAndAttest({
          missionId: 'MISSION_EXECUTED_IN_SIGNER',
          title: 'Sellado por ejecución dentro del firmante'
        }, { timeoutMs });
        console.log(`  Archivo sellado: ${res.attestationPath}`);
        console.log(`  Merkle Root:     ${res.merkleRoot}`);
        console.log(`  Key ID:          ed25519:${res.keyId}`);
        console.log(`  Verificación:    ${res.verificationStatus}`);
        process.exit(res.verificationStatus === 'VERIFIED' ? 0 : 1);
      } catch (err) {
        console.error(`✗ ${err.code || 'ERROR'}: ${err.message}`);
        process.exit(2);
      }
    })();
    return;
  }

  if (args.includes('--verify')) {
    const iEnvelope = args.indexOf('--verify');
    const envelopePath = args[iEnvelope + 1];
    try {
      if (!envelopePath || !fs.existsSync(envelopePath)) {
        throw attester.fail('ERR_ENVELOPE_MISSING', `Sobre DSSE no encontrado: ${String(envelopePath)}`);
      }
      const envelope = JSON.parse(fs.readFileSync(envelopePath, 'utf8'));
      const verificacion = attester.verifyAttestation(envelope);
      const merkle = new MerkleCacheEngine(attester.root).computeMerkleRoot();
      const subjectDigest = verificacion.statement && Array.isArray(verificacion.statement.subject) && verificacion.statement.subject[0]
        ? (verificacion.statement.subject[0].digest || {}).sha256 || null
        : null;
      const subjectMatches = Boolean(subjectDigest && subjectDigest === merkle.merkleRoot);
      const salida = {
        valid: verificacion.valid,
        keyId: verificacion.keyId,
        subjectSha256: subjectDigest,
        targetMerkleRoot: merkle.merkleRoot,
        subjectMatches,
        target: attester.root,
        reason: verificacion.reason
      };
      console.log(JSON.stringify(salida, null, 2));
      process.exit(verificacion.valid && subjectMatches ? 0 : 1);
    } catch (err) {
      console.error(`✗ ${err.code || 'ERROR'}: ${err.message}`);
      process.exit(2);
    }
  }

  console.log('[Axion DSSE Attester] Emitiendo atestación in-toto v1 con firma Ed25519:');
  const evidenceIndex = args.indexOf('--evidence');
  const evidencePath = evidenceIndex !== -1 ? args[evidenceIndex + 1] : null;
  const evidenceShaIndex = args.indexOf('--evidence-sha');
  const evidenceShaArg = evidenceShaIndex !== -1 ? args[evidenceShaIndex + 1] : null;

  try {
    let evidence = null;
    if (evidencePath) {
      // La referencia exige SHA-256: se calcula del archivo y, si el llamador lo
      // declara, debe coincidir con el real.
      const absPath = path.isAbsolute(evidencePath) ? evidencePath : path.resolve(process.cwd(), evidencePath);
      if (!fs.existsSync(absPath)) {
        throw attester.fail('ERR_EVIDENCE_MISSING', `Artefacto de evidencia no existe: ${evidencePath}`);
      }
      const actualSha = crypto.createHash('sha256').update(fs.readFileSync(absPath)).digest('hex');
      if (evidenceShaArg && evidenceShaArg !== actualSha) {
        throw attester.fail('ERR_EVIDENCE_HASH_MISMATCH', `--evidence-sha no coincide con el archivo (${actualSha}).`);
      }
      evidence = { testRun: { path: absPath, sha256: actualSha } };
    }

    const res = attester.attestSession({
      missionId: 'MISSION_CRYPTO_SEAL',
      title: 'Sellado Criptográfico de Sesión /drive',
      evidence
    });

    console.log(`  Archivo sellado: ${res.attestationPath}`);
    console.log(`  Merkle Root:     ${res.merkleRoot}`);
    console.log(`  Key ID:          ed25519:${res.keyId}`);
    console.log(`  Verificación:    ${res.verificationStatus}`);

    const verifyRes = attester.verifyAttestation(res.dsseEnvelope);
    console.log(`\n[Axion DSSE Attester] Verificando firma criptográfica:`);
    console.log(`  Resultado:       [${verifyRes.valid ? 'PASS' : 'FAIL'}] · ${verifyRes.reason}`);
  } catch (err) {
    console.error(`✗ ${err.code || 'ERROR'}: ${err.message}`);
    process.exit(2);
  }
}

module.exports = DriveDsseAttester;
