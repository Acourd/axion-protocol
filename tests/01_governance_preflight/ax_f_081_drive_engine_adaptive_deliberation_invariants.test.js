'use strict';

const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-081 Invariantes del Meta-Orquestador Drive y Fusión Adaptativa Deep-Loop ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const engine = new DriveEngine(ROOT);

// 1. Clasificación adaptativa de complejidad (Fast-Loop vs Deep-Loop)
const cTrivial = engine.classifyContext({ filesCount: 1, isStructural: false });
assert.strictEqual(cTrivial.mode, 'FAST_LOOP');
assert.strictEqual(cTrivial.requiresDeliberation, false);

const cModerate = engine.classifyContext({ filesCount: 2, isStructural: false });
assert.strictEqual(cModerate.mode, 'FAST_LOOP');
assert.strictEqual(cModerate.requiresDeliberation, false);

const cStructural = engine.classifyContext({ filesCount: 1, isStructural: true });
assert.strictEqual(cStructural.mode, 'DEEP_LOOP');
assert.strictEqual(cStructural.requiresDeliberation, true);

const cMultiFile = engine.classifyContext({ filesCount: 4, isStructural: false });
assert.strictEqual(cMultiFile.mode, 'DEEP_LOOP');
assert.strictEqual(cMultiFile.requiresDeliberation, true);

const cSecurity = engine.classifyContext({ filesCount: 1, hasSecurityRisk: true });
assert.strictEqual(cSecurity.mode, 'DEEP_LOOP');
assert.strictEqual(cSecurity.requiresDeliberation, true);
console.log('✓ Clasificación adaptativa de complejidad (Fast-Loop vs Deep-Loop) verificada');

// 2. Ejecución de ciclo con deliberación profunda válida
const validDeliberationPayload = {
  task_description: "Refactorización arquitectural de gobernanza",
  blast_radius: {
    target_files: ["tools/drive_engine.js"],
    dependencies_affected: ["bin/axion.js"]
  },
  adversarial_failure_modes: [
    "Error en bifurcación de ruta rápida vs profunda ante cambios multi-archivo.",
    "Omisión de verificación determinista al saltar del bucle de ejecución.",
    "Fallo en propagación de códigos de salida del proceso secundario de pruebas."
  ],
  invariants_checked: {
    p0_governance_respected: true,
    user_profile_alignment: "SENIOR_TECHNICAL",
    zero_bloat_enforced: true
  },
  "verification_proof": "node tests/run_all.js"
};

const resDeep = engine.runCycle({
  isStructural: true,
  deliberationPayload: validDeliberationPayload,
  skipVerification: true
});

assert.strictEqual(resDeep.pass, true);
assert.strictEqual(resDeep.mode, 'DEEP_LOOP');
assert.strictEqual(typeof resDeep.deliberation, 'string');
console.log('✓ Ciclo Deep-Loop con auto-deliberación verificado');

// 3. Ejecución de ciclo Fast-Loop directo
const resFast = engine.runCycle({ filesCount: 1, isStructural: false, skipVerification: true });
assert.strictEqual(resFast.pass, true);
assert.strictEqual(resFast.mode, 'FAST_LOOP');
assert.strictEqual(resFast.deliberation, null);
console.log('✓ Ciclo Fast-Loop directo verificado');

// 4. Invocación CLI unificada: axion --help incluye drive
const rCli = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'axion.js'), '--help'], {
  encoding: 'utf8',
  windowsHide: true
});

assert.strictEqual(rCli.status, 0, 'CLI axion --help debe finalizar con código 0');
assert.strictEqual(rCli.stdout.includes('drive'), true);
assert.strictEqual(rCli.stdout.includes('meta-orquestador'), true);
console.log('✓ Registro del comando drive en el despachador CLI unificado verificado');

console.log('\nPASS AX-F-081 — Invariantes del motor Drive demostrados al 100%.\n');
