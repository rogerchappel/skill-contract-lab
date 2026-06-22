#!/usr/bin/env bash
set -euo pipefail

npm run check
npm test
npm run smoke
node bin/skill-contract.js examples/review-target/SKILL.md --format json >/tmp/skill-contract-lab-report.json
