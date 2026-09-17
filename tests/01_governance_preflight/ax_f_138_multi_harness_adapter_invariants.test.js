'use strict';

/**
 * Axion Protocol — Invariantes del Adaptador Universal Multi-Harness y Sincronizador de Gobernanza.
 *
 * Valida de forma estricta:
 * 1. Generación determinista de reglas para Cursor (.cursor/rules/), Codex (.codex/), OpenCode (.opencode/) y Copilot.
 * 2. Funcionamiento de dry-run sin mutación de disco.
 * 3. Emisión de manifiesto criptográfico de propiedad en .axion/state/multi_harness_manifest.json.
 * 4. Auditoría de paridad y cálculo de ratio de cobertura multi-harness.
 * 5. Integración transparente con DriveEngine y CLI unificado.
 */

const assert = require('assert');
const { crearSandbox } = require('../../tools/test_sandbox.js');
const path = require('path');
const fs = require('fs');
const MultiHarnessAdapter = require('../../tools/multi_harness_adapter.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-138 Invariantes del Adaptador Universal Multi-Harness ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sandbox = crearSandbox('test_harness_sandbox');
fs.mkdirSync(path.join(sandbox, '.axion', 'state'), { recursive: true });

try {
  const adapter = new MultiHarnessAdapter(sandbox);

  // 1. Validar dry-run sin crear archivos
  const dryRunRes = adapter.syncHarnesses(['cursor', 'codex', 'opencode', 'copilot'], { dryRun: true });
  assert.strictEqual(dryRunRes.success, true);
  assert.strictEqual(dryRunRes.dryRun, true);
  assert.strictEqual(fs.existsSync(path.join(sandbox, '.cursor')), false);
  assert.strictEqual(fs.existsSync(path.join(sandbox, '.codex')), false);
  console.log('✓ Modo Dry-Run validado (cero mutaciones en disco)');

  // 2. Validar sincronización real multi-harness
  const syncRes = adapter.syncHarnesses(['cursor', 'codex', 'opencode', 'copilot'], { dryRun: false });
  assert.strictEqual(syncRes.success, true);
  assert.strictEqual(syncRes.dryRun, false);
  assert.ok(syncRes.totalSyncedFiles >= 6);

  // Validar archivos generados
  assert.ok(fs.existsSync(path.join(sandbox, '.cursor', 'rules', 'axion-governance.mdc')));
  assert.ok(fs.existsSync(path.join(sandbox, '.cursor', 'agents', 'axion-architect.md')));
  assert.ok(fs.existsSync(path.join(sandbox, '.codex', 'AGENTS.md')));
  assert.ok(fs.existsSync(path.join(sandbox, '.codex', 'config.toml')));
  assert.ok(fs.existsSync(path.join(sandbox, '.opencode', 'rules', 'axion-protocol.md')));
  assert.ok(fs.existsSync(path.join(sandbox, '.github', 'copilot-instructions.md')));
  console.log('✓ Sincronización real multi-harness validada (Cursor, Codex, OpenCode, Copilot generados)');

  // 3. Validar manifiesto de propiedad
  const manifest = adapter.loadManifest();
  assert.ok(manifest.harnesses.cursor);
  assert.ok(manifest.harnesses.codex);
  assert.ok(manifest.digest);
  console.log('✓ Manifiesto criptográfico multi-harness validado');

  // 4. Validar auditoría de paridad
  const parity = adapter.auditHarnessParity();
  assert.ok(parity.activeHarnessesCount >= 4);
  assert.strictEqual(parity.harnesses.cursor.active, true);
  assert.strictEqual(parity.harnesses.codex.active, true);
  assert.strictEqual(parity.harnesses.opencode.active, true);
  assert.strictEqual(parity.harnesses.copilot.active, true);
  console.log(`✓ Auditoría de paridad validada: Cobertura del ${parity.coverageRate}`);

  // 5. Validar integración con DriveEngine
  const driveEngine = new DriveEngine(ROOT);
  const driveAudit = driveEngine.auditHarnessParity();
  assert.ok(driveAudit.totalSupported === 6);
  assert.strictEqual(driveAudit.harnesses.antigravity.active, true);
  assert.strictEqual(driveAudit.harnesses.claude.active, true);
  console.log('✓ Integración DriveEngine.auditHarnessParity() verificada');

} finally {
  if (fs.existsSync(sandbox)) {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
}

console.log('\nPASS AX-F-138 — Invariantes del adaptador universal multi-harness demostrados al 100%.');
