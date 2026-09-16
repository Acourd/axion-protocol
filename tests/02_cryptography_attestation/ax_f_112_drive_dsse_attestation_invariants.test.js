'use strict';

/**
 * Axion Protocol — Invariantes de Atestación in-toto Statement v1 y Sobre DSSE Ed25519 para /drive.
 *
 * Valida de forma estricta (contrato evidence-bound P0-C):
 * 1. Creación/validación explícita de par de claves asimétricas Ed25519 (sin rotación silenciosa).
 * 2. Construcción canónica del predicado in-toto v1 vinculado al Merkle Root del repositorio.
 * 3. Sin evidencia ejecutada, la atestación declara UNVERIFIED y no afirma éxito.
 * 4. Las cifras del llamador quedan marcadas como claims no verificados.
 * 5. Verificación criptográfica positiva (PASS) con firma válida.
 * 6. Detección inmediata y rechazo (FAIL) ante adulteración de payload o firma.
 * 7. Integración transparente con DriveEngine.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const DriveDsseAttester = require('../../tools/drive_dsse_attester.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-112 Invariantes de Atestación in-toto DSSE Ed25519 para /drive ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const attester = new DriveDsseAttester(ROOT);

// 1. Validar par de claves Ed25519 (creación explícita si es la primera vez)
const keyPair = attester.ensureKeyPair();
assert.ok(keyPair.publicKeyPem.includes('BEGIN PUBLIC KEY'), 'Debe existir clave pública PEM');
assert.ok(keyPair.privateKeyPem.includes('BEGIN PRIVATE KEY'), 'Debe existir clave privada PEM');
assert.ok(keyPair.keyId && keyPair.keyId.length === 16, 'Debe derivar un keyId de 16 hex');
console.log('✓ Par de claves asimétricas Ed25519 cargado/creado explícitamente');

// 2. Emitir atestación de prueba sin evidencia: debe quedar UNVERIFIED
const attestRes = attester.attestSession({
  missionId: 'MISSION_INVARIANTS_TEST',
  title: 'Validación de Atestación Criptográfica',
  suitesPassed: 128,
  chaosVectorsBlocked: 5000,
  converged: true,
  iterations: 1
});

assert.ok(attestRes.attestationPath, 'Debe retornar ruta de archivo de atestación');
assert.ok(fs.existsSync(attestRes.attestationPath), 'El archivo .dsse.json debe existir en disco');
assert.ok(attestRes.merkleRoot && attestRes.merkleRoot.length === 64, 'Debe enlazar el Merkle Root');
assert.strictEqual(attestRes.verificationStatus, 'UNVERIFIED', 'Sin evidencia la atestación no puede declararse verificada');
console.log(`✓ Sobre DSSE in-toto v1 emitido y sellado en: ${path.basename(attestRes.attestationPath)}`);

// 3. Validar verificación positiva de firma + honestidad del predicado
const verifyValid = attester.verifyAttestation(attestRes.dsseEnvelope);
assert.strictEqual(verifyValid.valid, true, 'La verificación de firma DSSE debe ser exitosa (PASS)');
assert.strictEqual(verifyValid.statement._type, 'https://in-toto.io/Statement/v1');
assert.strictEqual(verifyValid.statement.predicate.mission.missionId, 'MISSION_INVARIANTS_TEST');
assert.strictEqual(verifyValid.statement.predicate.verification.status, 'UNVERIFIED');
assert.strictEqual(verifyValid.statement.predicate.mission.converged, null, 'converged no puede afirmarse sin evidencia');
assert.strictEqual(verifyValid.statement.predicate.governance.suitesPassed, null, 'suitesPassed no puede fijarse sin evidencia');
assert.strictEqual(verifyValid.statement.predicate.governance.vibeGuardStrictClean, null, 'vibeGuardStrictClean no puede fijarse sin evidencia');
assert.strictEqual(verifyValid.statement.predicate.unverifiedClaims.values.suitesPassed, 128, 'La cifra del llamador queda como claim no verificado');
console.log('✓ Verificación matemática de firma Ed25519 DSSE exitosa y predicado UNVERIFIED honesto');

// 4. Validar detección de adulteración (Tampering)
const tamperedEnvelope = JSON.parse(JSON.stringify(attestRes.dsseEnvelope));
const decodedPayload = JSON.parse(Buffer.from(tamperedEnvelope.payload, 'base64').toString('utf8'));
decodedPayload.predicate.mission.title = 'Título Adulterado';
tamperedEnvelope.payload = Buffer.from(JSON.stringify(decodedPayload)).toString('base64');

const verifyTampered = attester.verifyAttestation(tamperedEnvelope);
assert.strictEqual(verifyTampered.valid, false, 'La verificación debe fallar ante carga adulterada');
console.log('✓ Detección de adulteración validada: Carga alterada rechazada categóricamente');

// 5. Validar integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const driveAttest = driveEngine.certifyDriveSession({
  missionId: 'MISSION_DRIVE_INTEGRATION',
  title: 'Integración DriveEngine - DSSE',
  suitesPassed: 128
});

assert.ok(driveAttest.attestationPath, 'DriveEngine debe certificar la sesión vía DSSE');
assert.strictEqual(driveAttest.verificationStatus, 'UNVERIFIED');
console.log('✓ Integración DriveEngine.certifyDriveSession() verificada');

console.log('\nPASS AX-F-112 — Invariantes de atestación criptográfica in-toto DSSE verificados al 100%.');
