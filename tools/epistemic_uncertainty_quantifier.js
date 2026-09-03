#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Epistemic Uncertainty Quantifier & Confidence Calibrator (M_COG_015)
 *
 * Cuantificador epistémico de incertidumbre y calibración de confianza:
 * 1. Distingue rigurosamente entre incertidumbre aleatoria (ruido externo) y epistémica (déficit de evidencia).
 * 2. Calcula la entropía entre hipótesis en conflicto y evalúa el soporte de evidencia empírica verificada.
 * 3. Activa veto preventivo fail-closed (HALT_EVIDENTIARY_DEFICIT) si la incertidumbre supera el umbral crítico (0.40).
 * 4. Emite un certificado formal EpistemicCalibrationCertificate sellado con SHA-256.
 *
 * Cero dependencias externas.
 */

const crypto = require('crypto');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

class EpistemicUncertaintyQuantifier {
  constructor(options = {}) {
    this.root = path.resolve(options.projectRoot || ROOT);
    this.criticalThreshold = Math.max(0.1, Math.min(options.criticalThreshold || 0.40, 0.9));
  }

  /**
   * Cuantifica la incertidumbre epistémica y emite la calibración de confianza.
   */
  quantify(proposal = {}) {
    const title = String(proposal.title || 'Propuesta sin título').trim();
    const evidenceList = Array.isArray(proposal.empiricalEvidence) ? proposal.empiricalEvidence : [];
    const competingCount = Math.max(1, Number(proposal.competingHypothesesCount) || 1);
    const volatility = Math.max(0.0, Math.min(Number(proposal.environmentalVolatility) || 0.1, 1.0));

    // 1. Calcular peso total de la evidencia empírica acumulada
    let rawEvidenceWeight = 0;
    for (const ev of evidenceList) {
      const w = typeof ev.weight === 'number' ? ev.weight : 0.25;
      rawEvidenceWeight += w;
    }
    const evidenceScore = Math.min(1.0, rawEvidenceWeight);

    // 2. Calcular dispersión entrópica de hipótesis en disputa
    const entropyScore = Math.min(1.0, (competingCount - 1) * 0.25);

    // 3. Incertidumbre epistémica (déficit de conocimiento)
    const epistemicUncertainty = Number(
      Math.min(1.0, Math.max(0.0, ((1.0 - evidenceScore) * 0.65) + (entropyScore * 0.35))).toFixed(3)
    );

    // 4. Incertidumbre aleatoria (ruido inherente)
    const aleatoricUncertainty = Number(volatility.toFixed(3));

    // 5. Confianza calibrada
    const confidenceScore = Number((1.0 - epistemicUncertainty).toFixed(3));

    // 6. Veredicto soberano
    const isExceeded = epistemicUncertainty > this.criticalThreshold;
    const verdict = isExceeded ? 'HALT_EVIDENTIARY_DEFICIT' : 'PROCEED_CALIBRATED';

    const payload = JSON.stringify({
      title,
      evidenceScore,
      entropyScore,
      epistemicUncertainty,
      aleatoricUncertainty,
      confidenceScore,
      verdict,
      timestamp: new Date().toISOString()
    });

    const certificateDigest = crypto.createHash('sha256').update(payload).digest('hex');

    return {
      certificateType: 'EpistemicCalibrationCertificate_v1',
      title,
      evidenceScore,
      entropyScore,
      epistemicUncertainty,
      aleatoricUncertainty,
      confidenceScore,
      verdict,
      isAllowed: !isExceeded,
      certificateDigest
    };
  }

  /**
   * Formatea un resumen visual y legible de la calibración epistémica.
   */
  formatSummary(cert) {
    return [
      '### 🔬 Certificado de Calibración Epistémica',
      `* **📌 Decisión:** ${cert.title}`,
      `* **📊 Soporte Empírico:** ${(cert.evidenceScore * 100).toFixed(1)}%`,
      `* **🌪️ Entropía de Alternativas:** ${cert.entropyScore.toFixed(2)}`,
      `* **⚠️ Incertidumbre Epistémica:** ${cert.epistemicUncertainty} (Umbral: ${this.criticalThreshold})`,
      `* **🎯 Confianza Calibrada:** ${(cert.confidenceScore * 100).toFixed(1)}%`,
      `* **🧭 Veredicto:** \`${cert.verdict}\``,
      `* **🔐 Digest SHA-256:** \`${cert.certificateDigest.slice(0, 16)}...\``
    ].join('\n');
  }
}

if (require.main === module) {
  const quantifier = new EpistemicUncertaintyQuantifier();

  console.log('[Epistemic Uncertainty Quantifier] Evaluando caso con evidencia sólida:\n');
  const calibrated = quantifier.quantify({
    title: 'Migración a arquitectura de búfer circular',
    empiricalEvidence: [
      { type: 'TEST_PASS', weight: 0.5 },
      { type: 'HASH_MATCH', weight: 0.4 },
      { type: 'BENCHMARK', weight: 0.2 }
    ],
    competingHypothesesCount: 1,
    environmentalVolatility: 0.05
  });
  console.log(quantifier.formatSummary(calibrated));

  console.log('\n[Epistemic Uncertainty Quantifier] Evaluando caso con déficit de evidencia:\n');
  const halted = quantifier.quantify({
    title: 'Refactorización masiva no verificada sin tests',
    empiricalEvidence: [],
    competingHypothesesCount: 3,
    environmentalVolatility: 0.4
  });
  console.log(quantifier.formatSummary(halted));
}

module.exports = EpistemicUncertaintyQuantifier;
