const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { captureHumanFeedback, classifyFeedbackCategory } = require('../../tools/learning_engine.js');
const { getGitStatusDiagnosis } = require('../../tools/git_assistant.js');

console.log('=== Pruebas de Aprendizaje por Retroalimentación y Asistente Git ===\n');

// 1. Pruebas del Motor de Aprendizaje
console.log('--- 1. Pruebas de learning_engine.js ---');

const cat1 = classifyFeedbackCategory('Prefiero que la interfaz sea minimalista y sin botones rojos');
assert.strictEqual(cat1, 'PRODUCT_PREFERENCE');
console.log('✓ Retroalimentación de preferencia de producto clasificada como PRODUCT_PREFERENCE');

const cat2 = classifyFeedbackCategory('Ten cuidado con la seguridad, no borres la base de datos');
assert.strictEqual(cat2, 'SAFETY_RULE');
console.log('✓ Retroalimentación de seguridad clasificada como SAFETY_RULE');

const testLearningsFile = path.join(__dirname, '..', '..', 'scratch', 'test_learnings.md');
if (fs.existsSync(testLearningsFile)) fs.unlinkSync(testLearningsFile);

const captureRes = captureHumanFeedback('En este proyecto debemos usar siempre nombres de variables descriptivos', { targetFile: testLearningsFile });
assert.strictEqual(captureRes.status, 'LEARNING_RECORDED');
assert.strictEqual(fs.existsSync(testLearningsFile), true);
console.log('✓ Retroalimentación humana registrada correctamente en archivo markdown.');

if (fs.existsSync(testLearningsFile)) fs.unlinkSync(testLearningsFile);

// 2. Pruebas del Asistente Git
console.log('\n--- 2. Pruebas de git_assistant.js ---');

const ESTADOS_VALIDOS = ['NOT_GIT_REPO', 'CLEAN_SYNCED', 'UNSAVED_CHANGES'];
const gitDiagnosis = getGitStatusDiagnosis({ cwd: path.join(__dirname, '..') });
assert.ok(ESTADOS_VALIDOS.includes(gitDiagnosis.status), `estado fuera del dominio conocido: ${gitDiagnosis.status}`);
assert.ok(gitDiagnosis.simpleMessage.length > 0, 'el mensaje dirigido al usuario no puede estar vacío');
console.log(`✓ Diagnóstico de Git ejecutado con éxito: Status "${gitDiagnosis.status}". Mensaje: "${gitDiagnosis.simpleMessage}"`);

console.log('\n=== TODAS LAS PRUEBAS DE APRENDIZAJE Y GIT PASARON EXITOSAMENTE (PASS) ===');
