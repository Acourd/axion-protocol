#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Self-Healing Circuit Breaker Engine (M_RES_010 / AX-F-217)
 *
 * Disyuntor determinista y auto-recuperador con presupuesto de fallos por cluster:
 * 1. Control de estados por cluster: CLOSED -> OPEN -> HALF_OPEN -> CLOSED.
 * 2. Cota acotada de fallos consecutivos por cluster (Invariante 6 de /drive).
 * 3. Ejecución segura de probes en HALF_OPEN con auto-sanación instantánea.
 * 4. Fallback fail-fast sin consumo de recursos cuando el circuito está OPEN.
 * 5. Emisión de CircuitBreakerReport_v1 sellado con SHA-256.
 *
 * Cero dependencias externas.
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');

class SelfHealingCircuitBreaker {
  constructor(options = {}) {
    this.projectRoot = path.resolve(options.projectRoot || ROOT);
    this.maxFailures = options.maxFailures || 3;
    this.cooldownMs = options.cooldownMs || 1000;
    this.clusters = new Map();
  }

  _getCluster(clusterKey) {
    if (!this.clusters.has(clusterKey)) {
      this.clusters.set(clusterKey, {
        state: 'CLOSED',
        consecutiveFailures: 0,
        totalFailures: 0,
        totalSuccesses: 0,
        lastFailureTime: 0
      });
    }
    return this.clusters.get(clusterKey);
  }

  getState(clusterKey) {
    const cluster = this._getCluster(clusterKey);
    if (cluster.state === 'OPEN') {
      const elapsed = Date.now() - cluster.lastFailureTime;
      if (elapsed >= this.cooldownMs) {
        cluster.state = 'HALF_OPEN';
      }
    }
    return cluster.state;
  }

  execute(clusterKey, fn, fallback = null) {
    const currentState = this.getState(clusterKey);
    const cluster = this._getCluster(clusterKey);

    if (currentState === 'OPEN') {
      if (typeof fallback === 'function') {
        return fallback(new Error(`[CircuitBreaker] Cluster '${clusterKey}' se encuentra OPEN.`));
      }
      throw new Error(`[CircuitBreaker] Cluster '${clusterKey}' está OPEN. Fallo rápido fail-fast.`);
    }

    if (currentState === 'HALF_OPEN') {
      try {
        const result = fn();
        // Auto-sanación determinista
        cluster.state = 'CLOSED';
        cluster.consecutiveFailures = 0;
        cluster.totalSuccesses++;
        return result;
      } catch (err) {
        cluster.state = 'OPEN';
        cluster.lastFailureTime = Date.now();
        cluster.totalFailures++;
        if (typeof fallback === 'function') {
          return fallback(err);
        }
        throw err;
      }
    }

    // Estado CLOSED normal
    try {
      const result = fn();
      cluster.consecutiveFailures = 0;
      cluster.totalSuccesses++;
      return result;
    } catch (err) {
      cluster.consecutiveFailures++;
      cluster.totalFailures++;
      cluster.lastFailureTime = Date.now();

      if (cluster.consecutiveFailures >= this.maxFailures) {
        cluster.state = 'OPEN';
      }

      throw err;
    }
  }

  getReport() {
    const summary = {};
    let openCount = 0;

    for (const [key, val] of this.clusters.entries()) {
      summary[key] = {
        state: this.getState(key),
        consecutiveFailures: val.consecutiveFailures,
        totalFailures: val.totalFailures,
        totalSuccesses: val.totalSuccesses
      };
      if (summary[key].state === 'OPEN') openCount++;
    }

    const payload = {
      reportType: 'CircuitBreakerReport_v1',
      timestamp: new Date().toISOString(),
      maxFailuresThreshold: this.maxFailures,
      cooldownMs: this.cooldownMs,
      totalClusters: this.clusters.size,
      openClusters: openCount,
      clusters: summary
    };

    const canonicalJson = JSON.stringify(payload, Object.keys(payload).sort());
    const reportDigest = crypto.createHash('sha256').update(canonicalJson).digest('hex');

    return {
      ...payload,
      reportDigest
    };
  }
}

module.exports = SelfHealingCircuitBreaker;
