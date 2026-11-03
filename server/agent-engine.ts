export type Job = Record<string, unknown> & { id?: string; company?: string; title?: string; description?: string };
export type AgentLog = { agent: string; status: string; message: string; at: string };

function companyName(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return String(record.company ?? record.name ?? "");
  }
  return "";
}

export function normalizeCompany(value: string): string {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]/g, "");
  return /^(?:jpmc|jpmorgan|jpmorganchase|jpmorganchaseco|jpmorganchaseandco)$/.test(normalized) ? "jpmorganchase" : normalized;
}

export function authorizationRestriction(text: string): boolean {
  // A question asking whether the candidate needs sponsorship is not employer policy.
  // Require explicit employer refusal or a candidate eligibility condition instead.
  return /(?:visa\s+)?sponsorship\s+(?:is\s+)?(?:not available|unavailable|not offered)|(?:we|company|employer)\s+(?:do(?:es)?\s+not|cannot|can['’]t|will not|won['’]t)\s+(?:provide|offer|support)\s+(?:visa\s+)?sponsorship|(?:must|applicants?\s+must|candidates?\s+must)\s+(?:have|be).{0,100}without\s+(?:the\s+)?(?:need\s+for\s+)?(?:visa\s+)?sponsorship|(?:no|without)\s+(?:visa\s+)?sponsorship\s+(?:now|available|offered|provided)|(?:us|u\.s\.)\s+citizen(?:ship)?\s+(?:required|only)/i.test(text);
}

function levelMismatch(title: string) {
  if (/\b(?:director|head of|vp|vice president|chief|group product manager)\b/i.test(title)) return { penalty: 35, reason: "Material level mismatch: leadership scope beyond demonstrated experience" };
  if (/\b(?:senior|sr\.?)\s+(?:manager|product manager)|\blead\s+product manager\b/i.test(title)) return { penalty: 25, reason: "Material level mismatch: senior product or management scope" };
  if (/\b(?:staff|principal)\b/i.test(title)) return { penalty: 25, reason: "Material level mismatch: staff/principal technical scope" };
  if (/\b(?:senior|sr\.?|lead)\b/i.test(title)) return { penalty: 12, reason: "Stretch level: senior individual-contributor scope; inspect requirements" };
  return { penalty: 0, reason: null };
}

export function runAgents(jobs: Job[], referrals: unknown[]) {
  const at = new Date().toISOString();
  const referralNames = new Set(referrals.map(companyName).map(normalizeCompany).filter(Boolean));
  const seen = new Set<string>();
  const ranked = jobs.filter(job => {
    const key = String(job.url ?? job.link ?? `${job.company}:${job.title}`).toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).map(job => {
    const text = `${job.title ?? ""} ${job.description ?? job.jd ?? ""}`.toLowerCase();
    const referral = referralNames.has(normalizeCompany(String(job.company ?? "")));
    const matchingSkills = ["api", "webhook", "integration", "python", "sql", "onboarding", "implementation", "marketing automation", "documentation"].filter(skill => text.includes(skill));
    const hardBlock = authorizationRestriction(text);
    const seniority = levelMismatch(String(job.title ?? ""));
    const score = Math.max(0, Math.min(99, 45 + matchingSkills.length * 5 + (referral ? 15 : 0) - (hardBlock ? 35 : 0) - seniority.penalty));
    return { ...job, score, referral, matchingSkills, levelPenalty: seniority.penalty, eligibility: hardBlock ? "Needs authorization review" : "Not verified", rankingReasons: [...(referral ? ["Referral available"] : []), ...matchingSkills.map(skill => `Relevant: ${skill}`), ...(seniority.reason ? [seniority.reason] : []), ...(hardBlock ? ["Explicit authorization restriction detected; verify employer policy"] : []), "Rules-based match; verify requirements"], rankedAt: at };
  }).sort((a, b) => b.score - a.score);
  const logs: AgentLog[] = [
    { agent: "Manager", status: "complete", message: `Delegated review of ${jobs.length} saved opportunities.`, at },
    { agent: "Sourcing", status: "complete", message: "Saved-job ranking only; use Fetch jobs for live public sources.", at },
    { agent: "Fit & referral", status: "complete", message: `Deduplicated to ${ranked.length} jobs and ranked task overlap plus referral availability. Scores are heuristics, not hiring probabilities.`, at },
    { agent: "Resume", status: "review", message: "Resume drafts remain editable. No new employment claims were generated.", at },
    { agent: "Email", status: "blocked", message: "Mailbox integration is not connected. Manual email import is available.", at },
    { agent: "News", status: "blocked", message: "Live news retrieval is not connected. Existing source links remain available.", at },
  ];
  return { jobs: ranked, logs, mode: "rules", runAt: at, fetchedLiveJobs: false, emailConnected: false, llmConnected: false };
}

export function parseEmail(text: string, suppliedCompany = "") {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const companyMatch = text.match(/(?:company|employer)\s*:\s*([^\n\r]+)/i);
  const company = suppliedCompany.trim() || companyMatch?.[1]?.trim() || "Unmatched company";
  const patterns: [string, RegExp][] = [
    ["Rejected", /(?:not (?:be )?moving forward|unfortunately.{0,100}(?:application|position|role)|decided to pursue other|will not be proceeding)/i],
    ["Offer", /(?:pleased to (?:offer|extend)|offer of employment|formal offer letter)/i],
    ["Interview", /(?:schedule.{0,60}interview|invite.{0,60}interview|interview invitation)/i],
    ["Applied", /(?:application (?:was |has been )?received|thank you for applying|thanks for applying)/i],
  ];
  const matches = patterns.filter(([, re]) => re.test(text));
  const status = matches.length === 1 ? matches[0][0] : "Needs review";
  const evidence = matches.length === 1 ? lines.find(line => matches[0][1].test(line))?.slice(0, 500) ?? text.match(matches[0][1])?.[0] ?? "" : "No single unambiguous application stage detected.";
  return { company, status, confidence: matches.length === 1 && company !== "Unmatched company" ? "medium" : "low", evidence, needsReview: true, ambiguous: matches.length !== 1, importedAt: new Date().toISOString() };
}
