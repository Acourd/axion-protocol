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
  fs.readdirSync(path.join(__dirname, '.agents', 'skills'), { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(__dirname, '.agents', 'skills', e.name, 'SKILL.md')))
    .map((e) => e.name + '.md')
    .sort(),
);

// Antigravity monta las skills desde .agents/skills/<nombre>/SKILL.md; Claude Code lee
// .claude/commands/<nombre>.md. Es el mismo contenido en dos formas, y esta funcion es el
// unico sitio que conoce la traduccion entre ambas.
const origenSkill = (raiz, wf) => path.join(raiz, '.agents', 'skills', wf.replace(/\.md$/, ''), 'SKILL.md');

// Directivas que OpenCode (y cualquier harness que lea AGENTS.md en la raiz) recibe.
// El bloque se marca para poder inyectarlo sin pisar un AGENTS.md que ya exista.
const MARCA_AGENTS = '<!-- axion-protocol:gobernanza -->';
const BLOQUE_AGENTS_MD = `# Axion Protocol — Gobernanza Determinista (P0)

1. **Custodia de Intención Original:** Prohibido mutar código ante peticiones vagas hasta que /clarify emita un IntentContract sellado con SHA-256.
2. **Salvaguarda Fail-Closed:** Ante errores, excepciones o presencia de .axion/HALT, toda mutación se congela de inmediato.
3. **Ejecución Estructurada de Terminal:** Todos los comandos deben ejecutarse sin sub-shell ({ executable, args, cwd, shell: false }) y pasar por node tools/preflight.js.
4. **Verificación Determinista:** Exigir exit code 0 mediante la suite de pruebas real antes de declarar cualquier tarea como completada.
5. **Rollback Semántico:** Ante cualquier petición de deshacer en lenguaje natural, ejecutar node tools/checkpoint.js restore latest y reportar el resultado real.
6. **Reportes Ejecutivos de 3 Líneas:** Toda misión concluye con [Acción Cumplida], [Métricas] y [Próximo Vector Metacognitivo].

Comandos disponibles: /attest /clarify /debug /drive /halt /memory /preflight /premortem /profile /review /snapshot /verify.
Herramientas: tools/preflight.js, tools/checkpoint.js, tools/attestation.js, tools/evidence_hasher.js, tools/killswitch.js.`;

/**
 * Genera opencode.json con los comandos de Axion registrados via config.
 *
 * Por que existe: opencode 1.18.x NO descubre comandos por archivos
 * (.opencode/commands/*.md); solo registra los declarados bajo la clave
 * `command` de opencode.json (verificado empiricamente con `opencode run`).
 */
function generarOpenCodeConfig(dirCommands, rutaSalida, ausentes) {
  if (!fs.existsSync(dirCommands)) {
    if (ausentes) ausentes.push(path.relative(process.cwd(), dirCommands).split(path.sep).join('/'));
    return null;
  }
  const command = {};
  for (const f of fs.readdirSync(dirCommands).filter((n) => n.endsWith('.md'))) {
    const name = f.replace(/\.md$/, '');
    const texto = fs.readFileSync(path.join(dirCommands, f), 'utf8');
    const fm = texto.match(/^---\n([\s\S]*?)\n---/);
    const descripcion = (fm && (fm[1].match(/^description:\s*(.+)$/m) || [])[1] || '').trim() || name;
    const cuerpo = fm ? texto.slice(fm[0].length).trim() : texto.trim();
    command[name] = {
      description: descripcion,
      template: `${cuerpo}\n\n## Argumentos del usuario\n$ARGUMENTS`,
    };
  }
  fs.writeFileSync(rutaSalida, JSON.stringify({
    $schema: 'https://opencode.ai/config.json',
    command,
  }, null, 2) + '\n', 'utf8');
  return command;
}

/**
 * Inyecta el bloque de gobernanza en AGENTS.md de la raiz sin pisar lo que ya exista.
 * Idempotente: si el marcador ya esta, no toca el archivo.
 */
