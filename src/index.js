const requiredSections = [
  { id: 'when-to-use', label: 'When To Use', aliases: ['use this skill', 'when to use'] },
  { id: 'inputs', label: 'Required Inputs', aliases: ['required inputs', 'inputs'] },
  { id: 'tools', label: 'Required Tools', aliases: ['required tools', 'tools'] },
  { id: 'side-effects', label: 'Side-Effect Boundaries', aliases: ['side-effect boundaries', 'side effects', 'side-effect'] },
  { id: 'approval', label: 'Approval Requirements', aliases: ['approval requirements', 'approval'] },
  { id: 'examples', label: 'Examples', aliases: ['examples'] },
  { id: 'validation', label: 'Validation Workflow', aliases: ['validation workflow', 'verification workflow', 'validation'] }
];

// Keep this taxonomy bounded to actions that write outside the local workspace.
// Each expression requires an action verb so discussion of related metadata or
// documentation does not by itself create an approval requirement.
const externalActionFamilies = [
  { id: 'publication', label: 'publication or release', patterns: [
  // Package publication and releases.
  /\b(?:publish(?:es|ed|ing)?|releas(?:e|es|ed|ing))\s+(?:an?\s+|the\s+)?(?:package|packages|artifact|artifacts|release)\b/i,
  /\b(?:creat(?:e|es|ed|ing)|publish(?:es|ed|ing)?|push(?:es|ed|ing)?)\s+(?:an?\s+|the\s+)?(?:remote\s+)?(?:release|release\s+tag|tag)\b/i,
  ] },
  { id: 'deployment', label: 'deployment', patterns: [
  // Deployments to remotely hosted environments.
  /\bdeploy(?:s|ed|ing)?\s+(?:the\s+)?(?:app|application|service|site|website|build|release|artifact|artifacts|package|packages)\b/i,
  /\bdeploy(?:s|ed|ing)?\s+(?:to|into)\s+(?:an?\s+|the\s+)?(?:production|staging|remote|hosted|cloud)\b/i,
  ] },
  { id: 'repository-write', label: 'repository write', patterns: [
  // Writes to remote repositories and their collaboration records.
  /\b(?:push(?:es|ed|ing)?|merg(?:e|es|ed|ing))\s+(?:the\s+|an?\s+)?(?:commit|commits|branch|branches|pull\s+request|merge\s+request|tag|tags)\b/i,
  /\b(?:open(?:s|ed|ing)?|creat(?:e|es|ed|ing)|clos(?:e|es|ed|ing)|approv(?:e|es|ed|ing)|updat(?:e|es|ed|ing)|edit(?:s|ed|ing)?|comment(?:s|ed|ing)?\s+on)\s+(?:the\s+|an?\s+)?(?:pull\s+request|merge\s+request|issue|repository)\b/i,
  ] },
  { id: 'external-service', label: 'external-service write', patterns: [
  // Writes through external services.
  /\b(?:send(?:s|ing)?|sent)\s+(?:an?\s+|the\s+)?(?:email|message|notification)\b/i,
  /\b(?:post(?:s|ed|ing)?|upload(?:s|ed|ing)?|submit(?:s|ted|ting)?|writ(?:e|es|ing)|wrote|written)\s+(?:to\s+)?(?:an?\s+|the\s+)?(?:external\s+)?(?:service|api|webhook|slack|discord|endpoint)\b/i,
  /\bcall(?:s|ed|ing)?\s+(?:an?\s+|the\s+)?(?:external\s+)?api\b/i,
  /\bmust\s+use\s+the\s+internet\b/i,
  ] },
];
const externalActionPatterns = externalActionFamilies.flatMap((family) => family.patterns);

