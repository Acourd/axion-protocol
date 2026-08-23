#!/usr/bin/env node

/**
 * Axion Protocol - PreToolUse gate (Antigravity + Claude Code).
 *
 * Es el unico control que se interpone entre el agente y la terminal en tiempo real.
 * Todo lo demas del protocolo es prosa normativa; esto es codigo que corre antes de
 * cada comando, asi que su contrato de salida es parte de la gobernanza:
 *
 *   0. PARADA      .axion/HALT presente -> BLOCK. Se comprueba antes que nada, porque
 *                  una parada de emergencia no admite excepciones ni clasificacion.
 *   1. DENY        preflight clasifica el comando como destructivo -> BLOCK.
 *   2. REVIEW      preflight devuelve NEEDS_HUMAN_REVIEW -> se delega en el permiso
 *                  humano del host (ask), no se bloquea. Una cadena de shell cruda
 *                  nunca alcanza ALLOW por diseno: bloquearlas todas dejaria el
 *                  entorno inservible y empujaria al usuario a desactivar el hook,
 *                  que es la peor postura de seguridad posible.
 *   3. ALLOW       comando estructurado en allowlist -> pasa.
 *
 * Codigos de salida: 2 bloquea (Claude Code lo interpreta como deny y devuelve el
 * motivo al modelo; Antigravity lo lee como fallo no-cero). 0 continua. Ante
 * cualquier error interno se bloquea: no poder evaluar la puerta no es permiso.
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const PREFLIGHT = path.join(ROOT, 'tools', 'preflight.js');
const HALT_FILE = path.join(ROOT, '.axion', 'HALT');

const BLOCK_EXIT = Number.parseInt(process.env.AXION_HOOK_BLOCK_EXIT || '', 10) || 2;
const MAX_PAYLOAD = 1024 * 1024;

// Claude Code lee este JSON de stdout; Antigravity solo mira el codigo de salida.
// Emitir ambos deja un unico hook valido para los dos runtimes.
function emit(decision, reason) {
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: decision,
      permissionDecisionReason: reason,
    },
  }));
}

function block(reason) {
  emit('deny', reason);
  console.error(`BLOCKED by Axion Protocol: ${reason}`);
  return BLOCK_EXIT;
}

function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) return resolve('');
    let input = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      input += chunk;
      if (input.length > MAX_PAYLOAD) {
        input = input.slice(0, MAX_PAYLOAD);
        process.stdin.destroy();
      }
    });
    process.stdin.on('end', () => resolve(input));
    process.stdin.on('error', () => resolve(''));
  });
}

function primeraCadena(...valores) {
  for (const v of valores) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

// Cada runtime nombra el comando a su manera. Se aceptan todas las formas conocidas
// en vez de una sola, porque no encontrar el comando significaria dejarlo pasar sin mirar.
export function extractCommand(payload) {
  const args = payload?.tool_input ?? payload?.tool_args ?? payload?.toolArgs ?? payload?.arguments ?? {};
  return primeraCadena(
    args.command, args.CommandLine, args.commandLine, args.cmd, args.script,
    payload?.command, payload?.cmd,
  );
}

async function main() {
  // 0. PARADA. Precede a cualquier clasificacion.
  if (existsSync(HALT_FILE)) {
    return block('el sistema esta detenido (.axion/HALT). Retira la parada con `axion resume` antes de ejecutar nada.');
  }

  if (!existsSync(PREFLIGHT)) {
    return block(`no se encuentra ${path.relative(ROOT, PREFLIGHT)}, asi que la puerta no se puede evaluar. Reinstala con \`axion init\`.`);
  }

  const bruto = await readStdin();

  let payload = {};
  if (bruto.trim()) {
    try {
      payload = JSON.parse(bruto);
    } catch (_) {
      return block('el runtime envio un payload que no es JSON valido; no se puede saber que comando se iba a ejecutar.');
    }
  }

  const comando = extractCommand(payload) || primeraCadena(process.argv[2]);
  if (!comando) {
    // Sin comando no hay nada que clasificar: no es una herramienta de terminal.
    emit('allow', 'sin comando de terminal en la llamada.');
    return 0;
  }

  const r = spawnSync(process.execPath, [PREFLIGHT, comando], {
    cwd: ROOT, encoding: 'utf8', windowsHide: true, timeout: 8000,
  });

  if (r.error) {
    return block(`no se pudo ejecutar preflight (${r.error.message}).`);
  }

  const salida = `${r.stdout || ''}${r.stderr || ''}`;

  // 1. DENY: preflight sale con 1.
  if (r.status === 1) {
    return block(`preflight clasifico "${comando}" como DENY.\n${salida.trim()}`);
  }

  // 2. NEEDS_HUMAN_REVIEW: preflight sale con 2. Lo decide la persona, no el hook.
  if (r.status === 2) {
    emit('ask', `Axion: "${comando}" es una cadena de shell cruda (NEEDS_HUMAN_REVIEW). Requiere confirmacion humana; para ALLOW usa un comando estructurado con shell:false.`);
    console.error(`REVIEW by Axion Protocol: "${comando}" requiere confirmacion humana.`);
    return 0;
  }

  // 3. ALLOW.
  if (r.status === 0) {
    emit('allow', `preflight ALLOW para "${comando}".`);
    return 0;
  }

  return block(`preflight devolvio un codigo inesperado (${r.status}); ante la duda, se detiene.\n${salida.trim()}`);
}

// Solo actua como ejecutable; importado desde un test exporta y no toca process.
const invocadoDirectamente = Boolean(process.argv[1])
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invocadoDirectamente) {
  process.exitCode = await main();
}
