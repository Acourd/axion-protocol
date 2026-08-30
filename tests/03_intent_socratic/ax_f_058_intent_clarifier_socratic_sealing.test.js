'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const {
  analyzeUserIntent,
  getTailoredStyleOptions,
  hasTechnicalSpecificity,
  sealIntent,
  persistContract
} = require('../../tools/intent_clarifier.js');

console.log('=== AX-F-058 Sellado Criptográfico e Invariantes Socráticas de IntentClarifier ===\n');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'axion_intent_test_'));

try {
  // 1. Manejo fail-closed de entradas vacías o no textuales
  const rVacio = analyzeUserIntent('   ');
  assert.strictEqual(rVacio.status, 'NEEDS_CLARIFICATION');
  assert.strictEqual(rVacio.questions.length >= 1, true);
  console.log('✓ Entrada vacía tratada fail-closed con solicitud de aclaración');

  // 2. Detección de ambigüedad y generación de opciones A/B/C + Dictado Libre
  const rDifuso = analyzeUserIntent('haz una pagina');
  assert.strictEqual(rDifuso.status, 'NEEDS_CLARIFICATION');
  assert.strictEqual(rDifuso.substep, 1);
  assert.strictEqual(rDifuso.options.length, 4); // A, B, C + Personalizada
  assert.strictEqual(rDifuso.options[3].name.includes('Dictado Libre'), true);
  console.log('✓ Despliegue de opciones A/B/C con opción de dictado libre verificado');

  // 3. Filtrado dinámico en Sub-paso 2 por categoría de producto
  const optDashboard = getTailoredStyleOptions('panel de metricas');
  assert.strictEqual(optDashboard.some(o => o.name.includes('Slate Dark')), true);

  const optLanding = getTailoredStyleOptions('landing page oficial');
  assert.strictEqual(optLanding.some(o => o.name.includes('Glassmorphism')), true);

  const optMobile = getTailoredStyleOptions('app movil touch');
  assert.strictEqual(optMobile.some(o => o.name.includes('Fluid Touch')), true);
  console.log('✓ Adaptación de estilos UX por categoría (Dashboard / Landing / Mobile) verificada');

  // 4. Especificidad técnica inmediata sin preguntas redundantes
  assert.strictEqual(hasTechnicalSpecificity('modificar tools/preflight.js para soporte regex'), true);
  assert.strictEqual(hasTechnicalSpecificity('verificar 80 suites de prueba con sha256'), true);
  assert.strictEqual(hasTechnicalSpecificity('crea un diseño bonito'), false);

  const rTecnico = analyzeUserIntent('actualizar tools/evidence_hasher.js y verificar tests/run_all.js', {
    projectRoot: tempDir
  });
  assert.strictEqual(rTecnico.status, 'INTENT_CLARIFIED');
  assert.strictEqual(Boolean(rTecnico.intentContract.contract_id), true);
  console.log('✓ Inferencia directa ante especificaciones técnicas verificada');

  // 5. Sellado explícito de contrato con firma SHA-256
  const rSellado = sealIntent('Diseñar landing page', 'Opción A: Minimalista + Opción Slate Dark', tempDir);
  assert.strictEqual(rSellado.status, 'INTENT_CLARIFIED');
  
  const contractPath = path.join(tempDir, '.axion', 'state', 'intent-contract.json');
  assert.strictEqual(fs.existsSync(contractPath), true);

  const contractData = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  assert.strictEqual(Boolean(contractData.digest), true);

  // Recalcular digest SHA-256 canónico para verificar consistencia
  const { hashCanonical } = require('../../tools/canonical_json.js');
  const clone = { ...contractData };
  const originalDigest = clone.digest;
  delete clone.digest;
  const recalculated = hashCanonical(clone);
  assert.strictEqual(originalDigest, recalculated, 'el digest SHA-256 del contrato debe ser criptográficamente exacto');
  console.log('✓ Sellado atómico y verificación criptográfica de IntentContract verificados');

} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log('\nPASS AX-F-058 — Invariantes socráticas y sellado de intención demostrados al 100%.\n');
