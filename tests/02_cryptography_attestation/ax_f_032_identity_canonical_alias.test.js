'use strict';

const assert = require('assert');
const { canonicalActorId, mismoActor, buscarAlias } = require('../../tools/identity_canonical.js');

console.log('=== AX-F-032 Identidad Canónica, Detección de Homóglifos y Separación de Roles ===\n');

// 1. Normalización de espacios, mayúsculas y NFKC
const c1 = canonicalActorId('  Alice   Smith  ');
assert.strictEqual(c1.ok, true);
assert.strictEqual(c1.canonical, 'alice smith');

const c2 = canonicalActorId('ALICE SMITH');
assert.strictEqual(c2.ok, true);
assert.strictEqual(c2.canonical, 'alice smith');
assert.strictEqual(mismoActor('Alice Smith', 'ALICE SMITH'), true, 'debe identificar al mismo actor sin importar mayúsculas o espacios');
console.log('✓ Normalización de mayúsculas y colapso de espacios verificados');

// 2. Rechazo de caracteres invisibles y de control (Zero-Width, BOM)
const invisible = canonicalActorId('alice\u200Bsmith');
assert.strictEqual(invisible.ok, false);
assert.strictEqual(invisible.reason, 'IDENTITY_INVISIBLE_CHARS');

const bom = canonicalActorId('\uFEFFalice');
assert.strictEqual(bom.ok, false);
assert.strictEqual(bom.reason, 'IDENTITY_INVISIBLE_CHARS');
console.log('✓ Rechazo de caracteres invisibles y marcas de orden de bytes (BOM) verificado');

// 3. Rechazo estricto de mezcla de escrituras (Mixed-Script Spoofing)
// 'а' cirílica (\u0430) mezclada con 'lice' latino
const mixed = canonicalActorId('\u0430lice');
assert.strictEqual(mixed.ok, false);
assert.strictEqual(mixed.reason, 'IDENTITY_MIXED_SCRIPT');
console.log('✓ Rechazo de ataques de mezcla de alfabetos (Mixed-Script) verificado');

// 4. Detección de alias homóglifos en listas de autoridades
const listaSinColision = ['alice', 'bob', 'charlie'];
assert.strictEqual(buscarAlias(listaSinColision), null, 'lista limpia no debe tener alias');

const listaConColision = ['alice smith', 'Alice   Smith'];
const colision = buscarAlias(listaConColision);
assert.notStrictEqual(colision, null);
assert.strictEqual(colision.canonical, 'alice smith');
console.log('✓ Detección de colisiones y alias en autoridades verificada');

// 5. Comportamiento Fail-Closed en caso de error
assert.strictEqual(mismoActor('alice', '\u0430lice'), true, 'ante identificador inválido debe asumir colisión para proteger separación de roles');
assert.strictEqual(mismoActor(null, 'bob'), true, 'ante null debe fallar cerrado');
console.log('✓ Comportamiento Fail-Closed ante entradas inválidas verificado');

console.log('\nPASS AX-F-032 — Identidad canónica y anti-spoofing homoglífico verificados al 100%.\n');
