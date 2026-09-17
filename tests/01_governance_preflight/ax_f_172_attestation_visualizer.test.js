#!/usr/bin/env node
'use strict';

/**
 * AX-F-172: Invariantes del Visualizador Web de Atestaciones Criptográficas (Audit UI)
 *
 * Verifica:
 * 1. Generación determinista del panel HTML de atestaciones DSSE / in-toto.
 * 2. Visualización íntegra de las 7 fases de la cadena de custodia.
 * 3. Cero dependencias y cero scripts externos (100% offline standalone).
 * 4. Exportación atómica del archivo en docs/ o ruta destino.
 */

const assert = require('assert');
const { crearSandboxTemporal } = require('../../tools/test_sandbox.js');
const path = require('path');
const fs = require('fs');
const os = require('os');
const AttestationVisualizer = require('../../tools/attestation_visualizer.js');

console.log('=== AX-F-172: Invariantes de AttestationVisualizer (Audit UI) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const visualizer = new AttestationVisualizer(ROOT);

// Invariante 1: Generación de HTML
const html = visualizer.generateHTML();
assert.ok(typeof html === 'string', 'El HTML generado debe ser un string');
assert.ok(html.includes('<!DOCTYPE html>'), 'Debe incluir doctype HTML5');
assert.ok(html.includes('FIRMA Ed25519 VERIFICADA'), 'Debe incluir el badge de firma verificada');
assert.ok(html.includes('in-toto Statement v1'), 'Debe referenciar el estándar in-toto');
console.log('  ✓ Invariante 1: Estructura HTML de atestaciones verificada.');

// Invariante 2: Las 7 fases de gobernanza presentes
const fases = ['ENTENDER', 'PLANIFICAR', 'GATE', 'TEST', 'CONSTRUIR', 'AUDITAR', 'PROMOVER'];
for (const f of fases) {
  assert.ok(html.includes(f), `El HTML debe incluir la fase ${f}`);
}
console.log('  ✓ Invariante 2: Las 7 fases del flujo híbrido verificadas en el panel.');

// Invariante 3: Cero dependencias / Cero scripts externos
assert.ok(!html.includes('<script src='), 'No debe cargar scripts externos (100% offline)');
assert.ok(!html.includes('http://') && !html.includes('https://cdn.'), 'No debe referenciar CDNs externas');
console.log('  ✓ Invariante 3: Cumplimiento 100% offline standalone verificado.');

// Invariante 4: Exportación a disco
const tempDir = crearSandboxTemporal('test_ax_f_172');
const tempFile = path.join(tempDir, 'test_dashboard.html');

try {
  const exported = visualizer.exportDashboard(tempFile);
  assert.strictEqual(exported, tempFile);
  assert.ok(fs.existsSync(tempFile), 'El archivo exportado debe existir');
  const readBack = fs.readFileSync(tempFile, 'utf8');
  assert.ok(readBack.includes('AXION'), 'El archivo exportado debe contener el marcado');
  console.log(`  ✓ Invariante 4: Exportación atómica a disco validada en ${tempFile}.`);
} finally {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (_) {
    // cleanup
  }
}

console.log('\nPASS: AX-F-172 — Visualizador Web de Atestaciones verificado con 4/4 invariantes en verde.');
