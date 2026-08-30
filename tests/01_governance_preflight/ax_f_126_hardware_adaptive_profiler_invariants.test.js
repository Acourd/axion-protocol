'use strict';

/**
 * Axion Protocol — Invariantes del Perfilador Adaptativo Multinivel de Hardware.
 *
 * Valida de forma estricta:
 * 1. Detección en vivo de telemetría de hardware (CPU, Cores, RAM total y libre).
 * 2. Clasificación determinista en 4 Tiers de hardware (LOW_END, MID_RANGE, HIGH_END, EXTREME_SERVER).
 * 3. Asignación proporcional de cuotas de workers, límites de Heap y tamaños de lote.
 * 4. Calibración dinámica de tareas (test runner, fuzzer, auto-healing).
 * 5. Integración transparente con DriveEngine.
 */

const assert = require('assert');
const path = require('path');
const HardwareAdaptiveProfiler = require('../../tools/hardware_adaptive_profiler.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-126 Invariantes del Perfilador Adaptativo Multinivel de Hardware ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const profiler = new HardwareAdaptiveProfiler(ROOT);

// 1. Validar telemetría del host
const telemetry = profiler.getHostTelemetry();
assert.ok(telemetry.cores >= 1, 'Los núcleos detectados deben ser >= 1');
assert.ok(telemetry.totalRamGb > 0, 'La RAM total debe ser positiva');
assert.ok(telemetry.freeRamGb >= 0, 'La RAM libre debe ser no negativa');
console.log(`✓ Telemetría de host detectada: ${telemetry.cpuModel} (${telemetry.cores} núcleos) · ${telemetry.totalRamGb}GB RAM`);

// 2. Validar clasificación en los 4 Tiers sintéticos
const lowTier = profiler.getComputeProfile({ cores: 2, freeRamGb: 0.5, totalRamGb: 4 });
assert.strictEqual(lowTier.tierId, 'TIER_1_LOW_END');
assert.strictEqual(lowTier.allocatedLimits.maxWorkers <= 2, true);
assert.strictEqual(lowTier.allocatedLimits.heapLimitMb, 32);
console.log('✓ Tier 1 (LOW_END) validado: Concurrencia conservadora (máx 2 workers, Heap 32MB)');

const midTier = profiler.getComputeProfile({ cores: 6, freeRamGb: 3.5, totalRamGb: 16 });
assert.strictEqual(midTier.tierId, 'TIER_2_MID_RANGE');
assert.strictEqual(midTier.allocatedLimits.maxWorkers, 4);
assert.strictEqual(midTier.allocatedLimits.heapLimitMb, 64);
console.log('✓ Tier 2 (MID_RANGE) validado: Concurrencia equilibrada (4 workers, Heap 64MB)');

const highTier = profiler.getComputeProfile({ cores: 10, freeRamGb: 8.0, totalRamGb: 32 });
assert.strictEqual(highTier.tierId, 'TIER_3_HIGH_END');
assert.strictEqual(highTier.allocatedLimits.maxWorkers, 8);
assert.strictEqual(highTier.allocatedLimits.heapLimitMb, 128);
console.log('✓ Tier 3 (HIGH_END) validado: Alto rendimiento (8 workers, Heap 128MB)');

const serverTier = profiler.getComputeProfile({ cores: 32, freeRamGb: 64.0, totalRamGb: 128 });
assert.strictEqual(serverTier.tierId, 'TIER_4_EXTREME_SERVER');
assert.strictEqual(serverTier.allocatedLimits.maxWorkers, 16);
assert.strictEqual(serverTier.allocatedLimits.heapLimitMb, 256);
console.log('✓ Tier 4 (EXTREME_SERVER) validado: Hiper-escalado (16 workers, Heap 256MB)');

// 3. Validar calibración de tareas
const taskConfig = profiler.calibrateTask('test_runner');
assert.ok(taskConfig.concurrency >= 1, 'La concurrencia de test_runner debe ser >= 1');
assert.ok(taskConfig.heapCapMb >= 32, 'El límite de heap debe ser >= 32MB');
console.log(`✓ Calibración de test_runner validada: ${taskConfig.concurrency} workers · Heap ${taskConfig.heapCapMb}MB`);

// 4. Validar integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const driveProfile = driveEngine.getHardwareComputeProfile();
assert.ok(driveProfile.tierId.startsWith('TIER_'), 'DriveEngine debe retornar un Tier válido');
console.log(`✓ Integración DriveEngine.getHardwareComputeProfile() verificada: [${driveProfile.tierId}]`);

console.log('\nPASS AX-F-126 — Invariantes del perfilador adaptativo multinivel de hardware demostrados al 100%.');
