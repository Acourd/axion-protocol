'use strict';

/**
 * AX-NC-0001, vector de alias de principal — Fase H, regla R4.
 *
 * El mismo humano dado de alta dos veces con cadenas distintas ("alice" y "alice ",
 * o "alice" con una a cirilica U+0430) superaba la separacion de roles, porque las
 * tres primitivas comparaban identidades con igualdad exacta de cadenas.
 *
 * Esta suite fija el comportamiento en los dos niveles donde se corrigio:
 *   - el registro de autoridades rechaza dos actores que designan al mismo sujeto;
 *   - las comparaciones de independencia se hacen sobre identidad canonica.
 *
 * Y comprueba lo contrario, que importa igual: dos personas realmente distintas
 * siguen pudiendo trabajar juntas. Un control que bloquea todo no protege nada.
 */

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const {
  computePublicKeyId,
  loadAuthorityRegistry,
} = require('../../tools/approval_ed25519.js');
const {
  CHECK_STATUS,
  createSignedCheck,
  verifyIndependentCheck,
} = require('../../tools/check_ed25519.js');
const os = require('os');
const { hashCanonical } = require('../../tools/canonical_json.js');
const { canonicalActorId, mismoActor } = require('../../tools/identity_canonical.js');

const ROOT = path.join(__dirname, '..', '..');
const DIR = path.join(os.tmpdir(), `axion_alias_test_${process.pid}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`);
fs.mkdirSync(DIR, { recursive: true });

const CIRILICA_A = 'а';
const ANCHO_CERO = '​';

let n = 0;
const ok = (d) => console.log(`  [${++n}] PASS: ${d}`);

console.log('=== AX-NC-0001 - alias de principal ===\n');

// --- 1. Forma canonica ------------------------------------------------------

assert.strictEqual(mismoActor('alice', 'alice '), true, 'un espacio final no crea un sujeto nuevo');
assert.strictEqual(mismoActor('alice', 'ALICE'), true, 'las mayusculas no crean un sujeto nuevo');
assert.strictEqual(mismoActor('a  b', 'a b'), true, 'los espacios internos se colapsan');
assert.strictEqual(mismoActor('alice', `${CIRILICA_A}lice`), true, 'el homoglifo cirilico es el mismo sujeto');
assert.strictEqual(mismoActor('alice', 'bob'), false, 'dos personas distintas siguen siendo distintas');
ok('la forma canonica detecta alias y respeta a los actores distintos');

assert.strictEqual(canonicalActorId(`${CIRILICA_A}lice`).ok, false, 'mezclar cirilico y latino es ambiguo');
assert.strictEqual(canonicalActorId(`ali${ANCHO_CERO}ce`).ok, false, 'un espacio de ancho cero se rechaza');
assert.strictEqual(canonicalActorId('   ').ok, false, 'solo espacios no es un identificador');
assert.strictEqual(canonicalActorId('алиса').ok, true,
  'un identificador enteramente cirilico es legitimo: se prohibe la mezcla, no el alfabeto');
ok('los identificadores ambiguos se rechazan sin prohibir alfabetos enteros');

// --- 2. El registro rechaza el alta duplicada del mismo sujeto (R4) ---------

function escribirRegistro(nombre, actores) {
  const ruta = path.join(DIR, `${nombre}.json`);
  fs.writeFileSync(ruta, JSON.stringify({
    version: '1.0.0',
    authorities: actores.map(({ actorId, keys, roles }) => ({
      actorId,
      keyId: computePublicKeyId(keys.publicKey),
      publicKeyPem: keys.publicKey.export({ type: 'spki', format: 'pem' }),
      roles,
      status: 'TRUSTED',
      expiresAt: '2099-01-01T00:00:00.000Z',
    })),
  }), 'utf8');
  return ruta;
}

const kAprobador = crypto.generateKeyPairSync('ed25519');
const kAuditor = crypto.generateKeyPairSync('ed25519');

{
  const ruta = escribirRegistro('alias-espacio', [
    { actorId: 'alice', keys: kAprobador, roles: ['HUMAN_AUTHORITY'] },
    { actorId: 'alice ', keys: kAuditor, roles: ['INDEPENDENT_AUDITOR'] },
  ]);
  assert.strictEqual(loadAuthorityRegistry(ruta).ok, false,
    'un registro con el mismo humano dos veces no puede cargarse');
  ok('el registro rechaza "alice" y "alice " como dos altas distintas');
}

