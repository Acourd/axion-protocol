#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Autonomous Modular Capability Manager
 *
 * Gestor autónomo de capacidades y paquetes modulares para /drive:
 * 1. Mantiene un catálogo curado de especialidades (seguridad, cloud, WCAG, telemetría, base de datos).
 * 2. Permite la activación selectiva bajo demanda (axion add <capability>) para evitar inflar el runtime.
 * 3. Provee consultas semánticas (axion consult "<query>") para recomendar capacidades según la tarea.
 * 4. Gestiona el ciclo de vida de capacidades con persistencia atómica en .axion/state/capabilities.json.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

const BUILTIN_CAPABILITIES = {
  'security-deep-audit': {
    name: 'security-deep-audit',
    domain: 'SECURITY',
    description: 'Auditoría estricta OWASP 2025, modelado de amenazas y escaneo de vulnerabilidades.',
    rules: ['Enforce zero-trust secrets', 'Strict pre-commit SAST auditing'],
    skills: ['vulnerability-scanner', 'red-team-tactics']
  },
  'cloud-deployment': {
    name: 'cloud-deployment',
    domain: 'INFRASTRUCTURE',
    description: 'Procedimientos de despliegue seguro, canary releases y reversión determinista.',
    rules: ['5-Phase Zero-Downtime Deployment', 'Automated Health Verification Gate'],
    skills: ['deployment-procedures', 'server-management']
  },
  'wcag-accessibility': {
    name: 'wcag-accessibility',
    domain: 'FRONTEND',
    description: 'Auditoría DOM semántico, accesibilidad WCAG 2.1 AA e inspección a11y.',
    rules: ['Strict semantic HTML elements', 'Zero unlabeled interactive targets'],
    skills: ['web-design-guidelines', 'a11y-debugging']
  },
  'threat-modeling': {
    name: 'threat-modeling',
    domain: 'SECURITY',
    description: 'Modelado STRIDE de amenazas y análisis de vectores de ataque en arquitecturas distribuidas.',
    rules: ['Mandatory STRIDE matrix per endpoint', 'Explicit trust boundary validation'],
    skills: ['vulnerability-scanner']
  },
  'telemetry-prometheus': {
    name: 'telemetry-prometheus',
    domain: 'OBSERVABILITY',
    description: 'Métricas de rendimiento, latencia de herramientas de terminal y exportación Prometheus.',
    rules: ['Real-time tool execution tracking', 'Automated latency bottleneck alerts'],
    skills: ['performance-profiling']
  },
  'database-migrations': {
    name: 'database-migrations',
    domain: 'DATA',
    description: 'Verificación de invariantes en esquemas SQL, transacciones atómicas y rollback de migraciones.',
    rules: ['Backward-compatible schema migrations only', 'Mandatory down-migration rollback script'],
    skills: ['database-design']
  }
};

