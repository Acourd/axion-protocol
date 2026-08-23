#!/usr/bin/env node

/**
 * Axion Protocol - Intent Clarifier & Sealed Contract Engine (Fase 1: ENTENDER)
 * 
 * 1) Detecta ambigüedad con filtro inteligente de especificidad técnica (evita falsos positivos).
 * 2) Orquesta opciones A/B/C + dictado libre si la solicitud es verdaderamente difusa.
 * 3) Persiste atómicamente el IntentContract firmado con SHA-256 en .axion/state/intent-contract.json.
 * 4) Permite registrar y consolidar las respuestas elegidas por el usuario (seal).
 * 
 * Zero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

function appendCustomOption(optionsList) {
  const customOption = {
    name: 'Opción Personalizada (Dictado Libre)',
    description: 'Escribir o describir libremente tu propio criterio, combinación de estilos o dirección exacta sin acotarte a las opciones sugeridas.'
  };
  return [...optionsList, customOption];
}

function getTailoredStyleOptions(productCategory) {
  const lower = (productCategory || '').toLowerCase();
  let baseOptions = [];

  // 1. Si es Dashboard / Panel de Datos / Herramienta Interna
  if (/dashboard|panel|datos|tabla|admin|métricas|control/i.test(lower)) {
    baseOptions = [
      {
        name: 'Estilo Slate Dark de Alta Legibilidad (Recomendado)',
        description: 'Fondo gris oscuro mate (#111827), bordes sutiles de 1px, tarjetas densas de métricas y alta legibilidad de texto.'
      },
      {
        name: 'Estilo Corporate Light Limpio',
        description: 'Fondo blanco/gris claro, alto contraste para jornadas largas de trabajo y tarjetas estructuradas.'
      },
      {
        name: 'Estilo Minimalist Grid',
        description: 'Estructura plana sin sombras ni degradados, máxima velocidad de carga e información priorizada.'
      }
    ];
  } else if (/landing|presentación|sitio|oficial|promocional|producto|web/i.test(lower)) {
    // 2. Si es Landing Page / Presentación / Sitio Web Oficial
    baseOptions = [
      {
        name: 'Estilo Apple Glassmorphism Minimalista (Recomendado)',
        description: 'Grises oscuros pulidos (#0b0f19), vidrio esmerilado sutil, tipografía limpia e Inter-spacing elegante sin orbes recargados.'
      },
      {
        name: 'Estilo Cyber Glow & Neón',
        description: 'Fondo oscuro con gradientes vibrantes (índigo/cyan), esferas ambientales flotantes y tarjetas con resplandor glow.'
      },
      {
        name: 'Estilo Editorial de Alto Contraste',
        description: 'Tipografía prominente, líneas finas de separación, tono blanco/negro sobrio y lectura estructurada.'
      }
    ];
  } else if (/móvil|mobile|app|interactiva|touch/i.test(lower)) {
    // 3. Si es App Móvil / Web App Interactiva
    baseOptions = [
      {
        name: 'Estilo Fluid Touch Glass (Recomendado)',
        description: 'Controles adaptados para pantalla táctil, bordes redondeados (16px), micro-transiciones suaves.'
      },
      {
        name: 'Estilo Native Clean',
        description: 'Aspecto nativo de sistema móvil, colores planos de alto contraste y respuesta inmediata.'
      }
    ];
  } else {
    // Opción por defecto para cualquier otra interfaz visual
    baseOptions = [
      {
        name: 'Estilo Modern Dark Glass (Recomendado)',
        description: 'Fondo oscuro sobrio, vidrio esmerilado de 1px y tipografía limpia.'
      },
      {
        name: 'Estilo Sobrio y Minimalista',
        description: 'Diseño plano de alto contraste sin animaciones de movimiento.'
      }
    ];
  }

  return appendCustomOption(baseOptions);
}

/**
 * Detecta si una petición contiene suficiente especificidad técnica
 * (rutas de archivo, comandos, flags, identificadores) como para no requerir preguntas socráticas.
 */
function hasTechnicalSpecificity(text) {
  if (!text || typeof text !== 'string') return false;

  const hasFileOrPath = /\b[\w-]+\.(js|ts|json|md|html|css|py|sh|ps1|yml|yaml)\b|tools\/|\.agents\/|\.claude\/|tests\//i.test(text);
  const hasCodeIdentifiers = /--[\w-]+|\b(sha256|sha-256|ed25519|fuzzer|preflight|rollback|attestation|killswitch|ast|git|npm|node)\b/i.test(text);
  const hasSpecificQuantityOrMetric = /\b\d+\s+(vectores|ataques|archivos|líneas|suites|tests|comandos)\b/i.test(text);

  return hasFileOrPath || hasCodeIdentifiers || hasSpecificQuantityOrMetric;
}

