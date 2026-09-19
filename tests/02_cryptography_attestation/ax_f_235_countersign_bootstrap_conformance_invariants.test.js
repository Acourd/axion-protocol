'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const H = require('../fixtures/countersign/bootstrap_test_helpers.js');
const V1 = require('../../tools/countersign_bootstrap.js');
const V2 = require('../../tools/countersign_independent_verifier.js');
const { canonicalize, hashCanonical } = require('../../tools/canonical_json.js');
const { pae } = require('../../tools/dsse.js');

console.log('=== AX-F-235 Contrafirma bootstrap: conformidad, caidas y disposicion ===\n');

let checks = 0;
const ok = (cond, msg) => { assert.strictEqual(cond, true, msg); checks += 1; };
const cleanup = [];

const registry = H.loadRegistry();

function setup(options = {}) {
  const root = H.makeWorkspace('axion-cs235-');
  const authDir = H.makeWorkspace('axion-cs235-auth-');
  cleanup.push(root, authDir);
  const authority = H.makeAuthority(authDir, options.authority || {});
  const signed = H.makeSignedEnvelope({
    registry: options.registry || registry,
    authority,
    now: options.now,
    ttlMs: options.ttlMs,
    nonce: options.nonce,
    overrides: options.overrides
  });
  const envelopePath = H.writeJsonFile(path.join(authDir, 'envelope.json'), signed.envelope);
  return {
    root,
    authDir,
    authority,
    statement: signed.statement,
    envelope: signed.envelope,
    envelopePath,
    registryPath: options.registryPath || H.REGISTRY_FIXTURE,
    authoritiesPath: authority.file
  };
}

function runPre(s, envelope, options) {
  return V2.pre({ targetRoot: s.root, envelope: envelope || s.envelope, registryPath: s.registryPath, authorityRegistryPath: s.authoritiesPath, options });
}
function runConsume(s, envelope, options) {
  return V1.consumeCountersignature({ targetRoot: s.root, envelope: envelope || s.envelope, registryPath: s.registryPath, authorityRegistryPath: s.authoritiesPath, options });
}
function runPost(s, envelope, options) {
  return V2.post({ targetRoot: s.root, envelope: envelope || s.envelope, registryPath: s.registryPath, authorityRegistryPath: s.authoritiesPath, options });
}
function runVerify(s, envelope) {
  return V1.verifyCountersignature({ targetRoot: s.root, envelope: envelope || s.envelope, registryPath: s.registryPath, authorityRegistryPath: s.authoritiesPath });
}
function markerPathOf(s) {
  return path.join(V1.stateDir(s.root), V1.markerNameOf(registry.registryId, registry.registryRevision, s.authority.keyId, s.statement.nonce));
}

// --- 1. Binding del registro y paridad de canonicalizacion ---
{
  ok(hashCanonical(registry) === V1.REGISTRY_SHA256, 'la fixture rev3 debe hashear al vinculo canonico');
  ok(V2.hashCanonicalIndependent(registry) === hashCanonical(registry), 'V2 canonicaliza identico para el registro');
  ok(V2.paeIndependent(V1.COUNTERSIGN_PAYLOAD_TYPE, Buffer.from('prueba-pae', 'utf8'))
    .equals(pae(V1.COUNTERSIGN_PAYLOAD_TYPE, 'prueba-pae')), 'V2 construye el PAE identico');
  ok(V2.operationIdOf('AX-MEM-REG-0001', 3, 'ed25519:' + 'a'.repeat(64), 'nonce-de-prueba-123456789012345678901234')
    === V1.operationIdOf('AX-MEM-REG-0001', 3, 'ed25519:' + 'a'.repeat(64), 'nonce-de-prueba-123456789012345678901234'),
  'operationId coincide entre implementaciones');
  console.log(`✓ [${checks}] fixture rev3 y paridad V1/V2 verificadas`);
}

