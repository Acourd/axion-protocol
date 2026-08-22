#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol - Preflight fail-closed.
 *
 * La clasificación nunca ejecuta la entrada. Las cadenas de shell crudas no son una ruta
 * autorizada: reciben DENY o NEEDS_HUMAN_REVIEW. ALLOW exige un comando estructurado con
 * shell:false y allowlist explícita en structured_command.js.
 */

const process = require('process');
const {
  COMMAND_DECISION,
  classifyCommand,
} = require('./structured_command.js');

function runPreflight(command) {
  const classification = classifyCommand(command);
  return Object.freeze({
    status: classification.decision,
    decision: classification.decision,
    reason: classification.reason,
  });
}

const USAGE = [
  'Uso:',
  '  node tools/preflight.js "<cadena de shell>"   clasifica una cadena de shell cruda',
  '  node tools/preflight.js --json <comando>      clasifica un comando estructurado',
  '',
  'Una cadena de shell cruda NUNCA obtiene ALLOW: no se puede determinar con certeza que',
  'ejecutaria, asi que el mejor resultado posible es NEEDS_HUMAN_REVIEW. Para alcanzar',
  'ALLOW hace falta un comando estructurado, y ademas estar en la allowlist:',
  '',
  '  node tools/preflight.js --json {"executable":"git","args":["status"],"cwd":".","shell":false}',
  '',
  'Codigos de salida: 0 ALLOW, 1 DENY, 2 NEEDS_HUMAN_REVIEW o uso incorrecto.',
].join('\n');

// Traduce los argumentos de linea de comandos a algo que classifyCommand entienda.
// Con --json se espera un comando estructurado; sin el, una cadena de shell cruda.
function parseArgs(args) {
  if (args[0] !== '--json') return { ok: true, command: args.join(' ') };
  if (args.length < 2) return { ok: false, reason: 'MISSING_JSON_PAYLOAD' };
  try {
    return { ok: true, command: JSON.parse(args.slice(1).join(' ')) };
  } catch (_) {
    // Un JSON ilegible no es un comando: se deniega en vez de propagar la excepcion.
    return { ok: false, reason: 'INVALID_JSON_PAYLOAD' };
  }
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(USAGE);
    process.exit(2);
  }

  const parsed = parseArgs(args);
  if (!parsed.ok) {
    const denegado = { status: COMMAND_DECISION.DENY, decision: COMMAND_DECISION.DENY, reason: parsed.reason };
    console.log(JSON.stringify(denegado, null, 2));
    process.exit(1);
  }

  const result = runPreflight(parsed.command);
  console.log(JSON.stringify(result, null, 2));
  if (result.status === COMMAND_DECISION.DENY) process.exit(1);
  if (result.status === COMMAND_DECISION.NEEDS_HUMAN_REVIEW) process.exit(2);
  process.exit(0);
}

if (require.main === module) main();

module.exports = { COMMAND_DECISION, runPreflight, parseArgs, USAGE };
