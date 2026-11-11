/**
 * First-contact outreach drafts (issue #7) and the send gate (issue #8). Screen C.
 *
 * Writing rules, enforced in code after generation:
 * - never mentions buying the company
 * - cites only facts from the candidate's sourced evidence
 * - promises confidentiality and ends with an invitation to coffee or a short call
 * - 150 words or fewer
 */
import { z } from "zod";
import { sampleOutreach } from "@/data";
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
const CONFIDENTIALITY = /confiden|stays? between us|in confidence|private/i;

export interface Sender {
  name: string;
  company: string;
  title?: string;
  city?: string;
  email?: string;
}

const wordCount = (text: string) =>
  text.trim().split(/\s+/).filter(Boolean).length;

/** Rule violations in a draft. Empty means it may be shown to the CEO. */
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
  if (!CONFIDENTIALITY.test(body)) {
    problems.push(
      "Add a sentence promising the conversation stays confidential",
    );
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

function isNamedPerson(candidate: Candidate): boolean {
  return Boolean(
    candidate.contact &&
    !/office|inquir|development|team/i.test(candidate.contact.name),
  );
}

function greeting(candidate: Candidate): string {
  const first = candidate.contact?.name.split(" ")[0];
  return isNamedPerson(candidate) && first
    ? `Dear ${first},`
    : `Dear ${candidate.name} team,`;
}

function signature(sender: Sender): string {
  const role = sender.title
    ? `${sender.title}, ${sender.company}`
    : sender.company;
  return `Best regards,\n${sender.name}\n${role}`;
}

function envelope(
  candidate: Candidate,
  sender: Sender,
): Pick<OutreachDraft, "candidateId" | "from" | "to" | "toEmail" | "status"> {
  const contact = candidate.contact;
  return {
    candidateId: candidate.id,
    from: sender.email ? `${sender.name} <${sender.email}>` : sender.name,
    to:
      contact && isNamedPerson(candidate)
        ? `${contact.name}, ${contact.role}, ${candidate.name}`
        : candidate.name,
    toEmail: contact?.email ?? "",
    status: "draft",
  };
}

const factsOf = (facts: Evidence[]) =>
  facts.map((fact) => ({ text: fact.text, sourceUrl: fact.sourceUrl }));

function templateDraft(candidate: Candidate, sender: Sender): OutreachDraft {
  const facts = citableFacts(candidate);

  // A prepared letter exists for the sample shortlist.
  const prepared = sampleOutreach[candidate.id];
  if (prepared) {
    const used = prepared.factIndexes
      .map((index) => facts[index])
      .filter((fact): fact is Evidence => Boolean(fact));
    if (used.length > 0) {
      return {
        ...envelope(candidate, sender),
        subject: prepared.subject,
        body: prepared.body,
        factsUsed: factsOf(used),
      };
    }
  }

  const used = facts.slice(0, 2);
  const noticed = used.length
    ? `What caught my attention: ${used.map((fact) => fact.text).join(" ")}`
    : `I have a lot of respect for what ${candidate.name} has built.`;
  const intro = sender.city
    ? `I run ${sender.company} in ${sender.city}.`
    : `I run ${sender.company}.`;
  return {
    ...envelope(candidate, sender),
    subject: `An introduction from ${sender.company}`,
    body: `${greeting(candidate)}

${intro} ${noticed}

I would value an informal conversation about where you see ${candidate.name} going over the next few years. There is no agenda beyond getting to know each other, and anything we discuss stays between us.

Would you be open to a coffee or a short call in the coming weeks?

${signature(sender)}`,
    factsUsed: factsOf(used),
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
- Work one or two of the numbered facts into the letter naturally, and only those. State nothing else about the recipient's company.
- Say that the conversation stays confidential (for example, "anything we discuss stays between us").
- End by asking whether they are open to a coffee or a short call.
- ${MAX_WORDS} words or fewer in the body. Warm, direct, respectful. No flattery beyond the facts, no buzzwords.
- Start with the greeting given and end with the signature given, exactly.
- subject: short and personal, no sales language.
- factIndexes: the indexes of the facts you used.

Example of the tone and length wanted (written for a different company; do not reuse its facts):
"""
Dear Robert,

I run Summit Aerostructures in Columbus. Your team’s 5-axis work on landing-gear parts has a strong reputation in our industry, and I have a lot of respect for what you have built in Dayton since 1988.

We are looking for a long-term partner in Ohio, and I would value an informal conversation about where you see Hartwell going over the next few years. There is no agenda beyond getting to know each other, and anything we discuss stays between us.

Would you be open to a coffee or a short call in the coming weeks?

Best regards,
Maria Reyes
CEO, Summit Aerostructures
"""`;

async function llmDraft(
  candidate: Candidate,
  sender: Sender,
  criteria: AcquisitionCriteria | undefined,
): Promise<OutreachDraft | null> {
  const facts = citableFacts(candidate);
  if (facts.length === 0) return null;

  const context = JSON.stringify({
    greeting: greeting(candidate),
    signature: signature(sender),
    sender: { name: sender.name, company: sender.company, city: sender.city },
    senderIndustry: criteria?.industry,
    recipientCompany: candidate.name,
    recipientLocation: candidate.location,
    facts: facts.map((fact, index) => ({ index, text: fact.text })),
  });

  let feedback = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const reply = await chatJSON(
      SYSTEM,
      feedback ? `${context}\n\nFix these problems: ${feedback}` : context,
      ReplySchema,
      { maxTokens: 700 },
    );
    const used = [...new Set(reply.factIndexes)]
      .map((index) => facts[index])
      .filter((fact): fact is Evidence => Boolean(fact));
    const problems = draftProblems(reply.subject, reply.body);
    if (used.length === 0) {
      problems.push("factIndexes must point at the facts given");
    }
    if (problems.length === 0) {
      return {
        ...envelope(candidate, sender),
        subject: reply.subject.trim(),
        body: reply.body.trim(),
        factsUsed: factsOf(used),
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
    !allowlist.includes(draft.toEmail.trim().toLowerCase())
  ) {
    throw new ApiError(
      403,
      `"${draft.toEmail}" is not on the demo allowlist. Demo letters only go to team test inboxes.`,
    );
  }
}
