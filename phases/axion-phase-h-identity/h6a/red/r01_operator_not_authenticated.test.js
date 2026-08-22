'use strict';
/**
 * SONDA ROJA R-01 — defecto G #1: identidad de operador/ejecutor no autenticada.
 *
 * Invariante bajo prueba (adjudicación D-06):
 *     operator_principal != approver_principal
 *
 * El aprobador `alice` es también quien ejecuta. Se limita a declarar otro
 * `executorActorId`. Si el sistema no autentica esa identidad, la invariante se
 * evalúa contra una cadena elegida por el atacante.
 */
const K = require('../lib/probe_kit.js');

console.log('R-01 · operador == aprobador con identidad de ejecutor autodeclarada');

// --- Control positivo: la sonda debe poder distinguir. Con tres identidades
//     distintas el flujo legitimo tiene que completarse.
{
  const ws = K.workspace('r01-ctrl');
  const approver = K.keypair();
  const auditor = K.keypair();
  const registryPath = K.writeRegistry(ws.dir, [
    K.authority('alice', approver, ['HUMAN_AUTHORITY']),
    K.authority('bob', auditor, ['INDEPENDENT_AUDITOR']),
  ]);
  const m = K.mission('AX-R01-CONTROL');
  const ap = K.signApproval(m, 'alice', approver);
  const ck = K.signCheck(m, 'bob', auditor, 'charlie', K.hashCanonical(ap.approval));
  const r = K.executeHybridWorkflow(K.payload(m, ap, ck), {
    registryPath, approvalConsumptionDir: ws.consumptionDir,
    executorActorId: 'charlie', executor: () => ({ status: 0 }),
  });
  console.log(`  [ctrl] tres identidades distintas -> ${r.status}`);
  if (r.status !== 'VERIFIED') {
    throw new Error(`CONTROL INVALIDO: el caso legitimo dio ${r.status}; la sonda no discrimina.`);
  }
}

const alias = [
  'axion-runtime-01',
  'no-existe-en-el-registro',
  'x',
  'alice ',            // mismo nombre con espacio final
  'аlice',        // homoglifo cirílico de "alice"
];

for (const declared of alias) {
  const ws = K.workspace('r01');
  const approver = K.keypair();
  const auditor = K.keypair();
  const registryPath = K.writeRegistry(ws.dir, [
    K.authority('alice', approver, ['HUMAN_AUTHORITY']),
    K.authority('bob', auditor, ['INDEPENDENT_AUDITOR']),
  ]);
  const m = K.mission(`AX-R01-${K.crypto.randomBytes(3).toString('hex')}`);
  const ap = K.signApproval(m, 'alice', approver);
  const ck = K.signCheck(m, 'bob', auditor, declared, K.hashCanonical(ap.approval));

  const r = K.executeHybridWorkflow(K.payload(m, ap, ck), {
    registryPath,
    approvalConsumptionDir: ws.consumptionDir,
    executorActorId: declared,
    executor: () => ({ status: 0 }),
  });

  K.expectBlocked(
    `aprobador alice ejecuta declarandose ${JSON.stringify(declared)}`,
    r,
    'executorActorId procede de runtimeContext y no de una atestacion firmada.',
  );
}

console.log('R-01 PASS');
