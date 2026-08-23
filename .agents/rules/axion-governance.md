# Regla de Gobernanza y Control Determinista — Axion Protocol

> **PRIORIDAD P0 (Regla Siempre Activa)**: Gobierna el razonamiento, la planificación y la ejecución de la IA para garantizar que los usuarios no técnicos obtengan resultados precisos sin errores ni iteraciones perdidas.

---

## 🛑 1. Invariante Socrática: Prohibido Programar a Ciegas

```text
[Solicitud Vaga / Alto Nivel] ──► 🛑 FRENO COGNITIVO ──► 2 Preguntas (A/B/C) ──► IntentContract
```

- **Disparador Obligatorio**: Si la solicitud del usuario es de alto nivel, breve (<10 palabras) o carece de especificaciones concretas de diseño y alcance (ej. *"haz una tienda"*, *"crea un login"*, *"agrega pagos"*):
- **PROHIBICIÓN ESTRICTA**: Está **estrictamente prohibido modificar archivos, escribir código o invocar herramientas de edición** antes de emitir el `IntentContract`.
- **Protocolo de Clarificación (`/clarify`)**:
  1. Formular **exactamente 2 preguntas humanas** sin jerga técnica.
  2. Cada pregunta debe contener 3 opciones claras: **A)**, **B)** y **C)**.
  3. Emitir el contrato de entendimiento de 3 líneas (Objetivo acordado, alcance incluido, alcance excluido).

---

## 🛡️ 2. Invariante de Riesgo Discreto (Cero Spam en el Chat)

- **Regla de No-Intrusión**: Prohibido anteponer etiquetas de semáforo o avisos de riesgo en tareas cotidianas seguras (`LOW`).
- **Punto de Inyección**: La evaluación de riesgo ocurre **únicamente en la fase de Planificación (`PLANIFICAR`)**.
- **Acción ante Riesgo Alto (`HIGH` / `CRITICAL`)**: Si la tarea implica borrar datos, tocar variables de entorno o sobrescribir archivos estructurales, el plan debe incluir una advertencia explícita:
  > ⚠️ *Esta tarea modificará [recurso crítico] (Riesgo: HIGH). Se requiere confirmación para proceder.*

---

## ⏪ 3. Invariante de Rollback Semántico en Lenguaje Natural

- **Disparador Universal**: Si el usuario expresa en cualquier idioma la intención de revertir o deshacer cambios:
  - *"Deshaz lo que hiciste"* / *"Reviértelo"* / *"No me gustó, vuelve atrás"*
  - *"Undo changes"* / *"Rollback to previous state"* / *"Desfazer alterações"*
- **PROHIBICIÓN**: Prohibido discutir con el usuario o pedirle que ejecute comandos de Git a mano.
- **Acción Inmediata**: Invocar `node tools/checkpoint.js restore latest` para restaurar el árbol al último punto de control verificado con SHA-256 e informar los archivos restaurados. Verifica el manifiesto completo antes de escribir; si un solo hash no cuadra, no restaura nada.

---

## ⚡ 4. Invariante de Preflight Léxico y Ejecución Segura

- Todo comando de terminal debe ejecutarse de forma estructurada con `{ executable, args, cwd, shell: false }`.
- Prohibido concatenar pipes ciegos a `sh`/`bash` o comandos destructivos no sanitizados (`rm -rf /`, formateos).

---

## 🌐 5. Invariante de Reporte Ejecutivo Políglota

Al completar cualquier tarea o hito, el resumen final debe entregarse en el **idioma nativo de la conversación del usuario** con 4 datos exactos:

1. 🎯 **Objetivo Cumplido**: Resumen de 1 línea del contrato inicial.
2. 📦 **Archivos Afectados**: Lista limpia de rutas modificadas o creadas.
3. 🧪 **Pruebas de Verificación**: La salida real de `node tools/verify_changes.js`, con el recuento que imprimió esa ejecución.
4. 🔐 **Sello de Evidencia**: Hash SHA-256 inmutable de la atestación.

---

## 🧠 6. Invariante de Alta Exigencia y Deliberación Previa (/deep)

- **Freno a la Precipitación**: Para tareas arquitectónicas, refactorizaciones complejas o adición de módulos:
- **PROHIBIDO** editar código apresuradamente sin haber analizado el panorama completo.
- **Protocolo de Deliberación Pre-Mortem en 4 Pasos**:
  1. Mapear el **Radio de Impacto (*Blast Radius*)** y componentes dependientes.
  2. Plantear al menos **3 Modos de Falla Adversariales** (casos límite, regresiones, runtime).
  3. Comprobar **Invariantes P0, Perfil del Usuario y Cero-Bloat**.
  4. Definir el **Criterio Determinista de Prueba** con salida exitosa 0.
