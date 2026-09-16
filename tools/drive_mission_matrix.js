#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Categorized Mission Matrix & Backlog Organizer
 *
 * Organizador y clasificador multidimensional de misiones para /drive:
 * 1. Estructura las misiones en 4 cuadrantes claros:
 *    - [NUEVA FUNCIÓN]: Innovaciones, herramientas utilitarias y módulos nuevos.
 *    - [AUTO-CURACIÓN]: Bucles de convergencia profunda, síntesis de parches AST e inferencia semántica.
 *    - [BACKLOG / RECORDATORIO]: Tareas de largo alcance pendientes o pospuestas en sesiones previas.
 *    - [OPTIMIZACIÓN & RIGOR]: Rendimiento, invariantes y robustez de hardware.
 * 2. Limita la presentación a entre 3 y 5 opciones claras y etiquetadas para evitar sobrecarga cognitiva.
 * 3. Permite al usuario cambiar de enfoque temático instantáneamente sin perder el rastro del backlog.
 * 4. Persiste el estado del backlog en .axion/state/mission_backlog_matrix.json.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const { verifyBacklogItemEvidence } = require('./mission_context.js');

const ROOT = path.resolve(__dirname, '..');

const QUADRANTS = {
  NEW_FEATURE: { tag: '✨ [NUEVA FUNCIÓN]', label: 'Nuevas Capacidades y Módulos' },
  AUTO_HEALING: { tag: '🔄 [AUTO-CURACIÓN]', label: 'Bucles de Corrección y Síntesis AST' },
  BACKLOG_RESUME: { tag: '📌 [BACKLOG / RECORDATORIO]', label: 'Misiones Pendientes y Sellados' },
  CORE_ENGINEERING: { tag: '⚡ [OPTIMIZACIÓN & RIGOR]', label: 'Rendimiento y Gobernanza' }
};

