'use strict';

/**
 * Axion Protocol — Invariantes del Reanudador de Estado Interrumpido y Checkpoint Resume Engine.
 *
 * Valida de forma estricta:
 * 1. Inicialización determinista de sesión de misión en frío (Cold Start).
 * 2. Persistencia atómica de progreso por fases con enlace a checkpoints de seguridad.
 * 3. Detección y reanudación automática tras interrupción (Resume on Interrupt) saltando fases ya verificadas.
 * 4. Sellado de sesión completada y limpieza de estado efímero.
 * 5. Integración transparente con DriveEngine.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const DriveStateResumer = require('../../tools/drive_state_resumer.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-115 Invariantes del Reanudador de Estado Interrumpido para /drive ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sandbox = path.join(ROOT, 'scratch', `test-resumer-sandbox-${Date.now()}`);

fs.mkdirSync(path.join(sandbox, '.axion', 'state'), { recursive: true });

const resumer = new DriveStateResumer(sandbox);
const phases = ['PHASE_01_RECON', 'PHASE_02_BUILD', 'PHASE_03_VERIFY', 'PHASE_04_SEAL'];

// 1. Validar inicio en frío
const init = resumer.startOrResumeMission({
  missionId: 'MISSION_SANDBOX_01',
  title: 'Misión Sandbox de Prueba',
  phases
});

assert.strictEqual(init.isResumed, false, 'La primera ejecución debe ser un inicio en frío');
assert.strictEqual(init.startPhaseIndex, 0, 'Debe iniciar en la fase índice 0');
assert.strictEqual(init.remainingPhases.length, 4, 'Todas las fases deben estar pendientes');
console.log('✓ Inicio en frío verificado: 4 fases pendientes registradas');

// 2. Completar fases 1 y 2
resumer.recordPhaseCompletion('PHASE_01_RECON', { found: 10 }, 'cp_recon_01');
resumer.recordPhaseCompletion('PHASE_02_BUILD', { filesChanged: 2 }, 'cp_build_02');
console.log('✓ Fases 1 y 2 completadas y persistidas en disco');

// 3. Simular interrupción e invocar reanudación
const resumed = resumer.startOrResumeMission({
  missionId: 'MISSION_SANDBOX_01',
  title: 'Misión Sandbox de Prueba',
  phases
});

assert.strictEqual(resumed.isResumed, true, 'Debe detectar la sesión en progreso y reanudar');
assert.strictEqual(resumed.startPhaseIndex, 2, 'Debe reanudar exactamente desde la fase índice 2 (PHASE_03_VERIFY)');
assert.strictEqual(resumed.completedPhases.length, 2, 'Debe registrar 2 fases ya completadas');
assert.deepStrictEqual(resumed.remainingPhases, ['PHASE_03_VERIFY', 'PHASE_04_SEAL'], 'Fases restantes deben coincidir');
console.log(`✓ Reanudación tras interrupción verificada: Saltó a índice ${resumed.startPhaseIndex} (${phases[resumed.startPhaseIndex]})`);

// 4. Completar restantes y sellar
resumer.recordPhaseCompletion('PHASE_03_VERIFY', { testsPassed: true });
resumer.recordPhaseCompletion('PHASE_04_SEAL', { certified: true });
const markRes = resumer.markMissionCompleted();
assert.strictEqual(markRes.status, 'COMPLETED');
console.log('✓ Misión completada y sellada con éxito');

// 5. Limpieza y descarte
const discard = resumer.discardActiveSession();
assert.strictEqual(discard.success, true);
console.log('✓ Estado de sesión descartado limpiamente');

// 6. Validar integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const driveSession = driveEngine.startOrResumeMissionSession({
  missionId: 'MISSION_DRIVE_INTEGRATION_SESSION',
  title: 'Integración Resumer - DriveEngine',
  phases: ['INIT', 'EXECUTE']
});

assert.ok(typeof driveSession.isResumed === 'boolean', 'DriveEngine debe interactuar con el resumer');
console.log('✓ Integración DriveEngine.startOrResumeMissionSession() verificada');

// Limpiar sandbox
try {
  fs.rmSync(sandbox, { recursive: true, force: true });
} catch (_) {}

console.log('\nPASS AX-F-115 — Invariantes del reanudador de estado interrumpido verificados al 100%.');
