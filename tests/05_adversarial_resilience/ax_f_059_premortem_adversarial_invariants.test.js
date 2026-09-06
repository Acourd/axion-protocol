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

  // 7. Invariante de Blast Radius Acotado en [0, 100] y selectividad de rutas críticas
  const brPeriferico = PreMortemEngine.calculateBlastRadius({ files: ['docs/README.md'] });
  assert.strictEqual(brPeriferico.score, 10);
  assert.strictEqual(brPeriferico.riskLevel, 'LOW');

  const brToolsSecundario = PreMortemEngine.calculateBlastRadius({ files: ['tools/scratch_helper.js'] });
  assert.strictEqual(brToolsSecundario.score, 10, 'tools/* secundarios no deben activar sobrecoste ciego de infraestructura');

  const brInfraCritica = PreMortemEngine.calculateBlastRadius({ files: ['tools/killswitch.js'] });
  assert.strictEqual(brInfraCritica.score, 40, '10 base + 30 infraestructura crítica');
  assert.strictEqual(brInfraCritica.riskLevel, 'MODERATE');

  const brMaximo = PreMortemEngine.calculateBlastRadius({
    files: ['bin/axion.js', '.github/workflows/ci.yml', 'policies/risk.yaml', 'tools/preflight.js', 'tools/attestation.js', 'tools/repo_attestation_generator.js', 'a.js', 'b.js', 'c.js'],
    altersPublicInterface: true,
    isIrreversible: true,
  });
  assert.strictEqual(brMaximo.score, 100, 'Blast radius no puede exceder 100');
  assert.strictEqual(brMaximo.capped, true);
  assert.strictEqual(brMaximo.riskLevel, 'CRITICAL');
  console.log('✓ Invariante de Blast Radius acotado en [0, 100] con selectividad crítica demostrada');

  // 8. Invariante de Proporcionalidad: NO_APLICA con justificación técnica
  const payloadNoAplica = {
    feature_name: 'Optimizador Matemático Interno',
    anchors: {
      security: ['Riesgo de buffer overflow en operaciones de matrices densas no comprobadas'],
      performance: ['Consumo cuadrático de tiempo en cálculo de autovalores para matrices grandes'],
      architecture: ['Acoplamiento innecesario entre el optimizador y la capa de almacenamiento'],
      ux: ['NO_APLICA: Algoritmo puramente numérico sin interacción con usuarios ni CLI']
    },
    competence_check: { justified: true, bloat_risk: false },
    worst_case_scenarios: [
      'Corrupción de cálculo en matrices singulares provocando NaN no propagados',
      'Desbordamiento de pila en recursión de divide y vencerás sin caso base'
    ],
    mandatory_mitigations: ['Implementar verificación previa de dimensiones y condición de matriz'],
    depth_level: 2
  };
  const rNoAplica = engine.evaluateAssessment(payloadNoAplica);
  assert.strictEqual(rNoAplica.status, 'APPROVED');
  assert.strictEqual(rNoAplica.exitCode, 0);

  const payloadBadNoAplica = {
    ...payloadNoAplica,
    feature_name: 'Optimizador con Justificación Pobre',
    anchors: {
      ...payloadNoAplica.anchors,
      ux: ['NO_APLICA'] // Sin justificación (menos de 15 chars)
    }
  };
  const rBadNoAplica = engine.evaluateAssessment(payloadBadNoAplica);
  assert.strictEqual(rBadNoAplica.status, 'DENIED');
  assert.strictEqual(rBadNoAplica.reason, 'PREMORTEM_INCOMPLETE');
  console.log('✓ Invariante de proporcionalidad con NO_APLICA y justificación técnica demostrada');

  // 9. Invariante de Aceptación Humana Trazable (HUMAN_RISK_ACCEPTED)
  const payloadHRA = {
    feature_name: 'Spike Experimental Aprobado por Humano',
    anchors: {
      security: ['Superficie de ataque experimental en driver preliminar sin sandbox formal'],
      performance: ['Consumo errático de recursos en hilos secundarios durante fase alfa'],
      architecture: ['Deuda técnica consciente introducida para validar viabilidad de mercado'],
      ux: ['NO_APLICA: Módulo de laboratorio interno sin superficie de usuario final']
    },
    competence_check: { justified: false }, // Derivaría REJECTED_AS_UNJUSTIFIED
    worst_case_scenarios: [
      'Falla del driver requiriendo reinicio del proceso principal en desarrollo',
      'Incompatibilidad con kernels antiguos requiriendo rollback manual'
    ],
    mandatory_mitigations: ['Restringir la ejecución exclusivamente a flags experimentales en entornos de desarrollo aislados'],
    human_risk_acceptance: {
      accepted: true,
      rationale: 'Riesgo aceptado formalmente por el arquitecto líder para validación de hipótesis de negocio',
      operator: 'Lead Architect (@adrian)'
    },
    depth_level: 2
  };
  const rHRA = engine.evaluateAssessment(payloadHRA);
  assert.strictEqual(rHRA.status, 'APPROVED');
  assert.strictEqual(rHRA.exitCode, 0);
  assert.strictEqual(rHRA.verdict, 'HUMAN_RISK_ACCEPTED');
  assert.strictEqual(rHRA.human_risk_accepted, true);
  assert.strictEqual(rHRA.human_operator, 'Lead Architect (@adrian)');
  console.log('✓ Invariante de aceptación formal de riesgo por operador humano demostrada');

  // 10. Invariante de Estado Intermedio (REQUIERE_DESCUBRIMIENTO)
  const payloadDiscovery = {
    feature_name: 'Propuesta con Incertidumbre Crítica',
    discovery_required: true,
    anchors: {
      security: ['Se desconoce la especificación de cifrado del proveedor externo'],
      performance: ['Sin perfiles de latencia estimados para la API remota de terceros'],
      architecture: ['Contratos de integración formales no provistos explícitamente en la documentación oficial'],
      ux: ['NO_APLICA: Canal de sincronización M2M en background sin UX directa']
    },
    competence_check: { justified: true, bloat_risk: false },
    worst_case_scenarios: [
      'Bloqueo operativo total por discrepancias de protocolo no documentadas',
      'Falla de autenticación por rotación no controlada de tokens OAuth'
    ],
    mandatory_mitigations: ['Completar spike exhaustivo de descubrimiento técnico e investigación previa con /clarify'],
    depth_level: 2
  };
  const rDiscovery = engine.evaluateAssessment(payloadDiscovery);
  assert.strictEqual(rDiscovery.status, 'DISCOVERY_REQUIRED');
  assert.strictEqual(rDiscovery.exitCode, 2);
  assert.strictEqual(rDiscovery.verdict, 'REQUIERE_DESCUBRIMIENTO');
  console.log('✓ Invariante de REQUIERE_DESCUBRIMIENTO ante carencia de contexto demostrada');

} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log('\nPASS AX-F-059 — Invariantes adversariales de PreMortem v3.2.0 demostradas al 100%.\n');
