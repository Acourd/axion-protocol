'use strict';

const assert = require('assert');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const {
  hashFile,
  hashString,
  createEvidenceManifest,
  createBoundEvidenceManifest
} = require('../../tools/evidence_hasher.js');
const { hashCanonical } = require('../../tools/canonical_json.js');

console.log('=== AX-F-028 Evidencia: hasheo determinista, deduplicación canónica y enlace de misión ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const readmePath = path.join(ROOT, 'README.md');
// Las rutas se derivan del cwd real en vez de fijarse a 'README.md': la suite tiene que dar
// lo mismo se lance desde la raíz o desde cualquier otro directorio.
const relativeReadme = path.relative(process.cwd(), readmePath);
const redundantReadme = './' + relativeReadme;

// --- 1. Hasheo determinista, y qué pasa cuando no hay nada que hashear ---
const hStr = hashString('test-string');
assert.strictEqual(typeof hStr, 'string');
assert.strictEqual(/^[a-f0-9]{64}$/.test(hStr), true, 'el hash de cadena debe ser un hex sha256 de 64 caracteres en minúscula');
assert.strictEqual(hStr, hStr.toLowerCase(), 'los hashes deben estar en minúscula');

// Constante conocida: si el algoritmo o la codificación cambiaran, toda la evidencia emitida
// hasta hoy dejaría de ser comparable, y una regex de formato no lo detectaría.
assert.strictEqual(hashString(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
assert.strictEqual(/^[a-f0-9]{64}$/.test(hashString('Axion Protocol — Gobernanza 🛡️ Fail-Closed')), true, 'el texto no ASCII debe hashearse sin romperse');

const hFile = hashFile(readmePath);
assert.notStrictEqual(hFile, null);
assert.strictEqual(/^[a-f0-9]{64}$/.test(hFile), true, 'el hash de archivo debe ser un hex sha256 de 64 caracteres en minúscula');

// Ni un fichero ausente ni un directorio pueden reventar el sellado: devuelven null y el
// manifiesto lo declara. Explotar aquí dejaría la misión sin evidencia y sin explicación.
assert.strictEqual(hashFile(path.join(ROOT, 'archivo_que_no_existe_12345.xyz')), null);
assert.strictEqual(hashFile(ROOT), null, 'un directorio debe retornar null en hashFile sin explotar');
console.log('✓ Hashes SHA-256 canónicos y resiliencia ante rutas no hasheables verificados');

// --- 2. Deduplicación por equivalencia de ruta ---
// Tres formas de escribir el mismo fichero. Si no colapsan, el mismo contenido aparece tres
// veces en la evidencia y el digest del manifiesto deja de ser comparable entre máquinas.
const manifest = createEvidenceManifest({
  taskId: 'AX-TASK-DEDUP-001',
  subject: 'Test de deduplicación de rutas',
  files: [relativeReadme, redundantReadme, readmePath]
});

assert.strictEqual(manifest.evidence.files.length, 1, 'rutas equivalentes deben colapsar en una sola entrada canónica');
assert.strictEqual(manifest.evidence.files[0].status, 'PRESENT');
assert.strictEqual(manifest.evidence.complete, true);
console.log('✓ Deduplicación canónica de rutas equivalentes verificada');

// --- 3. Un manifiesto incompleto lo declara, y en orden ---
const manifestParcial = createEvidenceManifest({
  taskId: 'AX-TASK-041',
  subject: 'Test Manifiesto',
  files: [
    path.join(ROOT, 'package.json'),
    path.join(ROOT, 'package.json'), // duplicado literal
    path.join(ROOT, 'fichero_inexistente_123.tmp') // ausente
  ],
  logs: ['Paso 1 completado', 'Paso 2 completado']
});

assert.strictEqual(manifestParcial.evidence.files.length, 2, 'debe deduplicar rutas idénticas');
assert.strictEqual(manifestParcial.evidence.files[0].status, 'PRESENT');
assert.strictEqual(manifestParcial.evidence.files[1].status, 'MISSING');
assert.strictEqual(manifestParcial.status, 'INCOMPLETE');
assert.strictEqual(manifestParcial.evidence.complete, false);
console.log('✓ Deduplicación y reporte honesto de completitud verificados');

// --- 4. Entradas mixtas: presente, ausente y lo que no es un fichero ---
// Un directorio pasado como evidencia no es un fallo del llamador que haya que ocultar: se
// declara NOT_A_FILE, que es distinto de MISSING y quien audite necesita distinguirlos.
const manifestMixto = createEvidenceManifest({
  taskId: 'AX-TASK-EDGE-01',
  subject: 'Test de casos límite',
  files: [readmePath, path.join(ROOT, 'non_existent_file.tmp'), path.join(ROOT, 'tools'), readmePath]
});

assert.strictEqual(manifestMixto.status, 'INCOMPLETE');
assert.strictEqual(manifestMixto.evidence.complete, false);
assert.strictEqual(manifestMixto.evidence.files.length, 3, 'la ruta duplicada debe ser deduplicada');

const statuses = manifestMixto.evidence.files.map((f) => f.status);
assert.strictEqual(statuses.includes('PRESENT'), true);
assert.strictEqual(statuses.includes('MISSING'), true);
assert.strictEqual(statuses.includes('NOT_A_FILE'), true);

// El digest se deriva del contenido con hashCanonical, no se declara: el mismo manifiesto
// con las claves en otro orden tiene que dar el mismo hash o la evidencia no es comparable.
assert.strictEqual(manifestMixto.hash, hashCanonical(manifestMixto.evidence));
console.log('✓ Manejo estricto de entradas mixtas y derivación canónica del digest verificados');

// --- 5. Enlace criptográfico de misión ---
const digest = () => crypto.randomBytes(32).toString('hex');
const bindingValido = {
  missionId: 'MISSION-999',
  risk: 'HIGH',
  status: 'VERIFIED',
  command: { executable: 'node', args: ['index.js'] },
  scope: ['src/'],
  approval: { digest: digest() },
  rollback: { digest: digest() },
  check: { digest: digest() },
  evidence: { digest: digest() }
};

const boundManifest = createBoundEvidenceManifest({
  taskId: 'AX-TASK-BOUND',
  files: [readmePath],
  binding: bindingValido
});

assert.strictEqual(typeof boundManifest.binding_hash, 'string');
assert.strictEqual(boundManifest.binding_hash.length, 64);
assert.strictEqual(boundManifest.binding_hash, hashCanonical(bindingValido), 'el binding_hash debe derivarse del binding, no inventarse');
assert.strictEqual(boundManifest.evidence.binding.missionId, 'MISSION-999');
assert.strictEqual(Object.isFrozen(boundManifest), true, 'un manifiesto sellado no puede seguir siendo mutable');
assert.strictEqual(boundManifest.status, 'COMPLETE');
console.log('✓ Enlace criptográfico de misión y sellado inmutable verificados');

// --- 6. Rechazo fail-closed de bindings que no atan nada ---
// Un binding a medias es peor que ninguno: produce un manifiesto con aspecto de evidencia
// firme que no ata la misión a nada comprobable.
assert.throws(() => createBoundEvidenceManifest({ binding: null }), TypeError);
assert.throws(() => createBoundEvidenceManifest({ binding: { missionId: 'm1' } }), TypeError);
assert.throws(() => createBoundEvidenceManifest({
  binding: {
    missionId: 'm1',
    risk: 'LOW',
    status: 'VERIFIED',
    command: { args: [] },
    scope: [],
    approval: { digest: 'invalido' }, // digest que no es hex de 64
    rollback: { digest: digest() },
    check: { digest: digest() },
    evidence: { digest: digest() }
  }
}), TypeError);
assert.throws(() => {
  createBoundEvidenceManifest({
    taskId: 'AX-TASK-FAIL',
    files: [],
    binding: { missionId: 'INCOMPLETO' }
  });
}, /El binding de evidencia es incompleto o inválido/);
console.log('✓ Rechazo fail-closed de bindings incompletos o con digests inválidos verificado');

// --- 7. Invocación vía CLI ---
const rCli = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'evidence_hasher.js'), readmePath]);
assert.strictEqual(rCli.status, 0, 'CLI de evidence_hasher debe salir con 0');
const parsed = JSON.parse(rCli.stdout.toString('utf8'));
assert.strictEqual(parsed.evidence_type, 'MANIFEST');
console.log('✓ Invocación de CLI y salida JSON verificada');

console.log('\nPASS AX-F-028 — Evidencia: hasheo, deduplicación canónica y enlace de misión verificados al 100%.\n');
