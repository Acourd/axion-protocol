'use strict';

/**
 * AX-F-229: Invariantes documentales contra conteos contradictorios y claims no sustentados (P0-E).
 *
 * 1. Todo conteo de suites declarado en superficies vivas debe igualar el conteo real.
 * 2. No puede reaparecer un reclamo de nivel SLSA en las superficies auditadas.
 * 3. El "sandbox" de ejecución arbitraria debe permanecer deshabilitado y sin evaluación dinámica.
 * 4. Los informes de madurez deben declarar estado experimental y no puntajes no reproducibles.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { contarSuites } = require('../../tools/sync_doc_stats.js');

console.log('=== AX-F-229 Invariantes documentales: conteos y claims ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const real = contarSuites(ROOT).total;
assert.ok(real > 0);

function leer(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function extraerTodos(contenido, regex, etiqueta) {
  const valores = [];
  let m;
  const r = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
  while ((m = r.exec(contenido)) !== null) {
    for (let i = 1; i < m.length; i++) {
      if (m[i] !== undefined) valores.push(Number(m[i]));
    }
  }
  assert.ok(valores.length > 0, `No se declaró ningún conteo de suites en ${etiqueta}`);
  for (const v of valores) {
    assert.strictEqual(v, real, `${etiqueta} declara ${v} suites, pero el conteo real es ${real}. Ejecuta node tools/sync_doc_stats.js`);
  }
  return valores;
}

// 1. Conteos por superficie
extraerTodos(leer('README.md'), /includes \*\*(\d+) deterministic test suites\*\*/, 'README.md (encabezado)');
extraerTodos(leer('README.md'), /\*\*Total: (\d+) suites\*\*/, 'README.md (total)');
extraerTodos(leer('README.es.md'), /incluye \*\*(\d+) suites de prueba deterministas\*\*/, 'README.es.md');
extraerTodos(leer('README.es.md'), /# Ejecutar las (\d+) suites de prueba/, 'README.es.md (comando)');
extraerTodos(leer('CONTRIBUTING.md'), /All (\d+) deterministic suites/, 'CONTRIBUTING.md (invariante)');
extraerTodos(leer('CONTRIBUTING.md'), /All (\d+) test suites pass/, 'CONTRIBUTING.md (PR)');
extraerTodos(leer('ROADMAP.md'), /(\d+) suites deterministas \(resultado verificado en CI\)/, 'ROADMAP.md');
extraerTodos(leer('docs/ASYMPTOTIC_MATURITY_REPORT.md'), /(\d+) deterministic test suites/, 'ASYMPTOTIC_MATURITY_REPORT.md');
extraerTodos(leer('docs/ASYMPTOTIC_MATURITY_REPORT.es.md'), /(\d+) suites deterministas/, 'ASYMPTOTIC_MATURITY_REPORT.es.md');
extraerTodos(leer('docs/attestation_viewer.html'), /\(suite: (\d+) pruebas · resultado en CI\)/, 'attestation_viewer.html');
extraerTodos(leer('docs/site/index.html'), /Distribución de las (\d+) Suites/, 'docs/site/index.html (título)');
extraerTodos(leer('docs/site/index.html'), /id="telemetry-text">(\d+) Suites/, 'docs/site/index.html (telemetría)');
extraerTodos(leer('docs/site/index.html'), /class="m-val">(\d+) suites</, 'docs/site/index.html (métricas)');
extraerTodos(leer('docs/site/script.js'), /statusPill: 'v[\w.-]+ · (\d+) Suites'/, 'docs/site/script.js (statusPill)');
extraerTodos(leer('docs/site/script.js'), /telemetryStatus: '(\d+) Suites'/, 'docs/site/script.js (telemetryStatus)');
extraerTodos(leer('docs/site/script.js'), /Distribution of the (\d+) Suites/, 'docs/site/script.js (breakdown)');
extraerTodos(leer('docs/site/script.js'), /\[simulación\] (\d+) suites/, 'docs/site/script.js (log simulado)');
console.log(`✓ Todas las superficies vivas declaran el conteo real (${real} suites)`);

// 1b. Los conteos no pueden convertirse en veredictos de aprobación
for (const rel of ['README.md', 'README.es.md', 'docs/site/index.html', 'docs/site/script.js']) {
  const contenido = leer(rel);
  assert.ok(!/\d+\s*\/\s*\d+\s+(?:suites\s+)?PASS/i.test(contenido), `${rel} no puede inferir PASS desde un conteo`);
  assert.ok(!/\d+\s+Suites?\s+PASS/i.test(contenido), `${rel} no puede declarar PASS desde un conteo`);
  assert.ok(!/Suites in Green|Suites en Verde/i.test(contenido), `${rel} no puede declarar "green" desde un conteo`);
}
assert.ok(!/\d+\s+Suites?[^<]{0,60}PASS/i.test(leer('docs/attestation_viewer.html')),
  'attestation_viewer.html no puede combinar un conteo con PASS; el resultado se consulta en CI');
assert.ok(/CI publishes the verified result/.test(leer('README.md')), 'README.md debe remitir el resultado verificado a CI');
console.log('✓ Conteos separados de veredictos: los resultados se remiten a CI');

// 2. Claims SLSA de nivel: prohibidos
const superficiesClaims = [
  'README.md', 'README.es.md', 'docs/COMMANDS.md', 'docs/COMMANDS.es.md',
  'CONTRIBUTING.md', 'ROADMAP.md', '.agents/AGENTS.md',
  '.agents/skills/attest/SKILL.md', '.claude/commands/attest.md', '.opencode/commands/attest.md',
  'tools/provenance_sbom_generator.js', 'tools/compliance_matrix_exporter.js', 'bin/axion.js'
];
const patronNivelSlsa = /SLSA\s*(?:Level|Nivel|L)\s*3|SLSA_LEVEL_3/i;
for (const superficie of superficiesClaims) {
  assert.ok(!patronNivelSlsa.test(leer(superficie)), `${superficie} vuelve a reclamar nivel SLSA`);
}
console.log('✓ Ninguna superficie auditada reclama un nivel SLSA');

// 3. El falso sandbox permanece deshabilitado
const sandboxFuente = leer('tools/drive_worker_sandbox.js');
const sandboxCodigo = sandboxFuente
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');
assert.ok(sandboxFuente.includes('SANDBOX_UNAVAILABLE'), 'El runner debe declarar el estado no disponible');
assert.ok(!/new Function/.test(sandboxCodigo), 'No puede evaluar dinámicamente con new Function');
assert.ok(!/eval\s*:\s*true/.test(sandboxCodigo), 'No puede instanciar Workers con eval: true');
assert.ok(!/require\('node:worker_threads'\)/.test(sandboxCodigo), 'No puede depender de Worker Threads para ejecutar');
const engineFuente = leer('tools/drive_engine.js');
assert.ok(engineFuente.includes('runSandboxedTask'), 'DriveEngine conserva el punto de entrada fail-closed');
console.log('✓ La ejecución arbitraria permanece deshabilitada sin evaluación dinámica');

// 4. Informes de madurez: estado experimental y sin puntajes no reproducibles
const informeEn = leer('docs/ASYMPTOTIC_MATURITY_REPORT.md');
const informeEs = leer('docs/ASYMPTOTIC_MATURITY_REPORT.es.md');
assert.ok(informeEn.includes('Experimental status'), 'El informe EN debe declarar estado experimental');
assert.ok(informeEs.includes('Estado experimental'), 'El informe ES debe declarar estado experimental');
assert.ok(!/\b\d{1,3}(?:\.\d+)?%/.test(informeEn.replace(/RFC 8785|in-toto|SHA-256/g, '')), 'El informe EN no debe reintroducir puntajes porcentuales');
assert.ok(!/\b\d{1,3}(?:\.\d+)?%/.test(informeEs), 'El informe ES no debe reintroducir puntajes porcentuales');
console.log('✓ Informes de madurez en estado experimental y sin puntajes no reproducibles');

// 5. Sin métricas de rendimiento no reproducibles en los README
for (const rel of ['README.md', 'README.es.md']) {
  const contenido = leer(rel);
  assert.ok(!/Suite%20Speed|Package%20Size/.test(contenido), `${rel} reintroduce badges de rendimiento no reproducibles`);
  assert.ok(!/<\s*\d+\s*ms/.test(contenido), `${rel} reintroduce latencias no reproducibles`);
}
console.log('✓ README sin métricas de rendimiento no reproducibles');

console.log('\nPASS: AX-F-229 — Invariantes documentales verificados sin contradicciones.');
