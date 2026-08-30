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
  for (const dir of ['.agents/skills', '.claude/commands']) {
    for (const wf of WORKFLOWS) {
      // La etiqueta se deriva de la ruta real. Con el rótulo de la superficie anterior, un
      // fallo señalaba `.agents/skills/<nombre>.md`, un fichero que no existe: quien lo
      // leyera iría a buscarlo y no lo encontraría.
      const rel = dir === '.agents/skills'
        ? `${dir}/${wf.replace(/\.md$/, '')}/SKILL.md`
        : `${dir}/${wf}`;
      const bruto = fs.readFileSync(path.join(ROOT, rel));

      ok(!(bruto[0] === 0xEF && bruto[1] === 0xBB && bruto[2] === 0xBF),
        `${rel} empieza con BOM: el frontmatter no se parsea`);

      const texto = bruto.toString('utf8');
      const cierre = texto.indexOf('\n---', 4);
      const frontmatter = texto.slice(0, cierre);
      ok(texto.startsWith('---\n'), `${rel} no abre con frontmatter en la primera linea`);
      ok(!frontmatter.includes('\r'),
        `${rel} tiene CRLF en el frontmatter; algunos parsers de YAML se atragantan`);
      ok(/^description:\s*\S/m.test(frontmatter),
        `${rel} no declara una description: sin ella el comando no aparece en el listado`);
    }
  }
  console.log(`✓ los ${WORKFLOWS.length} comandos son cargables en las dos superficies`);
}

// --- 2. La lista de comandos no está escrita dos veces ---
// El instalador llevaba la suya a mano y el chequeo otra: anadir un comando obligaba a
// acordarse de dos sitios, y olvidarse de uno no rompia nada visible.
{
  const dirSk = path.join(ROOT, '.agents', 'skills');
  const enDisco = fs.readdirSync(dirSk, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(dirSk, e.name, 'SKILL.md')))
    .map((e) => e.name + '.md').sort();
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
      === fs.readFileSync(path.join(ROOT, '.agents', 'skills', wf.replace(/\.md$/, ''), 'SKILL.md'), 'utf8'),
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

// --- La superficie de Antigravity es la que Antigravity monta, no la que heredamos ---
// Segunda aparición del mismo defecto, ahora en el otro runtime. Antigravity dejó de
// descubrir `.agents/workflows/`: su propia guía los declara obsoletos y monta las skills
// desde `.agents/skills/<nombre>/SKILL.md`, que es lo único que da slash command de primera
// clase y descubrimiento semántico. Mientras los comandos vivieron en workflows/, el
// chequeo decía 16/16 en verde y el protocolo no arrancaba solo en ningún chat.
{
  const dirSkills = path.join(ROOT, '.agents', 'skills');
  ok(fs.existsSync(dirSkills), '.agents/skills debe existir: es donde Antigravity monta los comandos');

  for (const wf of WORKFLOWS) {
    const nombre = wf.replace(/\.md$/, '');
    const skill = path.join(dirSkills, nombre, 'SKILL.md');
    ok(fs.existsSync(skill), `falta .agents/skills/${nombre}/SKILL.md: Antigravity no lo montará`);

    // Sin `name` y `description` en el frontmatter la skill no se registra, y el síntoma
    // es idéntico al de no tenerla: el comando simplemente no existe.
    const cabecera = fs.readFileSync(skill, 'utf8').slice(0, 400);
    ok(/^---\r?\n/.test(cabecera), `${nombre}/SKILL.md debe abrir con frontmatter YAML`);
    ok(new RegExp(`^name:\\s*${nombre}\\s*$`, 'm').test(cabecera),
      `${nombre}/SKILL.md debe declarar name: ${nombre}`);
    ok(/^description:\s*\S/m.test(cabecera), `${nombre}/SKILL.md debe declarar una description`);
  }

  // Y el formato obsoleto no puede sobrevivir junto al nuevo: si ambos existen, el agente
  // puede montar el mismo comando dos veces y nadie sabe a cuál obedeció.
  ok(!fs.existsSync(path.join(ROOT, '.agents', 'workflows')),
    'el directorio obsoleto .agents/workflows no debe sobrevivir a la migración a skills');
  console.log(`✓ ${WORKFLOWS.length} skills montables por Antigravity, sin formato obsoleto detrás`);
}

// --- Ningún manifiesto puede anunciar un número de comandos que ya no es cierto ---
// Los dos manifiestos de plugin declaraban "14 comandos" con 17 en disco. Nadie los
// vigilaba, así que la cifra envejeció en silencio durante tres comandos seguidos.
{
  const manifiestos = [
    path.join(ROOT, '.claude-plugin', 'marketplace.json'),
    path.join(ROOT, '.claude-plugin', 'plugin.json'),
    path.join(ROOT, '.agents', 'AGENTS.md'),
  ];
  for (const m of manifiestos) {
    if (!fs.existsSync(m)) continue;
    const texto = fs.readFileSync(m, 'utf8');
    const desfasados = [...texto.matchAll(/(\d+)\s+comandos/g)]
      .map((x) => parseInt(x[1], 10))
      .filter((v) => v !== WORKFLOWS.length);
    ok(desfasados.length === 0,
      `${path.basename(m)} anuncia ${desfasados.join(', ')} comando(s) pero hay ${WORKFLOWS.length}`);
  }
  console.log(`✓ los manifiestos declaran ${WORKFLOWS.length} comandos, que es lo que hay`);
}

console.log(`\n=== AX-F-024 PASS (${n} comprobaciones) ===`);
