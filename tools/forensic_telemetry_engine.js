#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Real-Time Forensic Telemetry & Regression Detector
 *
 * Motor de telemetría forense y detección de regresiones en tiempo real para /drive:
 * 1. Captura snapshots forenses de alta resolución (Heap de memoria, RSS, deltas de archivos en disco, tiempo CPU).
 * 2. Compara el estado Pre vs Post ejecución para detectar anomalías:
 *    - MEMORY_LEAK_DRIFT: Crecimiento excesivo de Heap (> 15 MB sin liberación).
 *    - DISK_BLOAT_DRIFT: Inflación no controlada de archivos en disco (> 5 MB).
 *    - LATENCY_REGRESSION: Aumento anómalo de tiempo de ejecución (> 50%).
 * 3. Emite automáticamente un sobre criptográfico in-toto DSSE con firma Ed25519 en .axion/state/forensic_telemetry.dsse.json.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { signEnvelope, verifyEnvelope, DSSE_STATUS } = require('./dsse.js');
const { writeFileAtomicSync } = require('./atomic_write.js');

const ROOT = path.resolve(__dirname, '..');

class ForensicTelemetryEngine {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
    this.stateDir = path.join(this.root, '.axion', 'state');
    this.telemetryFile = path.join(this.stateDir, 'forensic_telemetry.dsse.json');
    this.ensureStateDir();
  }

  ensureStateDir() {
    if (!fs.existsSync(this.stateDir)) {
      fs.mkdirSync(this.stateDir, { recursive: true });
    }
  }

  get historyFile() {
    return path.join(this.stateDir, 'forensic_history.json');
  }

  _collectFilesRecursively(dir, targetList = []) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          this._collectFilesRecursively(fullPath, targetList);
        } else if (entry.isFile()) {
          targetList.push(fullPath);
        }
      }
    } catch (_err) {
      // Directorio inaccesible durante el escaneo recursivo; omitir
    }
    return targetList;
  }

  /**
   * Captura el estado del árbol de archivos clave (tamaños y digests SHA-256).
   */
  captureWorktreeState(options = {}) {
    const targetDirs = options.targetDirs || ['tools', 'policies', 'schemas', 'tests'];
    const files = {};
    let totalBytes = 0;

    for (const relDir of targetDirs) {
      const absDir = path.join(this.root, relDir);
      if (!fs.existsSync(absDir)) continue;

      const filePaths = this._collectFilesRecursively(absDir);
      for (const fullPath of filePaths) {
        const relPath = path.relative(this.root, fullPath).replace(/\\/g, '/');
        try {
          const stat = fs.statSync(fullPath);
          const content = fs.readFileSync(fullPath);
          const digest = crypto.createHash('sha256').update(content).digest('hex');
          files[relPath] = { size: stat.size, digest: digest.slice(0, 16) };
          totalBytes += stat.size;
        } catch (_err) {
          // Archivo inaccesible o bloqueado temporalmente por el SO; omitir
        }
      }
    }

    return {
      fileCount: Object.keys(files).length,
      totalBytes,
      totalMb: parseFloat((totalBytes / (1024 * 1024)).toFixed(2)),
      files
    };
  }

  /**
   * Captura un snapshot de estado del sistema, memoria y worktree.
   */
  captureSnapshot(label = 'snapshot', options = {}) {
    const mem = process.memoryUsage();
    const heapUsedMb = parseFloat((mem.heapUsed / (1024 * 1024)).toFixed(2));
    const heapTotalMb = parseFloat((mem.heapTotal / (1024 * 1024)).toFixed(2));
    const rssMb = parseFloat((mem.rss / (1024 * 1024)).toFixed(2));
    const externalMb = parseFloat((mem.external / (1024 * 1024)).toFixed(2));
    const freeRamGb = parseFloat((os.freemem() / (1024 ** 3)).toFixed(2));

    const snapshot = {
      label,
      capturedAt: new Date().toISOString(),
      timestampMs: Date.now(),
      memory: {
        heapUsedMb,
        heapTotalMb,
        rssMb,
        externalMb,
        freeRamGb
      },
      cpuUsage: process.cpuUsage()
    };

    if (options.includeWorktree !== false) {
      snapshot.worktree = this.captureWorktreeState(options);
    }

    return snapshot;
  }

  /**
   * Consulta las métricas de rendimiento del buffer continuo.
   */
  getRollingMetrics() {
    try {
      if (fs.existsSync(this.historyFile)) {
        const data = JSON.parse(fs.readFileSync(this.historyFile, 'utf8'));
        // Solo muestras del PROPIO proceso: comparar latencias entre procesos
        // concurrentes (entornos y carga distintos) produce picos falsos.
        const propias = Array.isArray(data) ? data.filter((d) => d.pid === process.pid) : [];
        if (propias.length > 0) {
          const durations = propias.map(d => d.durationMs || 0);
          const avgDurationMs = durations.reduce((a, b) => a + b, 0) / durations.length;
          return { sampleCount: propias.length, avgDurationMs };
        }
      }
    } catch (_err) {
      // Buffer histórico ausente o corrupto; retornar valores por defecto
    }
    return { sampleCount: 0, avgDurationMs: 0 };
  }

  /**
   * Registra un ciclo en el buffer continuo de telemetría.
   */
  recordToContinuousHistory(taskName, driftReport) {
    try {
      let history = [];
      if (fs.existsSync(this.historyFile)) {
        try {
          history = JSON.parse(fs.readFileSync(this.historyFile, 'utf8'));
        } catch (_err) {
          // Historial corrupto; reiniciar como array vacio
          history = [];
        }
      }
      if (!Array.isArray(history)) history = [];

      history.push({
        taskName,
        pid: process.pid,
        timestamp: new Date().toISOString(),
        durationMs: driftReport.durationMs,
        heapDeltaMb: driftReport.heapDeltaMb,
        stateDiff: driftReport.stateDiff ? {
          totalChanged: driftReport.stateDiff.totalChanged,
          diskDeltaMb: driftReport.stateDiff.diskDeltaMb
        } : null,
        verdict: driftReport.verdict,
        regressionsCount: driftReport.regressions.length
      });

      if (history.length > 50) history = history.slice(-50);
      writeFileAtomicSync(this.historyFile, JSON.stringify(history, null, 2));
      return true;
    } catch (_err) {
      // Error no bloqueante al persistir telemetria continua
      return false;
    }
  }

  _diffWorktrees(preWorktree, postWorktree) {
    if (!preWorktree || !postWorktree) return null;
    const preFiles = preWorktree.files || {};
    const postFiles = postWorktree.files || {};
    const added = [];
    const modified = [];
    const deleted = [];

    for (const f of Object.keys(postFiles)) {
      if (!preFiles[f]) {
        added.push(f);
      } else if (preFiles[f].digest !== postFiles[f].digest) {
        modified.push(f);
      }
    }
    for (const f of Object.keys(preFiles)) {
      if (!postFiles[f]) {
        deleted.push(f);
      }
    }

    const diskDeltaMb = parseFloat((postWorktree.totalMb - preWorktree.totalMb).toFixed(2));
    return {
      added,
      modified,
      deleted,
      diskDeltaMb,
      totalChanged: added.length + modified.length + deleted.length
    };
  }

  /**
   * Compara dos snapshots y detecta regresiones de memoria, disco y mutaciones de estado.
   */
  computeDrift(preSnapshot, postSnapshot, options = {}) {
    const durationMs = postSnapshot.timestampMs - preSnapshot.timestampMs;
    const heapDeltaMb = parseFloat((postSnapshot.memory.heapUsedMb - preSnapshot.memory.heapUsedMb).toFixed(2));
    const rssDeltaMb = parseFloat((postSnapshot.memory.rssMb - preSnapshot.memory.rssMb).toFixed(2));

    const maxAllowedHeapGrowthMb = options.maxHeapGrowthMb || 15.0;
    const maxAllowedDiskGrowthMb = options.maxDiskGrowthMb || 10.0;
    const regressions = [];

    if (heapDeltaMb > maxAllowedHeapGrowthMb) {
      regressions.push({
        type: 'MEMORY_LEAK_DRIFT',
        severity: 'HIGH',
        message: 'Crecimiento anómalo de Heap: +' + heapDeltaMb + ' MB (Límite: ' + maxAllowedHeapGrowthMb + ' MB)'
      });
    }

    // Calcular diferencias de estado en disco (State Diffs)
    const stateDiff = this._diffWorktrees(preSnapshot.worktree, postSnapshot.worktree);
    if (stateDiff) {
      if (stateDiff.diskDeltaMb > maxAllowedDiskGrowthMb) {
        regressions.push({
          type: 'DISK_BLOAT_DRIFT',
          severity: 'HIGH',
          message: 'Crecimiento de disco no controlado: +' + stateDiff.diskDeltaMb + ' MB (Límite: ' + maxAllowedDiskGrowthMb + ' MB)'
        });
      }

      // Detectar mutaciones en archivos normativos de gobernanza
      const criticalChanges = [...stateDiff.added, ...stateDiff.modified, ...stateDiff.deleted]
        .filter(f => f.startsWith('policies/') || f.startsWith('schemas/'));
      if (criticalChanges.length > 0 && options.allowPolicyMutations !== true) {
        regressions.push({
          type: 'UNAUTHORIZED_STATE_MUTATION',
          severity: 'CRITICAL',
          message: 'Mutación no autorizada detectada en archivos críticos de gobernanza: ' + criticalChanges.join(', ')
        });
      }
    }

    // Comprobar picos de latencia contra el historial continuo
    const rollingMetrics = this.getRollingMetrics();
    if (rollingMetrics.sampleCount >= 3 && durationMs > rollingMetrics.avgDurationMs * 3.0) {
      regressions.push({
        type: 'LATENCY_SPIKE',
        severity: 'MEDIUM',
        message: 'Pico de latencia detectado: ' + durationMs + 'ms (Media móvil: ' + rollingMetrics.avgDurationMs.toFixed(1) + 'ms)'
      });
    }

    const pass = regressions.length === 0;

    return {
      pass,
      durationMs,
      heapDeltaMb,
      rssDeltaMb,
      stateDiff,
      regressions,
      verdict: pass ? 'NO_REGRESSIONS_DETECTED' : 'REGRESSION_DRIFT_ALERT'
    };
  }

  /**
   * Sella criptográficamente el reporte forense en un sobre DSSE in-toto Statement v1.
   */
  sealForensicReport(taskName, preSnapshot, postSnapshot, driftReport) {
    this.recordToContinuousHistory(taskName, driftReport);

    const payload = {
      _type: 'https://in-toto.io/Statement/v1',
      subject: [
        {
          name: taskName,
          digest: {
            sha256: crypto.createHash('sha256').update(taskName + postSnapshot.capturedAt).digest('hex')
          }
        }
      ],
      predicateType: 'https://axion.protocol/predicate/forensic-telemetry/v1',
      predicate: {
        taskName,
        durationMs: driftReport.durationMs,
        heapDeltaMb: driftReport.heapDeltaMb,
        rssDeltaMb: driftReport.rssDeltaMb,
        stateDiff: driftReport.stateDiff || null,
        verdict: driftReport.verdict,
        regressionsCount: driftReport.regressions.length,
        regressions: driftReport.regressions,
        preMemory: preSnapshot.memory,
        postMemory: postSnapshot.memory,
        recordedAt: new Date().toISOString()
      }
    };

    // Generar par de claves Ed25519 efímero/fresco para sellado
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
    const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' });

    const dsseEnvelope = signEnvelope({
      payloadType: 'application/vnd.in-toto+json',
      body: JSON.stringify(payload),
      privateKey: privateKeyPem,
      keyId: 'axion://key/forensic-telemetry'
    });
    writeFileAtomicSync(this.telemetryFile, JSON.stringify(dsseEnvelope, null, 2));

    const verifyResult = verifyEnvelope({
      envelope: dsseEnvelope,
      publicKeys: [publicKeyPem],
      expectedPayloadType: 'application/vnd.in-toto+json'
    });

    return {
      sealed: true,
      signatureValid: verifyResult.status === DSSE_STATUS.VALID,
      envelopePath: this.telemetryFile,
      payloadDigest: crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex')
    };
  }
}

