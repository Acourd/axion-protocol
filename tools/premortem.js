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
const crypto = require('crypto');
const { canonicalize, hashCanonical } = require('./canonical_json.js');
const { asEd25519PublicKey, computePublicKeyId, loadAuthorityRegistry } = require('./approval_ed25519.js');
const { verifyRootSeal, ROOT_AUTHORITY } = require('./governance_root.js');
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
  PLAN_APPROVED_WITH_SAFEGUARDS: { rango: 0, exit: 0, status: 'APPROVED', glosa: 'Plan aprobado con salvaguardas comprometidas (no certifica no-regresión antes de implementar).' },
  APPROVED_WITH_SAFEGUARDS: { rango: 0, exit: 0, status: 'APPROVED', glosa: 'Adelante, con las salvaguardas comprometidas (alias de PLAN_APPROVED_WITH_SAFEGUARDS).' },
  HUMAN_RISK_ACCEPTED: { rango: 0, exit: 0, status: 'APPROVED', glosa: 'Riesgo evaluado y aceptado formalmente por el operador humano responsable.' },
  CONDITIONAL_TDD: { rango: 1, exit: 2, status: 'CONDITIONAL', glosa: 'Solo con prueba que falle primero: hay una debilidad crítica en las mitigaciones.' },
  PIVOT_REQUIRED: { rango: 2, exit: 2, status: 'CONDITIONAL', glosa: 'El enfoque no sobrevive a su propia autopsia; hay que replantearlo.' },
  REQUIERE_DESCUBRIMIENTO: { rango: 3, exit: 2, status: 'DISCOVERY_REQUIRED', glosa: 'Falta contexto, dependencias o especificación suficiente para evaluar el impacto de la propuesta.' },
  REJECTED_AS_BLOAT: { rango: 4, exit: 1, status: 'DENIED', glosa: 'La complejidad que añade supera al problema que resuelve.' },
  REJECTED_AS_UNJUSTIFIED: { rango: 5, exit: 1, status: 'DENIED', glosa: 'No se sostiene la necesidad real de construirlo.' },
};

// Un riesgo de una palabra no es un riesgo, es una casilla marcada. El suelo existe
// porque la herramienta entera vale por la sustancia de lo que se escribe en ella, y sin
// minimo se aprobaba un pre-mortem con "x" en cada una de las cuatro anclas.
const MINIMO_SUSTANCIA = 40;
// Palabras distintas de tres o mas letras. Es el suelo que la longitud sola no pone.
const MINIMO_PALABRAS = 6;
const MAX_REGISTROS = 20;

// Proporción de frases literalmente reutilizadas a partir de la cual un análisis deja de
// ser parecido y pasa a ser copiado. El umbral es alto a propósito: el falso positivo aquí
// -frenar trabajo legítimo- desactiva la puerta antes de que nadie la corrija.
const UMBRAL_CALCO = 0.7;

const texto = (v) => (typeof v === 'string' ? v.trim() : '');
const normalizar = (v) => texto(v).toLowerCase().replace(/\s+/g, ' ');

/**
 * Todas las frases con las que un pre-mortem dice algo. Es lo que se compara para
 * detectar el calco, y deja fuera el nombre de la característica a propósito: cambiar
 * solo el título es justamente la maniobra que se persigue.
 */
function frasesSustantivas(payload) {
  const p = payload || {};
  const anchors = p.anchors && typeof p.anchors === 'object' ? p.anchors : {};
  return [
    ...CLAVES_ANCLA.flatMap((k) => (Array.isArray(anchors[k]) ? anchors[k] : [])),
    ...(Array.isArray(p.worst_case_scenarios) ? p.worst_case_scenarios : []),
    ...(Array.isArray(p.mandatory_mitigations) ? p.mandatory_mitigations : []),
  ].map(normalizar).filter(Boolean);
}

