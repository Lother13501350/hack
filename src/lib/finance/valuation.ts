/**
 * Equity value <-> enterprise value (issue #10). Pure functions, $M in and out.
 * Results are not rounded, so they can feed further arithmetic; round for display.
 *
 *   Equity value       = diluted shares x price per share
 *   Enterprise value   = equity value - cash and investments + debt
 *   Per-share value    = (enterprise value + cash and investments - debt) / shares
 */
export function equityValueM(shares: number, pricePerShare: number): number {
  return (shares * pricePerShare) / 1_000_000;
}

export function enterpriseValueM(
  equityM: number,
  cashAndInvestmentsM: number,
  debtM: number,
): number {
  return equityM - cashAndInvestmentsM + debtM;
}

/** Price per share implied by an enterprise value, once net cash is added back. */
export function perShareFromEnterpriseValue(
  enterpriseM: number,
  cashAndInvestmentsM: number,
  debtM: number,
  shares: number,
): number {
  return ((enterpriseM + cashAndInvestmentsM - debtM) * 1_000_000) / shares;
}

/** EV / metric, rounded to one decimal place as multiples are quoted. */
export function impliedMultiple(enterpriseM: number, metricM: number): number {
  if (metricM <= 0) return Number.POSITIVE_INFINITY;
  return Math.round((enterpriseM / metricM) * 10) / 10;
}

/** (price / reference) - 1, as a fraction. */
export function premium(price: number, reference: number): number {
  return Math.round((price / reference - 1) * 10_000) / 10_000;
}
