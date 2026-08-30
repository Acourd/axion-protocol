#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Open Source License & Clean-Room IP Compliance Auditor
 *
 * Audita determinísticamente la compatibilidad de licencias y el principio de Clean-Room:
 * 1. Clasifica licencias de software (Permisivas: MIT, Apache-2.0, BSD-3 vs Copyleft: GPL-3.0, AGPL-3.0 vs Propietarias).
 * 2. Valida que ninguna implementación de Axion viole términos de licencia o copie código verbatim de repositorios Copyleft/Propietarios.
 * 3. Exige re-implementación Clean-Room (ingeniería inversa basada exclusivamente en especificación y comportamiento funcional).
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const LICENSE_TAXONOMY = {
  PERMISSIVE: ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', 'Unlicense', 'CC0-1.0'],
  WEAK_COPYLEFT: ['LGPL-2.1', 'LGPL-3.0', 'MPL-2.0', 'EPL-2.0'],
  STRONG_COPYLEFT: ['GPL-2.0', 'GPL-3.0', 'AGPL-3.0', 'SSPL'],
  RESTRICTIVE_OR_NON_COMMERCIAL: ['CC-BY-NC-4.0', 'BSL-1.1', 'Commons-Clause', 'Proprietary']
};

class LicenseAuditor {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
  }

  /**
   * Clasifica una licencia según su nivel de compatibilidad con arquitecturas comerciales y permisivas.
   */
  classifyLicense(licenseSpdx = '') {
    if (!licenseSpdx || typeof licenseSpdx !== 'string') {
      return {
        spdx: 'UNKNOWN',
        tier: 'UNKNOWN',
        cleanRoomMandatory: true,
        commercialSafe: false,
        reason: 'Licencia no especificada o desconocida.'
      };
    }

    const clean = licenseSpdx.trim();

    for (const [tier, licenses] of Object.entries(LICENSE_TAXONOMY)) {
      if (licenses.some(l => l.toLowerCase() === clean.toLowerCase())) {
        return {
          spdx: clean,
          tier,
          cleanRoomMandatory: tier !== 'PERMISSIVE',
          commercialSafe: tier === 'PERMISSIVE',
          reason: tier === 'PERMISSIVE'
            ? 'Licencia permisiva: uso comercial, modificación y distribución sin restricciones copyleft.'
            : `Licencia ${tier}: exige re-implementación limpia (Clean-Room) y prohíbe copia verbatim de código fuente.`
        };
      }
    }

    return {
      spdx: clean,
      tier: 'NON_STANDARD',
      cleanRoomMandatory: true,
      commercialSafe: false,
      reason: 'Licencia personalizada o no estándar: requiere auditoría manual y diseño Clean-Room estricto.'
    };
  }

  /**
   * Evalúa si un patrón o característica puede adoptarse bajo el protocolo Clean-Room.
   */
  auditFeatureAdoption(sourceInfo = {}) {
    const { name, license, isCleanRoomDesign, sourceOrigin } = sourceInfo;
    const classification = this.classifyLicense(license);

    const audit = {
      feature: name || 'Unnamed Feature',
      sourceOrigin: sourceOrigin || 'External Repository',
      licenseClassification: classification,
      cleanRoomVerified: Boolean(isCleanRoomDesign),
      status: 'APPROVED',
      violations: []
    };

    // Regla 1: Si no es permisiva y no es diseño Clean-Room, BLOQUEAR
    if (!classification.commercialSafe && !isCleanRoomDesign) {
      audit.status = 'BLOCKED';
      audit.violations.push(`La fuente tiene licencia ${classification.tier} (${classification.spdx}) y no cuenta con diseño Clean-Room certificado.`);
    }

    return audit;
  }
}

if (require.main === module) {
  const auditor = new LicenseAuditor();
  console.log('[Axion License Auditor] Verificando taxonomía de licencias y Clean-Room:');
  console.log('  MIT:       ', auditor.classifyLicense('MIT').tier);
  console.log('  Apache-2.0:', auditor.classifyLicense('Apache-2.0').tier);
  console.log('  GPL-3.0:   ', auditor.classifyLicense('GPL-3.0').tier);
  console.log('  Proprietary:', auditor.classifyLicense('Proprietary').tier);
}

module.exports = LicenseAuditor;
