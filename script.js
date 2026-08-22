/**
 * Axion Protocol — Interactive Sandbox and UI Controller
 * Zero external dependencies. Fast, tactile, responsive.
 */

document.addEventListener('DOMContentLoaded', () => {

  // ── 1. Toast Notification Helper ───────────────────────────────────
  const toast = document.getElementById('toast');
  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  // ── 2. Terminal Install Copy & Tab Switcher ──────────────────────────
  const installCommandEl = document.getElementById('install-command');
  const btnCopyInstall = document.getElementById('btn-copy-install');
  const termTabs = document.querySelectorAll('.term-tab');

  const installCommands = {
    npx: 'npx axion-protocol init',
    npm: 'npm i -g axion-protocol && axion init',
    pnpm: 'pnpm dlx axion-protocol init'
  };

  termTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      termTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const pm = tab.getAttribute('data-pm');
      if (installCommandEl && installCommands[pm]) {
        installCommandEl.textContent = installCommands[pm];
      }
    });
  });

  if (btnCopyInstall && installCommandEl) {
    btnCopyInstall.addEventListener('click', () => {
      const textToCopy = installCommandEl.textContent.trim();
      navigator.clipboard.writeText(textToCopy).then(() => {
        showToast('✓ Comando copiado al portapapeles');
      }).catch(() => {
        showToast('No se pudo copiar automáticamente.');
      });
    });
  }

  // ── 3. Sandbox Tab Navigation ──────────────────────────────────────
  const sandboxTabs = document.querySelectorAll('.sandbox-tab');
  const sandboxPanels = {
    intent: document.getElementById('panel-intent'),
    preflight: document.getElementById('panel-preflight'),
    rollback: document.getElementById('panel-rollback')
  };

  sandboxTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      sandboxTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const mode = tab.getAttribute('data-mode');
      Object.entries(sandboxPanels).forEach(([key, panel]) => {
        if (panel) {
          panel.classList.toggle('active', key === mode);
        }
      });
    });
  });

  // ── 4. Panel 1: Socratic Intent Dynamic Updates ────────────────────
  const q1Buttons = document.querySelectorAll('#q1-options .btn-option');
  const q2Buttons = document.querySelectorAll('#q2-options .btn-option');
  const contractOutput = document.getElementById('intent-contract-output');

  let selectedQ1 = 'A';
  let selectedQ2 = 'A';

  const contractTemplates = {
    'A-A': {
      goal: 'Portal web de reservas médicas con gestión de citas para pacientes.',
      included: 'Selector de horarios, formulario de paciente y confirmación inmediata.',
      excluded: 'Pasarela de pagos complejos y facturación automática (Fase posterior).'
    },
    'A-B': {
      goal: 'Plataforma médica SaaS oscura y moderna con reserva de citas online.',
      included: 'Dashboard oscuro para pacientes, confirmación vía email y recordatorios.',
      excluded: 'Integración con historiales clínicos externos.'
    },
    'B-A': {
      goal: 'Panel interno de recepción para gestión de citas hospitalarias.',
      included: 'Vista de calendario para recepcionista y asignación de doctores.',
      excluded: 'Acceso directo a pacientes externos.'
    },
    'B-B': {
      goal: 'Sistema administrativo hospitalario en modo oscuro para clínicas privadas.',
      included: 'Gestión de turnos médicos y exportación de reportes diarios.',
      excluded: 'Notificaciones por SMS.'
    }
  };

  function updateContract() {
    const key = `${selectedQ1}-${selectedQ2}`;
    const data = contractTemplates[key] || contractTemplates['A-A'];

    if (contractOutput) {
      contractOutput.innerHTML = `
        <div class="contract-header">
          <span>📜 IntentContract Cristalizado</span>
          <span class="contract-tag">SELLADO CON SHA-256</span>
        </div>
        <ul class="contract-list">
          <li><strong>Objetivo:</strong> ${data.goal}</li>
          <li><strong>Incluido:</strong> ${data.included}</li>
          <li><strong>Excluido:</strong> ${data.excluded}</li>
        </ul>
      `;
    }
  }

  q1Buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      q1Buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedQ1 = btn.getAttribute('data-val');
      updateContract();
    });
  });

  q2Buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      q2Buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedQ2 = btn.getAttribute('data-val');
      updateContract();
    });
  });

  // ── 5. Panel 2: Preflight Sandbox Simulation ───────────────────────
  const cmdButtons = document.querySelectorAll('.btn-cmd-sample');
  const verdictBadge = document.getElementById('preflight-verdict-badge');
  const consoleOutput = document.getElementById('preflight-console-output');

  const preflightData = {
    safe: {
      verdict: 'PASS (ALLOW)',
      badgeClass: 'pass',
      json: {
        executable: 'git',
        args: ['status', '--porcelain'],
        cwd: '.',
        shell: false,
        risk_level: 'LOW',
        verdict: 'PASS',
        reason: 'Comando de solo lectura; sin efectos secundarios destructivos.'
      }
    },
    risky: {
      verdict: 'NEEDS_HUMAN_REVIEW',
      badgeClass: 'warn',
      json: {
        executable: 'npm',
        args: ['install', 'crypto-js', '--save'],
        cwd: '.',
        shell: false,
        risk_level: 'MEDIUM',
        verdict: 'NEEDS_HUMAN_REVIEW',
        reason: 'Modifica dependencias externas del proyecto (package.json). Requiere confirmación humana.'
      }
    },
    danger: {
      verdict: 'BLOCKED (DENY)',
      badgeClass: 'blocked',
      json: {
        command: 'rm -rf / --no-preserve-root',
        shell: false,
        risk_level: 'CRITICAL',
        verdict: 'BLOCKED',
        reason: 'SEGURIDAD: Intento de borrado masivo del sistema de archivos. Bloqueado en seco (Fail-Closed).'
      }
    }
  };

  cmdButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      cmdButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cmdType = btn.getAttribute('data-cmd');
      const data = preflightData[cmdType];

      if (data && verdictBadge && consoleOutput) {
        verdictBadge.textContent = data.verdict;
        verdictBadge.className = `badge-verdict ${data.badgeClass}`;
        consoleOutput.textContent = JSON.stringify(data.json, null, 2);
      }
    });
  });

  // ── 6. Panel 3: Semantic Rollback Simulation ───────────────────────
  const btnTriggerRollback = document.getElementById('btn-trigger-rollback');
  const codeDiffDisplay = document.getElementById('code-diff-display');
  const fileStatusIndicator = document.getElementById('file-status-indicator');
  const rollbackResultBox = document.getElementById('rollback-result-box');

  if (btnTriggerRollback && codeDiffDisplay && fileStatusIndicator && rollbackResultBox) {
    btnTriggerRollback.addEventListener('click', () => {
      // Simular restauración
      codeDiffDisplay.innerHTML = `
<span class="diff-clean">// Archivo restaurado al snapshot SHA-256 verificado</span>
<span class="diff-add">function calcularTotal(items) {</span>
<span class="diff-add">  return items.reduce((acc, item) =&gt; acc + item.precio, 0);</span>
<span class="diff-add">}</span>
      `;
      fileStatusIndicator.textContent = '✓ Íntegro y Funcional';
      fileStatusIndicator.className = 'status-indicator restored';
      rollbackResultBox.classList.add('show');
      showToast('✓ Rollback completado sin usar comandos de consola.');
    });
  }

});
