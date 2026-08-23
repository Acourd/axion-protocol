#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createAttestation } = require('./attestation.js');

const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
const pubPem = publicKey.export({ type: 'spki', format: 'pem' });

const manifestHash = crypto.createHash('sha256').update('axion-protocol-v1.2.0-beta-release-manifest').digest('hex');
const bindingHash = crypto.createHash('sha256').update('axion-protocol-v1.2.0-beta-binding').digest('hex');

const verifiedResult = {
  missionId: 'axion-beta-promotion-001',
  status: 'VERIFIED',
  risk: 'LOW',
  evidenceManifest: {
    hash: manifestHash,
    binding_hash: bindingHash
  },
  workflow: {
    history: ['ENTENDER', 'PLANIFICAR', 'GATE', 'TEST', 'CONSTRUIR', 'AUDITAR', 'PROMOVER'],
    version: '1.2.0-beta.0'
  },
  approval: {
    status: 'APPROVED',
    approvalId: 'appr-beta-001',
    actorId: 'authority:adria',
    approvalDigest: manifestHash,
    keyId: 'key:authority-adria-01'
  },
  check: {
    status: 'CHECK_PASSED',
    checkId: 'chk-beta-001',
    actorId: 'evaluator:axion-test-runner',
    checkDigest: manifestHash,
    keyId: 'key:evaluator-01'
  },
  rollback: {
    status: 'ROLLBACK_PLAN_ATTACHED'
  }
};

const att = createAttestation({
  result: verifiedResult,
  privateKey,
  keyId: 'key:authority-adria-01'
});

const attDir = path.join(__dirname, '..', '.axion', 'attestations');
if (!fs.existsSync(attDir)) fs.mkdirSync(attDir, { recursive: true });

const targetFile = path.join(attDir, 'latest-attestation.json');
fs.writeFileSync(targetFile, JSON.stringify(att.envelope, null, 2), 'utf8');

console.log('✓ ATESTACIÓN IN-TOTO STATEMENT V1 GENERADA CON ÉXITO');
console.log('  Estado:', att.status);
console.log('  Tipo de Payload:', att.envelope.payloadType);
console.log('  Key ID:', att.envelope.signatures[0].keyid);
console.log('  Firma Ed25519:', att.envelope.signatures[0].sig.substring(0, 32) + '...');
console.log('  Evidencia SHA-256:', manifestHash);
console.log('  Fichero guardado en:', path.relative(path.join(__dirname, '..'), targetFile));
