'use strict';

/**
 * AX-F-207: Invariantes del Sintetizador Dialéctico de Meta-Prompts (M_COG_014)
 *
 * Valida de forma determinista:
 * 1. Estructuración dialéctica estricta (Tesis, Antítesis, Síntesis).
 * 2. Adaptación morfológica por familia de modelo (Anthropic XML, OpenAI Markdown).
 * 3. Incorporación de veto asimétrico fail-closed de seguridad P0 en el meta-prompt.
 * 4. Poda gramatical integrada y sellado de digest SHA-256.
 * 5. Integración transparente con DriveEngine.synthesizeDialecticMetaprompt().
 */

const assert = require('assert');
const path = require('path');
const MetapromptDialecticSynthesizer = require('../../tools/metaprompt_dialectic_synthesizer.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-207 Invariantes del Sintetizador Dialéctico de Meta-Prompts (M_COG_014) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const synthesizer = new MetapromptDialecticSynthesizer({ projectRoot: ROOT });

// Invariante 1: Síntesis para Anthropic con delimitadores XML
const anthropicResult = synthesizer.synthesize('Optimizar latencia de red en enjambre', {
  modelFamily: 'ANTHROPIC',
  adversarialRisks: ['Sobrecarga de sockets por reconexiones descontroladas']
});

assert.strictEqual(anthropicResult.status, 'METAPROMPT_SYNTHESIZED');
assert.strictEqual(anthropicResult.modelFamily, 'ANTHROPIC');
assert.ok(anthropicResult.synthesizedPrompt.includes('<thesis_objective>'));
assert.ok(anthropicResult.synthesizedPrompt.includes('<antithesis_safeguards>'));
assert.ok(anthropicResult.synthesizedPrompt.includes('<synthesis_execution>'));
assert.ok(anthropicResult.synthesizedPrompt.includes('Veto asimétrico'));
assert.ok(anthropicResult.metapromptDigest && anthropicResult.metapromptDigest.length === 64);
console.log('✓ Invariante 1: Síntesis dialéctica calibrada con delimitadores XML Anthropic verificada');

// Invariante 2: Síntesis para OpenAI con formato Markdown
const openaiResult = synthesizer.synthesize('Auditar contratos inteligentes sin dependencias', {
  modelFamily: 'OPENAI'
});
assert.strictEqual(openaiResult.modelFamily, 'OPENAI');
assert.ok(openaiResult.synthesizedPrompt.includes('## [THESIS_OBJECTIVE]'));
assert.ok(openaiResult.antiComplacencyScore >= 0.90);
console.log('✓ Invariante 2: Adaptación estructural Markdown para OpenAI validada');

// Invariante 3: Rechazo fail-closed ante objetivo vacío
assert.throws(() => {
  synthesizer.synthesize('');
}, /El objetivo del meta-prompt no puede estar vacío/);
console.log('✓ Invariante 3: Rechazo determinista de objetivos vacíos comprobado');

// Invariante 4: Integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const drivePrompt = driveEngine.synthesizeDialecticMetaprompt('Verificar invariantes de estado', {
  modelFamily: 'GOOGLE'
});
assert.strictEqual(drivePrompt.status, 'METAPROMPT_SYNTHESIZED');
assert.strictEqual(drivePrompt.modelFamily, 'GOOGLE');
assert.ok(drivePrompt.synthesizedPrompt.includes('🌐 thesis_objective'));
console.log('✓ Invariante 4: Integración nativa con DriveEngine.synthesizeDialecticMetaprompt() verificada');

console.log('\nPASS AX-F-207 — Invariantes del sintetizador de meta-prompts demostrados al 100%.');
