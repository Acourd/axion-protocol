'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  classifyFeedbackCategory,
  captureHumanFeedback
} = require('../../tools/learning_engine.js');

console.log('=== AX-F-074 Invariantes del Motor de Aprendizaje y Clasificación Semántica de Feedback ===\n');

// 1. Matriz de clasificación semántica de feedback
assert.strictEqual(classifyFeedbackCategory('prefiero que el diseño sea minimalista y con enfoque no técnico'), 'PRODUCT_PREFERENCE');
assert.strictEqual(classifyFeedbackCategory('cuidado con comandos destructivos que borren la base de datos'), 'SAFETY_RULE');
assert.strictEqual(classifyFeedbackCategory('cambia el color del botón y la tipografía de la interfaz'), 'UX_DESIGN');
assert.strictEqual(classifyFeedbackCategory('optimiza la velocidad de carga y reduce el consumo de memoria'), 'PERFORMANCE_RULE');
assert.strictEqual(classifyFeedbackCategory('refactoriza la función para seguir el patrón de repositorio limpio'), 'CODE_PATTERN');
assert.strictEqual(classifyFeedbackCategory('hoy es martes por la tarde'), 'GENERAL_LESSON');
assert.strictEqual(classifyFeedbackCategory(null), 'GENERAL_LESSON');
assert.strictEqual(classifyFeedbackCategory(''), 'GENERAL_LESSON');
console.log('✓ Clasificación semántica precisa en las 6 categorías verificada');

// 2. Rechazo de feedback vacío o no textual
assert.strictEqual(captureHumanFeedback('').status, 'NO_FEEDBACK_DETECTED');
assert.strictEqual(captureHumanFeedback('   ').status, 'NO_FEEDBACK_DETECTED');
assert.strictEqual(captureHumanFeedback(null).status, 'NO_FEEDBACK_DETECTED');
assert.strictEqual(captureHumanFeedback(undefined).status, 'NO_FEEDBACK_DETECTED');
console.log('✓ Rechazo de entradas vacías con NO_FEEDBACK_DETECTED verificado');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-learning-test-'));

try {
  const targetFile = path.join(tempDir, 'LEARNINGS.md');

  // 3. Captura y persistencia de primera lección
  const r1 = captureHumanFeedback('Nunca ejecutar git push sin autorización explícita del humano', { targetFile });
  assert.strictEqual(r1.status, 'LEARNING_RECORDED');
  assert.strictEqual(r1.category, 'SAFETY_RULE');
  assert.strictEqual(fs.existsSync(targetFile), true);

  const contenido1 = fs.readFileSync(targetFile, 'utf8');
  assert.strictEqual(contenido1.includes('**[SAFETY_RULE]**'), true);
  assert.strictEqual(contenido1.includes('Nunca ejecutar git push'), true);
  console.log('✓ Creación y registro de primera lección en LEARNINGS.md verificado');

  // 4. Preservación acumulativa de historial (segunda lección no sobrescribe la primera)
  const r2 = captureHumanFeedback('Optimizar la velocidad de respuesta y reducir el consumo de memoria', { targetFile });
  assert.strictEqual(r2.status, 'LEARNING_RECORDED');
  assert.strictEqual(r2.category, 'PERFORMANCE_RULE');

  const contenido2 = fs.readFileSync(targetFile, 'utf8');
  assert.strictEqual(contenido2.includes('**[SAFETY_RULE]**'), true, 'debe conservar lección previa');
  assert.strictEqual(contenido2.includes('**[PERFORMANCE_RULE]**'), true, 'debe incorporar nueva lección');
  console.log('✓ Preservación acumulativa del historial en LEARNINGS.md verificada');

  // 5. Manejo fail-closed ante ruta inválida
  const rutaInvalida = path.join(tempDir, 'directorio_no_creado', 'sub', 'LEARNINGS.md');
  const rFail = captureHumanFeedback('Lección en ruta imposible', { targetFile: rutaInvalida });
  assert.strictEqual(rFail.status, 'LEARNING_FAILED');
  assert.strictEqual(Boolean(rFail.error), true);
  console.log('✓ Retorno fail-closed (LEARNING_FAILED) ante errores de I/O verificado');

} finally {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (_) {}
}

console.log('\nPASS AX-F-074 — Invariantes del motor de aprendizaje demostrados al 100%.\n');