export function inspectSkill(markdown, options = {}) {
  const sections = extractSections(markdown);
  const findings = [];
  let approvalSection;

  for (const requirement of requiredSections) {
    const match = findSection(sections, requirement.aliases);
    if (!match) {
      findings.push({ level: 'error', rule: requirement.id, message: `Missing ${requirement.label} section.` });
      continue;
    }
    if (requirement.id === 'approval') approvalSection = match;
    if (wordCount(match.body) < 8) {
      findings.push({ level: 'warning', rule: requirement.id, message: `${requirement.label} section is thin.` });
    }
  }

  const executableText = stripDiscussionOnlyText(stripCodeExamples(markdown));
  const requestedFamilies = externalActionFamilies.filter((family) => executableText
    .split(/(?:[.!?;]|\r?\n)+/)
    .some((clause) => clauseRequestsExternalAction(clause, family.patterns)));
  const approvalText = approvalSection && stripCodeExamples(approvalSection.body);
  const uncoveredFamilies = requestedFamilies.filter((family) => !approvalText || !hasApprovalForFamily(approvalText, family));

  if (uncoveredFamilies.length > 0) {
    findings.push({ level: 'error', rule: 'approval-explicitness', message: `External actions are mentioned without matching explicit approval language: ${uncoveredFamilies.map((family) => family.label).join(', ')}.` });
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

function clauseRequestsExternalAction(clause, patterns) {
  return patterns.some((pattern) => {
    const matcher = new RegExp(pattern.source, `${pattern.flags}g`);
    return [...clause.matchAll(matcher)].some((match) => {
      const before = clause.slice(0, match.index);
      const after = clause.slice(match.index + match[0].length);
      const activelyProhibited = isActivelyProhibited(clause, match);
      const preVerballyProhibited = /\b(?:(?:is|are|was|were)\s+(?:explicitly\s+)?(?:not\s+(?:allowed|permitted)|prohibited|forbidden)\s+(?:to|from)|(?:isn't|aren't|wasn't|weren't)\s+(?:explicitly\s+)?(?:allowed|permitted)\s+to)\s+$/i.test(before);
      const passivelyProhibited = /^\s+(?:is|are|was|were)\s+(?:explicitly\s+)?(?:not\s+(?:allowed|permitted)|prohibited|forbidden)\b/i.test(after);

      return !activelyProhibited && !preVerballyProhibited && !passivelyProhibited;
    });
  });
}

function isActivelyProhibited(clause, match, visited = new Set()) {
  const key = `${match.index}:${match[0].length}`;
  if (visited.has(key)) return false;
  visited.add(key);

  const before = clause.slice(0, match.index);
  const direct = /\b(?:never|do\s+not|don't|may\s+not|must\s+not|should\s+not|cannot|can't)\s+(?:(?:ever|never|explicitly|directly|automatically|remotely|publicly|immediately|intentionally|manually)\s+)*$/i.test(before);
  if (direct) return true;

  const priorMatches = externalActionPatterns.flatMap((pattern) => {
    const matcher = new RegExp(pattern.source, `${pattern.flags}g`);
    return [...clause.matchAll(matcher)];
  }).filter((candidate) => candidate.index + candidate[0].length <= match.index);
  const prior = priorMatches.sort((left, right) => right.index - left.index)[0];
  if (!prior) return false;

  const connector = clause.slice(prior.index + prior[0].length, match.index);
  return /^\s*,?\s*(?:and|or)\s+$/i.test(connector)
    && isActivelyProhibited(clause, prior, visited);
}

function hasApprovalForFamily(text, family) {
  return text.split(/(?:[.!?;]|\r?\n)+/).some((clause) => {
    const broadlyScoped = /\b(?:external|remote)\s+actions?\b/i.test(clause);
    const externalRecipientScoped = family.id === 'external-service'
      && /\b(?:send(?:ing)?|deliver(?:ing)?)\b.*\bexternal\s+(?:recipient|service|system|endpoint)\b/i.test(clause);
    const familyScoped = externalRecipientScoped || family.patterns.some((pattern) => pattern.test(clause));
    return (broadlyScoped || familyScoped) && hasPositiveApprovalLanguage(clause);
  }) && hasPositiveApprovalLanguage(text);
}

function hasPositiveApprovalLanguage(text) {
  const positiveRequirement = /(?:approval|consent)\s+(?:is\s+)?(?:explicitly\s+)?(?:required|needed)|(?:require|obtain|get)\s+(?:explicit\s+)?(?:approval|consent)|(?:approval|consent)\s+(?:must|should)\s+be\s+(?:obtained|given|granted)/i;
  const deniedRequirement = /(?:\bno\s+(?:explicit\s+)?(?:approval|consent)\s+(?:is\s+)?(?:required|needed)\b|\b(?:approval|consent)\s+(?:is\s+)?(?:not|never)\s+(?:required|needed)\b|\b(?:approval|consent)\s+(?:is\s+)?(?:optional|unnecessary)\b|\b(?:do(?:es)?\s+not|doesn't|don't|need\s+not)\s+(?:require|obtain|get)\s+(?:explicit\s+)?(?:approval|consent)\b|\bwithout\s+(?:requiring|obtaining|getting)\s+(?:explicit\s+)?(?:approval|consent)\b)/i;
  const clauses = text.split(/(?:[.!?;]|\r?\n)+/);

  // A section with both requirements and exemptions is ambiguous without a
  // full action-to-clause parser. Fail it conservatively instead of allowing
  // an unrelated positive clause to mask an explicit denial.
  return clauses.some((clause) => positiveRequirement.test(clause))
    && !clauses.some((clause) => deniedRequirement.test(clause));
}

function stripCodeExamples(markdown) {
  const lines = markdown.split(/\r?\n/);
  const prose = [];
  let fence = null;

  for (const line of lines) {
    const fenceMarker = parseFenceMarker(line);
    if (fenceMarker) {
      const marker = fenceMarker[2];
      if (!fence) {
        fence = { character: marker[0], length: marker.length };
      } else if (marker[0] === fence.character && marker.length >= fence.length && fenceMarker[3].trim() === '') {
        fence = null;
      }
      continue;
    }
    if (!fence && !/^(?: {4}|\t)/.test(line)) prose.push(line);
  }

  return prose.join('\n');
}

function stripDiscussionOnlyText(markdown) {
  return markdown
    .split(/\r?\n/)
    .filter((line) => !/^\s*(?:[-*+]\s+)?(?:explain|describe|discuss)\b.*\bwithout\b/i.test(line))
    .join('\n');
}

function extractSections(markdown) {
  const lines = markdown.split(/\r?\n/);
  const sections = [];
  let current = { heading: 'preamble', body: [] };
  let fence = null;

  for (const line of lines) {
    const fenceMarker = parseFenceMarker(line);
    if (fenceMarker) {
      const marker = fenceMarker[2];
      if (!fence) {
        fence = { character: marker[0], length: marker.length };
      } else if (
        marker[0] === fence.character
        && marker.length >= fence.length
        && fenceMarker[3].trim() === ''
      ) {
        fence = null;
      }
      current.body.push(line);
      continue;
    }

    if (fence) {
      current.body.push(line);
      continue;
    }

    const heading = /^ {0,3}(#{1,6})[ \t]+(.+?)[ \t]*$/.exec(line);
    if (heading) {
      sections.push({ heading: current.heading, body: current.body.join('\n').trim() });
      current = { heading: normalizeHeading(heading[2]), body: [] };
    } else {
      current.body.push(line);
    }
  }
  sections.push({ heading: current.heading, body: current.body.join('\n').trim() });
  return sections.filter((section) => section.heading !== 'preamble' || section.body.length > 0);
}

function normalizeHeading(value) {
  const closingSequence = /^(.*?)[ \t]+#+$/.exec(value);
  const content = closingSequence ? closingSequence[1] : value;

  // Without separating whitespace, trailing hashes are heading content rather
  // than a CommonMark ATX closing sequence. Keep that boundary significant.
  return /#+$/.test(content) ? `${normalize(content.replace(/#+$/, ''))} #` : normalize(content);
}

function parseFenceMarker(line) {
  const match = /^( {0,3})(`{3,}|~{3,})(.*)$/.exec(line);
  if (!match) return null;

  // CommonMark does not recognize a backtick fence when its info string
  // contains a backtick. Tilde fences have no equivalent restriction.
  return match[2][0] === '`' && match[3].includes('`') ? null : match;
}

function findSection(sections, aliases) {
  const normalizedAliases = aliases.map(normalize);
  return sections.find((section) => normalizedAliases.includes(section.heading));
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
