'use strict';

/**
 * AX-NC-0001, vector de relectura del payload — Fase H, regla 06.
 *
 * «Despues de validar un artefacto firmado, ninguna decision posterior puede
 *  depender otra vez de su representacion original no confiable.»
 *
 * El runner verificaba la aprobacion y despues volvia a leer
 * `taskPayload.approvalEnvelope.approval.actorId` para decidir la separacion de
 * roles. Un accessor podia devolver la aprobacion buena durante la verificacion y
 * un senuelo en las lecturas siguientes, de modo que la decision de seguridad se
 * tomaba sobre datos que nadie habia firmado.
 *
 * El arreglo: la verificacion devuelve el actorId de su propia instantanea, y el
 * runner usa ese valor. Esta suite fija ambas mitades del contrato.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const { APPROVAL_STATUS } = require('../../tools/approval_ed25519.js');

const ROOT = path.join(__dirname, '..', '..');
const leer = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

let n = 0;
const ok = (d) => console.log(`  [${++n}] PASS: ${d}`);

console.log('=== AX-NC-0001 - relectura del payload ===\n');

// --- 1. El runner no puede volver a dereferenciar el sobre original ---------
// Comprobacion sobre el propio codigo: es la unica forma de impedir que la
// relectura se reintroduzca sin que nadie se entere. Si algun dia hace falta
// leer el sobre otra vez, este test obliga a justificarlo cambiandolo.

const runner = leer('tools/workflow_runner.js');
const relecturas = runner.match(/approvalEnvelope\s*\.\s*approval/g) || [];

assert.deepStrictEqual(
  relecturas, [],
  'workflow_runner.js vuelve a leer approvalEnvelope.approval despues de verificarlo; '
  + 'usa el actorId que devuelve verifyAndConsumeApproval',
);
ok('el runner no dereferencia el sobre de aprobacion tras verificarlo');

// El sobre solo puede tocarse para comprobar su presencia y para pasarlo a verificar.
const usos = runner.match(/taskPayload\.approvalEnvelope/g) || [];
assert.ok(
  usos.length <= 2,
  `el sobre original se usa ${usos.length} veces; solo se admite comprobar presencia y verificar`,
);
ok(`el sobre original se usa ${usos.length} veces: presencia y verificacion`);

// --- 2. La verificacion devuelve la identidad que ella misma valido ---------

const aprobacion = leer('tools/approval_ed25519.js');
const bloqueValido = aprobacion.slice(aprobacion.indexOf('APPROVAL_STATUS.APPROVAL_VALID, {'));

assert.match(
  bloqueValido.slice(0, 400),
  /actorId:\s*approval\.actorId/,
  'verifyAndConsumeApproval debe devolver el actorId de su instantanea verificada',
);
ok('la verificacion expone el actorId verificado para que el runner no lo busque');

// --- 3. Y el contrato de estados sigue intacto ------------------------------

assert.strictEqual(APPROVAL_STATUS.APPROVAL_VALID, 'APPROVAL_VALID');
assert.strictEqual(APPROVAL_STATUS.APPROVAL_NOT_INDEPENDENT, 'APPROVAL_NOT_INDEPENDENT');
ok('los estados de aprobacion conservan su contrato');

console.log(`\nPASS AX-NC-0001 relectura - ${n} comprobaciones`);
