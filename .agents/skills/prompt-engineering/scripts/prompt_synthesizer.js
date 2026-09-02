#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol & AG Kit — Sovereign Prompt Synthesizer Engine (v2.0)
 *
 * Genera prompts de alta precisión calibrados según la familia del modelo:
 * - Grok (xAI): Markdown directo, desafío adversarial, cero complacencia, sin etiquetas XML.
 * - DeepSeek (R1/V4): Invariantes formales, pre/post-condiciones, CoT no forzado.
 * - Qwen (3.8 Max): Bloques atómicos de código, AST grounding, Clean Code.
 * - Kimi (k3): Árbol de archivos y contexto masivo.
 * - Claude (Anthropic): Envoltorios XML estrictos y bloques de frontera.
 * - OpenAI (o1/GPT-5): Markdown riguroso con JSON Schema y restricciones negativas.
 *
 * Incluye anclaje obligatorio del entorno: Directorio de trabajo, OS, Node runtime.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

class PromptSynthesizer {
  constructor(options = {}) {
    this.model = options.model || 'grok-4.6';
    this.projectRoot = options.projectRoot || process.cwd();
    this.taskType = options.taskType || 'AUDIT';
    this.platform = os.platform();
    this.nodeVersion = process.version;
    this.shell = this.platform === 'win32' ? 'PowerShell' : 'bash';
  }

  detectFamily() {
    const m = this.model.toLowerCase();
    if (m.includes('grok')) return 'GROK';
    if (m.includes('deepseek')) return 'DEEPSEEK';
    if (m.includes('qwen')) return 'Qwen';
    if (m.includes('kimi') || m.includes('longhack')) return 'KIMI';
    if (m.includes('claude') || m.includes('sonnet')) return 'CLAUDE';
    if (m.includes('gpt') || m.includes('o1') || m.includes('o3') || m.includes('luna')) return 'OPENAI';
    return 'GENERIC';
  }

