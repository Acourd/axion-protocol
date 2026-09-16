'use strict';

/**
 * Axion Protocol — Invariantes de la Puerta de Sincronización Espejo (AX-F-164).
 *
 * Valida de forma determinista y autocontenida (sin depender de checkouts vecinos):
 * 1. Comparación de hashes SHA-256 archivo por archivo entre origen y destino.
 * 2. Detección exacta de archivos faltantes, con deriva (drift) y coincidentes.
 * 3. `sync()` restaura la paridad a 100% copiando solo lo necesario.
 * 4. Auditoría informativa del gemelo local si existe (no es una aserción de CI).
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const SyncMirrorGate = require('../../tools/sync_mirror_gate.js');

console.log('=== AX-F-164 Invariantes de la Puerta de Sincronización Espejo ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const origen = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-mirror-src-'));
const destino = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-mirror-tgt-'));

try {
  fs.mkdirSync(path.join(origen, 'tools'), { recursive: true });
  fs.writeFileSync(path.join(origen, 'tools', 'a.js'), 'const a = 1;\n', 'utf8');
  fs.writeFileSync(path.join(origen, 'tools', 'b.js'), 'const b = 2;\n', 'utf8');
  fs.writeFileSync(path.join(origen, 'c.js'), 'const c = 3;\n', 'utf8');

  fs.mkdirSync(path.join(destino, 'tools'), { recursive: true });
  fs.writeFileSync(path.join(destino, 'tools', 'a.js'), 'const a = 1;\n', 'utf8');
  fs.writeFileSync(path.join(destino, 'tools', 'b.js'), 'const b = 999;\n', 'utf8');

  const gate = new SyncMirrorGate(origen, destino);

  // 1. Comparación determinista
  const comp = gate.compare();
  assert.strictEqual(comp.totalSource, 3, 'Debe escanear los 3 archivos de origen');
  assert.strictEqual(comp.matchingCount, 1, 'Solo a.js coincide');
  assert.ok(comp.drift.some((d) => d.file.endsWith('b.js')), 'b.js debe reportarse como drift');
  assert.ok(comp.missingInTarget.includes('c.js'), 'c.js debe reportarse como faltante');
  assert.strictEqual(comp.parityPct, 33.3, `Paridad esperada 33.3, obtenida ${comp.parityPct}`);
  console.log(`✓ Comparación determinista verificada (${comp.matchingCount}/${comp.totalSource} coincidentes, ${comp.parityPct}%)`);

  // 2. Determinismo entre llamadas (el timestamp ISO es informativo, no parte del veredicto)
  const comp2 = gate.compare();
  assert.strictEqual(comp2.parityPct, comp.parityPct, 'La paridad debe ser determinista');
  assert.strictEqual(comp2.matchingCount, comp.matchingCount, 'El conteo de coincidencias debe ser determinista');
  assert.deepStrictEqual(comp2.drift, comp.drift, 'La deriva debe ser determinista');
  assert.deepStrictEqual(comp2.missingInTarget, comp.missingInTarget, 'Los faltantes deben ser deterministas');
  console.log('✓ Comparación determinista entre llamadas');

  // 3. Sincronización restaura paridad
  const syncRes = gate.sync();
  assert.strictEqual(syncRes.copiedCount, 2, 'Debe copiar el drift y el faltante');
  assert.strictEqual(syncRes.postParityPct, 100, 'Tras sync la paridad debe ser 100%');
  assert.strictEqual(syncRes.isIdentical, true);
  console.log('✓ Sincronización restaura la paridad al 100%');

  // 4. Auditoría informativa del gemelo local (si existe), sin umbral de CI
  const gemelo = path.resolve(ROOT, '..', 'Axkern');
  if (fs.existsSync(gemelo)) {
    const twinGate = new SyncMirrorGate(ROOT, gemelo);
    const twinComp = twinGate.compare();
    console.log(`i Gemelo local detectado: paridad informativa ${twinComp.parityPct}% (${twinComp.matchingCount}/${twinComp.totalSource}); no condiciona CI`);
  } else {
    console.log('i Gemelo local ausente: auditoría de paridad externa omitida (no condiciona CI)');
  }

  console.log('\nPASS: Invariantes de la Puerta de Sincronización Espejo (AX-F-164) en verde.');
} finally {
  fs.rmSync(origen, { recursive: true, force: true });
  fs.rmSync(destino, { recursive: true, force: true });
}
