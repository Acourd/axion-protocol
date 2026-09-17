#!/usr/bin/env node
'use strict';

/**
 * AX-F-169: Invariantes de Matriz Multi-SO y Pipeline de CI/CD de GitHub Actions
 *
 * Verifica:
 * 1. Existencia e integridad estructural de .github/workflows/ci.yml.
 * 2. Matriz Multi-SO completa: Ubuntu, Windows y macOS.
 * 3. Matriz de versiones de Node.js: 22.x, 24.x (Node 20 retirado tras EOL).
 * 4. Verificación estricta de las 12 skills canónicas del kernel.
 * 5. Inclusión de compuertas deterministas (check, vibeguard, run_all.js).
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('=== AX-F-169: Invariantes de Matriz Multi-SO y CI/CD ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const ciPath = path.join(ROOT, '.github', 'workflows', 'ci.yml');

assert.ok(fs.existsSync(ciPath), 'El archivo .github/workflows/ci.yml debe existir');
const ciContent = fs.readFileSync(ciPath, 'utf8');

// Invariante 1: Matriz Multi-SO
assert.ok(ciContent.includes('ubuntu-latest'), 'Debe incluir ubuntu-latest');
assert.ok(ciContent.includes('windows-latest'), 'Debe incluir windows-latest');
assert.ok(ciContent.includes('macos-latest'), 'Debe incluir macos-latest');
console.log('  ✓ Invariante 1: Matriz Multi-SO (Ubuntu, Windows, macOS) verificada.');

// Invariante 2: Versiones de Node.js (Node 22.13+ y 24.x; Node 20 retirado tras EOL)
assert.ok(!ciContent.includes('20.x'), 'No debe incluir Node.js 20.x en la matriz normal (EOL)');
assert.ok(ciContent.includes('22.x'), 'Debe soportar Node.js 22.x');
assert.ok(ciContent.includes('24.x'), 'Debe soportar Node.js 24.x');
console.log('  ✓ Invariante 2: Matriz de versiones de Node.js (22, 24) verificada (Node 20 EOL retirado).');

// Invariante 3: 12 Skills Canónicas Consolidadas
assert.ok(ciContent.includes('test "$esperados" -eq 12'), 'Debe validar exactamente 12 skills');
console.log('  ✓ Invariante 3: Conteo estricto de 12 skills canónicas verificado.');

// Invariante 4: Compuertas de Calidad en CI
assert.ok(ciContent.includes('node tests/run_all.js'), 'Debe correr la suite completa');
assert.ok(ciContent.includes('node bin/axion.js check') || ciContent.includes('npx axion check'), 'Debe auditar salud');
assert.ok(ciContent.includes('node bin/axion.js vibeguard') || ciContent.includes('npx axion vibeguard'), 'Debe auditar VibeGuard');
console.log('  ✓ Invariante 4: Compuertas deterministas de CI verificadas.');

// Invariante 5: La concurrencia es una puerta obligatoria, no un chequeo local
assert.ok(ciContent.includes('concurrent_suite_check.js'), 'CI debe ejecutar dos suites simultáneas sobre el mismo checkout');
console.log('  ✓ Invariante 5: Puerta de concurrencia en CI verificada.');

console.log('\nPASS: AX-F-169 — Matriz Multi-SO y Pipeline de CI/CD verificados con 5/5 invariantes en verde.');
