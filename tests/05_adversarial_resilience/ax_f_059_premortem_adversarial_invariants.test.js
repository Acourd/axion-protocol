'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const PreMortemEngine = require('../../tools/premortem.js');
const { VEREDICTOS } = PreMortemEngine;

console.log('=== AX-F-059 Invariantes Adversariales y Derivación de Veredictos en PreMortem ===\n');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'axion_premortem_test_'));

try {
  const engine = new PreMortemEngine(tempDir);

  // 1. Rechazo de texto superficial sin sustancia (menos de 40 caracteres o 6 palabras)
  const payloadSuperficial = {
    feature_name: 'Auth Refactor',
    anchors: {
      security: ['riesgo leve'], // Corto
      performance: ['posible lentitud'],
      architecture: ['deuda tecnica'],
      ux: ['cambio de interfaz']
    },
    competence_check: { justified: true, bloat_risk: false },
    worst_case_scenarios: ['caida total del sistema en produccion con perdida de datos', 'fuga masiva de credenciales'],
    mandatory_mitigations: ['implementar pruebas unitarias completas y verificacion formal']
  };
  const rSuperficial = engine.evaluateAssessment(payloadSuperficial);
  assert.strictEqual(rSuperficial.status, 'DENIED');
  assert.strictEqual(rSuperficial.reason, 'PREMORTEM_INCOMPLETE');
  console.log('✓ Rechazo fail-closed de análisis con texto superficial verificado');

  // 2. Base de payload válido con sustancia completa
  const baseValid = {
    feature_name: 'Motor Criptográfico Cuántico',
    anchors: {
      security: ['Vulnerabilidad de canal lateral en la generación determinista de entropía cuántica'],
      performance: ['Consumo excesivo de ciclos de CPU durante el cálculo recursivo de firmas asimétricas'],
      architecture: ['Acoplamiento excesivo con módulos externos rompiendo la arquitectura zero dependencias'],
      ux: ['Complejidad cognitiva para el desarrollador al configurar las llaves asimétricas']
    },
    competence_check: { justified: true, bloat_risk: false },
    worst_case_scenarios: [
      'Corrupción silenciosa del estado de claves provocando pérdida irreversible de validaciones',
      'Bloqueo catastrófico de hilos de ejecución en el runtime principal de Node.js'
    ],
    mandatory_mitigations: [
      'Encapsular la generación de llaves en buffers inmutables con comprobación estricta de límites'
    ],
    mitigation_stress_test: {
      tested_mitigation: 'Prueba de estrés continuo bajo concurrencia masiva sin fugas de memoria',
      has_critical_weakness: false,
      notes: 'La mitigación demostró ser robusta en simulaciones de carga deterministas'
    },
    depth_level: 3
  };

  // 3. Evaluación exitosa y sellado de nivel 3
  const rValido = engine.evaluateAssessment(baseValid);
  assert.strictEqual(rValido.status, 'APPROVED');
  assert.strictEqual(rValido.exitCode, 0);
  assert.strictEqual(rValido.verdict, 'APPROVED_WITH_SAFEGUARDS');
  assert.strictEqual(rValido.depth_level, 3);
  console.log('✓ Evaluación y sellado de pre-mortem nivel 3 verificado');

  // 4. Derivación automática ante bloat_risk con frases sustantivas propias
  const payloadBloat = {
    feature_name: 'Característica Superflua Bloat',
    anchors: {
      security: ['Riesgo de superficie de ataque innecesaria agregando endpoints no utilizados'],
      performance: ['Consumo injustificado de memoria persistente por estructuras accesorias'],
      architecture: ['Sobrecarga de capas de abstracción innecesarias que complican el mantenimiento'],
      ux: ['Saturación visual de opciones redundantes que confunden a los usuarios finales']
    },
    competence_check: { justified: true, bloat_risk: true },
    worst_case_scenarios: [
      'Abandono del componente por complejidad inmanejable y deuda técnica acumulada',
      'Degradación general de la mantenibilidad del proyecto por código muerto'
    ],
    mandatory_mitigations: [
      'Eliminar código prescindible y acotar el alcance a la funcionalidad esencial'
    ],
    depth_level: 2
  };
  const rBloat = engine.evaluateAssessment(payloadBloat);
  assert.strictEqual(rBloat.status, 'DENIED');
  assert.strictEqual(rBloat.exitCode, 1);
  assert.strictEqual(rBloat.verdict, 'REJECTED_AS_BLOAT');
  console.log('✓ Derivación estricta de REJECTED_AS_BLOAT verificada');

  // 5. Asimetría de veredicto: bloqueo de suavizado (Downgrade Refusal)
  const payloadDowngrade = {
    feature_name: 'Intento de Suavizado Malicioso',
    anchors: {
      security: ['Falta de justificación técnica exponiendo vectores de riesgo innecesarios'],
      performance: ['Desperdicio de ciclos de CPU en operaciones no requeridas por el negocio'],
      architecture: ['Introducción de patrones discordantes sin valor arquitectónico comprobable'],
      ux: ['Fricción adicional en flujos críticos sin beneficio medible para el usuario']
    },
    competence_check: { justified: false, bloat_risk: false }, // Deriva REJECTED_AS_UNJUSTIFIED
    worst_case_scenarios: [
      'Inversión de cientos de horas de ingeniería en código que nadie utilizará',
      'Confusión en auditorías regulatorias por falta de justificación causal'
    ],
    mandatory_mitigations: [
      'Detener la implementación de inmediato y reevaluar la necesidad funcional'
    ],
    depth_level: 2,
    verdict: 'APPROVED_WITH_SAFEGUARDS' // Intento de autoproclamar aprobación
  };
  const rDowngrade = engine.evaluateAssessment(payloadDowngrade);
  assert.strictEqual(rDowngrade.status, 'DENIED');
  assert.strictEqual(rDowngrade.reason, 'VERDICT_DOWNGRADE_REFUSED');
  console.log('✓ Bloqueo inviolable ante intentos de suavizar veredictos adversariales verificado');

  // 6. Detección de calco / boilerplate reciclado
  const payloadCalco = {
    ...baseValid,
    feature_name: 'Segunda Característica con Mismo Texto Reciclado'
  };
  const rCalco = engine.evaluateAssessment(payloadCalco);
  assert.strictEqual(rCalco.status, 'DENIED');
  assert.strictEqual(rCalco.reason, 'PREMORTEM_BOILERPLATE');
  console.log('✓ Intercepción de autopsias recicladas (PREMORTEM_BOILERPLATE) verificada');

} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log('\nPASS AX-F-059 — Invariantes adversariales de PreMortem demostradas al 100%.\n');
