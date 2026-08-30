'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

console.log('=== AX-F-055 Intercepción Multiplexada y Detección de Esquemas en PreToolUse Hook ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const HOOK_PATH = path.join(ROOT, '.agents', 'hooks', 'validate-tool-call.mjs');

// 1. Invocación como subproceso con diversos esquemas de terminal
function ejecutarHook(stdinString) {
  return spawnSync(process.execPath, [HOOK_PATH], {
    input: stdinString,
    encoding: 'utf8',
    windowsHide: true,
    cwd: ROOT,
    timeout: 8000
  });
}

// 2. Extracción y bloqueo en formato Antigravity (CommandLine)
const rAntigravityDestructivo = ejecutarHook(JSON.stringify({
  tool_input: { CommandLine: 'rm -rf /' }
}));
assert.strictEqual(rAntigravityDestructivo.status !== 0, true, 'Antigravity destructivo debe salir con código no cero');
assert.strictEqual(/"permissionDecision"\s*:\s*"deny"/.test(rAntigravityDestructivo.stdout), true);
console.log('✓ Bloqueo en esquema Antigravity (tool_input.CommandLine) verificado');

// 3. Extracción y bloqueo en formato Claude Code (command)
const rClaudeDestructivo = ejecutarHook(JSON.stringify({
  tool_input: { command: 'rd /s /q C:\\Windows' }
}));
assert.strictEqual(rClaudeDestructivo.status !== 0, true, 'Claude Code destructivo debe salir con código no cero');
assert.strictEqual(/"permissionDecision"\s*:\s*"deny"/.test(rClaudeDestructivo.stdout), true);
console.log('✓ Bloqueo en esquema Claude Code (tool_input.command) verificado');

// 4. Extracción en esquemas alternativos (arguments.cmd, tool_args.commandLine)
const rAltCmd = ejecutarHook(JSON.stringify({
  arguments: { cmd: 'del /f /q *.*' }
}));
assert.strictEqual(rAltCmd.status !== 0, true);
assert.strictEqual(/"permissionDecision"\s*:\s*"deny"/.test(rAltCmd.stdout), true);
console.log('✓ Bloqueo en esquemas alternativos (arguments.cmd) verificado');

// 5. Herramienta no-terminal (sin comando) debe pasar (ALLOW)
const rNoTerminal = ejecutarHook(JSON.stringify({
  tool_input: { file_path: 'README.md', view_range: [1, 50] }
}));
assert.strictEqual(rNoTerminal.status, 0, 'herramientas no terminales deben salir con código 0');
assert.strictEqual(/"permissionDecision"\s*:\s*"allow"/.test(rNoTerminal.stdout), true);
console.log('✓ Tránsito sin interferencia en herramientas de lectura/archivos verificado');

// 6. JSON malformado debe bloquear (fail-closed)
const rMalformed = ejecutarHook('{ no_es_un_json_valido }');
assert.strictEqual(rMalformed.status !== 0, true);
assert.strictEqual(/"permissionDecision"\s*:\s*"deny"/.test(rMalformed.stdout), true);
console.log('✓ Rechazo fail-closed ante payloads corruptos verificado');

console.log('\nPASS AX-F-055 — Intercepción PreToolUse multiplexada verificada al 100%.\n');
