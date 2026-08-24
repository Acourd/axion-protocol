/**
 * Regresión AX-F-023 — /premortem: motor de autopsia prematura y resiliencia conceptual.
 *
 * Esta suite nació verificando el camino feliz y declarando en su cabecera una cobertura
 * que no tenía: prometía comprobar la sincronización con MEMORY.md y no la probaba. Era
 * justo lo único roto — el motor añadía líneas sueltas a un índice generado, que el
 * siguiente `memory add` reescribía entero, así que no persistía nada, nunca.
 *
 * La auditoría encontró seis agujeros más, todos del mismo tipo: la puerta validaba la
 * FORMA del análisis y no su FONDO, y dejaba que el evaluado dictase su propio veredicto.
 * Cada uno de los seis es aquí un caso negativo. Una puerta se demuestra por lo que
 * rechaza; el camino feliz solo demuestra que arranca.
 */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const PreMortemEngine = require('../../tools/premortem.js');
const { VEREDICTOS, MINIMO_SUSTANCIA } = PreMortemEngine;
const { leerEntradas, recordar } = require('../../tools/memory.js');

let n = 0;
const ok = (cond, msg) => { assert.strictEqual(cond, true, msg); n += 1; };
const arenal = () => fs.mkdtempSync(path.join(os.tmpdir(), 'axion-premortem-'));

// Frases con sustancia real: el suelo del motor son 40 caracteres, y una prueba que
// usara "x" estaria midiendo otra cosa.
const S = 'Un checkpoint copia el fichero .env si no esta excluido y filtra los secretos';
const P = 'Diecisiete MiB por snapshot: sellar en cada paso llena el disco en una sesion';
const A = 'Acopla la reversion al manifiesto v1; migrarlo invalida los checkpoints previos';
const U = 'Restaurar sin --prune deja ficheros huerfanos que el usuario no queria conservar';
const W1 = 'Una restauracion parcial deja el arbol en un estado intermedio que nadie reviso';
const W2 = 'Dos sellados en el mismo milisegundo colisionan y uno pisa al otro sin avisar';
const M = 'Verificar el manifiesto entero antes de escribir un solo byte en el disco real';
const N3 = 'La verificacion previa duplica la lectura de disco y dobla el coste en arboles grandes';

const base = (extra) => ({
  feature_name: 'Motor de checkpoint incremental',
  anchors: { security: [S], performance: [P], architecture: [A], ux: [U] },
  worst_case_scenarios: [W1, W2],
  mandatory_mitigations: [M],
  competence_check: { justified: true },
  ...extra,
});

console.log('=== AX-F-023 /premortem: simulador de fracaso ===\n');

// --- 1. Rechaza el análisis incompleto ---
{
  const d = arenal();
  const r = new PreMortemEngine(d).evaluateAssessment({ feature_name: 'Nueva Caracteristica' });
  ok(r.status === 'DENIED', 'un payload sin anclas ni escenarios debe rechazarse');
  ok(r.errors.length >= 3, 'debe reprochar anclas, competencia, escenarios y mitigaciones');
  // Un rechazo ni siquiera crea el directorio: el estado se prepara al escribir, no al
  // construir el motor. Sin esto, cada payload invalido dejaba una carpeta vacia detras.
  const dirEstado = path.join(d, '.axion', 'state');
  ok(!fs.existsSync(dirEstado) || fs.readdirSync(dirEstado).length === 0,
    'un rechazo no debe dejar registro en el arbol de estados');
  fs.rmSync(d, { recursive: true, force: true });
  console.log('✓ rechaza el análisis incompleto y no deja rastro');
}

// --- 2. Suelo de sustancia: la forma no basta ---
// Con las cuatro anclas rellenas con "x" el motor aprobaba. Una herramienta cuyo valor
// entero es la sustancia no puede conformarse con que el campo exista.
{
  const d = arenal();
  const r = new PreMortemEngine(d).evaluateAssessment({
    feature_name: 'Idea vacia',
    anchors: { security: ['x'], performance: ['x'], architecture: ['x'], ux: ['x'] },
    worst_case_scenarios: ['a', 'b'],
    mandatory_mitigations: ['m'],
    competence_check: { justified: true },
  });
  ok(r.status === 'DENIED', 'un riesgo de un caracter no es un riesgo');
  ok(r.errors.some((e) => e.includes(String(MINIMO_SUSTANCIA))), 'debe decir cuantos caracteres se exigen');
  fs.rmSync(d, { recursive: true, force: true });
  console.log('✓ exige sustancia, no casillas marcadas');
}

