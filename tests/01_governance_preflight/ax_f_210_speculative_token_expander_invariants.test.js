'use strict';

/**
 * AX-F-210: Invariantes del Expansor Especulativo de Punteros de Contexto (M_TOK_009)
 *
 * Valida de forma determinista:
 * 1. Detección y expansión especulativa de referencias AXION_REF.
 * 2. Validación de integridad SHA-256 previa a la inyección.
 * 3. Preservación fail-closed de punteros huérfanos o con hash corrompido.
 * 4. Emisión de SpeculativeExpansionReport_v1 sellado con SHA-256.
 * 5. Integración transparente con DriveEngine.expandSpeculativeTokens().
 */

const assert = require('assert');
const crypto = require('crypto');
const path = require('path');
const SpeculativeTokenExpander = require('../../tools/speculative_token_expander.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-210 Invariantes del Expansor Especulativo de Tokens (M_TOK_009) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const expander = new SpeculativeTokenExpander({ projectRoot: ROOT });

const canonicalBlock = 'Invariante de inmutabilidad: SHA-256 estricto.';
const hash12 = crypto.createHash('sha256').update(canonicalBlock).digest('hex').slice(0, 12);

expander.warmCache({ [hash12]: canonicalBlock });

// Invariante 1: Expansión e integridad válida
const validText = `Cabecera\n<!-- AXION_REF: ${hash12} -->\nPie`;
const validRes = expander.expandSpeculative(validText);
assert.strictEqual(validRes.status, 'EXPANSION_COMPLETED');
assert.strictEqual(validRes.pointersFound, 1);
assert.strictEqual(validRes.pointersResolved, 1);
assert.strictEqual(validRes.integrityVerified, true);
assert.ok(validRes.expandedText.includes(canonicalBlock));
console.log('✓ Invariante 1: Expansión especulativa y verificación criptográfica exitosa');

// Invariante 2: Salvaguarda fail-closed ante hash corrompido
const fakeExpander = new SpeculativeTokenExpander({ projectRoot: ROOT });
fakeExpander.warmCache({ [hash12]: 'Contenido adulterado maliciosamente' });
const corruptRes = fakeExpander.expandSpeculative(validText);
assert.strictEqual(corruptRes.corruptedCount, 1);
assert.strictEqual(corruptRes.integrityVerified, false);
assert.ok(corruptRes.expandedText.includes(`<!-- AXION_REF: ${hash12} -->`), 'Debe preservar el puntero y rechazar inyección');
console.log('✓ Invariante 2: Rechazo fail-closed y preservación del puntero ante corrupción de hash');

// Invariante 3: Manejo de punteros ausentes
const missingRes = expander.expandSpeculative('<!-- AXION_REF: 000000000000 -->');
assert.strictEqual(missingRes.missingCount, 1);
assert.strictEqual(missingRes.integrityVerified, false);
console.log('✓ Invariante 3: Detección precisa de punteros no encontrados validada');

// Invariante 4: Integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const driveRes = driveEngine.expandSpeculativeTokens(validText, { [hash12]: canonicalBlock });
assert.strictEqual(driveRes.pointersResolved, 1);
assert.strictEqual(driveRes.integrityVerified, true);
assert.ok(driveRes.reportDigest && driveRes.reportDigest.length === 64);
console.log('✓ Invariante 4: Integración nativa con DriveEngine.expandSpeculativeTokens() verificada');

console.log('\nPASS AX-F-210 — Invariantes del expansor especulativo demostrados al 100%.');
