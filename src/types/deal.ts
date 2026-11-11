/**
 * Shared DealBrief types (issue #1).
 *
 * Each shape is a zod schema plus its inferred TypeScript type, so the same
 * definition validates API request bodies and LLM output.
 *
 * Conventions:
 * - Money is a `number` in millions of US dollars and the field name ends in `M`.
 * - Ratios are fractions (0.3785, not 37.85).
 * - `Adjustment.amountM` is always positive; `type` decides the sign.
 */
import { z } from "zod";

export const SAMPLE_DATA_LABEL = "Sample data (fictional)";

// ---------------------------------------------------------------------------
// Acquisition criteria (screen A)
// ---------------------------------------------------------------------------

export const AcquisitionReasonSchema = z.enum([
  "competitor",
  "technology",
  "new_market",
  "supply_chain",
  "buy_and_build",
]);
export type AcquisitionReason = z.infer<typeof AcquisitionReasonSchema>;

export const CriteriaStatusSchema = z.enum(["draft", "waiting", "approved"]);
export type CriteriaStatus = z.infer<typeof CriteriaStatusSchema>;

export const FinancialLimitsSchema = z.object({
  minCashM: z.number().nonnegative(),
  maxDebtToEbitda: z.number().positive(),
  existingDebtM: z.number().nonnegative(),
});
export type FinancialLimits = z.infer<typeof FinancialLimitsSchema>;

export const CeoAnswerSchema = z.object({
  question: z.string(),
  answer: z.string(),
});
export type CeoAnswer = z.infer<typeof CeoAnswerSchema>;

export const AcquisitionCriteriaSchema = z.object({
  reason: AcquisitionReasonSchema,
  industry: z.string(),
  regions: z.array(z.string()),
  revenueMinM: z.number().nonnegative(),
  revenueMaxM: z.number().nonnegative(),
  ownership: z.string(),
  mustHaves: z.array(z.string()),
  niceToHaves: z.array(z.string()),
  financialLimits: FinancialLimitsSchema,
  ceoAnswers: z.array(CeoAnswerSchema),
  status: CriteriaStatusSchema,
});
export type AcquisitionCriteria = z.infer<typeof AcquisitionCriteriaSchema>;

// ---------------------------------------------------------------------------
// Sourcing (screen B)
// ---------------------------------------------------------------------------

export const EvidenceSchema = z.object({
  kind: z.enum(["FIT", "RISK"]),
  text: z.string(),
  sourceUrl: z.string().url(),
  sourceLabel: z.string(),
});
export type Evidence = z.infer<typeof EvidenceSchema>;

export const AnalystRecommendationSchema = z.enum(["contact", "watch", "skip"]);
export type AnalystRecommendation = z.infer<typeof AnalystRecommendationSchema>;

export const CandidateSchema = z.object({
  id: z.string(),
  name: z.string(),
  location: z.string(),
  estRevenueRangeM: z.object({ lowM: z.number(), highM: z.number() }),
  revenueIsEstimate: z.literal(true),
  fitScore: z.number().min(0).max(100),
  analystRecommendation: AnalystRecommendationSchema,
  /** Public contact found during sourcing. Demo fixtures use fictional addresses. */
  contact: z
    .object({ name: z.string(), role: z.string(), email: z.string() })
    .optional(),
  snapshot: z.object({
    what: z.string(),
    ownership: z.string(),
    whyFits: z.string(),
    watchOut: z.string(),
  }),
  evidence: z.array(EvidenceSchema),
});
export type Candidate = z.infer<typeof CandidateSchema>;

export const SourcingFunnelSchema = z.object({
  searchResults: z.number(),
  companiesIdentified: z.number(),
  passedMustHaves: z.number(),
  shortlisted: z.number(),
});
export type SourcingFunnel = z.infer<typeof SourcingFunnelSchema>;

export const SourcingResultSchema = z.object({
  candidates: z.array(CandidateSchema),
  funnel: SourcingFunnelSchema,
  queries: z.array(z.string()),
  source: z.enum(["live", "fixture"]),
});
export type SourcingResult = z.infer<typeof SourcingResultSchema>;

// ---------------------------------------------------------------------------
// Outreach (screen C)
// ---------------------------------------------------------------------------

export const OutreachStatusSchema = z.enum([
  "draft",
  "approved",
  "sent",
  "skipped",
]);
export type OutreachStatus = z.infer<typeof OutreachStatusSchema>;

