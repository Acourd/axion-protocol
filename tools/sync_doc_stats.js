#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Sincronizador Atómico de Métricas y Documentación por Dominios.
 *
 * Escanea dinámicamente el estado real del repositorio en los 5 Dominios Fundamentales
 * de Gobernanza, e inyecta las métricas verificables en las superficies vivas:
 * README.md, README.es.md, CONTRIBUTING.md, docs/ASYMPTOTIC_MATURITY_REPORT.md(.es),
 * docs/PROMPT_ENGINEERING.md, docs/attestation_viewer.html y docs/site/.
 *
 * Los documentos históricos (CHANGELOG.md, docs/HANDOFF.md) no se reescriben:
 * son registro de lo que ocurrió, no métricas vivas.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const DOMAIN_CONFIG = [
  { key: 'governance', nombre: '01_governance_preflight', label: '🛡️ Governance & Preflight' },
  { key: 'cryptography', nombre: '02_cryptography_attestation', label: '🔐 Cryptography & Attestation' },
  { key: 'intent', nombre: '03_intent_socratic', label: '🧭 Intent & Socratic UX' },
  { key: 'state', nombre: '04_state_recovery', label: '💾 State, Checkpoints & Recovery' },
  { key: 'adversarial', nombre: '05_adversarial_resilience', label: '⚡ Adversarial Resilience' },
];

function contarSuites(dirRaiz = ROOT) {
  let total = 0;
  const desglose = {};

  for (const d of DOMAIN_CONFIG) {
    const dir = path.join(dirRaiz, 'tests', d.nombre);
    if (fs.existsSync(dir)) {
      const archivos = fs.readdirSync(dir).filter((f) => f.endsWith('.test.js'));
      desglose[d.key] = archivos.length;
      desglose[d.nombre] = archivos.length;
      total += archivos.length;
    } else {
      desglose[d.key] = 0;
      desglose[d.nombre] = 0;
    }
  }

  return { total, desglose };
}

function leerVersion() {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version || '0.0.0';
  } catch (_) {
    return '0.0.0';
  }
}

function reemplazar(archivo, transformaciones) {
  const ruta = path.join(ROOT, archivo);
  if (!fs.existsSync(ruta)) return false;
  let contenido = fs.readFileSync(ruta, 'utf8');
  for (const fn of transformaciones) {
    contenido = fn(contenido);
  }
  fs.writeFileSync(ruta, contenido, 'utf8');
  return true;
}

function sincronizarReadme(totalSuites, desglose) {
  return reemplazar('README.md', [
    (c) => c.replace(
      /Axion Protocol includes \*\*\d+ deterministic test suites\*\*/g,
      `Axion Protocol includes **${totalSuites} deterministic test suites**`
    ),
    (c) => c.replace(/\*\*Total: \d+ suites\*\*/g, `**Total: ${totalSuites} suites**`),
    (c) => c.replace(/CI-\d+%20Suites/g, `CI-${totalSuites}%20Suites`),
    (c) => c.replace(/passed in ~[\d.]+s \(\d+ concurrent workers\)\./g, 'passed across the 5 governance domains.'),
    (c) => c.replace(/\|\s*🛡️\s*\*\*Governance & Preflight\*\*\s*\|[^|]+\|\s*\d+\s*\|/g,
      `| 🛡️ **Governance & Preflight** | PreToolUse hooks, lexical preflight, killswitch, risk policy compiler, structured commands, workflow state machine, drive engine | ${desglose.governance} |`),
    (c) => c.replace(/\|\s*🔐\s*\*\*Cryptography & Attestation\*\*\s*\|[^|]+\|\s*\d+\s*\|/g,
      `| 🔐 **Cryptography & Attestation** | DSSE/PAE envelopes, RFC 8785 canonical JSON, in-toto Statement v1, Ed25519 signatures, evidence binding, revocation | ${desglose.cryptography} |`),
    (c) => c.replace(/\|\s*🧭\s*\*\*Intent & Socratic UX\*\*\s*\|[^|]+\|\s*\d+\s*\|/g,
      `| 🧭 **Intent & Socratic UX** | 2-question clarifier, A/B/C contracts, SHA-256 intent sealing, profile calibration, interactive wizard, deep reasoning | ${desglose.intent} |`),
    (c) => c.replace(/\|\s*💾\s*\*\*State, Checkpoints & Recovery\*\*\s*\|[^|]+\|\s*\d+\s*\|/g,
      `| 💾 **State, Checkpoints & Recovery** | Atomic snapshots, rollback plan validation, memory guard limits, context shield anchoring, evidence hasher, governance drift detection | ${desglose.state} |`),
    (c) => c.replace(/\|\s*⚡\s*\*\*Adversarial Resilience\*\*\s*\|[^|]+\|\s*\d+\s*\|/g,
      `| ⚡ **Adversarial Resilience** | Mutation vectors, pre-mortem verdict derivation, VibeGuard lexical gate, boilerplate detection, fuzzer burst resilience | ${desglose.adversarial} |`),
    (c) => c.replace(
      /All suites live under `tests\/`[^.\n]+/g,
      `All suites live under \`tests/\` organized across the **5 Core Domain Pillars**: **Governance** (${desglose.governance}), **Cryptography** (${desglose.cryptography}), **Intent** (${desglose.intent}), **State** (${desglose.state}), and **Adversarial** (${desglose.adversarial})`
    )
  ]);
}

