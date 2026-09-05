#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Puerta fail-closed para Codex CLI (PreToolUse hook).
 *
 * Codex ejecuta este script antes de cada tool "Bash". Recibe el payload por
 * stdin, clasifica la cadena con tools/preflight.js y bloquea con
 * permissionDecision:"deny" todo lo que preflight marque DENY o no pueda
 * evaluar. NEEDS_HUMAN_REVIEW se deja pasar: Codex tiene su propio sistema de
 * permisos. Con .axion/HALT presente se bloquea.
 *
 * Cero dependencias. El contrato de salida es el documentado por Codex:
 *   {"hookSpecificOutput":{"hookEventName":"PreToolUse",
 *     "permissionDecision":"deny","permissionDecisionReason":"..."}}
 */

const { spawnSync } = require('child_process');
const { existsSync } = require('fs');
const path = require('path');

function leerStdin() {
  return new Promise((resolve) => {
    let input = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { input += chunk; });
    process.stdin.on('end', () => resolve(input));
    process.stdin.on('error', () => resolve(''));
  });
}

function deny(reason) {
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: `Axion Protocol bloquea: ${reason}`,
    },
  }));
}

async function main() {
  const raw = await leerStdin();
  let payload = {};
  try {
    payload = JSON.parse(raw);
  } catch (_) {
    payload = {};
  }

  const base = (payload && typeof payload.cwd === 'string' && payload.cwd) || process.cwd();
  const haltPath = path.join(base, '.axion', 'HALT');
  if (existsSync(haltPath)) {
    deny('el sistema está detenido (.axion/HALT). Retira la parada con `axion resume`.');
    return;
  }

  const toolName = String((payload && payload.tool_name) || '');
  const command = payload && payload.tool_input && typeof payload.tool_input.command === 'string'
    ? payload.tool_input.command
    : '';
  if (toolName !== 'Bash' || command.trim() === '') return;

  const preflight = path.join(base, 'tools', 'preflight.js');
  if (!existsSync(preflight)) {
    deny('no se encuentra tools/preflight.js; la puerta no se puede evaluar. Reinstala con `axion init`.');
    return;
  }

  const r = spawnSync(process.execPath, [preflight, command], {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 8000,
    maxBuffer: 1024 * 1024,
  });
  if (r.error) {
    deny(`no se pudo ejecutar preflight (${r.error.message}).`);
    return;
  }

  const salida = `${r.stdout || ''}${r.stderr || ''}`.trim();
  let parsed = null;
  try {
    parsed = JSON.parse(salida);
  } catch (_) {
    parsed = null;
  }
  if (!parsed || typeof parsed.decision !== 'string') {
    deny('preflight no devolvió un veredicto legible; ante la duda, se detiene.');
    return;
  }

  if (parsed.decision === 'DENY') {
    deny(parsed.reason || 'comando destructivo');
  }
  // ALLOW / NEEDS_HUMAN_REVIEW: no se bloquea; Codex gestiona el permiso.
}

if (require.main === module) {
  // exitCode (no process.exit) para que stdout se vacíe antes de terminar.
  main().then(() => { process.exitCode = 0; });
}