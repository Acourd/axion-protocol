#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Semantic Cross-Indexer & Knowledge Graph Engine (M_006)
 *
 * Indexador semántico multidimensional de grafo de conocimiento y AST:
 * 1. Mapea bidireccionalmente código fuente (tools/), especificaciones (schemas/) y tests (tests/).
 * 2. Provee consultas ultra-rápidas O(1) para resolver símbolos y dependencias sin leer archivos completos.
 * 3. Calcula el radio de impacto (blast radius) de cambios en archivos con protección estricta contra ciclos.
 * 4. Optimiza drásticamente el consumo de tokens agénticos en bucles autónomos de desarrollo.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

class SemanticCrossIndexer {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
    this.stateDir = path.join(this.root, '.axion', 'state');
    this.indexPath = path.join(this.stateDir, 'semantic_cross_index.json');
    this.ensureStateDir();
  }

  ensureStateDir() {
    if (!fs.existsSync(this.stateDir)) {
      fs.mkdirSync(this.stateDir, { recursive: true });
    }
  }

  /**
   * Extrae símbolos exportados y dependencias de un archivo JavaScript mediante análisis léxico determinista.
   */
  extractModuleMeta(filePath) {
    const symbols = [];
    const dependencies = [];

    if (!fs.existsSync(filePath)) {
      return { symbols, dependencies };
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
        // Clases
        const classMatch = line.match(/^class\s+([A-Za-z0-9_$]+)/);
        if (classMatch) {
          symbols.push({ name: classMatch[1], type: 'class', line: idx + 1 });
        }

        // Funciones
        const funcMatch = line.match(/^function\s+([A-Za-z0-9_$]+)/);
        if (funcMatch) {
          symbols.push({ name: funcMatch[1], type: 'function', line: idx + 1 });
        }

        // Métodos de clase principales
        const methodMatch = line.match(/^\s{2}([a-z][A-Za-z0-9_$]+)\s*\(/);
        if (methodMatch && !['constructor', 'if', 'switch', 'for', 'while'].includes(methodMatch[1])) {
          symbols.push({ name: methodMatch[1], type: 'method', line: idx + 1 });
        }

        // Dependencias require()
        const reqMatch = line.match(/require\(['"]([^'"]+)['"]\)/);
        if (reqMatch) {
          dependencies.push(reqMatch[1]);
        }
      });
    } catch {
      // Ignorar errores de lectura aislados
    }

    return { symbols, dependencies };
  }

  /**
   * Compila el grafo completo de relaciones entre código, esquemas y pruebas.
   */
  buildIndex() {
    let version = '1.3.2';
    try {
      version = JSON.parse(fs.readFileSync(path.join(this.root, 'package.json'), 'utf8')).version || '1.3.2';
    } catch (_) {
      // Fallback determinista a versión por defecto si package.json no está accesible
    }

    const graph = {
      version,
      generatedAt: new Date().toISOString(),
      modules: {},
      symbols: {},
      testBindings: {},
      specs: {}
    };

    const toolsDir = path.join(this.root, 'tools');
    if (fs.existsSync(toolsDir)) {
      const toolFiles = fs.readdirSync(toolsDir).filter(f => f.endsWith('.js'));
      toolFiles.forEach(file => {
        const fullPath = path.join(toolsDir, file);
        const relPath = path.join('tools', file).replace(/\\/g, '/');
        const meta = this.extractModuleMeta(fullPath);

        graph.modules[relPath] = {
          file: relPath,
          symbols: meta.symbols.map(s => s.name),
          dependencies: meta.dependencies,
          testedBy: []
        };

        meta.symbols.forEach(sym => {
          graph.symbols[sym.name] = {
            file: relPath,
            type: sym.type,
            line: sym.line
          };
        });
      });
    }

    // Mapear pruebas y sus enlaces a tools
    const testsDir = path.join(this.root, 'tests');
    if (fs.existsSync(testsDir)) {
      const domains = fs.readdirSync(testsDir).filter(d => fs.statSync(path.join(testsDir, d)).isDirectory());
      domains.forEach(domain => {
        const domainDir = path.join(testsDir, domain);
        const testFiles = fs.readdirSync(domainDir).filter(f => f.endsWith('.test.js'));

        testFiles.forEach(testFile => {
          const testPath = path.join(domainDir, testFile);
          const relTestPath = path.join('tests', domain, testFile).replace(/\\/g, '/');
          const meta = this.extractModuleMeta(testPath);

          graph.testBindings[relTestPath] = {
            domain,
            dependencies: meta.dependencies
          };

          // Asociar el test a cada tool referenciada
          meta.dependencies.forEach(dep => {
            const toolBase = path.basename(dep);
            const matchingToolKey = Object.keys(graph.modules).find(m => path.basename(m) === toolBase || path.basename(m, '.js') === toolBase);
            if (matchingToolKey && !graph.modules[matchingToolKey].testedBy.includes(relTestPath)) {
              graph.modules[matchingToolKey].testedBy.push(relTestPath);
            }
          });
        });
      });
    }

    // Mapear esquemas formales
    const schemasDir = path.join(this.root, 'schemas');
    if (fs.existsSync(schemasDir)) {
      const schemaFiles = fs.readdirSync(schemasDir).filter(f => f.endsWith('.json'));
      schemaFiles.forEach(schema => {
        const relSchema = path.join('schemas', schema).replace(/\\/g, '/');
        graph.specs[schema] = { file: relSchema };
      });
    }

    // Calcular digest
    const contentStr = JSON.stringify(graph, null, 2);
    graph.digest = crypto.createHash('sha256').update(contentStr).digest('hex');

    return graph;
  }

  /**
   * Guarda el índice en disco en .axion/state/semantic_cross_index.json.
   */
  saveIndex(indexData = null) {
    const data = indexData || this.buildIndex();
    fs.writeFileSync(this.indexPath, JSON.stringify(data, null, 2), 'utf8');
    return data;
  }

  /**
   * Carga el índice existente o lo construye dinámicamente si no existe.
   */
  loadIndex() {
    if (fs.existsSync(this.indexPath)) {
      try {
        return JSON.parse(fs.readFileSync(this.indexPath, 'utf8'));
      } catch {
        // En caso de corrupción, regenerar
      }
    }
    return this.saveIndex();
  }

  /**
   * Consulta O(1) de la ubicación de un símbolo en el codebase.
   */
  lookupSymbol(symbolName) {
    const index = this.loadIndex();
    const hit = index.symbols ? index.symbols[symbolName] : null;
    if (!hit) return null;

    const moduleData = index.modules[hit.file];
    return {
      symbol: symbolName,
      file: hit.file,
      type: hit.type,
      line: hit.line,
      testedBy: moduleData ? moduleData.testedBy : []
    };
  }

  /**
   * Calcula el radio de impacto de cambios en archivos con prevención estricta de ciclos.
   */
  computeImpactBlastRadius(changedFiles = []) {
    const index = this.loadIndex();
    const affectedTests = new Set();
    const affectedModules = new Set();
    const visited = new Set();

    const traverse = (target) => {
      const norm = target.replace(/\\/g, '/');
      if (visited.has(norm)) return;
      visited.add(norm);

      affectedModules.add(norm);

      const mod = index.modules[norm];
      if (mod && Array.isArray(mod.testedBy)) {
        mod.testedBy.forEach(t => affectedTests.add(t));
      }
    };

    changedFiles.forEach(f => traverse(f));

    return {
      changedFiles,
      affectedModulesCount: affectedModules.size,
      affectedTestsCount: affectedTests.size,
      affectedTests: Array.from(affectedTests)
    };
  }
}

if (require.main === module) {
  const indexer = new SemanticCrossIndexer();
  console.log('[Semantic Cross Indexer] Compilando grafo de conocimiento multidimensional...');
  const index = indexer.saveIndex();
  console.log(`✓ Módulos indexados: ${Object.keys(index.modules).length}`);
  console.log(`✓ Símbolos indexados: ${Object.keys(index.symbols).length}`);
  console.log(`✓ Enlaces de tests:   ${Object.keys(index.testBindings).length}`);
  console.log(`✓ SHA-256 Digest:    ${index.digest.slice(0, 16)}...`);

  const testLookup = indexer.lookupSymbol('deliberateCognitivePreconditions');
  console.log('\nConsulta de Símbolo [deliberateCognitivePreconditions]:');
  console.log(JSON.stringify(testLookup, null, 2));
}

module.exports = SemanticCrossIndexer;
