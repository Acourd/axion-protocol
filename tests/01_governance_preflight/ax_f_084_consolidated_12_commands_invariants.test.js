'use strict';

/**
 * Axion Protocol — Invariantes de Consolidación de los 12 Comandos Esenciales.
 *
 * Valida de forma estricta e incontestable que:
 * 1. Existen exactamente 12 skills esenciales en .agents/skills/ y 12 comandos en .claude/commands/.
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

console.log('=== AX-F-084 Invariantes de los 12 Comandos Esenciales de Gobernanza ===\n');

const COMANDOS_ESENCIALES = Object.freeze([
  'attest',
  'clarify',
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

assert.strictEqual(skillsEnDisco.length, 12, `Deben existir exactamente 12 skills en .agents/skills/, hay ${skillsEnDisco.length}`);
assert.deepStrictEqual(skillsEnDisco, [...COMANDOS_ESENCIALES].sort(), 'El conjunto de skills en .agents/skills/ debe coincidir exactamente con los 12 esenciales');
console.log(`✓ 12/12 skills esenciales verificadas en .agents/skills/: ${skillsEnDisco.join(', ')}`);

// 2. Verificar conteo exacto y nombres en .claude/commands
const claudeEnDisco = fs.readdirSync(DIR_CLAUDE)
  .filter((f) => f.endsWith('.md'))
  .map((f) => f.replace(/\.md$/, ''))
  .sort();

assert.strictEqual(claudeEnDisco.length, 12, `Deben existir exactamente 12 comandos en .claude/commands/, hay ${claudeEnDisco.length}`);
assert.deepStrictEqual(claudeEnDisco, [...COMANDOS_ESENCIALES].sort(), 'El conjunto de comandos en .claude/commands/ debe coincidir exactamente con los 12 esenciales');
console.log(`✓ 12/12 comandos esenciales verificados en .claude/commands/: ${claudeEnDisco.join(', ')}`);

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
console.log('✓ Paridad de contenido al 100% y frontmatter YAML válidos en las 12 herramientas');

console.log('\nPASS AX-F-084 — Invariantes de consolidación de 12 comandos verificados al 100%.');
