#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Verifiable Mission Context & Evidence-Based Contract Model
 *
 * Lote 1: Orquestación Contextual y Contrato de Misión Gobernada:
 * 1. Extrae exclusivamente hechos observables del entorno local (Git, package, backlog, tests, intención).
 * 2. Cada dato relevante declara source, observedAt, confidence y status.
 * 3. Prohíbe inventar datos no disponibles; si falta contexto crítico devuelve BLOCKED_CONTEXT_REQUIRED.
 * 4. Genera contratos deterministas (MissionContract) basados en evidencia estructurada obligatoria.
 * 5. Clasifica backlog histórico de forma no destructiva como OBSOLETE_CANDIDATE o UNVERIFIED.
 * 6. Enforza estrictamente las 12 skills canónicas del protocolo.
 * 7. Cero relleno estático: contexto con una sola misión genera exactamente una propuesta.
 * 8. Digest SHA-256 reproducible e independiente de timestamps efímeros e IDs aleatorios.
 * 9. Blindaje anti-traversal en localizadores file: y journal: dentro de projectRoot.
 * 10. Verificación física de localizadores Git (status, branch, commit) contra el estado real.
 * 11. Bloqueo estricto de intent: en backlog persistido (solo válido desde el contexto activo).
 * 12. Validación rigurosa de cápsulas completas: observedAt y confidence obligatorios.
 * 13. Cripto-ligadura de evidenceTrigger en el digest canónico.
 * 14. Scope observado no inventado: intenciones sin archivos asociados reciben scope vacío y bloquean mutación.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

const CANONICAL_SKILLS = Object.freeze([
  'attest',
  'clarify',
  'debug',
  'drive',
  'halt',
  'memory',
  'preflight',
  'premortem',
  'profile',
  'review',
  'snapshot',
  'verify'
]);

const AUTONOMY_LEVELS = Object.freeze({
  READ_ONLY: 'READ_ONLY',
  LOCAL_MUTATION: 'LOCAL_MUTATION',
  GIT_LOCAL: 'GIT_LOCAL',
  GIT_REMOTE: 'GIT_REMOTE'
});

const VALID_SOURCES = Object.freeze([
  'LOCAL_FS',
  'GIT_CLI',
  'CALLER_EXPLICIT',
  'CALLER_EXPLICIT_INTENT',
  'AXION_STATE_DIR',
  'LOCAL_TEST_RUNNER',
  'CI_LOGS'
]);

const VALID_STATUSES = Object.freeze([
  'OBSERVED',
  'PROVIDED',
  'STABLE',
  'DIFF_DETECTED',
  'FAILED'
]);

const VALID_CONFIDENCE_LEVELS = Object.freeze(['HIGH', 'MEDIUM', 'LOW']);

/**
 * Serialización canónica interna determinista recursiva.
 * Ordena alfabéticamente las claves de todos los objetos en cualquier nivel de anidamiento.
 * Serializa arrays preservando el orden de sus elementos.
 */
function canonicalJsonStringify(val) {
  if (val === null || typeof val !== 'object') {
    return JSON.stringify(val);
  }
  if (Array.isArray(val)) {
    return '[' + val.map(item => canonicalJsonStringify(item)).join(',') + ']';
  }
  const sortedKeys = Object.keys(val).sort();
  return '{' + sortedKeys.map(k => JSON.stringify(k) + ':' + canonicalJsonStringify(val[k])).join(',') + '}';
}

/**
 * Comprueba de forma estricta si una ruta relativa escapa del directorio raíz (path traversal).
 * Distingue de forma precisa '..' o '../' / '..\\' sin bloquear archivos legítimos que comiencen por '..'.
 */
function isPathTraversing(relPath) {
  if (typeof relPath !== 'string') return true;
  return relPath === '..' ||
         relPath.startsWith('..' + path.sep) ||
         relPath.startsWith('../') ||
         relPath.startsWith('..\\') ||
         path.isAbsolute(relPath);
}

/**
 * Valida si un objeto representa una cápsula estructurada de evidencia verificable completa.
 * Exige estrictamente los 5 campos tipados con enums permitidos:
 * - source: 'LOCAL_FS' | 'GIT_CLI' | 'CALLER_EXPLICIT' | 'CALLER_EXPLICIT_INTENT' | 'AXION_STATE_DIR' | 'LOCAL_TEST_RUNNER' | 'CI_LOGS'
 * - status: 'OBSERVED' | 'PROVIDED' | 'STABLE' | 'DIFF_DETECTED' | 'FAILED'
 * - confidence: 'HIGH' | 'MEDIUM' | 'LOW'
 * - observedAt: ISO-8601 timestamp válido
 * - locator: string no vacío correspondiente con la fuente declarada
 *
 * Correspondencia estricta source <-> locator:
 * - 'LOCAL_FS' / 'AXION_STATE_DIR' <-> file: o journal:
 * - 'GIT_CLI'                      <-> git:
 * - 'CALLER_EXPLICIT' / '...INTENT'<-> intent:
 * - 'LOCAL_TEST_RUNNER'            <-> test:
 * - 'CI_LOGS'                      <-> ci:
 */
