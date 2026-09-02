'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

const COMMAND_DECISION = Object.freeze({
  ALLOW: 'ALLOW',
  DENY: 'DENY',
  NEEDS_HUMAN_REVIEW: 'NEEDS_HUMAN_REVIEW',
});

const DESTRUCTIVE_EXECUTABLES = new Set([
  'rm', 'rmdir', 'unlink', 'shred', 'srm', 'mkfs', 'dd', 'truncate',
  'rd', 'del', 'erase', 'format', 'diskpart', 'fdisk',
  'remove-item', 'ri', 'clear-content', 'clc', 'clear-item', 'cli',
  'remove-itemproperty', 'rp', 'format-volume', 'clear-disk',
  'initialize-disk', 'remove-partition', 'reset-physicaldisk',
]);
const SHELL_OR_WRAPPER_EXECUTABLES = new Set([
  'sh', 'bash', 'zsh', 'fish', 'powershell', 'pwsh', 'cmd', 'wsl',
  'sudo', 'env', 'nohup', 'xargs', 'invoke-expression', 'iex',
]);
const SAFE_GIT_SUBCOMMANDS = new Set(['status', 'log', 'diff', 'show', 'rev-parse']);

function executableName(executable) {
  return path.basename(executable).toLowerCase().replace(/\.(exe|cmd|bat|ps1)$/, '');
}

