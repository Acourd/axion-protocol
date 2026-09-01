#!/usr/bin/env node
'use strict';

/**
 * AX-F-171: Invariantes de Predicción de Agotamiento de Tokens y Entropía Léxica
 *
 * Verifica:
 * 1. Proyección determinista de turnos restantes antes de zona crítica (predictTokenGrowth).
 * 2. Detección de picos acelerados de consumo (CRITICAL_SPIKE / ACCELERATING).
 * 3. Cálculo de entropía léxica de Shannon proxy (calculateEntropyScore).
 * 4. Recomendaciones proactivas fail-safe (COMPACT_NOW / PREPARE_COMPACTION / CONTINUE).
 */

const assert = require('assert');
const path = require('path');
const ContextBudgetGuard = require('../../tools/context_budget_guard.js');

console.log('=== AX-F-171: Invariantes de Predicción de Tokens y Entropía ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const guard = new ContextBudgetGuard(ROOT, 200000);

// Invariante 1: Proyección de crecimiento estable
const steadyHistory = [
  { tokens: 10000 },
  { tokens: 13000 },
  { tokens: 16000 },
  { tokens: 19000 }
];
const steadyPred = guard.predictTokenGrowth(steadyHistory);
assert.strictEqual(steadyPred.currentTokens, 19000);
assert.strictEqual(steadyPred.averageGrowthPerTurn, 3000);
assert.strictEqual(steadyPred.growthRate, 'STABLE');
assert.strictEqual(steadyPred.recommendation, 'CONTINUE');
assert.ok(steadyPred.turnsUntilPressure > 30, 'Debe haber más de 30 turnos con crecimiento bajo');
console.log('  ✓ Invariante 1: Proyección de trayectoria estable verificada.');

// Invariante 2: Detección de pico acelerado y proximidad a zona crítica
const spikeHistory = [
  { tokens: 120000 },
  { tokens: 135000 },
  { tokens: 155000 },
  { tokens: 168000 } // Supera el umbral de 84%
];
const spikePred = guard.predictTokenGrowth(spikeHistory);
assert.strictEqual(spikePred.currentTokens, 168000);
assert.strictEqual(spikePred.growthRate, 'CRITICAL_SPIKE');
assert.strictEqual(spikePred.recommendation, 'COMPACT_NOW');
assert.ok(spikePred.turnsUntilCritical <= 2, 'Debe alertar proximidad inmediata a zona crítica');
console.log('  ✓ Invariante 2: Detección de pico acelerado (CRITICAL_SPIKE) verificada.');

// Invariante 3: Cálculo de entropía léxica
const repetitiveText = 'error error error error error error error error';
const richText = 'deterministic state machine cryptographic attestation immutable ledger sha256 fail closed';

const repEntropy = guard.calculateEntropyScore(repetitiveText);
const richEntropy = guard.calculateEntropyScore(richText);

assert.ok(repEntropy < 1.0, `Texto repetitivo debe tener baja entropía (< 1.0), obtenida: ${repEntropy}`);
assert.ok(richEntropy > 2.5, `Texto técnico diverso debe tener alta entropía (> 2.5), obtenida: ${richEntropy}`);
console.log(`  ✓ Invariante 3: Entropía léxica validada (${repEntropy} vs ${richEntropy}).`);

// Invariante 4: Resiliencia ante entradas vacías
const emptyPred = guard.predictTokenGrowth([]);
assert.strictEqual(emptyPred.currentTokens, 0);
assert.strictEqual(emptyPred.recommendation, 'CONTINUE');
assert.strictEqual(guard.calculateEntropyScore(''), 0);
console.log('  ✓ Invariante 4: Resiliencia ante entradas vacías validada.');

console.log('\nPASS: AX-F-171 — Predicción de Tokens y Entropía verificadas con 4/4 invariantes en verde.');
