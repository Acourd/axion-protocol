'use strict';

/**
 * Axion Protocol — Invariantes del Motor Scout de Reconocimiento y Auditoría de Licencias Clean-Room.
 *
 * Valida de forma estricta:
 * 1. Clasificación determinista de taxonomía de licencias SPDX (Permisiva, Copyleft Débil, Copyleft Fuerte, Restrictiva).
 * 2. Bloqueo fail-closed de adopciones que violen términos de licencia o carezcan de diseño Clean-Room.
 * 3. Extracción de primitivas de búsqueda técnica a partir de requerimientos de alto nivel.
 * 4. Generación de matriz de decisión táctica (BUILD_CLEAN_ROOM vs ADOPT vs EXTRACT_PATTERN).
 */

const assert = require('assert');
const path = require('path');
const LicenseAuditor = require('../../tools/license_auditor.js');
const ScoutEngine = require('../../tools/scout_engine.js');

console.log('=== AX-F-103 Invariantes del Motor Scout y Licenciamiento Clean-Room ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const licenseAuditor = new LicenseAuditor(ROOT);
const scoutEngine = new ScoutEngine(ROOT);

// 1. Validar clasificación de licencias
const mit = licenseAuditor.classifyLicense('MIT');
assert.strictEqual(mit.tier, 'PERMISSIVE', 'MIT debe ser PERMISSIVE');
assert.strictEqual(mit.commercialSafe, true, 'MIT debe ser commercialSafe');

const gpl = licenseAuditor.classifyLicense('GPL-3.0');
assert.strictEqual(gpl.tier, 'STRONG_COPYLEFT', 'GPL-3.0 debe ser STRONG_COPYLEFT');
assert.strictEqual(gpl.cleanRoomMandatory, true, 'GPL-3.0 debe exigir Clean-Room');

console.log('✓ Taxonomía SPDX validada: Permisivas identificadas y Copyleft señaladas para Clean-Room');

// 2. Validar auditoría de adopción y salvaguarda Clean-Room
const safeAudit = licenseAuditor.auditFeatureAdoption({
  name: 'Permissive Feature',
  license: 'Apache-2.0',
  isCleanRoomDesign: true
});
assert.strictEqual(safeAudit.status, 'APPROVED', 'Adopción permisiva debe ser aprobada');

const blockedAudit = licenseAuditor.auditFeatureAdoption({
  name: 'Proprietary Code Copy',
  license: 'Proprietary',
  isCleanRoomDesign: false
});
assert.strictEqual(blockedAudit.status, 'BLOCKED', 'Adopción propietaria sin Clean-Room debe ser bloqueada');
console.log('✓ Bloqueo fail-closed de adopciones con riesgo de propiedad intelectual verificado');

// 3. Validar extracción de primitivas de búsqueda
const primitives = scoutEngine.extractSearchPrimitives('necesito un firewall de preflight y memoria persistente');
assert.ok(primitives.length >= 2, 'Debe extraer múltiples primitivas técnicas');
assert.ok(primitives.some(p => p.includes('preflight') || p.includes('memory')), 'Debe contener términos relevantes');
console.log(`✓ Triangulación taxonómica verificada: [${primitives.join(' · ')}]`);

// 4. Validar reporte de reconocimiento
const scoutReport = scoutEngine.scoutLandscape('sistema de aislamiento de agentes', [
  { name: 'sample-permissive', license: 'MIT', bloatLevel: 'LOW', keyFeatures: ['A', 'B', 'C', 'D', 'E', 'F'] },
  { name: 'sample-gpl', license: 'GPL-3.0', bloatLevel: 'HIGH', keyFeatures: ['Kernel Hook'] }
]);

assert.strictEqual(scoutReport.cleanRoomGuaranteed, true, 'El reporte debe garantizar principio Clean-Room');
assert.strictEqual(scoutReport.evaluatedCandidatesCount, 2, 'Debe evaluar los 2 candidatos');
assert.strictEqual(scoutReport.candidates[0].recommendation, 'ADOPT_OR_INTEGRATE');
assert.strictEqual(scoutReport.candidates[1].recommendation, 'BUILD_CLEAN_ROOM');
console.log('✓ Matriz de decisión táctica y recomendaciones Clean-Room verificadas');

console.log('\nPASS AX-F-103 — Invariantes del motor Scout y licenciamiento Clean-Room verificados al 100%.');