// --- 3. Anclas ortogonales ---
{
  const d = arenal();
  const r = new PreMortemEngine(d).evaluateAssessment(base({
    anchors: { security: [S], performance: [S], architecture: [A], ux: [U] },
  }));
  ok(r.status === 'DENIED', 'el mismo riesgo en dos anclas simula cobertura sin darla');
  ok(r.errors.some((e) => /ortogonal/i.test(e)), 'debe explicar por que se rechaza');
  fs.rmSync(d, { recursive: true, force: true });
  console.log('✓ rechaza el mismo riesgo repetido entre anclas');
}

// --- 4. El evaluado no dicta su propio veredicto ---
// El agujero mas grave del motor original: `if (payload.verdict) verdict = payload.verdict`
// permitia que un pre-mortem con la competencia NO justificada se autodeclarase aprobado.
{
  const d = arenal();
  const engine = new PreMortemEngine(d);

  const derivado = engine.evaluateAssessment(base({ competence_check: { justified: false } }));
  ok(derivado.verdict === 'REJECTED_AS_UNJUSTIFIED', 'sin justificacion el veredicto derivado es de rechazo');
  ok(derivado.status === 'DENIED' && derivado.exitCode === 1, 'y tiene que doler en el codigo de salida');

  const autodeclarado = engine.evaluateAssessment(base({
    competence_check: { justified: false },
    verdict: 'APPROVED_WITH_SAFEGUARDS',
  }));
  ok(autodeclarado.status === 'DENIED', 'suavizar el propio veredicto debe rechazarse');
  ok(autodeclarado.reason === 'VERDICT_DOWNGRADE_REFUSED', `esperaba VERDICT_DOWNGRADE_REFUSED, obtuve ${autodeclarado.reason}`);

  // Endurecer si se permite: el humano sabe cosas que el payload no cuenta.
  const endurecido = engine.evaluateAssessment(base({ verdict: 'PIVOT_REQUIRED' }));
  ok(endurecido.verdict === 'PIVOT_REQUIRED', 'un humano debe poder endurecer el veredicto');
  ok(endurecido.hardened_from === 'APPROVED_WITH_SAFEGUARDS', 'y debe quedar constancia de cual era el derivado');

  fs.rmSync(d, { recursive: true, force: true });
  console.log('✓ el veredicto se deriva; se puede endurecer, nunca suavizar');
}

// --- 5. Vocabulario cerrado ---
// Antes se aceptaba cualquier cadena, incluida "TODO_PERFECTO_ADELANTE", como resultado
// de una puerta de gobernanza.
{
  const d = arenal();
  const r = new PreMortemEngine(d).evaluateAssessment(base({ verdict: 'TODO_PERFECTO_ADELANTE' }));
  ok(r.status === 'DENIED' && r.reason === 'UNKNOWN_VERDICT', 'un veredicto fuera del contrato debe rechazarse');
  ok(Object.keys(VEREDICTOS).length === 5, 'el contrato declara cinco veredictos');
  fs.rmSync(d, { recursive: true, force: true });
  console.log('✓ solo admite los veredictos del contrato');
}

