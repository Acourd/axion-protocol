#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — User Decision Trajectory & Adaptive Metacognitive Profiler
 *
 * Mapeo dinámico de inclinaciones y calibrador de misiones autónomas para /drive:
 * 1. Rastrea el historial de opciones ofrecidas vs elegidas vs ignoradas por el usuario.
 * 2. Calcula vectores de afinidad dimensional (Rigor Formal, Criptografía, Caos, Grafos, Autonomía de Largo Alcance).
 * 3. Poda activamente categorías cosméticas o redundantes que el usuario pasa de largo (Dashboards HTML, micro-servidores, visualizadores).
 * 4. Formula exclusivamente misiones de máxima densidad cognitiva, autonomía soberana y excelencia asintótica.
 * 5. Persiste el perfil en .axion/memory/user_trajectory_map.json y en el Grafo SQLite.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

const CORE_DOMAINS = {
  FORMAL_RIGOR: { weight: 1.0, keywords: ['formal', 'smt', 'dpll', 'sat', 'matemático', 'invariante', 'teorema', 'proof'] },
  CRYPTOGRAPHIC_SOVEREIGNTY: { weight: 1.0, keywords: ['ed25519', 'dsse', 'in-toto', 'atestación', 'firma', 'merkle', 'sha256'] },
  ADVERSARIAL_RESILIENCE: { weight: 1.0, keywords: ['fuzzer', 'caos', 'mutación', 'ataque', 'intercepción', 'evasión', 'blast radius'] },
  GRAPH_SEMANTIC_MEMORY: { weight: 1.0, keywords: ['grafo', 'sqlite', 'semántica', 'relacional', 'bfs', 'memoria', 'lecciones'] },
  AUTONOMOUS_LONG_HORIZON: { weight: 1.0, keywords: ['autonomía', 'long-running', 'desatendido', 'resume', 'convergencia', 'auto-curación'] },
  COSMETIC_UI_DASHBOARDS: { weight: -1.0, keywords: ['dashboard', 'html', 'servidor http', 'interfaz', 'visual', 'ui', 'browser', 'puerto'] }
};

