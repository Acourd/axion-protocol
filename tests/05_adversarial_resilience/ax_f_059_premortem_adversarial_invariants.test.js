'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const PreMortemEngine = require('../../tools/premortem.js');
const { VEREDICTOS } = PreMortemEngine;
const { asEd25519PublicKey, computePublicKeyId } = require('../../tools/approval_ed25519.js');
const { canonicalize } = require('../../tools/canonical_json.js');

console.log('=== AX-F-059 Invariantes Adversariales y Derivación de Veredictos en PreMortem ===\n');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'axion_premortem_test_'));

try {
  const engine = new PreMortemEngine(tempDir);

  // 1. Rechazo de texto superficial sin sustancia (menos de 40 caracteres o 6 palabras)
  const payloadSuperficial = {
    feature_name: 'Auth Refactor',
    anchors: {
      security: ['riesgo leve'], // Corto
      performance: ['posible lentitud'],
      architecture: ['deuda tecnica'],
      ux: ['cambio de interfaz']
    },
    competence_check: { justified: true, bloat_risk: false },
    worst_case_scenarios: ['caida total del sistema en produccion con perdida de datos', 'fuga masiva de credenciales'],
    mandatory_mitigations: ['implementar pruebas unitarias completas y verificacion formal']
  };
  const rSuperficial = engine.evaluateAssessment(payloadSuperficial);
  assert.strictEqual(rSuperficial.status, 'DENIED');
  assert.strictEqual(rSuperficial.reason, 'PREMORTEM_INCOMPLETE');
  console.log('✓ Rechazo fail-closed de análisis con texto superficial verificado');

  // 2. Base de payload válido con sustancia completa
  const baseValid = {
    feature_name: 'Motor Criptográfico Cuántico',
    anchors: {
      security: ['Vulnerabilidad de canal lateral en la generación determinista de entropía cuántica'],
      performance: ['Consumo excesivo de ciclos de CPU durante el cálculo recursivo de firmas asimétricas'],
      architecture: ['Acoplamiento excesivo con módulos externos rompiendo la arquitectura zero dependencias'],
      ux: ['Complejidad cognitiva para el desarrollador al configurar las llaves asimétricas']
    },
    competence_check: { justified: true, bloat_risk: false },
    worst_case_scenarios: [
      'Corrupción silenciosa del estado de claves provocando pérdida irreversible de validaciones',
      'Bloqueo catastrófico de hilos de ejecución en el runtime principal de Node.js'
    ],
    mandatory_mitigations: [
      'Encapsular la generación de llaves en buffers inmutables con comprobación estricta de límites'
    ],
    mitigation_stress_test: {
      tested_mitigation: 'Prueba de estrés continuo bajo concurrencia masiva sin fugas de memoria',
      has_critical_weakness: false,
      notes: 'La mitigación demostró ser robusta en simulaciones de carga deterministas'
    },
    depth_level: 3
  };

  // 3. Evaluación exitosa y sellado de nivel 3
  const rValido = engine.evaluateAssessment(baseValid);
  assert.strictEqual(rValido.status, 'APPROVED');
  assert.strictEqual(rValido.exitCode, 0);
  assert.strictEqual(rValido.verdict, 'APPROVED_WITH_SAFEGUARDS');
  assert.strictEqual(rValido.depth_level, 3);
  console.log('✓ Evaluación y sellado de pre-mortem nivel 3 verificado');

  // 4. Derivación automática ante bloat_risk con frases sustantivas propias
  const payloadBloat = {
    feature_name: 'Característica Superflua Bloat',
    anchors: {
      security: ['Riesgo de superficie de ataque innecesaria agregando endpoints no utilizados'],
      performance: ['Consumo injustificado de memoria persistente por estructuras accesorias'],
      architecture: ['Sobrecarga de capas de abstracción innecesarias que complican el mantenimiento'],
      ux: ['Saturación visual de opciones redundantes que confunden a los usuarios finales']
    },
    competence_check: { justified: true, bloat_risk: true },
    worst_case_scenarios: [
      'Abandono del componente por complejidad inmanejable y deuda técnica acumulada',
      'Degradación general de la mantenibilidad del proyecto por código muerto'
    ],
    mandatory_mitigations: [
      'Eliminar código prescindible y acotar el alcance a la funcionalidad esencial'
    ],
    depth_level: 2
  };
  const rBloat = engine.evaluateAssessment(payloadBloat);
  assert.strictEqual(rBloat.status, 'DENIED');
  assert.strictEqual(rBloat.exitCode, 1);
  assert.strictEqual(rBloat.verdict, 'REJECTED_AS_BLOAT');
  console.log('✓ Derivación estricta de REJECTED_AS_BLOAT verificada');

  // 5. Asimetría de veredicto: bloqueo de suavizado (Downgrade Refusal)
  const payloadDowngrade = {
    feature_name: 'Intento de Suavizado Malicioso',
    anchors: {
      security: ['Falta de justificación técnica exponiendo vectores de riesgo innecesarios'],
      performance: ['Desperdicio de ciclos de CPU en operaciones no requeridas por el negocio'],
      architecture: ['Introducción de patrones discordantes sin valor arquitectónico comprobable'],
      ux: ['Fricción adicional en flujos críticos sin beneficio medible para el usuario']
    },
    competence_check: { justified: false, bloat_risk: false }, // Deriva REJECTED_AS_UNJUSTIFIED
    worst_case_scenarios: [
      'Inversión de cientos de horas de ingeniería en código que nadie utilizará',
      'Confusión en auditorías regulatorias por falta de justificación causal'
    ],
    mandatory_mitigations: [
      'Detener la implementación de inmediato y reevaluar la necesidad funcional'
    ],
    depth_level: 2,
    verdict: 'APPROVED_WITH_SAFEGUARDS' // Intento de autoproclamar aprobación
  };
  const rDowngrade = engine.evaluateAssessment(payloadDowngrade);
  assert.strictEqual(rDowngrade.status, 'DENIED');
  assert.strictEqual(rDowngrade.reason, 'VERDICT_DOWNGRADE_REFUSED');
  console.log('✓ Bloqueo inviolable ante intentos de suavizar veredictos adversariales verificado');

  // 6. Detección de calco / boilerplate reciclado
  const payloadCalco = {
    ...baseValid,
    feature_name: 'Segunda Característica con Mismo Texto Reciclado'
  };
  const rCalco = engine.evaluateAssessment(payloadCalco);
  assert.strictEqual(rCalco.status, 'DENIED');
  assert.strictEqual(rCalco.reason, 'PREMORTEM_BOILERPLATE');
  console.log('✓ Intercepción de autopsias recicladas (PREMORTEM_BOILERPLATE) verificada');

  // 7. Invariante de Blast Radius Acotado en [0, 100] y selectividad de rutas críticas
  const brPeriferico = PreMortemEngine.calculateBlastRadius({ files: ['docs/README.md'] });
  assert.strictEqual(brPeriferico.score, 10);
  assert.strictEqual(brPeriferico.riskLevel, 'LOW');

  const brToolsSecundario = PreMortemEngine.calculateBlastRadius({ files: ['tools/scratch_helper.js'] });
  assert.strictEqual(brToolsSecundario.score, 10, 'tools/* secundarios no deben activar sobrecoste ciego de infraestructura');

  const brInfraCritica = PreMortemEngine.calculateBlastRadius({ files: ['tools/killswitch.js'] });
  assert.strictEqual(brInfraCritica.score, 40, '10 base + 30 infraestructura crítica');
  assert.strictEqual(brInfraCritica.riskLevel, 'MODERATE');

  const brMaximo = PreMortemEngine.calculateBlastRadius({
    files: ['bin/axion.js', '.github/workflows/ci.yml', 'policies/risk.yaml', 'tools/preflight.js', 'tools/attestation.js', 'tools/repo_attestation_generator.js', 'a.js', 'b.js', 'c.js'],
    altersPublicInterface: true,
    isIrreversible: true,
  });
  assert.strictEqual(brMaximo.score, 100, 'Blast radius no puede exceder 100');
  assert.strictEqual(brMaximo.capped, true);
  assert.strictEqual(brMaximo.riskLevel, 'CRITICAL');
  console.log('✓ Invariante de Blast Radius acotado en [0, 100] con selectividad crítica demostrada');

  // 8. Invariante de Proporcionalidad: NO_APLICA con justificación técnica
  const payloadNoAplica = {
    feature_name: 'Optimizador Matemático Interno',
    anchors: {
      security: ['Riesgo de buffer overflow en operaciones de matrices densas no comprobadas'],
      performance: ['Consumo cuadrático de tiempo en cálculo de autovalores para matrices grandes'],
      architecture: ['Acoplamiento innecesario entre el optimizador y la capa de almacenamiento'],
      ux: ['NO_APLICA: Algoritmo puramente numérico sin interacción con usuarios ni CLI']
    },
    competence_check: { justified: true, bloat_risk: false },
    worst_case_scenarios: [
      'Corrupción de cálculo en matrices singulares provocando NaN no propagados',
      'Desbordamiento de pila en recursión de divide y vencerás sin caso base'
    ],
    mandatory_mitigations: ['Implementar verificación previa de dimensiones y condición de matriz'],
    depth_level: 2
  };
  const rNoAplica = engine.evaluateAssessment(payloadNoAplica);
  assert.strictEqual(rNoAplica.status, 'APPROVED');
  assert.strictEqual(rNoAplica.exitCode, 0);

  const payloadBadNoAplica = {
    ...payloadNoAplica,
    feature_name: 'Optimizador con Justificación Pobre',
    anchors: {
      ...payloadNoAplica.anchors,
      ux: ['NO_APLICA: Muy corto'] // Menos de 25 caracteres
    }
  };
  const rBadNoAplica = engine.evaluateAssessment(payloadBadNoAplica);
  assert.strictEqual(rBadNoAplica.status, 'DENIED');
  assert.strictEqual(rBadNoAplica.reason, 'PREMORTEM_INCOMPLETE');

  // 8b. Rechazo de justificación tautológica / vacía
  const payloadTautologico = {
    ...payloadNoAplica,
    feature_name: 'Optimizador Tautológico',
    anchors: {
      ...payloadNoAplica.anchors,
      ux: ['NO_APLICA: Esta ancla no aplica porque no aplica en este proyecto y no tiene nada que ver con esto aquí']
    }
  };
  const rTautologico = engine.evaluateAssessment(payloadTautologico);
  assert.strictEqual(rTautologico.status, 'DENIED');
  assert.strictEqual(rTautologico.reason, 'PREMORTEM_INCOMPLETE');

  // 8c. Prohibición de NO_APLICA en security para cambios críticos
  const payloadCriticoNoAplica = {
    ...payloadNoAplica,
    feature_name: 'Actualización de Autenticación Crítica',
    anchors: {
      security: ['NO_APLICA: Módulo interno de fondo que no requiere análisis de seguridad'],
      performance: payloadNoAplica.anchors.performance,
      architecture: payloadNoAplica.anchors.architecture,
      ux: payloadNoAplica.anchors.ux,
    }
  };
  const rCriticoNoAplica = engine.evaluateAssessment(payloadCriticoNoAplica);
  assert.strictEqual(rCriticoNoAplica.status, 'DENIED');
  assert.strictEqual(rCriticoNoAplica.reason, 'PREMORTEM_INCOMPLETE');
  console.log('✓ Invariante de proporcionalidad con NO_APLICA protegida contra tautologías y bypass crítico');

  // 9. Invariante de Aceptación Humana Autenticada y No Falsificable (HUMAN_RISK_ACCEPTED)
  const payloadHRA = {
    feature_name: 'Spike Experimental Aprobado por Humano',
    anchors: {
      security: ['Superficie de ataque experimental en driver preliminar sin sandbox formal'],
      performance: ['Consumo errático de recursos en hilos secundarios durante fase alfa'],
      architecture: ['Deuda técnica consciente introducida para validar viabilidad de mercado'],
      ux: ['NO_APLICA: Módulo de laboratorio interno sin superficie de usuario final']
    },
    competence_check: { justified: false }, // Derivaría REJECTED_AS_UNJUSTIFIED
    worst_case_scenarios: [
      'Falla del driver requiriendo reinicio del proceso principal en desarrollo',
      'Incompatibilidad con kernels antiguos requiriendo rollback manual'
    ],
    mandatory_mitigations: ['Restringir la ejecución exclusivamente a flags experimentales en entornos de desarrollo aislados'],
    human_risk_acceptance: {
      accepted: true,
      rationale: 'Riesgo aceptado formalmente por el arquitecto líder para validación de hipótesis de negocio',
      operator: 'Lead Architect (@adrian)'
    },
    depth_level: 2
  };

  // 9a. Intento de falsificación inline por el agente: debe ser RECHAZADO fail-closed
  const rFalsificado = engine.evaluateAssessment(payloadHRA);
  assert.strictEqual(rFalsificado.status, 'DENIED');
  assert.strictEqual(rFalsificado.reason, 'UNAUTHENTICATED_HUMAN_OVERRIDE');
  assert.strictEqual(rFalsificado.exitCode, 1);
  console.log('✓ Bloqueo fail-closed de intento de auto-aprobación inline por el agente verificado');

  // 9b. Emisión formal fuera de banda exclusivamente para development
  const { hashCanonical } = require('../../tools/canonical_json.js');
  const payloadLimpioHRA = { ...payloadHRA };
  delete payloadLimpioHRA.human_risk_acceptance;
  const hraPremortemId = hashCanonical(payloadLimpioHRA).slice(0, 16);

  const leadPrivKey = crypto.createPrivateKey(fs.readFileSync(path.join(__dirname, '..', '..', '.axion', 'keys', 'attestation_ed25519.key'), 'utf8'));
  engine.acceptRisk({
    premortemId: hraPremortemId,
    payload: payloadLimpioHRA,
    operator: 'Lead Architect (@adrian)',
    privateKey: leadPrivKey,
    rationale: 'Riesgo aceptado formalmente por el arquitecto líder para validación de hipótesis de negocio',
    environment: 'development',
    allowedEnvironments: ['development'],
    ttlHours: 24,
  });

  // En development: debe ser aprobado para dev con exit 0 y deployment_allowed: false
  const rHraDev = engine.evaluateAssessment(payloadLimpioHRA, { environment: 'development' });
  assert.strictEqual(rHraDev.status, 'APPROVED');
  assert.strictEqual(rHraDev.exitCode, 0);
  assert.strictEqual(rHraDev.verdict, 'HUMAN_RISK_ACCEPTED');
  assert.strictEqual(rHraDev.human_risk_accepted, true);
  assert.strictEqual(rHraDev.human_operator, 'Lead Architect (@adrian)');
  assert.strictEqual(rHraDev.deployment_allowed, false);

  // En production: el mismo pre-mortem DEBE ser bloqueado con exit 2 (ENVIRONMENT_MISMATCH)
  const rHraProd = engine.evaluateAssessment(payloadLimpioHRA, { environment: 'production' });
  assert.strictEqual(rHraProd.status, 'DENIED');
  assert.strictEqual(rHraProd.reason, 'ENVIRONMENT_MISMATCH');
  assert.strictEqual(rHraProd.exitCode, 2);
  console.log('✓ Aceptación humana autenticada y delimitada por entorno (dev exit 0 vs prod exit 2) demostrada');

  // 10. Invariante de Estado Intermedio (REQUIERE_DESCUBRIMIENTO)
  const payloadDiscovery = {
    feature_name: 'Propuesta con Incertidumbre Crítica',
    discovery_required: true,
    anchors: {
      security: ['Se desconoce la especificación de cifrado del proveedor externo'],
      performance: ['Sin perfiles de latencia estimados para la API remota de terceros'],
      architecture: ['Contratos de integración formales no provistos explícitamente en la documentación oficial'],
      ux: ['NO_APLICA: Canal de sincronización M2M en background sin UX directa']
    },
    competence_check: { justified: true, bloat_risk: false },
    worst_case_scenarios: [
      'Bloqueo operativo total por discrepancias de protocolo no documentadas',
      'Falla de autenticación por rotación no controlada de tokens OAuth'
    ],
    mandatory_mitigations: ['Completar spike exhaustivo de descubrimiento técnico e investigación previa con /clarify'],
    depth_level: 2
  };
  const rDiscovery = engine.evaluateAssessment(payloadDiscovery);
  assert.strictEqual(rDiscovery.status, 'DISCOVERY_REQUIRED');
  assert.strictEqual(rDiscovery.exitCode, 2);
  assert.strictEqual(rDiscovery.verdict, 'REQUIERE_DESCUBRIMIENTO');
  console.log('✓ Invariante de REQUIERE_DESCUBRIMIENTO ante carencia de contexto demostrada');

  // 11. Invariante Anti-Falsificación: Ataque de Operador Falso con Digest Recalculado (Hallazgo 1)
  const attackPayload = {
    feature_name: 'Propuesta con Aprobación Falsificada por Proceso Hostil',
    anchors: {
      security: ['Vulnerabilidad de inyección en el parser de tokens que permite ejecutar código hostil remoto'],
      performance: ['Consumo cuadrático de memoria al parsear payloads JSON anidados sin límite de profundidad'],
      architecture: ['Acoplamiento excesivo con el módulo de persistencia que impide migrar a SQLite independiente'],
      ux: ['Mensajes de error crípticos que exponen stack traces internos al operador sin sanitización previa'],
    },
    competence_check: {
      justified: true,
      need_origin: 'Auditoría interna de seguridad',
      bloat_risk: false,
    },
    worst_case_scenarios: [
      'Ejecución remota de código en el nodo de producción por deserialización insegura de estados',
      'Denegación de servicio por agotamiento de memoria en el hilo principal de procesamiento',
    ],
    mandatory_mitigations: [
      'Sanitización estricta de esquemas JSON con validación formal de límites de tamaño y tipos',
    ],
    depth_level: 2,
  };
  const attackProposalDigest = hashCanonical(attackPayload);
  const attackPremortemId = attackProposalDigest.slice(0, 16);
  const fakeRecord = {
    contractVersion: '2.0.0',
    acceptanceId: 'fake-acceptance-01',
    premortemId: attackPremortemId,
    proposalDigest: attackProposalDigest,
    operator: 'Lead Architect (@adrian)',
    keyId: 'ed25519:fakefakefakefakefakefakefakefakefakefakefakefakefakefakefakefake',
    publicKeyPem: '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEArC3uRWATcw6CUrrb6DvQjUfJ3IHkWfFWxbwysx6t/sc=\n-----END PUBLIC KEY-----\n',
    environment: 'development',
    allowedEnvironments: ['development'],
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    nonce: 'fakenonce12345678901234567890',
    rationale: 'Falso intento de aprobación recalculando hash sin poseer clave privada',
    algorithm: 'Ed25519',
    signature: Buffer.from('firma_falsa_inventada_por_atacante').toString('base64'),
  };
  const pubKeyObject = asEd25519PublicKey(fakeRecord.publicKeyPem);
  fakeRecord.keyId = computePublicKeyId(pubKeyObject); // keyId correcto pero firma falsa
  fs.writeFileSync(
    path.join(tempDir, '.axion', 'state', `risk-acceptance-${attackPremortemId}.json`),
    JSON.stringify(fakeRecord, null, 2),
    'utf8'
  );
  const rFakeSig = engine.evaluateAssessment(attackPayload, { environment: 'development' });
  assert.strictEqual(rFakeSig.status, 'DENIED');
  assert.strictEqual(rFakeSig.reason, 'INVALID_ED25519_SIGNATURE');
  assert.strictEqual(rFakeSig.exitCode, 1);
  console.log('✓ Invariante de firma Ed25519 verificada: operador falso con digest recalculado rechazado fail-closed');

  // 12. Invariante de Vinculación Criptográfica a la Propuesta: Proposal Tampering (Hallazgo 2)
  const proposalA = {
    feature_name: 'Propuesta Legítima Aceptada A',
    anchors: {
      security: ['Riesgo de exposición de credenciales temporales en logs de depuración del subsistema'],
      performance: ['Sobrecarga de serialización binaria al procesar estructuras de grafos cíclicos'],
      architecture: ['Dependencia circular oculta entre el despachador de eventos y la cola de reintentos'],
      ux: ['Ausencia de feedback visual cuando una operación asíncrona excede los 300 milisegundos'],
    },
    competence_check: {
      justified: true,
      need_origin: 'Requerimiento de trazabilidad operativa',
      bloat_risk: false,
    },
    worst_case_scenarios: [
      'Corrupción silenciosa del índice espacial tras un apagado repentino del proceso supervisor',
      'Inanición de tareas prioritarias por monopolización del pool de conexiones persistentes',
    ],
    mandatory_mitigations: [
      'Implementar pool de conexiones con cuotas estrictas y timeouts deterministas configurables',
    ],
    depth_level: 2,
  };
  const digestA = hashCanonical(proposalA);
  const idA = digestA.slice(0, 16);
  engine.acceptRisk({
    premortemId: idA,
    payload: proposalA,
    operator: 'Lead Architect (@adrian)',
    privateKey: leadPrivKey,
    rationale: 'Riesgo aceptado formalmente para la propuesta legítima A en desarrollo',
    environment: 'development',
    allowedEnvironments: ['development'],
    ttlHours: 24,
  });

  const proposalMutada = {
    ...proposalA,
    mandatory_mitigations: ['Mitigación cambiada a espaldas del operador humano sin autorización'],
  };
  const rTamperedProposal = engine.evaluateAssessment(proposalMutada, {
    authenticatedRiskAcceptance: engine.loadRiskAcceptance(idA).record,
    environment: 'development'
  });
  assert.strictEqual(rTamperedProposal.status, 'DENIED');
  assert.strictEqual(rTamperedProposal.reason, 'PROPOSAL_DIGEST_MISMATCH');
  assert.strictEqual(rTamperedProposal.exitCode, 1);
  console.log('✓ Invariante de Proposal Digest Binding demostrada: mutación posterior de propuesta rechazada');

  // 13. Invariante de Confinamiento de Rutas y Anti-Traversal (Hallazgo 3)
  const traversalIds = [
    '../../etc/passwd',
    '..\\..\\windows\\system32',
    'id/con/barras',
    'id\\con\\backslash',
    'invalid_chars!@#$',
    'unicode_hómóglýph_id',
    'short',
  ];
  for (const tid of traversalIds) {
    assert.throws(
      () => engine.acceptRisk({
        premortemId: tid,
        operator: 'Lead Architect (@adrian)',
        rationale: 'Intento de traversal malicioso en premortemId para escapar de stateDir',
      }),
      /INVALID_PREMORTEM_ID_FORMAT|PATH_TRAVERSAL_DETECTED/
    );
    const loadRes = engine.loadRiskAcceptance(tid);
    assert.strictEqual(loadRes.valid, false);
    assert.ok(['INVALID_PREMORTEM_ID_FORMAT', 'PATH_TRAVERSAL_DETECTED'].includes(loadRes.reason));
  }
  console.log('✓ Invariante de confinamiento de ruta y formato estricto contra path traversal demostrada');

  // 14. Invariante de Protección contra Enlaces Simbólicos (Symlink Attack) (Hallazgo 3)
  const symlinkPremortemId = 'a1b2c3d4e5f60718';
  const symlinkTargetFile = path.join(tempDir, '.axion', 'state', `risk-acceptance-${symlinkPremortemId}.json`);
  fs.writeFileSync(symlinkTargetFile, JSON.stringify({ contractVersion: '2.0.0' }), 'utf8');

  const originalLstat = fs.lstatSync;
  try {
    fs.lstatSync = (p) => {
      if (p === symlinkTargetFile) {
        return { isSymbolicLink: () => true, isFile: () => false, isDirectory: () => false };
      }
      return originalLstat(p);
    };
    const symlinkRes = engine.loadRiskAcceptance(symlinkPremortemId);
    assert.strictEqual(symlinkRes.valid, false);
    assert.strictEqual(symlinkRes.reason, 'SYMLINK_DETECTED');
    console.log('✓ Invariante anti-symlink verificada: enlaces simbólicos rechazados fail-closed');
  } finally {
    fs.lstatSync = originalLstat;
  }

  // 15. Invariante de Registro de Autoridades: Ataque de Clave Autogenerada por el Agente (Hallazgo 1)
  const agentGeneratedKeys = crypto.generateKeyPairSync('ed25519');
  const agentKeyId = computePublicKeyId(agentGeneratedKeys.publicKey);
  const agentPayload = {
    feature_name: 'Propuesta Firmada con Clave de Agente No Autorizada',
    anchors: {
      security: ['Riesgo de escalamiento de privilegios por inyección de código binario en el runtime'],
      performance: ['Consumo cuadrático de tiempo en cálculo de autovalores para matrices grandes'],
      architecture: ['Acoplamiento excesivo con submódulos de persistencia rompiendo la arquitectura zero dependencias'],
      ux: ['Mensajes de error crípticos que confunden al operador humano en la consola de comandos'],
    },
    competence_check: { justified: true, need_origin: 'Auditoría externa', bloat_risk: false },
    worst_case_scenarios: [
      'Corrupción silenciosa del estado de claves provocando pérdida irreversible de validaciones',
      'Bloqueo catastrófico de hilos de ejecución en el runtime principal de Node.js',
    ],
    mandatory_mitigations: [
      'Encapsular la generación de llaves en buffers inmutables con comprobación estricta de límites',
    ],
    depth_level: 2,
  };
  const agentProposalDigest = hashCanonical(agentPayload);
  const agentPremortemId = agentProposalDigest.slice(0, 16);

  const unsignedAgentRecord = {
    contractVersion: '2.0.0',
    acceptanceId: 'agent-acceptance-01',
    premortemId: agentPremortemId,
    proposalDigest: agentProposalDigest,
    operator: 'Lead Architect (@adrian)', // El agente usurpa el nombre del operador
    keyId: agentKeyId,
    publicKeyPem: agentGeneratedKeys.publicKey.export({ type: 'spki', format: 'pem' }),
    environment: 'development',
    allowedEnvironments: ['development'],
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    nonce: 'agentnonce12345678901234567890',
    rationale: 'El agente intenta auto-autorizarse generando su propia clave Ed25519 en memoria',
  };
  const agentSig = crypto.sign(null, Buffer.from(canonicalize(unsignedAgentRecord), 'utf8'), agentGeneratedKeys.privateKey).toString('base64');
  const agentEnvelope = { ...unsignedAgentRecord, algorithm: 'Ed25519', signature: agentSig };

  fs.writeFileSync(
    path.join(tempDir, '.axion', 'state', `risk-acceptance-${agentPremortemId}.json`),
    JSON.stringify(agentEnvelope, null, 2),
    'utf8'
  );
  const rAgentUntrusted = engine.evaluateAssessment(agentPayload, { environment: 'development' });
  assert.strictEqual(rAgentUntrusted.status, 'DENIED');
  assert.strictEqual(rAgentUntrusted.reason, 'UNTRUSTED_KEY_ID');
  assert.strictEqual(rAgentUntrusted.exitCode, 1);
  console.log('✓ Invariante de autoridad verificada: clave autogenerada por el agente rechazada como UNTRUSTED_KEY_ID');

  // 16. Invariante de Rechazo Estricto de proposalDigest Truncado (Hallazgo 2)
  const truncatedDigests = [
    agentProposalDigest.slice(0, 16),
    agentProposalDigest.slice(0, 32),
    agentProposalDigest.slice(0, 63),
  ];
  for (const td of truncatedDigests) {
    assert.throws(
      () => engine.acceptRisk({
        premortemId: agentPremortemId,
        proposalDigest: td,
        operator: 'Lead Architect (@adrian)',
        rationale: 'Intento de aceptación con digest truncado no permitido',
      }),
      /INVALID_PROPOSAL_DIGEST_FORMAT/
    );
  }
  console.log('✓ Invariante de SHA-256 completo: digests truncados de 16, 32 y 63 chars rechazados fail-closed');

} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log('\nPASS AX-F-059 — Invariantes adversariales de PreMortem v3.2.0 demostradas al 100%.\n');
