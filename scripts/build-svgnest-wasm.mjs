import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const crateDir = resolve(repoRoot, 'vendor/svgnest/polygon-packer-algo');
const outDir = resolve(crateDir, 'pkg');
const sourceWasm = resolve(outDir, 'polygon-packer_bg.wasm');
const publicWasm = resolve(repoRoot, 'public/nesting/polygon-packer.wasm');

const env = {
  ...process.env,
  RUSTFLAGS: `${process.env.RUSTFLAGS ?? ''} -C target-feature=+simd128`.trim(),
};

const result = spawnSync(
  'wasm-pack',
  [
    'build',
    crateDir,
    '--release',
    '--no-opt',
    '--target',
    'no-modules',
    '--out-name',
    'polygon-packer',
    '--out-dir',
    outDir,
  ],
  {
    env,
    shell: process.platform === 'win32',
    stdio: 'inherit',
  }
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

if (!existsSync(sourceWasm)) {
  throw new Error(`Expected wasm output was not created: ${sourceWasm}`);
}

mkdirSync(dirname(publicWasm), { recursive: true });
copyFileSync(sourceWasm, publicWasm);
console.log(`Copied SVGnest WASM to ${publicWasm}`);
