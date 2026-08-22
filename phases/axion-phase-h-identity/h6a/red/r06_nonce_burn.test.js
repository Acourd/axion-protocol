'use strict';
/**
 * SONDA ROJA R-06 — quema de nonce por fallo posterior al GATE.
 *
 * Propiedad bajo prueba (H-1 · 05, patrón Reserve/Commit):
 *   una aprobación legítima no puede quedar inutilizada por un fallo de
 *   verificación posterior a su consumo.
 *
 * Sonda adicional a la lista de ocho defectos de la autorización: procede de la
 * evidencia de AX-NC-0001 (PoC-6) y cubre el mismo patrón de consumo prematuro.
 */
const K = require('../lib/probe_kit.js');

console.log('R-06 · consumo del nonce antes de evaluar la separacion completa');

const ws = K.workspace('r06');
const approver = K.keypair();
const auditor = K.keypair();
const registryPath = K.writeRegistry(ws.dir, [
  K.authority('alice', approver, ['HUMAN_AUTHORITY']),
  K.authority('bob', auditor, ['INDEPENDENT_AUDITOR']),
]);

const m = K.mission('AX-R06-001');
const ap = K.signApproval(m, 'alice', approver);
const digest = K.hashCanonical(ap.approval);
const runtime = {
  registryPath,
  approvalConsumptionDir: ws.consumptionDir,
  executorActorId: 'charlie',
  executor: () => ({ status: 0 }),
};

// Intento 1: CHECK invalido a proposito (atesta otro ejecutor).
const badCheck = K.signCheck(m, 'bob', auditor, 'OTRO-EJECUTOR', digest);
const first = K.executeHybridWorkflow(K.payload(m, ap, badCheck), runtime);
const markers = K.fs.readdirSync(ws.consumptionDir).length;
console.log(`  intento 1 (CHECK invalido) -> ${first.status}; marcadores de nonce: ${markers}`);

// Intento 2: misma aprobacion legitima, ahora con CHECK correcto.
const goodCheck = K.signCheck(m, 'bob', auditor, 'charlie', digest);
const second = K.executeHybridWorkflow(K.payload(m, ap, goodCheck), runtime);

K.expectVerified('aprobacion legitima reutilizable tras un fallo en TEST', second,
  `El nonce se consumio en GATE (${markers} marcador/es) antes de evaluar la independencia `
  + 'aprobador-auditor; la aprobacion queda inutilizada de forma permanente.');

console.log('R-06 PASS');
