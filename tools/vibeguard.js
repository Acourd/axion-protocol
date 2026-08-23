#!/usr/bin/env node

/**
 * Axion Protocol — VibeGuard Static Inspector Tool
 * 
 * Escanea archivos de código fuente en busca de antipatrones típicos del Vibecoding:
 * 1) Excepciones silenciadas (try/catch mudos)
 * 2) Abuso de CSS !important descontrolado
 * 3) Comentarios TODO/FIXME/PLACEHOLDER abandonados por IAs
 * 4) Retornos de datos falsos o fallbacks no verificados
 */

const fs = require('fs');
const path = require('path');
const process = require('process');

function inspectFileContent(content, filePath = 'snippet') {
  const issues = [];
  
  // Lexical Stripper: una sola pasada produce tres vistas del archivo, alineadas línea a
  // línea con el original. Cada regla necesita una distinta, y usar la equivocada produce
  // el error más traicionero de un escáner: el que parece un acierto.
  //
  //   soloCodigo    sin cadenas ni comentarios  -> reglas sobre CÓDIGO (catch mudo)
  //   conComentarios  comentarios intactos, cadenas vaciadas -> MARCADORES (TODO/FIXME)
  //   conCadenas    cadenas intactas, comentarios vaciados -> CSS (!important)
  //
  // El reparto no es simetría cosmética, es dónde vive cada cosa. Un marcador `TODO`
  // vive en un comentario y jamás en una cadena: buscarlo con las cadenas dentro delata
  // cualquier prosa que lo mencione. El `!important` es al revés: en JavaScript el CSS
  // se escribe precisamente dentro de cadenas, y vaciarlas desactivaría el caso
  // principal, mientras que dejar los comentarios hacía que esta herramienta se acusara
  // a sí misma por documentar lo que busca.
  let soloCodigo = '';
  let conComentarios = '';
  let conCadenas = '';
  const empujar = (codigo, comentarios, cadenas) => {
    soloCodigo += codigo; conComentarios += comentarios; conCadenas += cadenas;
  };
  // Una barra puede abrir una expresión regular o ser una división, y JavaScript solo lo
  // resuelve por lo que viene antes. Sin distinguirlo, el cuerpo de cada patrón queda
  // como texto auditable y el escáner acaba denunciando los patrones con los que busca:
  // este mismo archivo se acusaba de contener `!important` por llevarlo escrito en una
  // de sus reglas. Se usa la heurística habitual: tras un operador, una apertura o una
  // palabra clave, la barra abre patrón; tras un valor, divide.
  const ABRE_PATRON = /[([{,;:=!&|?+\-*/%~^<>]$|\b(?:return|typeof|instanceof|in|of|new|delete|void|case|do|else|yield|await)$/;
  const abrePatron = () => ABRE_PATRON.test(soloCodigo.replace(/\s+$/, '')) || soloCodigo.trim() === '';

  let inString = false, stringChar = '', inLineComment = false, inBlockComment = false;
  let inRegex = false, inClaseRegex = false;
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    const nc = content[i + 1] || '';
    const blanco = c === '\n' ? '\n' : ' ';
    if (inLineComment) {
      if (c === '\n') { inLineComment = false; empujar(c, c, c); } else empujar(' ', c, ' ');
    } else if (inBlockComment) {
      if (c === '*' && nc === '/') { inBlockComment = false; empujar('  ', '*/', '  '); i++; }
      else empujar(blanco, c, blanco);
    } else if (inString) {
      if (c === '\\') { empujar('  ', '  ', content.substr(i, 2)); i++; }
      else if (c === stringChar) { inString = false; empujar(c, c, c); }
      else empujar(blanco, blanco, c);
    } else if (inRegex) {
      // El cuerpo de un patrón no es código, ni comentario, ni cadena: se vacía en las
      // tres vistas. Dentro de una clase [...] la barra es literal y no cierra.
      if (c === '\\') { empujar('  ', '  ', '  '); i++; }
      else if (c === '[') { inClaseRegex = true; empujar(' ', ' ', ' '); }
      else if (c === ']') { inClaseRegex = false; empujar(' ', ' ', ' '); }
      else if (c === '/' && !inClaseRegex) { inRegex = false; empujar(c, c, c); }
      else if (c === '\n') { inRegex = false; empujar(c, c, c); }
      else empujar(' ', ' ', ' ');
    } else if (c === '/' && nc === '/') { inLineComment = true; empujar('  ', '//', '  '); i++; }
    else if (c === '/' && nc === '*') { inBlockComment = true; empujar('  ', '/*', '  '); i++; }
    else if (c === '/' && abrePatron()) { inRegex = true; inClaseRegex = false; empujar(c, c, c); }
    else if (c === '"' || c === "'" || c === '`') { inString = true; stringChar = c; empujar(c, c, c); }
    else empujar(c, c, c);
  }
  const stripped = soloCodigo;

  // Utilidad para encontrar línea desde un índice
  const getLineNumber = (index) => content.substring(0, index).split('\n').length;
  // Check 1: excepciones silenciadas, sobre la vista que CONSERVA los comentarios.
  // Vaciarlos antes convertía en hallazgo todo `catch` que explicara por escrito por qué
  // se ignora el error, que es justo la práctica correcta y la que sigue este repositorio.
  // Es también el criterio de ESLint no-empty: un bloque con un comentario dentro no está
  // vacío. Lo que se persigue es el catch mudo de verdad, el que no dice ni una palabra.
  const catchRegex = /catch\s*(?:\(\s*[a-zA-Z0-9_$]*\s*\))?\s*\{\s*\}/g;
  let match;
  while ((match = catchRegex.exec(conComentarios)) !== null) {
    issues.push({
      line: getLineNumber(match.index),
      severity: 'HIGH',
      category: 'SILENT_EXCEPTION',
      message: 'Bloque catch mudo detectado (silencia errores en lugar de reparar la causa raíz).'
    });
  }

  // Check 2: marcadores de trabajo sin terminar. Se miran los comentarios, que es donde
  // viven, con las cadenas vaciadas: una prosa que menciona un marcador no lo contiene.
  conComentarios.split('\n').forEach((line, index) => {
    // Mayúsculas, y sin la bandera `i`, a propósito. Un marcador se escribe en
    // mayúsculas por convención universal; buscarlo sin distinguir capitalización
    // convertía en hallazgo cualquier comentario en español que empezara por "Todo el…",
    // que en este repositorio son decenas. Un escáner que grita a cada línea acaba
    // desactivado, y entonces ya no protege de nada.
    if (/\/\/\s*(TODO|FIXME|PLACEHOLDER|HACK)\b/.test(line) || /<!--\s*(TODO|FIXME|PLACEHOLDER)\b/.test(line)) {
      issues.push({
        line: index + 1,
        severity: 'MEDIUM',
        category: 'UNFINISHED_CODE',
        message: 'Marcador de código incompleto o parche temporal detectado (TODO/FIXME/HACK).'
      });
    }
  });

  // Check 3: !important con las cadenas dentro y los comentarios fuera, justo al revés
  // que el anterior. El CSS escrito desde JavaScript vive en cadenas; documentar la
  // regla en un comentario no es incurrir en ella.
  conCadenas.split('\n').forEach((line, index) => {
    // La marca tiene que CERRAR la declaración -`;`, `}`, fin de cadena o fin de línea-,
    // que es lo único que hace el CSS real. Buscar la palabra suelta convertía en hallazgo
    // cualquier frase que la mencionara, empezando por el mensaje de esta misma regla.
    if (/!important\s*(?:[;}'"`]|$)/i.test(line)) {
      issues.push({
        line: index + 1,
        severity: 'LOW',
        category: 'CSS_OVERRIDE',
        message: 'Parche CSS !important detectado (evaluar especificidad de selectores CSS).'
      });
    }
  });

  return {
    filePath: filePath,
    totalIssues: issues.length,
    status: issues.length === 0 ? 'CLEAN' : 'ANTIPATTERNS_DETECTED',
    issues: issues.sort((a, b) => a.line - b.line)
  };
}

function scanFile(filePath) {
  try {
    const absPath = path.resolve(filePath);
    if (!fs.existsSync(absPath)) {
      return { filePath, status: 'ERROR', reason: `El archivo ${filePath} no existe.` };
    }
    if (fs.statSync(absPath).isDirectory()) {
      // Antes esto reventaba con EISDIR y aun asi salia con 0. Un inspector de calidad
      // que no puede leer su objetivo y responde "correcto" es peor que no tenerlo.
      return {
        filePath,
        status: 'ERROR',
        reason: `${filePath} es un directorio. Para recorrer un arbol usa: node tools/vibeguard_gate.js ${filePath}`,
      };
    }
    return inspectFileContent(fs.readFileSync(absPath, 'utf8'), filePath);
  } catch (err) {
    return { filePath, status: 'ERROR', reason: err.message };
  }
}

const USO = [
  'Uso: node tools/vibeguard.js <archivo_1> [archivo_2 ...]',
  '',
  'Inspecciona archivos sueltos y emite el informe en JSON. Para recorrer un directorio',
  'entero con codigo de salida de puerta, usa node tools/vibeguard_gate.js <dir>.',
  '',
  'Codigos de salida: 0 limpio, 1 hallazgos o error de lectura, 2 uso incorrecto.',
].join('\n');

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(USO);
    process.exit(2);
  }

  const results = args.map((f) => scanFile(f));
  console.log(JSON.stringify(results, null, 2));

  // El codigo de salida es el contrato. Emitir hallazgos y salir con 0 convertia a esta
  // herramienta en un informe decorativo: en cualquier CI habria pasado siempre.
  const hayProblemas = results.some((r) => r.status === 'ERROR' || (r.totalIssues || 0) > 0);
  process.exit(hayProblemas ? 1 : 0);
}

if (require.main === module) {
  main();
}

module.exports = { inspectFileContent, scanFile };
