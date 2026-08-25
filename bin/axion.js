#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol - punto de entrada unico de la CLI.
 *
 * Reune bajo un solo comando las herramientas que ya existian sueltas en tools/. No
 * anade capacidades: despacha. Cada subcomando delega en el modulo correspondiente,
 * asi que lo que hace `axion preflight` es exactamente lo que hace `node
 * tools/preflight.js`, sin una segunda implementacion que pueda divergir de la primera.
 *
 * Los codigos de salida se propagan tal cual, porque son parte del contrato: 0 sigue
 * significando "adelante" y cualquier otra cosa significa que no.
 */

const path = require('path');
const { spawnSync } = require('child_process');

const RAIZ = path.resolve(__dirname, '..');
const version = require(path.join(RAIZ, 'package.json')).version;

// Cada subcomando es un modulo de tools/ invocado como proceso hijo. Se hace asi, y no
// con require, para heredar sin traducciones sus codigos de salida y su salida estandar.
const SUBCOMANDOS = {
  init: { script: 'install.js', ayuda: 'inyecta las reglas de gobernanza en un proyecto (--user para ~/.claude)' },
  wizard: { script: 'tools/wizard.js', ayuda: 'asistente interactivo de configuración y perfil' },
  check: { script: 'tools/health_check.js', ayuda: 'auditoría de salud y sincronización del proyecto' },
  update: { script: 'tools/updater.js', ayuda: 'actualiza reglas y herramientas preservando configuración' },
  vibeguard: { script: 'tools/vibeguard_gate.js', ayuda: 'escanea y bloquea anti-patrones de código incompleto' },
  preflight: { script: 'tools/preflight.js', ayuda: 'clasifica un comando antes de ejecutarlo' },
  profile: { script: 'tools/profile_adapter.js', ayuda: 'consulta o calibra el perfil de usuario' },
  halt: { script: 'tools/killswitch.js', ayuda: 'detiene el sistema', fijo: ['halt'] },
  resume: { script: 'tools/killswitch.js', ayuda: 'retira la parada', fijo: ['resume'] },
  // Alias de resume: el workflow se llama /unhalt y el CLI debe responder al mismo nombre.
  unhalt: { script: 'tools/killswitch.js', ayuda: 'alias de resume', fijo: ['resume'] },
  checkpoint: { script: 'tools/checkpoint.js', ayuda: 'sella, lista o verifica puntos de control' },
  rollback: { script: 'tools/checkpoint.js', ayuda: 'restaura el ultimo punto de control verificado', fijo: ['restore'] },
  status: { script: 'tools/killswitch.js', ayuda: 'consulta si hay una parada activa', fijo: ['status'] },
  attest: { script: 'tools/attestation.js', ayuda: 'verifica una atestacion in-toto' },
  clarify: { script: 'tools/intent_clarifier.js', ayuda: 'aclara una peticion vaga' },
  premortem: { script: 'tools/premortem.js', ayuda: 'autopsia adversarial de fracaso a 6 meses (4 anclas y 3 niveles)' },
  deep: { script: 'tools/deep_reasoning.js', ayuda: 'deliberación profunda y cálculo de blast radius' },
  compact: { script: 'tools/context_shield.js', ayuda: 'compacta el contexto y ancla el estado' },
  memory: { script: 'tools/memory.js', ayuda: 'memoria persistente del proyecto entre sesiones' },
  verify: { script: 'tools/verify_changes.js', ayuda: 'ejecuta verificación determinista con código 0' },
  evidence: { script: 'tools/evidence_hasher.js', ayuda: 'genera un manifiesto SHA-256' },
  test: { script: 'tests/run_all.js', ayuda: 'ejecuta la suite completa' },
};

const USO = [
  `axion-protocol ${version}`,
  '',
  'Runtime experimental de gobernanza para operaciones de IA agentiva.',
  'EXPERIMENTAL y sin certificar: hoy no debe usarse como control de seguridad efectivo.',
  '',
  'Uso:  axion <comando> [argumentos]',
  '',
  'Comandos:',
  ...Object.entries(SUBCOMANDOS).map(([nombre, { ayuda }]) => `  ${nombre.padEnd(10)} ${ayuda}`),
  '',
  'Ejemplos:',
  '  axion init --target ./mi-proyecto',
  '  axion init --user                    comandos alcanzables desde cualquier directorio',
  '  axion preflight "git commit -m mensaje"',
  '  axion preflight --json \'{"executable":"git","args":["status"],"cwd":".","shell":false}\'',
  '  axion halt "el agente esta tocando produccion"',
  '  axion checkpoint create pre-refactor-auth',
  '  axion rollback latest',
  '  axion memory add limite "no reescribir los manifiestos historicos"',
  '  axion test',
  '',
  'Una cadena de shell cruda nunca obtiene ALLOW: lo mejor a lo que puede aspirar es',
  'NEEDS_HUMAN_REVIEW. Para llegar a ALLOW hace falta un comando estructurado.',
  '',
  'Codigos de salida: los propaga el subcomando. 2 indica uso incorrecto.',
].join('\n');

function main() {
  const [comando, ...resto] = process.argv.slice(2);

  if (!comando || comando === '--help' || comando === '-h' || comando === 'help') {
    console.log(USO);
    process.exit(comando ? 0 : 2);
  }

  if (comando === '--version' || comando === '-v' || comando === 'version') {
    console.log(version);
    process.exit(0);
  }

  const entrada = SUBCOMANDOS[comando];
  if (!entrada) {
    console.log(`Comando desconocido: ${comando}\n`);
    console.log(USO);
    process.exit(2);
  }

  const argumentos = [path.join(RAIZ, entrada.script), ...(entrada.fijo || []), ...resto];
  const r = spawnSync(process.execPath, argumentos, { stdio: 'inherit' });

  if (r.error) {
    console.error(`No se pudo ejecutar ${entrada.script}: ${r.error.message}`);
    process.exit(2);
  }
  // Una senal (por ejemplo un Ctrl+C) no es un exito: se traduce a fallo.
  process.exit(r.status === null ? 1 : r.status);
}

if (require.main === module) main();

module.exports = { SUBCOMANDOS, USO };
