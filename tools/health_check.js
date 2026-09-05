#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol - Auditoría de salud e integridad del espacio de trabajo.
 *
 * Un chequeo de salud solo vale si puede salir en rojo. La versión anterior daba verde
 * mientras el hook estaba muerto por un error de importación y mientras `.claude/commands/`
 * no existía: comprobaba que los archivos estuvieran, no que sirvieran. Un panel que
 * siempre dice que todo va bien no informa, tranquiliza, que es lo contrario.
 *
 * Por eso aquí se verifica capacidad, no presencia:
 *   - El hook se dispara de verdad contra un destructivo, no solo existe ni solo compila.
*  - Está registrado en los dos runtimes, no en uno.
 *  - Los 12 comandos están en las dos superficies y sin divergir entre ellas.
 *  - Cada `node tools/X.js` citado en un workflow apunta a un archivo real.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

// La version es decorativa, pero exigirla no lo era: leerla con require() reventaba el
// chequeo entero en cualquier proyecto instalado que no tuviera package.json junto a
// tools/. Una auditoria de salud que se cae antes de auditar es la peor de las salidas.
function versionInstalada() {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
  } catch (_) {
    return 'instalado';
  }
}

const WORKFLOWS = [
  'drive.md', 'premortem.md', 'snapshot.md', 'halt.md', 'clarify.md', 'memory.md',
  'verify.md', 'review.md', 'debug.md', 'attest.md', 'profile.md', 'preflight.md',
  'critic.md'
];

const leer = (p) => {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch (_) {
    return null;
  }
};

/**
 * Extrae cada `node tools/algo.js` citado en los workflows. Es la unica forma de
 * detectar que un prompt manda ejecutar una herramienta que el instalador no copia:
 * el comando existe, el archivo no, y el fallo solo aparece en casa del usuario.
 */
// Acepta las dos formas: el directorio plano de workflows heredado (<dir>/<nombre>.md) y
// la estructura de skills que monta Antigravity (<dir>/<nombre>/SKILL.md). Fijarla a una
// sola habría dejado de ver los prompts en cuanto la otra pasara a ser la fuente.
function herramientasCitadas(dirWorkflows) {
  const citadas = new Map();
  const ficheros = [];
  try {
    for (const e of fs.readdirSync(dirWorkflows, { withFileTypes: true })) {
      if (e.isFile() && e.name.endsWith('.md')) ficheros.push(e.name);
      else if (e.isDirectory() && fs.existsSync(path.join(dirWorkflows, e.name, 'SKILL.md'))) {
        ficheros.push(path.join(e.name, 'SKILL.md'));
      }
    }
  } catch (_) {
    return citadas;
  }
  for (const f of ficheros) {
    const texto = leer(path.join(dirWorkflows, f)) || '';
    for (const m of texto.matchAll(/node\s+(tools\/[a-z0-9_]+\.js)/gi)) {
      if (!citadas.has(m[1])) citadas.set(m[1], []);
      citadas.get(m[1]).push(f);
    }
  }
  return citadas;
}