function isValidEvidenceCapsule(cap) {
  if (!cap || typeof cap !== 'object') return false;

  // 1. source debe pertenecer a VALID_SOURCES
  if (typeof cap.source !== 'string' || !VALID_SOURCES.includes(cap.source.trim())) {
    return false;
  }

  // 2. status debe pertenecer a VALID_STATUSES
  if (typeof cap.status !== 'string' || !VALID_STATUSES.includes(cap.status.trim())) {
    return false;
  }

  // 3. confidence debe pertenecer a VALID_CONFIDENCE_LEVELS
  if (typeof cap.confidence !== 'string' || !VALID_CONFIDENCE_LEVELS.includes(cap.confidence.trim())) {
    return false;
  }

  // 4. observedAt debe ser un ISO timestamp válido no vacío
  if (typeof cap.observedAt !== 'string' || !cap.observedAt.trim()) return false;
  const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
  if (!isoRegex.test(cap.observedAt.trim())) return false;
  const parsedDate = Date.parse(cap.observedAt);
  if (isNaN(parsedDate)) return false;

  // 5. locator debe ser string no vacío
  if (typeof cap.locator !== 'string' || !cap.locator.trim()) return false;

  // 6. Correspondencia estricta source <-> locator
  const src = cap.source.trim();
  const loc = cap.locator.trim();

  if (loc.startsWith('file:') || loc.startsWith('journal:')) {
    if (src !== 'LOCAL_FS' && src !== 'AXION_STATE_DIR') return false;
    const relPath = loc.slice(loc.indexOf(':') + 1).split('#')[0].trim();
    if (!relPath || isPathTraversing(relPath)) return false;
  } else if (loc.startsWith('git:')) {
    if (src !== 'GIT_CLI') return false;
    if (!loc.startsWith('git:status:') && !loc.startsWith('git:branch:') && !loc.startsWith('git:commit:')) {
      return false;
    }
    const val = loc.slice(loc.indexOf(':', 4) + 1).trim();
    if (!val) return false;
  } else if (loc.startsWith('intent:')) {
    if (src !== 'CALLER_EXPLICIT' && src !== 'CALLER_EXPLICIT_INTENT') return false;
    const val = loc.slice(7).trim();
    if (!val) return false;
  } else if (loc.startsWith('test:')) {
    if (src !== 'LOCAL_TEST_RUNNER') return false;
    const suites = loc.slice(5).split(',').map(s => s.trim()).filter(Boolean);
    if (suites.length === 0 || suites.some(isPathTraversing)) return false;
  } else if (loc.startsWith('ci:')) {
    if (src !== 'CI_LOGS') return false;
    const relPath = loc.slice(3).split('#')[0].trim();
    if (!relPath || isPathTraversing(relPath)) return false;
  } else {
    // Esquema de locator no reconocido
    return false;
  }

  return true;
}

/**
 * Verifica rigurosamente la procedencia y observabilidad de un ítem del backlog.
 * 1. Rechaza path traversal en file: y journal: asegurando contención en projectRoot sin bloquear nombres con '..'.
 * 2. Verifica localizadores git: (status, branch, commit) contra el estado real.
 * 3. Prohíbe intent: en backlog persistido (solo es válido si procede del contexto activo).
 * 4. Exige cápsulas completas con fecha y confianza válidas sin rellenar datos faltantes.
 */
