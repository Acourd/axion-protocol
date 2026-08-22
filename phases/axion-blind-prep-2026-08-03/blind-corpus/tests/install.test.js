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
  path.join(scratchDir, 'tools', 'preflight.js'),
  path.join(scratchDir, 'tools', 'evidence_hasher.js'),
  path.join(scratchDir, 'tools', 'workflow_runner.js'),
  path.join(scratchDir, 'adapters', 'prompt_bridge.json')
];

expectedFiles.forEach(file => {
  assert.strictEqual(fs.existsSync(file), true, `El archivo inyectado debe existir: ${path.basename(file)}`);
  console.log(`✓ Verificado archivo inyectado: ${path.relative(scratchDir, file)}`);
});

// Limpieza posterior
fs.rmSync(scratchDir, { recursive: true, force: true });

console.log('\n=== TODAS LAS PRUEBAS DE INSTALACIÓN DUAL PASARON EXITOSAMENTE (PASS) ===');
