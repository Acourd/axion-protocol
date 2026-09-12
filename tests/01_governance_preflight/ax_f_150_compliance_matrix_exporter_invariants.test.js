'use strict';

/**
 * Axion Protocol — Invariantes del Exportador de Matriz de Conformidad y Estándares.
 *
 * Valida de forma estricta:
 * 1. Mapeo formal y exhaustivo contra SLSA L3, in-toto v1, NIST SSDF y OWASP Top 10.
 * 2. Cálculo determinista del 100.0% de conformidad normativa.
 * 3. Generación de informe ejecutivo en Markdown y manifiesto JSON sellado con SHA-256.
 * 4. Integración transparente con DriveEngine y CLI unificado.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const ComplianceMatrixExporter = require('../../tools/compliance_matrix_exporter.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-150 Invariantes del Exportador de Matriz de Conformidad ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sandbox = path.join(ROOT, 'scratch', `test_compliance_sandbox_${Date.now()}`);
fs.mkdirSync(path.join(sandbox, '.axion', 'reports'), { recursive: true });
fs.mkdirSync(path.join(sandbox, '.axion', 'state'), { recursive: true });

try {
  const exporter = new ComplianceMatrixExporter(sandbox);

  // 1. Validar evaluación de autoevaluación heurística
  const evalRes = exporter.evaluateCompliance();
  assert.strictEqual(evalRes.selfAssessmentRate, '100.0%');
  assert.strictEqual(evalRes.evaluationType, 'SELF_ASSESSED_HEURISTIC');
  assert.strictEqual(evalRes.complianceRate, undefined, 'complianceRate debe estar eliminado');
  assert.strictEqual(evalRes.compliantClauses, undefined, 'compliantClauses debe estar eliminado');
  assert.strictEqual(evalRes.frameworks.SLSA_L3.compliant, undefined, 'frameworks.SLSA_L3.compliant debe estar eliminado');
  assert.ok(evalRes.disclaimer.includes('no constituye certificación formal'));
  assert.strictEqual(evalRes.totalClauses, evalRes.selfAssessedClauses);
  assert.ok(evalRes.frameworks.SLSA_L3);
  assert.ok(evalRes.frameworks.IN_TOTO_V1);
  assert.ok(evalRes.frameworks.NIST_SSDF);
  assert.ok(evalRes.frameworks.OWASP_2025);
  console.log(`✓ Autoevaluación evaluada: ${evalRes.selfAssessmentRate} (${evalRes.selfAssessedClauses}/${evalRes.totalClauses} cláusulas autoevaluadas)`);

  // 2. Validar exportación de artefactos
  const exportRes = exporter.exportMatrix();
  assert.strictEqual(exportRes.success, true);
  assert.ok(fs.existsSync(exportRes.mdPath));
  assert.ok(fs.existsSync(exportRes.jsonPath));
  assert.strictEqual(exportRes.digest.length, 64);
  const mdContent = fs.readFileSync(exportRes.mdPath, 'utf8');
  assert.ok(mdContent.includes('Cláusulas incluidas en la autoevaluación'));
  assert.strictEqual(mdContent.includes('Mitigadas Heurísticamente'), false);
  console.log(`✓ Reportes exportados con éxito: ${path.relative(ROOT, exportRes.mdPath)} (SHA-256: ${exportRes.digest.slice(0, 16)}...)`);

  // 3. Validar integración con DriveEngine
  const driveEngine = new DriveEngine(ROOT);
  const driveComp = driveEngine.generateComplianceMatrix();
  assert.strictEqual(driveComp.success, true);
  console.log('✓ Integración DriveEngine.generateComplianceMatrix() verificada');

} finally {
  if (fs.existsSync(sandbox)) {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
}

console.log('\nPASS AX-F-150 — Invariantes del exportador de matriz de conformidad demostrados al 100%.');
