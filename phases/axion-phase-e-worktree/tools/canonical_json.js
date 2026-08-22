'use strict';

const crypto = require('crypto');

function canonicalize(value) {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Canonical JSON rechaza números no finitos.');
    return Object.is(value, -0) ? '0' : JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (typeof value !== 'object') {
    throw new TypeError(`Canonical JSON rechaza valores ${typeof value}.`);
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError('Canonical JSON solo acepta objetos JSON planos.');
  }

  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`)
    .join(',')}}`;
}

function hashCanonical(value) {
  return crypto.createHash('sha256').update(canonicalize(value), 'utf8').digest('hex');
}

module.exports = { canonicalize, hashCanonical };
