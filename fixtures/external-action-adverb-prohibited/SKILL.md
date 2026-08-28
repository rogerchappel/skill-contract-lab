# Adverb-Prohibited External Actions

## When To Use
Use this skill to review a contract entirely within the local workspace.

## Required Inputs
Provide the local contract path and the expected validation boundaries before starting.

## Required Tools
Use only local filesystem reads and the local contract validation command.

## Side-Effect Boundaries
Do not ever publish the package. The workflow must never deploy the application. The agent should not automatically push the branch. The checker may not directly send an email.

## Approval Requirements
No approval is required because every operation remains local and read-only.

## Examples
Inspect a local contract and retain the resulting report in local memory.

## Validation Workflow
Run the local checker and confirm that the report contains no errors.