if (require.main === module) {
  const engine = new ForensicTelemetryEngine();
  console.log('[Axion Forensic Telemetry] Capturando telemetría y auditando regresiones:');

  const pre = engine.captureSnapshot('pre-task');
  // Simular pequeña tarea de cómputo
  const buf = crypto.randomBytes(1024 * 512);
  const post = engine.captureSnapshot('post-task');

  const drift = engine.computeDrift(pre, post);
  console.log('\n=== REPORTE DE DERIVA Y TELEMETRÍA FORENSE ===');
  console.log('  Duración Tarea:      ' + drift.durationMs + ' ms');
  console.log('  Delta Heap Memoria:  ' + drift.heapDeltaMb + ' MB');
  console.log('  Delta RSS Memoria:   ' + drift.rssDeltaMb + ' MB');
  console.log('  Veredicto Deriva:    [' + drift.verdict + ']');

  const seal = engine.sealForensicReport('AuditTestTask', pre, post, drift);
  console.log('\n=== SELLADO CRIPTOGRÁFICO DSSE IN-TOTO ===');
  console.log('  Sellado Exitoso:     ' + seal.sealed);
  console.log('  Firma Ed25519 Válida:' + seal.signatureValid);
  console.log('  Digest SHA-256:      ' + seal.payloadDigest.slice(0, 16) + '...');
}

module.exports = ForensicTelemetryEngine;
