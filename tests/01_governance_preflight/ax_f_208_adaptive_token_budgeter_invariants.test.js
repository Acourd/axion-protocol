'use strict';

/**
 * AX-F-208: Invariantes del Presupuestador Adaptativo de Cuotas de Tokens (M_TOK_008)
 *
 * Valida de forma determinista:
 * 1. Asignación de cuotas por niveles de complejidad (LOW, MEDIUM, HIGH, MAX).
 * 2. Transiciones de estado deterministas: HEALTHY -> WARNING (>=80%) -> EXHAUSTED (>=100%).
 * 3. Freno fail-closed de inferencia (allowed: false) al sobrepasar la cuota.
 * 4. Extensión presupuestaria formal con justificación obligatoria.
 * 5. Generación de informe TokenBudgetAuditRecord_v1 sellado con SHA-256.
 * 6. Integración transparente con DriveEngine.createAdaptiveTokenBudgeter().
 */

const assert = require('assert');
const path = require('path');
const AdaptiveTokenBudgeter = require('../../tools/adaptive_token_budgeter.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-208 Invariantes del Presupuestador Adaptativo de Tokens (M_TOK_008) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const budgeter = new AdaptiveTokenBudgeter({ projectRoot: ROOT });

// Invariante 1: Asignación por tier y consumo saludable
const allocation = budgeter.allocateBudget('subagent_1', { tier: 'LOW' }); // 2000 tokens
assert.strictEqual(allocation.allocated, 2000);
assert.strictEqual(allocation.status, 'HEALTHY');

const step1 = budgeter.consumeTokens('subagent_1', 1000);
assert.strictEqual(step1.status, 'HEALTHY');
assert.strictEqual(step1.allowed, true);
assert.strictEqual(step1.remaining, 1000);
console.log('✓ Invariante 1: Asignación por tier y consumo inicial saludable validados');

// Invariante 2: Alerta temprana al 80% (WARNING)
const step2 = budgeter.consumeTokens('subagent_1', 650); // total 1650/2000 = 82.5%
assert.strictEqual(step2.status, 'WARNING');
assert.strictEqual(step2.allowed, true);
console.log(`✓ Invariante 2: Detección preventiva de umbral crítico (82.5% -> WARNING) demostrada`);

// Invariante 3: Freno fail-closed al 100% (EXHAUSTED)
const step3 = budgeter.consumeTokens('subagent_1', 400); // total 2050/2000
assert.strictEqual(step3.status, 'EXHAUSTED');
assert.strictEqual(step3.allowed, false, 'Debe denegar nuevas inferencias tras agotamiento');
console.log('✓ Invariante 3: Freno fail-closed (allowed: false) ante cuota excedida verificado');

// Invariante 4: Extensión formal justificada
assert.throws(() => {
  budgeter.requestExtension('subagent_1', '', 500);
}, /La solicitud de extensión requiere una justificación formal/);

const ext = budgeter.requestExtension('subagent_1', 'Completar suite formal de verificación', 1000);
assert.strictEqual(ext.newAllocated, 3000);
assert.strictEqual(ext.status, 'HEALTHY');
console.log('✓ Invariante 4: Exigencia de justificación para extensiones de presupuesto verificada');

// Invariante 5: Informe formal con digest criptográfico
const report = budgeter.getBudgetReport('subagent_1');
assert.strictEqual(report.reportType, 'TokenBudgetAuditRecord_v1');
assert.ok(report.auditDigest && report.auditDigest.length === 64);
console.log(`✓ Invariante 5: Informe criptográfico de auditoría generado (Digest: ${report.auditDigest.slice(0, 16)}...)`);

// Invariante 6: Integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const driveBudgeter = driveEngine.createAdaptiveTokenBudgeter();
assert.ok(driveBudgeter instanceof AdaptiveTokenBudgeter);
driveBudgeter.allocateBudget('drive_task', { amount: 5000 });
const driveStep = driveBudgeter.consumeTokens('drive_task', 100);
assert.strictEqual(driveStep.status, 'HEALTHY');
console.log('✓ Invariante 6: Integración nativa con DriveEngine.createAdaptiveTokenBudgeter() verificada');

console.log('\nPASS AX-F-208 — Invariantes del presupuestador adaptativo demostrados al 100%.');
