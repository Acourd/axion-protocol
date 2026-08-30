'use strict';

/**
 * Axion Protocol — Invariantes de Verificación Formal SAT/SMT (DPLL) para Políticas de Riesgo.
 *
 * Valida de forma estricta:
 * 1. Exactitud del solucionador DPLL sobre fórmulas CNF proposicionales (SAT vs UNSAT).
 * 2. Demostración matemática formal de los 4 teoremas de gobernanza:
 *    - Teorema 1: Imposibilidad de ejecución destructiva sin firma Ed25519.
 *    - Teorema 2: Supremacía incondicional del Killswitch.
 *    - Teorema 3: Prevención matemática de ataques de replay de firmas.
 *    - Teorema 4: Acoplamiento obligatorio con IntentContract socrático.
 * 3. Emisión de certificado criptográfico formal en .axion/state/.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const FormalSmtVerifier = require('../../tools/formal_smt_policy_verifier.js');

console.log('=== AX-F-106 Invariantes de Verificación Formal SAT/SMT (DPLL) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const verifier = new FormalSmtVerifier(ROOT);

// 1. Validar exactitud del solver DPLL con problemas canónicos
// Caso SAT: (x1 OR x2) AND (-x1 OR x2) -> Solución x2 = true
const satProblem = [[1, 2], [-1, 2]];
const satRes = verifier.solveDpll(satProblem);
assert.strictEqual(satRes.satisfiable, true, 'El problema canónico debe ser SAT');
assert.strictEqual(satRes.assignment[2], true, 'x2 debe ser true');

// Caso UNSAT: (x1) AND (-x1) -> Contradicción directa
const unsatProblem = [[1], [-1]];
const unsatRes = verifier.solveDpll(unsatProblem);
assert.strictEqual(unsatRes.satisfiable, false, 'La contradicción directa debe ser UNSAT');
console.log('✓ Algoritmo DPLL validado: Resuelve problemas SAT y detecta contradicciones UNSAT');

// 2. Ejecutar verificación formal de los 4 teoremas de seguridad
const proofResults = verifier.verifyAllInvariants();

assert.strictEqual(proofResults.pass, true, 'Todos los teoremas deben ser demostrados formalmente');
assert.strictEqual(proofResults.theoremsProven, 4, 'Deben probarse exactamente los 4 teoremas');
assert.strictEqual(proofResults.theoremsTotal, 4, 'El total evaluado debe ser 4');

for (const theorem of proofResults.theorems) {
  assert.strictEqual(theorem.proven, true, `El teorema ${theorem.id} debe estar formalmente probado`);
  assert.strictEqual(theorem.satResult, 'UNSAT_FORMALLY_PROVEN', `El resultado debe ser UNSAT para ${theorem.id}`);
  console.log(`✓ [${theorem.id}] Demostrado formalmente: ${theorem.name}`);
}

// 3. Validar emisión de certificado criptográfico
assert.ok(proofResults.certificatePath, 'Debe existir la ruta del certificado');
assert.ok(fs.existsSync(proofResults.certificatePath), 'El archivo de certificado debe existir en disco');
console.log(`✓ Certificado formal sellado en: ${proofResults.certificatePath}`);

console.log('\nPASS AX-F-106 — Verificación formal SAT/SMT demostrada al 100% (4/4 teoremas en UNSAT).');
