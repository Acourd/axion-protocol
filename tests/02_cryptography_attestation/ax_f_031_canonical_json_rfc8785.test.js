'use strict';

const assert = require('assert');
const { canonicalize, hashCanonical } = require('../../tools/canonical_json.js');

console.log('=== AX-F-031 Serialización Canónica Determinista RFC 8785 (Canonical JSON) ===\n');

// 1. Normalización de orden de claves independiente de inserción
const objA = { z: 100, b: 20, a: 10, m: { y: 2, x: 1 } };
const objB = { a: 10, m: { x: 1, y: 2 }, z: 100, b: 20 };

const canonA = canonicalize(objA);
const canonB = canonicalize(objB);

assert.strictEqual(canonA, canonB, 'la serialización canónica debe ser idéntica sin importar el orden de inserción');
assert.strictEqual(canonA, '{"a":10,"b":20,"m":{"x":1,"y":2},"z":100}');

const hashA = hashCanonical(objA);
const hashB = hashCanonical(objB);
assert.strictEqual(hashA, hashB, 'los hashes SHA-256 canónicos deben ser exactamente idénticos');
console.log('✓ Ordenamiento lexicográfico de claves y hash determinista verificados');

// 2. Normalización de valores numéricos especiales
assert.strictEqual(canonicalize(-0), '0', '-0 debe normalizarse a 0');
assert.strictEqual(canonicalize(0), '0');

assert.throws(() => canonicalize(NaN), /rechaza números no finitos/);
assert.throws(() => canonicalize(Infinity), /rechaza números no finitos/);
assert.throws(() => canonicalize(-Infinity), /rechaza números no finitos/);
console.log('✓ Normalización de -0 y rechazo de NaN/Infinity verificados');

// 3. Resistencia a prototype pollution y objetos no planos
class ObjetoPersonalizado {
  constructor() {
    this.campo = 'valor';
  }
}
assert.throws(() => canonicalize(new ObjetoPersonalizado()), /solo acepta objetos JSON planos/);
assert.throws(() => canonicalize(new Date()), /solo acepta objetos JSON planos/);

const conPrototipo = Object.create({ heredado: true });
conPrototipo.propio = 1;
assert.throws(() => canonicalize(conPrototipo), /solo acepta objetos JSON planos/);

// Objeto con Object.create(null) sí es un objeto plano válido
const sinProto = Object.create(null);
sinProto.x = 'ok';
assert.strictEqual(canonicalize(sinProto), '{"x":"ok"}');
console.log('✓ Resistencia a contaminación de prototipo y rechazo de clases complejas verificados');

// 4. Tipos primitivos soportados
assert.strictEqual(canonicalize(null), 'null');
assert.strictEqual(canonicalize(true), 'true');
assert.strictEqual(canonicalize(false), 'false');
assert.strictEqual(canonicalize('cadena con "comillas" y \n saltos'), JSON.stringify('cadena con "comillas" y \n saltos'));
assert.strictEqual(canonicalize([]), '[]');
assert.strictEqual(canonicalize({}), '{}');
assert.throws(() => canonicalize(undefined), /rechaza valores undefined/);
assert.throws(() => canonicalize(Symbol('sym')), /rechaza valores symbol/);
console.log('✓ Tipos primitivos, colecciones vacías y rechazo de undefined/symbol verificados');

console.log('\nPASS AX-F-031 — Serialización canónica RFC 8785 y hashing SHA-256 verificados al 100%.\n');
