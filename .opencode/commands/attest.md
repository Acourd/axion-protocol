---
name: attest
description: Emite y verifica atestaciones in-toto Statement v1 en sobre DSSE con firma Ed25519, formato in-toto v1; sin certificación SLSA.
---

# /attest — Atestación Criptográfica in-toto / DSSE (Axion Protocol)

> **PROPÓSITO**: Dejar un comprobante de auditoría que pueda verificar alguien ajeno a
> este proyecto, con sus propias herramientas.

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

## 📤 Resumen Ejecutivo Políglota

Presenta al usuario, en su idioma: qué se atestó, el `payloadType`, el `keyid`, el
digest de evidencia y si la verificación salió válida. Si algún eslabón falta
(aprobación, CHECK, plan de reversión), dilo explícitamente en vez de omitirlo.
