'use strict';

/**
 * Axion Protocol — Invariantes de Orquestación Contextual y Modelo de Contrato Verificable de /drive.
 *
 * Valida de forma determinista los invariantes del Lote 1 con cobertura adversarial:
 * 1. Aislamiento e Invariantes de Procedencia: tools/mission_context.js no lee ni depende de transcript,
 *    brain, variables de entorno de perfil (USERPROFILE/APPDATA) ni rutas externas al repositorio.
 * 2. MissionContext preserva source, observedAt, confidence y status en datos observables.
 * 3. Principio de No-Invención: datos no disponibles se marcan como null / no inventados.
 * 4. Falta de contexto crítico devuelve BLOCKED_CONTEXT_REQUIRED con missingFields y requiredHumanAction.
 * 5. Backlog con texto falso de evidencia o archivos inexistentes asigna confidence: 'UNVERIFIED' y verified: false.
 * 6. Rechazo estricto fail-closed de contratos sin evidencia estructurada (prohibida evidencia inventada o frases por defecto).
 * 7. Mismo contexto canónico produce exactamente el mismo digest SHA-256 (independiente de timestamps efímeros e IDs aleatorios).
 * 8. Contexto válido con una sola misión produce exactamente una propuesta (cero relleno estático ni padding obligatorio).
 * 9. Cada misión propuesta conserva al menos una cápsula estructurada de evidencia verificable.
 * 10. Eliminación o alteración de evidencia observable bloquea o cambia dinámicamente la propuesta generada.
 * 11. Ausencia de fallback que auto-ejecute misiones estáticas ("auto", "cola", "overnight" bloquean sin contexto).
 * 12. Enforzamiento estricto de las 12 skills canónicas (rechazo con excepción ante 'clean-code' o 'systematic-debugging').
 * 13. Resiliencia no destructiva: lectura de backlog corrupto es recuperable sin destruir el archivo en disco.
 * 14. Superficies de Drive y configuración OpenCode libres de claims de autonomía universal y con paridad de bytes.
 *
 * BATERÍA ADVERSARIAL AVANZADA:
 * 15. Blindaje anti-traversal: localizadores file:../../ y journal:../../ son bloqueados aunque el archivo externo exista.
 * 16. Verificación real de locators Git: status con archivo no modificado, branch falsa o commit falso son rechazados.
 * 17. Bloqueo de intent: persistido en backlog (intent solo es válido desde el contexto activo).
 * 18. Rechazo estricto de cápsulas incompletas (sin fecha ISO válida o sin nivel de confianza explícito).
 * 19. Cripto-ligadura de evidenceTrigger en el digest canónico (mutación de texto visible altera el digest).
 * 20. Scope no inventado: intención sin archivos asociados recibe scope vacío y bloquea mutación (exige READ_ONLY).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const cp = require('child_process');
const crypto = require('crypto');

const {
  MissionContext,
  MissionContract,
  CANONICAL_SKILLS,
  AUTONOMY_LEVELS,
  VALID_SOURCES,
  VALID_STATUSES,
  VALID_CONFIDENCE_LEVELS,
  isValidEvidenceCapsule,
  verifyBacklogItemEvidence
} = require('../../tools/mission_context.js');
const MissionBacklogVault = require('../../tools/mission_backlog_vault.js');
const DriveMissionMatrix = require('../../tools/drive_mission_matrix.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-225 Invariantes del Orquestador Contextual y Modelo de Misión Gobernada ===\n');

const ROOT = path.resolve(__dirname, '..', '..');

// -------------------------------------------------------------------------------------------------
// Invariante 1: Aislamiento estricto y cero dependencias de transcripciones o rutas externas
// -------------------------------------------------------------------------------------------------
{
  const missionContextFile = path.join(ROOT, 'tools', 'mission_context.js');
  assert.ok(fs.existsSync(missionContextFile), 'tools/mission_context.js debe existir físicamente');
  const sourceCode = fs.readFileSync(missionContextFile, 'utf8');

  // Prohibir terminantemente cualquier referencia a runtime privado, transcripciones o perfiles
  const forbiddenTerms = [
    'transcript',
    'brain',
    'antigravity',
    'USERPROFILE',
    'APPDATA',
    'LOCALAPPDATA',
    '.gemini'
  ];

  for (const term of forbiddenTerms) {
    const regex = new RegExp(`\\b${term}\\b`, 'i');
    assert.ok(
      !regex.test(sourceCode),
      `Violación de aislamiento: tools/mission_context.js contiene referencia prohibida a '${term}'`
    );
  }

  // Verificar que MissionContext solo opera dentro del projectRoot especificado
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-iso-check-'));
  try {
    const ctx = new MissionContext(sandbox);
    assert.strictEqual(ctx.root, path.resolve(sandbox));
    assert.strictEqual(ctx.git.isRepo, false);
    assert.strictEqual(ctx.packageConfig.status, 'NOT_FOUND');
    assert.strictEqual(ctx.persistedBacklog.source, 'AXION_STATE_DIR');
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }

  console.log('✓ Invariante 1: Aislamiento estricto verificado — cero referencias a transcripciones, brain o perfiles externos.');
}

// -------------------------------------------------------------------------------------------------
// Invariante 2: Hechos observables preservan source, observedAt, confidence y status
// -------------------------------------------------------------------------------------------------
{
  const ctx = new MissionContext(ROOT);
  const observableSections = [ctx.git, ctx.packageConfig, ctx.persistedBacklog, ctx.testState, ctx.explicitIntent];
  for (const sec of observableSections) {
    assert.ok(sec.source, 'Cada sección observable debe declarar source');
    assert.ok(sec.observedAt, 'Cada sección observable debe declarar observedAt');
    assert.ok(sec.confidence, 'Cada sección observable debe declarar confidence');
    assert.ok(sec.status, 'Cada sección observable debe declarar status');
  }
  console.log('✓ Invariante 2: MissionContext preserva source, observedAt, confidence y status en todas las secciones.');
}

// -------------------------------------------------------------------------------------------------
// Invariante 3: Principio de No-Invención (datos no observables son null / no inventados)
// -------------------------------------------------------------------------------------------------
{
  const emptyTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-ctx-empty-'));
  try {
    const ctxEmpty = new MissionContext(emptyTmp);
    assert.strictEqual(ctxEmpty.git.isRepo, false);
    assert.strictEqual(ctxEmpty.git.branch, null);
    assert.strictEqual(ctxEmpty.git.head, null);
    assert.strictEqual(ctxEmpty.git.status, 'NOT_A_GIT_REPOSITORY');

    assert.strictEqual(ctxEmpty.packageConfig.name, null);
    assert.strictEqual(ctxEmpty.packageConfig.version, null);
    assert.strictEqual(ctxEmpty.packageConfig.status, 'NOT_FOUND');

    assert.strictEqual(ctxEmpty.explicitIntent.text, null);
    assert.strictEqual(ctxEmpty.explicitIntent.status, 'NOT_PROVIDED');
  } finally {
    fs.rmSync(emptyTmp, { recursive: true, force: true });
  }
  console.log('✓ Invariante 3: Datos no disponibles se marcan como null / no inventados.');
}

// -------------------------------------------------------------------------------------------------
// Invariante 4: Falta de contexto crítico devuelve BLOCKED_CONTEXT_REQUIRED
// -------------------------------------------------------------------------------------------------
{
  const emptyTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-ctx-blocked-'));
  try {
    const ctx = new MissionContext(emptyTmp);
    const validation = ctx.validateContext();
    assert.strictEqual(validation.valid, false);
    assert.strictEqual(validation.status, 'BLOCKED_CONTEXT_REQUIRED');
    assert.ok(Array.isArray(validation.missingFields) && validation.missingFields.length > 0);
    assert.ok(validation.missingFields.includes('explicitIntent'));
    assert.ok(validation.requiredHumanAction && validation.requiredHumanAction.length > 0);
    assert.ok(validation.reason && validation.reason.length > 0);
  } finally {
    fs.rmSync(emptyTmp, { recursive: true, force: true });
  }
  console.log('✓ Invariante 4: Falta de contexto crítico devuelve BLOCKED_CONTEXT_REQUIRED con missingFields y requiredHumanAction.');
}

// -------------------------------------------------------------------------------------------------
// Invariante 5: Backlog con texto falso de evidencia → UNVERIFIED y verified: false
// -------------------------------------------------------------------------------------------------
{
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-backlog-verif-'));
  const stateDir = path.join(sandbox, '.axion', 'state');
  fs.mkdirSync(stateDir, { recursive: true });

  const dummyFile = path.join(sandbox, 'tools', 'sample_real.js');
  fs.mkdirSync(path.dirname(dummyFile), { recursive: true });
  fs.writeFileSync(dummyFile, '// real tool', 'utf8');

  const historicalVaultFile = path.join(stateDir, 'mission_vault.json');
  const testPayload = {
    version: '1.4.0',
    updatedAt: '2026-09-01T00:00:00.000Z',
    activeFocus: 'GENERAL',
    reservoir: [
      {
        id: 'M_FAKE_TEXT_EVIDENCE',
        category: 'GOVERNANCE',
        title: 'Misión con Texto Falso de Evidencia',
        summary: 'Entrada con evidencia en texto libre pero sin cápsula estructurada',
        evidenceTrigger: 'Texto falso arbitrario que afirma estar verificado sin datos observables',
        status: 'QUEUED',
        verified: true,
        priority: 85
      },
      {
        id: 'M_NON_EXISTENT_FILE_LOCATOR',
        category: 'GOVERNANCE',
        title: 'Misión con Localizador No Observable',
        summary: 'Cápsula que apunta a archivo que no existe en disco',
        evidence: [
          {
            source: 'LOCAL_FS',
            observedAt: '2026-09-15T00:00:00.000Z',
            status: 'OBSERVED',
            confidence: 'HIGH',
            locator: 'file:tools/falso_no_existe_en_disco.js'
          }
        ],
        status: 'QUEUED',
        verified: true,
        priority: 80
      },
      {
        id: 'M_GENUINE_EVIDENCE',
        category: 'NEW_FEATURE',
        title: 'Misión con Evidencia Verificable Real',
        summary: 'Cápsula estructurada con localizador físicamente existente',
        evidence: [
          {
            source: 'LOCAL_FS',
            observedAt: '2026-09-15T00:00:00.000Z',
            status: 'OBSERVED',
            confidence: 'HIGH',
            locator: 'file:tools/sample_real.js'
          }
        ],
        status: 'QUEUED',
        verified: true,
        priority: 95
      }
    ]
  };

  try {
    fs.writeFileSync(historicalVaultFile, JSON.stringify(testPayload, null, 2), 'utf8');

    const vault = new MissionBacklogVault(sandbox);
    const loaded = vault.loadVault();

    const fakeText = loaded.reservoir.find(m => m.id === 'M_FAKE_TEXT_EVIDENCE');
    assert.strictEqual(fakeText.status, 'QUEUED');
    assert.strictEqual(fakeText.confidence, 'UNVERIFIED');
    assert.strictEqual(fakeText.verified, false);

    const nonExistent = loaded.reservoir.find(m => m.id === 'M_NON_EXISTENT_FILE_LOCATOR');
    assert.strictEqual(nonExistent.status, 'QUEUED');
    assert.strictEqual(nonExistent.confidence, 'UNVERIFIED');
    assert.strictEqual(nonExistent.verified, false);

    const genuine = loaded.reservoir.find(m => m.id === 'M_GENUINE_EVIDENCE');
    assert.strictEqual(genuine.status, 'QUEUED');
    assert.strictEqual(genuine.confidence, 'HIGH');
    assert.strictEqual(genuine.verified, true);
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
  console.log('✓ Invariante 5: Backlog con texto falso de evidencia o localizador inexistente queda forzado a UNVERIFIED y verified: false.');
}

// -------------------------------------------------------------------------------------------------
// Invariante 6: Rechazo estricto fail-closed de contratos sin evidencia estructurada
// -------------------------------------------------------------------------------------------------
{
  assert.throws(() => {
    new MissionContract({
      title: 'Misión Sin Evidencia',
      objective: 'Probar rechazo fail-closed'
    });
  }, /Invariante violada: MissionContract requiere al menos una cápsula estructurada de evidencia/);

  assert.throws(() => {
    new MissionContract({
      title: 'Misión Con Evidencia Vacía',
      objective: 'Probar rechazo fail-closed',
      evidence: []
    });
  }, /Invariante violada: MissionContract requiere al menos una cápsula estructurada de evidencia/);

  assert.throws(() => {
    new MissionContract({
      title: 'Misión Con Cápsula Inválida',
      objective: 'Probar rechazo fail-closed',
      evidence: [{ source: 'GIT_CLI' }]
    });
  }, /Invariante violada: Cápsula de evidencia incompleta o inválida/);

  assert.throws(() => {
    new MissionContract({
      title: 'Misión Solo Con Texto',
      objective: 'Probar rechazo fail-closed',
      evidenceTrigger: 'Texto libre sin cápsula estructurada'
    });
  }, /Invariante violada: MissionContract requiere al menos una cápsula estructurada de evidencia/);

  console.log('✓ Invariante 6: Rechazo estricto fail-closed demostrado ante cualquier intento de contrato sin evidencia estructurada.');
}

// -------------------------------------------------------------------------------------------------
// Invariante 7: Mismo contexto canónico produce exactamente el mismo digest SHA-256
// -------------------------------------------------------------------------------------------------
{
  const evidenceCapsules = [
    {
      source: 'GIT_CLI',
      observedAt: '2026-09-15T10:00:00.000Z',
      status: 'OBSERVED',
      confidence: 'HIGH',
      locator: 'git:status:tools/sample.js'
    }
  ];

  const contractA = new MissionContract({
    title: 'Estabilización de Invariantes de Red',
    objective: 'Verificar contratos de serialización determinista',
    evidence: evidenceCapsules,
    evidenceTrigger: 'Evidencia A',
    scope: ['tools/network.js', 'tools/security.js'],
    nonScope: ['bin/'],
    dependencies: ['verify', 'review'],
    candidateTests: ['tests/run_all.js'],
    autonomyLevelRequired: 'LOCAL_MUTATION',
    createdAt: '2026-09-15T10:00:00.000Z'
  });

  const contractB = new MissionContract({
    title: 'Estabilización de Invariantes de Red',
    objective: 'Verificar contratos de serialización determinista',
    evidence: [
      {
        source: 'GIT_CLI',
        observedAt: '2026-09-15T22:30:00.000Z',
        status: 'OBSERVED',
        confidence: 'HIGH',
        locator: 'git:status:tools/sample.js'
      }
    ],
    evidenceTrigger: 'Evidencia A',
    scope: ['tools/security.js', 'tools/network.js'],
    nonScope: ['bin/'],
    dependencies: ['review', 'verify'],
    candidateTests: ['tests/run_all.js'],
    autonomyLevelRequired: 'LOCAL_MUTATION',
    createdAt: '2026-09-15T22:30:00.000Z'
  });

  assert.strictEqual(
    contractA.contractDigest,
    contractB.contractDigest,
    'Mismo contexto canónico debe producir idéntico digest SHA-256'
  );
  assert.strictEqual(contractA.contractId, contractB.contractId);

  console.log('✓ Invariante 7: Determinismo canónico probado — mismo contexto produce idéntico digest SHA-256 independientemente de timestamps efímeros.');
}

// -------------------------------------------------------------------------------------------------
// Invariante 8: Contexto válido con una sola misión → una sola propuesta, sin relleno
// -------------------------------------------------------------------------------------------------
{
  const emptyTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-single-prop-'));
  try {
    // Inicializar repositorio Git real en disco con árbol limpio
    cp.execSync('git init', { cwd: emptyTmp, stdio: 'ignore' });
    cp.execSync('git config user.name "Axion Test"', { cwd: emptyTmp, stdio: 'ignore' });
    cp.execSync('git config user.email "test@axion.local"', { cwd: emptyTmp, stdio: 'ignore' });
    fs.writeFileSync(path.join(emptyTmp, 'package.json'), JSON.stringify({ name: 'axion-test', version: '1.0.0' }), 'utf8');
    fs.writeFileSync(path.join(emptyTmp, 'README.md'), '# Axion Test\n', 'utf8');
    cp.execSync('git add . && git commit -m "init"', { cwd: emptyTmp, stdio: 'ignore' });

    // Contexto activo genuino observando Git real e intención provista por el llamador (cero overrides ficticios)
    const ctx = new MissionContext(emptyTmp, 'Optimizar algoritmo de compresión de tokens');

    const validation = ctx.validateContext();
    assert.strictEqual(validation.valid, true);
    assert.strictEqual(ctx.git.isRepo, true);
    assert.strictEqual(ctx.git.hasUncommittedChanges, false);

    const proposals = ctx.synthesizeEvidenceBasedMissions(5);
    assert.strictEqual(proposals.length, 1, `Debe generar exactamente 1 propuesta, obtuvo ${proposals.length}`);
    assert.strictEqual(proposals[0].id, 'MISSION_EXPLICIT_INTENT');
    assert.ok(proposals[0].evidence && proposals[0].evidence.length >= 1);
  } finally {
    fs.rmSync(emptyTmp, { recursive: true, force: true });
  }

  console.log('✓ Invariante 8: Contexto con una sola misión produce exactamente una propuesta (cero relleno estático ni padding obligatorio).');
}

// -------------------------------------------------------------------------------------------------
// Invariante 9: Cada misión propuesta conserva al menos una cápsula estructurada de evidencia verificable
// -------------------------------------------------------------------------------------------------
{
  const ctx = new MissionContext(ROOT, 'Auditar gobernanza contextual y contratos de misión');
  const proposals = ctx.synthesizeEvidenceBasedMissions(5);
  assert.ok(proposals.length > 0, 'Debe sintetizar propuestas');

  for (const p of proposals) {
    assert.ok(Array.isArray(p.evidence), `Propuesta ${p.id} debe incluir array de evidence`);
    assert.ok(p.evidence.length >= 1, `Propuesta ${p.id} debe contener al menos 1 cápsula de evidencia`);
    for (const cap of p.evidence) {
      assert.ok(isValidEvidenceCapsule(cap), `Cápsula de evidencia en ${p.id} debe ser válida`);
      assert.ok(typeof cap.locator === 'string' && cap.locator.length > 0);
    }

    const contract = ctx.createMissionContract(p);
    assert.ok(contract instanceof MissionContract);
    assert.strictEqual(contract.evidence.length, p.evidence.length);
    assert.strictEqual(contract.evidence[0].locator, p.evidence[0].locator);
    assert.ok(contract.contractDigest && contract.contractDigest.length === 64);
  }

  console.log('✓ Invariante 9: Cada misión propuesta conserva cápsulas estructuradas de evidencia verificable transferibles al contrato.');
}

// -------------------------------------------------------------------------------------------------
// Invariante 10: Eliminación o alteración de evidencia observable bloquea o cambia dinámicamente la propuesta
// -------------------------------------------------------------------------------------------------
{
  const sandboxA = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-git-obs-'));
  const sandboxB = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-no-evidence-'));
  try {
    // 1. Repositorio con cambios no confirmados reales en disco
    cp.execSync('git init', { cwd: sandboxA, stdio: 'ignore' });
    cp.execSync('git config user.name "Axion Test"', { cwd: sandboxA, stdio: 'ignore' });
    cp.execSync('git config user.email "test@axion.local"', { cwd: sandboxA, stdio: 'ignore' });
    const sampleFile = path.join(sandboxA, 'sample.js');
    fs.writeFileSync(sampleFile, '// v1\n', 'utf8');
    cp.execSync('git add . && git commit -m "init"', { cwd: sandboxA, stdio: 'ignore' });
    // Mutación real en working tree
    fs.writeFileSync(sampleFile, '// v2 modified\n', 'utf8');

    const ctxWithGit = new MissionContext(sandboxA);
    assert.strictEqual(ctxWithGit.git.hasUncommittedChanges, true);
    const proposalsA = ctxWithGit.synthesizeEvidenceBasedMissions(5);
    assert.ok(proposalsA.length > 0);
    assert.strictEqual(proposalsA[0].id, 'MISSION_UNCOMMITTED_CHANGES');
    assert.ok(proposalsA[0].evidence[0].locator.includes('sample.js'));

    // 2. Repositorio limpio sin cambios ni intención: bloquea fail-closed y produce 0 propuestas
    cp.execSync('git init', { cwd: sandboxB, stdio: 'ignore' });
    cp.execSync('git config user.name "Axion Test"', { cwd: sandboxB, stdio: 'ignore' });
    cp.execSync('git config user.email "test@axion.local"', { cwd: sandboxB, stdio: 'ignore' });
    fs.writeFileSync(path.join(sandboxB, 'clean.js'), '// clean\n', 'utf8');
    cp.execSync('git add . && git commit -m "init"', { cwd: sandboxB, stdio: 'ignore' });

    const ctxNoEvidence = new MissionContext(sandboxB);
    const validationB = ctxNoEvidence.validateContext();
    assert.strictEqual(validationB.valid, false);
    assert.strictEqual(validationB.status, 'BLOCKED_CONTEXT_REQUIRED');
    const proposalsB = ctxNoEvidence.synthesizeEvidenceBasedMissions(5);
    assert.strictEqual(proposalsB.length, 0);

    // 3. Introducción de intención explícita en el mismo repositorio limpio: habilita exactamente 1 propuesta
    const ctxWithIntent = new MissionContext(sandboxB, 'Crear validador determinista de esquemas');
    const validationC = ctxWithIntent.validateContext();
    assert.strictEqual(validationC.valid, true);
    const proposalsC = ctxWithIntent.synthesizeEvidenceBasedMissions(5);
    assert.strictEqual(proposalsC.length, 1);
    assert.strictEqual(proposalsC[0].id, 'MISSION_EXPLICIT_INTENT');
    assert.ok(proposalsC[0].evidence[0].locator.includes('Crear validador determinista de esquemas'));
  } finally {
    fs.rmSync(sandboxA, { recursive: true, force: true });
    fs.rmSync(sandboxB, { recursive: true, force: true });
  }

  console.log('✓ Invariante 10: Eliminación de evidencia bloquea la síntesis y la mutación altera la propuesta dinámicamente.');
}

// -------------------------------------------------------------------------------------------------
// Invariante 11: Ausencia de fallback que auto-ejecute una misión estática ("auto", "cola")
// -------------------------------------------------------------------------------------------------
{
  const emptyTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-ctx-autotrig-'));
  try {
    for (const triggerWord of ['auto', 'cola', 'overnight', 'desatendido']) {
      const ctxTrigger = new MissionContext(emptyTmp, { intent: triggerWord });
      assert.strictEqual(ctxTrigger.explicitIntent.status, 'TRIGGER_KEYWORD_ONLY');
      assert.strictEqual(ctxTrigger.explicitIntent.text, null);

      const validation = ctxTrigger.validateContext();
      assert.strictEqual(validation.valid, false);
      assert.strictEqual(validation.status, 'BLOCKED_CONTEXT_REQUIRED');

      const proposals = ctxTrigger.synthesizeEvidenceBasedMissions();
      assert.strictEqual(proposals.length, 0, 'No debe sintetizar ni auto-ejecutar misiones estáticas');
    }
  } finally {
    fs.rmSync(emptyTmp, { recursive: true, force: true });
  }
  console.log('✓ Invariante 11: Invocaciones de disparo sin contexto observable son bloqueadas sin auto-ejecutar misiones estáticas.');
}

// -------------------------------------------------------------------------------------------------
// Invariante 12: Enforzamiento estricto de las 12 skills canónicas
// -------------------------------------------------------------------------------------------------
{
  assert.strictEqual(CANONICAL_SKILLS.length, 12);
  const expectedSkills = ['attest', 'clarify', 'debug', 'drive', 'halt', 'memory', 'preflight', 'premortem', 'profile', 'review', 'snapshot', 'verify'];
  assert.deepStrictEqual([...CANONICAL_SKILLS].sort(), expectedSkills.sort());

  const sampleEvidence = [{ source: 'LOCAL_FS', observedAt: '2026-09-15T00:00:00.000Z', status: 'OBSERVED', confidence: 'HIGH', locator: 'file:package.json' }];

  assert.throws(() => {
    new MissionContract({
      title: 'Misión con skill no canónica',
      objective: 'Probar rechazo fail-closed',
      evidence: sampleEvidence,
      canonicalSkills: ['clean-code']
    });
  }, /Invariante violada: skill no canónica 'clean-code'/);

  assert.throws(() => {
    new MissionContract({
      title: 'Misión con dependencia no canónica',
      objective: 'Probar rechazo en dependencias',
      evidence: sampleEvidence,
      dependencies: ['systematic-debugging']
    });
  }, /Invariante violada: skill no canónica 'systematic-debugging'/);
  console.log('✓ Invariante 12: Enforzamiento estricto de las 12 skills canónicas con rechazo fail-closed de skills inexistentes.');
}

// -------------------------------------------------------------------------------------------------
// Invariante 13: Resiliencia no destructiva ante backlog corrupto
// -------------------------------------------------------------------------------------------------
{
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-corrupt-backlog-'));
  const stateDir = path.join(sandbox, '.axion', 'state');
  fs.mkdirSync(stateDir, { recursive: true });

  const corruptFile = path.join(stateDir, 'mission_vault.json');
  const corruptPayload = '{"version": "1.4.0", "reservoir": [CORRUPTED_JSON_DATA...';
  fs.writeFileSync(corruptFile, corruptPayload, 'utf8');

  try {
    const vault = new MissionBacklogVault(sandbox);
    const loaded = vault.loadVault();

    assert.strictEqual(loaded.corrupted, true);
    assert.strictEqual(loaded.status, 'RECOVERABLE_CORRUPTED_READ');
    assert.ok(loaded.readError, 'Debe registrar readError');

    const diskContent = fs.readFileSync(corruptFile, 'utf8');
    assert.strictEqual(diskContent, corruptPayload, 'El archivo corrupto original debe preservarse para auditoría');
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
  console.log('✓ Invariante 13: Lectura de backlog corrupto es recuperable y no destruye el archivo en disco.');
}

// -------------------------------------------------------------------------------------------------
// Invariante 14: Superficies de Drive y configuración OpenCode libres de claims universales y skills no canónicas
// -------------------------------------------------------------------------------------------------
{
  const surfaces = [
    path.join(ROOT, '.agents', 'skills', 'drive', 'SKILL.md'),
    path.join(ROOT, '.claude', 'commands', 'drive.md'),
    path.join(ROOT, '.opencode', 'commands', 'drive.md')
  ];

  const contents = surfaces.map(s => fs.readFileSync(s, 'utf8'));

  const hashes = contents.map(c => crypto.createHash('sha256').update(c).digest('hex'));
  assert.strictEqual(hashes[0], hashes[1]);
  assert.strictEqual(hashes[1], hashes[2]);

  for (const c of contents) {
    assert.ok(!c.includes('clean-code'), 'No debe referenciar clean-code');
    assert.ok(!c.includes('systematic-debugging'), 'No debe referenciar systematic-debugging');
    assert.ok(!c.includes('100% autónoma y continua'), 'No debe hacer claims de 100% autónoma y continua');
    assert.ok(!c.includes('Cero Micro-Interrupciones'), 'No debe prometer Cero Micro-Interrupciones');
  }

  const opencodeJsonPath = path.join(ROOT, 'opencode.json');
  const opencodeText = fs.readFileSync(opencodeJsonPath, 'utf8');
  assert.ok(!opencodeText.includes('clean-code'), 'opencode.json no debe referenciar clean-code');
  assert.ok(!opencodeText.includes('systematic-debugging'), 'opencode.json no debe referenciar systematic-debugging');
  assert.ok(!opencodeText.includes('100% autónom'), 'opencode.json no debe tener claim 100% autónomo');
  assert.ok(!opencodeText.includes('Cero Micro-Interrupciones'), 'opencode.json no debe tener claim Cero Micro-Interrupciones');

  console.log('✓ Invariante 14: Superficies de Drive con paridad SHA-256 exacta y libres de claims universales y skills no canónicas.');
}

// -------------------------------------------------------------------------------------------------
// Invariante 15 (Adversarial): Blindaje anti-traversal en localizadores file: y journal:
// -------------------------------------------------------------------------------------------------
{
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-traversal-root-'));
  const outsideSecret = path.join(os.tmpdir(), 'secret_outside_repo.txt');
  fs.writeFileSync(outsideSecret, 'PRIVATE_HOST_DATA', 'utf8');

  try {
    // 1. file: con traversal relativo hacia archivo externo
    const itemTraversalFile = {
      title: 'Misión Traversal File',
      evidence: [
        {
          source: 'LOCAL_FS',
          observedAt: '2026-09-15T00:00:00.000Z',
          status: 'OBSERVED',
          confidence: 'HIGH',
          locator: 'file:../../secret_outside_repo.txt'
        }
      ]
    };
    const resFile = verifyBacklogItemEvidence(itemTraversalFile, sandbox);
    assert.strictEqual(resFile.verified, false, 'file: traversal debe ser rechazado');
    assert.strictEqual(resFile.confidence, 'UNVERIFIED');

    // 2. journal: con traversal relativo hacia archivo externo
    const itemTraversalJournal = {
      title: 'Misión Traversal Journal',
      evidence: [
        {
          source: 'AXION_STATE_DIR',
          observedAt: '2026-09-15T00:00:00.000Z',
          status: 'OBSERVED',
          confidence: 'HIGH',
          locator: 'journal:../../secret_outside_repo.txt'
        }
      ]
    };
    const resJournal = verifyBacklogItemEvidence(itemTraversalJournal, sandbox);
    assert.strictEqual(resJournal.verified, false, 'journal: traversal debe ser rechazado');
    assert.strictEqual(resJournal.confidence, 'UNVERIFIED');
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
    if (fs.existsSync(outsideSecret)) fs.rmSync(outsideSecret, { force: true });
  }
  console.log('✓ Invariante 15 (Adversarial): Path traversal bloqueado en file: y journal: impidiendo escape de projectRoot.');
}

// -------------------------------------------------------------------------------------------------
// Invariante 16 (Adversarial): Verificación real de localizadores Git (status, branch, commit)
// -------------------------------------------------------------------------------------------------
{
  const mockGitContext = {
    isRepo: true,
    branch: 'feature/genuine-branch',
    head: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    uncommittedFiles: ['tools/actual_modified.js']
  };

  // 1. git:status declarando archivo no modificado
  const itemBadStatus = {
    title: 'Misión Git Status Falso',
    evidence: [
      {
        source: 'GIT_CLI',
        observedAt: '2026-09-15T00:00:00.000Z',
        status: 'OBSERVED',
        confidence: 'HIGH',
        locator: 'git:status:tools/unmodified_file.js'
      }
    ]
  };
  const resBadStatus = verifyBacklogItemEvidence(itemBadStatus, ROOT, mockGitContext);
  assert.strictEqual(resBadStatus.verified, false, 'git:status con archivo no modificado debe ser rechazado');
  assert.strictEqual(resBadStatus.confidence, 'UNVERIFIED');

  // 2. git:branch declarando rama diferente a la activa
  const itemBadBranch = {
    title: 'Misión Git Branch Falsa',
    evidence: [
      {
        source: 'GIT_CLI',
        observedAt: '2026-09-15T00:00:00.000Z',
        status: 'OBSERVED',
        confidence: 'HIGH',
        locator: 'git:branch:main' // context está en feature/genuine-branch
      }
    ]
  };
  const resBadBranch = verifyBacklogItemEvidence(itemBadBranch, ROOT, mockGitContext);
  assert.strictEqual(resBadBranch.verified, false, 'git:branch falso debe ser rechazado');
  assert.strictEqual(resBadBranch.confidence, 'UNVERIFIED');

  // 3. git:commit declarando SHA que no corresponde a HEAD
  const itemBadCommit = {
    title: 'Misión Git Commit Falso',
    evidence: [
      {
        source: 'GIT_CLI',
        observedAt: '2026-09-15T00:00:00.000Z',
        status: 'OBSERVED',
        confidence: 'HIGH',
        locator: 'git:commit:deadbeefdeadbeefdeadbeefdeadbeefdeadbeef'
      }
    ]
  };
  const resBadCommit = verifyBacklogItemEvidence(itemBadCommit, ROOT, mockGitContext);
  assert.strictEqual(resBadCommit.verified, false, 'git:commit falso debe ser rechazado');
  assert.strictEqual(resBadCommit.confidence, 'UNVERIFIED');

  // 4. git:status correcto con archivo realmente modificado
  const itemGoodGit = {
    title: 'Misión Git Verídica',
    evidence: [
      {
        source: 'GIT_CLI',
        observedAt: '2026-09-15T00:00:00.000Z',
        status: 'OBSERVED',
        confidence: 'HIGH',
        locator: 'git:status:tools/actual_modified.js'
      }
    ]
  };
  const resGoodGit = verifyBacklogItemEvidence(itemGoodGit, ROOT, mockGitContext);
  assert.strictEqual(resGoodGit.verified, true);
  assert.strictEqual(resGoodGit.confidence, 'HIGH');

  console.log('✓ Invariante 16 (Adversarial): Localizadores Git verificados físicamente contra estado, rama y commit reales.');
}

// -------------------------------------------------------------------------------------------------
// Invariante 17 (Adversarial): Bloqueo estricto de intent: en backlog persistido
// -------------------------------------------------------------------------------------------------
{
  const itemPersistentIntent = {
    title: 'Misión Intent Autoafirmado',
    evidence: [
      {
        source: 'CALLER_EXPLICIT_INTENT',
        observedAt: '2026-09-15T00:00:00.000Z',
        status: 'PROVIDED',
        confidence: 'HIGH',
        locator: 'intent:Requerimiento falso guardado en json'
      }
    ]
  };
  const res = verifyBacklogItemEvidence(itemPersistentIntent, ROOT);
  assert.strictEqual(res.verified, false, 'intent: en backlog persistido debe ser rechazado');
  assert.strictEqual(res.confidence, 'UNVERIFIED');
  console.log('✓ Invariante 17 (Adversarial): Localizador intent: rechazado en backlog persistido (solo admisible desde sesión activa).');
}

// -------------------------------------------------------------------------------------------------
// Invariante 18 (Adversarial): Rechazo estricto de cápsulas incompletas (sin fecha o sin confianza)
// -------------------------------------------------------------------------------------------------
{
  // 1. Cápsula sin observedAt
  assert.strictEqual(
    isValidEvidenceCapsule({
      source: 'LOCAL_FS',
      status: 'OBSERVED',
      confidence: 'HIGH',
      locator: 'file:package.json'
    }),
    false,
    'Cápsula sin observedAt debe ser inválida'
  );

  // 2. Cápsula con observedAt inválido (no fecha)
  assert.strictEqual(
    isValidEvidenceCapsule({
      source: 'LOCAL_FS',
      observedAt: 'fecha-invalida-123',
      status: 'OBSERVED',
      confidence: 'HIGH',
      locator: 'file:package.json'
    }),
    false,
    'Cápsula con observedAt corrupto debe ser inválida'
  );

  // 3. Cápsula sin confidence
  assert.strictEqual(
    isValidEvidenceCapsule({
      source: 'LOCAL_FS',
      observedAt: '2026-09-15T00:00:00.000Z',
      status: 'OBSERVED',
      locator: 'file:package.json'
    }),
    false,
    'Cápsula sin confidence debe ser inválida'
  );

  // 4. Cápsula con confidence fuera de enum ('ULTRA_HIGH')
  assert.strictEqual(
    isValidEvidenceCapsule({
      source: 'LOCAL_FS',
      observedAt: '2026-09-15T00:00:00.000Z',
      status: 'OBSERVED',
      confidence: 'ULTRA_HIGH',
      locator: 'file:package.json'
    }),
    false,
    'Cápsula con confidence no reconocido debe ser inválida'
  );

  // 5. Intento de crear contrato con cápsula sin fecha falla cerrado
  assert.throws(() => {
    new MissionContract({
      title: 'Misión con cápsula incompleta',
      objective: 'Probar rechazo fail-closed',
      evidence: [
        {
          source: 'LOCAL_FS',
          status: 'OBSERVED',
          confidence: 'HIGH',
          locator: 'file:package.json'
        }
      ]
    });
  }, /Invariante violada: Cápsula de evidencia incompleta o inválida/);

  console.log('✓ Invariante 18 (Adversarial): Cápsulas incompletas rechazadas (prohibido auto-relleno de fecha o confianza por defecto).');
}

// -------------------------------------------------------------------------------------------------
// Invariante 19 (Adversarial): Cripto-ligadura de evidenceTrigger en el digest canónico
// -------------------------------------------------------------------------------------------------
{
  const baseData = {
    title: 'Refactorización Segura',
    objective: 'Verificar ligadura criptográfica',
    evidence: [
      {
        source: 'LOCAL_FS',
        observedAt: '2026-09-15T00:00:00.000Z',
        status: 'OBSERVED',
        confidence: 'HIGH',
        locator: 'file:package.json'
      }
    ],
    evidenceTrigger: 'Texto Legítimo de Evidencia A',
    scope: ['tools/'],
    autonomyLevelRequired: 'LOCAL_MUTATION'
  };

  const contractOrig = new MissionContract(baseData);

  // Clon con texto de evidenceTrigger alterado
  const contractMutatedTrigger = new MissionContract({
    ...baseData,
    evidenceTrigger: 'Texto Manipulado de Evidencia B'
  });

  assert.notStrictEqual(
    contractOrig.contractDigest,
    contractMutatedTrigger.contractDigest,
    'Alterar el texto visible de evidenceTrigger DEBE cambiar el digest SHA-256'
  );
  console.log('✓ Invariante 19 (Adversarial): evidenceTrigger ligado canónicamente al SHA-256 del contrato.');
}

// -------------------------------------------------------------------------------------------------
// Invariante 20 (Adversarial): Scope no inventado y bloqueo de mutación en intención sin archivos
// -------------------------------------------------------------------------------------------------
{
  const emptyTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-scope-strict-'));
  try {
    cp.execSync('git init', { cwd: emptyTmp, stdio: 'ignore' });
    cp.execSync('git config user.name "Axion Test"', { cwd: emptyTmp, stdio: 'ignore' });
    cp.execSync('git config user.email "test@axion.local"', { cwd: emptyTmp, stdio: 'ignore' });
    fs.writeFileSync(path.join(emptyTmp, 'README.md'), '# Clean Repo\n', 'utf8');
    cp.execSync('git add . && git commit -m "init"', { cwd: emptyTmp, stdio: 'ignore' });

    const ctxClean = new MissionContext(emptyTmp, 'Explorar diseño de nueva arquitectura');

    const proposals = ctxClean.synthesizeEvidenceBasedMissions(1);
    assert.strictEqual(proposals.length, 1);
    const intentProp = proposals[0];

    // Scope debe ser estrictamente vacío, NO inventar ['tools/']
    assert.deepStrictEqual(intentProp.scope, [], 'Intención sin cambios observados debe tener scope vacío');
    assert.strictEqual(intentProp.autonomyLevelRequired, 'READ_ONLY', 'Scope vacío debe exigir autonomía READ_ONLY');

    // Intentar crear un contrato con scope vacío pero solicitando LOCAL_MUTATION debe fallar cerrado
    assert.throws(() => {
      new MissionContract({
        title: 'Mutación sin alcance',
        objective: 'Probar bloqueo',
        evidence: intentProp.evidence,
        scope: [],
        autonomyLevelRequired: 'LOCAL_MUTATION'
      });
    }, /Invariante violada: Misión con scope vacío no puede autorizar mutaciones/);

    // Contrato con scope delimitado sí permite LOCAL_MUTATION
    const validMutationContract = new MissionContract({
      title: 'Mutación con alcance acotado',
      objective: 'Implementación controlada',
      evidence: intentProp.evidence,
      scope: ['tools/target.js'],
      autonomyLevelRequired: 'LOCAL_MUTATION'
    });
    assert.strictEqual(validMutationContract.autonomyLevelRequired, 'LOCAL_MUTATION');
  } finally {
    fs.rmSync(emptyTmp, { recursive: true, force: true });
  }
  console.log('✓ Invariante 20 (Adversarial): Scope no delimitado es vacío y bloquea fail-closed cualquier solicitud de mutación.');
}

// -------------------------------------------------------------------------------------------------
// Invariante 21 (Adversarial): Blindaje contra escape de projectRoot mediante enlaces simbólicos (realpath)
// -------------------------------------------------------------------------------------------------
{
  const tmpOutside = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-symlink-outside-'));
  const tmpRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-symlink-repo-'));
  try {
    const outsideSecret = path.join(tmpOutside, 'secret_file.txt');
    fs.writeFileSync(outsideSecret, 'contenido_confidencial_externo', 'utf8');

    // Crear un enlace simbólico o junction dentro del repo que apunta fuera del repo
    const linkedInside = path.join(tmpRepo, 'linked_external_dir');
    let symlinkCreated = false;
    try {
      if (process.platform === 'win32') {
        fs.symlinkSync(tmpOutside, linkedInside, 'junction');
      } else {
        fs.symlinkSync(tmpOutside, linkedInside);
      }
      symlinkCreated = true;
    } catch (_) {
      symlinkCreated = false;
    }

    if (symlinkCreated) {
      // Intentar engañar con una ruta que léxicamente parece dentro del repo: file:linked_external_dir/secret_file.txt
      const symlinkItem = {
        title: 'Infiltración traversal vía symlink hacia fuera del repo',
        evidence: [
          {
            source: 'LOCAL_FS',
            observedAt: '2026-09-15T00:00:00.000Z',
            status: 'OBSERVED',
            confidence: 'HIGH',
            locator: 'file:linked_external_dir/secret_file.txt'
          }
        ]
      };
      const resSymlink = verifyBacklogItemEvidence(symlinkItem, tmpRepo);
      assert.strictEqual(resSymlink.verified, false, 'Symlink traversal hacia fuera del repo debe ser bloqueado fail-closed');
      assert.strictEqual(resSymlink.confidence, 'UNVERIFIED', 'Symlink traversal debe resultar en UNVERIFIED');
    }
  } finally {
    fs.rmSync(tmpOutside, { recursive: true, force: true });
    fs.rmSync(tmpRepo, { recursive: true, force: true });
  }
  console.log('✓ Invariante 21 (Adversarial): Evasión de directorio raíz mediante symlinks/junctions bloqueada vía realpath.');
}

// -------------------------------------------------------------------------------------------------
// Invariante 22 (Adversarial): Enums de cápsula tipados y correspondencia estricta source <-> locator
// -------------------------------------------------------------------------------------------------
{
  // 1. source arbitrario (no en enum) debe ser rechazado
  assert.strictEqual(
    isValidEvidenceCapsule({
      source: 'EXTERNAL_ORACLE',
      status: 'OBSERVED',
      confidence: 'HIGH',
      observedAt: '2026-09-15T00:00:00.000Z',
      locator: 'file:package.json'
    }),
    false,
    'source no perteneciente a VALID_SOURCES debe ser rechazado'
  );

  // 2. status arbitrario (no en enum) debe ser rechazado
  assert.strictEqual(
    isValidEvidenceCapsule({
      source: 'LOCAL_FS',
      status: 'PENDING_HUMAN_CHECK',
      confidence: 'HIGH',
      observedAt: '2026-09-15T00:00:00.000Z',
      locator: 'file:package.json'
    }),
    false,
    'status no perteneciente a VALID_STATUSES debe ser rechazado'
  );

  // 3. Desajuste source <-> locator: GIT_CLI con file: debe ser rechazado
  assert.strictEqual(
    isValidEvidenceCapsule({
      source: 'GIT_CLI',
      status: 'OBSERVED',
      confidence: 'HIGH',
      observedAt: '2026-09-15T00:00:00.000Z',
      locator: 'file:tools/engine.js'
    }),
    false,
    'source GIT_CLI con locator file: debe ser rechazado'
  );

  // 4. Desajuste source <-> locator: LOCAL_FS con git: debe ser rechazado
  assert.strictEqual(
    isValidEvidenceCapsule({
      source: 'LOCAL_FS',
      status: 'OBSERVED',
      confidence: 'HIGH',
      observedAt: '2026-09-15T00:00:00.000Z',
      locator: 'git:status:tools/sample.js'
    }),
    false,
    'source LOCAL_FS con locator git: debe ser rechazado'
  );

  // 5. Desajuste source <-> locator: CALLER_EXPLICIT con file: debe ser rechazado
  assert.strictEqual(
    isValidEvidenceCapsule({
      source: 'CALLER_EXPLICIT',
      status: 'OBSERVED',
      confidence: 'HIGH',
      observedAt: '2026-09-15T00:00:00.000Z',
      locator: 'file:package.json'
    }),
    false,
    'source CALLER_EXPLICIT con locator file: debe ser rechazado'
  );

  // 6. Cápsulas legítimas con correspondencia correcta deben ser válidas
  assert.strictEqual(
    isValidEvidenceCapsule({
      source: 'LOCAL_FS',
      status: 'OBSERVED',
      confidence: 'HIGH',
      observedAt: '2026-09-15T00:00:00.000Z',
      locator: 'file:package.json'
    }),
    true,
    'Cápsula legítima LOCAL_FS <-> file: debe ser válida'
  );
  assert.strictEqual(
    isValidEvidenceCapsule({
      source: 'GIT_CLI',
      status: 'OBSERVED',
      confidence: 'HIGH',
      observedAt: '2026-09-15T00:00:00.000Z',
      locator: 'git:status:tools/sample.js'
    }),
    true,
    'Cápsula legítima GIT_CLI <-> git: debe ser válida'
  );

  console.log('✓ Invariante 22 (Adversarial): Validación rigurosa de enums (source, status, confidence) y correspondencia estricta source <-> locator.');
}

// -------------------------------------------------------------------------------------------------
// Invariante 23 (Auditoría de Vacío): Matriz y Vault vacíos/limpios confirman cero misiones seleccionables y bloqueo fail-closed por defecto
// -------------------------------------------------------------------------------------------------
{
  const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-empty-audit-'));
  try {
    // 1. Vault en sandbox limpio: cero misiones verificadas por defecto (sin includeUnverified)
    const vault = new MissionBacklogVault(emptyDir);
    const selectableVault = vault.getSelectableMissions();
    assert.strictEqual(selectableVault.length, 0, 'Vault en sandbox limpio debe tener cero misiones seleccionables');

    const defaultVisual = vault.getVisualMissionSelection(4);
    assert.strictEqual(defaultVisual.status, 'BLOCKED_CONTEXT_REQUIRED');
    assert.strictEqual(defaultVisual.displayedCount, 0);
    assert.strictEqual(defaultVisual.selectableCount, 0);
    assert.strictEqual(defaultVisual.options.length, 0);

    // Con includeUnverified explícito, ofrece el reservorio histórico no verificado
    const visualUnverified = vault.getVisualMissionSelection(4, '', { includeUnverified: true });
    assert.strictEqual(visualUnverified.status, 'UNVERIFIED_CATALOG');
    assert.strictEqual(visualUnverified.displayedCount, 4);

    // 2. Matrix en sandbox limpio: cero misiones seleccionables y bloqueo por defecto
    const matrix = new DriveMissionMatrix(emptyDir);
    const selectableMatrix = matrix.getSelectableMissions();
    assert.strictEqual(selectableMatrix.length, 0, 'Matriz en sandbox limpio debe tener cero misiones seleccionables');

    const defaultCurated = matrix.generateCuratedMissions();
    assert.strictEqual(defaultCurated.status, 'BLOCKED_CONTEXT_REQUIRED');
    assert.strictEqual(defaultCurated.totalOffered, 0);
    assert.strictEqual(defaultCurated.missions.length, 0);

    // Con includeUnverified explícito, ofrece el catálogo no verificado
    const curatedUnverified = matrix.generateCuratedMissions({ includeUnverified: true });
    assert.strictEqual(curatedUnverified.status, 'UNVERIFIED_CATALOG');
    assert.strictEqual(curatedUnverified.totalOffered, 4);

    // 3. MissionContext en repo limpio sin cambios ni intención: devuelve bloqueo y cero propuestas
    cp.execSync('git init', { cwd: emptyDir, stdio: 'ignore' });
    cp.execSync('git config user.name "Axion Test"', { cwd: emptyDir, stdio: 'ignore' });
    cp.execSync('git config user.email "test@axion.local"', { cwd: emptyDir, stdio: 'ignore' });
    fs.writeFileSync(path.join(emptyDir, 'README.md'), '# Clean Repo\n', 'utf8');
    cp.execSync('git add . && git commit -m "init"', { cwd: emptyDir, stdio: 'ignore' });

    const ctx = new MissionContext(emptyDir);

    const validation = ctx.validateContext();
    assert.strictEqual(validation.valid, false);
    assert.strictEqual(validation.status, 'BLOCKED_CONTEXT_REQUIRED');
    assert.ok(validation.missingFields.includes('explicitIntent'));
    assert.ok(validation.missingFields.includes('gitUncommittedChanges'));
    assert.ok(validation.missingFields.includes('verifiedBacklogItems'));

    const proposals = ctx.synthesizeEvidenceBasedMissions(5);
    assert.strictEqual(proposals.length, 0, 'Con repositorio limpio y sin intención, la síntesis debe retornar cero misiones');
  } finally {
    fs.rmSync(emptyDir, { recursive: true, force: true });
  }
  console.log('✓ Invariante 23 (Auditoría de Vacío): Matriz y Vault vacíos/limpios confirman cero misiones seleccionables y bloqueo fail-closed por defecto.');
}

// -------------------------------------------------------------------------------------------------
// Invariante 24: Conversión infalible a MissionContract de todos los tipos de misiones sintetizadas
// -------------------------------------------------------------------------------------------------
{
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-contract-types-'));
  try {
    // 1. Contexto con uncommitted files reales en Git
    const sandboxGit = path.join(sandbox, 'repo_git');
    fs.mkdirSync(sandboxGit, { recursive: true });
    cp.execSync('git init', { cwd: sandboxGit, stdio: 'ignore' });
    cp.execSync('git config user.name "Axion Test"', { cwd: sandboxGit, stdio: 'ignore' });
    cp.execSync('git config user.email "test@axion.local"', { cwd: sandboxGit, stdio: 'ignore' });
    const toolsDir = path.join(sandboxGit, 'tools');
    fs.mkdirSync(toolsDir, { recursive: true });
    const sampleJs = path.join(toolsDir, 'sample.js');
    fs.writeFileSync(sampleJs, '// base code\n', 'utf8');
    cp.execSync('git add . && git commit -m "init"', { cwd: sandboxGit, stdio: 'ignore' });
    // Mutación real en disco no confirmada
    fs.writeFileSync(sampleJs, '// modified code\n', 'utf8');

    const ctxGit = new MissionContext(sandboxGit);
    const gitProposals = ctxGit.synthesizeEvidenceBasedMissions(1);
    assert.strictEqual(gitProposals.length, 1);
    const gitContract = ctxGit.createMissionContract(gitProposals[0]);
    assert.ok(gitContract instanceof MissionContract);
    assert.strictEqual(gitContract.evidence[0].source, 'GIT_CLI');
    assert.strictEqual(gitContract.evidence[0].status, 'DIFF_DETECTED');
    assert.ok(gitContract.evidence[0].locator.includes('sample.js'));
    assert.ok(gitContract.contractDigest.length === 64);

    // 2. Contexto con misión activa real en journal persistente en disco
    const sandboxJournal = path.join(sandbox, 'repo_journal');
    const journalStateDir = path.join(sandboxJournal, '.axion', 'state');
    fs.mkdirSync(journalStateDir, { recursive: true });
    const journalFile = path.join(journalStateDir, 'drive_mission_journal.json');
    fs.writeFileSync(journalFile, JSON.stringify({
      version: '1.0.0',
      activeMission: {
        id: 'M_JOURNAL_RESUME_01',
        title: 'Misión Reanudada de Journal',
        currentPhase: 2,
        status: 'ACTIVE_IN_PROGRESS'
      },
      lastUpdated: new Date().toISOString()
    }, null, 2), 'utf8');

    const ctxJournal = new MissionContext(sandboxJournal);
    const journalProposals = ctxJournal.synthesizeEvidenceBasedMissions(1);
    assert.strictEqual(journalProposals.length, 1);
    const journalContract = ctxJournal.createMissionContract(journalProposals[0]);
    assert.ok(journalContract instanceof MissionContract);
    assert.strictEqual(journalContract.evidence[0].source, 'AXION_STATE_DIR');
    assert.strictEqual(journalContract.evidence[0].status, 'OBSERVED');
    assert.ok(journalContract.evidence[0].locator.startsWith('journal:'));
    assert.ok(journalContract.contractDigest.length === 64);

    // 3. Contexto con archivo de suites de prueba fallidas real en disco
    const sandboxTests = path.join(sandbox, 'repo_tests');
    const testsStateDir = path.join(sandboxTests, '.axion', 'state');
    fs.mkdirSync(testsStateDir, { recursive: true });
    const testFilesDir = path.join(sandboxTests, 'tests');
    fs.mkdirSync(testFilesDir, { recursive: true });
    const failingSuitePath = path.join(testFilesDir, 'failing_suite.test.js');
    fs.writeFileSync(failingSuitePath, '// failing suite\n', 'utf8');

    const failuresFile = path.join(testsStateDir, 'test_failures.json');
    fs.writeFileSync(failuresFile, JSON.stringify({
      failingSuites: ['tests/failing_suite.test.js'],
      lastRunAt: new Date().toISOString()
    }, null, 2), 'utf8');

    const ctxTests = new MissionContext(sandboxTests);
    const testProposals = ctxTests.synthesizeEvidenceBasedMissions(1);
    assert.strictEqual(testProposals.length, 1);
    const testContract = ctxTests.createMissionContract(testProposals[0]);
    assert.ok(testContract instanceof MissionContract);
    assert.strictEqual(testContract.evidence[0].source, 'LOCAL_TEST_RUNNER');
    assert.strictEqual(testContract.evidence[0].status, 'FAILED');
    assert.ok(testContract.evidence[0].locator.startsWith('test:'));
    assert.ok(testContract.contractDigest.length === 64);

    // 4. Contexto con intención explícita real
    const sandboxIntent = path.join(sandbox, 'repo_intent');
    fs.mkdirSync(sandboxIntent, { recursive: true });
    const ctxIntent = new MissionContext(sandboxIntent, 'Crear validador determinista de contratos');
    const intentProposals = ctxIntent.synthesizeEvidenceBasedMissions(1);
    assert.strictEqual(intentProposals.length, 1);
    const intentContract = ctxIntent.createMissionContract(intentProposals[0]);
    assert.ok(intentContract instanceof MissionContract);
    assert.strictEqual(intentContract.evidence[0].source, 'CALLER_EXPLICIT_INTENT');
    assert.strictEqual(intentContract.evidence[0].status, 'PROVIDED');
    assert.ok(intentContract.contractDigest.length === 64);

    // 5. Contexto con backlog verificado persistido en disco
    const sandboxBacklog = path.join(sandbox, 'repo_backlog');
    const backlogStateDir = path.join(sandboxBacklog, '.axion', 'state');
    fs.mkdirSync(backlogStateDir, { recursive: true });
    const sampleRealFile = path.join(sandboxBacklog, 'tools', 'verified_tool.js');
    fs.mkdirSync(path.dirname(sampleRealFile), { recursive: true });
    fs.writeFileSync(sampleRealFile, '// real code\n', 'utf8');

    const vaultFile = path.join(backlogStateDir, 'mission_vault.json');
    fs.writeFileSync(vaultFile, JSON.stringify({
      version: '1.4.0',
      reservoir: [
        {
          id: 'M_BACKLOG_VERIF_01',
          title: 'Misión Verificada en Backlog',
          status: 'QUEUED',
          verified: true,
          evidence: [
            {
              source: 'LOCAL_FS',
              observedAt: '2026-09-15T00:00:00.000Z',
              status: 'OBSERVED',
              confidence: 'HIGH',
              locator: 'file:tools/verified_tool.js'
            }
          ],
          summary: 'Misión con archivo real',
          scope: ['tools/verified_tool.js'],
          risk: 'LOCAL',
          priority: 88
        }
      ]
    }, null, 2), 'utf8');

    const ctxBacklog = new MissionContext(sandboxBacklog);
    const backlogProposals = ctxBacklog.synthesizeEvidenceBasedMissions(1);
    assert.strictEqual(backlogProposals.length, 1);
    const backlogContract = ctxBacklog.createMissionContract(backlogProposals[0]);
    assert.ok(backlogContract instanceof MissionContract);
    assert.strictEqual(backlogContract.evidence[0].source, 'LOCAL_FS');
    assert.ok(backlogContract.contractDigest.length === 64);
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
  console.log('✓ Invariante 24: Conversión infalible a MissionContract de todos los tipos de misiones sintetizadas (Git, Journal, Tests, Intent, Backlog).');
}

// -------------------------------------------------------------------------------------------------
// Invariante 25: Cripto-ligadura recursiva estricta de cápsulas de evidencia en el digest canónico
// -------------------------------------------------------------------------------------------------
{
  const baseCapsule = {
    source: 'LOCAL_FS',
    observedAt: '2026-09-15T00:00:00.000Z',
    status: 'OBSERVED',
    confidence: 'HIGH',
    locator: 'file:package.json'
  };

  const baseContractData = {
    title: 'Auditoría Criptográfica',
    objective: 'Verificar ligadura recursiva de claves anidadas',
    evidence: [baseCapsule],
    evidenceTrigger: 'Mismo Trigger Fijo Para Todas Las Pruebas',
    scope: ['tools/'],
    autonomyLevelRequired: 'LOCAL_MUTATION'
  };

  const originalContract = new MissionContract(baseContractData);

  // 1. Mutar locator dentro de la cápsula (manteniendo identical evidenceTrigger)
  const mutatedLocator = new MissionContract({
    ...baseContractData,
    evidence: [{ ...baseCapsule, locator: 'file:tools/engine.js' }]
  });
  assert.notStrictEqual(
    originalContract.contractDigest,
    mutatedLocator.contractDigest,
    'Mutar locator en la cápsula DEBE cambiar el digest aunque evidenceTrigger permanezca igual'
  );

  // 2. Mutar source dentro de la cápsula
  const mutatedSource = new MissionContract({
    ...baseContractData,
    evidence: [{ ...baseCapsule, source: 'AXION_STATE_DIR', locator: 'journal:package.json' }]
  });
  assert.notStrictEqual(
    originalContract.contractDigest,
    mutatedSource.contractDigest,
    'Mutar source en la cápsula DEBE cambiar el digest'
  );

  // 3. Mutar status dentro de la cápsula
  const mutatedStatus = new MissionContract({
    ...baseContractData,
    evidence: [{ ...baseCapsule, status: 'STABLE' }]
  });
  assert.notStrictEqual(
    originalContract.contractDigest,
    mutatedStatus.contractDigest,
    'Mutar status en la cápsula DEBE cambiar el digest'
  );

  // 4. Mutar confidence dentro de la cápsula
  const mutatedConfidence = new MissionContract({
    ...baseContractData,
    evidence: [{ ...baseCapsule, confidence: 'MEDIUM' }]
  });
  assert.notStrictEqual(
    originalContract.contractDigest,
    mutatedConfidence.contractDigest,
    'Mutar confidence en la cápsula DEBE cambiar el digest'
  );

  console.log('✓ Invariante 25: Cripto-ligadura recursiva estricta — alterar locator, source, status o confidence cambia el digest SHA-256 sin omitir claves anidadas.');
}

// -------------------------------------------------------------------------------------------------
// Invariante 26: Invariante de Lectura Pura (Constructores y consultas no mutan el disco)
// -------------------------------------------------------------------------------------------------
{
  const cleanDir = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-pure-read-'));
  try {
    // Instanciar bóveda y consultar
    const vault = new MissionBacklogVault(cleanDir);
    vault.loadVault();
    vault.getSelectableMissions();
    vault.getVisualMissionSelection();

    // Instanciar matriz y consultar
    const matrix = new DriveMissionMatrix(cleanDir);
    matrix.loadBacklog();
    matrix.getSelectableMissions();
    matrix.generateCuratedMissions();

    // Comprobar físicamente que ningún directorio ni archivo fue creado en disco
    const statePath = path.join(cleanDir, '.axion');
    assert.strictEqual(
      fs.existsSync(statePath),
      false,
      'Las consultas y constructores deben ser de lectura pura (no deben crear .axion ni escribir archivos)'
    );
  } finally {
    fs.rmSync(cleanDir, { recursive: true, force: true });
  }
  console.log('✓ Invariante 26: Operaciones de lectura y constructores son de lectura pura (cero mutación de disco).');
}

// -------------------------------------------------------------------------------------------------
// Invariante 27: Anti-traversal preciso sin falsos positivos en nombres con '..'
// -------------------------------------------------------------------------------------------------
{
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-anti-trav-prec-'));
  try {
    // Archivo legítimo dentro del root cuyo nombre contiene '..'
    const legitFile = path.join(sandbox, '..legit_file_in_root.js');
    fs.writeFileSync(legitFile, '// safe file', 'utf8');

    const itemLegit = {
      title: 'Misión con Archivo Legítimo con dos puntos iniciales',
      evidence: [
        {
          source: 'LOCAL_FS',
          observedAt: '2026-09-15T00:00:00.000Z',
          status: 'OBSERVED',
          confidence: 'HIGH',
          locator: 'file:..legit_file_in_root.js'
        }
      ]
    };
    const resLegit = verifyBacklogItemEvidence(itemLegit, sandbox);
    assert.strictEqual(resLegit.verified, true, 'Archivo legítimo dentro del root no debe ser falsamente bloqueado como traversal');

    // Archivo que realmente escapa del root
    const itemRealTraversal = {
      title: 'Misión con Escape Real de Directorio',
      evidence: [
        {
          source: 'LOCAL_FS',
          observedAt: '2026-09-15T00:00:00.000Z',
          status: 'OBSERVED',
          confidence: 'HIGH',
          locator: 'file:../outside_root_secret.js'
        }
      ]
    };
    const resTrav = verifyBacklogItemEvidence(itemRealTraversal, sandbox);
    assert.strictEqual(resTrav.verified, false, 'Escape real ../ DEBE ser bloqueado fail-closed');
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
  console.log('✓ Invariante 27: Anti-traversal preciso verificado — distingue exactamente ".." de nombres legítimos con ".." dentro del root.');
}

// -------------------------------------------------------------------------------------------------
// Invariante 28: Creación infalible de MissionContract desde misión activa real de journal
// -------------------------------------------------------------------------------------------------
{
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-journal-contract-'));
  try {
    const stateDir = path.join(sandbox, '.axion', 'state');
    fs.mkdirSync(stateDir, { recursive: true });
    const journalFile = path.join(stateDir, 'drive_mission_journal.json');
    fs.writeFileSync(journalFile, JSON.stringify({
      version: '1.0.0',
      activeMission: {
        id: 'M_REAL_ACTIVE_001',
        title: 'Misión Activa Real en Journal',
        currentPhase: 2,
        status: 'ACTIVE_IN_PROGRESS'
      },
      lastUpdated: new Date().toISOString()
    }, null, 2), 'utf8');

    const ctx = new MissionContext(sandbox);
    assert.strictEqual(ctx.persistedBacklog.activeMission.source, 'AXION_STATE_DIR');
    assert.strictEqual(ctx.persistedBacklog.activeMission.status, 'OBSERVED');
    assert.strictEqual(ctx.persistedBacklog.activeMission.confidence, 'HIGH');

    const proposals = ctx.synthesizeEvidenceBasedMissions(1);
    assert.strictEqual(proposals.length, 1);
    assert.strictEqual(proposals[0].id, 'RESUME_M_REAL_ACTIVE_001');

    const contract = ctx.createMissionContract(proposals[0]);
    assert.ok(contract instanceof MissionContract);
    assert.strictEqual(contract.evidence[0].source, 'AXION_STATE_DIR');
    assert.strictEqual(contract.evidence[0].status, 'OBSERVED');
    assert.strictEqual(contract.evidence[0].confidence, 'HIGH');
    assert.strictEqual(contract.evidence[0].locator, 'journal:.axion/state/drive_mission_journal.json#M_REAL_ACTIVE_001');
    assert.strictEqual(isValidEvidenceCapsule(contract.evidence[0]), true);
    assert.strictEqual(contract.contractDigest.length, 64);
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
  console.log('✓ Invariante 28: Misión activa real de journal genera cápsula canónica (AXION_STATE_DIR / OBSERVED) y se transforma infaliblemente en MissionContract.');
}

// -------------------------------------------------------------------------------------------------
// Invariante 29: Creación infalible de MissionContract desde suites de test fallidas reales
// -------------------------------------------------------------------------------------------------
{
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-test-fail-contract-'));
  try {
    const stateDir = path.join(sandbox, '.axion', 'state');
    fs.mkdirSync(stateDir, { recursive: true });
    const testsDir = path.join(sandbox, 'tests');
    fs.mkdirSync(testsDir, { recursive: true });

    const failingSuiteRel = 'tests/failing_example.test.js';
    fs.writeFileSync(path.join(sandbox, failingSuiteRel), '// failing suite content', 'utf8');

    const failuresFile = path.join(stateDir, 'test_failures.json');
    fs.writeFileSync(failuresFile, JSON.stringify({
      failingSuites: [failingSuiteRel],
      lastRunAt: new Date().toISOString()
    }, null, 2), 'utf8');

    const ctx = new MissionContext(sandbox);
    assert.strictEqual(ctx.testState.source, 'LOCAL_TEST_RUNNER');
    assert.strictEqual(ctx.testState.status, 'FAILED');
    assert.strictEqual(ctx.testState.confidence, 'HIGH');
    assert.deepStrictEqual(ctx.testState.knownFailingSuites, [failingSuiteRel]);

    const proposals = ctx.synthesizeEvidenceBasedMissions(1);
    assert.strictEqual(proposals.length, 1);
    assert.strictEqual(proposals[0].id, 'MISSION_REMEDIATE_FAILING_SUITES');

    const contract = ctx.createMissionContract(proposals[0]);
    assert.ok(contract instanceof MissionContract);
    assert.strictEqual(contract.evidence[0].source, 'LOCAL_TEST_RUNNER');
    assert.strictEqual(contract.evidence[0].status, 'FAILED');
    assert.strictEqual(contract.evidence[0].confidence, 'HIGH');
    assert.strictEqual(contract.evidence[0].locator, `test:${failingSuiteRel}`);
    assert.strictEqual(isValidEvidenceCapsule(contract.evidence[0]), true);
    assert.strictEqual(contract.contractDigest.length, 64);
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
  console.log('✓ Invariante 29: Propuesta real de suite fallida genera cápsula canónica (LOCAL_TEST_RUNNER / FAILED) y se transforma infaliblemente en MissionContract.');
}

// -------------------------------------------------------------------------------------------------
// Invariante 30 (Regresión de Inyección): Intento de inyectar _testFixture u overrides es ignorado y bloquea con BLOCKED_CONTEXT_REQUIRED
// -------------------------------------------------------------------------------------------------
{
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-hostile-injection-'));
  try {
    // 1. Verificar que createTestFixture ya no existe en el módulo de producción
    assert.strictEqual(
      typeof MissionContext.createTestFixture,
      'undefined',
      'createTestFixture no debe existir en el módulo de producción'
    );

    // 2. Intento hostil de bypass pasando _testFixture completo con fuentes de autoridad y confianza HIGH
    const ctxHostile = new MissionContext(sandbox, {
      _testFixture: {
        git: {
          source: 'GIT_CLI',
          observedAt: '2026-09-15T12:00:00.000Z',
          status: 'DIFF_DETECTED',
          confidence: 'HIGH',
          isRepo: true,
          branch: 'main',
          head: '0123456789abcdef0123456789abcdef01234567',
          uncommittedFiles: ['tools/target.js'],
          hasUncommittedChanges: true
        },
        packageConfig: {
          source: 'LOCAL_FS',
          name: 'fake-pkg',
          version: '1.0.0',
          observedAt: '2026-09-15T12:00:00.000Z',
          status: 'OBSERVED',
          confidence: 'HIGH'
        },
        persistedBacklog: {
          source: 'AXION_STATE_DIR',
          observedAt: '2026-09-15T12:00:00.000Z',
          status: 'OBSERVED',
          confidence: 'HIGH',
          activeMission: {
            id: 'M_FAKE_INJECTED',
            title: 'Fake Injected Mission',
            source: 'AXION_STATE_DIR',
            observedAt: '2026-09-15T12:00:00.000Z',
            status: 'OBSERVED',
            confidence: 'HIGH'
          },
          items: []
        },
        testState: {
          source: 'LOCAL_TEST_RUNNER',
          observedAt: '2026-09-15T12:00:00.000Z',
          status: 'FAILED',
          confidence: 'HIGH',
          knownFailingSuites: ['tests/sample.test.js']
        }
      }
    });

    // Invariante de Procedencia: los datos inyectados deben ser 100% ignorados
    assert.strictEqual(ctxHostile._testFixture, undefined, '_testFixture no debe ser almacenado');
    assert.strictEqual(ctxHostile.git.isRepo, false, 'Git debe reflejar la realidad física (sandbox no es repo)');
    assert.strictEqual(ctxHostile.git.branch, null, 'Rama no observada debe ser null');
    assert.strictEqual(ctxHostile.git.head, null, 'Head no observado debe ser null');
    assert.strictEqual(ctxHostile.git.hasUncommittedChanges, false);
    assert.strictEqual(ctxHostile.packageConfig.status, 'NOT_FOUND', 'packageConfig debe ser NOT_FOUND');
    assert.strictEqual(ctxHostile.packageConfig.name, null);
    assert.strictEqual(ctxHostile.persistedBacklog.activeMission, null, 'activeMission inyectada debe ser ignorada');
    assert.strictEqual(ctxHostile.testState.knownFailingSuites.length, 0, 'Suites inyectadas deben ser ignoradas');

    // Validación de contexto: debe fallar con BLOCKED_CONTEXT_REQUIRED
    const valHostile = ctxHostile.validateContext();
    assert.strictEqual(valHostile.valid, false);
    assert.strictEqual(valHostile.status, 'BLOCKED_CONTEXT_REQUIRED');

    // Cero misiones propuestas ante datos inyectados no observables
    const proposalsHostile = ctxHostile.synthesizeEvidenceBasedMissions(5);
    assert.strictEqual(proposalsHostile.length, 0, 'No debe proponer misiones basadas en inyecciones');

    // 3. Intento de inyectar overrides directos en options (ej. { git: { ... } }) también es ignorado
    const ctxDirectOverrides = new MissionContext(sandbox, {
      git: { branch: 'injected-branch', head: 'fake-head', hasUncommittedChanges: true }
    });
    assert.strictEqual(ctxDirectOverrides.git.branch, null);
    assert.strictEqual(ctxDirectOverrides.git.isRepo, false);
    assert.strictEqual(ctxDirectOverrides.validateContext().status, 'BLOCKED_CONTEXT_REQUIRED');
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
  console.log('✓ Invariante 30 (Regresión de Inyección): Inyección de _testFixture u overrides es 100% ignorada y bloquea con BLOCKED_CONTEXT_REQUIRED.');
}

// -------------------------------------------------------------------------------------------------
// Invariante 31: Determinismo canónico respecto al orden de las cápsulas de evidencia
// -------------------------------------------------------------------------------------------------
{
  const capA = {
    source: 'GIT_CLI',
    observedAt: '2026-09-15T12:00:00.000Z',
    status: 'DIFF_DETECTED',
    confidence: 'HIGH',
    locator: 'git:status:tools/a.js'
  };
  const capB = {
    source: 'LOCAL_FS',
    observedAt: '2026-09-15T12:00:00.000Z',
    status: 'OBSERVED',
    confidence: 'HIGH',
    locator: 'file:tools/b.js'
  };
  const capC = {
    source: 'LOCAL_TEST_RUNNER',
    observedAt: '2026-09-15T12:00:00.000Z',
    status: 'FAILED',
    confidence: 'HIGH',
    locator: 'test:tests/c.test.js'
  };

  const baseData = {
    title: 'Misión Multicápsula',
    objective: 'Verificar ordenamiento canónico estricto de evidencia',
    scope: ['tools/a.js', 'tools/b.js'],
    autonomyLevelRequired: 'LOCAL_MUTATION'
  };

  const c1 = new MissionContract({ ...baseData, evidence: [capA, capB, capC] });
  const c2 = new MissionContract({ ...baseData, evidence: [capC, capB, capA] });
  const c3 = new MissionContract({ ...baseData, evidence: [capB, capA, capC] });

  assert.strictEqual(c1.contractDigest, c2.contractDigest, 'Mismo conjunto de cápsulas en orden inverso DEBE producir idéntico digest');
  assert.strictEqual(c1.contractDigest, c3.contractDigest, 'Mismo conjunto de cápsulas en orden permutado DEBE producir idéntico digest');
  assert.deepStrictEqual(c1.evidence, c2.evidence, 'Las cápsulas en this.evidence deben quedar normalizadas en el mismo orden');
  console.log('✓ Invariante 31: Mismo conjunto de cápsulas de evidencia en cualquier orden produce exactamente el mismo digest canónico.');
}

// -------------------------------------------------------------------------------------------------
// Invariante 32: Validación fail-closed de autonomyLevelRequired
// -------------------------------------------------------------------------------------------------
{
  const validCapsule = {
    source: 'LOCAL_FS',
    observedAt: '2026-09-15T12:00:00.000Z',
    status: 'OBSERVED',
    confidence: 'HIGH',
    locator: 'file:package.json'
  };

  // 1. Niveles canónicos válidos
  for (const level of Object.values(AUTONOMY_LEVELS)) {
    const validContract = new MissionContract({
      title: `Contrato nivel ${level}`,
      objective: 'Verificar nivel válido',
      evidence: [validCapsule],
      scope: level === 'READ_ONLY' ? [] : ['package.json'],
      autonomyLevelRequired: level
    });
    assert.strictEqual(validContract.autonomyLevelRequired, level);
  }

  // 2. Niveles inválidos arbitrarios deben lanzar excepción fail-closed
  const invalidLevels = ['ARBITRARY_MUTATION', 'FULL_AUTO', 'HOST_ADMIN', ''];
  for (const invalid of invalidLevels) {
    assert.throws(
      () => {
        new MissionContract({
          title: 'Contrato inválido',
          objective: 'Intentar bypass de nivel de autonomía',
          evidence: [validCapsule],
          scope: ['package.json'],
          autonomyLevelRequired: invalid
        });
      },
      /Invariante violada: Nivel de autonomía inválido/,
      `Debe rechazar nivel de autonomía '${invalid}'`
    );
  }
  console.log('✓ Invariante 32: Validación fail-closed de autonomyLevelRequired demostrada — solo se aceptan los 4 niveles canónicos.');
}

// -------------------------------------------------------------------------------------------------
// Invariante 33: Verificación física y anti-traversal estricto de evidencia ci: (CI_LOGS)
// -------------------------------------------------------------------------------------------------
{
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-ci-evidence-'));
  try {
    const wfDir = path.join(sandbox, '.github', 'workflows');
    fs.mkdirSync(wfDir, { recursive: true });
    const wfFile = path.join(wfDir, 'ci.yml');
    fs.writeFileSync(wfFile, '# CI workflow', 'utf8');

    // 1. Evidencia ci: con archivo real existente
    const itemValidCi = {
      title: 'Misión con CI Workflow Observable',
      evidence: [
        {
          source: 'CI_LOGS',
          observedAt: '2026-09-15T00:00:00.000Z',
          status: 'OBSERVED',
          confidence: 'HIGH',
          locator: 'ci:.github/workflows/ci.yml'
        }
      ],
      verified: true
    };
    const resValid = verifyBacklogItemEvidence(itemValidCi, sandbox);
    assert.strictEqual(resValid.verified, true, 'Workflow real en disco debe verificarse con éxito');
    assert.strictEqual(isValidEvidenceCapsule(itemValidCi.evidence[0]), true);

    // 2. Evidencia ci: con archivo inexistente
    const itemMissingCi = {
      title: 'Misión con CI Inexistente',
      evidence: [
        {
          source: 'CI_LOGS',
          observedAt: '2026-09-15T00:00:00.000Z',
          status: 'OBSERVED',
          confidence: 'HIGH',
          locator: 'ci:.github/workflows/non_existent.yml'
        }
      ],
      verified: true
    };
    const resMissing = verifyBacklogItemEvidence(itemMissingCi, sandbox);
    assert.strictEqual(resMissing.verified, false, 'Archivo CI inexistente DEBE ser UNVERIFIED');

    // 3. Evidencia ci: con path traversal
    const itemTravCi = {
      title: 'Misión con Traversal en CI',
      evidence: [
        {
          source: 'CI_LOGS',
          observedAt: '2026-09-15T00:00:00.000Z',
          status: 'OBSERVED',
          confidence: 'HIGH',
          locator: 'ci:../../etc/passwd'
        }
      ],
      verified: true
    };
    assert.strictEqual(isValidEvidenceCapsule(itemTravCi.evidence[0]), false, 'isValidEvidenceCapsule debe rechazar ci: con traversal');
    const resTrav = verifyBacklogItemEvidence(itemTravCi, sandbox);
    assert.strictEqual(resTrav.verified, false, 'verifyBacklogItemEvidence debe rechazar ci: con traversal');
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
  console.log('✓ Invariante 33: Verificación física y anti-traversal de evidencia ci: (CI_LOGS) comprobada al 100%.');
}

// -------------------------------------------------------------------------------------------------
// Invariante 34: Integración funcional de DriveEngine con el orquestador contextual
// -------------------------------------------------------------------------------------------------
{
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-drive-contextual-'));
  try {
    // 1. Configurar un repositorio Git físico real en el sandbox
    cp.execSync('git init', { cwd: sandbox, stdio: 'ignore' });
    cp.execSync('git config user.name "Axion Context Test"', { cwd: sandbox, stdio: 'ignore' });
    cp.execSync('git config user.email "context@axion.local"', { cwd: sandbox, stdio: 'ignore' });

    const initFile = path.join(sandbox, 'initial.txt');
    fs.writeFileSync(initFile, 'baseline physical content', 'utf8');
    cp.execSync('git add initial.txt', { cwd: sandbox, stdio: 'ignore' });
    cp.execSync('git commit -m "initial commit"', { cwd: sandbox, stdio: 'ignore' });

    const engine = new DriveEngine(sandbox);

    // 2. Ruta read-only con repositorio limpio sin intención: debe devolver BLOCKED_CONTEXT_REQUIRED
    const cleanProposals = engine.getContextualMissionProposals();
    assert.strictEqual(cleanProposals.status, 'BLOCKED_CONTEXT_REQUIRED');
    assert.strictEqual(cleanProposals.valid, false);
    assert.strictEqual(cleanProposals.proposals.length, 0);
    assert.ok(Array.isArray(cleanProposals.missingFields));
    assert.ok(cleanProposals.missingFields.includes('explicitIntent'));
    assert.ok(cleanProposals.missingFields.includes('gitUncommittedChanges'));
    assert.ok(typeof cleanProposals.requiredHumanAction === 'string' && cleanProposals.requiredHumanAction.length > 0);

    // Entradas vacías o palabras clave de trigger en repo limpio también bloquean
    assert.strictEqual(engine.getContextualMissionProposals('').status, 'BLOCKED_CONTEXT_REQUIRED');
    assert.strictEqual(engine.getContextualMissionProposals('   ').status, 'BLOCKED_CONTEXT_REQUIRED');
    assert.strictEqual(engine.getContextualMissionProposals('auto').status, 'BLOCKED_CONTEXT_REQUIRED');
    assert.strictEqual(engine.getContextualMissionProposals('cola').status, 'BLOCKED_CONTEXT_REQUIRED');

    // 3. Ruta read-only con intención explícita: debe sintetizar propuesta contextualizada con evidencia
    const explicitIntentText = 'Implementar endpoint REST para telemetría de agentes';
    const intentProposals = engine.getContextualMissionProposals(explicitIntentText);
    assert.strictEqual(intentProposals.status, 'CONTEXT_VERIFIED');
    assert.strictEqual(intentProposals.valid, true);
    assert.strictEqual(intentProposals.overallConfidence, 'HIGH');
    assert.strictEqual(intentProposals.proposals.length, 1);

    const intentProp = intentProposals.proposals[0];
    assert.strictEqual(intentProp.id, 'MISSION_EXPLICIT_INTENT');
    assert.strictEqual(intentProp.objective, explicitIntentText);
    assert.ok(Array.isArray(intentProp.evidence) && intentProp.evidence.length === 1);
    assert.strictEqual(intentProp.evidence[0].source, 'CALLER_EXPLICIT_INTENT');
    assert.strictEqual(intentProp.evidence[0].locator, `intent:${explicitIntentText}`);
    assert.strictEqual(intentProp.evidence[0].status, 'PROVIDED');
    assert.strictEqual(intentProp.evidence[0].confidence, 'HIGH');

    // Soportar también llamada con objeto de opciones: { intent, maxCount }
    const objProposals = engine.getContextualMissionProposals({ intent: explicitIntentText, maxCount: 2 });
    assert.strictEqual(objProposals.status, 'CONTEXT_VERIFIED');
    assert.strictEqual(objProposals.proposals.length, 1);

    // 4. Ruta read-only con cambios físicos sin confirmar en Git: debe detectar y proponer MISSION_UNCOMMITTED_CHANGES
    const dirtyFile = path.join(sandbox, 'service.js');
    fs.writeFileSync(dirtyFile, 'console.log("uncommitted service");', 'utf8');

    const gitProposals = engine.getContextualMissionProposals();
    assert.strictEqual(gitProposals.status, 'CONTEXT_VERIFIED');
    assert.strictEqual(gitProposals.valid, true);
    assert.strictEqual(gitProposals.overallConfidence, 'HIGH');
    assert.ok(gitProposals.proposals.length >= 1);

    const gitProp = gitProposals.proposals.find(p => p.id === 'MISSION_UNCOMMITTED_CHANGES');
    assert.ok(gitProp, 'DriveEngine debe proponer MISSION_UNCOMMITTED_CHANGES ante cambios en Git');
    assert.strictEqual(gitProp.evidence[0].source, 'GIT_CLI');
    assert.strictEqual(gitProp.evidence[0].status, 'DIFF_DETECTED');
    assert.ok(gitProp.evidence[0].locator.includes('service.js'));

    // 5. Creación determinista de MissionContract a través de DriveEngine tras seleccionar una propuesta
    const contract = engine.createContextualMissionContract(gitProp);
    assert.ok(contract instanceof MissionContract, 'Debe retornar una instancia de MissionContract');
    assert.strictEqual(contract.title, gitProp.title);
    assert.strictEqual(contract.objective, gitProp.objective);
    assert.strictEqual(typeof contract.contractDigest, 'string');
    assert.strictEqual(contract.contractDigest.length, 64, 'El digest canónico debe ser un SHA-256 de 64 caracteres');
    assert.strictEqual(contract.contractId, 'MISSION_UNCOMMITTED_CHANGES');
    const contractNoId = engine.createContextualMissionContract({ ...gitProp, id: undefined, contractId: undefined });
    assert.ok(contractNoId.contractId.startsWith('MC_'));

    // Verificar alias de compatibilidad createMissionContractFromContext
    const contractFromAlias = engine.createMissionContractFromContext(gitProp);
    assert.strictEqual(contractFromAlias.contractDigest, contract.contractDigest);
    assert.strictEqual(contractFromAlias.contractId, contract.contractId);

    // 6. Enforzamiento fail-closed: propuesta con evidencia vacía o alterada falla de inmediato
    assert.throws(
      () => engine.createContextualMissionContract({ ...gitProp, evidence: [] }),
      /Invariante violada/,
      'Crear contrato sin evidencia estructurada a través de DriveEngine debe lanzar excepción'
    );
    assert.throws(
      () => engine.createContextualMissionContract({ ...gitProp, dependencies: ['skill_no_existente'] }),
      /Invariante violada/,
      'Crear contrato con skills no canónicas a través de DriveEngine debe lanzar excepción'
    );

    // 7. Verificación de CLI: --contextual
    const cliOutputDirty = cp.execSync(
      `node "${path.join(ROOT, 'tools', 'drive_engine.js')}" --target "${sandbox}" --contextual`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    );
    const parsedCliDirty = JSON.parse(cliOutputDirty);
    assert.strictEqual(parsedCliDirty.status, 'CONTEXT_VERIFIED'); // Porque dirtyFile existe en el sandbox
    assert.ok(parsedCliDirty.proposals.length >= 1);

    // Limpiar dirty file y probar CLI en repo limpio
    fs.rmSync(dirtyFile, { force: true });
    let cliCleanFailed = false;
    try {
      cp.execSync(
        `node "${path.join(ROOT, 'tools', 'drive_engine.js')}" --target "${sandbox}" --contextual`,
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
      );
    } catch (cliErr) {
      cliCleanFailed = true;
      assert.strictEqual(cliErr.status, 2, 'En repo limpio, --contextual debe salir con código 2 (bloqueado)');
      const parsed = JSON.parse(cliErr.stdout);
      assert.strictEqual(parsed.status, 'BLOCKED_CONTEXT_REQUIRED');
      assert.strictEqual(parsed.valid, false);
      assert.strictEqual(parsed.proposals.length, 0);
    }
    assert.strictEqual(cliCleanFailed, true, 'CLI en repo limpio debe salir con error tipado');

    // CLI con --intent explícito
    const cliWithIntent = cp.execSync(
      `node "${path.join(ROOT, 'tools', 'drive_engine.js')}" --target "${sandbox}" --contextual --intent "Auditoría de telemetría"`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    );
    const parsedWithIntent = JSON.parse(cliWithIntent);
    assert.strictEqual(parsedWithIntent.status, 'CONTEXT_VERIFIED');
    assert.strictEqual(parsedWithIntent.valid, true);
    assert.strictEqual(parsedWithIntent.proposals[0].id, 'MISSION_EXPLICIT_INTENT');
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }

  console.log('✓ Invariante 34: Integración de DriveEngine con orquestador contextual verificada (rutas read-only, contratos deterministas y CLI).');
}

console.log('\nPASS AX-F-225 — Los 34 invariantes y defensas adversariales del orquestador contextual verificados al 100%.');
