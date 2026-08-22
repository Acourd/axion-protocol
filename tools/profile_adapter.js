#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol - Comprehensive Adaptive Profiler
 * 
 * Calibra de forma personalizada las 5 dimensiones clave del usuario:
 * 1. Nivel de Perfil Técnico (Visionario / Builder / Senior)
 * 2. Método de Entrada (Voz vs Teclado)
 * 3. Entorno de Trabajo (IDE Visual vs CLI Terminal)
 * 4. Cadencia de Entrega (Bloque Completo vs Micro-Pasos)
 * 5. Autonomía Creativa / Diseño (Iniciativa Moderna vs Dirección Guiada)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const AXION_DIR = path.join(ROOT, '.axion');
const PROFILE_FILE = path.join(AXION_DIR, 'PROFILE.json');

const DEFAULT_PROFILE = {
  technical_depth: 'VISIONARY', // 'VISIONARY' | 'BUILDER' | 'ENGINEER'
  input_mode: 'VOICE_DICTATION', // 'VOICE_DICTATION' | 'KEYBOARD_CONCISE'
  environment: 'IDE_GUI',        // 'IDE_GUI' | 'CLI_TERMINAL'
  cadence: 'COMPLETE_BLOCK',     // 'COMPLETE_BLOCK' | 'MICRO_STEPS'
  creative_autonomy: 'HIGH',     // 'HIGH' | 'GUIDED'
  summary: 'Director / Creador. Dictado por voz, Antigravity IDE, entregas en bloque completo y alta autonomía visual.'
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

  const current = getProfile();
  const merged = {
    ...current,
    ...profileData,
    updated_at: new Date().toISOString()
  };

  fs.writeFileSync(PROFILE_FILE, JSON.stringify(merged, null, 2), 'utf8');
  return merged;
}

function main() {
  const current = getProfile();
  console.log(`[Axion Profile] Perfil: ${current.technical_depth} | Entrada: ${current.input_mode} | Entorno: ${current.environment} | Cadencia: ${current.cadence}`);
}

if (require.main === module) {
  main();
}

module.exports = { getProfile, saveCustomProfile, DEFAULT_PROFILE };
