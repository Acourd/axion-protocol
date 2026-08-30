#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Multi-Dimensional Socratic Intent Planner & Policy Compiler
 *
 * Planificador socrático multidimensional y compilador de políticas de ejecución para /drive:
 * 1. Procesa múltiples dimensiones de alineación socrática:
 *    - Dimensión 1: Misión Primaria y Vector Funcional.
 *    - Dimensión 2: Profundidad del Bucle Autónomo y Rigor Asintótico (1 a 50 ciclos).
 *    - Dimensión 3: Nivel de Telemetría Forense y Sellado Criptográfico DSSE.
 * 2. Compila las respuestas en un contrato de ejecución inmutable en .axion/state/socratic_intent_contract.json.
 * 3. Modula automáticamente las cuotas de CPU, memoria y reintentos según el perfil combinado.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const HardwareAdaptiveProfiler = require('./hardware_adaptive_profiler.js');

const ROOT = path.resolve(__dirname, '..');

class MultidimensionalSocraticPlanner {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
    this.stateDir = path.join(this.root, '.axion', 'state');
    this.contractFile = path.join(this.stateDir, 'socratic_intent_contract.json');
    this.hardwareProfiler = new HardwareAdaptiveProfiler(this.root);
    this.ensureStateDir();
  }

  ensureStateDir() {
    if (!fs.existsSync(this.stateDir)) {
      fs.mkdirSync(this.stateDir, { recursive: true });
    }
  }

  /**
   * Compila un contrato de ejecución multidimensional formal a partir de las respuestas del usuario.
   */
  compileIntentContract({ missionChoice, deliberationDepth = 'DEEP_MULTI_PASS', telemetryLevel = 'FULL_DIFF_SNAPSHOTS' }) {
    const hwProfile = this.hardwareProfiler.getComputeProfile();

    let maxCycles = 5;
    let convergenceTimeoutMs = 15000;
    if (deliberationDepth === 'EXHAUSTIVE_ASYMPTOTIC') {
      maxCycles = hwProfile.tierId === 'TIER_1_LOW_END' ? 10 : 25;
      convergenceTimeoutMs = 30000;
    } else if (deliberationDepth === 'DEEP_MULTI_PASS') {
      maxCycles = hwProfile.tierId === 'TIER_1_LOW_END' ? 4 : 10;
      convergenceTimeoutMs = 20000;
    }

    const contract = {
      version: '1.2.0',
      compiledAt: new Date().toISOString(),
      mission: {
        rawSelection: missionChoice,
        sanitizedId: String(missionChoice).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64)
      },
      executionPolicy: {
        deliberationDepth,
        maxConvergenceCycles: maxCycles,
        convergenceTimeoutMs,
        telemetryLevel,
        requireDsseSeal: telemetryLevel.includes('DSSE') || telemetryLevel.includes('FULL')
      },
      hardwareAllocations: {
        hostTier: hwProfile.tierId,
        allocatedWorkers: hwProfile.allocatedLimits.maxWorkers,
        allocatedHeapMb: hwProfile.allocatedLimits.heapLimitMb
      }
    };

    const digest = crypto.createHash('sha256').update(JSON.stringify(contract)).digest('hex');
    contract.contractDigest = digest;

    fs.writeFileSync(this.contractFile, JSON.stringify(contract, null, 2), 'utf8');

    return {
      success: true,
      contract,
      contractDigest: digest
    };
  }

  /**
   * Carga el último contrato compilado.
   */
  loadActiveContract() {
    if (fs.existsSync(this.contractFile)) {
      try {
        return JSON.parse(fs.readFileSync(this.contractFile, 'utf8'));
      } catch (err) {
        // Ignorar errores de lectura
      }
    }
    return null;
  }
}

if (require.main === module) {
  const planner = new MultidimensionalSocraticPlanner();
  console.log('[Axion Socratic Planner] Compilando contrato multidimensional de ejecución:');

  const res = planner.compileIntentContract({
    missionChoice: '✨ [NUEVA FUNCIÓN] Motor de Telemetría Forense',
    deliberationDepth: 'EXHAUSTIVE_ASYMPTOTIC',
    telemetryLevel: 'FULL_DIFF_SNAPSHOTS'
  });

  console.log('\n=== CONTRATO DE INTENCIÓN MULTIDIMENSIONAL COMPILADO ===');
  console.log('  Misión:              ' + res.contract.mission.rawSelection);
  console.log('  Profundidad:         ' + res.contract.executionPolicy.deliberationDepth);
  console.log('  Ciclos Máximos:      ' + res.contract.executionPolicy.maxConvergenceCycles);
  console.log('  Nivel Telemetría:    ' + res.contract.executionPolicy.telemetryLevel);
  console.log('  Hardware Tier:       [' + res.contract.hardwareAllocations.hostTier + ']');
  console.log('  Firma Digest SHA256: ' + res.contractDigest.slice(0, 16) + '...');
}

module.exports = MultidimensionalSocraticPlanner;
