/**
 * Target sourcing (issue #4).
 *
 * Live path: LLM writes search queries -> web search -> LLM extracts companies
 * from the search results only -> deterministic scoring.
 * Any failure, a missing key, or DEMO_MODE=fixture returns the fixture instead.
 *
 * Guard rails:
 * - A source URL is never taken from the model. The model points at a search
 *   result by index and the URL is copied from that result in code.
 * - Evidence without a valid source is dropped; companies with no evidence are dropped.
 * - Revenue is always an estimate, derived by rule from headcount.
 */
import { z } from "zod";
import { sampleSourcing } from "@/data";
import { chatJSON, isLlmConfigured } from "@/lib/llm";
import type {
  AcquisitionCriteria,
  AnalystRecommendation,
  Candidate,
  Evidence,
  SourcingResult,
} from "@/types/deal";

const SEARCH_URL = "https://api.tavily.com/search";
const SHORTLIST_SIZE = 5;
/** Rough revenue per employee for a job shop, in $M. Used only to bracket an estimate. */
const REVENUE_PER_EMPLOYEE_M = { low: 0.15, high: 0.25 };

interface SearchResult {
  title: string;
  url: string;
  content: string;
}

export function sourcingMode(): "live" | "fixture" {
  if (process.env.DEMO_MODE?.trim().toLowerCase() === "fixture")
    return "fixture";
  if (!process.env.SEARCH_API_KEY?.trim() || !isLlmConfigured())
    return "fixture";
  return "live";
}

