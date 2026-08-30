'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  compactSessionContext,
  digestGobernanza,
  SNAPSHOTS_A_CONSERVAR
} = require('../../tools/context_shield.js');

console.log('=== AX-F-063 Invariantes del Escudo de Contexto y Simetría Multi-Runtime (Antigravity/Claude Code) ===\n');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-context-shield-test-'));

try {
  // 1. Simulación de estructura de proyecto multi-runtime
  const dirAgents = path.join(tempDir, '.agents');
  const dirSkills = path.join(dirAgents, 'skills');
  const dirRules = path.join(dirAgents, 'rules');
  const dirClaude = path.join(tempDir, '.claude', 'commands');
  const dirAxion = path.join(tempDir, '.axion');

  fs.mkdirSync(path.join(dirSkills, 'drive'), { recursive: true });
  fs.mkdirSync(dirRules, { recursive: true });
  fs.mkdirSync(dirClaude, { recursive: true });
  fs.mkdirSync(dirAxion, { recursive: true });

  fs.writeFileSync(path.join(tempDir, 'CLAUDE.md'), '# Claude Config\n', 'utf8');
  fs.writeFileSync(path.join(dirAgents, 'AGENTS.md'), '# Agents Registry\n', 'utf8');
  fs.writeFileSync(path.join(dirAxion, 'PROFILE.json'), JSON.stringify({ technical_depth: 'VISIONARY' }), 'utf8');
  fs.writeFileSync(path.join(dirRules, 'p0_security.md'), '# Rule P0\n', 'utf8');
  fs.writeFileSync(path.join(dirSkills, 'drive', 'SKILL.md'), '---\nname: drive\ndescription: test\n---\n# Skill\n', 'utf8');
  fs.writeFileSync(path.join(dirClaude, 'drive.md'), '# Command Drive\n', 'utf8');

  // 2. Digest de gobernanza simétrico (cubre skills de Antigravity y comandos de Claude Code)
  const d1 = digestGobernanza(tempDir);
  assert.strictEqual(typeof d1.digest, 'string');
  assert.strictEqual(d1.digest.length, 64);
  assert.strictEqual(d1.cubiertos.some((p) => p.includes('.agents/skills/drive/SKILL.md')), true, 'debe incluir skills de Antigravity');
  assert.strictEqual(d1.cubiertos.some((p) => p.includes('.claude/commands/drive.md')), true, 'debe incluir comandos de Claude Code');
  console.log(`✓ Cobertura simétrica de gobernanza multi-runtime (${d1.cubiertos.length} archivos) verificada`);

  // 3. Detección en tiempo real de deriva ante modificación de una skill
  fs.writeFileSync(path.join(dirSkills, 'drive', 'SKILL.md'), '---\nname: drive\ndescription: mutada\n---\n# Modificado\n', 'utf8');
  const d2 = digestGobernanza(tempDir);
  assert.notStrictEqual(d1.digest, d2.digest, 'el digest debe cambiar inmediatamente si muta una skill');
  console.log('✓ Detección de deriva de gobernanza ante mutación de skill verificada');

  // 4. Compactación atómica de contexto y emisión de ANCHOR.md
  const r1 = compactSessionContext(tempDir);
  assert.strictEqual(r1.pass, true);
  assert.strictEqual(fs.existsSync(r1.file), true);
  assert.strictEqual(fs.existsSync(r1.anchor), true);
  assert.strictEqual(r1.snapshot.state_digest, d2.digest);

  const anchorContent = fs.readFileSync(r1.anchor, 'utf8');
  assert.strictEqual(anchorContent.includes('Ancla de estado - Axion Protocol'), true);
  assert.strictEqual(anchorContent.includes(d2.digest), true);
  console.log('✓ Emisión atómica de snapshot y ANCHOR.md con hash actualizado verificada');

  // 5. Poda automática de snapshots antiguos (Retention Cap = 10)
  for (let i = 0; i < 14; i++) {
    compactSessionContext(tempDir);
  }
  const dirEstado = path.join(tempDir, '.axion', 'state');
  const snapshotsEnDisco = fs.readdirSync(dirEstado).filter((f) => f.startsWith('context-snapshot-'));
  assert.strictEqual(snapshotsEnDisco.length, SNAPSHOTS_A_CONSERVAR, `debe conservar exactamente ${SNAPSHOTS_A_CONSERVAR} snapshots`);
  console.log(`✓ Poda automática y límite estricto de retención (${SNAPSHOTS_A_CONSERVAR} snapshots) verificado`);

} finally {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (_) {}
}

console.log('\nPASS AX-F-063 — Escudo de contexto y simetría multi-runtime demostrados al 100%.\n');
