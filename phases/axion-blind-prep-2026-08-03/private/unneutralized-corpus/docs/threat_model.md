# Modelo de amenazas inicial

## Activos

- autoridad y decisiones humanas;
- integridad de evidencias y manifests;
- identidad de componentes y runtimes;
- límites de alcance;
- procedimientos de rollback;
- datos sensibles y secretos.

## Amenazas principales

1. autoridad implícita por nombre o ubicación;
2. autoaprobación del ejecutor;
3. activación de componentes sin consumidor ni pruebas;
4. manipulación o pérdida de evidencia;
5. ampliación silenciosa del alcance;
6. ejecución irreversible sin rollback;
7. soporte declarado para runtimes no probados;
8. exposición de secretos en logs o manifests;
9. dependencia de informes históricos como instrucciones activas.

## Controles previstos

- identidad, versión, owner y aprobación explícitos;
- separación de roles;
- gates humanos para riesgo alto o crítico;
- hashes y procedencia;
- fallo cerrado;
- evidencia fuera del runtime;
- retención y restauración verificables.

## Limitación

Estos controles son requisitos documentales. No existe todavía enforcement técnico ni runtime certificado.
