'use strict';

/**
 * AX-F-191: Invariantes del Acelerador de Caché KV y Deduplicador de Prompts (M_TOK_002)
 *
 * Valida de forma determinista:
 * 1. Particionado canónico inmutable de prefijos de gobernanza, herramientas y memoria.
 * 2. Determinación de elegibilidad de caché KV ante umbrales de tokens (>= 1024).
 * 3. Deduplicación de salidas de herramientas repetidas en el historial de mensajes.
 * 4. Cálculo matemático de tokens facturados vs equivalentes ahorrados (descuento 90%).
 * 5. Integración transparente con DriveEngine.accelerateContextCache().
 */

const assert = require('assert');
const path = require('path');
const ContextCacheAccelerator = require('../../tools/context_cache_accelerator.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-191 Invariantes del Acelerador de Caché KV (M_TOK_002) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const accelerator = new ContextCacheAccelerator(ROOT);

// Invariante 1: Partición de payload y cálculo de digest
const mockGov = 'Reglas de gobernanza determinista Axion Protocol '.repeat(100);
const mockTools = 'Definición de herramientas y esquemas inmutables '.repeat(100);
const mockMemory = 'Memoria persistente y convenciones de usuario '.repeat(50);

const partition = accelerator.partitionPayload({
  governance: mockGov,
  tools: mockTools,
  memory: mockMemory,
  activeTask: 'Ejecutar tarea de optimización'
});

assert.ok(partition.isCacheEligible, 'El prefijo mayor a 1024 tokens debe ser elegible para caché KV');
assert.ok(partition.prefixDigest && partition.prefixDigest.length === 64, 'Debe emitir digest SHA-256 de 64 caracteres');
assert.ok(partition.staticPrefix.includes('<!-- AXION_STATIC_PREFIX_START -->'), 'Debe delimitar canónicamente el prefijo estático');
console.log(`✓ Invariante 1: Partición canónica y digest de caché KV validados (${partition.prefixTokens} tokens)`);

// Invariante 2: Deduplicación de payloads repetidos en historial
const repetitiveHistory = [
  { role: 'user', content: 'Ejecuta inspección' },
  { role: 'tool', type: 'tool_result', content: 'Contenido extenso repetido '.repeat(50) },
  { role: 'user', content: 'Revisa de nuevo' },
  { role: 'tool', type: 'tool_result', content: 'Contenido extenso repetido '.repeat(50) }
];

const deduplicated = accelerator.deduplicateTurnHistory(repetitiveHistory);
assert.strictEqual(deduplicated[1].deduplicated, undefined, 'La primera ocurrencia debe preservarse');
assert.strictEqual(deduplicated[3].deduplicated, true, 'La segunda ocurrencia idéntica debe deduplicarse');
assert.ok(deduplicated[3].content.includes('[CACHED_PAYLOAD_REF'), 'Debe reemplazar por referencia corta');
console.log('✓ Invariante 2: Deduplicación determinista de salidas de herramienta en historial verificada');

// Invariante 3: Cálculo de ahorros y multiplicador de eficiencia
const savings = accelerator.calculateSavings(partition);
assert.strictEqual(savings.cacheHitDiscountPercent, 90, 'El descuento estándar de caché KV debe ser 90%');
assert.ok(savings.savedEquivalentTokens > 0, 'Debe registrar tokens equivalentes ahorrados');
assert.ok(savings.effectiveTokensBilled < partition.totalTokens, 'Los tokens facturados deben ser menores al total');
assert.ok(savings.savingsMultiplier > 1.0, 'El multiplicador de eficiencia debe ser mayor a 1x');
console.log(`✓ Invariante 3: Ahorros de caché KV calculados (${savings.savedEquivalentTokens} tokens ahorrados, ${savings.savingsMultiplier}x)`);

// Invariante 4: Integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const driveAccelerated = driveEngine.accelerateContextCache({
  governance: mockGov,
  tools: mockTools,
  memory: mockMemory,
  activeTask: 'Misión Drive'
});
assert.ok(driveAccelerated.partition.isCacheEligible);
assert.ok(driveAccelerated.savings.savingsMultiplier > 1.0);
console.log('✓ Invariante 4: Integración nativa con DriveEngine.accelerateContextCache() verificada');

console.log('\nPASS AX-F-191 — Invariantes del acelerador de caché KV demostrados al 100%.');
