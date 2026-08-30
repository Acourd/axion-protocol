#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol - VibeGuard, puerta de calidad sobre un árbol de archivos.
 *
 * Reparto de papeles con `vibeguard.js`, que antes no existía y por eso había dos
 * detectores distintos conviviendo:
 *
 *   vibeguard.js        inspecciona archivos sueltos y emite JSON. Es el analizador.
 *   vibeguard_gate.js   recorre un árbol, decide qué mirar y traduce el resultado a un
 *                       código de salida. Es la puerta.
 *
 * La detección vive en un solo sitio. La puerta tenía su propia lista de patrones —cuatro
 * expresiones sueltas— que se perdía los `catch` mudos, el hallazgo de mayor severidad, y
 * marcaba como TODO cualquier mención dentro de una cadena. Dos detectores divergen
 * siempre, y el que acaba corriendo en el CLI no tiene por qué ser el mejor de los dos:
 * aquí era el peor.
 */

const fs = require('fs');
const path = require('path');
const { inspectFileContent } = require('./vibeguard.js');
const VibeGuardStorageHook = require('./vibeguard_storage_hook.js');

// `tests` queda fuera porque sus fixtures contienen antipatrones a propósito: son el
// material con el que se comprueba que el detector detecta.
const DIR_EXCLUIDOS = new Set([
  'node_modules', '.git', '.axion', '.phase-e', 'tests', 'scratch',
  'dist', 'build', 'out', 'coverage', '.next', '.cache', 'phases',
]);

const EXTENSIONES = ['.js', '.mjs', '.cjs', '.ts', '.jsx', '.tsx', '.py', '.css', '.scss'];

const SEVERIDAD_ORDEN = { HIGH: 0, MEDIUM: 1, LOW: 2 };

// Que bloquea y que solo avisa. LOW es asesoramiento -un !important que conviene revisar-
// y no una falta de gobernanza: hacer que tumbe la puerta es lo que lleva a la gente a
// desactivarla, y una puerta desactivada no protege de nada. Con --strict tambien bloquea,
// para quien quiera esa politica en su CI.
const BLOQUEAN = new Set(['HIGH', 'MEDIUM']);

function recorrer(dir, encontrados) {
  let entradas;
  try {
    entradas = fs.readdirSync(dir, { withFileTypes: true });
  } catch (_) {
    // Un directorio ilegible no detiene el escaneo del resto del árbol.
    return encontrados;
  }
  for (const e of entradas) {
    if (DIR_EXCLUIDOS.has(e.name)) continue;
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) {
      recorrer(abs, encontrados);
    } else if (e.isFile() && EXTENSIONES.some((ext) => e.name.endsWith(ext))) {
      encontrados.push(abs);
    }
  }
  return encontrados;
}

function runVibeGuardGate(targetDir, opciones = {}) {
  const raiz = path.resolve(targetDir || process.cwd());
  const estricto = Boolean(opciones.strict);
  console.log(`[VibeGuard] Escaneando calidad de código en: ${raiz}\n`);

  // Hook preventivo de almacenamiento
  const storageHook = new VibeGuardStorageHook(raiz);
  storageHook.preScan();

  const archivos = recorrer(raiz, []);
  const findings = [];
  const ilegibles = [];

  for (const abs of archivos) {
    let contenido;
    try {
      contenido = fs.readFileSync(abs, 'utf8');
    } catch (err) {
      ilegibles.push({ file: abs, reason: err.message });
      continue;
    }
    const rel = path.relative(raiz, abs).split(path.sep).join('/');
    for (const issue of inspectFileContent(contenido, rel).issues) {
      findings.push({ file: rel, ...issue });
    }
  }

  findings.sort((a, b) => (SEVERIDAD_ORDEN[a.severity] - SEVERIDAD_ORDEN[b.severity])
    || (a.file < b.file ? -1 : a.file > b.file ? 1 : 0)
    || (a.line - b.line));

  const bloqueantes = findings.filter((f) => estricto || BLOQUEAN.has(f.severity));

  if (findings.length === 0 && ilegibles.length === 0) {
    console.log(`✓ VibeGuard PASS: ${archivos.length} archivos escaneados, cero antipatrones.`);
    return { pass: true, findings: [], blocking: [], scanned: archivos.length, unreadable: [] };
  }

  if (findings.length > 0) {
    const porSeveridad = findings.reduce((acc, f) => {
      acc[f.severity] = (acc[f.severity] || 0) + 1;
      return acc;
    }, {});
    const resumen = ['HIGH', 'MEDIUM', 'LOW']
      .filter((s) => porSeveridad[s])
      .map((s) => `${porSeveridad[s]} ${s}`)
      .join(' · ');
    console.log(`⚠️ ${findings.length} antipatrón(es) detectado(s) en ${archivos.length} archivos (${resumen}):\n`);
    for (const f of findings) {
      console.log(`  [${f.severity}] ${f.file}:${f.line}  ${f.category}`);
      console.log(`          ${f.message}`);
    }
  }

  // Un archivo que no se puede leer no es un archivo limpio. Contarlo como tal sería
  // dejar que un permiso mal puesto silenciara la puerta entera.
  if (ilegibles.length > 0) {
    console.log(`\n✗ ${ilegibles.length} archivo(s) ilegible(s); no se pueden dar por limpios:`);
    ilegibles.forEach((i) => console.log(`  - ${path.relative(raiz, i.file)}: ${i.reason}`));
  }

  const pass = bloqueantes.length === 0 && ilegibles.length === 0;
  console.log('');
  console.log(pass
    ? `✓ VibeGuard PASS con ${findings.length} aviso(s) de severidad LOW: no bloquean la promocion. Usa --strict para exigirlos.`
    : `✗ VibeGuard FAIL: ${bloqueantes.length} hallazgo(s) bloqueante(s)${ilegibles.length ? ` y ${ilegibles.length} archivo(s) ilegible(s)` : ''}.`);

  // Hook post-escaneo para purga atómica
  storageHook.postScan();

  return { pass, findings, blocking: bloqueantes, scanned: archivos.length, unreadable: ilegibles };
}

function main() {
  const args = process.argv.slice(2);
  const i = args.indexOf('--target');
  const objetivo = i !== -1 ? args[i + 1] : args.find((a) => !a.startsWith('--'));
  const res = runVibeGuardGate(objetivo || process.cwd(), { strict: args.includes('--strict') });
  process.exit(res.pass ? 0 : 1);
}

if (require.main === module) main();

module.exports = { runVibeGuardGate, DIR_EXCLUIDOS, EXTENSIONES, BLOQUEAN };