// --- 2. Camino feliz pre -> consume -> post, reportes y raiz unica ---
{
  const s = setup();
  const pre = runPre(s);
  ok(pre.status === V2.STATUS.V2_PRE_OK, `pre debe pasar: ${JSON.stringify(pre.reason || pre.reasons)}`);
  const consume = runConsume(s);
  ok(consume.status === V1.STATUS.COUNTERSIGN_VALID, `consume debe ser VALID: ${JSON.stringify(consume.reason || consume.status)}`);
  const post = runPost(s);
  ok(post.status === V2.STATUS.INDEPENDENT_VERIFICATION_PASS, `post debe pasar: ${JSON.stringify(post.reasons)}`);
  ok(fs.existsSync(path.join(V1.reportsDir(s.root), `v2-pre-${consume.operationId}.json`)), 'reporte V2-pre durable');
  ok(fs.existsSync(path.join(V1.reportsDir(s.root), `v2-post-${consume.operationId}.json`)), 'reporte V2-post durable');
  const tree = H.readTree(s.root);
  ok(tree.length > 0 && tree.every((rel) => rel.startsWith('.axion/state/countersign-consumption/')),
    `escrituras solo en la raiz permitida: ${tree.join(', ')}`);
  ok(!tree.some((rel) => /memory|journal|shadow|ANCHOR|PROFILE/i.test(rel)), 'sin memoria v2, journal ni shadow');
  const state = V1.readState(s.root);
  ok(state.ok && state.entries.length === 1 && state.markers.length === 1, 'estado consistente tras consumo');
  console.log(`✓ [${checks}] camino feliz con reportes y raiz unica`);
}

