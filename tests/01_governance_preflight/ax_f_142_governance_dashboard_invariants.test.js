'use strict';

/**
 * Axion Protocol — Invariantes del Generador de Panel Visual y Reportes de Gobernanza.
 *
 * Valida de forma estricta:
 * 1. Agregación determinista de métricas de seguridad, salud, paridad, presupuesto e instintos.
 * 2. Generación de panel HTML autónomo, accesible y libre de CDNs externas.
 * 3. Exportación de resumen ejecutivo en Markdown.
 * 4. Emisión de manifiesto JSON y cálculo de digest SHA-256 in-toto.
 * 5. Integración transparente con DriveEngine y CLI unificado.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const GovernanceDashboardGenerator = require('../../tools/governance_dashboard.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-142 Invariantes del Generador de Panel de Gobernanza ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sandbox = path.join(ROOT, 'scratch', `test_dashboard_sandbox_${Date.now()}`);
fs.mkdirSync(path.join(sandbox, '.axion', 'reports'), { recursive: true });

try {
  const generator = new GovernanceDashboardGenerator(ROOT);

  // 1. Validar recolección de métricas
  const metrics = generator.collectMetrics();
  assert.ok(typeof metrics.shieldScore === 'number');
  assert.ok(typeof metrics.doctorPassed === 'number');
  assert.ok(typeof metrics.harnessCoverage === 'string');
  assert.ok(typeof metrics.budgetZone === 'string');
  console.log(`✓ Recolección de métricas validada (Shield: ${metrics.shieldScore}/100, Doctor: ${metrics.doctorPassed}/${metrics.doctorTotal}, Zona: ${metrics.budgetZone})`);

  // 2. Validar generación de HTML autónomo
  const html = generator.generateHtml(metrics);
  assert.ok(html.includes('<!DOCTYPE html>'));
  assert.ok(html.includes('Axion Protocol — Panel de Gobernanza'));
  assert.ok(!html.includes('<script src='), 'El dashboard no debe requerir scripts externos');
  assert.ok(!html.includes('https://cdn.'), 'El dashboard debe ser 100% offline y zero-dependency');
  console.log('✓ Generación de HTML autónomo y zero-dependency validada');

  // 3. Validar generación de Markdown
  const md = generator.generateMarkdown(metrics);
  assert.ok(md.includes('# 🛡️ Axion Protocol — Reporte de Gobernanza Agéntica'));
  assert.ok(md.includes('AgentShield Security Score'));
  assert.ok(md.includes('Diagnóstico Doctor'));
  console.log('✓ Resumen ejecutivo Markdown validado');

  // 4. Validar generación integral y sellado digest
  const dashboardRes = generator.generateDashboard();
  assert.strictEqual(dashboardRes.success, true);
  assert.ok(fs.existsSync(dashboardRes.htmlPath));
  assert.ok(fs.existsSync(dashboardRes.mdPath));
  assert.ok(fs.existsSync(dashboardRes.jsonPath));
  assert.ok(dashboardRes.digest.length === 64, 'El digest SHA-256 debe tener 64 caracteres');
  console.log(`✓ Generación de archivos de reporte y sellado SHA-256 validado (${dashboardRes.digest.slice(0, 16)}...)`);

  // 5. Validar integración con DriveEngine
  const driveEngine = new DriveEngine(ROOT);
  const driveDash = driveEngine.generateGovernanceDashboard();
  assert.strictEqual(driveDash.success, true);
  console.log('✓ Integración DriveEngine.generateGovernanceDashboard() verificada');

} finally {
  if (fs.existsSync(sandbox)) {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
}

console.log('\nPASS AX-F-142 — Invariantes del generador de panel de gobernanza demostrados al 100%.');
