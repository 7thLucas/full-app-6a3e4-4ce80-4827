import { useEffect, useState, useCallback } from "react";
import { redirect } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { getUserFromRequest } from "~/modules/authentication/authentication.server";
import { useAuth } from "~/modules/authentication/use-authentication";
import { AppShell, PageHeader } from "~/components/layout/app-shell";
import { useConfigurables } from "~/modules/configurables";
import { api, type Expense, type Property } from "~/lib/api";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Select } from "~/components/ui/select";
import { Dialog, DialogHeader, DialogTitle, DialogBody } from "~/components/ui/dialog";
import { ExpenseForm } from "~/components/expense-form";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
} from "lucide-react";
import { cn } from "~/lib/utils";

export async function loader({ request }: LoaderFunctionArgs) {
  if (!getUserFromRequest(request)) {
    return redirect("/auth/login");
  }
  return null;
}

const MONTHS = [
  "All Months", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function ExpensesPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { config } = useConfigurables();
  const currencySymbol = config?.currencySymbol ?? "$";
  const pageSize = config?.defaultExpensesPerPage ?? 25;
  const categories = config?.expenseCategories ?? [];

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });

  // Filters
  const [filterProperty, setFilterProperty] = useState("");
  const [filterMonth, setFilterMonth] = useState(0);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterCategory, setFilterCategory] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const formatCurrency = (amount: number) =>
    `${currencySymbol}${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const loadExpenses = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params: Record<string, any> = {
          page,
          limit: pageSize,
        };
        if (filterProperty) params.propertyId = filterProperty;
        if (filterMonth > 0) params.month = filterMonth;
        if (filterYear) params.year = filterYear;
        if (filterCategory) params.category = filterCategory;

        const result = await api.expenses.list(params);
        setExpenses(result.data ?? []);
        setPagination(result.pagination ?? { page: 1, total: 0, pages: 1 });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [filterProperty, filterMonth, filterYear, filterCategory, pageSize]
  );

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    api.properties.list().then(setProperties).catch(console.error);
  }, [isAuthenticated, authLoading]);

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    loadExpenses(1);
  }, [isAuthenticated, authLoading, loadExpenses]);

  const handleExpenseSuccess = () => {
    setShowModal(false);
    setEditingExpense(null);
    loadExpenses(pagination.page);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setShowModal(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return;
    setDeletingId(deleteConfirmId);
    try {
      await api.expenses.delete(deleteConfirmId);
      setDeleteConfirmId(null);
      loadExpenses(pagination.page);
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const totalFiltered = pagination.total;

  return (
    <AppShell>
      <PageHeader
        title="Expenses"
        subtitle={`${totalFiltered} total expense${totalFiltered !== 1 ? "s" : ""}`}
        action={
          <button
            onClick={() => {
              setEditingExpense(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Log Expense
          </button>
        }
      />

      {/* Filters */}
      <div className="px-6 py-4 border-b border-border bg-card">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Filter className="w-4 h-4" />
            Filter:
          </div>
          <Select
            className="h-8 text-xs w-auto min-w-[140px]"
            value={filterProperty}
            onChange={(e) => setFilterProperty(e.target.value)}
          >
            <option value="">All Properties</option>
            {properties.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Select
            className="h-8 text-xs w-auto min-w-[120px]"
            value={filterMonth}
            onChange={(e) => setFilterMonth(Number(e.target.value))}
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i}>
                {m}
              </option>
            ))}
          </Select>
          <Select
            className="h-8 text-xs w-auto"
            value={filterYear}
            onChange={(e) => setFilterYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
          <Select
            className="h-8 text-xs w-auto min-w-[160px]"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          {(filterProperty || filterMonth > 0 || filterCategory) && (
            <button
              onClick={() => {
                setFilterProperty("");
                setFilterMonth(0);
                setFilterCategory("");
              }}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <ReceiptTextEmpty />
            <p className="text-muted-foreground text-sm mt-3">No expenses found.</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Log your first expense
            </button>
          </div>
        ) : (
          <div>
            {/* Desktop table */}
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Property / Unit
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Vendor
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {expenses.map((expense) => (
                    <tr key={expense._id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs whitespace-nowrap">
                        {new Date(expense.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground truncate max-w-[200px]">{expense.propertyName}</p>
                        {expense.unitNumber && (
                          <span className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">
                            Unit {expense.unitNumber}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-foreground">{expense.category}</td>
                      <td className="px-4 py-3 text-muted-foreground truncate max-w-[160px]">
                        {expense.vendor || "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-foreground tabular-nums whitespace-nowrap">
                        {formatCurrency(expense.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(expense)}
                            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {deleteConfirmId === expense._id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={handleDeleteConfirm}
                                disabled={deletingId === expense._id}
                                className="px-2 py-1 text-xs bg-destructive text-destructive-foreground rounded font-medium"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2 py-1 text-xs bg-muted rounded"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleDeleteClick(expense._id)}
                              className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-border">
              {expenses.map((expense) => (
                <div key={expense._id} className="px-4 py-4 bg-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">{expense.category}</span>
                        {expense.unitNumber && (
                          <span className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">
                            Unit {expense.unitNumber}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {expense.propertyName} &middot;{" "}
                        {new Date(expense.date).toLocaleDateString()} &middot;{" "}
                        {expense.vendor || "No vendor"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono font-semibold text-foreground tabular-nums">
                        {formatCurrency(expense.amount)}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 justify-end">
                        <button
                          onClick={() => handleEdit(expense)}
                          className="p-1 text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(expense._id)}
                          className="p-1 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                  {deleteConfirmId === expense._id && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-sm text-destructive flex-1">Delete this expense?</span>
                      <button
                        onClick={handleDeleteConfirm}
                        className="px-3 py-1 text-xs bg-destructive text-destructive-foreground rounded font-medium"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-3 py-1 text-xs bg-muted rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-card">
                <p className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.pages} &middot; {pagination.total} total
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadExpenses(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadExpenses(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expense Modal */}
      <Dialog
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingExpense(null);
        }}
      >
        <DialogHeader
          onClose={() => {
            setShowModal(false);
            setEditingExpense(null);
          }}
        >
          <DialogTitle>{editingExpense ? "Edit Expense" : "Log New Expense"}</DialogTitle>
        </DialogHeader>
        <DialogBody className="max-h-[80vh] overflow-y-auto">
          <ExpenseForm
            properties={properties}
            expense={editingExpense}
            onSuccess={handleExpenseSuccess}
            onCancel={() => {
              setShowModal(false);
              setEditingExpense(null);
            }}
          />
        </DialogBody>
      </Dialog>
    </AppShell>
  );
}

function ReceiptTextEmpty() {
  return (
    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
      <Search className="w-6 h-6 text-muted-foreground" />
    </div>
  );
}
