/**
 * AXION AUDIT — Fase A — Experimento E12: matriz de amenazas + benchmark (seccion 21)
 */
const fs = require('fs');
const path = require('path');
const AX = path.join(__dirname, 'axion');
const { runPreflight } = require(path.join(AX, 'tools', 'preflight.js'));
const { inspectFileContent } = require(path.join(AX, 'tools', 'vibeguard.js'));
const { createEvidenceManifest } = require(path.join(AX, 'tools', 'evidence_hasher.js'));
const line = (t) => console.log('\n===== ' + t + ' =====');

line('E12a · UNICODE / CARACTERES INVISIBLES / ANSI en preflight');
const casos = [
  ['rm -rf /',                          'linea base ASCII'],
  ['rm\u00a0-rf /',                     'espacio duro U+00A0 en lugar de espacio'],
  ['rm -rf\u200b /',                    'espacio de ancho cero U+200B'],
  ['r\u200bm -rf /',                    'ZWSP dentro del propio comando'],
  ['\u001b[2J\u001b[1;1Hrm -rf /',      'prefijo de escape ANSI'],
  ['rm -rf \u2044',                     'division slash U+2044 (homoglifo de /)'],
  ['Remove-Item -Recurse -Force C:\u005c', 'C:\\ con escape unicode'],
];
for (const [c, why] of casos) {
  const r = runPreflight(c);
  console.log(`  ${r.status.padEnd(4)} | ${why}`);
}
const ansi = runPreflight('\u001b[31mFALSO PASS\u001b[0m rm -rf /x');
console.log('  eco de secuencias ANSI en la salida JSON:',
  JSON.stringify(ansi).includes('\\u001b') ? 'escapado por JSON.stringify (seguro)' : 'CRUDO (riesgo de inyeccion en terminal)');
console.log('  eco en console.log directo:', /\u001b\[/.test(String(ansi.command)) ? 'la propiedad .command conserva el escape crudo' : 'sin escapes');

line('E12b · ENTRADAS DESMESURADAS / ReDoS / BLOQUEO DEL EVENT LOOP');
for (const n of [1e4, 1e5, 1e6]) {
  const big = 'a'.repeat(n);
  let t = process.hrtime.bigint();
  runPreflight(big);
  const dtPre = Number(process.hrtime.bigint() - t) / 1e6;
  t = process.hrtime.bigint();
  inspectFileContent(big.replace(/a{80}/g, m => m + '\n'), 'big.js');
  const dtVibe = Number(process.hrtime.bigint() - t) / 1e6;
  console.log(`  ${String(n).padStart(9)} chars -> preflight ${dtPre.toFixed(2)} ms | vibeguard ${dtVibe.toFixed(2)} ms`);
}
const patologico = '"'.repeat(20000) + ' $ a';
let t0 = process.hrtime.bigint();
const rp = runPreflight(patologico);
console.log(`  20000 comillas -> ${rp.status} en ${(Number(process.hrtime.bigint() - t0) / 1e6).toFixed(2)} ms`);

line('E12c · BENCHMARK preflight (seccion 21) — comando representativo');
const CMD = 'git commit -m "actualizar documentacion del modulo de gobernanza"';
for (let i = 0; i < 20000; i++) runPreflight(CMD);          // calentamiento
const muestras = [];
for (let rep = 0; rep < 5; rep++) {
  const N = 20000;
  const s = process.hrtime.bigint();
  for (let i = 0; i < N; i++) runPreflight(CMD);
  muestras.push(Number(process.hrtime.bigint() - s) / 1e6 / N);
}
muestras.sort((a, b) => a - b);
console.log('  muestras (ms/llamada):', muestras.map(x => x.toFixed(5)).join(', '));
console.log('  mediana:', muestras[2].toFixed(5), 'ms | min:', muestras[0].toFixed(5), '| max:', muestras[4].toFixed(5));
console.log('  afirmacion de index.html: "< 1ms Latencia Preflight" ->', muestras[2] < 1 ? 'COMPATIBLE en proceso ya iniciado' : 'NO COMPATIBLE');
const s2 = process.hrtime.bigint();
require('child_process').execSync(`node ${JSON.stringify(path.join(AX, 'tools', 'preflight.js'))} "git status"`, { stdio: 'ignore' });
console.log('  coste real por invocacion CLI (node arranque incluido):', (Number(process.hrtime.bigint() - s2) / 1e6).toFixed(1), 'ms');

line('E12d · TRAVESIA DE RUTAS Y ENLACES SIMBOLICOS en evidence_hasher');
const externo = path.join(__dirname, 'secreto_externo.txt');
fs.writeFileSync(externo, 'CONTENIDO FUERA DEL PROYECTO', 'utf8');
process.chdir(AX);
const m = createEvidenceManifest({ files: ['../../../../../../Windows/System32/drivers/etc/hosts', externo] });
console.log('  rutas admitidas fuera del proyecto:', m.files.length);
for (const f of m.files) console.log('    path registrado:', f.path.slice(0, 90));
console.log('  --> el manifiesto no declara raiz de proyecto ni rechaza rutas externas');

line('E12e · ATOMICIDAD / FALLO PARCIAL del instalador');
console.log('  install.js: sin transaccion, sin rollback, sin dry-run, sin verificacion posterior.');
console.log('  Si falla a mitad, deja el destino en estado mixto y no lo reporta (probado en E8b).');
