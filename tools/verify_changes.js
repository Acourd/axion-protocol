#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol - Verificacion determinista por ejecucion.
 *
 * Regla de oro: el codigo no se declara funcional por inspeccion visual. Tiene que
 * demostrarlo ejecutando la suite real y saliendo con codigo 0.
 *
 * La ejecucion es estructurada -{ executable, args, shell:false }- y no una cadena de
 * shell, porque esa es la misma regla que el protocolo le impone al agente en la
 * directiva P4. Una herramienta de gobernanza que se salta su propia norma para su
 * comodidad ensena, con el ejemplo, que la norma es opcional.
 */

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Elige que ejecutar, en orden de preferencia y sin adivinar:
 * el runner propio del proyecto, y si no lo hay, el script `test` de package.json.
 */
function detectarVerificador(raiz) {
  const runnerPropio = path.join(raiz, 'tests', 'run_all.js');
  if (fs.existsSync(runnerPropio)) {
    return { executable: process.execPath, args: [runnerPropio], etiqueta: 'node tests/run_all.js' };
  }

  const pkgPath = path.join(raiz, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.scripts && pkg.scripts.test) {
        // En Windows el ejecutable real es npm.cmd; nombrarlo evita tener que
        // levantar un shell solo para que resuelva la extension.
        const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
        return { executable: npm, args: ['test', '--silent'], etiqueta: 'npm test' };
      }
    } catch (_) {
      // Un package.json ilegible no es una suite: se cae al caso sin verificador.
    }
  }

  return null;
}

function runVerificationLoop(targetDir) {
  const raiz = path.resolve(targetDir || process.cwd());
  console.log(`[Verify-Changes] Ciclo de verificacion determinista en: ${raiz}\n`);

  const v = detectarVerificador(raiz);
  if (!v) {
    console.error('FALLO No hay suite de pruebas que ejecutar (ni tests/run_all.js ni script `test`).');
    console.error('  Sin verificador no se puede afirmar que el cambio funciona, asi que no se afirma.');
    return { pass: false, reason: 'NO_TEST_RUNNER_FOUND' };
  }

  console.log(`Ejecutando: ${v.etiqueta}  (shell: false)`);
  const r = spawnSync(v.executable, v.args, {
    cwd: raiz,
    encoding: 'utf8',
    shell: false,
    timeout: TIMEOUT_MS,
    windowsHide: true,
  });

  const salida = `${r.stdout || ''}${r.stderr || ''}`;

  if (r.error) {
    console.error(`\nFALLO No se pudo ejecutar el verificador: ${r.error.message}`);
    return { pass: false, reason: 'RUNNER_NOT_EXECUTABLE', error: r.error.message };
  }

  // Una senal -por ejemplo un timeout que mata el proceso- deja status en null. No es
  // un exito: es la ausencia de un resultado, y se trata como fallo.
  if (r.status !== 0) {
    console.error(`\nFALLO VERIFICACION (exit code ${r.status === null ? `senal ${r.signal}` : r.status}):`);
    console.error(salida.split('\n').slice(-25).join('\n').trimEnd());
    return { pass: false, reason: 'NON_ZERO_EXIT', status: r.status, output: salida };
  }

  console.log('\nOK VERIFICACION DETERMINISTA SUPERADA (exit code 0):');
  salida.split('\n').filter((l) => l.trim()).slice(-4).forEach((l) => console.log(`  ${l}`));
  return { pass: true, output: salida };
}

function main() {
  const args = process.argv.slice(2);
  const iTarget = args.indexOf('--target');
  const objetivo = iTarget !== -1 ? args[iTarget + 1] : args.find((a) => !a.startsWith('--'));
  const res = runVerificationLoop(objetivo);
  process.exit(res.pass ? 0 : 1);
}

if (require.main === module) main();

module.exports = { runVerificationLoop, detectarVerificador };
