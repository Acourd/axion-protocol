'use strict';

/**
 * Axion Protocol — Invariantes del Agente Chaos Monkey y Resiliencia en Bucle Cerrado.
 *
 * Valida de forma estricta:
 * 1. Inyección de 100+ anomalías sintácticas y tipos degenerados sin excepciones no controladas.
 * 2. Neutralización y clasificación estricta de vectores de evasión y prompt injection.
 * 3. Detección y rechazo determinista de firmas DSSE corrompidas.
 * 4. Emisión de reporte criptográfico con SHA-256 in-toto.
 * 5. Integración transparente con DriveEngine y CLI unificado.
 */

const assert = require('assert');
const { crearSandbox } = require('../../tools/test_sandbox.js');
const path = require('path');
const fs = require('fs');
const AgentChaosMonkey = require('../../tools/agent_chaos_monkey.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-147 Invariantes del Agente Chaos Monkey Adversarial ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sandbox = crearSandbox('test_chaos_sandbox');
fs.mkdirSync(path.join(sandbox, '.axion', 'state'), { recursive: true });

try {
  const monkey = new AgentChaosMonkey(sandbox);

  // 1. Validar vector de mutación JSON
  const jsonRes = monkey.testJsonMutation(30);
  assert.strictEqual(jsonRes.pass, true);
  assert.strictEqual(jsonRes.survived, 30);
  console.log(`✓ Vector JSON Mutation validado (${jsonRes.survived}/${jsonRes.tested} neutralizados)`);

  // 2. Validar vector de tipos nulos y degenerados
  const nullRes = monkey.testNullSafety(30);
  assert.strictEqual(nullRes.pass, true);
  assert.strictEqual(nullRes.survived, 30);
  console.log(`✓ Vector Null/Undefined Safety validado (${nullRes.survived}/${nullRes.tested} neutralizados)`);

  // 3. Validar vector de Prompt Injection
  const promptRes = monkey.testPromptInjection(30);
  assert.strictEqual(promptRes.pass, true);
  assert.strictEqual(promptRes.survived, 30);
  console.log(`✓ Vector Prompt Injection Defense validado (${promptRes.survived}/${promptRes.tested} neutralizados)`);

  // 4. Validar vector de alteración DSSE
  const dsseRes = monkey.testDsseTampering(30);
  assert.strictEqual(dsseRes.pass, true);
  assert.strictEqual(dsseRes.survived, 30);
  console.log(`✓ Vector DSSE Tampering Rejection validado (${dsseRes.survived}/${dsseRes.tested} rechazados fail-closed)`);

  // 5. Validar suite completa y reporte sellado
  const suiteRes = monkey.runChaosSuite({ iterations: 25 });
  assert.strictEqual(suiteRes.pass, true);
  assert.strictEqual(suiteRes.resilienceRate, '100.0%');
  assert.ok(fs.existsSync(monkey.reportFile));
  assert.strictEqual(suiteRes.digest.length, 64);
  console.log(`✓ Suite de Caos Adversarial completada: 100.0% Resiliencia (SHA-256: ${suiteRes.digest.slice(0, 16)}...)`);

  // 6. Validar integración con DriveEngine
  const driveEngine = new DriveEngine(ROOT);
  const driveChaos = driveEngine.runChaosMonkey({ iterations: 10 });
  assert.strictEqual(driveChaos.pass, true);
  console.log('✓ Integración DriveEngine.runChaosMonkey() verificada');

} finally {
  if (fs.existsSync(sandbox)) {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
}

console.log('\nPASS AX-F-147 — Invariantes del agente chaos monkey demostrados al 100%.');
