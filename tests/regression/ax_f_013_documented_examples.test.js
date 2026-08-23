'use strict';

/**
 * Regresion AX-F-013 — Un ejemplo documentado tiene que producir lo que documenta.
 *
 * Origen: el README ofrecia `node tools/preflight.js "git commit -m ..."` como demostracion
 * de la comprobacion de seguridad, y la consola de index.html simulaba ese mismo comando con
 * el resultado "PUEDE CONTINUAR". Ninguna de las dos cosas era cierta: una cadena de shell
 * cruda NUNCA alcanza ALLOW. Nadie lo detecto porque ninguna prueba ejercitaba la CLI.
 *
 * Esta suite cubre las dos mitades del problema:
 *   1. La CLI de verdad, ejecutada como proceso, con sus codigos de salida.
 *   2. Que las superficies publicas no afirmen un resultado distinto del real.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const CLI = path.join(ROOT, 'tools', 'preflight.js');
const leer = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function ejecutarCli(argv) {
  try {
    const stdout = execFileSync(process.execPath, [CLI, ...argv], { encoding: 'utf8' });
    return { exit: 0, stdout };
  } catch (err) {
    return { exit: err.status, stdout: err.stdout || '' };
  }
}

// --- 1. La CLI, ejecutada de verdad -----------------------------------------

const EJEMPLOS = [
  {
    desc: 'cadena de shell cruda no destructiva',
    argv: ['git commit -m "Mensaje"'],
    status: 'NEEDS_HUMAN_REVIEW',
    reason: 'RAW_SHELL_NOT_AUTHORIZED',
    exit: 2,
  },
  {
    desc: 'cadena de shell cruda destructiva',
    argv: ['rm -rf /'],
    status: 'DENY',
    reason: 'RAW_DESTRUCTIVE_COMMAND',
    exit: 1,
  },
  {
    desc: 'comando estructurado en la allowlist',
    argv: ['--json', '{"executable":"git","args":["status"],"cwd":".","shell":false}'],
    status: 'ALLOW',
    reason: 'STRUCTURED_READ_ONLY_GIT',
    exit: 0,
  },
  {
    desc: 'comando estructurado fuera de la allowlist',
    argv: ['--json', '{"executable":"git","args":["commit","-m","x"],"cwd":".","shell":false}'],
    status: 'NEEDS_HUMAN_REVIEW',
    reason: 'GIT_SUBCOMMAND_NOT_ALLOWLISTED',
    exit: 2,
  },
  {
    desc: 'carga JSON ilegible',
    argv: ['--json', '{roto'],
    status: 'DENY',
    reason: 'INVALID_JSON_PAYLOAD',
    exit: 1,
  },
];

for (const ej of EJEMPLOS) {
  const { exit, stdout } = ejecutarCli(ej.argv);
  const salida = JSON.parse(stdout);
  assert.strictEqual(salida.status, ej.status, `${ej.desc}: status esperado ${ej.status}`);
  assert.strictEqual(salida.reason, ej.reason, `${ej.desc}: reason esperado ${ej.reason}`);
  assert.strictEqual(exit, ej.exit, `${ej.desc}: codigo de salida esperado ${ej.exit}`);
}

// Sin argumentos se imprime el uso y se sale con 2, no con 0.
{
  const { exit, stdout } = ejecutarCli([]);
  assert.strictEqual(exit, 2, 'sin argumentos debe salir con 2');
  assert.match(stdout, /Uso:/, 'sin argumentos debe imprimir el modo de uso');
  assert.match(stdout, /NUNCA obtiene ALLOW/i, 'el uso debe advertir de que el shell crudo no llega a ALLOW');
}

// --- 2. Las superficies publicas no pueden prometer otro resultado -----------

// La portada (index.html, script.js, README) no viaja en el paquete publicado, y no debe:
// un consumidor no instala una landing page. Pero exigirla igualmente hacia que
// `axion test` fallase 2 de 40 suites en cada proyecto instalado. Se distingue por .git,
// que existe en el repositorio y nunca en un paquete de npm; dentro del repositorio la
// comprobacion sigue siendo obligatoria, asi que borrar la portada la rompe igual.
const EN_REPOSITORIO = fs.existsSync(path.join(ROOT, '.git'));
if (!EN_REPOSITORIO) {
  console.log('SKIP AX-F-013 (2/2) — superficies de portada no incluidas en el paquete publicado.');
  console.log('PASS AX-F-013 — la CLI documentada se comporta como se documenta.');
  process.exit(0);
}
for (const rel of ['README.md', 'README.es.md', 'script.js', 'index.html']) {
  assert.ok(fs.existsSync(path.join(ROOT, rel)),
    `${rel} falta en el repositorio: la comprobacion de superficies publicas quedaria sin objeto`);
}

const readme = leer('README.md');
const script = leer('script.js');
const index = leer('index.html');

// Si una portada ensena la CLI con una cadena cruda, debe advertir de que eso no basta.
// Se comprueban las dos portadas y en los dos idiomas.
const avisaDelShellCrudo = /nunca.{0,40}ALLOW|no.{0,30}autorizad|revisi[óo]n humana|never returns .?ALLOW|NEEDS_HUMAN_REVIEW/i;
const muestraCliCruda = /preflight[.]js\s+"/;
for (const nombre of ['README.md', 'README.es.md']) {
  const texto = leer(nombre);
  if (muestraCliCruda.test(texto)) {
    assert.match(
      texto,
      avisaDelShellCrudo,
      `${nombre} muestra la CLI con shell crudo pero no advierte de que nunca alcanza ALLOW`,
    );
  }
}
// La consola simulada no puede declarar que un shell crudo sale adelante.
const simulaAprobacionDeShellCrudo = /PUEDE CONTINUAR/.test(script)
  && !/RAW_SHELL_NOT_AUTHORIZED/.test(script);
assert.strictEqual(
  simulaAprobacionDeShellCrudo,
  false,
  'script.js simula que una cadena de shell cruda es aceptada; la herramienta real la manda a revision',
);

// Y la portada debe seguir declarandose simulacion.
assert.match(index, /SIMULACI[ÓO]N|SIMULACION/i, 'index.html debe declarar que la consola es una simulacion');

console.log(`PASS AX-F-013 — ${EJEMPLOS.length} ejemplos documentados coinciden con la herramienta real`);
