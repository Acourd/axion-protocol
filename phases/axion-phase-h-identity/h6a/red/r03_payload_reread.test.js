'use strict';
/**
 * SONDA ROJA R-03 — defecto G #3: relectura del payload tras la verificación.
 *
 * Regla bajo prueba (H-1 · 06):
 *   «Después de validar un artefacto firmado, ninguna decisión posterior puede
 *    depender otra vez de su representación original no confiable.»
 *
 * Control experimental: el mismo escenario con payload plano DEBE bloquear.
 * Sonda: con un accessor sobre `envelope.approval`, el resultado debe ser idéntico.
 * Si difiere, la decisión de seguridad se está tomando sobre datos no verificados.
 */
const K = require('../lib/probe_kit.js');

console.log('R-03 · reconstruccion de identidad desde el payload crudo');

const k1 = K.keypair();
const k2 = K.keypair();
const wsReg = K.workspace('r03-reg');
const registryPath = K.writeRegistry(wsReg.dir, [
  K.authority('alice', k1, ['HUMAN_AUTHORITY']),
  K.authority('alice', k2, ['INDEPENDENT_AUDITOR']),   // misma identidad, segunda clave
]);

function run(m, envelope, checkEnvelope) {
  const ws = K.workspace('r03');
  return K.executeHybridWorkflow(K.payload(m, envelope, checkEnvelope), {
    registryPath, approvalConsumptionDir: ws.consumptionDir,
    executorActorId: 'charlie', executor: () => ({ status: 0 }),
  });
}

// --- Control: payload plano. Aprobador == auditor, debe bloquear.
const mA = K.mission('AX-R03-CONTROL');
const apA = K.signApproval(mA, 'alice', k1);
const ckA = K.signCheck(mA, 'alice', k2, 'charlie', K.hashCanonical(apA.approval));
const control = run(mA, apA, ckA);
console.log(`  [ctrl] payload plano -> ${control.status}`);
if (control.status === 'VERIFIED') {
  throw new Error('CONTROL INVALIDO: el caso base ya alcanza VERIFIED; la sonda no discrimina.');
}

// --- Sonda: accessor que devuelve la aprobacion real durante la verificacion
//     y un senuelo en las lecturas posteriores del runner.
const mB = K.mission('AX-R03-ACCESSOR');
const apB = K.signApproval(mB, 'alice', k1);
const ckB = K.signCheck(mB, 'alice', k2, 'charlie', K.hashCanonical(apB.approval));

let reads = 0;
const trapped = { algorithm: 'Ed25519', signature: apB.signature };
Object.defineProperty(trapped, 'approval', {
  enumerable: true,
  configurable: true,
  get() {
    reads += 1;
    return reads <= 3 ? apB.approval : { ...apB.approval, actorId: 'nadie' };
  },
});

const probe = run(mB, trapped, ckB);
console.log(`  [sonda] lecturas de envelope.approval = ${reads}`);
K.expectBlocked('aprobador == auditor con accessor mutante', probe,
  `El runner releyo .approval.actorId tras verificar (${reads} lecturas totales).`);

if (probe.status !== control.status) {
  throw new Error(`DIVERGENCIA: payload plano -> ${control.status}, payload mutante -> ${probe.status}. `
    + 'La decision depende de la representacion original no confiable.');
}

console.log('R-03 PASS');
