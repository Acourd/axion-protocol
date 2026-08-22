'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function sha256File(file) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(file));
  return hash.digest('hex');
}

function walk(root, excludedTopLevel = new Set()) {
  const rows = [];
  function visit(current, relative) {
    const entries = fs.readdirSync(current, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name, 'en'));
    for (const entry of entries) {
      const rel = relative ? path.join(relative, entry.name) : entry.name;
      if (!relative && excludedTopLevel.has(entry.name)) continue;
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) visit(absolute, rel);
      else if (entry.isFile()) {
        rows.push({
          path: rel.replaceAll(path.sep, '/'),
          size: fs.statSync(absolute).size,
          sha256: sha256File(absolute),
        });
      } else if (entry.isSymbolicLink()) {
        rows.push({ path: rel.replaceAll(path.sep, '/'), symlink: fs.readlinkSync(absolute) });
      }
    }
  }
  visit(root, '');
  return rows;
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout.trimEnd();
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function freeze(source, baseline, output) {
  const snapshot = {
    schema: 'axion-private-integrity-snapshot-v1',
    created_at: new Date().toISOString(),
    source: {
      root: source,
      head: run('git', ['rev-parse', 'HEAD'], source),
      status_porcelain_v1_uall: run('git', ['status', '--porcelain=v1', '-uall'], source),
      git_head_sha256: sha256File(path.join(source, '.git', 'HEAD')),
      git_index_sha256: sha256File(path.join(source, '.git', 'index')),
      files: walk(source, new Set(['.git'])),
    },
    baseline: {
      root: baseline,
      files: walk(baseline),
    },
  };
  writeJson(output, snapshot);
  process.stdout.write(JSON.stringify({
    result: 'PASS',
    source_files: snapshot.source.files.length,
    baseline_files: snapshot.baseline.files.length,
    status_lines: snapshot.source.status_porcelain_v1_uall === '' ? 0 : snapshot.source.status_porcelain_v1_uall.split(/\r?\n/).length,
  }) + '\n');
}

const PACKAGE_EXCLUSIONS = new Set(['.git', 'archive_manifest', 'CHANGELOG.md', 'LEARNINGS.md']);

function copyFiltered(source, destination) {
  if (fs.existsSync(destination)) throw new Error(`Destination already exists: ${destination}`);
  fs.mkdirSync(destination, { recursive: true });
  function copyDirectory(from, to, relative) {
    const entries = fs.readdirSync(from, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name, 'en'));
    for (const entry of entries) {
      if (relative === '' && PACKAGE_EXCLUSIONS.has(entry.name)) continue;
      const childRelative = relative ? path.join(relative, entry.name) : entry.name;
      const sourcePath = path.join(from, entry.name);
      const destinationPath = path.join(to, entry.name);
      if (entry.isDirectory()) {
        fs.mkdirSync(destinationPath);
        if (childRelative !== 'scratch') copyDirectory(sourcePath, destinationPath, childRelative);
      } else if (entry.isFile()) {
        fs.copyFileSync(sourcePath, destinationPath);
      } else if (entry.isSymbolicLink()) {
        fs.symlinkSync(fs.readlinkSync(sourcePath), destinationPath);
      }
    }
  }
  copyDirectory(source, destination, '');
}

function expectedFilteredFiles(source) {
  return walk(source, PACKAGE_EXCLUSIONS).filter(row => !row.path.startsWith('scratch/'));
}

function verifyCopy(source, destination) {
  const expected = expectedFilteredFiles(source);
  const actual = walk(destination);
  const same = JSON.stringify(expected) === JSON.stringify(actual);
  const tests = actual.filter(row => row.path.startsWith('tests/') && row.path.endsWith('.test.js'));
  const forbidden = [...PACKAGE_EXCLUSIONS].filter(name => fs.existsSync(path.join(destination, name)));
  const scratchEntries = fs.readdirSync(path.join(destination, 'scratch'));
  const result = {
    result: same && tests.length === 16 && forbidden.length === 0 && scratchEntries.length === 0 ? 'PASS' : 'FAIL',
    files: actual.length,
    tests: tests.length,
    forbidden_present: forbidden,
    scratch_entries: scratchEntries,
    hashes_equal: same,
  };
  process.stdout.write(JSON.stringify(result) + '\n');
  if (result.result !== 'PASS') process.exitCode = 1;
}

const ORIGINAL_TEST_ORDER = [
  'tests/tools.test.js',
  'tests/workflow.test.js',
  'tests/clarifier.test.js',
  'tests/learning_git.test.js',
  'tests/install.test.js',
  'tests/adversarial.test.js',
  'tests/vibeguard.test.js',
  'tests/human_anti_patterns.test.js',
  'tests/regression/ax_f_001_installer_backup.test.js',
  'tests/regression/ax_f_005_preflight_destructive.test.js',
  'tests/regression/ax_f_012_suite_integrity.test.js',
  'tests/regression/ax_f_008_doc_consistency.test.js',
  'tests/regression/ax_f_002_risk_gate.test.js',
  'tests/regression/ax_f_003_verified_requires_checks.test.js',
  'tests/regression/ax_f_004_evidence_manifest.test.js',
  'tests/regression/ax_f_006_learnings_preservation.test.js',
];

