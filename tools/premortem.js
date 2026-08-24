#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Pre-mortem adversarial multi-ancla (Fase 2: PLANIFICAR / GATE).
 *
 * Asume que la propuesta fracasó a seis meses vista y exige la autopsia antes de escribir
 * la primera línea. Tres niveles de profundidad, y el nivel se DERIVA del contenido:
 *
 *   Nivel 1  Las 4 anclas ortogonales: Seguridad, Rendimiento, Arquitectura, Ergonomía.
 *   Nivel 2  Estrés de dominio: los peores escenarios del entorno real de ejecución.
 *   Nivel 3  Auto-crítica: estrés de las propias mitigaciones, para que la cura no sea
 *            peor que la enfermedad.
 *
 * DOS REGLAS QUE DEFINEN ESTA HERRAMIENTA, y sin las cuales sería un formulario:
 *
 *   1. El veredicto se deriva, no se declara. Quien es evaluado no dicta su propio
 *      resultado. Se admite que el humano lo ENDUREZCA -conoce cosas que el payload no
 *      cuenta- pero jamás que lo suavice: esa asimetría es la misma que gobierna el
 *      killswitch, donde parar es barato y reanudar es un acto humano deliberado.
 *
 *   2. Un rechazo tiene que doler en el código de salida. Se reutiliza el contrato que
 *      preflight.js ya estableció en este proyecto -0 adelante, 2 decisión humana, 1 no-
 *      en vez de inventar uno nuevo: un veredicto de rechazo que salía con 0 dejaba pasar
 *      la idea rechazada por cualquier CI o hook que mirase el codigo de salida.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const { hashCanonical } = require('./canonical_json.js');
const { recordar } = require('./memory.js');

const ROOT = path.resolve(__dirname, '..');

const ANCHORS = {
  security: '🛡️ Seguridad & Integridad',
  performance: '⚡ Rendimiento & Recursos',
  architecture: '🧩 Arquitectura & Deuda Técnica',
  ux: '👥 Ergonomía & Experiencia Humana',
};
const CLAVES_ANCLA = Object.keys(ANCHORS);

/**
 * Vocabulario cerrado, ordenado por severidad. El rango es lo que permite aceptar que un
 * humano endurezca el veredicto y rechazar que lo ablande, y es también la única fuente
 * de la que sale el código de salida: sin enum, `verdict` era texto libre y llegó a
 * aceptarse "TODO_PERFECTO_ADELANTE" como resultado de una puerta de gobernanza.
 */
const VEREDICTOS = {
  APPROVED_WITH_SAFEGUARDS: { rango: 0, exit: 0, status: 'APPROVED', glosa: 'Adelante, con las salvaguardas comprometidas.' },
  CONDITIONAL_TDD: { rango: 1, exit: 2, status: 'CONDITIONAL', glosa: 'Solo con prueba que falle primero: hay una debilidad crítica en las mitigaciones.' },
  PIVOT_REQUIRED: { rango: 2, exit: 2, status: 'CONDITIONAL', glosa: 'El enfoque no sobrevive a su propia autopsia; hay que replantearlo.' },
  REJECTED_AS_BLOAT: { rango: 3, exit: 1, status: 'DENIED', glosa: 'La complejidad que añade supera al problema que resuelve.' },
  REJECTED_AS_UNJUSTIFIED: { rango: 4, exit: 1, status: 'DENIED', glosa: 'No se sostiene la necesidad real de construirlo.' },
};

// Un riesgo de una palabra no es un riesgo, es una casilla marcada. El suelo existe
// porque la herramienta entera vale por la sustancia de lo que se escribe en ella, y sin
// minimo se aprobaba un pre-mortem con "x" en cada una de las cuatro anclas.
const MINIMO_SUSTANCIA = 40;
const MAX_REGISTROS = 20;

const texto = (v) => (typeof v === 'string' ? v.trim() : '');
const normalizar = (v) => texto(v).toLowerCase().replace(/\s+/g, ' ');

