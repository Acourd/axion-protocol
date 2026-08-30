'use strict';

/**
 * Axion Protocol — Invariantes del Analizador de Flujo de Datos y Propagación Taint en AST.
 *
 * Valida de forma estricta:
 * 1. Rastreo determinista de fuentes externas (Sources), sanitizadores y puntos de ejecución (Sinks).
 * 2. Cero rutas de datos no sanitizadas (Zero Taint Violations) en todos los módulos de producción.
 * 3. Detección y bloqueo inmediato ante la introducción sintética de patrones de taint inseguro.
 * 4. Integración transparente con DriveEngine.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const ASTTaintDataFlowAnalyzer = require('../../tools/ast_taint_dataflow_analyzer.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-123 Invariantes de Análisis de Flujo de Datos y Taint en AST ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const analyzer = new ASTTaintDataFlowAnalyzer(ROOT);

// 1. Validar auditoría global de taint
const audit = analyzer.auditAllModules();
assert.strictEqual(audit.pass, true, 'No deben existir rutas de taint sin sanitizar en el repositorio');
assert.ok(audit.totalAudited >= 50, 'Debe auditar al menos 50 módulos');
assert.strictEqual(audit.totalViolations, 0, 'Las violaciones de taint deben ser exactamente 0');
assert.strictEqual(audit.complianceRate, '100.0%');
console.log(`✓ Auditoría global de taint validada: ${audit.totalAudited} módulos analizados (100.0% seguros)`);

// 2. Probar detección de inyección de taint insegura en sandbox
const sandbox = path.join(ROOT, 'scratch', `test_taint_sandbox_${Date.now()}`);
fs.mkdirSync(sandbox, { recursive: true });

const unsafeCode = `
'use strict';
const cp = require('child_process');
// Inseguro: uso directo de process.argv en execSync sin sanitizar
const cmd = process.argv[2];
cp.execSync(process.argv[2]);
`;

const unsafeFile = path.join(sandbox, 'unsafe_module.js');
fs.writeFileSync(unsafeFile, unsafeCode, 'utf8');

const sandboxAnalyzer = new ASTTaintDataFlowAnalyzer(sandbox);
const unsafeAnalysis = sandboxAnalyzer.analyzeFile('unsafe_module.js');

assert.strictEqual(unsafeAnalysis.pass, false, 'El código con taint directo debe ser marcado como inseguro');
assert.strictEqual(unsafeAnalysis.unsanitizedCount, 1);
assert.strictEqual(unsafeAnalysis.verdict, 'UNSANITIZED_DATAFLOW_DETECTED');
console.log('✓ Detección de propagación de taint inseguro verificada');

// 3. Validar integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const driveTaint = driveEngine.auditDataFlowTaint();
assert.strictEqual(driveTaint.pass, true, 'DriveEngine debe ejecutar la auditoría de taint');
console.log('✓ Integración DriveEngine.auditDataFlowTaint() verificada');

// Limpiar sandbox
if (fs.existsSync(sandbox)) {
  fs.rmSync(sandbox, { recursive: true, force: true });
}

console.log('\nPASS AX-F-123 — Invariantes de flujo de datos y análisis de taint verificados al 100%.');
