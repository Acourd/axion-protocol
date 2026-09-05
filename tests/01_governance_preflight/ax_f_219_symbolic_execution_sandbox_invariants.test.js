'use strict';

/**
 * AX-F-219: Invariantes del Sandbox de Ejecución Simbólica y Aislamiento Fail-Closed (M_SEC_012)
 *
 * Valida de forma determinista:
 * 1. Aislamiento transaccional en memoria: escrituras en buffer sin alterar disco antes de commit.
 * 2. Contención estricta de Path Traversal: bloqueo de rutas relativas escapadas y absolutas externas.
 * 3. Protección de archivos nucleares de gobernanza (policies/, .axion/, package.json, hooks).
 * 4. Intercepción y bloqueo de comandos destructivos en validación de procesos.
 * 5. Rollback atómico: descarte completo de mutaciones en buffer.
 * 6. Emisión de SandboxAuditReport_v1 sellado con SHA-256.
 * 7. Integración transparente con DriveEngine.executeInSymbolicSandbox().
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const SymbolicExecutionSandbox = require('../../tools/symbolic_execution_sandbox.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-219 Invariantes del Sandbox de Ejecución Simbólica (M_SEC_012) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sandbox = new SymbolicExecutionSandbox({ workspaceRoot: ROOT });

// Invariante 1: Aislamiento transaccional en memoria
const dummyRel = path.join('scratch', 'dummy_simulated_file.txt');
const dummyAbs = path.join(ROOT, dummyRel);
if (fs.existsSync(dummyAbs)) fs.unlinkSync(dummyAbs);

sandbox.writeFile(dummyRel, 'CONTENIDO_SIMULADO_EN_MEMORIA');
assert.strictEqual(fs.existsSync(dummyAbs), false, 'El archivo físico no debe existir antes del commit');
assert.strictEqual(sandbox.hasBuffered(dummyRel), true, 'El archivo debe estar marcado en el buffer en memoria');
assert.strictEqual(sandbox.readFile(dummyRel), 'CONTENIDO_SIMULADO_EN_MEMORIA', 'Debe leer el contenido buferizado');
console.log('✓ Invariante 1: Aislamiento transaccional verificado (buffer en memoria sin mutar disco)');

// Invariante 2: Contención estricta de Path Traversal
assert.throws(() => {
  sandbox.writeFile('../outside_workspace.txt', 'DATA_PELIGROSA');
}, (err) => {
  return err.code === 'ERR_PATH_TRAVERSAL';
}, 'Debe lanzar ERR_PATH_TRAVERSAL ante intento de escape de workspace');

assert.throws(() => {
  const winEscape = process.platform === 'win32' ? 'C:\\Windows\\System32\\evil.dll' : '/etc/shadow';
  sandbox.writeFile(winEscape, 'MALICIOUS_PAYLOAD');
}, (err) => {
  return err.code === 'ERR_PATH_TRAVERSAL';
}, 'Debe rechazar rutas absolutas del sistema operativo');
console.log('✓ Invariante 2: Contención estricta de Path Traversal y límites de workspace comprobada');

// Invariante 3: Protección de archivos nucleares de gobernanza
const protectedFiles = [
  'package.json',
  path.join('.axion', 'state', 'ledger.json'),
  path.join('.git', 'hooks', 'pre-commit')
];

for (const pFile of protectedFiles) {
  assert.throws(() => {
    sandbox.writeFile(pFile, 'MODIFICACION_ILEGITIMA');
  }, (err) => {
    return err.code === 'ERR_PROTECTED_GOVERNANCE_FILE';
  }, 'Debe bloquear mutaciones sobre archivo protegido: ' + pFile);
}
console.log('✓ Invariante 3: Bloqueo fail-closed de mutaciones sobre archivos de gobernanza validado');

// Invariante 4: Intercepción y bloqueo de comandos destructivos
const destructiveCmds = [
  'rm -rf /',
  'rm -rf .',
  'format C: /fs:ntfs',
  'dd if=/dev/zero of=/dev/sda',
  'git push origin main --force'
];

for (const cmd of destructiveCmds) {
  const check = sandbox.validateCommand(cmd);
  assert.strictEqual(check.allowed, false, 'Comando destructivo debe ser bloqueado: ' + cmd);
  assert.strictEqual(check.verdict, 'BLOCKED_DESTRUCTIVE');
}

const safeCheck = sandbox.validateCommand('git status');
assert.strictEqual(safeCheck.allowed, true, 'Comando inocuo debe ser permitido');
console.log('✓ Invariante 4: Intercepción y bloqueo de comandos destructivos verificada');

// Invariante 5: Rollback atómico en memoria
assert.strictEqual(sandbox.getPendingMutationsCount(), 1);
sandbox.rollback();
assert.strictEqual(sandbox.getPendingMutationsCount(), 0, 'Rollback debe vaciar los buffers');
assert.strictEqual(sandbox.hasBuffered(dummyRel), false);
console.log('✓ Invariante 5: Rollback atómico en memoria verificado (descarte limpio de mutaciones)');

// Invariante 6: Emisión de SandboxAuditReport_v1 sellado con SHA-256
const report = sandbox.getAuditReport();
assert.strictEqual(report.reportType, 'SandboxAuditReport_v1');
assert.ok(typeof report.reportDigest === 'string' && report.reportDigest.length === 64);
assert.ok(report.totalOperationsAudited >= 7);
console.log('✓ Invariante 6: SandboxAuditReport_v1 emitido y sellado con SHA-256 (' + report.reportDigest.slice(0, 16) + '...)');

// Invariante 7: Integración nativa con DriveEngine
const drive = new DriveEngine(ROOT);
assert.strictEqual(typeof drive.executeInSymbolicSandbox, 'function');
const sandboxResult = drive.executeInSymbolicSandbox((sb) => {
  sb.writeFile(path.join('scratch', 'sandbox_test.tmp'), 'DRIVE_SANDBOX_PASSED');
  return 'SUCCESS_INNER';
}, { commit: false });

assert.strictEqual(sandboxResult.success, true);
assert.strictEqual(sandboxResult.result, 'SUCCESS_INNER');
console.log('✓ Invariante 7: Integración nativa con DriveEngine.executeInSymbolicSandbox() demostrada');

console.log('\nPASS: AX-F-219 — Invariantes de SymbolicExecutionSandbox demostrados al 100%.');
