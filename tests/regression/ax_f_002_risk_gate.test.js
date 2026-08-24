'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { executeHybridWorkflow } = require(path.join(ROOT, 'tools', 'workflow_runner.js'));

const missionId = 'AX-TASK-0001';
const base = {
  missionId,
  title: 'Migracion',
  rawUserRequest: 'Ejecutar una migracion masiva verificable de la capa de persistencia.',
  scope: ['database/production'],
  command: { executable: 'node', args: ['--version'], cwd: ROOT, shell: false },
  rollbackPlan: {
    contractVersion: '1.0.0',
    planId: 'RB-AX-TASK-0001',
    missionId,
    strategy: 'RESTORE_SNAPSHOT',
    snapshotDigest: 'c'.repeat(64),
    steps: ['restaurar snapshot autorizado'],
    verification: ['comparar manifest SHA-256'],
  },
  testAssertions: ['comprobacion'],
  // CRITICAL exige ademas pre-mortem adversarial, que el runner comprueba en PLANIFICAR,
  // antes del GATE. Sin este payload una mision CRITICAL se detendria una fase antes y
  // esta suite dejaria de medir lo que vino a medir: que la puerta de FIRMA falla cerrada.
  // La autopsia va delante a proposito: pregunta si la cosa deberia existir, y esa
  // pregunta no tiene sentido despues de que un humano ya haya firmado que si.
  premortem: {
    feature_name: 'Migracion masiva de la capa de persistencia',
    competence_check: { justified: true, rationale: 'La migracion es inevitable para el contrato nuevo' },
    anchors: {
      security: ['Una migracion con credenciales de produccion expone la base entera si el script se equivoca de entorno'],
      performance: ['El bloqueo de tabla durante la migracion detiene la escritura de toda la aplicacion en caliente'],
      architecture: ['El esquema nuevo rompe el contrato con los consumidores que aun leen las columnas viejas'],
      ux: ['Una migracion a medias deja al usuario viendo datos incoherentes sin explicacion ninguna'],
    },
    worst_case_scenarios: [
      'La migracion falla a mitad y deja filas convertidas y sin convertir en la misma tabla',
      'El snapshot de reversion resulta ilegible justo cuando hace falta restaurarlo de urgencia',
    ],
    mandatory_mitigations: [
      'Verificar el snapshot de reversion antes de tocar una sola fila de la tabla original',
    ],
  },
};

// Las misiones CRITICAL sellan su pre-mortem, y una prueba no debe escribir en el arbol
// de evidencia del proyecto: ademas de ensuciarlo, el detector de calco veria registros
// de corridas anteriores y el resultado dependeria del orden de ejecucion.
const ARENAL = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-riskgate-'));
const ctx = { premortemRoot: ARENAL };

const EXIGEN_GATE = ['HIGH', 'CRITICAL', 'high', 'critical', 'Critical', 'HIGH ', ' high', 'High'];
const FUERA_DE_DOMINIO = ['SEVERE', 'CATASTROPHIC', 'ALTO', '', 999, undefined, null, {}];
const fallos = [];

for (const risk of EXIGEN_GATE) {
  const result = executeHybridWorkflow({ ...base, risk }, ctx);
  if (result.status !== 'BLOCKED_APPROVAL_MISSING') {
    fallos.push(`risk=${JSON.stringify(risk)} debia exigir firma y devolvio ${result.status}`);
  }
}

for (const risk of FUERA_DE_DOMINIO) {
  const result = executeHybridWorkflow({ ...base, risk }, ctx);
  if (result.status !== 'BLOCKED_INVALID_RISK') {
    fallos.push(`risk=${JSON.stringify(risk)} debia bloquear identidad y devolvio ${result.status}`);
  }
}

const fabricated = executeHybridWorkflow({ ...base, risk: 'HIGH', humanApproval: true }, ctx);
if (fabricated.status !== 'BLOCKED_APPROVAL_MISSING') {
  fallos.push(`humanApproval:true no puede sustituir una firma: ${fabricated.status}`);
}

const low = executeHybridWorkflow({ ...base, risk: 'low', rollbackPlan: undefined }, ctx);
if (low.status === 'BLOCKED_INVALID_RISK' || low.status === 'BLOCKED_APPROVAL_MISSING') {
  fallos.push(`risk='low' no debe exigir gate HIGH/CRITICAL: ${low.status}`);
}

fs.rmSync(ARENAL, { recursive: true, force: true });

assert.deepStrictEqual(fallos, [], `el gate no falla cerrado:\n  - ${fallos.join('\n  - ')}`);
console.log(`PASS AX-F-002 — ${EXIGEN_GATE.length} grafias exigen firma, ${FUERA_DE_DOMINIO.length} valores bloquean`);
