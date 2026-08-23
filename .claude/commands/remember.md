---
name: remember
description: Guarda en la memoria persistente del proyecto una decisión, convención, límite o corrección para que no haya que repetirla en la siguiente sesión.
---

# /remember — Memoria Persistente del Proyecto (Axion Protocol)

> **PROPÓSITO**: Que el usuario no tenga que repetirse. Una decisión que se pierde al
> cerrar la sesión se volverá a discutir, y la corrección que costó dos iteraciones se
> volverá a cometer.

---

## 📋 Los 4 tipos, y solo estos

| Tipo | Qué guarda | Ejemplo |
|---|---|---|
| `decision` | Una decisión tomada **y su porqué**. | *"El corpus es CommonJS — porque todo usa `require()` y marcarlo ESM lo rompería de golpe."* |
| `convencion` | Una regla del proyecto que seguir. | *"Los mensajes al usuario van en su idioma; los identificadores, en inglés."* |
| `limite` | Zona intocable o compatibilidad que preservar. | *"No tocar `phases/`: es evidencia histórica sellada."* |
| `correccion` | Un error del agente y cómo actuar en adelante. | *"Nunca citar un recuento de suites de memoria; solo el que imprima la ejecución."* |

---

## 📋 Protocolo de Ejecución

```bash
node tools/memory.js add <tipo> "<hecho>" --porque "<razón>"
node tools/memory.js list [tipo]
node tools/memory.js search "<término>"
node tools/memory.js forget <id>
```
O bien: `axion memory add limite "..."`

**Las decisiones exigen `--porque`** y el comando las rechaza sin ello. Una decisión sin
razón no se puede revisar: dentro de tres meses nadie sabrá si sigue teniendo sentido, y
se acatará por inercia o se romperá por ignorancia.

El identificador sale del contenido, así que guardar dos veces el mismo hecho lo
actualiza en vez de duplicarlo.

---

## 🧠 Cuándo recordar por iniciativa propia

Sin que el usuario lo pida, cuando:

- Te corrige algo que ya habías hecho antes de la misma forma.
- Se acuerda una convención que va a regir más allá de esta tarea.
- Se descarta una alternativa por una razón que volverá a aplicar.
- Se declara una zona del código intocable.

Dilo cuando lo hagas —*"lo he guardado en memoria como `limite`"*— en vez de guardarlo en
silencio: la persona debe poder corregir lo que vas a recordar de ella.

---

## 🚫 Qué NO guardar

Lo que el repositorio ya cuenta por sí mismo: qué hace una función, qué cambió un commit,
cómo está estructurado un directorio. Duplicar la fuente de verdad crea dos versiones que
divergen, y la copia siempre acaba siendo la desactualizada.

Tampoco datos personales, credenciales ni nada que el usuario no diría en voz alta
delante de su equipo.

---

## 🔗 Integración con `/compact`

Las entradas más consecuentes viajan automáticamente al ancla `.axion/state/ANCHOR.md`
que sella `/compact`, ordenadas por el coste de ignorarlas: primero los límites, luego
las correcciones. Así la memoria sobrevive a la compactación del contexto, que es
justamente cuando más falta hace.
