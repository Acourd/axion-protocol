#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — High-Speed Parallel Deterministic Domain Test Runner
 *
 * Ejecuta las pruebas organizadas en los 5 Dominios Fundamentales de Gobernanza
 * usando el runner con timeout por suite y terminación de árbol (tools/suite_runner.js).
 *
 * Opciones:
 *   node tests/run_all.js [filtro] [--timeout <ms>] [--concurrency <n>]
 *
 * Cero dependencias externas.
 */

const path = require('path');
const { runSuites } = require('../tools/suite_runner.js');

const args = process.argv.slice(2);
function valorOpcion(nombre) {
  const i = args.indexOf(`--${nombre}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : null;
}

const filtro = args.find((a) => !a.startsWith('--') && a !== valorOpcion('timeout') && a !== valorOpcion('concurrency')) || null;
const timeoutMs = Number(valorOpcion('timeout') || process.env.AXION_SUITE_TIMEOUT_MS || 0) || undefined;
const concurrency = Number(valorOpcion('concurrency') || 0) || undefined;

(async () => {
  let res;
  try {
    res = await runSuites({ domain: filtro, timeoutMs, concurrency });
  } catch (err) {
    console.error(`No se pudieron recolectar las suites: ${err.message}`);
    process.exit(2);
  }

  const dominios = [...new Set(res.results.map((r) => r.dominio))];
  const fallos = [];

  for (const dominio of dominios) {
    const delDominio = res.results.filter((r) => r.dominio === dominio);
    const label = delDominio[0].label || dominio;
    console.log(`\n=== ${label} (${delDominio.length}) ===`);
    for (const r of delDominio) {
      if (r.status === 'PASS') {
        console.log(`  PASS  ${r.nombre}`);
      } else {
        const detalle = r.status === 'TIMEOUT'
          ? `TIMEOUT tras ${res.timeoutMs}ms`
          : `salida ${r.exitCode !== undefined ? r.exitCode : r.status}`;
        console.log(`  FAIL  ${r.nombre}  (${detalle})`);
        if (r.status !== 'PASS') fallos.push(r);
      }
    }
  }

  const durationSec = (res.durationMs / 1000).toFixed(2);
  console.log('\n=== RESUMEN DE DOMINIOS ===');
  console.log(`  suites totales : ${res.total}`);
  console.log(`  en verde       : ${res.passed}`);
  console.log(`  en rojo        : ${res.failed}`);
  console.log(`  timeouts       : ${res.timeouts}`);
  console.log(`  tiempo total   : ${durationSec}s (${res.concurrency} workers concurrentes)`);

  if (fallos.length > 0) {
    for (const f of fallos.slice(0, 10)) {
      console.log(`\n--- ${f.dominio}/${f.nombre} ---`);
      const salida = (f.output || f.error || '').split('\n').slice(-40).join('\n').trimEnd();
      if (salida) console.log(salida);
    }
    console.log(`\nFAIL: ${fallos.length} de ${res.total} suites en rojo.`);
    process.exit(1);
  }

  console.log(`\nPASS: las ${res.total} suites en los 5 dominios de gobernanza están en verde.`);
  process.exit(0);
})();
