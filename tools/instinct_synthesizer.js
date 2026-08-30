#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Continuous Instinct Synthesizer & Learning Engine
 *
 * Motor de síntesis continua de instintos y destilación de heurísticas para /drive:
 * 1. Analiza trayectorias de decisiones, correcciones del usuario y resultados de verificación determinista.
 * 2. Extrae tarjetas estructuradas de "Instinto" (trigger, regla, confianza, origen, dominio).
 * 3. Aplica un modelo de refuerzo determinista (PROBATION -> ACTIVE -> GRADUATED) según evidencia acumulada.
 * 4. Persiste y reconcilia la base de conocimiento en .axion/state/instincts.json y el grafo de memoria SQLite.
 * 5. Provee consultas semánticas rápidas para guiar al agente antes de comenzar una nueva tarea.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

const DEFAULT_CONFIDENCE_THRESHOLD = 0.85;

function createInstinctId(domain, title) {
  const clean = `${domain}_${title}`.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 32);
  const hash = crypto.createHash('sha256').update(`${domain}:${title}`).digest('hex').slice(0, 6);
  return `ins_${clean}_${hash}`;
}

class InstinctSynthesizer {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
    this.stateDir = path.join(this.root, '.axion', 'state');
    this.instinctsFile = path.join(this.stateDir, 'instincts.json');
    this.ensureStateDir();
  }

  ensureStateDir() {
    if (!fs.existsSync(this.stateDir)) {
      fs.mkdirSync(this.stateDir, { recursive: true });
    }
  }

  loadVault() {
    if (fs.existsSync(this.instinctsFile)) {
      try {
        const raw = fs.readFileSync(this.instinctsFile, 'utf8');
        return JSON.parse(raw);
      } catch (err) {
        // Fallback ante corrupción
      }
    }
    return {
      version: '1.0.0',
      updatedAt: new Date().toISOString(),
      instincts: []
    };
  }

  saveVault(vault) {
    vault.updatedAt = new Date().toISOString();
    vault.digest = crypto.createHash('sha256')
      .update(JSON.stringify(vault.instincts))
      .digest('hex');
    fs.writeFileSync(this.instinctsFile, JSON.stringify(vault, null, 2), 'utf8');
  }

  /**
   * Sintetiza o actualiza un instinto a partir de una observación o corrección.
   */
  synthesizeInstinct({ domain = 'GENERAL', trigger, rule, rationale = '', origin = 'OBSERVATION', initialConfidence = 0.6 }) {
    if (!trigger || !rule) {
      return { success: false, reason: 'trigger y rule son obligatorios' };
    }

    const vault = this.loadVault();
    const id = createInstinctId(domain, trigger);
    let existing = vault.instincts.find(i => i.id === id);

    if (existing) {
      existing.evidenceCount += 1;
      existing.positiveReinforcements += 1;
      existing.confidence = Math.min(0.99, Number((existing.confidence + 0.05).toFixed(2)));
      existing.lastObservedAt = new Date().toISOString();
      if (existing.confidence >= DEFAULT_CONFIDENCE_THRESHOLD && existing.status === 'PROBATION') {
        existing.status = 'ACTIVE';
      }
      if (existing.evidenceCount >= 10 && existing.confidence >= 0.95) {
        existing.status = 'GRADUATED';
      }
    } else {
      existing = {
        id,
        domain: domain.toUpperCase(),
        trigger,
        rule,
        rationale,
        origin,
        confidence: Number(initialConfidence.toFixed(2)),
        evidenceCount: 1,
        positiveReinforcements: 1,
        negativeReinforcements: 0,
        status: initialConfidence >= DEFAULT_CONFIDENCE_THRESHOLD ? 'ACTIVE' : 'PROBATION',
        createdAt: new Date().toISOString(),
        lastObservedAt: new Date().toISOString()
      };
      vault.instincts.push(existing);
    }

    this.saveVault(vault);
    return {
      success: true,
      instinct: existing
    };
  }

  /**
   * Refuerza o penaliza un instinto existente según el resultado de ejecución.
   */
  reinforceInstinct(instinctId, positive = true) {
    const vault = this.loadVault();
    const target = vault.instincts.find(i => i.id === instinctId);
    if (!target) return { success: false, reason: 'Instinto no encontrado' };

    target.evidenceCount += 1;
    target.lastObservedAt = new Date().toISOString();

    if (positive) {
      target.positiveReinforcements += 1;
      target.confidence = Math.min(0.99, Number((target.confidence + 0.04).toFixed(2)));
    } else {
      target.negativeReinforcements += 1;
      target.confidence = Math.max(0.1, Number((target.confidence - 0.15).toFixed(2)));
    }

    if (target.confidence < 0.5) {
      target.status = 'PROBATION';
    } else if (target.confidence >= DEFAULT_CONFIDENCE_THRESHOLD && target.evidenceCount >= 10) {
      target.status = 'GRADUATED';
    } else if (target.confidence >= 0.7) {
      target.status = 'ACTIVE';
    }

    this.saveVault(vault);
    return { success: true, instinct: target };
  }

  /**
   * Consulta instintos aplicables según las palabras clave o dominio de la tarea.
   */
  queryRelevantInstincts({ query = '', domain = null, minConfidence = 0.5 } = {}) {
    const vault = this.loadVault();
    const qLower = String(query).toLowerCase();

    return vault.instincts.filter(ins => {
      if (domain && ins.domain !== domain.toUpperCase()) return false;
      if (ins.confidence < minConfidence) return false;
      if (ins.status === 'ARCHIVED') return false;

      if (!query) return true;
      const tMatch = ins.trigger.toLowerCase().includes(qLower);
      const rMatch = ins.rule.toLowerCase().includes(qLower);
      const dMatch = ins.domain.toLowerCase().includes(qLower);
      return tMatch || rMatch || dMatch;
    }).sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Destila y formatea un resumen ejecutivo de instintos graduados para inyección en contexto.
   */
  formatInstinctsPromptBlock(domain = null) {
    const active = this.queryRelevantInstincts({ domain, minConfidence: 0.75 });
    if (active.length === 0) return '';

    const lines = ['### 🧠 Instintos y Reglas Aprendidas del Proyecto:'];
    for (const ins of active.slice(0, 5)) {
      const badge = ins.status === 'GRADUATED' ? '🎓 [GRADUATED]' : '⚡ [ACTIVE]';
      lines.push(`- ${badge} **${ins.domain}** (${ins.trigger}): ${ins.rule} *(Confianza: ${Math.round(ins.confidence * 100)}%)*`);
    }
    return lines.join('\n');
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const synthesizer = new InstinctSynthesizer();

  if (args.includes('list')) {
    const vault = synthesizer.loadVault();
    console.log(`=== INSTINTOS APRENDIDOS (${vault.instincts.length}) ===\n`);
    vault.instincts.forEach((ins, idx) => {
      console.log(`  ${idx + 1}. [${ins.status}] [${ins.domain}] "${ins.trigger}" -> ${ins.rule} (Confianza: ${Math.round(ins.confidence * 100)}%)`);
    });
  } else {
    console.log('[Axion Instinct Synthesizer] Sintetizando instintos iniciales:');
    const res = synthesizer.synthesizeInstinct({
      domain: 'GOVERNANCE',
      trigger: 'ejecución de comandos de terminal',
      rule: 'Siempre usar ejecución estructurada { executable, args, cwd, shell: false } y pasar preflight',
      rationale: 'Previene command injection y comportamientos divergentes entre plataformas',
      initialConfidence: 0.95
    });
    console.log(`  Instinto generado: [${res.instinct.id}] ${res.instinct.rule}`);
    console.log('\n' + synthesizer.formatInstinctsPromptBlock());
  }
}

module.exports = InstinctSynthesizer;
