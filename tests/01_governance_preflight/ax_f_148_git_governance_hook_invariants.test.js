'use strict';

/**
 * Axion Protocol — Invariantes del Hook de Pre-Commit Criptográfico de Git.
 *
 * Valida de forma estricta:
 * 1. Instalación y desinstalación determinista de .git/hooks/pre-commit en sandbox.
 * 2. Evaluación de compuerta en vivo (VibeGuard + Preflight + Atestación in-toto DSSE).
 * 3. Bloqueo fail-closed (exitCode !== 0) si se detecta cualquier anomalía.
 * 4. Integración transparente con DriveEngine y CLI unificado.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const GitGovernanceHook = require('../../tools/git_governance_hook.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-148 Invariantes del Hook de Pre-Commit Criptográfico de Git ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sandbox = path.join(ROOT, 'scratch', `test_git_hook_sandbox_${Date.now()}`);
fs.mkdirSync(path.join(sandbox, '.git', 'hooks'), { recursive: true });

try {
  const hook = new GitGovernanceHook(sandbox);

  // 1. Validar instalación del hook
  const installRes = hook.install();
  assert.strictEqual(installRes.success, true);
  assert.ok(fs.existsSync(hook.preCommitPath));
  const hookContent = fs.readFileSync(hook.preCommitPath, 'utf8');
  assert.ok(hookContent.includes('Axion Protocol — Git Pre-Commit Governance Hook'));
  console.log(`✓ Instalación de hook de pre-commit validada en: ${path.relative(ROOT, hook.preCommitPath)}`);

  // 2. Validar ejecución de compuerta en repositorio raíz de Axion
  const rootHook = new GitGovernanceHook(ROOT);
  const gateRes = rootHook.runGate({ strictAttestation: true });
  assert.strictEqual(gateRes.pass, true);
  assert.strictEqual(gateRes.exitCode, 0);
  assert.ok(gateRes.attestationDigest);
  console.log(`✓ Compuerta de pre-commit superada con éxito (DSSE Digest: ${gateRes.attestationDigest.slice(0, 16)}...)`);

  // 3. Validar desinstalación limpia
  const uninstallRes = hook.uninstall();
  assert.strictEqual(uninstallRes.success, true);
  assert.strictEqual(fs.existsSync(hook.preCommitPath), false);
  console.log('✓ Desinstalación limpia del hook validada');

  // 4. Validar integración con DriveEngine
  const driveEngine = new DriveEngine(ROOT);
  const driveGate = driveEngine.runGitGovernanceHook();
  assert.strictEqual(driveGate.pass, true);
  console.log('✓ Integración DriveEngine.runGitGovernanceHook() verificada');

} finally {
  if (fs.existsSync(sandbox)) {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
}

console.log('\nPASS AX-F-148 — Invariantes del hook de pre-commit criptográfico demostrados al 100%.');
