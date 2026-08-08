# Rules

V1 requires these sections:

- `When To Use`
- `Required Inputs`
- `Required Tools`
- `Side-Effect Boundaries`
- `Approval Requirements`
- `Examples`
- `Validation Workflow`

Missing sections are errors. Sections with fewer than eight words are warnings.

If executable prose requests an external action (`must use the internet`, `call an API`, or `send email`), the body of `Approval Requirements` must substantively require approval or consent. The section heading alone does not satisfy this rule. Denials such as `no approval is required`, `approval is not required`, or equivalent optional/negative wording do not count as an approval requirement. External-action phrases inside fenced or indented code examples are ignored.
