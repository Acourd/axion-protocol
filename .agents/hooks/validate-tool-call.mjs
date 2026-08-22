import { spawnSync } from 'child_process';
import path from 'path';
import fileURLToPath from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

// Leer payload desde stdin (enviado por Antigravity en PreToolUse)
let inputData = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
  inputData += chunk;
});

process.stdin.on('end', () => {
  try {
    let commandToValidate = '';

    if (inputData.trim()) {
      const payload = JSON.parse(inputData);
      commandToValidate = payload.tool_args?.CommandLine || payload.tool_args?.command || payload.command || '';
    }

    if (!commandToValidate && process.argv[2]) {
      commandToValidate = process.argv[2];
    }

    if (!commandToValidate) {
      // Sin comando explícito; permitir con seguridad
      process.exit(0);
    }

    // Invocar preflight.js de Axion Protocol
    const preflightPath = path.join(rootDir, 'tools', 'preflight.js');
    const result = spawnSync(process.execPath, [preflightPath, commandToValidate], {
      cwd: rootDir,
      encoding: 'utf8',
      windowsHide: true
    });

    const output = `${result.stdout || ''}${result.stderr || ''}`;

    if (result.status !== 0 || output.includes('STOP') || output.includes('BLOCKED')) {
      console.error(`BLOCKED by Axion Protocol (Preflight Gate): Command "${commandToValidate}" failed preflight security check.`);
      console.error(output);
      process.exit(1);
    }

    console.log(`PASS by Axion Protocol: Preflight security check passed for "${commandToValidate}".`);
    process.exit(0);

  } catch (err) {
    console.error(`BLOCKED by Axion Protocol (Error in Hook): ${err.message}`);
    process.exit(1);
  }
});
