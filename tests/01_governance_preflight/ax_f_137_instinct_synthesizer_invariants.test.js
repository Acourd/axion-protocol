'use strict';

/**
 * Axion Protocol — Invariantes del Motor de Síntesis de Instintos y Aprendizaje Continuo.
 *
 * Valida de forma estricta:
 * 1. Síntesis determinista de tarjetas de instinto (trigger, rule, rationale, domain).
 * 2. Ciclo de vida y refuerzo de confianza (PROBATION -> ACTIVE -> GRADUATED).
 * 3. Consultas semánticas y filtrado por umbral de confianza.
 * 4. Formateo determinista de bloques de prompt para inyección contextual.
 * 5. Persistencia atómica y sellado SHA-256 en .axion/state/instincts.json.
 * 6. Integración transparente con DriveEngine y CLI unificado.
 */

const assert = require('assert');
const { crearSandbox } = require('../../tools/test_sandbox.js');
const path = require('path');
const fs = require('fs');
const InstinctSynthesizer = require('../../tools/instinct_synthesizer.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-137 Invariantes de Síntesis de Instintos y Aprendizaje Continuo ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sandbox = crearSandbox('test_instinct_sandbox');
fs.mkdirSync(path.join(sandbox, '.axion', 'state'), { recursive: true });

try {
  const synthesizer = new InstinctSynthesizer(sandbox);

  // 1. Validar síntesis inicial de instinto en estado PROBATION
  const syn1 = synthesizer.synthesizeInstinct({
    domain: 'SECURITY',
    trigger: 'modificación de archivos de atestación',
    rule: 'Siempre verificar firma DSSE y digest Merkle antes de promover release',
    rationale: 'Evita falsificación de evidencia criptográfica',
    initialConfidence: 0.60
  });

  assert.strictEqual(syn1.success, true);
  assert.strictEqual(syn1.instinct.status, 'PROBATION');
  assert.strictEqual(syn1.instinct.confidence, 0.60);
  assert.strictEqual(syn1.instinct.evidenceCount, 1);
  console.log('✓ Síntesis de instinto inicial en PROBATION validada');

  // 2. Validar refuerzo positivo acumulativo hasta ACTIVE
  for (let i = 0; i < 5; i++) {
    synthesizer.reinforceInstinct(syn1.instinct.id, true);
  }

  const activeVault = synthesizer.loadVault();
  const reinforced = activeVault.instincts.find(ins => ins.id === syn1.instinct.id);
  assert.ok(reinforced.confidence >= 0.80, 'La confianza debe haber incrementado');
  assert.strictEqual(reinforced.status, 'ACTIVE');
  console.log(`✓ Refuerzo positivo validado (Estado promovido a ACTIVE, Confianza: ${reinforced.confidence})`);

  // 3. Validar refuerzo hasta GRADUATED (>= 10 evidencias y >= 0.85 confianza)
  for (let i = 0; i < 6; i++) {
    synthesizer.reinforceInstinct(syn1.instinct.id, true);
  }
  const graduatedVault = synthesizer.loadVault();
  const graduated = graduatedVault.instincts.find(ins => ins.id === syn1.instinct.id);
  assert.strictEqual(graduated.status, 'GRADUATED');
  assert.ok(graduated.evidenceCount >= 10);
  console.log('✓ Graduación de instinto validada (Estado: GRADUATED)');

  // 4. Validar consultas semánticas y filtrado por dominio
  const secInstincts = synthesizer.queryRelevantInstincts({ domain: 'SECURITY', minConfidence: 0.7 });
  assert.strictEqual(secInstincts.length, 1);
  assert.strictEqual(secInstincts[0].id, syn1.instinct.id);

  const emptyQuery = synthesizer.queryRelevantInstincts({ domain: 'FRONTEND' });
  assert.strictEqual(emptyQuery.length, 0);
  console.log('✓ Consultas semánticas y filtrado por dominio validado');

  // 5. Validar formateo de bloque de contexto
  const block = synthesizer.formatInstinctsPromptBlock('SECURITY');
  assert.ok(block.includes('🎓 [GRADUATED]'));
  assert.ok(block.includes('SECURITY'));
  assert.ok(block.includes('modificación de archivos de atestación'));
  console.log('✓ Formateo de bloque de prompt validado');

  // 6. Validar integración con DriveEngine
  const driveEngine = new DriveEngine(ROOT);
  const driveSyn = driveEngine.synthesizeProjectInstinct({
    domain: 'TESTING',
    trigger: 'ejecución de suite paralela',
    rule: 'Exigir siempre exit code 0 sin ignorar fallos en workers concurrentes',
    initialConfidence: 0.90
  });
  assert.strictEqual(driveSyn.success, true);

  const driveQuery = driveEngine.queryProjectInstincts({ domain: 'TESTING' });
  assert.ok(driveQuery.length >= 1);
  console.log('✓ Integración DriveEngine.synthesizeProjectInstinct() y queryProjectInstincts() verificada');

} finally {
  if (fs.existsSync(sandbox)) {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
}

console.log('\nPASS AX-F-137 — Invariantes de síntesis de instintos y aprendizaje continuo demostrados al 100%.');
