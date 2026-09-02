/**
 * Axion Protocol — Client Controller & Live Telemetry Streamer (v2.0)
 * Native RFC 6455 WebSocket integration + Bilingual I18N Engine + Zero Dependencies.
 */

document.addEventListener('DOMContentLoaded', () => {

  // ── 1. Diccionario Bilingüe de Textos de Ingeniería (EN / ES) ──────
  const I18N = {
    en: {
      toastLang: '✓ English language selected',
      toastThemeDark: '✓ Dark mode enabled',
      toastThemeLight: '✓ Light mode enabled',
      toastCopied: '✓ Command copied to clipboard',
      toastCopyFail: 'Could not copy to clipboard automatically.',
      statusPill: 'v2.0.0-rc.1 · 201 Suites PASS',
      heroEyebrow: 'LOCAL GOVERNANCE HARNESS (EXPERIMENTAL)',
      heroTitle: 'Local deterministic governance and runtime arbitration for AI agents.',
      heroLead: 'Execution engine operating in <code>fail-closed</code> mode (95.7 KB). Intercepts terminal tool calls with <code>shell: false</code>, arbitrates concurrent AST namespace collisions, and guarantees SHA-256 byte-accurate state rollback.',
      heroTagText: '0 THIRD-PARTY DEPENDENCIES · EXECUTION HARNESS',
      copyLabel: 'Copy',
      telemetryStatus: '201 Suites PASS',
      statDeps: '<strong>0</strong> dependencies',
      statSize: '<strong>95.7 KB</strong> standalone',
      statSuites: '<strong>201/201</strong> suites PASS',
      statCmds: '<strong>12</strong> slash commands',
      statSafety: '<strong>Fail-Closed</strong> by design',
      swarmBadge: 'MULTI-AGENT CONCURRENCY',
      swarmTitle: 'Swarm Architecture v2.0',
      swarmDesc: 'Three decoupled mathematical pillars to coordinate AI swarms without race conditions or blind overrides:',
      pillar1Title: 'Granular AST Symbol Locking',
      pillar1Desc: 'Manages atomic editing permissions on individual functions and classes instead of locking entire files.',
      pillar2Title: 'P2P Message Bus with Asymmetric Signing',
      pillar2Desc: 'Direct inter-agent communication channel authenticated with ephemeral Ed25519 keypairs.',
      pillar3Title: 'Byzantine Consensus Quorum (BFT ≥ 66%)',
      pillar3Desc: 'No structural code mutation is applied without reaching a qualified supermajority of 66.7% of evaluator votes.',
      pipeBadge: 'DETERMINISTIC LIFECYCLE',
      pipeTitle: 'Unified 7-Step Workflow',
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
      step06Desc: 'Runs the full 201 automated test suites, performs strict VibeGuard anti-pattern scans, and validates exit code 0.',
      step07Name: 'PROMOTE',
      step07Desc: 'Issues in-toto Statement v1 cryptographic provenance in DSSE envelope with Ed25519 signature and localized summary.',
      compatBadge: 'TOTAL INTEROPERABILITY',
      compatTitle: 'Universal Platform Support',
      compatDesc: 'Axion Protocol operates without friction across primary AI assisted development environments:',
      cmdBadge: 'OPERATIONAL CATALOG',
      cmdTitle: '12 Governance Slash Commands',
      cmdDesc: 'Universal commands designed to coexist without collisions in any terminal environment:',
      chipAll: 'All (12)',
      chipGov: 'Governance',
      chipIntent: 'Intent & UX',
      chipState: 'State & Checkpoints',
      chipCrypto: 'Cryptography',
      cmdSearchPlaceholder: 'Search slash command (/drive, /verify, /rollback)...',
      sbomBadge: 'COMPLIANCE & SUPPLY CHAIN',
      sbomTitle: 'CycloneDX v1.5 and SPDX 2.3 SBOM Manifests',
      sbomDesc: 'Every module, tool, and command of Axion Protocol is indexed with its SHA-256 fingerprint under Apache-2.0 license.',
      footerTagline: 'Deterministic governance runtime for autonomous AI agent operations.',
      footerCopy: '© 2026 Axion Protocol. Zero third-party telemetry. 100% open-source and local execution.'
    },
    es: {
      toastLang: '✓ Idioma español seleccionado',
      toastThemeDark: '✓ Modo oscuro activado',
      toastThemeLight: '✓ Modo claro activado',
      toastCopied: '✓ Comando copiado al portapapeles',
      toastCopyFail: 'No se pudo copiar automáticamente.',
      statusPill: 'v2.0.0-rc.1 · 201 Suites PASS',
      heroEyebrow: 'ARNÉS DE GOBERNANZA LOCAL (EXPERIMENTAL)',
      heroTitle: 'Gobernanza local y arbitraje determinista para agentes de IA.',
      heroLead: 'Motor de ejecución en modo <code>fail-closed</code> (95.7 KB). Intercepta llamadas de terminal sin sub-shell, arbitra colisiones concurrentes en el árbol AST y garantiza reversión atómica verificada con SHA-256.',
      heroTagText: '0 DEPENDENCIAS EXTERNAS · EXECUTION HARNESS',
      copyLabel: 'Copiar',
      telemetryStatus: '201 Suites PASS',
      statDeps: '<strong>0</strong> dependencias',
      statSize: '<strong>95.7 KB</strong> standalone',
      statSuites: '<strong>201/201</strong> suites PASS',
      statCmds: '<strong>12</strong> slash commands',
      statSafety: '<strong>Fail-Closed</strong> nativo',
      swarmBadge: 'CONCURRENCIA MULTI-AGENTE',
      swarmTitle: 'Arquitectura Swarm v2.0',
      swarmDesc: 'Tres pilares matemáticos desacoplados para coordinar enjambres de IA sin condiciones de carrera ni modificaciones ciegas:',
      pillar1Title: 'Bloqueo Granular de Símbolos AST',
      pillar1Desc: 'Gestiona permisos de edición atómicos sobre funciones y clases individuales en lugar de bloquear archivos enteros.',
      pillar2Title: 'Bus de Mensajes P2P con Firma Asimétrica',
      pillar2Desc: 'Canal de comunicación directo inter-agente autenticado mediante pares de llaves Ed25519 efímeras.',
      pillar3Title: 'Quórum de Consenso Bizantino (BFT ≥ 66%)',
      pillar3Desc: 'Ninguna mutación estructural se aplica al código sin alcanzar una supermayoría calificada del 66.7% de los votos.',
      pipeBadge: 'EJECUCIÓN DETERMINISTA',
      pipeTitle: 'Ciclo de Trabajo Híbrido Unificado',
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
      step06Desc: 'Ejecución real de la suite de 201 pruebas, escaneo VibeGuard de antipatrones y validación de salida con exit code 0.',
      step07Name: 'PROMOVER',
      step07Desc: 'Generación del sobre criptográfico in-toto v1 en formato DSSE y reporte ejecutivo en el idioma del usuario.',
      compatBadge: 'INTEROPERABILIDAD TOTAL',
      compatTitle: 'Soporte Universal de Plataformas',
      compatDesc: 'Axion Protocol opera sin fricción en los principales entornos de desarrollo asistido por IA:',
      cmdBadge: 'CATÁLOGO OPERATIVO',
      cmdTitle: '12 Slash Commands de Gobernanza',
      cmdDesc: 'Comandos universales diseñados para coexistir sin colisiones en cualquier terminal:',
      chipAll: 'Todos (12)',
      chipGov: 'Gobernanza',
      chipIntent: 'Intención & UX',
      chipState: 'Estado & Checkpoints',
      chipCrypto: 'Criptografía',
      cmdSearchPlaceholder: 'Buscar comando (/drive, /verify, /rollback)...',
      sbomBadge: 'CUMPLIMIENTO Y CADENA DE SUMINISTRO',
      sbomTitle: 'Manifiestos SBOM en Estándares CycloneDX v1.5 y SPDX 2.3',
      sbomDesc: 'Cada módulo, herramienta y comando de Axion Protocol está indexado con su huella digital SHA-256 bajo licencia Apache-2.0.',
      footerTagline: 'Runtime de gobernanza determinista para operaciones con agentes de IA autónomos.',
      footerCopy: '© 2026 Axion Protocol. Cero telemetría de terceros. 100% código abierto y ejecución local.'
    }
  };

  let currentLang = localStorage.getItem('axion_lang') || 'es';

  // ── 2. Toast Helper ────────────────────────────────────────────────
  const toast = document.getElementById('toast');
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2500);
  }

  // ── 3. Theme Toggle (Dark / Light) ─────────────────────────────────
  const themeToggleBtn = document.getElementById('theme-toggle');
  const htmlRoot = document.documentElement;

  function applyTheme(theme) {
    htmlRoot.setAttribute('data-theme', theme);
    localStorage.setItem('axion_theme', theme);
  }

  const savedTheme = localStorage.getItem('axion_theme') || 'dark';
  applyTheme(savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const current = htmlRoot.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      showToast(next === 'dark' ? I18N[currentLang].toastThemeDark : I18N[currentLang].toastThemeLight);
    });
  }

  // ── 4. Package Manager Switcher & Copy CLI ─────────────────────────
  const pmTabs = document.querySelectorAll('.tab-btn');
  const installCmd = document.getElementById('install-cmd');
  const copyBtn = document.getElementById('btn-copy-install');
  const copyLabel = document.getElementById('copy-label');

  const pmCommands = {
    npx: 'npx axion-protocol onboard',
    node: 'node dist/axion.bundle.js verify',
    pnpm: 'pnpm dlx axion-protocol onboard'
  };

  pmTabs.forEach(tab => {
    tab.addEventListener('click', () => {
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
        showToast(I18N[currentLang].toastCopied);
        if (copyLabel) {
          copyLabel.textContent = '✓';
          setTimeout(() => { copyLabel.textContent = I18N[currentLang].copyLabel; }, 1800);
        }
      }).catch(() => {
        showToast(I18N[currentLang].toastCopyFail);
      });
    });
  }

  // ── 5. Slash Commands Search & Filter ──────────────────────────────
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
      cmdFilterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      filterCommands();
    });
  });

  if (cmdSearchInput) {
    cmdSearchInput.addEventListener('input', filterCommands);
  }

  // ── 6. 7-Step Pipeline Stepper ─────────────────────────────────────
  const stepCards = document.querySelectorAll('#pipeline-stepper .step-card');
  stepCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      stepCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
    });
  });

  // ── 7. Live Telemetry WebSocket Stream (RFC 6455) ──────────────────
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

  // ── 8. Language Switcher ───────────────────────────────────────────
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

    const heroTag = document.getElementById('hero-tag-text');
    if (heroTag) heroTag.textContent = dict.heroTagText;

    const heroTitle = document.getElementById('hero-title');
    if (heroTitle) heroTitle.innerHTML = dict.heroTitle;

    const heroLead = document.getElementById('hero-lead');
    if (heroLead) heroLead.innerHTML = dict.heroLead;

    if (copyLabel) copyLabel.textContent = dict.copyLabel;
  }

  langButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const l = btn.getAttribute('data-lang');
      applyLanguage(l);
      showToast(I18N[l].toastLang);
    });
  });

  applyLanguage(currentLang);
});
