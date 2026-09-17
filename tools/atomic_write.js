'use strict';

/**
 * Axion Protocol — Escritura atómica e idempotente para rutas compartidas.
 *
 * Problema: varios procesos legítimos (suites concurrentes) pueden escribir el MISMO
 * archivo destino con el MISMO contenido (atestaciones deterministas, evidencia
 * direccionada por contenido, reglas canónicas). El patrón tmp+rename clásico puede
 * fallar en Windows con EPERM/EBUSY cuando otro proceso reemplaza el destino entre
 * medias, y puede pisar bytes de otro escritor.
 *
 * Contrato:
 *  1. Idempotencia: si el destino ya tiene exactamente el contenido deseado, no se toca.
 *  2. Escritura a un tmp único por proceso y reintento acotado del rename ante
 *     violaciones de sharing (EPERM/EACCES/EBUSY/EEXIST), fail-closed al agotar.
 *  3. El tmp se limpia siempre (best-effort): nunca quedan residuos.
 */

const fs = require('fs');
const crypto = require('crypto');

const ERRORES_REINTENTABLES = new Set(['EPERM', 'EACCES', 'EBUSY', 'EEXIST']);

function dormirSync(ms) {
  const señal = new Int32Array(new SharedArrayBuffer(4));
  Atomics.wait(señal, 0, 0, ms);
}

function writeFileAtomicSync(filePath, content, options = {}) {
  const maxIntentos = options.maxIntentos || 10;
  const deseado = Buffer.isBuffer(content) ? content : Buffer.from(String(content), 'utf8');

  try {
    if (fs.readFileSync(filePath).equals(deseado)) {
      return { escrito: false, ruta: filePath };
    }
  } catch (_) {
    // No existe o no es legible: se procede a escribir.
  }

  const tmpPath = `${filePath}.tmp-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;
  fs.writeFileSync(tmpPath, deseado);

  let ultimoError = null;
  for (let intento = 0; intento < maxIntentos; intento++) {
    try {
      fs.renameSync(tmpPath, filePath);
      return { escrito: true, ruta: filePath };
    } catch (err) {
      ultimoError = err;
      if (!ERRORES_REINTENTABLES.has(err.code)) break;
      dormirSync(10 + intento * 15);
    }
  }

  try {
    fs.unlinkSync(tmpPath);
  } catch (_) {
    // Limpieza best-effort: el tmp es único por proceso.
  }
  throw ultimoError;
}

module.exports = { writeFileAtomicSync };
