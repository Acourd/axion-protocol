#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol - Escudo de contexto y anclaje de estado.
 *
 * El problema real que ataca: en conversaciones largas el modelo deja de atender al
 * centro de su propia ventana ('lost-in-the-middle'), y lo primero que se difumina son
 * las reglas P0, que se dijeron al principio y no se repiten.
 *
 * Lo que esta herramienta puede hacer, y lo que no. No puede borrar el historial de la
 * conversacion: eso vive en el host, no aqui. Lo que hace es producir un ancla corta y
 * de alta senal -ANCHOR.md- que el agente relee tras compactar, de modo que las reglas
 * vuelvan al final de la ventana, que es donde si se miran.
 *
 * El digest cubre el contenido de la superficie de gobernanza (reglas, workflows,
 * CLAUDE.md, perfil). Asi cambia exactamente cuando cambia algo que altera el
 * comportamiento del agente, y no cambia cuando lo unico distinto es la hora: un digest
 * que cambia siempre no distingue nada y no sirve para detectar deriva.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { bloqueParaAncla } = require('./memory.js');

const RAIZ_MODULO = path.resolve(__dirname, '..');
const SNAPSHOTS_A_CONSERVAR = 10;

function versionDe(raiz) {
  for (const base of [raiz, RAIZ_MODULO]) {
    try {
      return JSON.parse(fs.readFileSync(path.join(base, 'package.json'), 'utf8')).version;
    } catch (_) {
      // Sin package.json legible se prueba la siguiente base; la version es informativa.
    }
  }
  return 'desconocida';
}

function ficherosDe(dir, ext) {
  try {
    return fs.readdirSync(dir).filter((f) => f.endsWith(ext)).sort().map((f) => path.join(dir, f));
  } catch (_) {
    return [];
  }
}

/**
 * Digest de contenido sobre todo lo que gobierna al agente. Se ordena por ruta relativa
 * para que dos maquinas con el mismo arbol obtengan el mismo digest.
 */
function digestGobernanza(raiz) {
  const objetivos = [
    path.join(raiz, 'CLAUDE.md'),
    path.join(raiz, '.agents', 'AGENTS.md'),
    path.join(raiz, '.axion', 'PROFILE.json'),
    ...ficherosDe(path.join(raiz, '.agents', 'rules'), '.md'),
    ...ficherosDe(path.join(raiz, '.agents', 'workflows'), '.md'),
    ...ficherosDe(path.join(raiz, '.claude', 'commands'), '.md'),
  ];

  const h = crypto.createHash('sha256');
  const cubiertos = [];
  for (const abs of objetivos) {
    if (!fs.existsSync(abs)) continue;
    const rel = path.relative(raiz, abs).split(path.sep).join('/');
    h.update(rel);
    h.update(fs.readFileSync(abs));
    cubiertos.push(rel);
  }
  return { digest: h.digest('hex'), cubiertos };
}

function ultimoCheckpoint(raiz) {
  const base = path.join(raiz, '.axion', 'checkpoints');
  try {
    const propios = fs.readdirSync(base).sort().filter((id) => {
      try {
        const m = JSON.parse(fs.readFileSync(path.join(base, id, 'manifest.json'), 'utf8'));
        return m.kind !== 'safety';
      } catch (_) {
        return false;
      }
    });
    return propios.length > 0 ? propios[propios.length - 1] : null;
  } catch (_) {
    return null;
  }
}

// La unica purga honesta que esta herramienta puede ofrecer: sus propios snapshots.
// Sin esto, .axion/state/ crece sin techo y el escudo contra el ruido acaba siendo ruido.
function purgarAntiguos(dirEstado) {
  const previos = fs.readdirSync(dirEstado)
    .filter((f) => f.startsWith('context-snapshot-') && f.endsWith('.json'))
    .sort();
  const sobrantes = previos.slice(0, Math.max(0, previos.length - SNAPSHOTS_A_CONSERVAR));
  for (const f of sobrantes) {
    try {
      fs.unlinkSync(path.join(dirEstado, f));
    } catch (_) {
      // Un snapshot que no se deja borrar no invalida la compactacion.
    }
  }
  return sobrantes.length;
}

