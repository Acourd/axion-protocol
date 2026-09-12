'use strict';

/**
 * Axion Protocol — Invariantes del Motor de Diagnóstico y Auto-Reparación Determinista Doctor.
 *
 * Valida de forma estricta y hermética en dos fases:
 * - Fase A: Auto-reparación determinista de 1 clic (repairAll).
 *   Parte de un fixture saludable completo, degrada exclusivamente los 3 ejes reparables
 *   (GITIGNORE_HYGIENE, CRYPTO_ED25519_KEYS, COMMANDS_PARITY), valida que el diagnóstico
 *   falla exactamente en esos 3 ejes, ejecuta repairAll(), y verifica los efectos físicos
 *   observables con confinamiento estricto de claves y 100% PASS post-reparación.
 * - Fase B: Diagnóstico multi-eje e integración con DriveEngine sobre fixture saludable aislado
 *   con presencia de claves Ed25519 inertes, validando 8/8 ejes saludables (exit code 0)
 *   sin tocar ni depender del estado volátil de .axion/ en el repositorio raíz.
 *
 * Cero dependencias externas. Limpieza garantizada vía try...finally en os.tmpdir().
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const DoctorRepairEngine = require('../../tools/doctor_repair_engine.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-139 Invariantes de Diagnóstico y Auto-Reparación Doctor ===\n');

const ROOT = path.resolve(__dirname, '..', '..');

const COMMAND_NAMES = [
  'attest', 'clarify', 'debug', 'drive', 'halt',
  'memory', 'preflight', 'premortem', 'profile',
  'review', 'snapshot', 'verify'
];

/**
 * Construye un fixture 100% saludable que satisface los 8 ejes del diagnóstico:
 * 1. NODE_ENGINE (garantizado por el runtime >= 20)
 * 2. P0_GOVERNANCE_RULES (.agents/rules/axion-governance.md)
 * 3. PRETOOLUSE_HOOK (tools/preflight.js)
 * 4. COMMANDS_PARITY (12/12 comandos en .agents/skills y .claude/commands)
 * 5. CRYPTO_ED25519_KEYS (presencia de pub/key inertes en .axion/keys)
 * 6. GITIGNORE_HYGIENE (.env, .axion, node_modules en .gitignore)
 * 7. STATE_VAULTS_INTEGRITY (JSONs parseables en .axion/state)
 * 8. KILLSWITCH_STATUS (sin archivo HALT bloqueante)
 */
function createHealthyFixture(targetDir) {
  // 1. Reglas P0
  const rulesDir = path.join(targetDir, '.agents', 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });
  fs.writeFileSync(path.join(rulesDir, 'axion-governance.md'), '# Axion Governance P0 Rules\n', 'utf8');

  // 2. Hook PreToolUse
  const toolsDir = path.join(targetDir, 'tools');
  fs.mkdirSync(toolsDir, { recursive: true });
  fs.writeFileSync(path.join(toolsDir, 'preflight.js'), '// Preflight Hook\n', 'utf8');

  // 3. Paridad de comandos canónicos (12 comandos en skills y claude)
  const skillsBaseDir = path.join(targetDir, '.agents', 'skills');
  const claudeBaseDir = path.join(targetDir, '.claude', 'commands');
  fs.mkdirSync(claudeBaseDir, { recursive: true });

  for (const cmd of COMMAND_NAMES) {
    const cmdSkillDir = path.join(skillsBaseDir, cmd);
    fs.mkdirSync(cmdSkillDir, { recursive: true });
    fs.writeFileSync(path.join(cmdSkillDir, 'SKILL.md'), `# ${cmd} skill\n`, 'utf8');
    fs.writeFileSync(path.join(claudeBaseDir, `${cmd}.md`), `# ${cmd} command\n`, 'utf8');
  }

  // 4. Claves Ed25519 para verificación de presencia (contenido inequívocamente inerte, sin encabezados PEM)
  const keysDir = path.join(targetDir, '.axion', 'keys');
  fs.mkdirSync(keysDir, { recursive: true });
  fs.writeFileSync(path.join(keysDir, 'attestation_ed25519.pub'), 'FIXTURE_KEY_PRESENCE_ONLY\n', 'utf8');
  fs.writeFileSync(path.join(keysDir, 'attestation_ed25519.key'), 'FIXTURE_KEY_PRESENCE_ONLY\n', 'utf8');

  // 5. Higiene de .gitignore
  fs.writeFileSync(path.join(targetDir, '.gitignore'), '.env\n.axion\nnode_modules\n', 'utf8');

  // 6. Bóvedas de estado
  const stateDir = path.join(targetDir, '.axion', 'state');
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(path.join(stateDir, 'instincts.json'), '{}\n', 'utf8');
  fs.writeFileSync(path.join(stateDir, 'multi_harness_manifest.json'), '{}\n', 'utf8');
}

