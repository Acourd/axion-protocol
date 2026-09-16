#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — CycloneDX SBOM & in-toto Provenance Generator (Descriptive, Not SLSA-Verified)
 *
 * Genera SBOM CycloneDX v1.5 y un Statement in-toto v1 con estructura de procedencia:
 * 1. El SBOM cubre los componentes de código distribuidos por package.json.
 * 2. La procedencia se emite desde la identidad del entorno real (CI o host local).
 * 3. NO se declara ningún nivel SLSA. Este proyecto no emite provenance SLSA verificable
 *    (requiere un builder controlado e identidad de CI atestada). El predicado declara
 *    explícitamente `provenanceStatus: 'DESCRIPTIVE_ONLY'` y `slsaLevel: 'NOT_ASSERTED'`.
 * 4. Si se aporta un artefacto construido (`--artifact <path>`), el subject se enlaza a su
 *    SHA-256 real; si no, el subject apunta solo al digest del SBOM y se declara sin enlace
 *    de artefacto.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_REPO_URL = 'https://github.com/Acourd/axion-protocol';

class ProvenanceSbomGenerator {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
    this.reportsDir = path.join(this.root, '.axion', 'reports');
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
    const fallback = { name: 'axion-protocol', version: '0.0.0-unknown', description: 'Experimental local governance runtime' };
    if (!fs.existsSync(pkgJsonPath)) return fallback;
    try {
      const parsed = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      return Object.assign(fallback, parsed);
    } catch (parseErr) {
      console.warn(`[ProvenanceSbomGenerator] Advertencia al leer package.json: ${parseErr.message}`);
      return fallback;
    }
  }

  repositoryUrl(pkgInfo) {
    const url = pkgInfo.repository && pkgInfo.repository.url ? String(pkgInfo.repository.url) : DEFAULT_REPO_URL;
    return url.replace(/^git\+/, '').replace(/\.git$/, '');
  }

  generateUuid() {
    return crypto.randomUUID ? crypto.randomUUID() : `urn:uuid:${crypto.randomBytes(16).toString('hex')}`;
  }

  /**
   * Identidad real del builder: run de GitHub Actions si está disponible,
   * host local declarado como no verificado en caso contrario.
   */
  resolveBuilder() {
    const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
    const repo = process.env.GITHUB_REPOSITORY;
    const runId = process.env.GITHUB_RUN_ID;
    if (isGitHubActions && repo && runId) {
      return {
        id: `https://github.com/${repo}/actions/runs/${runId}`,
        identityVerified: true,
        environment: 'github-actions'
      };
    }
    return {
      id: 'urn:axion:builder:local-host',
      identityVerified: false,
      environment: 'local-host'
    };
  }

  /**
   * Recolecta componentes de código distribuidos (declarados en package.json#files).
   */
  collectComponents() {
    const components = [];
    const pkgInfo = this.loadPackageInfo();
    const version = pkgInfo.version;

    const roots = new Set();
    const filesField = Array.isArray(pkgInfo.files) ? pkgInfo.files : [];
    for (const entry of filesField) {
      if (typeof entry !== 'string' || entry.startsWith('!')) continue;
      const clean = entry.replace(/\/$/, '');
      roots.add(clean);
    }
    for (const dir of ['tools', 'bin', 'adapters', 'policies', 'schemas', 'core']) {
      roots.add(dir);
    }

    const seen = new Set();
    const pushFile = (absPath) => {
      const relPath = path.relative(this.root, absPath).split(path.sep).join('/');
      if (seen.has(relPath)) return;
      if (relPath === 'package.json') return;
      if (relPath.startsWith('docs/site/') || relPath.startsWith('sbom/') || relPath.startsWith('docs/sbom/')) return;
      if (/\.tgz$/.test(relPath)) return;
      seen.add(relPath);
      components.push({
        type: relPath.startsWith('tools/') || relPath.startsWith('bin/') ? 'application' : 'file',
        name: relPath,
        group: 'axion-protocol.distributed',
        version,
        purl: `pkg:generic/axion-protocol/${relPath}@${version}`,
        hashes: [
          { alg: 'SHA-256', content: this.sha256File(absPath) }
        ],
        properties: [
          { name: 'axion:path', value: relPath },
          { name: 'axion:governed', value: 'true' }
        ]
      });
    };

    for (const rootRel of roots) {
      const abs = path.join(this.root, rootRel);
      if (!fs.existsSync(abs)) continue;
      const stat = fs.statSync(abs);
      if (stat.isFile()) {
        if (!rootRel.startsWith('package.json')) pushFile(abs);
        continue;
      }

      const walk = (dir) => {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          const child = path.join(dir, e.name);
          if (e.isDirectory()) {
            if (e.name === 'node_modules' || e.name.startsWith('.sandbox')) continue;
            walk(child);
          } else if (e.isFile()) {
            pushFile(child);
          }
        }
      };
      walk(abs);
    }

    return components.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Genera el SBOM conforme a CycloneDX v1.5 JSON.
   */
  generateCycloneDxSbom(options = {}) {
    const components = this.collectComponents();
    const pkgInfo = this.loadPackageInfo();
    const version = pkgInfo.version;

    const sbom = {
      bomFormat: 'CycloneDX',
      specVersion: '1.5',
      serialNumber: `urn:uuid:${this.generateUuid()}`,
      version: 1,
      metadata: {
        timestamp: new Date().toISOString(),
        tools: [
          {
            vendor: 'Axion Protocol',
            name: 'ProvenanceSbomGenerator',
            version
          }
        ],
        component: {
          type: 'framework',
          name: pkgInfo.name,
          version,
          description: pkgInfo.description,
          licenses: [{ license: { id: 'Apache-2.0' } }]
        },
        properties: [
          { name: 'axion:provenanceStatus', value: 'DESCRIPTIVE_ONLY' }
        ]
      },
      components,
      dependencies: [
        {
          ref: `pkg:generic/axion-protocol@${version}`,
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
   * Genera un Statement in-toto v1 con estructura de procedencia.
   * Honestidad explícita: no es provenance SLSA verificable y no declara nivel.
   *
   * @param {object} options
   * @param {string} [options.artifactPath] Artefacto construido (p. ej. el .tgz de npm pack).
   * @param {boolean} [options.save]
   */
  generateSlsaProvenance(options = {}) {
    const pkgInfo = this.loadPackageInfo();
    const pkgName = pkgInfo.name || 'axion-protocol';
    const repoUrl = this.repositoryUrl(pkgInfo);
    const builder = this.resolveBuilder();

    const sbom = this.generateCycloneDxSbom({ save: false });
    const sbomDigest = this.sha256(JSON.stringify(sbom));

    let subject;
    let artifactBinding;
    if (options.artifactPath) {
      const absArtifact = path.isAbsolute(options.artifactPath)
        ? options.artifactPath
        : path.resolve(this.root, options.artifactPath);
      if (!fs.existsSync(absArtifact) || !fs.statSync(absArtifact).isFile()) {
        throw new Error(`Artefacto para provenance no existe: ${options.artifactPath}`);
      }
      subject = [
        {
          name: path.basename(absArtifact),
          digest: { sha256: this.sha256File(absArtifact) }
        }
      ];
      artifactBinding = 'ARTIFACT_HASH_BOUND';
    } else {
      subject = [
        {
          name: pkgName,
          digest: { sha256: sbomDigest }
        }
      ];
      artifactBinding = 'SBOM_ONLY_UNBOUND';
    }

    const statement = {
      _type: 'https://in-toto.io/Statement/v1',
      subject,
      predicateType: 'https://slsa.dev/provenance/v1',
      predicate: {
        buildDefinition: {
          buildType: 'https://axion-protocol.dev/governance/build/v1',
          externalParameters: {
            source: repoUrl,
            entryPoint: 'bin/axion.js',
            artifactBinding
          },
          internalParameters: {
            provenanceStatus: 'DESCRIPTIVE_ONLY',
            slsaLevel: 'NOT_ASSERTED',
            slsaVerification: 'NOT_VERIFIED',
            note: 'Procedencia descriptiva emitida localmente. Este proyecto no emite provenance SLSA verificable y no reclama ningún nivel.',
            governanceEngine: 'Axion Dual-Surface Protocol'
          },
          resolvedDependencies: [
            {
              uri: `pkg:generic/node@${process.version}`,
              digest: { runtime: 'node-stdlib-only' }
            }
          ]
        },
        runDetails: {
          builder: {
            id: builder.id,
            identityVerified: builder.identityVerified,
            environment: builder.environment
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
  const args = process.argv.slice(2);
  const artifactIndex = args.indexOf('--artifact');
  const artifactPath = artifactIndex !== -1 ? args[artifactIndex + 1] : null;

  console.log('[Axion Provenance & SBOM] Generando SBOM CycloneDX v1.5 y procedencia descriptiva (NO SLSA-verificada)...\n');

  const sbom = generator.generateCycloneDxSbom();
  console.log(`✓ SBOM CycloneDX v1.5 generado con ${sbom.components.length} componentes distribuidos.`);
  console.log(`  Guardado en: ${sbom.savedPath}`);

  const provenance = generator.generateSlsaProvenance({ artifactPath });
  console.log(`✓ Statement in-toto con estructura de procedencia generado (provenanceStatus: DESCRIPTIVE_ONLY).`);
  console.log(`  Guardado en: ${provenance.savedPath}`);

  console.log('\nPASS: SBOM generado. La procedencia es descriptiva y no reclama nivel SLSA.');
}

module.exports = ProvenanceSbomGenerator;
