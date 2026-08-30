'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { getProfile, saveCustomProfile, parseAnswers } = require('../../tools/profile_adapter.js');

console.log('=== AX-F-025 Calibración de Perfil: parseo, fusión atómica, persistencia y CLI ===\n');

const ROOT = path.resolve(__dirname, '..', '..');

// Dos arenales, uno por escenario de persistencia. No es redundancia: el escenario de
// "guardar y releer" deja technical_depth=BUILDER en disco, y si el escenario de "fusión
// no destructiva" heredase ese estado, su aserción final pasaría aunque la escritura no
// hiciese nada. Separarlos mantiene ambas comprobaciones capaces de fallar.
const dirPersistencia = path.join(ROOT, 'scratch', 'test_profile_target');
const dirFusion = path.join(ROOT, 'scratch', 'test_profile_calibration');

for (const d of [dirPersistencia, dirFusion]) {
  if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true });
  fs.mkdirSync(d, { recursive: true });
}

// --- 1. Perfil por defecto cuando no existe fichero ---
// Los valores van escritos a mano a propósito. Compararlos contra DEFAULT_PROFILE, que es
// justo lo que getProfile devuelve, produce una aserción que no puede fallar: un cambio
// silencioso del perfil de fábrica movería los dos lados de la igualdad a la vez.
const def = getProfile(dirPersistencia);
assert.strictEqual(def.technical_depth, 'VISIONARY', 'el perfil por defecto debe ser VISIONARY');
assert.strictEqual(def.input_mode, 'VOICE_DICTATION', 'el método de entrada por defecto debe ser VOICE_DICTATION');
assert.strictEqual(def.creative_autonomy, 'HIGH', 'la autonomía creativa por defecto debe ser HIGH');
console.log('✓ Lectura de perfil por defecto correcta');

// --- 2. Parseo de tokens separados ---
const p1 = parseAnswers(['1C', '2B', '3B', '4A', '5B']);
assert.strictEqual(p1.errores.length, 0, 'no debe haber errores en respuestas válidas');
assert.strictEqual(p1.cambios.technical_depth, 'ENGINEER', '1C debe mapear a ENGINEER');
assert.strictEqual(p1.cambios.creative_autonomy, 'GUIDED_DIRECTION', '5B debe mapear a GUIDED_DIRECTION');

const p2 = parseAnswers(['1B', '2A', '3B', '4C', '5B']);
assert.strictEqual(p2.errores.length, 0, 'no debe haber errores en respuestas válidas');
assert.strictEqual(p2.cambios.technical_depth, 'BUILDER', '1B debe mapear a BUILDER');
assert.strictEqual(p2.cambios.input_mode, 'VOICE_DICTATION', '2A debe mapear a VOICE_DICTATION');
assert.strictEqual(p2.cambios.environment, 'CLI_TERMINAL', '3B debe mapear a CLI_TERMINAL');
console.log('✓ Parseo de tokens separados verificado');

// --- 3. Parseo de dictado continuo, por las dos entradas que acepta la función ---
// parseAnswers bifurca en Array.isArray: una rama hace join(' ') y la otra String(). Se
// ejercitan las dos, porque quien dicta por voz llega por cualquiera de ellas.
const pArray = parseAnswers(['1A2A3A4A5A']);
assert.strictEqual(pArray.errores.length, 0, 'debe parsear respuestas pegadas dentro de un array');
assert.strictEqual(pArray.cambios.cadence, 'COMPLETE_BLOCK', '4A debe mapear a COMPLETE_BLOCK');

const pCadena = parseAnswers('1C2B3A4A5A');
assert.strictEqual(pCadena.errores.length, 0, 'debe parsear una cadena pegada sin envolver en array');
assert.strictEqual(pCadena.cambios.technical_depth, 'ENGINEER', '1C debe mapear a ENGINEER también desde cadena cruda');
assert.strictEqual(pCadena.cambios.input_mode, 'KEYBOARD_CONCISE', '2B debe mapear a KEYBOARD_CONCISE');
assert.strictEqual(pCadena.cambios.environment, 'IDE_GUI', '3A debe mapear a IDE_GUI');
console.log('✓ Parseo de dictado continuo verificado en ambas ramas');

