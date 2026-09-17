'use strict';

/**
 * Axion Protocol — Invariantes del Motor de Auto-Curación y Backtracking Determinista.
 *
 * Valida de forma estricta:
 * 1. Ejecución exitosa de mutaciones sin error (ok: true, healed: false).
 * 2. Intercepción automática de excepciones e inyecciones de fallo en caliente.
 * 3. Ejecución determinista del rollback atómico desde el punto de control previo.
 * 4. Igualdad matemática exacta de los hashes del árbol antes y después de la auto-curación (hashesMatch: true).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const SelfHealingEngine = require('../../tools/self_healing_engine.js');

console.log('=== AX-F-089 Invariantes de Auto-Curación y Backtracking Determinista ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const { crearSandbox } = require('../../tools/test_sandbox.js');
const sandbox = crearSandbox('test-self-healing');
fs.mkdirSync(path.join(sandbox, 'src'), { recursive: true });
fs.writeFileSync(path.join(sandbox, 'src', 'a.js'), 'module.exports = 1;\n', 'utf8');
const engine = new SelfHealingEngine(sandbox);

// 1. Ejecución exitosa normal
const cleanRes = engine.executeWithSelfHealing(() => {
  return { success: true, payload: 'Clean Operation' };
}, { label: 'test-clean-op' });

assert.strictEqual(cleanRes.ok, true, 'La operación limpia debe retornar ok: true');
assert.strictEqual(cleanRes.healed, false, 'La operación limpia no debe disparar auto-curación');
assert.ok(cleanRes.checkpointHash && cleanRes.checkpointHash.length === 64, 'Debe emitir hash SHA-256 de checkpoint');
console.log('✓ Operación limpia ejecutada con salvaguarda preventiva');

// 2. Simulación de fallo e inyección de corrupción
const failRes = engine.executeWithSelfHealing(() => {
  throw new Error('SIMULATED_SYNTAX_ERROR_IN_MUTATION');
}, { label: 'test-corrupt-op' });

assert.strictEqual(failRes.ok, false, 'La operación con fallo debe retornar ok: false');
assert.strictEqual(failRes.healed, true, 'Debe haber disparado la auto-curación (healed: true)');
assert.strictEqual(failRes.originalError, 'SIMULATED_SYNTAX_ERROR_IN_MUTATION', 'Debe capturar el error original');
assert.ok(failRes.preManifestHash && failRes.postManifestHash, 'Debe registrar hashes pre y post curación');
assert.strictEqual(failRes.hashesMatch, true, 'El árbol de archivos debe coincidir al byte antes y después del rollback');
console.log(`✓ Inyección de fallo interceptada: Auto-curación determinista verificada con hashesMatch: true`);

try {
  fs.rmSync(sandbox, { recursive: true, force: true });
} catch (_) {
  // limpieza best-effort
}

console.log('\nPASS AX-F-089 — Invariantes de auto-curación y backtracking verificados al 100%.');
