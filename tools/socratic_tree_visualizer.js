#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Socratic Decision Tree Visualizer & Cognitive Graph Engine
 *
 * Visualizador de árboles de decisión socrática y grafos de mitigación para /drive:
 * 1. Analiza contratos de intención emitidos por /clarify y autopsias de /premortem.
 * 2. Construye un grafo dirigido determinista de nodos de decisión, opciones exploradas y mitigaciones selladas.
 * 3. Genera diagramas Mermaid estándar (graph TD) integrables en Markdown y en el Dashboard de gobernanza.
 * 4. Exporta artefactos visuales en .axion/reports/SOCRATIC_TREE.md.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

function cleanLabel(str) {
  return String(str || '').replace(/["'\r\n;]/g, ' ').trim().slice(0, 60);
}

class SocraticTreeVisualizer {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
    this.reportsDir = path.join(this.root, '.axion', 'reports');
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  /**
   * Construye el árbol socrático a partir de datos de intención y mitigaciones.
   */
  buildTree({ intent = null, premortem = null, sessionName = 'Sesión /drive' } = {}) {
    const nodes = [];
    const edges = [];

    const rootId = 'N_ROOT';
    nodes.push({ id: rootId, label: `🎯 ${cleanLabel(sessionName)}`, shape: 'stadium' });

    // 1. Integrar Nodos de Clarificación Socrática (/clarify)
    if (intent && intent.questions && Array.isArray(intent.questions)) {
      const clarifyId = 'N_CLARIFY';
      nodes.push({ id: clarifyId, label: '🧭 /clarify: Custodia de Intención', shape: 'rect' });
      edges.push({ from: rootId, to: clarifyId, label: 'análisis socrático' });

      intent.questions.forEach((q, qIdx) => {
        const qId = `Q_${qIdx + 1}`;
        nodes.push({ id: qId, label: cleanLabel(q.question), shape: 'rhombus' });
        edges.push({ from: clarifyId, to: qId });

        if (Array.isArray(q.options)) {
          q.options.forEach((opt, oIdx) => {
            const optId = `OPT_${qIdx + 1}_${oIdx + 1}`;
            const isSelected = q.selected === oIdx || opt.startsWith('(Recommended)');
            const optLabel = `${isSelected ? '✓ ' : '· '}${cleanLabel(opt)}`;
            nodes.push({ id: optId, label: optLabel, shape: isSelected ? 'circle_double' : 'round_rect' });
            edges.push({ from: qId, to: optId, label: isSelected ? 'elegida' : 'descartada' });
          });
        }
      });
    }

    // 2. Integrar Nodos de Pre-Mortem (/premortem)
    if (premortem && premortem.anchors && Array.isArray(premortem.anchors)) {
      const premortemId = 'N_PREMORTEM';
      nodes.push({ id: premortemId, label: '⚡ /premortem: Autopsia Adversarial', shape: 'rect' });
      edges.push({ from: rootId, to: premortemId, label: 'análisis de fallos' });

      premortem.anchors.forEach((anc, aIdx) => {
        const aId = `ANC_${aIdx + 1}`;
        nodes.push({ id: aId, label: `⚠️ ${cleanLabel(anc.name || anc.title)}`, shape: 'rect' });
        edges.push({ from: premortemId, to: aId, label: anc.severity || 'HIGH' });

        if (anc.mitigation) {
          const mitId = `MIT_${aIdx + 1}`;
          nodes.push({ id: mitId, label: `🛡️ ${cleanLabel(anc.mitigation)}`, shape: 'round_rect' });
          edges.push({ from: aId, to: mitId, label: 'mitigación fail-closed' });
        }
      });
    }

    return { nodes, edges };
  }

  /**
   * Renderiza el árbol en formato de diagrama Mermaid (graph TD).
   */
  renderMermaid(tree) {
    const lines = ['graph TD'];

    for (const n of tree.nodes) {
      if (n.shape === 'rhombus') {
        lines.push(`  ${n.id}{"${n.label}"}`);
      } else if (n.shape === 'stadium') {
        lines.push(`  ${n.id}(["${n.label}"])`);
      } else if (n.shape === 'round_rect') {
        lines.push(`  ${n.id}("${n.label}")`);
      } else if (n.shape === 'circle_double') {
        lines.push(`  ${n.id}(("${n.label}"))`);
      } else {
        lines.push(`  ${n.id}["${n.label}"]`);
      }
    }

    for (const e of tree.edges) {
      if (e.label) {
        lines.push(`  ${e.from} -->|"${e.label}"| ${e.to}`);
      } else {
        lines.push(`  ${e.from} --> ${e.to}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Genera el reporte visual en Markdown con diagrama Mermaid incrustado.
   */
  generateReport(treeOptions = {}) {
    const defaultData = {
      sessionName: 'Misión de Innovación Axion Protocol',
      intent: {
        questions: [
          {
            question: '¿Qué arquitectura de visualización socrática emplear?',
            options: ['(Recommended) Nodos de Grafo Determinista Mermaid', 'Generación de Canvas HTML5 pesada', 'Texto plano tabular'],
            selected: 0
          }
        ]
      },
      premortem: {
        anchors: [
          { name: 'Sintaxis Mermaid inválida por caracteres especiales', severity: 'HIGH', mitigation: 'Sanitización estricta de labels con cleanLabel()' },
          { name: 'Grafo visualmente inmanejable en sesiones largas', severity: 'MEDIUM', mitigation: 'Poda determinista a 10 nodos clave' }
        ]
      }
    };

    const data = Object.assign({}, defaultData, treeOptions);
    const tree = this.buildTree(data);
    const mermaidDiagram = this.renderMermaid(tree);

    const reportContent = `# 🌳 Árbol de Decisión Socrática y Grafo de Mitigación

\`\`\`mermaid
${mermaidDiagram}
\`\`\`

---
*Generado automáticamente por Socratic Decision Tree Visualizer (Axion Protocol).*
`;

    const reportPath = path.join(this.reportsDir, 'socratic_tree.md');
    fs.writeFileSync(reportPath, reportContent, 'utf8');

    const digest = crypto.createHash('sha256')
      .update(reportContent)
      .digest('hex');

    return {
      success: true,
      reportPath,
      digest,
      nodesCount: tree.nodes.length,
      edgesCount: tree.edges.length,
      mermaid: mermaidDiagram
    };
  }
}

if (require.main === module) {
  const visualizer = new SocraticTreeVisualizer();
  console.log('[Axion Socratic Tree Visualizer] Generando árbol de decisiones en Mermaid:\n');
  const res = visualizer.generateReport();
  console.log(res.mermaid);
  console.log(`\n✓ Reporte Markdown generado en: ${path.relative(ROOT, res.reportPath)}`);
}

module.exports = SocraticTreeVisualizer;