const RENAMES = {
  'tests/regression/ax_f_001_installer_backup.test.js': 'tests/regression/installer_preserves_existing_configuration.test.js',
  'tests/regression/ax_f_002_risk_gate.test.js': 'tests/regression/risk_gate_normalization.test.js',
  'tests/regression/ax_f_003_verified_requires_checks.test.js': 'tests/regression/workflow_verification_requirements.test.js',
  'tests/regression/ax_f_004_evidence_manifest.test.js': 'tests/regression/evidence_manifest_conformance.test.js',
  'tests/regression/ax_f_005_preflight_destructive.test.js': 'tests/regression/preflight_destructive_commands.test.js',
  'tests/regression/ax_f_006_learnings_preservation.test.js': 'tests/regression/learning_history_preservation.test.js',
  'tests/regression/ax_f_008_doc_consistency.test.js': 'tests/regression/documentation_consistency.test.js',
  'tests/regression/ax_f_012_suite_integrity.test.js': 'tests/regression/test_suite_integrity.test.js',
};

const REPLACEMENTS = {
  '.claude/CLAUDE.md': [
    ['PERSONAL_PATH_REDACTION', 'Refer to [.agents/AGENTS.md](file:///.agents/AGENTS.md) and [CLAUDE.md](file:///CLAUDE.md).', 'Refer to [.agents/AGENTS.md](../.agents/AGENTS.md) and [CLAUDE.md](../CLAUDE.md).'],
  ],
  'CLAUDE.md': [
    ['PERSONAL_PATH_REDACTION', 'This project uses Axion Protocol governance rules. Refer to [.agents/AGENTS.md](file:///.agents/AGENTS.md) for full details.', 'This project uses Axion Protocol governance rules. Refer to [.agents/AGENTS.md](.agents/AGENTS.md) for full details.'],
  ],
  'docs/lineage.md': [
    ['COMMENT_NEUTRALIZATION', 'Axion Protocol surge de las lecciones obtenidas durante el diseño, auditoría y remediación aislada de ZetProG. Mantiene historia propia y no es un fork Git ni una continuación automática de ninguna rama de ZetProG.', 'Axion Protocol se basa en lecciones de diseño y operación de sistemas agentivos. Mantiene historia propia y no es un fork Git ni una continuación automática de ninguna rama externa.'],
  ],
  'README.md': [
    ['PERSONAL_PATH_REDACTION', '- [Ver Página Web Oficial de Presentación (index.html)](file:///c:/Users/Ayco/Shoshin/Project/Axion%20Protocol/index.html)', '- [Ver Página Web Oficial de Presentación](index.html)'],
    ['COMMENT_NEUTRALIZATION', 'Pruebas de regresión de los hallazgos de auditoría (`tests/regression/`), que fijan el\ncomportamiento exigido por las políticas del proyecto:', 'Pruebas de requisitos (`tests/regression/`), que fijan el comportamiento exigido por las\npolíticas del proyecto:'],
    ['FILENAME_NEUTRALIZATION', 'node tests/regression/ax_f_001_installer_backup.test.js; node tests/regression/ax_f_005_preflight_destructive.test.js; node tests/regression/ax_f_012_suite_integrity.test.js; node tests/regression/ax_f_008_doc_consistency.test.js; node tests/regression/ax_f_002_risk_gate.test.js; node tests/regression/ax_f_003_verified_requires_checks.test.js; node tests/regression/ax_f_004_evidence_manifest.test.js; node tests/regression/ax_f_006_learnings_preservation.test.js', 'node tests/regression/installer_preserves_existing_configuration.test.js; node tests/regression/preflight_destructive_commands.test.js; node tests/regression/test_suite_integrity.test.js; node tests/regression/documentation_consistency.test.js; node tests/regression/risk_gate_normalization.test.js; node tests/regression/workflow_verification_requirements.test.js; node tests/regression/evidence_manifest_conformance.test.js; node tests/regression/learning_history_preservation.test.js'],
  ],
  'tests/README.md': [
    ['COMMENT_NEUTRALIZATION', '## Pruebas de regresión (`regression/`)', '## Pruebas de requisitos (`regression/`)'],
    ['COMMENT_NEUTRALIZATION', 'Fijan el comportamiento exigido por las políticas del proyecto tras la auditoría\nindependiente del 2026-08-03. Cada archivo corresponde a un hallazgo `AX-F-*` y fue\nverificado en rojo antes de su parche y en verde después.', 'Fijan el comportamiento exigido por las políticas del proyecto. Cada archivo describe\nel requisito que comprueba.'],
  ],
  'tests/regression/ax_f_001_installer_backup.test.js': [
    ['COMMENT_NEUTRALIZATION', ' * Regresión AX-F-001 — El instalador no debe destruir configuración preexistente.', ' * Verifica que el instalador conserve la configuración preexistente.'],
    ['TEMP_PATH_NEUTRALIZATION', "const destino = fs.mkdtempSync(path.join(os.tmpdir(), 'ax-f-001-'));", "const destino = fs.mkdtempSync(path.join(os.tmpdir(), 'installer-config-'));"],
    ['DIAGNOSTIC_STRING_NEUTRALIZATION', "console.log('PASS AX-F-001 — configuración preexistente respaldada y recuperable');", "console.log('PASS — configuración preexistente respaldada y recuperable');"],
  ],
  'tests/regression/ax_f_002_risk_gate.test.js': [
    ['COMMENT_NEUTRALIZATION', ' * Regresión AX-F-002 — El gate de aprobación humana debe fallar cerrado.', ' * Verifica que el gate de aprobación humana falle cerrado.'],
    ['DIAGNOSTIC_STRING_NEUTRALIZATION', 'console.log(`PASS AX-F-002 — ${EXIGEN_GATE.length} grafías exigen gate, ${FUERA_DE_DOMINIO.length} valores fuera de dominio bloquean`);', 'console.log(`PASS — ${EXIGEN_GATE.length} grafías exigen gate, ${FUERA_DE_DOMINIO.length} valores fuera de dominio bloquean`);'],
  ],
  'tests/regression/ax_f_003_verified_requires_checks.test.js': [
    ['COMMENT_NEUTRALIZATION', ' * Regresión AX-F-003 — VERIFIED exige comprobaciones ejecutadas y superadas.', ' * Verifica que VERIFIED exija comprobaciones ejecutadas y superadas.'],
    ['DIAGNOSTIC_STRING_NEUTRALIZATION', "console.log('PASS AX-F-003 — VERIFIED sólo se alcanza con comprobaciones completas y superadas');", "console.log('PASS — VERIFIED sólo se alcanza con comprobaciones completas y superadas');"],
  ],
  'tests/regression/ax_f_004_evidence_manifest.test.js': [
    ['COMMENT_NEUTRALIZATION', ' * Regresión AX-F-004 — El manifiesto de evidencia debe ser completo, no autoaprobado', ' * Verifica que el manifiesto de evidencia sea completo, no autoaprobado'],
    ['DIAGNOSTIC_STRING_NEUTRALIZATION', "console.log('PASS AX-F-004 — manifiesto conforme al esquema, completo y sin autoaprobación');", "console.log('PASS — manifiesto conforme al esquema, completo y sin autoaprobación');"],
  ],
  'tests/regression/ax_f_005_preflight_destructive.test.js': [
    ['COMMENT_NEUTRALIZATION', ' * Regresión AX-F-005 — La barrera destructiva debe detener las formas equivalentes,', ' * Verifica que la barrera destructiva detenga las formas equivalentes,'],
    ['COMMENT_NEUTRALIZATION', '// Las 15 filas destructivas de la tabla de evidencia de AX-F-005.', '// Conjunto de comandos destructivos requerido para verificar la barrera.'],
    ['DIAGNOSTIC_STRING_NEUTRALIZATION', 'console.log(`PASS AX-F-005 — ${DEBEN_DETENERSE.length} destructivos detenidos, ${DEBEN_PASAR.length} legítimos permitidos`);', 'console.log(`PASS — ${DEBEN_DETENERSE.length} destructivos detenidos, ${DEBEN_PASAR.length} legítimos permitidos`);'],
    ['PERSONAL_PATH_REDACTION', "  'ri C:\\\\Users\\\\Ayco -r -fo',", "  'ri C:\\\\SandboxTarget -r -fo',"],
  ],
  'tests/regression/ax_f_006_learnings_preservation.test.js': [
    ['COMMENT_NEUTRALIZATION', ' * Regresión AX-F-006 — Un fallo de escritura jamás puede truncar la memoria durable.', ' * Verifica que un fallo de escritura no trunque la memoria durable.'],
    ['TEMP_PATH_NEUTRALIZATION', "const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ax-f-006-'));", "const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'learning-history-'));"],
    ['DIAGNOSTIC_STRING_NEUTRALIZATION', "console.log('PASS AX-F-006 — historial preservado ante fallo de escritura y error propagado');", "console.log('PASS — historial preservado ante fallo de escritura y error propagado');"],
  ],
  'tests/regression/ax_f_008_doc_consistency.test.js': [
    ['COMMENT_NEUTRALIZATION', ' * Regresión AX-F-008 — Ninguna superficie informativa puede contradecir a la', ' * Verifica que ninguna superficie informativa contradiga a la'],
    ['DIAGNOSTIC_STRING_NEUTRALIZATION', "console.log('PASS AX-F-008 — sin contradicción entre documentación normativa, contenido real e interfaces');", "console.log('PASS — sin contradicción entre documentación normativa, contenido real e interfaces');"],
  ],
  'tests/regression/ax_f_012_suite_integrity.test.js': [
    ['COMMENT_NEUTRALIZATION', ' * Regresión AX-F-012 — Integridad de la propia suite de pruebas.', ' * Verifica la integridad de la propia suite de pruebas.'],
    ['DIAGNOSTIC_STRING_NEUTRALIZATION', 'console.log(`PASS AX-F-012 — ${todos.length} pruebas documentadas, 0 imports rotos, 0 tautologías, 0 mensajes falsos`);', 'console.log(`PASS — ${todos.length} pruebas documentadas, 0 imports rotos, 0 tautologías, 0 mensajes falsos`);'],
  ],
};

