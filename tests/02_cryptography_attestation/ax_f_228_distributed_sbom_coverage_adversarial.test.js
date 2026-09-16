'use strict';

/**
 * AX-F-228: Cobertura adversarial del SBOM de la superficie distribuida (P0-D).
 *
 * Demuestra que la corrección cierra el SBOM decorativo:
 * 1. Los SBOM versionados coinciden con el estado real del árbol distribuido.
 * 2. Un archivo distribuido con hash distinto, ausente o extra se detecta.
 * 3. La procedencia no reclama nivel SLSA y se ancla al artefacto cuando se aporta.
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const SovereignSBOMGenerator = require('../../tools/sbom_sovereign_generator.js');
const ProvenanceSbomGenerator = require('../../tools/provenance_sbom_generator.js');

console.log('=== AX-F-228 SBOM de superficie distribuida: pruebas adversariales ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sbom = new SovereignSBOMGenerator(ROOT);
const sha256 = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

// 1. Los SBOM versionados deben representar el estado actual
const verificacion = sbom.verifyCommittedSboms();
for (const r of verificacion.results) {
  assert.strictEqual(r.valid, true,
    `SBOM comprometido ${r.path} no representa el árbol: missing=${(r.missing || []).join(', ')} mismatched=${(r.mismatched || []).join(', ')} extra=${(r.extra || []).join(', ')}`);
}
assert.ok(verificacion.results.length >= 2, 'Deben existir los SBOM comprometidos en docs/sbom y sbom/');
console.log(`✓ ${verificacion.results.length} SBOM comprometidos coinciden con la superficie distribuida`);

// 2. Adversarial: mutar el hash de un componente se detecta
const cdxPath = path.join(ROOT, 'docs', 'sbom', 'sbom.cyclonedx.json');
const manifiesto = JSON.parse(fs.readFileSync(cdxPath, 'utf8'));
const indice = manifiesto.components.findIndex((c) => c.name === 'tools/merkle_cache_fast_forward.js');
assert.ok(indice !== -1, 'El SBOM debe incluir la herramienta Merkle');
assert.strictEqual(manifiesto.components[indice].hashes[0].content, sha256(path.join(ROOT, 'tools/merkle_cache_fast_forward.js')));
console.log('✓ El hash del SBOM para tools/merkle_cache_fast_forward.js coincide con el archivo real');

const mutado = JSON.parse(JSON.stringify(manifiesto));
mutado.components[indice].hashes[0].content = 'f'.repeat(64);
const cmpHash = sbom.compareManifestToSurface(mutado);
assert.strictEqual(cmpHash.valid, false);
assert.ok(cmpHash.mismatched.includes('tools/merkle_cache_fast_forward.js'), 'Debe detectar el hash alterado');
console.log('✓ Hash distinto en el SBOM detectado como mismatched');

// 3. Adversarial: eliminar un componente se detecta
const mutadoFaltante = JSON.parse(JSON.stringify(manifiesto));
mutadoFaltante.components.splice(indice, 1);
const cmpFaltante = sbom.compareManifestToSurface(mutadoFaltante);
assert.strictEqual(cmpFaltante.valid, false);
assert.ok(cmpFaltante.missing.includes('tools/merkle_cache_fast_forward.js'), 'Debe detectar el archivo ausente');
console.log('✓ Archivo distribuido ausente detectado como missing');

// 4. Adversarial: componente extra se detecta
const mutadoExtra = JSON.parse(JSON.stringify(manifiesto));
mutadoExtra.components.push({
  type: 'file',
  name: 'tools/archivo-fantasma.js',
  hashes: [{ alg: 'SHA-256', content: 'a'.repeat(64) }]
});
const cmpExtra = sbom.compareManifestToSurface(mutadoExtra);
assert.strictEqual(cmpExtra.valid, false);
assert.ok(cmpExtra.extra.includes('tools/archivo-fantasma.js'), 'Debe detectar el componente extra');
console.log('✓ Componente extra detectado como extra');

// 4b. Reproducibilidad: dos generaciones deben producir bytes idénticos
const otraInstancia = new SovereignSBOMGenerator(ROOT);
const cdx1 = JSON.stringify(sbom.generateCycloneDX());
const cdx2 = JSON.stringify(otraInstancia.generateCycloneDX());
assert.strictEqual(cdx1, cdx2, 'CycloneDX debe ser reproducible byte a byte entre generaciones e instancias');
const spdx1 = JSON.stringify(sbom.generateSPDX());
const spdx2 = JSON.stringify(otraInstancia.generateSPDX());
assert.strictEqual(spdx1, spdx2, 'SPDX debe ser reproducible byte a byte entre generaciones e instancias');
const serial = sbom.generateCycloneDX().serialNumber;
assert.strictEqual(serial, otraInstancia.generateCycloneDX().serialNumber, 'El serialNumber debe derivarse del contenido, no ser aleatorio');
const ts1 = sbom.generateCycloneDX().metadata.timestamp;
assert.strictEqual(ts1, otraInstancia.generateCycloneDX().metadata.timestamp, 'La marca temporal debe ser determinista');
console.log('✓ SBOM reproducible byte a byte (CycloneDX y SPDX, sin reloj ni UUID aleatorio)');

// 5. Procedencia honesta y anclaje de artefacto
const provenance = new ProvenanceSbomGenerator(ROOT);
const sinArtefacto = provenance.generateSlsaProvenance({ save: false });
assert.strictEqual(sinArtefacto.predicate.buildDefinition.internalParameters.slsaLevel, 'NOT_ASSERTED');
assert.strictEqual(sinArtefacto.predicate.buildDefinition.internalParameters.slsaVerification, 'NOT_VERIFIED');
assert.strictEqual(sinArtefacto.predicate.buildDefinition.externalParameters.artifactBinding, 'SBOM_ONLY_UNBOUND');
assert.strictEqual(JSON.stringify(sinArtefacto).includes('SLSA_LEVEL_3'), false, 'No puede aparecer un nivel SLSA reclamado');
assert.ok(sinArtefacto.predicate.buildDefinition.externalParameters.source.includes('Acourd/axion-protocol'), 'El origen del repositorio debe ser el real');
console.log('✓ Procedencia sin reclamo SLSA y con origen correcto');

const artefacto = path.join(os.tmpdir(), `axion-artifact-${Date.now()}.tgz`);
try {
  fs.writeFileSync(artefacto, 'artefacto construido de prueba');
  const conArtefacto = provenance.generateSlsaProvenance({ artifactPath: artefacto, save: false });
  assert.strictEqual(conArtefacto.predicate.buildDefinition.externalParameters.artifactBinding, 'ARTIFACT_HASH_BOUND');
  assert.strictEqual(conArtefacto.subject[0].digest.sha256, sha256(artefacto), 'El subject debe enlazar el hash del artefacto real');
  console.log('✓ Procedencia anclada al hash del artefacto construido');
} finally {
  try {
    fs.rmSync(artefacto, { force: true });
  } catch (_) {
    // limpieza best-effort
  }
}

console.log('\nPASS: AX-F-228 — SBOM de superficie distribuida verificado adversarialmente.');
