/**
 * Axion Protocol — comportamiento de la portada.
 *
 * Sin dependencias externas. Todo lo que hay aqui es presentacion: la consola es
 * una simulacion declarada y no ejecuta ninguna herramienta del proyecto.
 */
'use strict';

const prefiereMenosMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── Sonido ──────────────────────────────────────────────────────────────── */
// Desactivado por defecto: una pagina no deberia hacer ruido sin permiso.
let audioCtx = null;
let soundEnabled = false;

function playSyntheticSound(freq = 440, type = 'sine', duration = 0.08) {
  if (!soundEnabled) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (_) { /* si el navegador lo bloquea, seguimos sin sonido */ }
}

/* ── Avisos ──────────────────────────────────────────────────────────────── */
function showToast(message, type = 'info') {
  const cont = document.getElementById('toast-container');
  if (!cont) return;
  const el = document.createElement('div');
  el.className = 'toast';
  if (type === 'success') el.style.borderLeftColor = 'var(--green)';
  if (type === 'error') el.style.borderLeftColor = 'var(--red)';
  el.textContent = message;
  cont.appendChild(el);
  setTimeout(() => el.remove(), 3600);
}

/* ── Consola simulada ────────────────────────────────────────────────────── */

const term = () => document.getElementById('term-output');

function termWrite(lineas) {
  const out = term();
  if (!out) return;
  out.innerHTML = lineas.join('\n');
  out.scrollTop = out.scrollHeight;
}

function comandoPeligrosoActivo() {
  const chk = document.getElementById('chk-simulate-error');
  return !!(chk && chk.checked);
}

function runPreflightDemo() {
  playSyntheticSound(600, 'sine', 0.06);
  if (comandoPeligrosoActivo()) {
    termWrite([
      '<span class="dim">[axion] Simulacion de: node tools/preflight.js "rm -rf /"</span>',
      '',
      '<span class="dim">Comando recibido:</span>  rm -rf /  <span class="dim">(cadena de shell)</span>',
      '',
      '<span class="err">RESULTADO: DENY</span>',
      '<span class="err">Motivo ....... RAW_DESTRUCTIVE_COMMAND</span>',
      '<span class="dim">Codigo de salida: 1</span>',
      '',
      '<span class="dim">  Se deniega sin preguntar y sin ofrecer continuar. Ante algo que parece</span>',
      '<span class="dim">  destructivo, el protocolo se detiene en lugar de adivinar.</span>',
    ]);
    showToast('Comando destructivo denegado', 'error');
    return;
  }
  termWrite([
    '<span class="dim">[axion] Simulacion de: node tools/preflight.js "git commit -m mensaje"</span>',
    '',
    '<span class="dim">Comando recibido:</span>  git commit -m mensaje  <span class="dim">(cadena de shell)</span>',
    '',
    '<span class="warn">RESULTADO: NEEDS_HUMAN_REVIEW</span>',
    '<span class="warn">Motivo ....... RAW_SHELL_NOT_AUTHORIZED</span>',
    '<span class="dim">Codigo de salida: 2</span>',
    '',
    '<span class="dim">  Ojo: no se frena por peligroso, sino porque va envuelto en un shell y asi</span>',
    '<span class="dim">  no se puede saber con certeza que acabaria ejecutando. Una cadena de shell</span>',
    '<span class="dim">  cruda NUNCA sale adelante sola: como mucho llega a revision humana.</span>',
    '',
    '<span class="dim">  Para que salga adelante hay que decir exactamente que se ejecuta.</span>',
    '<span class="dim">  Pulsa "Comando bien formado" para verlo.</span>',
  ]);
  showToast('Enviado a revision humana', 'info');
}

function runStructuredDemo() {
  playSyntheticSound(700, 'sine', 0.06);
  termWrite([
    '<span class="dim">[axion] Simulacion de: node tools/preflight.js --json {"executable":"git",</span>',
    '<span class="dim">        "args":["status"],"cwd":".","shell":false}</span>',
    '',
    '<span class="dim">Ejecutable ...</span>  git',
    '<span class="dim">Argumentos ...</span>  status',
    '<span class="dim">Shell ........</span>  false  <span class="dim">(sin interprete de por medio)</span>',
    '',
    '<span class="ok">RESULTADO: ALLOW</span>',
    '<span class="ok">Motivo ....... STRUCTURED_READ_ONLY_GIT</span>',
    '<span class="dim">Codigo de salida: 0</span>',
    '',
    '<span class="dim">  Cada parte del comando viene declarada por separado, asi que no hay margen</span>',
    '<span class="dim">  de interpretacion. Y aun asi solo pasa porque "git status" esta en la lista</span>',
    '<span class="dim">  de operaciones de solo lectura: "git commit" iria a revision humana.</span>',
    '',
    '<span class="dim">  Pasar de aqui exige ademas evidencia y una comprobacion hecha por alguien</span>',
    '<span class="dim">  distinto de quien ejecuta.</span>',
  ]);
  showToast('Comando estructurado aceptado', 'success');
}

