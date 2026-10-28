import { readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const jsDir = join(root, 'js');
const files = (await readdir(jsDir))
  .filter((name) => name.endsWith('.js'))
  .sort();

if (files.length === 0) {
  throw new Error('Nenhum arquivo JavaScript encontrado em js/');
}

for (const name of files) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--check', join(jsDir, name)], {
      stdio: 'inherit',
      shell: false
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Falha na validação de ${name}`));
    });
  });
}

await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ['--check', join(root, 'sw.js')], {
    stdio: 'inherit',
    shell: false
  });
  child.on('error', reject);
  child.on('exit', (code) => {
    if (code === 0) resolve();
    else reject(new Error('Falha na validação de sw.js'));
  });
});

console.log(`Sintaxe válida: ${files.length} arquivos JavaScript e sw.js.`);
