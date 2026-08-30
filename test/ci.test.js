import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const workflow = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');

test('CI verifies the declared minimum and current Node runtimes', () => {
  const minimumNode = Number(packageJson.engines.node.match(/\d+/)?.[0]);
  const matrix = workflow.match(/node-version:\s*\[([^\]]+)\]/)?.[1]
    .split(',')
    .map((version) => Number(version.trim()));

  assert.equal(minimumNode, 20);
  assert.deepEqual(matrix, [minimumNode, 22]);
  assert.match(workflow, /node-version:\s*\$\{\{ matrix\.node-version \}\}/);
  assert.match(workflow, /run: npm ci/);
  assert.match(workflow, /run: npm run release:check/);
});
