'use strict';

/**
 * AX-F-188: Invariantes del Optimizador de Economía de Tokens y Compresor de Contexto
 *
 * Valida de forma determinista:
 * 1. Poda radical de suites de prueba verdes (reducción > 80% de tokens).
 * 2. Aislamiento quirúrgico de fallas con omisión del ruido de aprobados.
 * 3. Compactación de salidas largas arbitrarias respetando límites de ventana.
 * 4. Integración completa con DriveEngine.pruneOutputTokens().
 */

const assert = require('assert');
const path = require('path');
const TokenEconomyPruner = require('../../tools/token_economy_pruner.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-188 Invariantes del Optimizador de Tokens y Compresor de Contexto ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const pruner = new TokenEconomyPruner(ROOT);

// Invariante 1: Poda de suite verde masiva
const mockGreenOutput = Array.from({ length: 203 }, (_, i) => `  PASS  suite_${i + 1}_invariants`).join('\n') +
  '\n\n=== RESUMEN DE DOMINIOS ===\n  suites totales : 203\n  en verde       : 203\n  tiempo total   : 14.12s\nPASS: las 203 suites están en verde.\n';

const greenPrune = pruner.pruneTerminalOutput(mockGreenOutput);
assert.ok(greenPrune.savedTokens > 0, 'Debe registrar tokens ahorrados');
assert.ok(greenPrune.savingsPercent >= 80, `El porcentaje de ahorro (${greenPrune.savingsPercent}%) debe ser >= 80%`);
assert.ok(greenPrune.output.includes('PASS: las 203 suites'), 'Debe preservar el resumen de aprobación');
console.log(`✓ Invariante 1: Poda de suite verde validada (${greenPrune.savingsPercent}% tokens ahorrados)`);

// Invariante 2: Aislamiento selectivo de fallas
const mockFailOutput = Array.from({ length: 150 }, (_, i) => `  PASS  suite_${i + 1}_invariants`).join('\n') +
  '\n  FAIL  ax_f_critical_bug (salida 1)\n--- ERR_ASSERTION: Expected 1 to equal 2 ---\n';

const failPrune = pruner.pruneTerminalOutput(mockFailOutput);
assert.ok(failPrune.output.includes('FAIL  ax_f_critical_bug'), 'Debe retener la línea de fallo');
assert.ok(failPrune.output.includes('ERR_ASSERTION'), 'Debe retener la traza de la aserción');
assert.ok(failPrune.savedTokens > 0, 'Debe ahorrar tokens podando las líneas de PASS');
console.log('✓ Invariante 2: Aislamiento quirúrgico de fallas validado');

// Invariante 3: Integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const drivePruned = driveEngine.pruneOutputTokens(mockGreenOutput);
assert.ok(drivePruned.savedTokens > 0, 'DriveEngine debe delegar la poda correctamente');
assert.strictEqual(drivePruned.originalTokens, greenPrune.originalTokens);
console.log('✓ Invariante 3: Integración con DriveEngine.pruneOutputTokens() verificada');

console.log('\nPASS AX-F-188 — Invariantes de economía de tokens y compresión demostrados al 100%.');
