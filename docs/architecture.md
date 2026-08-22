# Arquitectura conceptual

## Flujo de control

```text
Human Authority → Director → Executor
                         ↓
                    Supervisor
                         ↓
                      Auditor
                         ↓
                  Evidence Layer
```

## Director

Comprende el objetivo, descompone la tarea, estima impacto, selecciona capacidades, asigna esfuerzo y solicita gates.

## Executor

Ejecuta una acción aprobada mediante un adaptador o proveedor. No decide promoción ni certifica su propia salida.

## Supervisor

Vigila alcance, límites, cambios, checkpoints y condiciones de detención durante la ejecución.

## Auditor

Reproduce verificaciones, contrasta afirmaciones y emite un veredicto independiente.

## Evidence Layer

Registra procedencia, decisiones, entradas, salidas, logs, hashes, snapshots y rollback. La evidencia permanece separada del runtime activo.

## Proveedores externos

Modelos, herramientas, skills y ecosistemas externos se consumen mediante contratos explícitos. La integración requiere identidad, versión, licencia, runtime, activador, consumidor, pruebas y rollback.

## Estado

Esta arquitectura está **parcialmente implementada**, y conviene distinguir las dos mitades.

Los directorios `core` siguen siendo **conceptuales**: describen las responsabilidades de
Director, Supervisor, Auditor y Evidence Layer, y no contienen componentes ejecutables.

La capa de workflow y enforcement **sí existe** y vive en `tools/`: orquestación fail-closed de
las siete fases, compilación de la política de riesgo, verificación Ed25519 de aprobaciones y
CHECK, clasificación de comandos y manifiestos de evidencia SHA-256.

Ese enforcement solo actúa cuando un consumidor invoca `tools/workflow_runner.js` y respeta su
veredicto. No hay interceptación global ni runtime certificado.