function runClarifierDemo() {
  playSyntheticSound(520, 'triangle', 0.06);
  termWrite([
    '<span class="dim">[axion] Simulacion. No se ejecuta nada real.</span>',
    '',
    '<span class="dim">Has pedido:</span>  "hazme un login"',
    '',
    '<span class="warn">La peticion es demasiado abierta. Antes de construir, se pregunta.</span>',
    '',
    '  1. Que rumbo prefieres',
    '     a) Algo sencillo que funcione ya',
    '     b) Algo completo y guiado',
    '     c) Prefiero explicarlo yo',
    '',
    '  2. Que aspecto deberia tener',
    '     a) Sobrio y limpio',
    '     b) Vivo y llamativo',
    '     c) Tengo algo en mente',
    '',
    '  3. Hasta donde llega el encargo',
    '',
    '<span class="ok">Ninguna linea de codigo se escribe hasta que confirmas el resumen.</span>',
    '',
    '<span class="dim">De verdad:  node tools/intent_clarifier.js "hazme un login"</span>',
  ]);
}

function clearTerm() {
  termWrite([
    '<span class="dim">[axion] Esto es una SIMULACION: reproduce salidas de ejemplo, no ejecuta las herramientas.</span>',
    '<span class="dim">[axion] Para ejecutarlas de verdad: node tools/preflight.js "&lt;comando&gt;"</span>',
    '<span class="dim">[axion] Pulsa un boton para empezar.</span>',
  ]);
}

/* ── Aclarador ───────────────────────────────────────────────────────────── */

let wizardStep = 1;
let eleccionRumbo = 'algo sencillo que funcione ya';
let eleccionEstilo = 'sobrio y limpio';

function pintarPasoWizard() {
  for (let i = 1; i <= 3; i++) {
    const pill = document.getElementById(`pill-step-${i}`);
    const card = document.getElementById(`wizard-step-${i}-card`);
    if (pill) pill.classList.toggle('active', i === wizardStep);
    if (card) card.hidden = i !== wizardStep;
  }
}

function selectWizardOption(step, valor) {
  playSyntheticSound(660, 'sine', 0.05);
  if (step === 1) { eleccionRumbo = valor; wizardStep = 2; }
  else if (step === 2) {
    eleccionEstilo = valor;
    wizardStep = 3;
    const resumen = document.getElementById('contract-summary');
    if (resumen) {
      resumen.textContent =
        `Quieres ${eleccionRumbo}, con un aspecto ${eleccionEstilo}. ` +
        'Trabajaré solo sobre eso: si hace falta salirse de ahí, te pregunto antes.';
    }
    showToast('Resumen de entendimiento emitido', 'success');
  }
  pintarPasoWizard();
}

function resetWizard() {
  wizardStep = 1;
  eleccionRumbo = 'algo sencillo que funcione ya';
  eleccionEstilo = 'sobrio y limpio';
  pintarPasoWizard();
}

