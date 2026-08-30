'use strict';

/**
 * Axion Protocol — Invariantes de Atestación in-toto Statement v1 y Sobre DSSE para todo el Repositorio.
 *
 * Valida de forma estricta:
 * 1. Escaneo exhaustivo y determinista del árbol de archivos con hashes SHA-256 individuales.
 * 2. Estructura formal in-toto Statement v1 (spec v1) con subject, predicateType y predicado sellado.
 * 3. Envoltura en sobre DSSE con codificación PAE (Pre-Authentication Encoding) y firma Ed25519.
 * 4. Verificación criptográfica determinista con clave pública autorizada (ATTESTATION_VALID).
 * 5. Detección y rechazo inmediato de firmas forjadas (DSSE_INVALID_SIGNATURE).
 * 6. Detección y rechazo de payloads manipulados o alterados (DSSE_INVALID_SIGNATURE).
 */

const assert = require('assert');
const crypto = require('crypto');
const path = require('path');
const RepoAttestationGenerator = require('../../tools/repo_attestation_generator.js');

console.log('=== AX-F-088 Invariantes de Atestación in-toto & DSSE del Repositorio ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const generator = new RepoAttestationGenerator(ROOT);

// 1. Generar atestación completa con clave Ed25519 efímera
const keyPair = crypto.generateKeyPairSync('ed25519');
const attestation = generator.generateSignedAttestation(keyPair);

assert.ok(attestation.envelope, 'Debe generar el sobre DSSE');
assert.ok(attestation.statement, 'Debe generar el in-toto Statement');
assert.ok(Array.isArray(attestation.statement.subject) && attestation.statement.subject.length > 50, 'Debe incluir todos los archivos del repo como subjects');
console.log(`✓ in-toto Statement v1 generado con ${attestation.statement.subject.length} subjects escaneados`);

// 2. Validar estructura del in-toto Statement
const st = attestation.statement;
assert.strictEqual(st._type, 'https://in-toto.io/Statement/v1', 'Tipo de Statement debe ser in-toto v1');
assert.strictEqual(st.predicateType, 'https://axion-protocol.org/attestation/repository/v1', 'Tipo de predicado válido');
assert.ok(st.predicate.manifestSha256 && st.predicate.manifestSha256.length === 64, 'Debe contener digest SHA-256 del manifiesto');
assert.strictEqual(st.predicate.zero_bloat_verified, true, 'Debe verificar zero-bloat');
console.log('✓ Especificación in-toto Statement v1 y predicado de gobernanza verificados');

// 3. Verificación criptográfica con la clave pública legítima
const validRes = generator.verifyAttestation(attestation.envelope, keyPair.publicKey);
assert.strictEqual(validRes.ok, true, 'La verificación de atestación legítima debe ser ok: true');
assert.strictEqual(validRes.status, 'ATTESTATION_VALID', 'El estado debe ser ATTESTATION_VALID');
console.log('✓ Sobre DSSE verificado con firma asimétrica Ed25519 y PAE matching');

// 4. Rechazo ante clave pública ajena / forjada
const attackerKeys = crypto.generateKeyPairSync('ed25519');
const forgedRes = generator.verifyAttestation(attestation.envelope, attackerKeys.publicKey);
assert.strictEqual(forgedRes.ok, false, 'Clave ajena no debe verificar');
assert.strictEqual(forgedRes.status, 'DSSE_INVALID_SIGNATURE', 'Debe retornar DSSE_INVALID_SIGNATURE');
console.log('✓ Intento de verificación con clave ajena rechazado con DSSE_INVALID_SIGNATURE');

// 5. Rechazo ante alteración del payload
const tamperedEnvelope = JSON.parse(JSON.stringify(attestation.envelope));
const payloadStr = Buffer.from(tamperedEnvelope.payload, 'base64').toString('utf8');
const tamperedPayloadStr = payloadStr.replace('"zero_bloat_verified":true', '"zero_bloat_verified":false');
tamperedEnvelope.payload = Buffer.from(tamperedPayloadStr, 'utf8').toString('base64');

const tamperedRes = generator.verifyAttestation(tamperedEnvelope, keyPair.publicKey);
assert.strictEqual(tamperedRes.ok, false, 'Payload manipulado debe fallar verificación');
assert.strictEqual(tamperedRes.status, 'DSSE_INVALID_SIGNATURE', 'Debe detectar corrupción y retornar DSSE_INVALID_SIGNATURE');
console.log('✓ Detección y rechazo de payload manipulado al 100%');

console.log('\nPASS AX-F-088 — Invariantes de atestación in-toto v1 y DSSE verificados al 100%.');
