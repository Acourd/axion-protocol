/**
 * Verifica que el manifiesto de evidencia sea completo, no autoaprobado
 * y conforme a schemas/evidence.schema.json (contrato que el README declara cumplir).
 * Autoridad: policies/authority.yaml -> executor may_not approve_own_result.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const { createEvidenceManifest } = require(path.join(ROOT, 'tools', 'evidence_hasher.js'));
const esquema = JSON.parse(fs.readFileSync(path.join(ROOT, 'schemas', 'evidence.schema.json'), 'utf8'));

const metaRequeridas = ['identifier', 'version', 'date', 'provenance', 'status', 'owner', 'risk', 'evidence', 'approval'];
const propiasRequeridas = esquema.allOf[1].required;
const propiasOpcionales = Object.keys(esquema.allOf[1].properties);
const clavesPermitidas = new Set([...metaRequeridas, ...propiasOpcionales]);

const existente = path.join(ROOT, 'README.md');
const ausente = path.join(ROOT, 'NO_EXISTE_XYZ.txt');
const m = createEvidenceManifest({ taskId: 'AX-TASK-0003', subject: 'prueba', files: [existente, ausente], logs: ['l1'] });

const fallos = [];

// --- 1. Conformidad estructural con evidence.schema.json ---
for (const k of [...metaRequeridas, ...propiasRequeridas]) {
  if (!(k in m)) fallos.push(`falta la propiedad requerida en la raíz: ${k}`);
}
for (const k of Object.keys(m)) {
  if (!clavesPermitidas.has(k)) fallos.push(`propiedad no evaluada por el esquema en la raíz: ${k}`);
}
if (!/^AX-EVD-[0-9]{4,}$/.test(m.evidence_id || '')) fallos.push(`evidence_id "${m.evidence_id}" no cumple ^AX-EVD-[0-9]{4,}$`);
if (!/^[0-9]+\.[0-9]+\.[0-9]+$/.test(m.version || '')) fallos.push(`version "${m.version}" no cumple el patrón semver`);
if (!esquema.allOf[1].properties.evidence_type.enum.includes(m.evidence_type)) fallos.push(`evidence_type inválido: ${m.evidence_type}`);
if (!esquema.allOf[1].properties.hash_algorithm.enum.includes(m.hash_algorithm)) fallos.push(`hash_algorithm inválido: ${m.hash_algorithm}`);
if (!esquema.allOf[1].properties.retention_class.enum.includes(m.retention_class)) fallos.push(`retention_class inválido: ${m.retention_class}`);
if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(m.risk)) fallos.push(`risk inválido: ${m.risk}`);

// --- 2. Prohibida la autoaprobación ---
if (m.approval.state === 'APPROVED') fallos.push('el generador no puede autoaprobar la evidencia que produce');
if (!['NOT_REQUIRED', 'WAITING', 'APPROVED', 'REJECTED'].includes(m.approval.state)) {
  fallos.push(`approval.state fuera del enum: ${m.approval.state}`);
}

// --- 3. Ningún archivo solicitado puede desaparecer en silencio ---
const registrados = m.evidence.files || [];
if (registrados.length !== 2) fallos.push(`se solicitaron 2 archivos y el manifiesto registra ${registrados.length}`);
const faltante = registrados.find(f => String(f.path).includes('NO_EXISTE_XYZ'));
if (!faltante) fallos.push('el archivo inexistente no aparece registrado en el manifiesto');
else if (faltante.status !== 'MISSING') fallos.push(`el archivo inexistente debe marcarse MISSING, tiene ${faltante.status}`);
if (m.evidence.complete !== false) fallos.push('un manifiesto con archivos ausentes debe declararse incompleto');

// --- 4. El caso completo sí debe declararse completo y con hash real ---
const ok = createEvidenceManifest({ taskId: 'AX-TASK-0004', files: [existente], logs: [] });
if (ok.evidence.complete !== true) fallos.push('un manifiesto sin ausencias debe declararse completo');
const h = (ok.evidence.files[0] || {}).sha256;
if (!h || h.length !== 64) fallos.push('el archivo presente debe llevar un SHA-256 de 64 caracteres');

assert.deepStrictEqual(fallos, [], 'manifiesto no conforme:\n  - ' + fallos.join('\n  - '));
console.log('PASS — manifiesto conforme al esquema, completo y sin autoaprobación');
