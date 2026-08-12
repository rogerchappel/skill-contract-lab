# CLI

```bash
skill-contract <SKILL.md> [--format markdown|json]
skill-contract --help
skill-contract --version
```

Exactly one `SKILL.md` path is required. The path and optional `--format` option may
appear in either order, but `--format` may be specified only once and must be
followed by `markdown` or `json`. Markdown is the default format.

Unknown options, extra positional arguments, duplicate `--format` options, and a
missing or unsupported format value print the usage message and exit with code
`1`. `--help` and `--version` are standalone commands.

Exit codes:

- `0`: report generated without errors.
- `1`: CLI usage or file parsing failed.
- `2`: report generated with one or more errors.

Warnings keep exit code `0` so reviewers can use the report while improving the skill.
