'use strict';

/**
 * Axion Protocol — Invariantes del Co-Piloto de Sincronización de Memoria en Grafo para /drive.
 *
 * Valida de forma estricta:
 * 1. Registro atómico de desenlaces de misión en el grafo relacional SQLite.
 * 2. Creación de nodos y enlaces semánticos dirigidos (MEASURED_BY, PRODUCED_LESSON).
 * 3. Cálculo matemático de tasa de convergencia histórica e iteraciones promedio.
 * 4. Búsqueda y recuperación contextual de lecciones pasadas.
 * 5. Integración transparente a través de DriveEngine.
 */

const assert = require('assert');
const path = require('path');
const DriveMemoryCopilot = require('../../tools/drive_memory_copilot.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-110 Invariantes del Co-Piloto de Memoria en Grafo para /drive ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const copilot = new DriveMemoryCopilot(ROOT, { inMemory: true });

// 1. Validar registro de desenlace de misión
const outcome = copilot.recordSessionOutcome({
  missionId: 'MISSION_TEST_COPILOT',
  title: 'Demostración de Co-Piloto Relacional',
  category: 'AUTONOMOUS_DRIVE',
  converged: true,
  iterations: 1,
  suitesPassed: 126,
  chaosVectorsBlocked: 5000,
  lessons: [
    'La sincronización con SQLite preserva el contexto de misiones sin inflación de tokens.',
    'El grafo relacional permite consultas en tiempo constante O(1).'
  ]
});

assert.strictEqual(outcome.converged, true, 'El desenlace debe reflejar convergencia exitosa');
assert.ok(outcome.missionNodeId, 'Debe retornar el ID del nodo de misión creado');
assert.ok(outcome.metricsNodeId, 'Debe retornar el ID del nodo de métricas');
console.log(`✓ Misión y métricas registradas en el grafo relacional: ${outcome.missionNodeId}`);

// 2. Validar cálculo de estadísticas históricas
const stats = copilot.getHistoricalStats();
assert.strictEqual(stats.totalSessions, 1, 'Total de sesiones debe ser 1');
assert.strictEqual(stats.convergedSessions, 1, 'Sesiones convergidas debe ser 1');
assert.strictEqual(stats.successRate, '100.0%', 'Tasa de éxito debe ser 100.0%');
assert.strictEqual(stats.averageIterations, 1.0, 'Promedio de iteraciones debe ser 1.0');
console.log(`✓ Estadísticas históricas calculadas: ${stats.totalSessions} sesión · ${stats.successRate} éxito · ${stats.averageIterations} iter/sesión`);

// 3. Validar recuperación de lecciones aprendidas
const lessons = copilot.findRelevantLessons('SQLite');
assert.strictEqual(lessons.length, 1, 'Debe encontrar la lección indexada por palabra clave');
assert.ok(lessons[0].content.includes('SQLite'), 'El contenido debe contener la palabra clave');
console.log(`✓ Lección contextual recuperada con éxito: "${lessons[0].content.slice(0, 45)}..."`);

// 4. Validar integración con DriveEngine
const driveEngine = new DriveEngine(ROOT);
const driveRes = driveEngine.recordDriveOutcome({
  missionId: 'MISSION_INTEGRATION_TEST',
  title: 'Integración DriveEngine - Co-Piloto',
  converged: true,
  iterations: 1,
  suitesPassed: 126
}, { inMemory: true });

assert.ok(driveRes.missionNodeId, 'DriveEngine debe registrar desenlaces a través del Co-Piloto');
console.log('✓ Integración DriveEngine -> Co-Piloto -> SQLite verificada');

copilot.close();

console.log('\nPASS AX-F-110 — Invariantes del Co-Piloto de memoria en grafo para /drive verificados al 100%.');
