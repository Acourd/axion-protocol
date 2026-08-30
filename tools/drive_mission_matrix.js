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
    this.ensureStateDir();
  }

  ensureStateDir() {
    if (!fs.existsSync(this.stateDir)) {
      fs.mkdirSync(this.stateDir, { recursive: true });
    }
  }

  loadBacklog() {
    if (fs.existsSync(this.backlogFile)) {
      try {
        return JSON.parse(fs.readFileSync(this.backlogFile, 'utf8'));
      } catch (readErr) {
        // En caso de corrupción, retornar backlog por defecto
      }
    }
    return {
      updatedAt: new Date().toISOString(),
      activeFocus: 'NEW_FEATURE',
      completedMissions: [],
      pendingBacklog: [
        {
          id: 'BACKLOG_01_RELEASE_SEAL_GA',
          quadrant: 'BACKLOG_RESUME',
          title: 'Sellado Criptográfico Merkle Total y Certificación Release v1.2.0-GA',
          description: 'Generar la atestación formal in-toto DSSE Ed25519 sobre todo el repositorio.'
        },
        {
          id: 'FEATURE_02_PLUGIN_PACKAGER',
          quadrant: 'NEW_FEATURE',
          title: 'Generador y Empaquetador Autónomo de Módulos & Plugins Zero-Dependency',
          description: 'Añadir a /drive la capacidad de construir y registrar nuevas herramientas completas.'
        },
        {
          id: 'HEALING_03_SEMANTIC_TYPE_RESOLVER',
          quadrant: 'AUTO_HEALING',
          title: 'Auto-Curación AST Multi-Fase con Inferencia Semántica de Tipos y Contratos',
          description: 'Resolver automáticamente discrepancias de API y exports en bucle cerrado.'
        }
      ]
    };
  }

  saveBacklog(data) {
    data.updatedAt = new Date().toISOString();
    fs.writeFileSync(this.backlogFile, JSON.stringify(data, null, 2), 'utf8');
  }

  /**
   * Genera un catálogo curado de 3 a 5 misiones organizadas por cuadrante según el enfoque actual.
   */
  generateCuratedMissions({ currentFocus = 'NEW_FEATURE', maxOptions = 4 } = {}) {
    const backlog = this.loadBacklog();
    const curated = [];

    // Priorizar ítems dinámicos del backlog guardado si existen
    if (Array.isArray(backlog.pendingBacklog) && backlog.pendingBacklog.length > 0) {
      for (const item of backlog.pendingBacklog) {
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

    // Asegurar los 4 cuadrantes con misiones canónicas si la lista es corta
    const canonicals = [
      {
        quadrant: 'NEW_FEATURE',
        prefix: QUADRANTS.NEW_FEATURE.tag,
        title: 'Generador y Empaquetador Autónomo de Módulos & Plugins Zero-Dependency',
        description: 'Permitir a /drive construir, aislar y registrar nuevas herramientas funcionales completas con 1 clic.'
      },
      {
        quadrant: 'AUTO_HEALING',
        prefix: QUADRANTS.AUTO_HEALING.tag,
        title: 'Motor de Auto-Curación AST Multi-Fase con Inferencia Semántica',
        description: 'Sintetizar parches automáticos para resolver dependencias faltantes y discrepancias de contratos en bucle cerrado.'
      },
      {
        quadrant: 'BACKLOG_RESUME',
        prefix: QUADRANTS.BACKLOG_RESUME.tag,
        title: 'Sellado Criptográfico Merkle Total y Certificación Release v1.2.0-GA',
        description: 'Emitir el sobre DSSE in-toto v1 con firma Ed25519 sobre los 270+ archivos y sellar la versión definitiva.'
      },
      {
        quadrant: 'CORE_ENGINEERING',
        prefix: QUADRANTS.CORE_ENGINEERING.tag,
        title: 'Simulador de Cargas Extremas y Benchmarking Asintótico Concurrente',
        description: 'Simular 50.000 operaciones en paralelo para auditar latencias y consistencia bajo estrés.'
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
      totalOffered: selectedMissions.length,
      missions: selectedMissions.map(m => ({
        quadrant: m.quadrant,
        formattedOption: `${m.prefix} ${m.title} — ${m.description}`,
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
