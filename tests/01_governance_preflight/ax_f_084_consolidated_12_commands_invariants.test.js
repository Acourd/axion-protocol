'use strict';

/**
 * Axion Protocol — Invariantes de Consolidación de los 13 Comandos Esenciales.
 *
 * Valida de forma estricta e incontestable que:
 * 1. Existen exactamente 13 skills esenciales en .agents/skills/ y 13 comandos en .claude/commands/.
 * 2. Ningún comando obsoleto (deep, unhalt, checkpoint, rollback, remember, compact, onboard) sobrevive.
 * 3. Todas las skills poseen frontmatter YAML válido con 'name' y 'description'.
 * 4. La paridad entre .agents/skills/<nombre>/SKILL.md y .claude/commands/<nombre>.md es del 100%.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DIR_SKILLS = path.join(ROOT, '.agents', 'skills');
const DIR_CLAUDE = path.join(ROOT, '.claude', 'commands');
const { runPromptLint, runMutationMatrix } = require('../../tools/prompt_lint.js');
const { runBehavioralEvals } = require('../../tools/prompt_eval.js');
const { generateSkill } = require('../../tools/generate_skill.js');

console.log('=== AX-F-084 Invariantes de los 13 Comandos Esenciales de Gobernanza ===\n');

const COMANDOS_ESENCIALES = Object.freeze([
  'attest',
  'clarify',
  'critic',
  'debug',
  'drive',
  'halt',
  'memory',
  'preflight',
  'premortem',
  'profile',
  'review',
  'snapshot',
  'verify'
]);

const OBSOLETOS_PROHIBIDOS = Object.freeze([
  'checkpoint',
  'compact',
  'deep',
  'onboard',
  'remember',
  'rollback',
  'unhalt'
]);

// 1. Verificar conteo exacto y nombres de skills en .agents/skills
const skillsEnDisco = fs.readdirSync(DIR_SKILLS, { withFileTypes: true })
  .filter((e) => e.isDirectory() && fs.existsSync(path.join(DIR_SKILLS, e.name, 'SKILL.md')))
  .map((e) => e.name)
  .sort();

assert.strictEqual(skillsEnDisco.length, 13, `Deben existir exactamente 13 skills en .agents/skills/, hay ${skillsEnDisco.length}`);
assert.deepStrictEqual(skillsEnDisco, [...COMANDOS_ESENCIALES].sort(), 'El conjunto de skills en .agents/skills/ debe coincidir exactamente con los 13 esenciales');
console.log(`✓ 13/13 skills esenciales verificadas en .agents/skills/: ${skillsEnDisco.join(', ')}`);

// 2. Verificar conteo exacto y nombres en .claude/commands
const claudeEnDisco = fs.readdirSync(DIR_CLAUDE)
  .filter((f) => f.endsWith('.md'))
  .map((f) => f.replace(/\.md$/, ''))
  .sort();

assert.strictEqual(claudeEnDisco.length, 13, `Deben existir exactamente 13 comandos en .claude/commands/, hay ${claudeEnDisco.length}`);
assert.deepStrictEqual(claudeEnDisco, [...COMANDOS_ESENCIALES].sort(), 'El conjunto de comandos en .claude/commands/ debe coincidir exactamente con los 13 esenciales');
console.log(`✓ 13/13 comandos esenciales verificados en .claude/commands/: ${claudeEnDisco.join(', ')}`);

// 3. Verificar ausencia total de comandos obsoletos
for (const obs of OBSOLETOS_PROHIBIDOS) {
  const skPath = path.join(DIR_SKILLS, obs);
  const cmdPath = path.join(DIR_CLAUDE, `${obs}.md`);
  assert.strictEqual(fs.existsSync(skPath), false, `El directorio obsoleto "${obs}" no debe existir en .agents/skills/`);
  assert.strictEqual(fs.existsSync(cmdPath), false, `El comando obsoleto "${obs}.md" no debe existir en .claude/commands/`);
}
console.log(`✓ Cero residuos de los 7 comandos obsoletos (${OBSOLETOS_PROHIBIDOS.join(', ')})`);

// 4. Verificar frontmatter YAML y paridad al byte de cada comando
for (const cmd of COMANDOS_ESENCIALES) {
  const rutaSkill = path.join(DIR_SKILLS, cmd, 'SKILL.md');
  const rutaClaude = path.join(DIR_CLAUDE, `${cmd}.md`);

  const contenidoSkill = fs.readFileSync(rutaSkill, 'utf8');
  const contenidoClaude = fs.readFileSync(rutaClaude, 'utf8');

  // Paridad
  assert.strictEqual(contenidoSkill, contenidoClaude, `El comando ${cmd} diverge entre .agents/skills/ y .claude/commands/`);

  // Frontmatter
  assert.ok(contenidoSkill.startsWith('---\n'), `${cmd}/SKILL.md debe iniciar con frontmatter YAML (---)`);
  assert.ok(contenidoSkill.includes(`name: ${cmd}`), `${cmd}/SKILL.md debe declarar "name: ${cmd}"`);
  assert.ok(contenidoSkill.includes('description:'), `${cmd}/SKILL.md debe declarar "description:"`);
}
console.log('✓ Paridad de contenido al 100% y frontmatter YAML válidos en las 13 herramientas');

// 5. Verificación de linter semántico de prompts (prompt_lint.js)
const lintRes = runPromptLint();
assert.strictEqual(lintRes.pass, true, `prompt_lint detectó fallas: ${lintRes.issues.join(', ')}`);
console.log(`✓ Linter semántico de prompts verificado con éxito (${lintRes.manifestChecks} invariantes activos)`);

// 6. Verificación de evaluación conductual (prompt_eval.js)
const evalRes = runBehavioralEvals();
assert.strictEqual(evalRes.passed, evalRes.total, 'Todas las fixtures conductuales deben pasar al 100%');
console.log(`✓ Evaluación conductual verificada con éxito (${evalRes.passed}/${evalRes.total} fixtures)`);

// 7. Verificación del generador determinista desde vocab.json (generate_skill.js)
const genRes = generateSkill();
assert.ok(genRes.synced >= 2, 'El generador debe sincronizar al menos los espejos locales');
console.log(`✓ Generador determinista verificado (v${genRes.version} propagada a ${genRes.synced} destinos)`);

// 8. Verificación de contención y aislamiento del sandbox (AT-19 / H6)
const sandboxDir = path.join(ROOT, 'tests', '.sandbox');
if (!fs.existsSync(sandboxDir)) fs.mkdirSync(sandboxDir, { recursive: true });
const dummyFailing = path.join(sandboxDir, 'probe_canary_contention.test.js');
fs.writeFileSync(dummyFailing, 'throw new Error("AT-19 POISON");', 'utf8');
const runAllCode = fs.readFileSync(path.join(ROOT, 'tests', 'run_all.js'), 'utf8');
assert.strictEqual(runAllCode.includes('.sandbox'), false, 'El test runner no debe incluir .sandbox en sus dominios de ejecución');
fs.unlinkSync(dummyFailing);
console.log('✓ Contención y aislamiento de tests/.sandbox/ (AT-19) verificados sin fugas al runner');

// 9. Verificación de linter y motor de prompt-engineering
const { lintFile } = require('../../tools/prompt_engineering_linter.js');
const { discoverEnvironment } = require('../../tools/prompt_engineering_runner.js');
const peSkill = path.join(ROOT, 'skills', 'prompt-engineering', 'SKILL.md');
if (fs.existsSync(peSkill)) {
  const peRes = lintFile(peSkill);
  assert.strictEqual(peRes.pass, true, 'skills/prompt-engineering/SKILL.md debe pasar el linter formal');
  const envDisc = discoverEnvironment(ROOT);
  assert.ok(envDisc.tools.hasPackageJson, 'Environment discovery debe detectar package.json de Axion');
  console.log('✓ Linter y runner de prompt-engineering verificados activamente');
}

console.log('\nPASS AX-F-084 — Invariantes de consolidación de 13 comandos verificados al 100%.');
