#!/usr/bin/env node

/**
 * Axion Protocol - Unified Hybrid Workflow Runner
 * 
 * Orquesta el ciclo híbrido de 7 pasos:
 * [1. ENTENDER] -> [2. PLANIFICAR/RIESGO] -> [3. GATE] -> [4. TEST/TDD] -> [5. CONSTRUIR/PREFLIGHT] -> [6. AUDITAR/SHA256] -> [7. PROMOVER]
 */

const { runPreflight } = require('./preflight.js');
const { createEvidenceManifest } = require('./evidence_hasher.js');
const { analyzeUserIntent } = require('./intent_clarifier.js');
const { captureHumanFeedback } = require('./learning_engine.js');

// Dominio normativo de policies/risk.yaml. Fuera de él se falla cerrado.
const RISK_DOMAIN = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const RISK_REQUIRING_GATE = ['HIGH', 'CRITICAL'];

function executeHybridWorkflow(taskPayload) {
  const {
    taskId = `AX-TASK-${Date.now()}`,
    title = 'Tarea no nombrada',
    rawUserRequest = '',
    humanFeedback = '',
    scope = [],
    risk = null,
    humanApproval = false,
    testAssertions = [],
    checkResults = null,
    commandToExecute = '',
    modifiedFiles = []
  } = taskPayload;

  const executionLog = [];
  const checkPassed = (r) => r === true || (r !== null && typeof r === 'object' && r.passed === true);

  // Paso 1: ENTENDER (con Aclarador de Intención e Ideas)
  const userRequestToEvaluate = rawUserRequest || title;
  const intentResult = analyzeUserIntent(userRequestToEvaluate);

  if (intentResult.status === 'NEEDS_CLARIFICATION') {
    executionLog.push(`[1. ENTENDER] ACLARACIÓN REQUERIDA. La intención "${userRequestToEvaluate}" es ambigua.`);
    return {
      status: 'BLOCKED_NEEDS_CLARIFICATION',
      taskId,
      reason: intentResult.reason,
      questions: intentResult.questions,
      options: intentResult.options,
      log: executionLog
    };
  }

  executionLog.push(`[1. ENTENDER] Intención cristalizada en Contrato de Entendimiento: "${intentResult.intentContract.summary}". Alcance: ${scope.join(', ')}`);

  // Paso 2: Planificar y Evaluar Riesgo.
  // El nivel de riesgo es obligatorio y debe pertenecer al dominio de policies/risk.yaml.
  // Ante identidad ambigua se falla cerrado (policies/authority.yaml).
  const normalizedRisk = typeof risk === 'string' ? risk.trim().toUpperCase() : null;
  if (!normalizedRisk || !RISK_DOMAIN.includes(normalizedRisk)) {
    executionLog.push(`[2. PLANIFICAR] BLOQUEADO. Nivel de riesgo ausente o fuera del dominio ${RISK_DOMAIN.join('/')}: ${JSON.stringify(risk)}.`);
    return {
      status: 'BLOCKED_INVALID_RISK',
      taskId,
      risk,
      log: executionLog
    };
  }
  executionLog.push(`[2. PLANIFICAR] Nivel de riesgo asignado: ${normalizedRisk}. Recomendación por contexto: Opción A recomendada para mantener el proyecto ligero y de cero mantenimiento.`);

  // Paso 3: Gate de Aprobación Humana
  if (RISK_REQUIRING_GATE.includes(normalizedRisk) && !humanApproval) {
    executionLog.push(`[3. GATE] BLOQUEADO. El riesgo ${normalizedRisk} requiere autorización explícita de Human Authority.`);
    return {
      status: 'BLOCKED_GATE_REQUIRED',
      taskId,
      risk: normalizedRisk,
      log: executionLog
    };
  }
  executionLog.push(`[3. GATE] Aprobación confirmada o no requerida para riesgo ${normalizedRisk}.`);

  // Paso 4: Test (TDD Previo). Sin CHECK no se avanza (AGENTS.md §Blindaje 4).
  if (testAssertions.length === 0) {
    executionLog.push(`[4. TEST] BLOQUEADO. No se definieron aserciones de prueba previas.`);
    return {
      status: 'BLOCKED_NO_CHECKS',
      taskId,
      log: executionLog
    };
  }

  const executedChecks = Array.isArray(checkResults) ? checkResults : [];
  const allChecksExecuted = executedChecks.length === testAssertions.length;
  const allChecksPassed = allChecksExecuted && executedChecks.every(checkPassed);

  if (allChecksExecuted && !allChecksPassed) {
    executionLog.push(`[4. TEST] FALLO. Al menos una de las ${testAssertions.length} comprobación(es) no superó su CHECK.`);
    return {
      status: 'FAILED_CHECKS',
      taskId,
      log: executionLog
    };
  }
  executionLog.push(allChecksPassed
    ? `[4. TEST] ${executedChecks.length} comprobación(es) ejecutada(s) y superada(s).`
    : `[4. TEST] ${testAssertions.length} aserción(es) declarada(s), ${executedChecks.length} ejecutada(s): sin verificación completa.`);

  // Paso 5: Construir & Preflight (Observer)
  if (commandToExecute) {
    const preflightResult = runPreflight(commandToExecute);
    if (preflightResult.status === 'STOP') {
      executionLog.push(`[5. CONSTRUIR] PREFLIGHT DETENIDO (STOP): ${preflightResult.reason}`);
      return {
        status: 'FAILED_PREFLIGHT',
        taskId,
        reason: preflightResult.reason,
        log: executionLog
      };
    }
    executionLog.push(`[5. CONSTRUIR] Preflight de comando superado exitosamente (PASS).`);
  } else {
    executionLog.push(`[5. CONSTRUIR] Modificación de código realizada en alcance autorizado.`);
  }

  // Paso 6: Auditar & Verificar
  const evidenceManifest = createEvidenceManifest({
    taskId,
    subject: title,
    files: modifiedFiles,
    logs: executionLog
  });
  executionLog.push(`[6. AUDITAR] Manifiesto de evidencia SHA-256 generado (${evidenceManifest.evidence_id}, estado ${evidenceManifest.status}).`);

  // Paso 7: Promover & Recordar (Aprendizaje por Retroalimentación)
  // VERIFIED sólo si toda comprobación declarada se ejecutó y se superó.
  // docs/terminology.md: "VERIFIED requiere una comprobación independiente".
  const finalStatus = allChecksPassed ? 'VERIFIED' : 'COMPLETED_UNVERIFIED';

  if (humanFeedback) {
    const learningRes = captureHumanFeedback(humanFeedback);
    executionLog.push(learningRes.status === 'LEARNING_RECORDED'
      ? `[7. PROMOVER] Retroalimentación registrada en LEARNINGS.md con etiqueta [${learningRes.category}].`
      : `[7. PROMOVER] ADVERTENCIA: la retroalimentación NO pudo registrarse (${learningRes.status}). Memoria durable intacta.`);
  } else {
    executionLog.push(`[7. PROMOVER] Tarea finalizada con estado ${finalStatus}.`);
  }

  return {
    status: finalStatus,
    taskId,
    evidenceManifest,
    log: executionLog
  };
}


function main() {
  const exampleTask = {
    taskId: 'AX-TASK-DEMO-001',
    title: 'Demostración de Ciclo Híbrido Unificado',
    scope: ['tools/workflow_runner.js'],
    risk: 'LOW',
    humanApproval: true,
    testAssertions: ['Comprobar preflight', 'Comprobar SHA-256'],
    commandToExecute: 'git status',
    modifiedFiles: ['tools/workflow_runner.js']
  };

  const result = executeHybridWorkflow(exampleTask);
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main();
}

module.exports = { executeHybridWorkflow };
