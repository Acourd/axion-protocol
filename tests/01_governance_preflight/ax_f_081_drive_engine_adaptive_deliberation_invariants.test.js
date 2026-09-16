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

// 2. Ejecución de ciclo con deliberación profunda
// 2.1 Vector a (RED): DEEP_LOOP sin deliberación debe ser rechazado fail-closed
const resDeepMissing = engine.runCycle({
  isStructural: true
});
assert.strictEqual(resDeepMissing.pass, false, 'DEEP_LOOP sin deliberación no puede pasar');
assert.strictEqual(resDeepMissing.reason, 'BLOCKED_DELIBERATION_REQUIRED');
assert.strictEqual(resDeepMissing.status, 'BLOCKED_DELIBERATION_REQUIRED');
console.log('✓ Vector a: Rechazo fail-closed de DEEP_LOOP sin deliberación (BLOCKED_DELIBERATION_REQUIRED)');

// 2.2 Deliberación profunda válida con skipVerification (Vector b: sin verificación no hay éxito)
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

// Vector b: skipVerification devuelve estado no certificable (UNVERIFIED), nunca pass: true
assert.strictEqual(resDeep.pass, false, 'skipVerification no debe permitir éxito');
assert.strictEqual(resDeep.status, 'UNVERIFIED', 'Estado debe ser UNVERIFIED');
assert.strictEqual(resDeep.reason, 'VERIFICATION_SKIPPED');
assert.strictEqual(resDeep.mode, 'DEEP_LOOP');
assert.strictEqual(typeof resDeep.deliberation, 'string');
assert.strictEqual(resDeep.verification.certified, false, 'No certificable');
console.log('✓ Vector b: Ciclo Deep-Loop con skipVerification emite UNVERIFIED no certificable');

// 3. Ejecución de ciclo Fast-Loop directo con skipVerification
const resFast = engine.runCycle({ filesCount: 1, isStructural: false, skipVerification: true });
assert.strictEqual(resFast.pass, false, 'Fast-Loop con skipVerification no debe tener pass: true');
assert.strictEqual(resFast.status, 'UNVERIFIED');
assert.strictEqual(resFast.mode, 'FAST_LOOP');
assert.strictEqual(resFast.deliberation, null);
console.log('✓ Fast-Loop con skipVerification emite UNVERIFIED');

// 4. Vector f: Restricción cooperativa en flujo mediado: mutación exige declaración de autorización del llamador
const resUnauthorizedMutate = engine.runCycle({
  filesCount: 1,
  mutate: true
});
assert.strictEqual(resUnauthorizedMutate.pass, false);
assert.strictEqual(resUnauthorizedMutate.status, 'CALLER_AUTHORIZATION_REQUIRED');
assert.strictEqual(resUnauthorizedMutate.reason, 'MUTATION_REQUIRES_DECLARED_AUTHORIZATION');
assert.strictEqual(resUnauthorizedMutate.restrictionType, 'COOPERATIVE_MEDIATED_FLOW');
assert.strictEqual(resUnauthorizedMutate.message.includes('Restricción cooperativa de Drive'), true);
console.log('✓ Vector f.1: Mutación sin declaración de autorización bloqueada cooperativamente (CALLER_AUTHORIZATION_REQUIRED)');

// Vector f.2: Señal callerDeclaredAuthorization procesada en flujo mediado sin afirmar verificación externa
const resAuthorizedMutate = engine.runCycle({
  filesCount: 1,
  mutate: true,
  callerDeclaredAuthorization: true,
  skipVerification: true
});
assert.strictEqual(resAuthorizedMutate.status, 'UNVERIFIED', 'No debe bloquear por autorización cuando fue declarada');
console.log('✓ Vector f.2: Señal callerDeclaredAuthorization procesada cooperativamente sin reclamo de verificación externa');

// Vector f.3: Acción Git sin autorización declarada separada
const resUnauthorizedGit = engine.runCycle({
  filesCount: 1,
  gitAction: 'push'
});
assert.strictEqual(resUnauthorizedGit.pass, false);
assert.strictEqual(resUnauthorizedGit.status, 'CALLER_AUTHORIZATION_REQUIRED');
assert.strictEqual(resUnauthorizedGit.reason, 'GIT_ACTION_REQUIRES_DECLARED_AUTHORIZATION');
assert.strictEqual(resUnauthorizedGit.restrictionType, 'COOPERATIVE_MEDIATED_FLOW');
console.log('✓ Vector f.3: Operación git de riesgo sin autorización declarada separada bloqueada');