export const OutreachFactSchema = z.object({
  text: z.string(),
  sourceUrl: z.string().url(),
});
export type OutreachFact = z.infer<typeof OutreachFactSchema>;

export const OutreachDraftSchema = z.object({
  candidateId: z.string(),
  to: z.string(),
  subject: z.string(),
  body: z.string(),
  factsUsed: z.array(OutreachFactSchema),
  status: OutreachStatusSchema,
});
export type OutreachDraft = z.infer<typeof OutreachDraftSchema>;

// ---------------------------------------------------------------------------
// Financial inputs
// ---------------------------------------------------------------------------

/** One fiscal year of a target company's statements, in $M. */
export const FinancialsSchema = z.object({
  fiscalYear: z.number().int(),
  revenueM: z.number().positive(),
  grossProfitM: z.number(),
  ebitdaReportedM: z.number(),
  accountsReceivableM: z.number().nonnegative(),
  topCustomerRevenueM: z.number().nonnegative(),
  cashM: z.number(),
  debtM: z.number().nonnegative(),
});
export type Financials = z.infer<typeof FinancialsSchema>;

export const AdjustmentTypeSchema = z.enum([
  /** Revenue that will not repeat: subtract from EBITDA. */
  "remove_revenue",
  /** A cost the buyer will carry that the seller did not: subtract. */
  "add_cost",
  /** A one-time expense that will not repeat: add back. */
  "add_back",
]);
export type AdjustmentType = z.infer<typeof AdjustmentTypeSchema>;

export const AdjustmentCategorySchema = z.enum([
  "one_time_revenue",
  "owner_compensation",
  "related_party_rent",
  "one_time_expense",
  "other",
]);
export type AdjustmentCategory = z.infer<typeof AdjustmentCategorySchema>;

export const AdjustmentSchema = z.object({
  id: z.string(),
  label: z.string(),
  /** Always positive. `type` decides whether it is added or subtracted. */
  amountM: z.number().nonnegative(),
  type: AdjustmentTypeSchema,
  category: AdjustmentCategorySchema,
  /** File and cell or page the number came from. */
  source: z.string(),
  note: z.string().optional(),
});
export type Adjustment = z.infer<typeof AdjustmentSchema>;

export const TargetCompanySchema = z.object({
  name: z.string(),
  location: z.string(),
  askingPriceM: z.number().positive(),
  sourceFile: z.string(),
  /** Sheet and cell (or page) per Financials field, e.g. { revenueM: "IS!F7" }. */
  fieldSources: z.record(z.string(), z.string()).optional(),
  /** At least two fiscal years, any order. */
  financials: z.array(FinancialsSchema).min(2),
  adjustments: z.array(AdjustmentSchema),
});
export type TargetCompany = z.infer<typeof TargetCompanySchema>;

export const BuyerFinancialsSchema = z.object({
  name: z.string(),
  ebitdaM: z.number(),
  cashM: z.number(),
  existingDebtM: z.number().nonnegative(),
  minCashM: z.number().nonnegative(),
  maxDebtToEbitda: z.number().positive(),
});
export type BuyerFinancials = z.infer<typeof BuyerFinancialsSchema>;

export const SynergiesSchema = z.object({
  /** Yearly cost savings. */
  costM: z.number().nonnegative(),
  /** Yearly extra profit from cross-selling. */
  revenueM: z.number().nonnegative(),
  /** One-time cost of combining the companies. */
  integrationCostM: z.number().nonnegative(),
});
export type Synergies = z.infer<typeof SynergiesSchema>;

// ---------------------------------------------------------------------------
// Deal review output (screens 1-4)
// ---------------------------------------------------------------------------

export const TextSourceSchema = z.enum(["llm", "template"]);
export type TextSource = z.infer<typeof TextSourceSchema>;

export const BridgeItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  /** Signed change to EBITDA; 0 for the opening and closing rows. */
  deltaM: z.number(),
  /** EBITDA after this row. */
  runningM: z.number(),
  kind: z.enum(["start", "adjustment", "end"]),
  source: z.string(),
});
export type BridgeItem = z.infer<typeof BridgeItemSchema>;

