'use strict';

/**
 * Atestaciones DSSE + in-toto — interoperabilidad de la evidencia.
 *
 * Hasta ahora Axion firmaba en un formato propio: correcto, pero ilegible para todo lo
 * demas. Esta capa expresa el veredicto de una mision como un in-toto Statement v1 en un
 * sobre DSSE, que es lo que hablan SLSA, cosign y las atestaciones de GitHub.
 *
 * La prueba central es la 3. DSSE no firma el payload: firma su PAE, que incorpora el
 * tipo de documento a lo firmado. Si el PAE estuviera mal construido, una firma emitida
 * para un tipo podria reutilizarse haciendola pasar por otro, y todo el formato dejaria
 * de servir para lo unico que justifica su existencia. Ese test lo intenta de verdad.
 */

const assert = require('assert');
const crypto = require('crypto');
const path = require('path');

const { DSSE_STATUS, pae, signEnvelope, verifyEnvelope } = require('../../tools/dsse.js');
const {
  ATTESTATION_STATUS,
  STATEMENT_TYPE,
  PAYLOAD_TYPE,
  PREDICATE_TYPE,
  buildStatement,
  createAttestation,
  verifyAttestation,
} = require('../../tools/attestation.js');
const { executeHybridWorkflow } = require('../../tools/workflow_runner.js');
const { createLowRiskFixture } = require('../trust_fixture.js');

const ROOT = path.join(__dirname, '..', '..');
let n = 0;
const ok = (d) => console.log(`  [${++n}] PASS: ${d}`);

console.log('=== Atestaciones DSSE + in-toto ===\n');

// --- 1. El PAE coincide byte a byte con el ejemplo de la especificacion -----
// Si esto falla, nada de lo demas interopera, por muy verde que salga el resto.
{
  const esperado = 'DSSEv1 29 http://example.com/HelloWorld 11 hello world';
  const obtenido = pae('http://example.com/HelloWorld', 'hello world').toString('utf8');
  assert.strictEqual(obtenido, esperado, 'el PAE debe seguir la especificacion al byte');
  ok('el PAE reproduce el ejemplo de la especificacion DSSE');
}

// --- 2. Las longitudes del PAE son de bytes, no de caracteres --------------
// Con UTF-8 multibyte no coinciden. Usar la longitud de la cadena romperia la
// interoperabilidad en silencio, que es la peor forma de romperla.
{
  const tipo = 'tipo/ñ';                     // 7 bytes, 6 caracteres
  const cuerpo = 'áé';                       // 4 bytes, 2 caracteres
  const texto = pae(tipo, cuerpo).toString('utf8');
  assert.ok(texto.startsWith('DSSEv1 7 tipo/ñ 4 '),
    `las longitudes deben contarse en bytes; se obtuvo: ${texto}`);
  ok('las longitudes del PAE se cuentan en bytes, no en caracteres');
}

// --- 3. Una firma no se puede reutilizar bajo otro payloadType -------------
// El motivo de existir del PAE, comprobado intentando el ataque.
{
  const claves = crypto.generateKeyPairSync('ed25519');
  const cuerpo = JSON.stringify({ afirmacion: 'esto es inofensivo' });

  const legitimo = signEnvelope({
    payloadType: 'application/vnd.axion.inofensivo+json',
    body: cuerpo,
    privateKey: claves.privateKey,
  });

  assert.strictEqual(
    verifyEnvelope({ envelope: legitimo, publicKeys: [claves.publicKey] }).status,
    DSSE_STATUS.VALID,
    'el sobre legitimo debe verificar',
  );

  // Mismo payload, misma firma, otro tipo declarado.
  const suplantado = { ...legitimo, payloadType: PAYLOAD_TYPE };
  assert.strictEqual(
    verifyEnvelope({ envelope: suplantado, publicKeys: [claves.publicKey] }).status,
    DSSE_STATUS.INVALID_SIGNATURE,
    'una firma emitida para un tipo NO puede valer para otro',
  );
  ok('una firma no se puede reutilizar cambiando el payloadType');
}

// --- 4. Alterar el payload invalida la firma -------------------------------
{
  const claves = crypto.generateKeyPairSync('ed25519');
  const sobre = signEnvelope({
    payloadType: PAYLOAD_TYPE,
    body: JSON.stringify({ a: 1 }),
    privateKey: claves.privateKey,
  });
  const alterado = {
    ...sobre,
    payload: Buffer.from(JSON.stringify({ a: 2 }), 'utf8').toString('base64'),
  };
  assert.strictEqual(
    verifyEnvelope({ envelope: alterado, publicKeys: [claves.publicKey] }).status,
    DSSE_STATUS.INVALID_SIGNATURE,
  );
  ok('alterar el payload invalida la firma');
}

// --- 5. Una clave ajena no verifica ----------------------------------------
{
  const propias = crypto.generateKeyPairSync('ed25519');
  const ajenas = crypto.generateKeyPairSync('ed25519');
  const sobre = signEnvelope({
    payloadType: PAYLOAD_TYPE,
    body: JSON.stringify({ a: 1 }),
    privateKey: propias.privateKey,
  });
  assert.strictEqual(
    verifyEnvelope({ envelope: sobre, publicKeys: [ajenas.publicKey] }).status,
    DSSE_STATUS.INVALID_SIGNATURE,
  );
  ok('una clave que no firmo no verifica el sobre');
}

