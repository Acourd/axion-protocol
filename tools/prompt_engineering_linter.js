#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Prompt Engineering Contract Linter (tools/prompt_engineering_linter.js)
 *
 * Validador semántico y estructural de contratos agénticos.
 * Analiza el AST de secciones Markdown, parsea tablas, listas y bloques de código,
 * e impone una taxonomía estrictamente cerrada (cero estados extra o contradictorios),
 * anclaje de entorno y formato canónico del Cuarteto de Rigor.
 *
 * Cero dependencias externas. Portable por diseño.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const VOCAB_PATH = path.join(ROOT, 'tools', 'prompt_engineering_vocab.json');

// Objetivo primario versionado dentro del repositorio (100% portable)
const REPO_TARGET = path.join(ROOT, 'skills', 'prompt-engineering', 'SKILL.md');

// Espejos locales adicionales a comprobar si existen
const PROFILE_TARGETS = [
  path.join(process.env.USERPROFILE || process.env.HOME || '', '.gemini', 'config', 'skills', 'prompt-engineering', 'SKILL.md'),
  path.join(process.env.USERPROFILE || process.env.HOME || '', '.claude', 'commands', 'prompt-engineering.md')
];

function loadVocab(vocabPath = VOCAB_PATH) {
  if (!fs.existsSync(vocabPath)) {
    throw new Error('Vocabulario formal no encontrado en: ' + vocabPath);
  }
  return JSON.parse(fs.readFileSync(vocabPath, 'utf8'));
}

/**
 * Parser de secciones Markdown (Mini-AST)
 * Descompone el documento en secciones jerárquicas y separa texto de bloques de código.
 */
