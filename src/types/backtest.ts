/**
 * Real-deal backtest (issue #10).
 *
 * The fixture stores figures exactly as filed: thousands of US dollars, each
 * with the filing and section it came from. Code converts to $M and derives
 * everything else, so no number is hand-calculated.
 */
import { z } from "zod";

/** A filed figure in thousands of dollars, with where it came from. */
export const SourcedKSchema = z.object({
  valueK: z.number(),
  source: z.string(),
});
export type SourcedK = z.infer<typeof SourcedKSchema>;

/** One fiscal year from the 10-K. */
export const FiledYearSchema = z.object({
  fiscalYear: z.number().int(),
  revenue: SourcedKSchema,
  grossProfit: SourcedKSchema,
  operatingIncome: SourcedKSchema,
  depreciation: SourcedKSchema,
  /** Cash and cash equivalents (may include treasury bills). */
  cash: SourcedKSchema,
  /** Investments held outside cash, e.g. equity securities. */
  investments: SourcedKSchema,
  receivables: SourcedKSchema,
  totalLiabilities: SourcedKSchema,
  /** Interest-bearing borrowings. Zero when the company has none. */
  borrowings: SourcedKSchema,
});
export type FiledYear = z.infer<typeof FiledYearSchema>;

/** One row of management's projections from the merger proxy. */
export const ProjectionRowSchema = z.object({
  fiscalYear: z.number().int(),
  estimate: z.boolean(),
  revenueK: z.number(),
  operatingIncomeK: z.number(),
  ebitdaK: z.number(),
  /** Public company costs added back; null for forecast years. */
  proFormaAdjustmentK: z.number().nullable(),
  proFormaEbitdaK: z.number(),
});
export type ProjectionRow = z.infer<typeof ProjectionRowSchema>;

export const ValuationMethodSchema = z.object({
  method: z.string(),
  /** TEV / EBITDA range the advisor applied, as text ("11.9x–19.1x"). */
  multiples: z.string().nullable(),
  perShareLow: z.number(),
  perShareHigh: z.number(),
});
export type ValuationMethod = z.infer<typeof ValuationMethodSchema>;

export const BacktestFixtureSchema = z.object({
  target: z.object({
    name: z.string(),
    ticker: z.string(),
    location: z.string(),
    founded: z.number().int(),
    business: z.string(),
    employees: z.number().int(),
  }),
  buyer: z.object({
    name: z.string(),
    description: z.string(),
  }),
  deal: z.object({
    announced: z.string(),
    signed: z.string(),
    pricePerShare: z.number(),
    priceSource: z.string(),
    sharesOutstanding: z.number().int(),
    sharesSource: z.string(),
    /** Basic shares only: options and RSUs are not included. */
    sharesAreBasic: z.boolean(),
    unaffectedClose: z.number(),
    unaffectedCloseDate: z.string(),
    unaffectedCloseSource: z.string(),
    /** Interim covenant: unrestricted cash the target must hold before closing. */
    minimumCashCovenantK: z.number(),
    minimumCashCovenantSource: z.string(),
  }),
  /** Options and RSUs outstanding, for a treasury-stock-method diluted share count. */
  dilution: z.object({
    options: z.number().int(),
    optionExercisePrice: z.number(),
    rsus: z.number().int(),
    asOf: z.string(),
    source: z.string(),
  }),
  filed: z.array(FiledYearSchema).min(2),
  /** Costs that stop after going private, added back to EBITDA. */
  publicCompanyCosts: z.object({
    fiscalYear: z.number().int(),
    valueK: z.number(),
    source: z.string(),
  }),
  projections: z.object({
    source: z.string(),
    rows: z.array(ProjectionRowSchema),
  }),
  advisor: z.object({
    name: z.string(),
    opinionDate: z.string(),
    source: z.string(),
    methods: z.array(ValuationMethodSchema),
    medianPerShare: z.number(),
    fixedOpinionFee: z.number(),
  }),
  disclosures: z.object({
    customers: z.string(),
    customersSource: z.string(),
    internationalShare: z.number(),
    unquantifiedItems: z.array(z.string()),
  }),
  timeline: z.array(z.object({ date: z.string(), text: z.string() })),
  timelineSource: z.string(),
  sources: z.array(z.object({ label: z.string(), url: z.string().url() })),
  /** Figures a second person has checked against the filing. */
  verifiedBy: z.array(z.string()),
});
export type BacktestFixture = z.infer<typeof BacktestFixtureSchema>;
