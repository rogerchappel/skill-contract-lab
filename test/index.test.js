import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

function runCliMarkdown(markdown) {
  const directory = mkdtempSync(join(tmpdir(), 'skill-contract-test-'));
  const fixturePath = join(directory, 'SKILL.md');
  writeFileSync(fixturePath, markdown);
  try {
    return runCli([fixturePath, '--format', 'json']);
  } finally {
    rmSync(directory, { recursive: true });
  }
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

test('accepts required ATX section headings with up to three leading spaces', () => {
  for (const spaces of [1, 2, 3]) {
    const indentedContract = goodSkill.replace(/^## /gm, `${' '.repeat(spaces)}## `);
    const report = inspectSkill(indentedContract);

    assert.equal(report.status, 'pass', `expected ${spaces}-space headings to pass`);
    assert.equal(report.summary.errors, 0);
  }
});

test('cli accepts required headings with one, two, or three leading spaces', () => {
  for (const spaces of [1, 2, 3]) {
    const indentedContract = goodSkill.replace(/^## /gm, `${' '.repeat(spaces)}## `);
    const result = runCliMarkdown(indentedContract);

    assert.equal(result.status, 0, `expected ${spaces}-space headings to pass: ${result.stderr}`);
    assert.equal(JSON.parse(result.stdout).status, 'pass');
  }
});

test('four-space ATX headings remain indented code examples', () => {
  const indentedContract = goodSkill.replace(/^## /gm, '    ## ');
  const report = inspectSkill(indentedContract);
  const result = runCliMarkdown(indentedContract);

  assert.equal(report.status, 'fail');
  assert.equal(report.summary.errors, 7);
  assert.equal(result.status, 2);
  assert.equal(JSON.parse(result.stdout).summary.errors, 7);
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

test('rejects contradictory approval scoped to a mentioned external action', () => {
  const report = inspectSkill(approvalFixture('external-action-with-contradictory-approval'));

  assert.equal(report.status, 'fail');
  assert.ok(report.findings.some((finding) => finding.rule === 'approval-explicitness'));
});

test('accepts genuinely approved actions after scoped approval is clarified', () => {
  const markdown = approvalFixture('external-action-with-contradictory-approval')
    .replace('No approval is required before sending email.', 'Explicit approval is required before sending email.');
  const report = inspectSkill(markdown);

  assert.equal(report.status, 'pass');
  assert.ok(!report.findings.some((finding) => finding.rule === 'approval-explicitness'));
});

test('does not treat discussion of an external action as an approval-triggering request', () => {
  const report = inspectSkill(contractWith({
    action: 'Explain how email delivery works without sending email or calling an API.',
    approval: 'No approval is required because this skill only discusses the workflow.',
  }));

  assert.equal(report.status, 'pass');
  assert.ok(!report.findings.some((finding) => finding.rule === 'approval-explicitness'));
});

for (const prohibition of [
  'Never publish the package.',
  'Do not send an email after validation.',
  'Publishing the package is not allowed.',
  'It is not allowed to publish the package.',
  "It isn't permitted to deploy the application.",
  'The agent is prohibited from publishing a release.',
  'The workflow was forbidden from sending an email.',
]) {
  test(`does not treat a prohibited external action as requested: ${prohibition}`, () => {
    const report = inspectSkill(contractWith({
      action: `${prohibition} This checker only reads local files.`,
      approval: 'No approval is required because all operations stay local and read-only.',
    }));

    assert.ok(!report.findings.some((finding) => finding.rule === 'approval-explicitness'));
  });
}

test('still requires approval for affirmative and mixed external-action clauses', () => {
  for (const action of [
    'Publish the package after validation.',
    'Do not publish the package, but send an email after validation.',
    'Do not publish the package, but publish the artifact after validation.',
    'It is not allowed to publish the package, but send an email after validation.',
    "It isn't permitted to deploy the application, but push the branch after validation.",
  ]) {
    const report = inspectSkill(contractWith({
      action,
      approval: 'No approval is required before performing the external action.',
    }));

    assert.ok(report.findings.some((finding) => finding.rule === 'approval-explicitness'));
  }
});

test('cli accepts a contract that explicitly prohibits external actions', () => {
  const fixturePath = new URL('../fixtures/external-action-prohibited/SKILL.md', import.meta.url);
  const result = runCli([fixturePath.pathname, '--format', 'json']);

  assert.equal(result.status, 0);
  assert.ok(!JSON.parse(result.stdout).findings.some((finding) => finding.rule === 'approval-explicitness'));
});

test('cli accepts pre-verbal passive external-action prohibitions', () => {
  const fixturePath = new URL('../fixtures/external-action-preverbal-prohibited/SKILL.md', import.meta.url);
  const result = runCli([fixturePath.pathname, '--format', 'json']);

  assert.equal(result.status, 0, result.stderr);
  assert.ok(!JSON.parse(result.stdout).findings.some((finding) => finding.rule === 'approval-explicitness'));
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

test('cli exits with a finding for contradictory scoped approval', () => {
  const fixturePath = new URL('../fixtures/external-action-with-contradictory-approval/SKILL.md', import.meta.url);
  const result = runCli([fixturePath.pathname, '--format', 'json']);

  assert.equal(result.status, 2);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, 'fail');
  assert.ok(report.findings.some((finding) => finding.rule === 'approval-explicitness'));
});

test('fixture and CLI reject inflected external actions without approval', () => {
  const fixturePath = new URL('../fixtures/external-action-inflections/SKILL.md', import.meta.url);
  const report = inspectSkill(readFileSync(fixturePath, 'utf8'));
  const result = runCli([fixturePath.pathname, '--format', 'json']);

  assert.ok(report.findings.some((finding) => finding.rule === 'approval-explicitness'));
  assert.equal(result.status, 2);
  assert.ok(JSON.parse(result.stdout).findings.some((finding) => finding.rule === 'approval-explicitness'));
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

const grammaticalActionForms = [
  'Publishing the package to the registry is part of this workflow.',
  'The workflow deployed the application to staging.',
  'Pushing the branch updates the remote repository.',
  'The connector sends a notification after validation.',
];

for (const action of grammaticalActionForms) {
  test(`recognizes grammatical external-action form: ${action}`, () => {
    const report = inspectSkill(contractWith({
      action,
      approval: 'No approval is required before performing the external action.',
    }));

    assert.ok(report.findings.some((finding) => finding.rule === 'approval-explicitness'));
  });
}

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
