/** Real-deal backtest page (issue #10). Server component: everything is static. */
import type { Backtest } from "@/lib/backtest";
import { formatM1, formatPct } from "@/lib/finance/format";
import { cn } from "@/lib/utils";
import {
  Card,
  Coach,
  Columns,
  Dot,
  Label,
  PageTitle,
  Row,
  Stats,
  tableHeadClass,
} from "./chrome";

const usd = (value: number) => `$${value.toFixed(2)}`;
const thousands = (valueM: number) =>
  `$${Math.round(valueM * 1000).toLocaleString("en-US")}K`;

function FootballField({ backtest }: { backtest: Backtest }) {
  const { deal, advisor } = backtest.fixture;
  const { dealBrief } = backtest;
  const max = Math.ceil(Math.max(deal.pricePerShare, backtest.advisorHigh) + 1);
  const at = (value: number) => `${(value / max) * 100}%`;
  const rows = [
    {
      label: `DealBrief standalone, ${dealBrief.multiples.low.toFixed(1)}x–${dealBrief.multiples.high.toFixed(1)}x`,
      low: dealBrief.perShareLow,
      high: dealBrief.perShareHigh,
      ours: true,
    },
    ...advisor.methods.map((method) => ({
      label: method.method,
      low: method.perShareLow,
      high: method.perShareHigh,
      ours: false,
    })),
  ];
  const ticks = Array.from({ length: max + 1 }, (_, value) => value).filter(
    (value) => value % 2 === 0 || max <= 8,
  );
  const markers = [
    {
      label: `Close before announcement ${usd(deal.unaffectedClose)}`,
      value: deal.unaffectedClose,
      className: "border-db-muted border-dashed",
    },
    {
      label: `Price paid ${usd(deal.pricePerShare)}`,
      value: deal.pricePerShare,
      className: "border-db-ink",
    },
  ];

  return (
    <figure>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 right-[104px] left-[220px] hidden sm:block">
          {markers.map((marker) => (
            <div
              key={marker.label}
              aria-hidden="true"
              className={cn(
                "absolute inset-y-0 border-l-[1.5px]",
                marker.className,
              )}
              style={{ left: at(marker.value) }}
            />
          ))}
        </div>
        <ul>
          {rows.map((row) => (
            <li
              key={row.label}
              className="grid grid-cols-[minmax(0,1fr)_96px] items-center gap-x-0 gap-y-1 py-1.5 text-[13px] sm:grid-cols-[220px_minmax(0,1fr)_104px]"
            >
              <span
                className={cn(
                  "col-span-2 truncate pr-3 sm:col-span-1",
                  row.ours ? "font-medium" : "text-db-muted",
                )}
                title={row.label}
              >
                {row.label}
              </span>
              <span className="bg-db-subtle relative h-2.5 rounded-full">
                <span
                  className={cn(
                    "absolute inset-y-0 rounded-full",
                    row.ours ? "bg-db-accent" : "bg-db-ink/25",
                  )}
                  style={{
                    left: at(row.low),
                    width: `max(4px, ${((row.high - row.low) / max) * 100}%)`,
                  }}
                />
              </span>
              <span className="text-right whitespace-nowrap tabular-nums">
                {usd(row.low)}–{row.high.toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
        <div className="text-db-muted relative mt-1 mr-[96px] h-4 text-[11px] tabular-nums sm:mr-[104px] sm:ml-[220px]">
          {ticks.map((value) => (
            <span
              key={value}
              className="absolute -translate-x-1/2"
              style={{ left: at(value) }}
            >
              ${value}
            </span>
          ))}
        </div>
      </div>
      <figcaption className="text-db-muted mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs">
        {markers.map((marker) => (
          <span key={marker.label} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={cn("h-3 border-l-[1.5px]", marker.className)}
            />
            {marker.label}
          </span>
        ))}
        <span>Per share. Advisor ranges from {advisor.name}.</span>
      </figcaption>
    </figure>
  );
}

export function BacktestView({ backtest }: { backtest: Backtest }) {
  const { fixture, dealBrief, metrics, premiums } = backtest;
  const { deal, target, buyer, advisor, disclosures } = fixture;
  const latest = fixture.filed.find(
    (year) => year.fiscalYear === backtest.latestYear,
  );
  const gap = backtest.projectionVsActual;
  const announced = new Date(`${deal.announced}T00:00:00Z`).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" },
  );
  const checks = [
    {
      label: "Customer concentration",
      value: "No customer ≥ 10% of sales",
      flagged: false,
    },
    {
      label: "Days to collect",
      value: `${Math.round(metrics.dsoStartDays)} → ${Math.round(metrics.dsoEndDays)} days`,
      flagged: false,
    },
    {
      label: "Gross margin",
      value: `${formatPct(metrics.grossMarginStart, 1)} → ${formatPct(metrics.grossMarginEnd, 1)}`,
      flagged: false,
    },
    ...(gap
      ? [
          {
            label: `${gap.fiscalYear} operating income`,
            value: `${thousands(gap.projectedOperatingIncomeM)} projected, ${thousands(gap.actualOperatingIncomeM)} reported`,
            flagged: true,
          },
        ]
      : []),
  ];

  return (
    <>
      <PageTitle
        title={`${target.name} backtest`}
        subtitle={`Acquired by ${buyer.name} for ${usd(deal.pricePerShare)} per share, announced ${announced}. Inputs are copied from SEC filings; every figure on this page is computed.`}
      />
      <Stats
        items={[
          { label: "Price paid", value: `${usd(deal.pricePerShare)} / share` },
          {
            label: "Equity value",
            value: formatM1(backtest.equityValueM),
          },
          {
            label: "Net cash",
            value: formatM1(backtest.cashAndInvestmentsM - backtest.debtM),
            note: (
              <span className="text-db-muted">
                {usd(backtest.netCashPerShare)} / share
              </span>
            ),
          },
          {
            label: "Enterprise value",
            value: formatM1(backtest.enterpriseValueM),
          },
        ]}
      />

      <Columns
        rail={
          <>
            <Card title="What DealBrief finds">
              <p className="-mt-2 text-sm font-semibold">
                {backtest.redFlags.length === 0
                  ? "No red flags"
                  : `${backtest.redFlags.length} red flags`}
              </p>
              <ul className="border-db-line mt-3 border-t pt-1">
                {checks.map((check) => (
                  <li
                    key={check.label}
                    className="flex items-start gap-2.5 py-1.5 text-[13px]"
                  >
                    <span className="mt-1.5">
                      <Dot high={check.flagged} />
                    </span>
                    <span className="min-w-0">
                      <span className="text-db-muted">{check.label}</span>
                      <br />
                      {check.value}
                    </span>
                  </li>
                ))}
              </ul>
              {gap && (
                <p className="text-db-muted mt-2 text-xs leading-relaxed">
                  The proxy&apos;s pre-signing estimate and the later 10-K
                  differ. They are shown side by side and never mixed.
                </p>
              )}
            </Card>

            <Card title="Earnings bridge">
              <div className="-mt-2">
                <Row
                  label="Operating income (10-K)"
                  value={thousands(
                    (latest?.operatingIncome.valueK ?? 0) / 1000,
                  )}
                />
                <Row
                  label="+ Depreciation (10-K)"
                  value={thousands((latest?.depreciation.valueK ?? 0) / 1000)}
                />
                <Row
                  strong
                  label="Reported EBITDA"
                  value={thousands(backtest.reportedEbitdaM)}
                />
                <Row
                  label="+ Public company costs (proxy)"
                  value={thousands(fixture.publicCompanyCosts.valueK / 1000)}
                />
                <div className="border-db-line mt-1 border-t pt-1">
                  <Row
                    strong
                    label="Normalized EBITDA"
                    value={thousands(backtest.normalizedEbitdaM)}
                  />
                </div>
              </div>
            </Card>

            <Card title="Assumptions">
              <ul className="text-db-muted -mt-2 list-disc space-y-1.5 pl-4 text-[13px] leading-relaxed">
                <li>
                  The buyer is private, so the financing check does not apply.
                </li>
                <li>Synergies are zero: the company is valued on its own.</li>
                <li>
                  {dealBrief.multiples.low.toFixed(1)}x–
                  {dealBrief.multiples.high.toFixed(1)}x are placeholder
                  multiples around DealBrief&apos;s{" "}
                  {dealBrief.multiples.base.toFixed(1)}x default.
                </li>
                <li>
                  Equity value uses{" "}
                  {deal.sharesOutstanding.toLocaleString("en-US")} basic shares.
                  With {fixture.dilution.asOf.slice(0, 4)} options and RSUs it
                  would be about {formatM1(backtest.dilutedEquityValueM)}.
                </li>
                <li>
                  Public company costs from the proxy are applied to the
                  10-K&apos;s EBITDA.
                </li>
              </ul>
            </Card>
          </>
        }
      >
        <Card
          title="Price per share"
          description={`At ${dealBrief.multiples.base.toFixed(1)}x normalized EBITDA, DealBrief values ${target.name.split(",")[0]} at ${usd(dealBrief.perShareBase)} on its own. The buyer paid ${formatPct(premiums.vsDealBriefBase)} more, and more than every method the board's advisor used.`}
        >
          <FootballField backtest={backtest} />
        </Card>

        <Card
          title="The EBITDA basis decides the multiple"
          description={`The same ${formatM1(backtest.enterpriseValueM)} enterprise value, divided by four different earnings figures.`}
        >
          <div className="-mt-1 overflow-x-auto">
            <table className="w-full min-w-[480px] text-[13px]">
              <thead>
                <tr className={tableHeadClass}>
                  <th className="py-2 font-medium">EBITDA basis</th>
                  <th className="py-2 text-right font-medium">EBITDA</th>
                  <th className="py-2 text-right font-medium">EV / EBITDA</th>
                </tr>
              </thead>
              <tbody>
                {backtest.multiples.map((basis) => (
                  <tr
                    key={basis.label}
                    className="border-db-line border-b last:border-0"
                  >
                    <td className="py-2.5 pr-3">
                      {basis.label}
                      <span className="text-db-muted block text-xs">
                        {basis.source}
                      </span>
                    </td>
                    <td className="py-2.5 text-right tabular-nums">
                      {thousands(basis.ebitdaM)}
                    </td>
                    <td className="py-2.5 text-right font-medium tabular-nums">
                      {basis.multiple.toFixed(1)}x
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Coach title="Why an expert cares" className="mt-4">
            {usd(backtest.netCashPerShare)} of the {usd(deal.pricePerShare)}{" "}
            price is cash already in the bank, so the business itself sold for{" "}
            {usd(backtest.operatingValuePerShare)} a share. Whether that is{" "}
            {backtest.multiples[0]?.multiple.toFixed(0)}x or{" "}
            {backtest.multiples[
              backtest.multiples.length - 1
            ]?.multiple.toFixed(0)}
            x earnings depends entirely on which costs you agree will go away.
          </Coach>
        </Card>

        <Card title="How the deal came together">
          <ol className="-mt-1">
            {fixture.timeline.map((event) => (
              <li
                key={event.date}
                className="border-db-line grid grid-cols-[120px_minmax(0,1fr)] gap-4 border-b py-2.5 text-[13px] last:border-0"
              >
                <span className="text-db-muted tabular-nums">{event.date}</span>
                <span>{event.text}</span>
              </li>
            ))}
          </ol>
          <p className="text-db-muted mt-2 text-xs">
            {fixture.timelineSource}. Customers: {disclosures.customers}
          </p>
        </Card>

        <div className="text-db-muted text-xs leading-relaxed">
          <Label>Sources</Label>
          <ul className="mt-1.5 space-y-1">
            {fixture.sources.map((source) => (
              <li key={source.url}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-db-accent hover:underline"
                >
                  {source.label}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-2">
            Each input names its section in the fixture
            (src/data/electro-sensors.json). {fixture.verifiedBy.join(" ")}
          </p>
          <p className="mt-1">
            {target.name} ({target.ticker}), {target.location}, founded{" "}
            {target.founded}: {target.business.toLowerCase()}. {buyer.name}:{" "}
            {buyer.description}. Advisor median {usd(advisor.medianPerShare)};
            price paid is {formatPct(premiums.vsAdvisorMedian)} above it and{" "}
            {formatPct(premiums.vsUnaffected)} above the last close.
          </p>
        </div>
      </Columns>
    </>
  );
}
