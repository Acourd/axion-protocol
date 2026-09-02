#!/usr/bin/env node
'use strict';


/**
 * Axion Protocol - Non-Technical Git Assistant Tool
 * 
 * Traduce el estado de Git a lenguaje sencillo en español sin jerga técnica,
 * informa al usuario si su proyecto está guardado en GitHub y sugiere guardados proactivos.
 */

const { spawnSync } = require('child_process');
const process = require('process');

function runGit(args, cwd) {
  const res = spawnSync('git', args, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], shell: false });
  return res.status === 0 ? (res.stdout || '').trim() : null;
}

function getGitStatusDiagnosis(options = {}) {
  const cwd = options.cwd || process.cwd();

  try {
    const isGitRepo = runGit(['rev-parse', '--is-inside-work-tree'], cwd);

    if (isGitRepo !== 'true') {
      return {
        status: 'NOT_GIT_REPO',
        simpleMessage: 'Este proyecto aún no está configurado con control de versiones (Git).',
        suggestion: '¿Te gustaría que lo inicialicemos para que nunca pierdas tus avances?'
      };
    }

    const statusOutput = runGit(['status', '--porcelain'], cwd) || '';
    const hasUncommitted = statusOutput.length > 0;
    const changedFilesCount = hasUncommitted ? statusOutput.split('\n').filter(Boolean).length : 0;

    let hasRemote = false;
    let remoteName = runGit(['remote'], cwd);
    if (remoteName && remoteName.length > 0) {
      hasRemote = true;
    }

    if (!hasUncommitted) {
      return {
        status: 'CLEAN_SYNCED',
        changedFilesCount: 0,
        hasRemote,
        simpleMessage: hasRemote
          ? '✓ Tu proyecto está 100% guardado y respaldado en GitHub.'
          : '✓ Todos tus cambios locales están guardados de forma segura en tu equipo.',
        suggestion: hasRemote ? null : '¿Te gustaría conectar este proyecto con GitHub para tener un respaldo en la nube?'
      };
    }

    return {
      status: 'UNSAVED_CHANGES',
      changedFilesCount,
      hasRemote,
      simpleMessage: `Tienes ${changedFilesCount} archivo(s) con cambios recientes pendientes de respaldar.`,
      suggestedCommitMessage: `Guardado automático: Avances verificados en el proyecto (${new Date().toISOString().split('T')[0]})`,
      suggestion: `¿Te gustaría respaldar estos ${changedFilesCount} cambios ahora?`
    };

  } catch (err) {
    return {
      status: 'NOT_GIT_REPO',
      simpleMessage: 'Este proyecto no cuenta con un repositorio Git activo.',
      suggestion: '¿Deseas inicializar la protección de versión para este proyecto?'
    };
  }
}

function main() {
  const diagnosis = getGitStatusDiagnosis();
  console.log(JSON.stringify(diagnosis, null, 2));
}

if (require.main === module) {
  main();
}

module.exports = { getGitStatusDiagnosis };