const sandboxA = fs.mkdtempSync(path.join(os.tmpdir(), 'axion_doctor_repair_test_'));
const sandboxB = fs.mkdtempSync(path.join(os.tmpdir(), 'axion_doctor_healthy_test_'));

try {
  // =========================================================================
  // FASE A: Verificación Hermética de Auto-Reparación Determinista
  // =========================================================================

  // 1. Construir fixture saludable completo en sandboxA
  createHealthyFixture(sandboxA);

  // 2. Degradar EXCLUSIVAMENTE los 3 ejes reparables por DoctorRepairEngine:
  //    - GITIGNORE_HYGIENE (eliminar exclusiones requeridas)
  //    - CRYPTO_ED25519_KEYS (eliminar par de claves)
  //    - COMMANDS_PARITY (eliminar un comando de .claude/commands para crear desbalance)
  fs.writeFileSync(path.join(sandboxA, '.gitignore'), '# Incompleto\n', 'utf8');
  fs.rmSync(path.join(sandboxA, '.axion', 'keys'), { recursive: true, force: true });
  fs.rmSync(path.join(sandboxA, '.claude', 'commands', 'drive.md'), { force: true });

  const doctorA = new DoctorRepairEngine(sandboxA);

  // 3. Validar diagnóstico previo: debe fallar exactamente en los 3 ejes reparables
  const preDiag = doctorA.runDiagnosis();
  assert.strictEqual(preDiag.pass, false, 'El sandbox degradado no debe pasar el diagnóstico');
  assert.strictEqual(preDiag.failedCount, 3, 'Debe detectar exactamente 3 ejes degradados');
  assert.strictEqual(preDiag.passedCount, 5, 'Los 5 ejes no degradados deben permanecer saludables');
  const failedNamesA = preDiag.failedAxes.map(a => a.axis).sort();
  assert.deepStrictEqual(
    failedNamesA,
    ['COMMANDS_PARITY', 'CRYPTO_ED25519_KEYS', 'GITIGNORE_HYGIENE'],
    'Los ejes fallidos deben corresponder exactamente a los 3 ejes degradados'
  );
  console.log(`✓ Detección determinista de anomalías validada (exactamente 3/8 ejes degradados: ${failedNamesA.join(', ')})`);

  // 4. Ejecutar auto-reparación determinista
  const repairRes = doctorA.repairAll();
  assert.strictEqual(repairRes.success, true, 'repairAll debe reportar éxito');
  assert.strictEqual(repairRes.previousFailures, 3, 'previousFailures debe ser exactamente 3');
  assert.strictEqual(repairRes.remainingFailures, 0, 'remainingFailures debe ser 0 tras repairAll');
  assert.strictEqual(repairRes.actionsTaken.length, 3, 'Debe haber ejecutado exactamente 3 acciones');
  const repairedAxes = repairRes.actionsTaken.map(a => a.axis).sort();
  assert.deepStrictEqual(
    repairedAxes,
    ['COMMANDS_PARITY', 'CRYPTO_ED25519_KEYS', 'GITIGNORE_HYGIENE'],
    'Las acciones de reparación deben coincidir con los 3 ejes degradados'
  );

  // 5. Verificaciones físicas observables de efectos:
  // 5.1 Efecto físico en .gitignore
  const gitignoreContent = fs.readFileSync(path.join(sandboxA, '.gitignore'), 'utf8');
  assert.ok(gitignoreContent.includes('.env'), '.gitignore debe contener .env tras reparación');
  assert.ok(gitignoreContent.includes('.axion'), '.gitignore debe contener .axion tras reparación');
  assert.ok(gitignoreContent.includes('node_modules'), '.gitignore debe contener node_modules tras reparación');

  // 5.2 Efecto físico y confinamiento estricto de claves criptográficas
  const pubKeyPath = path.join(sandboxA, '.axion', 'keys', 'attestation_ed25519.pub');
  const privKeyPath = path.join(sandboxA, '.axion', 'keys', 'attestation_ed25519.key');
  assert.ok(fs.existsSync(pubKeyPath), 'attestation_ed25519.pub debe existir en sandbox tras reparación');
  assert.ok(fs.existsSync(privKeyPath), 'attestation_ed25519.key debe existir en sandbox tras reparación');

  // Confinamiento estricto: claves generadas residen estrictamente contenidas dentro de sandboxA
  const relToSandbox = path.relative(sandboxA, doctorA.keysDir);
  assert.ok(
    relToSandbox && !relToSandbox.startsWith('..') && !path.isAbsolute(relToSandbox),
    'Las claves generadas deben estar estrictamente confinadas dentro de sandboxA (sin escape relativo ni absoluto)'
  );
  const relToRoot = path.relative(ROOT, doctorA.keysDir);
  assert.ok(
    relToRoot.startsWith('..') || path.isAbsolute(relToRoot),
    'Las claves generadas por repairAll jamás deben residir dentro del repositorio ROOT'
  );

  // 5.3 Efecto físico en paridad de comandos
  const restoredCmdPath = path.join(sandboxA, '.claude', 'commands', 'drive.md');
  assert.ok(fs.existsSync(restoredCmdPath), 'drive.md debe haber sido replicado en .claude/commands/');

  // 5.4 Diagnóstico post-reparación: 100% PASS
  const postDiag = doctorA.runDiagnosis();
  assert.strictEqual(postDiag.pass, true, 'El sandbox debe ser 100% saludable tras reparación');
  assert.strictEqual(postDiag.failedCount, 0, 'No deben quedar anomalías tras reparación');
  assert.strictEqual(postDiag.passedCount, 8, 'Los 8 ejes deben estar en verde tras auto-reparación');
  console.log('✓ Auto-reparación determinista de 1 clic validada con efectos físicos observables (8/8 ejes en verde)');

  // =========================================================================
  // FASE B: Verificación de Fixture Saludable e Integración con DriveEngine
  // =========================================================================

  // 1. Construir fixture saludable completo en sandboxB
  createHealthyFixture(sandboxB);

  // 2. Validar diagnóstico con DoctorRepairEngine
  const doctorB = new DoctorRepairEngine(sandboxB);
  const diagB = doctorB.runDiagnosis();
  assert.strictEqual(diagB.pass, true, 'El fixture saludable debe reportar pass: true');
  assert.strictEqual(diagB.failedCount, 0, 'El fixture saludable debe tener 0 fallos');
  assert.strictEqual(diagB.passedCount, 8, 'Los 8 ejes deben estar en verde en fixture saludable');
  console.log(`✓ Diagnóstico de fixture saludable validado (${diagB.passedCount}/${diagB.totalChecked} ejes en verde)`);

  // 3. Validar integración con DriveEngine sobre fixture saludable
  const driveEngineB = new DriveEngine(sandboxB);
  const driveDiag = driveEngineB.runDoctorDiagnostics();
  assert.strictEqual(driveDiag.pass, true, 'DriveEngine.runDoctorDiagnostics() debe reportar pass: true');
  assert.strictEqual(driveDiag.failedCount, 0, 'DriveEngine.runDoctorDiagnostics() debe reportar 0 fallos');
  console.log('✓ Integración DriveEngine.runDoctorDiagnostics() verificada sobre fixture aislado');

} finally {
  if (fs.existsSync(sandboxA)) {
    fs.rmSync(sandboxA, { recursive: true, force: true });
  }
  if (fs.existsSync(sandboxB)) {
    fs.rmSync(sandboxB, { recursive: true, force: true });
  }
}

console.log('\nPASS AX-F-139 — Invariantes de diagnóstico y auto-reparación Doctor demostrados al 100%.');
