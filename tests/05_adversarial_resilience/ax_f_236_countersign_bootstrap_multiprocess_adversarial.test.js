'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const H = require('../fixtures/countersign/bootstrap_test_helpers.js');
const V1 = require('../../tools/countersign_bootstrap.js');
const V2 = require('../../tools/countersign_independent_verifier.js');

console.log('=== AX-F-236 Contrafirma bootstrap: multiproceso y transiciones ===\n');

let checks = 0;
const ok = (cond, msg) => { assert.strictEqual(cond, true, msg); checks += 1; };
const cleanup = [];
const registry = H.loadRegistry();
const V1_TOOL = 'tools/countersign_bootstrap.js';
const V2_TOOL = 'tools/countersign_independent_verifier.js';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runProcess(rel, args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(ROOT, rel), ...args], { cwd: ROOT, windowsHide: true });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const watchdog = setTimeout(() => {
      if (settled) return;
      try { child.kill('SIGKILL'); } catch (_) { /* ya termino */ }
      settled = true;
      resolve({ code: null, stdout, stderr: `${stderr}\nTIMEOUT` });
    }, 60000);
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(watchdog);
      resolve({ code: null, stdout, stderr: `${stderr}\n${error.message}` });
    });
    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(watchdog);
      resolve({ code, stdout, stderr });
    });
  });
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch (_) {
    return null;
  }
}

function setup() {
  const root = H.makeWorkspace('axion-cs236-');
  const authDir = H.makeWorkspace('axion-cs236-auth-');
  cleanup.push(root, authDir);
  const authority = H.makeAuthority(authDir);
  return { root, authDir, authority, registryPath: H.REGISTRY_FIXTURE, authoritiesPath: authority.file };
}

function addOperation(s) {
  const signed = H.makeSignedEnvelope({ registry, authority: s.authority });
  const envelopePath = H.writeJsonFile(path.join(s.authDir, `envelope-${signed.statement.nonce.slice(0, 10)}.json`), signed.envelope);
  const pre = V2.pre({
    targetRoot: s.root,
    envelope: signed.envelope,
    registryPath: s.registryPath,
    authorityRegistryPath: s.authoritiesPath
  });
  assert.strictEqual(pre.status, V2.STATUS.V2_PRE_OK, `pre de operacion debe pasar: ${pre.reason}`);
  return { signed, envelopePath, operationId: pre.operationId };
}

function consumeArgs(s, envelopePath, extra) {
  return ['consume', '--envelope', envelopePath, '--registry', s.registryPath, '--authorities', s.authoritiesPath, '--target', s.root, ...(extra || [])];
}

function postArgs(s, envelopePath) {
  return ['post', '--envelope', envelopePath, '--registry', s.registryPath, '--authorities', s.authoritiesPath, '--target', s.root];
}

