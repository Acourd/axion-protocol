#!/usr/bin/env node
// Axion Protocol — Puerta fail-closed para OpenCode.
//
// Intercepta la tool "bash" antes de ejecutar, clasifica la cadena con
// tools/preflight.js y bloquea (lanzando Error) todo lo que preflight marque
// como DENY o que no pueda evaluar. NEEDS_HUMAN_REVIEW se deja pasar: el
// sistema de permisos nativo de OpenCode pregunta al humano (bash=ask).
//
// Con .axion/HALT presente se bloquea CUALQUIER tool, no solo bash.
// NEEDS_HUMAN_REVIEW se deja pasar (el permiso nativo de bash pregunta al humano);
// con AXION_FAIL_CLOSED=1 en el entorno, NHR tambien bloquea, como el hook de Claude.
//
// Cero dependencias: spawnSync con array de argv, nunca shell.
// Formato de plugin: export default (ctx) => ({ "tool.execute.before": ... }).
//
// Ámbito global: al instalarse en ~/.config/opencode/plugins/, el plugin actúa
// SOLO en proyectos con Axion instalado (marcador: tools/preflight.js o .axion/).
// Fuera de ellos permanece inerte, salvo que AXION_GLOBAL_ENFORCE_ALL=1 exija
// fail-closed estricto (entonces bloquea lo que no pueda evaluar).

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

export function esProyectoGobernado(base) {
  return existsSync(path.join(base, '.axion'))
    || existsSync(path.join(base, 'tools', 'preflight.js'));
}

// Función pura para poder probarla fuera de OpenCode. Devuelve un veredicto
// { decision, reason } con decision en ALLOW | NEEDS_HUMAN_REVIEW | DENY.
export function clasificar({ preflightPath, command, haltPath }) {
  if (haltPath && existsSync(haltPath)) {
    return { decision: 'DENY', reason: 'el sistema está detenido (.axion/HALT). Retira la parada con `axion resume`.' };
  }
  if (!preflightPath || !existsSync(preflightPath)) {
    return { decision: 'DENY', reason: 'no se encuentra tools/preflight.js; la puerta no se puede evaluar. Reinstala con `axion init`.' };
  }
  const r = spawnSync(process.execPath, [preflightPath, command], {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 8000,
    maxBuffer: 1024 * 1024,
  });
  if (r.error) {
    return { decision: 'DENY', reason: `no se pudo ejecutar preflight (${r.error.message}).` };
  }
  const salida = `${r.stdout || ''}${r.stderr || ''}`.trim();
  let parsed = null;
  try {
    parsed = JSON.parse(salida);
  } catch (_) {
    parsed = null;
  }
  if (!parsed || typeof parsed.decision !== 'string') {
    return { decision: 'DENY', reason: 'preflight no devolvió un veredicto legible; ante la duda, se detiene.' };
  }
  return { decision: parsed.decision, reason: parsed.reason || '' };
}

export default async ({ project, directory, worktree }) => {
  const base = (project && (project.root || project.directory)) || directory || worktree || process.cwd();
  const enforceAll = process.env.AXION_GLOBAL_ENFORCE_ALL === '1';

  return {
    'tool.execute.before': async (input, output) => {
      // Fuera de un proyecto Axion la puerta global no debe secuestrar cualquier
      // terminal; solo con AXION_GLOBAL_ENFORCE_ALL=1 se exige fail-closed global.
      if (!enforceAll && !esProyectoGobernado(base)) return;

      const tool = String((input && input.tool) || '').toLowerCase();
      const haltPath = path.join(base, '.axion', 'HALT');

      if (existsSync(haltPath)) {
        throw new Error('Axion Protocol: el sistema está detenido (.axion/HALT). Retira la parada con `axion resume`.');
      }

      if (tool !== 'bash') return;

      const command = output && output.args && typeof output.args.command === 'string'
        ? output.args.command
        : '';
      if (command.trim() === '') return;

      const v = clasificar({
        preflightPath: path.join(base, 'tools', 'preflight.js'),
        command,
        haltPath: null,
      });

      if (v.decision === 'DENY'
        || (v.decision === 'NEEDS_HUMAN_REVIEW' && process.env.AXION_FAIL_CLOSED === '1')) {
        throw new Error(`Axion Protocol bloquea la ejecución: ${v.reason}`);
      }
    },
  };
};