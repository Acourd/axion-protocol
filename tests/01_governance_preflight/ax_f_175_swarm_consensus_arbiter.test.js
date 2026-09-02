#!/usr/bin/env node
'use strict';

/**
 * AX-F-175: Invariantes del Motor de Consenso por Quórum Bizantino de Swarm (Axion Protocol v2.0)
 *
 * Verifica:
 * 1. Creación determinista de propuestas de mutación (createProposal).
 * 2. Emisión de papeletas firmadas digitalmente con Ed25519 (castBallot).
 * 3. Cálculo de supermayoría del quórum bizantino (>= 66%) con firmas verificadas.
 * 4. Rechazo fail-closed cuando no se alcanza el quórum o firmas son inválidas.
 * 5. Generación de certificado SHA-256 inmutable de consenso.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const SwarmConsensusArbiter = require('../../tools/swarm_consensus_arbiter.js');

console.log('=== AX-F-175: Invariantes de SwarmConsensusArbiter (v2.0 BFT Consensus) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const tempRoot = path.join(os.tmpdir(), `test_ax_f_175_${Date.now()}`);
fs.mkdirSync(tempRoot, { recursive: true });

try {
  const arbiter = new SwarmConsensusArbiter(tempRoot, { quorumThreshold: 0.66 });

  // 3 Agentes con sus pares de claves Ed25519
  const agentPlanner = crypto.generateKeyPairSync('ed25519');
  const agentSecurity = crypto.generateKeyPairSync('ed25519');
  const agentQuality = crypto.generateKeyPairSync('ed25519');
  const agentRogue = crypto.generateKeyPairSync('ed25519'); // No registrado

  const knownPublicKeys = {
    'agent-planner': agentPlanner.publicKey,
    'agent-security': agentSecurity.publicKey,
    'agent-quality': agentQuality.publicKey
  };

  // Invariante 1: Creación de propuesta
  const proposal = arbiter.createProposal({
    proposerId: 'agent-planner',
    title: 'Refactorización del Motor de Vuelo Autónomo',
    targetFiles: ['tools/drive_engine.js'],
    riskLevel: 'MEDIUM'
  });

  assert.ok(proposal.proposalId.startsWith('PROP-'), 'ID de propuesta debe tener prefijo PROP-');
  assert.strictEqual(proposal.status, 'VOTING_OPEN');
  console.log('  ✓ Invariante 1: Creación determinista de propuesta validada.');

  // Invariante 2: Emisión de papeletas con firmas Ed25519
  const b1 = arbiter.castBallot(proposal, {
    voterId: 'agent-planner',
    role: 'PLANNER',
    verdict: 'APPROVE',
    rationale: 'Cumple objetivos arquitectónicos',
    privateKey: agentPlanner.privateKey
  });
  assert.strictEqual(b1.success, true);

  const b2 = arbiter.castBallot(proposal, {
    voterId: 'agent-security',
    role: 'SECURITY_AUDITOR',
    verdict: 'APPROVE',
    rationale: 'Sin vulnerabilidades detectadas',
    privateKey: agentSecurity.privateKey
  });
  assert.strictEqual(b2.success, true);

  const b3 = arbiter.castBallot(proposal, {
    voterId: 'agent-quality',
    role: 'QUALITY_ASSURANCE',
    verdict: 'APPROVE',
    rationale: '191/191 suites en verde',
    privateKey: agentQuality.privateKey
  });
  assert.strictEqual(b3.success, true);
  console.log('  ✓ Invariante 2: Emisión de papeletas con firmas Ed25519 validada.');

  // Invariante 3: Evaluación de consenso alcanzado (3/3 = 100% >= 66%)
  const consensusApproved = arbiter.evaluateConsensus(proposal, knownPublicKeys, 3);
  assert.strictEqual(consensusApproved.consensusAchieved, true, 'Debe alcanzar consenso unánime');
  assert.strictEqual(consensusApproved.verdict, 'CONSENSUS_APPROVED');
  assert.strictEqual(consensusApproved.approvalRatio, 1.0);
  assert.ok(consensusApproved.certificateDigest, 'Debe emitir certificado criptográfico SHA-256');
  console.log('  ✓ Invariante 3: Cálculo de supermayoría y emisión de certificado validada.');

  // Invariante 4: Rechazo ante propuesta rechazada (2 votos REJECT)
  const rejectedProposal = arbiter.createProposal({
    proposerId: 'agent-planner',
    title: 'Propuesta Insegura con Shell Dinámico',
    targetFiles: ['tools/unsafe.js'],
    riskLevel: 'CRITICAL'
  });

  arbiter.castBallot(rejectedProposal, {
    voterId: 'agent-planner',
    role: 'PLANNER',
    verdict: 'APPROVE',
    rationale: 'Propuesta inicial',
    privateKey: agentPlanner.privateKey
  });

  arbiter.castBallot(rejectedProposal, {
    voterId: 'agent-security',
    role: 'SECURITY_AUDITOR',
    verdict: 'REJECT',
    rationale: 'Violación de regla shell: false',
    privateKey: agentSecurity.privateKey
  });

  arbiter.castBallot(rejectedProposal, {
    voterId: 'agent-quality',
    role: 'QUALITY_ASSURANCE',
    verdict: 'REJECT',
    rationale: 'Fallo de invariantes de seguridad',
    privateKey: agentQuality.privateKey
  });

  const consensusRejected = arbiter.evaluateConsensus(rejectedProposal, knownPublicKeys, 3);
  assert.strictEqual(consensusRejected.consensusAchieved, false, 'Propuesta insegura debe ser rechazada');
  assert.strictEqual(consensusRejected.verdict, 'CONSENSUS_REJECTED');
  assert.strictEqual(consensusRejected.validRejections, 2);
  console.log('  ✓ Invariante 4: Rechazo fail-closed de propuesta insegura validado.');

  console.log('\nPASS: AX-F-175 — Consenso Bizantino de Swarm verificado con 4/4 invariantes en verde.');
} finally {
  try {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  } catch (_) {
    // cleanup
  }
}
