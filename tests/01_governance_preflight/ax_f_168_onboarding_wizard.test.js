#!/usr/bin/env node
'use strict';

/**
 * AX-F-168: Invariantes del Asistente de Onboarding Universal y Semáforo de Vuelo (HUD)
 *
 * Verifica:
 * 1. Detección precisa del entorno de ejecución (detectEnvironment).
 * 2. Inicialización de 1 clic sin errores técnicos (runOneClickSetup).
 * 3. Renderizado determinista del Semáforo Visual de Control de Vuelo (renderFlightHUD).
 * 4. Presencia de recetas de tareas rápidas para usuarios no técnicos.
 */

const assert = require('assert');
const { crearSandboxTemporal } = require('../../tools/test_sandbox.js');
const path = require('path');
const fs = require('fs');
const os = require('os');
const OnboardingWizard = require('../../tools/onboarding_wizard.js');

console.log('=== AX-F-168: Invariantes de OnboardingWizard & Flight HUD ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const tempSandbox = crearSandboxTemporal('test_ax_f_168');
fs.mkdirSync(tempSandbox, { recursive: true });

try {
  const wizard = new OnboardingWizard(tempSandbox);

  // Invariante 1: Detección de entorno
  const env = wizard.detectEnvironment();
  assert.strictEqual(typeof env.isAntigravity, 'boolean', 'isAntigravity debe ser booleano');
  assert.strictEqual(typeof env.isClaude, 'boolean', 'isClaude debe ser booleano');
  assert.strictEqual(typeof env.nodeVersion, 'string', 'nodeVersion debe ser string');
  assert.strictEqual(env.hasPackageJson, false, 'Sandbox nuevo no debe tener package.json');
  console.log('  ✓ Invariante 1: Detección de entorno verificada.');

  // Invariante 2: Setup de 1 clic
  const setupRes = wizard.runOneClickSetup();
  assert.strictEqual(setupRes.status, 'SUCCESS', 'Setup debe retornar status SUCCESS');
  assert.strictEqual(typeof setupRes.durationMs, 'number', 'durationMs debe ser numérico');
  assert.ok(setupRes.durationMs < 5000, `Setup debe ser rápido (< 5000ms), obtenido: ${setupRes.durationMs}ms`);
  console.log(`  ✓ Invariante 2: Setup de 1 clic completado en ${setupRes.durationMs}ms.`);

  // Invariante 3: Renderizado del HUD de Control de Vuelo
  const hud = wizard.renderFlightHUD(setupRes);
  assert.ok(hud.includes('SEMÁFORO DE CONTROL DE VUELO'), 'HUD debe incluir cabecera de semáforo');
  assert.ok(hud.includes('ESTADO DEL SISTEMA'), 'HUD debe reportar estado del sistema');
  assert.ok(hud.includes('MODO DE GOBERNANZA'), 'HUD debe reportar modo fail-closed');
  assert.ok(hud.includes('RECETAS RÁPIDAS'), 'HUD debe proveer recetas de inicio rápido');
  console.log('  ✓ Invariante 3: Semáforo Visual de Control de Vuelo renderizado correctamente.');

  console.log('\nPASS: AX-F-168 — Onboarding Wizard y Flight HUD verificados con 3/3 invariantes en verde.');
} finally {
  try {
    fs.rmSync(tempSandbox, { recursive: true, force: true });
  } catch (_) {
    // cleanup
  }
}
