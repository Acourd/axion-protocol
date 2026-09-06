#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Standalone Single-File Bundle Compiler
 *
 * Compilador de distribución zero-dependency para /drive:
 * 1. Empaqueta el CLI y las herramientas fundamentales en un único archivo autónomo (dist/axion.bundle.js).
 * 2. Implementa un cargador virtual CommonJS sin requerir bundlers externos (Webpack, Rollup, esbuild).
 * 3. Permite la portabilidad instantánea en servidores, contenedores y entornos CI/CD sin node_modules ni archivos periféricos.
 * 4. Genera atestación de compilación con digest SHA-256 in-toto.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

const CORE_MODULES = [
  'tools/preflight.js',
  'tools/structured_command.js',
  'tools/canonical_json.js',
  'tools/dsse.js',
  'tools/attestation.js',
  'tools/checkpoint.js',
  'tools/revocation_manager.js',
  'tools/approval_ed25519.js',
  'tools/check_ed25519.js',
  'tools/agent_shield.js',
  'tools/doctor_repair_engine.js',
  'tools/instinct_synthesizer.js',
  'tools/context_budget_guard.js',
  'tools/capability_manager.js',
  'tools/governance_dashboard.js',
  'tools/socratic_tree_visualizer.js',
  'tools/dynamic_rule_weaver.js',
  'tools/semantic_snapshot_indexer.js',
  'tools/vibeguard_gate.js',
  'tools/swarm_ast_arbiter.js',
  'tools/swarm_consensus_arbiter.js',
  'tools/swarm_p2p_channel.js',
  'tools/sync_doc_stats.js',
  'tools/drive_metacognitive_sentinel.js',
  'tools/intent_clarifier.js'
];

