#!/usr/bin/env node
/**
 * Axion Protocol — Adversarial Pre-Mortem & Resilience Engine
 * Evaluates feature proposals through a structured 5-pillar worst-case simulation:
 *  1. PREMATURE_AUTOPSY: Assumes the feature failed completely in 6 months; analyzes root causes.
 *  2. COMPETENCE_AUDIT: Checks if the feature adds genuine value or is bloated/incompetent.
 *  3. WORST_CASE_SCENARIOS: Concurrency, data loss, performance spikes, corrupted states.
 *  4. BLIND_SPOTS: Hidden maintenance costs, breaking changes, user friction.
 *  5. MITIGATION_CONTRACT: Mandatory architectural safeguards required before coding.
 * 
 * Zero external dependencies.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

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

    // 1. Validar Autopsia Prematura
    if (!payload.failure_hypotheses || !Array.isArray(payload.failure_hypotheses) || payload.failure_hypotheses.length < 3) {
      errors.push('failure_hypotheses debe contener al menos 3 razones concretas por las que la función fracasó.');
    } else {
      payload.failure_hypotheses.forEach((h, idx) => {
        if (String(h || '').trim().length < 25) {
          errors.push(`Hipótesis de autopsia ${idx + 1} demasiado corta (<25 caracteres).`);
        }
      });
    }

    // 2. Auditoría de Competencia / Anti-Bloat
    if (!payload.competence_check || typeof payload.competence_check !== 'object') {
      errors.push('Falta competence_check (evaluación de necesidad real frente a complejidad).');
    } else {
      if (typeof payload.competence_check.justified !== 'boolean') {
        errors.push('competence_check.justified debe ser un booleano.');
      }
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

    const record = {
      premortem_id: premortemId,
      timestamp,
      digest,
      payload,
      verdict: payload.competence_check.justified ? 'APPROVED_WITH_SAFEGUARDS' : 'REJECTED_AS_UNJUSTIFIED'
    };

    const recordPath = path.join(this.stateDir, `premortem-${premortemId}.json`);
    fs.writeFileSync(recordPath, JSON.stringify(record, null, 2), 'utf8');

    return {
      status: 'APPROVED',
      premortem_id: premortemId,
      digest,
      verdict: record.verdict,
      message: 'Evaluación Pre-Mortem adversaria certificada.',
      record_path: recordPath
    };
  }

  /**
   * Generates formatted human markdown output from an idea evaluation.
   */
  static formatReport(featureName, failureReasons, worstCases, mitigations, verdict = 'APROBADA CON BLINDAJE') {
    return `# 🌪️ Reporte Pre-Mortem Adversarial: ${featureName}

> **EJERCICIO PRE-MORTEM**: Asumimos que esta funcionalidad fue implementada y resultó en un desastre o deuda técnica severa a los 6 meses.

---

### 💀 1. Autopsia Prematura (¿Por qué fracasó la idea?)
${failureReasons.map((r, i) => `${i + 1}. **${r.title || 'Falla'}**: ${r.detail || r}`).join('\n')}

---

### 🌪️ 2. Peores Escenarios Catastróficos Identificados
${worstCases.map((w, i) => `- ⚠️ **[Riesgo ${i + 1}]**: ${w}`).join('\n')}

---

### 🛡️ 3. Medidas de Mitigación Obligatorias
${mitigations.map((m, i) => `- ✅ **[Salvaguarda ${i + 1}]**: ${m}`).join('\n')}

---

### ⚖️ 4. Veredicto de Resiliencia: **${verdict}**
`;
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
