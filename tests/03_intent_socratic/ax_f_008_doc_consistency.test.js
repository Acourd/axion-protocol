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

// La portada no viaja en el paquete publicado -y no debe: un consumidor no instala una
// landing page-. Exigirla igualmente hacia fallar `axion test` en todo proyecto instalado.
// El discriminante es .git. En el repositorio puede residir en docs/site/ o en la raíz.
const EN_REPOSITORIO = fs.existsSync(path.join(ROOT, '.git'));
const SITE_DIR = fs.existsSync(path.join(ROOT, 'docs', 'site', 'index.html'))
  ? path.join(ROOT, 'docs', 'site')
  : ROOT;

if (EN_REPOSITORIO) {
  for (const rel of ['index.html', 'script.js']) {
    if (!fs.existsSync(path.join(SITE_DIR, rel))) {
      conflictos.push(`falta ${rel} en ${SITE_DIR}: la auditoria de la portada quedaria sin objeto`);
    }
  }
}

const index = EN_REPOSITORIO && fs.existsSync(path.join(SITE_DIR, 'index.html'))
  ? leer(path.join(SITE_DIR, 'index.html'))
  : null;
if (index !== null) {
  for (const afirmacion of ['VERIFIED_STABLE', 'GOBERNANZA_ACTIVA', 'Todos los motores verificados en estado PASS']) {
    if (esExperimental && index.includes(afirmacion)) {
      conflictos.push(`index.html declara "${afirmacion}" mientras GOVERNANCE.md declara EXPERIMENTAL sin enforcement`);
    }
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

if (index !== null && /preflight|term-output/i.test(index) && !/SIMULACI[ÓO]N|SIMULACION/i.test(index)) {
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

// index puede ser null fuera del repositorio; se filtra en vez de dejar que un null
// se convierta en la cadena "null" y pase por texto auditado.
const portadas = [['README.md', readme], ['README.es.md', readmeEs], ['index.html', index]]
  .filter(([, texto]) => typeof texto === 'string');
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

// --- 5. Contrato canónico de superficie de la beta ---
// Comprobaciones textuales y estables: no miden comportamiento, solo impiden que las
// superficies informativas vuelvan a declarar el contrato anterior.
const DOMINIOS_PRUEBA = [
  '01_governance_preflight',
  '02_cryptography_attestation',
  '03_intent_socratic',
  '04_state_recovery',
  '05_adversarial_resilience',
];

// 5a. tests/README.md documenta los 5 dominios y un total que cuadra con el árbol.
for (const dominio of DOMINIOS_PRUEBA) {
  if (!testsReadme.includes(dominio)) {
    conflictos.push(`tests/README.md no documenta el dominio ${dominio}`);
  }
}
const suitesEnDisco = DOMINIOS_PRUEBA.reduce(
  (total, dominio) => total + contar(path.join(ROOT, 'tests', dominio), '.test.js'), 0);
const declaradasTests = testsReadme.match(/(\d+)\s+suites\b/);
if (!declaradasTests) {
  conflictos.push('tests/README.md debe declarar el total de suites');
} else if (parseInt(declaradasTests[1], 10) !== suitesEnDisco) {
  conflictos.push(`tests/README.md declara ${declaradasTests[1]} suites pero en disco hay ${suitesEnDisco}`);
}

// 5b. Los dos manuales de comandos declaran el contrato real de superficies.
for (const manual of ['docs/COMMANDS.md', 'docs/COMMANDS.es.md']) {
  const texto = leer(path.join(ROOT, manual));
  if (!/10[^\n]{0,100}\bCLI\b/i.test(texto)) {
    conflictos.push(`${manual} debe declarar cuántos comandos tienen subcomando CLI`);
  }
  if (!/prompt-only/i.test(texto)) {
    conflictos.push(`${manual} debe declarar que /debug y /review son prompt-only`);
  }
  if (/All 12 commands are accessible|Los 12 comandos operan de manera idéntica/i.test(texto)) {
    conflictos.push(`${manual} conserva la afirmación de paridad CLI de los 12 comandos`);
  }
}

// 5c. La guía OpenCode no fija tamaños estáticos ni apunta a una ruta inexistente.
const docOpenCode = leer(path.join(ROOT, 'docs', 'OPENCODE_CODEX_COMPATIBILITY.md'));
if (/\d+(?:\.\d+)?\s*(?:KB|kB)\b/.test(docOpenCode)) {
  conflictos.push('docs/OPENCODE_CODEX_COMPATIBILITY.md declara un tamaño estático de bundle');
}
if (!/opencode\.json/.test(docOpenCode) || /\.opencode\/opencode\.json/.test(docOpenCode)) {
  conflictos.push('docs/OPENCODE_CODEX_COMPATIBILITY.md debe citar el opencode.json de la raíz');
}
if (/\b80\s*%/.test(docOpenCode)) {
  conflictos.push('docs/OPENCODE_CODEX_COMPATIBILITY.md declara una cifra de ahorro sin benchmark versionado');
}

// 5d. tools/README.md se declara índice parcial, no catálogo exhaustivo.
if (!/índice parcial/i.test(toolsReadme) || !/no\s+un\s+cat[aá]logo\s+exhaustivo/i.test(toolsReadme)) {
  conflictos.push('tools/README.md debe declararse índice parcial y no catálogo exhaustivo');
}

// 5e. Las portadas no declaran métricas estáticas de tamaño o duración.
for (const [nombre, texto] of [['README.md', readme], ['README.es.md', readmeEs]]) {
  if (/\/critic\b/.test(texto)) {
    conflictos.push(`${nombre} cita /critic como prompt canónico y no lo es`);
  }
  if (/\d+(?:\.\d+)?\s*kB\b/i.test(texto)) {
    conflictos.push(`${nombre} declara un tamaño estático de paquete`);
  }
  if (/\d+(?:\.\d+)?\s*s\b[^\n]{0,40}workers?/i.test(texto)) {
    conflictos.push(`${nombre} declara una duración estática de la suite`);
  }
}

assert.deepStrictEqual(conflictos, [], 'conflictos de autoridad detectados:\n  - ' + conflictos.join('\n  - '));
console.log('PASS AX-F-008 — sin contradicción entre documentación normativa, contenido real e interfaces');
console.log(`PASS AX-F-008 (superficies beta) — 5 dominios y ${suitesEnDisco} suites documentados, paridad CLI acotada, sin métricas estáticas`);
