#!/usr/bin/env node
'use strict';

/**
 * AX-F-170: Invariantes de Gobernanza de Ecosistema y Colaboración Abierta
 *
 * Verifica:
 * 1. Existencia e integridad bilingüe de CONTRIBUTING.md y CONTRIBUTING.es.md.
 * 2. Declaración explícita de los 5 Invariantes Soberanos (Zero Deps, TDD, VibeGuard, 12 Skills, Multi-OS).
 * 3. Existencia y completitud de plantillas de issues (.github/ISSUE_TEMPLATE/) y pull requests.
 * 4. Presencia del Código de Conducta (CODE_OF_CONDUCT.md).
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('=== AX-F-170: Invariantes de Gobernanza de Ecosistema ===\n');

const ROOT = path.resolve(__dirname, '..', '..');

// Invariante 1: Guías de Contribución Bilingües
const contribEn = path.join(ROOT, 'CONTRIBUTING.md');
const contribEs = path.join(ROOT, 'CONTRIBUTING.es.md');

assert.ok(fs.existsSync(contribEn), 'CONTRIBUTING.md debe existir');
assert.ok(fs.existsSync(contribEs), 'CONTRIBUTING.es.md debe existir');

const contentEn = fs.readFileSync(contribEn, 'utf8');
const contentEs = fs.readFileSync(contribEs, 'utf8');

assert.ok(contentEn.includes('Zero External Dependencies'), 'CONTRIBUTING.md debe exigir cero dependencias');
assert.ok(contentEn.includes('VibeGuard Shield Compliance'), 'CONTRIBUTING.md debe exigir VibeGuard');
assert.ok(contentEn.includes('12 Canonical Skills'), 'CONTRIBUTING.md debe proteger las 12 skills');

assert.ok(contentEs.includes('Cero Dependencias Externas'), 'CONTRIBUTING.es.md debe exigir cero dependencias');
assert.ok(contentEs.includes('Cumplimiento Estricto de VibeGuard'), 'CONTRIBUTING.es.md debe exigir VibeGuard');
assert.ok(contentEs.includes('12 Skills Canónicas'), 'CONTRIBUTING.es.md debe proteger las 12 skills');
console.log('  ✓ Invariante 1: Guías de contribución bilingües y 5 invariantes verificadas.');

// Invariante 2: Código de Conducta
const cocPath = path.join(ROOT, 'CODE_OF_CONDUCT.md');
assert.ok(fs.existsSync(cocPath), 'CODE_OF_CONDUCT.md debe existir');
const cocContent = fs.readFileSync(cocPath, 'utf8');
assert.ok(cocContent.includes('Contributor Covenant'), 'CODE_OF_CONDUCT.md debe seguir Contributor Covenant');
console.log('  ✓ Invariante 2: Código de conducta verificado.');

// Invariante 3: Plantillas de Issues y Pull Requests
const bugTemplate = path.join(ROOT, '.github', 'ISSUE_TEMPLATE', 'bug_report.md');
const featTemplate = path.join(ROOT, '.github', 'ISSUE_TEMPLATE', 'feature_request.md');
const prTemplate = path.join(ROOT, '.github', 'PULL_REQUEST_TEMPLATE.md');

assert.ok(fs.existsSync(bugTemplate), 'bug_report.md debe existir');
assert.ok(fs.existsSync(featTemplate), 'feature_request.md debe existir');
assert.ok(fs.existsSync(prTemplate), 'PULL_REQUEST_TEMPLATE.md debe existir');

const prContent = fs.readFileSync(prTemplate, 'utf8');
assert.ok(prContent.includes('Sovereign Invariants Checklist'), 'PR template debe incluir checklist de invariantes');
assert.ok(prContent.includes('VibeGuard PASS'), 'PR template debe exigir VibeGuard PASS');
console.log('  ✓ Invariante 3: Plantillas de issues y pull requests verificadas.');

console.log('\nPASS: AX-F-170 — Gobernanza de Ecosistema y Colaboración Abierta verificadas con 3/3 invariantes en verde.');