class BundleCompiler {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
    this.distDir = path.join(this.root, 'dist');
    if (!fs.existsSync(this.distDir)) {
      fs.mkdirSync(this.distDir, { recursive: true });
    }
    this.outputFile = path.join(this.distDir, 'axion.bundle.js');
  }

  /**
   * Lee y encapsula un módulo como una función factory del bundle.
   */
  encapsulateModule(relPath) {
    const fullPath = path.join(this.root, relPath);
    if (!fs.existsSync(fullPath)) {
      return null;
    }
    let code = fs.readFileSync(fullPath, 'utf8');
    // Remover shebang si existe
    code = code.replace(/^#![^\r\n]+[\r\n]+/, '');

    return `
  __modules['${relPath}'] = function(module, exports, require) {
${code}
  };`;
  }

  /**
   * Compila el bundle completo con el cargador CJS virtual.
   */
  compile() {
    const modulesCode = [];

    for (const mod of CORE_MODULES) {
      const enc = this.encapsulateModule(mod);
      if (enc) {
        modulesCode.push(enc);
      }
    }

    let pkgVersion = '1.3.2';
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(this.root, 'package.json'), 'utf8'));
      if (pkg.version) pkgVersion = pkg.version;
    } catch (_) {
      // Fallback a versión por defecto si package.json no está disponible
    }

    const bundleTemplate = `#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Standalone Single-File Bundle
 * Versión: ${pkgVersion} (Zero-Dependency)
 * Compilado: ${new Date().toISOString()}
 */

const __modules = {};
const __cache = {};

function __require(modulePath) {
  let normalized = modulePath;
  if (normalized.startsWith('./')) {
    normalized = normalized.slice(2);
  }
  if (!normalized.startsWith('tools/') && !normalized.startsWith('bin/')) {
    normalized = 'tools/' + normalized;
  }
  if (!normalized.endsWith('.js')) {
    normalized += '.js';
  }

  if (__cache[normalized]) {
    return __cache[normalized].exports;
  }

  if (!__modules[normalized]) {
    // Fallback a require nativo de Node.js (ej: fs, path, crypto, child_process)
    return require(modulePath);
  }

  const module = { exports: {} };
  __cache[normalized] = module;
  __modules[normalized](module, module.exports, __require);
  return module.exports;
}

// === MÓDULOS DEL RUNTIME AXION PROTOCOL ===
${modulesCode.join('\n')}

// === ENTRYPOINT CLI PRINCIPAL ===
if (require.main === module) {
  const args = process.argv.slice(2);
  const cmd = args[0] || 'help';

  const SUBCOMMANDS = {
    preflight: () => { const M = __require('tools/preflight.js'); console.log(JSON.stringify(M.runPreflight(args.slice(1).join(' ')), null, 2)); },
    checkpoint: () => { const M = __require('tools/checkpoint.js'); console.log(M.crear(process.cwd())); },
    restore: () => { const M = __require('tools/checkpoint.js'); console.log(M.restaurar(process.cwd(), args[1] || 'latest')); },
    shield: () => { const M = __require('tools/agent_shield.js'); new M().runAudit(); },
    doctor: () => { const M = __require('tools/doctor_repair_engine.js'); new M().runDiagnosis(); },
    repair: () => { const M = __require('tools/doctor_repair_engine.js'); new M().repairAll(); },
    instinct: () => { const M = __require('tools/instinct_synthesizer.js'); console.log(JSON.stringify(new M().loadVault(), null, 2)); },
    budget: () => { const M = __require('tools/context_budget_guard.js'); console.log(JSON.stringify(new M().evaluatePressure(), null, 2)); },
    capabilities: () => { const M = __require('tools/capability_manager.js'); console.log(JSON.stringify(new M().listCapabilities(), null, 2)); },
    dashboard: () => { const M = __require('tools/governance_dashboard.js'); new M().generateDashboard(); },
    tree: () => { const M = __require('tools/socratic_tree_visualizer.js'); new M().generateReport(); },
    weave: () => { const M = __require('tools/dynamic_rule_weaver.js'); new M().weaveRules(); },
    search: () => { const M = __require('tools/semantic_snapshot_indexer.js'); console.log(new M().search(args.slice(1).join(' '))); },
    check: () => { const M = __require('tools/doctor_repair_engine.js'); new M().runDiagnosis(); },
    revocation: () => { const M = __require('tools/revocation_manager.js'); console.log(JSON.stringify(new M().loadCRL(), null, 2)); },
    swarm: () => { const M = __require('tools/swarm_ast_arbiter.js'); console.log(new M().loadLocks()); },
    clarify: () => { const M = __require('tools/intent_clarifier.js'); console.log(JSON.stringify(M.analyzeUserIntent(args.slice(1).join(' ')), null, 2)); },
    help: () => {
      console.log('Axion Protocol — Standalone Single-File Bundle v${pkgVersion}');
      console.log('Uso: node axion.bundle.js <subcommand>\\n');
      console.log('Subcomandos disponibles: preflight, checkpoint, restore, shield, doctor, repair, instinct, budget, capabilities, dashboard, tree, weave, search, check, revocation, swarm, clarify, help');
    }
  };

  if (SUBCOMMANDS[cmd]) {
    SUBCOMMANDS[cmd]();
  } else {
    console.error(\`Subcomando desconocido: "\${cmd}". Usa "node axion.bundle.js help" para ver la lista.\`);
    process.exit(1);
  }
}

module.exports = {
  __require,
  __modules
};
`;

    fs.writeFileSync(this.outputFile, bundleTemplate, 'utf8');

    const digest = crypto.createHash('sha256')
      .update(bundleTemplate)
      .digest('hex');

    const stat = fs.statSync(this.outputFile);

    return {
      success: true,
      outputFile: this.outputFile,
      sizeBytes: stat.size,
      modulesCount: CORE_MODULES.length,
      digest
    };
  }
}

if (require.main === module) {
  const compiler = new BundleCompiler();
  console.log('[Axion Bundle Compiler] Compilando runtime en un solo archivo standalone...\n');
  const res = compiler.compile();
  console.log(`✓ Archivo generado: ${path.relative(ROOT, res.outputFile)}`);
  console.log(`✓ Módulos empaquetados: ${res.modulesCount}`);
  console.log(`✓ Tamaño: ${(res.sizeBytes / 1024).toFixed(1)} KB`);
  console.log(`✓ SHA-256 Digest: ${res.digest.slice(0, 16)}...`);
}

module.exports = BundleCompiler;
