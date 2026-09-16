#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Drive Worker Runner (Capacidad de ejecución arbitraria DESHABILITADA)
 *
 * ADVERTENCIA DE SEGURIDAD (NO ES UN SANDBOX DE SEGURIDAD):
 * Un Worker Thread NO aísla del host: comparte proceso, filesystem, variables de
 * entorno, `process`, `require`, red y CPU. Los `resourceLimits` solo acotan memoria
 * del heap; no confinan efectos. Por eso este módulo ya NO acepta ni ejecuta
 * JavaScript arbitrario (`new Function`, `eval`, `Worker(..., { eval: true })`).
 *
 * Estado fail-closed: `runSandboxed` siempre responde `SANDBOX_UNAVAILABLE` sin
 * ejecutar una sola línea del payload. La ejecución de código de terceros requiere
 * aislamiento real de proceso/contenedor/VM, que este proyecto no provee todavía.
 *
 * Cero dependencias externas.
 */

const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const UNAVAILABLE_REASON = 'NO_REAL_ISOLATION: Worker threads comparten host (filesystem, process, env, require, red). ' +
  'La ejecución de JavaScript arbitrario está deshabilitada fail-closed hasta disponer de aislamiento de proceso/contenedor/VM.';

class DriveWorkerSandbox {
  constructor(options = {}) {
    this.maxHeapMb = options.maxHeapMb || 64;
    this.defaultTimeoutMs = options.defaultTimeoutMs || 5000;
  }

  /**
   * ¿Existe aislamiento real de proceso/contenedor/VM? Hoy no.
   */
  isAvailable() {
    return {
      available: false,
      status: 'SANDBOX_UNAVAILABLE',
      reason: UNAVAILABLE_REASON
    };
  }

  /**
   * Rechaza la ejecución de código arbitrario de forma explícita y sin efectos.
   * No se acepta `taskCodeString`, no se instancia ningún Worker, no se evalúa nada.
   */
  runSandboxed(taskCodeString, payload = {}, options = {}) {
    const rejectedBytes = typeof taskCodeString === 'string' ? Buffer.byteLength(taskCodeString, 'utf8') : 0;
    void payload;
    void options;

    return Promise.resolve({
      pass: false,
      executed: false,
      status: 'SANDBOX_UNAVAILABLE',
      error: `${UNAVAILABLE_REASON} (payload rechazado: ${rejectedBytes} bytes)`,
      executionTimeMs: 0,
      terminatedByWatchdog: false
    });
  }
}

if (require.main === module) {
  const sandbox = new DriveWorkerSandbox();
  const state = sandbox.isAvailable();
  console.log('[Axion Worker Runner] Estado de aislamiento:');
  console.log(`  Disponible: ${state.available}`);
  console.log(`  Estado:     ${state.status}`);
  console.log(`  Motivo:     ${state.reason}`);
  console.log('  Capacidad de ejecución arbitraria: DESHABILITADA (fail-closed).');
}

module.exports = DriveWorkerSandbox;