async function webSearch(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.SEARCH_API_KEY?.trim() ?? "";
  const response = await fetch(SEARCH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, max_results: 6, search_depth: "basic" }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Search returned ${response.status}`);
  const data = (await response.json()) as { results?: Partial<SearchResult>[] };
  return (data.results ?? [])
    .filter((result) => result.url && URL.canParse(result.url))
    .map((result) => ({
      title: result.title ?? "",
      url: result.url as string,
      content: (result.content ?? "").slice(0, 700),
    }));
}

const QueriesSchema = z.object({
  queries: z.array(z.string()).min(3).max(5),
});

const ExtractedSchema = z.object({
  companies: z.array(
    z.object({
      name: z.string(),
      location: z.string(),
      /** Headcount if a search result states it, else null. */
      employees: z.number().nullable(),
      snapshot: z.object({
        what: z.string(),
        ownership: z.string(),
        whyFits: z.string(),
        watchOut: z.string(),
      }),
      evidence: z.array(
        z.object({
          kind: z.enum(["FIT", "RISK"]),
          text: z.string(),
          /** Index of the search result this fact comes from. */
          resultIndex: z.number().int(),
        }),
      ),
      /** One entry per must-have, in order: is it met according to the evidence? */
      mustHavesMet: z.array(z.boolean()),
      niceToHavesMet: z.array(z.boolean()),
    }),
  ),
});
type ExtractedCompany = z.infer<typeof ExtractedSchema>["companies"][number];

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * Deterministic score: must-haves carry 70 points, nice-to-haves 30.
 * A candidate missing two or more must-haves is skipped; missing one is a watch.
 */
export function scoreCandidate(
  mustHavesMet: boolean[],
  niceToHavesMet: boolean[],
): { fitScore: number; analystRecommendation: AnalystRecommendation } {
  const share = (flags: boolean[]) =>
    flags.length ? flags.filter(Boolean).length / flags.length : 1;
  const fitScore = Math.round(
    70 * share(mustHavesMet) + 30 * share(niceToHavesMet),
  );
  const missed = mustHavesMet.filter((met) => !met).length;
  const analystRecommendation: AnalystRecommendation =
    missed === 0 ? "contact" : missed === 1 ? "watch" : "skip";
  return { fitScore, analystRecommendation };
}

function toCandidate(
  company: ExtractedCompany,
  results: SearchResult[],
  criteria: AcquisitionCriteria,
): Candidate | null {
  const evidence: Evidence[] = company.evidence.flatMap((item) => {
    const result = results[item.resultIndex];
    if (!result) return [];
    return [
      {
        kind: item.kind,
        text: item.text,
        sourceUrl: result.url,
        sourceLabel: result.title || new URL(result.url).hostname,
      },
    ];
  });
  if (evidence.length === 0) return null;

  // Pad or trim so a sloppy reply cannot inflate the score.
  const fit = (flags: boolean[], length: number) =>
    Array.from({ length }, (_, index) => flags[index] === true);
  const score = scoreCandidate(
    fit(company.mustHavesMet, criteria.mustHaves.length),
    fit(company.niceToHavesMet, criteria.niceToHaves.length),
  );

  const estRevenueRangeM =
    company.employees && company.employees > 0
      ? {
          lowM: Math.round(company.employees * REVENUE_PER_EMPLOYEE_M.low),
          highM: Math.round(company.employees * REVENUE_PER_EMPLOYEE_M.high),
        }
      : { lowM: criteria.revenueMinM, highM: criteria.revenueMaxM };

  return {
    id: slug(company.name),
    name: company.name,
    location: company.location,
    estRevenueRangeM,
    revenueIsEstimate: true,
    ...score,
    snapshot: company.snapshot,
    evidence,
  };
}

async function liveSourcing(
  criteria: AcquisitionCriteria,
): Promise<SourcingResult> {
  const { queries } = await chatJSON(
    "Write 3 to 5 web search queries that would find privately held companies matching these acquisition criteria. Each query should combine the industry, a region and one distinguishing condition.",
    JSON.stringify({
      industry: criteria.industry,
      regions: criteria.regions,
      ownership: criteria.ownership,
      mustHaves: criteria.mustHaves,
      niceToHaves: criteria.niceToHaves,
    }),
    QueriesSchema,
    { maxTokens: 400 },
  );

  const settled = await Promise.allSettled(queries.map(webSearch));
  const seen = new Set<string>();
  const results = settled
    .flatMap((outcome) => (outcome.status === "fulfilled" ? outcome.value : []))
    .filter((result) => !seen.has(result.url) && seen.add(result.url));
  if (results.length === 0) throw new Error("Web search returned no results");

  const { companies } = await chatJSON(
    `You identify acquisition candidates from web search results.
Rules:
- Use only companies and facts that appear in the search results below. Never add a company or fact from memory.
- Every evidence item must cite the resultIndex it came from. FIT = supports a criterion; RISK = a concern.
- mustHavesMet and niceToHavesMet have one true/false per criterion, in the order given. Mark true only when a cited search result supports it.
- employees: the headcount if a result states it, otherwise null. Do not estimate revenue.
- Skip directories, news sites and companies that are clearly not operating businesses in the industry.`,
    JSON.stringify({
      mustHaves: criteria.mustHaves,
      niceToHaves: criteria.niceToHaves,
      searchResults: results.map((result, index) => ({ index, ...result })),
    }),
    ExtractedSchema,
    { maxTokens: 4000 },
  );

  const all = companies
    .map((company) => toCandidate(company, results, criteria))
    .filter((candidate): candidate is Candidate => candidate !== null);
  if (all.length === 0) throw new Error("No sourced candidates were extracted");

  const candidates = all
    .sort((a, b) => b.fitScore - a.fitScore)
    .slice(0, SHORTLIST_SIZE);
  return {
    candidates,
    funnel: {
      searchResults: results.length,
      companiesIdentified: all.length,
      passedMustHaves: all.filter(
        (candidate) => candidate.analystRecommendation === "contact",
      ).length,
      shortlisted: candidates.length,
    },
    queries,
    source: "live",
  };
}

/** Never throws: falls back to the fixture on any failure. */
export async function findCandidates(
  criteria: AcquisitionCriteria,
): Promise<SourcingResult & { fallbackReason?: string }> {
  if (sourcingMode() === "fixture") {
    return {
      ...sampleSourcing,
      fallbackReason: "Live search is not configured",
    };
  }
  try {
    return await liveSourcing(criteria);
  } catch (error) {
    console.warn("Sourcing fell back to the fixture:", error);
    return {
      ...sampleSourcing,
      fallbackReason: error instanceof Error ? error.message : String(error),
    };
  }
}
