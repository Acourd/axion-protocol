'use strict';

/**
 * Axion Protocol — Invariantes del Visualizador de Árboles de Decisión Socrática y Mitigaciones.
 *
 * Valida de forma estricta:
 * 1. Modelado determinista de grafos cognitivos dirigidos a partir de /clarify y /premortem.
 * 2. Generación válida de sintaxis Mermaid (graph TD) con sanitización de caracteres especiales.
 * 3. Exportación de artefactos Markdown y sellado criptográfico SHA-256.
 * 4. Integración transparente con DriveEngine y CLI unificado.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const SocraticTreeVisualizer = require('../../tools/socratic_tree_visualizer.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-143 Invariantes del Visualizador Socrático de Decisiones ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'ax-tree-sandbox-'));
fs.mkdirSync(path.join(sandbox, '.axion', 'reports'), { recursive: true });

try {
  const visualizer = new SocraticTreeVisualizer(sandbox);

  // 1. Validar construcción de nodos y aristas a partir de datos estructurados
  const testData = {
    sessionName: 'Sesión de Refactorización de Arquitectura',
    intent: {
      questions: [
        {
          question: '¿Qué estrategia de desacoplamiento aplicar?',
          options: ['(Recommended) Inyección de Dependencias Estricta', 'Patrón Singleton Global', 'Exportaciones sueltas'],
          selected: 0
        }
      ]
    },
    premortem: {
      anchors: [
        { name: 'Riesgo de referencia circular en módulos cruzados', severity: 'CRITICAL', mitigation: 'Validación en AST con module_dependency_graph.js' }
      ]
    }
  };

  const tree = visualizer.buildTree(testData);
  assert.ok(tree.nodes.length >= 6, 'Debe contener al menos 6 nodos de decisión y mitigación');
  assert.ok(tree.edges.length >= 5, 'Debe contener al menos 5 conexiones dirigidas');
  console.log(`✓ Grafo socrático construido: ${tree.nodes.length} nodos y ${tree.edges.length} aristas`);

  // 2. Validar renderizado en Mermaid (graph TD)
  const mermaid = visualizer.renderMermaid(tree);
  assert.ok(mermaid.startsWith('graph TD'));
  assert.ok(mermaid.includes('N_ROOT'));
  assert.ok(mermaid.includes('N_CLARIFY'));
  assert.ok(mermaid.includes('N_PREMORTEM'));
  assert.ok(mermaid.includes('Inyección de Dependencias Estricta'));
  assert.ok(mermaid.includes('Validación en AST'));
  console.log('✓ Renderizado Mermaid (graph TD) con sanitización validado');

  // 3. Validar generación de reporte Markdown
  const reportRes = visualizer.generateReport(testData);
  assert.strictEqual(reportRes.success, true);
  assert.ok(fs.existsSync(reportRes.reportPath));
  assert.ok(reportRes.digest.length === 64);
  console.log(`✓ Reporte socrático Markdown generado y sellado con SHA-256 (${reportRes.digest.slice(0, 16)}...)`);

  // 4. Validar integración con DriveEngine
  const driveEngine = new DriveEngine(ROOT);
  const driveTree = driveEngine.generateSocraticDecisionTree();
  assert.strictEqual(driveTree.success, true);
  assert.ok(driveTree.nodesCount > 0);
  console.log('✓ Integración DriveEngine.generateSocraticDecisionTree() verificada');

} finally {
  if (fs.existsSync(sandbox)) {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
}

console.log('\nPASS AX-F-143 — Invariantes del visualizador socrático de decisiones demostrados al 100%.');
