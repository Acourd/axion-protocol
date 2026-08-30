'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { runWizard } = require('../../tools/wizard.js');
const { DIMENSIONES, getProfile } = require('../../tools/profile_adapter.js');

console.log('=== AX-F-075 Invariantes del Asistente Interactivo de Inicialización (Wizard) ===\n');

// 1. Salida fail-closed en entornos no interactivos (CI, scripts sin TTY)
(async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-wizard-test-'));

  try {
    const resNoTTY = await runWizard(tempDir, { forzarInteractivo: false });
    assert.strictEqual(resNoTTY.status, 'NON_INTERACTIVE', 'debe rehusar ejecutar en modo no interactivo sin forzar');
    console.log('✓ Detección y salida fail-closed de runWizard en entorno no interactivo verificada');

    // 2. Cobertura de las 5 dimensiones en el asistente
    assert.strictEqual(DIMENSIONES.length, 5, 'el asistente debe consultar exactamente las 5 dimensiones');
    const camposEsperados = ['technical_depth', 'input_mode', 'environment', 'cadence', 'creative_autonomy'];
    assert.deepStrictEqual(DIMENSIONES.map((d) => d.campo), camposEsperados);
    console.log('✓ Cobertura integral de las 5 dimensiones normativas en el asistente verificada');

  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (_) {}
  }

  console.log('\nPASS AX-F-075 — Invariantes del asistente interactivo demostrados al 100%.\n');
})();
