#!/usr/bin/env node
'use strict';

/**
 * AX-F-234: Aislamiento del keyring ante symlinks y permisos de la zona de claves.
 *
 * Verifica:
 * 1. Camino feliz: generación y carga en una zona limpia.
 * 2. Symlink en .axion o .axion/keys: rechazo fail-closed (ERR_KEYS_SYMLINK).
 * 3. Archivos de clave symlinkeados: rechazo y sin escritura a través del enlace.
 * 4. Sin fuga: ningún artefacto se crea fuera del proyecto.
 * 5. POSIX: directorios escribibles por grupo/otros y clave privada 0644 rechazados.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { crearSandbox } = require('../../tools/test_sandbox.js');
const AttestationKeyring = require('../../tools/attestation_keyring.js');

console.log('=== AX-F-234 Keyring: aislamiento ante symlinks y permisos de zona ===\n');

const sandboxes = [];
function sandboxNuevo(prefijo) {
  const s = crearSandbox(prefijo);
  sandboxes.push(s);
  return s;
}

function intentarSymlink(destino, origen, esDirectorio = true) {
  const intentos = process.platform === 'win32'
    ? (esDirectorio ? ['junction', null] : ['file', null])
    : [null];
  for (const tipo of intentos) {
    try {
      if (tipo === null) fs.symlinkSync(destino, origen);
      else fs.symlinkSync(destino, origen, tipo);
      return true;
    } catch (_) {
      // siguiente variante
    }
  }
  return false;
}

try {
  // 1. Camino feliz en zona limpia
  const limpio = sandboxNuevo('keyring-limpio');
  const keyring = new AttestationKeyring(limpio);
  const par = keyring.generateKeyPair();
  assert.strictEqual(par.created, true, 'La generación explícita debe crear el par');
  assert.strictEqual(keyring.loadKeyPair().privateKeyPem.includes('BEGIN PRIVATE KEY'), true);
  assert.strictEqual(fs.existsSync(keyring.privKeyPath()), true);
  console.log('✓ Camino feliz: generación y carga en zona de claves limpia');

  // 2 y 3. Symlinks (según soporte de plataforma)
  const victima = sandboxNuevo('keyring-victima');
  const keyringVictima = new AttestationKeyring(victima);
  keyringVictima.generateKeyPair();

  const symDisponible = intentarSymlink(victima, path.join(sandboxNuevo('keyring-sym-probe'), '.axion'));
  if (!symDisponible) {
    console.log('i Symlinks de directorio no disponibles en esta plataforma: casos de enlaces omitidos');
  } else {
    // .axion como symlink
    const s1 = sandboxNuevo('keyring-sym-axion');
    assert.strictEqual(intentarSymlink(victima, path.join(s1, '.axion')), true);
    assert.throws(() => new AttestationKeyring(s1), (e) => e.code === 'ERR_KEYS_SYMLINK');
    console.log('✓ .axion como symlink: rechazado (ERR_KEYS_SYMLINK)');

    // .axion/keys como symlink
    const s2 = sandboxNuevo('keyring-sym-keys');
    fs.mkdirSync(path.join(s2, '.axion'), { recursive: true });
    assert.strictEqual(intentarSymlink(path.join(victima, '.axion', 'keys'), path.join(s2, '.axion', 'keys'), true), true);
    assert.throws(() => new AttestationKeyring(s2), (e) => e.code === 'ERR_KEYS_SYMLINK');
    console.log('✓ .axion/keys como symlink: rechazado (ERR_KEYS_SYMLINK)');

    // Clave privada como symlink: carga rechazada y generación sin escribir por el enlace
    const s3 = sandboxNuevo('keyring-sym-priv');
    fs.mkdirSync(path.join(s3, '.axion', 'keys'), { recursive: true });
    const fileSymDisponible = intentarSymlink(
      keyringVictima.privKeyPath(),
      path.join(s3, '.axion', 'keys', 'attestation_ed25519.key'),
      false
    );
    if (!fileSymDisponible) {
      console.log('i Symlinks de archivo no disponibles en esta plataforma: caso de clave symlinkeada omitido');
    } else {
      fs.copyFileSync(keyringVictima.pubKeyPath(), path.join(s3, '.axion', 'keys', 'attestation_ed25519.pub'));
      const keyringS3 = new AttestationKeyring(s3);
      assert.throws(() => keyringS3.loadKeyPair(), (e) => e.code === 'ERR_KEYS_SYMLINK');
      assert.throws(() => keyringS3.generateKeyPair(), (e) => e.code === 'ERR_KEYS_SYMLINK' || e.code === 'ERR_KEYS_EXIST');
      console.log('✓ Clave privada symlinkeada: carga y generación rechazadas');
    }

    // Sin fuga: la víctima conserva exactamente su par original
    const victimaKeys = fs.readdirSync(path.join(victima, '.axion', 'keys')).sort();
    assert.deepStrictEqual(victimaKeys, ['attestation_ed25519.key', 'attestation_ed25519.pub'],
      'No debe aparecer ni modificarse material en el destino del symlink');
    console.log('✓ Sin fuga: el destino del symlink conserva su material intacto');
  }

  // 5. POSIX: permisos de directorio y de archivo
  if (process.platform !== 'win32') {
    const s4 = sandboxNuevo('keyring-perm');
    const keyringPerm = new AttestationKeyring(s4);
    keyringPerm.generateKeyPair();

    fs.chmodSync(path.join(s4, '.axion', 'keys'), 0o777);
    assert.throws(() => new AttestationKeyring(s4), (e) => e.code === 'ERR_KEYS_INSECURE_PERMISSIONS');
    console.log('✓ Directorio de claves escribible por grupo/otros: rechazado');

    fs.chmodSync(path.join(s4, '.axion', 'keys'), 0o700);
    fs.chmodSync(keyringPerm.privKeyPath(), 0o644);
    assert.throws(() => keyringPerm.loadKeyPair(), (e) => e.code === 'ERR_KEYS_INSECURE_PERMISSIONS');
    console.log('✓ Clave privada 0644: rechazada (se exige 0600)');

    fs.chmodSync(keyringPerm.privKeyPath(), 0o600);
    assert.strictEqual(keyringPerm.loadKeyPair().publicKeyPem.includes('BEGIN PUBLIC KEY'), true);
    console.log('✓ Permisos corregidos: la carga vuelve a ser válida');
  } else {
    console.log('i Permisos POSIX no aplican en Windows: casos de modo omitidos');
  }

} finally {
  for (const s of sandboxes) {
    try {
      fs.rmSync(s, { recursive: true, force: true });
    } catch (_) {
      // limpieza best-effort
    }
  }
}

console.log('\nPASS AX-F-234 — Aislamiento del keyring verificado adversarialmente.');
