# Traspaso de sesión — Axion Protocol

**Estado medido el 2026-08-25.** Todo número aquí sale de una ejecución real, no de la
documentación. Si al leer esto los números no cuadran, cree a la ejecución.

```bash
node tests/run_all.js      # 78/78 en verde
node bin/axion.js check    # 11/11 en verde
node bin/axion.js vibeguard # PASS con 5 avisos LOW (no bloquean)
```

---

## 1. Qué es esto en tres líneas

Runtime de gobernanza **fail-closed** para agentes: clasifica cada comando antes de la
terminal, puede pararse en seco, revierte con verificación previa y emite evidencia
criptográfica que un tercero puede comprobar. Cero dependencias externas — solo módulos
integrados de Node. Se distribuye como paquete npm y como plugin de Claude Code.

Se opera con 17 slash commands. `v1.2.0-beta.1`.

---

## 2. Dónde vive cada cosa

| Ruta | Qué es |
|---|---|
| `tools/*.js` | 33 herramientas, 6.288 líneas. El runtime real. |
| `.agents/skills/<n>/SKILL.md` | Los 17 comandos, formato que Antigravity monta. **Fuente única.** |
| `.claude/commands/*.md` | Copia byte a byte para Claude Code. Un test vigila la deriva. |
| `~/.claude/commands/` | Los mismos 17, ámbito de usuario de Claude Code (`axion init --user`). |
| `~/.gemini/config/skills/` | Los mismos 17, ámbito global de Antigravity (mismo comando). |
| `.agents/hooks/validate-tool-call.mjs` | La única salvaguarda que corre en tiempo real. |
| `policies/risk.yaml` | Política de riesgo. **Es dato, no código**: subir un requisito de nivel es editar una línea. |
| `.axion/` | Estado de runtime. Gitignored. Memoria, checkpoints, anclas, atestaciones. |
| `docs/site/` | La portada. Excluida del tarball con `!docs/site/`. |
| `tests/` | 78 suites, 8.072 líneas: `funcional` (8), `regression` (48), `phase_e` (22). |

---

## 3. Invariantes que costaron caro

Esto es lo que no se deduce leyendo el código, y lo que más duele romper.

**El veredicto se deriva, nunca se declara.** `/premortem` aceptaba `payload.verdict` y un
análisis con la competencia no justificada se autodeclaraba aprobado. Hoy solo se admite
*endurecer* el veredicto, jamás suavizarlo. Es la misma asimetría del killswitch: parar es
barato, levantar la parada es un acto humano deliberado.

**Un rechazo tiene que doler en el código de salida.** Contrato compartido por
`/preflight`, `/premortem` y `/checkpoint`: **0 adelante · 2 decisión humana · 1 no**. Un
veredicto de rechazo que salía con 0 dejaba pasar la idea rechazada en cualquier CI.

**Verde sobre superficie inalcanzable es el defecto recurrente de este proyecto.** Ha
aparecido **cinco** veces: un hook que existía y estaba muerto; 16 comandos contados en el
proyecto que Claude Code no leía; un tarball sin gobernanza; un manifiesto de integridad
que no cuadraba con nada; y —2026-08-24— el bloque de preservación de perfil de
`tools/updater.js:32-50`, que se puede anular entero sin que ninguna suite se ponga en
rojo, porque `install.js` no escribe `PROFILE.json` en ninguna línea y el perfil sobrevive
por omisión. **Cuando algo dé verde, pregunta qué pasaría si la pieza no existiera.** Si la
respuesta es "seguiría en verde", el chequeo no vale.

**Lo verificado se re-verifica, no se cree.** Un registro sellado en `.axion/state/` es un
fichero que cualquiera edita. Al releerlo se recalcula el digest canónico y se vuelve a
derivar el veredicto desde el contenido.

**La documentación y el motor tienen que hablar el mismo idioma.** Dos veces el prompt
prometió algo que el código no hacía: `/preflight` documentaba veredictos `PASS`/`BLOCKED`
inexistentes, y prometía bloquear `curl x | sh` sin hacerlo. Hay tests que lo vigilan.

