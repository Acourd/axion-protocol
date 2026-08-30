#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Drive State Resumer & Checkpoint Resume Engine
 *
 * Motor de persistencia y reanudación determinista de misiones interrumpidas para /drive:
 * 1. Persiste el avance fase por fase en .axion/state/active_mission_session.json.
 * 2. Si una sesión se interrumpe (corte de red, reinicio, límite de tiempo), detecta el último checkpoint verificado.
 * 3. Reanuda la ejecución saltando exactamente las fases ya completadas sin re-ejecución redundante.
 * 4. Sella la finalización de la misión archivando el estado en el historial.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

class DriveStateResumer {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
    this.stateDir = path.join(this.root, '.axion', 'state');
    this.sessionFile = path.join(this.stateDir, 'active_mission_session.json');
    this.ensureStateDir();
  }

  ensureStateDir() {
    if (!fs.existsSync(this.stateDir)) {
      fs.mkdirSync(this.stateDir, { recursive: true });
    }
  }

  loadActiveSession() {
    if (!fs.existsSync(this.sessionFile)) return null;
    try {
      return JSON.parse(fs.readFileSync(this.sessionFile, 'utf8'));
    } catch (readErr) {
      return null;
    }
  }

  saveSession(sessionData) {
    fs.writeFileSync(this.sessionFile, JSON.stringify(sessionData, null, 2), 'utf8');
  }

  /**
   * Inicia una nueva misión o reanuda una sesión incompleta preexistente.
   */
  startOrResumeMission({ missionId, title = 'Misión Autónoma /drive', phases = [] }) {
    const existing = this.loadActiveSession();

    // Caso Reanudación: Misma misión o misión activa en progreso
    if (existing && existing.status === 'IN_PROGRESS' && (existing.missionId === missionId || !missionId)) {
      const completedSet = new Set(existing.completedPhases.map(p => p.name));
      const remainingPhases = phases.filter(p => !completedSet.has(p));
      const startPhaseIndex = phases.findIndex(p => !completedSet.has(p));

      return {
        isResumed: true,
        missionId: existing.missionId,
        title: existing.title,
        status: existing.status,
        startedAt: existing.startedAt,
        completedPhases: existing.completedPhases,
        remainingPhases,
        startPhaseIndex: startPhaseIndex === -1 ? phases.length : startPhaseIndex,
        session: existing
      };
    }

    // Caso Nueva Sesión
    const newSession = {
      missionId: missionId || `mission_${Date.now()}`,
      title,
      status: 'IN_PROGRESS',
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      phasesTotal: phases.length,
      completedPhases: [],
      lastCheckpointId: null
    };

    this.saveSession(newSession);

    return {
      isResumed: false,
      missionId: newSession.missionId,
      title: newSession.title,
      status: newSession.status,
      startedAt: newSession.startedAt,
      completedPhases: [],
      remainingPhases: [...phases],
      startPhaseIndex: 0,
      session: newSession
    };
  }

  /**
   * Registra la compleción exitosa de una fase de la misión.
   */
  recordPhaseCompletion(phaseName, metadata = {}, checkpointId = null) {
    const session = this.loadActiveSession();
    if (!session || session.status !== 'IN_PROGRESS') {
      return { success: false, reason: 'Sin sesión activa en progreso' };
    }

    const completedEntry = {
      name: phaseName,
      completedAt: new Date().toISOString(),
      metadata,
      checkpointId
    };

    // Evitar duplicados
    session.completedPhases = session.completedPhases.filter(p => p.name !== phaseName);
    session.completedPhases.push(completedEntry);
    session.updatedAt = new Date().toISOString();
    if (checkpointId) {
      session.lastCheckpointId = checkpointId;
    }

    this.saveSession(session);
    return {
      success: true,
      phaseName,
      completedCount: session.completedPhases.length,
      session
    };
  }

  /**
   * Sella la misión como completada.
   */
  markMissionCompleted() {
    const session = this.loadActiveSession();
    if (!session) return { success: false, reason: 'Sin sesión activa' };

    session.status = 'COMPLETED';
    session.completedAt = new Date().toISOString();
    session.updatedAt = session.completedAt;

    this.saveSession(session);
    return {
      success: true,
      missionId: session.missionId,
      status: 'COMPLETED',
      session
    };
  }

  /**
   * Descarta o limpia la sesión activa.
   */
  discardActiveSession() {
    if (fs.existsSync(this.sessionFile)) {
      try {
        fs.unlinkSync(this.sessionFile);
        return { success: true, reason: 'Sesión descartada' };
      } catch (unlinkErr) {
        return { success: false, reason: unlinkErr.message };
      }
    }
    return { success: true, reason: 'Sin sesión activa previa' };
  }
}

if (require.main === module) {
  const resumer = new DriveStateResumer();
  console.log('[Axion State Resumer] Simulando ciclo de interrupción y reanudación de misión:');

  const phases = ['01_RESEARCH', '02_IMPLEMENTATION', '03_VERIFICATION', '04_ATTESTATION'];

  // 1. Iniciar misión
  console.log('\n  1. Iniciando nueva misión...');
  const init = resumer.startOrResumeMission({ missionId: 'MISSION_SIMULATION', title: 'Misión de Prueba de Reanudación', phases });
  console.log(`     IsResumed: ${init.isResumed} · StartPhase: ${init.startPhaseIndex} (${phases[init.startPhaseIndex]})`);

  // 2. Completar 2 fases
  resumer.recordPhaseCompletion('01_RESEARCH', { query: 'Invariantes' }, 'cp_001');
  resumer.recordPhaseCompletion('02_IMPLEMENTATION', { files: ['module.js'] }, 'cp_002');
  console.log('  2. Fases 01_RESEARCH y 02_IMPLEMENTATION completadas y guardadas.');

  // 3. Simular interrupción e invocar startOrResumeMission
  console.log('\n  3. Simulando reinicio de sesión y reanudando misión...');
  const resume = resumer.startOrResumeMission({ missionId: 'MISSION_SIMULATION', title: 'Misión de Prueba de Reanudación', phases });
  console.log(`     IsResumed: ${resume.isResumed} · StartPhase: ${resume.startPhaseIndex} (${phases[resume.startPhaseIndex]})`);
  console.log(`     Fases restantes: [${resume.remainingPhases.join(', ')}]`);

  // 4. Completar restantes y sellar
  resumer.recordPhaseCompletion('03_VERIFICATION', { pass: true }, 'cp_003');
  resumer.recordPhaseCompletion('04_ATTESTATION', { dsse: true }, 'cp_004');
  const completed = resumer.markMissionCompleted();
  console.log(`\n  4. Misión sellada: Status [${completed.status}]`);

  resumer.discardActiveSession();
  console.log('  5. Sesión temporal descartada limpiamente.');
}

module.exports = DriveStateResumer;
