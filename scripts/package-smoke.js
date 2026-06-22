#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const required = [
  'bin/skill-contract.js',
  'src/index.js',
  'fixtures/good-skill/SKILL.md',
  'examples/review-target/SKILL.md',
  'docs/CLI.md',
  'README.md',
  'CHANGELOG.md',
  'LICENSE',
  'SECURITY.md'
];

const result = spawnSync('npm', ['pack', '--dry-run', '--json'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe']
});

if (result.status !== 0) {
  process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}

const pack = JSON.parse(result.stdout)[0];
const files = new Set(pack.files.map((entry) => entry.path));
const missing = required.filter((file) => !files.has(file));

if (missing.length > 0) {
  console.error(`Package smoke failed; missing files: ${missing.join(', ')}`);
  process.exit(1);
}

console.log(`Package smoke ok: ${pack.filename} includes ${pack.files.length} files.`);
