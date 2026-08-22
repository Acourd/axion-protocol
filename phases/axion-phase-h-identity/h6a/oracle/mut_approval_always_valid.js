'use strict';
/**
 * MUTADOR DE ORÁCULO — `verifyAndConsumeApproval` siempre devuelve APPROVAL_VALID.
 *
 * Anula a la vez la verificación de firma, la independencia y el anti-replay.
 * Una suite con oráculo sano DEBE fallar bajo esta mutación.
 */
const path = require('path');
const crypto = require('crypto');

const corpus = path.resolve(process.env.AXION_CORPUS || process.cwd());
const mod = require(path.join(corpus, 'tools', 'approval_ed25519.js'));

mod.verifyAndConsumeApproval = function mutated({ envelope }) {
  const approval = envelope && envelope.approval ? envelope.approval : {};
  return Object.freeze({
    status: 'APPROVAL_VALID',
    approvalId: approval.approvalId || 'MUTATED-APPROVAL',
    approvalDigest: crypto.createHash('sha256')
      .update(JSON.stringify(approval || {}))
      .digest('hex'),
    keyId: approval.keyId || 'ed25519:' + 'f'.repeat(64),
  });
};

// Centinela obligatorio: el corredor exige esta marca para aceptar que la
// mutacion se aplico. Sin ella el veredicto es ORACLE_GAP, nunca ORACLE_SOUND.
process.stderr.write('AXION_MUTATION_APPLIED:mut_approval_always_valid\n');
