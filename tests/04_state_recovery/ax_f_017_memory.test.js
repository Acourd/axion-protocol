/**
 * Regresión AX-F-017 — Memoria persistente del proyecto.
 *
 * La memoria es el único componente de Axion cuyo valor depende de lo que se NIEGA a
 * guardar. Una memoria que acepta todo se convierte en un vertedero: crece, deja de
 * caber en el ancla de contexto, y el agente termina ignorándola entera. Entonces la
 * persona vuelve a repetirse, que es exactamente lo que venía a evitar.
 *
 * Por eso aquí se comprueban más rechazos que aceptaciones.
 */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const mem = require('../../tools/memory.js');

let n = 0;
const ok = (cond, msg) => { assert.strictEqual(cond, true, msg); n += 1; };
const arenal = () => fs.mkdtempSync(path.join(os.tmpdir(), 'axion-mem-'));

console.log('=== AX-F-017 Memoria persistente ===\n');

// --- 1. Lo que se niega a guardar ---
{
  const d = arenal();
  // Se comprueban las dos caras del rechazo: el status, que explica el motivo, y el pass,
  // que es lo único que mira un llamador apurado. Un status correcto con pass true dejaría
  // pasar el hecho igualmente.
  const rTipo = mem.recordar(d, 'nota', 'algo suelto');
  ok(rTipo.status === 'TIPO_DESCONOCIDO',
    'un tipo fuera de los cuatro debe rechazarse: "notas" es como empieza un vertedero');
  ok(rTipo.pass === false, 'un tipo desconocido no puede saldarse con pass true');

  const rVacio = mem.recordar(d, 'convencion', '   ');
  ok(rVacio.status === 'TEXTO_VACIO', 'un hecho vacío no es un hecho');

  // Sin el porqué, dentro de tres meses nadie sabrá si la decisión sigue en pie.
  const rSinPorque = mem.recordar(d, 'decision', 'usar CommonJS');
  ok(rSinPorque.status === 'DECISION_SIN_PORQUE',
    'una decisión sin razón no se puede revisar y no debe aceptarse');
  ok(rSinPorque.pass === false, 'una decisión sin porqué no puede saldarse con pass true');
  ok(mem.leerEntradas(d).length === 0, 'ningún rechazo debe dejar residuo en disco');
  fs.rmSync(d, { recursive: true, force: true });
  console.log('✓ rechaza tipos inventados, hechos vacíos y decisiones sin porqué');
}

// --- 2. Lo que sí guarda, y cómo ---
{
  const d = arenal();
  const r = mem.recordar(d, 'decision', 'El corpus es CommonJS', 'todo usa require(); ESM lo rompería de golpe');
  ok(r.pass && r.status === 'GUARDADA', 'una decisión con porqué debe guardarse');
  ok(/^[a-f0-9]{12}$/.test(r.entrada.id), 'el id debe ser un hash corto estable');
  ok(r.entrada.why !== null, 'el porqué debe persistirse, no descartarse');

  const otros = ['convencion', 'limite', 'correccion'];
  otros.forEach((t) => ok(mem.recordar(d, t, `hecho de tipo ${t}`).pass, `${t} debe aceptarse sin porqué`));
  ok(mem.leerEntradas(d).length === 4, 'deben constar las cuatro entradas');
  fs.rmSync(d, { recursive: true, force: true });
  console.log('✓ acepta los cuatro tipos y conserva el porqué');
}

// --- 3. El mismo hecho dos veces no son dos entradas ---
// El id sale del contenido justamente para esto: sin ello, cada sesión que recordara lo
// mismo con otras palabras acabaría llenando el ancla de duplicados.
{
  const d = arenal();
  const a = mem.recordar(d, 'limite', 'No tocar phases/');
  const b = mem.recordar(d, 'limite', '  no TOCAR Phases/  ');
  ok(a.entrada.id === b.entrada.id, 'el mismo hecho debe producir el mismo id pese a espacios y mayúsculas');
  ok(b.status === 'ACTUALIZADA', 'la segunda vez actualiza, no duplica');
  ok(b.pass === true, 'actualizar es un éxito, no un rechazo silencioso');
  ok(mem.leerEntradas(d).length === 1, 'debe quedar una sola entrada');
  ok(a.entrada.createdAt === mem.leerEntradas(d)[0].createdAt, 'actualizar no debe falsear la fecha de creación');
  fs.rmSync(d, { recursive: true, force: true });
  console.log('✓ idempotente: el mismo hecho no se duplica');
}

