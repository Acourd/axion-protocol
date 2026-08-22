#!/usr/bin/env node

/**
 * Axion Protocol - Multi-Substep Intent & Idea Clarifier Tool (Fase 1: ENTENDER)
 * 
 * Orquesta la clarificación secuencial en 3 sub-pasos estructurados:
 * 1) Dirección de Producto (A/B/C + Opción Personalizada / Dictado Libre)
 * 2) Clarificación de Diseño & UX (Filtrado dinámico + Opción Personalizada)
 * 3) Alcance Funcional
 */

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

  const vagueVerbs = ['haz', 'crea', 'arregla', 'mejora', 'modifica', 'pon', 'agrega', 'hacer'];
  const hasVagueVerb = vagueVerbs.some(v => new RegExp(`\\b${v}\\b`, 'i').test(trimmed));
  const isTooVague = wordCount < 6 || (hasVagueVerb && wordCount < 12);

  if (isTooVague || options.forceClarification) {
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

  // Solicitud detallada y clara -> Emitir Contrato de Entendimiento
  const summary = trimmed.length > 90 ? trimmed.substring(0, 90) + '...' : trimmed;

  return {
    status: 'INTENT_CLARIFIED',
    substep: 3,
    intentContract: {
      summary: summary,
      expectedBehavior: `Desarrollar "${trimmed}" respetando el tipo de producto, estilo visual y animaciones elegidas.`,
      targetAudience: 'Usuario final del sistema',
      scopeBoundary: 'Cambios acotados exclusivamente al área funcional autorizada.',
      clarifiedAt: new Date().toISOString()
    },
    rawRequest: trimmed
  };
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Uso: node tools/intent_clarifier.js "<solicitud_del_usuario>"');
    process.exit(0);
  }

  const input = args.join(' ');
  const result = analyzeUserIntent(input);
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main();
}

module.exports = { analyzeUserIntent, getTailoredStyleOptions };
