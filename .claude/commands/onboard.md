---
name: onboard
description: Reconoce, indexa y sintetiza un repositorio nuevo o existente sin sobrescribir la configuración previa.
---

# /onboard — Reconocimiento del Proyecto (Axion Protocol)

> **PROPÓSITO**: Entender antes de tocar. Un agente que edita un repositorio que no ha
> leído produce cambios que encajan en su cabeza y no en el código.

---

## 📋 Protocolo de Ejecución

### 1. Escaneo de fuentes de verdad
- **Stack y dependencias**: `package.json`, `Cargo.toml`, `pyproject.toml`, `go.mod`, `pom.xml`.
- **Puntos de entrada**: `main`, `index`, `src/`, `bin/`, scripts de `package.json`.
- **Pruebas**: cómo se ejecutan y si pasan hoy — ejecútalas, no lo supongas.
- **Convenciones ya existentes**: `.agents/`, `CLAUDE.md`, `AGENTS.md`, `.cursorrules`,
  `CONTRIBUTING.md`. **Léelas y respétalas**; tienen prioridad sobre tus preferencias.

### 2. Verificación del estado de gobernanza
```bash
node tools/health_check.js
```
Informa de lo que falte antes de proponer trabajo, no después.

### 3. Informe de síntesis

```markdown
### 🗺️ Síntesis del Proyecto
- **Propósito**: [qué hace, en 1 frase]
- **Stack**: [lenguaje, framework, gestor de paquetes, versión de runtime]
- **Arquitectura**: [componentes clave y cómo fluyen los datos entre ellos]
- **Cómo se prueba**: [comando real y su resultado actual]
- **Límites / NO TOCAR**: [zonas críticas, generadas o con convención propia]
- **Deuda visible**: [lo que ya está roto o a medias, si lo hay]
- **Siguiente acción recomendada**: [una sola, concreta]
```

---

## 🚫 Prohibiciones

- Sobrescribir reglas o configuración preexistentes. Si algo choca, **pregunta**.
- Proponer una reescritura como primera acción.
- Declarar que las pruebas pasan sin haberlas ejecutado.
