# CLI

```bash
skill-contract <SKILL.md> --format markdown
skill-contract <SKILL.md> --format json
```

Exit codes:

- `0`: report generated without errors.
- `1`: CLI usage or file parsing failed.
- `2`: report generated with one or more errors.

Warnings keep exit code `0` so reviewers can use the report while improving the skill.
