# Roadmap

## Estado actual — Pre-alpha documental

- [x] Definir misión, límites y roles.
- [x] Crear políticas experimentales y esquemas iniciales.
- [x] Documentar linaje y relación con ecosistemas externos.
- [ ] Seleccionar una licencia mediante decisión humana.

## Siguiente candidato — Contratos verificables

- [x] diseñar validadores y preflight léxico de comandos (`tools/preflight.js`);
- [x] establecer un formato y generador de evidencia reproducible SHA-256 (`tools/evidence_hasher.js`);
- [x] crear contrato formal de registro de No Conformidades (`schemas/non_conformance.schema.json`);
- [ ] definir consumidores integrados en el adaptador principal;
- [ ] seleccionar un único runtime experimental;
- [ ] crear pruebas de fallo cerrado y rollback end-to-end.


## Futuro condicionado

- adaptador mínimo para un runtime probado;
- auditoría independiente del adaptador;
- evaluación de proveedores externos por licencia y procedencia;
- promoción a `CANDIDATE` solo mediante gate humano.

## Fuera del roadmap actual

No se planean un runtime universal, memoria universal, catálogo masivo de skills ni compatibilidad automática con todos los hosts.
