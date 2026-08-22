const assert = require('assert');
const path = require('path');
const { executeHybridWorkflow } = require('../tools/workflow_runner.js');

console.log('=== Pruebas del Flujo de Trabajo Híbrido Unificado (Axion Protocol) ===\n');

// Caso 1: Tarea estándar de riesgo bajo con intención clara (Flujo Completo PASS)
console.log('--- Caso 1: Tarea de bajo riesgo con intención clara ---');
const taskLowRisk = {
  taskId: 'AX-TEST-001',
  title: 'Refactorización menor de utilidad',
  rawUserRequest: 'Realizar una refactorización menor de la función auxiliar de preflight para optimizar su velocidad de respuesta.',
  scope: ['tools/preflight.js'],
  risk: 'LOW',
  testAssertions: ['Sintaxis válida'],
  checkResults: [true],
  commandToExecute: 'node -v',
  modifiedFiles: [path.join(__dirname, '..', 'tools', 'preflight.js')]
};

const res1 = executeHybridWorkflow(taskLowRisk);
assert.strictEqual(res1.status, 'VERIFIED', 'Tarea de bajo riesgo con CHECK ejecutado y superado debe finalizar en VERIFIED');
assert.strictEqual(res1.log.length, 7, 'El log debe contener registros de los 7 pasos');
console.log('✓ Tarea de bajo riesgo completó los 7 pasos con estado VERIFIED');

// Caso 2: Tarea de riesgo alto sin aprobación humana (Bloqueo en GATE)
console.log('\n--- Caso 2: Tarea de alto riesgo sin autorización (Bloqueo en GATE) ---');
const taskHighRiskNoGate = {
  taskId: 'AX-TEST-02',
  title: 'Migración masiva de la capa de persistencia',
  rawUserRequest: 'Ejecutar la migración masiva de la capa de persistencia actual hacia la nueva estructura de datos.',
  scope: ['database/production'],
  risk: 'HIGH',
  humanApproval: false,
  commandToExecute: 'npm run migrate'
};

const res2 = executeHybridWorkflow(taskHighRiskNoGate);
assert.strictEqual(res2.status, 'BLOCKED_GATE_REQUIRED', 'Riesgo alto sin aprobación debe bloquearse en GATE');
console.log('✓ Tarea de alto riesgo sin aprobación fue bloqueada correctamente en GATE');

// Caso 3: Comando que falla el Preflight Léxico (Bloqueo en CONSTRUIR)
console.log('\n--- Caso 3: Comando peligroso o sintaxis corrupta (Bloqueo en PREFLIGHT) ---');
const taskBadPreflight = {
  taskId: 'AX-TEST-03',
  title: 'Ejecución con sintaxis insegura',
  rawUserRequest: 'Ejecutar una limpieza completa de temporales eliminando directorios de la raíz.',
  scope: ['scratch/test'],
  risk: 'LOW',
  testAssertions: ['Comando verificado por preflight'],
  checkResults: [true],
  commandToExecute: 'rm -rf /'
};

const res3 = executeHybridWorkflow(taskBadPreflight);
assert.strictEqual(res3.status, 'FAILED_PREFLIGHT', 'Comando destructivo debe fallar en la fase de CONSTRUIR/PREFLIGHT');
console.log('✓ Comando peligroso fue detenido en la fase de CONSTRUIR/PREFLIGHT');

console.log('\n=== TODAS LAS PRUEBAS DEL FLUJO HÍBRIDO PASARON EXITOSAMENTE (PASS) ===');

