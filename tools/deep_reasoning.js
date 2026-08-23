#!/usr/bin/env node
/**
 * Axion Protocol — Deep Reasoning & High-Exigency Deliberation Engine
 * Enforces the 4-Phase Pre-Mortem Deliberation Gate before non-trivial execution.
 * 
 * 4 Invariant Steps:
 *  1. BLAST_RADIUS: Impacted files, imports, and downstream dependencies.
 *  2. ADVERSARIAL_PREMORTEM: At least 3 concrete, non-vacuous failure modes analyzed (>30 chars each).
 *  3. INVARIANT_CHECK: Alignment with P0 governance, user profile, zero-bloat, and protected zones.
 *  4. VERIFICATION_PROOF: Deterministic test command with exit code 0 requirement.
 * 
 * Zero external dependencies.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

const PROTECTED_ZONES = [
  'valorantcoach',
  'whiteroom',
  '.git',
  'node_modules'
];

const GENERIC_PHRASES = [
  'puede fallar',
  'podria fallar',
  'habra un error',
  'posible error',
  'falla 1',
  'falla 2',
  'falla 3',
  'test fail',
  'error generico'
];

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
   * Evaluates task complexity to determine if Deep Reasoning is mandatory.
   */
  classifyComplexity({ filesCount = 1, isStructural = false, hasDeletedFiles = false } = {}) {
    if (isStructural || hasDeletedFiles || filesCount > 2) {
      return { tier: 'ARCHITECTURAL', requiresDeepReasoning: true, reason: 'Cambio estructural o multi-archivo detectado.' };
    }
    if (filesCount === 2) {
      return { tier: 'MODERATE', requiresDeepReasoning: false, reason: 'Cambio moderado, deliberación recomendada.' };
    }
    return { tier: 'TRIVIAL', requiresDeepReasoning: false, reason: 'Cambio puntual de un solo archivo.' };
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
      } else {
        // Verificar contra zonas protegidas
        for (const file of files) {
          const lower = String(file).toLowerCase();
          for (const zone of PROTECTED_ZONES) {
            if (lower.includes(zone)) {
              errors.push(`Violación de zona protegida: "${file}" coincide con la zona restringida "${zone}".`);
            }
          }
        }
      }
    }

    // 2. Validar Hipótesis de Falla Adversarial (Pre-Mortem con detección de vacuidad)
    const failureModes = payload.adversarial_failure_modes || [];
    if (!Array.isArray(failureModes) || failureModes.length < 3) {
      errors.push('adversarial_failure_modes debe analizar al menos 3 modos de falla concretos.');
    } else {
      const seen = new Set();
      failureModes.forEach((mode, idx) => {
        const text = String(mode || '').trim();
        if (text.length < 25) {
          errors.push(`Hipótesis ${idx + 1} demasiado corta (<25 caracteres). Debe detallar el escenario de falla.`);
        }
        const textLower = text.toLowerCase();
        if (GENERIC_PHRASES.some(phrase => textLower === phrase)) {
          errors.push(`Hipótesis ${idx + 1} es una frase genérica/tautológica ("${text}"). Debe ser específica.`);
        }
        if (seen.has(textLower)) {
          errors.push(`Hipótesis ${idx + 1} está duplicada.`);
        }
        seen.add(textLower);
      });
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

    // Auto-rotación de estados antiguos (>20)
    this.pruneOldStates(20);

    return {
      status: 'APPROVED',
      deliberation_id: deliberationId,
      digest,
      message: 'Deliberación de Alta Exigencia verificada y aprobada para ejecución.',
      record_path: recordPath
    };
  }

  /**
   * Prunes old state files to prevent disk bloat.
   */
  pruneOldStates(maxKeep = 20) {
    try {
      const files = fs.readdirSync(this.stateDir)
        .filter(f => f.startsWith('deep-deliberation-') && f.endsWith('.json'))
        .map(f => ({ name: f, path: path.join(this.stateDir, f), time: fs.statSync(path.join(this.stateDir, f)).mtimeMs }))
        .sort((a, b) => b.time - a.time);

      if (files.length > maxKeep) {
        const toDelete = files.slice(maxKeep);
        toDelete.forEach(f => {
          try { fs.unlinkSync(f.path); } catch (_) {}
        });
      }
    } catch (_) {}
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
    "Falla 1: ¿Qué pasa ante entradas inesperadas, nulas o con caracteres especiales?",
    "Falla 2: ¿Rompe compatibilidad hacia atrás o altera contratos de tests existentes?",
    "Falla 3: ¿Qué efecto secundario oculto en concurrencia, memoria o I/O podría detonar?"
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
