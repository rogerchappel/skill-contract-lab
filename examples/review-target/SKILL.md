# Review Target Skill

## When To Use

Use this skill when a reviewer needs a deterministic local report about a prepared artifact.

## Required Inputs

- A local artifact path.
- The report format.
- Any review constraints from the user.

## Required Tools

- Local filesystem read access.
- Node.js for running validation commands.

## Side-Effect Boundaries

The skill reads the artifact and prints findings. It must not edit files, call external services, or publish results.

## Approval Requirements

Ask for explicit approval before writing files, changing repository state, or using network tools.

## Examples

```bash
review-target docs/PRD.md --format markdown
```

## Validation Workflow

Run the checker against this file, run tests, and attach the generated report to the review notes.
