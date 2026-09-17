#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol v2.0 — Swarm High-Throughput Stress Benchmark Engine
 *
 * Mide el rendimiento determinista bajo carga masiva:
 * 1. 500 operaciones de bloqueo y liberación AST granular.
 * 2. 500 mensajes P2P firmados y verificados con Ed25519.
 * 3. 100 rondas de votación de quórum bizantino BFT con 3 agentes.
 * 4. Cálculo de latencias p50, p95, p99 y operaciones por segundo (ops/sec).
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const SwarmASTArbiter = require('./swarm_ast_arbiter.js');
const SwarmP2PChannel = require('./swarm_p2p_channel.js');
const SwarmConsensusArbiter = require('./swarm_consensus_arbiter.js');

const ROOT = path.resolve(__dirname, '..');

class SwarmBenchmark {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
  }

  runAllBenchmarks({
    astIterations = 500,
    p2pIterations = 500,
    bftRounds = 100
  } = {}) {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'axion_swarm_bench_'));

    try {
      const results = {
        timestamp: new Date().toISOString(),
        system: {
          platform: os.platform(),
          cpus: os.cpus().length,
          nodeVersion: process.version
        },
        astBenchmark: this.benchmarkASTLocking(tempDir, astIterations),
        p2pBenchmark: this.benchmarkP2PMessaging(tempDir, p2pIterations),
        bftBenchmark: this.benchmarkBFTConsensus(tempDir, bftRounds)
      };

      return results;
    } finally {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (_) {
        // cleanup
      }
    }
  }

  benchmarkASTLocking(tempDir, iterations) {
    const arbiter = new SwarmASTArbiter(tempDir);
    const start = process.hrtime.bigint();
    const latencies = [];

    for (let i = 0; i < iterations; i++) {
      const t0 = process.hrtime.bigint();
      const lock = arbiter.acquireLock(`agent-${i % 5}`, `src/module_${i % 10}.js`, `method_${i % 20}`);
      if (lock.acquired) {
        arbiter.releaseLock(lock.leaseId, lock.lockKey);
      }
      const t1 = process.hrtime.bigint();
      latencies.push(Number(t1 - t0) / 1e6); // ms
    }

    const totalNs = process.hrtime.bigint() - start;
    const totalMs = Number(totalNs) / 1e6;

    return this.calculateStats('AST Granular Locking', iterations, totalMs, latencies);
  }

  benchmarkP2PMessaging(tempDir, iterations) {
    const channel = new SwarmP2PChannel(tempDir);
    const keyPairA = channel.generateAgentKeyPair();
    const keyPairB = channel.generateAgentKeyPair();
    const publicKeys = { 'agent-sender': keyPairA.publicKey };

    const start = process.hrtime.bigint();
    const latencies = [];

    for (let i = 0; i < iterations; i++) {
      const t0 = process.hrtime.bigint();
      channel.sendMessage({
        senderId: 'agent-sender',
        recipientId: 'agent-receiver',
        topic: 'BENCHMARK_PROBE',
        payload: { iteration: i, entropy: crypto.randomBytes(8).toString('hex') },
        privateKey: keyPairA.privateKey
      });
      channel.receiveMessages('agent-receiver', publicKeys);
      channel.clearInbox('agent-receiver');
      const t1 = process.hrtime.bigint();
      latencies.push(Number(t1 - t0) / 1e6); // ms
    }

    const totalNs = process.hrtime.bigint() - start;
    const totalMs = Number(totalNs) / 1e6;

    return this.calculateStats('P2P Ed25519 Bus', iterations, totalMs, latencies);
  }

  benchmarkBFTConsensus(tempDir, rounds) {
    const arbiter = new SwarmConsensusArbiter(tempDir);
    const agents = [
      { id: 'agent-1', keys: crypto.generateKeyPairSync('ed25519') },
      { id: 'agent-2', keys: crypto.generateKeyPairSync('ed25519') },
      { id: 'agent-3', keys: crypto.generateKeyPairSync('ed25519') }
    ];

    const publicKeys = {
      'agent-1': agents[0].keys.publicKey,
      'agent-2': agents[1].keys.publicKey,
      'agent-3': agents[2].keys.publicKey
    };

    const start = process.hrtime.bigint();
    const latencies = [];

    for (let i = 0; i < rounds; i++) {
      const t0 = process.hrtime.bigint();
      const proposal = arbiter.createProposal({
        proposerId: 'agent-1',
        title: `Propuesta de mutación ${i}`,
        targetFiles: [`tools/mod_${i}.js`]
      });

      for (const agent of agents) {
        arbiter.castBallot(proposal, {
          voterId: agent.id,
          role: 'AUDITOR',
          verdict: 'APPROVE',
          rationale: 'Aprobado bajo benchmark',
          privateKey: agent.keys.privateKey
        });
      }

      arbiter.evaluateConsensus(proposal, publicKeys, 3);
      const t1 = process.hrtime.bigint();
      latencies.push(Number(t1 - t0) / 1e6); // ms
    }

    const totalNs = process.hrtime.bigint() - start;
    const totalMs = Number(totalNs) / 1e6;

    return this.calculateStats('BFT Byzantine Consensus', rounds, totalMs, latencies);
  }

  calculateStats(name, iterations, totalMs, latencies) {
    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.50)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];
    const opsPerSec = (iterations / (totalMs / 1000)).toFixed(0);

    return {
      name,
      iterations,
      totalTimeMs: parseFloat(totalMs.toFixed(2)),
      opsPerSec: parseInt(opsPerSec, 10),
      p50Ms: parseFloat(p50.toFixed(3)),
      p95Ms: parseFloat(p95.toFixed(3)),
      p99Ms: parseFloat(p99.toFixed(3))
    };
  }
}

// Ejecución CLI directa
if (require.main === module) {
  console.log('=== Axion Protocol v2.0 — Swarm High-Throughput Stress Benchmark ===\n');
  const bench = new SwarmBenchmark();
  const res = bench.runAllBenchmarks();

  console.log(`[AST Granular Locks]   ${res.astBenchmark.iterations} ops en ${res.astBenchmark.totalTimeMs}ms (${res.astBenchmark.opsPerSec} ops/sec) · p50: ${res.astBenchmark.p50Ms}ms, p95: ${res.astBenchmark.p95Ms}ms`);
  console.log(`[P2P Ed25519 Bus]      ${res.p2pBenchmark.iterations} ops en ${res.p2pBenchmark.totalTimeMs}ms (${res.p2pBenchmark.opsPerSec} ops/sec) · p50: ${res.p2pBenchmark.p50Ms}ms, p95: ${res.p2pBenchmark.p95Ms}ms`);
  console.log(`[BFT Consensus Rounds] ${res.bftBenchmark.iterations} rondas en ${res.bftBenchmark.totalTimeMs}ms (${res.bftBenchmark.opsPerSec} rounds/sec) · p50: ${res.bftBenchmark.p50Ms}ms, p95: ${res.bftBenchmark.p95Ms}ms`);
  console.log('\n✓ Benchmark de estrés completado con éxito.');
}

module.exports = SwarmBenchmark;