class DriveMissionMatrix {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
    this.stateDir = path.join(this.root, '.axion', 'state');
    this.backlogFile = path.join(this.stateDir, 'mission_backlog_matrix.json');
  }

  ensureStateDir() {
    if (!fs.existsSync(this.stateDir)) {
      fs.mkdirSync(this.stateDir, { recursive: true });
    }
  }

  _getDefaultPendingBacklog() {
    return [
      {
        id: 'BACKLOG_HIST_01_RELEASE_GA',
        quadrant: 'BACKLOG_RESUME',
        title: 'Sellado Criptográfico Merkle Total y Certificación Release v1.2.0-GA',
        description: 'Generar la atestación formal in-toto DSSE Ed25519 sobre todo el repositorio (histórico v1.2.0).',
        evidenceTrigger: null,
        evidence: [],
        status: 'OBSOLETE_CANDIDATE',
        confidence: 'UNVERIFIED',
        verified: false
      },
      {
        id: 'BACKLOG_HIST_02_STRESS_SIMULATOR',
        quadrant: 'STRESS_BENCHMARK',
        title: 'Simulador de Cargas Extremas y Benchmarking Asintótico de 50.000 Transacciones',
        description: 'Simular 50.000 operaciones concurrentes en SQLite para medir latencias sub-milisegundo bajo estrés (histórico).',
        evidenceTrigger: null,
        evidence: [],
        status: 'OBSOLETE_CANDIDATE',
        confidence: 'UNVERIFIED',
        verified: false
      },
      {
        id: 'BACKLOG_HIST_03_FORENSIC_TELEMETRY',
        quadrant: 'NEW_FEATURE',
        title: 'Motor de Telemetría Forense y Detección de Regresiones en Tiempo Real',
        description: 'Capturar diffs de estado y diagnósticos de memoria tras cada ciclo de ejecución para auditoría continua (histórico).',
        evidenceTrigger: null,
        evidence: [],
        status: 'OBSOLETE_CANDIDATE',
        confidence: 'UNVERIFIED',
        verified: false
      },
      {
        id: 'BACKLOG_HIST_04_CONVERGENCE_AUTO_RESOLVER',
        quadrant: 'AUTO_HEALING',
        title: 'Auto-Curación y Reconciliación de Tipos AST con Retropropagación Semántica',
        description: 'Resolver automáticamente discrepancias de tipos y contratos en APIs sin intervención humana (histórico).',
        evidenceTrigger: null,
        evidence: [],
        status: 'OBSOLETE_CANDIDATE',
        confidence: 'UNVERIFIED',
        verified: false
      }
    ];
  }

  loadBacklog() {
    if (fs.existsSync(this.backlogFile)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(this.backlogFile, 'utf8'));
        // Clasificación no destructiva de misiones históricas y exigencia de evidencia estructurada
        if (Array.isArray(parsed.pendingBacklog)) {
          parsed.pendingBacklog.forEach(item => {
            const verification = verifyBacklogItemEvidence(item, this.root);
            const title = (item.title || '').toLowerCase();
            const isHistorical = title.includes('v1.2.0') || title.includes('50.000') || title.includes('merkle total') || title.includes('115+');
            if (isHistorical) {
              item.status = 'OBSOLETE_CANDIDATE';
              item.confidence = 'UNVERIFIED';
              item.verified = false;
              item.evidence = verification.capsules;
            } else if (!verification.verified) {
              item.confidence = 'UNVERIFIED';
              item.verified = false;
              item.evidence = verification.capsules;
            } else {
              item.verified = Boolean(item.verified === true && verification.verified);
              item.confidence = item.verified ? 'HIGH' : 'UNVERIFIED';
              item.status = item.status || 'QUEUED';
              item.evidence = verification.capsules;
            }
          });
        }
        return parsed;
      } catch (readErr) {
        // En caso de corrupción, retornar estructura recuperable SIN sobrescribir el archivo en disco
        return {
          corrupted: true,
          readError: readErr.message,
          status: 'RECOVERABLE_CORRUPTED_READ',
          updatedAt: new Date().toISOString(),
          activeFocus: 'NEW_FEATURE',
          completedMissions: [],
          pendingBacklog: this._getDefaultPendingBacklog()
        };
      }
    }
    return {
      updatedAt: new Date().toISOString(),
      activeFocus: 'NEW_FEATURE',
      completedMissions: [],
      pendingBacklog: this._getDefaultPendingBacklog()
    };
  }

  saveBacklog(data) {
    data.updatedAt = new Date().toISOString();
    if (!fs.existsSync(this.stateDir)) {
      fs.mkdirSync(this.stateDir, { recursive: true });
    }
    fs.writeFileSync(this.backlogFile, JSON.stringify(data, null, 2), 'utf8');
  }

  /**
   * Obtiene exclusivamente las misiones del backlog que están activas y verificadas con evidencia física.
   * Con repositorio limpio y sin intención, devuelve un array vacío (cero misiones seleccionables).
   */
  getSelectableMissions() {
    const backlog = this.loadBacklog();
    return (Array.isArray(backlog.pendingBacklog) ? backlog.pendingBacklog : [])
      .filter(item => item.status === 'QUEUED' && item.verified === true);
  }

  /**
   * Genera un catálogo curado de 3 a 5 misiones organizadas por cuadrante según el enfoque actual.
   * Por defecto (fail-closed), oculta misiones canónicas estáticas y backlog no verificado.
   * Solo incluye misiones no verificadas si options.includeUnverified === true.
   */
  generateCuratedMissions({ currentFocus = 'NEW_FEATURE', maxOptions = 4, includeUnverified = false, onlyVerified = false } = {}) {
    const backlog = this.loadBacklog();
    const selectableMissions = this.getSelectableMissions();
    const showUnverified = Boolean(includeUnverified && !onlyVerified);

    if (!showUnverified) {
      if (selectableMissions.length === 0) {
        return {
          status: 'BLOCKED_CONTEXT_REQUIRED',
          activeFocus: currentFocus,
          totalOffered: 0,
          selectableCount: 0,
          missions: [],
          reason: 'Repositorio limpio sin misiones verificables en backlog ni intención observable.'
        };
      }
      const selected = selectableMissions.slice(0, Math.min(5, maxOptions)).map(item => {
        const qKey = item.quadrant || 'NEW_FEATURE';
        const qInfo = QUADRANTS[qKey] || QUADRANTS.NEW_FEATURE;
        return {
          id: item.id,
          quadrant: qKey,
          prefix: qInfo.tag,
          title: item.title,
          description: item.description || item.summary || '',
          evidence: item.evidence || [],
          verified: true,
          confidence: item.confidence || 'HIGH',
          formattedOption: `[${qInfo.tag}] ${item.title} — ${item.description || item.summary || ''}`
        };
      });
      return {
        status: 'READY',
        activeFocus: currentFocus,
        totalOffered: selected.length,
        selectableCount: selectableMissions.length,
        missions: selected
      };
    }

    const curated = [];

    // Priorizar ítems dinámicos del backlog guardado si existen y están activos (no obsoletos)
    const activePending = Array.isArray(backlog.pendingBacklog)
      ? backlog.pendingBacklog.filter(item => item.status !== 'OBSOLETE_CANDIDATE')
      : [];

    if (activePending.length > 0) {
      for (const item of activePending) {
        const qKey = item.quadrant || 'NEW_FEATURE';
        const qInfo = QUADRANTS[qKey] || QUADRANTS.NEW_FEATURE;
        curated.push({
          quadrant: qKey,
          prefix: qInfo.tag,
          title: item.title,
          description: item.description || item.summary || ''
        });
      }
    }

    // Asegurar los 4 cuadrantes con misiones canónicas si se solicitó explícitamente includeUnverified
    const canonicals = [
      {
        quadrant: 'NEW_FEATURE',
        prefix: QUADRANTS.NEW_FEATURE.tag,
        title: 'Orquestación Contextual Gobernada y Verificación Observable',
        description: 'Estructurar el ciclo de ingeniería bajo MissionContext y las 12 skills canónicas.'
      },
      {
        quadrant: 'AUTO_HEALING',
        prefix: QUADRANTS.AUTO_HEALING.tag,
        title: 'Diagnóstico Sistemático y Reconciliación de Suites de Prueba',
        description: 'Detectar y eliminar flakiness temporal en suites sin alterar contratos públicos.'
      },
      {
        quadrant: 'BACKLOG_RESUME',
        prefix: QUADRANTS.BACKLOG_RESUME.tag,
        title: 'Verificación de Atestaciones DSSE y Trazabilidad SLSA Local',
        description: 'Validar sobres in-toto DSSE Ed25519 sobre el estado del repositorio y SBOMs.'
      },
      {
        quadrant: 'CORE_ENGINEERING',
        prefix: QUADRANTS.CORE_ENGINEERING.tag,
        title: 'Auditoría de Salud e Invariantes del Workspace',
        description: 'Ejecutar comprobación de salud de 13 puertas y verificar integridad de esquemas.'
      }
    ];

    for (const c of canonicals) {
      if (!curated.some(x => x.title === c.title)) {
        curated.push(c);
      }
    }

    // Ordenar para que el cuadrante correspondiente a currentFocus aparezca primero
    curated.sort((a, b) => {
      if (a.quadrant === currentFocus && b.quadrant !== currentFocus) return -1;
      if (b.quadrant === currentFocus && a.quadrant !== currentFocus) return 1;
      return 0;
    });

    const selectedMissions = curated.slice(0, Math.min(5, maxOptions));

    return {
      activeFocus: currentFocus,
      status: selectableMissions.length > 0 ? 'READY' : 'UNVERIFIED_CATALOG',
      totalOffered: selectedMissions.length,
      selectableCount: selectableMissions.length,
      missions: selectedMissions.map(m => ({
        quadrant: m.quadrant,
        formattedOption: `${m.prefix} ${m.title} — ${m.description} [NO VERIFICADA]`,
        title: m.title,
        description: m.description
      }))
    };
  }

  /**
   * Actualiza el enfoque temático activo.
   */
  setFocus(focusKey) {
    const backlog = this.loadBacklog();
    backlog.activeFocus = focusKey;
    this.saveBacklog(backlog);
    return backlog;
  }
}

if (require.main === module) {
  const matrix = new DriveMissionMatrix();
  console.log('[Axion Mission Matrix] Generando catálogo curado de 3 a 5 misiones estructuradas:');

  const menu = matrix.generateCuratedMissions({ currentFocus: 'NEW_FEATURE', maxOptions: 4 });
  console.log(`\n=== MENÚ ESTRUCTURADO POR CUADRANTES (${menu.totalOffered} Opciones) ===`);
  menu.missions.forEach((m, idx) => {
    console.log(`\n  Opción ${idx + 1}:`);
    console.log(`    ${m.formattedOption}`);
  });
}

module.exports = DriveMissionMatrix;