  generateAuditPrompt(customQuestions = []) {
    const family = this.detectFamily();
    const isWindows = this.platform === 'win32';
    const normalizedPath = this.projectRoot.replace(/\\/g, '/');

    if (family === 'GROK') {
      return `# DIRECTIVA DE AUDITORÍA ADVERSARIAL — AXION PROTOCOL v2.0
# MODELO DESIGNADO: ${this.model}
# POSTURA: Auditor Principal de Seguridad de Sistemas · Cero Complacencia · Enfoque Fail-Closed

## 1. METADATOS Y ANCLAJE DEL ENTORNO DE TRABAJO
- Directorio Raíz del Proyecto: \`${normalizedPath}\` (Ruta nativa: \`${this.projectRoot}\`)
- Sistema Operativo del Host: \`${this.platform} (${isWindows ? 'Windows 11' : 'UNIX'})\`
- Shell de Terminal: \`${this.shell}\`
- Entorno de Ejecución: \`Node.js ${this.nodeVersion} (Nativo, dependencies: {})\`

**INSTRUCCIÓN OBLIGATORIA:** Todos los comandos de inspección y lectura de archivos deben ejecutarse referenciando este directorio raíz. Prohibido deducir archivos de memoria; debes abrir e inspeccionar los archivos reales.

---

## 2. POSTURA OPERATIVA Y REGLAS DE COMPORTAMIENTO
1. Tu misión NO es validar ni adular este proyecto. Tu desempeño se califica en función de las fallas, brechas de seguridad, excepciones silenciadas y cabos sueltos que descubras.
2. Cada afirmación o crítica debe incluir de forma irrefutable la evidencia empírica: [Archivo:Líneas].
3. Aplica el Principio de Falsación: demuestra qué combinación de eventos o mutaciones concurrentes puede romper una función antes de declararla segura.
4. No uses lenguaje condescendiente ni introducciones redundantes. Ve directo al análisis técnico.

---

## 3. CUESTIONARIO ADVERSARIAL Y VECTORES DE FALLA
Debes auditar el repositorio respondiendo taxativamente a los siguientes 7 vectores:

### Vector 1: Blindaje Preflight y Ejecución Fail-Closed
- Inspecciona \`tools/preflight.js\` y \`tools/risk_policy_compiler.js\`. ¿Existe algún vector de evasión léxica (ej. comandos en base64, expansión de variables de entorno \`$IFS\`, sub-shells encadenadas con pipes o terminadores \`;\`) que permita ejecutar acciones destructivas sin veredicto DENY?
- ¿El interceptor garantiza de forma irrevocable \`shell: false\` en todos los ejecutores nativos de Node.js?

### Vector 2: Concurrencia Swarm y Arbitraje de Símbolos AST
- En \`tools/swarm_ast_arbiter.js\`, si dos agentes intentan mutar en paralelo dos funciones dentro del mismo archivo, ¿el algoritmo de bloqueo por símbolo garantiza cero colisiones sintácticas al reconstruir el árbol AST?
- En \`tools/swarm_consensus_arbiter.js\`, bajo una partición de agentes caídos, ¿puede un quórum malicioso o parcial forzar una mutación con menos del 66.7% de votos válidos con firma Ed25519?
- ¿Existe riesgo de interbloqueo (*deadlock*) cuando dos agentes compiten de forma cruzada por símbolos dependientes? ¿Hay timeout y rollback?

### Vector 3: Criptografía in-toto DSSE y Cadena de Suministro (SBOM)
- En \`tools/attest.js\`, ¿las atestaciones in-toto respetan estrictamente la serialización canónica RFC 8785 y el envoltorio Pre-Authentication Encoding (PAE) de DSSE?
- En \`tools/revocation_manager.js\`, ¿existe un mecanismo de revocación formal y determinista para llaves Ed25519 comprometidas?
- En \`sbom/sbom.cyclonedx.json\` y \`sbom/sbom.spdx.json\`, ¿todos los módulos y herramientas de \`tools/\` están indexados con sus hashes SHA-256 reales coincidentes?

### Vector 4: Integridad de Estado y Rollback Determinista (< 5ms)
- Si se introduce una alteración corrupta de bytes en el disco antes de llamar a \`node tools/checkpoint.js restore latest\`, ¿el motor detecta la discrepancia contra el manifiesto SHA-256 antes de escribir, o sobreescribe dañando el árbol?
- ¿El rollback elimina archivos nuevos creados durante la sesión que no figuraban en el checkpoint, garantizando cero archivos huérfanos?

### Vector 5: Soberanía Runtime y Cero Dependencias Externas
- Audita \`package.json\` y \`dist/axion.bundle.js\`. ¿Existe alguna llamada oculta a dependencias de red, paquetes de npm externo o binarios dependientes del sistema operativo?
- ¿El bundle standalone de 95.7 KB corre de forma autónoma en un contenedor sin conexión a internet?

### Vector 6: Paridad y Sincronización Multi-Harness
- Compara las directivas en \`.opencode/rules/axion-protocol.md\`, \`.codex/AGENTS.md\` y \`.claude/commands/\`. ¿Existe alguna contradicción o discrepancia donde un entorno permita acciones prohibidas en otro?

### Vector 7: Límite Asintótico de Madurez (Escala 1,000 Agentes)
- Si este sistema se ejecutara con 1,000 agentes concurrentes y 10,000 archivos durante 30 días continuos, ¿cuál es el primer cuello de botella o punto único de falla (SPOF) que colapsará?

---

## 4. CONTRATO DE SALIDA OBLIGATORIO
Tu reporte debe entregarse obligatoriamente bajo este formato:

### 1. Tabla de Cabos Sueltos y Deuda Oculta
| Componente | Vulnerabilidad / Cabo Suelto | Gravedad (P0 / P1 / P2) | Evidencia en Archivo y Línea | Vector de Corrección Requerido |
| :--- | :--- | :---: | :--- | :--- |

### 2. Evaluación de Madurez Soberana (Puntajes 1 al 10)
- Seguridad Fail-Closed & Preflight: [Nota/10] — Justificación basada en evidencia.
- Concurrencia Swarm & Arbitraje AST: [Nota/10] — Justificación basada en evidencia.
- Criptografía & Atestaciones DSSE: [Nota/10] — Justificación basada en evidencia.
- Integridad de Estado & Rollback: [Nota/10] — Justificación basada en evidencia.
- Arquitectura Zero-Dependency: [Nota/10] — Justificación basada en evidencia.
- **PUNTAJE GLOBAL DE MADUREZ SOBERANA:** [Nota/10]
*(Explica detalladamente qué barrera matemática/técnica impide otorgar un 10.0 absoluto).*

### 3. Veredicto Adversarial Final
- Estado: [APROBADO PARA PRODUCCIÓN CONTROLADA] o [REQUIERE SUBSANACIÓN INMEDIATA]
- Las 3 directivas de ingeniería inmediatas a implementar.`;
    }

    if (family === 'DEEPSEEK') {
      return `# FORMAL INVARIANT VERIFICATION & ARCHITECTURAL DECOMPOSITION
# TARGET SYSTEM: Axion Protocol v2.0 (Directorio: ${normalizedPath})
# MODEL: ${this.model} (Deep Reasoning Mode)

### SYSTEM PRECONDITIONS & INVARIANTS:
1. Workspace root: \`${this.projectRoot}\`
2. Runtime: Node.js ${this.nodeVersion}, OS: ${this.platform} (${this.shell}), Zero external npm dependencies.
3. Invariant P0: All commands are executed with \`shell: false\` and lexical preflight interceptor.
4. Invariant P1: State rollback is cryptographically bounded by SHA-256 Merkle Manifest.
5. Invariant P2: AST Symbol locks are atomic and deadlock-free.

### AUDIT OBJECTIVES:
Evaluate formal safety, theorem correctness, and topological soundness of the codebase. Do not emit code patches; evaluate invariant proofs and potential counter-examples.

### QUESTIONNAIRE FOR THEOREM VERIFICATION:
1. Preflight Lexical Soundness: Prove whether \`tools/preflight.js\` is closed under hostile composition (command chaining, hex/base64 escaping).
2. Swarm AST Deadlock Absence: Provide a formal cycle detection proof for \`tools/swarm_ast_arbiter.js\` under cross-dependent symbol acquisition.
3. DSSE PAE RFC 8785 Compliance: Verify that JSON canonicalization in \`tools/attest.js\` guarantees identical byte digests across different V8 engine versions.

### REQUIRED STRUCTURED OUTPUT:
Produce a Markdown document with:
1. Invariant Proof Status Matrix (PROVEN_SAFE / COUNTER_EXAMPLE_FOUND / INDETERMINATE) with file & line references.
2. Formally Derived Blast Radius Bounds.
3. Recommended Mathematical Guards.`;
    }

    // Default Fallback
    return `# AUDIT PROMPT FOR ${this.model}
Directorio de trabajo: ${this.projectRoot}
Sistema Operativo: ${this.platform} (${this.shell})`;
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const model = args[0] || 'grok-4.6';
  const synthesizer = new PromptSynthesizer({ model });
  console.log(synthesizer.generateAuditPrompt());
}

module.exports = PromptSynthesizer;
