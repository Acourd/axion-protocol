/**
 * AXION AUDIT — Fase A — Experimento E8/E9: instalador y asistente Git
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const AX = path.join(__dirname, 'axion');
const line = (t) => console.log('\n===== ' + t + ' =====');

// ---------------------------------------------------------------- E8a
line('E8a · INSTALADOR — sobrescritura de configuracion preexistente del usuario');
const victima = path.join(__dirname, 'proyecto_victima');
fs.rmSync(victima, { recursive: true, force: true });
fs.mkdirSync(path.join(victima, '.agents'), { recursive: true });

const CLAUDE_ORIGINAL = '# Instrucciones del proyecto del usuario\n\n- No toques la carpeta /produccion\n- Claves en .env.local\n';
const AGENTS_ORIGINAL = '# Reglas propias del equipo\n\n- Revisar siempre con el arquitecto\n';
fs.writeFileSync(path.join(victima, 'CLAUDE.md'), CLAUDE_ORIGINAL, 'utf8');
fs.writeFileSync(path.join(victima, '.agents', 'AGENTS.md'), AGENTS_ORIGINAL, 'utf8');
console.log('  CLAUDE.md del usuario antes .....:', JSON.stringify(fs.readFileSync(path.join(victima, 'CLAUDE.md'), 'utf8').slice(0, 45)) + '...');

const { runInstallation } = require(path.join(AX, 'install.js'));
const r8 = runInstallation(victima);

const despues = fs.readFileSync(path.join(victima, 'CLAUDE.md'), 'utf8');
console.log('  CLAUDE.md del usuario despues ...:', JSON.stringify(despues.slice(0, 45)) + '...');
console.log('  contenido original conservado ...:', despues.includes('No toques la carpeta /produccion'));
console.log('  AGENTS.md original conservado ...:', fs.readFileSync(path.join(victima, '.agents', 'AGENTS.md'), 'utf8').includes('Revisar siempre con el arquitecto'));
console.log('  copia de respaldo creada ........:', fs.readdirSync(victima).some(f => /\.(bak|backup|orig)$/i.test(f)));
console.log('  valor devuelto ..................:', JSON.stringify(r8));

// ---------------------------------------------------------------- E8b
line('E8b · INSTALADOR — filesCount declarado frente a archivos realmente copiados');
const parcial = path.join(__dirname, 'origen_incompleto');
fs.rmSync(parcial, { recursive: true, force: true });
fs.cpSync(AX, parcial, { recursive: true });
// se eliminan 5 de las 11 fuentes
for (const f of ['tools/preflight.js', 'tools/evidence_hasher.js', 'tools/vibeguard.js', 'CLAUDE.md', 'adapters/prompt_bridge.json']) {
  fs.rmSync(path.join(parcial, f), { force: true });
}
const destino = path.join(__dirname, 'destino_incompleto');
fs.rmSync(destino, { recursive: true, force: true });
const out = execSync(`node ${JSON.stringify(path.join(parcial, 'install.js'))} --target ${JSON.stringify(destino)}`, { encoding: 'utf8' });
const copiados = out.split('\n').filter(l => l.includes('✓')).length;
const { runInstallation: runParcial } = require(path.join(parcial, 'install.js'));
fs.rmSync(destino, { recursive: true, force: true });
const r8b = runParcial(destino);
console.log('  archivos realmente inyectados ...:', copiados);
console.log('  filesCount reportado ............:', r8b.filesCount);
console.log('  status reportado ................:', r8b.status);
console.log('  mensaje final del instalador ....: "Instalación completada exitosamente."');
console.log('  schemas/ creado pero vacio ......:', fs.existsSync(path.join(destino, 'schemas')) && fs.readdirSync(path.join(destino, 'schemas')).length === 0);

// ---------------------------------------------------------------- E8c
line('E8c · INSTALADOR — ejecucion en el propio directorio del proyecto (node install.js)');
const espejo = path.join(__dirname, 'espejo');
fs.rmSync(espejo, { recursive: true, force: true });
fs.cpSync(AX, espejo, { recursive: true });
const antes = fs.statSync(path.join(espejo, 'CLAUDE.md')).size;
let veredicto;
try {
  execSync('node install.js', { cwd: espejo, encoding: 'utf8' });
  veredicto = 'sin excepcion';
} catch (e) {
  veredicto = 'EXCEPCION: ' + String(e.message).split('\n').find(l => l.includes('Error')) ;
}
console.log('  resultado .......:', veredicto);
console.log('  CLAUDE.md bytes antes/despues:', antes, '/', fs.existsSync(path.join(espejo, 'CLAUDE.md')) ? fs.statSync(path.join(espejo, 'CLAUDE.md')).size : 'BORRADO');

// ---------------------------------------------------------------- E9
line('E9 · GIT ASSISTANT — mensaje de respaldo con commits sin publicar');
const repo = path.join(__dirname, 'repo_prueba');
fs.rmSync(repo, { recursive: true, force: true });
fs.mkdirSync(repo, { recursive: true });
const g = (c) => execSync('git ' + c, { cwd: repo, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
g('init -q');
g('config user.email a@b.test'); g('config user.name Auditor');
fs.writeFileSync(path.join(repo, 'trabajo_de_3_meses.txt'), 'contenido valioso', 'utf8');
g('add -A'); g('commit -q -m "trabajo importante"');
g('remote add origin https://gitlab.example.test/usuario/proyecto.git');   // remoto que NO es GitHub y nunca recibio push

const { getGitStatusDiagnosis } = require(path.join(AX, 'tools', 'git_assistant.js'));
const d = getGitStatusDiagnosis({ cwd: repo });
console.log('  commits locales sin publicar ....:', g('rev-list --count HEAD').trim());
console.log('  remoto configurado ..............:', g('remote get-url origin').trim());
console.log('  push realizado alguna vez .......: no');
console.log('  --> status ......................:', d.status);
console.log('  --> mensaje al usuario ..........:', JSON.stringify(d.simpleMessage));
console.log('  --> sugerencia ..................:', JSON.stringify(d.suggestion));

line('E9b · GIT ASSISTANT — diagnostico cuando el directorio no existe');
const d2 = getGitStatusDiagnosis({ cwd: path.join(__dirname, 'ruta_que_no_existe_123') });
console.log('  status ..:', d2.status);
console.log('  mensaje .:', JSON.stringify(d2.simpleMessage));
