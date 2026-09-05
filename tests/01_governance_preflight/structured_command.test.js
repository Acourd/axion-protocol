'use strict';

/**
 * Structured Command & Invariant Verifier (v3.0.0 — Fase 3: Terminal Safety Shield)
 */

const assert = require('assert');
const path = require('path');
const {
  COMMAND_DECISION,
  classifyCommand,
  executeStructuredCommand,
  validateStructuredCommand,
} = require('../../tools/structured_command.js');
const DriveEngine = require('../../tools/drive_engine.js');

// 1. Clasificación básica de cadenas de shell crudas
assert.strictEqual(classifyCommand('git status').decision, COMMAND_DECISION.NEEDS_HUMAN_REVIEW);
assert.strictEqual(classifyCommand('sudo rm -rf /var/data').decision, COMMAND_DECISION.DENY);

// 2. Comando estructurado seguro con shell: false
const safe = {
  executable: 'node',
  args: ['--version'],
  cwd: 'C:/workspace',
  shell: false,
};
assert.strictEqual(classifyCommand(safe).decision, COMMAND_DECISION.ALLOW);

// 3. Ejecución protegida con executor inyectado
const calls = [];
const execution = executeStructuredCommand(safe, {
  executor(executable, args, options) {
    calls.push({ executable, args, options });
    return { status: 0, stdout: 'fixture', stderr: '' };
  },
});
assert.strictEqual(execution.status, 'EXECUTION_SUCCEEDED');
assert.deepStrictEqual(calls, [{
  executable: 'node',
  args: ['--version'],
  options: { cwd: 'C:/workspace', shell: false, windowsHide: true },
}]);

// 4. Denegación o no-autorización de comandos prohibidos o no allowlistados
const denied = [
  { executable: 'sh', args: ['-c', 'rm -rf /var/data'], cwd: '/', shell: false },
  { executable: 'find', args: ['.', '-delete'], cwd: '/', shell: false },
  { executable: 'git', args: ['reset', '--hard'], cwd: 'C:/workspace', shell: false },
  { executable: 'node', args: ['--eval', 'process.exit()'], cwd: 'C:/workspace', shell: false },
  { executable: 'node', args: ['--version'], cwd: 'C:/workspace', shell: true },
  { executable: 'r\u043C', args: ['-rf', '/'], cwd: 'C:/workspace', shell: false },
  { executable: 'cat', args: ['.env'], cwd: 'C:/workspace', shell: false },
  { executable: 'node\u0000evil', args: ['--version'], cwd: 'C:/workspace', shell: false },
  { executable: 'node', args: ['--version'], cwd: 'C:/workspace\u0000', shell: false },
];
for (const command of denied) {
  assert.notStrictEqual(classifyCommand(command).decision, COMMAND_DECISION.ALLOW);
}

// 4b. Comandos estructurados destructivos o con inyección deben recibir DENY estricto
const strictlyDenied = [
  { executable: 'sh', args: ['-c', 'rm -rf /var/data'], cwd: '/', shell: false },
  { executable: 'find', args: ['.', '-delete'], cwd: '/', shell: false },
  { executable: 'r\u043C', args: ['-rf', '/'], cwd: 'C:/workspace', shell: false },
  { executable: 'cat', args: ['.env'], cwd: 'C:/workspace', shell: false },
  { executable: 'grep', args: ['SECRET', '.env'], cwd: 'C:/workspace', shell: false },
  { executable: 'more', args: ['id_rsa'], cwd: 'C:/workspace', shell: false },
  { executable: 'node\u0000evil', args: ['--version'], cwd: 'C:/workspace', shell: false },
  { executable: 'node', args: ['--version'], cwd: 'C:/workspace\u0000', shell: false },
  { executable: 'r\u200Bm', args: ['-rf', '/'], cwd: 'C:/workspace', shell: false },
];
for (const command of strictlyDenied) {
  assert.strictEqual(classifyCommand(command).decision, COMMAND_DECISION.DENY);
}

// 5. Validación estructural estricta (validateStructuredCommand)
assert.strictEqual(validateStructuredCommand({ executable: 'node', args: ['-v'], cwd: '.', shell: true }), false);
assert.strictEqual(validateStructuredCommand({ executable: 'node', args: ['-v'], cwd: '.' }), false);
assert.strictEqual(validateStructuredCommand({ executable: 'node', args: ['-v\u0000'], cwd: '.', shell: false }), false);
assert.strictEqual(validateStructuredCommand({ executable: 'node\u0000', args: ['-v'], cwd: '.', shell: false }), false);
assert.strictEqual(validateStructuredCommand({ executable: 'node', args: ['-v'], cwd: '.\u0000', shell: false }), false);
assert.strictEqual(validateStructuredCommand({ executable: 'node', args: ['-v\u200B'], cwd: '.', shell: false }), false);
assert.strictEqual(validateStructuredCommand({ executable: 'node\uFEFF', args: ['-v'], cwd: '.', shell: false }), false);
assert.strictEqual(validateStructuredCommand({ executable: 'node', args: ['-v\nrm -rf /'], cwd: '.', shell: false }), false);

// 6. Integración con DriveEngine (validateCommandPreflight & executeCommandPreflight)
const engine = new DriveEngine(path.resolve(__dirname, '..', '..'));
const resPreflightSafe = engine.validateCommandPreflight(safe);
assert.strictEqual(resPreflightSafe.allowed, true);
assert.strictEqual(resPreflightSafe.decision, COMMAND_DECISION.ALLOW);
assert.strictEqual(resPreflightSafe.isDestructive, false);

const resPreflightRawDestructive = engine.validateCommandPreflight('rm -rf /');
assert.strictEqual(resPreflightRawDestructive.allowed, false);
assert.strictEqual(resPreflightRawDestructive.decision, COMMAND_DECISION.DENY);
assert.strictEqual(resPreflightRawDestructive.isDestructive, true);

const resPreflightExecution = engine.executeCommandPreflight(safe, {
  executor() { return { status: 0 }; }
});
assert.strictEqual(resPreflightExecution.status, 'EXECUTION_SUCCEEDED');

const resPreflightBlockedExec = engine.executeCommandPreflight('rm -rf /');
assert.strictEqual(resPreflightBlockedExec.status, COMMAND_DECISION.DENY);

console.log('PASS structured command — shell:false único camino ALLOW, homóglifos/secretos bloqueados y executor inyectado');
