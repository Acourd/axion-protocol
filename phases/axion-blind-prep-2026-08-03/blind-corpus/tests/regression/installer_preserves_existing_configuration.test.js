/**
 * Verifica que el instalador conserve la configuración preexistente.
 * Requisito: .agents/AGENTS.md "Está estrictamente prohibido ... reemplazar los
 * aportes e intenciones del usuario". policies/risk.yaml: persistencia irreversible = HIGH.
 */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const { runInstallation } = require(path.join(ROOT, 'install.js'));

const CLAUDE_USER = '# Reglas propias del usuario\n\n- No tocar /produccion\n- Claves en .env.local\n';
const AGENTS_USER = '# Reglas propias del equipo\n\n- Revisar siempre con el arquitecto\n';

const destino = fs.mkdtempSync(path.join(os.tmpdir(), 'installer-config-'));
fs.mkdirSync(path.join(destino, '.agents'), { recursive: true });
fs.writeFileSync(path.join(destino, 'CLAUDE.md'), CLAUDE_USER, 'utf8');
fs.writeFileSync(path.join(destino, '.agents', 'AGENTS.md'), AGENTS_USER, 'utf8');

const silencio = console.log;
console.log = () => {};
runInstallation(destino);
console.log = silencio;

const esRespaldo = (f) => f.includes('axion-backup');

const respaldosRaiz = fs.readdirSync(destino).filter(esRespaldo);
assert.ok(
  respaldosRaiz.some(f => f.startsWith('CLAUDE.md')),
  'debe existir un respaldo de CLAUDE.md preexistente'
);
const contenidoRespaldo = fs.readFileSync(
  path.join(destino, respaldosRaiz.find(f => f.startsWith('CLAUDE.md'))), 'utf8'
);
assert.strictEqual(contenidoRespaldo, CLAUDE_USER, 'el respaldo debe conservar el contenido original intacto');

const respaldosAgents = fs.readdirSync(path.join(destino, '.agents')).filter(esRespaldo);
assert.ok(respaldosAgents.length >= 1, 'debe existir un respaldo de .agents/AGENTS.md preexistente');
assert.strictEqual(
  fs.readFileSync(path.join(destino, '.agents', respaldosAgents[0]), 'utf8'),
  AGENTS_USER,
  'el respaldo de AGENTS.md debe conservar el contenido original intacto'
);

// Idempotencia: reinstalar sobre un destino ya instalado no debe generar respaldos nuevos
const antes = fs.readdirSync(destino).filter(esRespaldo).length;
console.log = () => {};
runInstallation(destino);
console.log = silencio;
const despues = fs.readdirSync(destino).filter(esRespaldo).length;
assert.strictEqual(despues, antes, 'reinstalar contenido idéntico no debe generar respaldos redundantes');

fs.rmSync(destino, { recursive: true, force: true });
console.log('PASS — configuración preexistente respaldada y recuperable');
