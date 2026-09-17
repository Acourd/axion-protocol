#!/usr/bin/env node
'use strict';

/**
 * Axion Protocol — Dynamic Rule Weaver & Tech-Stack Orchestrator
 *
 * Compilador y tejedor dinámico de reglas P0 según el stack tecnológico para /drive:
 * 1. Inspecciona la raíz del proyecto y detecta stacks: Node/JS, TypeScript, Python, Rust, Go, Next.js/React.
 * 2. Compone dinámicamente un documento normativo P0 contextualizado:
 *    - Invariantes Universales Axion (Fail-closed, Intención, Terminal estructurado, Verificación determinista).
 *    - Reglas Específicas del Ecosistema detectado (Clean Code, Typing, Memory Safety, Async Patterns).
 * 3. Permite emitir reglas para Antigravity (.agents/rules/), Claude Code o Cursor (.cursor/rules/).
 *
 * Cero dependencias externas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { writeFileAtomicSync } = require('./atomic_write.js');

const ROOT = path.resolve(__dirname, '..');

const STACK_SIGNATURES = [
  {
    id: 'typescript',
    name: 'TypeScript',
    markers: ['tsconfig.json', 'tsconfig.base.json'],
    extensions: ['.ts', '.tsx'],
    rules: [
      'Strict Type Safety: Prohibido el uso de `any` no justificado; usar `unknown` con type guards.',
      'Explicit Return Types: Todas las funciones públicas deben declarar tipo de retorno explícito.'
    ]
  },
  {
    id: 'javascript',
    name: 'JavaScript / Node.js',
    markers: ['package.json'],
    extensions: ['.js', '.mjs', '.cjs'],
    rules: [
      'Node.js Runtime: Uso de sintaxis nativa moderna (ES2022+ o CJS estructurado sin dependencias innecesarias).',
      'Safe Async Execution: Todo Promise o async/await debe tener manejo de errores determinista.'
    ]
  },
  {
    id: 'python',
    name: 'Python',
    markers: ['pyproject.toml', 'requirements.txt', 'Pipfile', 'setup.py'],
    extensions: ['.py'],
    rules: [
      'Type Hints PEP 484: Anotaciones de tipo obligatorias en firmas de funciones.',
      'Virtual Environment: Operaciones de paquetes restringidas a entornos virtuales o gestores modernos (uv/poetry).'
    ]
  },
  {
    id: 'rust',
    name: 'Rust',
    markers: ['Cargo.toml', 'Cargo.lock'],
    extensions: ['.rs'],
    rules: [
      'Zero Panic in Production: Reemplazar `.unwrap()` y `.expect()` por manejo explícito de `Result<T, E>`.',
      'Clippy Cleanliness: El código debe compilar sin advertencias bajo `cargo clippy -- -D warnings`.'
    ]
  },
  {
    id: 'go',
    name: 'Go (Golang)',
    markers: ['go.mod', 'go.sum'],
    extensions: ['.go'],
    rules: [
      'Explicit Error Handling: Comprobación estricta de `if err != nil` inmediatamente tras la llamada.',
      'Zero Goroutine Leaks: Todo canal y goroutine debe contar con contexto cancelable `context.Context`.'
    ]
  },
  {
    id: 'nextjs',
    name: 'Next.js / React',
    markers: ['next.config.js', 'next.config.mjs', 'next.config.ts'],
    extensions: ['.jsx', '.tsx'],
    rules: [
      'Server Components by Default: Marcar `"use client"` únicamente cuando se requieran hooks o interactividad DOM.',
      'Zero Waterfall Data Fetching: Cargar datos concurrentemente mediante `Promise.all` o RSC paralelos.'
    ]
  }
];

const UNIVERSAL_P0_RULES = [
  'Custodia de Intención Original: Bloqueo de mutaciones ante peticiones vagas hasta emitir IntentContract SHA-256.',
  'Salvaguarda Fail-Closed: Ante cualquier error o presencia de .axion/HALT, toda mutación se congela.',
  'Ejecución Estructurada: Ejecutar comandos sin shell ({ executable, args, shell: false }) y validar con preflight.js.',
  'Verificación Determinista: Exigir exit code 0 mediante la suite real de pruebas antes de declarar éxito.',
  'Reporte Ejecutivo de 3 Líneas: Concluir misiones con [Acción Cumplida], [Métricas] y [Próximo Vector Metacognitivo].'
];

class DynamicRuleWeaver {
  constructor(projectRoot = ROOT) {
    this.root = path.resolve(projectRoot);
    this.rulesDir = path.join(this.root, '.agents', 'rules');
    if (!fs.existsSync(this.rulesDir)) {
      fs.mkdirSync(this.rulesDir, { recursive: true });
    }
  }

  /**
   * Detecta los stacks tecnológicos activos en el repositorio.
   */
  detectStacks() {
    const detected = [];

    for (const stack of STACK_SIGNATURES) {
      let isMatch = false;

      // 1. Comprobar archivos marcadores
      for (const m of stack.markers) {
        if (fs.existsSync(path.join(this.root, m))) {
          isMatch = true;
          break;
        }
      }

      // 2. Si no hay marcador, escanear extensiones de archivos en raíz o src
      if (!isMatch) {
        try {
          const rootFiles = fs.readdirSync(this.root);
          for (const f of rootFiles) {
            if (stack.extensions.some(ext => f.endsWith(ext))) {
              isMatch = true;
              break;
            }
          }
        } catch (scanErr) {
          // Fallback resiliente ante error de lectura en disco
        }
      }

      if (isMatch) {
        detected.push(stack);
      }
    }

    return detected;
  }

  /**
   * Teje el documento de reglas P0 contextualizadas.
   */
  weaveRules() {
    const activeStacks = this.detectStacks();
    const stackNames = activeStacks.map(s => s.name).join(', ') || 'Genérico (Políglota)';

    const lines = [
      `# Axion Protocol — Reglas P0 Dinámicas Contextualizadas`,
      ``,
      `**Stack Detectado:** ${stackNames}`,
      `**Arquitectura:** Soberana Fail-Closed Zero-Dependency`,
      ``,
      `## 🛡️ Invariantes Universales P0 (Aplicables a todo el proyecto)`,
      ``,
      ...UNIVERSAL_P0_RULES.map((r, i) => `${i + 1}. **${r.split(':')[0]}:** ${r.split(':')[1] || ''}`),
      ``
    ];

    if (activeStacks.length > 0) {
      lines.push(`## ⚡ Reglas Específicas del Ecosistema Activo`, ``);
      for (const stack of activeStacks) {
        lines.push(`### 📦 ${stack.name}`);
        stack.rules.forEach((r, i) => {
          lines.push(`- **Regla ${i + 1}:** ${r}`);
        });
        lines.push(``);
      }
    }

    const content = lines.join('\n');
    const digest = crypto.createHash('sha256').update(content).digest('hex');

    const targetFile = path.join(this.rulesDir, 'active-stack-governance.md');
    // Escritura idempotente y atómica con reintento ante violaciones de sharing en
    // Windows: si el contenido ya es el canónico no se toca el archivo (evita churn
    // de hashes en SBOM, lecturas parciales y EPERM en concurrencia).
    const escritura = writeFileAtomicSync(targetFile, content);
    const written = escritura.escrito;

    return {
      success: true,
      activeStacks: activeStacks.map(s => s.id),
      stackNames,
      targetFile,
      digest,
      written,
      content
    };
  }
}

if (require.main === module) {
  const weaver = new DynamicRuleWeaver();
  console.log('[Axion Dynamic Rule Weaver] Analizando repositorio y tejiendo reglas...\n');
  const res = weaver.weaveRules();
  console.log(`✓ Stack(s) Detectados: ${res.stackNames}`);
  console.log(`✓ Archivo de reglas:   ${path.relative(ROOT, res.targetFile)}`);
  console.log(`✓ SHA-256 Digest:      ${res.digest.slice(0, 16)}...\n`);
  console.log(res.content);
}

module.exports = DynamicRuleWeaver;
