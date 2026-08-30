'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  DIMENSIONES,
  getProfile,
  saveCustomProfile,
  parseAnswers,
  applyAnswers,
} = require('../../tools/profile_adapter.js');

console.log('=== AX-F-071 Invariantes de Calibración de Perfil, Adaptabilidad de 5 Dimensiones y Persistencia Atómica ===\n');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-profile-test-'));

try {
  // 1. Lectura por defecto ante ausencia de fichero
  const pDefault = getProfile(tempDir);
  // Los valores van escritos a mano a propósito. Comparar getProfile() contra
  // DEFAULT_PROFILE, que es justo lo que esa función devuelve, produce una aserción que no
  // puede fallar: los dos lados de la igualdad se mueven juntos. Medido por mutación
  // (2026-08-25): cambiando el perfil de fábrica de VISIONARY a ENGINEER, esta suite seguía
  // en verde mientras ax_f_025 —que usa literales— se ponía en rojo.
  assert.strictEqual(pDefault.technical_depth, 'VISIONARY');
  assert.strictEqual(pDefault.input_mode, 'VOICE_DICTATION');
  assert.strictEqual(pDefault.environment, 'IDE_GUI');
  assert.strictEqual(pDefault.cadence, 'COMPLETE_BLOCK');
  assert.strictEqual(pDefault.creative_autonomy, 'HIGH');
  console.log('✓ Fallback determinista a DEFAULT_PROFILE ante ausencia de fichero verificado');

  // 2. Resiliencia fail-safe ante fichero PROFILE.json corrupto
  const dirAxion = path.join(tempDir, '.axion');
  fs.mkdirSync(dirAxion, { recursive: true });
  fs.writeFileSync(path.join(dirAxion, 'PROFILE.json'), '{ json malformado y corrupto...', 'utf8');

  const pCorrupt = getProfile(tempDir);
  assert.strictEqual(pCorrupt.profile_read_error, true);
  assert.strictEqual(pCorrupt.technical_depth, 'VISIONARY', 'un perfil ilegible debe degradar al de fábrica, no a otra cosa');
  console.log('✓ Resiliencia y fallback ante PROFILE.json corrupto verificado');

  // 3. Persistencia atómica de perfil personalizado
  const customData = {
    technical_depth: 'ENGINEER',
    environment: 'CLI_TERMINAL',
    cadence: 'MICRO_STEPS'
  };
  const pSaved = saveCustomProfile(customData, tempDir);
  assert.strictEqual(pSaved.technical_depth, 'ENGINEER');
  assert.strictEqual(pSaved.environment, 'CLI_TERMINAL');
  assert.strictEqual(pSaved.cadence, 'MICRO_STEPS');
  assert.strictEqual(pSaved.input_mode, 'VOICE_DICTATION', 'debe preservar campos no tocados');
  assert.strictEqual(Boolean(pSaved.updated_at), true);

  // 3a. Comprobar que no quedan archivos temporales .tmp
  const archivosAxion = fs.readdirSync(dirAxion);
  assert.strictEqual(archivosAxion.some((f) => f.includes('.tmp')), false, 'no deben quedar archivos temporales');
  console.log('✓ Persistencia atómica y fusión de campos sin residuos temporales verificada');

  // 4. Parseo de respuestas (parseAnswers): separado y pegado (dictado por voz)
  const resSeparado = parseAnswers(['1C', '2B', '3B', '4A', '5B']);
  assert.strictEqual(resSeparado.errores.length, 0);
  assert.strictEqual(resSeparado.aplicadas.length, 5);
  assert.strictEqual(resSeparado.cambios.technical_depth, 'ENGINEER');
  assert.strictEqual(resSeparado.cambios.input_mode, 'KEYBOARD_CONCISE');
  assert.strictEqual(resSeparado.cambios.environment, 'CLI_TERMINAL');
  assert.strictEqual(resSeparado.cambios.cadence, 'COMPLETE_BLOCK');
  assert.strictEqual(resSeparado.cambios.creative_autonomy, 'GUIDED_DIRECTION');

  const resPegado = parseAnswers('1a2a3a4c5a');
  assert.strictEqual(resPegado.errores.length, 0);
  assert.strictEqual(resPegado.aplicadas.length, 5);
  assert.strictEqual(resPegado.cambios.technical_depth, 'VISIONARY');
  assert.strictEqual(resPegado.cambios.cadence, 'HYBRID_ADAPTIVE');
  console.log('✓ Parseo robusto de respuestas separadas y pegadas (dictado por voz) verificado');

  // 5. Matriz de rechazo ante opciones o preguntas inválidas
  const resInvalido = parseAnswers('9Z 1Z 2X');
  assert.strictEqual(resInvalido.errores.length, 3);
  assert.strictEqual(resInvalido.errores[0].includes('la pregunta 9 no existe'), true);
  assert.strictEqual(resInvalido.errores[1].includes('no admite la opcion Z'), true);
  console.log('✓ Detección de errores y opciones fuera de rango verificada');

  // 6. Aplicación y persistencia completa (applyAnswers)
  const resApply = applyAnswers('1C 2B 3B 4C 5A', tempDir);
  assert.strictEqual(resApply.aplicadas.length, 5);
  const pFinal = getProfile(tempDir);
  assert.strictEqual(pFinal.technical_depth, 'ENGINEER');
  assert.strictEqual(pFinal.input_mode, 'KEYBOARD_CONCISE');
  assert.strictEqual(pFinal.environment, 'CLI_TERMINAL');
  assert.strictEqual(pFinal.cadence, 'HYBRID_ADAPTIVE');
  assert.strictEqual(pFinal.creative_autonomy, 'HIGH');
  console.log('✓ Aplicación y persistencia de las 5 dimensiones en disco verificada');

} finally {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (_) {}
}

console.log('\nPASS AX-F-071 — Invariantes de calibración de perfil demostrados al 100%.\n');
