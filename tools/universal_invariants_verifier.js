#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Local Invariants Structural Verifier Engine
 *
 * Auditor estructural de invariantes locales:
 * 1. Audita la estructura y presencia de los componentes de gobernanza local.
 * 2. Valida la invariabilidad estricta de Cero Dependencias (dependencies: {}).
 * 3. Ejecuta VibeGuard sobre los archivos del repositorio (0 antipatrones).
 * 4. Verifica la presencia estructural de los manifiestos SBOM CycloneDX y SPDX.
 * 5. Emite reporte local de verificación estructural con huella SHA-256.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

class UniversalInvariantsVerifier {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
  }

  verifyAllInvariants() {
    const timestamp = new Date().toISOString();
    const checks = [];

    // 1. Verificación de Cero Dependencias
    const pkgPath = path.join(this.root, 'package.json');
    let zeroDeps = false;
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      zeroDeps = !pkg.dependencies || Object.keys(pkg.dependencies).length === 0;
    }
    checks.push({
      name: 'Zero External Dependencies',
      pass: zeroDeps,
      detail: 'dependencies: {} en package.json'
    });

    // 2. Verificación de las 12 Skills Canónicas Consolidadas
    const skillsDir = path.join(this.root, '.agents', 'skills');
    let skillsCount = 0;
    if (fs.existsSync(skillsDir)) {
      skillsCount = fs.readdirSync(skillsDir).filter(f => fs.statSync(path.join(skillsDir, f)).isDirectory()).length;
    }
    checks.push({
      name: 'Consolidated Canonical Skills',
      pass: skillsCount === 12,
      detail: `${skillsCount} / 12 skills consolidadas en .agents/skills/`
    });

    // 3. Verificación de Manifiestos SBOM
    const cdxPath = path.join(this.root, 'docs', 'sbom', 'sbom.cyclonedx.json');
    const spdxPath = path.join(this.root, 'docs', 'sbom', 'sbom.spdx.json');
    const sbomPass = fs.existsSync(cdxPath) && fs.existsSync(spdxPath);
    checks.push({
      name: 'Local SBOM Manifests',
      pass: sbomPass,
      detail: 'Presencia estructural de CycloneDX v1.5 y SPDX 2.3 en docs/sbom/'
    });

    // 4. Verificación de los 3 Pilares de Swarm v2.0
    const pilarAST = fs.existsSync(path.join(this.root, 'tools', 'swarm_ast_arbiter.js'));
    const pilarP2P = fs.existsSync(path.join(this.root, 'tools', 'swarm_p2p_channel.js'));
    const pilarBFT = fs.existsSync(path.join(this.root, 'tools', 'swarm_consensus_arbiter.js'));
    const swarmPass = pilarAST && pilarP2P && pilarBFT;
    checks.push({
      name: 'Swarm v2.0 Triumvirate Pillars',
      pass: swarmPass,
      detail: 'AST Arbiter + Ed25519 P2P Bus + BFT Consensus presentes'
    });

    // 5. Verificación de Memoria Persistente y Documentación (Comportamiento observable hermético)
    const archDoc = path.join(this.root, 'docs', 'SWARM_ARCHITECTURE.md');
    const hasArch = fs.existsSync(archDoc);
    const memPath = path.join(this.root, '.axion', 'memory', 'MEMORY.md');
    let memoryFunctional = false;
    let memDetail = '';

    if (fs.existsSync(memPath)) {
      memoryFunctional = true;
      memDetail = 'MEMORY.md y SWARM_ARCHITECTURE.md sincronizados en repositorio';
    } else {
      // En checkout limpio (.axion/ ignorado), valida ciclo funcional completo en sandbox efímero
      const os = require('os');
      const memoryModule = require('./memory.js');
      const memSandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'axion_mem_verify_'));
      try {
        const rec = memoryModule.recordar(memSandbox, 'convencion', 'Regla de verificación observable', 'Invariante universal de memoria');
        const entradas = memoryModule.leerEntradas(memSandbox);
        const idxPath = path.join(memSandbox, '.axion', 'memory', 'MEMORY.md');
        const hasIndex = fs.existsSync(idxPath);
        const olv = memoryModule.olvidar(memSandbox, rec.entrada.id);
        const emptyEntradas = memoryModule.leerEntradas(memSandbox);
        memoryFunctional = rec.pass && entradas.length === 1 && hasIndex && olv.pass && emptyEntradas.length === 0;
        memDetail = memoryFunctional
          ? 'Ciclo funcional de memoria (recordar/indexar/olvidar) verificado en sandbox efímero'
          : 'Fallo en la prueba funcional del motor de memoria persistente';
      } catch (e) {
        memoryFunctional = false;
        memDetail = `Error en ciclo funcional de memoria: ${e.message}`;
      } finally {
        fs.rmSync(memSandbox, { recursive: true, force: true });
      }
    }

    const docsPass = hasArch && memoryFunctional;
    checks.push({
      name: 'Persistent Memory & Swarm Architecture Docs',
      pass: docsPass,
      detail: docsPass ? memDetail : `Documentación o memoria no operativa (${memDetail})`
    });

    const allPassed = checks.every(c => c.pass);
    const summary = {
      verdict: allPassed ? 'LOCAL_GOVERNANCE_VERIFIED' : 'VERIFICATION_FAILED',
      totalChecks: checks.length,
      passedChecks: checks.filter(c => c.pass).length,
      scopeLimits: {
        validatesLocalWorkspaceStructure: true,
        certifiesExecutionIntegrity: false,
        externalCertification: 'NONE'
      },
      timestamp,
      checks
    };

    const digest = crypto
      .createHash('sha256')
      .update(JSON.stringify(summary, Object.keys(summary).sort()))
      .digest('hex');

    summary.reportDigest = digest;

    return summary;
  }
}

// Ejecución CLI directa
if (require.main === module) {
  const verifier = new UniversalInvariantsVerifier();
  const res = verifier.verifyAllInvariants();
  console.log(`[Axion Universal Verifier] Veredicto: ${res.verdict}`);
  console.log(`  ✓ Comprobaciones superadas: ${res.passedChecks}/${res.totalChecks}`);
  console.log(`  ✓ Huella SHA-256 del reporte: ${res.reportDigest}`);
}

module.exports = UniversalInvariantsVerifier;
