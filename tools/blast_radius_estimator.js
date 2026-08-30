#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Dynamic Permission Boundary & Blast Radius Estimator
 *
 * Implementación Clean-Room del cuantificador de radio de impacto de comandos:
 * 1. Disk Impact Scope: PUNTUAL, LOCAL_DIR, TREE_RECURSIVE, SYSTEM_WIDE.
 * 2. Process Privilege Tier: USERSPACE, ELEVATED (sudo, RunAs, IEX), SYSTEM_SERVICE.
 * 3. Network Exposure Tier: LOCAL_ONLY, OUTBOUND_HTTP, RAW_SOCKET_LISTEN.
 * 4. Reversibility Tier: FULLY_REVERSIBLE, PARTIALLY_REVERSIBLE, IRREVERSIBLE.
 * 5. Composite Risk Score: [0.0 a 10.0] con clasificación en CONTAINED, ELEVATED_SUPERVISION, CRITICAL_INTERCEPTION.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const SYSTEM_PATHS = [
  /\/etc\b/i,
  /\/var\b/i,
  /\/usr\b/i,
  /\/boot\b/i,
  /\/sys\b/i,
  /\/dev\b/i,
  /[a-z]:\\windows\b/i,
  /[a-z]:\\program files\b/i,
  /[a-z]:\\windows\\system32\b/i,
  /\/system32\b/i
];

class BlastRadiusEstimator {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
  }

  /**
   * Estima cuantitativamente el radio de explosión de un comando.
   */
  estimate(cmdString = '') {
    if (!cmdString || typeof cmdString !== 'string' || cmdString.trim() === '') {
      return {
        cmd: '',
        diskScope: 'NONE',
        privilegeTier: 'USERSPACE',
        networkTier: 'LOCAL_ONLY',
        reversibility: 'FULLY_REVERSIBLE',
        score: 0.0,
        verdict: 'CONTAINED',
        reason: 'Comando vacío o nulo: sin impacto sistémico.'
      };
    }

    const clean = cmdString.trim();
    const lower = clean.toLowerCase();

    // 1. Evaluar Alcance en Disco (Disk Scope)
    let diskScope = 'PUNTUAL';
    let diskScore = 1.0;

    const isSystemWide = SYSTEM_PATHS.some(p => p.test(clean)) ||
                         /(^|\s)(\/|[a-z]:(\\)?|format\s+[a-z]:|mkfs\b|dd\s+if=)(\s|$)/i.test(clean) ||
                         /--no-preserve-root/i.test(clean);

    const isTreeRecursive = /-r\b|-rf\b|-s\b|\/s\b|--recursive\b|remove-item\s+.*-recurse/i.test(clean);

    if (isSystemWide) {
      diskScope = 'SYSTEM_WIDE';
      diskScore = 5.0;
    } else if (isTreeRecursive) {
      diskScope = 'TREE_RECURSIVE';
      diskScore = 3.5;
    } else if (/mkdir\b|touch\b|rm\b|del\b|cp\b|copy\b|mv\b|move\b/i.test(clean)) {
      diskScope = 'LOCAL_DIR';
      diskScore = 2.0;
    }

    // 2. Evaluar Nivel de Privilegios (Privilege Tier)
    let privilegeTier = 'USERSPACE';
    let privScore = 1.0;

    if (/sudo\b|runas\b|administrative|vssadmin\b|diskpart\b|reg\s+delete|takeown\b|icacls\b|format\s+[a-z]:|mkfs\b/i.test(clean)) {
      privilegeTier = 'ELEVATED';
      privScore = 3.0;
    } else if (/powershell.*-enc\b|iex\b|invoke-expression|systemd\b|schtasks\b/i.test(clean)) {
      privilegeTier = 'SYSTEM_SERVICE';
      privScore = 2.5;
    }

    // 3. Evaluar Exposición de Red (Network Tier)
    let networkTier = 'LOCAL_ONLY';
    let netScore = 0.5;

    if (/\/dev\/tcp\b|\/dev\/udp\b|nc\s+-l|ncat\s+-l/i.test(clean)) {
      networkTier = 'RAW_SOCKET_LISTEN';
      netScore = 2.0;
    } else if (/curl\b|wget\b|downloadstring|invoke-webrequest|http:\/\/|https:\/\//i.test(clean)) {
      networkTier = 'OUTBOUND_HTTP';
      netScore = 1.0;
    }

    // 4. Evaluar Reversibilidad (Reversibility)
    let reversibility = 'FULLY_REVERSIBLE';
    let revScore = 0.5;

    if (/format\b|dd\s+if=|mkfs\b|diskpart\b|git\s+push.*--force/i.test(clean)) {
      reversibility = 'IRREVERSIBLE';
      revScore = 3.0;
    } else if (isTreeRecursive || /git\s+reset\s+--hard/i.test(clean)) {
      reversibility = 'PARTIALLY_REVERSIBLE';
      revScore = 1.5;
    }

    // 5. Cálculo del Score Compuesto [0.0 a 10.0]
    const rawScore = diskScore + privScore + netScore + revScore;
    const score = Math.min(10.0, parseFloat(rawScore.toFixed(1)));

    let verdict = 'CONTAINED';
    if (score >= 7.0) {
      verdict = 'CRITICAL_INTERCEPTION';
    } else if (score >= 4.0) {
      verdict = 'ELEVATED_SUPERVISION';
    }

    return {
      cmd: clean,
      diskScope,
      privilegeTier,
      networkTier,
      reversibility,
      score,
      verdict,
      reason: `Blast Radius ${score}/10.0 (${verdict}) — Disco: ${diskScope}, Privilegio: ${privilegeTier}, Red: ${networkTier}, Reversibilidad: ${reversibility}`
    };
  }
}

if (require.main === module) {
  const estimator = new BlastRadiusEstimator();
  console.log('[Axion Blast Radius Estimator] Estimando radios de impacto de prueba:');
  const samples = [
    'node tests/run_all.js',
    'rm ./temp.txt',
    'git reset --hard HEAD~1',
    'powershell -enc JABjAG0AZAAgAD0AIAAnAHIAbQAgAC0AcgBmACAAKgAnAA==',
    'sudo rm -rf --no-preserve-root /'
  ];

  for (const s of samples) {
    const res = estimator.estimate(s);
    console.log(`\n  Comando: "${s}"`);
    console.log(`  Score:   ${res.score}/10.0 -> [${res.verdict}]`);
    console.log(`  Detalle: ${res.reason}`);
  }
}

module.exports = BlastRadiusEstimator;
