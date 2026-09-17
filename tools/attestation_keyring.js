#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Keyring de atestación Ed25519 (módulo aislado y probado por separado).
 *
 * Responsabilidades únicas:
 * - Rutas canónicas del keyring en .axion/keys/.
 * - Carga estricta: si falta, está corrupto o tiene permisos inseguros, falla.
 * - Creación explícita atómica (O_EXCL) sin rotación silenciosa.
 * - Firma de payloads con la clave privada local.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const FileLock = require('./file_lock.js');

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * Apertura exclusiva (O_EXCL) tolerante a contención transitoria de Windows/AV.
 * EEXIST es definitivo (otra instancia ganó); EPERM/EACCES se reintentan acotadamente.
 */
function abrirExclusivo(filePath, mode) {
  for (let intento = 0; intento < 40; intento++) {
    try {
      return fs.openSync(filePath, 'wx', mode);
    } catch (err) {
      if (err.code !== 'EPERM' && err.code !== 'EACCES') throw err;
      sleepSync(25);
    }
  }
  return fs.openSync(filePath, 'wx', mode);
}

class AttestationKeyring {
  constructor(projectRoot) {
    this.root = path.resolve(projectRoot);
    this.keysDir = path.join(this.root, '.axion', 'keys');
    if (!fs.existsSync(this.keysDir)) {
      fs.mkdirSync(this.keysDir, { recursive: true, mode: 0o700 });
    }
  }

  privKeyPath() {
    return path.join(this.keysDir, 'attestation_ed25519.key');
  }

  pubKeyPath() {
    return path.join(this.keysDir, 'attestation_ed25519.pub');
  }

  keyIdFor(publicKeyPem) {
    return crypto.createHash('sha256').update(publicKeyPem).digest('hex').slice(0, 16);
  }

  fail(code, message) {
    const err = new Error(message);
    err.code = code;
    return err;
  }

  /**
   * En POSIX el material privado no puede ser legible por grupo/otros.
   * En Windows los modos POSIX no aplican: se documenta y se omite el chequeo.
   */
  assertSecurePermissions(keyPath) {
    if (process.platform === 'win32') return;
    const mode = fs.statSync(keyPath).mode & 0o777;
    if ((mode & 0o077) !== 0) {
      throw this.fail('ERR_KEYS_INSECURE_PERMISSIONS',
        `Clave privada ${keyPath} con permisos inseguros (${mode.toString(8)}). Se exige 0600; no se repara ni se rota en silencio.`);
    }
  }

  /**
   * Carga y valida el par. Falla explícitamente si no existe, está incompleto,
   * el PEM no es válido o la pública no corresponde a la privada.
   */
  loadKeyPair() {
    const privPath = this.privKeyPath();
    const pubPath = this.pubKeyPath();
    const hasPriv = fs.existsSync(privPath);
    const hasPub = fs.existsSync(pubPath);

    if (!hasPriv && !hasPub) {
      throw this.fail('ERR_KEYS_MISSING',
        `No existen claves de atestación en ${this.keysDir}. Genera un par explícito con: node tools/drive_dsse_attester.js --init-keys`);
    }
    if (!hasPriv || !hasPub) {
      throw this.fail('ERR_KEYS_INCOMPLETE',
        `Par de claves incompleto en ${this.keysDir} (priv=${hasPriv}, pub=${hasPub}). No se rota ni se completa en silencio.`);
    }

    const privateKeyPem = fs.readFileSync(privPath, 'utf8');
    const publicKeyPem = fs.readFileSync(pubPath, 'utf8');

    let derivedPublicPem;
    try {
      const privateKey = crypto.createPrivateKey(privateKeyPem);
      derivedPublicPem = crypto.createPublicKey(privateKey).export({ type: 'spki', format: 'pem' });
    } catch (parseErr) {
      throw this.fail('ERR_KEYS_CORRUPT', `Clave privada ilegible en ${privPath}: ${parseErr.message}`);
    }
    if (derivedPublicPem.trim() !== publicKeyPem.trim()) {
      throw this.fail('ERR_KEYS_CORRUPT', `La clave pública en ${pubPath} no corresponde a la clave privada.`);
    }

    // La validación de permisos va después del parseo: una clave corrupta se reporta
    // como corrupta aunque su modo dependa del umask del proceso que la escribió.
    this.assertSecurePermissions(privPath);

    return { publicKeyPem, privateKeyPem };
  }

