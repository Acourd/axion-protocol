'use strict';

const assert = require('assert');
const { canonicalize, hashCanonical } = require('../../tools/canonical_json.js');
const { createBoundEvidenceManifest } = require('../../tools/evidence_hasher.js');

console.log('=== AX-F-078 Invariantes de Canonicalización RFC 8785 y Enlace de Evidencia Criptográfica ===\n');

// 1. Rechazo estricto de números no finitos
assert.throws(() => canonicalize(NaN), /no finitos/);
assert.throws(() => canonicalize(Infinity), /no finitos/);
assert.throws(() => canonicalize(-Infinity), /no finitos/);
console.log('✓ Rechazo determinista de números no finitos (NaN, Infinity) verificado');

// 2. Rechazo de objetos no planos (Date, RegExp, clases)
assert.throws(() => canonicalize(new Date()), /objetos JSON planos/);
assert.throws(() => canonicalize(/test/g), /objetos JSON planos/);
console.log('✓ Rechazo determinista de instancias de clases y objetos no planos verificado');

// 3. Soporte para objetos sin prototipo (Object.create(null))
const nullProtoObj = Object.create(null);
nullProtoObj.b = 'valorB';
nullProtoObj.a = 123;
assert.strictEqual(canonicalize(nullProtoObj), '{"a":123,"b":"valorB"}');
console.log('✓ Soporte para objetos creados con Object.create(null) verificado');

// 4. Independencia del orden de inserción de claves
const objA = { z: [1, 2, 3], a: { k2: true, k1: 'alpha' }, m: -0 };
const objB = { m: 0, a: { k1: 'alpha', k2: true }, z: [1, 2, 3] };

assert.strictEqual(canonicalize(objA), canonicalize(objB));
assert.strictEqual(hashCanonical(objA), hashCanonical(objB));
console.log('✓ Invarianza del hash canónico ante permutación de claves y normalización de -0 verificada');

// 5. Enlace criptográfico estricto en createBoundEvidenceManifest
const validBinding = {
  missionId: 'MISSION-ALPHA',
  risk: 'CRITICAL',
  status: 'EXECUTED',
  command: { executable: 'git', args: ['push', 'origin', 'main'], shell: false },
  scope: ['src/core.js'],
  approval: { digest: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90' },
  rollback: { digest: 'b1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90' },
  check: { digest: 'c1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90' },
  evidence: { digest: 'd1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90' }
};

const bound1 = createBoundEvidenceManifest({
  taskId: 'AX-TASK-001',
  subject: 'Test de enlace canónico',
  files: ['README.md'],
  binding: validBinding
});

assert.strictEqual(typeof bound1.binding_hash, 'string');
assert.strictEqual(/^[a-f0-9]{64}$/.test(bound1.binding_hash), true);

// Alteración de 1 solo bit en el digest de approval
const alteredBinding = {
  ...validBinding,
  approval: { digest: validBinding.approval.digest.slice(0, -1) + '1' }
};
const boundAltered = createBoundEvidenceManifest({
  taskId: 'AX-TASK-001',
  subject: 'Test de enlace canónico',
  files: ['README.md'],
  binding: alteredBinding
});

assert.notStrictEqual(bound1.binding_hash, boundAltered.binding_hash, 'Cualquier alteración debe cambiar el binding_hash');

// Rechazo de binding incompleto
assert.throws(() => createBoundEvidenceManifest({ binding: { missionId: 'solo' } }), /incompleto o inválido/);
console.log('✓ Integridad y sensibilidad del enlace de evidencia criptográfica verificada');

console.log('\nPASS AX-F-078 — Invariantes de evidencia canónica demostrados al 100%.\n');
