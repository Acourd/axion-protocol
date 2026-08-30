'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  compactSessionContext,
  digestGobernanza,
  SNAPSHOTS_A_CONSERVAR
} = require('../../tools/context_shield.js');

console.log('=== AX-F-057 Escudo de Contexto, Detección de Deriva y Anclaje P0 ===\n');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'axion_ctx_test_'));

try {
  // 1. Crear estructura mínima de gobernanza
  const rulesDir = path.join(tempDir, '.agents', 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });
  const ruleFile = path.join(rulesDir, 'core-protocol.md');
  fs.writeFileSync(ruleFile, '# Core Protocol P0\nFail-closed governance.\n', 'utf8');

  // 2. Determinismo del digest de gobernanza
  const d1 = digestGobernanza(tempDir);
  const d2 = digestGobernanza(tempDir);
  assert.strictEqual(d1.digest, d2.digest, 'el digest de gobernanza debe ser estrictamente determinista');
  assert.strictEqual(d1.cubiertos.includes('.agents/rules/core-protocol.md'), true);
  console.log('✓ Determinismo del digest de gobernanza verificado');

  // 3. Detección de deriva normativa al modificar una regla
  fs.writeFileSync(ruleFile, '# Core Protocol P0\nFail-closed governance modificado.\n', 'utf8');
  const d3 = digestGobernanza(tempDir);
  assert.notStrictEqual(d3.digest, d1.digest, 'la alteración de reglas debe mutar el digest inmediatamente');
  console.log('✓ Detección en tiempo real de deriva de gobernanza verificada');

  // 4. Compactación de sesión y generación de ANCHOR.md
  const rCompact = compactSessionContext(tempDir);
  assert.strictEqual(rCompact.pass, true);
  assert.strictEqual(rCompact.snapshot.governance_status, 'FAIL_CLOSED');
  assert.strictEqual(fs.existsSync(rCompact.anchor), true);
  const contenidoAncla = fs.readFileSync(rCompact.anchor, 'utf8');
  assert.strictEqual(contenidoAncla.includes('Invariantes P0 que siguen vigentes'), true);
  console.log('✓ Generación de ANCHOR.md con invariantes P0 activas verificada');

  // 5. Transición a estado HALTED ante killswitch
  const haltFile = path.join(tempDir, '.axion', 'HALT');
  fs.writeFileSync(haltFile, 'EMERGENCY STOP', 'utf8');
  const rHaltCompact = compactSessionContext(tempDir);
  assert.strictEqual(rHaltCompact.snapshot.governance_status, 'HALTED');
  console.log('✓ Transición a estado HALTED reflejada en ancla verificada');
  fs.unlinkSync(haltFile);

  // 6. Purga automática de snapshots excedentes
  const dirEstado = path.join(tempDir, '.axion', 'state');
  for (let i = 0; i < 15; i++) {
    fs.writeFileSync(path.join(dirEstado, `context-snapshot-2026-08-24T10-00-${String(i).padStart(2, '0')}-000Z.json`), '{}', 'utf8');
  }
  const rPurga = compactSessionContext(tempDir);
  assert.strictEqual(rPurga.purgados > 0, true, 'debe purgar snapshots antiguos');
  const restantes = fs.readdirSync(dirEstado).filter(f => f.startsWith('context-snapshot-'));
  assert.strictEqual(restantes.length, SNAPSHOTS_A_CONSERVAR);
  console.log('✓ Purga de snapshots excedentes limitando estado a ' + SNAPSHOTS_A_CONSERVAR + ' elementos verificada');

} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log('\nPASS AX-F-057 — Escudo de contexto y anclaje de gobernanza demostrados al 100%.\n');