// --- 6. Contrato de códigos de salida ---
// Se reutiliza el de preflight -0 adelante, 2 decision humana, 1 no- en vez de inventar
// otro. Un rechazo que salia con 0 dejaba pasar la idea rechazada en cualquier CI.
{
  ok(VEREDICTOS.APPROVED_WITH_SAFEGUARDS.exit === 0, 'la aprobacion sale con 0');
  ok(VEREDICTOS.CONDITIONAL_TDD.exit === 2 && VEREDICTOS.PIVOT_REQUIRED.exit === 2, 'lo condicional sale con 2');
  ok(VEREDICTOS.REJECTED_AS_BLOAT.exit === 1 && VEREDICTOS.REJECTED_AS_UNJUSTIFIED.exit === 1, 'el rechazo sale con 1');

  const d = arenal();
  const engine = new PreMortemEngine(d);
  const cond = engine.evaluateAssessment(base({
    mitigation_stress_test: { has_critical_weakness: true, tested_mitigation: N3 },
  }));
  ok(cond.verdict === 'CONDITIONAL_TDD' && cond.exitCode === 2 && cond.status === 'CONDITIONAL',
    'una debilidad critica confesada obliga a decision humana, no a via libre');
  fs.rmSync(d, { recursive: true, force: true });
  console.log('✓ 0 adelante · 2 decisión humana · 1 rechazo, como /preflight');
}

// --- 7. El nivel se deriva del contenido ---
{
  const d = arenal();
  const engine = new PreMortemEngine(d);

  ok(engine.evaluateAssessment(base({})).depth_level === 2,
    'con 4 anclas y 2 escenarios de dominio se alcanza el nivel 2');

  const n3 = engine.evaluateAssessment(base({
    mitigation_stress_test: { has_critical_weakness: false, tested_mitigation: N3 },
  }));
  ok(n3.depth_level === 3, 'la auto-critica escrita alcanza el nivel 3');

  // Declarar un nivel que no se alcanza era la forma mas barata de aparentar profundidad.
  const inflado = engine.evaluateAssessment(base({ depth_level: 3 }));
  ok(inflado.status === 'DENIED', 'declarar nivel 3 sin auto-critica debe rechazarse');
  ok(inflado.errors.some((e) => /nivel 3/i.test(e)), 'debe decir que falta para alcanzarlo');

  ok(engine.evaluateAssessment(base({ depth_level: 1 })).depth_level === 2,
    'declarar menos del alcanzado es licito: la modestia no hace dano');

  fs.rmSync(d, { recursive: true, force: true });
  console.log('✓ el nivel sale del contenido; inflarlo se rechaza');
}

// --- 8. Digest canónico e identidad por contenido ---
{
  const d = arenal();
  const engine = new PreMortemEngine(d);
  const a = base({});
  const b = {
    mandatory_mitigations: a.mandatory_mitigations,
    competence_check: a.competence_check,
    worst_case_scenarios: a.worst_case_scenarios,
    anchors: { ux: a.anchors.ux, architecture: a.anchors.architecture, performance: a.anchors.performance, security: a.anchors.security },
    feature_name: a.feature_name,
  };
  const ra = engine.evaluateAssessment(a);
  const rb = engine.evaluateAssessment(b);
  ok(ra.digest === rb.digest, 'el mismo contenido con otro orden de claves debe dar el mismo digest');
  ok(ra.premortem_id === rb.premortem_id, 'el mismo pre-mortem es un registro, no dos');
  ok(fs.readdirSync(path.join(d, '.axion', 'state')).filter((f) => f.startsWith('premortem-')).length === 1,
    'no debe duplicarse el registro en disco');

  const guardado = JSON.parse(fs.readFileSync(ra.record_path, 'utf8'));
  ok(guardado.digest === ra.digest, 'el registro en disco debe llevar el digest que se anuncio');
  fs.rmSync(d, { recursive: true, force: true });
  console.log('✓ digest canónico e identidad derivada del contenido');
}

