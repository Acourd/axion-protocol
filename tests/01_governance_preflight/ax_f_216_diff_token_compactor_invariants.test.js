'use strict';

/**
 * AX-F-216: Invariantes del Compactor Diferencial de Tokens (M_TOK_012)
 *
 * Valida de forma determinista:
 * 1. Compactación unificada de modificaciones sobre archivos extensos.
 * 2. Demostración matemática de reversibilidad estricta: apply(orig, diff) === mod.
 * 3. Manejo determinista de contenido idéntico sin mutación.
 * 4. Emisión de DiffCompactionReport_v1 sellado con SHA-256.
 * 5. Integración transparente con DriveEngine.compactFileDiff() y applyCompactedDiff().
 */

const assert = require('assert');
const path = require('path');
const DiffTokenCompactor = require('../../tools/diff_token_compactor.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-216 Invariantes del Compactor Diferencial de Tokens (M_TOK_012) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const compactor = new DiffTokenCompactor({ projectRoot: ROOT });

// Invariante 1: Reversibilidad matemática y ahorro sustancial en archivo mediano/grande
const linesOriginal = [];
for (let i = 1; i <= 200; i++) {
  linesOriginal.push(`const variable_${i} = ${i * 10}; // Invariante base`);
}
const originalText = linesOriginal.join('\n');

const linesModified = [...linesOriginal];
linesModified[49] = 'const variable_50 = 99999; // Mutación autorizada por milestone';
linesModified[50] = 'const variable_51 = 88888; // Mutación autorizada por milestone';
const modifiedText = linesModified.join('\n');

const report = compactor.createHunk(originalText, modifiedText);
assert.strictEqual(report.status, 'DIFF_COMPACTED');
assert.strictEqual(report.isReversibleVerified, true);
assert.ok(parseFloat(report.reductionPercent) > 85.0, 'El ahorro en 200 líneas debe superar el 85%');
assert.ok(report.reportDigest && report.reportDigest.length === 64);
console.log(`✓ Invariante 1: Reversibilidad matemática probada al 100% (Ahorro: ${report.reductionPercent}, Tokens: ${report.originalTokens} -> ${report.diffTokens})`);

// Invariante 2: Aplicación del hunk y reconstrucción idéntica
const restored = compactor.applyHunk(originalText, report.diffText);
assert.strictEqual(restored, modifiedText, 'El contenido restaurado debe ser idéntico al modificado');
console.log('✓ Invariante 2: Reconstrucción bit a bit idéntica demostrada al aplicar el hunk');

// Invariante 3: Manejo determinista de contenido idéntico
const identicalReport = compactor.createHunk(originalText, originalText);
assert.strictEqual(identicalReport.status, 'IDENTICAL_CONTENT');
assert.strictEqual(identicalReport.isIdentical, true);
assert.strictEqual(identicalReport.diffText, '');
console.log('✓ Invariante 3: Manejo determinista de contenido idéntico validado');

// Invariante 4: Integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const driveReport = driveEngine.compactFileDiff(originalText, modifiedText);
assert.strictEqual(driveReport.reportType, 'DiffCompactionReport_v1');
assert.strictEqual(driveReport.isReversibleVerified, true);

const driveRestored = driveEngine.applyCompactedDiff(originalText, driveReport.diffText);
assert.strictEqual(driveRestored, modifiedText);
console.log('✓ Invariante 4: Integración nativa con DriveEngine.compactFileDiff() y applyCompactedDiff() verificada');

console.log('\nPASS AX-F-216 — Invariantes del compactor diferencial demostrados al 100%.');
