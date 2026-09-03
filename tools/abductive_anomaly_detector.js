#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Abductive Anomaly Detector & Root Hypothesis Engine (M_COG_017)
 *
 * Detector abductivo de anomalías e hipótesis de diagnóstico raíz:
 * 1. Implementa inferencia a la mejor explicación (IBE) formalizada por C.S. Peirce.
 * 2. Evalúa cobertura de síntomas empíricos, simplicidad (Navaja de Ockham) y probabilidad a priori.
 * 3. Activa veto fail-closed (INCONCLUSIVE_HYPOTHESIS) si ningún candidato supera el umbral explicativo mínimo.
 * 4. Genera un vector de falsabilidad empírica y emite AbductiveDiagnosisCertificate sellado con SHA-256.
 *
 * Cero dependencias externas.
 */

const crypto = require('crypto');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

class AbductiveAnomalyDetector {
  constructor(options = {}) {
    this.root = path.resolve(options.projectRoot || ROOT);
    this.minExplanatoryThreshold = Math.max(0.2, Math.min(options.minExplanatoryThreshold || 0.40, 0.9));
  }

  /**
   * Ejecuta el diagnóstico abductivo seleccionando la hipótesis con mayor poder explicativo parsimonioso.
   */
  diagnose(anomaly = {}, candidateHypotheses = []) {
    const anomalyTitle = String(anomaly.title || 'Anomalía no especificada').trim();
    const observedSymptoms = Array.isArray(anomaly.symptoms) ? anomaly.symptoms : [];
    const totalSymptoms = Math.max(1, observedSymptoms.length);
    const symptomsSet = new Set(observedSymptoms);

    const candidates = Array.isArray(candidateHypotheses) ? candidateHypotheses : [];

    const scoredHypotheses = candidates.map((hyp) => {
      const id = String(hyp.id || 'hyp_unknown');
      const title = String(hyp.title || 'Hipótesis sin título');
      const explained = Array.isArray(hyp.explainedSymptoms) ? hyp.explainedSymptoms : [];

      let matchedCount = 0;
      for (const s of explained) {
        if (symptomsSet.has(s)) matchedCount++;
      }

      const explanatoryPower = Number((matchedCount / totalSymptoms).toFixed(3));
      const simplicityScore = Number(Math.max(0.0, Math.min(typeof hyp.simplicityScore === 'number' ? hyp.simplicityScore : 0.8, 1.0)).toFixed(3));
      const priorProbability = Number(Math.max(0.0, Math.min(typeof hyp.priorProbability === 'number' ? hyp.priorProbability : 0.5, 1.0)).toFixed(3));

      // Ponderación IBE: 50% poder explicativo, 30% simplicidad de Ockham, 20% prior empírico
      const ibeScore = Number(((explanatoryPower * 0.50) + (simplicityScore * 0.30) + (priorProbability * 0.20)).toFixed(3));
      const falsificationCheck = String(hyp.falsificationCheck || 'Comprobar aserción empírica específica en sandbox').trim();

      return {
        id,
        title,
        matchedCount,
        explanatoryPower,
        simplicityScore,
        priorProbability,
        ibeScore,
        falsificationCheck
      };
    });

    // Ordenar de mayor a menor IBE Score
    scoredHypotheses.sort((a, b) => b.ibeScore - a.ibeScore);

    const bestCandidate = scoredHypotheses.length > 0 ? scoredHypotheses[0] : null;
    const isExplanatorySufficient = bestCandidate && bestCandidate.explanatoryPower >= this.minExplanatoryThreshold;

    const isDecisive = Boolean(isExplanatorySufficient);
    const verdict = isDecisive ? 'BEST_EXPLANATION_CONFIRMED' : 'INCONCLUSIVE_HYPOTHESIS';

    const payload = JSON.stringify({
      anomalyTitle,
      totalSymptoms: observedSymptoms.length,
      candidatesEvaluated: scoredHypotheses.length,
      bestHypothesisId: bestCandidate ? bestCandidate.id : null,
      verdict,
      timestamp: new Date().toISOString()
    });

    const certificateDigest = crypto.createHash('sha256').update(payload).digest('hex');

    return {
      certificateType: 'AbductiveDiagnosisCertificate_v1',
      anomalyTitle,
      totalSymptoms: observedSymptoms.length,
      candidatesEvaluated: scoredHypotheses.length,
      verdict,
      isDecisive,
      bestHypothesis: isDecisive ? bestCandidate : null,
      rankedHypotheses: scoredHypotheses,
      certificateDigest
    };
  }
}

if (require.main === module) {
  const detector = new AbductiveAnomalyDetector();

  const anomaly = {
    title: 'Fallo de timeout intermitente en suites concurrentes bajo Windows',
    symptoms: ['ERR_CHILD_PROCESS_TIMEOUT', 'HIGH_LOCK_CONTENTION', 'MISSING_FILE_HANDLE']
  };

  const candidates = [
    {
      id: 'H1',
      title: 'WaitMsBeforeAsync insuficiente para spawn concurrentes en Windows',
      explainedSymptoms: ['ERR_CHILD_PROCESS_TIMEOUT', 'MISSING_FILE_HANDLE'],
      simplicityScore: 0.9,
      priorProbability: 0.8,
      falsificationCheck: 'Incrementar WaitMsBeforeAsync a 10000ms y verificar si desaparece el timeout'
    },
    {
      id: 'H2',
      title: 'Corrupción en driver de almacenamiento SSD del sistema',
      explainedSymptoms: ['MISSING_FILE_HANDLE'],
      simplicityScore: 0.2,
      priorProbability: 0.05,
      falsificationCheck: 'Ejecutar fsck o chkdsk en unidad del sistema'
    }
  ];

  console.log('[Abductive Anomaly Detector] Diagnosticando anomalía:\n');
  const report = detector.diagnose(anomaly, candidates);
  console.log(`- Veredicto: ${report.verdict}`);
  console.log(`- Hipótesis Ganadora: ${report.bestHypothesis.title}`);
  console.log(`- IBE Score: ${report.bestHypothesis.ibeScore}`);
  console.log(`- Test de Falsabilidad: ${report.bestHypothesis.falsificationCheck}`);
  console.log(`- Digest SHA-256: ${report.certificateDigest.slice(0, 16)}...`);
}

module.exports = AbductiveAnomalyDetector;