// --- 9. La memoria persiste de verdad ---
// El motor escribia lineas sueltas al final de MEMORY.md, que es un indice generado: el
// siguiente `memory add` lo reescribia entero y se las llevaba por delante. Ademas nunca
// creaba la entrada de respaldo, asi que list, search, forget y el ancla de /compact no
// la veian jamas. Era una escritura que no persistia nada.
{
  const d = arenal();
  const r = new PreMortemEngine(d).evaluateAssessment(base({}));
  ok(r.memory_entries.length === 1, 'una salvaguarda aprobada debe anotarse en memoria');

  const antes = leerEntradas(d).filter((e) => e.text.includes('pre-mortem'));
  ok(antes.length === 1, 'debe existir la entrada de respaldo, no solo una linea en el indice');

  // La prueba que faltaba: regenerar el indice y comprobar que sobrevive.
  recordar(d, 'convencion', 'entrada ajena que fuerza la regeneracion del indice');
  const despues = leerEntradas(d).filter((e) => e.text.includes('pre-mortem'));
  ok(despues.length === 1, 'la anotacion debe sobrevivir a la regeneracion del indice');
  ok(fs.readFileSync(path.join(d, '.axion', 'memory', 'MEMORY.md'), 'utf8').includes('pre-mortem'),
    'y debe seguir apareciendo en el indice regenerado');

  fs.rmSync(d, { recursive: true, force: true });
  console.log('✓ las salvaguardas sobreviven a la regeneración de la memoria');
}

// --- 10. Un rechazo no deja convenciones ---
{
  const d = arenal();
  const r = new PreMortemEngine(d).evaluateAssessment(base({ competence_check: { justified: false } }));
  ok(r.verdict === 'REJECTED_AS_UNJUSTIFIED', 'el caso de partida debe ser un rechazo');
  ok(leerEntradas(d).length === 0,
    'una idea que no se va a construir no deja salvaguardas comprometidas: serian reglas sin sujeto');
  fs.rmSync(d, { recursive: true, force: true });
  console.log('✓ un pre-mortem rechazado no ensucia la memoria');
}

// --- 11. Retención del árbol de estados ---
{
  const d = arenal();
  const engine = new PreMortemEngine(d);
  for (let i = 0; i < 25; i++) {
    engine.evaluateAssessment(base({ feature_name: `Caracteristica numero ${i} del lote` }));
  }
  const quedan = fs.readdirSync(path.join(d, '.axion', 'state')).filter((f) => f.startsWith('premortem-')).length;
  ok(quedan <= 20, `el arbol de estados debe tener techo, quedaron ${quedan}`);
  fs.rmSync(d, { recursive: true, force: true });
  console.log('✓ .axion/state/ no crece sin límite');
}

// --- 12. El reporte cubre los tres niveles ---
{
  const md = PreMortemEngine.formatReport({
    featureName: 'Motor de checkpoint',
    anchors: { security: [S], performance: [P], architecture: [A], ux: [U] },
    worstCases: [W1, W2],
    mitigations: [M],
    solutionStress: [N3],
    verdict: 'APPROVED_WITH_SAFEGUARDS',
    depth: 3,
  });
  ok(md.includes('Las 4 Anclas de Impacto'), 'debe incluir las 4 anclas');
  ok(['Seguridad', 'Rendimiento', 'Arquitectura', 'Ergonom'].every((a) => md.includes(a)), 'las cuatro, nombradas');
  ok(md.includes('Estrés de Dominio'), 'debe incluir el nivel 2');
  ok(md.includes('Auto-Crítica de la Solución'), 'debe incluir el nivel 3');
  ok(md.includes(VEREDICTOS.APPROVED_WITH_SAFEGUARDS.glosa), 'el veredicto debe llegar con su glosa, no solo con su sigla');
  console.log('✓ el reporte cubre los tres niveles y explica el veredicto');
}

// --- 13. Prompt y motor hablan el mismo idioma ---
// Es el defecto que ya corregimos en /preflight -documentaba PASS/BLOCKED cuando la
// herramienta emitia ALLOW/DENY- y que habia reaparecido aqui con tres vocabularios.
{
  const ROOT = path.join(__dirname, '..', '..');
  for (const rel of ['.agents/workflows/premortem.md', '.claude/commands/premortem.md']) {
    const md = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    for (const v of Object.keys(VEREDICTOS)) {
      ok(md.includes(v), `${rel} no documenta el veredicto ${v} que el motor puede emitir`);
    }
    ok(!/APROBADA CON BLINDAJE|DESCARTAR POR BLOAT/.test(md),
      `${rel} conserva un veredicto que el motor no reconoce`);
  }
  console.log('✓ el prompt documenta exactamente los veredictos que el motor emite');
}

console.log(`\n=== AX-F-023 PASS (${n} comprobaciones) ===`);
