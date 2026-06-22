# Skill Contract Lab

## When To Use

Use this skill when an agent author or reviewer needs to validate that a `SKILL.md` file contains enough operational contract detail for safe reuse.

## Required Inputs

- A local path to the `SKILL.md` file.
- Any repository-specific skill requirements.
- The desired report format.

## Required Tools

- Local filesystem read access.
- Node.js 20 or newer.
- A terminal for running tests and smoke checks.

## Side-Effect Boundaries

This skill reads local Markdown and writes reports to stdout. It must not apply, install, approve, reject, or modify skills.

## Approval Requirements

Ask for explicit approval before editing skill files, changing proposal state, calling external services, or writing repository changes.

## Examples

```bash
node bin/skill-contract.js fixtures/good-skill/SKILL.md --format markdown
node bin/skill-contract.js fixtures/good-skill/SKILL.md --format json
```

## Validation Workflow

Run `npm test`, `npm run check`, and `npm run smoke`. Review every error before treating a skill as reusable.
