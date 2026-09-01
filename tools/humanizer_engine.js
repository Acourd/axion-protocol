#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Humanizer Engine & Anti-AI Slop Processor
 *
 * Módulo Clean-Room transversal para auditoría y humanización de textos y READMEs:
 * 1. Detección Léxica de Clichés de IA (AI Slop Lexicon en inglés y español).
 * 2. Análisis de Cadencia y Variación de Longitud de Oraciones (Burstiness / Entropy).
 * 3. Supresión de Fórmulas Retóricas Vacías y Exceso de Enfatización.
 * 4. Modo Automático para READMEs (--readme / --apply) con sugerencias pragmáticas de ingeniería.
 *
 * 100% Clean-Room · Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');

// Diccionario de patrones y delatores clásicos de IA (EN / ES)
const AI_TELLS_LEXICON = [
  // Inglés
  { pattern: /\bdelve(?:\s+into)?\b/gi, replacement: 'explore', label: 'inflated verb (delve)' },
  { pattern: /\btapestry\b/gi, replacement: 'system', label: 'inflated metaphor (tapestry)' },
  { pattern: /\btestament\s+to\b/gi, replacement: 'proof of', label: 'cliché (testament to)' },
  { pattern: /\bbeacon\s+of\b/gi, replacement: 'model for', label: 'cliché (beacon of)' },
  { pattern: /\bmultifaceted\b/gi, replacement: 'complex', label: 'fluff adjective (multifaceted)' },
  { pattern: /\bgame-changing\b/gi, replacement: 'effective', label: 'marketing buzzword (game-changing)' },
  { pattern: /\bit'?s\s+worth\s+noting\s+(?:that)?\b/gi, replacement: 'notably,', label: 'filler phrase (it is worth noting)' },
  { pattern: /\bat\s+its\s+core\b/gi, replacement: 'fundamentally', label: 'filler phrase (at its core)' },
  { pattern: /\bseamlessly\b/gi, replacement: 'directly', label: 'buzzword (seamlessly)' },
  { pattern: /\brobust\b/gi, replacement: 'reliable', label: 'overused adjective (robust)' },
  { pattern: /\bparadigm\s+shift\b/gi, replacement: 'shift', label: 'buzzword (paradigm shift)' },

  // Español
  { pattern: /\bprofundizar\s+en\s+el\s+tapiz\b/gi, replacement: 'analizar el sistema', label: 'metáfora de IA (tapiz)' },
  { pattern: /\bpiedra\s+angular\b/gi, replacement: 'base', label: 'cliché retórico (piedra angular)' },
  { pattern: /\bsin\s+precedentes\b/gi, replacement: 'destacado', label: 'hipérbole (sin precedentes)' },
  { pattern: /\brevolucionando\b/gi, replacement: 'transformando', label: 'exageración (revolucionando)' },
  { pattern: /\bes\s+importante\s+destacar\s+que\b/gi, replacement: 'destaca que', label: 'muletilla de relleno' },
  { pattern: /\ben\s+el\s+panorama\s+actual\b/gi, replacement: 'actualmente', label: 'frase de relleno' },
  { pattern: /\bfacilitando\s+un\s+viaje\b/gi, replacement: 'permitiendo', label: 'metáfora artificial' },
  { pattern: /\bfaro\s+de\b/gi, replacement: 'referente de', label: 'cliché (faro de)' },
  { pattern: /\bhol[íi]stico\b/gi, replacement: 'integral', label: 'palabra sobreutilizada (holístico)' },
  { pattern: /\bde\s+manera\s+fluida\b/gi, replacement: 'directamente', label: 'adverbio artificial' }
];

class HumanizerEngine {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * Analiza un texto y devuelve el índice de "AI Slop", delatores encontrados y métricas de cadencia.
   */
  analyze(text = '') {
    if (!text || typeof text !== 'string') {
      return { slopScore: 0, matches: [], sentenceStats: { count: 0, avgLength: 0, variance: 0 }, isSlopFree: true };
    }

    const matches = [];
    let detectedCount = 0;

    for (const item of AI_TELLS_LEXICON) {
      const found = text.match(item.pattern);
      if (found) {
        detectedCount += found.length;
        matches.push({
          label: item.label,
          count: found.length,
          replacement: item.replacement
        });
      }
    }

    // Análisis de variación de oraciones (Cadencia humana vs robótica)
    const sentences = text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 5);

    const wordCounts = sentences.map(s => s.split(/\s+/).filter(Boolean).length);
    const count = wordCounts.length;
    const avgLength = count > 0 ? (wordCounts.reduce((a, b) => a + b, 0) / count) : 0;

    let variance = 0;
    if (count > 1) {
      const sumSq = wordCounts.reduce((acc, len) => acc + Math.pow(len - avgLength, 2), 0);
      variance = parseFloat((sumSq / count).toFixed(2));
    }

    // Cálculo del índice de artificialidad (0 a 100)
    // Alta presencia de delatores léxicos y muy baja varianza de oraciones incrementan el score
    const densityPenalty = Math.min(60, detectedCount * 12);
    const monotonyPenalty = (count > 3 && variance < 8) ? 20 : 0;
    const slopScore = Math.min(100, densityPenalty + monotonyPenalty);

    return {
      slopScore,
      detectedTellsCount: detectedCount,
      matches,
      sentenceStats: {
        totalSentences: count,
        avgWordsPerSentence: parseFloat(avgLength.toFixed(1)),
        cadenceVariance: variance,
        isCadenceNatural: variance >= 8 || count <= 3
      },
      isSlopFree: slopScore < 15
    };
  }

  /**
   * Aplica reemplazos de humanización sobre un texto.
   */
  humanize(text = '') {
    if (!text || typeof text !== 'string') return text;

    let cleaned = text;
    for (const item of AI_TELLS_LEXICON) {
      cleaned = cleaned.replace(item.pattern, item.replacement);
    }

    // Limpieza de redundancias de puntuación (exceso de guiones largos seguidos)
    cleaned = cleaned.replace(/\s*—\s*/g, ' — ');

    return cleaned;
  }

  /**
   * Procesa un archivo (p. ej. README.md) y opcionalmente aplica los cambios.
   */
  processFile(filePath, applyChanges = false) {
    const absPath = path.resolve(filePath);
    if (!fs.existsSync(absPath)) {
      throw new Error(`Archivo no encontrado: ${absPath}`);
    }

    const original = fs.readFileSync(absPath, 'utf8');
    const analysis = this.analyze(original);

    let updated = original;
    if (applyChanges) {
      updated = this.humanize(original);
      if (updated !== original) {
        fs.writeFileSync(absPath, updated, 'utf8');
      }
    }

    return {
      filePath: absPath,
      analysis,
      modified: applyChanges && updated !== original
    };
  }
}

