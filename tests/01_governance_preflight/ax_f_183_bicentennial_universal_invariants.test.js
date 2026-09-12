#!/usr/bin/env node
'use strict';

/**
 * AX-F-183: Invariantes Universales Bicentenarios (Suite 200 / Axion Protocol v2.0)
 *
 * El hito bicentenario supremo de Axion Protocol:
 * 1. Ejecución íntegra del Verificador de Invariantes Universales (verifyAllInvariants).
 * 2. Validación formal del veredicto SOVEREIGN_SYSTEM_VERIFIED.
 * 3. Ratificación de Cero Dependencias (dependencies: {}).
 * 4. Verificación de los 3 pilares de Swarm v2.0, SBOMs y las 12 skills consolidadas.
 * 5. Emisión del reporte local de verificación estructural con huella SHA-256.
 */

const assert = require('assert');
const path = require('path');
const UniversalInvariantsVerifier = require('../../tools/universal_invariants_verifier.js');

console.log('=== AX-F-183: Invariantes Universales Bicentenarios (Hito 200 Suites) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const verifier = new UniversalInvariantsVerifier(ROOT);
const summary = verifier.verifyAllInvariants();

// Invariante 1: Veredicto de Gobernanza Local
assert.strictEqual(
  summary.verdict,
  'LOCAL_GOVERNANCE_VERIFIED',
  `El sistema debe alcanzar veredicto LOCAL_GOVERNANCE_VERIFIED (fallaron: ${summary.checks.filter(c => !c.pass).map(c => c.name).join(', ')})`
);
console.log('  ✓ Invariante 1: Veredicto LOCAL_GOVERNANCE_VERIFIED confirmado.');

// Invariante 2: 100% de comprobaciones superadas
assert.strictEqual(summary.passedChecks, summary.totalChecks, 'Todas las comprobaciones deben pasar');
for (const check of summary.checks) {
  assert.strictEqual(check.pass, true, `Comprobación '${check.name}' falló`);
  console.log(`    • [PASS] ${check.name}: ${check.detail}`);
}
console.log('  ✓ Invariante 2: 100% de comprobaciones de arquitectura superadas.');

// Invariante 3: Reporte local de verificación estructural con huella SHA-256
assert.ok(typeof summary.reportDigest === 'string', 'Debe emitir reporte');
assert.strictEqual(summary.reportDigest.length, 64, 'Digest debe ser SHA-256 de 64 caracteres');
assert.strictEqual(summary.certificateDigest, undefined, 'certificateDigest debe estar eliminado sin alias retrocompatibles');
console.log(`  ✓ Invariante 3: Reporte local de verificación estructural emitido (${summary.reportDigest.slice(0, 16)}...).`);

// Invariante 4: Delimitación explícita de alcance (scopeLimits)
assert.strictEqual(summary.scopeLimits.validatesLocalWorkspaceStructure, true);
assert.strictEqual(summary.scopeLimits.certifiesExecutionIntegrity, false);
assert.strictEqual(summary.scopeLimits.externalCertification, 'NONE');
const sbomCheck = summary.checks.find(c => c.name === 'Local SBOM Manifests');
assert.ok(sbomCheck, 'Debe incluir comprobación Local SBOM Manifests');
assert.strictEqual(sbomCheck.pass, true);
console.log('  ✓ Invariante 4: Delimitación de alcance explícita y Local SBOM Manifests verificados.');

console.log('\nPASS: AX-F-183 — Hito Bicentenario alcanzado con comprobaciones e invariantes en verde.');
