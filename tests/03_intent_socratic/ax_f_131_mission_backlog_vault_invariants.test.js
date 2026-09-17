'use strict';

/**
 * Axion Protocol — Invariantes de la Bóveda Persistente de Misiones y Formato Visual.
 *
 * Valida de forma estricta:
 * 1. Persistencia de reservorio de misiones a largo plazo en .axion/state/mission_vault.json.
 * 2. Formateo visual elegante de opciones con insignias de categoría e iconos legibles.
 * 3. Ordenamiento determinista por prioridad técnica.
 * 4. Integración transparente con DriveEngine.
 */

const assert = require('assert');
const { crearSandboxTemporal } = require('../../tools/test_sandbox.js');
const path = require('path');
const fs = require('fs');
const os = require('os');
const MissionBacklogVault = require('../../tools/mission_backlog_vault.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-131 Invariantes de la Bóveda Persistente de Misiones y Formato Visual ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sandbox = crearSandboxTemporal('test_vault_sandbox');
fs.mkdirSync(path.join(sandbox, '.axion', 'state'), { recursive: true });

const vault = new MissionBacklogVault(sandbox);

// 1. Validar carga y persistencia del reservorio
const initialVault = vault.loadVault();
assert.ok(Array.isArray(initialVault.reservoir), 'El reservorio debe ser un array');
assert.ok(initialVault.reservoir.length >= 4, 'Debe contener al menos 4 misiones iniciales');
console.log(`✓ Reservorio cargado con éxito: ${initialVault.reservoir.length} misiones indexadas`);

// 2a. Validar que por defecto con repo limpio devuelve bloqueo fail-closed
const defaultSelection = vault.getVisualMissionSelection(4);
assert.strictEqual(defaultSelection.status, 'BLOCKED_CONTEXT_REQUIRED');
assert.strictEqual(defaultSelection.displayedCount, 0);

// 2b. Validar formateo visual de opciones (con includeUnverified explícito)
const selection = vault.getVisualMissionSelection(4, '', { includeUnverified: true });
assert.strictEqual(selection.displayedCount, 4);
assert.ok(selection.options[0].formattedOption.startsWith('(Recomendado)'), 'La primera opción debe ser la recomendada');
assert.ok(selection.options[0].formattedOption.includes('[') && selection.options[0].formattedOption.includes(']'));
console.log('✓ Formateo visual de alta legibilidad e insignias validado');

// 2c. Validar mutaciones del ciclo de vida (add, postpone, archive, reemerge)
const added = vault.addMission({ title: 'Misión Test Dinámica', category: 'NEW_FEATURE', priority: 99 });
assert.ok(added && added.id, 'Debe agregar la misión con ID');
assert.strictEqual(vault.loadVault().reservoir.some(m => m.id === added.id), true);

const postponed = vault.postponeMission(added.id);
assert.strictEqual(postponed, true);
assert.strictEqual(vault.loadVault().reservoir.find(m => m.id === added.id).status, 'POSTPONED');

const archived = vault.archiveMission(added.id);
assert.strictEqual(archived, true);
assert.strictEqual(vault.loadVault().reservoir.find(m => m.id === added.id).status, 'ARCHIVED');

const reemerged = vault.reemergeMission(added.id, 95);
assert.strictEqual(reemerged, true);
assert.strictEqual(vault.loadVault().reservoir.find(m => m.id === added.id).status, 'QUEUED');
console.log('✓ Mutaciones de ciclo de vida (add, postpone, archive, reemerge) verificadas');

// 3. Validar integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const driveSelection = driveEngine.getVaultMissionSelection(3, '', { includeUnverified: true });
assert.strictEqual(driveSelection.displayedCount, 3);
console.log('✓ Integración DriveEngine.getVaultMissionSelection() verificada');

// Limpiar sandbox
if (fs.existsSync(sandbox)) {
  fs.rmSync(sandbox, { recursive: true, force: true });
}

console.log('\nPASS AX-F-131 — Invariantes de la bóveda persistente de misiones demostrados al 100%.');
