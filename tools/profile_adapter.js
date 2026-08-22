#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol - Adaptive Workflow & Chemistry Profiler
 * 
 * Calibra de forma personalizada el entorno de trabajo, método de entrada (Voz vs Teclado),
 * nivel de tecnicismo y sugiere las capacidades de Axion más adecuadas para el usuario.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const AXION_DIR = path.join(ROOT, '.axion');
const PROFILE_FILE = path.join(AXION_DIR, 'PROFILE.json');

const DEFAULT_PROFILE = {
  environment: 'IDE', // 'CLI' | 'IDE'
  input_mode: 'VOICE_OR_CONVERSATIONAL', // 'VOICE_OR_CONVERSATIONAL' | 'KEYBOARD_SHORT'
  technical_depth: 'VISIONARY', // 'VISIONARY' | 'BUILDER' | 'ENGINEER'
  verbosity: 'CONCISE',
  recommended_features: [
    'voice_intent_crystallization',
    'semantic_rollback_natural_language',
    'discrete_risk_planning'
  ],
  summary: 'Usuario Visionario / Creador. Prefiere ideas directas, dictado conversacional y cero fricción técnica.'
};

function getProfile() {
  if (fs.existsSync(PROFILE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(PROFILE_FILE, 'utf8'));
    } catch (e) {
      return DEFAULT_PROFILE;
    }
  }
  return DEFAULT_PROFILE;
}

function saveCustomProfile(profileData) {
  if (!fs.existsSync(AXION_DIR)) {
    fs.mkdirSync(AXION_DIR, { recursive: true });
  }

  const merged = {
    ...DEFAULT_PROFILE,
    ...profileData,
    updated_at: new Date().toISOString()
  };

  fs.writeFileSync(PROFILE_FILE, JSON.stringify(merged, null, 2), 'utf8');
  return merged;
}

function main() {
  const current = getProfile();
  console.log(`[Axion Profile] Perfil activo: ${current.technical_depth} | Entrada: ${current.input_mode} | Entorno: ${current.environment}`);
}

if (require.main === module) {
  main();
}

module.exports = { getProfile, saveCustomProfile, DEFAULT_PROFILE };
