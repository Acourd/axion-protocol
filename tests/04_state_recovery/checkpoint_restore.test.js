/**
 * Phase E — Motor de puntos de control y reversión determinista.
 *
 * Es el control de gobernanza que /rollback prometía y no existía: hasta ahora solo se
 * validaba la *forma* de un plan de reversión (rollback_plan.js), nunca la capacidad de
 * devolver un archivo a su contenido anterior.
 *
 * Lo que se exige aquí no es que restaure, sino que se niegue a restaurar mal:
 * un manifiesto alterado o una copia corrupta tienen que dejar el árbol intacto.
 */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('../../tools/checkpoint.js');

let n = 0;
const ok = (cond, msg) => { assert.strictEqual(cond, true, msg); n += 1; };

function arenal() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-cp-'));
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'a.txt'), 'contenido-original-a');
  fs.writeFileSync(path.join(dir, 'b.md'), '# original b');
  return dir;
}
const leer = (d, rel) => fs.readFileSync(path.join(d, rel), 'utf8');

console.log('=== Phase E: checkpoint / restore ===\n');

// --- 1. Sellado: contenido guardado, no solo huellas ---
{
  const d = arenal();
  const m = cp.crear(d, 'inicial');
  ok(m.fileCount === 2, `esperaba 2 archivos sellados, sellé ${m.fileCount}`);
  ok(/^[a-f0-9]{64}$/.test(m.digest), 'el digest del manifiesto no es un sha256');
  ok(m.kind === 'user', 'un checkpoint creado a mano debe ser de tipo user');
  ok(cp.verificar(d, m).pass, 'un checkpoint recién creado debe verificar');
  fs.rmSync(d, { recursive: true, force: true });
  console.log('✓ sella contenido verificable');
}

// --- 2. Restaura modificaciones y recupera borrados ---
{
  const d = arenal();
  cp.crear(d, 'antes');
  fs.writeFileSync(path.join(d, 'src', 'a.txt'), 'CORROMPIDO');
  fs.unlinkSync(path.join(d, 'b.md'));
  fs.writeFileSync(path.join(d, 'nuevo.txt'), 'creado despues');

  const r = cp.restaurar(d, 'latest');
  ok(r.pass, `la reversión debió aplicarse: ${r.status}`);
  ok(leer(d, 'src/a.txt') === 'contenido-original-a', 'no restauró el archivo modificado');
  ok(leer(d, 'b.md') === '# original b', 'no recuperó el archivo borrado');
  // No borrar lo que nadie pidió borrar: se informa y se conserva.
  ok(fs.existsSync(path.join(d, 'nuevo.txt')), 'eliminó un archivo posterior sin que se pidiera --prune');
  ok(r.posteriores.includes('nuevo.txt'), 'no informó del archivo creado después del checkpoint');
  ok(typeof r.safetyCheckpoint === 'string', 'no selló una red de seguridad antes de restaurar');
  fs.rmSync(d, { recursive: true, force: true });
  console.log('✓ restaura modificados, recupera borrados y conserva lo posterior');
}

// --- 3. --prune sí elimina, pero solo cuando se pide ---
{
  const d = arenal();
  cp.crear(d, 'antes');
  fs.writeFileSync(path.join(d, 'sobra.txt'), 'x');
  const r = cp.restaurar(d, 'latest', { prune: true });
  ok(r.pass && !fs.existsSync(path.join(d, 'sobra.txt')), '--prune no eliminó el archivo posterior');
  fs.rmSync(d, { recursive: true, force: true });
  console.log('✓ --prune elimina lo posterior solo bajo petición explícita');
}

// --- 4. Manifiesto alterado: no se restaura NADA ---
{
  const d = arenal();
  const m = cp.crear(d, 'sellado');
  fs.writeFileSync(path.join(d, 'src', 'a.txt'), 'estado-de-trabajo');

  const rutaMan = path.join(d, '.axion', 'checkpoints', m.checkpointId, 'manifest.json');
  const alterado = JSON.parse(fs.readFileSync(rutaMan, 'utf8'));
  alterado.files[0].sha256 = '0'.repeat(64);
  fs.writeFileSync(rutaMan, JSON.stringify(alterado, null, 2));

  const r = cp.restaurar(d, m.checkpointId);
  ok(!r.pass, 'restauró desde un manifiesto alterado');
  ok(r.status === 'CHECKPOINT_DIGEST_MISMATCH', `esperaba CHECKPOINT_DIGEST_MISMATCH, obtuve ${r.status}`);
  ok(leer(d, 'src/a.txt') === 'estado-de-trabajo', 'tocó el árbol pese a rechazar la reversión');
  fs.rmSync(d, { recursive: true, force: true });
  console.log('✓ manifiesto alterado: rechaza y deja el árbol intacto');
}

// --- 5. Copia corrupta: tampoco se restaura a medias ---
{
  const d = arenal();
  const m = cp.crear(d, 'sellado');
  const copia = path.join(d, '.axion', 'checkpoints', m.checkpointId, 'files', 'b.md');
  fs.writeFileSync(copia, 'copia manipulada');
  fs.writeFileSync(path.join(d, 'src', 'a.txt'), 'trabajo-en-curso');

  const r = cp.restaurar(d, m.checkpointId);
  ok(!r.pass && r.status === 'CHECKPOINT_CORRUPT', `esperaba CHECKPOINT_CORRUPT, obtuve ${r.status}`);
  // Este es el invariante que importa: a.txt era restaurable, pero como b.md no lo era,
  // no se restaura ninguno. Un árbol medio revertido es un estado que nadie ha revisado.
  ok(leer(d, 'src/a.txt') === 'trabajo-en-curso', 'restauró parcialmente pese a la corrupción');
  fs.rmSync(d, { recursive: true, force: true });
  console.log('✓ copia corrupta: no restaura parcialmente');
}

