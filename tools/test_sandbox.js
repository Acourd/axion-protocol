#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Sandboxes de prueba con unicidad garantizada.
 *
 * Los nombres derivados solo de `Date.now()` colisionan entre suites concurrentes
 * (mismo milisegundo, mismo checkout). `fs.mkdtempSync` garantiza unicidad atómica
 * incluso con procesos simultáneos.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

/**
 * Sandbox dentro del checkout (scratch/, ignorado por git y por el escaneo Merkle).
 */
function crearSandbox(prefijo = 'test') {
  const base = path.join(ROOT, 'scratch');
  fs.mkdirSync(base, { recursive: true });
  return fs.mkdtempSync(path.join(base, `${prefijo}-`));
}

/**
 * Sandbox fuera del checkout (tmp del sistema), para pruebas que no deben tocar el repo.
 */
function crearSandboxTemporal(prefijo = 'axion-test') {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${prefijo}-`));
}

module.exports = { crearSandbox, crearSandboxTemporal };
