/**
 * Regresión AX-F-016 — Toda herramienta con CLI cumple su contrato de salida.
 *
 * Por qué existe. Tres herramientas anunciaban éxito sin haber hecho el trabajo, y
 * ninguna prueba lo notaba porque todas miraban resultados, no códigos de salida:
 *
 *   - `wizard.js` sin terminal interactiva imprimía la primera pregunta, no esperaba a
 *     nadie, no instalaba nada y salía con 0.
 *   - `vibeguard.js` emitía hallazgos y salía con 0; en cualquier CI habría pasado
 *     siempre. Con un directorio por argumento reventaba con EISDIR y también salía 0.
 *   - `updater.js` daba por actualizado un proyecto aunque el instalador hubiera
 *     devuelto INCOMPLETE.
 *
 * El patrón común no es el error, es el silencio: el código de salida es el único
 * contrato que un CI o un agente pueden leer sin interpretar prosa, y estaba mintiendo.
 */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
let n = 0;
const ok = (cond, msg) => { assert.strictEqual(cond, true, msg); n += 1; };

// Sin `input` heredaría el stdin del runner; pasándolo vacío se reproduce exactamente el
// caso que fallaba: una invocación sin terminal interactiva.
const correr = (rel, args) => spawnSync(process.execPath, [path.join(ROOT, rel), ...(args || [])], {
  cwd: ROOT, encoding: 'utf8', input: '', windowsHide: true, timeout: 60000,
});

console.log('=== AX-F-016 Contratos de salida de las herramientas ===\n');

// --- 1. El asistente no simula una conversación consigo mismo ---
{
  const destino = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-wz-'));
  const r = correr('tools/wizard.js', ['--target', destino]);
  ok(r.status !== 0, `wizard sin TTY debe salir con código distinto de 0, salió con ${r.status}`);
  ok(/interactiva/i.test(r.stderr || ''), 'wizard debe explicar que necesita una terminal interactiva');
  ok(/profile_adapter\.js set/.test(r.stderr || ''), 'wizard debe ofrecer la alternativa no interactiva');
  ok(fs.readdirSync(destino).length === 0, 'wizard no debe dejar el proyecto a medias cuando no puede preguntar');
  fs.rmSync(destino, { recursive: true, force: true });
  console.log('✓ wizard.js: sin terminal, se niega y no toca nada');
}

// --- 2. El inspector de calidad gradúa su código de salida ---
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-vg-'));
  const limpio = path.join(dir, 'limpio.js');
  const sucio = path.join(dir, 'sucio.js');
  fs.writeFileSync(limpio, 'function suma(a, b) {\n  return a + b;\n}\n');
  fs.writeFileSync(sucio, 'try {\n  algo();\n} catch (e) {}\n');

  ok(correr('tools/vibeguard.js', [limpio]).status === 0, 'un archivo limpio debe salir con 0');
  ok(correr('tools/vibeguard.js', [sucio]).status === 1, 'un archivo con hallazgos debe salir con 1');
  ok(correr('tools/vibeguard.js', []).status === 2, 'sin argumentos debe salir con 2');

  const conDirectorio = correr('tools/vibeguard.js', [dir]);
  ok(conDirectorio.status === 1, 'un directorio por argumento debe salir con 1, no con 0');
  ok(/vibeguard_gate/.test(conDirectorio.stdout || ''), 'debe redirigir a la puerta para recorrer árboles');

  const inexistente = correr('tools/vibeguard.js', [path.join(dir, 'no-existe.js')]);
  ok(inexistente.status === 1, 'un archivo ilegible no puede darse por limpio');
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('✓ vibeguard.js: 0 limpio, 1 hallazgos o error, 2 uso incorrecto');
}