// --- 6. Sin checkpoint no hay reversión silenciosa ---
{
  const d = arenal();
  const r = cp.restaurar(d, 'latest');
  ok(!r.pass && r.status === 'CHECKPOINT_MISSING', `esperaba CHECKPOINT_MISSING, obtuve ${r.status}`);
  fs.rmSync(d, { recursive: true, force: true });
  console.log('✓ sin punto de control informa CHECKPOINT_MISSING en vez de fingir éxito');
}

// --- 7. Las redes automáticas quedan fuera de "latest" ---
{
  const d = arenal();
  cp.crear(d, 'bueno');
  fs.writeFileSync(path.join(d, 'src', 'a.txt'), 'malo');
  cp.restaurar(d, 'latest');
  // Si la red de seguridad contara como "latest", esta segunda reversión devolvería
  // justo el estado que se acababa de deshacer.
  cp.restaurar(d, 'latest');
  ok(leer(d, 'src/a.txt') === 'contenido-original-a',
    'un segundo restore latest reaplicó el estado que se había deshecho');
  fs.rmSync(d, { recursive: true, force: true });
  console.log('✓ restore latest es idempotente: ignora las redes automáticas');
}

// --- 8. Se excluye lo que no debe viajar en un snapshot ---
{
  const d = arenal();
  fs.mkdirSync(path.join(d, 'node_modules', 'x'), { recursive: true });
  fs.writeFileSync(path.join(d, 'node_modules', 'x', 'p.js'), 'no debe sellarse');
  fs.mkdirSync(path.join(d, '.git'), { recursive: true });
  fs.writeFileSync(path.join(d, '.git', 'HEAD'), 'ref: refs/heads/main');
  const m = cp.crear(d, 'con-basura');
  const rutas = m.files.map((f) => f.path);
  ok(!rutas.some((p) => p.startsWith('node_modules/')), 'selló node_modules');
  ok(!rutas.some((p) => p.startsWith('.git/')), 'selló .git');
  fs.rmSync(d, { recursive: true, force: true });
  console.log('✓ excluye .git y node_modules del snapshot');
}

// --- 9. Una ruta del manifiesto no puede escapar del árbol ---
// Encontrado atacando el motor: un manifiesto con `../` convertía la reversión en
// escritura arbitraria fuera del proyecto. El digest no lo impedía, porque nadie firma el
// manifiesto: quien lo edita también recalcula el digest. El agravante es que la red de
// seguridad previa se sella desde el árbol de trabajo y NO contiene el fichero de fuera,
// así que lo que se pisa ahí se pierde sin vuelta.
{
  const crypto = require('crypto');
  const d = arenal();
  const fuera = path.join(d, '..', `victima-${path.basename(d)}.txt`);
  fs.writeFileSync(fuera, 'contenido original de fuera');

  const m = cp.crear(d, 'base');
  const dirCp = path.join(d, '.axion', 'checkpoints', m.checkpointId);
  const carga = Buffer.from('sobrescrito desde el manifiesto');
  const alterado = JSON.parse(fs.readFileSync(path.join(dirCp, 'manifest.json'), 'utf8'));
  alterado.files = [{
    path: `../${path.basename(fuera)}`,
    sha256: crypto.createHash('sha256').update(carga).digest('hex'),
    size: carga.length,
  }];
  // El atacante controla el manifiesto Y su digest: por eso el digest solo no basta.
  alterado.digest = crypto.createHash('sha256').update(JSON.stringify(alterado.files)).digest('hex');
  fs.writeFileSync(path.join(dirCp, 'manifest.json'), JSON.stringify(alterado, null, 2));
  fs.writeFileSync(path.join(dirCp, 'files', path.basename(fuera)), carga);

  const r = cp.restaurar(d, m.checkpointId);
  ok(!r.pass, 'una ruta que escapa de la raíz no puede restaurarse');
  ok(r.problemas.some((p) => /escapa de la raiz/.test(p)), 'debe decir cuál es la ruta culpable');
  ok(fs.readFileSync(fuera, 'utf8') === 'contenido original de fuera',
    'el fichero de fuera del proyecto no puede haberse tocado');

  fs.rmSync(fuera, { force: true });
  fs.rmSync(d, { recursive: true, force: true });
  console.log('✓ rechaza rutas que escapan del árbol y no toca nada fuera');
}

// --- 10. Tampoco por ruta absoluta ---
{
  const crypto = require('crypto');
  const d = arenal();
  const m = cp.crear(d, 'base');
  const rutaMan = path.join(d, '.axion', 'checkpoints', m.checkpointId, 'manifest.json');
  const alterado = JSON.parse(fs.readFileSync(rutaMan, 'utf8'));
  alterado.files = [{
    path: process.platform === 'win32' ? 'C:/Windows/axion.txt' : '/tmp/axion.txt',
    sha256: 'a'.repeat(64),
    size: 1,
  }];
  alterado.digest = crypto.createHash('sha256').update(JSON.stringify(alterado.files)).digest('hex');
  fs.writeFileSync(rutaMan, JSON.stringify(alterado, null, 2));

  const r = cp.restaurar(d, m.checkpointId);
  ok(!r.pass && r.problemas.some((p) => /escapa/.test(p)), 'una ruta absoluta debe rechazarse igual');
  fs.rmSync(d, { recursive: true, force: true });
  console.log('✓ una ruta absoluta tampoco pasa');
}

console.log(`\n=== Phase E checkpoint/restore PASS (${n} comprobaciones) ===`);
