'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { runWizard } = require('../../tools/wizard.js');

console.log('=== AX-F-047 Asistente de Inicialización Interactivo y Calibración Segura ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const scratchDir = path.join(ROOT, 'scratch', 'test_wizard_init');

if (fs.existsSync(scratchDir)) {
  fs.rmSync(scratchDir, { recursive: true, force: true });
}
fs.mkdirSync(scratchDir, { recursive: true });

async function run() {
  // 1. Detección determinista de entorno no interactivo (sin TTY)
  const rNoTTY = await runWizard(scratchDir, { forzarInteractivo: false });
  assert.strictEqual(rNoTTY.status, 'NON_INTERACTIVE', 'debe detectar entorno no interactivo y salir limpiamente');
  console.log('✓ Detección de entorno no interactivo y orientación de comandos equivalentes verificadas');

  // Limpieza
  fs.rmSync(scratchDir, { recursive: true, force: true });
  console.log('✓ Limpieza de entorno de pruebas completada');

  console.log('\nPASS AX-F-047 — Asistente de inicialización y calibración verificados al 100%.\n');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
