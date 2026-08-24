/**
 * Regresión AX-F-024 — Los comandos tienen que estar donde el runtime los busca.
 *
 * Origen: `/premortem` devolvía "Unknown command" en Claude Code con los 16 archivos
 * perfectamente instalados y el chequeo de salud en verde. No fallaba ninguno de ellos:
 * fallaba el sitio. Claude Code lee los comandos de proyecto desde la raíz de la sesión,
 * y una sesión abierta un directorio más arriba del proyecto no ve ni uno.
 *
 * El defecto de fondo era el de siempre en este repositorio: verde sobre una superficie
 * que no se alcanza. El chequeo contaba archivos en el proyecto y no se preguntaba desde
 * dónde iban a leerse, igual que antes contaba un hook que existía y estaba muerto.
 *
 * Esta suite fija tres cosas: que los archivos sean cargables de verdad, que exista una
 * vía soportada para alcanzarlos desde cualquier directorio, y que los dos ámbitos no
 * puedan divergir en silencio.
 */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { runUserInstallation, WORKFLOWS } = require('../../install.js');

const ROOT = path.join(__dirname, '..', '..');
let n = 0;
const ok = (cond, msg) => { assert.strictEqual(cond, true, msg); n += 1; };

console.log('=== AX-F-024 Alcance de los slash commands ===\n');

// --- 1. Los archivos son cargables por el runtime ---
// Un BOM, un CRLF en el frontmatter o una `description` ausente bastan para que el
// comando no se registre, y el sintoma es identico al de no tenerlo: "Unknown command".
{
  for (const dir of ['.agents/workflows', '.claude/commands']) {
    for (const wf of WORKFLOWS) {
      const abs = path.join(ROOT, dir, wf);
      const bruto = fs.readFileSync(abs);

      ok(!(bruto[0] === 0xEF && bruto[1] === 0xBB && bruto[2] === 0xBF),
        `${dir}/${wf} empieza con BOM: el frontmatter no se parsea`);

      const texto = bruto.toString('utf8');
      const cierre = texto.indexOf('\n---', 4);
      const frontmatter = texto.slice(0, cierre);
      ok(texto.startsWith('---\n'), `${dir}/${wf} no abre con frontmatter en la primera linea`);
      ok(!frontmatter.includes('\r'),
        `${dir}/${wf} tiene CRLF en el frontmatter; algunos parsers de YAML se atragantan`);
      ok(/^description:\s*\S/m.test(frontmatter),
        `${dir}/${wf} no declara una description: sin ella el comando no aparece en el listado`);
    }
  }
  console.log(`✓ los ${WORKFLOWS.length} comandos son cargables en las dos superficies`);
}

// --- 2. La lista de comandos no está escrita dos veces ---
// El instalador llevaba la suya a mano y el chequeo otra: anadir un comando obligaba a
// acordarse de dos sitios, y olvidarse de uno no rompia nada visible.
{
  const enDisco = fs.readdirSync(path.join(ROOT, '.agents', 'workflows')).filter((f) => f.endsWith('.md')).sort();
  assert.deepStrictEqual([...WORKFLOWS], enDisco,
    'el instalador debe derivar la lista del directorio, no de una copia escrita a mano');
  n += 1;

  const instalador = fs.readFileSync(path.join(ROOT, 'install.js'), 'utf8');
  ok(!/'clarify\.md',\s*'profile\.md'/.test(instalador),
    'install.js no debe conservar una lista de comandos escrita a mano');
  console.log('✓ la lista de comandos vive en un solo sitio');
}

// --- 3. Existe una vía soportada para alcanzarlos desde cualquier directorio ---
// Es la que faltaba: sin ella, la unica respuesta a "no me aparece el comando" era
// "arranca Claude Code desde otra carpeta", que no es una solucion, es un rodeo.
{
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-home-'));
  const r = runUserInstallation(home);
  ok(r.status === 'SUCCESS', `la instalacion de usuario debe completarse, dio ${r.status}`);

  const destino = path.join(home, '.claude', 'commands');
  ok(fs.readdirSync(destino).filter((f) => f.endsWith('.md')).length === WORKFLOWS.length,
    'deben llegar los mismos comandos que al ambito de proyecto');
  for (const wf of WORKFLOWS) {
    ok(fs.readFileSync(path.join(destino, wf), 'utf8')
      === fs.readFileSync(path.join(ROOT, '.agents', 'workflows', wf), 'utf8'),
      `${wf} debe llegar identico al ambito de usuario`);
  }

  // Respaldo antes de sobrescribir: era una de las dos salvaguardas comprometidas en el
  // pre-mortem de este cambio. Escribir en el directorio personal de alguien sin red es
  // peor que en un repositorio, porque ahi no hay git del que recuperarse.
  fs.writeFileSync(path.join(destino, WORKFLOWS[0]), '--- \nname: ajeno\ndescription: comando previo de otro arnes\n---\n');
  const segunda = runUserInstallation(home);
  ok(segunda.backups.length === 1, 'un archivo preexistente y distinto debe respaldarse antes de pisarlo');
  ok(fs.readFileSync(segunda.backups[0], 'utf8').includes('comando previo de otro arnes'),
    'el respaldo debe conservar el contenido que se sustituyo');

  // Reinstalar sobre lo idéntico no debe generar respaldos: un respaldo por ejecución
  // convertiría el directorio en un basurero y nadie encontraría el que importa.
  ok(runUserInstallation(home).backups.length === 0,
    'reinstalar lo identico no debe dejar respaldos');

  fs.rmSync(home, { recursive: true, force: true });
  console.log('✓ `axion init --user` instala, respalda antes de pisar y es idempotente');
}

// --- 4. El chequeo de salud informa del alcance, no solo del recuento ---
{
  const { runHealthCheck } = require('../../tools/health_check.js');
  const salida = [];
  const log = console.log;
  console.log = (...a) => salida.push(a.join(' '));
  let res;
  try {
    res = runHealthCheck(ROOT);
  } finally {
    console.log = log;
  }

  const alcance = res.checks.find((c) => c.name === 'Alcance de los Comandos');
  ok(Boolean(alcance), 'el chequeo debe auditar desde donde se alcanzan los comandos');
  // Contar archivos no basta: hay que decir si el runtime los va a encontrar.
  ok(/ámbito de proyecto|~\/\.claude\/commands|divergen/.test(alcance.detail),
    `el detalle debe hablar del alcance real, dijo: ${alcance.detail}`);
  console.log('✓ el chequeo de salud audita el alcance, no solo la presencia');
}

console.log(`\n=== AX-F-024 PASS (${n} comprobaciones) ===`);
