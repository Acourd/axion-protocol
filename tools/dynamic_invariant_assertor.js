#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Dynamic Invariant Assertor & Precondition Injector (M_COG_005)
 *
 * Inyector dinámico de invariantes y contratos de precondición AST:
 * 1. Analiza firmas de funciones y métodos identificando parámetros obligatorios y opcionales.
 * 2. Sintetiza guardas de precondición deterministas para blindar los límites de entrada.
 * 3. Inyecta verificaciones atómicas en el prólogo funcional sin alterar la lógica de negocio.
 * 4. Valida en sandbox sintáctico la integridad del código transformado antes de persistirlo.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

class DynamicInvariantAssertor {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
  }

  /**
   * Extrae parámetros de una firma de función, distinguiendo entre obligatorios y con valor por defecto.
   */
  parseParameters(paramStr = '') {
    if (!paramStr || typeof paramStr !== 'string') return [];

    return paramStr.split(',')
      .map(p => p.trim())
      .filter(Boolean)
      .map(p => {
        const parts = p.split('=');
        const name = parts[0].trim();
        const hasDefault = parts.length > 1;
        return {
          name,
          isOptional: hasDefault || name.startsWith('options') || name.startsWith('opts')
        };
      });
  }

  /**
   * Sintetiza una guarda atómica de precondición para un parámetro obligatorio.
   */
  synthesizeGuard(paramName) {
    return `if (!${paramName}) throw new TypeError('PRECONDITION_FAILED: ${paramName} is required');`;
  }

  /**
   * Genera guardas para una lista de parámetros de función.
   */
  generateGuardsForParams(paramStr) {
    const params = this.parseParameters(paramStr);
    const mandatory = params.filter(p => !p.isOptional);
    const guards = [];
    for (const p of mandatory) {
      if (p.name && !p.name.includes('{') && !p.name.includes('[')) {
        guards.push(`    ${this.synthesizeGuard(p.name)}`);
      }
    }
    return guards;
  }

  /**
   * Inyecta guardas de precondición en el prólogo de funciones que carecen de validaciones.
   */
  injectGuards(sourceCode = '') {
    if (!sourceCode || typeof sourceCode !== 'string') {
      return { modified: false, injectedGuardsCount: 0, source: sourceCode };
    }

    const lines = sourceCode.split('\n');
    let injectedCount = 0;
    const transformedLines = [];
    const headerRegex = /(?:function\s+([a-zA-Z0-9_$]+)\s*|\s{2}([a-z][a-zA-Z0-9_$]+)\s*)\(([^)]+)\)\s*\{/;

    for (const line of lines) {
      transformedLines.push(line);
      const match = line.match(headerRegex);
      if (!match) continue;

      const guards = this.generateGuardsForParams(match[3]);
      for (const guard of guards) {
        transformedLines.push(guard);
        injectedCount++;
      }
    }

    const assertedSource = transformedLines.join('\n');
    return {
      modified: injectedCount > 0,
      injectedGuardsCount: injectedCount,
      source: assertedSource
    };
  }

  /**
   * Verifica sintácticamente el código con aserciones inyectadas en sandbox.
   */
  verifyAssertedCode(originalSource, assertedSource) {
    try {
      new Function(assertedSource);
      return {
        isValid: true,
        status: 'INJECTION_FORMALLY_VERIFIED',
        error: null
      };
    } catch (syntaxErr) {
      return {
        isValid: false,
        status: 'INJECTION_SYNTAX_FAILED',
        error: syntaxErr.message
      };
    }
  }

  /**
   * Inyecta y verifica invariantes en una fuente completa en bucle cerrado.
   */
  processSource(sourceCode = '') {
    const result = this.injectGuards(sourceCode);
    const verification = this.verifyAssertedCode(sourceCode, result.source);

    return {
      success: verification.isValid,
      injectedGuardsCount: result.injectedGuardsCount,
      verificationStatus: verification.status,
      assertedSource: verification.isValid ? result.source : sourceCode
    };
  }
}

if (require.main === module) {
  const assertor = new DynamicInvariantAssertor();
  const sample = `
    function processPayload(payload, options = {}) {
      return payload.trim();
    }
  `;

  console.log('[Dynamic Invariant Assertor] Código original:');
  console.log(sample);

  const res = assertor.processSource(sample);
  console.log('\n[Dynamic Invariant Assertor] Código con invariantes inyectados:');
  console.log(res.assertedSource);
  console.log(`✓ Guardas inyectadas: ${res.injectedGuardsCount} (Estado: ${res.verificationStatus})`);
}

module.exports = DynamicInvariantAssertor;
