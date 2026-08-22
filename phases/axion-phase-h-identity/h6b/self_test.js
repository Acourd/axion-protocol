#!/usr/bin/env node
'use strict';
/**
 * AXION H-6b — autoprueba del corredor.
 *
 * Demuestra dinámicamente que cada gate rompe cuando debe. Opera sobre un corpus
 * sintético desechable: no toca el corpus de G ni el arnés real.
 *
 * Método: para cada escenario se construye un corpus mínimo y un inventario, se
 * invoca el corredor como subproceso y se comprueba que (a) el código de salida es
 * distinto de cero y (b) la condición bloqueante esperada aparece en el informe.
 *
 * Un gate que no rompe es un gate que no existe.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const HARNESS = path.resolve(__dirname, '..', 'h6a');
const RUNNER = path.join(HARNESS, 'runner.js');
const ROOT = path.join(os.tmpdir(), 'axion-h6b-selftest', crypto.randomBytes(4).toString('hex'));

const sha256 = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

const PASSING_SUITE = "'use strict';\nconsole.log('suite sintetica OK');\n";
const FAILING_SUITE = "'use strict';\nconst assert = require('assert');\nassert.strictEqual(1, 2, 'fallo deliberado');\n";
// Suite que bloquea 3 s. Hace determinista el escenario de mutación del
// inventario: garantiza que la corrida siga viva cuando llega la escritura.
const SLOW_SUITE = "'use strict';\n"
  + 'Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 3000);\n'
  + "console.log('suite lenta OK');\n";

/** Corpus sintético: tests/ con las suites indicadas. Devuelve rutas. */
function buildCorpus(label, suites) {
  const dir = path.join(ROOT, label);
  fs.mkdirSync(path.join(dir, 'tests'), { recursive: true });
  for (const [name, body] of Object.entries(suites)) {
    fs.writeFileSync(path.join(dir, 'tests', name), body, 'utf8');
  }
  return dir;
}

/**
 * Inventario para el corpus sintético. Incluye también las sondas rojas reales
 * del arnés, porque el corredor siempre las descubre.
 */
function buildInventory(corpus, dir, { drop = [], corruptHash = [] } = {}) {
  const entries = [];
  for (const f of fs.readdirSync(path.join(corpus, 'tests')).sort()) {
    const id = `tests/${f}`;
    if (drop.includes(id)) continue;
    let h = sha256(path.join(corpus, 'tests', f));
    if (corruptHash.includes(id)) h = 'd'.repeat(64);
    entries.push({ id, source: 'corpus', sha256: h, category: 'synthetic', critical: false, expectation: 'PASS', oracle: null, maps_to_g_defect: null });
  }
  for (const f of fs.readdirSync(path.join(HARNESS, 'red')).sort()) {
    entries.push({
      id: `h6a/red/${f}`, source: 'h6a-red-probe', sha256: sha256(path.join(HARNESS, 'red', f)),
      category: 'red-probe', critical: false, expectation: 'RED_UNTIL_H_BUILD', oracle: null, maps_to_g_defect: null,
    });
  }
  const p = path.join(dir, 'inventory.json');
  fs.writeFileSync(p, `${JSON.stringify({
    identifier: 'AX-H6B-SELFTEST-INVENTORY', version: '1.0.0',
    harness_integrity: {}, g_declared_regression_scope: [], suites: entries,
  }, null, 2)}\n`, 'utf8');
  return p;
}

function runRunner(corpus, inventory, out, env = {}) {
  const r = spawnSync(process.execPath, [RUNNER, '--corpus', corpus, '--inventory', inventory, '--out', out], {
    encoding: 'utf8', env: { ...process.env, ...env }, timeout: 300000, windowsHide: true,
  });
  const report = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : null;
  return { exitCode: r.status, report };
}

// ---------------------------------------------------------------------------
const scenarios = [];
let failures = 0;

function scenario(name, expectedCondition, build) {
  scenarios.push({ name, expectedCondition, build });
}

scenario('suite descubierta pero NO inventariada', 'TEST_DISCOVERY_MISMATCH', (label) => {
  const corpus = buildCorpus(label, { 'a.test.js': PASSING_SUITE, 'b.test.js': PASSING_SUITE });
  const inv = buildInventory(corpus, path.join(ROOT, label), { drop: ['tests/b.test.js'] });
  return { corpus, inv };
});

scenario('suite inventariada pero AUSENTE del disco', 'TEST_DISCOVERY_MISMATCH', (label) => {
  const corpus = buildCorpus(label, { 'a.test.js': PASSING_SUITE, 'b.test.js': PASSING_SUITE });
  const inv = buildInventory(corpus, path.join(ROOT, label));
  fs.unlinkSync(path.join(corpus, 'tests', 'b.test.js'));   // borrada tras inventariar
  return { corpus, inv };
});

scenario('hash de una suite alterado', 'TEST_INTEGRITY_MISMATCH', (label) => {
  const corpus = buildCorpus(label, { 'a.test.js': PASSING_SUITE });
  const inv = buildInventory(corpus, path.join(ROOT, label), { corruptHash: ['tests/a.test.js'] });
  return { corpus, inv };
});

scenario('una suite falla', 'SUITE_FAILURES', (label) => {
  const corpus = buildCorpus(label, { 'a.test.js': PASSING_SUITE, 'b.test.js': FAILING_SUITE });
  const inv = buildInventory(corpus, path.join(ROOT, label));
  return { corpus, inv };
});

scenario('una suite no se ejecuta', 'EXECUTION_COUNT_MISMATCH', (label) => {
  const corpus = buildCorpus(label, { 'a.test.js': PASSING_SUITE, 'b.test.js': PASSING_SUITE });
  const inv = buildInventory(corpus, path.join(ROOT, label));
  return { corpus, inv, env: { AXION_H6B_FAULT: 'skip:tests/b.test.js' } };
});

