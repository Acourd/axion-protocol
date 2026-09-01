#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol - Perfil adaptativo del usuario.
 *
 * Calibra las 5 dimensiones que cambian como se comporta el agente:
 *   1. Profundidad tecnica    Visionario / Constructor / Ingeniero
 *   2. Metodo de entrada      Dictado por voz / Teclado
 *   3. Entorno de trabajo     IDE visual / Terminal
 *   4. Cadencia de entrega    Bloque completo / Micro-pasos / Hibrida
 *   5. Autonomia creativa     Alta / Dirigida
 *
 * El comando `set` existe porque /profile prometia persistir las respuestas y no habia
 * ninguna ruta desde la linea de comandos para escribirlas: la CLI solo sabia leer, asi
 * que la calibracion se perdia en cuanto terminaba la conversacion.
 *
 * La escritura es fusion, no reemplazo. Un perfil puede contener matices que el
 * cuestionario de cinco preguntas no sabe expresar, y responder una pregunta no es
 * motivo para borrar lo que no se pregunto.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const DEFAULT_PROFILE = {
  technical_depth: 'VISIONARY',
  input_mode: 'VOICE_DICTATION',
  environment: 'IDE_GUI',
  cadence: 'COMPLETE_BLOCK',
  creative_autonomy: 'HIGH',
  summary: 'Director / Creador. Dictado por voz, IDE visual, entregas en bloque completo y alta autonomia visual.',
};

// Cada dimension declara sus opciones una sola vez: de aqui salen el valor persistido,
// la etiqueta legible y la validacion. Anadir una opcion es anadir una linea, y no hay
// una segunda tabla que pueda quedarse atras.
const DIMENSIONES = [
  {
    n: 1, campo: 'technical_depth', etiqueta: 'technical_depth_label',
    opciones: {
      A: ['VISIONARY', 'Visionario / Creador No Técnico'],
      B: ['BUILDER', 'Constructor Intermedio'],
      C: ['ENGINEER', 'Ingeniero Senior'],
    },
  },
  {
    n: 2, campo: 'input_mode', etiqueta: 'input_mode_label',
    opciones: {
      A: ['VOICE_DICTATION', 'Dictado por Voz'],
      B: ['KEYBOARD_CONCISE', 'Teclado Directo y Conciso'],
    },
  },
  {
    n: 3, campo: 'environment', etiqueta: 'environment_label',
    opciones: {
      A: ['IDE_GUI', 'IDE Visual (Antigravity, Cursor, VS Code)'],
      B: ['CLI_TERMINAL', 'Terminal pura (agy, Claude Code)'],
    },
  },
  {
    n: 4, campo: 'cadence', etiqueta: 'cadence_label',
    opciones: {
      A: ['COMPLETE_BLOCK', 'Bloque Completo'],
      B: ['MICRO_STEPS', 'Micro-Pasos con feedback'],
      C: ['HYBRID_ADAPTIVE', 'Híbrida Adaptable según el riesgo del paso'],
    },
  },
  {
    n: 5, campo: 'creative_autonomy', etiqueta: 'creative_autonomy_label',
    opciones: {
      A: ['HIGH', 'Autonomía Alta (Anti-Slop)'],
      B: ['GUIDED_DIRECTION', 'Dirección Guiada (consultar antes de aplicar estilos)'],
    },
  },
];

function escribirAtomico(rutaDestino, contenido) {
  const dir = path.dirname(rutaDestino);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${rutaDestino}.tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  fs.writeFileSync(tmp, contenido, 'utf8');
  try {
    fs.renameSync(tmp, rutaDestino);
  } catch (_) {
    fs.copyFileSync(tmp, rutaDestino);
    try { fs.unlinkSync(tmp); } catch (_) {}
  }
}

function rutaPerfil(raiz) {
  return path.join(raiz || ROOT, '.axion', 'PROFILE.json');
}

function getProfile(raiz) {
  const fichero = rutaPerfil(raiz);
  if (fs.existsSync(fichero)) {
    try {
      return JSON.parse(fs.readFileSync(fichero, 'utf8'));
    } catch (_) {
      // Un perfil ilegible no debe tumbar al agente: se sigue con el de fabrica y se
      // conserva el fichero para que la persona pueda mirarlo.
      return { ...DEFAULT_PROFILE, profile_read_error: true };
    }
  }
  return { ...DEFAULT_PROFILE };
}

function saveCustomProfile(profileData, raiz) {
  const base = raiz || ROOT;
  const actual = getProfile(base);
  delete actual.profile_read_error;
  const fusionado = { ...actual, ...profileData, updated_at: new Date().toISOString() };
  escribirAtomico(rutaPerfil(base), JSON.stringify(fusionado, null, 2) + '\n');
  return fusionado;
}

/**
 * Traduce las respuestas del cuestionario a campos del perfil.
 * Acepta "1A 2B 3A" y tambien "1A2B3A" pegado, porque quien dicta por voz rara vez
 * separa las respuestas igual dos veces seguidas.
 */
