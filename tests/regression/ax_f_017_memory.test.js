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
  ok(mem.recordar(d, 'nota', 'algo suelto').status === 'TIPO_DESCONOCIDO',
    'un tipo fuera de los cuatro debe rechazarse: "notas" es como empieza un vertedero');
  ok(mem.recordar(d, 'convencion', '   ').status === 'TEXTO_VACIO',
    'un hecho vacío no es un hecho');
  // Sin el porqué, dentro de tres meses nadie sabrá si la decisión sigue en pie.
  ok(mem.recordar(d, 'decision', 'usar CommonJS').status === 'DECISION_SIN_PORQUE',
    'una decisión sin razón no se puede revisar y no debe aceptarse');
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
  ok(mem.olvidar(d, r.entrada.id).pass, 'olvidar una entrada existente debe funcionar');
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
  ok(/\[limite\]/.test(bloque[0]), 'el límite debe ir primero por consecuencia de ignorarlo');
  ok(/\[correccion\]/.test(bloque[1]), 'la corrección debe ir segunda');
  ok(/y \d+ más/.test(bloque[bloque.length - 1]), 'debe declararse lo que quedó fuera en vez de truncar en silencio');
  fs.rmSync(d, { recursive: true, force: true });
  console.log('✓ el ancla se limita, prioriza por consecuencia y declara lo omitido');
}

// --- 6. La memoria llega al ancla que sella /compact ---
// Sin esta integración la memoria sería un archivo que nadie abre.
{
  const d = arenal();
  mem.recordar(d, 'limite', 'No tocar el directorio de evidencia');
  const { compactSessionContext } = require('../../tools/context_shield.js');
  const r = compactSessionContext(d);
  const ancla = fs.readFileSync(r.anchor, 'utf8');
  ok(/## Memoria del proyecto/.test(ancla), '/compact debe incluir la memoria en ANCHOR.md');
  ok(/No tocar el directorio de evidencia/.test(ancla), 'la entrada concreta debe aparecer en el ancla');
  ok(r.snapshot.memory_entries === 1, 'el snapshot debe registrar cuántas entradas viajaron');
  fs.rmSync(d, { recursive: true, force: true });
  console.log('✓ la memoria sobrevive a la compactación del contexto');
}

// --- 7. Una entrada corrupta no tumba la memoria entera ---
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
