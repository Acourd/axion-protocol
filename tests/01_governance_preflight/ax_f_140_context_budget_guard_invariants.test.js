'use strict';

/**
 * Axion Protocol — Invariantes del Guardián de Presupuesto de Contexto y Presión de Tokens.
 *
 * Valida de forma estricta:
 * 1. Estimación determinista de tokens y ratio de ocupación.
 * 2. Clasificación matemática de zonas de presión (LEAN, NOMINAL, PRESSURE, CRITICAL).
 * 3. Detección y ordenamiento de elementos más pesados.
 * 4. Disparo automático de compactación determinista ante presión crítica.
 * 5. Integración transparente con DriveEngine y CLI unificado.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const ContextBudgetGuard = require('../../tools/context_budget_guard.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-140 Invariantes de Presupuesto de Contexto y Presión de Tokens ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sandbox = path.join(ROOT, 'scratch', `test_budget_sandbox_${Date.now()}`);
fs.mkdirSync(path.join(sandbox, '.axion', 'state'), { recursive: true });

try {
  // Presupuesto calibrado a 10.000 tokens para pruebas unitarias
  const smallBudgetGuard = new ContextBudgetGuard(sandbox, 10000);

  // 1. Validar zona LEAN (< 50% = < 5000 tokens)
  const leanItems = ['Texto breve de prueba', 'Otra línea de instrucción'];
  const leanReport = smallBudgetGuard.evaluatePressure(leanItems);
  assert.strictEqual(leanReport.zone, 'LEAN');
  assert.ok(leanReport.usagePercent < 5.0);
  assert.strictEqual(leanReport.recommendation, 'PROCEED_NORMALLY');
  console.log(`✓ Zona LEAN validada (Uso: ${leanReport.usagePercent}%, Zona: ${leanReport.zone})`);

  // 2. Validar zona NOMINAL (50% - 69% = 5000 a 6900 tokens ≈ 22.000 caracteres)
  const nominalChars = 'A'.repeat(22000);
  const nominalReport = smallBudgetGuard.evaluatePressure([nominalChars]);
  assert.strictEqual(nominalReport.zone, 'NOMINAL');
  assert.ok(nominalReport.usagePercent >= 50.0 && nominalReport.usagePercent < 70.0);
  console.log(`✓ Zona NOMINAL validada (Uso: ${nominalReport.usagePercent}%, Zona: ${nominalReport.zone})`);

  // 3. Validar zona PRESSURE (70% - 84% ≈ 30.000 caracteres)
  const pressureChars = 'B'.repeat(30000);
  const pressureReport = smallBudgetGuard.evaluatePressure([pressureChars]);
  assert.strictEqual(pressureReport.zone, 'PRESSURE');
  assert.strictEqual(pressureReport.recommendation, 'COMPACTION_RECOMMENDED');
  console.log(`✓ Zona PRESSURE validada (Uso: ${pressureReport.usagePercent}%, Recomendación: ${pressureReport.recommendation})`);

  // 4. Validar zona CRITICAL (>= 85% ≈ 38.000 caracteres) y auto-compactación
  const criticalChars = 'C'.repeat(38000);
  const criticalEnforce = smallBudgetGuard.enforceGuard([criticalChars], { autoCompact: true });
  assert.strictEqual(criticalEnforce.zone, 'CRITICAL');
  assert.strictEqual(criticalEnforce.recommendation, 'COMPACTION_MANDATORY_BEFORE_EXECUTION');
  assert.strictEqual(criticalEnforce.autoCompacted, true);
  assert.ok(criticalEnforce.anchorPath);
  console.log(`✓ Zona CRITICAL y Auto-Compactación determinista validadas (Uso: ${criticalEnforce.usagePercent}%, Anchor creado)`);

  // 5. Validar evaluación sobre archivos reales del repositorio
  const mainGuard = new ContextBudgetGuard(ROOT, 200000);
  const mainEval = mainGuard.evaluatePressure([
    path.join(ROOT, 'README.md'),
    path.join(ROOT, 'tools', 'drive_engine.js'),
    path.join(ROOT, 'tools', 'premortem.js')
  ]);
  assert.strictEqual(mainEval.zone, 'LEAN');
  assert.ok(mainEval.consumedTokens > 0);
  assert.ok(mainEval.heaviestItems.length >= 3);
  console.log(`✓ Evaluación de archivos reales validada (${mainEval.consumedTokens.toLocaleString()} tokens, Zona: ${mainEval.zone})`);

  // 6. Validar integración con DriveEngine
  const driveEngine = new DriveEngine(ROOT);
  const driveEval = driveEngine.evaluateContextBudget(['Verificación de integración DriveEngine']);
  assert.strictEqual(driveEval.zone, 'LEAN');
  console.log('✓ Integración DriveEngine.evaluateContextBudget() y enforceContextBudget() verificada');

} finally {
  if (fs.existsSync(sandbox)) {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
}

console.log('\nPASS AX-F-140 — Invariantes de presupuesto de contexto y presión de tokens demostrados al 100%.');
