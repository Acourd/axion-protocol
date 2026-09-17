#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Merkle State Cache & Pipeline Fast-Forward Engine (Fail-Closed)
 *
 * Motor de ejecución predictiva y caché de estado basado en Árbol Merkle:
 * 1. Calcula el Merkle Root de la superficie gobernada (código, políticas, tests,
 *    configuración publicada, workflows, hooks y manifiestos de empaquetado).
 * 2. Mantiene una caché persistente de fases verificadas vinculadas al digest Merkle.
 * 3. Solo autoriza Fast-Forward si el Merkle Root coincide Y las cuatro fases están
 *    explícitamente verificadas como `true`. Una fase ausente, `false`, ilegible o una
 *    caché corrupta/incompleta bloquea el Fast-Forward.
 * 4. Errores de lectura de cualquier archivo gobernado impiden el Fast-Forward.
 *
 * Este módulo NO es una atestación criptográfica: es una compuerta de cache local.
 * La firma de resultados vive en tools/drive_dsse_attester.js.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const PhaseEvidence = require('./phase_evidence.js');

const ROOT = path.resolve(__dirname, '..');

// Superficie de código gobernado.
const TRACKED_DIRS = ['tools', 'bin', 'core', 'policies', 'schemas', 'tests'];
const TRACKED_EXTENSIONS = ['.js', '.json', '.md', '.yaml', '.yml', '.mjs', '.cjs'];

// Configuración publicada, workflows y hooks: cualquier mutación aquí puede
// alterar el comportamiento de la compuerta aunque el código "de negocio" no cambie.
const SECURITY_SURFACE_DIRS = ['.github', '.agents', '.claude', '.claude-plugin', '.codex', '.cursor', '.opencode'];
const SECURITY_SURFACE_FILES = [
  'package.json',
  'package-lock.json',
  'opencode.json',
  'install.js',
  'AGENTS.md',
  'CLAUDE.md',
  'GOVERNANCE.md',
  'SECURITY.md',
  'ROADMAP.md',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  '09_candidate_manifest.json',
  'sha256-manifest.txt',
  'phase-e-integrity.yaml'
];

const IGNORED_DIR_NAMES = new Set(['node_modules', '.git', 'scratch', '.axion', '.phase-e', 'dist', '.sandbox']);

const CACHE_FORMAT = 3;
const PHASE_NAMES = ['testsPassed', 'vibeGuardPassed', 'smtProofPassed', 'chaosFuzzPassed'];