export const RedFlagSchema = z.object({
  id: z.string(),
  severity: z.enum(["HIGH", "MED"]),
  title: z.string(),
  /** Headline number, already formatted, e.g. "38% of revenue". */
  metric: z.string(),
  /** The arithmetic, spelled out with the real inputs. */
  formula: z.string(),
  source: z.string(),
  /** Plain-language "why an expert cares". Filled by the LLM or a template. */
  coach: z.string(),
  stage: z.enum(["cim", "data_room"]),
});
export type RedFlag = z.infer<typeof RedFlagSchema>;

export const WalkAwaySchema = z.object({
  standaloneM: z.number(),
  synergyM: z.number(),
  integrationCostM: z.number(),
  walkAwayM: z.number(),
  realization: z.number().min(0).max(1),
});
export type WalkAway = z.infer<typeof WalkAwaySchema>;

export const SensitivityPointSchema = z.object({
  realization: z.number(),
  walkAwayM: z.number(),
});
export type SensitivityPoint = z.infer<typeof SensitivityPointSchema>;

export const FinancingSchema = z.object({
  debtCapacityM: z.number(),
  cashAvailableM: z.number(),
  maxFundableM: z.number(),
});
export type Financing = z.infer<typeof FinancingSchema>;

export const DealMetricsSchema = z.object({
  fromYear: z.number(),
  toYear: z.number(),
  customerConcentration: z.number(),
  dsoStartDays: z.number(),
  dsoEndDays: z.number(),
  grossMarginStart: z.number(),
  grossMarginEnd: z.number(),
  revenueCagr: z.number(),
});
export type DealMetrics = z.infer<typeof DealMetricsSchema>;

export const DealReviewSchema = z.object({
  targetName: z.string(),
  askingPriceM: z.number(),
  reportedEbitdaM: z.number(),
  normalizedEbitdaM: z.number(),
  bridge: z.array(BridgeItemSchema),
  metrics: DealMetricsSchema,
  redFlags: z.array(RedFlagSchema),
  multiple: z.number(),
  /** The multiple is a stand-in until real comparable sales are entered. */
  multipleIsPlaceholder: z.literal(true),
  walkAway: WalkAwaySchema,
  /** Walk-away with no synergies counted: where to open the bidding. */
  openingBidM: z.number(),
  sensitivity: z.array(SensitivityPointSchema),
  financing: FinancingSchema,
  overpayIfReportedM: z.number(),
  /** Asking price minus walk-away at the chosen realization (negative = inside). */
  askVsWalkAwayM: z.number(),
  coachSource: TextSourceSchema,
});
export type DealReview = z.infer<typeof DealReviewSchema>;

// ---------------------------------------------------------------------------
// Decision memo (screen 4)
// ---------------------------------------------------------------------------

export const RecommendationSchema = z.enum([
  "Proceed",
  "Proceed with conditions",
  "Walk away",
]);
export type Recommendation = z.infer<typeof RecommendationSchema>;

export const SellerQuestionSchema = z.object({
  question: z.string(),
  redFlagId: z.string(),
});
export type SellerQuestion = z.infer<typeof SellerQuestionSchema>;

export const DealMemoSchema = z.object({
  /** Decided by rule in code, never by the LLM. */
  recommendation: RecommendationSchema,
  /** Built in code from DealReview numbers, e.g. "Do not exceed $13.4M (base case)". */
  priceGuidance: z.string(),
  askGap: z.string(),
  reasons: z.array(z.string()),
  risks: z.array(z.string()),
  conditionsBeforeLoi: z.array(z.string()),
  sellerQuestions: z.array(SellerQuestionSchema),
  source: TextSourceSchema,
});
export type DealMemo = z.infer<typeof DealMemoSchema>;

// ---------------------------------------------------------------------------
// Statement extraction (issue #9)
// ---------------------------------------------------------------------------

export const ExtractedFieldSchema = z.object({
  /** Dotted path into TargetCompany, e.g. "financials.FY25.revenueM". */
  key: z.string(),
  label: z.string(),
  value: z.number(),
  /** Page or cell reference, e.g. "IS!C7" or "p. 14". */
  sourceRef: z.string(),
  confidence: z.number().min(0).max(1),
  confirmed: z.boolean(),
});
export type ExtractedField = z.infer<typeof ExtractedFieldSchema>;

export const ExtractionResultSchema = z.object({
  fileName: z.string(),
  status: z.literal("parsed"),
  source: z.enum(["llm", "xlsx", "fixture"]),
  fields: z.array(ExtractedFieldSchema),
  /** The same numbers assembled into the shape /api/deal/review accepts. */
  target: TargetCompanySchema,
});
export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;
