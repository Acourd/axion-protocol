'use strict';

/**
 * AX-F-203: Invariantes del Oráculo de Razonamiento Contrafáctico (M_COG_012)
 *
 * Valida de forma determinista:
 * 1. Simulación causal de caminos críticos (Factual vs Contrafáctico).
 * 2. Cuantificación matemática de riesgo, reversibilidad y tokens mediante Regret Score.
 * 3. Recomendaciones adaptativas de mitigación (PROCEED_FACTUAL, SWITCH_TO_COUNTERFACTUAL).
 * 4. Emisión de certificado CounterfactualAuditCertificate_v1 sellado con SHA-256.
 * 5. Integración transparente con DriveEngine.evaluateCounterfactualPath().
 */

const assert = require('assert');
const path = require('path');
const CounterfactualReasoningOracle = require('../../tools/counterfactual_reasoning_oracle.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-203 Invariantes del Oráculo de Razonamiento Contrafáctico (M_COG_012) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const oracle = new CounterfactualReasoningOracle(ROOT);

const factualHighRisk = {
  title: 'Mutación directa en producción sin checkpoint',
  riskLevel: 'HIGH',
  reversibility: 'IRREVERSIBLE',
  tokenCost: 1000
};

const counterfactualSafe = {
  title: 'Punto de control previo con rollback verificado',
  riskLevel: 'LOW',
  reversibility: 'INSTANT',
  tokenCost: 200
};

// Invariante 1: Detección de arrepentimiento alto y recomendación de viraje
const audit = oracle.simulateCounterfactual(factualHighRisk, counterfactualSafe);
assert.strictEqual(audit.status, 'SIMULATION_COMPLETED');
assert.strictEqual(audit.recommendation, 'SWITCH_TO_COUNTERFACTUAL');
assert.ok(audit.regretScore > 0.5, 'El regret score debe ser alto para mutaciones irreversibles de alto riesgo');
assert.ok(audit.certificateDigest && audit.certificateDigest.length === 64);
console.log(`✓ Invariante 1: Auditoría contrafáctica completada con recomendación "${audit.recommendation}" (Regret: ${audit.regretScore})`);

// Invariante 2: Aprobación factual cuando el camino propuesto es el óptimo
const factualOptimal = {
  title: 'Validación en arnés aislado',
  riskLevel: 'LOW',
  reversibility: 'INSTANT',
  tokenCost: 50
};
const counterfactualSuboptimal = {
  title: 'Despliegue a ciegas sin arnés',
  riskLevel: 'CRITICAL',
  reversibility: 'IRREVERSIBLE',
  tokenCost: 5000
};

const optimalAudit = oracle.simulateCounterfactual(factualOptimal, counterfactualSuboptimal);
assert.strictEqual(optimalAudit.recommendation, 'PROCEED_FACTUAL');
console.log('✓ Invariante 2: Autorización de camino factual óptimo verificada');

// Invariante 3: Integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const driveAudit = driveEngine.evaluateCounterfactualPath(factualHighRisk, counterfactualSafe);
assert.strictEqual(driveAudit.status, 'SIMULATION_COMPLETED');
assert.strictEqual(driveAudit.certificateType, 'CounterfactualAuditCertificate_v1');
assert.strictEqual(driveAudit.recommendation, 'SWITCH_TO_COUNTERFACTUAL');
console.log('✓ Invariante 3: Integración nativa con DriveEngine.evaluateCounterfactualPath() verificada');

console.log('\nPASS AX-F-203 — Invariantes del oráculo contrafáctico demostrados al 100%.');