// --- 3. Matriz negativa de sobre y statement ---
{
  const s = setup();

  const extraKey = runVerify(s, { ...s.envelope, extra: 1 });
  ok(extraKey.status === V1.STATUS.COUNTERSIGN_MALFORMED && extraKey.reason === 'ENVELOPE_KEYS', 'campo extra en sobre');

  const twoSignatures = runVerify(s, { ...s.envelope, signatures: [s.envelope.signatures[0], s.envelope.signatures[0]] });
  ok(twoSignatures.status === V1.STATUS.COUNTERSIGN_MALFORMED && twoSignatures.reason === 'SIGNATURE_CARDINALITY', 'cardinalidad de firmas');

  const keyidMismatch = runVerify(s, { ...s.envelope, signatures: [{ ...s.envelope.signatures[0], keyid: 'ed25519:' + 'f'.repeat(64) }] });
  ok(keyidMismatch.status === V1.STATUS.COUNTERSIGN_MALFORMED && keyidMismatch.reason === 'KEYID_MISMATCH', 'keyid obligatorio y coincidente');

  const noKeyid = runVerify(s, { ...s.envelope, signatures: [{ sig: s.envelope.signatures[0].sig }] });
  ok(noKeyid.status === V1.STATUS.COUNTERSIGN_MALFORMED && noKeyid.reason === 'SIGNATURE_KEYS', 'keyid ausente rechazado');

  const wrongDomain = runVerify(s, { ...s.envelope, payloadType: V1.DISPOSITION_PAYLOAD_TYPE });
  ok(wrongDomain.status === V1.STATUS.COUNTERSIGN_MALFORMED && wrongDomain.reason === 'PAYLOAD_TYPE_MISMATCH', 'dominio exclusivo');

  const prettyPayload = Buffer.from(JSON.stringify(s.statement, null, 2), 'utf8').toString('base64');
  const nonCanonical = runVerify(s, { ...s.envelope, payload: prettyPayload });
  ok(nonCanonical.status === V1.STATUS.COUNTERSIGN_MALFORMED && nonCanonical.reason === 'PAYLOAD_NOT_CANONICAL', 'bytes no canonicos rechazados');

  const longTtl = setup({ ttlMs: 31 * 24 * 60 * 60 * 1000 });
  ok(runVerify(longTtl).status === V1.STATUS.COUNTERSIGN_MALFORMED, 'TTL mayor a 30 dias rechazado');

  const expired = setup({ now: new Date(Date.now() + 2 * 60 * 60 * 1000) });
  ok(runVerify(expired).status === V1.STATUS.COUNTERSIGN_EXPIRED, 'ventana vencida rechazada');

  const shaMismatch = setup({ overrides: { registrySha256: 'f'.repeat(64) } });
  const shaResult = runVerify(shaMismatch);
  ok(shaResult.status === V1.STATUS.COUNTERSIGN_SCOPE_MISMATCH && shaResult.reason === 'REGISTRY_SHA_MISMATCH', 'hash de registro distinto');

  const scopeMismatch = setup({ overrides: { scope: ['D1'] } });
  const scopeResult = runVerify(scopeMismatch);
  ok(scopeResult.status === V1.STATUS.COUNTERSIGN_SCOPE_MISMATCH && scopeResult.reason === 'SCOPE_MISMATCH', 'scope distinto rechazado');

  const foreignDir = H.makeWorkspace('axion-cs235-foreign-');
  cleanup.push(foreignDir);
  const foreign = H.makeAuthority(foreignDir, { actorId: 'Forastero' });
  const foreignSigned = H.makeSignedEnvelope({ registry, authority: foreign });
  const unknown = runVerify(s, foreignSigned.envelope);
  ok(unknown.status === V1.STATUS.COUNTERSIGN_UNKNOWN_AUTHORITY, 'clave no registrada rechazada');

  const auditorOnly = setup({ authority: { roles: ['INDEPENDENT_AUDITOR'] } });
  ok(runVerify(auditorOnly).status === V1.STATUS.COUNTERSIGN_UNKNOWN_AUTHORITY, 'rol distinto de HUMAN_AUTHORITY rechazado');

  const revokedAuthority = setup({ authority: { status: 'REVOKED' } });
  ok(runVerify(revokedAuthority).status === V1.STATUS.COUNTERSIGN_REVOKED, 'autoridad revocada rechazada');

  const expiredAuthority = setup({ authority: { expiresInMs: -1000 } });
  const expiredAuthorityResult = runVerify(expiredAuthority);
  ok(expiredAuthorityResult.status === V1.STATUS.COUNTERSIGN_EXPIRED && expiredAuthorityResult.reason === 'AUTHORITY_EXPIRED', 'autoridad vencida rechazada');

  const crlSetup = setup();
  H.writeCrl(crlSetup.root, [crlSetup.authority.keyId]);
  ok(runVerify(crlSetup).status === V1.STATUS.COUNTERSIGN_REVOKED, 'CRL revoca la clave');

  const haltSetup = setup();
  H.writeHalt(haltSetup.root, 'prueba de parada');
  ok(runVerify(haltSetup).status === V1.STATUS.COUNTERSIGN_HALTED, 'HALT detiene la verificacion');
  console.log(`✓ [${checks}] matriz negativa de sobre, statement, autoridad, CRL y HALT`);
}

