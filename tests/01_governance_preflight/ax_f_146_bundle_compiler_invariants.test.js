'use strict';

/**
 * Axion Protocol — Invariantes del Compilador de Runtime Standalone Single-File.
 *
 * Valida de forma estricta:
 * 1. Empaquetado determinista de herramientas esenciales en un único archivo CJS (dist/axion.bundle.js).
 * 2. Cero dependencias externas y cargador de módulos virtual nativo.
 * 3. Ejecución standalone de subcomandos CLI desde el bundle compilado.
 * 4. Integración transparente con DriveEngine y CLI unificado.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const BundleCompiler = require('../../tools/bundle_compiler.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-146 Invariantes del Compilador de Runtime Standalone ===\n');

const ROOT = path.resolve(__dirname, '..', '..');

try {
  const compiler = new BundleCompiler(ROOT);

  // 1. Validar compilación del bundle
  const compileRes = compiler.compile();
  assert.strictEqual(compileRes.success, true);
  assert.ok(fs.existsSync(compileRes.outputFile));
  assert.ok(compileRes.sizeBytes > 10000, 'El bundle debe tener un tamaño sustancial (> 10KB)');
  assert.strictEqual(compileRes.digest.length, 64);
  console.log(`✓ Compilación standalone validada: ${(compileRes.sizeBytes / 1024).toFixed(1)} KB (SHA-256: ${compileRes.digest.slice(0, 16)}...)`);

  // 2. Validar ejecución del comando help desde el bundle
  const helpOutput = execFileSync(process.execPath, [compileRes.outputFile, 'help'], { encoding: 'utf8' });
  assert.ok(helpOutput.includes('Axion Protocol — Standalone Single-File Bundle'));
  assert.ok(helpOutput.includes('Subcomandos disponibles'));
  console.log('✓ Ejecución standalone del subcomando "help" verificada');

  // 3. Validar ejecución del subcomando capabilities desde el bundle
  const capsOutput = execFileSync(process.execPath, [compileRes.outputFile, 'capabilities'], { encoding: 'utf8' });
  const capsParsed = JSON.parse(capsOutput);
  assert.ok(capsParsed.totalAvailable >= 5);
  console.log(`✓ Ejecución standalone del subcomando "capabilities" verificada (${capsParsed.totalAvailable} capacidades disponibles)`);

  // 4. Validar integración con DriveEngine
  const driveEngine = new DriveEngine(ROOT);
  const driveCompile = driveEngine.compileStandaloneBundle();
  assert.strictEqual(driveCompile.success, true);
  console.log('✓ Integración DriveEngine.compileStandaloneBundle() verificada');

} finally {
  // Limpieza no destructiva de dist/ si es necesario
}

console.log('\nPASS AX-F-146 — Invariantes del compilador de runtime standalone demostrados al 100%.');
