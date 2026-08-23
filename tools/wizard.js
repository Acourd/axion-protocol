#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol - Interactive Onboarding Wizard
 * 
 * Asistente de terminal para calibrar perfil de usuario e inicializar
 * el arnés de gobernanza en proyectos nuevos de forma interactiva.
 */

const readline = require('readline');
const path = require('path');
const { runInstallation } = require('../install.js');
const { saveCustomProfile } = require('./profile_adapter.js');

function askQuestion(rl, query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function runWizard(targetDir) {
  const target = path.resolve(targetDir || process.cwd());
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('\n🛡️  Bienvenido al Asistente de Inicialización de Axion Protocol (v1.2.0-beta)\n');
  console.log('Vamos a calibrar tu experiencia en 3 preguntas rápidas:\n');

  // Pregunta 1
  console.log('1. ¿Cuál es tu perfil de trabajo principal?');
  console.log('   [1] Visionario / Creador No Técnico (Cero jerga técnica)');
  console.log('   [2] Constructor Intermedio / Product Builder (Explicaciones prácticas)');
  console.log('   [3] Ingeniero Senior / DevSecOps (Detalles de bajo nivel y diffs)');
  const ans1 = (await askQuestion(rl, 'Elige [1-3] (Por defecto 1): ')).trim();

  const profileMap = { '1': 'VISIONARY', '2': 'BUILDER', '3': 'ENGINEER' };
  const technical_depth = profileMap[ans1] || 'VISIONARY';

  // Pregunta 2
  console.log('\n2. ¿Cómo interactúas con la IA habitualmente?');
  console.log('   [1] Dictado por voz / Mensajes hablados fluidos');
  console.log('   [2] Texto directo por teclado');
  const ans2 = (await askQuestion(rl, 'Elige [1-2] (Por defecto 1): ')).trim();
  const input_mode = ans2 === '2' ? 'KEYBOARD_CONCISE' : 'VOICE_DICTATION';

  // Pregunta 3
  console.log('\n3. ¿Desde qué entorno operas?');
  console.log('   [1] Interfaz visual / IDE (Antigravity 2.0 GUI, Cursor, VS Code)');
  console.log('   [2] Terminal pura / CLI (Antigravity agy, Claude Code)');
  const ans3 = (await askQuestion(rl, 'Elige [1-2] (Por defecto 1): ')).trim();
  const environment = ans3 === '2' ? 'CLI_TERMINAL' : 'IDE_GUI';

  rl.close();

  console.log('\n📦 Guardando perfil adaptativo...');
  saveCustomProfile({ technical_depth, input_mode, environment });

  console.log('📦 Inyectando reglas de gobernanza y workflows...');
  runInstallation(target);

  console.log('🎉 ¡Proyecto configurado y calibrado con éxito!\n');
}

function main() {
  runWizard(process.argv[2]);
}

if (require.main === module) main();

module.exports = { runWizard };
