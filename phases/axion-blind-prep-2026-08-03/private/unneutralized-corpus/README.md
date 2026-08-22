# Axion Protocol

> **Gobernanza, Seguridad y Claridad para la Operación de IA Agentiva por Usuarios No Técnicos.**

Axion Protocol es un protocolo ligero, determinista y de **cero mantenimiento** diseñado para permitir que cualquier persona controle agentes de Inteligencia Artificial sin requerir conocimientos técnicos profundos, eliminando las alucinaciones, la producción de errores y los bucles de iteración perdidos.

---

## 🎯 Propósito Principal

1. **Cristalización de Intención:** Aclara las ideas del usuario no técnico en 2 preguntas humanas sin jerga técnica antes de tocar una sola línea de código.
2. **Supervisión y Preflight Léxico:** Analiza todo comando generado por la IA en tiempo real (`PASS/STOP`) evitando roturas de sistema o ejecuciones destructivas.
3. **Control de Riesgo por Gates:** Exige autorización humana previa para acciones clasificadas como `HIGH` o `CRITICAL`.
4. **Evidencias Criptográficas Inmutables:** Firma las entradas, salidas y snapshots con SHA-256 para permitir auditorías y reversión (*rollback*) en 1 clic.

---

## 🤝 Sinergia de Arquitectura (Axion + ECC)

Axion Protocol no busca reemplazar ni competir con catálogos de habilidades de ingeniería como **ECC (Everything Claude Code)**; actúa como su capa de gobernanza y dirección:

- **Axion Protocol (La Mente de Gobernanza):** Aclara requerimientos no técnicos, gestiona el control de riesgos (`Gates`), supervisa la ejecución con *Preflight* y firma manifiestos de evidencia SHA-256.
- **ECC / Motores de Capacidad (El Músculo de Ingeniería):** Aporta las mejores prácticas de ingeniería de software (TDD, patrones por lenguaje y revisiones libres de falsos positivos).

---


## 🔄 El Ciclo Híbrido Unificado (7 Pasos)

```text
[1. ENTENDER (Aclarador)] ──> [2. PLANIFICAR (Riesgo)] ──> [3. GATE (Aprobación Humana)]
                                                                    │
                                                                    ▼
[7. PROMOVER/RECORDAR] <── [6. AUDITAR (SHA-256)] <── [5. CONSTRUIR (Preflight)] <── [4. TEST (TDD)]
```

---

## ⚡ Inicio Rápido en 60 Segundos

### 1. Instalación Autónoma en 1 Clic
Para inyectar Axion Protocol y sus salvaguardas en cualquier proyecto objetivo:

```bash
node install.js
```

### 2. Probar la Aclaración de Intención
Prueba cómo el sistema analiza peticiones vagas de usuarios no técnicos:

```bash
node tools/intent_clarifier.js "haz un login"
```

### 3. Probar el Preflight de Seguridad
Verifica cómo el preflight bloquea comandos desbalanceados o peligrosos:

```bash
node tools/preflight.js "git commit -m \"Mensaje correcto\""
```

### 4. Abrir la Página Web de Presentación (Landing Page)
Visita el sitio oficial de presentación directamente en tu navegador (cero servidores, cero mantenimiento):

- [Ver Página Web Oficial de Presentación (index.html)](file:///c:/Users/Ayco/Shoshin/Project/Axion%20Protocol/index.html)
- Incluye el widget interactivo de prueba en vivo del Aclarador de Intención, el diagrama de los 7 pasos y la explicación de sinergia con ECC.


### 5. Ejecutar la Suite Completa de Pruebas
Valida todos los motores de gobernanza y workflow. La suite consta de 8 archivos:

```bash
node tests/tools.test.js; node tests/workflow.test.js; node tests/clarifier.test.js; node tests/learning_git.test.js; node tests/install.test.js; node tests/adversarial.test.js; node tests/vibeguard.test.js; node tests/human_anti_patterns.test.js
```

Pruebas de regresión de los hallazgos de auditoría (`tests/regression/`), que fijan el
comportamiento exigido por las políticas del proyecto:

```bash
node tests/regression/ax_f_001_installer_backup.test.js; node tests/regression/ax_f_005_preflight_destructive.test.js; node tests/regression/ax_f_012_suite_integrity.test.js; node tests/regression/ax_f_008_doc_consistency.test.js; node tests/regression/ax_f_002_risk_gate.test.js; node tests/regression/ax_f_003_verified_requires_checks.test.js; node tests/regression/ax_f_004_evidence_manifest.test.js; node tests/regression/ax_f_006_learnings_preservation.test.js
```


---

## 🛠️ Herramientas Ejecutables Incluidas (`tools/`)

| Herramienta | Función Principal | Entrada / Salida |
| :--- | :--- | :--- |
| **`tools/intent_clarifier.js`** | Entrevista al usuario sin tecnicismos para cristalizar requerimientos. | Genera preguntas humanas o emite `IntentContract`. |
| **`tools/preflight.js`** | Validador léxico de sintaxis de comandos de shell (`DA-0015`). | Retorna `PASS` o `STOP` con diagnóstico. |
| **`tools/evidence_hasher.js`** | Generador de evidencias criptográficas SHA-256. | Emite manifiesto JSON conforme a `schemas/evidence.schema.json`. |
| **`tools/workflow_runner.js`** | Orquestador ejecutable de las 7 fases del protocolo. | Emite veredicto final (`VERIFIED`, `BLOCKED`, `FAILED`). |
| **`install.js`** | Instalador autónomo de 1 comando para cualquier espacio de trabajo. | Inyecta `.agents/AGENTS.md`, `tools/` y `adapters/`. |

---

## 📚 Documentación Adicional

- [Visión del Proyecto](docs/vision.md)
- [Arquitectura Conceptual](docs/architecture.md)
- [Linaje e Historia de ZetProG](docs/lineage.md)
- [Gobernanza Formal](GOVERNANCE.md)
- [Hoja de Ruta (Roadmap)](ROADMAP.md)

---

## 📄 Licencia

Axion Protocol es un software libre y abierto. Consulta [LICENSE](LICENSE) para más información.
