#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Drive Metacognitive Sentinel Engine (M_META_001)
 *
 * Módulo metacognitivo de segundo orden para el motor /drive:
 * 1. Detector heurístico de oscilación cíclica de mutaciones (Ping-Pong Loop Guard).
 * 2. Guardián estricto de blast radius en Fast-Loop: previene bypass en archivos críticos.
 * 3. Compactador de telemetría de fallos y poda de contexto (Token Economy Preservation).
 * 4. Validador de no-tautología en pruebas y verificador formal de fase RED de TDD.
 * 5. Emisión de DriveMetacognitiveReport_v1 sellado con SHA-256.
 *
 * Cero dependencias externas.
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');

const CRITICAL_SYSTEM_PATTERNS = [
  /^tools\/(drive_engine|drive_metacognitive_sentinel|workflow_runner|workflow_state_machine)\.js$/i,
  /^tools\/(killswitch|agent_shield|vibeguard_gate|fuzzer|preflight_validator|preflight)\.js$/i,
  /^tools\/(attest|dsse|ed25519|canonical_json|evidence_hasher|crypto|key_revocation|key_rotation|approval_ed25519|check_ed25519)/i,
  /^tools\/(repo_attestation_generator|sbom_sovereign_generator|bundle_compiler|sync_mirror_gate)\.js$/i,
  /package(-lock)?\.json$/i,
  /opencode\.json$/i,
  /(^|\/)\.git\/hooks\//i,
  /(^|\/)\.github\/workflows\//i,
  /^tools\/git_governance_hook\.js$/i,
  /^policies\//i,
  /^schemas\//i,
  /(^|\/)\.axion\//i,
  /^bin\//i
];

class DriveMetacognitiveSentinel {
  constructor(options = {}) {
    this.projectRoot = path.resolve(options.projectRoot || ROOT);
    this.history = [];
    this.errorHistory = [];
  }

  /**
   * Limpia el rastreador de ciclos y memoria de oscilación.
   */
  clearCycleTracker() {
    this.history = [];
    this.errorHistory = [];
  }

  /**
   * Calcula un hash SHA-256 canónico y determinista para un descriptor de estado.
   */
  _hashState(state) {
    if (state === null || state === undefined) {
      return null;
    }

    if (typeof state === 'string') {
      return crypto.createHash('sha256').update(state).digest('hex');
    }

    if (typeof state === 'object') {
      try {
        const sortedObj = {};
        const keys = Object.keys(state).sort();
        for (const k of keys) {
          sortedObj[k] = state[k];
        }
        return crypto.createHash('sha256').update(JSON.stringify(sortedObj)).digest('hex');
      } catch (_) {
        return crypto.createHash('sha256').update(String(state)).digest('hex');
      }
    }

    return crypto.createHash('sha256').update(String(state)).digest('hex');
  }

