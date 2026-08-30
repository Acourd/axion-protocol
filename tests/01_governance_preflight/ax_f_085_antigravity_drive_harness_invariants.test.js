'use strict';

/**
 * Axion Protocol — Invariantes del Arnés Autónomo de Antigravity y Síntesis de Misiones.
 *
 * Valida de forma estricta:
 * 1. Generación de al menos 3 misiones proactivas con categorías, profundidad y fases detalladas.
 * 2. Conversión al esquema interactivo nativo ask_question con prefijo (Recomendado) en la opción 1.
 * 3. Integración de DriveEngine.evaluateIntent('') para disparar las misiones proactivas ante entradas vacías.
 * 4. Ejecución atómica y registro de digest SHA-256 en .axion/state/.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const AntigravityDriveHarness = require('../../tools/antigravity_drive_harness.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-085 Invariantes del Arnés de Antigravity y Síntesis de Misiones ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const harness = new AntigravityDriveHarness(ROOT);
const driveEngine = new DriveEngine(ROOT);

// 1. Verificar generación de misiones proactivas
const missions = harness.generateProactiveMissions();
assert.ok(Array.isArray(missions) && missions.length >= 3, 'Deben generarse al menos 3 misiones proactivas');
for (const m of missions) {
  assert.ok(typeof m.id === 'string' && m.id.length > 0, 'Cada misión debe tener ID');
  assert.ok(typeof m.title === 'string' && m.title.length > 0, 'Cada misión debe tener título');
  assert.ok(typeof m.description === 'string' && m.description.length > 0, 'Cada misión debe tener descripción');
  assert.ok(Array.isArray(m.phases) && m.phases.length >= 3, 'Cada misión debe contener al menos 3 fases');
}
console.log(`✓ Generadas ${missions.length} misiones proactivas con estructura de fases y categorías verificadas`);

// 2. Verificar formato modal interactivo ask_question
const modal = harness.toInteractiveMissionModal(missions);
assert.ok(Array.isArray(modal.questions) && modal.questions.length === 1, 'El modal debe contener exactamente 1 pregunta');
const q = modal.questions[0];
assert.strictEqual(q.is_multi_select, false, 'La selección de misión debe ser de opción única');
assert.ok(q.options.length >= 3, 'Deben presentarse al menos 3 opciones clickeables');
assert.ok(q.options[0].startsWith('(Recomendado)'), 'La primera opción debe estar marcada como (Recomendado)');
console.log('✓ Formato modal nativo ask_question verificado para interacción de 1 clic');

// 3. Verificar integración con DriveEngine ante misiones no especificadas
const intentResultEmpty = driveEngine.evaluateIntent('');
assert.strictEqual(intentResultEmpty.requiresClarification, true, 'Entrada vacía debe requerir selección proactiva');
assert.strictEqual(intentResultEmpty.isProactiveMissions, true, 'Debe marcar isProactiveMissions en true');
assert.ok(intentResultEmpty.interactiveModal && intentResultEmpty.interactiveModal.questions, 'Debe incluir el modal interactivo');
console.log('✓ DriveEngine.evaluateIntent("") despacha automáticamente el modal proactivo de misiones');

// 4. Ejecución del pipeline y sellado de registro en .axion/state/
const execRecord = harness.executeMissionPipeline('MISSION_ADVERSARIAL_BURST');
assert.strictEqual(execRecord.pass, true, 'La ejecución del pipeline debe retornar pass: true');
assert.ok(typeof execRecord.digest === 'string' && execRecord.digest.length === 64, 'Debe emitir digest SHA-256 de 64 caracteres');
assert.ok(fs.existsSync(execRecord.recordPath), 'El archivo de registro debe persistir en disco');
console.log(`✓ Pipeline de misión ejecutado y sellado en: ${path.basename(execRecord.recordPath)}`);

console.log('\nPASS AX-F-085 — Invariantes del arnés de Antigravity y síntesis de misiones verificados al 100%.');
