/**
 * Axion Protocol — Masterpiece Flagship Interactive JavaScript Engine
 */

// 1. Web Audio API Synthesizer (Zero-Dependency Sound Effects)
let audioCtx = null;
let soundEnabled = true;

function playSyntheticSound(freq = 440, type = 'sine', duration = 0.08) {
  if (!soundEnabled) return;
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      // Setup master compressor to avoid clipping on rapid consecutive sounds
      audioCtx.masterCompressor = audioCtx.createDynamicsCompressor();
      audioCtx.masterCompressor.threshold.setValueAtTime(-10, audioCtx.currentTime);
      audioCtx.masterCompressor.knee.setValueAtTime(10, audioCtx.currentTime);
      audioCtx.masterCompressor.ratio.setValueAtTime(12, audioCtx.currentTime);
      audioCtx.masterCompressor.attack.setValueAtTime(0, audioCtx.currentTime);
      audioCtx.masterCompressor.release.setValueAtTime(0.25, audioCtx.currentTime);
      audioCtx.masterCompressor.connect(audioCtx.destination);
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.masterCompressor);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (err) {
    // Fail silently if audio context is blocked
  }
}

// 2. Toast Notification System
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerText = message;

  if (type === 'success') toast.style.borderLeftColor = 'var(--green)';
  if (type === 'error') toast.style.borderLeftColor = 'var(--red)';
  if (type === 'warning') toast.style.borderLeftColor = 'var(--amber)';

  container.appendChild(toast);
  playSyntheticSound(600, 'sine', 0.1);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {

  // 3. Custom Awwwards Dual Cursor & Magnetic Follower
  const cursor = document.getElementById('custom-cursor');
  const follower = document.getElementById('custom-cursor-follower');

  if (cursor && follower && window.matchMedia('(hover: hover)').matches) {
    let posX = 0, posY = 0;
    let mouseX = 0, mouseY = 0;

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      cursor.style.left = `${mouseX}px`;
      cursor.style.top = `${mouseY}px`;
    });

    function renderCursor() {
      posX += (mouseX - posX) * 0.15;
      posY += (mouseY - posY) * 0.15;
      follower.style.left = `${posX}px`;
      follower.style.top = `${posY}px`;
      requestAnimationFrame(renderCursor);
    }
    renderCursor();

    const hoverables = document.querySelectorAll('a, button, input, select, .tilt-card, .interactive-node, .option-card');
    hoverables.forEach(el => {
      el.addEventListener('mouseenter', () => follower.classList.add('hovered'));
      el.addEventListener('mouseleave', () => follower.classList.remove('hovered'));
    });
  }

  // 4. Interactive Canvas Particle Background with Physics & Mouse Attraction
  const canvas = document.getElementById('hero-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    let mouse = { x: width / 2, y: height / 2 };

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });

    const particles = [];
    // Dynamic particle count based on screen area to optimize performance
    const particleCount = Math.min(Math.floor((width * height) / 20000), 120);

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        radius: Math.random() * 2 + 1
      });
    }

    function animateParticles() {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(0, 240, 255, 0.4)';
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';

      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;

        // Slight attraction to mouse
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const distToMouse = Math.hypot(dx, dy);
        if (distToMouse < 150) {
          p.x += (dx / distToMouse) * 0.3;
          p.y += (dy / distToMouse) * 0.3;
        }

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 140) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      });

      requestAnimationFrame(animateParticles);
    }
    animateParticles();
  }

  // 5. Vanilla 3D Card Tilt Effect
  // Helper: Throttle for performance
  function throttle(fn, wait) {
    let time = Date.now();
    return function(...args) {
      if ((time + wait - Date.now()) < 0) {
        fn(...args);
        time = Date.now();
      }
    }
  }

  const tiltCards = document.querySelectorAll('.tilt-card');
  tiltCards.forEach(card => {
    card.addEventListener('mousemove', throttle((e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -10;
      const rotateY = ((x - centerX) / centerX) * 10;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    }, 16)); // ~60fps throttle

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
    });
  });

  // 6. Accent Theme Switcher
  const accentButtons = document.querySelectorAll('.accent-btn');
  const allThemes = ['theme-cyan', 'theme-indigo', 'theme-lime', 'theme-crimson'];
  accentButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.getAttribute('data-theme');
      document.body.classList.remove(...allThemes);
      if (theme) document.body.classList.add(theme);

      accentButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      playSyntheticSound(800, 'triangle', 0.05);
      showToast(`Tema visual cambiado a ${theme.replace('theme-', '').toUpperCase()}`, 'success');
    });
  });

  // 7. Audio FX Toggle Button
  const audioToggle = document.getElementById('audio-toggle-btn');
  if (audioToggle) {
    audioToggle.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      audioToggle.innerText = soundEnabled ? '🔊 SONIDO: ACTIVO' : '🔇 SONIDO: MUTED';
      if (soundEnabled) playSyntheticSound(880, 'sine', 0.1);
      showToast(soundEnabled ? 'Efectos de sonido activados' : 'Efectos de sonido desactivados');
    });
  }

  // 8. Animated Metrics Counter
  const counters = document.querySelectorAll('.counter');
  counters.forEach(counter => {
    const target = parseInt(counter.getAttribute('data-target'), 10);
    if (isNaN(target)) return;
    let count = 0;
    const speed = Math.max(1, target / 30);

    function updateCounter() {
      count += speed;
      if (count < target) {
        counter.innerText = Math.ceil(count);
        setTimeout(updateCounter, 30);
      } else {
        counter.innerText = target;
      }
    }
    updateCounter();
  });

  // 9. Interactive 7-Step Blueprint Inspector
  const nodeInfoMap = {
    '1': {
      title: '1. ENTENDER (Aclaración por Sub-pasos)',
      body: 'Entrevista al usuario sin jerga técnica. Ejecuta Sub-paso 1 (Dirección), Sub-paso 2 (Diseño/UX con filtrado dinámico + Opción Personalizada) y Sub-paso 3 (Alcance) antes de tocar una sola línea de código.'
    },
    '2': {
      title: '2. PLANIFICAR & EVALUAR RIESGO',
      body: 'Evalúa la tarea y asigna nivel de riesgo (LOW, MEDIUM, HIGH, CRITICAL). Genera la Matriz de Selección con Recomendación Guiada por Contexto.'
    },
    '3': {
      title: '3. GATE DE APROBACIÓN HUMANA',
      body: 'Detiene automáticamente cualquier acción clasificada como HIGH o CRITICAL hasta recibir autorización explícita de Human Authority (Fail-Closed).'
    },
    '4': {
      title: '4. TEST (TDD PREVIO)',
      body: 'Define las aserciones de prueba unitarias o integración (CHECK) antes de escribir el código.'
    },
    '5': {
      title: '5. CONSTRUIR (PREFLIGHT LÉXICO DA-0015)',
      body: 'Analiza comandos en tiempo real. Detiene sintaxis corruptas, comillas desbalanceadas o comandos destructivos antes de su ejecución.'
    },
    '6': {
      title: '6. AUDITAR (HASHES SHA-256)',
      body: 'Firma las entradas, salidas y archivos modificados con manifiestos criptográficos SHA-256 para auditorías y reversión en 1 clic.'
    },
    '7': {
      title: '7. PROMOVER & RECORDAR (LEARNINGS.MD)',
      body: 'Captura la retroalimentación del humano, le asigna una etiqueta formal (PRODUCT_PREFERENCE, SAFETY_RULE, UX_DESIGN) y actualiza LEARNINGS.md.'
    }
  };

  const interactiveNodes = document.querySelectorAll('.interactive-node');
  const inspectorTitle = document.getElementById('inspector-title');
  const inspectorBody = document.getElementById('inspector-body');

  interactiveNodes.forEach(node => {
    node.addEventListener('click', () => {
      const step = node.getAttribute('data-step');
      interactiveNodes.forEach(n => n.classList.remove('active'));
      node.classList.add('active');
      playSyntheticSound(520, 'sine', 0.05);

      if (nodeInfoMap[step]) {
        inspectorTitle.innerText = nodeInfoMap[step].title;
        inspectorBody.innerText = nodeInfoMap[step].body;
      }
    });
  });

  // 10. Command Palette Modal (Ctrl+K)
  const cmdTrigger = document.getElementById('cmd-palette-trigger');
  const cmdModal = document.getElementById('cmd-modal');
  const cmdInput = document.getElementById('cmd-input');

  function toggleCmdModal(show) {
    if (cmdModal) {
      if (show) {
        cmdModal.classList.add('active');
        if (cmdInput) cmdInput.focus();
        playSyntheticSound(700, 'sine', 0.06);
      } else {
        cmdModal.classList.remove('active');
      }
    }
  }

  if (cmdTrigger) cmdTrigger.addEventListener('click', () => toggleCmdModal(true));
  if (cmdModal) {
    cmdModal.addEventListener('click', (e) => {
      if (e.target === cmdModal) toggleCmdModal(false);
    });
  }

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      toggleCmdModal(true);
    }
    if (e.key === 'Escape') toggleCmdModal(false);
  });

  const cmdItems = document.querySelectorAll('.cmd-item');
  cmdItems.forEach(item => {
    item.addEventListener('click', () => {
      const action = item.getAttribute('data-action');
      toggleCmdModal(false);

      if (action === 'run-preflight') runPreflightDemo();
      if (action === 'run-clarifier') runClarifierDemo();
      if (action.startsWith('theme-')) {
        document.body.classList.remove('theme-cyan', 'theme-indigo', 'theme-lime', 'theme-crimson');
        document.body.classList.add(action);
      }
    });
  });
});