function runHealthCheck(targetDir) {
  const target = path.resolve(targetDir || process.cwd());
  console.log(`[Axion Health Check] Auditando proyecto en: ${target}\n`);

  const checks = [];
  const addCheck = (name, pass, detail) => {
    checks.push({ name, pass, detail });
    console.log(`  ${(pass ? '✓ PASS' : '✗ FAIL').padEnd(8)} ${name}: ${detail}`);
  };

  // 1. Motor
  const nodeVer = parseInt(process.versions.node.split('.')[0], 10);
  addCheck('Motor Node.js', nodeVer >= 20, `Node v${process.versions.node} (requiere >= 20)`);

  // 2. Reglas P0
  const regla = path.join(target, '.agents', 'rules', 'axion-governance.md');
  addCheck('Reglas P0 (.agents)', fs.existsSync(regla),
    fs.existsSync(regla) ? 'axion-governance.md activo' : 'falta .agents/rules/axion-governance.md');

  // 3. El hook tiene que BLOQUEAR de verdad, no solo existir ni solo compilar.
  //    `node --check` no sirve aquí: el fallo que dejó este hook muerto durante toda una
  //    versión era un import mal escrito, sintácticamente impecable y explosivo en
  //    ejecución. La única comprobación que lo habría cazado es dispararlo.
  const hook = path.join(target, '.agents', 'hooks', 'validate-tool-call.mjs');
  const detenidoAhora = fs.existsSync(path.join(target, '.axion', 'HALT'));
  if (!fs.existsSync(hook)) {
    addCheck('Hook PreToolUse', false, 'falta .agents/hooks/validate-tool-call.mjs');
  } else {
    const disparar = (payload) => spawnSync(process.execPath, [hook], {
      input: JSON.stringify(payload), encoding: 'utf8', windowsHide: true, timeout: 15000,
    });

    const destructivo = disparar({ tool_input: { command: 'rm -rf /' } });
    const bloquea = destructivo.status !== 0 && /"permissionDecision"\s*:\s*"deny"/.test(destructivo.stdout || '');

    // Con una parada activa el hook deniega todo, y eso es correcto: no cuenta como avería.
    const inocuo = disparar({ tool_input: {} });
    const dejaPasar = detenidoAhora || inocuo.status === 0;

    const detalle = !bloquea
      ? `NO bloquea un destructivo (exit ${destructivo.status}): ${((destructivo.stderr || '').split('\n')[0] || 'sin salida').slice(0, 90)}`
      : !dejaPasar
        ? `bloquea llamadas inocuas (exit ${inocuo.status}); dejaría el entorno inservible`
        : `ejercitado en vivo: deniega destructivos${detenidoAhora ? ' (parada activa: deniega todo)' : ' y deja pasar lo inocuo'}`;
    addCheck('Hook PreToolUse', bloquea && dejaPasar, detalle);
  }

  // 4. Registrado en los dos runtimes. Un hook sin registrar no corre nunca.
  const hooksJson = leer(path.join(target, '.agents', 'hooks.json')) || '';
  const settings = leer(path.join(target, '.claude', 'settings.json')) || '';
  const enAntigravity = hooksJson.includes('validate-tool-call.mjs');
  const enClaude = settings.includes('validate-tool-call.mjs');
  addCheck('Registro del Hook', enAntigravity && enClaude,
    `Antigravity ${enAntigravity ? 'sí' : 'NO'} · Claude Code ${enClaude ? 'sí' : 'NO'}`);

  // 5. Perfil. No tenerlo todavía no es una avería: un proyecto recién instalado opera
  //    con el perfil de fábrica hasta que alguien ejecute /profile. Sacarlo en rojo por
  //    eso pondría en rojo toda instalación nueva, y un chequeo que siempre avisa deja
  //    de avisar. Solo falla si el archivo existe y no se puede leer.
  const perfil = path.join(target, '.axion', 'PROFILE.json');
  let perfilOk = true;
  let etiquetaPerfil = 'sin calibrar — rige el de fábrica (calíbralo con /profile)';
  if (fs.existsSync(perfil)) {
    try {
      const p = JSON.parse(fs.readFileSync(perfil, 'utf8'));
      etiquetaPerfil = `${p.technical_depth_label || p.technical_depth} (${p.input_mode || 'VOICE_DICTATION'})`;
    } catch (_) {
      perfilOk = false;
      etiquetaPerfil = 'PROFILE.json existe pero es ilegible';
    }
  }
  addCheck('Perfil Calibrado', perfilOk, etiquetaPerfil);

  // 6. Los comandos, en las dos superficies que los agentes leen de verdad.
  //
  // Antigravity dejó de descubrir .agents/workflows/: su propia guía los declara obsoletos
  // y monta las skills desde .agents/skills/<nombre>/SKILL.md, que es lo único que da
  // slash command de primera clase y descubrimiento semántico. Mientras este chequeo miró
  // a workflows/ decía 16/16 en verde sobre una superficie que el agente ya no leía —el
  // mismo defecto que un hook registrado y muerto—, y por eso el protocolo no arrancaba
  // solo en los chats de Antigravity aunque la auditoría diera todo correcto.
  const dirSkills = path.join(target, '.agents', 'skills');
  const dirComandos = path.join(target, '.claude', 'commands');
  const rutaSkill = (w) => path.join(dirSkills, w.replace(/\.md$/, ''), 'SKILL.md');
  const enSk = WORKFLOWS.filter((w) => fs.existsSync(rutaSkill(w)));
  const enCc = WORKFLOWS.filter((w) => fs.existsSync(path.join(dirComandos, w)));
  addCheck('Slash Commands', enSk.length === WORKFLOWS.length && enCc.length === WORKFLOWS.length,
    `${enSk.length}/${WORKFLOWS.length} en .agents/skills · ${enCc.length}/${WORKFLOWS.length} en .claude/commands`);

  // 6b. Y ningún workflow obsoleto sobreviviendo junto a su skill: si ambos existen, el
  //     agente puede montar el comando dos veces y nadie sabe cuál de los dos obedeció.
  const dirWorkflows = path.join(target, '.agents', 'workflows');
  const legado = fs.existsSync(dirWorkflows)
    ? fs.readdirSync(dirWorkflows).filter((f) => f.endsWith('.md'))
    : [];
  addCheck('Formato Antigravity', legado.length === 0, legado.length === 0
    ? 'sin workflows obsoletos: las skills son la única fuente'
    : `${legado.length} workflow(s) obsoletos conviven con sus skills: ${legado.slice(0, 3).join(', ')}${legado.length > 3 ? '…' : ''}. Migra con /onboard o retíralos.`);

  // 7. Deriva entre superficies: dos copias que dicen cosas distintas es peor que una sola.
  //    La skill es la fuente y .claude/commands su espejo; comparar contra el workflow
  //    obsoleto habría dejado de detectar la deriva en cuanto se retiró.
  const divergentes = WORKFLOWS.filter((w) => {
    const a = leer(rutaSkill(w));
    const b = leer(path.join(dirComandos, w));
    return a !== null && b !== null && a !== b;
  });
  addCheck('Sincronía de Comandos', divergentes.length === 0,
    divergentes.length === 0 ? 'ambas superficies idénticas' : `divergen: ${divergentes.join(', ')}`);

  // 8. Toda herramienta citada por un prompt tiene que existir.
  const citadas = herramientasCitadas(dirSkills);
  const ausentes = [...citadas.keys()].filter((rel) => !fs.existsSync(path.join(target, rel)));
  addCheck('Herramientas Citadas', ausentes.length === 0,
    ausentes.length === 0
      ? `${citadas.size} herramientas referenciadas, todas presentes`
      : `faltan ${ausentes.join(', ')} (citadas en ${ausentes.map((a) => citadas.get(a).join('/')).join('; ')})`);

  // 8b. Alcance real de los comandos. El chequeo decia "16/16" mirando el proyecto, y un
  //     usuario cuya sesion de Claude Code arranca un directorio mas arriba no veia ni
  //     uno: los comandos de proyecto se leen desde la raiz de la sesion. Verde sobre una
  //     superficie inalcanzable es el mismo defecto que un hook registrado y muerto.
  const dirUsuario = path.join(os.homedir(), '.claude', 'commands');
  const enUsuario = WORKFLOWS.filter((w) => fs.existsSync(path.join(dirUsuario, w)));
  const hayUsuario = enUsuario.length > 0;

  // Divergir es peor que faltar: dos copias que dicen cosas distintas hacen que el agente
  // obedezca una u otra segun desde donde se le invoque, y nadie sabe cual se aplico.
  const divergentesUsuario = hayUsuario ? WORKFLOWS.filter((w) => {
    const a = leer(path.join(dirComandos, w));
    const b = leer(path.join(dirUsuario, w));
    return a !== null && b !== null && a !== b;
  }) : [];

  const alcanceOk = divergentesUsuario.length === 0
    && (!hayUsuario || enUsuario.length === WORKFLOWS.length);
  addCheck('Alcance de los Comandos', alcanceOk, divergentesUsuario.length > 0
    ? `${divergentesUsuario.length} comando(s) divergen entre usuario y proyecto: ${divergentesUsuario.slice(0, 3).join(', ')}${divergentesUsuario.length > 3 ? '…' : ''}. Resincroniza con \`axion init --user\`.`
    : hayUsuario
      ? (enUsuario.length === WORKFLOWS.length
        ? `${enUsuario.length}/${WORKFLOWS.length} también en ~/.claude/commands: alcanzables desde cualquier directorio`
        : `solo ${enUsuario.length}/${WORKFLOWS.length} en ~/.claude/commands; completa con \`axion init --user\``)
      : 'solo ámbito de proyecto: Claude Code los verá si su raíz de sesión es este directorio (si no, `axion init --user`)');

  // 9. Puente con Claude Code
  const claudeMd = path.join(target, 'CLAUDE.md');
  addCheck('Claude Code Bridge', fs.existsSync(claudeMd),
    fs.existsSync(claudeMd) ? 'CLAUDE.md sincronizado' : 'falta CLAUDE.md');

// 9b. Superficie OpenCode. OpenCode 1.18.x NO descubre comandos por archivos:
//     solo registra los declarados bajo `command` en opencode.json (verificado
//     con `opencode run`). Se exige el JSON con los 12 comandos + AGENTS.md raíz.
  const dirOc = path.join(target, '.opencode', 'commands');
  const enOc = WORKFLOWS.filter((w) => fs.existsSync(path.join(dirOc, w)));
  const agentsRaiz = fs.existsSync(path.join(target, 'AGENTS.md'));
  let registradosOc = [];
  try {
    const ocCfg = JSON.parse(leer(path.join(target, 'opencode.json')));
    registradosOc = Object.keys(ocCfg.command || {});
  } catch (_) {
    registradosOc = [];
  }
  const enRegistro = WORKFLOWS.filter((w) => registradosOc.includes(w.replace(/\.md$/, '')));
  const ocOk = enOc.length === WORKFLOWS.length && enRegistro.length === WORKFLOWS.length && agentsRaiz;
  addCheck('Superficie OpenCode', ocOk,
    ocOk
      ? `${enOc.length}/${WORKFLOWS.length} archivos + ${enRegistro.length}/${WORKFLOWS.length} registrados en opencode.json + AGENTS.md raíz`
      : `faltan ${WORKFLOWS.length - enOc.length} en .opencode/commands, ${WORKFLOWS.length - enRegistro.length} en opencode.json${agentsRaiz ? '' : ' y falta AGENTS.md raíz'}`);

  // 9c. Gate Codex: hook PreToolUse real + registro en config.toml. Es el equivalente
  //     funcional del hook de Claude/Antigravity para el CLI de OpenAI.
  const codexHook = path.join(target, '.codex', 'hooks', 'axion-gate.js');
  const codexCfg = leer(path.join(target, '.codex', 'config.toml')) || '';
  const codexOk = fs.existsSync(codexHook)
    && codexCfg.includes('hooks.PreToolUse')
    && codexCfg.includes('axion-gate.js');
  addCheck('Gate Codex (PreToolUse)', codexOk,
    codexOk ? 'hook + registro en .codex/config.toml' : 'falta .codex/hooks/axion-gate.js o su registro');

  // 9d. Superficie Cursor: regla alwaysApply + 12 comandos en .cursor/commands.
  const dirCursor = path.join(target, '.cursor', 'commands');
  const enCu = WORKFLOWS.filter((w) => fs.existsSync(path.join(dirCursor, w)));
  const ruleCursor = leer(path.join(target, '.cursor', 'rules', 'axion-governance.mdc')) || '';
  const cursorOk = enCu.length === WORKFLOWS.length && ruleCursor.includes('alwaysApply: true');
  addCheck('Superficie Cursor', cursorOk,
    cursorOk
      ? `${enCu.length}/${WORKFLOWS.length} comandos en .cursor/commands + regla alwaysApply`
      : `faltan ${WORKFLOWS.length - enCu.length} en .cursor/commands${ruleCursor.includes('alwaysApply') ? '' : ' o la regla no es alwaysApply'}`);

  // 10. Estado de parada. No es un fallo: es información que cambia lo que se puede hacer.
  const detenido = fs.existsSync(path.join(target, '.axion', 'HALT'));
  addCheck('Killswitch', true, detenido
    ? 'HALTED — hay una parada activa; levántala con `axion resume`'
    : 'RUNNING — sin parada activa');

  const fallos = checks.filter((c) => !c.pass);
  console.log('\n' + (fallos.length === 0
    ? `🎉 [Axion Protocol v${versionInstalada()}] ${checks.length}/${checks.length} comprobaciones en verde. Gobernanza operativa y fail-closed.`
    : `⚠️ [Axion Protocol v${versionInstalada()}] ${fallos.length} de ${checks.length} comprobaciones en rojo. Ejecuta 'axion init' para sincronizar lo que falte.`));

  return { pass: fallos.length === 0, checks };
}

function main() {
  const args = process.argv.slice(2);
  const i = args.indexOf('--target');
  const res = runHealthCheck(i !== -1 && args[i + 1] ? args[i + 1] : process.cwd());
  process.exit(res.pass ? 0 : 1);
}

if (require.main === module) main();

module.exports = { runHealthCheck, herramientasCitadas, WORKFLOWS };
