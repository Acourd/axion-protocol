#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Long-Term Mission Vault & Visual Presentation Formatter
 *
 * Bóveda persistente de misiones y formateador visual de alta fidelidad para /drive:
 * 1. Mantiene un reservorio completo e indexado de misiones pasadas, presentes y emergentes en .axion/state/mission_vault.json.
 * 2. Formatea visualmente las opciones con tipografía limpia, insignias de alta legibilidad y descripciones concisas.
 * 3. Permite archivar, posponer y re-emerger misiones en función del valor técnico acumulado y el contexto activo.
 * 4. Evita el olvido de tareas de largo alcance aunque no se muestren en el selector inmediato.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const { verifyBacklogItemEvidence } = require('./mission_context.js');

const ROOT = path.resolve(__dirname, '..');

const BADGES = {
  NEW_FEATURE: { icon: '✨', label: 'NUEVA FUNCIÓN', color: 'cyan' },
  AUTO_HEALING: { icon: '🔄', label: 'AUTO-CURACIÓN', color: 'green' },
  RELEASE_SEAL: { icon: '📜', label: 'RELEASE & SELLO', color: 'gold' },
  STRESS_BENCHMARK: { icon: '⚡', label: 'INGENIERÍA & ESTRÉS', color: 'magenta' },
  GOVERNANCE: { icon: '🛡️', label: 'GOBERNANZA', color: 'blue' },
  COGNITIVE_REASONING: { icon: '🧠', label: 'PENSAMIENTO PROFUNDO', color: 'purple' },
  TOKEN_ECONOMY: { icon: '📉', label: 'AHORRO DE TOKENS', color: 'emerald' }
};

