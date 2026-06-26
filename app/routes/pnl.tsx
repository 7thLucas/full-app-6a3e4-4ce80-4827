import { useEffect, useState } from "react";
import { redirect } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { getUserFromRequest } from "~/modules/authentication/authentication.server";
import { useAuth } from "~/modules/authentication/use-authentication";
import { AppShell, PageHeader } from "~/components/layout/app-shell";
import { useConfigurables } from "~/modules/configurables";
import { api, type PnlPropertyData } from "~/lib/api";
import { Select } from "~/components/ui/select";
import { cn } from "~/lib/utils";
import { TrendingDown, ChevronLeft, ChevronRight } from "lucide-react";

export async function loader({ request }: LoaderFunctionArgs) {
  if (!getUserFromRequest(request)) {
    return redirect("/auth/login");
  }
  return null;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const MONTH_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function PnLPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { config } = useConfigurables();
  const currencySymbol = config?.currencySymbol ?? "$";
  const showCharts = config?.showPnlCharts ?? true;

  const [year, setYear] = useState(new Date().getFullYear());
  const [pnlData, setPnlData] = useState<PnlPropertyData[]>([]);
  const [loading, setLoading] = useState(true);

  const formatCurrency = (amount: number) =>
    `${currencySymbol}${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatCurrencyCompact = (amount: number) => {
    if (amount >= 1000) {
      return `${currencySymbol}${(amount / 1000).toFixed(1)}k`;
    }
    return `${currencySymbol}${amount.toFixed(0)}`;
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    setLoading(true);
    api.expenses
      .pnl(year)
      .then((result) => {
        // result is { data: PnlPropertyData[], year: number }
        const data = (result as any).data ?? result;
        setPnlData(Array.isArray(data) ? data : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isAuthenticated, authLoading, year]);

  // Compute totals for each property
  const propertySummaries = pnlData.map((prop) => {
    const monthlyTotals = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      expenses: prop.months[i + 1]?.expenses ?? 0,
      count: prop.months[i + 1]?.count ?? 0,
    }));
    const totalExpenses = monthlyTotals.reduce((s, m) => s + m.expenses, 0);
    const maxMonth = Math.max(...monthlyTotals.map((m) => m.expenses));
    return { ...prop, monthlyTotals, totalExpenses, maxMonth };
  });

  const grandTotal = propertySummaries.reduce((s, p) => s + p.totalExpenses, 0);

  return (
    <AppShell>
      <PageHeader
        title="P&L Report"
        subtitle="Monthly expense breakdown per property"
        action={
          <Select
            className="h-8 text-sm"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        }
      />

      <div className="p-6 flex-1 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : propertySummaries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
              <TrendingDown className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground">No data for {year}</h3>
            <p className="text-muted-foreground text-sm mt-1">Log expenses to see P&L data here</p>
          </div>
        ) : (
          <>
            {/* Year summary banner */}
            <div className="bg-primary text-primary-foreground rounded-lg p-5 flex items-center justify-between">
              <div>
                <p className="text-primary-foreground/70 text-sm">Total Expenses in {year}</p>
                <p className="text-3xl font-bold font-mono tabular-nums mt-0.5">{formatCurrency(grandTotal)}</p>
              </div>
              <div className="text-right">
                <p className="text-primary-foreground/70 text-sm">Properties</p>
                <p className="text-2xl font-bold">{propertySummaries.length}</p>
              </div>
            </div>

            {/* Per-property breakdown */}
            {propertySummaries.map((prop) => (
              <div key={prop.propertyId} className="bg-card border border-border rounded-lg overflow-hidden">
                {/* Property header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
                  <div>
                    <h2 className="font-semibold text-foreground">{prop.propertyName}</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Total: <span className="font-mono font-semibold text-foreground">{formatCurrency(prop.totalExpenses)}</span>
                    </p>
                  </div>
                </div>

                {/* Monthly chart — bar visualization */}
                {showCharts && prop.maxMonth > 0 && (
                  <div className="px-5 pt-5 pb-2">
                    <div className="flex items-end gap-1.5 h-24">
                      {prop.monthlyTotals.map((m) => {
                        const heightPct = prop.maxMonth > 0 ? (m.expenses / prop.maxMonth) * 100 : 0;
                        const isCurrentMonth =
                          m.month === new Date().getMonth() + 1 && year === new Date().getFullYear();
                        return (
                          <div key={m.month} className="flex-1 flex flex-col items-center gap-1" title={`${MONTH_FULL[m.month - 1]}: ${formatCurrency(m.expenses)}`}>
                            <div className="w-full flex items-end" style={{ height: "80px" }}>
                              {m.expenses > 0 ? (
                                <div
                                  className={cn(
                                    "w-full rounded-t transition-all",
                                    isCurrentMonth ? "bg-secondary" : "bg-primary/60"
                                  )}
                                  style={{ height: `${Math.max(4, heightPct)}%` }}
                                />
                              ) : (
                                <div className="w-full border-b border-dashed border-border" style={{ height: "1px", marginTop: "auto" }} />
                              )}
                            </div>
                            <span className="text-[9px] text-muted-foreground font-medium">{MONTH_NAMES[m.month - 1]}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Monthly table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-t border-border">
                        <th className="px-5 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Month
                        </th>
                        <th className="px-5 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Expenses
                        </th>
                        <th className="px-5 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Transactions
                        </th>
                        <th className="px-5 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                          Share of Year
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {prop.monthlyTotals.map((m) => {
                        const pct = prop.totalExpenses > 0 ? (m.expenses / prop.totalExpenses) * 100 : 0;
                        const isCurrentMonth =
                          m.month === new Date().getMonth() + 1 && year === new Date().getFullYear();
                        const hasData = m.expenses > 0;
                        return (
                          <tr
                            key={m.month}
                            className={cn(
                              "hover:bg-muted/30 transition-colors",
                              isCurrentMonth && "bg-secondary/5"
                            )}
                          >
                            <td className="px-5 py-2.5">
                              <div className="flex items-center gap-2">
                                <span className={cn("text-sm", isCurrentMonth ? "text-secondary font-semibold" : "text-foreground")}>
                                  {MONTH_FULL[m.month - 1]}
                                </span>
                                {isCurrentMonth && (
                                  <span className="text-[10px] bg-secondary/20 text-secondary px-1.5 py-0.5 rounded font-medium">
                                    Current
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-2.5 text-right font-mono tabular-nums font-semibold text-foreground whitespace-nowrap">
                              {hasData ? formatCurrency(m.expenses) : <span className="text-muted-foreground font-normal">—</span>}
                            </td>
                            <td className="px-5 py-2.5 text-right text-muted-foreground">
                              {hasData ? m.count : "—"}
                            </td>
                            <td className="px-5 py-2.5 hidden sm:table-cell">
                              <div className="flex items-center gap-2 justify-end">
                                {hasData && (
                                  <>
                                    <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-secondary rounded-full"
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                    <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
                                      {pct.toFixed(1)}%
                                    </span>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border bg-muted/30">
                        <td className="px-5 py-3 font-semibold text-foreground">Total</td>
                        <td className="px-5 py-3 text-right font-mono font-bold text-foreground tabular-nums whitespace-nowrap">
                          {formatCurrency(prop.totalExpenses)}
                        </td>
                        <td className="px-5 py-3 text-right text-muted-foreground">
                          {prop.monthlyTotals.reduce((s, m) => s + m.count, 0)}
                        </td>
                        <td className="px-5 py-3 hidden sm:table-cell" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </AppShell>
  );
}
