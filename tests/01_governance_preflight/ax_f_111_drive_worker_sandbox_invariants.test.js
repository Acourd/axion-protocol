'use strict';

/**
 * Axion Protocol — Invariantes del Sandbox de Aislamiento de Memoria y Watchdog de Worker Threads.
 *
 * Valida de forma estricta:
 * 1. Ejecución aislada de tareas en hilos de trabajo independientes (Worker Threads).
 * 2. Intercepción forzada y terminación determinista por Watchdog ante bucles infinitos.
 * 3. Captura determinista de errores en runtime sin afectar el hilo principal.
 * 4. Integración asíncrona con DriveEngine.
 */

const assert = require('assert');
const path = require('path');
const DriveWorkerSandbox = require('../../tools/drive_worker_sandbox.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-111 Invariantes del Sandbox de Aislamiento de Memoria y Watchdog ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sandbox = new DriveWorkerSandbox({ maxHeapMb: 32, defaultTimeoutMs: 5000 });

(async () => {
  // 1. Validar tarea exitosa
  const res1 = await sandbox.runSandboxed('return { doubled: payload.num * 2, status: "OK" };', { num: 21 });
  assert.strictEqual(res1.pass, true, 'Tarea inocua debe pasar');
  assert.strictEqual(res1.result.doubled, 42, 'Resultado debe coincidir');
  assert.strictEqual(res1.terminatedByWatchdog, false, 'No debe ser terminada por watchdog');
  console.log(`✓ Tarea aislada ejecutada exitosamente (${res1.executionTimeMs}ms)`);

  // 2. Validar intercepción de bucle infinito por Watchdog
  const res2 = await sandbox.runSandboxed('while(true) {}', {}, { timeoutMs: 300 });
  assert.strictEqual(res2.pass, false, 'Bucle infinito debe fallar');
  assert.strictEqual(res2.terminatedByWatchdog, true, 'Debe ser marcada como terminada por watchdog');
  assert.ok(res2.error.includes('Watchdog Timeout'), 'Error debe contener mensaje de timeout');
  console.log('✓ Watchdog interceptó y terminó bucle infinito forzadamente sin congelar el runtime');

  // 3. Validar captura de excepciones
  const res3 = await sandbox.runSandboxed('throw new Error("Violación de invariante simulada");');
  assert.strictEqual(res3.pass, false, 'Excepción debe registrar pass: false');
  assert.ok(res3.error.includes('Violación de invariante simulada'), 'Error debe capturarse limpiamente');
  console.log('✓ Excepción interna del worker capturada sin romper el hilo principal');

  // 4. Validar integración con DriveEngine
  const driveEngine = new DriveEngine(ROOT);
  const driveRes = await driveEngine.runSandboxedTask('return { engine: "Axion", verified: true };', {});
  assert.strictEqual(driveRes.pass, true, 'DriveEngine debe ejecutar tareas en sandbox');
  assert.strictEqual(driveRes.result.engine, 'Axion');
  console.log('✓ Integración con DriveEngine.runSandboxedTask() verificada');

  console.log('\nPASS AX-F-111 — Invariantes de aislamiento en Worker Sandbox y Watchdog verificados al 100%.');
})();
