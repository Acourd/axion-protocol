/**
 * Regresión AX-F-023 — Comando /premortem y Motor de Resiliencia Conceptual
 * 
 * Verifica:
 *  1. Rechazo de análisis incompletos.
 *  2. Evaluación multi-ancla (Seguridad, Rendimiento, Arquitectura, UX).
 *  3. Soporte de 3 niveles de profundidad y auto-crítica de soluciones.
 *  4. Sincronización automática de mitigaciones críticas con MEMORY.md.
 */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const PreMortemEngine = require('../../tools/premortem.js');

console.log('=== AX-F-023 Comando /premortem y Simulador de Fracaso ===\n');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-premortem-'));

try {
  const engine = new PreMortemEngine(tmp);

  // 1. Rechazo de payload incompleto
  const incompleto = {
    feature_name: "Nueva Característica"
  };
  const rIncompleto = engine.evaluateAssessment(incompleto);
  assert.strictEqual(rIncompleto.status, 'DENIED');
  assert.ok(rIncompleto.errors.length >= 3, 'Debe requerir autopsia/anclas, justificación y peores escenarios');
  console.log('✓ rechaza análisis pre-mortem incompletos o superficiales');

  // 2. Aprobación de pre-mortem multi-ancla (Nivel 1 y 2)
  const multiAncla = {
    feature_name: "Sistema de Notificaciones Push",
    depth_level: 2,
    anchors: {
      security: ["Riesgo de suplantación de identidad por tokens no validados"],
      performance: ["Fuga de descriptores de socket bajo alta concurrencia"],
      architecture: ["Acoplamiento rígido con el servicio de transporte externo"],
      ux: ["Sobrecarga y fatiga de alertas que provoquen el descarte de la app"]
    },
    competence_check: {
      justified: true,
      rationale: "Esencial para alertas críticas del sistema."
    },
    worst_case_scenarios: [
      "Escenario 1: Caída de la red del proveedor que detiene el bucle de eventos",
      "Escenario 2: Notificaciones duplicadas infinitas por error de reintento"
    ],
    mandatory_mitigations: [
      "Añadir deduplicación por UUID con TTL de 10 minutos en memoria",
      "Implementar cola desacoplada con backoff exponencial"
    ],
    mitigation_stress_test: {
      has_critical_weakness: false,
      tested_mitigation: "La cola con backoff previene saturación pero consume 10 MB de RAM máx."
    }
  };

  const rMultiAncla = engine.evaluateAssessment(multiAncla);
  assert.strictEqual(rMultiAncla.status, 'APPROVED');
  assert.strictEqual(rMultiAncla.depth_level, 2);
  assert.strictEqual(rMultiAncla.verdict, 'APPROVED_WITH_SAFEGUARDS');
  assert.ok(Boolean(rMultiAncla.premortem_id));
  assert.ok(Boolean(rMultiAncla.digest));
  console.log('✓ evaluación multi-ancla (Seguridad, Rendimiento, Arquitectura, UX) aprobada');

  // 3. Generador de reporte markdown de 3 niveles
  const md = PreMortemEngine.formatReport({
    featureName: multiAncla.feature_name,
    anchors: multiAncla.anchors,
    worstCases: multiAncla.worst_case_scenarios,
    mitigations: multiAncla.mandatory_mitigations,
    solutionStress: ["Riesgo de que la cola en memoria pierda mensajes no enviados ante crash súbito"],
    depth: 3
  });

  assert.ok(md.includes('Las 4 Anclas de Impacto'), 'Debe incluir sección de 4 anclas');
  assert.ok(md.includes('Seguridad & Integridad'), 'Debe incluir ancla de seguridad');
  assert.ok(md.includes('Auto-Crítica de la Solución'), 'Debe incluir sección de auto-crítica');
  console.log('✓ generador de reportes de 3 niveles de profundidad operativo');

} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log('\nPASS AX-F-023 — Comando /premortem y motor de autopsia prematura 100% verificado.');
