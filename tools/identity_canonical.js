'use strict';

/**
 * Axion Protocol - Identidad canonica de actores (Fase H, regla R4).
 *
 * Cierra el vector de alias de AX-NC-0001: el mismo humano dado de alta dos veces
 * con cadenas distintas ("alice" y "alice ", o "alice" con una a cirilica) superaba
 * la separacion de roles porque las tres primitivas comparaban cadenas con ===.
 *
 * Aqui se define la forma canonica sobre la que SI se puede decidir. Dos reglas
 * independientes, para que fallar una no baste:
 *
 *   1. Mezcla de escrituras -> se rechaza. Un identificador que combina latino con
 *      cirilico o griego es ambiguo por construccion; ningun nombre legitimo lo hace.
 *      Un identificador enteramente cirilico o griego es valido: lo que se prohibe
 *      es la mezcla, no el alfabeto.
 *   2. Plegado de confundibles -> las letras cirilicas y griegas que se dibujan igual
 *      que una latina se reducen a la latina antes de comparar.
 *
 * No usa dependencias externas ni tablas Unicode completas: cubre el conjunto de
 * confundibles con latino, que es el que un atacante puede aprovechar aqui.
 */

// Caracteres que nunca deben aparecer en un identificador: control C0/C1, espacios
// de ancho cero, marcas de direccionalidad y BOM. Sirven para esconder diferencias.
const INVISIBLES = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/;

// Confundibles con latino, en minuscula y despues de NFKC.
const CONFUNDIBLES = new Map(Object.entries({
  // Cirilico
  а: 'a', б: 'b', в: 'b', г: 'r', д: 'd', е: 'e', ё: 'e', ж: 'x', з: '3',
  и: 'u', й: 'u', к: 'k', л: 'n', м: 'm', н: 'h', о: 'o', п: 'n', р: 'p',
  с: 'c', т: 't', у: 'y', ф: 'o', х: 'x', ц: 'u', ч: 'y', ш: 'w', щ: 'w',
  ъ: 'b', ы: 'b', ь: 'b', э: 'e', ю: 'io', я: 'r',
  і: 'i', ј: 'j', ѕ: 's', ԛ: 'q', ԝ: 'w', ѐ: 'e', ґ: 'r', є: 'e', ї: 'i',
  // Griego
  α: 'a', β: 'b', γ: 'y', δ: 'd', ε: 'e', ζ: 'z', η: 'n', θ: 'o', ι: 'i',
  κ: 'k', λ: 'l', μ: 'u', ν: 'v', ξ: 'e', ο: 'o', π: 'n', ρ: 'p', σ: 'o',
  ς: 'c', τ: 't', υ: 'u', φ: 'o', χ: 'x', ψ: 'w', ω: 'w',
}));

const RANGO_CIRILICO = /[\u0400-\u04FF\u0500-\u052F]/;
const RANGO_GRIEGO = /[\u0370-\u03FF\u1F00-\u1FFF]/;
const RANGO_LATINO = /[a-z]/;

const RAZON = Object.freeze({
  NOT_A_STRING: 'IDENTITY_NOT_A_STRING',
  EMPTY: 'IDENTITY_EMPTY',
  INVISIBLE_CHARS: 'IDENTITY_INVISIBLE_CHARS',
  MIXED_SCRIPT: 'IDENTITY_MIXED_SCRIPT',
});

/**
 * Reduce un identificador a la forma sobre la que se decide la separacion de roles.
 * Devuelve { ok, canonical } o { ok:false, reason }: nunca lanza, para que el
 * llamador decida el estado de bloqueo en lugar de propagar una excepcion.
 */
function canonicalActorId(value) {
  if (typeof value !== 'string') return { ok: false, reason: RAZON.NOT_A_STRING };
  if (value.trim() === '') return { ok: false, reason: RAZON.EMPTY };
  if (INVISIBLES.test(value)) return { ok: false, reason: RAZON.INVISIBLE_CHARS };

  // NFKC unifica variantes de compatibilidad (anchos completos, ligaduras...).
  // Los espacios internos se colapsan para que "a  b" y "a b" no sean dos personas.
  const base = value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
  if (base === '') return { ok: false, reason: RAZON.EMPTY };

  // Regla 1: la mezcla se evalua ANTES de plegar, porque plegar la haria desaparecer.
  const escrituras = [RANGO_LATINO, RANGO_CIRILICO, RANGO_GRIEGO].filter((r) => r.test(base));
  if (escrituras.length > 1) return { ok: false, reason: RAZON.MIXED_SCRIPT };

  // Regla 2: plegado de confundibles.
  let canonical = '';
  for (const ch of base) canonical += CONFUNDIBLES.get(ch) || ch;

  if (canonical === '') return { ok: false, reason: RAZON.EMPTY };
  return { ok: true, canonical };
}

/**
 * True cuando dos identificadores designan al mismo sujeto canonico.
 * Si alguno no puede canonicalizarse, devuelve true: ante un identificador que no
 * se puede interpretar, se asume colision y se bloquea (fallo cerrado).
 */
function mismoActor(a, b) {
  const ca = canonicalActorId(a);
  const cb = canonicalActorId(b);
  if (!ca.ok || !cb.ok) return true;
  return ca.canonical === cb.canonical;
}

/**
 * Busca alias dentro de una lista de identificadores: dos cadenas distintas que
 * se reducen al mismo sujeto. Es la regla R4 aplicada al registro de autoridades.
 * Devuelve null si esta limpio, o el detalle de la primera colision encontrada.
 */
function buscarAlias(actorIds) {
  const vistos = new Map();
  for (const bruto of actorIds) {
    const c = canonicalActorId(bruto);
    if (!c.ok) return { reason: c.reason, actorId: bruto };
    const previo = vistos.get(c.canonical);
    if (previo !== undefined && previo !== bruto) {
      return { reason: 'IDENTITY_ALIAS_COLLISION', actorId: bruto, colisionaCon: previo, canonical: c.canonical };
    }
    vistos.set(c.canonical, bruto);
  }
  return null;
}

module.exports = { canonicalActorId, mismoActor, buscarAlias, RAZON };
