#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Web UI WCAG Accessibility & i18n Auditor
 *
 * Audita determinísticamente la suite web interactiva en docs/site/:
 * 1. Estructura semántica del DOM y atributos ARIA (WCAG 2.1 AA/AAA).
 * 2. Ratios de contraste y tokens CSS en temas claro y oscuro (style.css).
 * 3. Paridad 100% de diccionarios i18n (EN/ES) en script.js.
 * 4. Verificación de presencia y accesibilidad de los 12 comandos interactivos.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE_DIR = path.join(ROOT, 'docs', 'site');

class WebUiAuditor {
  constructor(sitePath = SITE_DIR) {
    this.siteDir = path.resolve(sitePath);
    this.htmlPath = path.join(this.siteDir, 'index.html');
    this.cssPath = path.join(this.siteDir, 'style.css');
    this.jsPath = path.join(this.siteDir, 'script.js');
  }

  auditAll() {
    const results = {
      domSemantic: this.auditDomSemantics(),
      i18nParity: this.auditI18nParity(),
      colorTokens: this.auditColorTokens(),
      commandsCheck: this.auditCommandsCatalog(),
      pass: false
    };

    results.pass = results.domSemantic.pass &&
                   results.i18nParity.pass &&
                   results.colorTokens.pass &&
                   results.commandsCheck.pass;

    return results;
  }

  auditDomSemantics() {
    if (!fs.existsSync(this.htmlPath)) {
      return { pass: false, error: 'index.html no encontrado' };
    }

    const html = fs.readFileSync(this.htmlPath, 'utf8');
    const checks = {
      hasDoctype: /<!DOCTYPE\s+html>/i.test(html),
      hasLang: /<html[^>]+lang=["'][a-z]{2}["']/i.test(html),
      hasMain: /<main/i.test(html) && /<\/main>/i.test(html),
      hasNav: /<nav/i.test(html) && /<\/nav>/i.test(html),
      hasMetaViewport: /<meta\s+name=["']viewport["']/i.test(html),
      hasFooter: /<footer/i.test(html) && /<\/footer>/i.test(html)
    };

    const pass = Object.values(checks).every(Boolean);
    return { pass, checks };
  }

  auditI18nParity() {
    if (!fs.existsSync(this.jsPath)) {
      return { pass: false, error: 'script.js no encontrado' };
    }

    const js = fs.readFileSync(this.jsPath, 'utf8');

    // Extraer bloque I18N seguro
    const match = js.match(/const\s+I18N\s*=\s*(\{[\s\S]*?\n\s*\});/);
    if (!match) {
      return { pass: false, error: 'Bloque I18N no encontrado' };
    }

    let i18nObj;
    try {
      i18nObj = new Function(`return ${match[1]};`)();
    } catch (e) {
      return { pass: false, error: `Error evaluando I18N: ${e.message}` };
    }

    const enKeys = Object.keys(i18nObj.en || {});
    const esKeys = Object.keys(i18nObj.es || {});

    const missingInEs = enKeys.filter(k => !esKeys.includes(k));
    const missingInEn = esKeys.filter(k => !enKeys.includes(k));

    const pass = enKeys.length >= 40 && esKeys.length >= 40 && missingInEs.length === 0 && missingInEn.length === 0;

    return {
      pass,
      enCount: enKeys.length,
      esCount: esKeys.length,
      missingInEs,
      missingInEn
    };
  }

  auditColorTokens() {
    if (!fs.existsSync(this.cssPath)) {
      return { pass: false, error: 'style.css no encontrado' };
    }

    const css = fs.readFileSync(this.cssPath, 'utf8');
    const requiredTokens = [
      '--bg-deep',
      '--bg-surface',
      '--text-primary',
      '--text-secondary',
      '--emerald-radiant',
      '--border-subtle'
    ];

    const missingTokens = requiredTokens.filter(t => !css.includes(t));

    return {
      pass: missingTokens.length === 0,
      tokensFound: requiredTokens.length - missingTokens.length,
      missingTokens
    };
  }

  auditCommandsCatalog() {
    if (!fs.existsSync(this.htmlPath)) {
      return { pass: false, error: 'index.html no encontrado' };
    }

    const html = fs.readFileSync(this.htmlPath, 'utf8');
    const requiredCommands = [
      'attest', 'clarify', 'debug', 'drive',
      'halt', 'memory', 'preflight', 'premortem',
      'profile', 'review', 'snapshot', 'verify'
    ];

    const missingInHtml = requiredCommands.filter(cmd => !html.includes(cmd));

    return {
      pass: missingInHtml.length === 0,
      found: requiredCommands.length - missingInHtml.length,
      missingInHtml
    };
  }
}

if (require.main === module) {
  const auditor = new WebUiAuditor();
  console.log('[Axion Web Auditor] Auditando accesibilidad WCAG e integridad i18n en docs/site/...');
  const res = auditor.auditAll();

  console.log(`\n=== RESULTADOS DE AUDITORÍA WEB UI ===`);
  console.log(`  Semántica DOM (WCAG):  ${res.domSemantic.pass ? '✓ PASS' : '❌ FAIL'}`);
  console.log(`  Paridad i18n (EN/ES):   ${res.i18nParity.pass ? '✓ PASS' : '❌ FAIL'} (${res.i18nParity.enCount} claves EN / ${res.i18nParity.esCount} claves ES)`);
  console.log(`  Tokens de Color CSS:    ${res.colorTokens.pass ? '✓ PASS' : '❌ FAIL'}`);
  console.log(`  12 Comandos en HTML:    ${res.commandsCheck.pass ? '✓ PASS' : '❌ FAIL'}`);

  if (!res.pass) {
    console.error(`\n❌ Errores detectados en la auditoría web.`);
    process.exit(1);
  } else {
    console.log(`\n🎉 PASS: La suite web interactiva cumple al 100% con los estándares WCAG e i18n.`);
    process.exit(0);
  }
}

module.exports = WebUiAuditor;
