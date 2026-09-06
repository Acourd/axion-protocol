'use strict';

/**
 * Axion Protocol — Structured Command & Lexical Risk Classifier (v3.0.0: Terminal Safety Shield)
 *
 * Misión: Intercepción léxica fail-closed previa a la ejecución de comandos.
 * Invariantes nucleares:
 * 1. Estricto shell: false para ALLOW. Cero ejecución de cadenas de shell crudas.
 * 2. Inmunidad a homóglifos Unicode (cirílico/griego) y caracteres invisibles (ZWS, BOM).
 * 3. Neutralización de evasiones de escape (comillas intra-palabra, carets cmd, backticks PS, backslashes).
 * 4. Taxonomía destructora cerrada: borrado de archivos, fork bombs, vuelco de discos y exposición de secretos.
 * 5. Rechazo fail-closed de inyección de bytes nulos (\0) y sintaxis ambigua.
 *
 * Cero dependencias externas.
 */

const path = require('path');
const { spawnSync } = require('child_process');

const COMMAND_DECISION = Object.freeze({
  ALLOW: 'ALLOW',
  DENY: 'DENY',
  NEEDS_HUMAN_REVIEW: 'NEEDS_HUMAN_REVIEW',
});

const DESTRUCTIVE_EXECUTABLES = new Set([
  'rm', 'rmdir', 'unlink', 'shred', 'srm', 'mkfs', 'dd', 'truncate',
  'rd', 'del', 'erase', 'format', 'diskpart', 'fdisk', 'wipefs', 'parted', 'sfdisk',
  'remove-item', 'ri', 'clear-content', 'clc', 'clear-item', 'cli',
  'remove-itemproperty', 'rp', 'format-volume', 'clear-disk',
  'initialize-disk', 'remove-partition', 'reset-physicaldisk',
  'stop-process', 'spps', 'stop-computer', 'restart-computer',
]);

const SHELL_OR_WRAPPER_EXECUTABLES = new Set([
  'sh', 'bash', 'zsh', 'fish', 'powershell', 'pwsh', 'cmd', 'wsl',
  'sudo', 'env', 'nohup', 'xargs', 'invoke-expression', 'iex',
]);

const SAFE_GIT_SUBCOMMANDS = new Set(['status', 'log', 'diff', 'show', 'rev-parse']);

// Confundibles visuales cirílicos y griegos mapeados a ASCII latino canónico
const CONFUNDIBLES = Object.freeze({
  // Cirílico minúsculas
  '\u0430': 'a', '\u0431': 'b', '\u0432': 'b', '\u0433': 'r', '\u0434': 'd',
  '\u0435': 'e', '\u0451': 'e', '\u0436': 'x', '\u0437': '3', '\u0438': 'u',
  '\u0439': 'u', '\u043A': 'k', '\u043B': 'n', '\u043C': 'm', '\u043D': 'h',
  '\u043E': 'o', '\u043F': 'n', '\u0440': 'p', '\u0441': 'c', '\u0442': 't',
  '\u0443': 'y', '\u0444': 'o', '\u0445': 'x', '\u0446': 'u', '\u0447': 'y',
  '\u0448': 'w', '\u0449': 'w', '\u044A': 'b', '\u044B': 'b', '\u044C': 'b',
  '\u044D': 'e', '\u044E': 'io', '\u044F': 'r', '\u0456': 'i', '\u0457': 'i',
  '\u0458': 'j', '\u0455': 's', '\u051B': 'q', '\u051D': 'w',
  '\u0280': 'r', '\u027E': 'r',
  // Griego minúsculas
  '\u03B1': 'a', '\u03B2': 'b', '\u03B3': 'y', '\u03B4': 'd', '\u03B5': 'e',
  '\u03B6': 'z', '\u03B7': 'n', '\u03B8': 'o', '\u03B9': 'i', '\u03BA': 'k',
  '\u03BB': 'l', '\u03BC': 'u', '\u03BD': 'v', '\u03BE': 'e', '\u03BF': 'o',
  '\u03C0': 'n', '\u03C1': 'p', '\u03C2': 'c', '\u03C3': 'o', '\u03C4': 't',
  '\u03C5': 'u', '\u03C6': 'o', '\u03C7': 'x', '\u03C8': 'w', '\u03C9': 'w'
});

function foldHomoglyphs(str) {
  let res = '';
  for (const ch of str) {
    res += CONFUNDIBLES[ch] || ch;
  }
  return res;
}

/**
 * Normaliza y purifica una cadena contra evasiones léxicas, homóglifos Unicode y caracteres invisibles.
 */
