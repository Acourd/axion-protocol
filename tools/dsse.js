'use strict';

/**
 * Axion Protocol - Sobres DSSE (Dead Simple Signing Envelope).
 *
 * Por que existe este modulo: hasta ahora Axion firmaba sus artefactos en un formato
 * propio. Funciona, pero solo Axion sabe leerlo, asi que su evidencia no la puede
 * verificar nadie mas. DSSE es el sobre que usan in-toto, SLSA, cosign y las
 * atestaciones de GitHub; hablarlo convierte la evidencia en algo comprobable con
 * herramientas que ya existen.
 *
 * Lo que NO hace: no sustituye el formato interno. El sobre propio sigue gobernando el
 * gating, y la capa Ed25519 no se rediseña —resistio la reauditoria de Fase G y esta
 * fuera del alcance de Fase H—. Esto es una capa de exportacion, no un reemplazo.
 *
 * El detalle que importa: la firma NO se hace sobre el payload, sino sobre su PAE
 * (Pre-Authentication Encoding), que incorpora el tipo de payload a lo firmado:
 *
 *   PAE(type, body) = "DSSEv1" SP LEN(type) SP type SP LEN(body) SP body
 *
 * donde SP es un espacio ASCII y LEN es la longitud EN BYTES en decimal ASCII. Sin eso,
 * una firma valida para un tipo de documento podria reutilizarse haciendola pasar por
 * otro. El test correspondiente comprueba justo esa reutilizacion.
 *
 * Referencia: https://github.com/secure-systems-lab/dsse
 */

const crypto = require('crypto');

const DSSE_STATUS = Object.freeze({
  VALID: 'DSSE_VALID',
  MALFORMED: 'DSSE_MALFORMED',
  INVALID_SIGNATURE: 'DSSE_INVALID_SIGNATURE',
  NO_SIGNATURES: 'DSSE_NO_SIGNATURES',
  UNKNOWN_KEY: 'DSSE_UNKNOWN_KEY',
});

/**
 * PAE, byte a byte segun la especificacion.
 * Las longitudes son de BYTES, no de caracteres: con UTF-8 multibyte no coinciden, y
 * usar la longitud de la cadena romperia la interoperabilidad en silencio.
 */
function pae(payloadType, body) {
  const tipo = Buffer.from(String(payloadType), 'utf8');
  const cuerpo = Buffer.isBuffer(body) ? body : Buffer.from(String(body), 'utf8');
  return Buffer.concat([
    Buffer.from('DSSEv1', 'utf8'),
    Buffer.from(' ', 'utf8'),
    Buffer.from(String(tipo.length), 'utf8'),
    Buffer.from(' ', 'utf8'),
    tipo,
    Buffer.from(' ', 'utf8'),
    Buffer.from(String(cuerpo.length), 'utf8'),
    Buffer.from(' ', 'utf8'),
    cuerpo,
  ]);
}

function esClavePrivadaEd25519(clave) {
  const k = clave instanceof crypto.KeyObject ? clave : crypto.createPrivateKey(clave);
  if (k.type !== 'private' || k.asymmetricKeyType !== 'ed25519') {
    throw new TypeError('Se requiere una clave privada Ed25519.');
  }
  return k;
}

function esClavePublicaEd25519(clave) {
  const k = clave instanceof crypto.KeyObject ? clave : crypto.createPublicKey(clave);
  if (k.type !== 'public' || k.asymmetricKeyType !== 'ed25519') {
    throw new TypeError('Se requiere una clave publica Ed25519.');
  }
  return k;
}

/**
 * Envuelve y firma. `body` es el documento serializado; `payloadType` lo identifica y
 * queda vinculado a la firma.
 */
