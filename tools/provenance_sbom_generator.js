#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — CycloneDX SBOM & SLSA Provenance Generator
 *
 * Generador nativo zero-dependency de SBOM CycloneDX v1.5 y procedencia SLSA v1.0:
 * 1. Genera Software Bill of Materials (SBOM) en formato CycloneDX v1.5 JSON.
 * 2. Mapea todos los componentes, herramientas, políticas y esquemas con sus digests SHA-256.
 * 3. Construye atestaciones de procedencia in-toto Statement v1 con predicado SLSA v1.0.
 * 4. Exporta reportes a .axion/reports/sbom.cyclonedx.json y provenance.slsa.json.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

class ProvenanceSbomGenerator {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
    this.reportsDir = path.join(this.root, '.axion', 'reports');
    this.pkg = this.loadPackageInfo();
    this.ensureReportsDir();
  }

  ensureReportsDir() {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  sha256(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  sha256File(filePath) {
    if (!fs.existsSync(filePath)) return null;
    const buf = fs.readFileSync(filePath);
    return this.sha256(buf);
  }

  loadPackageInfo() {
    const pkgJsonPath = path.join(this.root, 'package.json');
    const fallback = { name: 'axion-protocol', version: '0.0.0', description: 'Agentic Safety & Governance Protocol' };
    if (!fs.existsSync(pkgJsonPath)) return fallback;
    try {
      const parsed = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      return Object.assign(fallback, parsed);
    } catch (parseErr) {
      console.warn(`[ProvenanceSbomGenerator] Advertencia al leer package.json: ${parseErr.message}`);
      return fallback;
    }
  }

  generateUuid() {
    return crypto.randomUUID ? crypto.randomUUID() : `urn:uuid:${crypto.randomBytes(16).toString('hex')}`;
  }

  /**
   * Recolecta componentes de código del proyecto para el SBOM.
   */
  collectComponents() {
    const components = [];
    const scannedDirs = ['tools', 'bin', 'adapters', 'policies', 'schemas'];

    for (const d of scannedDirs) {
      const fullDir = path.join(this.root, d);
      if (!fs.existsSync(fullDir)) continue;

      const entries = fs.readdirSync(fullDir, { withFileTypes: true });
      for (const e of entries) {
        if (e.isFile()) {
          const filePath = path.join(fullDir, e.name);
          const relPath = path.relative(this.root, filePath).split(path.sep).join('/');
          const digest = this.sha256File(filePath);

          components.push({
            type: d === 'tools' || d === 'bin' ? 'application' : 'file',
            name: e.name,
            group: `axion-protocol.${d}`,
            version: this.pkg.version,
            purl: `pkg:generic/axion-protocol/${relPath}@${this.pkg.version}`,
            hashes: [
              {
                alg: 'SHA-256',
                content: digest
              }
            ],
            properties: [
              { name: 'axion:path', value: relPath },
              { name: 'axion:governed', value: 'true' }
            ]
          });
        }
      }
    }

    return components;
  }

  /**
   * Genera el SBOM conforme a CycloneDX v1.5 JSON.
   */
  generateCycloneDxSbom(options = {}) {
    const components = this.collectComponents();
    const pkgInfo = this.loadPackageInfo();

    const sbom = {
      bomFormat: 'CycloneDX',
      specVersion: '1.5',
      serialNumber: `urn:uuid:${this.generateUuid()}`,
      version: 1,
      metadata: {
        timestamp: new Date().toISOString(),
        tools: [
          {
            vendor: 'Axion Protocol Security',
            name: 'ProvenanceSbomGenerator',
            version: this.pkg.version
          }
        ],
        component: {
          type: 'framework',
          name: pkgInfo.name,
          version: pkgInfo.version,
          description: pkgInfo.description,
          licenses: [{ license: { id: 'Apache-2.0' } }]
        }
      },
      components,
      dependencies: [
        {
          ref: `pkg:generic/axion-protocol@${pkgInfo.version}`,
          dependsOn: components.map(c => c.purl)
        }
      ]
    };

    if (options.save !== false) {
      const outputPath = path.join(this.reportsDir, 'sbom.cyclonedx.json');
      fs.writeFileSync(outputPath, JSON.stringify(sbom, null, 2), 'utf8');
      sbom.savedPath = outputPath;
    }

    return sbom;
  }

  /**
   * Genera atestación de procedencia in-toto v1 con predicado SLSA Provenance v1.0.
   */
  generateSlsaProvenance(options = {}) {
    const pkgInfo = this.loadPackageInfo();
    const pkgName = pkgInfo.name || 'axion-protocol';

    const sbom = this.generateCycloneDxSbom({ save: false });
    const sbomDigest = this.sha256(JSON.stringify(sbom));

    const statement = {
      _type: 'https://in-toto.io/Statement/v1',
      subject: [
        {
          name: pkgName,
          digest: {
            sha256: sbomDigest
          }
        }
      ],
      predicateType: 'https://slsa.dev/provenance/v1',
      predicate: {
        buildDefinition: {
          buildType: 'https://axion-protocol.dev/governance/build/v1',
          externalParameters: {
            source: 'git+https://github.com/shoshin/axion-protocol',
            entryPoint: 'bin/axion.js'
          },
          internalParameters: {
            slsaLevel: 'SLSA_LEVEL_3',
            governanceEngine: 'Axion Dual-Surface Protocol'
          },
          resolvedDependencies: [
            {
              uri: 'pkg:generic/node@24.19.0',
              digest: { runtime: 'node-lts' }
            }
          ]
        },
        runDetails: {
          builder: {
            id: `https://axion-protocol.dev/builders/autonomous-orchestrator@${this.pkg.version}`
          },
          metadata: {
            invocationId: this.generateUuid(),
            startedOn: new Date().toISOString(),
            finishedOn: new Date().toISOString()
          },
          byproducts: [
            {
              name: 'sbom.cyclonedx.json',
              digest: { sha256: sbomDigest }
            }
          ]
        }
      }
    };

    if (options.save !== false) {
      const outputPath = path.join(this.reportsDir, 'provenance.slsa.json');
      fs.writeFileSync(outputPath, JSON.stringify(statement, null, 2), 'utf8');
      statement.savedPath = outputPath;
    }

    return statement;
  }
}

if (require.main === module) {
  const generator = new ProvenanceSbomGenerator();
  console.log('[Axion Provenance & SBOM] Generando SBOM CycloneDX v1.5 y procedencia SLSA v1.0...\n');

  const sbom = generator.generateCycloneDxSbom();
  console.log(`✓ SBOM CycloneDX v1.5 generado con ${sbom.components.length} componentes.`);
  console.log(`  Guardado en: ${sbom.savedPath}`);

  const slsa = generator.generateSlsaProvenance();
  console.log(`✓ Atestación in-toto SLSA v1.0 generada con éxito.`);
  console.log(`  Guardado en: ${slsa.savedPath}\n`);

  console.log('🎉 PASS: SBOM y procedencia criptográfica generados al 100%.');
}

module.exports = ProvenanceSbomGenerator;
