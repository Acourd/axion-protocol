---
name: attest
description: Emite y verifica atestaciones in-toto Statement v1 en sobre DSSE con firma Ed25519, compatibles con SLSA y cosign.
---

# /attest — Atestación Criptográfica in-toto / DSSE (Axion Protocol)

> **PROPÓSITO**: Dejar un comprobante de auditoría que pueda verificar alguien ajeno a
> este proyecto, con sus propias herramientas.

---

## 🛑 Cuándo se Activa

- Al cerrar una misión en estado `VERIFIED`, para dejar evidencia comprobable por terceros.
- Cuando el usuario o el proceso de auditoría pide verificar un sobre existente.
- Para autoprobar que la cadena criptográfica sigue intacta (`emit_attestation.js`).
- Invocación explícita mediante `/attest` o `/attest verify <sobre> <clave.pem>`.

**No se activa** para atestar trabajo no verificado: una atestación sin `VERIFIED`
documenta una afirmación, no un hecho.

---

## 📋 Verificar una atestación existente

```bash
node tools/attestation.js verify <sobre.json> <clave-publica.pem>
```
Códigos de salida: `0` válida · `1` inválida · `2` uso incorrecto.
Reporta el veredicto literal (`ATTESTATION_VALID`, `ATTESTATION_INVALID_SIGNATURE`,
`ATTESTATION_MALFORMED`, `ATTESTATION_SOURCE_NOT_VERIFIED`), sin suavizarlo.

## 📋 Comprobar que la cadena criptográfica sigue intacta

```bash
node tools/emit_attestation.js
```
Firma una misión **de demostración** con un par de claves efímero y la verifica en el
acto. Emite el sobre junto a su clave pública en `.axion/attestations/`.

**Esto NO atesta la misión en curso.** Dilo así al usuario: es una autoprueba de la
cadena in-toto → DSSE → verificación. Presentarla como evidencia de un trabajo real
sería exactamente el tipo de teatro de seguridad que este protocolo existe para evitar.

## 📋 Atestación real de misión

La emite `tools/workflow_runner.js` al cerrar una misión en estado `VERIFIED`, firmada
por una autoridad registrada. Requiere aprobación Ed25519, CHECK independiente, plan de
reversión adjunto y manifiesto de evidencia enlazado. No hay forma de fabricarla a mano
desde la línea de comandos, y eso es intencional.

---

## ⚖️ Veredictos del Motor

- `ATTESTATION_VALID` — firma Ed25519 verificada, payloadType in-toto, subject con digest SHA-256.
- `ATTESTATION_INVALID_SIGNATURE` — la firma no corresponde a la clave o el PAE no cuadra.
- `ATTESTATION_MALFORMED` — el sobre no es DSSE válido o no es una atestación de Axion.
- `ATTESTATION_SOURCE_NOT_VERIFIED` — se intentó atestar una misión sin estado `VERIFIED`.

---

## 📤 Resumen Ejecutivo Políglota

Presenta al usuario, en su idioma: qué se atestó, el `payloadType`, el `keyid`, el
digest de evidencia y si la verificación salió válida. Si algún eslabón falta
(aprobación, CHECK, plan de reversión), dilo explícitamente en vez de omitirlo.