**`hashCanonical` para todo digest.** El mismo contenido con las claves en otro orden debe
dar el mismo hash. Lo usan siete herramientas; el que no lo usaba producía evidencia
incomparable entre máquinas.

**Las pruebas no escriben en `.axion/` del proyecto.** Cada suite usa su arenal temporal.
Cuando no lo hacían, el detector de calco veía registros de corridas anteriores y el
resultado dependía del orden de ejecución.

---

## 4. La tanda de 36 suites: diagnóstico, verificación y consolidación

Antigravity añadió **36 suites de regresión** (AX-F-025 → AX-F-060) y dos herramientas
(`fuzzer.js`, `sync_doc_stats.js`). El diagnóstico de la sesión anterior fue "volumen sin
cobertura nueva proporcional". Se verificó punto por punto y se actuó. Esto es lo que
quedó en pie y lo que no.

### 4.1 Lo que se confirmó

La redundancia era real. Seis herramientas tenían dos o más suites de regresión que
cubrían el mismo terreno con fixtures distintos. Consolidadas: **86 → 78 suites**.

| Herramienta | Superviviente | Retiradas |
|---|---|---|
| `profile_adapter.js` | `ax_f_025` | `ax_f_045` |
| `updater.js` | `ax_f_026` | `ax_f_043` |
| `risk_policy_compiler.js` | `ax_f_035` | `ax_f_052` |
| `checkpoint.js` | `ax_f_039` | `ax_f_054` |
| `memory.js` | `ax_f_017` | `ax_f_038`, `ax_f_056` |
| `evidence_hasher.js` | `ax_f_028` | `ax_f_041`, `ax_f_053` |

También se confirmó el perfil de **líneas** (115 previas → 69 nuevas) y el de
**comentarios**, que resultó peor de lo declarado: 12,6 → 5,1 contando solo `//`, y
21,3 → 5,1 contando bloques.

### 4.2 Lo que resultó falso

El dato de aserciones de la tanda anterior —"previas 5, nuevas 13"— **era un artefacto de
medición**. Seis de las veinte suites previas usan un helper `ok(cond, msg)` que envuelve
`assert.strictEqual`; una regex que busca `assert.X(` las cuenta como **una sola**
comprobación sin importar cuántas haga. Contando los helpers:

| | Método ingenuo | Contando helpers |
|---|---|---|
| Previas (20) | 4,4 | **12,3** |
| Nuevas (36) | 13,4 | **13,4** |

No había brecha de densidad: había una diferencia de estilo. Ninguna de las 36 nuevas usa
helper. **Si vuelves a medir aserciones, cuenta los helpers o no midas.**

La tabla de redundancia anterior también sobrecontaba: listaba todo fichero que hiciera
`require()` de una herramienta. `ax_f_018` figuraba bajo `evidence_hasher` y no es una
suite del hasher — prueba que los artefactos de integridad declaren su alcance
(`sha256-manifest.txt`, exclusión del tarball, rutas fantasma en los prompts) y solo *usa*
el hasher para comprobar que el verificador vivo funciona. Sigue intacta.

### 4.3 Cómo se consolidó, y por qué se puede confiar

Ninguna suite se borró por parecido. Para cada par: inventario de aserciones una a una,
fusión en la superviviente, y **prueba por mutación** — romper la herramienta a propósito
por cada superficie que era exclusiva de la suite que se retiraba, y comprobar que la
fusionada se pone en rojo. Treinta mutaciones, treinta muertes.

La consolidación **añadió** cobertura, no solo la preservó:

- `ax_f_017` no probaba `verificarGuard` en absoluto, pese a ser la suite de memoria más
  completa. Ahora sí.
- Tres aserciones de `ax_f_045` comparaban `getProfile()` contra la constante que
  `getProfile()` devuelve. Tautologías: no podían fallar. Ahora usan literales.
- `errores.length > 0` pasó a `=== 2`; el pie del ancla ahora exige nombrar `MEMORY.md`,
  no solo declarar un número.

La suite sigue pesando más que el producto —**8.072 líneas contra 6.288**— y bajó poco
desde 8.310 porque se quitó redundancia y se añadió el *porqué* que faltaba, que era la
otra mitad del diagnóstico.

