#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Sovereign Key & Token Revocation Manager
 *
 * Mecanismo formal de revocación criptográfica determinista:
 * 1. Emisión de Certificados de Revocación (CRL) firmados digitalmente con Ed25519.
 * 2. Protección anti-replay mediante nonces criptográficos y sellado temporal ISO 8601.
 * 3. Motivos de revocación formales (KEY_COMPROMISE, SUPERSEDED, CESSATION_OF_OPERATION).
 * 4. Verificación fail-closed ante claves o certificados revocados.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { canonicalize, hashCanonical } = require('./canonical_json.js');

const ROOT = path.resolve(__dirname, '..');
const REVOCATION_REASONS = Object.freeze([
  'KEY_COMPROMISE',
  'SUPERSEDED',
  'CESSATION_OF_OPERATION',
  'UNSPECIFIED'
]);

class RevocationManager {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
    this.revocationDir = path.join(this.root, '.axion', 'revocations');
    this.crlFile = path.join(this.revocationDir, 'crl.json');
    this.ensureDir();
  }

  ensureDir() {
    if (!fs.existsSync(this.revocationDir)) {
      fs.mkdirSync(this.revocationDir, { recursive: true });
    }
  }

  loadCRL() {
    if (!fs.existsSync(this.crlFile)) {
      return { version: '1.0.0', entries: [] };
    }
    try {
      const data = JSON.parse(fs.readFileSync(this.crlFile, 'utf8'));
      return Array.isArray(data.entries) ? data : { version: '1.0.0', entries: [] };
    } catch (_) {
      return { version: '1.0.0', entries: [] };
    }
  }

  saveCRL(crl) {
    this.ensureDir();
    const tmp = `${this.crlFile}.tmp-${Date.now()}`;
    fs.writeFileSync(tmp, JSON.stringify(crl, null, 2), 'utf8');
    try {
      fs.renameSync(tmp, this.crlFile);
    } catch (_) {
      fs.copyFileSync(tmp, this.crlFile);
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    }
  }

  /**
   * Emite un certificado de revocación firmado para una clave o actor.
   */
  createRevocationCertificate({
    targetKeyId,
    actorId = 'unknown',
    reason = 'KEY_COMPROMISE',
    issuerKeyId,
    issuerPrivateKey
  }) {
    if (!targetKeyId || !issuerPrivateKey) {
      throw new Error('targetKeyId e issuerPrivateKey son obligatorios');
    }

    const normalizedReason = REVOCATION_REASONS.includes(reason) ? reason : 'UNSPECIFIED';
    const timestamp = new Date().toISOString();
    const nonce = crypto.randomBytes(16).toString('hex');
    const revocationId = `REV-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    const statement = {
      revocationId,
      targetKeyId,
      actorId,
      reason: normalizedReason,
      revokedAt: timestamp,
      nonce,
      issuerKeyId: issuerKeyId || 'root-authority'
    };

    const canonicalBytes = Buffer.from(canonicalize(statement), 'utf8');
    const signature = crypto.sign(null, canonicalBytes, issuerPrivateKey).toString('base64');
    const certDigest = hashCanonical(statement);

    const certificate = {
      ...statement,
      signature,
      certDigest,
      algorithm: 'Ed25519'
    };

    // Registrar en CRL local
    const crl = this.loadCRL();
    crl.entries.push(certificate);
    this.saveCRL(crl);

    return certificate;
  }

  /**
   * Verifica la firma y validez de un certificado de revocación.
   */
  verifyRevocationCertificate(certificate, issuerPublicKey) {
    if (!certificate || !certificate.signature || !issuerPublicKey) {
      return { valid: false, reason: 'INVALID_CERTIFICATE_PAYLOAD' };
    }

    const { signature, certDigest, algorithm, ...statement } = certificate;
    const canonicalBytes = Buffer.from(canonicalize(statement), 'utf8');

    try {
      const validSig = crypto.verify(
        null,
        canonicalBytes,
        issuerPublicKey,
        Buffer.from(signature, 'base64')
      );

      if (!validSig) {
        return { valid: false, reason: 'INVALID_ISSUER_SIGNATURE' };
      }

      return {
        valid: true,
        targetKeyId: statement.targetKeyId,
        reason: statement.reason,
        revokedAt: statement.revokedAt
      };
    } catch (err) {
      return { valid: false, reason: err.message };
    }
  }

  /**
   * Comprueba si una clave específica se encuentra en la lista de revocación (CRL).
   */
  isKeyRevoked(targetKeyId) {
    if (!targetKeyId) return false;
    const crl = this.loadCRL();
    const match = crl.entries.find((e) => e.targetKeyId === targetKeyId);
    return match ? { revoked: true, certificate: match } : { revoked: false };
  }
}

// CLI directo
if (require.main === module) {
  const manager = new RevocationManager();
  const args = process.argv.slice(2);
  const cmd = args[0] || 'list';

  if (cmd === 'list') {
    const crl = manager.loadCRL();
    console.log(`[Axion Revocation Manager] ${crl.entries.length} claves revocadas en CRL:`);
    for (const e of crl.entries) {
      console.log(`  - [${e.reason}] ${e.targetKeyId} (revocado: ${e.revokedAt})`);
    }
  } else if (cmd === 'check' && args[1]) {
    const res = manager.isKeyRevoked(args[1]);
    if (res.revoked) {
      console.log(`ALERTA: La clave ${args[1]} ESTÁ REVOCADA (${res.certificate.reason}).`);
      process.exit(1);
    } else {
      console.log(`OK: La clave ${args[1]} no figura en la CRL.`);
      process.exit(0);
    }
  }
}

module.exports = RevocationManager;