function parseAnswers(tokens) {
  const texto = (Array.isArray(tokens) ? tokens.join(' ') : String(tokens || '')).toUpperCase();
  const pares = texto.match(/([0-9])\s*([A-Z])/g) || [];
  const cambios = {};
  const aplicadas = [];
  const errores = [];

  for (const par of pares) {
    const m = par.match(/([0-9])\s*([A-Z])/);
    const n = Number(m[1]);
    const dim = DIMENSIONES.find((d) => d.n === n);
    if (!dim) {
      errores.push(`la pregunta ${n} no existe (las dimensiones van de 1 a ${DIMENSIONES.length})`);
      continue;
    }
    const opcion = dim.opciones[m[2]];
    if (!opcion) {
      errores.push(`la pregunta ${n} no admite la opcion ${m[2]}`);
      continue;
    }
    cambios[dim.campo] = opcion[0];
    cambios[dim.etiqueta] = opcion[1];
    aplicadas.push(`${n}${m[2]} -> ${dim.campo}=${opcion[0]}`);
  }

  if (texto.trim() && pares.length === 0) {
    errores.push('No se reconoció ninguna respuesta con el formato <pregunta><opcion>, por ejemplo 1A.');
  }

  return { cambios, aplicadas, errores };
}

const USO = [
  'Uso:',
  '  node tools/profile_adapter.js               muestra el perfil activo',
  '  node tools/profile_adapter.js show --json   lo emite como JSON',
  '  node tools/profile_adapter.js set 1A 2A 3B 4C 5B   persiste las respuestas',
  '',
  'Opciones por pregunta:',
  ...DIMENSIONES.map((d) => `  ${d.n}. ${d.campo.padEnd(18)} ${Object.entries(d.opciones).map(([k, v]) => `${k}=${v[0]}`).join('  ')}`),
  '',
  '  --target <dir>   proyecto sobre el que operar (por defecto, la raiz de Axion)',
  '',
  'Codigos de salida: 0 correcto, 1 respuestas invalidas, 2 uso incorrecto.',
].join('\n');

function resumir(p) {
  return `[Axion Profile] Perfil: ${p.technical_depth} | Entrada: ${p.input_mode} | Entorno: ${p.environment} | Cadencia: ${p.cadence} | Autonomia: ${p.creative_autonomy}`;
}

function main() {
  const args = process.argv.slice(2);
  let raiz = ROOT;
  const iTarget = args.indexOf('--target');
  if (iTarget !== -1 && args[iTarget + 1]) raiz = path.resolve(args[iTarget + 1]);
  const limpios = args.filter((a, i) => a !== '--target' && args[i - 1] !== '--target');

  const accion = limpios[0];

  if (accion === '--help' || accion === '-h' || accion === 'help') {
    console.log(USO);
    process.exit(2);
  }

  if (accion === 'set') {
    const respuestas = limpios.slice(1).filter((a) => !a.startsWith('--'));
    if (respuestas.length === 0) {
      console.error('Faltan las respuestas. Ejemplo: node tools/profile_adapter.js set 1A 2A 3B 4C 5B\n');
      console.error(USO);
      process.exit(2);
    }
    const { cambios, aplicadas, errores } = parseAnswers(respuestas);
    if (errores.length > 0) {
      errores.forEach((e) => console.error(`  - ${e}`));
      process.exit(1);
    }
    if (aplicadas.length === 0) {
      console.error('No se reconocio ninguna respuesta con el formato <pregunta><opcion>, por ejemplo 1A.');
      process.exit(1);
    }
    const guardado = saveCustomProfile(cambios, raiz);
    console.log('OK Perfil calibrado y persistido.');
    aplicadas.forEach((a) => console.log(`  ${a}`));
    console.log(`  Fichero: ${path.relative(process.cwd(), rutaPerfil(raiz))}`);
    console.log(`  ${resumir(guardado)}`);
    process.exit(0);
  }

  const perfil = getProfile(raiz);

  if (accion === 'show' && limpios.includes('--json')) {
    console.log(JSON.stringify(perfil, null, 2));
    process.exit(0);
  }

  if (accion && accion !== 'show') {
    console.log(`Accion desconocida: ${accion}\n`);
    console.log(USO);
    process.exit(2);
  }

  console.log(resumir(perfil));
  process.exit(0);
}

function applyAnswers(tokens, raiz) {
  const { cambios, aplicadas, errores } = parseAnswers(tokens);
  if (errores.length > 0) {
    return { pass: false, errores, aplicadas };
  }
  const guardado = saveCustomProfile(cambios, raiz);
  return { pass: true, profile: guardado, aplicadas, errores: [] };
}

if (require.main === module) main();

module.exports = {
  getProfile,
  saveCustomProfile,
  parseAnswers,
  applyAnswers,
  DIMENSIONES,
  DEFAULT_PROFILE,
  USO,
};
