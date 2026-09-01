#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol - Puntos de control y restauracion determinista.
 *
 * Por que existe: hasta ahora /checkpoint y /rollback prometian "restaurar al ultimo
 * snapshot SHA-256 verificado", pero lo unico que habia era un manifiesto de hashes.
 * De un hash no se reconstruye un fichero. Prometer una reversion que no puede ocurrir
 * es peor que no ofrecerla, porque invita a trabajar sin red creyendo que la hay.
 *
 * Aqui el snapshot guarda el contenido, no solo su huella, y la restauracion se
 * verifica entera antes de escribir nada:
 *
 *   - El manifiesto lleva el sha256 de cada fichero y un digest del manifiesto entero.
 *   - Antes de restaurar se recalcula el hash de cada copia guardada. Si una sola no
 *     cuadra, no se restaura ninguna: una reversion a medias deja el arbol en un estado
 *     que nadie ha revisado jamas, y eso es peor que el fallo que se queria deshacer.
 *   - Restaurar crea antes su propio punto de control, para que deshacer sea reversible.
 *   - Los ficheros creados despues del checkpoint se informan pero no se borran. Con
 *     --prune se eliminan, y hay que pedirlo explicitamente.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CONTRATO = '1.0.0';
const DIR_EXCLUIDOS = new Set([
  '.git', 'node_modules', '.axion', 'scratch', 'dist', 'build', 'out',
  '.next', '.nuxt', '.venv', 'venv', '__pycache__', 'coverage', '.cache', 'target',
]);
const LIMITE_FICHERO = 5 * 1024 * 1024;
const LIMITE_TOTAL = 200 * 1024 * 1024;

// Cap MAX_CHECKPOINTS a 3 para mantener el proyecto ligero y prevenir inflación de I/O en disco.
const MAX_CHECKPOINTS = 3;

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

function dirCheckpoints(raiz) {
  return path.join(raiz, '.axion', 'checkpoints');
}

/**
 * ¿La ruta relativa de un manifiesto se queda dentro del arbol?
 *
 * Sin esto, una entrada con `../` convertia la reversion en escritura arbitraria en
 * cualquier punto del disco alcanzable, y el digest no lo impedia: nadie firma el
 * manifiesto, asi que quien lo edita tambien puede recalcularlo. El agravante es que la
 * red de seguridad previa se sella desde el arbol de trabajo y NO contiene el fichero de
 * fuera, de modo que lo que se pisa ahi se pierde sin vuelta.
 *
 * Se comprueba al restaurar y tambien al sellar: un manifiesto con rutas invalidas no
 * deberia llegar siquiera a existir.
 */
function rutaContenida(raiz, relativa) {
  if (typeof relativa !== 'string' || relativa.trim() === '') return false;
  if (path.isAbsolute(relativa) || /^[A-Za-z]:/.test(relativa)) return false;
  const destino = path.resolve(raiz, relativa);
  const base = path.resolve(raiz);
  return destino !== base && destino.startsWith(base + path.sep);
}

// El id ordena lexicograficamente igual que cronologicamente, asi que "el ultimo"
// es el ultimo del listado ordenado y no hace falta leer metadatos para saberlo.
// El sufijo numerico solo aparece si dos sellados caen en el mismo milisegundo, para
// que uno no pise al otro en silencio.
function nuevoId(raiz, etiqueta) {
  const marca = new Date().toISOString().replace(/[:.]/g, '-');
  const etiquetaStr = (etiqueta && typeof etiqueta === 'object')
    ? (etiqueta.label || etiqueta.etiqueta || etiqueta.name || 'checkpoint')
    : String(etiqueta || 'checkpoint');
  const limpia = etiquetaStr
    .toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
  const base = marca + '__' + (limpia || 'checkpoint');
  let id = base;
  let n = 1;
  while (fs.existsSync(path.join(dirCheckpoints(raiz), id))) {
    id = base + '-' + (n += 1);
  }
  return id;
}

function recorrer(raiz, relativo) {
  const abs = path.join(raiz, relativo || '');
  let entradas;
  try {
    entradas = fs.readdirSync(abs, { withFileTypes: true });
  } catch (_) {
    return [];
  }
  const salida = [];
  for (const e of entradas) {
    if (e.isSymbolicLink()) continue;
    const rel = relativo ? relativo + '/' + e.name : e.name;
    if (e.isDirectory()) {
      if (DIR_EXCLUIDOS.has(e.name)) continue;
      salida.push(...recorrer(raiz, rel));
    } else if (e.isFile()) {
      salida.push(rel);
    }
  }
  return salida;
}

