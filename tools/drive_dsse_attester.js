#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Drive DSSE & in-toto v1 Cryptographic Attester (Evidence-Bound)
 *
 * Emite y verifica atestaciones in-toto Statement v1 selladas en sobre DSSE con firma
 * asimétrica Ed25519:
 * 1. Carga claves Ed25519 existentes en .axion/keys/. Nunca las regenera en silencio:
 *    si faltan, están corruptas o tienen permisos inseguros, la operación falla.
 * 2. La creación de claves es una acción explícita (`generateKeyPair`/`ensureKeyPair`)
 *    con escritura atómica y permisos restrictivos (0600 en plataformas POSIX).
 * 3. Vincula el predicado a artefactos de evidencia reales (ruta + SHA-256) producidos
 *    por ejecuciones (tools/verify_changes.js, tools/vibeguard_gate.js). Sin evidencia,
 *    la atestación declara `verification.status = 'UNVERIFIED'` y NO afirma éxito.
 * 4. Las métricas que aporte el llamador se registran como claims no verificados;
 *    jamás como hechos ni como `true` fijo.
 *
 * La firma prueba QUIÉN firmó el JSON; la evidencia prueba A QUÉ se ancla.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const MerkleCacheEngine = require('./merkle_cache_fast_forward.js');

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
    this.ensureDirs();
  }

  ensureDirs() {
    if (!fs.existsSync(this.keysDir)) {
      fs.mkdirSync(this.keysDir, { recursive: true, mode: 0o700 });
    }
    if (!fs.existsSync(this.attestDir)) {
      fs.mkdirSync(this.attestDir, { recursive: true });
    }
  }

  privKeyPath() {
    return path.join(this.keysDir, 'attestation_ed25519.key');
  }

  pubKeyPath() {
    return path.join(this.keysDir, 'attestation_ed25519.pub');
  }

  keyIdFor(publicKeyPem) {
    return crypto.createHash('sha256').update(publicKeyPem).digest('hex').slice(0, 16);
  }

  fail(code, message) {
    const err = new Error(message);
    err.code = code;
    return err;
  }

  /**
   * En POSIX el material privado no puede ser legible por grupo/otros.
   * En Windows los modos POSIX no aplican: se documenta y se omite el chequeo.
   */
  assertSecurePermissions(keyPath) {
    if (process.platform === 'win32') return;
    const stat = fs.statSync(keyPath);
    const mode = stat.mode & 0o777;
    if ((mode & 0o077) !== 0) {
      throw this.fail('ERR_KEYS_INSECURE_PERMISSIONS',
        `Clave privada ${keyPath} con permisos inseguros (${mode.toString(8)}). Se exige 0600; no se repara ni se rota en silencio.`);
    }
  }

  /**
   * Carga y valida el par de claves. Falla explícitamente si no existe, si está
   * incompleto, si el PEM no es válido o si la clave pública no corresponde.
   */
  loadKeyPair() {
    const privPath = this.privKeyPath();
    const pubPath = this.pubKeyPath();
    const hasPriv = fs.existsSync(privPath);
    const hasPub = fs.existsSync(pubPath);

    if (!hasPriv && !hasPub) {
      throw this.fail('ERR_KEYS_MISSING',
        `No existen claves de atestación en ${this.keysDir}. Genera un par explícito con: node tools/drive_dsse_attester.js --init-keys`);
    }
    if (!hasPriv || !hasPub) {
      throw this.fail('ERR_KEYS_INCOMPLETE',
        `Par de claves incompleto en ${this.keysDir} (priv=${hasPriv}, pub=${hasPub}). No se rota ni se completa en silencio.`);
    }

    const privateKeyPem = fs.readFileSync(privPath, 'utf8');
    const publicKeyPem = fs.readFileSync(pubPath, 'utf8');

    let derivedPublicPem;
    try {
      const privateKey = crypto.createPrivateKey(privateKeyPem);
      derivedPublicPem = crypto.createPublicKey(privateKey).export({ type: 'spki', format: 'pem' });
    } catch (parseErr) {
      throw this.fail('ERR_KEYS_CORRUPT', `Clave privada ilegible en ${privPath}: ${parseErr.message}`);
    }

    if (derivedPublicPem.trim() !== publicKeyPem.trim()) {
      throw this.fail('ERR_KEYS_CORRUPT', `La clave pública en ${pubPath} no corresponde a la clave privada.`);
    }

    // La validación de permisos va después del parseo: una clave corrupta se reporta
    // como corrupta aunque su modo dependa del umask del proceso que la escribió.
    this.assertSecurePermissions(privPath);

    return { publicKeyPem, privateKeyPem };
  }

  /**
   * Creación explícita de claves. Escritura atómica + permisos restrictivos.
   * Nunca sobrescribe un par existente (no hay rotación silenciosa).
   */
  generateKeyPair() {
    const privPath = this.privKeyPath();
    const pubPath = this.pubKeyPath();

    if (fs.existsSync(privPath) || fs.existsSync(pubPath)) {
      throw this.fail('ERR_KEYS_EXIST',
        `Ya existe material de clave en ${this.keysDir}. La rotación debe ser una decisión explícita y auditada.`);
    }

    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    const privTmp = `${privPath}.tmp-${process.pid}-${Date.now()}`;
    fs.writeFileSync(privTmp, privateKey, { encoding: 'utf8', mode: 0o600 });
    try {
      fs.chmodSync(privTmp, 0o600);
    } catch (_) {
      // Windows no implementa modos POSIX; el archivo queda escrito igualmente.
    }
    fs.renameSync(privTmp, privPath);

    const pubTmp = `${pubPath}.tmp-${process.pid}-${Date.now()}`;
    fs.writeFileSync(pubTmp, publicKey, { encoding: 'utf8', mode: 0o644 });
    fs.renameSync(pubTmp, pubPath);

    return {
      publicKeyPem: publicKey,
      privateKeyPem: privateKey,
      keyId: this.keyIdFor(publicKey),
      created: true,
      keysDir: this.keysDir
    };
  }

  /**
   * Acción explícita idempotente: crear si no existe, validar si existe.
   * No repara claves corruptas ni inseguras: en ese caso falla.
   */
  ensureKeyPair() {
    const privPath = this.privKeyPath();
    const pubPath = this.pubKeyPath();
    if (!fs.existsSync(privPath) && !fs.existsSync(pubPath)) {
      return this.generateKeyPair();
    }
    const pair = this.loadKeyPair();
    return { ...pair, keyId: this.keyIdFor(pair.publicKeyPem), created: false, keysDir: this.keysDir };
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
    if (!fs.existsSync(absPath) || !fs.statSync(absPath).isFile()) {
      throw this.fail('ERR_EVIDENCE_MISSING', `Artefacto de evidencia '${slot}' no existe: ${ref.path}`);
    }

    const actualSha256 = this.sha256File(absPath);
    if (ref.sha256 !== actualSha256) {
      throw this.fail('ERR_EVIDENCE_HASH_MISMATCH',
        `Hash declarado para '${slot}' no coincide con el archivo (${actualSha256}).`);
    }

    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(absPath, 'utf8'));
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

    const status = testRunVerified ? 'VERIFIED' : 'UNVERIFIED';
    return {
      status,
      reason: status === 'VERIFIED' ? 'Evidencia de ejecución real, con SHA declarado y registrada en ledger firmado.' : problems.join(' '),
      artifacts,
      testRun: testRunVerified ? testRun : null,
      vibeGuard: vibeGuardVerified ? vibeGuard : null,
      ledger: { valid: ledger.valid, entries: ledger.entries.length, reason: ledger.reason || null },
      assurance: 'EVIDENCE_BOUND+LEDGER_SIGNED',
      limitation: 'La firma acredita autoría del JSON y del registro; no prueba por sí sola la ejecución frente a un actor con acceso al mismo usuario y a la clave privada local.'
    };
  }

  /**
   * Emite una atestación in-toto v1 sellada en sobre DSSE para una sesión de /drive.
   * Sin evidencia válida emite estado UNVERIFIED y no afirma éxito.
   */
  attestSession(sessionData = {}) {
    const {
      missionId = `mission_${Date.now()}`,
      title = 'Sesión Autónoma /drive',
      iterations = 1,
      evidence = null
    } = sessionData;

    const { publicKeyPem, privateKeyPem } = this.loadKeyPair();
    const keyId = this.keyIdFor(publicKeyPem);

    const merkleEngine = new MerkleCacheEngine(this.root);
    const merkle = merkleEngine.computeMerkleRoot();

    const verification = this.evaluateEvidence(evidence);

    // Métricas aportadas por el llamador: se registran como claims no verificados,
    // nunca como hechos. El llamador no puede acreditar resultados por sí mismo.
    const callerClaims = {};
    for (const key of ['suitesPassed', 'chaosVectorsBlocked', 'converged']) {
      if (Object.prototype.hasOwnProperty.call(sessionData, key)) {
        callerClaims[key] = sessionData[key];
      }
    }

    const testRun = verification.testRun ? verification.testRun.parsed : null;
    const vibeGuard = verification.vibeGuard ? verification.vibeGuard.parsed : null;

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
        mission: {
          missionId,
          title,
          converged: verification.status === 'VERIFIED' ? true : null,
          iterations,
          timestamp: new Date().toISOString()
        },
        verification: {
          status: verification.status,
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
          }))
        },
        governance: {
          suitesPassed: testRun ? Number(testRun.suites.passed) : null,
          suitesTotal: testRun ? Number(testRun.suites.total) : null,
          suitesFailed: testRun ? Number(testRun.suites.failed) : null,
          testRunExitCode: testRun ? testRun.exitCode : null,
          testRunCommand: testRun ? testRun.runner : null,
          testRunFinishedAt: testRun ? testRun.finishedAt : null,
          vibeGuardStrictClean: verification.vibeGuard ? true : null,
          vibeGuardFindings: vibeGuard ? Number(vibeGuard.findings) : null,
          vibeGuardFinishedAt: vibeGuard ? vibeGuard.finishedAt : null,
          trackedFilesCount: merkle.filesCount
        },
        unverifiedClaims: Object.keys(callerClaims).length > 0
          ? { trust: 'CALLER_ASSERTED', values: callerClaims }
          : null,
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
    fs.writeFileSync(attestationPath, JSON.stringify(dsseEnvelope, null, 2), 'utf8');

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
  const attester = new DriveDsseAttester();

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

  console.log('[Axion DSSE Attester] Emitiendo atestación in-toto v1 con firma Ed25519:');
  const evidenceIndex = args.indexOf('--evidence');
  const evidencePath = evidenceIndex !== -1 ? args[evidenceIndex + 1] : null;

  try {
    const res = attester.attestSession({
      missionId: 'MISSION_CRYPTO_SEAL',
      title: 'Sellado Criptográfico de Sesión /drive',
      evidence: evidencePath ? { testRun: { path: evidencePath } } : null
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