function signEnvelope({ payloadType, body, privateKey, keyId = null }) {
  if (typeof payloadType !== 'string' || payloadType.trim() === '') {
    throw new TypeError('payloadType es obligatorio: es lo que ata la firma a un tipo de documento.');
  }
  const cuerpo = Buffer.isBuffer(body) ? body : Buffer.from(String(body), 'utf8');
  const clave = esClavePrivadaEd25519(privateKey);
  const firma = crypto.sign(null, pae(payloadType, cuerpo), clave);

  const sig = { sig: firma.toString('base64') };
  // keyid es una pista NO autenticada; la especificacion lo dice y conviene recordarlo:
  // no se puede confiar en el para decidir nada, solo para elegir que clave probar.
  if (typeof keyId === 'string' && keyId !== '') sig.keyid = keyId;

  return {
    payload: cuerpo.toString('base64'),
    payloadType,
    signatures: [sig],
  };
}

function envelopeMalformado(envelope) {
  return !envelope
    || typeof envelope !== 'object'
    || Array.isArray(envelope)
    || typeof envelope.payload !== 'string'
    || typeof envelope.payloadType !== 'string'
    || envelope.payloadType.trim() === ''
    || !Array.isArray(envelope.signatures);
}

/**
 * Verifica un sobre contra una o varias claves publicas. Nunca lanza: devuelve un
 * veredicto, como el resto de primitivas del proyecto.
 *
 * `expectedPayloadType` es opcional pero recomendable: verificar sin fijar el tipo
 * esperado desaprovecha media proteccion del PAE.
 */
function verifyEnvelope({ envelope, publicKeys, expectedPayloadType = null }) {
  if (envelopeMalformado(envelope)) {
    return Object.freeze({ status: DSSE_STATUS.MALFORMED });
  }
  if (envelope.signatures.length === 0) {
    return Object.freeze({ status: DSSE_STATUS.NO_SIGNATURES });
  }
  if (expectedPayloadType !== null && envelope.payloadType !== expectedPayloadType) {
    // No es "firma invalida": es un documento de otro tipo. Distinguirlo importa
    // para que quien lea el error entienda que no le han dado lo que pidio.
    return Object.freeze({ status: DSSE_STATUS.MALFORMED, reason: 'PAYLOAD_TYPE_MISMATCH' });
  }

  let cuerpo;
  try {
    cuerpo = Buffer.from(envelope.payload, 'base64');
  } catch (_) {
    return Object.freeze({ status: DSSE_STATUS.MALFORMED });
  }

  let claves = [];
  if (Array.isArray(publicKeys)) {
    claves = publicKeys;
  } else if (publicKeys && typeof publicKeys === 'object' && !(publicKeys instanceof crypto.KeyObject) && !Buffer.isBuffer(publicKeys)) {
    claves = Object.values(publicKeys);
  } else if (publicKeys) {
    claves = [publicKeys];
  }
  if (claves.length === 0) return Object.freeze({ status: DSSE_STATUS.UNKNOWN_KEY });

  const mensaje = pae(envelope.payloadType, cuerpo);

  for (const firma of envelope.signatures) {
    if (!firma || typeof firma.sig !== 'string') continue;
    let bytesFirma;
    try {
      bytesFirma = Buffer.from(firma.sig, 'base64');
    } catch (_) { continue; }

    for (const clavePublica of claves) {
      let clave;
      try { clave = esClavePublicaEd25519(clavePublica); } catch (_) { continue; }
      let ok = false;
      try { ok = crypto.verify(null, mensaje, clave, bytesFirma); } catch (_) { ok = false; }
      if (ok) {
        return Object.freeze({
          status: DSSE_STATUS.VALID,
          payloadType: envelope.payloadType,
          body: cuerpo.toString('utf8'),
          keyid: typeof firma.keyid === 'string' ? firma.keyid : null,
        });
      }
    }
  }

  return Object.freeze({ status: DSSE_STATUS.INVALID_SIGNATURE });
}

module.exports = { DSSE_STATUS, pae, signEnvelope, verifyEnvelope };
