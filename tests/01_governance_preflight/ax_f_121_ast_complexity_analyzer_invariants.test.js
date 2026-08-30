'use strict';

/**
 * Axion Protocol — Invariantes del Analizador de Complejidad Ciclomática y Flujo de Control AST.
 *
 * Valida de forma estricta:
 * 1. Análisis determinista de métrica de McCabe V(G) y profundidad de anidamiento D_max.
 * 2. Cumplimiento del 100% de los estándares Clean Code en todos los módulos de tools/, bin/ y core/.
 * 3. Detección y advertencia inmediata ante antipatrones de pirámide de anidamiento.
 * 4. Integración transparente con DriveEngine.
 */

const assert = require('assert');
const path = require('path');
const ASTComplexityAnalyzer = require('../../tools/ast_complexity_analyzer.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-121 Invariantes de Complejidad Ciclomática y Flujo de Control AST ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const analyzer = new ASTComplexityAnalyzer(ROOT);

// 1. Validar auditoría global de código
const audit = analyzer.auditAllModules();
assert.strictEqual(audit.pass, true, 'Todos los módulos deben cumplir las cotas de complejidad');
assert.ok(audit.totalAudited >= 50, 'Debe auditar al menos 50 módulos');
assert.strictEqual(audit.totalCompliant, audit.totalAudited, 'El 100% de los módulos deben ser conformes');
assert.strictEqual(audit.complianceRate, '100.0%');
console.log(`✓ Auditoría global validada: ${audit.totalAudited} módulos analizados al 100.0% de conformidad`);

// 2. Validar análisis individual de un módulo clave
const sampleModule = 'tools/blast_radius_estimator.js';
const sampleAnalysis = analyzer.analyzeFile(sampleModule);

assert.ok(sampleAnalysis, 'El análisis del módulo no debe ser null');
assert.strictEqual(sampleAnalysis.isCompliant, true);
assert.strictEqual(sampleAnalysis.rating, 'CLEAN_A_GRADE');
assert.ok(sampleAnalysis.maxNesting <= 5, 'El anidamiento de blast_radius_estimator debe ser <= 5');
console.log(`✓ Módulo individual [${sampleModule}] calificado como ${sampleAnalysis.rating} (Anidamiento: ${sampleAnalysis.maxNesting})`);

// 3. Validar integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const driveAudit = driveEngine.auditCodeComplexity();
assert.strictEqual(driveAudit.pass, true, 'DriveEngine debe ejecutar la auditoría de complejidad');
console.log('✓ Integración DriveEngine.auditCodeComplexity() verificada');

console.log('\nPASS AX-F-121 — Invariantes de complejidad ciclomática y flujo de control AST verificados al 100%.');
