/**
 * Axion Protocol — Sovereign Engineering Controller & Audio-Visual Runtime (v2.0)
 * Native RFC 6455 WebSocket + Web Audio API + Physics Radar + Command Palette ⌘K + Smart Dock.
 */

document.addEventListener('DOMContentLoaded', () => {

  // ── 1. Diccionario Bilingüe Exhaustivo (EN / ES) ───────────────────
  const I18N = {
    en: {
      toastLang: '✓ English language selected',
      toastThemeDark: '✓ Dark mode enabled',
      toastThemeLight: '✓ Light mode enabled',
      toastSoundOn: '✓ Haptic audio enabled',
      toastSoundOff: '✕ Haptic audio muted',
      toastCopied: '✓ Command copied to clipboard',
      toastCopyFail: 'Could not copy to clipboard automatically.',
      statusPill: 'v1.4.0-beta.1 · 246 Suites',
      navHero: 'Home',
      navSwarm: 'Swarm Simulator',
    scopeBanner: 'Scope: experimental local governance toolkit. Local identity and signatures; no process isolation; no certification. Swarm and BFT are diagnostic simulations.',
      navSandbox: 'CLI Sandbox',
      navPipeline: '7-Step Workflow',
      navRadar: 'Radar & Blast Radius',
      navTelemetry: 'Telemetry HUD',
      navCompat: 'Platforms',
      navCommands: '12 Commands',
      navSbom: 'SBOM Manifest',
      paletteSearchBtn: 'Search',
      paletteHelpNav: '<kbd>↑</kbd> <kbd>↓</kbd> Navigate',
      paletteHelpExec: '<kbd>↵</kbd> Run / Open',
      paletteHelpClose: '<kbd>ESC</kbd> Close',
      heroEyebrow: 'LOCAL GOVERNANCE HARNESS (EXPERIMENTAL)',
      heroTagText: '0 THIRD-PARTY DEPENDENCIES · EXECUTION HARNESS',
      heroTitle: 'Local deterministic governance and runtime arbitration for AI agents.',
      heroLead: 'Execution engine operating in <code>fail-closed</code> mode. Intercepts terminal tool calls with <code>shell: false</code>, arbitrates concurrent AST namespace collisions, and guarantees SHA-256 byte-accurate state rollback.',
      installBoxLabel: 'QUICKSTART COMMAND',
      copyLabel: 'Copy',
      telemetryStatus: '246 Suites',
      metricSuites: 'Suites in Repository',
      metricDeps: 'External Dependencies',
      metricRollback: 'Rollback SHA-256',
      metricBft: 'Simulated BFT Rounds / sec',
      consoleTitle: 'axion-telemetry-bus (SIMULATION RFC 6455)',
      consoleVibeguardStat: 'VibeGuard: 129 files scanned (0 antipatterns)',
      playgroundBadge: 'INTERACTIVE SANDBOX',
      playgroundTitle: 'Command Simulator & Safety Brake',
      playgroundDesc: 'Run interactive commands to experience how Axion intercepts risks, simulates adversarial attacks, and enforces rollback in <code>fail-closed</code> mode:',
      quickActionLabel: 'Quick Run:',
      quickDanger: '⚠️ Test Hostile: rm -rf /',
      simTerminalBadge: 'PREFLIGHT INTERCEPTOR (PRE-TOOL USE SIMULATION)',
      simClearBtn: 'Clear',
      simInitMsg: 'Axion Protocol v2.0 Sandbox ready. Type a command or click the quick action pills above.',
      simPlaceholder: 'Type a command (/drive, /verify, rm -rf /, /attest) and press Enter...',
      simRunBtn: 'Run',
      swarmBadge: 'MULTI-AGENT CONCURRENCY',
      swarmTitle: 'Swarm Simulation v2.0 & Arbitration',
      swarmDesc: 'Three local simulation components to explore multi-agent coordination without race conditions or blind overrides (no process isolation):',
      p1Tag: 'PILLAR 1 · ISOLATION',
      pillar1Title: 'Granular AST Symbol Locking',
      pillar1Desc: 'Manages atomic editing permissions on individual functions and classes instead of locking entire files. Eliminates concurrent overwrites across sub-agents.',
      p2Tag: 'PILLAR 2 · COMMUNICATION',
      pillar2Title: 'P2P Message Bus with Asymmetric Signing',
      pillar2Desc: 'Direct inter-agent communication channel authenticated with ephemeral Ed25519 keypairs and isolated mailboxes in <code>.axion/swarm/</code>.',
      p3Tag: 'PILLAR 3 · GOVERNANCE',
      pillar3Title: 'Simulated consensus quorum (BFT ≥ 66%, 3 local agents)',
      pillar3Desc: 'No structural code mutation is applied without reaching a qualified supermajority of 66.7% of evaluator votes before writing to disk.',
      deckBadge: 'LIVE SIMULATOR',
      deckTitle: 'BFT Voting Panel (local simulation)',
      btnConsensusTrigger: 'Simulate BFT Consensus Round',
      nodeVotePending: 'Standby',
      quorumReqLabel: 'Required Quorum: <strong>≥ 66.7%</strong>',
      quorumInitText: 'Press "Simulate Round" to deliberate',
      pipeBadge: 'DETERMINISTIC LIFECYCLE',
      pipeTitle: 'Unified 7-Step Workflow & Socratic Sealer',
      pipeDesc: 'Guides models through a strict sequence of 7 states before committing changes:',
      step01Name: 'UNDERSTAND',
      step01Desc: 'Clarifies ambiguous requests with 2 concrete questions (A/B/C) and seals an immutable SHA-256 IntentContract before code edits.',
      step02Name: 'PLAN',
      step02Desc: 'Calculates transitive blast radius and prepares an atomic rollback plan without polluting the conversation context.',
      step03Name: 'GATE',
      step03Desc: 'Requires asymmetric Ed25519 single-use signatures before authorizing high-risk, destructive, or schema-altering actions.',
      step04Name: 'TEST',
      step04Desc: 'Defines Test-Driven Development (TDD) assertions and invariant verifications before creating or modifying code.',
      step05Name: 'BUILD',
      step05Desc: 'Synchronous preflight lexical inspection in PreToolUse with isolated execution using structured shell: false.',
      step06Name: 'AUDIT',
      step06Desc: 'Runs the full 246 automated test suites, performs strict VibeGuard anti-pattern scans, and validates exit code 0.',
      step07Name: 'PROMOTE',
      step07Desc: 'Issues in-toto Statement v1 cryptographic provenance in DSSE envelope with Ed25519 signature and localized summary.',
      socraticBadge: 'SOCRATIC BRAKE · /clarify',
      socraticTitle: 'IntentContract v1.2 Generator & Sealer',
      socraticQNum: 'QUESTION 1 OF 2',
      socraticQTitle: 'What is the exact scope of the requested code mutation?',
      socraticOptA: 'Refactor internal logic only without altering the public API.',
      socraticOptB: 'Create a new isolated module with corresponding TDD test suite.',
      socraticOptC: 'Full structural migration with external dependency updates.',
      btnCopyJson: 'Copy JSON',
      radarBadge: 'TOPOLOGY & BLAST RADIUS',
      radarTitle: 'Architecture Radar & Impact Analysis',
      radarDesc: 'Visually explore the 5 domains and their interconnected modules. Click any node to compute its transitive blast radius and inspect verified invariants:',
      chipAllDomains: 'All Domains (246)',
      chipGovDomain: '01 Governance (110)',
      chipCryptoDomain: '02 Cryptography (27)',
      chipIntentDomain: '03 Intent (23)',
      chipStateDomain: '04 State (23)',
      chipResilienceDomain: '05 Resilience (18)',
      btnBlastSim: '💥 Simulate Blast Radius',
      inspActiveChip: 'Active Invariant',
      inspLblBlast: 'Blast Radius',
      inspLblTrans: 'Transitive Closure',
      inspLblSig: 'Signature / Seal',
      inspLblIso: 'Isolation',
      telemetryBadge: 'REAL-TIME TELEMETRY',
      telemetryTitle: 'Performance Metrics & Telemetry Stream',
      telemetryDesc: 'Live monitoring of deterministic throughput, memory consumption, and continuous verification:',
      chartBadge: 'LIVE THROUGHPUT',
      chartTitle: 'Simulated BFT Consensus Rounds',
      breakdownTitle: 'Distribution of the 246 Suites',
      d1Name: '01 Governance & Preflight',
      d2Name: '02 Cryptography & Attestation',
      d3Name: '03 Intent & Socratic UX',
      d4Name: '04 State & Checkpoints',
      d5Name: '05 Adversarial Resilience',
      compatBadge: 'TOTAL INTEROPERABILITY',
      compatTitle: 'Universal Platform Support',
      compatDesc: 'Axion Protocol operates without friction across primary AI assisted development environments:',
      thEnv: 'Development Environment',
      thMech: 'Integration Mechanism',
      thDir: 'Exported Directive',
      thStatus: 'Verification Status',
      tdOpenCodeMech: 'CLI / Rule Directives / Standalone Bundle',
      tdCodexMech: 'Repository Instructions / Config TOML',
      tdAntigravityMech: 'Modular Skills / P0 Rules / Interactive Modals',
      tdClaudeMech: 'Native Slash Commands / CLAUDE.md',
      tdCursorMech: 'MDC Rules / Agent Profiles',
      tdVerified: 'Verified (CI)',
      tdNative: 'Native (100% Parity)',
      tdNativeCmds: 'Native (12 Commands)',
      tdSynced: 'Synchronized',
      cmdBadge: 'OPERATIONAL CATALOG',
      cmdTitle: '12 Governance Slash Commands',
      cmdDesc: 'Universal commands designed to coexist without collisions in any terminal environment:',
      chipAll: 'All (12)',
      chipGov: 'Governance',
      chipIntent: 'Intent & UX',
      chipState: 'State & Checkpoints',
      chipCrypto: 'Cryptography',
      cmdSearchPlaceholder: 'Search slash command (/drive, /verify, /rollback)...',
      tagGov: 'Governance',
      tagIntent: 'Intent',
      tagState: 'State',
      tagCrypto: 'Cryptography',
      descDrive: 'Universal autonomous meta-orchestrator in closed loop. Adaptive deliberation and execution of complex missions.',
      descClarify: 'Clarifies ambiguous requests using exactly 2 human questions with A/B/C choices before touching code.',
      descVerify: 'Deterministic verification through real execution of the entire test suite, strictly requiring exit code 0.',
      descSnapshot: 'Saves and restores SHA-256 verified deterministic checkpoints independent of the Git tree.',
      descPreflight: 'Classifies the risk of terminal commands before execution with ALLOW, NEEDS_REVIEW, or DENY verdicts.',
      descAttest: 'Issues and validates in-toto Statement v1 attestations in DSSE envelope with Ed25519 signatures.',
      descMemory: 'Persistent project memory and cross-session anti-drift context anchoring.',
      descDebug: 'Systematic 4-phase debugging cycle with root-cause analysis and reproducible evidence verification.',
      descPremortem: 'Adversarial 6-month failure simulation and blast radius calculation before coding begins.',
      descProfile: 'Calibrates and persists the user profile across 5 dimensions (technical depth, environment, pace, autonomy).',
      descReview: 'Audits changes under 4 lenses (Technical, Functional, UX/Product, Architecture) with executable evidence.',
      descHalt: 'Immediate emergency stop (killswitch) and deliberate fail-closed resumption upon anomalies.',
      sbomBadge: 'COMPLIANCE & SUPPLY CHAIN',
      sbomTitle: 'CycloneDX v1.5 and SPDX 2.3 SBOM Manifests',
      sbomDesc: 'Every module, tool, and command of Axion Protocol is indexed with its SHA-256 fingerprint under Apache-2.0 license.',
      btnViewCyclone: 'View CycloneDX JSON',
      btnViewSpdx: 'View SPDX 2.3 JSON',
      footerTagline: 'Deterministic governance runtime for autonomous AI agent operations.',
      footerHeadingDocs: 'Documentation',
      footerLinkMaturity: 'Maturity Report v2.0',
      footerLinkSwarm: 'Swarm Architecture',
      footerLinkCompat: 'OpenCode Compatibility',
      footerHeadingCode: 'Code & License',
      footerLinkGithub: 'GitHub Repository',
      footerLinkReleases: 'Official Releases',
      footerLinkLicense: 'Apache 2.0 License',
      footerCopy: '© 2026 Axion Protocol. Zero third-party telemetry. 100% open-source and local execution.'
    },
    es: {
      toastLang: '✓ Idioma español seleccionado',
      toastThemeDark: '✓ Modo oscuro activado',
      toastThemeLight: '✓ Modo claro activado',
      toastSoundOn: '✓ Sonido háptico activado',
      toastSoundOff: '✕ Sonido háptico silenciado',
      toastCopied: '✓ Comando copiado al portapapeles',
      toastCopyFail: 'No se pudo copiar automáticamente.',
      statusPill: 'v1.4.0-beta.1 · 246 Suites',
      navHero: 'Inicio',
      navSwarm: 'Simulador Swarm',
    scopeBanner: 'Alcance: toolkit experimental de gobernanza local. Identidad y firma locales; sin aislamiento de proceso; sin certificación. Swarm y BFT son simulaciones de diagnóstico.',
      navSandbox: 'Simulador CLI',
      navPipeline: 'Flujo 7 Pasos',
      navRadar: 'Radar Blast Radius',
      navTelemetry: 'Telemetría HUD',
      navCompat: 'Plataformas',
      navCommands: '12 Comandos',
      navSbom: 'Manifiesto SBOM',
      paletteSearchBtn: 'Buscar',
      paletteHelpNav: '<kbd>↑</kbd> <kbd>↓</kbd> Navegar',
      paletteHelpExec: '<kbd>↵</kbd> Ejecutar / Abrir',
      paletteHelpClose: '<kbd>ESC</kbd> Cerrar',
      heroEyebrow: 'ARNÉS DE GOBERNANZA LOCAL (EXPERIMENTAL)',
      heroTagText: '0 DEPENDENCIAS EXTERNAS · EXECUTION HARNESS',
      heroTitle: 'Gobernanza local y arbitraje determinista para agentes de IA.',
      heroLead: 'Motor de ejecución en modo <code>fail-closed</code>. Intercepta llamadas de terminal sin sub-shell, arbitra colisiones concurrentes en el árbol AST y garantiza reversión atómica verificada con SHA-256.',
      installBoxLabel: 'COMANDO DE INICIO RÁPIDO',
      copyLabel: 'Copiar',
      telemetryStatus: '246 Suites',
      metricSuites: 'Suites en el Repositorio',
      metricDeps: 'Dependencias Externas',
      metricRollback: 'Rollback SHA-256',
      metricBft: 'Rondas BFT simuladas / seg',
      consoleTitle: 'axion-telemetry-bus (SIMULACIÓN RFC 6455)',
      consoleVibeguardStat: 'VibeGuard: 129 archivos escaneados (0 antipatrones)',
      playgroundBadge: 'SANDBOX INTERACTIVO',
      playgroundTitle: 'Simulador de Comandos y Freno de Seguridad',
      playgroundDesc: 'Ejecuta comandos interactivos para experimentar cómo Axion intercepta riesgos, simula ataques hostiles y ejecuta reversión en modo <code>fail-closed</code>:',
      quickActionLabel: 'Ejecución rápida:',
      quickDanger: '⚠️ Test Hostil: rm -rf /',
      simTerminalBadge: 'PREFLIGHT INTERCEPTOR (SIMULACIÓN PRE-TOOL USE)',
      simClearBtn: 'Limpiar',
      simInitMsg: 'Axion Protocol v2.0 Sandbox listo. Escribe un comando o haz clic en las acciones rápidas superiores.',
      simPlaceholder: 'Escribe un comando (/drive, /verify, rm -rf /, /attest) y presiona Enter...',
      simRunBtn: 'Ejecutar',
      swarmBadge: 'CONCURRENCIA MULTI-AGENTE',
      swarmTitle: 'Simulación Swarm v2.0 & Arbitraje',
      swarmDesc: 'Tres componentes de simulación local para explorar coordinación multi-agente sin condiciones de carrera ni modificaciones ciegas (sin aislamiento de proceso):',
      p1Tag: 'PILAR 1 · AISLAMIENTO',
      pillar1Title: 'Bloqueo Granular de Símbolos AST',
      pillar1Desc: 'Gestiona permisos de edición atómicos sobre funciones y clases individuales en lugar de bloquear archivos enteros. Elimina sobreescrituras concurrentes entre múltiples sub-agentes.',
      p2Tag: 'PILAR 2 · COMUNICACIÓN',
      pillar2Title: 'Bus de Mensajes P2P con Firma Asimétrica',
      pillar2Desc: 'Canal de comunicación directo inter-agente autenticado mediante pares de llaves Ed25519 efímeras y buzones de entrada aislados en <code>.axion/swarm/</code>.',
      p3Tag: 'PILAR 3 · GOBERNANZA',
      pillar3Title: 'Quórum de consenso simulado (BFT ≥ 66%, 3 agentes locales)',
      pillar3Desc: 'Ninguna mutación estructural se aplica al código sin alcanzar una supermayoría calificada del 66.7% de los votos de los agentes evaluadores antes de escribir en disco.',
      deckBadge: 'SIMULADOR EN VIVO',
      deckTitle: 'Panel de votación BFT (simulación local)',
      btnConsensusTrigger: 'Simular Ronda de Consenso BFT',
      nodeVotePending: 'En espera',
      quorumReqLabel: 'Quórum Requerido: <strong>≥ 66.7%</strong>',
      quorumInitText: 'Presiona "Simular Ronda" para deliberar',
      pipeBadge: 'EJECUCIÓN DETERMINISTA',
      pipeTitle: 'Ciclo de Trabajo Híbrido Unificado & Socrático',
      pipeDesc: 'El protocolo guía a los modelos a través de una secuencia estricta de 7 estados antes de consolidar cambios:',
      step01Name: 'ENTENDER',
      step01Desc: 'Aclara peticiones ambiguas con 2 preguntas concretas (A/B/C) y emite un IntentContract sellado con SHA-256.',
      step02Name: 'PLANIFICAR',
      step02Desc: 'Calcula el radio de explosión transitivo y prepara el plan de reversión sin saturar el contexto de conversación.',
      step03Name: 'GATE',
      step03Desc: 'Exige aprobación explícita con firma asimétrica para operaciones destructivas o cambios en persistencia.',
      step04Name: 'TEST',
      step04Desc: 'Redacta aserciones unitarias e invariantes antes de construir o modificar cualquier módulo de código.',
      step05Name: 'CONSTRUIR',
      step05Desc: 'Inspección léxica síncrona en PreToolUse con ejecución aislada mediante shell: false.',
      step06Name: 'AUDITAR',
      step06Desc: 'Ejecución real de la suite de 246 pruebas, escaneo VibeGuard de antipatrones y validación de salida con exit code 0.',
      step07Name: 'PROMOVER',
      step07Desc: 'Generación del sobre criptográfico in-toto v1 en formato DSSE y reporte ejecutivo en el idioma del usuario.',
      socraticBadge: 'FRENO SOCRÁTICO · /clarify',
      socraticTitle: 'Generador y Sellador de IntentContract v1.2',
      socraticQNum: 'PREGUNTA 1 DE 2',
      socraticQTitle: '¿Cuál es el alcance exacto de la mutación solicitada?',
      socraticOptA: 'Refactorizar únicamente la lógica interna sin alterar la API pública.',
      socraticOptB: 'Crear nuevo módulo aislado y suite de pruebas TDD correspondiente.',
      socraticOptC: 'Migración estructural completa con actualización de dependencias.',
      btnCopyJson: 'Copiar JSON',
      radarBadge: 'TOPOLOGÍA Y BLAST RADIUS',
      radarTitle: 'Radar de Arquitectura & Análisis de Impacto',
      radarDesc: 'Explora visualmente los 5 dominios y sus módulos interconectados. Haz clic en cualquier nodo para calcular su radio de impacto transitivo e inspeccionar sus invariantes:',
      chipAllDomains: 'Todos los Dominios (246)',
      chipGovDomain: '01 Gobernanza (110)',
      chipCryptoDomain: '02 Criptografía (27)',
      chipIntentDomain: '03 Intención (23)',
      chipStateDomain: '04 Estado (23)',
      chipResilienceDomain: '05 Resiliencia (18)',
      btnBlastSim: '💥 Simular Blast Radius',
      inspActiveChip: 'Invariante Activo',
      inspLblBlast: 'Blast Radius',
      inspLblTrans: 'Cierre Transitivo',
      inspLblSig: 'Firma / Sello',
      inspLblIso: 'Aislamiento',
      telemetryBadge: 'TELEMETRÍA EN TIEMPO REAL',
      telemetryTitle: 'Métricas de Rendimiento & Flujo de Telemetría',
      telemetryDesc: 'Supervisión en vivo de rendimiento determinista, consumo de memoria y verificación continua:',
      chartBadge: 'LIVE THROUGHPUT',
      chartTitle: 'Rondas de consenso BFT simuladas',
      breakdownTitle: 'Distribución de las 246 Suites',
      d1Name: '01 Gobernanza & Preflight',
      d2Name: '02 Criptografía & Atestación',
      d3Name: '03 Intención & UX Socrática',
      d4Name: '04 Estado & Checkpoints',
      d5Name: '05 Resiliencia Adversarial',
      compatBadge: 'INTEROPERABILIDAD TOTAL',
      compatTitle: 'Soporte Universal de Plataformas',
      compatDesc: 'Axion Protocol opera sin fricción en los principales entornos de desarrollo asistido por IA:',
      thEnv: 'Entorno de Desarrollo',
      thMech: 'Mecanismo de Integración',
      thDir: 'Directiva Exportada',
      thStatus: 'Estado de Verificación',
      tdOpenCodeMech: 'CLI / Directivas de Reglas / Standalone Bundle',
      tdCodexMech: 'Instrucciones de Repositorio / Config TOML',
      tdAntigravityMech: 'Skills Modulares / Reglas P0 / Modales Interactivos',
      tdClaudeMech: 'Slash Commands Nativos / CLAUDE.md',
      tdCursorMech: 'MDC Rules / Perfiles de Agente',
      tdVerified: 'Verificado (CI)',
      tdNative: 'Nativo (100% Paridad)',
      tdNativeCmds: 'Nativo (12 Comandos)',
      tdSynced: 'Sincronizado',
      cmdBadge: 'CATÁLOGO OPERATIVO',
      cmdTitle: '12 Slash Commands de Gobernanza',
      cmdDesc: 'Comandos universales diseñados para coexistir sin colisiones en cualquier terminal:',
      chipAll: 'Todos (12)',
      chipGov: 'Gobernanza',
      chipIntent: 'Intención & UX',
      chipState: 'Estado & Checkpoints',
      chipCrypto: 'Criptografía',
      cmdSearchPlaceholder: 'Buscar comando (/drive, /verify, /rollback)...',
      tagGov: 'Gobernanza',
      tagIntent: 'Intención',
      tagState: 'Estado',
      tagCrypto: 'Criptografía',
      descDrive: 'Meta-orquestador autónomo universal en bucle cerrado. Deliberación adaptativa y ejecución de misiones complejas.',
      descClarify: 'Aclara peticiones ambiguas mediante exactamente 2 preguntas humanas con opciones A/B/C antes de tocar código.',
      descVerify: 'Verificación determinista por ejecución real de la suite de pruebas completa, con exigencia estricta de exit code 0.',
      descSnapshot: 'Guarda y restaura puntos de control deterministas verificados con SHA-256 independientes del árbol de Git.',
      descPreflight: 'Clasifica el riesgo de comandos de terminal antes de su ejecución con veredictos ALLOW, NEEDS_REVIEW o DENY.',
      descAttest: 'Emite y valida atestaciones in-toto Statement v1 en sobre DSSE con firmas Ed25519, formato in-toto v1; sin certificación SLSA.',
      descMemory: 'Memoria persistente del proyecto y anclaje de contexto anti-deriva entre sesiones de trabajo continuas.',
      descDebug: 'Ciclo sistemático de depuración en 4 fases con análisis de causa raíz y verificación por evidencia reproducible.',
      descPremortem: 'Simulación adversarial de fracaso a 6 meses y cálculo del radio de explosión antes de iniciar la programación.',
      descProfile: 'Calibra y persiste el perfil del usuario en 5 dimensiones (profundidad técnica, entorno, cadencia y autonomía).',
      descReview: 'Auditoría de cambios bajo 4 lentes (Técnica, Funcional, UX/Producto y Arquitectura) con evidencia ejecutable.',
      descHalt: 'Parada de emergencia inmediata (killswitch) y reanudación deliberada en modo fail-closed ante anomalías.',
      sbomBadge: 'CUMPLIMIENTO Y CADENA DE SUMINISTRO',
      sbomTitle: 'Manifiestos SBOM en Estándares CycloneDX v1.5 y SPDX 2.3',
      sbomDesc: 'Cada módulo, herramienta y comando de Axion Protocol está indexado con su huella digital SHA-256 bajo licencia Apache-2.0.',
      btnViewCyclone: 'Ver CycloneDX JSON',
      btnViewSpdx: 'Ver SPDX 2.3 JSON',
      footerTagline: 'Runtime de gobernanza determinista para operaciones con agentes de IA autónomos.',
      footerHeadingDocs: 'Documentación',
      footerLinkMaturity: 'Reporte de Madurez v2.0',
      footerLinkSwarm: 'Arquitectura Swarm',
      footerLinkCompat: 'Compatibilidad OpenCode',
      footerHeadingCode: 'Código y Licencia',
      footerLinkGithub: 'Repositorio en GitHub',
      footerLinkReleases: 'Releases Oficiales',
      footerLinkLicense: 'Licencia Apache 2.0',
      footerCopy: '© 2026 Axion Protocol. Cero telemetría de terceros. 100% código abierto y ejecución local.'
    }
  };

  let currentLang = localStorage.getItem('axion_lang') || 'es';

  // ── 2. Web Audio Haptic Synthesizer (Zero External Assets) ─────────
  let audioCtx = null;
  let soundEnabled = localStorage.getItem('axion_sound_enabled') !== 'false';

  function initAudio() {
    if (!audioCtx && typeof window.AudioContext !== 'undefined') {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playKeyClick() {
    if (!soundEnabled) return;
    initAudio();
    if (!audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.025, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.03);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.03);
    } catch (e) {
      console.debug('Audio click error:', e);
    }
  }

  function playSuccessChime() {
    if (!soundEnabled) return;
    initAudio();
    if (!audioCtx) return;
    try {
      const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5
      freqs.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.04);
        gain.gain.setValueAtTime(0.04, audioCtx.currentTime + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + idx * 0.04 + 0.22);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + idx * 0.04);
        osc.stop(audioCtx.currentTime + idx * 0.04 + 0.22);
      });
    } catch (e) {
      console.debug('Audio chime error:', e);
    }
  }

  function playAlertBeep() {
    if (!soundEnabled) return;
    initAudio();
    if (!audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      console.debug('Audio alert error:', e);
    }
  }

  function playRadarPing() {
    if (!soundEnabled) return;
    initAudio();
    if (!audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.18);
    } catch (e) {
      console.debug('Audio ping error:', e);
    }
  }

  // ── 3. Toast Helper ────────────────────────────────────────────────
  const toast = document.getElementById('toast');
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2500);
  }

  // ── 4. Scroll Progress Indicator & Dock Tracking ───────────────────
  const scrollProgress = document.getElementById('scroll-progress');
  const sideItems = document.querySelectorAll('.sidebar-smart .side-item');
  const sections = document.querySelectorAll('section[id]');

  window.addEventListener('scroll', () => {
    const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = totalHeight > 0 ? (window.scrollY / totalHeight) * 100 : 0;
    if (scrollProgress) scrollProgress.style.width = `${progress}%`;

    // Active Section Observer
    let currentActive = 'hero';
    const scrollPos = window.scrollY + 200;
    sections.forEach(sec => {
      if (sec.offsetTop <= scrollPos) {
        currentActive = sec.getAttribute('id');
      }
    });

    sideItems.forEach(item => {
      const target = item.getAttribute('data-nav-target');
      item.classList.toggle('active', target === currentActive);
    });
  });

  // ── 5. Spotlight Cursor Tracker ────────────────────────────────────
  const spotlightCards = document.querySelectorAll('.spotlight-card');
  spotlightCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
    card.addEventListener('mouseleave', () => {
      card.style.setProperty('--mouse-x', `-500px`);
      card.style.setProperty('--mouse-y', `-500px`);
    });
  });

  // ── 6. Theme & Sound Controls ──────────────────────────────────────
  const htmlRoot = document.documentElement;
  const themeToggleBtn = document.getElementById('theme-toggle');
  const soundToggleBtn = document.getElementById('btn-sound-toggle');

  const savedTheme = localStorage.getItem('axion_theme') || 'dark';
  htmlRoot.setAttribute('data-theme', savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      playKeyClick();
      const current = htmlRoot.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      htmlRoot.setAttribute('data-theme', next);
      localStorage.setItem('axion_theme', next);
      showToast(next === 'dark' ? I18N[currentLang].toastThemeDark : I18N[currentLang].toastThemeLight);
    });
  }

  function updateSoundUI() {
    if (!soundToggleBtn) return;
    const soundOn = soundToggleBtn.querySelector('.sound-on');
    const soundOff = soundToggleBtn.querySelector('.sound-off');
    if (soundOn && soundOff) {
      soundOn.style.display = soundEnabled ? 'block' : 'none';
      soundOff.style.display = soundEnabled ? 'none' : 'block';
    }
  }
  updateSoundUI();

  if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      localStorage.setItem('axion_sound_enabled', soundEnabled);
      updateSoundUI();
      if (soundEnabled) {
        playSuccessChime();
        showToast(I18N[currentLang].toastSoundOn);
      } else {
        showToast(I18N[currentLang].toastSoundOff);
      }
    });
  }

  // ── 7. Command Palette ⌘K Engine ───────────────────────────────────
  const paletteModal = document.getElementById('palette-modal');
  const btnOpenPalette = document.getElementById('btn-open-palette');
  const paletteInput = document.getElementById('palette-input');
  const paletteResults = document.getElementById('palette-results');

  const PALETTE_COMMANDS = [
    { name: '/drive', desc: 'Meta-orquestador autónomo universal en bucle cerrado', tag: 'Gobernanza' },
    { name: '/clarify', desc: 'Aclara peticiones ambiguas con 2 preguntas humanas (A/B/C)', tag: 'Intención' },
    { name: '/verify', desc: 'Verificación determinista por ejecución real de suite (exit 0)', tag: 'Gobernanza' },
    { name: '/snapshot', desc: 'Puntos de control deterministas verificados con SHA-256', tag: 'Estado' },
    { name: '/rollback', desc: 'Reversión determinista instantánea de árbol al último checkpoint', tag: 'Estado' },
    { name: '/preflight', desc: 'Clasifica y supervisa riesgo de comandos de terminal', tag: 'Gobernanza' },
    { name: '/attest', desc: 'Emite atestaciones in-toto Statement v1 con Ed25519 DSSE', tag: 'Criptografía' },
    { name: '/premortem', desc: 'Simulación adversarial de fracaso a 6 meses y blast radius', tag: 'Resiliencia' },
    { name: '/memory', desc: 'Memoria persistente del proyecto y anclaje anti-deriva', tag: 'Estado' },
    { name: '/debug', desc: 'Ciclo sistemático de depuración en 4 fases con causa raíz', tag: 'Gobernanza' },
    { name: '/profile', desc: 'Calibra el perfil de usuario en 5 dimensiones cognitivas', tag: 'Intención' },
    { name: '/halt', desc: 'Killswitch de emergencia y parada deliberada fail-closed', tag: 'Gobernanza' }
  ];

  let selectedPaletteIndex = 0;

  function renderPaletteItems(query = '') {
    if (!paletteResults) return;
    const q = query.toLowerCase().trim();
    const filtered = PALETTE_COMMANDS.filter(cmd => 
      cmd.name.toLowerCase().includes(q) || 
      cmd.desc.toLowerCase().includes(q) || 
      cmd.tag.toLowerCase().includes(q)
    );

    if (filtered.length === 0) {
      paletteResults.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">No se encontraron comandos coincidentes</div>`;
      return;
    }

    selectedPaletteIndex = Math.min(selectedPaletteIndex, filtered.length - 1);
    selectedPaletteIndex = Math.max(0, selectedPaletteIndex);

    paletteResults.innerHTML = filtered.map((cmd, idx) => `
      <div class="palette-item ${idx === selectedPaletteIndex ? 'selected' : ''}" data-cmd="${cmd.name}">
        <div class="p-item-left">
          <span class="p-cmd-name">${cmd.name}</span>
          <span class="p-cmd-desc">${cmd.desc}</span>
        </div>
        <span class="p-tag">${cmd.tag}</span>
      </div>
    `).join('');

    paletteResults.querySelectorAll('.palette-item').forEach(item => {
      item.addEventListener('click', () => {
        const c = item.getAttribute('data-cmd');
        executeSimulatorCommand(c);
        closePalette();
      });
    });
  }

  function openPalette() {
    playKeyClick();
    if (paletteModal) {
      paletteModal.classList.add('active');
      paletteModal.setAttribute('aria-hidden', 'false');
      if (paletteInput) {
        paletteInput.value = '';
        paletteInput.focus();
      }
      renderPaletteItems();
    }
  }

  function closePalette() {
    if (paletteModal) {
      paletteModal.classList.remove('active');
      paletteModal.setAttribute('aria-hidden', 'true');
    }
  }

  if (btnOpenPalette) btnOpenPalette.addEventListener('click', openPalette);

  if (paletteModal) {
    paletteModal.addEventListener('click', (e) => {
      if (e.target === paletteModal) closePalette();
    });
  }

  if (paletteInput) {
    paletteInput.addEventListener('input', (e) => {
      playKeyClick();
      selectedPaletteIndex = 0;
      renderPaletteItems(e.target.value);
    });

    paletteInput.addEventListener('keydown', (e) => {
      const items = paletteResults ? paletteResults.querySelectorAll('.palette-item') : [];
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        playKeyClick();
        selectedPaletteIndex = (selectedPaletteIndex + 1) % items.length;
        renderPaletteItems(paletteInput.value);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        playKeyClick();
        selectedPaletteIndex = (selectedPaletteIndex - 1 + items.length) % items.length;
        renderPaletteItems(paletteInput.value);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (items[selectedPaletteIndex]) {
          const c = items[selectedPaletteIndex].getAttribute('data-cmd');
          executeSimulatorCommand(c);
          closePalette();
        }
      } else if (e.key === 'Escape') {
        closePalette();
      }
    });
  }

  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openPalette();
    } else if (e.key === 'Escape') {
      closePalette();
    }
  });

  // ── 8. Interactive Terminal Simulator Playground ───────────────────
  const simTerminalOutput = document.getElementById('sim-terminal-output');
  const simTerminalForm = document.getElementById('sim-terminal-form');
  const simTerminalInput = document.getElementById('sim-terminal-input');
  const btnClearTerminal = document.getElementById('btn-clear-terminal');
  const quickCmdButtons = document.querySelectorAll('.btn-quick-cmd');
  const terminalCommandHistory = [];
  let terminalHistoryIndex = -1;

  function appendTerminalLine(type, text) {
    if (!simTerminalOutput) return;
    const line = document.createElement('div');
    line.className = `term-msg ${type}`;
    line.innerHTML = text;
    simTerminalOutput.appendChild(line);
    simTerminalOutput.scrollTop = simTerminalOutput.scrollHeight;
  }

  function appendTerminalLinesStaggered(lines, delayMs = 60) {
    lines.forEach((item, idx) => {
      setTimeout(() => {
        appendTerminalLine(item.type, item.text);
      }, idx * delayMs);
    });
  }

  function executeSimulatorCommand(cmd) {
    if (!cmd) return;
    playKeyClick();
    appendTerminalLine('cmd', `$ ${cmd}`);

    const clean = cmd.trim().toLowerCase();
    if (clean === '/drive') {
      playSuccessChime();
      appendTerminalLinesStaggered([
        { type: 'info', text: '[/drive] Iniciando meta-orquestador autónomo universal...' },
        { type: 'pass', text: '✓ 7 fases sincronizadas · 0 colisiones en AST namespace' },
        { type: 'pass', text: '✓ Consenso BFT alcanzado con 4/4 quórum de subagentes' },
        { type: 'pass', text: '✓ in-toto Statement v1 emitido con sobre DSSE' }
      ]);
    } else if (clean === '/verify') {
      playSuccessChime();
      appendTerminalLinesStaggered([
        { type: 'info', text: '[/verify] Ejecutando suite de 246 pruebas deterministas en 8 workers...' },
        { type: 'pass', text: '✓ [simulación] 246 suites · este panel no ejecuta la suite' }
      ]);
    } else if (clean.includes('rm -rf') || clean.includes('drop database') || clean.includes(':(){ :|:& };:')) {
      playAlertBeep();
      appendTerminalLinesStaggered([
        { type: 'deny', text: '🚨 [PREFLIGHT INTERCEPTOR] Veredicto: DENY (VIBEGUARD GATE)' },
        { type: 'deny', text: 'Vector destructivo interceptado antes de invocar sub-shell.' },
        { type: 'pass', text: '✓ Árbol protegido en modo Fail-Closed. Cero bytes modificados.' }
      ], 70);
    } else if (clean === '/snapshot') {
      playSuccessChime();
      appendTerminalLinesStaggered([
        { type: 'info', text: '[/snapshot] Creando punto de control inmutable SHA-256...' },
        { type: 'pass', text: '✓ Checkpoint "chk_2026_0902" sellado con éxito (131 archivos indexados).' }
      ]);
    } else if (clean === '/rollback') {
      playSuccessChime();
      appendTerminalLinesStaggered([
        { type: 'info', text: '[/rollback] Restaurando árbol al último punto de control...' },
        { type: 'pass', text: '✓ Reversión atómica completada en 3.8 ms. Árbol de archivos recuperado al 100%.' }
      ]);
    } else if (clean === '/premortem') {
      playSuccessChime();
      appendTerminalLinesStaggered([
        { type: 'info', text: '[/premortem] Ejecutando simulación adversarial pre-código...' },
        { type: 'pass', text: '✓ 3 vectores de falla evaluados · Radio de explosión delimitado al submódulo.' }
      ]);
    } else if (clean === '/attest') {
      playSuccessChime();
      appendTerminalLinesStaggered([
        { type: 'info', text: '[/attest] Generando atestación criptográfica in-toto Statement v1...' },
        { type: 'pass', text: '✓ Sobre DSSE generado con clave Ed25519 (Digest: 2253d4c4...)' }
      ]);
    } else {
      appendTerminalLinesStaggered([
        { type: 'info', text: `[axion] Comando procesado: "${cmd}". Ejecutando preflight síncrono...` },
        { type: 'pass', text: '✓ Veredicto: ALLOW (Sin riesgos destructivos detectados)' }
      ]);
    }
  }

  if (simTerminalForm && simTerminalInput) {
    simTerminalInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp') {
        if (terminalCommandHistory.length > 0 && terminalHistoryIndex < terminalCommandHistory.length - 1) {
          e.preventDefault();
          terminalHistoryIndex++;
          simTerminalInput.value = terminalCommandHistory[terminalCommandHistory.length - 1 - terminalHistoryIndex];
        }
      } else if (e.key === 'ArrowDown') {
        if (terminalHistoryIndex > 0) {
          e.preventDefault();
          terminalHistoryIndex--;
          simTerminalInput.value = terminalCommandHistory[terminalCommandHistory.length - 1 - terminalHistoryIndex];
        } else if (terminalHistoryIndex === 0) {
          e.preventDefault();
          terminalHistoryIndex = -1;
          simTerminalInput.value = '';
        }
      }
    });

    simTerminalForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = simTerminalInput.value.trim();
      if (val) {
        terminalCommandHistory.push(val);
        terminalHistoryIndex = -1;
        executeSimulatorCommand(val);
        simTerminalInput.value = '';
      }
    });
  }

  quickCmdButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const c = btn.getAttribute('data-cmd');
      if (c) {
        terminalCommandHistory.push(c);
        terminalHistoryIndex = -1;
        executeSimulatorCommand(c);
      }
    });
  });

  if (btnClearTerminal && simTerminalOutput) {
    btnClearTerminal.addEventListener('click', () => {
      playKeyClick();
      simTerminalOutput.innerHTML = '<div class="term-msg info">Terminal limpiado. Listo para nuevas instrucciones.</div>';
    });
  }

  // ── 9. Swarm BFT Consensus Simulator ───────────────────────────────
  const btnTriggerConsensus = document.getElementById('btn-trigger-consensus');
  const agentNodes = document.querySelectorAll('#agent-nodes-container .agent-node');
  const quorumVal = document.getElementById('quorum-val');
  const quorumBarFill = document.getElementById('quorum-bar-fill');
  const quorumResultText = document.getElementById('quorum-result-text');

  if (btnTriggerConsensus) {
    btnTriggerConsensus.addEventListener('click', () => {
      playKeyClick();
      agentNodes.forEach(node => {
        node.classList.remove('voted-pass');
        const voteEl = node.querySelector('.node-vote');
        if (voteEl) voteEl.textContent = currentLang === 'en' ? 'Deliberating...' : 'Deliberando...';
      });

      if (quorumVal) quorumVal.textContent = '0%';
      if (quorumBarFill) quorumBarFill.style.width = '0%';
      if (quorumResultText) quorumResultText.textContent = currentLang === 'en' ? 'Initiating cryptographic voting...' : 'Iniciando votación criptográfica...';

      let votes = 0;
      const total = agentNodes.length;

      agentNodes.forEach((node, idx) => {
        setTimeout(() => {
          playKeyClick();
          node.classList.add('voted-pass');
          const voteEl = node.querySelector('.node-vote');
          if (voteEl) voteEl.textContent = currentLang === 'en' ? '✓ Approved (Pass)' : '✓ Aprobado (Pass)';
          votes++;
          const pct = Math.round((votes / total) * 100);
          if (quorumVal) quorumVal.textContent = `${pct}%`;
          if (quorumBarFill) quorumBarFill.style.width = `${pct}%`;

          if (votes === total) {
            playSuccessChime();
            if (quorumResultText) {
              quorumResultText.textContent = currentLang === 'en'
                ? '✓ BFT Quorum reached (100% ≥ 66.7%). Mutation authorized and sealed in DSSE.'
                : '✓ Quórum BFT alcanzado (100% ≥ 66.7%). Mutación autorizada y sellada en DSSE.';
            }
            showToast(currentLang === 'en' ? '✓ BFT consensus quorum reached' : '✓ Quórum de consenso BFT alcanzado');
          }
        }, (idx + 1) * 350);
      });
    });
  }

  // ── 10. Socratic IntentContract Sealer ──────────────────────────────
  const socraticOptions = document.querySelectorAll('.options-list .opt-btn');
  const sealHashDisplay = document.getElementById('seal-hash-display');
  const contractCodeDisplay = document.getElementById('contract-code-display');
  const btnCopyContract = document.getElementById('btn-copy-contract');
  const contractPreviewBox = document.querySelector('.contract-preview-box');

  function scrambleHashEffect(element, targetText) {
    if (!element) return;
    const hexChars = '0123456789abcdef';
    let count = 0;
    const maxIterations = 8;
    const interval = setInterval(() => {
      count++;
      if (count >= maxIterations) {
        clearInterval(interval);
        element.textContent = targetText;
      } else {
        const randHex = Array.from({ length: 8 }, () => hexChars[Math.floor(Math.random() * hexChars.length)]).join('');
        element.textContent = randHex + '...' + targetText.slice(-4);
      }
    }, 28);
  }

  function triggerCopyAnimation(btnElement) {
    if (!btnElement) return;
    btnElement.classList.remove('copy-success-pulse');
    void btnElement.offsetWidth;
    btnElement.classList.add('copy-success-pulse');
    setTimeout(() => {
      btnElement.classList.remove('copy-success-pulse');
    }, 1800);
  }

  const contractPresets = [
    {
      hash: 'e8a419c9...f2b4',
      code: `{\n  "version": "1.2.0",\n  "intent_type": "ATOMIC_REFACTOR",\n  "scope": "INTERNAL_LOGIC_ONLY",\n  "rollback_strategy": "SHA256_SNAPSHOT",\n  "socratic_confirmed": true,\n  "human_authority": "GRANTED",\n  "manifest_digest": "e8a419c9fb7283d84a1e948c..."\n}`
    },
    {
      hash: 'b37f20aa...c891',
      code: `{\n  "version": "1.2.0",\n  "intent_type": "NEW_ISOLATED_MODULE",\n  "scope": "TDD_ASSERTIONS_FIRST",\n  "rollback_strategy": "SHA256_SNAPSHOT",\n  "socratic_confirmed": true,\n  "human_authority": "GRANTED",\n  "manifest_digest": "b37f20aac1098234ff12817d..."\n}`
    },
    {
      hash: '7d91e452...11a9',
      code: `{\n  "version": "1.2.0",\n  "intent_type": "STRUCTURAL_MIGRATION",\n  "scope": "MULTI_HARNESS_ADAPTER",\n  "rollback_strategy": "SHA256_SNAPSHOT",\n  "socratic_confirmed": true,\n  "human_authority": "GRANTED",\n  "manifest_digest": "7d91e4529aa8716b12918820..."\n}`
    }
  ];

  socraticOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      playKeyClick();
      socraticOptions.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      const idx = parseInt(opt.getAttribute('data-opt'), 10) || 0;
      const data = contractPresets[idx];
      if (data) {
        if (contractPreviewBox) {
          contractPreviewBox.classList.remove('contract-sealed-pulse');
          void contractPreviewBox.offsetWidth;
          contractPreviewBox.classList.add('contract-sealed-pulse');
        }
        if (contractCodeDisplay) {
          contractCodeDisplay.textContent = data.code;
          contractCodeDisplay.classList.remove('code-flash');
          void contractCodeDisplay.offsetWidth;
          contractCodeDisplay.classList.add('code-flash');
        }
        if (sealHashDisplay) {
          scrambleHashEffect(sealHashDisplay, data.hash);
        }
        playSuccessChime();
      }
    });
  });

  if (btnCopyContract && contractCodeDisplay) {
    btnCopyContract.addEventListener('click', () => {
      navigator.clipboard.writeText(contractCodeDisplay.textContent).then(() => {
        playSuccessChime();
        triggerCopyAnimation(btnCopyContract);
        showToast(I18N[currentLang].toastCopied);
      }).catch((err) => {
        console.debug('Copy error:', err);
      });
    });
  }

  function hexToRgba(hex, alpha) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
  }

  // ── 11. Interactive Architecture Radar Canvas Engine (Retina 2x/3x) ──
  const radarCanvas = document.getElementById('radar-canvas');
  const radarFilters = document.querySelectorAll('.radar-filter-chips .r-chip');
  const btnHighlightBlast = document.getElementById('btn-highlight-blast');
  const inspDomain = document.getElementById('insp-domain');
  const inspTitle = document.getElementById('insp-title');
  const inspDesc = document.getElementById('insp-desc');
  const inspRadius = document.getElementById('insp-radius');
  const inspTransitive = document.getElementById('insp-transitive');
  const inspSig = document.getElementById('insp-sig');
  const inspIsolation = document.getElementById('insp-isolation');

  if (radarCanvas) {
    const ctx = radarCanvas.getContext('2d');
    let width = 1140;
    let height = 480;

    function resizeRadar() {
      const rect = radarCanvas.getBoundingClientRect();
      width = rect.width || 1140;
      height = 480;
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      radarCanvas.width = Math.round(width * dpr);
      radarCanvas.height = Math.round(height * dpr);
      radarCanvas.style.width = width + 'px';
      radarCanvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    }
    resizeRadar();
    window.addEventListener('resize', resizeRadar);

    const RADAR_NODES = [
      // 01 Governance
      { id: 'preflight', label: 'tools/preflight.js', domain: 'gov', color: '#10B981', x: 220, y: 140, r: 13, blastRadius: '8 módulos dependientes', transitive: 'Atómico (Nivel 2)', sig: 'SHA-256 Validado', isolation: 'shell: false', desc: 'Supervisión síncrona previa a la ejecución de comandos. Intercepta vectores destructivos en modo Fail-Closed.' },
      { id: 'drive', label: 'tools/drive_engine.js', domain: 'gov', color: '#10B981', x: 140, y: 240, r: 15, blastRadius: '14 módulos dependientes', transitive: 'Cierre Transitivo Nivel 3', sig: 'Ed25519 DSSE', isolation: 'Autonomous Sandbox', desc: 'Meta-orquestador autónomo universal. Deliberación adaptativa y convergencia a cero errores.' },
      { id: 'cross_healer', label: 'tools/multi_file_cross_healer.js', domain: 'gov', color: '#10B981', x: 300, y: 250, r: 11, blastRadius: '6 módulos dependientes', transitive: 'Inverso Transitivo', sig: 'AST Reconciled', isolation: 'Safe Rollback Plan', desc: 'Auto-curación multi-archivo con cálculo de cierre transitivo y resolución atómica de dependencias.' },
      { id: 'vibeguard', label: 'tools/vibeguard_gate.js', domain: 'gov', color: '#10B981', x: 100, y: 130, r: 10, blastRadius: '129 archivos auditados', transitive: 'Zero Antipatterns', sig: 'Lexical Guard', isolation: 'Strict Static AST', desc: 'Escáner estricto de calidad de código y antipatrones con bloqueo automático ante malas prácticas.' },
      { id: 'hardware_prof', label: 'tools/hardware_profiler.js', domain: 'gov', color: '#10B981', x: 200, y: 360, r: 9, blastRadius: 'Adaptive Worker Pool', transitive: 'RAM / Core Tuned', sig: 'Hardware Calibrated', isolation: 'OS Native', desc: 'Perfilador dinámico de hardware para balanceo de carga en pruebas de 8 a 16 workers.' },

      // 02 Cryptography
      { id: 'attest', label: 'tools/attest.js', domain: 'crypto', color: '#A78BFA', x: 460, y: 120, r: 14, blastRadius: 'Cadena de Atestación', transitive: 'in-toto Statement v1', sig: 'Ed25519 Signature', isolation: 'PAE Encoded', desc: 'Generador de sobres criptográficos DSSE y atestaciones de procedencia in-toto v1 compatibles con SLSA y Cosign.' },
      { id: 'evidence_hasher', label: 'tools/evidence_hasher.js', domain: 'crypto', color: '#A78BFA', x: 560, y: 200, r: 11, blastRadius: 'Manifest SHA-256', transitive: 'Deterministic Graph', sig: 'RFC 8785 Canonical', isolation: 'Immutable Store', desc: 'Serializador canónico RFC 8785 y emisor de sellos inmutables de evidencia de ejecución.' },
      { id: 'revocation_gate', label: 'tools/revocation_manager.js', domain: 'crypto', color: '#A78BFA', x: 400, y: 230, r: 9, blastRadius: 'Key Lifecycle', transitive: 'Fail-Closed Revocation', sig: 'Cryptographic Fence', isolation: 'Hardware Bound', desc: 'Gestor del ciclo de vida y revocación instantánea de llaves asimétricas Ed25519.' },

      // 03 Intent & UX
      { id: 'clarifier', label: 'tools/clarifier.js', domain: 'intent', color: '#38BDF8', x: 700, y: 130, r: 13, blastRadius: 'Socratic Gate', transitive: 'IntentContract v1.2', sig: 'SHA-256 Sealed', isolation: 'Pre-Code Fence', desc: 'Freno socrático de 2 preguntas con opciones A/B/C humanas que sella la intención antes de permitir modificaciones.' },
      { id: 'socratic_planner', label: 'tools/multidimensional_socratic_planner.js', domain: 'intent', color: '#38BDF8', x: 800, y: 210, r: 12, blastRadius: 'Matriz Multidimensional', transitive: 'Contrato Socrático', sig: 'Deterministic JSON', isolation: 'Human Choice Bound', desc: 'Planificador y compilador de contratos socráticos multidimensionales con persistencia inmutable.' },
      { id: 'mission_vault', label: 'tools/mission_backlog_vault.js', domain: 'intent', color: '#38BDF8', x: 660, y: 250, r: 10, blastRadius: 'Bóveda de Misiones', transitive: 'Multi-Session Store', sig: 'Rank Prioritized', isolation: 'Persistent Vault', desc: 'Bóveda permanente de misiones y formateador visual con ordenamiento por impacto y dependencias.' },

      // 04 State & Recovery
      { id: 'snapshot', label: 'tools/snapshot.js', domain: 'state', color: '#F59E0B', x: 370, y: 370, r: 13, blastRadius: 'Atomic Tree Checkpoint', transitive: 'Merkle Root Validated', sig: 'SHA-256 Manifest', isolation: 'Snapshot Isolation', desc: 'Creación y verificación atómica de checkpoints del árbol de archivos independientes de Git.' },
      { id: 'rollback', label: 'tools/rollback.js', domain: 'state', color: '#F59E0B', x: 490, y: 420, r: 13, blastRadius: 'Full Worktree Restore', transitive: 'Sub-5ms Byte Accurate', sig: '0 Orphaned Files', isolation: 'Fail-Safe Restore', desc: 'Motor de reversión determinista instantáneo verificado contra el árbol Merkle de ejecución.' },
      { id: 'context_shield', label: 'tools/context_shield.js', domain: 'state', color: '#F59E0B', x: 590, y: 340, r: 11, blastRadius: 'Memory & Context Drift', transitive: 'Cross-Runtime Anchor', sig: 'Entropy Guarded', isolation: 'Clean Window', desc: 'Anclaje anti-deriva y preservación de memoria contextual persistente entre sesiones de trabajo.' },

      // 05 Resilience
      { id: 'premortem', label: 'tools/premortem.js', domain: 'resilience', color: '#EF4444', x: 850, y: 350, r: 13, blastRadius: 'Failure Simulation', transitive: '6-Month Postmortem', sig: 'Adversarial Defense', isolation: 'Sandbox Audit', desc: 'Simulación adversarial pre-código y cálculo de radio de explosión para prevenir fallas silenciosas.' },
      { id: 'fuzzer_10k', label: 'tools/chaos_fuzzer_10k.js', domain: 'resilience', color: '#EF4444', x: 750, y: 420, r: 12, blastRadius: '10.000 Vectores Caos', transitive: '0% Evasión Verificada', sig: 'Burst Invariant', isolation: 'Isolated Process', desc: 'Motor de pruebas de caos masivo con 10.000 mutaciones de ataque para verificar la inviolabilidad fail-closed.' },
      { id: 'type_reconciler', label: 'tools/semantic_type_reconciler.js', domain: 'resilience', color: '#EF4444', x: 900, y: 240, r: 10, blastRadius: 'AST Type Invariants', transitive: 'SMT Verified Guard', sig: 'Backpropagated Fix', isolation: 'Zero Runtime Error', desc: 'Reconciliador semántico de tipos en tiempo de ejecución con retropropagación de guardas canónicas.' }
    ];

    const RADAR_EDGES = [
      { from: 'preflight', to: 'drive' },
      { from: 'preflight', to: 'vibeguard' },
      { from: 'drive', to: 'cross_healer' },
      { from: 'drive', to: 'hardware_prof' },
      { from: 'drive', to: 'attest' },
      { from: 'attest', to: 'evidence_hasher' },
      { from: 'attest', to: 'revocation_gate' },
      { from: 'clarifier', to: 'socratic_planner' },
      { from: 'socratic_planner', to: 'mission_vault' },
      { from: 'socratic_planner', to: 'drive' },
      { from: 'snapshot', to: 'rollback' },
      { from: 'snapshot', to: 'context_shield' },
      { from: 'rollback', to: 'cross_healer' },
      { from: 'premortem', to: 'fuzzer_10k' },
      { from: 'fuzzer_10k', to: 'preflight' },
      { from: 'type_reconciler', to: 'premortem' },
      { from: 'type_reconciler', to: 'cross_healer' },
      { from: 'evidence_hasher', to: 'snapshot' }
    ];

    let selectedNode = RADAR_NODES[0];
    let activeDomainFilter = 'all';
    let blastSimulationActive = false;
    let blastAnimFrame = 0;
    let hoveredNode = null;

    function selectRadarNode(node) {
      if (!node) return;
      selectedNode = node;
      playKeyClick();
      
      if (inspDomain) inspDomain.textContent = node.domain === 'gov' ? '01_governance_preflight' : node.domain === 'crypto' ? '02_cryptography_attestation' : node.domain === 'intent' ? '03_intent_socratic' : node.domain === 'state' ? '04_state_recovery' : '05_adversarial_resilience';
      if (inspTitle) inspTitle.textContent = node.label;
      if (inspDesc) inspDesc.textContent = node.desc;
      if (inspRadius) inspRadius.textContent = node.blastRadius;
      if (inspTransitive) inspTransitive.textContent = node.transitive;
      if (inspSig) inspSig.textContent = node.sig;
      if (inspIsolation) inspIsolation.textContent = node.isolation;
    }

    function renderRadar() {
      ctx.clearRect(0, 0, width, height);
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';

      // Grid de fondo con precisión sub-píxel
      ctx.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.06)' : 'rgba(255, 255, 255, 0.035)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Conexiones vectoriales con suavizado
      RADAR_EDGES.forEach(edge => {
        const fromNode = RADAR_NODES.find(n => n.id === edge.from);
        const toNode = RADAR_NODES.find(n => n.id === edge.to);
        if (!fromNode || !toNode) return;

        const isHighlighted = (selectedNode && (edge.from === selectedNode.id || edge.to === selectedNode.id));
        const isDimmed = activeDomainFilter !== 'all' && (fromNode.domain !== activeDomainFilter && toNode.domain !== activeDomainFilter);

        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);

        if (isHighlighted) {
          ctx.strokeStyle = isLight ? '#059669' : '#10B981';
          ctx.lineWidth = 2.5;
        } else if (isDimmed) {
          ctx.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.04)' : 'rgba(255, 255, 255, 0.03)';
          ctx.lineWidth = 1;
        } else {
          ctx.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.16)' : 'rgba(255, 255, 255, 0.14)';
          ctx.lineWidth = 1.2;
        }
        ctx.stroke();
      });

      // Animación de Onda de Blast Radius
      if (blastSimulationActive && selectedNode) {
        blastAnimFrame = (blastAnimFrame + 1) % 60;
        const radiusAnim = (blastAnimFrame / 60) * 140;
        const alpha = 1 - (blastAnimFrame / 60);

        ctx.beginPath();
        ctx.arc(selectedNode.x, selectedNode.y, radiusAnim, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(16, 185, 129, ${alpha})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Nodos con Halo de Brillo Retina 2x/3x
      RADAR_NODES.forEach(node => {
        const isSelected = selectedNode && selectedNode.id === node.id;
        const isHovered = hoveredNode && hoveredNode.id === node.id;
        const isDimmed = activeDomainFilter !== 'all' && node.domain !== activeDomainFilter;

        // 1. Halo difuso multicapa
        if (!isDimmed) {
          const glowMultiplier = isSelected ? 3.2 : (isHovered ? 2.6 : 1.9);
          const glowGrad = ctx.createRadialGradient(node.x, node.y, node.r * 0.4, node.x, node.y, node.r * glowMultiplier);
          const haloAlpha = isSelected ? 0.42 : (isHovered ? 0.32 : 0.16);
          glowGrad.addColorStop(0, hexToRgba(node.color, haloAlpha));
          glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.r * glowMultiplier, 0, Math.PI * 2);
          ctx.fillStyle = glowGrad;
          ctx.fill();
        }

        // 2. Núcleo con gradiente y specular highlight
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        if (isDimmed) {
          ctx.fillStyle = isLight ? 'rgba(15, 23, 42, 0.1)' : 'rgba(255, 255, 255, 0.08)';
        } else {
          const coreGrad = ctx.createRadialGradient(node.x - node.r * 0.3, node.y - node.r * 0.3, 1, node.x, node.y, node.r);
          coreGrad.addColorStop(0, isSelected ? '#FFFFFF' : hexToRgba(node.color, 1));
          coreGrad.addColorStop(1, isSelected ? node.color : hexToRgba(node.color, 0.78));
          ctx.fillStyle = coreGrad;
        }
        ctx.fill();

        // 3. Anillo de borde sub-píxel
        ctx.strokeStyle = isSelected 
          ? (isLight ? '#0F172A' : '#FFFFFF') 
          : (isHovered ? (isLight ? '#059669' : '#10B981') : hexToRgba(node.color, 0.6));
        ctx.lineWidth = isSelected ? 2.5 : (isHovered ? 2 : 1.2);
        ctx.stroke();

        // 4. Tipografía con sombra de contraste calibrada
        ctx.font = isSelected ? '700 11px JetBrains Mono, monospace' : '600 10px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        if (!isLight) {
          ctx.fillStyle = isDimmed ? 'rgba(0, 0, 0, 0.4)' : 'rgba(5, 7, 11, 0.85)';
          ctx.fillText(node.label.split('/').pop(), node.x + 1, node.y + node.r + 15);
        }
        ctx.fillStyle = isDimmed 
          ? (isLight ? 'rgba(15, 23, 42, 0.35)' : 'rgba(255, 255, 255, 0.25)') 
          : (isSelected ? (isLight ? '#047857' : '#FFFFFF') : (isLight ? '#0F172A' : '#E2E8F0'));
        ctx.fillText(node.label.split('/').pop(), node.x, node.y + node.r + 14);
      });

      requestAnimationFrame(renderRadar);
    }
    renderRadar();

    radarCanvas.addEventListener('mousemove', (e) => {
      const rect = radarCanvas.getBoundingClientRect();
      const scaleX = width / rect.width;
      const scaleY = height / rect.height;
      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;

      let found = null;
      for (const node of RADAR_NODES) {
        const dist = Math.hypot(node.x - mouseX, node.y - mouseY);
        if (dist <= node.r + 8) {
          found = node;
          break;
        }
      }
      hoveredNode = found;
      radarCanvas.style.cursor = found ? 'pointer' : 'crosshair';
    });

    radarCanvas.addEventListener('click', () => {
      if (hoveredNode) {
        selectRadarNode(hoveredNode);
        playRadarPing();
      }
    });

    radarFilters.forEach(chip => {
      chip.addEventListener('click', () => {
        playKeyClick();
        radarFilters.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        activeDomainFilter = chip.getAttribute('data-domain');
      });
    });

    if (btnHighlightBlast) {
      btnHighlightBlast.addEventListener('click', () => {
        playSuccessChime();
        blastSimulationActive = true;
        showToast(currentLang === 'en' ? `💥 Simulating Blast Radius for ${selectedNode.label}` : `💥 Simulando Blast Radius para ${selectedNode.label}`);
        setTimeout(() => { blastSimulationActive = false; }, 3200);
      });
    }
  }

  // ── 12. Live Throughput Canvas Chart Streamer (Splines Bézier Continuas) ──
  const chartCanvas = document.getElementById('telemetry-chart');
  if (chartCanvas) {
    const ctx = chartCanvas.getContext('2d');
    let dataPoints = Array.from({ length: 40 }, () => Math.floor(Math.random() * 200 + 1550));
    let lastWidth = 0;
    let cachedW = 600;
    const h = 180;

    function resizeChartCanvas() {
      const rect = chartCanvas.getBoundingClientRect();
      const w = rect.width || 600;
      cachedW = w;
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      if (Math.abs(lastWidth - w) > 2) {
        lastWidth = w;
        chartCanvas.width = Math.round(w * dpr);
        chartCanvas.height = Math.round(h * dpr);
        chartCanvas.style.width = w + 'px';
        chartCanvas.style.height = h + 'px';
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    }
    resizeChartCanvas();
    window.addEventListener('resize', resizeChartCanvas);

    function drawChart() {
      const w = cachedW;
      ctx.clearRect(0, 0, w, h);
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';

      // Líneas de cuadrícula sutiles calibradas
      ctx.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.06)' : 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let y = 30; y < h; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Calcular puntos normalizados
      const step = w / (dataPoints.length - 1);
      const points = dataPoints.map((val, idx) => {
        const x = idx * step;
        const normalized = (val - 1400) / 500;
        const y = h - (normalized * (h - 30)) - 15;
        return { x, y };
      });

      // Trazar Spline Bézier Continua
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 0; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      const lastPoint = points[points.length - 1];
      ctx.lineTo(lastPoint.x, lastPoint.y);

      // Trazo resplandeciente
      ctx.save();
      ctx.shadowColor = isLight ? 'rgba(5, 150, 105, 0.45)' : 'rgba(16, 185, 129, 0.65)';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = isLight ? '#059669' : '#10B981';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();

      // Relleno de área bajo la spline con gradiente vertical
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      const gradient = ctx.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, isLight ? 'rgba(5, 150, 105, 0.2)' : 'rgba(16, 185, 129, 0.28)');
      gradient.addColorStop(0.7, isLight ? 'rgba(5, 150, 105, 0.04)' : 'rgba(16, 185, 129, 0.06)');
      gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
      ctx.fillStyle = gradient;
      ctx.fill();

      // Beacon pulsante en el punto más reciente (Head Node)
      const beaconGrad = ctx.createRadialGradient(lastPoint.x, lastPoint.y, 2, lastPoint.x, lastPoint.y, 14);
      beaconGrad.addColorStop(0, isLight ? 'rgba(5, 150, 105, 0.95)' : 'rgba(16, 185, 129, 0.9)');
      beaconGrad.addColorStop(0.4, isLight ? 'rgba(5, 150, 105, 0.4)' : 'rgba(16, 185, 129, 0.4)');
      beaconGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
      ctx.beginPath();
      ctx.arc(lastPoint.x, lastPoint.y, 14, 0, Math.PI * 2);
      ctx.fillStyle = beaconGrad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(lastPoint.x, lastPoint.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    setInterval(() => {
      dataPoints.shift();
      const nextVal = Math.floor(Math.random() * 150 + 1580);
      dataPoints.push(nextVal);
      const rateEl = document.getElementById('telemetry-live-rate');
      if (rateEl) rateEl.textContent = `${nextVal.toLocaleString()} ops/s`;
      drawChart();
    }, 800);
    drawChart();
  }

  // ── 13. Package Manager Switcher & Copy CLI ────────────────────────
  const pmTabs = document.querySelectorAll('.tab-btn');
  const installCmd = document.getElementById('install-cmd');
  const copyBtn = document.getElementById('btn-copy-install');
  const copyLabel = document.getElementById('copy-label');

  const pmCommands = {
    npx: 'npx axion-protocol onboard',
    node: 'node dist/axion.bundle.js help',
    pnpm: 'pnpm dlx axion-protocol onboard'
  };

  pmTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      playKeyClick();
      pmTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const pm = tab.getAttribute('data-pm');
      if (installCmd && pmCommands[pm]) {
        installCmd.textContent = pmCommands[pm];
      }
    });
  });

  if (copyBtn && installCmd) {
    copyBtn.addEventListener('click', () => {
      const text = installCmd.textContent.trim();
      navigator.clipboard.writeText(text).then(() => {
        playSuccessChime();
        triggerCopyAnimation(copyBtn);
        showToast(I18N[currentLang].toastCopied);
        if (copyLabel) {
          copyLabel.textContent = '✓';
          setTimeout(() => { copyLabel.textContent = I18N[currentLang].copyLabel; }, 1800);
        }
      }).catch((err) => {
        console.debug('Copy error:', err);
        showToast(I18N[currentLang].toastCopyFail);
      });
    });
  }

  // ── 14. Slash Commands Search & Filter ─────────────────────────────
  const cmdFilterChips = document.querySelectorAll('#cmd-filter-chips .chip-btn');
  const cmdSearchInput = document.getElementById('cmd-search-input');
  const cmdItems = document.querySelectorAll('#commands-list .cmd-item');

  function filterCommands() {
    const activeChip = document.querySelector('#cmd-filter-chips .chip-btn.active');
    const filterCat = activeChip ? activeChip.getAttribute('data-filter') : 'all';
    const query = (cmdSearchInput ? cmdSearchInput.value : '').toLowerCase().trim();

    cmdItems.forEach(item => {
      const cat = item.getAttribute('data-cat') || 'governance';
      const text = item.textContent.toLowerCase();

      const matchesCat = filterCat === 'all' || cat === filterCat;
      const matchesQuery = !query || text.includes(query);

      item.style.display = (matchesCat && matchesQuery) ? 'block' : 'none';
    });
  }

  cmdFilterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      playKeyClick();
      cmdFilterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      filterCommands();
    });
  });

  if (cmdSearchInput) {
    cmdSearchInput.addEventListener('input', () => {
      playKeyClick();
      filterCommands();
    });
  }

  // ── 15. 7-Step Pipeline Stepper Interaction ────────────────────────
  const stepCards = document.querySelectorAll('#pipeline-stepper .step-card');
  stepCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      playKeyClick();
      stepCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
    });
  });

  // ── 16. Live Telemetry WebSocket Stream (RFC 6455) ─────────────────
  const consoleFeed = document.getElementById('console-stream-feed');
  const telemetryDot = document.getElementById('telemetry-dot');
  const telemetryText = document.getElementById('telemetry-text');

  function connectTelemetry() {
    try {
      const ws = new WebSocket('ws://localhost:8765');

      ws.onopen = () => {
        if (telemetryDot) telemetryDot.style.background = '#00F5A0';
        if (telemetryText) telemetryText.textContent = 'WS: Conectado (8765)';
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (consoleFeed) {
            const timeStr = new Date().toTimeString().split(' ')[0];
            const line = document.createElement('div');
            line.className = 'stream-line highlight';
            line.innerHTML = `<span class="ts">[${timeStr}]</span> <span class="badge pass">${data.type || 'EVENT'}</span> ${JSON.stringify(data.payload || {})}`;
            consoleFeed.appendChild(line);
            if (consoleFeed.children.length > 8) {
              consoleFeed.removeChild(consoleFeed.firstChild);
            }
          }
        } catch (parseErr) {
          console.debug('Telemetry parse error:', parseErr);
        }
      };

      ws.onerror = (wsErr) => {
        if (telemetryDot) telemetryDot.style.background = '#10B981';
        console.debug('Telemetry offline (operating in static mode):', wsErr);
      };
    } catch (connErr) {
      console.debug('WebSocket error:', connErr);
    }
  }

  connectTelemetry();

  // ── 17. Motor Universal de Traducción Dinámica (EN / ES) ───────────
  const langButtons = document.querySelectorAll('.btn-lang');

  function applyLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('axion_lang', lang);
    document.documentElement.lang = lang;

    langButtons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });

    const dict = I18N[lang];
    if (!dict) return;

    // Actualizar todos los elementos con data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) {
        el.innerHTML = dict[key];
      }
    });

    // Actualizar placeholders con data-i18n-placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (dict[key]) {
        el.placeholder = dict[key];
      }
    });

    if (copyLabel) copyLabel.textContent = dict.copyLabel;
  }

  langButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      playKeyClick();
      const l = btn.getAttribute('data-lang');
      applyLanguage(l);
      showToast(I18N[l].toastLang);
    });
  });

  applyLanguage(currentLang);
});
