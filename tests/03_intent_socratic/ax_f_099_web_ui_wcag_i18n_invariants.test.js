'use strict';

/**
 * Axion Protocol — Invariantes de Accesibilidad WCAG, Paridad i18n y Suite Web UI.
 *
 * Valida de forma estricta:
 * 1. Estructura semántica del DOM en docs/site/index.html (doctype, lang, main, nav, footer).
 * 2. Paridad 100% de los diccionarios i18n (EN y ES) en script.js sin claves huérfanas.
 * 3. Presencia de tokens CSS de tema oscuro y claro (--bg-deep, --bg-surface, --emerald-radiant).
 * 4. Catálogo íntegro de los 12 comandos esenciales expuestos en la interfaz web.
 */

const assert = require('assert');
const path = require('path');
const WebUiAuditor = require('../../tools/web_ui_auditor.js');

console.log('=== AX-F-099 Invariantes de Accesibilidad Web UI (WCAG & i18n) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const siteDir = path.join(ROOT, 'docs', 'site');
const auditor = new WebUiAuditor(siteDir);

const results = auditor.auditAll();

// 1. Validar semántica DOM (WCAG)
assert.strictEqual(results.domSemantic.pass, true, 'La semántica DOM debe cumplir con los estándares WCAG');
console.log('✓ Semántica DOM verificada: doctype, lang, main, nav, viewport y footer presentes');

// 2. Validar paridad i18n bilingüe
assert.strictEqual(results.i18nParity.pass, true, 'La paridad i18n debe ser del 100%');
assert.strictEqual(results.i18nParity.missingInEs.length, 0, 'No deben faltar claves en español');
assert.strictEqual(results.i18nParity.missingInEn.length, 0, 'No deben faltar claves en inglés');
console.log(`✓ Paridad i18n verificada: ${results.i18nParity.enCount} claves sincronizadas entre EN y ES`);

// 3. Validar tokens de color CSS
assert.strictEqual(results.colorTokens.pass, true, 'Deben existir todos los tokens de diseño CSS');
console.log(`✓ Tokens de color verificados: ${results.colorTokens.tokensFound} variables activas en style.css`);

// 4. Validar los 12 comandos en HTML
assert.strictEqual(results.commandsCheck.pass, true, 'Los 12 comandos deben estar presentes en el sitio web');
console.log('✓ Los 12 comandos de gobernanza verificados en la interfaz interactiva');

assert.strictEqual(results.pass, true, 'La auditoría web global debe retornar pass: true');

console.log('\nPASS AX-F-099 — Invariantes de accesibilidad Web UI y bilingüismo verificados al 100%.');
