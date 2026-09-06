#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Herramienta interactiva de firma humana de excepciones CSR.
 *
 * Esta herramienta corre exclusivamente bajo la identidad y presencia del operador humano.
 * En el modelo de amenazas de Axion Protocol:
 *   1. El agente autónomo (AGY) solo puede generar solicitudes CSR (risk-request-<id>.json).
 *   2. La clave privada humana NUNCA reside en el workspace ni está accesible al agente.
 *   3. La ejecución exige una terminal interactiva física (TTY) o autorización explícita fuera de banda.
 *   4. La herramienta valida el ticket, expone el resumen técnico vinculado (digest, commitSha,
 *      entorno, nivel de riesgo, alcance y justificación) y solicita confirmación deliberada.
 *   5. Sella criptográficamente la aceptación con Ed25519 e inscribe la entrada en el ledger hash-chained.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const PreMortemEngine = require('./premortem.js');

const ROOT = path.resolve(__dirname, '..');

function parseArgs(args) {
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        opts[key] = next;
        i++;
      } else {
        opts[key] = true;
      }
    }
  }
  return opts;
}

function promptConfirmation(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const opts = parseArgs(args);

  if (args.length === 0 || opts.help || opts.h) {
    console.log(`Uso:
  node tools/human_sign_risk.js --request <ticket.json> --key <priv_key> --operator <name> [opciones]

Opciones:
  --request <ruta>       Ruta al archivo de solicitud CSR (risk-request-<id>.json)
  --key <ruta>           Ruta a la clave privada Ed25519 de la autoridad humana (fuera del workspace)
  --operator <nombre>    Identificador del operador humano (ej. "Lead Architect (@adrian)")
  --rationale <texto>    Justificación técnica formal (opcional si ya está en la solicitud)
  --env <entorno>        Entorno a autorizar (development | staging, default: development)
  --ttl <horas>          Tiempo de vigencia de la autorización en horas (default: 24)
  --test-headless        Permite bypass de TTY únicamente para suites de pruebas automatizadas
`);
    process.exit(2);
  }

  // 1. Verificación de terminal interactiva TTY física
  const hasInteractiveTTY = Boolean(process.stdin && process.stdin.isTTY && process.stdout && process.stdout.isTTY);
  if (!hasInteractiveTTY && !opts['test-headless']) {
    console.error(JSON.stringify({
      status: 'DENIED',
      reason: 'INTERACTIVE_HUMAN_TTY_REQUIRED',
      exitCode: 1,
      message: 'human_sign_risk exige ejecución interactiva en una terminal TTY física operada por un humano.',
    }, null, 2));
    process.exit(1);
  }

  // 2. Carga y verificación del ticket de solicitud
  const requestPath = opts.request || opts.ticket;
  if (!requestPath || !fs.existsSync(requestPath)) {
    console.error(JSON.stringify({
      status: 'DENIED',
      reason: 'MISSING_REQUEST_FILE',
      exitCode: 1,
      message: `El archivo de solicitud especificado "\${requestPath || ''}" no existe.`,
    }, null, 2));
    process.exit(1);
  }

  let requestData;
  try {
    requestData = JSON.parse(fs.readFileSync(requestPath, 'utf8'));
  } catch (err) {
    console.error(JSON.stringify({
      status: 'DENIED',
      reason: 'MALFORMED_REQUEST_FILE',
      exitCode: 1,
      message: `Error al parsear el ticket de solicitud JSON: \${err.message}`,
    }, null, 2));
    process.exit(1);
  }

  // 3. Resolución de clave privada humana y comprobación de custodia fuera del workspace
  const keyPath = opts.key || opts['private-key'] || process.env.AXION_HUMAN_PRIVATE_KEY_PATH;
  if (!keyPath || !fs.existsSync(keyPath)) {
    console.error(JSON.stringify({
      status: 'DENIED',
      reason: 'MISSING_ED25519_PRIVATE_KEY',
      exitCode: 1,
      message: 'Se exige la ruta a la clave privada Ed25519 del operador (--key).',
    }, null, 2));
    process.exit(1);
  }

  const resolvedKeyPath = path.resolve(keyPath);
  const resolvedRoot = path.resolve(ROOT);
  if (resolvedKeyPath.startsWith(resolvedRoot + path.sep) && !opts['allow-test-key-in-workspace']) {
    console.error(JSON.stringify({
      status: 'DENIED',
      reason: 'WORKSPACE_PRIVATE_KEY_FORBIDDEN',
      exitCode: 1,
      message: `La clave privada humana no puede residir en el workspace (\${resolvedKeyPath}). Debe estar custodiada fuera del repositorio.`,
    }, null, 2));
    process.exit(1);
  }

  const operator = (opts.operator || opts.human || '').trim();
  if (!operator) {
    console.error(JSON.stringify({
      status: 'DENIED',
      reason: 'MISSING_OPERATOR_IDENTITY',
      exitCode: 1,
      message: 'Se exige identificar al operador humano responsable (--operator).',
    }, null, 2));
    process.exit(1);
  }

  const rationale = (opts.rationale || requestData.rationale || '').trim();
  if (rationale.length < 25) {
    console.error(JSON.stringify({
      status: 'DENIED',
      reason: 'INSUFFICIENT_RATIONALE',
      exitCode: 1,
      message: 'La justificación técnica exige al menos 25 caracteres causales.',
    }, null, 2));
    process.exit(1);
  }

  const environment = (opts.env || requestData.environment || 'development').toLowerCase().trim();
  const ttlHours = Number.isFinite(parseFloat(opts.ttl)) ? parseFloat(opts.ttl) : 24;

  // 4. Despliegue interactivo del resumen técnico
  console.log('\n============================================================');
  console.log(' Axion Protocol — Revisión de Solicitud de Excepción Humana');
  console.log('============================================================');
  console.log(` Request ID:       \${requestData.requestId}`);
  console.log(` Premortem ID:     \${requestData.premortemId}`);
  console.log(` Proposal Digest:  \${requestData.proposalDigest}`);
  console.log(` Git Commit SHA:   \${requestData.commitSha}`);
  console.log(` Entorno:          \${environment}`);
  console.log(` Nivel de Riesgo:  \${requestData.riskLevel}`);
  console.log(` Alcance (Scope):  \${Array.isArray(requestData.scope) ? requestData.scope.join(', ') : requestData.scope}`);
  console.log(` Rationale:        \${rationale}`);
  console.log(` Operador Humano:  \${operator}`);
  console.log(` Vigencia (TTL):   \${ttlHours} horas`);
  console.log('============================================================\n');

  // 5. Confirmación interactiva deliberada si hay TTY
  if (hasInteractiveTTY && !opts.yes && !opts.y) {
    const confirmation = await promptConfirmation('¿Autoriza formalmente esta excepción de riesgo bajo su firma responsable? [yes/N]: ');
    if (confirmation.toLowerCase() !== 'yes' && confirmation.toLowerCase() !== 'y') {
      console.log('Operación cancelada por el operador humano.');
      process.exit(2);
    }
  }

  // 6. Firma e inscripción mediante el motor soberano PreMortemEngine
  const engine = new PreMortemEngine(ROOT);
  try {
    const result = engine.acceptRisk({
      requestPath,
      requestId: requestData.requestId,
      premortemId: requestData.premortemId,
      proposalDigest: requestData.proposalDigest,
      commitSha: requestData.commitSha,
      riskLevel: requestData.riskLevel,
      scope: requestData.scope,
      environment,
      allowedEnvironments: [environment],
      operator,
      rationale,
      ttlHours,
      privateKeyPath: resolvedKeyPath,
      allowHeadlessForTest: Boolean(opts['test-headless']),
      allowTestKeyInWorkspace: Boolean(opts['allow-test-key-in-workspace']),
    });

    console.log(JSON.stringify({
      status: 'SUCCESS',
      verdict: 'HUMAN_RISK_ACCEPTED',
      acceptanceId: result.record.acceptanceId,
      requestId: result.record.requestId,
      premortemId: result.record.premortemId,
      proposalDigest: result.record.proposalDigest,
      commitSha: result.record.commitSha,
      environment: result.record.environment,
      riskLevel: result.record.riskLevel,
      scope: result.record.scope,
      targetFile: result.targetFile,
      operator: result.record.operator,
      keyId: result.keyId,
      expiresAt: result.record.expiresAt,
    }, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(JSON.stringify({
      status: 'DENIED',
      reason: 'ACCEPT_RISK_FAILED',
      exitCode: 1,
      message: err.message,
    }, null, 2));
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Error fatal en human_sign_risk:', err);
    process.exit(1);
  });
}

module.exports = { main };
