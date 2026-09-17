#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Session Flight Recorder & TTY Replayer
 *
 * Caja negra agéntica forense y reproductor determinista de sesiones:
 * 1. Registra eventos cronológicos encadenados por hash SHA-256 (Hash-Chain inmutable).
 * 2. Captura comandos de terminal, mutaciones de código, veredictos y deliberaciones.
 * 3. Valida la integridad criptográfica de la sesión detectando manipulaciones o truncamientos.
 * 4. Reproduce paso a paso la trayectoria agéntica en modo auditoría o visualizador TTY.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const { writeFileAtomicSync } = require('./atomic_write.js');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

class FlightRecorder {
  constructor(projectRoot = ROOT, sessionId = null) {
    this.root = path.resolve(projectRoot);
    this.stateDir = path.join(this.root, '.axion', 'state');
    this.sessionId = sessionId || `flight_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    this.sessionFile = path.join(this.stateDir, `flight-record-${this.sessionId}.json`);
    this.events = [];
    this.lastHash = GENESIS_HASH;
    this.ensureStateDir();
    this.loadSessionIfExists();
  }

  ensureStateDir() {
    if (!fs.existsSync(this.stateDir)) {
      fs.mkdirSync(this.stateDir, { recursive: true });
    }
  }

  sha256(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  loadSessionIfExists() {
    if (fs.existsSync(this.sessionFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.sessionFile, 'utf8'));
        this.events = data.events || [];
        this.lastHash = data.lastHash || GENESIS_HASH;
      } catch (err) {
        console.warn(`[FlightRecorder] Advertencia al cargar sesión existente: ${err.message}`);
      }
    }
  }

  save() {
    const payload = {
      sessionId: this.sessionId,
      lastHash: this.lastHash,
      eventsCount: this.events.length,
      updatedAt: new Date().toISOString(),
      events: this.events
    };
    writeFileAtomicSync(this.sessionFile, JSON.stringify(payload, null, 2));
    return this.sessionFile;
  }

  /**
   * Registra un evento en la cadena inmutable de la caja negra.
   */
  recordEvent(type, payload = {}) {
    const index = this.events.length;
    const timestamp = Date.now();
    const eventBody = {
      index,
      type,
      timestamp,
      prevHash: this.lastHash,
      payload
    };

    const currentHash = this.sha256(JSON.stringify(eventBody));
    const sealedEvent = Object.assign({}, eventBody, { hash: currentHash });

    this.events.push(sealedEvent);
    this.lastHash = currentHash;
    this.save();

    return sealedEvent;
  }

  /**
   * Verifica la integridad criptográfica de la cadena de eventos.
   */
  verifyIntegrity() {
    if (this.events.length === 0) {
      return { valid: true, eventsCount: 0, reason: 'EMPTY_SESSION' };
    }

    let expectedPrevHash = GENESIS_HASH;

    for (let i = 0; i < this.events.length; i++) {
      const e = this.events[i];
      if (e.index !== i) {
        return { valid: false, brokenIndex: i, reason: 'INDEX_SEQUENCE_CORRUPTED' };
      }
      if (e.prevHash !== expectedPrevHash) {
        return { valid: false, brokenIndex: i, reason: 'PREV_HASH_CHAIN_BROKEN' };
      }

      const eventBody = {
        index: e.index,
        type: e.type,
        timestamp: e.timestamp,
        prevHash: e.prevHash,
        payload: e.payload
      };
      const recalculatedHash = this.sha256(JSON.stringify(eventBody));
      if (recalculatedHash !== e.hash) {
        return { valid: false, brokenIndex: i, reason: 'PAYLOAD_TAMPERED' };
      }

      expectedPrevHash = e.hash;
    }

    return {
      valid: true,
      sessionId: this.sessionId,
      eventsCount: this.events.length,
      finalHash: this.lastHash
    };
  }

  /**
   * Reproduce determinísticamente la sesión registrada.
   */
  replay(options = {}) {
    const logOutput = [];
    const print = options.silent ? ((msg) => logOutput.push(msg)) : console.log;

    print(`\n=== REPRODUCCIÓN DETERMINISTA DE SESIÓN [${this.sessionId}] ===`);
    print(`Total de Eventos: ${this.events.length} | Hash Final: ${this.lastHash.slice(0, 16)}...\n`);

    for (const e of this.events) {
      const timeStr = new Date(e.timestamp).toISOString().slice(11, 23);
      print(`  [${timeStr}] #${e.index.toString().padStart(3, '0')} [${e.type.padEnd(20)}]`);
      if (e.payload && Object.keys(e.payload).length > 0) {
        print(`    └─ ${JSON.stringify(e.payload)}`);
      }
    }

    return {
      sessionId: this.sessionId,
      eventsCount: this.events.length,
      logOutput,
      pass: true
    };
  }

  /**
   * Lista todas las sesiones registradas en el proyecto.
   */
  static listSessions(projectRoot = ROOT) {
    const stateDir = path.join(path.resolve(projectRoot), '.axion', 'state');
    if (!fs.existsSync(stateDir)) return [];

    return fs.readdirSync(stateDir)
      .filter(f => f.startsWith('flight-record-') && f.endsWith('.json'))
      .map(f => {
        try {
          const content = JSON.parse(fs.readFileSync(path.join(stateDir, f), 'utf8'));
          return {
            sessionId: content.sessionId,
            eventsCount: content.eventsCount,
            updatedAt: content.updatedAt,
            file: f
          };
        } catch (_) {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  }
}

if (require.main === module) {
  const recorder = new FlightRecorder();
  console.log(`[Axion Flight Recorder] Grabando sesión de prueba: ${recorder.sessionId}...\n`);

  recorder.recordEvent('SESSION_START', { engine: 'Axion /drive v1.2.0-beta.1' });
  recorder.recordEvent('PREFLIGHT_CHECK', { command: 'git status', verdict: 'ALLOW' });
  recorder.recordEvent('SOCRATIC_INTENT', { question: '¿Optimizar base de datos?', answer: 'YES' });
  recorder.recordEvent('VIBEGUARD_SCAN', { scannedFiles: 111, antipatterns: 0, grade: 'A+' });
  recorder.recordEvent('SESSION_END', { status: 'COMPLETED_SUCCESS' });

  const integrity = recorder.verifyIntegrity();
  console.log(`✓ Verificación de integridad de la cadena: ${integrity.valid ? 'PASS (100% Intacto)' : 'FAIL'}`);

  recorder.replay();
}

module.exports = FlightRecorder;
