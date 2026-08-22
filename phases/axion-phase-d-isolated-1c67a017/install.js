#!/usr/bin/env node

/**
 * Axion Protocol - Autonomous One-Command Multi-Harness Installer
 * 
 * Instala e inyecta autónomamente las reglas de gobernanza y herramientas
 * para Antigravity, Claude Code, Cursor, Codex y Gemini en 1 solo paso.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const process = require('process');

function hashDe(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

/**
 * Copia preservando cualquier contenido preexistente distinto.
 * - destino ausente        -> copia directa
 * - destino idéntico       -> no hace nada (idempotente)
 * - destino distinto       -> respalda en <archivo>.axion-backup-<ISO8601> y luego copia
 * Devuelve la ruta del respaldo creado, o null.
 */
function copiarProtegido(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.copyFileSync(src, dest);
    return null;
  }
  if (hashDe(src) === hashDe(dest)) {
    return null;
  }
  const marca = new Date().toISOString().replace(/[:.]/g, '-');
  const respaldo = `${dest}.axion-backup-${marca}`;
  fs.copyFileSync(dest, respaldo);
  fs.copyFileSync(src, dest);
  console.log(`  ! Contenido preexistente respaldado en: ${path.basename(respaldo)}`);
  return respaldo;
}

function runInstallation(targetDir) {
  const rootDir = path.resolve(targetDir || process.cwd());
  console.log(`[Axion Installer] Iniciando instalación autónoma en: ${rootDir}`);

  const agentsDir = path.join(rootDir, '.agents');
  const claudeDir = path.join(rootDir, '.claude');
  const toolsDir = path.join(rootDir, 'tools');
  const adaptersDir = path.join(rootDir, 'adapters');
  const schemasDir = path.join(rootDir, 'schemas');

  fs.mkdirSync(agentsDir, { recursive: true });
  fs.mkdirSync(claudeDir, { recursive: true });
  fs.mkdirSync(toolsDir, { recursive: true });
  fs.mkdirSync(adaptersDir, { recursive: true });
  fs.mkdirSync(schemasDir, { recursive: true });

  const sourceRoot = __dirname;
  const respaldos = [];
  const anotar = (r) => { if (r) respaldos.push(r); };

  // 1. Copiar reglas para Antigravity / Gemini (.agents/AGENTS.md)
  const srcAgentsMd = path.join(sourceRoot, '.agents', 'AGENTS.md');
  const destAgentsMd = path.join(agentsDir, 'AGENTS.md');
  if (fs.existsSync(srcAgentsMd)) {
    anotar(copiarProtegido(srcAgentsMd, destAgentsMd));
    console.log(`  ✓ Reglas Antigravity inyectadas: .agents/AGENTS.md`);
  }

  // 2. Copiar reglas para Claude Code (CLAUDE.md y .claude/CLAUDE.md)
  const srcClaudeMd = path.join(sourceRoot, 'CLAUDE.md');
  const destClaudeMd = path.join(rootDir, 'CLAUDE.md');
  if (fs.existsSync(srcClaudeMd)) {
    anotar(copiarProtegido(srcClaudeMd, destClaudeMd));
    console.log(`  ✓ Reglas Claude Code inyectadas: CLAUDE.md`);
  }

  const srcDotClaudeMd = path.join(sourceRoot, '.claude', 'CLAUDE.md');
  const destDotClaudeMd = path.join(claudeDir, 'CLAUDE.md');
  if (fs.existsSync(srcDotClaudeMd)) {
    anotar(copiarProtegido(srcDotClaudeMd, destDotClaudeMd));
    console.log(`  ✓ Reglas Claude Code inyectadas: .claude/CLAUDE.md`);
  }

  // 3. Copiar herramientas clave en tools/
  const toolsToCopy = [
    'intent_clarifier.js',
    'preflight.js',
    'evidence_hasher.js',
    'workflow_runner.js',
    'learning_engine.js',
    'git_assistant.js',
    'vibeguard.js'
  ];
  toolsToCopy.forEach(toolFile => {
    const srcTool = path.join(sourceRoot, 'tools', toolFile);
    const destTool = path.join(toolsDir, toolFile);
    if (fs.existsSync(srcTool)) {
      anotar(copiarProtegido(srcTool, destTool));
      console.log(`  ✓ Herramienta inyectada: tools/${toolFile}`);
    }
  });

  // 4. Copiar adaptadores estáticos en adapters/
  const srcAdapter = path.join(sourceRoot, 'adapters', 'prompt_bridge.json');
  const destAdapter = path.join(adaptersDir, 'prompt_bridge.json');
  if (fs.existsSync(srcAdapter)) {
    anotar(copiarProtegido(srcAdapter, destAdapter));
    console.log(`  ✓ Adaptador plano inyectado: adapters/prompt_bridge.json`);
  }

  if (respaldos.length > 0) {
    console.log(`\n[Axion Installer] ${respaldos.length} archivo(s) preexistente(s) respaldado(s); ningún contenido se perdió.`);
  }
  console.log('\n[Axion Installer] Instalación completada exitosamente.');
  console.log('Antigravity y Claude Code ahora detectarán y aplicarán automáticamente Axion Protocol en este proyecto.\n');

  return {
    status: 'SUCCESS',
    installedRoot: rootDir,
    filesCount: 11,
    backups: respaldos
  };
}

function main() {
  const args = process.argv.slice(2);
  let target = process.cwd();

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--target' && args[i + 1]) {
      target = args[i + 1];
      break;
    }
  }

  runInstallation(target);
}

if (require.main === module) {
  main();
}

module.exports = { runInstallation };