function lineRange(text, fragment) {
  const index = text.indexOf(fragment);
  if (index < 0) return null;
  const start = text.slice(0, index).split('\n').length;
  const end = start + (fragment.match(/\n/g) || []).length;
  return { start, end };
}

function classifyDiff(source, blind, output) {
  source = path.resolve(source);
  blind = path.resolve(blind);
  output = path.resolve(output);
  const sourceFiles = walk(source);
  const packageArtifacts = new Set(['RUN.md', 'blind-manifest.yaml']);
  const blindFiles = walk(blind).filter(row => !packageArtifacts.has(row.path));
  const blindByPath = new Map(blindFiles.map(row => [row.path, row]));
  const expectedBlindPaths = new Set();
  const differences = [];
  const errors = [];

  for (const sourceRow of sourceFiles) {
    const blindPath = RENAMES[sourceRow.path] || sourceRow.path;
    expectedBlindPaths.add(blindPath);
    const blindRow = blindByPath.get(blindPath);
    if (!blindRow) {
      errors.push(`Missing blind file: ${blindPath}`);
      continue;
    }
    if (RENAMES[sourceRow.path]) {
      differences.push({
        category: 'FILENAME_NEUTRALIZATION',
        original_file: sourceRow.path,
        blind_file: blindPath,
        original_lines: null,
        blind_lines: null,
      });
    }
    const sourceBuffer = fs.readFileSync(path.join(source, sourceRow.path));
    const blindBuffer = fs.readFileSync(path.join(blind, blindPath));
    const replacements = REPLACEMENTS[sourceRow.path] || [];
    if (replacements.length === 0) {
      if (!sourceBuffer.equals(blindBuffer)) errors.push(`Unauthorized content change: ${sourceRow.path}`);
      continue;
    }
    let expected = sourceBuffer.toString('utf8');
    const actualBlind = blindBuffer.toString('utf8');
    for (const [category, from, to] of replacements) {
      const occurrences = expected.split(from).length - 1;
      if (occurrences !== 1) {
        errors.push(`Expected one source occurrence in ${sourceRow.path}, found ${occurrences}`);
        continue;
      }
      const originalLines = lineRange(sourceBuffer.toString('utf8'), from);
      expected = expected.replace(from, to);
      differences.push({
        category,
        original_file: sourceRow.path,
        blind_file: blindPath,
        original_lines: originalLines,
        blind_lines: lineRange(actualBlind, to),
      });
    }
    if (expected !== actualBlind) errors.push(`Blind content differs from authorized transformations: ${sourceRow.path}`);
  }
  for (const blindRow of blindFiles) {
    if (!expectedBlindPaths.has(blindRow.path)) errors.push(`Unexpected blind file: ${blindRow.path}`);
  }
  const categories = {};
  for (const row of differences) categories[row.category] = (categories[row.category] || 0) + 1;
  const report = {
    schema: 'axion-private-classified-diff-v1',
    created_at: new Date().toISOString(),
    result: errors.length === 0 ? 'PASS' : 'FAIL',
    source_files: sourceFiles.length,
    blind_files: blindFiles.length,
    differences,
    categories,
    errors,
  };
  writeJson(output, report);
  process.stdout.write(JSON.stringify({ result: report.result, differences: differences.length, categories, errors }) + '\n');
  if (errors.length > 0) process.exitCode = 1;
}

