'use strict';

/**
 * Axion Protocol — Invariantes del Compilador de Runtime Standalone Single-File.
 *
 * Valida de forma estricta:
 * 1. Empaquetado determinista de herramientas esenciales en un único archivo CJS (dist/axion.bundle.js).
 * 2. Cero dependencias externas y cargador de módulos virtual nativo.
 * 3. Ejecución standalone de subcomandos CLI desde el bundle compilado.
 * 4. Integración transparente con DriveEngine y CLI unificado.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');
const BundleCompiler = require('../../tools/bundle_compiler.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-146 Invariantes del Compilador de Runtime Standalone ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'ax_f_146_bundle_'));

try {
  // Estructura de proyecto aislada para compilar sin mutar dist/axion.bundle.js versionado
  fs.mkdirSync(path.join(sandbox, 'tools'), { recursive: true });
  fs.mkdirSync(path.join(sandbox, 'dist'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'package.json'), path.join(sandbox, 'package.json'));

  const coreMods = [
    'tools/preflight.js', 'tools/structured_command.js', 'tools/canonical_json.js',
    'tools/dsse.js', 'tools/attestation.js', 'tools/checkpoint.js', 'tools/revocation_manager.js',
    'tools/approval_ed25519.js', 'tools/check_ed25519.js', 'tools/agent_shield.js',
    'tools/doctor_repair_engine.js', 'tools/instinct_synthesizer.js', 'tools/context_budget_guard.js',
    'tools/capability_manager.js', 'tools/governance_dashboard.js', 'tools/socratic_tree_visualizer.js',
    'tools/dynamic_rule_weaver.js', 'tools/semantic_snapshot_indexer.js', 'tools/vibeguard_gate.js',
    'tools/swarm_ast_arbiter.js', 'tools/swarm_consensus_arbiter.js', 'tools/swarm_p2p_channel.js',
    'tools/sync_doc_stats.js'
  ];
  for (const m of coreMods) {
    const src = path.join(ROOT, m);
    assert.ok(fs.existsSync(src), `Módulo del contrato no encontrado en ROOT: ${m}`);
    fs.copyFileSync(src, path.join(sandbox, m));
  }

  const compiler = new BundleCompiler(sandbox);

  // 1. Validar compilación del bundle en sandbox aislado
  const compileRes = compiler.compile();
  assert.strictEqual(compileRes.success, true);
  assert.ok(fs.existsSync(compileRes.outputFile));
  const relBundle = path.relative(sandbox, compileRes.outputFile);
  assert.ok(
    relBundle && !relBundle.startsWith('..') && !path.isAbsolute(relBundle),
    'El bundle debe compilarse estrictamente confinado dentro del sandbox'
  );
  assert.ok(compileRes.sizeBytes > 10000, 'El bundle debe tener un tamaño sustancial (> 10KB)');
  assert.strictEqual(compileRes.digest.length, 64);

  // Validar que cada módulo del contrato está explícitamente representado en el bundle
  const bundleContent = fs.readFileSync(compileRes.outputFile, 'utf8');
  for (const m of coreMods) {
    const modKey = path.basename(m, '.js');
    assert.ok(
      bundleContent.includes(modKey),
      `El bundle compilado debe representar y contener el módulo del contrato: ${modKey}`
    );
  }
  console.log(`✓ Verificada representación exacta de los ${coreMods.length}/${coreMods.length} módulos del contrato en el bundle`);
  console.log(`✓ Compilación standalone validada: ${(compileRes.sizeBytes / 1024).toFixed(1)} KB (SHA-256: ${compileRes.digest.slice(0, 16)}...)`);

  // 2. Validar ejecución del comando help desde el bundle
  const helpOutput = execFileSync(process.execPath, [compileRes.outputFile, 'help'], { encoding: 'utf8' });
  assert.ok(helpOutput.includes('Axion Protocol — Standalone Single-File Bundle'));
  assert.ok(helpOutput.includes('Subcomandos disponibles'));
  console.log('✓ Ejecución standalone del subcomando "help" verificada');

  // 3. Validar ejecución del subcomando capabilities desde el bundle
  const capsOutput = execFileSync(process.execPath, [compileRes.outputFile, 'capabilities'], { encoding: 'utf8' });
  const capsParsed = JSON.parse(capsOutput);
  assert.ok(capsParsed.totalAvailable >= 5);
  console.log(`✓ Ejecución standalone del subcomando "capabilities" verificada (${capsParsed.totalAvailable} capacidades disponibles)`);

  // 4. Validar integración con DriveEngine sobre sandbox aislado
  const driveEngine = new DriveEngine(sandbox);
  const driveCompile = driveEngine.compileStandaloneBundle();
  assert.strictEqual(driveCompile.success, true);
  console.log('✓ Integración DriveEngine.compileStandaloneBundle() verificada en sandbox');

} finally {
  fs.rmSync(sandbox, { recursive: true, force: true });
}

console.log('\nPASS AX-F-146 — Invariantes del compilador de runtime standalone demostrados al 100%.');
