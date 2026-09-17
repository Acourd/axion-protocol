'use strict';

/**
 * AX-F-232: Invariantes del keyring de atestación como módulo aislado (Lote 5c).
 *
 * 1. Sin claves: ERR_KEYS_MISSING; par incompleto: ERR_KEYS_INCOMPLETE.
 * 2. Creación con permisos 0600 en POSIX; sin rotación silenciosa (ERR_KEYS_EXIST).
 * 3. ensureKeyPair idempotente y tolerante a carreras (5 procesos simultáneos, un solo par).
 * 4. Clave corrupta: ERR_KEYS_CORRUPT; permisos inseguros: ERR_KEYS_INSECURE_PERMISSIONS (POSIX).
 * 5. buildSigner produce firmas verificables con la pública.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const AttestationKeyring = require('../../tools/attestation_keyring.js');
const { crearSandboxTemporal } = require('../../tools/test_sandbox.js');

console.log('=== AX-F-232 Keyring de atestación aislado ===\n');

function capturar(fn) {
  try {
    fn();
    return null;
  } catch (err) {
    return err;
  }
}

(async () => {
  const sandbox = crearSandboxTemporal('axion-keyring');
  try {
    const keyring = new AttestationKeyring(sandbox);

    // 1. Sin claves
    const errFalta = capturar(() => keyring.loadKeyPair());
    assert.ok(errFalta);
    assert.strictEqual(errFalta.code, 'ERR_KEYS_MISSING');

    fs.writeFileSync(keyring.privKeyPath(), 'solo-privada', 'utf8');
    const errIncompleto = capturar(() => keyring.loadKeyPair());
    assert.strictEqual(errIncompleto.code, 'ERR_KEYS_INCOMPLETE');
    fs.rmSync(keyring.privKeyPath(), { force: true });
    console.log('✓ Sin claves / par incompleto: fallos explícitos');

    // 2. Creación y no rotación
    const par = keyring.generateKeyPair();
    assert.strictEqual(par.created, true);
    assert.strictEqual(par.keyId.length, 16);
    if (process.platform !== 'win32') {
      const modo = fs.statSync(keyring.privKeyPath()).mode & 0o777;
      assert.strictEqual(modo, 0o600, `Se exige 0600, es ${modo.toString(8)}`);
      console.log('✓ Creación con permisos 0600');
    } else {
      console.log('✓ Creación de claves (permisos POSIX no aplican en Windows)');
    }
    const contenido = fs.readFileSync(keyring.privKeyPath(), 'utf8');
    const errRotar = capturar(() => keyring.generateKeyPair());
    assert.strictEqual(errRotar.code, 'ERR_KEYS_EXIST');
    assert.strictEqual(fs.readFileSync(keyring.privKeyPath(), 'utf8'), contenido, 'La clave no debe rotarse');
    console.log('✓ Re-generación rechazada sin rotación silenciosa');

    // 3. ensureKeyPair idempotente y carrera entre procesos
    const reutilizado = keyring.ensureKeyPair();
    assert.strictEqual(reutilizado.created, false);
    assert.strictEqual(reutilizado.publicKeyPem, par.publicKeyPem);

    const sandboxCarrera = crearSandboxTemporal('axion-keyring-race');
    const script = path.join(sandboxCarrera, 'ensure.js');
    fs.writeFileSync(script, [
      "'use strict';",
      `const AttestationKeyring = require(${JSON.stringify(path.join(__dirname, '..', '..', 'tools', 'attestation_keyring.js').split(path.sep).join('/'))});`,
      'const keyring = new AttestationKeyring(process.argv[2]);',
      'try { const r = keyring.ensureKeyPair(); process.stdout.write(JSON.stringify({ ok: true, keyId: r.keyId, created: r.created })); }',
      'catch (err) { process.stdout.write(JSON.stringify({ ok: false, code: err.code, message: err.message })); process.exit(1); }'
    ].join('\n'), 'utf8');

    const hijos = await Promise.all(Array.from({ length: 5 }, () => new Promise((resolve) => {
      const child = spawn(process.execPath, [script, sandboxCarrera], { stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '';
      child.stdout.on('data', (d) => { out += d; });
      child.on('close', (code) => resolve({ code, out }));
    })));
    for (const h of hijos) {
      assert.strictEqual(h.code, 0, `ensureKeyPair falló en carrera: ${h.out}`);
      assert.strictEqual(JSON.parse(h.out).ok, true);
    }
    const keyringCarrera = new AttestationKeyring(sandboxCarrera);
    const parCarrera = keyringCarrera.loadKeyPair();
    assert.ok(parCarrera.privateKeyPem.includes('PRIVATE KEY'));
    console.log('✓ 5 procesos con ensureKeyPair simultáneo: un solo par válido, sin rotación');

    // 4. Corrupta e insegura
    const sandboxCorrupto = crearSandboxTemporal('axion-keyring-corrupto');
    try {
      const corrupto = new AttestationKeyring(sandboxCorrupto);
      fs.writeFileSync(corrupto.privKeyPath(), '-----BEGIN PRIVATE KEY-----\nbasura\n-----END PRIVATE KEY-----\n', 'utf8');
      fs.writeFileSync(corrupto.pubKeyPath(), '-----BEGIN PUBLIC KEY-----\nbasura\n-----END PUBLIC KEY-----\n', 'utf8');
      if (process.platform !== 'win32') {
        fs.chmodSync(corrupto.privKeyPath(), 0o600);
      }
      assert.strictEqual(capturar(() => corrupto.loadKeyPair()).code, 'ERR_KEYS_CORRUPT');

      if (process.platform !== 'win32') {
        const sandboxInseguro = crearSandboxTemporal('axion-keyring-inseguro');
        try {
          const inseguro = new AttestationKeyring(sandboxInseguro);
          inseguro.generateKeyPair();
          fs.chmodSync(inseguro.privKeyPath(), 0o644);
          assert.strictEqual(capturar(() => inseguro.loadKeyPair()).code, 'ERR_KEYS_INSECURE_PERMISSIONS');
          console.log('✓ Clave insegura (0644): ERR_KEYS_INSECURE_PERMISSIONS');
        } finally {
          fs.rmSync(sandboxInseguro, { recursive: true, force: true });
        }
      }
      console.log('✓ Clave corrupta: ERR_KEYS_CORRUPT');
    } finally {
      fs.rmSync(sandboxCorrupto, { recursive: true, force: true });
    }

    // 5. Firma verificable
    const signer = keyring.buildSigner();
    const firma = signer.sign(Buffer.from('payload del keyring'));
    assert.strictEqual(signer.keyId, par.keyId);
    assert.strictEqual(
      crypto.verify(null, Buffer.from('payload del keyring'), par.publicKeyPem, firma),
      true,
      'La firma del keyring debe verificar con su pública'
    );
    console.log('✓ buildSigner produce firmas Ed25519 verificables');

    fs.rmSync(sandboxCarrera, { recursive: true, force: true });
    console.log('\nPASS: AX-F-232 — Keyring aislado verificado.');
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
