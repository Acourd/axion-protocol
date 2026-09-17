#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Cobertura nativa (V8) sin dependencias.
 *
 * Metodología:
 * 1. Ejecuta la suite completa con NODE_V8_COVERAGE en un directorio temporal.
 * 2. Fusiona los reportes de todos los procesos hijos por URL de archivo.
 * 3. Cuenta como cubierta una línea si algún rango con count>0 la intersecta.
 *    El denominador son las líneas con contenido no vacío (incluye comentarios y
 *    llaves: método conservador y reproducible).
 * 4. Exige los umbrales explícitos de tools/coverage_thresholds.json por archivo
 *    crítico y publica la tabla completa.
 *
 * Uso: node tools/coverage_report.js [--report <ruta.json>]
 */

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const THRESHOLDS_PATH = path.join(__dirname, 'coverage_thresholds.json');

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function lineStarts(source) {
  const starts = [0];
  for (let i = 0; i < source.length; i++) {
    if (source[i] === '\n') starts.push(i + 1);
  }
  return starts;
}

function lineasCubiertas(source, ranges) {
  const starts = lineStarts(source);
  const totalLineas = starts.length;

  // V8 emite rangos anidados: el rango raíz de cada script suele tener count>0 por el
  // simple hecho de cargarse. La cobertura efectiva de una posición es la del rango
  // MÁS INTERNO que la contiene, por eso se ordenan por span ascendente.
  const ordenados = ranges
    .filter((r) => r && typeof r.startOffset === 'number' && typeof r.endOffset === 'number' && r.endOffset > r.startOffset)
    .map((r) => ({ s: r.startOffset, e: r.endOffset, c: r.count, span: r.endOffset - r.startOffset }))
    .sort((a, b) => a.span - b.span);

  let cubiertas = 0;
  let conCodigo = 0;

  for (let i = 0; i < totalLineas; i++) {
    const end = i + 1 < totalLineas ? starts[i + 1] : source.length;
    if (source.slice(starts[i], end).trim() === '') continue;
    conCodigo++;

    const off = starts[i];
    let count = null;
    for (const r of ordenados) {
      if (r.s <= off && off < r.e) {
        count = r.c;
        break;
      }
    }
    if (count !== null && count > 0) cubiertas++;
  }

  return { cubiertas, total: conCodigo };
}

function fusionarCobertura(dirCobertura) {
  const porArchivo = new Map(); // ruta abs -> ranges

  const leerReportes = () => {
    porArchivo.clear();
    const files = fs.readdirSync(dirCobertura).filter((f) => f.endsWith('.json'));
    let pendientes = 0;
    for (const f of files) {
      let reporte;
      try {
        reporte = JSON.parse(fs.readFileSync(path.join(dirCobertura, f), 'utf8'));
      } catch (_) {
        pendientes++; // reporte aún en escritura o de un proceso terminado a mitad
        continue;
      }
      for (const entrada of reporte.result || []) {
        if (!entrada.url || !entrada.url.startsWith('file://')) continue;
        let abs = decodeURIComponent(new URL(entrada.url).pathname);
        if (/^\/[A-Za-z]:/.test(abs)) abs = abs.slice(1);
        abs = path.normalize(abs);
        if (!abs.startsWith(ROOT)) continue;
        const acumulado = porArchivo.get(abs) || [];
        for (const fn of entrada.functions || []) {
          for (const r of fn.ranges || []) acumulado.push(r);
        }
        porArchivo.set(abs, acumulado);
      }
    }
    return { pendientes, total: files.length };
  };

  let estado = leerReportes();
  for (let intento = 0; intento < 4 && estado.pendientes > 0; intento++) {
    sleepSync(2000);
    estado = leerReportes();
  }
  if (estado.pendientes > 0) {
    console.warn(`  ADVERTENCIA: ${estado.pendientes} reporte(s) de cobertura quedaron ilegibles de ${estado.total}.`);
  }
  return porArchivo;
}

function leerUmbrales() {
  if (!fs.existsSync(THRESHOLDS_PATH)) return { files: {} };
  return JSON.parse(fs.readFileSync(THRESHOLDS_PATH, 'utf8'));
}

