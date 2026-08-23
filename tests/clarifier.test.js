const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { analyzeUserIntent, hasTechnicalSpecificity, sealIntent } = require('../tools/intent_clarifier.js');
const { executeHybridWorkflow } = require('../tools/workflow_runner.js');

console.log('=== Pruebas del Módulo Aclarador de Intención e Ideas (Intent Clarifier) ===\n');

// Caso 1: Solicitud vaga de un usuario no técnico -> Exige Aclaración
console.log('--- Caso 1: Solicitud vaga ("haz un login") ---');
const vagueRes = analyzeUserIntent('haz un login');
assert.strictEqual(vagueRes.status, 'NEEDS_CLARIFICATION');
assert.strictEqual(vagueRes.questions.length > 0, true);
assert.strictEqual(vagueRes.options.length >= 2, true);
console.log('✓ Solicitud vaga identificada correctamente. Generadas preguntas y opciones de decisión.');

// Caso 2: Solicitud clara de usuario -> Emite Contrato de Entendimiento
console.log('\n--- Caso 2: Solicitud detallada y clara ---');
const clearRequest = 'Crear un componente visual de tarjeta de perfil que muestre el avatar del usuario, su nombre completo y su rol dentro de la aplicación.';
const clearRes = analyzeUserIntent(clearRequest);
assert.strictEqual(clearRes.status, 'INTENT_CLARIFIED');
assert.strictEqual(typeof clearRes.intentContract.summary, 'string');
console.log('✓ Solicitud clara procesada con éxito. Contrato de Entendimiento emitido.');

// Caso 3: Solicitud técnica concisa -> Detecta especificidad (Cero falsos positivos)
console.log('\n--- Caso 3: Solicitud técnica concisa ("agrega validación SHA-256 en tools/crypto.js") ---');
assert.strictEqual(hasTechnicalSpecificity('agrega validación SHA-256 en tools/crypto.js'), true);
const techRes = analyzeUserIntent('agrega validación SHA-256 en tools/crypto.js');
assert.strictEqual(techRes.status, 'INTENT_CLARIFIED', 'Debe clasificar como clarificado directo ante rutas y hashes técnicos');
console.log('✓ Detector de especificidad técnica: no interrumpe al usuario con preguntas irrelevantes.');

// Caso 4: Sellado de Contrato en disco con SHA-256
console.log('\n--- Caso 4: Sellado Atómico de IntentContract ---');
const sealed = sealIntent('Diseñar panel administrativo', 'Opción A (Slate Dark)');
assert.strictEqual(sealed.status, 'INTENT_CLARIFIED');
const contractPath = path.join(__dirname, '..', '.axion', 'state', 'intent-contract.json');
assert.strictEqual(fs.existsSync(contractPath), true, 'Debe persistirse en .axion/state/intent-contract.json');
const savedData = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
assert.strictEqual(Boolean(savedData.digest), true, 'Debe incluir digest SHA-256');
assert.strictEqual(savedData.selectedOptions, 'Opción A (Slate Dark)');
console.log('✓ Contrato sellado y persistido atómicamente con digest SHA-256.');

// Caso 5: Integración en workflow_runner.js con solicitud vaga -> Bloqueado en Fase 1 (ENTENDER)
console.log('\n--- Caso 5: Bloqueo de Workflow por Intención Ambigua ---');
const taskVagueWorkflow = {
  taskId: 'AX-TASK-VAGUE-001',
  rawUserRequest: 'agrega botones',
  risk: 'LOW'
};

const wfRes = executeHybridWorkflow(taskVagueWorkflow);
assert.strictEqual(wfRes.status, 'BLOCKED_NEEDS_CLARIFICATION');
assert.strictEqual(wfRes.questions.length > 0, true);
console.log('✓ El Workflow detuvo la ejecución en la Fase 1 (ENTENDER) al detectar solicitud vaga.');

console.log('\n=== TODAS LAS PRUEBAS DEL ACLARADOR PASARON EXITOSAMENTE (PASS) ===');
