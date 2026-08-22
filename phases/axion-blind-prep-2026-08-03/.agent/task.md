# Preparación de corpus ciego Axion

## Plan autorizado

- Objetivo: producir una copia ciega ejecutable y semánticamente equivalente del corpus corregido.
- Riesgo: Nivel 3 / HIGH por trazabilidad de auditoría, empaquetado e integridad del original.
- Fuente funcional: `C:\Users\Ayco\Shoshin\Project\Axion Protocol`.
- Fuente histórica excluida: `C:\Users\Ayco\Shoshin\Project\axion-audit-baseline-2026-08-03`.
- Área privada: `C:\Users\Ayco\Shoshin\axion-blind-prep-2026-08-03`.
- Entregable: `blind-corpus`, su manifest, instrucciones mínimas y un ZIP.
- Evidencia privada: inventarios, resultados de suite, diff clasificado y mapa de procedencia; nunca entra al ZIP.

## Alcance

- Copiar todo código funcional y las 16 pruebas.
- Excluir `.git`, `archive_manifest`, `CHANGELOG.md`, `LEARNINGS.md`, línea base e informes/evidencias históricos. Conservar `scratch/` vacío porque es un directorio funcional de fixtures, pero no copiar contenido eventual.
- Neutralizar sólo las cinco categorías autorizadas.
- Conservar lógica de producción, aserciones, estados esperados, códigos de salida y efectos persistentes. Las entradas adversariales permanecen idénticas salvo la sustitución única `C:\\Users\\Ayco` → `C:\\SandboxTarget`, autorizada el 2026-08-03.

## NO HACER

- No escribir en el original ni en la línea base.
- No ejecutar Fase D ni auditar defectos del producto.
- No alterar imports, exports, llamadas, condiciones, ramas, aserciones, fixtures funcionales o criterios de aprobación.
- No incluir el mapa de procedencia ni rutas personales en el entregable.

## Criterios de aceptación

- Original y línea base intactos.
- 16/16 pruebas presentes antes y después; mismos códigos de salida y mismo PASS/FAIL.
- Cero cambios fuera de `FILENAME_NEUTRALIZATION`, `COMMENT_NEUTRALIZATION`, `DIAGNOSTIC_STRING_NEUTRALIZATION`, `TEMP_PATH_NEUTRALIZATION` y `PERSONAL_PATH_REDACTION`.
- Cero identificadores históricos, fases/veredictos previos, hashes de línea base o rutas personales absolutas.
- Manifest y ZIP verificables por SHA-256; procedencia fuera del ZIP.

## CHECK global

`PASS` sólo si inventarios, suite, diff clasificado, escaneo de filtraciones, contenido del ZIP e integridad del original cumplen todos los criterios. Cualquier diferencia no permitida produce `FAIL` y detiene el flujo.

## Decisiones humanas

- Gate final: aprobado por el usuario el 2026-08-03.
- Equivalencia: semántica estricta; diagnóstico, comentarios, rutas temporales y rutas documentales pueden diferir.
- Excepción final: autorizada exclusivamente la neutralización semántica de una ruta dentro de una entrada adversarial, sin cambiar verbo, raíz, flags, intención ni resultado esperado.
- Decisiones pendientes: ninguna.

## Tareas atómicas

- [x] T1 Congelar inventario, hashes, HEAD, índice y estado del original. CHECK PASS: 75 archivos fuente, 10 archivos de línea base y 41 entradas Git preexistentes protegidas.
- [x] T2 Crear copia filtrada no neutralizada. CHECK PASS: 70 archivos, 16 pruebas, hashes iguales, exclusiones ausentes y `scratch/` vacío.
- [x] T3 Ejecutar suite previa. CHECK PASS: 16/16 códigos 0; árbol del corpus y temporal sin efectos persistentes. Un fallo inicial del comprobador quedó preservado y clasificado.
- [x] T4 Duplicar corpus y renombrar ocho pruebas. CHECK PASS: 16 pruebas conservadas, 8 nombres neutrales y 0 nombres `ax_f_*`.
- [x] T5 Neutralizar comentarios, diagnósticos, rutas temporales, documentación y ruta personal. CHECK PASS: 35 diferencias clasificadas; 0 diferencias no autorizadas.
- [x] T6 Verificar estructura semántica. CHECK PASS: 9 JavaScript de producción, 76 aserciones, imports, entradas adversariales y estados esperados idénticos; sintaxis válida.
- [x] T7 Ejecutar suite ciega. CHECK PASS: 16/16 códigos y PASS/FAIL idénticos; efectos persistentes iguales; 9 salidas diagnósticas distintas permitidas.
- [x] T8 Crear manifest, instrucciones y mapa privado de procedencia. CHECK PASS: 71 hashes de payload, 25 ejecutables, 16 pruebas, 70 entradas privadas y esquema exacto.
- [x] T9 Escanear filtraciones, crear ZIP y verificar contenido/hash. CHECK PASS final: autorización aplicada, cinco contadores en cero, ZIP íntegro y SHA-256 verificado.
- [x] T10 Revalidar original y cerrar. CHECK PASS de seguridad: 75 archivos originales, 10 de línea base, HEAD, índice y 41 cambios preexistentes idénticos al snapshot inicial. Iteración BLOCKED por T9.

## Reanudación autorizada de T9

- [x] T9.1 Sustituir únicamente la ruta adversarial autorizada. CHECK PASS: prueba afectada código 0 y preflight devuelve `STOP` para `C:\\SandboxTarget`.
- [x] T9.2 Revalidar diff y aserciones. CHECK PASS: 36 diferencias autorizadas, 76 aserciones idénticas y sólo la ruta adversarial aprobada difiere semánticamente.
- [x] T9.3 Repetir suite y filtraciones. CHECK PASS: 16/16 códigos 0, resultados y efectos idénticos; cinco contadores en cero.
- [x] T9.4 Regenerar manifest y procedencia; crear/verificar ZIP. CHECK PASS: 72 archivos, 1 directorio vacío, hashes internos válidos, 0 evidencia privada y SHA-256 verificado.
- [x] T9.5 Revalidar original y línea base. CHECK PASS: 75 archivos originales, 10 de línea base, HEAD, índice y 41 cambios preexistentes idénticos.