  /**
   * Registra el estado de mutación de una iteración y comprueba si existe oscilación cíclica.
   */
  recordMutationState(state, metadata = {}) {
    const stateDigest = this._hashState(state);
    const currentIteration = this.history.length + 1;

    // 1. Detección de ciclo de estados
    let priorIndex = -1;
    let isStateCycle = false;
    let stateCycleLength = 0;

    if (stateDigest !== null) {
      priorIndex = this.history.findIndex((h) => h.stateDigest !== null && h.stateDigest === stateDigest);
      if (priorIndex !== -1) {
        isStateCycle = true;
        stateCycleLength = currentIteration - (priorIndex + 1);
      }
    }

    // 2. Detección de oscilación cíclica de firmas de error (Ping-Pong: Error A -> Error B -> Error A -> Error B)
    let hasErrorOscillation = false;
    if (metadata && metadata.errorSignature) {
      this.errorHistory.push(String(metadata.errorSignature).trim());
      const len = this.errorHistory.length;
      if (len >= 4) {
        // Oscilación de período 2: A -> B -> A -> B
        if (
          this.errorHistory[len - 1] === this.errorHistory[len - 3] &&
          this.errorHistory[len - 2] === this.errorHistory[len - 4] &&
          this.errorHistory[len - 1] !== this.errorHistory[len - 2]
        ) {
          hasErrorOscillation = true;
        }
      }
      if (!hasErrorOscillation && len >= 6) {
        // Oscilación de período 3: A -> B -> C -> A -> B -> C
        if (
          this.errorHistory[len - 1] === this.errorHistory[len - 4] &&
          this.errorHistory[len - 2] === this.errorHistory[len - 5] &&
          this.errorHistory[len - 3] === this.errorHistory[len - 6] &&
          (this.errorHistory[len - 1] !== this.errorHistory[len - 2] || this.errorHistory[len - 2] !== this.errorHistory[len - 3])
        ) {
          hasErrorOscillation = true;
        }
      }
    }

    const isOscillating = isStateCycle || hasErrorOscillation;
    const cycleDetected = isOscillating;
    const cycleLength = isStateCycle ? stateCycleLength : (hasErrorOscillation ? 2 : 0);
    const recommendation = isOscillating ? 'ABORT_CYCLE_DETECTED' : undefined;

    const record = {
      iteration: currentIteration,
      stateDigest,
      metadata,
      timestamp: Date.now()
    };
    this.history.push(record);

    if (isOscillating) {
      return {
        isOscillating: true,
        cycleDetected: true,
        cycleLength,
        priorIteration: isStateCycle ? (priorIndex + 1) : Math.max(1, currentIteration - cycleLength),
        currentIteration,
        recommendation,
        stateDigest,
        hasErrorOscillation,
        reason: isStateCycle
          ? `Ciclo de estados de mutación detectado (longitud ${stateCycleLength}, repite iteración ${priorIndex + 1})`
          : 'Oscilación de firmas de error (Ping-Pong Loop) detectada entre reintentos'
      };
    }

    return {
      isOscillating: false,
      cycleDetected: false,
      iteration: currentIteration,
      stateDigest,
      hasErrorOscillation: false
    };
  }

