#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — State Transition Invariant Prover & Cut-Vertex Model Checker (M_GOV_015)
 *
 * Verificador formal de invariantes sobre máquinas de estado y grafos de transición:
 * 1. Demostración matemática formal de vértices de corte obligatorios (cut-vertices):
 *    Garantiza que es imposible transitar desde el estado inicial a un estado objetivo (p.ej. COMMIT)
 *    sin pasar obligatoriamente por una puerta de verificación (p.ej. VERIFY exit code 0).
 * 2. Detección de bypass y síntesis automática de la traza mínima de contraejemplo.
 * 3. Detección exhaustiva de estados muertos (deadlocks) y estados inalcanzables (dead code).
 * 4. Exploración de complejidad O(V + E) con terminación determinista ante grafos cíclicos.
 * 5. Emisión de StateTransitionProofReport_v1 sellado con SHA-256.
 *
 * Cero dependencias externas.
 */

const crypto = require('crypto');

class StateTransitionInvariantProver {
  constructor(options = {}) {
    this.projectRoot = options.projectRoot || process.cwd();
  }

  /**
   * Construye el grafo de adyacencia dirigido a partir de la definición de la máquina.
   */
  buildGraph(machine) {
    const adj = new Map();
    const inEdges = new Map();

    const states = machine.states || [];
    for (const s of states) {
      adj.set(s, new Set());
      inEdges.set(s, new Set());
    }

    const transitions = machine.transitions || [];
    for (const t of transitions) {
      if (adj.has(t.from) && adj.has(t.to)) {
        adj.get(t.from).add(t.to);
        inEdges.get(t.to).add(t.from);
      }
    }

    return { adj, inEdges };
  }

  /**
   * Encuentra el camino más corto entre start y goal usando BFS.
   * Si excludedVertex se proporciona, ese vértice se trata como bloqueado.
   */
  findShortestPath(adj, start, goal, excludedVertex = null) {
    if (start === goal) return [start];
    if (start === excludedVertex || goal === excludedVertex) return null;

    const queue = [[start]];
    const visited = new Set([start]);
    if (excludedVertex) visited.add(excludedVertex);

    while (queue.length > 0) {
      const path = queue.shift();
      const current = path[path.length - 1];

      const neighbors = adj.get(current) || new Set();
      for (const next of neighbors) {
        if (!visited.has(next)) {
          visited.add(next);
          const newPath = [...path, next];
          if (next === goal) {
            return newPath;
          }
          queue.push(newPath);
        }
      }
    }

    return null;
  }

  /**
   * Encuentra todos los estados alcanzables desde el estado inicial mediante BFS.
   */
  getReachableStates(adj, initial) {
    const reachable = new Set([initial]);
    const queue = [initial];

    while (queue.length > 0) {
      const current = queue.shift();
      const neighbors = adj.get(current) || new Set();
      for (const next of neighbors) {
        if (!reachable.has(next)) {
          reachable.add(next);
          queue.push(next);
        }
      }
    }

    return reachable;
  }

  /**
   * Demuestra formalmente los invariantes de la máquina de estados.
   */
  proveInvariants(machine, options = {}) {
    const { adj, inEdges } = this.buildGraph(machine);
    const initial = machine.initial || (machine.states && machine.states[0]);
    const terminals = new Set(machine.terminals || []);
    const cutVertex = options.cutVertex || null;
    const target = options.target || null;

    // 1. Análisis de alcanzabilidad
    const reachable = this.getReachableStates(adj, initial);
    const unreachableStates = (machine.states || []).filter(s => !reachable.has(s));

    // 2. Detección de deadlocks (estados alcanzables, no terminales, sin salidas)
    const deadlocks = [];
    for (const s of reachable) {
      if (!terminals.has(s)) {
        const outDegree = (adj.get(s) || new Set()).size;
        if (outDegree === 0) {
          deadlocks.push(s);
        }
      }
    }

    // 3. Verificación de Cut-Vertex (Puerta Inviolable)
    let cutVertexEnforced = true;
    let counterexample = null;
    let violationType = null;

    if (cutVertex && target) {
      // Buscar si existe algún camino desde initial hasta target SIN pasar por cutVertex
      const bypassPath = this.findShortestPath(adj, initial, target, cutVertex);
      if (bypassPath !== null) {
        // Existe un camino clandestino que elude la compuerta
        cutVertexEnforced = false;
        counterexample = bypassPath;
        violationType = 'CUT_VERTEX_BYPASS';
      }
    }

    const isSafe = (unreachableStates.length === 0) &&
                   (deadlocks.length === 0) &&
                   (cutVertex ? cutVertexEnforced : true);

    return {
      isSafe,
      cutVertexEnforced,
      reachableStatesCount: reachable.size,
      unreachableStates,
      deadlocks,
      deadlocksCount: deadlocks.length,
      counterexample,
      violationType
    };
  }

  /**
   * Emite el reporte criptográfico de verificación formal StateTransitionProofReport_v1.
   */
  generateProofReport(machine, options = {}) {
    const proofResults = this.proveInvariants(machine, options);

    const reportPayload = {
      reportType: 'StateTransitionProofReport_v1',
      initialState: machine.initial,
      cutVertexRequired: options.cutVertex || null,
      targetState: options.target || null,
      isFormallyVerified: proofResults.isSafe,
      proofDetails: proofResults,
      timestamp: new Date().toISOString()
    };

    const canonicalJson = JSON.stringify(reportPayload, Object.keys(reportPayload).sort());
    const proofDigest = crypto.createHash('sha256').update(canonicalJson).digest('hex');

    return {
      ...reportPayload,
      proofDigest
    };
  }
}

module.exports = StateTransitionInvariantProver;
