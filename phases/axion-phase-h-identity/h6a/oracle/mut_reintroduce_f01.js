'use strict';
/**
 * MUTADOR DIRIGIDO — reintroduce exactamente la vulnerabilidad F-01.
 *
 * Objetivo: ejercer la rama `failed > 0` de `tests/phase_e/role_separation.test.js`
 * SIN activar la rama `invalidTests > 0`, que es la que la mutación amplia
 * `mut_check_always_valid.js` alcanzaba y que enmascaraba el defecto G6.
 *
 * Estructura de la suite objetivo:
 *
 *     if (invalidTests > 0) { ... process.exit(2); }   <- rama alcanzada por la mutacion amplia
 *     if (failed > 0)       { ... process.exit(0); }   <- RAMA DEFECTUOSA, objetivo de este mutador
 *                             ... process.exit(0);
 *
 * `expectStatus(..., isRedTest)` clasifica cada discrepancia:
 *   - isRedTest = true  -> failed++        (casos 1, 3, 4, 9 y la rama VALID del caso 10)
 *   - isRedTest = false -> invalidTests++  (casos 2, 5, 6, 7, 8)
 *
 * Para aterrizar sólo en `failed` hay que alterar exclusivamente el comportamiento
 * de los casos rojos que dependen de `verifyAndConsumeApproval`, dejando intactos
 * los casos verdes y todo `verifyIndependentCheck`.
 *
 * Mutación quirúrgica: cuando la aprobación se rechaza por autoaprobación
 * (APPROVAL_NOT_INDEPENDENT), devolver APPROVAL_VALID. Es, literalmente, el
 * corpus anterior al parche de Fase G.
 *
 * Efecto esperado sobre la suite:
 *   caso 1  -> APPROVAL_VALID != APPROVAL_NOT_INDEPENDENT, rojo -> failed++
 *   caso 4  -> idem                                              -> failed++
 *   caso 10 -> rama `status === APPROVAL_VALID`                   -> failed++
 *   caso 5  -> actores distintos, sin mutacion  -> assert intacto -> passed
 *   caso 7  -> sobre ausente, sin mutacion                        -> passed
 *   casos 2, 3, 6, 8, 9 -> dependen del CHECK, sin tocar          -> passed
 *
 *   invalidTests = 0  ->  no se toma la rama exit(2)
 *   failed       = 3  ->  se toma la rama exit(0)   <- DEFECTO DEMOSTRADO
 */
const path = require('path');
const crypto = require('crypto');

const corpus = path.resolve(process.env.AXION_CORPUS || process.cwd());
const mod = require(path.join(corpus, 'tools', 'approval_ed25519.js'));
const original = mod.verifyAndConsumeApproval;

mod.verifyAndConsumeApproval = function reintroducedF01(args) {
  const real = original(args);
  if (real.status !== 'APPROVAL_NOT_INDEPENDENT') return real;

  // Estado pre-parche: la autoaprobación se aceptaba como válida.
  const approval = args && args.envelope && args.envelope.approval ? args.envelope.approval : {};
  return Object.freeze({
    status: 'APPROVAL_VALID',
    approvalId: approval.approvalId || 'F01-REINTRODUCED',
    approvalDigest: crypto.createHash('sha256')
      .update(JSON.stringify(approval))
      .digest('hex'),
    keyId: approval.keyId || `ed25519:${'0'.repeat(64)}`,
  });
};

// Centinela obligatorio: el corredor exige esta marca para aceptar que la
// mutacion se aplico. Sin ella el veredicto es ORACLE_GAP, nunca ORACLE_SOUND.
process.stderr.write('AXION_MUTATION_APPLIED:mut_reintroduce_f01\n');
