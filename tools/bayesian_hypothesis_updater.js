#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Bayesian Hypothesis Updater & Belief Convergence Engine (M_COG_018)
 *
 * Actualizador bayesiano de creencias e hipótesis en tiempo real:
 * 1. Mantiene una distribución de probabilidad normalizada sobre hipótesis diagnósticas o alternativas de diseño.
 * 2. Aplica el Teorema de Bayes iterativamente ante nueva evidencia empírica mitigando el sesgo de confirmación.
 * 3. Evalúa la entropía de Shannon H(P) para cuantificar la incertidumbre restante de la distribución.
 * 4. Detecta convergencia epistémica (P >= 0.80) emitiendo BayesianBeliefCertificate sellado con SHA-256.
 *
 * Cero dependencias externas.
 */

const crypto = require('crypto');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

class BayesianHypothesisUpdater {
  constructor(options = {}) {
    this.root = path.resolve(options.projectRoot || ROOT);
    this.convergenceThreshold = Math.max(0.5, Math.min(options.convergenceThreshold || 0.80, 0.99));
    this.hypotheses = new Map();
    this.history = [];

    if (Array.isArray(options.initialHypotheses)) {
      this.initHypotheses(options.initialHypotheses);
    }
  }

  /**
   * Inicializa y normaliza las probabilidades a priori aplicando la regla de Cromwell.
   */
  initHypotheses(list = []) {
    this.hypotheses.clear();
    const count = list.length;
    if (count === 0) return;

    let rawSum = 0;
    const items = list.map((item) => {
      const id = String(item.id || 'hyp');
      const title = String(item.title || id);
      const prior = typeof item.prior === 'number' ? item.prior : (1.0 / count);
      // Regla de Cromwell: acotar entre [0.01, 0.99]
      const boundedPrior = Math.max(0.01, Math.min(prior, 0.99));
      rawSum += boundedPrior;
      return { id, title, boundedPrior };
    });

    for (const it of items) {
      const normalized = it.boundedPrior / rawSum;
      this.hypotheses.set(it.id, {
        id: it.id,
        title: it.title,
        probability: Number(normalized.toFixed(4))
      });
    }
  }

  /**
   * Calcula la entropía de Shannon H(P) de la distribución actual en bits.
   */
  computeShannonEntropy() {
    let entropy = 0;
    const eps = 1e-9;
    for (const h of this.hypotheses.values()) {
      const p = Math.max(h.probability, eps);
      entropy -= p * Math.log2(p);
    }
    return Number(Math.max(0, entropy).toFixed(3));
  }

  /**
   * Actualiza las probabilidades a posteriori mediante la regla de Bayes dado un vector de verosimilitudes.
   */
  update(evidence = {}) {
    const evidenceTitle = String(evidence.title || 'Evidencia empírica').trim();
    const likelihoods = evidence.likelihoods || {};

    if (this.hypotheses.size === 0) {
      return {
        status: 'NO_HYPOTHESES',
        hasConverged: false,
        leadingHypothesis: null,
        certificateDigest: '0'.repeat(64)
      };
    }

    // 1. Calcular productos no normalizados: P(E|H) * P(H)
    let totalUnnormalized = 0;
    const unnormalized = new Map();

    for (const [id, hyp] of this.hypotheses.entries()) {
      const lk = typeof likelihoods[id] === 'number'
        ? Math.max(0.01, Math.min(likelihoods[id], 0.99))
        : 0.50; // Neutral por defecto
      const prod = lk * hyp.probability;
      unnormalized.set(id, prod);
      totalUnnormalized += prod;
    }

    // 2. Normalizar y actualizar probabilidades a posteriori
    const safeTotal = totalUnnormalized > 0 ? totalUnnormalized : 1.0;
    let leadingHypothesis = null;
    let maxProb = -1;

    for (const [id, hyp] of this.hypotheses.entries()) {
      const posterior = Number((unnormalized.get(id) / safeTotal).toFixed(4));
      hyp.probability = posterior;
      if (posterior > maxProb) {
        maxProb = posterior;
        leadingHypothesis = hyp;
      }
    }

    const entropyBits = this.computeShannonEntropy();
    const hasConverged = Boolean(leadingHypothesis && leadingHypothesis.probability >= this.convergenceThreshold);
    const status = hasConverged ? 'EPISTEMIC_CONVERGENCE' : 'ACTIVE_EVIDENCE_GATHERING';

    const currentDistribution = {};
    for (const [id, hyp] of this.hypotheses.entries()) {
      currentDistribution[id] = hyp.probability;
    }

    this.history.push({
      evidenceTitle,
      entropyBits,
      leadingId: leadingHypothesis ? leadingHypothesis.id : null,
      leadingProb: leadingHypothesis ? leadingHypothesis.probability : 0
    });

    const payload = JSON.stringify({
      evidenceTitle,
      distribution: currentDistribution,
      entropyBits,
      hasConverged,
      status,
      timestamp: new Date().toISOString()
    });

    const certificateDigest = crypto.createHash('sha256').update(payload).digest('hex');

    return {
      status,
      certificateType: 'BayesianBeliefCertificate_v1',
      hasConverged,
      convergenceThreshold: this.convergenceThreshold,
      leadingHypothesis,
      entropyBits,
      distribution: currentDistribution,
      certificateDigest
    };
  }
}

if (require.main === module) {
  const updater = new BayesianHypothesisUpdater({
    initialHypotheses: [
      { id: 'H1', title: 'Error en driver de base de datos' },
      { id: 'H2', title: 'Timeout por concurrencia multi-proceso' },
      { id: 'H3', title: 'Fuga de memoria en worker threads' }
    ]
  });

  console.log('[Bayesian Hypothesis Updater] Priors iniciales:');
  console.log(updater.update({ title: 'Estado inicial', likelihoods: {} }).distribution);

  console.log('\n[Bayesian Hypothesis Updater] Ingresando evidencia favorable a H2 (timeout de concurrencia):');
  const step1 = updater.update({
    title: 'Error ERR_CHILD_PROCESS_TIMEOUT observado en logs',
    likelihoods: { H1: 0.1, H2: 0.95, H3: 0.2 }
  });
  console.log(step1);
}

module.exports = BayesianHypothesisUpdater;
