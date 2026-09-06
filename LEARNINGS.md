
- **[PRODUCT_PREFERENCE]** (2026-08-03): Nunca avanzar a CONSTRUIR tras una sugerencia o idea abierta de página web sin antes aplicar el Aclarador de Intención y preguntar por el tipo de interfaz, visión y tecnologías deseadas.

- **[UX_DESIGN]** (2026-08-03): Al clarificar intenciones (Fase 1), implementar un proceso multi-paso por fases: 1) Dirección de Producto, 2) Estilo Visual y Animaciones (efectos, movimiento, diseño), 3) Alcance Funcional. Nunca asumir preferencias estéticas sin consultar.

- **[PRODUCT_PREFERENCE]** (2026-08-03): Formalizar el Módulo de Clarificación de Diseño & UX en Fase 1: Incluir siempre la Matriz de Sentimiento e Intención de Marca (Design Intent). Usar generate_image solo como apoyo visual estático para UIs.

- **[PRODUCT_PREFERENCE]** (2026-08-03): Incluir siempre una Opción Personalizada / Dictado Libre al final de las opciones en cada sub-paso del Aclarador de Intención, permitiendo al usuario ingresar su propio criterio sin quedar acotado a opciones predefinidas.

- **[UX_DESIGN]** (2026-08-03): Reglas de Diseño UI/UX: 1) Usar íconos SVG vectoriales limpios (jamás emojis), 2) Usar tipografía distintiva premium (Outfit/Plus Jakarta Sans), 3) Usar tonos oscuros grises/negros pulidos mate con alto contraste, 4) Barra superior autohide al hacer scroll, 5) Animaciones selectivas elegantes.

- **[CODE_PATTERN]** (2026-09-05): Aprendizajes consolidados de Linear: 1) VERIFICADO exige ejecucion real en host, diff solo da EVIDENCIA_INSUFICIENTE o RESULTADO_PARCIAL. 2) Descubrir capacidades antes de exigir, cero rutas fantasma en repos ajenos. 3) Escalamiento humano obligatorio ante riesgo o ambiguedad material. 4) Acciones observables en Nivel 1. 5) Modelos como preferencias experimentales. 6) Toda declaracion de VERIFICADO debe delimitar explicitamente su alcance (tarea y suites ejecutadas), sin pretender garantias universales. 7) Las auditorias agenticas exigen pruebas de comportamiento real con herramientas, neutralizacion multi-vector (Base64, homoglifos Unicode, fragmentacion) y trazabilidad versionada. 8) Rediseño de /drive en 3 capas: Politica, Plan de Ejecucion (estrategias proporcionales: TDD para logica, equivalencia para refactor, estatica para docs/config) y Verificacion (oraculo directo del DoD, separacion de resultados y causas de detencion).

- **[ENGINEERING_GOVERNANCE]** (2026-09-05): Veredicto final de Linear para `/drive` v5.0.0: **VERIFICADO, con alcance delimitado**. Límites canónicos formalizados: 1) `validateDoDAlignment()` no puede "comprender" semánticamente cualquier DoD de forma universal; debe apoyarse en un **oráculo declarado** explícito por la misión (comando, salida, artefacto generado o aserción). 2) builds, chequeos de tipos (`tsc`, linters) y empaquetados no tienen "aserciones" y validan válidamente mediante `exit code 0` y artefactos conformes: oráculos declarados de tipo BUILD / TYPECHECK son aceptados legítimamente. 3) La reclamación de locks huérfanos por antigüedad (`mtime > 600s`, `STALE_PROCESS`) requiere adquisición atómica con verificación CAS (Compare-And-Swap) para eliminar condiciones de carrera entre múltiples procesos concurrentes.


