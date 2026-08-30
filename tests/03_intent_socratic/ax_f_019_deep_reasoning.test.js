/**
 * Regresión AX-F-019 — Modo Alta Exigencia y Pensamiento Profundo (Deep Reasoning Gate)
 * 
 * Verifica que el motor de deliberación obligatoria en 4 pasos bloquea payloads
 * incompletos o apresurados y aprueba deliberaciones completas y deterministas.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const correr = (args) => spawnSync(process.execPath, [path.join(ROOT, 'tools', 'deep_reasoning.js'), ...args], {
  cwd: ROOT, encoding: 'utf8', windowsHide: true, timeout: 15000,
});

console.log('=== AX-F-019 Modo Alta Exigencia (Deep Reasoning) ===\n');

// 1. Template
{
  const r = correr(['template']);
  assert.strictEqual(r.status, 0, 'deep_reasoning template debe salir con 0');
  assert.ok(r.stdout.includes('blast_radius'), 'template debe incluir blast_radius');
  assert.ok(r.stdout.includes('adversarial_failure_modes'), 'template debe incluir adversarial_failure_modes');
  console.log('✓ template estructurado disponible para agentes');
}

// 2. Bloqueo de deliberaciones incompletas
{
  // Sin modos de falla
  const incompleto1 = {
    task_intent: "Hacer algo rápido",
    blast_radius: { target_files: ["app.js"] },
    invariants_checked: { p0_governance_respected: true },
    verification_proof: "npm test"
  };
  const r1 = correr(['evaluate', JSON.stringify(incompleto1)]);
  assert.strictEqual(r1.status, 1, 'Deliberación sin 3 hipótesis de falla debe fallar');
  assert.ok(r1.stdout.includes('adversarial_failure_modes'), 'Debe requerir 3 modos de falla');

  // Con solo 1 modo de falla (menos de 3)
  const incompleto2 = {
    task_intent: "Hacer algo rápido",
    blast_radius: { target_files: ["app.js"] },
    adversarial_failure_modes: ["Falla 1"],
    invariants_checked: { p0_governance_respected: true },
    verification_proof: "npm test"
  };
  const r2 = correr(['evaluate', JSON.stringify(incompleto2)]);
  assert.strictEqual(r2.status, 1, 'Menos de 3 modos de falla debe fallar');
  console.log('✓ frena la prisa: rechaza deliberaciones superficiales');
}

// 3. Aprobación de deliberación completa de alta exigencia
{
  const completo = {
    task_intent: "Implementar nuevo módulo de seguridad",
    blast_radius: {
      target_files: ["tools/fuzzer.js", "tests/fuzzing.test.js"],
      dependent_components: ["preflight.js", "health_check.js"]
    },
    adversarial_failure_modes: [
      "Hipótesis 1: Ataques con caracteres unicode invisibles o caracteres nulos",
      "Hipótesis 2: Subshells anidados $(...) con escapes de comillas dobles",
      "Hipótesis 3: Variables de entorno dinámicas no sanitizadas ($IFS, $PATH)"
    ],
    invariants_checked: {
      p0_governance_respected: true,
      user_profile_aligned: true,
      zero_bloat_enforced: true
    },
    verification_proof: "node tests/run_all.js"
  };

  const r = correr(['evaluate', JSON.stringify(completo)]);
  assert.strictEqual(r.status, 0, `Deliberación completa debe salir 0, salió ${r.status}`);
  const data = JSON.parse(r.stdout);
  assert.strictEqual(data.status, 'APPROVED', 'Debe estar aprobado');
  assert.ok(Boolean(data.deliberation_id), 'Debe emitir un deliberation_id');
  assert.ok(Boolean(data.digest), 'Debe emitir un digest SHA-256');
  console.log('✓ deliberación profunda en 4 pasos aprobada y sellada con SHA-256');
}

console.log('\nPASS AX-F-019 — Modo Alta Exigencia (Deep Reasoning) 100% verificado.');
