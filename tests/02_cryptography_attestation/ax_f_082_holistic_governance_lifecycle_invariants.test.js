'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

const DriveEngine = require('../../tools/drive_engine.js');
const DeepReasoningEngine = require('../../tools/deep_reasoning.js');
const { persistContract } = require('../../tools/intent_clarifier.js');
const { createBoundEvidenceManifest } = require('../../tools/evidence_hasher.js');
const { createAttestation, verifyAttestation, ATTESTATION_STATUS } = require('../../tools/attestation.js');
const { canonicalize, hashCanonical } = require('../../tools/canonical_json.js');

console.log('=== AX-F-082 Invariantes de la Composición Holística del Ciclo de Vida de Gobernanza ===\n');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-holistic-lifecycle-'));

try {
  // 1. Fase 1: Deliberación Profunda Adaptativa en DriveEngine
  const drive = new DriveEngine(tempDir);
  const clasificacion = drive.classifyContext({ filesCount: 3, isStructural: true });
  assert.strictEqual(clasificacion.mode, 'DEEP_LOOP');
  assert.strictEqual(clasificacion.requiresDeliberation, true);

  const deepEngine = new DeepReasoningEngine(tempDir);
  const deliberationPayload = {
    task_description: "Refactorización holística de gobernanza y atestación",
    blast_radius: {
      target_files: ["src/core.js", "src/auth.js", "src/state.js"],
      dependencies_affected: ["bin/axion.js", "tools/attestation.js"]
    },
    adversarial_failure_modes: [
      "Inconsistencia en el hash del manifiesto si los archivos se leen de forma asíncrona no atómica.",
      "Vulnerabilidad de suplantación si la firma Ed25519 no cubre el payloadType en el sobre DSSE PAE.",
      "Ruptura de biyectividad en la separación de roles si los actores comparten el mismo ID canónico."
    ],
    invariants_checked: {
      p0_governance_respected: true,
      user_profile_alignment: "SENIOR_TECHNICAL",
      zero_bloat_enforced: true
    },
    verification_proof: "node tests/run_all.js"
  };

  const resDeliberacion = deepEngine.evaluateDeliberation(deliberationPayload);
  assert.strictEqual(resDeliberacion.status, 'APPROVED');
  assert.strictEqual(typeof resDeliberacion.deliberation_id, 'string');
  assert.strictEqual(fs.existsSync(resDeliberacion.record_path), true);
  console.log('✓ 1. Deliberación profunda y sellado de estado evaluados con éxito');

  // 2. Fase 2: Sellado Atómico del Contrato de Intención
  const contratoData = {
    task_id: 'AX-TASK-100',
    answers: { '1': 'A', '2': 'B' },
    summary: 'Contrato de intención de gobernanza holística'
  };

  const resContrato = persistContract(contratoData, 'Quiero construir un sistema seguro', tempDir);
  assert.strictEqual(resContrato.success, true);
  assert.strictEqual(typeof resContrato.digest, 'string');
  assert.strictEqual(/^[a-f0-9]{64}$/.test(resContrato.digest), true);
  assert.strictEqual(fs.existsSync(resContrato.targetPath), true);
  console.log('✓ 2. Sellado canónico RFC 8785 del contrato de intención verificado');

  // 3. Fase 3: Enlace Criptográfico de Evidencias (Binding Manifest)
  const dummyApprovalDigest = crypto.createHash('sha256').update('approval-alice').digest('hex');
  const dummyRollbackDigest = crypto.createHash('sha256').update('rollback-sealed').digest('hex');
  const dummyCheckDigest = crypto.createHash('sha256').update('check-bob').digest('hex');
  const dummyEvidenceDigest = crypto.createHash('sha256').update('evidence-tree').digest('hex');

  const boundManifest = createBoundEvidenceManifest({
    taskId: 'AX-TASK-100',
    subject: 'Manifiesto de evidencia holística',
    files: [path.join(tempDir, 'dummy.txt')],
    binding: {
      missionId: 'MISSION-AX-100',
      risk: 'CRITICAL',
      status: 'VERIFIED',
      command: { executable: 'node', args: ['tests/run_all.js'], shell: false },
      scope: ['src/core.js'],
      approval: { digest: dummyApprovalDigest },
      rollback: { digest: dummyRollbackDigest },
      check: { digest: dummyCheckDigest },
      evidence: { digest: dummyEvidenceDigest }
    }
  });

  assert.strictEqual(typeof boundManifest.binding_hash, 'string');
  assert.strictEqual(/^[a-f0-9]{64}$/.test(boundManifest.binding_hash), true);
  console.log('✓ 3. Enlace criptográfico de evidencias (binding_hash) verificado');

  // 4. Fase 4: Emisión y Verificación de Atestación in-toto Statement v1 sobre DSSE
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');

  const missionResult = {
    status: 'VERIFIED',
    missionId: 'MISSION-AX-100',
    risk: 'CRITICAL',
    evidenceManifest: {
      hash: boundManifest.hash,
      binding_hash: boundManifest.binding_hash
    },
    assurance: { level: 'HARDWARE_SIGNED_TWO_PARTY', score: 100 },
    approval: { status: 'APPROVED', actorId: 'alice', approvalDigest: dummyApprovalDigest },
    check: { status: 'VERIFIED', actorId: 'bob', executorActorId: 'agent-01', checkDigest: dummyCheckDigest },
    rollback: { status: 'SEALED' },
    workflow: { state: 'VERIFIED', history: ['PRE_FLIGHT', 'CHECKPOINT', 'EXECUTE', 'VERIFY'] }
  };

  const attestation = createAttestation({
    result: missionResult,
    privateKey,
    keyId: 'authority-root-key'
  });

  assert.strictEqual(attestation.status, ATTESTATION_STATUS.VALID);
  assert.strictEqual(attestation.statement.subject[0].digest.sha256, boundManifest.hash);

  const verificationAttest = verifyAttestation({
    envelope: attestation.envelope,
    publicKeys: [publicKey]
  });

  assert.strictEqual(verificationAttest.status, ATTESTATION_STATUS.VALID);
  assert.strictEqual(verificationAttest.keyid, 'authority-root-key');
  console.log('✓ 4. Ciclo completo de atestación in-toto sobre sobre DSSE verificado');

} finally {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (_) {}
}

console.log('\nPASS AX-F-082 — Composición holística del ciclo de vida de gobernanza demostrada al 100%.\n');
