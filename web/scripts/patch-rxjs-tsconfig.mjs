import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDir, '..');

const patchJsonFile = (relativePath, mutate) => {
  const filePath = path.join(webRoot, relativePath);

  if (!existsSync(filePath)) {
    return;
  }

  const source = readFileSync(filePath, 'utf8');
  const data = JSON.parse(source);
  const next = mutate(data);
  const output = `${JSON.stringify(next, null, 2)}\n`;

  if (output !== source) {
    writeFileSync(filePath, output, 'utf8');
  }
};

patchJsonFile('node_modules/rxjs/tsconfig.json', (config) => {
  const compilerOptions = config.compilerOptions ?? {};

  if (compilerOptions.moduleResolution === 'node') {
    compilerOptions.moduleResolution = 'bundler';
  }

  delete compilerOptions.baseUrl;
  config.compilerOptions = compilerOptions;
  return config;
});

patchJsonFile('node_modules/rxjs/src/tsconfig.base.json', (config) => {
  const compilerOptions = config.compilerOptions ?? {};

  delete compilerOptions.baseUrl;
  config.compilerOptions = compilerOptions;
  return config;
});