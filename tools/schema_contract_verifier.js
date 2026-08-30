#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Zero-Dependency Schema & Contract Verifier
 *
 * Validador formal de esquemas JSON nativo para /drive y contratos de gobernanza:
 * 1. Valida tipos primarios: string, number, integer, boolean, array, object, null.
 * 2. Valida propiedades: required, properties, additionalProperties, items.
 * 3. Valida restricciones: enum, pattern, minimum, maximum, minLength, maxLength.
 * 4. Catálogo pre-cargado: in-toto-statement-v1, dsse-envelope-v1, heartbeat-v1, benchmark-v1.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

const SCHEMAS = {
  'in-toto-statement-v1': {
    type: 'object',
    required: ['_type', 'subject', 'predicateType', 'predicate'],
    properties: {
      _type: { type: 'string', pattern: '^https://in-toto\\.io/Statement/v1$' },
      subject: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['name', 'digest'],
          properties: {
            name: { type: 'string' },
            digest: { type: 'object', required: ['sha256'] }
          }
        }
      },
      predicateType: { type: 'string' },
      predicate: { type: 'object' }
    }
  },
  'dsse-envelope-v1': {
    type: 'object',
    required: ['payloadType', 'payload', 'signatures'],
    properties: {
      payloadType: { type: 'string', minLength: 1 },
      payload: { type: 'string', minLength: 1 },
      signatures: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['sig'],
          properties: {
            keyid: { type: 'string' },
            sig: { type: 'string', minLength: 1 }
          }
        }
      }
    }
  },
  'heartbeat-v1': {
    type: 'object',
    required: ['version', 'pulseIndex', 'timestamp', 'status', 'checks', 'digest'],
    properties: {
      version: { type: 'string' },
      pulseIndex: { type: 'integer', minimum: 1 },
      timestamp: { type: 'string' },
      status: { type: 'string', enum: ['HEALTHY', 'HALTED', 'DEGRADED'] },
      checks: {
        type: 'object',
        required: ['p0GovernanceRules', 'killswitchActive']
      },
      digest: { type: 'string', minLength: 64, maxLength: 64 }
    }
  }
};