function parseMarkdownAST(content) {
  // 1. Quitar comentarios HTML <!-- ... -->
  const strippedContent = content.replace(/<!--[\s\S]*?-->/g, '');

  // 2. Extraer Frontmatter YAML
  let frontmatter = null;
  let body = strippedContent;
  const fmMatch = strippedContent.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (fmMatch) {
    frontmatter = fmMatch[1];
    body = strippedContent.slice(fmMatch[0].length);
  }

  // 3. Segmentar por encabezados ##
  const sections = {};
  const sectionChunks = body.split(/\n(?=## )/);
  
  for (const chunk of sectionChunks) {
    const headerMatch = chunk.match(/^##\s+([^\n]+)/);
    if (headerMatch) {
      const title = headerMatch[1].trim();
      const content = chunk.slice(headerMatch[0].length).trim();
      sections[title] = {
        raw: chunk,
        content: content
      };
    }
  }

  return { frontmatter, sections, body };
}

/**
 * Extrae filas de una tabla Markdown en un array de arrays de celdas
 */
function parseMarkdownTable(tableText) {
  const rows = [];
  const lines = tableText.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      // Ignorar línea separadora (| :--- | :--- |)
      if (/^\|[\s\-:]+\|/.test(trimmed) && trimmed.replace(/[\s\|:\-]/g, '') === '') {
        continue;
      }
      const cells = trimmed.split('|').slice(1, -1).map(c => c.trim());
      rows.push(cells);
    }
  }
  return rows;
}

/**
 * Linter Semántico de Prompt Engineering
 */
function lintPromptEngineeringContent(content, vocab = loadVocab(), sourceName = 'document') {
  const issues = [];
  const ast = parseMarkdownAST(content);

  // 1. FRONTMATTER YAML
  if (!ast.frontmatter) {
    issues.push('[FRONTMATTER] Falta bloque YAML frontmatter delimitado por ---');
  } else {
    if (!/^name:\s*prompt-engineering\b/m.test(ast.frontmatter)) {
      issues.push('[FRONTMATTER] name debe ser "prompt-engineering"');
    }
    if (!/^version:\s*3\.1\.0\b/m.test(ast.frontmatter)) {
      issues.push('[FRONTMATTER] version debe ser "3.1.0"');
    }
  }

  // 2. SECCIÓN 0: CONTRATO NUCLEAR — INVARIANTES Y ESPACIO NEGATIVO
  const s0Key = Object.keys(ast.sections).find(k => k.startsWith('0 · Contrato Nuclear'));
  if (!s0Key) {
    issues.push('[INVARIANTES_S0] Falta sección "## 0 · Contrato Nuclear"');
  } else {
    const s0 = ast.sections[s0Key].content;
    for (const inv of vocab.invariants) {
      if (!s0.includes(inv.name)) {
        issues.push('[INVARIANTES_S0] Falta invariante obligatoria: "' + inv.name + '"');
      }
    }

    // Detector semántico de cláusulas de escape en §0 (Espacio Negativo)
    const ESCAPE_CLAUSES = [
      /salvo\s+(?:cuando|en|que|si)/i,
      /excepto\s+(?:cuando|en|que|si)/i,
      /a\s+menos\s+que/i,
      /\bopcional\b/i
    ];
    for (const esc of ESCAPE_CLAUSES) {
      if (esc.test(s0)) {
        issues.push('[ESPACIO_NEGATIVO_S0] Cláusula de escape detectada en §0: "' + s0.match(esc)[0] + '"');
      }
    }
  }

  // 3. SECCIÓN 1: NIVELES DE VERIFICACIÓN ADAPTATIVA
  const s1Key = Object.keys(ast.sections).find(k => k.startsWith('1 · Los 4 Niveles de Verificación Adaptativa'));
  if (!s1Key) {
    issues.push('[NIVELES_S1] Falta sección "## 1 · Los 4 Niveles de Verificación Adaptativa"');
  } else {
    const s1 = ast.sections[s1Key].content;
    const tableRows = parseMarkdownTable(s1);
    
    // Validar niveles 1 a 4 en la tabla
    for (const lvl of vocab.verification_levels) {
      const row = tableRows.find(r => r[0] && r[0].includes('Nivel ' + lvl.level));
      if (!row) {
        issues.push('[NIVELES_S1] Falta fila para Nivel ' + lvl.level + ' (' + lvl.name + ')');
      } else {
        // Columna 3 es Estado Máximo Alcanzable
        const maxStateCell = row[3] || '';
        if (lvl.level === 1) {
          if (!maxStateCell.includes('NUNCA `VERIFICADO`')) {
            issues.push('[NIVELES_S1] Nivel 1 debe estipular explícitamente: NUNCA `VERIFICADO`');
          }
          if (maxStateCell.includes('`VERIFICADO`') && !maxStateCell.includes('NUNCA')) {
            issues.push('[NIVELES_S1] Violación crítica: Nivel 1 autoriza VERIFICADO');
          }
        }
      }
    }

    // Validar las 4 acciones observables de Nivel 1
    const requiredActions = [
      'Revisar el diff contra requisitos',
      'Enumerar regresiones plausibles',
      'Inspeccionar físicamente en disco',
      'Documentar qué no pudo ejecutarse'
    ];
    for (const act of requiredActions) {
      if (!s1.includes(act)) {
        issues.push('[NIVELES_S1] Falta la acción observable de Nivel 1: "' + act + '"');
      }
    }
  }

  // 4. SECCIÓN 3: TAXONOMÍA ESTRICTAMENTE CERRADA DE 5 ESTADOS OPERATIVOS
  const s3Key = Object.keys(ast.sections).find(k => k.startsWith('3 · Taxonomía Cerrada de 5 Estados Operativos'));
  const foundStates = new Set();
  const allowedStates = new Set(vocab.states.map(s => s.name));

  if (!s3Key) {
    issues.push('[TAXONOMIA_S3] Falta sección "## 3 · Taxonomía Cerrada de 5 Estados Operativos"');
  } else {
    const s3 = ast.sections[s3Key].content;
    const tableRows = parseMarkdownTable(s3);

    // Cabecera es [Estado Operativo, Condición Estricta...]
    for (let i = 1; i < tableRows.length; i++) {
      const row = tableRows[i];
      if (row.length >= 2) {
        const stateCell = row[0];
        const m = stateCell.match(/`([A-Z_ÁÉÍÓÚ]+)`/);
        if (m) {
          foundStates.add(m[1]);
        }
      }
    }

    // A. Verificar que todos los estados del vocabulario existan
    for (const exp of allowedStates) {
      if (!foundStates.has(exp)) {
        issues.push('[TAXONOMIA_S3] Falta el estado canónico "' + exp + '"');
      }
    }

    // B. CERRADURA ESTRICTA: Ningún estado extra está permitido
    for (const found of foundStates) {
      if (!allowedStates.has(found)) {
        issues.push('[TAXONOMIA_CERRADA_S3] Estado no autorizado / desconocido en taxonomía: "' + found + '"');
      }
    }
  }

  // 5. SECCIÓN 6: FORMATO DE REPORTE Y CUARTETO DE RIGOR
  const s6Key = Object.keys(ast.sections).find(k => k.startsWith('6 · Formato de Reporte de Cierre'));
  if (!s6Key) {
    issues.push('[REPORTE_S6] Falta sección "## 6 · Formato de Reporte de Cierre"');
  } else {
    const s6 = ast.sections[s6Key].content;
    // Extraer bloque de código
    const codeBlockMatch = s6.match(/```markdown\r?\n([\s\S]*?)\r?\n```/);
    if (!codeBlockMatch) {
      issues.push('[REPORTE_S6] Falta plantilla de reporte en bloque markdown');
    } else {
      const template = codeBlockMatch[1];
      if (!template.includes('ESTADO_OPERATIVO:')) {
        issues.push('[REPORTE_S6] Plantilla carece de Línea 0 ESTADO_OPERATIVO:');
      }
      const quartet = ['[Hipótesis]', '[Evidencia Física]', '[Incertidumbre / Casos Límite]', '[Siguiente Acción]'];
      for (const q of quartet) {
        if (!template.includes(q)) {
          issues.push('[REPORTE_S6] Plantilla carece del elemento obligatorio: "' + q + '"');
        }
      }
    }
  }

  return {
    pass: issues.length === 0,
    issues,
    source: sourceName,
    stats: {
      invariantsCount: vocab.invariants.length,
      levelsCount: vocab.verification_levels.length,
      canonicalStatesExpected: allowedStates.size,
      canonicalStatesFound: foundStates.size,
      foundStatesList: Array.from(foundStates)
    }
  };
}

function lintFile(filePath, vocab = loadVocab()) {
  if (!fs.existsSync(filePath)) {
    return { pass: false, issues: ['Archivo no encontrado: ' + filePath], source: filePath };
  }
  const content = fs.readFileSync(filePath, 'utf8');
  return lintPromptEngineeringContent(content, vocab, filePath);
}

function runAll() {
  const vocab = loadVocab();
  let totalIssues = 0;
  console.log('=== AXION PROTOCOL: PROMPT-ENGINEERING SEMANTIC AST LINTER (v3.1.0) ===');
  console.log('Vocabulario Único de Verdad:', path.relative(ROOT, VOCAB_PATH));
  console.log('Taxonomía Cerrada (Exactamente 5 estados):', vocab.states.map(s => s.name).join(', '));
  console.log('------------------------------------------------------------------------');

  // 1. Objetivo Primario Versionado en Repositorio
  const targets = [REPO_TARGET];

  // 2. Objetivos en perfil si existen
  for (const p of PROFILE_TARGETS) {
    if (fs.existsSync(p)) {
      targets.push(p);
    }
  }

  for (const target of targets) {
    const res = lintFile(target, vocab);
    const rel = path.relative(ROOT, target).startsWith('..') ? target : path.relative(ROOT, target);
    if (res.pass) {
      console.log('  PASS  ' + rel);
      console.log('        * Taxonomía Cerrada: ' + res.stats.canonicalStatesFound + '/' + res.stats.canonicalStatesExpected + ' estados exactos (0 extra)');
      console.log('        * AST Semántico: 5 invariantes normativas confirmadas (0 cláusulas de escape)');
      console.log('        * Niveles Adaptativos: 4 niveles verificados (Nivel 1 acotado fail-closed)');
      console.log('        * Plantilla de Reporte: Línea 0 ESTADO_OPERATIVO + Cuarteto de Rigor');
    } else {
      console.error('  FAIL  ' + rel);
      res.issues.forEach(i => console.error('        x ' + i));
      totalIssues += res.issues.length;
    }
  }

  console.log('------------------------------------------------------------------------');
  if (totalIssues === 0) {
    console.log('RESULTADO: TODAS LAS ESPECIFICACIONES CUMPLEN 1:1 CON EL CONTRATO (0 errores)');
    return 0;
  } else {
    console.error('RESULTADO: ' + totalIssues + ' discrepancia(s) detectada(s)');
    return 1;
  }
}

if (require.main === module) {
  const code = runAll();
  process.exit(code);
}

module.exports = {
  loadVocab,
  parseMarkdownAST,
  parseMarkdownTable,
  lintPromptEngineeringContent,
  lintFile
};
