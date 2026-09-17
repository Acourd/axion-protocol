'use strict';

/**
 * AX-F-231: Recorrido público E2E (Lote 4).
 *
 * Usa EXCLUSIVAMENTE comandos documentados en docs/VERIFICATION_PATH.md:
 *   node bin/axion.js attest-keygen --target <dir>
 *   node bin/axion.js attest-run    --target <dir> [--timeout <ms>]
 *   node bin/axion.js attest-verify <sobre> --target <dir>
 *
 * 1. Éxito: keygen → run → verify con subject Merkle coincidente.
 * 2. Evidencia externa fabricada: máximo EXTERNAL_EVIDENCE (jamás VERIFIED).
 * 3. Árbol mutado durante la corrida: UNVERIFIED.
 * 4. Ledger corrupto: UNVERIFIED sin VERIFIED.
 * 5. Timeout: UNVERIFIED y sin procesos huérfanos.
 * 6. La documentación pública cita los tres comandos del recorrido.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { estaVivo } = require('../../tools/process_tree.js');
const { crearSandboxTemporal } = require('../../tools/test_sandbox.js');

console.log('=== AX-F-231 Recorrido público E2E de verificación ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const BIN = path.join(ROOT, 'bin', 'axion.js');

function axion(args) {
  return spawnSync(process.execPath, [BIN, ...args], { encoding: 'utf8', cwd: ROOT });
}

function escribirRunner(target, cuerpo) {
  fs.mkdirSync(path.join(target, 'tests'), { recursive: true });
  fs.writeFileSync(path.join(target, 'tests', 'run_all.js'), cuerpo, 'utf8');
}

const RUNNER_VERDE = [
  "console.log('suites totales : 3');",
  "console.log('en verde       : 3');",
  "console.log('en rojo        : 0');",
  'process.exit(0);'
].join('\n');

const target = crearSandboxTemporal('axion-e2e-target');
(async () => {
try {
  // 1. Éxito por el recorrido documentado
  escribirRunner(target, RUNNER_VERDE);

  const keygen = axion(['attest-keygen', '--target', target]);
  assert.strictEqual(keygen.status, 0, `attest-keygen debe salir 0: ${keygen.stderr}`);

  const run = axion(['attest-run', '--target', target]);
  assert.strictEqual(run.status, 0, `attest-run debe salir 0: ${run.stdout} ${run.stderr}`);
  assert.ok(run.stdout.includes('VERIFIED'), 'attest-run debe reportar VERIFIED');
  const matchSobre = run.stdout.match(/Archivo sellado:\s*(.+)/);
  assert.ok(matchSobre, 'attest-run debe imprimir la ruta del sobre');
  const sobre = matchSobre[1].trim();

  const verify = axion(['attest-verify', sobre, '--target', target]);
  assert.strictEqual(verify.status, 0, `attest-verify debe salir 0: ${verify.stdout} ${verify.stderr}`);
  const salida = JSON.parse(verify.stdout);
  assert.strictEqual(salida.valid, true);
  assert.strictEqual(salida.subjectMatches, true);
  assert.strictEqual(salida.subjectSha256, salida.targetMerkleRoot);
  console.log('✓ Éxito E2E: keygen → run (VERIFIED) → verify con subject Merkle coincidente');

  // 2. Evidencia externa fabricada: EXTERNAL_EVIDENCE, jamás VERIFIED
  const fabricada = path.join(target, 'fabricada.json');
  fs.writeFileSync(fabricada, JSON.stringify({
    schema: 'axion.verification/v1',
    producer: 'tools/verify_changes.js',
    runner: 'never-executed',
    command: 'never-executed',
    exitCode: 0,
    status: 'PASS',
    suites: { total: 999, passed: 999, failed: 0 },
    startedAt: new Date(0).toISOString(),
    finishedAt: new Date(1000).toISOString(),
    durationMs: 1,
    outputSha256: 'a'.repeat(64)
  }, null, 2), 'utf8');
  const externaDirecta = spawnSync(process.execPath, [
    path.join(ROOT, 'tools', 'drive_dsse_attester.js'),
    '--target', target,
    '--evidence', fabricada
  ], { encoding: 'utf8', cwd: ROOT });
  assert.strictEqual(externaDirecta.status, 0, `registro de evidencia externa debe salir 0: ${externaDirecta.stderr}`);
  assert.ok(externaDirecta.stdout.includes('EXTERNAL_EVIDENCE') || externaDirecta.stdout.includes('UNVERIFIED'));
  assert.ok(!externaDirecta.stdout.includes('Verificación:    VERIFIED'), 'La evidencia externa no puede ser VERIFIED');
  console.log('✓ Evidencia externa fabricada: EXTERNAL_EVIDENCE/UNVERIFIED, sin VERIFIED');

  // 3. Árbol mutado durante la corrida: UNVERIFIED
  escribirRunner(target, [
    "const fs = require('fs'); const path = require('path');",
    "fs.writeFileSync(path.join(__dirname, 'mutacion.js'), 'mutado ' + Date.now());",
    "console.log('suites totales : 3');",
    "console.log('en verde       : 3');",
    "console.log('en rojo        : 0');",
    'process.exit(0);'
  ].join('\n'));
  const mutado = axion(['attest-run', '--target', target]);
  assert.strictEqual(mutado.status, 1, 'attest-run debe salir 1 con el árbol mutado');
  assert.ok(mutado.stdout.includes('UNVERIFIED'), 'El árbol mutado no puede producir VERIFIED');
  fs.rmSync(path.join(target, 'tests', 'mutacion.js'), { force: true });
  console.log('✓ Árbol mutado durante la corrida: UNVERIFIED');

  // 4. Ledger corrupto: UNVERIFIED
  escribirRunner(target, RUNNER_VERDE);
  const ledger = path.join(target, '.axion', 'evidence', 'ledger.jsonl');
  fs.mkdirSync(path.dirname(ledger), { recursive: true });
  fs.writeFileSync(ledger, '{"schema":"roto"}\n', 'utf8');
  const conLedgerRoto = axion(['attest-run', '--target', target]);
  assert.strictEqual(conLedgerRoto.status, 1);
  assert.ok(conLedgerRoto.stdout.includes('UNVERIFIED'));
  fs.rmSync(ledger, { force: true });
  console.log('✓ Ledger corrupto: UNVERIFIED (fail-closed)');

  // 5. Timeout: UNVERIFIED y sin huérfanos
  const pidFile = path.join(target, 'huerfano.pid');
  escribirRunner(target, [
    "const { spawn } = require('child_process'); const fs = require('fs'); const path = require('path');",
    "const hijo = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 60000)'], { stdio: 'ignore' });",
    `fs.writeFileSync(path.join(__dirname, '..', 'huerfano.pid'), String(hijo.pid));`,
    'setTimeout(() => {}, 60000);'
  ].join('\n'));
  const conTimeout = axion(['attest-run', '--target', target, '--timeout', '800']);
  assert.strictEqual(conTimeout.status, 1, `timeout debe salir 1: ${conTimeout.stdout} ${conTimeout.stderr}`);
  assert.ok(conTimeout.stdout.includes('UNVERIFIED'));
  const pid = Number(fs.readFileSync(pidFile, 'utf8'));
  let vivo = estaVivo(pid);
  for (let i = 0; i < 40 && vivo; i++) {
    await new Promise((r) => setTimeout(r, 100));
    vivo = estaVivo(pid);
  }
  assert.strictEqual(vivo, false, `El descendiente ${pid} sigue vivo tras el timeout`);
  console.log('✓ Timeout: UNVERIFIED y descendiente terminado (sin huérfanos)');

  // 6. Documentación pública coherente con los comandos ejecutados
  const doc = fs.readFileSync(path.join(ROOT, 'docs', 'VERIFICATION_PATH.md'), 'utf8');
  for (const cmd of ['attest-keygen', 'attest-run', 'attest-verify']) {
    assert.ok(doc.includes(cmd), `docs/VERIFICATION_PATH.md debe documentar ${cmd}`);
  }
  console.log('✓ Documentación pública cita los tres comandos del recorrido');

  console.log('\nPASS: AX-F-231 — Recorrido público E2E verificado.');
} finally {
  fs.rmSync(target, { recursive: true, force: true });
}
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
