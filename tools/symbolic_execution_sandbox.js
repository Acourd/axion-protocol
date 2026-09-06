#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Symbolic Execution Sandbox & Fail-Closed Containment (M_SEC_012)
 *
 * Módulo de aislamiento transaccional y ejecución simbólica para /drive:
 * 1. Aislamiento transaccional en memoria: captura y valida mutaciones antes de tocar disco.
 * 2. Contención estricta de Path Traversal (boundary checking inviolable).
 * 3. Protección de archivos nucleares de gobernanza (policies, state, package.json, hooks).
 * 4. Intercepción de comandos destructivos y llamadas a procesos de alto riesgo.
 * 5. Rollback atómico instantáneo con descarte determinista de buffers en memoria.
 * 6. Emisión de SandboxAuditReport_v1 con sellado criptográfico SHA-256.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

const DESTRUCTIVE_COMMAND_PATTERNS = [
  /\brm\s+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r)\s+/i,
  /\bformat\s+[a-zA-Z]:/i,
  /\bdd\s+if=/i,
  /\bmkfs(\.[a-z0-9]+)?\s+/i,
  /\bgit\s+push.*--force\b/i,
  /\b(shutdown|reboot|init\s+0|halt)\b/i,
  /\bdel\s+(\/[fsq]\s+)+/i
];

const PROTECTED_GOVERNANCE_PATTERNS = [
  /^package\.json$/i,
  /^policies[\/\\].*\.ya?ml$/i,
  /^\.axion[\/\\]state[\/\\].*\.json$/i,
  /^\.git[\/\\]hooks[\/\\].*$/i
];

class SymbolicExecutionSandbox {
  constructor(options = {}) {
    this.workspaceRoot = path.resolve(options.workspaceRoot || ROOT);
    this.allowGovernanceMutation = options.allowGovernanceMutation || false;
    this.buffers = new Map();
    this.auditLog = [];
  }

  /**
   * Resuelve y valida estrictamente que la ruta resida dentro del workspace asignado.
   */
  resolveAndValidatePath(targetPath) {
    if (!targetPath || typeof targetPath !== 'string') {
      const err = new Error('Ruta inválida o indefinida');
      err.code = 'ERR_INVALID_PATH';
      throw err;
    }

    const resolved = path.isAbsolute(targetPath)
      ? path.resolve(targetPath)
      : path.resolve(this.workspaceRoot, targetPath);

    const rel = path.relative(this.workspaceRoot, resolved);

    // Detección de Path Traversal: si el camino relativo empieza por .. o es absoluto
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      this.auditLog.push({
        action: 'PATH_TRAVERSAL_BLOCKED',
        path: targetPath,
        resolved,
        timestamp: Date.now()
      });
      const err = new Error(`Path Traversal detectado fuera del workspace: ${targetPath}`);
      err.code = 'ERR_PATH_TRAVERSAL';
      throw err;
    }

    const normalizedRel = rel.replace(/\\/g, '/');

    // Validación de archivos protegidos de gobernanza
    if (!this.allowGovernanceMutation) {
      for (const pattern of PROTECTED_GOVERNANCE_PATTERNS) {
        if (pattern.test(normalizedRel)) {
          this.auditLog.push({
            action: 'PROTECTED_FILE_MUTATION_BLOCKED',
            path: normalizedRel,
            timestamp: Date.now()
          });
          const err = new Error(`Mutación no autorizada sobre archivo de gobernanza protegido: ${normalizedRel}`);
          err.code = 'ERR_PROTECTED_GOVERNANCE_FILE';
          throw err;
        }
      }
    }

