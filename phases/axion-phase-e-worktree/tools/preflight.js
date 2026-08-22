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

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Uso: node tools/preflight.js "<comando_solo_para_clasificar>"');
    process.exit(2);
  }

  const result = runPreflight(args.join(' '));
  console.log(JSON.stringify(result, null, 2));
  if (result.status === COMMAND_DECISION.DENY) process.exit(1);
  if (result.status === COMMAND_DECISION.NEEDS_HUMAN_REVIEW) process.exit(2);
  process.exit(0);
}

if (require.main === module) main();

module.exports = { COMMAND_DECISION, runPreflight };
