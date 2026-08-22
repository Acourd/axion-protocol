# Tests

Este directorio contiene una suite ejecutable con Node.js, sin dependencias externas ni
runner de terceros. Cada archivo se ejecuta con `node tests/<archivo>` y señala su
resultado mediante el código de salida.

## Suite funcional (8 archivos)

`tools`, `workflow`, `clarifier`, `learning_git`, `install`, `adversarial`, `vibeguard`,
`human_anti_patterns`.

## Pruebas de regresión (`regression/`)

Fijan el comportamiento exigido por las políticas del proyecto tras la auditoría
independiente del 2026-08-03. Cada archivo corresponde a un hallazgo `AX-F-*` y fue
verificado en rojo antes de su parche y en verde después.

## Alcance y límites

Una suite en verde **no constituye promoción ni certificación**
(`policies/promotion.yaml`: `execution_implies_support: false`).

No hay instrumentación de cobertura: `lines_executed` y `branch_coverage` no se miden y
no deben declararse. Las pruebas cubren contratos, fallo cerrado y preservación de datos;
no cubren el renderizado de las interfaces web ni el comportamiento concurrente.
