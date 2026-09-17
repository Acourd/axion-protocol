#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol v2.0 — Swarm Live Terminal Interactive Simulator
 *
 * Simulación visual en vivo de enjambre multi-agente colaborativo:
 * 1. Coordina 3 agentes autónomos (Planner, Frontend Specialist, Security Auditor).
 * 2. Demuestra bloqueo AST granular concurrente sobre el mismo archivo.
 * 3. Ejecuta intercambio de mensajes autenticados con firmas Ed25519.
 * 4. Resuelve votación de quórum bizantino BFT y fusión atómica de parches.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const SwarmASTArbiter = require('./swarm_ast_arbiter.js');
const SwarmP2PChannel = require('./swarm_p2p_channel.js');
const SwarmConsensusArbiter = require('./swarm_consensus_arbiter.js');

const ROOT = path.resolve(__dirname, '..');

// Paleta ANSI sobria de ingeniería
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

class SwarmSimulator {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
  }

  async runSimulation({ quiet = false } = {}) {
    const log = (msg) => { if (!quiet) console.log(msg); };

    log(`\n${C.bold}${C.cyan}╔════════════════════════════════════════════════════════════════════╗${C.reset}`);
    log(`${C.bold}${C.cyan}║      🐝  AXION PROTOCOL v2.0 — SIMULADOR DE ENJAMBRE EN VIVO        ║${C.reset}`);
    log(`${C.bold}${C.cyan}╚════════════════════════════════════════════════════════════════════╝${C.reset}\n`);

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'axion_sim_'));
    fs.mkdirSync(tempDir, { recursive: true });

    try {
      const astArbiter = new SwarmASTArbiter(tempDir);
      const p2pChannel = new SwarmP2PChannel(tempDir);
      const bftArbiter = new SwarmConsensusArbiter(tempDir);

      // Inicializar 3 agentes
      const agents = {
        planner: { id: 'agent-planner-01', role: 'PLANNER', keys: crypto.generateKeyPairSync('ed25519') },
        frontend: { id: 'agent-frontend-02', role: 'FRONTEND_SPECIALIST', keys: crypto.generateKeyPairSync('ed25519') },
        security: { id: 'agent-security-03', role: 'SECURITY_AUDITOR', keys: crypto.generateKeyPairSync('ed25519') }
      };

      const publicKeys = {
        [agents.planner.id]: agents.planner.keys.publicKey,
        [agents.frontend.id]: agents.frontend.keys.publicKey,
        [agents.security.id]: agents.security.keys.publicKey
      };

      log(`${C.dim}[Fase 1: Inicialización]${C.reset} 3 Agentes autónomos registrados con llaves Ed25519.`);

      // Paso 1: Planner crea propuesta
      log(`\n${C.yellow}➔ [Paso 1: Emisión de Propuesta]${C.reset} Planner crea 'ActionProposal: Refactorización de HUD'`);
      const proposal = bftArbiter.createProposal({
        proposerId: agents.planner.id,
        title: 'Refactorización Concurrente de HUD y Sanitización',
        targetFiles: ['src/dashboard.js']
      });

      // Paso 2: Mensajería P2P
      log(`${C.blue}➔ [Paso 2: Bus P2P Ed25519]${C.reset} Planner envía notificación de trabajo a Frontend y Security.`);
      p2pChannel.sendMessage({
        senderId: agents.planner.id,
        recipientId: agents.frontend.id,
        topic: 'TASK_ASSIGNMENT',
        payload: { file: 'src/dashboard.js', symbol: 'renderHUD' },
        privateKey: agents.planner.keys.privateKey
      });

      p2pChannel.sendMessage({
        senderId: agents.planner.id,
        recipientId: agents.security.id,
        topic: 'TASK_ASSIGNMENT',
        payload: { file: 'src/dashboard.js', symbol: 'sanitizeInputs' },
        privateKey: agents.planner.keys.privateKey
      });

      // Paso 3: Bloqueo AST Granular
      log(`\n${C.magenta}➔ [Paso 3: Bloqueos AST Granulares Concurrentes]${C.reset} Mismo archivo (src/dashboard.js):`);
      const lockFE = astArbiter.acquireLock(agents.frontend.id, 'src/dashboard.js', 'renderHUD');
      const lockSEC = astArbiter.acquireLock(agents.security.id, 'src/dashboard.js', 'sanitizeInputs');

      log(`  ${C.green}✓${C.reset} Frontend bloquea símbolo '${C.bold}renderHUD${C.reset}' (Lease: ${lockFE.leaseId.slice(0, 8)}...)`);
      log(`  ${C.green}✓${C.reset} Security bloquea símbolo '${C.bold}sanitizeInputs${C.reset}' (Lease: ${lockSEC.leaseId.slice(0, 8)}...)`);
      log(`  ${C.dim}(Cero colisiones detectadas: 2 agentes editando en paralelo el mismo archivo)${C.reset}`);

      // Paso 4: Votación BFT
      log(`\n${C.yellow}➔ [Paso 4: Votación de Quórum Bizantino BFT]${C.reset} Recolectando papeletas firmadas:`);
      bftArbiter.castBallot(proposal, {
        voterId: agents.planner.id,
        role: agents.planner.role,
        verdict: 'APPROVE',
        rationale: 'Objetivos de arquitectura validados',
        privateKey: agents.planner.keys.privateKey
      });
      log(`  [VOTO] ${agents.planner.id} ➔ ${C.green}APPROVE ✓${C.reset}`);

      bftArbiter.castBallot(proposal, {
        voterId: agents.frontend.id,
        role: agents.frontend.role,
        verdict: 'APPROVE',
        rationale: 'Interfaz renderizada sin errores',
        privateKey: agents.frontend.keys.privateKey
      });
      log(`  [VOTO] ${agents.frontend.id} ➔ ${C.green}APPROVE ✓${C.reset}`);

      bftArbiter.castBallot(proposal, {
        voterId: agents.security.id,
        role: agents.security.role,
        verdict: 'APPROVE',
        rationale: 'Sanitización estricta sin XSS/Taint',
        privateKey: agents.security.keys.privateKey
      });
      log(`  [VOTO] ${agents.security.id} ➔ ${C.green}APPROVE ✓${C.reset}`);

      const consensus = bftArbiter.evaluateConsensus(proposal, publicKeys, 3);
      log(`\n${C.bold}${C.green}✓ [Paso 5: Consenso Alcanzado]${C.reset} Supermayoría: ${consensus.approvalRatio * 100}% (${consensus.validApprovals}/3 votos)`);
      log(`  Certificado Criptográfico SHA-256: ${C.dim}${consensus.certificateDigest}${C.reset}`);

      // Paso 6: Liberación y Fusión
      astArbiter.releaseLock(lockFE.leaseId, lockFE.lockKey);
      astArbiter.releaseLock(lockSEC.leaseId, lockSEC.lockKey);
      log(`  ${C.green}✓${C.reset} Bloqueos AST liberados y árbol de trabajo sincronizado limpiamente.`);

      log(`\n${C.bold}${C.cyan}╔════════════════════════════════════════════════════════════════════╗${C.reset}`);
      log(`${C.bold}${C.cyan}║   🎉  SIMULACIÓN COMPLETADA CON ÉXITO · ENJAMBRE 100% SOBERANO    ║${C.reset}`);
      log(`${C.bold}${C.cyan}╚════════════════════════════════════════════════════════════════════╝${C.reset}\n`);

      return {
        success: true,
        proposalId: proposal.proposalId,
        consensusAchieved: consensus.consensusAchieved,
        approvalRatio: consensus.approvalRatio,
        certificateDigest: consensus.certificateDigest
      };
    } finally {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (_) {
        // cleanup
      }
    }
  }
}

// Ejecución CLI directa
if (require.main === module) {
  const sim = new SwarmSimulator();
  sim.runSimulation();
}

module.exports = SwarmSimulator;
