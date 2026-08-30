#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Drive Mission Tracker & Persistent Journal Engine
 *
 * Resuelve el problema de fragmentación y pérdida de contexto entre turnos de /drive:
 * 1. Registra el estado persistente de las misiones en .axion/state/drive_mission_journal.json.
 * 2. Mantiene una máquina de estados: ACTIVE_IN_PROGRESS, COMPLETED, SUSPENDED, PENDING_BACKLOG.
 * 3. Permite a /drive detectar si hay una misión inconclusa para ofrecer proactivamente su REANUDACIÓN.
 * 4. Encadena las misiones secundarias y pendientes directamente al objetivo principal (Línea de Evolución).
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

class DriveMissionTracker {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
    this.stateDir = path.join(this.root, '.axion', 'state');
    this.journalPath = path.join(this.stateDir, 'drive_mission_journal.json');

    if (!fs.existsSync(this.stateDir)) {
      fs.mkdirSync(this.stateDir, { recursive: true });
    }

    this.journal = this.loadJournal();
  }

  loadJournal() {
    if (fs.existsSync(this.journalPath)) {
      try {
        const raw = fs.readFileSync(this.journalPath, 'utf8');
        return JSON.parse(raw);
      } catch (err) {
        // Fallback fail-closed
      }
    }

    return {
      version: '1.0.0',
      activeMission: null,
      pendingBacklog: [],
      completedHistory: [],
      lastUpdated: new Date().toISOString()
    };
  }

  saveJournal() {
    this.journal.lastUpdated = new Date().toISOString();
    this.journal.digest = crypto.createHash('sha256')
      .update(JSON.stringify({
        active: this.journal.activeMission,
        pending: this.journal.pendingBacklog,
        completed: this.journal.completedHistory
      }))
      .digest('hex');

    fs.writeFileSync(this.journalPath, JSON.stringify(this.journal, null, 2), 'utf8');
    return this.journal;
  }

  /**
   * Inicia o actualiza una misión activa.
   */
  startMission(title, description, totalPhases = 3, subtasks = []) {
    const missionId = crypto.randomBytes(6).toString('hex');
    const mission = {
      id: missionId,
      title,
      description,
      status: 'ACTIVE_IN_PROGRESS',
      currentPhase: 1,
      totalPhases,
      subtasks: subtasks.map((t, idx) => ({ id: idx + 1, name: t, status: 'PENDING' })),
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      checkpointId: null
    };

    this.journal.activeMission = mission;
    this.saveJournal();
    return mission;
  }

  /**
   * Actualiza el progreso de la fase o subtarea actual.
   */
  advancePhase(phaseIndex, status = 'IN_PROGRESS', details = {}) {
    if (!this.journal.activeMission) return null;

    const mission = this.journal.activeMission;
    mission.currentPhase = phaseIndex;
    mission.updatedAt = new Date().toISOString();
    mission.lastPhaseDetails = details;

    if (mission.subtasks[phaseIndex - 1]) {
      mission.subtasks[phaseIndex - 1].status = status;
    }

    this.saveJournal();
    return mission;
  }

  /**
   * Completa formalmente la misión activa y la archiva en el historial.
   */
  completeActiveMission(summary = '') {
    if (!this.journal.activeMission) return null;

    const mission = this.journal.activeMission;
    mission.status = 'COMPLETED';
    mission.completedAt = new Date().toISOString();
    mission.summary = typeof summary === 'string' ? summary : (summary ? JSON.stringify(summary) : '');

    this.journal.completedHistory.unshift({ ...mission });
    this.journal.activeMission = null;
    this.saveJournal();
    return mission;
  }

  /**
   * Encola una tarea pendiente en el backlog de la misión principal.
   */
  enqueuePending(title, priority = 'HIGH', metadata = {}) {
    const item = {
      id: crypto.randomBytes(4).toString('hex'),
      title,
      priority,
      metadata,
      enqueuedAt: new Date().toISOString(),
      status: 'PENDING'
    };
    this.journal.pendingBacklog.push(item);
    this.saveJournal();
    return item;
  }

  /**
   * Obtiene las opciones de misión inteligente para el modal de /drive:
   * Si hay misión activa o pendiente, las prioriza para evitar saltos arbitrarios.
   */
  getProactiveMissionOptions() {
    const options = [];

    // 1. Caso: Hay misión activa no terminada
    if (this.journal.activeMission && this.journal.activeMission.status === 'ACTIVE_IN_PROGRESS') {
      const active = this.journal.activeMission;
      options.push({
        isResume: true,
        text: `(Recomendado) ▶️ [Reanudar Misión Inconclusa] ${active.title} — Fase ${active.currentPhase}/${active.totalPhases}. Continuar y sellar los elementos pendientes de esta secuencia.`
      });
    }

    // 2. Caso: Hay tareas pendientes en el backlog encadenadas al objetivo principal
    if (this.journal.pendingBacklog.length > 0) {
      const nextPending = this.journal.pendingBacklog[0];
      options.push({
        isBacklog: true,
        text: `🎯 [Continuación de Objetivo] ${nextPending.title} — Ejecutar la siguiente tarea pendiente del backlog principal.`
      });
    }

    return options;
  }
}

if (require.main === module) {
  const tracker = new DriveMissionTracker();
  console.log('[Axion Mission Tracker] Estado del diario de misiones /drive:');
  const journal = tracker.journal;
  console.log(`  Misión Activa: ${journal.activeMission ? journal.activeMission.title : 'Ninguna (Listo para nueva misión)'}`);
  console.log(`  Pendientes en Backlog: ${journal.pendingBacklog.length}`);
  console.log(`  Historial Completadas: ${journal.completedHistory.length}`);
}

module.exports = DriveMissionTracker;
