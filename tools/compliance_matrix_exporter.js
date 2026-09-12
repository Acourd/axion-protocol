#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Compliance & Standard Matrix Exporter
 *
 * Mapeo y exportador de conformidad con marcos y estándares para /drive:
 * 1. SLSA Level 3 (Supply-chain Levels for Software Artifacts v1.0).
 * 2. in-toto Statement v1 & DSSE Specification.
 * 3. NIST SP 800-218 (Secure Software Development Framework - SSDF).
 * 4. OWASP Top 10 2025 / LLM Security Guidance.
 *
 * Produce reportes ejecutivos en Markdown (.axion/reports/COMPLIANCE_MATRIX.md) y JSON con sellado SHA-256.
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

const COMPLIANCE_FRAMEWORKS = {
  SLSA_L3: {
    name: 'SLSA v1.0 Level 3 (Supply Chain Security - Self-Assessed Mapping)',
    clauses: [
      { id: 'SLSA-SRC-01', requirement: 'Historial de versiones y custodia de cambios criptográfica', status: 'SELF_ASSESSED', evidence: 'tools/git_governance_hook.js & Merkle Cache' },
      { id: 'SLSA-BLD-01', requirement: 'Entorno de compilación aislado y reproducible zero-dependency', status: 'SELF_ASSESSED', evidence: 'tools/bundle_compiler.js (0 node_modules)' },
      { id: 'SLSA-PRV-01', requirement: 'Procedencia in-toto Statement v1 firmada en sobre DSSE con Ed25519', status: 'SELF_ASSESSED', evidence: 'tools/drive_dsse_attester.js & tools/attestation.js' }
    ]
  },
  IN_TOTO_V1: {
    name: 'in-toto Attestation Specification v1.0 (Self-Assessed Mapping)',
    clauses: [
      { id: 'INTOTO-PAE-01', requirement: 'Pre-Authentication Encoding (PAE) estricto byte a byte', status: 'SELF_ASSESSED', evidence: 'tools/dsse.js (pae implementation)' },
      { id: 'INTOTO-STMT-01', requirement: 'Sujeto y Predicado conformes al estándar in-toto JSON', status: 'SELF_ASSESSED', evidence: 'tools/drive_dsse_attester.js' },
      { id: 'INTOTO-SIG-01', requirement: 'Firma asimétrica Ed25519 con verificación independiente', status: 'SELF_ASSESSED', evidence: 'lib/approval.js & tools/drive_dsse_attester.js' }
    ]
  },
  NIST_SSDF: {
    name: 'NIST SP 800-218 (Secure Software Development Framework - Self-Assessed Mapping)',
    clauses: [
      { id: 'SSDF-PO-01', requirement: 'Políticas de seguridad P0 fail-closed activas en el repositorio', status: 'SELF_ASSESSED', evidence: '.agents/rules/axion-governance.md' },
      { id: 'SSDF-PW-01', requirement: 'Análisis estático de código continuo sin antipatrones', status: 'SELF_ASSESSED', evidence: 'tools/vibeguard_gate.js' },
      { id: 'SSDF-PS-01', requirement: 'Clasificación y mitigación pre-vuelo de comandos destructivos', status: 'SELF_ASSESSED', evidence: 'tools/preflight.js & tools/agent_shield.js' },
      { id: 'SSDF-RV-01', requirement: 'Planes de reversión determinista y aislamiento de estados', status: 'SELF_ASSESSED', evidence: 'tools/sqlite_snapshot_isolation.js & checkpoint_restore' }
    ]
  },
  OWASP_2025: {
    name: 'OWASP Top 10 2025 / LLM Governance (Self-Assessed Mapping)',
    clauses: [
      { id: 'OWASP-LLM-01', requirement: 'Neutralización de Prompt Injections y comandos crudos', status: 'SELF_ASSESSED', evidence: 'tools/agent_chaos_monkey.js & tools/preflight.js' },
      { id: 'OWASP-SEC-01', requirement: 'Aislamiento y escaneo de secretos sin fugas en memoria', status: 'SELF_ASSESSED', evidence: 'tools/agent_shield.js' }
    ]
  }
};

class ComplianceMatrixExporter {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
    this.reportsDir = path.join(this.root, '.axion', 'reports');
    this.stateDir = path.join(this.root, '.axion', 'state');
    if (!fs.existsSync(this.reportsDir)) fs.mkdirSync(this.reportsDir, { recursive: true });
    if (!fs.existsSync(this.stateDir)) fs.mkdirSync(this.stateDir, { recursive: true });

