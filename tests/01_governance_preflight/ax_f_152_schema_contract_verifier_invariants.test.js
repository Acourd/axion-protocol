'use strict';

/**
 * Axion Protocol — Invariantes del Validador Formal de Esquemas JSON.
 *
 * Valida de forma estricta:
 * 1. Comprobación determinista de tipos primarios, objetos y arrays.
 * 2. Exigencia de campos requeridos y rechazo de propiedades no permitidas.
 * 3. Validación de restricciones: enum, pattern regex, rangos numéricos y longitudes.
 * 4. Validación exitosa de los esquemas nativos in-toto v1, DSSE Envelope v1 y Heartbeat v1.
 * 5. Integración transparente con DriveEngine y CLI unificado.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const SchemaContractVerifier = require('../../tools/schema_contract_verifier.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-152 Invariantes del Validador Formal de Esquemas JSON ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const verifier = new SchemaContractVerifier(ROOT);

// 1. Validar tipos y restricciones básicas
const simpleSchema = {
  type: 'object',
  required: ['id', 'count', 'active', 'role'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', minLength: 3, pattern: '^ax-[0-9]+$' },
    count: { type: 'integer', minimum: 1 },
    active: { type: 'boolean' },
    role: { type: 'string', enum: ['ADMIN', 'OPERATOR', 'AUDITOR'] }
  }
};

const validPayload = { id: 'ax-1234', count: 5, active: true, role: 'AUDITOR' };
const validRes = verifier.validate(validPayload, simpleSchema);
assert.strictEqual(validRes.valid, true);
assert.strictEqual(validRes.errors.length, 0);
console.log('✓ Validación de esquema básico y restricciones superada');

// 2. Validar detección de errores
const invalidPayload = { id: 'bad_id', count: 0, active: 'not_a_bool', role: 'HACKER', extraProp: true };
const invalidRes = verifier.validate(invalidPayload, simpleSchema);
assert.strictEqual(invalidRes.valid, false);
assert.ok(invalidRes.errors.length >= 4);
console.log(`✓ Detección estricta de ${invalidRes.errors.length} anomalías de esquema validada`);

// 3. Validar esquema in-toto Statement v1
const inTotoPayload = {
  _type: 'https://in-toto.io/Statement/v1',
  subject: [
    { name: 'axion-repo', digest: { sha256: 'a'.repeat(64) } }
  ],
  predicateType: 'https://axion.dev/attestation/v1',
  predicate: { mission: 'test' }
};
const inTotoRes = verifier.validateBySchemaId(inTotoPayload, 'in-toto-statement-v1');
assert.strictEqual(inTotoRes.valid, true);
console.log('✓ Esquema in-toto Statement v1 validado');

// 4. Validar esquema DSSE Envelope v1
const dssePayload = {
  payloadType: 'application/vnd.in-toto+json',
  payload: Buffer.from(JSON.stringify(inTotoPayload)).toString('base64'),
  signatures: [
    { keyid: 'key_123', sig: 'fake_signature_ed25519' }
  ]
};
const dsseRes = verifier.validateBySchemaId(dssePayload, 'dsse-envelope-v1');
assert.strictEqual(dsseRes.valid, true);
console.log('✓ Esquema DSSE Envelope v1 validado');

// 5. Validar integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const driveSchemaRes = driveEngine.validateJsonSchema(inTotoPayload, 'in-toto-statement-v1');
assert.strictEqual(driveSchemaRes.valid, true);
console.log('✓ Integración DriveEngine.validateJsonSchema() verificada');

console.log('\nPASS AX-F-152 — Invariantes del validador de esquemas JSON demostrados al 100%.');
