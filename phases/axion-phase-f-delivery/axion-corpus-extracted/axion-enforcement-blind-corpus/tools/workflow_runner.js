#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { analyzeUserIntent } = require('./intent_clarifier.js');
const { hashCanonical } = require('./canonical_json.js');
const { compileRiskPolicy, evaluateRiskRequirements } = require('./risk_policy_compiler.js');
const { verifyAndConsumeApproval, APPROVAL_STATUS } = require('./approval_ed25519.js');
const { verifyIndependentCheck, CHECK_STATUS } = require('./check_ed25519.js');
const { createWorkflowStateMachine } = require('./workflow_state_machine.js');
const { classifyCommand, executeStructuredCommand, COMMAND_DECISION } = require('./structured_command.js');
const { validateRollbackPlan, ROLLBACK_STATUS } = require('./rollback_plan.js');
const { createBoundEvidenceManifest } = require('./evidence_hasher.js');

const POLICY_PATH = path.resolve(__dirname, '..', 'policies', 'risk.yaml');

function blockedState(prefix, status) {
  return status.startsWith('BLOCKED_') ? status : `${prefix}${status}`;
}

function executeHybridWorkflow(taskPayload = {}, runtimeContext = {}) {
  const missionId = taskPayload.missionId || taskPayload.taskId || `AX-TASK-${Date.now()}`;
  const title = taskPayload.title || 'Tarea no nombrada';
  const scope = taskPayload.scope;
  const testAssertions = taskPayload.testAssertions;
  const command = taskPayload.command === undefined
    ? taskPayload.commandToExecute
    : taskPayload.command;
  const machine = createWorkflowStateMachine(missionId);
  const log = [];
  let approvalResult = Object.freeze({ status: APPROVAL_STATUS.APPROVAL_MISSING });
  let checkResult = Object.freeze({ status: CHECK_STATUS.CHECK_MISSING });
  let rollbackResult = Object.freeze({ status: ROLLBACK_STATUS.ROLLBACK_MISSING });

  function block(status, reason, details = {}) {
    let finalStatus = status;
    try { finalStatus = machine.block(status); } catch (_) { /* estado previo ya terminal */ }
    if (reason) log.push(reason);
    return {
      status: finalStatus,
      missionId,
      taskId: missionId,
      workflow: machine.snapshot(),
      approval: approvalResult,
      check: checkResult,
      rollback: rollbackResult,
      log,
      ...details,
    };
  }

  const request = taskPayload.rawUserRequest || title;
  const intent = analyzeUserIntent(request);
  if (intent.status === 'NEEDS_CLARIFICATION') {
    return block('BLOCKED_NEEDS_CLARIFICATION', '[1. ENTENDER] IntenciÃ³n ambigua.', {
      reason: intent.reason,
      questions: intent.questions,
      options: intent.options,
    });
  }
  machine.advance('ENTENDER', 'PASS', hashCanonical(intent.intentContract));
  log.push('[1. ENTENDER] Contrato de entendimiento cristalizado.');

  let policySource;
  let compiledPolicy;
  try {
    policySource = fs.readFileSync(POLICY_PATH, 'utf8');
    compiledPolicy = compileRiskPolicy(policySource);
  } catch (_) {
    return block('BLOCKED_POLICY_UNAVAILABLE', '[2. PLANIFICAR] PolÃ­tica ausente o no compilable.');
  }
  const risk = typeof taskPayload.risk === 'string' ? taskPayload.risk.trim().toUpperCase() : null;
  if (!risk || !compiledPolicy.domain.includes(risk)) {
    return block('BLOCKED_INVALID_RISK', '[2. PLANIFICAR] Riesgo ausente o fuera del dominio normativo.');
  }
  if (!Array.isArray(scope) || scope.length === 0
      || scope.some((entry) => typeof entry !== 'string' || entry.trim() === '')) {
    return block('BLOCKED_SCOPE_REQUIRED', '[2. PLANIFICAR] El alcance exacto es obligatorio.');
  }

  const commandClassification = classifyCommand(command);
  if (commandClassification.decision !== COMMAND_DECISION.ALLOW) {
    const status = commandClassification.decision === COMMAND_DECISION.DENY
      ? 'DENIED_COMMAND'
      : 'NEEDS_HUMAN_REVIEW';
    return block(status, `[2. PLANIFICAR] Comando bloqueado: ${commandClassification.reason}.`, {
      commandClassification,
    });
  }

  const approvalRequired = compiledPolicy.levels[risk].humanGateRequired === true
    || compiledPolicy.levels[risk].humanGateRequired === 'conditional';
  if (approvalRequired) {
    rollbackResult = validateRollbackPlan(taskPayload.rollbackPlan, missionId);
    if (rollbackResult.status !== ROLLBACK_STATUS.ROLLBACK_VALID) {
      return block(`BLOCKED_${rollbackResult.status}`, '[2. PLANIFICAR] Plan de rollback obligatorio no vÃ¡lido.');
    }
  } else if (taskPayload.rollbackPlan !== undefined) {
    rollbackResult = validateRollbackPlan(taskPayload.rollbackPlan, missionId);
    if (rollbackResult.status !== ROLLBACK_STATUS.ROLLBACK_VALID) {
      return block(`BLOCKED_${rollbackResult.status}`, '[2. PLANIFICAR] Plan de rollback suministrado no vÃ¡lido.');
    }
  }

  const requirements = compiledPolicy.levels[risk].requirements;
  const requirementsHash = hashCanonical(requirements);
  const policyHash = crypto.createHash('sha256').update(policySource, 'utf8').digest('hex');
  const rollbackHash = rollbackResult.status === ROLLBACK_STATUS.ROLLBACK_VALID
    ? rollbackResult.rollbackHash
    : hashCanonical(null);
  machine.advance('PLANIFICAR', 'PASS', hashCanonical({ risk, requirementsHash, policyHash, rollbackHash }));
  log.push(`[2. PLANIFICAR] PolÃ­tica compilada para ${risk}; requisitos vinculados.`);

  if (approvalRequired || taskPayload.approvalEnvelope !== undefined) {
    approvalResult = verifyAndConsumeApproval({
      envelope: taskPayload.approvalEnvelope,
      expectedBinding: {
        contractVersion: '1.0.0',
        missionId,
        risk,
        command,
        scope,
        requirementsHash,
        policyHash,
        rollbackHash,
      },
      registryPath: runtimeContext.registryPath,
      consumptionDir: runtimeContext.approvalConsumptionDir,
      now: runtimeContext.now || new Date(),
    });
    if (approvalResult.status !== APPROVAL_STATUS.APPROVAL_VALID) {
      return block(blockedState('BLOCKED_', approvalResult.status), `[3. GATE] ${approvalResult.status}.`);
    }
  } else {
    approvalResult = Object.freeze({
      status: 'APPROVAL_NOT_REQUIRED',
      approvalDigest: hashCanonical({ missionId, approvalRequired: false, risk }),
    });
  }
  machine.advance('GATE', 'PASS', approvalResult.approvalDigest);
  log.push(`[3. GATE] ${approvalResult.status}.`);

  if (!Array.isArray(testAssertions) || testAssertions.length === 0
      || testAssertions.some((assertion) => typeof assertion !== 'string' || assertion.trim() === '')) {
    return block('BLOCKED_NO_CHECKS', '[4. TEST] No hay aserciones ejecutables vÃ¡lidas.');
  }
  const commandHash = hashCanonical(command);
  const assertionsHash = hashCanonical(testAssertions);
  checkResult = verifyIndependentCheck({
    envelope: taskPayload.checkEnvelope,
    expectedBinding: {
      missionId,
      risk,
      commandHash,
      approvalDigest: approvalResult.approvalDigest,
      assertionsHash,
    },
    registryPath: runtimeContext.registryPath,
    executorActorId: runtimeContext.executorActorId,
    now: runtimeContext.now || new Date(),
  });
  if (checkResult.status !== CHECK_STATUS.CHECK_VALID) {
    return block(blockedState('BLOCKED_', checkResult.status), `[4. TEST] ${checkResult.status}.`);
  }

  const satisfiedRequirements = new Set();
  if (approvalResult.status === APPROVAL_STATUS.APPROVAL_VALID) {
    satisfiedRequirements.add('written_human_approval');
  }
  if (rollbackResult.status === ROLLBACK_STATUS.ROLLBACK_VALID) {
    satisfiedRequirements.add('rollback_plan');
  }
  satisfiedRequirements.add('executable_check');
  satisfiedRequirements.add('independent_audit');
  const requirementResult = evaluateRiskRequirements(compiledPolicy, risk, {
    scope,
    satisfiedRequirements,
  });
  if (!requirementResult.satisfied) {
    return block('BLOCKED_RISK_REQUIREMENTS', `[4. TEST] Requisitos normativos ausentes: ${requirementResult.missing.join(', ')}.`, {
      missingRequirements: requirementResult.missing,
    });
  }
  machine.advance('TEST', 'PASS', checkResult.checkDigest);
  log.push('[4. TEST] CHECK firmado, independiente y vinculado validado.');

  const executionResult = executeStructuredCommand(command, { executor: runtimeContext.executor });
  if (executionResult.status !== 'EXECUTION_SUCCEEDED') {
    return block('FAILED_EXECUTION', `[5. CONSTRUIR] EjecuciÃ³n bloqueada o fallida: ${executionResult.status}.`, {
      commandClassification,
      execution: executionResult,
    });
  }
  machine.advance('CONSTRUIR', 'PASS', hashCanonical(executionResult));
  log.push('[5. CONSTRUIR] Comando estructurado ejecutado con shell:false.');

  const approvalBinding = {
    id: approvalResult.approvalId || null,
    keyId: approvalResult.keyId || null,
    digest: approvalResult.approvalDigest,
  };
  const rollbackBinding = {
    id: rollbackResult.planId || null,
    digest: rollbackHash,
  };
  const checkBinding = {
    id: checkResult.checkId,
    keyId: checkResult.keyId,
    digest: checkResult.checkDigest,
    evidenceHash: checkResult.evidenceHash,
  };
  const evidenceManifest = createBoundEvidenceManifest({
    taskId: missionId,
    subject: title,
    files: Array.isArray(taskPayload.modifiedFiles) ? taskPayload.modifiedFiles : [],
    logs: [],
    metadata: {},
    binding: {
      missionId,
      risk,
      command,
      scope,
      approval: approvalBinding,
      rollback: rollbackBinding,
      check: checkBinding,
      status: 'VERIFIED',
      evidence: { digest: checkResult.evidenceHash },
    },
  });
  if (evidenceManifest.status !== 'COMPLETE') {
    return block('BLOCKED_INCOMPLETE_EVIDENCE', '[6. AUDITAR] Evidencia incompleta.', { evidenceManifest });
  }
  machine.advance('AUDITAR', 'PASS', evidenceManifest.hash.toLowerCase());
  log.push('[6. AUDITAR] Evidencia canÃ³nica vinculada a aprobaciÃ³n, rollback, CHECK y estado.');

  machine.advance('PROMOVER', 'PASS', evidenceManifest.binding_hash.toLowerCase());
  log.push('[7. PROMOVER] Workflow verificado sin escribir memoria persistente.');
  return {
    status: 'VERIFIED',
    missionId,
    taskId: missionId,
    risk,
    approval: approvalResult,
    check: checkResult,
    rollback: rollbackResult,
    commandClassification,
    execution: executionResult,
    evidenceManifest,
    workflow: machine.snapshot(),
    log,
  };
}

module.exports = { executeHybridWorkflow, POLICY_PATH };
