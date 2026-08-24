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
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const process = require('process');

// Fuente única de la lista de comandos: se lee del directorio en vez de escribirse a mano.
// Tenerla duplicada garantizaba que el ámbito de usuario y el de proyecto acabaran
// instalando conjuntos distintos, y que añadir un comando nuevo se olvidara en uno de los dos.
const WORKFLOWS = Object.freeze(
  fs.readdirSync(path.join(__dirname, '.agents', 'workflows'))
    .filter((f) => f.endsWith('.md'))
    .sort(),
);

function hashDe(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

/**
 * Copia segura con respaldo automático si el archivo preexistente es distinto.
 * Devuelve la ruta de respaldo si hubo que hacer uno, o null.
 * Si el ORIGEN no existe lo registra en `ausentes`: antes se devolvia null en silencio,
 * indistinguible de "no hizo falta respaldar". Con el tarball mal empaquetado, el
 * instalador copiaba cero workflows y aun asi anunciaba que los habia inyectado todos.
 */
function copiarProtegido(src, dest, ausentes) {
  if (!fs.existsSync(src)) {
    if (ausentes) ausentes.push(path.relative(__dirname, src).split(path.sep).join('/'));
    return null;
  }

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

/**
 * Instala los slash commands en el ámbito de USUARIO (~/.claude/commands).
 *
 * Por qué existe: Claude Code lee los comandos de proyecto desde la raíz de la sesión.
 * Quien arranca Claude Code un directorio más arriba del proyecto —o trabaja con varios
 * proyectos Axion— no ve ni un comando, y el chequeo de salud le da verde igualmente,
 * porque audita el proyecto y no el sitio donde el runtime los busca de verdad.
 *
 * Solo viajan los comandos. Las herramientas, políticas y esquemas se quedan en el
 * proyecto: son código con rutas relativas, y el directorio personal de alguien no es
 * sitio para desplegar un runtime. Eso implica un límite que conviene decir en voz alta:
 * un comando de usuario invocado FUERA de un proyecto Axion cargará el prompt, pero los
 * "node tools/..." que cita no resolverán. Sirve para alcanzar tus proyectos Axion desde
 * cualquier directorio, no para llevarte la gobernanza a proyectos que no la tienen.
 */
function runUserInstallation(homeDir) {
  const home = path.resolve(homeDir || os.homedir());
  const destino = path.join(home, '.claude', 'commands');
  console.log(`[Axion Installer] Instalando slash commands de usuario en: ${destino}\n`);

  fs.mkdirSync(destino, { recursive: true });
  const respaldos = [];
  const ausentes = [];

  for (const wf of WORKFLOWS) {
    const r = copiarProtegido(path.join(__dirname, '.agents', 'workflows', wf), path.join(destino, wf), ausentes);
    if (r) respaldos.push(r);
  }

  const faltantes = [...new Set(ausentes)];
  if (faltantes.length > 0) {
    console.log(`\n❌ [Axion Protocol] Faltan ${faltantes.length} comando(s) en el paquete de origen:`);
    faltantes.forEach((a) => console.log(`   - ${a}`));
    return { status: 'INCOMPLETE', target: destino, backups: respaldos, missing: faltantes };
  }

  console.log(`  ✓ ${WORKFLOWS.length} slash commands disponibles desde cualquier directorio.`);
  if (respaldos.length > 0) {
    console.log(`  🛡️ ${respaldos.length} archivo(s) preexistente(s) respaldado(s) antes de sobrescribir.`);
  }
  console.log('');
  console.log('  Límite declarado: el prompt se cargará en cualquier proyecto, pero las');
  console.log('  herramientas que cita solo resuelven dentro de un proyecto con Axion instalado.');
  console.log('');
  return { status: 'SUCCESS', target: destino, backups: respaldos, missing: [] };
}

function runInstallation(targetDir) {
  const rootDir = path.resolve(targetDir || process.cwd());
  console.log(`[Axion Installer] Iniciando instalación universal en: ${rootDir}\n`);

  const sourceRoot = __dirname;
  const respaldos = [];
  const ausentes = [];
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
  anotar(copiarProtegido(path.join(sourceRoot, '.agents', 'AGENTS.md'), path.join(rootDir, '.agents', 'AGENTS.md'), ausentes));
  anotar(copiarProtegido(path.join(sourceRoot, '.agents', 'antigravity.json'), path.join(rootDir, '.agents', 'antigravity.json'), ausentes));
  anotar(copiarProtegido(path.join(sourceRoot, '.agents', 'hooks.json'), path.join(rootDir, '.agents', 'hooks.json'), ausentes));
  anotar(copiarProtegido(path.join(sourceRoot, '.agents', 'hooks', 'validate-tool-call.mjs'), path.join(rootDir, '.agents', 'hooks', 'validate-tool-call.mjs'), ausentes));
  anotar(copiarProtegido(path.join(sourceRoot, '.agents', 'rules', 'axion-governance.md'), path.join(rootDir, '.agents', 'rules', 'axion-governance.md'), ausentes));

  // La lista sale de WORKFLOWS, no de una copia escrita a mano: los dos ámbitos tienen
  // que instalar exactamente el mismo conjunto, y una lista duplicada se olvida de la
  // mitad el día que se añade un comando.
  const workflows = WORKFLOWS;
  workflows.forEach(wf => {
    anotar(copiarProtegido(path.join(sourceRoot, '.agents', 'workflows', wf), path.join(rootDir, '.agents', 'workflows', wf), ausentes));
  });
  console.log(`  ✓ ${workflows.length} Slash commands y reglas P0 inyectados en .agents/`);

  // 2. Inyectar Configuración para Claude Code
  console.log('\n📦 2. Configurando Claude Code (.claude)...');
  anotar(copiarProtegido(path.join(sourceRoot, 'CLAUDE.md'), path.join(rootDir, 'CLAUDE.md'), ausentes));
  anotar(copiarProtegido(path.join(sourceRoot, 'CLAUDE.md'), path.join(rootDir, '.claude', 'CLAUDE.md'), ausentes));
  workflows.forEach(wf => {
    anotar(copiarProtegido(path.join(sourceRoot, '.agents', 'workflows', wf), path.join(rootDir, '.claude', 'commands', wf), ausentes));
  });
  console.log(`  ✓ CLAUDE.md y ${workflows.length} slash commands inyectados en .claude/commands/`);

  // El hook solo corre si esta registrado. Se registra en .claude/settings.json, que es
  // un archivo del usuario: si ya existe se respeta y se le dice que anadir, porque
  // sobrescribir la configuracion de alguien para instalar una salvaguarda es
  // exactamente la clase de accion de la que esta salvaguarda protege.
  const settingsPath = path.join(rootDir, '.claude', 'settings.json');
  if (!fs.existsSync(settingsPath)) {
    anotar(copiarProtegido(path.join(sourceRoot, '.claude', 'settings.json'), settingsPath, ausentes));
    console.log('  ✓ Hook PreToolUse registrado en .claude/settings.json');
  } else if (!fs.readFileSync(settingsPath, 'utf8').includes('validate-tool-call.mjs')) {
    console.log('  ! .claude/settings.json ya existe y no registra el hook. No se ha tocado.');
    console.log('    Anade a mano, dentro de "hooks"."PreToolUse", un matcher "Bash" con:');
    console.log('      node "$CLAUDE_PROJECT_DIR/.agents/hooks/validate-tool-call.mjs"');
  } else {
    console.log('  ✓ Hook PreToolUse ya estaba registrado en .claude/settings.json');
  }

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
    'vibeguard.js',
    // Las citan los workflows /checkpoint, /rollback, /compact, /verify, /onboard y
    // /attest. Sin copiarlas, esos comandos apuntaban a archivos inexistentes en cuanto
    // el protocolo salia de su propio repositorio.
    'checkpoint.js',
    'context_shield.js',
    'verify_changes.js',
    'health_check.js',
    'emit_attestation.js',
    'vibeguard_gate.js',
    'memory.js',
    'deep_reasoning.js',
    'fuzzer.js',
    'premortem.js'
  ];
  tools.forEach(t => {
    anotar(copiarProtegido(path.join(sourceRoot, 'tools', t), path.join(rootDir, 'tools', t), ausentes));
  });
  console.log(`  ✓ ${tools.length} herramientas de gobernanza copiadas en tools/`);

  // 4. Inyectar Políticas y Esquemas
  console.log('\n📦 4. Inyectar Políticas y Esquemas...');
  anotar(copiarProtegido(path.join(sourceRoot, 'policies', 'risk.yaml'), path.join(rootDir, 'policies', 'risk.yaml'), ausentes));
  anotar(copiarProtegido(path.join(sourceRoot, 'adapters', 'prompt_bridge.json'), path.join(rootDir, 'adapters', 'prompt_bridge.json'), ausentes));

  const schemas = [
    'approval.schema.json',
    'authority_registry.schema.json',
    'check_attestation.schema.json',
    'rollback-plan.schema.json'
  ];
  schemas.forEach(s => {
    anotar(copiarProtegido(path.join(sourceRoot, 'schemas', s), path.join(rootDir, 'schemas', s), ausentes));
  });
  console.log('  ✓ Políticas de riesgo y esquemas JSON copiados.');

  // Un instalador que anuncia exito sobre un payload incompleto es peor que uno que
  // falla: el usuario cree tener gobernanza donde no la hay.
  if (ausentes.length > 0) {
    console.log(`\n❌ [Axion Protocol] Faltan ${ausentes.length} archivo(s) en el paquete de origen:`);
    ausentes.forEach(a => console.log(`   - ${a}`));
    console.log('   La instalación está INCOMPLETA. Reinstala el paquete o clona el repositorio.\n');
    return { status: 'INCOMPLETE', target: rootDir, backups: respaldos, missing: faltantes };
  }

  if (respaldos.length > 0) {
    console.log(`\n🛡️ [Seguridad] ${respaldos.length} archivo(s) preexistente(s) respaldado(s) de forma segura.`);
  }

  console.log('\n✅ [Axion Protocol] Instalación universal completada con éxito.');
  console.log('   Los agentes (Antigravity, Claude Code, Cursor) ahora están gobernados por el protocolo.\n');

  return {
    status: 'SUCCESS',
    target: rootDir,
    backups: respaldos,
    missing: []
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

  // El ambito de usuario es una instalacion distinta, no una variante de la de proyecto:
  // escribe fuera del arbol y solo lleva los comandos.
  if (args.includes('--user')) {
    const iHome = args.indexOf('--home');
    const r = runUserInstallation(iHome !== -1 ? args[iHome + 1] : null);
    process.exit(r.status === 'SUCCESS' ? 0 : 1);
  }

  const r = runInstallation(target);
  // Salir con 0 tras una instalacion incompleta la haria pasar por buena en cualquier CI.
  process.exit(r.status === 'SUCCESS' ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = { runInstallation, runUserInstallation, WORKFLOWS };
