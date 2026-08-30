const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { runInstallation } = require('../../install.js');

console.log('=== Pruebas del Instalador Autónomo Dual (Antigravity & Claude Code) ===\n');

const os = require('os');
const scratchDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ax-install-test-'));

console.log(`--- Ejecutando instalación autónoma dual en: ${scratchDir} ---`);
const result = runInstallation(scratchDir);

assert.strictEqual(result.status, 'SUCCESS', 'La instalación autónoma debe retornar estado SUCCESS');

// Comprobar que los archivos esenciales para Antigravity y Claude Code existen
const expectedFiles = [
  path.join(scratchDir, '.agents', 'AGENTS.md'),
  path.join(scratchDir, 'CLAUDE.md'),
  path.join(scratchDir, '.claude', 'CLAUDE.md'),
  path.join(scratchDir, 'tools', 'intent_clarifier.js'),
  path.join(scratchDir, 'tools', 'canonical_json.js'),
  path.join(scratchDir, 'tools', 'identity_canonical.js'),
  path.join(scratchDir, 'tools', 'killswitch.js'),
  path.join(scratchDir, 'tools', 'dsse.js'),
  path.join(scratchDir, 'tools', 'attestation.js'),
  path.join(scratchDir, 'tools', 'assurance.js'),
  path.join(scratchDir, 'tools', 'risk_policy_compiler.js'),
  path.join(scratchDir, 'tools', 'approval_ed25519.js'),
  path.join(scratchDir, 'tools', 'check_ed25519.js'),
  path.join(scratchDir, 'tools', 'workflow_state_machine.js'),
  path.join(scratchDir, 'tools', 'structured_command.js'),
  path.join(scratchDir, 'tools', 'preflight.js'),
  path.join(scratchDir, 'tools', 'rollback_plan.js'),
  path.join(scratchDir, 'tools', 'evidence_hasher.js'),
  path.join(scratchDir, 'tools', 'workflow_runner.js'),
  path.join(scratchDir, 'policies', 'risk.yaml'),
  path.join(scratchDir, 'schemas', 'approval.schema.json'),
  path.join(scratchDir, 'schemas', 'authority_registry.schema.json'),
  path.join(scratchDir, 'schemas', 'check_attestation.schema.json'),
  path.join(scratchDir, 'schemas', 'rollback-plan.schema.json'),
  path.join(scratchDir, 'adapters', 'prompt_bridge.json'),
  // Herramientas que los workflows citan. Antes no se comprobaban, y por eso el
  // instalador pudo dejar /compact y /verify apuntando al vacio durante toda una version.
  path.join(scratchDir, 'tools', 'checkpoint.js'),
  path.join(scratchDir, 'tools', 'context_shield.js'),
  path.join(scratchDir, 'tools', 'verify_changes.js'),
  path.join(scratchDir, 'tools', 'health_check.js'),
  path.join(scratchDir, 'tools', 'profile_adapter.js'),
  path.join(scratchDir, 'tools', 'deep_reasoning.js'),
  path.join(scratchDir, 'tools', 'fuzzer.js'),
  path.join(scratchDir, 'tools', 'premortem.js'),
  // El hook solo corre si esta registrado; sin este archivo, en Claude Code no corre.
  path.join(scratchDir, '.claude', 'settings.json'),
  path.join(scratchDir, '.agents', 'hooks', 'validate-tool-call.mjs')
];

expectedFiles.forEach(file => {
  assert.strictEqual(fs.existsSync(file), true, `El archivo inyectado debe existir: ${path.basename(file)}`);
  console.log(`✓ Verificado archivo inyectado: ${path.relative(scratchDir, file)}`);
});

assert.doesNotThrow(() => require(path.join(scratchDir, 'tools', 'workflow_runner.js')),
  'el runtime instalado debe cargar con todas sus dependencias locales');

// Todos los slash commands tienen que llegar a las dos superficies.
// La lista se deriva del origen en vez de copiarse aquí: una copia cableada solo comprueba
// los comandos que alguien se acordó de añadirle, así que un comando nuevo se instalaría
// mal sin que esta prueba se enterase — y el fallo aparecería como "faltan 16 de 17", que
// es un síntoma, no la causa.
const DIR_SKILLS = path.join(__dirname, '..', '..', '.agents', 'skills');
const WORKFLOWS = fs.readdirSync(DIR_SKILLS, { withFileTypes: true })
  .filter((e) => e.isDirectory() && fs.existsSync(path.join(DIR_SKILLS, e.name, 'SKILL.md')))
  .map((e) => e.name + '.md')
  .sort();
assert.ok(WORKFLOWS.length >= 12, `el origen debe traer al menos los 12 comandos base, trae ${WORKFLOWS.length}`);
WORKFLOWS.forEach(wf => {
  const enAgents = path.join(scratchDir, '.agents', 'skills', wf.replace(/\.md$/, ''), 'SKILL.md');
  const enClaude = path.join(scratchDir, '.claude', 'commands', wf);
  assert.strictEqual(fs.existsSync(enAgents), true, `falta .agents/skills/${wf.replace(/\.md$/, '')}/SKILL.md`);
  assert.strictEqual(fs.existsSync(enClaude), true, `falta .claude/commands/${wf}`);
  assert.strictEqual(fs.readFileSync(enAgents, 'utf8'), fs.readFileSync(enClaude, 'utf8'),
    `${wf} diverge entre las dos superficies instaladas`);
});
console.log(`✓ Verificados ${WORKFLOWS.length} slash commands en ambas superficies`);

assert.strictEqual(
  fs.readFileSync(path.join(scratchDir, '.claude', 'settings.json'), 'utf8').includes('validate-tool-call.mjs'),
  true,
  'el instalador debe registrar el hook PreToolUse en .claude/settings.json'
);
console.log('✓ Verificado el registro del hook PreToolUse para Claude Code');

// El proyecto recien instalado debe pasar su propia auditoria de salud. Es la unica
// forma de saber que lo entregado funciona y no solo que los archivos estan copiados.
const { runHealthCheck } = require(path.join(scratchDir, 'tools', 'health_check.js'));
const salud = runHealthCheck(scratchDir);
assert.strictEqual(salud.pass, true,
  'el proyecto instalado debe pasar el health check: ' +
  salud.checks.filter(c => !c.pass).map(c => c.name + ' -> ' + c.detail).join(' | '));
console.log('✓ El proyecto instalado pasa su propio health check');

// Limpieza posterior
fs.rmSync(scratchDir, { recursive: true, force: true });

console.log('\n=== TODAS LAS PRUEBAS DE INSTALACIÓN DUAL PASARON EXITOSAMENTE (PASS) ===');
