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
const fs = require('fs');

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * Estado del proceso en Linux (`/proc/<pid>/stat`), o null si no existe.
 * Un proceso en estado Z (zombie/defunct) ya no ejecuta nada: no está vivo a
 * efectos de limpieza, aunque `kill(pid, 0)` siga respondiendo.
 */
function estadoLinux(pid) {
  if (process.platform !== 'linux' || !Number.isInteger(pid) || pid <= 0) return null;
  try {
    const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
    return stat.slice(stat.lastIndexOf(')') + 2).split(' ')[0];
  } catch (_) {
    return null;
  }
}

function estaVivo(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  const estado = estadoLinux(pid);
  if (estado === 'Z') return false;
  if (estado === null && process.platform === 'linux') return false;
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
  const reapMs = Number.isFinite(options.reapMs) ? options.reapMs : 2000;
  if (!child || typeof child.pid !== 'number') {
    return { attempted: false, method: 'NONE', reason: 'sin pid' };
  }

  const esperarSalida = (metodo, limiteMs) => {
    const deadline = Date.now() + limiteMs;
    while (Date.now() < deadline) {
      if (child.exitCode !== null || child.signalCode !== null || !estaVivo(child.pid)) {
        return { attempted: true, method: metodo, ok: true };
      }
      sleepSync(25);
    }
    return { attempted: true, method: metodo, ok: !estaVivo(child.pid) };
  };

  if (process.platform === 'win32') {
    const r = spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
      shell: false
    });
    const salida = esperarSalida('taskkill/T/F', reapMs);
    return { ...salida, status: r.status };
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
    if (child.exitCode !== null || child.signalCode !== null || !estaVivo(child.pid)) {
      return { attempted: true, method: 'SIGTERM', ok: true, sigterm };
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
  const salida = esperarSalida('SIGKILL', reapMs);
  return { ...salida, ok: salida.ok && (sigkill || !estaVivo(child.pid)), sigterm };
}

module.exports = { killTree, estaVivo, sleepSync };
