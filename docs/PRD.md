# PRD

Build a local-first CLI and agent skill that validates whether `SKILL.md` files contain clear operational contracts.

## Goals

- Catch missing contract sections.
- Produce stable Markdown and JSON reports.
- Help agents decide whether a skill is safe to apply.
- Keep checks deterministic and fixture-backed.

## Non-Goals

- Skill installation.
- Skill proposal lifecycle changes.
- LLM-based quality judging.
