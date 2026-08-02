# Axion Protocol

> Experimental · Pre-alpha · Governance-first · No certified runtimes

Axion Protocol es una capa experimental de dirección, supervisión y trazabilidad para sistemas de IA. Su objetivo es ayudar a que una persona comprenda qué intenta hacer un sistema, por qué seleccionó determinados recursos, qué cambió, qué evidencia produjo y cómo puede revertirse el resultado.

## Para quién es

Está pensado para usuarios que necesitan controlar y entender procesos agentivos sin requerir conocimiento técnico profundo.

## Qué hace

- dirige recursos hacia la parte correcta de un problema;
- separa decisión, ejecución, supervisión y auditoría;
- registra decisiones, riesgos, evidencias y aprobaciones;
- exige fallo cerrado cuando faltan autoridad, identidad o rollback;
- facilita auditoría independiente y recuperación.

## Qué no hace

- no es un modelo de IA ni un runtime autónomo;
- no reemplaza a ECC ni a otros proveedores de capacidades;
- no es un catálogo masivo de skills;
- no garantiza exactitud ni ausencia de errores;
- no ejecuta acciones críticas sin autorización humana;
- no declara compatibilidad con runtimes no probados;
- no convierte documentación en enforcement.

## Modelo conceptual

```text
Usuario / Human Authority
          ↓
      Director
          ↓
       Executor
          ↓
      Supervisor
          ↓
        Auditor
          ↓
    Evidence Layer
          ↓
Proveedores externos de capacidades
```

El ejecutor no aprueba su propio resultado. La autoridad depende de una declaración explícita, un consumidor y un mecanismo de enforcement; nunca de la ubicación o del nombre de un archivo.

## Estado del repositorio

Esta versión contiene únicamente estructura, documentación, políticas experimentales, esquemas y manifiestos. No contiene código funcional, agentes, skills, memoria activa ni adaptadores ejecutables.

## Documentación

- [Visión](docs/vision.md)
- [Arquitectura](docs/architecture.md)
- [Terminología](docs/terminology.md)
- [Límites y non-goals](docs/non_goals.md)
- [Linaje de ZetProG](docs/lineage.md)
- [Ecosistemas externos](docs/external_ecosystems.md)
- [Modelo de amenazas](docs/threat_model.md)
- [Modelo de control de recursos](docs/task_model.md)
- [Gobernanza](GOVERNANCE.md)
- [Roadmap](ROADMAP.md)

## Licencia

La licencia definitiva está pendiente de una decisión humana. Consulta [LICENSE](LICENSE) antes de reutilizar cualquier contenido.
