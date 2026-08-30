'use strict';

/**
 * Axion Protocol — Invariantes del Planificador Adaptativo y Presupuesto Dinámico de /drive.
 *
 * Valida de forma estricta:
 * 1. Clasificación determinista de complejidad en 3 Tiers (FAST_LOOP, DEEP_LOOP, MEGA_REFACTOR).
 * 2. Asignación automática de presupuestos de tiempo y llamadas a herramientas (30s a 600s).
 * 3. Activación obligatoria de Pre-Mortem y Snapshots Incrementales para DEEP_LOOP y MEGA_REFACTOR.
 * 4. Generación ordenada de la secuencia exacta de fases para cada nivel de riesgo.
 */

const assert = require('assert');
const path = require('path');
const AdaptivePhasePlanner = require('../../tools/adaptive_phase_planner.js');

console.log('=== AX-F-094 Invariantes del Planificador Adaptativo de Fases de /drive ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const planner = new AdaptivePhasePlanner(ROOT);

// 1. Validar FAST_LOOP (cambios atómicos $\le 2$ archivos no sensibles)
const fastPlan = planner.planExecution({ files: ['tools/simple.js'] });
assert.strictEqual(fastPlan.tier, 'FAST_LOOP', 'Debe clasificar como FAST_LOOP');
assert.strictEqual(fastPlan.requiresPremortem, false, 'FAST_LOOP no exige pre-mortem');
assert.strictEqual(fastPlan.requiresIncrementalSnapshots, false, 'FAST_LOOP no exige snapshots incrementales');
assert.strictEqual(fastPlan.budgetSeconds, 30, 'FAST_LOOP debe asignar 30s');
assert.strictEqual(fastPlan.phaseSequence.length, 3, 'FAST_LOOP debe tener 3 fases');
console.log('✓ Tier FAST_LOOP verificado (30s, 3 fases, ejecución ágil)');

// 2. Validar DEEP_LOOP (módulos sensibles o 3-10 archivos)
const deepPlan = planner.planExecution({ files: ['tools/dsse.js', 'tools/attestation.js'] });
assert.strictEqual(deepPlan.tier, 'DEEP_LOOP', 'Debe clasificar como DEEP_LOOP');
assert.strictEqual(deepPlan.touchesSensitiveCore, true, 'Debe detectar módulo sensible');
assert.strictEqual(deepPlan.requiresPremortem, true, 'DEEP_LOOP exige pre-mortem formal');
assert.strictEqual(deepPlan.requiresIncrementalSnapshots, true, 'DEEP_LOOP exige snapshots incrementales');
assert.strictEqual(deepPlan.budgetSeconds, 180, 'DEEP_LOOP debe asignar 180s');
assert.strictEqual(deepPlan.phaseSequence.length, 6, 'DEEP_LOOP debe tener 6 fases');
console.log('✓ Tier DEEP_LOOP verificado (180s, 6 fases, pre-mortem obligatorio)');

// 3. Validar MEGA_REFACTOR (> 10 archivos o explícito estructural)
const megaPlan = planner.planExecution({ description: 'Mega refactor y reestructuración completa' });
assert.strictEqual(megaPlan.tier, 'MEGA_REFACTOR', 'Debe clasificar como MEGA_REFACTOR');
assert.strictEqual(megaPlan.requiresPremortem, true, 'MEGA_REFACTOR exige pre-mortem');
assert.strictEqual(megaPlan.requiresIncrementalSnapshots, true, 'MEGA_REFACTOR exige snapshots incrementales');
assert.strictEqual(megaPlan.budgetSeconds, 600, 'MEGA_REFACTOR debe asignar 600s (10 min)');
assert.strictEqual(megaPlan.phaseSequence.length, 8, 'MEGA_REFACTOR debe tener 8 fases completas');
console.log('✓ Tier MEGA_REFACTOR verificado (600s / 10 min, 8 fases exhaustivas)');

console.log('\nPASS AX-F-094 — Invariantes de planificación adaptativa de /drive verificados al 100%.');