function verifyBacklogItemEvidence(item, projectRoot = ROOT, gitContext = null) {
  if (!item || typeof item !== 'object') {
    return { verified: false, confidence: 'UNVERIFIED', capsules: [] };
  }

  const title = (item.title || '').toLowerCase();
  const isHistorical = title.includes('v1.2.0') || title.includes('50.000') || title.includes('merkle total') || title.includes('115+');
  if (isHistorical) {
    return { verified: false, confidence: 'UNVERIFIED', capsules: [] };
  }

  let rawCapsules = [];
  if (Array.isArray(item.evidence) && item.evidence.length > 0) {
    rawCapsules = item.evidence;
  } else if (item.provenance && typeof item.provenance === 'object') {
    rawCapsules = [item.provenance];
  }

  // Si no hay cápsulas o alguna cápsula es incompleta (sin fecha válida o sin confianza explícita), queda UNVERIFIED
  if (rawCapsules.length === 0 || !rawCapsules.every(isValidEvidenceCapsule)) {
    return { verified: false, confidence: 'UNVERIFIED', capsules: [] };
  }

  const normalizedRoot = path.resolve(projectRoot);
  let allValid = true;

  for (const cap of rawCapsules) {
    const loc = cap.locator.trim();

    // 1. Verificación de file: con anti-traversal estricto (léxico + realpath contra symlinks)
    if (loc.startsWith('file:')) {
      const relPath = loc.slice(5).split('#')[0].trim();
      const resolved = path.resolve(normalizedRoot, relPath);
      const relFromRoot = path.relative(normalizedRoot, resolved);
      // Detección precisa de escape de directorio raíz léxico
      if (isPathTraversing(relFromRoot)) {
        allValid = false;
        break;
      }
      if (!fs.existsSync(resolved)) {
        allValid = false;
        break;
      }
      // Detección de escape mediante enlaces simbólicos hacia fuera del root
      try {
        const realRoot = fs.realpathSync(normalizedRoot);
        const realResolved = fs.realpathSync(resolved);
        const relFromRealRoot = path.relative(realRoot, realResolved);
        if (isPathTraversing(relFromRealRoot)) {
          allValid = false;
          break;
        }
      } catch (_) {
        allValid = false;
        break;
      }
    }
    // 2. Verificación de journal: con anti-traversal estricto (léxico + realpath contra symlinks)
    else if (loc.startsWith('journal:')) {
      const relPath = loc.slice(8).split('#')[0].trim();
      const resolved = path.resolve(normalizedRoot, relPath);
      const relFromRoot = path.relative(normalizedRoot, resolved);
      if (isPathTraversing(relFromRoot)) {
        allValid = false;
        break;
      }
      if (!fs.existsSync(resolved)) {
        allValid = false;
        break;
      }
      // Detección de escape mediante enlaces simbólicos hacia fuera del root
      try {
        const realRoot = fs.realpathSync(normalizedRoot);
        const realResolved = fs.realpathSync(resolved);
        const relFromRealRoot = path.relative(realRoot, realResolved);
        if (isPathTraversing(relFromRealRoot)) {
          allValid = false;
          break;
        }
      } catch (_) {
        allValid = false;
        break;
      }
    }
    // 3. Verificación de git: contra hechos observables en Git
    else if (loc.startsWith('git:')) {
      if (loc.startsWith('git:status:')) {
        const declaredFiles = loc.slice(11).split(',').map(s => s.trim()).filter(Boolean);
        if (declaredFiles.length === 0) {
          allValid = false;
          break;
        }
        let uncommitted = [];
        if (gitContext && Array.isArray(gitContext.uncommittedFiles)) {
          uncommitted = gitContext.uncommittedFiles;
        } else {
          try {
            const porcelain = cp.execSync('git status --porcelain', { cwd: normalizedRoot, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' });
            uncommitted = porcelain
              .split('\n')
              .filter(l => l && l.length > 3)
              .map(l => l.substring(3).trim())
              .filter(Boolean);
          } catch (_) {
            uncommitted = [];
          }
        }
        const matches = declaredFiles.every(f => uncommitted.includes(f));
        if (!matches) {
          allValid = false;
          break;
        }
      } else if (loc.startsWith('git:branch:')) {
        const declaredBranch = loc.slice(11).trim();
        let currentBranch = '';
        if (gitContext && typeof gitContext.branch === 'string') {
          currentBranch = gitContext.branch;
        } else {
          try {
            currentBranch = cp.execSync('git branch --show-current', { cwd: normalizedRoot, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' }).trim();
          } catch (_) {
            currentBranch = '';
          }
        }
        if (!declaredBranch || declaredBranch !== currentBranch) {
          allValid = false;
          break;
        }
      } else if (loc.startsWith('git:commit:')) {
        const declaredCommit = loc.slice(11).trim();
        let currentHead = '';
        if (gitContext && typeof gitContext.head === 'string') {
          currentHead = gitContext.head;
        } else {
          try {
            currentHead = cp.execSync('git rev-parse HEAD', { cwd: normalizedRoot, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' }).trim();
          } catch (_) {
            currentHead = '';
          }
        }
        if (!declaredCommit || declaredCommit !== currentHead) {
          allValid = false;
          break;
        }
      } else {
        allValid = false;
        break;
      }
    }
    // 4. Verificación de test: contra existencia física de archivos de suite
    else if (loc.startsWith('test:')) {
      const declaredSuites = loc.slice(5).split(',').map(s => s.trim()).filter(Boolean);
      if (declaredSuites.length === 0) {
        allValid = false;
        break;
      }
      const allSuitesExist = declaredSuites.every(suitePath => {
        const resolved = path.resolve(normalizedRoot, suitePath);
        const relFromRoot = path.relative(normalizedRoot, resolved);
        if (isPathTraversing(relFromRoot)) return false;
        if (!fs.existsSync(resolved)) return false;
        try {
          const realRoot = fs.realpathSync(normalizedRoot);
          const realResolved = fs.realpathSync(resolved);
          const relFromRealRoot = path.relative(realRoot, realResolved);
          if (isPathTraversing(relFromRealRoot)) return false;
        } catch (_) {
          return false;
        }
        return true;
      });
      if (!allSuitesExist) {
        allValid = false;
        break;
      }
    }
    // 5. Verificación física de ci: contra archivos dentro de projectRoot (workflows o logs)
    else if (loc.startsWith('ci:')) {
      const relPath = loc.slice(3).split('#')[0].trim();
      if (!relPath || isPathTraversing(relPath)) {
        allValid = false;
        break;
      }
      const resolved = path.resolve(normalizedRoot, relPath);
      const relFromRoot = path.relative(normalizedRoot, resolved);
      if (isPathTraversing(relFromRoot)) {
        allValid = false;
        break;
      }
      if (!fs.existsSync(resolved)) {
        allValid = false;
        break;
      }
      try {
        const realRoot = fs.realpathSync(normalizedRoot);
        const realResolved = fs.realpathSync(resolved);
        const relFromRealRoot = path.relative(realRoot, realResolved);
        if (isPathTraversing(relFromRealRoot)) {
          allValid = false;
          break;
        }
      } catch (_) {
        allValid = false;
        break;
      }
    }
    // 6. Bloqueo estricto de intent: en backlog persistido
    else if (loc.startsWith('intent:')) {
      // Un backlog guardado no puede autoafirmar una intención; intent solo es observable en la sesión activa
      allValid = false;
      break;
    }
    // 7. Cualquier otro esquema no reconocido
    else {
      allValid = false;
      break;
    }
  }

  if (!allValid) {
    return { verified: false, confidence: 'UNVERIFIED', capsules: [] };
  }

  return {
    verified: true,
    confidence: 'HIGH',
    capsules: rawCapsules.map(c => ({
      source: c.source.trim(),
      observedAt: c.observedAt.trim(),
      status: c.status.trim(),
      confidence: c.confidence.trim(),
      locator: c.locator.trim()
    }))
  };
}

class MissionContext {
  constructor(projectRoot = ROOT, intentOrOptions = null) {
    this.root = path.resolve(projectRoot);
    this.capturedAt = new Date().toISOString();

    if (typeof intentOrOptions === 'string') {
      this.intentInput = intentOrOptions.trim();
    } else if (intentOrOptions && typeof intentOrOptions === 'object' && typeof intentOrOptions.intent === 'string') {
      this.intentInput = intentOrOptions.intent.trim();
    } else {
      this.intentInput = null;
    }

    this.git = this._observeGit();
    this.packageConfig = this._observePackageConfig();
    this.persistedBacklog = this._observePersistedBacklog();
    this.testState = this._observeTestState();
    this.explicitIntent = this._observeIntent();
    this.confidence = this._computeOverallConfidence();
  }

  _observeGit() {
    try {
      const gitDir = path.join(this.root, '.git');
      if (!fs.existsSync(gitDir)) {
        return {
          source: 'LOCAL_FS',
          observedAt: this.capturedAt,
          confidence: 'LOW',
          status: 'NOT_A_GIT_REPOSITORY',
          isRepo: false,
          branch: null,
          head: null,
          statusShort: '',
          uncommittedFiles: [],
          hasUncommittedChanges: false
        };
      }

      const branch = cp.execSync('git branch --show-current', { cwd: this.root, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' }).trim();
      const head = cp.execSync('git rev-parse HEAD', { cwd: this.root, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' }).trim();
      const porcelain = cp.execSync('git status --porcelain', { cwd: this.root, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' });
      const uncommittedFiles = porcelain
        .split('\n')
        .filter(l => l && l.length > 3)
        .map(l => l.substring(3).trim())
        .filter(Boolean);

      return {
        source: 'GIT_CLI',
        observedAt: this.capturedAt,
        confidence: 'HIGH',
        status: uncommittedFiles.length > 0 ? 'DIFF_DETECTED' : 'OBSERVED',
        isRepo: true,
        branch: branch || 'HEAD_DETACHED',
        head: head || null,
        statusShort: porcelain.trim(),
        uncommittedFiles,
        hasUncommittedChanges: uncommittedFiles.length > 0
      };
    } catch (_) {
      return {
        source: 'GIT_CLI',
        observedAt: this.capturedAt,
        confidence: 'LOW',
        status: 'FAILED',
        isRepo: false,
        branch: null,
        head: null,
        statusShort: '',
        uncommittedFiles: [],
        hasUncommittedChanges: false
      };
    }
  }

  _observePackageConfig() {
    const pkgPath = path.join(this.root, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        return {
          source: 'LOCAL_FS',
          observedAt: this.capturedAt,
          confidence: 'HIGH',
          status: 'OBSERVED',
          name: (typeof pkg.name === 'string' && pkg.name.trim()) ? pkg.name.trim() : null,
          version: (typeof pkg.version === 'string' && pkg.version.trim()) ? pkg.version.trim() : null,
          engines: (pkg.engines && typeof pkg.engines === 'object') ? pkg.engines : {},
          hasDependencies: Boolean(pkg.dependencies && Object.keys(pkg.dependencies).length > 0)
        };
      } catch (_) {
        return {
          source: 'LOCAL_FS',
          observedAt: this.capturedAt,
          confidence: 'LOW',
          status: 'CORRUPTED_JSON',
          name: null,
          version: null,
          engines: {},
          hasDependencies: false
        };
      }
    }
    return {
      source: 'LOCAL_FS',
      observedAt: this.capturedAt,
      confidence: 'LOW',
      status: 'NOT_FOUND',
      name: null,
      version: null,
      engines: {},
      hasDependencies: false
    };
  }

  _observePersistedBacklog() {
    const stateDir = path.join(this.root, '.axion', 'state');
    const matrixFile = path.join(stateDir, 'mission_backlog_matrix.json');
    const vaultFile = path.join(stateDir, 'mission_vault.json');
    const journalFile = path.join(stateDir, 'drive_mission_journal.json');

    const backlogItems = [];
    let hadCorruptFile = false;

    const isObsoleteTitle = (title = '') => {
      const lower = title.toLowerCase();
      return lower.includes('v1.2.0') || lower.includes('50.000') || lower.includes('115+') || lower.includes('merkle total');
    };

    if (fs.existsSync(matrixFile)) {
      try {
        const raw = JSON.parse(fs.readFileSync(matrixFile, 'utf8'));
        if (Array.isArray(raw.pendingBacklog)) {
          raw.pendingBacklog.forEach(item => {
            const obsolete = isObsoleteTitle(item.title || '');
            const verification = verifyBacklogItemEvidence(item, this.root, this.git);
            const verified = Boolean(!obsolete && verification.verified && item.verified === true);
            const confidence = (obsolete || !verified) ? 'UNVERIFIED' : verification.confidence;
            backlogItems.push({
              id: item.id || `M_MATRIX_${backlogItems.length}`,
              title: item.title,
              source: 'AXION_STATE_DIR',
              observedAt: this.capturedAt,
              status: obsolete ? 'OBSOLETE_CANDIDATE' : (item.status || 'QUEUED'),
              confidence,
              verified,
              evidenceTrigger: item.evidenceTrigger || null,
              evidence: verification.capsules,
              raw: item
            });
          });
        }
      } catch (_) {
        hadCorruptFile = true;
      }
    }

    if (fs.existsSync(vaultFile)) {
      try {
        const raw = JSON.parse(fs.readFileSync(vaultFile, 'utf8'));
        if (Array.isArray(raw.reservoir)) {
          raw.reservoir.forEach(item => {
            if (!backlogItems.some(b => b.id === item.id)) {
              const obsolete = isObsoleteTitle(item.title || '');
              const verification = verifyBacklogItemEvidence(item, this.root, this.git);
              const verified = Boolean(!obsolete && verification.verified && item.verified === true);
              const confidence = (obsolete || !verified) ? 'UNVERIFIED' : verification.confidence;
              backlogItems.push({
                id: item.id,
                title: item.title,
                source: 'AXION_STATE_DIR',
                observedAt: this.capturedAt,
                status: obsolete ? 'OBSOLETE_CANDIDATE' : (item.status || 'QUEUED'),
                confidence,
                verified,
                evidenceTrigger: item.evidenceTrigger || null,
                evidence: verification.capsules,
                raw: item
              });
            }
          });
        }
      } catch (_) {
        hadCorruptFile = true;
      }
    }

    let activeMission = null;
    if (fs.existsSync(journalFile)) {
      try {
        const raw = JSON.parse(fs.readFileSync(journalFile, 'utf8'));
        if (raw.activeMission && (raw.activeMission.status === 'ACTIVE_IN_PROGRESS' || raw.activeMission.status === 'OBSERVED')) {
          activeMission = {
            id: raw.activeMission.id || 'M_ACTIVE_RESUME',
            title: raw.activeMission.title || 'Misión Activa Reanudada',
            currentPhase: raw.activeMission.currentPhase || 1,
            source: 'AXION_STATE_DIR',
            observedAt: this.capturedAt,
            confidence: 'HIGH',
            status: 'OBSERVED'
          };
        }
      } catch (_) {
        hadCorruptFile = true;
      }
    }

    return {
      source: 'AXION_STATE_DIR',
      observedAt: this.capturedAt,
      confidence: backlogItems.length > 0 ? 'HIGH' : 'LOW',
      status: hadCorruptFile ? 'RECOVERABLE_PARTIAL_ERROR' : (backlogItems.length > 0 ? 'OBSERVED' : 'EMPTY'),
      items: backlogItems,
      activeMission
    };
  }

  _observeTestState() {
    const testFailuresFile = path.join(this.root, '.axion', 'state', 'test_failures.json');
    if (fs.existsSync(testFailuresFile)) {
      try {
        const raw = JSON.parse(fs.readFileSync(testFailuresFile, 'utf8'));
        const failingSuites = Array.isArray(raw.failingSuites) ? raw.failingSuites : [];
        if (failingSuites.length > 0) {
          return {
            source: 'LOCAL_TEST_RUNNER',
            observedAt: this.capturedAt,
            confidence: 'HIGH',
            status: 'FAILED',
            knownFailingSuites: failingSuites,
            lastExecutionPass: false
          };
        }
      } catch (err) {
        // En caso de error de lectura o JSON corrupto, degradar de forma segura sin abortar
      }
    }

    return {
      source: 'LOCAL_TEST_RUNNER',
      observedAt: this.capturedAt,
      confidence: 'LOW',
      status: 'STABLE',
      knownFailingSuites: [],
      lastExecutionPass: null
    };
  }

  _observeIntent() {
    if (this.intentInput && typeof this.intentInput === 'string' && this.intentInput.trim()) {
      const raw = this.intentInput.trim();
      const lower = raw.toLowerCase();
      const isPureTrigger = ['auto', 'full-auto', 'remote', 'cola', 'queued', 'overnight', 'desatendido'].includes(lower);
      if (isPureTrigger) {
        return {
          source: 'CALLER_EXPLICIT_INTENT',
          observedAt: this.capturedAt,
          confidence: 'UNVERIFIED',
          status: 'TRIGGER_KEYWORD_ONLY',
          text: null,
          triggerKeyword: lower
        };
      }
      return {
        source: 'CALLER_EXPLICIT_INTENT',
        observedAt: this.capturedAt,
        confidence: 'HIGH',
        status: 'PROVIDED',
        text: raw
      };
    }
    return {
      source: 'CALLER_EXPLICIT_INTENT',
      observedAt: this.capturedAt,
      confidence: 'UNVERIFIED',
      status: 'NOT_PROVIDED',
      text: null
    };
  }

  _computeOverallConfidence() {
    if (this.explicitIntent.confidence === 'HIGH') return 'HIGH';
    if (this.git.hasUncommittedChanges && this.git.confidence === 'HIGH') return 'HIGH';
    if (this.persistedBacklog.activeMission && this.persistedBacklog.activeMission.confidence === 'HIGH') return 'HIGH';
    if (this.testState.knownFailingSuites && this.testState.knownFailingSuites.length > 0 && this.testState.confidence === 'HIGH') return 'HIGH';
    if (this.persistedBacklog.items.some(i => i.verified && i.confidence === 'HIGH')) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Valida si existe suficiente contexto observable para proponer trabajo gobernable.
   */
  validateContext() {
    const hasIntent = Boolean(this.explicitIntent.text && this.explicitIntent.confidence === 'HIGH');
    const hasActiveMission = Boolean(this.persistedBacklog.activeMission && this.persistedBacklog.activeMission.confidence === 'HIGH');
    const hasGitChanges = Boolean(this.git.hasUncommittedChanges && this.git.confidence === 'HIGH');
    const hasVerifiedBacklog = Boolean(this.persistedBacklog.items.some(i => i.verified && i.confidence === 'HIGH' && Array.isArray(i.evidence) && i.evidence.length > 0));
    const hasTestFailures = Boolean(this.testState.knownFailingSuites && this.testState.knownFailingSuites.length > 0 && this.testState.confidence === 'HIGH');

    const missingFields = [];
    if (!hasIntent) missingFields.push('explicitIntent');
    if (!hasGitChanges) missingFields.push('gitUncommittedChanges');
    if (!hasActiveMission) missingFields.push('activeMissionInJournal');
    if (!hasVerifiedBacklog) missingFields.push('verifiedBacklogItems');

    if (!hasIntent && !hasActiveMission && !hasGitChanges && !hasVerifiedBacklog && !hasTestFailures) {
      return {
        valid: false,
        status: 'BLOCKED_CONTEXT_REQUIRED',
        missingFields,
        requiredHumanAction: 'Proporciona una intención explícita en la solicitud o realiza una mutación/tarea rastreable en el workspace.',
        reason: 'Contexto insuficiente: no se detectó intención explícita del usuario, cambios Git sin confirmar verificados, misión activa previa, suites fallidas ni backlog verificado con evidencia observable en el estado del repositorio.'
      };
    }

    return {
      valid: true,
      status: 'CONTEXT_VERIFIED',
      overallConfidence: this.confidence,
      missingFields: []
    };
  }

  /**
   * Sintetiza propuestas de misiones fundamentadas estrictamente en hechos observables.
   * Sin relleno artificial ni misiones estáticas de fallback.
   */
  synthesizeEvidenceBasedMissions(maxCount = 5) {
    const validation = this.validateContext();
    if (!validation.valid) {
      return [];
    }

    const proposals = [];

    // Evidencia 1: Cambios sin confirmar en Git (máxima prioridad operacional)
    if (this.git.hasUncommittedChanges && this.git.confidence === 'HIGH') {
      proposals.push({
        id: 'MISSION_UNCOMMITTED_CHANGES',
        title: 'Verificación y Cierre de Cambios No Confirmados',
        objective: 'Inspeccionar, auditar con pruebas incrementales y estabilizar las modificaciones existentes en el árbol de trabajo.',
        evidenceTrigger: `Git status detecta ${this.git.uncommittedFiles.length} archivo(s) modificado(s): ${this.git.uncommittedFiles.slice(0, 3).join(', ')}${this.git.uncommittedFiles.length > 3 ? '...' : ''}`,
        evidence: [
          {
            source: 'GIT_CLI',
            observedAt: this.git.observedAt,
            status: 'DIFF_DETECTED',
            confidence: this.git.confidence,
            locator: `git:status:${this.git.uncommittedFiles.join(',')}`
          }
        ],
        scope: this.git.uncommittedFiles,
        nonScope: ['tools/killswitch.js', 'bin/'],
        risk: this.git.uncommittedFiles.length > 2 ? 'STRUCTURAL' : 'LOCAL',
        dependencies: ['verify', 'review'],
        canonicalSkills: ['drive', 'verify', 'review'],
        candidateTests: ['tests/run_all.js'],
        successCriteria: 'Diff limpio contra requisitos, pruebas unitarias ejecutadas con exit code 0 y confirmación humana para commit.',
        discardCondition: 'Si el usuario instruye revertir (snapshot restore o git restore) los cambios descartables.',
        category: 'ENGINEERING_STABILIZATION',
        initialStatus: 'PLANNED',
        autonomyLevelRequired: 'LOCAL_MUTATION',
        priority: 100
      });
    }

    // Evidencia 2: Misión activa pendiente en el journal
    if (this.persistedBacklog.activeMission && this.persistedBacklog.activeMission.confidence === 'HIGH') {
      proposals.push({
        id: `RESUME_${this.persistedBacklog.activeMission.id}`,
        title: `Reanudar Misión Activa: ${this.persistedBacklog.activeMission.title}`,
        objective: 'Retomar la misión inconclusa registrada en el journal persistido sin reiniciar el contexto.',
        evidenceTrigger: `Journal persistente en .axion/state/drive_mission_journal.json en fase ${this.persistedBacklog.activeMission.currentPhase}.`,
        evidence: [
          {
            source: 'AXION_STATE_DIR',
            observedAt: this.persistedBacklog.activeMission.observedAt,
            status: 'OBSERVED',
            confidence: this.persistedBacklog.activeMission.confidence,
            locator: `journal:.axion/state/drive_mission_journal.json#${this.persistedBacklog.activeMission.id}`
          }
        ],
        scope: ['tools/drive_engine.js', 'tools/drive_mission_tracker.js'],
        nonScope: ['package.json'],
        risk: 'MODERATE',
        dependencies: ['drive', 'verify'],
        canonicalSkills: ['drive', 'verify'],
        candidateTests: ['tests/run_all.js'],
        successCriteria: 'Completar las fases pendientes y registrar cierre exitoso en el journal.',
        discardCondition: 'Si la misión activa fue formalmente cancelada o sustituida por otra prioridad.',
        category: 'BACKLOG_RESUME',
        initialStatus: 'PLANNED',
        autonomyLevelRequired: 'LOCAL_MUTATION',
        priority: 90
      });
    }

    // Evidencia 3: Fallos conocidos en pruebas
    if (this.testState.knownFailingSuites && this.testState.knownFailingSuites.length > 0 && this.testState.confidence === 'HIGH') {
      proposals.push({
        id: 'MISSION_REMEDIATE_FAILING_SUITES',
        title: 'Depuración Sistemática de Pruebas en Rojo',
        objective: 'Aplicar el ciclo /debug en 4 fases para resolver el fallo reproducible sin parches ciegos.',
        evidenceTrigger: `Suites fallidas detectadas: ${this.testState.knownFailingSuites.join(', ')}`,
        evidence: [
          {
            source: 'LOCAL_TEST_RUNNER',
            observedAt: this.testState.observedAt,
            status: 'FAILED',
            confidence: this.testState.confidence,
            locator: `test:${this.testState.knownFailingSuites.join(',')}`
          }
        ],
        scope: this.testState.knownFailingSuites,
        nonScope: ['node_modules', 'dist/'],
        risk: 'TARGETED_FIX',
        dependencies: ['debug', 'verify'],
        canonicalSkills: ['debug', 'verify'],
        candidateTests: this.testState.knownFailingSuites,
        successCriteria: 'Exit code 0 en las suites focalizadas y 100% de la suite global en verde.',
        discardCondition: 'Si el entorno o dependencia externa era la causante del falso negativo y ya fue restablecida.',
        category: 'BUG_DEBUGGING',
        initialStatus: 'PLANNED',
        autonomyLevelRequired: 'LOCAL_MUTATION',
        priority: 95
      });
    }

    // Evidencia 4: Intención explícita del llamador (Scope no inventado: vacío y READ_ONLY si no hay archivos modificados)
    if (this.explicitIntent.text && this.explicitIntent.confidence === 'HIGH') {
      const observedScope = (this.git.hasUncommittedChanges && this.git.confidence === 'HIGH') ? this.git.uncommittedFiles : [];
      proposals.push({
        id: 'MISSION_EXPLICIT_INTENT',
        title: `Requerimiento: ${this.explicitIntent.text.substring(0, 50)}${this.explicitIntent.text.length > 50 ? '...' : ''}`,
        objective: this.explicitIntent.text,
        evidenceTrigger: `Intención explícita provista por el llamador: [intent:${this.explicitIntent.text}]`,
        evidence: [
          {
            source: this.explicitIntent.source,
            observedAt: this.explicitIntent.observedAt,
            status: this.explicitIntent.status,
            confidence: this.explicitIntent.confidence,
            locator: `intent:${this.explicitIntent.text}`
          }
        ],
        scope: observedScope,
        nonScope: ['.git/', 'node_modules/'],
        risk: observedScope.length > 2 ? 'STRUCTURAL' : (observedScope.length > 0 ? 'LOCAL' : 'READ_ONLY_PLAN'),
        dependencies: ['clarify', 'drive', 'verify'],
        canonicalSkills: ['clarify', 'drive', 'verify'],
        candidateTests: ['tests/run_all.js'],
        successCriteria: 'Objetivo implementado bajo TDD y verificado deterministamente con exit code 0.',
        discardCondition: 'Si la clarificación socrática desestima la tarea o el usuario cancela la solicitud.',
        category: 'EXPLICIT_INTENT',
        initialStatus: 'PLANNED',
        autonomyLevelRequired: observedScope.length > 0 ? 'LOCAL_MUTATION' : 'READ_ONLY',
        priority: 85
      });
    }

    // Evidencia 5: Backlog con evidencia observable verificada
    this.persistedBacklog.items
      .filter(item => item.verified && item.confidence === 'HIGH' && Array.isArray(item.evidence) && item.evidence.length > 0)
      .forEach(item => {
        if (!proposals.some(p => p.id === item.id)) {
          proposals.push({
            id: item.id,
            title: item.title,
            objective: item.raw.summary || item.raw.description || 'Completar requerimiento registrado en backlog.',
            evidenceTrigger: `Registrado en backlog con evidencia verificable (${item.source}): ${item.evidence.map(e => e.locator).join('; ')}`,
            evidence: item.evidence,
            scope: item.raw.scope || [],
            nonScope: item.raw.nonScope || ['.git/'],
            risk: item.raw.risk || 'MODERATE',
            dependencies: ['drive', 'verify'],
            canonicalSkills: ['drive', 'verify'],
            candidateTests: ['tests/run_all.js'],
            successCriteria: 'Implementación verificada deterministamente y suite en verde.',
            discardCondition: 'Si el backlog es marcado como superado por otra decisión de diseño.',
            category: item.raw.category || item.raw.quadrant || 'CORE_ENGINEERING',
            initialStatus: 'PLANNED',
            autonomyLevelRequired: (Array.isArray(item.raw.scope) && item.raw.scope.length > 0) ? 'LOCAL_MUTATION' : 'READ_ONLY',
            priority: item.raw.priority || 70
          });
        }
      });

    proposals.sort((a, b) => b.priority - a.priority);
    return proposals.slice(0, Math.min(maxCount, proposals.length));
  }

  createMissionContract(missionData) {
    return new MissionContract(missionData);
  }
}

class MissionContract {
  constructor(missionData) {
    if (!missionData || typeof missionData !== 'object') {
      throw new Error('MissionContract requiere un objeto de datos válido.');
    }
    if (!missionData.title || typeof missionData.title !== 'string' || !missionData.title.trim()) {
      throw new Error('MissionContract requiere title.');
    }
    if (!missionData.objective || typeof missionData.objective !== 'string' || !missionData.objective.trim()) {
      throw new Error('MissionContract requiere objective.');
    }

    // Invariante Nuclear: Cápsulas de evidencia estructurada completas y obligatorias (Fail-closed)
    if (!Array.isArray(missionData.evidence) || missionData.evidence.length === 0) {
      throw new Error('Invariante violada: MissionContract requiere al menos una cápsula estructurada de evidencia (evidence: [{source, observedAt, status, confidence, locator}]).');
    }

    // Validar rigurosamente cada cápsula de evidencia (exige los 5 campos tipados)
    for (const cap of missionData.evidence) {
      if (!isValidEvidenceCapsule(cap)) {
        throw new Error('Invariante violada: Cápsula de evidencia incompleta o inválida en MissionContract (requiere source, observedAt válido, status, confidence y locator).');
      }
    }

    this.title = missionData.title.trim();
    this.objective = missionData.objective.trim();

    // Ordenamiento canónico determinista recursivo de las cápsulas de evidencia
    const normalizedCapsules = missionData.evidence.map(c => ({
      confidence: c.confidence.trim(),
      locator: c.locator.trim(),
      observedAt: c.observedAt.trim(),
      source: c.source.trim(),
      status: c.status.trim()
    })).sort((a, b) => canonicalJsonStringify(a).localeCompare(canonicalJsonStringify(b)));

    this.evidence = Object.freeze(normalizedCapsules.map(c => Object.freeze(c)));

    this.evidenceTrigger = (typeof missionData.evidenceTrigger === 'string' && missionData.evidenceTrigger.trim())
      ? missionData.evidenceTrigger.trim()
      : `Evidencia observable: [${this.evidence.map(e => `${e.source}:${e.locator}`).join('; ')}]`;

    this.scope = Array.isArray(missionData.scope) ? Object.freeze([...missionData.scope].sort()) : Object.freeze([]);
    this.nonScope = Array.isArray(missionData.nonScope) ? Object.freeze([...missionData.nonScope].sort()) : Object.freeze([]);
    this.risk = missionData.risk || (this.scope.length > 2 ? 'STRUCTURAL' : (this.scope.length > 0 ? 'LOCAL' : 'READ_ONLY_PLAN'));
    this.dependencies = Array.isArray(missionData.dependencies) ? Object.freeze([...missionData.dependencies].sort()) : Object.freeze([]);
    this.canonicalSkills = Array.isArray(missionData.canonicalSkills)
      ? Object.freeze([...missionData.canonicalSkills].sort())
      : Object.freeze(this.dependencies.filter(d => CANONICAL_SKILLS.includes(d)).sort());
    this.candidateTests = Array.isArray(missionData.candidateTests) ? Object.freeze([...missionData.candidateTests].sort()) : Object.freeze([]);
    this.successCriteria = missionData.successCriteria || 'Verificación determinista con exit code 0';
    this.discardCondition = missionData.discardCondition || 'Reversión solicitada o contexto invalidado';
    this.category = missionData.category || 'ENGINEERING';
    this.initialStatus = missionData.initialStatus || 'PLANNED';
    this.status = this.initialStatus;

    // Validación estricta fail-closed del nivel de autonomía requerido
    if (missionData.autonomyLevelRequired === undefined || missionData.autonomyLevelRequired === null) {
      this.autonomyLevelRequired = 'READ_ONLY';
    } else {
      this.autonomyLevelRequired = missionData.autonomyLevelRequired;
    }
    const validAutonomyLevels = Object.values(AUTONOMY_LEVELS);
    if (!validAutonomyLevels.includes(this.autonomyLevelRequired)) {
      throw new Error(`Invariante violada: Nivel de autonomía inválido '${this.autonomyLevelRequired}'. Niveles válidos: ${validAutonomyLevels.join(', ')}`);
    }

    // Invariante nuclear: si el scope está vacío, NO se puede autorizar mutación
    if (this.scope.length === 0 && this.autonomyLevelRequired !== 'READ_ONLY') {
      throw new Error('Invariante violada: Misión con scope vacío no puede autorizar mutaciones (autonomyLevelRequired debe ser READ_ONLY hasta que el alcance sea delimitado explícitamente).');
    }

    // Invariante nuclear: validar que todas las skills canónicas requeridas pertenezcan a las 12 canónicas
    for (const skill of this.canonicalSkills) {
      if (!CANONICAL_SKILLS.includes(skill)) {
        throw new Error(`Invariante violada: skill no canónica '${skill}'. Solo se permiten las 12 canónicas: ${CANONICAL_SKILLS.join(', ')}`);
      }
    }
    for (const dep of this.dependencies) {
      if (!CANONICAL_SKILLS.includes(dep)) {
        throw new Error(`Invariante violada: skill no canónica '${dep}' en dependencias de contrato. Solo se permiten: ${CANONICAL_SKILLS.join(', ')}`);
      }
    }

    // Digest canónico determinista y reproducible: incluye evidenceTrigger y tuplas estables de evidencia
    this.contractDigest = this._computeCanonicalDigest();
    this.contractId = missionData.contractId || missionData.id || `MC_${this.contractDigest.slice(0, 12).toUpperCase()}`;
    this.createdAt = missionData.createdAt || this.evidence[0].observedAt;
  }

  _computeCanonicalDigest() {
    // Se extraen estrictamente los atributos canónicos estables y se serializan en orden determinista
    const canonicalPayload = {
      autonomyLevelRequired: this.autonomyLevelRequired,
      candidateTests: [...this.candidateTests].sort(),
      canonicalSkills: [...this.canonicalSkills].sort(),
      category: this.category,
      dependencies: [...this.dependencies].sort(),
      discardCondition: this.discardCondition,
      evidence: this.evidence.map(e => ({
        confidence: e.confidence,
        locator: e.locator,
        source: e.source,
        status: e.status
      })).sort((a, b) => canonicalJsonStringify(a).localeCompare(canonicalJsonStringify(b))),
      evidenceTrigger: this.evidenceTrigger, // Cripto-ligadura con el texto de evidencia visible
      nonScope: [...this.nonScope].sort(),
      objective: this.objective,
      risk: this.risk,
      scope: [...this.scope].sort(),
      successCriteria: this.successCriteria,
      title: this.title
    };
    const serialized = canonicalJsonStringify(canonicalPayload);
    return crypto.createHash('sha256').update(serialized, 'utf8').digest('hex');
  }

  toJSON() {
    return {
      contractId: this.contractId,
      title: this.title,
      objective: this.objective,
      evidence: this.evidence,
      evidenceTrigger: this.evidenceTrigger,
      scope: this.scope,
      nonScope: this.nonScope,
      risk: this.risk,
      dependencies: this.dependencies,
      canonicalSkills: this.canonicalSkills,
      candidateTests: this.candidateTests,
      successCriteria: this.successCriteria,
      discardCondition: this.discardCondition,
      category: this.category,
      initialStatus: this.initialStatus,
      status: this.status,
      autonomyLevelRequired: this.autonomyLevelRequired,
      createdAt: this.createdAt,
      contractDigest: this.contractDigest
    };
  }
}

module.exports = {
  MissionContext,
  MissionContract,
  CANONICAL_SKILLS,
  AUTONOMY_LEVELS,
  VALID_SOURCES,
  VALID_STATUSES,
  VALID_CONFIDENCE_LEVELS,
  isValidEvidenceCapsule,
  verifyBacklogItemEvidence
};