async function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-v8-coverage-'));
  const homeAislado = fs.mkdtempSync(path.join(os.tmpdir(), 'axion-coverage-home-'));
  const env = { ...process.env, NODE_V8_COVERAGE: tmp, USERPROFILE: homeAislado, HOME: homeAislado };

  console.log('=== Cobertura nativa V8 (sin dependencias) ===\n');
  console.log(`Ejecutando la suite con NODE_V8_COVERAGE=${tmp}`);

  const code = await new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(ROOT, 'tests', 'run_all.js'), '--concurrency', '1', '--timeout', '300000'], {
      cwd: ROOT,
      env,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    child.on('close', (c) => {
      const verde = (out.match(/en verde\s*:\s*(\d+)/) || [])[1] || '?';
      const rojo = (out.match(/en rojo\s*:\s*(\d+)/) || [])[1] || '?';
      console.log(`Suite: verde=${verde} rojo=${rojo} exit=${c}`);
      if (c !== 0) {
        for (const linea of out.split('\n').filter((l) => l.includes('FAIL '))) {
          console.log(`  ${linea.trim()}`);
        }
      }
      resolve(c);
    });
  });

  if (code !== 0) {
    console.error('La suite no terminó en verde; la cobertura no se evalúa sobre una corrida roja.');
    fs.rmSync(tmp, { recursive: true, force: true });
    process.exit(2);
  }

  // V8 escribe el reporte al salir cada proceso; se espera a que los últimos
  // archivos (p. ej. el del propio runner) terminen de escribirse antes de fusionar.
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const cobertura = fusionarCobertura(tmp);
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.rmSync(homeAislado, { recursive: true, force: true });

  const umbrales = leerUmbrales();
  const criticos = Object.entries(umbrales.files || {});
  const filas = [];
  let fallos = 0;

  for (const [rel, minimo] of criticos) {
    const abs = path.join(ROOT, rel.split('/').join(path.sep));
    if (!fs.existsSync(abs)) {
      filas.push({ rel, pct: null, minimo, ok: false, motivo: 'archivo ausente' });
      fallos++;
      continue;
    }
    const ranges = cobertura.get(abs) || [];
    const res = lineasCubiertas(fs.readFileSync(abs, 'utf8'), ranges);
    const pct = res.total > 0 ? Number(((res.cubiertas / res.total) * 100).toFixed(1)) : 0;
    const ok = pct >= minimo;
    if (!ok) fallos++;
    filas.push({ rel, pct, cubiertas: res.cubiertas, total: res.total, minimo, ok });
  }

  console.log('\nArchivo crítico                            Líneas        Cobertura  Umbral  Estado');
  console.log('-----------------------------------------------------------------------------------');
  for (const f of filas) {
    const pctTxt = f.pct === null ? '   ?' : `${f.pct.toFixed(1)}%`;
    console.log(`  ${f.rel.padEnd(44)} ${String(f.cubiertas ?? '-').padStart(4)}/${String(f.total ?? '-').padEnd(5)} ${pctTxt.padStart(8)}  ${String(f.minimo).padStart(4)}%  ${f.ok ? 'OK' : 'FALLO'}`);
  }

  const globalRes = { cubiertas: 0, total: 0 };
  for (const [abs, ranges] of cobertura) {
    const rel = path.relative(ROOT, abs).split(path.sep).join('/');
    if (!(rel.startsWith('tools/') || rel.startsWith('bin/') || rel.startsWith('.agents/'))) continue;
    const res = lineasCubiertas(fs.readFileSync(abs, 'utf8'), ranges);
    globalRes.cubiertas += res.cubiertas;
    globalRes.total += res.total;
  }
  const globalPct = globalRes.total > 0 ? ((globalRes.cubiertas / globalRes.total) * 100).toFixed(1) : '0.0';
  console.log(`\nCobertura de líneas global (tools/ + bin/ + .agents/): ${globalPct}% (${globalRes.cubiertas}/${globalRes.total})`);

  const reportePath = (() => {
    const i = process.argv.indexOf('--report');
    return i !== -1 && process.argv[i + 1] ? path.resolve(process.argv[i + 1]) : null;
  })();
  if (reportePath) {
    fs.writeFileSync(reportePath, JSON.stringify({ generadoEn: new Date().toISOString(), global: globalPct, criticos: filas }, null, 2), 'utf8');
    console.log(`Reporte: ${reportePath}`);
  }

  if (fallos > 0) {
    console.error(`\nFAIL: ${fallos} archivo(s) crítico(s) por debajo del umbral.`);
    process.exit(1);
  }
  console.log('\nPASS: umbrales de cobertura de rutas críticas cumplidos.');
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(2);
  });
}

module.exports = { fusionarCobertura, lineasCubiertas, leerUmbrales };
