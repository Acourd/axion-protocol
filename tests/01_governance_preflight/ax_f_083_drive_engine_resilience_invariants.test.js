'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const DriveEngine = require('../../tools/drive_engine.js');
const { halt, resume } = require('../../tools/killswitch.js');

console.log('=== AX-F-083 Invariantes de Resiliencia y Detección Automática de DriveEngine ===\n');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-drive-resilience-'));

try {
  const engine = new DriveEngine(tempDir);

  // 1. Auto-detección por patrones de archivos sensibles
  const cSensitive = engine.classifyContext({ files: ['tools/killswitch.js'] });
  assert.strictEqual(cSensitive.mode, 'DEEP_LOOP');
  assert.strictEqual(cSensitive.requiresDeliberation, true);
  assert.strictEqual(cSensitive.filesCount, 1);

  const cPackage = engine.classifyContext({ files: ['package.json'] });
  assert.strictEqual(cPackage.mode, 'DEEP_LOOP');
  assert.strictEqual(cPackage.requiresDeliberation, true);

  const cInnocuous = engine.classifyContext({ files: ['src/button.jsx'] });
  assert.strictEqual(cInnocuous.mode, 'FAST_LOOP');
  assert.strictEqual(cInnocuous.requiresDeliberation, false);
  console.log('✓ Auto-detección de patrones sensibles en classifyContext verificada');

  // 2. Generación del reporte ejecutivo de 3 líneas
  const reporte = engine.formatExecutiveReport({
    action: 'Módulo blindado',
    metrics: '100% suites pass',
    nextVector: 'Auditoría continua'
  });
  assert.strictEqual(reporte.includes('✓ [Acción Cumplida]: Módulo blindado'), true);
  assert.strictEqual(reporte.includes('📊 [Métricas]: 100% suites pass'), true);
  assert.strictEqual(reporte.includes('🧠 [Próximo Vector Metacognitivo]: Auditoría continua'), true);
  console.log('✓ Generador de reporte ejecutivo estándar de 3 líneas verificado');

  // 3. Salvaguarda Fail-Closed ante Killswitch activo
  const haltDir = path.join(tempDir, '.axion');
  halt('Parada de emergencia en sandbox', { haltDir });
  const resHalted = engine.runCycle({ targetDir: tempDir });
  assert.strictEqual(resHalted.pass, false);
  assert.strictEqual(resHalted.reason, 'SYSTEM_HALTED');
  assert.strictEqual(resHalted.mode, 'HALTED');
  console.log('✓ Aborto fail-closed ante killswitch activo verificado');

  // 4. Restauración tras resume (con salvaguarda fail-closed: skipVerification retorna UNVERIFIED)
  resume({ haltDir });
  const resResumed = engine.runCycle({ targetDir: tempDir, skipVerification: true });
  assert.strictEqual(resResumed.pass, false);
  assert.strictEqual(resResumed.status, 'UNVERIFIED');
  assert.strictEqual(resResumed.reason, 'VERIFICATION_SKIPPED');
  assert.notStrictEqual(resResumed.reason, 'SYSTEM_HALTED');
  console.log('✓ Ejecución restaurada tras resume verificada (fail-closed: unverified sin verificación real)');

  // 5. Evaluación de intención interactiva (@clarify integración)
  const intentVague = engine.evaluateIntent('agrega cosas');
  assert.strictEqual(intentVague.requiresClarification, true);
  assert.strictEqual(Boolean(intentVague.interactiveModal), true);
  assert.strictEqual(intentVague.interactiveModal.questions.length, 1);

  const intentClear = engine.evaluateIntent('crea una función sum en math.js');
  assert.strictEqual(intentClear.requiresClarification, false);
  console.log('✓ Integración de evaluateIntent e interactiveModal verificado');

  // 6. Resiliencia de backtracking y rollback automático ante fallos
  let counter = 0;
  const backtracked = engine.runWithBacktracking(() => {
    counter++;
    return { pass: counter >= 2 };
  }, { targetDir: tempDir, maxAttempts: 2 });
  assert.strictEqual(backtracked.success, true);
  assert.strictEqual(backtracked.attempts, 2);
  console.log('✓ Backtracking y recuperación en bucle cerrado verificado');

  // 7. Salvaguarda de fallo en rollback (corrupción de checkpoint)
  const corruptDir = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-drive-corrupt-'));
  try {
    fs.writeFileSync(path.join(corruptDir, 'dummy.txt'), 'contenido original');
    const corruptEngine = new DriveEngine(corruptDir);
    const backtrackedFail = corruptEngine.runWithBacktracking(() => {
      const cpBase = path.join(corruptDir, '.axion', 'checkpoints');
      if (fs.existsSync(cpBase)) {
        const cpDirs = fs.readdirSync(cpBase);
        if (cpDirs.length > 0) {
          const filesDir = path.join(cpBase, cpDirs[0], 'files');
          if (fs.existsSync(path.join(filesDir, 'dummy.txt'))) {
            fs.writeFileSync(path.join(filesDir, 'dummy.txt'), 'contenido corrompido');
          }
        }
      }
      return { pass: false, reason: 'Fallo simulado para probar rollback fallido' };
    }, { targetDir: corruptDir, maxAttempts: 1 });

    assert.strictEqual(backtrackedFail.success, false);
    assert.strictEqual(backtrackedFail.status, 'ROLLBACK_FAILED');
    assert.strictEqual(backtrackedFail.checkpointCreated, true);
    assert.strictEqual(backtrackedFail.rollbackAttempted, true);
    assert.strictEqual(backtrackedFail.rollbackSucceeded, false);
    assert.strictEqual(backtrackedFail.rolledBack, false);
    console.log('✓ Manejo fail-closed de fallo en rollback verificado (ROLLBACK_FAILED)');
  } finally {
    try {
      fs.rmSync(corruptDir, { recursive: true, force: true });
    } catch (_) {}
  }

} finally {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (_) {}
}

console.log('\nPASS AX-F-083 — Invariantes de resiliencia del motor Drive demostrados al 100%.\n');
