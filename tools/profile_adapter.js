#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol - Adaptive User Profile Adapter
 * 
 * Calibra el estilo de comunicación, nivel de tecnicismo y verbosidad de la IA
 * según el perfil del usuario (Visionario no técnico, Constructor intermedio, Ingeniero senior).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const AXION_DIR = path.join(ROOT, '.axion');
const PROFILE_FILE = path.join(AXION_DIR, 'PROFILE.json');

const PROFILES = {
  visionary: {
    name: 'Visionario / Creador No Técnico',
    verbosity: 'CONCISE',
    jargon: 'ZERO_JARGON',
    style: 'Orientado a objetivos, opciones A/B/C sencillas, cero términos informáticos innecesarios.'
  },
  builder: {
    name: 'Constructor Intermedio / Product Builder',
    verbosity: 'BALANCED',
    jargon: 'PRACTICAL',
    style: 'Explicaciones directas, foco en arquitectura de producto y trade-offs clave.'
  },
  engineer: {
    name: 'Ingeniero Senior / DevSecOps',
    verbosity: 'DETAILED',
    jargon: 'TECHNICAL',
    style: 'Detalles técnicos profundos, contratos de bajo nivel, diffs y análisis de seguridad.'
  }
};

function getProfile() {
  if (fs.existsSync(PROFILE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(PROFILE_FILE, 'utf8'));
    } catch (e) {
      return PROFILES.visionary;
    }
  }
  return PROFILES.visionary;
}

function setProfile(type) {
  if (!fs.existsSync(AXION_DIR)) {
    fs.mkdirSync(AXION_DIR, { recursive: true });
  }

  const selected = PROFILES[type.toLowerCase()] || PROFILES.visionary;
  const data = {
    type: type.toLowerCase(),
    ...selected,
    updated_at: new Date().toISOString()
  };

  fs.writeFileSync(PROFILE_FILE, JSON.stringify(data, null, 2), 'utf8');
  console.log(`✓ Perfil adaptativo actualizado a: ${data.name}`);
  console.log(`  Estilo: ${data.style}`);
  return data;
}

function main() {
  const arg = process.argv[2];
  if (!arg || arg === 'status') {
    const current = getProfile();
    console.log(`[Axion Profile] Perfil activo: ${current.name} (${current.verbosity || 'CONCISE'})`);
    return;
  }

  setProfile(arg);
}

if (require.main === module) {
  main();
}

module.exports = { getProfile, setProfile, PROFILES };