  /**
   * Clasifica si un archivo pertenece al núcleo crítico o estructural del sistema.
   */
  isCriticalFile(filePath) {
    if (!filePath || typeof filePath !== 'string') return false;
    let relPath = filePath.trim();
    try {
      const absPath = path.resolve(this.projectRoot, relPath);
      relPath = path.relative(this.projectRoot, absPath);
    } catch (_err) {
      // Si la resolución relativa falla por formato de URI o permisos, preservar relPath intacto
    }

    let norm = relPath.split(path.sep).join('/').replace(/^\.\//, '').trim();

    return CRITICAL_SYSTEM_PATTERNS.some((pattern) => pattern.test(norm));
  }

  /**
   * Evalúa la seguridad de ejecutar en Fast-Loop según el conjunto de archivos afectados.
   */
  evaluateFastLoopSafety(files = [], options = {}) {
    const list = Array.isArray(files) ? files : [files].filter(Boolean);
    const criticalFiles = list.filter((f) => this.isCriticalFile(f));

    if (criticalFiles.length > 0) {
      return {
        allowed: false,
        escalatedMode: 'DEEP_LOOP',
        reason: 'CRITICAL_FILE_PROTECTED',
        requiresDeliberation: true,
        criticalFiles,
        blastRadius: 'SYSTEMIC_CRITICAL'
      };
    }

    if (list.length > 2) {
      return {
        allowed: false,
        escalatedMode: 'DEEP_LOOP',
        reason: 'MULTI_FILE_CHANGE',
        requiresDeliberation: true,
        criticalFiles: [],
        blastRadius: 'MODERATE_MULTI_FILE'
      };
    }

    if (options.isStructural || options.hasSecurityRisk) {
      return {
        allowed: false,
        escalatedMode: 'DEEP_LOOP',
        reason: 'STRUCTURAL_OR_SECURITY_FLAG',
        requiresDeliberation: true,
        criticalFiles: [],
        blastRadius: 'DECLARED_HIGH'
      };
    }

    return {
      allowed: true,
      mode: 'FAST_LOOP',
      reason: 'SAFE_ATOMIC_LOCAL_CHANGE',
      requiresDeliberation: false,
      criticalFiles: [],
      blastRadius: 'LOW_LOCAL'
    };
  }

  /**
   * Poda quirúrgica de telemetría de fallos para evitar el desbordamiento de ventana de contexto.
   */
  compactFailureTelemetry(rawStdout = '', options = {}) {
    const maxContextLines = options.maxContextLines || 25;
    const raw = String(rawStdout || '');
    if (!raw.trim()) {
      return {
        originalTokens: 0,
        compactedTokens: 0,
        savedTokens: 0,
        savingsPercent: 0,
        compactedOutput: '',
        digest: crypto.createHash('sha256').update('').digest('hex')
      };
    }

    const stripAnsi = (str) => str.replace(/\u001b\[[0-9;]*m/g, '');
    const originalTokens = Math.ceil(raw.length / 4);
    const lines = raw.split('\n');

    let passLinesCount = 0;
    const errorSection = [];
    let capturing = false;

    for (const line of lines) {
      const clean = stripAnsi(line);
      if (/FAIL|ERR_ASSERTION|AssertionError|Error:/.test(clean)) {
        capturing = true;
      }
      if (capturing) {
        errorSection.push(line);
        if (errorSection.length >= maxContextLines) {
          capturing = false;
        }
      } else if (/^\s*(✓|PASS)/.test(clean)) {
        passLinesCount++;
      }
    }

    const summaryLines = lines.filter((l) =>
      /RESUMEN|TOTAL|suites totales|en verde|Tiempo:|EXIT CODE/i.test(stripAnsi(l))
    );

    const omittedPass = passLinesCount > 0
      ? passLinesCount
      : Math.max(0, lines.length - errorSection.length - summaryLines.length);

    const compactedLines = [
      '=== [DriveMetacognitiveSentinel] Telemetría Quirúrgica Compactada ===',
      ...errorSection.slice(0, maxContextLines),
      omittedPass > 0 ? `⚠️ (${omittedPass} líneas de PASS omitidas / podadas para preservación de tokens)` : null,
      ...summaryLines
    ].filter(Boolean);

    const compactedOutput = compactedLines.join('\n');
    const compactedTokens = Math.max(1, Math.ceil(compactedOutput.length / 4));
    const savedTokens = Math.max(0, originalTokens - compactedTokens);
    const savingsPercent = originalTokens > 0
      ? Number(((savedTokens / originalTokens) * 100).toFixed(1))
      : 0;

    const digest = crypto.createHash('sha256').update(compactedOutput).digest('hex');

    return {
      originalTokens,
      compactedTokens,
      savedTokens,
      savingsPercent,
      compactedOutput,
      digest
    };
  }

  /**
   * Genera un hunk diferencial compacto y verifica su reversibilidad.
   */
  compactMutationDiff(originalContent = '', modifiedContent = '', options = {}) {
    try {
      const DiffTokenCompactor = require('./diff_token_compactor.js');
      const compactor = new DiffTokenCompactor({ projectRoot: this.projectRoot });
      const hunk = compactor.createHunk(originalContent, modifiedContent, options);
      return {
        diffText: hunk.diffText,
        isReversibleVerified: hunk.isReversibleVerified,
        originalTokens: hunk.originalTokens,
        diffTokens: hunk.diffTokens,
        savedTokens: hunk.tokensSaved,
        savingsPercent: parseFloat(hunk.reductionPercent || '0'),
        reportDigest: hunk.reportDigest
      };
    } catch (_) {
      // Fallback nativo
      const orig = String(originalContent || '');
      const mod = String(modifiedContent || '');
      const diffText = `--- original\n+++ modified\n-  ${orig.trim()}\n+  ${mod.trim()}\n`;
      const isReversibleVerified = (orig !== mod);
      const originalTokens = Math.ceil(orig.length / 4);
      const diffTokens = Math.ceil(diffText.length / 4);
      const savedTokens = Math.max(0, originalTokens - diffTokens);
      const digest = crypto.createHash('sha256').update(diffText).digest('hex');
      return {
        diffText,
        isReversibleVerified,
        originalTokens,
        diffTokens,
        savedTokens,
        savingsPercent: originalTokens > 0 ? Number(((savedTokens / originalTokens) * 100).toFixed(1)) : 0,
        reportDigest: digest
      };
    }
  }

  /**
   * Valida que una prueba no contenga aserciones tautológicas o vacías.
   */
  validateTestNonTautology(testSourceCode = '') {
    const src = String(testSourceCode || '');
    const violations = [];

    const lines = src.split('\n');
    let assertionCount = 0;

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const trimmed = line.trim();

      if (/assert\.(ok|strictEqual|deepStrictEqual|equal|deepEqual|notStrictEqual|notEqual|match)|expect\(/.test(trimmed)) {
        assertionCount++;
      }

      // 1. assert.ok(true) o assert(true) o assert.ok(1)
      if (/assert(\.ok)?\(\s*(true|1)\s*[,)]/.test(trimmed)) {
        violations.push({
          type: 'TAUTOLOGICAL_BOOLEAN_LITERAL',
          snippet: trimmed,
          line: lineNum
        });
      }

      // 2. assert.strictEqual(X, X) o assert.deepStrictEqual(X, X) con literales u operandos idénticos
      const matchEqual = trimmed.match(/assert\.(strictEqual|deepStrictEqual|equal|deepEqual)\(\s*([^,]+?)\s*,\s*([^,)]+?)\s*[,)]/);
      if (matchEqual) {
        const lhs = matchEqual[2].trim();
        const rhs = matchEqual[3].trim();
        if (lhs === rhs) {
          violations.push({
            type: 'TAUTOLOGICAL_IDENTICAL_OPERANDS',
            snippet: trimmed,
            line: lineNum
          });
        }
      }

      // 3. assert.strictEqual(typeof X, '...') sin comprobación posterior de valor
      const matchTypeof = trimmed.match(/assert\.(strictEqual|equal)\(\s*typeof\s+([a-zA-Z0-9_$]+)\s*,\s*['"]\w+['"]\s*[,)]/);
      if (matchTypeof) {
        const varName = matchTypeof[2];
        const subsequentLines = lines.slice(idx + 1);
        const nonTypeofSubsequent = subsequentLines.filter((l) => !new RegExp(`typeof\\s+${varName}\\b`).test(l));
        const hasValueCheck = nonTypeofSubsequent.some((l) =>
          new RegExp(`assert\\.[a-zA-Z]+\\([^)]*\\b${varName}\\b`).test(l) ||
          new RegExp(`expect\\(\\s*${varName}\\b`).test(l)
        );
        if (!hasValueCheck) {
          violations.push({
            type: 'VACUOUS_TYPEOF_WITHOUT_VALUE_CHECK',
            snippet: trimmed,
            line: lineNum
          });
        }
      }
    });

    if (assertionCount === 0) {
      violations.push({
        type: 'ZERO_ASSERTIONS',
        snippet: 'No se encontraron aserciones ejecutables en la prueba',
        line: 1
      });
    }

    const isTautological = violations.length > 0;
    const isValid = !isTautological;

    return {
      isValid,
      isTautological,
      violations,
      assertionCount
    };
  }

  /**
   * Comprueba formalmente que una prueba cumpla la fase RED de TDD al ejecutarse contra una línea base no implementada.
   */
  verifyRedPhase(testRunnerFn, options = {}) {
    if (typeof testRunnerFn !== 'function') {
      return {
        validRedPhase: false,
        passedBaseline: false,
        reason: 'INVALID_TEST_RUNNER',
        warning: 'testRunnerFn debe ser una función ejecutable.'
      };
    }

    try {
      testRunnerFn();
      // Si pasa en la línea base no implementada, es un falso verde / tautología
      return {
        validRedPhase: false,
        passedBaseline: true,
        reason: 'TAUTOLOGICAL_OR_PRE_PASSING',
        warning: 'La prueba pasa sobre la línea base sin implementar — riesgo de falso verde.'
      };
    } catch (err) {
      // Falló como corresponde en la fase RED
      return {
        validRedPhase: true,
        passedBaseline: false,
        status: 'GENUINE_RED_PHASE_VERIFIED',
        failureReason: err.message
      };
    }
  }

  /**
   * Verifica la integridad criptográfica y no ambigüedad del IntentContract (Fase 1: Socratic Intent Gate).
   */
  verifyIntentContract(contractOrRoot) {
    let contract = null;
    if (contractOrRoot && typeof contractOrRoot === 'object') {
      contract = contractOrRoot;
    } else {
      const root = typeof contractOrRoot === 'string' ? contractOrRoot : this.projectRoot;
      const contractPath = path.join(root, '.axion', 'state', 'intent-contract.json');
      if (!fs.existsSync(contractPath)) {
        return {
          isValid: false,
          status: 'MISSING_CONTRACT',
          contract: null,
          digest: null,
          reason: 'No se encontró el contrato de intención sellado en .axion/state/intent-contract.json'
        };
      }
      try {
        contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
      } catch (err) {
        return {
          isValid: false,
          status: 'CORRUPTED_JSON',
          contract: null,
          digest: null,
          reason: `Error al parsear el contrato de intención: ${err.message}`
        };
      }
    }

    if (!contract || typeof contract !== 'object') {
      return {
        isValid: false,
        status: 'INVALID_CONTRACT_STRUCTURE',
        contract: null,
        digest: null,
        reason: 'El contrato de intención no es un objeto válido.'
      };
    }

    const requiredFields = ['contract_id', 'summary', 'expectedBehavior', 'scopeBoundary', 'digest'];
    const missing = requiredFields.filter((f) => !contract[f] || typeof contract[f] !== 'string' || !contract[f].trim());
    if (missing.length > 0) {
      return {
        isValid: false,
        status: 'AMBIGUOUS_SCOPE',
        contract,
        digest: contract.digest || null,
        reason: `Contrato ambiguo o incompleto: faltan campos obligatorios (${missing.join(', ')}).`
      };
    }

    const { isAmbiguousScope } = require('./intent_clarifier.js');
    if (isAmbiguousScope(contract.scopeBoundary)) {
      return {
        isValid: false,
        status: 'AMBIGUOUS_BLAST_RADIUS',
        contract,
        digest: contract.digest || null,
        reason: 'El límite de alcance (scopeBoundary) es ambiguo o excesivamente amplio.'
      };
    }

    const { hashCanonical } = require('./canonical_json.js');
    const { digest, ...payload } = contract;
    const computedDigest = hashCanonical(payload);

    if (digest !== computedDigest) {
      return {
        isValid: false,
        status: 'CORRUPTED_DIGEST',
        contract,
        digest,
        computedDigest,
        reason: 'El digest SHA-256 no coincide con el payload canónico RFC 8785 (posible alteración o manipulación).'
      };
    }

    return {
      isValid: true,
      status: 'SEALED_VALID',
      contract,
      digest,
      reason: 'Contrato de intención íntegro y sellado canónicamente con SHA-256.'
    };
  }

  /**
   * Audita la seguridad de un comando de terminal mediante preflight (v3.0.0 — Fase 3: Terminal Safety Shield).
   */
  auditPreflightCommand(command) {
    const { classifyCommand, COMMAND_DECISION } = require('./structured_command.js');
    const classification = classifyCommand(command);
    const isAllowed = classification.decision === COMMAND_DECISION.ALLOW;
    return {
      isValid: isAllowed,
      decision: classification.decision,
      reason: classification.reason,
      status: classification.decision === COMMAND_DECISION.DENY
        ? 'REJECTED_DESTRUCTIVE_COMMAND'
        : (classification.decision === COMMAND_DECISION.NEEDS_HUMAN_REVIEW
          ? 'ESCALATED_UNSTRUCTURED_COMMAND'
          : 'APPROVED_STRUCTURED_COMMAND')
    };
  }

  /**
   * Ejecuta una auditoría metacognitiva holística de segundo orden para una tarea de /drive.
   */
  runMetacognitiveAudit(options = {}) {
    const fastLoopSafety = this.evaluateFastLoopSafety(options.files || [], options);
    const testValidation = options.testSourceCode
      ? this.validateTestNonTautology(options.testSourceCode)
      : { isValid: true, isTautological: false, violations: [] };

    const telemetryCompacted = options.terminalOutput
      ? this.compactFailureTelemetry(options.terminalOutput, options)
      : { savedTokens: 0, savingsPercent: 0 };

    let intentValidation = { isValid: true, status: 'SKIPPED' };
    let preflightValidation = { isValid: true, status: 'SKIPPED' };
    let status = 'APPROVED';

    if (options.checkIntentContract || options.intentContract) {
      intentValidation = this.verifyIntentContract(options.intentContract || this.projectRoot);
      if (!intentValidation.isValid) {
        if (intentValidation.status === 'CORRUPTED_DIGEST') {
          status = 'REJECTED_CORRUPTED_CONTRACT';
        } else if (intentValidation.status === 'MISSING_CONTRACT') {
          status = 'REJECTED_UNSEALED_CONTRACT';
        } else {
          status = 'ESCALATED_AMBIGUOUS_INTENT';
        }
      }
    }

    if (options.command) {
      preflightValidation = this.auditPreflightCommand(options.command);
      if (!preflightValidation.isValid && status === 'APPROVED') {
        status = preflightValidation.status;
      }
    }

    if (status === 'APPROVED') {
      if (!fastLoopSafety.allowed) {
        status = 'ESCALATED_DEEP_LOOP';
      } else if (!testValidation.isValid) {
        status = 'REJECTED_TAUTOLOGICAL_TEST';
      }
    }

    const payload = JSON.stringify({
      status,
      fastLoopSafety,
      testValidation: {
        isValid: testValidation.isValid,
        violationsCount: testValidation.violations ? testValidation.violations.length : 0
      },
      telemetrySavedTokens: telemetryCompacted.savedTokens,
      intentValidation: {
        isValid: intentValidation.isValid,
        status: intentValidation.status
      },
      preflightValidation: {
        isValid: preflightValidation.isValid,
        status: preflightValidation.status
      },
      timestamp: new Date().toISOString()
    });

    const reportDigest = crypto.createHash('sha256').update(payload).digest('hex');

    return {
      reportType: 'DriveMetacognitiveReport_v1',
      timestamp: new Date().toISOString(),
      status,
      evaluation: {
        fastLoopSafety,
        testValidation,
        telemetryCompacted,
        intentValidation,
        preflightValidation
      },
      reportDigest
    };
  }
}

if (require.main === module) {
  const sentinel = new DriveMetacognitiveSentinel();
  console.log('[DriveMetacognitiveSentinel] Auditoría demostrativa:');
  const audit = sentinel.runMetacognitiveAudit({
    files: ['tools/drive_engine.js'],
    testSourceCode: 'assert.ok(true);'
  });
  console.log(JSON.stringify(audit, null, 2));
}

module.exports = DriveMetacognitiveSentinel;
