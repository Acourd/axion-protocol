'use strict';

/**
 * AX-F-194: Invariantes del Verificador Semántico de Contratos entre Módulos (M_COG_006)
 *
 * Valida de forma determinista:
 * 1. Extracción estática de firmas funcionales y cálculo de aridad obligatoria vs máxima.
 * 2. Detección estricta de violaciones por omisión de argumentos requeridos (MISSING_REQUIRED_ARGUMENT).
 * 3. Detección de sobrepaso de aridad en funciones cerradas (EXTRA_UNHANDLED_ARGUMENTS).
 * 4. Auditoría de contratos de módulos centrales alcanzando 100% de conformidad (ALL_CONTRACTS_VERIFIED).
 * 5. Integración transparente con DriveEngine.auditSemanticContracts().
 */

const assert = require('assert');
const path = require('path');
const SemanticContractVerifier = require('../../tools/semantic_contract_verifier.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-194 Invariantes del Verificador Semántico de Contratos (M_COG_006) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const verifier = new SemanticContractVerifier(ROOT);

// Invariante 1: Extracción de firma de función
const sig = verifier.getFunctionSignature('tools/dynamic_invariant_assertor.js', 'synthesizeGuard');
assert.ok(sig !== null, 'Debe extraer la firma de synthesizeGuard');
assert.strictEqual(sig.minArgs, 1, 'Debe requerir 1 argumento obligatorio');
assert.strictEqual(sig.maxArgs, 1, 'Debe admitir máximo 1 argumento');
console.log(`✓ Invariante 1: Firma extraída correctamente (minArgs: ${sig.minArgs}, maxArgs: ${sig.maxArgs})`);

// Invariante 2: Detección de llamadas deficientes y excesivas
const badMissing = verifier.verifyInvocation('tools/dynamic_invariant_assertor.js', 'synthesizeGuard', 0);
assert.strictEqual(badMissing.isCompliant, false);
assert.strictEqual(badMissing.status, 'MISSING_REQUIRED_ARGUMENT');

const badExtra = verifier.verifyInvocation('tools/dynamic_invariant_assertor.js', 'synthesizeGuard', 3);
assert.strictEqual(badExtra.isCompliant, false);
assert.strictEqual(badExtra.status, 'EXTRA_UNHANDLED_ARGUMENTS');

const goodCall = verifier.verifyInvocation('tools/dynamic_invariant_assertor.js', 'synthesizeGuard', 1);
assert.strictEqual(goodCall.isCompliant, true);
assert.strictEqual(goodCall.status, 'CONTRACT_SATISFIED');
console.log('✓ Invariante 2: Detección precisa de violaciones de aridad y satisfacción de contrato validada');

// Invariante 3: Auditoría integral de contratos centrales
const coreReport = verifier.auditCoreContracts();
assert.strictEqual(coreReport.status, 'ALL_CONTRACTS_VERIFIED');
assert.strictEqual(coreReport.violationsCount, 0);
assert.strictEqual(coreReport.complianceRate, '100%');
console.log(`✓ Invariante 3: Auditoría central verificada al 100% (${coreReport.compliantCount}/${coreReport.totalCallsAudited} llamadas válidas)`);

// Invariante 4: Integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const driveReport = driveEngine.auditSemanticContracts();
assert.strictEqual(driveReport.status, 'ALL_CONTRACTS_VERIFIED');
assert.strictEqual(driveReport.complianceRate, '100%');
console.log('✓ Invariante 4: Integración nativa con DriveEngine.auditSemanticContracts() verificada');

console.log('\nPASS AX-F-194 — Invariantes del verificador semántico de contratos demostrados al 100%.');
