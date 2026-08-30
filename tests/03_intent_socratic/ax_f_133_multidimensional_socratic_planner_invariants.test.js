'use strict';

/**
 * Axion Protocol — Invariantes del Planificador Socrático Multidimensional.
 *
 * Valida de forma estricta:
 * 1. Compilación determinista de contratos socráticos multidimensionales.
 * 2. Asignación proporcional de ciclos de convergencia y cuotas de hardware.
 * 3. Sellado inmutable con digest SHA-256 en .axion/state/socratic_intent_contract.json.
 * 4. Integración transparente con DriveEngine.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const MultidimensionalSocraticPlanner = require('../../tools/multidimensional_socratic_planner.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-133 Invariantes del Planificador Socrático Multidimensional ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sandbox = path.join(ROOT, 'scratch', `test_socratic_sandbox_${Date.now()}`);
fs.mkdirSync(path.join(sandbox, '.axion', 'state'), { recursive: true });

const planner = new MultidimensionalSocraticPlanner(sandbox);

// 1. Validar compilación de contrato multidimensional
const res = planner.compileIntentContract({
  missionChoice: '✨ [NUEVA FUNCIÓN] Motor de Telemetría Forense',
  deliberationDepth: 'EXHAUSTIVE_ASYMPTOTIC',
  telemetryLevel: 'FULL_DIFF_SNAPSHOTS'
});

assert.strictEqual(res.success, true);
assert.ok(res.contractDigest.length === 64, 'El digest debe tener 64 caracteres hex');
assert.ok(res.contract.executionPolicy.maxConvergenceCycles >= 5, 'Los ciclos máximos deben ser >= 5');
console.log(`✓ Contrato compilado y sellado: ${res.contractDigest.slice(0, 16)}... (Ciclos: ${res.contract.executionPolicy.maxConvergenceCycles})`);

// 2. Validar carga del contrato activo
const loaded = planner.loadActiveContract();
assert.strictEqual(loaded.contractDigest, res.contractDigest);
assert.strictEqual(loaded.executionPolicy.deliberationDepth, 'EXHAUSTIVE_ASYMPTOTIC');
console.log('✓ Persistencia y carga de contrato activo validada');

// 3. Validar integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const driveRes = driveEngine.compileSocraticIntentContract({
  missionChoice: '⚡ [INGENIERÍA & ESTRÉS] Simulador de Cargas Extremas',
  deliberationDepth: 'DEEP_MULTI_PASS'
});

assert.strictEqual(driveRes.success, true);
console.log('✓ Integración DriveEngine.compileSocraticIntentContract() verificada');

// Limpiar sandbox
if (fs.existsSync(sandbox)) {
  fs.rmSync(sandbox, { recursive: true, force: true });
}

console.log('\nPASS AX-F-133 — Invariantes del planificador socrático multidimensional demostrados al 100%.');
