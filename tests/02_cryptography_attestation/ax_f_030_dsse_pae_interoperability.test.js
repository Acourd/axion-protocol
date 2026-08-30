'use strict';

const assert = require('assert');
const crypto = require('crypto');
const { pae, signEnvelope, verifyEnvelope, DSSE_STATUS } = require('../../tools/dsse.js');

console.log('=== AX-F-030 Interoperabilidad DSSE, Pre-Authentication Encoding (PAE) y Firmas Ed25519 ===\n');

// 1. Verificación byte a byte de PAE con caracteres multibyte UTF-8
const tipoDoc = 'application/vnd.in-toto+json';
const cuerpoMultibyte = '{"mensaje": "Hola mundo ñ á é í ó ú 🚀"}';
const bufferCuerpo = Buffer.from(cuerpoMultibyte, 'utf8');

const paeBuffer = pae(tipoDoc, bufferCuerpo);
const paeExpectedHeader = `DSSEv1 ${Buffer.byteLength(tipoDoc, 'utf8')} ${tipoDoc} ${bufferCuerpo.length} `;
assert.strictEqual(
  paeBuffer.subarray(0, Buffer.byteLength(paeExpectedHeader)).toString('utf8'),
  paeExpectedHeader,
  'la cabecera PAE debe contener longitudes en bytes decimales exactas'
);
console.log('✓ Codificación PAE byte a byte con soporte UTF-8 multibyte verificada');

// 2. Firma y verificación válida
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const envelope = signEnvelope({
  payloadType: tipoDoc,
  body: bufferCuerpo,
  privateKey,
  keyId: 'key-001'
});

assert.strictEqual(envelope.payloadType, tipoDoc);
assert.strictEqual(typeof envelope.payload, 'string');
assert.strictEqual(envelope.signatures.length, 1);
assert.strictEqual(envelope.signatures[0].keyid, 'key-001');

const rValido = verifyEnvelope({
  envelope,
  publicKeys: { 'key-001': publicKey }
});
assert.strictEqual(rValido.status, DSSE_STATUS.VALID, 'el sobre válido debe verificarse como DSSE_VALID');
console.log('✓ Firma y verificación de sobre DSSE con clave Ed25519 verificada');

// 3. Resistencia a sustitución de payloadType (Cross-Type Replay Attack)
const envelopeFalsificado = {
  ...envelope,
  payloadType: 'text/plain'
};
const rCrossType = verifyEnvelope({
  envelope: envelopeFalsificado,
  publicKeys: { 'key-001': publicKey }
});
assert.strictEqual(
  rCrossType.status,
  DSSE_STATUS.INVALID_SIGNATURE,
  'el cambio de payloadType debe invalidar la firma inmediatamente'
);
console.log('✓ Rechazo de ataque de confusión de tipo (Cross-Type Replay) verificado');

// 4. Detección de manipulación de payload
const tamperedPayload = Buffer.from('{"tampered": true}').toString('base64');
const envelopeTampered = {
  ...envelope,
  payload: tamperedPayload
};
const rTampered = verifyEnvelope({
  envelope: envelopeTampered,
  publicKeys: { 'key-001': publicKey }
});
assert.strictEqual(rTampered.status, DSSE_STATUS.INVALID_SIGNATURE);
console.log('✓ Detección de manipulación de payload verificado');

// 5. Clave incorrecta y sobre malformado
const { publicKey: otherKey } = crypto.generateKeyPairSync('ed25519');
const rWrongKey = verifyEnvelope({
  envelope,
  publicKeys: { 'key-001': otherKey }
});
assert.strictEqual(rWrongKey.status, DSSE_STATUS.INVALID_SIGNATURE);

const rMalformed = verifyEnvelope({
  envelope: { bad: true },
  publicKeys: { 'key-001': publicKey }
});
assert.strictEqual(rMalformed.status, DSSE_STATUS.MALFORMED);
console.log('✓ Detección de clave incorrecta y sobre malformado verificada');

console.log('\nPASS AX-F-030 — DSSEv1, PAE y firmas criptográficas Ed25519 verificados al 100%.\n');