function rawLooksDestructive(command) {
  const hasIFS = /\$IFS|\$\{IFS\}|IFS=/i.test(command);
  const normalized = command
    .replace(/\$\{?IFS\}?/gi, ' ')
    .toLowerCase()
    .replace(/["'`]/g, ' ');

  // 1. Detección de IFS o intentos de ofuscación de separadores léxicos
  if (hasIFS && /(rm|del|rd|erase|unlink|shred|mkfs|dd)/i.test(normalized)) {
    return true;
  }

  // 2. Destructores directos con ancla extendida que cubre inicio, espacios, barras, punto y coma, pipes o ampersands
  const isDirectDestructive = /(^|[\s/\\;&|])(rm|rmdir|rd|unlink|shred|srm|mkfs|dd|format|remove-item|ri|clear-content|clc|clear-item|cli|remove-itemproperty|rp|format-volume|clear-disk|initialize-disk|remove-partition|reset-physicaldisk|del|erase|diskpart|fdisk)(\.(exe|cmd|bat|ps1))?(\s|$|;)/i.test(normalized);

  // 3. Intérpretes con banderas de evaluación directa ejecutando rutinas destructivas
  const isEvalDestructive = /(python|python3|node|powershell|pwsh|cmd|sh|bash)\b[\s\S]*(-c|-e|--eval|-encodedcommand|-enc)\b[\s\S]*(rmtree|rmsync|unlinksync|remove-item|rmdir|unlink|del|erase|format|clean)/i.test(normalized);

  // 4. PowerShell con comandos codificados en base64 (-EncodedCommand / -enc)
  const isEncodedPowerShell = /(powershell|pwsh)\b[\s\S]*(-encodedcommand|-enc)\b/i.test(normalized);

  return isDirectDestructive
    || isEvalDestructive
    || isEncodedPowerShell
    || /\|\s*(sudo\s+)?(\S*[/\\])?(sh|bash|zsh|fish|dash|ksh|powershell|pwsh|cmd)(\s|$)/i.test(normalized)
    || /\bfind\b[\s\S]*(-delete|-exec)\b/i.test(normalized)
    || /\btruncate\s+-s\s+0\b/i.test(normalized)
    || /\bcp\s+\/dev\/null\b/i.test(normalized)
    || />\s*[^\s]+/.test(normalized)
    || /\bgit\s+(clean\b|reset\s+--hard\b|checkout\s+--\s|push\s+(-f\b|--force\b))/i.test(normalized);
}

function validateStructuredCommand(command) {
  if (!command || typeof command !== 'object' || Array.isArray(command)) return false;
  const keys = Object.keys(command).sort();
  if (keys.join(',') !== 'args,cwd,executable,shell') return false;
  return typeof command.executable === 'string'
    && command.executable.trim() !== ''
    && Array.isArray(command.args)
    && command.args.every((arg) => typeof arg === 'string' && !arg.includes('\u0000'))
    && typeof command.cwd === 'string'
    && command.cwd.trim() !== ''
    && command.shell === false;
}

function classifyCommand(command) {
  if (typeof command === 'string') {
    if (command.trim() === '') return { decision: COMMAND_DECISION.DENY, reason: 'EMPTY_RAW_COMMAND' };
    return rawLooksDestructive(command)
      ? { decision: COMMAND_DECISION.DENY, reason: 'RAW_DESTRUCTIVE_COMMAND' }
      : { decision: COMMAND_DECISION.NEEDS_HUMAN_REVIEW, reason: 'RAW_SHELL_NOT_AUTHORIZED' };
  }
  if (!validateStructuredCommand(command)) {
    return { decision: COMMAND_DECISION.DENY, reason: 'INVALID_STRUCTURED_COMMAND' };
  }

  const executable = executableName(command.executable);
  const argsLower = command.args.map((arg) => arg.toLowerCase());
  if (DESTRUCTIVE_EXECUTABLES.has(executable) || SHELL_OR_WRAPPER_EXECUTABLES.has(executable)) {
    return { decision: COMMAND_DECISION.DENY, reason: 'DESTRUCTIVE_OR_SHELL_EXECUTABLE' };
  }
  if (command.args.some((arg) => /\$\(|`|\|\||&&|[;|<>]/.test(arg))) {
    return { decision: COMMAND_DECISION.NEEDS_HUMAN_REVIEW, reason: 'AMBIGUOUS_ARGUMENT_SYNTAX' };
  }
  if (executable === 'find' && argsLower.some((arg) => arg === '-delete' || arg === '-exec')) {
    return { decision: COMMAND_DECISION.DENY, reason: 'DESTRUCTIVE_FIND_OPERATION' };
  }
  if (executable === 'cp' && argsLower.includes('/dev/null')) {
    return { decision: COMMAND_DECISION.DENY, reason: 'DESTRUCTIVE_NULL_COPY' };
  }
  if (executable === 'git') {
    const subcommand = argsLower[0] || '';
    return SAFE_GIT_SUBCOMMANDS.has(subcommand)
      ? { decision: COMMAND_DECISION.ALLOW, reason: 'STRUCTURED_READ_ONLY_GIT' }
      : { decision: COMMAND_DECISION.NEEDS_HUMAN_REVIEW, reason: 'GIT_SUBCOMMAND_NOT_ALLOWLISTED' };
  }
  if (executable === 'node') {
    return command.args.length === 1 && ['-v', '--version'].includes(argsLower[0])
      ? { decision: COMMAND_DECISION.ALLOW, reason: 'STRUCTURED_NODE_VERSION' }
      : { decision: COMMAND_DECISION.NEEDS_HUMAN_REVIEW, reason: 'NODE_PROGRAM_NOT_ALLOWLISTED' };
  }
  return { decision: COMMAND_DECISION.NEEDS_HUMAN_REVIEW, reason: 'EXECUTABLE_NOT_ALLOWLISTED' };
}

function executeStructuredCommand(command, options = {}) {
  const classification = classifyCommand(command);
  if (classification.decision !== COMMAND_DECISION.ALLOW) {
    return Object.freeze({ status: classification.decision, reason: classification.reason });
  }
  const executor = typeof options.executor === 'function' ? options.executor : spawnSync;
  let execution;
  try {
    execution = executor(command.executable, [...command.args], { cwd: command.cwd, shell: false });
  } catch (_) {
    return Object.freeze({ status: 'EXECUTION_FAILED', exitCode: null });
  }
  return Object.freeze({
    status: execution && execution.status === 0 ? 'EXECUTION_SUCCEEDED' : 'EXECUTION_FAILED',
    exitCode: execution && Number.isInteger(execution.status) ? execution.status : null,
  });
}

module.exports = {
  COMMAND_DECISION,
  classifyCommand,
  executeStructuredCommand,
  validateStructuredCommand,
};
