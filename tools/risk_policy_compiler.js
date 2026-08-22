'use strict';

const RISK_DOMAIN = Object.freeze(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

// Modos de enforcement que el runtime sabe honrar. Un valor fuera de esta lista es una
// declaracion que nadie puede cumplir, asi que se rechaza en lugar de ignorarse.
const SUPPORTED_ENFORCEMENT = Object.freeze(['DOCUMENT_ONLY', 'RUNTIME_ENFORCED_BY_WORKFLOW_RUNNER']);
const SUPPORTED_REQUIREMENTS = Object.freeze([
  'written_human_approval',
  'explicit_scope',
  'executable_check',
  'rollback_plan',
  'independent_audit',
]);

function indentation(line) {
  return (line.match(/^ */) || [''])[0].length;
}

function compileRiskPolicy(source) {
  if (typeof source !== 'string' || source.trim() === '') {
    throw new TypeError('La política de riesgo debe ser texto YAML no vacío.');
  }

  const gates = Object.create(null);
  const declaredRequirements = [];
  let enforcement = null;
  let section = null;
  let currentLevel = null;

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+$/, '');
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;

    const indent = indentation(line);
    if (indent === 0) {
      if (trimmed.startsWith('enforcement:')) {
        enforcement = trimmed.slice('enforcement:'.length).trim();
      }
      currentLevel = null;
      section = trimmed === 'levels:'
        ? 'levels'
        : trimmed === 'required_for_high_or_critical:'
          ? 'required'
          : null;
      continue;
    }

    if (section === 'levels' && indent === 2 && /^([A-Z]+):$/.test(trimmed)) {
      currentLevel = trimmed.slice(0, -1);
      continue;
    }

    if (section === 'levels' && currentLevel && indent === 4) {
      const match = trimmed.match(/^human_gate_required:\s*(true|false|conditional)$/);
      if (match) {
        gates[currentLevel] = match[1] === 'true'
          ? true
          : match[1] === 'false'
            ? false
            : 'conditional';
      }
      continue;
    }

    if (section === 'required' && indent === 2 && trimmed.startsWith('- ')) {
      declaredRequirements.push(trimmed.slice(2).trim());
    }
  }

  for (const level of RISK_DOMAIN) {
    if (!Object.prototype.hasOwnProperty.call(gates, level)) {
      throw new Error(`La política no declara human_gate_required para ${level}.`);
    }
  }

  // Ausente equivale a DOCUMENT_ONLY: no declarar enforcement no puede otorgarlo.
  if (enforcement === null) enforcement = 'DOCUMENT_ONLY';
  if (!SUPPORTED_ENFORCEMENT.includes(enforcement)) {
    throw new Error(`Modo de enforcement no soportado por el runtime: ${enforcement}.`);
  }

  if (declaredRequirements.length === 0) {
    throw new Error('La política no declara requisitos HIGH/CRITICAL.');
  }

  const seen = new Set();
  for (const requirement of declaredRequirements) {
    if (!SUPPORTED_REQUIREMENTS.includes(requirement)) {
      throw new Error(`Requisito no soportado por el runtime: ${requirement}.`);
    }
    if (seen.has(requirement)) {
      throw new Error(`Requisito normativo duplicado: ${requirement}.`);
    }
    seen.add(requirement);
  }

  return Object.freeze({
    domain: RISK_DOMAIN,
    enforcement,
    levels: Object.freeze(Object.fromEntries(RISK_DOMAIN.map((level) => [
      level,
      Object.freeze({
        humanGateRequired: gates[level],
        requirements: Object.freeze(
          level === 'HIGH' || level === 'CRITICAL'
            ? [...declaredRequirements]
            : [],
        ),
      }),
    ]))),
  });
}

function evaluateRiskRequirements(compiledPolicy, risk, facts = {}) {
  const normalizedRisk = typeof risk === 'string' ? risk.trim().toUpperCase() : null;
  if (!normalizedRisk || !compiledPolicy.domain.includes(normalizedRisk)) {
    return Object.freeze({
      risk: normalizedRisk,
      satisfied: false,
      missing: Object.freeze(['valid_risk_identity']),
    });
  }

  const required = compiledPolicy.levels[normalizedRisk].requirements;
  const satisfiedRequirements = facts.satisfiedRequirements instanceof Set
    ? facts.satisfiedRequirements
    : new Set();
  const missing = required.filter((requirement) => {
    if (requirement === 'explicit_scope') {
      return !Array.isArray(facts.scope)
        || facts.scope.length === 0
        || facts.scope.some((entry) => typeof entry !== 'string' || entry.trim() === '');
    }
    return !satisfiedRequirements.has(requirement);
  });

  return Object.freeze({
    risk: normalizedRisk,
    satisfied: missing.length === 0,
    missing: Object.freeze(missing),
  });
}

module.exports = {
  RISK_DOMAIN,
  SUPPORTED_REQUIREMENTS,
  SUPPORTED_ENFORCEMENT,
  compileRiskPolicy,
  evaluateRiskRequirements,
};
