'use strict';

const assert = require('assert');
const {
  COMMAND_DECISION,
  classifyCommand,
  executeStructuredCommand,
} = require('../../tools/structured_command.js');

assert.strictEqual(classifyCommand('git status').decision, COMMAND_DECISION.NEEDS_HUMAN_REVIEW);
assert.strictEqual(classifyCommand('sudo rm -rf /var/data').decision, COMMAND_DECISION.DENY);

const safe = {
  executable: 'node',
  args: ['--version'],
  cwd: 'C:/workspace',
  shell: false,
};
assert.strictEqual(classifyCommand(safe).decision, COMMAND_DECISION.ALLOW);

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
  options: { cwd: 'C:/workspace', shell: false },
}]);

const denied = [
  { executable: 'sh', args: ['-c', 'rm -rf /var/data'], cwd: '/', shell: false },
  { executable: 'find', args: ['.', '-delete'], cwd: '/', shell: false },
  { executable: 'git', args: ['reset', '--hard'], cwd: 'C:/workspace', shell: false },
  { executable: 'node', args: ['--eval', 'process.exit()'], cwd: 'C:/workspace', shell: false },
  { executable: 'node', args: ['--version'], cwd: 'C:/workspace', shell: true },
];
for (const command of denied) {
  assert.notStrictEqual(classifyCommand(command).decision, COMMAND_DECISION.ALLOW);
}

console.log('PASS structured command — shell:false único camino ALLOW y executor inyectado');
