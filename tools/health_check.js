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
 *   - Está registrado en los dos runtimes, no en uno.
 *   - Los 13 comandos están en las dos superficies y sin divergir entre ellas.
 *   - Cada `node tools/X.js` citado en un workflow apunta a un archivo real.
 */

const fs = require('fs');
const path = require('path');
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
  'clarify.md', 'profile.md', 'rollback.md', 'preflight.md',
  'halt.md', 'unhalt.md', 'attest.md', 'review.md',
  'onboard.md', 'checkpoint.md', 'debug.md', 'compact.md', 'verify.md',
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
function herramientasCitadas(dirWorkflows) {
  const citadas = new Map();
  let ficheros = [];
  try {
    ficheros = fs.readdirSync(dirWorkflows).filter((f) => f.endsWith('.md'));
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

  // 6. Los 13 comandos, en las dos superficies.
  const dirWorkflows = path.join(target, '.agents', 'workflows');
  const dirComandos = path.join(target, '.claude', 'commands');
  const enWf = WORKFLOWS.filter((w) => fs.existsSync(path.join(dirWorkflows, w)));
  const enCc = WORKFLOWS.filter((w) => fs.existsSync(path.join(dirComandos, w)));
  addCheck('Slash Commands', enWf.length === WORKFLOWS.length && enCc.length === WORKFLOWS.length,
    `${enWf.length}/${WORKFLOWS.length} en .agents/workflows · ${enCc.length}/${WORKFLOWS.length} en .claude/commands`);

  // 7. Deriva entre superficies: dos copias que dicen cosas distintas es peor que una sola.
  const divergentes = WORKFLOWS.filter((w) => {
    const a = leer(path.join(dirWorkflows, w));
    const b = leer(path.join(dirComandos, w));
    return a !== null && b !== null && a !== b;
  });
  addCheck('Sincronía de Comandos', divergentes.length === 0,
    divergentes.length === 0 ? 'ambas superficies idénticas' : `divergen: ${divergentes.join(', ')}`);

  // 8. Toda herramienta citada por un prompt tiene que existir.
  const citadas = herramientasCitadas(dirWorkflows);
  const ausentes = [...citadas.keys()].filter((rel) => !fs.existsSync(path.join(target, rel)));
  addCheck('Herramientas Citadas', ausentes.length === 0,
    ausentes.length === 0
      ? `${citadas.size} herramientas referenciadas, todas presentes`
      : `faltan ${ausentes.join(', ')} (citadas en ${ausentes.map((a) => citadas.get(a).join('/')).join('; ')})`);

  // 9. Puente con Claude Code
  const claudeMd = path.join(target, 'CLAUDE.md');
  addCheck('Claude Code Bridge', fs.existsSync(claudeMd),
    fs.existsSync(claudeMd) ? 'CLAUDE.md sincronizado' : 'falta CLAUDE.md');

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
