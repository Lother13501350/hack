/**
 * First-contact outreach drafts (issue #7) and the send gate (issue #8).
 *
 * Writing rules, enforced in code after generation:
 * - never mentions buying the company
 * - cites only facts from the candidate's sourced evidence
 * - promises confidentiality and ends with an invitation to coffee or a short call
 * - 150 words or fewer
 */
import { z } from "zod";
import { ApiError } from "@/lib/api";
import { chatJSON, isLlmConfigured } from "@/lib/llm";
import type {
  AcquisitionCriteria,
  Candidate,
  Evidence,
  OutreachDraft,
  TextSource,
} from "@/types/deal";

export const MAX_WORDS = 150;
const FORBIDDEN =
  /\b(acquir\w*|acquisition\w*|buy|buys|buying|buyer\w*|bought|purchas\w*)\b/i;

export interface Sender {
  name: string;
  company: string;
}

const wordCount = (text: string) =>
  text.trim().split(/\s+/).filter(Boolean).length;

/** Rule violations in a draft body. Empty means it may be shown to the CEO. */
export function draftProblems(subject: string, body: string): string[] {
  const problems: string[] = [];
  const forbidden = `${subject}\n${body}`.match(FORBIDDEN);
  if (forbidden) {
    problems.push(
      `Remove the word "${forbidden[0]}": a first letter must not mention buying the company`,
    );
  }
  const words = wordCount(body);
  if (words > MAX_WORDS) {
    problems.push(
      `The body is ${words} words; keep it to ${MAX_WORDS} or fewer`,
    );
  }
  if (!/confiden/i.test(body)) {
    problems.push("Add a sentence promising confidentiality");
  }
  if (!/\b(coffee|call)\b/i.test(body)) {
    problems.push("End by inviting them to a coffee or a short call");
  }
  return problems;
}

/** Facts a friendly first letter may cite: sourced, positive evidence. */
function citableFacts(candidate: Candidate): Evidence[] {
  return candidate.evidence.filter(
    (item) => item.kind === "FIT" && URL.canParse(item.sourceUrl),
  );
}

function greeting(candidate: Candidate): string {
  const first = candidate.contact?.name.split(" ")[0];
  const isPerson =
    candidate.contact &&
    !/office|inquir|development|team/i.test(candidate.contact.name);
  return isPerson && first ? `Dear ${first},` : `Dear ${candidate.name} team,`;
}

function templateDraft(candidate: Candidate, sender: Sender): OutreachDraft {
  const facts = citableFacts(candidate).slice(0, 2);
  const noticed = facts.length
    ? `What caught my attention: ${facts.map((fact) => fact.text).join(" ")}`
    : `I have admired the work ${candidate.name} does.`;
  const body = `${greeting(candidate)}

I run ${sender.company}, and I have followed ${candidate.name} for some time. ${noticed}

We work in a neighboring part of the industry, and I think there could be real value in our two companies getting to know each other, whether that leads to working together or simply comparing notes.

Anything we discuss would stay strictly confidential.

Would you be open to a coffee or a 20-minute call in the next few weeks?

Best regards,
${sender.name}
${sender.company}`;

  return {
    candidateId: candidate.id,
    to: candidate.contact?.email ?? "",
    subject: `An introduction from ${sender.company}`,
    body,
    factsUsed: facts.map((fact) => ({
      text: fact.text,
      sourceUrl: fact.sourceUrl,
    })),
    status: "draft",
  };
}

const ReplySchema = z.object({
  subject: z.string(),
  body: z.string(),
  /** Indexes of the facts actually used in the body. */
  factIndexes: z.array(z.number().int()).min(1),
});

const SYSTEM = `You write a first-contact letter from a CEO to the owner of a company they admire.
Rules:
- Never use the words acquire, acquisition, buy or purchase, or suggest a sale. This is an introduction, not an offer.
- Mention one or two of the numbered facts provided, and only those. Do not state anything else about the company.
- Include a sentence promising that the conversation stays confidential.
- End by inviting them to a coffee or a short call.
- ${MAX_WORDS} words or fewer in the body. Warm, direct, no flattery, no buzzwords.
- Start with the greeting given and sign with the sender's name and company.
- factIndexes: the indexes of the facts you used.`;

async function llmDraft(
  candidate: Candidate,
  sender: Sender,
  criteria: AcquisitionCriteria | undefined,
): Promise<OutreachDraft | null> {
  const facts = citableFacts(candidate);
  if (facts.length === 0) return null;

  const context = JSON.stringify({
    greeting: greeting(candidate),
    sender,
    senderIndustry: criteria?.industry,
    recipientCompany: candidate.name,
    facts: facts.map((fact, index) => ({ index, text: fact.text })),
  });

  let feedback = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const reply = await chatJSON(
      SYSTEM,
      feedback ? `${context}\n\nFix these problems: ${feedback}` : context,
      ReplySchema,
      { maxTokens: 700, temperature: 0.4 },
    );
    const used = [...new Set(reply.factIndexes)]
      .map((index) => facts[index])
      .filter((fact): fact is Evidence => Boolean(fact));
    const problems = draftProblems(reply.subject, reply.body);
    if (used.length === 0)
      problems.push("factIndexes must point at the facts given");
    if (problems.length === 0) {
      return {
        candidateId: candidate.id,
        to: candidate.contact?.email ?? "",
        subject: reply.subject.trim(),
        body: reply.body.trim(),
        factsUsed: used.map((fact) => ({
          text: fact.text,
          sourceUrl: fact.sourceUrl,
        })),
        status: "draft",
      };
    }
    feedback = problems.join("; ");
  }
  return null;
}

/** One draft per candidate. Falls back to a template per candidate; never throws. */
export async function draftOutreach(
  candidates: Candidate[],
  sender: Sender,
  criteria?: AcquisitionCriteria,
): Promise<{ drafts: OutreachDraft[]; sources: Record<string, TextSource> }> {
  const sources: Record<string, TextSource> = {};
  const drafts = await Promise.all(
    candidates.map(async (candidate) => {
      if (isLlmConfigured()) {
        try {
          const draft = await llmDraft(candidate, sender, criteria);
          if (draft) {
            sources[candidate.id] = "llm";
            return draft;
          }
        } catch (error) {
          console.warn(`Outreach draft for ${candidate.id} fell back:`, error);
        }
      }
      sources[candidate.id] = "template";
      return templateDraft(candidate, sender);
    }),
  );
  return { drafts, sources };
}

export function outreachAllowlist(): string[] {
  return (process.env.OUTREACH_ALLOWLIST ?? "")
    .split(",")
    .map((address) => address.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Gate for sending (issue #8). Each draft must be individually approved, must
 * still pass the writing rules, and may only go to an allowlisted address.
 */
export function assertSendable(draft: OutreachDraft): void {
  if (draft.status !== "approved") {
    throw new ApiError(
      409,
      `Only approved drafts can be sent (status is "${draft.status}"). Each letter needs its own approval.`,
    );
  }
  const problems = draftProblems(draft.subject, draft.body);
  if (problems.length) {
    throw new ApiError(
      422,
      `Draft breaks the writing rules: ${problems.join("; ")}`,
    );
  }
  const allowlist = outreachAllowlist();
  if (
    allowlist.length > 0 &&
    !allowlist.includes(draft.to.trim().toLowerCase())
  ) {
    throw new ApiError(
      403,
      `"${draft.to}" is not on the demo allowlist. Demo letters only go to team test inboxes.`,
    );
  }
}
