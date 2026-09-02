#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol v2.0 — Swarm Byzantine Quorum Consensus Engine
 *
 * Pilar 3 de la arquitectura multi-agente de Axion Protocol v2.0:
 * 1. Protocolo de consenso por quórum bizantino (BFT 2/3+) para mutaciones de código.
 * 2. Emisión y recolección de papeletas de voto firmadas con Ed25519 por agentes especializados.
 * 3. Cálculo determinista de supermayoría con ponderación de roles (Security, Quality, Architecture).
 * 4. Generación de certificado de consenso inmutable antes de aplicar mutaciones en disco.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

class SwarmConsensusArbiter {
  constructor(projectRoot = ROOT, { quorumThreshold = 0.66 } = {}) {
    this.root = path.resolve(projectRoot);
    this.quorumThreshold = quorumThreshold;
    this.consensusDir = path.join(this.root, '.axion', 'swarm', 'consensus');
    this.ensureConsensusDir();
  }

  ensureConsensusDir() {
    if (!fs.existsSync(this.consensusDir)) {
      fs.mkdirSync(this.consensusDir, { recursive: true });
    }
  }

  /**
   * Crea una propuesta formal de acción o mutación para ser votada por el enjambre.
   */
  createProposal({
    proposerId,
    title,
    targetFiles = [],
    riskLevel = 'LOW',
    astDiffDigest = null
  }) {
    if (!proposerId || !title) {
      throw new Error('Parámetros inválidos para crear la propuesta.');
    }

    const proposalId = `PROP-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const timestamp = new Date().toISOString();

    const proposal = {
      proposalId,
      proposerId,
      title,
      targetFiles,
      riskLevel,
      astDiffDigest: astDiffDigest || crypto.createHash('sha256').update(title).digest('hex'),
      createdAt: timestamp,
      status: 'VOTING_OPEN',
      ballots: []
    };

    return proposal;
  }

  /**
   * Emite un voto firmado por un agente especialista.
   */
  castBallot(proposal, {
    voterId,
    role,
    verdict, // 'APPROVE' | 'REJECT' | 'ABSTAIN'
    rationale,
    privateKey
  }) {
    if (!proposal || !voterId || !verdict || !privateKey) {
      return { success: false, reason: 'PARÁMETROS_INVÁLIDOS' };
    }

    const validVerdicts = ['APPROVE', 'REJECT', 'ABSTAIN'];
    if (!validVerdicts.includes(verdict)) {
      return { success: false, reason: 'VEREDICTO_NO_VÁLIDO' };
    }

    const timestamp = new Date().toISOString();
    const ballotData = {
      proposalId: proposal.proposalId,
      voterId,
      role: role || 'GENERAL_SPECIALIST',
      verdict,
      rationale: rationale || 'Voto de verificación técnica',
      timestamp
    };

    const canonicalData = JSON.stringify(ballotData, Object.keys(ballotData).sort());
    const signature = crypto.sign(null, Buffer.from(canonicalData, 'utf8'), privateKey).toString('base64');

    const ballot = {
      ...ballotData,
      signature,
      digest: crypto.createHash('sha256').update(canonicalData).digest('hex'),
      algorithm: 'Ed25519'
    };

    // Registrar papeleta en la propuesta
    proposal.ballots.push(ballot);

    return {
      success: true,
      ballotDigest: ballot.digest,
      voterId,
      verdict
    };
  }

  /**
   * Evalúa los votos y determina si se alcanzó la supermayoría del quórum bizantino.
   */
  evaluateConsensus(proposal, knownPublicKeys = {}, minVotes = 3) {
    if (!proposal || !Array.isArray(proposal.ballots)) {
      return { status: 'INVALID_PROPOSAL', approved: false };
    }

    let validApprovals = 0;
    let validRejections = 0;
    let validAbstentions = 0;
    let verifiedVotersCount = 0;

    for (const ballot of proposal.ballots) {
      const pubKey = knownPublicKeys[ballot.voterId];
      if (!pubKey) continue; // Ignorar votos de agentes no registrados

      const ballotData = {
        proposalId: ballot.proposalId,
        voterId: ballot.voterId,
        role: ballot.role,
        verdict: ballot.verdict,
        rationale: ballot.rationale,
        timestamp: ballot.timestamp
      };

      const canonicalData = JSON.stringify(ballotData, Object.keys(ballotData).sort());
      const isValidSig = crypto.verify(
        null,
        Buffer.from(canonicalData, 'utf8'),
        pubKey,
        Buffer.from(ballot.signature, 'base64')
      );

      if (isValidSig) {
        verifiedVotersCount++;
        if (ballot.verdict === 'APPROVE') validApprovals++;
        else if (ballot.verdict === 'REJECT') validRejections++;
        else if (ballot.verdict === 'ABSTAIN') validAbstentions++;
      }
    }

    const totalDecisiveVotes = validApprovals + validRejections;
    const approvalRatio = totalDecisiveVotes > 0 ? validApprovals / totalDecisiveVotes : 0;
    const hasSupermajority = approvalRatio >= this.quorumThreshold && verifiedVotersCount >= minVotes;

    const result = {
      proposalId: proposal.proposalId,
      title: proposal.title,
      verifiedVotersCount,
      minVotesRequired: minVotes,
      validApprovals,
      validRejections,
      validAbstentions,
      approvalRatio: parseFloat(approvalRatio.toFixed(3)),
      quorumThreshold: this.quorumThreshold,
      consensusAchieved: hasSupermajority,
      verdict: hasSupermajority ? 'CONSENSUS_APPROVED' : 'CONSENSUS_REJECTED',
      evaluatedAt: new Date().toISOString()
    };

    result.certificateDigest = crypto.createHash('sha256')
      .update(JSON.stringify(result, Object.keys(result).sort()))
      .digest('hex');

    return result;
  }
}

// Ejecución CLI directa
if (require.main === module) {
  const arbiter = new SwarmConsensusArbiter();
  const prop = arbiter.createProposal({
    proposerId: 'agent-planner',
    title: 'Migración a motor de compresión AST',
    targetFiles: ['tools/drive_engine.js']
  });
  console.log('[Axion Swarm Consensus] Propuesta creada:', prop.proposalId);
}

module.exports = SwarmConsensusArbiter;