function analyzeUserIntent(requestText, options = {}) {
  if (!requestText || typeof requestText !== 'string' || requestText.trim() === '') {
    return {
      status: 'NEEDS_CLARIFICATION',
      substep: 1,
      reason: 'No se ingresó ninguna solicitud.',
      questions: [
        '¿Qué objetivo o idea te gustaría que abordemos juntos hoy?'
      ],
      options: []
    };
  }

  const trimmed = requestText.trim();
  const wordCount = trimmed.split(/\s+/).length;
  const substep = options.substep || 1;
  const productCategory = options.productCategory || trimmed;

  const isTechnicallySpecific = hasTechnicalSpecificity(trimmed);
  const vagueVerbs = ['haz', 'crea', 'arregla', 'mejora', 'modifica', 'pon', 'agrega', 'hacer'];
  const hasVagueVerb = vagueVerbs.some(v => new RegExp(`\\b${v}\\b`, 'i').test(trimmed));
  const isTooVague = !options.selectedOptions && !isTechnicallySpecific && (wordCount < 6 || (hasVagueVerb && wordCount < 12));

  if ((isTooVague || options.forceClarification) && !isTechnicallySpecific && !options.selectedOptions) {
    if (substep === 1) {
      const baseDirectionOptions = [
        {
          name: 'Opción A (Solución Ágil y Directa)',
          description: 'Implementación directa y minimalista enfocada en la función principal.'
        },
        {
          name: 'Opción B (Solución Completa y Guiada)',
          description: 'Incluir validaciones avanzadas, recuperación e interfaz detallada.'
        },
        {
          name: 'Opción C (Landing Page / Presentación)',
          description: 'Página web visual de alto impacto para presentar la propuesta de valor.'
        }
      ];

      return {
        status: 'NEEDS_CLARIFICATION',
        substep: 1,
        substepName: 'Sub-paso 1: Dirección de Producto',
        reason: 'Aclaración de dirección general de producto.',
        questions: [
          `1. ¿Qué experiencia o resultado visual esperas ver cuando "${trimmed}" esté listo?`,
          '2. ¿Hay alguna regla o comportamiento especial que debamos cuidar para el usuario?'
        ],
        options: appendCustomOption(baseDirectionOptions),
        nextSubstepPrompt: 'Tras elegir la dirección, pasaremos al Sub-paso 2: Clarificación de Diseño & UX.',
        rawRequest: trimmed
      };
    }

    if (substep === 2) {
      const styleOptions = getTailoredStyleOptions(productCategory);
      return {
        status: 'NEEDS_CLARIFICATION',
        substep: 2,
        substepName: 'Sub-paso 2: Clarificación de Diseño & UX (Filtrado Dinámico + Opción Personalizada)',
        reason: `Aclaración estética adaptada dinámicamente al tipo de producto: "${productCategory}".`,
        questions: [
          '¿Qué estilo visual y densidad encaja mejor con tu producto?'
        ],
        options: styleOptions,
        rawRequest: trimmed
      };
    }
  }

  // Solicitud detallada o técnicamente específica -> Emitir Contrato de Entendimiento
  const summary = trimmed.length > 90 ? trimmed.substring(0, 90) + '...' : trimmed;

  const contract = {
    contract_id: crypto.randomBytes(6).toString('hex'),
    summary: summary,
    expectedBehavior: isTechnicallySpecific
      ? `Ejecutar la tarea técnica específica: "${trimmed}".`
      : `Desarrollar "${trimmed}" respetando el tipo de producto, estilo visual y animaciones acordadas.`,
    targetAudience: 'Usuario final / Desarrollador del sistema',
    scopeBoundary: 'Cambios acotados exclusivamente al área técnica autorizada.',
    selectedOptions: options.selectedOptions || 'Parámetros técnicos inferidos directamente de la instrucción.',
    clarifiedAt: new Date().toISOString()
  };

  // Si se solicita persistir o es análisis final
  if (options.persist !== false) {
    persistContract(contract, trimmed, options.projectRoot || ROOT);
  }

  return {
    status: 'INTENT_CLARIFIED',
    substep: 3,
    intentContract: contract,
    rawRequest: trimmed
  };
}

/**
 * Persiste el IntentContract en .axion/state/intent-contract.json
 */
function persistContract(contract, rawRequest, projectRoot = ROOT) {
  try {
    const stateDir = path.join(projectRoot, '.axion', 'state');
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }

    const payload = {
      ...contract,
      rawRequest,
      signed_at: new Date().toISOString()
    };
    const digest = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    payload.digest = digest;

    const targetPath = path.join(stateDir, 'intent-contract.json');
    fs.writeFileSync(targetPath, JSON.stringify(payload, null, 2), 'utf8');
    return { success: true, targetPath, digest };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Sella explícitamente una decisión tomada por el usuario.
 */
function sealIntent(requestText, selectedOptions, projectRoot = ROOT) {
  return analyzeUserIntent(requestText, {
    selectedOptions,
    persist: true,
    projectRoot,
    forceClarification: false
  });
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Uso:\n  node tools/intent_clarifier.js "<solicitud_del_usuario>"\n  node tools/intent_clarifier.js seal --request "<solicitud>" --selected "<opciones>"\n  node tools/intent_clarifier.js current');
    process.exit(0);
  }

  if (args[0] === 'current') {
    const statePath = path.join(ROOT, '.axion', 'state', 'intent-contract.json');
    if (fs.existsSync(statePath)) {
      console.log(fs.readFileSync(statePath, 'utf8'));
      process.exit(0);
    } else {
      console.log(JSON.stringify({ status: 'NO_ACTIVE_CONTRACT', message: 'No hay contrato de intención activo en disco.' }, null, 2));
      process.exit(0);
    }
  }

  if (args[0] === 'seal') {
    let req = '';
    let sel = '';
    for (let i = 1; i < args.length; i++) {
      if (args[i] === '--request' && args[i + 1]) req = args[++i];
      if (args[i] === '--selected' && args[i + 1]) sel = args[++i];
    }
    const result = sealIntent(req || 'Petición sellada por usuario', sel || 'Aprobada');
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  }

  const input = args.join(' ');
  const result = analyzeUserIntent(input);
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main();
}

module.exports = { analyzeUserIntent, getTailoredStyleOptions, hasTechnicalSpecificity, sealIntent, persistContract };
