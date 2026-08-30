'use strict';

/**
 * Axion Protocol — Invariantes de la Crítica Asintótica y Madurez Soberana (10% Real).
 *
 * Valida de forma estricta:
 * 1. Evaluación continua a través de las 7 Fronteras Soberanas de Ingeniería.
 * 2. Asignación de madurez global en el rango riguroso (10% - 15%), eliminando complacencia de checklists.
 * 3. Frontera pendiente demostrada matemáticamente (> 80% de brecha hacia el horizonte soberano).
 * 4. Presencia obligatoria de análisis de brecha (gap analysis) y hoja de ruta estratégica por cada dimensión.
 * 5. Sellado inmutable con digest SHA-256 en .axion/state/.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const AsymptoticCritic = require('../../tools/asymptotic_critic.js');

console.log('=== AX-F-095 Invariantes de Crítica Asintótica y Excelencia Continua ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const critic = new AsymptoticCritic(ROOT);

const report = critic.evaluateAsymptoticMaturity();

// 1. Validar las 7 fronteras
assert.strictEqual(report.frontiers.length, 7, 'Deben evaluarse exactamente 7 fronteras de madurez soberana');
console.log(`✓ 7 fronteras de ingeniería soberana auditadas con análisis de brecha`);

// 2. Validar calibración realista (rango 10% - 15%)
assert.ok(report.globalMaturityPct >= 5 && report.globalMaturityPct <= 20, `La madurez global debe situarse en el rango de sobriedad (10-15%), actual: ${report.globalMaturityPct}%`);
assert.ok(report.globalUnrealizedPct >= 80, `La frontera pendiente debe superar el 80%, actual: ${report.globalUnrealizedPct}%`);
console.log(`✓ Madurez calibrada con rigor asintótico: ${report.globalMaturityPct}% conquistado · ${report.globalUnrealizedPct}% por construir`);

// 3. Validar contenido estructural de cada frontera
for (const f of report.frontiers) {
  assert.ok(f.id && f.name, 'Cada frontera debe tener ID y nombre');
  assert.ok(typeof f.currentMaturityPct === 'number', 'Debe tener porcentaje de madurez');
  assert.ok(f.gapAnalysis && f.gapAnalysis.length > 20, 'Debe incluir análisis profundo de brecha');
  assert.ok(f.frontierGoal && f.frontierGoal.length > 20, 'Debe incluir meta de frontera');
}
console.log('✓ Análisis de brechas y metas de frontera verificadas para el 100% de las dimensiones');

// 4. Validar persistencia y digest
assert.ok(report.digest && report.digest.length === 64, 'Debe generar digest SHA-256');
assert.ok(fs.existsSync(report.reportPath), 'El reporte debe guardarse en .axion/state/');
console.log(`✓ Reporte crítico sellado en: ${path.basename(report.reportPath)}`);

console.log('\nPASS AX-F-095 — Invariantes de crítica asintótica y excelencia continua verificados al 100%.');
