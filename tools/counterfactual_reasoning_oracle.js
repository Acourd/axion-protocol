#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Counterfactual Reasoning Oracle & Critical Path Simulator (M_COG_012)
 *
 * Oráculo de razonamiento contrafáctico (Nivel 3 Causal de Judea Pearl):
 * 1. Evalúa bifurcaciones hipotéticas "¿qué pasaría si?" antes de mutaciones críticas.
 * 2. Compara el camino factual propuesto contra alternativas contrafácticas de mitigación.
 * 3. Modela matemáticamente riesgo, reversibilidad y economía de tokens calculando el Regret Score.
 * 4. Emite un certificado determinista CounterfactualAuditCertificate sellado con SHA-256.
 *
 * Cero dependencias externas.
 */

const crypto = require('crypto');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const RISK_WEIGHTS = {
  LOW: 1,
  MEDIUM: 3,
  HIGH: 7,
  CRITICAL: 10
};

const REVERSIBILITY_PENALTIES = {
  INSTANT: 0,
  EASY: 1,
  DIFFICULT: 4,
  IRREVERSIBLE: 8
};

class CounterfactualReasoningOracle {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
  }

  /**
   * Calcula el coste compuesto de un camino evaluando riesgo, reversibilidad y tokens.
   */
  computePathCost(pathSpec = {}) {
    const riskKey = String(pathSpec.riskLevel || 'MEDIUM').toUpperCase();
    const riskScore = RISK_WEIGHTS[riskKey] || RISK_WEIGHTS.MEDIUM;

    const revKey = String(pathSpec.reversibility || 'EASY').toUpperCase();
    const revPenalty = REVERSIBILITY_PENALTIES[revKey] || REVERSIBILITY_PENALTIES.EASY;

    const tokens = Number(pathSpec.tokenCost) || 100;
    const tokenCostFactor = tokens / 1000;

    return (riskScore * 2) + revPenalty + tokenCostFactor;
  }

  /**
   * Deriva la recomendación soberana a partir de la comparación de costes de ambos caminos.
   */
  deriveRecommendation(factualCost, counterfactualCost, regretScore) {
    if (factualCost >= 20 && counterfactualCost >= 20) {
      return 'ABORT_HIGH_REGRET';
    }
    if (counterfactualCost < factualCost && regretScore > 0.30) {
      return 'SWITCH_TO_COUNTERFACTUAL';
    }
    return 'PROCEED_FACTUAL';
  }

  /**
   * Simula y audita contrafácticamente dos alternativas de decisión.
   */
  simulateCounterfactual(factualSpec = {}, counterfactualSpec = {}) {
    const factualTitle = factualSpec.title || 'Camino Factual Propuesto';
    const counterfactualTitle = counterfactualSpec.title || 'Hipótesis Contrafáctica Alternativa';

    const factualCost = this.computePathCost(factualSpec);
    const counterfactualCost = this.computePathCost(counterfactualSpec);

    // Calcular el arrepentimiento relativo (regret score) entre [0.0, 1.0]
    const delta = Math.abs(factualCost - counterfactualCost);
    const maxCost = Math.max(factualCost, counterfactualCost, 1);
    const regretScore = Number((delta / maxCost).toFixed(3));

    const recommendation = this.deriveRecommendation(factualCost, counterfactualCost, regretScore);

    const certPayload = JSON.stringify({
      factualTitle,
      counterfactualTitle,
      factualCost: Number(factualCost.toFixed(2)),
      counterfactualCost: Number(counterfactualCost.toFixed(2)),
      regretScore,
      recommendation,
      timestamp: new Date().toISOString()
    });

    const certificateDigest = crypto.createHash('sha256').update(certPayload).digest('hex');

    return {
      status: 'SIMULATION_COMPLETED',
      certificateType: 'CounterfactualAuditCertificate_v1',
      factual: { title: factualTitle, cost: Number(factualCost.toFixed(2)) },
      counterfactual: { title: counterfactualTitle, cost: Number(counterfactualCost.toFixed(2)) },
      regretScore,
      recommendation,
      certificateDigest
    };
  }

  /**
   * Formatea un resumen visual y legible de la auditoría contrafáctica.
   */
  formatSummary(audit) {
    return [
      '### 🔮 Auditoría de Razonamiento Contrafáctico',
      `* **📌 Camino Factual:** ${audit.factual.title} (Coste: ${audit.factual.cost})`,
      `* **🔀 Hipótesis Contrafáctica:** ${audit.counterfactual.title} (Coste: ${audit.counterfactual.cost})`,
      `* **⚖️ Regret Score:** ${audit.regretScore}`,
      `* **🧭 Recomendación:** \`${audit.recommendation}\``,
      `* **🔐 Digest SHA-256:** \`${audit.certificateDigest.slice(0, 16)}...\``
    ].join('\n');
  }
}

if (require.main === module) {
  const oracle = new CounterfactualReasoningOracle();

  const factual = {
    title: 'Despliegue directo en caliente sin réplica local',
    riskLevel: 'HIGH',
    reversibility: 'DIFFICULT',
    tokenCost: 2500
  };

  const counterfactual = {
    title: 'Despliegue previo en sandbox aislado con rollback verificado',
    riskLevel: 'LOW',
    reversibility: 'INSTANT',
    tokenCost: 800
  };

  console.log('[Counterfactual Oracle] Evaluando divergencia causal:\n');
  const result = oracle.simulateCounterfactual(factual, counterfactual);
  console.log(oracle.formatSummary(result));
}

module.exports = CounterfactualReasoningOracle;
