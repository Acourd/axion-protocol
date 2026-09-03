#!/usr/bin/env node
// Axion Protocol — Puerta fail-closed para OpenCode.
//
// Intercepta la tool "bash" antes de ejecutar, clasifica la cadena con
// tools/preflight.js y bloquea sustituyendo el comando por un no-op con salida
// no-cero (NO se lanza Error: en opencode 1.18.x lanzar desde tool.execute.before
// crashea el host de plugins de bun). NEEDS_HUMAN_REVIEW se deja pasar: el
// sistema de permisos nativo de OpenCode pregunta al humano (bash=ask);
// con AXION_FAIL_CLOSED=1 en el entorno, NHR tambien bloquea.
//
// Con .axion/HALT presente se bloquea CUALQUIER tool, no solo bash.
// Ámbito global: actúa SOLO en proyectos con Axion (marcador tools/preflight.js
// o .axion/); fuera permanece inerte salvo AXION_GLOBAL_ENFORCE_ALL=1.
//
// IMPORTANTE: el módulo exporta ÚNICAMENTE el plugin (export default). Cualquier
// export nombrado rompe el plugin host de opencode 1.18.x con
// 'paths[0] must be of type string'. Los helpers son internos.
//
// Cero dependencias: spawnSync con array de argv, nunca shell.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

function esProyectoGobernado(base) {
  return existsSync(path.join(base, '.axion'))
    || existsSync(path.join(base, 'tools', 'preflight.js'));
}

function clasificar({ preflightPath, command, haltPath }) {
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
  // En opencode 1.18.x `project` NO tiene .root/.directory (y project.directory puede
  // ser objeto). Solo se aceptan strings; directory/worktree top-level son confiables.
  const base = [project && project.root, project && project.directory, directory, worktree]
    .find((v) => typeof v === 'string' && v.trim() !== '')
    || process.cwd();
  const enforceAll = process.env.AXION_GLOBAL_ENFORCE_ALL === '1';

  return {
    'tool.execute.before': async (input, output) => {
      // Fuera de un proyecto Axion la puerta global no secuestra cualquier terminal;
      // solo con AXION_GLOBAL_ENFORCE_ALL=1 se exige fail-closed global.
      if (!enforceAll && !esProyectoGobernado(base)) return;

      const tool = String((input && input.tool) || '').toLowerCase();
      const haltPath = path.join(base, '.axion', 'HALT');

      if (existsSync(haltPath)) {
        // En bash la parada se aplica por sustitución (no crashea el host). Para el
        // resto de tools se lanza: en opencode 1.18.x lanzar puede crashear el host de
        // plugins (bun panic), pero en una parada un crash sigue siendo fail-closed.
        if (tool === 'bash') {
          output.args.command = 'echo Axion-Protocol: sistema detenido (.axion/HALT). Retira la parada con `axion resume` && exit 1';
          return;
        }
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
        // NO se lanza: en opencode 1.18.x lanzar desde tool.execute.before crashea el
        // host de plugins (bun panic). Se sustituye el comando por un no-op seguro con
        // salida no-cero; el modelo ve el motivo y la tool falla limpio.
        const motivo = String(v.reason || 'comando denegado').replace(/["'`$;&|<>\\\r\n]/g, ' ');
        output.args.command = `echo Axion-Protocol-bloquea: ${motivo} && exit 1`;
        return;
      }
    },
  };
};