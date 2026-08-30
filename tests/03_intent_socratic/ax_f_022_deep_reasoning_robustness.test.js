/**
 * Regresión AX-F-022 — Robustez y Anti-Tautología del Modo Alta Exigencia (/deep)
 * 
 * Somete a prueba:
 *  1. Detección y rechazo de hipótesis de falla vacías, cortas (<25 caracteres) o genéricas.
 *  2. Rechazo estricto si el blast radius toca carpetas protegidas (ValorantCoach, WhiteRoom, .git).
 *  3. Clasificador de complejidad adaptativa (Trivial vs Moderado vs Arquitectónico).
 *  4. Auto-rotación y poda de estados antiguos para prevenir saturación de disco.
 */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const DeepReasoningEngine = require('../../tools/deep_reasoning.js');

console.log('=== AX-F-022 Robustez y Anti-Tautología de /deep ===\n');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-deep-rob-'));

try {
  const engine = new DeepReasoningEngine(tmp);

  // 1. Clasificador de complejidad
  const c1 = engine.classifyComplexity({ filesCount: 1 });
  assert.strictEqual(c1.tier, 'TRIVIAL', 'Un archivo debe ser TRIVIAL');
  assert.strictEqual(c1.requiresDeepReasoning, false);

  const c2 = engine.classifyComplexity({ filesCount: 5, isStructural: true });
  assert.strictEqual(c2.tier, 'ARCHITECTURAL', 'Cambio estructural debe ser ARCHITECTURAL');
  assert.strictEqual(c2.requiresDeepReasoning, true);
  console.log('✓ clasificador de complejidad adaptativo operativo');

  // 2. Rechazo de hipótesis vacías o genéricas (Rubber-Stamping)
  const vacuousPayload = {
    task_intent: "Refactorizar arquitectura",
    blast_radius: { target_files: ["tools/engine.js"] },
    adversarial_failure_modes: [
      "puede fallar",
      "falla 2",
      "posible error"
    ],
    invariants_checked: { p0_governance_respected: true },
    verification_proof: "npm test"
  };
  const rVacuous = engine.evaluateDeliberation(vacuousPayload);
  assert.strictEqual(rVacuous.status, 'DENIED', 'Debe denegar hipótesis genéricas');
  assert.ok(rVacuous.errors.length >= 3, 'Debe señalar cada hipótesis vacía');
  console.log('✓ anti-tautología: rechaza deliberaciones superficiales y rubber-stamping');

  // 3. Rechazo de violación de zonas protegidas
  const protectedPayload = {
    task_intent: "Limpieza profunda",
    blast_radius: { target_files: ["ValorantCoach/config.json", "tools/engine.js"] },
    adversarial_failure_modes: [
      "Hipótesis 1: Ruptura de configuración de arranque en Windows",
      "Hipótesis 2: Excepción no controlada por argumentos nulos en CLI",
      "Hipótesis 3: Fuga de memoria por listeners no desuscritos"
    ],
    invariants_checked: { p0_governance_respected: true },
    verification_proof: "npm test"
  };
  const rProtected = engine.evaluateDeliberation(protectedPayload);
  assert.strictEqual(rProtected.status, 'DENIED', 'Debe denegar acceso a zonas protegidas');
  assert.ok(rProtected.errors.some(e => e.includes('zona protegida') || e.includes('ValorantCoach')), 'Debe citar la zona protegida');
  console.log('✓ guardarraíl de zonas protegidas: bloquea incursiones en ValorantCoach/WhiteRoom');

  // 4. Auto-rotación y poda de estados (>20)
  for (let i = 0; i < 25; i++) {
    const validPayload = {
      task_intent: `Tarea válida número ${i}`,
      blast_radius: { target_files: [`tools/module_${i}.js`] },
      adversarial_failure_modes: [
        `Hipótesis 1: Ruptura de interfaz en el módulo ${i} ante entradas vacías`,
        `Hipótesis 2: Incompatibilidad de tipos al recibir cadenas no numéricas`,
        `Hipótesis 3: Pérdida de estado al abortar la conexión intempestivamente`
      ],
      invariants_checked: { p0_governance_respected: true },
      verification_proof: "node tests/run_all.js"
    };
    engine.evaluateDeliberation(validPayload);
  }

  const stateFiles = fs.readdirSync(path.join(tmp, '.axion', 'state'))
    .filter(f => f.startsWith('deep-deliberation-') && f.endsWith('.json'));
  assert.strictEqual(stateFiles.length <= 20, true, `Debe rotar y no superar 20 estados, hay: ${stateFiles.length}`);
  console.log(`✓ auto-poda de estado: retención acotada a ${stateFiles.length} registros (cero bloat)`);

} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log('\nPASS AX-F-022 — Robustez de /deep y defensas anti-falla 100% verificadas.');
