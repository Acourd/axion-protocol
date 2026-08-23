#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol - Autoprueba de la cadena de atestacion (emitir + verificar).
 *
 * QUE ES Y QUE NO ES. Esto NO atesta la mision en curso. Firma un resultado de mision
 * de demostracion con un par de claves generado al vuelo, para comprobar de extremo a
 * extremo que la cadena in-toto v1 -> DSSE -> verificacion sigue intacta.
 *
 * Antes esta herramienta anunciaba "atestacion generada con exito" sin decir nada de
 * eso, y ademas tiraba la clave publica. El resultado era un sobre firmado por una
 * clave que ya no existia: imposible de verificar por nadie, indistinguible a simple
 * vista de una atestacion real. En un producto de gobernanza, una evidencia que parece
 * comprobable y no lo es hace mas dano que no emitir ninguna.
 *
 * Ahora el sobre se emite junto a su clave publica, se verifica en el acto, y todo
 * queda marcado como demostracion tanto en la salida como en el fichero de al lado.
 * Una atestacion de verdad solo la produce workflow_runner.js con una mision VERIFIED.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createAttestation, verifyAttestation, ATTESTATION_STATUS } = require('./attestation.js');

const RAIZ = path.resolve(__dirname, '..');

function resultadoDemostracion() {
  const manifestHash = crypto.createHash('sha256').update('axion-protocol-selftest-manifest').digest('hex');
  const bindingHash = crypto.createHash('sha256').update('axion-protocol-selftest-binding').digest('hex');
  return {
    missionId: 'axion-attestation-selftest',
    status: 'VERIFIED',
    risk: 'LOW',
    evidenceManifest: { hash: manifestHash, binding_hash: bindingHash },
    workflow: {
      history: ['ENTENDER', 'PLANIFICAR', 'GATE', 'TEST', 'CONSTRUIR', 'AUDITAR', 'PROMOVER'],
      version: require(path.join(RAIZ, 'package.json')).version,
    },
    approval: {
      status: 'APPROVED',
      approvalId: 'appr-selftest-001',
      actorId: 'authority:selftest',
      approvalDigest: manifestHash,
      keyId: 'key:selftest-authority-01',
    },
    check: {
      status: 'CHECK_PASSED',
      checkId: 'chk-selftest-001',
      actorId: 'evaluator:selftest-runner',
      checkDigest: manifestHash,
      keyId: 'key:selftest-evaluator-01',
    },
    rollback: { status: 'ROLLBACK_PLAN_ATTACHED' },
  };
}

function emitirYVerificar(dirSalida) {
  const destino = dirSalida || path.join(RAIZ, '.axion', 'attestations');
  fs.mkdirSync(destino, { recursive: true });

  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
  const keyId = 'key:selftest-authority-01';

  const att = createAttestation({ result: resultadoDemostracion(), privateKey, keyId });
  if (att.status !== ATTESTATION_STATUS.VALID) {
    return { pass: false, status: att.status };
  }

  const pubPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();

  // La clave publica viaja con el sobre. Sin ella la firma es indemostrable, y una
  // firma indemostrable no es evidencia: es decoracion.
  const rutaSobre = path.join(destino, 'selftest-attestation.json');
  const rutaClave = path.join(destino, 'selftest-attestation.pub.pem');
  const rutaAviso = path.join(destino, 'README.md');

  fs.writeFileSync(rutaSobre, JSON.stringify(att.envelope, null, 2), 'utf8');
  fs.writeFileSync(rutaClave, pubPem, 'utf8');
  fs.writeFileSync(rutaAviso, [
    '# Atestaciones de este directorio',
    '',
    '`selftest-attestation.json` es una DEMOSTRACION. Firma una mision ficticia con un par',
    'de claves generado al vuelo, y existe solo para comprobar que la cadena in-toto v1 ->',
    'DSSE -> verificacion funciona. No acredita ningun trabajo real.',
    '',
    'Se verifica con:',
    '',
    '```bash',
    'node tools/attestation.js verify .axion/attestations/selftest-attestation.json .axion/attestations/selftest-attestation.pub.pem',
    '```',
    '',
    'Las atestaciones reales las emite `tools/workflow_runner.js` al cerrar una mision en',
    'estado VERIFIED, firmadas con la clave de una autoridad registrada, no con una efimera.',
    '',
  ].join('\n'), 'utf8');

  // Verificar aqui mismo convierte la demostracion en una prueba: si la cadena se
  // rompiera, esta herramienta fallaria en vez de emitir un sobre roto con buena cara.
  // publicKeys es una lista de KeyObject, no un mapa por keyid: el verificador prueba
  // todas las claves contra todas las firmas. Pasarle un objeto lo envuelve en un array
  // de un elemento que no es una clave, y la firma sale invalida sin decir por que.
  const veredicto = verifyAttestation({
    envelope: att.envelope,
    publicKeys: [publicKey],
  });

  return {
    pass: veredicto.status === ATTESTATION_STATUS.VALID,
    status: veredicto.status,
    envelope: att.envelope,
    keyId,
    rutaSobre,
    rutaClave,
    rutaAviso,
  };
}

function main() {
  const args = process.argv.slice(2);
  const iOut = args.indexOf('--out');
  const r = emitirYVerificar(iOut !== -1 ? path.resolve(args[iOut + 1]) : null);

  console.log('=== AUTOPRUEBA DE LA CADENA DE ATESTACION (DEMOSTRACION, NO MISION REAL) ===');
  if (!r.pass) {
    console.error(`FALLO La cadena de atestacion no cierra: ${r.status}`);
    process.exit(1);
  }

  console.log(`  Emision y verificacion: ${r.status}`);
  console.log(`  Tipo de payload:  ${r.envelope.payloadType}`);
  console.log(`  Key ID:           ${r.envelope.signatures[0].keyid}`);
  console.log(`  Firma Ed25519:    ${r.envelope.signatures[0].sig.substring(0, 32)}...`);
  console.log(`  Sobre:            ${path.relative(RAIZ, r.rutaSobre)}`);
  console.log(`  Clave publica:    ${path.relative(RAIZ, r.rutaClave)}`);
  console.log('');
  console.log('  Esto NO atesta la mision en curso. Las atestaciones reales las emite');
  console.log('  workflow_runner.js al cerrar una mision VERIFIED con una autoridad registrada.');
  process.exit(0);
}

if (require.main === module) main();

module.exports = { emitirYVerificar, resultadoDemostracion };
