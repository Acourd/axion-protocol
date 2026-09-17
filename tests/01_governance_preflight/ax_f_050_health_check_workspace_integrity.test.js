'use strict';

const assert = require('assert');
const { crearSandboxTemporal } = require('../../tools/test_sandbox.js');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const { runHealthCheck, herramientasCitadas, WORKFLOWS, evaluarMotorNode } = require('../../tools/health_check.js');

console.log('=== AX-F-050 Auditoría de Integridad del Workspace y Chequeo de Salud ===\n');

const ROOT = path.resolve(__dirname, '..', '..');

// 1. Integridad de la lista de workflows
// El recuento se deriva del disco en vez de declararse. Cableado a 16, añadir un comando
// ponía la suite en rojo por el motivo equivocado —el número— en vez de por el que importa:
// que el chequeo de salud audite todos los comandos que existen. Un comando que se cree y
// no se registre aquí queda fuera de la auditoría sin que nada lo diga.
assert.strictEqual(Array.isArray(WORKFLOWS), true);

const DIR_SK = path.join(ROOT, '.agents', 'skills');
const enDisco = fs.readdirSync(DIR_SK, { withFileTypes: true })
  .filter((e) => e.isDirectory() && fs.existsSync(path.join(DIR_SK, e.name, 'SKILL.md')))
  .map((e) => e.name + '.md')
  .sort();
assert.deepStrictEqual(
  [...WORKFLOWS].sort(), enDisco,
  'la lista que audita health_check debe coincidir exactamente con los workflows en disco'
);
assert.ok(WORKFLOWS.length >= 12, `deben registrarse al menos los 12 comandos base, hay ${WORKFLOWS.length}`);
console.log(`✓ Lista de ${WORKFLOWS.length} slash commands verificada contra el disco`);

// 2. Extracción y presencia de herramientas citadas en workflows
const dirWorkflows = path.join(ROOT, '.agents', 'skills');
const citadas = herramientasCitadas(dirWorkflows);
assert.strictEqual(citadas.size >= 10, true, 'deben extraerse al menos 10 herramientas citadas');
for (const [toolPath] of citadas.entries()) {
  const abs = path.join(ROOT, toolPath);
  assert.strictEqual(fs.existsSync(abs), true, `la herramienta citada "${toolPath}" debe existir físicamente`);
}
console.log(`✓ Presencia física de las ${citadas.size} herramientas citadas verificada`);

// 2b. Verificación determinista del umbral de runtime Node (>= 22.13.0)
assert.strictEqual(typeof evaluarMotorNode, 'function', 'evaluarMotorNode debe ser una función exportada');
assert.strictEqual(evaluarMotorNode('20.18.0').pass, false, 'Node 20 debe fallar');
assert.strictEqual(evaluarMotorNode('22.12.0').pass, false, 'Node 22.12 debe fallar');
assert.strictEqual(evaluarMotorNode('22.12.9').pass, false, 'Node 22.12.9 debe fallar');
assert.strictEqual(evaluarMotorNode('22.13.0').pass, true, 'Node 22.13.0 debe pasar');
assert.strictEqual(evaluarMotorNode('22.14.0').pass, true, 'Node 22.14.0 debe pasar');
assert.strictEqual(evaluarMotorNode('24.0.0').pass, true, 'Node 24 debe pasar');
assert.match(evaluarMotorNode('22.13.0').detail, /requiere >= 22\.13\.0/, 'el detalle debe documentar el requisito');
console.log('✓ Umbral de runtime Node.js (>= 22.13.0) verificado con casos de prueba deterministas');

// 3. Auditoría de salud sobre el proyecto raíz
const resRoot = runHealthCheck(ROOT);
assert.strictEqual(resRoot.pass, true, 'el chequeo de salud en la raíz del proyecto debe estar en PASS');
// El numero se comprueba como suelo, no como igualdad exacta: cablearlo ponia la suite en
// rojo por la cifra cada vez que se anadia un chequeo legitimo, que es exactamente lo que
// paso al incorporar la verificacion del formato de Antigravity.
assert.ok(resRoot.checks.length >= 11, `deben evaluarse al menos 11 comprobaciones, hubo ${resRoot.checks.length}`);
assert.ok(resRoot.checks.every((c) => typeof c.name === 'string' && typeof c.pass === 'boolean'),
  'cada comprobacion debe declarar nombre y veredicto booleano');
assert.strictEqual(resRoot.checks.every(c => c.pass), true, 'todas las comprobaciones individuales deben ser true');
console.log(`✓ ${resRoot.checks.length}/${resRoot.checks.length} comprobaciones de salud en verde sobre el proyecto raíz verificadas`);

// 4. Detección honesta de fallos sobre un directorio vacío
const emptyDir = crearSandboxTemporal('axion_test_empty_health');
fs.mkdirSync(emptyDir, { recursive: true });

const resEmpty = runHealthCheck(emptyDir);
assert.strictEqual(resEmpty.pass, false, 'un directorio vacío debe fallar el chequeo de salud');
assert.strictEqual(resEmpty.checks.some(c => !c.pass), true, 'debe reportar comprobaciones fallidas');
fs.rmSync(emptyDir, { recursive: true, force: true });
console.log('✓ Detección y reporte de fallos fail-closed sobre directorio vacío verificado');

// 5. Invocación CLI con salida 0
const rCli = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'health_check.js'), '--target', ROOT]);
assert.strictEqual(rCli.status, 0, 'CLI de health_check debe salir con código 0');
console.log('✓ Invocación CLI de health_check verificada');

console.log('\nPASS AX-F-050 — Chequeo de salud e integridad del workspace verificados al 100%.\n');
