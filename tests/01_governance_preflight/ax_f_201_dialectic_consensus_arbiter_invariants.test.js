'use strict';

/**
 * AX-F-201: Invariantes del Árbitro de Consenso Dialéctico en Mallas Multi-Agente (M_COG_011)
 *
 * Valida de forma determinista:
 * 1. Ponderación asimétrica de autoridad según roles agénticos.
 * 2. Veto de seguridad P0 fail-closed absoluto ante objeciones críticas.
 * 3. Incorporación dialéctica obligatoria de salvaguardas en consensos aprobados.
 * 4. Emisión de certificado criptográfico DialecticConsensusCertificate_v1 con SHA-256.
 * 5. Integración transparente con DriveEngine.arbitrateMultiAgentConsensus().
 */

const assert = require('assert');
const path = require('path');
const DialecticConsensusArbiter = require('../../tools/dialectic_consensus_arbiter.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-201 Invariantes del Árbitro de Consenso Dialéctico (M_COG_011) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const arbiter = new DialecticConsensusArbiter(ROOT);

// Invariante 1: Consenso ponderado con integración de salvaguardas
const proposals = [
  {
    agentId: 'agent-arch',
    role: 'ARCHITECTURE',
    proposalKey: 'MERKLE_DAG_PIPELINE',
    objections: []
  },
  {
    agentId: 'agent-perf',
    role: 'PERFORMANCE',
    proposalKey: 'FLAT_STREAM_PIPELINE',
    objections: []
  },
  {
    agentId: 'agent-sec',
    role: 'SECURITY',
    proposalKey: 'MERKLE_DAG_PIPELINE',
    objections: [{ reason: 'Exigir verificación de digest en cada rama del DAG' }]
  }
];

const cert = arbiter.arbitrate(proposals);
assert.strictEqual(cert.status, 'CONSENSUS_ACHIEVED');
assert.strictEqual(cert.selectedProposal, 'MERKLE_DAG_PIPELINE');
assert.strictEqual(cert.consensusScore, 7.0); // ARCH (3) + SEC (4) = 7
assert.strictEqual(cert.safeguards.length, 1);
assert.ok(cert.certificateDigest && cert.certificateDigest.length === 64);
console.log(`✓ Invariante 1: Consenso ponderado alcanzado (${cert.selectedProposal}, Score: ${cert.consensusScore}, Salvaguardas: ${cert.safeguards.length})`);

// Invariante 2: Veto de seguridad fail-closed absoluto
const vetoProposals = [
  {
    agentId: 'agent-perf-1',
    role: 'PERFORMANCE',
    proposalKey: 'BYPASS_PREFLIGHT',
    objections: []
  },
  {
    agentId: 'agent-sec',
    role: 'SECURITY',
    proposalKey: 'BLOCK',
    objections: [{ isSecurityP0: true, reason: 'Prohibido saltarse preflight: viola regla P0 de gobernanza' }]
  }
];

const vetoCert = arbiter.arbitrate(vetoProposals);
assert.strictEqual(vetoCert.status, 'SECURITY_VETO');
assert.strictEqual(vetoCert.verdict, 'VETO_FAIL_CLOSED');
console.log('✓ Invariante 2: Veto de seguridad P0 fail-closed inmediato demostrado');

// Invariante 3: Manejo determinista sin propuestas
const emptyCert = arbiter.arbitrate([]);
assert.strictEqual(emptyCert.status, 'NO_PROPOSALS');
console.log('✓ Invariante 3: Rechazo fail-closed de payloads vacíos validado');

// Invariante 4: Integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const driveCert = driveEngine.arbitrateMultiAgentConsensus(proposals);
assert.strictEqual(driveCert.status, 'CONSENSUS_ACHIEVED');
assert.strictEqual(driveCert.selectedProposal, 'MERKLE_DAG_PIPELINE');
console.log('✓ Invariante 4: Integración nativa con DriveEngine.arbitrateMultiAgentConsensus() verificada');

console.log('\nPASS AX-F-201 — Invariantes del árbitro de consenso dialéctico demostrados al 100%.');
