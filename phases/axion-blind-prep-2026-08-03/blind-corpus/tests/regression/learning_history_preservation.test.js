/**
 * Verifica que un fallo de escritura no trunque la memoria durable.
 * Autoridad: policies/retention.yaml -> failure_behavior: PRESERVE_AND_BLOCK.
 */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const { captureHumanFeedback } = require(path.join(ROOT, 'tools', 'learning_engine.js'));

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'learning-history-'));
const destino = path.join(dir, 'LEARNINGS.md');

const HISTORIAL =
  '# Registro de Aprendizaje Empírico (Axion Protocol)\n' +
  '\n- **[SAFETY_RULE]** (2026-01-01): lección histórica 1\n' +
  '\n- **[UX_DESIGN]** (2026-02-01): lección histórica 2\n' +
  '\n- **[CODE_PATTERN]** (2026-03-01): lección histórica 3\n';
fs.writeFileSync(destino, HISTORIAL, 'utf8');

// Inyección de fallo: appendFileSync falla, writeFileSync sigue operativo.
const realAppend = fs.appendFileSync;
fs.appendFileSync = function () {
  const e = new Error('EPERM: operation not permitted, open');
  e.code = 'EPERM';
  throw e;
};
let resultado;
try {
  resultado = captureHumanFeedback('Prefiero que la interfaz sea minimalista', { targetFile: destino });
} finally {
  fs.appendFileSync = realAppend;
}

const despues = fs.readFileSync(destino, 'utf8');
const fallos = [];

if (despues !== HISTORIAL) fallos.push('el contenido previo fue alterado pese al fallo de escritura');
for (const n of [1, 2, 3]) {
  if (!despues.includes(`lección histórica ${n}`)) fallos.push(`se perdió la lección histórica ${n}`);
}
if (resultado.status === 'LEARNING_RECORDED') fallos.push('no puede reportarse éxito cuando la escritura falló');
if (resultado.status !== 'LEARNING_FAILED') fallos.push(`debía devolver LEARNING_FAILED, devolvió ${resultado.status}`);
if (!resultado.error) fallos.push('el error debe propagarse al llamador, no silenciarse');

// Camino normal intacto: el archivo se crea si no existe y se anexa si existe.
const nuevo = path.join(dir, 'NUEVO.md');
const r1 = captureHumanFeedback('Ten cuidado con la seguridad de los datos', { targetFile: nuevo });
if (r1.status !== 'LEARNING_RECORDED') fallos.push('la creación inicial debe seguir funcionando');
const r2 = captureHumanFeedback('Prefiero un diseño minimalista', { targetFile: nuevo });
if (r2.status !== 'LEARNING_RECORDED') fallos.push('el anexado posterior debe seguir funcionando');
const entradas = (fs.readFileSync(nuevo, 'utf8').match(/^- \*\*\[/gm) || []).length;
if (entradas !== 2) fallos.push(`debían acumularse 2 entradas, hay ${entradas}`);

fs.rmSync(dir, { recursive: true, force: true });
assert.deepStrictEqual(fallos, [], 'la memoria durable no se preserva:\n  - ' + fallos.join('\n  - '));
console.log('PASS — historial preservado ante fallo de escritura y error propagado');
