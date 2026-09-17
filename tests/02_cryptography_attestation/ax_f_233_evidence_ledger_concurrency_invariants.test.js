'use strict';

/**
 * AX-F-233: Invariantes del lock transaccional del ledger de evidencia (Lote 1b).
 *
 * 1. 20 procesos escritores simultáneos: secuencia única 1..20, cadena íntegra,
 *    firmas válidas y cero pérdida de entradas.
 * 2. Cada entrada apunta a un artefacto existente cuyo SHA-256 coincide.
 * 3. Lock huérfano por antigüedad: se recupera y el siguiente anexado funciona.
 * 4. Lock activo: fail-closed con ERR_LEDGER_LOCKED, sin escribir en el ledger.
 * 5. withLock devuelve el valor de la sección crítica y libera siempre.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const DriveDsseAttester = require('../../tools/drive_dsse_attester.js');
const { recordEvidence, readLedger, lockPath, withLock, sha256 } = require('../../tools/evidence_ledger.js');
const { crearSandboxTemporal } = require('../../tools/test_sandbox.js');

console.log('=== AX-F-233 Lock transaccional del ledger: concurrencia y recuperación ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sandbox = crearSandboxTemporal('axion-ledger-concurrency');
const writerScript = path.join(sandbox, 'writer.js');

const writerSource = `'use strict';
const REPO = ${JSON.stringify(ROOT.split('\\').join('/'))};
const DriveDsseAttester = require(REPO + '/tools/drive_dsse_attester.js');
const { recordEvidence } = require(REPO + '/tools/evidence_ledger.js');
const crypto = require('crypto');

const root = process.argv[2];
const index = Number(process.argv[3]);
const attester = new DriveDsseAttester(root);
const { privateKeyPem, publicKeyPem } = attester.loadKeyPair();
const signer = {
  keyId: attester.keyIdFor(publicKeyPem),
  sign: (buffer) => crypto.sign(null, buffer, privateKeyPem)
};

try {
  const res = recordEvidence(root, {
    schema: 'axion.verification/v1',
    producer: 'tools/verify_changes.js',
    runner: 'node tests/run_all.js',
    command: 'node tests/run_all.js',
    exitCode: 0,
    status: 'PASS',
    suites: { total: index + 1, passed: index + 1, failed: 0 },
    startedAt: new Date(0).toISOString(),
    finishedAt: new Date(1000).toISOString(),
    durationMs: 1000,
    outputSha256: String(index).repeat(64).slice(0, 64),
    signer
  });
  process.stdout.write(JSON.stringify({ ok: true, seq: res.entry.seq, artifact: res.relPath, sha256: res.sha256 }));
} catch (err) {
  process.stdout.write(JSON.stringify({ ok: false, code: err.code, message: err.message }));
  process.exit(1);
}
`;

(async () => {
  try {
    const attester = new DriveDsseAttester(sandbox);
    attester.ensureKeyPair();
    fs.writeFileSync(writerScript, writerSource, 'utf8');

    // 1-2. 20 escritores concurrentes (con reintento ante EAGAIN transitorio del SO)
    function lanzarEscritor(i, intento = 0) {
      return new Promise((resolve) => {
        const child = spawn(process.execPath, [writerScript, sandbox, String(i)], { stdio: ['ignore', 'pipe', 'pipe'] });
        let out = '';
        let errOut = '';
        let settled = false;
        child.stdout.on('data', (d) => { out += d; });
        child.stderr.on('data', (d) => { errOut += d; });
        child.on('error', (err) => {
          if (settled) return;
          settled = true;
          if (intento < 3) {
            setTimeout(() => resolve(lanzarEscritor(i, intento + 1)), 150);
          } else {
            resolve({ code: 1, out: '', errOut: `spawn error: ${err.message}`, index: i });
          }
        });
        child.on('close', (code) => {
          if (settled) return;
          settled = true;
          resolve({ code, out, errOut, index: i });
        });
      });
    }

    const hijos = [];
    for (let i = 0; i < 20; i++) {
      hijos.push(lanzarEscritor(i));
    }
    const resultados = await Promise.all(hijos);
    const fallidos = resultados.filter((r) => r.code !== 0);
    assert.strictEqual(fallidos.length, 0, `Escritores fallidos: ${fallidos.map((f) => `${f.index}:${f.errOut}`).join(' | ')}`);

    const secuencias = resultados.map((r) => JSON.parse(r.out).seq).sort((a, b) => a - b);
    assert.deepStrictEqual(secuencias, Array.from({ length: 20 }, (_, i) => i + 1), 'La secuencia debe ser 1..20 sin huecos ni duplicados');

    const ledger = attester.verifyEvidenceLedger();
    assert.strictEqual(ledger.valid, true, `Ledger inválido: ${ledger.reason}`);
    assert.strictEqual(ledger.entries.length, 20, 'Deben persistir las 20 entradas');
    for (const entry of ledger.entries) {
      const artifactPath = path.join(sandbox, entry.artifact);
      assert.ok(fs.existsSync(artifactPath), `Artefacto ausente: ${entry.artifact}`);
      const enDisco = sha256(fs.readFileSync(artifactPath));
      assert.strictEqual(enDisco, entry.artifactSha256, `SHA-256 divergente en ${entry.artifact}`);
    }
    console.log('✓ 20 escritores concurrentes: secuencia 1..20, cadena íntegra, artefactos y hashes coincidentes');

    // 3. Lock huérfano: se recupera por antigüedad
    const lock = lockPath(sandbox);
    fs.writeFileSync(lock, '99999:0', 'utf8');
    const viejo = (Date.now() - 60000) / 1000;
    fs.utimesSync(lock, viejo, viejo);
    const extra = recordEvidence(sandbox, {
      schema: 'axion.verification/v1',
      producer: 'tools/verify_changes.js',
      runner: 'node tests/run_all.js',
      command: 'node tests/run_all.js',
      exitCode: 0,
      status: 'PASS',
      suites: { total: 1, passed: 1, failed: 0 },
      startedAt: new Date(0).toISOString(),
      finishedAt: new Date(1000).toISOString(),
      durationMs: 1,
      outputSha256: 'f'.repeat(64),
      signer: (() => {
        const { privateKeyPem, publicKeyPem } = attester.loadKeyPair();
        return { keyId: attester.keyIdFor(publicKeyPem), sign: (b) => require('crypto').sign(null, b, privateKeyPem) };
      })()
    });
    assert.strictEqual(extra.entry.seq, 21, 'El lock huérfano debe recuperarse y permitir el anexado');
    assert.strictEqual(fs.existsSync(lock), false, 'El lock debe liberarse tras el anexado');
    console.log('✓ Lock huérfano recuperado por antigüedad; siguiente anexado en seq 21 y lock liberado');

    // 4. Lock activo: fail-closed sin escribir
    fs.writeFileSync(lock, `${process.pid}:${Date.now()}`, 'utf8');
    const antes = readLedger(sandbox).length;
    let errorLock = null;
    try {
      recordEvidence(sandbox, {
        schema: 'axion.verification/v1',
        producer: 'tools/verify_changes.js',
        runner: 'node tests/run_all.js',
        command: 'node tests/run_all.js',
        exitCode: 0,
        status: 'PASS',
        suites: { total: 1, passed: 1, failed: 0 },
        startedAt: new Date(0).toISOString(),
        finishedAt: new Date(1000).toISOString(),
        durationMs: 1,
        outputSha256: 'e'.repeat(64),
        signer: (() => {
          const { privateKeyPem, publicKeyPem } = attester.loadKeyPair();
          return { keyId: attester.keyIdFor(publicKeyPem), sign: (b) => require('crypto').sign(null, b, privateKeyPem) };
        })()
      }, { lockTimeoutMs: 150 });
    } catch (err) {
      errorLock = err;
    } finally {
      try { fs.unlinkSync(lock); } catch (_) {}
    }
    assert.ok(errorLock, 'Con lock activo debe fallar cerrado');
    assert.strictEqual(errorLock.code, 'ERR_LEDGER_LOCKED');
    assert.strictEqual(readLedger(sandbox).length, antes, 'No debe escribirse nada con el lock activo');
    console.log('✓ Lock activo: ERR_LEDGER_LOCKED y ledger intacto (fail-closed)');

    // 5. withLock devuelve el valor y libera incluso ante excepción
    const valor = withLock(sandbox, () => 42);
    assert.strictEqual(valor, 42);
    assert.strictEqual(fs.existsSync(lock), false);
    let lanzo = false;
    try { withLock(sandbox, () => { throw new Error('boom'); }); } catch (_) { lanzo = true; }
    assert.strictEqual(lanzo, true);
    assert.strictEqual(fs.existsSync(lock), false, 'withLock debe liberar ante excepción');
    console.log('✓ withLock devuelve el valor y libera el lock incluso ante excepción');

    console.log('\nPASS: AX-F-233 — Lock transaccional del ledger verificado.');
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
