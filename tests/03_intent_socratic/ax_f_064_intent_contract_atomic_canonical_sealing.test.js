'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  analyzeUserIntent,
  hasTechnicalSpecificity,
  sealIntent,
  persistContract
} = require('../../tools/intent_clarifier.js');
const { hashCanonical } = require('../../tools/canonical_json.js');

console.log('=== AX-F-064 Sellado Atómico y Canónico del Contrato de Intención (Fase 1: ENTENDER) ===\n');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-intent-clarifier-test-'));

try {
  // 1. Detección de especificidad técnica (evita preguntas socráticas redundantes)
  assert.strictEqual(hasTechnicalSpecificity('modificar tools/killswitch.js para verificar invariants'), true);
  assert.strictEqual(hasTechnicalSpecificity('correr node tests/run_all.js con sha256'), true);
  assert.strictEqual(hasTechnicalSpecificity('agregar 12 suites de regresión'), true);
  assert.strictEqual(hasTechnicalSpecificity('quiero hacer algo bonito'), false);
  assert.strictEqual(hasTechnicalSpecificity('haz una app'), false);
  console.log('✓ Filtro de especificidad técnica (hasTechnicalSpecificity) verificado');

  // 2. Análisis y generación de preguntas socráticas para peticiones vagas
  const resVaga = analyzeUserIntent('hazme una landing page', { projectRoot: tempDir });
  assert.strictEqual(resVaga.status, 'NEEDS_CLARIFICATION');
  assert.strictEqual(resVaga.questions.length, 2);
  assert.strictEqual(resVaga.options.length >= 3, true);
  assert.strictEqual(resVaga.options.some((o) => o.name.includes('Dictado Libre')), true);
  console.log('✓ Generación de 2 preguntas socráticas con opciones A/B/C + Dictado Libre verificada');

  // 3. Persistencia atómica de contrato con hash canónico RFC 8785
  const baseContract = {
    category: 'Landing Page Oficial',
    selectedStyle: 'Estilo Apple Glassmorphism Minimalista',
    targetAudience: 'Desarrolladores y Creadores',
    requirements: ['Cero dependencias', 'Modo oscuro']
  };
  const rawReq = 'Crear landing page oficial para Axion Protocol';

  const resPersist = persistContract(baseContract, rawReq, tempDir);
  assert.strictEqual(resPersist.success, true);
  assert.strictEqual(fs.existsSync(resPersist.targetPath), true);
  assert.strictEqual(/^[a-f0-9]{64}$/.test(resPersist.digest), true);

  // 3a. Comprobar que no quedan ficheros temporales .tmp en el directorio
  const stateFiles = fs.readdirSync(path.dirname(resPersist.targetPath));
  assert.strictEqual(stateFiles.some((f) => f.includes('.tmp')), false, 'no deben quedar archivos temporales residuales');
  console.log('✓ Persistencia atómica segura sin residuos temporales verificada');

  // 4. Determinismo canónico de firma RFC 8785
  const savedContract = JSON.parse(fs.readFileSync(resPersist.targetPath, 'utf8'));
  assert.strictEqual(savedContract.category, baseContract.category);
  assert.strictEqual(savedContract.rawRequest, rawReq);

  // Recalcular digest canónico sobre el payload sin la clave digest
  const { digest: _, ...payloadWithoutDigest } = savedContract;
  const recalculatedDigest = hashCanonical(payloadWithoutDigest);
  assert.strictEqual(savedContract.digest, recalculatedDigest, 'el digest guardado debe coincidir exactamente con el hash canónico RFC 8785');
  console.log('✓ Determinismo de digest canónico RFC 8785 verificado');

  // 5. Sellado explícito de intención (sealIntent)
  const resSeal = sealIntent(rawReq, 'Opción A: Glassmorphism Minimalista', tempDir);
  assert.strictEqual(resSeal.status, 'INTENT_CLARIFIED');
  assert.strictEqual(resSeal.substep, 3);
  assert.strictEqual(typeof resSeal.intentContract, 'object');
  console.log('✓ Sellado formal de intención (sealIntent) verificado');

} finally {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (_) {}
}

console.log('\nPASS AX-F-064 — Sellado atómico y canónico de IntentContract demostrado al 100%.\n');