// Vector f.4: Short-circuit de Fast-Loop con mutación sin declaración
const scUnauthorized = engine.executeFastLoopShortCircuit('Mutación puntual', ['tools/foo.js'], { mutate: true });
assert.strictEqual(scUnauthorized.pass, false);
assert.strictEqual(scUnauthorized.status, 'CALLER_AUTHORIZATION_REQUIRED');
assert.strictEqual(scUnauthorized.reason, 'MUTATION_REQUIRES_DECLARED_AUTHORIZATION');
assert.strictEqual(scUnauthorized.restrictionType, 'COOPERATIVE_MEDIATED_FLOW');
console.log('✓ Vector f.4: Short circuit bloqueado ante falta de callerDeclaredAuthorization');

// Vector f.5: humanAuthorized rechazado (no desbloquea mutaciones)
const resHumanAuthRejected = engine.runCycle({
  filesCount: 1,
  mutate: true,
  humanAuthorized: true
});
assert.strictEqual(resHumanAuthRejected.pass, false);
assert.strictEqual(resHumanAuthRejected.status, 'CALLER_AUTHORIZATION_REQUIRED');
assert.strictEqual(resHumanAuthRejected.reason, 'MUTATION_REQUIRES_DECLARED_AUTHORIZATION');
console.log('✓ Vector f.5: humanAuthorized rechazado (no desbloquea mutaciones)');

// Vector f.6: gitAuthorized rechazado (no desbloquea acciones Git)
const resGitAuthRejected = engine.runCycle({
  filesCount: 1,
  gitAction: 'push',
  gitAuthorized: true
});
assert.strictEqual(resGitAuthRejected.pass, false);
assert.strictEqual(resGitAuthRejected.status, 'CALLER_AUTHORIZATION_REQUIRED');
assert.strictEqual(resGitAuthRejected.reason, 'GIT_ACTION_REQUIRES_DECLARED_AUTHORIZATION');
console.log('✓ Vector f.6: gitAuthorized rechazado (no desbloquea acciones Git)');

// Vector f.7: Únicamente señales canónicas callerDeclared* desbloquean el flujo mediado
const resCanonicalGit = engine.runCycle({
  filesCount: 1,
  gitAction: 'push',
  callerDeclaredGitAuthorization: true,
  skipVerification: true
});
assert.strictEqual(resCanonicalGit.status, 'UNVERIFIED', 'callerDeclaredGitAuthorization desbloquea compuerta git hacia verificación');

const backtrackedHumanAuth = engine.runWithBacktracking(() => ({ pass: true }), {
  mutate: true,
  humanAuthorized: true
});
assert.strictEqual(backtrackedHumanAuth.success, false);
assert.strictEqual(backtrackedHumanAuth.status, 'CALLER_AUTHORIZATION_REQUIRED');
console.log('✓ Vector f.7: Únicamente señales canónicas callerDeclared* desbloquean el flujo mediado');

// 5. Vector e: Preflight estructurado vs rechazo de comandos crudos
const { runPreflight } = require('../../tools/preflight.js');
const rawPreflight = runPreflight('cat /etc/passwd');
assert.notStrictEqual(rawPreflight.decision, 'ALLOW', 'Cadenas crudas de shell nunca obtienen ALLOW');
assert.ok(rawPreflight.decision === 'NEEDS_HUMAN_REVIEW' || rawPreflight.decision === 'DENY');

const structuredAllow = runPreflight({
  executable: 'git',
  args: ['status'],
  cwd: '.',
  shell: false
});
assert.strictEqual(structuredAllow.decision, 'ALLOW', 'Comando estructurado en allowlist obtiene ALLOW');
console.log('✓ Vector e: Preflight estructurado validado y cadenas crudas rechazadas');

// 6. Invocación CLI unificada: axion --help incluye drive
const rCli = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'axion.js'), '--help'], {
  encoding: 'utf8',
  windowsHide: true
});

assert.strictEqual(rCli.status, 0, 'CLI axion --help debe finalizar con código 0');
assert.strictEqual(rCli.stdout.includes('drive'), true);
console.log('✓ Registro del comando drive en el despachador CLI unificado verificado');

console.log('\nPASS AX-F-081 — Invariantes del motor Drive demostrados al 100%.\n');
