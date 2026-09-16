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
const crypto = require('crypto');

const TIMEOUT_MS = 10 * 60 * 1000;
const EVIDENCE_SCHEMA = 'axion.verification/v1';

/**
 * Extrae los conteos reales que imprime tests/run_all.js. Si no se pueden leer,
 * se devuelven null: preferimos evidencia incompleta a evidencia inventada.
 */
function parseSuiteCounts(output) {
  const total = /suites totales\s*:\s*(\d+)/.exec(output);
  const passed = /en verde\s*:\s*(\d+)/.exec(output);
  const failed = /en rojo\s*:\s*(\d+)/.exec(output);
  return {
    total: total ? Number(total[1]) : null,
    passed: passed ? Number(passed[1]) : null,
    failed: failed ? Number(failed[1]) : null
  };
}

/**
 * Firma del productor de evidencia: la clave local del keyring de atestación.
 * Sin esta firma, la entrada del ledger no es válida para el atestador.
 */
function buildEvidenceSigner(raiz) {
  const DriveDsseAttester = require('./drive_dsse_attester.js');
  const attester = new DriveDsseAttester(raiz);
  attester.ensureKeyPair();
  const { privateKeyPem, publicKeyPem } = attester.loadKeyPair();
  return {
    keyId: attester.keyIdFor(publicKeyPem),
    sign: (buffer) => crypto.sign(null, buffer, privateKeyPem)
  };
}

/**
 * Escribe un artefacto de evidencia verificable (SHA-256 obligatorio en el consumidor)
 * y lo registra en el ledger encadenado y firmado por el productor.
 */
function writeEvidenceArtifact(raiz, ejecucion, resultado) {
  const suites = parseSuiteCounts(resultado.output || '');
  const startedAtMs = ejecucion.startedAtMs;
  const finishedAtMs = Date.now();
  const output = resultado.output || '';
  const { recordEvidence } = require('./evidence_ledger.js');

  const produced = recordEvidence(raiz, {
    schema: EVIDENCE_SCHEMA,
    producer: 'tools/verify_changes.js',
    runner: ejecucion.etiqueta,
    command: `${path.basename(ejecucion.executable)} ${ejecucion.args.join(' ')}`,
    exitCode: 0,
    status: 'PASS',
    suites,
    startedAt: new Date(startedAtMs).toISOString(),
    finishedAt: new Date(finishedAtMs).toISOString(),
    durationMs: finishedAtMs - startedAtMs,
    outputSha256: crypto.createHash('sha256').update(output).digest('hex'),
    signer: buildEvidenceSigner(raiz)
  });

  return {
    path: produced.path,
    relPath: produced.relPath,
    sha256: produced.sha256,
    ledgerSeq: produced.entry.seq
  };
}

/**
 * Elige que ejecutar, en orden de preferencia y sin adivinar:
 * el runner propio del proyecto, y si no lo hay, el script `test` de package.json.
 */
function detectarVerificador(raiz, options = {}) {
  if (options.incremental || options.fast) {
    const incrementalRunner = path.join(raiz, 'tools', 'smart_incremental_runner.js');
    if (fs.existsSync(incrementalRunner)) {
      return { executable: process.execPath, args: [incrementalRunner], etiqueta: 'node tools/smart_incremental_runner.js' };
    }
  }

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

function runVerificationLoop(targetDir, options = {}) {
  const raiz = path.resolve(targetDir || process.cwd());
  console.log(`[Verify-Changes] Ciclo de verificacion determinista en: ${raiz}\n`);

  const v = detectarVerificador(raiz, options);
  if (!v) {
    console.error('FALLO No hay suite de pruebas que ejecutar (ni tests/run_all.js ni script `test`).');
    console.error('  Sin verificador no se puede afirmar que el cambio funciona, asi que no se afirma.');
    return { pass: false, reason: 'NO_TEST_RUNNER_FOUND' };
  }

  console.log(`Ejecutando: ${v.etiqueta}  (shell: false)`);
  const startedAtMs = Date.now();
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

  let evidence = null;
  try {
    evidence = writeEvidenceArtifact(raiz, { etiqueta: v.etiqueta, executable: v.executable, args: v.args, startedAtMs }, { output: salida });
    console.log(`  Evidencia verificable: ${evidence.relPath} (SHA-256 ${evidence.sha256.slice(0, 16)}..., ledger #${evidence.ledgerSeq})`);
  } catch (evidenceErr) {
    console.error(`  ADVERTENCIA: no se pudo escribir el artefacto de evidencia: ${evidenceErr.message}`);
  }

  return { pass: true, output: salida, evidence };
}

function main() {
  const args = process.argv.slice(2);
  const fast = args.includes('--fast') || args.includes('--incremental');
  const iTarget = args.indexOf('--target');
  const objetivo = iTarget !== -1 ? args[iTarget + 1] : args.find((a) => !a.startsWith('--'));
  const res = runVerificationLoop(objetivo, { fast, incremental: fast });
  process.exit(res.pass ? 0 : 1);
}

if (require.main === module) main();

module.exports = { runVerificationLoop, detectarVerificador };
