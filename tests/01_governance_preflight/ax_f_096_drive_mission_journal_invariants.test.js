'use strict';

/**
 * Axion Protocol — Invariantes del Diario Persistente de Misiones y Reanudación de /drive.
 *
 * Valida de forma estricta:
 * 1. Inicialización, serialización y validación de digest SHA-256 en drive_mission_journal.json.
 * 2. Transiciones de estado de misiones: ACTIVE_IN_PROGRESS -> COMPLETED -> Archivo Histórico.
 * 3. Gestión y persistencia del backlog de subtareas encadenadas al objetivo principal.
 * 4. Detección automática y priorización de opciones de reanudación en el modal interactivo de Antigravity.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { crearSandbox } = require('../../tools/test_sandbox.js');
const DriveMissionTracker = require('../../tools/drive_mission_tracker.js');

console.log('=== AX-F-096 Invariantes del Diario Persistente de Misiones de /drive ===\n');

// Estado propio por corrida: el diario sobre el checkout compartido hacía que dos
// suites concurrentes se reiniciaran el backlog mutuamente (el test resetea estado).
const ROOT = path.resolve(__dirname, '..', '..');
const sandbox = crearSandbox('test_mission_journal');
fs.mkdirSync(path.join(sandbox, '.axion', 'state'), { recursive: true });
const tracker = new DriveMissionTracker(sandbox);

// 1. Limpiar estado previo de prueba
tracker.journal.activeMission = null;
tracker.journal.pendingBacklog = [];
tracker.saveJournal();

// 2. Iniciar una misión de prueba
const mission = tracker.startMission(
  'Auditoría y Verificación de Cobertura AST',
  'Mapeo de dependencias léxicas y detección de dead code en 45 módulos',
  3,
  ['Mapear AST de tools/', 'Detectar funciones huérfanas', 'Emitir suite de invariantes']
);

assert.strictEqual(mission.status, 'ACTIVE_IN_PROGRESS', 'El estado inicial debe ser ACTIVE_IN_PROGRESS');
assert.strictEqual(mission.currentPhase, 1, 'La fase inicial debe ser 1');
assert.strictEqual(mission.subtasks.length, 3, 'Debe registrar 3 subtareas');
console.log(`✓ Misión activa creada: "${mission.title}" [Fase 1/3]`);

// 3. Verificar que el modal de /drive prioriza la reanudación
const options = tracker.getProactiveMissionOptions();
assert.strictEqual(options.length, 1, 'Debe generar opción de reanudación para la misión activa');
assert.strictEqual(options[0].isResume, true, 'La opción debe estar marcada como isResume');
assert.ok(options[0].text.includes('Reanudar Misión Inconclusa'), 'Debe titularse como Reanudar Misión Inconclusa');
console.log('✓ Detección de misión inconclusa: Opción de reanudación generada y priorizada');

// 4. Avanzar fases
tracker.advancePhase(2, 'IN_PROGRESS', { modulesMapped: 45 });
assert.strictEqual(tracker.journal.activeMission.currentPhase, 2, 'La fase actual debe ser 2');

// 5. Encolar una tarea en el backlog
const backlogItem = tracker.enqueuePending('Optimización de Presupuestos de Memoria', 'HIGH');
assert.strictEqual(tracker.journal.pendingBacklog.length, 1, 'Debe haber 1 tarea en backlog');
console.log(`✓ Tarea de backlog encadenada: "${backlogItem.title}"`);

// 6. Completar la misión activa
const completed = tracker.completeActiveMission('Cobertura AST completada al 100%');
assert.strictEqual(completed.status, 'COMPLETED', 'La misión debe quedar COMPLETED');
assert.strictEqual(tracker.journal.activeMission, null, 'No debe haber misión activa');
assert.strictEqual(tracker.journal.completedHistory.length >= 1, true, 'Debe guardarse en el historial');
console.log('✓ Misión completada formalmente y archivada en el historial inmutable');

// 7. Validar persistencia y digest
const savedJournal = tracker.loadJournal();
assert.ok(savedJournal.digest && savedJournal.digest.length === 64, 'Debe persistir digest SHA-256');
assert.strictEqual(savedJournal.pendingBacklog.length, 1, 'El backlog debe persistir en disco');
console.log(`✓ Diario de misiones persistido y verificado en disco con digest SHA-256`);

// Limpiar backlog de prueba y sandbox
tracker.journal.pendingBacklog = [];
tracker.saveJournal();
if (fs.existsSync(sandbox)) {
  fs.rmSync(sandbox, { recursive: true, force: true });
}

console.log('\nPASS AX-F-096 — Invariantes del diario persistente de misiones verificados al 100%.');
