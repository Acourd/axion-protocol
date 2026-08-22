'use strict';

const PHASES = Object.freeze([
  'ENTENDER',
  'PLANIFICAR',
  'GATE',
  'TEST',
  'CONSTRUIR',
  'AUDITAR',
  'PROMOVER',
]);

function createWorkflowStateMachine(missionId) {
  if (typeof missionId !== 'string' || missionId.trim() === '') {
    throw new TypeError('missionId es obligatorio para la máquina de estados.');
  }
  let phaseIndex = 0;
  let state = 'PLANNED';
  let terminal = false;
  const history = [];

  function ensureOpen() {
    if (terminal) throw new Error(`La máquina está en estado terminal ${state}.`);
  }

  return Object.freeze({
    advance(phase, outcome, evidenceDigest = null) {
      ensureOpen();
      const expected = PHASES[phaseIndex];
      if (phase !== expected) {
        throw new Error(`Transición fuera de secuencia: se esperaba ${expected} y llegó ${phase}.`);
      }
      if (outcome !== 'PASS') {
        throw new Error(`advance solo acepta PASS; use block para ${outcome}.`);
      }
      history.push(Object.freeze({ phase, outcome, evidenceDigest }));
      phaseIndex += 1;
      if (phaseIndex === PHASES.length) {
        state = 'VERIFIED';
        terminal = true;
      } else {
        state = `RUNNING_${PHASES[phaseIndex]}`;
      }
      return state;
    },
    block(code) {
      ensureOpen();
      if (typeof code !== 'string' || !/^(BLOCKED|FAILED|DENIED|NEEDS_)/.test(code)) {
        throw new TypeError('El bloqueo debe usar un estado fail-closed explícito.');
      }
      state = code;
      terminal = true;
      return state;
    },
    snapshot() {
      return Object.freeze({
        missionId,
        state,
        terminal,
        nextPhase: terminal ? null : PHASES[phaseIndex],
        history: Object.freeze(history.map((entry) => Object.freeze({ ...entry }))),
      });
    },
  });
}

module.exports = { PHASES, createWorkflowStateMachine };
