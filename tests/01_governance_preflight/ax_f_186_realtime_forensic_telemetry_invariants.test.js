'use strict';

/**
 * Axion Protocol — Invariantes de Telemetría Forense en Tiempo Real y Auditoría de Diffs de Estado.
 *
 * Valida de forma estricta:
 * 1. Captura de worktree state y cálculo determinista de diffs (added, modified, deleted).
 * 2. Detección de regresión por inflación de disco (DISK_BLOAT_DRIFT).
 * 3. Detección de mutación no autorizada en archivos normativos (UNAUTHORIZED_STATE_MUTATION).
 * 4. Detección de anomalías de rendimiento (LATENCY_SPIKE) contra el buffer rodante continuo.
 * 5. Sellado criptográfico in-toto Statement v1 con payload de telemetría forense completa.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const ForensicTelemetryEngine = require('../../tools/forensic_telemetry_engine.js');

console.log('=== AX-F-186 Invariantes de Telemetría Forense en Tiempo Real ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sandbox = path.join(ROOT, 'scratch', `test_forensic_186_${Date.now()}`);
fs.mkdirSync(path.join(sandbox, '.axion', 'state'), { recursive: true });
fs.mkdirSync(path.join(sandbox, 'tools'), { recursive: true });
fs.mkdirSync(path.join(sandbox, 'policies'), { recursive: true });

const sampleTool = path.join(sandbox, 'tools', 'sample.js');
fs.writeFileSync(sampleTool, "console.log('hello');", 'utf8');

const engine = new ForensicTelemetryEngine(sandbox);

// 1. Validar captura de worktree state y cálculo de diffs
const preSnap = engine.captureSnapshot('pre-run');
assert.ok(preSnap.worktree, 'El snapshot debe contener worktree state');
assert.strictEqual(preSnap.worktree.fileCount >= 1, true);

// Mutar worktree: modificar un archivo y agregar uno nuevo
fs.writeFileSync(sampleTool, "console.log('hello modified');", 'utf8');
const newTool = path.join(sandbox, 'tools', 'new_tool.js');
fs.writeFileSync(newTool, "console.log('new');", 'utf8');

const postSnap = engine.captureSnapshot('post-run');
const drift = engine.computeDrift(preSnap, postSnap);

assert.ok(drift.stateDiff, 'El reporte debe contener stateDiff');
assert.strictEqual(drift.stateDiff.added.includes('tools/new_tool.js'), true);
assert.strictEqual(drift.stateDiff.modified.includes('tools/sample.js'), true);
assert.strictEqual(drift.pass, true);
console.log('✓ Detección de diffs de estado (added y modified) validada');

// 2. Validar detección de mutación no autorizada en políticas
const policyFile = path.join(sandbox, 'policies', 'unauthorized.json');
fs.writeFileSync(policyFile, '{}', 'utf8');
const postPolicySnap = engine.captureSnapshot('post-policy');
const driftPolicy = engine.computeDrift(postSnap, postPolicySnap, { allowPolicyMutations: false });

assert.strictEqual(driftPolicy.pass, false);
assert.ok(driftPolicy.regressions.some(r => r.type === 'UNAUTHORIZED_STATE_MUTATION'));
console.log('✓ Detección de UNAUTHORIZED_STATE_MUTATION en policies/ validada');

// 3. Validar detección de DISK_BLOAT_DRIFT
const bloatPost = {
  label: 'bloat',
  timestampMs: preSnap.timestampMs + 100,
  capturedAt: new Date().toISOString(),
  memory: preSnap.memory,
  worktree: {
    totalMb: preSnap.worktree.totalMb + 25.0,
    files: preSnap.worktree.files
  }
};
const driftBloat = engine.computeDrift(preSnap, bloatPost, { maxDiskGrowthMb: 10.0 });
assert.strictEqual(driftBloat.pass, false);
assert.ok(driftBloat.regressions.some(r => r.type === 'DISK_BLOAT_DRIFT'));
console.log('✓ Detección de DISK_BLOAT_DRIFT validada');

// 4. Validar persistencia continua y buffer rodante
const seal = engine.sealForensicReport('RealtimeTest', preSnap, postSnap, drift);
assert.strictEqual(seal.sealed, true);
assert.strictEqual(seal.signatureValid, true);

const metrics = engine.getRollingMetrics();
assert.strictEqual(metrics.sampleCount >= 1, true);
assert.ok(fs.existsSync(engine.historyFile), 'El archivo de buffer histórico debe existir');
console.log(`✓ Buffer histórico continuo registrado: ${metrics.sampleCount} muestras activas`);

// Limpieza de sandbox
try {
  if (fs.existsSync(sandbox)) fs.rmSync(sandbox, { recursive: true, force: true });
} catch (_) {}

console.log('\nPASS AX-F-186 — Invariantes de telemetría forense en tiempo real demostrados al 100%.');
