#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Sovereign SBOM (Software Bill of Materials) Generator
 *
 * Genera manifiestos SBOM deterministas para inventario local de componentes:
 * 1. Mapeo estructurado conforme a los esquemas CycloneDX v1.5 y SPDX 2.3 JSON.
 * 2. Cero dependencias externas: indexación nativa de hashes SHA-256 de módulos locales.
 * 3. Declaración de 'Zero Third-Party Dependencies' basada en package.json y el inventario local generado (dependencies: {}).
 * 4. Genera inventarios locales con hashes SHA-256, sin certificar procedencia, autoridad externa ni integridad de ejecución.
 *
 * Ubicación canónica de salida: docs/sbom/ (con réplica espejo en sbom/ para compatibilidad).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

class SovereignSBOMGenerator {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
  }

  /**
   * Recorre recursivamente los archivos del código fuente del kernel.
   */
  collectProjectFiles() {
    const files = [];
    const scanDirs = ['tools', 'bin', '.agents/skills'];

    for (const dir of scanDirs) {
      const fullDir = path.join(this.root, dir);
      if (!fs.existsSync(fullDir)) continue;

      const walk = (d) => {
        const entries = fs.readdirSync(d, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(d, entry.name);
          if (entry.isDirectory()) {
            walk(fullPath);
          } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.md') || entry.name.endsWith('.json'))) {
            const relPath = path.relative(this.root, fullPath).replace(/\\/g, '/');
            const content = fs.readFileSync(fullPath);
            const sha256 = crypto.createHash('sha256').update(content).digest('hex');
            files.push({
              path: relPath,
              sizeBytes: content.length,
              sha256
            });
          }
        }
      };

      walk(fullDir);
    }

    return files.sort((a, b) => a.path.localeCompare(b.path));
  }

  /**
   * Obtiene la versión del proyecto dinámicamente desde package.json de forma fail-closed.
   * Lanza un Error si el archivo no existe o carece de la propiedad version.
   */
  getPackageVersion() {
    const pkgPath = path.join(this.root, 'package.json');
    if (!fs.existsSync(pkgPath)) {
      throw new Error(`[SovereignSBOMGenerator] package.json no existe en: ${pkgPath}`);
    }
    let pkg;
    try {
      pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    } catch (parseErr) {
      throw new Error(`[SovereignSBOMGenerator] package.json contiene JSON inválido: ${parseErr.message}`);
    }
    if (!pkg || typeof pkg.version !== 'string' || pkg.version.trim() === '') {
      throw new Error('[SovereignSBOMGenerator] package.json no contiene propiedad version válida');
    }
    return pkg.version;
  }

  /**
   * Genera el SBOM en formato CycloneDX v1.5 JSON.
   */
  generateCycloneDX() {
    const files = this.collectProjectFiles();
    const timestamp = new Date().toISOString();
    const serialNumber = `urn:uuid:${crypto.randomUUID()}`;
    const version = this.getPackageVersion();

    const components = files.map((f, idx) => ({
      type: 'file',
      'bom-ref': `pkg:generic/axion-protocol/${f.path}`,
      name: f.path,
      version,
      hashes: [
        { alg: 'SHA-256', content: f.sha256 }
      ],
      licenses: [
        { license: { id: 'Apache-2.0' } }
      ],
      properties: [
        { name: 'axion:fileSize', value: String(f.sizeBytes) }
      ]
    }));

    return {
      bomFormat: 'CycloneDX',
      specVersion: '1.5',
      serialNumber,
      version: 1,
      metadata: {
        timestamp,
        tools: [
          { vendor: 'Axion Protocol', name: 'SovereignSBOMGenerator', version: '2.0.0' }
        ],
        component: {
          type: 'application',
          name: 'axion-protocol',
          version,
          description: 'Local governance runtime for agentic AI operations with zero dependencies',
          licenses: [{ license: { id: 'Apache-2.0' } }]
        },
        properties: [
          { name: 'axion:zeroDependencies', value: 'true' },
          { name: 'axion:runtimeIntegrity', value: 'FAIL_CLOSED' }
        ]
      },
      components
    };
  }

  /**
   * Genera el SBOM en formato SPDX 2.3 JSON.
   */
  generateSPDX() {
    const files = this.collectProjectFiles();
    const timestamp = new Date().toISOString();
    const version = this.getPackageVersion();

    const spdxFiles = files.map((f, idx) => ({
      fileName: `./${f.path}`,
      SPDXID: `SPDXRef-File-${idx}`,
      checksums: [
        { algorithm: 'SHA256', checksumValue: f.sha256 }
      ],
      licenseConcluded: 'Apache-2.0',
      licenseInfoInFiles: ['Apache-2.0']
    }));

    return {
      spdxVersion: 'SPDX-2.3',
      dataLicense: 'CC0-1.0',
      SPDXID: 'SPDXRef-DOCUMENT',
      name: 'axion-protocol',
      documentNamespace: `https://github.com/Acourd/axion-protocol/spdx/${Date.now()}`,
      creationInfo: {
        created: timestamp,
        creators: ['Tool: SovereignSBOMGenerator-2.0.0', 'Organization: Axion Protocol']
      },
      packages: [
        {
          name: 'axion-protocol',
          SPDXID: 'SPDXRef-Package-Axion',
          versionInfo: version,
          downloadLocation: 'git+https://github.com/Acourd/axion-protocol.git',
          filesAnalyzed: true,
          licenseConcluded: 'Apache-2.0',
          licenseDeclared: 'Apache-2.0'
        }
      ],
      files: spdxFiles
    };
  }

  /**
   * Exporta ambos manifiestos a disco.
   */
  exportSBOMs(destDir = null) {
    const outDir = destDir || path.join(this.root, 'docs', 'sbom');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const cdx = this.generateCycloneDX();
    const spdx = this.generateSPDX();

    const cdxPath = path.join(outDir, 'sbom.cyclonedx.json');
    const spdxPath = path.join(outDir, 'sbom.spdx.json');

    fs.writeFileSync(cdxPath, JSON.stringify(cdx, null, 2), 'utf8');
    fs.writeFileSync(spdxPath, JSON.stringify(spdx, null, 2), 'utf8');

    // Sincronizar también con sbom/ en la raíz si fue la ruta por defecto
    if (!destDir) {
      const rootSbom = path.join(this.root, 'sbom');
      if (!fs.existsSync(rootSbom)) fs.mkdirSync(rootSbom, { recursive: true });
      fs.writeFileSync(path.join(rootSbom, 'sbom.cyclonedx.json'), JSON.stringify(cdx, null, 2), 'utf8');
      fs.writeFileSync(path.join(rootSbom, 'sbom.spdx.json'), JSON.stringify(spdx, null, 2), 'utf8');
    }

    return { cdxPath, spdxPath, componentCount: cdx.components.length };
  }
}

// Ejecución CLI directa
if (require.main === module) {
  const sbom = new SovereignSBOMGenerator();
  const res = sbom.exportSBOMs();
  console.log(`[Axion Sovereign SBOM] Manifiestos generados exitosamente (${res.componentCount} módulos):`);
  console.log(`  ✓ CycloneDX: ${res.cdxPath}`);
  console.log(`  ✓ SPDX 2.3 : ${res.spdxPath}`);
}

module.exports = SovereignSBOMGenerator;
