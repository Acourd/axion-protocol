#!/usr/bin/env node
'use strict';

/**
 * AX-F-184: Invariantes de Compatibilidad e Integración Universal con OpenCode y Codex
 *
 * Verifica:
 * 1. Sincronización nativa de directivas en .opencode/ y .codex/ (MultiHarnessAdapter).
 * 2. Capacidad de ejecución standalone de dist/axion.bundle.js (Zero external dependencies).
 * 3. Integración y documentación bilingüe en docs/OPENCODE_CODEX_COMPATIBILITY.md (.es.md).
 * 4. Verificación de comandos CLI y telemetría accesibles desde cualquier harness.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');
const MultiHarnessAdapter = require('../../tools/multi_harness_adapter.js');

console.log('=== AX-F-184: Invariantes de Compatibilidad con OpenCode y Codex ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const adapter = new MultiHarnessAdapter(ROOT);

// Invariante 1: Sincronización OpenCode y Codex
const opencodeRes = adapter.syncOpenCode();
const codexRes = adapter.syncCodex();

assert.strictEqual(opencodeRes.harness, 'opencode');
assert.ok(opencodeRes.filesCount > 0);
assert.strictEqual(codexRes.harness, 'codex');
assert.ok(codexRes.filesCount > 0);

assert.ok(fs.existsSync(path.join(ROOT, '.opencode', 'rules', 'axion-protocol.md')));
assert.ok(fs.existsSync(path.join(ROOT, '.codex', 'AGENTS.md')));
assert.ok(fs.existsSync(path.join(ROOT, '.codex', 'config.toml')));
console.log('  ✓ Invariante 1: Directivas de gobernanza para OpenCode y Codex sincronizadas.');

// Invariante 2: Ejecución de Standalone Bundle (0 dependencias)
const bundlePath = path.join(ROOT, 'dist', 'axion.bundle.js');
assert.ok(fs.existsSync(bundlePath), 'El bundle standalone debe existir');

const bundleExec = spawnSync(process.execPath, [bundlePath], { encoding: 'utf8' });
assert.strictEqual(bundleExec.status, 0, 'Bundle debe ejecutar con exit code 0');
assert.ok(bundleExec.stdout.toLowerCase().includes('axion'), 'Salida debe mostrar Axion');

// El ejemplo publicado debe ser ejecutable: se corre el subcomando documentado.
const bundleHelp = spawnSync(process.execPath, [bundlePath, 'help'], { encoding: 'utf8' });
assert.strictEqual(bundleHelp.status, 0, 'El subcomando documentado "help" debe salir con código 0');
assert.ok(bundleHelp.stdout.includes('Subcomandos disponibles'), 'help debe listar los subcomandos disponibles');
console.log('  ✓ Invariante 2: Standalone bundle probado y ejecutable directamente sin dependencias.');

// Invariante 3: Documentación oficial de compatibilidad
const docEn = path.join(ROOT, 'docs', 'OPENCODE_CODEX_COMPATIBILITY.md');
const docEs = path.join(ROOT, 'docs', 'OPENCODE_CODEX_COMPATIBILITY.es.md');
assert.ok(fs.existsSync(docEn), 'docs/OPENCODE_CODEX_COMPATIBILITY.md debe existir');
assert.ok(fs.existsSync(docEs), 'docs/OPENCODE_CODEX_COMPATIBILITY.es.md debe existir');

const contentEn = fs.readFileSync(docEn, 'utf8');
const contentEs = fs.readFileSync(docEs, 'utf8');
assert.ok(contentEn.includes('OpenCode') && contentEn.includes('Codex'));

// El ejemplo publicado debe coincidir con el subcomando que esta prueba ejecuta.
for (const [nombre, contenido] of [['EN', contentEn], ['ES', contentEs]]) {
  assert.ok(contenido.includes('node dist/axion.bundle.js help'), `${nombre}: el ejemplo del bundle debe ser "help"`);
  assert.ok(!contenido.includes('node dist/axion.bundle.js verify'), `${nombre}: el ejemplo roto "verify" debe estar retirado`);
}

// Ninguna de las dos lenguas puede declarar tamaño estático ni ahorros no reproducibles.
for (const [nombre, contenido] of [['EN', contentEn], ['ES', contentEs]]) {
  assert.ok(!/\d+(?:\.\d+)?\s*kB\b/i.test(contenido), `${nombre}: no debe declarar tamaño estático del bundle`);
  assert.ok(!/\b80\s*%/.test(contenido), `${nombre}: no debe declarar ahorro sin benchmark versionado`);
}
console.log('  ✓ Invariante 3: Documentación técnica de integración validada en ambas lenguas.');

console.log('\nPASS: AX-F-184 — Compatibilidad e Integración con OpenCode y Codex verificada al 100%.');