### 4.4 `ax_f_012` cambió de naturaleza, y se reforzó

Antes exigía que **el README nombrara cada archivo de prueba**. El cambio de la tanda
anterior lo sustituyó por "el número declarado coincide" más un `includes` sobre el
encabezado de la Matriz de Cobertura. Ese cambio dejó dos agujeros, los dos reproducidos
en vivo durante esta sesión:

- **La aserción 5b no verificaba nada.** `readme.includes('Coverage by Domain')` es una
  búsqueda de subcadena sobre una matriz que `sync_doc_stats.js` **no genera** — la
  herramienta solo reescribe patrones numéricos de total. Al bajar de 86 a 85, el total se
  actualizó y la columna por dominio siguió sumando 86: el README se contradecía a sí mismo
  y `ax_f_012` salió con exit 0.
- **`ax_f_012` solo leía `README.md`.** Antes y después del cambio. Por eso el español pudo
  derivar hasta declarar 50 suites cuando había 86.

**Ambos cerrados.** La sección 5 ahora comprueba tres cosas, y las tres se verificaron
capaces de fallar mutando los propios README:

| Aserción | Mutación | Mensaje |
|---|---|---|
| Total en `README.md` | declara 99 | `README.md declara 99 suites pero existen 78` |
| Total en `README.es.md` | declara 50 | `README.es.md declara 50 suites pero existen 78` |
| La matriz suma su total | un dominio 13 → 20 | `la matriz por dominios suma 85 (23+17+20+11+14) pero existen 78` |
| El total de cierre concuerda | `Total: 86` | `la línea de total dice 86 pero los dominios suman 78` |

Y `sync_doc_stats.js` sincroniza ahora `README.es.md` además del inglés, el sitio y los
totales por tanda. El circuito completo está probado: se sabotea el español, `ax_f_012` se
pone rojo, un `node tools/sync_doc_stats.js` lo remedia y vuelve a verde.

Queda en pie una observación sobre la herramienta: **no está automatizada**. No hay script
en `package.json`, ni hooks de git instalados, ni referencia en `.github/workflows/ci.yml`.
Eso es lo que mantiene el invariante con dientes: si añades una suite y no sincronizas,
`ax_f_012` se pone roja. Ocurrió durante esta sesión y funcionó. Automatizarla en un hook
convertiría el chequeo en auto-satisfecho — un script escribe la cifra y un test comprueba
la cifra. **No lo hagas sin sustituir antes el chequeo por otro que no dependa del número.**

### 4.5 Auditoría de los 16 comandos (ejecutados, no leídos)

Se recorrieron los dieciséis ejercitando su motor, incluidas las rutas destructivas en
arenal aislado. **Trece funcionan exactamente como su prompt promete.** Verificado bajo
ataque, no por inspección:

- `/preflight` — ALLOW **sí** es alcanzable, por la vía documentada: comando estructurado
  con `shell:false` y en la allowlist. Una cadena de shell cruda nunca lo obtiene, y
  `shell:true` recibe DENY. Las dos evasiones de §6 siguen cerradas.
- `/halt` + `/unhalt` — con la parada activa el hook devuelve `permissionDecision: deny` y
  el runner corta con `BLOCKED_SYSTEM_HALTED` antes de la fase 1.
- `/checkpoint` + `/rollback` — el restore sella una red `[red]` antes de tocar nada, así
  que la reversión es reversible. Sin punto de control: `CHECKPOINT_MISSING`, exit 1.
- `/attest` — el sobre DSSE verifica con exit 0; manipulado da `INVALID` con exit 1.
- `/premortem` — no se puede autoaprobar ni editando el JSON sellado, y no se puede
  reciclar una autopsia. Detalle en §4.6.

**Cuatro defectos encontrados y corregidos**, todos de la misma familia — el contrato de
§3 «un rechazo tiene que doler en el código de salida»:

| Herramienta | Defecto | Ahora |
|---|---|---|
| `deep_reasoning.js` | imprimía el uso y salía con 0 | exit 2 |
| `intent_clarifier.js` | imprimía el uso y salía con 0 | exit 2 |
| `evidence_hasher.js` | imprimía el uso y salía con 0 | exit 2 |
| `learning_engine.js` | imprimía el uso y salía con 0 | exit 2 |