function extractAssertCalls(text) {
  const calls = [];
  const re = /\bassert(?:\.[A-Za-z_$][\w$]*)?\s*\(/g;
  let match;
  while ((match = re.exec(text)) !== null) {
    let index = text.indexOf('(', match.index);
    let depth = 0;
    let quote = null;
    let escaped = false;
    let lineComment = false;
    let blockComment = false;
    for (; index < text.length; index++) {
      const char = text[index];
      const next = text[index + 1];
      if (lineComment) {
        if (char === '\n') lineComment = false;
        continue;
      }
      if (blockComment) {
        if (char === '*' && next === '/') { blockComment = false; index++; }
        continue;
      }
      if (quote) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === quote) quote = null;
        continue;
      }
      if (char === '/' && next === '/') { lineComment = true; index++; continue; }
      if (char === '/' && next === '*') { blockComment = true; index++; continue; }
      if (char === "'" || char === '"' || char === '`') { quote = char; continue; }
      if (char === '(') depth++;
      else if (char === ')') {
        depth--;
        if (depth === 0) {
          let end = index + 1;
          while (/\s/.test(text[end] || '')) end++;
          if (text[end] === ';') end++;
          calls.push(text.slice(match.index, end));
          re.lastIndex = end;
          break;
        }
      }
    }
  }
  return calls;
}

function extractNamedArray(text, name) {
  const marker = `const ${name} = [`;
  const start = text.indexOf(marker);
  if (start < 0) return null;
  const end = text.indexOf('];', start);
  return end < 0 ? null : text.slice(start, end + 2);
}