    return { resolved, rel: normalizedRel };
  }

  /**
   * Escribe en el buffer transaccional en memoria sin tocar el disco físico.
   */
  writeFile(targetPath, content) {
    const { rel, resolved } = this.resolveAndValidatePath(targetPath);
    const contentStr = typeof content === 'string' ? content : String(content);

    this.buffers.set(rel, {
      content: contentStr,
      resolved,
      timestamp: Date.now()
    });

    this.auditLog.push({
      action: 'BUFFER_WRITE',
      path: rel,
      bytes: Buffer.byteLength(contentStr, 'utf8'),
      timestamp: Date.now()
    });

    return true;
  }

  /**
   * Lee desde el buffer en memoria si existe, o desde disco si no ha sido mutado.
   */
  readFile(targetPath) {
    const { rel, resolved } = this.resolveAndValidatePath(targetPath);

    if (this.buffers.has(rel)) {
      return this.buffers.get(rel).content;
    }

    if (!fs.existsSync(resolved)) {
      const err = new Error(`Archivo no encontrado: ${rel}`);
      err.code = 'ENOENT';
      throw err;
    }

    return fs.readFileSync(resolved, 'utf8');
  }

  /**
   * Verifica si un archivo reside actualmente en el buffer de memoria.
   */
  hasBuffered(targetPath) {
    try {
      const { rel } = this.resolveAndValidatePath(targetPath);
      return this.buffers.has(rel);
    } catch (_) {
      // Ignorar error de validación en consulta booleana
      return false;
    }
  }

  /**
   * Devuelve el número de mutaciones pendientes en el buffer.
   */
  getPendingMutationsCount() {
    return this.buffers.size;
  }

  /**
   * Valida si un comando de shell es seguro para ejecutar dentro del sandbox.
   */
  validateCommand(commandLine) {
    if (!commandLine || typeof commandLine !== 'string') {
      return { allowed: false, verdict: 'BLOCKED_INVALID', reason: 'Comando nulo o no string' };
    }

    for (const pattern of DESTRUCTIVE_COMMAND_PATTERNS) {
      if (pattern.test(commandLine)) {
        this.auditLog.push({
          action: 'COMMAND_BLOCKED',
          command: commandLine,
          reason: 'DESTRUCTIVE_PATTERN',
          timestamp: Date.now()
        });
        return {
          allowed: false,
          verdict: 'BLOCKED_DESTRUCTIVE',
          reason: 'Patrón de comando destructivo o irreversible interceptado'
        };
      }
    }

    this.auditLog.push({
      action: 'COMMAND_ALLOWED',
      command: commandLine,
      timestamp: Date.now()
    });

    return { allowed: true, verdict: 'ALLOWED_SAFE' };
  }

  /**
   * Rollback atómico: descarta todas las mutaciones buferizadas en memoria.
   */
  rollback() {
    const count = this.buffers.size;
    this.buffers.clear();
    this.auditLog.push({
      action: 'ROLLBACK_EXECUTED',
      discardedCount: count,
      timestamp: Date.now()
    });
    return { rolledBack: true, discardedCount: count };
  }

  /**
   * Commit: materializa las mutaciones del buffer en el disco físico.
   */
  commit() {
    const committed = [];
    for (const [rel, item] of this.buffers.entries()) {
      const dir = path.dirname(item.resolved);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(item.resolved, item.content, 'utf8');
      committed.push(rel);
    }

    this.buffers.clear();
    this.auditLog.push({
      action: 'COMMIT_EXECUTED',
      committedFiles: committed,
      timestamp: Date.now()
    });

    return { committed: true, count: committed.length, files: committed };
  }

  /**
   * Emite el reporte de auditoría sellado con SHA-256.
   */
  getAuditReport() {
    const reportPayload = {
      reportType: 'SandboxAuditReport_v1',
      workspaceRoot: this.workspaceRoot,
      totalOperationsAudited: this.auditLog.length,
      pendingMutations: this.buffers.size,
      auditLog: this.auditLog,
      timestamp: new Date().toISOString()
    };

    const canonicalJson = JSON.stringify(reportPayload, Object.keys(reportPayload).sort());
    const reportDigest = crypto.createHash('sha256').update(canonicalJson).digest('hex');

    return {
      ...reportPayload,
      reportDigest
    };
  }
}

module.exports = SymbolicExecutionSandbox;
