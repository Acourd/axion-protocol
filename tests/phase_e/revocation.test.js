'use strict';

/**
 * Revocacion y compromiso de claves — Fase H, regla R7.
 *
 * R7 distingue dos formas de retirar una clave, y la diferencia no es cosmetica:
 *
 *   REVOKED     — baja ordenada. La clave se retira y deja de habilitar ejecuciones.
 *   COMPROMISED — la clave privada se fue de las manos. Ademas de bloquear, obliga a
 *                 revisar a mano todo lo que esa clave ya firmo.
 *
 * Para el gating ambos bloquean igual, y por eso resulta tentador tratarlos como uno
 * solo. Pero mezclarlos borraria la senal justo cuando mas importa: quien lea el log de
 * un bloqueo necesita saber si esta ante un tramite o ante un incidente.
 *
 * Esta suite fija que ambos bloquean, que se distinguen en el veredicto, y que una
 * autoridad sana sigue funcionando.
 */

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const {
  APPROVAL_STATUS,
  REGISTRY_STATES,
  computePublicKeyId,
} = require('../../tools/approval_ed25519.js');
const {
  CHECK_STATUS,
  createSignedCheck,
  verifyIndependentCheck,
} = require('../../tools/check_ed25519.js');
const { hashCanonical } = require('../../tools/canonical_json.js');

const ROOT = path.join(__dirname, '..', '..');
const DIR = path.join(ROOT, '.phase-e', 'test-runtime', `revoc-${process.pid}-${Date.now()}`);
fs.mkdirSync(DIR, { recursive: true });

let n = 0;
const ok = (d) => console.log(`  [${++n}] PASS: ${d}`);

console.log('=== Revocacion y compromiso de claves (R7) ===\n');

// --- 1. El registro admite COMPROMISED como estado propio -------------------
assert.ok(REGISTRY_STATES.has('COMPROMISED'),
  'COMPROMISED debe ser un estado de primera clase, no un REVOKED disfrazado');
assert.ok(REGISTRY_STATES.has('REVOKED'), 'REVOKED sigue existiendo');
assert.ok(APPROVAL_STATUS.APPROVAL_COMPROMISED_KEY, 'la aprobacion distingue el compromiso');
assert.ok(CHECK_STATUS.CHECK_COMPROMISED_KEY, 'el CHECK distingue el compromiso');
ok('REVOKED y COMPROMISED son estados distintos en todo el contrato');

// --- Fixture ----------------------------------------------------------------
const kAuditor = crypto.generateKeyPairSync('ed25519');
const MISION = 'AX-REVOC-001';
const comando = { executable: 'node', args: ['--version'], cwd: ROOT, shell: false };
const aserciones = ['comprobacion de revocacion'];
const digestAprobacion = hashCanonical({ missionId: MISION, approvalRequired: false, risk: 'LOW' });

function registroCon(estado) {
  const ruta = path.join(DIR, `registro-${estado.toLowerCase()}.json`);
  fs.writeFileSync(ruta, JSON.stringify({
    version: '1.0.0',
    authorities: [{
      actorId: 'auditor-uno',
      keyId: computePublicKeyId(kAuditor.publicKey),
      publicKeyPem: kAuditor.publicKey.export({ type: 'spki', format: 'pem' }),
      roles: ['INDEPENDENT_AUDITOR'],
      status: estado,
      expiresAt: '2099-01-01T00:00:00.000Z',
    }],
  }), 'utf8');
  return ruta;
}

const sobre = createSignedCheck({
  contractVersion: '1.0.0',
  checkId: `CHK-${MISION}`,
  missionId: MISION,
  actorId: 'auditor-uno',
  keyId: computePublicKeyId(kAuditor.publicKey),
  executorActorId: 'ejecutor-uno',
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

const verificar = (registryPath) => verifyIndependentCheck({
  envelope: sobre,
  expectedBinding: {
    missionId: MISION,
    risk: 'LOW',
    commandHash: hashCanonical(comando),
    approvalDigest: digestAprobacion,
    assertionsHash: hashCanonical(aserciones),
  },
  registryPath,
  executorActorId: 'ejecutor-uno',
  approvalActorId: '',
  approvalRequired: false,
  now: new Date('2026-08-03T12:00:00.000Z'),
});

// --- 2. Una clave comprometida bloquea, y se nota que es un compromiso ------
{
  const r = verificar(registroCon('COMPROMISED'));
  assert.strictEqual(r.status, CHECK_STATUS.CHECK_COMPROMISED_KEY,
    'una clave comprometida debe bloquear con su propio estado, no con el generico');
  ok('una clave COMPROMISED bloquea y se identifica como tal');
}

// --- 3. Una clave revocada bloquea con su estado ----------------------------
{
  const r = verificar(registroCon('REVOKED'));
  assert.strictEqual(r.status, CHECK_STATUS.CHECK_REVOKED_AUDITOR,
    'una baja ordenada debe distinguirse de un incidente');
  ok('una clave REVOKED bloquea con su estado propio');
}

// --- 4. Y una autoridad sana sigue funcionando ------------------------------
// Sin esto, un bloqueo indiscriminado pasaria las dos comprobaciones anteriores.
{
  const r = verificar(registroCon('TRUSTED'));
  assert.strictEqual(r.status, CHECK_STATUS.CHECK_VALID,
    'una autoridad de confianza debe seguir validando');
  ok('una autoridad TRUSTED sigue validando (no hay bloqueo indiscriminado)');
}

// --- 5. Los estados son terminales para el gating ---------------------------
// El artefacto se firmo antes de la revocacion y aun asi no habilita nada: la
// comprobacion mira el estado ahora, no el de cuando se firmo.
{
  const r = verificar(registroCon('COMPROMISED'));
  assert.notStrictEqual(r.status, CHECK_STATUS.CHECK_VALID,
    'un artefacto firmado antes del compromiso no puede habilitar una ejecucion nueva');
  ok('la revocacion es prospectiva: firmar antes no da derecho a ejecutar despues');
}

console.log(`\nPASS revocacion R7 - ${n} comprobaciones`);
