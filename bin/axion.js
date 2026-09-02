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
  snapshot: { script: 'tools/checkpoint.js', ayuda: 'guarda o restaura puntos de control SHA-256' },
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
  shield: { script: 'tools/agent_shield.js', ayuda: 'audita la seguridad de configuraciones agénticas, MCPs, hooks y secretos' },
  instinct: { script: 'tools/instinct_synthesizer.js', ayuda: 'sintetiza y consulta instintos y reglas aprendidas del proyecto' },
  harness: { script: 'tools/multi_harness_adapter.js', ayuda: 'sincroniza gobernanza universal para Cursor, Codex, OpenCode, Gemini y Claude' },
  doctor: { script: 'tools/doctor_repair_engine.js', ayuda: 'diagnóstico integral de 16 ejes y salud del sistema' },
  repair: { script: 'tools/doctor_repair_engine.js', ayuda: 'auto-reparación determinista de 1 clic para anomalías detectadas', fijo: ['--fix'] },
  budget: { script: 'tools/context_budget_guard.js', ayuda: 'monitorea el presupuesto de tokens de contexto y previene la degradación' },
  capabilities: { script: 'tools/capability_manager.js', ayuda: 'lista capacidades modulares disponibles y activas', fijo: ['list'] },
  add: { script: 'tools/capability_manager.js', ayuda: 'activa una capacidad modular en el proyecto', fijo: ['add'] },
  remove: { script: 'tools/capability_manager.js', ayuda: 'desactiva una capacidad modular del proyecto', fijo: ['remove'] },
  consult: { script: 'tools/capability_manager.js', ayuda: 'consulta capacidades recomendadas para una tarea', fijo: ['consult'] },
  dashboard: { script: 'tools/governance_dashboard.js', ayuda: 'genera un reporte visual estático HTML/SVG y Markdown de gobernanza' },
  tree: { script: 'tools/socratic_tree_visualizer.js', ayuda: 'visualiza el árbol de decisiones socráticas y mitigaciones en Mermaid' },
  weave: { script: 'tools/dynamic_rule_weaver.js', ayuda: 'detecta el stack tecnológico y teje dinámicamente las reglas P0 pertinentes' },
  search: { script: 'tools/semantic_snapshot_indexer.js', ayuda: 'búsqueda semántica sobre checkpoints y memoria histórica sin APIs externas' },
  bundle: { script: 'tools/bundle_compiler.js', ayuda: 'compila el runtime completo en un solo archivo distribuible zero-dependency' },
  chaos: { script: 'tools/agent_chaos_monkey.js', ayuda: 'ejecuta ráfagas de caos adversarial y prueba la resiliencia en bucle cerrado' },
  hook: { script: 'tools/git_governance_hook.js', ayuda: 'gestiona el hook de pre-commit criptográfico de Git fail-closed' },
  bench: { script: 'tools/fast_parity_benchmarker.js', ayuda: 'auditoría de latencia en milisegundos, throughput y consumo de memoria' },
  compliance: { script: 'tools/compliance_matrix_exporter.js', ayuda: 'exporta la matriz de conformidad contra SLSA L3, in-toto y NIST SSDF' },
  heartbeat: { script: 'tools/agent_heartbeat_daemon.js', ayuda: 'emite un latido de vigilancia y verifica la integridad de reglas P0 y hooks' },
  schema: { script: 'tools/schema_contract_verifier.js', ayuda: 'validador formal de esquemas JSON nativo zero-dependency' },
  swarm: { script: 'tools/swarm_arbiter.js', ayuda: 'árbitro de sincronización, bloqueos atómicos y consenso para enjambres de agentes' },
  compact: { script: 'tools/auto_compacting_checkpoint.js', ayuda: 'auto-compactación y poda en caliente de checkpoints y estados' },
  'guard-disk': { script: 'tools/disk_pressure_guard.js', ayuda: 'sensor proactivo de latencia de I/O y auto-mitigación de inflación' },
  'vg-guard': { script: 'tools/vibeguard_storage_hook.js', ayuda: 'ejecuta escaneo de VibeGuard con protección de disco y purgado inline' },
  'test-diff': { script: 'tools/smart_incremental_runner.js', ayuda: 'ejecuta únicamente las suites afectadas por cambios en < 500ms' },
  sbom: { script: 'tools/provenance_sbom_generator.js', ayuda: 'genera SBOM estándar CycloneDX v1.5 y procedencia in-toto SLSA v1.0' },
  record: { script: 'tools/flight_recorder.js', ayuda: 'caja negra agéntica forense y reproductor determinista de sesiones' },
  merkle: { script: 'tools/merkle_integrity_ledger.js', ayuda: 'árbol Merkle criptográfico con pruebas de inclusión y no-repudio' },
  demo: { script: 'tools/quickstart_interactive.js', ayuda: 'onboarding interactivo de 15 segundos y demo en vivo de protección fail-closed' },
  benchmark: { script: 'tools/competitive_benchmark.js', ayuda: 'ejecuta la suite de benchmarking y métricas competitivas reproducibles' },
  critic: { script: 'tools/asymptotic_critic.js', ayuda: 'evaluación asintótica dinámica y auditoría de madurez soberana' },
  onboard: { script: 'tools/onboarding_wizard.js', ayuda: 'onboarding universal de 1 clic y semáforo visual de control de vuelo' },
  'audit-ui': { script: 'tools/attestation_visualizer.js', ayuda: 'genera el panel web visual interactivo de atestaciones y firmas Ed25519' },
  swarm: { script: 'tools/swarm_ast_arbiter.js', ayuda: 'bloqueo atómico AST multi-agente y arbitraje de colisiones concurrentes' },
  'swarm-p2p': { script: 'tools/swarm_p2p_channel.js', ayuda: 'bus de mensajes autenticado P2P con firmas Ed25519 entre agentes concurrentes' },
  'swarm-consensus': { script: 'tools/swarm_consensus_arbiter.js', ayuda: 'protocolo de consenso y votación por quórum bizantino BFT multi-agente' },
  'swarm-bench': { script: 'tools/swarm_benchmark.js', ayuda: 'ejecuta el benchmark de estrés masivo de Swarm v2.0 (AST, P2P y BFT)' },
  'swarm-sim': { script: 'tools/swarm_simulator.js', ayuda: 'simulación visual en vivo de enjambre multi-agente colaborativo' },
  telemetry: { script: 'tools/telemetry_gateway.js', ayuda: 'gateway WebSocket en tiempo real para transmisión de eventos de gobernanza' },
  sbom: { script: 'tools/sbom_sovereign_generator.js', ayuda: 'genera el manifiesto SBOM determinista en formato CycloneDX y SPDX' },
  sync: { script: 'tools/sync_mirror_gate.js', ayuda: 'auditoría y sincronización espejo determinista de espacios de trabajo' },
  humanize: { script: 'tools/humanizer_engine.js', ayuda: 'auditoría y purificación de tono humano anti-AI slop para textos y READMEs' },
  drive: { script: 'tools/drive_engine.js', ayuda: 'meta-orquestador autónomo con deliberación profunda adaptativa' },
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