function crear(raiz, etiqueta, kind) {
  const id = nuevoId(raiz, etiqueta);
  const destino = path.join(dirCheckpoints(raiz), id);
  const dirDatos = path.join(destino, 'files');
  fs.mkdirSync(dirDatos, { recursive: true });

  const ficheros = [];
  const omitidos = [];
  let total = 0;

  for (const rel of recorrer(raiz)) {
    // Defensa en el origen: recorrer() no deberia producir rutas que escapen, pero si
    // algun dia lo hiciera -un enlace, un nombre raro- el manifiesto no debe recogerlas.
    if (!rutaContenida(raiz, rel)) {
      omitidos.push({ path: rel, reason: 'RUTA_FUERA_DE_RAIZ' });
      continue;
    }
    const origen = path.join(raiz, rel);
    let st;
    try {
      st = fs.statSync(origen);
    } catch (_) {
      omitidos.push({ path: rel, reason: 'ILEGIBLE' });
      continue;
    }
    if (st.size > LIMITE_FICHERO) {
      omitidos.push({ path: rel, reason: 'EXCEDE_LIMITE_FICHERO' });
      continue;
    }
    if (total + st.size > LIMITE_TOTAL) {
      omitidos.push({ path: rel, reason: 'EXCEDE_LIMITE_TOTAL' });
      continue;
    }
    let contenido;
    try {
      contenido = fs.readFileSync(origen);
    } catch (_) {
      omitidos.push({ path: rel, reason: 'ILEGIBLE' });
      continue;
    }
    const copia = path.join(dirDatos, rel);
    fs.mkdirSync(path.dirname(copia), { recursive: true });
    fs.writeFileSync(copia, contenido);
    ficheros.push({ path: rel, sha256: sha256(contenido), size: st.size });
    total += st.size;
  }

  ficheros.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

  const manifiesto = {
    contractVersion: CONTRATO,
    checkpointId: id,
    label: etiqueta || null,
    // 'safety' marca las redes automaticas que crea restore. No son puntos elegidos por
    // nadie, asi que quedan fuera de "latest": si contaran, un segundo `restore latest`
    // devolveria justo el estado que se acababa de deshacer.
    kind: kind === 'safety' ? 'safety' : 'user',
    createdAt: new Date().toISOString(),
    root: path.basename(raiz),
    fileCount: ficheros.length,
    totalBytes: total,
    skipped: omitidos,
    files: ficheros,
  };
  // El digest cubre solo la lista de ficheros: es lo que se restaura, y asi el mismo
  // arbol produce el mismo digest aunque cambie la etiqueta o la hora.
  manifiesto.digest = sha256(JSON.stringify(ficheros));

  fs.writeFileSync(path.join(destino, 'manifest.json'), JSON.stringify(manifiesto, null, 2), 'utf8');
  manifiesto.purged = purgarExcedente(raiz, id, manifiesto.kind);
  return manifiesto;
}

/**
 * Retira los puntos de control mas antiguos por encima del techo. Nunca toca el recien
 * creado, y cuenta cada tipo por separado: las redes de seguridad automaticas no deben
 * desplazar a los puntos que alguien eligio sellar a proposito.
 */
function purgarExcedente(raiz, idProtegido, kindProtegido) {
  const base = dirCheckpoints(raiz);
  const retirados = [];
  const todos = listar(raiz);
  for (const tipo of ['user', 'safety']) {
    const delTipo = todos
      .filter((m) => (m.kind || 'user') === tipo && m.checkpointId !== idProtegido)
      .map((m) => m.checkpointId)
      .sort();
    // El recien creado ya ocupa una plaza de SU tipo. Descontarla del otro haria que
    // sellar redes de seguridad fuese comiendose, plaza a plaza, los puntos elegidos a mano.
    const cupo = tipo === kindProtegido ? MAX_CHECKPOINTS - 1 : MAX_CHECKPOINTS;
    for (const id of delTipo.slice(0, Math.max(0, delTipo.length - cupo))) {
      try {
        fs.rmSync(path.join(base, id), { recursive: true, force: true });
        retirados.push(id);
      } catch (_) {
        // Un punto que no se deja borrar no invalida el que se acaba de sellar.
      }
    }
  }
  return retirados;
}

function listar(raiz) {
  const base = dirCheckpoints(raiz);
  if (!fs.existsSync(base)) return [];
  return fs.readdirSync(base)
    .filter((d) => fs.existsSync(path.join(base, d, 'manifest.json')))
    .sort()
    .map((id) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(base, id, 'manifest.json'), 'utf8'));
      } catch (_) {
        return { checkpointId: id, corrupto: true };
      }
    });
}