function canonicalizeLexicalCommand(command) {
  if (typeof command !== 'string') return '';
  // 1. Normalización canónica NFKD y minúsculas
  let norm = command.normalize('NFKD').toLowerCase();
  // 2. Mapeo de confundibles cirílicos y griegos
  norm = foldHomoglyphs(norm);
  // 3. Remoción de diacríticos combinantes
  norm = norm.replace(/[\u0300-\u036F]/g, '');
  // 4. Remoción estricta de caracteres invisibles, formato y zero-width (ZWS, ZWNJ, ZWJ, BOM, soft hyphens, word joiners)
  // CRÍTICO: No convertirlos en espacios para evitar que 'r\u200Bm' evada como 'r m'
  norm = norm.replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF\u00AD]/g, '');
  // 5. Normalización de caracteres de control restantes a espacio
  norm = norm.replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ');
  // 6. Normalización de espacios no separables (NBSP y otros separadores Unicode)
  norm = norm.replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ');
  // 7. Tratamiento de IFS
  norm = norm.replace(/\$\{?IFS\}?/gi, ' ');
  return norm;
}

function executableName(executable) {
  const base = executable.split(/[/\\]/).pop() || '';
  const canonical = canonicalizeLexicalCommand(base);
  return canonical.replace(/\.(exe|cmd|bat|ps1)$/, '');
}

/**
 * Determina si una cadena de shell cruda presenta patrones destructivos o peligrosos.
 */
