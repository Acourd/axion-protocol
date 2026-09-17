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

const O_NOFOLLOW = fs.constants.O_NOFOLLOW || 0;
const FLAGS_EXCLUSIVO = fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | O_NOFOLLOW;

function esSymlink(filePath) {
  try {
    return fs.lstatSync(filePath).isSymbolicLink();
  } catch (_) {
    return false;
  }
}

/**
 * Apertura exclusiva (O_EXCL + O_NOFOLLOW) tolerante a contención transitoria de
 * Windows/AV. EEXIST es definitivo (otra instancia ganó, o hay un symlink plantado);
 * EPERM/EACCES se reintentan acotadamente.
 */
function abrirExclusivo(filePath, mode) {
  for (let intento = 0; intento < 40; intento++) {
    try {
      return fs.openSync(filePath, FLAGS_EXCLUSIVO, mode);
    } catch (err) {
      if (err.code !== 'EPERM' && err.code !== 'EACCES') throw err;
      sleepSync(25);
    }
  }
  return fs.openSync(filePath, FLAGS_EXCLUSIVO, mode);
}

class AttestationKeyring {
  constructor(projectRoot) {
    this.root = path.resolve(projectRoot);
    this.keysDir = path.join(this.root, '.axion', 'keys');
    this.assertKeyZone();
    if (!fs.existsSync(this.keysDir)) {
      fs.mkdirSync(this.keysDir, { recursive: true, mode: 0o700 });
    }
    this.assertKeyZone();
  }

  /**
   * La zona de claves completa debe estar contenida en el proyecto, sin symlinks en
   * ningún componente y sin escritura para grupo/otros (POSIX). Un symlink plantado
   * en .axion o .axion/keys desviaría el material privado fuera del proyecto: se
   * rechaza de plano en vez de repararse en silencio.
   */
  assertKeyZone() {
    let realRoot;
    try {
      realRoot = fs.realpathSync(this.root);
    } catch (_) {
      return; // El proyecto aún no existe: no hay zona que validar todavía.
    }
    const partes = path.relative(realRoot, this.keysDir).split(path.sep).filter(Boolean);
    let actual = realRoot;
    const candidatos = [realRoot];
    for (const parte of partes) {
      actual = path.join(actual, parte);
      candidatos.push(actual);
    }

    for (const componente of candidatos) {
      let st;
      try {
        st = fs.lstatSync(componente);
      } catch (_) {
        break; // El resto aún no existe: se creará bajo un ancestro ya validado.
      }
      if (st.isSymbolicLink()) {
        throw this.fail('ERR_KEYS_SYMLINK',
          `Componente de la zona de claves es un symlink (${componente}). El material de clave jamás sigue enlaces.`);
      }
      if (!st.isDirectory()) {
        throw this.fail('ERR_KEYS_INVALID',
          `Componente de la zona de claves no es un directorio (${componente}).`);
      }
      if (process.platform !== 'win32') {
        const mode = st.mode & 0o777;
        if ((mode & 0o022) !== 0) {
          throw this.fail('ERR_KEYS_INSECURE_PERMISSIONS',
            `Directorio de la zona de claves escribible por grupo/otros (${mode.toString(8)}): ${componente}. Se exige sin bits de escritura ajenos; no se repara en silencio.`);
        }
        if (typeof process.getuid === 'function' && st.uid !== process.getuid()) {
          throw this.fail('ERR_KEYS_FOREIGN_OWNER',
            `Directorio de la zona de claves con dueño distinto al proceso (${componente}).`);
        }
      }
    }

    if (fs.existsSync(this.keysDir)) {
      const realKeys = fs.realpathSync(this.keysDir);
      const rel = path.relative(realRoot, realKeys);
      if (rel.startsWith('..') || path.isAbsolute(rel)) {
        throw this.fail('ERR_KEYS_ESCAPE',
          `La zona de claves resuelve fuera del proyecto (${this.keysDir} -> ${realKeys}).`);
      }
    }
  }

  /** Lectura por descriptor con O_NOFOLLOW: sin ventana entre comprobación y lectura. */
  leerClaveSegura(filePath) {
    if (esSymlink(filePath)) {
      throw this.fail('ERR_KEYS_SYMLINK', `Archivo de clave es un symlink (${filePath}). No se sigue.`);
    }
    let fd = null;
    try {
      try {
        fd = fs.openSync(filePath, fs.constants.O_RDONLY | O_NOFOLLOW);
      } catch (openErr) {
        if (openErr.code === 'ELOOP') {
          throw this.fail('ERR_KEYS_SYMLINK', `Archivo de clave es un symlink (${filePath}). No se sigue.`);
        }
        throw openErr;
      }
      const st = fs.fstatSync(fd);
      if (!st.isFile()) {
        throw this.fail('ERR_KEYS_INVALID', `Archivo de clave no es un archivo regular (${filePath}).`);
      }
      return fs.readFileSync(fd, 'utf8');
    } finally {
      if (fd !== null) {
        try { fs.closeSync(fd); } catch (_) { /* descriptor ya cerrado */ }
      }
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
    const mode = fs.lstatSync(keyPath).mode & 0o777;
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
    this.assertKeyZone();

    const privEsEnlace = esSymlink(privPath);
    const pubEsEnlace = esSymlink(pubPath);
    if (privEsEnlace || pubEsEnlace) {
      throw this.fail('ERR_KEYS_SYMLINK',
        `La zona de claves contiene symlinks (priv=${privEsEnlace}, pub=${pubEsEnlace}); no se lee a través de enlaces.`);
    }

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

    const privateKeyPem = this.leerClaveSegura(privPath);
    const publicKeyPem = this.leerClaveSegura(pubPath);

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
    this.assertKeyZone();

    if (fs.existsSync(privPath) || fs.existsSync(pubPath)) {
      throw this.fail('ERR_KEYS_EXIST',
        `Ya existe material de clave en ${this.keysDir}. La rotación debe ser una decisión explícita y auditada.`);
    }
    if (esSymlink(privPath) || esSymlink(pubPath)) {
      throw this.fail('ERR_KEYS_SYMLINK',
        `La zona de claves contiene symlinks (priv=${esSymlink(privPath)}, pub=${esSymlink(pubPath)}); no se escribe material a través de enlaces.`);
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
      if (esSymlink(privPath) || esSymlink(pubPath)) {
        throw this.fail('ERR_KEYS_SYMLINK',
          `La zona de claves contiene symlinks (priv=${esSymlink(privPath)}, pub=${esSymlink(pubPath)}); no se escribe material a través de enlaces.`);
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
