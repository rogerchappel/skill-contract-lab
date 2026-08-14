import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { inspectSkill, renderMarkdown } from '../src/index.js';
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const approvalFixture = (name) => readFileSync(new URL(`../fixtures/${name}/SKILL.md`, import.meta.url), 'utf8');
const cliPath = 'bin/skill-contract.js';
const cliCwd = new URL('..', import.meta.url);

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: cliCwd,
    encoding: 'utf8',
  });
}

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

function contractWith({ action, approval = 'Review local output before continuing.' }) {
  return goodSkill
    .replace('The skill reads local files only and must not mutate repositories or external systems.', action)
    .replace('Explicit approval is required before external actions, network calls, or file writes.', approval);
}

test('passes a complete skill contract', () => {
  const report = inspectSkill(goodSkill);
  assert.equal(report.status, 'pass');
  assert.equal(report.summary.errors, 0);
});

test('accepts required sections at nested ATX heading levels 4 through 6', () => {
  for (const level of [4, 5, 6]) {
    const nestedContract = goodSkill.replace(/^## /gm, `${'#'.repeat(level)} `);
    const report = inspectSkill(nestedContract);

    assert.equal(report.status, 'pass', `expected level-${level} headings to pass`);
    assert.equal(report.summary.errors, 0);
  }
});

test('fails missing required sections', () => {
  const report = inspectSkill('# Skill\n\nDo a task.\n');
  assert.equal(report.status, 'fail');
  assert.ok(report.findings.some((finding) => finding.rule === 'inputs'));
});

test('ignores required headings inside fenced and indented code blocks', () => {
  const fencedContract = goodSkill.replace(/^## /gm, '#### ');
  const indentedContract = goodSkill
    .replace(/^## /gm, '###### ')
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');
  const fakeContract = `# Skill

\`\`\`md
${fencedContract}
\`\`\`

${indentedContract}
`;
  const report = inspectSkill(fakeContract);

  assert.equal(report.status, 'fail');
  assert.equal(report.summary.errors, 7);
  assert.deepEqual(
    report.findings.map((finding) => finding.rule),
    ['when-to-use', 'inputs', 'tools', 'side-effects', 'approval', 'examples', 'validation'],
  );
});

test('requires exact normalized section headings or documented aliases', () => {
  const suffixedHeadings = `# Skill

## When To Use Extra
Use this skill when the agent needs to inspect local docs and produce a bounded report.

## Inputs and Outputs
Local paths, expected output, and review constraints are required before starting.

## Tools Discussion
Filesystem read access and a local test runner are needed for validation.

## Side Effects TBD
The skill reads local files only and must not mutate repositories or external systems.

## Approval History
Explicit approval is required before external actions, network calls, or file writes.

## Examples Archive
Run the checker against a local SKILL.md fixture and inspect the report.

## Validation Notes
Run tests, run the smoke command, and confirm the report has no errors.
`;
  const report = inspectSkill(suffixedHeadings);

  assert.equal(report.status, 'fail');
  assert.equal(report.summary.errors, 7);
});

test('requires substantive approval language in the Approval Requirements body', () => {
  const report = inspectSkill(approvalFixture('external-action-without-approval'));

  assert.equal(report.status, 'fail');
  assert.ok(report.findings.some((finding) => finding.rule === 'approval-explicitness'));
});

test('accepts external actions with an explicit approval requirement', () => {
  const report = inspectSkill(approvalFixture('external-action-with-approval'));

  assert.equal(report.status, 'pass');
  assert.ok(!report.findings.some((finding) => finding.rule === 'approval-explicitness'));
});

test('rejects external actions when approval language denies a requirement', () => {
  const report = inspectSkill(approvalFixture('external-action-with-denied-approval'));

  assert.equal(report.status, 'fail');
  assert.ok(report.findings.some((finding) => finding.rule === 'approval-explicitness'));
});

test('rejects equivalent approval requirement denials', () => {
  for (const denial of [
    'Approval is not required before sending the report.',
    'Consent is unnecessary before sending the report.',
    'The agent does not require explicit approval before sending the report.',
    'Send the report without obtaining consent from the user.',
  ]) {
    const markdown = approvalFixture('external-action-with-denied-approval')
      .replace('No approval is required before sending email or making any external network call.', denial);
    const report = inspectSkill(markdown);

    assert.ok(
      report.findings.some((finding) => finding.rule === 'approval-explicitness'),
      `expected denial to fail: ${denial}`,
    );
  }
});

test('cli exits with a finding for denied approval language', () => {
  const fixturePath = new URL('../fixtures/external-action-with-denied-approval/SKILL.md', import.meta.url);
  const result = spawnSync(process.execPath, ['bin/skill-contract.js', fixturePath.pathname, '--format', 'json'], {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8',
  });

  assert.equal(result.status, 2);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, 'fail');
  assert.ok(report.findings.some((finding) => finding.rule === 'approval-explicitness'));
});

test('ignores external-action language in fenced and indented examples', () => {
  const markdown = approvalFixture('external-action-without-approval')
    .replace('Send email with the completed report after validation succeeds.', 'Keep the completed report in local memory after validation succeeds.')
    .replace('Run the local checker and review its generated report before continuing.', `Run the local checker and review its generated report before continuing.\n\n\`\`\`text\nsend email\n\`\`\`\n\n    call API`);
  const report = inspectSkill(markdown);

  assert.ok(!report.findings.some((finding) => finding.rule === 'approval-explicitness'));
});

const externalActionFamilies = [
  {
    family: 'package publication and releases',
    action: 'Publish the package and create a remote release tag after validation.',
    nonAction: 'Inspect package publication metadata and summarize the local release notes.',
  },
  {
    family: 'deployments',
    action: 'Deploy the application to production after the build passes.',
    nonAction: 'Review deployment documentation and validate the build locally.',
  },
  {
    family: 'remote repository writes',
    action: 'Push the branch and open a pull request in the remote repository.',
    nonAction: 'Inspect the local branch and draft a pull request description in memory.',
  },
  {
    family: 'external-service writes',
    action: 'Post to the external webhook and send a notification when processing completes.',
    nonAction: 'Describe the external webhook schema without calling or updating the service.',
  },
];

for (const { family, action, nonAction } of externalActionFamilies) {
  test(`accepts ${family} with explicit approval`, () => {
    const report = inspectSkill(contractWith({
      action,
      approval: 'Explicit approval is required before performing any external action.',
    }));

    assert.ok(!report.findings.some((finding) => finding.rule === 'approval-explicitness'));
  });

  test(`rejects ${family} with denied approval`, () => {
    const report = inspectSkill(contractWith({
      action,
      approval: 'No approval is required before performing the external action.',
    }));

    assert.ok(report.findings.some((finding) => finding.rule === 'approval-explicitness'));
  });

  test(`does not treat discussion of ${family} as an action`, () => {
    const report = inspectSkill(contractWith({ action: nonAction }));

    assert.ok(!report.findings.some((finding) => finding.rule === 'approval-explicitness'));
  });
}

test('renders markdown report', () => {
  const report = inspectSkill('# Skill\n\nDo a task.\n');
  assert.match(renderMarkdown(report), /Skill Contract Report/);
  assert.match(renderMarkdown(report), /Status: fail/);
});

test('cli reports package version', () => {
  const version = execFileSync(process.execPath, [cliPath, '--version'], {
    encoding: 'utf8',
  }).trim();
  assert.equal(version, packageJson.version);
});

for (const [name, args, message] of [
  ['unknown options', ['fixtures/good-skill/SKILL.md', '--bogus'], 'Unknown option: --bogus'],
  ['extra positional paths', ['fixtures/good-skill/SKILL.md', 'trailing'], 'Expected exactly one SKILL.md path'],
  ['duplicate format options', ['fixtures/good-skill/SKILL.md', '--format', 'json', '--format', 'markdown'], 'Option --format may only be specified once'],
  ['a missing format value', ['fixtures/good-skill/SKILL.md', '--format'], 'Option --format requires a value'],
]) {
  test(`cli rejects ${name} with a usage error`, () => {
    const result = runCli(args);

    assert.equal(result.status, 1);
    assert.match(result.stderr, new RegExp(message));
    assert.match(result.stderr, /Usage: skill-contract/);
    assert.equal(result.stdout, '');
  });
}
