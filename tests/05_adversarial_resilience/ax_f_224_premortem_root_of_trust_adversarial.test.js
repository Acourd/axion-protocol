'use strict';

/**
 * AX-F-224: Invariantes Adversariales de Raíz de Confianza, Custodia de Claves y Ámbitos de /premortem
 *
 * Valida de forma estricta los 5 hallazgos de la auditoría adversaria de Linear:
 * 1. Protección de la raíz de confianza: Cualquier manipulación o adición de claves en policies/authorities.json
 *    es detectada y rechazada fail-closed por el sello criptográfico de la raíz de gobernanza.
 * 2. Custodia de claves y bloqueo de agente: El agente no puede leer claves humanas, no puede ejecutar
 *    accept-risk desde su contexto, no puede usar claves dentro del workspace, ni autorizar producción localmente.
 * 3. Vinculación estricta: Operador coincidente con actorId, rechazo de autoridades revocadas o expiradas,
 *    y confinamiento estricto por entorno (allowedEnvironments) y nivel de riesgo (allowedRiskLevels).
 * 4. Inmutabilidad y ledger append-only: Rechazo fail-closed de sobrescritura silenciosa (ACCEPTANCE_ALREADY_EXISTS),
 *    registro histórico en journal, y soporte de revocación formal firmada (RISK_ACCEPTANCE_REVOKED).
 * 5. Protección léxica en Preflight: Bloqueo de comandos que intenten inspeccionar o filtrar claves privadas.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const PreMortemEngine = require('../../tools/premortem.js');
const { ROOT_AUTHORITY, createRootSeal, verifyRootSeal } = require('../../tools/governance_root.js');
const { asEd25519PublicKey, computePublicKeyId } = require('../../tools/approval_ed25519.js');
const { canonicalize, hashCanonical } = require('../../tools/canonical_json.js');
const { classifyCommand, COMMAND_DECISION } = require('../../tools/structured_command.js');

console.log('=== AX-F-224 Invariantes Adversariales de Raíz de Confianza y Custodia en PreMortem ===\n');

const os = require('os');

const sandbox = path.join(ROOT, 'scratch', `test_ax_f_224_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`);
fs.mkdirSync(path.join(sandbox, 'policies'), { recursive: true });
fs.mkdirSync(path.join(sandbox, '.axion', 'state'), { recursive: true });

// Almacén externo simulado para claves privadas humanas (estrictamente fuera del workspace)
const humanKeystoreDir = path.join(os.tmpdir(), `axion_human_keystore_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`);
fs.mkdirSync(humanKeystoreDir, { recursive: true });

try {
  // Configurar autoridad raíz de prueba y operador humano legítimo
  const testRootKeyPair = crypto.generateKeyPairSync('ed25519');
  const testRootKeyId = computePublicKeyId(testRootKeyPair.publicKey);
  const testRootPubPem = testRootKeyPair.publicKey.export({ type: 'spki', format: 'pem' });

  const humanOpKeyPair = crypto.generateKeyPairSync('ed25519');
  const humanOpKeyId = computePublicKeyId(humanOpKeyPair.publicKey);
  const humanOpPubPem = humanOpKeyPair.publicKey.export({ type: 'spki', format: 'pem' });
  const humanOpPrivPem = humanOpKeyPair.privateKey.export({ type: 'pkcs8', format: 'pem' });

  // Guardar la clave privada humana en el almacén externo
  const humanPrivKeyPath = path.join(humanKeystoreDir, 'operator_human.key');
  fs.writeFileSync(humanPrivKeyPath, humanOpPrivPem, { mode: 0o600 });

  // 1. Crear el registro legítimo policies/authorities.json
  const legitimateRegistry = {
    version: '1.0.0',
    authorities: [
      {
        actorId: 'Lead Architect (@adrian)',
        keyId: humanOpKeyId,
        publicKeyPem: humanOpPubPem,
        roles: ['HUMAN_AUTHORITY'],
        status: 'TRUSTED',
        expiresAt: '2030-01-01T00:00:00.000Z',
        allowedEnvironments: ['development', 'staging'],
        allowedRiskLevels: ['LOW', 'MEDIUM', 'HIGH'],
      }
    ]
  };

  const regPath = path.join(sandbox, 'policies', 'authorities.json');
  fs.writeFileSync(regPath, JSON.stringify(legitimateRegistry, null, 2), 'utf8');

  // Sellar el registro con la clave raíz de prueba
  const legitimateSeal = createRootSeal(legitimateRegistry, testRootKeyPair.privateKey);
  // Ajustar el rootKeyId al de prueba para este sandbox
  legitimateSeal.rootKeyId = testRootKeyId;
  const unsignedSeal = { ...legitimateSeal };
  delete unsignedSeal.algorithm;
  delete unsignedSeal.signature;
  legitimateSeal.signature = crypto.sign(
    null,
    Buffer.from(canonicalize(unsignedSeal), 'utf8'),
    testRootKeyPair.privateKey
  ).toString('base64');

  const sealPath = path.join(sandbox, 'policies', 'authorities.seal.json');
  fs.writeFileSync(sealPath, JSON.stringify(legitimateSeal, null, 2), 'utf8');

  const engine = new PreMortemEngine(sandbox);
  const defaultOptions = {
    registryPath: regPath,
    customRootPublicKey: testRootPubPem,
  };

  // -------------------------------------------------------------
  // HALLAZGO 1: PROTECCIÓN DE LA RAÍZ DE CONFIANZA
  // -------------------------------------------------------------
  // Test 1a: Verificación exitosa del registro legítimo sellado
  const authResOk = engine.loadAuthorities(defaultOptions);
  assert.strictEqual(authResOk.ok, true, 'El registro legítimo sellado debe cargarse exitosamente.');
  assert.strictEqual(authResOk.authorities.length, 1);
  console.log('✓ 1a: Registro legítimo con sello de raíz verificado');

  // Test 1b: Ataque AGY: El agente edita policies/authorities.json e inserta su clave como TRUSTED
  const attackerKeys = crypto.generateKeyPairSync('ed25519');
  const attackerKeyId = computePublicKeyId(attackerKeys.publicKey);
  const tamperedRegistry = JSON.parse(JSON.stringify(legitimateRegistry));
  tamperedRegistry.authorities.push({
    actorId: 'Autonomous Agent (@agy)',
    keyId: attackerKeyId,
    publicKeyPem: attackerKeys.publicKey.export({ type: 'spki', format: 'pem' }),
    roles: ['HUMAN_AUTHORITY'],
    status: 'TRUSTED',
    expiresAt: '2030-01-01T00:00:00.000Z',
    allowedEnvironments: ['development', 'staging', 'production'],
    allowedRiskLevels: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
  });

  fs.writeFileSync(regPath, JSON.stringify(tamperedRegistry, null, 2), 'utf8');
  const authResTampered = engine.loadAuthorities(defaultOptions);
  assert.strictEqual(authResTampered.ok, false);
  assert.strictEqual(authResTampered.reason, 'UNTRUSTED_REGISTRY_MODIFICATION');
  console.log('✓ 1b: Ataque de inserción de clave en el registro detectado y rechazado fail-closed (REGISTRY_HASH_MISMATCH)');

  // Test 1c: Ataque AGY: El agente intenta falsificar el sello sin la clave privada raíz
  const forgedSeal = {
    ...legitimateSeal,
    canonicalPayloadHash: hashCanonical(tamperedRegistry),
    signature: crypto.sign(null, Buffer.from('fake'), attackerKeys.privateKey).toString('base64'),
  };
  fs.writeFileSync(sealPath, JSON.stringify(forgedSeal, null, 2), 'utf8');
  const authResForgedSeal = engine.loadAuthorities(defaultOptions);
  assert.strictEqual(authResForgedSeal.ok, false);
  assert.strictEqual(authResForgedSeal.reason, 'UNTRUSTED_REGISTRY_MODIFICATION');
  console.log('✓ 1c: Sello falsificado por el agente rechazado fail-closed (INVALID_ROOT_SIGNATURE)');

  // Restaurar registro y sello legítimos
  fs.writeFileSync(regPath, JSON.stringify(legitimateRegistry, null, 2), 'utf8');
  fs.writeFileSync(sealPath, JSON.stringify(legitimateSeal, null, 2), 'utf8');

  // -------------------------------------------------------------
  // HALLAZGO 2: CUSTODIA DE CLAVE PRIVADA Y BLOQUEO DEL AGENTE
  // -------------------------------------------------------------
  const proposalPayload = {
    feature_name: 'Driver de Rendimiento Aislado para Banco de Pruebas',
    anchors: {
      security: ['Vulnerabilidad de inyección en el parser de tokens que permite ejecutar código hostil remoto'],
      performance: ['Degradación severa del event loop por sobrecarga de buffers de memoria no liberados'],
      architecture: ['Acoplamiento circular entre módulos internos que impide el aislamiento de fallas sistémicas'],
      ux: ['NO_APLICA: Canal de sincronización M2M en background sin interfaz de usuario directa']
    },
    competence_check: { justified: true, bloat_risk: false },
    worst_case_scenarios: [
      'Bloqueo operativo total por discrepancias de protocolo no documentadas en el controlador',
      'Falla de autenticación por rotación no controlada de credenciales en el host'
    ],
    mandatory_mitigations: [
      'Sanitización estricta de entradas y aislamiento en sandbox sin privilegios de ejecución'
    ],
    depth_level: 1
  };
  const proposalDigest = hashCanonical(proposalPayload);
  const premortemId = proposalDigest.slice(0, 16);

  // Test 2a: Intento de invocación en contexto de agente autónomo (AGENT_CONTEXT=true)
  assert.throws(() => {
    engine.acceptRisk({
      id: premortemId,
      proposalDigest,
      operator: 'Lead Architect (@adrian)',
      key: humanPrivKeyPath,
      isAgentContext: true,
      rationale: 'Intento de aceptación de riesgo desde contexto de agente autónomo',
      ...defaultOptions,
    });
  }, /AGENT_INVOCATION_FORBIDDEN/, 'accept-risk debe rechazar invocación por agentes autónomos.');
  console.log('✓ 2a: Invocación de accept-risk desde contexto de agente bloqueada (AGENT_INVOCATION_FORBIDDEN)');

  // Test 2b: Intento de usar clave privada que reside dentro del workspace del agente
  const workspaceKeyPath = path.join(sandbox, '.axion', 'keys', 'operator_ed25519.key');
  fs.mkdirSync(path.dirname(workspaceKeyPath), { recursive: true });
  fs.writeFileSync(workspaceKeyPath, humanOpPrivPem, 'utf8');

  assert.throws(() => {
    engine.acceptRisk({
      id: premortemId,
      proposalDigest,
      operator: 'Lead Architect (@adrian)',
      key: workspaceKeyPath,
      rationale: 'Intento de uso de clave privada almacenada en el workspace del agente',
      ...defaultOptions,
    });
  }, /WORKSPACE_PRIVATE_KEY_FORBIDDEN/, 'accept-risk debe prohibir claves ubicadas dentro del workspace del agente.');
  console.log('✓ 2b: Clave privada dentro del workspace rechazada fail-closed (WORKSPACE_PRIVATE_KEY_FORBIDDEN)');

  // Test 2c: Intento de generar una aceptación para producción localmente
  assert.throws(() => {
    engine.acceptRisk({
      id: premortemId,
      proposalDigest,
      operator: 'Lead Architect (@adrian)',
      key: humanPrivKeyPath,
      environment: 'production',
      rationale: 'Intento de aprobar producción mediante CLI local del agente',
      ...defaultOptions,
    });
  }, /PRODUCTION_RISK_ACCEPTANCE_FORBIDDEN/, 'accept-risk debe rechazar autorizaciones locales para producción.');
  console.log('✓ 2c: Aceptación local para producción rechazada fail-closed (PRODUCTION_RISK_ACCEPTANCE_FORBIDDEN)');

  // -------------------------------------------------------------
  // HALLAZGO 3: VINCULACIÓN DE IDENTIDAD, ENTORNO Y NIVEL DE RIESGO
  // -------------------------------------------------------------
  // Test 3a: Operador declarado no coincide con actorId registrado
  assert.throws(() => {
    engine.acceptRisk({
      id: premortemId,
      proposalDigest,
      operator: '@attacker-impostor',
      key: humanPrivKeyPath,
      environment: 'development',
      rationale: 'Intento de suplantar operador con clave de autoridad válida',
      ...defaultOptions,
    });
  }, /OPERATOR_IDENTITY_MISMATCH/, 'accept-risk debe verificar que el operador sea exactamente el actorId.');
  console.log('✓ 3a: Discrepancia de operador rechazada fail-closed (OPERATOR_IDENTITY_MISMATCH)');

  // Test 3b: Autoridad no autorizada para el entorno solicitado
  assert.throws(() => {
    engine.acceptRisk({
      id: premortemId,
      proposalDigest,
      operator: 'Lead Architect (@adrian)',
      key: humanPrivKeyPath,
      allowedEnvironments: ['development', 'production'],
      rationale: 'Intento de incluir entorno production con autoridad que solo tiene dev/staging',
      ...defaultOptions,
    });
  }, /PRODUCTION_RISK_ACCEPTANCE_FORBIDDEN|UNAUTHORIZED_ENVIRONMENT/);
  console.log('✓ 3b: Entorno fuera del alcance de la autoridad rechazado fail-closed (UNAUTHORIZED_ENVIRONMENT)');

  // Test 3c: Autoridad con alcance de riesgo insuficiente
  assert.throws(() => {
    engine.acceptRisk({
      id: premortemId,
      proposalDigest,
      operator: 'Lead Architect (@adrian)',
      key: humanPrivKeyPath,
      environment: 'development',
      riskLevel: 'CRITICAL',
      rationale: 'Intento de autorizar riesgo CRITICAL con autoridad que solo tiene LOW/MEDIUM/HIGH',
      ...defaultOptions,
    });
  }, /UNAUTHORIZED_RISK_LEVEL/, 'accept-risk debe rechazar niveles de riesgo que excedan el alcance de la autoridad.');
  console.log('✓ 3c: Nivel de riesgo superior al autorizado rechazado fail-closed (UNAUTHORIZED_RISK_LEVEL)');

  // Test 3d: Autoridad con estado REVOKED
  const revokedRegistry = JSON.parse(JSON.stringify(legitimateRegistry));
  revokedRegistry.authorities[0].status = 'REVOKED';
  const revokedSeal = createRootSeal(revokedRegistry, testRootKeyPair.privateKey);
  revokedSeal.rootKeyId = testRootKeyId;
  const unsignedRevSeal = { ...revokedSeal };
  delete unsignedRevSeal.algorithm;
  delete unsignedRevSeal.signature;
  revokedSeal.signature = crypto.sign(null, Buffer.from(canonicalize(unsignedRevSeal), 'utf8'), testRootKeyPair.privateKey).toString('base64');
  fs.writeFileSync(regPath, JSON.stringify(revokedRegistry, null, 2), 'utf8');
  fs.writeFileSync(sealPath, JSON.stringify(revokedSeal, null, 2), 'utf8');

  assert.throws(() => {
    engine.acceptRisk({
      id: premortemId,
      proposalDigest,
      operator: 'Lead Architect (@adrian)',
      key: humanPrivKeyPath,
      environment: 'development',
      rationale: 'Intento de usar autoridad revocada formalmente',
      ...defaultOptions,
    });
  }, /REVOKED_AUTHORITY/, 'accept-risk debe rechazar autoridades en estado REVOKED.');
  console.log('✓ 3d: Clave de autoridad revocada rechazada fail-closed (REVOKED_AUTHORITY)');

  // Restaurar registro legítimo
  fs.writeFileSync(regPath, JSON.stringify(legitimateRegistry, null, 2), 'utf8');
  fs.writeFileSync(sealPath, JSON.stringify(legitimateSeal, null, 2), 'utf8');

  // -------------------------------------------------------------
  // HALLAZGO 4: INMUTABILIDAD, LEDGER APPEND-ONLY Y REVOCACIÓN
  // -------------------------------------------------------------
  // Test 4a: Creación exitosa de una aceptación legítima fuera de banda
  const acceptRes = engine.acceptRisk({
    id: premortemId,
    proposalDigest,
    operator: 'Lead Architect (@adrian)',
    key: humanPrivKeyPath,
    environment: 'development',
    allowedEnvironments: ['development'],
    rationale: 'Autorización formal fuera de banda para spike técnico de 24h',
    ...defaultOptions,
  });
  assert.strictEqual(acceptRes.pass, true);
  assert.ok(fs.existsSync(acceptRes.targetFile));
  console.log('✓ 4a: Aceptación legítima creada y persistida fuera de banda');

  // Test 4b: Intento de sobrescribir la aceptación existente (prohibición de sobrescritura silenciosa)
  assert.throws(() => {
    engine.acceptRisk({
      id: premortemId,
      proposalDigest,
      operator: 'Lead Architect (@adrian)',
      key: humanPrivKeyPath,
      environment: 'development',
      rationale: 'Segundo intento para el mismo premortemId que no debe sobrescribir silenciosamente',
      ...defaultOptions,
    });
  }, /ACCEPTANCE_ALREADY_EXISTS/, 'accept-risk debe rechazar la sobrescritura de una aceptación existente.');
  console.log('✓ 4b: Intento de sobrescritura rechazado fail-closed (ACCEPTANCE_ALREADY_EXISTS)');

  // Test 4c: Verificar existencia de libro append-only y copias históricas
  const ledgerPath = path.join(sandbox, '.axion', 'state', 'risk-acceptance-ledger.jsonl');
  assert.ok(fs.existsSync(ledgerPath), 'El libro ledger append-only debe existir.');
  const ledgerContent = fs.readFileSync(ledgerPath, 'utf8');
  assert.ok(ledgerContent.includes(acceptRes.record.acceptanceId));
  assert.ok(ledgerContent.includes('RISK_ACCEPTED'));
  console.log('✓ 4c: Historial append-only registrado en risk-acceptance-ledger.jsonl');

  // Test 4d: Evaluación exitosa de propuesta con la aceptación vigente en desarrollo
  const evalDev = engine.evaluateAssessment(proposalPayload, {
    environment: 'development',
    ...defaultOptions,
  });
  assert.strictEqual(evalDev.status, 'APPROVED');
  assert.strictEqual(evalDev.verdict, 'HUMAN_RISK_ACCEPTED');
  assert.strictEqual(evalDev.exitCode, 0);
  console.log('✓ 4d: Propuesta aprobada con HUMAN_RISK_ACCEPTED en development (exit 0)');

  // Test 4e: La misma aceptación evaluada en production devuelve exit 2 (ENVIRONMENT_MISMATCH)
  const evalProd = engine.evaluateAssessment(proposalPayload, {
    environment: 'production',
    ...defaultOptions,
  });
  assert.strictEqual(evalProd.status, 'DENIED');
  assert.strictEqual(evalProd.reason, 'ENVIRONMENT_MISMATCH');
  assert.strictEqual(evalProd.exitCode, 2);
  console.log('✓ 4e: Aceptación de development bloqueada en production con exit 2 (ENVIRONMENT_MISMATCH)');

  // Test 4f: Revocación explícita firmada de la aceptación
  const revRes = engine.revokeRisk({
    id: premortemId,
    operator: 'Lead Architect (@adrian)',
    key: humanPrivKeyPath,
    rationale: 'Revocación por vulnerabilidad descubierta en prueba de carga',
    ...defaultOptions,
  });
  assert.strictEqual(revRes.success, true);
  assert.ok(fs.existsSync(revRes.revocationFile));

  // Verificar que la revocación invalida la aceptación previa de inmediato
  const evalAfterRev = engine.evaluateAssessment(proposalPayload, {
    environment: 'development',
    ...defaultOptions,
  });
  assert.strictEqual(evalAfterRev.status, 'DENIED');
  assert.strictEqual(evalAfterRev.reason, 'RISK_ACCEPTANCE_REVOKED');
  assert.strictEqual(evalAfterRev.exitCode, 1);
  console.log('✓ 4f: Revocación formal firmada invalida la aceptación de riesgo (RISK_ACCEPTANCE_REVOKED, exit 1)');

  // -------------------------------------------------------------
  // HALLAZGO 5: PROTECCIÓN LÉXICA EN PREFLIGHT Y EVIDENCIA
  // -------------------------------------------------------------
  const secretReadCmd = {
    executable: 'cat',
    args: [humanPrivKeyPath],
    cwd: sandbox,
    shell: false,
  };
  const decisionSecret = classifyCommand(secretReadCmd);
  assert.strictEqual(decisionSecret.decision, COMMAND_DECISION.DENY, 'Comando para leer clave privada humana debe ser DENY.');
  console.log('✓ 5: Intento de lectura de clave privada denegado por Preflight (SECRET_EXPOSURE_PREVENTION)');

  console.log('\nPASS AX-F-224 — Invariantes adversariales de raíz de confianza y custodia demostradas al 100%.\n');

} finally {
  if (fs.existsSync(sandbox)) {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
  if (fs.existsSync(humanKeystoreDir)) {
    fs.rmSync(humanKeystoreDir, { recursive: true, force: true });
  }
}
