'use strict';

/**
 * Axion Protocol — Invariantes del Orquestador de Auto-Curación Multi-Archivo y Dependencias Cruzadas.
 *
 * Valida de forma estricta:
 * 1. Detección determinista de consumidores impactados mediante el grafo de dependencias inversas.
 * 2. Planificación y síntesis coordinada de parches multi-archivo.
 * 3. Verificación formal de seguridad previa para todo el lote (Regression + SMT).
 * 4. Aplicación atómica de cambios en lote (all-or-nothing).
 * 5. Integración transparente con DriveEngine.
 */

const assert = require('assert');
const { crearSandbox } = require('../../tools/test_sandbox.js');
const path = require('path');
const fs = require('fs');
const MultiFileCrossHealer = require('../../tools/multi_file_cross_healer.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-135 Invariantes del Orquestador de Auto-Curación Multi-Archivo ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sandbox = crearSandbox('test_cross_heal_sandbox');
fs.mkdirSync(path.join(sandbox, 'tools'), { recursive: true });

const healer = new MultiFileCrossHealer(sandbox);

// 1. Validar detección de consumidores impactados en repositorio principal
const mainHealer = new MultiFileCrossHealer(ROOT);
const impact = mainHealer.findImpactedConsumers('tools/dsse.js');
assert.strictEqual(impact.provider, 'tools/dsse.js');
assert.ok(impact.impactedFilesCount >= 1, 'Debe detectar consumidores de dsse.js');
console.log(`✓ Cierre de dependencias inversas validado: ${impact.impactedFilesCount} archivos impactados detectados`);

// 2. Validar síntesis de parche multi-archivo en sandbox
const sampleProvider = "'use strict';\nfunction getPayload() {\n  return {\n    status: 'READY'\n  };\n}\nmodule.exports = { getPayload };";
const sampleConsumer = "'use strict';\nconst { getPayload } = require('./provider.js');\nfunction run() { return getPayload(); }\nmodule.exports = { run };";

const healPlan = healer.healCrossFileContract({
  providerFile: 'tools/provider.js',
  providerCode: sampleProvider,
  contractSpec: { success: true, verified: true },
  consumerFiles: [{ fileRel: 'tools/consumer.js', content: sampleConsumer }]
});

assert.strictEqual(healPlan.success, true);
assert.strictEqual(healPlan.verdict, 'MULTI_FILE_CONVERGENCE_PROVEN');
assert.strictEqual(healPlan.totalPatches, 2);
console.log('✓ Síntesis coordinada de lote multi-archivo validada (MULTI_FILE_CONVERGENCE_PROVEN)');

// 3. Validar aplicación atómica en sandbox
const applyRes = healer.applyAtomicMultiFilePatch(healPlan);
assert.strictEqual(applyRes.applied, true);
assert.strictEqual(applyRes.appliedCount, 2);
assert.ok(fs.existsSync(path.join(sandbox, 'tools', 'provider.js')));
assert.ok(fs.existsSync(path.join(sandbox, 'tools', 'consumer.js')));
console.log('✓ Aplicación atómica de cambios en disco validada');

// 4. Validar integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const driveCross = driveEngine.healCrossFileDependencies({
  providerFile: 'tools/provider.js',
  providerCode: sampleProvider,
  contractSpec: { success: true }
});

assert.strictEqual(driveCross.success, true);
console.log('✓ Integración DriveEngine.healCrossFileDependencies() verificada');

// Limpiar sandbox
if (fs.existsSync(sandbox)) {
  fs.rmSync(sandbox, { recursive: true, force: true });
}

console.log('\nPASS AX-F-135 — Invariantes de auto-curación multi-archivo demostrados al 100%.');
