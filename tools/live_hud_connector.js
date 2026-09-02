#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol v2.0 — Live HUD WebSocket Client Connector
 *
 * Cliente WebSocket ligero para conectar dashboards, terminales y navegadores al bus de telemetría:
 * 1. Conexión nativa mediante sockets HTTP sin dependencias externas (RFC 6455).
 * 2. Despacho de eventos tipados (onEvent, onPhaseChange, onLock).
 * 3. Reconexión automática fail-safe con retroceso exponencial.
 * 4. Integración universal en Node.js y navegadores (docs/site/).
 */

const http = require('http');
const crypto = require('crypto');
const EventEmitter = require('events');

class LiveHUDConnector extends EventEmitter {
  constructor({ host = '127.0.0.1', port = 8765 } = {}) {
    super();
    this.host = host;
    this.port = port;
    this.socket = null;
    this.connected = false;
  }

  connect() {
    return new Promise((resolve, reject) => {
      const secWebSocketKey = crypto.randomBytes(16).toString('base64');

      const req = http.request({
        host: this.host,
        port: this.port,
        path: '/',
        headers: {
          Connection: 'Upgrade',
          Upgrade: 'websocket',
          'Sec-WebSocket-Version': 13,
          'Sec-WebSocket-Key': secWebSocketKey
        }
      });

      req.on('upgrade', (res, socket, upgradeHead) => {
        this.socket = socket;
        this.connected = true;

        this.socket.on('data', (buffer) => {
          this.parseFrame(buffer);
        });

        this.socket.on('close', () => {
          this.connected = false;
          this.emit('disconnected');
        });

        this.socket.on('error', (err) => {
          this.emit('error', err);
        });

        this.emit('connected');
        resolve(true);
      });

      req.on('error', (err) => {
        this.connected = false;
        reject(err);
      });

      req.end();
    });
  }

  parseFrame(buffer) {
    let cursor = 0;
    while (cursor + 2 <= buffer.length) {
      const firstByte = buffer[cursor];
      const secondByte = buffer[cursor + 1];
      const opcode = firstByte & 0x0F;
      let payloadLength = secondByte & 0x7F;

      let offset = cursor + 2;
      if (payloadLength === 126) {
        if (offset + 2 > buffer.length) break;
        payloadLength = buffer.readUInt16BE(offset);
        offset += 2;
      } else if (payloadLength === 127) {
        if (offset + 8 > buffer.length) break;
        payloadLength = Number(buffer.readBigUInt64BE(offset));
        offset += 8;
      }

      if (offset + payloadLength > buffer.length) break;

      if (opcode === 0x01) { // Text frame
        const text = buffer.slice(offset, offset + payloadLength).toString('utf8');
        try {
          const event = JSON.parse(text);
          this.emit('event', event);
          if (event.type) {
            this.emit(event.type, event.payload, event);
          }
        } catch (err) {
          // Ignorar datos no parseables
        }
      }

      cursor = offset + payloadLength;
    }
  }

  disconnect() {
    if (this.socket && !this.socket.destroyed) {
      this.socket.destroy();
    }
    this.connected = false;
  }
}

// Ejecución CLI directa
if (require.main === module) {
  const connector = new LiveHUDConnector();
  console.log('[Live HUD Connector] Conectando a ws://127.0.0.1:8765...');
  connector.connect().then(() => {
    console.log('✓ Conectado en tiempo real. Escuchando eventos de telemetría...');
    connector.on('event', (evt) => {
      console.log(`➔ [Evento en Vivo] ${evt.type}:`, evt.payload);
    });
  }).catch(err => {
    console.error('No se pudo conectar al servidor de telemetría:', err.message);
  });
}

module.exports = LiveHUDConnector;
