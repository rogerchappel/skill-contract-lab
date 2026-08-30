# Release Candidate Notes

## Scope

- Markdown contract extraction.
- Required-section validation.
- Markdown and JSON reports.
- Agent skill instructions.

## Verification

- `npm run check` - passed on 2026-08-31.
- `npm test` - 68 tests passed on Node 20 and Node 22.
- `npm run smoke` - rendered a passing SKILL.md contract report on both supported CI runtimes.
- `npm run package:smoke` - installed and invoked the packed package successfully.
- `npm run release:check` - passed the complete check, test, smoke, and package-smoke sequence.

## Classification

ship