/* ── Arranque ────────────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {

  /* Fondo de particulas. Se omite por completo si se pide menos movimiento. */
  const canvas = document.getElementById('hero-canvas');
  if (canvas && !prefiereMenosMovimiento) {
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    const mouse = { x: width / 2, y: height / 2 };

    const leerAcento = () => getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#00f0ff';
    let acento = leerAcento();

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });
    window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
    document.addEventListener('axion:theme', () => { acento = leerAcento(); });

    const particulas = [];
    const total = Math.min(Math.floor((width * height) / 22000), 90);
    for (let i = 0; i < total; i++) {
      particulas.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        r: Math.random() * 1.8 + 0.8,
      });
    }

    (function animar() {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = acento;
      ctx.globalAlpha = 0.45;

      for (let i = 0; i < particulas.length; i++) {
        const p = particulas[i];
        p.x += p.vx; p.y += p.vy;

        const dx = mouse.x - p.x, dy = mouse.y - p.y;
        const d = Math.hypot(dx, dy);
        if (d < 150 && d > 0) { p.x += (dx / d) * 0.25; p.y += (dy / d) * 0.25; }

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();

        for (let j = i + 1; j < particulas.length; j++) {
          const q = particulas[j];
          const dist = Math.hypot(p.x - q.x, p.y - q.y);
          if (dist < 130) {
            ctx.globalAlpha = 0.07;
            ctx.strokeStyle = acento;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
            ctx.stroke();
            ctx.globalAlpha = 0.45;
          }
        }
      }
      requestAnimationFrame(animar);
    }());
  }

  /* Barra de progreso de lectura */
  const progreso = document.getElementById('scroll-progress');
  const navItems = Array.from(document.querySelectorAll('.nav-item'));
  const secciones = navItems
    .map((a) => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);

  function alScroll() {
    if (progreso) {
      const alto = document.documentElement.scrollHeight - window.innerHeight;
      progreso.style.width = alto > 0 ? `${(window.scrollY / alto) * 100}%` : '0%';
    }
    let actual = 0;
    secciones.forEach((sec, i) => {
      if (sec.getBoundingClientRect().top <= window.innerHeight * 0.35) actual = i;
    });
    navItems.forEach((a, i) => a.classList.toggle('active', i === actual));
  }
  window.addEventListener('scroll', alScroll, { passive: true });
  alScroll();

  /* Menu lateral en pantallas estrechas */
  const sidebar = document.getElementById('sidebar');
  const menuToggle = document.getElementById('menu-toggle');
  function cerrarMenu() {
    if (!sidebar) return;
    sidebar.classList.remove('open');
    if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
  }
  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => {
      const abierto = sidebar.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', String(abierto));
    });
  }
  navItems.forEach((a) => a.addEventListener('click', cerrarMenu));

  /* Inclinacion de las tarjetas de metricas */
  if (!prefiereMenosMovimiento && window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.tilt-card').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const rx = ((e.clientY - r.top - r.height / 2) / (r.height / 2)) * -6;
        const ry = ((e.clientX - r.left - r.width / 2) / (r.width / 2)) * 6;
        card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-3px)`;
      });
      card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });
  }

  /* Color de acento */
  const TEMAS = ['theme-cyan', 'theme-indigo', 'theme-lime', 'theme-crimson'];
  const accentButtons = Array.from(document.querySelectorAll('.accent-btn'));

  function aplicarTema(tema) {
    document.body.classList.remove(...TEMAS);
    document.body.classList.add(tema);
    accentButtons.forEach((b) => b.classList.toggle('active', b.dataset.theme === tema));
    document.dispatchEvent(new CustomEvent('axion:theme'));
  }
  accentButtons.forEach((btn) => btn.addEventListener('click', () => {
    aplicarTema(btn.dataset.theme);
    playSyntheticSound(800, 'triangle', 0.05);
  }));

  /* Sonido */
  const audioToggle = document.getElementById('audio-toggle-btn');
  const audioText = document.getElementById('audio-state-text');
  if (audioToggle) {
    audioToggle.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      audioToggle.setAttribute('aria-pressed', String(soundEnabled));
      if (audioText) audioText.textContent = soundEnabled ? 'Sonido activado' : 'Sonido desactivado';
      if (soundEnabled) playSyntheticSound(880, 'sine', 0.1);
    });
  }

  /* Contadores */
  document.querySelectorAll('.counter').forEach((el) => {
    const objetivo = parseInt(el.dataset.target, 10);
    if (Number.isNaN(objetivo)) return;
    if (prefiereMenosMovimiento || objetivo === 0) { el.textContent = String(objetivo); return; }
    let n = 0;
    const paso = Math.max(1, objetivo / 28);
    (function subir() {
      n += paso;
      if (n < objetivo) { el.textContent = String(Math.ceil(n)); setTimeout(subir, 30); }
      else el.textContent = String(objetivo);
    }());
  });

  /* Las siete fases, explicadas sin jerga */
  const fases = {
    '1': { t: '1 · Entender', c: 'Sin jerga técnica', b: 'Te entrevista antes de tocar nada. Te pregunta qué quieres, cómo lo quieres y hasta dónde llega el encargo, siempre en lenguaje normal y siempre con la posibilidad de responder con tus propias palabras.' },
    '2': { t: '2 · Planificar', c: 'Mide el peligro', b: 'Calcula cuánto daño podría hacer la tarea y la clasifica en cuatro niveles, de bajo a crítico. De esa clasificación depende todo lo que viene después: cuanto más peligrosa, más permisos hacen falta.' },
    '3': { t: '3 · Autorizar', c: 'Decides tú', b: 'Lo que puede hacer daño de verdad se para aquí y espera tu permiso explícito. Ese permiso va firmado, caduca y solo sirve una vez, así que nadie puede reutilizarlo más tarde para colar otra cosa.' },
    '4': { t: '4 · Probar', c: 'Primero la prueba', b: 'Antes de construir se decide cómo se va a comprobar que quedó bien. Escribir la prueba primero evita el truco de fabricar después una comprobación a medida de lo que salió.' },
    '5': { t: '5 · Construir', c: 'Revisa antes de ejecutar', b: 'Cada comando se examina antes de lanzarlo. Si viene mal formado, con comillas sueltas o envuelto de forma que no se pueda saber qué hará, se rechaza o se manda a revisión humana.' },
    '6': { t: '6 · Auditar', c: 'Otro par de ojos', b: 'Se genera una huella criptográfica que enlaza lo que se pidió, lo que se aprobó, lo que se hizo y lo que se comprobó. Quien revisa tiene que ser alguien distinto de quien ejecutó.' },
    '7': { t: '7 · Promover', c: 'Nada se da por bueno solo', b: 'Que algo funcione no lo convierte en aprobado. La promoción exige una decisión humana aparte. Y lo aprendido por el camino queda anotado para no repetir el mismo malentendido.' },
  };

  const nodos = Array.from(document.querySelectorAll('.interactive-node'));
  const insTitle = document.getElementById('inspector-title');
  const insBody = document.getElementById('inspector-body');
  const insChip = document.getElementById('inspector-chip');

  nodos.forEach((nodo) => nodo.addEventListener('click', () => {
    const paso = nodo.dataset.step;
    nodos.forEach((n) => { n.classList.remove('active'); n.setAttribute('aria-selected', 'false'); });
    nodo.classList.add('active');
    nodo.setAttribute('aria-selected', 'true');
    playSyntheticSound(520, 'sine', 0.05);
    if (fases[paso]) {
      insTitle.textContent = fases[paso].t;
      insBody.textContent = fases[paso].b;
      if (insChip) insChip.textContent = fases[paso].c;
    }
  }));

  /* Aclarador */
  document.querySelectorAll('.option-card').forEach((card) => {
    card.addEventListener('click', () => {
      selectWizardOption(parseInt(card.dataset.step, 10), card.dataset.value);
    });
  });
  const btnReset = document.getElementById('wizard-reset');
  if (btnReset) btnReset.addEventListener('click', resetWizard);

  /* Consola */
  const btnPre = document.getElementById('btn-preflight');
  const btnCla = document.getElementById('btn-clarifier');
  const btnClr = document.getElementById('btn-clear');
  if (btnPre) btnPre.addEventListener('click', runPreflightDemo);
  if (btnCla) btnCla.addEventListener('click', runClarifierDemo);
  const btnStruct = document.getElementById('btn-structured');
  if (btnStruct) btnStruct.addEventListener('click', runStructuredDemo);
  if (btnClr) btnClr.addEventListener('click', clearTerm);

  /* Copiar el comando de instalacion */
  const btnCopy = document.getElementById('btn-copy-install');
  if (btnCopy) {
    btnCopy.addEventListener('click', async () => {
      const cmd = document.getElementById('install-cmd');
      const texto = cmd ? cmd.textContent.trim() : 'node install.js';
      try {
        await navigator.clipboard.writeText(texto);
        showToast('Comando copiado', 'success');
      } catch (_) {
        showToast('No se pudo copiar. Selecciónalo a mano.', 'error');
      }
    });
  }

  /* Paleta de comandos */
  const cmdTrigger = document.getElementById('cmd-palette-trigger');
  const cmdModal = document.getElementById('cmd-modal');
  const cmdInput = document.getElementById('cmd-input');
  const cmdItems = Array.from(document.querySelectorAll('.cmd-item'));
  let ultimoFoco = null;

  function abrirPaleta(mostrar) {
    if (!cmdModal) return;
    if (mostrar) {
      ultimoFoco = document.activeElement;
      cmdModal.hidden = false;
      if (cmdInput) { cmdInput.value = ''; cmdInput.focus(); }
      cmdItems.forEach((i) => { i.hidden = false; });
      playSyntheticSound(700, 'sine', 0.06);
    } else {
      cmdModal.hidden = true;
      if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus();
    }
  }

  if (cmdTrigger) cmdTrigger.addEventListener('click', () => abrirPaleta(true));
  if (cmdModal) cmdModal.addEventListener('click', (e) => { if (e.target === cmdModal) abrirPaleta(false); });
  if (cmdInput) {
    cmdInput.addEventListener('input', () => {
      const q = cmdInput.value.toLowerCase();
      cmdItems.forEach((i) => { i.hidden = !i.textContent.toLowerCase().includes(q); });
    });
  }

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); abrirPaleta(true); }
    if (e.key === 'Escape') { abrirPaleta(false); cerrarMenu(); }
  });

  cmdItems.forEach((item) => item.addEventListener('click', () => {
    const accion = item.dataset.action || '';
    abrirPaleta(false);
    if (accion === 'run-preflight') { document.getElementById('playground').scrollIntoView(); runPreflightDemo(); }
    else if (accion === 'run-clarifier') { document.getElementById('playground').scrollIntoView(); runClarifierDemo(); }
    else if (accion === 'go-clarificador') document.getElementById('clarificador').scrollIntoView();
    else if (accion === 'go-estado') document.getElementById('estado').scrollIntoView();
    else if (accion.startsWith('theme-')) aplicarTema(accion);
  }));

  pintarPasoWizard();
});
