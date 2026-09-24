# skill-contract-lab

`skill-contract-lab` checks whether a `SKILL.md` file declares the operational contract an agent needs before applying it: when to use it, inputs, tools, side-effect boundaries, approvals, examples, and validation workflow.

## Quickstart

```bash
npm install
npm run smoke
node bin/skill-contract.js fixtures/good-skill/SKILL.md --format markdown
```

## Rules

The checker is deterministic and local. It reports missing required sections as errors and very short sections as warnings.
Required sections may use ATX heading levels 1 through 6 with up to three leading spaces. CommonMark closing sequences are supported when whitespace separates them from the heading text (for example, `## Required Inputs ##`); an attached hash such as `## Required Inputs#` is part of the heading text and does not match the required section.

## Safety Notes

- The CLI reads one local Markdown file.
- It does not install, apply, or approve skills.
- It does not call a model or network service.

## Limitations

- V1 uses section-based heuristics.
- Approval checks recognize a bounded set of positive requirement phrases, reject common negated or optional forms, and require each detected action family to have matching approval language; they do not perform general natural-language reasoning.
- External-action checks recognize base, third-person, past, and gerund forms for the bounded publication/release, deployment, repository-write, and external-service action families. Active prohibitions (`never publish`, `may not publish`) apply across directly coordinated actions joined by `and` or `or`, and passive prohibitions before or after an action (`not allowed to publish`, `publishing ... is prohibited`) remain non-requesting. Contrastive mixed clauses are still checked for every affirmative action. Discussion-only nouns and code examples remain excluded.
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
