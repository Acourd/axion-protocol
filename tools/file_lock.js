#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Lock de archivo con propiedad verificable.
 *
 * Propiedades:
 * - Adquisición atómica O_EXCL con token de propietario aleatorio + PID + createdAt.
 * - Lease: el lock solo se considera huérfano si el PID dueño NO está vivo y supera
 *   el umbral de antigüedad.
 * - Recuperación por reclamación atómica (rename) y verificación de token: un dueño
 *   viejo nunca puede borrar el lock de otro proceso.
 * - Liberación condicional: solo borra si el token coincide con el propio.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function nuevoToken() {
  return crypto.randomBytes(16).toString('hex');
}

function leerLock(lockFile) {
  try {
    const parsed = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
    if (parsed && typeof parsed.token === 'string') return parsed;
    return null;
  } catch (_) {
    return null;
  }
}

/**
 * ¿El proceso existe? Un zombie en Linux cuenta como NO vivo (no puede liberar nada).
 */
function pidVivo(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  if (process.platform === 'linux') {
    try {
      const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
      const estado = stat.slice(stat.lastIndexOf(')') + 2).split(' ')[0];
      if (estado === 'Z') return false;
    } catch (_) {
      return false; // no existe (o /proc sin acceso a ese pid)
    }
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM';
  }
}

/**
 * Adquiere el lock. Devuelve { lockFile, token }.
 * Fail-closed: al agotar el timeout lanza con `code` configurable.
 */
function acquire(lockFile, options = {}) {
  const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 10000;
  const staleMs = Number.isFinite(options.staleMs) ? options.staleMs : 30000;
  const codigo = options.code || 'ERR_LOCKED';
  const deadline = Date.now() + timeoutMs;

  fs.mkdirSync(path.dirname(lockFile), { recursive: true });

  while (true) {
    const token = nuevoToken();
    try {
      const fd = fs.openSync(lockFile, 'wx', 0o600);
      fs.writeSync(fd, JSON.stringify({ token, pid: process.pid, createdAt: Date.now() }));
      fs.closeSync(fd);
      return { lockFile, token };
    } catch (err) {
      const transitorio = err.code === 'EEXIST' || err.code === 'EPERM' || err.code === 'EACCES';
      if (!transitorio) throw err;
    }

    const observado = leerLock(lockFile);
    let mtime = null;
    try {
      mtime = fs.statSync(lockFile).mtimeMs;
    } catch (_) {
      // el lock desapareció entre el open y el stat
    }
    // Un lock ilegible (p. ej. recién creado y aún sin escribir) solo se reclama cuando
    // su mtime es realmente antiguo: reclamarlo fresco abriría la sección crítica a dos
    // procesos. La antigüedad se toma como el máximo entre mtime y createdAt.
    const edadMtime = mtime !== null ? Date.now() - mtime : 0;
    const edadCreatedAt = observado ? Date.now() - observado.createdAt : 0;
    const antiguedad = Math.max(edadMtime, edadCreatedAt);
    const dueñoVivo = observado ? pidVivo(observado.pid) : false;

    if (!dueñoVivo && antiguedad > staleMs) {
      // Reclamación atómica: se mueve el lock observado a una ruta de reclamación y
      // solo se destruye si su token sigue siendo el observado. Si otro proceso lo
      // recreó en el intermedio, se restaura y se reintenta.
      const claim = `${lockFile}.claim-${process.pid}-${token}`;
      try {
        fs.renameSync(lockFile, claim);
      } catch (_) {
        sleepSync(15 + Math.floor(Math.random() * 20));
        continue;
      }
      const reclamado = leerLock(claim);
      const esElObservado = !observado || (reclamado && reclamado.token === observado.token);
      if (esElObservado) {
        try {
          fs.unlinkSync(claim);
        } catch (_) {
          // el archivo reclamado ya no existe
        }
      } else {
        try {
          fs.renameSync(claim, lockFile);
        } catch (_) {
          // otro proceso ya había creado un lock nuevo: el reclamado se descarta
          try { fs.unlinkSync(claim); } catch (_) { /* limpieza best-effort */ }
        }
      }
      continue;
    }

    if (Date.now() >= deadline) {
      const err = new Error(`No se pudo adquirir el lock ${path.basename(lockFile)} en ${timeoutMs}ms (dueño=${observado ? observado.pid : 'desconocido'}).`);
      err.code = codigo;
      err.owner = observado;
      throw err;
    }
    sleepSync(15 + Math.floor(Math.random() * 20));
  }
}

/**
 * Liberación condicional y atómica por token:
 * 1. rename del lock a una ruta de reclamo (nadie más puede borrarlo entre medias).
 * 2. verificación del token del archivo reclamado.
 * 3. solo si es el propio se elimina; si lo reemplazaron, se restaura.
 * Un lock nuevo jamás se borra desde un dueño viejo.
 */
function release(lockFile, token) {
  const claim = `${lockFile}.release-${process.pid}-${token}`;
  try {
    fs.renameSync(lockFile, claim);
  } catch (_) {
    return false; // ya no existe o no es reclamable
  }

  const reclamado = leerLock(claim);
  if (reclamado && reclamado.token === token) {
    try {
      fs.unlinkSync(claim);
    } catch (_) {
      // el reclamo ya no existe
    }
    return true;
  }

  // El archivo reclamado pertenece a otro dueño (nos adelantó un reemplazo): restaurarlo.
  try {
    if (!fs.existsSync(lockFile)) fs.renameSync(claim, lockFile);
    else fs.unlinkSync(claim);
  } catch (_) {
    // limpieza best-effort
  }
  return false;
}

function withLock(lockFile, fn, options = {}) {
  const lock = acquire(lockFile, options);
  try {
    return fn(lock);
  } finally {
    release(lock.lockFile, lock.token);
  }
}

module.exports = { acquire, release, withLock, leerLock, pidVivo, sleepSync, nuevoToken };
