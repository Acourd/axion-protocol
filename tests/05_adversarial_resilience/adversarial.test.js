const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { runPreflight } = require('../../tools/preflight.js');
const { analyzeUserIntent } = require('../../tools/intent_clarifier.js');
const { createEvidenceManifest } = require('../../tools/evidence_hasher.js');
const { captureHumanFeedback, classifyFeedbackCategory } = require('../../tools/learning_engine.js');
const { getGitStatusDiagnosis } = require('../../tools/git_assistant.js');

console.log('=== Suite de Pruebas Adversarias y Casos Límite (Axion Red Team) ===\n');

// 1. Stress-test preflight.js
console.log('--- 1. Pruebas Adversarias de preflight.js ---');
assert.strictEqual(runPreflight('').status, 'DENY');
assert.strictEqual(runPreflight(null).status, 'DENY');
assert.strictEqual(runPreflight('git status').status, 'NEEDS_HUMAN_REVIEW');
assert.strictEqual(runPreflight('rm -rf /').status, 'DENY');
assert.strictEqual(runPreflight('git commit -m "unclosed string').status, 'NEEDS_HUMAN_REVIEW');
console.log('✓ preflight.js resistió entradas nulas, vacías y comandos maliciosos/corruptos con Fail-Closed (PASS)');

// 2. Stress-test intent_clarifier.js
console.log('\n--- 2. Pruebas Adversarias de intent_clarifier.js ---');
assert.strictEqual(analyzeUserIntent('').status, 'NEEDS_CLARIFICATION');
assert.strictEqual(analyzeUserIntent('   ').status, 'NEEDS_CLARIFICATION');
assert.strictEqual(analyzeUserIntent(null).status, 'NEEDS_CLARIFICATION');

const giantString = 'a '.repeat(50000);
const giantRes = analyzeUserIntent(giantString);
assert.strictEqual(giantRes.status, 'INTENT_CLARIFIED');
console.log('✓ intent_clarifier.js manejó cadenas gigantes (>50k palabras) y nulos sin colapsar (PASS)');

// 3. Stress-test evidence_hasher.js
console.log('\n--- 3. Pruebas Adversarias de evidence_hasher.js ---');
const nonExistentFile = path.join(__dirname, 'non_existent_file_xyz123.tmp');
const manifest = createEvidenceManifest({
  taskId: 'AX-ADV-001',
  files: [nonExistentFile],
  logs: []
});
assert.strictEqual(manifest.status, 'INCOMPLETE', 'un archivo ausente debe marcar el manifiesto como incompleto');
assert.strictEqual(manifest.evidence.complete, false);
assert.strictEqual(manifest.evidence.files.length, 1, 'la ruta solicitada debe registrarse aunque no exista');
assert.strictEqual(manifest.evidence.files[0].status, 'MISSING');
assert.notStrictEqual(manifest.approval.state, 'APPROVED', 'el generador no puede autoaprobar la evidencia');
assert.ok(/^AX-EVD-[0-9]{4,}$/.test(manifest.evidence_id), 'evidence_id debe cumplir el patrón del esquema');
console.log('✓ evidence_hasher.js registró el archivo ausente sin descartarlo ni autoaprobarse (PASS)');

// 4. Stress-test learning_engine.js
console.log('\n--- 4. Pruebas Adversarias de learning_engine.js ---');
assert.strictEqual(captureHumanFeedback('').status, 'NO_FEEDBACK_DETECTED');
assert.strictEqual(captureHumanFeedback(null).status, 'NO_FEEDBACK_DETECTED');

const fallbackCat = classifyFeedbackCategory('algo totalmente aleatorio');
assert.strictEqual(fallbackCat, 'GENERAL_LESSON');
console.log('✓ learning_engine.js manejó categorías de resguardo universales sin perder datos (PASS)');

// 5. Stress-test git_assistant.js
console.log('\n--- 5. Pruebas Adversarias de git_assistant.js ---');
// scratch/ está DENTRO del repositorio y no sirve como directorio no-git.
const nonGitDir = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-nogit-'));
const gitDiag = getGitStatusDiagnosis({ cwd: nonGitDir });
assert.strictEqual(gitDiag.status, 'NOT_GIT_REPO', 'un directorio fuera de todo repositorio debe diagnosticarse NOT_GIT_REPO');
console.log('✓ git_assistant.js diagnosticó correctamente un directorio fuera de todo repositorio (PASS)');

console.log('\n=== TODAS LAS PRUEBAS ADVERSARIAS PASARON EXITOSAMENTE (PASS) ===');
