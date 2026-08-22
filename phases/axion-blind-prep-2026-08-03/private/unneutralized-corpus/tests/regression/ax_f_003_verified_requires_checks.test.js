/**
 * Regresión AX-F-003 — VERIFIED exige comprobaciones ejecutadas y superadas.
 * Autoridad: docs/terminology.md -> "COMPLETED expresa que la ejecución terminó;
 * VERIFIED requiere una comprobación independiente".
 * .agents/AGENTS.md §Blindaje 4 -> "Jamás declarar éxito sin ejecutar la suite".
 */
const assert = require('assert');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const { executeHybridWorkflow } = require(path.join(ROOT, 'tools', 'workflow_runner.js'));

const base = {
  taskId: 'AX-TASK-0002',
  title: 'Cambio',
  rawUserRequest: 'Reescribir por completo el módulo de autenticación de la aplicación en producción.',
  risk: 'LOW',
};

// 1. Sin aserciones declaradas: no puede continuar.
const sinAserciones = executeHybridWorkflow({ ...base, testAssertions: [] });
assert.strictEqual(sinAserciones.status, 'BLOCKED_NO_CHECKS',
  `sin aserciones debía bloquear, devolvió ${sinAserciones.status}`);

// 2. Aserciones declaradas pero no ejecutadas: no puede declararse VERIFIED.
const sinEjecutar = executeHybridWorkflow({ ...base, testAssertions: ['a', 'b'] });
assert.notStrictEqual(sinEjecutar.status, 'VERIFIED',
  'aserciones declaradas y no ejecutadas no pueden producir VERIFIED');
assert.strictEqual(sinEjecutar.status, 'COMPLETED_UNVERIFIED',
  `debía devolver COMPLETED_UNVERIFIED, devolvió ${sinEjecutar.status}`);

// 3. Resultados incompletos respecto a las aserciones declaradas: tampoco.
const incompleto = executeHybridWorkflow({ ...base, testAssertions: ['a', 'b'], checkResults: [true] });
assert.strictEqual(incompleto.status, 'COMPLETED_UNVERIFIED',
  `resultados incompletos debían impedir VERIFIED, devolvió ${incompleto.status}`);

// 4. Alguna comprobación fallida: veredicto de fallo, nunca VERIFIED.
const fallida = executeHybridWorkflow({ ...base, testAssertions: ['a', 'b'], checkResults: [true, false] });
assert.strictEqual(fallida.status, 'FAILED_CHECKS',
  `una comprobación fallida debía producir FAILED_CHECKS, devolvió ${fallida.status}`);

// 5. Comprobaciones completas y superadas: VERIFIED legítimo.
const verificado = executeHybridWorkflow({ ...base, testAssertions: ['a', 'b'], checkResults: [true, true] });
assert.strictEqual(verificado.status, 'VERIFIED',
  `comprobaciones superadas debían producir VERIFIED, devolvió ${verificado.status}`);

console.log('PASS AX-F-003 — VERIFIED sólo se alcanza con comprobaciones completas y superadas');
