#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Hardware-Aware Adaptive Compute Profiler
 *
 * Calibrador dinámico multinivel de hardware para /drive:
 * 1. Detecta en tiempo real núcleos de CPU, RAM total/libre y límites de Heap.
 * 2. Clasifica el host en 4 niveles de capacidad:
 *    - TIER_1_LOW_END:          1-2 cores / <1.5GB RAM libre -> Modo ultra-ligero (1-2 workers, Heap 32MB)
 *    - TIER_2_MID_RANGE:        4-6 cores / 1.5-4GB RAM libre -> Modo equilibrado (4 workers, Heap 64MB)
 *    - TIER_3_HIGH_END:         8-12 cores / 4-16GB RAM libre -> Modo alto rendimiento (8 workers, Heap 128MB)
 *    - TIER_4_EXTREME_SERVER:   >12 cores / >16GB RAM libre -> Modo hiper-escalado (12-16 workers, Heap 256MB)
 * 3. Proporciona cuotas dinámicas de concurrencia y memoria para runners, fuzzers y bucles de auto-curación.
 *
 * Cero dependencias externas.
 */

const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

class HardwareAdaptiveProfiler {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
  }

  /**
   * Obtiene la telemetría del sistema anfitrión.
   */
  getHostTelemetry() {
    const cpus = os.cpus();
    const cores = Array.isArray(cpus) ? cpus.length : 1;
    const cpuModel = Array.isArray(cpus) && cpus.length > 0 ? cpus[0].model : 'Generic CPU';
    const totalRamBytes = os.totalmem();
    const freeRamBytes = os.freemem();
    const totalRamGb = parseFloat((totalRamBytes / (1024 ** 3)).toFixed(2));
    const freeRamGb = parseFloat((freeRamBytes / (1024 ** 3)).toFixed(2));

    return {
      cores,
      cpuModel,
      totalRamGb,
      freeRamGb,
      platform: os.platform(),
      arch: os.arch(),
      processHeapMb: parseFloat((process.memoryUsage().heapUsed / (1024 ** 2)).toFixed(2))
    };
  }

  /**
   * Clasifica el host y genera el perfil de ejecución óptimo.
   */
  getComputeProfile(customTelemetry = null) {
    const telemetry = customTelemetry || this.getHostTelemetry();
    const { cores, freeRamGb } = telemetry;

    let tierId = 'TIER_2_MID_RANGE';
    let tierName = 'Gama Media / Equilibrada';
    let maxWorkers = 4;
    let heapLimitMb = 64;
    let fuzzerBatchSize = 5000;
    let convergenceMaxRetries = 3;
    let mode = 'BALANCED_PRODUCTIVE';

    // Clasificación determinista de 4 Tiers
    if (cores <= 2 || freeRamGb < 1.5) {
      tierId = 'TIER_1_LOW_END';
      tierName = 'Gama Baja / Ahorro de Recursos';
      maxWorkers = Math.max(1, Math.min(2, cores));
      heapLimitMb = 32;
      fuzzerBatchSize = 1000;
      convergenceMaxRetries = 2;
      mode = 'RESOURCE_CONSERVATIVE';
    } else if (cores >= 12 && freeRamGb >= 16.0) {
      tierId = 'TIER_4_EXTREME_SERVER';
      tierName = 'Gama Extrema / Servidor Hiper-Escalado';
      maxWorkers = Math.min(16, cores - 2);
      heapLimitMb = 256;
      fuzzerBatchSize = 50000;
      convergenceMaxRetries = 5;
      mode = 'UNCONSTRAINED_HYPERTHREADED';
    } else if (cores >= 8 && (freeRamGb >= 0.8 || cores >= 10)) {
      // 8-12 cores con RAM adecuada
      tierId = 'TIER_3_HIGH_END';
      tierName = 'Gama Alta / Alto Rendimiento';
      maxWorkers = Math.min(8, cores - 2 > 0 ? cores - 2 : 4);
      heapLimitMb = 128;
      fuzzerBatchSize = 10000;
      convergenceMaxRetries = 4;
      mode = 'HIGH_PERFORMANCE_THROUGHPUT';
    }

    return {
      tierId,
      tierName,
      mode,
      telemetry,
      allocatedLimits: {
        maxWorkers,
        heapLimitMb,
        fuzzerBatchSize,
        convergenceMaxRetries
      }
    };
  }

  /**
   * Calibra la configuración óptima para una tarea específica en función del hardware.
   */
  calibrateTask(taskType = 'test_runner') {
    const profile = this.getComputeProfile();
    const limits = profile.allocatedLimits;

    switch (taskType) {
      case 'test_runner':
        return {
          concurrency: limits.maxWorkers,
          timeoutPerSuiteMs: profile.tierId === 'TIER_1_LOW_END' ? 15000 : 8000,
          heapCapMb: limits.heapLimitMb
        };

      case 'fuzzer':
        return {
          batchSize: limits.fuzzerBatchSize,
          concurrency: limits.maxWorkers,
          timeoutMs: 5000
        };

      case 'auto_healing':
        return {
          maxConvergenceCycles: limits.convergenceMaxRetries,
          astPatchTimeoutMs: profile.tierId === 'TIER_1_LOW_END' ? 2000 : 1000
        };

      default:
        return limits;
    }
  }
}

if (require.main === module) {
  const profiler = new HardwareAdaptiveProfiler();
  console.log('[Axion Hardware Profiler] Analizando hardware anfitrión y calibrando perfiles:');

  const profile = profiler.getComputeProfile();
  console.log(`\n=== PERFIL DE CÓMPUTO CALIBRADO ===`);
  console.log(`  Tier Asignado:      [${profile.tierId}] ${profile.tierName}`);
  console.log(`  Modo Operacional:   ${profile.mode}`);
  console.log(`  CPU Detectada:      ${profile.telemetry.cpuModel} (${profile.telemetry.cores} núcleos)`);
  console.log(`  RAM Total / Libre:  ${profile.telemetry.totalRamGb} GB / ${profile.telemetry.freeRamGb} GB`);
  console.log(`  Workers Asignados:  ${profile.allocatedLimits.maxWorkers}`);
  console.log(`  Cuota Heap Máxima:  ${profile.allocatedLimits.heapLimitMb} MB`);
  console.log(`  Batch Caos Fuzzer:  ${profile.allocatedLimits.fuzzerBatchSize} vectores`);

  // Simular perfiles sintéticos para validar adaptabilidad
  console.log(`\n=== SIMULACIÓN DE ESCENARIOS DE HARDWARE ===`);
  const lowEnd = profiler.getComputeProfile({ cores: 2, freeRamGb: 0.8, totalRamGb: 4 });
  console.log(`  [Simulación 1: Low-End 2 Cores/0.8GB RAM] -> Tier: [${lowEnd.tierId}] · Workers: ${lowEnd.allocatedLimits.maxWorkers} · Heap: ${lowEnd.allocatedLimits.heapLimitMb}MB`);

  const server = profiler.getComputeProfile({ cores: 32, freeRamGb: 64.0, totalRamGb: 128 });
  console.log(`  [Simulación 2: Server 32 Cores/64GB RAM]   -> Tier: [${server.tierId}] · Workers: ${server.allocatedLimits.maxWorkers} · Fuzzer: ${server.allocatedLimits.fuzzerBatchSize}`);
}

module.exports = HardwareAdaptiveProfiler;