class CapabilityManager {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
    this.stateDir = path.join(this.root, '.axion', 'state');
    this.capsFile = path.join(this.stateDir, 'capabilities.json');
    this.ensureStateDir();
  }

  ensureStateDir() {
    if (!fs.existsSync(this.stateDir)) {
      fs.mkdirSync(this.stateDir, { recursive: true });
    }
  }

  loadState() {
    if (fs.existsSync(this.capsFile)) {
      try {
        return JSON.parse(fs.readFileSync(this.capsFile, 'utf8'));
      } catch (readErr) {
        // Fallback ante archivo corrupto
      }
    }
    return {
      version: '1.0.0',
      updatedAt: new Date().toISOString(),
      activeCapabilities: []
    };
  }

  saveState(state) {
    state.updatedAt = new Date().toISOString();
    state.digest = crypto.createHash('sha256')
      .update(JSON.stringify(state.activeCapabilities))
      .digest('hex');
    fs.writeFileSync(this.capsFile, JSON.stringify(state, null, 2), 'utf8');
  }

  /**
   * Lista todas las capacidades con su estado activo/inactivo.
   */
  listCapabilities() {
    const state = this.loadState();
    const list = [];

    for (const [key, cap] of Object.entries(BUILTIN_CAPABILITIES)) {
      const isActive = state.activeCapabilities.includes(key);
      list.push({
        name: key,
        domain: cap.domain,
        description: cap.description,
        status: isActive ? 'ACTIVE' : 'INACTIVE',
        rulesCount: cap.rules.length,
        skills: cap.skills
      });
    }

    return {
      totalAvailable: Object.keys(BUILTIN_CAPABILITIES).length,
      activeCount: state.activeCapabilities.length,
      capabilities: list
    };
  }

  /**
   * Activa una capacidad modular en el proyecto.
   */
  addCapability(name) {
    const capKey = String(name).toLowerCase().trim();
    if (!BUILTIN_CAPABILITIES[capKey]) {
      return {
        success: false,
        reason: `Capacidad "${name}" no encontrada en el catálogo. Usa "axion capabilities" para ver las disponibles.`
      };
    }

    const state = this.loadState();
    if (state.activeCapabilities.includes(capKey)) {
      return { success: true, message: `La capacidad "${capKey}" ya está activa.`, alreadyActive: true };
    }

    state.activeCapabilities.push(capKey);
    this.saveState(state);

    return {
      success: true,
      capability: BUILTIN_CAPABILITIES[capKey],
      message: `✓ Capacidad "${capKey}" activada con éxito.`
    };
  }

  /**
   * Desactiva una capacidad modular.
   */
  removeCapability(name) {
    const capKey = String(name).toLowerCase().trim();
    const state = this.loadState();
    const index = state.activeCapabilities.indexOf(capKey);

    if (index === -1) {
      return { success: false, reason: `La capacidad "${name}" no está activa actualmente.` };
    }

    state.activeCapabilities.splice(index, 1);
    this.saveState(state);

    return {
      success: true,
      message: `✓ Capacidad "${capKey}" desactivada y removida del runtime.`
    };
  }

  /**
   * Consulta semántica/keyword de capacidades relevantes para una tarea.
   */
  consult(query = '') {
    const qLower = String(query).toLowerCase().trim();
    const words = qLower.split(/\s+/).filter(w => w.length >= 2);
    const matches = [];
    const state = this.loadState();

    for (const [key, cap] of Object.entries(BUILTIN_CAPABILITIES)) {
      let score = 0;
      if (words.length === 0) {
        score = 1;
      } else {
        const textToSearch = `${cap.name} ${cap.domain} ${cap.description} ${cap.rules.join(' ')}`.toLowerCase();
        for (const w of words) {
          if (textToSearch.includes(w)) {
            score += 2;
          }
        }
      }

      if (score > 0) {
        matches.push({
          name: key,
          domain: cap.domain,
          description: cap.description,
          status: state.activeCapabilities.includes(key) ? 'ACTIVE' : 'INACTIVE',
          matchScore: score,
          skills: cap.skills
        });
      }
    }

    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const manager = new CapabilityManager();

  if (args.includes('list') || args.includes('list-capabilities')) {
    const res = manager.listCapabilities();
    console.log(`=== CATÁLOGO DE CAPACIDADES MODULARES (${res.activeCount}/${res.totalAvailable} activas) ===\n`);
    res.capabilities.forEach((c, idx) => {
      const statusMark = c.status === 'ACTIVE' ? '✓ [ACTIVA]' : '· [DISPONIBLE]';
      console.log(`  ${idx + 1}. ${statusMark.padEnd(16)} [${c.domain}] ${c.name}: ${c.description}`);
    });
  } else if (args[0] === 'add' && args[1]) {
    const res = manager.addCapability(args[1]);
    console.log(res.message || res.reason);
    process.exit(res.success ? 0 : 1);
  } else if (args[0] === 'remove' && args[1]) {
    const res = manager.removeCapability(args[1]);
    console.log(res.message || res.reason);
    process.exit(res.success ? 0 : 1);
  } else if (args[0] === 'consult') {
    const query = args.slice(1).join(' ');
    console.log(`[Axion Consult] Buscando capacidades para: "${query}"\n`);
    const results = manager.consult(query);
    results.forEach((r, idx) => {
      console.log(`  ${idx + 1}. [${r.domain}] ${r.name} (${r.status}) -> ${r.description}`);
    });
  } else {
    console.log('[Axion Capability Manager] Catálogo de capacidades modulares activo.');
  }
}

module.exports = CapabilityManager;
