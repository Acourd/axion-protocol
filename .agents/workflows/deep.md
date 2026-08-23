---
name: deep
description: Activa el Modo Alta Exigencia y deliberación profunda (Pre-Mortem en 4 pasos) antes de ejecutar tareas complejas.
---

# /deep — Modo Alta Exigencia y Pensamiento Profundo (Axion Protocol)

> **PROPÓSITO**: Freno deliberativo obligatorio para tareas complejas o críticas.
> Fuerza al modelo a frenar la prisa, analizar el panorama arquitectónico completo,
> calcular el radio de impacto (*blast radius*) y plantear 3 hipótesis de falla antes de tocar código.

---

## 🛑 Cuándo se Activa

- Tareas arquitectónicas, refactorizaciones estructurales o adición de nuevos módulos.
- Tareas donde la IA tiende a apresurarse y cometer errores por no ver el panorama completo.
- Invocación explícita mediante `/deep` o petición de máxima rigurosidad.

---

## 📋 Los 4 Pasos Obligatorios de Deliberación

Antes de invocar herramientas de edición (`write_to_file`, `replace_file_content`, `run_command`), la IA **DEBE** evaluar y plasmar internamente:

### 1. 🗺️ Mapeo del Radio de Impacto (*Blast Radius*)
- **Archivos directos a modificar**: Listado preciso.
- **Componentes y suites dependientes**: Qué otros módulos, tests o contratos podrían verse alterados por este cambio.

### 2. 💥 Análisis Adversarial Pre-Mortem (Mínimo 3 Hipótesis de Falla)
- **Hipótesis 1 (Entrada / Caso Límite)**: ¿Qué ocurre si los datos están vacíos, son nulos o tienen formato inesperado?
- **Hipótesis 2 (Regresión / Invariantes)**: ¿Qué test o funcionalidad previa podría romperse silenciosamente?
- **Hipótesis 3 (Runtime / Efectos Secundarios)**: ¿Qué riesgo oculto existe en memoria, concurrencia o sistema de archivos?

### 3. 🔍 Chequeo de Invariantes y Contexto
- ¿Cumple con la gobernanza P0 Fail-Closed?
- ¿Respeta el perfil calibrado del usuario (`.axion/PROFILE.json`) y las decisiones en memoria?
- ¿Mantiene el estándar Zero-Bloat (sin dependencias innecesarias)?

### 4. 🧪 Criterio de Prueba Determinista
- Definir el comando exacto que demostrará el éxito con código de salida 0:
  ```bash
  node tests/run_all.js
  ```

---

## 💻 Verificación Opcional por Herramienta

Para misiones críticas, el agente puede validar su propio payload de deliberación:
```bash
node tools/deep_reasoning.js evaluate '<json_payload>'
```
O consultar la plantilla estándar con:
```bash
node tools/deep_reasoning.js template
```
