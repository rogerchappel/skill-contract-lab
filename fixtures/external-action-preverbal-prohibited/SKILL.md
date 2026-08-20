# Pre-Verbal Prohibited External Action

## When To Use
Use this fixture when validating a passive prohibition before an external-action verb.

## Required Inputs
Provide a local skill contract file and no remote service credentials.

## Required Tools
Use only the local checker and the local Node.js runtime.

## Side-Effect Boundaries
It is not allowed to publish the package; this checker only reads local workspace files.

## Approval Requirements
No approval is required because every operation remains local and read-only.

## Examples
Inspect the local contract and report its validation findings to standard output.

## Validation Workflow
Run the local checker and confirm the report contains no approval error.