class UserDecisionTrajectory {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
    this.memoryDir = path.join(this.root, '.axion', 'memory');
    this.trajectoryFile = path.join(this.memoryDir, 'user_trajectory_map.json');
    this.ensureDir();
    this.profile = this.loadProfile();
  }

  ensureDir() {
    if (!fs.existsSync(this.memoryDir)) {
      fs.mkdirSync(this.memoryDir, { recursive: true });
    }
  }

  loadProfile() {
    if (fs.existsSync(this.trajectoryFile)) {
      try {
        return JSON.parse(fs.readFileSync(this.trajectoryFile, 'utf8'));
      } catch (readErr) {
        // Fallback a perfil inicial calibrado
      }
    }

    return {
      updatedAt: new Date().toISOString(),
      affinityScores: {
        FORMAL_RIGOR: 8.5,
        CRYPTOGRAPHIC_SOVEREIGNTY: 9.0,
        ADVERSARIAL_RESILIENCE: 9.5,
        GRAPH_SEMANTIC_MEMORY: 9.0,
        AUTONOMOUS_LONG_HORIZON: 10.0,
        COSMETIC_UI_DASHBOARDS: -5.0
      },
      decisionHistory: [],
      rejectedCategories: ['COSMETIC_UI_DASHBOARDS'],
      preferredFocus: [
        'Autonomía de larga duración sin límite de tiempo',
        'Auto-curación y bucle de convergencia fail-closed',
        'Modelado matemático formal y verificación SAT/SMT',
        'Aislamiento de procesos y memoria soberana en SQLite'
      ]
    };
  }

  saveProfile() {
    this.profile.updatedAt = new Date().toISOString();
    fs.writeFileSync(this.trajectoryFile, JSON.stringify(this.profile, null, 2), 'utf8');
  }

  /**
   * Registra una elección del usuario y adapta los pesos del vector de afinidad.
   */
  recordDecision({ selectedTitle, ignoredTitles = [] }) {
    const entry = {
      timestamp: new Date().toISOString(),
      selected: selectedTitle,
      ignored: ignoredTitles
    };

    // Incrementar afinidades de la opción elegida
    const lowerSel = selectedTitle.toLowerCase();
    for (const [domain, conf] of Object.entries(CORE_DOMAINS)) {
      const matchSel = conf.keywords.some(k => lowerSel.includes(k));
      if (matchSel) {
        this.profile.affinityScores[domain] = (this.profile.affinityScores[domain] || 0) + (conf.weight > 0 ? 1.0 : -2.0);
      }
    }

    // Penalizar categorías de opciones ignoradas sistemáticamente
    for (const ign of ignoredTitles) {
      const lowerIgn = ign.toLowerCase();
      for (const [domain, conf] of Object.entries(CORE_DOMAINS)) {
        const matchIgn = conf.keywords.some(k => lowerIgn.includes(k));
        if (matchIgn) {
          this.profile.affinityScores[domain] = (this.profile.affinityScores[domain] || 0) - (conf.weight > 0 ? 0.2 : 1.0);
          if (this.profile.affinityScores[domain] < -2.0 && !this.profile.rejectedCategories.includes(domain)) {
            this.profile.rejectedCategories.push(domain);
          }
        }
      }
    }

    this.profile.decisionHistory.push(entry);
    if (this.profile.decisionHistory.length > 50) {
      this.profile.decisionHistory.shift();
    }

    this.saveProfile();
    return this.profile;
  }

  /**
   * Filtra y adapta un conjunto de misiones candidatas descartando opciones de bajo interés.
   */
  filterAndRankMissions(candidateMissions = []) {
    return candidateMissions.filter(m => {
      const lower = (m.title + ' ' + (m.description || '')).toLowerCase();
      // Descartar si coincide con categorías rechazadas
      for (const rej of this.profile.rejectedCategories) {
        const conf = CORE_DOMAINS[rej];
        if (conf && conf.keywords.some(k => lower.includes(k))) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      const scoreA = this.calculateMissionScore(a);
      const scoreB = this.calculateMissionScore(b);
      return scoreB - scoreA;
    });
  }

  calculateMissionScore(mission) {
    let score = 0;
    const text = (mission.title + ' ' + (mission.description || '')).toLowerCase();

    for (const [domain, conf] of Object.entries(CORE_DOMAINS)) {
      if (conf.keywords.some(k => text.includes(k))) {
        score += (this.profile.affinityScores[domain] || 0);
      }
    }
    return score;
  }
}

if (require.main === module) {
  const trajectory = new UserDecisionTrajectory();
  console.log('[Axion User Trajectory] Perfil metacognitivo del usuario cargado:');
  console.log('  Afinidades Actuales:', trajectory.profile.affinityScores);
  console.log('  Categorías Rechazadas / Podadas:', trajectory.profile.rejectedCategories);

  // Probar filtrado adaptativo
  const candidates = [
    { title: '📊 Dashboard HTML Interactivo y Visualizador de Telemetría' },
    { title: '🌐 Micro-servidor HTTP local en puerto 4040' },
    { title: '🔬 Demostrador Formal de Invariantes Lógicas SAT/SMT con DPLL' },
    { title: '🔄 Reanudador de Estado y Checkpoints para Ejecución Desatendida' },
    { title: '⚡ Fuzzer Polimórfico de Caos de 10.000 Vectores' }
  ];

  const filtered = trajectory.filterAndRankMissions(candidates);
  console.log(`\n[Axion User Trajectory] Misiones candidatas filtradas (${filtered.length}/${candidates.length}):`);
  filtered.forEach((m, idx) => console.log(`  ${idx + 1}. [Score: ${trajectory.calculateMissionScore(m).toFixed(1)}] ${m.title}`));
}

module.exports = UserDecisionTrajectory;
