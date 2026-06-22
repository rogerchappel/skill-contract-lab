# Security Policy

`skill-contract-lab` reads local Markdown and does not require credentials.

Do not add network calls, skill installation, proposal approval, or repository mutation to the default checker. Any future side-effecting feature must be opt-in, documented, disabled in CI fixtures, and covered by explicit approval language.
