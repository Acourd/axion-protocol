'use strict';

/**
 * AX-F-198: Invariantes del Árbitro Dialéctico y Síntesis Adversarial (M_COG_009)
 *
 * Valida de forma determinista:
 * 1. Estructura triádica dialéctica (Tesis, Antítesis, Síntesis).
 * 2. Derivación determinista de salvaguardas mandatorias frente a objeciones.
 * 3. Emisión de contrato formal DialecticSynthesisContract_v1 sellado con SHA-256.
 * 4. Integración transparente con DriveEngine.deliberateDialecticDecision().
 */

const assert = require('assert');
const path = require('path');
const DialecticDebater = require('../../tools/dialectic_debater.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-198 Invariantes del Árbitro Dialéctico (M_COG_009) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const debater = new DialecticDebater(ROOT);

const proposal = {
  decisionTitle: 'Adopción de Caché KV Compartida',
  thesis: 'Unificar la memoria caché KV entre agentes concurrentes para reducir costes de cómputo.',
  antithesisObjections: [
    'Riesgo de colisión de claves entre sesiones concurrentes.',
    'Potencial acceso no autorizado a fragmentos de contexto sensible.'
  ]
};

// Invariante 1: Síntesis dialéctica y derivación de salvaguardas
const synthesis = debater.synthesizeDecision(proposal);
assert.strictEqual(synthesis.contractType, 'DialecticSynthesisContract_v1');
assert.strictEqual(synthesis.verdict, 'PROCEED_WITH_SYNTHESIS');
assert.strictEqual(synthesis.safeguards.length, 2);
assert.ok(synthesis.sha256Digest && synthesis.sha256Digest.length === 64);
console.log(`✓ Invariante 1: Síntesis dialéctica emitida con ${synthesis.safeguards.length} salvaguardas y digest SHA-256`);

// Invariante 2: Formateo visual y legibilidad
const summary = debater.formatSummary(synthesis);
assert.ok(summary.includes('### ⚖️ Síntesis Dialéctica:'));
assert.ok(summary.includes('🏛️ Tesis:'));
assert.ok(summary.includes('⚔️ Objeciones Adversariales Evaluadas:'));
console.log('✓ Invariante 2: Formato visual y métricas de deliberación comprobadas');

// Invariante 3: Rechazo fail-closed ante riesgo excesivo (> 5 objeciones sin mitigar)
const excessiveRiskProposal = {
  decisionTitle: 'Eliminar todas las suites de prueba para compilar más rápido',
  thesis: 'Borrar la suite para acelerar la entrega.',
  antithesisObjections: ['Riesgo 1', 'Riesgo 2', 'Riesgo 3', 'Riesgo 4', 'Riesgo 5', 'Riesgo 6']
};
const rejected = debater.synthesizeDecision(excessiveRiskProposal);
assert.strictEqual(rejected.verdict, 'REJECT_THESIS_FAIL_CLOSED');
console.log('✓ Invariante 3: Veredicto fail-closed inmediato ante objeciones críticas demostrado');

// Invariante 4: Integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const driveDecision = driveEngine.deliberateDialecticDecision(proposal);
assert.strictEqual(driveDecision.verdict, 'PROCEED_WITH_SYNTHESIS');
assert.strictEqual(driveDecision.contractType, 'DialecticSynthesisContract_v1');
console.log('✓ Invariante 4: Integración nativa con DriveEngine.deliberateDialecticDecision() verificada');

console.log('\nPASS AX-F-198 — Invariantes del árbitro dialéctico demostrados al 100%.');
