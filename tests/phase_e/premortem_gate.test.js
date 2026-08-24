/**
 * Phase E — El pre-mortem como puerta de la máquina de estados, no como recordatorio.
 *
 * /premortem era un comando excelente que no estaba enganchado a nada: no lo invocaba el
 * hook, ni el runner, ni ninguna fase. Una puerta que depende de que el operador se
 * acuerde de abrirla no se usa el día que importa, que es justo el día para el que se
 * construyó.
 *
 * Ahora la política declara `adversarial_premortem` y el runner lo exige en PLANIFICAR.
 * Va delante del GATE a propósito: la autopsia pregunta si la cosa DEBERÍA existir, y esa
 * pregunta pierde el sentido una vez que un humano ya ha firmado que sí.
 *
 * Lo que se comprueba aquí es sobre todo lo que la puerta RECHAZA, incluidas las dos vías
 * por las que un registro sellado podría convertirse en salvoconducto: editarlo a mano, o
 * reutilizar el de otra misión.
 */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const { executeHybridWorkflow } = require(path.join(ROOT, 'tools', 'workflow_runner.js'));
const { compileRiskPolicy } = require(path.join(ROOT, 'tools', 'risk_policy_compiler.js'));
const PreMortemEngine = require(path.join(ROOT, 'tools', 'premortem.js'));

let n = 0;
const ok = (cond, msg) => { assert.strictEqual(cond, true, msg); n += 1; };

const missionId = 'AX-TASK-PREMORTEM';
const S = 'Una migracion con credenciales de produccion expone la base si erra de entorno';
const P = 'El bloqueo de tabla detiene la escritura de toda la aplicacion mientras corre';
const A = 'El esquema nuevo rompe el contrato con los consumidores que leen columnas viejas';
const U = 'Una migracion a medias deja al usuario viendo datos incoherentes sin explicacion';
const W1 = 'La migracion falla a mitad y deja filas convertidas y sin convertir en la tabla';
const W2 = 'El snapshot de reversion resulta ilegible justo cuando hace falta restaurarlo';
const M = 'Verificar el snapshot de reversion antes de tocar una sola fila de la original';

const premortemValido = (extra) => ({
  feature_name: 'Migracion masiva de la capa de persistencia',
  competence_check: { justified: true },
  anchors: { security: [S], performance: [P], architecture: [A], ux: [U] },
  worst_case_scenarios: [W1, W2],
  mandatory_mitigations: [M],
  ...extra,
});

const mision = (extra) => ({
  missionId,
  title: 'Migracion',
  rawUserRequest: 'Ejecutar una migracion masiva verificable de la capa de persistencia.',
  scope: ['database/production'],
  risk: 'CRITICAL',
  command: { executable: 'node', args: ['--version'], cwd: ROOT, shell: false },
  rollbackPlan: {
    contractVersion: '1.0.0',
    planId: 'RB-AX-TASK-PREMORTEM',
    missionId,
    strategy: 'RESTORE_SNAPSHOT',
    snapshotDigest: 'c'.repeat(64),
    steps: ['restaurar snapshot autorizado'],
    verification: ['comparar manifest SHA-256'],
  },
  testAssertions: ['comprobacion'],
  ...extra,
});

console.log('=== Phase E: el pre-mortem como puerta ===\n');

// --- 1. La política lo declara y el runtime sabe exigirlo ---
{
  const compilada = compileRiskPolicy(fs.readFileSync(path.join(ROOT, 'policies', 'risk.yaml'), 'utf8'));
  ok(compilada.levels.CRITICAL.requirements.includes('adversarial_premortem'),
    'CRITICAL debe exigir la autopsia anticipada');
  ok(!compilada.levels.LOW.requirements.includes('adversarial_premortem'),
    'una accion local reversible no necesita autopsia: exigirla en todo la volveria tramite');
  // Un requisito que el runtime no sepa exigir es una promesa que nadie puede cumplir.
  assert.throws(
    () => compileRiskPolicy(fs.readFileSync(path.join(ROOT, 'policies', 'risk.yaml'), 'utf8')
      .replace('- adversarial_premortem', '- adivinacion_del_futuro')),
    /no soportado por el runtime/,
    'un requisito inventado debe tumbar la politica entera',
  );
  n += 1;
  console.log('✓ la política declara el requisito y el runtime lo reconoce');
}

