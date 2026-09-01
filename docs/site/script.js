/**
 * Axion Protocol — Interactive Controller, Bilingual Engine, Haptic Synthesizer & Terminal Sandbox
 * Default Language: English (EN) with seamless Spanish (ES) toggle.
 */

document.addEventListener('DOMContentLoaded', () => {

  // ── 1. Dictionary of Translations (EN & ES) ────────────────────────
  const I18N = {
    en: {
      toastLang: '✓ English language selected',
      toastThemeDark: '✓ Dark mode enabled',
      toastThemeLight: '✓ Light mode enabled',
      toastSoundOn: '✓ Haptic audio feedback enabled',
      toastSoundOff: '✕ Haptic audio feedback muted',
      toastCopied: '✓ Command copied to clipboard',
      toastCopyFail: 'Could not copy automatically.',
      statusPill: 'v1.2.0-beta.1 · 186 Suites PASS',
      heroEyebrow: 'FAIL-CLOSED GOVERNANCE FOR AI AGENTS',
      heroTitle: 'Direct AI coding agents without losing control <br><span class="glow-emerald">or breaking your codebase.</span>',
      heroLead: 'Axion Protocol is the zero-bloat deterministic governance harness (123 kB, zero dependencies). Halts hallucinations via 2-question Socratic contracts, monitors terminal tool calls in real time, and guarantees byte-accurate rollback.',
      statDeps: '<strong>0</strong> dependencies',
      statSize: '<strong>123 kB</strong> zero-bloat',
      statSuites: '<strong>186/186</strong> suites PASS',
      statCmds: '<strong>12</strong> slash commands',
      statSafety: '<strong>Fail-Closed</strong> by design',
      playgroundBadge: 'Interactive Sandbox',
      playgroundTitle: 'Live Governance Simulator',
      playgroundDesc: 'Try real-time commands or click quick actions to experience how Axion intercepts risks and deliberates autonomously:',
      quickActionLabel: 'Quick Actions:',
      quickDrive: '▶ /drive',
      quickVerify: '▶ /verify',
      quickDanger: '⚠️ Test Hostile Command (rm -rf /)',
      quickRollback: '▶ /rollback',
      quickPremortem: '▶ /premortem',
      quickAttest: '▶ /attest',
      simExecBtn: 'Run',
      simPlaceholder: 'Type a command (/drive, /verify, rm -rf /) and press Enter...',
      pipeBadge: 'Deterministic Lifecycle',
      pipeTitle: 'The 7-Phase Circuit',
      pipeDesc: 'Hover over each phase to inspect active runtime protections:',
      phases: {
        '01': { name: 'UNDERSTAND', title: 'Phase 01: UNDERSTAND', desc: 'Crystallizes intent in 2 plain questions with A/B/C options and seals the SHA-256 IntentContract before touching code.' },
        '02': { name: 'PLAN', title: 'Phase 02: PLAN', desc: 'Silently evaluates risk tier (LOW to CRITICAL) and creates an atomic rollback plan without polluting chat context.' },
        '03': { name: 'GATE', title: 'Phase 03: GATE', desc: 'Requires asymmetric Ed25519 single-use cryptographic signatures to authorize high-risk or destructive actions.' },
        '04': { name: 'TEST', title: 'Phase 04: TEST', desc: 'Enforces Test-Driven Development (TDD) assertions and verification criteria before implementation begins.' },
        '05': { name: 'BUILD', title: 'Phase 05: BUILD', desc: 'Real-time lexical preflight inspection and isolated execution with structured shell: false.' },
        '06': { name: 'AUDIT', title: 'Phase 06: AUDIT', desc: 'Executes 186 automated test suites, VibeGuard quality gate, and verifies the SHA-256 evidence manifest.' },
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
      radarBadge: 'Module Dependency Graph',
      radarTitle: 'Architecture Radar & Blast Radius',
      radarDesc: 'Explore all 5 domains and 152 suites in real time. Click any module to compute transitive blast radius and inspect verified invariants:',
      radarChipAll: 'All Domains (152)',
      radarChipGov: '01 Governance (66)',
      radarChipCrypto: '02 Cryptography (25)',
      radarChipIntent: '03 Intent (22)',
      radarChipState: '04 State (22)',
      radarChipResilience: '05 Resilience (17)',
      radarSimBlastBtn: 'Simulate Blast Radius',
      cmdBadge: 'Ergonomics',
      cmdTitle: '12 Universal Slash Commands',
      cmdDesc: 'Designed for total parity across Antigravity (.agents/skills) and Claude Code (.claude/commands):',
      chipAll: 'All (12)',
      chipGov: 'Governance',
      chipIntent: 'Intent & UX',
      chipState: 'State & Checkpoints',
      chipCrypto: 'Cryptography',
      cmdSearchPlaceholder: 'Search slash command (/drive, /verify...)',
      footerTagline: 'The zero-bloat deterministic seatbelt for AI coding agents.',
      footerCopy: '© 2026 Axion Protocol. Zero telemetry, 100% open-source and local execution.'
    },
    es: {
      toastLang: '✓ Idioma español seleccionado',
      toastThemeDark: '✓ Modo oscuro activado',
      toastThemeLight: '✓ Modo claro activado',
      toastSoundOn: '✓ Sonido háptico activado',
      toastSoundOff: '✕ Sonido háptico silenciado',
      toastCopied: '✓ Comando copiado al portapapeles',
      toastCopyFail: 'No se pudo copiar automáticamente.',
      statusPill: 'v1.2.0-beta.1 · 186 Suites PASS',
      heroEyebrow: 'GOBERNANZA FAIL-CLOSED PARA AGENTES DE IA',
      heroTitle: 'Dirige agentes de IA sin perder el control <br><span class="glow-emerald">ni romper tu código.</span>',
      heroLead: 'Axion Protocol es el arnés de gobernanza determinista (123 kB, cero dependencias). Frena alucinaciones mediante contratos socráticos de 2 preguntas, supervisa llamadas de terminal con preflight léxico en tiempo real y garantiza reversión verificada al byte.',
      statDeps: '<strong>0</strong> dependencias',
      statSize: '<strong>123 kB</strong> ultra-ligero',
      statSuites: '<strong>186/186</strong> suites PASS',
      statCmds: '<strong>12</strong> slash commands',
      statSafety: '<strong>Fail-Closed</strong> nativo',
      playgroundBadge: 'Sandbox Interactivo',
      playgroundTitle: 'Simulador de Gobernanza en Vivo',
      playgroundDesc: 'Prueba comandos en tiempo real o haz clic en las acciones rápidas para ver cómo Axion intercepta riesgos y ejecuta deliberación autónoma:',
      quickActionLabel: 'Acciones Rápidas:',
      quickDrive: '▶ /drive',
      quickVerify: '▶ /verify',
      quickDanger: '⚠️ Probar Ataque Hostil (rm -rf /)',
      quickRollback: '▶ /rollback',
      quickPremortem: '▶ /premortem',
      quickAttest: '▶ /attest',
      simExecBtn: 'Ejecutar',
      simPlaceholder: 'Escribe un comando (/drive, /verify, rm -rf /) y presiona Enter...',
      pipeBadge: 'Flujo Determinista',
      pipeTitle: 'El Circuito de las 7 Fases',
      pipeDesc: 'Pasa el cursor sobre cada nodo para ver qué protección se activa en cada etapa:',
      phases: {
        '01': { name: 'ENTENDER', title: 'Fase 01: ENTENDER', desc: 'Aclara la intención en 2 preguntas humanas con opciones A/B/C y emite el IntentContract antes de tocar código.' },
        '02': { name: 'PLANIFICAR', title: 'Fase 02: PLANIFICAR', desc: 'Evalúa el riesgo de forma silenciosa (LOW a CRITICAL) y prepara el plan de reversión sin saturar el chat.' },
        '03': { name: 'GATE', title: 'Fase 03: GATE', desc: 'Exige firma criptográfica asimétrica Ed25519 con nonces de un solo uso para autorizar acciones críticas.' },
        '04': { name: 'TEST', title: 'Fase 04: TEST', desc: 'Define las pruebas unitarias y aserciones de verificación antes de construir cualquier archivo.' },
        '05': { name: 'CONSTRUIR', title: 'Fase 05: CONSTRUIR', desc: 'Inspección léxica en tiempo real con preflight.js y ejecución aislada con shell: false.' },
        '06': { name: 'AUDITAR', title: 'Fase 06: AUDITAR', desc: 'Ejecuta 186 suites de prueba automáticas, VibeGuard strict y comprueba el sello de evidencia SHA-256.' },
        '07': { name: 'PROMOVER', title: 'Fase 07: PROMOVER', desc: 'Genera la atestación formal in-toto / DSSE y entrega el reporte ejecutivo en tu idioma nativo.' }
      },
      bentoBadge: 'Arquitectura (Beta)',
      bentoTitle: 'Capacidades de Alto Impacto',
      bentoDesc: 'Micro-demostraciones visuales de cómo opera cada pilar del protocolo:',
      bento1Badge: 'Freno Socrático · /clarify',
      bento1Title: 'De Petición Ambigua a Contrato Sellado',
      bento1Desc: 'La IA tiene prohibido programar ante peticiones vagas hasta que tú eliges entre opciones claras (A/B/C) sin tecnicismos.',
      bento2Badge: 'Guardarraíl · /preflight',
      bento2Title: 'Preflight Léxico en Tiempo Real',
      bento2Desc: 'Supervisa cada llamada de terminal antes de tocar el sistema operativo, interceptando patrones destructivos.',
      bento3Badge: 'Reversión · /rollback',
      bento3Title: 'Rollback Determinista sin Git',
      bento3Desc: 'Di "deshaz lo que hiciste" y Axion restaura los archivos exactamente al punto de control anterior verificado en segundos.',
      bento4Badge: 'Cadena de Suministro',
      bento4Title: 'in-toto Statement v1 & DSSE',
      bento4Desc: 'Atestaciones criptográficas compatibles con SLSA, Cosign y GitHub Attestations para auditorías corporativas.',
      bento5Badge: 'Zero-Bloat',
      bento5Title: '123 kB · Cero Dependencias Externas',
      bento5Desc: 'Construido exclusivamente con APIs nativas de Node.js (fs, crypto, path, child_process). Sin contenedores Docker ni librerías pesadas.',
      compBadge: 'Benchmark Técnico',
      compTitle: 'Matriz Comparativa de Arquitectura',
      compDesc: 'Auditoría rigurosa frente a las alternativas del ecosistema de agentes:',
      radarBadge: 'Grafo de Módulos',
      radarTitle: 'Radar de Arquitectura y Blast Radius',
      radarDesc: 'Explora los 5 dominios y 152 suites en tiempo real. Haz clic en cualquier nodo para calcular su radio de impacto transitivo e inspeccionar sus invariantes:',
      radarChipAll: 'Todos los Dominios (152)',
      radarChipGov: '01 Gobernanza (66)',
      radarChipCrypto: '02 Criptografía (25)',
      radarChipIntent: '03 Intención (22)',
      radarChipState: '04 Estado (22)',
      radarChipResilience: '05 Resiliencia (17)',
      radarSimBlastBtn: 'Simular Blast Radius',
      cmdBadge: 'Ergonomía',
      cmdTitle: '12 Slash Commands Universales',
      cmdDesc: 'Diseñados con paridad total entre Antigravity (.agents/skills) y Claude Code (.claude/commands):',
      chipAll: 'Todos (12)',
      chipGov: 'Gobernanza',
      chipIntent: 'Intención & UX',
      chipState: 'Estado & Checkpoints',
      chipCrypto: 'Criptografía',
      cmdSearchPlaceholder: 'Buscar comando (/drive, /verify...)',
      footerTagline: 'El cinturón de seguridad determinista para agentes de IA.',
      footerCopy: '© 2026 Axion Protocol. Cero telemetría, 100% código abierto y ejecución local.'
    }
  };

  let currentLang = localStorage.getItem('axion_lang') || 'en';

  // ── 2. Synthesized Web Audio Engine (Zero Assets) ──────────────────
  let audioCtx = null;
  let soundEnabled = localStorage.getItem('axion_sound') !== 'false';

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
      osc.frequency.setValueAtTime(850, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.03, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.03);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.03);
    } catch (e) {
      // Ignorar fallos de audio
    }
  }

  function playSuccessChime() {
    if (!soundEnabled) return;
    initAudio();
    if (!audioCtx) return;
    try {
      const freqs = [523.25, 659.25, 783.99]; // Acorde C Major
      freqs.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.05);
        gain.gain.setValueAtTime(0.04, audioCtx.currentTime + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + idx * 0.05 + 0.25);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + idx * 0.05);
        osc.stop(audioCtx.currentTime + idx * 0.05 + 0.25);
      });
    } catch (e) {
      // Ignorar fallos de audio
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
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch (e) {
      // Ignorar fallos de audio
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
    }, 2800);
  }

  // ── 4. Sound Toggle Controller ─────────────────────────────────────
  const soundToggleBtn = document.getElementById('sound-toggle');
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
      localStorage.setItem('axion_sound', soundEnabled);
      updateSoundUI();
      if (soundEnabled) {
        playSuccessChime();
        showToast(I18N[currentLang].toastSoundOn);
      } else {
        showToast(I18N[currentLang].toastSoundOff);
      }
    });
  }

  // ── 5. Theme Toggle (Dark / Light) ─────────────────────────────────
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
      playKeyClick();
      const current = htmlRoot.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      showToast(next === 'dark' ? I18N[currentLang].toastThemeDark : I18N[currentLang].toastThemeLight);
    });
  }

  // ── 6. Slash Commands Search & Category Filter ─────────────────────
  const cmdFilterChips = document.querySelectorAll('.cmd-filter-chips .chip');
  const cmdSearchInput = document.getElementById('cmd-search');
  const cmdCards = document.querySelectorAll('.cmd-card');

  function filterCommands() {
    const activeChip = document.querySelector('.cmd-filter-chips .chip.active');
    const filterCat = activeChip ? activeChip.getAttribute('data-filter') : 'all';
    const query = (cmdSearchInput ? cmdSearchInput.value : '').toLowerCase().trim();

    cmdCards.forEach(card => {
      const cat = card.getAttribute('data-cat') || 'governance';
      const text = card.textContent.toLowerCase();

      const matchesCat = filterCat === 'all' || cat === filterCat;
      const matchesQuery = !query || text.includes(query);

      if (matchesCat && matchesQuery) {
        card.style.display = 'block';
      } else {
        card.style.display = 'none';
      }
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

  // ── 8. Copy to Clipboard Buttons ───────────────────────────────────
  const copyBtn = document.getElementById('btn-copy-warp');
  const cmdText = document.getElementById('warp-cmd-text');

  if (copyBtn && cmdText) {
    copyBtn.addEventListener('click', () => {
      const text = cmdText.textContent.trim();
      navigator.clipboard.writeText(text).then(() => {
        playSuccessChime();
        showToast(I18N[currentLang].toastCopied);
      }).catch(() => {
        showToast(I18N[currentLang].toastCopyFail);
      });
    });
  }

  // Package Manager Tabs
  const pmTabs = document.querySelectorAll('.w-tab');
  const pmCommands = {
    npx: 'npx axion-protocol init',
    npm: 'npm i -D axion-protocol && npx axion-protocol init',
    pnpm: 'pnpm dlx axion-protocol init'
  };

  pmTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      playKeyClick();
      pmTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const pm = tab.getAttribute('data-pm');
      if (cmdText && pmCommands[pm]) {
        cmdText.textContent = pmCommands[pm];
      }
    });
  });

  // ── 9. Interactive Socratic Intent Builder ─────────────────────────
  const intentOptCards = document.querySelectorAll('.intent-opt-card');
  const sealHashEl = document.querySelector('.seal-hash');

  const hashes = [
    'e8a419c9...f2b4',
    'b37f20aa...c891',
    '7d91e452...11a9'
  ];

  intentOptCards.forEach((card, idx) => {
    card.addEventListener('click', () => {
      playKeyClick();
      intentOptCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      if (sealHashEl && hashes[idx]) {
        sealHashEl.textContent = hashes[idx];
      }
      playSuccessChime();
    });
  });

  // ── 10. Circuit Stepper ────────────────────────────────────────────
  const nodes = document.querySelectorAll('.circuit-node');
  const phaseBadge = document.getElementById('phase-badge');
  const phaseDesc = document.getElementById('phase-desc');

  nodes.forEach(node => {
    node.addEventListener('mouseenter', () => {
      playKeyClick();
      nodes.forEach(n => n.classList.remove('active'));
      node.classList.add('active');
      const p = node.getAttribute('data-phase');
      const data = I18N[currentLang].phases[p];
      if (data && phaseBadge && phaseDesc) {
        phaseBadge.textContent = data.title;
        phaseDesc.textContent = data.desc;
      }
    });
  });

  // ── 11. Architecture Radar & Blast Radius Canvas Engine ───────────
  const radarCanvas = document.getElementById('radar-canvas');
  const radarFilters = document.querySelectorAll('.r-chip');
  const radarActiveCount = document.getElementById('radar-active-count');
  const inspDomain = document.getElementById('insp-domain');
  const inspTitle = document.getElementById('insp-title');
  const inspDesc = document.getElementById('insp-desc');
  const inspRadius = document.getElementById('insp-radius');
  const inspTransitive = document.getElementById('insp-transitive');
  const inspSig = document.getElementById('insp-sig');
  const inspIsolation = document.getElementById('insp-isolation');
  const btnHighlightBlast = document.getElementById('btn-highlight-blast');

  if (radarCanvas) {
    const ctx = radarCanvas.getContext('2d');
    let width = 1040;
    let height = 520;

    function resizeRadar() {
      const rect = radarCanvas.getBoundingClientRect();
      width = rect.width || 1040;
      height = 520;
      const dpr = window.devicePixelRatio || 1;
      radarCanvas.width = width * dpr;
      radarCanvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    }
    resizeRadar();
    window.addEventListener('resize', resizeRadar);

    const RADAR_NODES = [
      // 01 Governance
      { id: 'preflight', label: 'tools/preflight.js', domain: 'gov', color: '#00F5A0', x: 230, y: 150, r: 13, blastRadius: '8 módulos dependientes', transitive: 'Atómico (Nivel 2)', sig: 'SHA-256 Validado', isolation: 'shell: false', desc: 'Supervisión síncrona previa a la ejecución de comandos. Intercepta vectores destructivos en modo Fail-Closed.' },
      { id: 'drive', label: 'tools/drive_engine.js', domain: 'gov', color: '#00F5A0', x: 150, y: 260, r: 15, blastRadius: '14 módulos dependientes', transitive: 'Cierre Transitivo Nivel 3', sig: 'Ed25519 DSSE', isolation: 'Autonomous Sandbox', desc: 'Meta-orquestador asintótico de bucle cerrado. Deliberación adaptativa y convergencia a cero errores.' },
      { id: 'cross_healer', label: 'tools/multi_file_cross_healer.js', domain: 'gov', color: '#00F5A0', x: 310, y: 270, r: 11, blastRadius: '6 módulos dependientes', transitive: 'Inverso Transitivo', sig: 'AST Reconciled', isolation: 'Safe Rollback Plan', desc: 'Auto-curación multi-archivo con cálculo de cierre transitivo y resolución atómica de dependencias.' },
      { id: 'vibeguard', label: 'tools/vibeguard_gate.js', domain: 'gov', color: '#00F5A0', x: 110, y: 140, r: 10, blastRadius: '88 archivos auditados', transitive: 'Zero Antipatterns', sig: 'Lexical Guard', isolation: 'Strict Static AST', desc: 'Escáner estricto de calidad de código y antipatrones con bloqueo automático ante malas prácticas.' },
      { id: 'hardware_prof', label: 'tools/hardware_profiler.js', domain: 'gov', color: '#00F5A0', x: 210, y: 380, r: 9, blastRadius: 'Adaptive Worker Pool', transitive: 'RAM / Core Tuned', sig: 'Hardware Calibrated', isolation: 'OS Native', desc: 'Perfilador dinámico de hardware para balanceo de carga en pruebas de 8 a 16 workers.' },

      // 02 Cryptography
      { id: 'attest', label: 'tools/attest.js', domain: 'crypto', color: '#A78BFA', x: 470, y: 130, r: 14, blastRadius: 'Cadena de Atestación', transitive: 'in-toto Statement v1', sig: 'Ed25519 Signature', isolation: 'PAE Encoded', desc: 'Generador de sobres criptográficos DSSE y atestaciones de procedencia in-toto v1 compatibles con SLSA y Cosign.' },
      { id: 'evidence_hasher', label: 'tools/evidence_hasher.js', domain: 'crypto', color: '#A78BFA', x: 570, y: 210, r: 11, blastRadius: 'Manifest SHA-256', transitive: 'Deterministic Graph', sig: 'RFC 8785 Canonical', isolation: 'Immutable Store', desc: 'Serializador canónico RFC 8785 y emisor de sellos inmutables de evidencia de ejecución.' },
      { id: 'revocation_gate', label: 'tools/revocation_manager.js', domain: 'crypto', color: '#A78BFA', x: 410, y: 240, r: 9, blastRadius: 'Key Lifecycle', transitive: 'Fail-Closed Revocation', sig: 'Cryptographic Fence', isolation: 'Hardware Bound', desc: 'Gestor del ciclo de vida y revocación instantánea de llaves asimétricas Ed25519.' },

      // 03 Intent & UX
      { id: 'clarifier', label: 'tools/clarifier.js', domain: 'intent', color: '#38BDF8', x: 710, y: 140, r: 13, blastRadius: 'Socratic Gate', transitive: 'IntentContract v1.2', sig: 'SHA-256 Sealed', isolation: 'Pre-Code Fence', desc: 'Freno socrático de 2 preguntas con opciones A/B/C humanas que sella la intención antes de permitir modificaciones.' },
      { id: 'socratic_planner', label: 'tools/multidimensional_socratic_planner.js', domain: 'intent', color: '#38BDF8', x: 810, y: 220, r: 12, blastRadius: 'Matriz Multidimensional', transitive: 'Contrato Socrático', sig: 'Deterministic JSON', isolation: 'Human Choice Bound', desc: 'Planificador y compilador de contratos socráticos multidimensionales con persistencia inmutable.' },
      { id: 'mission_vault', label: 'tools/mission_backlog_vault.js', domain: 'intent', color: '#38BDF8', x: 670, y: 260, r: 10, blastRadius: 'Bóveda de Misiones', transitive: 'Multi-Session Store', sig: 'Rank Prioritized', isolation: 'Persistent Vault', desc: 'Bóveda permanente de misiones y formateador visual con ordenamiento por impacto y dependencias.' },

      // 04 State & Recovery
      { id: 'snapshot', label: 'tools/snapshot.js', domain: 'state', color: '#F59E0B', x: 380, y: 390, r: 13, blastRadius: 'Atomic Tree Checkpoint', transitive: 'Merkle Root Validated', sig: 'SHA-256 Manifest', isolation: 'Snapshot Isolation', desc: 'Creación y verificación atómica de checkpoints del árbol de archivos independientes de Git.' },
      { id: 'rollback', label: 'tools/rollback.js', domain: 'state', color: '#F59E0B', x: 500, y: 440, r: 13, blastRadius: 'Full Worktree Restore', transitive: 'Sub-15ms Byte Accurate', sig: '0 Orphaned Files', isolation: 'Fail-Safe Restore', desc: 'Motor de reversión determinista instantáneo verificado contra el árbol Merkle de ejecución.' },
      { id: 'context_shield', label: 'tools/context_shield.js', domain: 'state', color: '#F59E0B', x: 600, y: 360, r: 11, blastRadius: 'Memory & Context Drift', transitive: 'Cross-Runtime Anchor', sig: 'Entropy Guarded', isolation: 'Clean Window', desc: 'Anclaje anti-deriva y preservación de memoria contextual persistente entre sesiones de trabajo.' },

      // 05 Resilience
      { id: 'premortem', label: 'tools/premortem.js', domain: 'resilience', color: '#EF4444', x: 860, y: 370, r: 13, blastRadius: 'Failure Simulation', transitive: '6-Month Postmortem', sig: 'Adversarial Defense', isolation: 'Sandbox Audit', desc: 'Simulación adversarial pre-código y cálculo de radio de explosión para prevenir fallas silenciosas.' },
      { id: 'fuzzer_10k', label: 'tools/chaos_fuzzer_10k.js', domain: 'resilience', color: '#EF4444', x: 760, y: 440, r: 12, blastRadius: '10.000 Vectores Caos', transitive: '0% Evasión Verificada', sig: 'Burst Invariant', isolation: 'Isolated Process', desc: 'Motor de pruebas de caos masivo con 10.000 mutaciones de ataque para verificar la inviolabilidad fail-closed.' },
      { id: 'type_reconciler', label: 'tools/semantic_type_reconciler.js', domain: 'resilience', color: '#EF4444', x: 910, y: 260, r: 10, blastRadius: 'AST Type Invariants', transitive: 'SMT Verified Guard', sig: 'Backpropagated Fix', isolation: 'Zero Runtime Error', desc: 'Reconciliador semántico de tipos en tiempo de ejecución con retropropagación de guardas canónicas.' }
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

    function getNeighbors(nodeId) {
      const neighbors = new Set([nodeId]);
      RADAR_EDGES.forEach(e => {
        if (e.from === nodeId) neighbors.add(e.to);
        if (e.to === nodeId) neighbors.add(e.from);
      });
      return neighbors;
    }

    function renderRadar() {
      ctx.clearRect(0, 0, width, height);

      // Background grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
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

      const activeNeighbors = selectedNode ? getNeighbors(selectedNode.id) : new Set();

      // Render Edges
      RADAR_EDGES.forEach(edge => {
        const fromNode = RADAR_NODES.find(n => n.id === edge.from);
        const toNode = RADAR_NODES.find(n => n.id === edge.to);
        if (!fromNode || !toNode) return;

        const isHighlighted = (edge.from === selectedNode.id || edge.to === selectedNode.id);
        const isDimmed = activeDomainFilter !== 'all' && (fromNode.domain !== activeDomainFilter && toNode.domain !== activeDomainFilter);

        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);

        if (isHighlighted) {
          ctx.strokeStyle = '#00F5A0';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = 'rgba(0, 245, 160, 0.8)';
          ctx.shadowBlur = 10;
        } else if (isDimmed) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
          ctx.lineWidth = 1;
          ctx.shadowBlur = 0;
        } else {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
          ctx.lineWidth = 1.2;
          ctx.shadowBlur = 0;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      // Blast simulation pulse animation
      if (blastSimulationActive) {
        blastAnimFrame = (blastAnimFrame + 1) % 60;
        const blastRadiusAnim = (blastAnimFrame / 60) * 120;
        const blastAlpha = 1 - (blastAnimFrame / 60);

        ctx.beginPath();
        ctx.arc(selectedNode.x, selectedNode.y, blastRadiusAnim, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 245, 160, ${blastAlpha})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Render Nodes
      RADAR_NODES.forEach(node => {
        const isSelected = selectedNode && selectedNode.id === node.id;
        const isNeighbor = activeNeighbors.has(node.id);
        const isDimmed = activeDomainFilter !== 'all' && node.domain !== activeDomainFilter;

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);

        if (isSelected) {
          ctx.fillStyle = '#FFFFFF';
          ctx.shadowColor = node.color;
          ctx.shadowBlur = 20;
        } else if (isNeighbor) {
          ctx.fillStyle = node.color;
          ctx.shadowColor = node.color;
          ctx.shadowBlur = 12;
        } else if (isDimmed) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = node.color;
          ctx.shadowBlur = 4;
          ctx.shadowColor = node.color;
        }

        ctx.fill();
        ctx.shadowBlur = 0;

        // Node outline
        ctx.strokeStyle = isSelected ? '#00F5A0' : 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = isSelected ? 3 : 1.5;
        ctx.stroke();

        // Node label
        ctx.font = isSelected ? 'bold 11px JetBrains Mono' : '10px JetBrains Mono';
        ctx.fillStyle = isDimmed ? 'rgba(255, 255, 255, 0.2)' : '#E2E8F0';
        ctx.textAlign = 'center';
        ctx.fillText(node.label.split('/').pop(), node.x, node.y + node.r + 14);
      });

      requestAnimationFrame(renderRadar);
    }

    renderRadar();

    // Mouse Interaction on Radar Canvas
    radarCanvas.addEventListener('mousemove', (e) => {
      const rect = radarCanvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      let found = null;
      for (const node of RADAR_NODES) {
        const dist = Math.hypot(node.x - mouseX, node.y - mouseY);
        if (dist <= node.r + 6) {
          found = node;
          break;
        }
      }
      hoveredNode = found;
      radarCanvas.style.cursor = found ? 'pointer' : 'crosshair';
    });

    radarCanvas.addEventListener('click', (e) => {
      if (hoveredNode) {
        selectRadarNode(hoveredNode);
        playSuccessChime();
      }
    });

    // Domain Filters
    radarFilters.forEach(chip => {
      chip.addEventListener('click', () => {
        playKeyClick();
        radarFilters.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        activeDomainFilter = chip.getAttribute('data-domain');

        const counts = {
          all: '152 Nodos Conectados',
          gov: '66 Módulos (Gobernanza)',
          crypto: '25 Módulos (Criptografía)',
          intent: '22 Módulos (Intención)',
          state: '22 Módulos (Estado)',
          resilience: '17 Módulos (Resiliencia)'
        };
        if (radarActiveCount && counts[activeDomainFilter]) {
          radarActiveCount.textContent = counts[activeDomainFilter];
        }
      });
    });

    // Blast Radius Simulator Button
    if (btnHighlightBlast) {
      btnHighlightBlast.addEventListener('click', () => {
        playSuccessChime();
        blastSimulationActive = true;
        showToast(`💥 Simulando Blast Radius para ${selectedNode.label}`);
        setTimeout(() => { blastSimulationActive = false; }, 3000);
      });
    }
  }

  // ── 12. Dynamic Spotlight Cursor Tracker (Raycast / Vercel Style) ─
  const spotlightCards = document.querySelectorAll('.bento-card, .cmd-card');

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

  // ── 13. Language Switcher (EN / ES) ────────────────────────────────
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

    const heroEyebrow = document.querySelector('.hero-eyebrow span:last-child');
    if (heroEyebrow) heroEyebrow.textContent = dict.heroEyebrow;

    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) heroTitle.innerHTML = dict.heroTitle;

    const heroLead = document.querySelector('.hero-lead');
    if (heroLead) heroLead.textContent = dict.heroLead;

    // Actualizar nodos del circuito
    nodes.forEach(node => {
      const p = node.getAttribute('data-phase');
      const data = dict.phases[p];
      if (data) {
        const nameEl = node.querySelector('.node-name');
        if (nameEl) nameEl.textContent = data.name;
      }
    });

    const activeNode = document.querySelector('.circuit-node.active');
    if (activeNode) {
      const p = activeNode.getAttribute('data-phase');
      const data = dict.phases[p];
      if (data && phaseBadge && phaseDesc) {
        phaseBadge.textContent = data.title;
        phaseDesc.textContent = data.desc;
      }
    }
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
