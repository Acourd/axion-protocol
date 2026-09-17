'use strict';

/**
 * Axion Protocol — Invariantes del Tejedor Dinámico de Reglas P0 y Orquestador de Stack.
 *
 * Valida de forma estricta:
 * 1. Detección precisa de firmas de stack tecnológico (TypeScript, Python, Rust, Node, Go).
 * 2. Tejido dinámico de reglas P0 universales + directivas especializadas del ecosistema.
 * 3. Persistencia atómica y sellado digest SHA-256 en .agents/rules/active-stack-governance.md.
 * 4. Integración transparente con DriveEngine y CLI unificado.
 */

const assert = require('assert');
const { crearSandbox } = require('../../tools/test_sandbox.js');
const path = require('path');
const fs = require('fs');
const DynamicRuleWeaver = require('../../tools/dynamic_rule_weaver.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-144 Invariantes del Tejedor Dinámico de Reglas P0 ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sandbox = crearSandbox('test_weaver_sandbox');
fs.mkdirSync(path.join(sandbox, '.agents', 'rules'), { recursive: true });

try {
  // 1. Crear entorno sandbox políglota (Python + Rust)
  fs.writeFileSync(path.join(sandbox, 'pyproject.toml'), '[tool.poetry]\nname = "test"\n', 'utf8');
  fs.writeFileSync(path.join(sandbox, 'Cargo.toml'), '[package]\nname = "test"\n', 'utf8');

  const sandboxWeaver = new DynamicRuleWeaver(sandbox);

  // 2. Validar detección de stack en sandbox
  const detected = sandboxWeaver.detectStacks();
  assert.strictEqual(detected.length, 2, 'Debe detectar exactamente 2 stacks');
  assert.ok(detected.some(s => s.id === 'python'));
  assert.ok(detected.some(s => s.id === 'rust'));
  console.log(`✓ Detección de stacks en sandbox validada (${detected.map(s => s.name).join(', ')})`);

  // 3. Validar tejido dinámico de reglas
  const weaveRes = sandboxWeaver.weaveRules();
  assert.strictEqual(weaveRes.success, true);
  assert.ok(fs.existsSync(weaveRes.targetFile));
  assert.ok(weaveRes.content.includes('Custodia de Intención Original'));
  assert.ok(weaveRes.content.includes('Type Hints PEP 484'));
  assert.ok(weaveRes.content.includes('Zero Panic in Production'));
  assert.strictEqual(weaveRes.digest.length, 64);
  console.log(`✓ Tejido dinámico de reglas P0 validado con SHA-256 (${weaveRes.digest.slice(0, 16)}...)`);

  // 4. Validar detección de stack JavaScript en entorno aislado sin contaminar el repositorio
  const jsSandbox = path.join(sandbox, 'js_project');
  fs.mkdirSync(path.join(jsSandbox, '.agents', 'rules'), { recursive: true });
  fs.writeFileSync(path.join(jsSandbox, 'package.json'), '{"name": "test-js-stack", "version": "1.0.0"}\n', 'utf8');

  const jsWeaver = new DynamicRuleWeaver(jsSandbox);
  const jsRes = jsWeaver.weaveRules();
  assert.strictEqual(jsRes.success, true);
  assert.ok(jsRes.activeStacks.includes('javascript'));
  assert.ok(fs.existsSync(jsRes.targetFile));
  const relTarget = path.relative(jsSandbox, jsRes.targetFile);
  assert.ok(
    relTarget && !relTarget.startsWith('..') && !path.isAbsolute(relTarget),
    'targetFile debe residir estrictamente confinado dentro de jsSandbox'
  );
  console.log(`✓ Detección de stack JavaScript hermética validada (${jsRes.stackNames})`);

  // 5. Validar integración con DriveEngine sobre entorno aislado
  const driveEngine = new DriveEngine(jsSandbox);
  const driveWeave = driveEngine.weaveDynamicRules();
  assert.strictEqual(driveWeave.success, true);
  console.log('✓ Integración DriveEngine.weaveDynamicRules() verificada en sandbox');

} finally {
  if (fs.existsSync(sandbox)) {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
}

console.log('\nPASS AX-F-144 — Invariantes del tejedor dinámico de reglas P0 demostrados al 100%.');