// --- 2. Sin pre-mortem, una misión CRITICAL no pasa de PLANIFICAR ---
{
  const r = executeHybridWorkflow(mision());
  ok(r.status === 'BLOCKED_PREMORTEM_MISSING', `esperaba BLOCKED_PREMORTEM_MISSING, obtuve ${r.status}`);
  ok(r.workflow.history.every((p) => p.phase !== 'GATE'),
    'no debe llegarse al GATE sin haber pasado la autopsia');
  console.log('✓ sin autopsia, una misión CRITICAL se detiene en PLANIFICAR');
}

// --- 3. Un pre-mortem que no supera su propia puerta tampoco abre esta ---
{
  const rechazado = executeHybridWorkflow(mision({
    premortem: premortemValido({ competence_check: { justified: false } }),
  }));
  ok(rechazado.status === 'BLOCKED_PREMORTEM_DENIED', `esperaba BLOCKED_PREMORTEM_DENIED, obtuve ${rechazado.status}`);
  ok(rechazado.premortem.verdict === 'REJECTED_AS_UNJUSTIFIED', 'debe informar del veredicto que lo detuvo');

  // CONDITIONAL_TDD tampoco pasa: dice que hay una debilidad critica en las mitigaciones
  // y que solo se sigue con una prueba que falle primero. El runner no puede comprobar
  // que la prueba ataque ESA debilidad, asi que no puede declarar cumplida la condicion.
  const condicional = executeHybridWorkflow(mision({
    premortem: premortemValido({
      mitigation_stress_test: {
        has_critical_weakness: true,
        tested_mitigation: 'Verificar el snapshot dobla la lectura de disco en bases grandes',
      },
    }),
  }));
  ok(condicional.status === 'BLOCKED_PREMORTEM_CONDITIONAL',
    `un condicional no es via libre, obtuve ${condicional.status}`);
  console.log('✓ un veredicto de rechazo o condicional detiene la misión');
}

// --- 4. Un pre-mortem superado deja seguir, y queda atado a la cadena ---
{
  const r = executeHybridWorkflow(mision({ premortem: premortemValido() }));
  // Sigue faltando la firma humana: la autopsia no sustituye al GATE, lo precede.
  ok(r.status === 'BLOCKED_APPROVAL_MISSING',
    `tras la autopsia debe exigirse la firma, obtuve ${r.status}`);
  ok(r.log.some((l) => /Pre-mortem .* nivel \d/.test(l)), 'el recorrido debe dejar constancia de la autopsia');

  const planificar = r.workflow.history.find((p) => p.phase === 'PLANIFICAR');
  ok(Boolean(planificar), 'PLANIFICAR debe haberse superado');

  // El digest de la fase tiene que cubrir la autopsia: si no, cambiar de pre-mortem no
  // alteraria una sola huella del recorrido y la evidencia no probaria cual se uso.
  const otro = executeHybridWorkflow(mision({
    premortem: premortemValido({ feature_name: 'Otra migracion distinta por completo' }),
  }));
  const planificarOtro = otro.workflow.history.find((p) => p.phase === 'PLANIFICAR');
  ok(planificar.evidenceDigest !== planificarOtro.evidenceDigest,
    'dos autopsias distintas deben producir digests de fase distintos');
  console.log('✓ la autopsia superada precede al GATE y entra en la cadena de digests');
}

