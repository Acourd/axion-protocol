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

const ROOT = path.resolve(__dirname, '..');

const BADGES = {
  NEW_FEATURE: { icon: '✨', label: 'NUEVA FUNCIÓN', color: 'cyan' },
  AUTO_HEALING: { icon: '🔄', label: 'AUTO-CURACIÓN', color: 'green' },
  RELEASE_SEAL: { icon: '📜', label: 'RELEASE & SELLO', color: 'gold' },
  STRESS_BENCHMARK: { icon: '⚡', label: 'INGENIERÍA & ESTRÉS', color: 'magenta' },
  GOVERNANCE: { icon: '🛡️', label: 'GOBERNANZA', color: 'blue' }
};

class MissionBacklogVault {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
    this.stateDir = path.join(this.root, '.axion', 'state');
    this.vaultFile = path.join(this.stateDir, 'mission_vault.json');
    this.ensureStateDir();
  }

  ensureStateDir() {
    if (!fs.existsSync(this.stateDir)) {
      fs.mkdirSync(this.stateDir, { recursive: true });
    }
  }

  loadVault() {
    if (fs.existsSync(this.vaultFile)) {
      try {
        return JSON.parse(fs.readFileSync(this.vaultFile, 'utf8'));
      } catch (readErr) {
        // En caso de corrupción, inicializar
      }
    }
    return {
      version: '1.2.0',
      updatedAt: new Date().toISOString(),
      activeFocus: 'GENERAL',
      reservoir: [
        {
          id: 'M_001_RELEASE_GA',
          category: 'RELEASE_SEAL',
          title: 'Sellado Criptográfico Merkle Total y Certificación Release v1.2.0-GA',
          summary: 'Atestación formal in-toto DSSE Ed25519 sobre los 270+ archivos del repositorio y congelación del CHANGELOG.',
          status: 'QUEUED',
          priority: 95
        },
        {
          id: 'M_002_STRESS_SIMULATOR',
          category: 'STRESS_BENCHMARK',
          title: 'Simulador de Cargas Extremas y Benchmarking Asintótico de 50.000 Transacciones',
          summary: 'Simular 50.000 operaciones concurrentes en SQLite para medir latencias sub-milisegundo bajo estrés.',
          status: 'QUEUED',
          priority: 85
        },
        {
          id: 'M_003_FORENSIC_TELEMETRY',
          category: 'NEW_FEATURE',
          title: 'Motor de Telemetría Forense y Detección de Regresiones en Tiempo Real',
          summary: 'Capturar diffs de estado y diagnósticos de memoria tras cada ciclo de ejecución para auditoría continua.',
          status: 'QUEUED',
          priority: 88
        },
        {
          id: 'M_004_CONVERGENCE_AUTO_RESOLVER',
          category: 'AUTO_HEALING',
          title: 'Auto-Curación y Reconciliación de Tipos AST con Retropropagación Semántica',
          summary: 'Resolver automáticamente discrepancias de tipos y contratos en APIs sin intervención humana.',
          status: 'QUEUED',
          priority: 90
        }
      ]
    };
  }

  saveVault(vault) {
    vault.updatedAt = new Date().toISOString();
    fs.writeFileSync(this.vaultFile, JSON.stringify(vault, null, 2), 'utf8');
  }

  /**
   * Formatea una opción de manera limpia, elegante y visualmente atractiva.
   */
  formatOptionDisplay(mission, isRecommended = false) {
    const badge = BADGES[mission.category] || { icon: '📌', label: mission.category };
    const recPrefix = isRecommended ? '(Recomendado) ' : '';
    return `${recPrefix}${badge.icon} [${badge.label}] ${mission.title} — ${mission.summary}`;
  }

  /**
   * Agrega una nueva misión al reservorio de la bóveda.
   */
  addMission(mission) {
    if (!mission || !mission.title) return null;
    const vault = this.loadVault();
    const id = mission.id || `M_${Date.now().toString(36).toUpperCase()}_${(mission.category || 'GEN').toUpperCase()}`;
    const newMission = {
      id,
      category: mission.category || 'NEW_FEATURE',
      title: mission.title,
      summary: mission.summary || mission.description || '',
      status: mission.status || 'QUEUED',
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
   * Obtiene la selección curada de misiones formateadas visualmente respetando el reservorio completo.
   */
  getVisualMissionSelection(limit = 4) {
    const vault = this.loadVault();
    const sorted = vault.reservoir
      .filter(m => m.status === 'QUEUED')
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    const selected = sorted.slice(0, limit);

    return {
      totalInReservoir: vault.reservoir.length,
      displayedCount: selected.length,
      options: selected.map((m, idx) => ({
        id: m.id,
        category: m.category,
        title: m.title,
        summary: m.summary,
        formattedOption: this.formatOptionDisplay(m, idx === 0)
      }))
    };
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
