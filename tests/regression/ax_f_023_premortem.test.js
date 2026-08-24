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

// --- 14. La sustancia se mide en palabras, no en caracteres ---
// Cuarenta y cuatro letras iguales superaban el suelo. Contar caracteres mide el esfuerzo
// de teclear; un riesgo se explica con lenguaje o no se ha explicado.
{
  const d = arenal();
  const paja = 'a'.repeat(44);
  const r = new PreMortemEngine(d).evaluateAssessment({
    feature_name: 'Relleno con paja',
    competence_check: { justified: true },
    anchors: { security: [paja], performance: [paja + 'b'], architecture: [paja + 'c'], ux: [paja + 'd'] },
    worst_case_scenarios: [paja + 'e', paja + 'f'],
    mandatory_mitigations: [paja + 'g'],
  });
  ok(r.status === 'DENIED', 'el relleno de una sola letra no puede pasar el suelo');
  ok(r.errors.some((e) => /palabra/.test(e)), 'debe explicar que faltan palabras, no caracteres');
  fs.rmSync(d, { recursive: true, force: true });
  console.log('✓ la sustancia se mide en palabras distintas, no en longitud');
}

// --- 15. Calco: reutilizar una autopsia no es parecerse a ella ---
// Es el escenario catastrófico que identificó la autopsia de este mismo cambio: una
// plantilla pegada en cada misión hace que la puerta apruebe el cien por cien sin detectar
// nada. Aquel veredicto fue CONDITIONAL_TDD y exigía escribir PRIMERO la prueba que
// distingue copiar de parecerse. Es esta, y por eso están los dos casos juntos.
{
  const d = arenal();
  const engine = new PreMortemEngine(d);
  engine.evaluateAssessment(base({ feature_name: 'Migracion de la tabla de usuarios' }));

  // (a) Copia literal con el título cambiado.
  const copia = engine.evaluateAssessment(base({ feature_name: 'Migracion de la tabla de pedidos' }));
  ok(copia.status === 'DENIED' && copia.reason === 'PREMORTEM_BOILERPLATE',
    `una autopsia reciclada debe rechazarse, obtuve ${copia.reason || copia.status}`);
  // Sin nombrar el original, el usuario no sabe qué frase reescribir. Era una de las
  // salvaguardas comprometidas en la autopsia de este cambio.
  ok(Boolean(copia.duplicateOf) && copia.errors[0].includes('Migracion de la tabla de usuarios'),
    'el rechazo debe nombrar el pre-mortem con el que choca');

  // (b) Legítimamente parecido: mismo tema, riesgos escritos de verdad. Debe pasar, porque
  // una puerta que frena trabajo válido se desactiva antes de que nadie la corrija.
  const parecido = engine.evaluateAssessment({
    feature_name: 'Migracion del catalogo de productos',
    competence_check: { justified: true },
    anchors: {
      security: ['El catalogo lleva precios de coste que no deben quedar en la tabla intermedia'],
      performance: ['Son ochocientas mil filas con imagenes y el indice se reconstruye entero'],
      architecture: ['El buscador lee del catalogo por un indice que la migracion invalida'],
      ux: ['La tienda muestra precios viejos mientras la migracion avanza y nadie lo entiende'],
    },
    worst_case_scenarios: [
      'La reconstruccion del indice agota la memoria y deja el buscador entero sin servicio',
      'Las imagenes apuntan a rutas del esquema anterior y el catalogo sale sin ninguna foto',
    ],
    mandatory_mitigations: ['Migrar el catalogo por lotes de mil filas con el indice reconstruido al final'],
  });
  ok(parecido.status === 'APPROVED',
    `dos trabajos parecidos escritos de verdad deben pasar, obtuve ${parecido.reason || parecido.status}`);

  // (c) Reevaluar la MISMA característica no es calco: es corregirla.
  ok(engine.evaluateAssessment(base({ feature_name: 'Migracion de la tabla de usuarios' })).status === 'APPROVED',
    'reevaluar la misma caracteristica no puede confundirse con reciclar otra');

  fs.rmSync(d, { recursive: true, force: true });
  console.log('✓ distingue reciclar una autopsia de parecerse a ella');
}

// --- 16. Interfaz: la herramienta se puede usar sin adivinar ---
// Era un validador excelente con una interfaz penosa: devolvía JSON donde el prompt
// prometía un informe, y obligaba a construir siete campos en una sola línea de shell.
{
  const d = arenal();
  const { spawnSync } = require('child_process');
  const CLI = path.join(__dirname, '..', '..', 'tools', 'premortem.js');
  const correr = (...a) => spawnSync(process.execPath, [CLI, ...a], { encoding: 'utf8', timeout: 30000 });

  // La plantilla tiene que ser evaluable tal cual se rellene, no un ejemplo aproximado.
  const plantilla = JSON.parse(correr('template').stdout);
  for (const clave of ['feature_name', 'competence_check', 'anchors', 'worst_case_scenarios', 'mandatory_mitigations']) {
    ok(Object.prototype.hasOwnProperty.call(plantilla, clave), `la plantilla debe incluir ${clave}`);
  }
  ok(Object.keys(plantilla.anchors).length === 4, 'la plantilla debe traer las cuatro anclas');

  // --file: el payload por archivo evita el infierno de comillas del shell.
  const ruta = path.join(d, 'pm.json');
  fs.writeFileSync(ruta, JSON.stringify(base({ feature_name: 'Evaluacion desde archivo en disco' })));
  const porArchivo = correr('evaluate', '--file', ruta, '--target', d);
  ok(porArchivo.status === 0, `evaluate --file debe funcionar, salio con ${porArchivo.status}`);

  const idSellado = JSON.parse(porArchivo.stdout.split('\n\nInforme')[0]).premortem_id;
  ok(correr('list', '--target', d).stdout.includes(idSellado), 'list debe mostrar lo sellado');
  ok(correr('show', idSellado, '--target', d).stdout.includes('contractVersion'), 'show debe volcar el registro');

  // El informe sale del registro sellado, no de lo que alguien recuerde haber escrito.
  const informe = correr('report', 'latest', '--target', d).stdout;
  ok(/Las 4 Anclas de Impacto/.test(informe) && /Veredicto Final/.test(informe), 'report debe emitir el markdown completo');
  ok(informe.includes(idSellado), 'el informe debe llevar el id del registro del que sale');

  ok(correr('report', 'inexistente', '--target', d).status === 1, 'un id que no existe no puede devolver exito');
  ok(correr('evaluate', '--file', path.join(d, 'no-esta.json')).status === 1, 'un archivo ilegible debe fallar');
  ok(correr('accion-inventada').status === 2, 'una accion desconocida sale con 2');

  fs.rmSync(d, { recursive: true, force: true });
  console.log('✓ template, --file, list, show y report operativos');
}

console.log(`\n=== AX-F-023 PASS (${n} comprobaciones) ===`);
