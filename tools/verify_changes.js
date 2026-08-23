#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol - Deterministic Verification Loop (Verify-Changes)
 * 
 * Regla de Oro: El código no se declara funcional por inspección visual.
 * Debe demostrar su funcionamiento ejecutando una prueba o compilación real con exit code 0.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function runVerificationLoop(targetDir) {
  const root = path.resolve(targetDir || process.cwd());
  console.log(`[Verify-Changes] Iniciando ciclo de verificación determinista en: ${root}\n`);

  // Detectar comando de prueba según el proyecto
  let cmd = null;
  const pkgPath = path.join(root, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.scripts && pkg.scripts.test) {
        cmd = 'npm test';
      }
    } catch (e) {}
  }

  if (!cmd && fs.existsSync(path.join(root, 'tests', 'run_all.js'))) {
    cmd = 'node tests/run_all.js';
  }

  if (!cmd) {
    console.log('⚠️ No se detectó suite de pruebas automatizada configurada.');
    return { pass: false, reason: 'NO_TEST_RUNNER_FOUND' };
  }

  console.log(`Ejecutando verificador determinista: \`${cmd}\`...`);
  try {
    const output = execSync(cmd, { cwd: root, encoding: 'utf8', stdio: 'pipe' });
    console.log('\n✓ VERIFICACIÓN DETERMINISTA SUPERADA (EXIT CODE 0):');
    const lines = output.split('\n').filter(l => l.trim().length > 0).slice(-4);
    lines.forEach(l => console.log(`  ${l}`));
    return { pass: true, output };
  } catch (err) {
    console.error('\n✗ FALLO DE VERIFICACIÓN (EXIT CODE NO-ZERO):');
    console.error(err.stdout || err.message);
    return { pass: false, error: err.message };
  }
}

function main() {
  const res = runVerificationLoop(process.argv[2]);
  process.exit(res.pass ? 0 : 1);
}

if (require.main === module) main();

module.exports = { runVerificationLoop };