// --- 6. Solo se atestigua lo verificado ------------------------------------
// Una atestacion afirma "esto ocurrio y se comprobo". Emitirla sobre una mision
// bloqueada seria justo la afirmacion sin respaldo que este proyecto evita.
{
  assert.strictEqual(buildStatement({ status: 'BLOCKED_APPROVAL_MISSING' }).reason,
    ATTESTATION_STATUS.NOT_VERIFIED);
  assert.strictEqual(buildStatement(null).reason, ATTESTATION_STATUS.NOT_VERIFIED);
  assert.strictEqual(buildStatement({ status: 'VERIFIED' }).reason, ATTESTATION_STATUS.MALFORMED,
    'sin huella de evidencia no hay nada que atestiguar');
  ok('solo una mision VERIFIED con evidencia puede atestiguarse');
}

// --- 7. Extremo a extremo sobre una mision real ----------------------------
{
  const f = createLowRiskFixture({
    missionId: 'AX-ATT-001',
    assertions: ['comprobacion de atestacion'],
    modifiedFiles: [path.join(ROOT, 'tools', 'preflight.js')],
  });
  const resultado = executeHybridWorkflow(f.payload, f.runtime);
  assert.strictEqual(resultado.status, 'VERIFIED', 'la mision de partida debe verificarse');

  const claves = crypto.generateKeyPairSync('ed25519');
  const att = createAttestation({
    result: resultado,
    privateKey: claves.privateKey,
    keyId: 'ed25519:pruebas',
  });
  assert.strictEqual(att.status, ATTESTATION_STATUS.VALID);

  // Forma exigida por in-toto v1.
  assert.strictEqual(att.statement._type, STATEMENT_TYPE);
  assert.strictEqual(att.statement.predicateType, PREDICATE_TYPE);
  assert.strictEqual(att.envelope.payloadType, PAYLOAD_TYPE,
    'in-toto exige exactamente este payloadType, o las herramientas ajenas no lo reconoceran');
  assert.ok(Array.isArray(att.statement.subject) && att.statement.subject.length > 0);
  assert.match(att.statement.subject[0].digest.sha256, /^[a-f0-9]{64}$/);

  // El predicado lleva las identidades verificadas, que es lo que da valor a la atestacion.
  assert.strictEqual(att.statement.predicate.roles.auditor, 'legacy-independent-auditor');
  assert.strictEqual(att.statement.predicate.roles.executor, 'legacy-executor');
  assert.strictEqual(att.statement.predicate.outcome, 'VERIFIED');
  ok('una mision verificada produce un Statement in-toto bien formado');

  // Y se verifica de vuelta.
  const v = verifyAttestation({ envelope: att.envelope, publicKeys: [claves.publicKey] });
  assert.strictEqual(v.status, ATTESTATION_STATUS.VALID);
  assert.strictEqual(v.statement.predicate.missionId, 'AX-ATT-001');
  assert.strictEqual(v.keyid, 'ed25519:pruebas');
  ok('la atestacion se verifica y devuelve el Statement intacto');

  // Un Statement de otro tipo no cuela como atestacion de Axion.
  const otro = signEnvelope({
    payloadType: PAYLOAD_TYPE,
    body: JSON.stringify({
      _type: STATEMENT_TYPE,
      subject: [{ name: 'x', digest: { sha256: 'a'.repeat(64) } }],
      predicateType: 'https://slsa.dev/provenance/v1',
      predicate: {},
    }),
    privateKey: claves.privateKey,
  });
  assert.strictEqual(
    verifyAttestation({ envelope: otro, publicKeys: [claves.publicKey] }).status,
    ATTESTATION_STATUS.MALFORMED,
    'un Statement in-toto de otro predicado no es una atestacion de Axion',
  );
  ok('un Statement de otro predicateType no se acepta como propio');
}

// --- 8. Sobres malformados se rechazan sin lanzar --------------------------
{
  const claves = crypto.generateKeyPairSync('ed25519');
  const malos = [
    null,
    {},
    { payload: 'x', payloadType: '', signatures: [] },
    { payload: 'x', payloadType: PAYLOAD_TYPE, signatures: 'no-es-array' },
  ];
  for (const envelope of malos) {
    const r = verifyEnvelope({ envelope, publicKeys: [claves.publicKey] });
    assert.notStrictEqual(r.status, DSSE_STATUS.VALID, 'un sobre malformado nunca es valido');
  }
  const sinFirmas = { payload: 'eA==', payloadType: PAYLOAD_TYPE, signatures: [] };
  assert.strictEqual(
    verifyEnvelope({ envelope: sinFirmas, publicKeys: [claves.publicKey] }).status,
    DSSE_STATUS.NO_SIGNATURES,
  );
  ok('los sobres malformados se rechazan con un veredicto, sin excepciones');
}

console.log(`\nPASS atestaciones - ${n} comprobaciones`);
