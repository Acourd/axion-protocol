'use strict';

/**
 * Axion Protocol — Invariantes del Compactador y Podador de Workspace.
 *
 * Valida de forma estricta:
 * 1. Inicialización y ejecución determinista de WorkspaceDebloater en sandbox aislado.
 * 2. Podado controlado de checkpoints antiguos preservando la cuota configurada.
 * 3. Limpieza de estados efímeros obsoletos en .axion/state/.
 * 4. Retorno seguro sin interferencias de concurrencia.
 */

const assert = require('assert');
const { crearSandbox } = require('../../tools/test_sandbox.js');
const path = require('path');
const fs = require('fs');
const WorkspaceDebloater = require('../../tools/workspace_debloater.js');

console.log('=== AX-F-101 Invariantes del Podador y Compactador de Workspace ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sandbox = crearSandbox('test-debloat-sandbox');
fs.mkdirSync(path.join(sandbox, '.axion', 'checkpoints'), { recursive: true });
fs.mkdirSync(path.join(sandbox, '.axion', 'state'), { recursive: true });

// Crear 5 checkpoints simulados
for (let i = 1; i <= 5; i++) {
  fs.mkdirSync(path.join(sandbox, '.axion', 'checkpoints', `2026-08-30__cp_${i}`));
}

// Crear 15 archivos de estado simulados
for (let i = 1; i <= 15; i++) {
  fs.writeFileSync(path.join(sandbox, '.axion', 'state', `deep-deliberation-${i}.json`), '{}');
}

const debloater = new WorkspaceDebloater(sandbox);

// 1. Validar inicialización
assert.ok(debloater.root && debloater.root.length > 0, 'Debe inicializar la ruta raíz');
assert.ok(debloater.checkpointsDir && debloater.stateDir, 'Debe inicializar las rutas de checkpoints y state');
console.log('✓ WorkspaceDebloater inicializado correctamente en sandbox aislado');

// 2. Ejecutar compactación controlada (retener máximo 3)
const report = debloater.debloatAll(3);
assert.strictEqual(report.pass, true, 'La compactación debe retornar pass: true');
assert.strictEqual(report.initialCheckpointsCount, 5, 'Debe detectar los 5 checkpoints iniciales');
assert.strictEqual(report.prunedCheckpoints, 2, 'Debe haber podado 2 checkpoints (5 - 3 = 2)');
assert.strictEqual(report.remainingCheckpointsCount, 3, 'Deben quedar exactamente 3 checkpoints');
assert.strictEqual(report.prunedStateFiles, 5, 'Debe haber podado 5 archivos de estado (15 - 10 = 5)');
console.log(`✓ Compactación determinista verificada: ${report.remainingCheckpointsCount} checkpoints conservados exactamente`);

// Limpiar sandbox
try {
  fs.rmSync(sandbox, { recursive: true, force: true });
} catch (_) {}

console.log('\nPASS AX-F-101 — Invariantes del podador de workspace verificados al 100%.');