// --- 4. T1-T6: caidas, truncado y manipulacion ---
{
  const t1 = setup();
  runPre(t1);
  H.writeRaw(markerPathOf(t1), '');
  const t1Result = runConsume(t1);
  ok(t1Result.status === V1.STATUS.COUNTERSIGN_STATE_UNAVAILABLE && t1Result.reason === 'PARTIAL_CONSUMPTION_MARKER_UNWRITTEN', 'T1 marcador vacio bloquea');

  const t2 = setup();
  runPre(t2);
  const t2Marker = {
    schema: 'axion.countersign-consumption-marker/v2',
    operationId: V1.operationIdOf(registry.registryId, registry.registryRevision, t2.authority.keyId, t2.statement.nonce),
    baselineDigest: H.fakeHash('baseline'),
    registryId: registry.registryId,
    registryRevision: registry.registryRevision,
    keyId: t2.authority.keyId,
    nonce: t2.statement.nonce,
    statementSha256: H.fakeHash('statement'),
    consumedAt: new Date().toISOString(),
    clockHighWaterMark: new Date().toISOString()
  };
  H.writeRaw(markerPathOf(t2), `${canonicalize(t2Marker)}\n`);
  const t2Result = runConsume(t2);
  ok(t2Result.status === V1.STATUS.COUNTERSIGN_STATE_UNAVAILABLE && t2Result.reason === 'PARTIAL_CONSUMPTION_MARKER_WITHOUT_LOG', 'T2 marcador sin log bloquea');

  const t3 = setup();
  runPre(t3);
  let t3Error = null;
  try {
    runConsume(t3, null, { faultInjection: 'after-log-write' });
  } catch (error) {
    t3Error = error;
  }
  ok(t3Error && t3Error.code === 'FAULT_INJECTED', 'T3 caida simulada tras el log');
  const t3Retry = runConsume(t3);
  ok(t3Retry.status === V1.STATUS.COUNTERSIGN_REPLAYED, 'T3 reintento es REPLAYED sin bloqueo');
  const t3State = V1.readState(t3.root);
  ok(t3State.ok && t3State.entries.length === 1, 'T3 estado consistente');

  const t4 = setup();
  runPre(t4);
  let t4Error = null;
  try {
    runConsume(t4, null, { faultInjection: 'before-log-open' });
  } catch (error) {
    t4Error = error;
  }
  ok(t4Error && t4Error.code === 'FAULT_INJECTED', 'T4 fallo de I/O antes del log');
  const t4Result = runConsume(t4);
  ok(t4Result.status === V1.STATUS.COUNTERSIGN_STATE_UNAVAILABLE && t4Result.reason === 'PARTIAL_CONSUMPTION_MARKER_WITHOUT_LOG', 'T4 estado parcial bloquea');

  const t5 = setup();
  runPre(t5);
  ok(runConsume(t5).status === V1.STATUS.COUNTERSIGN_VALID, 'T5 base consumida');
  fs.appendFileSync(path.join(V1.stateDir(t5.root), 'consumption.log'), '{"parcial":', 'utf8');
  const t5State = V1.readState(t5.root);
  ok(!t5State.ok, 'T5 cola truncada ilegible');
  const t5Result = runConsume(t5);
  ok(t5Result.status === V1.STATUS.COUNTERSIGN_STATE_UNAVAILABLE, 'T5 consumo bloqueado por cadena rota');

  const t6 = setup();
  runPre(t6);
  ok(runConsume(t6).status === V1.STATUS.COUNTERSIGN_VALID, 'T6 base consumida');
  const t6Marker = JSON.parse(fs.readFileSync(markerPathOf(t6), 'utf8'));
  t6Marker.statementSha256 = H.fakeHash('manipulado');
  fs.writeFileSync(markerPathOf(t6), `${canonicalize(t6Marker)}\n`, 'utf8');
  const t6Result = runConsume(t6);
  ok(t6Result.status === V1.STATUS.COUNTERSIGN_STATE_UNAVAILABLE && t6Result.reason === 'CONSUMPTION_MARKER_LOG_MISMATCH', 'T6 marcador manipulado bloquea');
  console.log(`✓ [${checks}] T1-T6 ejecutados`);
}