function inyectarAgentsMd(rootDir) {
  const ruta = path.join(rootDir, 'AGENTS.md');
  let previo = '';
  if (fs.existsSync(ruta)) {
    previo = fs.readFileSync(ruta, 'utf8');
    if (previo.includes(MARCA_AGENTS)) return null;
  }
  const bloque = `${MARCA_AGENTS}\n\n${BLOQUE_AGENTS_MD}\n\n${MARCA_AGENTS}`;
  const contenido = previo.trim()
    ? `${previo.trim()}\n\n---\n\n${bloque}\n`
    : `# Axion Protocol\n\n${bloque}\n`;
  fs.writeFileSync(ruta, contenido, 'utf8');
  return null;
}

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
  const anotar = (r) => { if (r) respaldos.push(r); };

  for (const wf of WORKFLOWS) {
    const r = copiarProtegido(origenSkill(__dirname, wf), path.join(destino, wf), ausentes);
    if (r) respaldos.push(r);
  }

  // Antigravity tiene su propio ambito global, y no es este. Mientras solo se instalo en
  // ~/.claude/commands, quien abria un chat de Antigravity fuera de un proyecto con Axion
  // no veia ni un comando —ni el protocolo arrancaba solo— aunque la auditoria diera todo
  // en verde: el chequeo miraba la superficie de Claude Code y daba por cubierta la otra.
  const destinoAgy = path.join(home, '.gemini', 'config', 'skills');
  if (fs.existsSync(path.join(home, '.gemini'))) {
    fs.mkdirSync(destinoAgy, { recursive: true });
    for (const wf of WORKFLOWS) {
      const nombre = wf.replace(/\.md$/, '');
      const r = copiarProtegido(origenSkill(__dirname, wf), path.join(destinoAgy, nombre, 'SKILL.md'), ausentes);
      if (r) respaldos.push(r);
    }
    console.log(`  ✓ ${WORKFLOWS.length} skills instaladas en ${destinoAgy}`);
  } else {
    console.log('  · Antigravity no detectado (~/.gemini ausente): se omite su ambito global.');
  }

  // OpenCode: puerta fail-closed global (deshabilitada: el plugin host de opencode
  // 1.18.x crash/colga al interceptar bash; se entrega como .disabled y se reactiva
  // renombrando a .ts cuando la plataforma lo soporte).
  const destinoOcPlugins = path.join(home, '.config', 'opencode', 'plugins');
  fs.mkdirSync(destinoOcPlugins, { recursive: true });
  anotar(copiarProtegido(
    path.join(__dirname, '.opencode', 'plugins', 'axion-gate.ts.disabled'),
    path.join(destinoOcPlugins, 'axion-gate.ts.disabled'), ausentes));
  console.log(`  ✓ Plugin gate entregado en ${destinoOcPlugins} (estado .disabled)`);

  // No se registra en opencode.jsonc: el plugin está deshabilitado hasta que el
  // plugin host de opencode soporte interceptar bash sin crash/colgar. Para
  // reactivarlo, renombrar a axion-gate.ts y añadir "plugins": ["./plugins/axion-gate.ts"].

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
    '.agents/skills',
    '.agents/hooks',
    '.claude/commands',
    '.opencode',
    '.codex',
    '.github',
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
    const destinoSkill = origenSkill(rootDir, wf);
    fs.mkdirSync(path.dirname(destinoSkill), { recursive: true });
    anotar(copiarProtegido(origenSkill(sourceRoot, wf), destinoSkill, ausentes));
  });
  console.log(`  ✓ ${workflows.length} Slash commands y reglas P0 inyectados en .agents/`);

  // 2. Inyectar Configuración para Claude Code
  console.log('\n📦 2. Configurando Claude Code (.claude)...');
  anotar(copiarProtegido(path.join(sourceRoot, 'CLAUDE.md'), path.join(rootDir, 'CLAUDE.md'), ausentes));
  anotar(copiarProtegido(path.join(sourceRoot, 'CLAUDE.md'), path.join(rootDir, '.claude', 'CLAUDE.md'), ausentes));
  workflows.forEach(wf => {
    anotar(copiarProtegido(origenSkill(sourceRoot, wf), path.join(rootDir, '.claude', 'commands', wf), ausentes));
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

  // 2b. OpenCode, Codex y Copilot. Las tres son superficies que leen AGENTS.md en la
  //     raiz; OpenCode ademas descubre .opencode/commands/*.md y las skills de
  //     .agents/skills/ (compatibilidad nativa). Si no se despliegan aqui, el "universal"
  //     del instalador era falso: solo Antigravity y Claude recibian gobernanza.
  console.log('\n📦 2b. Configurando OpenCode, Codex y Copilot...');
  anotar(inyectarAgentsMd(rootDir));
  anotar(copiarProtegido(
    path.join(sourceRoot, '.opencode', 'rules', 'axion-protocol.md'),
    path.join(rootDir, '.opencode', 'rules', 'axion-protocol.md'), ausentes));
  let opencodeCommands = 0;
  workflows.forEach(wf => {
    const destinoOc = path.join(rootDir, '.opencode', 'commands', wf);
    fs.mkdirSync(path.dirname(destinoOc), { recursive: true });
    anotar(copiarProtegido(origenSkill(sourceRoot, wf), destinoOc, ausentes));
    opencodeCommands++;
  });
  const ocConfig = generarOpenCodeConfig(
    path.join(rootDir, '.opencode', 'commands'),
    path.join(rootDir, 'opencode.json'),
    ausentes,
  );
  const ocRegistrados = ocConfig ? Object.keys(ocConfig).length : 0;
  anotar(copiarProtegido(
    path.join(sourceRoot, '.opencode', 'plugins', 'axion-gate.ts.disabled'),
    path.join(rootDir, '.opencode', 'plugins', 'axion-gate.ts.disabled'), ausentes));
  anotar(copiarProtegido(
    path.join(sourceRoot, '.codex', 'AGENTS.md'),
    path.join(rootDir, '.codex', 'AGENTS.md'), ausentes));
  anotar(copiarProtegido(
    path.join(sourceRoot, '.github', 'copilot-instructions.md'),
    path.join(rootDir, '.github', 'copilot-instructions.md'), ausentes));
  console.log(`  ✓ AGENTS.md raíz inyectado, regla, ${opencodeCommands} comandos en .opencode/commands y ${ocRegistrados} registrados en opencode.json (config), plugin gate en .disabled (plugin host 1.18.x inestable al interceptar bash), más .codex/AGENTS.md y .github/copilot-instructions.md`);

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
    'vibeguard_storage_hook.js',
    'disk_pressure_guard.js',
    'auto_compacting_checkpoint.js',
    'workspace_debloater.js',
    'memory.js',
    'deep_reasoning.js',
    'fuzzer.js',
    'premortem.js',
    'asymptotic_critic.js',
    'scout_engine.js',
    'license_auditor.js',
    'humanizer_engine.js',
    'sync_mirror_gate.js',
    'preflight_tdd_synthesizer.js',
    'sync_doc_stats.js'
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
    return { status: 'INCOMPLETE', target: rootDir, backups: respaldos, missing: ausentes };
  }

  if (respaldos.length > 0) {
    console.log(`\n🛡️ [Seguridad] ${respaldos.length} archivo(s) preexistente(s) respaldado(s) de forma segura.`);
  }

  console.log('\n✅ [Axion Protocol] Instalación universal completada con éxito.');
  console.log('   Superficies gobernadas: Antigravity, Claude Code, OpenCode, Codex y Copilot.');
  console.log('   (Cursor se añade con `axion harness`; este instalador no fabrica archivos que no porta.)\n');

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