// --- 5. Por referencia: el registro sellado se re-verifica, no se cree ---
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-pmgate-'));
  const motor = new PreMortemEngine(dir);
  const sellado = motor.evaluateAssessment(premortemValido({ mission_id: missionId }));
  ok(sellado.status === 'APPROVED', 'el pre-mortem de partida debe sellarse');

  const r = executeHybridWorkflow(
    mision({ premortemId: sellado.premortem_id }),
    { premortemRoot: dir },
  );
  ok(r.status === 'BLOCKED_APPROVAL_MISSING', `un registro valido debe dejar pasar a GATE, obtuve ${r.status}`);

  // Manipular el registro es la via de vuelta a la autocertificacion: bastaria abrir el
  // JSON y cambiar el veredicto. Por eso no se lee el guardado, se recalcula el digest.
  const ruta = path.join(dir, '.axion', 'state', `premortem-${sellado.premortem_id}.json`);
  const registro = JSON.parse(fs.readFileSync(ruta, 'utf8'));
  registro.verdict = 'APPROVED_WITH_SAFEGUARDS';
  registro.payload.competence_check = { justified: false };
  fs.writeFileSync(ruta, JSON.stringify(registro, null, 2));

  const manipulado = executeHybridWorkflow(
    mision({ premortemId: sellado.premortem_id }),
    { premortemRoot: dir },
  );
  ok(manipulado.status === 'BLOCKED_PREMORTEM_TAMPERED',
    `un registro alterado debe detectarse, obtuve ${manipulado.status}`);

  const inexistente = executeHybridWorkflow(
    mision({ premortemId: 'deadbeefdeadbeef' }),
    { premortemRoot: dir },
  );
  ok(inexistente.status === 'BLOCKED_PREMORTEM_NOT_FOUND', 'citar un id inexistente no puede abrir la puerta');

  fs.rmSync(dir, { recursive: true, force: true });
  console.log('✓ el registro sellado se re-verifica y la manipulación se detecta');
}

// --- 6. Un pre-mortem no vale de salvoconducto para otra misión ---
// Sin este vinculo, una autopsia aprobada para algo inocuo serviria para colar cualquier
// otra cosa: es la misma razon por la que la aprobacion Ed25519 va atada a su mision.
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-pmbind-'));
  const motor = new PreMortemEngine(dir);

  const ajeno = motor.evaluateAssessment(premortemValido({ mission_id: 'AX-TASK-OTRA-COSA' }));
  const r = executeHybridWorkflow(mision({ premortemId: ajeno.premortem_id }), { premortemRoot: dir });
  ok(r.status === 'BLOCKED_PREMORTEM_BINDING_MISMATCH',
    `una autopsia de otra mision no puede servir aqui, obtuve ${r.status}`);

  const suelto = motor.evaluateAssessment(premortemValido({ feature_name: 'Autopsia sin mision asignada' }));
  const r2 = executeHybridWorkflow(mision({ premortemId: suelto.premortem_id }), { premortemRoot: dir });
  ok(r2.status === 'BLOCKED_PREMORTEM_UNBOUND',
    `una autopsia sin mision declarada no puede servir de salvoconducto, obtuve ${r2.status}`);

  fs.rmSync(dir, { recursive: true, force: true });
  console.log('✓ la autopsia va atada a su misión, como la aprobación');
}

// --- 7. Los niveles bajos no pagan el peaje ---
// Exigir una autopsia para cambiar una constante convertiria la puerta en tramite, y un
// tramite se rellena sin leerlo. Pero si se aporta una, se valida igual: no hay via en la
// que un pre-mortem suministrado se ignore.
{
  const bajo = executeHybridWorkflow(mision({ risk: 'LOW', rollbackPlan: undefined }));
  ok(bajo.status !== 'BLOCKED_PREMORTEM_MISSING', 'una accion LOW no debe exigir autopsia');

  const bajoConAutopsiaMala = executeHybridWorkflow(mision({
    risk: 'LOW',
    rollbackPlan: undefined,
    premortem: premortemValido({ competence_check: { justified: false } }),
  }));
  ok(bajoConAutopsiaMala.status === 'BLOCKED_PREMORTEM_DENIED',
    'una autopsia aportada se valida siempre, tambien donde no era obligatoria');
  console.log('✓ LOW no paga peaje, pero lo aportado nunca se ignora');
}

console.log(`\n=== Phase E premortem_gate PASS (${n} comprobaciones) ===`);
