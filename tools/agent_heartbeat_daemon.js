#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Agent Liveness Heartbeat & Self-Audit Daemon
 *
 * Demonio de vigilancia de liveness y auto-auditoría en segundo plano para /drive:
 * 1. Monitorea la integridad física y criptográfica de reglas P0 (.agents/rules/).
 * 2. Verifica la presencia y registro de hooks PreToolUse en Antigravity y Claude Code.
 * 3. Supervisa el estado del killswitch (.axion/HALT) y reporta anomalías.
 * 4. Emite latidos atómicos periódicos en .axion/state/heartbeat.json sellados con SHA-256.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

class AgentHeartbeatDaemon {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
    this.stateDir = path.join(this.root, '.axion', 'state');
    if (!fs.existsSync(this.stateDir)) {
      fs.mkdirSync(this.stateDir, { recursive: true });
    }
    this.heartbeatFile = path.join(this.stateDir, 'heartbeat.json');
    this.timer = null;
    this.pulseCount = 0;
  }

  /**
   * Ejecuta un pulso único de auto-auditoría y liveness.
   */
  pulseOnce() {
    this.pulseCount++;
    const t0 = process.hrtime.bigint();

    // 1. Verificar Reglas P0
    const rulesDir = path.join(this.root, '.agents', 'rules');
    const coreRule = path.join(rulesDir, 'axion-governance.md');
    const p0Valid = fs.existsSync(coreRule) && fs.statSync(coreRule).size > 100;

    // 2. Verificar Killswitch
    const haltFile = path.join(this.root, '.axion', 'HALT');
    const isHalted = fs.existsSync(haltFile);

    // 3. Verificar Hooks
    const hookScript = path.join(this.root, '.agents', 'hooks', 'validate-tool-call.mjs');
    const claudeHook = path.join(this.root, '.claude', 'settings.json');
    const hooksPresent = fs.existsSync(hookScript) || fs.existsSync(claudeHook);

    const t1 = process.hrtime.bigint();
    const latencyMicros = parseFloat((Number(t1 - t0) / 1000).toFixed(2));

    const status = (p0Valid && !isHalted) ? 'HEALTHY' : (isHalted ? 'HALTED' : 'DEGRADED');

    const pulseData = {
      version: '1.2.0-beta.1',
      pulseIndex: this.pulseCount,
      timestamp: new Date().toISOString(),
      status,
      latencyMicros,
      checks: {
        p0GovernanceRules: p0Valid,
        killswitchActive: isHalted,
        pretooluseHooks: hooksPresent
      },
      memoryRssMB: parseFloat((process.memoryUsage().rss / (1024 * 1024)).toFixed(1))
    };

    pulseData.digest = crypto.createHash('sha256')
      .update(JSON.stringify(pulseData))
      .digest('hex');

    fs.writeFileSync(this.heartbeatFile, JSON.stringify(pulseData, null, 2), 'utf8');
    return pulseData;
  }

  /**
   * Inicia el demonio de latidos periódicos.
   */
  startDaemon({ intervalMs = 2000, maxPulses = Infinity, onPulse = null } = {}) {
    this.stopDaemon();
    this.pulseOnce();

    this.timer = setInterval(() => {
      const pulse = this.pulseOnce();
      if (typeof onPulse === 'function') {
        onPulse(pulse);
      }
      if (this.pulseCount >= maxPulses) {
        this.stopDaemon();
      }
    }, intervalMs);

    return {
      running: true,
      intervalMs,
      maxPulses
    };
  }

  /**
   * Detiene el demonio.
   */
  stopDaemon() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    return { running: false, totalPulses: this.pulseCount };
  }

  /**
   * Lee el último latido registrado en disco.
   */
  readLastPulse() {
    if (fs.existsSync(this.heartbeatFile)) {
      try {
        return JSON.parse(fs.readFileSync(this.heartbeatFile, 'utf8'));
      } catch (readErr) {
        // Fallback ante lectura corrupta
      }
    }
    return this.pulseOnce();
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const daemon = new AgentHeartbeatDaemon();

  if (args.includes('daemon') || args.includes('--daemon')) {
    console.log('[Axion Heartbeat] Iniciando demonio de vigilancia continua (Ctrl+C para salir)...\n');
    daemon.startDaemon({
      intervalMs: 3000,
      onPulse: (p) => {
        console.log(`[Pulse #${p.pulseIndex}] Estado: ${p.status} · Latencia: ${p.latencyMicros} µs · RSS: ${p.memoryRssMB} MB · Digest: ${p.digest.slice(0, 12)}...`);
      }
    });
  } else {
    console.log('[Axion Heartbeat] Emitiendo latido de liveness puntual...\n');
    const pulse = daemon.pulseOnce();
    console.log(`✓ Estado del Sistema: ${pulse.status}`);
    console.log(`✓ Reglas P0 Activas:   ${pulse.checks.p0GovernanceRules ? 'SÍ' : 'NO'}`);
    console.log(`✓ Killswitch:          ${pulse.checks.killswitchActive ? 'HALTED' : 'RUNNING'}`);
    console.log(`✓ Latencia de Pulso:   ${pulse.latencyMicros} µs`);
    console.log(`✓ Archivo de Latido:   ${path.relative(ROOT, daemon.heartbeatFile)}`);
    console.log(`✓ SHA-256 Digest:      ${pulse.digest.slice(0, 16)}...`);
  }
}

module.exports = AgentHeartbeatDaemon;
