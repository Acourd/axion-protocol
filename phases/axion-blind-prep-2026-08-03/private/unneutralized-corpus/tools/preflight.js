#!/usr/bin/env node

/**
 * Axion Protocol - Lexical Preflight Verification Tool (DA-0015 / Rule C9)
 * 
 * Verifica comandos de shell/PowerShell antes de su ejecución para detectar
 * problemas léxicos, comillas desbalanceadas, sintaxis insegura, comandos destructivos
 * y bloqueos de instalación masiva de dependencias (Zero-Bloat Gate).
 */

const process = require('process');

function runPreflight(commandStr) {
  if (!commandStr || typeof commandStr !== 'string' || commandStr.trim() === '') {
    return {
      status: 'STOP',
      reason: 'El comando proporcionado está vacío o no es una cadena válida.',
      checks: []
    };
  }

  const trimmed = commandStr.trim();
  const checks = [];

  // Check 1: Balance de comillas dobles y simples
  const doubleQuotes = (trimmed.match(/"/g) || []).length;
  const singleQuotes = (trimmed.match(/'/g) || []).length;

  if (doubleQuotes % 2 !== 0) {
    return {
      status: 'STOP',
      reason: 'Comillas dobles (") desbalanceadas en el comando.',
      command: trimmed
    };
  }
  checks.push('Balance de comillas dobles OK');

  if (singleQuotes % 2 !== 0) {
    return {
      status: 'STOP',
      reason: 'Comillas simples (\') desbalanceadas en el comando.',
      command: trimmed
    };
  }
  checks.push('Balance de comillas simples OK');

  // Check 2: Verificación de sintaxis de variables inseguras de PowerShell / Bash ($ descolgados)
  const danglingDollar = /\$\s+[a-zA-Z]/.test(trimmed);
  if (danglingDollar) {
    return {
      status: 'STOP',
      reason: 'Sintaxis de variable ambigua ($ seguido de espacio en blanco antes de identificador).',
      command: trimmed
    };
  }
  checks.push('Sintaxis de variables OK');

  // Check 3: Bloqueo de comandos destructivos.
  // Se detecta por VERBO en posición de comando, no por literal: la forma de los flags,
  // su orden y el objetivo no deben poder evadir la barrera.
  const DESTRUCTIVE_VERBS = new Set([
    // POSIX
    'rm', 'rmdir', 'unlink', 'shred', 'srm', 'mkfs', 'dd',
    // cmd.exe
    'rd', 'del', 'erase', 'format', 'diskpart', 'fdisk',
    // PowerShell (cmdlets y alias)
    'remove-item', 'ri', 'clear-content', 'clc', 'clear-item', 'cli',
    'remove-itemproperty', 'rp', 'format-volume', 'clear-disk',
    'initialize-disk', 'remove-partition', 'reset-physicaldisk'
  ]);

  const DESTRUCTIVE_SEQUENCES = [
    { pattern: /\bgit\s+clean\b/i, label: 'git clean elimina archivos no versionados' },
    { pattern: /\bgit\s+reset\s+--hard\b/i, label: 'git reset --hard descarta cambios y commits' },
    { pattern: /\bgit\s+checkout\s+--\s/i, label: 'git checkout -- descarta cambios locales' },
    { pattern: /\bgit\s+push\s+(-f\b|--force(?!-with-lease))/i, label: 'git push --force reescribe historia remota' },
    { pattern: /\|\s*(sh|bash|zsh|iex|invoke-expression)\b/i, label: 'ejecución de contenido recibido por tubería' },
    { pattern: />\s*\/dev\/null\s+2>&1\s+;\s+rm/i, label: 'encadenamiento destructivo oculto' }
  ];

  // Separadores de comando: cada segmento se evalúa por su verbo inicial.
  const commandSegments = trimmed.split(/[;&|\n\r]+/);
  const leadingVerb = (segment) => {
    const raw = segment.trim().split(/\s+/)[0] || '';
    const base = raw.split(/[\\/]/).pop().toLowerCase();
    return base.replace(/\.(exe|cmd|bat|ps1)$/, '');
  };

  for (const segment of commandSegments) {
    const verb = leadingVerb(segment);
    if (DESTRUCTIVE_VERBS.has(verb)) {
      return {
        status: 'STOP',
        reason: `Comando destructivo detectado ("${verb}"). Requiere aprobación explícita de Human Authority.`,
        command: trimmed
      };
    }
  }

  for (const danger of DESTRUCTIVE_SEQUENCES) {
    if (danger.pattern.test(trimmed)) {
      return {
        status: 'STOP',
        reason: `Patrón de comando peligroso bloqueado: ${danger.label}`,
        command: trimmed
      };
    }
  }
  checks.push('Filtro de seguridad de patrones destructivos OK');

  // Check 4: Zero-Bloat Gate (Instalación de paquetes externos exige GATE)
  const packageInstallPattern = /(npm\s+(i|install|add)|yarn\s+add|pip\s+install|pnpm\s+add|bun\s+add)\s+[\w\-@\/]+/i;
  if (packageInstallPattern.test(trimmed)) {
    return {
      status: 'STOP',
      reason: 'Zero-Bloat Gate: Intento de instalación de dependencias externas detectado. Se requiere aprobación explícita de Human Authority.',
      command: trimmed
    };
  }
  checks.push('Zero-Bloat Package Filter OK');

  return {
    status: 'PASS',
    command: trimmed,
    checks: checks
  };
}

function main() {
  const args = process.argv.slice(2);
  let commandToTest = '';

  if (args.length === 0) {
    console.log('Uso: node tools/preflight.js "<comando_a_verificar>"');
    process.exit(0);
  }

  commandToTest = args.join(' ');
  const result = runPreflight(commandToTest);

  console.log(JSON.stringify(result, null, 2));

  if (result.status === 'STOP') {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

module.exports = { runPreflight };
