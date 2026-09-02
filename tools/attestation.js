#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol - Atestaciones in-toto.
 *
 * Expresa el veredicto de una mision verificada como un in-toto Statement v1 dentro de
 * un sobre DSSE. A partir de aqui la evidencia de Axion deja de ser un dialecto privado:
 * la puede verificar cualquier herramienta que hable in-toto.
 *
 * Estructura (spec v1):
 *
 *   {
 *     "_type": "https://in-toto.io/Statement/v1",
 *     "subject": [{ "name": "<mision>", "digest": { "sha256": "<hex>" } }],
 *     "predicateType": "<URI>",
 *     "predicate": { ...hechos de gobernanza... }
 *   }
 *
 * El subject es la evidencia de la mision, no un binario: lo que Axion atestigua no es
 * "este fichero se construyo asi", sino "esta mision recorrio las siete fases y aqui
 * esta la huella que lo demuestra".
 *
 * Regla que se hereda de AX-NC-0001: el predicado se construye SOLO con valores que las
 * primitivas ya verificaron y devolvieron. Nunca se releen del payload original.
 */

const crypto = require('crypto');
const { canonicalize } = require('./canonical_json.js');
const { DSSE_STATUS, signEnvelope, verifyEnvelope } = require('./dsse.js');

const STATEMENT_TYPE = 'https://in-toto.io/Statement/v1';
const PAYLOAD_TYPE = 'application/vnd.in-toto+json';
const PREDICATE_TYPE = 'https://axion-protocol.org/attestation/workflow/v1';

const ATTESTATION_STATUS = Object.freeze({
  VALID: 'ATTESTATION_VALID',
  NOT_VERIFIED: 'ATTESTATION_SOURCE_NOT_VERIFIED',
  MALFORMED: 'ATTESTATION_MALFORMED',
  INVALID_SIGNATURE: 'ATTESTATION_INVALID_SIGNATURE',
});

const esHex64 = (v) => typeof v === 'string' && /^[a-f0-9]{64}$/i.test(v);

/**
 * Construye el Statement a partir del resultado de executeHybridWorkflow.
 *
 * Solo se atestiguan misiones VERIFIED. Emitir una atestacion de algo bloqueado seria
 * exactamente el genero de afirmacion sin respaldo que este proyecto existe para evitar:
 * una atestacion dice "esto ocurrio y se comprobo", no "esto se intento".
 */
function buildStatement(resultado) {
  if (!resultado || typeof resultado !== 'object' || resultado.status !== 'VERIFIED') {
    return { ok: false, reason: ATTESTATION_STATUS.NOT_VERIFIED };
  }

  const { check, approval, rollback, evidenceManifest, workflow } = resultado;
  const digest = evidenceManifest && typeof evidenceManifest.hash === 'string'
    ? evidenceManifest.hash.toLowerCase()
    : null;

  if (!esHex64(digest)) {
    return { ok: false, reason: ATTESTATION_STATUS.MALFORMED };
  }

  const statement = {
    _type: STATEMENT_TYPE,
    subject: [{
      name: `axion:mission:${resultado.missionId}`,
      digest: { sha256: digest },
    }],
    predicateType: PREDICATE_TYPE,
    predicate: {
      missionId: resultado.missionId,
      risk: resultado.risk,
      outcome: 'VERIFIED',
      // Identidades verificadas. Se declaran por separado porque la propiedad que
      // Axion pretende demostrar es justamente que son distintas entre si.
      roles: {
        executor: (check && check.executorActorId) || null,
        auditor: (check && check.actorId) || null,
        approver: (approval && approval.actorId) || null,
      },
      // Sin esto, las tres identidades de arriba parecerian constar igual de bien.
      // No es asi: dos vienen de firmas verificadas y la del ejecutor la escribio el
      // propio ejecutor. Quien reciba la atestacion tiene derecho a saberlo.
      assurance: resultado.assurance || null,
      approval: approval ? {
        status: approval.status,
        approvalId: approval.approvalId || null,
        digest: approval.approvalDigest || null,
        keyId: approval.keyId || null,
      } : null,
      check: check ? {
        status: check.status,
        checkId: check.checkId || null,
        digest: check.checkDigest || null,
        keyId: check.keyId || null,
      } : null,
      rollback: rollback ? { status: rollback.status } : null,
      evidence: {
        manifestHash: digest,
        bindingHash: evidenceManifest.binding_hash
          ? evidenceManifest.binding_hash.toLowerCase()
          : null,
      },
      workflow: {
        // La secuencia de fases recorrida: es lo que distingue "paso los siete pasos"
        // de "alguien declaro que los paso".
        phases: workflow && Array.isArray(workflow.history)
          ? workflow.history.map((h) => (typeof h === 'string' ? h : h && h.phase)).filter(Boolean)
          : [],
        state: workflow ? workflow.state || null : null,
      },
    },
  };

  return { ok: true, statement };
}