// --- 3. Precisión del detector: lo que no debe marcar ---
// Un escáner que grita a cada línea acaba desactivado, y entonces no protege de nada.
{
  const { inspectFileContent } = require(path.join(ROOT, 'tools', 'vibeguard.js'));
  const categorias = (src) => inspectFileContent(src).issues.map((i) => i.category);

  ok(!categorias('// Todo el corpus usa require() en este proyecto.\n').includes('UNFINISHED_CODE'),
    'la palabra española "Todo" al inicio de un comentario no es un marcador de trabajo pendiente');
  ok(!categorias('const t = "el texto menciona TODO dentro de una cadena";\n').includes('UNFINISHED_CODE'),
    'una mención dentro de una cadena no es un marcador');
  ok(!categorias('const RE = /!important/i;\n').includes('CSS_OVERRIDE'),
    'el cuerpo de una expresión regular no es CSS');
  ok(!categorias('try { f(); } catch (_) {\n  // documentado: se ignora a propósito\n}\n').includes('SILENT_EXCEPTION'),
    'un catch con un comentario que explica el porqué no es un catch mudo');

  ok(categorias('// TODO: terminar\n').includes('UNFINISHED_CODE'), 'un marcador real debe detectarse');
  ok(categorias('try { f(); } catch (e) {}\n').includes('SILENT_EXCEPTION'), 'un catch mudo debe detectarse');
  ok(categorias('const s = "color: red !important;";\n').includes('CSS_OVERRIDE'),
    'el CSS escrito desde JavaScript vive en cadenas y debe detectarse');
  console.log('✓ vibeguard: distingue el hallazgo real de la mención');
}

// --- 4. La puerta gradúa por severidad y avisa de lo que no bloquea ---
{
  const { runVibeGuardGate, BLOQUEAN } = require(path.join(ROOT, 'tools', 'vibeguard_gate.js'));
  ok(BLOQUEAN.has('HIGH') && BLOQUEAN.has('MEDIUM'), 'HIGH y MEDIUM deben bloquear');
  ok(!BLOQUEAN.has('LOW'), 'LOW es asesoramiento y no debe bloquear salvo --strict');

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-gate-'));
  fs.writeFileSync(path.join(dir, 'aviso.css'), '.a { color: red !important; }\n');
  const laxo = runVibeGuardGate(dir);
  ok(laxo.pass === true, 'un hallazgo LOW no debe tumbar la puerta');
  ok(laxo.findings.length === 1, 'pero sí debe reportarse');
  ok(runVibeGuardGate(dir, { strict: true }).pass === false, '--strict debe exigir también los LOW');

  fs.writeFileSync(path.join(dir, 'grave.js'), 'try { f(); } catch (e) {}\n');
  ok(runVibeGuardGate(dir).pass === false, 'un hallazgo HIGH debe tumbar la puerta siempre');
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('✓ vibeguard_gate: bloquea por severidad y --strict endurece');
}

// --- 5. Un único detector, no dos ---
// La puerta tenía su propia lista de patrones, más pobre que la del inspector, y era la
// que corría en el CLI. Dos detectores divergen siempre.
{
  const fuenteGate = fs.readFileSync(path.join(ROOT, 'tools', 'vibeguard_gate.js'), 'utf8');
  ok(/require\(['"]\.\/vibeguard\.js['"]\)/.test(fuenteGate),
    'la puerta debe delegar la detección en vibeguard.js en vez de reimplementarla');
  ok(!/ANTI_PATTERNS\s*=/.test(fuenteGate),
    'la puerta no debe mantener su propia tabla de patrones');
  console.log('✓ la detección vive en un solo módulo');
}

// --- 6. El actualizador distingue actualizar de creer que ha actualizado ---
{
  const fuente = fs.readFileSync(path.join(ROOT, 'tools', 'updater.js'), 'utf8');
  ok(/result\.status !== 'SUCCESS'/.test(fuente),
    'updater.js debe comprobar el estado que devuelve el instalador antes de anunciar éxito');
  ok(!/require\(path\.join\(ROOT, 'package\.json'\)\)/.test(fuente),
    'updater.js no debe cargar package.json con require(): revienta en proyectos que no lo tienen');
  console.log('✓ updater.js: no anuncia éxito sobre una instalación incompleta');
}

// --- 7. El instalador tampoco ---
{
  const fuente = fs.readFileSync(path.join(ROOT, 'install.js'), 'utf8');
  ok(/status: 'INCOMPLETE'/.test(fuente),
    'install.js debe poder devolver INCOMPLETE cuando le falta payload');
  ok(/ausentes\.push/.test(fuente),
    'install.js debe registrar los orígenes ausentes en vez de devolver null en silencio');
  console.log('✓ install.js: registra lo que falta en vez de callarlo');
}

console.log(`\n=== AX-F-016 PASS (${n} comprobaciones) ===`);
