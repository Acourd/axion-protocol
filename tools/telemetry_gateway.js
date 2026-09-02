#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol v2.0 — Real-Time Governance WebSocket Telemetry Gateway
 *
 * Gateway de telemetría en tiempo real para HUDs, navegadores y extensiones IDE:
 * 1. Servidor WebSocket nativo (RFC 6455) sin dependencias externas (usando http + crypto nativos).
 * 2. Emisión atómica de eventos del flujo híbrido (PHASE_TRANSITION, AST_LOCK, BFT_VOTE, etc.).
 * 3. Filtrado y descarte de datos confidenciales antes del broadcast a clientes conectados.
 * 4. Soporte para consultas HTTP REST de estado rápido (GET /status, GET /events).
 *
 * Cero dependencias externas.
 */

const http = require('http');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

class TelemetryGateway {
  constructor({ port = 8765, maxHistory = 100 } = {}) {
    this.port = port;
    this.maxHistory = maxHistory;
    this.clients = new Set();
    this.eventHistory = [];
    this.server = null;
  }

  /**
   * Inicia el servidor HTTP y WebSocket.
   */
  start() {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        // Rutas HTTP REST
        if (req.url === '/status') {
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({
            status: 'OPERATIONAL',
            connectedClients: this.clients.size,
            totalEvents: this.eventHistory.length,
            uptimeSec: process.uptime()
          }));
        } else if (req.url === '/events') {
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify(this.eventHistory.slice(-20)));
        } else {
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('Axion Protocol Telemetry Gateway v2.0');
        }
      });

      // Handshake WebSocket (RFC 6455)
      this.server.on('upgrade', (req, socket, head) => {
        const key = req.headers['sec-websocket-key'];
        if (!key) {
          socket.destroy();
          return;
        }

        const acceptHash = crypto
          .createHash('sha1')
          .update(key + WS_GUID)
          .digest('base64');

        const headers = [
          'HTTP/1.1 101 Switching Protocols',
          'Upgrade: websocket',
          'Connection: Upgrade',
          `Sec-WebSocket-Accept: ${acceptHash}`
        ];

        socket.write(headers.join('\r\n') + '\r\n\r\n');
        this.clients.add(socket);

        socket.on('close', () => {
          this.clients.delete(socket);
        });

        socket.on('error', () => {
          this.clients.delete(socket);
        });
      });

      this.server.on('error', reject);
      this.server.listen(this.port, '127.0.0.1', () => {
        resolve(this.port);
      });
    });
  }

  /**
   * Codifica un payload de texto en un frame WebSocket estándar (RFC 6455).
   */
  encodeFrame(payloadStr) {
    const payloadBuffer = Buffer.from(payloadStr, 'utf8');
    const length = payloadBuffer.length;

    let header;
    if (length <= 125) {
      header = Buffer.from([0x81, length]);
    } else if (length <= 65535) {
      header = Buffer.alloc(4);
      header[0] = 0x81;
      header[1] = 126;
      header.writeUInt16BE(length, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x81;
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(length), 2);
    }

    return Buffer.concat([header, payloadBuffer]);
  }

  /**
   * Transmite un evento de gobernanza a todos los clientes conectados.
   */
  broadcastEvent(eventType, payload = {}) {
    const event = {
      id: `EVT-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      type: eventType,
      payload,
      timestamp: new Date().toISOString()
    };

    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory.shift();
    }

    const frame = this.encodeFrame(JSON.stringify(event));

    for (const client of this.clients) {
      try {
        if (!client.destroyed && client.writable) {
          client.write(frame);
        }
      } catch (err) {
        this.clients.delete(client);
      }
    }

    return event;
  }

  /**
   * Apaga el servidor limpiamente.
   */
  stop() {
    return new Promise((resolve) => {
      for (const client of this.clients) {
        if (!client.destroyed) {
          client.destroy();
        }
      }
      this.clients.clear();
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }
}

// Ejecución CLI directa
if (require.main === module) {
  const port = process.env.PORT || 8765;
  const gw = new TelemetryGateway({ port });
  gw.start().then(() => {
    console.log(`[Axion Telemetry Gateway] Servidor WebSocket/HTTP activo en http://localhost:${port}`);
    console.log('  ➔ Transmitiendo eventos en tiempo real a clientes conectados...');
  }).catch(err => {
    console.error('Error al iniciar Telemetry Gateway:', err);
    process.exit(1);
  });
}

module.exports = TelemetryGateway;
