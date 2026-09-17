'use strict';

/**
 * Axion Protocol — Invariantes del Runner de Workers: capacidad deshabilitada fail-closed.
 *
 * El antiguo "sandbox" de Worker Threads NO aislaba del host (filesystem, process, env,
 * require, red). La corrección P0-B elimina la ejecución de JavaScript arbitrario:
 *
 * 1. `runSandboxed` rechaza cualquier payload sin evaluar una sola línea.
 * 2. Payloads que intentan leer archivos, acceder a `process`, cargar módulos o
 *    ejecutar comandos no producen efecto alguno.
 * 3. El estado es explícito (`SANDBOX_UNAVAILABLE`), nunca un PASS.
 * 4. Integración con DriveEngine hereda el mismo rechazo.
 */

const assert = require('assert');
const { crearSandbox } = require('../../tools/test_sandbox.js');
const path = require('path');
const fs = require('fs');
const DriveWorkerSandbox = require('../../tools/drive_worker_sandbox.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-111 Runner de Workers: rechazo fail-closed de ejecución arbitraria ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sandbox = new DriveWorkerSandbox({ maxHeapMb: 32, defaultTimeoutMs: 5000 });
const markerPath = path.join(crearSandbox('sandbox-marker'), 'sandbox.txt');

(async () => {
  // 1. Estado explícito: no hay aislamiento real disponible.
  const state = sandbox.isAvailable();
  assert.strictEqual(state.available, false, 'El runner no debe declararse disponible');
  assert.strictEqual(state.status, 'SANDBOX_UNAVAILABLE');
  assert.ok(state.reason.includes('NO_REAL_ISOLATION'));
  console.log('✓ Estado explicitado: SANDBOX_UNAVAILABLE (sin aislamiento real)');

  // 2. Payload inocuo: tampoco se ejecuta. No hay excepciones "de confianza".
  const inocuo = await sandbox.runSandboxed('return payload.num * 2;', { num: 21 });
  assert.strictEqual(inocuo.pass, false);
  assert.strictEqual(inocuo.executed, false);
  assert.strictEqual(inocuo.result, undefined);
  assert.strictEqual(inocuo.status, 'SANDBOX_UNAVAILABLE');
  console.log('✓ Payload inocuo rechazado sin ejecución (executed: false)');

  // 3. Adversarial: escritura de archivos por `require('fs')` bloqueada antes de ejecutarse.
  const writePayload = `
    const fs = require('fs');
    fs.writeFileSync(${JSON.stringify(markerPath)}, 'ejecutado');
    return 'escrito';
  `;
  const escritura = await sandbox.runSandboxed(writePayload, {});
  assert.strictEqual(escritura.pass, false);
  assert.strictEqual(escritura.executed, false);
  assert.strictEqual(fs.existsSync(markerPath), false, 'El payload no debe haber creado el marcador');
  console.log('✓ Payload de escritura de archivos bloqueado sin efecto en disco');

  // 4. Adversarial: acceso a process/env y ejecución de comandos bloqueados.
  const processPayload = `return process.env.PATH + require('child_process').execSync('echo pwned');`;
  const processRes = await sandbox.runSandboxed(processPayload, {});
  assert.strictEqual(processRes.pass, false);
  assert.strictEqual(processRes.executed, false);
  assert.strictEqual(processRes.result, undefined);
  console.log('✓ Payload con process/child_process bloqueado sin evaluación');

  // 5. Adversarial: bucle infinito -> sin watchdog porque no hay ejecución.
  const infinito = await sandbox.runSandboxed('while(true) {}', {}, { timeoutMs: 50 });
  assert.strictEqual(infinito.pass, false);
  assert.strictEqual(infinito.executed, false);
  assert.strictEqual(infinito.terminatedByWatchdog, false, 'Sin ejecución no hay watchdog que dispare');
  console.log('✓ Payload de bucle infinito rechazado sin gasto de CPU');

  // 6. Integración con DriveEngine: mismo rechazo fail-closed.
  const driveEngine = new DriveEngine(ROOT);
  const driveRes = await driveEngine.runSandboxedTask('return { engine: "Axion" };', {}, { timeoutMs: 50 });
  assert.strictEqual(driveRes.pass, false);
  assert.strictEqual(driveRes.executed, false);
  assert.strictEqual(driveRes.status, 'SANDBOX_UNAVAILABLE');
  console.log('✓ Integración DriveEngine.runSandboxedTask() rechaza igual (fail-closed)');

  console.log('\nPASS AX-F-111 — Rechazo fail-closed de ejecución arbitraria verificado al 100%.');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
