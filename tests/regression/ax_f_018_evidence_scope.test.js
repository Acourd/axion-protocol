/**
 * Regresión AX-F-018 — Todo artefacto de integridad declara su alcance.
 *
 * Por qué existe. Este repositorio versiona tres registros de integridad y solo uno
 * decía qué era. `phase-e-integrity.yaml` se declaraba histórico y explicaba que sus
 * desajustes son correctos; `sha256-manifest.txt` era una lista pelada de 70 hashes sin
 * una línea de contexto, y `09_candidate_manifest.json` estaba señalado como «la forma
 * de verificar el corpus ACTUAL» cuando 29 de sus entradas ya no coincidían y 3
 * apuntaban a archivos movidos.
 *
 * El problema no es que un registro histórico no coincida: eso es lo que le toca. El
 * problema es no poder distinguir «el árbol evolucionó» de «alguien manipuló el corpus»,
 * que es exactamente la distinción que un manifiesto de integridad existe para permitir.
 * Un desajuste que nadie sabe interpretar se acaba ignorando, y entonces el manifiesto
 * deja de ser evidencia para ser decoración.
 *
 * La regla que se fija aquí: o el artefacto se declara histórico, o cuadra con el árbol.
 * No hay tercera opción, y menos la de callarse.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..', '..');
const leer = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
let n = 0;
const ok = (cond, msg) => { assert.strictEqual(cond, true, msg); n += 1; };

// Se acepta cualquier forma de decirlo, no una fórmula exacta: lo que importa es que un
// lector entienda que no debe leer un desajuste como corrupción.
const DECLARA_ALCANCE = /REGISTRO\s+HIST[OÓ]RICO|registro hist[oó]rico|no\s+es\s+corrupcion|NO\s+COINCIDEN/i;

console.log('=== AX-F-018 Alcance de los artefactos de integridad ===\n');

// --- 1. Los registros textuales declaran qué son ---
{
  for (const rel of ['sha256-manifest.txt', 'phase-e-integrity.yaml']) {
    const texto = leer(rel);
    ok(DECLARA_ALCANCE.test(texto),
      `${rel} no declara su alcance: quien lo verifique no podrá distinguir deriva de manipulación`);
  }
  console.log('✓ sha256-manifest.txt y phase-e-integrity.yaml declaran su alcance');
}

// --- 2. Ninguno se presenta como sello del árbol actual ---
// Era el error concreto: phase-e-integrity.yaml remitía a 09_candidate_manifest.json
// «para verificar el corpus ACTUAL». Señalar a una foto vieja como si fuera un espejo.
{
  const integridad = leer('phase-e-integrity.yaml');
  ok(!/verificar el corpus ACTUAL usa 09_candidate_manifest/i.test(integridad),
    'phase-e-integrity.yaml no puede presentar un manifiesto congelado como verificador del árbol actual');
  ok(/evidence_hasher\.js/.test(integridad),
    'debe remitir a la herramienta viva, que calcula sobre lo que hay en disco ahora');
  console.log('✓ el puntero al verificador vivo es correcto');
}

// --- 3. Un manifiesto que NO se declare histórico tiene que cuadrar ---
// Esta es la comprobación que impide que el problema vuelva: si alguien añade mañana un
// manifiesto «vivo», o cuadra con el árbol o esta suite se pone en rojo.
{
  const manifiesto = leer('sha256-manifest.txt');
  const esHistorico = DECLARA_ALCANCE.test(manifiesto);

  const entradas = manifiesto.split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^[a-f0-9]{64}\s/.test(l))
    .map((l) => {
      const m = l.match(/^([a-f0-9]{64})\s+(.+)$/);
      return { hash: m[1], ruta: m[2].trim() };
    });

  ok(entradas.length > 0, 'el manifiesto debe contener entradas verificables');

  const desajustes = entradas.filter((e) => {
    const abs = path.join(ROOT, e.ruta);
    if (!fs.existsSync(abs)) return true;
    return crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex') !== e.hash;
  });

  if (!esHistorico) {
    ok(desajustes.length === 0,
      `sha256-manifest.txt no se declara histórico y ${desajustes.length} de ${entradas.length} entradas no cuadran: `
      + `o lo regeneras, o declaras que es un registro congelado`);
  }
  console.log(`✓ ${entradas.length} entradas; declarado histórico, así que sus ${desajustes.length} desajustes son esperados`);
}

// --- 4. La herramienta viva existe y sella de verdad ---
// Remitir a un verificador que no funcione sería cambiar una mentira por otra.
{
  const hasher = path.join(ROOT, 'tools', 'evidence_hasher.js');
  ok(fs.existsSync(hasher), 'tools/evidence_hasher.js debe existir: es el verificador al que se remite');
  const { spawnSync } = require('child_process');
  const r = spawnSync(process.execPath, [hasher, 'package.json'], { cwd: ROOT, encoding: 'utf8', timeout: 30000 });
  ok(r.status === 0, `evidence_hasher.js debe sellar un archivo real, salió con ${r.status}`);
  const real = crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'package.json'))).digest('hex');
  ok((r.stdout || '').includes(real),
    'el manifiesto vivo debe contener el sha256 real del archivo sellado, no uno inventado');
  console.log('✓ evidence_hasher.js sella el árbol actual con hashes reales');
}

// --- 5. El paquete publicado no lleva la portada ---
// La landing page se movió a docs/site/, y docs/ viaja en el tarball: sin excluirla,
// cada consumidor se descargaba una página web que no va a abrir jamás.
{
  const pkg = JSON.parse(leer('package.json'));
  const sitio = path.join(ROOT, 'docs', 'site');
  if (fs.existsSync(sitio)) {
    ok((pkg.files || []).includes('!docs/site/'),
      'docs/site/ es la portada: docs/ viaja en el paquete, así que hay que excluirla explícitamente');
    console.log('✓ la portada queda fuera del tarball y los docs .md siguen dentro');
  } else {
    console.log('✓ no hay docs/site/ que excluir');
  }
}

// --- 6. Ningún prompt ilustra con rutas que ya no existen ---
// Un ejemplo que cita un directorio inexistente enseña al agente a inventar rutas.
{
  const dirs = [path.join(ROOT, '.agents', 'workflows'), path.join(ROOT, '.claude', 'commands')];
  const fantasmas = [];
  for (const dir of dirs) {
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md'))) {
      const texto = fs.readFileSync(path.join(dir, f), 'utf8');
      // Solo rutas entre acentos graves que parezcan un directorio del repositorio.
      for (const m of texto.matchAll(/`((?:tools|docs|policies|schemas|core|adapters|examples|phases|bin)\/[A-Za-z0-9_./-]*)`/g)) {
        const ruta = m[1].replace(/\/$/, '');
        if (!fs.existsSync(path.join(ROOT, ruta))) {
          fantasmas.push(`${path.basename(dir)}/${f} cita ${m[1]}`);
        }
      }
    }
  }
  ok(fantasmas.length === 0, `prompts que citan rutas inexistentes:\n  - ${fantasmas.join('\n  - ')}`);
  console.log('✓ ningún workflow ilustra con rutas fantasma');
}

console.log(`\n=== AX-F-018 PASS (${n} comprobaciones) ===`);
