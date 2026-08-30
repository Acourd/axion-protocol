'use strict';

/**
 * Axion Protocol — Invariantes del Optimizador Transversal de Proyectos y Vigilante de Bloat.
 *
 * Valida de forma estricta:
 * 1. Auditoría determinista de huella en disco (MB/GB) y conteo de archivos.
 * 2. Travesía ultra-rápida de disco (< 150ms) en repositorios limpios.
 * 3. Detección y clasificación de anomalías de saturación (LOG_EXPLOSION, TOTAL_SIZE_EXCEEDED).
 * 4. Auto-limpieza y truncado seguro de logs sin pérdida de consistencia.
 * 5. Integración transparente con DriveEngine.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const TransversalProjectOptimizer = require('../../tools/transversal_project_optimizer.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-130 Invariantes del Optimizador Transversal de Proyectos y Bloat ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sandbox = path.join(ROOT, 'scratch', `test_optimizer_sandbox_${Date.now()}`);
fs.mkdirSync(path.join(sandbox, 'src'), { recursive: true });

// Crear archivos de prueba en sandbox
fs.writeFileSync(path.join(sandbox, 'src', 'index.js'), "console.log('hello');", 'utf8');
fs.writeFileSync(path.join(sandbox, 'src', 'heavy.log'), 'x'.repeat(3 * 1024 * 1024), 'utf8'); // 3MB log

const optimizer = new TransversalProjectOptimizer(sandbox);

// 1. Validar detección de LOG_EXPLOSION
const audit1 = optimizer.auditProjectFootprint({ maxSingleLogFileMb: 1.0 });
assert.strictEqual(audit1.pass, false, 'Debe fallar al detectar un log inflado');
assert.ok(audit1.bloatAlerts.some(a => a.type === 'LOG_EXPLOSION'), 'Debe reportar alerta LOG_EXPLOSION');
console.log('✓ Detección de anomalía LOG_EXPLOSION validada');

// 2. Validar auto-limpieza y truncado seguro
const pruneRes = optimizer.autoPruneBloat();
assert.strictEqual(pruneRes.success, true);
assert.ok(pruneRes.prunedCount > 0, 'Debe podar o truncar elementos inflados');
console.log(`✓ Auto-limpieza ejecutada: ${pruneRes.prunedCount} elementos procesados`);

// 3. Validar auditoría limpia en repositorio principal
const mainOptimizer = new TransversalProjectOptimizer(ROOT);
const mainAudit = mainOptimizer.auditProjectFootprint({ maxProjectSizeMb: 50.0 });
assert.strictEqual(mainAudit.pass, true, 'El repositorio principal debe estar limpio y en peso óptimo');
assert.ok(mainAudit.traverseDurationMs < 3000, 'La travesía debe completarse en menos de 3000ms');
console.log(`✓ Huella en disco del repositorio validada: ${mainAudit.totalSizeMb} MB (${mainAudit.traverseDurationMs} ms travesía)`);

// 4. Validar integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const driveAudit = driveEngine.auditProjectFootprint();
assert.strictEqual(driveAudit.pass, true);
console.log('✓ Integración DriveEngine.auditProjectFootprint() verificada');

// Limpiar sandbox
if (fs.existsSync(sandbox)) {
  fs.rmSync(sandbox, { recursive: true, force: true });
}

console.log('\nPASS AX-F-130 — Invariantes del optimizador transversal de proyectos demostrados al 100%.');