Y dos de fondo:

- **La puerta de `/clarify` era ilegible desde fuera.** CLAUDE.md prohíbe escribir código
  hasta que exista un `IntentContract`, pero `intent_clarifier.js current` salía con 0
  tanto si lo había como si no. Ninguna comprobación podía distinguir los dos estados.
  Ahora sigue el contrato: 0 hay contrato, 1 no lo hay.
- **El escudo de memoria dejaba indefensos los límites escuetos.** El umbral exigía dos
  palabras coincidentes salvo que el límite tuviera una sola, así que «no tocar
  produccion» no colisionaba con «modificar produccion»: faltaba el verbo. Cuanto más
  corto y contundente se escribía la regla, menos la defendía el escudo. El umbral se
  escala ahora con la longitud del límite y nunca exige más que antes.

Todo ello quedó blindado en `ax_f_016` —cuya cabecera ya describía este mismo patrón para
otras tres herramientas— y en `ax_f_017`. La comprobación que importa no es la lista de
herramientas, que envejece: es la **guardia estática** que recorre `tools/` buscando el
patrón «imprime un uso y sale con 0». Encontró `learning_engine.js` sola, que no estaba en
ninguna lista, y encontrará a la siguiente que derive.

### 4.6 `/premortem` bajo ataque

Se comprobó que la funcionalidad se sostiene, no que se ejecute:

| Ataque | Resultado |
|---|---|
| Declararse un veredicto más laxo | `VERDICT_DOWNGRADE_REFUSED`, exit 1 |
| Declararse uno más severo | aceptado, con `hardened_from` |
| Reciclar una autopsia cambiando el título | `PREMORTEM_BOILERPLATE`, cita con cuál choca |
| Editar solo el campo `verdict` del registro | ignorado: se re-deriva desde el payload |
| Editar el payload sellado | `PREMORTEM_TAMPERED`, digest no cuadra |

Dos imprecisiones menores, ninguna explotable. `premortem.js show` **vuelca el fichero sin
re-verificar**: con un registro manipulado imprimió un `verdict` que contradecía a su
propio `verdict_rationale`, y salió con 0. No hay agujero —ninguna decisión pasa por
`show`, y `loadRecord`, que es la ruta del runner, sí re-deriva— pero la vista que lee un
humano no protege como la que lee la máquina. Y el prompt dice que se persisten las
salvaguardas «aprobadas»: el motor persiste salvo `DENIED`, así que `CONDITIONAL_TDD` y
`PIVOT_REQUIRED` también dejan convenciones. Para el primero es correcto; para
`PIVOT_REQUIRED` es discutible, porque ese enfoque puede abandonarse.

---

### 4.7 `/drive` — el comando 17

No existía. `git log --all --diff-filter=A --name-only` sobre toda la historia confirma que
ningún commit añadió jamás un fichero con ese nombre: la única aparición literal de la
cadena en el corpus es «Test-**Driven** Development». Vivía solo en la sesión.

Es **el único comando que suelta en vez de sujetar** — los otros dieciséis son frenos. Por
eso se define por su perímetro: la autonomía está en no preguntar entre pasos, nunca en
saltarse una puerta. Preflight, premortem, el hook y el killswitch lo detienen igual.

Dos decisiones de diseño que no venían en la especificación y conviene conocer:

- **Regla de no reincidencia.** Si la herramienta ya tiene suite, el caso nuevo va dentro;
  solo se crea un `ax_f_XXX` cuando no tiene ninguna. Sin esa regla, `/drive` es
  literalmente la máquina que llevó el proyecto a 86 suites con cobertura triplicada.
- **El espejo sella antes de borrar.** Axkern no tiene git y `robocopy /MIR` elimina en el
  destino lo que ya no está en el origen. La fase 4 sella un checkpoint del destino antes
  de tocarlo, así que el espejo es reversible.

Su integración destapó dos deudas previas, ambas cazadas por guardias que ya existían:

