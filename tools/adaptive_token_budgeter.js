#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Adaptive Token Budgeter & Quota Guardian (M_TOK_008)
 *
 * Presupuestador adaptativo de cuotas de tokens por subtarea:
 * 1. Asigna techos dinámicos de tokens a subagentes por nivel de complejidad (LOW, MEDIUM, HIGH, MAX).
 * 2. Aplica alertas preventivas tempranas al 80% de utilización y freno fail-closed al 100%.
 * 3. Permite extensiones presupuestarias condicionadas a justificación formal auditada.
 * 4. Emite un informe formal TokenBudgetAuditRecord sellado con SHA-256.
 *
 * Cero dependencias externas.
 */

const crypto = require('crypto');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const BUDGET_TIERS = {
  LOW: 2000,
  MEDIUM: 8000,
  HIGH: 20000,
  MAX: 50000
};

class AdaptiveTokenBudgeter {
  constructor(options = {}) {
    this.root = path.resolve(options.projectRoot || ROOT);
    this.budgets = new Map();
    this.globalConsumed = 0;
  }

  /**
   * Asigna una cuota de presupuesto de tokens a un subagente o tarea.
   */
  allocateBudget(subagentId, options = {}) {
    const id = String(subagentId || 'default');
    const tier = String(options.tier || 'MEDIUM').toUpperCase();
    const allocated = Math.max(100, Number(options.amount) || BUDGET_TIERS[tier] || BUDGET_TIERS.MEDIUM);

    const record = {
      subagentId: id,
      allocated,
      consumed: 0,
      extensions: [],
      status: 'HEALTHY',
      createdAt: new Date().toISOString()
    };

    this.budgets.set(id, record);
    return record;
  }

  /**
   * Registra el consumo de tokens y deriva el estado de utilización.
   */
  consumeTokens(subagentId, count = 0) {
    const id = String(subagentId || 'default');
    if (!this.budgets.has(id)) {
      this.allocateBudget(id);
    }

    const record = this.budgets.get(id);
    const tokens = Math.max(0, Number(count) || 0);

    record.consumed += tokens;
    this.globalConsumed += tokens;

    const remaining = Math.max(0, record.allocated - record.consumed);
    const ratio = record.allocated > 0 ? record.consumed / record.allocated : 1.0;

    if (record.consumed >= record.allocated) {
      record.status = 'EXHAUSTED';
    } else if (ratio >= 0.80) {
      record.status = 'WARNING';
    } else {
      record.status = 'HEALTHY';
    }

    return {
      subagentId: id,
      allowed: record.status !== 'EXHAUSTED',
      consumed: record.consumed,
      allocated: record.allocated,
      remaining,
      utilizationPercent: `${(ratio * 100).toFixed(1)}%`,
      status: record.status
    };
  }

  /**
   * Solicita una extensión formal de presupuesto con justificación auditada.
   */
  requestExtension(subagentId, justification = '', amount = 1000) {
    const id = String(subagentId || 'default');
    const record = this.budgets.get(id);
    if (!record) throw new Error(`Subagente ${id} no tiene un presupuesto asignado`);

    const reason = String(justification || '').trim();
    if (!reason) throw new Error('La solicitud de extensión requiere una justificación formal');

    const extAmount = Math.max(100, Number(amount) || 1000);
    record.allocated += extAmount;
    record.extensions.push({
      amount: extAmount,
      justification: reason,
      timestamp: new Date().toISOString()
    });

    // Re-evaluar estado
    const remaining = Math.max(0, record.allocated - record.consumed);
    const ratio = record.allocated > 0 ? record.consumed / record.allocated : 1.0;
    record.status = ratio >= 1.0 ? 'EXHAUSTED' : (ratio >= 0.80 ? 'WARNING' : 'HEALTHY');

    return {
      subagentId: id,
      newAllocated: record.allocated,
      remaining,
      status: record.status,
      extensionGranted: extAmount
    };
  }

  /**
   * Genera el informe criptográfico formal de auditoría de presupuesto.
   */
  getBudgetReport(subagentId) {
    const id = String(subagentId || 'default');
    const record = this.budgets.get(id);
    if (!record) return null;

    const remaining = Math.max(0, record.allocated - record.consumed);
    const ratio = record.allocated > 0 ? (record.consumed / record.allocated) * 100 : 100;

    const payload = JSON.stringify({
      subagentId: id,
      allocated: record.allocated,
      consumed: record.consumed,
      status: record.status,
      extensionsCount: record.extensions.length
    });

    const auditDigest = crypto.createHash('sha256').update(payload).digest('hex');

    return {
      reportType: 'TokenBudgetAuditRecord_v1',
      subagentId: id,
      allocated: record.allocated,
      consumed: record.consumed,
      remaining,
      utilizationPercent: `${ratio.toFixed(1)}%`,
      status: record.status,
      extensions: record.extensions,
      auditDigest
    };
  }
}

if (require.main === module) {
  const budgeter = new AdaptiveTokenBudgeter();

  console.log('[Adaptive Token Budgeter] Simulando ciclo de vida presupuestario:\n');
  budgeter.allocateBudget('worker_research', { tier: 'LOW' }); // 2000 tokens

  console.log('- Consumiendo 1500 tokens (75%):');
  console.log(budgeter.consumeTokens('worker_research', 1500));

  console.log('\n- Consumiendo 200 tokens más (85% -> WARNING):');
  console.log(budgeter.consumeTokens('worker_research', 200));

  console.log('\n- Consumiendo 400 tokens más (105% -> EXHAUSTED fail-closed):');
  console.log(budgeter.consumeTokens('worker_research', 400));

  console.log('\n- Solicitando extensión de 1000 tokens con justificación:');
  budgeter.requestExtension('worker_research', 'Completar síntesis de premortem adversarial', 1000);
  console.log(budgeter.getBudgetReport('worker_research'));
}

module.exports = AdaptiveTokenBudgeter;
