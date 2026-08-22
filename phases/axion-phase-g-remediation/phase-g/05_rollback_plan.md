# Plan de Rollback

En caso de que el parche genere regresiones críticas en los tests o en el flujo principal:

1. **Restaurar la línea base:**
   - La carpeta `axion-corpus-isolated` se eliminará por completo.
   - Se regenerará desde el `axion-phase-e-worktree` original asegurando que los hashes coincidan con `01_baseline_manifest.json`.

2. **Evitar side-effects:**
   - Dado que el trabajo se realiza en una copia aislada (fuera de control de versiones de Fase E), un `rm -rf` o equivalente en la carpeta de trabajo es suficiente.
   - Ningún cambio se comiteará ni promoverá a `axion-phase-e-worktree` hasta que la Etapa 2, 3, 4 y 5 hayan culminado exitosamente.
