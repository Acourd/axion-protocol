#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Terminación portable de árboles de procesos.
 *
 * - Windows: `taskkill /PID <pid> /T /F` (termina el árbol completo, sin shell).
 * - POSIX: el hijo se lanza en su propio grupo (detached) y se señala al grupo
 *   (-pid) con SIGTERM, escalando a SIGKILL tras el periodo de gracia.
 *
 * Sin dependencias externas y sin `shell`.
 */

const { spawnSync } = require('child_process');

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function estaVivo(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM';
  }
}

/**
 * Termina el proceso y todos sus descendientes. Devuelve el método empleado.
 */
function killTree(child, options = {}) {
  const graceMs = Number.isFinite(options.graceMs) ? options.graceMs : 400;
  if (!child || typeof child.pid !== 'number') {
    return { attempted: false, method: 'NONE', reason: 'sin pid' };
  }

  if (process.platform === 'win32') {
    const r = spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
      shell: false
    });
    return { attempted: true, method: 'taskkill/T/F', ok: r.status === 0, status: r.status };
  }

  let sigterm = true;
  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch (_) {
    sigterm = false;
    try {
      child.kill('SIGTERM');
    } catch (_) {
      // el proceso ya no existe
    }
  }

  const deadline = Date.now() + graceMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) {
      return { attempted: true, method: 'SIGTERM', ok: true };
    }
    sleepSync(25);
  }

  let sigkill = true;
  try {
    process.kill(-child.pid, 'SIGKILL');
  } catch (_) {
    sigkill = false;
    try {
      child.kill('SIGKILL');
    } catch (_) {
      // ya terminado
    }
  }
  return { attempted: true, method: 'SIGKILL', ok: sigkill || !estaVivo(child.pid), sigterm };
}

module.exports = { killTree, estaVivo, sleepSync };
