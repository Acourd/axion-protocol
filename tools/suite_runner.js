#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Runner de suites con timeout por suite y terminación de árbol.
 *
 * - Timeout explícito por suite (default 120s, configurable) y clasificación del
 *   resultado: PASS, NON_ZERO_EXIT, TIMEOUT, SIGNAL, SPAWN_ERROR.
 * - Al vencer el timeout, terminación ordenada del árbol completo (SIGTERM →
 *   SIGKILL en POSIX; taskkill /T /F en Windows) y limpieza de streams.
 * - Sin dependencias externas y sin shell.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { killTree } = require('./process_tree.js');

const ROOT = path.resolve(__dirname, '..');

const DOMAINS = [
  { nombre: '01_governance_preflight', label: '🛡️ Governance & Preflight' },
  { nombre: '02_cryptography_attestation', label: '🔐 Cryptography & Attestation' },
  { nombre: '03_intent_socratic', label: '🧭 Intent & Socratic UX' },
  { nombre: '04_state_recovery', label: '💾 State, Checkpoints & Recovery' },
  { nombre: '05_adversarial_resilience', label: '⚡ Adversarial Resilience' }
];

const DEFAULT_TIMEOUT_MS = 120000;

function listarSuites(dir, dominio, label, filtro = null) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.test.js'))
    .sort()
    .filter((f) => !filtro || f.includes(filtro) || dominio.includes(filtro) || (label && label.toLowerCase().includes(filtro.toLowerCase())))
    .map((f) => ({
      dominio,
      label,
      fichero: f,
      nombre: f.replace('.test.js', ''),
      absPath: path.join(dir, f)
    }));
}

/**
 * Recolecta las tareas:
 * - Si testsDir contiene directorios de dominio (01_..05_), los recorre.
 * - Si no (fixtures planas), toma los *.test.js de la raíz de testsDir.
 */
function recolectarTareas(testsDir, filtro = null) {
  const entries = fs.readdirSync(testsDir, { withFileTypes: true });
  const dominios = entries.filter((e) => e.isDirectory() && /^\d\d_/.test(e.name)).map((e) => e.name);
  if (dominios.length === 0) {
    return listarSuites(testsDir, 'fixtures', 'Fixtures', null);
  }
  const tareas = [];
  for (const nombre of dominios.sort()) {
    const label = (DOMAINS.find((d) => d.nombre === nombre) || {}).label || nombre;
    tareas.push(...listarSuites(path.join(testsDir, nombre), nombre, label, filtro));
  }
  return tareas;
}

function ejecutarTarea(task, timeoutMs) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const child = spawn(process.execPath, [task.absPath], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32'
    });
    let stdout = '';
    let stderr = '';
    let settle = null;

    const finalizar = (resultado) => {
      if (settle) return;
      settle = resultado;
      clearTimeout(watchdog);
      resolve({
        ...task,
        executionTimeMs: Date.now() - t0,
        output: `${stdout}\n${stderr}`.trim(),
        ...resultado
      });
    };

    const watchdog = setTimeout(() => {
      const kill = killTree(child, { graceMs: 400 });
      // Cierre de streams para no retener el evento.
      try { child.stdout.destroy(); } catch (_) { /* stream ya cerrado */ }
      try { child.stderr.destroy(); } catch (_) { /* stream ya cerrado */ }
      finalizar({
        status: 'TIMEOUT',
        pass: false,
        signal: null,
        kill,
        error: `Timeout de suite (${timeoutMs}ms); árbol terminado vía ${kill.method}`
      });
    }, timeoutMs);

    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });

    child.on('error', (err) => {
      finalizar({ status: 'SPAWN_ERROR', pass: false, signal: null, error: err.message });
    });

    child.on('close', (code, signal) => {
      if (signal) {
        finalizar({ status: 'SIGNAL', pass: false, signal, error: `Terminado por señal ${signal}` });
        return;
      }
      finalizar({
        status: code === 0 ? 'PASS' : 'NON_ZERO_EXIT',
        pass: code === 0,
        exitCode: code,
        signal: null,
        error: code === 0 ? null : `salida ${code}`
      });
    });
  });
}

async function runSuites(options = {}) {
  const testsDir = path.resolve(options.testsDir || path.join(ROOT, 'tests'));
  const timeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0 ? options.timeoutMs : DEFAULT_TIMEOUT_MS;
  const concurrency = Number.isFinite(options.concurrency) && options.concurrency > 0
    ? options.concurrency
    : Math.max(2, Math.min(os.cpus().length, 8));
  const filtro = options.domain || null;

  const tareas = recolectarTareas(testsDir, filtro);
  const results = new Array(tareas.length);
  let index = 0;

  async function worker() {
    while (index < tareas.length) {
      const i = index++;
      results[i] = await ejecutarTarea(tareas[i], timeoutMs);
    }
  }

  const t0 = Date.now();
  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(tareas.length, 1)) }, () => worker()));

  const passed = results.filter((r) => r && r.status === 'PASS').length;
  const failed = results.filter((r) => r && r.status !== 'PASS').length;
  const timeouts = results.filter((r) => r && r.status === 'TIMEOUT').length;

  return {
    testsDir,
    timeoutMs,
    concurrency,
    results,
    total: results.length,
    passed,
    failed,
    timeouts,
    durationMs: Date.now() - t0
  };
}

if (require.main === module) {
  runSuites({ testsDir: process.argv[2] })
    .then((r) => {
      console.log(JSON.stringify({ total: r.total, passed: r.passed, failed: r.failed, timeouts: r.timeouts }, null, 2));
      process.exit(r.failed === 0 ? 0 : 1);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { runSuites, recolectarTareas, DEFAULT_TIMEOUT_MS, DOMAINS };
