#!/usr/bin/env node

/**
 * Axion Protocol - Universal Zero-Friction Installer
 * 
 * Instala de forma segura y no destructiva las reglas de gobernanza,
 * slash commands, hooks en tiempo real y herramientas para:
 * - Antigravity (CLI y 2.0 GUI)
 * - Claude Code
 * - Cursor / VS Code / Codex
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const process = require('process');

function hashDe(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

/**
 * Copia segura con respaldo automático si el archivo preexistente es distinto.
 */
function copiarProtegido(src, dest) {
  if (!fs.existsSync(src)) return null;

  const parentDir = path.dirname(dest);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }

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
  console.log(`[Axion Installer] Iniciando instalación universal en: ${rootDir}\n`);

  const sourceRoot = __dirname;
  const respaldos = [];
  const anotar = (r) => { if (r) respaldos.push(r); };

  // Directorios objetivo
  const dirs = [
    '.agents/rules',
    '.agents/workflows',
    '.agents/hooks',
    '.claude/commands',
    'tools',
    'policies',
    'schemas',
    'adapters'
  ];
  dirs.forEach(d => fs.mkdirSync(path.join(rootDir, d), { recursive: true }));

  // 1. Inyectar Reglas y Workflows de Antigravity
  console.log('📦 1. Configurando Antigravity (.agents)...');
  anotar(copiarProtegido(path.join(sourceRoot, '.agents', 'AGENTS.md'), path.join(rootDir, '.agents', 'AGENTS.md')));
  anotar(copiarProtegido(path.join(sourceRoot, '.agents', 'antigravity.json'), path.join(rootDir, '.agents', 'antigravity.json')));
  anotar(copiarProtegido(path.join(sourceRoot, '.agents', 'hooks.json'), path.join(rootDir, '.agents', 'hooks.json')));
  anotar(copiarProtegido(path.join(sourceRoot, '.agents', 'hooks', 'validate-tool-call.mjs'), path.join(rootDir, '.agents', 'hooks', 'validate-tool-call.mjs')));
  anotar(copiarProtegido(path.join(sourceRoot, '.agents', 'rules', 'axion-governance.md'), path.join(rootDir, '.agents', 'rules', 'axion-governance.md')));

  // Slash commands en .agents/workflows
  const workflows = [
    'clarify.md', 'profile.md', 'rollback.md', 'preflight.md',
    'halt.md', 'unhalt.md', 'attest.md', 'review.md',
    'onboard.md', 'checkpoint.md', 'debug.md', 'compact.md', 'verify.md'
  ];
  workflows.forEach(wf => {
    anotar(copiarProtegido(path.join(sourceRoot, '.agents', 'workflows', wf), path.join(rootDir, '.agents', 'workflows', wf)));
  });
  console.log(`  ✓ ${workflows.length} Slash commands y reglas P0 inyectados en .agents/`);

  // 2. Inyectar Configuración para Claude Code
  console.log('\n📦 2. Configurando Claude Code (.claude)...');
  anotar(copiarProtegido(path.join(sourceRoot, 'CLAUDE.md'), path.join(rootDir, 'CLAUDE.md')));
  anotar(copiarProtegido(path.join(sourceRoot, 'CLAUDE.md'), path.join(rootDir, '.claude', 'CLAUDE.md')));
  workflows.forEach(wf => {
    anotar(copiarProtegido(path.join(sourceRoot, '.agents', 'workflows', wf), path.join(rootDir, '.claude', 'commands', wf)));
  });
  console.log('  ✓ CLAUDE.md y comandos personalizados inyectados en .claude/commands/');

  // 3. Inyectar Herramientas de Gobernanza en tools/
  console.log('\n📦 3. Inyectar Suite de Herramientas (tools/)...');
  const tools = [
    'intent_clarifier.js',
    'profile_adapter.js',
    'preflight.js',
    'rollback_plan.js',
    'killswitch.js',
    'approval_ed25519.js',
    'check_ed25519.js',
    'assurance.js',
    'attestation.js',
    'dsse.js',
    'canonical_json.js',
    'identity_canonical.js',
    'evidence_hasher.js',
    'risk_policy_compiler.js',
    'workflow_runner.js',
    'workflow_state_machine.js',
    'structured_command.js',
    'learning_engine.js',
    'git_assistant.js',
    'vibeguard.js'
  ];
  tools.forEach(t => {
    anotar(copiarProtegido(path.join(sourceRoot, 'tools', t), path.join(rootDir, 'tools', t)));
  });
  console.log(`  ✓ ${tools.length} herramientas de gobernanza copiadas en tools/`);

  // 4. Inyectar Políticas y Esquemas
  console.log('\n📦 4. Inyectar Políticas y Esquemas...');
  anotar(copiarProtegido(path.join(sourceRoot, 'policies', 'risk.yaml'), path.join(rootDir, 'policies', 'risk.yaml')));
  anotar(copiarProtegido(path.join(sourceRoot, 'adapters', 'prompt_bridge.json'), path.join(rootDir, 'adapters', 'prompt_bridge.json')));

  const schemas = [
    'approval.schema.json',
    'authority_registry.schema.json',
    'check_attestation.schema.json',
    'rollback-plan.schema.json'
  ];
  schemas.forEach(s => {
    anotar(copiarProtegido(path.join(sourceRoot, 'schemas', s), path.join(rootDir, 'schemas', s)));
  });
  console.log('  ✓ Políticas de riesgo y esquemas JSON copiados.');

  if (respaldos.length > 0) {
    console.log(`\n🛡️ [Seguridad] ${respaldos.length} archivo(s) preexistente(s) respaldado(s) de forma segura.`);
  }

  console.log('\n✅ [Axion Protocol] Instalación universal completada con éxito.');
  console.log('   Los agentes (Antigravity, Claude Code, Cursor) ahora están gobernados por el protocolo.\n');

  return {
    status: 'SUCCESS',
    target: rootDir,
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