function rawLooksDestructive(command) {
  if (typeof command !== 'string') return false;

  const hasIFS = /\$IFS|\$\{IFS\}|IFS=/i.test(command);
  const canonical = canonicalizeLexicalCommand(command);

  // Forma A: con comillas convertidas en espacios
  const normalizedWithSpaces = canonical.replace(/["'`]/g, ' ');

  // Forma B: colapsada (elimina comillas, carets, backticks y escape backslashes dentro de palabras)
  // Permite detectar r""m, r^m, r`m, r\m, r\\m, \rm, \\rm, etc.
  const normalizedCollapsed = canonical
    .replace(/["'`^]/g, '')
    .replace(/\\+/g, '');

  // 1. Detección de IFS o intentos de ofuscación de separadores léxicos
  if (hasIFS && /(rm|del|rd|erase|unlink|shred|mkfs|dd|format)/i.test(normalizedWithSpaces)) {
    return true;
  }

  // 2. Bombas de bifurcación (Fork Bombs) y agotamiento de recursos
  const isForkBomb = (
    /:\s*\(\s*\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/i.test(canonical) ||
    /%\s*0\s*\|\s*%\s*0/i.test(canonical) ||
    /\^\s*%\s*0\s*\|\s*\^\s*%\s*0/i.test(canonical) ||
    /\bforkbomb\s*\(\s*\)\s*\{/i.test(canonical) ||
    /([a-zA-Z0-9_:]+)\s*\(\s*\)\s*\{\s*\1\s*\|\s*\1/i.test(canonical) ||
    /while\s*\(\s*(true|1|\$true)\s*\)\s*\{[\s\S]*(start-process|powershell|pwsh|cmd)/i.test(canonical) ||
    /for\s*\(\s*;\s*;\s*\)\s*\{[\s\S]*(start-process|powershell|pwsh|cmd)/i.test(canonical)
  );
  if (isForkBomb) return true;

  // 2b. Intercepción de intentos de firma autónoma de riesgo por agentes
  const isAutonomousRiskSigning = /\b(premortem(\.js)?\s+accept-risk|acceptRisk)\b/i.test(canonical);
  if (isAutonomousRiskSigning) return true;

  // 3. Exposición y fuga de secretos / credenciales
  const isSecretExposure = (
    /\b(cat|type|get-content|gc|head|tail|more|less|grep|awk|sed|strings|nl|tac)\b[\s\S]*(?:^|[\s/\\"'`<>()])\.env(?:\.[\w.-]+)?(?:\s|$|[;&|"'`<>()])/i.test(canonical) ||
    /\b(cat|type|get-content|gc|head|tail|more|less|grep|awk|sed|strings)\b[\s\S]*(?:^|[\s/\\"'`<>()])(id_rsa|id_ed25519|id_ecdsa|id_dsa|\.axion[\\\/]keys[\\\/][\w.-]+\.key|\.aws[\\\/]credentials|\.ssh[\\\/]id_[\w]+)(?:\s|$|[;&|"'`<>()])/i.test(canonical) ||
    /\b(cat|type|get-content|gc|head|tail|more|less|grep)\b[\s\S]*\*\.(pem|key)\b/i.test(canonical) ||
    /(?:^|[\s/\\;&|()<>{}`"'])(printenv|export\s+-p)(?:\s|$|[;&|()<>{}`"'])/i.test(canonical) ||
    /\becho\s+\$(?:AWS_SECRET_ACCESS_KEY|GITHUB_TOKEN|ANTHROPIC_API_KEY|OPENAI_API_KEY|SLACK_BOT_TOKEN|PRIVATE_KEY|SECRET_KEY)\b/i.test(canonical) ||
    /\b(?:get-childitem|gci|dir|ls)\s+env:(?:\s|$|[\\\/;&|])/i.test(canonical)
  );
  if (isSecretExposure) return true;

  // 4. Destructores directos con ancla extendida (POSIX & Windows / PowerShell)
  const BOUNDARY_START = '(?:^|[\\s/\\\\;&|()<>{}\\[\\],:!`"\'])';
  const BOUNDARY_END = '(?:[\\s/\\\\;&|()<>{}\\[\\],:!`"\']|$)';
  const DESTRUCTIVE_TOKENS_REGEX = new RegExp(
    BOUNDARY_START +
    '(rm|rmdir|rd|unlink|shred|srm|mkfs|dd|truncate|format|diskpart|fdisk|wipefs|parted|sfdisk|remove-item|ri|clear-content|clc|clear-item|cli|remove-itemproperty|rp|format-volume|clear-disk|initialize-disk|remove-partition|reset-physicaldisk|del|erase|stop-process|stop-computer|restart-computer)' +
    '(\\.(exe|cmd|bat|ps1))?' +
    BOUNDARY_END,
    'i'
  );

  const isDirectDestructive = DESTRUCTIVE_TOKENS_REGEX.test(normalizedWithSpaces)
    || DESTRUCTIVE_TOKENS_REGEX.test(normalizedCollapsed);
  if (isDirectDestructive) return true;

  // 5. Intérpretes con banderas de evaluación directa ejecutando rutinas destructivas
  const isEvalDestructive = /(python|python3|py|node|deno|bun|perl|ruby|powershell|pwsh|cmd|sh|bash)\b[\s\S]*(-c|-e|--eval|-encodedcommand|-enc|-command)\b[\s\S]*(rmtree|rmsync|unlinksync|remove-item|rmdir|unlink|del|erase|format|clean|truncate|shred|\.rm\b|\.remove\b|os\.remove|fs\.rm)/i.test(canonical);
  if (isEvalDestructive) return true;

  // 6. PowerShell con comandos codificados en base64 (-EncodedCommand / -enc) o Invoke-Expression
  const isEncodedPowerShell = /(powershell|pwsh)\b[\s\S]*(-encodedcommand|-enc)\b/i.test(canonical);
  const isInvokeExpression = /\b(invoke-expression|iex)\b[\s\S]*\b(remove-item|ri|format|del|rm)\b/i.test(canonical);
  if (isEncodedPowerShell || isInvokeExpression) return true;

  // 7. Tuberías a shells e intérpretes
  const isPipeToShell = /\|\s*(sudo\s+)?(\S*[/\\])?(sh|bash|zsh|fish|dash|ksh|powershell|pwsh|cmd)(\s|$)/i.test(canonical);
  if (isPipeToShell) return true;

  // 8. Operaciones destructivas de búsqueda, truncamiento y sobrescritura de dispositivos
  const isDeviceOrFileTruncation = (
    /\bfind\b[\s\S]*(-delete|-exec)\b/i.test(canonical) ||
    /\btruncate\s+-s\s+0\b/i.test(canonical) ||
    /\bcp\s+\/dev\/null\b/i.test(canonical) ||
    />\s*\/dev\/(sd[a-z]|hd[a-z]|nvme[0-9]|null|zero|mem|kmem|port)/i.test(canonical) ||
    /\bof=\/dev\/(sd[a-z]|hd[a-z]|nvme[0-9]|null|zero)/i.test(canonical) ||
    /\bmkfs\.[a-z0-9]+/i.test(canonical) ||
    />\s*[^\s]+/.test(canonical)
  );
  if (isDeviceOrFileTruncation) return true;

  // 9. Operaciones destructivas de Git
  const isGitDestructive = /\bgit\s+(clean\b|reset\s+--hard\b|checkout\s+--\s|push\s+(-f\b|--force\b)|branch\s+-D\b|prune\b)/i.test(canonical);
  if (isGitDestructive) return true;

  return false;
}

/**
 * Valida de forma estricta la estructura requerida para comandos protegidos.
 */
function validateStructuredCommand(command) {
  if (!command || typeof command !== 'object' || Array.isArray(command)) return false;
  const keys = Object.keys(command).sort();
  if (keys.join(',') !== 'args,cwd,executable,shell') return false;
  if (command.shell !== false) return false;
  if (typeof command.executable !== 'string' || command.executable.trim() === '') return false;
  if (typeof command.cwd !== 'string' || command.cwd.trim() === '') return false;
  if (!Array.isArray(command.args)) return false;

  const FORBIDDEN_CHARS = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF\u00AD]/;
  if (FORBIDDEN_CHARS.test(command.executable) || FORBIDDEN_CHARS.test(command.cwd)) {
    return false;
  }

  for (const arg of command.args) {
    if (typeof arg !== 'string' || FORBIDDEN_CHARS.test(arg)) {
      return false;
    }
  }

  return true;
}

/**
 * Clasifica cualquier entrada (comando estructurado o cadena cruda) en uno de los 3 veredictos tipados.
 */
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
  const argsCanonical = command.args.map((arg) => canonicalizeLexicalCommand(arg));
  const argsLower = command.args.map((arg) => arg.toLowerCase());

  if (DESTRUCTIVE_EXECUTABLES.has(executable) || SHELL_OR_WRAPPER_EXECUTABLES.has(executable)) {
    return { decision: COMMAND_DECISION.DENY, reason: 'DESTRUCTIVE_OR_SHELL_EXECUTABLE' };
  }

  if (command.args.some((arg) => /\$\(|`|\|\||&&|[;|<>]/.test(arg))) {
    return { decision: COMMAND_DECISION.NEEDS_HUMAN_REVIEW, reason: 'AMBIGUOUS_ARGUMENT_SYNTAX' };
  }

  if (executable === 'find' && (argsLower.includes('-delete') || argsLower.includes('-exec') || argsCanonical.includes('-delete') || argsCanonical.includes('-exec'))) {
    return { decision: COMMAND_DECISION.DENY, reason: 'DESTRUCTIVE_FIND_OPERATION' };
  }

  if (executable === 'cp' && (argsLower.includes('/dev/null') || argsCanonical.includes('/dev/null'))) {
    return { decision: COMMAND_DECISION.DENY, reason: 'DESTRUCTIVE_NULL_COPY' };
  }

  // Fuga de secretos en comandos estructurados
  const isSecretReaderExecutable = [
    'cat', 'type', 'get-content', 'gc', 'head', 'tail', 'more', 'less', 'grep', 'awk', 'sed', 'strings'
  ].includes(executable);

  const targetsSecrets = (arg) => {
    const a = canonicalizeLexicalCommand(arg);
    return a.includes('.env') || a.includes('id_rsa') || a.includes('id_ed25519') ||
      a.endsWith('.key') || a.endsWith('.pem') || a.includes('.aws/credentials') ||
      a.includes('.aws\\credentials') || a === 'env:';
  };

  if (isSecretReaderExecutable && (command.args.some(targetsSecrets))) {
    return { decision: COMMAND_DECISION.DENY, reason: 'DESTRUCTIVE_OR_SHELL_EXECUTABLE' };
  }

  if (executable === 'git') {
    const subcommand = argsCanonical[0] || argsLower[0] || '';
    return SAFE_GIT_SUBCOMMANDS.has(subcommand)
      ? { decision: COMMAND_DECISION.ALLOW, reason: 'STRUCTURED_READ_ONLY_GIT' }
      : { decision: COMMAND_DECISION.NEEDS_HUMAN_REVIEW, reason: 'GIT_SUBCOMMAND_NOT_ALLOWLISTED' };
  }

  if (executable === 'node') {
    if (argsCanonical.some(a => a.includes('accept-risk') || a.includes('acceptrisk'))) {
      return { decision: COMMAND_DECISION.DENY, reason: 'AGENT_RISK_SIGNING_FORBIDDEN' };
    }
    return command.args.length === 1 && ['-v', '--version'].includes(argsCanonical[0] || argsLower[0])
      ? { decision: COMMAND_DECISION.ALLOW, reason: 'STRUCTURED_NODE_VERSION' }
      : { decision: COMMAND_DECISION.NEEDS_HUMAN_REVIEW, reason: 'NODE_PROGRAM_NOT_ALLOWLISTED' };
  }

  return { decision: COMMAND_DECISION.NEEDS_HUMAN_REVIEW, reason: 'EXECUTABLE_NOT_ALLOWLISTED' };
}

/**
 * Ejecuta un comando estructurado exclusivamente si alcanzó la clasificación ALLOW.
 */
function executeStructuredCommand(command, options = {}) {
  const classification = classifyCommand(command);
  if (classification.decision !== COMMAND_DECISION.ALLOW) {
    return Object.freeze({ status: classification.decision, reason: classification.reason });
  }
  const executor = typeof options.executor === 'function' ? options.executor : spawnSync;
  let execution;
  try {
    execution = executor(command.executable, [...command.args], {
      cwd: command.cwd,
      shell: false,
      windowsHide: true,
    });
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
  canonicalizeLexicalCommand,
  rawLooksDestructive,
  executableName,
  DESTRUCTIVE_EXECUTABLES,
  SHELL_OR_WRAPPER_EXECUTABLES,
};
