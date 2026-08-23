/**
 * Regresión AX-F-015 — Contrato entre los workflows y el runtime que prometen.
 *
 * Por qué existe. La suite estaba entera en verde mientras el hook PreToolUse llevaba
 * una versión muerto por un import mal escrito, `.claude/commands/` no existía (así que
 * ningún slash command estaba disponible en Claude Code), y dos workflows mandaban
 * ejecutar herramientas que el instalador no copiaba. Nada de eso rompía una prueba,
 * porque no había ninguna que mirase la frontera entre lo que un prompt promete y lo
 * que el runtime puede cumplir.
 *
 * Esta suite cubre exactamente esa frontera. Un workflow es una promesa ejecutable: si
 * dice `node tools/x.js`, ese archivo tiene que existir aquí y llegar al proyecto del
 * usuario. Si el hook está declarado, tiene que bloquear de verdad.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const DIR_WF = path.join(ROOT, '.agents', 'workflows');
const DIR_CC = path.join(ROOT, '.claude', 'commands');

const WORKFLOWS = [
  'clarify.md', 'profile.md', 'rollback.md', 'preflight.md',
  'halt.md', 'unhalt.md', 'attest.md', 'review.md',
  'onboard.md', 'checkpoint.md', 'debug.md', 'compact.md', 'verify.md', 'remember.md',
];

const leer = (p) => fs.readFileSync(p, 'utf8');
let comprobaciones = 0;
const ok = (cond, msg) => { assert.strictEqual(cond, true, msg); comprobaciones += 1; };

console.log('=== AX-F-015 Contrato de workflows ===\n');

// --- 1. Los 13 comandos, en las dos superficies ---
for (const wf of WORKFLOWS) {
  ok(fs.existsSync(path.join(DIR_WF, wf)), `falta .agents/workflows/${wf} (Antigravity)`);
  ok(fs.existsSync(path.join(DIR_CC, wf)), `falta .claude/commands/${wf} (Claude Code)`);
}
console.log(`✓ ${WORKFLOWS.length} workflows presentes en .agents/workflows y en .claude/commands`);

// --- 2. Sin deriva entre superficies ---
// Dos copias del mismo comando que dicen cosas distintas son peor que una sola: el
// agente obedece una u otra según el runtime, y nadie sabe cuál se aplicó.
for (const wf of WORKFLOWS) {
  ok(leer(path.join(DIR_WF, wf)) === leer(path.join(DIR_CC, wf)),
    `${wf} difiere entre .agents/workflows y .claude/commands`);
}
console.log('✓ ambas superficies byte a byte idénticas');

// --- 3. Frontmatter válido y coherente con el nombre del archivo ---
for (const wf of WORKFLOWS) {
  const texto = leer(path.join(DIR_WF, wf));
  ok(texto.startsWith('---\n'), `${wf} no abre con frontmatter`);
  const bloque = texto.split('---')[1] || '';
  const nombre = (bloque.match(/^name:\s*(.+)$/m) || [])[1];
  const desc = (bloque.match(/^description:\s*(.+)$/m) || [])[1];
  ok(Boolean(nombre), `${wf} no declara name`);
  ok(Boolean(desc) && desc.trim().length >= 20, `${wf} no declara una description utilizable`);
  ok(nombre.trim() === wf.replace('.md', ''),
    `${wf} declara name "${nombre}" y no coincide con el nombre del archivo`);
}
console.log('✓ frontmatter completo y coherente en los 13');

// --- 4. Toda herramienta citada por un prompt existe ---
const citadas = new Map();
for (const wf of WORKFLOWS) {
  for (const m of leer(path.join(DIR_WF, wf)).matchAll(/node\s+(tools\/[a-z0-9_]+\.js)/gi)) {
    if (!citadas.has(m[1])) citadas.set(m[1], new Set());
    citadas.get(m[1]).add(wf);
  }
}
ok(citadas.size > 0, 'ningún workflow cita una herramienta: el contrato quedaría vacío');
for (const [rel, quien] of citadas) {
  ok(fs.existsSync(path.join(ROOT, rel)),
    `${rel} lo citan ${[...quien].join(', ')} pero no existe en el repositorio`);
}
console.log(`✓ ${citadas.size} herramientas citadas, todas presentes`);

// --- 5. Y el instalador las copia al proyecto del usuario ---
// Sin esto, un workflow funciona en casa y falla en cuanto sale de aquí.
const instalador = leer(path.join(ROOT, 'install.js'));
for (const [rel, quien] of citadas) {
  const base = path.basename(rel);
  ok(instalador.includes(`'${base}'`),
    `install.js no copia ${base}, citado por ${[...quien].join(', ')}: el comando fallaría en el proyecto instalado`);
}
console.log('✓ install.js copia todas las herramientas citadas');

// --- 6. El instalador entrega los 13 comandos a Claude Code ---
ok(instalador.includes(path.join('.claude', 'commands').replace(/\\/g, '\\\\')) || instalador.includes("'.claude', 'commands'"),
  'install.js no inyecta .claude/commands: los slash commands no existirían en Claude Code');
console.log('✓ install.js inyecta .claude/commands');

// --- 7. El tarball publicado lleva la gobernanza, no solo las herramientas ---
// `files` no incluía .agents/ ni .claude/ ni CLAUDE.md, así que `npx axion-protocol init`
// instalaba las 27 herramientas y cero reglas, cero hooks y cero slash commands. Desde
// dentro del repositorio era invisible: los archivos estaban, solo que no viajaban.
const pkg = JSON.parse(leer(path.join(ROOT, 'package.json')));
for (const entrada of ['.agents/', '.claude/', 'CLAUDE.md', 'install.js', 'tools/']) {
  ok((pkg.files || []).includes(entrada),
    `package.json "files" no incluye ${entrada}: el paquete publicado no lo llevaría`);
}
console.log('✓ package.json publica la superficie de gobernanza completa');

// --- 8. Los manifiestos de plugin apuntan a algo que existe ---
// Un manifiesto que cita un directorio inexistente rompe `/plugin install` sin romper
// ninguna prueba: el fallo aparece en la maquina de quien intenta instalarlo.
const plugin = JSON.parse(leer(path.join(ROOT, '.claude-plugin', 'plugin.json')));
for (const clave of ['commands', 'hooks']) {
  const relativo = String(plugin[clave]).replace(/^\.\//, '');
  ok(fs.existsSync(path.join(ROOT, relativo)),
    `plugin.json declara ${clave}: "${plugin[clave]}" y esa ruta no existe`);
}
const mercado = JSON.parse(leer(path.join(ROOT, '.claude-plugin', 'marketplace.json')));
ok(mercado.plugins[0].version === plugin.version,
  `marketplace.json v${mercado.plugins[0].version} y plugin.json v${plugin.version} divergen`);
ok(pkg.version === plugin.version,
  `package.json v${pkg.version} y plugin.json v${plugin.version} divergen: el plugin publicaria otra version`);
ok((pkg.files || []).includes('.claude-plugin/'),
  'package.json no publica .claude-plugin/: el manifiesto no viajaria en el tarball');
// El hook del plugin se resuelve con CLAUDE_PLUGIN_ROOT, no con CLAUDE_PROJECT_DIR:
// dentro de un plugin instalado, el proyecto y el plugin no son el mismo directorio.
ok(leer(path.join(ROOT, '.claude-plugin', 'hooks.json')).includes('CLAUDE_PLUGIN_ROOT'),
  'el hook del plugin debe resolverse contra CLAUDE_PLUGIN_ROOT');
console.log('✓ manifiestos de plugin coherentes y con rutas existentes');

// --- 9. El hook está registrado en los dos runtimes ---
const hooksJson = leer(path.join(ROOT, '.agents', 'hooks.json'));
ok(hooksJson.includes('validate-tool-call.mjs'), '.agents/hooks.json no registra el hook (Antigravity)');
const settings = path.join(ROOT, '.claude', 'settings.json');
ok(fs.existsSync(settings), 'falta .claude/settings.json: el hook nunca se ejecutaría en Claude Code');
ok(leer(settings).includes('validate-tool-call.mjs'), '.claude/settings.json no registra el hook');
console.log('✓ hook registrado en Antigravity y en Claude Code');

// --- 10. Y bloquea de verdad ---
// La comprobación que faltaba. El hook roto era sintácticamente impecable: solo se
// delataba al ejecutarlo.
const hook = path.join(ROOT, '.agents', 'hooks', 'validate-tool-call.mjs');
ok(fs.existsSync(hook), 'falta .agents/hooks/validate-tool-call.mjs');

const disparar = (payload) => spawnSync(process.execPath, [hook], {
  input: JSON.stringify(payload), encoding: 'utf8', windowsHide: true, timeout: 20000,
});

const destructivo = disparar({ tool_input: { command: 'rm -rf /' } });
ok(destructivo.status !== 0,
  `el hook dejó pasar "rm -rf /" (exit ${destructivo.status}): ${(destructivo.stderr || '').split('\n')[0]}`);
ok(/"permissionDecision"\s*:\s*"deny"/.test(destructivo.stdout || ''),
  'el hook no emitió un veredicto deny legible para el host');

// Y no bloquea lo que no debe: un hook que deniega todo acaba desactivado, y un hook
// desactivado protege de nada.
const inocuo = disparar({ tool_input: { file_path: 'a.txt' } });
ok(inocuo.status === 0, `el hook bloqueó una llamada sin comando de terminal (exit ${inocuo.status})`);

// Una cadena de shell cruda no se bloquea: se delega en el permiso humano del host.
const crudo = disparar({ tool_input: { command: 'git status' } });
ok(crudo.status === 0 && /"permissionDecision"\s*:\s*"ask"/.test(crudo.stdout || ''),
  'una cadena de shell cruda debería pedir confirmación humana, no bloquearse ni pasar en silencio');
console.log('✓ hook ejercitado: deniega destructivos, consulta shell crudo, deja pasar lo inocuo');

// --- 11. El CLI responde a todo comando que los workflows anuncian ---
const { SUBCOMANDOS } = require(path.join(ROOT, 'bin', 'axion.js'));
for (const cmd of ['checkpoint', 'rollback', 'halt', 'resume', 'unhalt', 'verify', 'compact', 'memory', 'profile', 'preflight', 'attest', 'check']) {
  ok(Object.prototype.hasOwnProperty.call(SUBCOMANDOS, cmd),
    `bin/axion.js no expone "${cmd}", anunciado por los workflows`);
  ok(fs.existsSync(path.join(ROOT, SUBCOMANDOS[cmd].script)),
    `el subcomando "${cmd}" apunta a ${SUBCOMANDOS[cmd].script}, que no existe`);
}
console.log('✓ el CLI expone y resuelve todos los comandos anunciados');

console.log(`\n=== AX-F-015 PASS (${comprobaciones} comprobaciones) ===`);
