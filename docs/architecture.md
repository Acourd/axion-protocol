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

Esta arquitectura no está implementada. Los directorios `core` describen contratos conceptuales, no componentes ejecutables.
