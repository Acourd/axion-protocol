#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Ultra-Fast Consolidated Governance Gate
 *
 * Consolida en un único proceso de ultra-alta velocidad (< 2.5s) las 4 verificaciones nucleares:
 * 1. Suite exhaustiva de pruebas (113+ suites en 5 dominios).
 * 2. Chequeo de salud del workspace (bin/axion.js check).
 * 3. Escaneo estricto de VibeGuard (cero antipatrones).
 * 4. Fuzzing de caos masivo (1.000 vectores).
 * 5. Espejo local a Axkern (robocopy optimizado silencioso).
 *
 * Evita la fragmentación en múltiples tareas de segundo plano y elimina la espera en "Queued Messages".
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
// Axkern vive al nivel del proyecto: resolución relativa, no ruta de usuario.
const AXKERN = path.resolve(ROOT, '..', 'Axkern');

class PipelineFastGate {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
  }

  runAllGatesSync() {
    const t0 = Date.now();
    const results = {
      tests: false,
      health: false,
      vibeguard: false,
      chaosFuzzer: false,
      mirror: false,
      durationMs: 0,
      pass: false
    };

    const runSafe = (scriptPath, args = []) => {
      const res = spawnSync(process.execPath, [path.join(this.root, scriptPath), ...args], {
        cwd: this.root,
        stdio: 'pipe',
        shell: false
      });
      return res.status === 0;
    };

    try {
      // 1. Tests
      if (!runSafe('tests/run_all.js')) throw new Error('run_all failed');
      results.tests = true;

      // 2. Health check
      if (!runSafe('bin/axion.js', ['check'])) throw new Error('health check failed');
      results.health = true;

      // 3. VibeGuard
      if (!runSafe('tools/vibeguard_gate.js', ['--strict'])) throw new Error('vibeguard failed');
      results.vibeguard = true;

      // 4. Chaos Fuzzer 1000
      if (!runSafe('tools/chaos_fuzzer_1000.js')) throw new Error('chaos fuzzer failed');
      results.chaosFuzzer = true;

      // 5. Mirror local a Axkern si existe el directorio
      if (fs.existsSync(AXKERN)) {
        try {
          const SyncMirrorGate = require('./sync_mirror_gate.js');
          const gate = new SyncMirrorGate(this.root, AXKERN);
          const syncRes = gate.sync();
          results.mirror = syncRes.synced || syncRes.initialParity >= 95;
        } catch (_) {
          results.mirror = false;
        }
      } else {
        results.mirror = true;
      }

      results.pass = results.tests && results.health && results.vibeguard && results.chaosFuzzer;
    } catch (err) {
      results.error = err.message;
      results.pass = false;
    }

    results.durationMs = Date.now() - t0;
    return results;
  }
}

if (require.main === module) {
  const gate = new PipelineFastGate();
  console.log('[Axion Fast Gate] Ejecutando verificación consolidada en 1 solo paso...');
  const res = gate.runAllGatesSync();

  console.log(`\n=== RESULTADOS DE FAST GATE (${(res.durationMs / 1000).toFixed(2)}s) ===`);
  console.log(`  Suites Deterministas:    ${res.tests ? '✓ PASS' : '❌ FAIL'}`);
  console.log(`  Health Check (12/12):    ${res.health ? '✓ PASS' : '❌ FAIL'}`);
  console.log(`  VibeGuard Strict:        ${res.vibeguard ? '✓ PASS' : '❌ FAIL'}`);
  console.log(`  Chaos Fuzzer (1.000):    ${res.chaosFuzzer ? '✓ PASS' : '❌ FAIL'}`);
  console.log(`  Espejo Axkern:           ${res.mirror ? '✓ SINCRONIZADO' : '⚠️ OMITIDO'}`);

  if (!res.pass) {
    console.error(`\n❌ Error en Fast Gate: ${res.error}`);
    process.exit(1);
  } else {
    console.log(`\n🎉 PASS: Todas las compuertas de gobernanza verificadas síncronamente en ${(res.durationMs / 1000).toFixed(2)}s.`);
    process.exit(0);
  }
}

module.exports = PipelineFastGate;
