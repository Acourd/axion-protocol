#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Smart Incremental AST Diff Test Runner
 *
 * Ejecutor incremental de pruebas de alta velocidad para VibeGuard y /drive:
 * 1. Detecta archivos modificados en el árbol de trabajo mediante diff de Git o hash.
 * 2. Construye el grafo de dependencias inverso analizando require() estáticamente.
 * 3. Mapea qué suites de prueba dependen de los archivos modificados.
 * 4. Ejecuta únicamente las suites impactadas en < 500ms.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

class SmartIncrementalRunner {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
    this.testsDir = path.join(this.root, 'tests');
    this.toolsDir = path.join(this.root, 'tools');
  }

  /**
   * Obtiene la lista de archivos modificados en el espacio de trabajo.
   */
  getModifiedFiles() {
    const modified = new Set();

    // 1. Intentar con git status --porcelain
    try {
      const res = spawnSync('git', ['status', '--porcelain'], { cwd: this.root, encoding: 'utf8' });
      if (res.status === 0 && res.stdout) {
        const lines = res.stdout.split('\n');
        for (const l of lines) {
          const trimmed = l.trim();
          if (!trimmed) continue;
          const match = trimmed.match(/^[MADRCU?\s]+\s+(.+)$/);
          if (match) {
            const rel = match[1].replace(/\\\\/g, '/');
            modified.add(rel);
          }
        }
      }
    } catch (_) {
      // Ignorar si git no está disponible
    }

    return Array.from(modified);
  }

  /**
   * Construye el mapa de dependencias de todas las suites de prueba.
   */
  buildTestDependencyMap() {
    const testMap = new Map(); // testFile -> Set<requiredToolRelPaths>
    if (!fs.existsSync(this.testsDir)) return testMap;

    const findTests = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) findTests(full);
        else if (e.name.endsWith('.test.js') || (e.name.endsWith('.js') && !e.name.startsWith('run_all') && !e.name.includes('fixture'))) {
          const rel = path.relative(this.root, full).split(path.sep).join('/');
          const deps = this.extractDependencies(full);
          testMap.set(rel, deps);
        }
      }
    };

    findTests(this.testsDir);
    return testMap;
  }

  /**
   * Extrae los requires estáticos de un archivo de prueba.
   */
  extractDependencies(filePath) {
    const deps = new Set();
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const dir = path.dirname(filePath);
      const matches = content.matchAll(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/g);
      for (const m of matches) {
        const reqPath = m[1];
        if (reqPath.startsWith('.')) {
          const resolved = path.resolve(dir, reqPath);
          let candidate = resolved;
          if (!candidate.endsWith('.js')) candidate += '.js';
          if (fs.existsSync(candidate)) {
            const rel = path.relative(this.root, candidate).split(path.sep).join('/');
            deps.add(rel);
          }
        }
      }
    } catch (_) {
      // Ignorar
    }
    return deps;
  }

  /**
   * Encuentra las suites afectadas por una lista de archivos modificados.
   */
  findAffectedTests(modifiedFiles) {
    const testMap = this.buildTestDependencyMap();
    const affected = new Set();

    if (!modifiedFiles || modifiedFiles.length === 0) {
      return Array.from(testMap.keys());
    }

    for (const mod of modifiedFiles) {
      const normalizedMod = mod.split(path.sep).join('/').replace(/^\.\//, '');

      // Si el archivo modificado es un test en sí mismo, añadirlo
      if (testMap.has(normalizedMod)) {
        affected.add(normalizedMod);
      }

      // Si es una herramienta o módulo, buscar qué tests lo importan
      for (const [testFile, deps] of testMap.entries()) {
        if (deps.has(normalizedMod)) {
          affected.add(testFile);
        }
      }
    }

    return Array.from(affected);
  }

  /**
   * Ejecuta únicamente las suites afectadas.
   */
  runIncremental(modifiedFiles = null) {
    const targetModified = modifiedFiles || this.getModifiedFiles();
    const affectedTests = this.findAffectedTests(targetModified);

    const t0 = Date.now();
    const results = [];

    for (const t of affectedTests) {
      const fullPath = path.join(this.root, t);
      const start = Date.now();
      const res = spawnSync(process.execPath, [fullPath], { encoding: 'utf8' });
      const durationMs = Date.now() - start;
      results.push({
        test: t,
        status: res.status,
        pass: res.status === 0,
        durationMs
      });
    }

    const totalDurationMs = Date.now() - t0;
    const allPass = results.every(r => r.pass);

    return {
      modifiedFiles: targetModified,
      affectedTestsCount: affectedTests.length,
      allPass,
      totalDurationMs,
      results
    };
  }
}

if (require.main === module) {
  const runner = new SmartIncrementalRunner();
  console.log('[Axion Smart Diff Runner] Detectando cambios y ejecutando suites impactadas...\n');

  const report = runner.runIncremental();
  console.log(`Archivos modificados detectados: ${report.modifiedFiles.length}`);
  console.log(`Suites impactadas a ejecutar:    ${report.affectedTestsCount}`);
  console.log(`Tiempo total de verificación:    ${report.totalDurationMs} ms\n`);

  for (const r of report.results) {
    console.log(`  ${r.pass ? 'PASS' : 'FAIL'}  ${r.test.padEnd(65)} (${r.durationMs} ms)`);
  }

  if (report.allPass) {
    console.log(`\n🎉 PASS: Todas las suites impactadas pasaron con éxito.`);
    process.exit(0);
  } else {
    console.log(`\n✗ FAIL: Se detectaron fallos en las suites impactadas.`);
    process.exit(1);
  }
}

module.exports = SmartIncrementalRunner;
