# Adapters

## Propósito

Reservar la frontera contractual con proveedores de modelos, herramientas y capacidades.

## Entradas

Contrato aprobado, identidad del proveedor, versión, licencia, runtime, activador y límites.

## Salidas

Una traducción auditable entre el modelo de Axion Protocol y un proveedor específico.

## Límites

`prompt_bridge.json` es un puente declarativo estático: texto de directivas dirigido a un
agente de IA. No es un adaptador de runtime, no traduce llamadas y ningún módulo lo carga
por código. No existe ningún runtime soportado; añadir uno requiere autorización, pruebas
y rollback.

## Estado

`EXPERIMENTAL` · Contenido declarativo sin ejecución. Su presencia no concede autoridad
(`policies/authority.yaml`: `location_grants_authority: false`).
