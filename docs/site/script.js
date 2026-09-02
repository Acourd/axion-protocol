/**
 * Axion Protocol — Sovereign Engineering Controller & Audio-Visual Runtime (v2.0)
 * Native RFC 6455 WebSocket + Web Audio API + Physics Radar + Command Palette ⌘K + Tuner.
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
      toastCustomApplied: '✓ Workspace customization updated',
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
      swarmTitle: 'Swarm Architecture v2.0 & Arbitration Triumvirate',
      swarmDesc: 'Three decoupled mathematical pillars to coordinate AI swarms without race conditions or blind overrides:',
      pillar1Title: 'Granular AST Symbol Locking',
      pillar1Desc: 'Manages atomic editing permissions on individual functions and classes instead of locking entire files.',
      pillar2Title: 'P2P Message Bus with Asymmetric Signing',
      pillar2Desc: 'Direct inter-agent communication channel authenticated with ephemeral Ed25519 keypairs.',
      pillar3Title: 'Byzantine Consensus Quorum (BFT ≥ 66%)',
      pillar3Desc: 'No structural code mutation is applied without reaching a qualified supermajority of 66.7% of evaluator votes.',
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
      toastCustomApplied: '✓ Personalización de entorno aplicada',
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
      swarmTitle: 'Arquitectura Swarm v2.0 & Triunvirato de Arbitraje',
      swarmDesc: 'Tres pilares matemáticos desacoplados para coordinar enjambres de IA sin condiciones de carrera ni modificaciones ciegas:',
      pillar1Title: 'Bloqueo Granular de Símbolos AST',
      pillar1Desc: 'Gestiona permisos de edición atómicos sobre funciones y clases individuales en lugar de bloquear archivos enteros.',
      pillar2Title: 'Bus de Mensajes P2P con Firma Asimétrica',
      pillar2Desc: 'Canal de comunicación directo inter-agente autenticado mediante pares de llaves Ed25519 efímeras.',
      pillar3Title: 'Quórum de Consenso Bizantino (BFT ≥ 66%)',
      pillar3Desc: 'Ninguna mutación estructural se aplica al código sin alcanzar una supermayoría calificada del 66.7% de los votos.',
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

  // ── 2. Web Audio Haptic Synthesizer (Zero External Assets) ─────────
  let audioCtx = null;
  let soundProfile = localStorage.getItem('axion_sound_profile') || 'synth';

  function initAudio() {
    if (!audioCtx && typeof window.AudioContext !== 'undefined') {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playKeyClick() {
    if (soundProfile === 'off') return;
    initAudio();
    if (!audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      if (soundProfile === 'click') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.015, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.02);
      } else {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.03, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.03);
      }
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.03);
    } catch (e) {
      console.debug('Audio error:', e);
    }
  }

  function playSuccessChime() {
    if (soundProfile === 'off') return;
    initAudio();
    if (!audioCtx) return;
    try {
      const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5 (C Major)
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
    if (soundProfile === 'off') return;
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
    if (soundProfile === 'off') return;
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

  // ── 4. Scroll Progress Indicator ───────────────────────────────────
  const scrollProgress = document.getElementById('scroll-progress');
  window.addEventListener('scroll', () => {
    const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = totalHeight > 0 ? (window.scrollY / totalHeight) * 100 : 0;
    if (scrollProgress) scrollProgress.style.width = `${progress}%`;
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

  // ── 6. Theme & Customizer Engine ───────────────────────────────────
  const htmlRoot = document.documentElement;
  const themeToggleBtn = document.getElementById('theme-toggle');
  const btnOpenCustomizer = document.getElementById('btn-open-customizer');
  const btnCloseDrawer = document.getElementById('btn-close-drawer');
  const customizerDrawer = document.getElementById('customizer-drawer');

  // Cargar preferencias
  const savedTheme = localStorage.getItem('axion_theme') || 'dark';
  const savedAccent = localStorage.getItem('axion_accent') || 'emerald';
  const savedDensity = localStorage.getItem('axion_density') || 'standard';
  const savedBg = localStorage.getItem('axion_bg') || 'grid';

  htmlRoot.setAttribute('data-theme', savedTheme);
  htmlRoot.setAttribute('data-accent', savedAccent);
  htmlRoot.setAttribute('data-density', savedDensity);
  htmlRoot.setAttribute('data-bg', savedBg);

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

  if (btnOpenCustomizer && customizerDrawer) {
    btnOpenCustomizer.addEventListener('click', () => {
      playKeyClick();
      customizerDrawer.classList.toggle('open');
    });
  }

  if (btnCloseDrawer && customizerDrawer) {
    btnCloseDrawer.addEventListener('click', () => {
      playKeyClick();
      customizerDrawer.classList.remove('open');
    });
  }

  // Accent Switcher Buttons
  const accentButtons = document.querySelectorAll('#accent-picker .accent-btn');
  accentButtons.forEach(btn => {
    if (btn.getAttribute('data-accent') === savedAccent) {
      accentButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }
    btn.addEventListener('click', () => {
      playKeyClick();
      accentButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const accent = btn.getAttribute('data-accent');
      htmlRoot.setAttribute('data-accent', accent);
      localStorage.setItem('axion_accent', accent);
      playSuccessChime();
      showToast(I18N[currentLang].toastCustomApplied);
    });
  });

  // Density Switcher Buttons
  const densityButtons = document.querySelectorAll('#density-toggle .seg-btn');
  densityButtons.forEach(btn => {
    if (btn.getAttribute('data-density') === savedDensity) {
      densityButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }
    btn.addEventListener('click', () => {
      playKeyClick();
      densityButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const density = btn.getAttribute('data-density');
      htmlRoot.setAttribute('data-density', density);
      localStorage.setItem('axion_density', density);
    });
  });

  // Background Texture Buttons
  const bgButtons = document.querySelectorAll('#bg-texture-toggle .seg-btn');
  bgButtons.forEach(btn => {
    if (btn.getAttribute('data-bg') === savedBg) {
      bgButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }
    btn.addEventListener('click', () => {
      playKeyClick();
      bgButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const bg = btn.getAttribute('data-bg');
      htmlRoot.setAttribute('data-bg', bg);
      localStorage.setItem('axion_bg', bg);
    });
  });

  // Sound Profile Buttons & Test Actions
  const soundButtons = document.querySelectorAll('#sound-profile-toggle .seg-btn');
  soundButtons.forEach(btn => {
    if (btn.getAttribute('data-sound') === soundProfile) {
      soundButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }
    btn.addEventListener('click', () => {
      soundButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      soundProfile = btn.getAttribute('data-sound');
      localStorage.setItem('axion_sound_profile', soundProfile);
      const soundTag = document.getElementById('sound-status-tag');
      if (soundTag) soundTag.textContent = soundProfile === 'off' ? 'Mudo' : 'Activado';
      playKeyClick();
    });
  });

  const btnTestChime = document.getElementById('btn-test-chime');
  const btnTestAlert = document.getElementById('btn-test-alert');
  const btnTestPing = document.getElementById('btn-test-ping');

  if (btnTestChime) btnTestChime.addEventListener('click', playSuccessChime);
  if (btnTestAlert) btnTestAlert.addEventListener('click', playAlertBeep);
  if (btnTestPing) btnTestPing.addEventListener('click', playRadarPing);

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

    // Click handler on items
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

  // Atajo global de teclado (⌘K / Ctrl+K)
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openPalette();
    } else if (e.key === 'Escape') {
      closePalette();
      if (customizerDrawer) customizerDrawer.classList.remove('open');
    }
  });

  // ── 8. Interactive Terminal Simulator Playground ───────────────────
  const simTerminalOutput = document.getElementById('sim-terminal-output');
  const simTerminalForm = document.getElementById('sim-terminal-form');
  const simTerminalInput = document.getElementById('sim-terminal-input');
  const btnClearTerminal = document.getElementById('btn-clear-terminal');
  const quickCmdButtons = document.querySelectorAll('.btn-quick-cmd');

  function appendTerminalLine(type, text) {
    if (!simTerminalOutput) return;
    const line = document.createElement('div');
    line.className = `term-msg ${type}`;
    line.innerHTML = text;
    simTerminalOutput.appendChild(line);
    simTerminalOutput.scrollTop = simTerminalOutput.scrollHeight;
  }

  function executeSimulatorCommand(cmd) {
    if (!cmd) return;
    playKeyClick();
    appendTerminalLine('cmd', `$ ${cmd}`);

    const clean = cmd.trim().toLowerCase();
    if (clean === '/drive') {
      playSuccessChime();
      appendTerminalLine('info', '[/drive] Iniciando meta-orquestador autónomo universal...');
      appendTerminalLine('pass', '✓ 7 fases sincronizadas · 0 colisiones en AST namespace');
      appendTerminalLine('pass', '✓ Consenso BFT alcanzado con 4/4 quórum de subagentes');
      appendTerminalLine('pass', '✓ in-toto Statement v1 emitido con sobre DSSE');
    } else if (clean === '/verify') {
      playSuccessChime();
      appendTerminalLine('info', '[/verify] Ejecutando suite de 201 pruebas deterministas en 8 workers...');
      appendTerminalLine('pass', '✓ 201/201 suites PASS (0 FAIL, tiempo: 13.39s, exit code 0)');
    } else if (clean.includes('rm -rf') || clean.includes('drop database') || clean.includes(':(){ :|:& };:')) {
      playAlertBeep();
      appendTerminalLine('deny', '🚨 [PREFLIGHT INTERCEPTOR] Veredicto: DENY (VIBEGUARD GATE)');
      appendTerminalLine('deny', 'Vector destructivo interceptado antes de invocar sub-shell.');
      appendTerminalLine('pass', '✓ Árbol protegido en modo Fail-Closed. Cero bytes modificados.');
    } else if (clean === '/snapshot') {
      playSuccessChime();
      appendTerminalLine('info', '[/snapshot] Creando punto de control inmutable SHA-256...');
      appendTerminalLine('pass', '✓ Checkpoint "chk_2026_0902" sellado con éxito (131 archivos indexados).');
    } else if (clean === '/rollback') {
      playSuccessChime();
      appendTerminalLine('info', '[/rollback] Restaurando árbol al último punto de control...');
      appendTerminalLine('pass', '✓ Reversión atómica completada en 3.8 ms. Árbol de archivos recuperado al 100%.');
    } else if (clean === '/premortem') {
      playSuccessChime();
      appendTerminalLine('info', '[/premortem] Ejecutando simulación adversarial pre-código...');
      appendTerminalLine('pass', '✓ 3 vectores de falla evaluados · Radio de explosión delimitado al submódulo.');
    } else if (clean === '/attest') {
      playSuccessChime();
      appendTerminalLine('info', '[/attest] Generando atestación criptográfica in-toto Statement v1...');
      appendTerminalLine('pass', '✓ Sobre DSSE generado con clave Ed25519 (Digest: 2253d4c4...)');
    } else {
      appendTerminalLine('info', `[axion] Comando procesado: "${cmd}". Ejecutando preflight síncrono...`);
      appendTerminalLine('pass', '✓ Veredicto: ALLOW (Sin riesgos destructivos detectados)');
    }
  }

  if (simTerminalForm && simTerminalInput) {
    simTerminalForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = simTerminalInput.value.trim();
      if (val) {
        executeSimulatorCommand(val);
        simTerminalInput.value = '';
      }
    });
  }

  quickCmdButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const c = btn.getAttribute('data-cmd');
      executeSimulatorCommand(c);
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
        if (voteEl) voteEl.textContent = 'Deliberando...';
      });

      if (quorumVal) quorumVal.textContent = '0%';
      if (quorumBarFill) quorumBarFill.style.width = '0%';
      if (quorumResultText) quorumResultText.textContent = 'Iniciando votación criptográfica...';

      let votes = 0;
      const total = agentNodes.length;

      agentNodes.forEach((node, idx) => {
        setTimeout(() => {
          playKeyClick();
          node.classList.add('voted-pass');
          const voteEl = node.querySelector('.node-vote');
          if (voteEl) voteEl.textContent = '✓ Aprobado (Pass)';
          votes++;
          const pct = Math.round((votes / total) * 100);
          if (quorumVal) quorumVal.textContent = `${pct}%`;
          if (quorumBarFill) quorumBarFill.style.width = `${pct}%`;

          if (votes === total) {
            playSuccessChime();
            if (quorumResultText) quorumResultText.textContent = '✓ Quórum BFT alcanzado (100% ≥ 66.7%). Mutación autorizada y sellada en DSSE.';
            showToast('✓ Quórum de consenso BFT alcanzado');
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
        if (sealHashDisplay) sealHashDisplay.textContent = data.hash;
        if (contractCodeDisplay) contractCodeDisplay.textContent = data.code;
        playSuccessChime();
      }
    });
  });

  if (btnCopyContract && contractCodeDisplay) {
    btnCopyContract.addEventListener('click', () => {
      navigator.clipboard.writeText(contractCodeDisplay.textContent).then(() => {
        playSuccessChime();
        showToast(I18N[currentLang].toastCopied);
      }).catch((err) => {
        console.debug('Copy error:', err);
      });
    });
  }

  // ── 11. Interactive Architecture Radar Canvas Engine ───────────────
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
      const dpr = window.devicePixelRatio || 1;
      radarCanvas.width = width * dpr;
      radarCanvas.height = height * dpr;
      ctx.scale(dpr, dpr);
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

      // Grid de fondo
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

      // Conexiones
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
          ctx.strokeStyle = '#10B981';
          ctx.lineWidth = 2.5;
        } else if (isDimmed) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
          ctx.lineWidth = 1;
        } else {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
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

      // Nodos
      RADAR_NODES.forEach(node => {
        const isSelected = selectedNode && selectedNode.id === node.id;
        const isDimmed = activeDomainFilter !== 'all' && node.domain !== activeDomainFilter;

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        ctx.fillStyle = isDimmed ? 'rgba(255, 255, 255, 0.1)' : (isSelected ? '#FFFFFF' : node.color);
        ctx.fill();

        ctx.strokeStyle = isSelected ? '#10B981' : 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = isSelected ? 3 : 1.5;
        ctx.stroke();

        ctx.font = isSelected ? 'bold 11px JetBrains Mono' : '10px JetBrains Mono';
        ctx.fillStyle = isDimmed ? 'rgba(255, 255, 255, 0.2)' : '#E2E8F0';
        ctx.textAlign = 'center';
        ctx.fillText(node.label.split('/').pop(), node.x, node.y + node.r + 14);
      });

      requestAnimationFrame(renderRadar);
    }
    renderRadar();

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
        showToast(`💥 Simulando Blast Radius para ${selectedNode.label}`);
        setTimeout(() => { blastSimulationActive = false; }, 3200);
      });
    }
  }

  // ── 12. Live Throughput Canvas Chart Streamer ──────────────────────
  const chartCanvas = document.getElementById('telemetry-chart');
  if (chartCanvas) {
    const ctx = chartCanvas.getContext('2d');
    let dataPoints = Array.from({ length: 40 }, () => Math.floor(Math.random() * 200 + 1550));

    function drawChart() {
      const rect = chartCanvas.getBoundingClientRect();
      const w = rect.width || 600;
      const h = 180;
      const dpr = window.devicePixelRatio || 1;
      chartCanvas.width = w * dpr;
      chartCanvas.height = h * dpr;
      ctx.scale(dpr, dpr);

      ctx.clearRect(0, 0, w, h);

      // Eje y gradiente
      const gradient = ctx.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
      gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

      ctx.beginPath();
      const step = w / (dataPoints.length - 1);
      dataPoints.forEach((val, idx) => {
        const x = idx * step;
        const normalized = (val - 1400) / 500;
        const y = h - (normalized * (h - 20)) - 10;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.fillStyle = gradient;
      ctx.fill();
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
    node: 'node dist/axion.bundle.js verify',
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

  // ── 17. Language Switcher ──────────────────────────────────────────
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
      playKeyClick();
      const l = btn.getAttribute('data-lang');
      applyLanguage(l);
      showToast(I18N[l].toastLang);
    });
  });

  applyLanguage(currentLang);
});
