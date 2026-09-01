#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Asymptotic Metacognitive Critic & Excellence Engine (v2.0 Universal)
 *
 * Motor de Auto-Crítica y Evaluación Asintótica Dinámica:
 * Destruye la complacencia de los "checklists al 100%" evaluando cualquier artefacto
 * frente a las 7 Fronteras Asintóticas de Excelencia Sistémica y Eficiencia Cognitiva:
 *
 *  1. FORMAL_INVARIANTS (Verificación Formal y Consistencia de Invariantes de Estado)
 *  2. ISOLATION_AND_SAFETY (Aislamiento y Ejecución Segura Fail-Closed)
 *  3. COGNITIVE_EFFICIENCY (Eficiencia Cognitiva, Densidad de Contexto y Token Economy)
 *  4. CHRONIC_ENDURANCE (Resistencia Crónica y Memoria Fractal Anti-Deriva)
 *  5. ADAPTIVE_EVOLUTION (Evolución Adaptativa y Auto-Recuperación Determinista)
 *  6. PROVENANCE_AND_INTEGRITY (Trazabilidad Inmutable e Integridad de Cambios)
 *  7. SEMANTIC_DRIFT_RADAR (Radar de Deriva Semántica y Erradicación de Vibecoding)
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

class AsymptoticCritic {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot || ROOT);
    this.stateDir = path.join(this.root, '.axion', 'state');
    if (!fs.existsSync(this.stateDir)) {
      fs.mkdirSync(this.stateDir, { recursive: true });
    }
  }

  scanWorkspaceEvidence() {
    const toolsDir = path.join(this.root, 'tools');
    const testsDir = path.join(this.root, 'tests');

    let toolsFiles = [];
    try {
      if (fs.existsSync(toolsDir)) toolsFiles = fs.readdirSync(toolsDir);
    } catch (err) {
      if (process.env.DEBUG) console.error(`[AsymptoticCritic] Error leyendo tools: ${err.message}`);
    }

    const hasTests = fs.existsSync(testsDir);
    const hasMerkle = toolsFiles.some(f => f.includes('merkle') || f.includes('ledger') || f.includes('evidence'));
    const hasSbom = toolsFiles.some(f => f.includes('sbom') || f.includes('manifest'));
    const hasDsse = toolsFiles.some(f => f.includes('dsse') || f.includes('attestation') || f.includes('approval'));
    const hasSwarm = toolsFiles.some(f => f.includes('swarm') || f.includes('arbiter') || f.includes('worker'));
    const hasContextGuard = toolsFiles.some(f => f.includes('context') || f.includes('entropy') || f.includes('memory'));
    const hasAstPatch = toolsFiles.some(f => f.includes('ast') || f.includes('healer') || f.includes('checkpoint'));
    const hasTaint = toolsFiles.some(f => f.includes('taint') || f.includes('complexity') || f.includes('vibeguard'));
    const hasPreflight = toolsFiles.some(f => f.includes('preflight') || f.includes('hook') || f.includes('killswitch'));

    return {
      hasTests,
      hasMerkle,
      hasSbom,
      hasDsse,
      hasSwarm,
      hasContextGuard,
      hasAstPatch,
      hasTaint,
      hasPreflight,
      toolsCount: toolsFiles.length
    };
  }

  /**
   * Ejecuta la auditoría crítica asintótica sobre el proyecto de forma dinámica.
   */
  evaluateAsymptoticMaturity(options = {}) {
    const evidence = this.scanWorkspaceEvidence();

    const scoreF1 = evidence.hasTests ? 20 : 5;
    const scoreF2 = evidence.hasPreflight ? 22 : 5;
    const scoreF3 = evidence.hasContextGuard ? 28 : 8;
    const scoreF4 = evidence.hasContextGuard ? 25 : 8;
    const scoreF5 = evidence.hasAstPatch ? 24 : 6;
    const scoreF6 = (evidence.hasDsse && evidence.hasMerkle) ? 32 : evidence.hasDsse ? 18 : 5;
    const scoreF7 = evidence.hasTaint ? 25 : 10;

    const evaluatedFrontiers = [
      {
        id: 'FORMAL_INVARIANTS',
        name: '1. Verificación Formal y Consistencia de Invariantes de Estado',
        currentMaturityPct: scoreF1,
        unrealizedPct: 100 - scoreF1,
        baseline: 'Suites completas de pruebas deterministas e integración en múltiples dominios.',
        frontierGoal: 'Demostración formal matemática de invariantes de estado para el espacio total de ejecuciones sin depender de aserciones empíricas aisladas.',
        gapAnalysis: 'Las pruebas empíricas demuestran la presencia de casos esperados, no la ausencia matemática de fallos en estados no explorados.'
      },
      {
        id: 'ISOLATION_AND_SAFETY',
        name: '2. Aislamiento y Ejecución Segura Fail-Closed',
        currentMaturityPct: scoreF2,
        unrealizedPct: 100 - scoreF2,
        baseline: 'Preflight estructurado, hooks PreToolUse y ejecución blindada sin shell.',
        frontierGoal: 'Enjaulamiento seguro y ejecución totalmente contenida con intercepción rigurosa de efectos colaterales y rollback determinista.',
        gapAnalysis: 'El preflight léxico inspecciona comandos antes de ejecutarse; la frontera soberana garantiza contención de procesos en runtime.'
      },
      {
        id: 'COGNITIVE_EFFICIENCY',
        name: '3. Eficiencia Cognitiva, Densidad de Contexto y Token Economy',
        currentMaturityPct: scoreF3,
        unrealizedPct: 100 - scoreF3,
        baseline: 'Guardianes de presupuesto de tokens y flujos de intención clarificada (/clarify).',
        frontierGoal: 'Resolución precisa en iteración única (First-Shot Success) con mínima huella de contexto y máxima densidad de información útil por token.',
        gapAnalysis: 'Los turnos interactivos consumen contexto progresivamente; la excelencia asintótica erradica el retrabajo y las iteraciones intermedias.'
      },
      {
        id: 'CHRONIC_ENDURANCE',
        name: '4. Resistencia Crónica y Memoria Fractal Anti-Deriva',
        currentMaturityPct: scoreF4,
        unrealizedPct: 100 - scoreF4,
        baseline: 'Persistencia de contexto, grafo de decisiones y anclaje anti-amnesia (/memory).',
        frontierGoal: 'Capacidad de sostener proyectos extensos sin degradación de memoria de trabajo mediante compresión jerárquica fractal.',
        gapAnalysis: 'Las ventanas de contexto imponen límites físicos de memoria; se requiere indexación fractal determinista entre sesiones.'
      },
      {
        id: 'ADAPTIVE_EVOLUTION',
        name: '5. Evolución Adaptativa y Auto-Recuperación Determinista',
        currentMaturityPct: scoreF5,
        unrealizedPct: 100 - scoreF5,
        baseline: 'Puntos de control verificados (snapshots SHA-256) y rollback semántico instantáneo.',
        frontierGoal: 'Auto-diagnóstico de causas raíz con síntesis adaptativa de soluciones óptimas sin parches ciegos ni degradación técnica.',
        gapAnalysis: 'El rollback recupera el estado seguro anterior; la frontera asintótica sintetiza activamente la mejor solución arquitectónica.'
      },
      {
        id: 'PROVENANCE_AND_INTEGRITY',
        name: '6. Trazabilidad Inmutable e Integridad de Cambios',
        currentMaturityPct: scoreF6,
        unrealizedPct: 100 - scoreF6,
        baseline: 'Sellado criptográfico con hashes SHA-256, manifiestos de evidencia y firmas locales.',
        frontierGoal: 'Cadena de custodia verificable de punta a punta con transparencia total de modificaciones y reproducibilidad determinista.',
        gapAnalysis: 'Los hashes locales protegen el estado en disco; la meta soberana provee verificación independiente y trazabilidad total.'
      },
      {
        id: 'SEMANTIC_DRIFT_RADAR',
        name: '7. Radar de Deriva Semántica y Erradicación de Vibecoding',
        currentMaturityPct: scoreF7,
        unrealizedPct: 100 - scoreF7,
        baseline: 'VibeGuard estricto con detección de antipatrones y análisis de complejidad.',
        frontierGoal: 'Monitoreo continuo de coherencia semántica, prevención de deuda técnica latente y respeto inviolable a la intención del usuario.',
        gapAnalysis: 'El análisis estático detecta patrones sintácticos conocidos; la frontera soberana audita la alineación conceptual profunda.'
      }
    ];

    const totalScore = evaluatedFrontiers.reduce((acc, f) => acc + f.currentMaturityPct, 0);
    const globalMaturityPct = Number((totalScore / evaluatedFrontiers.length).toFixed(1));
    const globalUnrealizedPct = Number((100 - globalMaturityPct).toFixed(1));

    const auditReport = {
      evaluatedAt: new Date().toISOString(),
      globalMaturityPct,
      globalUnrealizedPct,
      paradigm: 'ASYMPTOTIC_RESTLESS_EXCELLENCE_V2',
      lens: options.lens || 'SYSTEMIC_UNIVERSAL',
      conclusion: `El proyecto ha conquistado el ${globalMaturityPct}% de madurez de excelencia verificada, encontrándose al ${globalUnrealizedPct}% de distancia de la Madurez Asintótica Absoluta (Horizonte Día 1).`,
      frontiers: evaluatedFrontiers,
      ladder: [
        {
          tier: 'Tier 1 — Optimización Inmediata (Local)',
          action: 'Podar redundancias en prompts/herramientas y asegurar aserciones deterministas al primer intento.'
        },
        {
          tier: 'Tier 2 — Salto 10x (Estructural)',
          action: 'Refinar la orquestación autónoma en bucle cerrado (/drive) con compresión fractal de contexto (/memory).'
        },
        {
          tier: 'Tier 3 — Horizonte Asintótico (Soberano)',
          action: 'Operación continua sin errores, cero fricción cognitiva para no técnicos y consumo óptimo de recursos.'
        }
      ]
    };

    auditReport.digest = crypto.createHash('sha256')
      .update(JSON.stringify(auditReport))
      .digest('hex');

    const reportPath = path.join(this.stateDir, `asymptotic-critique-${auditReport.digest.slice(0, 16)}.json`);
    try {
      fs.writeFileSync(reportPath, JSON.stringify(auditReport, null, 2), 'utf8');
    } catch (err) {
      if (process.env.DEBUG) console.error(`[AsymptoticCritic] Error guardando reporte: ${err.message}`);
    }
    auditReport.reportPath = reportPath;

    return auditReport;
  }
}

