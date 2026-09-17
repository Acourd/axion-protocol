'use strict';

const assert = require('assert');
const { crearSandboxTemporal } = require('../../tools/test_sandbox.js');
const fs = require('fs');
const os = require('os');
const path = require('path');
const DeepReasoningEngine = require('../../tools/deep_reasoning.js');

console.log('=== AX-F-044 Motor de Razonamiento Profundo, Invariantes y Detección de Vacuidad ===\n');

const sandbox = crearSandboxTemporal('ax_f_044_sandbox');
fs.mkdirSync(path.join(sandbox, '.axion', 'state'), { recursive: true });
const engine = new DeepReasoningEngine(sandbox);

// 1. Clasificación de complejidad
const cTrivial = engine.classifyComplexity({ filesCount: 1, isStructural: false });
assert.strictEqual(cTrivial.tier, 'TRIVIAL');
assert.strictEqual(cTrivial.requiresDeepReasoning, false);

const cModerate = engine.classifyComplexity({ filesCount: 2, isStructural: false });
assert.strictEqual(cModerate.tier, 'MODERATE');
assert.strictEqual(cModerate.requiresDeepReasoning, false);

const cArchitectural = engine.classifyComplexity({ filesCount: 3, isStructural: false });
assert.strictEqual(cArchitectural.tier, 'ARCHITECTURAL');
assert.strictEqual(cArchitectural.requiresDeepReasoning, true);

const cStructural = engine.classifyComplexity({ filesCount: 1, isStructural: true });
assert.strictEqual(cStructural.tier, 'ARCHITECTURAL');
assert.strictEqual(cStructural.requiresDeepReasoning, true);
console.log('✓ Clasificación determinista de complejidad por umbrales verificada');

// 2. Rechazo de violaciones de zonas protegidas
const rZona = engine.evaluateDeliberation({
  blast_radius: { target_files: ['src/index.js', 'node_modules/vuln/index.js'] },
  adversarial_failure_modes: [
    'Falla 1: Escenario detallado con datos nulos o corruptos en entrada',
    'Falla 2: Escenario detallado con desconexión o fallo de red en runtime',
    'Falla 3: Escenario detallado con colisión de concurrencia y permisos'
  ],
  invariants_checked: { p0_governance_respected: true },
  verification_proof: 'node tests/run_all.js'
});
assert.strictEqual(rZona.status, 'DENIED');
assert.strictEqual(rZona.errors.some(e => e.includes('Violación de zona protegida')), true);
console.log('✓ Intercepción de violaciones a zonas protegidas verificada');

// 3. Detección de vacuidad en modos de falla adversariales
const rVacua = engine.evaluateDeliberation({
  blast_radius: { target_files: ['src/app.js'] },
  adversarial_failure_modes: [
    'puede fallar', // Frase genérica prohibida
    'falla corta', // <25 caracteres
    'falla corta'  // Duplicada
  ],
  invariants_checked: { p0_governance_respected: true },
  verification_proof: 'node tests/run_all.js'
});
assert.strictEqual(rVacua.status, 'DENIED');
assert.strictEqual(rVacua.errors.some(e => e.includes('frase genérica')), true);
assert.strictEqual(rVacua.errors.some(e => e.includes('demasiado corta')), true);
assert.strictEqual(rVacua.errors.some(e => e.includes('duplicada')), true);
console.log('✓ Detección y rechazo de hipótesis adversariales vacuas o genéricas verificada');

// 4. Aprobación y sellado SHA-256 de deliberación rigurosa
const payloadValido = {
  blast_radius: {
    target_files: ['src/auth/token.js'],
    dependent_components: ['src/api/router.js', 'tests/auth.test.js']
  },
  adversarial_failure_modes: [
    'Hipótesis 1: El token expira exactamente durante la transición de firma criptográfica',
    'Hipótesis 2: Se provee una clave pública no canónica con caracteres no hexadecimales',
    'Hipótesis 3: La memoria compartida satura el buffer de firma bajo concurrencia alta'
  ],
  invariants_checked: {
    p0_governance_respected: true,
    user_profile_aligned: true,
    zero_bloat_enforced: true
  },
  verification_proof: 'node tests/run_all.js'
};

const rAprobada = engine.evaluateDeliberation(payloadValido);
assert.strictEqual(rAprobada.status, 'APPROVED');
assert.strictEqual(typeof rAprobada.deliberation_id, 'string');
assert.strictEqual(typeof rAprobada.digest, 'string');
assert.strictEqual(rAprobada.digest.length, 64);
assert.strictEqual(fs.existsSync(rAprobada.record_path), true);

// Limpieza de registro y sandbox generado
try { fs.rmSync(sandbox, { recursive: true, force: true }); } catch (_) {}
console.log('✓ Sellado SHA-256 y persistencia de deliberación aprobada verificados');

console.log('\nPASS AX-F-044 — Motor de razonamiento profundo e invariantes verificados al 100%.\n');