class MissionBacklogVault {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
    this.stateDir = path.join(this.root, '.axion', 'state');
    this.vaultFile = path.join(this.stateDir, 'mission_vault.json');
  }

  ensureStateDir() {
    if (!fs.existsSync(this.stateDir)) {
      fs.mkdirSync(this.stateDir, { recursive: true });
    }
  }

  _getDefaultReservoir() {
    return [
      {
        id: 'M_HIST_001_RELEASE_GA',
        category: 'RELEASE_SEAL',
        title: 'Sellado Criptográfico Merkle Total y Certificación Release v1.2.0-GA',
        summary: 'Atestación formal in-toto DSSE Ed25519 sobre los 270+ archivos del repositorio (histórico v1.2.0).',
        evidenceTrigger: null,
        evidence: [],
        status: 'OBSOLETE_CANDIDATE',
        confidence: 'UNVERIFIED',
        verified: false,
        priority: 10
      },
      {
        id: 'M_HIST_002_STRESS_SIMULATOR',
        category: 'STRESS_BENCHMARK',
        title: 'Simulador de Cargas Extremas y Benchmarking Asintótico de 50.000 Transacciones',
        summary: 'Simular 50.000 operaciones concurrentes en SQLite para medir latencias sub-milisegundo (histórico).',
        evidenceTrigger: null,
        evidence: [],
        status: 'OBSOLETE_CANDIDATE',
        confidence: 'UNVERIFIED',
        verified: false,
        priority: 10
      },
      {
        id: 'M_HIST_003_FORENSIC_TELEMETRY',
        category: 'NEW_FEATURE',
        title: 'Motor de Telemetría Forense y Detección de Regresiones en Tiempo Real',
        summary: 'Capturar diffs de estado y diagnósticos de memoria tras cada ciclo de ejecución para auditoría continua (histórico).',
        evidenceTrigger: null,
        evidence: [],
        status: 'OBSOLETE_CANDIDATE',
        confidence: 'UNVERIFIED',
        verified: false,
        priority: 10
      },
      {
        id: 'M_HIST_004_CONVERGENCE_AUTO_RESOLVER',
        category: 'AUTO_HEALING',
        title: 'Auto-Curación y Reconciliación de Tipos AST con Retropropagación Semántica',
        summary: 'Resolver automáticamente discrepancias de tipos y contratos en APIs sin intervención humana (histórico).',
        evidenceTrigger: null,
        evidence: [],
        status: 'OBSOLETE_CANDIDATE',
        confidence: 'UNVERIFIED',
        verified: false,
        priority: 10
      }
    ];
  }

  loadVault() {
    if (fs.existsSync(this.vaultFile)) {
      try {
        const vault = JSON.parse(fs.readFileSync(this.vaultFile, 'utf8'));
        // Clasificación no destructiva de misiones históricas y exigencia de evidencia para verified
        if (Array.isArray(vault.reservoir)) {
          vault.reservoir.forEach(item => {
            const verification = verifyBacklogItemEvidence(item, this.root);
            const title = (item.title || '').toLowerCase();
            const isHistorical = title.includes('v1.2.0') || title.includes('50.000') || title.includes('merkle total') || title.includes('115+');
            if (isHistorical) {
              if (item.status !== 'ARCHIVED' && item.status !== 'POSTPONED') {
                item.status = 'OBSOLETE_CANDIDATE';
              }
              item.confidence = 'UNVERIFIED';
              item.verified = false;
              item.evidence = verification.capsules;
            } else if (!verification.verified) {
              // Estar en cola no demuestra verificabilidad: sin evidencia observable verificable, queda UNVERIFIED
              item.confidence = 'UNVERIFIED';
              item.verified = false;
              item.evidence = verification.capsules;
            } else {
              item.verified = Boolean(item.verified === true && verification.verified);
              item.confidence = item.verified ? 'HIGH' : 'UNVERIFIED';
              item.evidence = verification.capsules;
            }
          });
        }
        return vault;
      } catch (readErr) {
        // En caso de corrupción, devolver estado recuperable SIN sobrescribir el archivo en disco
        return {
          version: '1.4.0',
          corrupted: true,
          readError: readErr.message,
          status: 'RECOVERABLE_CORRUPTED_READ',
          updatedAt: new Date().toISOString(),
          activeFocus: 'GENERAL',
          reservoir: this._getDefaultReservoir()
        };
      }
    }
    return {
      version: '1.4.0',
      updatedAt: new Date().toISOString(),
      activeFocus: 'GENERAL',
      reservoir: this._getDefaultReservoir()
    };
  }

  saveVault(vault) {
    this.ensureStateDir();
    vault.updatedAt = new Date().toISOString();
    fs.writeFileSync(this.vaultFile, JSON.stringify(vault, null, 2), 'utf8');
  }

  /**
   * Formatea una opción de manera limpia, elegante y visualmente atractiva.
   */
  formatOptionDisplay(mission, isRecommended = false) {
    const badge = BADGES[mission.category] || { icon: '📌', label: mission.category };
    const recPrefix = isRecommended ? '(Recomendado) ' : '';
    const unverifiedTag = (mission.verified === true) ? '' : ' [NO VERIFICADA]';
    return `${recPrefix}${badge.icon} [${badge.label}] ${mission.title} — ${mission.summary}${unverifiedTag}`;
  }

  /**
   * Obtiene exclusivamente las misiones activas que cuentan con evidencia verificable real.
   * Con repositorio limpio y sin intención, devuelve un array vacío (cero misiones seleccionables).
   */
  getSelectableMissions(limit = 4, contextText = '') {
    const vault = this.loadVault();
    const selectable = vault.reservoir
      .filter(m => m.status === 'QUEUED' && m.verified === true)
      .map(m => {
        const affinity = this.computeContextAffinity(m, contextText);
        return {
          ...m,
          effectivePriority: (m.priority || 0) + affinity
        };
      })
      .sort((a, b) => b.effectivePriority - a.effectivePriority);

    return selectable.slice(0, limit);
  }

  /**
   * Obtiene la selección curada de misiones formateadas visualmente respetando afinidad contextual.
   * Por defecto (fail-closed), oculta misiones históricas y no verificadas.
   * Solo incluye misiones no verificadas si options.includeUnverified === true.
   */
  getVisualMissionSelection(limit = 4, contextText = '', options = {}) {
    const vault = this.loadVault();
    const includeUnverified = Boolean(options.includeUnverified);
    const requireOnlyVerified = Boolean(options.onlyVerified) || !includeUnverified;

    if (requireOnlyVerified) {
      const selectable = this.getSelectableMissions(limit, contextText);
      if (selectable.length === 0) {
        return {
          status: 'BLOCKED_CONTEXT_REQUIRED',
          totalInReservoir: vault.reservoir.length,
          displayedCount: 0,
          selectableCount: 0,
          options: [],
          reason: 'No hay misiones activas verificables en el reservorio.'
        };
      }
      return {
        status: 'READY',
        totalInReservoir: vault.reservoir.length,
        displayedCount: selectable.length,
        selectableCount: selectable.length,
        options: selectable.map((m, idx) => ({
          id: m.id,
          category: m.category,
          title: m.title,
          summary: m.summary,
          effectivePriority: m.effectivePriority,
          formattedOption: this.formatOptionDisplay(m, idx === 0)
        }))
      };
    }

    const sorted = vault.reservoir
      .map(m => {
        const affinity = this.computeContextAffinity(m, contextText);
        return {
          ...m,
          effectivePriority: (m.priority || 0) + affinity
        };
      })
      .sort((a, b) => b.effectivePriority - a.effectivePriority);

    const selected = sorted.slice(0, limit);
    const selectableCount = vault.reservoir.filter(m => m.status === 'QUEUED' && m.verified === true).length;

    return {
      status: selectableCount > 0 ? 'READY' : 'UNVERIFIED_CATALOG',
      totalInReservoir: vault.reservoir.length,
      displayedCount: selected.length,
      selectableCount,
      options: selected.map((m, idx) => ({
        id: m.id,
        category: m.category,
        title: m.title,
        summary: m.summary,
        effectivePriority: m.effectivePriority,
        formattedOption: this.formatOptionDisplay(m, idx === 0)
      }))
    };
  }

  /**
   * Agrega una nueva misión al reservorio de la bóveda.
   */
  addMission(mission) {
    if (!mission || !mission.title) return null;
    const vault = this.loadVault();
    const id = mission.id || `M_${Date.now().toString(36).toUpperCase()}_${(mission.category || 'GEN').toUpperCase()}`;
    const verification = verifyBacklogItemEvidence(mission, this.root);
    const newMission = {
      id,
      category: mission.category || 'NEW_FEATURE',
      title: mission.title,
      summary: mission.summary || mission.description || '',
      evidenceTrigger: mission.evidenceTrigger || null,
      evidence: verification.capsules,
      status: mission.status || 'QUEUED',
      confidence: verification.confidence,
      verified: Boolean(verification.verified && mission.verified === true),
      priority: Number(mission.priority) || 80,
      createdAt: new Date().toISOString()
    };
    vault.reservoir.push(newMission);
    this.saveVault(vault);
    return newMission;
  }

  /**
   * Archiva una misión completada o descartada.
   */
  archiveMission(missionId) {
    const vault = this.loadVault();
    const target = vault.reservoir.find(m => m.id === missionId);
    if (!target) return false;
    target.status = 'ARCHIVED';
    target.archivedAt = new Date().toISOString();
    this.saveVault(vault);
    return true;
  }

  /**
   * Pospone una misión bajando su prioridad relativa.
   */
  postponeMission(missionId) {
    const vault = this.loadVault();
    const target = vault.reservoir.find(m => m.id === missionId);
    if (!target) return false;
    target.status = 'POSTPONED';
    target.priority = Math.max(10, (target.priority || 50) - 20);
    target.postponedAt = new Date().toISOString();
    this.saveVault(vault);
    return true;
  }

  /**
   * Re-emerge una misión pospuesta o archivada de vuelta a la cola activa.
   */
  reemergeMission(missionId, newPriority = 90) {
    const vault = this.loadVault();
    const target = vault.reservoir.find(m => m.id === missionId);
    if (!target) return false;
    target.status = 'QUEUED';
    target.priority = Number(newPriority) || 90;
    target.reemergedAt = new Date().toISOString();
    this.saveVault(vault);
    return true;
  }

  /**
   * Calcula el peso de afinidad contextual para una misión según la intención del usuario.
   */
  computeContextAffinity(mission, contextText = '') {
    if (!contextText || typeof contextText !== 'string') return 0;
    const lower = contextText.toLowerCase();
    let score = 0;

    // Patrones de Pensamiento / Razonamiento Profundo
    const cogPatterns = ['pensamiento', 'razonamiento', 'thinking', 'profundidad', 'metacognit', 'deductiv', 'anthropic', 'openai', 'o1', 'sonnet', 'cognitiv'];
    if (cogPatterns.some(k => lower.includes(k))) {
      if (mission.category === 'COGNITIVE_REASONING') score += 50;
    }

    // Patrones de Ahorro de Tokens / Eficiencia de Recursos
    const tokPatterns = ['token', 'ahorro', 'eficiencia', 'recurso', 'cuota', 'limite', 'gasto', 'contexto', 'roundtrip', 'overhead'];
    if (tokPatterns.some(k => lower.includes(k))) {
      if (mission.category === 'TOKEN_ECONOMY') score += 45;
    }

    // Patrones de Gobernanza y Seguridad
    const govPatterns = ['gobernanza', 'seguridad', 'vulnerabilidad', 'fail-closed', 'preflight', 'in-toto', 'dsse'];
    if (govPatterns.some(k => lower.includes(k))) {
      if (mission.category === 'GOVERNANCE' || mission.category === 'RELEASE_SEAL') score += 30;
    }

    // Si el usuario no menciona explícitamente aspectos visuales o CSS, despriorizar misiones cosméticas
    const visPatterns = ['web', 'css', 'tema', 'visual', 'estetica', 'ui', 'color', 'diseño'];
    const isVisualRequested = visPatterns.some(k => lower.includes(k));
    if (!isVisualRequested && (mission.id.startsWith('M_VIS_') || (mission.category === 'AUTO_HEALING' && mission.title.includes('Visual')))) {
      score -= 25;
    }

    return score;
  }
}

if (require.main === module) {
  const vault = new MissionBacklogVault();
  console.log('[Axion Mission Vault] Generando presentación visual curada de misiones:');

  const selection = vault.getVisualMissionSelection(4);
  console.log(`\n=== RESERVORIO TOTAL: ${selection.totalInReservoir} MISIONES (Mostrando ${selection.displayedCount}) ===\n`);

  selection.options.forEach((opt, idx) => {
    console.log(`  ${idx + 1}. ${opt.formattedOption}\n`);
  });
}

module.exports = MissionBacklogVault;