function resolver(raiz, referencia) {
  const todos = listar(raiz);
  if (todos.length === 0) return null;
  if (!referencia || referencia === 'latest' || referencia === 'ultimo') {
    const elegidos = todos.filter((m) => m.kind !== 'safety');
    return elegidos.length > 0 ? elegidos[elegidos.length - 1] : null;
  }
  // Por id exacto o por etiqueta; una red de seguridad solo se alcanza nombrandola.
  return todos.find((m) => m.checkpointId === referencia)
    || todos.filter((m) => m.label === referencia).pop()
    || null;
}

/**
 * Verifica un checkpoint entero sin tocar el arbol de trabajo. Se llama siempre antes
 * de restaurar, y tambien suelto, para auditar que la red de seguridad sigue ahi.
 */
function verificar(raiz, manifiesto) {
  if (!manifiesto || manifiesto.corrupto) {
    return { pass: false, status: 'CHECKPOINT_MISSING', problemas: ['no existe o el manifiesto es ilegible'] };
  }
  if (manifiesto.contractVersion !== CONTRATO) {
    return { pass: false, status: 'CHECKPOINT_CONTRACT_MISMATCH', problemas: ['contractVersion ' + manifiesto.contractVersion] };
  }
  if (manifiesto.digest !== sha256(JSON.stringify(manifiesto.files))) {
    return { pass: false, status: 'CHECKPOINT_DIGEST_MISMATCH', problemas: ['el manifiesto fue alterado tras crearse'] };
  }
  const dirDatos = path.join(dirCheckpoints(raiz), manifiesto.checkpointId, 'files');
  const problemas = [];
  for (const f of manifiesto.files) {
    // La ruta se valida antes que nada: si escapa del arbol, ni siquiera se mira si la
    // copia existe. Un checkpoint con una sola ruta fuera se descarta entero, porque el
    // resto del manifiesto ya no merece confianza.
    if (!rutaContenida(raiz, f.path)) {
      problemas.push('la ruta ' + JSON.stringify(f.path) + ' escapa de la raiz del proyecto');
      continue;
    }
    if (!rutaContenida(dirDatos, f.path)) {
      problemas.push('la ruta ' + JSON.stringify(f.path) + ' escapa del almacen del checkpoint');
      continue;
    }
    const copia = path.join(dirDatos, f.path);
    if (!fs.existsSync(copia)) {
      problemas.push('falta la copia de ' + f.path);
      continue;
    }
    if (sha256(fs.readFileSync(copia)) !== f.sha256) {
      problemas.push('la copia de ' + f.path + ' no coincide con su sha256');
    }
  }
  return problemas.length === 0
    ? { pass: true, status: 'CHECKPOINT_VALID', problemas: [] }
    : { pass: false, status: 'CHECKPOINT_CORRUPT', problemas };
}

function restaurar(raiz, referencia, opciones) {
  const opts = opciones || {};
  const manifiesto = resolver(raiz, referencia);
  const v = verificar(raiz, manifiesto);
  if (!v.pass) {
    return { pass: false, status: v.status, problemas: v.problemas };
  }

  // Deshacer tiene que ser deshacible. Sin esta red, un /rollback equivocado seria
  // tan irreversible como el fallo que venia a corregir.
  const previo = opts.safety === false ? null : crear(raiz, 'pre-restore-' + manifiesto.checkpointId.slice(0, 19), 'safety');

  const dirDatos = path.join(dirCheckpoints(raiz), manifiesto.checkpointId, 'files');
  const restaurados = [];
  const intactos = [];
  for (const f of manifiesto.files) {
    const destino = path.join(raiz, f.path);
    const contenido = fs.readFileSync(path.join(dirDatos, f.path));
    if (fs.existsSync(destino) && sha256(fs.readFileSync(destino)) === f.sha256) {
      intactos.push(f.path);
      continue;
    }
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, contenido);
    restaurados.push(f.path);
  }

  const enManifiesto = new Set(manifiesto.files.map((f) => f.path));
  const posteriores = recorrer(raiz).filter((rel) => !enManifiesto.has(rel));
  const eliminados = [];
  if (opts.prune) {
    for (const rel of posteriores) {
      try {
        fs.unlinkSync(path.join(raiz, rel));
        eliminados.push(rel);
      } catch (_) {
        // Un fichero bloqueado por otro proceso no justifica abortar una restauracion
        // ya escrita; se informa como no eliminado y decide la persona.
      }
    }
  }

  return {
    pass: true,
    status: 'ROLLBACK_APPLIED',
    checkpointId: manifiesto.checkpointId,
    digest: manifiesto.digest,
    restaurados,
    intactos,
    posteriores: opts.prune ? [] : posteriores,
    eliminados,
    safetyCheckpoint: previo ? previo.checkpointId : null,
  };
}

