'use strict';

const assert = require('assert');
const crypto = require('crypto');
const {
  STATEMENT_TYPE,
  PREDICATE_TYPE,
  buildStatement,
  createAttestation,
  verifyAttestation
} = require('../../tools/attestation.js');

console.log('=== AX-F-042 Ciclo de Vida de Atestaciones in-toto v1 y Sobres DSSE ===\n');

// Los códigos van escritos a mano, no tomados de ATTESTATION_STATUS. Comparar la salida de
// la herramienta contra la constante que la propia herramienta devuelve es una aserción que
// no puede fallar: los dos lados se mueven juntos. Medido por mutación (2026-08-25):
// cambiando el literal de NOT_VERIFIED, ninguna de las dos suites de atestación se ponía en
// rojo. Estos son los valores que un verificador externo espera leer en el sobre.
const VALID = 'ATTESTATION_VALID';
const NOT_VERIFIED = 'ATTESTATION_SOURCE_NOT_VERIFIED';
const MALFORMED = 'ATTESTATION_MALFORMED';
const INVALID_SIGNATURE = 'ATTESTATION_INVALID_SIGNATURE';

// 1. Generación de pares de claves Ed25519
const keypairA = crypto.generateKeyPairSync('ed25519');
const keypairB = crypto.generateKeyPairSync('ed25519');

// --- 2. Solo una misión verificada puede atestiguarse ---
// Se prueban las tres formas de "no verificada" que llegan en la práctica: un fallo
// declarado, un estado intermedio y la ausencia total de resultado. Las tres tienen que
// dar el mismo veredicto, o el hueco es por donde se cuela una atestación sin misión.
const rNoVerificada = buildStatement({ status: 'FAILED', missionId: 'M-01' });
assert.strictEqual(rNoVerificada.ok, false);
assert.strictEqual(rNoVerificada.reason, NOT_VERIFIED);

const rBloqueada = buildStatement({ status: 'BLOCKED', missionId: 'M-01b' });
assert.strictEqual(rBloqueada.ok, false);
assert.strictEqual(rBloqueada.reason, NOT_VERIFIED, 'una misión bloqueada tampoco se atestigua');

const rNula = buildStatement(null);
assert.strictEqual(rNula.ok, false);
assert.strictEqual(rNula.reason, NOT_VERIFIED, 'sin resultado de misión no hay nada que atestiguar');

const rMalformada = buildStatement({
  status: 'VERIFIED',
  missionId: 'M-02',
  evidenceManifest: { hash: 'hash_invalido_no_hex64' }
});
assert.strictEqual(rMalformada.ok, false);
assert.strictEqual(rMalformada.reason, MALFORMED);
console.log('✓ Rechazo fail-closed de misiones fallidas, bloqueadas, ausentes o con manifiesto corrupto');

// --- 3. Construcción y firma de atestación válida ---
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

assert.strictEqual(atestacion.status, VALID);
assert.strictEqual(typeof atestacion.envelope, 'object', 'la emisión debe producir un sobre, no solo un veredicto');
assert.strictEqual(atestacion.statement._type, STATEMENT_TYPE);
assert.strictEqual(atestacion.statement.predicateType, PREDICATE_TYPE);
assert.strictEqual(atestacion.statement.subject[0].digest.sha256, digestValido);
console.log('✓ Creación de Statement in-toto v1 y firma en sobre DSSE verificada');

// --- 4. Verificación criptográfica con clave pública autorizada ---
const vExitosa = verifyAttestation({
  envelope: atestacion.envelope,
  publicKeys: [keypairA.publicKey]
});

assert.strictEqual(vExitosa.status, VALID);
assert.strictEqual(vExitosa.statement.predicate.missionId, 'M-AX-042');
assert.strictEqual(vExitosa.statement.predicate.workflow.phases.length, 7);
assert.strictEqual(vExitosa.statement.subject[0].digest.sha256, digestValido);
// El keyid viaja en el sobre: sin él, quien verifica sabe que la firma es buena pero no
// de quién, y una atestación anónima no atribuye responsabilidad a nadie.
assert.strictEqual(vExitosa.keyid, 'auditor-key-01', 'el sobre debe declarar qué clave firmó');
console.log('✓ Verificación de firma DSSE, decodificación de Statement y atribución de clave');

// --- 5. Rechazo ante firma con clave no autorizada ---
const vFallida = verifyAttestation({
  envelope: atestacion.envelope,
  publicKeys: [keypairB.publicKey]
});
assert.strictEqual(vFallida.status, INVALID_SIGNATURE);
console.log('✓ Rechazo ante clave no autorizada verificado');

// --- 6. Rechazo ante alteración del payload ya firmado ---
// Ataque distinto del anterior: aquí la clave es la correcta y lo que cambia son los bytes
// atestiguados. Es el caso que da sentido a firmar — si el payload se pudiera reescribir
// conservando la firma, la atestación no probaría nada sobre su contenido.
const sobreAlterado = JSON.parse(JSON.stringify(atestacion.envelope));
const cargaDecodificada = JSON.parse(Buffer.from(sobreAlterado.payload, 'base64').toString('utf8'));
cargaDecodificada.predicate.outcome = 'FORGED_OUTCOME';
sobreAlterado.payload = Buffer.from(JSON.stringify(cargaDecodificada)).toString('base64');

const vAlterada = verifyAttestation({
  envelope: sobreAlterado,
  publicKeys: [keypairA.publicKey]
});
assert.strictEqual(vAlterada.status, INVALID_SIGNATURE,
  'reescribir el payload con la clave correcta debe invalidar la firma igualmente');
console.log('✓ Resistencia a la manipulación del Statement ya firmado verificada');

console.log('\nPASS AX-F-042 — Atestaciones in-toto v1 y DSSE verificadas al 100%.\n');