// Interactive Playground Demos
let wizardStep = 1;
let selectedDirection = 'Opción A';
let selectedStyle = 'Apple Glassmorphism Minimalista';

function selectWizardOption(step, optionName) {
  playSyntheticSound(650, 'sine', 0.06);
  if (step === 1) {
    selectedDirection = optionName;
    wizardStep = 2;
    document.getElementById('wizard-step-1-card').style.display = 'none';
    document.getElementById('wizard-step-2-card').style.display = 'block';
    document.getElementById('pill-step-1').classList.remove('active');
    document.getElementById('pill-step-2').classList.add('active');
    showToast(`Dirección seleccionada: ${optionName}`, 'success');
  } else if (step === 2) {
    selectedStyle = optionName;
    wizardStep = 3;
    document.getElementById('wizard-step-2-card').style.display = 'none';
    document.getElementById('wizard-step-3-card').style.display = 'block';
    document.getElementById('pill-step-2').classList.remove('active');
    document.getElementById('pill-step-3').classList.add('active');

    document.getElementById('contract-summary').innerText = `Desarrollar solución enfocada en "${selectedDirection}" con estética "${selectedStyle}".`;
    showToast('¡Contrato de Entendimiento emitido exitosamente!', 'success');
  }
}

function resetWizard() {
  wizardStep = 1;
  document.getElementById('wizard-step-3-card').style.display = 'none';
  document.getElementById('wizard-step-2-card').style.display = 'none';
  document.getElementById('wizard-step-1-card').style.display = 'block';
  document.getElementById('pill-step-3').classList.remove('active');
  document.getElementById('pill-step-2').classList.remove('active');
  document.getElementById('pill-step-1').classList.add('active');
  playSyntheticSound(400, 'sine', 0.06);
}

