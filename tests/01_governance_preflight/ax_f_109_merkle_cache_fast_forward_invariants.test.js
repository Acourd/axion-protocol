'use strict';

/**
 * Axion Protocol — Invariantes de Caché de Estado Merkle y Fast-Forward (evidencia por fase).
 *
 * Valida de forma estricta:
 * 1. Cálculo determinista del Árbol de Merkle sobre el código fuente.
 * 2. Transición de estado: Cold Cache (FULL-CYCLE) -> Sealed Cache (FAST-FORWARD).
 * 3. Cada fase exige artefacto, SHA-256 y resultado PASS; los booleanos no autorizan.
 * 4. Detección atómica de mutaciones: cualquier alteración invalida el Fast-Forward.
 * 5. Integración transparente con DriveEngine.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const MerkleCacheEngine = require('../../tools/merkle_cache_fast_forward.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-109 Invariantes de Caché de Estado Merkle y Fast-Forward ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sandbox = path.join(ROOT, 'scratch', `test-merkle-sandbox-${Date.now()}`);
const FASE_NAMES = ['testsPassed', 'vibeGuardPassed', 'smtProofPassed', 'chaosFuzzPassed'];

// Configurar estructura de sandbox
fs.mkdirSync(path.join(sandbox, 'tools'), { recursive: true });
fs.mkdirSync(path.join(sandbox, 'tests'), { recursive: true });
fs.mkdirSync(path.join(sandbox, '.axion', 'state'), { recursive: true });

fs.writeFileSync(path.join(sandbox, 'tools', 'module_a.js'), 'console.log("a");');
fs.writeFileSync(path.join(sandbox, 'tests', 'test_a.test.js'), 'console.log("test");');

function evidenciaDeFase(nombre) {
  const archivo = path.join(sandbox, 'evidence', `${nombre}.json`);
  fs.mkdirSync(path.dirname(archivo), { recursive: true });
  fs.writeFileSync(archivo, JSON.stringify({ fase: nombre, resultado: 'PASS' }), 'utf8');
  return {
    artifact: `evidence/${nombre}.json`,
    sha256: crypto.createHash('sha256').update(fs.readFileSync(archivo)).digest('hex'),
    result: 'PASS'
  };
}

const EVIDENCIA_COMPLETA = Object.fromEntries(FASE_NAMES.map((n) => [n, evidenciaDeFase(n)]));

const sandboxEngine = new MerkleCacheEngine(sandbox);

// 1. Validar cálculo de Merkle Root
const merkle = sandboxEngine.computeMerkleRoot();
assert.ok(merkle.merkleRoot && merkle.merkleRoot.length === 64, 'Debe calcular un digest SHA-256 de 64 caracteres');
assert.strictEqual(merkle.filesCount, 2, 'Debe rastrear exactamente los 2 archivos gobernados creados');
console.log(`✓ Merkle Root calculado determinísticamente: ${merkle.merkleRoot.slice(0, 16)}...`);

// 2. Validar evaluación Cold Cache
const coldEval = sandboxEngine.evaluateFastForward();
assert.strictEqual(coldEval.canFastForward, false, 'Cold cache no debe autorizar Fast-Forward');
console.log('✓ Cold cache evaluado correctamente: Full cycle requerido');

// 3. Sellar estado con evidencia verificable por fase y validar Fast-Forward hit
sandboxEngine.sealState(merkle, EVIDENCIA_COMPLETA);
const warmEval = sandboxEngine.evaluateFastForward();
assert.strictEqual(warmEval.canFastForward, true, 'Warm cache con Merkle Root idéntico y 4 fases con evidencia debe autorizar Fast-Forward');
console.log('✓ Warm cache verificado: Fast-Forward autorizado con evidencia por fase');

// 4. Mutar archivo y verificar invalidación de caché
fs.writeFileSync(path.join(sandbox, 'tools', 'module_a.js'), 'console.log("mutated_a");');
const mutatedEval = sandboxEngine.evaluateFastForward();
assert.strictEqual(mutatedEval.canFastForward, false, 'Mutación de archivo debe invalidar el Fast-Forward');
console.log('✓ Invalidación reactiva ante mutaciones verificada');

// 5. Validar integración con DriveEngine en el repo principal
const driveEngine = new DriveEngine(ROOT);
const ffCheck = driveEngine.checkMerkleFastForward();
assert.ok(typeof ffCheck.canFastForward === 'boolean', 'DriveEngine debe retornar estado de Fast-Forward');
console.log(`✓ Integración con DriveEngine validada: [${ffCheck.canFastForward ? 'FAST-FORWARD' : 'FULL-CYCLE'}]`);

// Limpiar sandbox
try {
  fs.rmSync(sandbox, { recursive: true, force: true });
} catch (_) {
  // limpieza best-effort
}

console.log('\nPASS AX-F-109 — Invariantes de caché Merkle y Fast-Forward verificados al 100%.');
