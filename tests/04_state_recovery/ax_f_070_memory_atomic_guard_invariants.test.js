'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  recordar,
  olvidar,
  buscar,
  bloqueParaAncla,
  verificarGuard,
  regenerarIndice
} = require('../../tools/memory.js');

console.log('=== AX-F-070 Invariantes de Memoria Persistente, Blindaje Atómico y Memory Guard ===\n');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-memory-guard-test-'));

try {
  // 1. Rechazo de tipos desconocidos y textos vacíos
  const rTipoInv = recordar(tempDir, 'tipo_inventado', 'texto valido');
  assert.strictEqual(rTipoInv.pass, false);
  assert.strictEqual(rTipoInv.status, 'TIPO_DESCONOCIDO');

  const rVacio = recordar(tempDir, 'convencion', '   ');
  assert.strictEqual(rVacio.pass, false);
  assert.strictEqual(rVacio.status, 'TEXTO_VACIO');

  // 2. Exigencia obligatoria de porqué en decisiones (DECISION_SIN_PORQUE)
  const rDecSin = recordar(tempDir, 'decision', 'Usar SQLite para persistencia local');
  assert.strictEqual(rDecSin.pass, false);
  assert.strictEqual(rDecSin.status, 'DECISION_SIN_PORQUE');
  console.log('✓ Rechazos fail-closed ante tipo inválido, texto vacío y decisión sin porqué verificados');

  // 3. Registro atómico de entradas válidas
  const rDec = recordar(tempDir, 'decision', 'Usar SQLite para persistencia local', 'Evita latencia de red y dependencias externas');
  assert.strictEqual(rDec.pass, true);
  assert.strictEqual(rDec.status, 'GUARDADA');

  const rLim = recordar(tempDir, 'limite', 'No tocar entorno de produccion bajo ninguna circunstancia');
  assert.strictEqual(rLim.pass, true);

  const rCorr = recordar(tempDir, 'correccion', 'No borrar archivos en rollback sin bandera prune');
  assert.strictEqual(rCorr.pass, true);

  const rConv = recordar(tempDir, 'convencion', 'Usar kebab-case en nombres de archivos de prueba');
  assert.strictEqual(rConv.pass, true);

  // 3a. Verificar que no quedan archivos temporales .tmp en el directorio de memoria
  const dirMem = path.join(tempDir, '.axion', 'memory');
  const archivosMem = fs.readdirSync(dirMem);
  assert.strictEqual(archivosMem.some((f) => f.includes('.tmp')), false, 'no deben quedar archivos temporales residuales');
  console.log('✓ Registro atómico de 4 tipos normativos sin residuos temporales verificado');

  // 4. Verificación de Memory Guard (detección de colisiones contra límites y correcciones)
  // 4a. Intento que colisiona con el límite de producción
  const guardProd = verificarGuard(tempDir, 'modificar base de datos en entorno produccion');
  assert.strictEqual(guardProd.pass, false, 'Memory Guard debe interceptar intento de tocar producción');
  assert.strictEqual(guardProd.hallazgos.length, 1);
  assert.strictEqual(guardProd.hallazgos[0].entrada.type, 'limite');

  // 4b. Intento que colisiona con la corrección de rollback
  const guardRollback = verificarGuard(tempDir, 'borrar archivos en operacion rollback');
  assert.strictEqual(guardRollback.pass, false, 'Memory Guard debe interceptar intento de borrar sin prune');
  assert.strictEqual(guardRollback.hallazgos[0].entrada.type, 'correccion');

  // 4c. Intento inocuo
  const guardInocuo = verificarGuard(tempDir, 'actualizar documentacion tecnica de la api');
  assert.strictEqual(guardInocuo.pass, true);
  assert.strictEqual(guardInocuo.hallazgos.length, 0);
  console.log('✓ Detección e intercepción determinista de Memory Guard verificada');

  // 5. Inyección priorizada en el ancla de contexto (bloqueParaAncla)
  const bloqueAncla = bloqueParaAncla(tempDir, 2);
  assert.strictEqual(Array.isArray(bloqueAncla), true);
  assert.strictEqual(bloqueAncla.length, 3); // 2 entradas + 1 aviso de truncamiento
  // El primer elemento debe ser el límite (prioridad máxima)
  assert.strictEqual(bloqueAncla[0].startsWith('- [limite]'), true);
  // El segundo elemento debe ser la corrección (prioridad 2)
  assert.strictEqual(bloqueAncla[1].startsWith('- [correccion]'), true);
  assert.strictEqual(bloqueAncla[2].includes('…y 2 más en `.axion/memory/MEMORY.md`'), true);
  console.log('✓ Priorización estricta (límite > corrección > decisión > convención) en bloqueParaAncla verificada');

  // 6. Olvido de entrada y regeneración automática del índice
  const resOlvido = olvidar(tempDir, rDec.entrada.id);
  assert.strictEqual(resOlvido.pass, true);
  assert.strictEqual(resOlvido.status, 'OLVIDADA');
  assert.strictEqual(resOlvido.total, 3);

  const indiceMD = fs.readFileSync(path.join(tempDir, '.axion', 'memory', 'MEMORY.md'), 'utf8');
  assert.strictEqual(indiceMD.includes(rDec.entrada.id), false);
  console.log('✓ Olvido de entrada y regeneración determinista de MEMORY.md verificada');

} finally {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (_) {}
}

console.log('\nPASS AX-F-070 — Invariantes de memoria persistente y Memory Guard demostrados al 100%.\n');