class MerkleCacheEngine {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
    this.stateDir = path.join(this.root, '.axion', 'state');
    this.cacheFile = path.join(this.stateDir, 'merkle_cache.json');
    this.ensureStateDir();
  }

  ensureStateDir() {
    if (!fs.existsSync(this.stateDir)) {
      fs.mkdirSync(this.stateDir, { recursive: true });
    }
  }

  shouldTrack(relPath) {
    const base = path.basename(relPath);
    if (IGNORED_DIR_NAMES.has(base)) return false;
    return TRACKED_EXTENSIONS.some((ext) => relPath.toLowerCase().endsWith(ext));
  }

  isIgnoredDirName(name) {
    return IGNORED_DIR_NAMES.has(name) || name.startsWith('.sandbox');
  }

  /**
   * Recorre la superficie gobernada y calcula los hashes de archivo individuales.
   * Devuelve { files, errors }: los errores de lectura nunca se silencian.
   */
  collectFileDigests() {
    const fileDigests = [];
    const errors = [];

    const scan = (dirRel, options = {}) => {
      const allExtensions = options.allExtensions === true;
      const absDir = path.join(this.root, dirRel);
      if (!fs.existsSync(absDir)) return;

      let entries;
      try {
        entries = fs.readdirSync(absDir, { withFileTypes: true });
      } catch (scanErr) {
        errors.push({ path: dirRel.replace(/\\/g, '/'), error: `READDIR_FAILED: ${scanErr.message}` });
        return;
      }

      for (const e of entries) {
        const rel = path.join(dirRel, e.name).replace(/\\/g, '/');
        const abs = path.join(this.root, rel);

        if (e.isSymbolicLink()) {
          errors.push({ path: rel, error: 'SYMLINK_NOT_FOLLOWED' });
          continue;
        }

        if (e.isDirectory()) {
          if (this.isIgnoredDirName(e.name)) continue;
          scan(rel, options);
          continue;
        }

        if (!e.isFile()) continue;
        if (!allExtensions && !this.shouldTrack(rel)) continue;

        try {
          const content = fs.readFileSync(abs);
          const hash = crypto.createHash('sha256').update(content).digest('hex');
          fileDigests.push({ path: rel, hash });
        } catch (readErr) {
          errors.push({ path: rel, error: `READ_FAILED: ${readErr.message}` });
        }
      }
    };

    for (const d of TRACKED_DIRS) {
      scan(d);
    }

    for (const d of SECURITY_SURFACE_DIRS) {
      scan(d, { allExtensions: true });
    }

    for (const f of SECURITY_SURFACE_FILES) {
      const abs = path.join(this.root, f);
      if (!fs.existsSync(abs)) continue;
      try {
        const stat = fs.statSync(abs);
        if (!stat.isFile()) continue;
        const content = fs.readFileSync(abs);
        fileDigests.push({ path: f, hash: crypto.createHash('sha256').update(content).digest('hex') });
      } catch (readErr) {
        errors.push({ path: f, error: `READ_FAILED: ${readErr.message}` });
      }
    }

    fileDigests.sort((a, b) => a.path.localeCompare(b.path));
    errors.sort((a, b) => a.path.localeCompare(b.path));
    return { files: fileDigests, errors };
  }

  /**
   * Construye el Árbol de Merkle y extrae el Merkle Root.
   * Cada hoja vincula ruta + contenido: renombrar un archivo cambia la raíz.
   */
  computeMerkleRoot() {
    const { files, errors } = this.collectFileDigests();
    if (files.length === 0) {
      return {
        merkleRoot: crypto.createHash('sha256').update('empty_tree').digest('hex'),
        filesCount: 0,
        files: [],
        readErrors: errors
      };
    }

    let currentLevel = files.map((f) => crypto.createHash('sha256').update(`${f.path}\0${f.hash}`).digest('hex'));

    while (currentLevel.length > 1) {
      const nextLevel = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
        const combined = crypto.createHash('sha256').update(left + right).digest('hex');
        nextLevel.push(combined);
      }
      currentLevel = nextLevel;
    }

    return {
      merkleRoot: currentLevel[0],
      filesCount: files.length,
      files,
      readErrors: errors
    };
  }

  /**
   * Carga el estado de caché previo. Una caché ilegible es ausencia de caché.
   */
  loadCache() {
    if (!fs.existsSync(this.cacheFile)) return null;
    try {
      const parsed = JSON.parse(fs.readFileSync(this.cacheFile, 'utf8'));
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed;
    } catch (parseErr) {
      return null;
    }
  }

  /**
   * Valida la evidencia de una fase delegando en el módulo de evidencia de fase:
   * artefacto tipado, productor autorizado, dentro de la raíz, sin symlink, hash
   * vigente y entrada de ledger vinculada. Un booleano o un archivo cualquiera no
   * cuentan como evidencia.
   */
  validatePhaseEvidence(phaseName, evidence) {
    const res = PhaseEvidence.validatePhaseEvidence(this.root, phaseName, evidence);
    return res.ok ? res.verified : null;
  }

  /**
   * Sella el estado actual en la caché Merkle.
   * Cada fase se registra SOLO si aporta evidencia verificable (artefacto + SHA-256 +
   * resultado PASS). Booleanos o artefactos inválidos se sellan como null: nunca true.
   * Con errores de lectura no se sella nada.
   */
  sealState(merkleInfo, phaseEvidence = {}) {
    const info = merkleInfo && typeof merkleInfo === 'object' ? merkleInfo : {};
    const readErrors = Array.isArray(info.readErrors) ? info.readErrors : [];
    if (readErrors.length > 0 || !info.merkleRoot || info.filesCount === 0) {
      return {
        sealed: false,
        reason: readErrors.length > 0
          ? 'READ_ERRORS_PRESENT: la superficie gobernada no es íntegra; no se sella estado.'
          : 'EMPTY_OR_INVALID_MERKLE_STATE: no se sella estado.'
      };
    }

    const phases = {};
    for (const name of PHASE_NAMES) {
      phases[name] = this.validatePhaseEvidence(name, phaseEvidence[name]);
    }

    // Una misma evidencia no puede acreditar dos fases distintas.
    const verificadas = PHASE_NAMES.map((n) => phases[n]).filter(Boolean);
    const shasUnicos = new Set(verificadas.map((v) => v.sha256));
    const rutasUnicas = new Set(verificadas.map((v) => v.artifact));
    if (shasUnicos.size !== verificadas.length || rutasUnicas.size !== verificadas.length) {
      return {
        sealed: false,
        reason: 'PHASE_ARTIFACT_REUSE: la misma evidencia (ruta/hash) no puede acreditar fases distintas.'
      };
    }

    const cacheEntry = {
      cacheFormat: CACHE_FORMAT,
      merkleRoot: info.merkleRoot,
      filesCount: info.filesCount,
      sealedAt: new Date().toISOString(),
      readErrors: 0,
      phases
    };

    fs.writeFileSync(this.cacheFile, JSON.stringify(cacheEntry, null, 2), 'utf8');
    return { sealed: true, cacheEntry };
  }

  /**
   * Evalúa si es posible aplicar Fast-Forward sin re-ejecución redundante.
   * Fail-closed: cualquier duda (formato, fases, integridad, lectura) bloquea.
   */
  evaluateFastForward(currentOverride = null) {
    const current = currentOverride || this.computeMerkleRoot();

    if (Array.isArray(current.readErrors) && current.readErrors.length > 0) {
      return {
        canFastForward: false,
        reason: `Errores de lectura en la superficie gobernada (${current.readErrors.length}); Fast-Forward bloqueado.`,
        current
      };
    }

    const cached = this.loadCache();

    if (!cached) {
      return {
        canFastForward: false,
        reason: 'Sin caché previa sellada (o caché corrupta/ilegible). Ejecución de ciclo completo requerida.',
        current
      };
    }

    if (cached.cacheFormat !== CACHE_FORMAT) {
      return {
        canFastForward: false,
        reason: `Formato de caché no reconocido (${String(cached.cacheFormat)}); se exige ciclo completo.`,
        cached,
        current
      };
    }

    if (!cached.phases || typeof cached.phases !== 'object') {
      return {
        canFastForward: false,
        reason: 'Caché incompleta: no declara fases con evidencia.',
        cached,
        current
      };
    }

    // Re-validación en el momento de autorizar: artefacto tipado, productor autorizado,
    // ledger vinculado, hash vigente y sin reutilización entre fases.
    const referencias = PHASE_NAMES.map((name) => this.validatePhaseEvidence(name, cached.phases[name]));
    const fasesInvalidas = PHASE_NAMES.filter((name, i) => !referencias[i]);
    if (fasesInvalidas.length > 0) {
      return {
        canFastForward: false,
        reason: `Fases sin evidencia verificable vigente (${fasesInvalidas.join(', ')}); Fast-Forward bloqueado.`,
        cached,
        current
      };
    }
    const shasDistintos = new Set(referencias.map((r) => r.sha256));
    const rutasDistintas = new Set(referencias.map((r) => r.artifact));
    if (shasDistintos.size !== PHASE_NAMES.length || rutasDistintas.size !== PHASE_NAMES.length) {
      return {
        canFastForward: false,
        reason: 'Evidencia reutilizada entre fases distintas; Fast-Forward bloqueado.',
        cached,
        current
      };
    }

    if (cached.readErrors !== 0) {
      return {
        canFastForward: false,
        reason: 'La caché sellada registra errores de lectura; Fast-Forward bloqueado.',
        cached,
        current
      };
    }

    if (cached.merkleRoot !== current.merkleRoot) {
      return {
        canFastForward: false,
        reason: 'Mutación en código o configuración detectada: Merkle Root no coincide.',
        cached,
        current
      };
    }

    return {
      canFastForward: true,
      reason: 'Merkle Root idéntico y cuatro fases con evidencia verificable vigente: Fast-Forward autorizado.',
      cached,
      current
    };
  }
}

