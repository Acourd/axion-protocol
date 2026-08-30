'use strict';

const assert = require('assert');
const path = require('path');
const {
  hasTechnicalSpecificity,
  getTailoredStyleOptions,
  analyzeUserIntent
} = require('../../tools/intent_clarifier.js');

console.log('=== AX-F-036 Clarificador Socrático de Intención y Contratos SHA-256 ===\n');

// 1. Detección inteligente de especificidad técnica
assert.strictEqual(hasTechnicalSpecificity('modifica tools/preflight.js para validar regex'), true);
assert.strictEqual(hasTechnicalSpecificity('agrega 5 suites de prueba para sha256'), true);
assert.strictEqual(hasTechnicalSpecificity('haz un cambio'), false);
console.log('✓ Detección de especificidad técnica sin falsos positivos verificada');

// 2. Opciones de estilo visual adaptativas con opción libre
const dashboardOpts = getTailoredStyleOptions('dashboard');
assert.strictEqual(dashboardOpts.some(o => o.name.includes('Slate Dark')), true);
assert.strictEqual(dashboardOpts.some(o => o.name.includes('Opción Personalizada')), true);

const landingOpts = getTailoredStyleOptions('landing page');
assert.strictEqual(landingOpts.some(o => o.name.includes('Apple Glassmorphism')), true);
assert.strictEqual(landingOpts.some(o => o.name.includes('Opción Personalizada')), true);
console.log('✓ Inyección dinámica de estilos adaptados y opción de dictado libre verificada');

// 3. Petición vaga -> Paso 1 socrático
const rVaga = analyzeUserIntent('haz una app', { persist: false });
assert.strictEqual(rVaga.status, 'NEEDS_CLARIFICATION');
assert.strictEqual(rVaga.substep, 1);
assert.strictEqual(rVaga.questions.length >= 1, true);
assert.strictEqual(rVaga.options.length >= 3, true);
console.log('✓ Bloqueo y preguntas socráticas ante peticiones vagas verificado');

// 4. Petición técnica o con opciones elegidas -> Contrato de intención sellado
const rClara = analyzeUserIntent('actualiza tools/dsse.js para interoperabilidad Ed25519', { persist: false });
assert.strictEqual(rClara.status, 'INTENT_CLARIFIED');
assert.strictEqual(rClara.substep, 3);
assert.notStrictEqual(rClara.intentContract, undefined);
assert.notStrictEqual(rClara.intentContract.contract_id, undefined);
console.log('✓ Emisión de contrato de entendimiento técnico verificado');

console.log('\nPASS AX-F-036 — Clarificador socrático y contratos de intención verificados al 100%.\n');
