'use strict';

const assert = require('assert');
const crypto = require('crypto');
const {
  ATTESTATION_STATUS,
  STATEMENT_TYPE,
  PREDICATE_TYPE,
  PAYLOAD_TYPE,
  buildStatement,
  createAttestation,
  verifyAttestation
} = require('../../tools/attestation.js');

console.log('=== AX-F-042 Ciclo de Vida de Atestaciones in-toto v1 y Sobres DSSE ===\n');

// 1. Generación de par de claves Ed25519
const keypairA = crypto.generateKeyPairSync('ed25519');
const keypairB = crypto.generateKeyPairSync('ed25519');

// 2. Rechazo de misiones no verificadas
const rNoVerificada = buildStatement({ status: 'FAILED', missionId: 'M-01' });
assert.strictEqual(rNoVerificada.ok, false);
assert.strictEqual(rNoVerificada.reason, ATTESTATION_STATUS.NOT_VERIFIED);

const rMalformada = buildStatement({
  status: 'VERIFIED',
  missionId: 'M-02',
  evidenceManifest: { hash: 'hash_invalido_no_hex64' }
});
assert.strictEqual(rMalformada.ok, false);
assert.strictEqual(rMalformada.reason, ATTESTATION_STATUS.MALFORMED);
console.log('✓ Rechazo fail-closed de misiones fallidas o manifiestos corruptos verificado');

// 3. Construcción y firma de atestación válida
const digestValido = 'f'.repeat(64);
const misionValida = {
  missionId: 'M-AX-042',
  status: 'VERIFIED',
  risk: 'HIGH',
  assurance: 'CRYPTOGRAPHIC',
  check: {
    status: 'PASS',
    checkId: 'CHK-001',
    checkDigest: digestValido,
    actorId: 'auditor-01',
    executorActorId: 'agent-01',
    keyId: 'key-auditor'
  },
  approval: {
    status: 'APPROVED',
    approvalId: 'APP-001',
    approvalDigest: digestValido,
    actorId: 'human-authority',
    keyId: 'key-human'
  },
  rollback: { status: 'PREPARED' },
  evidenceManifest: {
    hash: digestValido,
    binding_hash: digestValido
  },
  workflow: {
    history: ['UNDERSTAND', 'PLAN', 'GATE', 'TEST', 'BUILD', 'AUDIT', 'PROMOTE'],
    state: 'COMPLETED'
  }
};

const atestacion = createAttestation({
  result: misionValida,
  privateKey: keypairA.privateKey,
  keyId: 'auditor-key-01'
});

assert.strictEqual(atestacion.status, ATTESTATION_STATUS.VALID);
assert.strictEqual(atestacion.statement._type, STATEMENT_TYPE);
assert.strictEqual(atestacion.statement.predicateType, PREDICATE_TYPE);
assert.strictEqual(atestacion.statement.subject[0].digest.sha256, digestValido);
console.log('✓ Creación de Statement in-toto v1 y firma en sobre DSSE verificada');

// 4. Verificación criptográfica con clave pública autorizada
const vExitosa = verifyAttestation({
  envelope: atestacion.envelope,
  publicKeys: [keypairA.publicKey]
});

assert.strictEqual(vExitosa.status, ATTESTATION_STATUS.VALID);
assert.strictEqual(vExitosa.statement.predicate.missionId, 'M-AX-042');
assert.strictEqual(vExitosa.statement.predicate.workflow.phases.length, 7);
console.log('✓ Verificación de firma DSSE y decodificación de Statement verificada');

// 5. Rechazo ante firma con clave no autorizada
const vFallida = verifyAttestation({
  envelope: atestacion.envelope,
  publicKeys: [keypairB.publicKey]
});

assert.strictEqual(vFallida.status, ATTESTATION_STATUS.INVALID_SIGNATURE);
console.log('✓ Rechazo ante clave no autorizada verificado');

console.log('\nPASS AX-F-042 — Atestaciones in-toto v1 y DSSE verificadas al 100%.\n');
