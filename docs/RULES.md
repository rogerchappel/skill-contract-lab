# Rules

V1 requires these sections:

- `When To Use`
- `Required Inputs`
- `Required Tools`
- `Side-Effect Boundaries`
- `Approval Requirements`
- `Examples`
- `Validation Workflow`

Required section names may use ATX headings at any level from 1 through 6
(`# Heading` through `###### Heading`) with zero to three leading spaces, as
allowed by Markdown. A heading with four leading spaces, a tab-indented
heading, or a heading inside a fenced code block is an example rather than a
contract section.

Missing sections are errors. Sections with fewer than eight words are warnings.

When a contract requests an external action, its approval section must contain a
clear positive approval requirement. A section that both requires and denies
approval is treated as contradictory and fails `approval-explicitness`; split
scoped policies into an unambiguous rule before relying on the checker. Pure
discussion of an external action does not create an approval requirement.
Explicit prohibitions such as `never publish`, `do not send`, and `publishing is
not allowed` are also not requests and therefore do not require approval.
Affirmative actions still require approval, and mixed or contradictory clauses
remain approval-triggering so that a prohibition cannot mask another action.

If executable prose requests a recognized external action, the body of `Approval Requirements` must substantively require approval or consent. The bounded action taxonomy covers:

- publishing packages or artifacts and creating, publishing, or pushing releases and tags;
- deploying applications, services, sites, builds, releases, artifacts, or packages to hosted environments;
- writing remote repository state by pushing or merging changes, or creating and updating pull requests, merge requests, issues, and repositories; and
- writing through external services by sending email, messages, or notifications, posting or uploading to services and endpoints, or calling APIs.

The section heading alone does not satisfy this rule. Denials such as `no approval is required`, `approval is not required`, or equivalent optional/negative wording do not count as an approval requirement. Related nouns in descriptive prose do not count without a recognized action verb. External-action phrases inside fenced or indented code examples are ignored.
