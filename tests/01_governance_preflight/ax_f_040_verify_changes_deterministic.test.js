'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { detectarVerificador, runVerificationLoop } = require('../../tools/verify_changes.js');

console.log('=== AX-F-040 Verificación Determinista y Detección de Runners (tools/verify_changes.js) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');

// 1. Detección de runner en el repositorio actual
const vRoot = detectarVerificador(ROOT);
assert.notStrictEqual(vRoot, null);
assert.strictEqual(vRoot.executable, process.execPath);
assert.strictEqual(vRoot.args[0].endsWith('tests' + path.sep + 'run_all.js') || vRoot.args[0].endsWith('tests/run_all.js'), true);
console.log('✓ Detección de tests/run_all.js como runner prioritario verificada');

// 2. Detección de script "test" en package.json alternativo
const mockDir = path.join(ROOT, 'scratch', 'test_verify_mock');
if (fs.existsSync(mockDir)) fs.rmSync(mockDir, { recursive: true, force: true });
fs.mkdirSync(mockDir, { recursive: true });

fs.writeFileSync(path.join(mockDir, 'package.json'), JSON.stringify({
  name: 'mock-app',
  scripts: { test: 'node -e "process.exit(0)"' }
}), 'utf8');

const vMock = detectarVerificador(mockDir);
assert.notStrictEqual(vMock, null);
assert.strictEqual(vMock.args.includes('test'), true);
console.log('✓ Fallback a package.json scripts.test verificado');

// 3. Fallo controlado cuando no hay runner disponible
const emptyDir = path.join(ROOT, 'scratch', 'test_verify_empty');
if (fs.existsSync(emptyDir)) fs.rmSync(emptyDir, { recursive: true, force: true });
fs.mkdirSync(emptyDir, { recursive: true });

const vEmpty = detectarVerificador(emptyDir);
assert.strictEqual(vEmpty, null);

const rEmpty = runVerificationLoop(emptyDir);
assert.strictEqual(rEmpty.pass, false);
assert.strictEqual(rEmpty.reason, 'NO_TEST_RUNNER_FOUND');
console.log('✓ Fallo cerrado ante ausencia de runner de pruebas verificado');

// Limpieza
fs.rmSync(mockDir, { recursive: true, force: true });
fs.rmSync(emptyDir, { recursive: true, force: true });
console.log('✓ Limpieza de entornos mock completada');

console.log('\nPASS AX-F-040 — Verificación determinista y detección de runners verificadas al 100%.\n');
