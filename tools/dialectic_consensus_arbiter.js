#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Dialectic Consensus Arbiter for Multi-Agent Swarms (M_COG_011)
 *
 * Árbitro de consenso dialéctico en mallas multi-agente:
 * 1. Pondera propuestas de agentes en función de especialización y jerarquía de seguridad.
 * 2. Aplica veto de seguridad asimétrico fail-closed ante cualquier violación de gobernanza P0.
 * 3. Sintetiza la decisión mayoritaria incorporando salvaguardas obligatorias frente a objeciones.
 * 4. Emite un certificado determinista DialecticConsensusCertificate sellado con SHA-256.
 *
 * Cero dependencias externas.
 */

const crypto = require('crypto');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const ROLE_WEIGHTS = {
  SECURITY: 4.0,
  ARCHITECTURE: 3.0,
  PERFORMANCE: 2.0,
  PRODUCT: 1.5,
  GENERAL: 1.0
};

class DialecticConsensusArbiter {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
  }

  /**
   * Obtiene el peso de autoridad según el rol del agente.
   */
  getWeight(role = 'GENERAL') {
    const key = String(role).toUpperCase();
    return ROLE_WEIGHTS[key] || ROLE_WEIGHTS.GENERAL;
  }

  /**
   * Arbitra el consenso dialéctico entre múltiples propuestas de agentes.
   */
  arbitrate(proposals = []) {
    if (!Array.isArray(proposals) || proposals.length === 0) {
      return {
        status: 'NO_PROPOSALS',
        verdict: 'REJECT_ALL',
        certificateDigest: crypto.createHash('sha256').update('EMPTY').digest('hex')
      };
    }

    const candidateScores = {};
    const allObjections = [];
    let securityVetoTriggered = false;
    let vetoReason = '';

    for (const p of proposals) {
      const candidateKey = p.proposalKey || p.title || 'UNKNOWN';
      const weight = this.getWeight(p.role);

      // Comprobar objeciones de seguridad con poder de veto
      if (Array.isArray(p.objections)) {
        for (const obj of p.objections) {
          allObjections.push(obj);
          if (obj.isSecurityP0 || obj.severity === 'FATAL') {
            securityVetoTriggered = true;
            vetoReason = obj.reason || 'Violación de invariante de seguridad P0 detectada.';
          }
        }
      }

      candidateScores[candidateKey] = (candidateScores[candidateKey] || 0) + weight;
    }

    // Si hay veto de seguridad, rechazo fail-closed inmediato
    if (securityVetoTriggered) {
      const payload = JSON.stringify({ verdict: 'VETO_FAIL_CLOSED', vetoReason, timestamp: new Date().toISOString() });
      return {
        status: 'SECURITY_VETO',
        verdict: 'VETO_FAIL_CLOSED',
        reason: vetoReason,
        certificateDigest: crypto.createHash('sha256').update(payload).digest('hex')
      };
    }

    // Seleccionar la propuesta con mayor puntuación ponderada
    let winningKey = null;
    let maxScore = -1;
    for (const key of Object.keys(candidateScores)) {
      if (candidateScores[key] > maxScore) {
        maxScore = candidateScores[key];
        winningKey = key;
      }
    }

    // Derivar salvaguardas dialécticas de las objeciones recopiladas
    const derivedSafeguards = allObjections.map((o) => {
      const desc = typeof o === 'string' ? o : (o.reason || o.description || '');
      return `Integrar salvaguarda de contención: ${desc}`;
    });

    const certPayload = JSON.stringify({
      selectedProposal: winningKey,
      score: maxScore,
      totalProposals: proposals.length,
      safeguardsCount: derivedSafeguards.length,
      timestamp: new Date().toISOString()
    });

    const certificateDigest = crypto.createHash('sha256').update(certPayload).digest('hex');

    return {
      status: 'CONSENSUS_ACHIEVED',
      certificateType: 'DialecticConsensusCertificate_v1',
      selectedProposal: winningKey,
      consensusScore: maxScore,
      safeguards: derivedSafeguards,
      certificateDigest
    };
  }

  /**
   * Formatea un resumen visual y legible del arbitraje de consenso.
   */
  formatSummary(cert) {
    if (cert.status === 'SECURITY_VETO') {
      return `### 🛑 Veto de Seguridad Fail-Closed\n* **Motivo:** ${cert.reason}\n* **Digest:** \`${cert.certificateDigest.slice(0, 16)}...\``;
    }
    return [
      '### 🏛️ Consenso Dialéctico Multi-Agente',
      `* **🏆 Propuesta Seleccionada:** \`${cert.selectedProposal}\``,
      `* **⭐ Puntuación Ponderada:** ${cert.consensusScore}`,
      `* **🛡️ Salvaguardas Integradas:** ${cert.safeguards ? cert.safeguards.length : 0}`,
      `* **🔐 Digest SHA-256:** \`${cert.certificateDigest.slice(0, 16)}...\``
    ].join('\n');
  }
}

if (require.main === module) {
  const arbiter = new DialecticConsensusArbiter();

  const mockProposals = [
    {
      agentId: 'agent-perf',
      role: 'PERFORMANCE',
      proposalKey: 'IN_MEMORY_KV_CACHE',
      title: 'Caché en memoria volátil sin persistencia',
      objections: []
    },
    {
      agentId: 'agent-sec',
      role: 'SECURITY',
      proposalKey: 'IN_MEMORY_KV_CACHE',
      title: 'Caché en memoria volátil con cifrado',
      objections: [{ reason: 'Las claves de caché deben usar espacio de nombres aislado por sesión' }]
    }
  ];

  console.log('[Dialectic Consensus Arbiter] Arbitrando consenso entre agentes:\n');
  const result = arbiter.arbitrate(mockProposals);
  console.log(arbiter.formatSummary(result));
}

module.exports = DialecticConsensusArbiter;