if (require.main === module) {
  const engine = new MerkleCacheEngine();
  console.log('[Axion Merkle Fast-Forward] Calculando árbol de Merkle de la superficie gobernada...');
  const start = Date.now();
  const merkle = engine.computeMerkleRoot();
  const duration = Date.now() - start;

  console.log(`  Archivos rastreados: ${merkle.filesCount}`);
  console.log(`  Merkle Root:         ${merkle.merkleRoot}`);
  console.log(`  Tiempo de cálculo:   ${duration}ms`);

  if (merkle.readErrors.length > 0) {
    console.log(`  ADVERTENCIA: ${merkle.readErrors.length} archivo(s) ilegible(s); el sellado queda bloqueado.`);
  }

  const ff = engine.evaluateFastForward(merkle);
  console.log(`\n  Evaluación Fast-Forward: [${ff.canFastForward ? 'FAST-FORWARD' : 'FULL-CYCLE'}]`);
  console.log(`  Motivo: ${ff.reason}`);

  if (!ff.canFastForward) {
    const seal = engine.sealState(merkle);
    console.log(seal.sealed
      ? '  ✓ Estado sellado atómicamente en .axion/state/merkle_cache.json'
      : `  ✗ Estado no sellado: ${seal.reason}`);
  }
}

module.exports = MerkleCacheEngine;
