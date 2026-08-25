'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  recordar,
  olvidar,
  buscar,
  bloqueParaAncla,
  verificarGuard
} = require('../../tools/memory.js');

console.log('=== AX-F-038 Memoria Persistente, Memory Guard y Jerarquía de Prioridades ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const testDir = path.join(ROOT, 'scratch', 'test_memory_system');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

// 1. Validación de tipos y requisito de porqué en decisiones
const rInvalido = recordar(testDir, 'tipo_inventado', 'texto');
assert.strictEqual(rInvalido.pass, false);
assert.strictEqual(rInvalido.status, 'TIPO_DESCONOCIDO');

const rDecisionSinPorque = recordar(testDir, 'decision', 'usar postgres');
assert.strictEqual(rDecisionSinPorque.pass, false);
assert.strictEqual(rDecisionSinPorque.status, 'DECISION_SIN_PORQUE');
console.log('✓ Rechazo de tipos desconocidos y exigencia de porqué en decisiones verificado');

// 2. Registro de límite, convención, corrección y decisión
const rLimite = recordar(testDir, 'limite', 'no tocar esquemas de base de datos de producción');
assert.strictEqual(rLimite.pass, true);

const rCorreccion = recordar(testDir, 'correccion', 'usar spawnSync con shell false siempre');
assert.strictEqual(rCorreccion.pass, true);

const rConvencion = recordar(testDir, 'convencion', 'todo test debe ser determinista');
assert.strictEqual(rConvencion.pass, true);

const rDecision = recordar(testDir, 'decision', 'mantener cero dependencias externas', 'garantizar portabilidad total');
assert.strictEqual(rDecision.pass, true);
console.log('✓ Registro de las 4 clases de memoria verificado');

// 3. Priorización en bloqueParaAncla (límite > corrección > decisión > convención)
const bloque = bloqueParaAncla(testDir);
assert.strictEqual(bloque[0].includes('[limite]'), true, 'límite debe encabezar la prioridad');
assert.strictEqual(bloque[1].includes('[correccion]'), true, 'corrección debe ser la segunda prioridad');
console.log('✓ Jerarquía de prioridades en el bloque de anclaje verificada');

// 4. Memory Guard detectando violación de límites
const guardDetectado = verificarGuard(testDir, 'voy a modificar esquemas de base de datos de producción');
assert.strictEqual(guardDetectado.pass, false, 'debe bloquear intento de violar límite');
assert.strictEqual(guardDetectado.hallazgos.length > 0, true);

const guardLimpio = verificarGuard(testDir, 'actualizar documentación del proyecto');
assert.strictEqual(guardLimpio.pass, true);
console.log('✓ Detección de violación de límites en Memory Guard verificada');

// 5. Olvido de entradas y regeneración
const rOlvidar = olvidar(testDir, rLimite.entrada.id);
assert.strictEqual(rOlvidar.pass, true);
assert.strictEqual(rOlvidar.status, 'OLVIDADA');

// Limpieza
fs.rmSync(testDir, { recursive: true, force: true });
console.log('✓ Ciclo de vida completo de memoria verificado');

console.log('\nPASS AX-F-038 — Memoria persistente y Memory Guard verificados al 100%.\n');
