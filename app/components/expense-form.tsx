import { useState, useEffect, useRef } from "react";
import { useConfigurables } from "~/modules/configurables";
import { api, type Property, type Unit, type Expense } from "~/lib/api";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select } from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";
import { Search, X, Loader2 } from "lucide-react";

interface ExpenseFormProps {
  properties: Property[];
  expense?: Expense | null;
  onSuccess: (expense: Expense) => void;
  onCancel: () => void;
  defaultPropertyId?: string;
}

export function ExpenseForm({ properties, expense, onSuccess, onCancel, defaultPropertyId }: ExpenseFormProps) {
  const { config } = useConfigurables();
  const categories = config?.expenseCategories ?? [
    "Maintenance & Repairs",
    "Utilities",
    "Insurance",
    "Property Tax",
    "Management Fees",
    "Landscaping",
    "Cleaning",
    "Supplies",
    "Legal & Professional",
    "Capital Improvements",
    "Other",
  ];
  const currencySymbol = config?.currencySymbol ?? "$";

  const today = new Date().toISOString().split("T")[0];

  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [category, setCategory] = useState(expense?.category ?? categories[0]);
  const [date, setDate] = useState(expense ? expense.date.split("T")[0] : today);
  const [notes, setNotes] = useState(expense?.notes ?? "");
  const [vendor, setVendor] = useState(expense?.vendor ?? "");
  const [propertyId, setPropertyId] = useState(expense?.propertyId ?? defaultPropertyId ?? "");
  const [unitNumber, setUnitNumber] = useState(expense?.unitNumber ?? "");
  const [unitId, setUnitId] = useState(expense?.unitId ?? "");

  // Unit search
  const [unitQuery, setUnitQuery] = useState(expense?.unitNumber ?? "");
  const [unitResults, setUnitResults] = useState<Unit[]>([]);
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [searchingUnits, setSearchingUnits] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const unitSearchRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Set first property as default if none selected and properties available
  useEffect(() => {
    if (!propertyId && properties.length > 0) {
      setPropertyId(properties[0]._id);
    }
  }, [properties, propertyId]);

  // Search units on query change
  useEffect(() => {
    if (!unitQuery.trim() || !propertyId) {
      setUnitResults([]);
      setShowUnitDropdown(false);
      return;
    }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setSearchingUnits(true);
      try {
        const units = await api.units.list({ propertyId, q: unitQuery });
        setUnitResults(units);
        setShowUnitDropdown(true);
      } catch {
        setUnitResults([]);
      } finally {
        setSearchingUnits(false);
      }
    }, 200);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [unitQuery, propertyId]);

  // Close unit dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (unitSearchRef.current && !unitSearchRef.current.contains(e.target as Node)) {
        setShowUnitDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelectUnit = (unit: Unit) => {
    setUnitId(unit._id);
    setUnitNumber(unit.unitNumber);
    setUnitQuery(unit.unitNumber);
    setShowUnitDropdown(false);
  };

  const handleClearUnit = () => {
    setUnitId("");
    setUnitNumber("");
    setUnitQuery("");
    setShowUnitDropdown(false);
  };

  const handlePropertyChange = (newPropertyId: string) => {
    setPropertyId(newPropertyId);
    // Clear unit selection when property changes
    setUnitId("");
    setUnitNumber("");
    setUnitQuery("");
    setShowUnitDropdown(false);
    setUnitResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }
    if (!propertyId) {
      setError("Please select a property");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        amount: parseFloat(amount),
        category,
        date,
        notes,
        vendor,
        propertyId,
        unitId: unitId || undefined,
        unitNumber: unitNumber || undefined,
      };

      let result: Expense;
      if (expense?._id) {
        result = await api.expenses.update(expense._id, payload);
      } else {
        result = await api.expenses.create(payload);
      }
      onSuccess(result);
    } catch (err: any) {
      setError(err.message ?? "Failed to save expense");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="px-3 py-2 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Amount + Date on same row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="amount">
            Amount ({currencySymbol}) <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
              {currencySymbol}
            </span>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-7 font-mono tabular-nums"
              required
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="date">
            Date <span className="text-destructive">*</span>
          </Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
      </div>

      {/* Property */}
      <div className="space-y-1.5">
        <Label htmlFor="property">
          Property <span className="text-destructive">*</span>
        </Label>
        <Select
          id="property"
          value={propertyId}
          onChange={(e) => handlePropertyChange(e.target.value)}
          required
        >
          <option value="">Select a property...</option>
          {properties.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </Select>
      </div>

      {/* Unit search */}
      <div className="space-y-1.5" ref={unitSearchRef}>
        <Label htmlFor="unit-search">Unit Number</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="unit-search"
            type="text"
            placeholder={propertyId ? "Type to search units..." : "Select a property first"}
            value={unitQuery}
            onChange={(e) => {
              setUnitQuery(e.target.value);
              if (!e.target.value.trim()) {
                setUnitId("");
                setUnitNumber("");
              }
            }}
            disabled={!propertyId}
            className="pl-9 pr-8"
          />
          {unitQuery && (
            <button
              type="button"
              onClick={handleClearUnit}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {searchingUnits && (
            <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
          )}

          {showUnitDropdown && unitResults.length > 0 && (
            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
              {unitResults.map((unit) => (
                <button
                  key={unit._id}
                  type="button"
                  onClick={() => handleSelectUnit(unit)}
                  className={cn(
                    "w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors",
                    unit._id === unitId && "bg-primary/10 text-primary font-medium"
                  )}
                >
                  <span className="font-mono font-medium">{unit.unitNumber}</span>
                  {unit.tenantName && (
                    <span className="ml-2 text-muted-foreground">— {unit.tenantName}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {showUnitDropdown && unitResults.length === 0 && !searchingUnits && unitQuery.trim() && (
            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg px-4 py-3 text-sm text-muted-foreground">
              No units found matching "{unitQuery}"
            </div>
          )}
        </div>
        {unitId && (
          <p className="text-xs text-secondary font-medium">
            Unit {unitNumber} selected
          </p>
        )}
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <Label htmlFor="category">
          Category <span className="text-destructive">*</span>
        </Label>
        <Select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </Select>
      </div>

      {/* Vendor */}
      <div className="space-y-1.5">
        <Label htmlFor="vendor">Vendor / Payee</Label>
        <Input
          id="vendor"
          type="text"
          placeholder="e.g. ABC Plumbing"
          value={vendor}
          onChange={(e) => setVendor(e.target.value)}
        />
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Additional details..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="resize-none"
          rows={2}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1" disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1" disabled={loading}>
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {expense ? "Update Expense" : "Add Expense"}
        </Button>
      </div>
    </form>
  );
}
