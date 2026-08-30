'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { runHealthCheck } = require('../../tools/health_check.js');

console.log('=== AX-F-077 Invariantes Adversariales de Auditoría de Salud y Corrupción de Estado ===\n');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-health-corrupt-test-'));

try {
  // 1. Espacio de trabajo con PROFILE.json corrupto (JSON truncado)
  const axionDir = path.join(tempDir, '.axion');
  fs.mkdirSync(axionDir, { recursive: true });
  fs.writeFileSync(path.join(axionDir, 'PROFILE.json'), '{ "technical_depth": "SENIOR", corrupt...', 'utf8');

  const resCorruptProfile = runHealthCheck(tempDir);
  const checkProfile = resCorruptProfile.checks.find((c) => c.name === 'Perfil Calibrado');
  assert.strictEqual(checkProfile.pass, false, 'PROFILE.json corrupto debe marcarse como fallido');
  assert.strictEqual(checkProfile.detail.includes('ilegible'), true);
  console.log('✓ Detección de PROFILE.json corrupto e ilegible verificada');

  // 2. Detección de workflows obsoletos en .agents/workflows (Formato Antigravity)
  const dirWorkflowsLegado = path.join(tempDir, '.agents', 'workflows');
  fs.mkdirSync(dirWorkflowsLegado, { recursive: true });
  fs.writeFileSync(path.join(dirWorkflowsLegado, 'obsoleto.md'), '# Workflow legado\n', 'utf8');

  const resLegado = runHealthCheck(tempDir);
  const checkLegado = resLegado.checks.find((c) => c.name === 'Formato Antigravity');
  assert.strictEqual(checkLegado.pass, false, 'Presencia de workflows obsoletos debe fallar');
  assert.strictEqual(checkLegado.detail.includes('obsoletos'), true);
  console.log('✓ Detección de workflows obsoletos en .agents/workflows verificada');

  // 3. Detección de herramientas citadas ausentes
  const dirSkills = path.join(tempDir, '.agents', 'skills', 'fake_skill');
  fs.mkdirSync(dirSkills, { recursive: true });
  fs.writeFileSync(path.join(dirSkills, 'SKILL.md'), 'Usa node tools/herramienta_fantasma_xyz.js para verificar.\n', 'utf8');

  const resAusente = runHealthCheck(tempDir);
  const checkCitadas = resAusente.checks.find((c) => c.name === 'Herramientas Citadas');
  assert.strictEqual(checkCitadas.pass, false, 'Herramientas citadas inexistentes deben fallar');
  assert.strictEqual(checkCitadas.detail.includes('herramienta_fantasma_xyz.js'), true);
  console.log('✓ Detección de herramientas citadas inexistentes en prompts verificada');

  // 4. Verificación de contrato y estructura de las comprobaciones
  assert.strictEqual(Array.isArray(resAusente.checks), true);
  assert.strictEqual(resAusente.checks.every((c) => typeof c.name === 'string' && typeof c.pass === 'boolean' && typeof c.detail === 'string'), true);
  console.log('✓ Contrato de salida booleana y detalle de diagnóstico de las comprobaciones verificado');

} finally {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (_) {}
}

console.log('\nPASS AX-F-077 — Invariantes adversariales de auditoría de salud demostrados al 100%.\n');