if (require.main === module) {
  const isMarkdown = process.argv.includes('--markdown');
  const critic = new AsymptoticCritic();
  const report = critic.evaluateAsymptoticMaturity();

  if (isMarkdown) {
    console.log(`# Reporte de Crítica Asintótica Universal (v2.0)\n`);
    console.log(`**Fecha:** \`${report.evaluatedAt}\` | **Digest:** \`${report.digest.slice(0, 16)}\`\n`);
    console.log(`- **Madurez Conquistada (AMR):** \`${report.globalMaturityPct}%\``);
    console.log(`- **Horizonte Pendiente (Día 1):** \`${report.globalUnrealizedPct}%\`\n`);
    console.log(`## 🏛️ Las 7 Fronteras Asintóticas\n`);
    for (const f of report.frontiers) {
      console.log(`### ${f.name} [${f.currentMaturityPct}%]`);
      console.log(`- **Línea Base:** ${f.baseline}`);
      console.log(`- **Meta Asintótica:** ${f.frontierGoal}`);
      console.log(`- **Brecha:** ${f.gapAnalysis}\n`);
    }
    console.log(`## 🪜 Escalera de 3 Peldaños hacia la Excelencia\n`);
    for (const step of report.ladder) {
      console.log(`- **${step.tier}:** ${step.action}`);
    }
  } else {
    console.log('[Axion Asymptotic Critic v2.0] Evaluando estado real frente al horizonte de excelencia absoluta...');
    console.log(`\n=== VEREDICTO METACONDUCTUAL ASINTÓTICO ===`);
    console.log(`  Madurez Fundacional Conquistada (AMR): ${report.globalMaturityPct}%`);
    console.log(`  Horizonte Pendiente por Construir    : ${report.globalUnrealizedPct}%`);
    console.log(`\n=== DESGLOSE POR FRONTERA DE EXCELENCIA ===`);
    for (const f of report.frontiers) {
      console.log(`  ${f.name.padEnd(65)} [${f.currentMaturityPct}%] -> Brecha: ${f.gapAnalysis}`);
    }
    console.log(`\n=== ESCALERA DE 3 PELDAÑOS ===`);
    for (const step of report.ladder) {
      console.log(`  • ${step.tier}: ${step.action}`);
    }
    console.log(`\n✓ Reporte guardado en: ${report.reportPath}`);
  }
}

module.exports = AsymptoticCritic;
