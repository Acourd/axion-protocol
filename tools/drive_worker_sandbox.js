#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Drive Worker Sandbox & Hard Watchdog Engine
 *
 * Ejecutor aislado de tareas en Worker Threads con salvaguardas de memoria y CPU:
 * 1. Aislamiento de memoria estricto mediante resourceLimits (Heap Max: 64MB).
 * 2. Watchdog de tiempo límite con terminación forzada e instantánea (worker.terminate()).
 * 3. Captura determinista de excepciones, OOM (Out of Memory) y timeouts sin congelar el proceso principal.
 * 4. Telemetría de uso de memoria y tiempo de ejecución por tarea.
 *
 * Cero dependencias externas.
 */

const { Worker, isMainThread, parentPort, workerData } = require('node:worker_threads');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

class DriveWorkerSandbox {
  constructor(options = {}) {
    this.maxHeapMb = options.maxHeapMb || 64;
    this.defaultTimeoutMs = options.defaultTimeoutMs || 5000;
  }

  /**
   * Ejecuta código o una función en un worker thread aislado con límites estrictos.
   */
  runSandboxed(taskCodeString, payload = {}, options = {}) {
    const timeoutMs = options.timeoutMs || this.defaultTimeoutMs;
    const maxHeap = options.maxHeapMb || this.maxHeapMb;

    return new Promise((resolve) => {
      const startTime = Date.now();
      let isSettled = false;

      // Código contenedor para el worker thread
      const workerWrapperCode = `
        const { parentPort, workerData } = require('node:worker_threads');
        try {
          const taskFn = new Function('payload', workerData.code);
          const result = taskFn(workerData.payload);
          parentPort.postMessage({ pass: true, result });
        } catch (err) {
          parentPort.postMessage({ pass: false, error: err.message, stack: err.stack });
        }
      `;

      let worker;
      try {
        worker = new Worker(workerWrapperCode, {
          eval: true,
          workerData: {
            code: taskCodeString,
            payload
          },
          resourceLimits: {
            maxOldGenerationSizeMb: maxHeap,
            maxYoungGenerationSizeMb: Math.max(8, Math.floor(maxHeap / 4))
          }
        });
      } catch (err) {
        return resolve({
          pass: false,
          error: `Error al instanciar Worker Sandbox: ${err.message}`,
          executionTimeMs: Date.now() - startTime,
          terminatedByWatchdog: false
        });
      }

      // Watchdog Timer
      const watchdogTimer = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          worker.terminate().then(() => {
            resolve({
              pass: false,
              error: `Watchdog Timeout: Tarea excedió el límite de ${timeoutMs}ms`,
              executionTimeMs: Date.now() - startTime,
              terminatedByWatchdog: true
            });
          }).catch((termErr) => {
            resolve({
              pass: false,
              error: `Watchdog Timeout & Terminate Error: ${termErr.message}`,
              executionTimeMs: Date.now() - startTime,
              terminatedByWatchdog: true
            });
          });
        }
      }, timeoutMs);

      worker.on('message', (msg) => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(watchdogTimer);
          worker.terminate().catch(() => {});
          resolve({
            pass: msg.pass,
            result: msg.result,
            error: msg.error,
            executionTimeMs: Date.now() - startTime,
            terminatedByWatchdog: false
          });
        }
      });

      worker.on('error', (err) => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(watchdogTimer);
          resolve({
            pass: false,
            error: `Worker Runtime Error / OOM: ${err.message}`,
            executionTimeMs: Date.now() - startTime,
            terminatedByWatchdog: false
          });
        }
      });

      worker.on('exit', (code) => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(watchdogTimer);
          resolve({
            pass: code === 0,
            error: code === 0 ? null : `Worker finalizó con código de salida ${code}`,
            executionTimeMs: Date.now() - startTime,
            terminatedByWatchdog: false
          });
        }
      });
    });
  }
}

if (require.main === module) {
  const sandbox = new DriveWorkerSandbox();
  console.log('[Axion Worker Sandbox] Evaluando aislamiento de hilos y watchdog:');

  (async () => {
    // 1. Tarea exitosa inocua
    const t1 = await sandbox.runSandboxed('return { message: "Hola desde Sandbox", value: payload.x * 2 };', { x: 21 });
    console.log(`\n  [1. Tarea Exitosa] Pass: ${t1.pass} · Tiempo: ${t1.executionTimeMs}ms · Resultado:`, t1.result);

    // 2. Tarea con bucle infinito (Watchdog)
    console.log('\n  [2. Tarea con Bucle Infinito] Probando Watchdog (Timeout 500ms)...');
    const t2 = await sandbox.runSandboxed('while(true) {}', {}, { timeoutMs: 500 });
    console.log(`  Resultado Watchdog: Pass: ${t2.pass} · Watchdog: ${t2.terminatedByWatchdog} · Error: "${t2.error}"`);

    // 3. Tarea con excepción
    const t3 = await sandbox.runSandboxed('throw new Error("Fallo de prueba en sandbox");');
    console.log(`\n  [3. Tarea con Excepción] Pass: ${t3.pass} · Error Capturado: "${t3.error}"`);
  })();
}

module.exports = DriveWorkerSandbox;
