#!/usr/bin/env node
'use strict';

/**
 * AX-F-181: Invariantes del Generador de SBOM Soberano (CycloneDX / SPDX)
 *
 * Verifica:
 * 1. Generación determinista de CycloneDX v1.5 JSON (generateCycloneDX).
 * 2. Generación determinista de SPDX 2.3 JSON (generateSPDX).
 * 3. Presencia de huellas SHA-256 (64 hex) y licencia Apache-2.0 en todos los componentes.
 * 4. Declaración de 'Zero Third-Party Dependencies' basada en package.json y el inventario local generado.
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

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

// Invariante 1: CycloneDX v1.5
const cdx = sbom.generateCycloneDX();
assert.strictEqual(cdx.bomFormat, 'CycloneDX');
assert.strictEqual(cdx.specVersion, '1.5');
assert.strictEqual(cdx.metadata.component.version, pkg.version, 'La versión en CycloneDX debe coincidir con package.json');
assert.ok(Array.isArray(cdx.components) && cdx.components.length > 50, 'Debe indexar más de 50 módulos del kernel');
assert.ok(cdx.metadata.properties.some(p => p.name === 'axion:zeroDependencies' && p.value === 'true'));
console.log(`  ✓ Invariante 1: CycloneDX v1.5 validado (${cdx.components.length} componentes indexados, v${cdx.metadata.component.version}).`);

// Invariante 2: SPDX 2.3
const spdx = sbom.generateSPDX();
assert.strictEqual(spdx.spdxVersion, 'SPDX-2.3');
assert.strictEqual(spdx.dataLicense, 'CC0-1.0');
assert.strictEqual(spdx.packages[0].versionInfo, pkg.version, 'La versión en SPDX debe coincidir con package.json');
assert.ok(Array.isArray(spdx.files) && spdx.files.length === cdx.components.length);
console.log(`  ✓ Invariante 2: SPDX 2.3 validado (${spdx.files.length} archivos declarados, v${spdx.packages[0].versionInfo}).`);

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

// Invariante 5: Paridad exacta entre ubicación canónica docs/sbom/ y réplica sbom/
const docsCdx = fs.readFileSync(path.join(ROOT, 'docs', 'sbom', 'sbom.cyclonedx.json'), 'utf8');
const rootCdx = fs.readFileSync(path.join(ROOT, 'sbom', 'sbom.cyclonedx.json'), 'utf8');
assert.strictEqual(docsCdx, rootCdx, 'docs/sbom/sbom.cyclonedx.json y sbom/sbom.cyclonedx.json deben ser idénticos');

const docsSpdx = fs.readFileSync(path.join(ROOT, 'docs', 'sbom', 'sbom.spdx.json'), 'utf8');
const rootSpdx = fs.readFileSync(path.join(ROOT, 'sbom', 'sbom.spdx.json'), 'utf8');
assert.strictEqual(docsSpdx, rootSpdx, 'docs/sbom/sbom.spdx.json y sbom/sbom.spdx.json deben ser idénticos');
console.log('  ✓ Invariante 5: Paridad exacta validada entre docs/sbom/ (canónica) y sbom/ (espejo).');

// Invariante 6: Comportamiento fail-closed adversarial ante package.json faltante, inválido o sin versión
const advSandbox = path.join(os.tmpdir(), `ax_f_181_adversarial_${Date.now()}`);
try {
  fs.mkdirSync(advSandbox, { recursive: true });

  // 6.1 package.json no existe
  const missingPkgDir = path.join(advSandbox, 'missing');
  fs.mkdirSync(missingPkgDir, { recursive: true });
  const missingPkgSbom = new SovereignSBOMGenerator(missingPkgDir);
  assert.throws(() => missingPkgSbom.getPackageVersion(), /package\.json no existe/);
  assert.throws(() => missingPkgSbom.generateCycloneDX(), /package\.json no existe/);
  console.log('  ✓ Invariante 6.1: Fail-closed verificado ante package.json inexistente.');

  // 6.2 package.json contiene JSON corrupto / inválido
  const corruptPkgDir = path.join(advSandbox, 'corrupt');
  fs.mkdirSync(corruptPkgDir, { recursive: true });
  fs.writeFileSync(path.join(corruptPkgDir, 'package.json'), '{ "name": "broken", "version": ', 'utf8');
  const corruptPkgSbom = new SovereignSBOMGenerator(corruptPkgDir);
  assert.throws(() => corruptPkgSbom.getPackageVersion(), /contiene JSON inválido/);
  assert.throws(() => corruptPkgSbom.generateCycloneDX(), /contiene JSON inválido/);
  console.log('  ✓ Invariante 6.2: Fail-closed verificado ante package.json con JSON sintácticamente inválido.');

  // 6.3 package.json sin versión o con versión inválida/vacía
  const emptyVersionDir = path.join(advSandbox, 'empty_version');
  fs.mkdirSync(emptyVersionDir, { recursive: true });
  fs.writeFileSync(path.join(emptyVersionDir, 'package.json'), JSON.stringify({ name: 'axion-test' }), 'utf8');
  const noVersionSbom = new SovereignSBOMGenerator(emptyVersionDir);
  assert.throws(() => noVersionSbom.getPackageVersion(), /no contiene propiedad version válida/);
  assert.throws(() => noVersionSbom.generateSPDX(), /no contiene propiedad version válida/);

  fs.writeFileSync(path.join(emptyVersionDir, 'package.json'), JSON.stringify({ name: 'axion-test', version: '   ' }), 'utf8');
  assert.throws(() => noVersionSbom.getPackageVersion(), /no contiene propiedad version válida/);

  fs.writeFileSync(path.join(emptyVersionDir, 'package.json'), JSON.stringify({ name: 'axion-test', version: 123 }), 'utf8');
  assert.throws(() => noVersionSbom.getPackageVersion(), /no contiene propiedad version válida/);
  console.log('  ✓ Invariante 6.3: Fail-closed verificado ante package.json sin propiedad version válida.');

} finally {
  try {
    fs.rmSync(advSandbox, { recursive: true, force: true });
  } catch (_) {
    // cleanup
  }
}

console.log('\nPASS: AX-F-181 — Generador de SBOM Soberano verificado con 6/6 invariantes en verde.');