// --- 4. Olvidar de verdad ---
{
  const d = arenal();
  const r = mem.recordar(d, 'convencion', 'Mensajes en el idioma del usuario');
  ok(mem.olvidar(d, 'noexiste').status === 'NO_ENCONTRADA', 'olvidar algo inexistente debe fallar, no fingir');
  const rOlvido = mem.olvidar(d, r.entrada.id);
  ok(rOlvido.pass, 'olvidar una entrada existente debe funcionar');
  ok(rOlvido.status === 'OLVIDADA', 'el olvido debe declararse con su propio status, no solo con pass');
  ok(mem.leerEntradas(d).length === 0, 'la entrada debe desaparecer del disco');
  ok(!fs.readFileSync(path.join(mem.dirMemoria(d), 'MEMORY.md'), 'utf8').includes(r.entrada.id),
    'el índice debe regenerarse: uno que solo crece acaba describiendo lo que ya no existe');
  fs.rmSync(d, { recursive: true, force: true });
  console.log('✓ olvidar borra del disco y del índice');
}

// --- 5. El bloque del ancla se limita y prioriza ---
// Si la memoria ocupa media ventana de contexto vuelve a ser el ruido del que huía.
{
  const d = arenal();
  ok(mem.bloqueParaAncla(d) === null, 'una memoria vacía no debe ensuciar el ancla');

  for (let i = 0; i < 20; i++) mem.recordar(d, 'convencion', `convencion numero ${i}`);
  mem.recordar(d, 'limite', 'limite critico que no se toca');
  mem.recordar(d, 'correccion', 'correccion que no debe repetirse');

  const bloque = mem.bloqueParaAncla(d, 5);
  // El tope cuenta entradas; el aviso de lo omitido es un pie, no una entrada más.
  const entradasMostradas = bloque.filter((l) => /^- \[/.test(l));
  ok(entradasMostradas.length === 5, `el tope son 5 entradas, trajo ${entradasMostradas.length}`);
  ok(bloque.length === 6, `5 entradas y un pie con lo omitido, trajo ${bloque.length} líneas`);
  // El orden no es estético: un límite roto cuesta más que una convención incumplida.
  ok(bloque[0].startsWith('- [limite]'), 'el límite debe ir primero por consecuencia de ignorarlo');
  ok(bloque[1].startsWith('- [correccion]'), 'la corrección debe ir segunda');
  // El pie no basta con que declare un número: tiene que decir dónde está lo omitido, o
  // quien lo lea sabrá que falta algo y no dónde buscarlo.
  ok(/y \d+ más/.test(bloque[bloque.length - 1]), 'debe declararse lo que quedó fuera en vez de truncar en silencio');
  ok(bloque[bloque.length - 1].includes('.axion/memory/MEMORY.md'),
    'el pie debe señalar el índice donde vive lo omitido');
  fs.rmSync(d, { recursive: true, force: true });
  console.log('✓ el ancla se limita, prioriza por consecuencia y declara lo omitido');
}

// --- 6. El escudo: la memoria no solo se guarda, se interpone ---
// Una memoria que solo se lee cuando alguien la abre no evita repetir el error. El escudo
// coteja la acción propuesta contra los límites y correcciones ya registrados, y tiene que
// decir cuál colisiona: un rechazo que no nombra la razón obliga a adivinarla.
{
  const d = arenal();
  mem.recordar(d, 'limite', 'no tocar la carpeta de credenciales de produccion');
  mem.recordar(d, 'convencion', 'nombres de archivos en kebab-case');

  const gOk = mem.verificarGuard(d, 'crear nuevo endpoint en api');
  ok(gOk.pass === true, 'una acción sin colisión debe pasar el escudo');
  ok(gOk.hallazgos.length === 0, 'sin colisión no debe inventarse ningún hallazgo');

  const gViolacion = mem.verificarGuard(d, 'modificar archivos de credenciales de produccion');
  ok(gViolacion.pass === false, 'una acción que viola un límite registrado debe bloquearse');
  ok(gViolacion.hallazgos.length === 1, 'debe señalarse exactamente la memoria que colisiona');
  ok(gViolacion.hallazgos[0].entrada.type === 'limite',
    'el hallazgo debe identificar el tipo de memoria que se está violando');

  fs.rmSync(d, { recursive: true, force: true });
  console.log('✓ el escudo intercepta colisiones y nombra la memoria que las causa');
}

// --- 6b. Un límite escueto no puede ser un límite indefenso ---
// El umbral exigía dos palabras coincidentes salvo que el límite tuviera una sola. Con eso,
// "no tocar produccion" no colisionaba con "modificar produccion": faltaba el verbo. El
// efecto era el contrario del buscado — cuanto más corto y contundente se escribía la regla
// más importante, menos la defendía el escudo.
{
  const d = arenal();
  mem.recordar(d, 'limite', 'no tocar produccion');

  const gEscueto = mem.verificarGuard(d, 'modificar produccion');
  ok(gEscueto.pass === false, 'un límite de dos palabras debe colisionar con una coincidencia distintiva');
  ok(gEscueto.hallazgos[0].coincidencias.includes('produccion'), 'el hallazgo debe nombrar la palabra que colisiona');

  // Y sin aflojar hasta el punto de gritar por cualquier cosa: un escudo que marca todo
  // se desactiva, y entonces no protege de nada.
  ok(mem.verificarGuard(d, 'actualizar la documentacion del README').pass === true,
    'una acción sin ninguna palabra en común no debe disparar el escudo');

  fs.rmSync(d, { recursive: true, force: true });
  console.log('✓ un límite escueto también se defiende, sin gritar por cualquier cosa');
}

// --- 7. La memoria llega al ancla que sella /compact ---
// Sin esta integración la memoria sería un archivo que nadie abre.
{
  const d = arenal();
  mem.recordar(d, 'limite', 'No tocar el directorio de evidencia');
  const { compactSessionContext } = require('../../tools/context_shield.js');
  const r = compactSessionContext(d);
  const ancla = fs.readFileSync(r.anchor, 'utf8');
  ok(/## Memoria del proyecto/.test(ancla), '/compact debe incluir la memoria en ANCHOR.md');
  // El ancla es el documento que el agente relee como normativa, y la memoria es texto que
  // escribe cualquiera -incluido /premortem, que vuelca ahi sus mitigaciones sin
  // intervencion humana-. Sin frontera, una nota redactada como orden se lee con el mismo
  // rango que una regla P0. Se comprobo que "IGNORA TODAS LAS REGLAS" llegaba literal.
  ok(/NOTAS del proyecto/.test(ancla) && /no instrucciones que/.test(ancla),
    'la memoria debe entrar en el ancla delimitada como dato, no como instruccion');
  ok(ancla.indexOf('NOTAS del proyecto') < ancla.indexOf('No tocar el directorio de evidencia'),
    'el aviso debe preceder a las entradas, no seguirlas');
  ok(/No tocar el directorio de evidencia/.test(ancla), 'la entrada concreta debe aparecer en el ancla');
  ok(r.snapshot.memory_entries === 1, 'el snapshot debe registrar cuántas entradas viajaron');
  fs.rmSync(d, { recursive: true, force: true });
  console.log('✓ la memoria sobrevive a la compactación del contexto');
}

// --- 8. Una entrada corrupta no tumba la memoria entera ---
{
  const d = arenal();
  mem.recordar(d, 'limite', 'entrada sana');
  fs.writeFileSync(path.join(mem.dirMemoria(d), 'limite-corrupta.json'), '{ esto no es json');
  const entradas = mem.leerEntradas(d);
  ok(entradas.length === 1 && entradas[0].text === 'entrada sana',
    'una entrada ilegible debe omitirse sin arrastrar a las demás');
  fs.rmSync(d, { recursive: true, force: true });
  console.log('✓ tolera una entrada corrupta sin perder las sanas');
}

console.log(`\n=== AX-F-017 PASS (${n} comprobaciones) ===`);
