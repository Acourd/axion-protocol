#!/usr/bin/env node
'use strict';

/**
 * AX-F-179: Invariantes del Reporte de Madurez Asintótica v2.0
 *
 * Verifica:
 * 1. Existencia y consistencia bilingüe de docs/ASYMPTOTIC_MATURITY_REPORT.md (.es.md).
 * 2. Inclusión de las 7 Fronteras de Madurez Soberana.
 * 3. Detalle de la escalera evolutiva de 3 peldaños (Local, 10x, Asintótico).
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('=== AX-F-179: Invariantes de Reporte de Madurez Asintótica v2.0 ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const docEn = path.join(ROOT, 'docs', 'ASYMPTOTIC_MATURITY_REPORT.md');
const docEs = path.join(ROOT, 'docs', 'ASYMPTOTIC_MATURITY_REPORT.es.md');

assert.ok(fs.existsSync(docEn), 'docs/ASYMPTOTIC_MATURITY_REPORT.md debe existir');
assert.ok(fs.existsSync(docEs), 'docs/ASYMPTOTIC_MATURITY_REPORT.es.md debe existir');

const contentEn = fs.readFileSync(docEn, 'utf8');
const contentEs = fs.readFileSync(docEs, 'utf8');

// Invariante 1: Las 7 fronteras mencionadas
const fronteras = [
  'Formal Verification',
  'Fail-Closed',
  'Cognitive Density',
  'Fractal Memory',
  'Adaptive Evolution',
  'Immutable DSSE',
  'Anti-Vibecoding'
];

for (const f of fronteras) {
  assert.ok(contentEn.includes(f), `El reporte en inglés debe incluir frontera: ${f}`);
}
console.log('  ✓ Invariante 1: Las 7 Fronteras de Madurez Soberana verificadas.');

// Invariante 2: Escalera de 3 peldaños
assert.ok(contentEn.includes('Tier 1') && contentEn.includes('Tier 2') && contentEn.includes('Tier 3'), 'Debe documentar los 3 Tiers en inglés');
assert.ok(contentEs.includes('Peldaño 1') && contentEs.includes('Peldaño 2') && contentEs.includes('Peldaño 3'), 'Debe documentar los 3 Peldaños en español');
console.log('  ✓ Invariante 2: Escalera evolutiva de 3 peldaños validada en ambas lenguas.');

console.log('\nPASS: AX-F-179 — Documentación de Madurez Asintótica verificada con 2/2 invariantes en verde.');