function verifySemantic(source, blind, classifiedDiffPath, output) {
  source = path.resolve(source);
  blind = path.resolve(blind);
  const classified = JSON.parse(fs.readFileSync(path.resolve(classifiedDiffPath), 'utf8'));
  const sourceFiles = walk(source);
  const blindFiles = new Map(walk(blind).map(row => [row.path, row]));
  const productionJs = sourceFiles.filter(row => row.path.endsWith('.js') && !row.path.startsWith('tests/'));
  const productionMismatches = productionJs.filter(row => blindFiles.get(row.path)?.sha256 !== row.sha256).map(row => row.path);
  const testFiles = sourceFiles.filter(row => row.path.startsWith('tests/') && row.path.endsWith('.test.js'));
  const assertionMismatches = [];
  const importMismatches = [];
  let assertionCount = 0;

  for (const row of testFiles) {
    const blindPath = RENAMES[row.path] || row.path;
    const sourceText = fs.readFileSync(path.join(source, row.path), 'utf8');
    const blindText = fs.readFileSync(path.join(blind, blindPath), 'utf8');
    const sourceAssertions = extractAssertCalls(sourceText);
    const blindAssertions = extractAssertCalls(blindText);
    assertionCount += sourceAssertions.length;
    if (JSON.stringify(sourceAssertions) !== JSON.stringify(blindAssertions)) assertionMismatches.push(row.path);
    const sourceImports = sourceText.split('\n').filter(line => /\brequire\s*\(/.test(line));
    const blindImports = blindText.split('\n').filter(line => /\brequire\s*\(/.test(line));
    if (JSON.stringify(sourceImports) !== JSON.stringify(blindImports)) importMismatches.push(row.path);
  }

  const originalAdversarial = fs.readFileSync(path.join(source, 'tests/adversarial.test.js'));
  const blindAdversarial = fs.readFileSync(path.join(blind, 'tests/adversarial.test.js'));
  const originalPreflight = fs.readFileSync(path.join(source, 'tests/regression/ax_f_005_preflight_destructive.test.js'), 'utf8');
  const blindPreflight = fs.readFileSync(path.join(blind, RENAMES['tests/regression/ax_f_005_preflight_destructive.test.js']), 'utf8');
  const authorizedOriginalPreflight = originalPreflight.replace(
    "  'ri C:\\\\Users\\\\Ayco -r -fo',",
    "  'ri C:\\\\SandboxTarget -r -fo',"
  );
  const adversarialInputBytesIdentical = ['DEBEN_DETENERSE', 'DEBEN_PASAR']
    .every(name => extractNamedArray(originalPreflight, name) === extractNamedArray(blindPreflight, name));
  const adversarialInputsSemanticallyEquivalent = originalAdversarial.equals(blindAdversarial) &&
    ['DEBEN_DETENERSE', 'DEBEN_PASAR'].every(name => extractNamedArray(authorizedOriginalPreflight, name) === extractNamedArray(blindPreflight, name));

  const syntaxErrors = [];
  for (const row of [...blindFiles.values()].filter(item => item.path.endsWith('.js'))) {
    const check = spawnSync(process.execPath, ['--check', path.join(blind, row.path)], { encoding: 'utf8', windowsHide: true });
    if (check.status !== 0) syntaxErrors.push({ file: row.path, stderr: check.stderr });
  }

  const semantic = {
    source_logic_identical: productionMismatches.length === 0,
    production_behavior_identical: productionMismatches.length === 0,
    assertions_identical: assertionMismatches.length === 0,
    adversarial_inputs_byte_identical: adversarialInputBytesIdentical,
    adversarial_inputs_semantically_equivalent: adversarialInputsSemanticallyEquivalent,
    expected_states_identical: assertionMismatches.length === 0,
    imports_identical: importMismatches.length === 0,
    javascript_syntax_valid: syntaxErrors.length === 0,
    classified_diff_valid: classified.result === 'PASS' && classified.errors.length === 0,
  };
  const errors = [];
  if (productionMismatches.length) errors.push({ production_mismatches: productionMismatches });
  if (assertionMismatches.length) errors.push({ assertion_mismatches: assertionMismatches });
  if (importMismatches.length) errors.push({ import_mismatches: importMismatches });
  if (!adversarialInputsSemanticallyEquivalent) errors.push({ adversarial_inputs: 'unauthorized change' });
  if (syntaxErrors.length) errors.push({ syntax_errors: syntaxErrors });
  if (!semantic.classified_diff_valid) errors.push({ classified_diff: 'invalid' });
  const report = {
    schema: 'axion-private-semantic-verification-v1',
    created_at: new Date().toISOString(),
    result: errors.length === 0 ? 'PASS' : 'FAIL',
    production_javascript_files: productionJs.length,
    test_files: testFiles.length,
    assertion_calls: assertionCount,
    semantic_equivalence: semantic,
    errors,
  };
  writeJson(path.resolve(output), report);
  process.stdout.write(JSON.stringify(report) + '\n');
  if (errors.length > 0) process.exitCode = 1;
}

function yamlString(value) {
  return JSON.stringify(value);
}

function lineLabel(range) {
  if (!range) return null;
  return range.start === range.end ? String(range.start) : `${range.start}-${range.end}`;
}

function generateArtifacts(source, blind, classifiedDiffPath, semanticPath, suiteComparisonPath, manifestPath, provenancePath) {
  source = path.resolve(source);
  blind = path.resolve(blind);
  manifestPath = path.resolve(manifestPath);
  provenancePath = path.resolve(provenancePath);
  if (fs.existsSync(manifestPath)) throw new Error(`Manifest already exists: ${manifestPath}`);
  const classified = JSON.parse(fs.readFileSync(path.resolve(classifiedDiffPath), 'utf8'));
  const semantic = JSON.parse(fs.readFileSync(path.resolve(semanticPath), 'utf8'));
  const suites = JSON.parse(fs.readFileSync(path.resolve(suiteComparisonPath), 'utf8'));
  if (classified.result !== 'PASS' || semantic.result !== 'PASS' || suites.result !== 'PASS') {
    throw new Error('Cannot generate artifacts from a failed verification');
  }

  const payloadFiles = walk(blind);
  const testFiles = payloadFiles.filter(row => row.path.startsWith('tests/') && row.path.endsWith('.test.js'));
  const executableFiles = payloadFiles.filter(row => row.path.endsWith('.js'));
  const identityMaterial = payloadFiles.map(row => `${row.path}:${row.sha256}`).join('\n');
  const identifier = `BC-${crypto.createHash('sha256').update(identityMaterial).digest('hex').slice(0, 16).toUpperCase()}`;
  const createdAt = new Date().toISOString();
  const manifest = [];
  manifest.push('blind_corpus:');
  manifest.push(`  identifier: ${yamlString(identifier)}`);
  manifest.push(`  created_at: ${yamlString(createdAt)}`);
  manifest.push('  files:');
  for (const row of payloadFiles) manifest.push(`    - ${yamlString(row.path)}`);
  manifest.push('  hashes:');
  for (const row of payloadFiles) manifest.push(`    ${yamlString(row.path)}: ${yamlString(row.sha256)}`);
  manifest.push('  executable_files:');
  for (const row of executableFiles) manifest.push(`    - ${yamlString(row.path)}`);
  manifest.push('  test_files:');
  for (const row of testFiles) manifest.push(`    - ${yamlString(row.path)}`);
  manifest.push('  excluded_categories:');
  for (const value of ['repository_metadata', 'transient_working_content', 'non_executable_archives', 'private_preparation_evidence', 'external_reference_material']) {
    manifest.push(`    - ${yamlString(value)}`);
  }
  manifest.push('  functional_equivalence:');
  const equivalence = {
    source_logic_identical: true,
    production_behavior_identical: true,
    assertions_identical: true,
    adversarial_inputs_semantically_equivalent: semantic.semantic_equivalence.adversarial_inputs_semantically_equivalent,
    expected_states_identical: true,
    exit_codes_identical: suites.exit_codes_identical,
    pass_fail_results_identical: suites.pass_fail_results_identical,
    persistent_filesystem_effects_identical: suites.persistent_filesystem_effects_identical,
    temporary_path_names_may_differ: true,
    diagnostic_strings_may_differ: true,
    comments_may_differ: true,
    documentation_paths_may_be_redacted: true,
  };
  for (const [key, value] of Object.entries(equivalence)) manifest.push(`    ${key}: ${String(value)}`);
  fs.writeFileSync(manifestPath, manifest.join('\n') + '\n', 'utf8');

  const sourceFiles = walk(source);
  const blindFiles = new Map(walk(blind).map(row => [row.path, row]));
  const provenance = [];
  provenance.push('provenance_map:');
  provenance.push(`  created_at: ${yamlString(createdAt)}`);
  provenance.push('  files:');
  for (const sourceRow of sourceFiles) {
    const blindPath = RENAMES[sourceRow.path] || sourceRow.path;
    const blindRow = blindFiles.get(blindPath);
    if (!blindRow) throw new Error(`Missing blind file while generating provenance: ${blindPath}`);
    const diffs = classified.differences.filter(row => row.original_file === sourceRow.path);
    const transformations = [...new Set(diffs.map(row => row.category))];
    provenance.push(`    - original_file: ${yamlString(sourceRow.path)}`);
    provenance.push(`      blind_file: ${yamlString(blindPath)}`);
    provenance.push(`      original_hash: ${yamlString(sourceRow.sha256)}`);
    provenance.push(`      blind_hash: ${yamlString(blindRow.sha256)}`);
    provenance.push('      transformation:');
    if (transformations.length === 0) provenance.push(`        - ${yamlString('UNCHANGED')}`);
    else for (const category of transformations) provenance.push(`        - ${yamlString(category)}`);
    provenance.push('      lines:');
    if (diffs.length === 0) provenance.push('        []');
    else {
      for (const diff of diffs) {
        provenance.push(`        - category: ${yamlString(diff.category)}`);
        provenance.push(`          original: ${diff.original_lines ? yamlString(lineLabel(diff.original_lines)) : 'null'}`);
        provenance.push(`          blind: ${diff.blind_lines ? yamlString(lineLabel(diff.blind_lines)) : 'null'}`);
      }
    }
  }
  fs.writeFileSync(provenancePath, provenance.join('\n') + '\n', 'utf8');
  process.stdout.write(JSON.stringify({
    result: 'PASS',
    identifier,
    payload_files: payloadFiles.length,
    executable_files: executableFiles.length,
    test_files: testFiles.length,
    provenance_files: sourceFiles.length,
    manifest_sha256: sha256File(manifestPath),
    provenance_sha256: sha256File(provenancePath),
  }) + '\n');
}

function verifyArtifacts(blind, manifestPath, provenancePath) {
  blind = path.resolve(blind);
  manifestPath = path.resolve(manifestPath);
  provenancePath = path.resolve(provenancePath);
  const manifestText = fs.readFileSync(manifestPath, 'utf8');
  const provenanceText = fs.readFileSync(provenancePath, 'utf8');
  const manifestRelative = path.relative(blind, manifestPath).replaceAll(path.sep, '/');
  const payload = walk(blind).filter(row => row.path !== manifestRelative);
  const errors = [];
  const allowedFields = ['identifier', 'created_at', 'files', 'hashes', 'executable_files', 'test_files', 'excluded_categories', 'functional_equivalence'];
  const fields = [...manifestText.matchAll(/^  ([a-z_]+):/gm)].map(match => match[1]);
  if (JSON.stringify(fields) !== JSON.stringify(allowedFields)) errors.push(`Unexpected manifest fields: ${fields.join(',')}`);
  for (const row of payload) {
    const hashLine = `    ${yamlString(row.path)}: ${yamlString(row.sha256)}`;
    if (!manifestText.includes(hashLine)) errors.push(`Missing or incorrect manifest hash: ${row.path}`);
  }
  if (manifestText.includes(`    - ${yamlString(manifestRelative)}`)) errors.push('Manifest must not claim a circular self-hash');
  const provenanceEntries = (provenanceText.match(/^    - original_file:/gm) || []).length;
  if (provenanceEntries !== 70) errors.push(`Expected 70 provenance entries, found ${provenanceEntries}`);
  if (path.dirname(provenancePath).startsWith(blind + path.sep)) errors.push('Provenance map is inside the blind corpus');
  const result = {
    result: errors.length === 0 ? 'PASS' : 'FAIL',
    payload_files_verified: payload.length,
    test_files: payload.filter(row => row.path.startsWith('tests/') && row.path.endsWith('.test.js')).length,
    executable_files: payload.filter(row => row.path.endsWith('.js')).length,
    provenance_entries: provenanceEntries,
    manifest_fields: fields,
    errors,
  };
  process.stdout.write(JSON.stringify(result) + '\n');
  if (errors.length > 0) process.exitCode = 1;
}

function scanLeakage(blind, output) {
  blind = path.resolve(blind);
  const patterns = {
    ax_f_identifiers: /AX-F-|ax_f_|ax-f-/gi,
    previous_phase_names: /\b(?:Fase|Phase)\s+[AC]\b/gi,
    previous_verdicts: /REQUEST_CHANGES|FAIL_CLOSED_REQUIRED/gi,
    baseline_hashes: /ef229b4|47E8880E/gi,
    personal_absolute_paths: /file:\/\/\/|[A-Za-z]:[\\/]+Users[\\/]+[^\\/\r\n'"`\s]+|\/Users\/[^/\r\n'"`\s]+/gi,
  };
  const matches = Object.fromEntries(Object.keys(patterns).map(key => [key, []]));
  for (const row of walk(blind)) {
    const absolute = path.join(blind, row.path);
    const text = fs.readFileSync(absolute, 'utf8');
    for (const [category, regex] of Object.entries(patterns)) {
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(text)) !== null) {
        const line = text.slice(0, match.index).split('\n').length;
        matches[category].push({ file: row.path, line, value: match[0] });
      }
      regex.lastIndex = 0;
      let pathMatch;
      while ((pathMatch = regex.exec(row.path)) !== null) {
        matches[category].push({ file: row.path, line: null, value: pathMatch[0] });
      }
    }
  }
  const counts = Object.fromEntries(Object.entries(matches).map(([key, rows]) => [key, rows.length]));
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const report = {
    schema: 'axion-private-leakage-scan-v1',
    created_at: new Date().toISOString(),
    result: total === 0 ? 'PASS' : 'FAIL',
    historical_leakage: counts,
    total_matches: total,
    matches,
  };
  writeJson(path.resolve(output), report);
  process.stdout.write(JSON.stringify(report) + '\n');
  if (total > 0) process.exitCode = 1;
}

function runSuite(root, temporaryRoot, output) {
  root = path.resolve(root);
  temporaryRoot = path.resolve(temporaryRoot);
  output = path.resolve(output);
  if (fs.existsSync(temporaryRoot)) throw new Error(`Temporary root already exists: ${temporaryRoot}`);
  fs.mkdirSync(temporaryRoot, { recursive: true });
  const treeBefore = walk(root);
  const tempBefore = walk(temporaryRoot);
  const results = [];
  const testOrder = ORIGINAL_TEST_ORDER.map(relative => {
    if (fs.existsSync(path.join(root, relative))) return relative;
    return RENAMES[relative] || relative;
  });
  for (const relative of testOrder) {
    const result = spawnSync(process.execPath, [path.join(root, relative)], {
      cwd: root,
      encoding: 'utf8',
      windowsHide: true,
      timeout: 120000,
      env: { ...process.env, TEMP: temporaryRoot, TMP: temporaryRoot, TMPDIR: temporaryRoot },
    });
    results.push({
      test: relative.replaceAll(path.sep, '/'),
      exit_code: result.status,
      signal: result.signal,
      error: result.error ? String(result.error.message || result.error) : null,
      stdout: result.stdout || '',
      stderr: result.stderr || '',
    });
    if (result.status !== 0) break;
  }
  const treeAfter = walk(root);
  const tempAfter = walk(temporaryRoot);
  const report = {
    schema: 'axion-private-suite-result-v1',
    created_at: new Date().toISOString(),
    root,
    tests_expected: ORIGINAL_TEST_ORDER.length,
    tests_executed: results.length,
    results,
    root_tree_unchanged: JSON.stringify(treeBefore) === JSON.stringify(treeAfter),
    temporary_tree_before: tempBefore,
    temporary_tree_after: tempAfter,
    temporary_tree_unchanged: JSON.stringify(tempBefore) === JSON.stringify(tempAfter),
    all_exit_zero: results.length === ORIGINAL_TEST_ORDER.length && results.every(row => row.exit_code === 0),
  };
  writeJson(output, report);
  const passed = report.all_exit_zero && report.root_tree_unchanged && report.temporary_tree_unchanged;
  process.stdout.write(JSON.stringify({
    result: passed ? 'PASS' : 'FAIL',
    tests_executed: report.tests_executed,
    all_exit_zero: report.all_exit_zero,
    root_tree_unchanged: report.root_tree_unchanged,
    temporary_tree_unchanged: report.temporary_tree_unchanged,
    first_failure: results.find(row => row.exit_code !== 0)?.test || null,
  }) + '\n');
  if (!passed) process.exitCode = 1;
}

function compareSuites(beforePath, afterPath, output) {
  const before = JSON.parse(fs.readFileSync(path.resolve(beforePath), 'utf8'));
  const after = JSON.parse(fs.readFileSync(path.resolve(afterPath), 'utf8'));
  const resultPairs = [];
  const errors = [];
  if (before.results.length !== after.results.length) errors.push('Different number of executed tests');
  const count = Math.min(before.results.length, after.results.length);
  for (let i = 0; i < count; i++) {
    const original = before.results[i];
    const blind = after.results[i];
    const expectedBlindName = RENAMES[original.test] || original.test;
    const row = {
      original_test: original.test,
      blind_test: blind.test,
      expected_blind_test: expectedBlindName,
      original_exit_code: original.exit_code,
      blind_exit_code: blind.exit_code,
      exit_code_identical: original.exit_code === blind.exit_code,
      pass_fail_identical: (original.exit_code === 0) === (blind.exit_code === 0),
      diagnostic_output_identical: original.stdout === blind.stdout && original.stderr === blind.stderr,
    };
    resultPairs.push(row);
    if (blind.test !== expectedBlindName) errors.push(`Unexpected test mapping: ${original.test} -> ${blind.test}`);
    if (!row.exit_code_identical) errors.push(`Exit code changed: ${original.test}`);
    if (!row.pass_fail_identical) errors.push(`PASS/FAIL changed: ${original.test}`);
  }
  const persistentIdentical = before.root_tree_unchanged && after.root_tree_unchanged &&
    before.temporary_tree_unchanged && after.temporary_tree_unchanged;
  if (!persistentIdentical) errors.push('Persistent filesystem effects differ or were detected');
  const report = {
    schema: 'axion-private-suite-comparison-v1',
    created_at: new Date().toISOString(),
    result: errors.length === 0 ? 'PASS' : 'FAIL',
    tests_compared: resultPairs.length,
    exit_codes_identical: resultPairs.every(row => row.exit_code_identical),
    pass_fail_results_identical: resultPairs.every(row => row.pass_fail_identical),
    persistent_filesystem_effects_identical: persistentIdentical,
    diagnostic_outputs_changed: resultPairs.filter(row => !row.diagnostic_output_identical).length,
    pairs: resultPairs,
    errors,
  };
  writeJson(path.resolve(output), report);
  process.stdout.write(JSON.stringify({
    result: report.result,
    tests_compared: report.tests_compared,
    exit_codes_identical: report.exit_codes_identical,
    pass_fail_results_identical: report.pass_fail_results_identical,
    persistent_filesystem_effects_identical: report.persistent_filesystem_effects_identical,
    diagnostic_outputs_changed: report.diagnostic_outputs_changed,
    errors,
  }) + '\n');
  if (errors.length > 0) process.exitCode = 1;
}

const [command, ...args] = process.argv.slice(2);
if (command === 'freeze' && args.length === 3) freeze(...args);
else if (command === 'copy' && args.length === 2) copyFiltered(...args);
else if (command === 'verify-copy' && args.length === 2) verifyCopy(...args);
else if (command === 'run-suite' && args.length === 3) runSuite(...args);
else if (command === 'classify-diff' && args.length === 3) classifyDiff(...args);
else if (command === 'verify-semantic' && args.length === 4) verifySemantic(...args);
else if (command === 'compare-suites' && args.length === 3) compareSuites(...args);
else if (command === 'generate-artifacts' && args.length === 7) generateArtifacts(...args);
else if (command === 'verify-artifacts' && args.length === 3) verifyArtifacts(...args);
else if (command === 'scan-leakage' && args.length === 2) scanLeakage(...args);
else {
  process.stderr.write('Usage: node prep.js <freeze|copy|verify-copy> ...\n');
  process.exitCode = 2;
}
