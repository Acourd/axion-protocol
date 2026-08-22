#!/usr/bin/env node
'use strict';
/**
 * AXION H-6a/H-6b — corredor de verificación.
 *
 * Principios rectores:
 *   P1. Ninguna anotación del inventario puede convertir un FAIL en exit 0.
 *   P2. Un `exit != 0` bajo mutación NO prueba nada si la mutación no se aplicó.
 *       Todo mutador debe confirmar su carga con un centinela observable.
 *   P3. Una rama crítica no ejercitada es ORACLE_GAP, nunca ORACLE_SOUND.
 *   P4. La inyección de fallos existe sólo para autoprobar los gates y SIEMPRE
 *       bloquea: no puede usarse para hacer pasar una corrida real.
 *
 * Uso:
 *   node runner.js --corpus <ruta> --inventory <ruta> [--out <ruta.json>] [--emit-inventory]
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const HARNESS = __dirname;
const MUTATION_SENTINEL = 'AXION_MUTATION_APPLIED:';

// --------------------------------------------------------------------------- args
function parseArgs(argv) {
  const a = { emitInventory: false };
  for (let i = 2; i < argv.length; i += 1) {
    const k = argv[i];
    if (k === '--corpus') a.corpus = path.resolve(argv[++i]);
    else if (k === '--inventory') a.inventory = path.resolve(argv[++i]);
    else if (k === '--out') a.out = path.resolve(argv[++i]);
    else if (k === '--emit-inventory') a.emitInventory = true;
    else throw new Error(`Argumento desconocido: ${k}`);
  }
  if (!a.corpus) throw new Error('--corpus es obligatorio');
  if (!a.inventory) throw new Error('--inventory es obligatorio');
  return a;
}

const sha256 = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile() && e.name.endsWith('.test.js')) out.push(p);
  }
  return out;
}

// ------------------------------------------------------------------- descubrimiento
function discover(corpus) {
  const corpusSuites = walk(path.join(corpus, 'tests')).map((p) => ({
    id: path.relative(corpus, p).split(path.sep).join('/'),
    source: 'corpus', file: p, sha256: sha256(p),
  }));
  const redSuites = walk(path.join(HARNESS, 'red')).map((p) => ({
    id: `h6a/red/${path.basename(p)}`,
    source: 'h6a-red-probe', file: p, sha256: sha256(p),
  }));
  return [...corpusSuites, ...redSuites].sort((x, y) => x.id.localeCompare(y.id));
}

// ------------------------------------------------------- guardarraíles estáticos
const GUARDRAILS = [
  {
    code: 'EXIT_ZERO_ON_FAILURE_PATH',
    requirement: 7,
    detect(src) {
      const re = /if\s*\(\s*([A-Za-z_$][\w$]*)\s*>\s*0\s*\)\s*\{(?:[^{}]|\{[^{}]*\})*?process\.exit\(\s*0\s*\)/gs;
      const hits = []; let m;
      while ((m = re.exec(src)) !== null) hits.push(`if (${m[1]} > 0) { ... process.exit(0) }`);
      return hits;
    },
  },
  {
    code: 'GLOBAL_CATCH_SWALLOW',
    requirement: 8,
    detect(src) {
      const re = /catch\s*\([^)]*\)\s*\{((?:[^{}]|\{[^{}]*\})*)\}/gs;
      const hits = []; let m;
      while ((m = re.exec(src)) !== null) {
        const body = m[1];
        const propagates = /throw\b/.test(body)
          || /process\.exit\(\s*(?!0\s*\))/.test(body)
          || /process\.exitCode\s*=\s*(?!0)/.test(body);
        if (!propagates && body.trim() !== '') hits.push(body.trim().slice(0, 80).replace(/\s+/g, ' '));
      }
      return hits;
    },
  },
  {
    code: 'SIMULATED_SUITE',
    requirement: 9,
    detect(src) {
      const asserts = /\bassert\b|\bthrow\b|process\.exit\(\s*[1-9]/.test(src);
      const claimsPass = /console\.log\((['"`]).*PASS/i.test(src);
      return !asserts && claimsPass ? ['declara PASS sin ninguna aserción ni propagación'] : [];
    },
  },
];

function scanGuardrails(suites) {
  const findings = [];
  for (const s of suites) {
    if (s.source !== 'corpus') continue;
    const src = fs.readFileSync(s.file, 'utf8');
    for (const g of GUARDRAILS) {
      for (const ev of g.detect(src)) {
        findings.push({ suite: s.id, code: g.code, requirement: g.requirement, evidence: ev });
      }
    }
  }
  return findings;
}

// -------------------------------------------------------------------- ejecución
// El mutador se pasa como argumento directo de node, NUNCA por NODE_OPTIONS:
// en Windows el parser de NODE_OPTIONS destroza las rutas con separadores
// invertidos y espacios, y el fallo de carga se confunde con un fallo de la suite.
function runSuite(suite, corpus, mutatorPath = null) {
  const argv = mutatorPath ? ['--require', mutatorPath, suite.file] : [suite.file];
  const started = Date.now();
  const res = spawnSync(process.execPath, argv, {
    cwd: corpus,
    env: { ...process.env, AXION_CORPUS: corpus, NODE_OPTIONS: '' },
    encoding: 'utf8', timeout: 120000, windowsHide: true,
  });
  const out = `${res.stdout || ''}${res.stderr || ''}`;
  return {
    exitCode: res.status === null ? 124 : res.status,
    timedOut: res.status === null,
    durationMs: Date.now() - started,
    mutationApplied: out.includes(MUTATION_SENTINEL),
    tail: out.trim().split(/\r?\n/).slice(-6).join('\n'),
  };
}

// ------------------------------------------------------------------ meta-oráculo
function evaluateOracle(suite, corpus, spec, baselinePassed) {
  const required = (spec && spec.required_branches) || [];
  const mutators = (spec && spec.mutators) || [];

  if (!baselinePassed) {
    return { suite: suite.id, verdict: 'ORACLE_INCONCLUSIVE_BASELINE_RED', runs: [], uncovered_branches: [] };
  }

  const covered = new Set(mutators.map((m) => m.targets_branch));
  const uncovered = required.filter((b) => !covered.has(b));

  const runs = [];
  for (const m of mutators) {
    const abs = path.join(HARNESS, m.path);
    if (!fs.existsSync(abs)) {
      runs.push({ mutator: m.path, branch: m.targets_branch, outcome: 'MUTATOR_MISSING', exitCode: null, mutationApplied: false });
      continue;
    }
    const r = runSuite(suite, corpus, abs);
    let outcome;
    if (!r.mutationApplied) outcome = 'MUTATION_NOT_APPLIED';   // P2
    else if (r.exitCode !== 0) outcome = 'DETECTED';
    else outcome = 'NOT_DETECTED';
    runs.push({
      mutator: m.path, branch: m.targets_branch, outcome,
      exitCode: r.exitCode, mutationApplied: r.mutationApplied, tail: r.tail,
    });
  }

  let verdict;
  if (runs.some((r) => r.outcome === 'NOT_DETECTED')) verdict = 'ORACLE_DEFECT';
  else if (runs.some((r) => r.outcome === 'MUTATION_NOT_APPLIED' || r.outcome === 'MUTATOR_MISSING')) verdict = 'ORACLE_GAP';
  else if (uncovered.length > 0) verdict = 'ORACLE_GAP';                            // P3
  else if (runs.length === 0) verdict = 'ORACLE_GAP';
  else verdict = 'ORACLE_SOUND';

  return { suite: suite.id, verdict, runs, uncovered_branches: uncovered };
}

// ----------------------------------------------------------------------- main
function main() {
  const args = parseArgs(process.argv);
  const fault = process.env.AXION_H6B_FAULT || null;   // P4
  const discovered = discover(args.corpus);

  if (args.emitInventory) {
    const inv = {
      identifier: 'AX-H6A-TEST-INVENTORY', version: '1.0.0',
      suites: discovered.map((s) => ({
        id: s.id, source: s.source, sha256: s.sha256,
        category: null, critical: false, expectation: 'PASS', oracle: null, maps_to_g_defect: null,
      })),
    };
    fs.writeFileSync(args.inventory, `${JSON.stringify(inv, null, 2)}\n`, 'utf8');
    console.log(`Inventario emitido con ${inv.suites.length} suites en ${args.inventory}`);
    return 0;
  }

  // Inmutabilidad del inventario: se sella al inicio y se recompara al final.
  const inventoryDigestStart = sha256(args.inventory);
  const inventory = JSON.parse(fs.readFileSync(args.inventory, 'utf8'));
  const invById = new Map(inventory.suites.map((s) => [s.id, s]));
  const discById = new Map(discovered.map((s) => [s.id, s]));

  // ---- Gate 0: integridad del propio arnés
  const harnessFindings = [];
  for (const [rel, expected] of Object.entries(inventory.harness_integrity || {})) {
    const abs = path.join(HARNESS, rel);
    if (!fs.existsSync(abs)) harnessFindings.push({ file: rel, issue: 'ausente' });
    else if (sha256(abs) !== expected) harnessFindings.push({ file: rel, issue: 'hash distinto' });
  }

  // ---- Gate 1: descubrimiento (presencia) e integridad (hash), separados
  const missingFromDisc = [...invById.keys()].filter((k) => !discById.has(k));
  const missingFromInv = [...discById.keys()].filter((k) => !invById.has(k));
  const drifted = discovered.filter((s) => invById.has(s.id) && invById.get(s.id).sha256 !== s.sha256);
  const discoveryMismatch = missingFromDisc.length + missingFromInv.length > 0;
  const integrityMismatch = drifted.length > 0;

  // ---- Guardarraíles estáticos
  const guardrails = scanGuardrails(discovered);

  // ---- Ejecución
  const skipId = fault && fault.startsWith('skip:') ? fault.slice(5) : null;
  const results = [];
  for (const s of discovered) {
    if (skipId && s.id === skipId) continue;            // fallo inyectado: no ejecutar
    const meta = invById.get(s.id) || {};
    const r = runSuite(s, args.corpus);
    results.push({
      id: s.id, source: s.source, category: meta.category || null,
      expectation: meta.expectation || 'PASS', maps_to_g_defect: meta.maps_to_g_defect || null,
      exitCode: r.exitCode, passed: r.exitCode === 0, timedOut: r.timedOut,
      durationMs: r.durationMs, tail: r.tail,
    });
  }

  const executed = results.length;
  let passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  if (fault === 'arith') passed += 1;                    // fallo inyectado: aritmética rota

  const countGate = {
    inventory: inventory.suites.length,
    discovered: discovered.length,
    executed, passed, failed,
    discovered_eq_inventory: discovered.length === inventory.suites.length && !discoveryMismatch,
    executed_eq_discovered: executed === discovered.length,
    sum_eq_executed: passed + failed === executed,
  };

  // ---- Meta-oráculo
  const oracles = [];
  for (const s of discovered) {
    const meta = invById.get(s.id);
    if (!meta || !meta.critical || !meta.oracle) continue;
    const baseline = results.find((r) => r.id === s.id);
    oracles.push(evaluateOracle(s, args.corpus, meta.oracle, baseline && baseline.passed));
  }
  const oracleDefects = oracles.filter((o) => o.verdict === 'ORACLE_DEFECT');
  const oracleGaps = oracles.filter((o) => o.verdict === 'ORACLE_GAP');
  const oracleInconclusive = oracles.filter((o) => o.verdict === 'ORACLE_INCONCLUSIVE_BASELINE_RED');

  // ---- Cobertura de defectos conocidos de G
  const gDefects = {};
  for (const s of inventory.suites) {
    if (!s.maps_to_g_defect) continue;
    const r = results.find((x) => x.id === s.id);
    gDefects[s.maps_to_g_defect] = {
      suite: s.id, detected: r ? !r.passed : false,
      exitCode: r ? r.exitCode : null, mechanism: 'red-probe',
    };
  }
  const exitZero = guardrails.filter((g) => g.code === 'EXIT_ZERO_ON_FAILURE_PATH');
  if (oracleDefects.length > 0 || exitZero.length > 0) {
    const mech = [oracleDefects.length ? 'oracle-meta-test' : null,
      exitZero.length ? 'static-guardrail' : null].filter(Boolean).join(' + ');
    gDefects.G6_EXIT_ZERO_DESPITE_FAILED_ASSERT = {
      suite: [...new Set([...oracleDefects.map((o) => o.suite), ...exitZero.map((f) => f.suite)])].join(', '),
      detected: true, exitCode: 0, mechanism: mech,
    };
  }
  const declaredByG = inventory.g_declared_regression_scope || [];
  const omitted = discovered.filter((s) => s.source === 'corpus' && !declaredByG.includes(s.id));
  if (omitted.length > 0) {
    gDefects.G7_INCOMPLETE_DISCOVERY = {
      suite: `${omitted.length} suites fuera del alcance declarado por G`,
      detected: true, exitCode: null, mechanism: 'discovery-gate',
    };
  }

  // ---- Inmutabilidad del inventario, recomprobada al final
  const inventoryDigestEnd = sha256(args.inventory);
  const inventoryMutated = inventoryDigestStart !== inventoryDigestEnd;

  // ---- Condiciones bloqueantes
  const blocking = [];
  if (harnessFindings.length > 0) blocking.push('HARNESS_INTEGRITY_MISMATCH');
  if (discoveryMismatch) blocking.push('TEST_DISCOVERY_MISMATCH');
  if (integrityMismatch) blocking.push('TEST_INTEGRITY_MISMATCH');
  if (!countGate.executed_eq_discovered) blocking.push('EXECUTION_COUNT_MISMATCH');
  if (!countGate.sum_eq_executed) blocking.push('ARITHMETIC_GATE_FAILURE');
  if (inventoryMutated) blocking.push('TEST_INVENTORY_MUTATED');
  if (oracleDefects.length > 0) blocking.push('ORACLE_DEFECT');
  if (oracleGaps.length > 0) blocking.push('ORACLE_GAP');
  if (guardrails.length > 0) blocking.push('GUARDRAIL_VIOLATION');
  if (failed > 0) blocking.push('SUITE_FAILURES');
  if (fault) blocking.push('FAULT_INJECTION_ACTIVE');    // P4: nunca puede dar exit 0

  const report = {
    contractVersion: '1.1.0', stage: 'H-6b',
    generated_at: new Date().toISOString(),
    corpus: { path: args.corpus },
    fault_injection: fault,
    harness_integrity: { checked: Object.keys(inventory.harness_integrity || {}).length, findings: harnessFindings },
    inventory_immutability: { digest_start: inventoryDigestStart, digest_end: inventoryDigestEnd, mutated: inventoryMutated },
    count_gate: countGate,
    discovery: {
      mismatch: discoveryMismatch, integrity_mismatch: integrityMismatch,
      inventoried_but_not_found: missingFromDisc, found_but_not_inventoried: missingFromInv,
      hash_drift: drifted.map((d) => d.id),
      g_declared_scope_size: declaredByG.length, omitted_by_g_scope: omitted.map((o) => o.id),
    },
    guardrail_findings: guardrails,
    oracle_meta_tests: oracles,
    oracle_defects: oracleDefects.map((o) => o.suite),
    oracle_gaps: oracleGaps.map((o) => o.suite),
    oracle_inconclusive: oracleInconclusive.map((o) => o.suite),
    g_defect_coverage: gDefects,
    suites: results,
    blocking_conditions: blocking,
    exit_code: blocking.length > 0 ? 1 : 0,
  };

  if (args.out) fs.writeFileSync(args.out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  const L = (k, v) => console.log(`  ${String(k).padEnd(34)} ${v}`);
  console.log('=== AXION H-6b — CORREDOR DE VERIFICACION ===\n');
  if (fault) console.log(`  !! INYECCION DE FALLO ACTIVA: ${fault} — la corrida bloquea por definicion\n`);
  console.log('-- Integridad del arnes');
  L('ficheros verificados', Object.keys(inventory.harness_integrity || {}).length);
  L('discrepancias', harnessFindings.length ? harnessFindings.map((f) => `${f.file} (${f.issue})`).join(', ') : '0');
  L('inventario inmutable', inventoryMutated ? 'NO — TEST_INVENTORY_MUTATED' : 'si');

  console.log('\n-- Gates');
  L('inventariadas / descubiertas', `${countGate.inventory} / ${countGate.discovered}`);
  L('no encontradas / no inventar.', `${missingFromDisc.length} / ${missingFromInv.length}`);
  L('deriva de hash', drifted.length ? drifted.map((d) => d.id).join(', ') : '0');
  L('ejecutadas', `${executed}  (executed == discovered: ${countGate.executed_eq_discovered})`);
  L('PASS / FAIL', `${passed} / ${failed}  (passed+failed == executed: ${countGate.sum_eq_executed})`);
  L('omitidas por el alcance de G', `${omitted.length} de ${discovered.filter((s) => s.source === 'corpus').length}`);

  console.log('\n-- Guardarrailes estaticos');
  if (!guardrails.length) console.log('  (sin hallazgos)');
  for (const g of guardrails) console.log(`  [R${g.requirement}] ${g.code.padEnd(26)} ${g.suite}\n         evidencia: ${g.evidence}`);

  console.log('\n-- Meta-oraculo');
  for (const o of oracles) {
    const tag = { ORACLE_SOUND: 'OK  ', ORACLE_DEFECT: 'DEF ', ORACLE_GAP: 'GAP ' }[o.verdict] || '--  ';
    console.log(`  ${tag} ${o.suite.padEnd(50)} ${o.verdict}`);
    for (const r of o.runs) {
      console.log(`         ${r.branch.padEnd(16)} ${path.basename(r.mutator).padEnd(36)} ${r.outcome} (exit ${r.exitCode}, aplicada: ${r.mutationApplied})`);
    }
    if (o.uncovered_branches.length) console.log(`         ramas sin cubrir: ${o.uncovered_branches.join(', ')}`);
  }

  console.log('\n-- Defectos de G detectados en rojo');
  for (const [k, v] of Object.entries(gDefects)) {
    console.log(`  ${v.detected ? 'ROJO' : 'NO  '} ${k.padEnd(38)} ${v.mechanism} :: ${v.suite}`);
  }

  console.log('\n-- Suites en FAIL');
  for (const r of results.filter((x) => !x.passed)) {
    console.log(`  exit ${String(r.exitCode).padEnd(4)} ${r.id}${r.expectation !== 'PASS' ? `   [${r.expectation}]` : ''}`);
  }

  console.log(`\nCondiciones bloqueantes: ${blocking.length ? blocking.join(', ') : 'ninguna'}`);
  console.log(`EXIT ${report.exit_code}`);
  return report.exit_code;
}

process.exitCode = main();
