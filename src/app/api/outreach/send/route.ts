import { z } from "zod";
import { handle, parseBody, readJson } from "@/lib/api";
import { assertSendable, outreachAllowlist } from "@/lib/outreach";
import { OutreachDraftSchema } from "@/types/deal";

const BodySchema = z.object({ draft: OutreachDraftSchema });

/**
 * POST /api/outreach/send (issue #8)
 *
 * Demo fallback 3: marks an approved draft as sent without delivering it.
 * No email leaves the server, so nothing can reach a real company.
 * The approval, writing-rule and allowlist checks are real, so swapping in
 * Gmail or Resend later only replaces the "simulated" delivery step.
 *
 * This route never reads or replies to an inbox.
 */
export const POST = handle(async (request) => {
  const { draft } = parseBody(BodySchema, await readJson(request));
  assertSendable(draft);

  return Response.json({
    draft: { ...draft, status: "sent" as const },
    delivery: "simulated",
    sentAt: new Date().toISOString(),
    note:
      outreachAllowlist().length > 0
        ? "Recipient is on the allowlist. Marked as sent; no email was delivered."
        : "OUTREACH_ALLOWLIST is not set. Marked as sent; no email was delivered.",
  });
});
