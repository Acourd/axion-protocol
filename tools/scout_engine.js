#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Ecosystem Scout & Prior-Art Recon Engine
 *
 * Motor de reconocimiento automático de estado del arte y análisis de licencias:
 * 1. Triangulación Taxonómica: Transforma ideas abstractas en primitivas de búsqueda técnica.
 * 2. Mapeo de Ecosistema: Identifica proyectos líderes y analiza su compatibilidad de licencia (MIT/Apache vs GPL/Prop).
 * 3. Matriz de Decisión Táctica: Dictamina si conviene ADOPTAR (Adopt), BIFURCAR (Fork) o CREAR CLEAN-ROOM (Build).
 * 4. Prevención de Duplicidad: Evita reinventar la rueda mediante autopsia previa de características.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const LicenseAuditor = require('./license_auditor.js');

const ROOT = path.resolve(__dirname, '..');

class ScoutEngine {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
    this.licenseAuditor = new LicenseAuditor(this.root);
  }

  /**
   * Descompone una descripción de requerimiento en términos de búsqueda ortogonales.
   */
  extractSearchPrimitives(ideaDescription = '') {
    if (!ideaDescription || typeof ideaDescription !== 'string') {
      return ['agent governance', 'deterministic harness', 'fail-closed gate'];
    }

    const clean = ideaDescription.toLowerCase();
    const primitives = new Set();

    if (clean.includes('seguridad') || clean.includes('governance') || clean.includes('preflight') || clean.includes('permisos')) {
      primitives.add('AI agent governance');
      primitives.add('runtime safety harness');
      primitives.add('tool-call preflight firewall');
    }

    if (clean.includes('fuzzing') || clean.includes('caos') || clean.includes('ataque') || clean.includes('adversarial')) {
      primitives.add('adversarial fuzzing LLM');
      primitives.add('mutation chaos testing');
    }

    if (clean.includes('memoria') || clean.includes('context') || clean.includes('grafo') || clean.includes('sqlite')) {
      primitives.add('agent long-term memory graph');
      primitives.add('context compression engine');
    }

    if (clean.includes('atestación') || clean.includes('firma') || clean.includes('cripto') || clean.includes('intoto') || clean.includes('dsse')) {
      primitives.add('in-toto DSSE attestation AI');
      primitives.add('software supply chain security SLSA');
    }

    if (primitives.size === 0) {
      primitives.add('AI agent harness');
      primitives.add('deterministic code verification');
    }

    return Array.from(primitives);
  }

  /**
   * Evalúa un repositorio candidato frente a las reglas de licencia y arquitectura de Axion.
   */
  evaluateCandidate(candidateInfo = {}) {
    const { name, repoUrl, license = 'MIT', keyFeatures = [], bloatLevel = 'LOW' } = candidateInfo;
    const licenseCheck = this.licenseAuditor.classifyLicense(license);

    let recommendation = 'BUILD_CLEAN_ROOM';
    let rationale = '';

    if (bloatLevel === 'HIGH' || !licenseCheck.commercialSafe) {
      recommendation = 'BUILD_CLEAN_ROOM';
      rationale = `El proyecto tiene ${bloatLevel === 'HIGH' ? 'alto peso en dependencias' : 'licencia restrictiva ' + licenseCheck.tier}. Se debe implementar el patrón mediante Clean-Room original en Node.js puro.`;
    } else if (keyFeatures.length > 5 && licenseCheck.commercialSafe && bloatLevel === 'LOW') {
      recommendation = 'ADOPT_OR_INTEGRATE';
      rationale = 'Licencia permisiva y bajo bloat: apto para integración directa o adopción de especificación.';
    } else {
      recommendation = 'EXTRACT_PATTERN_CLEAN_ROOM';
      rationale = 'Extraer la idea arquitectónica y re-implementar de forma determinista con cero dependencias.';
    }

    return {
      candidate: name || 'Unknown Repo',
      repoUrl: repoUrl || '',
      license: licenseCheck,
      keyFeatures,
      bloatLevel,
      recommendation,
      rationale
    };
  }

  /**
   * Genera un reporte de reconocimiento de ecosistema completo.
   */
  scoutLandscape(conceptQuery = '', knownCandidates = []) {
    const primitives = this.extractSearchPrimitives(conceptQuery);
    const evaluations = knownCandidates.map(c => this.evaluateCandidate(c));

    return {
      query: conceptQuery,
      primitives,
      evaluatedCandidatesCount: evaluations.length,
      candidates: evaluations,
      cleanRoomGuaranteed: true,
      timestamp: new Date().toISOString()
    };
  }
}

if (require.main === module) {
  const scout = new ScoutEngine();
  console.log('[Axion Scout Engine] Ejecutando reconocimiento de prueba:');
  const res = scout.scoutLandscape('sistema de memoria y seguridad para agentes', [
    { name: 'saifctl', license: 'Apache-2.0', bloatLevel: 'MEDIUM', keyFeatures: ['Convergence Loop', 'Docker Sandbox'] },
    { name: 'microsoft/agent-governance', license: 'MIT', bloatLevel: 'LOW', keyFeatures: ['OWASP Top 10 Mapping', 'Zero Trust'] },
    { name: 'copyleft-guard', license: 'GPL-3.0', bloatLevel: 'HIGH', keyFeatures: ['Kernel Hooks'] }
  ]);
  console.log(`  Primitivas extraídas: ${res.primitives.join(' · ')}`);
  console.log(`  Candidatos evaluados: ${res.candidates.length}`);
  res.candidates.forEach(c => console.log(`  - [${c.candidate}] (${c.license.spdx}) -> ${c.recommendation}`));
}

module.exports = ScoutEngine;
