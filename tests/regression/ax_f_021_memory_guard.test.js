/**
 * Regresión AX-F-021 — Escudo de Memoria y Detección de Anti-Patrones
 * 
 * Verifica que el comando `node tools/memory.js guard` advierte y bloquea
 * cuando una acción propuesta colisiona con límites o correcciones previas.
 */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const correr = (dir, args) => spawnSync(process.execPath, [path.join(ROOT, 'tools', 'memory.js'), '--target', dir, ...args], {
  cwd: ROOT, encoding: 'utf8', windowsHide: true, timeout: 15000,
});

console.log('=== AX-F-021 Escudo de Memoria (Anti-Patrones y Límites) ===\n');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-mem-guard-'));

try {
  // 1. Memoria vacía: guard pasa con 0
  const r0 = correr(tmp, ['guard', 'modificar WhiteRoom o ValorantCoach']);
  assert.strictEqual(r0.status, 0, 'Sin memoria previa, guard debe salir con 0');
  console.log('✓ guard con memoria vacía pasa con 0');

  // 2. Registrar límite protegido
  const rAdd = correr(tmp, ['add', 'limite', 'no tocar carpetas protegidas ValorantCoach ni WhiteRoom']);
  assert.strictEqual(rAdd.status, 0, 'add limite debe salir con 0');

  // 3. Probar acción no relacionada: pasa con 0
  const rOk = correr(tmp, ['guard', 'actualizar style.css en docs/site']);
  assert.strictEqual(rOk.status, 0, 'Acción inocua debe pasar');
  console.log('✓ acción no conflictiva permitida');

  // 4. Probar acción que viola el límite: bloqueada con 1 y alerta explícita
  const rBlock = correr(tmp, ['guard', 'modificar archivos en carpetas protegidas ValorantCoach']);
  assert.strictEqual(rBlock.status, 1, 'Acción que viola límite debe salir con 1');
  assert.ok(rBlock.stdout.includes('ALERTA DE MEMORIA'), 'Debe emitir alerta de memoria');
  assert.ok(rBlock.stdout.includes('ValorantCoach'), 'Debe citar el límite específico');
  console.log('✓ escudo de memoria: intercepta intentos de violar límites registrados');

} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log('\nPASS AX-F-021 — Escudo de memoria y anti-patrones verificado.');
