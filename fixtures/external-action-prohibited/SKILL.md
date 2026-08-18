# Prohibited External Action

## When To Use
Use this fixture when validating explicitly prohibited external side effects.

## Required Inputs
Provide a local skill contract file and no remote service credentials.

## Required Tools
Use only the local checker and the local Node.js runtime.

## Side-Effect Boundaries
Never publish the package; this checker only reads files in the local workspace.

## Approval Requirements
No approval is required because every operation remains local and read-only.

## Examples
Inspect the local contract and report its validation findings to standard output.

## Validation Workflow
Run the local checker and confirm the report contains no approval error.
