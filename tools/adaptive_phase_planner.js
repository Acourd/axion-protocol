#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Adaptive Phase Planner & Dynamic Compute Budgeter
 *
 * Calcula la complejidad de la tarea y asigna presupuestos dinámicos de ejecución para /drive:
 * 1. Categoriza la misión en FAST_LOOP, DEEP_LOOP o MEGA_REFACTOR según el blast radius.
 * 2. Asigna presupuesto de tiempo (segundos/minutos) y cuota de herramientas recomendada.
 * 3. Define la secuencia exacta de fases y la política de snapshots incrementales.
 * 4. Valida en caliente el progreso frente al presupuesto estimado.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const COMPLEXITY_TIERS = Object.freeze({
  FAST_LOOP: {
    tier: 'FAST_LOOP',
    maxFiles: 2,
    budgetSeconds: 30,
    maxToolCalls: 10,
    requiresPremortem: false,
    requiresIncrementalSnapshots: false,
    phases: [
      'Analysis & Diff Mapping',
      'Atomic Implementation',
      'Targeted Verification (Exit Code 0)'
    ]
  },
  DEEP_LOOP: {
    tier: 'DEEP_LOOP',
    maxFiles: 10,
    budgetSeconds: 180,
    maxToolCalls: 35,
    requiresPremortem: true,
    requiresIncrementalSnapshots: true,
    phases: [
      'AST Dependency Mapping & Sensitive Scope Inspection',
      'Deliberation & 3 Adversarial Pre-Mortem Hypotheses',
      'Preventive Baseline Snapshot (SHA-256)',
      'Multi-File Atomic Implementation',
      'Domain Suites & Fuzzing Verification',
      'Self-Healing & Backtracking Assurance'
    ]
  },
  MEGA_REFACTOR: {
    tier: 'MEGA_REFACTOR',
    maxFiles: 500,
    budgetSeconds: 600,
    maxToolCalls: 100,
    requiresPremortem: true,
    requiresIncrementalSnapshots: true,
    phases: [
      'Whole-Repository AST & Dead Code Mapping',
      'Six-Month Adversarial Autopsy & Invariant Formulations',
      'Incremental Multi-Stage Checkpoint Chain',
      'Deep Architecture Refactoring & Clean Code Enforcement',
      '1.000-Vector Chaos Fuzzing & Stress Testing',
      'Domain Suites Exhaustive Audit (100+ Suites)',
      'Cryptographic in-toto v1 & DSSE Envelope Sealing (Ed25519)',
      'Executive 3-Line Report & Dashboard Generation'
    ]
  }
});

const SENSITIVE_CORE_PATTERNS = [
  /tools[\/\\](killswitch|attestation|preflight|dsse|canonical_json|evidence_hasher|repo_attestation_generator)\.js$/i,
  /bin[\/\\]/i,
  /package\.json$/i,
  /\.axion[\/\\]/i
];

class AdaptivePhasePlanner {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
  }

  /**
   * Evalúa los archivos involucrados y la descripción de la tarea para calcular el tier óptimo.
   */
  planExecution(options = {}) {
    const files = Array.isArray(options.files) ? options.files : [];
    const description = options.description || '';
    const isExplicitStructural = options.isStructural || false;

    const fileCount = Math.max(files.length, 1);
    const touchesSensitiveCore = files.some(f => 
      SENSITIVE_CORE_PATTERNS.some(p => p.test(f))
    );

    let tierConfig = COMPLEXITY_TIERS.FAST_LOOP;

    if (fileCount > 10 || isExplicitStructural || description.toLowerCase().includes('mega') || description.toLowerCase().includes('refactor')) {
      tierConfig = COMPLEXITY_TIERS.MEGA_REFACTOR;
    } else if (fileCount > 2 || touchesSensitiveCore || description.toLowerCase().includes('seguridad') || description.toLowerCase().includes('crypto')) {
      tierConfig = COMPLEXITY_TIERS.DEEP_LOOP;
    }

    const plan = {
      tier: tierConfig.tier,
      fileCount,
      touchesSensitiveCore,
      budgetSeconds: tierConfig.budgetSeconds,
      maxToolCalls: tierConfig.maxToolCalls,
      requiresPremortem: tierConfig.requiresPremortem,
      requiresIncrementalSnapshots: tierConfig.requiresIncrementalSnapshots,
      phaseSequence: [...tierConfig.phases],
      estimatedDuration: `${(tierConfig.budgetSeconds / 60).toFixed(1)} min`,
      plannedAt: new Date().toISOString()
    };

    return plan;
  }
}

if (require.main === module) {
  const planner = new AdaptivePhasePlanner();
  console.log('[Axion Adaptive Planner] Calculando planes de ejecución para diferentes escenarios...');

  const fastPlan = planner.planExecution({ files: ['tools/simple.js'] });
  console.log(`\n=== FAST-LOOP PLAN ===\n  Tier: ${fastPlan.tier} · Presupuesto: ${fastPlan.budgetSeconds}s · Fases: ${fastPlan.phaseSequence.length}`);

  const deepPlan = planner.planExecution({ files: ['tools/preflight.js', 'tools/dsse.js', 'tools/attestation.js'] });
  console.log(`\n=== DEEP-LOOP PLAN ===\n  Tier: ${deepPlan.tier} · Presupuesto: ${deepPlan.budgetSeconds}s · Fases: ${deepPlan.phaseSequence.length}`);

  const megaPlan = planner.planExecution({ description: 'Mega refactor total de la arquitectura' });
  console.log(`\n=== MEGA-REFACTOR PLAN ===\n  Tier: ${megaPlan.tier} · Presupuesto: ${megaPlan.budgetSeconds}s · Fases: ${megaPlan.phaseSequence.length}`);
}

module.exports = AdaptivePhasePlanner;
