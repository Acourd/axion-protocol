#!/usr/bin/env node
/**
 * Axion Protocol — Deep Reasoning & High-Exigency Deliberation Engine
 * Enforces the 4-Phase Pre-Mortem Deliberation Gate before non-trivial execution.
 * 
 * 4 Invariant Steps:
 *  1. BLAST_RADIUS: Impacted files, imports, and downstream dependencies.
 *  2. ADVERSARIAL_PREMORTEM: At least 3 concrete failure modes / edge cases analyzed.
 *  3. INVARIANT_CHECK: Alignment with P0 governance, user profile, and past learnings.
 *  4. VERIFICATION_PROOF: Deterministic test command with exit code 0 requirement.
 * 
 * Zero dependencies. Built-in Node.js crypto/fs.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

class DeepReasoningEngine {
  constructor(projectRoot = ROOT) {
    this.root = projectRoot;
    this.stateDir = path.join(this.root, '.axion', 'state');
    this.ensureStateDir();
  }

  ensureStateDir() {
    if (!fs.existsSync(this.stateDir)) {
      fs.mkdirSync(this.stateDir, { recursive: true });
    }
  }

  /**
   * Evaluates a deliberation payload to ensure all 4 required pillars are thoroughly analyzed.
   */
  evaluateDeliberation(payload) {
    const errors = [];

    if (!payload || typeof payload !== 'object') {
      return {
        status: 'DENIED',
        reason: 'INVALID_PAYLOAD',
        message: 'El payload de deliberación profunda debe ser un objeto JSON válido.'
      };
    }

    // 1. Validar Blast Radius
    if (!payload.blast_radius || typeof payload.blast_radius !== 'object') {
      errors.push('Falta la sección "blast_radius" (debe listar archivos tocados y dependencias afectadas).');
    } else {
      const files = payload.blast_radius.target_files || [];
      if (!Array.isArray(files) || files.length === 0) {
        errors.push('blast_radius.target_files debe contener al menos un archivo objetivo.');
      }
    }

    // 2. Validar Hipótesis de Falla Adversarial (Pre-Mortem)
    const failureModes = payload.adversarial_failure_modes || [];
    if (!Array.isArray(failureModes) || failureModes.length < 3) {
      errors.push('adversarial_failure_modes debe analizar al menos 3 modos de falla concretos (casos límite o rupturas potenciales).');
    }

    // 3. Validar Chequeo de Invariantes
    if (!payload.invariants_checked || typeof payload.invariants_checked !== 'object') {
      errors.push('Falta la sección "invariants_checked" (debe certificar compatibilidad con P0 y perfil de usuario).');
    } else {
      if (payload.invariants_checked.p0_governance_respected !== true) {
        errors.push('invariants_checked.p0_governance_respected debe ser true.');
      }
    }

    // 4. Validar Criterio de Prueba Determinista
    if (!payload.verification_proof || typeof payload.verification_proof !== 'string' || payload.verification_proof.trim().length < 5) {
      errors.push('verification_proof debe especificar el comando determinista de prueba que valide la salida 0.');
    }

    if (errors.length > 0) {
      return {
        status: 'DENIED',
        reason: 'DELIBERATION_INCOMPLETE',
        errors
      };
    }

    const deliberationId = crypto.randomBytes(8).toString('hex');
    const timestamp = new Date().toISOString();
    const digest = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');

    const record = {
      deliberation_id: deliberationId,
      timestamp,
      digest,
      payload,
      status: 'APPROVED_FOR_EXECUTION'
    };

    const recordPath = path.join(this.stateDir, `deep-deliberation-${deliberationId}.json`);
    fs.writeFileSync(recordPath, JSON.stringify(record, null, 2), 'utf8');

    return {
      status: 'APPROVED',
      deliberation_id: deliberationId,
      digest,
      message: 'Deliberación de Alta Exigencia verificada y aprobada para ejecución.',
      record_path: recordPath
    };
  }

  /**
   * Formats the standardized prompt template for agents.
   */
  static getProtocolTemplate() {
    return `# Protocolo de Alta Exigencia (Deep Reasoning Gate)

Antes de invocar herramientas de edición (write_to_file, replace_file_content, run_command),
completa este bloque de deliberación mental:

\`\`\`json
{
  "task_intent": "Descripción concisa del objetivo",
  "blast_radius": {
    "target_files": ["archivos directos a modificar"],
    "dependent_components": ["componentes o tests que dependen de estos archivos"]
  },
  "adversarial_failure_modes": [
    "Falla 1: ¿Qué pasa ante entradas inesperadas o vacías?",
    "Falla 2: ¿Rompe compatibilidad hacia atrás o tests existentes?",
    "Falla 3: ¿Qué efecto secundario oculto podría detonar en runtime?"
  ],
  "invariants_checked": {
    "p0_governance_respected": true,
    "user_profile_aligned": true,
    "zero_bloat_enforced": true
  },
  "verification_proof": "node tests/run_all.js"
}
\`\`\`
`;
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  const engine = new DeepReasoningEngine();

  if (command === 'evaluate') {
    let rawInput = args[1];
    if (!rawInput) {
      console.error(JSON.stringify({ status: 'DENIED', reason: 'MISSING_PAYLOAD' }, null, 2));
      process.exit(1);
    }
    try {
      const payload = JSON.parse(rawInput);
      const res = engine.evaluateDeliberation(payload);
      console.log(JSON.stringify(res, null, 2));
      process.exit(res.status === 'APPROVED' ? 0 : 1);
    } catch (e) {
      console.error(JSON.stringify({ status: 'DENIED', reason: 'MALFORMED_JSON', message: e.message }, null, 2));
      process.exit(1);
    }
  } else if (command === 'template') {
    console.log(DeepReasoningEngine.getProtocolTemplate());
  } else {
    console.log('Uso: node tools/deep_reasoning.js evaluate <json_payload> | template');
  }
}

module.exports = DeepReasoningEngine;