/**
 * Statement + sobre DSSE firmado. `canonical` deja el JSON en forma estable para que
 * dos ejecuciones del mismo veredicto produzcan bytes identicos.
 */
function createAttestation({ result, privateKey, keyId = null }) {
  const construido = buildStatement(result);
  if (!construido.ok) return Object.freeze({ status: construido.reason });

  const cuerpo = canonicalize(construido.statement);
  const envelope = signEnvelope({
    payloadType: PAYLOAD_TYPE,
    body: cuerpo,
    privateKey,
    keyId,
  });

  return Object.freeze({
    status: ATTESTATION_STATUS.VALID,
    envelope,
    statement: construido.statement,
  });
}

/**
 * Verifica un sobre y devuelve el Statement que contiene, comprobando ademas que sea
 * realmente una atestacion de Axion y no otro documento in-toto cualquiera.
 */
function verifyAttestation({ envelope, publicKeys }) {
  const veredicto = verifyEnvelope({
    envelope,
    publicKeys,
    expectedPayloadType: PAYLOAD_TYPE,
  });

  if (veredicto.status === DSSE_STATUS.INVALID_SIGNATURE) {
    return Object.freeze({ status: ATTESTATION_STATUS.INVALID_SIGNATURE });
  }
  if (veredicto.status !== DSSE_STATUS.VALID) {
    return Object.freeze({ status: ATTESTATION_STATUS.MALFORMED, dsse: veredicto.status });
  }

  let statement;
  try {
    statement = JSON.parse(veredicto.body);
  } catch (_) {
    return Object.freeze({ status: ATTESTATION_STATUS.MALFORMED });
  }

  if (!statement || statement._type !== STATEMENT_TYPE
      || statement.predicateType !== PREDICATE_TYPE
      || !Array.isArray(statement.subject) || statement.subject.length === 0
      || !statement.subject[0] || !statement.subject[0].digest
      || !esHex64(statement.subject[0].digest.sha256)) {
    return Object.freeze({ status: ATTESTATION_STATUS.MALFORMED });
  }

  return Object.freeze({
    status: ATTESTATION_STATUS.VALID,
    statement,
    keyid: veredicto.keyid,
  });
}

const USO = [
  'Uso:',
  '  node tools/attestation.js verify <sobre.json> <clave-publica.pem>',
  '',
  'Emite y verifica atestaciones in-toto v1 en sobres DSSE. El sobre es el mismo formato',
  'que usan in-toto, SLSA y cosign, asi que la evidencia de una mision verificada puede',
  'comprobarse con herramientas ajenas a este proyecto.',
  '',
  `  payloadType    ${PAYLOAD_TYPE}`,
  `  predicateType  ${PREDICATE_TYPE}`,
  '',
  'Para emitirla hace falta el resultado de una mision VERIFIED, asi que se genera desde',
  'codigo con createAttestation(); no hay forma de fabricar una desde la linea de comandos.',
  '',
  'Codigos de salida: 0 valida, 1 invalida, 2 uso incorrecto.',
].join('\n');

function main() {
  const [accion, rutaSobre, rutaClave] = process.argv.slice(2);
  if (accion !== 'verify' || !rutaSobre || !rutaClave) {
    console.log(USO);
    process.exit(2);
  }

  const fs = require('fs');
  let envelope;
  try {
    envelope = JSON.parse(fs.readFileSync(rutaSobre, 'utf8'));
  } catch (error) {
    console.log(JSON.stringify({ status: ATTESTATION_STATUS.MALFORMED, reason: error.message }, null, 2));
    process.exit(1);
  }

  let clave;
  try {
    clave = crypto.createPublicKey(fs.readFileSync(rutaClave, 'utf8'));
  } catch (error) {
    console.log(JSON.stringify({ status: 'PUBLIC_KEY_UNREADABLE', reason: error.message }, null, 2));
    process.exit(2);
  }

  const veredicto = verifyAttestation({ envelope, publicKeys: [clave] });
  console.log(JSON.stringify(veredicto, null, 2));
  process.exit(veredicto.status === ATTESTATION_STATUS.VALID ? 0 : 1);
}

if (require.main === module) main();

module.exports = {
  ATTESTATION_STATUS,
  STATEMENT_TYPE,
  PAYLOAD_TYPE,
  PREDICATE_TYPE,
  buildStatement,
  createAttestation,
  verifyAttestation,
  USO,
};
