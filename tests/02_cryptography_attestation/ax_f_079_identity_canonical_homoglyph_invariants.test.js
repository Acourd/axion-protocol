'use strict';

const assert = require('assert');
const {
  canonicalActorId,
  mismoActor,
  buscarAlias,
  RAZON
} = require('../../tools/identity_canonical.js');

console.log('=== AX-F-079 Invariantes de Identidad Canónica, Detección de Homóglifos y Separación de Roles ===\n');

// 1. Rechazo de entradas no textuales y vacías
assert.strictEqual(canonicalActorId(null).ok, false);
assert.strictEqual(canonicalActorId(null).reason, RAZON.NOT_A_STRING);

assert.strictEqual(canonicalActorId('').ok, false);
assert.strictEqual(canonicalActorId('   ').reason, RAZON.EMPTY);
console.log('✓ Rechazo de entradas no válidas y vacías verificado');

// 2. Rechazo de caracteres invisibles y Zero-Width Spaces
const conZeroWidth = 'alice\u200Bsmith';
const conBOM = '\uFEFFalice';
assert.strictEqual(canonicalActorId(conZeroWidth).ok, false);
assert.strictEqual(canonicalActorId(conZeroWidth).reason, RAZON.INVISIBLE_CHARS);
assert.strictEqual(canonicalActorId(conBOM).reason, RAZON.INVISIBLE_CHARS);
console.log('✓ Detección y rechazo de caracteres invisibles (ZWS, BOM) verificado');

// 3. Rechazo de mezcla de escrituras (Mixed-Script Spoofing)
const mezclaCirilica = 'alic\u0430'; // 'a' cirílica mezclada con 'alic' latino
assert.strictEqual(canonicalActorId(mezclaCirilica).ok, false);
assert.strictEqual(canonicalActorId(mezclaCirilica).reason, RAZON.MIXED_SCRIPT);

const mezclaGriega = 'sec\u03BFnd'; // 'o' griega mezclada con latino
assert.strictEqual(canonicalActorId(mezclaGriega).ok, false);
assert.strictEqual(canonicalActorId(mezclaGriega).reason, RAZON.MIXED_SCRIPT);
console.log('✓ Rechazo de ataques de mezcla de alfabetos (Latin + Cirílico/Griego) verificado');

// 4. Aceptación de alfabetos puros y normalización de espacios
const puroLatino = '  Alice   Smith  ';
const resLatino = canonicalActorId(puroLatino);
assert.strictEqual(resLatino.ok, true);
assert.strictEqual(resLatino.canonical, 'alice smith');

const puroCirilico = 'алиса'; // 'алиса' puramente cirílico
const resCirilico = canonicalActorId(puroCirilico);
assert.strictEqual(resCirilico.ok, true);
console.log('✓ Aceptación de alfabetos puros y colapso de espacios intermedios verificado');

// 5. Fail-closed en mismoActor: ante entradas inválidas asume colisión (true)
assert.strictEqual(mismoActor('alice', 'alice'), true);
assert.strictEqual(mismoActor('Alice', 'alice  '), true);
assert.strictEqual(mismoActor('alice', 'bob'), false);
assert.strictEqual(mismoActor('alice', null), true, 'ante entrada no interpretable debe asumir colisión');
assert.strictEqual(mismoActor(mezclaCirilica, 'bob'), true, 'ante identificador inválido debe asumir colisión');
console.log('✓ Comportamiento fail-closed de mismoActor verificado');

// 6. Detección de colisiones de alias en buscarAlias
const listaSinColision = ['alice', 'bob', 'charlie'];
assert.strictEqual(buscarAlias(listaSinColision), null);

const listaConColision = ['alice', 'Alice', 'bob'];
const resColision = buscarAlias(listaConColision);
assert.notStrictEqual(resColision, null);
assert.strictEqual(resColision.reason, 'IDENTITY_ALIAS_COLLISION');
assert.strictEqual(resColision.canonical, 'alice');
console.log('✓ Detección de alias colisionantes en registros de autoridad verificada');

console.log('\nPASS AX-F-079 — Invariantes de identidad canónica demostrados al 100%.\n');
