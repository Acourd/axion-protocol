#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol - Safe Non-Destructive Updater
 * 
 * Actualiza las herramientas, reglas y workflows de Axion en un proyecto existente
 * preservando intactas las preferencias de usuario (.axion/PROFILE.json) y configuraciones personalizadas.
 */

const fs = require('fs');
const path = require('path');
const { runInstallation } = require('../install.js');

const ROOT = path.resolve(__dirname, '..');
const pkg = require(path.join(ROOT, 'package.json'));

function runUpdate(targetDir) {
  const target = path.resolve(targetDir || process.cwd());
  console.log(`[Axion Updater] Comprobando actualizaciones para Axion Protocol v${pkg.version}...`);
  console.log(`  Directorio objetivo: ${target}\n`);

  const profilePath = path.join(target, '.axion', 'PROFILE.json');
  let savedProfile = null;
  if (fs.existsSync(profilePath)) {
    try {
      savedProfile = fs.readFileSync(profilePath, 'utf8');
      console.log('  ✓ Perfil de usuario detectado y protegido (.axion/PROFILE.json)');
    } catch (e) {
      // Ignorar error de lectura
    }
  }

  // Ejecutar instalación / actualización protegida
  const result = runInstallation(target);

  // Restaurar perfil de usuario si existía para garantizar cero sobreescritura
  if (savedProfile) {
    fs.writeFileSync(profilePath, savedProfile, 'utf8');
    console.log('  ✓ Perfil de usuario preservado intacto.');
  }

  console.log(`\n🎉 [Axion Updater] Proyecto actualizado con éxito a v${pkg.version}.`);
  return result;
}

function main() {
  const args = process.argv.slice(2);
  let target = process.cwd();

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--target' && args[i + 1]) {
      target = args[i + 1];
      break;
    }
  }

  runUpdate(target);
}

if (require.main === module) {
  main();
}

module.exports = { runUpdate };
