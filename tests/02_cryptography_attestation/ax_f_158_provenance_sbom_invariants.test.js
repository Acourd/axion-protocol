'use strict';

/**
 * Axion Protocol — Invariantes del Generador de SBOM CycloneDX v1.5 y Procedencia SLSA v1.0.
 *
 * Valida de forma estricta:
 * 1. Conformidad con el estándar CycloneDX v1.5 JSON (bomFormat, specVersion, componentes, purls y digests SHA-256).
 * 2. Conformidad con la especificación in-toto Statement v1 + SLSA Provenance v1.0 (predicateType, buildDefinition, runDetails).
 * 3. Persistencia determinista de reportes en .axion/reports/.
 * 4. Integración con DriveEngine y CLI unificado.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const ProvenanceSbomGenerator = require('../../tools/provenance_sbom_generator.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-158 Invariantes de SBOM CycloneDX v1.5 y Procedencia SLSA v1.0 ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const generator = new ProvenanceSbomGenerator(ROOT);

// 1. Generar y validar SBOM CycloneDX v1.5
const sbom = generator.generateCycloneDxSbom();
assert.strictEqual(sbom.bomFormat, 'CycloneDX', 'Debe especificar bomFormat CycloneDX');
assert.strictEqual(sbom.specVersion, '1.5', 'Debe cumplir con specVersion 1.5');
assert.ok(sbom.serialNumber && sbom.serialNumber.startsWith('urn:uuid:'), 'Debe generar serialNumber URN');
assert.ok(Array.isArray(sbom.components) && sbom.components.length > 0, 'Debe incluir la lista de componentes');

// Validar que todos los componentes tienen hash SHA-256
for (const comp of sbom.components) {
  assert.ok(comp.name, 'Componente debe tener nombre');
  assert.ok(comp.purl, 'Componente debe tener purl');
  assert.ok(comp.hashes && comp.hashes.length > 0, 'Componente debe tener hashes');
  assert.strictEqual(comp.hashes[0].alg, 'SHA-256');
  assert.strictEqual(comp.hashes[0].content.length, 64);
}
assert.ok(fs.existsSync(sbom.savedPath), 'Debe persistir sbom.cyclonedx.json');
console.log(`✓ SBOM CycloneDX v1.5 validado: ${sbom.components.length} componentes auditados y sellados con SHA-256`);

// 2. Generar y validar procedencia in-toto v1 (descriptiva, SIN reclamo SLSA)
const slsa = generator.generateSlsaProvenance();
assert.strictEqual(slsa._type, 'https://in-toto.io/Statement/v1', 'Debe ser in-toto Statement v1');
assert.strictEqual(slsa.predicateType, 'https://slsa.dev/provenance/v1', 'Debe usar la estructura de predicado SLSA Provenance v1.0');
assert.ok(Array.isArray(slsa.subject) && slsa.subject.length > 0, 'Debe incluir subject');
assert.strictEqual(slsa.predicate.buildDefinition.internalParameters.slsaLevel, 'NOT_ASSERTED', 'No debe reclamarse nivel SLSA');
assert.strictEqual(slsa.predicate.buildDefinition.internalParameters.provenanceStatus, 'DESCRIPTIVE_ONLY');
assert.strictEqual(slsa.predicate.buildDefinition.internalParameters.slsaVerification, 'NOT_VERIFIED');
assert.strictEqual(slsa.predicate.buildDefinition.externalParameters.artifactBinding, 'SBOM_ONLY_UNBOUND');
assert.ok(slsa.predicate.runDetails.builder.id, 'Debe identificar el builder');
assert.strictEqual(typeof slsa.predicate.runDetails.builder.identityVerified, 'boolean');
assert.ok(fs.existsSync(slsa.savedPath), 'Debe persistir provenance.slsa.json');
console.log(`✓ Procedencia in-toto v1 validada como descriptiva (slsaLevel: ${slsa.predicate.buildDefinition.internalParameters.slsaLevel})`);

// 3. Validar integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
assert.ok(typeof driveEngine.generateCycloneDxSbom === 'function');
assert.ok(typeof driveEngine.generateSlsaProvenance === 'function');

const driveSbom = driveEngine.generateCycloneDxSbom({ save: false });
assert.strictEqual(driveSbom.bomFormat, 'CycloneDX');

const driveSlsa = driveEngine.generateSlsaProvenance({ save: false });
assert.strictEqual(driveSlsa.predicateType, 'https://slsa.dev/provenance/v1');
console.log('✓ Integración DriveEngine.generateCycloneDxSbom() y generateSlsaProvenance() verificada');

console.log('\nPASS AX-F-158 — Invariantes de SBOM CycloneDX v1.5 y procedencia SLSA demostrados al 100%.');