class PreMortemEngine {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot || ROOT);
    this.stateDir = path.join(this.root, '.axion', 'state');
  }

  ensureStateDir() {
    fs.mkdirSync(this.stateDir, { recursive: true });
  }

  /**
   * Valida la sustancia de una lista de afirmaciones. Devuelve los reproches concretos,
   * no un booleano: quien recibe un rechazo necesita saber qué frase arreglar.
   */
  static validarLista(lista, etiqueta, minimo) {
    const errores = [];
    if (!Array.isArray(lista) || lista.length < minimo) {
      errores.push(`${etiqueta} debe contener al menos ${minimo} entrada(s) concreta(s).`);
      return { errores, limpias: [] };
    }
    const limpias = [];
    lista.forEach((bruto, i) => {
      const t = texto(bruto);
      if (t.length < MINIMO_SUSTANCIA) {
        errores.push(`${etiqueta}[${i}] tiene ${t.length} caracteres; se exigen ${MINIMO_SUSTANCIA} para que describa un riesgo y no una casilla marcada.`);
      } else {
        limpias.push(t);
      }
    });
    return { errores, limpias };
  }

  evaluateAssessment(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return { status: 'DENIED', reason: 'INVALID_PAYLOAD', exitCode: 1, errors: ['El payload debe ser un objeto JSON.'] };
    }

    const errors = [];

    if (texto(payload.feature_name).length < 3) {
      errors.push('feature_name es obligatorio y debe tener al menos 3 caracteres.');
    }

    // --- Nivel 1: las 4 anclas ---
    const anchors = payload.anchors && typeof payload.anchors === 'object' ? payload.anchors : null;
    const riesgosPorAncla = {};
    if (anchors) {
      for (const clave of CLAVES_ANCLA) {
        const { errores, limpias } = PreMortemEngine.validarLista(anchors[clave], `anchors.${clave}`, 1);
        errors.push(...errores);
        riesgosPorAncla[clave] = limpias;
      }
    } else {
      const { errores } = PreMortemEngine.validarLista(payload.failure_hypotheses, 'failure_hypotheses', 3);
      errors.push(...errores);
    }

    // El mismo riesgo pegado en las cuatro anclas simula cobertura sin darla: cuatro
    // dimensiones que dicen lo mismo son una sola dimensión repetida cuatro veces.
    const vistos = new Map();
    for (const clave of CLAVES_ANCLA) {
      for (const r of riesgosPorAncla[clave] || []) {
        const n = normalizar(r);
        if (vistos.has(n)) {
          errors.push(`El mismo riesgo aparece en anchors.${vistos.get(n)} y anchors.${clave}: las anclas son ortogonales o no son anclas.`);
        } else {
          vistos.set(n, clave);
        }
      }
    }

    // --- Competencia / anti-bloat ---
    const competencia = payload.competence_check;
    if (!competencia || typeof competencia !== 'object') {
      errors.push('Falta competence_check: hay que declarar si la necesidad real justifica la complejidad.');
    } else if (typeof competencia.justified !== 'boolean') {
      errors.push('competence_check.justified debe ser un booleano explícito, no una ausencia.');
    }

    // --- Nivel 2: estrés de dominio ---
    const peores = PreMortemEngine.validarLista(payload.worst_case_scenarios, 'worst_case_scenarios', 2);
    errors.push(...peores.errores);

    // --- Salvaguardas ---
    const mitigaciones = PreMortemEngine.validarLista(payload.mandatory_mitigations, 'mandatory_mitigations', 1);
    errors.push(...mitigaciones.errores);

    // --- Nivel 3: auto-crítica de las mitigaciones ---
    const estres = payload.mitigation_stress_test;
    const tieneNivel3 = Boolean(estres && typeof estres === 'object'
      && typeof estres.has_critical_weakness === 'boolean'
      && texto(estres.tested_mitigation || estres.notes).length >= MINIMO_SUSTANCIA);

    const nivelAlcanzado = tieneNivel3 ? 3 : (peores.limpias.length >= 2 ? 2 : 1);

    // Declarar un nivel que no se ha alcanzado es la forma más barata de aparentar
    // profundidad. Se permite declarar menos —modestia no hace daño— y nunca más.
    const nivelDeclarado = Number.isInteger(payload.depth_level) ? payload.depth_level : null;
    if (nivelDeclarado !== null && nivelDeclarado > nivelAlcanzado) {
      errors.push(
        `depth_level declara ${nivelDeclarado} pero el contenido solo alcanza ${nivelAlcanzado}. `
        + (nivelDeclarado >= 3
          ? 'El nivel 3 exige mitigation_stress_test con has_critical_weakness booleano y una auto-crítica escrita.'
          : 'El nivel 2 exige al menos 2 escenarios de estrés de dominio.'),
      );
    }

    if (errors.length > 0) {
      return { status: 'DENIED', reason: 'PREMORTEM_INCOMPLETE', exitCode: 1, errors };
    }

    // --- Veredicto derivado ---
    let veredicto = 'APPROVED_WITH_SAFEGUARDS';
    if (competencia.justified === false) veredicto = 'REJECTED_AS_UNJUSTIFIED';
    else if (competencia.bloat_risk === true) veredicto = 'REJECTED_AS_BLOAT';
    else if (estres && estres.has_critical_weakness === true) veredicto = 'CONDITIONAL_TDD';

    // El humano puede endurecer, nunca ablandar.
    let endurecidoPor = null;
    const propuesto = texto(payload.verdict);
    if (propuesto) {
      if (!VEREDICTOS[propuesto]) {
        return {
          status: 'DENIED',
          reason: 'UNKNOWN_VERDICT',
          exitCode: 1,
          errors: [`"${propuesto}" no es un veredicto del contrato. Válidos: ${Object.keys(VEREDICTOS).join(', ')}.`],
        };
      }
      if (VEREDICTOS[propuesto].rango < VEREDICTOS[veredicto].rango) {
        return {
          status: 'DENIED',
          reason: 'VERDICT_DOWNGRADE_REFUSED',
          exitCode: 1,
          errors: [
            `Se propone "${propuesto}" cuando el análisis deriva "${veredicto}". Un veredicto puede endurecerse, nunca suavizarse: `
            + 'quien es evaluado no dicta su propio resultado.',
          ],
        };
      }
      if (VEREDICTOS[propuesto].rango > VEREDICTOS[veredicto].rango) {
        endurecidoPor = veredicto;
        veredicto = propuesto;
      }
    }

    const meta = VEREDICTOS[veredicto];
    const digest = hashCanonical(payload);

    const record = {
      contractVersion: '2.0.0',
      // El id sale del contenido: el mismo pre-mortem evaluado dos veces es un registro,
      // no dos. Con un id aleatorio, repetir la evaluación multiplicaba la evidencia.
      premortem_id: digest.slice(0, 16),
      feature_name: texto(payload.feature_name),
      depth_level: nivelAlcanzado,
      declared_depth: nivelDeclarado,
      timestamp: new Date().toISOString(),
      digest,
      verdict: veredicto,
      verdict_rationale: meta.glosa,
      hardened_from: endurecidoPor,
      payload,
    };

    this.ensureStateDir();
    const recordPath = path.join(this.stateDir, `premortem-${record.premortem_id}.json`);
    fs.writeFileSync(recordPath, JSON.stringify(record, null, 2), 'utf8');
    const purgados = this.purgarAntiguos();

    const memoria = this.syncToMemory(record);

    return {
      status: meta.status,
      exitCode: meta.exit,
      premortem_id: record.premortem_id,
      depth_level: nivelAlcanzado,
      digest,
      verdict: veredicto,
      verdict_rationale: meta.glosa,
      hardened_from: endurecidoPor,
      memory_entries: memoria,
      purged: purgados,
      record_path: recordPath,
    };
  }

  /**
   * Conserva los registros más recientes. Sin techo, .axion/state/ crece sin límite y
   * termina siendo el ruido del que estas herramientas intentan proteger.
   */
  purgarAntiguos(maxKeep = MAX_REGISTROS) {
    let ficheros;
    try {
      ficheros = fs.readdirSync(this.stateDir)
        .filter((f) => f.startsWith('premortem-') && f.endsWith('.json'))
        .map((f) => ({ p: path.join(this.stateDir, f), t: fs.statSync(path.join(this.stateDir, f)).mtimeMs }))
        .sort((a, b) => b.t - a.t);
    } catch (_) {
      // Sin directorio legible no hay nada que purgar; no es motivo para abortar.
      return 0;
    }
    let n = 0;
    for (const f of ficheros.slice(maxKeep)) {
      try {
        fs.unlinkSync(f.p);
        n += 1;
      } catch (_) {
        // Un registro bloqueado por otro proceso no invalida el que se acaba de escribir.
      }
    }
    return n;
  }

  /**
   * Persiste las salvaguardas comprometidas usando la API de memoria.
   *
   * La versión anterior añadía líneas sueltas al final de .axion/memory/MEMORY.md, que es
   * un índice GENERADO: el siguiente `memory add` lo reescribía entero y se llevaba por
   * delante todo lo que el pre-mortem había anotado. Tampoco creaba la entrada de
   * respaldo, así que `memory list`, `search`, `forget` y el ancla de /compact no la
   * veían jamás. Era una escritura que no persistía nada, nunca.
   */
  syncToMemory(record) {
    const guardadas = [];

    // Solo se comprometen salvaguardas de lo que va a construirse. Una idea rechazada no
    // deja convenciones detrás: anotar las mitigaciones de algo que no se hará llena la
    // memoria de reglas sin sujeto, y la memoria vale justo por lo que se niega a guardar.
    if (VEREDICTOS[record.verdict].status === 'DENIED') return guardadas;

    const mitigaciones = Array.isArray(record.payload.mandatory_mitigations) ? record.payload.mandatory_mitigations : [];
    for (const m of mitigaciones) {
      const t = texto(m);
      if (!t) continue;
      const r = recordar(
        this.root,
        'convencion',
        `[pre-mortem: ${record.feature_name}] ${t}`,
        `Salvaguarda comprometida en el pre-mortem ${record.premortem_id} (${record.verdict}).`,
      );
      if (r.pass) guardadas.push(r.entrada.id);
    }
    return guardadas;
  }

  /**
   * Recupera un pre-mortem sellado y lo re-evalúa desde su payload.
   *
   * No se lee `record.verdict`. El registro es un fichero que cualquiera con permiso de
   * escritura puede editar, así que confiar en el veredicto guardado devolvería por la
   * puerta de atrás la autocertificación que se cerró por la de delante: bastaría abrir
   * el JSON y cambiar una palabra. Se recalcula el digest, se comprueba que coincide con
   * el que el registro declara, y el veredicto se vuelve a derivar del contenido.
   *
   * `missionId` ata el pre-mortem a la misión que lo invoca. Sin ese vínculo, una
   * autopsia aprobada para una cosa serviría de salvoconducto para cualquier otra.
   */
  loadRecord(premortemId, missionId) {
    const ruta = path.join(this.stateDir, `premortem-${String(premortemId || '').replace(/[^a-f0-9]/gi, '')}.json`);
    if (!premortemId || !fs.existsSync(ruta)) {
      return { pass: false, status: 'PREMORTEM_NOT_FOUND', premortem_id: premortemId || null };
    }

    let registro;
    try {
      registro = JSON.parse(fs.readFileSync(ruta, 'utf8'));
    } catch (e) {
      return { pass: false, status: 'PREMORTEM_UNREADABLE', message: e.message };
    }

    if (!registro || typeof registro.payload !== 'object' || registro.payload === null) {
      return { pass: false, status: 'PREMORTEM_MALFORMED' };
    }

    const recalculado = hashCanonical(registro.payload);
    if (recalculado !== registro.digest) {
      return { pass: false, status: 'PREMORTEM_TAMPERED', expected: registro.digest, actual: recalculado };
    }

    if (missionId) {
      const atado = texto(registro.payload.mission_id);
      if (!atado) return { pass: false, status: 'PREMORTEM_UNBOUND', premortem_id: registro.premortem_id };
      if (atado !== missionId) {
        return { pass: false, status: 'PREMORTEM_BINDING_MISMATCH', boundTo: atado, missionId };
      }
    }

    // Se re-deriva en vez de leerse: el veredicto sale del analisis, tambien al releerlo.
    const reevaluado = this.evaluateAssessment(registro.payload);
    return {
      pass: reevaluado.status === 'APPROVED',
      status: reevaluado.status === 'APPROVED' ? 'PREMORTEM_VALID' : `PREMORTEM_${reevaluado.status}`,
      premortem_id: registro.premortem_id,
      digest: registro.digest,
      verdict: reevaluado.verdict || null,
      verdict_rationale: reevaluado.verdict_rationale || null,
      depth_level: reevaluado.depth_level || null,
      errors: reevaluado.errors || [],
    };
  }

  static formatReport({ featureName, anchors, worstCases, mitigations, solutionStress, verdict = 'APPROVED_WITH_SAFEGUARDS', depth = 1 }) {
    const glosa = VEREDICTOS[verdict] ? VEREDICTOS[verdict].glosa : '';
    let md = `# 🌪️ Reporte Pre-Mortem Adversarial: ${featureName}\n\n`;
    md += `> **PROFUNDIDAD: NIVEL ${depth}** — Autopsia anticipada y simulación de fracaso a 6 meses.\n\n---\n\n`;

    if (anchors) {
      md += '### 🧭 1. Las 4 Anclas de Impacto y Riesgos Más Graves\n\n';
      for (const clave of CLAVES_ANCLA) {
        if (!anchors[clave]) continue;
        md += `#### ${ANCHORS[clave]}\n`;
        md += anchors[clave].map((r, i) => `- ⚠️ **[Riesgo ${i + 1}]**: ${r}`).join('\n') + '\n\n';
      }
    }

    if (worstCases && worstCases.length > 0) {
      md += '---\n\n### 🌪️ 2. Peores Escenarios Catastróficos (Estrés de Dominio)\n';
      md += worstCases.map((w, i) => `- 💥 **[Escenario ${i + 1}]**: ${w}`).join('\n') + '\n\n';
    }

    if (mitigations && mitigations.length > 0) {
      md += '---\n\n### 🛡️ 3. Medidas de Mitigación Obligatorias\n';
      md += mitigations.map((m, i) => `- ✅ **[Salvaguarda ${i + 1}]**: ${m}`).join('\n') + '\n\n';
    }

    if (solutionStress && solutionStress.length > 0) {
      md += '---\n\n### 🔍 4. Auto-Crítica de la Solución (Pre-Mortem de las Mitigaciones)\n';
      md += solutionStress.map((s, i) => `- ⚡ **[Punto Débil ${i + 1}]**: ${s}`).join('\n') + '\n\n';
    }

    md += `---\n\n### ⚖️ 5. Veredicto Final: **${verdict}**\n`;
    if (glosa) md += `\n${glosa}\n`;
    return md;
  }
}