- **`sync_doc_stats.js` no viajaba en el paquete.** El README del proyecto instalado ya
  mandaba ejecutarla. Nadie lo notaba porque el chequeo solo audita las herramientas que
  cita un *workflow*, y ninguna lo hacía hasta `drive.md`. Añadida al instalador.
- **La lista de workflows estaba cableada en dos sitios** (`health_check.js` y
  `install.test.js`). Ahora ambas se derivan del disco: un comando nuevo que no se registre
  pone la suite en rojo por la causa, no por el número.

Quedan cuatro herramientas fuera del paquete —`approval_ed25519.js`, `check_ed25519.js`,
`updater.js`, `wizard.js`— sin decidir si es deliberado.

### 4.8 Antigravity no arrancaba solo: el formato estaba obsoleto

**Síntoma:** el protocolo no se iniciaba en los chats de Antigravity aunque la auditoría
diera 11/11. **Causa:** los 17 comandos vivían en `.agents/workflows/*.md`, y la propia
guía de Antigravity (`builtin/skills/migrate-workflows`) los declara **obsoletos**:

> Workflows are deprecated. Skills (`.agents/skills/<name>/SKILL.md`) provide all the
> capabilities of workflows, **plus first-class slash command support** and **semantic
> agent discovery**.

Las dos capacidades que faltaban son exactamente las dos que se echaban en falta. Sexta
aparición del patrón de §3, y la más cara: el chequeo decía «16/16 en .agents/workflows»
sobre una superficie que el agente había dejado de leer.

**Migrado.** Los 17 comandos son ahora `.agents/skills/<nombre>/SKILL.md`, byte a byte
idénticos a su espejo en `.claude/commands/`. El directorio obsoleto se retiró — git
conserva los 16 que estaban trackeados.

**Y el ámbito global de Antigravity no lo cubría nadie.** `axion init --user` instalaba
solo en `~/.claude/commands` (Claude Code). Antigravity lee su ámbito global desde
`~/.gemini/config/skills/`, así que un chat abierto fuera de un proyecto con Axion no veía
un solo comando. Ahora el mismo comando instala en las dos.

Se corrigieron además tres manifiestos que declaraban cifras muertas: `antigravity.json`
listaba 14 workflows y 15 herramientas (hay 17 y 33), `AGENTS.md` documentaba 6 comandos
de 17, y los dos manifiestos de `.claude-plugin/` anunciaban 14. Ninguno tenía test.
Ahora `ax_f_024` exige que ningún manifiesto anuncie un número que no sea el real, y que
el formato obsoleto no reviva: las tres guardias se verificaron capaces de fallar.

---

## 5. Pendiente, por orden

1. **28 cambios sin commitear**, incluidas 11 suites sin trackear, `sync_doc_stats.js` y
   este traspaso. Decidir qué entra. Las suites retiradas están respaldadas fuera del repo.
2. **La versión está desfasada en los dos README**: ambos anuncian `v1.1.0-alpha` mientras
   `package.json` y `CHANGELOG.md` van por `1.2.0-beta.1`. `sync_doc_stats.js` no
   sincroniza la versión y ningún test la vigila. Es el mismo patrón que acaba de cerrarse
   con el recuento de suites, y el remedio es el mismo: que la herramienta se adueñe del
   número y que `ax_f_012` lo compare contra `package.json`.
3. **La columna por dominio se sigue manteniendo a mano.** Ya no puede mentir sobre el
   *total* —`ax_f_012` exige que sume— pero sí sobre el *reparto*: tras retirar ocho suites
   se reatribuyó por criterio (Governance 23, Crypto 17, Intent 13, State 11, Adversarial
   14), y ningún test comprueba que una suite concreta esté en el dominio que le toca.
4. **`premortem.js show` no re-verifica** (§4.6): vuelca el registro tal cual. Añadirle
   la re-derivación que ya hace `loadRecord`, o marcar en la salida que es un volcado.
5. **El prompt de `/premortem` habla de dos estados y el motor tiene tres** (§4.6).
   Decidir si `PIVOT_REQUIRED` debe dejar convenciones en memoria.
