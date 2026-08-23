#!/usr/bin/env node
/**
 * Axion Protocol — Multi-Anchor Adversarial Pre-Mortem & Resilience Engine (Fase 2: PLAN/GATE)
 * 
 * Estructura de 3 Niveles de Profundidad:
 *  - Nivel 1 (4 Anclas): Riesgos graves clasificados por Seguridad, Rendimiento, Arquitectura y UX.
 *  - Nivel 2 (Estrés de Dominio): Casos límite técnicos específicos a la tecnología y entorno de ejecución.
 *  - Nivel 3 (Auto-Crítica de la Solución): Estrés sobre las propias mitigaciones para evitar sobreingeniería.
 * 
 * Zero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

const ANCHORS = {
  SECURITY: '🛡️ Seguridad & Integridad',
  PERFORMANCE: '⚡ Rendimiento & Recursos',
  ARCHITECTURE: '🧩 Arquitectura & Deuda Técnica',
  UX: '👥 Ergonomía & Experiencia Humana'
};

class PreMortemEngine {
  constructor(projectRoot = ROOT) {
    this.root = projectRoot;
    this.stateDir = path.join(this.root, '.axion', 'state');
    this.ensureStateDir();
  }

  ensureStateDir() {
    if (!fs.existsSync(this.stateDir)) {
      fs.mkdirSync(this.stateDir, { recursive: true });
    }
  }

  /**
   * Evaluates a structured premortem assessment payload.
   */
  evaluateAssessment(payload) {
    const errors = [];

    if (!payload || typeof payload !== 'object') {
      return {
        status: 'DENIED',
        reason: 'INVALID_PAYLOAD',
        message: 'El payload de Pre-Mortem debe ser un objeto JSON válido.'
      };
    }

    if (!payload.feature_name || String(payload.feature_name).trim().length < 3) {
      errors.push('feature_name es obligatorio y debe tener al menos 3 caracteres.');
    }

    // 1. Validar Hipótesis de Falla (Global o por 4 Anclas)
    const hasAnchors = payload.anchors && typeof payload.anchors === 'object';
    if (hasAnchors) {
      const { security, performance, architecture, ux } = payload.anchors;
      if (!Array.isArray(security) || security.length === 0) errors.push('anchors.security debe contener al menos 1 riesgo grave.');
      if (!Array.isArray(performance) || performance.length === 0) errors.push('anchors.performance debe contener al menos 1 riesgo grave.');
      if (!Array.isArray(architecture) || architecture.length === 0) errors.push('anchors.architecture debe contener al menos 1 riesgo grave.');
      if (!Array.isArray(ux) || ux.length === 0) errors.push('anchors.ux debe contener al menos 1 riesgo grave.');
    } else {
      const hypotheses = payload.failure_hypotheses || [];
      if (!Array.isArray(hypotheses) || hypotheses.length < 3) {
        errors.push('failure_hypotheses debe contener al menos 3 razones concretas (o usar la estructura de 4 anclas).');
      }
    }

    // 2. Auditoría de Competencia / Anti-Bloat
    if (!payload.competence_check || typeof payload.competence_check !== 'object') {
      errors.push('Falta competence_check (evaluación de necesidad real frente a complejidad).');
    }

    // 3. Peores Escenarios Técnicos
    if (!payload.worst_case_scenarios || !Array.isArray(payload.worst_case_scenarios) || payload.worst_case_scenarios.length < 2) {
      errors.push('worst_case_scenarios debe analizar al menos 2 situaciones límite catastróficas.');
    }

    // 4. Salvaguardas y Mitigación Obligatorias
    if (!payload.mandatory_mitigations || !Array.isArray(payload.mandatory_mitigations) || payload.mandatory_mitigations.length === 0) {
      errors.push('mandatory_mitigations debe listar al menos 1 medida de blindaje técnico indispensable.');
    }

    if (errors.length > 0) {
      return {
        status: 'DENIED',
        reason: 'PREMORTEM_INCOMPLETE',
        errors
      };
    }

    const premortemId = crypto.randomBytes(8).toString('hex');
    const timestamp = new Date().toISOString();
    const digest = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');

    // Determinar veredicto enriquecido
    let verdict = 'APPROVED_WITH_SAFEGUARDS';
    if (payload.verdict) {
      verdict = payload.verdict;
    } else if (payload.competence_check && payload.competence_check.justified === false) {
      verdict = 'REJECTED_AS_UNJUSTIFIED';
    } else if (payload.mitigation_stress_test && payload.mitigation_stress_test.has_critical_weakness) {
      verdict = 'CONDITIONAL_TDD';
    }

    const record = {
      premortem_id: premortemId,
      depth_level: payload.depth_level || (hasAnchors ? 2 : 1),
      timestamp,
      digest,
      payload,
      verdict
    };

    const recordPath = path.join(this.stateDir, `premortem-${premortemId}.json`);
    fs.writeFileSync(recordPath, JSON.stringify(record, null, 2), 'utf8');

    // Auto-sincronizar con .axion/memory si hay reglas críticas
    this.syncToMemoryIfCritical(record);

    return {
      status: 'APPROVED',
      premortem_id: premortemId,
      depth_level: record.depth_level,
      digest,
      verdict: record.verdict,
      message: 'Evaluación Pre-Mortem multi-ancla certificada.',
      record_path: recordPath
    };
  }

  /**
   * Sincroniza aprendizajes y anti-patrones críticos descubiertos con .axion/memory
   */
  syncToMemoryIfCritical(record) {
    try {
      const memoryDir = path.join(this.root, '.axion', 'memory');
      const memoryPath = path.join(memoryDir, 'MEMORY.md');
      if (!fs.existsSync(memoryDir)) fs.mkdirSync(memoryDir, { recursive: true });

      const feature = record.payload.feature_name || 'Característica';
      const verdict = record.verdict;
      const mitigations = record.payload.mandatory_mitigations || [];

      if (mitigations.length > 0 && fs.existsSync(memoryPath)) {
        let content = fs.readFileSync(memoryPath, 'utf8');
        const entry = `\n- [Pre-Mortem] ${feature} (${verdict}): ${mitigations[0]}`;
        if (!content.includes(entry.trim())) {
          content += entry;
          fs.writeFileSync(memoryPath, content, 'utf8');
        }
      }
    } catch (_) {}
  }

  /**
   * Generates structured markdown for 3-tier deep evaluation.
   */
  static formatReport({ featureName, anchors, worstCases, mitigations, solutionStress, verdict = 'APROBADA CON BLINDAJE', depth = 1 }) {
    let md = `# 🌪️ Reporte Pre-Mortem Adversarial: ${featureName}\n\n`;
    md += `> **PROFUNDIDAD: NIVEL ${depth}** — Autopsia anticipada y simulación de fracaso a 6 meses.\n\n---\n\n`;

    if (anchors) {
      md += `### 🧭 1. Las 4 Anclas de Impacto y Riesgos Más Graves\n\n`;
      if (anchors.security) {
        md += `#### ${ANCHORS.SECURITY}\n` + anchors.security.map((r, i) => `- ⚠️ **[Riesgo ${i + 1}]**: ${r}`).join('\n') + '\n\n';
      }
      if (anchors.performance) {
        md += `#### ${ANCHORS.PERFORMANCE}\n` + anchors.performance.map((r, i) => `- ⚠️ **[Riesgo ${i + 1}]**: ${r}`).join('\n') + '\n\n';
      }
      if (anchors.architecture) {
        md += `#### ${ANCHORS.ARCHITECTURE}\n` + anchors.architecture.map((r, i) => `- ⚠️ **[Riesgo ${i + 1}]**: ${r}`).join('\n') + '\n\n';
      }
      if (anchors.ux) {
        md += `#### ${ANCHORS.UX}\n` + anchors.ux.map((r, i) => `- ⚠️ **[Riesgo ${i + 1}]**: ${r}`).join('\n') + '\n\n';
      }
    }

    if (worstCases && worstCases.length > 0) {
      md += `---\n\n### 🌪️ 2. Peores Escenarios Catastróficos (Estrés de Dominio)\n`;
      md += worstCases.map((w, i) => `- 💥 **[Escenario Catastrófico ${i + 1}]**: ${w}`).join('\n') + '\n\n';
    }

    if (mitigations && mitigations.length > 0) {
      md += `---\n\n### 🛡️ 3. Medidas de Mitigación Obligatorias\n`;
      md += mitigations.map((m, i) => `- ✅ **[Salvaguarda ${i + 1}]**: ${m}`).join('\n') + '\n\n';
    }

    if (solutionStress && solutionStress.length > 0) {
      md += `---\n\n### 🔍 4. Auto-Crítica de la Solución (Pre-Mortem de las Mitigaciones)\n`;
      md += solutionStress.map((s, i) => `- ⚡ **[Punto Débil de la Mitigación ${i + 1}]**: ${s}`).join('\n') + '\n\n';
    }

    md += `---\n\n### ⚖️ 5. Veredicto Final: **${verdict}**\n`;
    return md;
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  const engine = new PreMortemEngine();

  if (command === 'evaluate') {
    let rawInput = args[1];
    if (!rawInput) {
      console.error(JSON.stringify({ status: 'DENIED', reason: 'MISSING_PAYLOAD' }, null, 2));
      process.exit(1);
    }
    try {
      const payload = JSON.parse(rawInput);
      const res = engine.evaluateAssessment(payload);
      console.log(JSON.stringify(res, null, 2));
      process.exit(res.status === 'APPROVED' ? 0 : 1);
    } catch (e) {
      console.error(JSON.stringify({ status: 'DENIED', reason: 'MALFORMED_JSON', message: e.message }, null, 2));
      process.exit(1);
    }
  } else {
    console.log('Uso: node tools/premortem.js evaluate <json_payload>');
  }
}

module.exports = PreMortemEngine;
