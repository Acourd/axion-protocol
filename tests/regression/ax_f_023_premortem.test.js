/**
 * Regresión AX-F-023 — Comando /premortem y Motor de Resiliencia Conceptual
 * 
 * Verifica que el simulador de fracaso evalúa las autopsias prematuras,
 * valida medidas de mitigación obligatorias y rechaza análisis incompletos.
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
  assert.ok(rIncompleto.errors.length >= 3, 'Debe requerir autopsia, justificación y peores escenarios');
  console.log('✓ rechaza análisis pre-mortem incompletos o superficiales');

  // 2. Aprobación de pre-mortem completo con blindaje
  const completo = {
    feature_name: "Sistema de Caché en Memoria",
    failure_hypotheses: [
      "Razón 1: Desincronización de caché que entrega datos obsoletos a clientes en producción",
      "Razón 2: Crecimiento no acotado del heap en Node.js que provoca Out-Of-Memory en servidores",
      "Razón 3: Complejidad excesiva de invalidación que introduce bugs en operaciones atómicas"
    ],
    competence_check: {
      justified: true,
      rationale: "Optimiza la latencia en 90% para lecturas repetitivas sin sobrecargar la base de datos."
    },
    worst_case_scenarios: [
      "Escenario 1: Concurrencia masiva simultánea que satura el recolector de basura de V8",
      "Escenario 2: Caída intempestiva del proceso que pierde escrituras no confirmadas en disco"
    ],
    mandatory_mitigations: [
      "Implementar política estricta de desalojo LRU con límite de memoria fijo (máximo 50 MB)",
      "Añadir expiración TTL determinista para cada clave"
    ]
  };

  const rCompleto = engine.evaluateAssessment(completo);
  assert.strictEqual(rCompleto.status, 'APPROVED');
  assert.strictEqual(rCompleto.verdict, 'APPROVED_WITH_SAFEGUARDS');
  assert.ok(Boolean(rCompleto.premortem_id), 'Debe emitir ID de pre-mortem');
  assert.ok(Boolean(rCompleto.digest), 'Debe emitir digest SHA-256');
  console.log('✓ pre-mortem formal aprobado con salvaguardas y firmado con SHA-256');

  // 3. Generador de reporte markdown
  const md = PreMortemEngine.formatReport(
    completo.feature_name,
    completo.failure_hypotheses,
    completo.worst_case_scenarios,
    completo.mandatory_mitigations
  );
  assert.ok(md.includes('Reporte Pre-Mortem Adversarial'), 'Debe generar encabezado');
  assert.ok(md.includes('Autopsia Prematura'), 'Debe incluir sección de autopsia');
  console.log('✓ generador de reportes de resiliencia conceptual operativo');

} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log('\nPASS AX-F-023 — Comando /premortem y motor de autopsia prematura 100% verificado.');
