#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Context Budget & Token Pressure Watchdog
 *
 * Guardián de presupuesto de contexto y vigilante de presión de tokens para /drive:
 * 1. Estima deterministamente la carga de tokens/caracteres en la sesión activa.
 * 2. Clasifica la presión cognitiva en 4 zonas:
 *    - LEAN (0-49%): Operación normal.
 *    - NOMINAL (50-69%): Estado óptimo con monitoreo pasivo.
 *    - PRESSURE (70-84%): Advertencia temprana; recomienda compactación.
 *    - CRITICAL (85-100%): Peligro de degradación; dispara compactación y checkpoint SHA-256.
 * 3. Ejecuta auto-compactación preventiva si la presión excede el umbral crítico.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

const DEFAULT_BUDGET_TOKENS = 200000; // 200k tokens estándar
const CHARS_PER_TOKEN = 3.8;          // Aproximación determinista estándar

class ContextBudgetGuard {
  constructor(projectRoot = ROOT, budgetTokens = DEFAULT_BUDGET_TOKENS) {
    this.root = path.resolve(projectRoot);
    this.budgetTokens = budgetTokens;
    this.budgetChars = Math.round(budgetTokens * CHARS_PER_TOKEN);
    this.stateDir = path.join(this.root, '.axion', 'state');
    this.ensureStateDir();
  }

  ensureStateDir() {
    if (!fs.existsSync(this.stateDir)) {
      fs.mkdirSync(this.stateDir, { recursive: true });
    }
  }

  estimateTokensFromText(text) {
    if (!text || typeof text !== 'string') return 0;
    return Math.ceil(text.length / CHARS_PER_TOKEN);
  }

  estimateTokens(text) {
    return this.estimateTokensFromText(text);
  }

  classifyZone(usageRatio) {
    if (usageRatio < 0.50) return 'LEAN';
    if (usageRatio < 0.70) return 'NOMINAL';
    if (usageRatio < 0.85) return 'PRESSURE';
    return 'CRITICAL';
  }

  /**
   * Extrae únicamente el bloque enfocado (función, método o clase) para evitar leer archivos completos.
   */
  sliceASTFocus(code = '', focusSymbol = '') {
    if (!code || typeof code !== 'string') return '';
    if (!focusSymbol || typeof focusSymbol !== 'string') return code;

    const lines = code.split('\n');
    const matchedLineIdx = lines.findIndex(l => l.includes(focusSymbol));
    if (matchedLineIdx === -1) return code;

    const start = Math.max(0, matchedLineIdx - 5);
    const end = Math.min(lines.length, matchedLineIdx + 30);
    const slice = lines.slice(start, end).join('\n');

    return `// [Topological Snippet Sliced: lines ${start + 1}-${end}]\n${slice}`;
  }

  /**
   * Poda el payload de contexto eliminando comentarios vacíos y espacios redundantes para maximizar densidad.
   */
  pruneContextPayload(content = '') {
    if (!content || typeof content !== 'string') return '';
    return content
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\n\s*\/\/[^\n]*/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Evalúa la presión de contexto a partir de un conjunto de strings o archivos.
   */
  evaluatePressure(contextItems = []) {
    let totalChars = 0;
    const itemStats = [];

    for (const item of contextItems) {
      let content = '';
      let label = 'memory_buffer';

      if (typeof item === 'string') {
        if (fs.existsSync(item) && fs.statSync(item).isFile()) {
          try {
            content = fs.readFileSync(item, 'utf8');
            label = path.relative(this.root, item);
          } catch (_) {
            content = item;
          }
        } else {
          content = item;
        }
      } else if (item && typeof item === 'object') {
        content = JSON.stringify(item);
        label = item.label || 'structured_data';
      }

      const chars = content.length;
      const tokens = this.estimateTokensFromText(content);
      totalChars += chars;

      itemStats.push({
        label,
        chars,
        estimatedTokens: tokens,
        percentOfBudget: parseFloat(((tokens / this.budgetTokens) * 100).toFixed(2))
      });
    }

    const totalTokens = this.estimateTokensFromText(' '.repeat(totalChars));
    const usageRatio = parseFloat((totalTokens / this.budgetTokens).toFixed(3));
    const usagePercent = parseFloat((usageRatio * 100).toFixed(1));
    const zone = this.classifyZone(usageRatio);

    const report = {
      timestamp: new Date().toISOString(),
      budgetTokens: this.budgetTokens,
      consumedTokens: totalTokens,
      remainingTokens: Math.max(0, this.budgetTokens - totalTokens),
      usagePercent,
      zone,
      itemsAudited: itemStats.length,
      heaviestItems: itemStats.sort((a, b) => b.estimatedTokens - a.estimatedTokens).slice(0, 5),
      recommendation: zone === 'CRITICAL'
        ? 'COMPACTION_MANDATORY_BEFORE_EXECUTION'
        : (zone === 'PRESSURE' ? 'COMPACTION_RECOMMENDED' : 'PROCEED_NORMALLY')
    };

    report.digest = crypto.createHash('sha256')
      .update(JSON.stringify(report))
      .digest('hex');

    return report;
  }

  /**
   * Ejecuta la salvaguarda de contexto y compactación automática si se alcanza la zona crítica.
   */
  enforceGuard(contextItems = [], { autoCompact = true } = {}) {
    const evaluation = this.evaluatePressure(contextItems);

    if (evaluation.zone === 'CRITICAL' && autoCompact) {
      try {
        const { compactSessionContext } = require('./context_shield.js');
        const res = compactSessionContext(this.root);
        evaluation.autoCompacted = true;
        evaluation.anchorPath = res.anchor;
      } catch (err) {
        evaluation.autoCompacted = false;
        evaluation.compactionError = err.message;
      }
    } else {
      evaluation.autoCompacted = false;
    }

    return evaluation;
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const guard = new ContextBudgetGuard();

  // Muestra de archivos de contexto para evaluar
  const sampleFiles = [
    path.join(ROOT, 'README.md'),
    path.join(ROOT, 'tools', 'drive_engine.js'),
    path.join(ROOT, 'tools', 'premortem.js')
  ];

  console.log('[Axion Context Budget] Auditando consumo de ventana de contexto:\n');
  const report = guard.evaluatePressure(sampleFiles);

  console.log(`=== TELEMETRÍA DE PRESUPUESTO DE CONTEXTO ===`);
  console.log(`  Presupuesto Total:    ${report.budgetTokens.toLocaleString()} tokens`);
  console.log(`  Consumo Estimado:     ${report.consumedTokens.toLocaleString()} tokens (${report.usagePercent}%)`);
  console.log(`  Tokens Restantes:     ${report.remainingTokens.toLocaleString()} tokens`);
  console.log(`  Zona Cognitiva:       [${report.zone}]`);
  console.log(`  Recomendación:        ${report.recommendation}`);

  console.log('\n  Elementos más pesados evaluados:');
  report.heaviestItems.forEach((it, idx) => {
    console.log(`    ${idx + 1}. ${it.label.padEnd(30)} ${it.estimatedTokens.toLocaleString()} tokens (${it.percentOfBudget}%)`);
  });

  process.exit(0);
}

module.exports = ContextBudgetGuard;
