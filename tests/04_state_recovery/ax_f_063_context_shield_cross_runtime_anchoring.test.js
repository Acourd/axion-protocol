'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  compactSessionContext,
  digestGobernanza,
  SNAPSHOTS_A_CONSERVAR
} = require('../../tools/context_shield.js');

console.log('=== AX-F-063 Invariantes del Escudo de Contexto y Simetría Multi-Runtime (Antigravity/Claude Code) ===\n');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-context-shield-test-'));

try {
  // 1. Simulación de estructura de proyecto multi-runtime
  const dirAgents = path.join(tempDir, '.agents');
  const dirSkills = path.join(dirAgents, 'skills');
  const dirRules = path.join(dirAgents, 'rules');
  const dirClaude = path.join(tempDir, '.claude', 'commands');
  const dirAxion = path.join(tempDir, '.axion');

  fs.mkdirSync(path.join(dirSkills, 'drive'), { recursive: true });
  fs.mkdirSync(dirRules, { recursive: true });
  fs.mkdirSync(dirClaude, { recursive: true });
  fs.mkdirSync(dirAxion, { recursive: true });

  fs.writeFileSync(path.join(tempDir, 'CLAUDE.md'), '# Claude Config\n', 'utf8');
  fs.writeFileSync(path.join(dirAgents, 'AGENTS.md'), '# Agents Registry\n', 'utf8');
  fs.writeFileSync(path.join(dirAxion, 'PROFILE.json'), JSON.stringify({ technical_depth: 'VISIONARY' }), 'utf8');
  fs.writeFileSync(path.join(dirRules, 'p0_security.md'), '# Rule P0\n', 'utf8');
  fs.writeFileSync(path.join(dirSkills, 'drive', 'SKILL.md'), '---\nname: drive\ndescription: test\n---\n# Skill\n', 'utf8');
  fs.writeFileSync(path.join(dirClaude, 'drive.md'), '# Command Drive\n', 'utf8');

  // 2. Digest de gobernanza simétrico (cubre skills de Antigravity y comandos de Claude Code)
  const d1 = digestGobernanza(tempDir);
  assert.strictEqual(typeof d1.digest, 'string');
  assert.strictEqual(d1.digest.length, 64);
  assert.strictEqual(d1.cubiertos.some((p) => p.includes('.agents/skills/drive/SKILL.md')), true, 'debe incluir skills de Antigravity');
  assert.strictEqual(d1.cubiertos.some((p) => p.includes('.claude/commands/drive.md')), true, 'debe incluir comandos de Claude Code');
  console.log(`✓ Cobertura simétrica de gobernanza multi-runtime (${d1.cubiertos.length} archivos) verificada`);

  // 3. Detección en tiempo real de deriva ante modificación de una skill
  fs.writeFileSync(path.join(dirSkills, 'drive', 'SKILL.md'), '---\nname: drive\ndescription: mutada\n---\n# Modificado\n', 'utf8');
  const d2 = digestGobernanza(tempDir);
  assert.notStrictEqual(d1.digest, d2.digest, 'el digest debe cambiar inmediatamente si muta una skill');
  console.log('✓ Detección de deriva de gobernanza ante mutación de skill verificada');

  // 4. Compactación atómica de contexto y emisión de ANCHOR.md
  const r1 = compactSessionContext(tempDir);
  assert.strictEqual(r1.pass, true);
  assert.strictEqual(fs.existsSync(r1.file), true);
  assert.strictEqual(fs.existsSync(r1.anchor), true);
  assert.strictEqual(r1.snapshot.state_digest, d2.digest);

  const anchorContent = fs.readFileSync(r1.anchor, 'utf8');
  assert.strictEqual(anchorContent.includes('Ancla de estado - Axion Protocol'), true);
  assert.strictEqual(anchorContent.includes(d2.digest), true);
  console.log('✓ Emisión atómica de snapshot y ANCHOR.md con hash actualizado verificada');

  // 5. Resiliencia ante colisiones temporales, retención máxima (10) y purga FIFO estricta
  const dirEstado = path.join(tempDir, '.axion', 'state');
  // Limpiar snapshots previos para aislar las aserciones deterministas de colisión y FIFO
  for (const f of fs.readdirSync(dirEstado)) {
    if (f.startsWith('context-snapshot-')) {
      fs.unlinkSync(path.join(dirEstado, f));
    }
  }

  const originalToISOString = Date.prototype.toISOString;
  try {
    let mockTime = '2026-09-11T10:00:00.000Z';
    Date.prototype.toISOString = function () {
      return mockTime;
    };

    // Lote 1: Ráfaga de 15 compactaciones forzando marca temporal idéntica T1
    // Demuestra resiliencia ante saturación intra-milisegundo (supera el retention cap de 10)
    const t1Files = [];
    for (let i = 0; i < 15; i++) {
      const res = compactSessionContext(tempDir);
      assert.strictEqual(fs.existsSync(res.file), true, `cada snapshot emitido (${path.basename(res.file)}) debe existir en disco tras crearse`);
      t1Files.push(path.basename(res.file));
    }

    // Aserción 1: Ausencia de sobrescritura ante marcas temporales idénticas (15 nombres únicos)
    assert.strictEqual(t1Files.length, 15);
    assert.strictEqual(new Set(t1Files).size, 15, 'todas las llamadas con marca idéntica deben generar nombres únicos');
    assert.strictEqual(t1Files[0], 'context-snapshot-2026-09-11T10-00-00-000Z.json', 'primer snapshot sin sufijo');
    assert.strictEqual(t1Files[1], 'context-snapshot-2026-09-11T10-00-00-000Z_001.json', 'segundo snapshot con sufijo _001');
    assert.strictEqual(t1Files[9], 'context-snapshot-2026-09-11T10-00-00-000Z_009.json', 'décimo snapshot con sufijo _009');
    assert.strictEqual(t1Files[10], 'context-snapshot-2026-09-11T10-00-00-000Z_010.json', 'undécimo snapshot con sufijo _010');
    assert.strictEqual(t1Files[14], 'context-snapshot-2026-09-11T10-00-00-000Z_014.json', 'decimoquinto snapshot con sufijo _014');
    console.log('✓ Ausencia de sobrescritura ante marcas temporales idénticas verificada');

    // Aserción 2: Límite estricto de retención y purga FIFO intra-milisegundo
    const t1EnDisco = fs.readdirSync(dirEstado)
      .filter((f) => f.startsWith('context-snapshot-') && f.endsWith('.json'))
      .sort();
    assert.strictEqual(t1EnDisco.length, SNAPSHOTS_A_CONSERVAR, `debe conservar exactamente ${SNAPSHOTS_A_CONSERVAR} snapshots`);

    // Los primeros 5 (base + _001 a _004) deben haber sido purgados en orden FIFO
    for (let i = 0; i < 5; i++) {
      assert.strictEqual(fs.existsSync(path.join(dirEstado, t1Files[i])), false, `el snapshot ${t1Files[i]} debió ser purgado`);
    }
    // Los últimos 10 (_005 a _014) deben conservarse
    for (let i = 5; i < 15; i++) {
      assert.strictEqual(fs.existsSync(path.join(dirEstado, t1Files[i])), true, `el snapshot ${t1Files[i]} debe conservarse`);
    }
    const t1EsperadosEnDisco = t1Files.slice(5).sort();
    assert.deepStrictEqual(t1EnDisco, t1EsperadosEnDisco, 'el contenido en disco tras saturación debe coincidir con los 10 más recientes');
    console.log(`✓ Límite estricto de retención (${SNAPSHOTS_A_CONSERVAR}) y purga FIFO intra-milisegundo verificados`);

    // Lote 2: Avanzar tiempo a T2 y ejecutar 5 compactaciones con marca idéntica T2
    // Total acumulado: 15 (T1) + 5 (T2) = 20 llamadas
    mockTime = '2026-09-11T10:05:00.000Z';
    const t2Files = [];
    for (let i = 0; i < 5; i++) {
      const res = compactSessionContext(tempDir);
      assert.strictEqual(fs.existsSync(res.file), true, `snapshot en T2 (${path.basename(res.file)}) debe existir en disco`);
      t2Files.push(path.basename(res.file));
    }

    assert.strictEqual(t2Files.length, 5);
    assert.strictEqual(new Set(t2Files).size, 5, 'todas las llamadas en T2 deben generar nombres únicos');
    assert.strictEqual(t2Files[0], 'context-snapshot-2026-09-11T10-05-00-000Z.json', 'primer snapshot de T2 sin sufijo');
    assert.strictEqual(t2Files[1], 'context-snapshot-2026-09-11T10-05-00-000Z_001.json', 'segundo snapshot de T2 con sufijo _001');
    assert.strictEqual(t2Files[4], 'context-snapshot-2026-09-11T10-05-00-000Z_004.json', 'quinto snapshot de T2 con sufijo _004');

    // Aserción 3: Retención global exacta (10) y purga FIFO inter-milisegundo
    const snapshotsFinales = fs.readdirSync(dirEstado)
      .filter((f) => f.startsWith('context-snapshot-') && f.endsWith('.json'))
      .sort();
    assert.strictEqual(snapshotsFinales.length, SNAPSHOTS_A_CONSERVAR, `debe mantener ${SNAPSHOTS_A_CONSERVAR} snapshots`);

    // De T1, se debieron purgar t1Files[5] a t1Files[9], conservando t1Files[10] a t1Files[14] (5 más recientes de T1)
    for (let i = 5; i < 10; i++) {
      assert.strictEqual(fs.existsSync(path.join(dirEstado, t1Files[i])), false, `el snapshot ${t1Files[i]} de T1 debió ser purgado`);
    }
    for (let i = 10; i < 15; i++) {
      assert.strictEqual(fs.existsSync(path.join(dirEstado, t1Files[i])), true, `el snapshot ${t1Files[i]} de T1 debe conservarse`);
    }
    // Todos los 5 de T2 deben conservarse en disco
    for (const f of t2Files) {
      assert.strictEqual(fs.existsSync(path.join(dirEstado, f)), true, `el snapshot ${f} de T2 debe conservarse`);
    }

    const esperadosFinales = [...t1Files.slice(10), ...t2Files].sort();
    assert.deepStrictEqual(snapshotsFinales, esperadosFinales, 'el orden y contenido final en disco debe coincidir exactamente con FIFO');
    console.log('✓ Purga FIFO correcta (oldest pruned first respetando orden secuencial inter-milisegundo) verificada');
  } finally {
    Date.prototype.toISOString = originalToISOString;
  }

  // 6. Propagación fail-closed ante fallo de I/O en lectura de dirEstado (sin catch silencioso)
  const originalReaddirSync = fs.readdirSync;
  try {
    fs.readdirSync = function (p, ...args) {
      if (typeof p === 'string' && p.includes(path.join('.axion', 'state'))) {
        const err = new Error('EACCES: permission denied, scandir');
        err.code = 'EACCES';
        throw err;
      }
      return originalReaddirSync.call(fs, p, ...args);
    };
    assert.throws(
      () => compactSessionContext(tempDir),
      (err) => err && err.code === 'EACCES',
      'un fallo de I/O en dirEstado debe propagarse fail-closed sin ser silenciado'
    );
    console.log('✓ Propagación fail-closed ante fallo de lectura en dirEstado verificada');
  } finally {
    fs.readdirSync = originalReaddirSync;
  }

  // 7. Resiliencia ante sufijos espurios o no estrictamente numéricos
  const originalToISOString2 = Date.prototype.toISOString;
  try {
    Date.prototype.toISOString = () => '2026-09-11T12:00:00.000Z';
    compactSessionContext(tempDir);
    fs.writeFileSync(path.join(dirEstado, 'context-snapshot-2026-09-11T12-00-00-000Z_001_corrupt.json'), '{}', 'utf8');
    const rEspurio = compactSessionContext(tempDir);
    assert.strictEqual(path.basename(rEspurio.file), 'context-snapshot-2026-09-11T12-00-00-000Z_001.json');
    console.log('✓ Resiliencia ante sufijos no puramente numéricos verificada');
  } finally {
    Date.prototype.toISOString = originalToISOString2;
  }

} finally {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (_) {}
}

console.log('\nPASS AX-F-063 — Escudo de contexto y simetría multi-runtime demostrados al 100%.\n');
