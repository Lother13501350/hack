import type { Metadata } from "next";
import { BacktestView } from "@/components/dealbrief/backtest-view";
import { AppHeader, Page } from "@/components/dealbrief/chrome";
import { runBacktest } from "@/lib/backtest";

export const metadata: Metadata = {
  title: "Backtest · DealBrief",
  description:
    "The DealBrief engine run on a real acquisition: Electro-Sensors, bought by steute Technologies in 2026.",
};

export default function BacktestPage() {
  const backtest = runBacktest();
  return (
    <div className="bg-db-bg text-db-ink min-h-screen">
      <AppHeader
        section="Backtest"
        title={`${backtest.fixture.target.name.split(",")[0]} × ${backtest.fixture.buyer.name}`}
        dataLabel="Real deal · SEC filings"
        link={{ href: "/", label: "Demo" }}
      />
      <Page>
        <BacktestView backtest={backtest} />
      </Page>
    </div>
  );
}
