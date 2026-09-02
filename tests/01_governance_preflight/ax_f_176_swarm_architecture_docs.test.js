#!/usr/bin/env node
'use strict';

/**
 * AX-F-176: Invariantes de Especificación de Arquitectura Swarm v2.0
 *
 * Verifica:
 * 1. Existencia y completitud bilingüe de docs/SWARM_ARCHITECTURE.md y docs/SWARM_ARCHITECTURE.es.md.
 * 2. Presencia de los 3 pilares del Swarm (AST Arbiter, P2P Channel, BFT Consensus).
 * 3. Diagramas de arquitectura Mermaid válidos e integrados.
 * 4. Invariante matemática de supermayoría (>= 0.66) y regla de cero dependencias.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('=== AX-F-176: Invariantes de Especificación Swarm v2.0 ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const docEn = path.join(ROOT, 'docs', 'SWARM_ARCHITECTURE.md');
const docEs = path.join(ROOT, 'docs', 'SWARM_ARCHITECTURE.es.md');

assert.ok(fs.existsSync(docEn), 'docs/SWARM_ARCHITECTURE.md debe existir');
assert.ok(fs.existsSync(docEs), 'docs/SWARM_ARCHITECTURE.es.md debe existir');

const contentEn = fs.readFileSync(docEn, 'utf8');
const contentEs = fs.readFileSync(docEs, 'utf8');

// Invariante 1: Diagrama Mermaid presente
assert.ok(contentEn.includes('```mermaid'), 'Debe incluir bloque de diagrama Mermaid en inglés');
assert.ok(contentEs.includes('```mermaid'), 'Debe incluir bloque de diagrama Mermaid en español');
console.log('  ✓ Invariante 1: Diagramas de arquitectura Mermaid verificados.');

// Invariante 2: Los 3 pilares detallados
const pilares = ['SwarmASTArbiter', 'SwarmP2PChannel', 'SwarmConsensusArbiter'];
for (const p of pilares) {
  assert.ok(contentEn.includes(p), `El documento en inglés debe detallar ${p}`);
  assert.ok(contentEs.includes(p), `El documento en español debe detallar ${p}`);
}
console.log('  ✓ Invariante 2: Los 3 pilares soberanos verificados en ambas lenguas.');

// Invariante 3: Invariante matemática y regla de cero dependencias
assert.ok(contentEn.includes('0.66'), 'Debe documentar el quórum de 0.66 en inglés');
assert.ok(contentEs.includes('0.66'), 'Debe documentar el quórum de 0.66 en español');
assert.ok(contentEn.includes('Zero External Dependencies'), 'Debe ratificar cero dependencias');
assert.ok(contentEs.includes('Cero Dependencias Externas'), 'Debe ratificar cero dependencias');
console.log('  ✓ Invariante 3: Regla matemática y de pureza de runtime verificadas.');

console.log('\nPASS: AX-F-176 — Especificación Swarm v2.0 verificada con 3/3 invariantes en verde.');
