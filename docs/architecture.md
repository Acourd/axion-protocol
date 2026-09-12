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

---

## Demarcación de Superficie: Core Estable (Beta) vs Módulos Experimentales

Para facilitar auditorías y mantenimiento durante la beta pública, el código ejecutable se clasifica formalmente en dos niveles de madurez:

### Capa 1: Core Estable de Gobernanza (Beta v1.4.0)
Componentes mantenidos bajo contrato estricto de pruebas deterministas e instalación soportada:
- **Las 12 Skills y Slash Commands Canónicos**: `.agents/skills/` (`attest`, `clarify`, `debug`, `drive`, `halt`, `memory`, `preflight`, `premortem`, `profile`, `review`, `snapshot`, `verify`).
- **Puntos de Entrada e Instalación**: `bin/axion.js`, `install.js`.
- **Motores Esenciales de Ejecución y Salvaguarda**:
  * `tools/preflight.js` y `tools/structured_command.js` (clasificador y ejecución sin subshell).
  * `tools/checkpoint.js`, `tools/sqlite_snapshot_isolation.js` y `tools/context_shield.js` (respaldo y aislamiento).
  * `tools/health_check.js` (diagnóstico de entorno con requisito Node >= 22.13.0).
  * `tools/vibeguard.js` y `tools/vibeguard_gate.js` (análisis estático y compuertas de higiene).
  * `tests/run_all.js` (ejecutor de las 233 suites deterministas).

### Capa 2: Módulos de Experimentación / Laboratorio
Componentes experimentales o exploratorios que no deben interpretarse como certificaciones formales ni fronteras de seguridad:
- **Telemetría en tiempo real (`tools/telemetry_gateway.js`)**: Servidor WebSocket local para depuración visual en `127.0.0.1`. Sin autenticación; no constituye una frontera de seguridad de red.
- **Protocolos de Consenso Multi-Agente (`tools/swarm_*.js`)**: Prototipos experimentales de arbitraje AST y consenso Bizantino para simulaciones de laboratorio.
- **Autoevaluación de Normativas (`tools/compliance_matrix_exporter.js`)**: Mapeo heurístico interno que no constituye certificación por organismos externos (SLSA, NIST u OWASP).
