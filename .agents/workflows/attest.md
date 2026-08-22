---
name: attest
description: Genera y valida la atestación formal in-toto Statement v1 en sobre DSSE con firmas criptográficas.
---

# /attest — Atestación Criptográfica In-toto / DSSE (Axion Protocol)

Este comando genera el comprobante de auditoría de la misión completada en formato compatible con SLSA, Cosign y GitHub Attestations.

## Protocolo de Ejecución

1. **Compilar la Evidencia de la Misión**:
   - Recopila la intención acordada, los hashes SHA-256 de los archivos resultantes y el resultado de las 38 pruebas de validación.

2. **Generar el Sobre DSSE**:
   - Ejecuta:
     ```bash
     node tools/attestation.js
     ```

3. **Emitir el Resumen Ejecutivo Políglota**:
   - Presenta al usuario el resumen ejecutivo en su idioma nativo con el identificador inmutable de la atestación.
