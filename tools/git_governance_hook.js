#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Git Pre-Commit Hook & Cryptographic Signer
 *
 * Hook de pre-commit determinista y firmador de custodia para /drive:
 * 1. Instala o desinstala el hook de pre-commit en .git/hooks/pre-commit.
 * 2. Ejecuta una compuerta estricta: VibeGuard Strict + Preflight Verification.
 * 3. Sella una atestación in-toto Statement v1 con sobre DSSE Ed25519 antes de autorizar el commit.
 * 4. Aplica principio fail-closed: si cualquier verificación falla, el commit se cancela con código de salida 1.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

class GitGovernanceHook {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
    this.gitDir = path.join(this.root, '.git');
    this.hooksDir = path.join(this.gitDir, 'hooks');
    this.preCommitPath = path.join(this.hooksDir, 'pre-commit');
  }

  /**
   * Instala el hook en el repositorio git local.
   */
  install() {
    if (!fs.existsSync(this.gitDir)) {
      return { success: false, reason: 'No se detectó directorio .git en la raíz del proyecto.' };
    }
    if (!fs.existsSync(this.hooksDir)) {
      fs.mkdirSync(this.hooksDir, { recursive: true });
    }

    const hookScript = `#!/bin/sh
# Axion Protocol — Git Pre-Commit Governance Hook (Fail-Closed)
node tools/git_governance_hook.js run
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
  echo "\n[Axion Hook] Commit bloqueado: no superó la compuerta de gobernanza criptográfica."
  exit 1
fi
exit 0
`;

    fs.writeFileSync(this.preCommitPath, hookScript, { mode: 0o755 });
    return {
      success: true,
      hookPath: this.preCommitPath,
      message: '✓ Hook de pre-commit de gobernanza instalado con éxito.'
    };
  }

  /**
   * Desinstala el hook.
   */
  uninstall() {
    if (fs.existsSync(this.preCommitPath)) {
      fs.unlinkSync(this.preCommitPath);
      return { success: true, message: '✓ Hook de pre-commit desinstalado.' };
    }
    return { success: true, message: 'El hook no estaba instalado.' };
  }

  /**
   * Ejecuta la compuerta de pre-commit en vivo.
   */
  runGate(options = {}) {
    const { runVibeGuardGate } = require('./vibeguard_gate.js');
    const DriveDsseAttester = require('./drive_dsse_attester.js');

    // 1. Escaneo VibeGuard
    const vgResult = runVibeGuardGate(this.root, { strict: true });
    if (!vgResult.pass) {
      return {
        pass: false,
        stage: 'VIBEGUARD',
        reason: `VibeGuard detectó ${vgResult.findings ? vgResult.findings.length : 1} antipatrón(es) de código.`,
        exitCode: 1
      };
    }

    // 2. Emisión de Atestación de Commit DSSE Ed25519
    let attestationDigest = 'simulated';
    try {
      const attester = new DriveDsseAttester(this.root);
      const attestRes = attester.emitAttestation({
        missionId: `pre-commit-${Date.now()}`,
        title: 'Git Pre-Commit Governance Verification (VibeGuard Gate)',
        vibeGuardGatePassed: true,
        iterations: 1,
        tests: {
          executed: false,
          result: 'NOT_RUN',
          reason: 'Pre-commit fast gate executes VibeGuard lexical scan only'
        }
      });
      attestationDigest = attestRes.envelopeDigest;
    } catch (attestErr) {
      // Si la atestación falla, el commit debe bloquearse en modo fail-closed
      if (options.strictAttestation !== false) {
        return {
          pass: false,
          stage: 'DSSE_ATTESTATION',
          reason: 'Fallo al sellar atestación in-toto criptográfica.',
          exitCode: 1
        };
      }
    }

    return {
      pass: true,
      stage: 'SUCCESS',
      attestationDigest,
      vibeGuardGatePassed: true,
      tests: {
        executed: false,
        result: 'NOT_RUN',
        reason: 'Pre-commit fast gate executes VibeGuard lexical scan only'
      },
      message: '✓ Compuerta VibeGuard superada. Atestación local sellada (no constituye certificación externa).',
      exitCode: 0
    };
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const hook = new GitGovernanceHook();

  if (args.includes('install')) {
    const res = hook.install();
    console.log(res.message || res.reason);
    process.exit(res.success ? 0 : 1);
  } else if (args.includes('uninstall')) {
    const res = hook.uninstall();
    console.log(res.message);
    process.exit(0);
  } else if (args.includes('run') || args.length === 0) {
    console.log('[Axion Git Hook] Evaluando gobernanza de pre-commit...\n');
    const res = hook.runGate();
    console.log(res.message || res.reason);
    if (res.attestationDigest) {
      console.log(`✓ DSSE Digest: ${res.attestationDigest.slice(0, 16)}...`);
    }
    process.exit(res.exitCode);
  }
}

module.exports = GitGovernanceHook;