class PreMortemEngine {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot || ROOT);
    this.stateDir = path.join(this.root, '.axion', 'state');
    this.keysDir = path.join(this.root, '.axion', 'keys');
  }

  get rootDir() {
    return this.root;
  }

  ensureStateDir() {
    fs.mkdirSync(this.stateDir, { recursive: true });
  }

  /**
   * Valida la sustancia de una lista de afirmaciones. Devuelve los reproches concretos,
   * no un booleano: quien recibe un rechazo necesita saber qué frase arreglar.
   */
  /**
   * Valida la sustancia de una lista de afirmaciones. Devuelve los reproches concretos,
   * no un booleano: quien recibe un rechazo necesita saber qué frase arreglar.
   * Admite NO_APLICA / N/A si incluye al menos 15 caracteres de justificación técnica.
   */
  /**
   * Valida la sustancia de una lista de afirmaciones. Devuelve los reproches concretos,
   * no un booleano: quien recibe un rechazo necesita saber qué frase arreglar.
   * Admite NO_APLICA / N/A si incluye al menos 25 caracteres de justificación técnica causal
   * y delimita explícitamente el límite arquitectónico (sin tautologías).
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
      const matchNoAplica = t.match(/^(?:NO[-_ ]APLICA|N\/A)\b[:\s-]*(.*)/i);
      if (matchNoAplica) {
        const justificacion = matchNoAplica[1] ? matchNoAplica[1].trim() : '';
        if (justificacion.length < 25) {
          errores.push(`${etiqueta}[${i}] declara NO_APLICA pero carece de justificación técnica suficiente (mínimo 25 caracteres de razonamiento causal).`);
          return;
        }

        // Detección de justificaciones tautológicas o vacías
        const palabras = justificacion.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3);
        const FILLER = new Set(['no', 'aplica', 'porque', 'este', 'esta', 'para', 'nada', 'ningun', 'ninguna', 'aqui', 'todo', 'que', 'los', 'las', 'con', 'del', 'por', 'tiene', 'tienen', 'como', 'sobre', 'modulo']);
        const sustantivas = new Set(palabras.filter((w) => !FILLER.has(w)));
        if (sustantivas.size < 3) {
          errores.push(`${etiqueta}[${i}] contiene una justificación de NO_APLICA tautológica o vacía ("${justificacion}"). Se exige sustentar la exclusión técnica con vocabulario causal.`);
          return;
        }

        // Exigir declaración explícita del límite arquitectónico que excluye la superficie
        const BOUNDARY_PATTERNS = /(?:interno|interfaz|usuario|cli|ui|offline|batch|algoritmo|backend|solo lectura|aislado|red|privado|numerico|persistencia|estricto|sin|inmutable|local|fondo)/i;
        if (!BOUNDARY_PATTERNS.test(justificacion)) {
          errores.push(`${etiqueta}[${i}] declara NO_APLICA sin explicitar el límite arquitectónico que excluye la superficie (e.g. 'módulo interno sin UI ni CLI').`);
          return;
        }

        limpias.push(t);
        return;
      }
      if (t.length < MINIMO_SUSTANCIA) {
        errores.push(`${etiqueta}[${i}] tiene ${t.length} caracteres; se exigen ${MINIMO_SUSTANCIA} para que describa un riesgo y no una casilla marcada.`);
        return;
      }
      const distintas = new Set(t.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3));
      if (distintas.size < MINIMO_PALABRAS) {
        errores.push(`${etiqueta}[${i}] tiene ${distintas.size} palabra(s) distinta(s); se exigen ${MINIMO_PALABRAS}. Un riesgo se explica, no se rellena.`);
        return;
      }
      limpias.push(t);
    });
    return { errores, limpias };
  }

  static calculateBlastRadius(options = {}) {
    const files = Array.isArray(options.files) ? options.files : [];
    const count = files.length;

    // 1. Base por archivos
    let baseFiles = 0;
    if (count === 1) baseFiles = 10;
    else if (count >= 2 && count <= 3) baseFiles = 25;
    else if (count >= 4 && count <= 7) baseFiles = 40;
    else if (count >= 8) baseFiles = 50;
    else if (typeof options.baseScore === 'number') baseFiles = options.baseScore;

    // 2. Ponderación por criticidad (rutas críticas de gobernanza/infraestructura, no glob ciego)
    const defaultCriticalPatterns = [
      /^\.github\//i,
      /^policies\//i,
      /^bin\//i,
      /^tools\/(?:killswitch|attestation|preflight|repo_attestation_generator)\.js/i,
      /^schemas\//i,
    ];
    const criticalPatterns = Array.isArray(options.criticalPatterns)
      ? options.criticalPatterns
      : defaultCriticalPatterns;

    let hasCriticalInfra = false;
    let hasContractSchema = false;

    for (const f of files) {
      const normalized = String(f || '').replace(/\\/g, '/');
      if (criticalPatterns.some((pat) => (typeof pat.test === 'function' ? pat.test(normalized) : normalized.includes(String(pat))))) {
        hasCriticalInfra = true;
      }
      if (/schemas\/|\.axion\/state\//i.test(normalized)) {
        hasContractSchema = true;
      }
    }

    let criticalityScore = 0;
    if (hasCriticalInfra) criticalityScore = 30;
    else if (hasContractSchema) criticalityScore = 20;
    else if (typeof options.criticalityScore === 'number') criticalityScore = options.criticalityScore;

    // 3. Complejidad de interfaz
    let interfaceScore = 0;
    if (options.altersPublicInterface === true || options.altersCli === true) {
      interfaceScore = 15;
    } else if (typeof options.interfaceScore === 'number') {
      interfaceScore = options.interfaceScore;
    }

    // 4. Factor de reversibilidad
    let reversibilityScore = 0;
    if (options.isIrreversible === true || options.hasDataMigration === true) {
      reversibilityScore = 20;
    } else if (typeof options.reversibilityScore === 'number') {
      reversibilityScore = options.reversibilityScore;
    }

    const rawScore = baseFiles + criticalityScore + interfaceScore + reversibilityScore;
    const score = Math.min(100, Math.max(0, rawScore));

    let riskLevel = 'LOW';
    if (score >= 70) riskLevel = 'CRITICAL';
    else if (score >= 40) riskLevel = 'MODERATE';

    return {
      score,
      riskLevel,
      factors: {
        baseFiles,
        criticalityScore,
        interfaceScore,
        reversibilityScore,
      },
      filesCount: count,
      capped: rawScore > 100,
    };
  }


    /**
   * Obtiene la ruta del registro confiable de autoridades.
   */
  getRegistryPath(options = {}) {
    if (options.registryPath && fs.existsSync(options.registryPath)) {
      return options.registryPath;
    }
    const policiesReg = path.join(this.rootDir, 'policies', 'authorities.json');
    if (fs.existsSync(policiesReg)) return policiesReg;

    const keysReg = path.join(this.rootDir, '.axion', 'keys', 'authorities.json');
    if (fs.existsSync(keysReg)) return keysReg;

    const rootPoliciesReg = path.join(ROOT, 'policies', 'authorities.json');
    if (fs.existsSync(rootPoliciesReg)) return rootPoliciesReg;

    const rootKeysReg = path.join(ROOT, '.axion', 'keys', 'authorities.json');
    if (fs.existsSync(rootKeysReg)) return rootKeysReg;

    return null;
  }

  /**
   * Carga y valida el registro confiable de autoridades.
   */
  loadAuthorities(options = {}) {
    if (options.authorities && Array.isArray(options.authorities)) {
      return { ok: true, authorities: options.authorities };
    }
    const regPath = this.getRegistryPath(options);
    if (!regPath) {
      return {
        ok: false,
        reason: 'AUTHORITY_REGISTRY_UNAVAILABLE',
        message: 'No se encontró el registro confiable de autoridades (policies/authorities.json).'
      };
    }
    const loaded = loadAuthorityRegistry(regPath);
    if (!loaded.ok) {
      return {
        ok: false,
        reason: 'MALFORMED_AUTHORITY_REGISTRY',
        message: loaded.error ? loaded.error.message : 'Registro de autoridades malformado'
      };
    }

    // Verificación criptográfica obligatoria contra la raíz de gobernanza (Hallazgo 1)
    if (!options.skipRootSealCheck) {
      const sealPath = regPath.endsWith('.json')
        ? regPath.replace(/\.json$/, '.seal.json')
        : `${regPath}.seal.json`;

      if (!fs.existsSync(sealPath)) {
        return {
          ok: false,
          reason: 'UNSEALED_AUTHORITY_REGISTRY',
          message: `El registro de autoridades en "${regPath}" carece del sello criptográfico de gobernanza requerido (${path.basename(sealPath)} no encontrado).`,
        };
      }

      let sealObj;
      try {
        sealObj = JSON.parse(fs.readFileSync(sealPath, 'utf8'));
      } catch (sealErr) {
        return {
          ok: false,
          reason: 'MALFORMED_ROOT_SEAL',
          message: `El sello criptográfico "${sealPath}" está corrupto: ${sealErr.message}`,
        };
      }

      const sealRes = verifyRootSeal(loaded.registry, sealObj);
      if (!sealRes.valid) {
        return {
          ok: false,
          reason: sealRes.reason === 'EXPIRED_AUTHORITY_REGISTRY' ? 'EXPIRED_AUTHORITY_REGISTRY' : 'UNTRUSTED_REGISTRY_MODIFICATION',
          message: `El registro de autoridades en "${regPath}" no superó la verificación de la raíz de gobernanza: ${sealRes.message} (${sealRes.reason})`,
        };
      }

      // Verificación de versión monotónica anti-rollback (Hallazgo 5)
      const lockFile = path.resolve(this.stateDir, 'authority_version.lock');
      let lockedVer = 0;
      if (fs.existsSync(lockFile)) {
        try {
          lockedVer = parseInt(fs.readFileSync(lockFile, 'utf8').trim(), 10) || 0;
        } catch (_) {
          /* lockFile ausente o ilegible */
        }
      }
      const presentedVer = loaded.registry.monotonicVersion || 1;
      if (presentedVer < lockedVer) {
        return {
          ok: false,
          reason: 'POLICY_ROLLBACK_DETECTED',
          message: `Intento de rollback de registro de autoridades detectado. Versión presentada: ${presentedVer}, versión previa bloqueada: ${lockedVer}.`,
        };
      }
      if (presentedVer > lockedVer) {
        try {
          this.ensureStateDir();
          fs.writeFileSync(lockFile, String(presentedVer), 'utf8');
        } catch (_) {
          /* no se pudo persistir lockFile */
        }
      }
    }

    return { ok: true, authorities: loaded.registry.authorities, registryPath: regPath, registry: loaded.registry };
  }

  /**
   * Registra una aceptación deliberada y formal de riesgo fuera de banda.
   * El operador humano autentica la excepción para un entorno específico con vigencia acotada,
   * sellada criptográficamente con una clave privada Ed25519 preexistente inscrita en el
   * registro confiable de autoridades (policies/authorities.json) y vinculada al proposalDigest exacto (SHA-256 de 64 chars).
   */
  acceptRisk(options = {}) {
    // 1. Barrera contra ejecución autónoma por agentes (Hallazgo 2 y 3)
    if (process.env.AGENT_CONTEXT === 'true' || process.env.ANTIGRAVITY === 'true' || process.env.OPENCODE === 'true' || options.isAgentContext === true) {
      throw new Error('AGENT_INVOCATION_FORBIDDEN: accept-risk es una acción de gobernanza humana fuera de banda. Los agentes autónomos tienen prohibido invocar este comando.');
    }

    // Verificación de TTY interactiva física obligatoria (Hallazgo 3)
    const hasInteractiveTTY = Boolean(process.stdin && process.stdin.isTTY && process.stdout && process.stdout.isTTY);
    if (!hasInteractiveTTY && options.allowHeadlessForTest === false) {
      throw new Error('INTERACTIVE_HUMAN_TTY_REQUIRED: accept-risk exige ejecución en una terminal interactiva TTY física operada por un humano. Ejecuciones headless, subshells o subprocesos automatizados bloqueados fail-closed.');
    }

    const premortemIdRaw = texto(options.premortemId || options.id);
    const cleanId = premortemIdRaw.toLowerCase().trim();
    if (!cleanId || !/^[a-f0-9]{16,64}$/.test(cleanId)) {
      throw new Error(`INVALID_PREMORTEM_ID_FORMAT: premortemId debe ser una cadena hexadecimal de 16 a 64 caracteres. Recibido: ${JSON.stringify(premortemIdRaw)}`);
    }

    const operator = texto(options.operator);
    if (operator.length < 3) {
      throw new Error('operator es obligatorio y debe identificar al responsable humano (e.g. @adrian).');
    }
    const rationale = texto(options.rationale);
    if (rationale.length < 25) {
      throw new Error('rationale exige al menos 25 caracteres de justificación técnica vinculante.');
    }
    const validEnvs = ['development', 'staging', 'production'];
    const environment = (options.environment || options.env || 'development').toLowerCase().trim();
    if (!validEnvs.includes(environment)) {
      throw new Error(`environment inválido: "${environment}". Válidos: ${validEnvs.join(', ')}.`);
    }
    const allowedEnvironments = Array.isArray(options.allowedEnvironments) && options.allowedEnvironments.length > 0
      ? options.allowedEnvironments.map((e) => String(e).toLowerCase().trim())
      : [environment];
    for (const env of allowedEnvironments) {
      if (!validEnvs.includes(env)) {
        throw new Error(`allowedEnvironments contiene un entorno inválido: "${env}".`);
      }
    }

    // Prohibición estricta de aceptar riesgos en producción por el flujo local (Hallazgo 2)
    if (environment === 'production' || allowedEnvironments.includes('production')) {
      throw new Error('PRODUCTION_RISK_ACCEPTANCE_FORBIDDEN: La aceptación de riesgo para el entorno "production" no puede ser creada mediante este comando local; exige el protocolo break-glass de gobernanza multi-firma.');
    }

    const ttlHours = Number.isFinite(options.ttlHours) && options.ttlHours > 0 ? options.ttlHours : 24;

    // Vinculación estricta con la propuesta exacta: SHA-256 de 64 hex chars (Hallazgo 2)
    let proposalDigest = null;
    let scopeHash = options.scopeHash ? texto(options.scopeHash) : null;
    let mitigationsHash = options.mitigationsHash ? texto(options.mitigationsHash) : null;

    if (options.payload && typeof options.payload === 'object') {
      const cleanPayload = { ...options.payload };
      delete cleanPayload.human_risk_acceptance;
      delete cleanPayload.authenticatedRiskAcceptance;
      proposalDigest = hashCanonical(cleanPayload);
      if (cleanPayload.scope) {
        scopeHash = hashCanonical(cleanPayload.scope);
      }
      if (cleanPayload.mandatory_mitigations) {
        mitigationsHash = hashCanonical(cleanPayload.mandatory_mitigations);
      }
    } else if (options.proposalDigest) {
      proposalDigest = texto(options.proposalDigest).toLowerCase().trim();
    } else if (cleanId.length === 64) {
      proposalDigest = cleanId;
    }

    if (!proposalDigest || !/^[a-f0-9]{64}$/.test(proposalDigest)) {
      throw new Error(`INVALID_PROPOSAL_DIGEST_FORMAT: proposalDigest debe ser un SHA-256 completo de 64 caracteres hexadecimales. Recibido: ${JSON.stringify(proposalDigest)}`);
    }

    // Validación de custodia de clave privada fuera del workspace (Hallazgo 2)
    if (options.privateKeyPath || (typeof options.key === 'string' && fs.existsSync(options.key))) {
      const keyFilePath = path.resolve(options.privateKeyPath || options.key);
      const wsRoot = path.resolve(this.rootDir);
      const globalRoot = path.resolve(ROOT);
      if ((keyFilePath.startsWith(wsRoot + path.sep) || keyFilePath.startsWith(globalRoot + path.sep)) && !options.allowTestKeyInWorkspace) {
        throw new Error(`WORKSPACE_PRIVATE_KEY_FORBIDDEN: La clave privada de autoridad humana no puede residir dentro del repositorio/workspace (${keyFilePath}). Las claves deben custodiarse fuera del workspace (ej. en ~/.axion/keys/human/).`);
      }
    }

    let privateKeyObj;
    if (options.privateKey) {
      privateKeyObj = options.privateKey instanceof crypto.KeyObject && options.privateKey.type === 'private'
        ? options.privateKey
        : crypto.createPrivateKey(options.privateKey);
    } else if (options.privateKeyPath) {
      if (!fs.existsSync(options.privateKeyPath)) {
        throw new Error(`MISSING_ED25519_PRIVATE_KEY: El archivo de clave privada especificado "${options.privateKeyPath}" no existe.`);
      }
      privateKeyObj = crypto.createPrivateKey(fs.readFileSync(options.privateKeyPath, 'utf8'));
    } else if (options.key) {
      const rawKey = typeof options.key === 'string' && fs.existsSync(options.key)
        ? fs.readFileSync(options.key, 'utf8')
        : options.key;
      privateKeyObj = crypto.createPrivateKey(rawKey);
    } else if (process.env.AXION_OPERATOR_PRIVATE_KEY) {
      privateKeyObj = crypto.createPrivateKey(process.env.AXION_OPERATOR_PRIVATE_KEY);
    } else {
      throw new Error('MISSING_ED25519_PRIVATE_KEY: acceptRisk exige una clave privada Ed25519 preexistente (--key, privateKey o privateKeyPath) custodiada fuera de banda.');
    }

    if (privateKeyObj.asymmetricKeyType !== 'ed25519') {
      throw new TypeError('La clave privada del operador debe ser de tipo Ed25519.');
    }

    const pubKeyObj = crypto.createPublicKey(privateKeyObj);
    const publicKeyPem = pubKeyObj.export({ type: 'spki', format: 'pem' });
    const keyId = computePublicKeyId(pubKeyObj);

    // Validación de autoridad contra registro confiable (Hallazgo 1 y 3)
    const authRes = this.loadAuthorities(options);
    if (!authRes.ok) {
      throw new Error(`AUTHORITY_REGISTRY_ERROR: ${authRes.message}`);
    }
    const authority = authRes.authorities.find((a) => a && a.keyId === keyId);
    if (!authority) {
      throw new Error(`UNTRUSTED_KEY_ID: La clave "${keyId}" no está registrada en ${authRes.registryPath || 'authorities.json'}.`);
    }
    if (authority.status === 'REVOKED') {
      throw new Error(`REVOKED_AUTHORITY: La autoridad "${authority.actorId}" está revocada.`);
    }
    if (authority.status === 'COMPROMISED') {
      throw new Error(`COMPROMISED_KEY: La clave de la autoridad "${authority.actorId}" está comprometida.`);
    }
    if (authority.status !== 'TRUSTED') {
      throw new Error(`REVOKED_OR_UNTRUSTED_AUTHORITY: La autoridad "${authority.actorId}" tiene estado "${authority.status}".`);
    }
    if (!Array.isArray(authority.roles) || !authority.roles.includes('HUMAN_AUTHORITY')) {
      throw new Error(`UNAUTHORIZED_ROLE: La autoridad "${authority.actorId}" carece del rol HUMAN_AUTHORITY.`);
    }
    if (authority.actorId !== operator) {
      throw new Error(`OPERATOR_IDENTITY_MISMATCH: El operador declarado "${operator}" no coincide con la autoridad "${authority.actorId}".`);
    }

    const nowAccept = options.now ? new Date(options.now) : new Date();
    if (new Date(authority.expiresAt).getTime() <= nowAccept.getTime()) {
      throw new Error(`AUTHORITY_EXPIRED: La credencial de la autoridad "${authority.actorId}" expiró en ${authority.expiresAt}.`);
    }

    // Validación de ámbitos de entorno y nivel de riesgo (Hallazgo 3)
    if (authority.allowedEnvironments && Array.isArray(authority.allowedEnvironments)) {
      const invalidEnvs = allowedEnvironments.filter((env) => !authority.allowedEnvironments.includes(env));
      if (invalidEnvs.length > 0) {
        throw new Error(`UNAUTHORIZED_ENVIRONMENT: La autoridad "${authority.actorId}" solo está autorizada para [ ${authority.allowedEnvironments.join(', ')} ], pero se solicitaron [ ${invalidEnvs.join(', ')} ].`);
      }
    }
    if (authority.allowedRiskLevels && Array.isArray(authority.allowedRiskLevels) && options.riskLevel) {
      const upperRisk = String(options.riskLevel).toUpperCase().trim();
      if (!authority.allowedRiskLevels.includes(upperRisk)) {
        throw new Error(`UNAUTHORIZED_RISK_LEVEL: La autoridad "${authority.actorId}" solo está autorizada para niveles de riesgo [ ${authority.allowedRiskLevels.join(', ')} ], pero se solicitó "${upperRisk}".`);
      }
    }

    const unsignedRecord = {
      contractVersion: '2.0.0',
      acceptanceId: crypto.randomBytes(8).toString('hex'),
      premortemId: cleanId,
      proposalDigest,
      scopeHash,
      mitigationsHash,
      operator,
      keyId,
      publicKeyPem,
      environment,
      allowedEnvironments,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + ttlHours * 3600 * 1000).toISOString(),
      nonce: crypto.randomBytes(16).toString('hex'),
      rationale,
    };

    const canonicalPayload = canonicalize(unsignedRecord);
    const signature = crypto.sign(null, Buffer.from(canonicalPayload, 'utf8'), privateKeyObj).toString('base64');

    const envelope = {
      ...unsignedRecord,
      algorithm: 'Ed25519',
      signature,
    };

    // Confinamiento de ruta y protección anti-symlink TOCTOU-safe (Hallazgo 3 y 4)
    this.ensureStateDir();
    const resolvedStateDir = path.resolve(this.stateDir);
    const targetFile = path.resolve(resolvedStateDir, `risk-acceptance-${cleanId}.json`);

    if (!targetFile.startsWith(resolvedStateDir + path.sep)) {
      throw new Error(`PATH_TRAVERSAL_DETECTED: La ruta resultante escapa de ${resolvedStateDir}`);
    }

    // Inmutabilidad estricta: prohibición de sobrescritura silenciosa (Hallazgo 4)
    if (fs.existsSync(targetFile) && !options.allowOverwriteForTest) {
      throw new Error(`ACCEPTANCE_ALREADY_EXISTS: Ya existe una aceptación de riesgo para la propuesta "${cleanId}". Los registros son inmutables y no pueden sobrescribirse silenciosamente. Para invalidar una autorización previa se requiere revocación formal.`);
    }

    // Escritura atómica exclusiva
    const tmpFile = path.join(resolvedStateDir, `.tmp-risk-${cleanId}-${process.pid}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.json`);
    const fd = fs.openSync(tmpFile, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL, 0o600);
    try {
      fs.writeFileSync(fd, JSON.stringify(envelope, null, 2), 'utf8');
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(tmpFile, targetFile);

    // Verificación post-escritura inmediata
    const stat = fs.lstatSync(targetFile);
    if (stat.isSymbolicLink()) {
      try {
        fs.unlinkSync(targetFile);
      } catch (unlinkErr) {
        // Ignorar fallo de desvinculación si el archivo ya fue purgado por el sistema de archivos
      }
      throw new Error(`SYMLINK_DETECTED: El archivo ${targetFile} es un enlace simbólico no confiable.`);
    }

    // Registro append-only hash-chained en el libro de eventos de aceptación de riesgo (Hallazgo 4)
    this.appendToLedger('RISK_ACCEPTED', unsignedRecord, privateKeyObj);

    // Copia histórica archivada con timestamp para auditoría (Hallazgo 4)
    const historyDir = path.resolve(resolvedStateDir, 'risk-acceptances');
    if (!fs.existsSync(historyDir)) {
      try {
        fs.mkdirSync(historyDir, { recursive: true });
      } catch (mkdirErr) {
        // Ignorar si el directorio histórico ya fue creado concurrentemente
      }
    }
    const historyFile = path.resolve(historyDir, `acceptance-${cleanId}-${Date.now()}.json`);
    try {
      fs.writeFileSync(historyFile, JSON.stringify(envelope, null, 2), 'utf8');
    } catch (histErr) {
      // Preservar targetFile primario si la copia histórica falla
    }

    return { pass: true, record: envelope, targetFile, keyId };
  }

  /**
   * Revoca formalmente una aceptación de riesgo previa (Hallazgo 4).
   * Exige la firma de una autoridad humana registrada con rol HUMAN_AUTHORITY.
   */
  /**
   * Registra una entrada append-only en el libro de eventos con encadenamiento de hashes (Hallazgo 4).
   */
  appendToLedger(eventType, record, privateKeyObj) {
    this.ensureStateDir();
    const resolvedStateDir = path.resolve(this.stateDir);
    const ledgerFile = path.resolve(resolvedStateDir, 'risk-acceptance-ledger.jsonl');

    let lines = [];
    if (fs.existsSync(ledgerFile)) {
      try {
        lines = fs.readFileSync(ledgerFile, 'utf8').trim().split('\n').filter(Boolean);
      } catch (_) {
        /* ledger ausente o no legible */
      }
    }

    let parentHash = '0'.repeat(64);
    const index = lines.length;
    if (index > 0) {
      try {
        const prev = JSON.parse(lines[index - 1]);
        parentHash = prev.entryHash || hashCanonical(prev);
      } catch (_) {
        /* entrada previa malformada */
      }
    }

    const entryPayload = {
      index,
      event: eventType,
      timestamp: new Date().toISOString(),
      premortemId: record.premortemId,
      proposalDigest: record.proposalDigest,
      operator: record.operator,
      keyId: record.keyId,
      parentHash,
    };
    const entryHash = hashCanonical(entryPayload);
    const signature = crypto.sign(null, Buffer.from(entryHash, 'utf8'), privateKeyObj).toString('base64');

    const entry = {
      ...entryPayload,
      entryHash,
      signature,
    };

    fs.appendFileSync(ledgerFile, JSON.stringify(entry) + '\n', 'utf8');

    try {
      const extDir = path.join(require('os').homedir(), '.axion', 'state');
      fs.mkdirSync(extDir, { recursive: true });
      fs.writeFileSync(path.join(extDir, 'ledger.head'), entryHash, 'utf8');
    } catch (_) {
      /* almacén externo de head no disponible */
    }

    return entry;
  }

  /**
   * Verifica la integridad criptográfica de la cadena de hashes del ledger (Hallazgo 4).
   */
  static verifyLedgerIntegrity(ledgerPath, options = {}) {
    const p = path.resolve(ledgerPath);
    if (!fs.existsSync(p)) {
      return { valid: true, count: 0 };
    }

    let lines;
    try {
      lines = fs.readFileSync(p, 'utf8').trim().split('\n').filter(Boolean);
    } catch (e) {
      return { valid: false, reason: 'UNREADABLE_LEDGER', message: e.message };
    }

    if (lines.length === 0) return { valid: true, count: 0 };

    let expectedParentHash = '0'.repeat(64);
    let lastEntryHash = null;

    for (let i = 0; i < lines.length; i++) {
      let entry;
      try {
        entry = JSON.parse(lines[i]);
      } catch (e) {
        return { valid: false, reason: 'CORRUPTED_LEDGER_LINE', index: i };
      }

      if (entry.index !== i) {
        return { valid: false, reason: 'LEDGER_INDEX_MISMATCH', expectedIndex: i, actualIndex: entry.index };
      }

      if (entry.parentHash !== expectedParentHash) {
        return {
          valid: false,
          reason: 'LEDGER_CHAIN_CORRUPTED',
          index: i,
          expectedParentHash,
          actualParentHash: entry.parentHash,
        };
      }

      const payload = {
        index: entry.index,
        event: entry.event,
        timestamp: entry.timestamp,
        premortemId: entry.premortemId,
        proposalDigest: entry.proposalDigest,
        operator: entry.operator,
        keyId: entry.keyId,
        parentHash: entry.parentHash,
      };

      const computedHash = hashCanonical(payload);
      if (entry.entryHash !== computedHash) {
        return {
          valid: false,
          reason: 'LEDGER_HASH_TAMPERED',
          index: i,
          expectedHash: computedHash,
          actualHash: entry.entryHash,
        };
      }

      expectedParentHash = entry.entryHash;
      lastEntryHash = entry.entryHash;
    }

    const isMainRepo = p.startsWith(path.resolve(ROOT));
    const extHeadFile = options.externalHeadFile || (isMainRepo ? path.join(require('os').homedir(), '.axion', 'state', 'ledger.head') : null);
    if (extHeadFile && fs.existsSync(extHeadFile) && !options.skipExternalHeadCheck) {
      try {
        const extHead = fs.readFileSync(extHeadFile, 'utf8').trim();
        if (extHead && lastEntryHash && extHead !== lastEntryHash) {
          return {
            valid: false,
            reason: 'LEDGER_TRUNCATION_DETECTED',
            message: `El head del ledger local ("${lastEntryHash}") no coincide con el head registrado externamente ("${extHead}"). Truncamiento o reescritura detectada.`,
            expectedHead: extHead,
            actualHead: lastEntryHash,
          };
        }
      } catch (_) {
        /* error leyendo head externo */
      }
    }

    return { valid: true, count: lines.length, headHash: lastEntryHash };
  }

  revokeRisk(options = {}) {
    const premortemIdRaw = texto(options.premortemId || options.id);
    const cleanId = premortemIdRaw.toLowerCase().trim();
    if (!cleanId || !/^[a-f0-9]{16,64}$/.test(cleanId)) {
      throw new Error('INVALID_PREMORTEM_ID_FORMAT: premortemId inválido.');
    }
    const operator = texto(options.operator);
    const rationale = texto(options.rationale || 'Revocación formal de aceptación de riesgo');

    let privateKeyObj;
    if (options.privateKey) {
      privateKeyObj = options.privateKey instanceof crypto.KeyObject && options.privateKey.type === 'private'
        ? options.privateKey
        : crypto.createPrivateKey(options.privateKey);
    } else if (options.key) {
      const rawKey = typeof options.key === 'string' && fs.existsSync(options.key)
        ? fs.readFileSync(options.key, 'utf8')
        : options.key;
      privateKeyObj = crypto.createPrivateKey(rawKey);
    } else {
      throw new Error('MISSING_ED25519_PRIVATE_KEY: revokeRisk exige una clave privada Ed25519 preexistente.');
    }

    const pubKeyObj = crypto.createPublicKey(privateKeyObj);
    const keyId = computePublicKeyId(pubKeyObj);

    const authRes = this.loadAuthorities(options);
    if (!authRes.ok) throw new Error(`AUTHORITY_REGISTRY_ERROR: ${authRes.message}`);
    const authority = authRes.authorities.find((a) => a && a.keyId === keyId);
    if (!authority || authority.status !== 'TRUSTED' || !Array.isArray(authority.roles) || !authority.roles.includes('HUMAN_AUTHORITY')) {
      throw new Error('UNAUTHORIZED_REVOCATION_AUTHORITY: La revocación debe ser firmada por una autoridad confiable con rol HUMAN_AUTHORITY.');
    }

    const revocationRecord = {
      contractVersion: '2.0.0',
      event: 'RISK_REVOCATION',
      revocationId: crypto.randomBytes(8).toString('hex'),
      premortemId: cleanId,
      operator,
      keyId,
      rationale,
      revokedAt: new Date().toISOString(),
      nonce: crypto.randomBytes(16).toString('hex'),
    };

    const canonicalPayload = canonicalize(revocationRecord);
    const signature = crypto.sign(null, Buffer.from(canonicalPayload, 'utf8'), privateKeyObj).toString('base64');
    const envelope = { ...revocationRecord, algorithm: 'Ed25519', signature };

    this.ensureStateDir();
    const resolvedStateDir = path.resolve(this.stateDir);
    const revFile = path.resolve(resolvedStateDir, `risk-revocation-${cleanId}.json`);
    fs.writeFileSync(revFile, JSON.stringify(envelope, null, 2), 'utf8');

    const ledgerFile = path.resolve(resolvedStateDir, 'risk-acceptance-ledger.jsonl');
    try {
      fs.appendFileSync(ledgerFile, JSON.stringify(envelope) + '\n', 'utf8');
    } catch (ledgerErr) {
      // Ignorar fallo de escritura secundaria en ledger si el sistema de archivos está restringido
    }

    return { success: true, revocationFile: revFile, record: envelope };
  }

  /**
   * Carga y valida la autenticidad e integridad de una aceptación de riesgo fuera de banda.
   * Verifica la firma asimétrica Ed25519 contra la clave pública del registro confiable de autoridades,
   * valida igualdad estricta de 64 chars de proposalDigest, y elimina ventanas de carrera anti-symlink.
   */
  loadRiskAcceptance(premortemId, options = {}, actualProposalDigest = null) {
    let rec = null;
    let targetFile = null;

    if (options.authenticatedRiskAcceptance && typeof options.authenticatedRiskAcceptance === 'object') {
      rec = options.authenticatedRiskAcceptance;
    } else {
      if (!premortemId || typeof premortemId !== 'string') return null;
      const cleanId = premortemId.trim().toLowerCase();
      if (!/^[a-f0-9]{16,64}$/.test(cleanId)) {
        return { valid: false, reason: 'INVALID_PREMORTEM_ID_FORMAT' };
      }

      const resolvedStateDir = path.resolve(this.stateDir);
      targetFile = path.resolve(resolvedStateDir, `risk-acceptance-${cleanId}.json`);

      if (!targetFile.startsWith(resolvedStateDir + path.sep)) {
        return { valid: false, reason: 'PATH_TRAVERSAL_DETECTED' };
      }

      if (!fs.existsSync(targetFile)) return null;

      // Doble inspección pre y post lectura para prevenir carreras TOCTOU
      let statBefore;
      try {
        statBefore = fs.lstatSync(targetFile);
      } catch (_) {
        return { valid: false, reason: 'UNREADABLE_RISK_ACCEPTANCE' };
      }

      if (statBefore.isSymbolicLink() || !statBefore.isFile()) {
        return { valid: false, reason: 'SYMLINK_DETECTED' };
      }

      let rawContent;
      try {
        rawContent = fs.readFileSync(targetFile, 'utf8');
      } catch (_) {
        return { valid: false, reason: 'MALFORMED_RISK_ACCEPTANCE' };
      }

      let statAfter;
      try {
        statAfter = fs.lstatSync(targetFile);
      } catch (_) {
        return { valid: false, reason: 'SYMLINK_DETECTED' };
      }

      if (statAfter.isSymbolicLink() || statBefore.ino !== statAfter.ino || statBefore.mtimeMs !== statAfter.mtimeMs) {
        return { valid: false, reason: 'SYMLINK_DETECTED', message: 'Archivo modificado o sustituido concurrentemente durante la lectura.' };
      }

      try {
        rec = JSON.parse(rawContent);
      } catch (_) {
        return { valid: false, reason: 'MALFORMED_RISK_ACCEPTANCE' };
      }
    }

    if (!rec || typeof rec !== 'object') {
      return { valid: false, reason: 'INVALID_RISK_ACCEPTANCE_FORMAT' };
    }

    // -1. Comprobación de integridad del ledger histórico (Hallazgo 4)
    if (targetFile) {
      const resolvedDir = path.dirname(targetFile);
      const ledgerFile = path.resolve(resolvedDir, 'risk-acceptance-ledger.jsonl');
      if (fs.existsSync(ledgerFile) && !options.skipLedgerCheck) {
        const ledgerRes = PreMortemEngine.verifyLedgerIntegrity(ledgerFile);
        if (!ledgerRes.valid) {
          return {
            valid: false,
            reason: ledgerRes.reason,
            message: `El ledger histórico de aceptaciones de riesgo fue alterado o truncado (${ledgerRes.reason}).`,
            record: rec,
          };
        }
      }
    }

    // 0. Comprobación de revocación formal (Hallazgo 4)
    const targetId = rec.premortemId || (premortemId ? String(premortemId).trim().toLowerCase() : '');
    if (targetFile && targetId) {
      const resolvedStateDir = path.dirname(targetFile);
      const revFile = path.resolve(resolvedStateDir, `risk-revocation-${targetId}.json`);
      if (fs.existsSync(revFile)) {
        try {
          const revRaw = fs.readFileSync(revFile, 'utf8');
          const revEnv = JSON.parse(revRaw);
          return {
            valid: false,
            reason: 'RISK_ACCEPTANCE_REVOKED',
            message: `La aceptación de riesgo para "${targetId}" fue revocada formalmente por "${revEnv.operator}": ${revEnv.rationale}`,
            record: rec,
          };
        } catch (revReadErr) {
          // Ignorar si el archivo de revocación está temporalmente inaccesible o malformado
        }
      }
    }

    // 1. Verificación de algoritmo y firma Ed25519
    if (rec.algorithm !== 'Ed25519' || typeof rec.signature !== 'string' || !rec.signature) {
      return {
        valid: false,
        reason: 'INVALID_ED25519_SIGNATURE',
        message: 'Firma asimétrica Ed25519 ausente o inválida en el registro de riesgo.',
        record: rec,
      };
    }

    if (typeof rec.keyId !== 'string' || !rec.keyId) {
      return {
        valid: false,
        reason: 'INVALID_ED25519_SIGNATURE',
        message: 'keyId es obligatorio en el registro de aceptación.',
        record: rec,
      };
    }

    // 2. Validación de propuesta con igualdad estricta SHA-256 de 64 caracteres (Hallazgo 2)
    if (!rec.proposalDigest || typeof rec.proposalDigest !== 'string' || !/^[a-f0-9]{64}$/.test(rec.proposalDigest)) {
      return {
        valid: false,
        reason: 'INVALID_PROPOSAL_DIGEST_FORMAT',
        expected: '64 hex chars',
        found: rec.proposalDigest,
        record: rec,
      };
    }

    if (actualProposalDigest) {
      if (!/^[a-f0-9]{64}$/.test(actualProposalDigest)) {
        return {
          valid: false,
          reason: 'INVALID_PROPOSAL_DIGEST_FORMAT',
          expected: '64 hex chars',
          found: actualProposalDigest,
          record: rec,
        };
      }
      if (rec.proposalDigest !== actualProposalDigest) {
        return {
          valid: false,
          reason: 'PROPOSAL_DIGEST_MISMATCH',
          expected: actualProposalDigest,
          found: rec.proposalDigest,
          record: rec,
        };
      }
    }

    // 3. Autenticación de autoridad contra el registro confiable (Hallazgo 1)
    const authRes = this.loadAuthorities(options);
    if (!authRes.ok) {
      return { valid: false, reason: 'AUTHORITY_REGISTRY_UNAVAILABLE', message: authRes.message, record: rec };
    }

    const authority = authRes.authorities.find((a) => a && a.keyId === rec.keyId);
    if (!authority) {
      return {
        valid: false,
        reason: 'UNTRUSTED_KEY_ID',
        message: `La clave "${rec.keyId}" no existe en el registro confiable de autoridades.`,
        record: rec,
      };
    }

    if (authority.status === 'REVOKED') {
      return {
        valid: false,
        reason: 'REVOKED_AUTHORITY',
        message: `La autoridad "${authority.actorId}" está revocada.`,
        record: rec,
      };
    }

    if (authority.status === 'COMPROMISED') {
      return {
        valid: false,
        reason: 'COMPROMISED_KEY',
        message: `La clave de la autoridad "${authority.actorId}" está marcada como comprometida.`,
        record: rec,
      };
    }

    if (authority.status !== 'TRUSTED') {
      return {
        valid: false,
        reason: 'REVOKED_OR_UNTRUSTED_AUTHORITY',
        message: `La autoridad "${authority.actorId}" tiene estado no confiable "${authority.status}".`,
        record: rec,
      };
    }

    if (!Array.isArray(authority.roles) || !authority.roles.includes('HUMAN_AUTHORITY')) {
      return {
        valid: false,
        reason: 'UNAUTHORIZED_ROLE',
        message: `La autoridad "${authority.actorId}" carece del rol HUMAN_AUTHORITY.`,
        record: rec,
      };
    }

    if (authority.actorId !== rec.operator) {
      return {
        valid: false,
        reason: 'OPERATOR_IDENTITY_MISMATCH',
        message: `El operador declarado "${rec.operator}" no coincide con el actor registrado "${authority.actorId}".`,
        record: rec,
      };
    }

    const now = options.now ? new Date(options.now) : new Date();
    if (new Date(authority.expiresAt).getTime() <= now.getTime()) {
      return {
        valid: false,
        reason: 'AUTHORITY_EXPIRED',
        message: `La credencial de la autoridad "${authority.actorId}" expiró en ${authority.expiresAt}.`,
        record: rec,
      };
    }

    // Validación de ámbito de entornos autorizados para la autoridad (Hallazgo 3)
    if (authority.allowedEnvironments && Array.isArray(authority.allowedEnvironments)) {
      const allowedRec = Array.isArray(rec.allowedEnvironments) ? rec.allowedEnvironments : [rec.environment];
      const invalidEnvs = allowedRec.filter((env) => !authority.allowedEnvironments.includes(env));
      if (invalidEnvs.length > 0) {
        return {
          valid: false,
          reason: 'UNAUTHORIZED_ENVIRONMENT',
          message: `La autoridad "${authority.actorId}" solo está autorizada para [ ${authority.allowedEnvironments.join(', ')} ], pero la aceptación solicita [ ${invalidEnvs.join(', ')} ].`,
          record: rec,
        };
      }
    }

    // Validación de ámbito de nivel de riesgo para la autoridad (Hallazgo 3)
    const effectiveRiskLevel = (options.riskLevel || (options.payload && options.payload.risk) || (options.blastRadius >= 70 ? 'CRITICAL' : null) || 'MEDIUM').toUpperCase().trim();
    if (authority.allowedRiskLevels && Array.isArray(authority.allowedRiskLevels)) {
      if (!authority.allowedRiskLevels.includes(effectiveRiskLevel)) {
        return {
          valid: false,
          reason: 'UNAUTHORIZED_RISK_LEVEL',
          message: `El nivel de riesgo "${effectiveRiskLevel}" supera el alcance autorizado para la autoridad "${authority.actorId}" (permitidos: [ ${authority.allowedRiskLevels.join(', ')} ]).`,
          record: rec,
        };
      }
    }

    // Raíz de confianza: la clave pública se extrae del registro de autoridades, NUNCA del envelope
    let pubKey;
    try {
      pubKey = asEd25519PublicKey(authority.publicKeyPem);
      const computedKeyId = computePublicKeyId(pubKey);
      if (computedKeyId !== authority.keyId) {
        return { valid: false, reason: 'MALFORMED_AUTHORITY_REGISTRY', record: rec };
      }
    } catch (e) {
      return { valid: false, reason: 'INVALID_AUTHORITY_PUBLIC_KEY', message: e.message, record: rec };
    }

    // 4. Verificación matemática de la firma
    const unsignedRecord = { ...rec };
    delete unsignedRecord.algorithm;
    delete unsignedRecord.signature;
    delete unsignedRecord.digest;

    let validSig = false;
    try {
      validSig = crypto.verify(
        null,
        Buffer.from(canonicalize(unsignedRecord), 'utf8'),
        pubKey,
        Buffer.from(rec.signature, 'base64')
      );
    } catch (_) {
      validSig = false;
    }

    if (!validSig) {
      return { valid: false, reason: 'INVALID_ED25519_SIGNATURE', record: rec };
    }

    // 5. Comprobación de TTL de la aceptación
    if (now > new Date(rec.expiresAt)) {
      return { valid: false, reason: 'RISK_ACCEPTANCE_EXPIRED', record: rec };
    }

    // 6. Comprobación de entorno
    const currentEnv = (options.environment || process.env.AXION_ENV || process.env.NODE_ENV || 'development').toLowerCase().trim();
    const allowed = Array.isArray(rec.allowedEnvironments) ? rec.allowedEnvironments : [rec.environment];
    if (!allowed.includes(currentEnv)) {
      return {
        valid: false,
        reason: 'ENVIRONMENT_MISMATCH',
        currentEnvironment: currentEnv,
        allowedEnvironments: allowed,
        record: rec,
      };
    }

    return { valid: true, currentEnvironment: currentEnv, record: rec, authority };
  }

  evaluateAssessment(payload, options = {}) {
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
    let totalNoAplica = 0;

    if (anchors) {
      for (const clave of CLAVES_ANCLA) {
        const { errores, limpias } = PreMortemEngine.validarLista(anchors[clave], `anchors.${clave}`, 1);
        errors.push(...errores);
        riesgosPorAncla[clave] = limpias;
        if (limpias.some((r) => /^(?:NO[-_ ]APLICA|N\/A)\b/i.test(r))) {
          totalNoAplica += 1;
        }
      }
    } else {
      const { errores } = PreMortemEngine.validarLista(payload.failure_hypotheses, 'failure_hypotheses', 3);
      errors.push(...errores);
    }

    // Prohibición estricta de NO_APLICA en anclas críticas cuando el cambio toca gobernanza, seguridad o datos
    const securityHasNoAplica = (riesgosPorAncla.security || []).some((r) => /^(?:NO[-_ ]APLICA|N\/A)\b/i.test(r));
    if (securityHasNoAplica) {
      const isCritical = Boolean(
        options.isCritical
        || (Array.isArray(payload.files) && payload.files.some((f) => /^\.github\/|^policies\/|^bin\/|^auth\/|^schemas\/|^tools\/(?:killswitch|attestation|preflight|repo_attestation_generator)\.js/i.test(String(f).replace(/\\/g, '/'))))
        || /(?:auth|autentic|seguridad|security|crypto|cripto|token|clave|credencial|migrac|database|base de datos|producc|root|governan|gobernanz)/i.test(texto(payload.feature_name))
      );
      if (isCritical) {
        errors.push('El ancla security no puede declararse NO_APLICA en una propuesta que impacta infraestructura, gobernanza, seguridad o datos persistentes.');
      }
    }

    // Prohibición de NO_APLICA excesivo (máximo 2 anclas)
    if (totalNoAplica >= 3) {
      errors.push(`Se declara NO_APLICA en ${totalNoAplica} anclas. Toda propuesta debe contener análisis sustantivo de al menos 2 dimensiones.`);
    }

    // El mismo riesgo pegado en las cuatro anclas simula cobertura sin darla: cuatro
    // dimensiones que dicen lo mismo son una sola dimensión repetida cuatro veces.
    const vistos = new Map();
    for (const clave of CLAVES_ANCLA) {
      for (const r of riesgosPorAncla[clave] || []) {
        if (/^(?:NO[-_ ]APLICA|N\/A)\b/i.test(r)) continue;
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

    const calco = this.detectarCalco(payload);
    if (calco) {
      return {
        status: 'DENIED',
        reason: 'PREMORTEM_BOILERPLATE',
        exitCode: 1,
        errors: [
          `${calco.repetidas} de ${calco.total} frases son idénticas a las del pre-mortem ${calco.premortem_id} `
          + `("${calco.feature_name}"). Una autopsia reciclada certifica que se pensó sin que nadie haya pensado: `
          + 'los riesgos de esta característica son los suyos, no los de la anterior.',
        ],
        duplicateOf: calco.premortem_id,
      };
    }

    const cleanPayload = { ...payload };
    delete cleanPayload.human_risk_acceptance;
    delete cleanPayload.authenticatedRiskAcceptance;
    const digest = hashCanonical(cleanPayload);
    const premortemId = digest.slice(0, 16);

    // --- Aceptación de riesgo autenticada fuera de banda ---
    const authAcceptance = this.loadRiskAcceptance(premortemId, options, digest);

    // Si existe una aceptación registrada pero no es válida para esta ejecución:
    if (authAcceptance && !authAcceptance.valid) {
      if (authAcceptance.reason === 'ENVIRONMENT_MISMATCH') {
        return {
          status: 'DENIED',
          reason: 'ENVIRONMENT_MISMATCH',
          exitCode: 2,
          errors: [
            `El riesgo fue aceptado exclusivamente para [${authAcceptance.allowedEnvironments.join(', ')}], pero el entorno actual es [${authAcceptance.currentEnvironment}]. Bloqueado para despliegue.`,
          ],
        };
      }
      if (authAcceptance.reason === 'UNTRUSTED_REGISTRY_MODIFICATION' || authAcceptance.reason === 'UNSEALED_AUTHORITY_REGISTRY' || authAcceptance.reason === 'MALFORMED_ROOT_SEAL') {
        return {
          status: 'DENIED',
          reason: authAcceptance.reason,
          exitCode: 1,
          errors: [
            `El registro de autoridades fue alterado o carece de un sello criptográfico válido de la raíz de gobernanza (${authAcceptance.message || authAcceptance.reason}).`,
          ],
        };
      }
      if (authAcceptance.reason === 'REVOKED_AUTHORITY' || authAcceptance.reason === 'COMPROMISED_KEY') {
        return {
          status: 'DENIED',
          reason: authAcceptance.reason,
          exitCode: 1,
          errors: [
            `La credencial de la autoridad humana fue revocada o comprometida (${authAcceptance.message || authAcceptance.reason}).`,
          ],
        };
      }
      if (authAcceptance.reason === 'UNAUTHORIZED_ENVIRONMENT') {
        return {
          status: 'DENIED',
          reason: 'UNAUTHORIZED_ENVIRONMENT',
          exitCode: 2,
          errors: [
            `El entorno no está autorizado para la autoridad firmante (${authAcceptance.message}).`,
          ],
        };
      }
      if (authAcceptance.reason === 'POLICY_ROLLBACK_DETECTED' || authAcceptance.reason === 'EXPIRED_AUTHORITY_REGISTRY') {
        return {
          status: 'DENIED',
          reason: authAcceptance.reason,
          exitCode: 1,
          errors: [
            `El registro de autoridades fue rechazado por frescura o anti-rollback (${authAcceptance.message || authAcceptance.reason}).`,
          ],
        };
      }
      if (authAcceptance.reason === 'LEDGER_CHAIN_CORRUPTED' || authAcceptance.reason === 'LEDGER_TRUNCATION_DETECTED' || authAcceptance.reason === 'LEDGER_HASH_TAMPERED') {
        return {
          status: 'DENIED',
          reason: authAcceptance.reason,
          exitCode: 1,
          errors: [
            `La integridad del ledger histórico de aceptaciones fue violada (${authAcceptance.message || authAcceptance.reason}).`,
          ],
        };
      }
      if (authAcceptance.reason === 'UNAUTHORIZED_RISK_LEVEL') {
        return {
          status: 'DENIED',
          reason: 'UNAUTHORIZED_RISK_LEVEL',
          exitCode: 1,
          errors: [
            `El nivel de riesgo supera el alcance concedido a la autoridad (${authAcceptance.message}).`,
          ],
        };
      }
      if (authAcceptance.reason === 'RISK_ACCEPTANCE_REVOKED') {
        return {
          status: 'DENIED',
          reason: 'RISK_ACCEPTANCE_REVOKED',
          exitCode: 1,
          errors: [
            `La aceptación humana de riesgo fue revocada formalmente (${authAcceptance.message}).`,
          ],
        };
      }
      if (authAcceptance.reason === 'UNTRUSTED_KEY_ID' || authAcceptance.reason === 'UNAUTHORIZED_ROLE' || authAcceptance.reason === 'REVOKED_OR_UNTRUSTED_AUTHORITY' || authAcceptance.reason === 'OPERATOR_IDENTITY_MISMATCH' || authAcceptance.reason === 'AUTHORITY_EXPIRED') {
        return {
          status: 'DENIED',
          reason: authAcceptance.reason,
          exitCode: 1,
          errors: [
            `La clave del operador no pertenece a una autoridad humana confiable registrada (${authAcceptance.message || authAcceptance.reason}).`,
          ],
        };
      }
      if (authAcceptance.reason === 'INVALID_PROPOSAL_DIGEST_FORMAT') {
        return {
          status: 'DENIED',
          reason: 'INVALID_PROPOSAL_DIGEST_FORMAT',
          exitCode: 1,
          errors: [
            `El proposalDigest debe ser un SHA-256 completo de 64 caracteres hexadecimales (recibido: ${authAcceptance.found || 'vacío'}).`,
          ],
        };
      }
      if (authAcceptance.reason === 'PROPOSAL_DIGEST_MISMATCH') {
        return {
          status: 'DENIED',
          reason: 'PROPOSAL_DIGEST_MISMATCH',
          exitCode: 1,
          errors: [
            `La aceptación humana de riesgo fue emitida para una propuesta con digest ${authAcceptance.found}, pero la propuesta actual tiene digest ${authAcceptance.expected}. Cualquier mutación al payload invalida la autorización previa.`,
          ],
        };
      }
      if (authAcceptance.reason === 'INVALID_ED25519_SIGNATURE') {
        return {
          status: 'DENIED',
          reason: 'INVALID_ED25519_SIGNATURE',
          exitCode: 1,
          errors: [
            'Firma Ed25519 inválida o ausente en el registro de riesgo: la aceptación humana no pudo ser autenticada criptográficamente.',
          ],
        };
      }
      if (authAcceptance.reason === 'RISK_ACCEPTANCE_EXPIRED') {
        return {
          status: 'DENIED',
          reason: 'RISK_ACCEPTANCE_EXPIRED',
          exitCode: 1,
          errors: ['La aceptación humana de riesgo ha expirado. Se exige re-evaluación formal.'],
        };
      }
      if (authAcceptance.reason === 'SYMLINK_DETECTED') {
        return {
          status: 'DENIED',
          reason: 'SYMLINK_DETECTED',
          exitCode: 1,
          errors: ['El archivo de aceptación de riesgo es un enlace simbólico no confiable o sufrió carrera TOCTOU.'],
        };
      }
      if (authAcceptance.reason === 'PATH_TRAVERSAL_DETECTED' || authAcceptance.reason === 'INVALID_PREMORTEM_ID_FORMAT') {
        return {
          status: 'DENIED',
          reason: authAcceptance.reason,
          exitCode: 1,
          errors: ['Identificador o ruta de premortem no válida (riesgo de path traversal).'],
        };
      }
      return {
        status: 'DENIED',
        reason: authAcceptance.reason || 'TAMPERED_RISK_ACCEPTANCE',
        exitCode: 1,
        errors: ['El registro de aceptación humana de riesgo es inválido o fue manipulado.'],
      };
    }

    // Si el payload contiene un intento de auto-aprobación inline no autenticado, se rechaza fail-closed
    if (payload.human_risk_acceptance && typeof payload.human_risk_acceptance === 'object') {
      if (!authAcceptance || !authAcceptance.valid) {
        return {
          status: 'DENIED',
          reason: 'UNAUTHENTICATED_HUMAN_OVERRIDE',
          exitCode: 1,
          errors: [
            'Intento de aceptación humana no autenticada dentro del payload: el evaluado no puede auto-aprobarse un riesgo. '
            + 'La aceptación debe emitirse fuera de banda mediante el comando `accept-risk` y quedar sellada con operador, entorno y vigencia.',
          ],
        };
      }
    }

    // --- Veredicto derivado ---
    let veredicto = 'APPROVED_WITH_SAFEGUARDS';
    if (payload.discovery_required === true || payload.missing_context === true) {
      veredicto = 'REQUIERE_DESCUBRIMIENTO';
    } else if (competencia.justified === false) {
      veredicto = 'REJECTED_AS_UNJUSTIFIED';
    } else if (competencia.bloat_risk === true) {
      veredicto = 'REJECTED_AS_BLOAT';
    } else if (estres && estres.has_critical_weakness === true) {
      veredicto = 'CONDITIONAL_TDD';
    }

    let humanRiskAccepted = false;
    let humanRiskRationale = null;
    let humanOperator = null;
    let humanEnvironment = null;
    let humanExpiresAt = null;

    if (authAcceptance && authAcceptance.valid) {
      humanRiskAccepted = true;
      humanRiskRationale = authAcceptance.record.rationale;
      humanOperator = authAcceptance.record.operator;
      humanEnvironment = authAcceptance.currentEnvironment;
      humanExpiresAt = authAcceptance.record.expiresAt;
      veredicto = 'HUMAN_RISK_ACCEPTED';
    }

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

      if (propuesto === 'HUMAN_RISK_ACCEPTED' && !humanRiskAccepted) {
        return {
          status: 'DENIED',
          reason: 'UNAUTHENTICATED_HUMAN_OVERRIDE',
          exitCode: 1,
          errors: [
            'HUMAN_RISK_ACCEPTED exige autorización autenticada fuera de banda mediante `accept-risk`. '
            + 'Prohibido autoproclamar aceptación de riesgo dentro del payload.',
          ],
        };
      }

      if (!humanRiskAccepted) {
        if (VEREDICTOS[propuesto].rango < VEREDICTOS[veredicto].rango) {
          return {
            status: 'DENIED',
            reason: 'VERDICT_DOWNGRADE_REFUSED',
            exitCode: 1,
            errors: [
              `Se propone "${propuesto}" cuando el análisis deriva "${veredicto}". Un veredicto no puede suavizarse silenciosamente: `
              + 'para aceptar un riesgo formalmente, el operador humano debe ejecutar `accept-risk` fuera de banda.',
            ],
          };
        }
        if (VEREDICTOS[propuesto].rango > VEREDICTOS[veredicto].rango) {
          endurecidoPor = veredicto;
          veredicto = propuesto;
        }
      }
    }

    const meta = VEREDICTOS[veredicto];

    const record = {
      contractVersion: '2.0.0',
      premortem_id: premortemId,
      feature_name: texto(payload.feature_name),
      depth_level: nivelAlcanzado,
      declared_depth: nivelDeclarado,
      timestamp: new Date().toISOString(),
      digest,
      verdict: veredicto,
      verdict_rationale: meta.glosa,
      hardened_from: endurecidoPor,
      human_risk_accepted: humanRiskAccepted,
      human_risk_rationale: humanRiskRationale,
      human_operator: humanOperator,
      human_environment: humanEnvironment,
      human_expires_at: humanExpiresAt,
      deployment_allowed: humanRiskAccepted ? (humanEnvironment === 'production') : (meta.status === 'APPROVED'),
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
      human_risk_accepted: humanRiskAccepted,
      human_risk_rationale: humanRiskRationale,
      human_operator: humanOperator,
      human_environment: humanEnvironment,
      human_expires_at: humanExpiresAt,
      deployment_allowed: record.deployment_allowed,
      memory_entries: memoria,
      purged: purgados,
      record_path: recordPath,
    };
  }

  /** Los pre-mortems sellados, del más antiguo al más reciente. */
  listar() {
    let ficheros;
    try {
      ficheros = fs.readdirSync(this.stateDir).filter((f) => f.startsWith('premortem-') && f.endsWith('.json')).sort();
    } catch (_) {
      // Sin directorio de estado todavía no hay historial: no es un fallo, es un inicio.
      return [];
    }
    return ficheros.map((f) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(this.stateDir, f), 'utf8'));
      } catch (_) {
        return null;
      }
    }).filter(Boolean);
  }

  /**
   * Busca un pre-mortem anterior, de OTRA característica, del que este reutilice frases
   * literalmente. Devuelve el primero que supere el umbral, o null.
   */
  detectarCalco(payload) {
    const frases = frasesSustantivas(payload);
    if (frases.length === 0) return null;
    const nombre = normalizar(payload.feature_name);

    for (const previo of this.listar()) {
      // Reevaluar la MISMA característica no es calco: es corregirla, y el id derivado
      // del contenido ya se encarga de que no se duplique el registro.
      if (normalizar(previo.feature_name) === nombre) continue;

      const anteriores = new Set(frasesSustantivas(previo.payload));
      if (anteriores.size === 0) continue;
      const repetidas = frases.filter((f) => anteriores.has(f)).length;

      if (repetidas / frases.length >= UMBRAL_CALCO) {
        return {
          premortem_id: previo.premortem_id,
          feature_name: previo.feature_name,
          repetidas,
          total: frases.length,
        };
      }
    }
    return null;
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

/**
 * Esqueleto rellenable. Existe porque la alternativa era adivinar la forma del payload a
 * partir de los mensajes de error, que es aprender a fuerza de rechazos.
 */
const PLANTILLA = {
  feature_name: 'Nombre de la característica, el refactor o la integración',
  mission_id: '(opcional) id de la misión a la que se ata este pre-mortem',
  competence_check: {
    justified: true,
    rationale: 'Por qué la necesidad real justifica la complejidad que añade',
  },
  anchors: {
    security: ['Riesgo grave de seguridad o integridad, explicado en una frase entera'],
    performance: ['Riesgo grave de rendimiento o consumo de recursos, con su magnitud'],
    architecture: ['Acoplamiento, contrato roto o deuda que este cambio deja detrás'],
    ux: ['Fricción humana concreta: qué verá o sufrirá quien lo use'],
  },
  worst_case_scenarios: [
    'Primer escenario catastrófico del entorno real de ejecución',
    'Segundo escenario, distinto del primero y no una variante suya',
  ],
  mandatory_mitigations: [
    'Salvaguarda concreta que hay que construir sí o sí, no una intención',
  ],
  mitigation_stress_test: {
    has_critical_weakness: false,
    tested_mitigation: 'Dónde falla la propia salvaguarda: la cura no puede ser peor que la enfermedad',
  },
};

const USO = [
  'Uso:',
  '  node tools/premortem.js evaluate <json_payload> [--target <dir>]',
  '  node tools/premortem.js accept-risk --id <id> --operator <name> --rationale <text> [--env dev|staging|prod] [--ttl h]',
  '  node tools/premortem.js evaluate --file <ruta.json>   evita pelearse con las comillas',
  '  node tools/premortem.js template [--out <ruta.json>]  esqueleto rellenable',
  '  node tools/premortem.js report [id|latest]            el informe en markdown',
  '  node tools/premortem.js list                          los pre-mortems sellados',
  '  node tools/premortem.js show <id>                     el registro completo',
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

  const opcion = (nombre) => {
    const i = args.indexOf(nombre);
    return i !== -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : null;
  };
  const raiz = opcion('--target') || ROOT;
  const motor = new PreMortemEngine(raiz);
  // Posicionales: ni las banderas ni sus valores.
  const posicional = [];
  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--')) { if (args[i + 1] && !args[i + 1].startsWith('--')) i += 1; continue; }
    posicional.push(args[i]);
  }

  if (comando === 'accept-risk') {
    const hasInteractiveTTY = Boolean(process.stdin && process.stdin.isTTY && process.stdout && process.stdout.isTTY);
    if (!hasInteractiveTTY && !args.includes('--test-headless')) {
      console.error(JSON.stringify({
        status: 'DENIED',
        reason: 'INTERACTIVE_HUMAN_TTY_REQUIRED',
        exitCode: 1,
        message: 'accept-risk exige ejecución en una terminal interactiva TTY física operada por un humano. Invocaciones headless, scripts o subprocesos automatizados bloqueados fail-closed.',
      }, null, 2));
      process.exit(1);
    }
    const id = opcion('--id');
    const operator = opcion('--operator');
    const rationale = opcion('--rationale');
    const env = opcion('--env') || opcion('--environment') || 'development';
    const ttl = opcion('--ttl') ? parseFloat(opcion('--ttl')) : 24;
    const keyFile = opcion('--key') || opcion('--private-key');
    const proposalFile = opcion('--proposal') || opcion('--file');
    const digestOpt = opcion('--digest');

    let proposalDigest = digestOpt || null;
    let premortemId = id;

    if (proposalFile && fs.existsSync(proposalFile)) {
      try {
        const raw = JSON.parse(fs.readFileSync(proposalFile, 'utf8'));
        const clean = { ...raw };
        delete clean.human_risk_acceptance;
        delete clean.authenticatedRiskAcceptance;
        proposalDigest = hashCanonical(clean);
        if (!premortemId) {
          premortemId = proposalDigest.slice(0, 16);
        }
      } catch (err) {
        console.error(JSON.stringify({ status: 'DENIED', reason: 'INVALID_PROPOSAL_FILE', message: err.message }, null, 2));
        process.exit(1);
      }
    }

    if (!premortemId || !operator || !rationale) {
      console.error(JSON.stringify({
        status: 'DENIED',
        reason: 'MISSING_ACCEPT_RISK_ARGS',
        exitCode: 1,
        hint: 'Uso: node tools/premortem.js accept-risk --id <premortem_id> --operator <name> --rationale <text> [--proposal <file>] [--key <key_file>] [--env dev|staging|prod] [--ttl hours]',
      }, null, 2));
      process.exit(1);
    }

    try {
      const res = motor.acceptRisk({
        premortemId,
        proposalDigest,
        operator,
        rationale,
        environment: env,
        ttlHours: ttl,
        privateKeyPath: keyFile,
      });
      console.log(JSON.stringify({
        status: 'SUCCESS',
        action: 'HUMAN_RISK_ACCEPTED',
        premortem_id: premortemId,
        proposal_digest: res.record.proposalDigest,
        operator,
        key_id: res.keyId,
        environment: env,
        expires_at: res.record.expiresAt,
        target_file: res.targetFile,
      }, null, 2));
      process.exit(0);
    } catch (e) {
      console.error(JSON.stringify({ status: 'DENIED', reason: 'ACCEPT_RISK_FAILED', message: e.message }, null, 2));
      process.exit(1);
    }
  }

  if (comando === 'verdicts') {
    console.log(JSON.stringify(VEREDICTOS, null, 2));
    process.exit(0);
  }

  if (comando === 'template') {
    const salida = opcion('--out');
    const json = JSON.stringify(PLANTILLA, null, 2);
    if (salida) {
      fs.writeFileSync(path.resolve(salida), json, 'utf8');
      console.log(`Plantilla escrita en ${salida}.`);
      console.log(`Rellénala y evalúala con: node tools/premortem.js evaluate --file ${salida}`);
    } else {
      console.log(json);
    }
    process.exit(0);
  }

  if (comando === 'list') {
    const todos = motor.listar();
    if (todos.length === 0) {
      console.log('Sin pre-mortems sellados. Empieza con: node tools/premortem.js template');
      process.exit(0);
    }
    todos.forEach((r) => console.log(
      `  ${r.premortem_id}  N${r.depth_level}  ${String(r.verdict).padEnd(24)} ${r.feature_name}`,
    ));
    console.log(`\n  ${todos.length} pre-mortem(s) en .axion/state/.`);
    process.exit(0);
  }

  if (comando === 'show' || comando === 'report') {
    const ref = posicional[0];
    const todos = motor.listar();
    const registro = (!ref || ref === 'latest')
      ? todos[todos.length - 1]
      : todos.find((r) => r.premortem_id === ref);

    if (!registro) {
      console.error(`No hay ningún pre-mortem con id "${ref || 'latest'}".`);
      process.exit(1);
    }

    if (comando === 'show') {
      console.log(JSON.stringify(registro, null, 2));
      process.exit(0);
    }

    // El informe se genera desde el registro sellado, no desde lo que alguien recuerde
    // haber escrito: el markdown y la evidencia cuentan la misma historia o no sirven.
    console.log(PreMortemEngine.formatReport({
      featureName: registro.feature_name,
      anchors: registro.payload.anchors,
      worstCases: registro.payload.worst_case_scenarios,
      mitigations: registro.payload.mandatory_mitigations,
      solutionStress: registro.payload.mitigation_stress_test
        ? [registro.payload.mitigation_stress_test.tested_mitigation || registro.payload.mitigation_stress_test.notes].filter(Boolean)
        : [],
      verdict: registro.verdict,
      depth: registro.depth_level,
    }));
    console.log(`\n> \`${registro.premortem_id}\` · digest \`${registro.digest.slice(0, 16)}…\` · sellado ${registro.timestamp}`);
    process.exit(VEREDICTOS[registro.verdict] ? VEREDICTOS[registro.verdict].exit : 1);
  }

  if (comando !== 'evaluate') {
    console.log(`Accion desconocida: ${comando}\n`);
    console.log(USO);
    process.exit(2);
  }

  // --file evita el infierno de comillas: un payload de siete campos en una sola línea de
  // shell es una forma segura de perder media hora escapando apóstrofos en Windows.
  const fichero = opcion('--file');
  let bruto = fichero ? null : posicional[0];
  if (fichero) {
    try {
      bruto = fs.readFileSync(path.resolve(fichero), 'utf8');
    } catch (e) {
      console.error(JSON.stringify({ status: 'DENIED', reason: 'PAYLOAD_FILE_UNREADABLE', exitCode: 1, message: e.message }, null, 2));
      process.exit(1);
    }
  }

  if (!bruto) {
    console.error(JSON.stringify({
      status: 'DENIED',
      reason: 'MISSING_PAYLOAD',
      exitCode: 1,
      hint: 'Genera el esqueleto con `node tools/premortem.js template --out premortem.json`.',
    }, null, 2));
    process.exit(1);
  }

  let payload;
  try {
    payload = JSON.parse(bruto);
  } catch (e) {
    console.error(JSON.stringify({ status: 'DENIED', reason: 'MALFORMED_JSON', exitCode: 1, message: e.message }, null, 2));
    process.exit(1);
  }

  const res = motor.evaluateAssessment(payload);
  console.log(JSON.stringify(res, null, 2));
  if (res.status !== 'DENIED' && !args.includes('--no-report')) {
    console.log(`\nInforme legible: node tools/premortem.js report ${res.premortem_id}`);
  }
  process.exit(typeof res.exitCode === 'number' ? res.exitCode : 1);
}

if (require.main === module) main();

module.exports = PreMortemEngine;
module.exports.VEREDICTOS = VEREDICTOS;
module.exports.ANCHORS = ANCHORS;
module.exports.MINIMO_SUSTANCIA = MINIMO_SUSTANCIA;
module.exports.calculateBlastRadius = PreMortemEngine.calculateBlastRadius;
module.exports.USO = USO;
