'use strict';
/**
 * SONDA ROJA R-04 — defecto G #4: ledger anti-replay seleccionable por el ejecutor.
 *
 * Propiedad bajo prueba (H-1 · 05):
 *   el almacén de consumo no puede ser un parámetro del request, y el ejecutor
 *   no puede elegirlo ni vaciarlo.
 *
 * Caso A: replay dentro del mismo almacén (debe bloquear — control positivo).
 * Caso B: mismo sobre firmado, almacén distinto (debe bloquear).
 * Caso C: mismo sobre firmado, marcador borrado (debe bloquear).
 */
const K = require('../lib/probe_kit.js');

console.log('R-04 · almacen de consumo bajo control del ejecutor');

const ws = K.workspace('r04');
const approver = K.keypair();
const auditor = K.keypair();
const registryPath = K.writeRegistry(ws.dir, [
  K.authority('alice', approver, ['HUMAN_AUTHORITY']),
  K.authority('bob', auditor, ['INDEPENDENT_AUDITOR']),
]);
const m = K.mission('AX-R04-001');
const ap = K.signApproval(m, 'alice', approver);
const ck = K.signCheck(m, 'bob', auditor, 'charlie', K.hashCanonical(ap.approval));
const pl = K.payload(m, ap, ck);
const base = { registryPath, executorActorId: 'charlie', executor: () => ({ status: 0 }) };

const first = K.executeHybridWorkflow(pl, { ...base, approvalConsumptionDir: ws.consumptionDir });
console.log(`  [ctrl] primer uso legitimo -> ${first.status}`);
if (first.status !== 'VERIFIED') {
  throw new Error(`CONTROL INVALIDO: el primer uso deberia ser VERIFIED, fue ${first.status}.`);
}

// --- Caso A: replay en el mismo almacen
const sameStore = K.executeHybridWorkflow(pl, { ...base, approvalConsumptionDir: ws.consumptionDir });
K.expectBlocked('replay en el mismo almacen', sameStore, 'Anti-replay dentro del directorio.');

// --- Caso B: el ejecutor elige otro almacen
const other = K.path.join(ws.dir, 'consumed-elegido-por-el-ejecutor');
K.fs.mkdirSync(other, { recursive: true });
const otherStore = K.executeHybridWorkflow(pl, { ...base, approvalConsumptionDir: other });
K.expectBlocked('misma firma, almacen distinto', otherStore,
  'approvalConsumptionDir es un parametro del runtimeContext no confiable; usageLimit:1 no se sostiene.');

// --- Caso C: el ejecutor borra el marcador de consumo
for (const f of K.fs.readdirSync(ws.consumptionDir)) {
  K.fs.unlinkSync(K.path.join(ws.consumptionDir, f));
}
const wiped = K.executeHybridWorkflow(pl, { ...base, approvalConsumptionDir: ws.consumptionDir });
K.expectBlocked('misma firma tras borrar el marcador', wiped,
  'El estado anti-replay reside donde el ejecutor tiene permiso de borrado.');

console.log('R-04 PASS');