const USO = [
  'Uso:',
  '  node tools/checkpoint.js create [etiqueta]     sella el estado actual del arbol',
  '  node tools/checkpoint.js list                  lista los puntos de control',
  '  node tools/checkpoint.js verify [id|latest]    comprueba integridad sin restaurar',
  '  node tools/checkpoint.js restore [id|latest]   restaura (crea antes una red de seguridad)',
  '',
  'Opciones:',
  '  --prune            en restore, elimina tambien lo creado despues del checkpoint',
  '  --target <dir>     directorio a gobernar (por defecto, el actual)',
  '',
  'Se conservan los ' + MAX_CHECKPOINTS + ' puntos mas recientes de cada tipo; los anteriores se retiran.',
  '',
  'Se excluyen .git, node_modules, .axion, scratch y directorios de build.',
  'Codigos de salida: 0 correcto, 1 fallo o integridad rota, 2 uso incorrecto.',
].join('\n');

function main() {
  const args = process.argv.slice(2);
  const accion = args[0];
  if (!accion || accion === '--help' || accion === '-h') {
    console.log(USO);
    process.exit(2);
  }

  let raiz = process.cwd();
  const iTarget = args.indexOf('--target');
  if (iTarget !== -1 && args[iTarget + 1]) raiz = path.resolve(args[iTarget + 1]);

  const prune = args.includes('--prune');
  const posicional = [];
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--target') { i += 1; continue; }
    if (args[i].startsWith('--')) continue;
    posicional.push(args[i]);
  }

  if (accion === 'create') {
    const m = crear(raiz, posicional[0]);
    console.log('OK Punto de control sellado.');
    console.log('  Id:       ' + m.checkpointId);
    console.log('  Digest:   ' + m.digest);
    console.log('  Ficheros: ' + m.fileCount + ' (' + (m.totalBytes / 1024).toFixed(1) + ' KiB)');
    if (m.skipped.length > 0) console.log('  Omitidos: ' + m.skipped.length + ' (por tamano o ilegibles)');
    if (m.purged && m.purged.length > 0) console.log('  Retirados por antiguedad: ' + m.purged.length + ' (techo: ' + MAX_CHECKPOINTS + ')');
    console.log('  Reversion: node tools/checkpoint.js restore ' + m.checkpointId);
    process.exit(0);
  }

  if (accion === 'list') {
    const todos = listar(raiz);
    if (todos.length === 0) {
      console.log('No hay puntos de control. Crea uno con: node tools/checkpoint.js create <etiqueta>');
      process.exit(0);
    }
    todos.forEach((m) => console.log('  ' + (m.kind === 'safety' ? '[red]  ' : '[user] ') + m.checkpointId + '  ' + String(m.fileCount).padStart(5) + ' ficheros  ' + String(m.digest || '').slice(0, 16)));
    process.exit(0);
  }

  if (accion === 'verify') {
    const m = resolver(raiz, posicional[0]);
    const v = verificar(raiz, m);
    console.log(JSON.stringify({ status: v.status, checkpointId: m ? m.checkpointId : null, problemas: v.problemas }, null, 2));
    process.exit(v.pass ? 0 : 1);
  }

  if (accion === 'restore') {
    const r = restaurar(raiz, posicional[0], { prune });
    if (!r.pass) {
      console.error('FALLO Reversion NO aplicada (' + r.status + ').');
      r.problemas.forEach((p) => console.error('  - ' + p));
      console.error('  No se ha tocado ningun fichero: una restauracion parcial es peor que ninguna.');
      process.exit(1);
    }
    console.log('OK Reversion completada.');
    console.log('  Checkpoint:  ' + r.checkpointId);
    console.log('  Restaurados: ' + r.restaurados.length + ' | Ya identicos: ' + r.intactos.length);
    r.restaurados.slice(0, 20).forEach((f) => console.log('    - ' + f));
    if (r.restaurados.length > 20) console.log('    ... y ' + (r.restaurados.length - 20) + ' mas');
    if (r.posteriores.length > 0) {
      console.log('  Creados despues del checkpoint y NO eliminados: ' + r.posteriores.length + ' (usa --prune para borrarlos)');
    }
    if (r.eliminados.length > 0) console.log('  Eliminados por --prune: ' + r.eliminados.length);
    if (r.safetyCheckpoint) console.log('  Red de seguridad previa: ' + r.safetyCheckpoint);
    process.exit(0);
  }

  console.log('Accion desconocida: ' + accion + '\n');
  console.log(USO);
  process.exit(2);
}

if (require.main === module) main();

module.exports = { CONTRATO, MAX_CHECKPOINTS, crear, listar, resolver, verificar, restaurar, rutaContenida, USO };
