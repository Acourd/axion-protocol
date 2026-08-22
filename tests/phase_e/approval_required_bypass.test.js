'use strict';

/**
 * Cierre de AX-NC-0003 sin abrir una via de evasion.
 *
 * El defecto era que verifyIndependentCheck exigia un aprobador SIEMPRE, incluso con
 * riesgos que la politica no somete a aprobacion. Eso dejaba a LOW sin poder alcanzar
 * VERIFIED nunca.
 *
 * El arreglo introduce approvalRequired. Esta suite existe para demostrar que ese
 * parametro no se puede usar para saltarse la independencia del aprobador: comprueba
 * que la ruta estricta sigue cerrada, que el valor por defecto falla cerrado y que un
 * aprobador no declarado no entra por la puerta de atras.
 */

const assert = require('assert');
const path = require('path');

const { executeHybridWorkflow } = require('../../tools/workflow_runner.js');
const { CHECK_STATUS, verifyIndependentCheck } = require('../../tools/check_ed25519.js');
const { hashCanonical } = require('../../tools/canonical_json.js');
const { createLowRiskFixture } = require('../trust_fixture.js');

const ROOT = path.join(__dirname, '..', '..');
let n = 0;
const ok = (desc) => console.log(`  [${++n}] PASS: ${desc}`);

console.log('=== AX-NC-0003 — el arreglo no abre una via de evasion ===\n');

// --- 1. La politica manda: HIGH sin sobre de aprobacion sigue bloqueando -----
// Es la comprobacion central. Si omitir el sobre relajase la independencia,
// bastaria con no mandarlo para eludir al aprobador.
{
  const missionId = 'AX-BYPASS-001';
  const res = executeHybridWorkflow({
    missionId,
    title: 'Intento de eludir al aprobador omitiendo el sobre',
    rawUserRequest: 'Ejecutar una accion de alto riesgo sin aportar aprobacion firmada.',
    scope: ['database/production'],
    risk: 'HIGH',
    command: { executable: 'node', args: ['--version'], cwd: ROOT, shell: false },
    rollbackPlan: {
      contractVersion: '1.0.0',
      planId: `RB-${missionId}`,
      missionId,
      strategy: 'RESTORE_SNAPSHOT',
      snapshotDigest: 'c'.repeat(64),
      steps: ['restaurar snapshot autorizado'],
      verification: ['comparar manifest SHA-256'],
    },
    testAssertions: ['comprobacion independiente'],
  });
  assert.strictEqual(res.status, 'BLOCKED_APPROVAL_MISSING');
  ok('HIGH sin aprobacion firmada sigue bloqueado en el GATE');
}

// --- Fixture LOW reutilizable para los casos unitarios ----------------------
function bindingDe(fixture) {
  const { payload } = fixture;
  return {
    missionId: payload.missionId,
    risk: 'LOW',
    commandHash: hashCanonical(payload.command),
    approvalDigest: hashCanonical({
      missionId: payload.missionId,
      approvalRequired: false,
      risk: 'LOW',
    }),
    assertionsHash: hashCanonical(payload.testAssertions),
  };
}

// --- 2. El valor por defecto falla cerrado ----------------------------------
// Un llamador que olvide pasar approvalRequired debe obtener la ruta estricta,
// nunca la relajada.
{
  const f = createLowRiskFixture({ missionId: 'AX-BYPASS-002', assertions: ['a'] });
  const res = verifyIndependentCheck({
    envelope: f.payload.checkEnvelope,
    expectedBinding: bindingDe(f),
    registryPath: f.runtime.registryPath,
    executorActorId: f.runtime.executorActorId,
    approvalActorId: '',
    // approvalRequired omitido a proposito
    now: f.runtime.now,
  });
  assert.strictEqual(res.status, CHECK_STATUS.CHECK_NOT_INDEPENDENT);
  ok('omitir approvalRequired aplica la ruta estricta (falla cerrado)');
}

// --- 3. La ruta estricta sigue exigiendo aprobador ---------------------------
{
  const f = createLowRiskFixture({ missionId: 'AX-BYPASS-003', assertions: ['a'] });
  const res = verifyIndependentCheck({
    envelope: f.payload.checkEnvelope,
    expectedBinding: bindingDe(f),
    registryPath: f.runtime.registryPath,
    executorActorId: f.runtime.executorActorId,
    approvalActorId: '',
    approvalRequired: true,
    now: f.runtime.now,
  });
  assert.strictEqual(res.status, CHECK_STATUS.CHECK_NOT_INDEPENDENT);
  ok('approvalRequired:true con aprobador vacio sigue bloqueando');
}

// --- 4. Sin aprobacion exigida tampoco se admite un aprobador colado ---------
{
  const f = createLowRiskFixture({ missionId: 'AX-BYPASS-004', assertions: ['a'] });
  const res = verifyIndependentCheck({
    envelope: f.payload.checkEnvelope,
    expectedBinding: bindingDe(f),
    registryPath: f.runtime.registryPath,
    executorActorId: f.runtime.executorActorId,
    approvalActorId: 'aprobador-no-declarado',
    approvalRequired: false,
    now: f.runtime.now,
  });
  assert.strictEqual(res.status, CHECK_STATUS.CHECK_NOT_INDEPENDENT);
  ok('approvalRequired:false con aprobador no vacio se rechaza');
}

// --- 5. La independencia del ejecutor no depende del riesgo ------------------
{
  const f = createLowRiskFixture({ missionId: 'AX-BYPASS-005', assertions: ['a'] });
  const res = verifyIndependentCheck({
    envelope: f.payload.checkEnvelope,
    expectedBinding: bindingDe(f),
    registryPath: f.runtime.registryPath,
    executorActorId: '',
    approvalActorId: '',
    approvalRequired: false,
    now: f.runtime.now,
  });
  assert.strictEqual(res.status, CHECK_STATUS.CHECK_NOT_INDEPENDENT);
  ok('ejecutor ausente bloquea aunque no se exija aprobacion');
}

// --- 6. Y con todo correcto, LOW alcanza VERIFIED ----------------------------
// Es el comportamiento que AX-NC-0003 impedia.
{
  const f = createLowRiskFixture({
    missionId: 'AX-BYPASS-006',
    assertions: ['Sintaxis valida'],
    modifiedFiles: [path.join(ROOT, 'tools', 'preflight.js')],
  });
  const res = executeHybridWorkflow(f.payload, f.runtime);
  assert.strictEqual(res.status, 'VERIFIED');
  assert.strictEqual(res.workflow.history.length, 7);
  ok('LOW completa las siete fases y alcanza VERIFIED');
}

console.log(`\nPASS AX-NC-0003 — ${n} comprobaciones, sin via de evasion`);
