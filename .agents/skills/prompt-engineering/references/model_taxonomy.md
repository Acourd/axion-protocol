# Taxonomía de Modelos y Patrones de Prompting por Arquitectura (v2.0)

Esta referencia técnica documenta las particularidades de entrenamiento, sesgos de atención y formatos óptimos para cada familia de modelos de frontera.

---

## 1. xAI Grok (Grok-2, Grok-3, Grok-4.6)
* **Paradigma de Entrenamiento:** Pre-entrenado en flujos masivos de datos en tiempo real, calibrado para búsqueda de verdad, respuesta directa y debate dialéctico.
* **Sesgo Cognitivo:** Alta receptividad a desafíos técnicos directos; baja tolerancia a envoltorios ceremoniales o etiquetas XML redundantes. Si se le pide auditar amablemente, será superficial; si se le desafía a encontrar fallas como atacante, desglosará el código con agresividad analítica.
* **Sintaxis Óptima:**
  - Markdown estándar limpio (`#`, `##`, `###`, listas y tablas).
  - Tono de Arquitecto Principal / Auditor Adversarial.
  - Exigencia de evidencia fáctica: `[Archivo:Línea]`.
  - Especificación explícita del directorio de trabajo y del sistema operativo.
* **Antipatrón a Evitar:** Etiquetas XML complejas y anidadas (pueden distraer o diluir su atención directa) y frases tipo "piensa paso a paso".

---

## 2. DeepSeek (DeepSeek-V3, DeepSeek-R1, DeepSeek-V4 Pro)
* **Paradigma de Entrenamiento:** Modelos de razonamiento puro mediante Aprendizaje por Refuerzo a gran escala (Large-Scale RL) sin destilación previa en el caso de R1/V4.
* **Sesgo Cognitivo:** Realiza una exploración exhaustiva de hipótesis en su monólogo interno antes de emitir la primera palabra. Excelente en deducción matemática, verificación formal de invariantes y análisis de dependencias cruzadas.
* **Sintaxis Óptima:**
  - Formulación en términos de **Precondiciones, Invariantes y Postcondiciones**.
  - Especificación en pseudocódigo o tipos de datos rigurosos.
  - Cero directivas sobre cómo pensar: no interrumpir su cadena de pensamiento interno.
  - Restricción estricta únicamente del esquema de salida (Markdown/JSON).
* **Antipatrón a Evitar:** "Piensa paso a paso", prompts ambiguos sin delimitación formal de límites de frontera.

---

## 3. Alibaba Qwen (Qwen 2.5 Coder, Qwen 3.7 / 3.8 Max)
* **Paradigma de Entrenamiento:** Entrenado en volúmenes masivos de código fuente multilingüe, repositorios de GitHub y pruebas de compilación.
* **Sesgo Cognitivo:** Precisión léxica y de formato inigualable. Sigue al pie de la letra directivas de estilo, patrones AAA en pruebas y modificaciones atómicas.
* **Sintaxis Óptima:**
  - Formato Markdown con bloques de código explícitos con lenguaje (`javascript`, `bash`).
  - Bloques de búsqueda y reemplazo (*SEARCH/REPLACE*).
  - Directivas explícitas de "Clean Code" y cero librerías adicionales.
  - Declaración obligatoria de rutas de archivo absolutas y relativas.
* **Antipatrón a Evitar:** Instrucciones puramente filosóficas sin contexto de código ni rutas concretas.

---

## 4. Moonshot Kimi (Kimi k1.5, k2.7-code, Kimi k3)
* **Paradigma de Entrenamiento:** Especialización en ventanas de contexto ultra-largas (1M+ tokens) y recuperación precisa en agujas de pajar (*needle-in-a-haystack*).
* **Sesgo Cognitivo:** Excelente para digerir repositorios enteros, comparar 50 archivos simultáneamente y recordar decisiones de arquitectura de sesiones pasadas.
* **Sintaxis Óptima:**
  - Índices de archivos explícitos con rutas completas.
  - Peticiones de rastreo histórico y detección de derivas contextuales.
  - Anclaje de archivos raíz (`package.json`, `README.md`, `ARCHITECTURE.md`).
* **Antipatrón a Evitar:** Enviar fragmentos aislados sin proporcionar el árbol de archivos circundante.

---

## 5. Anthropic Claude (Claude 3.5 / 3.7 Sonnet)
* **Paradigma de Entrenamiento:** Modelos altamente alineados con formato XML de frontera y prompts de sistema extensos.
* **Sesgo Cognitivo:** Responde con máxima fidelidad a etiquetas XML delimitadoras (`<context>`, `<rules>`, `<instructions>`, `<task>`).
* **Sintaxis Óptima:**
  - Envoltorios XML claros para cada sección.
  - Definición explícita de `thinking_budget` cuando se use razonamiento extendido.
  - Separación de ejemplos mediante etiquetas `<example>`.
* **Antipatrón a Evitar:** Markdown plano sin delimitadores estructurados en prompts complejos.

---

## 6. OpenAI (GPT-4o, o1, o3-mini, GPT-5.6 Luna)
* **Paradigma de Entrenamiento:** Optimizado para seguimiento de instrucciones directas, JSON Schema (Structured Outputs) y llamadas a herramientas (*tool calling*).
* **Sesgo Cognitivo:** Muy fuerte en formateo JSON determinista y respeto de restricciones negativas ("DO NOT").
* **Sintaxis Óptima:**
  - Reglas negativas en mayúsculas ("DO NOT modify files outside X").
  - Esquema JSON explícito para respuestas estructuradas.
  - Delimitadores triples `"""` o Markdown con títulos `###`.
* **Antipatrón a Evitar:** Ambigüedad en los campos de salida esperados.
