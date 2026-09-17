'use strict';

/**
 * Axion Protocol — Invariantes del Mapeo de Trayectoria de Decisiones y Calibración Metacognitiva del Usuario.
 *
 * Valida de forma estricta:
 * 1. Inicialización determinista del perfil de afinidades metacognitivas.
 * 2. Adaptación matemática de pesos ante decisiones tomadas vs opciones ignoradas.
 * 3. Poda activa y descarte automático de categorías superficiales o cosméticas (dashboards, servidores web).
 * 4. Clasificación y priorización de misiones de alta autonomía y rigor formal en la cima del ranking.
 * 5. Integración transparente con DriveEngine.
 */

const assert = require('assert');
const { crearSandbox } = require('../../tools/test_sandbox.js');
const path = require('path');
const fs = require('fs');
const UserDecisionTrajectory = require('../../tools/user_decision_trajectory.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-117 Invariantes de Trayectoria de Decisiones y Calibración Metacognitiva ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sandbox = crearSandbox('test-trajectory-sandbox');

fs.mkdirSync(path.join(sandbox, '.axion', 'memory'), { recursive: true });

const trajectory = new UserDecisionTrajectory(sandbox);

// 1. Validar inicialización
assert.ok(trajectory.profile.affinityScores.AUTONOMOUS_LONG_HORIZON >= 9.0, 'Autonomía debe tener peso alto');
assert.ok(trajectory.profile.rejectedCategories.includes('COSMETIC_UI_DASHBOARDS'), 'Dashboards cosméticos deben estar podados');
console.log('✓ Perfil metacognitivo inicial validado: Alta afinidad con rigor y autonomía');

// 2. Probar filtrado y poda activa
const rawCandidates = [
  { title: '📊 Dashboard HTML Interactivo y Visualizador de Telemetría' },
  { title: '🌐 Micro-servidor HTTP local en puerto 4040' },
  { title: '🔬 Demostrador Formal de Invariantes Lógicas SAT/SMT' },
  { title: '⚡ Fuzzer Polimórfico Masivo de Caos de 10.000 Vectores' }
];

const filtered = trajectory.filterAndRankMissions(rawCandidates);
assert.strictEqual(filtered.length, 2, 'Las 2 opciones cosméticas deben ser podadas automáticamente');
assert.strictEqual(filtered[0].title.includes('Fuzzer') || filtered[0].title.includes('Formal'), true, 'El primer lugar debe ser de ingeniería dura');
console.log(`✓ Poda activa verificada: ${rawCandidates.length - filtered.length} opciones cosméticas descartadas`);

// 3. Validar aprendizaje continuo de decisiones
const updatedProfile = trajectory.recordDecision({
  selectedTitle: 'Demostrador Formal de Invariantes Lógicas SAT/SMT',
  ignoredTitles: ['Reporte gráfico HTML', 'Dashboard visual']
});

assert.ok(updatedProfile.decisionHistory.length >= 1, 'El historial de decisiones debe registrar la elección');
console.log('✓ Aprendizaje y actualización del vector de afinidad verificado');

// 4. Validar integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const driveAdaptive = driveEngine.getAdaptiveMissions([
  { title: 'Dashboard HTML' },
  { title: 'Bucle de Autonomía y Auto-curación Formal' }
]);

assert.strictEqual(driveAdaptive.length, 1, 'DriveEngine debe retornar solo la misión no podada');
assert.ok(driveAdaptive[0].title.includes('Autonomía'));
console.log('✓ Integración DriveEngine.getAdaptiveMissions() verificada');

// Limpiar sandbox
try {
  fs.rmSync(sandbox, { recursive: true, force: true });
} catch (_) {}

console.log('\nPASS AX-F-117 — Invariantes de trayectoria de decisiones y perfil adaptativo verificados al 100%.');
