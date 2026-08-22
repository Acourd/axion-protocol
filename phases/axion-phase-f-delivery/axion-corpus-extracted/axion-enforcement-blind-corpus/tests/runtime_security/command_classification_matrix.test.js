'use strict';

const assert = require('assert');
const { runPreflight } = require('../../tools/preflight.js');

// Ninguna cadena se ejecuta. Las entradas solo se clasifican en memoria.
const destructiveInputs = [
  'sudo rm -rf /var/data',
  'sh -c "rm -rf /var/data"',
  'bash -c "rm -rf /var/data"',
  'env rm -rf /var/data',
  'nohup rm -rf /var/data',
  'xargs rm -rf',
  'FOO=bar rm -rf /var/data',
  'echo $(rm -rf ~/project)',
  'echo `rm -rf ~/project`',
  '"rm" -rf /var/data',
  "'rm' -rf /var/data",
  'powershell -Command "Remove-Item C:\\data -Recurse"',
  'find . -type f -exec rm {} \\;',
  'find . -name "*.js" -delete',
  'truncate -s 0 database.db',
  'cp /dev/null database.db',
  'echo "" > config.json',
  'sudo unlink /var/data/file',
  'env Remove-Item C:\\data -Recurse',
  'cmd /c del /q C:\\data\\*',
  'Get-ChildItem | Remove-Item -Recurse -Force',
];

const unsafeAllows = destructiveInputs
  .map((command) => ({ command, result: runPreflight(command) }))
  .filter(({ result }) => result.status === 'PASS' || result.status === 'ALLOW');

assert.deepStrictEqual(
  unsafeAllows,
  [],
  `command classification matrix: ${unsafeAllows.length} forma(s) destructiva(s) recibieron permiso`,
);

console.log(`PASS command classification matrix — ${destructiveInputs.length} formas destructivas bloqueadas o remitidas a revisión`);
