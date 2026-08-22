const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { runInstallation } = require('../install.js');

console.log('=== Pruebas del Instalador Autónomo Dual (Antigravity & Claude Code) ===\n');

const scratchDir = path.join(__dirname, '..', 'scratch', 'test_install_target');

// Limpieza previa
if (fs.existsSync(scratchDir)) {
  fs.rmSync(scratchDir, { recursive: true, force: true });
}
fs.mkdirSync(scratchDir, { recursive: true });

console.log(`--- Ejecutando instalación autónoma dual en: ${scratchDir} ---`);
const result = runInstallation(scratchDir);

assert.strictEqual(result.status, 'SUCCESS', 'La instalación autónoma debe retornar estado SUCCESS');

// Comprobar que los archivos esenciales para Antigravity y Claude Code existen
const expectedFiles = [
  path.join(scratchDir, '.agents', 'AGENTS.md'),
  path.join(scratchDir, 'CLAUDE.md'),
  path.join(scratchDir, '.claude', 'CLAUDE.md'),
  path.join(scratchDir, 'tools', 'intent_clarifier.js'),
  path.join(scratchDir, 'tools', 'canonical_json.js'),
  path.join(scratchDir, 'tools', 'identity_canonical.js'),
  path.join(scratchDir, 'tools', 'killswitch.js'),
  path.join(scratchDir, 'tools', 'dsse.js'),
  path.join(scratchDir, 'tools', 'attestation.js'),
  path.join(scratchDir, 'tools', 'assurance.js'),
  path.join(scratchDir, 'tools', 'risk_policy_compiler.js'),
  path.join(scratchDir, 'tools', 'approval_ed25519.js'),
  path.join(scratchDir, 'tools', 'check_ed25519.js'),
  path.join(scratchDir, 'tools', 'workflow_state_machine.js'),
  path.join(scratchDir, 'tools', 'structured_command.js'),
  path.join(scratchDir, 'tools', 'preflight.js'),
  path.join(scratchDir, 'tools', 'rollback_plan.js'),
  path.join(scratchDir, 'tools', 'evidence_hasher.js'),
  path.join(scratchDir, 'tools', 'workflow_runner.js'),
  path.join(scratchDir, 'policies', 'risk.yaml'),
  path.join(scratchDir, 'schemas', 'approval.schema.json'),
  path.join(scratchDir, 'schemas', 'authority_registry.schema.json'),
  path.join(scratchDir, 'schemas', 'check_attestation.schema.json'),
  path.join(scratchDir, 'schemas', 'rollback-plan.schema.json'),
  path.join(scratchDir, 'adapters', 'prompt_bridge.json')
];

expectedFiles.forEach(file => {
  assert.strictEqual(fs.existsSync(file), true, `El archivo inyectado debe existir: ${path.basename(file)}`);
  console.log(`✓ Verificado archivo inyectado: ${path.relative(scratchDir, file)}`);
});

assert.doesNotThrow(() => require(path.join(scratchDir, 'tools', 'workflow_runner.js')),
  'el runtime instalado debe cargar con todas sus dependencias locales');

// Limpieza posterior
fs.rmSync(scratchDir, { recursive: true, force: true });

console.log('\n=== TODAS LAS PRUEBAS DE INSTALACIÓN DUAL PASARON EXITOSAMENTE (PASS) ===');
