# skill-contract-lab

`skill-contract-lab` checks whether a `SKILL.md` file declares the operational contract an agent needs before applying it: when to use it, inputs, tools, side-effect boundaries, approvals, examples, and validation workflow.

## Quickstart

```bash
npm install
npm run smoke
node bin/skill-contract.js fixtures/good-skill/SKILL.md --format json
```

## Rules

The checker is deterministic and local. It reports missing required sections as errors and very short sections as warnings.

## Safety Notes

- The CLI reads one local Markdown file.
- It does not install, apply, or approve skills.
- It does not call a model or network service.

## Limitations

- V1 uses section-based heuristics.
- It does not judge factual quality.
- It intentionally avoids LLM scoring so reports are stable in CI.

## Release Verification

Run the same checks used by CI before tagging or publishing:

```bash
npm run release:check
```

The release check runs syntax checks, fixture-backed tests, the CLI smoke, and
`npm run package:smoke`. The package smoke verifies that the packed artifact
contains the CLI, library source, fixtures, example skill, docs, changelog,
README, license, and security policy.
