# Seguridad

## Estado de seguridad

Axion Protocol está en fase pre-alpha, no contiene runtime funcional y no debe utilizarse como control de seguridad efectivo.

## Principios

- fallo cerrado ante autoridad ambigua, identidad incompleta o runtime desconocido;
- privilegio mínimo y alcance explícito;
- autorización humana para riesgo `HIGH` o `CRITICAL`;
- separación entre ejecución y auditoría;
- evidencia verificable y rollback proporcional;
- secretos fuera de manifests, logs, ejemplos y commits.

## Reporte responsable

No se publica todavía un canal de seguridad. Hasta que Human Authority apruebe uno, no incluyas secretos ni datos sensibles en reportes. Registra únicamente una descripción mínima y conserva la evidencia sensible fuera del repositorio.

## Vulnerabilidades fuera de alcance actual

Al no existir implementación, las políticas describen intención y límites; no constituyen controles ejecutables. Cualquier futuro adaptador o runtime necesitará su propio modelo de amenazas y pruebas antes de promoción.
