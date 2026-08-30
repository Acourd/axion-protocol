'use strict';

const assert = require('assert');
const AdversarialFuzzer = require('../../tools/fuzzer.js');

console.log('=== AX-F-048 Resiliencia ante Ráfagas de Mutación Adversarial y Anti-Evasión ===\n');

const fuzzer = new AdversarialFuzzer();
const corpus = AdversarialFuzzer.getAttackCorpus();

// 1. Integridad estructural del corpus
assert.strictEqual(Array.isArray(corpus), true);
assert.strictEqual(corpus.length >= 100, true, 'el corpus debe contener al menos 100 vectores de ataque');
for (const item of corpus) {
  assert.strictEqual(typeof item.category, 'string');
  assert.strictEqual(typeof item.cmd, 'string');
  assert.strictEqual(item.expected, 'DENY');
}
console.log(`✓ Integridad estructural de los ${corpus.length} vectores de ataque verificada`);

// 2. Generación y prueba de mutaciones de ráfaga (fuzzing combinatorio)
const mutaciones = [
  // Variaciones con espacios extras y tabs
  '  rm   -rf   /  ',
  '\t\trd\t/s\t/q\tC:\\\t',
  // Variaciones con mayúsculas y minúsculas mixtas
  'rM -Rf /',
  'DeL /F /S /Q *.*',
  'FoRmAt C: /Fs:NtFs /Q /Y',
  // Inyecciones con comillas dispersas
  'r""m -r\'\'f /',
  'git   push   origin   main   --force',
  'git   push   -f   origin   main',
  'powershell   -enc   "cm0gLXJmIC8="',
  // Concatenaciones complejas
  'echo "inicio" ; rm -rf / ; echo "fin"',
  'echo "test" && rd /s /q . && echo "ok"'
];

let bloqueadas = 0;
for (const mut of mutaciones) {
  const r = fuzzer.testPreflight(mut);
  assert.strictEqual(r.blocked, true, `la mutación "${mut}" debe ser bloqueada`);
  bloqueadas++;
}
console.log(`✓ Bloqueo determinista de ${bloqueadas} mutaciones léxicas combinatorias verificado`);

// 3. Comandos estructurados autorizados (ALLOW) y cadenas crudas fail-closed (NEEDS_HUMAN_REVIEW)
const structuredAllow = [
  { executable: 'git', args: ['status'], cwd: '.', shell: false },
  { executable: 'git', args: ['diff'], cwd: '.', shell: false },
  { executable: 'git', args: ['log'], cwd: '.', shell: false },
  { executable: 'node', args: ['-v'], cwd: '.', shell: false },
  { executable: 'node', args: ['--version'], cwd: '.', shell: false }
];

for (const cmd of structuredAllow) {
  const r = fuzzer.testPreflight(cmd);
  assert.strictEqual(r.decision, 'ALLOW', `el comando estructurado "${cmd.executable} ${cmd.args.join(' ')}" debe ser permitido`);
  assert.strictEqual(r.blocked, false);
}
console.log('✓ Ejecución permitida (ALLOW) en comandos estructurados de solo lectura verificada');

// 4. Cadenas crudas no destructivas se degradan a revisión humana (fail-closed)
const rawInocuo = 'echo "hola mundo"';
const rRaw = fuzzer.testPreflight(rawInocuo);
assert.strictEqual(rRaw.decision, 'NEEDS_HUMAN_REVIEW', 'las cadenas crudas no autorizadas deben exigir revisión humana');

console.log('\nPASS AX-F-048 — Resiliencia ante mutaciones adversariales verificada al 100%.\n');
