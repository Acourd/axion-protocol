'use strict';

/**
 * AX-F-230: Invariantes del runner de suites con timeout y terminación de árbol (Lote 2).
 *
 * 1. Clasificación distinguible: PASS / NON_ZERO_EXIT / TIMEOUT / SPAWN_ERROR.
 * 2. Un bucle con I/O bloqueado se corta por timeout, no por fallo de aserción.
 * 3. El timeout termina también a los procesos descendientes (sin huérfanos).
 * 4. La terminación usa el mecanismo portable esperado (taskkill /T /F o SIGTERM/SIGKILL).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { runSuites } = require('../../tools/suite_runner.js');
const { estaVivo } = require('../../tools/process_tree.js');
const { crearSandboxTemporal } = require('../../tools/test_sandbox.js');

console.log('=== AX-F-230 Runner de suites: timeout, clasificación y árbol ===\n');

const TIMEOUT_MS = 1500;

(async () => {
  const sandbox = crearSandboxTemporal('axion-suite-runner');
  try {
    fs.writeFileSync(path.join(sandbox, 'pass.test.js'), 'console.log("ok"); process.exit(0);', 'utf8');
    fs.writeFileSync(path.join(sandbox, 'fail.test.js'), 'console.error("fallo intencional"); process.exit(3);', 'utf8');
    fs.writeFileSync(
      path.join(sandbox, 'hang.test.js'),
      'process.stdout.write("x".repeat(200000)); setTimeout(() => {}, 60000);',
      'utf8'
    );

    const pidFile = path.join(sandbox, 'orphan.pid');
    fs.writeFileSync(path.join(sandbox, 'orphan.test.js'), [
      "const { spawn } = require('child_process');",
      "const fs = require('fs');",
      "const child = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 60000)'], { stdio: 'ignore' });",
      `fs.writeFileSync(${JSON.stringify(pidFile)}, String(child.pid));`,
      'setTimeout(() => {}, 60000);'
    ].join('\n'), 'utf8');

    const res = await runSuites({ testsDir: sandbox, timeoutMs: TIMEOUT_MS, concurrency: 4 });
    const porNombre = Object.fromEntries(res.results.map((r) => [r.nombre, r]));

    assert.strictEqual(porNombre.pass.status, 'PASS', 'La suite que sale 0 debe clasificar PASS');
    assert.strictEqual(porNombre.fail.status, 'NON_ZERO_EXIT', 'La suite con exit 3 debe clasificar NON_ZERO_EXIT');
    assert.strictEqual(porNombre.fail.exitCode, 3);
    assert.strictEqual(porNombre.hang.status, 'TIMEOUT', 'El bucle con I/O debe clasificar TIMEOUT');
    assert.ok(porNombre.hang.kill && porNombre.hang.kill.attempted, 'El timeout debe intentar la terminación del árbol');
    assert.strictEqual(porNombre.orphan.status, 'TIMEOUT');
    console.log(`✓ Clasificación distinguible (PASS / NON_ZERO_EXIT / TIMEOUT); método de corte: ${porNombre.hang.kill.method}`);

    assert.strictEqual(res.passed, 1);
    assert.strictEqual(res.failed, 3);
    assert.strictEqual(res.timeouts, 2);
    console.log(`✓ Conteos coherentes: total=${res.total} verde=${res.passed} rojo=${res.failed} timeouts=${res.timeouts}`);

    // Sin huérfanos: el descendiente del fixture debe estar muerto tras el corte.
    const pid = Number(fs.readFileSync(pidFile, 'utf8'));
    assert.ok(Number.isFinite(pid) && pid > 0, 'El fixture debe registrar el pid del descendiente');
    let vivo = estaVivo(pid);
    for (let i = 0; i < 40 && vivo; i++) {
      await new Promise((r) => setTimeout(r, 100));
      vivo = estaVivo(pid);
    }
    assert.strictEqual(vivo, false, `El descendiente ${pid} sigue vivo tras el timeout: huérfano`);
    console.log(`✓ Sin procesos huérfanos: descendiente ${pid} terminado junto al árbol`);

    console.log('\nPASS: AX-F-230 — Timeout por suite y terminación de árbol verificados.');
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
