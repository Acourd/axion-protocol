'use strict';

/**
 * Axion Protocol — Invariantes de Caché de Estado Merkle y Fast-Forward (evidencia firmada y ejecutada).
 *
 * 1. Cálculo determinista del Árbol de Merkle sobre el código fuente.
 * 2. Cold Cache -> Sealed Cache -> Fast-Forward.
 * 3. Cada fase exige ejecución observada, artefacto tipado, productor autorizado,
 *    entrada de ledger firmada y verificación con clave pública.
 * 4. Cualquier mutación invalida el Fast-Forward.
 * 5. Integración transparente con DriveEngine.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const MerkleCacheEngine = require('../../tools/merkle_cache_fast_forward.js');
const { crearSandbox } = require('../../tools/test_sandbox.js');
const PhaseEvidence = require('../../tools/phase_evidence.js');
const AttestationKeyring = require('../../tools/attestation_keyring.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-109 Invariantes de Caché de Estado Merkle y Fast-Forward ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sandbox = crearSandbox('merkle-sandbox');
const FASE_NAMES = PhaseEvidence.PHASE_NAMES;
const PRODUCTORES = {
  testsPassed: 'tools/verify_changes.js',
  vibeGuardPassed: 'tools/vibeguard_gate.js',
  smtProofPassed: 'tools/temporal_state_verifier.js',
  chaosFuzzPassed: 'tools/agent_chaos_monkey.js'
};

fs.mkdirSync(path.join(sandbox, 'tools'), { recursive: true });
fs.mkdirSync(path.join(sandbox, 'tests'), { recursive: true });
fs.mkdirSync(path.join(sandbox, '.axion', 'state'), { recursive: true });
fs.writeFileSync(path.join(sandbox, 'tools', 'module_a.js'), 'console.log("a");');
fs.writeFileSync(path.join(sandbox, 'tests', 'test_a.test.js'), 'console.log("test");');

const keyring = new AttestationKeyring(sandbox);
keyring.generateKeyPair();
const signer = keyring.buildSigner();

function evidenciaDeFase(phase) {
  const res = PhaseEvidence.runPhaseAndRecord(sandbox, {
    phase,
    producer: PRODUCTORES[phase],
    signer,
    command: process.execPath,
    args: ['-e', 'process.exit(0)']
  });
  return res.ref;
}

const EVIDENCIA_COMPLETA = Object.fromEntries(FASE_NAMES.map((n) => [n, evidenciaDeFase(n)]));

const sandboxEngine = new MerkleCacheEngine(sandbox);

// 1. Merkle Root determinista
const merkle = sandboxEngine.computeMerkleRoot();
assert.ok(merkle.merkleRoot && merkle.merkleRoot.length === 64, 'Debe calcular un digest SHA-256 de 64 caracteres');
assert.strictEqual(merkle.filesCount, 2, 'Debe rastrear exactamente los 2 archivos gobernados creados');
console.log(`✓ Merkle Root calculado determinísticamente: ${merkle.merkleRoot.slice(0, 16)}...`);

// 2. Cold cache
assert.strictEqual(sandboxEngine.evaluateFastForward().canFastForward, false, 'Cold cache no debe autorizar Fast-Forward');
console.log('✓ Cold cache evaluado correctamente: Full cycle requerido');

// 3. Sellado con evidencia firmada y ejecutada
const sellado = sandboxEngine.sealState(merkle, EVIDENCIA_COMPLETA);
assert.strictEqual(sellado.sealed, true, `El sellado debe aceptar evidencia firmada: ${sellado.reason || ''}`);
assert.strictEqual(sandboxEngine.evaluateFastForward().canFastForward, true,
  'Warm cache con raíz idéntica y 4 fases firmadas debe autorizar Fast-Forward');
console.log('✓ Warm cache verificado: Fast-Forward autorizado con evidencia firmada y verificada con clave pública');

// 4. Mutación invalida
fs.writeFileSync(path.join(sandbox, 'tools', 'module_a.js'), 'console.log("mutated_a");');
assert.strictEqual(sandboxEngine.evaluateFastForward().canFastForward, false, 'Mutación de archivo debe invalidar el Fast-Forward');
console.log('✓ Invalidación reactiva ante mutaciones verificada');

// 5. Integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const ffCheck = driveEngine.checkMerkleFastForward();
assert.ok(typeof ffCheck.canFastForward === 'boolean', 'DriveEngine debe retornar estado de Fast-Forward');
console.log(`✓ Integración con DriveEngine validada: [${ffCheck.canFastForward ? 'FAST-FORWARD' : 'FULL-CYCLE'}]`);

try {
  fs.rmSync(sandbox, { recursive: true, force: true });
} catch (_) {
  // limpieza best-effort
}

console.log('\nPASS AX-F-109 — Invariantes de caché Merkle y Fast-Forward verificados al 100%.');
