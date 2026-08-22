# Plan de Pruebas Rojas (Red Test Plan)

Estas pruebas deben escribirse y ejecutarse ANTES de aplicar el parche.
Deben FALLAR contra la línea base actual (mostrar que las vulnerabilidades F-01 y F-02 existen).
Si pasan antes del parche, se clasificarán como INVALID_TEST.

**Casos a probar:**

1. **ejecutor = aprobador** → Debe bloquear (`APPROVAL_NOT_INDEPENDENT`). (Demuestra vulnerabilidad F-01).
2. **ejecutor = auditor** → Debe bloquear (`CHECK_NOT_INDEPENDENT`). (Debería pasar antes del parche pues ya estaba reforzado, pero se incluye para completitud y regresión).
3. **aprobador = auditor** → Debe bloquear (`CHECK_NOT_INDEPENDENT`). (Demuestra vulnerabilidad F-02).
4. **ejecutor = aprobador = auditor** → Debe bloquear.
5. **los tres distintos** → Puede continuar si todo lo demás es válido (Control Positivo).
6. **executorActorId ausente** → Debe bloquear (Falla en el workflow).
7. **approvalActorId ausente** → Debe bloquear (Falla criptográfica o estructural).
8. **auditorActorId ausente** → Debe bloquear.
9. **actor con roles múltiples** → No evade la comparación por identidad (Debe rechazarse si su identityId es el mismo, aunque tenga dos roles válidos).
10. **una aprobación rechazada por falta de independencia no consume el nonce** → Comprobar el estado del archivo `.used` si el rechazo es temprano.
