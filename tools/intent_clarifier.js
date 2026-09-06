#!/usr/bin/env node
'use strict';


/**
 * Axion Protocol — Intent Clarifier & Sealed Contract Engine (Fase 1: ENTENDER / v3.0.0)
 * 
 * Puerta socrática de intención previa a la ejecución en /drive:
 * 1) Freno cognitivo obligatorio antes de planificar o programar (Cero código antes del contrato).
 * 2) Exactamente 2 preguntas socráticas (Flujo principal + Estética/Densidad UX) con opciones A/B/C + Personalizada.
 * 3) Persistencia atómica y sellado canónico RFC 8785 con SHA-256 en .axion/state/intent-contract.json.
 * 4) Tratamiento de 'Content is Data' contra bypass de prompt injection.
 * 5) Soporte integral de perfiles de usuario y normalización tolerante de dictado por voz (VOICE_DICTATION).
 * 6) Integración bidireccional con /drive y DriveMetacognitiveSentinel.
 * 7) Taxonomía cerrada de veredictos tipados de Línea 0.
 * 
 * Zero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { hashCanonical } = require('./canonical_json.js');

const ROOT = path.resolve(__dirname, '..');

const CLOSED_VERDICTS = [
  'CONTRATO_SELLADO',
  'PREGUNTAS_DESPLEGADAS',
  'ESPECIFICIDAD_INFERIDA',
  'PERFIL_VOZ_PROCESADO',
  'CONTRATO_INVALIDO',
  'ESCALACION_HUMANA'
];

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous\s+)?instructions/i,
  /olvida\s+(todas\s+)?(las\s+)?instrucciones/i,
  /system\s+override/i,
  /skip\s+(clarify|socratic|questions|freno)/i,
  /sin\s+pregunt(ar|as)/i,
  /no\s+hagas\s+preguntas/i,
  /do\s+not\s+ask\s+(any\s+)?questions/i,
  /act\s+as\s+if\s+already\s+clarified/i
];

function sanitizeForPromptInjection(text) {
  if (!text || typeof text !== 'string') return { cleaned: '', hasInjection: false };
  let hasInjection = false;
  let cleaned = text;
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(cleaned)) {
      hasInjection = true;
      cleaned = cleaned.replace(pattern, ' ');
    }
  }
  return { cleaned: cleaned.replace(/\s+/g, ' ').trim(), hasInjection };
}

function readUserProfile(projectRoot = ROOT) {
  try {
    const profilePath = path.join(projectRoot, '.axion', 'PROFILE.json');
    if (fs.existsSync(profilePath)) {
      return JSON.parse(fs.readFileSync(profilePath, 'utf8'));
    }
    const { getProfile } = require('./profile_adapter.js');
    return getProfile(projectRoot);
  } catch (_) {
    // Si no está disponible el adaptador, perfil de fábrica
    return {
      technical_depth: 'VISIONARY',
      input_mode: 'VOICE_DICTATION',
      environment: 'IDE_GUI',
      cadence: 'COMPLETE_BLOCK',
      creative_autonomy: 'HIGH'
    };
  }
}

function escribirAtomico(rutaDestino, contenido) {
  const dir = path.dirname(rutaDestino);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${rutaDestino}.tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  fs.writeFileSync(tmp, contenido, 'utf8');
  try {
    fs.renameSync(tmp, rutaDestino);
  } catch (err) {
    // Fallback multiplataforma para colisiones de renombrado en disco
    fs.copyFileSync(tmp, rutaDestino);
    if (fs.existsSync(tmp)) {
      fs.unlinkSync(tmp);
    }
  }
}

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
 * Aplica el principio Content is Data para ignorar intentos de prompt injection.
 */
