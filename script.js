/**
 * Axion Protocol — Interactive Controller & Theme Engine
 * Clean, lightweight, handles Light/Dark mode, smart sidebar, and circuit phases.
 */

document.addEventListener('DOMContentLoaded', () => {

  // ── 1. Light / Dark Mode Toggle ────────────────────────────────────
  const themeToggleBtn = document.getElementById('theme-toggle');
  const rootHtml = document.documentElement;

  // Cargar preferencia guardada o respetar la del sistema
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
      showToast(`✓ Modo ${newTheme === 'dark' ? 'Oscuro' : 'Claro'} activado`);
    });
  }

  // ── 2. Toast Notification ──────────────────────────────────────────
  const toast = document.getElementById('toast');
  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2500);
  }

  // ── 3. Warp Terminal Install Switcher & Copy ────────────────────────
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
        showToast('✓ Comando copiado al portapapeles');
      }).catch(() => {
        showToast('No se pudo copiar automáticamente.');
      });
    });
  }

  // ── 4. Circuit 7-Phase Interactive Controller ──────────────────────
  const circuitNodes = document.querySelectorAll('.circuit-node');
  const circuitPhaseTitle = document.getElementById('circuit-phase-title');
  const circuitPhaseText = document.getElementById('circuit-phase-text');

  circuitNodes.forEach(node => {
    node.addEventListener('mouseenter', () => {
      circuitNodes.forEach(n => n.classList.remove('active'));
      node.classList.add('active');

      const phaseNum = node.getAttribute('data-phase');
      const nodeName = node.querySelector('.node-name')?.textContent || '';
      const desc = node.getAttribute('data-desc') || '';

      if (circuitPhaseTitle) {
        circuitPhaseTitle.textContent = `Fase ${phaseNum}: ${nodeName}`;
      }
      if (circuitPhaseText) {
        circuitPhaseText.textContent = desc;
      }
    });
  });

  // ── 5. Smart Sidebar Auto-Collapse on Scroll ────────────────────────
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
