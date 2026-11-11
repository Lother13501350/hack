/**
 * Statement extraction (issue #9), fixture path.
 *
 * Flow: extract -> analyst confirms each number -> finance engine.
 * `targetFromExtraction` is the gate: it refuses unconfirmed numbers.
 */
import { sampleTarget } from "@/data";
import { ApiError } from "@/lib/api";
import {
  type ExtractedField,
  type ExtractionResult,
  type Financials,
  type TargetCompany,
  TargetCompanySchema,
} from "@/types/deal";

const FINANCIAL_FIELDS: [keyof Omit<Financials, "fiscalYear">, string][] = [
  ["revenueM", "Revenue"],
  ["grossProfitM", "Gross profit"],
  ["ebitdaReportedM", "Reported EBITDA"],
  ["accountsReceivableM", "Accounts receivable"],
  ["topCustomerRevenueM", "Largest customer revenue"],
  ["cashM", "Cash"],
  ["debtM", "Debt"],
];

/** Column letter the sample workbook uses for each fiscal year. */
function columnFor(
  cell: string,
  fiscalYear: number,
  latestYear: number,
): string {
  const offset = latestYear - fiscalYear;
  return cell.replace(/([A-Z])(\d+)$/, (_, column: string, row: string) => {
    const shifted = String.fromCharCode(column.charCodeAt(0) - offset);
    return `${shifted}${row}`;
  });
}

function fieldsFor(target: TargetCompany): ExtractedField[] {
  const latestYear = Math.max(...target.financials.map((y) => y.fiscalYear));
  const fields: ExtractedField[] = [
    {
      key: "askingPriceM",
      label: "Asking price",
      value: target.askingPriceM,
      sourceRef: "Entered by the analyst",
      confidence: 1,
      confirmed: false,
    },
  ];
  for (const year of target.financials) {
    for (const [field, label] of FINANCIAL_FIELDS) {
      const cell = target.fieldSources?.[field];
      fields.push({
        key: `financials.${year.fiscalYear}.${field}`,
        label: `${label}, FY${String(year.fiscalYear).slice(-2)}`,
        value: year[field],
        sourceRef: cell
          ? columnFor(cell, year.fiscalYear, latestYear)
          : target.sourceFile,
        confidence: 0.97,
        confirmed: false,
      });
    }
  }
  for (const adjustment of target.adjustments) {
    fields.push({
      key: `adjustments.${adjustment.id}.amountM`,
      label: adjustment.label,
      value: adjustment.amountM,
      sourceRef:
        adjustment.source.split("›").pop()?.trim() ?? adjustment.source,
      // Adjustments involve judgment, so they are flagged for a closer look.
      confidence: 0.82,
      confirmed: false,
    });
  }
  return fields;
}

/** Demo fallback: returns the sample deal as if the uploaded file had been parsed. */
export function fixtureExtraction(fileName?: string): ExtractionResult {
  return {
    fileName: fileName || sampleTarget.sourceFile,
    status: "parsed",
    source: "fixture",
    fields: fieldsFor(sampleTarget),
    target: sampleTarget,
  };
}

/**
 * Applies analyst-confirmed values onto the target.
 * Throws 409 if any number has not been confirmed.
 */
export function targetFromExtraction(
  extraction: ExtractionResult,
): TargetCompany {
  const pending = extraction.fields.filter((field) => !field.confirmed);
  if (pending.length > 0) {
    throw new ApiError(
      409,
      `${pending.length} extracted numbers are not confirmed yet: ${pending
        .slice(0, 5)
        .map((field) => field.label)
        .join("; ")}`,
    );
  }

  const target: TargetCompany = structuredClone(extraction.target);
  for (const field of extraction.fields) {
    const [section, id, name] = field.key.split(".");
    if (field.key === "askingPriceM") {
      target.askingPriceM = field.value;
    } else if (section === "financials") {
      const year = target.financials.find((y) => String(y.fiscalYear) === id);
      if (year && name in year && name !== "fiscalYear") {
        year[name as keyof Omit<Financials, "fiscalYear">] = field.value;
      }
    } else if (section === "adjustments") {
      const adjustment = target.adjustments.find((a) => a.id === id);
      if (adjustment) adjustment.amountM = field.value;
    }
  }
  return TargetCompanySchema.parse(target);
}
