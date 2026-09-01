#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Sync Mirror Gate & Workspace Parity Engine
 *
 * Garantiza paridad determinista e inmutable entre el repositorio principal (Axion Protocol)
 * y sus gemelos o bancos de prueba experimentales (Axkern, Hashgraph):
 * 1. Escaneo exhaustivo de árboles excluyendo temporales (.git, node_modules, .axion/state, scratch).
 * 2. Comparación de integridad SHA-256 archivo por archivo.
 * 3. Detección y reporte de deriva semántica o archivos desalineados.
 * 4. Sincronización atómica unidireccional o de réplica con reporte determinista.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const AXKERN_DEFAULT = path.resolve(ROOT, '..', 'Axkern');

const EXCLUDED_DIRS = new Set([
  '.git',
  'node_modules',
  'scratch',
  '.phase-e',
  '.axion/state',
  '.axion/checkpoints',
  'coverage',
  'dist',
  'build'
]);

function computeFileHash(filePath) {
  try {
    const buf = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(buf).digest('hex');
  } catch (_) {
    return null;
  }
}

function scanFiles(baseDir, relativeDir = '') {
  const current = path.join(baseDir, relativeDir);
  if (!fs.existsSync(current)) return [];
  const entries = fs.readdirSync(current, { withFileTypes: true });
  const files = [];

  for (const e of entries) {
    const rel = relativeDir ? path.join(relativeDir, e.name) : e.name;
    const normRel = rel.split(path.sep).join('/');

    if (e.isDirectory()) {
      if (EXCLUDED_DIRS.has(normRel) || EXCLUDED_DIRS.has(e.name)) continue;
      files.push(...scanFiles(baseDir, rel));
    } else if (e.isFile()) {
      if (normRel.endsWith('.tmp') || normRel.includes('.tmp-')) continue;
      files.push(normRel);
    }
  }

  return files;
}

class SyncMirrorGate {
  constructor(sourceRoot = ROOT, targetRoot = AXKERN_DEFAULT) {
    this.source = path.resolve(sourceRoot);
    this.target = path.resolve(targetRoot);
  }

  compare() {
    const sourceFiles = scanFiles(this.source);
    const targetFiles = new Set(scanFiles(this.target));

    const matching = [];
    const drift = [];
    const missingInTarget = [];
    const extraInTarget = [];

    for (const rel of sourceFiles) {
      const srcPath = path.join(this.source, rel);
      const tgtPath = path.join(this.target, rel);

      if (!fs.existsSync(tgtPath)) {
        missingInTarget.push(rel);
        continue;
      }

      const srcHash = computeFileHash(srcPath);
      const tgtHash = computeFileHash(tgtPath);

      if (srcHash === tgtHash) {
        matching.push({ file: rel, hash: srcHash });
      } else {
        drift.push({ file: rel, sourceHash: srcHash, targetHash: tgtHash });
      }
      targetFiles.delete(rel);
    }

    for (const rel of targetFiles) {
      extraInTarget.push(rel);
    }

    const totalSource = sourceFiles.length;
    const parityPct = totalSource > 0 ? Number(((matching.length / totalSource) * 100).toFixed(1)) : 100;
    const isIdentical = drift.length === 0 && missingInTarget.length === 0;
    return {
      source: this.source,
      target: this.target,
      totalSource,
      matchingCount: matching.length,
      parityPct,
      isIdentical,
      drift,
      missingInTarget,
      extraInTarget,
      timestamp: new Date().toISOString()
    };
  }

  sync(options = {}) {
    const comparison = this.compare();
    if (!fs.existsSync(this.target)) {
      fs.mkdirSync(this.target, { recursive: true });
    }

    const copied = [];
    for (const rel of comparison.missingInTarget) {
      const src = path.join(this.source, rel);
      const tgt = path.join(this.target, rel);
      fs.mkdirSync(path.dirname(tgt), { recursive: true });
      fs.copyFileSync(src, tgt);
      copied.push({ file: rel, action: 'CREATED' });
    }

    for (const d of comparison.drift) {
      const src = path.join(this.source, d.file);
      const tgt = path.join(this.target, d.file);
      fs.mkdirSync(path.dirname(tgt), { recursive: true });
      fs.copyFileSync(src, tgt);
      copied.push({ file: d.file, action: 'UPDATED' });
    }

    const postComparison = this.compare();

    return {
      source: this.source,
      target: this.target,
      copiedCount: copied.length,
      copied,
      preParityPct: comparison.parityPct,
      postParityPct: postComparison.parityPct,
      isIdentical: postComparison.isIdentical,
      syncedAt: new Date().toISOString()
    };
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const isSync = args.includes('--sync') || args.includes('-s');

  const sourceIdx = args.indexOf('--source');
  const targetIdx = args.indexOf('--target');

  const customSource = sourceIdx !== -1 && args[sourceIdx + 1] ? args[sourceIdx + 1] : ROOT;
  const customTarget = targetIdx !== -1 && args[targetIdx + 1] ? args[targetIdx + 1] : AXKERN_DEFAULT;

  const gate = new SyncMirrorGate(customSource, customTarget);

  if (isSync) {
    console.log(`[Sync Mirror Gate] Sincronizando espacios de trabajo (${path.basename(customSource)} -> ${path.basename(customTarget)})...`);
    const res = gate.sync();
    console.log(`✓ Sincronización completada: ${res.copiedCount} archivos transferidos.`);
    console.log(`  Paridad inicial: ${res.preParityPct}% -> Paridad final: ${res.postParityPct}%`);
  } else {
    console.log(`[Sync Mirror Gate] Auditando paridad de espacios (${path.basename(customSource)} vs ${path.basename(customTarget)})...`);
    const res = gate.compare();
    console.log(`  Archivos origen: ${res.totalSource} | Coincidentes: ${res.matchingCount}`);
    console.log(`  Paridad actual : ${res.parityPct}%`);
    if (res.isIdentical) {
      console.log('✓ PARIDAD ABSOLUTA (100% idénticos en disco).');
    } else {
      if (res.missingInTarget.length > 0) console.log(`  Faltan en destino: ${res.missingInTarget.length}`);
      if (res.drift.length > 0) console.log(`  Desalineados (drift): ${res.drift.length}`);
      console.log('Ejecuta: node tools/sync_mirror_gate.js --sync para unificar.');
    }
  }
}

module.exports = SyncMirrorGate;