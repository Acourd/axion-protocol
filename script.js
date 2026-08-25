/**
 * Axion Protocol — Interactive Controller, Bilingual Engine & Theme Switcher
 * Default Language: English (EN) with seamless Spanish (ES) toggle.
 */

document.addEventListener('DOMContentLoaded', () => {

  // ── 1. Dictionary of Translations (EN & ES) ────────────────────────
  const I18N = {
    en: {
      toastLang: '✓ English language selected',
      toastThemeDark: '✓ Dark mode enabled',
      toastThemeLight: '✓ Light mode enabled',
      toastCopied: '✓ Command copied to clipboard',
      toastCopyFail: 'Could not copy automatically.',
      statusPill: 'v1.2.0-beta.1 · 59 Suites PASS',
      heroEyebrow: 'FAIL-CLOSED GOVERNANCE FOR AI AGENTS',
      heroTitle: 'Direct AI coding agents without losing control <br><span class="glow-emerald">or breaking your codebase.</span>',
      heroLead: 'Axion Protocol is the zero-bloat deterministic governance harness (123 kB, zero dependencies). Halts hallucinations via 2-question Socratic contracts, monitors terminal tool calls in real time, and guarantees byte-accurate rollback.',
      statDeps: '<strong>0</strong> dependencies',
      statSize: '<strong>123 kB</strong> zero-bloat',
      statSuites: '<strong>59/59</strong> suites PASS',
      statCmds: '<strong>16</strong> slash commands',
      statSafety: '<strong>Fail-Closed</strong> by design',
      pipeBadge: 'Deterministic Lifecycle',
      pipeTitle: 'The 7-Phase Circuit',
      pipeDesc: 'Hover over each phase to inspect active runtime protections:',
      phases: {
        '01': { name: 'UNDERSTAND', title: 'Phase 01: UNDERSTAND', desc: 'Crystallizes intent in 2 plain questions with A/B/C options and seals the SHA-256 IntentContract before touching code.' },
        '02': { name: 'PLAN', title: 'Phase 02: PLAN', desc: 'Silently evaluates risk tier (LOW to CRITICAL) and creates an atomic rollback plan without polluting chat context.' },
        '03': { name: 'GATE', title: 'Phase 03: GATE', desc: 'Requires asymmetric Ed25519 single-use cryptographic signatures to authorize high-risk or destructive actions.' },
        '04': { name: 'TEST', title: 'Phase 04: TEST', desc: 'Enforces Test-Driven Development (TDD) assertions and verification criteria before implementation begins.' },
        '05': { name: 'BUILD', title: 'Phase 05: BUILD', desc: 'Real-time lexical preflight inspection and isolated execution with structured shell: false.' },
        '06': { name: 'AUDIT', title: 'Phase 06: AUDIT', desc: 'Executes 59 automated test suites, VibeGuard quality gate, and verifies the SHA-256 evidence manifest.' },
        '07': { name: 'PROMOTE', title: 'Phase 07: PROMOTE', desc: 'Generates formal in-toto Statement v1 / DSSE envelopes and delivers an executive summary in your native language.' }
      },
      bentoBadge: 'Architecture (Beta)',
      bentoTitle: 'High-Impact Capabilities',
      bentoDesc: 'Visual micro-demonstrations of each core protocol pillar:',
      bento1Badge: 'Socratic Gate · /clarify',
      bento1Title: 'From Spoken Stream to Sealed Contract',
      bento1Desc: 'AI is strictly forbidden from guessing requirements until you select from simple human choices (A/B/C).',
      bento2Badge: 'Safety Gate · /preflight',
      bento2Title: 'Real-Time Lexical Preflight',
      bento2Desc: 'Monitors every terminal call before touching the OS, intercepting and rejecting destructive patterns.',
      bento3Badge: 'Reversion · /rollback',
      bento3Title: 'Deterministic Rollback without Git',
      bento3Desc: 'Say "undo what you did" and Axion restores files exactly to the previous verified checkpoint in seconds.',
      bento4Badge: 'Supply Chain Security',
      bento4Title: 'in-toto Statement v1 & DSSE',
      bento4Desc: 'Cryptographic attestations compatible with SLSA, Cosign, and GitHub Attestations for compliance audits.',
      bento5Badge: 'Zero-Bloat',
      bento5Title: '123 kB · Zero External Dependencies',
      bento5Desc: 'Built exclusively with native Node.js builtins (fs, crypto, path, child_process). No Docker containers or heavy packages.',
      compBadge: 'Technical Benchmark',
      compTitle: 'Architecture Comparison Matrix',
      compDesc: 'Rigorous technical audit: Axion Protocol vs. popular AI kits and agent frameworks:',
      cmdBadge: 'Ergonomics',
      cmdTitle: '16 Universal Slash Commands',
      cmdDesc: 'Designed for total parity across Antigravity (.agents/workflows) and Claude Code (.claude/commands):',
      footerTagline: 'The zero-bloat deterministic seatbelt for AI coding agents.',
      footerCopy: '© 2026 Axion Protocol. Zero telemetry, 100% open-source and local execution.'
    },
    es: {
      toastLang: '✓ Idioma español seleccionado',
      toastThemeDark: '✓ Modo oscuro activado',
      toastThemeLight: '✓ Modo claro activado',
      toastCopied: '✓ Comando copiado al portapapeles',
      toastCopyFail: 'No se pudo copiar automáticamente.',
      statusPill: 'v1.2.0-beta.1 · 59 Suites PASS',
      heroEyebrow: 'GOBERNANZA FAIL-CLOSED PARA AGENTES DE IA',
      heroTitle: 'Dirige agentes de IA sin perder el control <br><span class="glow-emerald">ni romper tu código.</span>',
      heroLead: 'Axion Protocol es el arnés de gobernanza determinista (123 kB, cero dependencias). Frena alucinaciones mediante contratos socráticos de 2 preguntas, supervisa llamadas de terminal con preflight léxico en tiempo real y garantiza reversión verificada al byte.',
      statDeps: '<strong>0</strong> dependencias',
      statSize: '<strong>123 kB</strong> ultra-ligero',
      statSuites: '<strong>59/59</strong> suites PASS',
      statCmds: '<strong>16</strong> slash commands',
      statSafety: '<strong>Fail-Closed</strong> nativo',
      pipeBadge: 'Flujo Determinista',
      pipeTitle: 'El Circuito de las 7 Fases',
      pipeDesc: 'Pasa el cursor sobre cada nodo para ver qué protección se activa en cada etapa:',
      phases: {
        '01': { name: 'ENTENDER', title: 'Fase 01: ENTENDER', desc: 'Aclara la intención en 2 preguntas humanas con opciones A/B/C y emite el IntentContract antes de tocar código.' },
        '02': { name: 'PLANIFICAR', title: 'Fase 02: PLANIFICAR', desc: 'Evalúa el riesgo de forma silenciosa (LOW a CRITICAL) y prepara el plan de reversión sin saturar el chat.' },
        '03': { name: 'GATE', title: 'Fase 03: GATE', desc: 'Exige firma criptográfica asimétrica Ed25519 con nonces de un solo uso para autorizar acciones críticas.' },
        '04': { name: 'TEST', title: 'Fase 04: TEST', desc: 'Define las pruebas unitarias y aserciones de verificación antes de construir cualquier archivo.' },
        '05': { name: 'CONSTRUIR', title: 'Fase 05: CONSTRUIR', desc: 'Inspección léxica en tiempo real con preflight.js y ejecución aislada con shell: false.' },
        '06': { name: 'AUDITAR', title: 'Fase 06: AUDITAR', desc: 'Ejecuta 59 suites de prueba automáticas, VibeGuard gate y comprueba el sello de evidencia SHA-256.' },
        '07': { name: 'PROMOVER', title: 'Fase 07: PROMOVER', desc: 'Genera la atestación formal in-toto / DSSE y entrega el reporte ejecutivo en tu idioma nativo.' }
      },
      bentoBadge: 'Arquitectura (Beta)',
      bentoTitle: 'Capacidades de Alto Impacto',
      bentoDesc: 'Micro-demostraciones visuales de cómo opera cada pilar del protocolo:',
      bento1Badge: 'Freno Socrático · /clarify',
      bento1Title: 'De voz caótica a Contrato Sellado',
      bento1Desc: 'La IA tiene prohibido programar ante peticiones vagas hasta que tú eliges entre opciones claras (A/B/C) sin tecnicismos.',
      bento2Badge: 'Guardarraíl · /preflight',
      bento2Title: 'Preflight Léxico Real',
      bento2Desc: 'Supervisa cada llamada de terminal antes de tocar el sistema operativo, bloqueando comandos destructivos.',
      bento3Badge: 'Reversión · /rollback',
      bento3Title: 'Rollback sin Git',
      bento3Desc: 'Di simplemente "no me gustó, deshazlo" y Axion restaura el código exacto al snapshot SHA-256 previo.',
      bento4Badge: 'Cadena de Suministro',
      bento4Title: 'Atestaciones in-toto DSSE',
      bento4Desc: 'Comprobantes criptográficos compatibles con SLSA, Cosign y GitHub Attestations para auditorías y cumplimiento normativo.',
      bento5Badge: 'Zero-Bloat',
      bento5Title: '123 kB · Cero Dependencias',
      bento5Desc: 'Construido exclusivamente con módulos nativos de Node.js (fs, crypto, path, child_process). No requiere paquetes pesados.',
      compBadge: 'Benchmark Técnico',
      compTitle: 'Matriz Comparativa de Arquitectura',
      compDesc: 'Auditoría rigurosa: Axion Protocol frente a los kits y frameworks de referencia del ecosistema:',
      cmdBadge: 'Ergonomía',
      cmdTitle: '16 Slash Commands Universales',
      cmdDesc: 'Diseñados para operar con paridad total en Antigravity (.agents/workflows) y Claude Code (.claude/commands):',
      footerTagline: 'El cinturón de seguridad determinista para agentes de IA.',
      footerCopy: '© 2026 Axion Protocol. Cero telemetría, 100% código abierto y ejecución local.'
    }
  };

  let currentLang = localStorage.getItem('axion-lang') || 'en'; // Default English

  // ── 2. Language Switcher Function ───────────────────────────────────
  function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('axion-lang', lang);
    document.documentElement.setAttribute('lang', lang);

    const t = I18N[lang] || I18N.en;

    // Actualizar botones activos
    document.querySelectorAll('.btn-lang').forEach(btn => {
      if (btn.getAttribute('data-lang') === lang) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Actualizar elementos clave
    const setElem = (sel, html) => {
      const el = document.querySelector(sel);
      if (el) el.innerHTML = html;
    };

    setElem('#hero .hero-eyebrow span:last-child', t.heroEyebrow);
    setElem('#hero .hero-title', t.heroTitle);
    setElem('#hero .hero-lead', t.heroLead);

    // Hero Stats
    const stats = document.querySelectorAll('.hero-stats-row .stat-pill');
    if (stats.length >= 5) {
      stats[0].innerHTML = t.statDeps;
      stats[1].innerHTML = t.statSize;
      stats[2].innerHTML = t.statSuites;
      stats[3].innerHTML = t.statCmds;
      stats[4].innerHTML = t.statSafety;
    }

    // Pipeline
    setElem('#pipeline .section-badge-emerald', t.pipeBadge);
    setElem('#pipeline .section-headline', t.pipeTitle);
    setElem('#pipeline .section-desc', t.pipeDesc);

    // Circuit Nodes Names & Descriptions
    const nodes = document.querySelectorAll('.circuit-node');
    nodes.forEach(node => {
      const phase = node.getAttribute('data-phase');
      if (t.phases[phase]) {
        const nameEl = node.querySelector('.node-name');
        if (nameEl) nameEl.textContent = t.phases[phase].name;
        node.setAttribute('data-desc', t.phases[phase].desc);
      }
    });

    // Actualizar tarjeta del circuito activa
    const activeNode = document.querySelector('.circuit-node.active') || nodes[0];
    if (activeNode) {
      const phase = activeNode.getAttribute('data-phase');
      const p = t.phases[phase] || t.phases['01'];
      setElem('#circuit-phase-title', p.title);
      setElem('#circuit-phase-text', p.desc);
    }

    // Bento
    setElem('#capacidades .section-badge-emerald', t.bentoBadge);
    setElem('#capacidades .section-headline', t.bentoTitle);
    setElem('#capacidades .section-desc', t.bentoDesc);

    // Comparativa
    setElem('#comparativa .section-badge-emerald', t.compBadge);
    setElem('#comparativa .section-headline', t.compTitle);
    setElem('#comparativa .section-desc', t.compDesc);

    // Comandos
    setElem('#comandos .section-badge-emerald', t.cmdBadge);
    setElem('#comandos .section-headline', t.cmdTitle);
    setElem('#comandos .section-desc', t.cmdDesc);

    // Footer
    setElem('.footer-tagline', t.footerTagline);
    setElem('.footer-copy p', t.footerCopy);
  }

  // Setup Language Button Listeners
  document.querySelectorAll('.btn-lang').forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.getAttribute('data-lang');
      setLanguage(lang);
      showToast(I18N[lang].toastLang);
    });
  });

  // Inicializar idioma al cargar
  setLanguage(currentLang);

  // ── 3. Light / Dark Mode Toggle ────────────────────────────────────
  const themeToggleBtn = document.getElementById('theme-toggle');
  const rootHtml = document.documentElement;

  const savedTheme = localStorage.getItem('axion-theme');
  if (savedTheme) {
    rootHtml.setAttribute('data-theme', savedTheme);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    rootHtml.setAttribute('data-theme', 'light');
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = rootHtml.getAttribute('data-theme') || 'dark';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      rootHtml.setAttribute('data-theme', newTheme);
      localStorage.setItem('axion-theme', newTheme);
      const t = I18N[currentLang] || I18N.en;
      showToast(newTheme === 'dark' ? t.toastThemeDark : t.toastThemeLight);
    });
  }

  // ── 4. Toast Notification ──────────────────────────────────────────
  const toast = document.getElementById('toast');
  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2400);
  }

  // ── 5. Warp Terminal Install Switcher & Copy ────────────────────────
  const warpCmdText = document.getElementById('warp-cmd-text');
  const btnCopyWarp = document.getElementById('btn-copy-warp');
  const warpTabs = document.querySelectorAll('.w-tab');

  const installCommands = {
    npx: 'npx axion-protocol init',
    npm: 'npm i -g axion-protocol && axion init',
    pnpm: 'pnpm dlx axion-protocol init'
  };

  warpTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      warpTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const pm = tab.getAttribute('data-pm');
      if (warpCmdText && installCommands[pm]) {
        warpCmdText.textContent = installCommands[pm];
      }
    });
  });

  if (btnCopyWarp && warpCmdText) {
    btnCopyWarp.addEventListener('click', () => {
      const textToCopy = warpCmdText.textContent.trim();
      navigator.clipboard.writeText(textToCopy).then(() => {
        const t = I18N[currentLang] || I18N.en;
        showToast(t.toastCopied);
      }).catch(() => {
        const t = I18N[currentLang] || I18N.en;
        showToast(t.toastCopyFail);
      });
    });
  }

  // ── 6. Circuit 7-Phase Interactive Controller ──────────────────────
  const circuitNodes = document.querySelectorAll('.circuit-node');
  const circuitPhaseTitle = document.getElementById('circuit-phase-title');
  const circuitPhaseText = document.getElementById('circuit-phase-text');

  circuitNodes.forEach(node => {
    node.addEventListener('mouseenter', () => {
      circuitNodes.forEach(n => n.classList.remove('active'));
      node.classList.add('active');

      const phase = node.getAttribute('data-phase');
      const t = I18N[currentLang] || I18N.en;
      const p = t.phases[phase] || t.phases['01'];

      if (circuitPhaseTitle) circuitPhaseTitle.textContent = p.title;
      if (circuitPhaseText) circuitPhaseText.textContent = p.desc;
    });
  });

  // ── 7. Smart Sidebar Auto-Collapse on Scroll ────────────────────────
  const sidebar = document.getElementById('smart-sidebar');
  let lastScrollY = window.scrollY;

  window.addEventListener('scroll', () => {
    const currentScrollY = window.scrollY;
    if (sidebar) {
      if (currentScrollY > 150 && currentScrollY > lastScrollY) {
        sidebar.style.opacity = '0.35';
      } else {
        sidebar.style.opacity = '1';
      }
    }
    lastScrollY = currentScrollY;
  }, { passive: true });

  if (sidebar) {
    sidebar.addEventListener('mouseenter', () => {
      sidebar.style.opacity = '1';
    });
  }

});
