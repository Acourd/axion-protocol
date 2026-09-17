#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Chequeo de suites concurrentes sobre el MISMO checkout.
 *
 * Lanza N suites completas simultáneas (por defecto 2) con el mismo HOME aislado y
 * exige que TODAS terminen verdes con resumen completo y válido: sin colisiones de
 * directorios temporales, de keyring, de ledger ni de artefactos compartidos.
 *
 * La salida completa de cada corrida se conserva en scratch/concurrent-suite-check/
 * (ruta impresa al final) para evidencia de aceptación.
 *
 * No forma parte de la suite (evita recursión): es un verificador de aceptación.
 * Uso: node tools/concurrent_suite_check.js [--runs N] [--timeout ms] [--keep]
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
const timeoutMs = Number(arg('timeout', String(30 * 60 * 1000)));
const workers = Number(arg('workers', String(Math.max(2, Math.min(os.cpus().length, 4)))));
const keepLogs = process.argv.includes('--keep');
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-concurrent-home-'));
const logsDir = path.join(ROOT, 'scratch', 'concurrent-suite-check');
fs.mkdirSync(logsDir, { recursive: true });
const env = { ...process.env, USERPROFILE: home, HOME: home };

function lanzar(run) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(ROOT, 'tests', 'run_all.js'), '--concurrency', String(workers)], {
      cwd: ROOT,
      env,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let salida = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);
    child.stdout.on('data', (d) => { salida += d; });
    child.stderr.on('data', (d) => { salida += d; });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const logFile = path.join(logsDir, `run-${run}-${stamp}.log`);
      const stableFile = path.join(logsDir, `run-${run}.log`);
      fs.writeFileSync(logFile, salida, 'utf8');
      fs.writeFileSync(stableFile, salida, 'utf8');
      resolve({ run, code, signal, salida, timedOut, logFile });
    });
  });
}

function resumir(r) {
  const verde = (r.salida.match(/en verde\s*:\s*(\d+)/) || [])[1] || null;
  const rojo = (r.salida.match(/en rojo\s*:\s*(\d+)/) || [])[1] || null;
  const paso = /PASS: las \d+ suites/.test(r.salida);
  const fallidas = [...r.salida.matchAll(/^\s*FAIL\s+(\S+)\s+\((.*)\)\s*$/gm)].map((m) => `${m[1]} (${m[2]})`);
  return { verde, rojo, paso, fallidas };
}

async function verificarConcurrencia() {
  console.log(`=== Suites concurrentes sobre el mismo checkout (runs=${runs}, workers/run=${workers}, timeout=${timeoutMs}ms) ===`);
  const resultados = await Promise.all(Array.from({ length: runs }, (_, i) => lanzar(i + 1)));

  let ok = true;
  for (const r of resultados) {
    const s = resumir(r);
    r.resumen = s;
    const valido = !r.timedOut && s.verde !== null && s.rojo === '0' && s.paso;
    if (r.code !== 0 || !valido) ok = false;
    let estado;
    if (r.timedOut) estado = `TIMEOUT (SIGKILL a los ${timeoutMs}ms; sin resumen válido)`;
    else if (s.verde === null) estado = `SIN RESUMEN VALIDO (exit=${r.code}${r.signal ? `, señal=${r.signal}` : ''}; la corrida no imprimió el resumen)`;
    else estado = `${s.paso && s.rojo === '0' ? 'PASS' : 'FAIL'}`;
    console.log(`  run ${r.run}: exit=${r.code}${r.signal ? ` señal=${r.signal}` : ''} verde=${s.verde ?? '?'} rojo=${s.rojo ?? '?'} ${estado}`);
    if (s.fallidas.length > 0) {
      console.log(`    suites en rojo (${s.fallidas.length}):`);
      for (const f of s.fallidas) console.log(`      - ${f}`);
    }
  }

  console.log('\nSalidas completas conservadas en:');
  for (const r of resultados) console.log(`  run ${r.run}: ${r.logFile}`);

  if (!ok) {
    for (const r of resultados) {
      if (r.code !== 0 || !r.resumen || !r.resumen.paso) {
        console.log(`\n--- salida run ${r.run} (últimas 60 líneas de ${r.logFile}) ---`);
        console.log(r.salida.split('\n').slice(-60).join('\n'));
      }
    }
  }

  const veredicto = construirResumen(resultados);

  fs.rmSync(home, { recursive: true, force: true });
  console.log(veredicto.mensaje);
  if (veredicto.ok && !keepLogs) console.log('(los logs se conservan en scratch/concurrent-suite-check; ignorados por git)');
  return veredicto.ok;
}

/**
 * Mensaje final derivado del conteo REAL de cada corrida. Cualquier texto fijo con
 * totales queda prohibido: si las corridas verdes no coinciden entre sí, es FAIL por
 * evidencia inconsistente (no se puede sellar un total que nadie midió).
 */
function construirResumen(resultados) {
  const verdes = resultados.filter((r) => r.resumen && r.resumen.paso && r.resumen.rojo === '0' && r.code === 0 && !r.timedOut);
  if (verdes.length !== resultados.length) {
    return {
      ok: false,
      mensaje: `\nFAIL: ${verdes.length}/${resultados.length} corridas concurrentes terminaron verdes y completas (ver logs arriba).`
    };
  }
  const conteos = [...new Set(verdes.map((r) => r.resumen.verde))];
  if (conteos.length !== 1) {
    return {
      ok: false,
      mensaje: `\nFAIL: las corridas verdes reportan totales distintos (${conteos.join(', ')}); evidencia inconsistente.`
    };
  }
  const total = conteos[0];
  return {
    ok: true,
    mensaje: `\nPASS: ${resultados.length} corridas concurrentes verdes (${total}/${total} cada una) sobre el mismo checkout, sin colisiones.`
  };
}

if (require.main === module) {
  verificarConcurrencia()
    .then((ok) => process.exit(ok ? 0 : 1))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { verificarConcurrencia, lanzar, resumir, construirResumen };
