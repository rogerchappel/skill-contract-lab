const requiredSections = [
  { id: 'when-to-use', label: 'When To Use', aliases: ['use this skill', 'when to use'] },
  { id: 'inputs', label: 'Required Inputs', aliases: ['required inputs', 'inputs'] },
  { id: 'tools', label: 'Required Tools', aliases: ['required tools', 'tools'] },
  { id: 'side-effects', label: 'Side-Effect Boundaries', aliases: ['side-effect boundaries', 'side effects', 'side-effect'] },
  { id: 'approval', label: 'Approval Requirements', aliases: ['approval requirements', 'approval'] },
  { id: 'examples', label: 'Examples', aliases: ['examples'] },
  { id: 'validation', label: 'Validation Workflow', aliases: ['validation workflow', 'verification workflow', 'validation'] }
];

export function inspectSkill(markdown, options = {}) {
  const sections = extractSections(markdown);
  const findings = [];

  for (const requirement of requiredSections) {
    const match = findSection(sections, requirement.aliases);
    if (!match) {
      findings.push({ level: 'error', rule: requirement.id, message: `Missing ${requirement.label} section.` });
      continue;
    }
    if (wordCount(match.body) < 8) {
      findings.push({ level: 'warning', rule: requirement.id, message: `${requirement.label} section is thin.` });
    }
  }

  if (/must\s+use\s+the\s+internet|call\s+api|send\s+email/i.test(markdown) && !/approval/i.test(markdown)) {
    findings.push({ level: 'error', rule: 'approval-explicitness', message: 'External actions are mentioned without explicit approval language.' });
  }

  const errors = findings.filter((finding) => finding.level === 'error').length;
  const warnings = findings.filter((finding) => finding.level === 'warning').length;

  return {
    path: options.path ?? 'SKILL.md',
    generatedAt: new Date(0).toISOString(),
    status: errors > 0 ? 'fail' : warnings > 0 ? 'warn' : 'pass',
    summary: { errors, warnings, sections: sections.length },
    findings
  };
}

function extractSections(markdown) {
  const lines = markdown.split(/\r?\n/);
  const sections = [];
  let current = { heading: 'preamble', body: [] };

  for (const line of lines) {
    const heading = /^(#{1,3})\s+(.+?)\s*$/.exec(line);
    if (heading) {
      sections.push({ heading: current.heading, body: current.body.join('\n').trim() });
      current = { heading: normalize(heading[2]), body: [] };
    } else {
      current.body.push(line);
    }
  }
  sections.push({ heading: current.heading, body: current.body.join('\n').trim() });
  return sections.filter((section) => section.heading !== 'preamble' || section.body.length > 0);
}

function findSection(sections, aliases) {
  return sections.find((section) => aliases.some((alias) => section.heading.includes(normalize(alias))));
}

function normalize(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function wordCount(value) {
  return value.split(/\s+/).filter(Boolean).length;
}

export function renderMarkdown(report) {
  const lines = [
    `# Skill Contract Report`,
    '',
    `Path: ${report.path}`,
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Errors: ${report.summary.errors}`,
    `Warnings: ${report.summary.warnings}`,
    ''
  ];

  if (report.findings.length > 0) {
    lines.push('## Findings', '');
    for (const finding of report.findings) {
      lines.push(`- ${finding.level.toUpperCase()} ${finding.rule}: ${finding.message}`);
    }
  } else {
    lines.push('No findings.');
  }

  return lines.join('\n').trimEnd();
}

export function renderJson(report) {
  return JSON.stringify(report, null, 2);
}