{
  const ruta = escribirRegistro('alias-homoglifo', [
    { actorId: 'alice', keys: kAprobador, roles: ['HUMAN_AUTHORITY'] },
    { actorId: `${CIRILICA_A}lice`, keys: kAuditor, roles: ['INDEPENDENT_AUDITOR'] },
  ]);
  assert.strictEqual(loadAuthorityRegistry(ruta).ok, false,
    'el homoglifo cirilico no puede colarse como segundo principal');
  ok('el registro rechaza el homoglifo cirilico');
}

const registroLimpio = escribirRegistro('limpio', [
  { actorId: 'alice', keys: kAprobador, roles: ['HUMAN_AUTHORITY'] },
  { actorId: 'bob', keys: kAuditor, roles: ['INDEPENDENT_AUDITOR'] },
]);

assert.strictEqual(loadAuthorityRegistry(registroLimpio).ok, true,
  'dos personas distintas deben poder convivir en el registro');
ok('el registro sigue aceptando a dos actores legitimos');

// --- 3. La independencia se decide sobre identidad canonica ----------------

const MISION = 'AX-ALIAS-001';
const comando = { executable: 'node', args: ['--version'], cwd: ROOT, shell: false };
const aserciones = ['comprobacion de alias'];
const digestAprobacion = hashCanonical({ missionId: MISION, approvalRequired: false, risk: 'LOW' });

function firmarCheck(actorId, executorActorId) {
  return createSignedCheck({
    contractVersion: '1.0.0',
    checkId: `CHK-${MISION}`,
    missionId: MISION,
    actorId,
    keyId: computePublicKeyId(kAuditor.publicKey),
    executorActorId,
    risk: 'LOW',
    commandHash: hashCanonical(comando),
    approvalDigest: digestAprobacion,
    assertionsHash: hashCanonical(aserciones),
    result: 'PASS',
    exitCode: 0,
    evidenceHash: hashCanonical({ missionId: MISION }),
    issuedAt: '2026-08-03T11:59:00.000Z',
    expiresAt: '2026-08-03T12:30:00.000Z',
  }, kAuditor.privateKey);
}

const binding = {
  missionId: MISION,
  risk: 'LOW',
  commandHash: hashCanonical(comando),
  approvalDigest: digestAprobacion,
  assertionsHash: hashCanonical(aserciones),
};

function verificar(envelope, executorActorId, approvalActorId = '', approvalRequired = false) {
  return verifyIndependentCheck({
    envelope,
    expectedBinding: binding,
    registryPath: registroLimpio,
    executorActorId,
    approvalActorId,
    approvalRequired,
    now: new Date('2026-08-03T12:00:00.000Z'),
  });
}

{
  // El auditor "bob" y el ejecutor "bob " son el mismo humano.
  const r = verificar(firmarCheck('bob', 'bob '), 'bob ');
  assert.strictEqual(r.status, CHECK_STATUS.CHECK_NOT_INDEPENDENT,
    'auditor y ejecutor separados solo por un espacio deben bloquear');
  ok('auditor "bob" y ejecutor "bob " se detectan como el mismo sujeto');
}

{
  // Con aprobacion exigida, auditor y aprobador aliados tambien bloquean.
  const r = verificar(firmarCheck('bob', 'charlie'), 'charlie', 'BOB', true);
  assert.strictEqual(r.status, CHECK_STATUS.CHECK_NOT_INDEPENDENT,
    'auditor "bob" y aprobador "BOB" son el mismo humano');
  ok('auditor y aprobador aliados bloquean cuando se exige aprobacion');
}

{
  // Y el caso legitimo sigue pasando: sujetos realmente distintos.
  const r = verificar(firmarCheck('bob', 'charlie'), 'charlie');
  assert.strictEqual(r.status, CHECK_STATUS.CHECK_VALID,
    'actores distintos deben poder completar el flujo');
  ok('sin alias, el CHECK sigue siendo valido (no hay falso positivo)');
}

if (fs.existsSync(DIR)) {
  try { fs.rmSync(DIR, { recursive: true, force: true }); } catch (_) {}
}

console.log(`\nPASS AX-NC-0001 alias - ${n} comprobaciones`);
