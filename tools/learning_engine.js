#!/usr/bin/env node

/**
 * Axion Protocol - Multi-Domain Structured Human Feedback Learning Engine
 * 
 * Captura la retroalimentación del humano en cualquier contexto o situación,
 * extrae la lección empírica, la clasifica semánticamente y la persiste en LEARNINGS.md.
 */

const fs = require('fs');
const path = require('path');
const process = require('process');

function classifyFeedbackCategory(feedbackText) {
  if (!feedbackText || typeof feedbackText !== 'string') return 'GENERAL_LESSON';
  const lower = feedbackText.toLowerCase();

  // 1. Preferencias de producto, visión e intención del creador
  if (/prefiero|quiero|visión|no técnico|sencillo|mantén|evita|prioriza|intención|propósito|meta/i.test(lower)) {
    return 'PRODUCT_PREFERENCE';
  }

  // 2. Reglas de seguridad, prevención de riesgos y protección
  if (/seguridad|cuidado|riesgo|no borres|inseguro|bloquea|permiso|secreto|sensible|precaución|destructivo|peligro|vulnerabilidad|eval|inyección|prohibido/i.test(lower)) {
    return 'SAFETY_RULE';
  }

  // 3. Diseño de experiencia de usuario (UX/UI) y pantalla
  if (/pantalla|color|interfaz|botón|diseño|vista|usuario|menu|visual|panel|formulario|layout/i.test(lower)) {
    return 'UX_DESIGN';
  }

  // 4. Rendimiento, velocidad y optimización
  if (/rápido|velocidad|rendimiento|optimiza|lento|memoria|espera|eficiencia|peso|ligero/i.test(lower)) {
    return 'PERFORMANCE_RULE';
  }

  // 5. Patrones de código y arquitectura
  if (/código|función|módulo|clase|patrón|refactor|estructura|archivo|limpio|estándar/i.test(lower)) {
    return 'CODE_PATTERN';
  }

  return 'GENERAL_LESSON';
}

function captureHumanFeedback(feedbackText, options = {}) {
  if (!feedbackText || typeof feedbackText !== 'string' || feedbackText.trim() === '') {
    return { status: 'NO_FEEDBACK_DETECTED' };
  }

  const trimmed = feedbackText.trim();
  const category = options.category || classifyFeedbackCategory(trimmed);
  const timestamp = new Date().toISOString().split('T')[0];

  const structuredLesson = {
    date: timestamp,
    category: category,
    rawFeedback: trimmed,
    rule: `Regla derivada [${category}]: ${trimmed}`
  };

  const targetFile = options.targetFile || path.resolve(process.cwd(), 'LEARNINGS.md');
  const markdownEntry = `\n- **[${category}]** (${timestamp}): ${trimmed}\n`;

  // appendFileSync crea el archivo si no existe. Si falla, NO se sobrescribe:
  // truncar el historial acumulado sería una pérdida irreversible de memoria durable
  // (policies/retention.yaml -> failure_behavior: PRESERVE_AND_BLOCK).
  try {
    fs.appendFileSync(targetFile, markdownEntry, 'utf8');
  } catch (err) {
    return {
      status: 'LEARNING_FAILED',
      category: category,
      targetFile: targetFile,
      error: err.message,
      entry: structuredLesson
    };
  }

  return {
    status: 'LEARNING_RECORDED',
    category: category,
    entry: structuredLesson
  };
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Uso: node tools/learning_engine.js "<comentario_o_retroalimentacion_del_humano>"');
    process.exit(0);
  }

  const feedback = args.join(' ');
  const result = captureHumanFeedback(feedback);
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main();
}

module.exports = { captureHumanFeedback, classifyFeedbackCategory };
