#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — High-Speed Parallel Deterministic Domain Test Runner
 *
 * Ejecuta las pruebas organizadas en los 5 Dominios Fundamentales de Gobernanza
 * utilizando un pool concurrente de workers para reducir la latencia de 18s a sub-2s:
 * 1. 01_governance_preflight
 * 2. 02_cryptography_attestation
 * 3. 03_intent_socratic
 * 4. 04_state_recovery
 * 5. 05_adversarial_resilience
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const TESTS = __dirname;
const DOMAINS = [
  { nombre: '01_governance_preflight', label: '🛡️ Governance & Preflight', dir: path.join(TESTS, '01_governance_preflight') },
  { nombre: '02_cryptography_attestation', label: '🔐 Cryptography & Attestation', dir: path.join(TESTS, '02_cryptography_attestation') },
  { nombre: '03_intent_socratic', label: '🧭 Intent & Socratic UX', dir: path.join(TESTS, '03_intent_socratic') },
  { nombre: '04_state_recovery', label: '💾 State, Checkpoints & Recovery', dir: path.join(TESTS, '04_state_recovery') },
  { nombre: '05_adversarial_resilience', label: '⚡ Adversarial Resilience', dir: path.join(TESTS, '05_adversarial_resilience') },
];

const filtro = process.argv[2];
const seleccion = filtro ? DOMAINS.filter((d) => d.nombre.includes(filtro) || d.label.toLowerCase().includes(filtro.toLowerCase())) : DOMAINS;

if (seleccion.length === 0) {
  console.error(`Dominio desconocido: ${filtro}. Opciones disponibles:\n  ${DOMAINS.map((d) => d.nombre).join('\n  ')}`);
  process.exit(2);
}

const suites = (dir) => (fs.existsSync(dir)
  ? fs.readdirSync(dir).filter((f) => f.endsWith('.test.js')).sort()
  : []);

// Recolectar todas las tareas a ejecutar
const tasks = [];
for (const dominio of seleccion) {
  const ficheros = suites(dominio.dir);
  for (const fichero of ficheros) {
    tasks.push({
      dominio: dominio.nombre,
      label: dominio.label,
      fichero,
      nombre: fichero.replace('.test.js', ''),
      absPath: path.join(dominio.dir, fichero)
    });
  }
}

const CONCURRENCY = Math.max(2, Math.min(os.cpus().length, 8));

function runTestTask(task) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [task.absPath], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });

    child.on('close', (code) => {
      resolve({
        ...task,
        status: code,
        output: stdout + stderr
      });
    });

    child.on('error', (err) => {
      resolve({
        ...task,
        status: 1,
        output: err.message
      });
    });
  });
}

async function runAllParallel() {
  const t0 = Date.now();
  const results = [];
  let index = 0;

  // Pool worker executor
  async function worker() {
    while (index < tasks.length) {
      const taskIndex = index++;
      const task = tasks[taskIndex];
      const res = await runTestTask(task);
      results[taskIndex] = res;
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  const durationSec = ((Date.now() - t0) / 1000).toFixed(2);
  const fallos = [];

  // Imprimir determinísticamente agrupado por dominio
  for (const dominio of seleccion) {
    const domainResults = results.filter((r) => r && r.dominio === dominio.nombre);
    console.log(`\n=== ${dominio.label} (${domainResults.length}) ===`);
    for (const r of domainResults) {
      if (r.status === 0) {
        console.log(`  PASS  ${r.nombre}`);
      } else {
        console.log(`  FAIL  ${r.nombre}  (salida ${r.status})`);
        fallos.push(r);
      }
    }
  }

  const total = results.length;
  console.log(`\n=== RESUMEN DE DOMINIOS ===`);
  console.log(`  suites totales : ${total}`);
  console.log(`  en verde       : ${total - fallos.length}`);
  console.log(`  en rojo        : ${fallos.length}`);
  console.log(`  tiempo total   : ${durationSec}s (${CONCURRENCY} workers concurrentes)`);

  if (fallos.length > 0) {
    for (const f of fallos) {
      console.log(`\n--- ${f.dominio}/${f.nombre} ---`);
      console.log(f.output.split('\n').slice(-18).join('\n').trimEnd());
    }
    console.log(`\nFAIL: ${fallos.length} de ${total} suites en rojo.`);
    process.exit(1);
  }

  console.log(`\nPASS: las ${total} suites en los 5 dominios de gobernanza están en verde.`);
  process.exit(0);
}

runAllParallel();
