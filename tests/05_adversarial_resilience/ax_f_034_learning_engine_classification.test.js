'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { classifyFeedbackCategory, captureHumanFeedback } = require('../../tools/learning_engine.js');

console.log('=== AX-F-034 Clasificación Semántica y Persistencia del Learning Engine ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const scratchDir = path.join(ROOT, 'scratch', 'test_learning');
if (!fs.existsSync(scratchDir)) {
  fs.mkdirSync(scratchDir, { recursive: true });
}

// 1. Clasificación semántica multidominio
assert.strictEqual(classifyFeedbackCategory('Prefiero interfaces minimalistas y sencillas'), 'PRODUCT_PREFERENCE');
assert.strictEqual(classifyFeedbackCategory('Cuidado con el riesgo de borrar bases de datos'), 'SAFETY_RULE');
assert.strictEqual(classifyFeedbackCategory('Cambia el color del botón en el panel de usuario'), 'UX_DESIGN');
assert.strictEqual(classifyFeedbackCategory('Optimiza la velocidad porque la carga es muy lenta'), 'PERFORMANCE_RULE');
assert.strictEqual(classifyFeedbackCategory('Refactoriza esta función para usar un patrón limpio'), 'CODE_PATTERN');
assert.strictEqual(classifyFeedbackCategory('Nota miscelánea de desarrollo'), 'GENERAL_LESSON');
console.log('✓ Clasificación semántica de 6 categorías de feedback verificada');

// 2. Rechazo de feedback vacío o no textual
assert.strictEqual(captureHumanFeedback('').status, 'NO_FEEDBACK_DETECTED');
assert.strictEqual(captureHumanFeedback('   ').status, 'NO_FEEDBACK_DETECTED');
assert.strictEqual(captureHumanFeedback(null).status, 'NO_FEEDBACK_DETECTED');
console.log('✓ Rechazo de entradas vacías verificado');

// 3. Persistencia aditiva e inmutabilidad histórica
const targetFile = path.join(scratchDir, 'LEARNINGS_TEST.md');
if (fs.existsSync(targetFile)) fs.unlinkSync(targetFile);

const r1 = captureHumanFeedback('Nunca uses eval en funciones dinámicas', { targetFile });
assert.strictEqual(r1.status, 'LEARNING_RECORDED');
assert.strictEqual(r1.category, 'SAFETY_RULE');

const r2 = captureHumanFeedback('Prioriza respuestas concisas', { targetFile });
assert.strictEqual(r2.status, 'LEARNING_RECORDED');
assert.strictEqual(r2.category, 'PRODUCT_PREFERENCE');

const content = fs.readFileSync(targetFile, 'utf8');
assert.strictEqual(content.includes('SAFETY_RULE'), true);
assert.strictEqual(content.includes('PRODUCT_PREFERENCE'), true);
console.log('✓ Persistencia aditiva y conservación de historial verificada');

console.log('\nPASS AX-F-034 — Learning Engine y clasificación semántica verificados al 100%.\n');