function compactSessionContext(targetDir) {
  const raiz = path.resolve(targetDir || process.cwd());
  const dirEstado = path.join(raiz, '.axion', 'state');
  fs.mkdirSync(dirEstado, { recursive: true });

  let perfil = {};
  const rutaPerfil = path.join(raiz, '.axion', 'PROFILE.json');
  if (fs.existsSync(rutaPerfil)) {
    try {
      perfil = JSON.parse(fs.readFileSync(rutaPerfil, 'utf8'));
    } catch (_) {
      perfil = {};
    }
  }

  const { digest, cubiertos } = digestGobernanza(raiz);
  const memoria = bloqueParaAncla(raiz);
  const detenido = fs.existsSync(path.join(raiz, '.axion', 'HALT'));
  const checkpoint = ultimoCheckpoint(raiz);
  const marca = new Date().toISOString();

  const invariantes = [
    'PreToolUse: preflight lexico; una cadena de shell cruda nunca alcanza ALLOW.',
    'Parada de emergencia: si existe .axion/HALT, toda llamada a herramienta se bloquea.',
    'Reversion: node tools/checkpoint.js restore <id|latest>, verificada antes de escribir.',
    'Verificacion: nada se declara funcional sin exit code 0 de node tools/verify_changes.js.',
    'Evidencia: manifiesto SHA-256 y atestacion in-toto v1 en sobre DSSE.',
  ];

  const snapshot = {
    timestamp: marca,
    version: versionDe(raiz),
    profile: {
      technical_depth: perfil.technical_depth || 'VISIONARY',
      input_mode: perfil.input_mode || 'VOICE_DICTATION',
      environment: perfil.environment || 'IDE_GUI',
      cadence: perfil.cadence || 'COMPLETE_BLOCK',
      creative_autonomy: perfil.creative_autonomy || 'HIGH',
    },
    governance_status: detenido ? 'HALTED' : 'FAIL_CLOSED',
    last_checkpoint: checkpoint,
    active_invariants: invariantes,
    governance_files: cubiertos,
    memory_entries: memoria ? memoria.length : 0,
    state_digest: digest,
  };

  const ficheroSnapshot = path.join(dirEstado, `context-snapshot-${marca.replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(ficheroSnapshot, JSON.stringify(snapshot, null, 2), 'utf8');

  // El ancla es lo que el agente relee. Corta a proposito: si ocupa una pantalla, vuelve
  // a ser contexto que se ignora.
  const ancla = [
    '# Ancla de estado - Axion Protocol',
    '',
    `Sellada: ${marca} | Version: ${snapshot.version} | Estado: ${snapshot.governance_status}`,
    `Digest de gobernanza: ${digest}`,
    `Ultimo punto de control: ${checkpoint || 'ninguno (crea uno con `axion checkpoint create <etiqueta>`)'}`,
    '',
    '## Perfil activo',
    `- Profundidad: ${snapshot.profile.technical_depth} | Entrada: ${snapshot.profile.input_mode} | Entorno: ${snapshot.profile.environment}`,
    `- Cadencia: ${snapshot.profile.cadence} | Autonomia creativa: ${snapshot.profile.creative_autonomy}`,
    '',
    '## Invariantes P0 que siguen vigentes',
    ...invariantes.map((i) => `- ${i}`),
    '',
    // La memoria entra en el ancla, y no en un archivo aparte que nadie abre. Una
    // decisión que hay que ir a buscar es una decisión que se repetirá: si va a servir
    // de algo tras compactar, tiene que estar donde el agente vuelve a mirar.
    ...(memoria ? ['## Memoria del proyecto', ...memoria, ''] : []),
    '> Relee este fichero despues de cada compactacion. Su unica funcion es devolver las',
    '> reglas P0 al final de la ventana de contexto, que es donde el modelo si las atiende.',
    '',
  ].join('\n');
  const ficheroAncla = path.join(dirEstado, 'ANCHOR.md');
  fs.writeFileSync(ficheroAncla, ancla, 'utf8');

  const purgados = purgarAntiguos(dirEstado);

  return { pass: true, snapshot, file: ficheroSnapshot, anchor: ficheroAncla, purgados };
}

function main() {
  const args = process.argv.slice(2);
  const iTarget = args.indexOf('--target');
  const objetivo = iTarget !== -1 ? args[iTarget + 1] : args.find((a) => !a.startsWith('--'));
  const r = compactSessionContext(objetivo);
  const raiz = path.resolve(objetivo || process.cwd());

  console.log('[Context Shield] Contexto compactado y anclado.');
  console.log(`  Digest de gobernanza: ${r.snapshot.state_digest}`);
  console.log(`  Cubre ${r.snapshot.governance_files.length} ficheros normativos.`);
  console.log(`  Estado: ${r.snapshot.governance_status} | Ultimo checkpoint: ${r.snapshot.last_checkpoint || 'ninguno'}`);
  console.log(`  Ancla para releer: ${path.relative(raiz, r.anchor)}`);
  console.log(`  Snapshot: ${path.relative(raiz, r.file)}`);
  if (r.purgados > 0) console.log(`  Snapshots antiguos purgados: ${r.purgados} (se conservan ${SNAPSHOTS_A_CONSERVAR}).`);
  process.exit(0);
}

if (require.main === module) main();

module.exports = { compactSessionContext, digestGobernanza, SNAPSHOTS_A_CONSERVAR };
