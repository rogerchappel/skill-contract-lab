#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { inspectSkill, renderJson, renderMarkdown } from '../src/index.js';

const args = process.argv.slice(2);
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

function usage() {
  return `Usage: skill-contract <SKILL.md> [--format markdown|json]

Checks whether an agent skill declares an operational contract.`;
}

if (args.length === 1 && args[0] === '--version') {
  console.log(packageJson.version);
  process.exit(0);
}

if ((args.length === 1 && args[0] === '--help') || args.length === 0) {
  console.log(usage());
  process.exit(args.length === 0 ? 1 : 0);
}

function usageError(message) {
  console.error(`${message}\n\n${usage()}`);
  process.exit(1);
}

let filePath;
let format = 'markdown';
let hasFormat = false;

for (let index = 0; index < args.length; index += 1) {
  const argument = args[index];

  if (argument === '--format') {
    if (hasFormat) {
      usageError('Option --format may only be specified once.');
    }

    const value = args[index + 1];
    if (value === undefined || value.startsWith('-')) {
      usageError('Option --format requires a value.');
    }

    format = value;
    hasFormat = true;
    index += 1;
  } else if (argument.startsWith('-')) {
    usageError(`Unknown option: ${argument}`);
  } else if (filePath !== undefined) {
    usageError('Expected exactly one SKILL.md path.');
  } else {
    filePath = argument;
  }
}

if (filePath === undefined) {
  usageError('Expected exactly one SKILL.md path.');
}

if (!['markdown', 'json'].includes(format)) {
  usageError('Unsupported format. Use markdown or json.');
}

try {
  const markdown = readFileSync(filePath, 'utf8');
  const report = inspectSkill(markdown, { path: filePath });
  console.log(format === 'json' ? renderJson(report) : renderMarkdown(report));
  process.exit(report.status === 'fail' ? 2 : 0);
} catch (error) {
  console.error(`skill-contract failed: ${error.message}`);
  process.exit(1);
}
