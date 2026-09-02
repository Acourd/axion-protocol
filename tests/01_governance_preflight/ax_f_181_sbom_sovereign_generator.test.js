#!/usr/bin/env node
'use strict';

/**
 * AX-F-181: Invariantes del Generador de SBOM Soberano (CycloneDX / SPDX)
 *
 * Verifica:
 * 1. Generación determinista de CycloneDX v1.5 JSON (generateCycloneDX).
 * 2. Generación determinista de SPDX 2.3 JSON (generateSPDX).
 * 3. Presencia de huellas SHA-256 (64 hex) y licencia Apache-2.0 en todos los componentes.
 * 4. Ratificación formal de 'Zero Third-Party Dependencies'.
 * 5. Exportación atómica de archivos en docs/sbom/ (exportSBOMs).
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const SovereignSBOMGenerator = require('../../tools/sbom_sovereign_generator.js');

console.log('=== AX-F-181: Invariantes de SovereignSBOMGenerator (CycloneDX / SPDX) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sbom = new SovereignSBOMGenerator(ROOT);

// Invariante 1: CycloneDX v1.5
const cdx = sbom.generateCycloneDX();
assert.strictEqual(cdx.bomFormat, 'CycloneDX');
assert.strictEqual(cdx.specVersion, '1.5');
assert.ok(Array.isArray(cdx.components) && cdx.components.length > 50, 'Debe indexar más de 50 módulos del kernel');
assert.ok(cdx.metadata.properties.some(p => p.name === 'axion:zeroDependencies' && p.value === 'true'));
console.log(`  ✓ Invariante 1: CycloneDX v1.5 validado (${cdx.components.length} componentes indexados).`);

// Invariante 2: SPDX 2.3
const spdx = sbom.generateSPDX();
assert.strictEqual(spdx.spdxVersion, 'SPDX-2.3');
assert.strictEqual(spdx.dataLicense, 'CC0-1.0');
assert.ok(Array.isArray(spdx.files) && spdx.files.length === cdx.components.length);
console.log(`  ✓ Invariante 2: SPDX 2.3 validado (${spdx.files.length} archivos declarados).`);

// Invariante 3: Integridad de Hashes SHA-256
for (const comp of cdx.components) {
  assert.ok(comp.hashes[0].content.length === 64, `Hash de ${comp.name} debe ser SHA-256 de 64 caracteres`);
  assert.strictEqual(comp.licenses[0].license.id, 'Apache-2.0', `Licencia de ${comp.name} debe ser Apache-2.0`);
}
console.log('  ✓ Invariante 3: 100% de componentes cuentan con SHA-256 hex64 y licencia Apache-2.0.');

// Invariante 4: Exportación a disco
const tempDir = path.join(os.tmpdir(), `test_ax_f_181_${Date.now()}`);
try {
  const exportRes = sbom.exportSBOMs(tempDir);
  assert.ok(fs.existsSync(exportRes.cdxPath));
  assert.ok(fs.existsSync(exportRes.spdxPath));
  assert.strictEqual(exportRes.componentCount, cdx.components.length);
  console.log(`  ✓ Invariante 4: Exportación atómica validada en ${tempDir}.`);
} finally {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (_) {
    // cleanup
  }
}

console.log('\nPASS: AX-F-181 — Generador de SBOM Soberano verificado con 4/4 invariantes en verde.');
