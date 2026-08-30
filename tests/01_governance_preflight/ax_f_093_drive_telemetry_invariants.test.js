'use strict';

/**
 * Axion Protocol — Invariantes de Telemetría en Vivo e Instrumentación de /drive.
 *
 * Valida de forma estricta:
 * 1. Inicialización y captura determinista de snapshots de memoria y marcas de tiempo.
 * 2. Registro secuencial de fases de ejecución con duración calculada en milisegundos.
 * 3. Almacenamiento estructurado de eventos intermedios (AST, Fuzzing, Atestación).
 * 4. Emisión de informe JSON inmutable sellado con digest SHA-256 en .axion/state/.
 * 5. Generación de dashboard interactivo en formato HTML autónomo.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const DriveTelemetry = require('../../tools/drive_telemetry.js');

console.log('=== AX-F-093 Invariantes de Telemetría en Vivo de /drive ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const telemetry = new DriveTelemetry(null, ROOT);

// 1. Validar inicialización
assert.ok(typeof telemetry.sessionId === 'string' && telemetry.sessionId.length > 0, 'Debe generar sessionId');
assert.ok(telemetry.initialMemory && telemetry.initialMemory.heapUsedMb > 0, 'Debe capturar memoria inicial');
console.log(`✓ Telemetría inicializada para sesión: ${telemetry.sessionId}`);

// 2. Instrumentar fases de prueba
const idx1 = telemetry.startPhase('Phase 01: Preflight & Safety Analysis');
telemetry.recordEvent('PREFLIGHT_PASS', { verdict: 'ALLOW', commands: 12 });
const p1 = telemetry.endPhase(idx1, 'COMPLETED');

assert.strictEqual(p1.index, 1, 'Índice de fase debe ser 1');
assert.strictEqual(p1.status, 'COMPLETED', 'Estado de fase debe ser COMPLETED');
assert.ok(typeof p1.durationMs === 'number', 'Debe calcular la duración en ms');

const idx2 = telemetry.startPhase('Phase 02: Deterministic Verification');
telemetry.recordEvent('SUITE_PASS', { suitesCount: 110, failures: 0 });
const p2 = telemetry.endPhase(idx2, 'COMPLETED');
assert.strictEqual(p2.index, 2, 'Índice de fase debe ser 2');

console.log(`✓ 2 fases instrumentadas y registradas con duraciones y memoria por etapa`);

// 3. Finalizar y generar reportes
const report = telemetry.finalize('SUCCESS');
assert.strictEqual(report.overallStatus, 'SUCCESS', 'Estado global debe ser SUCCESS');
assert.strictEqual(report.phaseCount, 2, 'Debe registrar exactamente 2 fases');
assert.strictEqual(report.eventCount, 2, 'Debe registrar 2 eventos');
assert.ok(report.digest && report.digest.length === 64, 'Debe emitir digest SHA-256 de 64 caracteres');
assert.ok(fs.existsSync(report.reportPath), 'El archivo JSON de telemetría debe existir en disco');
console.log(`✓ Reporte de telemetría sellado con SHA-256 en: ${path.basename(report.reportPath)}`);

// 4. Generar dashboard HTML
const htmlPath = telemetry.generateHtmlDashboard(report);
assert.ok(fs.existsSync(htmlPath), 'El dashboard HTML debe existir en disco');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');
assert.ok(htmlContent.includes(telemetry.sessionId), 'El HTML debe contener el sessionId');
assert.ok(htmlContent.includes('Axion Drive Telemetry Dashboard'), 'El HTML debe contener el título del dashboard');
console.log(`✓ Dashboard HTML visual generado en: ${path.basename(htmlPath)}`);

console.log('\nPASS AX-F-093 — Invariantes de telemetría en vivo de /drive verificados al 100%.');
