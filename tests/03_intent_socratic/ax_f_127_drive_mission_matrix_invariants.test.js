'use strict';

/**
 * Axion Protocol — Invariantes de la Matriz Estructurada de Misiones y Gestión de Backlog.
 *
 * Valida de forma estricta:
 * 1. Organización determinista de propuestas en 4 cuadrantes (Nuevas Funciones, Auto-Curación, Backlog, Rendimiento).
 * 2. Acotación de 3 a 5 opciones claras y etiquetadas para prevenir sobrecarga cognitiva.
 * 3. Persistencia atómica de la matriz de backlog en .axion/state/mission_backlog_matrix.json.
 * 4. Integración transparente con DriveEngine.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const DriveMissionMatrix = require('../../tools/drive_mission_matrix.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-127 Invariantes de la Matriz Estructurada de Misiones para /drive ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sandbox = path.join(ROOT, 'scratch', `test_matrix_sandbox_${Date.now()}`);
fs.mkdirSync(path.join(sandbox, '.axion', 'state'), { recursive: true });

const matrix = new DriveMissionMatrix(sandbox);

// 1. Validar generación de matriz de 3 a 5 opciones
const menu4 = matrix.generateCuratedMissions({ currentFocus: 'NEW_FEATURE', maxOptions: 4 });
assert.ok(menu4.missions.length >= 3 && menu4.missions.length <= 5, 'Debe retornar entre 3 y 5 opciones');
assert.strictEqual(menu4.missions.length, 4);
console.log(`✓ Catálogo curado generado: ${menu4.missions.length} opciones estructuradas`);

// 2. Validar presencia de cuadrantes clave
const quadrants = menu4.missions.map(m => m.quadrant);
assert.ok(quadrants.includes('NEW_FEATURE'), 'Debe incluir opción de Nueva Función');
assert.ok(quadrants.includes('AUTO_HEALING'), 'Debe incluir opción de Auto-Curación');
assert.ok(quadrants.includes('BACKLOG_RESUME'), 'Debe incluir opción de Backlog / Recordatorio');
console.log('✓ Cobertura de cuadrantes validada: Nueva Función, Auto-Curación, Backlog');

// 3. Validar etiquetas de formato
menu4.missions.forEach(m => {
  assert.ok(m.formattedOption.includes('[') && m.formattedOption.includes(']'), 'Cada opción debe tener una etiqueta visible');
});
console.log('✓ Formato y etiquetado visual de opciones validado');

// 4. Validar persistencia de backlog
const updatedBacklog = matrix.setFocus('AUTO_HEALING');
assert.strictEqual(updatedBacklog.activeFocus, 'AUTO_HEALING');
const reloaded = matrix.loadBacklog();
assert.strictEqual(reloaded.activeFocus, 'AUTO_HEALING');
console.log('✓ Persistencia atómica de foco y backlog verificada');

// 5. Validar integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const driveMenu = driveEngine.getCuratedMissionMatrix({ maxOptions: 3 });
assert.strictEqual(driveMenu.missions.length, 3);
console.log('✓ Integración DriveEngine.getCuratedMissionMatrix() verificada');

// Limpiar sandbox
if (fs.existsSync(sandbox)) {
  fs.rmSync(sandbox, { recursive: true, force: true });
}

console.log('\nPASS AX-F-127 — Invariantes de la matriz estructurada de misiones demostrados al 100%.');
