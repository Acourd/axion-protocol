'use strict';

/**
 * Axion Protocol — Invariantes de la Puerta de Sincronización Espejo (AX-F-164).
 *
 * Valida de forma estricta y hermética:
 * 1. Escaneo determinista de árboles y cálculo de paridad sin dependencias externas.
 * 2. Detección exacta de coincidencia, deriva (drift), archivos ausentes y extras.
 * 3. Sincronización atómica unidireccional no destructiva alcanzando el 100% de cobertura del origen (preservando archivos extra en destino sin borrarlos).
 * 4. Aislamiento total en sandbox efímero sin requerir repositorios hermanos en host.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const SyncMirrorGate = require('../../tools/sync_mirror_gate.js');

console.log('=== AX-F-164 Invariantes de la Puerta de Sincronización Espejo (Hermético) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'ax_f_164_fixture_'));

try {
  const sourceDir = path.join(sandbox, 'source');
  const targetDir = path.join(sandbox, 'target');

  fs.mkdirSync(path.join(sourceDir, 'sub'), { recursive: true });
  fs.mkdirSync(path.join(targetDir, 'sub'), { recursive: true });

  // 1. Fixture de archivos coincidentes (mismo hash)
  fs.writeFileSync(path.join(sourceDir, 'identical.txt'), 'contenido-identico-123', 'utf8');
  fs.writeFileSync(path.join(targetDir, 'identical.txt'), 'contenido-identico-123', 'utf8');

  // 2. Fixture de archivo con deriva (drift)
  fs.writeFileSync(path.join(sourceDir, 'drift.txt'), 'version-nueva-origen', 'utf8');
  fs.writeFileSync(path.join(targetDir, 'drift.txt'), 'version-antigua-destino', 'utf8');

  // 3. Fixture de archivos faltantes en target
  fs.writeFileSync(path.join(sourceDir, 'missing.txt'), 'solo-en-origen', 'utf8');
  fs.writeFileSync(path.join(sourceDir, 'sub', 'nested.txt'), 'anidado-origen', 'utf8');

  // 4. Fixture de archivo extra en target
  fs.writeFileSync(path.join(targetDir, 'extra.txt'), 'solo-en-destino', 'utf8');

  const gate = new SyncMirrorGate(sourceDir, targetDir);

  // Comprobación 1: Auditoría determinista de paridad
  const comp = gate.compare();
  assert.strictEqual(typeof comp, 'object');
  assert.strictEqual(comp.totalSource, 4, 'Origen debe tener exactamente 4 archivos');
  assert.strictEqual(comp.matchingCount, 1, 'Debe haber exactamente 1 archivo coincidente');
  assert.strictEqual(comp.drift.length, 1, 'Debe haber exactamente 1 archivo en drift');
  assert.strictEqual(comp.drift[0].file, 'drift.txt');
  assert.strictEqual(comp.missingInTarget.length, 2, 'Deben faltar 2 archivos en destino');
  assert.ok(comp.missingInTarget.includes('missing.txt'));
  assert.ok(comp.missingInTarget.includes('sub/nested.txt'));
  assert.strictEqual(comp.extraInTarget.length, 1, 'Debe haber 1 archivo extra en destino');
  assert.strictEqual(comp.extraInTarget[0], 'extra.txt');
  assert.strictEqual(comp.isIdentical, false, 'No debe ser idéntico antes del sync');
  assert.strictEqual(comp.parityPct, 25.0, 'Paridad inicial debe ser exactamente 25.0%');
  assert.ok(comp.timestamp, 'Debe incluir timestamp ISO');
  console.log(`✓ Comparación determinista hermética validada (1/4 coincidentes, 25.0% paridad)`);

  // Comprobación 2: Sincronización atómica unidireccional no destructiva y convergencia al 100%
  const syncRes = gate.sync();
  assert.strictEqual(syncRes.copiedCount, 3, 'Debe haber copiado 3 archivos (1 drift + 2 missing)');
  assert.strictEqual(syncRes.isIdentical, true, 'La cobertura del origen debe ser 100% (cero drift, cero missing)');
  assert.strictEqual(syncRes.postParityPct, 100, 'Paridad de cobertura del origen debe ser exactamente 100%');
  assert.strictEqual(fs.readFileSync(path.join(targetDir, 'drift.txt'), 'utf8'), 'version-nueva-origen');
  assert.strictEqual(fs.readFileSync(path.join(targetDir, 'missing.txt'), 'utf8'), 'solo-en-origen');
  assert.strictEqual(fs.readFileSync(path.join(targetDir, 'sub', 'nested.txt'), 'utf8'), 'anidado-origen');

  // Comprobación 3: Política explícita de archivos extra en destino (sincronización unidireccional no destructiva)
  // El contrato de SyncMirrorGate preserva archivos extras en destino sin eliminarlos ni alterarlos
  const extraStillExists = fs.existsSync(path.join(targetDir, 'extra.txt'));
  assert.strictEqual(extraStillExists, true, 'Política no destructiva: extra.txt debe conservarse en destino tras sync');
  assert.strictEqual(
    fs.readFileSync(path.join(targetDir, 'extra.txt'), 'utf8'),
    'solo-en-destino',
    'El contenido de extra.txt en destino no debe sufrir mutaciones'
  );
  const postComp = gate.compare();
  assert.strictEqual(postComp.extraInTarget.length, 1, 'postComparison debe registrar exactamente 1 archivo extra');
  assert.ok(postComp.extraInTarget.includes('extra.txt'), 'postComparison debe incluir explícitamente extra.txt en extraInTarget');
  assert.strictEqual(postComp.missingInTarget.length, 0, 'Cero archivos faltantes respecto al origen tras sync');
  assert.strictEqual(postComp.drift.length, 0, 'Cero archivos con drift tras sync');
  console.log('✓ Política no destructiva de archivos extra en destino validada (extra.txt conservado con contenido intacto y auditado)');
  console.log('✓ Sincronización atómica unidireccional validada: convergencia al 100% de paridad de cobertura del origen');

} finally {
  fs.rmSync(sandbox, { recursive: true, force: true });
}

console.log('\nPASS: Invariantes de la Puerta de Sincronización Espejo (AX-F-164) en verde.');