function hasTechnicalSpecificity(text) {
  if (!text || typeof text !== 'string') return false;

  const { cleaned, hasInjection } = sanitizeForPromptInjection(text);
  if (!cleaned) return false;

  const hasFileOrPath = /\b[\w-]+\.(js|ts|json|md|html|css|py|sh|ps1|yml|yaml)\b|tools\/|\.agents\/|\.claude\/|\.opencode\/|tests\//i.test(cleaned);
  const hasCodeIdentifiers = /--[\w-]+|\b(sha256|sha-256|ed25519|fuzzer|preflight|rollback|attestation|killswitch|ast|git|npm|node)\b/i.test(cleaned);
  const hasSpecificQuantityOrMetric = /\b\d+\s+(vectores|ataques|archivos|líneas|suites|tests|comandos)\b/i.test(cleaned);

  // Si hubo inyección hostil, exigimos ruta o archivo explícito o métrica para no ser engañados por palabras sueltas
  if (hasInjection) {
    return hasFileOrPath || hasSpecificQuantityOrMetric;
  }

  return hasFileOrPath || hasCodeIdentifiers || hasSpecificQuantityOrMetric;
}

function analyzeUserIntent(requestText, options = {}) {
  const userProfile = options.userProfile || readUserProfile(options.projectRoot || ROOT);

  if (!requestText || typeof requestText !== 'string' || requestText.trim() === '') {
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
      verdict: 'PREGUNTAS_DESPLEGADAS',
      substep: 1,
      reason: 'No se ingresó ninguna solicitud.',
      questions: [
        '1. ¿Qué objetivo funcional o flujo principal te gustaría construir?',
        '2. ¿Qué estilo visual y densidad de interfaz prefieres?'
      ],
      options: appendCustomOption(baseDirectionOptions),
      rawRequest: ''
    };
  }

  const trimmed = requestText.trim();
  const substep = options.substep || 1;
  const productCategory = options.productCategory || trimmed;

  const { cleaned, hasInjection } = sanitizeForPromptInjection(trimmed);
  const effectiveWordCount = cleaned ? cleaned.split(/\s+/).filter(Boolean).length : 0;

  const isTechnicallySpecific = hasTechnicalSpecificity(trimmed);
  const vagueVerbs = ['haz', 'crea', 'arregla', 'mejora', 'modifica', 'pon', 'agrega', 'hacer', 'make', 'create', 'fix', 'build', 'do', 'add', 'change'];
  const hasVagueVerb = vagueVerbs.some(v => new RegExp(`\\b${v}\\b`, 'i').test(trimmed));
  const isTooVague = !options.selectedOptions && !isTechnicallySpecific && (hasInjection || effectiveWordCount < 6 || (hasVagueVerb && effectiveWordCount < 12));

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
        verdict: 'PREGUNTAS_DESPLEGADAS',
        substep: 1,
        substepName: 'Sub-paso 1: Dirección de Producto',
        reason: hasInjection
          ? 'Tratamiento Content is Data: intento de bypass o evasión de clarificación detectado y neutralizado.'
          : 'Aclaración de dirección general de producto.',
        injectionDetected: hasInjection,
        questions: [
          `1. ¿Qué experiencia o resultado visual esperas ver cuando "${cleaned || trimmed}" esté listo?`,
          '2. ¿Hay alguna regla o comportamiento especial que debamos cuidar para el usuario?'
        ],
        options: appendCustomOption(baseDirectionOptions),
        styleOptions: getTailoredStyleOptions(productCategory),
        nextSubstepPrompt: 'Tras elegir la dirección, pasaremos al Sub-paso 2: Clarificación de Diseño & UX.',
        rawRequest: trimmed
      };
    }

    if (substep === 2) {
      const styleOptions = getTailoredStyleOptions(productCategory);
      return {
        status: 'NEEDS_CLARIFICATION',
        verdict: 'PREGUNTAS_DESPLEGADAS',
        substep: 2,
        substepName: 'Sub-paso 2: Clarificación de Diseño & UX (Filtrado Dinámico + Opción Personalizada)',
        reason: `Aclaración estética adaptada dinámicamente al tipo de producto: "${productCategory}".`,
        injectionDetected: hasInjection,
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

  const now = new Date().toISOString();
  const contract = {
    contract_id: crypto.randomBytes(6).toString('hex'),
    summary: summary,
    rawRequest: trimmed,
    expectedBehavior: isTechnicallySpecific
      ? `Ejecutar la tarea técnica específica: "${trimmed}".`
      : `Desarrollar "${trimmed}" respetando el tipo de producto, estilo visual y animaciones acordadas.`,
    targetAudience: 'Usuario final / Desarrollador del sistema',
    scopeBoundary: 'Cambios acotados exclusivamente al área técnica autorizada.',
    selectedOptions: options.selectedOptions || 'Parámetros técnicos inferidos directamente de la instrucción.',
    clarifiedAt: now,
    signed_at: now
  };

  if (options.voiceMeta) {
    contract.voiceMeta = options.voiceMeta;
  }

  // Pre-calcular digest canónico RFC 8785 garantizando validez criptográfica inmediata
  const clone = { ...contract };
  delete clone.digest;
  contract.digest = hashCanonical(clone);

  let persistResult = null;
  if (options.persist !== false) {
    persistResult = persistContract(contract, trimmed, options.projectRoot || ROOT);
    if (persistResult && persistResult.digest) {
      contract.digest = persistResult.digest;
    }
  }

  let verdict = 'CONTRATO_SELLADO';
  if (options.voiceMeta && options.voiceMeta.recognized) {
    verdict = 'PERFIL_VOZ_PROCESADO';
  } else if (isTechnicallySpecific && !options.selectedOptions) {
    verdict = 'ESPECIFICIDAD_INFERIDA';
  }

  return {
    status: 'INTENT_CLARIFIED',
    verdict,
    substep: 3,
    injectionDetected: hasInjection,
    intentContract: contract,
    voiceMeta: options.voiceMeta || null,
    rawRequest: trimmed,
    persistResult
  };
}

/**
 * Persiste el IntentContract en .axion/state/intent-contract.json
 */
function persistContract(contract, rawRequest, projectRoot = ROOT) {
  try {
    const stateDir = path.join(projectRoot, '.axion', 'state');
    const targetPath = path.join(stateDir, 'intent-contract.json');

    const payload = {
      ...contract,
      rawRequest: contract.rawRequest || rawRequest || '',
      signed_at: contract.signed_at || new Date().toISOString()
    };
    contract.rawRequest = payload.rawRequest;
    contract.signed_at = payload.signed_at;

    delete payload.digest;
    const digest = hashCanonical(payload);
    payload.digest = digest;
    contract.digest = digest;

    escribirAtomico(targetPath, JSON.stringify(payload, null, 2) + '\n');
    return { success: true, targetPath, digest };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Parsea y normaliza respuestas verbales de dictado por voz (VOICE_DICTATION).
 * Mapea expresiones naturales a opciones estructuradas (A, B, C, estilos).
 */
function parseVoiceDictation(voiceInput, options = {}) {
  if (!voiceInput || typeof voiceInput !== 'string') {
    return {
      recognized: false,
      inputMode: 'VOICE_DICTATION',
      raw: '',
      selections: {},
      summary: 'Sin entrada de voz detectada.'
    };
  }

  const raw = voiceInput.trim();
  const lower = raw.toLowerCase();

  const ordinalToLetter = {
    'primera': 'A',
    'primero': 'A',
    'primer': 'A',
    'first': 'A',
    'segunda': 'B',
    'segundo': 'B',
    'second': 'B',
    'tercera': 'C',
    'tercero': 'C',
    'third': 'C',
    'cuarta': 'D',
    'cuarto': 'D',
    'fourth': 'D'
  };

  let q1 = null;
  let q2 = null;

  // 1. Patrones numerados: "1A 2B", "1: A, 2: B", "1A2B", "pregunta 1 la A, pregunta 2 la B", "question 1 option A"
  const p1Match = raw.match(/(?:(?:pregunta|question)\s*)?1\s*[:.-]?\s*(?:(?:la|el|the)\s+)?(?:(?:opci[oó]n|option)\s+)?([A-D]|primera|primero|primer|first|segunda|segundo|second|tercera|tercero|third|cuarta|cuarto|fourth)(?:\s+(?:opci[oó]n|option))?\b/i);
  const p2Match = raw.match(/(?:(?:pregunta|question)\s*)?2\s*[:.-]?\s*(?:(?:la|el|the)\s+)?(?:(?:opci[oó]n|option)\s+)?([A-D]|primera|primero|primer|first|segunda|segundo|second|tercera|tercero|third|cuarta|cuarto|fourth)(?:\s+(?:opci[oó]n|option))?\b/i);

  if (p1Match) {
    const val = p1Match[1].toUpperCase();
    q1 = ordinalToLetter[p1Match[1].toLowerCase()] || (['A', 'B', 'C', 'D'].includes(val) ? val : null);
  }
  if (p2Match) {
    const val = p2Match[1].toUpperCase();
    q2 = ordinalToLetter[p2Match[1].toLowerCase()] || (['A', 'B', 'C', 'D'].includes(val) ? val : null);
  }

  // 2. Patrón de secuencia coordinada: "la primera opción y la segunda opción", "option A and option B", "first and second", "A y C"
  if (!q1 && !q2) {
    const seqMatch = raw.match(/(?:(?:la|el|the)\s+)?(?:(?:opci[oó]n|option)\s+)?([A-D]|primera|primero|primer|first|segunda|segundo|second|tercera|tercero|third|cuarta|cuarto|fourth)(?:\s+(?:opci[oó]n|option))?\s*(?:y|e|con|,|-|and)\s*(?:(?:la|el|the)\s+)?(?:(?:opci[oó]n|option)\s+)?([A-D]|primera|primero|primer|first|segunda|segundo|second|tercera|tercero|third|cuarta|cuarto|fourth)(?:\s+(?:opci[oó]n|option))?\b/i);
    if (seqMatch) {
      const v1 = seqMatch[1].toUpperCase();
      const v2 = seqMatch[2].toUpperCase();
      q1 = ordinalToLetter[seqMatch[1].toLowerCase()] || (['A', 'B', 'C', 'D'].includes(v1) ? v1 : null);
      q2 = ordinalToLetter[seqMatch[2].toLowerCase()] || (['A', 'B', 'C', 'D'].includes(v2) ? v2 : null);
    }
  }

  // 3. Selección única o primera parte
  if (!q1) {
    const firstPart = raw.match(/(?:^|\b)(?:(?:la|el|the)\s+)?(?:(?:opci[oó]n|option)\s+)?([A-D]|primera|primero|primer|first|segunda|segundo|second|tercera|tercero|third|cuarta|cuarto|fourth)(?:\s+(?:opci[oó]n|option))?\b/i);
    if (firstPart) {
      const val = firstPart[1].toUpperCase();
      q1 = ordinalToLetter[firstPart[1].toLowerCase()] || (['A', 'B', 'C', 'D'].includes(val) ? val : null);
    }
  }

  // 4. Mapeo semántico de estilos para q2
  if (!q2) {
    if (/slate\s*dark/i.test(lower)) q2 = 'Slate Dark';
    else if (/corporate\s*light/i.test(lower)) q2 = 'Corporate Light';
    else if (/minimalist|minimalista/i.test(lower)) q2 = 'Minimalista';
    else if (/glassmorphism|apple/i.test(lower)) q2 = 'Apple Glassmorphism';
    else if (/cyber\s*glow|ne[oó]n|neon/i.test(lower)) q2 = 'Cyber Glow';
    else if (/fluid\s*touch/i.test(lower)) q2 = 'Fluid Touch Glass';
  }

  const recognized = Boolean(q1 || q2);
  const selections = {};
  if (q1) selections.q1 = q1;
  if (q2) selections.q2 = q2;

  let summary = '';
  if (q1 && q2) {
    summary = `Pregunta 1: Opción ${q1} | Pregunta 2: Opción ${q2}`;
  } else if (q1) {
    summary = `Pregunta 1: Opción ${q1}`;
  } else if (q2) {
    summary = `Pregunta 2: Opción ${q2}`;
  } else {
    summary = raw;
  }

  return {
    recognized,
    inputMode: 'VOICE_DICTATION',
    raw,
    q1,
    q2,
    choiceQ1: q1,
    choiceQ2: q2,
    selections,
    summary
  };
}

/**
 * Valida formalmente la estructura y la integridad criptográfica SHA-256 de un IntentContract.
 */
function validateContract(contract) {
  if (!contract || typeof contract !== 'object') {
    return {
      isValid: false,
      verdict: 'CONTRATO_INVALIDO',
      status: 'INVALID_CONTRACT_STRUCTURE',
      reason: 'El contrato de intención no es un objeto válido.'
    };
  }

  const requiredFields = ['contract_id', 'summary', 'expectedBehavior', 'scopeBoundary', 'digest'];
  const missing = requiredFields.filter((f) => !contract[f] || typeof contract[f] !== 'string' || !contract[f].trim());
  if (missing.length > 0) {
    return {
      isValid: false,
      verdict: 'CONTRATO_INVALIDO',
      status: 'MISSING_FIELDS',
      reason: `Campos obligatorios ausentes o vacíos: ${missing.join(', ')}.`
    };
  }

  const clone = { ...contract };
  const storedDigest = clone.digest;
  delete clone.digest;
  const computed = hashCanonical(clone);

  if (storedDigest !== computed) {
    return {
      isValid: false,
      verdict: 'CONTRATO_INVALIDO',
      status: 'CORRUPTED_DIGEST',
      reason: 'El digest SHA-256 no coincide con el hash canónico RFC 8785 (posible alteración o manipulación).',
      storedDigest,
      computedDigest: computed
    };
  }

  return {
    isValid: true,
    verdict: 'CONTRATO_SELLADO',
    status: 'SEALED_VALID',
    contract,
    digest: storedDigest
  };
}

/**
 * Verifica la invariante fundamental de 'Cero código antes del contrato'.
 */
function verifyContractBeforeCode(projectRoot = ROOT) {
  const contractPath = path.join(projectRoot, '.axion', 'state', 'intent-contract.json');
  if (!fs.existsSync(contractPath)) {
    return {
      allowed: false,
      verdict: 'CONTRATO_INVALIDO',
      status: 'NO_CONTRACT_IN_DISK',
      reason: 'Cero código antes del contrato: no existe .axion/state/intent-contract.json en disco.'
    };
  }

  try {
    const raw = fs.readFileSync(contractPath, 'utf8');
    const parsed = JSON.parse(raw);
    const validation = validateContract(parsed);
    if (!validation.isValid) {
      return {
        allowed: false,
        verdict: 'CONTRATO_INVALIDO',
        status: 'TAMPERED_OR_CORRUPT',
        reason: validation.reason
      };
    }
    return {
      allowed: true,
      verdict: 'CONTRATO_SELLADO',
      status: 'CONTRACT_VERIFIED',
      contract: validation.contract,
      digest: validation.digest
    };
  } catch (err) {
    return {
      allowed: false,
      verdict: 'CONTRATO_INVALIDO',
      status: 'PARSE_ERROR',
      reason: `Error al leer o parsear contrato: ${err.message}`
    };
  }
}

/**
 * Comprueba si el límite de alcance (scopeBoundary) es ambiguo o excesivamente amplio.
 */
function isAmbiguousScope(scopeBoundary) {
  if (!scopeBoundary || typeof scopeBoundary !== 'string') return true;
  const lower = scopeBoundary.toLowerCase().trim();
  if (lower.length < 5) return true;
  return (
    lower.includes('todo el sistema') ||
    lower.includes('todo el repositorio') ||
    lower.includes('todos los archivos') ||
    lower.includes('cualquier archivo') ||
    lower.includes('cualquier cosa') ||
    lower.includes('all files') ||
    lower.includes('whole repository') ||
    lower.includes('whole system') ||
    lower.includes('*')
  );
}

/**
 * Audita el contrato de intención listo para alimentar la fase F0/F1 de /drive.
 */
function auditContractForDrive(projectRoot = ROOT) {
  const check = verifyContractBeforeCode(projectRoot);
  if (!check.allowed) {
    return {
      readyForDrive: false,
      verdict: check.verdict,
      status: check.status,
      reason: check.reason,
      contract: null,
      digest: null
    };
  }

  const contract = check.contract;
  if (isAmbiguousScope(contract.scopeBoundary)) {
    return {
      readyForDrive: false,
      verdict: 'ESCALACION_HUMANA',
      status: 'AMBIGUOUS_BLAST_RADIUS',
      reason: 'El límite de alcance (scopeBoundary) es ambiguo o excesivamente amplio.',
      contract,
      digest: check.digest
    };
  }

  return {
    readyForDrive: true,
    verdict: 'CONTRATO_SELLADO',
    status: 'READY_FOR_DRIVE',
    contract,
    digest: check.digest,
    reason: 'Contrato verificado con SHA-256 canónico y delimitado para F0/F1 de /drive.'
  };
}

/**
 * Formatea la declaración tipada de veredicto en Línea 0.
 */
function formatLineZeroVerdict(verdict, details = {}) {
  if (!CLOSED_VERDICTS.includes(verdict)) {
    throw new Error(`Veredicto desconocido: "${verdict}". Debe ser uno de: ${CLOSED_VERDICTS.join(', ')}`);
  }

  const lines = [`VEREDICTO: ${verdict}`];
  if (details.summary) lines.push(`- Resumen: ${details.summary}`);
  if (details.digest) lines.push(`- Digest SHA-256: ${details.digest}`);
  if (details.reason) lines.push(`- Razón: ${details.reason}`);
  return lines.join('\n');
}

/**
 * Sella explícitamente una decisión tomada por el usuario, soportando voz y texto.
 */
function sealIntent(requestText, selectedOptions, projectRootOrOptions = ROOT) {
  let projectRoot = ROOT;
  let voiceMeta = null;
  let finalSelected = selectedOptions;
  let persist = true;

  if (typeof projectRootOrOptions === 'string') {
    projectRoot = projectRootOrOptions;
  } else if (projectRootOrOptions && typeof projectRootOrOptions === 'object') {
    projectRoot = projectRootOrOptions.projectRoot || ROOT;
    voiceMeta = projectRootOrOptions.voiceMeta || null;
    if (projectRootOrOptions.persist === false) {
      persist = false;
    }
  }

  if (typeof selectedOptions === 'string' && !voiceMeta) {
    const trimmedSel = selectedOptions.trim();
    const isUIOption = /\(.*\)/.test(trimmedSel);
    if (!isUIOption) {
      const parsed = parseVoiceDictation(trimmedSel);
      if (parsed.recognized) {
        voiceMeta = parsed;
        finalSelected = parsed.summary;
      }
    }
  }

  const result = analyzeUserIntent(requestText, {
    selectedOptions: finalSelected,
    voiceMeta,
    persist,
    projectRoot,
    forceClarification: false
  });

  return result;
}

/**
 * Convierte el resultado de clarificación en el formato interactivo de selección UI (ask_question).
 * Admite tanto 1 como 2 preguntas simultáneas con opciones A/B/C seleccionables.
 */
function toInteractiveModalFormat(clarificationResult, options = {}) {
  if (!clarificationResult || clarificationResult.status !== 'NEEDS_CLARIFICATION') {
    return null;
  }
  const qList = clarificationResult.questions || [
    '1. ¿Qué objetivo funcional o flujo principal debe resolver la implementación?',
    '2. ¿Qué estilo visual y densidad de interfaz prefieres?'
  ];

  const optsQ1 = (clarificationResult.options || []).map((o, idx) => {
    const isFirst = idx === 0 ? '(Recomendado) ' : '';
    const desc = o.description ? ` — ${o.description}` : '';
    return `${isFirst}${o.name}${desc}`.trim();
  });

  const modalQuestions = [];

  modalQuestions.push({
    question: qList[0] || '1. ¿Qué objetivo funcional o flujo principal debe resolver la implementación?',
    options: optsQ1.length >= 2 ? optsQ1 : ['(Recomendado) Opción A (Solución Ágil y Directa)', 'Opción B (Solución Completa)', 'Opción C (Personalizada)'],
    is_multi_select: false
  });

  if (options.allQuestions || options.multiQuestion || clarificationResult.substep === 2) {
    const styleList = clarificationResult.styleOptions || getTailoredStyleOptions(clarificationResult.rawRequest);
    const optsQ2 = styleList.map((o, idx) => {
      const isFirst = idx === 0 ? '(Recomendado) ' : '';
      const desc = o.description ? ` — ${o.description}` : '';
      return `${isFirst}${o.name}${desc}`.trim();
    });
    modalQuestions.push({
      question: qList[1] || '2. ¿Qué estilo visual y densidad de interfaz prefieres?',
      options: optsQ2.length >= 2 ? optsQ2 : ['(Recomendado) Estilo Modern Dark Glass', 'Estilo Minimalista Sobrio', 'Opción Personalizada'],
      is_multi_select: false
    });
  }

  return {
    questions: modalQuestions
  };
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    // Uso incorrecto sale con 2, igual que preflight, premortem, checkpoint y memory.
    console.log('Uso:\n  node tools/intent_clarifier.js "<solicitud_del_usuario>"\n  node tools/intent_clarifier.js seal --request "<solicitud>" --selected "<opciones>"\n  node tools/intent_clarifier.js current\n  node tools/intent_clarifier.js verify\n  node tools/intent_clarifier.js voice --input "<dictado>" [--request "<solicitud>"]');
    process.exit(2);
  }

  if (args[0] === 'current') {
    const statePath = path.join(ROOT, '.axion', 'state', 'intent-contract.json');
    if (fs.existsSync(statePath)) {
      console.log(fs.readFileSync(statePath, 'utf8'));
      process.exit(0);
    } else {
      console.log(JSON.stringify({ status: 'NO_ACTIVE_CONTRACT', verdict: 'CONTRATO_INVALIDO', message: 'No hay contrato de intención activo en disco.' }, null, 2));
      process.exit(1);
    }
  }

  if (args[0] === 'verify') {
    const check = verifyContractBeforeCode(ROOT);
    console.log(JSON.stringify(check, null, 2));
    process.exit(check.allowed ? 0 : 1);
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

  if (args[0] === 'voice') {
    let inp = '';
    let req = '';
    for (let i = 1; i < args.length; i++) {
      if (args[i] === '--input' && args[i + 1]) inp = args[++i];
      if (args[i] === '--request' && args[i + 1]) req = args[++i];
    }
    const voiceMeta = parseVoiceDictation(inp);
    if (!voiceMeta.recognized) {
      console.log(JSON.stringify({ status: 'VOICE_NOT_RECOGNIZED', verdict: 'ESCALACION_HUMANA', voiceMeta }, null, 2));
      process.exit(1);
    }
    const result = sealIntent(req || 'Petición sellada vía voz', voiceMeta.summary);
    console.log(JSON.stringify({ ...result, verdict: 'PERFIL_VOZ_PROCESADO', voiceMeta }, null, 2));
    process.exit(0);
  }

  const input = args.join(' ');
  const result = analyzeUserIntent(input);
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main();
}

module.exports = {
  CLOSED_VERDICTS,
  analyzeUserIntent,
  auditContractForDrive,
  formatLineZeroVerdict,
  getTailoredStyleOptions,
  hasTechnicalSpecificity,
  isAmbiguousScope,
  parseVoiceDictation,
  persistContract,
  readUserProfile,
  sanitizeForPromptInjection,
  sealIntent,
  toInteractiveModalFormat,
  validateContract,
  verifyContractBeforeCode
};
