# Good Example Skill

## When To Use

Use this skill when an agent must review a local artifact and produce a bounded report.

## Required Inputs

- A local file path.
- The expected report format.
- Any reviewer constraints.

## Required Tools

- Local filesystem read access.
- A terminal capable of running project tests.

## Side-Effect Boundaries

The skill may read files and print a report. It must not write files, call external APIs, publish content, or mutate account data.

## Approval Requirements

Ask for explicit approval before any external action, repository mutation, network call, or credential use.

## Examples

```bash
agent review --input docs/PRD.md --format markdown
```

The agent should print a local report, cite the reviewed path, summarize findings, and stop before making any changes.

## Validation Workflow

Run fixture checks, confirm all required sections are present, and attach the report to the agent run.
