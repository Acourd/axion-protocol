'use strict';

/**
 * Axion Protocol - Nivel de garantia de las identidades.
 *
 * Por que existe este modulo. Un veredicto VERIFIED presentaba tres identidades juntas
 * —ejecutor, aprobador y auditor— como si las tres constaran igual de bien. No es cierto:
 *
 *   aprobador y auditor  ->  firma Ed25519 verificada contra el registro de autoridades
 *   ejecutor             ->  una cadena que el ejecutor escribio en runtimeContext
 *
 * El ejecutor es la parte no confiable, asi que su identidad la elige el propio sujeto
 * cuya independencia se pretende demostrar. Es el vector `r01` de AX-NC-0001, y sigue
 * abierto: cerrarlo exige atar la identidad a un hecho externo al payload —la cuenta del
 * sistema operativo, via el servicio de confianza de Fase H— que aun no existe.
 *
 * Lo que este modulo NO hace es cerrarlo. Lo que hace es dejar de disimularlo: el nivel
 * de garantia viaja en la evidencia y en la atestacion, de modo que quien las reciba
 * pueda ver por si mismo que la separacion que incluye al ejecutor no esta demostrada.
 * Callarlo seria afirmar mas de lo que se puede sostener, que es justo lo que este
 * proyecto existe para evitar.
 */

const IDENTITY_ASSURANCE = Object.freeze({
  // Establecida por una firma verificada contra el registro de autoridades.
  ATTESTED: 'ATTESTED',
  // Tomada del contexto de ejecucion: la eligio quien ejecuta. No prueba nada.
  SELF_DECLARED: 'SELF_DECLARED',
  // No participa en esta mision (por ejemplo, no hay aprobador si el riesgo no lo exige).
  NOT_APPLICABLE: 'NOT_APPLICABLE',
});

const SEPARATION = Object.freeze({
  // Ambas partes de la comparacion tienen identidad atestada.
  DEMONSTRATED: 'DEMONSTRATED',
  // Se comprobo, pero al menos una parte tiene identidad autodeclarada: la comprobacion
  // se hizo sobre un dato que el interesado controla, asi que no demuestra nada.
  UNDEMONSTRATED: 'UNDEMONSTRATED_SELF_DECLARED_IDENTITY',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
});

/**
 * Calcula el nivel de garantia de una mision a partir de lo que las primitivas
 * verificaron realmente.
 *
 * @param {object} entrada
 * @param {boolean} entrada.approvalVerified  el GATE verifico una aprobacion firmada
 * @param {boolean} entrada.checkVerified     el CHECK se verifico contra el registro
 */
function assessAssurance({ approvalVerified = false, checkVerified = false } = {}) {
  const identities = {
    // Siempre autodeclarada mientras no exista el servicio de confianza (Fase H-2/H-3).
    executor: IDENTITY_ASSURANCE.SELF_DECLARED,
    approver: approvalVerified ? IDENTITY_ASSURANCE.ATTESTED : IDENTITY_ASSURANCE.NOT_APPLICABLE,
    auditor: checkVerified ? IDENTITY_ASSURANCE.ATTESTED : IDENTITY_ASSURANCE.NOT_APPLICABLE,
  };

  const atestado = (rol) => identities[rol] === IDENTITY_ASSURANCE.ATTESTED;
  const aplica = (rol) => identities[rol] !== IDENTITY_ASSURANCE.NOT_APPLICABLE;

  const par = (a, b) => {
    if (!aplica(a) || !aplica(b)) return SEPARATION.NOT_APPLICABLE;
    return atestado(a) && atestado(b) ? SEPARATION.DEMONSTRATED : SEPARATION.UNDEMONSTRATED;
  };

  const separations = {
    // La unica que hoy puede demostrarse: ambas partes constan por firma.
    approverVsAuditor: par('approver', 'auditor'),
    // Estas dos se comprueban, pero contra una identidad que el ejecutor eligio.
    executorVsApprover: par('executor', 'approver'),
    executorVsAuditor: par('executor', 'auditor'),
  };

  const demostradas = Object.values(separations).filter((s) => s === SEPARATION.DEMONSTRATED).length;
  const sinDemostrar = Object.values(separations).filter((s) => s === SEPARATION.UNDEMONSTRATED).length;

  return Object.freeze({
    identities: Object.freeze(identities),
    separations: Object.freeze(separations),
    // Resumen legible para quien no vaya a leer el detalle.
    summary: sinDemostrar === 0
      ? `Las ${demostradas} separaciones aplicables se apoyan en identidades atestadas.`
      : `${sinDemostrar} separacion(es) se comprobaron contra una identidad autodeclarada por el `
        + 'ejecutor y no pueden considerarse demostradas (AX-NC-0001, vector r01).',
    openNonConformities: sinDemostrar === 0 ? [] : ['AX-NC-0001'],
  });
}

module.exports = { IDENTITY_ASSURANCE, SEPARATION, assessAssurance };
