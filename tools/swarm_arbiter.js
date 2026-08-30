#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Sovereign Swarm Arbiter & State Lock Engine
 *
 * Árbitro de sincronización, exclusión mutua distribuida y consenso para /drive:
 * 1. Adquisición atómica de bloqueos sobre recursos (acquireLock).
 * 2. Liberación segura y validación de propiedad (releaseLock).
 * 3. Prevención de condiciones de carrera entre subagentes concurrentes.
 * 4. Detección y poda automática de bloqueos huérfanos por TTL (pruneExpiredLocks).
 * 5. Persistencia y registro de estado en .axion/state/swarm-locks.json.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

class SwarmArbiter {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
    this.stateDir = path.join(this.root, '.axion', 'state');
    if (!fs.existsSync(this.stateDir)) {
      fs.mkdirSync(this.stateDir, { recursive: true });
    }
    this.locksFile = path.join(this.stateDir, 'swarm-locks.json');
    this.locks = new Map();
    this._loadLocks();
  }

  _loadLocks() {
    if (fs.existsSync(this.locksFile)) {
      try {
        const raw = JSON.parse(fs.readFileSync(this.locksFile, 'utf8'));
        if (Array.isArray(raw)) {
          raw.forEach(l => {
            if (l && l.resource) {
              this.locks.set(l.resource, l);
            }
          });
        }
      } catch (readErr) {
        // Fallback ante archivo no parseable
      }
    }
  }

  _saveLocks() {
    const list = Array.from(this.locks.values());
    fs.writeFileSync(this.locksFile, JSON.stringify(list, null, 2), 'utf8');
  }

  /**
   * Intenta adquirir un bloqueo atómico sobre un recurso.
   */
  acquireLock(agentId, resourcePath, ttlMs = 30000) {
    this.pruneExpiredLocks();
    const normalizedResource = path.normalize(resourcePath).replace(/\\/g, '/');

    if (this.locks.has(normalizedResource)) {
      const existing = this.locks.get(normalizedResource);
      if (existing.agentId !== agentId) {
        return {
          acquired: false,
          reason: 'CONFLICT',
          resource: normalizedResource,
          heldBy: existing.agentId,
          expiresAt: existing.expiresAt,
          message: `El recurso '${normalizedResource}' está bloqueado por el agente '${existing.agentId}'`
        };
      }
      // Re-adquisición o extensión de lease
      existing.expiresAt = new Date(Date.now() + ttlMs).toISOString();
      this._saveLocks();
      return { acquired: true, extended: true, lock: existing };
    }

    const lock = {
      resource: normalizedResource,
      agentId,
      acquiredAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + ttlMs).toISOString(),
      token: crypto.randomBytes(16).toString('hex')
    };

    this.locks.set(normalizedResource, lock);
    this._saveLocks();

    return {
      acquired: true,
      extended: false,
      lock,
      message: `✓ Bloqueo adquirido para '${agentId}' sobre '${normalizedResource}'`
    };
  }

  /**
   * Libera un bloqueo adquirido previamente.
   */
  releaseLock(agentId, resourcePath, token = null) {
    const normalizedResource = path.normalize(resourcePath).replace(/\\/g, '/');
    if (!this.locks.has(normalizedResource)) {
      return { released: false, reason: 'NOT_LOCKED', message: `El recurso '${normalizedResource}' no estaba bloqueado.` };
    }

    const existing = this.locks.get(normalizedResource);
    if (existing.agentId !== agentId) {
      return {
        released: false,
        reason: 'UNAUTHORIZED',
        message: `El agente '${agentId}' no es dueño del bloqueo sobre '${normalizedResource}' (dueño: '${existing.agentId}')`
      };
    }

    if (token && existing.token !== token) {
      return { released: false, reason: 'INVALID_TOKEN', message: 'Token de liberación inválido.' };
    }

    this.locks.delete(normalizedResource);
    this._saveLocks();
    return { released: true, message: `✓ Bloqueo liberado sobre '${normalizedResource}'` };
  }

  /**
   * Poda automáticamente bloqueos expirados.
   */
  pruneExpiredLocks() {
    const now = Date.now();
    let prunedCount = 0;

    for (const [res, lock] of this.locks.entries()) {
      if (new Date(lock.expiresAt).getTime() <= now) {
        this.locks.delete(res);
        prunedCount++;
      }
    }

    if (prunedCount > 0) {
      this._saveLocks();
    }
    return { prunedCount, activeLocksCount: this.locks.size };
  }

  /**
   * Devuelve la lista de bloqueos activos.
   */
  listLocks() {
    this.pruneExpiredLocks();
    return Array.from(this.locks.values());
  }
}

if (require.main === module) {
  const arbiter = new SwarmArbiter();
  const args = process.argv.slice(2);

  if (args.includes('list') || args.length === 0) {
    const locks = arbiter.listLocks();
    console.log(`[Axion Swarm Arbiter] ${locks.length} bloqueo(s) activo(s) en el enjambre:\n`);
    if (locks.length === 0) {
      console.log('  (Sin bloqueos activos. Todos los recursos están libres)');
    } else {
      locks.forEach(l => console.log(`  - [${l.agentId}] ${l.resource} (Expira: ${l.expiresAt})`));
    }
  } else if (args[0] === 'lock' && args.length >= 3) {
    const res = arbiter.acquireLock(args[1], args[2]);
    console.log(res.message);
    process.exit(res.acquired ? 0 : 1);
  } else if (args[0] === 'release' && args.length >= 3) {
    const res = arbiter.releaseLock(args[1], args[2]);
    console.log(res.message);
    process.exit(res.released ? 0 : 1);
  }
}

module.exports = SwarmArbiter;