// --- 4. Detección de respuestas inválidas ---
// Cuenta exacta, no "mayor que cero": 1Z es una opción inexistente de una dimensión que sí
// existe, y 9A es una dimensión inexistente. Son dos fallos de naturaleza distinta y el
// parser debe reportar los dos, no quedarse en el primero.
const pInvalidaArray = parseAnswers(['1Z', '2A', '9A']);
assert.strictEqual(pInvalidaArray.errores.length, 2, 'debe reportar la opción 1Z inválida y la pregunta 9 inexistente');

const pInvalidaCadena = parseAnswers('1Z 9A');
assert.strictEqual(pInvalidaCadena.errores.length, 2, 'debe reportar los dos fallos también desde cadena cruda');
console.log('✓ Detección de respuestas inválidas verificada');

// --- 5. Persistencia en disco: lo guardado se relee, no se supone ---
const guardado = saveCustomProfile({ technical_depth: 'BUILDER', custom_flag: true }, dirPersistencia);
assert.strictEqual(guardado.technical_depth, 'BUILDER');
assert.strictEqual(guardado.custom_flag, true);
assert.strictEqual(guardado.input_mode, 'VOICE_DICTATION', 'debe preservar campos no tocados');

const releido = getProfile(dirPersistencia);
assert.strictEqual(releido.technical_depth, 'BUILDER', 'el valor debe sobrevivir al viaje por disco');
assert.strictEqual(releido.custom_flag, true, 'el campo custom debe sobrevivir al viaje por disco');
console.log('✓ Persistencia en disco y relectura verificadas');

// --- 6. Fusión no destructiva entre escrituras sucesivas ---
// El defecto que vigila: una segunda escritura que reemplace el fichero en vez de fusionarlo
// borraría los metadatos que puso la primera. Por eso hacen falta dos guardados.
const primero = saveCustomProfile({ custom_meta_flag: 'preserved_val' }, dirFusion);
assert.strictEqual(primero.custom_meta_flag, 'preserved_val');
assert.strictEqual(typeof primero.updated_at, 'string', 'toda escritura debe sellar updated_at');

const segundo = saveCustomProfile({ technical_depth: 'BUILDER' }, dirFusion);
assert.strictEqual(segundo.custom_meta_flag, 'preserved_val', 'la fusión no debe eliminar campos previos');
assert.strictEqual(segundo.technical_depth, 'BUILDER', 'la segunda escritura debe aplicar su cambio');
console.log('✓ Fusión no destructiva entre escrituras sucesivas verificada');

// --- 7. Códigos de salida del CLI ---
// Un rechazo tiene que doler en el código de salida, o cualquier CI deja pasar la respuesta
// inválida sin enterarse. Ésta es la única suite que cruza el límite de proceso.
const rOk = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'profile_adapter.js'), 'set', '1B', '2A', '--target', dirPersistencia]);
assert.strictEqual(rOk.status, 0, 'set con argumentos válidos debe salir con 0');

const rFail = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'profile_adapter.js'), 'set', '1Z', '--target', dirPersistencia]);
assert.strictEqual(rFail.status, 1, 'set con opción inválida debe salir con 1');

const rEmpty = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'profile_adapter.js'), 'set', 'foo', '--target', dirPersistencia]);
assert.strictEqual(rEmpty.status, 1, 'set con texto sin formato debe salir con 1');
console.log('✓ Códigos de salida deterministas (0 / 1) verificados en CLI');

// --- Limpieza ---
// Las pruebas no dejan estado detrás: si el arenal sobrevive, la siguiente corrida arranca
// desde un perfil ya calibrado y el resultado pasa a depender del orden de ejecución.
for (const d of [dirPersistencia, dirFusion]) {
  fs.rmSync(d, { recursive: true, force: true });
}
console.log('✓ Limpieza de arenales completada');

console.log('\nPASS AX-F-025 — Perfil adaptativo: parseo, fusión, persistencia y CLI verificados al 100%.\n');
