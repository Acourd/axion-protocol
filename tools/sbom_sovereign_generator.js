#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Sovereign SBOM (Software Bill of Materials) Generator
 *
 * Genera manifiestos SBOM deterministas para inventario local de componentes:
 * 1. La superficie indexada es la realmente distribuida: se expande `package.json#files`
 *    (respetando exclusiones), más los archivos que npm publica siempre. Los SBOM de
 *    salida y `docs/site/` quedan excluidos para evitar auto-referencia.
 * 2. Cero dependencias externas: indexación nativa de hashes SHA-256 de módulos locales.
 * 3. Declaración de 'Zero Third-Party Dependencies' basada en package.json y el inventario local generado (dependencies: {}).
 * 4. Genera inventarios locales con hashes SHA-256, sin certificar procedencia, autoridad externa ni integridad de ejecución.
 * 5. `verifyCommittedSboms()` compara los SBOM versionados contra el estado real del
 *    árbol: si un archivo distribuido falta o cambió de hash, la verificación falla.
 *
 * Ubicación canónica de salida: docs/sbom/ (con réplica espejo en sbom/ para compatibilidad).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

const ALWAYS_PUBLISHED = ['package.json', 'README.md', 'LICENSE', 'NOTICE'];
// Excluidos por no publicarse (package.json#files niega docs/site) o por no ser código.
const NON_PUBLISHED_PREFIXES = ['docs/site/'];
// Excluidos del inventario por autorreferencia: el SBOM no puede hashearse a sí mismo.
const SELF_REFERENCE_PREFIXES = ['docs/sbom/', 'sbom/'];

/**
 * Marca temporal reproducible: SOURCE_DATE_EPOCH si está definido, o el epoch.
 * Nunca se usa el reloj de pared: dos ejecuciones deben producir bytes idénticos.
 */
function deterministicTimestamp() {
  const raw = Number(process.env.SOURCE_DATE_EPOCH);
  const ms = Number.isFinite(raw) && raw > 0 ? raw * 1000 : 0;
  return new Date(ms).toISOString();
}

/**
 * Identificador estable derivado del contenido (UUID con forma canónica).
 */
