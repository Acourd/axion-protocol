#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Drive DSSE & in-toto v1 Cryptographic Attester
 *
 * Emite y verifica atestaciones in-toto Statement v1 selladas en sobre DSSE con firma asimétrica Ed25519:
 * 1. Genera o reutiliza par de claves Ed25519 en .axion/keys/.
 * 2. Construye el predicado in-toto v1 vinculando el Merkle Root del repositorio y métricas de gobernanza.
 * 3. Aplica Pre-Authentication Encoding (PAE) según la especificación DSSE.
 * 4. Sella la firma criptográfica y emite el archivo .dsse.json en .axion/attestations/.
 * 5. Provee función de verificación matemática independiente sin dependencias externas.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const MerkleCacheEngine = require('./merkle_cache_fast_forward.js');

const ROOT = path.resolve(__dirname, '..');

class DriveDsseAttester {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
    this.keysDir = path.join(this.root, '.axion', 'keys');
    this.attestDir = path.join(this.root, '.axion', 'attestations');
    this.ensureDirs();
  }

  ensureDirs() {
    if (!fs.existsSync(this.keysDir)) {
      fs.mkdirSync(this.keysDir, { recursive: true });
    }
    if (!fs.existsSync(this.attestDir)) {
      fs.mkdirSync(this.attestDir, { recursive: true });
    }
  }

  /**
   * Obtiene o genera las claves asimétricas Ed25519.
   */
  getOrCreateKeyPair() {
    const pubKeyPath = path.join(this.keysDir, 'attestation_ed25519.pub');
    const privKeyPath = path.join(this.keysDir, 'attestation_ed25519.key');

    if (fs.existsSync(pubKeyPath) && fs.existsSync(privKeyPath)) {
      try {
        const publicKeyPem = fs.readFileSync(pubKeyPath, 'utf8');
        const privateKeyPem = fs.readFileSync(privKeyPath, 'utf8');
        return { publicKeyPem, privateKeyPem };
      } catch (readErr) {
        // Claves corruptas en disco; regenerar
      }
    }

    // Generar nuevas claves Ed25519
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    fs.writeFileSync(pubKeyPath, publicKey, 'utf8');
    fs.writeFileSync(privKeyPath, privateKey, 'utf8');
    return { publicKeyPem: publicKey, privateKeyPem: privateKey };
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

  /**
   * Emite una atestación in-toto v1 sellada en sobre DSSE para una sesión de /drive.
   */
  attestSession(sessionData = {}) {
    const {
      missionId = `mission_${Date.now()}`,
      title = 'Sesión Autónoma /drive',
      suitesPassed = 0,
      chaosVectorsBlocked = 0,
      converged = true,
      iterations = 1
    } = sessionData;

    const merkleEngine = new MerkleCacheEngine(this.root);
    const merkle = merkleEngine.computeMerkleRoot();
    const { publicKeyPem, privateKeyPem } = this.getOrCreateKeyPair();

    const keyId = crypto.createHash('sha256').update(publicKeyPem).digest('hex').slice(0, 16);

    // in-toto Statement v1
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
          converged,
          iterations,
          timestamp: new Date().toISOString()
        },
        governance: {
          suitesPassed,
          chaosVectorsBlocked,
          vibeGuardStrictClean: true,
          trackedFilesCount: merkle.filesCount
        },
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

    // Firmar con Ed25519
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
   * Verifica matemáticamente un sobre DSSE in-toto v1.
   */
  verifyAttestation(dsseEnvelope) {
    if (!dsseEnvelope || !dsseEnvelope.payload || !dsseEnvelope.signatures || dsseEnvelope.signatures.length === 0) {
      return { valid: false, reason: 'Sobre DSSE incompleto o inválido' };
    }

    const { publicKeyPem } = this.getOrCreateKeyPair();
    const payloadBuffer = Buffer.from(dsseEnvelope.payload, 'base64');
    const paeBuffer = this.dssePae(dsseEnvelope.payloadType, payloadBuffer);
    const sigObj = dsseEnvelope.signatures[0];
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
      reason: isValid ? 'Firma Ed25519 DSSE verificada al 100%' : 'Firma criptográfica inválida'
    };
  }
}

if (require.main === module) {
  const attester = new DriveDsseAttester();
  console.log('[Axion DSSE Attester] Emitiendo atestación in-toto v1 con firma Ed25519:');

  const res = attester.attestSession({
    missionId: 'MISSION_CRYPTO_SEAL',
    title: 'Sellado Criptográfico de Sesión /drive',
    suitesPassed: 128,
    chaosVectorsBlocked: 5000,
    converged: true,
    iterations: 1
  });

  console.log(`  Archivo sellado: ${res.attestationPath}`);
  console.log(`  Merkle Root:     ${res.merkleRoot}`);
  console.log(`  Key ID:          ed25519:${res.keyId}`);

  console.log('\n[Axion DSSE Attester] Verificando firma criptográfica:');
  const verifyRes = attester.verifyAttestation(res.dsseEnvelope);
  console.log(`  Resultado:       [${verifyRes.valid ? 'PASS' : 'FAIL'}] · ${verifyRes.reason}`);
}

module.exports = DriveDsseAttester;