// Ejecución CLI directa
if (require.main === module) {
  const args = process.argv.slice(2);
  const targetFile = args.find(a => !a.startsWith('--')) || 'README.md';
  const shouldApply = args.includes('--apply');

  const engine = new HumanizerEngine();
  try {
    const result = engine.processFile(targetFile, shouldApply);
    console.log(`=== Axion Humanizer Engine ===`);
    console.log(`Archivo: ${path.basename(result.filePath)}`);
    console.log(`Índice de AI Slop: ${result.analysis.slopScore}% (${result.analysis.isSlopFree ? '✓ Texto Natural' : '⚠ Patrones Detectados'})`);
    console.log(`Delatores detectados: ${result.analysis.detectedTellsCount}`);
    console.log(`Cadencia de oraciones: Promedio ${result.analysis.sentenceStats.avgWordsPerSentence} palabras/oración (Varianza: ${result.analysis.sentenceStats.cadenceVariance})`);
    
    if (result.analysis.matches.length > 0) {
      console.log(`\nPatrones a humanizar:`);
      result.analysis.matches.forEach(m => console.log(`  - ${m.label} (${m.count}x) -> sugerencia: "${m.replacement}"`));
    }

    if (shouldApply) {
      console.log(`\n✓ Cambios aplicados en el archivo: ${result.modified ? 'Sí' : 'No se requirieron modificaciones'}`);
    } else {
      console.log(`\nTip: Ejecuta con --apply para humanizar automáticamente.`);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

module.exports = HumanizerEngine;