function contentUuid(content) {
  const h = crypto.createHash('sha256').update(content).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

class SovereignSBOMGenerator {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
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

  loadPackageInfo() {
    const pkgPath = path.join(this.root, 'package.json');
    if (!fs.existsSync(pkgPath)) return { files: [] };
    try {
      return JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    } catch (_) {
      return { files: [] };
    }
  }

  isNonPublished(relPath) {
    const normalized = relPath.split(path.sep).join('/');
    if (NON_PUBLISHED_PREFIXES.some((p) => normalized.startsWith(p))) return true;
    if (/\.tgz$/.test(normalized)) return true;
    if (normalized.split('/').some((seg) => seg === 'node_modules' || seg.startsWith('.sandbox'))) return true;
    return false;
  }

  isSelfReference(relPath) {
    const normalized = relPath.split(path.sep).join('/');
    return SELF_REFERENCE_PREFIXES.some((p) => normalized.startsWith(p));
  }

  /**
   * Candidatos publicados (npm pack): package.json#files + archivos siempre publicados,
   * sin exclusiones de autorreferencia. Incluye los propios SBOM bajo docs/sbom/.
   */
  publishedCandidates() {
    const pkg = this.loadPackageInfo();
    const files = [];
    const seen = new Set();

    const pushFile = (absPath) => {
      const relPath = path.relative(this.root, absPath).split(path.sep).join('/');
      if (this.isNonPublished(relPath) || seen.has(relPath)) return;
      seen.add(relPath);
      const content = fs.readFileSync(absPath);
      files.push({
        path: relPath,
        sizeBytes: content.length,
        sha256: crypto.createHash('sha256').update(content).digest('hex')
      });
    };

    for (const entry of ALWAYS_PUBLISHED) {
      const abs = path.join(this.root, entry);
      if (fs.existsSync(abs) && fs.statSync(abs).isFile()) pushFile(abs);
    }

    const entries = Array.isArray(pkg.files) ? pkg.files : [];
    for (const entry of entries) {
      if (typeof entry !== 'string' || entry.startsWith('!')) continue;
      const clean = entry.replace(/\/$/, '');
      if (this.isNonPublished(clean)) continue;
      const abs = path.join(this.root, clean);
      if (!fs.existsSync(abs)) continue;

      if (fs.statSync(abs).isFile()) {
        pushFile(abs);
        continue;
      }

      const walk = (d) => {
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
          const child = path.join(d, e.name);
          if (e.isDirectory()) {
            walk(child);
          } else if (e.isFile()) {
            pushFile(child);
          }
        }
      };
      walk(abs);
    }

    return files.sort((a, b) => a.path.localeCompare(b.path));
  }

  /**
   * Archivos publicados que quedan fuera del inventario por autorreferencia.
   * Se declaran explícitamente en el SBOM (metadata/documentComment + conteo).
   */
  selfReferenceExclusions() {
    return this.publishedCandidates()
      .filter((f) => this.isSelfReference(f.path))
      .map((f) => ({ path: f.path, reason: 'self-reference: el SBOM no puede hashearse a sí mismo' }))
      .sort((a, b) => a.path.localeCompare(b.path));
  }

  /**
   * Superficie distribuida indexada: candidatos publicados menos las exclusiones
   * autorreferenciales declaradas.
   */
  distributedSurface() {
    return this.publishedCandidates().filter((f) => !this.isSelfReference(f.path));
  }

  /**
   * Genera el SBOM en formato CycloneDX v1.5 JSON.
   */
  generateCycloneDX() {
    const version = this.getPackageVersion();
    const files = this.distributedSurface();
    const excluded = this.selfReferenceExclusions();
    const timestamp = deterministicTimestamp();
    const serialNumber = `urn:uuid:${contentUuid(JSON.stringify(files))}`;

    const components = files.map((f) => ({
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
          { vendor: 'Axion Protocol', name: 'SovereignSBOMGenerator', version: '3.0.0' }
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
          { name: 'axion:runtimeIntegrity', value: 'FAIL_CLOSED' },
          { name: 'axion:sbomSurface', value: 'package.json#files (publish surface)' },
          { name: 'axion:sbomIncludedCount', value: String(files.length) },
          { name: 'axion:sbomExcludedCount', value: String(excluded.length) },
          { name: 'axion:sbomExcludedSelfReference', value: JSON.stringify(excluded) }
        ]
      },
      components
    };
  }

  /**
   * Genera el SBOM en formato SPDX 2.3 JSON.
   */
  generateSPDX() {
    const version = this.getPackageVersion();
    const files = this.distributedSurface();
    const excluded = this.selfReferenceExclusions();
    const timestamp = deterministicTimestamp();
    const surfaceDigest = crypto.createHash('sha256').update(JSON.stringify(files)).digest('hex');

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
      documentNamespace: `https://github.com/Acourd/axion-protocol/spdx/${surfaceDigest}`,
      documentComment: `Superficie publicada indexada: ${files.length} archivos. Excluidos por autorreferencia (declarados): ${excluded.length} — ${excluded.map((e) => e.path).join(', ') || 'ninguno'}.`,
      creationInfo: {
        created: timestamp,
        creators: ['Tool: SovereignSBOMGenerator-3.0.0', 'Organization: Axion Protocol']
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
   * Compara un manifiesto CycloneDX contra la superficie real.
   * Devuelve missing/mismatched/extra y `valid` solo si los tres están vacíos.
   */
  compareManifestToSurface(manifest) {
    const expected = new Map(this.distributedSurface().map((f) => [f.path, f.sha256]));
    const declared = new Map();
    for (const comp of (manifest && manifest.components) || []) {
      const hashEntry = (comp.hashes || []).find((h) => h.alg === 'SHA-256');
      declared.set(comp.name, hashEntry ? hashEntry.content : null);
    }

    const missing = [...expected.keys()].filter((k) => !declared.has(k));
    const mismatched = [...expected.keys()].filter((k) => declared.has(k) && declared.get(k) !== expected.get(k));
    const extra = [...declared.keys()].filter((k) => !expected.has(k));

    return {
      valid: missing.length === 0 && mismatched.length === 0 && extra.length === 0,
      expectedCount: expected.size,
      declaredCount: declared.size,
      missing,
      mismatched,
      extra
    };
  }

  /**
   * Compara un manifiesto SPDX 2.3 contra la superficie real.
   */
  compareSpdxManifestToSurface(manifest) {
    const expected = new Map(this.distributedSurface().map((f) => [f.path, f.sha256]));
    const declared = new Map();
    for (const file of (manifest && manifest.files) || []) {
      const name = String(file.fileName || '').replace(/^\.\//, '');
      const checksum = (file.checksums || []).find((c) => c.algorithm === 'SHA256');
      declared.set(name, checksum ? checksum.checksumValue : null);
    }

    const missing = [...expected.keys()].filter((k) => !declared.has(k));
    const mismatched = [...expected.keys()].filter((k) => declared.has(k) && declared.get(k) !== expected.get(k));
    const extra = [...declared.keys()].filter((k) => !expected.has(k));

    return {
      valid: missing.length === 0 && mismatched.length === 0 && extra.length === 0,
      expectedCount: expected.size,
      declaredCount: declared.size,
      missing,
      mismatched,
      extra
    };
  }

  /**
   * Verifica los SBOM versionados (CycloneDX y SPDX) contra el estado actual del árbol.
   */
  verifyCommittedSboms() {
    const locations = [
      { path: path.join(this.root, 'docs', 'sbom', 'sbom.cyclonedx.json'), kind: 'cyclonedx' },
      { path: path.join(this.root, 'sbom', 'sbom.cyclonedx.json'), kind: 'cyclonedx' },
      { path: path.join(this.root, 'docs', 'sbom', 'sbom.spdx.json'), kind: 'spdx' },
      { path: path.join(this.root, 'sbom', 'sbom.spdx.json'), kind: 'spdx' }
    ];

    const results = locations.map(({ path: location, kind }) => {
      const rel = path.relative(this.root, location).split(path.sep).join('/');
      if (!fs.existsSync(location)) {
        return { path: rel, kind, valid: false, reason: 'MISSING_COMMITTED_SBOM' };
      }
      let manifest;
      try {
        manifest = JSON.parse(fs.readFileSync(location, 'utf8'));
      } catch (parseErr) {
        return { path: rel, kind, valid: false, reason: `UNREADABLE_COMMITTED_SBOM: ${parseErr.message}` };
      }
      const comparacion = kind === 'spdx'
        ? this.compareSpdxManifestToSurface(manifest)
        : this.compareManifestToSurface(manifest);
      return { path: rel, kind, ...comparacion };
    });

    return {
      valid: results.length > 0 && results.every((r) => r.valid),
      results
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
  const args = process.argv.slice(2);

  if (args.includes('--verify')) {
    const verification = sbom.verifyCommittedSboms();
    for (const r of verification.results) {
      console.log(`[${r.valid ? 'OK' : 'FALLO'}] ${r.path} (${r.kind}; declarados: ${r.declaredCount}, esperados: ${r.expectedCount})`);
      if (!r.valid) {
        console.log(`  missing: ${(r.missing || []).slice(0, 5).join(', ')}${(r.missing || []).length > 5 ? ' ...' : ''}`);
        console.log(`  mismatched: ${(r.mismatched || []).slice(0, 5).join(', ')}${(r.mismatched || []).length > 5 ? ' ...' : ''}`);
        console.log(`  extra: ${(r.extra || []).slice(0, 5).join(', ')}${(r.extra || []).length > 5 ? ' ...' : ''}`);
      }
    }
    process.exit(verification.valid ? 0 : 1);
  }

  const res = sbom.exportSBOMs();
  console.log(`[Axion Sovereign SBOM] Manifiestos generados exitosamente (${res.componentCount} archivos de la superficie distribuida):`);
  console.log(`  ✓ CycloneDX: ${res.cdxPath}`);
  console.log(`  ✓ SPDX 2.3 : ${res.spdxPath}`);
}

module.exports = SovereignSBOMGenerator;