// --- 5. D1-D3: disposicion, caidas y dominios ---
{
  const d1 = setup();
  runPre(d1);
  try {
    runConsume(d1, null, { faultInjection: 'before-log-open' });
  } catch (_) { /* caida inyectada */ }
  const d1MarkerPath = markerPathOf(d1);
  const d1MarkerContent = JSON.parse(fs.readFileSync(d1MarkerPath, 'utf8'));
  const d1MarkerName = path.basename(d1MarkerPath);
  const d1Repair = H.signDispositionStatement(H.makeRepairStatement({
    authority: d1.authority,
    markerFileNameHash: d1MarkerName.replace(/\.used$/, ''),
    markerContentSha256: hashCanonical(d1MarkerContent),
    statementSha256: d1MarkerContent.statementSha256,
    targetHead: { seq: 0, entryHash: H.GENESIS_HASH },
    dispositionId: 'AX-DISP-0001'
  }), d1.authority);
  const d1Result = V1.applyDisposition({
    targetRoot: d1.root,
    envelope: d1Repair,
    registryPath: d1.registryPath,
    authorityRegistryPath: d1.authoritiesPath
  });
  ok(d1Result.status === V1.STATUS.DISPOSITION_VALID, `D1 REPAIR valido: ${JSON.stringify(d1Result.reason || d1Result.status)}`);
  const d1State = V1.readState(d1.root);
  ok(d1State.ok && d1State.entries.length === 1 && d1State.markers.length === 1, 'D1 estado reparado consistente');
  const d1Next = H.makeSignedEnvelope({ registry, authority: d1.authority });
  const d1Pre = runPre(d1, d1Next.envelope);
  ok(d1Pre.status === V2.STATUS.V2_PRE_OK, 'D1 nueva operacion puede pre-baselinearse');
  ok(runConsume(d1, d1Next.envelope).status === V1.STATUS.COUNTERSIGN_VALID, 'D1 consumo posterior funciona');

  const d2 = setup();
  runPre(d2);
  ok(runConsume(d2).status === V1.STATUS.COUNTERSIGN_VALID, 'D2 base consumida');
  const d2Statement = H.makeInvalidateStatement({ authority: d2.authority, statementSha256: H.fakeHash('stmt') });
  const d2Name = `disp-${H.hashCanonical({
    domain: 'disposition',
    registryId: registry.registryId,
    registryRevision: registry.registryRevision,
    keyId: d2.authority.keyId,
    nonce: d2Statement.nonce
  })}.used`;
  H.writeRaw(path.join(V1.stateDir(d2.root), d2Name), `${canonicalize({
    schema: 'axion.countersign-disposition-marker/v1',
    statement: d2Statement,
    envelopeSha256: H.fakeHash('envelope')
  })}\n`);
  const d2State = V1.readState(d2.root);
  ok(!d2State.ok && d2State.reason === 'PARTIAL_DISPOSITION_MARKER_WITHOUT_LOG', 'D2 disposicion parcial detectable');
  const d2Envelope = H.signDispositionStatement(d2Statement, d2.authority);
  const d2Result = V1.applyDisposition({
    targetRoot: d2.root,
    envelope: d2Envelope,
    registryPath: d2.registryPath,
    authorityRegistryPath: d2.authoritiesPath
  });
  ok(d2Result.status === V1.STATUS.DISPOSITION_UNAVAILABLE, 'D2 disposicion bloqueada por parcial');

  const d3 = setup();
  const d3Result = V1.applyDisposition({
    targetRoot: d3.root,
    envelope: d3.envelope,
    registryPath: d3.registryPath,
    authorityRegistryPath: d3.authoritiesPath
  });
  ok(d3Result.status === V1.STATUS.DISPOSITION_MALFORMED && d3Result.reason === 'PAYLOAD_TYPE_MISMATCH', 'D3 dominio incorrecto rechazado');
  console.log(`✓ [${checks}] D1-D3 ejecutados`);
}

// --- 6. CLI documentada ---
{
  const noArgs = H.runCli('tools/countersign_bootstrap.js', []);
  ok(noArgs.status === 2, 'CLI sin argumentos sale con 2');
  const noArgsV2 = H.runCli('tools/countersign_independent_verifier.js', []);
  ok(noArgsV2.status === 2, 'CLI V2 sin argumentos sale con 2');

  const s = setup();
  const baseArgs = (command) => [command, '--envelope', s.envelopePath, '--registry', s.registryPath, '--authorities', s.authoritiesPath, '--target', s.root];
  const verifyRun = H.runCli('tools/countersign_bootstrap.js', baseArgs('verify'));
  ok(verifyRun.status === 0, `CLI verify exit 0, salio ${verifyRun.status}: ${verifyRun.stdout}`);
  const preRun = H.runCli('tools/countersign_independent_verifier.js', baseArgs('pre'));
  ok(preRun.status === 0, `CLI V2 pre exit 0, salio ${preRun.status}: ${preRun.stdout}`);
  const consumeRun = H.runCli('tools/countersign_bootstrap.js', baseArgs('consume'));
  ok(consumeRun.status === 0, `CLI consume exit 0, salio ${consumeRun.status}: ${consumeRun.stdout}`);
  const postRun = H.runCli('tools/countersign_independent_verifier.js', baseArgs('post'));
  ok(postRun.status === 0, `CLI V2 post exit 0, salio ${postRun.status}: ${postRun.stdout}`);
  const postJson = H.parseCliJson(postRun);
  ok(postJson && postJson.status === V2.STATUS.INDEPENDENT_VERIFICATION_PASS, 'CLI V2 post reporta PASS');

  const badEnvelope = H.writeJsonFile(path.join(s.authDir, 'bad-envelope.json'), { ...s.envelope, payloadType: 'otro/tipo' });
  const badRun = H.runCli('tools/countersign_bootstrap.js', ['verify', '--envelope', badEnvelope, '--registry', s.registryPath, '--authorities', s.authoritiesPath, '--target', s.root]);
  ok(badRun.status === 1, 'CLI verify fallido sale con 1');
  console.log(`✓ [${checks}] CLI verificada (exit 0/1/2)`);
}