(async () => {
  // --- M1: dos procesos, nonces distintos, serializacion por lock ---
  {
    const s = setup();
    const opA = addOperation(s);
    const opB = addOperation(s);
    const [rA, rB] = await Promise.all([
      runProcess(V1_TOOL, consumeArgs(s, opA.envelopePath)),
      runProcess(V1_TOOL, consumeArgs(s, opB.envelopePath))
    ]);
    const entries = [
      { name: 'A', code: rA.code, json: parseJson(rA.stdout) },
      { name: 'B', code: rB.code, json: parseJson(rB.stdout) }
    ];
    const winners = entries.filter((e) => e.code === 0);
    const losers = entries.filter((e) => e.code !== 0);
    ok(winners.length === 1, `M1 exactamente un consumo gana: ${JSON.stringify(entries)}`);
    ok(losers.length === 1 && losers[0].json && losers[0].json.status === V1.STATUS.COUNTERSIGN_BASELINE_MISMATCH,
      `M1 el perdedor no corrompe ni consume: ${JSON.stringify(losers)}`);
    const state = V1.readState(s.root);
    ok(state.ok && state.entries.length === 1 && state.markers.length === 1, 'M1 estado serializado y consistente');
    console.log(`✓ [${checks}] M1 lock serializa dos consumos concurrentes`);
  }

  // --- M2: ocho procesos, nonces distintos ---
  {
    const s = setup();
    const ops = [addOperation(s), addOperation(s), addOperation(s), addOperation(s), addOperation(s), addOperation(s), addOperation(s), addOperation(s)];
    const runs = await Promise.all(ops.map((op) => runProcess(V1_TOOL, consumeArgs(s, op.envelopePath))));
    const winners = runs.filter((r) => r.code === 0);
    ok(winners.length === 1, `M2 exactamente un ganador entre ocho: ${runs.map((r) => r.code).join(',')}`);
    for (const loser of runs.filter((r) => r.code !== 0)) {
      const json = parseJson(loser.stdout);
      ok(json && json.status === V1.STATUS.COUNTERSIGN_BASELINE_MISMATCH, `M2 perdedor sin corrupcion: ${loser.stdout}`);
    }
    const state = V1.readState(s.root);
    ok(state.ok && state.entries.length === 1, 'M2 cadena intacta tras contienda');
    console.log(`✓ [${checks}] M2 contienda de ocho procesos serializada`);
  }

  // --- M3: mismo nonce, dos procesos ---
  {
    const s = setup();
    const op = addOperation(s);
    const [r1, r2] = await Promise.all([
      runProcess(V1_TOOL, consumeArgs(s, op.envelopePath)),
      runProcess(V1_TOOL, consumeArgs(s, op.envelopePath))
    ]);
    const winner = [r1, r2].find((r) => r.code === 0);
    const loser = [r1, r2].find((r) => r.code !== 0);
    ok(winner && winner.code === 0, 'M3 un proceso consume');
    const loserJson = parseJson(loser.stdout);
    ok(loserJson && loserJson.status === V1.STATUS.COUNTERSIGN_REPLAYED, `M3 el otro es REPLAYED: ${loser.stdout}`);
    const state = V1.readState(s.root);
    ok(state.ok && state.entries.length === 1, 'M3 replay no duplica');
    console.log(`✓ [${checks}] M3 nonce repetido consume exactamente una vez`);
  }

  // --- M4: kill en seccion critica ---
  {
    const s = setup();
    const op = addOperation(s);
    const killed = await runProcess('tests/fixtures/countersign/consume_fault_child.js', [s.root, op.envelopePath, s.registryPath, s.authoritiesPath]);
    ok(killed.code !== 0 || killed.code === null, `M4 el hijo muere en la seccion critica: ${killed.code}`);
    await sleep(400);
    const retry = await runProcess(V1_TOOL, consumeArgs(s, op.envelopePath, ['--lock-stale', '150', '--lock-timeout', '5000']));
    const retryJson = parseJson(retry.stdout);
    ok(retry.code === 1 && retryJson && retryJson.status === V1.STATUS.COUNTERSIGN_STATE_UNAVAILABLE && retryJson.reason === 'PARTIAL_CONSUMPTION_MARKER_WITHOUT_LOG',
      `M4 parcial bloqueado tras kill: ${retry.stdout}`);
    console.log(`✓ [${checks}] M4 kill deja estado parcial detectable`);
  }

  // --- M5: lock huerfano reclamado ---
  {
    const s = setup();
    const op = addOperation(s);
    const lockFile = path.join(V1.stateDir(s.root), 'consumption.lock');
    fs.mkdirSync(path.dirname(lockFile), { recursive: true });
    fs.writeFileSync(lockFile, JSON.stringify({ token: 'orphan-token', pid: 2147483647, createdAt: Date.now() - 60000 }), 'utf8');
    const run = await runProcess(V1_TOOL, consumeArgs(s, op.envelopePath, ['--lock-stale', '100', '--lock-timeout', '5000']));
    const json = parseJson(run.stdout);
    ok(run.code === 0 && json && json.status === V1.STATUS.COUNTERSIGN_VALID, `M5 lock huerfano reclamado: ${run.stdout}`);
    console.log(`✓ [${checks}] M5 lock huerfano reclamado tras lease`);
  }

  // --- M6: lock con dueno vivo no se roba ---
  {
    const s = setup();
    const op = addOperation(s);
    const lockFile = path.join(V1.stateDir(s.root), 'consumption.lock');
    fs.mkdirSync(path.dirname(lockFile), { recursive: true });
    fs.writeFileSync(lockFile, JSON.stringify({ token: 'live-token', pid: process.pid, createdAt: Date.now() - 60000 }), 'utf8');
    const run = await runProcess(V1_TOOL, consumeArgs(s, op.envelopePath, ['--lock-timeout', '300', '--lock-stale', '50']));
    const json = parseJson(run.stdout);
    ok(run.code === 1 && json && json.reason === 'LOCK_BUSY', `M6 lock ajeno no se roba: ${run.stdout}`);
    ok(fs.existsSync(lockFile), 'M6 el lock vivo permanece');
    const state = V1.readState(s.root);
    ok(state.ok && state.entries.length === 0, 'M6 sin consumo parcial');
    console.log(`✓ [${checks}] M6 lock con dueno vivo no se roba`);
  }

  // --- P1: consumo ajeno entre pre y consume ---
  {
    const s = setup();
    const opA = addOperation(s);
    const opB = addOperation(s);
    const runB = await runProcess(V1_TOOL, consumeArgs(s, opB.envelopePath));
    ok(runB.code === 0, 'P1 B consume primero');
    const runA = await runProcess(V1_TOOL, consumeArgs(s, opA.envelopePath));
    const json = parseJson(runA.stdout);
    ok(runA.code === 1 && json && json.status === V1.STATUS.COUNTERSIGN_BASELINE_MISMATCH, `P1 transicion intermedia detectada: ${runA.stdout}`);
    console.log(`✓ [${checks}] P1 baseline pre/post detecta transicion ajena`);
  }

  // --- P2: transicion extra antes de V2-post ---
  {
    const s = setup();
    const opA = addOperation(s);
    const runA = await runProcess(V1_TOOL, consumeArgs(s, opA.envelopePath));
    ok(runA.code === 0, 'P2 A consume');
    const opB = addOperation(s);
    const runB = await runProcess(V1_TOOL, consumeArgs(s, opB.envelopePath));
    ok(runB.code === 0, 'P2 B consume despues');
    const runPost = await runProcess(V2_TOOL, postArgs(s, opA.envelopePath));
    const json = parseJson(runPost.stdout);
    ok(runPost.code === 1 && json && json.status === V2.STATUS.INDEPENDENT_VERIFICATION_FAIL, `P2 post falla conservador: ${runPost.stdout}`);
    ok(json.reasons.some((reason) => ['TRANSITION_COUNT', 'LOG_LENGTH', 'MARKER_TRANSITION'].includes(reason)), `P2 razones de transicion: ${JSON.stringify(json.reasons)}`);
    console.log(`✓ [${checks}] P2 post rechaza transicion adicional`);
  }

  // --- P3: reporte pre manipulado ---
  {
    const s = setup();
    const opA = addOperation(s);
    const reportPath = path.join(V1.reportsDir(s.root), `v2-pre-${opA.operationId}.json`);
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    report.baselineDigest = 'f'.repeat(64);
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    const run = await runProcess(V1_TOOL, consumeArgs(s, opA.envelopePath));
    const json = parseJson(run.stdout);
    ok(run.code === 1 && json && json.status === V1.STATUS.COUNTERSIGN_BASELINE_MISMATCH, `P3 baseline manipulado rechazado: ${run.stdout}`);
    console.log(`✓ [${checks}] P3 reporte pre manipulado rechazado`);
  }

  // --- P4: doble operationId ---
  {
    const s = setup();
    const opA = addOperation(s);
    const runA = await runProcess(V1_TOOL, consumeArgs(s, opA.envelopePath));
    ok(runA.code === 0, 'P4 base consumida');
    const logFile = path.join(V1.stateDir(s.root), 'consumption.log');
    const first = JSON.parse(fs.readFileSync(logFile, 'utf8').split('\n').filter((l) => l.trim() !== '')[0]);
    const duplicate = { ...first, seq: 2, prevEntryHash: first.entryHash };
    delete duplicate.entryHash;
    duplicate.entryHash = H.hashCanonical(duplicate);
    fs.appendFileSync(logFile, `${H.canonicalize(duplicate)}\n`, 'utf8');
    const state = V1.readState(s.root);
    ok(!state.ok && state.reason === 'CONSUMPTION_DUPLICATE_OPERATION', 'P4 duplicado detectable');
    const nextSigned = H.makeSignedEnvelope({ registry, authority: s.authority });
    const nextEnvelopePath = H.writeJsonFile(path.join(s.authDir, `envelope-${nextSigned.statement.nonce.slice(0, 10)}.json`), nextSigned.envelope);
    const runC = await runProcess(V1_TOOL, consumeArgs(s, nextEnvelopePath));
    const json = parseJson(runC.stdout);
    ok(runC.code === 1 && json && json.status === V1.STATUS.COUNTERSIGN_STATE_UNAVAILABLE, `P4 estado duplicado bloquea: ${runC.stdout}`);
    console.log(`✓ [${checks}] P4 doble operationId bloquea`);
  }

  // --- P5: gate completo en verde por CLI ---
  {
    const s = setup();
    const op = addOperation(s);
    const runConsume = await runProcess(V1_TOOL, consumeArgs(s, op.envelopePath));
    ok(runConsume.code === 0, 'P5 consume CLI');
    const runPost = await runProcess(V2_TOOL, postArgs(s, op.envelopePath));
    const json = parseJson(runPost.stdout);
    ok(runPost.code === 0 && json && json.status === V2.STATUS.INDEPENDENT_VERIFICATION_PASS, `P5 verificacion independiente PASS: ${runPost.stdout}`);
    console.log(`✓ [${checks}] P5 gate completo PASS`);
  }

  // --- P6: invalidacion previa al consumo ---
  {
    const s = setup();
    const op = addOperation(s);
    const invalidate = H.signDispositionStatement(H.makeInvalidateStatement({
      authority: s.authority,
      statementSha256: H.fakeHash('statement-afectado'),
      newRegistryRevision: 4,
      dispositionId: 'AX-DISP-0006'
    }), s.authority);
    const disposed = V1.applyDisposition({
      targetRoot: s.root,
      envelope: invalidate,
      registryPath: s.registryPath,
      authorityRegistryPath: s.authoritiesPath
    });
    ok(disposed.status === V1.STATUS.DISPOSITION_VALID, `P6 invalidacion registrada: ${disposed.reason || disposed.status}`);
    const run = await runProcess(V1_TOOL, consumeArgs(s, op.envelopePath));
    const json = parseJson(run.stdout);
    ok(run.code === 1 && json && json.status === V1.STATUS.COUNTERSIGN_REVISION_INVALIDATED, `P6 revision invalidada bloquea: ${run.stdout}`);
    console.log(`✓ [${checks}] P6 invalidacion bloquea la revision`);
  }

  // --- P7: revision superada / registro cambiado ---
  {
    const s = setup();
    const op = addOperation(s);
    const modified = JSON.parse(JSON.stringify(registry));
    modified.designVersion = '0.14';
    const modifiedPath = H.writeJsonFile(path.join(s.authDir, 'registry-modificado.json'), modified);
    const run = await runProcess(V1_TOOL, ['consume', '--envelope', op.envelopePath, '--registry', modifiedPath, '--authorities', s.authoritiesPath, '--target', s.root]);
    const json = parseJson(run.stdout);
    ok(run.code === 1 && json && json.status === V1.STATUS.COUNTERSIGN_SCOPE_MISMATCH, `P7 registro cambiado rechazado: ${run.stdout}`);
    console.log(`✓ [${checks}] P7 registro superado rechazado`);
  }

  // --- P8: HALT entre pre y consume ---
  {
    const s = setup();
    const op = addOperation(s);
    H.writeHalt(s.root, 'parada de prueba P8');
    const run = await runProcess(V1_TOOL, consumeArgs(s, op.envelopePath));
    const json = parseJson(run.stdout);
    ok(run.code === 1 && json && json.status === V1.STATUS.COUNTERSIGN_HALTED, `P8 HALT bloquea: ${run.stdout}`);
    console.log(`✓ [${checks}] P8 HALT bloquea el consumo`);
  }

  // --- P9: revocacion CRL entre pre y consume ---
  {
    const s = setup();
    const op = addOperation(s);
    H.writeCrl(s.root, [s.authority.keyId]);
    const run = await runProcess(V1_TOOL, consumeArgs(s, op.envelopePath));
    const json = parseJson(run.stdout);
    ok(run.code === 1 && json && json.status === V1.STATUS.COUNTERSIGN_REVOKED, `P9 CRL bloquea: ${run.stdout}`);
    console.log(`✓ [${checks}] P9 revocacion bloquea el consumo`);
  }

  // --- P10: cambio de autorizacion entre consume y post ---
  {
    const s = setup();
    const op = addOperation(s);
    const runConsume = await runProcess(V1_TOOL, consumeArgs(s, op.envelopePath));
    ok(runConsume.code === 0, 'P10 consume previo');
    H.writeCrl(s.root, [s.authority.keyId]);
    const runPost = await runProcess(V2_TOOL, postArgs(s, op.envelopePath));
    const json = parseJson(runPost.stdout);
    ok(runPost.code === 1 && json && json.status === V2.STATUS.INDEPENDENT_VERIFICATION_FAIL, `P10 post falla: ${runPost.stdout}`);
    ok(json.reasons.includes('AUTHORIZATION_CHANGED_DURING_CONSUMPTION'), `P10 razon de autorizacion: ${JSON.stringify(json.reasons)}`);
    console.log(`✓ [${checks}] P10 cambio de autorizacion invalida el gate`);
  }

  H.cleanup(cleanup);
  console.log(`\n=== AX-F-236 PASS (${checks} comprobaciones) ===`);
})().catch((error) => {
  H.cleanup(cleanup);
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
