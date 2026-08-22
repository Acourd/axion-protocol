# H-6b · 17 — Mutador dirigido a la rama `failed > 0`

## Corrección previa obligatoria: las meta-pruebas de H-6a eran espurias

Antes de construir el mutador dirigido hubo que auditar el mecanismo que lo ejecutaría. **Las 8
meta-pruebas declaradas `ORACLE_SOUND` en H-6a no probaron nada.**

```text
ESPURIO tests/phase_e/approval_ed25519.test.js    exit 1   → Cannot find module 'C:/Users/Ayco/Shoshin/Proyectos/Axion'
ESPURIO … las 8 idénticas …
meta-pruebas espurias: 8/8
```

Dos defectos encadenados en el corredor de H-6a:

1. El mutador se pasaba por `NODE_OPTIONS` con ruta Windows. El parser de `NODE_OPTIONS` parte
   la ruta en el espacio de `Axion Protocol` y trata los separadores invertidos como escapes:
   el módulo nunca se cargaba.
2. El corredor tomaba `exit != 0` como prueba de solidez. Un `MODULE_NOT_FOUND` sale con 1, y
   se contabilizaba como «el oráculo detectó la mutación».

Es la misma familia de error que `AX-NC-0002`: **confundir un código de salida con una
demostración.** El instrumento que iba a auditar el autoengaño lo reproducía.

### Correcciones aplicadas

| Defecto | Corrección |
|---|---|
| Ruta destrozada por `NODE_OPTIONS` | El mutador se pasa como argumento directo: `spawnSync(node, ['--require', mut, suite])`, con `NODE_OPTIONS` vaciado |
| `exit != 0` tomado como prueba | Cada mutador emite `AXION_MUTATION_APPLIED:<nombre>`; sin centinela el veredicto es `ORACLE_GAP`, nunca `ORACLE_SOUND` |

Principio incorporado: **un `exit != 0` bajo mutación no prueba nada si la mutación no se aplicó.**

## El mutador dirigido

`h6a/oracle/mut_reintroduce_f01.js` reintroduce exactamente la vulnerabilidad F-01: cuando
`verifyAndConsumeApproval` rechaza por autoaprobación, devuelve `APPROVAL_VALID`. Es, literalmente,
el corpus anterior al parche de Fase G.

### Por qué es dirigido y no amplio

`role_separation.test.js` tiene tres salidas:

```javascript
if (invalidTests > 0) { … process.exit(2); }   // rama alcanzada por la mutación amplia
if (failed > 0)       { … process.exit(0); }   // RAMA DEFECTUOSA, objetivo
                        … process.exit(0);
```

`expectStatus(..., isRedTest)` enruta cada discrepancia: `isRedTest = true` → `failed++`;
`false` → `invalidTests++`. Para aterrizar sólo en `failed` hay que alterar exclusivamente los
casos rojos que dependen de la aprobación (1, 4 y la rama `VALID` del 10) y dejar intactos los
verdes (2, 5, 6, 7, 8) y todo `verifyIndependentCheck`.

### Resultado

```text
[1]  RED_CONFIRMED: executor=approver blocked at approval — got APPROVAL_VALID
[2]  PASS   [3] PASS   [5] PASS   [6] PASS   [7] PASS   [8] PASS   [9] PASS
[4]  RED_CONFIRMED: all-same blocked at approval — got APPROVAL_VALID
[10] RED_CONFIRMED: self-approval accepted and nonce consumed (0 files created)

Already passing (green): 7
Vulnerability demonstrated (red): 3
Invalid tests: 0

STATUS: RED_TESTS_VALID — 3 vulnerabilities confirmed, ready for patch.
EXIT = 0
```

| Criterio exigido | Resultado |
|---|---|
| Una aserción falla | 3 fallan (casos 1, 4, 10) |
| `failed` incrementa | `failed = 3` |
| El proceso termina con código ≠ 0 | **No: termina con 0** ← defecto demostrado |
| No se toma la rama `invalidTests` | `invalidTests = 0`, confirmado |
| No convertible en PASS vía `expectation` | El corredor ignora `expectation` para el código de salida |
| Mutación efectivamente aplicada | Centinela `AXION_MUTATION_APPLIED:mut_reintroduce_f01` presente |

**Veredicto: `ORACLE_DEFECT`, demostrado dinámicamente.** No `ORACLE_GAP`: la rama se ejerció.

Un CI que ejecutara esta suite contabilizaría PASS mientras F-01 está íntegramente reintroducida.
Es el mecanismo exacto por el que Fase G se certificó a sí misma.