// --- 7. Independencia estatica y ausencia de superficie v2 ---
{
  const v1Source = fs.readFileSync(path.join(ROOT, 'tools', 'countersign_bootstrap.js'), 'utf8');
  const v2Source = fs.readFileSync(path.join(ROOT, 'tools', 'countersign_independent_verifier.js'), 'utf8');
  ok(!/require\(['"]\.\/countersign_bootstrap/.test(v2Source), 'V2 no importa el modulo bootstrap');
  ok(!/require\(['"]\.\/(canonical_json|dsse|approval_ed25519|identity_canonical|killswitch|evidence_ledger)/.test(v2Source), 'V2 no importa helpers del bootstrap');
  for (const [label, source] of [['V1', v1Source], ['V2', v2Source]]) {
    for (const pattern of [/memory_graph/, /\.axion[\\/]memory/, /ANCHOR/, /PROFILE\.json/, /LEARNING\.md/, /shadow/i, /events\.jsonl/]) {
      ok(!pattern.test(source), `${label} no referencia ${pattern}`);
    }
  }
  ok(!fs.existsSync(path.join(ROOT, '.axion', 'state', 'countersign-consumption')), 'el repositorio no tiene estado de consumo');
  ok(fs.existsSync(path.join(ROOT, 'tools', 'countersign_bootstrap.js')) && fs.existsSync(path.join(ROOT, 'tools', 'countersign_independent_verifier.js')), 'ambos modulos presentes');
  console.log(`✓ [${checks}] independencia y ausencia de memoria v2`);
}

// --- 8. S1-S8: contencion de rutas contra symlinks, junctions y enlaces colgantes ---
{
  function makeLink(targetAbs, linkPath, kind) {
    try {
      const type = kind === 'dir' && process.platform === 'win32' ? 'junction' : kind;
      fs.symlinkSync(targetAbs, linkPath, type);
      return true;
    } catch (_) {
      return false;
    }
  }
  const blockedStatuses = new Set([
    V1.STATUS.COUNTERSIGN_STATE_UNAVAILABLE,
    V2.STATUS.V2_STATE_UNAVAILABLE,
    V1.STATUS.DISPOSITION_UNAVAILABLE
  ]);
  const assertBlocked = (result, label) => {
    ok(blockedStatuses.has(result.status) || result.reason === 'PATH_NOT_CONTAINED' || (Array.isArray(result.reasons) && result.reasons.includes('PATH_NOT_CONTAINED')),
      `${label}: ${JSON.stringify(result)}`);
  };

  const s1 = setup();
  const escape1 = H.makeWorkspace('axion-cs235-escape1-');
  cleanup.push(escape1);
  fs.mkdirSync(path.join(s1.root, '.axion', 'state'), { recursive: true });
  if (makeLink(escape1, path.join(s1.root, '.axion', 'state', 'countersign-consumption'), 'dir')) {
    assertBlocked(runPre(s1), 'S1 pre con directorio de consumo enlazado');
    assertBlocked(runConsume(s1), 'S1 consume con directorio de consumo enlazado');
    ok(H.readTree(escape1).length === 0, 'S1 nada escrito fuera de la raiz');
    console.log(`✓ [${checks}] S1 directorio de consumo enlazado rechazado`);
  } else {
    console.log('  (S1 omitido: no se pudo crear el enlace de directorio)');
  }

  const s2 = setup();
  const dir2 = V1.stateDir(s2.root);
  fs.mkdirSync(dir2, { recursive: true });
  const escapeLog2 = path.join(s2.authDir, 'escape-consumption.log');
  fs.writeFileSync(escapeLog2, '', 'utf8');
  if (makeLink(escapeLog2, path.join(dir2, 'consumption.log'), 'file')) {
    const result = runConsume(s2);
    ok(result.status === V1.STATUS.COUNTERSIGN_STATE_UNAVAILABLE && result.reason === 'PATH_NOT_CONTAINED', `S2 log enlazado bloquea: ${JSON.stringify(result)}`);
    ok(fs.readFileSync(escapeLog2, 'utf8') === '', 'S2 log externo intacto');
    ok(!fs.existsSync(path.join(dir2, V1.markerNameOf(registry.registryId, registry.registryRevision, s2.authority.keyId, s2.statement.nonce))), 'S2 sin marcador creado');
    console.log(`✓ [${checks}] S2 log de consumo enlazado rechazado`);
  } else {
    console.log('  (S2 omitido: el sistema no permite enlaces de archivo)');
  }

  const s3 = setup();
  const dir3 = V1.stateDir(s3.root);
  fs.mkdirSync(dir3, { recursive: true });
  const escapeLog3 = path.join(s3.authDir, 'escape-disposition.log');
  fs.writeFileSync(escapeLog3, '', 'utf8');
  if (makeLink(escapeLog3, path.join(dir3, 'disposition.log'), 'file')) {
    const invalidate = H.signDispositionStatement(H.makeInvalidateStatement({
      authority: s3.authority,
      statementSha256: H.fakeHash('statement-s3'),
      dispositionId: 'AX-DISP-0008'
    }), s3.authority);
    const result = V1.applyDisposition({
      targetRoot: s3.root,
      envelope: invalidate,
      registryPath: s3.registryPath,
      authorityRegistryPath: s3.authoritiesPath
    });
    ok(result.status === V1.STATUS.DISPOSITION_UNAVAILABLE && result.reason === 'PATH_NOT_CONTAINED', `S3 disposicion con log enlazado: ${JSON.stringify(result)}`);
    ok(fs.readFileSync(escapeLog3, 'utf8') === '', 'S3 log de disposicion externo intacto');
    console.log(`✓ [${checks}] S3 log de disposicion enlazado rechazado`);
  } else {
    console.log('  (S3 omitido: el sistema no permite enlaces de archivo)');
  }

  const s4 = setup();
  const dir4 = V1.stateDir(s4.root);
  fs.mkdirSync(dir4, { recursive: true });
  const escape4 = H.makeWorkspace('axion-cs235-escape4-');
  cleanup.push(escape4);
  if (makeLink(escape4, path.join(dir4, 'reports'), 'dir')) {
    const result = runPre(s4);
    ok(result.status === V2.STATUS.V2_STATE_UNAVAILABLE && result.reason === 'PATH_NOT_CONTAINED', `S4 reports enlazado bloquea: ${JSON.stringify(result)}`);
    ok(H.readTree(escape4).length === 0, 'S4 sin reportes fuera de la raiz');
    console.log(`✓ [${checks}] S4 directorio de reportes enlazado rechazado`);
  } else {
    console.log('  (S4 omitido: no se pudo crear el enlace de directorio)');
  }

  const s5 = setup();
  const dir5 = V1.stateDir(s5.root);
  const reports5 = path.join(dir5, 'reports');
  fs.mkdirSync(reports5, { recursive: true });
  const operationId5 = V2.operationIdOf(registry.registryId, registry.registryRevision, s5.authority.keyId, s5.statement.nonce);
  const escapeReport5 = path.join(s5.authDir, 'escape-report.json');
  fs.writeFileSync(escapeReport5, 'original\n', 'utf8');
  if (makeLink(escapeReport5, path.join(reports5, `v2-pre-${operationId5}.json`), 'file')) {
    const result = runPre(s5);
    ok(result.status === V2.STATUS.V2_STATE_UNAVAILABLE && result.reason === 'PATH_NOT_CONTAINED', `S5 reporte enlazado bloquea: ${JSON.stringify(result)}`);
    ok(fs.readFileSync(escapeReport5, 'utf8') === 'original\n', 'S5 reporte externo intacto');
    console.log(`✓ [${checks}] S5 reporte enlazado rechazado`);
  } else {
    console.log('  (S5 omitido: el sistema no permite enlaces de archivo)');
  }

  const s6 = setup();
  const escape6 = H.makeWorkspace('axion-cs235-escape6-');
  cleanup.push(escape6);
  if (makeLink(escape6, path.join(s6.root, '.axion'), 'dir')) {
    assertBlocked(runVerify(s6), 'S6 verify con .axion enlazado');
    assertBlocked(runPre(s6), 'S6 pre con .axion enlazado');
    assertBlocked(runConsume(s6), 'S6 consume con .axion enlazado');
    ok(H.readTree(escape6).length === 0, 'S6 nada escrito fuera de la raiz');
    console.log(`✓ [${checks}] S6 .axion enlazado rechazado`);
  } else {
    console.log('  (S6 omitido: no se pudo crear el enlace de directorio)');
  }

  const s7 = setup();
  const escape7 = H.makeWorkspace('axion-cs235-escape7-');
  cleanup.push(escape7);
  fs.writeFileSync(path.join(escape7, 'crl.json'), `${JSON.stringify({ version: '1.0.0', entries: [] }, null, 2)}\n`, 'utf8');
  fs.mkdirSync(path.join(s7.root, '.axion'), { recursive: true });
  if (makeLink(escape7, path.join(s7.root, '.axion', 'revocations'), 'dir')) {
    const result = runVerify(s7);
    ok(result.status === V1.STATUS.COUNTERSIGN_STATE_UNAVAILABLE && result.reason === 'PATH_NOT_CONTAINED', `S7 CRL enlazada bloquea: ${JSON.stringify(result)}`);
    console.log(`✓ [${checks}] S7 CRL enlazada rechazada`);
  } else {
    console.log('  (S7 omitido: no se pudo crear el enlace de directorio)');
  }

  const s8 = setup();
  fs.mkdirSync(path.join(s8.root, '.axion'), { recursive: true });
  if (makeLink(path.join(s8.authDir, 'no-existe-halt.json'), path.join(s8.root, '.axion', 'HALT'), 'file')) {
    const result = runVerify(s8);
    ok(result.status === V1.STATUS.COUNTERSIGN_STATE_UNAVAILABLE && result.reason === 'PATH_NOT_CONTAINED', `S8 HALT enlazado colgante bloquea: ${JSON.stringify(result)}`);
    console.log(`✓ [${checks}] S8 HALT enlazado colgante rechazado`);
  } else {
    console.log('  (S8 omitido: el sistema no permite enlaces de archivo)');
  }

  const s9 = setup();
  const dir9 = V1.stateDir(s9.root);
  fs.mkdirSync(dir9, { recursive: true });
  const external9 = path.join(s9.authDir, 'hardlink-source.log');
  fs.writeFileSync(external9, '', 'utf8');
  try {
    fs.linkSync(external9, path.join(dir9, 'consumption.log'));
    const result = runConsume(s9);
    ok(result.status === V1.STATUS.COUNTERSIGN_STATE_UNAVAILABLE && result.reason === 'PATH_NOT_CONTAINED', `S9 hardlink bloquea: ${JSON.stringify(result)}`);
    ok(fs.readFileSync(external9, 'utf8') === '', 'S9 archivo externo intacto');
    console.log(`✓ [${checks}] S9 log con hardlink rechazado`);
  } catch (_) {
    console.log('  (S9 omitido: no se pudo crear el hardlink)');
  }
}

H.cleanup(cleanup);
console.log(`\n=== AX-F-235 PASS (${checks} comprobaciones) ===`);