6. **Dos herramientas sin ninguna suite que las requiera**: `sync_doc_stats.js` y
   `vibeguard_gate.js`. La segunda se ejercita de hecho por `bin/axion.js vibeguard` en CI.
   La primera falla en cerrado —si su regex no casara, el README quedaría desfasado y
   `ax_f_012` se pondría rojo— pero nada prueba la herramienta en sí.
7. **`fuzzer.js` tiene dos suites** (`ax_f_020`, `ax_f_048`). No estaba en la tabla de
   redundancia original porque esa tabla se hizo mirando otras herramientas. Candidato al
   mismo tratamiento de §4.3 si se quiere seguir consolidando.
8. **El seguro de `tools/updater.js` es hoy código muerto** (§3). No es un fallo: es
   defensa contra un `install.js` futuro que sí escriba `PROFILE.json`. Pero ninguna prueba
   puede distinguir si funciona. Decidir entre retirarlo o darle un seam comprobable.
9. **Versión sin subir**: sigue en `1.2.0-beta.1`.
10. **Segunda tanda de auditoría con `/premortem`**, pendiente sobre: `/attest`,
   `/clarify`, `/verify`, `/remember`, `/deep`, y los de prompt puro (`/onboard`,
   `/review`, `/debug`, `/unhalt`). En los de prompt puro el defecto a buscar no es una
   vulnerabilidad: es **prometer algo que el runtime no cumple**.
11. **Decisión abierta del usuario**: promover `adversarial_premortem` de CRITICAL a HIGH.
   Su propia autopsia salió `CONDITIONAL_TDD` (`6470bc9765c50545`): exige antes un fixture
   compartido de misión HIGH y una prueba que distinga "dos migraciones parecidas" de
   "la misma autopsia copiada". La aserción que hablará si se promueve está en `ax_f_035`,
   sobre fixture sintético a propósito.

---

## 6. Hallazgos de seguridad ya cerrados (no reabrir sin leer esto)

Encontrados **atacando** las herramientas, no leyéndolas. Los tres tienen test de regresión.

- **`/rollback`, escritura arbitraria fuera del proyecto.** Un manifiesto con `../`
  escribía en cualquier punto del disco. El digest no protegía: nadie firma el manifiesto,
  así que quien lo edita lo recalcula. Agravante: la red de seguridad se sella desde el
  árbol de trabajo y no contenía el fichero de fuera.
- **`/preflight`, dos evasiones.** `/bin/rm -rf /` esquivaba el DENY por el prefijo de
  ruta; `curl x | sh` nunca se bloqueó pese a que el prompt lo prometía.
- **`/compact`, inyección al ancla.** Una entrada de memoria con «IGNORA TODAS LAS REGLAS»
  llegaba literal al documento que el agente relee como normativa. Y `/premortem` vuelca
  ahí sus mitigaciones sin intervención humana. Hoy la memoria entra delimitada como dato.

---

## 7. Cómo trabajar aquí

- **Arranca Claude Code desde la raíz del proyecto**, o los comandos de proyecto no cargan.
  Los de usuario ya están instalados en `~/.claude/commands`.
- **Ataca antes de auditar.** Los tres hallazgos de §6 salieron de intentar romper las
  herramientas, no de leerlas. Una autopsia escrita desde el sillón produce prosa; una
  escrita después de un ataque produce hallazgos.
- **Antes de borrar una prueba, mata la herramienta.** El método que se usó en §4.3, y que
  encontró el código muerto del updater: inventario de aserciones una a una, fusión, y una
  mutación por cada superficie exclusiva de la suite que se retira. Si la fusionada sigue
  verde con la herramienta rota, la cobertura no estaba donde creías.
- **Y comprueba que la mutación llegó a aplicarse.** Una vez un `sed` no casó por unos
  backticks escapados y el resultado verde parecía una superficie sin cubrir. No lo era.
  Un falso negativo es peor que no medir.
- **Nunca cites un recuento de memoria.** Solo el que acabe de imprimir la ejecución.
- **Si una prueba estorba, pregúntate si el defecto está en la prueba o en el fixture.**
  Dos veces el detector de calco rechazó fixtures propios que cambiaban solo un título.
  Tenía razón las dos veces.
