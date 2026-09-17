#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Chequeo de suites concurrentes sobre el MISMO checkout.
 *
 * Lanza N suites completas simultáneas (por defecto 2) con el mismo HOME aislado y
 * exige que todas terminen verdes: sin colisiones de directorios temporales, de
 * keyring, de ledger ni de artefactos compartidos.
 *
 * No forma parte de la suite (evita recursión): es un verificador de aceptación.
 * Uso: node tools/concurrent_suite_check.js [--runs N] [--timeout ms]
 */

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const runs = Number(arg('runs', '2'));
const timeoutMs = Number(arg('timeout', String(15 * 60 * 1000)));
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-concurrent-home-'));
const env = { ...process.env, USERPROFILE: home, HOME: home };

function lanzar(run) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(ROOT, 'tests', 'run_all.js')], {
      cwd: ROOT,
      env,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let salida = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
    }, timeoutMs);
    child.stdout.on('data', (d) => { salida += d; });
    child.stderr.on('data', (d) => { salida += d; });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ run, code, salida });
    });
  });
}

async function verificarConcurrencia() {
  console.log(`=== Suites concurrentes sobre el mismo checkout (runs=${runs}) ===`);
  const resultados = await Promise.all(Array.from({ length: runs }, (_, i) => lanzar(i + 1)));

  let ok = true;
  for (const r of resultados) {
    const verde = (r.salida.match(/en verde\s*:\s*(\d+)/) || [])[1] || '?';
    const rojo = (r.salida.match(/en rojo\s*:\s*(\d+)/) || [])[1] || '?';
    const paso = /PASS: las \d+ suites/.test(r.salida);
    if (r.code !== 0 || !paso || rojo !== '0') ok = false;
    console.log(`  run ${r.run}: exit=${r.code} verde=${verde} rojo=${rojo} ${paso ? 'PASS' : 'FAIL'}`);
  }

  if (!ok) {
    for (const r of resultados) {
      if (r.code !== 0) {
        console.log(`\n--- salida run ${r.run} (últimas 40 líneas) ---`);
        console.log(r.salida.split('\n').slice(-40).join('\n'));
      }
    }
  }

  fs.rmSync(home, { recursive: true, force: true });
  console.log(ok ? '\nPASS: concurrencia sin colisiones' : '\nFAIL: se detectaron colisiones entre suites concurrentes');
  return ok;
}

if (require.main === module) {
  verificarConcurrencia()
    .then((ok) => process.exit(ok ? 0 : 1))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { verificarConcurrencia, lanzar };

