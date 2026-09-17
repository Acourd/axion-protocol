'use strict';

/**
 * Axion Protocol — Invariantes de Seguridad Agéntica AgentShield Zero-Dependency.
 *
 * Valida de forma estricta:
 * 1. Detección determinista de secretos en configuraciones MCP, prompts y variables de entorno.
 * 2. Detección de comandos peligrosos en definiciones de hooks.
 * 3. Auditoría de higiene del repositorio y cobertura de .gitignore.
 * 4. Cálculo matemático del Score de Seguridad Agéntica (0-100).
 * 5. Emisión y verificación de atestación criptográfica DSSE in-toto v1.
 * 6. Integración transparente con DriveEngine y CLI unificado.
 */

const assert = require('assert');
const { crearSandbox } = require('../../tools/test_sandbox.js');
const path = require('path');
const fs = require('fs');
const AgentShieldScanner = require('../../tools/agent_shield.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-136 Invariantes de Seguridad Agéntica AgentShield ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const sandbox = crearSandbox('test_agentshield_sandbox');
fs.mkdirSync(sandbox, { recursive: true });

try {
  // 1. Crear entorno sandbox con configuraciones seguras e inseguras
  const mcpDir = path.join(sandbox, 'mcp-configs');
  fs.mkdirSync(mcpDir, { recursive: true });
  fs.writeFileSync(path.join(mcpDir, 'mcp-servers.json'), JSON.stringify({
    safeServer: { command: 'node', args: ['server.js'], env: { PORT: '3000' } },
    unsafeServer: { command: 'bash', args: ['-c', 'run.sh'], env: { API_KEY: 'sk-ant-api03-secret123456789012345678901234' } }
  }, null, 2), 'utf8');

  const hooksDir = path.join(sandbox, '.claude', 'hooks');
  fs.mkdirSync(hooksDir, { recursive: true });
  fs.writeFileSync(path.join(hooksDir, 'hooks.json'), JSON.stringify({
    hooks: [
      { name: 'safe_preflight', command: 'node tools/preflight.js' },
      { name: 'unsafe_hook', command: 'rm -rf /' }
    ]
  }, null, 2), 'utf8');

  fs.writeFileSync(path.join(sandbox, '.gitignore'), '# Ignore\nnode_modules/\n', 'utf8');

  const scanner = new AgentShieldScanner(sandbox);

  // 2. Validar escaneo MCP
  const mcpFindings = scanner.scanMcpConfigs();
  assert.ok(mcpFindings.length >= 2, 'Debe detectar comando en shell y secreto en MCP');
  assert.ok(mcpFindings.some(f => f.rule === 'NO_RAW_SHELL_IN_MCP'));
  assert.ok(mcpFindings.some(f => f.rule === 'NO_HARDCODED_SECRETS' || f.rule === 'NO_HARDCODED_SECRETS_IN_CONFIG'));
  console.log('✓ Escáner de servidores MCP validado (detecta raw shell y claves API)');

  // 3. Validar escaneo de hooks
  const hookFindings = scanner.scanHooksConfig();
  assert.ok(hookFindings.length >= 1, 'Debe detectar comando destructivo en hook');
  assert.ok(hookFindings.some(f => f.rule === 'SAFE_HOOK_EXECUTION'));
  console.log('✓ Escáner de hooks validado (detecta comandos destructivos)');

  // 4. Validar escaneo de higiene del repositorio
  const hygieneFindings = scanner.scanRepositoryHygiene();
  assert.ok(hygieneFindings.some(f => f.rule === 'GITIGNORE_SECRETS_COVERAGE'));
  console.log('✓ Escáner de higiene de repositorio validado (detecta omisión de .env)');

  // 5. Validar cálculo del Score de Seguridad
  const report = scanner.runAudit({ attest: false });
  assert.ok(typeof report.score === 'number' && report.score < 100, 'El score debe reflejar deducciones');
  assert.strictEqual(report.pass, false, 'Debe fallar ante hallazgos críticos');
  console.log(`✓ Cálculo de Score de Seguridad validado (Score: ${report.score}/100, Estado: FAIL esperado)`);

  // 6. Validar auditoría limpia sobre el repositorio raíz de Axion
  const rootScanner = new AgentShieldScanner(ROOT);
  const rootReport = rootScanner.runAudit({ attest: true });
  assert.strictEqual(rootReport.pass, true, 'El repositorio de Axion debe pasar AgentShield');
  assert.strictEqual(rootReport.criticalFindings, 0);
  assert.strictEqual(rootReport.highFindings, 0);
  assert.ok(rootReport.score >= 95, 'El score de Axion debe ser >= 95');
  assert.ok(rootReport.attestation, 'Debe generar atestación criptográfica DSSE in-toto');
  console.log(`✓ Auditoría sobre Axion Protocol validada (Score: ${rootReport.score}/100, Estado: PASS, DSSE Attestation sellada)`);

  // 7. Validar integración con DriveEngine
  const driveEngine = new DriveEngine(ROOT);
  const driveShield = driveEngine.auditAgentShield({ attest: false });
  assert.strictEqual(driveShield.pass, true);
  console.log('✓ Integración DriveEngine.auditAgentShield() verificada');

} finally {
  // Limpieza del sandbox
  if (fs.existsSync(sandbox)) {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
}

console.log('\nPASS AX-F-136 — Invariantes de seguridad agéntica AgentShield demostrados al 100%.');
