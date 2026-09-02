---
name: prompt-engineering
description: Ingeniería de prompts de alta precisión para modelos de frontera y agentes de razonamiento (Grok, DeepSeek, Qwen, Kimi, Claude, OpenAI). Diseña prompts no complacientes, calibrados por familia de modelo, con anclaje de entorno y esquemas estrictos.
when_to_use: "Cuando se requiera diseñar, calibrar o auditar prompts para agentes de IA, crear instrucciones maestras de auditoría adversarial, formular cuestionarios socráticos o dirigir modelos de razonamiento extenso (o1, R1, Grok, V4). NOT para simples preguntas de chat."
allowed-tools: Read, Write, Edit, Grep, Glob
effort: medium
version: 2.0.0
---

# Prompt Engineering — Ingeniería de Instrucciones para Agentes Soberanos (v2.0)

> **Principio Rector:** Un prompt no es una conversación casual; es una función matemática con restricciones de frontera, invariantes de entrada, anclaje estricto de entorno y esquemas deterministas de salida calibrados según el sesgo cognitivo de cada modelo.

---

## 🏛️ Los 6 Arquetipos de Modelos y sus Formatos Óptimos

Cada familia de modelos ha sido pre-entrenada y alineada bajo paradigmas distintos. Aplicar el mismo formato genérico a todos los modelos reduce drásticamente su rendimiento:

| Familia de Modelo | Modelos Representativos | Formato Óptimo | Antipatrón Crítico a Evitar |
| :--- | :--- | :--- | :--- |
| **xAI Grok** | `Grok-4.6`, `Grok-3` | **Markdown Directo & Desafío Adversarial**. Exige pruebas empíricas `[Archivo:Línea]`. | **NO usar etiquetas XML complejas** ni lenguaje adulador. |
| **DeepSeek** | `DeepSeek V4 Pro`, `R1` | **Lógica Formal, Pre/Post-Condiciones e Invariantes**. Esquema de salida estructurado. | **JAMÁS forzar CoT** (*"piensa paso a paso"*); dejar libre su pensamiento interno. |
| **Alibaba Qwen** | `Qwen 3.8 Max`, `2.5 Coder` | **Bloques Atómicos de Código & Diffs SEARCH/REPLACE**. Directivas de Clean Code y rutas exactas. | Evitar descripciones puramente conceptuales sin anclaje de código. |
| **Moonshot Kimi** | `Kimi k3`, `k2.7-code` | **Árbol de Directorios & Mapas de Contexto Masivo**. Rastreos multi-archivo y memoria persistente. | Enviar fragmentos aislados sin proporcionar el mapa global de archivos. |
| **Anthropic Claude** | `Claude 3.7 Sonnet` | **Envoltorios XML Estrictos** (`<context>`, `<rules>`, `<task>`) y definición de thinking budget. | Markdown plano sin delimitadores estructurados en tareas complejas. |
| **OpenAI** | `GPT-5.6 Luna`, `o1`, `o3` | **Markdown con Restricciones Negativas ("DO NOT")** y esquemas JSON estrictos (*Structured Outputs*). | Ambigüedad en los campos de salida esperados. |

---

## 🧭 Protocolo de Preguntas Guiadas al Usuario (Socratic Gate)

Al diseñar o calibrar un prompt para el usuario, se deben resolver las siguientes variables clave:

### A. Preguntas Obligatorias (Imprescindibles para evitar alucinaciones)
1. **Modelo de Destino:** ¿Qué modelo exacto ejecutará la tarea? (ej. `Grok-4.6` en OpenCode vs `DeepSeek V4 Pro` vs `Claude 3.7 Sonnet`).
2. **Directorio y Entorno de Trabajo:** ¿Cuál es la ruta absoluta del repositorio y el sistema operativo? *(Ejemplo: `C:\Users\adria\Shoshin\Proyectos\Axion Protocol`, Windows 11, PowerShell, Node.js v22)*. Sin esto, el modelo adivinará rutas o asumirá un entorno Linux/Bash incorrecto.

### B. Preguntas Opcionales (Calibración fina según el objetivo)
3. **Postura Operativa:** ¿Auditor Adversarial Implacable (cero complacencia), Arquitecto de Planificación Socrática, o Implementador Quirúrgico TDD?
4. **Alcance de la Auditoría:** ¿Todo el repositorio de forma transversal o una lista acotada de módulos críticos (ej. `tools/`, `tests/`)?
5. **Idioma de Salida:** ¿Español técnico nativo o Inglés de ingeniería internacional?

---

## 🛠️ Anclaje de Entorno Obligatorio (Environment Grounding)

**Todo prompt de ingeniería de alta fidelidad DEBE incluir este bloque al inicio:**

```markdown
## METADATOS Y ANCLAJE DEL ENTORNO DE TRABAJO
- Directorio Raíz del Proyecto: [RUTA ABSOLUTA O NORMALIZADA]
- Sistema Operativo del Host: [Windows / Linux / macOS]
- Shell de Terminal: [PowerShell / bash / zsh]
- Runtime de Ejecución: [Node.js version, Python version, etc.]
- Dependencias Externas: [dependencies: {} o gestor de paquetes]

INSTRUCCIÓN OBLIGATORIA: Todos los comandos de inspección y lectura de archivos deben ejecutarse referenciando este directorio raíz. Prohibido deducir archivos de memoria; debes abrir e inspeccionar los archivos reales.
```

---

## ⚡ Herramientas y Scripts Auxiliares

La skill incluye herramientas automatizadas en `scripts/` y `references/`:
* `scripts/prompt_synthesizer.js`: Generador determinista por CLI que detecta automáticamente la familia del modelo y los metadatos del sistema operativo local.
  ```bash
  # Generar prompt optimizado para Grok-4.6
  node .agents/skills/prompt-engineering/scripts/prompt_synthesizer.js grok-4.6

  # Generar prompt optimizado para DeepSeek V4 Pro
  node .agents/skills/prompt-engineering/scripts/prompt_synthesizer.js deepseek-v4-pro
  ```
* `references/model_taxonomy.md`: Documento de referencia profunda con análisis de tokenizadores y sesgos cognitivos.

---

## 📋 Lista de Verificación de Calidad (100% Excelencia)

Antes de entregar un prompt de auditoría o ejecución:

- [ ] **Anclaje de Entorno:** ¿Incluye ruta de directorio absoluta, OS y shell?
- [ ] **Alineación de Familia:** ¿Usa el formato óptimo del modelo (Markdown para Grok, Invariantes para DeepSeek, XML para Claude)?
- [ ] **Anti-Complacencia:** ¿Prohíbe expresamente el halago y exige pruebas de falsación?
- [ ] **Evidencia Obligatoria:** ¿Exige citar `[Archivo:Línea]` para cada afirmación?
- [ ] **Cero 'Think Step by Step' en Modelos de Razonamiento:** ¿Deja libre el razonamiento interno restringiendo solo el esquema de salida?
- [ ] **Esquema de Salida Determinista:** ¿Contiene una tabla o contrato de respuesta rígido?
