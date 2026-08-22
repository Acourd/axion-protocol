/**
 * Verifica que ninguna superficie informativa contradiga a la
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

assert.deepStrictEqual(conflictos, [], 'conflictos de autoridad detectados:\n  - ' + conflictos.join('\n  - '));
console.log('PASS — sin contradicción entre documentación normativa, contenido real e interfaces');
