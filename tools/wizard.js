#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol - Asistente interactivo de inicialización.
 *
 * Calibra el perfil y despliega el arnés de gobernanza en un proyecto, preguntando.
 *
 * Dos cosas que este asistente hacía mal y que importan más que las preguntas:
 *
 *   - Sin terminal interactiva (una tubería, un CI, un runner de pruebas) se quedaba
 *     esperando una respuesta que nunca llegaba, salía con 0 y no instalaba nada. Éxito
 *     declarado sobre trabajo no hecho, que es el fallo que este protocolo persigue.
 *   - Preguntaba 3 de las 5 dimensiones del perfil, así que dejaba a medias justo la
 *     configuración que dice completar.
 *
 * Las preguntas salen de DIMENSIONES en profile_adapter.js. Tenerlas escritas dos veces
 * garantizaba que /profile y el asistente acabaran ofreciendo opciones distintas.
 */

const readline = require('readline');
const path = require('path');
const fs = require('fs');
const { runInstallation } = require('../install.js');
const { saveCustomProfile, DIMENSIONES, getProfile } = require('./profile_adapter.js');

const RAIZ = path.resolve(__dirname, '..');

const ENUNCIADOS = {
  technical_depth: 'Nivel de enfoque técnico',
  input_mode: 'Método de interacción',
  environment: 'Entorno de trabajo',
  cadence: 'Cadencia de entrega',
  creative_autonomy: 'Autonomía creativa y de diseño',
};

function version() {
  try {
    return JSON.parse(fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf8')).version;
  } catch (_) {
    return 'instalado';
  }
}

function preguntar(rl, texto) {
  return new Promise((resolve) => rl.question(texto, resolve));
}

async function runWizard(targetDir, opciones) {
  const opts = opciones || {};
  const target = path.resolve(targetDir || process.cwd());

  // Sin terminal no hay diálogo posible. Se dice y se sale con 2, en vez de simular una
  // conversación consigo mismo y devolver éxito.
  if (!opts.forzarInteractivo && (!process.stdin.isTTY || !process.stdout.isTTY)) {
    console.error('[Axion Wizard] Este asistente necesita una terminal interactiva y aquí no la hay.');
    console.error('');
    console.error('  Sin diálogo, usa los dos comandos equivalentes:');
    console.error(`    node install.js --target ${target}`);
    console.error('    node tools/profile_adapter.js set 1A 2A 3B 4C 5B');
    return { status: 'NON_INTERACTIVE' };
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log(`\n🛡️  Asistente de inicialización de Axion Protocol v${version()}\n`);
  console.log('Cinco preguntas para calibrar cómo trabajamos. Enter acepta la opción A.\n');

  const respuestas = {};
  for (const dim of DIMENSIONES) {
    const claves = Object.keys(dim.opciones);
    console.log(`${dim.n}. ${ENUNCIADOS[dim.campo] || dim.campo}`);
    claves.forEach((k) => console.log(`   [${k}] ${dim.opciones[k][1]}`));
    const bruto = (await preguntar(rl, `   Elige [${claves.join('/')}] (por defecto A): `)).trim().toUpperCase();
    const elegida = claves.includes(bruto) ? bruto : 'A';
    if (bruto && !claves.includes(bruto)) {
      console.log(`   (no reconocí "${bruto}", tomo A)`);
    }
    respuestas[dim.campo] = dim.opciones[elegida][0];
    respuestas[dim.etiqueta] = dim.opciones[elegida][1];
    console.log('');
  }

  rl.close();

  console.log('📦 Guardando perfil adaptativo...');
  const perfil = saveCustomProfile(respuestas, target);

  console.log('📦 Inyectando reglas de gobernanza, hooks y workflows...');
  const instalacion = runInstallation(target);

  // El instalador ya sabe distinguir una instalación completa de una a medias. Ignorar
  // esa distinción aquí devolvería el mismo "éxito" para las dos.
  if (instalacion.status !== 'SUCCESS') {
    console.error('\n✗ El asistente no puede dar por configurado el proyecto: la instalación quedó incompleta.');
    return { status: instalacion.status, installation: instalacion, profile: perfil };
  }

  console.log('\n🎉 Proyecto configurado y calibrado.');
  console.log(`   Perfil: ${perfil.technical_depth} · ${perfil.input_mode} · ${perfil.environment} · ${perfil.cadence} · ${perfil.creative_autonomy}`);
  console.log('   Comprueba el resultado con: node tools/health_check.js\n');

  return { status: 'SUCCESS', installation: instalacion, profile: perfil };
}

async function main() {
  const args = process.argv.slice(2);
  const i = args.indexOf('--target');
  const objetivo = i !== -1 ? args[i + 1] : args.find((a) => !a.startsWith('--'));
  try {
    const r = await runWizard(objetivo);
    process.exit(r.status === 'SUCCESS' ? 0 : 2);
  } catch (error) {
    // Sin este catch, una promesa rechazada dejaba al asistente muriendo en silencio.
    console.error(`[Axion Wizard] El asistente se detuvo: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { runWizard, getProfile };
