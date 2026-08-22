/**
 * AXION AUDIT — Fase A — Experimento E7/E10/E11: persistencia, deteccion y demo
 */
const fs = require('fs');
const path = require('path');
const AX = path.join(__dirname, 'axion');
const line = (t) => console.log('\n===== ' + t + ' =====');

// ---------------------------------------------------------------- E7
line('E7 · LEARNINGS.md — comportamiento del fallback cuando appendFileSync falla');
const { captureHumanFeedback } = require(path.join(AX, 'tools', 'learning_engine.js'));

const target = path.join(__dirname, 'LEARNINGS_probe.md');
const historial =
  '# Registro de Aprendizaje Empirico (Axion Protocol)\n' +
  '\n- **[SAFETY_RULE]** (2026-01-01): leccion historica 1\n' +
  '\n- **[UX_DESIGN]** (2026-02-01): leccion historica 2\n' +
  '\n- **[CODE_PATTERN]** (2026-03-01): leccion historica 3\n';
fs.writeFileSync(target, historial, 'utf8');
console.log('  bytes antes ..........:', fs.statSync(target).size);
console.log('  lecciones antes ......:', (fs.readFileSync(target, 'utf8').match(/^- \*\*\[/gm) || []).length);

// Inyeccion de fallo: appendFileSync falla una vez, writeFileSync sigue operativo.
const realAppend = fs.appendFileSync;
fs.appendFileSync = function () { const e = new Error('EPERM: operation not permitted, open'); e.code = 'EPERM'; throw e; };
const res = captureHumanFeedback('Prefiero que la interfaz sea minimalista', { targetFile: target });
fs.appendFileSync = realAppend;

const despues = fs.readFileSync(target, 'utf8');
console.log('  resultado devuelto ...:', res.status, '(el fallo no se reporta al llamador)');
console.log('  bytes despues ........:', fs.statSync(target).size);
console.log('  lecciones despues ....:', (despues.match(/^- \*\*\[/gm) || []).length);
console.log('  historial conservado .:', despues.includes('leccion historica 1'));
console.log('  --- contenido resultante ---');
console.log(despues.split('\n').map(l => '    | ' + l).join('\n'));
fs.unlinkSync(target);

// ---------------------------------------------------------------- E10
line('E10 · VIBEGUARD — cobertura real frente a la cobertura declarada en su cabecera');
const { inspectFileContent } = require(path.join(AX, 'tools', 'vibeguard.js'));
const muestra = [
  'function leerConfig(p) {',
  '  try {',
  '    return JSON.parse(fs.readFileSync(p));',
  '  } catch (e) {',
  '    return { usuarios: [], admin: true };   // dato falso inventado',
  '  }',
  '}',
  'function guardar(x) {',
  '  try { db.write(x); } catch (e) { return null; }',
  '}',
  'function verificar() {',
  '  return true; // siempre PASS sin comprobar nada',
  '}',
].join('\n');
const r10 = inspectFileContent(muestra, 'muestra.js');
console.log('  antipatron declarado #4 = "retornos de datos falsos o fallbacks no verificados"');
console.log('  status ...:', r10.status, '| issues:', r10.totalIssues);
console.log('  detalle ..:', JSON.stringify(r10.issues));

// alineacion de numeros de linea tras comentarios/strings
const align = [
  'const a = 1;',
  '/* comentario',
  '   de varias lineas */',
  'const s = "texto con } llaves {";',
  'try { f(); } catch (e) {}',
].join('\n');
const r10b = inspectFileContent(align, 'align.js');
console.log('  catch mudo real en linea 5 -> vibeguard reporta linea:', r10b.issues.map(i => i.line).join(','));

// autoescaneo de los propios modulos del proyecto
console.log('  --- autoescaneo de tools/ ---');
for (const f of fs.readdirSync(path.join(AX, 'tools')).filter(x => x.endsWith('.js'))) {
  const r = inspectFileContent(fs.readFileSync(path.join(AX, 'tools', f), 'utf8'), f);
  console.log(`    ${f.padEnd(22)} ${r.status.padEnd(22)} issues=${r.totalIssues}`);
}

// ---------------------------------------------------------------- E11
line('E11 · workflow_runner.js — resultado de su propia demostracion incorporada');
const out = require('child_process').execSync('node ' + JSON.stringify(path.join(AX, 'tools', 'workflow_runner.js')), { encoding: 'utf8' });
const parsed = JSON.parse(out);
console.log('  status de la demo oficial:', parsed.status);
console.log('  motivo ..................:', parsed.reason || '(n/a)');
