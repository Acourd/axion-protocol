#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Zero-Overhead Trace Logger & High-Frequency Token Telemetry (M_TOK_007)
 *
 * Registrador cero-sobrecarga de trazas y telemetría de tokens:
 * 1. Búfer en anillo (ring buffer) de memoria acotada O(1) para latencia sub-100 microsegundos.
 * 2. Cero bloqueos del event loop; diseñado para trazabilidad en alta frecuencia de streaming.
 * 3. Ledger criptográfico continuo sellado con SHA-256 acumulativo de eventos de tokens.
 * 4. Detección explícita de sobreescritura (overflow) y drenado atómico de trazas.
 *
 * Cero dependencias externas.
 */

const crypto = require('crypto');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

class ZeroOverheadTraceLogger {
  constructor(options = {}) {
    this.root = path.resolve(options.projectRoot || ROOT);
    this.capacity = Math.max(2, Math.min(options.capacity || 1024, 65536));
    this.buffer = new Array(this.capacity);
    this.head = 0;
    this.count = 0;
    this.overflowCount = 0;

    this.totalTokensIn = 0;
    this.totalTokensOut = 0;
    this.totalTracesLogged = 0;
    this.totalLatencyNs = 0n;

    this.hasher = crypto.createHash('sha256');
  }

  /**
   * Registra un evento de traza y telemetría de tokens en tiempo sub-milisegundo.
   */
  recordTrace(entry = {}) {
    const startNs = process.hrtime.bigint();

    const event = String(entry.event || 'ACTION');
    const agentId = String(entry.agentId || 'default');
    const tokensIn = Math.max(0, Number(entry.tokensIn) || 0);
    const tokensOut = Math.max(0, Number(entry.tokensOut) || 0);
    const durationMs = Math.max(0, Number(entry.durationMs) || 0);

    const record = {
      event,
      agentId,
      tokensIn,
      tokensOut,
      durationMs,
      timestampNs: startNs.toString()
    };

    // Almacenar en búfer circular
    if (this.count < this.capacity) {
      this.buffer[this.head] = record;
      this.head = (this.head + 1) % this.capacity;
      this.count++;
    } else {
      // Sobreescribir el registro más antiguo
      this.buffer[this.head] = record;
      this.head = (this.head + 1) % this.capacity;
      this.overflowCount++;
    }

    this.totalTokensIn += tokensIn;
    this.totalTokensOut += tokensOut;
    this.totalTracesLogged++;

    // Actualizar hash acumulativo del ledger criptográfico
    const traceFingerprint = `${event}:${agentId}:${tokensIn}:${tokensOut}:${durationMs}`;
    this.hasher.update(traceFingerprint);

    const elapsedNs = process.hrtime.bigint() - startNs;
    this.totalLatencyNs += elapsedNs;

    return record;
  }

  /**
   * Obtiene las métricas consolidadas del registrador de telemetría.
   */
  getMetrics() {
    const avgLatencyUs = this.totalTracesLogged > 0
      ? Number(this.totalLatencyNs / BigInt(this.totalTracesLogged)) / 1000
      : 0;

    return {
      capacity: this.capacity,
      activeEntries: this.count,
      overflowCount: this.overflowCount,
      totalTracesLogged: this.totalTracesLogged,
      totalTokensIn: this.totalTokensIn,
      totalTokensOut: this.totalTokensOut,
      totalTokensCombined: this.totalTokensIn + this.totalTokensOut,
      averageLatencyMicroseconds: Number(avgLatencyUs.toFixed(3)),
      ledgerDigest: this.hasher.copy().digest('hex')
    };
  }

  /**
   * Drena y devuelve todas las entradas activas en orden cronológico, vaciando el búfer.
   */
  drainEntries() {
    const entries = [];
    if (this.count === 0) return entries;

    const startIdx = this.count < this.capacity ? 0 : this.head;
    for (let i = 0; i < this.count; i++) {
      const idx = (startIdx + i) % this.capacity;
      entries.push(this.buffer[idx]);
    }

    this.head = 0;
    this.count = 0;
    return entries;
  }
}

if (require.main === module) {
  const logger = new ZeroOverheadTraceLogger({ capacity: 100 });

  console.log('[Zero-Overhead Trace Logger] Registrando ráfaga de 10.000 trazas:\n');
  const t0 = Date.now();
  for (let i = 0; i < 10000; i++) {
    logger.recordTrace({
      event: 'INFERENCE_STEP',
      agentId: `agent_${i % 5}`,
      tokensIn: 120,
      tokensOut: 45,
      durationMs: 12.5
    });
  }
  const totalMs = Date.now() - t0;

  console.log(`✓ 10.000 trazas registradas en ${totalMs} ms (${(totalMs / 10000).toFixed(4)} ms/traza)`);
  console.log('\n--- MÉTRICAS CONSOLIDADAS ---');
  console.log(JSON.stringify(logger.getMetrics(), null, 2));
}

module.exports = ZeroOverheadTraceLogger;
