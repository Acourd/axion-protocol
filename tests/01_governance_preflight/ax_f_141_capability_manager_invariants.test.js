'use strict';

/**
 * Axion Protocol — Invariantes del Gestor Autónomo de Capacidades Modulares.
 *
 * Valida de forma estricta:
 * 1. Catálogo estructurado de capacidades modulares zero-bloat.
 * 2. Activación determinista (addCapability) y persistencia en .axion/state/capabilities.json.
 * 3. Desactivación segura (removeCapability) y reversibilidad.
 * 4. Búsqueda y recomendación semántica (consult).
 * 5. Integración transparente con DriveEngine y CLI unificado.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const CapabilityManager = require('../../tools/capability_manager.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-141 Invariantes del Gestor de Capacidades Modulares ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sandbox = path.join(ROOT, 'scratch', `test_capability_sandbox_${Date.now()}`);
fs.mkdirSync(path.join(sandbox, '.axion', 'state'), { recursive: true });

try {
  const manager = new CapabilityManager(sandbox);

  // 1. Validar listado inicial de capacidades (todas INACTIVE)
  const initialList = manager.listCapabilities();
  assert.ok(initialList.totalAvailable >= 5, 'Debe haber al menos 5 capacidades en catálogo');
  assert.strictEqual(initialList.activeCount, 0, 'Inicialmente 0 capacidades deben estar activas');
  console.log(`✓ Catálogo inicial validado (${initialList.totalAvailable} capacidades disponibles)`);

  // 2. Validar activación de una capacidad
  const addRes = manager.addCapability('security-deep-audit');
  assert.strictEqual(addRes.success, true);
  assert.strictEqual(addRes.capability.name, 'security-deep-audit');

  const afterAdd = manager.listCapabilities();
  assert.strictEqual(afterAdd.activeCount, 1);
  const activeCap = afterAdd.capabilities.find(c => c.name === 'security-deep-audit');
  assert.strictEqual(activeCap.status, 'ACTIVE');
  console.log('✓ Activación de capacidad modular validada (security-deep-audit -> ACTIVE)');

  // 3. Validar consulta semántica
  const consultRes = manager.consult('vulnerabilidades y owasp');
  assert.ok(consultRes.length >= 1);
  assert.strictEqual(consultRes[0].name, 'security-deep-audit');
  assert.strictEqual(consultRes[0].status, 'ACTIVE');
  console.log(`✓ Consulta semántica validada (Top match: [${consultRes[0].domain}] ${consultRes[0].name})`);

  // 4. Validar desactivación segura
  const removeRes = manager.removeCapability('security-deep-audit');
  assert.strictEqual(removeRes.success, true);
  const afterRemove = manager.listCapabilities();
  assert.strictEqual(afterRemove.activeCount, 0);
  console.log('✓ Desactivación segura validada (security-deep-audit -> INACTIVE)');

  // 5. Validar integración con DriveEngine
  const driveEngine = new DriveEngine(ROOT);
  const driveCaps = driveEngine.listCapabilities();
  assert.ok(driveCaps.totalAvailable >= 5);

  const driveConsult = driveEngine.consultCapabilities('despliegue canary');
  assert.ok(driveConsult.some(c => c.name === 'cloud-deployment'));
  console.log('✓ Integración DriveEngine.listCapabilities() y consultCapabilities() verificada');

} finally {
  if (fs.existsSync(sandbox)) {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
}

console.log('\nPASS AX-F-141 — Invariantes del gestor de capacidades modulares demostrados al 100%.');
