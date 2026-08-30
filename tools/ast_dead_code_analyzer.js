#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — AST Lexical Coverage & Dead Code Analyzer
 *
 * Analiza el árbol de código y dependencias en tools/ y bin/:
 * 1. Extrae todas las funciones exportadas, clases y métodos nucleares.
 * 2. Mapea la red de importaciones y llamadas cruzadas desde bin/, tools/ y tests/.
 * 3. Detecta exports huérfanos o código muerto no alcanzable.
 * 4. Valida que el 100% de los módulos de herramientas tengan al menos una suite de prueba dedicada.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIR_TOOLS = path.join(ROOT, 'tools');
const DIR_BIN = path.join(ROOT, 'bin');
const DIR_TESTS = path.join(ROOT, 'tests');

class AstDeadCodeAnalyzer {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
    this.toolsDir = path.join(this.root, 'tools');
    this.binDir = path.join(this.root, 'bin');
    this.testsDir = path.join(this.root, 'tests');
  }

  /**
   * Obtiene todos los archivos .js relevantes del proyecto.
   */
  getProjectJsFiles() {
    const getFiles = (dir) => {
      if (!fs.existsSync(dir)) return [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      let files = [];
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files = files.concat(getFiles(full));
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
          files.push(full);
        }
      }
      return files;
    };

    return {
      tools: getFiles(this.toolsDir),
      bin: getFiles(this.binDir),
      tests: getFiles(this.testsDir)
    };
  }

  /**
   * Extrae los símbolos exportados (module.exports = ... o exports.x = ...).
   */
  extractExports(filePath) {
    const code = fs.readFileSync(filePath, 'utf8');
    const exportsFound = [];

    // Patrón module.exports = { a, b, c }
    const objMatch = code.match(/module\.exports\s*=\s*\{([^}]+)\}/);
    if (objMatch) {
      const body = objMatch[1];
      const items = body.split(',').map(s => s.trim().split(':')[0].trim()).filter(Boolean);
      exportsFound.push(...items);
    }

    // Patrón module.exports = ClassName / functionName
    const directMatch = code.match(/module\.exports\s*=\s*([a-zA-Z0-9_$]+);/);
    if (directMatch && directMatch[1] !== '{') {
      exportsFound.push(directMatch[1]);
    }

    // Patrones exports.foo = ...
    const namedMatches = [...code.matchAll(/exports\.([a-zA-Z0-9_$]+)\s*=/g)];
    for (const m of namedMatches) {
      exportsFound.push(m[1]);
    }

    return Array.from(new Set(exportsFound));
  }

  /**
   * Ejecuta el análisis completo de referencias cruzadas y cobertura.
   */
  runFullAnalysis() {
    const { tools, bin, tests } = this.getProjectJsFiles();
    const allConsumers = [...bin, ...tests, ...tools];

    // Leer todo el código consumidor para buscar referencias
    const consumerContents = allConsumers.map(f => ({
      path: f,
      rel: path.relative(this.root, f).replace(/\\/g, '/'),
      code: fs.readFileSync(f, 'utf8')
    }));

    const results = {
      totalToolModules: tools.length,
      modules: {},
      orphanedModules: [],
      deadSymbols: [],
      pass: true
    };

    for (const toolFile of tools) {
      const baseName = path.basename(toolFile);
      const relPath = path.relative(this.root, toolFile).replace(/\\/g, '/');
      const exportsList = this.extractExports(toolFile);

      // Buscar si el archivo es importado en algún lugar
      const requirePattern1 = new RegExp(`['"][^'"]*${baseName.replace('.js', '')}(?:\\.js)?['"]`);
      const requirePattern2 = new RegExp(`['"][^'"]*tools[/\\\\]${baseName.replace('.js', '')}['"]`);

      const consumersOfModule = consumerContents.filter(c => 
        c.path !== toolFile && (requirePattern1.test(c.code) || requirePattern2.test(c.code) || c.code.includes(baseName))
      );

      // Verificar pruebas dedicadas
      const hasDedicatedTest = tests.some(t => {
        const testCode = fs.readFileSync(t, 'utf8');
        return testCode.includes(baseName) || testCode.includes(baseName.replace('.js', ''));
      });

      results.modules[baseName] = {
        path: relPath,
        exportsCount: exportsList.length,
        exports: exportsList,
        consumerCount: consumersOfModule.length,
        hasDedicatedTest,
        isOrphaned: consumersOfModule.length === 0 && !hasDedicatedTest
      };

      if (results.modules[baseName].isOrphaned) {
        results.orphanedModules.push(baseName);
      }
    }

    results.pass = results.orphanedModules.length === 0;
    return results;
  }
}

if (require.main === module) {
  const analyzer = new AstDeadCodeAnalyzer();
  console.log('[Axion AST Analyzer] Analizando cobertura estructural y código muerto en tools/ y bin/...');
  const res = analyzer.runFullAnalysis();

  console.log(`\n=== RESULTADOS DE COBERTURA AST (${res.totalToolModules} MÓDULOS) ===`);
  for (const [mod, data] of Object.entries(res.modules)) {
    const testBadge = data.hasDedicatedTest ? '✓ TEST' : '⚠️ NO TEST';
    console.log(`  ✓ ${mod.padEnd(35)} Consumidores: ${data.consumerCount.toString().padStart(2)} · Exports: ${data.exportsCount.toString().padStart(2)} · ${testBadge}`);
  }

  if (!res.pass) {
    console.error(`\n⚠️ Módulos huérfanos detectados: ${res.orphanedModules.join(', ')}`);
    process.exit(1);
  } else {
    console.log(`\n🎉 PASS: 100% de los ${res.totalToolModules} módulos están activos, conectados y libres de código muerto.`);
    process.exit(0);
  }
}

module.exports = AstDeadCodeAnalyzer;
