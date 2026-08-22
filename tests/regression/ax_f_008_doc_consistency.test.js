/**
 * Regresión AX-F-008 — Ninguna superficie informativa puede contradecir a la
 * documentación normativa sobre la existencia del runtime o su enforcement.
 * Autoridad: policies/authority.yaml -> conflict_behavior: FAIL_CLOSED;
 * informative_only incluye reports y examples. GOVERNANCE.md manda sobre la portada.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const leer = (p) => fs.readFileSync(p, 'utf8');
const contar = (dir, ext) => fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith(ext)).length : 0;

const conflictos = [];

// --- 1. Un README no puede negar la existencia de lo que su directorio contiene ---
const toolsJs = contar(path.join(ROOT, 'tools'), '.js');
const toolsReadme = leer(path.join(ROOT, 'tools', 'README.md'));
if (toolsJs > 0 && /no contiene herramientas ejecutables/i.test(toolsReadme)) {
  conflictos.push(`tools/README.md niega ejecutables pero tools/ contiene ${toolsJs} módulos .js`);
}

const testsJs = contar(path.join(ROOT, 'tests'), '.test.js');
const testsReadme = leer(path.join(ROOT, 'tests', 'README.md'));
if (testsJs > 0 && /no hay runtime ni suite ejecutable/i.test(testsReadme)) {
  conflictos.push(`tests/README.md niega la suite pero tests/ contiene ${testsJs} archivos ejecutables`);
}

const adapters = fs.readdirSync(path.join(ROOT, 'adapters')).filter(f => f.endsWith('.json')).length;
const adaptersReadme = leer(path.join(ROOT, 'adapters', 'README.md'));
if (adapters > 0 && /sin código ejecutable/i.test(adaptersReadme) && /no existe ningún adaptador implementado/i.test(adaptersReadme)) {
  conflictos.push(`adapters/README.md niega el adaptador pero adapters/ contiene ${adapters} archivo(s)`);
}

// --- 2. Las interfaces no pueden declarar estados de promoción que la gobernanza no concede ---
const gobernanza = leer(path.join(ROOT, 'GOVERNANCE.md'));
const esExperimental = /EXPERIMENTAL/.test(gobernanza) && /No adquiere enforcement/i.test(gobernanza);

const index = leer(path.join(ROOT, 'index.html'));
for (const afirmacion of ['VERIFIED_STABLE', 'GOBERNANZA_ACTIVA', 'Todos los motores verificados en estado PASS']) {
  if (esExperimental && index.includes(afirmacion)) {
    conflictos.push(`index.html declara "${afirmacion}" mientras GOVERNANCE.md declara EXPERIMENTAL sin enforcement`);
  }
}

const dashboard = leer(path.join(ROOT, 'tools', 'dashboard.html'));
if (esExperimental && /Protección Activa \(Fail-Closed\)/.test(dashboard)) {
  conflictos.push('tools/dashboard.html declara "Protección Activa (Fail-Closed)" sin enforcement técnico');
}

// --- 3. Una superficie que simula resultados debe declararse como simulación ---
if (/Ejecutando tools\/preflight\.js/.test(dashboard) && !/SIMULACI[ÓO]N|DEMOSTRACI[ÓO]N/i.test(dashboard)) {
  conflictos.push('tools/dashboard.html emite salida de preflight sin declararse simulación');
}

if (/preflight|term-output/i.test(index) && !/SIMULACI[ÓO]N|SIMULACION/i.test(index)) {
  conflictos.push('index.html reproduce salida de herramientas sin declararse simulación');
}

// --- 4. Las portadas no pueden prometer garantías que la gobernanza no concede ---
// El README de la raíz e index.html son las dos primeras superficies que ve un tercero,
// y ambas quedaban fuera de esta auditoría: index.html solo se comprobaba contra tres
// cadenas literales, así que cualquier promesa redactada de otra forma pasaba limpia.
// Mientras GOVERNANCE.md declare EXPERIMENTAL sin enforcement, ninguna de las dos puede
// afirmar garantía absoluta.
// El proyecto publica su portada en dos idiomas. Ambas son superficies publicas, asi
// que ambas se auditan, y los patrones cubren los dos idiomas: si el guardian solo
// entendiera espanol, traducir el README seria una forma silenciosa de esquivarlo.
const readme = leer(path.join(ROOT, 'README.md'));
const readmeEs = leer(path.join(ROOT, 'README.es.md'));

// Los patrones cubren los dos idiomas de la portada. Si el guardian solo entendiera
// espanol, traducir el README seria una forma silenciosa de esquivarlo.
const promesasAbsolutas = [
  [/guarantees that only|ensures that only/i, 'guarantee of execution exclusivity'],
  [/zero[- ]maintenance/i, 'zero maintenance'],
  [/no hallucinations|hallucination[- ]free/i, 'no hallucinations'],
  [/zero errors/i, 'zero errors'],
  [/absolute custody/i, 'absolute custody'],
  [/impossible to (?:break|bypass|circumvent)/i, 'inviolability'],
  [/garantiza que\s+s[óo]lo|garantiza que\s+solo/i, 'garantía de exclusividad de ejecución'],
  [/cero mantenimiento/i, '"cero mantenimiento"'],
  [/sin alucinaciones/i, '"sin alucinaciones"'],
  [/a[íi]sla las alucinaciones/i, '"aísla las alucinaciones"'],
  [/cero errores/i, '"cero errores"'],
  [/custodia absoluta/i, '"custodia absoluta"'],
  [/imposible de (?:vulnerar|romper|eludir)/i, 'inviolabilidad'],
  [/100\s*%\s*(?:seguro|fiable)/i, 'seguridad total'],
];

const portadas = [['README.md', readme], ['README.es.md', readmeEs], ['index.html', index]];
for (const [nombre, texto] of portadas) {
  for (const [patron, etiqueta] of promesasAbsolutas) {
    if (esExperimental && patron.test(texto)) {
      conflictos.push(`${nombre} afirma ${etiqueta} mientras GOVERNANCE.md declara EXPERIMENTAL sin enforcement`);
    }
  }

  // Debe declarar el estado experimental, no solo evitar prometer de más.
  if (esExperimental && !/experimental/i.test(texto)) {
    conflictos.push(`${nombre} no declara el estado EXPERIMENTAL que GOVERNANCE.md exige`);
  }

  // Una portada pública no puede depender de rutas del disco de su autor.
  const rutaLocal = texto.match(/file:\/\/\/[A-Za-z]:\/[^\s)"']+/);
  if (rutaLocal) {
    conflictos.push(`${nombre} enlaza una ruta local absoluta: ${rutaLocal[0]}`);
  }
}

// Ambas portadas deben acotar que el enforcement no es global, cada una en su idioma.
const acotaInterceptacion = /no intercepta|sin interceptaci[óo]n|no existe interceptaci[óo]n|does not intercept|no global interception/i;
for (const [nombre, texto] of [['README.md', readme], ['README.es.md', readmeEs]]) {
  if (esExperimental && !acotaInterceptacion.test(texto)) {
    conflictos.push(`${nombre} no acota que el enforcement no intercepta automáticamente los comandos`);
  }
}

// La documentacion de arquitectura no puede negar lo que tools/ contiene. Decia que la
// arquitectura no estaba implementada mientras ROADMAP la marcaba hecha y tools/ traia
// modulos ejecutables; ax_f_008 no lo veia porque solo auditaba los README de directorio.
const arquitectura = leer(path.join(ROOT, "docs", "architecture.md"));
const toolsEjecutables = contar(path.join(ROOT, "tools"), ".js");
if (toolsEjecutables > 0 && /arquitectura no est[aá] implementada/i.test(arquitectura)) {
  conflictos.push(`docs/architecture.md niega la implementacion pero tools/ contiene ${toolsEjecutables} modulos .js`);
}

// Los adaptadores tambien son superficie publica. El puente de prompts declaraba
// "cero mantenimiento", la misma promesa que se habia retirado del README y de la web:
// sobrevivio un nivel mas abajo porque esta auditoria no miraba en adapters/.
const puente = leer(path.join(ROOT, 'adapters', 'prompt_bridge.json'));
for (const [patron, etiqueta] of promesasAbsolutas) {
  if (esExperimental && patron.test(puente)) {
    conflictos.push(`adapters/prompt_bridge.json afirma ${etiqueta} mientras GOVERNANCE.md declara EXPERIMENTAL sin enforcement`);
  }
}

// La licencia declarada en la portada debe ser la que el repositorio realmente lleva.
const licencia = leer(path.join(ROOT, 'LICENSE'));
const esApache = /Apache License/i.test(licencia);
for (const [nombre, texto] of [['README.md', readme], ['README.es.md', readmeEs]]) {
  if (esApache && /Licencia MIT|MIT License/i.test(texto)) {
    conflictos.push(`${nombre} declara licencia MIT pero LICENSE es Apache-2.0`);
  }
}

assert.deepStrictEqual(conflictos, [], 'conflictos de autoridad detectados:\n  - ' + conflictos.join('\n  - '));
console.log('PASS AX-F-008 — sin contradicción entre documentación normativa, contenido real e interfaces');
