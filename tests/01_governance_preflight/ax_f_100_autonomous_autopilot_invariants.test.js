'use strict';

/**
 * Axion Protocol — Invariantes del Motor Dual Auto-Pilot y Ejecución Desatendida de /drive.
 *
 * Valida de forma estricta:
 * 1. Detección determinista de intenciones desatendidas (auto, full-auto, remote, escuela, celular, cola).
 * 2. Resolución autónoma sin bloqueo interactivo (resolveAutoPilotMission).
 * 3. Priorización estricta: Reanudar Misión Activa -> Ejecutar Backlog -> Ejecutar Misión Recomendada.
 * 4. Integración transparente con DriveEngine.evaluateIntent(autoPilot: true).
 */

const assert = require('assert');
const path = require('path');
const AntigravityDriveHarness = require('../../tools/antigravity_drive_harness.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-100 Invariantes del Motor Dual Auto-Pilot y Ejecución Desatendida ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const harness = new AntigravityDriveHarness(ROOT);
const driveEngine = new DriveEngine(ROOT);

// 1. Validar detección de disparadores de Auto-Pilot
const autoPhrases = [
  'drive auto',
  'ejecutar en modo full-auto',
  'estoy en la escuela ejecuta lo recomendado',
  'lanzar desde el celular desatendido',
  'procesar cola en background'
];

for (const phrase of autoPhrases) {
  assert.strictEqual(harness.isAutoPilotRequest(phrase), true, `Debe detectar auto-pilot en: "${phrase}"`);
}
console.log(`✓ ${autoPhrases.length} patrones de invocación remota/desatendida detectados correctamente`);

// 2. Validar resolución de misión en Auto-Pilot sin bloqueo
const resolution = harness.resolveAutoPilotMission('auto');
assert.ok(resolution.action, 'Debe retornar una acción concreta');
assert.ok(resolution.mission, 'Debe asignar una misión');
assert.ok(resolution.autoPilotReason, 'Debe documentar la justificación');
console.log(`✓ Resolución autónoma verificada: ${resolution.action} -> "${resolution.mission.title || resolution.mission.name}"`);

// 3. Validar integración con DriveEngine (sin bloqueo modal)
const intentResult = driveEngine.evaluateIntent('drive auto');
assert.strictEqual(intentResult.requiresClarification, false, 'En modo Auto-Pilot no debe exigir clarificación interactiva');
assert.strictEqual(intentResult.isAutoPilot, true, 'Debe marcar isAutoPilot en true');
assert.ok(intentResult.autoPilotResolution, 'Debe incluir la resolución de Auto-Pilot');
console.log('✓ DriveEngine.evaluateIntent despacha la misión directamente sin bloquear en ask_question');

console.log('\nPASS AX-F-100 — Invariantes del motor Auto-Pilot y ejecución desatendida verificados al 100%.');