    this.mdPath = path.join(this.reportsDir, 'COMPLIANCE_MATRIX.md');
    this.jsonPath = path.join(this.stateDir, 'compliance-matrix.json');
  }

  /**
   * Evalúa la matriz de autoevaluación heurística.
   */
  evaluateCompliance() {
    let totalClauses = 0;
    let selfAssessedClauses = 0;
    let unverifiedClauses = 0;
    const frameworkResults = {};

    for (const [key, fw] of Object.entries(COMPLIANCE_FRAMEWORKS)) {
      const clauses = fw.clauses.map(c => {
        totalClauses++;
        if (c.status === 'SELF_ASSESSED') selfAssessedClauses++;
        else unverifiedClauses++;
        return { ...c };
      });

      frameworkResults[key] = {
        name: fw.name,
        total: clauses.length,
        selfAssessed: clauses.filter(c => c.status === 'SELF_ASSESSED').length,
        unverified: clauses.filter(c => c.status !== 'SELF_ASSESSED').length,
        clauses
      };
    }

    const selfAssessmentRate = totalClauses > 0 ? (selfAssessedClauses / totalClauses) * 100 : 0;

    return {
      timestamp: new Date().toISOString(),
      evaluationType: 'SELF_ASSESSED_HEURISTIC',
      disclaimer: 'Autoevaluación interna heurística para desarrollo local; no constituye certificación formal independiente por terceros (SLSA, NIST u OWASP).',
      selfAssessmentRate: `${selfAssessmentRate.toFixed(1)}%`,
      totalClauses,
      selfAssessedClauses,
      unverifiedClauses,
      frameworks: frameworkResults
    };
  }

  /**
   * Genera el documento Markdown de la matriz.
   */
  generateMarkdown(matrix) {
    const lines = [
      '# 📜 Axion Protocol — Matriz de Autoevaluación Heurística vs Estándares',
      '',
      '> [!NOTE]',
      '> **Aviso de Calibración:** Este documento refleja una autoevaluación heurística interna de controles locales implementados en el código. **No constituye certificación formal independiente** ni aval de conformidad emitido por organismos reguladores o auditores acreditados (SLSA, NIST u OWASP).',
      '',
      `**Fecha de Evaluación:** ${matrix.timestamp}`,
      `**Cobertura de Autoevaluación:** **${matrix.selfAssessmentRate}** (${matrix.selfAssessedClauses}/${matrix.totalClauses} Cláusulas incluidas en la autoevaluación)`,
      `**Tipo de Evaluación:** \`${matrix.evaluationType}\``,
      `**Arquitectura:** Herramientas de gobernanza local con cero dependencias externas`,
      '',
      '---',
      ''
    ];

    for (const fw of Object.values(matrix.frameworks)) {
      lines.push(`## 🛡️ ${fw.name}`);
      lines.push('');
      lines.push('| ID | Requisito / Cláusula | Estado | Evidencia Demostrable |');
      lines.push('|:---|:---|:---:|:---|');
      fw.clauses.forEach(c => {
        const badge = c.status === 'SELF_ASSESSED' ? '🟡 **SELF_ASSESSED**' : '⚪ **UNVERIFIED**';
        lines.push(`| \`${c.id}\` | ${c.requirement} | ${badge} | \`${c.evidence}\` |`);
      });
      lines.push('');
    }

    lines.push('---');
    lines.push('*Matriz generada automáticamente con fines de gobernanza interna y trazabilidad local.*');
    return lines.join('\n');
  }

  /**
   * Exporta reportes Markdown y JSON sellados.
   */
  exportMatrix() {
    const matrix = this.evaluateCompliance();
    const mdContent = this.generateMarkdown(matrix);

    fs.writeFileSync(this.mdPath, mdContent, 'utf8');
    fs.writeFileSync(this.jsonPath, JSON.stringify(matrix, null, 2), 'utf8');

    const digest = crypto.createHash('sha256')
      .update(mdContent)
      .digest('hex');

    return {
      success: true,
      selfAssessmentRate: matrix.selfAssessmentRate,
      mdPath: this.mdPath,
      jsonPath: this.jsonPath,
      digest,
      matrix
    };
  }
}

if (require.main === module) {
  const exporter = new ComplianceMatrixExporter();
  console.log('[Axion Compliance Exporter] Auditando matriz de autoevaluación contra estándares...\n');
  const res = exporter.exportMatrix();
  console.log(`✓ Cobertura de Autoevaluación: ${res.selfAssessmentRate}`);
  console.log(`✓ Reporte Markdown:            ${path.relative(ROOT, res.mdPath)}`);
  console.log(`✓ Manifiesto JSON:             ${path.relative(ROOT, res.jsonPath)}`);
  console.log(`✓ SHA-256 Digest:              ${res.digest.slice(0, 16)}...\n`);
}

module.exports = ComplianceMatrixExporter;
