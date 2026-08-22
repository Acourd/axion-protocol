/**
 * Verifica que el gate de aprobación humana falle cerrado.
 * Autoridad: policies/authority.yaml -> missing_identity_behavior: FAIL_CLOSED;
 * policies/risk.yaml -> dominio {LOW, MEDIUM, HIGH, CRITICAL}.
 */
const assert = require('assert');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const { executeHybridWorkflow } = require(path.join(ROOT, 'tools', 'workflow_runner.js'));

const base = {
  taskId: 'AX-TASK-0001',
  title: 'Migración',
  rawUserRequest: 'Ejecutar la migración masiva de la capa de persistencia hacia la nueva estructura de datos.',
  humanApproval: false,
  testAssertions: ['comprobación'],
  checkResults: [true],
};

// Riesgo alto en cualquier grafía: debe exigir aprobación.
const EXIGEN_GATE = ['HIGH', 'CRITICAL', 'high', 'critical', 'Critical', 'HIGH ', ' high', 'High'];
// Fuera del dominio o ausente: debe bloquearse por identidad ambigua, nunca continuar.
const FUERA_DE_DOMINIO = ['SEVERE', 'CATASTROPHIC', 'ALTO', '', 999, undefined, null, {}];

const fallos = [];

for (const risk of EXIGEN_GATE) {
  const r = executeHybridWorkflow({ ...base, risk });
  if (r.status !== 'BLOCKED_GATE_REQUIRED') {
    fallos.push(`risk=${JSON.stringify(risk)} debía exigir gate y devolvió ${r.status}`);
  }
}

for (const risk of FUERA_DE_DOMINIO) {
  const r = executeHybridWorkflow({ ...base, risk });
  if (r.status !== 'BLOCKED_INVALID_RISK') {
    fallos.push(`risk=${JSON.stringify(risk)} está fuera del dominio y debía bloquear, devolvió ${r.status}`);
  }
}

// Con aprobación explícita, el riesgo alto sí puede avanzar.
const aprobado = executeHybridWorkflow({ ...base, risk: 'HIGH', humanApproval: true });
if (aprobado.status === 'BLOCKED_GATE_REQUIRED') {
  fallos.push('con humanApproval:true el riesgo HIGH no debe bloquearse');
}

// El riesgo bajo canónico sigue sin requerir gate.
const bajo = executeHybridWorkflow({ ...base, risk: 'low' });
if (bajo.status === 'BLOCKED_GATE_REQUIRED' || bajo.status === 'BLOCKED_INVALID_RISK') {
  fallos.push(`risk='low' es canónico y no debe bloquearse, devolvió ${bajo.status}`);
}

assert.deepStrictEqual(fallos, [], 'el gate no falla cerrado:\n  - ' + fallos.join('\n  - '));
console.log(`PASS — ${EXIGEN_GATE.length} grafías exigen gate, ${FUERA_DE_DOMINIO.length} valores fuera de dominio bloquean`);
