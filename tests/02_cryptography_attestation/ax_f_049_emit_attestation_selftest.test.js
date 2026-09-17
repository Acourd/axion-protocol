'use strict';

const assert = require('assert');
const { crearSandbox } = require('../../tools/test_sandbox.js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { emitirYVerificar, resultadoDemostracion } = require('../../tools/emit_attestation.js');
const { verifyAttestation, ATTESTATION_STATUS } = require('../../tools/attestation.js');

console.log('=== AX-F-049 Autoprueba de la Cadena de Atestación (in-toto v1 + DSSE) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const scratchDir = crearSandbox('test_emit_attestation');

if (fs.existsSync(scratchDir)) {
  fs.rmSync(scratchDir, { recursive: true, force: true });
}
fs.mkdirSync(scratchDir, { recursive: true });

// 1. Estructura de resultado de demostración
const demo = resultadoDemostracion();
assert.strictEqual(demo.status, 'VERIFIED');
assert.strictEqual(typeof demo.evidenceManifest.hash, 'string');
assert.strictEqual(demo.evidenceManifest.hash.length, 64);
assert.strictEqual(demo.approval.status, 'APPROVED');
assert.strictEqual(demo.check.status, 'CHECK_PASSED');
console.log('✓ Estructura determinista de resultado de demostración verificada');

// 2. Emisión y verificación en directorio aislado
const r = emitirYVerificar(scratchDir);
assert.strictEqual(r.pass, true);
assert.strictEqual(r.status, ATTESTATION_STATUS.VALID);
assert.strictEqual(r.envelope.payloadType, 'application/vnd.in-toto+json');
assert.strictEqual(fs.existsSync(r.rutaSobre), true);
assert.strictEqual(fs.existsSync(r.rutaClave), true);
assert.strictEqual(fs.existsSync(r.rutaAviso), true);
console.log('✓ Emisión de sobre DSSE, clave pública PEM y aviso demostrativo verificados');

// 3. Verificación con clave pública espuria debe fallar
const { publicKey: claveEspuria } = crypto.generateKeyPairSync('ed25519');
const veredictoEspurio = verifyAttestation({
  envelope: r.envelope,
  publicKeys: [claveEspuria]
});
assert.strictEqual(veredictoEspurio.status, ATTESTATION_STATUS.INVALID_SIGNATURE, 'firma con clave espuria debe ser rechazada');
console.log('✓ Rechazo fail-closed ante claves públicas no autorizadas verificado');

// 4. Invocación CLI con salida 0
const rCli = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'emit_attestation.js'), '--out', scratchDir]);
assert.strictEqual(rCli.status, 0, 'CLI de emit_attestation debe salir con código 0');
console.log('✓ Invocación CLI de autoprueba de atestación verificada');

// 5. Limpieza
fs.rmSync(scratchDir, { recursive: true, force: true });
console.log('✓ Limpieza de entorno de pruebas completada');

console.log('\nPASS AX-F-049 — Cadena de atestación y sobre DSSE verificados al 100%.\n');
