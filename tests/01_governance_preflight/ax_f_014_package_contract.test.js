'use strict';

/**
 * Regresion AX-F-014 — El paquete publicado no puede contradecir al proyecto.
 *
 * Empaquetar para npm crea un contrato externo nuevo, y con el varias formas nuevas de
 * mentir sin darse cuenta:
 *
 *   - prometer cero dependencias y arrastrar una;
 *   - declarar un ejecutable que no existe en el paquete;
 *   - enviar `phases/`, que son megabytes de evidencia historica que nadie que instale
 *     el paquete necesita;
 *   - declarar un motor de Node distinto del que documenta el README;
 *   - ofrecer un subcomando que apunta a un fichero que no se envia.
 *
 * Ninguna de esas cosas rompe una prueba existente: rompen la instalacion de un tercero,
 * que es peor, porque se descubre tarde y lejos.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const { SUBCOMANDOS } = require('../../bin/axion.js');

let n = 0;
const ok = (d) => console.log(`  [${++n}] PASS: ${d}`);

console.log('=== AX-F-014 - contrato del paquete ===\n');

// --- 1. Cero dependencias, mecanizado --------------------------------------
// El proyecto vende "solo modulos integrados de Node". Es una promesa facil de romper
// sin querer y dificil de detectar leyendo, asi que se comprueba.
{
  assert.deepStrictEqual(pkg.dependencies || {}, {},
    'el proyecto declara cero dependencias externas; package.json no puede desmentirlo');
  assert.strictEqual(pkg.peerDependencies, undefined, 'tampoco por la puerta de las peer');
  assert.strictEqual(pkg.optionalDependencies, undefined, 'ni por la de las opcionales');
  ok('el paquete no declara ninguna dependencia externa');
}

// --- 2. CommonJS, o nada funciona ------------------------------------------
// Todo el corpus usa require(). Marcar el paquete como ESM romperia cada modulo a la vez.
{
  assert.strictEqual(pkg.type, 'commonjs',
    'el corpus entero es CommonJS: declarar "module" lo romperia por completo');
  ok('el paquete se declara CommonJS, como el codigo que contiene');
}

// --- 3. Lo declarado existe -------------------------------------------------
{
  for (const [nombre, rel] of Object.entries(pkg.bin || {})) {
    const abs = path.join(ROOT, rel);
    assert.ok(fs.existsSync(abs), `el ejecutable "${nombre}" apunta a ${rel}, que no existe`);
    const primera = fs.readFileSync(abs, 'utf8').split('\n')[0];
    assert.match(primera, /^#!/, `${rel} necesita shebang para ser ejecutable tras npm install`);
  }
  ok(`los ${Object.keys(pkg.bin || {}).length} ejecutables declarados existen y llevan shebang`);

  // Los patrones de negacion (`!docs/site/`) tambien tienen que apuntar a algo real, o la
  // exclusion no protege de nada y nadie se entera el dia que la ruta vuelve con otro
  // nombre. Pero eso solo se puede exigir en el repositorio: dentro del paquete instalado
  // la ruta excluida esta ausente precisamente porque la exclusion funciono, asi que
  // comprobarla alli convertiria el exito en un fallo.
  const EN_REPOSITORIO = fs.existsSync(path.join(ROOT, '.git'));
  for (const entrada of pkg.files || []) {
    const negacion = entrada.startsWith('!');
    if (negacion && !EN_REPOSITORIO) continue;
    const rel = entrada.replace(/^!/, '').replace(/\/$/, '');
    assert.ok(fs.existsSync(path.join(ROOT, rel)),
      negacion
        ? `files excluye "${entrada}", pero esa ruta no existe en el repositorio: la exclusion sobra o quedo obsoleta`
        : `files declara "${entrada}", que no existe`);
  }
  assert.ok(fs.existsSync(path.join(ROOT, pkg.main)), 'el main declarado debe existir');
  ok(`las ${(pkg.files || []).length} entradas de files existen`);
}

// --- 4. La evidencia historica no viaja en el paquete -----------------------
// phases/ son cientos de ficheros de auditoria. Valiosos en el repositorio, inutiles
// para quien instala, y multiplicarian el peso del paquete.
{
  const enviaFases = (pkg.files || []).some((f) => f.replace(/\/$/, '') === 'phases');
  assert.strictEqual(enviaFases, false,
    'phases/ es evidencia historica: pertenece al repositorio, no al paquete');
  ok('phases/ queda fuera del paquete');
}

// --- 5. Las pruebas SI viajan ----------------------------------------------
// Es deliberado y es parte del argumento del proyecto: quien lo instale puede ejecutar
// la suite que intenta refutarlo, en lugar de creerse el README.
{
  assert.ok((pkg.files || []).some((f) => f.replace(/\/$/, '') === 'tests'),
    'la suite viaja con el paquete: es lo que permite no creerse la documentacion');
  assert.strictEqual(pkg.scripts && pkg.scripts.test, 'node tests/run_all.js',
    'npm test debe ejecutar la suite real, no un placeholder');
  ok('la suite viaja con el paquete y npm test la ejecuta');
}

// --- 6. El motor declarado coincide con el documentado ---------------------
{
  const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  assert.ok(pkg.engines && typeof pkg.engines.node === 'string', 'debe declararse el motor');
  const minimo = pkg.engines.node.match(/(\d+)/);
  assert.ok(minimo, 'engines.node debe indicar una version minima');
  assert.ok(readme.includes(`Node.js ${minimo[1]}`),
    `package.json exige Node ${minimo[1]} pero el README no lo documenta`);
  ok(`engines.node (${pkg.engines.node}) coincide con lo que documenta el README`);
}

// --- 7. Cada subcomando apunta a algo que se envia --------------------------
// Un comando que existe en la ayuda pero cuyo script no viaja produce el peor error
// posible: uno que solo aparece despues de instalar.
{
  const enviados = (pkg.files || []).map((f) => f.replace(/\/$/, ''));
  for (const [nombre, { script }] of Object.entries(SUBCOMANDOS)) {
    assert.ok(fs.existsSync(path.join(ROOT, script)),
      `el subcomando "${nombre}" apunta a ${script}, que no existe`);
    const raiz = script.split('/')[0];
    const viaja = enviados.includes(raiz) || enviados.includes(script);
    assert.ok(viaja, `el subcomando "${nombre}" usa ${script}, que no viaja en el paquete`);
  }
  ok(`los ${Object.keys(SUBCOMANDOS).length} subcomandos apuntan a ficheros que viajan`);
}

// --- 8. Licencia y version coherentes con el repositorio -------------------
{
  assert.strictEqual(pkg.license, 'Apache-2.0', 'debe coincidir con el fichero LICENSE');
  const licencia = fs.readFileSync(path.join(ROOT, 'LICENSE'), 'utf8');
  assert.match(licencia, /Apache License/i, 'el LICENSE real debe ser Apache');
  assert.match(pkg.version, /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/, 'la version debe ser semver valido');
  ok(`licencia Apache-2.0 y version ${pkg.version} coherentes con el estado del proyecto`);
}

console.log(`\nPASS AX-F-014 - ${n} comprobaciones`);
