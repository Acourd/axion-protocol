#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol - VibeGuard Quality Gate
 * 
 * Bloquea automáticamente código a medio construir (TODOs olvidados, stubs vacíos,
 * mocks no funcionales) antes de permitir la promoción a producción en la Fase 6 (AUDITAR).
 */

const fs = require('fs');
const path = require('path');

const ANTI_PATTERNS = [
  { pattern: /\/\/\s*TODO/i, name: 'TODO sin resolver' },
  { pattern: /\/\/\s*FIXME/i, name: 'FIXME pendiente' },
  { pattern: /throw new Error\(["'](?:not implemented|to be implemented|stub)["']\)/i, name: 'Stub vacío no implementado' },
  { pattern: /const mock[A-Z]\w*\s*=\s*\{/i, name: 'Mock estático no aislado' }
];

function scanFile(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const findings = [];

  lines.forEach((line, index) => {
    ANTI_PATTERNS.forEach(({ pattern, name }) => {
      if (pattern.test(line)) {
        findings.push({
          file: filePath,
          line: index + 1,
          rule: name,
          snippet: line.trim()
        });
      }
    });
  });

  return findings;
}

function scanDirectory(dir, extensions = ['.js', '.ts', '.jsx', '.tsx', '.py']) {
  let allFindings = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.axion' || entry.name === 'tests') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      allFindings = allFindings.concat(scanDirectory(fullPath, extensions));
    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
      allFindings = allFindings.concat(scanFile(fullPath));
    }
  }

  return allFindings;
}

function runVibeGuardGate(targetDir) {
  const root = path.resolve(targetDir || process.cwd());
  console.log(`[VibeGuard Auto-Gate] Escaneando calidad de código en: ${root}\n`);

  const findings = scanDirectory(root);

  if (findings.length === 0) {
    console.log('✓ VibeGuard PASS: Cero stubs incompletos ni anti-patrones detectados.');
    return { pass: true, findings: [] };
  }

  console.log(`⚠️ Se detectaron ${findings.length} anti-patrones de VibeCoding:`);
  findings.forEach(f => {
    console.log(`  - [${f.rule}] ${path.relative(root, f.file)}:${f.line} -> ${f.snippet}`);
  });

  return { pass: false, findings };
}

function main() {
  const res = runVibeGuardGate(process.argv[2] || process.cwd());
  process.exit(res.pass ? 0 : 1);
}

if (require.main === module) main();

module.exports = { runVibeGuardGate, scanFile };