scenario('passed + failed != executed', 'ARITHMETIC_GATE_FAILURE', (label) => {
  const corpus = buildCorpus(label, { 'a.test.js': PASSING_SUITE });
  const inv = buildInventory(corpus, path.join(ROOT, label));
  return { corpus, inv, env: { AXION_H6B_FAULT: 'arith' } };
});

scenario('inventario mutado durante la corrida', 'TEST_INVENTORY_MUTATED', (label) => {
  // La suite lenta garantiza que la corrida siga activa a los 400 ms.
  const corpus = buildCorpus(label, { 'a.test.js': PASSING_SUITE, 'z_slow.test.js': SLOW_SUITE });
  const inv = buildInventory(corpus, path.join(ROOT, label));
  // Un proceso REALMENTE independiente reescribe el inventario mientras el
  // corredor trabaja. No sirve un setTimeout local: spawnSync bloquea el bucle
  // de eventos de este proceso y el temporizador no llegaria a dispararse.
  const script = `
    const fs = require('fs');
    setTimeout(() => {
      try {
        const j = JSON.parse(fs.readFileSync(${JSON.stringify(inv)}, 'utf8'));
        j.mutated_during_run = true;
        fs.writeFileSync(${JSON.stringify(inv)}, JSON.stringify(j, null, 2) + '\\n', 'utf8');
      } catch (_) { /* la corrida ya termino */ }
    }, 400);
  `;
  const child = require('child_process').spawn(process.execPath, ['-e', script], {
    detached: true, stdio: 'ignore', windowsHide: true,
  });
  child.unref();
  return { corpus, inv };
});

scenario('integridad del arnes rota', 'HARNESS_INTEGRITY_MISMATCH', (label) => {
  const corpus = buildCorpus(label, { 'a.test.js': PASSING_SUITE });
  const inv = buildInventory(corpus, path.join(ROOT, label));
  const j = JSON.parse(fs.readFileSync(inv, 'utf8'));
  j.harness_integrity = { 'runner.js': 'e'.repeat(64) };    // hash falso a proposito
  fs.writeFileSync(inv, `${JSON.stringify(j, null, 2)}\n`, 'utf8');
  return { corpus, inv };
});

// ---------------------------------------------------------------------------
console.log('=== AXION H-6b — AUTOPRUEBA DEL CORREDOR ===\n');
const outcomes = [];

for (const s of scenarios) {
  const label = s.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const built = s.build(label);
  const out = path.join(ROOT, label, 'report.json');
  const { exitCode, report } = runRunner(built.corpus, built.inv, out, built.env || {});
  const conditions = report ? report.blocking_conditions : [];
  const hasCondition = conditions.includes(s.expectedCondition);
  const nonZero = exitCode !== 0;
  const ok = hasCondition && nonZero;
  if (!ok) failures += 1;
  outcomes.push({ scenario: s.name, expected: s.expectedCondition, exitCode, conditions, ok });
  console.log(`  [${ok ? 'OK  ' : 'FAIL'}] ${s.name}`);
  console.log(`         esperado: ${s.expectedCondition} | exit ${exitCode} | obtenido: ${conditions.join(', ') || '(ninguna)'}`);
}

// Escenario de control: sin perturbación, el corredor no debe inventar bloqueos.
{
  const label = 'control-limpio';
  const corpus = buildCorpus(label, { 'a.test.js': PASSING_SUITE });
  fs.rmSync(path.join(corpus, 'tests'), { recursive: true, force: true });
  fs.mkdirSync(path.join(corpus, 'tests'), { recursive: true });
  fs.writeFileSync(path.join(corpus, 'tests', 'a.test.js'), PASSING_SUITE, 'utf8');
  // Inventario sólo con la suite sintética: las sondas rojas se excluyen usando
  // un corpus cuyo arnés no aporta sondas es imposible, así que se aceptan y se
  // marcan como esperadas en rojo. El control comprueba las condiciones NO
  // relacionadas con fallos de suite.
  const inv = buildInventory(corpus, path.join(ROOT, label));
  const out = path.join(ROOT, label, 'report.json');
  const { report } = runRunner(corpus, inv, out);
  const infra = (report.blocking_conditions || []).filter((c) => c !== 'SUITE_FAILURES');
  const ok = infra.length === 0;
  if (!ok) failures += 1;
  outcomes.push({ scenario: 'control limpio (sin perturbacion)', expected: 'sin bloqueos de infraestructura', exitCode: report.exit_code, conditions: report.blocking_conditions, ok });
  console.log(`  [${ok ? 'OK  ' : 'FAIL'}] control limpio (sin perturbacion)`);
  console.log(`         bloqueos de infraestructura: ${infra.join(', ') || '(ninguno)'}`);
}

const summary = {
  contractVersion: '1.0.0', stage: 'H-6b-selftest',
  generated_at: new Date().toISOString(),
  total: outcomes.length, passed: outcomes.filter((o) => o.ok).length,
  failed: outcomes.filter((o) => !o.ok).length, outcomes,
};
fs.writeFileSync(path.join(ROOT, 'selftest.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
if (process.env.AXION_H6B_SELFTEST_OUT) {
  fs.writeFileSync(process.env.AXION_H6B_SELFTEST_OUT, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
}

console.log(`\n=== ${summary.passed}/${summary.total} escenarios correctos ===`);
if (failures > 0) {
  console.log('FAIL: al menos un gate no rompe cuando debe.');
  process.exit(1);
}
console.log('PASS: todos los gates rompen ante su perturbacion.');
