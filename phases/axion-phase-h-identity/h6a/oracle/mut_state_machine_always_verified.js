'use strict';
/**
 * MUTADOR DE ORÁCULO — la máquina de estados acepta cualquier transición y
 * declara VERIFIED de inmediato.
 *
 * Rompe el orden de las siete fases y el fallo cerrado de `block`. Una suite que
 * afirme verificar el workflow DEBE fallar bajo esta mutación.
 */
const path = require('path');

const corpus = path.resolve(process.env.AXION_CORPUS || process.cwd());
const mod = require(path.join(corpus, 'tools', 'workflow_state_machine.js'));

mod.createWorkflowStateMachine = function mutated(missionId) {
  const history = [];
  return Object.freeze({
    advance(phase, outcome, evidenceDigest = null) {
      history.push(Object.freeze({ phase, outcome, evidenceDigest }));
      return 'VERIFIED';
    },
    block() { return 'VERIFIED'; },
    snapshot() {
      return Object.freeze({
        missionId,
        state: 'VERIFIED',
        terminal: true,
        nextPhase: null,
        history: Object.freeze(history.map((e) => Object.freeze({ ...e }))),
      });
    },
  });
};

// Centinela obligatorio: el corredor exige esta marca para aceptar que la
// mutacion se aplico. Sin ella el veredicto es ORACLE_GAP, nunca ORACLE_SOUND.
process.stderr.write('AXION_MUTATION_APPLIED:mut_state_machine_always_verified\n');
