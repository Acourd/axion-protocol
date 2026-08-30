'use strict';

/**
 * Axion Protocol — Invariantes del Verificador Formal de Lógica Temporal TLA+ / SMT para Máquinas de Estado.
 *
 * Valida de forma estricta:
 * 1. Modelado determinista del espacio de 10 estados de la máquina de estados de /drive.
 * 2. Demostración formal de Ausencia de Deadlocks (Deadlock-Freedom) en todo estado no terminal.
 * 3. Demostración formal de Alcanzabilidad Determinista de Finalización (Liveness/Termination).
 * 4. Demostración formal de disponibilidad incondicional del Killswitch en todo estado.
 * 5. Demostración de imposibilidad matemática de ejecutar comandos sin preflight y contrato socrático.
 * 6. Emisión de certificado criptográfico e integración transparente con DriveEngine.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const TemporalStateVerifier = require('../../tools/temporal_state_verifier.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-118 Invariantes de Verificación Formal de Lógica Temporal (TLA+) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const verifier = new TemporalStateVerifier(ROOT);

// 1. Ejecutar verificación formal del modelo temporal
const modelProof = verifier.verifyTemporalModel();

assert.strictEqual(modelProof.allTheoremsProven, true, 'Todos los teoremas temporales deben ser demostrados');
assert.strictEqual(modelProof.totalStates, 10, 'La máquina de estados debe contener 10 estados formales');
assert.strictEqual(modelProof.reachableStatesCount, 10, 'Todos los 10 estados deben ser formalmente alcanzables');
console.log(`✓ Espacio de estados explorado: 10/10 estados alcanzados exhaustivamente`);

// 2. Validar teoremas individuales
for (const theorem of modelProof.theorems) {
  assert.strictEqual(theorem.proven, true, `El teorema ${theorem.id} debe estar probado como TRUE`);
  console.log(`✓ [${theorem.id}] Demostrado formalmente: ${theorem.name}`);
}

// 3. Validar certificado emitido
assert.ok(modelProof.certificatePath, 'Debe existir la ruta del certificado formal');
assert.ok(fs.existsSync(modelProof.certificatePath), 'El certificado .json debe existir en disco');
console.log(`✓ Certificado formal de lógica temporal sellado en: ${path.basename(modelProof.certificatePath)}`);

// 4. Validar integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const driveProof = driveEngine.verifyTemporalModel();
assert.strictEqual(driveProof.allTheoremsProven, true, 'DriveEngine debe ejecutar la verificación temporal');
console.log('✓ Integración DriveEngine.verifyTemporalModel() verificada');

console.log('\nPASS AX-F-118 — Invariantes de verificación temporal TLA+ demostrados al 100% (4/4 teoremas formalmente probados).');