function runPreflightDemo() {
  const term = document.getElementById('term-output');
  const simulateError = document.getElementById('chk-simulate-error')?.checked;
  playSyntheticSound(750, 'triangle', 0.08);

  if (!term) return;

  if (simulateError) {
    term.innerText += '\n[CONSTRUIR] Evaluando comando: "rm -rf / --no-preserve-root"';
    term.innerText += '\n[PREFLIGHT] 🛑 BLOQUEO DE SEGURIDAD DA-0015 DETECTADO: Intento de eliminación destructiva masiva.';
    term.innerText += '\n[ESTADO] Comandos destructivos bloqueados (STOP). Proceso cancelado sin alterar el equipo.';
    showToast('¡Preflight bloqueó un comando destructivo! (STOP)', 'error');
  } else {
    term.innerText += '\n[CONSTRUIR] Evaluando comando: "git status"';
    term.innerText += '\n[PREFLIGHT] ✓ Balance de comillas: OK';
    term.innerText += '\n[PREFLIGHT] ✓ Sintaxis de variables: OK';
    term.innerText += '\n[PREFLIGHT] ✓ Filtro de seguridad: PASS';
    term.innerText += '\n[AUDITAR] Firmando evidencia criptográfica SHA-256...';
    showToast('Preflight ejecutado con exito: PASS', 'success');
  }
  term.scrollTop = term.scrollHeight;
}

function runClarifierDemo() {
  const term = document.getElementById('term-output');
  playSyntheticSound(550, 'sine', 0.08);
  if (!term) return;

  term.innerText += '\n[ENTENDER] Ejecutando tools/intent_clarifier.js...';
  term.innerText += '\n[SUB-PASO 1] Dirección de Producto: A) Ágil B) Completa C) Landing D) Personalizada';
  term.innerText += '\n[SUB-PASO 2] Clarificación de Diseño & UX (Filtrado dinámico por categoría + Opción Personalizada)';
  term.innerText += '\n[SUB-PASO 3] Cristalización de Alcance -> Contrato emitido con éxito.';
  term.scrollTop = term.scrollHeight;
  showToast('Motor Aclarador ejecutado', 'success');
}

function clearTerm() {
  const term = document.getElementById('term-output');
  if (term) term.innerText = '[AXION CLI] Terminal limpia. Listo para pruebas.';
  playSyntheticSound(300, 'sine', 0.05);
}
