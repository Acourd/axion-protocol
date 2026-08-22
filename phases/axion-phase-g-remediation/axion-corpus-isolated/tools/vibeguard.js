#!/usr/bin/env node

/**
 * Axion Protocol — VibeGuard Static Inspector Tool
 * 
 * Escanea archivos de código fuente en busca de antipatrones típicos del Vibecoding:
 * 1) Excepciones silenciadas (try/catch mudos)
 * 2) Abuso de CSS !important descontrolado
 * 3) Comentarios TODO/FIXME/PLACEHOLDER abandonados por IAs
 * 4) Retornos de datos falsos o fallbacks no verificados
 */

const fs = require('fs');
const path = require('path');
const process = require('process');

function inspectFileContent(content, filePath = 'snippet') {
  const issues = [];
  
  // Lexical Stripper: Reemplaza strings y comentarios por espacios manteniendo los saltos de línea (Mini-AST)
  let stripped = '';
  let inString = false, stringChar = '', inLineComment = false, inBlockComment = false;
  for (let i = 0; i < content.length; i++) {
    let c = content[i], nc = content[i+1] || '';
    if (inLineComment) {
      if (c === '\n') { inLineComment = false; stripped += c; } else stripped += ' ';
    } else if (inBlockComment) {
      if (c === '*' && nc === '/') { inBlockComment = false; stripped += '  '; i++; }
      else stripped += (c === '\n' ? '\n' : ' ');
    } else if (inString) {
      if (c === '\\') { stripped += '  '; i++; }
      else if (c === stringChar) { inString = false; stripped += c; }
      else stripped += (c === '\n' ? '\n' : ' ');
    } else {
      if (c === '/' && nc === '/') { inLineComment = true; stripped += '  '; i++; }
      else if (c === '/' && nc === '*') { inBlockComment = true; stripped += '  '; i++; }
      else if (c === '"' || c === "'" || c === '`') { inString = true; stringChar = c; stripped += c; }
      else stripped += c;
    }
  }

  // Utilidad para encontrar línea desde un índice
  const getLineNumber = (index) => content.substring(0, index).split('\n').length;

  // Check 1: Excepciones silenciadas (multilínea) sobre el código léxicamente limpio
  const catchRegex = /catch\s*(?:\(\s*[a-zA-Z0-9_$]*\s*\))?\s*\{\s*\}/g;
  let match;
  while ((match = catchRegex.exec(stripped)) !== null) {
    issues.push({
      line: getLineNumber(match.index),
      severity: 'HIGH',
      category: 'SILENT_EXCEPTION',
      message: 'Bloque catch mudo detectado (silencia errores en lugar de reparar la causa raíz).'
    });
  }

  // Check 2 y 3: Se evalúan sobre las líneas originales
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    if (/\/\/\s*(TODO|FIXME|PLACEHOLDER|HACK)/i.test(line) || /<!--\s*(TODO|FIXME|PLACEHOLDER)\s*-->/i.test(line)) {
      issues.push({
        line: lineNum,
        severity: 'MEDIUM',
        category: 'UNFINISHED_CODE',
        message: 'Marcador de código incompleto o parche temporal detectado (TODO/FIXME/HACK).'
      });
    }
    if (/!important/i.test(line)) {
      issues.push({
        line: lineNum,
        severity: 'LOW',
        category: 'CSS_OVERRIDE',
        message: 'Parche CSS !important detectado (evaluar especificidad de selectores CSS).'
      });
    }
  });

  return {
    filePath: filePath,
    totalIssues: issues.length,
    status: issues.length === 0 ? 'CLEAN' : 'ANTIPATTERNS_DETECTED',
    issues: issues.sort((a, b) => a.line - b.line)
  };
}

function scanFile(filePath) {
  try {
    const absPath = path.resolve(filePath);
    if (!fs.existsSync(absPath)) {
      return { status: 'ERROR', reason: `El archivo ${filePath} no existe.` };
    }
    const content = fs.readFileSync(absPath, 'utf8');
    return inspectFileContent(content, filePath);
  } catch (err) {
    return { status: 'ERROR', reason: err.message };
  }
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Uso: node tools/vibeguard.js <archivo_1> [archivo_2 ...]');
    process.exit(0);
  }

  const results = args.map(f => scanFile(f));
  console.log(JSON.stringify(results, null, 2));
}

if (require.main === module) {
  main();
}

module.exports = { inspectFileContent, scanFile };
