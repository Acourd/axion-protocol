#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Drive Memory Co-Pilot & SQLite Graph Bridge
 *
 * Co-piloto de sincronización bidireccional entre /drive y el Grafo de Memoria SQLite:
 * 1. Indexa atómicamente el resultado de cada sesión de /drive en SemanticMemoryGraph.
 * 2. Vincula misiones, decisiones, métricas de convergencia y lecciones aprendidas mediante relaciones dirigidas.
 * 3. Actualiza el diario de misiones (DriveMissionTracker) cerrando tareas activas y gestionando el backlog.
 * 4. Calcula la tasa histórica de convergencia y recupera antecedentes semánticos para prevenir errores recurrentes.
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const SemanticMemoryGraph = require('./semantic_memory_graph.js');
const DriveMissionTracker = require('./drive_mission_tracker.js');

const ROOT = path.resolve(__dirname, '..');

class DriveMemoryCopilot {
  constructor(projectRoot = ROOT, options = {}) {
    this.root = path.resolve(projectRoot);
    this.graph = new SemanticMemoryGraph({ projectRoot: this.root, inMemory: options.inMemory || false });
    this.tracker = new DriveMissionTracker(this.root);
  }

  /**
   * Registra el resultado integral de una sesión de /drive en el grafo relacional.
   */
  recordSessionOutcome(sessionData = {}) {
    const {
      missionId = `mission_${Date.now()}`,
      title = 'Sesión Autónoma /drive',
      category = 'AUTONOMOUS_ENGINEERING',
      converged = true,
      iterations = 1,
      suitesPassed = 0,
      chaosVectorsBlocked = 0,
      lessons = []
    } = sessionData;

    const now = new Date().toISOString();

    // 1. Nodo de la Misión
    const missionNode = this.graph.upsertNode({
      id: `node_mission_${missionId}`,
      type: 'MISSION',
      name: title,
      content: `Categoría: ${category} · Iteraciones: ${iterations} · Estado: ${converged ? 'CONVERGED' : 'FAILED'}`,
      metadata: {
        missionId,
        category,
        converged,
        iterations,
        suitesPassed,
        chaosVectorsBlocked,
        recordedAt: now
      }
    });

    // 2. Nodo de Métricas de Convergencia
    const metricsNode = this.graph.upsertNode({
      id: `node_metrics_${missionId}`,
      type: 'CONVERGENCE_METRICS',
      name: `Métricas: ${title}`,
      content: `Suites: ${suitesPassed} PASS · Caos: ${chaosVectorsBlocked} bloqueados · Iteraciones: ${iterations}`,
      metadata: { suitesPassed, chaosVectorsBlocked, iterations, converged }
    });

    this.graph.linkNodes(missionNode.id, metricsNode.id, 'MEASURED_BY', 1.0);

    // 3. Nodos de Lecciones Aprendidas
    if (Array.isArray(lessons)) {
      for (let i = 0; i < lessons.length; i++) {
        const lessonText = lessons[i];
        const lessonNode = this.graph.upsertNode({
          id: `node_lesson_${missionId}_${i + 1}`,
          type: 'LESSON_LEARNED',
          name: `Lección ${i + 1} (${title})`,
          content: lessonText,
          metadata: { missionId, index: i + 1 }
        });

        this.graph.linkNodes(missionNode.id, lessonNode.id, 'PRODUCED_LESSON', 0.9);
      }
    }

    // 4. Actualizar DriveMissionTracker
    if (this.tracker.journal.activeMission && this.tracker.journal.activeMission.id === missionId) {
      this.tracker.completeActiveMission({
        success: converged,
        iterations,
        suitesPassed
      });
    }

    return {
      missionNodeId: missionNode.id,
      metricsNodeId: metricsNode.id,
      converged,
      recordedAt: now
    };
  }

  /**
   * Calcula estadísticas históricas de convergencia a partir del grafo SQLite.
   */
  getHistoricalStats() {
    const missionNodes = this.graph.queryNodes({ type: 'MISSION', limit: 1000 });
    const totalSessions = missionNodes.length;

    if (totalSessions === 0) {
      return {
        totalSessions: 0,
        convergedSessions: 0,
        successRate: '100.0%',
        averageIterations: 1.0
      };
    }

    let convergedCount = 0;
    let totalIterations = 0;

    for (const node of missionNodes) {
      let meta = {};
      try {
        meta = typeof node.metadata === 'string' ? JSON.parse(node.metadata) : (node.metadata || {});
      } catch (parseErr) {
        meta = {};
      }

      if (meta.converged !== false) {
        convergedCount++;
      }
      totalIterations += (meta.iterations || 1);
    }

    return {
      totalSessions,
      convergedSessions: convergedCount,
      successRate: ((convergedCount / totalSessions) * 100).toFixed(1) + '%',
      averageIterations: parseFloat((totalIterations / totalSessions).toFixed(2))
    };
  }

  /**
   * Consulta lecciones pasadas sobre un tema para prevenir errores repetidos.
   */
  findRelevantLessons(keyword = '') {
    return this.graph.queryNodes({ type: 'LESSON_LEARNED', keyword, limit: 10 });
  }

  close() {
    if (this.graph) {
      this.graph.close();
    }
  }
}

if (require.main === module) {
  const copilot = new DriveMemoryCopilot(ROOT, { inMemory: true });
  console.log('[Axion Drive Co-Pilot] Probando sincronización bidireccional con SQLite:');

  const outcome = copilot.recordSessionOutcome({
    missionId: 'MISSION_MERKLE_TEST',
    title: 'Optimización de Ejecución Predictiva Merkle',
    category: 'PERFORMANCE',
    converged: true,
    iterations: 1,
    suitesPassed: 126,
    chaosVectorsBlocked: 5000,
    lessons: ['El árbol de Merkle reduce a 80ms la verificación de invariantes estables.']
  });

  console.log('  Resultado registrado:', outcome.missionNodeId);
  const stats = copilot.getHistoricalStats();
  console.log(`  Estadísticas: ${stats.totalSessions} sesiones · ${stats.successRate} tasa de éxito · ${stats.averageIterations} iter/sesión`);

  const lessons = copilot.findRelevantLessons('Merkle');
  console.log(`  Lecciones encontradas: ${lessons.length} (Contenido: "${lessons[0].content}")`);
  copilot.close();
}

module.exports = DriveMemoryCopilot;