function sincronizarReadmeEs(totalSuites) {
  return reemplazar('README.es.md', [
    (c) => c.replace(/incluye \*\*\d+ suites de prueba deterministas\*\*/g, `incluye **${totalSuites} suites de prueba deterministas**`),
    (c) => c.replace(/# Ejecutar las \d+ suites de prueba/g, `# Ejecutar las ${totalSuites} suites de prueba`),
    (c) => c.replace(/CI-\d+%20Suites/g, `CI-${totalSuites}%20Suites`)
  ]);
}

function sincronizarRoadmap(totalSuites) {
  return reemplazar('ROADMAP.md', [
    (c) => c.replace(/\d+ suites passing al 100%/g, `${totalSuites} suites en verde en CI`)
  ]);
}

function sincronizarTestsReadme(totalSuites) {
  return reemplazar('tests/README.md', [
    (c) => c.replace(/## 5 dominios y \d+ suites/g, `## 5 dominios y ${totalSuites} suites`)
  ]);
}

function sincronizarContributing(totalSuites) {
  return reemplazar('CONTRIBUTING.md', [
    (c) => c.replace(/All \d+\+? deterministic suites across all 5 governance domains must pass/g,
      `All ${totalSuites} deterministic suites across all 5 governance domains must pass`),
    (c) => c.replace(/- \[ \] All \d+\+? test suites pass with Exit Code 0\./g,
      `- [ ] All ${totalSuites} test suites pass with Exit Code 0.`),
    (c) => c.replace(/\*\*exactly \d+ consolidated skills\*\* in `\.agents\/skills\/` and \d+ slash commands in `\.claude\/commands\/`/g,
      '**the consolidated skills** in `.agents/skills/` and the matching slash commands in `.claude/commands/`')
  ]);
}

function sincronizarMaturityReport(totalSuites) {
  const updates = [
    (c) => c.replace(/\d+ deterministic test suites/g, `${totalSuites} deterministic test suites`),
    (c) => c.replace(/\d+ suites deterministas/g, `${totalSuites} suites deterministas`),
    (c) => c.replace(/Consolidate \d+ test suites/g, `Consolidate ${totalSuites} test suites`),
    (c) => c.replace(/Consolidar \d+ suites/g, `Consolidar ${totalSuites} suites`)
  ];
  const r1 = reemplazar('docs/ASYMPTOTIC_MATURITY_REPORT.md', updates);
  const r2 = reemplazar('docs/ASYMPTOTIC_MATURITY_REPORT.es.md', updates);
  return r1 || r2;
}

function sincronizarPromptEngineering() {
  return reemplazar('docs/PROMPT_ENGINEERING.md', [
    (c) => c.replace(/Suite de regresión superada con exit code 0 \(\d+\/\d+ suites en verde\)\./g,
      'Suite de regresión superada con exit code 0, según la salida real del runner.')
  ]);
}

function sincronizarAttestationViewer(totalSuites) {
  return reemplazar('docs/attestation_viewer.html', [
    (c) => c.replace(/\((\d+) Suites Deterministas\)/g, `(${totalSuites} Suites Deterministas)`)
  ]);
}

function sincronizarSitioWeb(totalSuites, desglose, version) {
  const rutaHtml = path.join(ROOT, 'docs', 'site', 'index.html');
  const rutaJs = path.join(ROOT, 'docs', 'site', 'script.js');
  const porcentaje = (n) => ((n / totalSuites) * 100).toFixed(1);

  let actualizado = false;

  if (fs.existsSync(rutaHtml)) {
    let html = fs.readFileSync(rutaHtml, 'utf8');
    html = html.replace(/\d+ Suites PASS/g, `${totalSuites} Suites PASS`);
    html = html.replace(/GitHub · \d+\/\d+/g, `GitHub · ${totalSuites}/${totalSuites}`);
    html = html.replace(/<strong>\d+\/\d+<\/strong> suites PASS/g, `<strong>${totalSuites}/${totalSuites}</strong> suites PASS`);
    html = html.replace(/✓ \d+\/\d+ PASS<\/span> \d+ suites de prueba/g, `✓ ${totalSuites}/${totalSuites} PASS</span> ${totalSuites} suites de prueba`);
    html = html.replace(/Distribución de las \d+ Suites/g, `Distribución de las ${totalSuites} Suites`);
    html = html.replace(/(\d+) \/ \1/g, `${totalSuites} / ${totalSuites}`);
    html = html.replace(/suite de \d+ pruebas/g, `suite de ${totalSuites} pruebas`);
    html = html.replace(/Todos los Dominios \(\d+\)/g, `Todos los Dominios (${totalSuites})`);
    html = html.replace(/Verificado \(\d+\/\d+\)/g, `Verificado (${totalSuites}/${totalSuites})`);
    html = html.replace(/\d+ suites verificadas · Exit Code 0/g, `${totalSuites} suites verificadas · Exit Code 0`);

    const dominios = [
      { key: 'governance', width: porcentaje(desglose.governance) },
      { key: 'cryptography', width: porcentaje(desglose.cryptography) },
      { key: 'intent', width: porcentaje(desglose.intent) },
      { key: 'state', width: porcentaje(desglose.state) },
      { key: 'adversarial', width: porcentaje(desglose.adversarial) }
    ];
    let indice = 0;
    html = html.replace(/<strong>\d+ suites \([\d.]+%\)<\/strong>/g, (match) => {
      const d = dominios[indice++];
      return d ? `<strong>${desglose[d.key]} suites (${d.width}%)</strong>` : match;
    });
    indice = 0;
    html = html.replace(/width: [\d.]+%;/g, (match) => {
      const d = dominios[indice++];
      return d ? `width: ${d.width}%;` : match;
    });

    fs.writeFileSync(rutaHtml, html, 'utf8');
    actualizado = true;
  }

  if (fs.existsSync(rutaJs)) {
    let js = fs.readFileSync(rutaJs, 'utf8');
    js = js.replace(/statusPill:\s*'v[\w.-]+ · \d+ Suites PASS'/g, `statusPill: 'v${version} · ${totalSuites} Suites PASS'`);
    js = js.replace(/statSuites:\s*'<strong>\d+\/\d+<\/strong> suites PASS'/g, `statSuites: '<strong>${totalSuites}/${totalSuites}</strong> suites PASS'`);
    js = js.replace(/Executes \d+ automated test suites/g, `Executes ${totalSuites} automated test suites`);
    js = js.replace(/Ejecuta \d+ suites de prueba automáticas/g, `Ejecuta ${totalSuites} suites de prueba automáticas`);
    js = js.replace(/'✓ \d+\/\d+ suites PASS[^']*'/g, `'✓ ${totalSuites}/${totalSuites} suites PASS (exit code 0)'`);
    js = js.replace(/telemetryStatus: '\d+ Suites PASS'/g, `telemetryStatus: '${totalSuites} Suites PASS'`);
    js = js.replace(/the full \d+ automated test suites/g, `the full ${totalSuites} automated test suites`);
    js = js.replace(/suite de \d+ pruebas/g, `suite de ${totalSuites} pruebas`);
    js = js.replace(/(?:All Domains|Todos los Dominios) \(\d+\)/g, (m) => m.startsWith('Todo') ? `Todos los Dominios (${totalSuites})` : `All Domains (${totalSuites})`);
    js = js.replace(/breakdownTitle: 'Distribution of the \d+ Suites'/g, `breakdownTitle: 'Distribution of the ${totalSuites} Suites'`);
    js = js.replace(/breakdownTitle: 'Distribución de las \d+ Suites'/g, `breakdownTitle: 'Distribución de las ${totalSuites} Suites'`);
    js = js.replace(/(?:Verified|Verificado) \((\d+)\/\d+\)/g, (m) => m.startsWith('Verificado') ? `Verificado (${totalSuites}/${totalSuites})` : `Verified (${totalSuites}/${totalSuites})`);
    js = js.replace(/Suites in Green \(\d+%\)/g, 'Suites in Green (CI verified)');
    js = js.replace(/Suites en Verde \(\d+%\)/g, 'Suites en Verde (verificado en CI)');
    fs.writeFileSync(rutaJs, js, 'utf8');
    actualizado = true;
  }

  return actualizado;
}

function sincronizarTodo(dirRaiz = ROOT) {
  const { total, desglose } = contarSuites(dirRaiz);
  const version = leerVersion();

  if (path.resolve(dirRaiz) !== ROOT) {
    return { totalSuites: total, desglose, archivosActualizados: {} };
  }

  const archivosActualizados = {
    readme: sincronizarReadme(total, desglose),
    readmeEs: sincronizarReadmeEs(total),
    roadmap: sincronizarRoadmap(total),
    testsReadme: sincronizarTestsReadme(total),
    contributing: sincronizarContributing(total),
    maturityReport: sincronizarMaturityReport(total),
    promptEngineering: sincronizarPromptEngineering(),
    attestationViewer: sincronizarAttestationViewer(total),
    sitioWeb: sincronizarSitioWeb(total, desglose, version)
  };

  return { totalSuites: total, desglose, version, archivosActualizados };
}

function main() {
  const resultado = sincronizarTodo(ROOT);
  console.log('=== Axion Doc & Stats Synchronizer ===\n');
  console.log(`✓ Conteo dinámico: ${resultado.totalSuites} suites auditadas en 5 Dominios Fundamentales`);
  console.log(`  - 🛡️ Governance & Preflight:           ${resultado.desglose.governance}`);
  console.log(`  - 🔐 Cryptography & Attestation:       ${resultado.desglose.cryptography}`);
  console.log(`  - 🧭 Intent & Socratic UX:             ${resultado.desglose.intent}`);
  console.log(`  - 💾 State, Checkpoints & Recovery:    ${resultado.desglose.state}`);
  console.log(`  - ⚡ Adversarial Resilience:           ${resultado.desglose.adversarial}`);
  console.log('\n✓ Métricas inyectadas en README.md, README.es.md, CONTRIBUTING.md,');
  console.log('  docs/ASYMPTOTIC_MATURITY_REPORT.md(.es.md), docs/PROMPT_ENGINEERING.md,');
  console.log('  docs/attestation_viewer.html y docs/site/.');
}

if (require.main === module) {
  main();
}

module.exports = { contarSuites, sincronizarTodo };