  /**
   * Creación explícita con O_EXCL (sin carreras entre procesos). Nunca sobrescribe.
   */
  generateKeyPair() {
    const privPath = this.privKeyPath();
    const pubPath = this.pubKeyPath();

    if (fs.existsSync(privPath) || fs.existsSync(pubPath)) {
      throw this.fail('ERR_KEYS_EXIST',
        `Ya existe material de clave en ${this.keysDir}. La rotación debe ser una decisión explícita y auditada.`);
    }

    // Serializa creadores con lock de propiedad verificable: sin esto, dos procesos
    // pueden intercalar priv/pub y dejar un par inconsistente aunque cada archivo use O_EXCL.
    const lock = FileLock.acquire(path.join(this.keysDir, '.keygen.lock'), {
      timeoutMs: 10000,
      staleMs: 30000,
      code: 'ERR_KEYS_LOCKED'
    });
    try {
      if (fs.existsSync(privPath) || fs.existsSync(pubPath)) {
        throw this.fail('ERR_KEYS_EXIST',
          `Otra instancia creó material de clave en ${this.keysDir}; no se rota en silencio.`);
      }

      const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      });

      let privFd = null;
      let pubFd = null;
      try {
        privFd = abrirExclusivo(privPath, 0o600);
        fs.writeSync(privFd, privateKey);
        fs.closeSync(privFd);
        privFd = null;
        try {
          fs.chmodSync(privPath, 0o600);
        } catch (_) {
          // Windows no implementa modos POSIX
        }

        pubFd = abrirExclusivo(pubPath, 0o644);
        fs.writeSync(pubFd, publicKey);
        fs.closeSync(pubFd);
        pubFd = null;
      } catch (err) {
        if (privFd !== null) { try { fs.closeSync(privFd); } catch (_) { /* fd ya cerrado */ } }
        if (pubFd !== null) { try { fs.closeSync(pubFd); } catch (_) { /* fd ya cerrado */ } }
        // Limpieza de material parcial (segura: el lock impide creadores concurrentes).
        try { if (fs.existsSync(privPath) && !fs.existsSync(pubPath)) fs.unlinkSync(privPath); } catch (_) { /* limpieza best-effort */ }
        try { if (fs.existsSync(pubPath) && !fs.existsSync(privPath)) fs.unlinkSync(pubPath); } catch (_) { /* limpieza best-effort */ }
        if (err.code === 'EEXIST') {
          throw this.fail('ERR_KEYS_EXIST',
            `Otra instancia creó material de clave en ${this.keysDir}; no se rota en silencio.`);
        }
        throw err;
      }

      return {
        publicKeyPem: publicKey,
        privateKeyPem: privateKey,
        keyId: this.keyIdFor(publicKey),
        created: true,
        keysDir: this.keysDir
      };
    } finally {
      FileLock.release(lock.lockFile, lock.token);
    }
  }

  /**
   * Idempotente: crear si no existe, validar si existe. Tolera carreras y contención
   * transitoria (EPERM/EACCES/ventanas de escritura parcial). No repara claves
   * corruptas ni inseguras: en ese caso falla de inmediato.
   */
  ensureKeyPair() {
    const privPath = this.privKeyPath();
    const pubPath = this.pubKeyPath();
    let ultimoError = null;

    for (let intento = 0; intento < 40; intento++) {
      const hasPriv = fs.existsSync(privPath);
      const hasPub = fs.existsSync(pubPath);

      if (!hasPriv && !hasPub) {
        try {
          return this.generateKeyPair();
        } catch (err) {
          const reintentable = err.code === 'ERR_KEYS_EXIST' || err.code === 'EPERM'
            || err.code === 'EACCES' || err.code === 'ERR_KEYS_LOCKED';
          if (!reintentable) throw err;
          ultimoError = err;
          sleepSync(50);
          continue;
        }
      }

      try {
        const pair = this.loadKeyPair();
        return { ...pair, keyId: this.keyIdFor(pair.publicKeyPem), created: false, keysDir: this.keysDir };
      } catch (err) {
        ultimoError = err;
        // Ventana de carrera (priv sin pub) o archivos aún no visibles: reintentar.
        if (err.code !== 'ERR_KEYS_INCOMPLETE' && err.code !== 'ERR_KEYS_MISSING') throw err;
        sleepSync(50);
      }
    }
    throw ultimoError;
  }

  buildSigner() {
    const { privateKeyPem, publicKeyPem } = this.loadKeyPair();
    return {
      keyId: this.keyIdFor(publicKeyPem),
      sign: (buffer) => crypto.sign(null, buffer, privateKeyPem)
    };
  }
}

module.exports = AttestationKeyring;