const USO = [
  'Uso:',
  '  node tools/premortem.js evaluate <json_payload> [--target <dir>]',
  '  node tools/premortem.js verdicts',
  '',
  'Veredictos del contrato, de menos a mas severo:',
  ...Object.entries(VEREDICTOS).map(([k, v]) => `  ${k.padEnd(26)} exit ${v.exit}  ${v.glosa}`),
  '',
  'El veredicto se deriva del analisis. Puedes proponer uno MAS severo en payload.verdict;',
  'proponer uno mas laxo se rechaza, porque el evaluado no dicta su propio resultado.',
  '',
  'Codigos de salida: 0 adelante, 2 requiere decision humana, 1 rechazado o payload invalido.',
].join('\n');

function main() {
  const args = process.argv.slice(2);
  const comando = args[0];

  if (!comando || comando === '--help' || comando === '-h') {
    console.log(USO);
    process.exit(2);
  }

  if (comando === 'verdicts') {
    console.log(JSON.stringify(VEREDICTOS, null, 2));
    process.exit(0);
  }

  if (comando !== 'evaluate') {
    console.log(`Accion desconocida: ${comando}\n`);
    console.log(USO);
    process.exit(2);
  }

  const iTarget = args.indexOf('--target');
  const raiz = iTarget !== -1 && args[iTarget + 1] ? args[iTarget + 1] : ROOT;
  const bruto = args.slice(1).find((a) => !a.startsWith('--') && a !== args[iTarget + 1]);

  if (!bruto) {
    console.error(JSON.stringify({ status: 'DENIED', reason: 'MISSING_PAYLOAD', exitCode: 1 }, null, 2));
    process.exit(1);
  }

  let payload;
  try {
    payload = JSON.parse(bruto);
  } catch (e) {
    console.error(JSON.stringify({ status: 'DENIED', reason: 'MALFORMED_JSON', exitCode: 1, message: e.message }, null, 2));
    process.exit(1);
  }

  const res = new PreMortemEngine(raiz).evaluateAssessment(payload);
  console.log(JSON.stringify(res, null, 2));
  process.exit(typeof res.exitCode === 'number' ? res.exitCode : 1);
}

if (require.main === module) main();

module.exports = PreMortemEngine;
module.exports.VEREDICTOS = VEREDICTOS;
module.exports.ANCHORS = ANCHORS;
module.exports.MINIMO_SUSTANCIA = MINIMO_SUSTANCIA;
module.exports.USO = USO;
