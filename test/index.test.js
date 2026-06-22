import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectSkill, renderMarkdown } from '../src/index.js';

const goodSkill = `# Skill

## When To Use
Use this skill when the agent needs to inspect local docs and produce a bounded report.

## Required Inputs
Local paths, expected output, and review constraints are required before starting.

## Required Tools
Filesystem read access and a local test runner are needed for validation.

## Side-Effect Boundaries
The skill reads local files only and must not mutate repositories or external systems.

## Approval Requirements
Explicit approval is required before external actions, network calls, or file writes.

## Examples
Run the checker against a local SKILL.md fixture and inspect the report.

## Validation Workflow
Run tests, run the smoke command, and confirm the report has no errors.
`;

test('passes a complete skill contract', () => {
  const report = inspectSkill(goodSkill);
  assert.equal(report.status, 'pass');
  assert.equal(report.summary.errors, 0);
});

test('fails missing required sections', () => {
  const report = inspectSkill('# Skill\n\nDo a task.\n');
  assert.equal(report.status, 'fail');
  assert.ok(report.findings.some((finding) => finding.rule === 'inputs'));
});

test('renders markdown report', () => {
  const report = inspectSkill('# Skill\n\nDo a task.\n');
  assert.match(renderMarkdown(report), /Skill Contract Report/);
  assert.match(renderMarkdown(report), /Status: fail/);
});
