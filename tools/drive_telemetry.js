#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Live Drive Loop Telemetry & Phase Instrumenter
 *
 * Instrumenta la ejecución del meta-orquestador /drive en tiempo real:
 * 1. Registra el inicio, fin y duración exacta de cada fase (Analysis, Deliberation, Build, Audit, Attest).
 * 2. Mide la variación de memoria (Heap y RSS) por cada paso de ejecución.
 * 3. Registra eventos de backtracking, deliberaciones profundas y recuperaciones de auto-curación.
 * 4. Exporta reportes estructurados en JSON (.axion/state/) y dashboards visuales autónomos en HTML.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

class DriveTelemetry {
  constructor(sessionId = null, projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
    this.stateDir = path.join(this.root, '.axion', 'state');
    this.sessionId = sessionId || crypto.randomBytes(8).toString('hex');
    this.startedAt = new Date().toISOString();
    this.phases = [];
    this.events = [];
    this.initialMemory = this.getMemorySnapshot();

    if (!fs.existsSync(this.stateDir)) {
      fs.mkdirSync(this.stateDir, { recursive: true });
    }
  }

  getMemorySnapshot() {
    const m = process.memoryUsage();
    return {
      rssMb: Number((m.rss / (1024 * 1024)).toFixed(2)),
      heapUsedMb: Number((m.heapUsed / (1024 * 1024)).toFixed(2)),
      heapTotalMb: Number((m.heapTotal / (1024 * 1024)).toFixed(2))
    };
  }

  startPhase(phaseName, metadata = {}) {
    const phase = {
      index: this.phases.length + 1,
      name: phaseName,
      startedAt: new Date().toISOString(),
      t0: process.hrtime.bigint(),
      startMem: this.getMemorySnapshot(),
      metadata,
      status: 'RUNNING'
    };
    this.phases.push(phase);
    return phase.index;
  }

  endPhase(phaseIndex, status = 'COMPLETED', details = {}) {
    const phase = this.phases[phaseIndex - 1];
    if (!phase) return null;

    const t1 = process.hrtime.bigint();
    const elapsedMs = Number(t1 - phase.t0) / 1e6;

    phase.finishedAt = new Date().toISOString();
    phase.durationMs = Number(elapsedMs.toFixed(3));
    phase.endMem = this.getMemorySnapshot();
    phase.status = status;
    phase.details = details;
    delete phase.t0;

    return phase;
  }

  recordEvent(eventType, eventData = {}) {
    this.events.push({
      type: eventType,
      timestamp: new Date().toISOString(),
      data: eventData
    });
  }

  finalize(overallStatus = 'SUCCESS') {
    const finishedAt = new Date().toISOString();
    const finalMemory = this.getMemorySnapshot();

    const report = {
      contractVersion: '1.0.0',
      sessionId: this.sessionId,
      overallStatus,
      startedAt: this.startedAt,
      finishedAt,
      initialMemory: this.initialMemory,
      finalMemory,
      phaseCount: this.phases.length,
      eventCount: this.events.length,
      phases: this.phases,
      events: this.events
    };

    report.digest = crypto.createHash('sha256')
      .update(JSON.stringify(report))
      .digest('hex');

    const jsonPath = path.join(this.stateDir, `drive-telemetry-${this.sessionId}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');
    report.reportPath = jsonPath;

    return report;
  }

  generateHtmlDashboard(report) {
    const rep = report || this.finalize();
    const html = `<!DOCTYPE html>
<html lang="es" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <title>Axion Drive — Telemetría en Vivo [Sesión ${rep.sessionId}]</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; background: #0b0f19; color: #f3f4f6; margin: 0; padding: 24px; }
    .container { max-width: 900px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 24px; }
    h1 { color: #10b981; font-size: 20px; margin-top: 0; }
    .badge { background: #064e3b; color: #34d399; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: bold; }
    .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 20px 0; }
    .metric-card { background: #1f2937; padding: 12px; border-radius: 8px; text-align: center; }
    .metric-val { font-size: 20px; font-weight: bold; color: #60a5fa; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
    th, td { text-align: left; padding: 10px; border-bottom: 1px solid #374151; }
    th { background: #1f2937; color: #9ca3af; }
    .status-completed { color: #10b981; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 Axion Drive Telemetry Dashboard <span class="badge">${rep.overallStatus}</span></h1>
    <p>Sesión: <code>${rep.sessionId}</code> · Digest SHA-256: <code>${rep.digest.slice(0, 16)}...</code></p>
    
    <div class="metrics-grid">
      <div class="metric-card"><div>Fases</div><div class="metric-val">${rep.phaseCount}</div></div>
      <div class="metric-card"><div>Eventos</div><div class="metric-val">${rep.eventCount}</div></div>
      <div class="metric-card"><div>Heap Usado</div><div class="metric-val">${rep.finalMemory.heapUsedMb} MB</div></div>
      <div class="metric-card"><div>Memoria RSS</div><div class="metric-val">${rep.finalMemory.rssMb} MB</div></div>
    </div>

    <h3>Desglose de Fases de Ejecución</h3>
    <table>
      <thead>
        <tr><th>#</th><th>Fase</th><th>Duración</th><th>Memoria Inicial</th><th>Memoria Final</th><th>Estado</th></tr>
      </thead>
      <tbody>
        ${rep.phases.map(p => `<tr>
          <td>${p.index}</td>
          <td><strong>${p.name}</strong></td>
          <td>${p.durationMs || 0} ms</td>
          <td>${p.startMem ? p.startMem.heapUsedMb : '-'} MB</td>
          <td>${p.endMem ? p.endMem.heapUsedMb : '-'} MB</td>
          <td class="status-completed">${p.status}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>
</body>
</html>`;

    const htmlPath = path.join(this.stateDir, `drive-dashboard-${rep.sessionId}.html`);
    fs.writeFileSync(htmlPath, html, 'utf8');
    return htmlPath;
  }
}

if (require.main === module) {
  const telemetry = new DriveTelemetry();
  console.log('[Axion Telemetry] Simulando ciclo instrumentado de /drive...');

  const p1 = telemetry.startPhase('Analysis & AST Mapping');
  telemetry.recordEvent('AST_PARSED', { modules: 41, symbols: 140 });
  telemetry.endPhase(p1, 'COMPLETED');

  const p2 = telemetry.startPhase('Adversarial Verification');
  telemetry.recordEvent('CHAOS_FUZZED', { vectors: 1000, intercepted: 1000 });
  telemetry.endPhase(p2, 'COMPLETED');

  const p3 = telemetry.startPhase('Cryptographic in-toto Sealing');
  telemetry.recordEvent('STATEMENT_SIGNED', { format: 'DSSE-PAE', keyType: 'Ed25519' });
  telemetry.endPhase(p3, 'COMPLETED');

  const rep = telemetry.finalize('SUCCESS');
  const dashPath = telemetry.generateHtmlDashboard(rep);

  console.log(`[Axion Telemetry] Reporte JSON guardado en: ${rep.reportPath}`);
  console.log(`[Axion Telemetry] Dashboard HTML generado en: ${dashPath}`);
}

module.exports = DriveTelemetry;