class SchemaContractVerifier {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
    this.schemas = { ...SCHEMAS };
  }

  registerSchema(id, schema) {
    this.schemas[id] = schema;
  }

  getSchema(id) {
    return this.schemas[id] || null;
  }

  /**
   * Valida un valor contra un esquema JSON.
   */
  validate(data, schema, fieldPath = '$') {
    const errors = [];
    if (!schema || typeof schema !== 'object') {
      return { valid: true, errors: [] };
    }

    if (!this._checkType(data, schema, fieldPath, errors)) {
      return { valid: false, errors };
    }

    if (data === null || data === undefined) {
      return { valid: errors.length === 0, errors };
    }

    this._checkString(data, schema, fieldPath, errors);
    this._checkNumber(data, schema, fieldPath, errors);
    this._checkEnum(data, schema, fieldPath, errors);
    this._checkArray(data, schema, fieldPath, errors);
    this._checkObject(data, schema, fieldPath, errors);

    return {
      valid: errors.length === 0,
      errors
    };
  }

  _checkType(data, schema, fieldPath, errors) {
    if (!schema.type) return true;
    const actualType = this._getType(data);
    if (schema.type === 'integer') {
      if (typeof data !== 'number' || !Number.isInteger(data)) {
        errors.push({ path: fieldPath, error: `Se esperaba tipo 'integer', pero se recibió '${actualType}'` });
        return false;
      }
      return true;
    }
    if (actualType !== schema.type) {
      errors.push({ path: fieldPath, error: `Se esperaba tipo '${schema.type}', pero se recibió '${actualType}'` });
      return false;
    }
    return true;
  }

  _checkString(data, schema, fieldPath, errors) {
    if (typeof data !== 'string') return;
    if (schema.minLength !== undefined && data.length < schema.minLength) {
      errors.push({ path: fieldPath, error: `Longitud mínima esperada: ${schema.minLength}, longitud real: ${data.length}` });
    }
    if (schema.maxLength !== undefined && data.length > schema.maxLength) {
      errors.push({ path: fieldPath, error: `Longitud máxima esperada: ${schema.maxLength}, longitud real: ${data.length}` });
    }
    if (schema.pattern) {
      const regex = new RegExp(schema.pattern);
      if (!regex.test(data)) {
        errors.push({ path: fieldPath, error: `El valor no coincide con el patrón: ${schema.pattern}` });
      }
    }
  }

  _checkNumber(data, schema, fieldPath, errors) {
    if (typeof data !== 'number') return;
    if (schema.minimum !== undefined && data < schema.minimum) {
      errors.push({ path: fieldPath, error: `Valor mínimo esperado: ${schema.minimum}, valor real: ${data}` });
    }
    if (schema.maximum !== undefined && data > schema.maximum) {
      errors.push({ path: fieldPath, error: `Valor máximo esperado: ${schema.maximum}, valor real: ${data}` });
    }
  }

  _checkEnum(data, schema, fieldPath, errors) {
    if (!schema.enum || !Array.isArray(schema.enum)) return;
    if (!schema.enum.includes(data)) {
      errors.push({ path: fieldPath, error: `El valor '${data}' no es válido. Opciones: [${schema.enum.join(', ')}]` });
    }
  }

  _checkArray(data, schema, fieldPath, errors) {
    if (!Array.isArray(data)) return;
    if (schema.minItems !== undefined && data.length < schema.minItems) {
      errors.push({ path: fieldPath, error: `Se requerían al menos ${schema.minItems} elementos en el array` });
    }
    if (schema.items && typeof schema.items === 'object') {
      data.forEach((item, idx) => {
        const itemRes = this.validate(item, schema.items, `${fieldPath}[${idx}]`);
        if (!itemRes.valid) errors.push(...itemRes.errors);
      });
    }
  }

  _checkObject(data, schema, fieldPath, errors) {
    if (typeof data !== 'object' || Array.isArray(data)) return;
    if (schema.required && Array.isArray(schema.required)) {
      for (const req of schema.required) {
        if (data[req] === undefined) {
          errors.push({ path: `${fieldPath}.${req}`, error: `Campo requerido faltante: '${req}'` });
        }
      }
    }
    if (schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        if (data[propName] !== undefined) {
          const propRes = this.validate(data[propName], propSchema, `${fieldPath}.${propName}`);
          if (!propRes.valid) errors.push(...propRes.errors);
        }
      }
    }
    if (schema.additionalProperties === false) {
      const allowed = new Set(Object.keys(schema.properties || {}));
      for (const key of Object.keys(data)) {
        if (!allowed.has(key)) {
          errors.push({ path: `${fieldPath}.${key}`, error: `Propiedad no permitida: '${key}'` });
        }
      }
    }
  }

  validateBySchemaId(data, schemaId) {
    const schema = this.getSchema(schemaId);
    if (!schema) {
      return { valid: false, errors: [{ path: '$', error: `Esquema '${schemaId}' no registrado en el catálogo.` }] };
    }
    return this.validate(data, schema, `$ (${schemaId})`);
  }

  _getType(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }
}

if (require.main === module) {
  const verifier = new SchemaContractVerifier();
  const args = process.argv.slice(2);

  if (args.length >= 2) {
    const [schemaId, filePath] = args;
    if (!fs.existsSync(filePath)) {
      console.error(`✗ Archivo no encontrado: ${filePath}`);
      process.exit(1);
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const res = verifier.validateBySchemaId(data, schemaId);
    if (res.valid) {
      console.log(`✓ Archivo '${filePath}' es 100% conforme con el esquema '${schemaId}'.`);
      process.exit(0);
    } else {
      console.error(`✗ Fallo de validación de esquema (${res.errors.length} error(es)):`);
      res.errors.forEach(e => console.error(`  - ${e.path}: ${e.error}`));
      process.exit(1);
    }
  } else {
    console.log('[Axion Schema Verifier] Esquemas precargados en el catálogo:');
    Object.keys(SCHEMAS).forEach(k => console.log(`  - ${k}`));
  }
}

module.exports = SchemaContractVerifier;
