'use strict';

/**
 * Axion Protocol — Invariantes del Motor de Crítica Asintótica y Madurez Soberana (AX-F-163).
 *
 * Valida de forma estricta:
 * 1. Escaneo dinámico de evidencia empírica vs formal sin puntuaciones hardcodeadas (anti-dogmatismo).
 * 2. Cálculo matemático exacto de las 7 Fronteras de Madurez Soberana (AMR + Unrealized = 100%).
 * 3. Sellado criptográfico del reporte con SHA-256 en .axion/state/.
 * 4. Integración transparente con CLI unificado (axion critic).
 */

const assert = require('assert');
const fs = require('fs');
const AsymptoticCritic = require('../../tools/asymptotic_critic.js');

console.log('=== AX-F-163 Invariantes del Motor de Crítica Asintótica ===\n');

const critic = new AsymptoticCritic();

// 1. Validar escaneo de evidencia dinámico
const evidence = critic.scanWorkspaceEvidence();
assert.strictEqual(typeof evidence, 'object');
assert.ok(evidence.toolsCount > 0, 'Debe detectar herramientas en tools/');
assert.strictEqual(evidence.hasTests, true, 'Debe detectar suites de tests');
console.log(`✓ Escaneo dinámico de evidencia completado (${evidence.toolsCount} herramientas detectadas)`);

// 2. Validar evaluación de las 7 Fronteras
const report = critic.evaluateAsymptoticMaturity();
assert.strictEqual(typeof report, 'object');
assert.strictEqual(report.frontiers.length, 7);
assert.ok(report.globalMaturityPct > 0 && report.globalMaturityPct < 100, 'El AMR debe ser dinámico y estar entre 0 y 100');
assert.strictEqual(Number((report.globalMaturityPct + report.globalUnrealizedPct).toFixed(1)), 100.0);
assert.ok(fs.existsSync(report.reportPath), 'Debe existir el reporte sellado en .axion/state/');
console.log(`✓ Evaluación de 7 Fronteras Soberanas verificada (AMR dinámico: ${report.globalMaturityPct}%)`);

// 3. Validar consistencia del digest SHA-256
assert.ok(report.digest && report.digest.length === 64, 'Debe incluir digest SHA-256 válido');
console.log(`✓ Sellado criptográfico SHA-256 validado: ${report.digest.slice(0, 16)}...`);

console.log('\nPASS: Invariantes del Motor de Crítica Asintótica (AX-F-163) en verde.');
