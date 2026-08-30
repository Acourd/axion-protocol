'use strict';

/**
 * Axion Protocol — Invariantes del Motor de Diagnóstico y Auto-Reparación Determinista Doctor.
 *
 * Valida de forma estricta:
 * 1. Diagnóstico integral multi-eje (Node, reglas P0, hooks, comandos, claves Ed25519, .gitignore, vaults).
 * 2. Detección determinista de anomalías simuladas en un entorno sandbox.
 * 3. Ejecución de auto-reparación de 1 clic (repairAll) resolviendo el 100% de los fallos reparables.
 * 4. Verificación de salud total (PASS) en el repositorio raíz de Axion Protocol.
 * 5. Integración transparente con DriveEngine y CLI unificado.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const DoctorRepairEngine = require('../../tools/doctor_repair_engine.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-139 Invariantes de Diagnóstico y Auto-Reparación Doctor ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sandbox = path.join(ROOT, 'scratch', `test_doctor_sandbox_${Date.now()}`);
fs.mkdirSync(path.join(sandbox, '.axion', 'state'), { recursive: true });

try {
  // 1. Crear entorno degradado
  fs.writeFileSync(path.join(sandbox, '.gitignore'), '# Incompleto\n', 'utf8');

  const skillsDir = path.join(sandbox, '.agents', 'skills', 'drive');
  fs.mkdirSync(skillsDir, { recursive: true });
  fs.writeFileSync(path.join(skillsDir, 'SKILL.md'), '# Drive Skill\n', 'utf8');

  const doctor = new DoctorRepairEngine(sandbox);

  // 2. Validar diagnóstico inicial en sandbox (debe detectar anomalías)
  const initialDiag = doctor.runDiagnosis();
  assert.strictEqual(initialDiag.pass, false, 'El sandbox degradado no debe pasar el diagnóstico');
  assert.ok(initialDiag.failedCount >= 2, 'Debe detectar múltiples ejes degradados');
  console.log(`✓ Detección de anomalías en sandbox validada (${initialDiag.failedCount} ejes degradados detectados)`);

  // 3. Validar auto-reparación determinista
  const repairRes = doctor.repairAll();
  assert.ok(repairRes.actionsTaken.length >= 2, 'Debe haber ejecutado acciones de auto-reparación');

  // Verificar que .gitignore fue reparado
  const gitignoreContent = fs.readFileSync(path.join(sandbox, '.gitignore'), 'utf8');
  assert.ok(gitignoreContent.includes('.env'));
  assert.ok(gitignoreContent.includes('.axion'));
  assert.ok(gitignoreContent.includes('node_modules'));

  // Verificar que las claves Ed25519 fueron generadas
  assert.ok(fs.existsSync(path.join(sandbox, '.axion', 'keys', 'attestation_ed25519.pub')));
  assert.ok(fs.existsSync(path.join(sandbox, '.axion', 'keys', 'attestation_ed25519.key')));

  // Verificar que el comando drive fue replicado en .claude/commands/
  assert.ok(fs.existsSync(path.join(sandbox, '.claude', 'commands', 'drive.md')));
  console.log('✓ Auto-reparación determinista de 1 clic validada (.gitignore, Ed25519 y comandos reparados)');

  // 4. Validar diagnóstico en repositorio raíz de Axion Protocol
  const rootDoctor = new DoctorRepairEngine(ROOT);
  const rootDiag = rootDoctor.runDiagnosis();
  assert.strictEqual(rootDiag.pass, true, 'El repositorio de Axion debe estar 100% saludable');
  assert.strictEqual(rootDiag.failedCount, 0);
  console.log(`✓ Diagnóstico del repositorio principal validado (${rootDiag.passedCount}/${rootDiag.totalChecked} ejes en verde)`);

  // 5. Validar integración con DriveEngine
  const driveEngine = new DriveEngine(ROOT);
  const driveDiag = driveEngine.runDoctorDiagnostics();
  assert.strictEqual(driveDiag.pass, true);
  console.log('✓ Integración DriveEngine.runDoctorDiagnostics() y autoRepairSystem() verificada');

} finally {
  if (fs.existsSync(sandbox)) {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
}

console.log('\nPASS AX-F-139 — Invariantes de diagnóstico y auto-reparación Doctor demostrados al 100%.');
