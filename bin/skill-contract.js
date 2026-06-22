#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { inspectSkill, renderJson, renderMarkdown } from '../src/index.js';

const args = process.argv.slice(2);

function usage() {
  return `Usage: skill-contract <SKILL.md> [--format markdown|json]

Checks whether an agent skill declares an operational contract.`;
}

if (args.includes('--help') || args.length === 0) {
  console.log(usage());
  process.exit(args.length === 0 ? 1 : 0);
}

const filePath = args[0];
const formatIndex = args.indexOf('--format');
const format = formatIndex === -1 ? 'markdown' : args[formatIndex + 1];

if (!['markdown', 'json'].includes(format)) {
  console.error('Unsupported format. Use markdown or json.');
  process.exit(1);
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
