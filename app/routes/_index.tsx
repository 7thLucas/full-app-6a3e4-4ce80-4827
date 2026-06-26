import { useEffect, useState } from "react";
import { redirect } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { getUserFromRequest } from "~/modules/authentication/authentication.server";
import { useAuth } from "~/modules/authentication/use-authentication";
import { AppShell, PageHeader } from "~/components/layout/app-shell";
import { useConfigurables } from "~/modules/configurables";
import { api, type SummaryData, type Property } from "~/lib/api";
import {
  Building2,
  ReceiptText,
  TrendingDown,
  Plus,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router";
import { cn } from "~/lib/utils";
import { Dialog, DialogHeader, DialogTitle, DialogBody } from "~/components/ui/dialog";
import { ExpenseForm } from "~/components/expense-form";
import type { Expense } from "~/lib/api";

export async function loader({ request }: LoaderFunctionArgs) {
  if (!getUserFromRequest(request)) {
    return redirect("/auth/login");
  }
  return null;
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent?: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-5 flex items-start gap-4">
      <div
        className={cn(
          "p-2.5 rounded-lg shrink-0",
          accent ? "bg-secondary/15" : "bg-primary/10"
        )}
      >
        <Icon className={cn("w-5 h-5", accent ? "text-secondary" : "text-primary")} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground font-mono tabular-nums mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { config, loading: configLoading } = useConfigurables();
  const currencySymbol = config?.currencySymbol ?? "$";

  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  const formatCurrency = (amount: number) =>
    `${currencySymbol}${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const currentMonthName = new Date().toLocaleString("default", { month: "long", year: "numeric" });

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    Promise.all([api.expenses.summary(), api.properties.list()])
      .then(([sum, props]) => {
        setSummary(sum);
        setProperties(props);
      })
      .catch(console.error)
      .finally(() => setLoadingData(false));
  }, [isAuthenticated, authLoading]);

  const handleExpenseSuccess = (expense: Expense) => {
    setShowExpenseModal(false);
    // Refresh summary
    api.expenses.summary().then(setSummary).catch(console.error);
  };

  if (authLoading || configLoading || loadingData) {
    return (
      <AppShell>
        <div className="flex items-center justify-center flex-1 min-h-64">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Dashboard"
        subtitle={`Overview for ${currentMonthName}`}
        action={
          <button
            onClick={() => setShowExpenseModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Log Expense
          </button>
        }
      />

      <div className="p-6 space-y-6 flex-1">
        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            label={`This Month's Expenses`}
            value={formatCurrency(summary?.thisMonth.total ?? 0)}
            sub={`${summary?.thisMonth.count ?? 0} transactions`}
            icon={TrendingDown}
          />
          <StatCard
            label="Year-to-Date Expenses"
            value={formatCurrency(summary?.yearToDate ?? 0)}
            sub={`${new Date().getFullYear()}`}
            icon={ReceiptText}
            accent
          />
          <StatCard
            label="Active Properties"
            value={String(properties.length)}
            sub={`${properties.reduce((s, p) => s + p.unitCount, 0)} total units`}
            icon={Building2}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent expenses */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Recent Expenses</h2>
              <Link
                to="/expenses"
                className="flex items-center gap-1 text-sm text-secondary hover:text-secondary/80 transition-colors font-medium"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {summary?.recentExpenses.length === 0 ? (
              <div className="px-5 py-8 text-center text-muted-foreground text-sm">
                No expenses yet. Log your first expense!
              </div>
            ) : (
              <div className="divide-y divide-border">
                {summary?.recentExpenses.map((expense) => (
                  <div key={expense._id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-muted/40 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate">{expense.category}</span>
                        {expense.unitNumber && (
                          <span className="shrink-0 text-xs bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">
                            {expense.unitNumber}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {expense.propertyName} &middot; {new Date(expense.date).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-mono font-semibold text-foreground tabular-nums">
                      {formatCurrency(expense.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top categories this month */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Top Categories This Month</h2>
            </div>
            {!summary?.categoryBreakdown.length ? (
              <div className="px-5 py-8 text-center text-muted-foreground text-sm">
                No expenses logged this month.
              </div>
            ) : (
              <div className="px-5 py-4 space-y-3">
                {summary.categoryBreakdown.map((cat, i) => {
                  const maxVal = summary.categoryBreakdown[0].total;
                  const pct = Math.round((cat.total / maxVal) * 100);
                  return (
                    <div key={cat._id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-foreground font-medium truncate">{cat._id}</span>
                        <span className="ml-2 shrink-0 font-mono tabular-nums text-foreground">
                          {formatCurrency(cat.total)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-secondary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Properties quick overview */}
        {properties.length > 0 && (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Properties</h2>
              <Link
                to="/properties"
                className="flex items-center gap-1 text-sm text-secondary hover:text-secondary/80 transition-colors font-medium"
              >
                Manage <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
              {properties.slice(0, 6).map((p) => (
                <Link
                  key={p._id}
                  to={`/properties/${p._id}`}
                  className="flex items-center gap-3 px-5 py-4 hover:bg-muted/40 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.unitCount} units</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Expense Modal */}
      <Dialog open={showExpenseModal} onClose={() => setShowExpenseModal(false)}>
        <DialogHeader onClose={() => setShowExpenseModal(false)}>
          <DialogTitle>Log New Expense</DialogTitle>
        </DialogHeader>
        <DialogBody className="max-h-[80vh] overflow-y-auto">
          <ExpenseForm
            properties={properties}
            onSuccess={handleExpenseSuccess}
            onCancel={() => setShowExpenseModal(false)}
          />
        </DialogBody>
      </Dialog>
    </AppShell>
  );
}
