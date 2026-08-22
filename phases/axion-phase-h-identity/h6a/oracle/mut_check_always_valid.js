'use strict';
/**
 * MUTADOR DE ORÁCULO — `verifyIndependentCheck` siempre devuelve CHECK_VALID.
 *
 * Se precarga con `--require` antes de la suite. Una suite cuyo oráculo sea sano
 * DEBE fallar (exit != 0) al ejecutarse bajo esta mutación, porque todos sus casos
 * de independencia negativa dejan de bloquear.
 *
 * Si la suite sigue saliendo con código 0, su oráculo no puede distinguir un
 * sistema correcto de uno roto: ORACLE_DEFECT.
 */
const path = require('path');

const corpus = path.resolve(process.env.AXION_CORPUS || process.cwd());
const target = path.join(corpus, 'tools', 'check_ed25519.js');

const mod = require(target);
const original = mod.verifyIndependentCheck;

mod.verifyIndependentCheck = function mutated(args) {
  const real = original(args);
  return Object.freeze({
    status: 'CHECK_VALID',
    checkId: real.checkId || 'MUTATED-CHECK',
    checkDigest: real.checkDigest || 'f'.repeat(64),
    keyId: real.keyId || 'ed25519:' + 'f'.repeat(64),
    evidenceHash: real.evidenceHash || 'f'.repeat(64),
  });
};

// Centinela obligatorio: el corredor exige esta marca para aceptar que la
// mutacion se aplico. Sin ella el veredicto es ORACLE_GAP, nunca ORACLE_SOUND.
process.stderr.write('AXION_MUTATION_APPLIED:mut_check_always_valid\n');
