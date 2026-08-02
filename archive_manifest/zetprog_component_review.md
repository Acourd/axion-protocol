# Revisión conceptual de componentes de ZetProG

## Alcance

Esta revisión cubre categorías conceptuales observadas durante la historia y auditoría de ZetProG. No copia contenido, no integra ramas y no modifica el repositorio histórico.

| Categoría de origen | Consumidor real | Runtime | Decisión | Motivo |
| --- | --- | --- | --- | --- |
| Gobernanza y decisiones humanas | Conceptual | Ninguno | ADAPT | Reescribir con autoridad explícita y fallo cerrado |
| Auditoría independiente | Conceptual | Ninguno | ADOPT | Principio central con separación del ejecutor |
| Manifests, hashes y custodia | Conceptual | Ninguno | ADAPT | Conservar el modelo, separar evidencia del runtime |
| Procedimientos de rollback | Conceptual | Ninguno | ADAPT | Exigir proporcionalidad y verificación |
| Adaptadores por runtime | No demostrado | Desconocido | DEFER | Requiere consumidor, contrato y pruebas |
| `capabilities.yaml` sin loader | No demostrado | Desconocido | REJECT | Declaración sin enforcement ni consumidor probado |
| Perfiles y candidatos ambiguos | No demostrado | Desconocido | ARCHIVE | Preservar solo como historia |
| Memoria dual y overlays autodeclarados | No demostrado | Desconocido | REJECT | Riesgo de autoridad e identidad ambiguas |
| Scripts, skills y código ejecutable | Variable | No certificado | DEFER | Fuera de alcance de la fase fundacional |
| Evidencia histórica | Auditoría humana | No aplica | REFERENCE | Permanece fuera del repositorio activo |

## Licencia y procedencia

No se importó material de ZetProG. Cualquier revisión futura de un archivo concreto deberá identificar licencia, OID o hash, versión, dependencias, consumidor, modificaciones y pruebas antes de decidir su adopción.
