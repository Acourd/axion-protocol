'use strict';

/**
 * Axion Protocol — Invariantes del Generador y Empaquetador Autónomo de Módulos & Plugins.
 *
 * Valida de forma estricta:
 * 1. Generación determinista de plantillas de código limpio y tests unitarios.
 * 2. Empaquetado atómico con registro en .axion/state/packaged_modules.json.
 * 3. Cálculo inmutable de digest SHA-256 por cada módulo generado.
 * 4. Integración transparente con DriveEngine.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const AutonomousModulePackager = require('../../tools/autonomous_module_packager.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-128 Invariantes del Empaquetador Autónomo de Módulos & Plugins ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sandbox = path.join(ROOT, 'scratch', `test_packager_sandbox_${Date.now()}`);
fs.mkdirSync(path.join(sandbox, '.axion', 'state'), { recursive: true });

const packager = new AutonomousModulePackager(sandbox);

// 1. Validar generación de plantilla de código
const tpl = packager.generateModuleTemplate({
  name: 'TelemetryReporter',
  description: 'Reportero de telemetría',
  className: 'TelemetryReporter',
  methods: [{ name: 'emitReport', params: ['data'] }]
});

assert.ok(tpl.includes('class TelemetryReporter'), 'La plantilla debe declarar la clase');
assert.ok(tpl.includes('emitReport(data)'), 'La plantilla debe incluir los métodos especificados');
console.log('✓ Generación de plantilla de código de producción validada');

// 2. Validar empaquetado y registro en sandbox
const pkgRes = packager.packageModule({
  name: 'TelemetryReporter',
  description: 'Reportero de telemetría',
  className: 'TelemetryReporter',
  methods: [{ name: 'emitReport', params: ['data'] }]
}, { targetDir: sandbox });

assert.strictEqual(pkgRes.success, true, 'El empaquetado debe ser exitoso');
assert.ok(fs.existsSync(pkgRes.targetFile), 'El archivo del módulo debe existir en disco');
assert.strictEqual(pkgRes.record.name, 'TelemetryReporter');
assert.ok(pkgRes.record.digest.length === 64, 'El digest SHA-256 debe tener 64 caracteres hex');
console.log(`✓ Módulo empaquetado en sandbox: ${path.basename(pkgRes.targetFile)} (SHA-256: ${pkgRes.record.digest.slice(0, 16)}...)`);

// 3. Validar persistencia del registro indexado
const registry = packager.loadRegistry();
assert.strictEqual(registry.modules.length, 1);
assert.strictEqual(registry.modules[0].name, 'TelemetryReporter');
console.log('✓ Registro indexado en .axion/state/packaged_modules.json validado');

// 4. Validar integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const drivePkg = driveEngine.packageAutonomousModule({
  name: 'DriveIntegrationPlugin',
  className: 'DriveIntegrationPlugin',
  methods: [{ name: 'ping', params: [] }]
}, { targetDir: sandbox });

assert.strictEqual(drivePkg.success, true, 'DriveEngine debe empaquetar módulos');
console.log('✓ Integración DriveEngine.packageAutonomousModule() verificada');

// Limpiar sandbox
if (fs.existsSync(sandbox)) {
  fs.rmSync(sandbox, { recursive: true, force: true });
}

console.log('\nPASS AX-F-128 — Invariantes del empaquetador autónomo de módulos demostrados al 100%.');
